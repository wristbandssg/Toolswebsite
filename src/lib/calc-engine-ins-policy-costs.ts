/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 9 of 11 — Policy
 * Costs & Claims (7 tools), filed under Insurance Calculators > Home &
 * Property Insurance Calculators. These apply to any policy (home, auto,
 * renters). See calc-engine-ins-life-core.ts for the full batch context.
 *
 *  - premiumVsDeductible: premium saved by a higher deductible vs the
 *    extra paid per claim; break-even years and expected yearly cost.
 *  - insuranceClaimPayout: replacement cost vs actual cash value
 *    (straight-line depreciation over useful life), less the deductible.
 *  - insuranceClaimVsOutOfPocket (incl. no-claims discount): payout vs
 *    future premium surcharge and lost discount.
 *  - insuranceBundleDiscount (incl. multi-car): multi-car discount on the
 *    auto policies, then the home + auto bundle discount.
 *  - insuranceLapse (incl. grace period): uncovered days after the grace
 *    period, premium saved vs the surcharge afterwards.
 *  - insuranceCancellationRefund: pro-rata vs short-rate refund of the
 *    unearned premium.
 *  - directVsAgentInsurance (incl. agent commission): commission built
 *    into an agent's premium vs a direct quote.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-policy-costs-calculators.ts for the copy.
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

// --- 1. Premium vs Deductible Calculator -----------------------------------------------
export const premiumVsDeductibleCalculator: CustomCalculator = (values) => {
  const lowDeductible = pos(values.lowDeductible, 500);
  const lowDeductiblePremium = pos(values.lowDeductiblePremium, 1500);
  const highDeductible = pos(values.highDeductible, 1000);
  const highDeductiblePremium = pos(values.highDeductiblePremium, 1250);
  const claimChancePercent = Math.min(100, pos(values.claimChancePercent, 10));

  const premiumSavings = lowDeductiblePremium - highDeductiblePremium;
  const extraPerClaim = highDeductible - lowDeductible;
  const expectedLow = lowDeductiblePremium + (lowDeductible * claimChancePercent) / 100;
  const expectedHigh = highDeductiblePremium + (highDeductible * claimChancePercent) / 100;

  return {
    yearlyPremiumSavings: round2(premiumSavings),
    extraOutOfPocketPerClaim: round2(extraPerClaim),
    breakEvenYears: round2(premiumSavings > 0 && extraPerClaim > 0 ? extraPerClaim / premiumSavings : 0),
    expectedYearlyCostLow: round2(expectedLow),
    expectedYearlyCostHigh: round2(expectedHigh),
    expectedSavingsWithHigh: round2(expectedLow - expectedHigh),
  };
};

// --- 2. Insurance Claim Payout Calculator (ACV vs replacement cost) --------------------
export const insuranceClaimPayoutCalculator: CustomCalculator = (values) => {
  const replacementCost = pos(values.replacementCost, 5000);
  const ageYears = pos(values.ageYears, 4);
  const usefulLifeYears = Math.max(1, pos(values.usefulLifeYears, 10));
  const deductible = pos(values.deductible, 1000);
  const policyType = pick(values.policyType, 1, 2);

  const depreciation = replacementCost * Math.min(1, ageYears / usefulLifeYears);
  const acv = replacementCost - depreciation;
  const rcPayout = Math.max(0, replacementCost - deductible);
  const acvPayout = Math.max(0, acv - deductible);

  return {
    depreciation: round2(depreciation),
    actualCashValue: round2(acv),
    replacementCostPayout: round2(rcPayout),
    actualCashValuePayout: round2(acvPayout),
    yourPayout: round2(policyType === 1 ? rcPayout : acvPayout),
    differenceBetweenPolicies: round2(rcPayout - acvPayout),
  };
};

// --- 3. Insurance Claim vs Out-of-Pocket Calculator ------------------------------------
export const insuranceClaimVsOutOfPocketCalculator: CustomCalculator = (values) => {
  const damage = pos(values.damage, 2500);
  const deductible = pos(values.deductible, 1000);
  const yearlyPremium = pos(values.yearlyPremium, 1800);
  const surchargePercent = pos(values.surchargePercent, 20);
  const noClaimsDiscountPercent = pos(values.noClaimsDiscountPercent, 0);
  const years = pos(values.years, 3);

  const payout = Math.max(0, damage - deductible);
  const increase = (yearlyPremium * (surchargePercent + noClaimsDiscountPercent) * years) / 100;

  return {
    claimPayout: round2(payout),
    futurePremiumIncrease: round2(increase),
    costIfYouClaim: round2(Math.min(damage, deductible) + increase),
    costIfYouPayYourself: round2(damage),
    netBenefitOfClaiming: round2(payout - increase),
    breakEvenDamage: round2(deductible + increase),
  };
};

