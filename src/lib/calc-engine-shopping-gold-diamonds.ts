/**
 * Batch: "Shopping Calculators" → Gold, Silver & Jewelry — diamonds, rings
 * and coins (9 tools).
 *
 * Diamond prices use one shared retail model for natural round diamonds:
 * a price per carat interpolated by weight (rising steeply with size),
 * times colour, clarity, cut and shape factors relative to a G VS2
 * excellent-cut round. Lab-grown prices use a much flatter curve. Each tool
 * answers a different question:
 *  - diamondPricePerCarat: price per carat and total for any 4Cs.
 *  - oneCaratDiamondPrice: a 1 ct stone natural vs lab, with the setting.
 *  - diamondRingValue: resale vs insurance replacement of a diamond ring,
 *    including the setting's gold.
 *  - labDiamondPrice: lab-grown price and the saving vs natural.
 *  - moissanitePrice: moissanite by diamond-equivalent size and brand tier.
 *  - diamondMmToCarat (also carat size): round diameter ↔ carat weight.
 *  - engagementRingBudget: a budget from income or savings, split stone vs
 *    setting, and the carat it buys natural or lab-grown.
 *  - classRingValue: gold or silver class rings at melt (alloys are base).
 *  - coinValue: metal value of everyday and silver/gold coins by
 *    composition, vs face value.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-gold-diamonds-calculators.ts for the copy.
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

/** Interpolate y at x through points (xs ascending), flat beyond the ends. */
function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
  }
  return ys[ys.length - 1];
}

const NAT_CT = [0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5];
const NAT_PPC = [1500, 2500, 3300, 5000, 7500, 10500, 16000, 26000];
const LAB_CT = [0.5, 1, 1.5, 2, 3, 5, 7];
const LAB_PPC = [900, 800, 750, 700, 750, 900, 1100];
/** Colour D..K, clarity FL/IF..I1, cut Excellent..Fair, shape round/fancy. */
const COLOR = [1.45, 1.3, 1.15, 1, 0.9, 0.78, 0.68, 0.58];
const CLARITY = [1.6, 1.35, 1.25, 1.1, 1, 0.85, 0.72, 0.5];
const CUT = [1, 0.9, 0.8, 0.65];
const SHAPE = [1, 0.75];

function factors(v: Record<string, number>, damp = 1) {
  const f = COLOR[idx(v.color, 7)] * CLARITY[idx(v.clarity, 7)] * CUT[idx(v.cut, 3)] * SHAPE[idx(v.shape, 1)];
  return 1 + (f - 1) * damp; // lab-grown prices vary less with the 4Cs
}

function naturalPrice(ct: number, v: Record<string, number>) {
  return ct * interp(NAT_CT, NAT_PPC, ct) * factors(v);
}

function labPrice(ct: number, v: Record<string, number>) {
  return ct * interp(LAB_CT, LAB_PPC, ct) * factors(v, 0.4);
}

export const diamondPricePerCarat: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const price = naturalPrice(ct, v);
  return {
    estimatedPrice: round2(price),
    pricePerCarat: ct > 0 ? round2(price / ct) : 0,
    lowEstimate: round2(price * 0.8),
    highEstimate: round2(price * 1.25),
    labGrownEquivalent: round2(labPrice(ct, v)),
  };
};

export const oneCaratDiamondPrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat, 1) || 1;
  const nat = naturalPrice(ct, v);
  const lab = labPrice(ct, v);
  const setting = nonNeg(v.settingCost);
  return {
    naturalPrice: round2(nat),
    labGrownPrice: round2(lab),
    savingsWithLab: round2(nat - lab),
    naturalRingTotal: round2(nat + setting),
    labRingTotal: round2(lab + setting),
  };
};

const G_OZT = 31.1034768;
const KARAT_PURITY = [0.4167, 0.585, 0.75, 0.95];

export const diamondRingValue: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const lab = safeNumber(v.origin) === 1;
  const retail = lab ? labPrice(ct, v) : naturalPrice(ct, v);
  const resalePct = pct(v.resalePercent) || (lab ? 0.08 : 0.35);
  const metalSpot = idx(v.metal, 3) === 3 ? nonNeg(v.platinumSpot) : nonNeg(v.goldSpot);
  const metal = nonNeg(v.metalWeight) * KARAT_PURITY[idx(v.metal, 3)] * (metalSpot / G_OZT);
  const replacement = retail + nonNeg(v.settingRetail);
  return {
    resaleValue: round2(retail * resalePct + metal * 0.85),
    replacementValue: round2(replacement),
    diamondRetailEstimate: round2(retail),
    settingMetalValue: round2(metal),
    resaleAsPercentOfReplacement: replacement > 0 ? round2(((retail * resalePct + metal * 0.85) / replacement) * 100) : 0,
  };
};

export const labDiamondPrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const lab = labPrice(ct, v);
  const nat = naturalPrice(ct, v);
  return {
    labGrownPrice: round2(lab),
    pricePerCarat: ct > 0 ? round2(lab / ct) : 0,
    naturalEquivalent: round2(nat),
    savingsPercent: nat > 0 ? round2(((nat - lab) / nat) * 100) : 0,
    resaleEstimate: round2(lab * 0.08),
  };
};

/** $ per diamond-equivalent carat by tier: value, mid-range, premium brand. */
const MOISSANITE_PPC = [150, 300, 600];

