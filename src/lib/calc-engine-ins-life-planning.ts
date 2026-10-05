/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 2 of 11 — Life
 * Insurance Planning (6 tools), filed under Insurance Calculators > Life
 * Insurance Calculators. See calc-engine-ins-life-core.ts for the full batch
 * context.
 *
 *  - keyPersonLifeInsurance: lost profit while replacing a key person plus
 *    recruiting cost, vs a salary-multiple rule.
 *  - annuityVsLifeInsurance: lifetime annuity income (with or without a
 *    life policy to replace the legacy) vs keeping the lump sum invested.
 *  - insuranceRiderCost: waiver of premium, accidental death, child term,
 *    return of premium — yearly and over the term.
 *  - termLifeInsuranceLadder: several shorter policies stacked vs one long
 *    policy — total premiums.
 *  - secondToDieLifeInsurance: estate tax above two exemptions ($15M each
 *    in 2026, portable) and the liquidity gap survivorship cover fills.
 *  - wholeVsTermLifeInsuranceCostComparison: whole life cash value vs buying
 *    term and investing the difference.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-life-planning-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Key Person Life Insurance Calculator ------------------------------------------
export const keyPersonLifeInsuranceCalculator: CustomCalculator = (values) => {
  const salary = pos(values.salary, 150000);
  const revenueAttributed = pos(values.revenueAttributed, 600000);
  const profitMarginPercent = Math.min(100, pos(values.profitMarginPercent, 25));
  const replacementMonths = pos(values.replacementMonths, 12);
  const recruitingPercent = pos(values.recruitingPercent, 30);
  const salaryMultiple = pos(values.salaryMultiple, 5);

  const lostProfit = (revenueAttributed * profitMarginPercent) / 100 * (replacementMonths / 12);
  const hiring = (salary * recruitingPercent) / 100;

  return {
    lostProfitWhileReplacing: round2(lostProfit),
    recruitingAndTrainingCost: round2(hiring),
    coverageByContribution: round2(lostProfit + hiring),
    coverageBySalaryMultiple: round2(salary * salaryMultiple),
    suggestedCoverage: round2(Math.max(lostProfit + hiring, salary * salaryMultiple)),
  };
};

// --- 2. Annuity vs Life Insurance Calculator ------------------------------------------
export const annuityVsLifeInsuranceCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 200000);
  const payoutRatePercent = pos(values.payoutRatePercent, 7);
  const lifePremium = pos(values.lifePremium, 4000);
  const lifeDeathBenefit = pos(values.lifeDeathBenefit, 200000);
  const investedYieldPercent = pos(values.investedYieldPercent, 4.5);

  const annuityIncome = (amount * payoutRatePercent) / 100;

  return {
    annuityIncome: round2(annuityIncome),
    netIncomeAfterLifePremium: round2(annuityIncome - lifePremium),
    legacyWithLifePolicy: round2(lifeDeathBenefit),
    incomeIfInvested: round2((amount * investedYieldPercent) / 100),
    legacyIfInvested: round2(amount),
    extraIncomeVsInvesting: round2(annuityIncome - lifePremium - (amount * investedYieldPercent) / 100),
  };
};

// --- 3. Insurance Rider Cost Calculator ------------------------------------------------
export const insuranceRiderCostCalculator: CustomCalculator = (values) => {
  const basePremium = pos(values.basePremium, 600);
  const waiverPercent = pos(values.waiverPercent, 6);
  const adbCoverage = pos(values.adbCoverage, 250000);
  const adbRatePer1000 = pos(values.adbRatePer1000, 0.6);
  const childRider = pos(values.childRider, 60);
  const ropPercent = pos(values.ropPercent, 0);
  const termYears = Math.max(1, pos(values.termYears, 20));

  const riders = (basePremium * waiverPercent) / 100 + (adbCoverage / 1000) * adbRatePer1000 + childRider + (basePremium * ropPercent) / 100;
  const total = basePremium + riders;

  return {
    ridersPerYear: round2(riders),
    ridersShareOfPremium: round2(basePremium > 0 ? (riders / basePremium) * 100 : 0),
    totalAnnualPremium: round2(total),
    ridersOverTerm: round2(riders * termYears),
    totalOverTerm: round2(total * termYears),
  };
};

