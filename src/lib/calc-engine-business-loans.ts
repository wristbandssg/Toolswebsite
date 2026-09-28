/**
 * Batch: "Business Finance Calculators" sub-batch H (Business Loans, 4
 * tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches. Filed
 * under Finance Calculators > LOAN Calculators, next to the existing
 * business-loan payment/interest/APR/payoff/affordability/EMI tools.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - businessLoanAmortizationCalculator: a term shorter than the
 *    amortization period, leaving a BALLOON payment — typical of business
 *    and commercial loans. (amortization-calculator fully repays.)
 *  - businessLoanComparisonCalculator: two offers with different rates,
 *    terms and origination fees — total cost and effective APR. (loan-
 *    comparison-calculator compares rates/terms without fees.)
 *  - businessLoanRefinanceCalculator: refinancing with a PREPAYMENT penalty
 *    on the old loan and fees on the new one — savings and break-even.
 *  - commercialLoanCalculator: a commercial real estate loan sized by
 *    loan-to-value, with the balloon and the DSCR from the property's NOI.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-loans-calculators.ts for the tool content/copy
 * this math is wired to.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  return Math.max(0, principal * Math.pow(1 + i, k) - (pmt * (Math.pow(1 + i, k) - 1)) / i);
}

// Monthly rate at which `pmt` for `n` months has present value `pv`.
function solveRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt * n <= pv) return 0;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const v = (pmt * (1 - Math.pow(1 + mid, -n))) / mid;
    if (v > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Business Loan Amortization (with balloon) --------------------------
export const businessLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 250000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 15));
  const termYears = Math.max(1, Math.min(amortizationYears, safeNumber(values.termYears, 5)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, Math.round(amortizationYears * 12));
  const k = Math.round(termYears * 12);
  const balloon = balanceAfter(loanAmount, i, pmt, k);
  const principalPaid = loanAmount - balloon;

  return {
    monthlyPayment: round2(pmt),
    balloonPaymentAtEndOfTerm: round2(balloon),
    interestPaidDuringTerm: round2(pmt * k - principalPaid),
    principalPaidDuringTerm: round2(principalPaid),
    balanceAfterYear1: round2(balanceAfter(loanAmount, i, pmt, Math.min(12, k))),
  };
};

// --- 2. Business Loan Comparison (with fees) --------------------------------
export const businessLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 150000));
  const rateA = Math.max(0, safeNumber(values.rateA, 9));
  const termYearsA = Math.max(1, safeNumber(values.termYearsA, 5));
  const feePercentA = Math.max(0, safeNumber(values.feePercentA, 3));
  const rateB = Math.max(0, safeNumber(values.rateB, 10));
  const termYearsB = Math.max(1, safeNumber(values.termYearsB, 5));
  const feePercentB = Math.max(0, safeNumber(values.feePercentB, 0));

  const offer = (rate: number, years: number, fee: number) => {
    const n = Math.round(years * 12);
    const pmt = payment(loanAmount, rate / 100 / 12, n);
    const fees = (loanAmount * fee) / 100;
    // Effective APR: fees reduce the money you actually receive.
    const apr = solveRate(loanAmount - fees, pmt, n) * 12 * 100;
    return { pmt, total: pmt * n + fees - loanAmount, apr };
  };
  const a = offer(rateA, termYearsA, feePercentA);
  const b = offer(rateB, termYearsB, feePercentB);

  return {
    // Positive = Offer A costs more than B.
    costDifferenceAMinusB: round2(a.total - b.total),
    totalCostOfferA: round2(a.total),
    totalCostOfferB: round2(b.total),
    monthlyPaymentOfferA: round2(a.pmt),
    monthlyPaymentOfferB: round2(b.pmt),
    effectiveAprOfferAPercent: round2(a.apr),
    effectiveAprOfferBPercent: round2(b.apr),
  };
};

// --- 3. Business Loan Refinance (penalty + fees) -------------------------
export const businessLoanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 120000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 12));
  const monthsLeft = Math.max(1, Math.round(safeNumber(values.monthsLeft, 48)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 8.5));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 48)));
  const prepaymentPenaltyPercent = Math.max(0, safeNumber(values.prepaymentPenaltyPercent, 2));
  const newLoanFees = Math.max(0, safeNumber(values.newLoanFees, 2500));

  const oldPmt = payment(currentBalance, currentRatePercent / 100 / 12, monthsLeft);
  const newPmt = payment(currentBalance, newRatePercent / 100 / 12, newTermMonths);
  const upfront = (currentBalance * prepaymentPenaltyPercent) / 100 + newLoanFees;
  const oldInterest = oldPmt * monthsLeft - currentBalance;
  const newInterest = newPmt * newTermMonths - currentBalance;
  const monthlySaving = oldPmt - newPmt;

  return {
    netSavings: round2(oldInterest - newInterest - upfront),
    monthlySaving: round2(monthlySaving),
    newMonthlyPayment: round2(newPmt),
    upfrontCostsToRefinance: round2(upfront),
    // 0 = the monthly payment doesn't fall, so there's no break-even point.
    breakEvenMonths: monthlySaving > 0 ? round2(upfront / monthlySaving) : 0,
  };
};

// --- 4. Commercial Loan Calculator (LTV, balloon, DSCR) -------------------
export const commercialLoanCalculator: CustomCalculator = (values) => {
  const propertyValue = Math.max(0, safeNumber(values.propertyValue, 1500000));
  const loanToValuePercent = Math.min(100, Math.max(0, safeNumber(values.loanToValuePercent, 75)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 25));
  const termYears = Math.max(1, Math.min(amortizationYears, safeNumber(values.termYears, 10)));
  const netOperatingIncome = Math.max(0, safeNumber(values.netOperatingIncome, 120000));

  const loan = (propertyValue * loanToValuePercent) / 100;
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loan, i, Math.round(amortizationYears * 12));
  const debtService = pmt * 12;

  return {
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    balloonAtMaturity: round2(balanceAfter(loan, i, pmt, Math.round(termYears * 12))),
    debtServiceCoverageRatio: debtService > 0 ? round2(netOperatingIncome / debtService) : 0,
    downPaymentNeeded: round2(propertyValue - loan),
  };
};

export const businessLoansCustomCalculators: Record<string, CustomCalculator> = {
  "business-loan-amortization-calculator": businessLoanAmortizationCalculator,
  "business-loan-comparison-calculator": businessLoanComparisonCalculator,
  "business-loan-refinance-calculator": businessLoanRefinanceCalculator,
  "commercial-loan-calculator": commercialLoanCalculator,
};