export const moissanitePrice: CustomCalculator = (v) => {
  const ct = nonNeg(v.carat);
  const stone = ct * MOISSANITE_PPC[idx(v.tier, 2)] * (ct > 2 ? 1 + (ct - 2) * 0.1 : 1);
  const setting = nonNeg(v.settingCost);
  const diamondLike = { color: 3, clarity: 4, cut: 0, shape: idx(v.shape, 1) };
  return {
    moissanitePrice: round2(stone),
    ringTotal: round2(stone + setting),
    labDiamondPrice: round2(labPrice(ct, diamondLike)),
    naturalDiamondPrice: round2(naturalPrice(ct, diamondLike)),
    diameterMm: round2(Math.cbrt(ct / 0.0037)),
  };
};

export const diamondMmToCarat: CustomCalculator = (v) => {
  const toCarat = safeNumber(v.mode) === 0;
  const depthAdj = nonNeg(v.depthPercent, 61) / 61;
  if (toCarat) {
    const d = nonNeg(v.diameterMm);
    const ct = 0.0037 * d ** 3 * depthAdj;
    return { carat: round2(ct), diameterMm: round2(d), points: Math.round(ct * 100), faceUpArea: round2(Math.PI * (d / 2) ** 2) };
  }
  const ct = nonNeg(v.carat);
  const d = depthAdj > 0 ? Math.cbrt(ct / (0.0037 * depthAdj)) : 0;
  return { carat: round2(ct), diameterMm: round2(d), points: Math.round(ct * 100), faceUpArea: round2(Math.PI * (d / 2) ** 2) };
};

export const engagementRingBudget: CustomCalculator = (v) => {
  const byIncome = (nonNeg(v.annualIncome) / 12) * nonNeg(v.monthsOfIncome);
  const cap = nonNeg(v.savingsAvailable) + nonNeg(v.monthlySaving) * nonNeg(v.monthsToSave);
  const budget = nonNeg(v.annualIncome) > 0 ? Math.min(byIncome, cap > 0 ? cap : byIncome) : cap;
  const stone = budget * pct(v.stoneShare);
  const base = { color: 3, clarity: 4, cut: 0, shape: 0 };
  // Largest carat each budget buys (G VS2 excellent round), by bisection.
  const caratFor = (fn: (ct: number, v: Record<string, number>) => number) => {
    let lo = 0;
    let hi = 10;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (fn(mid, base) <= stone) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  return {
    ringBudget: round2(budget),
    stoneBudget: round2(stone),
    settingBudget: round2(budget - stone),
    naturalCaratAffordable: round2(caratFor(naturalPrice)),
    labCaratAffordable: round2(caratFor(labPrice)),
  };
};

export const classRingValue: CustomCalculator = (v) => {
  const metal = idx(v.metal, 4);
  const grams = nonNeg(v.weight) - nonNeg(v.stoneCarats) * 0.2;
  const purity = [0.4167, 0.585, 0.75, 0.925, 0][metal];
  const spot = metal === 3 ? nonNeg(v.silverSpot) : nonNeg(v.goldSpot);
  const melt = Math.max(0, grams) * purity * (spot / G_OZT);
  return {
    meltValue: round2(melt),
    buyerOffer: round2(melt * pct(v.payoutPercent)),
    metalWeight: round2(Math.max(0, grams)),
    preciousMetalGrams: round2(Math.max(0, grams) * purity * 100) / 100,
  };
};

/**
 * Coin compositions: [grams, copper share, nickel share, silver troy oz, gold troy oz, face $].
 * Dropdown value = index.
 */
const COINS: [number, number, number, number, number, number][] = [
  [3.11, 0.95, 0, 0, 0, 0.01], // copper cent pre-1982
  [2.5, 0.025, 0, 0, 0, 0.01], // zinc cent 1982+
  [5, 0.75, 0.25, 0, 0, 0.05], // nickel
  [2.268, 0.9167, 0.0833, 0, 0, 0.1], // clad dime
  [5.67, 0.9167, 0.0833, 0, 0, 0.25], // clad quarter
  [2.5, 0, 0, 0.07234, 0, 0.1], // 90% silver dime
  [6.25, 0, 0, 0.18084, 0, 0.25], // 90% silver quarter
  [12.5, 0, 0, 0.36169, 0, 0.5], // 90% silver half
  [26.73, 0, 0, 0.7734, 0, 1], // Morgan / Peace dollar
  [33.436, 0, 0, 0, 0.9675, 20], // $20 gold double eagle
];

export const coinValue: CustomCalculator = (v) => {
  const [g, cu, ni, ag, au, face] = COINS[idx(v.coin, COINS.length - 1)];
  const lbs = g / 453.59237;
  const each =
    lbs * cu * nonNeg(v.copperPerLb) + lbs * ni * nonNeg(v.nickelPerLb) + ag * nonNeg(v.silverSpot) + au * nonNeg(v.goldSpot);
  const qty = nonNeg(v.quantity);
  const withPremium = each * (1 + pct(v.collectorPremium));
  return {
    totalValue: round2(withPremium * qty),
    meltValuePerCoin: round2(each * 1000) / 1000,
    totalMeltValue: round2(each * qty),
    faceValue: round2(face * qty),
    meltVsFace: face > 0 ? round2(each / face) : 0,
  };
};

export const shoppingGoldDiamondsCustomCalculators: Record<string, CustomCalculator> = {
  "diamond-price-per-carat-calculator": diamondPricePerCarat,
  "1-carat-diamond-price-calculator": oneCaratDiamondPrice,
  "diamond-ring-value-calculator": diamondRingValue,
  "lab-diamond-price-calculator": labDiamondPrice,
  "moissanite-price-calculator": moissanitePrice,
  "diamond-mm-to-carat-calculator": diamondMmToCarat,
  "engagement-ring-budget-calculator": engagementRingBudget,
  "class-ring-value-calculator": classRingValue,
  "coin-value-calculator": coinValue,
};
