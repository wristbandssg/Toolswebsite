/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 3 of 11 — Health
 * Plans (7 tools), filed under Insurance Calculators > Health Insurance
 * Calculators. See calc-engine-ins-life-core.ts for the full batch context.
 *
 *  - healthInsurancePremium (incl. premium by age bracket): ACA federal
 *    default age curve (age 21 = 1.000 … 64+ = 3.000, 0–14 = 0.765),
 *    tobacco surcharge up to 50%, only the 3 oldest children under 21 rated.
 *  - healthInsurancePlanComparison (incl. HSA-eligible, short-term and
 *    student plans): premiums + out-of-pocket at your expected usage, less
 *    HSA employer money and tax savings.
 *  - outOfPocketMaximum (incl. co-pay vs coinsurance): what you pay on a
 *    bill with deductible, coinsurance, copays and the yearly cap.
 *  - dentalInsurance: premiums + your share vs paying cash; annual maximum.
 *  - visionInsurance: exam and eyewear with copays/allowances vs cash.
 *  - groupVsIndividualInsurance (incl. employer-sponsored value): employer
 *    contribution and pre-tax savings vs an individual plan.
 *  - cobraInsuranceCost: full premium + 2% admin fee for up to 18 months vs
 *    a marketplace plan.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-health-plans-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// Federal default ACA age rating curve (ages 21–64).
const CURVE: number[] = [
  1.0, 1.0, 1.0, 1.0, 1.004, 1.024, 1.048, 1.087, 1.119, 1.135, 1.159, 1.183, 1.198, 1.214, 1.222, 1.23, 1.238, 1.246, 1.262,
  1.278, 1.302, 1.325, 1.357, 1.397, 1.444, 1.5, 1.563, 1.635, 1.706, 1.786, 1.865, 1.952, 2.04, 2.135, 2.23, 2.333, 2.437,
  2.548, 2.603, 2.714, 2.81, 2.873, 2.952, 3.0,
];
const YOUNG: number[] = [0.833, 0.859, 0.885, 0.913, 0.941, 0.97]; // ages 15–20

function ageFactor(age: number): number {
  const a = Math.round(age);
  if (a <= 14) return 0.765;
  if (a <= 20) return YOUNG[a - 15];
  if (a >= 64) return 3.0;
  return CURVE[a - 21];
}

// Out-of-pocket on medical costs under a deductible, coinsurance and cap.
function oop(costs: number, deductible: number, coinsurancePercent: number, cap: number): number {
  const raw = Math.min(costs, deductible) + (Math.max(0, costs - deductible) * coinsurancePercent) / 100;
  return Math.min(raw, cap);
}

// --- 1. Health Insurance Premium Calculator --------------------------------------------
export const healthInsurancePremiumCalculator: CustomCalculator = (values) => {
  const baseAt21 = pos(values.baseAt21, 380);
  const age1 = pos(values.age1, 40);
  const age2 = pos(values.age2, 38);
  const childrenUnder21 = Math.min(10, Math.round(pos(values.childrenUnder21, 2)));
  const tobaccoPercent = Math.min(50, pos(values.tobaccoPercent, 0));

  const adult1 = baseAt21 * ageFactor(age1) * (1 + tobaccoPercent / 100);
  const adult2 = age2 > 0 ? baseAt21 * ageFactor(age2) : 0;
  const kids = baseAt21 * 0.765 * Math.min(3, childrenUnder21);
  const monthly = adult1 + adult2 + kids;

  return {
    ageFactor: ageFactor(age1),
    yourMonthlyPremium: round2(adult1),
    familyMonthlyPremium: round2(monthly),
    familyYearlyPremium: round2(monthly * 12),
    childrenRated: Math.min(3, childrenUnder21),
  };
};

// --- 2. Health Insurance Plan Comparison Calculator ------------------------------------
export const healthInsurancePlanComparisonCalculator: CustomCalculator = (values) => {
  const expectedCosts = pos(values.expectedCosts, 5000);
  const aPremium = pos(values.aPremium, 450);
  const aDeductible = pos(values.aDeductible, 1500);
  const aCoinsurance = pos(values.aCoinsurance, 20);
  const aOopMax = pos(values.aOopMax, 6000);
  const bPremium = pos(values.bPremium, 320);
  const bDeductible = pos(values.bDeductible, 3500);
  const bCoinsurance = pos(values.bCoinsurance, 20);
  const bOopMax = pos(values.bOopMax, 7500);
  const bHsaEmployer = pos(values.bHsaEmployer, 1000);
  const bHsaYours = pos(values.bHsaYours, 3000);
  const taxRatePercent = pos(values.taxRatePercent, 22);

  const a = aPremium * 12 + oop(expectedCosts, aDeductible, aCoinsurance, aOopMax);
  const b = bPremium * 12 + oop(expectedCosts, bDeductible, bCoinsurance, bOopMax) - bHsaEmployer - (bHsaYours * taxRatePercent) / 100;
  const worstA = aPremium * 12 + aOopMax;
  const worstB = bPremium * 12 + bOopMax - bHsaEmployer - (bHsaYours * taxRatePercent) / 100;

  return {
    planAYearlyCost: round2(a),
    planBYearlyCost: round2(b),
    planBSavings: round2(a - b),
    planAWorstCase: round2(worstA),
    planBWorstCase: round2(worstB),
  };
};

