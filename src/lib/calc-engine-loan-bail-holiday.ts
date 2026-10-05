/**
 * Batch: "Loan Calculators" expansion 5 (4 Oct 2026), sub-batch 6 of 10 —
 * Bail Bond Loans (4) and Holiday Loans (4), filed under Loan Calculators >
 * Personal Loan Calculators. "Christmas Loan" x4 was merged into Holiday
 * Loan (same purpose). See calc-engine-loan-startup-business.ts for the
 * full batch context.
 *
 * Bail bonds: a bondsman posts bail for a non-refundable premium (often
 * about 10% of the bail, set by state rules), and many offer payment plans:
 *  - bailBondLoan: premium, down payment and the monthly plan payment.
 *  - bailBondLoanPayment: the plan balance paid weekly, every two weeks or
 *    monthly.
 *  - bailBondLoanCost: posting full cash bail (refunded at the end, minus
 *    court fees and lost interest) vs paying a bond premium.
 *  - bailBondLoanPayoff: extra each month on the remaining plan balance.
 * Holiday loans:
 *  - holidayLoan: gifts + travel + hosting + decorations - savings.
 *  - holidayLoanPayment: the payment that clears it before next season vs
 *    paying a credit card's minimum.
 *  - holidayLoanCost: borrowing now vs saving a little each month ahead
 *    (a sinking fund) for next year.
 *  - holidayLoanPayoff: a January lump sum (bonus, tax refund) plus extra.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-bail-holiday-calculators.ts for the copy.
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

// --- 1. Bail Bond Loan Calculator ----------------------------------------------------------
export const bailBondLoanCalculator: CustomCalculator = (values) => {
  const bailAmount = Math.max(0, safeNumber(values.bailAmount, 25000));
  const premiumPercent = Math.min(100, Math.max(0, safeNumber(values.premiumPercent, 10)));
  const downPercent = Math.min(100, Math.max(0, safeNumber(values.downPercent, 30)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, Math.round(safeNumber(values.months, 10)));

  const premium = (bailAmount * premiumPercent) / 100;
  const down = (premium * downPercent) / 100;
  const financed = premium - down;
  const pmt = payment(financed, annualRatePercent / 100 / 12, months);

  return {
    bondPremium: round2(premium),
    downPayment: round2(down),
    amountOnPaymentPlan: round2(financed),
    monthlyPayment: round2(pmt),
    totalPaid: round2(down + pmt * months),
  };
};

// --- 2. Bail Bond Loan Payment Calculator (weekly / biweekly / monthly) -------------------
export const bailBondLoanPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 2000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const months = Math.max(1, safeNumber(values.months, 8));
  const raw = Math.round(safeNumber(values.paymentsPerYear, 52));
  const perYear = [52, 26, 12].includes(raw) ? raw : 52;

  const n = Math.max(1, Math.round((months / 12) * perYear));
  const pmt = payment(balance, annualRatePercent / 100 / perYear, n);

  return {
    numberOfPayments: n,
    paymentPerPeriod: round2(pmt),
    monthlyEquivalent: round2((pmt * perYear) / 12),
    totalInterestAndFees: round2(pmt * n - balance),
  };
};

// --- 3. Bail Bond Loan Cost Calculator (cash bail vs bond) --------------------------------
export const bailBondLoanCostCalculator: CustomCalculator = (values) => {
  const bailAmount = Math.max(0, safeNumber(values.bailAmount, 25000));
  const premiumPercent = Math.min(100, Math.max(0, safeNumber(values.premiumPercent, 10)));
  const courtFeePercent = Math.min(100, Math.max(0, safeNumber(values.courtFeePercent, 1)));
  const caseMonths = Math.max(0, safeNumber(values.caseMonths, 9));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 4));

  const lostInterest = (bailAmount * savingsRatePercent * caseMonths) / 1200;
  const cash = (bailAmount * courtFeePercent) / 100 + lostInterest;
  const bond = (bailAmount * premiumPercent) / 100;

  return {
    cashBailCost: round2(cash),
    interestGivenUp: round2(lostInterest),
    bondPremiumCost: round2(bond),
    savingsPayingCash: round2(bond - cash),
  };
};

// --- 4. Bail Bond Loan Payoff Calculator ---------------------------------------------------
export const bailBondLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 1800));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 200));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));

  const i = annualRatePercent / 100 / 12;
  const now = repay(balance, i, monthlyPayment);
  const fast = repay(balance, i, monthlyPayment + extraMonthly);

  return {
    monthsAtCurrentPayment: now.months,
    monthsWithExtra: fast.months,
    monthsSaved: Math.max(0, now.months - fast.months),
    chargesSaved: round2(Math.max(0, now.interest - fast.interest)),
  };
};

// --- 5. Holiday Loan Calculator ------------------------------------------------------------
export const holidayLoanCalculator: CustomCalculator = (values) => {
  const gifts = Math.max(0, safeNumber(values.gifts, 1500));
  const travel = Math.max(0, safeNumber(values.travel, 800));
  const hosting = Math.max(0, safeNumber(values.hosting, 400));
  const decorations = Math.max(0, safeNumber(values.decorations, 200));
  const savings = Math.max(0, safeNumber(values.savings, 500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 15));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  const total = gifts + travel + hosting + decorations;
  const loan = Math.max(0, total - savings);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    totalHolidayBudget: round2(total),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 6. Holiday Loan Payment Calculator (clear it before next season) ---------------------
export const holidayLoanPaymentCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 2500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 22));
  const monthsUntilNextHoliday = Math.max(1, Math.round(safeNumber(values.monthsUntilNextHoliday, 11)));
  const minimumPercent = Math.min(100, Math.max(0.5, safeNumber(values.minimumPercent, 3)));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, monthsUntilNextHoliday);
  const minPay = (balance * minimumPercent) / 100;
  const slow = repay(balance, i, minPay);

  return {
    paymentToClearBeforeNextHoliday: round2(pmt),
    interestIfCleared: round2(pmt * monthsUntilNextHoliday - balance),
    minimumPayment: round2(minPay),
    monthsAtMinimum: slow.months,
    interestAtMinimum: round2(slow.interest),
  };
};

// --- 7. Holiday Loan Cost Calculator (borrow now vs save ahead) ---------------------------
export const holidayLoanCostCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 2000));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 18));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 4));

  const loanPmt = payment(amount, loanRatePercent / 100 / 12, termMonths);
  const loanInterest = loanPmt * termMonths - amount;
  const s = savingsRatePercent / 100 / 12;
  const fvFactor = s === 0 ? termMonths : (Math.pow(1 + s, termMonths) - 1) / s;
  const saving = amount / fvFactor;
  const earned = amount - saving * termMonths;

  return {
    loanMonthlyPayment: round2(loanPmt),
    loanInterest: round2(loanInterest),
    monthlySavingNeeded: round2(saving),
    interestEarnedSaving: round2(earned),
    advantageOfSavingAhead: round2(loanInterest + earned),
  };
};

// --- 8. Holiday Loan Payoff Calculator (January lump sum + extra) -------------------------
export const holidayLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 20));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 150));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 800));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));

  const i = annualRatePercent / 100 / 12;
  const now = repay(balance, i, monthlyPayment);
  const fast = repay(Math.max(0, balance - lumpSum), i, monthlyPayment + extraMonthly);

  return {
    monthsAsIs: now.months,
    monthsWithPlan: fast.months,
    monthsSaved: Math.max(0, now.months - fast.months),
    interestSaved: round2(Math.max(0, now.interest - fast.interest)),
  };
};

export const loanBailHolidayCustomCalculators: Record<string, CustomCalculator> = {
  "bail-bond-loan-calculator": bailBondLoanCalculator,
  "bail-bond-loan-payment-calculator": bailBondLoanPaymentCalculator,
  "bail-bond-loan-cost-calculator": bailBondLoanCostCalculator,
  "bail-bond-loan-payoff-calculator": bailBondLoanPayoffCalculator,
  "holiday-loan-calculator": holidayLoanCalculator,
  "holiday-loan-payment-calculator": holidayLoanPaymentCalculator,
  "holiday-loan-cost-calculator": holidayLoanCostCalculator,
  "holiday-loan-payoff-calculator": holidayLoanPayoffCalculator,
};
