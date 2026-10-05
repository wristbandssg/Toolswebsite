/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 10 of 10 —
 * Debt Settlement Loans (7) and Balance Transfer Loans (7), filed under
 * Credit & Debt Calculators (next to credit-card-payoff and the debt
 * consolidation tools). See calc-engine-loan-startup-business.ts for the
 * full batch context.
 *
 * Debt settlement — paying creditors less than the full balance, either
 * with a lump-sum loan or through a settlement company's program (fees are
 * often 15%-25% of enrolled debt). Forgiven debt of $600+ is generally
 * reported on Form 1099-C and taxable unless you're insolvent:
 *  - debtSettlementLoan: settle with a loan — payment, forgiven debt, tax.
 *  - debtSettlementLoanPayment: a settlement program's monthly deposit.
 *  - debtSettlementLoanPayoff: settling now vs paying the debt in full.
 *  - debtSettlementLoanInterest: interest piling up on unpaid debts while
 *    you save in a program vs settling now with a loan.
 *  - debtSettlementLoanAffordability: budget -> loan -> debt you can settle.
 *  - debtSettlementLoanComparison: settlement program vs a consolidation
 *    loan.
 *  - debtSettlementLoanEligibility: program minimum, hardship, unsecured
 *    debt, and the insolvency exclusion for forgiven debt.
 * Balance transfers — moving card debt to a 0% intro card for a fee:
 *  - balanceTransferLoan: transfer vs staying put, to payoff.
 *  - balanceTransferLoanPayment: the payment that clears it in the promo.
 *  - balanceTransferLoanPayoff: months to payoff and the balance when the
 *    promo ends at your payment.
 *  - balanceTransferLoanInterest: interest avoided in the promo vs the fee,
 *    and the break-even month.
 *  - balanceTransferLoanAffordability: how much fits the new card's limit
 *    after the fee.
 *  - balanceTransferLoanComparison: transfer card vs a personal loan.
 *  - balanceTransferLoanEligibility: score, utilization, recent inquiries.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-credit-debt-settlement-transfer-calculators.ts for the copy.
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

/**
 * Pays `pmt` a month on a balance at 0% for `promoMonths`, then at `apr`.
 * Returns months to payoff, interest paid, and the balance when the promo ends.
 */
function promoRepay(balance: number, pmt: number, promoMonths: number, aprPercent: number) {
  let b = balance;
  let months = 0;
  let interest = 0;
  let atPromoEnd = promoMonths === 0 ? balance : 0;
  const r = aprPercent / 100 / 12;
  while (b > 0.005 && months < 600) {
    const int = months < promoMonths ? 0 : b * r;
    if (pmt <= int) return { months: 600, interest: interest + int * (600 - months), atPromoEnd: b };
    interest += int;
    b = b + int - Math.min(pmt, b + int);
    months++;
    if (months === promoMonths) atPromoEnd = b;
  }
  return { months, interest, atPromoEnd };
}

// --- 1. Debt Settlement Loan Calculator ---------------------------------------------------
export const debtSettlementLoanCalculator: CustomCalculator = (values) => {
  const debt = Math.max(0, safeNumber(values.debt, 20000));
  const settlementPercent = Math.min(100, Math.max(0, safeNumber(values.settlementPercent, 50)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const taxRatePercent = Math.min(60, Math.max(0, safeNumber(values.taxRatePercent, 22)));

  const settle = (debt * settlementPercent) / 100;
  const forgiven = debt - settle;
  const pmt = payment(settle, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - settle;
  const tax = (forgiven * taxRatePercent) / 100;

  return {
    settlementAmount: round2(settle),
    debtForgiven: round2(forgiven),
    loanPayment: round2(pmt),
    loanInterest: round2(interest),
    taxOnForgivenDebt: round2(tax),
    totalCostToSettle: round2(settle + interest + tax),
  };
};

// --- 2. Debt Settlement Loan Payment Calculator (program deposit) ------------------------
export const debtSettlementLoanPaymentCalculator: CustomCalculator = (values) => {
  const enrolledDebt = Math.max(0, safeNumber(values.enrolledDebt, 25000));
  const settlementPercent = Math.min(100, Math.max(0, safeNumber(values.settlementPercent, 50)));
  const programFeePercent = Math.min(50, Math.max(0, safeNumber(values.programFeePercent, 20)));
  const months = Math.max(1, Math.round(safeNumber(values.months, 36)));

  const settlements = (enrolledDebt * settlementPercent) / 100;
  const fees = (enrolledDebt * programFeePercent) / 100;
  const total = settlements + fees;

  return {
    totalSettlements: round2(settlements),
    programFees: round2(fees),
    monthlyDeposit: round2(total / months),
    totalPaid: round2(total),
    shareOfDebtPaid: round2(enrolledDebt > 0 ? (total / enrolledDebt) * 100 : 0),
  };
};

// --- 3. Debt Settlement Loan Payoff Calculator (settle vs pay in full) --------------------
export const debtSettlementLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 24));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 450));
  const settlementPercent = Math.min(100, Math.max(0, safeNumber(values.settlementPercent, 45)));
  const taxRatePercent = Math.min(60, Math.max(0, safeNumber(values.taxRatePercent, 22)));

  const full = repay(balance, aprPercent / 100 / 12, monthlyPayment);
  const settle = (balance * settlementPercent) / 100;
  const tax = ((balance - settle) * taxRatePercent) / 100;
  const fullTotal = balance + full.interest;

  return {
    monthsToPayInFull: full.months,
    interestPayingInFull: round2(full.interest),
    totalPayingInFull: round2(fullTotal),
    totalCostToSettle: round2(settle + tax),
    savingsWithSettlement: round2(fullTotal - settle - tax),
  };
};