// --- 3. Out-of-Pocket Maximum Calculator -----------------------------------------------
export const outOfPocketMaximumCalculator: CustomCalculator = (values) => {
  const billAmount = pos(values.billAmount, 12000);
  const deductible = pos(values.deductible, 2000);
  const deductibleMet = pos(values.deductibleMet, 0);
  const coinsurancePercent = Math.min(100, pos(values.coinsurancePercent, 20));
  const copayVisits = pos(values.copayVisits, 6);
  const copay = pos(values.copay, 30);
  const oopMax = pos(values.oopMax, 6000);
  const paidSoFar = pos(values.paidSoFar, 0);

  const deductibleLeft = Math.max(0, deductible - deductibleMet);
  const raw = Math.min(billAmount, deductibleLeft) + (Math.max(0, billAmount - deductibleLeft) * coinsurancePercent) / 100 + copayVisits * copay;
  const room = Math.max(0, oopMax - paidSoFar);
  const youPay = Math.min(raw, room);

  return {
    youPayBeforeCap: round2(raw),
    youPay: round2(youPay),
    insurancePays: round2(billAmount + copayVisits * copay - youPay),
    copaysTotal: round2(copayVisits * copay),
    remainingToOutOfPocketMax: round2(room - youPay),
  };
};

// --- 4. Dental Insurance Calculator ----------------------------------------------------
export const dentalInsuranceCalculator: CustomCalculator = (values) => {
  const monthlyPremium = pos(values.monthlyPremium, 35);
  const annualMax = pos(values.annualMax, 1500);
  const deductible = pos(values.deductible, 50);
  const preventive = pos(values.preventive, 400);
  const basic = pos(values.basic, 600);
  const major = pos(values.major, 2000);

  const total = preventive + basic + major;
  const afterDed = Math.max(0, basic - deductible);
  const covered = preventive + afterDed * 0.8 + major * 0.5;
  const insurerPays = Math.min(annualMax, covered);
  const withIns = monthlyPremium * 12 + total - insurerPays;

  return {
    totalDentalCosts: round2(total),
    insurancePays: round2(insurerPays),
    yourCostWithInsurance: round2(withIns),
    yourCostWithoutInsurance: round2(total),
    savingsWithInsurance: round2(total - withIns),
  };
};

// --- 5. Vision Insurance Calculator ----------------------------------------------------
export const visionInsuranceCalculator: CustomCalculator = (values) => {
  const monthlyPremium = pos(values.monthlyPremium, 12);
  const examCost = pos(values.examCost, 150);
  const examCopay = pos(values.examCopay, 10);
  const framesCost = pos(values.framesCost, 250);
  const frameAllowance = pos(values.frameAllowance, 150);
  const lensesCost = pos(values.lensesCost, 150);
  const lensCopay = pos(values.lensCopay, 25);
  const people = Math.max(1, Math.round(pos(values.people, 1)));

  const without = (examCost + framesCost + lensesCost) * people;
  const withIns = monthlyPremium * 12 + (Math.min(examCost, examCopay) + Math.max(0, framesCost - frameAllowance) + Math.min(lensesCost, lensCopay)) * people;

  return {
    costWithoutInsurance: round2(without),
    costWithInsurance: round2(withIns),
    savingsWithInsurance: round2(without - withIns),
  };
};

// --- 6. Group vs Individual Insurance Calculator ---------------------------------------
export const groupVsIndividualInsuranceCalculator: CustomCalculator = (values) => {
  const groupTotalMonthly = pos(values.groupTotalMonthly, 1800);
  const yourShareMonthly = pos(values.yourShareMonthly, 450);
  const taxRatePercent = pos(values.taxRatePercent, 30);
  const individualMonthly = pos(values.individualMonthly, 1100);
  const subsidyMonthly = pos(values.subsidyMonthly, 0);

  const employerYearly = Math.max(0, groupTotalMonthly - yourShareMonthly) * 12;
  const groupNet = yourShareMonthly * 12 * (1 - taxRatePercent / 100);
  const individualNet = Math.max(0, individualMonthly - subsidyMonthly) * 12;

  return {
    employerContributionYearly: round2(employerYearly),
    groupCostAfterTaxSavings: round2(groupNet),
    individualPlanCost: round2(individualNet),
    groupPlanSavings: round2(individualNet - groupNet),
    employerShareOfPremium: round2(groupTotalMonthly > 0 ? (employerYearly / 12 / groupTotalMonthly) * 100 : 0),
  };
};

// --- 7. COBRA Insurance Cost Calculator ------------------------------------------------
export const cobraInsuranceCostCalculator: CustomCalculator = (values) => {
  const fullMonthlyPremium = pos(values.fullMonthlyPremium, 1800);
  const adminPercent = Math.min(50, pos(values.adminPercent, 2));
  const months = Math.min(36, pos(values.months, 18));
  const previousShare = pos(values.previousShare, 450);
  const marketplaceMonthly = pos(values.marketplaceMonthly, 900);

  const cobra = fullMonthlyPremium * (1 + adminPercent / 100);

  return {
    cobraMonthlyPremium: round2(cobra),
    totalCobraCost: round2(cobra * months),
    increaseOverWhatYouPaid: round2(cobra - previousShare),
    marketplaceSavingsPerMonth: round2(cobra - marketplaceMonthly),
    marketplaceSavingsTotal: round2((cobra - marketplaceMonthly) * months),
  };
};

export const insHealthPlansCustomCalculators: Record<string, CustomCalculator> = {
  "health-insurance-premium-calculator": healthInsurancePremiumCalculator,
  "health-insurance-plan-comparison-calculator": healthInsurancePlanComparisonCalculator,
  "out-of-pocket-maximum-calculator": outOfPocketMaximumCalculator,
  "dental-insurance-calculator": dentalInsuranceCalculator,
  "vision-insurance-calculator": visionInsuranceCalculator,
  "group-vs-individual-insurance-calculator": groupVsIndividualInsuranceCalculator,
  "cobra-insurance-cost-calculator": cobraInsuranceCostCalculator,
};
