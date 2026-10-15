/**
 * Batch: "Shopping Calculators" → Clothing, Shoe & Ring Size — accessories,
 * jewelry sizes, workwear and diapers (11 tools).
 *
 *  - hatSize: fitted hat size = head circumference ÷ π, to the 1/8.
 *  - gloveSize: glove size = hand circumference in inches, with S–XL.
 *  - tieLength: tie length from height, neck and knot, and a tie width.
 *  - coverallSize: chest size with regular or tall length.
 *  - glassesFrameSize: lens width, bridge and temple length from face width.
 *  - diaperSize: diaper size from weight, and diapers per day and month.
 *  - ringSize (also ring size conversion): US, UK, EU/ISO and Japanese
 *    sizes from finger circumference or ring inner diameter.
 *  - chainLength: necklace length by style from neck size.
 *  - braceletSize: bracelet length from wrist and fit.
 *  - bangleSize: bangle inner diameter and Indian bangle size from hand size.
 *  - watchSize: watch case diameter and lug-to-lug that suit a wrist.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-size-accessories-calculators.ts for the copy.
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
const find = (x: number, limits: number[]) => {
  const i = limits.findIndex((l) => x <= l);
  return (i < 0 ? limits.length - 1 : i) + 1;
};

export const hatSize: CustomCalculator = (v) => {
  const c = inches(v.head, v.unit);
  const fitted = Math.round((c / Math.PI) * 8) / 8;
  return {
    fittedHatSize: fitted,
    letterCode: find(c, [21.5, 22.25, 23, 23.75, 24.5]),
    ukSize: Math.max(0, fitted - 0.125),
    euSizeCm: Math.round(c * 2.54),
    headInches: round2(c),
  };
};

export const gloveSize: CustomCalculator = (v) => {
  const c = inches(v.hand, v.unit);
  const womens = safeNumber(v.gender) === 1;
  const size = Math.round(c * 2) / 2;
  const code = womens ? find(c, [6.25, 7, 7.75, 8.25, 9]) : find(c, [7.25, 8.25, 9.25, 10.25, 11.25]);
  return { gloveSize: size, letterCode: code, handCm: round2(c * 2.54) };
};

export const tieLength: CustomCalculator = (v) => {
  const h = inches(v.height, v.unit);
  const neck = inches(v.neck, v.unit);
  const knot = [0, 2, 4][idx(v.knot, 2)];
  const needed = 0.8 * h + knot + Math.max(0, neck - 16) * 2;
  const type = needed < 54 ? 3 : needed <= 59.5 ? 1 : 2;
  const chest = inches(v.chest, v.unit);
  return {
    tieLength: round2(needed),
    tieTypeCode: type,
    tieWidth: chest < 38 ? 2.5 : chest <= 44 ? 3 : 3.25,
    tieLengthCm: Math.round(needed * 2.54),
  };
};

export const coverallSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  const h = inches(v.height, v.unit);
  let size = Math.ceil(chest);
  if (size % 2 !== 0) size += 1;
  return {
    coverallChestSize: size,
    lengthCode: h > 72 ? 2 : h < 66 ? 3 : 1,
    letterCode: find(chest, [38, 42, 46, 50, 54, 58, 62]),
    heightInches: round2(h),
  };
};

export const glassesFrameSize: CustomCalculator = (v) => {
  const face = nonNeg(v.faceWidthMm);
  const bridge = [16, 18, 20][idx(v.bridge, 2)];
  // Frame front ≈ face width; each end piece/hinge takes about 5 mm.
  const lens = Math.round((face - bridge - 10) / 2);
  const temple = face < 128 ? 135 : face < 138 ? 140 : face < 146 ? 145 : 150;
  return {
    lensWidthMm: lens,
    bridgeMm: bridge,
    templeLengthMm: temple,
    frameSizeCode: face < 130 ? 1 : face <= 140 ? 2 : 3,
    totalFrameWidthMm: Math.round(face),
  };
};

/** Diaper size upper weight (lb): newborn, 1, 2, 3, 4, 5, 6, 7. */
const DIAPER_LB = [10, 14, 18, 28, 37, 42, 50, 70];

export const diaperSize: CustomCalculator = (v) => {
  const lb = safeNumber(v.weightUnit) === 1 ? nonNeg(v.weight) * 2.20462 : nonNeg(v.weight);
  const i = DIAPER_LB.findIndex((l) => lb <= l);
  const size = i < 0 ? 7 : i;
  const age = nonNeg(v.ageMonths);
  const perDay = age < 1 ? 11 : age < 6 ? 9 : age < 12 ? 7 : age < 24 ? 6 : 5;
  return {
    diaperSize: size,
    nextSizeAtLb: size < 7 ? DIAPER_LB[size] : 0,
    diapersPerDay: perDay,
    diapersPerMonth: perDay * 30,
    weightLb: round2(lb),
  };
};