// --- 4. Debt Settlement Loan Interest Calculator (accrual while saving) -------------------
export const debtSettlementLoanInterestCalculator: CustomCalculator = (values) => {
  const debt = Math.max(0, safeNumber(values.debt, 20000));
  const aprPercent = Math.max(0, safeNumber(values.aprPercent, 25));
  const monthsSaving = Math.max(0, Math.round(safeNumber(values.monthsSaving, 12)));
  const lateFeesPerMonth = Math.max(0, safeNumber(values.lateFeesPerMonth, 80));
  const settlementPercent = Math.min(100, Math.max(0, safeNumber(values.settlementPercent, 50)));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 15));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 36)));

  const grown = debt * Math.pow(1 + aprPercent / 100 / 12, monthsSaving) + lateFeesPerMonth * monthsSaving;
  const settleNow = (debt * settlementPercent) / 100;
  const settleLater = (grown * settlementPercent) / 100;
  const loanInterest = payment(settleNow, loanRatePercent / 100 / 12, loanTermMonths) * loanTermMonths - settleNow;

  return {
    debtAfterSaving: round2(grown),
    extraSettlementCostFromWaiting: round2(settleLater - settleNow),
    loanInterestToSettleNow: round2(loanInterest),
    savingsSettlingNowWithLoan: round2(settleLater - settleNow - loanInterest),
  };
};

// --- 5. Debt Settlement Loan Affordability Calculator --------------------------------------
export const debtSettlementLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const settlementPercent = Math.min(100, Math.max(1, safeNumber(values.settlementPercent, 50)));

  const loan = presentValue(monthlyBudget, annualRatePercent / 100 / 12, termMonths);

  return {
    maxLoanAmount: round2(loan),
    maxDebtYouCanSettle: round2(loan / (settlementPercent / 100)),
    totalRepaid: round2(monthlyBudget * termMonths),
  };
};

// --- 6. Debt Settlement Loan Comparison Calculator (settlement vs consolidation) ---------
export const debtSettlementLoanComparisonCalculator: CustomCalculator = (values) => {
  const debt = Math.max(0, safeNumber(values.debt, 20000));
  const settlementPercent = Math.min(100, Math.max(0, safeNumber(values.settlementPercent, 50)));
  const programFeePercent = Math.min(50, Math.max(0, safeNumber(values.programFeePercent, 20)));
  const taxRatePercent = Math.min(60, Math.max(0, safeNumber(values.taxRatePercent, 22)));
  const consolidationRatePercent = Math.max(0, safeNumber(values.consolidationRatePercent, 13));
  const consolidationTermMonths = Math.max(1, Math.round(safeNumber(values.consolidationTermMonths, 48)));
  const consolidationFeePercent = Math.min(20, Math.max(0, safeNumber(values.consolidationFeePercent, 5)));

  const settle = (debt * settlementPercent) / 100;
  const settlementTotal = settle + (debt * programFeePercent) / 100 + ((debt - settle) * taxRatePercent) / 100;
  const gross = debt / (1 - consolidationFeePercent / 100);
  const pmt = payment(gross, consolidationRatePercent / 100 / 12, consolidationTermMonths);
  const consolidationTotal = pmt * consolidationTermMonths;

  return {
    settlementTotalCost: round2(settlementTotal),
    consolidationPayment: round2(pmt),
    consolidationTotalCost: round2(consolidationTotal),
    savingsWithSettlement: round2(consolidationTotal - settlementTotal),
  };
};

