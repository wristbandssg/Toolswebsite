/**
 * Batch: "Shopping Calculators" → Gold, Silver & Jewelry — gold items and
 * conversions (12 tools). Each values a specific kind of gold:
 *
 *  - scrapGold: a mixed lot of 10K/14K/18K/22K at a refiner's payout.
 *  - goldFilledScrap: gold-filled items (1/20 14K etc.), where only 5–10%
 *    of the weight is karat gold.
 *  - dentalGold: crowns and bridges by dental alloy type.
 *  - pawnShopJewelryGold: pawn loan (with monthly interest) vs selling.
 *  - goldChainWeight: estimated weight from length, width, style, karat and
 *    solid/hollow — calibrated to typical 14K rope chains.
 *  - goldChainValue: melt, typical retail and resale value of a known chain.
 *  - goldRingValue (also white gold): ring melt value, deducting stones, or
 *    estimating the weight from ring size, band width and thickness.
 *  - goldPlatedValue: gold in plating from surface area and microns.
 *  - goldCoinValue: bullion and historic coins by actual gold weight.
 *  - goldBarValue: bars from 1 g to 1 kg with dealer premium and buyback.
 *  - goldToSilverRatio: the ratio, what your gold buys in silver, vs average.
 *  - goldWeight: grams ↔ troy oz ↔ pennyweight ↔ tola ↔ grains, with value.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-gold-items-calculators.ts for the copy.
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

const G_PER_OZT = 31.1034768;
const perGram = (spot: number) => nonNeg(spot) / G_PER_OZT;
/** Karat dropdown 0..5 → purity: 10K, 14K, 18K, 22K, 24K, 9K. */
const KARAT_PURITY = [0.4167, 0.585, 0.75, 0.9167, 0.999, 0.375];
/** Density g/cm³ by the same karat index. */
const KARAT_DENSITY = [11.6, 13.1, 15.6, 17.7, 19.3, 11.2];

export const scrapGold: CustomCalculator = (v) => {
  const pure = nonNeg(v.grams10k) * 0.4167 + nonNeg(v.grams14k) * 0.585 + nonNeg(v.grams18k) * 0.75 + nonNeg(v.grams22k) * 0.9167;
  const melt = pure * perGram(v.spotPrice);
  const total = nonNeg(v.grams10k) + nonNeg(v.grams14k) + nonNeg(v.grams18k) + nonNeg(v.grams22k);
  return {
    meltValue: round2(melt),
    payout: round2(melt * pct(v.payoutPercent)),
    pureGoldGrams: round2(pure * 1000) / 1000,
    totalWeight: round2(total),
    averagePurity: total > 0 ? round2((pure / total) * 100) : 0,
  };
};

/** Share of weight that is gold alloy × that alloy's purity. */
const GF_TYPES = [0.05 * 0.585, 0.05 * 0.5, 0.1 * 0.4167, 0.025 * 0.4167];

export const goldFilledScrap: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight);
  const pure = grams * GF_TYPES[idx(v.gfType, 3)];
  const melt = pure * perGram(v.spotPrice);
  return {
    meltValue: round2(melt),
    payout: round2(melt * pct(v.payoutPercent)),
    pureGoldGrams: round2(pure * 1000) / 1000,
    valuePerGram: grams > 0 ? round2(melt / grams) : 0,
  };
};

/** Approximate gold share by dental alloy: high noble yellow, high noble white, noble, base-metal. */
const DENTAL_GOLD = [0.62, 0.45, 0.25, 0];

export const dentalGold: CustomCalculator = (v) => {
  const grams = nonNeg(v.crowns) * nonNeg(v.gramsEach) * (1 - pct(v.porcelainPercent));
  const pure = grams * DENTAL_GOLD[idx(v.alloy, 3)];
  const melt = pure * perGram(v.spotPrice);
  return {
    meltValue: round2(melt),
    payout: round2(melt * pct(v.payoutPercent)),
    metalWeight: round2(grams),
    pureGoldGrams: round2(pure * 1000) / 1000,
  };
};

