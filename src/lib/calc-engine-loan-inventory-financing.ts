/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 6 of 11 —
 * Inventory Financing Loans (7 tools), filed under Loan Calculators >
 * General Loan Calculators. See calc-engine-loan-sba.ts for the full batch
 * context.
 *
 * Inventory financing lends against stock: the lender advances a share of
 * the inventory's value (the "advance rate", often 50%-80% of cost) and is
 * repaid as the stock sells. The tools:
 *  - inventoryFinancingLoan: borrowing base, interest while the advance is
 *    outstanding, origination fee, total cost.
 *  - inventoryFinancingLoanPayment: an amortizing inventory term loan's
 *    payment per unit sold and as a share of gross profit.
 *  - inventoryFinancingLoanPayoff: repaying as stock sells (a sell-through
 *    rate per month) — months to clear, and interest at twice the speed.
 *  - inventoryFinancingLoanInterest: floor-plan style cost per unit by days
 *    in stock, and its share of the unit's margin.
 *  - inventoryFinancingLoanAffordability: the financing cost budget from
 *    gross profit -> maximum loan and inventory it supports.
 *  - inventoryFinancingLoanComparison: inventory loan vs business line of
 *    credit for the same amount and period.
 *  - inventoryFinancingLoanEligibility: eligible inventory (excluding slow
 *    or obsolete stock), borrowing base and inventory turnover.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-inventory-financing-calculators.ts for the copy.
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

/** Interest when `principal` is repaid in equal monthly slices of `slice`% of the original. */
function sellDownInterest(principal: number, i: number, slicePercent: number): { months: number; interest: number } {
  const slice = (principal * Math.max(0.01, slicePercent)) / 100;
  let b = principal;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < 600) {
    interest += b * i;
    b = Math.max(0, b - slice);
    months++;
  }
  return { months, interest };
}

// --- 1. Inventory Financing Loan Calculator --------------------------------------------
export const inventoryFinancingLoanCalculator: CustomCalculator = (values) => {
  const inventoryValue = Math.max(0, safeNumber(values.inventoryValue, 200000));
  const advanceRatePercent = Math.min(100, Math.max(0, safeNumber(values.advanceRatePercent, 60)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const monthsOutstanding = Math.max(0, safeNumber(values.monthsOutstanding, 4));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 1.5));

  const base = (inventoryValue * advanceRatePercent) / 100;
  const monthly = (base * annualRatePercent) / 100 / 12;
  const interest = monthly * monthsOutstanding;
  const fee = (base * originationFeePercent) / 100;

  return {
    loanAmount: round2(base),
    monthlyInterest: round2(monthly),
    totalInterest: round2(interest),
    originationFee: round2(fee),
    totalCost: round2(interest + fee),
  };
};

// --- 2. Inventory Financing Loan Payment Calculator (per unit) ------------------------
export const inventoryFinancingLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const unitsPerMonth = Math.max(0, safeNumber(values.unitsPerMonth, 400));
  const grossProfitPerUnit = Math.max(0, safeNumber(values.grossProfitPerUnit, 45));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const gp = unitsPerMonth * grossProfitPerUnit;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loanAmount),
    paymentPerUnitSold: round2(unitsPerMonth > 0 ? pmt / unitsPerMonth : 0),
    paymentShareOfGrossProfit: round2(gp > 0 ? (pmt / gp) * 100 : 0),
  };
};

// --- 3. Inventory Financing Loan Payoff Calculator (repay as it sells) ----------------
export const inventoryFinancingLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const sellThroughPercent = Math.min(100, Math.max(1, safeNumber(values.sellThroughPercent, 15)));

  const i = annualRatePercent / 100 / 12;
  const now = sellDownInterest(loanAmount, i, sellThroughPercent);
  const fast = sellDownInterest(loanAmount, i, Math.min(100, sellThroughPercent * 2));

  return {
    principalRepaidPerMonth: round2((loanAmount * sellThroughPercent) / 100),
    monthsToPayoff: now.months,
    totalInterest: round2(now.interest),
    interestIfSellingTwiceAsFast: round2(fast.interest),
    savingsFromFasterSales: round2(now.interest - fast.interest),
  };
};

