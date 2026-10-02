/**
 * Batch: "Loan Calculators" expansion (2 Oct 2026), sub-batch 8 of 10 —
 * Motorcycle Loans (7 tools), filed under Loan Calculators > Auto & Vehicle
 * Loan Calculators. See calc-engine-loan-debt-consolidation.ts for the full
 * batch context. Boat (calc-engine-loan-boat.ts) and RV (calc-engine-loan-
 * rv.ts) have the same 7 tool names, so each vehicle's tools model what's
 * specific to it:
 *  - motorcycleLoan: MSRP plus freight & prep and doc fees, riding gear
 *    rolled into the loan, sales tax, down payment and trade-in.
 *  - payment: loan payment plus insurance and maintenance, spread over the
 *    months you can actually ride (riding season).
 *  - payoff: extra payments vs fast motorcycle depreciation — the month the
 *    bike is worth more than you owe.
 *  - interest: what paying the loan off early costs on a simple-interest
 *    loan vs a precomputed "Rule of 78s" loan, which front-loads interest
 *    (still used by some powersports and subprime lenders on shorter loans).
 *  - affordability: payment + insurance capped at a share of take-home pay,
 *    worked back to the most you can pay for the bike before tax and fees.
 *  - comparison: dealer promotional APR vs taking the cash rebate and
 *    financing with a bank or credit union.
 *  - eligibility: powersports lender checks — loan-to-value, DTI, score.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-motorcycle-calculators.ts for the copy.
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

// --- 1. Motorcycle Loan Calculator -------------------------------------------
export const motorcycleLoanCalculator: CustomCalculator = (values) => {
  const bikePrice = Math.max(0, safeNumber(values.bikePrice, 15000));
  const freightPrep = Math.max(0, safeNumber(values.freightPrep, 900));
  const docFees = Math.max(0, safeNumber(values.docFees, 300));
  const gearFinanced = Math.max(0, safeNumber(values.gearFinanced, 800));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 2000));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  // Tax on the bike, freight/prep and gear, after the trade-in credit.
  const taxable = Math.max(0, bikePrice + freightPrep + gearFinanced - tradeInValue);
  const tax = (taxable * salesTaxPercent) / 100;
  const outTheDoor = bikePrice + freightPrep + docFees + gearFinanced + tax;
  const financed = Math.max(0, outTheDoor - downPayment - tradeInValue);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);

  return {
    salesTax: round2(tax),
    outTheDoorPrice: round2(outTheDoor),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(pmt * termMonths - financed),
  };
};

// --- 2. Motorcycle Loan Payment Calculator (cost per riding month) ----------
export const motorcycleLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 14000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const monthlyInsurance = Math.max(0, safeNumber(values.monthlyInsurance, 60));
  const annualMaintenance = Math.max(0, safeNumber(values.annualMaintenance, 600));
  const ridingMonths = Math.min(12, Math.max(1, Math.round(safeNumber(values.ridingMonths, 7))));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const monthly = pmt + monthlyInsurance + annualMaintenance / 12;

  return {
    loanPayment: round2(pmt),
    monthlyOwnershipCost: round2(monthly),
    annualOwnershipCost: round2(monthly * 12),
    costPerRidingMonth: round2((monthly * 12) / ridingMonths),
  };
};

// --- 3. Motorcycle Loan Payoff Calculator (vs depreciation) -----------------
export const motorcycleLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 72)));
  const bikeValue = Math.max(0, safeNumber(values.bikeValue, 14000));
  const depreciationPercent = Math.min(99, Math.max(0, safeNumber(values.depreciationPercent, 15)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 50));

  const i = annualRatePercent / 100 / 12;
  const pmt = payment(loanAmount, i, termMonths);
  const baseInterest = pmt * termMonths - loanAmount;
  const monthlyKeep = Math.pow(1 - depreciationPercent / 100, 1 / 12);

  let b = loanAmount;
  let v = bikeValue;
  let interest = 0;
  let months = 0;
  let equityMonth = b < v ? 0 : -1;
  while (b > 1e-9 && months < termMonths) {
    const int = b * i;
    interest += int;
    b = b + int - Math.min(pmt + extraMonthly, b + int);
    v *= monthlyKeep;
    months++;
    if (equityMonth < 0 && b < v) equityMonth = months;
  }

  return {
    monthlyPayment: round2(pmt),
    monthsToPayoff: months,
    interestSaved: round2(baseInterest - interest),
    monthOwingLessThanValue: Math.max(0, equityMonth),
    bikeValueAtPayoff: round2(v),
  };
};

// --- 4. Motorcycle Loan Interest Calculator (simple vs Rule of 78s) -------
export const motorcycleLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 12000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 16));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 48)));
  const payoffMonth = Math.min(termMonths, Math.max(0, Math.round(safeNumber(values.payoffMonth, 12))));

  const i = annualRatePercent / 100 / 12;
  const n = termMonths;
  const pmt = payment(loanAmount, i, n);
  const totalCharge = pmt * n - loanAmount;

  // Simple interest: interest is earned on the balance actually owed.
  let b = loanAmount;
  let simpleEarned = 0;
  for (let m = 0; m < payoffMonth; m++) {
    const int = b * i;
    simpleEarned += int;
    b = b + int - pmt;
  }
  // Rule of 78s: the total finance charge is pre-allocated, month m getting
  // (n - m + 1) / (n(n+1)/2) of it — front-loading interest.
  const sumOfDigits = (n * (n + 1)) / 2;
  let earned78 = 0;
  for (let m = 1; m <= payoffMonth; m++) earned78 += (totalCharge * (n - m + 1)) / sumOfDigits;
  const remainingScheduled = pmt * (n - payoffMonth);

  return {
    monthlyPayment: round2(pmt),
    totalInterestIfKept: round2(totalCharge),
    interestPaidSimple: round2(simpleEarned),
    interestPaidRule78: round2(earned78),
    payoffAmountSimple: round2(Math.max(0, b)),
    payoffAmountRule78: round2(Math.max(0, remainingScheduled - (totalCharge - earned78))),
    extraCostOfRule78: round2(earned78 - simpleEarned),
  };
};

// --- 5. Motorcycle Loan Affordability Calculator -----------------------------
export const motorcycleLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const monthlyTakeHome = Math.max(0, safeNumber(values.monthlyTakeHome, 4500));
  const maxSharePercent = Math.max(0, safeNumber(values.maxSharePercent, 10));
  const monthlyInsurance = Math.max(0, safeNumber(values.monthlyInsurance, 60));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 2000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const fees = Math.max(0, safeNumber(values.fees, 1200));

  const maxPayment = Math.max(0, (monthlyTakeHome * maxSharePercent) / 100 - monthlyInsurance);
  const maxLoan = presentValue(maxPayment, annualRatePercent / 100 / 12, termMonths);
  const maxOutTheDoor = maxLoan + downPayment;

  return {
    maxLoanPayment: round2(maxPayment),
    maxLoanAmount: round2(maxLoan),
    maxOutTheDoor: round2(maxOutTheDoor),
    maxBikePrice: round2(Math.max(0, (maxOutTheDoor - fees) / (1 + salesTaxPercent / 100))),
  };
};

// --- 6. Motorcycle Loan Comparison Calculator (promo APR vs rebate) ---------
export const motorcycleLoanComparisonCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 18000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 2000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const promoRatePercent = Math.max(0, safeNumber(values.promoRatePercent, 3.99));
  const rebate = Math.max(0, safeNumber(values.rebate, 1500));
  const bankRatePercent = Math.max(0, safeNumber(values.bankRatePercent, 7.5));

  const promoLoan = Math.max(0, price - downPayment);
  const rebateLoan = Math.max(0, price - rebate - downPayment);
  const pp = payment(promoLoan, promoRatePercent / 100 / 12, termMonths);
  const rp = payment(rebateLoan, bankRatePercent / 100 / 12, termMonths);

  return {
    promoPayment: round2(pp),
    promoTotalPaid: round2(pp * termMonths),
    rebatePayment: round2(rp),
    rebateTotalPaid: round2(rp * termMonths),
    promoSaves: round2(rp * termMonths - pp * termMonths),
  };
};

// --- 7. Motorcycle Loan Eligibility Calculator -------------------------------
export const motorcycleLoanEligibilityCalculator: CustomCalculator = (values) => {
  const creditScore = Math.max(300, Math.min(850, safeNumber(values.creditScore, 670)));
  const lenderMinScore = Math.max(300, Math.min(850, safeNumber(values.lenderMinScore, 640)));
  const grossMonthlyIncome = Math.max(1, safeNumber(values.grossMonthlyIncome, 5000));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 1500));
  const bikeValue = Math.max(1, safeNumber(values.bikeValue, 16000));
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 15000));
  const maxLtvPercent = Math.max(0, safeNumber(values.maxLtvPercent, 110));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const maxDtiPercent = Math.max(0, safeNumber(values.maxDtiPercent, 45));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const ltv = (loanAmount / bikeValue) * 100;
  const dti = ((monthlyDebtPayments + pmt) / grossMonthlyIncome) * 100;

  return {
    monthlyPayment: round2(pmt),
    ltvPercent: round2(ltv),
    ltvHeadroomPercent: round2(maxLtvPercent - ltv),
    dtiPercent: round2(dti),
    dtiHeadroomPercent: round2(maxDtiPercent - dti),
    scoreMargin: Math.round(creditScore - lenderMinScore),
  };
};

export const loanMotorcycleCustomCalculators: Record<string, CustomCalculator> = {
  "motorcycle-loan-calculator": motorcycleLoanCalculator,
  "motorcycle-loan-payment-calculator": motorcycleLoanPaymentCalculator,
  "motorcycle-loan-payoff-calculator": motorcycleLoanPayoffCalculator,
  "motorcycle-loan-interest-calculator": motorcycleLoanInterestCalculator,
  "motorcycle-loan-affordability-calculator": motorcycleLoanAffordabilityCalculator,
  "motorcycle-loan-comparison-calculator": motorcycleLoanComparisonCalculator,
  "motorcycle-loan-eligibility-calculator": motorcycleLoanEligibilityCalculator,
};
