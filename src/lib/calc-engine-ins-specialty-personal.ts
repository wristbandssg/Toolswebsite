/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 11 of 11 — Pet,
 * Travel & Events (5 tools), filed under Insurance Calculators > Business &
 * Specialty Insurance Calculators. See calc-engine-ins-life-core.ts for the
 * full batch context.
 *
 *  - petInsurance (incl. breed and age): base by species x breed risk x age
 *    x reimbursement and deductible factors; payout on expected vet bills.
 *  - petWellnessVsInsurance: wellness plan (routine care, capped) vs accident
 *    & illness insurance vs both vs neither.
 *  - travelInsurance (incl. trip cancellation, cruise, adventure sports,
 *    travel medical / international students): % of trip cost by plan x
 *    age factor, or per day for medical-only; cancel-for-any-reason add-on
 *    (+40%, refunds 75%).
 *  - annualTravelInsurance (multi-trip): yearly cost of single-trip plans vs
 *    one annual plan; break-even trips.
 *  - weddingInsurance (incl. event insurance): cancellation rate per $1,000
 *    + optional $1M liability; non-refundable deposits vs the limit.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-specialty-personal-calculators.ts for the copy.
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

// --- 1. Pet Insurance Calculator -------------------------------------------------------
export const petInsuranceCalculator: CustomCalculator = (values) => {
  const species = pick(values.species, 1, 2);
  const breedRisk = pick(values.breedRisk, 1, 3);
  const petAge = pos(values.petAge, 3);
  const reimbursementPercent = Math.min(100, pos(values.reimbursementPercent, 80));
  const deductible = pos(values.deductible, 250);
  const yearlyVetBills = pos(values.yearlyVetBills, 1500);

  const base = species === 1 ? 50 : 28;
  const fBreed = [1.0, 1.25, 1.6][breedRisk - 1];
  const fAge = 1 + 0.08 * Math.min(petAge, 15);
  const fReimb = Math.max(0.5, 1 + (reimbursementPercent - 80) * 0.015);
  const fDed = deductible <= 100 ? 1.2 : deductible <= 250 ? 1.1 : deductible <= 500 ? 1.0 : 0.85;
  const monthly = base * fBreed * fAge * fReimb * fDed;
  const reimbursement = (Math.max(0, yearlyVetBills - deductible) * reimbursementPercent) / 100;

  return {
    monthlyPremium: round2(monthly),
    yearlyPremium: round2(monthly * 12),
    reimbursementOnVetBills: round2(reimbursement),
    yourCostWithInsurance: round2(monthly * 12 + yearlyVetBills - reimbursement),
    netSavings: round2(reimbursement - monthly * 12),
  };
};

// --- 2. Pet Wellness Plan vs Pet Insurance Calculator ----------------------------------
export const petWellnessVsInsuranceCalculator: CustomCalculator = (values) => {
  const wellnessMonthly = pos(values.wellnessMonthly, 25);
  const wellnessCap = pos(values.wellnessCap, 400);
  const routineCosts = pos(values.routineCosts, 450);
  const insuranceMonthly = pos(values.insuranceMonthly, 45);
  const deductible = pos(values.deductible, 250);
  const reimbursementPercent = Math.min(100, pos(values.reimbursementPercent, 80));
  const unexpectedBills = pos(values.unexpectedBills, 2000);

  const wellnessYearly = wellnessMonthly * 12;
  const wellnessPays = Math.min(routineCosts, wellnessCap);
  const insuranceYearly = insuranceMonthly * 12;
  const insurancePays = (Math.max(0, unexpectedBills - deductible) * reimbursementPercent) / 100;
  const bills = routineCosts + unexpectedBills;

  const neither = bills;
  const wellnessOnly = wellnessYearly + bills - wellnessPays;
  const insuranceOnly = insuranceYearly + bills - insurancePays;
  const both = wellnessYearly + insuranceYearly + bills - wellnessPays - insurancePays;

  return {
    costWithNeither: round2(neither),
    costWithWellnessPlanOnly: round2(wellnessOnly),
    costWithInsuranceOnly: round2(insuranceOnly),
    costWithBoth: round2(both),
    lowestTotalCost: round2(Math.min(neither, wellnessOnly, insuranceOnly, both)),
    wellnessPlanNetValue: round2(wellnessPays - wellnessYearly),
  };
};

