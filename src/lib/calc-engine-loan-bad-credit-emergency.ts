/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 7 of 10 —
 * Bad Credit Loans (7) and Emergency Loans (7), filed under Loan
 * Calculators > Short-Term & High-Cost Loan Calculators (next to the
 * payday, title and pawn tools). "No-Credit-Check Loan" x4 was merged into
 * Bad Credit Loan and "Same-Day Loan" x4 into Emergency Loan (same
 * purpose: fast money with weak credit / fast money now). See
 * calc-engine-loan-startup-business.ts for the full batch context.
 *
 * Bad credit:
 *  - badCreditLoan: rate + origination fee -> payment, cost and APR.
 *  - badCreditLoanPayment: payment alone vs with a co-signer vs secured.
 *  - badCreditLoanPayoff: extra each month.
 *  - badCreditLoanInterest: a bad-credit installment loan vs a
 *    no-credit-check lender's far higher APR.
 *  - badCreditLoanAffordability: a budget -> loan and cash after the fee.
 *  - badCreditLoanComparison: installment loan vs rolling over a payday
 *    loan for the same months.
 *  - badCreditLoanEligibility: typical subprime screens.
 * Emergency:
 *  - emergencyLoan: the bill less your emergency fund, grossed up for the
 *    fee -> payment.
 *  - emergencyLoanPayment: standard funding vs same-day funding (higher
 *    rate + expedite fee) — the price of speed.
 *  - emergencyLoanPayoff: lump sum + extra.
 *  - emergencyLoanInterest: interest per day and 6 vs 12 months.
 *  - emergencyLoanAffordability: the leftover budget -> max loan.
 *  - emergencyLoanComparison: personal loan vs card cash advance vs a
 *    401(k) loan.
 *  - emergencyLoanEligibility: score, income, DTI, and a debit-card bank
 *    account (needed for same-day deposit).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-bad-credit-emergency-calculators.ts for the copy.
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

function solveMonthlyRate(pv: number, pmt: number, n: number): number {
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

function interestOver(amount: number, aprPercent: number, months: number): number {
  return payment(amount, aprPercent / 100 / 12, months) * months - amount;
}

// --- 1. Bad Credit Loan Calculator ---------------------------------------------------------
export const badCreditLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 29.99));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 8)));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const fee = (loanAmount * feePercent) / 100;
  const interest = pmt * termMonths - loanAmount;
  const apr = solveMonthlyRate(loanAmount - fee, pmt, termMonths) * 12 * 100;

  return {
    cashReceived: round2(loanAmount - fee),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(interest + fee),
    apr: round2(apr),
  };
};

// --- 2. Bad Credit Loan Payment Calculator (alone / co-signer / secured) -----------------
export const badCreditLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 5000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const aloneRatePercent = Math.max(0, safeNumber(values.aloneRatePercent, 32));
  const cosignerRatePercent = Math.max(0, safeNumber(values.cosignerRatePercent, 16));
  const securedRatePercent = Math.max(0, safeNumber(values.securedRatePercent, 12));

  const a = payment(loanAmount, aloneRatePercent / 100 / 12, termMonths);
  const c = payment(loanAmount, cosignerRatePercent / 100 / 12, termMonths);
  const s = payment(loanAmount, securedRatePercent / 100 / 12, termMonths);

  return {
    paymentAlone: round2(a),
    paymentWithCosigner: round2(c),
    paymentSecured: round2(s),
    savingsWithCosigner: round2((a - c) * termMonths),
    savingsSecured: round2((a - s) * termMonths),
  };
};

// --- 3. Bad Credit Loan Payoff Calculator --------------------------------------------------
export const badCreditLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 4000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 30));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 30)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(balance, i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    newPayment: round2(pmt + extraMonthly),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 4. Bad Credit Loan Interest Calculator (vs no-credit-check lender) -------------------
export const badCreditLoanInterestCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1500));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const badCreditAprPercent = Math.max(0, safeNumber(values.badCreditAprPercent, 35.99));
  const noCheckAprPercent = Math.max(0, safeNumber(values.noCheckAprPercent, 160));

  const bad = interestOver(amount, badCreditAprPercent, termMonths);
  const noCheck = interestOver(amount, noCheckAprPercent, termMonths);

  return {
    badCreditLoanInterest: round2(bad),
    noCreditCheckInterest: round2(noCheck),
    savingsWithBadCreditLoan: round2(noCheck - bad),
    badCreditPayment: round2((amount + bad) / termMonths),
    noCreditCheckPayment: round2((amount + noCheck) / termMonths),
  };
};

