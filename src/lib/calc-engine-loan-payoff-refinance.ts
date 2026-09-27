/**
 * Batch: "Loan Calculators" sub-batch C (Payoff, Refinance & Loan
 * Structures, 11 tools). Part of the Loan Calculators tool-list build-out
 * — see calc-engine-loan-core.ts for the full batch context, the skipped
 * duplicate, and the other 4 sub-batches.
 *
 * Deliberate differentiation (payoff and refinance are the two biggest
 * near-duplicate clusters in this list; the Mortgage batches already cover
 * mortgage-payoff/-prepayment/-refinance, refinance-break-even, and
 * balloon/interest-only MORTGAGES — these are general-loan tools):
 *  - loanPayoffCalculator: solves for the payment needed to be debt-free
 *    by a TARGET number of months.
 *  - extraLoanPaymentCalculator: a fixed EXTRA amount every month — months
 *    and interest saved.
 *  - earlyLoanPayoffCalculator: paying the WHOLE balance off today, net of
 *    a prepayment penalty.
 *  - loanPrepaymentCalculator: a one-time PARTIAL lump sum, comparing the
 *    two things lenders let you do with it — shorten the term or lower the
 *    payment.
 *  - loanRefinanceCalculator: the MONTHLY payment change.
 *  - loanRefinanceSavingsCalculator: the LIFETIME cost comparison,
 *    including fees and any term extension (where a lower payment can
 *    still cost more overall).
 *  - loanBreakEvenCalculator: two NEW loan offers (a cheaper rate with a
 *    fee vs a higher rate with a smaller or no fee) — the month the fee
 *    pays for itself, allowing for early payoff.
 *  - balloonLoanCalculator: balloon set as a % of the loan (car-finance
 *    style residual).
 *  - interestOnlyLoanCalculator: an interest-only period in months, then
 *    amortizing — and the payment jump.
 *  - loanComparisonCalculator: two offers with their own rate, term and
 *    fees, compared on payment and total cost.
 *  - fixedVsVariableRateLoanCalculator: a variable rate that steps each
 *    year up to a cap, re-amortized yearly, vs a fixed rate.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-payoff-refinance-calculators.ts for the tool
 * content/copy this math is wired to.
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

// Month-by-month payoff of `balance` at a fixed monthly payment. Returns
// months = Infinity when the payment never beats the interest.
function simulatePayoff(balance: number, i: number, monthlyPayment: number): { months: number; interest: number } {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (monthlyPayment <= balance * i) return { months: Infinity, interest: Infinity };
  let remaining = balance;
  let interest = 0;
  let months = 0;
  while (remaining > 1e-9 && months < 1200) {
    const monthInterest = remaining * i;
    interest += monthInterest;
    remaining = remaining + monthInterest - Math.min(monthlyPayment, remaining + monthInterest);
    months++;
  }
  return { months, interest };
}

const finiteOrZero = (n: number) => (Number.isFinite(n) ? n : 0);

// --- 1. Loan Payoff Calculator (target payoff date) --------------------------
export const loanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 18000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const currentPayment = Math.max(0, safeNumber(values.currentPayment, 400));
  const targetMonths = Math.max(1, Math.round(safeNumber(values.targetMonths, 24)));

  const i = annualRatePercent / 100 / 12;
  const requiredPayment = payment(balance, i, targetMonths);
  const current = simulatePayoff(balance, i, currentPayment);
  const interestWithTarget = requiredPayment * targetMonths - balance;

  return {
    requiredPayment: round2(requiredPayment),
    extraPerMonth: round2(requiredPayment - currentPayment),
    interestWithCurrentPayment: round2(finiteOrZero(current.interest)),
    interestWithTargetPayment: round2(interestWithTarget),
    interestSaved: Number.isFinite(current.interest) ? round2(current.interest - interestWithTarget) : 0,
  };
};

// --- 2. Extra Loan Payment Calculator (fixed extra every month) -------------
export const extraLoanPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));

  const i = annualRatePercent / 100 / 12;
  const base = simulatePayoff(balance, i, monthlyPayment);
  const withExtra = simulatePayoff(balance, i, monthlyPayment + extraMonthly);
  const bothFinite = Number.isFinite(base.months) && Number.isFinite(withExtra.months);

  return {
    monthsWithoutExtra: finiteOrZero(base.months),
    monthsWithExtra: finiteOrZero(withExtra.months),
    monthsSaved: bothFinite ? base.months - withExtra.months : 0,
    interestSaved: bothFinite ? round2(base.interest - withExtra.interest) : 0,
  };
};

// --- 3. Early Loan Payoff Calculator (pay it all off now) -------------------
export const earlyLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 380));
  const prepaymentPenaltyPercent = Math.max(0, safeNumber(values.prepaymentPenaltyPercent, 0));

  const i = annualRatePercent / 100 / 12;
  const kept = simulatePayoff(balance, i, monthlyPayment);
  const penaltyAmount = (balance * prepaymentPenaltyPercent) / 100;
  const interestAvoided = finiteOrZero(kept.interest);
  // A payment that never repays the loan has no finite interest to compare
  // against, so savings are reported as 0 rather than as "-penalty".
  const repays = Number.isFinite(kept.interest);

  return {
    payoffCostToday: round2(balance + penaltyAmount),
    penaltyAmount: round2(penaltyAmount),
    interestAvoided: round2(interestAvoided),
    netSavings: repays ? round2(interestAvoided - penaltyAmount) : 0,
  };
};

// --- 4. Loan Prepayment Calculator (reduce term vs reduce payment) ----------
export const loanPrepaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 40000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const prepaymentAmount = Math.min(balance, Math.max(0, safeNumber(values.prepaymentAmount, 8000)));

  const i = annualRatePercent / 100 / 12;
  const currentPayment = payment(balance, i, remainingMonths);
  const interestIfNoPrepayment = currentPayment * remainingMonths - balance;
  const newBalance = balance - prepaymentAmount;

  // Option A: keep the payment, finish sooner.
  const reduceTerm = simulatePayoff(newBalance, i, currentPayment);
  // Option B: keep the end date, pay less each month.
  const reducedPayment = payment(newBalance, i, remainingMonths);
  const interestReducePayment = reducedPayment * remainingMonths - newBalance;

  return {
    currentPayment: round2(currentPayment),
    newTermMonthsIfReduceTerm: finiteOrZero(reduceTerm.months),
    interestSavedIfReduceTerm: round2(interestIfNoPrepayment - finiteOrZero(reduceTerm.interest)),
    newPaymentIfReducePayment: round2(reducedPayment),
    interestSavedIfReducePayment: round2(interestIfNoPrepayment - interestReducePayment),
  };
};

// --- 5. Loan Refinance Calculator (monthly payment change) ------------------
export const loanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 20000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 11));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 7));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 48)));

  const currentPayment = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  const newPayment = payment(currentBalance, newRatePercent / 100 / 12, newTermMonths);

  return {
    currentPayment: round2(currentPayment),
    newPayment: round2(newPayment),
    monthlySavings: round2(currentPayment - newPayment),
    newTotalInterest: round2(newPayment * newTermMonths - currentBalance),
  };
};

// --- 6. Loan Refinance Savings Calculator (lifetime cost) --------------------
export const loanRefinanceSavingsCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 20000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 11));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 36)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 8));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 60)));
  const refinanceFees = Math.max(0, safeNumber(values.refinanceFees, 0));
  const feesRolledIn = safeNumber(values.feesRolledIn, 0) === 1;

  const currentPayment = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  const remainingCostCurrent = currentPayment * remainingMonths;
  const newPrincipal = feesRolledIn ? currentBalance + refinanceFees : currentBalance;
  const newPayment = payment(newPrincipal, newRatePercent / 100 / 12, newTermMonths);
  const totalCostNew = newPayment * newTermMonths + (feesRolledIn ? 0 : refinanceFees);

  return {
    remainingCostCurrent: round2(remainingCostCurrent),
    totalCostNew: round2(totalCostNew),
    netLifetimeSavings: round2(remainingCostCurrent - totalCostNew),
    monthlyCashFlowSavings: round2(currentPayment - newPayment),
  };
};

// --- 7. Loan Break-Even Calculator (fee vs rate, two new offers) ------------
// Cost of an offer if the loan is paid off after m months = its upfront
// fee + m payments + the balance still owed at month m.
export const loanBreakEvenCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const offerARatePercent = Math.max(0, safeNumber(values.offerARatePercent, 9));
  const offerAFee = Math.max(0, safeNumber(values.offerAFee, 0));
  const offerBRatePercent = Math.max(0, safeNumber(values.offerBRatePercent, 7.5));
  const offerBFee = Math.max(0, safeNumber(values.offerBFee, 600));
  const monthsYouKeepLoan = Math.min(termMonths, Math.max(1, Math.round(safeNumber(values.monthsYouKeepLoan, termMonths))));

  const iA = offerARatePercent / 100 / 12;
  const iB = offerBRatePercent / 100 / 12;
  const pA = payment(loanAmount, iA, termMonths);
  const pB = payment(loanAmount, iB, termMonths);
  const costA = (m: number) => offerAFee + pA * m + balanceAfter(loanAmount, iA, pA, m);
  const costB = (m: number) => offerBFee + pB * m + balanceAfter(loanAmount, iB, pB, m);

  let breakEvenMonth = 0;
  for (let m = 1; m <= termMonths; m++) {
    if (costB(m) <= costA(m)) {
      breakEvenMonth = m;
      break;
    }
  }

  return {
    paymentA: round2(pA),
    paymentB: round2(pB),
    breakEvenMonth,
    savingsWithBAtYourHorizon: round2(costA(monthsYouKeepLoan) - costB(monthsYouKeepLoan)),
  };
};

// --- 8. Balloon Loan Calculator (balloon as % of loan) ----------------------
export const balloonLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const balloonPercent = Math.min(100, Math.max(0, safeNumber(values.balloonPercent, 30)));

  const i = annualRatePercent / 100 / 12;
  const balloonPayment = (loanAmount * balloonPercent) / 100;
  const discountedBalloon = balloonPayment / Math.pow(1 + i, termMonths);
  const monthlyPayment = payment(loanAmount - discountedBalloon, i, termMonths);

  return {
    monthlyPayment: round2(monthlyPayment),
    balloonPayment: round2(balloonPayment),
    totalInterest: round2(monthlyPayment * termMonths + balloonPayment - loanAmount),
    paymentWithoutBalloon: round2(payment(loanAmount, i, termMonths)),
  };
};

// --- 9. Interest-Only Loan Calculator ----------------------------------------
export const interestOnlyLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const totalTermMonths = Math.max(1, Math.round(safeNumber(values.totalTermMonths, 120)));
  const interestOnlyMonths = Math.min(totalTermMonths - 1, Math.max(0, Math.round(safeNumber(values.interestOnlyMonths, 24))));

  const i = annualRatePercent / 100 / 12;
  const interestOnlyPayment = loanAmount * i;
  const amortizingMonths = totalTermMonths - interestOnlyMonths;
  const amortizingPayment = payment(loanAmount, i, amortizingMonths);
  const totalInterest = interestOnlyPayment * interestOnlyMonths + amortizingPayment * amortizingMonths - loanAmount;
  const fullyAmortizingInterest = payment(loanAmount, i, totalTermMonths) * totalTermMonths - loanAmount;

  return {
    interestOnlyPayment: round2(interestOnlyPayment),
    amortizingPaymentAfter: round2(amortizingPayment),
    paymentIncrease: round2(amortizingPayment - interestOnlyPayment),
    totalInterest: round2(totalInterest),
    extraInterestVsFullyAmortizing: round2(totalInterest - fullyAmortizingInterest),
  };
};

// --- 10. Loan Comparison Calculator (two offers) -----------------------------
export const loanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const offer = (rateKey: string, termKey: string, feeKey: string, r: number, t: number) => {
    const rate = Math.max(0, safeNumber(values[rateKey], r));
    const term = Math.max(1, Math.round(safeNumber(values[termKey], t)));
    const fees = Math.max(0, safeNumber(values[feeKey], 0));
    const pmt = payment(loanAmount, rate / 100 / 12, term);
    return { pmt, totalCost: pmt * term - loanAmount + fees };
  };
  const a = offer("offerARatePercent", "offerATermMonths", "offerAFees", 8.5, 60);
  const b = offer("offerBRatePercent", "offerBTermMonths", "offerBFees", 7.9, 72);

  return {
    paymentA: round2(a.pmt),
    paymentB: round2(b.pmt),
    totalCostA: round2(a.totalCost),
    totalCostB: round2(b.totalCost),
    costDifference: round2(a.totalCost - b.totalCost),
  };
};

// --- 11. Fixed vs Variable Rate Loan Calculator ------------------------------
// The variable rate starts at its initial level and moves by a fixed step
// at the start of each later year (floored at 0, capped at the cap); the
// payment is re-amortized over the remaining term whenever it changes.
export const fixedVsVariableRateLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 50000));
  const termYears = Math.min(40, Math.max(1, Math.round(safeNumber(values.termYears, 5))));
  const fixedRatePercent = Math.max(0, safeNumber(values.fixedRatePercent, 8));
  const variableStartRatePercent = Math.max(0, safeNumber(values.variableStartRatePercent, 6.5));
  const yearlyRateChangePercent = safeNumber(values.yearlyRateChangePercent, 0);
  const rateCapPercent = Math.max(0, safeNumber(values.rateCapPercent, 100));

  const n = termYears * 12;
  const fixedPayment = payment(loanAmount, fixedRatePercent / 100 / 12, n);
  const fixedTotalInterest = fixedPayment * n - loanAmount;

  let balance = loanAmount;
  let variableTotalInterest = 0;
  let firstPayment = 0;
  let lastYearPayment = 0;
  for (let year = 1; year <= termYears; year++) {
    const rate = Math.min(rateCapPercent, Math.max(0, variableStartRatePercent + yearlyRateChangePercent * (year - 1)));
    const i = rate / 100 / 12;
    const monthsLeft = n - (year - 1) * 12;
    const pmt = payment(balance, i, monthsLeft);
    if (year === 1) firstPayment = pmt;
    lastYearPayment = pmt;
    for (let m = 0; m < 12; m++) {
      const interest = balance * i;
      variableTotalInterest += interest;
      balance = balance + interest - pmt;
    }
  }

  return {
    fixedPayment: round2(fixedPayment),
    fixedTotalInterest: round2(fixedTotalInterest),
    variableFirstPayment: round2(firstPayment),
    variableFinalYearPayment: round2(lastYearPayment),
    variableTotalInterest: round2(variableTotalInterest),
    fixedMinusVariableInterest: round2(fixedTotalInterest - variableTotalInterest),
  };
};

export const loanPayoffRefinanceCustomCalculators: Record<string, CustomCalculator> = {
  "loan-payoff-calculator": loanPayoffCalculator,
  "extra-loan-payment-calculator": extraLoanPaymentCalculator,
  "early-loan-payoff-calculator": earlyLoanPayoffCalculator,
  "loan-prepayment-calculator": loanPrepaymentCalculator,
  "loan-refinance-calculator": loanRefinanceCalculator,
  "loan-refinance-savings-calculator": loanRefinanceSavingsCalculator,
  "loan-break-even-calculator": loanBreakEvenCalculator,
  "balloon-loan-calculator": balloonLoanCalculator,
  "interest-only-loan-calculator": interestOnlyLoanCalculator,
  "loan-comparison-calculator": loanComparisonCalculator,
  "fixed-vs-variable-rate-loan-calculator": fixedVsVariableRateLoanCalculator,
};
