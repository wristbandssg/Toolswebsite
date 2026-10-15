/**
 * Batch: "Shopping Calculators" → Clothing, Shoe & Ring Size — bras,
 * shapewear and body measurements (11 tools). Sizes that are letters are
 * returned as numbered codes explained in each result label, the same
 * convention as the site's existing size tools.
 *
 *  - braSize (also bust size, strapless): modern band (underbust rounded to
 *    an even number) and cup from bust − band, with US/UK/EU bands.
 *  - sportsBraSize: XS–XXL from bra band and cup volume.
 *  - maternityBraSize (also nursing): today's size and the size to buy for
 *    the stage of pregnancy or nursing.
 *  - sisterSizeBra: the two sister sizes with the same cup volume.
 *  - braletteSize: XS–XL from underbust and bust.
 *  - corsetSize: natural waist minus a chosen reduction, to an even size.
 *  - shapewearSize: waist and hip against a shapewear chart, sizing up when
 *    between sizes.
 *  - pantySize: numeric US panty size (4–10) from hips and waist.
 *  - chestSize: men's jacket size, shirt letter size and EU size from chest.
 *  - hipSize: women's dress size by hip, plus waist-to-hip ratio.
 *  - bodyMeasurement: body shape from bust/waist/hip and the dress size
 *    that fits the largest measurement.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-size-body-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
/** Unit dropdown: 0 = inches, 1 = centimetres → inches. */
const inches = (x: number, unit: number) => (safeNumber(unit) === 1 ? nonNeg(x) / 2.54 : nonNeg(x));

function band(underbust: number) {
  const r = Math.round(underbust);
  return r % 2 === 0 ? r : r + 1;
}
/** Cup code: 1 A, 2 B, 3 C, 4 D, 5 DD, 6 DDD/F, 7 G, 8 H, 9 I… (0 = AA). */
const cup = (bust: number, b: number) => Math.max(0, Math.min(12, Math.round(bust - b)));
const euBand = (b: number) => 70 + (b - 32) * 2.5;

export const braSize: CustomCalculator = (v) => {
  const under = inches(v.underbust, v.unit);
  const bust = inches(v.bust, v.unit);
  const b = band(under);
  const c = cup(bust, b);
  return {
    bandSize: b,
    cupCode: c,
    euBand: euBand(b),
    sisterUpBand: b + 2,
    sisterDownBand: b - 2,
    bustMinusBand: round2(bust - b),
  };
};

export const sportsBraSize: CustomCalculator = (v) => {
  const under = inches(v.underbust, v.unit);
  const bust = inches(v.bust, v.unit);
  const b = band(under);
  const c = cup(bust, b);
  // Volume index: band plus two inches per cup step past B.
  const vol = b + (c - 2);
  const code = vol <= 31 ? 1 : vol <= 33 ? 2 : vol <= 35 ? 3 : vol <= 37 ? 4 : vol <= 40 ? 5 : 6;
  return { sizeCode: code, bandSize: b, cupCode: c, highImpactSizeUp: c >= 5 ? 1 : 0 };
};

export const maternityBraSize: CustomCalculator = (v) => {
  const under = inches(v.underbust, v.unit);
  const bust = inches(v.bust, v.unit);
  const b = band(under);
  const c = cup(bust, b);
  const stage = Math.min(3, Math.max(0, Math.round(safeNumber(v.stage))));
  const bandGrowth = [0, 0, 1, 0][stage]; // ribcage expands most late in pregnancy
  const cupGrowth = [0, 1, 1, 1][stage];
  const buyBand = band(under + bandGrowth);
  return {
    buyBandSize: buyBand,
    buyCupCode: Math.min(12, cup(bust, buyBand) + cupGrowth),
    currentBandSize: b,
    currentCupCode: c,
    useExtender: stage === 1 ? 1 : 0,
  };
};

export const sisterSizeBra: CustomCalculator = (v) => {
  const b = Math.round(nonNeg(v.bandSize));
  const c = Math.round(nonNeg(v.cupCode));
  return {
    sisterUpBand: b + 2,
    sisterUpCup: Math.max(0, c - 1),
    sisterDownBand: b - 2,
    sisterDownCup: Math.min(12, c + 1),
    cupVolumeIndex: b + c * 2,
  };
};

export const braletteSize: CustomCalculator = (v) => {
  const under = inches(v.underbust, v.unit);
  const bust = inches(v.bust, v.unit);
  const code = bust <= 33 ? 1 : bust <= 35 ? 2 : bust <= 37.5 ? 3 : bust <= 40 ? 4 : bust <= 43 ? 5 : 6;
  const b = band(under);
  return { sizeCode: code, bandSize: b, cupCode: cup(bust, b), underbustInches: round2(under) };
};