// --- 5. Bad Credit Loan Affordability Calculator -------------------------------------------
export const badCreditLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 200));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 30));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 8)));

  const loan = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termMonths);

  return {
    maxLoanAmount: round2(loan),
    originationFee: round2((loan * feePercent) / 100),
    cashYouReceive: round2(loan * (1 - feePercent / 100)),
    totalRepaid: round2(monthlyBudget * termMonths),
  };
};

// --- 6. Bad Credit Loan Comparison Calculator (installment vs payday rollovers) -----------
export const badCreditLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 6)));
  const installmentAprPercent = Math.max(0, safeNumber(values.installmentAprPercent, 35.99));
  const paydayFeePer100 = Math.max(0, safeNumber(values.paydayFeePer100, 15));

  const installment = interestOver(amount, installmentAprPercent, months);
  // Rolling a 2-week payday loan over for the whole period (about 26 periods a year).
  const periods = Math.round((months * 26) / 12);
  const payday = (amount / 100) * paydayFeePer100 * periods;

  return {
    installmentInterest: round2(installment),
    paydayFees: round2(payday),
    paydayApr: round2(paydayFeePer100 * 26),
    savingsWithInstallment: round2(payday - installment),
  };
};

// --- 7. Bad Credit Loan Eligibility Calculator ---------------------------------------------
export const badCreditLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 570)));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 2800));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 600));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 32));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 24)));
  const recentBankruptcy = Math.round(safeNumber(values.recentBankruptcy, 0)) === 1;

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const dti = monthlyIncome > 0 ? ((monthlyDebts + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (creditScore >= 560) passed++;
  if (monthlyIncome >= 1200) passed++;
  if (monthlyIncome > 0 && dti <= 50) passed++;
  if (!recentBankruptcy) passed++;

  return {
    monthlyPayment: round2(pmt),
    dtiWithLoan: round2(dti),
    checksPassed: passed,
  };
};

// --- 8. Emergency Loan Calculator ----------------------------------------------------------
export const emergencyLoanCalculator: CustomCalculator = (values) => {
  const emergencyCost = Math.max(0, safeNumber(values.emergencyCost, 3000));
  const emergencyFund = Math.max(0, safeNumber(values.emergencyFund, 800));
  const feePercent = Math.min(20, Math.max(0, safeNumber(values.originationFeePercent, 5)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 24));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const need = Math.max(0, emergencyCost - emergencyFund);
  const loan = need / (1 - feePercent / 100);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    amountNeeded: round2(need),
    loanToRequest: round2(loan),
    originationFee: round2(loan - need),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 9. Emergency Loan Payment Calculator (standard vs same-day funding) ------------------
export const emergencyLoanPaymentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 2000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const standardRatePercent = Math.max(0, safeNumber(values.standardRatePercent, 18));
  const sameDayRatePercent = Math.max(0, safeNumber(values.sameDayRatePercent, 30));
  const expediteFee = Math.max(0, safeNumber(values.expediteFee, 50));

  const std = payment(amount, standardRatePercent / 100 / 12, termMonths);
  const fast = payment(amount, sameDayRatePercent / 100 / 12, termMonths);

  return {
    standardPayment: round2(std),
    sameDayPayment: round2(fast),
    standardTotalCost: round2(std * termMonths - amount),
    sameDayTotalCost: round2(fast * termMonths - amount + expediteFee),
    extraCostOfSameDay: round2((fast - std) * termMonths + expediteFee),
  };
};

// --- 10. Emergency Loan Payoff Calculator (lump sum + extra) -----------------------------
export const emergencyLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 2500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 24));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 12)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 500));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(Math.max(0, balance - lumpSum), i, pmt + extraMonthly);

  return {
    currentPayment: round2(pmt),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

// --- 11. Emergency Loan Interest Calculator (per day, 6 vs 12 months) ---------------------
export const emergencyLoanInterestCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 2000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 28));
  const shortMonths = Math.max(1, Math.round(safeNumber(values.shortMonths, 6)));
  const longMonths = Math.max(1, Math.round(safeNumber(values.longMonths, 12)));

  const a = interestOver(amount, aprPercent, shortMonths);
  const b = interestOver(amount, aprPercent, longMonths);

  return {
    interestPerDayAtStart: round2((amount * aprPercent) / 100 / 365),
    interestShortTerm: round2(a),
    interestLongTerm: round2(b),
    savingsWithShorterTerm: round2(b - a),
  };
};

