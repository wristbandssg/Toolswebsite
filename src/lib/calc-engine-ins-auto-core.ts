/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 5 of 11 — Auto
 * Insurance Core (8 tools), filed under Insurance Calculators > Auto & Vehicle
 * Insurance Calculators. See calc-engine-ins-life-core.ts for the full batch
 * context.
 *
 *  - carInsurancePremium (incl. senior driver, premium by age bracket,
 *    credit score, zip code and coverage level): a base quote x typical
 *    rating factors.
 *  - motorcycleInsurancePremium: bike type, safety-course discount and
 *    lay-up (storage) months.
 *  - teenDriverCarInsurance: adding a teen vs a separate policy, with
 *    good-student and telematics discounts.
 *  - highRiskDriverInsurance (incl. SR-22): surcharge for 3–5 years plus
 *    filing fees.
 *  - nonOwnerCarInsurance: a non-owner policy vs buying rental-counter
 *    liability.
 *  - rideshareDriverInsurance (incl. gig worker): rideshare endorsement vs
 *    a commercial policy.
 *  - gapInsuranceAuto: loan balance vs car value; insurer vs dealer gap.
 *  - extendedAutoWarrantyVsInsurance: extended warranty vs mechanical
 *    breakdown insurance vs paying repairs yourself.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-auto-core-calculators.ts for the copy.
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

// --- 1. Car Insurance Premium Calculator -----------------------------------------------
export const carInsurancePremiumCalculator: CustomCalculator = (values) => {
  const basePremium = pos(values.basePremium, 1800);
  const age = pick(values.ageBand, 3, 5);
  const credit = pick(values.creditTier, 3, 4);
  const area = pick(values.area, 3, 3);
  const coverage = pick(values.coverage, 3, 4);
  const accidents = pos(values.accidents, 0);

  const fAge = [2.5, 1.6, 1.0, 1.05, 1.3][age - 1];
  const fCredit = [0.85, 1.0, 1.25, 1.7][credit - 1];
  const fArea = [0.9, 1.0, 1.3][area - 1];
  const fCov = [0.45, 0.7, 1.0, 1.15][coverage - 1];
  const fAcc = 1 + 0.4 * accidents;
  const factor = fAge * fCredit * fArea * fCov * fAcc;
  const annual = basePremium * factor;

  return {
    combinedFactor: round2(factor),
    annualPremium: round2(annual),
    monthlyPremium: round2(annual / 12),
    sixMonthPremium: round2(annual / 2),
    differenceFromBase: round2(annual - basePremium),
  };
};

// --- 2. Motorcycle Insurance Premium Calculator ----------------------------------------
export const motorcycleInsurancePremiumCalculator: CustomCalculator = (values) => {
  const basePremium = pos(values.basePremium, 700);
  const bikeType = pick(values.bikeType, 1, 4);
  const courseDiscountPercent = Math.min(50, pos(values.courseDiscountPercent, 10));
  const layupMonths = Math.min(11, pos(values.layupMonths, 4));
  const layupSavingsPercent = Math.min(100, pos(values.layupSavingsPercent, 80));

  const fType = [1.0, 2.0, 1.1, 0.6][bikeType - 1];
  const full = basePremium * fType * (1 - courseDiscountPercent / 100);
  const annual = full * (1 - ((layupMonths / 12) * layupSavingsPercent) / 100);

  return {
    fullYearPremium: round2(full),
    annualPremiumWithLayup: round2(annual),
    monthlyAverage: round2(annual / 12),
    layupSavings: round2(full - annual),
  };
};

// --- 3. Teen Driver Car Insurance Calculator -------------------------------------------
export const teenDriverCarInsuranceCalculator: CustomCalculator = (values) => {
  const currentPremium = pos(values.currentPremium, 2000);
  const increasePercent = pos(values.increasePercent, 100);
  const goodStudentPercent = Math.min(50, pos(values.goodStudentPercent, 15));
  const telematicsPercent = Math.min(50, pos(values.telematicsPercent, 10));
  const separatePolicy = pos(values.separatePolicy, 5000);
  const yearsUntil25 = pos(values.yearsUntil25, 8);

  const addCost = (currentPremium * increasePercent) / 100;
  const discounted = addCost * (1 - goodStudentPercent / 100) * (1 - telematicsPercent / 100);
  // the surcharge typically fades as the teen gains experience (roughly linearly to age 25)
  const total = (discounted * yearsUntil25) / 2 + discounted / 2;

  return {
    teenCostBeforeDiscounts: round2(addCost),
    teenCostAfterDiscounts: round2(discounted),
    newFamilyPremium: round2(currentPremium + discounted),
    savingsVsSeparatePolicy: round2(separatePolicy - discounted),
    estimatedCostUntil25: round2(total),
  };
};

// --- 4. High-Risk Driver Insurance Calculator ------------------------------------------
export const highRiskDriverInsuranceCalculator: CustomCalculator = (values) => {
  const basePremium = pos(values.basePremium, 1600);
  const surchargePercent = pos(values.surchargePercent, 80);
  const years = pos(values.years, 3);
  const sr22Fee = pos(values.sr22Fee, 25);
  const filingsPerYear = pos(values.filingsPerYear, 1);

  const extra = (basePremium * surchargePercent) / 100;
  const fees = sr22Fee * filingsPerYear * years;

  return {
    highRiskPremium: round2(basePremium + extra),
    monthlyPremium: round2((basePremium + extra) / 12),
    extraPerYear: round2(extra),
    totalExtraCost: round2(extra * years + fees),
    sr22FeesTotal: round2(fees),
  };
};