// --- 3. Travel Insurance Calculator ----------------------------------------------------
export const travelInsuranceCalculator: CustomCalculator = (values) => {
  const tripCost = pos(values.tripCost, 5000);
  const travelerAge = pos(values.travelerAge, 40);
  const planType = pick(values.planType, 1, 5);
  const tripDays = Math.max(1, pos(values.tripDays, 10));
  const cfar = Math.round(safeNumber(values.cfar, 0)) === 1;

  const fAge = travelerAge < 30 ? 0.8 : travelerAge < 50 ? 1.0 : travelerAge < 65 ? 1.4 : travelerAge < 75 ? 2.0 : 3.0;
  const medicalOnly = planType === 5;
  const ratePercent = [5.5, 6.5, 8, 4, 0][planType - 1];
  const base = medicalOnly ? tripDays * 2.5 * fAge : (tripCost * ratePercent * fAge) / 100;
  const premium = base * (cfar && !medicalOnly ? 1.4 : 1);

  return {
    premium: round2(premium),
    premiumAsShareOfTrip: round2(tripCost > 0 ? (premium / tripCost) * 100 : 0),
    costPerDay: round2(premium / tripDays),
    cancellationReimbursement: round2(medicalOnly ? 0 : tripCost),
    cancelForAnyReasonRefund: round2(cfar && !medicalOnly ? tripCost * 0.75 : 0),
  };
};

// --- 4. Annual Travel Insurance Calculator (multi-trip) --------------------------------
export const annualTravelInsuranceCalculator: CustomCalculator = (values) => {
  const tripsPerYear = pos(values.tripsPerYear, 4);
  const averageTripCost = pos(values.averageTripCost, 2000);
  const singleTripRatePercent = pos(values.singleTripRatePercent, 5);
  const annualPlanPremium = pos(values.annualPlanPremium, 350);

  const perTrip = (averageTripCost * singleTripRatePercent) / 100;
  const singleTotal = perTrip * tripsPerYear;

  return {
    singleTripPlanEach: round2(perTrip),
    yearlyCostSingleTripPlans: round2(singleTotal),
    annualPlanCost: round2(annualPlanPremium),
    savingsWithAnnualPlan: round2(singleTotal - annualPlanPremium),
    breakEvenTrips: round2(perTrip > 0 ? annualPlanPremium / perTrip : 0),
  };
};

// --- 5. Wedding Insurance Calculator (incl. event insurance) ---------------------------
export const weddingInsuranceCalculator: CustomCalculator = (values) => {
  const eventCost = pos(values.eventCost, 30000);
  const cancellationCoverage = pos(values.cancellationCoverage, 30000);
  const ratePer1000 = pos(values.ratePer1000, 8);
  const liability = pick(values.liability, 2, 2);
  const liabilityPremium = liability === 2 ? pos(values.liabilityPremium, 185) : 0;
  const nonRefundableDeposits = pos(values.nonRefundableDeposits, 12000);

  const cancellation = (cancellationCoverage / 1000) * ratePer1000;
  const total = cancellation + liabilityPremium;

  return {
    cancellationPremium: round2(cancellation),
    liabilityPremium: round2(liabilityPremium),
    totalPremium: round2(total),
    premiumAsShareOfEvent: round2(eventCost > 0 ? (total / eventCost) * 100 : 0),
    depositsProtected: round2(Math.min(nonRefundableDeposits, cancellationCoverage)),
    depositsNotCovered: round2(Math.max(0, nonRefundableDeposits - cancellationCoverage)),
  };
};

export const insSpecialtyPersonalCustomCalculators: Record<string, CustomCalculator> = {
  "pet-insurance-calculator": petInsuranceCalculator,
  "pet-wellness-plan-vs-insurance-calculator": petWellnessVsInsuranceCalculator,
  "travel-insurance-calculator": travelInsuranceCalculator,
  "annual-travel-insurance-calculator": annualTravelInsuranceCalculator,
  "wedding-insurance-calculator": weddingInsuranceCalculator,
};
