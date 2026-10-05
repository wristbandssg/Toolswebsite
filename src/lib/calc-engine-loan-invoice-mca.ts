/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 7 of 11 —
 * Invoice Financing (7 tools) and Merchant Cash Advance (3 tools), filed
 * under Loan Calculators > General Loan Calculators. See
 * calc-engine-loan-sba.ts for the full batch context. "Merchant Cash
 * Advance Payment Calculator" was merged into the main MCA calculator (an
 * MCA's "payment" IS its daily holdback, which that tool shows).
 *
 * Invoice financing advances most of an unpaid invoice now (the "advance
 * rate", often 70%-90%) for a fee that grows with the time the customer
 * takes to pay (e.g. 1%-5% per 30 days):
 *  - invoiceFinancing: one invoice -> advance, fee, rebate when paid.
 *  - invoiceFinancingPayment: the monthly cost of financing a steady flow
 *    of invoices.
 *  - invoiceFinancingPayoff: fee charged per 10-day block — what you save
 *    when the customer pays early, and the payoff amount.
 *  - invoiceFinancingInterest: the fee converted into an effective APR on
 *    the cash actually received.
 *  - invoiceFinancingAffordability: the fee vs the invoice's gross profit.
 *  - invoiceFinancingComparison: factoring fee vs a line of credit.
 *  - invoiceFinancingEligibility: eligible receivables after past-due and
 *    customer-concentration exclusions -> available funding.
 *
 * A merchant cash advance buys future card sales: you get cash now and
 * repay a fixed amount (advance x factor rate) through a daily holdback:
 *  - merchantCashAdvance (incl. payment): payback, daily remittance, time.
 *  - merchantCashAdvanceCost: the factor rate and fees as an APR.
 *  - merchantCashAdvancePayoff: early payoff with a discount on the
 *    remaining fee.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-invoice-mca-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

/** Periodic rate at which `pmt` for `n` periods repays `pv` (bisection). */
function solveRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Invoice Financing Calculator ---------------------------------------------------
export const invoiceFinancingCalculator: CustomCalculator = (values) => {
  const invoiceAmount = Math.max(0, safeNumber(values.invoiceAmount, 50000));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 85)));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 3));
  const daysToPay = Math.max(0, safeNumber(values.daysToPay, 45));

  const advance = (invoiceAmount * advancePercent) / 100;
  const fee = (invoiceAmount * feePercent * daysToPay) / 30 / 100;

  return {
    advanceAmount: round2(advance),
    financingFee: round2(fee),
    rebateWhenPaid: round2(invoiceAmount - advance - fee),
    totalReceived: round2(invoiceAmount - fee),
  };
};

// --- 2. Invoice Financing Payment Calculator (monthly cost of a program) ---------------
export const invoiceFinancingPaymentCalculator: CustomCalculator = (values) => {
  const monthlyInvoices = Math.max(0, safeNumber(values.monthlyInvoices, 120000));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 85)));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 2.5));
  const avgDaysToPay = Math.max(0, safeNumber(values.avgDaysToPay, 40));

  const fees = (monthlyInvoices * feePercent * avgDaysToPay) / 30 / 100;

  return {
    cashAdvancedPerMonth: round2((monthlyInvoices * advancePercent) / 100),
    monthlyFees: round2(fees),
    annualFees: round2(fees * 12),
    feeShareOfRevenue: round2(monthlyInvoices > 0 ? (fees / monthlyInvoices) * 100 : 0),
  };
};

// --- 3. Invoice Financing Payoff Calculator (10-day fee blocks) -------------------------
export const invoiceFinancingPayoffCalculator: CustomCalculator = (values) => {
  const invoiceAmount = Math.max(0, safeNumber(values.invoiceAmount, 40000));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 80)));
  const feePer10DaysPercent = Math.max(0, safeNumber(values.feePer10DaysPercent, 0.8));
  const expectedDays = Math.max(0, safeNumber(values.expectedDays, 60));
  const actualDays = Math.max(0, safeNumber(values.actualDays, 35));

  const fee = (days: number) => (invoiceAmount * feePer10DaysPercent * Math.ceil(days / 10)) / 100;
  const advance = (invoiceAmount * advancePercent) / 100;

  return {
    advanceAmount: round2(advance),
    feeIfPaidAsExpected: round2(fee(expectedDays)),
    feeIfPaidOnActualDay: round2(fee(actualDays)),
    feeSaved: round2(fee(expectedDays) - fee(actualDays)),
    payoffAmount: round2(advance + fee(actualDays)),
  };
};