// --- 7. Debt Settlement Loan Eligibility Calculator ----------------------------------------
export const debtSettlementLoanEligibilityCalculator: CustomCalculator = (values) => {
  const unsecuredDebt = Math.max(0, safeNumber(values.unsecuredDebt, 20000));
  const programMinimum = Math.max(0, safeNumber(values.programMinimum, 7500));
  const hardship = Math.round(safeNumber(values.hardship, 1)) === 1;
  const totalLiabilities = Math.max(0, safeNumber(values.totalLiabilities, 60000));
  const totalAssets = Math.max(0, safeNumber(values.totalAssets, 45000));
  const expectedForgiven = Math.max(0, safeNumber(values.expectedForgiven, 10000));

  const insolvency = Math.max(0, totalLiabilities - totalAssets);
  let passed = 0;
  if (unsecuredDebt >= programMinimum) passed++;
  if (hardship) passed++;
  if (unsecuredDebt > 0) passed++;

  return {
    insolvencyAmount: round2(insolvency),
    forgivenDebtExcluded: round2(Math.min(expectedForgiven, insolvency)),
    taxableForgivenDebt: round2(Math.max(0, expectedForgiven - insolvency)),
    checksPassed: passed,
  };
};

// --- 8. Balance Transfer Loan Calculator (transfer vs stay, to payoff) --------------------
export const balanceTransferLoanCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 8000));
  const currentAprPercent = Math.max(0, safeNumber(values.currentAprPercent, 24));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 18)));
  const postPromoAprPercent = Math.max(0, safeNumber(values.postPromoAprPercent, 22));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));

  const stay = repay(balance, currentAprPercent / 100 / 12, monthlyPayment);
  const fee = (balance * transferFeePercent) / 100;
  const move = promoRepay(balance + fee, monthlyPayment, promoMonths, postPromoAprPercent);

  return {
    transferFee: round2(fee),
    interestIfYouStay: round2(stay.interest),
    interestAfterTransfer: round2(move.interest),
    monthsToPayoffAfterTransfer: move.months,
    savingsWithTransfer: round2(stay.interest - move.interest - fee),
  };
};

// --- 9. Balance Transfer Loan Payment Calculator (clear it in the promo) -----------------
export const balanceTransferLoanPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 6000));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 15)));

  const total = balance * (1 + transferFeePercent / 100);

  return {
    transferFee: round2(total - balance),
    newCardBalance: round2(total),
    paymentToClearInPromo: round2(total / promoMonths),
    weeklyEquivalent: round2(((total / promoMonths) * 12) / 52),
  };
};

// --- 10. Balance Transfer Loan Payoff Calculator (at your payment) -----------------------
export const balanceTransferLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 9000));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 18)));
  const postPromoAprPercent = Math.max(0, safeNumber(values.postPromoAprPercent, 23));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 350));

  const total = balance * (1 + transferFeePercent / 100);
  const r = promoRepay(total, monthlyPayment, promoMonths, postPromoAprPercent);

  return {
    newCardBalance: round2(total),
    balanceWhenPromoEnds: round2(r.months <= promoMonths ? 0 : r.atPromoEnd),
    monthsToPayoff: r.months,
    interestAfterPromo: round2(r.interest),
  };
};

// --- 11. Balance Transfer Loan Interest Calculator (interest avoided vs fee) -------------
export const balanceTransferLoanInterestCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 8000));
  const currentAprPercent = Math.max(0, safeNumber(values.currentAprPercent, 24));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 18)));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));

  const r = currentAprPercent / 100 / 12;
  const fee = (balance * transferFeePercent) / 100;
  let b = balance;
  let avoided = 0;
  let breakEven = 0;
  for (let m = 1; m <= promoMonths && b > 0.005; m++) {
    const int = b * r;
    avoided += int;
    b = b + int - Math.min(monthlyPayment, b + int);
    if (breakEven === 0 && avoided >= fee) breakEven = m;
  }

  return {
    transferFee: round2(fee),
    interestAvoidedDuringPromo: round2(avoided),
    netInterestSavings: round2(avoided - fee),
    breakEvenMonth: breakEven,
  };
};

