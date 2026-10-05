/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 10 of 11 —
 * Truck Loans (7 tools) and Trailer Loans (3 tools), filed under Loan
 * Calculators > Auto & Vehicle Loan Calculators. See
 * calc-engine-loan-sba.ts for the full batch context. "Trailer Loan Cost
 * Calculator" was merged into the Trailer Loan Calculator, which shows the
 * full cost (tax, fees and interest).
 *
 * "Truck loan" here means a commercial truck (semi / box truck) bought by an
 * owner-operator or trucking business, so the tools think in miles:
 *  - truckLoan: price less trade-in and down payment, plus taxes and fees.
 *  - truckLoanPayment: payment per mile and as a share of revenue.
 *  - truckLoanPayoff: an extra amount each month.
 *  - truckLoanInterest: interest at your rate vs a better-credit rate, and
 *    interest per mile.
 *  - truckLoanAffordability: miles x (rate per mile - cost per mile) - your
 *    pay -> maximum truck payment and price.
 *  - truckLoanComparison: new truck vs used (higher rate, more repairs).
 *  - truckLoanEligibility: typical down payment by time in business and
 *    credit, CDL experience.
 * Trailers (utility, cargo, horse, flatbed, semi trailers):
 *  - trailerLoan (incl. cost): price + sales tax + fees -> payment and the
 *    full cost.
 *  - trailerLoanPayment: payment and interest at 36, 60 and 120 months.
 *  - trailerLoanPayoff: an extra monthly amount plus a one-time lump sum.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-truck-trailer-calculators.ts for the copy.
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

// --- 1. Truck Loan Calculator --------------------------------------------------------------
export const truckLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 150000));
  const tradeIn = Math.max(0, safeNumber(values.tradeIn, 20000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 15)));
  const taxesFees = Math.max(0, safeNumber(values.taxesFees, 3000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const net = Math.max(0, price - tradeIn);
  const down = (net * downPaymentPercent) / 100;
  const financed = net - down + taxesFees;
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    downPayment: round2(down),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(price + taxesFees + interest),
  };
};

// --- 2. Truck Loan Payment Calculator (per mile) -----------------------------------------
export const truckLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 120000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const milesPerMonth = Math.max(0, safeNumber(values.milesPerMonth, 10000));
  const revenuePerMile = Math.max(0, safeNumber(values.revenuePerMile, 2.2));

  const pmt = payment(loanAmount, annualRatePercent / 100 / 12, termMonths);
  const revenue = milesPerMonth * revenuePerMile;

  return {
    monthlyPayment: round2(pmt),
    paymentPerMile: milesPerMonth > 0 ? Math.round((pmt / milesPerMonth) * 1000) / 1000 : 0,
    monthlyRevenue: round2(revenue),
    paymentShareOfRevenue: round2(revenue > 0 ? (pmt / revenue) * 100 : 0),
  };
};

// --- 3. Truck Loan Payoff Calculator (extra monthly) -------------------------------------
export const truckLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 90000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 48)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 500));

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

// --- 4. Truck Loan Interest Calculator (your rate vs a better rate) ----------------------
export const truckLoanInterestCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 120000));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const yourRatePercent = Math.max(0, safeNumber(values.yourRatePercent, 14));
  const betterRatePercent = Math.max(0, safeNumber(values.betterRatePercent, 9));
  const annualMiles = Math.max(0, safeNumber(values.annualMiles, 120000));

  const yours = payment(loanAmount, yourRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  const better = payment(loanAmount, betterRatePercent / 100 / 12, termMonths) * termMonths - loanAmount;
  const miles = (annualMiles * termMonths) / 12;

  return {
    totalInterestYourRate: round2(yours),
    totalInterestBetterRate: round2(better),
    extraInterest: round2(yours - better),
    interestPerMile: miles > 0 ? Math.round((yours / miles) * 1000) / 1000 : 0,
  };
};

// --- 5. Truck Loan Affordability Calculator (owner-operator) -----------------------------
export const truckLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const milesPerMonth = Math.max(0, safeNumber(values.milesPerMonth, 10000));
  const revenuePerMile = Math.max(0, safeNumber(values.revenuePerMile, 2.2));
  const costPerMile = Math.max(0, safeNumber(values.costPerMile, 1.45));
  const ownerPay = Math.max(0, safeNumber(values.ownerPay, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 11));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 15)));

  const revenue = milesPerMonth * revenuePerMile;
  const costs = milesPerMonth * costPerMile;
  const left = Math.max(0, revenue - costs - ownerPay);
  const maxLoan = presentValue(left, annualRatePercent / 100 / 12, termMonths);

  return {
    monthlyRevenue: round2(revenue),
    operatingCosts: round2(costs),
    maxTruckPayment: round2(left),
    maxLoanAmount: round2(maxLoan),
    maxTruckPrice: round2(maxLoan / (1 - downPaymentPercent / 100)),
  };
};

