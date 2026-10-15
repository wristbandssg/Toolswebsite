/**
 * Batch: "Shopping Calculators" → Clothing, Shoe & Ring Size — women's and
 * kids' clothing (8 tools).
 *
 *  - dressSize (also prom dresses): US size from bust/waist/hip with UK, EU,
 *    IT and AU conversions.
 *  - weddingDressSize: bridal sizes run about two sizes smaller than street
 *    sizes — order for the largest measurement and see what to alter.
 *  - dressLength: dress length from the shoulder for mini to floor length
 *    from height, adding heel height for floor-length gowns.
 *  - skirtSize: skirt size from waist and hips and skirt length by style.
 *  - clothingSize: converts a US women's dress size or men's jacket size to
 *    UK, EU, IT, AU, JP and letter sizes.
 *  - kidsClothingSize: baby (months), toddler (T) and kids' sizes by height.
 *  - bestJeansForBodyType: jean fit, rise and length from measurements.
 *  - jeanSize: men's W×L and women's numeric jean sizes.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-size-dress-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const inches = (x: number, unit: number) => (safeNumber(unit) === 1 ? nonNeg(x) / 2.54 : nonNeg(x));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

const SIZES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const BUST = [32, 33, 34, 35, 36, 37, 38.5, 40, 41.5, 43.5, 45.5, 47.5, 49.5];
const WAIST = [24, 25, 26, 27, 28, 29, 30.5, 32, 33.5, 35.5, 37.5, 39.5, 41.5];
const HIP = [34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 41, 42.5, 44, 46, 48, 50, 52];
const at = (x: number, limits: number[]) => {
  const i = limits.findIndex((l) => x <= l);
  return i < 0 ? limits.length - 1 : i;
};

export const dressSize: CustomCalculator = (v) => {
  const b = inches(v.bust, v.unit);
  const w = inches(v.waist, v.unit);
  const h = inches(v.hip, v.unit);
  const i = Math.max(at(b, BUST), at(w, WAIST), at(h, HIP));
  const us = SIZES[i];
  return { usSize: us, ukSize: us + 4, euSize: us + 30, itSize: us + 36, auSize: us + 4, letterCode: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7][i] };
};

export const weddingDressSize: CustomCalculator = (v) => {
  const b = inches(v.bust, v.unit);
  const w = inches(v.waist, v.unit);
  const h = inches(v.hip, v.unit);
  const ib = at(b, BUST);
  const iw = at(w, WAIST);
  const ih = at(h, HIP);
  const i = Math.max(ib, iw, ih);
  return {
    bridalSize: SIZES[Math.min(12, i)] + 2,
    streetSize: SIZES[i],
    takeInBust: round2(Math.max(0, BUST[i] - b)),
    takeInWaist: round2(Math.max(0, WAIST[i] - w)),
    takeInHip: round2(Math.max(0, HIP[i] - h)),
  };
};

/** Shoulder-to-hem length as a share of height: mini, above knee, knee, midi, tea, ankle, floor. */
const DRESS_RATIO = [0.45, 0.5, 0.54, 0.62, 0.68, 0.76, 0.81];

export const dressLength: CustomCalculator = (v) => {
  const height = inches(v.height, v.unit);
  const style = idx(v.style, 6);
  const heel = style >= 5 ? inches(v.heelHeight, v.unit) : 0;
  const len = height * DRESS_RATIO[style] + heel;
  return {
    lengthFromShoulder: round2(len),
    lengthFromWaist: round2(Math.max(0, len - height * 0.24)),
    lengthCm: round2(len * 2.54),
    heelAdded: round2(heel),
  };
};

/** Waist-to-hem as a share of height: mini, knee, midi, maxi. */
const SKIRT_RATIO = [0.24, 0.33, 0.42, 0.58];

export const skirtSize: CustomCalculator = (v) => {
  const w = inches(v.waist, v.unit);
  const h = inches(v.hip, v.unit);
  const i = Math.max(at(w, WAIST), at(h, HIP));
  const height = inches(v.height, v.unit);
  const len = height * SKIRT_RATIO[idx(v.style, 3)];
  return {
    usSkirtSize: SIZES[i],
    ukSize: SIZES[i] + 4,
    euSize: SIZES[i] + 30,
    skirtLength: round2(len),
    skirtLengthCm: round2(len * 2.54),
  };
};

