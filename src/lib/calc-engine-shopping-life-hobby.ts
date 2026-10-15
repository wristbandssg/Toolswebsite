/**
 * Batch: "Shopping Calculators" → Lifestyle, Party & Wedding — pets and
 * hobby crafts (11 tools):
 *
 *  - beerAbv: ABV (standard and alternate formula), attenuation, calories.
 *  - candleWax / candleFragranceLoad: wax weight from container volume and
 *    fragrance oil from load percentage.
 *  - soapLye: NaOH and water for up to three oils with superfat.
 *  - crossStitchSize: finished design and fabric size by fabric count.
 *  - dogFoodAmount / catFoodAmount: daily calories (RER × life-stage factor)
 *    turned into cups and cans, with cost.
 *  - dogCrateSize / birdCageSize: minimum enclosure sizes.
 *  - aquariumSize / aquariumHeaterSize: tank volume, stocking and heater
 *    wattage.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-life-hobby-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));
const mult = (v: number) => (safeNumber(v) > 0 ? safeNumber(v) : 1);

const plato = (sg: number) => -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;

export const beerAbv: CustomCalculator = (v) => {
  const og = nonNeg(v.og);
  const fg = nonNeg(v.fg);
  if (og <= 1 || fg <= 0 || fg > og) return { abvPercent: 0, abvAlternate: 0, apparentAttenuation: 0, caloriesPer12oz: 0 };
  const abv = (og - fg) * 131.25;
  const alt = ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  const oe = plato(og);
  const ae = plato(fg);
  const re = 0.1808 * oe + 0.8192 * ae;
  const abw = (oe - re) / (2.0665 - 0.010665 * oe);
  const cal = (6.9 * abw + 4 * (re - 0.1)) * fg * 3.55;
  return {
    abvPercent: round2(abv),
    abvAlternate: round2(alt),
    apparentAttenuation: round2(((og - fg) / (og - 1)) * 100),
    caloriesPer12oz: Math.round(cal),
  };
};

const WAX_DENSITY = 0.86; // oz of wax per fl oz of container volume (soy / paraffin blends ≈ 0.8–0.9)

export const candleWax: CustomCalculator = (v) => {
  const n = Math.round(nonNeg(v.candles));
  const perCandle = nonNeg(v.containerFlOz) * WAX_DENSITY * (nonNeg(v.fillPercent) / 100);
  // Total melt (wax + fragrance) fills the jar, so split the poured weight.
  const waxEach = perCandle / (1 + nonNeg(v.fragranceLoad) / 100);
  const foEach = perCandle - waxEach;
  const waxTotal = waxEach * n;
  const cost = (waxTotal / 16) * nonNeg(v.waxPricePerLb) + foEach * n * nonNeg(v.fragrancePricePerOz);
  return {
    waxOzTotal: round2(waxTotal),
    waxLb: round2(waxTotal / 16),
    fragranceOzTotal: round2(foEach * n),
    waxPerCandleOz: round2(waxEach),
    pouredWeightPerCandleOz: round2(perCandle),
    suppliesCost: round2(cost),
  };
};

export const candleFragranceLoad: CustomCalculator = (v) => {
  const waxOz = nonNeg(v.waxOz);
  const load = nonNeg(v.load);
  const fo = (waxOz * load) / 100;
  return {
    fragranceOz: round2(fo),
    fragranceGrams: round2(fo * 28.35),
    totalBatchOz: round2(waxOz + fo),
    overWaxMaximum: load > nonNeg(v.maxLoad) ? 1 : 0,
    fragranceCost: round2(fo * nonNeg(v.pricePerOz)),
  };
};

export const soapLye: CustomCalculator = (v) => {
  const oils: [number, number][] = [[nonNeg(v.weight1), nonNeg(v.oil1)], [nonNeg(v.weight2), nonNeg(v.oil2)], [nonNeg(v.weight3), nonNeg(v.oil3)]];
  const total = oils.reduce((s, [w]) => s + w, 0);
  const lyeRaw = oils.reduce((s, [w, sap]) => s + w * sap, 0);
  const lye = lyeRaw * (1 - nonNeg(v.superfat) / 100);
  const water = (total * nonNeg(v.waterPercent)) / 100;
  return {
    lyeOz: round2(lye),
    waterOz: round2(water),
    totalOilsOz: round2(total),
    batchWeightOz: round2(total + lye + water),
    lyeConcentration: lye + water > 0 ? round2((lye / (lye + water)) * 100) : 0,
    lyeGrams: round2(lye * 28.35),
  };
};

export const crossStitchSize: CustomCalculator = (v) => {
  const count = nonNeg(v.fabricCount) || 14;
  const w = nonNeg(v.stitchesWide) / count;
  const h = nonNeg(v.stitchesHigh) / count;
  const m = nonNeg(v.marginIn) * 2;
  return {
    designWidthIn: round2(w),
    designHeightIn: round2(h),
    fabricWidthIn: round2(w > 0 ? w + m : 0),
    fabricHeightIn: round2(h > 0 ? h + m : 0),
    designWidthCm: round2(w * 2.54),
    designHeightCm: round2(h * 2.54),
  };
};

/** Resting energy requirement (kcal/day) from body weight in kg. */
const rer = (kg: number) => (kg > 0 ? 70 * Math.pow(kg, 0.75) : 0);