export const ringSize: CustomCalculator = (v) => {
  const raw = nonNeg(v.measurement);
  const type = idx(v.measureType, 2); // 0 circumference mm, 1 inner diameter mm, 2 circumference in
  const circ = type === 0 ? raw : type === 1 ? raw * Math.PI : raw * 25.4;
  const diameter = circ / Math.PI;
  const us = Math.max(0, Math.round(((diameter - 11.63) / 0.8128) * 4) / 4);
  return {
    usRingSize: us,
    ukLetterCode: Math.min(26, Math.max(1, Math.round(us * 2))),
    euIsoSize: Math.round(circ),
    japanSize: Math.max(1, Math.round(2.4 * us - 3)),
    innerDiameterMm: round2(diameter),
  };
};

/** Drop below the base of the neck (in) by style. */
const NECK_DROP = [1, 4, 6, 10, 18, 26];
const STANDARD_CHAINS = [14, 16, 18, 20, 22, 24, 30, 36, 40];

export const chainLength: CustomCalculator = (v) => {
  const neck = inches(v.neck, v.unit);
  const target = neck + NECK_DROP[idx(v.style, 5)] + (safeNumber(v.pendant) === 1 ? 1 : 0);
  const std = STANDARD_CHAINS.find((s) => s >= target) ?? STANDARD_CHAINS[STANDARD_CHAINS.length - 1];
  return {
    chainLength: std,
    exactLength: round2(target),
    chainLengthCm: Math.round(std * 2.54),
    neckInches: round2(neck),
  };
};

export const braceletSize: CustomCalculator = (v) => {
  const wrist = inches(v.wrist, v.unit);
  const add = [0.5, 0.75, 1][idx(v.fit, 2)];
  const len = wrist + add;
  return {
    braceletLength: round2(len),
    braceletLengthCm: round2(len * 2.54),
    letterCode: find(len, [6.5, 7, 7.5, 8, 8.5]),
    wristInches: round2(wrist),
  };
};

/** Indian bangle sizes by inner diameter (in): 2.2 = 2 2/16 in … 2.12 = 2 12/16 in. */
const BANGLE_IN = [2.125, 2.25, 2.375, 2.5, 2.625, 2.75];

export const bangleSize: CustomCalculator = (v) => {
  const handCirc = inches(v.hand, v.unit); // around the knuckles with thumb tucked in
  const d = handCirc / Math.PI + 0.06; // a little room to slide over the knuckles
  const i = BANGLE_IN.findIndex((b) => d <= b);
  const code = (i < 0 ? BANGLE_IN.length - 1 : i) + 1;
  return {
    innerDiameterMm: round2(d * 25.4),
    innerDiameterIn: round2(d),
    indianSizeCode: code,
    letterCode: code <= 1 ? 1 : code <= 2 ? 2 : code <= 4 ? 3 : 4,
    innerCircumferenceMm: round2(d * 25.4 * Math.PI),
  };
};

export const watchSize: CustomCalculator = (v) => {
  const wrist = inches(v.wrist, v.unit);
  const ideal = 36 + (wrist - 6) * 4; // 36 mm at a 6 in wrist, about 4 mm more per extra inch
  const style = idx(v.style, 2); // dress, everyday, sport/dive
  const adj = [-2, 0, 2][style];
  const center = Math.max(28, Math.min(50, ideal + adj));
  const topWidthMm = wrist * 25.4 * 0.31;
  return {
    idealCaseMm: Math.round(center),
    caseRangeLow: Math.round(center - 2),
    caseRangeHigh: Math.round(center + 2),
    maxLugToLugMm: Math.round(topWidthMm),
    strapSizeCode: wrist < 6.5 ? 1 : wrist <= 7.5 ? 2 : 3,
  };
};

export const shoppingSizeAccessoriesCustomCalculators: Record<string, CustomCalculator> = {
  "hat-size-calculator": hatSize,
  "glove-size-calculator": gloveSize,
  "tie-length-calculator": tieLength,
  "coverall-size-calculator": coverallSize,
  "glasses-frame-size-calculator": glassesFrameSize,
  "diaper-size-calculator": diaperSize,
  "ring-size-calculator": ringSize,
  "chain-length-calculator": chainLength,
  "bracelet-size-calculator": braceletSize,
  "bangle-size-calculator": bangleSize,
  "watch-size-calculator": watchSize,
};
