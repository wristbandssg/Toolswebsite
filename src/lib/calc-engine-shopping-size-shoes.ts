/**
 * Batch: "Shopping Calculators" → Clothing, Shoe & Ring Size — shoes, boots
 * and socks (9 tools). running-shoe-size and climbing-shoe-size already
 * exist for sports. Shared Brannock-style relationships (foot length L in
 * inches): men's US ≈ 3L − 21.5, women's US = men's + 1.5, UK = men's − 0.5
 * (women's − 2), EU = 1.5 × (foot cm + 1.5), kids' US ≈ 3L − 11.67 with
 * sizes above 13.5C continuing as youth (Y) sizes.
 *
 *  - shoeSize: all sizes from a foot length.
 *  - womensToMensShoeSize: converts either way, with UK and EU.
 *  - shoeWidth: width letter from foot width at the ball for your size.
 *  - kidsShoeSize: little kid (C) and big kid (Y) sizes with growing room.
 *  - toddlerShoeSize (also baby): baby/toddler sizes and when to re-measure.
 *  - bootSize: boot size from shoe size by boot type and socks, plus calf fit.
 *  - waderSize: wader size from chest and inseam, and the wading boot size.
 *  - sockSize: sock letter and number size from shoe size.
 *  - heelHeight: heel pitch angle and forefoot load for a heel height.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-size-shoes-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const half = (n: number) => Math.round(n * 2) / 2;
const inches = (x: number, unit: number) => (safeNumber(unit) === 1 ? nonNeg(x) / 2.54 : nonNeg(x));
const mensFromLength = (L: number) => 3 * L - 21.5;
const lengthFromMens = (s: number) => (s + 21.5) / 3;
const euFromLength = (L: number) => 1.5 * (L * 2.54 + 1.5);

export const shoeSize: CustomCalculator = (v) => {
  const L = inches(v.footLength, v.unit);
  const men = Math.max(0, half(mensFromLength(L)));
  const women = men + 1.5;
  return {
    usMens: men,
    usWomens: women,
    ukSize: Math.max(0, men - 0.5),
    euSize: L > 0 ? half(euFromLength(L)) : 0,
    footLengthCm: round2(L * 2.54),
    mondopoint: Math.round(L * 25.4),
  };
};

export const womensToMensShoeSize: CustomCalculator = (v) => {
  const toMens = safeNumber(v.direction) === 0;
  const size = nonNeg(v.size);
  const men = toMens ? Math.max(0, size - 1.5) : size;
  const women = toMens ? size : size + 1.5;
  const L = lengthFromMens(men);
  return {
    convertedSize: toMens ? men : women,
    usMens: men,
    usWomens: women,
    ukMens: Math.max(0, men - 0.5),
    ukWomens: Math.max(0, women - 2),
    euSize: half(euFromLength(L)),
  };
};

export const shoeWidth: CustomCalculator = (v) => {
  const L = inches(v.footLength, v.unit);
  const W = inches(v.footWidth, v.unit);
  const womens = safeNumber(v.gender) === 1;
  const men = mensFromLength(L);
  // Medium width at the ball: men's D ≈ 3.9 in at size 9, women's B ≈ 3.5 in at size 8, ±1/16 in per size.
  const medium = womens ? 3.5 + (men + 1.5 - 8) * 0.0625 : 3.9 + (men - 9) * 0.0625;
  const steps = Math.round((W - medium) / 0.1875);
  const code = Math.min(5, Math.max(1, 2 + steps));
  return {
    widthCode: code,
    mediumWidthForYourSize: round2(medium),
    differenceFromMedium: round2(W - medium),
    widthToLengthRatio: L > 0 ? round2((W / L) * 100) : 0,
  };
};

function kidsSize(L: number) {
  const s = half(3 * L - 11.67);
  return s > 13.5 ? { size: half(s - 13), series: 2 } : { size: Math.max(0, s), series: 1 };
}

export const kidsShoeSize: CustomCalculator = (v) => {
  const L = inches(v.footLength, v.unit);
  const now = kidsSize(L);
  const room = kidsSize(L + nonNeg(v.growingRoom, 0.5));
  return {
    sizeToBuy: room.size,
    sizeSeries: room.series,
    exactSizeNow: now.size,
    euSize: half(euFromLength(L + nonNeg(v.growingRoom, 0.5))),
    footLengthCm: round2(L * 2.54),
  };
};

export const toddlerShoeSize: CustomCalculator = (v) => {
  const L = inches(v.footLength, v.unit);
  const now = Math.max(0, half(3 * L - 11.67));
  const buy = Math.max(0, half(3 * (L + nonNeg(v.growingRoom, 0.5)) - 11.67));
  const age = nonNeg(v.ageMonths);
  return {
    sizeToBuy: buy,
    exactSizeNow: now,
    euSize: L > 0 ? half(euFromLength(L + nonNeg(v.growingRoom, 0.5))) : 0,
    remeasureInMonths: age < 15 ? 2 : age < 36 ? 3 : 4,
    footLengthCm: round2(L * 2.54),
  };
};

export const bootSize: CustomCalculator = (v) => {
  const shoe = nonNeg(v.shoeSize);
  const adj = [0, 0, -0.5, 0.5, 0][Math.min(4, Math.max(0, Math.round(safeNumber(v.bootType))))];
  const sock = safeNumber(v.thickSocks) === 1 ? 0.5 : 0;
  const calf = inches(v.calf, v.unit);
  const womens = safeNumber(v.gender) === 1;
  const regularMax = womens ? 15 : 16;
  const calfCode = calf <= regularMax ? 1 : calf <= regularMax + 2 ? 2 : 3;
  return {
    bootSize: half(shoe + adj + sock),
    sizeChange: adj + sock,
    calfFitCode: calfCode,
    calfInches: round2(calf),
  };
};

const WADER_CHEST = [40, 44, 48, 52, 56, 60];

export const waderSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  const inseam = inches(v.inseam, v.unit);
  const i = WADER_CHEST.findIndex((c) => chest <= c);
  const code = (i < 0 ? WADER_CHEST.length - 1 : i) + 1;
  const regular = [29, 31, 32, 33, 34, 34][code - 1];
  const length = inseam < regular - 1.5 ? 1 : inseam > regular + 1.5 ? 3 : 2;
  const stockingfoot = safeNumber(v.waderType) === 0;
  return {
    waderSizeCode: code,
    lengthCode: length,
    wadingBootSize: half(nonNeg(v.shoeSize) + (stockingfoot ? 1 : 0)),
    bootfootSize: half(nonNeg(v.shoeSize) + (safeNumber(v.thickSocks) === 1 ? 0.5 : 0)),
  };
};

export const sockSize: CustomCalculator = (v) => {
  const shoe = nonNeg(v.shoeSize);
  const womens = safeNumber(v.gender) === 1;
  const men = womens ? shoe - 1.5 : shoe;
  const L = lengthFromMens(men);
  const limits = womens ? [5.5, 8.5, 11.5, 14] : [6, 9, 12, 15];
  const i = limits.findIndex((l) => shoe <= l);
  return {
    sockLetterCode: (i < 0 ? limits.length - 1 : i) + 1,
    sockNumberSize: half(L),
    footLengthInches: round2(L),
    euSockRange: Math.round(euFromLength(L)),
  };
};

/** Forefoot load share of body weight by heel height (in), from pressure studies. */
const HEEL_IN = [0, 1, 2, 3, 4];
const HEEL_LOAD = [12, 22, 57, 76, 90];

