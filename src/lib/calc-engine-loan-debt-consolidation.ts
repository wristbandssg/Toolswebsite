/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 1 of 10 —
 * Debt Consolidation Loans (12 tools). The user's 101-tool loan list was
 * checked against every existing slug: no exact duplicates, but
 * "Debt Consolidation Loan Calculator" is the same tool as the existing
 * debt-consolidation-calculator (Credit & Debt) and "Debt Consolidation
 * Loan Consolidation Calculator" repeats it again, so both were skipped;
 * "Home Improvement Loan Consolidation Calculator" was dropped as too vague.
 * 98 tools were built across 10 sub-batches:
 *  - calc-engine-loan-debt-consolidation.ts (this file) -> Personal Loan Calculators
 *  - calc-engine-loan-medical-dental.ts                  -> Personal Loan Calculators
 *  - calc-engine-loan-wedding-vacation.ts                -> Personal Loan Calculators
 *  - calc-engine-loan-home-improvement.ts                -> Home Improvement Loan Calculators
 *  - calc-engine-loan-renovation-timeshare.ts            -> Home Improvement Loan Calculators
 *  - calc-engine-loan-solar.ts                           -> Home Improvement Loan Calculators
 *  - calc-engine-loan-high-cost.ts                       -> Short-Term & High-Cost Loan Calculators
 *  - calc-engine-loan-motorcycle.ts                      -> Auto & Vehicle Loan Calculators
 *  - calc-engine-loan-boat.ts                            -> Auto & Vehicle Loan Calculators
 *  - calc-engine-loan-rv.ts                              -> Auto & Vehicle Loan Calculators
 *
 * Near-namesakes in this file, and what makes each one different:
 *  - payment: adds up to 3 debts, grosses the loan up for an origination
 *    fee taken out of the proceeds, and compares the new payment with what
 *    you pay on those debts today.
 *  - payoff: months until debt-free with the loan (plus an optional extra
 *    monthly payment) vs keeping today's payment on today's debts.
 *  - refinance: replacing an existing consolidation loan, fee rolled into
 *    the new balance, with a break-even month.
 *  - apr: the true APR once a deducted origination fee is counted, against
 *    the card APR you are escaping.
 *  - affordability: the largest loan a DTI limit allows, and how much of
 *    your debt it would cover.
 *  - eligibility: DTI before and after (the consolidated payments are
 *    replaced by the new one) and credit-score margin over a lender minimum.
 *  - interest: monthly interest "burn" today vs month 1 on the loan.
 *  - early payoff: a lump sum and extra monthly part-way through the loan,
 *    net of any prepayment penalty.
 *  - comparison: consolidation loan vs a 0% balance-transfer card.
 *  - amortization: year-by-year balance, the interest share of payment 1,
 *    and the month the balance falls to half.
 *  - prequalification: the payment/cost RANGE across a prequalified APR
 *    range, and whether the worst case fits your budget.
 *  - total cost: interest + fee + monthly add-ons, vs today's path.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-debt-consolidation-calculators.ts for the copy.
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

function balanceAfter(principal: number, i: number, pmt: number, k: number): number {
  if (k <= 0) return principal;
  if (i === 0) return Math.max(0, principal - pmt * k);
  const g = Math.pow(1 + i, k);
  return Math.max(0, principal * g - (pmt * (g - 1)) / i);
}

// Pays `pmt` a month (plus `extra`) until the balance is gone. Returns the
// number of months and total interest; months = -1 if the payment never
// covers the interest.
function payDown(balance: number, i: number, pmt: number, extra = 0, maxMonths = 1200): { months: number; interest: number } {
  const pay = pmt + extra;
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

// --- 1. Debt Consolidation Loan Payment Calculator ---------------------------
export const debtConsolidationLoanPaymentCalculator: CustomCalculator = (values) => {
  const debt1 = Math.max(0, safeNumber(values.debt1, 0));
  const debt2 = Math.max(0, safeNumber(values.debt2, 0));
  const debt3 = Math.max(0, safeNumber(values.debt3, 0));
  const currentMonthlyPayments = Math.max(0, safeNumber(values.currentMonthlyPayments, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));

  const totalDebt = debt1 + debt2 + debt3;
  // Fee is taken out of the proceeds, so borrow enough to still clear every debt.
  const loanAmount = totalDebt / (1 - originationFeePercent / 100);
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);

  return {
    totalDebt: round2(totalDebt),
    loanAmount: round2(loanAmount),
    originationFee: round2(loanAmount - totalDebt),
    monthlyPayment: round2(pmt),
    monthlyPaymentChange: round2(currentMonthlyPayments - pmt),
  };
};

