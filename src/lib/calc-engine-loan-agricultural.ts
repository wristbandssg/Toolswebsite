/**
 * Batch: "Loan Calculators" expansion 3 (3 Oct 2026), sub-batch 8 of 11 —
 * Agricultural Loans (7 tools), filed under Loan Calculators > General Loan
 * Calculators (next to the farm-equipment-loan-* tools). See
 * calc-engine-loan-sba.ts for the full batch context.
 *
 * Kept distinct from the farm equipment tools (machinery, trade-ins,
 * Section 179): these cover farmland, operating loans and the farm's
 * overall finances, with annual or semi-annual payments as farm lenders use:
 *  - agriculturalLoan: farmland purchase by price per acre -> loan,
 *    payment per period and per acre.
 *  - agriculturalLoanPayment: a seasonal operating loan drawn through the
 *    season and repaid in one payment at harvest.
 *  - agriculturalLoanPayoff: a land loan with extra principal every year.
 *  - agriculturalLoanInterest: the USDA FSA Down Payment Loan structure
 *    (5% down, FSA 45% at a low fixed rate over 20 years, a commercial
 *    lender 50%) vs financing 95% commercially.
 *  - agriculturalLoanAffordability: per-acre net income -> maximum land
 *    price per acre.
 *  - agriculturalLoanComparison: buying land vs cash-renting it.
 *  - agriculturalLoanEligibility: the farm ratios lenders check — current
 *    ratio, debt-to-asset and term debt coverage — against common
 *    benchmarks (1.3, 60%, 1.25).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-loan-agricultural-calculators.ts for the copy.
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

// --- 1. Agricultural Loan Calculator (farmland) -------------------------------------
export const agriculturalLoanCalculator: CustomCalculator = (values) => {
  const pricePerAcre = Math.max(0, safeNumber(values.pricePerAcre, 9000));
  const acres = Math.max(0, safeNumber(values.acres, 160));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 25)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const raw = Math.round(safeNumber(values.paymentsPerYear, 1));
  const perYear = [1, 2, 12].includes(raw) ? raw : 1;

  const price = pricePerAcre * acres;
  const down = (price * downPaymentPercent) / 100;
  const loan = price - down;
  const n = termYears * perYear;
  const pmt = payment(loan, annualRatePercent / 100 / perYear, n);

  return {
    landPrice: round2(price),
    downPayment: round2(down),
    loanAmount: round2(loan),
    paymentPerPeriod: round2(pmt),
    paymentPerAcrePerYear: round2(acres > 0 ? (pmt * perYear) / acres : 0),
    totalInterest: round2(pmt * n - loan),
  };
};

// --- 2. Agricultural Loan Payment Calculator (operating loan due at harvest) --------
export const agriculturalLoanPaymentCalculator: CustomCalculator = (values) => {
  const operatingBudget = Math.max(0, safeNumber(values.operatingBudget, 300000));
  const acres = Math.max(0, safeNumber(values.acres, 1000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 8));
  const avgMonthsOutstanding = Math.max(0, safeNumber(values.avgMonthsOutstanding, 6));

  const interest = (operatingBudget * annualRatePercent * avgMonthsOutstanding) / 1200;

  return {
    interestCost: round2(interest),
    paymentDueAtHarvest: round2(operatingBudget + interest),
    interestPerAcre: round2(acres > 0 ? interest / acres : 0),
    costPerAcreIncludingInterest: round2(acres > 0 ? (operatingBudget + interest) / acres : 0),
  };
};

// --- 3. Agricultural Loan Payoff Calculator (extra principal each year) -------------
export const agriculturalLoanPayoffCalculator: CustomCalculator = (values) => {
  const loanAmount = Math.max(0, safeNumber(values.loanAmount, 800000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const extraAnnual = Math.max(0, safeNumber(values.extraAnnual, 15000));

  const r = annualRatePercent / 100;
  const pmt = payment(loanAmount, r, termYears);
  let b = loanAmount;
  let years = 0;
  let interest = 0;
  while (b > 0.005 && years < termYears) {
    const int = b * r;
    interest += int;
    b = b + int - Math.min(pmt + extraAnnual, b + int);
    years++;
  }

  return {
    annualPayment: round2(pmt),
    yearsToPayoff: years,
    yearsSaved: termYears - years,
    interestSaved: round2(Math.max(0, pmt * termYears - loanAmount - interest)),
  };
};

// --- 4. Agricultural Loan Interest Calculator (FSA Down Payment Loan) ---------------
export const agriculturalLoanInterestCalculator: CustomCalculator = (values) => {
  const landPrice = Math.max(0, safeNumber(values.landPrice, 1000000));
  const fsaRatePercent = Math.max(0, safeNumber(values.fsaRatePercent, 1.5));
  const fsaTermYears = Math.max(1, Math.round(safeNumber(values.fsaTermYears, 20)));
  const commercialRatePercent = Math.max(0, safeNumber(values.commercialRatePercent, 7));
  const commercialTermYears = Math.max(1, Math.round(safeNumber(values.commercialTermYears, 30)));

  const fsaLoan = landPrice * 0.45;
  const commercialLoan = landPrice * 0.5;
  const fsaPmt = payment(fsaLoan, fsaRatePercent / 100, fsaTermYears);
  const comPmt = payment(commercialLoan, commercialRatePercent / 100, commercialTermYears);
  const fsaInterest = fsaPmt * fsaTermYears - fsaLoan;
  const comInterest = comPmt * commercialTermYears - commercialLoan;
  const allLoan = landPrice * 0.95;
  const allInterest = payment(allLoan, commercialRatePercent / 100, commercialTermYears) * commercialTermYears - allLoan;

  return {
    fsaLoan: round2(fsaLoan),
    fsaInterest: round2(fsaInterest),
    commercialLoan: round2(commercialLoan),
    commercialInterest: round2(comInterest),
    annualPaymentsFirstYears: round2(fsaPmt + comPmt),
    interestSavedVsAllCommercial: round2(allInterest - fsaInterest - comInterest),
  };
};

// --- 5. Agricultural Loan Affordability Calculator (max price per acre) -------------
export const agriculturalLoanAffordabilityCalculator: CustomCalculator = (values) => {
  const netIncomePerAcre = Math.max(0, safeNumber(values.netIncomePerAcre, 350));
  const propertyTaxPerAcre = Math.max(0, safeNumber(values.propertyTaxPerAcre, 30));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const termYears = Math.max(1, Math.round(safeNumber(values.termYears, 25)));
  const downPaymentPercent = Math.min(99, Math.max(0, safeNumber(values.downPaymentPercent, 25)));

  const maxPmt = Math.max(0, netIncomePerAcre - propertyTaxPerAcre);
  const maxLoan = presentValue(maxPmt, annualRatePercent / 100, termYears);
  const maxPrice = maxLoan / (1 - downPaymentPercent / 100);

  return {
    maxAnnualPaymentPerAcre: round2(maxPmt),
    maxLoanPerAcre: round2(maxLoan),
    maxPricePerAcre: round2(maxPrice),
    downPaymentPerAcre: round2(maxPrice - maxLoan),
  };
};

// --- 6. Agricultural Loan Comparison Calculator (buy vs cash rent) -------------------
export const agriculturalLoanComparisonCalculator: CustomCalculator = (values) => {
  const pricePerAcre = Math.max(0, safeNumber(values.pricePerAcre, 9000));
  const downPaymentPercent = Math.min(100, Math.max(0, safeNumber(values.downPaymentPercent, 25)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.75));
  const propertyTaxPerAcre = Math.max(0, safeNumber(values.propertyTaxPerAcre, 30));
  const opportunityRatePercent = Math.max(0, safeNumber(values.opportunityRatePercent, 4));
  const cashRentPerAcre = Math.max(0, safeNumber(values.cashRentPerAcre, 250));
  const appreciationPercent = safeNumber(values.appreciationPercent, 3);

  const down = (pricePerAcre * downPaymentPercent) / 100;
  const loan = pricePerAcre - down;
  const own = (loan * annualRatePercent) / 100 + propertyTaxPerAcre + (down * opportunityRatePercent) / 100;
  const appreciation = (pricePerAcre * appreciationPercent) / 100;

  return {
    ownershipCostPerAcre: round2(own),
    cashRentPerAcre: round2(cashRentPerAcre),
    extraCostToOwn: round2(own - cashRentPerAcre),
    appreciationPerAcre: round2(appreciation),
    netAdvantageOfOwning: round2(appreciation - (own - cashRentPerAcre)),
    breakEvenAppreciationPercent: round2(pricePerAcre > 0 ? ((own - cashRentPerAcre) / pricePerAcre) * 100 : 0),
  };
};

// --- 7. Agricultural Loan Eligibility Calculator (farm ratios) ----------------------
export const agriculturalLoanEligibilityCalculator: CustomCalculator = (values) => {
  const currentAssets = Math.max(0, safeNumber(values.currentAssets, 450000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 250000));
  const totalAssets = Math.max(0, safeNumber(values.totalAssets, 3000000));
  const totalLiabilities = Math.max(0, safeNumber(values.totalLiabilities, 1100000));
  const incomeForDebt = Math.max(0, safeNumber(values.incomeForDebt, 220000));
  const annualDebtPayments = Math.max(0, safeNumber(values.annualDebtPayments, 160000));

  const cr = currentLiabilities > 0 ? currentAssets / currentLiabilities : currentAssets > 0 ? 99 : 0;
  const da = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const tdc = annualDebtPayments > 0 ? incomeForDebt / annualDebtPayments : incomeForDebt > 0 ? 99 : 0;
  let passed = 0;
  if (cr >= 1.3) passed++;
  if (totalAssets > 0 && da <= 60) passed++;
  if (tdc >= 1.25) passed++;

  return {
    currentRatio: round2(cr),
    workingCapital: round2(currentAssets - currentLiabilities),
    debtToAssetPercent: round2(da),
    termDebtCoverage: round2(tdc),
    checksPassed: passed,
  };
};

export const loanAgriculturalCustomCalculators: Record<string, CustomCalculator> = {
  "agricultural-loan-calculator": agriculturalLoanCalculator,
  "agricultural-loan-payment-calculator": agriculturalLoanPaymentCalculator,
  "agricultural-loan-payoff-calculator": agriculturalLoanPayoffCalculator,
  "agricultural-loan-interest-calculator": agriculturalLoanInterestCalculator,
  "agricultural-loan-affordability-calculator": agriculturalLoanAffordabilityCalculator,
  "agricultural-loan-comparison-calculator": agriculturalLoanComparisonCalculator,
  "agricultural-loan-eligibility-calculator": agriculturalLoanEligibilityCalculator,
};
