/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch C
 * (Powerlifting & Weightlifting, 8 tools). See
 * calc-engine-sports-strength-programming.ts for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - wilksScoreCalculator: the original Wilks formula (used until 2020).
 *  - dotsScoreCalculator: DOTS (used by many non-IPF federations since 2019).
 *  - ipfGlPointsCalculator: IPF Goodlift points — classic/equipped,
 *    full power or bench only (the IPF's official formula since 2020).
 *  - sinclairCalculator: Olympic weightlifting (snatch + clean & jerk)
 *    bodyweight adjustment, by Olympic-cycle coefficients.
 *  - powerliftingTotalCalculator: squat + bench + deadlift total in kg and
 *    lb with each lift's share (and DOTS for context).
 *  - olympicWeightliftingTotalCalculator: snatch + C&J total, snatch-to-C&J
 *    balance and Sinclair.
 *  - powerliftingAttemptCalculator: opener, second and third attempts for
 *    one lift at a meet (also meet attempt selection).
 *  - powerliftingWarmUpCalculator: warm-up sets leading to the opener.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-powerlifting-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const KG_PER_LB = 0.45359237;
/** Input in kg or lb (unit 2) → kg. */
const toKg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * KG_PER_LB : v);
const isFemale = (v: number) => whole(v, 1) === 2;

function poly(bw: number, c: number[]): number {
  return c.reduce((s, k, i) => s + k * Math.pow(bw, i), 0);
}

// Original Wilks coefficients (a … f).
const WILKS_M = [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8];
const WILKS_F = [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];

function wilksCoef(bwKg: number, female: boolean): number {
  const bw = Math.min(female ? 150.95 : 201.9, Math.max(female ? 26.51 : 40, bwKg));
  return 500 / poly(bw, female ? WILKS_F : WILKS_M);
}

// DOTS coefficients (a … e).
const DOTS_M = [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093];
const DOTS_F = [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];

function dotsCoef(bwKg: number, female: boolean): number {
  const bw = Math.min(female ? 150 : 210, Math.max(40, bwKg));
  return 500 / poly(bw, female ? DOTS_F : DOTS_M);
}

// --- 1. Wilks ---------------------------------------------------------------
export const wilksScoreCalculator: CustomCalculator = (values) => {
  const bw = toKg(nonNeg(values.bodyweight, 83), values.unit);
  const total = toKg(nonNeg(values.total, 600), values.unit);
  const coef = wilksCoef(bw, isFemale(values.sex));
  return { wilksScore: round2(total * coef), wilksCoefficient: Math.round(coef * 10000) / 10000, totalKg: round2(total) };
};

// --- 2. DOTS ----------------------------------------------------------------
export const dotsScoreCalculator: CustomCalculator = (values) => {
  const bw = toKg(nonNeg(values.bodyweight, 83), values.unit);
  const total = toKg(nonNeg(values.total, 600), values.unit);
  const coef = dotsCoef(bw, isFemale(values.sex));
  return { dotsScore: round2(total * coef), dotsCoefficient: Math.round(coef * 10000) / 10000, totalKg: round2(total) };
};

// --- 3. IPF GL Points -------------------------------------------------------
// [A, B, C] for: sex (M/F) × equipment (classic/equipped) × event (3-lift/bench).
const GL: Record<string, number[]> = {
  "M-1-1": [1199.72839, 1025.18162, 0.00921],
  "M-2-1": [1236.25115, 1449.21864, 0.01644],
  "M-1-2": [320.98041, 281.40258, 0.01008],
  "M-2-2": [381.22073, 733.79378, 0.02398],
  "F-1-1": [610.32796, 1045.59282, 0.03048],
  "F-2-1": [758.63878, 949.31382, 0.02435],
  "F-1-2": [142.40398, 442.52671, 0.04724],
  "F-2-2": [221.82209, 357.00377, 0.02937],
};

export const ipfGlPointsCalculator: CustomCalculator = (values) => {
  const bw = toKg(nonNeg(values.bodyweight, 83), values.unit);
  const total = toKg(nonNeg(values.total, 600), values.unit);
  const key = `${isFemale(values.sex) ? "F" : "M"}-${whole(values.equipment, 1) === 2 ? 2 : 1}-${whole(values.event, 1) === 2 ? 2 : 1}`;
  const [a, b, c] = GL[key];
  const coef = bw >= 35 ? 100 / (a - b * Math.exp(-c * bw)) : 0;
  return { glPoints: round2(total * coef), glCoefficient: Math.round(coef * 100000) / 100000, totalKg: round2(total) };
};

// --- 4. Sinclair ------------------------------------------------------------
// Olympic-cycle coefficients: [A, b] — b is the bodyweight above which no
// adjustment applies (the heaviest world-record holder's bodyweight).
const SINCLAIR: Record<string, number[]> = {
  "M-1": [0.722762521, 193.609], // 2021–2024
  "F-1": [0.787004341, 153.757],
  "M-2": [0.75194503, 175.508], // 2017–2020
  "F-2": [0.783497476, 153.655],
};

function sinclairCoef(bwKg: number, female: boolean, cycle: number): number {
  const [a, b] = SINCLAIR[`${female ? "F" : "M"}-${cycle === 2 ? 2 : 1}`];
  if (bwKg <= 0 || bwKg >= b) return 1;
  return Math.pow(10, a * Math.pow(Math.log10(bwKg / b), 2));
}

