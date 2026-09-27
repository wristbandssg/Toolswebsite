/**
 * Batch: "Mortgage Calculators" — sub-batch B: Payment Strategies & Term
 * Comparison (10 tools). Part of the Mortgage_Topical_Map_Large_Tool_List.xlsx
 * build-out (36 tools total, split into 3 sub-batches — see
 * calc-engine-mortgage-core.ts and calc-engine-mortgage-refinance-
 * programs.ts for the other two). Filed under the site's "Mortgage
 * Calculators" category (mortgage-calculators).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention. Several tools here look similar at a
 * glance (Extra Payment vs Prepayment vs Biweekly; Fixed-Rate vs ARM vs
 * Fixed-vs-ARM; 15-vs-30 vs generic Term Comparison) — each is scoped
 * deliberately differently, documented in that function's own comment.
 *
 * See prisma/create-mortgage-payment-strategies-calculators.ts for the
 * tool content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function annuityPayment(principal: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function remainingBalance(principal: number, monthlyRate: number, numPaymentsTotal: number, numPaymentsMade: number): number {
  if (monthlyRate === 0) return principal * (1 - numPaymentsMade / numPaymentsTotal);
  const fTotal = Math.pow(1 + monthlyRate, numPaymentsTotal);
  const fPaid = Math.pow(1 + monthlyRate, numPaymentsMade);
  return (principal * (fTotal - fPaid)) / (fTotal - 1);
}

function simulatePayoff(startingBalance: number, monthlyPayment: number, monthlyRate: number) {
  let balance = startingBalance;
  let months = 0;
  let totalInterest = 0;
  const CAP = 600;
  while (balance > 0 && months < CAP) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    if (principal <= 0) {
      months = CAP;
      break;
    }
    balance -= principal;
    totalInterest += interest;
    months += 1;
  }
  return { months, totalInterest, balance: Math.max(0, balance) };
}

// --- 1. Extra Mortgage Payment Calculator (recurring extra, vs. baseline) ---
// Compares your ORIGINAL scheduled payoff against adding a fixed extra
// amount to EVERY monthly payment going forward.
export const extraMortgagePaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const extraMonthlyPayment = Math.max(0, safeNumber(values.extraMonthlyPayment));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const baselinePayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const baselineTotalInterest = baselinePayment * numPayments - loanAmount;

  const { months: monthsWithExtra, totalInterest: interestWithExtra } = simulatePayoff(
    loanAmount,
    baselinePayment + extraMonthlyPayment,
    monthlyRate
  );

  return {
    baselinePayment: round2(baselinePayment),
    monthsSaved: numPayments - monthsWithExtra,
    interestSaved: round2(baselineTotalInterest - interestWithExtra),
    newPayoffMonths: monthsWithExtra,
  };
};

// --- 2. Mortgage Prepayment Calculator (one-time lump sum) -------------------
// Distinct from Extra Payment above: models a SINGLE one-time lump-sum
// principal payment applied at a chosen month, rather than a recurring
// monthly addition.
export const mortgagePrepaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const lumpSumPrepayment = Math.max(0, safeNumber(values.lumpSumPrepayment));
  const prepaymentMonth = Math.max(1, Math.round(safeNumber(values.prepaymentMonth, 12)));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const payment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const baselineTotalInterest = payment * numPayments - loanAmount;

  let balance = loanAmount;
  let months = 0;
  let totalInterest = 0;
  for (let m = 1; m <= prepaymentMonth; m++) {
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    balance -= principal;
    totalInterest += interest;
    months += 1;
  }
  balance = Math.max(0, balance - lumpSumPrepayment);

  const CAP = 600;
  while (balance > 0 && months < CAP) {
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    if (principal <= 0) {
      months = CAP;
      break;
    }
    balance -= principal;
    totalInterest += interest;
    months += 1;
  }

  return {
    monthlyPayment: round2(payment),
    monthsToPayoff: months,
    totalInterestPaid: round2(totalInterest),
    interestSavedVsBaseline: round2(baselineTotalInterest - totalInterest),
  };
};

// --- 3. Biweekly Mortgage Payment Calculator ---------------------------------
// Models the standard biweekly-payment technique (half the monthly payment
// every 2 weeks = 26 half-payments = 13 monthly-equivalent payments per
// year, one more than a normal 12) as an equivalent accelerated monthly
// schedule.
export const biweeklyMortgagePaymentCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const biweeklyPayment = monthlyPayment / 2;
  const baselineTotalInterest = monthlyPayment * numPayments - loanAmount;

  // 26 biweekly half-payments/year = 13 monthly-equivalent payments/year,
  // modeled as an effective monthly payment of monthlyPayment * 13/12.
  const effectiveMonthlyPayment = (monthlyPayment * 13) / 12;
  const { months, totalInterest } = simulatePayoff(loanAmount, effectiveMonthlyPayment, monthlyRate);

  return {
    monthlyPayment: round2(monthlyPayment),
    biweeklyPayment: round2(biweeklyPayment),
    yearsToPayoff: round2(months / 12),
    interestSaved: round2(baselineTotalInterest - totalInterest),
  };
};

// --- 4. 15-Year vs 30-Year Mortgage Calculator (fixed pairing, own rates) ---
export const fifteenVsThirtyYearMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const rate15Year = Math.max(0, safeNumber(values.rate15Year, 5.75));
  const rate30Year = Math.max(0, safeNumber(values.rate30Year, 6.5));

  const n15 = 15 * 12;
  const n30 = 30 * 12;
  const payment15 = annuityPayment(loanAmount, rate15Year / 100 / 12, n15);
  const payment30 = annuityPayment(loanAmount, rate30Year / 100 / 12, n30);
  const totalInterest15 = payment15 * n15 - loanAmount;
  const totalInterest30 = payment30 * n30 - loanAmount;

  return {
    payment15Year: round2(payment15),
    payment30Year: round2(payment30),
    monthlyDifference: round2(payment15 - payment30),
    lifetimeInterestSavingsWith15: round2(totalInterest30 - totalInterest15),
  };
};

// --- 5. Mortgage Term Comparison Calculator (any two terms, same rate) -----
// Distinct from the 15-vs-30 tool above: isolates the pure effect of loan
// LENGTH by holding the rate constant and letting the user pick any two
// terms to compare, rather than a fixed 15-vs-30 pairing with independently
// quoted rates.
export const mortgageTermComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate, 6.5));
  const termAYears = Math.max(1, safeNumber(values.termAYears, 20));
  const termBYears = Math.max(1, safeNumber(values.termBYears, 30));

  const monthlyRate = annualInterestRate / 100 / 12;
  const nA = termAYears * 12;
  const nB = termBYears * 12;
  const paymentA = annuityPayment(loanAmount, monthlyRate, nA);
  const paymentB = annuityPayment(loanAmount, monthlyRate, nB);
  const totalInterestA = paymentA * nA - loanAmount;
  const totalInterestB = paymentB * nB - loanAmount;

  return {
    paymentA: round2(paymentA),
    paymentB: round2(paymentB),
    monthlyDifference: round2(paymentA - paymentB),
    interestDifference: round2(totalInterestB - totalInterestA),
  };
};

// --- 6. Fixed-Rate Mortgage Calculator (front-loaded interest view) ---------
// Distinct from the basic Mortgage Calculator (sub-batch A): highlights how
// front-loaded interest is on a fixed-rate loan by showing the interest
// paid in just the first 5 years and what share of lifetime interest that
// represents.
export const fixedRateMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate, 6.5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const totalInterest = monthlyPayment * numPayments - loanAmount;

  const monthsInFirst5 = Math.min(60, numPayments);
  const balanceAt5 = remainingBalance(loanAmount, monthlyRate, numPayments, monthsInFirst5);
  const principalPaidFirst5 = loanAmount - balanceAt5;
  const interestPaidFirst5 = monthlyPayment * monthsInFirst5 - principalPaidFirst5;
  const percentOfTotalInterestFirst5 = totalInterest > 0 ? (interestPaidFirst5 / totalInterest) * 100 : 0;

  return {
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
    interestPaidFirst5Years: round2(interestPaidFirst5),
    percentOfTotalInterestFirst5Years: round2(percentOfTotalInterestFirst5),
  };
};

// --- 7. Adjustable-Rate Mortgage (ARM) Calculator ---------------------------
// Two-phase model: an initial fixed-rate period, then a rate reset (using
// the user's own estimate of the future rate, since no live rate feed is
// used) with the payment recalculated over the remaining term.
export const armCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const initialRatePercent = Math.max(0, safeNumber(values.initialRatePercent, 5.5));
  const initialFixedPeriodYears = Math.max(1, safeNumber(values.initialFixedPeriodYears, 5));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const expectedRateAfterAdjustment = Math.max(0, safeNumber(values.expectedRateAfterAdjustment, 7));

  const numPayments = loanTermYears * 12;
  const r1 = initialRatePercent / 100 / 12;
  const initialMonthlyPayment = annuityPayment(loanAmount, r1, numPayments);
  const resetMonth = Math.min(initialFixedPeriodYears * 12, numPayments);
  const balanceAtRateReset = remainingBalance(loanAmount, r1, numPayments, resetMonth);
  const remainingTermMonths = Math.max(1, numPayments - resetMonth);
  const r2 = expectedRateAfterAdjustment / 100 / 12;
  const newMonthlyPaymentAfterReset = annuityPayment(balanceAtRateReset, r2, remainingTermMonths);

  return {
    initialMonthlyPayment: round2(initialMonthlyPayment),
    balanceAtRateReset: round2(balanceAtRateReset),
    newMonthlyPaymentAfterReset: round2(newMonthlyPaymentAfterReset),
    monthlyPaymentChange: round2(newMonthlyPaymentAfterReset - initialMonthlyPayment),
  };
};

// --- 8. Fixed-Rate vs ARM Calculator (horizon-based total cost comparison) --
// Distinct from the standalone ARM Calculator above: compares TOTAL cost of
// a fixed-rate loan against an ARM over the borrower's own planned horizon
// (which may fall entirely within, or extend past, the ARM's initial fixed
// period), rather than just reporting the ARM's own payment change.
export const fixedRateVsArmCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const fixedRatePercent = Math.max(0, safeNumber(values.fixedRatePercent, 6.5));
  const armInitialRatePercent = Math.max(0, safeNumber(values.armInitialRatePercent, 5.5));
  const armInitialFixedPeriodYears = Math.max(1, safeNumber(values.armInitialFixedPeriodYears, 5));
  const armExpectedRateAfterAdjustment = Math.max(0, safeNumber(values.armExpectedRateAfterAdjustment, 7));
  const comparisonHorizonYears = Math.max(1, safeNumber(values.comparisonHorizonYears, 7));

  const numPayments = loanTermYears * 12;
  const fixedPayment = annuityPayment(loanAmount, fixedRatePercent / 100 / 12, numPayments);
  const horizonMonths = comparisonHorizonYears * 12;
  const totalCostFixed = fixedPayment * horizonMonths;

  const r1 = armInitialRatePercent / 100 / 12;
  const armPayment1 = annuityPayment(loanAmount, r1, numPayments);
  const resetMonth = Math.min(armInitialFixedPeriodYears * 12, numPayments);
  const balanceAtReset = remainingBalance(loanAmount, r1, numPayments, resetMonth);
  const remainingTermMonths = Math.max(1, numPayments - resetMonth);
  const r2 = armExpectedRateAfterAdjustment / 100 / 12;
  const armPayment2 = annuityPayment(balanceAtReset, r2, remainingTermMonths);

  let totalCostArm: number;
  if (horizonMonths <= resetMonth) {
    totalCostArm = armPayment1 * horizonMonths;
  } else {
    totalCostArm = armPayment1 * resetMonth + armPayment2 * (horizonMonths - resetMonth);
  }

  const netDifference = totalCostFixed - totalCostArm;

  return {
    totalCostFixed: round2(totalCostFixed),
    totalCostArm: round2(totalCostArm),
    netDifference: round2(netDifference),
  };
};

// --- 9. Interest-Only Mortgage Calculator ------------------------------------
export const interestOnlyMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate, 6.5));
  const interestOnlyPeriodYears = Math.max(1, safeNumber(values.interestOnlyPeriodYears, 10));
  const loanTermYears = Math.max(interestOnlyPeriodYears + 1, safeNumber(values.loanTermYears, 30));

  const monthlyRate = annualInterestRate / 100 / 12;
  const monthlyPaymentDuringIO = loanAmount * monthlyRate;
  const remainingTermMonths = (loanTermYears - interestOnlyPeriodYears) * 12;
  const monthlyPaymentAfterIO = annuityPayment(loanAmount, monthlyRate, remainingTermMonths);

  return {
    monthlyPaymentDuringIO: round2(monthlyPaymentDuringIO),
    monthlyPaymentAfterIO: round2(monthlyPaymentAfterIO),
    paymentIncreaseAmount: round2(monthlyPaymentAfterIO - monthlyPaymentDuringIO),
  };
};

// --- 10. Balloon Mortgage Calculator ------------------------------------------
export const balloonMortgageCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate, 6.5));
  const amortizationYears = Math.max(1, safeNumber(values.amortizationYears, 30));
  const balloonDueYears = Math.max(1, safeNumber(values.balloonDueYears, 7));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = amortizationYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);
  const balloonDueMonth = Math.min(balloonDueYears * 12, numPayments);
  const balloonPaymentDue = remainingBalance(loanAmount, monthlyRate, numPayments, balloonDueMonth);
  const totalPaidBeforeBalloon = monthlyPayment * balloonDueMonth;

  return {
    monthlyPayment: round2(monthlyPayment),
    balloonPaymentDue: round2(balloonPaymentDue),
    totalPaidBeforeBalloon: round2(totalPaidBeforeBalloon),
  };
};

export const mortgagePaymentStrategiesCustomCalculators: Record<string, CustomCalculator> = {
  "extra-mortgage-payment-calculator": extraMortgagePaymentCalculator,
  "mortgage-prepayment-calculator": mortgagePrepaymentCalculator,
  "biweekly-mortgage-payment-calculator": biweeklyMortgagePaymentCalculator,
  "15-year-vs-30-year-mortgage-calculator": fifteenVsThirtyYearMortgageCalculator,
  "mortgage-term-comparison-calculator": mortgageTermComparisonCalculator,
  "fixed-rate-mortgage-calculator": fixedRateMortgageCalculator,
  "adjustable-rate-mortgage-arm-calculator": armCalculator,
  "fixed-rate-vs-arm-calculator": fixedRateVsArmCalculator,
  "interest-only-mortgage-calculator": interestOnlyMortgageCalculator,
  "balloon-mortgage-calculator": balloonMortgageCalculator,
};