// --- 2. Debt Consolidation Loan Payoff Calculator ----------------------------
export const debtConsolidationLoanPayoffCalculator: CustomCalculator = (values) => {
  const totalDebt = Math.max(0, safeNumber(values.totalDebt, 20000));
  const currentAprPercent = Math.max(0, safeNumber(values.currentAprPercent, 22));
  const currentMonthlyPayment = Math.max(0, safeNumber(values.currentMonthlyPayment, 600));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 0));

  const now = payDown(totalDebt, currentAprPercent / 100 / 12, currentMonthlyPayment);
  const i = loanRatePercent / 100 / 12;
  const loanPmt = payment(totalDebt, i, loanTermMonths);
  const loan = payDown(totalDebt, i, loanPmt, extraMonthly);
  const neverPaysOff = now.months < 0;

  return {
    monthsToPayoffNow: neverPaysOff ? 0 : now.months,
    loanPayment: round2(loanPmt),
    monthsToPayoffWithLoan: loan.months,
    monthsSooner: neverPaysOff ? 0 : now.months - loan.months,
    interestSaved: neverPaysOff ? 0 : round2(now.interest - loan.interest),
  };
};

// --- 3. Debt Consolidation Loan Refinance Calculator -------------------------
export const debtConsolidationLoanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 15000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 16));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 36)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 10));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 36)));
  const newFeePercent = Math.min(50, Math.max(0, safeNumber(values.newFeePercent, 0)));
  const prepaymentPenalty = Math.max(0, safeNumber(values.prepaymentPenalty, 0));

  const currentPmt = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  // The new loan must clear the old balance and any penalty after its own fee.
  const newLoanAmount = (currentBalance + prepaymentPenalty) / (1 - newFeePercent / 100);
  const newPmt = payment(newLoanAmount, newRatePercent / 100 / 12, newTermMonths);
  const monthlySavings = currentPmt - newPmt;
  const upfrontCost = newLoanAmount - currentBalance;

  return {
    currentPayment: round2(currentPmt),
    newLoanAmount: round2(newLoanAmount),
    newPayment: round2(newPmt),
    monthlySavings: round2(monthlySavings),
    netSavings: round2(currentPmt * remainingMonths - newPmt * newTermMonths),
    breakEvenMonths: monthlySavings > 0 ? Math.ceil(upfrontCost / monthlySavings) : 0,
  };
};

// --- 4. Debt Consolidation Loan APR Calculator -------------------------------
export const debtConsolidationLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));
  const currentCardAprPercent = Math.max(0, safeNumber(values.currentCardAprPercent, 22));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const fee = (loanAmount * originationFeePercent) / 100;
  const cashReceived = loanAmount - fee;
  const apr = fee > 0 ? solvePeriodicRate(cashReceived, pmt, termMonths) * 12 * 100 : annualRatePercent;

  return {
    aprPercent: round2(apr),
    originationFee: round2(fee),
    cashReceived: round2(cashReceived),
    monthlyPayment: round2(pmt),
    aprBelowCardsPercent: round2(currentCardAprPercent - apr),
  };
};

// --- 5. Debt Consolidation Loan Affordability Calculator ---------------------
export const debtConsolidationLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 6000));
  const housingPayment = Math.max(0, safeNumber(values.housingPayment, 1500));
  const otherDebtPayments = Math.max(0, safeNumber(values.otherDebtPayments, 0));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const debtToConsolidate = Math.max(0, safeNumber(values.debtToConsolidate, 25000));

  // The consolidated debts' old payments disappear, so the new payment can
  // use whatever room is left under the DTI limit after housing + other debt.
  const maxPayment = Math.max(0, (grossMonthlyIncome * maxDtiPercent) / 100 - housingPayment - otherDebtPayments);
  const maxLoan = presentValue(maxPayment, annualRatePercent / 100 / 12, termMonths);

  return {
    maxMonthlyPayment: round2(maxPayment),
    maxLoanAmount: round2(maxLoan),
    debtCoveredPercent: debtToConsolidate > 0 ? round2(Math.min(100, (maxLoan / debtToConsolidate) * 100)) : 0,
    shortfall: round2(Math.max(0, debtToConsolidate - maxLoan)),
  };
};

