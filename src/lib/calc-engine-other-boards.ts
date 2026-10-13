/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-boards (surf, SUP, kayak, bodyboard & wakeboard, 8 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - surfboardVolumeCalculator: litres from weight and skill (guild
 *    factor); surfboardSizeCalculator: board length and width.
 *  - paddleBoardSizeCalculator: SUP length, width and volume;
 *    supPaddleLengthCalculator: paddle length for the SUP;
 *    kayakPaddleLengthCalculator: kayak paddle from boat width and height.
 *  - kayakDistanceCalculator: how far / how long a paddle takes.
 *  - bodyboardSizeCalculator vs wakeboardSizeCalculator: by height vs by
 *    weight.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-boards-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const num = (v: number, d = 0) => safeNumber(v, d);
const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Weight: unit 1 = lb, 2 = kg -> kg. */
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);
/** Height: unit 1 = inches, 2 = cm -> inches. */
const inOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 2.54 : v);

// --- 1. Surfboard volume ---------------------------------------------------------
const GUILD: Record<number, [number, number]> = { 1: [0.8, 1], 2: [0.55, 0.65], 3: [0.42, 0.48], 4: [0.38, 0.41], 5: [0.35, 0.37] };

export const surfboardVolumeCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const [lo, hi] = GUILD[whole(values.skill, 3)] ?? GUILD[3];
  const adj = (whole(values.fitness, 2) === 1 ? 1.1 : whole(values.fitness, 2) === 3 ? 0.95 : 1) * (whole(values.waves, 2) === 1 ? 1.1 : whole(values.waves, 2) === 3 ? 0.95 : 1);
  const low = kg * lo * adj;
  const high = kg * hi * adj;

  return { volumeLitres: round2((low + high) / 2), volumeLow: round2(low), volumeHigh: round2(high), weightKg: round2(kg) };
};

// --- 2. Surfboard size (length & width) -------------------------------------------------
export const surfboardSizeCalculator: CustomCalculator = (values) => {
  const lb = kgOf(nonNeg(values.weight, 170), values.weightUnit) / 0.45359237;
  const h = inOf(nonNeg(values.height, 70), values.heightUnit);
  const skill = whole(values.skill, 2);
  let length: number;
  let width: number;
  if (skill === 1) {
    length = lb < 140 ? 96 : lb < 180 ? 102 : lb < 220 ? 108 : 114;
    width = 22.5;
  } else if (skill === 2) {
    length = lb < 140 ? 82 : lb < 180 ? 86 : lb < 220 ? 90 : 94;
    width = 21.25;
  } else {
    length = h + (lb < 160 ? 2 : lb < 190 ? 4 : 6);
    width = lb < 160 ? 19.25 : lb < 190 ? 19.75 : 20.5;
  }

  return { lengthInches: Math.round(length), lengthFeet: Math.floor(length / 12), lengthExtraInches: Math.round(length % 12), widthInches: width };
};

// --- 3. Paddle board (SUP) size ------------------------------------------------------------
const SUP_LEN: Record<number, number> = { 1: 126, 2: 150, 3: 168, 4: 108, 5: 126 };
const SUP_FACTOR: Record<number, number> = { 1: 2, 2: 1.6, 3: 1.3 };

export const paddleBoardSizeCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 180), values.weightUnit) + kgOf(nonNeg(values.gear, 0), values.weightUnit);
  const use = whole(values.use, 1); // 1 all-round, 2 touring, 3 race, 4 surf, 5 yoga / fishing
  const skill = whole(values.skill, 1);
  const vol = kg * (SUP_FACTOR[skill] ?? 2) * (use === 5 ? 1.15 : use === 4 ? 0.8 : 1);
  const width = use === 3 ? 26 : use === 5 ? 34 : skill === 1 ? 32 : skill === 2 ? 31 : 29;
  const len = (SUP_LEN[use] ?? 126) + (kg > 100 && use !== 3 ? 6 : 0);

  return { lengthInches: len, lengthFeet: Math.floor(len / 12), lengthExtraInches: len % 12, widthInches: width, volumeLitres: Math.round(vol) };
};

// --- 4. SUP paddle length -------------------------------------------------------------------
const SUP_PADDLE_ADD: Record<number, number> = { 1: 9, 2: 7, 3: 11 };

