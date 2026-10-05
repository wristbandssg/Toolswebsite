/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 4 of 11 — Health
 * Coverage (7 tools), filed under Insurance Calculators > Health Insurance
 * Calculators. See calc-engine-ins-life-core.ts for the full batch context.
 *
 *  - disabilityInsurance (incl. long-term, short-term, waiting period):
 *    benefit % of pay with a monthly cap, taxed if the employer paid the
 *    premium; income lost during the elimination period.
 *  - longTermCareInsurance: future care cost vs a policy benefit with
 *    inflation protection; the monthly gap and totals.
 *  - criticalIllnessInsurance: lump sum vs out-of-pocket costs and lost pay.
 *  - medicareSupplementInsurance: Original Medicare + Medigap + Part D vs
 *    Medicare Advantage, expected and worst case.
 *  - internationalHealthInsurance: premium with US coverage and dependants,
 *    plus expected out-of-pocket.
 *  - marketplaceHealthInsuranceSubsidy: premium tax credit with the 2026
 *    applicable percentages (2.10%–9.96% of income) and the 400% FPL cliff
 *    (enhanced credits expired after 2025); FPL from the 2025 guidelines.
 *  - selfEmployedHealthInsuranceCost: self-employed health insurance
 *    deduction (limited to net profit) and HSA tax savings.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-health-coverage-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Disability Insurance Calculator ------------------------------------------------
export const disabilityInsuranceCalculator: CustomCalculator = (values) => {
  const salary = pos(values.salary, 80000);
  const benefitPercent = Math.min(100, pos(values.benefitPercent, 60));
  const monthlyCap = pos(values.monthlyCap, 10000);
  const eliminationDays = pos(values.eliminationDays, 90);
  const benefitYears = pos(values.benefitYears, 5);
  const premiumPercent = pos(values.premiumPercent, 2);
  const employerPaid = Math.round(safeNumber(values.employerPaid, 1)) === 1;
  const taxRatePercent = Math.min(100, pos(values.taxRatePercent, 22));

  const gross = Math.min((salary / 12) * (benefitPercent / 100), monthlyCap);
  const net = employerPaid ? gross * (1 - taxRatePercent / 100) : gross;

  return {
    monthlyBenefit: round2(gross),
    monthlyBenefitAfterTax: round2(net),
    incomeLostDuringWaitingPeriod: round2((salary / 365) * eliminationDays),
    maximumTotalBenefit: round2(gross * 12 * benefitYears),
    yearlyPremium: round2((salary * premiumPercent) / 100),
    replacementOfTakeHome: round2(salary > 0 ? ((net * 12) / (salary * (1 - taxRatePercent / 100))) * 100 : 0),
  };
};

// --- 2. Long-Term Care Insurance Calculator --------------------------------------------
export const longTermCareInsuranceCalculator: CustomCalculator = (values) => {
  const monthlyCareCost = pos(values.monthlyCareCost, 6000);
  const careInflationPercent = safeNumber(values.careInflationPercent, 4);
  const yearsUntilCare = pos(values.yearsUntilCare, 20);
  const careYears = pos(values.careYears, 3);
  const policyMonthlyBenefit = pos(values.policyMonthlyBenefit, 5000);
  const inflationProtectionPercent = pos(values.inflationProtectionPercent, 3);
  const benefitYears = pos(values.benefitYears, 3);
  const yearlyPremium = pos(values.yearlyPremium, 3000);
  const yearsPaying = pos(values.yearsPaying, 20);

  const futureCost = monthlyCareCost * Math.pow(1 + careInflationPercent / 100, yearsUntilCare);
  const futureBenefit = policyMonthlyBenefit * Math.pow(1 + inflationProtectionPercent / 100, yearsUntilCare);

  return {
    futureMonthlyCareCost: round2(futureCost),
    futureMonthlyBenefit: round2(futureBenefit),
    monthlyGap: round2(Math.max(0, futureCost - futureBenefit)),
    totalCareCost: round2(futureCost * 12 * careYears),
    totalPolicyBenefits: round2(Math.min(futureBenefit, futureCost) * 12 * Math.min(careYears, benefitYears)),
    totalPremiums: round2(yearlyPremium * yearsPaying),
  };
};

// --- 3. Critical Illness Insurance Calculator ------------------------------------------
export const criticalIllnessInsuranceCalculator: CustomCalculator = (values) => {
  const lumpSum = pos(values.lumpSum, 25000);
  const monthlyPremium = pos(values.monthlyPremium, 30);
  const medicalOutOfPocket = pos(values.medicalOutOfPocket, 8000);
  const otherCosts = pos(values.otherCosts, 3000);
  const monthsOffWork = pos(values.monthsOffWork, 3);
  const monthlyIncome = pos(values.monthlyIncome, 5000);
  const yearsPaying = pos(values.yearsPaying, 20);

  const costs = medicalOutOfPocket + otherCosts + monthsOffWork * monthlyIncome;

  return {
    totalFinancialImpact: round2(costs),
    coveredByLumpSum: round2(Math.min(costs, lumpSum)),
    remainingGap: round2(Math.max(0, costs - lumpSum)),
    yearlyPremium: round2(monthlyPremium * 12),
    totalPremiums: round2(monthlyPremium * 12 * yearsPaying),
  };
};

