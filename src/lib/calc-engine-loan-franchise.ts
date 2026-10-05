/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 5 of 11 —
 * Franchise Loans (7 tools), filed under Loan Calculators > General Loan
 * Calculators. See calc-engine-loan-sba.ts for the full batch context.
 *
 * A franchise loan pays for a franchise's initial investment (franchise
 * fee, build-out, equipment, opening inventory, working capital — listed
 * in Item 7 of the Franchise Disclosure Document). What sets these tools
 * apart from a plain business loan is the franchisor's ongoing fees:
 *  - franchiseLoan: initial investment -> equity -> loan and payment.
 *  - franchiseLoanPayment: loan payment + royalty + ad fund as a share of
 *    revenue — the full monthly obligation.
 *  - franchiseLoanPayoff: putting a share of monthly profit toward extra
 *    principal.
 *  - franchiseLoanInterest: interest-only months while the unit opens and
 *    ramps up, then amortizing; the extra interest that costs.
 *  - franchiseLoanAffordability: revenue x margin - royalties/ad fund ->
 *    cash flow -> DSCR -> maximum loan.
 *  - franchiseLoanComparison: two financing offers (e.g. SBA vs franchisor
 *    or equipment-lender financing).
 *  - franchiseLoanEligibility: franchisor liquid-capital and net-worth
 *    minimums, equity injection and credit score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-franchise-calculators.ts for the copy.
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

// --- 1. Franchise Loan Calculator ---------------------------------------------------
export const franchiseLoanCalculator: CustomCalculator = (values) => {
  const franchiseFee = Math.max(0, safeNumber(values.franchiseFee, 40000));
  const buildOut = Math.max(0, safeNumber(values.buildOut, 250000));
  const equipment = Math.max(0, safeNumber(values.equipment, 120000));
  const workingCapital = Math.max(0, safeNumber(values.workingCapital, 60000));
  const equityPercent = Math.min(100, Math.max(0, safeNumber(values.equityPercent, 20)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const total = franchiseFee + buildOut + equipment + workingCapital;
  const equity = (total * equityPercent) / 100;
  const loan = total - equity;
  const n = termYears * 12;
  const pmt = payment(loan, annualRatePercent / 100 / 12, n);

  return {
    totalInvestment: round2(total),
    equityRequired: round2(equity),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 2. Franchise Loan Payment Calculator (with royalty + ad fund) -------------------
export const franchiseLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 350000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const monthlyRevenue = Math.max(0, safeNumber(values.monthlyRevenue, 80000));
  const royaltyPercent = Math.max(0, safeNumber(values.royaltyPercent, 6));
  const adFundPercent = Math.max(0, safeNumber(values.adFundPercent, 2));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termYears * 12);
  const royalty = (monthlyRevenue * royaltyPercent) / 100;
  const ad = (monthlyRevenue * adFundPercent) / 100;
  const total = pmt + royalty + ad;

  return {
    loanPayment: round2(pmt),
    royaltyFee: round2(royalty),
    adFundFee: round2(ad),
    totalMonthlyObligations: round2(total),
    shareOfRevenue: round2(monthlyRevenue > 0 ? (total / monthlyRevenue) * 100 : 0),
  };
};

// --- 3. Franchise Loan Payoff Calculator (share of profit as extra) ------------------
export const franchiseLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const monthlyProfit = Math.max(0, safeNumber(values.monthlyProfit, 8000));
  const sharePercent = Math.min(100, Math.max(0, safeNumber(values.sharePercent, 25)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const extra = (monthlyProfit * sharePercent) / 100;
  let b = loanAmount;
  let months = 0;
  let interest = 0;
  while (b > 0.005 && months < n) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pmt + extra, b + int);
    months++;
  }

  return {
    regularPayment: round2(pmt),
    extraPayment: round2(extra),
    monthsToPayoff: months,
    yearsSaved: round2((n - months) / 12),
    interestSaved: round2(Math.max(0, pmt * n - loanAmount - interest)),
  };
};

// --- 4. Franchise Loan Interest Calculator (interest-only ramp-up) -------------------
export const franchiseLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 400000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));
  const n = termYears * 12;
  const interestOnlyMonths = Math.min(n - 1, Math.max(0, Math.round(safeNumber(values.interestOnlyMonths, 6))));

  const i = annualRatePercent / 100 / 12;
  const io = loanAmount * i;
  const amort = payment(loanAmount, i, n - interestOnlyMonths);
  const total = io * interestOnlyMonths + amort * (n - interestOnlyMonths) - loanAmount;
  const noIo = payment(loanAmount, i, n) * n - loanAmount;

  return {
    interestOnlyPayment: round2(io),
    paymentAfterRampUp: round2(amort),
    interestDuringRampUp: round2(io * interestOnlyMonths),
    totalInterest: round2(total),
    extraInterestFromRampUp: round2(total - noIo),
  };
};

