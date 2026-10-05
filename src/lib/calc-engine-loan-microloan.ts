/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 3 of 11 —
 * Microloans (7 tools), filed under Loan Calculators > General Loan
 * Calculators. See calc-engine-loan-sba.ts for the full batch context.
 *
 * Microloans are small business loans (SBA Microloans go up to $50,000 over
 * up to 6 years, made by nonprofit intermediaries; other microlenders and
 * microfinance institutions lend smaller amounts, often weekly):
 *  - microloan: payment, interest, and APR including an upfront fee.
 *  - microloanPayment: weekly / every-two-weeks / monthly repayment.
 *  - microloanPayoff: an extra amount with every payment.
 *  - microloanInterest: a FLAT rate (charged on the original amount for the
 *    whole term, common in microfinance) vs the equivalent declining-balance
 *    APR.
 *  - microloanAffordability: a share of monthly business profit -> maximum
 *    loan, capped at the SBA Microloan limit.
 *  - microloanComparison: microloan vs carrying the same amount on a
 *    business credit card at the same monthly payment.
 *  - microloanEligibility: payment-to-cash-flow plus the program limits.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-microloan-calculators.ts for the copy.
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

/** Months to repay `balance` at monthly rate `i` paying `pmt` a month, plus total interest. */
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

// --- 1. Microloan Calculator -----------------------------------------------------
export const microloanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const upfrontFee = Math.max(0, safeNumber(values.upfrontFee, 500));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;
  const apr = solveRate(Math.max(0, loanAmount - upfrontFee), pmt, termMonths) * 12 * 100;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(interest + upfrontFee),
    apr: round2(apr),
  };
};

// --- 2. Microloan Payment Calculator (weekly / biweekly / monthly) ---------------
export const microloanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const raw = Math.round(safeNumber(values.paymentsPerYear, 52));
  const perYear = [52, 26, 12].includes(raw) ? raw : 52;

  const n = Math.max(1, Math.round((termMonths / 12) * perYear));
  const pmt = payment(loanAmount, annualRatePercent / 100 / perYear, n);

  return {
    numberOfPayments: n,
    paymentPerPeriod: round2(pmt),
    monthlyEquivalent: round2((pmt * perYear) / 12),
    totalInterest: round2(pmt * n - loanAmount),
  };
};

// --- 3. Microloan Payoff Calculator (extra each month) ---------------------------
export const microloanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 200));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const base = pmt * remainingMonths - balance;
  const fast = repay(balance, i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    newPayment: round2(pmt + extraMonthly),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, base - fast.interest)),
  };
};

// --- 4. Microloan Interest Calculator (flat rate vs APR) -------------------------
export const microloanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000));
  const flatRatePercent = Math.max(0, safeNumber(values.flatRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const interest = (loanAmount * flatRatePercent * termMonths) / 1200;
  const pmt = (loanAmount + interest) / termMonths;
  const apr = solveRate(loanAmount, pmt, termMonths) * 12 * 100;

  return {
    flatInterest: round2(interest),
    monthlyPayment: round2(pmt),
    totalRepaid: round2(loanAmount + interest),
    equivalentApr: round2(apr),
  };
};

// --- 5. Microloan Affordability Calculator -----------------------------------------
export const microloanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyProfit = Math.max(0, safeNumber(values.monthlyProfit, 3000));
  const sharePercent = Math.min(100, Math.max(0, safeNumber(values.sharePercent, 20)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const maxPmt = (monthlyProfit * sharePercent) / 100;
  const maxLoan = presentValue(maxPmt, annualRatePercent / 100 / 12, termMonths);

  return {
    maxMonthlyPayment: round2(maxPmt),
    maxLoanAmount: round2(maxLoan),
    maxLoanWithinSbaLimit: round2(Math.min(maxLoan, 50000)),
  };
};

// --- 6. Microloan Comparison Calculator (vs business credit card) ----------------
export const microloanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 15000));
  const microRatePercent = Math.max(0, safeNumber(values.microRatePercent, 9));
  const microTermMonths = Math.max(1, Math.round(safeNumber(values.microTermMonths, 36)));
  const microFee = Math.max(0, safeNumber(values.microFee, 300));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 24));

  const pmt = payment(amount, microRatePercent / 100 / 12, microTermMonths);
  const microCost = pmt * microTermMonths - amount + microFee;
  const card = repay(amount, cardAprPercent / 100 / 12, pmt);

  return {
    monthlyPayment: round2(pmt),
    microloanTotalCost: round2(microCost),
    cardMonthsToRepay: card.months,
    cardTotalInterest: round2(card.interest),
    savingsWithMicroloan: round2(card.interest - microCost),
  };
};

// --- 7. Microloan Eligibility Calculator ------------------------------------------
export const microloanEligibilityCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const monthlyCashFlow = Math.max(0, safeNumber(values.monthlyCashFlow, 2500));
  const maxSharePercent = Math.max(1, safeNumber(values.maxSharePercent, 25));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 620)));
  const minScore = Math.min(850, Math.max(300, safeNumber(values.minScore, 575)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const share = monthlyCashFlow > 0 ? (pmt / monthlyCashFlow) * 100 : 0;
  let passed = 0;
  if (loanAmount <= 50000) passed++;
  if (termMonths <= 72) passed++;
  if (monthlyCashFlow > 0 && share <= maxSharePercent) passed++;
  if (creditScore >= minScore) passed++;

  return {
    monthlyPayment: round2(pmt),
    paymentShareOfCashFlow: round2(share),
    maxLoanAtThatShare: round2(
      presentValue((monthlyCashFlow * maxSharePercent) / 100, annualRatePercent / 100 / 12, termMonths)
    ),
    checksPassed: passed,
  };
};

export const loanMicroloanCustomCalculators: Record<string, CustomCalculator> = {
  "microloan-calculator": microloanCalculator,
  "microloan-payment-calculator": microloanPaymentCalculator,
  "microloan-payoff-calculator": microloanPayoffCalculator,
  "microloan-interest-calculator": microloanInterestCalculator,
  "microloan-affordability-calculator": microloanAffordabilityCalculator,
  "microloan-comparison-calculator": microloanComparisonCalculator,
  "microloan-eligibility-calculator": microloanEligibilityCalculator,
};