export const corsetSize: CustomCalculator = (v) => {
  const waist = inches(v.waist, v.unit);
  const reduction = Math.min(8, nonNeg(v.reduction));
  let size = Math.floor(waist - reduction);
  if (size % 2 !== 0) size -= 1;
  size = Math.max(16, size);
  return {
    corsetSize: size,
    actualReduction: round2(waist - size),
    naturalWaist: round2(waist),
    laceGapInches: round2(Math.max(0, waist - size - reduction)),
  };
};

/** Shapewear chart upper limits: waist / hip (in) for XS, S, M, L, XL, 2X, 3X. */
const SW_WAIST = [26, 28, 31, 34, 37, 41, 45];
const SW_HIP = [36, 38, 41, 44, 47, 51, 55];
const fit = (x: number, limits: number[]) => {
  const i = limits.findIndex((l) => x <= l);
  return (i < 0 ? limits.length - 1 : i) + 1;
};

export const shapewearSize: CustomCalculator = (v) => {
  const w = fit(inches(v.waist, v.unit), SW_WAIST);
  const h = fit(inches(v.hip, v.unit), SW_HIP);
  const firm = safeNumber(v.compression) === 2;
  const code = Math.min(7, Math.max(w, h));
  return { sizeCode: code, waistSizeCode: w, hipSizeCode: h, betweenSizes: w !== h ? 1 : 0, firmControlTip: firm && w !== h ? 1 : 0 };
};

const PANTY_HIP = [35, 37, 39, 42, 45, 48, 51];

export const pantySize: CustomCalculator = (v) => {
  const hip = inches(v.hip, v.unit);
  const code = fit(hip, PANTY_HIP);
  return { usPantySize: code + 3, letterCode: code, hipInches: round2(hip) };
};

const SHIRT_CHEST = [36, 40, 44, 48, 52, 56, 60];

export const chestSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  let jacket = Math.round(chest);
  if (jacket % 2 !== 0) jacket += 1;
  return {
    jacketSize: jacket,
    shirtCode: fit(chest, SHIRT_CHEST),
    euJacketSize: jacket + 10,
    chestCm: round2(chest * 2.54),
  };
};

/** US misses dress sizes 0–24 with bust / waist / hip limits in inches. */
const DRESS_SIZES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const DRESS_BUST = [32, 33, 34, 35, 36, 37, 38.5, 40, 41.5, 43.5, 45.5, 47.5, 49.5];
const DRESS_WAIST = [24, 25, 26, 27, 28, 29, 30.5, 32, 33.5, 35.5, 37.5, 39.5, 41.5];
const DRESS_HIP = [34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 41, 42.5, 44, 46, 48, 50, 52];
const dressIndex = (x: number, limits: number[]) => {
  const i = limits.findIndex((l) => x <= l);
  return i < 0 ? limits.length - 1 : i;
};

export const hipSize: CustomCalculator = (v) => {
  const hip = inches(v.hip, v.unit);
  const waist = inches(v.waist, v.unit);
  const us = DRESS_SIZES[dressIndex(hip, DRESS_HIP)];
  return {
    usSizeByHip: us,
    ukSize: us + 4,
    euSize: us + 30,
    waistToHipRatio: hip > 0 ? round2(waist / hip) : 0,
    hipCm: round2(hip * 2.54),
  };
};

export const bodyMeasurement: CustomCalculator = (v) => {
  const bust = inches(v.bust, v.unit);
  const waist = inches(v.waist, v.unit);
  const hip = inches(v.hip, v.unit);
  let shape = 4; // rectangle
  if (bust - hip >= 3.6) shape = 5; // inverted triangle
  else if (hip - bust >= 3.6 && hip - waist >= 9) shape = 2; // pear
  else if (Math.abs(bust - hip) < 3.6 && (bust - waist >= 9 || hip - waist >= 10)) shape = 1; // hourglass
  else if (hip > 0 && waist / hip >= 0.85 && waist >= bust - 2) shape = 3; // apple
  const i = Math.max(dressIndex(bust, DRESS_BUST), dressIndex(waist, DRESS_WAIST), dressIndex(hip, DRESS_HIP));
  return {
    bodyShapeCode: shape,
    usDressSize: DRESS_SIZES[i],
    waistToHipRatio: hip > 0 ? round2(waist / hip) : 0,
    bustToWaistDifference: round2(bust - waist),
    hipToWaistDifference: round2(hip - waist),
  };
};

export const shoppingSizeBodyCustomCalculators: Record<string, CustomCalculator> = {
  "bra-size-calculator": braSize,
  "sports-bra-size-calculator": sportsBraSize,
  "maternity-bra-size-calculator": maternityBraSize,
  "sister-size-bra-calculator": sisterSizeBra,
  "bralette-size-calculator": braletteSize,
  "corset-size-calculator": corsetSize,
  "shapewear-size-calculator": shapewearSize,
  "panty-size-calculator": pantySize,
  "chest-size-calculator": chestSize,
  "hip-size-calculator": hipSize,
  "body-measurement-calculator": bodyMeasurement,
};
