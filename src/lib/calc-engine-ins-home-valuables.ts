/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 8 of 11 — Valuables
 * & Special Property (4 tools), filed under Insurance Calculators > Home &
 * Property Insurance Calculators. See calc-engine-ins-life-core.ts for the
 * full batch context.
 *
 *  - buildersRiskInsurance: rate x completed value, prorated for the build
 *    period.
 *  - vacantHomeInsurance (incl. seasonal homes): vacancy policy surcharge
 *    for the months the home sits empty.
 *  - jewelryInsurance (incl. fine art, collectibles, musical instruments,
 *    camera equipment): scheduled coverage rate by item type vs the
 *    homeowners theft sub-limit.
 *  - identityTheftInsurance: premium vs expected yearly loss (chance of
 *    identity theft x costs and time).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-home-valuables-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Builder's Risk Insurance Calculator --------------------------------------------
export const buildersRiskInsuranceCalculator: CustomCalculator = (values) => {
  const completedValue = pos(values.completedValue, 400000);
  const ratePercent = pos(values.ratePercent, 1.5);
  const buildMonths = Math.max(1, pos(values.buildMonths, 9));
  const policyMonths = Math.max(1, pos(values.policyMonths, 12));
  const deductible = pos(values.deductible, 1000);
  const minimumPremium = pos(values.minimumPremium, 500);

  const full = (completedValue * ratePercent) / 100;
  const premium = Math.max(minimumPremium, (full * buildMonths) / policyMonths);

  return {
    fullTermPremium: round2(full),
    premiumForBuildPeriod: round2(premium),
    monthlyCost: round2(premium / buildMonths),
    premiumAsShareOfValue: round2(completedValue > 0 ? (premium / completedValue) * 100 : 0),
    deductible: round2(deductible),
  };
};

// --- 2. Vacant Home Insurance Calculator -----------------------------------------------
export const vacantHomeInsuranceCalculator: CustomCalculator = (values) => {
  const normalPremium = pos(values.normalPremium, 1800);
  const surchargePercent = pos(values.surchargePercent, 60);
  const monthsVacant = Math.min(12, pos(values.monthsVacant, 8));

  const vacantMonthly = (normalPremium / 12) * (1 + surchargePercent / 100);
  const occupiedMonthly = normalPremium / 12;
  const yearly = vacantMonthly * monthsVacant + occupiedMonthly * (12 - monthsVacant);

  return {
    vacantMonthlyPremium: round2(vacantMonthly),
    yearlyCost: round2(yearly),
    extraCostOfVacancy: round2(yearly - normalPremium),
    vacancyCostForPeriod: round2(vacantMonthly * monthsVacant),
  };
};

// --- 3. Jewelry Insurance Calculator ---------------------------------------------------
export const jewelryInsuranceCalculator: CustomCalculator = (values) => {
  const itemValue = pos(values.itemValue, 12000);
  const raw = Math.round(safeNumber(values.itemType, 1));
  const itemType = [1, 2, 3, 4, 5].includes(raw) ? raw : 1;
  const quotedRate = pos(values.ratePercent, 0);
  const ratePercent = quotedRate > 0 ? quotedRate : [1.5, 0.3, 1, 1, 2][itemType - 1];
  const homeownersSublimit = pos(values.homeownersSublimit, 1500);
  const deductible = pos(values.deductible, 0);

  const premium = (itemValue * ratePercent) / 100;

  return {
    rateUsed: ratePercent,
    yearlyPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    payoutIfStolenScheduled: round2(Math.max(0, itemValue - deductible)),
    payoutIfStolenUnscheduled: round2(Math.min(itemValue, homeownersSublimit)),
    uncoveredWithoutScheduling: round2(Math.max(0, itemValue - homeownersSublimit)),
  };
};

// --- 4. Identity Theft Insurance Calculator --------------------------------------------
export const identityTheftInsuranceCalculator: CustomCalculator = (values) => {
  const monthlyPremium = pos(values.monthlyPremium, 15);
  const yearlyChancePercent = Math.min(100, pos(values.yearlyChancePercent, 3));
  const outOfPocketIfVictim = pos(values.outOfPocketIfVictim, 1500);
  const hoursToResolve = pos(values.hoursToResolve, 20);
  const hourlyValue = pos(values.hourlyValue, 30);

  const costIfVictim = outOfPocketIfVictim + hoursToResolve * hourlyValue;
  const expected = (costIfVictim * yearlyChancePercent) / 100;

  return {
    yearlyPremium: round2(monthlyPremium * 12),
    costIfYouAreAVictim: round2(costIfVictim),
    expectedYearlyLoss: round2(expected),
    premiumMinusExpectedLoss: round2(monthlyPremium * 12 - expected),
  };
};

export const insHomeValuablesCustomCalculators: Record<string, CustomCalculator> = {
  "builders-risk-insurance-calculator": buildersRiskInsuranceCalculator,
  "vacant-home-insurance-calculator": vacantHomeInsuranceCalculator,
  "jewelry-insurance-calculator": jewelryInsuranceCalculator,
  "identity-theft-insurance-calculator": identityTheftInsuranceCalculator,
};
