/**
 * Batch: "Shopping Calculators" → Gold, Silver & Jewelry — silver, platinum
 * and weight units (11 tools). silver-melt-calculator (existing) values
 * silver generically; these value specific silver items and units:
 *
 *  - troyOunce: troy ounces ↔ grams, kilograms, avoirdupois ounces, grains,
 *    with the value of any precious metal.
 *  - pennyweight: weight in dwt and the jeweler's price per dwt for 10K,
 *    14K and 18K gold and sterling silver.
 *  - jewelryWeight: metal casting weight from the wax or resin model weight
 *    (specific-gravity ratio) plus sprue allowance, and metal cost.
 *  - junkSilver (also 90% silver): 90% coins by face value, 40% halves and
 *    35% war nickels.
 *  - silverCoinValue: bullion and US silver coins by silver content.
 *  - sterlingSilverValue: sterling items with a deduction for weighted fill.
 *  - silverDollarValue: Morgan/Peace/Eisenhower/Eagle melt plus a
 *    condition premium.
 *  - silverBarValue: 1 oz to 1 kg bars with premium and buyback.
 *  - silverQuarterValue: pre-1965 quarters (90%) vs clad.
 *  - sterlingFlatwareValue: a flatware set by piece counts, allowing for
 *    hollow-handle knives.
 *  - platinumValue (also platinum rings): weight × purity (950, 900, 850).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-gold-silver-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));
const round4 = (n: number) => Math.round(n * 10000) / 10000;

const G_OZT = 31.1034768;
const G_DWT = 1.55517384;

/** Grams per unit: troy oz, g, kg, avoirdupois oz, grain, dwt. */
const UNITS = [G_OZT, 1, 1000, 28.349523125, 0.06479891, G_DWT];

export const troyOunce: CustomCalculator = (v) => {
  const grams = nonNeg(v.amount) * UNITS[idx(v.unit, 5)];
  const ozt = grams / G_OZT;
  return {
    troyOunces: round4(ozt),
    grams: round2(grams),
    kilograms: round4(grams / 1000),
    avoirdupoisOunces: round4(grams / 28.349523125),
    grains: round2(grams / 0.06479891),
    metalValue: round2(ozt * nonNeg(v.pricePerOzt)),
  };
};

export const pennyweight: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight) * [G_DWT, 1, G_OZT][idx(v.unit, 2)];
  const dwt = grams / G_DWT;
  const goldDwt = nonNeg(v.goldSpot) / 20; // 20 dwt per troy ounce
  const silverDwt = nonNeg(v.silverSpot) / 20;
  return {
    pennyweight: round2(dwt),
    grams: round2(grams),
    price10kPerDwt: round2(goldDwt * 0.4167),
    price14kPerDwt: round2(goldDwt * 0.585),
    price18kPerDwt: round2(goldDwt * 0.75),
    sterlingPerDwt: round2(silverDwt * 0.925),
    valueAt14k: round2(dwt * goldDwt * 0.585),
  };
};

/** Specific gravity of casting metals: sterling, 10K, 14K, 18K, platinum 950, 22K. */
const METAL_SG = [10.36, 11.6, 13.1, 15.6, 20.7, 17.7];

export const jewelryWeight: CustomCalculator = (v) => {
  const modelSg = safeNumber(v.modelType) === 1 ? 1.2 : 1;
  const ratio = METAL_SG[idx(v.metal, 5)] / modelSg;
  const piece = nonNeg(v.modelWeight) * ratio;
  const toCast = piece * (1 + pct(v.sprueAllowance));
  return {
    castWeight: round2(piece),
    metalToMelt: round2(toCast),
    weightRatio: round2(ratio),
    metalCost: round2(toCast * nonNeg(v.metalPricePerGram)),
    castWeightDwt: round2(piece / G_DWT),
  };
};

export const junkSilver: CustomCalculator = (v) => {
  const oz = nonNeg(v.face90) * 0.715 + nonNeg(v.face40Halves) * 0.2958 + nonNeg(v.warNickels) * 0.05626;
  const melt = oz * nonNeg(v.spotPrice);
  const face = nonNeg(v.face90) + nonNeg(v.face40Halves) + nonNeg(v.warNickels) * 0.05;
  return {
    meltValue: round2(melt),
    dealerOffer: round2(melt * pct(v.dealerPercent)),
    silverOunces: round4(oz),
    timesFaceValue: face > 0 ? round2(melt / face) : 0,
    valuePerDollarFace90: round2(0.715 * nonNeg(v.spotPrice)),
  };
};

/** Silver content in troy oz by coin; dropdown value = index. */
const SILVER_COINS = [1, 1, 1, 1, 0.7734, 0.7734, 0.36169, 0.36169, 0.14792, 0.18084, 0.07234, 0.05626];