// --- 4. Invoice Financing Interest Calculator (fee -> APR) -----------------------------
export const invoiceFinancingInterestCalculator: CustomCalculator = (values) => {
  const feePercent = Math.max(0, safeNumber(values.feePercent, 3));
  const feePeriodDays = Math.max(1, safeNumber(values.feePeriodDays, 30));
  const avgDaysOutstanding = Math.max(1, safeNumber(values.avgDaysOutstanding, 45));
  const advancePercent = Math.min(100, Math.max(1, safeNumber(values.advancePercent, 85)));

  const feeOnInvoice = (feePercent * avgDaysOutstanding) / feePeriodDays;
  const apr = (feeOnInvoice / advancePercent) * (365 / avgDaysOutstanding) * 100;

  return {
    totalFeePercentOfInvoice: round2(feeOnInvoice),
    costPer1000Invoiced: round2(feeOnInvoice * 10),
    feeAsAnnualRateOnInvoice: round2(feeOnInvoice * (365 / avgDaysOutstanding)),
    effectiveApr: round2(apr),
  };
};

// --- 5. Invoice Financing Affordability Calculator (fee vs margin) ---------------------
export const invoiceFinancingAffordabilityCalculator: CustomCalculator = (values) => {
  const invoiceAmount = Math.max(0, safeNumber(values.invoiceAmount, 25000));
  const grossMarginPercent = Math.max(0, safeNumber(values.grossMarginPercent, 30));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 2.5));
  const daysOutstanding = Math.max(0, safeNumber(values.daysOutstanding, 45));

  const gp = (invoiceAmount * grossMarginPercent) / 100;
  const fee = (invoiceAmount * feePercent * daysOutstanding) / 30 / 100;
  const perDay = (invoiceAmount * feePercent) / 30 / 100;

  return {
    grossProfit: round2(gp),
    financingFee: round2(fee),
    profitAfterFinancing: round2(gp - fee),
    feeShareOfProfit: round2(gp > 0 ? (fee / gp) * 100 : 0),
    daysUntilProfitIsGone: perDay > 0 ? Math.floor(gp / perDay) : 0,
  };
};

// --- 6. Invoice Financing Comparison Calculator (vs line of credit) ---------------------
export const invoiceFinancingComparisonCalculator: CustomCalculator = (values) => {
  const invoiceAmount = Math.max(0, safeNumber(values.invoiceAmount, 50000));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 85)));
  const feePercent = Math.max(0, safeNumber(values.feePercent, 3));
  const daysOutstanding = Math.max(0, safeNumber(values.daysOutstanding, 45));
  const locRatePercent = Math.max(0, safeNumber(values.locRatePercent, 11));

  const advance = (invoiceAmount * advancePercent) / 100;
  const invoiceCost = (invoiceAmount * feePercent * daysOutstanding) / 30 / 100;
  const locCost = (advance * locRatePercent * daysOutstanding) / 365 / 100;

  return {
    cashReceived: round2(advance),
    invoiceFinancingCost: round2(invoiceCost),
    lineOfCreditCost: round2(locCost),
    savingsWithLineOfCredit: round2(invoiceCost - locCost),
  };
};

// --- 7. Invoice Financing Eligibility Calculator (borrowing base) -----------------------
export const invoiceFinancingEligibilityCalculator: CustomCalculator = (values) => {
  const totalReceivables = Math.max(0, safeNumber(values.totalReceivables, 400000));
  const over90Percent = Math.min(100, Math.max(0, safeNumber(values.over90Percent, 10)));
  const largestCustomerPercent = Math.min(100, Math.max(0, safeNumber(values.largestCustomerPercent, 35)));
  const concentrationLimitPercent = Math.min(100, Math.max(0, safeNumber(values.concentrationLimitPercent, 25)));
  const advancePercent = Math.min(100, Math.max(0, safeNumber(values.advancePercent, 80)));

  const pastDue = (totalReceivables * over90Percent) / 100;
  const concentration = (totalReceivables * Math.max(0, largestCustomerPercent - concentrationLimitPercent)) / 100;
  const eligible = Math.max(0, totalReceivables - pastDue - concentration);

  return {
    ineligiblePastDue: round2(pastDue),
    ineligibleConcentration: round2(concentration),
    eligibleReceivables: round2(eligible),
    availableFunding: round2((eligible * advancePercent) / 100),
  };
};