// --- 4. Insurance Bundle Discount Calculator (incl. multi-car) -------------------------
export const insuranceBundleDiscountCalculator: CustomCalculator = (values) => {
  const homePremium = pos(values.homePremium, 1800);
  const autoPremiumPerCar = pos(values.autoPremiumPerCar, 1400);
  const cars = Math.round(pos(values.cars, 2));
  const multiCarDiscountPercent = Math.min(100, pos(values.multiCarDiscountPercent, 20));
  const bundleDiscountPercent = Math.min(100, pos(values.bundleDiscountPercent, 15));

  const autoList = autoPremiumPerCar * cars;
  const multiCarSavings = cars >= 2 ? (autoList * multiCarDiscountPercent) / 100 : 0;
  const beforeBundle = homePremium + autoList - multiCarSavings;
  const bundled = homePremium > 0 && cars > 0 ? beforeBundle * (1 - bundleDiscountPercent / 100) : beforeBundle;
  const listTotal = homePremium + autoList;

  return {
    totalWithoutDiscounts: round2(listTotal),
    multiCarSavings: round2(multiCarSavings),
    bundleSavings: round2(beforeBundle - bundled),
    bundledTotal: round2(bundled),
    totalSavings: round2(listTotal - bundled),
    savingsPercent: round2(listTotal > 0 ? ((listTotal - bundled) / listTotal) * 100 : 0),
    monthlyBundled: round2(bundled / 12),
  };
};

// --- 5. Insurance Lapse Calculator (incl. grace period) --------------------------------
export const insuranceLapseCalculator: CustomCalculator = (values) => {
  const yearlyPremium = pos(values.yearlyPremium, 1600);
  const daysUnpaid = pos(values.daysUnpaid, 45);
  const graceDays = pos(values.graceDays, 10);
  const surchargePercent = pos(values.surchargePercent, 20);
  const surchargeYears = pos(values.surchargeYears, 3);

  const uncoveredDays = Math.max(0, daysUnpaid - graceDays);
  const saved = (yearlyPremium / 365) * uncoveredDays;
  const surcharge = uncoveredDays > 0 ? (yearlyPremium * surchargePercent * surchargeYears) / 100 : 0;

  return {
    daysWithoutCoverage: round2(uncoveredDays),
    premiumSavedDuringLapse: round2(saved),
    futureSurcharge: round2(surcharge),
    netCostOfLapse: round2(surcharge - saved),
  };
};

// --- 6. Insurance Cancellation Refund Calculator ---------------------------------------
export const insuranceCancellationRefundCalculator: CustomCalculator = (values) => {
  const premium = pos(values.premium, 1200);
  const termDays = Math.max(1, pos(values.termDays, 365));
  const daysUsed = Math.min(termDays, pos(values.daysUsed, 120));
  const method = pick(values.method, 1, 2);
  const shortRatePenaltyPercent = Math.min(100, pos(values.shortRatePenaltyPercent, 10));
  const cancellationFee = pos(values.cancellationFee, 0);

  const earned = (premium * daysUsed) / termDays;
  const unearned = premium - earned;
  const proRata = Math.max(0, unearned - cancellationFee);
  const shortRate = Math.max(0, unearned * (1 - shortRatePenaltyPercent / 100) - cancellationFee);

  return {
    earnedPremium: round2(earned),
    unearnedPremium: round2(unearned),
    proRataRefund: round2(proRata),
    shortRateRefund: round2(shortRate),
    yourRefund: round2(method === 1 ? proRata : shortRate),
    shortRatePenalty: round2(proRata - shortRate),
  };
};

// --- 7. Direct vs Agent Insurance Calculator (incl. agent commission) ------------------
export const directVsAgentInsuranceCalculator: CustomCalculator = (values) => {
  const agentPremium = pos(values.agentPremium, 1800);
  const directPremium = pos(values.directPremium, 1600);
  const newCommissionPercent = pos(values.newCommissionPercent, 12);
  const renewalCommissionPercent = pos(values.renewalCommissionPercent, 8);
  const years = Math.max(1, pos(values.years, 5));

  const firstYearCommission = (agentPremium * newCommissionPercent) / 100;
  const commissionOverYears =
    firstYearCommission + ((agentPremium * renewalCommissionPercent) / 100) * (years - 1);
  const yearlySavings = agentPremium - directPremium;

  return {
    firstYearCommission: round2(firstYearCommission),
    commissionOverYears: round2(commissionOverYears),
    yearlySavingsGoingDirect: round2(yearlySavings),
    savingsOverYears: round2(yearlySavings * years),
    savingsPercent: round2(agentPremium > 0 ? (yearlySavings / agentPremium) * 100 : 0),
  };
};

export const insPolicyCostsCustomCalculators: Record<string, CustomCalculator> = {
  "premium-vs-deductible-calculator": premiumVsDeductibleCalculator,
  "insurance-claim-payout-calculator": insuranceClaimPayoutCalculator,
  "insurance-claim-vs-out-of-pocket-calculator": insuranceClaimVsOutOfPocketCalculator,
  "insurance-bundle-discount-calculator": insuranceBundleDiscountCalculator,
  "insurance-lapse-calculator": insuranceLapseCalculator,
  "insurance-cancellation-refund-calculator": insuranceCancellationRefundCalculator,
  "direct-vs-agent-insurance-calculator": directVsAgentInsuranceCalculator,
};