// --- 4. Medicare Supplement Insurance Calculator ---------------------------------------
export const medicareSupplementInsuranceCalculator: CustomCalculator = (values) => {
  const partB = pos(values.partB, 202.9);
  const partBDeductible = pos(values.partBDeductible, 283);
  const medigapMonthly = pos(values.medigapMonthly, 160);
  const partDMonthly = pos(values.partDMonthly, 40);
  const advantageMonthly = pos(values.advantageMonthly, 0);
  const advantageExpectedCopays = pos(values.advantageExpectedCopays, 1500);
  const advantageOopMax = pos(values.advantageOopMax, 5500);

  const medigap = (partB + medigapMonthly + partDMonthly) * 12 + partBDeductible;
  const advantage = (partB + advantageMonthly) * 12 + Math.min(advantageExpectedCopays, advantageOopMax);
  const advantageWorst = (partB + advantageMonthly) * 12 + advantageOopMax;

  return {
    medigapYearlyCost: round2(medigap),
    advantageExpectedYearlyCost: round2(advantage),
    advantageWorstCase: round2(advantageWorst),
    advantageSavingsExpected: round2(medigap - advantage),
    medigapSavingsWorstCase: round2(advantageWorst - medigap),
  };
};

// --- 5. International Health Insurance Calculator --------------------------------------
export const internationalHealthInsuranceCalculator: CustomCalculator = (values) => {
  const basePremium = pos(values.basePremium, 4000);
  const includeUS = Math.round(safeNumber(values.includeUS, 0)) === 1;
  const usLoadingPercent = pos(values.usLoadingPercent, 60);
  const dependents = pos(values.dependents, 2);
  const dependentSharePercent = pos(values.dependentSharePercent, 50);
  const deductible = pos(values.deductible, 1000);
  const expectedCosts = pos(values.expectedCosts, 2000);

  const member = basePremium * (includeUS ? 1 + usLoadingPercent / 100 : 1);
  const premium = member * (1 + (dependents * dependentSharePercent) / 100);
  const oop = Math.min(expectedCosts, deductible);

  return {
    yourYearlyPremium: round2(member),
    familyYearlyPremium: round2(premium),
    expectedOutOfPocket: round2(oop),
    totalYearlyCost: round2(premium + oop),
    monthlyCost: round2((premium + oop) / 12),
  };
};

// --- 6. Marketplace Health Insurance Subsidy Calculator --------------------------------
export const marketplaceHealthInsuranceSubsidyCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 55000);
  const householdSize = Math.max(1, Math.round(pos(values.householdSize, 2)));
  const benchmarkMonthly = pos(values.benchmarkMonthly, 1100);
  const chosenPlanMonthly = pos(values.chosenPlanMonthly, 950);
  const povertyBase = pos(values.povertyBase, 15650);

  const fpl = povertyBase + 5500 * (householdSize - 1);
  const pct = fpl > 0 ? (income / fpl) * 100 : 0;
  // 2026 applicable percentages, linear within each band
  const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  let ap: number;
  if (pct < 100 || pct > 400) ap = -1;
  else if (pct < 133) ap = 2.1;
  else if (pct < 150) ap = lerp(pct, 133, 150, 3.14, 4.19);
  else if (pct < 200) ap = lerp(pct, 150, 200, 4.19, 6.6);
  else if (pct < 250) ap = lerp(pct, 200, 250, 6.6, 8.44);
  else if (pct < 300) ap = lerp(pct, 250, 300, 8.44, 9.96);
  else ap = 9.96;
  const contribution = ap >= 0 ? (income * ap) / 100 : 0;
  const credit = ap >= 0 ? Math.max(0, benchmarkMonthly * 12 - contribution) : 0;
  const net = Math.max(0, chosenPlanMonthly * 12 - credit);

  return {
    percentOfPovertyLevel: round2(pct),
    expectedContributionPercent: round2(Math.max(0, ap)),
    yearlyPremiumTaxCredit: round2(credit),
    monthlyPremiumTaxCredit: round2(credit / 12),
    yourMonthlyPremium: round2(net / 12),
  };
};

// --- 7. Self-Employed Health Insurance Cost Calculator ---------------------------------
export const selfEmployedHealthInsuranceCostCalculator: CustomCalculator = (values) => {
  const yearlyPremium = pos(values.yearlyPremium, 9600);
  const netProfit = pos(values.netProfit, 70000);
  const federalRatePercent = Math.min(100, pos(values.federalRatePercent, 22));
  const stateRatePercent = Math.min(100, pos(values.stateRatePercent, 5));
  const hsaContribution = pos(values.hsaContribution, 4400);

  const deduction = Math.min(yearlyPremium, netProfit);
  const rate = (federalRatePercent + stateRatePercent) / 100;
  const savings = deduction * rate;
  const hsaSavings = hsaContribution * rate;

  return {
    deductiblePremiums: round2(deduction),
    taxSavingsOnPremiums: round2(savings),
    netPremiumCost: round2(yearlyPremium - savings),
    hsaTaxSavings: round2(hsaSavings),
    netMonthlyCost: round2((yearlyPremium - savings) / 12),
  };
};

export const insHealthCoverageCustomCalculators: Record<string, CustomCalculator> = {
  "disability-insurance-calculator": disabilityInsuranceCalculator,
  "long-term-care-insurance-calculator": longTermCareInsuranceCalculator,
  "critical-illness-insurance-calculator": criticalIllnessInsuranceCalculator,
  "medicare-supplement-insurance-calculator": medicareSupplementInsuranceCalculator,
  "international-health-insurance-calculator": internationalHealthInsuranceCalculator,
  "marketplace-health-insurance-subsidy-calculator": marketplaceHealthInsuranceSubsidyCalculator,
  "self-employed-health-insurance-cost-calculator": selfEmployedHealthInsuranceCostCalculator,
};