// --- 12. Balance Transfer Loan Affordability Calculator (fits the new limit) -------------
export const balanceTransferLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const creditLimit = Math.max(0, safeNumber(values.creditLimit, 7500));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 18)));
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 350));

  const maxByLimit = creditLimit / (1 + transferFeePercent / 100);
  const maxByBudget = (monthlyBudget * promoMonths) / (1 + transferFeePercent / 100);

  return {
    maxTransferByLimit: round2(maxByLimit),
    maxYouCanClearInPromo: round2(maxByBudget),
    recommendedTransfer: round2(Math.min(maxByLimit, maxByBudget)),
    feeOnRecommended: round2((Math.min(maxByLimit, maxByBudget) * transferFeePercent) / 100),
  };
};

// --- 13. Balance Transfer Loan Comparison Calculator (card vs personal loan) -------------
export const balanceTransferLoanComparisonCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 10000));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 400));
  const transferFeePercent = Math.max(0, safeNumber(values.transferFeePercent, 3));
  const promoMonths = Math.max(0, Math.round(safeNumber(values.promoMonths, 15)));
  const postPromoAprPercent = Math.max(0, safeNumber(values.postPromoAprPercent, 24));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 12));
  const loanFeePercent = Math.min(20, Math.max(0, safeNumber(values.loanFeePercent, 5)));

  const fee = (balance * transferFeePercent) / 100;
  const card = promoRepay(balance + fee, monthlyPayment, promoMonths, postPromoAprPercent);
  const gross = balance / (1 - loanFeePercent / 100);
  const loan = repay(gross, loanRatePercent / 100 / 12, monthlyPayment);
  const cardCost = fee + card.interest;
  const loanCost = gross - balance + loan.interest;

  return {
    cardTotalCost: round2(cardCost),
    cardMonthsToPayoff: card.months,
    loanTotalCost: round2(loanCost),
    loanMonthsToPayoff: loan.months,
    savingsWithTransferCard: round2(loanCost - cardCost),
  };
};

// --- 14. Balance Transfer Loan Eligibility Calculator --------------------------------------
export const balanceTransferLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 690)));
  const totalCardBalances = Math.max(0, safeNumber(values.totalCardBalances, 9000));
  const totalCardLimits = Math.max(0, safeNumber(values.totalCardLimits, 20000));
  const inquiries = Math.max(0, Math.round(safeNumber(values.inquiriesLast12Months, 1)));

  const utilization = totalCardLimits > 0 ? (totalCardBalances / totalCardLimits) * 100 : 100;
  let passed = 0;
  if (creditScore >= 670) passed++;
  if (utilization <= 50) passed++;
  if (inquiries <= 2) passed++;

  return {
    creditUtilization: round2(utilization),
    checksPassed: passed,
  };
};

export const creditDebtSettlementTransferCustomCalculators: Record<string, CustomCalculator> = {
  "debt-settlement-loan-calculator": debtSettlementLoanCalculator,
  "debt-settlement-loan-payment-calculator": debtSettlementLoanPaymentCalculator,
  "debt-settlement-loan-payoff-calculator": debtSettlementLoanPayoffCalculator,
  "debt-settlement-loan-interest-calculator": debtSettlementLoanInterestCalculator,
  "debt-settlement-loan-affordability-calculator": debtSettlementLoanAffordabilityCalculator,
  "debt-settlement-loan-comparison-calculator": debtSettlementLoanComparisonCalculator,
  "debt-settlement-loan-eligibility-calculator": debtSettlementLoanEligibilityCalculator,
  "balance-transfer-loan-calculator": balanceTransferLoanCalculator,
  "balance-transfer-loan-payment-calculator": balanceTransferLoanPaymentCalculator,
  "balance-transfer-loan-payoff-calculator": balanceTransferLoanPayoffCalculator,
  "balance-transfer-loan-interest-calculator": balanceTransferLoanInterestCalculator,
  "balance-transfer-loan-affordability-calculator": balanceTransferLoanAffordabilityCalculator,
  "balance-transfer-loan-comparison-calculator": balanceTransferLoanComparisonCalculator,
  "balance-transfer-loan-eligibility-calculator": balanceTransferLoanEligibilityCalculator,
};