// --- 6. Debt Consolidation Loan Eligibility Calculator -----------------------
export const debtConsolidationLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 680)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 640)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 5500));
  const housingPayment = Math.max(0, safeNumber(values.housingPayment, 1400));
  const paymentsBeingConsolidated = Math.max(0, safeNumber(values.paymentsBeingConsolidated, 700));
  const otherDebtPayments = Math.max(0, safeNumber(values.otherDebtPayments, 0));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 18000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 40));

  const newPmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const dtiBefore = ((housingPayment + paymentsBeingConsolidated + otherDebtPayments) / grossMonthlyIncome) * 100;
  const dtiAfter = ((housingPayment + newPmt + otherDebtPayments) / grossMonthlyIncome) * 100;

  return {
    newPayment: round2(newPmt),
    dtiBeforePercent: round2(dtiBefore),
    dtiAfterPercent: round2(dtiAfter),
    dtiHeadroomPercent: round2(maxDtiPercent - dtiAfter),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

// --- 7. Debt Consolidation Loan Interest Calculator --------------------------
export const debtConsolidationLoanInterestCalculator: CustomCalculator = (values) => {
  const totalDebt = Math.max(0, safeNumber(values.totalDebt, 20000));
  const currentAprPercent = Math.max(0, safeNumber(values.currentAprPercent, 22));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));

  const currentMonthlyInterest = (totalDebt * currentAprPercent) / 100 / 12;
  const i = loanRatePercent / 100 / 12;
  const pmt = payment(totalDebt, i, termMonths);
  const loanFirstMonthInterest = totalDebt * i;
  const loanTotalInterest = pmt * termMonths - totalDebt;

  return {
    currentMonthlyInterest: round2(currentMonthlyInterest),
    loanFirstMonthInterest: round2(loanFirstMonthInterest),
    monthlyInterestDrop: round2(currentMonthlyInterest - loanFirstMonthInterest),
    loanTotalInterest: round2(loanTotalInterest),
    interestPerDollar: totalDebt > 0 ? Math.round((loanTotalInterest / totalDebt) * 1000) / 1000 : 0,
  };
};

// --- 8. Debt Consolidation Loan Early Payoff Calculator ----------------------
export const debtConsolidationLoanEarlyPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthsPaid = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.monthsPaid, 12))));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 0));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 0));
  const prepaymentPenaltyPercent = Math.max(0, safeNumber(values.prepaymentPenaltyPercent, 0));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const balance = balanceAfter(loanAmount, i, pmt, monthsPaid);
  const monthsLeft = termMonths - monthsPaid;
  const interestIfKept = pmt * monthsLeft - balance;

  const lump = Math.min(lumpSum, balance);
  const after = payDown(balance - lump, i, pmt, extraMonthly);
  const penalty = (lump * prepaymentPenaltyPercent) / 100;
  const interestSaved = interestIfKept - after.interest;

  return {
    currentBalance: round2(balance),
    newMonthsLeft: Math.max(0, after.months),
    monthsSaved: monthsLeft - Math.max(0, after.months),
    interestSaved: round2(interestSaved),
    prepaymentPenalty: round2(penalty),
    netSavings: round2(interestSaved - penalty),
  };
};

// --- 9. Debt Consolidation Loan Comparison Calculator (loan vs 0% card) ------
export const debtConsolidationLoanComparisonCalculator: CustomCalculator = (values) => {
  const totalDebt = Math.max(0, safeNumber(values.totalDebt, 12000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 12));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 36)));
  const loanFeePercent = Math.min(50, Math.max(0, safeNumber(values.loanFeePercent, 0)));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 18)));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 24));

  const loanAmount = totalDebt / (1 - loanFeePercent / 100);
  const loanPmt = payment(loanAmount, loanRatePercent / 100 / 12, loanTermMonths);
  const loanTotalCost = loanPmt * loanTermMonths - totalDebt;

  // The card is paid at the same monthly amount: 0% for the promo months,
  // then the card's normal APR on whatever is left.
  const cardStart = totalDebt * (1 + transferFeePercent / 100);
  const promoPaid = Math.min(cardStart, loanPmt * promoMonths);
  const promoMonthsUsed = loanPmt > 0 ? Math.min(promoMonths, Math.ceil(cardStart / loanPmt)) : 0;
  const leftAfterPromo = cardStart - promoPaid;
  const after = payDown(leftAfterPromo, cardAprPercent / 100 / 12, loanPmt);
  const cardTotalCost = cardStart - totalDebt + Math.max(0, after.interest);
  const cardMonths = leftAfterPromo > 0 ? promoMonths + Math.max(0, after.months) : promoMonthsUsed;

  return {
    loanPayment: round2(loanPmt),
    loanTotalCost: round2(loanTotalCost),
    cardTotalCost: round2(cardTotalCost),
    cardMonthsToPayoff: after.months < 0 ? 0 : cardMonths,
    loanCostMinusCardCost: round2(loanTotalCost - cardTotalCost),
  };
};

