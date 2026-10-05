/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 2 of 10 —
 * Trade Credit Line (4), Purchase Order Financing (4) and Term Loan (2)
 * tools, filed under Loan Calculators > General Loan Calculators. See
 * calc-engine-loan-startup-business.ts for the full batch context (the other
 * 12 Term Loan keywords were already built as business-loan-* or merged).
 *
 * Trade credit = supplier terms such as "2/10 net 30":
 *  - tradeCreditLine: average credit a supplier extends, the discount on
 *    offer, and the annual cost of skipping it: d/(1-d) x 365/(net - disc).
 *  - tradeCreditLinePayment: what an invoice costs paid early, on time, or
 *    late with a monthly late charge.
 *  - tradeCreditLineCost: borrowing on a bank line to take the discount —
 *    discount earned minus interest for the days paid early.
 *  - tradeCreditLinePayoff: clearing an overdue supplier balance on an
 *    agreed plan with a monthly finance charge.
 * Purchase order financing pays your supplier so you can fill a big order;
 * the financier is repaid when your customer pays:
 *  - purchaseOrderFinancing: the deal's profit after the financing fee.
 *  - purchaseOrderFinancingPayment: tiered fee (first 30 days, then per 10
 *    days) -> what you repay and its annualized rate.
 *  - purchaseOrderFinancingCost: fee as a share of profit, APR, and the
 *    days until the fee eats the whole profit.
 *  - purchaseOrderFinancingPayoff: savings when your customer pays sooner.
 * Term loan:
 *  - termLoanEligibility (incl. prequalification): DSCR with the new loan,
 *    time in business, score, annual revenue.
 *  - termLoanTotalCost: interest + fees, and a prepayment penalty if you
 *    pay it off early.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-trade-po-term-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

/** Months and interest to repay `balance` paying `pmt` a month (capped at 600 months). */
function repay(balance: number, i: number, pmt: number): { months: number; interest: number } {
  let b = balance;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    const int = b * i;
    if (pmt <= int) return { months: 600, interest: interest + int * (600 - months) };
    interest += int;
    b = b + int - Math.min(pmt, b + int);
    months++;
  }
  return { months, interest };
}

/** PO financing fee: `initial`% for the first 30 days, then `per10`% per 10 days (or part). */
function tieredFee(amount: number, initialPercent: number, per10Percent: number, days: number): number {
  const extraBlocks = Math.max(0, Math.ceil((days - 30) / 10));
  return (amount * (initialPercent + per10Percent * extraBlocks)) / 100;
}

// --- 1. Trade Credit Line Calculator ---------------------------------------------------
export const tradeCreditLineCalculator: CustomCalculator = (values) => {
  const monthlyPurchases = Math.max(0, safeNumber(values.monthlyPurchases, 50000));
  const netDays = Math.max(1, safeNumber(values.netDays, 30));
  const discountPercent = Math.min(50, Math.max(0, safeNumber(values.discountPercent, 2)));
  const discountDays = Math.min(netDays - 1, Math.max(0, safeNumber(values.discountDays, 10)));

  const d = discountPercent / 100;
  const cost = d > 0 ? (d / (1 - d)) * (365 / (netDays - discountDays)) * 100 : 0;

  return {
    averageCreditUsed: round2((monthlyPurchases * netDays) / 30),
    discountPerMonth: round2(monthlyPurchases * d),
    discountsPerYear: round2(monthlyPurchases * d * 12),
    annualCostOfSkippingDiscount: round2(cost),
  };
};

// --- 2. Trade Credit Line Payment Calculator (early / on time / late) ----------------
export const tradeCreditLinePaymentCalculator: CustomCalculator = (values) => {
  const invoice = Math.max(0, safeNumber(values.invoice, 20000));
  const discountPercent = Math.min(50, Math.max(0, safeNumber(values.discountPercent, 2)));
  const lateFeeMonthlyPercent = Math.max(0, safeNumber(values.lateFeeMonthlyPercent, 1.5));
  const netDays = Math.max(1, safeNumber(values.netDays, 30));
  const daysPaid = Math.max(0, safeNumber(values.daysPaid, 45));

  const lateDays = Math.max(0, daysPaid - netDays);
  const late = (invoice * lateFeeMonthlyPercent * Math.ceil(lateDays / 30)) / 100;

  return {
    amountIfPaidEarly: round2(invoice * (1 - discountPercent / 100)),
    amountOnDueDate: round2(invoice),
    lateCharges: round2(late),
    amountOnYourDate: round2(invoice + late),
  };
};

