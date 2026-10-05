/**
 * Batch: "Loan Calculators" expansion 4 (3 Oct 2026), sub-batch 3 of 5 —
 * Cosmetic Surgery and Fertility Treatment Loans (8 tools), filed under
 * Loan Calculators > Personal Loan Calculators (next to the medical-loan-*
 * and dental-loan-* tools, which stay general). See
 * calc-engine-loan-powersports.ts for the full batch context.
 *
 *  - cosmeticSurgeryLoan: surgeon + anesthesia + facility + aftercare -
 *    savings -> loan and payment (cosmetic procedures aren't covered by
 *    insurance).
 *  - cosmeticSurgeryLoanPayment: the payment as a share of take-home pay
 *    and the largest loan within a chosen share.
 *  - cosmeticSurgeryLoanCost: a deferred-interest medical credit card vs a
 *    fixed-rate personal loan.
 *  - cosmeticSurgeryLoanPayoff: extra each month.
 *  - fertilityTreatmentLoan: cycles x (cycle cost + medication) - insurance
 *    - savings -> loan and payment.
 *  - fertilityTreatmentLoanPayment: financing each cycle separately as it
 *    happens — the payment after cycle 1 and after cycle 2.
 *  - fertilityTreatmentLoanCost: a multi-cycle package price vs paying per
 *    cycle, and the break-even number of cycles.
 *  - fertilityTreatmentLoanPayoff: a lump sum (e.g. tax refund from the
 *    medical-expense deduction) plus extra each month.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-cosmetic-fertility-calculators.ts for the copy.
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

// --- 1. Cosmetic Surgery Loan Calculator -----------------------------------------------
export const cosmeticSurgeryLoanCalculator: CustomCalculator = (values) => {
  const surgeonFee = Math.max(0, safeNumber(values.surgeonFee, 7000));
  const anesthesiaFee = Math.max(0, safeNumber(values.anesthesiaFee, 1200));
  const facilityFee = Math.max(0, safeNumber(values.facilityFee, 1500));
  const aftercare = Math.max(0, safeNumber(values.aftercare, 500));
  const savings = Math.max(0, safeNumber(values.savings, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const total = surgeonFee + anesthesiaFee + facilityFee + aftercare;
  const loan = Math.max(0, total - savings);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    totalProcedureCost: round2(total),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 2. Cosmetic Surgery Loan Payment Calculator (share of income) ---------------------
export const cosmeticSurgeryLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 8000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 13));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const takeHomePay = Math.max(0, safeNumber(values.takeHomePay, 4500));
  const maxSharePercent = Math.min(100, Math.max(0, safeNumber(values.maxSharePercent, 10)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);

  return {
    monthlyPayment: round2(pmt),
    shareOfTakeHomePay: round2(takeHomePay > 0 ? (pmt / takeHomePay) * 100 : 0),
    maxPaymentAtYourLimit: round2((takeHomePay * maxSharePercent) / 100),
    maxLoanAtYourLimit: round2(presentValue((takeHomePay * maxSharePercent) / 100, i, termMonths)),
  };
};

// --- 3. Cosmetic Surgery Loan Cost Calculator (deferred-interest card vs loan) ----------
export const cosmeticSurgeryLoanCostCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 9000));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 12)));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 600));
  const cardAprPercent = Math.max(0, safeNumber(values.cardAprPercent, 26.99));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11.9));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 18)));

  const r = cardAprPercent / 100 / 12;
  let b = amount;
  let deferred = 0;
  for (let m = 0; m < promoMonths && b > 0; m++) {
    deferred += b * r;
    b = Math.max(0, b - monthlyPayment);
  }
  let cardInterest = 0;
  if (b > 0) {
    // Deferred interest is added to the balance, then repaid at the card APR.
    const after = repay(b + deferred, r, monthlyPayment);
    cardInterest = deferred + after.interest;
  }
  const pmt = payment(amount, loanRatePercent / 100 / 12, loanTermMonths);
  const loanInterest = pmt * loanTermMonths - amount;

  return {
    balanceLeftAfterPromo: round2(b),
    cardTotalInterest: round2(cardInterest),
    loanPayment: round2(pmt),
    loanTotalInterest: round2(loanInterest),
    savingsWithLoan: round2(cardInterest - loanInterest),
  };
};

// --- 4. Cosmetic Surgery Loan Payoff Calculator ----------------------------------------
export const cosmeticSurgeryLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 9000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 14));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));

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

// --- 5. Fertility Treatment Loan Calculator ---------------------------------------------
export const fertilityTreatmentLoanCalculator: CustomCalculator = (values) => {
  const cycles = Math.max(0, Math.round(safeNumber(values.cycles, 2)));
  const costPerCycle = Math.max(0, safeNumber(values.costPerCycle, 15000));
  const medicationPerCycle = Math.max(0, safeNumber(values.medicationPerCycle, 5000));
  const insuranceCoverage = Math.max(0, safeNumber(values.insuranceCoverage, 0));
  const savings = Math.max(0, safeNumber(values.savings, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const total = cycles * (costPerCycle + medicationPerCycle);
  const loan = Math.max(0, total - insuranceCoverage - savings);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    totalTreatmentCost: round2(total),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 6. Fertility Treatment Loan Payment Calculator (finance cycle by cycle) ------------
export const fertilityTreatmentLoanPaymentCalculator: CustomCalculator = (values) => {
  const costPerCycle = Math.max(0, safeNumber(values.costPerCycle, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthsBetween = Math.max(0, Math.round(safeNumber(values.monthsBetween, 6)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(costPerCycle, i, termMonths);
  const interest = pmt * termMonths - costPerCycle;

  return {
    paymentAfterCycle1: round2(pmt),
    paymentAfterCycle2: round2(pmt * 2),
    monthsWithBothPayments: Math.max(0, termMonths - monthsBetween),
    totalInterestTwoCycles: round2(interest * 2),
  };
};

// --- 7. Fertility Treatment Loan Cost Calculator (package vs per cycle) -----------------
export const fertilityTreatmentLoanCostCalculator: CustomCalculator = (values) => {
  const packagePrice = Math.max(0, safeNumber(values.packagePrice, 45000));
  const costPerCycle = Math.max(1, safeNumber(values.costPerCycle, 20000));
  const expectedCycles = Math.max(0, safeNumber(values.expectedCycles, 2));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const perCycleTotal = costPerCycle * expectedCycles;
  const i = annualRatePercent / 100 / 12;
  const financed = (amount: number) => payment(amount, i, termMonths) * termMonths;

  return {
    payPerCycleTotal: round2(perCycleTotal),
    packageTotal: round2(packagePrice),
    savingsWithPackage: round2(perCycleTotal - packagePrice),
    financedSavingsWithPackage: round2(financed(perCycleTotal) - financed(packagePrice)),
    breakEvenCycles: round2(packagePrice / costPerCycle),
  };
};

// --- 8. Fertility Treatment Loan Payoff Calculator (lump sum + extra) -------------------
export const fertilityTreatmentLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 30000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 60)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 3000));

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

export const loanCosmeticFertilityCustomCalculators: Record<string, CustomCalculator> = {
  "cosmetic-surgery-loan-calculator": cosmeticSurgeryLoanCalculator,
  "cosmetic-surgery-loan-payment-calculator": cosmeticSurgeryLoanPaymentCalculator,
  "cosmetic-surgery-loan-cost-calculator": cosmeticSurgeryLoanCostCalculator,
  "cosmetic-surgery-loan-payoff-calculator": cosmeticSurgeryLoanPayoffCalculator,
  "fertility-treatment-loan-calculator": fertilityTreatmentLoanCalculator,
  "fertility-treatment-loan-payment-calculator": fertilityTreatmentLoanPaymentCalculator,
  "fertility-treatment-loan-cost-calculator": fertilityTreatmentLoanCostCalculator,
  "fertility-treatment-loan-payoff-calculator": fertilityTreatmentLoanPayoffCalculator,
};