export const dogFoodAmount: CustomCalculator = (v) => {
  const kcal = rer(nonNeg(v.weightLb) * 0.4536) * mult(v.lifeStage);
  const perCup = nonNeg(v.kcalPerCup) || 380;
  const cups = kcal / perCup;
  const meals = Math.max(1, Math.round(nonNeg(v.meals) || 2));
  const bagCups = nonNeg(v.bagLb) * 4;
  const days = cups > 0 ? bagCups / cups : 0;
  return {
    cupsPerDay: round2(cups),
    caloriesPerDay: Math.round(kcal),
    cupsPerMeal: round2(cups / meals),
    daysPerBag: round2(days),
    monthlyCost: days > 0 ? round2((nonNeg(v.bagPrice) / days) * 30.4) : 0,
  };
};

export const catFoodAmount: CustomCalculator = (v) => {
  const kcal = rer(nonNeg(v.weightLb) * 0.4536) * mult(v.lifeStage);
  const wetShare = nonNeg(v.wetPercent) / 100;
  const dryCups = (kcal * (1 - wetShare)) / (nonNeg(v.dryKcalPerCup) || 400);
  const cans = (kcal * wetShare) / (nonNeg(v.wetKcalPerCan) || 180);
  const daily = dryCups * nonNeg(v.dryCostPerCup) + cans * nonNeg(v.canPrice);
  return {
    caloriesPerDay: Math.round(kcal),
    dryCupsPerDay: round2(dryCups),
    wetCansPerDay: round2(cans),
    monthlyCost: round2(daily * 30.4),
    dailyCost: round2(daily),
  };
};

const CRATES = [18, 22, 24, 30, 36, 42, 48, 54];

export const dogCrateSize: CustomCalculator = (v) => {
  const growing = idx(v.puppy, 1) === 1;
  const len = nonNeg(v.lengthIn) + 4;
  const ht = nonNeg(v.heightIn) + 3;
  const crate = len > 4 ? (CRATES.find((c) => c >= len) ?? 54) : 0;
  return {
    recommendedCrateIn: crate,
    minimumLengthIn: round2(nonNeg(v.lengthIn) > 0 ? len : 0),
    minimumHeightIn: round2(nonNeg(v.heightIn) > 0 ? ht : 0),
    useDivider: growing ? 1 : 0,
  };
};

// [width, depth, height, bar spacing] in inches for one bird
const BIRD: [number, number, number, number][] = [
  [30, 18, 18, 0.375], [18, 18, 24, 0.5], [24, 18, 24, 0.625], [24, 24, 30, 0.75], [36, 24, 48, 1], [48, 36, 60, 1.25],
];

export const birdCageSize: CustomCalculator = (v) => {
  const [w, d, h, bar] = BIRD[idx(v.bird, 5)];
  const extra = Math.max(0, Math.round(nonNeg(v.birds) || 1) - 1);
  const width = w * (1 + 0.5 * extra);
  return {
    minimumWidthIn: round2(width),
    minimumDepthIn: d,
    minimumHeightIn: h,
    barSpacingIn: bar,
    floorAreaSqIn: round2(width * d),
  };
};

export const aquariumSize: CustomCalculator = (v) => {
  const gallons = (nonNeg(v.lengthIn) * nonNeg(v.widthIn) * nonNeg(v.heightIn)) / 231;
  const fishInches = nonNeg(v.fishCount) * nonNeg(v.fishLengthIn);
  const galPerInch = mult(v.stocking);
  return {
    tankGallons: round2(gallons),
    tankLiters: round2(gallons * 3.785),
    filledWeightLb: Math.round(gallons * 8.34 * 0.9 + gallons * 1.2),
    fishInchesCapacity: round2((gallons * 0.9) / galPerInch),
    gallonsNeededForFish: round2(fishInches * galPerInch),
  };
};

const HEATERS = [25, 50, 75, 100, 150, 200, 250, 300];

export const aquariumHeaterSize: CustomCalculator = (v) => {
  const gal = nonNeg(v.gallons);
  const dT = Math.max(0, safeNumber(v.targetF) - safeNumber(v.roomF));
  const watts = gal * dT * 0.5;
  const heaters = gal > 75 ? 2 : 1;
  const each = watts / heaters;
  const pick = watts > 0 ? (HEATERS.find((h) => h >= each) ?? 300) : 0;
  const kwhMonth = ((pick * heaters) / 1000) * 24 * 30.4 * 0.3;
  return {
    wattsNeeded: Math.round(watts),
    heaterSizeW: pick,
    heaters,
    monthlyElectricityCost: round2(kwhMonth * nonNeg(v.rate)),
    temperatureRiseF: round2(dT),
  };
};

export const shoppingLifeHobbyCustomCalculators: Record<string, CustomCalculator> = {
  "beer-abv-calculator": beerAbv,
  "candle-wax-calculator": candleWax,
  "candle-fragrance-load-calculator": candleFragranceLoad,
  "soap-lye-calculator": soapLye,
  "cross-stitch-size-calculator": crossStitchSize,
  "dog-food-amount-calculator": dogFoodAmount,
  "cat-food-amount-calculator": catFoodAmount,
  "dog-crate-size-calculator": dogCrateSize,
  "bird-cage-size-calculator": birdCageSize,
  "aquarium-size-calculator": aquariumSize,
  "aquarium-heater-size-calculator": aquariumHeaterSize,
};