export const pawnShopJewelryGold: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight);
  const melt = grams * KARAT_PURITY[idx(v.karat, 5)] * perGram(v.spotPrice);
  const loan = melt * pct(v.loanPercent);
  const months = nonNeg(v.months);
  const interest = loan * pct(v.monthlyRate) * months;
  const sell = melt * pct(v.sellPercent);
  return {
    pawnLoan: round2(loan),
    repayAmount: round2(loan + interest),
    interestCost: round2(interest),
    sellOffer: round2(sell),
    meltValue: round2(melt),
    aprEquivalent: round2(pct(v.monthlyRate) * 12 * 100),
  };
};

/** Style weight factor relative to a rope chain. */
const CHAIN_STYLES = [1, 1.25, 1.2, 0.85, 0.9, 0.65, 1.1, 0.8];

export const goldChainWeight: CustomCalculator = (v) => {
  const width = nonNeg(v.widthMm);
  // 14K solid rope: about 0.3 g per inch at 2 mm, scaling with width^1.65.
  const gPerIn14 = width > 0 ? 0.3 * Math.pow(width / 2, 1.65) : 0;
  const k = idx(v.karat, 5);
  const density = KARAT_DENSITY[k] / 13.1;
  const hollow = safeNumber(v.construction) === 1 ? 0.45 : 1;
  const grams = nonNeg(v.lengthIn) * gPerIn14 * CHAIN_STYLES[idx(v.style, 7)] * density * hollow;
  const value = grams * KARAT_PURITY[k] * perGram(v.spotPrice);
  return {
    estimatedWeight: round2(grams),
    weightInDwt: round2(grams / 1.55517384),
    gramsPerInch: nonNeg(v.lengthIn) > 0 ? round2((grams / nonNeg(v.lengthIn)) * 100) / 100 : 0,
    estimatedMeltValue: round2(value),
  };
};

export const goldChainValue: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight);
  const melt = grams * KARAT_PURITY[idx(v.karat, 5)] * perGram(v.spotPrice);
  return {
    meltValue: round2(melt),
    retailPrice: round2(melt * nonNeg(v.retailMultiple, 2)),
    resaleOffer: round2(melt * pct(v.payoutPercent)),
    valuePerGram: grams > 0 ? round2(melt / grams) : 0,
    valuePerInch: nonNeg(v.lengthIn) > 0 ? round2(melt / nonNeg(v.lengthIn)) : 0,
  };
};

export const goldRingValue: CustomCalculator = (v) => {
  const k = idx(v.karat, 5);
  let grams = nonNeg(v.weight);
  let estimated = 0;
  if (grams <= 0) {
    const inner = 11.63 + 0.8128 * nonNeg(v.ringSize); // inner diameter mm from US size
    const t = nonNeg(v.thicknessMm);
    const volMm3 = Math.PI * (inner + t) * nonNeg(v.bandWidthMm) * t;
    grams = (volMm3 / 1000) * KARAT_DENSITY[k];
    estimated = 1;
  }
  const metal = Math.max(0, grams - nonNeg(v.stoneCarats) * 0.2);
  const melt = metal * KARAT_PURITY[k] * perGram(v.spotPrice);
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * pct(v.payoutPercent)),
    metalWeight: round2(metal),
    weightEstimated: estimated,
    pureGoldGrams: round2(metal * KARAT_PURITY[k] * 1000) / 1000,
  };
};

export const goldPlatedValue: CustomCalculator = (v) => {
  const items = nonNeg(v.items);
  const cm3 = items * nonNeg(v.areaCm2) * (nonNeg(v.microns) / 10000);
  const grams = cm3 * 19.3 * (safeNumber(v.platingKarat) === 1 ? 0.75 : 0.999);
  const value = grams * perGram(v.spotPrice);
  const net = value - nonNeg(v.refiningFee);
  return {
    goldValue: round2(value),
    goldGrams: round2(grams * 10000) / 10000,
    valuePerItem: items > 0 ? round2((value / items) * 100) / 100 : 0,
    netAfterRefining: round2(net),
    worthScrapping: net > 0 ? 1 : 0,
  };
};

