/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 6 of 11 — Specialty
 * Vehicles (7 tools), filed under Insurance Calculators > Auto & Vehicle
 * Insurance Calculators. See calc-engine-ins-life-core.ts for the full batch
 * context. Premiums are a rate (% of insured value, from a quote) plus
 * liability — the usual way specialty insurers price these.
 *
 *  - classicCarInsurance (incl. exotic cars, modified vehicles): agreed
 *    value incl. modifications vs a standard policy paying actual cash
 *    value.
 *  - usageBasedInsuranceSavings: telematics participation and score
 *    discounts (and a possible surcharge).
 *  - boatInsurance (incl. marine): hull rate by navigation area, lay-up
 *    months, % deductible.
 *  - rvInsurance: rate by RV class, full-timer loading, storage months.
 *  - atvInsurance (incl. snowmobile, golf cart): rate by type plus
 *    liability.
 *  - bicycleInsurance (incl. electric scooter): premium vs expected theft
 *    and damage loss.
 *  - aviationInsurance (incl. drone): hull rate, low-hours loading,
 *    liability.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-auto-specialty-calculators.ts for the copy.
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

// --- 1. Classic Car Insurance Calculator -----------------------------------------------
export const classicCarInsuranceCalculator: CustomCalculator = (values) => {
  const agreedValue = pos(values.agreedValue, 45000);
  const modificationsValue = pos(values.modificationsValue, 0);
  const ratePercent = pos(values.ratePercent, 1);
  const standardPremium = pos(values.standardPremium, 1400);
  const acvUnderStandard = pos(values.acvUnderStandard, 30000);

  const insured = agreedValue + modificationsValue;
  const premium = (insured * ratePercent) / 100;

  return {
    insuredValue: round2(insured),
    classicPremium: round2(premium),
    savingsVsStandardPolicy: round2(standardPremium - premium),
    extraPayoutIfTotaled: round2(insured - acvUnderStandard),
  };
};

// --- 2. Usage-Based Insurance Savings Calculator ---------------------------------------
export const usageBasedInsuranceSavingsCalculator: CustomCalculator = (values) => {
  const currentPremium = pos(values.currentPremium, 1800);
  const signUpDiscountPercent = Math.min(50, pos(values.signUpDiscountPercent, 5));
  const maxDiscountPercent = Math.min(60, pos(values.maxDiscountPercent, 30));
  const scorePercent = Math.min(100, pos(values.scorePercent, 70));
  const surchargePercent = Math.min(50, pos(values.surchargePercent, 0));

  const discount = signUpDiscountPercent + (maxDiscountPercent * scorePercent) / 100 - surchargePercent;
  const newPremium = currentPremium * (1 - discount / 100);

  return {
    totalDiscountPercent: round2(discount),
    newAnnualPremium: round2(newPremium),
    yearlySavings: round2(currentPremium - newPremium),
    monthlySavings: round2((currentPremium - newPremium) / 12),
  };
};

// --- 3. Boat Insurance Calculator ------------------------------------------------------
export const boatInsuranceCalculator: CustomCalculator = (values) => {
  const boatValue = pos(values.boatValue, 40000);
  const hullRatePercent = pos(values.hullRatePercent, 1.5);
  const area = pick(values.area, 1, 3);
  const liability = pos(values.liability, 150);
  const layupMonths = Math.min(11, pos(values.layupMonths, 4));
  const layupSavingsPercent = Math.min(100, pos(values.layupSavingsPercent, 40));
  const deductiblePercent = pos(values.deductiblePercent, 1);

  const fArea = [1.0, 1.25, 1.5][area - 1];
  const hull = ((boatValue * hullRatePercent) / 100) * fArea * (1 - ((layupMonths / 12) * layupSavingsPercent) / 100);

  return {
    hullPremium: round2(hull),
    totalPremium: round2(hull + liability),
    monthlyAverage: round2((hull + liability) / 12),
    deductibleAmount: round2((boatValue * deductiblePercent) / 100),
  };
};