// --- 5. Non-Owner Car Insurance Calculator ---------------------------------------------
export const nonOwnerCarInsuranceCalculator: CustomCalculator = (values) => {
  const nonOwnerPremium = pos(values.nonOwnerPremium, 450);
  const rentalDays = pos(values.rentalDays, 30);
  const counterLiabilityPerDay = pos(values.counterLiabilityPerDay, 18);
  const borrowedCarDays = pos(values.borrowedCarDays, 0);

  const counter = rentalDays * counterLiabilityPerDay;

  return {
    nonOwnerYearly: round2(nonOwnerPremium),
    rentalCounterLiabilityYearly: round2(counter),
    savingsWithNonOwner: round2(counter - nonOwnerPremium),
    costPerDayCovered: round2(rentalDays + borrowedCarDays > 0 ? nonOwnerPremium / (rentalDays + borrowedCarDays) : 0),
  };
};

// --- 6. Rideshare Driver Insurance Calculator ------------------------------------------
export const rideshareDriverInsuranceCalculator: CustomCalculator = (values) => {
  const personalPremium = pos(values.personalPremium, 1600);
  const endorsementMonthly = pos(values.endorsementMonthly, 20);
  const hoursPerWeek = pos(values.hoursPerWeek, 15);
  const commercialPremium = pos(values.commercialPremium, 4000);

  const endorsement = endorsementMonthly * 12;

  return {
    endorsementYearly: round2(endorsement),
    totalWithEndorsement: round2(personalPremium + endorsement),
    increasePercent: round2(personalPremium > 0 ? (endorsement / personalPremium) * 100 : 0),
    insuranceCostPerHourDriven: round2(hoursPerWeek > 0 ? endorsement / (hoursPerWeek * 52) : 0),
    savingsVsCommercial: round2(commercialPremium - personalPremium - endorsement),
  };
};

// --- 7. Gap Insurance (Auto) Calculator ------------------------------------------------
export const gapInsuranceAutoCalculator: CustomCalculator = (values) => {
  const loanBalance = pos(values.loanBalance, 28000);
  const carValue = pos(values.carValue, 22000);
  const deductible = pos(values.deductible, 500);
  const dealerGapPrice = pos(values.dealerGapPrice, 800);
  const insurerGapYearly = pos(values.insurerGapYearly, 40);
  const yearsNeeded = pos(values.yearsNeeded, 2);

  const gap = Math.max(0, loanBalance - carValue);

  return {
    gapAmount: round2(gap),
    exposureIfTotaled: round2(gap + deductible),
    insurerGapTotalCost: round2(insurerGapYearly * yearsNeeded),
    savingsVsDealerGap: round2(dealerGapPrice - insurerGapYearly * yearsNeeded),
    loanToValuePercent: round2(carValue > 0 ? (loanBalance / carValue) * 100 : 0),
  };
};

// --- 8. Extended Auto Warranty vs Insurance Calculator ---------------------------------
export const extendedAutoWarrantyVsInsuranceCalculator: CustomCalculator = (values) => {
  const warrantyPrice = pos(values.warrantyPrice, 2500);
  const warrantyDeductible = pos(values.warrantyDeductible, 100);
  const mbiYearly = pos(values.mbiYearly, 400);
  const mbiDeductible = pos(values.mbiDeductible, 250);
  const years = Math.max(0.5, pos(values.years, 3));
  const repairsPerYear = pos(values.repairsPerYear, 1);
  const avgRepair = pos(values.avgRepair, 700);

  const visits = repairsPerYear * years;
  const repairs = visits * avgRepair;
  const warranty = warrantyPrice + visits * Math.min(warrantyDeductible, avgRepair);
  const mbi = mbiYearly * years + visits * Math.min(mbiDeductible, avgRepair);

  return {
    expectedRepairCost: round2(repairs),
    warrantyTotalCost: round2(warranty),
    breakdownInsuranceTotalCost: round2(mbi),
    payYourselfCost: round2(repairs),
    cheapestVsPayingYourself: round2(repairs - Math.min(warranty, mbi)),
  };
};

export const insAutoCoreCustomCalculators: Record<string, CustomCalculator> = {
  "car-insurance-premium-calculator": carInsurancePremiumCalculator,
  "motorcycle-insurance-premium-calculator": motorcycleInsurancePremiumCalculator,
  "teen-driver-car-insurance-calculator": teenDriverCarInsuranceCalculator,
  "high-risk-driver-insurance-calculator": highRiskDriverInsuranceCalculator,
  "non-owner-car-insurance-calculator": nonOwnerCarInsuranceCalculator,
  "rideshare-driver-insurance-calculator": rideshareDriverInsuranceCalculator,
  "gap-insurance-auto-calculator": gapInsuranceAutoCalculator,
  "extended-auto-warranty-vs-insurance-calculator": extendedAutoWarrantyVsInsuranceCalculator,
};