export const supPaddleLengthCalculator: CustomCalculator = (values) => {
  const h = inOf(nonNeg(values.height, 70), values.unit);
  const len = h + (SUP_PADDLE_ADD[whole(values.use, 1)] ?? 9);

  return { paddleLengthInches: round2(len), paddleLengthCm: Math.round(len * 2.54), rangeLowInches: round2(len - 1), rangeHighInches: round2(len + 1) };
};

// --- 5. Kayak paddle length -------------------------------------------------------------------
// Rows: boat width < 23, 23–28, 28–32, > 32 in; columns: paddler < 5'5", 5'5"–5'11", 6'+ (cm).
const KAYAK_PADDLE = [[210, 215, 220], [220, 220, 230], [230, 230, 240], [240, 250, 250]];

export const kayakPaddleLengthCalculator: CustomCalculator = (values) => {
  const w = inOf(nonNeg(values.boatWidth, 26), values.unit);
  const h = inOf(nonNeg(values.height, 70), values.unit);
  const row = w < 23 ? 0 : w < 28 ? 1 : w <= 32 ? 2 : 3;
  const col = h < 65 ? 0 : h < 72 ? 1 : 2;
  const len = KAYAK_PADDLE[row][col] - (whole(values.style, 1) === 2 ? 10 : 0);

  return { paddleLengthCm: len, paddleLengthInches: round2(len / 2.54) };
};

// --- 6. Kayak distance ---------------------------------------------------------------------------
const KAYAK_SPEED: Record<number, number> = { 1: 3, 2: 2.5, 3: 3.5, 4: 4, 5: 4.5 };
const EFFORT: Record<number, number> = { 1: 0.8, 2: 1, 3: 1.2 };

export const kayakDistanceCalculator: CustomCalculator = (values) => {
  const base = (KAYAK_SPEED[whole(values.kayakType, 1)] ?? 3) * (EFFORT[whole(values.effort, 2)] ?? 1);
  const speed = Math.max(0.5, base + num(values.current, 0));
  const hours = nonNeg(values.hours, 3);
  const moving = hours * (1 - clamp(nonNeg(values.breakPct, 10), 0, 90) / 100);
  const target = nonNeg(values.tripDistance, 10);

  return { distanceMiles: round2(speed * moving), distanceKm: round2(speed * moving * 1.609344), speedMph: round2(speed), hoursForTrip: round2(div(target, speed) / (1 - clamp(nonNeg(values.breakPct, 10), 0, 90) / 100)) };
};

// --- 7. Bodyboard size ---------------------------------------------------------------------------
export const bodyboardSizeCalculator: CustomCalculator = (values) => {
  const h = inOf(nonNeg(values.height, 69), values.unit);
  const lb = kgOf(nonNeg(values.weight, 160), values.weightUnit) / 0.45359237;
  const len = clamp(Math.round(39 + (h - 60) / 3 + (lb > 200 ? 1 : lb < 110 ? -1 : 0)), 32, 46);

  return { boardLengthInches: len, boardLengthCm: Math.round(len * 2.54) };
};

// --- 8. Wakeboard size ---------------------------------------------------------------------------
export const wakeboardSizeCalculator: CustomCalculator = (values) => {
  const lb = kgOf(nonNeg(values.weight, 170), values.weightUnit) / 0.45359237;
  const base = lb < 100 ? 128 : lb < 150 ? 132 : lb < 200 ? 136 : lb < 250 ? 141 : 145;
  const len = base + (whole(values.style, 1) === 1 ? 2 : whole(values.style, 1) === 3 ? -2 : 0);

  return { boardLengthCm: len, rangeLowCm: len - 2, rangeHighCm: len + 2 };
};

export const otherBoardsCustomCalculators: Record<string, CustomCalculator> = {
  "surfboard-volume-calculator": surfboardVolumeCalculator,
  "surfboard-size-calculator": surfboardSizeCalculator,
  "paddle-board-size-calculator": paddleBoardSizeCalculator,
  "sup-paddle-length-calculator": supPaddleLengthCalculator,
  "kayak-paddle-length-calculator": kayakPaddleLengthCalculator,
  "kayak-distance-calculator": kayakDistanceCalculator,
  "bodyboard-size-calculator": bodyboardSizeCalculator,
  "wakeboard-size-calculator": wakeboardSizeCalculator,
};