export const sinclairCalculator: CustomCalculator = (values) => {
  const bw = toKg(nonNeg(values.bodyweight, 81), values.unit);
  const total = toKg(nonNeg(values.total, 300), values.unit);
  const coef = sinclairCoef(bw, isFemale(values.sex), whole(values.cycle, 1));
  return { sinclairTotal: round2(total * coef), sinclairCoefficient: Math.round(coef * 10000) / 10000, totalKg: round2(total) };
};

// --- 5. Powerlifting Total --------------------------------------------------
export const powerliftingTotalCalculator: CustomCalculator = (values) => {
  const squat = nonNeg(values.squat, 200);
  const bench = nonNeg(values.bench, 130);
  const dl = nonNeg(values.deadlift, 240);
  const total = squat + bench + dl;
  const lb = whole(values.unit, 1) === 2;
  const bwKg = toKg(nonNeg(values.bodyweight, 90), values.unit);
  const totalKg = lb ? total * KG_PER_LB : total;

  return {
    total: round2(total),
    totalInOtherUnit: round2(lb ? total * KG_PER_LB : total / KG_PER_LB),
    squatShare: total > 0 ? round2((squat / total) * 100) : 0,
    benchShare: total > 0 ? round2((bench / total) * 100) : 0,
    deadliftShare: total > 0 ? round2((dl / total) * 100) : 0,
    dotsScore: bwKg > 0 ? round2(totalKg * dotsCoef(bwKg, isFemale(values.sex))) : 0,
  };
};

// --- 6. Olympic Weightlifting Total -----------------------------------------
export const olympicWeightliftingTotalCalculator: CustomCalculator = (values) => {
  const snatch = nonNeg(values.snatch, 100);
  const cj = nonNeg(values.cleanAndJerk, 125);
  const total = snatch + cj;
  const lb = whole(values.unit, 1) === 2;
  const bwKg = toKg(nonNeg(values.bodyweight, 81), values.unit);
  const totalKg = lb ? total * KG_PER_LB : total;

  return {
    total: round2(total),
    totalInOtherUnit: round2(lb ? total * KG_PER_LB : total / KG_PER_LB),
    snatchToCleanJerkRatio: cj > 0 ? round2((snatch / cj) * 100) : 0,
    // Typical balance: snatch ≈ 80% of C&J.
    expectedSnatch: round2(cj * 0.8),
    sinclairTotal: bwKg > 0 ? round2(totalKg * sinclairCoef(bwKg, isFemale(values.sex), 1)) : 0,
  };
};

// --- 7. Powerlifting Attempt Selection --------------------------------------
// Strategy → [opener, second, third] as % of the expected max.
const ATTEMPTS: Record<number, number[]> = { 1: [0.88, 0.94, 0.99], 2: [0.91, 0.96, 1.01], 3: [0.93, 0.98, 1.03] };

export const powerliftingAttemptCalculator: CustomCalculator = (values) => {
  const max = nonNeg(values.expectedMax, 200);
  const s = ATTEMPTS[whole(values.strategy, 2)] ?? ATTEMPTS[2];
  // Meet loads go up in 2.5 kg (or 5 lb) steps.
  const inc = nonNeg(values.increment, 2.5) || 2.5;
  const at = (p: number) => Math.round((max * p) / inc) * inc;

  return { opener: at(s[0]), secondAttempt: at(s[1]), thirdAttempt: at(s[2]), thirdVsMaxPercent: max > 0 ? round2((at(s[2]) / max) * 100) : 0 };
};

// --- 8. Powerlifting Warm-Up ------------------------------------------------
// Warm-up ladders by number of sets: [% of opener, reps].
const WARMUPS: Record<number, number[][]> = {
  4: [[0, 5], [0.5, 5], [0.7, 3], [0.85, 1]],
  5: [[0, 5], [0.4, 5], [0.6, 3], [0.75, 2], [0.88, 1]],
  6: [[0, 8], [0.35, 5], [0.5, 3], [0.65, 2], [0.8, 1], [0.9, 1]],
};

export const powerliftingWarmUpCalculator: CustomCalculator = (values) => {
  const opener = nonNeg(values.opener, 180);
  const bar = nonNeg(values.barWeight, 20);
  const inc = nonNeg(values.increment, 2.5) || 2.5;
  const n = Math.min(6, Math.max(4, whole(values.warmUpSets, 5)));
  const plan = WARMUPS[n];
  const out: Record<string, number> = {};
  plan.forEach(([p, reps], i) => {
    out[`set${i + 1}Weight`] = p === 0 ? bar : Math.max(bar, Math.round((opener * p) / inc) * inc);
    out[`set${i + 1}Reps`] = reps;
  });
  for (let i = plan.length; i < 6; i++) {
    out[`set${i + 1}Weight`] = 0;
    out[`set${i + 1}Reps`] = 0;
  }
  return { opener: round2(opener), ...out };
};

export const sportsPowerliftingCustomCalculators: Record<string, CustomCalculator> = {
  "wilks-score-calculator": wilksScoreCalculator,
  "dots-score-calculator": dotsScoreCalculator,
  "ipf-gl-points-calculator": ipfGlPointsCalculator,
  "sinclair-calculator": sinclairCalculator,
  "powerlifting-total-calculator": powerliftingTotalCalculator,
  "olympic-weightlifting-total-calculator": olympicWeightliftingTotalCalculator,
  "powerlifting-attempt-calculator": powerliftingAttemptCalculator,
  "powerlifting-warm-up-calculator": powerliftingWarmUpCalculator,
};
