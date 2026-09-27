/**
 * Batch: "Mortgage Calculators" — sub-batch C: Refinance & Loan Programs
 * (11 tools). Part of the Mortgage_Topical_Map_Large_Tool_List.xlsx
 * build-out (36 tools total, split into 3 sub-batches — see
 * calc-engine-mortgage-core.ts and calc-engine-mortgage-payment-
 * strategies.ts for the other two). Filed under the site's "Mortgage
 * Calculators" category (mortgage-calculators). Last of the 3 sub-batches.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention. FHA/VA/USDA/Jumbo are genuinely
 * distinct real-world loan programs with their own fee structures, not
 * formula clones of one another.
 *
 * See prisma/create-mortgage-refinance-programs-calculators.ts for the
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

// --- 1. Mortgage Refinance Calculator (current loan vs. new refinance loan) -
export const mortgageRefinanceCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const currentAnnualInterestRate = Math.max(0, safeNumber(values.currentAnnualInterestRate));
  const currentRemainingTermYears = Math.max(1, safeNumber(values.currentRemainingTermYears, 25));
  const newAnnualInterestRate = Math.max(0, safeNumber(values.newAnnualInterestRate));
  const newLoanTermYears = Math.max(1, safeNumber(values.newLoanTermYears, 30));

  const rCurrent = currentAnnualInterestRate / 100 / 12;
  const nCurrent = currentRemainingTermYears * 12;
  const currentPayment = annuityPayment(currentBalance, rCurrent, nCurrent);

  const rNew = newAnnualInterestRate / 100 / 12;
  const nNew = newLoanTermYears * 12;
  const newPayment = annuityPayment(currentBalance, rNew, nNew);

  const totalInterestCurrent = currentPayment * nCurrent - currentBalance;
  const totalInterestNew = newPayment * nNew - currentBalance;

  return {
    currentPayment: round2(currentPayment),
    newPayment: round2(newPayment),
    monthlySavings: round2(currentPayment - newPayment),
    lifetimeInterestSavings: round2(totalInterestCurrent - totalInterestNew),
  };
};

// --- 2. Refinance Break-Even Calculator (decision-focused, takes payments directly)
// Distinct from the Mortgage Refinance Calculator above: takes your current
// and new PAYMENTS directly (from lender quotes) rather than deriving them
// from rate/term, and focuses purely on the break-even/net-savings decision
// over your own planned time in the home.
export const refinanceBreakEvenCalculator: CustomCalculator = (values) => {
  const currentMonthlyPayment = Math.max(0, safeNumber(values.currentMonthlyPayment));
  const newMonthlyPayment = Math.max(0, safeNumber(values.newMonthlyPayment));
  const refinanceClosingCosts = Math.max(0, safeNumber(values.refinanceClosingCosts));
  const planningToStayYears = Math.max(0.5, safeNumber(values.planningToStayYears, 5));

  const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(refinanceClosingCosts / monthlySavings) : 0;
  const netSavingsOverHorizon = monthlySavings * planningToStayYears * 12 - refinanceClosingCosts;

  return {
    monthlySavings: round2(monthlySavings),
    breakEvenMonths,
    netSavingsOverHorizon: round2(netSavingsOverHorizon),
  };
};

// --- 3. Cash-Out Refinance Calculator ----------------------------------------
export const cashOutRefinanceCalculator: CustomCalculator = (values) => {
  const homeValue = Math.max(0.01, safeNumber(values.homeValue));
  const currentLoanBalance = Math.max(0, safeNumber(values.currentLoanBalance));
  const cashOutAmount = Math.max(0, safeNumber(values.cashOutAmount));
  const newAnnualInterestRate = Math.max(0, safeNumber(values.newAnnualInterestRate));
  const newLoanTermYears = Math.max(1, safeNumber(values.newLoanTermYears, 30));
  const maxLtvPercent = Math.max(1, safeNumber(values.maxLtvPercent, 80));

  const newLoanAmount = currentLoanBalance + cashOutAmount;
  const maxLoanAllowed = homeValue * (maxLtvPercent / 100);
  const resultingLtvPercent = (newLoanAmount / homeValue) * 100;
  const withinLtvLimit = newLoanAmount <= maxLoanAllowed ? 1 : 0;

  const monthlyRate = newAnnualInterestRate / 100 / 12;
  const numPayments = newLoanTermYears * 12;
  const newPayment = annuityPayment(newLoanAmount, monthlyRate, numPayments);

  return {
    newLoanAmount: round2(newLoanAmount),
    resultingLtvPercent: round2(resultingLtvPercent),
    withinLtvLimit,
    newPayment: round2(newPayment),
  };
};

// --- 4. Mortgage Recast Calculator --------------------------------------------
// Distinct mechanism from the Mortgage Prepayment / Extra Payment
// calculators: a recast applies a lump sum to reduce your balance but keeps
// the SAME remaining term, lowering your payment rather than shortening
// your term.
export const mortgageRecastCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const remainingTermYears = Math.max(1, safeNumber(values.remainingTermYears, 25));
  const lumpSumPrincipalPayment = Math.max(0, safeNumber(values.lumpSumPrincipalPayment));

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = remainingTermYears * 12;
  const oldPayment = annuityPayment(currentBalance, monthlyRate, numPayments);
  const newBalance = Math.max(0, currentBalance - lumpSumPrincipalPayment);
  const newPayment = annuityPayment(newBalance, monthlyRate, numPayments);

  return {
    oldPayment: round2(oldPayment),
    newBalance: round2(newBalance),
    newPayment: round2(newPayment),
    monthlySavings: round2(oldPayment - newPayment),
  };
};

// --- 5. FHA Loan Calculator ----------------------------------------------------
export const fhaLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentPercent = Math.max(3.5, safeNumber(values.downPaymentPercent, 3.5));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const upfrontMipPercent = Math.max(0, safeNumber(values.upfrontMipPercent, 1.75));
  const annualMipPercent = Math.max(0, safeNumber(values.annualMipPercent, 0.55));

  const loanBeforeMip = homePrice * (1 - downPaymentPercent / 100);
  const upfrontMip = loanBeforeMip * (upfrontMipPercent / 100);
  const totalLoanAmount = loanBeforeMip + upfrontMip;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPI = annuityPayment(totalLoanAmount, monthlyRate, numPayments);
  const monthlyMip = (totalLoanAmount * (annualMipPercent / 100)) / 12;

  return {
    loanAmount: round2(totalLoanAmount),
    upfrontMip: round2(upfrontMip),
    monthlyMip: round2(monthlyMip),
    totalMonthlyPayment: round2(monthlyPI + monthlyMip),
  };
};

// --- 6. VA Loan Calculator -----------------------------------------------------
// Distinct from FHA: no monthly mortgage insurance at all (a key VA
// benefit) — instead a one-time funding fee, and 0% down payment support.
export const vaLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 0));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const vaFundingFeePercent = Math.max(0, safeNumber(values.vaFundingFeePercent, 2.15));

  const loanBeforeFee = homePrice * (1 - downPaymentPercent / 100);
  const fundingFee = loanBeforeFee * (vaFundingFeePercent / 100);
  const totalLoanAmount = loanBeforeFee + fundingFee;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(totalLoanAmount, monthlyRate, numPayments);

  return {
    loanAmount: round2(totalLoanAmount),
    fundingFee: round2(fundingFee),
    monthlyPayment: round2(monthlyPayment),
  };
};

// --- 7. USDA Loan Calculator ---------------------------------------------------
// Distinct fee structure again: an upfront guarantee fee plus a smaller
// ongoing ANNUAL fee (paid monthly), rather than FHA's larger monthly MIP
// or VA's no ongoing fee at all.
export const usdaLoanCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 0));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const upfrontGuaranteeFeePercent = Math.max(0, safeNumber(values.upfrontGuaranteeFeePercent, 1));
  const annualFeePercent = Math.max(0, safeNumber(values.annualFeePercent, 0.35));

  const loanBeforeFee = homePrice * (1 - downPaymentPercent / 100);
  const guaranteeFee = loanBeforeFee * (upfrontGuaranteeFeePercent / 100);
  const totalLoanAmount = loanBeforeFee + guaranteeFee;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPI = annuityPayment(totalLoanAmount, monthlyRate, numPayments);
  const monthlyAnnualFee = (totalLoanAmount * (annualFeePercent / 100)) / 12;

  return {
    loanAmount: round2(totalLoanAmount),
    guaranteeFee: round2(guaranteeFee),
    monthlyAnnualFee: round2(monthlyAnnualFee),
    totalMonthlyPayment: round2(monthlyPI + monthlyAnnualFee),
  };
};

// --- 8. Jumbo Mortgage Calculator ----------------------------------------------
export const jumboMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentAmount = Math.max(0, safeNumber(values.downPaymentAmount));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const conformingLoanLimit = Math.max(1, safeNumber(values.conformingLoanLimit, 766550));

  const loanAmount = Math.max(0, homePrice - downPaymentAmount);
  const isJumbo = loanAmount > conformingLoanLimit ? 1 : 0;
  const amountOverConformingLimit = Math.max(0, loanAmount - conformingLoanLimit);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);

  return {
    loanAmount: round2(loanAmount),
    isJumbo,
    amountOverConformingLimit: round2(amountOverConformingLimit),
    monthlyPayment: round2(monthlyPayment),
  };
};

// --- 9. First-Time Home Buyer Mortgage Calculator -----------------------------
// Distinct framing from Mortgage/Home Loan Calculators: centers on total
// CASH NEEDED AT CLOSING (down payment + closing costs minus any seller
// credit) rather than just the loan payment — the first-time-buyer-specific
// concern.
export const firstTimeHomeBuyerMortgageCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 3));
  const annualInterestRate = Math.max(0, safeNumber(values.annualInterestRate));
  const loanTermYears = Math.max(1, safeNumber(values.loanTermYears, 30));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const sellerCreditPercent = Math.max(0, safeNumber(values.sellerCreditPercent, 0));

  const loanAmount = homePrice * (1 - downPaymentPercent / 100);
  const downPaymentAmount = homePrice * (downPaymentPercent / 100);
  const estimatedClosingCosts = homePrice * (closingCostPercent / 100);
  const sellerCredit = homePrice * (sellerCreditPercent / 100);
  const cashNeededAtClosing = downPaymentAmount + estimatedClosingCosts - sellerCredit;

  const monthlyRate = annualInterestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment = annuityPayment(loanAmount, monthlyRate, numPayments);

  return {
    downPaymentAmount: round2(downPaymentAmount),
    cashNeededAtClosing: round2(cashNeededAtClosing),
    monthlyPayment: round2(monthlyPayment),
  };
};

// --- 10. Mortgage Tax Deduction Calculator ------------------------------------
export const mortgageTaxDeductionCalculator: CustomCalculator = (values) => {
  const annualMortgageInterestPaid = Math.max(0, safeNumber(values.annualMortgageInterestPaid));
  const propertyTaxesPaid = Math.max(0, safeNumber(values.propertyTaxesPaid));
  const marginalTaxRatePercent = Math.max(0, safeNumber(values.marginalTaxRatePercent, 24));

  // Federal SALT (state and local tax) deduction cap, which includes
  // property taxes, is $10,000 combined — a simplification that assumes no
  // other state/local taxes are competing for that cap.
  const SALT_CAP = 10000;
  const deductiblePropertyTax = Math.min(propertyTaxesPaid, SALT_CAP);
  const totalDeduction = annualMortgageInterestPaid + deductiblePropertyTax;
  const estimatedTaxSavings = totalDeduction * (marginalTaxRatePercent / 100);

  return {
    deductiblePropertyTax: round2(deductiblePropertyTax),
    totalDeduction: round2(totalDeduction),
    estimatedTaxSavings: round2(estimatedTaxSavings),
  };
};

// --- 11. Mortgage Comparison Calculator ---------------------------------------
// A generic side-by-side of two COMPLETE loan offers (own rate, term, and
// fees each) — distinct from the Mortgage Term Comparison Calculator
// (same rate, different terms only) and the fixed 15-vs-30 pairing, since
// here both rate and term can differ freely between two arbitrary offers,
// with fees factored into total cost.
export const mortgageComparisonCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount));
  const rateA = Math.max(0, safeNumber(values.rateA, 6.5));
  const termAYears = Math.max(1, safeNumber(values.termAYears, 30));
  const feesA = Math.max(0, safeNumber(values.feesA, 0));
  const rateB = Math.max(0, safeNumber(values.rateB, 6));
  const termBYears = Math.max(1, safeNumber(values.termBYears, 15));
  const feesB = Math.max(0, safeNumber(values.feesB, 0));

  const nA = termAYears * 12;
  const paymentA = annuityPayment(loanAmount, rateA / 100 / 12, nA);
  const totalCostA = paymentA * nA + feesA;

  const nB = termBYears * 12;
  const paymentB = annuityPayment(loanAmount, rateB / 100 / 12, nB);
  const totalCostB = paymentB * nB + feesB;

  return {
    paymentA: round2(paymentA),
    paymentB: round2(paymentB),
    totalCostA: round2(totalCostA),
    totalCostB: round2(totalCostB),
    costDifference: round2(totalCostA - totalCostB),
  };
};

export const mortgageRefinanceProgramsCustomCalculators: Record<string, CustomCalculator> = {
  "mortgage-refinance-calculator": mortgageRefinanceCalculator,
  "refinance-break-even-calculator": refinanceBreakEvenCalculator,
  "cash-out-refinance-calculator": cashOutRefinanceCalculator,
  "mortgage-recast-calculator": mortgageRecastCalculator,
  "fha-loan-calculator": fhaLoanCalculator,
  "va-loan-calculator": vaLoanCalculator,
  "usda-loan-calculator": usdaLoanCalculator,
  "jumbo-mortgage-calculator": jumboMortgageCalculator,
  "first-time-home-buyer-mortgage-calculator": firstTimeHomeBuyerMortgageCalculator,
  "mortgage-tax-deduction-calculator": mortgageTaxDeductionCalculator,
  "mortgage-comparison-calculator": mortgageComparisonCalculator,
};
