/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 1 of 11 — Life
 * Insurance Core (6 tools), filed under Insurance Calculators > Life
 * Insurance Calculators.
 *
 * Insurance Calculators is a new Finance sub-category (created by these
 * scripts on first run) with 5 sub-categories; homeowners-insurance-calculator
 * moves into Home & Property from Real Estate. The user's 119-keyword list:
 * 1 already built (Home Insurance Premium = homeowners-insurance-calculator)
 * and 45 merged (see each engine header). 73 new tools in 11 sub-batches:
 *  - ins-life-core, ins-life-planning            -> Life Insurance
 *  - ins-health-plans, ins-health-coverage       -> Health Insurance
 *  - ins-auto-core, ins-auto-specialty           -> Auto & Vehicle Insurance
 *  - ins-home-property, ins-home-valuables,
 *    ins-policy-costs                            -> Home & Property Insurance
 *  - ins-business, ins-specialty-personal        -> Business & Specialty Insurance
 * Premiums vary by insurer, state and person, so premium tools take the
 * user's quote or rate and apply documented factors; they don't invent
 * market rates.
 *
 *  - lifeInsuranceNeeds (incl. coverage gap): DIME — debts, income years,
 *    mortgage, education — plus final expenses, less savings and cover.
 *  - termLifeInsurance (incl. pre-existing condition rating): rate per
 *    $1,000 x rating class -> annual/monthly premium, total over the term.
 *  - wholeLifeInsurance (incl. cash value growth): cash value from the
 *    share of premiums credited and the crediting rate; break-even year.
 *  - universalLifeInsurance: account value with rising cost of insurance;
 *    the year it would lapse.
 *  - lifeInsuranceBeneficiaryPayout: lump sum vs insurer installments vs
 *    investing it yourself.
 *  - mortgageLifeInsurance: decreasing mortgage life cover vs level term.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-life-core-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

function payment(principal: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
}

// --- 1. Life Insurance Calculator (needs) ----------------------------------------------
export const lifeInsuranceCalculator: CustomCalculator = (values) => {
  const annualIncome = pos(values.annualIncome, 80000);
  const yearsToReplace = pos(values.yearsToReplace, 10);
  const debts = pos(values.debts, 25000);
  const mortgage = pos(values.mortgage, 250000);
  const children = pos(values.children, 2);
  const educationPerChild = pos(values.educationPerChild, 100000);
  const finalExpenses = pos(values.finalExpenses, 15000);
  const savings = pos(values.savings, 50000);
  const existingCoverage = pos(values.existingCoverage, 250000);

  const need = annualIncome * yearsToReplace + debts + mortgage + children * educationPerChild + finalExpenses;
  const gap = Math.max(0, need - savings - existingCoverage);

  return {
    incomeReplacement: round2(annualIncome * yearsToReplace),
    totalNeed: round2(need),
    resourcesAvailable: round2(savings + existingCoverage),
    coverageGap: round2(gap),
    needAsMultipleOfIncome: round2(annualIncome > 0 ? need / annualIncome : 0),
  };
};

// --- 2. Term Life Insurance Calculator -------------------------------------------------
export const termLifeInsuranceCalculator: CustomCalculator = (values) => {
  const coverage = pos(values.coverage, 500000);
  const ratePer1000 = pos(values.ratePer1000, 0.6);
  const raw = Math.round(safeNumber(values.ratingClass, 2));
  const ratingClass = [1, 2, 3, 4, 5, 6].includes(raw) ? raw : 2;
  const termYears = Math.max(1, Math.round(pos(values.termYears, 20)));
  const policyFee = pos(values.policyFee, 60);

  const factor = [0.8, 1, 1.25, 1.5, 2.5, 3][ratingClass - 1];
  const annual = (coverage / 1000) * ratePer1000 * factor + policyFee;

  return {
    ratingFactor: factor,
    annualPremium: round2(annual),
    monthlyPremium: round2(annual * 0.0875),
    totalPremiumsOverTerm: round2(annual * termYears),
    costPer1000PerYear: round2(coverage > 0 ? (annual / coverage) * 1000 : 0),
  };
};

// --- 3. Whole Life Insurance Calculator ------------------------------------------------
export const wholeLifeInsuranceCalculator: CustomCalculator = (values) => {
  const faceAmount = pos(values.faceAmount, 250000);
  const annualPremium = pos(values.annualPremium, 3000);
  const creditedSharePercent = Math.min(100, pos(values.creditedSharePercent, 70));
  const creditingRatePercent = safeNumber(values.creditingRatePercent, 4);
  const years = Math.max(1, Math.round(pos(values.years, 20)));
  const surrenderChargePercent = Math.min(100, pos(values.surrenderChargePercent, 0));

  let cv = 0;
  let breakEven = 0;
  for (let y = 1; y <= years; y++) {
    // first-year premium mostly pays commissions and setup
    const credited = y === 1 ? 0 : (annualPremium * creditedSharePercent) / 100;
    cv = (cv + credited) * (1 + creditingRatePercent / 100);
    if (!breakEven && cv >= annualPremium * y) breakEven = y;
  }
  const paid = annualPremium * years;

  return {
    totalPremiumsPaid: round2(paid),
    cashValue: round2(cv),
    surrenderValue: round2((cv * (100 - surrenderChargePercent)) / 100),
    deathBenefit: round2(faceAmount),
    cashValueBreakEvenYear: breakEven,
  };
};

