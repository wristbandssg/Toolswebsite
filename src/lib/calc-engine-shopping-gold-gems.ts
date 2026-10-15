/**
 * Batch: "Shopping Calculators" → Gold, Silver & Jewelry — coloured gems,
 * pearls and birthstones (9 tools).
 *
 * Coloured stones use a shared model: price per carat = base (good quality,
 * 1 ct) × carat^sizeExponent × quality tier, then each gem's own factors.
 *  - gemstoneMmToCarat: weight from L × W × depth, shape factor and the
 *    gem's specific gravity.
 *  - gemstonePrice: any of 16 gem types by size and quality.
 *  - rubyPrice: colour, treatment (unheated / heated / glass-filled), origin.
 *  - sapphirePrice: colour (blue, padparadscha, pink, yellow, white),
 *    heated or not, origin (Kashmir, Sri Lanka, Madagascar, Australia).
 *  - emeraldPrice: clarity enhancement (oil) level and origin.
 *  - topazPrice: blue/white/mystic vs rare imperial topaz.
 *  - opalValue: type (black, boulder, crystal, Ethiopian, white, fire) and
 *    brightness of play of colour.
 *  - pearlValue: type, size and grade, single pearl or strand by length.
 *  - birthstone: the month's stone and typical price range for a size.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-gold-gems-calculators.ts for the copy.
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

/** [name, base $/ct at 1 ct good quality, size exponent, specific gravity, Mohs hardness] */
const GEMS: [string, number, number, number, number][] = [
  ["Ruby", 1500, 0.6, 4.0, 9], // 0
  ["Blue sapphire", 1000, 0.5, 4.0, 9], // 1
  ["Emerald", 1200, 0.5, 2.72, 7.75], // 2
  ["Tanzanite", 400, 0.3, 3.35, 6.5], // 3
  ["Aquamarine", 200, 0.3, 2.72, 7.75], // 4
  ["Morganite", 100, 0.2, 2.8, 7.75], // 5
  ["Blue topaz", 25, 0.1, 3.53, 8], // 6
  ["Amethyst", 15, 0.1, 2.65, 7], // 7
  ["Citrine", 15, 0.1, 2.65, 7], // 8
  ["Garnet", 50, 0.15, 3.9, 7], // 9
  ["Peridot", 60, 0.2, 3.34, 6.75], // 10
  ["Tourmaline", 150, 0.3, 3.06, 7.25], // 11
  ["Spinel", 500, 0.4, 3.6, 8], // 12
  ["Alexandrite", 3000, 0.6, 3.73, 8.5], // 13
  ["Opal", 100, 0.1, 2.15, 6], // 14
  ["Pink sapphire", 700, 0.45, 4.0, 9], // 15
];
const QUALITY = [0.35, 1, 2.5, 6]; // commercial, good, fine, top/gem

function gemPpc(gem: number, ct: number, quality: number) {
  const [, base, k] = GEMS[gem];
  return base * Math.pow(Math.max(0.1, ct), k) * QUALITY[idx(quality, 3)];
}

function priceResult(ct: number, ppc: number) {
  const price = ct * ppc;
  return {
    estimatedPrice: round2(price),
    pricePerCarat: round2(ppc),
    lowEstimate: round2(price * 0.6),
    highEstimate: round2(price * 1.6),
  };
}

/** Shape factors for L × W × D × factor × SG = carats. */
const SHAPE_FACTOR = [0.0018, 0.002, 0.0025, 0.0022, 0.00175, 0.0016, 0.0023];

export const gemstoneMmToCarat: CustomCalculator = (v) => {
  const gem = idx(v.gem, GEMS.length);
  const sg = gem === GEMS.length ? 3.52 : GEMS[gem][3];
  const shape = idx(v.shape, 6);
  const l = nonNeg(v.lengthMm);
  const w = shape === 0 ? l : nonNeg(v.widthMm);
  const d = nonNeg(v.depthMm);
  const ct = l * w * d * SHAPE_FACTOR[shape] * sg;
  return {
    carats: round2(ct),
    grams: round2(ct * 0.2 * 1000) / 1000,
    specificGravity: sg,
    diamondEquivalentCarats: round2(ct * (3.52 / sg)),
  };
};

export const gemstonePrice: CustomCalculator = (v) => {
  const gem = idx(v.gem, GEMS.length - 1);
  const ct = nonNeg(v.carat);
  const ppc = gemPpc(gem, ct, v.quality) * (1 + (safeNumber(v.untreated) === 1 ? 0.5 : 0));
  return { ...priceResult(ct, ppc), hardness: GEMS[gem][4] };
};