// --- 5. Franchise Loan Affordability Calculator ---------------------------------------
export const franchiseLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 1000000));
  const marginPercent = Math.max(0, safeNumber(values.marginPercent, 20));
  const feesPercent = Math.max(0, safeNumber(values.feesPercent, 8));
  const ownerSalary = Math.max(0, safeNumber(values.ownerSalary, 60000));
  const minDscr = Math.max(1, safeNumber(values.minDscr, 1.25));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const cashFlow = Math.max(0, (annualRevenue * (marginPercent - feesPercent)) / 100 - ownerSalary);
  const maxDs = cashFlow / minDscr;

  return {
    franchisorFees: round2((annualRevenue * feesPercent) / 100),
    cashFlowForDebt: round2(cashFlow),
    maxAnnualPayments: round2(maxDs),
    maxLoanAmount: round2(presentValue(maxDs / 12, annualRatePercent / 100 / 12, termYears * 12)),
  };
};

// --- 6. Franchise Loan Comparison Calculator (two offers) -----------------------------
export const franchiseLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 300000));
  const rateA = Math.max(0, safeNumber(values.rateAPercent, 10.5));
  const termA = Math.max(1, Math.round(safeNumber(values.termAYears, 10)));
  const feeA = Math.max(0, safeNumber(values.feeAPercent, 3));
  const rateB = Math.max(0, safeNumber(values.rateBPercent, 8.9));
  const termB = Math.max(1, Math.round(safeNumber(values.termBYears, 7)));
  const feeB = Math.max(0, safeNumber(values.feeBPercent, 1));

  const pA = payment(loanAmount, rateA / 100 / 12, termA * 12);
  const pB = payment(loanAmount, rateB / 100 / 12, termB * 12);
  const cA = pA * termA * 12 - loanAmount + (loanAmount * feeA) / 100;
  const cB = pB * termB * 12 - loanAmount + (loanAmount * feeB) / 100;

  return {
    paymentA: round2(pA),
    paymentB: round2(pB),
    totalCostA: round2(cA),
    totalCostB: round2(cB),
    savingsWithB: round2(cA - cB),
  };
};

// --- 7. Franchise Loan Eligibility Calculator ----------------------------------------
export const franchiseLoanEligibilityCalculator: CustomCalculator = (values) => {
  const liquidCapital = Math.max(0, safeNumber(values.liquidCapital, 150000));
  const requiredLiquid = Math.max(0, safeNumber(values.requiredLiquid, 125000));
  const netWorth = Math.max(0, safeNumber(values.netWorth, 450000));
  const requiredNetWorth = Math.max(0, safeNumber(values.requiredNetWorth, 500000));
  const totalInvestment = Math.max(0, safeNumber(values.totalInvestment, 500000));
  const equityPercent = Math.min(100, Math.max(0, safeNumber(values.equityPercent, 20)));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 700)));

  const equityNeeded = (totalInvestment * equityPercent) / 100;
  let passed = 0;
  if (liquidCapital >= requiredLiquid) passed++;
  if (netWorth >= requiredNetWorth) passed++;
  if (liquidCapital >= equityNeeded) passed++;
  if (creditScore >= 680) passed++;

  return {
    liquidCapitalSurplus: round2(liquidCapital - requiredLiquid),
    netWorthSurplus: round2(netWorth - requiredNetWorth),
    equityInjectionNeeded: round2(equityNeeded),
    checksPassed: passed,
  };
};

export const loanFranchiseCustomCalculators: Record<string, CustomCalculator> = {
  "franchise-loan-calculator": franchiseLoanCalculator,
  "franchise-loan-payment-calculator": franchiseLoanPaymentCalculator,
  "franchise-loan-payoff-calculator": franchiseLoanPayoffCalculator,
  "franchise-loan-interest-calculator": franchiseLoanInterestCalculator,
  "franchise-loan-affordability-calculator": franchiseLoanAffordabilityCalculator,
  "franchise-loan-comparison-calculator": franchiseLoanComparisonCalculator,
  "franchise-loan-eligibility-calculator": franchiseLoanEligibilityCalculator,
};