// --- 4. RV Insurance Calculator --------------------------------------------------------
export const rvInsuranceCalculator: CustomCalculator = (values) => {
  const rvValue = pos(values.rvValue, 80000);
  const rvClass = pick(values.rvClass, 1, 3);
  const ratePercent = pos(values.ratePercent, 1.6);
  const fullTimer = Math.round(safeNumber(values.fullTimer, 0)) === 1;
  const storageMonths = Math.min(11, pos(values.storageMonths, 5));
  const storageSavingsPercent = Math.min(100, pos(values.storageSavingsPercent, 50));

  const fClass = [1.0, 0.85, 0.4][rvClass - 1];
  const base = ((rvValue * ratePercent) / 100) * fClass * (fullTimer ? 1.4 : 1);
  const premium = base * (1 - (fullTimer ? 0 : ((storageMonths / 12) * storageSavingsPercent) / 100));

  return {
    fullYearPremium: round2(base),
    annualPremium: round2(premium),
    monthlyAverage: round2(premium / 12),
    storageSavings: round2(base - premium),
  };
};

// --- 5. ATV Insurance Calculator -------------------------------------------------------
export const atvInsuranceCalculator: CustomCalculator = (values) => {
  const vehicleValue = pos(values.vehicleValue, 9000);
  const vehicleType = pick(values.vehicleType, 1, 3);
  const ratePercent = pos(values.ratePercent, 3);
  const liability = pos(values.liability, 100);
  const discountsPercent = Math.min(50, pos(values.discountsPercent, 10));

  const fType = [1.0, 0.9, 0.7][vehicleType - 1];
  const physical = ((vehicleValue * ratePercent) / 100) * fType;
  const premium = (physical + liability) * (1 - discountsPercent / 100);

  return {
    physicalDamagePremium: round2(physical),
    annualPremium: round2(premium),
    monthlyAverage: round2(premium / 12),
    premiumAsShareOfValue: round2(vehicleValue > 0 ? (premium / vehicleValue) * 100 : 0),
  };
};

// --- 6. Bicycle Insurance Calculator ---------------------------------------------------
export const bicycleInsuranceCalculator: CustomCalculator = (values) => {
  const bikeValue = pos(values.bikeValue, 3000);
  const ratePercent = pos(values.ratePercent, 6);
  const theftRiskPercent = Math.min(100, pos(values.theftRiskPercent, 5));
  const damageRiskPercent = Math.min(100, pos(values.damageRiskPercent, 5));
  const averageDamage = pos(values.averageDamage, 600);
  const deductible = pos(values.deductible, 100);

  const premium = (bikeValue * ratePercent) / 100;
  const expected =
    (theftRiskPercent / 100) * Math.max(0, bikeValue - deductible) + (damageRiskPercent / 100) * Math.max(0, averageDamage - deductible);

  return {
    yearlyPremium: round2(premium),
    expectedYearlyClaims: round2(expected),
    premiumMinusExpectedClaims: round2(premium - expected),
    lossIfStolenWithoutInsurance: round2(bikeValue),
  };
};

// --- 7. Aviation Insurance Calculator --------------------------------------------------
export const aviationInsuranceCalculator: CustomCalculator = (values) => {
  const hullValue = pos(values.hullValue, 150000);
  const hullRatePercent = pos(values.hullRatePercent, 2);
  const lowHours = Math.round(safeNumber(values.lowHours, 0)) === 1;
  const liabilityPremium = pos(values.liabilityPremium, 600);
  const instrumentRatingDiscountPercent = Math.min(50, pos(values.instrumentRatingDiscountPercent, 5));

  const hull = ((hullValue * hullRatePercent) / 100) * (lowHours ? 1.25 : 1) * (1 - instrumentRatingDiscountPercent / 100);

  return {
    hullPremium: round2(hull),
    totalPremium: round2(hull + liabilityPremium),
    monthlyAverage: round2((hull + liabilityPremium) / 12),
    premiumAsShareOfValue: round2(hullValue > 0 ? ((hull + liabilityPremium) / hullValue) * 100 : 0),
  };
};

export const insAutoSpecialtyCustomCalculators: Record<string, CustomCalculator> = {
  "classic-car-insurance-calculator": classicCarInsuranceCalculator,
  "usage-based-insurance-savings-calculator": usageBasedInsuranceSavingsCalculator,
  "boat-insurance-calculator": boatInsuranceCalculator,
  "rv-insurance-calculator": rvInsuranceCalculator,
  "atv-insurance-calculator": atvInsuranceCalculator,
  "bicycle-insurance-calculator": bicycleInsuranceCalculator,
  "aviation-insurance-calculator": aviationInsuranceCalculator,
};