export const clothingSize: CustomCalculator = (v) => {
  const size = nonNeg(v.size);
  const mens = safeNumber(v.type) === 1;
  if (mens) {
    const letter = size <= 36 ? 1 : size <= 40 ? 2 : size <= 44 ? 3 : size <= 48 ? 4 : size <= 52 ? 5 : 6;
    return { ukSize: size, euSize: size + 10, itSize: size + 10, auSize: size + 10, jpSize: Math.round((size + 10) / 2 - 20), letterCode: letter };
  }
  const letter = size <= 2 ? 1 : size <= 6 ? 2 : size <= 10 ? 3 : size <= 14 ? 4 : size <= 18 ? 5 : size <= 22 ? 6 : 7;
  return { ukSize: size + 4, euSize: size + 30, itSize: size + 36, auSize: size + 4, jpSize: size + 3, letterCode: letter };
};

/** Height upper limits (in) and sizes; series: 1 baby months, 2 toddler T, 3 kids. */
const KIDS: [number, number, number][] = [
  [24, 3, 1], [26, 6, 1], [28, 9, 1], [30, 12, 1], [32, 18, 1], [34, 24, 1],
  [35, 2, 2], [38, 3, 2], [41, 4, 2],
  [44, 5, 3], [47, 6, 3], [50, 7, 3], [52, 8, 3], [55, 10, 3], [58, 12, 3], [61, 14, 3], [64, 16, 3],
];

export const kidsClothingSize: CustomCalculator = (v) => {
  const h = inches(v.height, v.unit);
  const i = KIDS.findIndex(([lim]) => h <= lim);
  const [, size, series] = KIDS[i < 0 ? KIDS.length - 1 : i];
  const next = KIDS[Math.min(KIDS.length - 1, (i < 0 ? KIDS.length - 1 : i) + 1)];
  return { size, sizeSeries: series, nextSize: next[1], nextSizeSeries: next[2], heightCm: round2(h * 2.54) };
};

export const bestJeansForBodyType: CustomCalculator = (v) => {
  const w = inches(v.waist, v.unit);
  const h = inches(v.hip, v.unit);
  const height = inches(v.height, v.unit);
  const thighs = idx(v.thighs, 2); // 0 slim, 1 average, 2 full
  const diff = h - w;
  let fit = 1; // straight
  if (diff >= 11) fit = 6; // curvy fit
  else if (diff >= 9) fit = thighs === 2 ? 4 : 2; // wide-leg or bootcut for pear shapes
  else if (diff < 7 && thighs === 0) fit = 3; // skinny / slim for straight figures
  else if (diff < 7) fit = 5; // mom / relaxed high-rise to add shape
  const rise = h > 0 && w / h >= 0.82 ? 3 : diff >= 9 ? 3 : 2; // 2 mid, 3 high
  const length = height < 63 ? 1 : height > 68 ? 3 : 2;
  return { fitCode: fit, riseCode: rise, lengthCode: length, hipToWaist: round2(diff), suggestedInseam: round2(height * 0.45) };
};

const WOMENS_JEAN_WAIST = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38];
const WOMENS_JEAN_SIZE = [0, 0, 2, 4, 6, 8, 10, 12, 12, 14, 16, 18, 20];

export const jeanSize: CustomCalculator = (v) => {
  const w = inches(v.waist, v.unit);
  const inseam = inches(v.inseam, v.unit);
  const womens = safeNumber(v.gender) === 1;
  const W = Math.ceil(w);
  const L = Math.round(inseam / 2) * 2;
  const i = WOMENS_JEAN_WAIST.findIndex((x) => w <= x);
  return {
    // Men's jeans come in every inch to 34, then even sizes.
    waistSize: womens || W <= 34 || W % 2 === 0 ? W : W + 1,
    inseamLength: L,
    womensNumericSize: WOMENS_JEAN_SIZE[i < 0 ? WOMENS_JEAN_SIZE.length - 1 : i],
    waistCm: round2(w * 2.54),
  };
};

export const shoppingSizeDressCustomCalculators: Record<string, CustomCalculator> = {
  "dress-size-calculator": dressSize,
  "wedding-dress-size-calculator": weddingDressSize,
  "dress-length-calculator": dressLength,
  "skirt-size-calculator": skirtSize,
  "clothing-size-calculator": clothingSize,
  "kids-clothing-size-calculator": kidsClothingSize,
  "best-jeans-for-body-type-calculator": bestJeansForBodyType,
  "jean-size-calculator": jeanSize,
};