/** Actual gold weight in troy oz by coin; dropdown value = index. */
const GOLD_COINS = [1, 0.5, 0.25, 0.1, 1, 1, 1, 1, 0.2354, 0.9675, 0.48375, 0.241875, 1.2057];

export const goldCoinValue: CustomCalculator = (v) => {
  const oz = GOLD_COINS[idx(v.coin, GOLD_COINS.length - 1)] * nonNeg(v.quantity);
  const melt = oz * nonNeg(v.spotPrice);
  return {
    meltValue: round2(melt),
    dealerBuyback: round2(melt * pct(v.buybackPercent)),
    retailWithPremium: round2(melt * (1 + pct(v.premiumPercent))),
    goldOunces: round2(oz * 10000) / 10000,
    valuePerCoin: nonNeg(v.quantity) > 0 ? round2(melt / nonNeg(v.quantity)) : 0,
  };
};

/** Bar sizes in grams; dropdown value = index. */
const BAR_GRAMS = [1, 5, 10, G_PER_OZT, 50, 100, G_PER_OZT * 10, 1000];

export const goldBarValue: CustomCalculator = (v) => {
  const grams = BAR_GRAMS[idx(v.barSize, BAR_GRAMS.length - 1)] * nonNeg(v.quantity);
  const melt = grams * 0.9999 * perGram(v.spotPrice);
  const buy = melt * (1 + pct(v.premiumPercent));
  const sell = melt * pct(v.buybackPercent);
  return {
    meltValue: round2(melt),
    costToBuy: round2(buy),
    buybackValue: round2(sell),
    roundTripCost: round2(buy - sell),
    priceRiseToBreakEven: sell > 0 ? round2(((buy - sell) / sell) * 100) : 0,
  };
};

export const goldToSilverRatio: CustomCalculator = (v) => {
  const gold = nonNeg(v.goldPrice);
  const silver = nonNeg(v.silverPrice);
  const ratio = silver > 0 ? gold / silver : 0;
  const avg = nonNeg(v.historicalAverage, 70);
  return {
    goldSilverRatio: round2(ratio),
    silverOuncesForYourGold: round2(ratio * nonNeg(v.goldOunces)),
    versusAverage: avg > 0 ? round2(((ratio - avg) / avg) * 100) : 0,
    silverPriceAtAverageRatio: avg > 0 ? round2(gold / avg) : 0,
  };
};

/** Grams per unit: g, troy oz, dwt, tola, avoirdupois oz, grain. */
const WEIGHT_UNITS = [1, G_PER_OZT, 1.55517384, 11.6638038, 28.349523125, 0.06479891];

export const goldWeight: CustomCalculator = (v) => {
  const grams = nonNeg(v.weight) * WEIGHT_UNITS[idx(v.fromUnit, 5)];
  const value = grams * KARAT_PURITY[idx(v.karat, 5)] * perGram(v.spotPrice);
  return {
    grams: round2(grams * 1000) / 1000,
    troyOunces: round2((grams / G_PER_OZT) * 10000) / 10000,
    pennyweight: round2(grams / 1.55517384),
    tola: round2((grams / 11.6638038) * 1000) / 1000,
    avoirdupoisOunces: round2((grams / 28.349523125) * 1000) / 1000,
    value: round2(value),
  };
};

export const shoppingGoldItemsCustomCalculators: Record<string, CustomCalculator> = {
  "scrap-gold-calculator": scrapGold,
  "gold-filled-scrap-value-calculator": goldFilledScrap,
  "dental-gold-value-calculator": dentalGold,
  "pawn-shop-jewelry-gold-calculator": pawnShopJewelryGold,
  "gold-chain-weight-calculator": goldChainWeight,
  "gold-chain-value-calculator": goldChainValue,
  "gold-ring-value-calculator": goldRingValue,
  "gold-plated-value-calculator": goldPlatedValue,
  "gold-coin-value-calculator": goldCoinValue,
  "gold-bar-value-calculator": goldBarValue,
  "gold-to-silver-ratio-calculator": goldToSilverRatio,
  "gold-weight-calculator": goldWeight,
};