export const silverCoinValue: CustomCalculator = (v) => {
  const oz = SILVER_COINS[idx(v.coin, SILVER_COINS.length - 1)] * nonNeg(v.quantity);
  const melt = oz * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    dealerBuyback: round2(melt * pct(v.buybackPercent)),
    retailWithPremium: round2(melt * (1 + pct(v.premiumPercent))),
    silverOunces: round4(oz),
    valuePerCoin: nonNeg(v.quantity) > 0 ? round2(melt / nonNeg(v.quantity)) : 0,
  };
};

export const sterlingSilverValue: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight) * [1, G_OZT, 28.349523125][idx(v.unit, 2)] * (1 - pct(v.weightedFill));
  const oz = (grams * 0.925) / G_OZT;
  const melt = oz * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * pct(v.payoutPercent)),
    pureSilverOunces: round4(oz),
    sterlingGrams: round2(grams),
    valuePerGram: grams > 0 ? round2(melt / grams) : 0,
  };
};

const DOLLAR_SILVER = [0.7734, 0.7734, 0.3161, 1];

export const silverDollarValue: CustomCalculator = (v) => {
  const count = nonNeg(v.coins);
  const oz = DOLLAR_SILVER[idx(v.dollarType, 3)] * count;
  const melt = oz * nonNeg(v.spotPrice);
  const premium = [0.1, 0.3, 0.6, 1.5][idx(v.condition, 3)];
  return {
    estimatedValue: round2(melt * (1 + premium)),
    meltValue: round2(melt),
    silverOunces: round4(oz),
    meltPerCoin: count > 0 ? round2(melt / count) : 0,
    conditionPremium: round2(premium * 100),
  };
};

/** Bar sizes in troy ounces; dropdown value = index. */
const SILVER_BARS = [1, 5, 10, 100, 1000 / G_OZT];

export const silverBarValue: CustomCalculator = (v) => {
  const oz = SILVER_BARS[idx(v.barSize, 4)] * nonNeg(v.quantity) * 0.999;
  const melt = oz * nonNeg(v.spotPrice);
  const buy = melt * (1 + pct(v.premiumPercent));
  const sell = melt * pct(v.buybackPercent);
  return {
    meltValue: round2(melt),
    costToBuy: round2(buy),
    buybackValue: round2(sell),
    roundTripCost: round2(buy - sell),
    silverOunces: round2(oz),
  };
};

export const silverQuarterValue: CustomCalculator = (v) => {
  const n = nonNeg(v.quarters);
  const oz = n * 0.18084;
  const melt = oz * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    valuePerQuarter: round2(0.18084 * nonNeg(v.spotPrice)),
    dealerOffer: round2(melt * pct(v.dealerPercent)),
    silverOunces: round4(oz),
    timesFaceValue: n > 0 ? round2(melt / (n * 0.25)) : 0,
  };
};

export const sterlingFlatwareValue: CustomCalculator = (v) => {
  const grams =
    nonNeg(v.forks) * nonNeg(v.forkGrams) +
    nonNeg(v.spoons) * nonNeg(v.spoonGrams) +
    nonNeg(v.knives) * 15 + // hollow-handle knives: steel blade, cement-filled handle, ~15 g of silver
    nonNeg(v.servingPieces) * nonNeg(v.servingGrams);
  const oz = (grams * 0.925) / G_OZT;
  const melt = oz * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * pct(v.payoutPercent)),
    sterlingWeightGrams: round2(grams),
    pureSilverOunces: round4(oz),
    replacementValueEstimate: round2(melt * nonNeg(v.replacementMultiple, 3)),
  };
};

const PLATINUM_PURITY = [0.95, 0.9, 0.85, 0.999];

export const platinumValue: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight) * [1, G_DWT, G_OZT][idx(v.unit, 2)] - nonNeg(v.stoneCarats) * 0.2;
  const pure = Math.max(0, grams) * PLATINUM_PURITY[idx(v.purity, 3)];
  const melt = (pure / G_OZT) * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * pct(v.payoutPercent)),
    purePlatinumGrams: round2(pure * 1000) / 1000,
    valuePerGram: grams > 0 ? round2(melt / grams) : 0,
  };
};

export const shoppingGoldSilverCustomCalculators: Record<string, CustomCalculator> = {
  "troy-ounce-calculator": troyOunce,
  "pennyweight-calculator": pennyweight,
  "jewelry-weight-calculator": jewelryWeight,
  "junk-silver-calculator": junkSilver,
  "silver-coin-value-calculator": silverCoinValue,
  "sterling-silver-value-calculator": sterlingSilverValue,
  "silver-dollar-value-calculator": silverDollarValue,
  "silver-bar-value-calculator": silverBarValue,
  "silver-quarter-value-calculator": silverQuarterValue,
  "sterling-silver-flatware-value-calculator": sterlingFlatwareValue,
  "platinum-value-calculator": platinumValue,
};