// --- 4. Term Life Insurance Ladder Strategy Calculator ---------------------------------
export const termLifeInsuranceLadderCalculator: CustomCalculator = (values) => {
  const cov30 = pos(values.coverage30, 500000);
  const rate30 = pos(values.rate30, 0.9);
  const cov20 = pos(values.coverage20, 300000);
  const rate20 = pos(values.rate20, 0.6);
  const cov10 = pos(values.coverage10, 200000);
  const rate10 = pos(values.rate10, 0.4);

  const total = cov30 + cov20 + cov10;
  const ladderYearly = (cov30 * rate30 + cov20 * rate20 + cov10 * rate10) / 1000;
  const ladderTotal = (cov30 * rate30 * 30 + cov20 * rate20 * 20 + cov10 * rate10 * 10) / 1000;
  const singleTotal = (total * rate30 * 30) / 1000;

  return {
    totalCoverageToday: round2(total),
    ladderPremiumFirst10Years: round2(ladderYearly),
    coverageYears11To20: round2(cov30 + cov20),
    coverageYears21To30: round2(cov30),
    ladderTotalPremiums: round2(ladderTotal),
    singlePolicyTotalPremiums: round2(singleTotal),
    ladderSavings: round2(singleTotal - ladderTotal),
  };
};

// --- 5. Second-to-Die Life Insurance Calculator ----------------------------------------
export const secondToDieLifeInsuranceCalculator: CustomCalculator = (values) => {
  const estateValue = pos(values.estateValue, 40000000);
  const exemptionPerPerson = pos(values.exemptionPerPerson, 15000000);
  const estateTaxRatePercent = Math.min(100, pos(values.estateTaxRatePercent, 40));
  const liquidAssets = pos(values.liquidAssets, 1500000);
  const annualPremium = pos(values.annualPremium, 30000);
  const yearsPaying = pos(values.yearsPaying, 20);

  const taxable = Math.max(0, estateValue - 2 * exemptionPerPerson);
  const tax = (taxable * estateTaxRatePercent) / 100;
  const gap = Math.max(0, tax - liquidAssets);

  return {
    taxableEstate: round2(taxable),
    estimatedEstateTax: round2(tax),
    liquidityGap: round2(gap),
    totalPremiums: round2(annualPremium * yearsPaying),
    premiumsAsShareOfCoverage: round2(gap > 0 ? ((annualPremium * yearsPaying) / gap) * 100 : 0),
  };
};

// --- 6. Whole vs Term Life Insurance Cost Comparison Calculator ------------------------
export const wholeVsTermLifeInsuranceCostComparisonCalculator: CustomCalculator = (values) => {
  const termPremium = pos(values.termPremium, 400);
  const wholePremium = pos(values.wholePremium, 4500);
  const years = Math.max(1, Math.round(pos(values.years, 30)));
  const investReturnPercent = safeNumber(values.investReturnPercent, 7);
  const wholeCreditedSharePercent = Math.min(100, pos(values.wholeCreditedSharePercent, 70));
  const wholeGrowthPercent = safeNumber(values.wholeGrowthPercent, 4);

  let invested = 0;
  let cv = 0;
  for (let y = 1; y <= years; y++) {
    invested = (invested + Math.max(0, wholePremium - termPremium)) * (1 + investReturnPercent / 100);
    cv = (cv + (y === 1 ? 0 : (wholePremium * wholeCreditedSharePercent) / 100)) * (1 + wholeGrowthPercent / 100);
  }

  return {
    termTotalPremiums: round2(termPremium * years),
    wholeTotalPremiums: round2(wholePremium * years),
    investedDifferenceValue: round2(invested),
    wholeLifeCashValue: round2(cv),
    buyTermAdvantage: round2(invested - cv),
  };
};

export const insLifePlanningCustomCalculators: Record<string, CustomCalculator> = {
  "key-person-life-insurance-calculator": keyPersonLifeInsuranceCalculator,
  "annuity-vs-life-insurance-calculator": annuityVsLifeInsuranceCalculator,
  "insurance-rider-cost-calculator": insuranceRiderCostCalculator,
  "term-life-insurance-ladder-strategy-calculator": termLifeInsuranceLadderCalculator,
  "second-to-die-life-insurance-calculator": secondToDieLifeInsuranceCalculator,
  "whole-vs-term-life-insurance-cost-comparison-calculator": wholeVsTermLifeInsuranceCostComparisonCalculator,
};