// --- 6. Truck Loan Comparison Calculator (new vs used) -----------------------------------
export const truckLoanComparisonCalculator: CustomCalculator = (values) => {
  const milesPerMonth = Math.max(0, safeNumber(values.milesPerMonth, 10000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 15)));
  const newPrice = Math.max(0, safeNumber(values.newPrice, 165000));
  const newRatePercent = Math.max(0, safeNumber(values.newRatePercent, 9));
  const newTermMonths = Math.max(1, Math.round(safeNumber(values.newTermMonths, 72)));
  const newRepairPerMile = Math.max(0, safeNumber(values.newRepairPerMile, 0.12));
  const usedPrice = Math.max(0, safeNumber(values.usedPrice, 85000));
  const usedRatePercent = Math.max(0, safeNumber(values.usedRatePercent, 13));
  const usedTermMonths = Math.max(1, Math.round(safeNumber(values.usedTermMonths, 48)));
  const usedRepairPerMile = Math.max(0, safeNumber(values.usedRepairPerMile, 0.25));

  const k = 1 - downPaymentPercent / 100;
  const pNew = payment(newPrice * k, newRatePercent / 100 / 12, newTermMonths);
  const pUsed = payment(usedPrice * k, usedRatePercent / 100 / 12, usedTermMonths);
  const cNew = pNew + newRepairPerMile * milesPerMonth;
  const cUsed = pUsed + usedRepairPerMile * milesPerMonth;

  return {
    newTruckPayment: round2(pNew),
    usedTruckPayment: round2(pUsed),
    newMonthlyCost: round2(cNew),
    usedMonthlyCost: round2(cUsed),
    monthlySavingsWithUsed: round2(cNew - cUsed),
  };
};

// --- 7. Truck Loan Eligibility Calculator --------------------------------------------------
export const truckLoanEligibilityCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 150000));
  const downPaymentAvailable = Math.max(0, safeNumber(values.downPaymentAvailable, 20000));
  const creditScore = Math.min(850, Math.max(300, safeNumber(values.creditScore, 640)));
  const yearsCdl = Math.max(0, safeNumber(values.yearsCdl, 3));
  const yearsInBusiness = Math.max(0, safeNumber(values.yearsInBusiness, 1));

  const requiredPercent = (yearsInBusiness < 2 ? 20 : 10) + (creditScore < 600 ? 10 : 0);
  const required = (price * requiredPercent) / 100;
  let passed = 0;
  if (creditScore >= 600) passed++;
  if (yearsCdl >= 2) passed++;
  if (downPaymentAvailable >= required) passed++;

  return {
    requiredDownPercent: requiredPercent,
    requiredDownPayment: round2(required),
    downPaymentGap: round2(Math.max(0, required - downPaymentAvailable)),
    checksPassed: passed,
  };
};

// --- 8. Trailer Loan Calculator (incl. full cost) ------------------------------------------
export const trailerLoanCalculator: CustomCalculator = (values) => {
  const price = Math.max(0, safeNumber(values.price, 12000));
  const downPayment = Math.max(0, safeNumber(values.downPayment, 1500));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 6));
  const fees = Math.max(0, safeNumber(values.fees, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 60)));

  const tax = (price * salesTaxPercent) / 100;
  const financed = Math.max(0, price + tax + fees - downPayment);
  const pmt = payment(financed, annualRatePercent / 100 / 12, termMonths);
  const interest = pmt * termMonths - financed;

  return {
    salesTax: round2(tax),
    amountFinanced: round2(financed),
    monthlyPayment: round2(pmt),
    totalInterest: round2(interest),
    totalCost: round2(price + tax + fees + interest),
  };
};

// --- 9. Trailer Loan Payment Calculator (36 / 60 / 120 months) -----------------------------
export const trailerLoanPaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 25000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 9));

  const i = annualRatePercent / 100 / 12;
  const p36 = payment(loanAmount, i, 36);
  const p60 = payment(loanAmount, i, 60);
  const p120 = payment(loanAmount, i, 120);

  return {
    payment36: round2(p36),
    payment60: round2(p60),
    payment120: round2(p120),
    interest36: round2(p36 * 36 - loanAmount),
    interest60: round2(p60 * 60 - loanAmount),
    interest120: round2(p120 * 120 - loanAmount),
  };
};

// --- 10. Trailer Loan Payoff Calculator (extra + lump sum) ---------------------------------
export const trailerLoanPayoffCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 15000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 10));
  const remainingMonths = Math.max(1, Math.round(safeNumber(values.remainingMonths, 84)));
  const extraMonthly = Math.max(0, safeNumber(values.extraMonthly, 100));
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 1000));

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

export const loanTruckTrailerCustomCalculators: Record<string, CustomCalculator> = {
  "truck-loan-calculator": truckLoanCalculator,
  "truck-loan-payment-calculator": truckLoanPaymentCalculator,
  "truck-loan-payoff-calculator": truckLoanPayoffCalculator,
  "truck-loan-interest-calculator": truckLoanInterestCalculator,
  "truck-loan-affordability-calculator": truckLoanAffordabilityCalculator,
  "truck-loan-comparison-calculator": truckLoanComparisonCalculator,
  "truck-loan-eligibility-calculator": truckLoanEligibilityCalculator,
  "trailer-loan-calculator": trailerLoanCalculator,
  "trailer-loan-payment-calculator": trailerLoanPaymentCalculator,
  "trailer-loan-payoff-calculator": trailerLoanPayoffCalculator,
};
