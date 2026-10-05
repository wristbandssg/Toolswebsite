/**
 * Batch: "Insurance Calculators" (5 Oct 2026), sub-batch 7 of 11 — Home &
 * Property (8 tools), filed under Insurance Calculators > Home & Property
 * Insurance Calculators (with homeowners-insurance-calculator, which moves
 * here from Real Estate). See calc-engine-ins-life-core.ts for the full
 * batch context.
 *
 *  - rentersInsurance: base + rate per $1,000 of belongings.
 *  - condoInsurance (HO-6): walls-in + belongings + loss assessment vs the
 *    HOA master policy deductible.
 *  - floodInsurance: NFIP limits ($250,000 building, $100,000 contents),
 *    rate per $100 by zone; chance of a flood over 30 years.
 *  - earthquakeInsurance: % deductible and payout on a given loss.
 *  - umbrellaInsurance: assets + future income exposed vs underlying
 *    liability limits -> umbrella size and premium.
 *  - landlordInsurance (incl. short-term rental host): dwelling fire policy
 *    with lost rent vs a homeowners policy.
 *  - titleInsurance: owner's policy rate + simultaneous lender's policy.
 *  - homeReplacementCost (incl. high-value homes): rebuild cost by quality,
 *    debris and code upgrades vs your dwelling coverage and extended
 *    replacement.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-ins-home-property-calculators.ts for the copy.
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

// --- 1. Renters Insurance Calculator ---------------------------------------------------
export const rentersInsuranceCalculator: CustomCalculator = (values) => {
  const belongings = pos(values.belongings, 30000);
  const ratePer1000 = pos(values.ratePer1000, 5);
  const basePremium = pos(values.basePremium, 60);
  const deductible = pos(values.deductible, 500);

  const premium = basePremium + (belongings / 1000) * ratePer1000;

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    payoutOnTotalLoss: round2(Math.max(0, belongings - deductible)),
    costPer1000Covered: round2(belongings > 0 ? (premium / belongings) * 1000 : 0),
  };
};

// --- 2. Condo Insurance Calculator (HO-6) ----------------------------------------------
export const condoInsuranceCalculator: CustomCalculator = (values) => {
  const wallsIn = pos(values.wallsIn, 50000);
  const belongings = pos(values.belongings, 30000);
  const lossAssessment = pos(values.lossAssessment, 25000);
  const ratePer1000 = pos(values.ratePer1000, 4);
  const masterDeductible = pos(values.masterDeductible, 25000);
  const units = Math.max(1, pos(values.units, 20));

  const premium = ((wallsIn + belongings) / 1000) * ratePer1000 + (lossAssessment / 1000) * 1;
  const share = masterDeductible / units;

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    yourShareOfMasterDeductible: round2(share),
    lossAssessmentShortfall: round2(Math.max(0, share - lossAssessment)),
  };
};

// --- 3. Flood Insurance Calculator -----------------------------------------------------
export const floodInsuranceCalculator: CustomCalculator = (values) => {
  const buildingCoverage = Math.min(250000, pos(values.buildingCoverage, 250000));
  const contentsCoverage = Math.min(100000, pos(values.contentsCoverage, 100000));
  const ratePer100 = pos(values.ratePer100, 0.35);
  const zone = pick(values.zone, 1, 3);
  const years = pos(values.years, 30);

  const fZone = [0.5, 1.0, 2.0][zone - 1];
  const annualChance = [0.2, 1, 2][zone - 1];
  const premium = ((buildingCoverage + contentsCoverage) / 100) * ratePer100 * fZone;

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    annualFloodChance: annualChance,
    chanceOfFloodOverYears: round2((1 - Math.pow(1 - annualChance / 100, years)) * 100),
    totalCoverage: round2(buildingCoverage + contentsCoverage),
  };
};

// --- 4. Earthquake Insurance Calculator ------------------------------------------------
export const earthquakeInsuranceCalculator: CustomCalculator = (values) => {
  const dwellingCoverage = pos(values.dwellingCoverage, 400000);
  const ratePer1000 = pos(values.ratePer1000, 2.5);
  const deductiblePercent = Math.min(50, pos(values.deductiblePercent, 15));
  const damage = pos(values.damage, 150000);

  const premium = (dwellingCoverage / 1000) * ratePer1000;
  const deductible = (dwellingCoverage * deductiblePercent) / 100;

  return {
    annualPremium: round2(premium),
    deductibleAmount: round2(deductible),
    payoutOnThisDamage: round2(Math.max(0, Math.min(damage, dwellingCoverage) - deductible)),
    youPayOnThisDamage: round2(Math.min(damage, deductible) + Math.max(0, damage - dwellingCoverage)),
  };
};

// --- 5. Umbrella Insurance Calculator --------------------------------------------------
export const umbrellaInsuranceCalculator: CustomCalculator = (values) => {
  const netWorth = pos(values.netWorth, 800000);
  const yearlyIncome = pos(values.yearlyIncome, 100000);
  const incomeYears = pos(values.incomeYears, 5);
  const underlyingLiability = pos(values.underlyingLiability, 300000);
  const firstMillionPremium = pos(values.firstMillionPremium, 300);
  const additionalMillionPremium = pos(values.additionalMillionPremium, 100);

  const exposure = netWorth + yearlyIncome * incomeYears;
  const millions = Math.max(1, Math.ceil(Math.max(0, exposure - underlyingLiability) / 1000000));
  const premium = firstMillionPremium + (millions - 1) * additionalMillionPremium;

  return {
    totalExposure: round2(exposure),
    gapAboveUnderlying: round2(Math.max(0, exposure - underlyingLiability)),
    suggestedUmbrellaMillions: millions,
    annualPremium: round2(premium),
    totalProtection: round2(underlyingLiability + millions * 1000000),
  };
};

// --- 6. Landlord Insurance Calculator --------------------------------------------------
export const landlordInsuranceCalculator: CustomCalculator = (values) => {
  const dwellingValue = pos(values.dwellingValue, 300000);
  const ratePer1000 = pos(values.ratePer1000, 7);
  const rentalType = pick(values.rentalType, 1, 2);
  const monthlyRent = pos(values.monthlyRent, 2000);
  const lostRentMonths = pos(values.lostRentMonths, 12);
  const homeownersPremium = pos(values.homeownersPremium, 1800);

  const premium = (dwellingValue / 1000) * ratePer1000 * (rentalType === 2 ? 1.4 : 1);

  return {
    annualPremium: round2(premium),
    monthlyPremium: round2(premium / 12),
    lostRentCoverage: round2(monthlyRent * lostRentMonths),
    differenceFromHomeowners: round2(premium - homeownersPremium),
    premiumAsShareOfRent: round2(monthlyRent > 0 ? (premium / (monthlyRent * 12)) * 100 : 0),
  };
};

// --- 7. Title Insurance Calculator -----------------------------------------------------
export const titleInsuranceCalculator: CustomCalculator = (values) => {
  const purchasePrice = pos(values.purchasePrice, 400000);
  const ownerRatePercent = pos(values.ownerRatePercent, 0.5);
  const loanAmount = pos(values.loanAmount, 320000);
  const lenderSimultaneousFee = pos(values.lenderSimultaneousFee, 300);
  const endorsements = pos(values.endorsements, 150);
  const sellerPaysOwner = Math.round(safeNumber(values.sellerPaysOwner, 0)) === 1;

  const owner = (purchasePrice * ownerRatePercent) / 100;
  const lender = loanAmount > 0 ? lenderSimultaneousFee : 0;
  const total = owner + lender + endorsements;

  return {
    ownersPolicy: round2(owner),
    lendersPolicy: round2(lender),
    totalTitleInsurance: round2(total),
    buyerPays: round2(sellerPaysOwner ? lender + endorsements : total),
  };
};

// --- 8. Home Replacement Cost Calculator -----------------------------------------------
export const homeReplacementCostCalculator: CustomCalculator = (values) => {
  const sqft = pos(values.sqft, 2200);
  const costPerSqft = pos(values.costPerSqft, 200);
  const quality = pick(values.quality, 1, 3);
  const debrisPercent = pos(values.debrisPercent, 5);
  const codePercent = pos(values.codePercent, 10);
  const dwellingCoverage = pos(values.dwellingCoverage, 400000);
  const extendedPercent = pos(values.extendedPercent, 25);

  const fQuality = [1.0, 1.3, 1.7][quality - 1];
  const base = sqft * costPerSqft * fQuality;
  const replacement = base * (1 + (debrisPercent + codePercent) / 100);
  const withExtended = dwellingCoverage * (1 + extendedPercent / 100);

  return {
    rebuildCost: round2(base),
    replacementCostWithExtras: round2(replacement),
    coverageGap: round2(Math.max(0, replacement - dwellingCoverage)),
    coverageWithExtendedReplacement: round2(withExtended),
    gapAfterExtendedReplacement: round2(Math.max(0, replacement - withExtended)),
  };
};

export const insHomePropertyCustomCalculators: Record<string, CustomCalculator> = {
  "renters-insurance-calculator": rentersInsuranceCalculator,
  "condo-insurance-calculator": condoInsuranceCalculator,
  "flood-insurance-calculator": floodInsuranceCalculator,
  "earthquake-insurance-calculator": earthquakeInsuranceCalculator,
  "umbrella-insurance-calculator": umbrellaInsuranceCalculator,
  "landlord-insurance-calculator": landlordInsuranceCalculator,
  "title-insurance-calculator": titleInsuranceCalculator,
  "home-replacement-cost-calculator": homeReplacementCostCalculator,
};
