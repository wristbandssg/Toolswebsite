/**
 * Batch: "Shopping Calculators" → Clothing, Shoe & Ring Size — suits,
 * shirts, outerwear, trousers and belts (8 tools).
 *
 *  - suitSize (also tuxedo, vest): jacket size from chest, short/regular/
 *    long by height, and trouser waist from the drop.
 *  - shirtSize: casual shirt letter size from chest, adjusted for fit.
 *  - dressShirtSize (also neck size, sleeve length): collar to the half
 *    inch and sleeve to the inch, with the EU collar size.
 *  - jacketSize (also leather jackets): letter and numeric jacket size,
 *    sizing up for layering in snug leather.
 *  - coatLength: coat length from the shoulder by style and height.
 *  - pantsSize (also shorts): women's numeric or men's waist size, length,
 *    and a shorts inseam by height.
 *  - inseam: inseam from a measurement or estimated from height, with the
 *    length category.
 *  - beltSize: belt size from waist or from a belt that fits.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-size-menswear-calculators.ts for the copy.
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
const even = (n: number) => {
  const r = Math.round(n);
  return r % 2 === 0 ? r : r + 1;
};

export const suitSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  const waist = inches(v.waist, v.unit);
  const height = inches(v.height, v.unit);
  const jacket = even(chest);
  const length = height < 68 ? 1 : height <= 72 ? 2 : height <= 75 ? 3 : 4;
  return {
    jacketSize: jacket,
    lengthCode: length,
    trouserWaist: Math.ceil(waist),
    drop: round2(jacket - Math.ceil(waist)),
    euSize: jacket + 10,
  };
};

const SHIRT_CHEST = [36, 40, 44, 48, 52, 56, 60];

export const shirtSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  const fit = idx(v.fit, 2); // 0 slim, 1 regular, 2 relaxed
  const adjusted = chest + [1, 0, -1][fit];
  const i = SHIRT_CHEST.findIndex((c) => adjusted <= c);
  return {
    shirtCode: (i < 0 ? SHIRT_CHEST.length - 1 : i) + 1,
    chestInches: round2(chest),
    chestCm: round2(chest * 2.54),
    euSize: Math.round(chest * 2.54 / 2) + (fit === 0 ? 2 : 0),
  };
};

export const dressShirtSize: CustomCalculator = (v) => {
  const neck = inches(v.neck, v.unit);
  const sleeve = inches(v.sleeve, v.unit);
  const collar = Math.ceil((neck + 0.5) * 2) / 2; // add a finger's room, round up to the half inch
  return {
    collarSize: collar,
    sleeveLength: Math.round(sleeve),
    euCollarCm: Math.round(collar * 2.54),
    sleeveRangeLow: Math.round(sleeve) % 2 === 0 ? Math.round(sleeve) - 1 : Math.round(sleeve),
  };
};

export const jacketSize: CustomCalculator = (v) => {
  const chest = inches(v.chest, v.unit);
  const womens = safeNumber(v.gender) === 1;
  // Layering room: leather barely stretches, so it needs more than a fabric jacket.
  const leather = safeNumber(v.jacketType) === 1;
  const effective = chest + (safeNumber(v.layering) === 1 ? (leather ? 2 : 1) : 0);
  if (womens) {
    const limits = [31, 33, 35, 37, 39.5, 42, 45];
    const sizes = [0, 2, 4, 6, 10, 14, 18];
    const i = limits.findIndex((l) => effective <= l);
    const k = i < 0 ? limits.length - 1 : i;
    return { letterCode: k + 1, numericSize: sizes[k], effectiveChest: round2(effective), euSize: sizes[k] + 30 };
  }
  const i = SHIRT_CHEST.findIndex((c) => effective <= c);
  return { letterCode: (i < 0 ? SHIRT_CHEST.length - 1 : i) + 1, numericSize: even(effective), effectiveChest: round2(effective), euSize: even(effective) + 10 };
};

/** Shoulder-to-hem as a share of height: hip, mid-thigh, knee, mid-calf, ankle. */
const COAT_RATIO = [0.36, 0.44, 0.53, 0.62, 0.76];

export const coatLength: CustomCalculator = (v) => {
  const h = inches(v.height, v.unit);
  const len = h * COAT_RATIO[idx(v.style, 4)];
  return { coatLength: round2(len), coatLengthCm: round2(len * 2.54), heightInches: round2(h) };
};

const WOMENS_WAIST = [24, 25, 26, 27, 28, 29, 30.5, 32, 33.5, 35.5, 37.5, 39.5, 41.5];
const WOMENS_HIP = [34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 41, 42.5, 44, 46, 48, 50, 52];
const WOMENS_SIZE = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

export const pantsSize: CustomCalculator = (v) => {
  const waist = inches(v.waist, v.unit);
  const hip = inches(v.hip, v.unit);
  const height = inches(v.height, v.unit);
  const womens = safeNumber(v.gender) === 1;
  const at = (x: number, l: number[]) => {
    const i = l.findIndex((y) => x <= y);
    return i < 0 ? l.length - 1 : i;
  };
  const size = womens ? WOMENS_SIZE[Math.max(at(waist, WOMENS_WAIST), at(hip, WOMENS_HIP))] : Math.ceil(waist);
  const inseam = height * 0.45;
  return {
    pantsSize: size,
    inseamLength: womens ? Math.round(inseam) : Math.round(inseam / 2) * 2,
    lengthCode: inseam < 29.5 ? 1 : inseam > 33 ? 3 : 2,
    shortsInseam: height < 67 ? 5 : height < 72 ? 7 : 9,
  };
};

export const inseam: CustomCalculator = (v) => {
  const measured = safeNumber(v.method) === 1;
  const h = inches(v.height, v.unit);
  const ins = measured ? inches(v.measured, v.unit) : h * 0.45;
  return {
    inseamInches: round2(ins),
    inseamCm: round2(ins * 2.54),
    lengthCode: ins < 29.5 ? 1 : ins > 33 ? 3 : 2,
    legToHeightPercent: h > 0 ? round2((ins / h) * 100) : 0,
  };
};

export const beltSize: CustomCalculator = (v) => {
  const fromBelt = safeNumber(v.method) === 1;
  const size = fromBelt ? Math.round(inches(v.beltMeasure, v.unit)) : Math.round(inches(v.waist, v.unit)) + 2;
  const letter = size <= 32 ? 1 : size <= 36 ? 2 : size <= 40 ? 3 : size <= 44 ? 4 : 5;
  return {
    beltSize: size,
    beltSizeCm: Math.round(size * 2.54),
    letterCode: letter,
    totalLength: size + 6,
  };
};

export const shoppingSizeMenswearCustomCalculators: Record<string, CustomCalculator> = {
  "suit-size-calculator": suitSize,
  "shirt-size-calculator": shirtSize,
  "dress-shirt-size-calculator": dressShirtSize,
  "jacket-size-calculator": jacketSize,
  "coat-length-calculator": coatLength,
  "pants-size-calculator": pantsSize,
  "inseam-calculator": inseam,
  "belt-size-calculator": beltSize,
};