export const rubyPrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const color = [2, 1.3, 1, 0.6][idx(v.color, 3)];
  const treat = [2, 1, 0.08][idx(v.treatment, 2)];
  const origin = [2, 1.2, 1, 0.8][idx(v.origin, 3)];
  return priceResult(ct, gemPpc(0, ct, v.quality) * color * treat * origin);
};

export const sapphirePrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const color = [1, 3, 0.75, 0.4, 0.25][idx(v.color, 4)];
  const heat = safeNumber(v.unheated) === 1 ? 1.6 : 1;
  const origin = [3, 1.3, 1, 0.6][idx(v.origin, 3)];
  return priceResult(ct, gemPpc(1, ct, v.quality) * color * heat * origin);
};

export const emeraldPrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const enh = [1.8, 1.2, 1, 0.6, 0.35][idx(v.enhancement, 4)];
  const origin = [1.4, 1, 0.8, 1.1][idx(v.origin, 3)];
  return priceResult(ct, gemPpc(2, ct, v.quality) * enh * origin);
};

/** $ per carat at 1 ct good quality by topaz type. */
const TOPAZ = [30, 25, 15, 10, 20, 400];

export const topazPrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const type = idx(v.type, 5);
  const k = type === 5 ? 0.5 : 0.1;
  const ppc = TOPAZ[type] * Math.pow(Math.max(0.1, ct), k) * QUALITY[idx(v.quality, 3)];
  return priceResult(ct, ppc);
};

const OPAL_BASE = [800, 300, 250, 60, 40, 50]; // black, boulder, crystal, Ethiopian, white, fire
const OPAL_BRIGHT = [4, 2.5, 1.5, 0.8, 0.3]; // brightness B1 (brilliant) … B5 (dull)

export const opalValue: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const ppc = OPAL_BASE[idx(v.type, 5)] * OPAL_BRIGHT[idx(v.brightness, 4)] * (safeNumber(v.pattern) === 1 ? 1.5 : 1);
  return priceResult(ct, ppc);
};

/** [reference size mm, $ per pearl at that size (AA+), growth per mm] */
const PEARLS: [number, number, number][] = [
  [7, 5, 1.25], // freshwater
  [7, 40, 1.35], // Akoya
  [9, 90, 1.3], // Tahitian
  [10, 200, 1.3], // South Sea
];
const PEARL_GRADE = [0.5, 1, 1.8]; // A, AA+, AAA

export const pearlValue: CustomCalculator = (v) => {
  const [ref, price, growth] = PEARLS[idx(v.type, 3)];
  const size = nonNeg(v.sizeMm);
  const each = price * Math.pow(growth, size - ref) * PEARL_GRADE[idx(v.grade, 2)];
  const count = safeNumber(v.form) === 1 ? Math.round((nonNeg(v.lengthIn) * 25.4) / Math.max(1, size)) : Math.max(1, Math.round(nonNeg(v.count) || 1));
  const total = each * count + (safeNumber(v.form) === 1 ? nonNeg(v.claspCost) : 0);
  return {
    estimatedValue: round2(total),
    pricePerPearl: round2(each),
    pearlCount: count,
    lowEstimate: round2(total * 0.6),
    highEstimate: round2(total * 1.6),
  };
};

/** Month → gem index in GEMS (diamond handled separately as -1). */
const MONTH_GEM = [9, 7, 4, -1, 2, 13, 0, 10, 1, 14, 6, 3];

export const birthstone: CustomCalculator = (v) => {
  const m = idx(v.month, 11);
  const ct = nonNeg(v.carat);
  const g = MONTH_GEM[m];
  // April (diamond): natural G VS2-type pricing scaled by the same quality tiers.
  const ppc =
    g < 0
      ? (ct >= 1 ? 5000 * Math.pow(ct, 0.75) : Math.max(1500, 5000 * ct)) * QUALITY[idx(v.quality, 3)]
      : gemPpc(g, ct, v.quality);
  return { ...priceResult(ct, ppc), hardness: g < 0 ? 10 : GEMS[g][4] };
};

export const shoppingGoldGemsCustomCalculators: Record<string, CustomCalculator> = {
  "gemstone-mm-to-carat-calculator": gemstoneMmToCarat,
  "gemstone-price-calculator": gemstonePrice,
  "ruby-price-calculator": rubyPrice,
  "sapphire-price-calculator": sapphirePrice,
  "emerald-price-calculator": emeraldPrice,
  "topaz-price-calculator": topazPrice,
  "opal-value-calculator": opalValue,
  "pearl-value-calculator": pearlValue,
  "birthstone-calculator": birthstone,
};
