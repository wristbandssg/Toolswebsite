/**
 * Batch: "Loan Calculators" expansion 4 (3 Oct 2026), sub-batch 2 of 5 —
 * Musical Instrument and Legal Fee Loans (8 tools), filed under Loan
 * Calculators > Personal Loan Calculators. See
 * calc-engine-loan-powersports.ts for the full batch context.
 *
 *  - musicalInstrumentLoan: price + tax - down payment -> payment, cost.
 *  - musicalInstrumentLoanPayment: a music store's 0% promo — the payment
 *    needed to clear it in time, and the deferred interest charged back if
 *    a balance is left.
 *  - musicalInstrumentLoanCost: rent-to-own (common for school band
 *    instruments) vs buying with a loan over the same months.
 *  - musicalInstrumentLoanPayoff: extra each month.
 *  - legalFeeLoan: hours x rate + court costs - savings -> loan, payment.
 *  - legalFeeLoanPayment: the law firm's payment plan (monthly interest on
 *    the unpaid balance) vs a personal loan.
 *  - legalFeeLoanCost: pre-settlement (lawsuit) funding — the amount owed
 *    at settlement with simple or compound monthly fees, and what's left
 *    for you after the attorney's contingency fee.
 *  - legalFeeLoanPayoff: a lump sum (for example a fee award) plus the
 *    regular payment.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-instrument-legal-calculators.ts for the copy.
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

// --- 1. Musical Instrument Loan Calculator ----------------------------------------------
export const musicalInstrumentLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 4000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const tax = (price * salesTaxPercent) / 100;
  const financed = Math.max(0, price + tax - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(price + tax + interest),
  };
};

// --- 2. Musical Instrument Loan Payment Calculator (0% promo, deferred interest) --------
export const musicalInstrumentLoanPaymentCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 3000));
  const promoMonths = Math.max(1, Math.round(safeNumber(values.promoMonths, 12)));
  const plannedPayment = Math.max(0, safeNumber(values.plannedPayment, 200));
  const deferredAprPercent = Math.max(0, safeNumber(values.deferredAprPercent, 29.99));

  const r = deferredAprPercent / 100 / 12;
  let b = price;
  let accrued = 0;
  for (let m = 0; m < promoMonths && b > 0; m++) {
    accrued += b * r;
    b = Math.max(0, b - plannedPayment);
  }
  const left = Math.max(0, price - plannedPayment * promoMonths);

  return {
    requiredMonthlyPayment: round2(price / promoMonths),
    balanceLeftAtPromoEnd: round2(left),
    deferredInterestCharged: round2(left > 0 ? accrued : 0),
    totalIfBalanceLeft: round2(left + (left > 0 ? accrued : 0)),
  };
};

// --- 3. Musical Instrument Loan Cost Calculator (rent-to-own vs loan) -------------------
export const musicalInstrumentLoanCostCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 1800));
  const rentalPerMonth = Math.max(0, safeNumber(values.rentalPerMonth, 70));
  const monthsToOwn = Math.max(1, Math.round(safeNumber(values.monthsToOwn, 36)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.9));

  const rto = rentalPerMonth * monthsToOwn;
  const pmt = payment(price, annualRatePercent / 100 / 12, monthsToOwn);
  const loan = pmt * monthsToOwn;

  return {
    rentToOwnTotal: round2(rto),
    loanPayment: round2(pmt),
    loanTotal: round2(loan),
    extraCostOfRentToOwn: round2(rto - loan),
  };
};

// --- 4. Musical Instrument Loan Payoff Calculator -----------------------------------------
export const musicalInstrumentLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 3500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 36)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 40));

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

// --- 5. Legal Fee Loan Calculator -----------------------------------------------------------
export const legalFeeLoanCalculator: CustomCalculator = (values) => {
  const hourlyRate = Math.max(0, safeNumber(values.hourlyRate, 300));
  const hours = Math.max(0, safeNumber(values.hours, 40));
  const courtCosts = Math.max(0, safeNumber(values.courtCosts, 1500));
  const savings = Math.max(0, safeNumber(values.savings, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));

  const bill = hourlyRate * hours + courtCosts;
  const loan = Math.max(0, bill - savings);
  const pmt = payment(loan, annualRatePercent / 100 / 12, termMonths);

  return {
    estimatedLegalBill: round2(bill),
    loanAmount: round2(loan),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - loan),
  };
};

// --- 6. Legal Fee Loan Payment Calculator (firm payment plan vs loan) ----------------------
export const legalFeeLoanPaymentCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 12000));
  const firmMonthlyRatePercent = Math.max(0, safeNumber(values.firmMonthlyRatePercent, 1.5));
  const firmMonthlyPayment = Math.max(0, safeNumber(values.firmMonthlyPayment, 600));
  const loanRatePercent = Math.max(0, safeNumber(values.loanRatePercent, 11));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 24)));

  const firm = repay(amount, firmMonthlyRatePercent / 100, firmMonthlyPayment);
  const pmt = payment(amount, loanRatePercent / 100 / 12, loanTermMonths);
  const loanInterest = pmt * loanTermMonths - amount;

  return {
    firmPlanMonths: firm.months,
    firmPlanInterest: round2(firm.interest),
    loanPayment: round2(pmt),
    loanInterest: round2(loanInterest),
    savingsWithLoan: round2(firm.interest - loanInterest),
  };
};

// --- 7. Legal Fee Loan Cost Calculator (pre-settlement funding) ----------------------------
export const legalFeeLoanCostCalculator: CustomCalculator = (values) => {
  const advance = Math.max(0, safeNumber(values.advance, 10000));
  const monthlyFeePercent = Math.max(0, safeNumber(values.monthlyFeePercent, 3));
  const compound = Math.round(safeNumber(values.compounding, 1)) === 1;
  const months = Math.max(0, safeNumber(values.monthsToSettlement, 18));
  const settlement = Math.max(0, safeNumber(values.settlement, 100000));
  const attorneyFeePercent = Math.min(100, Math.max(0, safeNumber(values.attorneyFeePercent, 33.33)));

  const r = monthlyFeePercent / 100;
  const owed = compound ? advance * Math.pow(1 + r, months) : advance * (1 + r * months);
  const attorney = (settlement * attorneyFeePercent) / 100;

  return {
    amountOwedAtSettlement: round2(owed),
    fundingCost: round2(owed - advance),
    attorneyFee: round2(attorney),
    yourNetRecovery: round2(Math.max(0, settlement - attorney - owed)),
  };
};

// --- 8. Legal Fee Loan Payoff Calculator (lump sum + regular payment) ----------------------
export const legalFeeLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 30)));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 6000));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(balance, i, remainingMonths);
  const fast = repay(Math.max(0, balance - lumpSum), i, pmt);

  return {
    currentPayment: round2(pmt),
    balanceAfterLumpSum: round2(Math.max(0, balance - lumpSum)),
    monthsToPayoff: fast.months,
    monthsSaved: Math.max(0, remainingMonths - fast.months),
    interestSaved: round2(Math.max(0, pmt * remainingMonths - balance - fast.interest)),
  };
};

export const loanInstrumentLegalCustomCalculators: Record<string, CustomCalculator> = {
  "musical-instrument-loan-calculator": musicalInstrumentLoanCalculator,
  "musical-instrument-loan-payment-calculator": musicalInstrumentLoanPaymentCalculator,
  "musical-instrument-loan-cost-calculator": musicalInstrumentLoanCostCalculator,
  "musical-instrument-loan-payoff-calculator": musicalInstrumentLoanPayoffCalculator,
  "legal-fee-loan-calculator": legalFeeLoanCalculator,
  "legal-fee-loan-payment-calculator": legalFeeLoanPaymentCalculator,
  "legal-fee-loan-cost-calculator": legalFeeLoanCostCalculator,
  "legal-fee-loan-payoff-calculator": legalFeeLoanPayoffCalculator,
};