// --- 12. Emergency Loan Affordability Calculator -------------------------------------------
export const emergencyLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 3500));
  const monthlyBills = Math.max(0, safeNumber(values.monthlyBills, 3000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 24));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const leftover = Math.max(0, monthlyIncome - monthlyBills);
  const maxLoan = presentValue(leftover, aprPercent / 100 / 12, termMonths);

  return {
    leftoverEachMonth: round2(leftover),
    maxLoanAmount: round2(maxLoan),
    totalInterestAtMax: round2(leftover * termMonths - maxLoan),
  };
};

// --- 13. Emergency Loan Comparison Calculator (loan vs cash advance vs 401(k)) -----------
export const emergencyLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 3000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 12)));
  const loanAprPercent = Math.max(0, safeNumber(values.loanAprPercent, 24));
  const loanFeePercent = Math.max(0, safeNumber(values.loanFeePercent, 5));
  const cashAdvanceAprPercent = Math.max(0, safeNumber(values.cashAdvanceAprPercent, 29.99));
  const cashAdvanceFeePercent = Math.max(0, safeNumber(values.cashAdvanceFeePercent, 5));
  const lostReturnPercent = Math.max(0, safeNumber(values.lostReturnPercent, 7));

  const loan = interestOver(amount, loanAprPercent, months) + (amount * loanFeePercent) / 100;
  const advance = interestOver(amount, cashAdvanceAprPercent, months) + (amount * cashAdvanceFeePercent) / 100;
  // A 401(k) loan's interest goes back into your own account; the real cost is the
  // investment growth missed on the money while it's out (about half, on average,
  // as it's repaid evenly).
  const k401 = (amount * lostReturnPercent * months) / 1200 / 2;

  return {
    personalLoanCost: round2(loan),
    cashAdvanceCost: round2(advance),
    retirementLoanCost: round2(k401),
    savingsLoanVsCashAdvance: round2(advance - loan),
  };
};

// --- 14. Emergency Loan Eligibility Calculator ---------------------------------------------
export const emergencyLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 620)));
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 3200));
  const monthlyDebts = Math.max(0, safeNumber(values.monthlyDebts, 700));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 2000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 24));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const hasDebitAccount = Math.round(safeNumber(values.hasDebitAccount, 1)) === 1;

  const pmt = payment(loanAmount, aprPercent / 100 / 12, termMonths);
  const dti = monthlyIncome > 0 ? ((monthlyDebts + pmt) / monthlyIncome) * 100 : 0;
  let passed = 0;
  if (creditScore >= 600) passed++;
  if (monthlyIncome >= 1500) passed++;
  if (monthlyIncome > 0 && dti <= 40) passed++;
  if (hasDebitAccount) passed++;

  return {
    monthlyPayment: round2(pmt),
    dtiWithLoan: round2(dti),
    checksPassed: passed,
  };
};

export const loanBadCreditEmergencyCustomCalculators: Record<string, CustomCalculator> = {
  "bad-credit-loan-calculator": badCreditLoanCalculator,
  "bad-credit-loan-payment-calculator": badCreditLoanPaymentCalculator,
  "bad-credit-loan-payoff-calculator": badCreditLoanPayoffCalculator,
  "bad-credit-loan-interest-calculator": badCreditLoanInterestCalculator,
  "bad-credit-loan-affordability-calculator": badCreditLoanAffordabilityCalculator,
  "bad-credit-loan-comparison-calculator": badCreditLoanComparisonCalculator,
  "bad-credit-loan-eligibility-calculator": badCreditLoanEligibilityCalculator,
  "emergency-loan-calculator": emergencyLoanCalculator,
  "emergency-loan-payment-calculator": emergencyLoanPaymentCalculator,
  "emergency-loan-payoff-calculator": emergencyLoanPayoffCalculator,
  "emergency-loan-interest-calculator": emergencyLoanInterestCalculator,
  "emergency-loan-affordability-calculator": emergencyLoanAffordabilityCalculator,
  "emergency-loan-comparison-calculator": emergencyLoanComparisonCalculator,
  "emergency-loan-eligibility-calculator": emergencyLoanEligibilityCalculator,
};
