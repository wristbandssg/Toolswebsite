/**
 * Batch: "Loan Calculators" sub-batch D (Loan Types, Personal & Auto
 * Loans, 10 tools). Part of the Loan Calculators tool-list build-out — see
 * calc-engine-loan-core.ts for the full batch context, the skipped
 * duplicate, and the other 4 sub-batches.
 *
 * Each product-specific tool here models what is genuinely different about
 * that product, rather than re-skinning the general loan payment formula:
 *  - securedVsUnsecuredLoanCalculator: the rate gap for pledging
 *    collateral, net of securing fees, plus the loan-to-collateral ratio.
 *  - shortTermLoanCalculator: a flat finance charge over DAYS (payday/
 *    bridge style), turned into an APR, with rollovers.
 *  - longTermLoanCalculator: the cost of stretching a term — the same loan
 *    5 years shorter, side by side.
 *  - personalLoanCalculator: grosses up the loan so an origination fee
 *    (deducted or added) still leaves you the cash you need.
 *  - personalLoanRefinanceCalculator: refinance where the new lender's
 *    origination fee is built into the new loan balance.
 *  - personalLoanExtraPaymentCalculator: from the original loan terms, a
 *    monthly extra AND a once-a-year lump sum (bonus / tax refund).
 *  - personalLoanAprCalculator: two personal-loan offers compared on APR
 *    (rate + origination fee) — the general loan-apr-calculator handles a
 *    single loan with any mix of % and $ fees.
 *  - autoLoanCalculator: vehicle price, trade-in (and payoff owed on it),
 *    sales tax, dealer fees and down payment -> amount financed.
 *  - autoLoanPayoffCalculator: a payoff QUOTE with per-diem interest since
 *    the last payment.
 *  - autoLoanRefinanceCalculator: refinance plus the car's loan-to-value
 *    (lenders often won't refinance an underwater car loan).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-loan-types-calculators.ts for the tool content/copy
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

// --- 1. Secured vs Unsecured Loan Calculator ---------------------------------
export const securedVsUnsecuredLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const securedRatePercent = Math.max(0, safeNumber(values.securedRatePercent, 7));
  const unsecuredRatePercent = Math.max(0, safeNumber(values.unsecuredRatePercent, 12));
  const securedFees = Math.max(0, safeNumber(values.securedFees, 0));
  const collateralValue = Math.max(0, safeNumber(values.collateralValue, 0));

  const securedPayment = payment(loanAmount, securedRatePercent / 100 / 12, termMonths);
  const unsecuredPayment = payment(loanAmount, unsecuredRatePercent / 100 / 12, termMonths);
  const securedTotalCost = securedPayment * termMonths - loanAmount + securedFees;
  const unsecuredTotalCost = unsecuredPayment * termMonths - loanAmount;

  return {
    securedPayment: round2(securedPayment),
    unsecuredPayment: round2(unsecuredPayment),
    securedTotalCost: round2(securedTotalCost),
    unsecuredTotalCost: round2(unsecuredTotalCost),
    savingsWithSecured: round2(unsecuredTotalCost - securedTotalCost),
    loanToCollateralPercent: collateralValue > 0 ? round2((loanAmount / collateralValue) * 100) : 0,
  };
};

// --- 2. Short-Term Loan Calculator (flat fee over days) ----------------------
export const shortTermLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0.01, safeNumber(values.loanAmount, 500));
  const termDays = Math.max(1, safeNumber(values.termDays, 14));
  const financeCharge = Math.max(0, safeNumber(values.financeCharge, 75));
  const rollovers = Math.max(0, Math.round(safeNumber(values.rollovers, 0)));

  return {
    aprPercent: round2((financeCharge / loanAmount) * (365 / termDays) * 100),
    totalRepayment: round2(loanAmount + financeCharge),
    costPer100Borrowed: round2((financeCharge / loanAmount) * 100),
    totalFeesWithRollovers: round2(financeCharge * (1 + rollovers)),
  };
};

// --- 3. Long-Term Loan Calculator (vs the same loan 5 years shorter) --------
export const longTermLoanCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 40000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 10)));

  const i = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  const pmt = payment(loanAmount, i, n);
  const totalInterest = pmt * n - loanAmount;
  const shorterN = Math.max(1, termYears - 5) * 12;
  const shorterPmt = payment(loanAmount, i, shorterN);
  const shorterInterest = shorterPmt * shorterN - loanAmount;

  return {
    monthlyPayment: round2(pmt),
    totalInterest: round2(totalInterest),
    interestShareOfPaymentsPercent: pmt > 0 ? round2((totalInterest / (pmt * n)) * 100) : 0,
    shorterTermPayment: round2(shorterPmt),
    interestSavedWithShorterTerm: round2(totalInterest - shorterInterest),
  };
};

// --- 4. Personal Loan Calculator (gross up for an origination fee) ----------
export const personalLoanCalculator: CustomCalculator = (values) => {
  const cashNeeded = Math.max(0, safeNumber(values.cashNeeded, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const originationFeePercent = Math.min(50, Math.max(0, safeNumber(values.originationFeePercent, 0)));
  const feeHandling = safeNumber(values.feeHandling, 1); // 1 = deducted from proceeds, 2 = added to balance

  const f = originationFeePercent / 100;
  // Deducted: you receive loan x (1 - f), so borrow cash / (1 - f).
  // Added: the fee (f x cash) is added on top of the cash you receive.
  const loanAmount = feeHandling === 2 ? cashNeeded * (1 + f) : cashNeeded / (1 - f);
  const originationFee = loanAmount - cashNeeded;
  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const totalInterest = pmt * termMonths - loanAmount;

  return {
    loanAmountToRequest: round2(loanAmount),
    monthlyPayment: round2(pmt),
    originationFee: round2(originationFee),
    totalInterest: round2(totalInterest),
    totalCost: round2(totalInterest + originationFee),
  };
};

// --- 5. Personal Loan Refinance Calculator (fee built into new loan) --------
export const personalLoanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 12000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 18));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 36)));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 10));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 36)));
  const newOriginationFeePercent = Math.min(50, Math.max(0, safeNumber(values.newOriginationFeePercent, 0)));

  const currentPayment = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  // The new loan must be big enough that, after its fee is deducted, it
  // still pays off the whole current balance.
  const newLoanAmount = currentBalance / (1 - newOriginationFeePercent / 100);
  const newPayment = payment(newLoanAmount, newRatePercent / 100 / 12, newTermMonths);

  return {
    newLoanAmount: round2(newLoanAmount),
    currentPayment: round2(currentPayment),
    newPayment: round2(newPayment),
    monthlySavings: round2(currentPayment - newPayment),
    netSavings: round2(currentPayment * remainingMonths - newPayment * newTermMonths),
  };
};

// --- 6. Personal Loan Extra Payment Calculator (monthly + yearly extra) -----
export const personalLoanExtraPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 12));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 0));
  const extraYearly = Math.max(0, safeNumber(values.extraYearly, 0));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const baseInterest = pmt * termMonths - loanAmount;

  let balance = loanAmount;
  let interest = 0;
  let months = 0;
  while (balance > 1e-9 && months < termMonths) {
    months++;
    const monthInterest = balance * i;
    interest += monthInterest;
    const due = balance + monthInterest;
    const paid = pmt + extraMonthly + (months % 12 === 0 ? extraYearly : 0);
    balance = due - Math.min(paid, due);
  }

  return {
    monthlyPayment: round2(pmt),
    newPayoffMonths: months,
    monthsSaved: termMonths - months,
    interestSaved: round2(baseInterest - interest),
  };
};

// --- 7. Personal Loan APR Calculator (two offers) ----------------------------
export const personalLoanAprCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 10000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 36)));
  const offer = (rate: number, feePercent: number) => {
    const pmt = payment(loanAmount, rate / 100 / 12, termMonths);
    const received = loanAmount * (1 - feePercent / 100);
    const apr = feePercent > 0 ? solvePeriodicRate(received, pmt, termMonths) * 12 * 100 : rate;
    return { pmt, apr };
  };
  const a = offer(Math.max(0, safeNumber(values.offerARatePercent, 9.5)), Math.min(50, Math.max(0, safeNumber(values.offerAFeePercent, 0))));
  const b = offer(Math.max(0, safeNumber(values.offerBRatePercent, 11)), Math.min(50, Math.max(0, safeNumber(values.offerBFeePercent, 0))));

  return {
    aprA: round2(a.apr),
    aprB: round2(b.apr),
    paymentA: round2(a.pmt),
    paymentB: round2(b.pmt),
    aprDifference: round2(a.apr - b.apr),
  };
};

// --- 8. Auto Loan Calculator --------------------------------------------------
export const autoLoanCalculator: CustomCalculator = (values) => {
  const vehiclePrice = Math.max(0, safeNumber(values.vehiclePrice, 32000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 0));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 0));
  const tradeInOwed = Math.max(0, safeNumber(values.tradeInOwed, 0));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 0));
  const fees = Math.max(0, safeNumber(values.fees, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  // Most US states tax the price after the trade-in credit.
  const salesTax = (Math.max(0, vehiclePrice - tradeInValue) * salesTaxPercent) / 100;
  const amountFinanced = Math.max(0, vehiclePrice + salesTax + fees - tradeInValue + tradeInOwed - downPayment);
  const pmt = payment(amountFinanced, annualRatePercent / 100 / 12, termMonths);

  return {
    amountFinanced: round2(amountFinanced),
    salesTax: round2(salesTax),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - amountFinanced),
    totalCost: round2(downPayment + pmt * termMonths),
  };
};

// --- 9. Auto Loan Payoff Calculator (per-diem payoff quote) -----------------
export const autoLoanPayoffCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 14500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.9));
  const daysSinceLastPayment = Math.max(0, safeNumber(values.daysSinceLastPayment, 0));
  const monthlyPayment = Math.max(0, safeNumber(values.monthlyPayment, 420));

  const perDiemInterest = (currentBalance * annualRatePercent) / 100 / 365;
  const i = annualRatePercent / 100 / 12;

  let balance = currentBalance;
  let months = 0;
  let interestRemaining = 0;
  const repays = monthlyPayment > balance * i;
  while (repays && balance > 1e-9 && months < 1200) {
    const monthInterest = balance * i;
    interestRemaining += monthInterest;
    balance = balance + monthInterest - Math.min(monthlyPayment, balance + monthInterest);
    months++;
  }

  return {
    payoffAmount: round2(currentBalance + perDiemInterest * daysSinceLastPayment),
    perDiemInterest: round2(perDiemInterest),
    monthsRemainingIfKept: repays ? months : 0,
    interestAvoidedByPayingOff: repays ? round2(interestRemaining - perDiemInterest * daysSinceLastPayment) : 0,
  };
};

// --- 10. Auto Loan Refinance Calculator (with loan-to-value) ----------------
export const autoLoanRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 18000));
  const currentRatePercent = Math.max(0, safeNumber(values.currentRatePercent, 9));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const carValue = Math.max(0, safeNumber(values.carValue, 0));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 6));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 48)));
  const refinanceFees = Math.max(0, safeNumber(values.refinanceFees, 0));

  const currentPayment = payment(currentBalance, currentRatePercent / 100 / 12, remainingMonths);
  const newPayment = payment(currentBalance, newRatePercent / 100 / 12, newTermMonths);

  return {
    currentPayment: round2(currentPayment),
    newPayment: round2(newPayment),
    monthlySavings: round2(currentPayment - newPayment),
    netSavings: round2(currentPayment * remainingMonths - newPayment * newTermMonths - refinanceFees),
    loanToValuePercent: carValue > 0 ? round2((currentBalance / carValue) * 100) : 0,
  };
};

export const loanTypesCustomCalculators: Record<string, CustomCalculator> = {
  "secured-vs-unsecured-loan-calculator": securedVsUnsecuredLoanCalculator,
  "short-term-loan-calculator": shortTermLoanCalculator,
  "long-term-loan-calculator": longTermLoanCalculator,
  "personal-loan-calculator": personalLoanCalculator,
  "personal-loan-refinance-calculator": personalLoanRefinanceCalculator,
  "personal-loan-extra-payment-calculator": personalLoanExtraPaymentCalculator,
  "personal-loan-apr-calculator": personalLoanAprCalculator,
  "auto-loan-calculator": autoLoanCalculator,
  "auto-loan-payoff-calculator": autoLoanPayoffCalculator,
  "auto-loan-refinance-calculator": autoLoanRefinanceCalculator,
};