// --- 4. Inventory Financing Loan Interest Calculator (per unit, floor plan) -----------
export const inventoryFinancingLoanInterestCalculator: CustomCalculator = (values) => {
  const unitCost = Math.max(0, safeNumber(values.unitCost, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const daysInStock = Math.max(0, safeNumber(values.daysInStock, 75));
  const flatFeePerUnit = Math.max(0, safeNumber(values.flatFeePerUnit, 75));
  const grossMarginPerUnit = Math.max(0, safeNumber(values.grossMarginPerUnit, 2500));

  const perDay = (unitCost * annualRatePercent) / 100 / 365;
  const interest = perDay * daysInStock;
  const cost = interest + flatFeePerUnit;

  return {
    interestPerDay: round2(perDay),
    interestPerUnit: round2(interest),
    totalCostPerUnit: round2(cost),
    shareOfUnitMargin: round2(grossMarginPerUnit > 0 ? (cost / grossMarginPerUnit) * 100 : 0),
    breakEvenDays: perDay > 0 ? Math.max(0, Math.floor((grossMarginPerUnit - flatFeePerUnit) / perDay)) : 0,
  };
};

// --- 5. Inventory Financing Loan Affordability Calculator ------------------------------
export const inventoryFinancingLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyGrossProfit = Math.max(0, safeNumber(values.monthlyGrossProfit, 40000));
  const maxSharePercent = Math.min(100, Math.max(0, safeNumber(values.maxSharePercent, 10)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const advanceRatePercent = Math.min(100, Math.max(1, safeNumber(values.advanceRatePercent, 60)));

  const budget = (monthlyGrossProfit * maxSharePercent) / 100;
  const maxLoan = annualRatePercent > 0 ? budget / (annualRatePercent / 100 / 12) : 0;

  return {
    monthlyFinancingBudget: round2(budget),
    maxLoanAmount: round2(maxLoan),
    inventoryNeededAsCollateral: round2(maxLoan / (advanceRatePercent / 100)),
  };
};

// --- 6. Inventory Financing Loan Comparison Calculator (vs line of credit) -------------
export const inventoryFinancingLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 100000));
  const months = Math.max(0, safeNumber(values.months, 6));
  const invRatePercent = Math.max(0, safeNumber(values.invRatePercent, 12));
  const invFeePercent = Math.max(0, safeNumber(values.invFeePercent, 1.5));
  const locRatePercent = Math.max(0, safeNumber(values.locRatePercent, 10));
  const locDrawFeePercent = Math.max(0, safeNumber(values.locDrawFeePercent, 1));
  const locAnnualFee = Math.max(0, safeNumber(values.locAnnualFee, 500));

  const invCost = (amount * invRatePercent * months) / 1200 + (amount * invFeePercent) / 100;
  const locCost = (amount * locRatePercent * months) / 1200 + (amount * locDrawFeePercent) / 100 + (locAnnualFee * months) / 12;
  const annualize = (cost: number) => (amount > 0 && months > 0 ? (cost / amount) * (12 / months) * 100 : 0);

  return {
    inventoryLoanCost: round2(invCost),
    lineOfCreditCost: round2(locCost),
    inventoryLoanEffectiveRate: round2(annualize(invCost)),
    lineOfCreditEffectiveRate: round2(annualize(locCost)),
    savingsWithLineOfCredit: round2(invCost - locCost),
  };
};

// --- 7. Inventory Financing Loan Eligibility Calculator --------------------------------
export const inventoryFinancingLoanEligibilityCalculator: CustomCalculator = (values) => {
  const inventoryValue = Math.max(0, safeNumber(values.inventoryValue, 300000));
  const ineligiblePercent = Math.min(100, Math.max(0, safeNumber(values.ineligiblePercent, 15)));
  const advanceRatePercent = Math.min(100, Math.max(0, safeNumber(values.advanceRatePercent, 50)));
  const requestedAmount = Math.max(0, safeNumber(values.requestedAmount, 150000));
  const annualCogs = Math.max(0, safeNumber(values.annualCogs, 1200000));

  const eligible = (inventoryValue * (100 - ineligiblePercent)) / 100;
  const base = (eligible * advanceRatePercent) / 100;

  return {
    eligibleInventory: round2(eligible),
    borrowingBase: round2(base),
    approvableAmount: round2(Math.min(requestedAmount, base)),
    shortfall: round2(Math.max(0, requestedAmount - base)),
    inventoryTurnover: round2(inventoryValue > 0 ? annualCogs / inventoryValue : 0),
  };
};

export const loanInventoryFinancingCustomCalculators: Record<string, CustomCalculator> = {
  "inventory-financing-loan-calculator": inventoryFinancingLoanCalculator,
  "inventory-financing-loan-payment-calculator": inventoryFinancingLoanPaymentCalculator,
  "inventory-financing-loan-payoff-calculator": inventoryFinancingLoanPayoffCalculator,
  "inventory-financing-loan-interest-calculator": inventoryFinancingLoanInterestCalculator,
  "inventory-financing-loan-affordability-calculator": inventoryFinancingLoanAffordabilityCalculator,
  "inventory-financing-loan-comparison-calculator": inventoryFinancingLoanComparisonCalculator,
  "inventory-financing-loan-eligibility-calculator": inventoryFinancingLoanEligibilityCalculator,
};