// --- 4. Universal Life Insurance Calculator --------------------------------------------
export const universalLifeInsuranceCalculator: CustomCalculator = (values) => {
  const faceAmount = pos(values.faceAmount, 500000);
  const annualPremium = pos(values.annualPremium, 3000);
  const creditingRatePercent = safeNumber(values.creditingRatePercent, 4);
  const coiPer1000 = pos(values.coiPer1000, 1.2);
  const coiIncreasePercent = pos(values.coiIncreasePercent, 9);
  const expenseChargePercent = Math.min(100, pos(values.expenseChargePercent, 5));
  const years = Math.max(1, Math.round(pos(values.years, 45)));

  let av = 0;
  let lapse = 0;
  let at20 = 0;
  for (let y = 1; y <= years; y++) {
    const coi = coiPer1000 * Math.pow(1 + coiIncreasePercent / 100, y - 1);
    const net = annualPremium * (1 - expenseChargePercent / 100);
    const charge = (coi * Math.max(0, faceAmount - av)) / 1000;
    av = (av + net - charge) * (1 + creditingRatePercent / 100);
    if (y === 20) at20 = av;
    if (av < 0 && !lapse) {
      lapse = y;
      av = 0;
      break;
    }
  }

  return {
    firstYearCostOfInsurance: round2((coiPer1000 * faceAmount) / 1000),
    accountValueAtYear20: round2(Math.max(0, at20)),
    accountValueAtEnd: round2(Math.max(0, av)),
    lapseYear: lapse,
  };
};

// --- 5. Life Insurance Beneficiary Payout Calculator -----------------------------------
export const lifeInsuranceBeneficiaryPayoutCalculator: CustomCalculator = (values) => {
  const deathBenefit = pos(values.deathBenefit, 500000);
  const installmentYears = Math.max(1, Math.round(pos(values.installmentYears, 20)));
  const insurerRatePercent = pos(values.insurerRatePercent, 3);
  const ownReturnPercent = pos(values.ownReturnPercent, 5);

  const n = installmentYears * 12;
  const installment = payment(deathBenefit, insurerRatePercent / 100 / 12, n);
  const own = payment(deathBenefit, ownReturnPercent / 100 / 12, n);

  return {
    lumpSum: round2(deathBenefit),
    monthlyInstallment: round2(installment),
    totalFromInstallments: round2(installment * n),
    taxableInterestInInstallments: round2(installment * n - deathBenefit),
    monthlyIfYouInvestIt: round2(own),
  };
};

// --- 6. Mortgage Life Insurance Calculator ---------------------------------------------
export const mortgageLifeInsuranceCalculator: CustomCalculator = (values) => {
  const balance = pos(values.balance, 300000);
  const ratePercent = pos(values.ratePercent, 6.5);
  const yearsLeft = Math.max(1, Math.round(pos(values.yearsLeft, 25)));
  const mortgageLifeMonthly = pos(values.mortgageLifeMonthly, 75);
  const termLifeMonthly = pos(values.termLifeMonthly, 35);
  const checkYear = Math.min(yearsLeft, Math.max(0, Math.round(pos(values.checkYear, 10))));

  const i = ratePercent / 100 / 12;
  const n = yearsLeft * 12;
  const p = payment(balance, i, n);
  const k = checkYear * 12;
  const g = Math.pow(1 + i, k);
  const balAtCheck = i === 0 ? Math.max(0, balance - p * k) : Math.max(0, balance * g - (p * (g - 1)) / i);

  return {
    mortgageLifePayoutAtYear: round2(balAtCheck),
    levelTermPayoutAtYear: round2(balance),
    mortgageLifeTotalCost: round2(mortgageLifeMonthly * n),
    termLifeTotalCost: round2(termLifeMonthly * n),
    savingsWithTermLife: round2((mortgageLifeMonthly - termLifeMonthly) * n),
  };
};

export const insLifeCoreCustomCalculators: Record<string, CustomCalculator> = {
  "life-insurance-calculator": lifeInsuranceCalculator,
  "term-life-insurance-calculator": termLifeInsuranceCalculator,
  "whole-life-insurance-calculator": wholeLifeInsuranceCalculator,
  "universal-life-insurance-calculator": universalLifeInsuranceCalculator,
  "life-insurance-beneficiary-payout-calculator": lifeInsuranceBeneficiaryPayoutCalculator,
  "mortgage-life-insurance-calculator": mortgageLifeInsuranceCalculator,
};
