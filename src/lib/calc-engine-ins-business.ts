/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 10 of 11 — Business
 * & Farm (8 tools), filed under Insurance Calculators > Business & Specialty
 * Insurance Calculators. See calc-engine-ins-life-core.ts for the full batch
 * context.
 *
 *  - businessInsurance (BOP, incl. home-based businesses): base by business
 *    type + rate per $1,000 of revenue + property rate per $100.
 *  - generalLiabilityInsurance: rate per $1,000 of revenue x limit factor,
 *    with a minimum premium.
 *  - professionalLiabilityInsurance (E&O): base + revenue rate x profession
 *    and limit factors; expected yearly claim cost.
 *  - workersCompensationInsurance: payroll / 100 x class rate x experience
 *    modification factor.
 *  - cyberInsurance: base + revenue rate x industry and security factors;
 *    estimated breach cost (records x cost per record) vs the limit.
 *  - directorsAndOfficersInsurance: per-$1M base x company type x revenue
 *    size, scaled for the limit.
 *  - farmInsurance (incl. livestock): buildings, equipment, livestock and
 *    farm liability.
 *  - cropInsurance (revenue protection): APH yield x coverage level x the
 *    higher of projected/harvest price; premium subsidy by coverage level
 *    (basic/optional units).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-business-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};

// --- 1. Business Insurance Calculator (BOP) --------------------------------------------
export const businessInsuranceCalculator: CustomCalculator = (values) => {
  const businessType = pick(values.businessType, 2, 5);
  const annualRevenue = pos(values.annualRevenue, 250000);
  const propertyValue = pos(values.propertyValue, 50000);
  const propertyRatePer100 = pos(values.propertyRatePer100, 0.4);

  const base = [300, 600, 900, 1800, 1200][businessType - 1];
  const revenueRate = [0.5, 1, 1.5, 3, 2.5][businessType - 1];
  const liability = base + (annualRevenue / 1000) * revenueRate;
  const property = (propertyValue / 100) * propertyRatePer100;
  const premium = liability + property;

  return {
    liabilityPortion: round2(liability),
    propertyPortion: round2(property),
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    premiumAsShareOfRevenue: round2(annualRevenue > 0 ? (premium / annualRevenue) * 100 : 0),
  };
};

// --- 2. General Liability Insurance Calculator -----------------------------------------
export const generalLiabilityInsuranceCalculator: CustomCalculator = (values) => {
  const annualRevenue = pos(values.annualRevenue, 500000);
  const ratePer1000 = pos(values.ratePer1000, 1.5);
  const limit = pick(values.limit, 1, 2);
  const claimsSurchargePercent = pos(values.claimsSurchargePercent, 0);
  const minimumPremium = pos(values.minimumPremium, 500);

  const raw = (annualRevenue / 1000) * ratePer1000 * (limit === 2 ? 1.4 : 1) * (1 + claimsSurchargePercent / 100);
  const premium = Math.max(minimumPremium, raw);

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    premiumPer1000Revenue: round2(annualRevenue > 0 ? (premium / annualRevenue) * 1000 : 0),
    perOccurrenceLimit: limit === 2 ? 2000000 : 1000000,
    aggregateLimit: limit === 2 ? 4000000 : 2000000,
  };
};

// --- 3. Professional Liability Insurance Calculator (E&O) ------------------------------
export const professionalLiabilityInsuranceCalculator: CustomCalculator = (values) => {
  const annualRevenue = pos(values.annualRevenue, 200000);
  const profession = pick(values.profession, 1, 5);
  const limit = pick(values.limit, 1, 2);
  const claimChancePercent = Math.min(100, pos(values.claimChancePercent, 3));
  const averageClaimCost = pos(values.averageClaimCost, 50000);

  const fProfession = [1.0, 1.2, 1.3, 1.1, 2.0][profession - 1];
  const premium = (500 + (annualRevenue / 1000) * 2.5) * fProfession * (limit === 2 ? 1.35 : 1);
  const expected = (averageClaimCost * claimChancePercent) / 100;

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    premiumAsShareOfRevenue: round2(annualRevenue > 0 ? (premium / annualRevenue) * 100 : 0),
    coverageLimit: limit === 2 ? 2000000 : 1000000,
    expectedYearlyClaimCost: round2(expected),
  };
};

// --- 4. Workers' Compensation Insurance Calculator -------------------------------------
export const workersCompensationInsuranceCalculator: CustomCalculator = (values) => {
  const payroll = pos(values.payroll, 300000);
  const classRatePer100 = pos(values.classRatePer100, 2.5);
  const experienceMod = pos(values.experienceMod, 0.9);
  const employees = Math.max(1, Math.round(pos(values.employees, 6)));

  const manual = (payroll / 100) * classRatePer100;
  const modified = manual * experienceMod;

  return {
    manualPremium: round2(manual),
    modifiedPremium: round2(modified),
    experienceModSavings: round2(manual - modified),
    premiumPerEmployee: round2(modified / employees),
    premiumAsShareOfPayroll: round2(payroll > 0 ? (modified / payroll) * 100 : 0),
  };
};