// --- 8. Merchant Cash Advance Calculator (incl. daily payment) --------------------------
export const merchantCashAdvanceCalculator: CustomCalculator = (values) => {
  const advanceAmount = Math.max(0, safeNumber(values.advanceAmount, 50000));
  const factorRate = Math.min(3, Math.max(1, safeNumber(values.factorRate, 1.35)));
  const holdbackPercent = Math.min(100, Math.max(0, safeNumber(values.holdbackPercent, 12)));
  const monthlyCardSales = Math.max(0, safeNumber(values.monthlyCardSales, 60000));

  const payback = advanceAmount * factorRate;
  const daily = (monthlyCardSales / 30) * (holdbackPercent / 100);
  const days = daily > 0 ? payback / daily : 0;

  return {
    totalPayback: round2(payback),
    costOfAdvance: round2(payback - advanceAmount),
    dailyPayment: round2(daily),
    daysToRepay: Math.ceil(days),
    monthsToRepay: round2(days / 30),
  };
};

// --- 9. Merchant Cash Advance Cost Calculator (APR) ------------------------------------
export const merchantCashAdvanceCostCalculator: CustomCalculator = (values) => {
  const advanceAmount = Math.max(0, safeNumber(values.advanceAmount, 40000));
  const factorRate = Math.min(3, Math.max(1, safeNumber(values.factorRate, 1.3)));
  const termMonths = Math.max(1, safeNumber(values.termMonths, 9));
  const upfrontFees = Math.max(0, safeNumber(values.upfrontFees, 1000));

  const payback = advanceAmount * factorRate;
  const n = Math.max(1, Math.round(termMonths * 21));
  const daily = payback / n;
  const r = solveRate(Math.max(0, advanceAmount - upfrontFees), daily, n);

  return {
    totalPayback: round2(payback),
    totalCost: round2(payback - advanceAmount + upfrontFees),
    dailyPayment: round2(daily),
    apr: round2(r * 252 * 100),
  };
};

// --- 10. Merchant Cash Advance Payoff Calculator (early payoff discount) ---------------
export const merchantCashAdvancePayoffCalculator: CustomCalculator = (values) => {
  const advanceAmount = Math.max(0, safeNumber(values.advanceAmount, 50000));
  const factorRate = Math.min(3, Math.max(1, safeNumber(values.factorRate, 1.4)));
  const amountPaid = Math.max(0, safeNumber(values.amountPaid, 30000));
  const discountPercent = Math.min(100, Math.max(0, safeNumber(values.discountPercent, 50)));

  const payback = advanceAmount * factorRate;
  const remaining = Math.max(0, payback - amountPaid);
  const feeShare = payback > 0 ? (payback - advanceAmount) / payback : 0;
  const remainingFee = remaining * feeShare;
  const discount = (remainingFee * discountPercent) / 100;

  return {
    totalPayback: round2(payback),
    remainingBalance: round2(remaining),
    remainingFeePortion: round2(remainingFee),
    earlyPayoffDiscount: round2(discount),
    payoffAmount: round2(remaining - discount),
    totalCostIfPaidNow: round2(payback - discount - advanceAmount),
  };
};

export const loanInvoiceMcaCustomCalculators: Record<string, CustomCalculator> = {
  "invoice-financing-calculator": invoiceFinancingCalculator,
  "invoice-financing-payment-calculator": invoiceFinancingPaymentCalculator,
  "invoice-financing-payoff-calculator": invoiceFinancingPayoffCalculator,
  "invoice-financing-interest-calculator": invoiceFinancingInterestCalculator,
  "invoice-financing-affordability-calculator": invoiceFinancingAffordabilityCalculator,
  "invoice-financing-comparison-calculator": invoiceFinancingComparisonCalculator,
  "invoice-financing-eligibility-calculator": invoiceFinancingEligibilityCalculator,
  "merchant-cash-advance-calculator": merchantCashAdvanceCalculator,
  "merchant-cash-advance-cost-calculator": merchantCashAdvanceCostCalculator,
  "merchant-cash-advance-payoff-calculator": merchantCashAdvancePayoffCalculator,
};
