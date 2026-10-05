/**
 * Batch: "Loan Calculators" expansion 2 (3 Oct 2026), sub-batch 5 of 8 —
 * Cosigned & Joint Loans (14 tools), filed under Loan Calculators > General
 * Loan Calculators (they apply to any kind of loan). See calc-engine-loan-
 * life-events.ts for the full batch context.
 *
 * A COSIGNER guarantees someone else's loan; JOINT borrowers share one loan
 * and its money. The tools model each side:
 *  - cosignedLoan: how much more you can borrow (and at what rate) once the
 *    cosigner's income and debts are counted.
 *  - cosignedLoanPayment: the cosigner's side — their DTI with the payment
 *    counted, and the balance they'd owe if payments stop.
 *  - cosignedLoanPayoff: cosigner release after N on-time payments.
 *  - cosignedLoanInterest: interest at your own rate vs the cosigned rate.
 *  - cosignedLoanAffordability: the largest loan a cosigner can guarantee
 *    while staying under a DTI limit.
 *  - cosignedLoanComparison: go alone vs cosigner vs a savings-secured loan.
 *  - cosignedLoanEligibility: borrower and cosigner each checked.
 *  - jointLoan: borrowing power alone vs together.
 *  - jointLoanPayment: an agreed split, and one partner's DTI if they had to
 *    pay it all.
 *  - jointLoanPayoff: one partner taking the loan over (refinancing into one
 *    name) part-way through.
 *  - jointLoanInterest: interest split by each person's share.
 *  - jointLoanAffordability: what each can contribute -> the joint loan.
 *  - jointLoanComparison: one joint loan vs two separate loans at each
 *    person's own rate.
 *  - jointLoanEligibility: each alone vs together, and the score gap.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-cosigned-joint-calculators.ts for the copy.
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
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

function payDown(balance: number, i: number, pay: number, maxMonths = 1200): { months: number; interest: number } {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (pay <= balance * i + 1e-9) return { months: -1, interest: 0 };
  let b = balance;
  let interest = 0;
  let months = 0;
  while (b > 1e-9 && months < maxMonths) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pay, b + int);
    months++;
  }
  return { months, interest };
}

const dti = (debts: number, income: number) => (income > 0 ? (debts / income) * 100 : 0);
const score = (v: number, d: number) => Math.max(300, Math.min(850, safeNumber(v, d)));

// --- 1. Cosigned Loan Calculator (borrowing power with a cosigner) -----------
export const cosignedLoanCalculator: CustomCalculator = (values) => {
  const borrowerIncome = Math.max(0, safeNumber(values.borrowerIncome, 3200));
  const borrowerDebts = Math.max(0, safeNumber(values.borrowerDebts, 900));
  const cosignerIncome = Math.max(0, safeNumber(values.cosignerIncome, 7000));
  const cosignerDebts = Math.max(0, safeNumber(values.cosignerDebts, 2000));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const rateAlonePercent = Math.max(0, safeNumber(values.rateAlonePercent, 22));
  const rateCosignedPercent = Math.max(0, safeNumber(values.rateCosignedPercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const roomAlone = Math.max(0, (borrowerIncome * maxDtiPercent) / 100 - borrowerDebts);
  const roomTogether = Math.max(0, ((borrowerIncome + cosignerIncome) * maxDtiPercent) / 100 - borrowerDebts - cosignerDebts);
  const alone = presentValue(roomAlone, rateAlonePercent / 100 / 12, termMonths);
  const together = presentValue(roomTogether, rateCosignedPercent / 100 / 12, termMonths);

  return {
    maxPaymentAlone: round2(roomAlone),
    maxLoanAlone: round2(alone),
    maxPaymentWithCosigner: round2(roomTogether),
    maxLoanWithCosigner: round2(together),
    extraBorrowingPower: round2(together - alone),
  };
};

// --- 2. Cosigned Loan Payment Calculator (the cosigner's exposure) -----------
export const cosignedLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const cosignerIncome = Math.max(0, safeNumber(values.cosignerIncome, 7000));
  const cosignerDebts = Math.max(0, safeNumber(values.cosignerDebts, 2000));
  const monthsBeforeMissed = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsBeforeMissed, 18))));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);

  return {
    monthlyPayment: round2(pmt),
    cosignerDtiBefore: round2(dti(cosignerDebts, cosignerIncome)),
    cosignerDtiAfter: round2(dti(cosignerDebts + pmt, cosignerIncome)),
    balanceIfPaymentsStop: round2(balanceAfter(loanAmount, i, pmt, monthsBeforeMissed)),
    paymentsLeftForCosigner: termMonths - monthsBeforeMissed,
  };
};

// --- 3. Cosigned Loan Payoff Calculator (cosigner release) -------------------
export const cosignedLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const paymentsForRelease = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.paymentsForRelease, 24))));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const base = pmt * termMonths - loanAmount;
  const faster = payDown(loanAmount, i, pmt + extraMonthly);

  return {
    monthlyPayment: round2(pmt),
    balanceAtRelease: round2(balanceAfter(loanAmount, i, pmt, paymentsForRelease)),
    monthsToPayoffWithExtra: Math.max(0, faster.months),
    interestSavedWithExtra: round2(base - Math.max(0, faster.interest)),
  };
};

// --- 4. Cosigned Loan Interest Calculator ------------------------------------
export const cosignedLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const rateAlonePercent = Math.max(0, safeNumber(values.rateAlonePercent, 22));
  const rateCosignedPercent = Math.max(0, safeNumber(values.rateCosignedPercent, 12));

  const a = payment(loanAmount, rateAlonePercent / 100 / 12, termMonths);
  const c = payment(loanAmount, rateCosignedPercent / 100 / 12, termMonths);

  return {
    paymentAlone: round2(a),
    paymentCosigned: round2(c),
    interestAlone: round2(a * termMonths - loanAmount),
    interestCosigned: round2(c * termMonths - loanAmount),
    interestSaved: round2((a - c) * termMonths),
  };
};

// --- 5. Cosigned Loan Affordability Calculator (for the cosigner) ------------
export const cosignedLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const cosignerIncome = Math.max(0, safeNumber(values.cosignerIncome, 7000));
  const cosignerDebts = Math.max(0, safeNumber(values.cosignerDebts, 2000));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 43));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const room = Math.max(0, (cosignerIncome * maxDtiPercent) / 100 - cosignerDebts);

  return {
    cosignerDtiNow: round2(dti(cosignerDebts, cosignerIncome)),
    maxPaymentToGuarantee: round2(room),
    maxLoanToCosign: round2(presentValue(room, annualRatePercent / 100 / 12, termMonths)),
  };
};

// --- 6. Cosigned Loan Comparison Calculator (alone vs cosigner vs secured) ---
export const cosignedLoanComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const rateAlonePercent = Math.max(0, safeNumber(values.rateAlonePercent, 24));
  const rateCosignedPercent = Math.max(0, safeNumber(values.rateCosignedPercent, 12));
  const rateSecuredPercent = Math.max(0, safeNumber(values.rateSecuredPercent, 8));
  const savingsApyPercent = Math.max(0, safeNumber(values.savingsApyPercent, 4));

  const interest = (r: number) => payment(loanAmount, r / 100 / 12, termMonths) * termMonths - loanAmount;
  // A savings-secured loan pledges savings equal to the loan, which keep
  // earning interest while pledged.
  const earned = loanAmount * (Math.pow(1 + savingsApyPercent / 100, termMonths / 12) - 1);

  return {
    interestAlone: round2(interest(rateAlonePercent)),
    interestCosigned: round2(interest(rateCosignedPercent)),
    interestSecured: round2(interest(rateSecuredPercent)),
    savingsInterestEarned: round2(earned),
    securedNetCost: round2(interest(rateSecuredPercent) - earned),
  };
};

// --- 7. Cosigned Loan Eligibility Calculator ---------------------------------
export const cosignedLoanEligibilityCalculator: CustomCalculator = (values) => {
  const borrowerScore = score(values.borrowerScore, 600);
  const cosignerScore = score(values.cosignerScore, 740);
  const lenderMinScore = score(values.lenderMinScore, 660);
  const borrowerIncome = Math.max(0, safeNumber(values.borrowerIncome, 3200));
  const borrowerDebts = Math.max(0, safeNumber(values.borrowerDebts, 900));
  const cosignerIncome = Math.max(0, safeNumber(values.cosignerIncome, 7000));
  const cosignerDebts = Math.max(0, safeNumber(values.cosignerDebts, 2000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const cosignerDti = dti(cosignerDebts + pmt, cosignerIncome);

  return {
    monthlyPayment: round2(pmt),
    borrowerDtiPercent: round2(dti(borrowerDebts + pmt, borrowerIncome)),
    cosignerDtiPercent: round2(cosignerDti),
    cosignerDtiHeadroom: round2(maxDtiPercent - cosignerDti),
    borrowerScoreMargin: Math.round(borrowerScore - lenderMinScore),
    cosignerScoreMargin: Math.round(cosignerScore - lenderMinScore),
  };
};

// --- 8. Joint Loan Calculator (borrowing power alone vs together) ------------
export const jointLoanCalculator: CustomCalculator = (values) => {
  const income1 = Math.max(0, safeNumber(values.income1, 5000));
  const income2 = Math.max(0, safeNumber(values.income2, 4000));
  const debts1 = Math.max(0, safeNumber(values.debts1, 1200));
  const debts2 = Math.max(0, safeNumber(values.debts2, 600));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const i = annualRatePercent / 100 / 12;
  const d = maxDtiPercent / 100;
  const one = presentValue(Math.max(0, income1 * d - debts1), i, termMonths);
  const two = presentValue(Math.max(0, income2 * d - debts2), i, termMonths);
  const joint = presentValue(Math.max(0, (income1 + income2) * d - debts1 - debts2), i, termMonths);

  return {
    maxLoanPerson1: round2(one),
    maxLoanPerson2: round2(two),
    maxLoanJoint: round2(joint),
    extraVsHigherAlone: round2(joint - Math.max(one, two)),
  };
};

// --- 9. Joint Loan Payment Calculator (agreed split) -------------------------
export const jointLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const person1SharePercent = Math.min(100, Math.max(0, safeNumber(values.person1SharePercent, 60)));
  const person1Income = Math.max(0, safeNumber(values.person1Income, 5000));
  const person1Debts = Math.max(0, safeNumber(values.person1Debts, 1200));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const s = person1SharePercent / 100;

  return {
    monthlyPayment: round2(pmt),
    person1Payment: round2(pmt * s),
    person2Payment: round2(pmt * (1 - s)),
    person1DtiIfPayingAll: round2(dti(person1Debts + pmt, person1Income)),
  };
};

// --- 10. Joint Loan Payoff Calculator (one partner takes it over) ------------
export const jointLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthsPaid = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsPaid, 24))));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 13));
  const keeperIncome = Math.max(0, safeNumber(values.keeperIncome, 5000));
  const keeperDebts = Math.max(0, safeNumber(values.keeperDebts, 1200));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const bal = balanceAfter(loanAmount, i, pmt, monthsPaid);
  const left = termMonths - monthsPaid;
  const solo = payment(bal, newRatePercent / 100 / 12, Math.max(1, left));

  return {
    payoffBalanceNow: round2(bal),
    halfOfBalance: round2(bal / 2),
    currentPayment: round2(pmt),
    soloRefinancePayment: round2(solo),
    keeperDtiAfter: round2(dti(keeperDebts + solo, keeperIncome)),
  };
};

// --- 11. Joint Loan Interest Calculator (split by share) ---------------------
export const jointLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const person1SharePercent = Math.min(100, Math.max(0, safeNumber(values.person1SharePercent, 60)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const total = pmt * termMonths - loanAmount;
  const n1 = Math.min(12, termMonths);
  const y1 = pmt * n1 - (loanAmount - balanceAfter(loanAmount, i, pmt, n1));
  const s = person1SharePercent / 100;

  return {
    totalInterest: round2(total),
    person1Interest: round2(total * s),
    person2Interest: round2(total * (1 - s)),
    year1Interest: round2(y1),
    year1Person1: round2(y1 * s),
  };
};

// --- 12. Joint Loan Affordability Calculator ---------------------------------
export const jointLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const contribution1 = Math.max(0, safeNumber(values.contribution1, 400));
  const contribution2 = Math.max(0, safeNumber(values.contribution2, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const combined = contribution1 + contribution2;
  const maxLoan = presentValue(combined, annualRatePercent / 100 / 12, termMonths);

  return {
    combinedPayment: round2(combined),
    maxLoanAmount: round2(maxLoan),
    person1SharePercent: combined > 0 ? round2((contribution1 / combined) * 100) : 0,
    totalInterest: round2(combined * termMonths - maxLoan),
  };
};

// --- 13. Joint Loan Comparison Calculator (joint vs two separate loans) ------
export const jointLoanComparisonCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 30000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const jointRatePercent = Math.max(0, safeNumber(values.jointRatePercent, 10));
  const rate1Percent = Math.max(0, safeNumber(values.rate1Percent, 11));
  const rate2Percent = Math.max(0, safeNumber(values.rate2Percent, 16));

  const j = payment(amount, jointRatePercent / 100 / 12, termMonths);
  const p1 = payment(amount / 2, rate1Percent / 100 / 12, termMonths);
  const p2 = payment(amount / 2, rate2Percent / 100 / 12, termMonths);

  return {
    jointPayment: round2(j),
    separatePaymentsTotal: round2(p1 + p2),
    jointInterest: round2(j * termMonths - amount),
    separateInterest: round2((p1 + p2) * termMonths - amount),
    jointSaves: round2((p1 + p2 - j) * termMonths),
  };
};

// --- 14. Joint Loan Eligibility Calculator -----------------------------------
export const jointLoanEligibilityCalculator: CustomCalculator = (values) => {
  const score1 = score(values.score1, 720);
  const score2 = score(values.score2, 640);
  const lenderMinScore = score(values.lenderMinScore, 660);
  const income1 = Math.max(0, safeNumber(values.income1, 5000));
  const income2 = Math.max(0, safeNumber(values.income2, 4000));
  const debts1 = Math.max(0, safeNumber(values.debts1, 1200));
  const debts2 = Math.max(0, safeNumber(values.debts2, 600));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const joint = dti(debts1 + debts2 + pmt, income1 + income2);

  return {
    monthlyPayment: round2(pmt),
    person1AloneDti: round2(dti(debts1 + pmt, income1)),
    person2AloneDti: round2(dti(debts2 + pmt, income2)),
    jointDti: round2(joint),
    jointDtiHeadroom: round2(maxDtiPercent - joint),
    lowerScoreMargin: Math.round(Math.min(score1, score2) - lenderMinScore),
    scoreGap: Math.round(Math.abs(score1 - score2)),
  };
};

export const loanCosignedJointCustomCalculators: Record<string, CustomCalculator> = {
  "cosigned-loan-calculator": cosignedLoanCalculator,
  "cosigned-loan-payment-calculator": cosignedLoanPaymentCalculator,
  "cosigned-loan-payoff-calculator": cosignedLoanPayoffCalculator,
  "cosigned-loan-interest-calculator": cosignedLoanInterestCalculator,
  "cosigned-loan-affordability-calculator": cosignedLoanAffordabilityCalculator,
  "cosigned-loan-comparison-calculator": cosignedLoanComparisonCalculator,
  "cosigned-loan-eligibility-calculator": cosignedLoanEligibilityCalculator,
  "joint-loan-calculator": jointLoanCalculator,
  "joint-loan-payment-calculator": jointLoanPaymentCalculator,
  "joint-loan-payoff-calculator": jointLoanPayoffCalculator,
  "joint-loan-interest-calculator": jointLoanInterestCalculator,
  "joint-loan-affordability-calculator": jointLoanAffordabilityCalculator,
  "joint-loan-comparison-calculator": jointLoanComparisonCalculator,
  "joint-loan-eligibility-calculator": jointLoanEligibilityCalculator,
};