export const heelHeight: CustomCalculator = (v) => {
  const h = inches(v.heelHeight, v.unit);
  const womens = nonNeg(v.shoeSize);
  const L = lengthFromMens(Math.max(0, womens - 1.5));
  const base = 0.6 * L; // heel-to-ball distance ≈ 60% of foot length
  const angle = base > 0 ? (Math.asin(Math.min(1, h / base)) * 180) / Math.PI : 0;
  let load = HEEL_LOAD[HEEL_LOAD.length - 1];
  for (let i = 1; i < HEEL_IN.length; i++) {
    if (h <= HEEL_IN[i]) {
      load = HEEL_LOAD[i - 1] + ((h - HEEL_IN[i - 1]) / (HEEL_IN[i] - HEEL_IN[i - 1])) * (HEEL_LOAD[i] - HEEL_LOAD[i - 1]);
      break;
    }
  }
  const code = h <= 2 ? 1 : h <= 3 ? 2 : h <= 4 ? 3 : 4;
  return {
    comfortCode: code,
    pitchAngle: round2(angle),
    forefootLoadPercent: round2(load),
    heelHeightCm: round2(h * 2.54),
  };
};

export const shoppingSizeShoesCustomCalculators: Record<string, CustomCalculator> = {
  "shoe-size-calculator": shoeSize,
  "womens-to-mens-shoe-size-calculator": womensToMensShoeSize,
  "shoe-width-calculator": shoeWidth,
  "kids-shoe-size-calculator": kidsShoeSize,
  "toddler-shoe-size-calculator": toddlerShoeSize,
  "boot-size-calculator": bootSize,
  "wader-size-calculator": waderSize,
  "sock-size-calculator": sockSize,
  "heel-height-calculator": heelHeight,
};