// --- 5. Cyber Insurance Calculator -----------------------------------------------------
export const cyberInsuranceCalculator: CustomCalculator = (values) => {
  const annualRevenue = pos(values.annualRevenue, 1000000);
  const coverageLimit = pos(values.coverageLimit, 1000000);
  const industry = pick(values.industry, 1, 5);
  const security = pick(values.security, 2, 3);
  const records = pos(values.records, 5000);
  const costPerRecord = pos(values.costPerRecord, 160);

  const fIndustry = [1.0, 1.4, 2.0, 1.8, 1.3][industry - 1];
  const fSecurity = [0.8, 1.0, 1.4][security - 1];
  const fLimit = Math.pow(coverageLimit / 1000000, 0.7);
  const premium = (1000 + (annualRevenue / 1000) * 0.5) * fIndustry * fSecurity * fLimit;
  const breach = records * costPerRecord;
  const covered = Math.min(breach, coverageLimit);

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    estimatedBreachCost: round2(breach),
    coveredByPolicy: round2(covered),
    uncoveredBreachCost: round2(breach - covered),
  };
};

// --- 6. Directors & Officers (D&O) Insurance Calculator --------------------------------
export const directorsAndOfficersInsuranceCalculator: CustomCalculator = (values) => {
  const coverageLimit = pos(values.coverageLimit, 1000000);
  const companyType = pick(values.companyType, 2, 4);
  const annualRevenue = pos(values.annualRevenue, 5000000);
  const basePerMillion = pos(values.basePerMillion, 2000);

  const fType = [0.4, 1.0, 1.5, 5.0][companyType - 1];
  const fSize = 1 + Math.min(4, annualRevenue / 10000000) * 0.5;
  const millions = coverageLimit / 1000000;
  const premium = basePerMillion * fType * fSize * Math.pow(millions, 0.8);

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    costPerMillionOfCoverage: round2(millions > 0 ? premium / millions : 0),
    premiumAsShareOfRevenue: round2(annualRevenue > 0 ? (premium / annualRevenue) * 100 : 0),
  };
};

// --- 7. Farm Insurance Calculator (incl. livestock) ------------------------------------
export const farmInsuranceCalculator: CustomCalculator = (values) => {
  const buildingsValue = pos(values.buildingsValue, 600000);
  const buildingsRatePer100 = pos(values.buildingsRatePer100, 0.5);
  const equipmentValue = pos(values.equipmentValue, 250000);
  const equipmentRatePer100 = pos(values.equipmentRatePer100, 0.8);
  const head = pos(values.head, 100);
  const valuePerHead = pos(values.valuePerHead, 1500);
  const livestockRatePercent = pos(values.livestockRatePercent, 2);
  const liabilityPremium = pos(values.liabilityPremium, 800);

  const buildings = (buildingsValue / 100) * buildingsRatePer100;
  const equipment = (equipmentValue / 100) * equipmentRatePer100;
  const livestockValue = head * valuePerHead;
  const livestock = (livestockValue * livestockRatePercent) / 100;
  const total = buildings + equipment + livestock + liabilityPremium;

  return {
    buildingsPremium: round2(buildings),
    equipmentPremium: round2(equipment),
    livestockValue: round2(livestockValue),
    livestockPremium: round2(livestock),
    liabilityPremium: round2(liabilityPremium),
    annualPremium: round2(total),
    monthlyPremium: round2(total / 12),
  };
};

// --- 8. Crop Insurance Calculator (revenue protection) ---------------------------------
const CROP_SUBSIDY: Record<number, number> = { 50: 67, 55: 64, 60: 64, 65: 59, 70: 59, 75: 55, 80: 48, 85: 38 };

export const cropInsuranceCalculator: CustomCalculator = (values) => {
  const acres = pos(values.acres, 500);
  const aphYield = pos(values.aphYield, 180);
  const coverageLevel = Math.min(85, Math.max(50, Math.round(pos(values.coverageLevel, 75) / 5) * 5));
  const projectedPrice = pos(values.projectedPrice, 4.5);
  const harvestPrice = pos(values.harvestPrice, 4);
  const actualYield = pos(values.actualYield, 140);
  const premiumPerAcre = pos(values.premiumPerAcre, 30);

  const guarantee = aphYield * (coverageLevel / 100) * Math.max(projectedPrice, harvestPrice) * acres;
  const revenueToCount = actualYield * harvestPrice * acres;
  const indemnity = Math.max(0, guarantee - revenueToCount);
  const totalPremium = premiumPerAcre * acres;
  const subsidyPercent = CROP_SUBSIDY[coverageLevel];
  const farmerPremium = totalPremium * (1 - subsidyPercent / 100);

  return {
    coverageLevelUsed: coverageLevel,
    revenueGuarantee: round2(guarantee),
    revenueToCount: round2(revenueToCount),
    indemnityPayment: round2(indemnity),
    totalPremium: round2(totalPremium),
    subsidyPercent,
    farmerPaidPremium: round2(farmerPremium),
    netBenefit: round2(indemnity - farmerPremium),
  };
};

export const insBusinessCustomCalculators: Record<string, CustomCalculator> = {
  "business-insurance-calculator": businessInsuranceCalculator,
  "general-liability-insurance-calculator": generalLiabilityInsuranceCalculator,
  "professional-liability-insurance-calculator": professionalLiabilityInsuranceCalculator,
  "workers-compensation-insurance-calculator": workersCompensationInsuranceCalculator,
  "cyber-insurance-calculator": cyberInsuranceCalculator,
  "directors-and-officers-insurance-calculator": directorsAndOfficersInsuranceCalculator,
  "farm-insurance-calculator": farmInsuranceCalculator,
  "crop-insurance-calculator": cropInsuranceCalculator,
};