// --- 3. Trade Credit Line Cost Calculator (borrow to take the discount) ---------------
export const tradeCreditLineCostCalculator: CustomCalculator = (values) => {
  const monthlyPurchases = Math.max(0, safeNumber(values.monthlyPurchases, 50000));
  const discountPercent = Math.min(50, Math.max(0, safeNumber(values.discountPercent, 2)));
  const discountDays = Math.max(0, safeNumber(values.discountDays, 10));
  const netDays = Math.max(discountDays, safeNumber(values.netDays, 30));
  const locRatePercent = Math.max(0, safeNumber(values.locRatePercent, 10));

  const discount = (monthlyPurchases * discountPercent) / 100;
  const borrowed = monthlyPurchases - discount;
  const interest = (borrowed * locRatePercent * (netDays - discountDays)) / 365 / 100;

  return {
    discountEarnedPerMonth: round2(discount),
    lineOfCreditInterestPerMonth: round2(interest),
    netSavingsPerMonth: round2(discount - interest),
    netSavingsPerYear: round2((discount - interest) * 12),
  };
};

// --- 4. Trade Credit Line Payoff Calculator (overdue balance plan) -------------------
export const tradeCreditLinePayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 30000));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 4000));
  const financeChargePercent = Math.max(0, safeNumber(values.financeChargePercent, 1.5));

  const plan = repay(balance, financeChargePercent / 100, monthlyPayment);
  const minPayment = (balance * financeChargePercent) / 100;

  return {
    monthsToClear: plan.months,
    totalFinanceCharges: round2(plan.interest),
    totalPaid: round2(balance + plan.interest),
    minimumToStopGrowth: round2(minPayment),
  };
};

// --- 5. Purchase Order Financing Calculator (deal profit) -----------------------------
export const purchaseOrderFinancingCalculator: CustomCalculator = (values) => {
  const orderValue = Math.max(0, safeNumber(values.orderValue, 100000));
  const supplierCost = Math.max(0, safeNumber(values.supplierCost, 60000));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 100)));
  const feePer30DaysPercent = Math.max(0, safeNumber(values.feePer30DaysPercent, 3));
  const daysToCustomerPayment = Math.max(0, safeNumber(values.daysToCustomerPayment, 60));

  const financed = (supplierCost * advancePercent) / 100;
  const fee = (financed * feePer30DaysPercent * Math.ceil(daysToCustomerPayment / 30)) / 100;
  const gross = orderValue - supplierCost;

  return {
    amountFinanced: round2(financed),
    yourCashNeeded: round2(supplierCost - financed),
    financingFee: round2(fee),
    grossProfit: round2(gross),
    profitAfterFinancing: round2(gross - fee),
    marginAfterFinancing: round2(orderValue > 0 ? ((gross - fee) / orderValue) * 100 : 0),
  };
};

// --- 6. Purchase Order Financing Payment Calculator (tiered fee) ----------------------
export const purchaseOrderFinancingPaymentCalculator: CustomCalculator = (values) => {
  const amountFinanced = Math.max(0, safeNumber(values.amountFinanced, 60000));
  const initialFeePercent = Math.max(0, safeNumber(values.initialFeePercent, 3));
  const feePer10DaysPercent = Math.max(0, safeNumber(values.feePer10DaysPercent, 1));
  const days = Math.max(1, safeNumber(values.days, 55));

  const fee = tieredFee(amountFinanced, initialFeePercent, feePer10DaysPercent, days);

  return {
    totalFee: round2(fee),
    repaymentDue: round2(amountFinanced + fee),
    feePercentOfAmount: round2(amountFinanced > 0 ? (fee / amountFinanced) * 100 : 0),
    annualizedRate: round2(amountFinanced > 0 ? (fee / amountFinanced) * (365 / days) * 100 : 0),
  };
};

// --- 7. Purchase Order Financing Cost Calculator (vs profit, APR) ---------------------
export const purchaseOrderFinancingCostCalculator: CustomCalculator = (values) => {
  const orderValue = Math.max(0, safeNumber(values.orderValue, 100000));
  const supplierCost = Math.max(0, safeNumber(values.supplierCost, 60000));
  const feePer30DaysPercent = Math.max(0, safeNumber(values.feePer30DaysPercent, 3.5));
  const days = Math.max(1, safeNumber(values.days, 75));

  const months = Math.ceil(days / 30);
  const fee = (supplierCost * feePer30DaysPercent * months) / 100;
  const gross = orderValue - supplierCost;
  const per30 = (supplierCost * feePer30DaysPercent) / 100;

  return {
    financingFee: round2(fee),
    feeShareOfProfit: round2(gross > 0 ? (fee / gross) * 100 : 0),
    effectiveApr: round2(supplierCost > 0 ? (fee / supplierCost) * (365 / days) * 100 : 0),
    daysUntilProfitIsGone: per30 > 0 ? Math.max(0, Math.floor(gross / per30) * 30) : 0,
  };
};