// --- 10. Debt Consolidation Loan Amortization Calculator ---------------------
export const debtConsolidationLoanAmortizationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const y1 = balanceAfter(loanAmount, i, pmt, Math.min(12, termMonths));

  // Halfway: first month the balance is at or below half the loan.
  let halfway = 0;
  let b = loanAmount;
  for (let m = 1; m <= termMonths; m++) {
    b = Math.max(0, b * (1 + i) - pmt);
    if (!halfway && b <= loanAmount / 2 + 1e-9) halfway = m;
  }

  return {
    monthlyPayment: round2(pmt),
    year1Interest: round2(pmt * Math.min(12, termMonths) - (loanAmount - y1)),
    year1Principal: round2(loanAmount - y1),
    balanceAfterYear1: round2(y1),
    balanceAfterYear2: round2(balanceAfter(loanAmount, i, pmt, Math.min(24, termMonths))),
    balanceAfterYear3: round2(balanceAfter(loanAmount, i, pmt, Math.min(36, termMonths))),
    firstPaymentInterestPercent: pmt > 0 ? round2(((loanAmount * i) / pmt) * 100) : 0,
    halfwayMonth: halfway,
  };
};

// --- 11. Debt Consolidation Loan Prequalification Calculator -----------------
export const debtConsolidationLoanPrequalificationCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const aprLowPercent = Math.max(0, safeNumber(values.aprLowPercent, 9));
  const aprHighPercent = Math.max(aprLowPercent, safeNumber(values.aprHighPercent, 24));
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 450));

  const low = payment(loanAmount, aprLowPercent / 100 / 12, termMonths);
  const high = payment(loanAmount, aprHighPercent / 100 / 12, termMonths);

  return {
    paymentAtLowApr: round2(low),
    paymentAtHighApr: round2(high),
    interestAtLowApr: round2(low * termMonths - loanAmount),
    interestAtHighApr: round2(high * termMonths - loanAmount),
    budgetLeftAtHighApr: round2(monthlyBudget - high),
  };
};

// --- 12. Debt Consolidation Loan Total Cost Calculator -----------------------
export const debtConsolidationLoanTotalCostCalculator: CustomCalculator = (values) => {
  const totalDebt = Math.max(0, safeNumber(values.totalDebt, 20000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));
  const monthlyAddOns = Math.max(0, safeNumber(values.monthlyAddOns, 0));
  const currentAprPercent = Math.max(0, safeNumber(values.currentAprPercent, 22));
  const currentMonthlyPayment = Math.max(0, safeNumber(values.currentMonthlyPayment, 600));

  const loanAmount = totalDebt / (1 - originationFeePercent / 100);
  const fee = loanAmount - totalDebt;
  const pmt = payment(loanAmount, loanRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - loanAmount;
  const addOns = monthlyAddOns * termMonths;
  const loanCost = interest + fee + addOns;
  const now = payDown(totalDebt, currentAprPercent / 100 / 12, currentMonthlyPayment);

  return {
    totalInterest: round2(interest),
    originationFee: round2(fee),
    addOnCosts: round2(addOns),
    loanTotalCost: round2(loanCost),
    currentPathInterest: now.months < 0 ? 0 : round2(now.interest),
    savingsVsCurrentPath: now.months < 0 ? 0 : round2(now.interest - loanCost),
  };
};

export const loanDebtConsolidationCustomCalculators: Record<string, CustomCalculator> = {
  "debt-consolidation-loan-payment-calculator": debtConsolidationLoanPaymentCalculator,
  "debt-consolidation-loan-payoff-calculator": debtConsolidationLoanPayoffCalculator,
  "debt-consolidation-loan-refinance-calculator": debtConsolidationLoanRefinanceCalculator,
  "debt-consolidation-loan-apr-calculator": debtConsolidationLoanAprCalculator,
  "debt-consolidation-loan-affordability-calculator": debtConsolidationLoanAffordabilityCalculator,
  "debt-consolidation-loan-eligibility-calculator": debtConsolidationLoanEligibilityCalculator,
  "debt-consolidation-loan-interest-calculator": debtConsolidationLoanInterestCalculator,
  "debt-consolidation-loan-early-payoff-calculator": debtConsolidationLoanEarlyPayoffCalculator,
  "debt-consolidation-loan-comparison-calculator": debtConsolidationLoanComparisonCalculator,
  "debt-consolidation-loan-amortization-calculator": debtConsolidationLoanAmortizationCalculator,
  "debt-consolidation-loan-prequalification-calculator": debtConsolidationLoanPrequalificationCalculator,
  "debt-consolidation-loan-total-cost-calculator": debtConsolidationLoanTotalCostCalculator,
};
