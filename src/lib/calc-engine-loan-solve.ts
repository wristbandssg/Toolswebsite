/**
 * Batch: "Loan Calculators" sub-batch B (Solve for Amount, Term, Rate &
 * Balance, 10 tools). Part of the Loan Calculators tool-list build-out —
 * see calc-engine-loan-core.ts for the full batch context, the skipped
 * duplicate, and the other 4 sub-batches.
 *
 * Deliberate differentiation across the near-namesakes here:
 *  - loanAmountCalculator: solves for the loan size a monthly payment
 *    supports; loanAffordabilityCalculator instead starts from INCOME and
 *    a debt-to-income limit; loanEligibilityCalculator checks a SPECIFIC
 *    requested loan against a DTI limit and reports the headroom.
 *  - loanPrincipalCalculator: the principal/interest split of one chosen
 *    payment number — not a loan size.
 *  - loanTermCalculator: solves for how long a payment takes to repay a
 *    loan; loanMaturityCalculator is plain schedule arithmetic on a known
 *    term (payments left, time to maturity, % of term elapsed).
 *  - loanRateCalculator: solves for the interest rate implied by a payment;
 *    loanAprCalculator adds fees to find the APR (the existing
 *    apr-calculator in the Interest category only converts a periodic rate
 *    to a nominal annual one — it doesn't handle fees).
 *  - loanBalanceCalculator: balance from the ORIGINAL loan terms and
 *    payments made; remainingLoanBalanceCalculator: balance from just the
 *    current payment, rate and payments left (when the original terms
 *    aren't to hand).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-solve-calculators.ts for the tool content/copy
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

// Present value of `n` level payments of `pmt` at periodic rate `i`.
function presentValue(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (1 - Math.pow(1 + i, -n))) / i;
}

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (i === 0) return Math.max(0, principal - pmt * k);
  return Math.max(0, principal * Math.pow(1 + i, k) - (pmt * (Math.pow(1 + i, k) - 1)) / i);
}

function solvePeriodicRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0 || pmt * n <= pv) return 0;
  let lo = 1e-9;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(pmt, mid, n) > pv) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 1. Loan Amount Calculator (from an affordable payment) -----------------
export const loanAmountCalculator: CustomCalculator = (values) => {
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.round(termYears * 12);
  const loanAmount = presentValue(monthlyPayment, annualRatePercent / 100 / 12, n);

  return {
    loanAmount: round2(loanAmount),
    totalInterest: round2(monthlyPayment * n - loanAmount),
    totalPaid: round2(monthlyPayment * n),
  };
};

// --- 2. Loan Principal Calculator (split of one payment) --------------------
export const loanPrincipalCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.max(1, Math.round(termYears * 12));
  const paymentNumber = Math.min(n, Math.max(1, Math.round(safeNumber(values.paymentNumber, 12))));
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const balanceBefore = balanceAfter(loanAmount, i, pmt, paymentNumber - 1);
  const interestInPayment = balanceBefore * i;
  const balanceAfterPayment = balanceAfter(loanAmount, i, pmt, paymentNumber);

  return {
    principalInPayment: round2(pmt - interestInPayment),
    interestInPayment: round2(interestInPayment),
    cumulativePrincipalPaid: round2(loanAmount - balanceAfterPayment),
    balanceAfterPayment: round2(balanceAfterPayment),
  };
};

// --- 3. Loan Term Calculator (solve for time) --------------------------------
export const loanTermCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));

  const i = annualRatePercent / 100 / 12;
  const interestOnlyPayment = loanAmount * i;

  // A payment that doesn't beat the first month's interest never repays.
  if (loanAmount <= 0 || monthlyPayment <= interestOnlyPayment) {
    return { monthsToRepay: 0, yearsToRepay: 0, totalInterest: 0, interestOnlyPayment: round2(interestOnlyPayment) };
  }

  const exactMonths = i === 0 ? loanAmount / monthlyPayment : -Math.log(1 - (loanAmount * i) / monthlyPayment) / Math.log(1 + i);
  const monthsToRepay = Math.ceil(exactMonths - 1e-9);
  // Total paid = full payments for all but the last month, plus the smaller
  // final payment that clears what's left.
  const balanceBeforeLast = balanceAfter(loanAmount, i, monthlyPayment, monthsToRepay - 1);
  const totalPaid = monthlyPayment * (monthsToRepay - 1) + balanceBeforeLast * (1 + i);

  return {
    monthsToRepay,
    yearsToRepay: round2(exactMonths / 12),
    totalInterest: round2(totalPaid - loanAmount),
    interestOnlyPayment: round2(interestOnlyPayment),
  };
};

// --- 4. Loan Rate Calculator (solve for rate) --------------------------------
export const loanRateCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 420));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const monthlyRate = solvePeriodicRate(loanAmount, monthlyPayment, termMonths);

  return {
    annualRatePercent: round2(monthlyRate * 12 * 100),
    monthlyRatePercent: round2(monthlyRate * 100 * 100) / 100,
    totalInterest: round2(Math.max(0, monthlyPayment * termMonths - loanAmount)),
  };
};

// --- 5. Loan APR Calculator (rate + fees) ------------------------------------
export const loanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const originationFeePercent = Math.max(0, safeNumber(values.originationFeePercent, 0));
  const otherFees = Math.max(0, safeNumber(values.otherFees, 0));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const totalFees = (loanAmount * originationFeePercent) / 100 + otherFees;
  const amountReceived = loanAmount - totalFees;
  // APR: the rate at which the payments repay only the money you actually
  // received. With no fees it equals the stated rate.
  const aprMonthly = totalFees > 0 ? solvePeriodicRate(amountReceived, pmt, termMonths) : annualRatePercent / 100 / 12;

  return {
    aprPercent: round2(aprMonthly * 12 * 100),
    monthlyPayment: round2(pmt),
    totalFees: round2(totalFees),
    amountReceived: round2(Math.max(0, amountReceived)),
  };
};

// --- 6. Loan Affordability Calculator (income + DTI limit) ------------------
export const loanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 6000));
  const existingMonthlyDebt = Math.max(0, safeNumber(values.existingMonthlyDebt, 0));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 36));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.round(termYears * 12);
  const maxMonthlyPayment = Math.max(0, (grossMonthlyIncome * maxDtiPercent) / 100 - existingMonthlyDebt);
  const maxLoanAmount = presentValue(maxMonthlyPayment, annualRatePercent / 100 / 12, n);

  return {
    maxMonthlyPayment: round2(maxMonthlyPayment),
    maxLoanAmount: round2(maxLoanAmount),
    totalInterestAtMax: round2(maxMonthlyPayment * n - maxLoanAmount),
  };
};

// --- 7. Loan Eligibility Calculator (check a requested loan) ----------------
export const loanEligibilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 5000));
  const existingMonthlyDebt = Math.max(0, safeNumber(values.existingMonthlyDebt, 0));
  const requestedAmount = Math.max(0, safeNumber(values.requestedAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));
  const dtiLimitPercent = Math.max(0, safeNumber(values.dtiLimitPercent, 40));

  const newPayment = payment(requestedAmount, annualRatePercent / 100 / 12, Math.round(termYears * 12));
  const dtiAfterLoan = grossMonthlyIncome > 0 ? ((existingMonthlyDebt + newPayment) / grossMonthlyIncome) * 100 : 0;

  return {
    newMonthlyPayment: round2(newPayment),
    dtiAfterLoanPercent: round2(dtiAfterLoan),
    dtiLimitPercent: round2(dtiLimitPercent),
    paymentHeadroom: round2((grossMonthlyIncome * dtiLimitPercent) / 100 - existingMonthlyDebt - newPayment),
  };
};

// --- 8. Loan Balance Calculator (from original terms) -----------------------
export const loanBalanceCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(0, safeNumber(values.termYears, 5));

  const n = Math.max(1, Math.round(termYears * 12));
  const paymentsMade = Math.min(n, Math.max(0, Math.round(safeNumber(values.paymentsMade, 24))));
  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, n);
  const remainingBalance = balanceAfter(loanAmount, i, pmt, paymentsMade);
  const principalPaid = loanAmount - remainingBalance;

  return {
    remainingBalance: round2(remainingBalance),
    principalPaid: round2(principalPaid),
    interestPaid: round2(pmt * paymentsMade - principalPaid),
    percentPaidOff: loanAmount > 0 ? round2((principalPaid / loanAmount) * 100) : 0,
  };
};

// --- 9. Remaining Loan Balance Calculator (from payment + payments left) ----
export const remainingLoanBalanceCalculator: CustomCalculator = (values) => {
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 450));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7.5));
  const remainingPayments = Math.max(0, Math.round(safeNumber(values.remainingPayments, 30)));

  const remainingBalance = presentValue(monthlyPayment, annualRatePercent / 100 / 12, remainingPayments);
  const totalRemainingPayments = monthlyPayment * remainingPayments;

  return {
    remainingBalance: round2(remainingBalance),
    remainingInterest: round2(totalRemainingPayments - remainingBalance),
    totalRemainingPayments: round2(totalRemainingPayments),
  };
};

// --- 10. Loan Maturity Calculator (schedule position) ------------------------
export const loanMaturityCalculator: CustomCalculator = (values) => {
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const paymentsMade = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.paymentsMade, 22))));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 0));

  const paymentsRemaining = termMonths - paymentsMade;

  return {
    paymentsRemaining,
    yearsToMaturity: round2(paymentsRemaining / 12),
    percentOfTermElapsed: round2((paymentsMade / termMonths) * 100),
    remainingScheduledPayments: round2(paymentsRemaining * monthlyPayment),
  };
};

export const loanSolveCustomCalculators: Record<string, CustomCalculator> = {
  "loan-amount-calculator": loanAmountCalculator,
  "loan-principal-calculator": loanPrincipalCalculator,
  "loan-term-calculator": loanTermCalculator,
  "loan-rate-calculator": loanRateCalculator,
  "loan-apr-calculator": loanAprCalculator,
  "loan-affordability-calculator": loanAffordabilityCalculator,
  "loan-eligibility-calculator": loanEligibilityCalculator,
  "loan-balance-calculator": loanBalanceCalculator,
  "remaining-loan-balance-calculator": remainingLoanBalanceCalculator,
  "loan-maturity-calculator": loanMaturityCalculator,
};