// --- 8. Purchase Order Financing Payoff Calculator (customer pays sooner) -------------
export const purchaseOrderFinancingPayoffCalculator: CustomCalculator = (values) => {
  const amountFinanced = Math.max(0, safeNumber(values.amountFinanced, 60000));
  const initialFeePercent = Math.max(0, safeNumber(values.initialFeePercent, 3));
  const feePer10DaysPercent = Math.max(0, safeNumber(values.feePer10DaysPercent, 1));
  const plannedDays = Math.max(1, safeNumber(values.plannedDays, 75));
  const actualDays = Math.max(1, safeNumber(values.actualDays, 45));

  const planned = tieredFee(amountFinanced, initialFeePercent, feePer10DaysPercent, plannedDays);
  const actual = tieredFee(amountFinanced, initialFeePercent, feePer10DaysPercent, actualDays);

  return {
    feeAtPlannedDate: round2(planned),
    feeAtActualDate: round2(actual),
    feeSaved: round2(planned - actual),
    payoffAmount: round2(amountFinanced + actual),
  };
};

// --- 9. Term Loan Eligibility Calculator (incl. prequalification) ---------------------
export const termLoanEligibilityCalculator: CustomCalculator = (values) => {
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 400000));
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 120000));
  const existingAnnualDebt = Math.max(0, safeNumber(values.existingAnnualDebt, 30000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 200000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const yearsInBusiness = Math.max(0, safeNumber(values.yearsInBusiness, 3));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 680)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const newAnnual = payment(loanAmount, i, n) * 12;
  const total = existingAnnualDebt + newAnnual;
  const dscr = total > 0 ? annualCashFlow / total : 0;
  let passed = 0;
  if (dscr >= 1.25) passed++;
  if (yearsInBusiness >= 2) passed++;
  if (creditScore >= 660) passed++;
  if (annualRevenue >= 100000) passed++;

  return {
    newAnnualPayments: round2(newAnnual),
    dscr: round2(dscr),
    maxLoanAtDscr125: round2(presentValue(Math.max(0, annualCashFlow / 1.25 - existingAnnualDebt) / 12, i, n)),
    checksPassed: passed,
  };
};

// --- 10. Term Loan Total Cost Calculator (fees + prepayment penalty) ------------------
export const termLoanTotalCostCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 250000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 5)));
  const originationPercent = Math.max(0, safeNumber(values.originationPercent, 2));
  const closingCosts = Math.max(0, safeNumber(values.closingCosts, 2500));
  const prepaymentPenaltyPercent = Math.max(0, safeNumber(values.prepaymentPenaltyPercent, 2));
  const payoffYear = Math.min(termYears, Math.max(0, Math.round(safeNumber(values.payoffYear, 0))));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const k = payoffYear > 0 && payoffYear < termYears ? payoffYear * 12 : n;
  const bal = balanceAfter(loanAmount, i, pmt, k);
  const interest = pmt * k - (loanAmount - bal);
  const penalty = k < n ? (bal * prepaymentPenaltyPercent) / 100 : 0;
  const fees = (loanAmount * originationPercent) / 100 + closingCosts;
  const total = interest + fees + penalty;

  return {
    totalInterest: round2(interest),
    upfrontFees: round2(fees),
    prepaymentPenalty: round2(penalty),
    totalCostOfBorrowing: round2(total),
    costPerDollarBorrowed: loanAmount > 0 ? Math.round((total / loanAmount) * 1000) / 1000 : 0,
  };
};

export const loanTradePoTermCustomCalculators: Record<string, CustomCalculator> = {
  "trade-credit-line-calculator": tradeCreditLineCalculator,
  "trade-credit-line-payment-calculator": tradeCreditLinePaymentCalculator,
  "trade-credit-line-cost-calculator": tradeCreditLineCostCalculator,
  "trade-credit-line-payoff-calculator": tradeCreditLinePayoffCalculator,
  "purchase-order-financing-calculator": purchaseOrderFinancingCalculator,
  "purchase-order-financing-payment-calculator": purchaseOrderFinancingPaymentCalculator,
  "purchase-order-financing-cost-calculator": purchaseOrderFinancingCostCalculator,
  "purchase-order-financing-payoff-calculator": purchaseOrderFinancingPayoffCalculator,
  "term-loan-eligibility-calculator": termLoanEligibilityCalculator,
  "term-loan-total-cost-calculator": termLoanTotalCostCalculator,
};
