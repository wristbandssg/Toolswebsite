/**
 * Batch: "Shopping Calculators" → Gold, Silver & Jewelry — gold karat
 * family (7 tools). gold-melt-calculator (existing) values mixed scrap with
 * a karat dropdown; each tool here answers one karat's own search ("how
 * much is 14k gold worth per gram") with that karat's purity built in, the
 * value per gram and per pennyweight, pure gold content and a buyer offer.
 * goldKarat converts any karat number to purity and fineness.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-gold-karats-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

const GRAMS_PER_TROY_OZ = 31.1034768;
const GRAMS_PER_DWT = 1.55517384;
/** Weight unit dropdown: 0 = grams, 1 = pennyweight, 2 = troy ounces. */
const toGrams = (w: number, unit: number) => w * [1, GRAMS_PER_DWT, GRAMS_PER_TROY_OZ][Math.min(2, Math.max(0, Math.round(safeNumber(unit))))];

function valueAt(purity: number, v: Record<string, number>) {
  const grams = toGrams(nonNeg(v.weight), v.unit);
  const perGramPure = nonNeg(v.spotPrice) / GRAMS_PER_TROY_OZ;
  const perGram = perGramPure * purity;
  const melt = grams * perGram;
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * (nonNeg(v.payoutPercent) / 100)),
    valuePerGram: round2(perGram),
    valuePerDwt: round2(perGram * GRAMS_PER_DWT),
    pureGoldGrams: round2(grams * purity * 1000) / 1000,
  };
}

const karat = (purity: number): CustomCalculator => (v) => valueAt(purity, v);

export const goldKarat: CustomCalculator = (v) => {
  const k = Math.min(24, nonNeg(v.karat));
  const purity = k / 24;
  return {
    ...valueAt(purity, v),
    purityPercent: round2(purity * 100),
    fineness: Math.round(purity * 1000),
  };
};

export const shoppingGoldKaratsCustomCalculators: Record<string, CustomCalculator> = {
  "gold-karat-calculator": goldKarat,
  "9k-gold-calculator": karat(0.375),
  "10k-gold-calculator": karat(0.4167),
  "14k-gold-calculator": karat(0.585),
  "18k-gold-calculator": karat(0.75),
  "22k-gold-calculator": karat(0.9167),
  "24k-gold-calculator": karat(0.999),
};
