/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch B
 * (Strength Tools, 10 tools). See calc-engine-sports-strength-programming.ts
 * for the full list of 8 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - weightPlateCalculator: TARGET weight → which plates to load on each
 *    side (kg or lb plates; also covers plate math / plate loading / kg↔lb).
 *  - barbellWeightCalculator: plates ALREADY on the bar → total weight
 *    (also the bar load calculator).
 *  - relativeStrengthCalculator: one lift ÷ bodyweight (incl. bench press
 *    ratio and strength-to-weight ratio), plus an allometric score.
 *  - strengthStandardsCalculator: a lift vs bodyweight-ratio standards →
 *    beginner … elite level (squat, bench, deadlift, press, pull-up).
 *  - squatToDeadliftRatioCalculator: balance between two lifts.
 *  - inclineToFlatBenchCalculator: converts between incline and flat bench.
 *  - pushUpWeightCalculator: how much of your bodyweight a push-up moves.
 *  - maxPullUpCalculator: weighted pull-up 1RM and max bodyweight reps.
 *  - timeUnderTensionCalculator / restTimeCalculator: set timing.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-strength-tools-calculators.ts for the copy.
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
const isLb = (v: number) => whole(v, 1) === 2;

// --- 1. Time Under Tension --------------------------------------------------
export const timeUnderTensionCalculator: CustomCalculator = (values) => {
  const rep = nonNeg(values.eccentric, 3) + nonNeg(values.bottomPause, 1) + nonNeg(values.concentric, 1) + nonNeg(values.topPause, 0);
  const reps = whole(values.reps, 10);
  const sets = whole(values.sets, 3);
  const perSet = rep * reps;

  return {
    tutPerSet: round2(perSet),
    tutPerRep: round2(rep),
    totalTut: round2(perSet * sets),
    // 40–70 s per set is the range most associated with hypertrophy work.
    inHypertrophyRange: perSet >= 40 && perSet <= 70 ? 1 : 0,
  };
};

// --- 2. Rest Time -----------------------------------------------------------
// goal → [compound low, compound high, isolation low, isolation high] seconds
const REST: Record<number, number[]> = {
  1: [180, 300, 120, 180], // strength
  2: [90, 180, 60, 90], // hypertrophy
  3: [30, 90, 30, 60], // endurance
  4: [180, 300, 120, 180], // power
};

export const restTimeCalculator: CustomCalculator = (values) => {
  const r = REST[whole(values.goal, 2)] ?? REST[2];
  const compound = whole(values.exerciseType, 1) === 1;
  // Heavier sets (RPE 9–10) need the top of the range.
  const rpe = Math.min(10, Math.max(5, safeNumber(values.rpe, 8)));
  const lo = compound ? r[0] : r[2];
  const hi = compound ? r[1] : r[3];
  const rec = lo + (hi - lo) * ((rpe - 5) / 5);
  const sets = whole(values.sets, 15);

  return {
    recommendedRestSeconds: Math.round(rec / 15) * 15,
    restLowSeconds: lo,
    restHighSeconds: hi,
    totalRestMinutes: round2((Math.round(rec / 15) * 15 * Math.max(0, sets - 1)) / 60),
  };
};

// --- 3. Weight Plate (target → plates per side) -----------------------------
const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5, 0];

export const weightPlateCalculator: CustomCalculator = (values) => {
  const lb = isLb(values.unit);
  const plates = lb ? LB_PLATES : KG_PLATES;
  const target = nonNeg(values.targetWeight, lb ? 225 : 100);
  const bar = nonNeg(values.barWeight, lb ? 45 : 20);
  const collars = nonNeg(values.collarsTotal, 0);
  let perSide = Math.max(0, (target - bar - collars) / 2);
  const counts = plates.map((p) => {
    if (!p) return 0;
    const n = Math.floor(perSide / p + 1e-9);
    perSide -= n * p;
    return n;
  });
  const loaded = bar + collars + 2 * counts.reduce((s, n, i) => s + n * plates[i], 0);

  return {
    plate1: counts[0],
    plate2: counts[1],
    plate3: counts[2],
    plate4: counts[3],
    plate5: counts[4],
    plate6: counts[5],
    plate7: counts[6],
    loadedWeight: round2(loaded),
    shortBy: round2(target - loaded),
    loadedInOtherUnit: round2(lb ? loaded * KG_PER_LB : loaded / KG_PER_LB),
  };
};

// --- 4. Barbell Weight (plates on bar → total) ------------------------------
export const barbellWeightCalculator: CustomCalculator = (values) => {
  const lb = isLb(values.unit);
  const plates = lb ? LB_PLATES : KG_PLATES;
  const perSide = plates.reduce((s, p, i) => s + p * whole(values[`plate${i + 1}`]), 0);
  const total = nonNeg(values.barWeight, lb ? 45 : 20) + nonNeg(values.collarsTotal, 0) + 2 * perSide;

  return {
    totalWeight: round2(total),
    weightPerSide: round2(perSide),
    totalInOtherUnit: round2(lb ? total * KG_PER_LB : total / KG_PER_LB),
  };
};

// --- 5. Push-Up Weight ------------------------------------------------------
// Share of bodyweight lifted (Ebben et al. 2011, top position).
const PUSHUP_SHARE: Record<number, number> = { 1: 0.64, 2: 0.49, 3: 0.55, 4: 0.41, 5: 0.7, 6: 0.74 };

export const pushUpWeightCalculator: CustomCalculator = (values) => {
  const bw = nonNeg(values.bodyweight, 80);
  const share = PUSHUP_SHARE[whole(values.variation, 1)] ?? 0.64;
  const reps = whole(values.reps, 20);
  const sets = Math.max(1, whole(values.sets, 3));

  return {
    weightPerRep: round2(bw * share),
    percentOfBodyweight: round2(share * 100),
    volumePerSet: round2(bw * share * reps),
    totalVolume: round2(bw * share * reps * sets),
  };
};

// --- 6. Incline to Flat Bench -----------------------------------------------
// Incline 1RM as a share of flat bench 1RM by bench angle.
const INCLINE_SHARE: Record<number, number> = { 1: 0.9, 2: 0.85, 3: 0.8, 4: 0.75 }; // 15°, 30°, 45°, 60°

export const inclineToFlatBenchCalculator: CustomCalculator = (values) => {
  const share = INCLINE_SHARE[whole(values.angle, 2)] ?? 0.85;
  const lift = nonNeg(values.liftWeight, 80);
  const fromIncline = whole(values.direction, 1) === 1;
  const flat = fromIncline ? lift / share : lift;
  const incline = fromIncline ? lift : lift * share;

  return {
    convertedWeight: round2(fromIncline ? flat : incline),
    flatBench: round2(flat),
    inclineBench: round2(incline),
    inclinePercentOfFlat: round2(share * 100),
  };
};

// --- 7. Squat to Deadlift Ratio ---------------------------------------------
export const squatToDeadliftRatioCalculator: CustomCalculator = (values) => {
  const squat = Math.max(0.01, nonNeg(values.squat, 140));
  const dl = Math.max(0.01, nonNeg(values.deadlift, 170));
  const ratio = dl / squat;

  return {
    deadliftToSquatRatio: round2(ratio),
    squatPercentOfDeadlift: round2((squat / dl) * 100),
    // Typical balanced lifters pull about 1.2× their squat.
    expectedDeadlift: round2(squat * 1.2),
    expectedSquat: round2(dl / 1.2),
    differenceFromTypical: round2((ratio / 1.2 - 1) * 100),
  };
};

// --- 8. Max Pull-Up ---------------------------------------------------------
export const maxPullUpCalculator: CustomCalculator = (values) => {
  const bw = Math.max(1, nonNeg(values.bodyweight, 80));
  const added = nonNeg(values.addedWeight, 20);
  const reps = Math.max(1, whole(values.reps, 5));
  const load = bw + added;
  const total1rm = reps === 1 ? load : load * (1 + reps / 30);
  // Bodyweight reps you could do: inverse Epley at load = bodyweight.
  const bwReps = total1rm <= bw ? 0 : Math.floor(30 * (total1rm / bw - 1));

  return {
    addedWeight1rm: round2(total1rm - bw),
    totalLoad1rm: round2(total1rm),
    estimatedBodyweightReps: bwReps,
    relativeStrength: round2(total1rm / bw),
  };
};

// --- 9. Relative Strength ---------------------------------------------------
export const relativeStrengthCalculator: CustomCalculator = (values) => {
  const lift = nonNeg(values.liftWeight, 120);
  const bw = Math.max(1, nonNeg(values.bodyweight, 80));
  const kg = isLb(values.unit) ? KG_PER_LB : 1;

  return {
    strengthToWeightRatio: round2(lift / bw),
    percentOfBodyweight: round2((lift / bw) * 100),
    // Allometric scaling (lift ÷ bodyweight^0.67, both in kg) lets lighter
    // and heavier lifters be compared fairly.
    allometricScore: round2((lift * kg) / Math.pow(bw * kg, 0.67)),
  };
};

// --- 10. Strength Standards -------------------------------------------------
// Bodyweight multiples for Beginner, Novice, Intermediate, Advanced, Elite.
const STANDARDS: Record<string, number[]> = {
  "1-1": [0.75, 1.25, 1.5, 2.25, 2.75], // men squat
  "1-2": [0.5, 0.75, 1.25, 1.75, 2.0], // men bench
  "1-3": [1.0, 1.5, 2.0, 2.5, 3.0], // men deadlift
  "1-4": [0.35, 0.55, 0.8, 1.1, 1.4], // men overhead press
  "1-5": [1.0, 1.1, 1.3, 1.5, 1.75], // men pull-up (bodyweight + added)
  "2-1": [0.5, 0.75, 1.25, 1.5, 2.0],
  "2-2": [0.25, 0.5, 0.75, 1.0, 1.5],
  "2-3": [0.5, 1.0, 1.25, 1.75, 2.5],
  "2-4": [0.2, 0.35, 0.5, 0.75, 1.0],
  "2-5": [1.0, 1.05, 1.15, 1.3, 1.5],
};

export const strengthStandardsCalculator: CustomCalculator = (values) => {
  const std = STANDARDS[`${whole(values.sex, 1) === 2 ? 2 : 1}-${whole(values.lift, 1)}`] ?? STANDARDS["1-1"];
  const bw = Math.max(1, nonNeg(values.bodyweight, 80));
  const lift = nonNeg(values.oneRepMax, 120);
  const ratio = lift / bw;
  // Continuous level: 1 at Beginner … 5 at Elite, interpolated between.
  let level = 0;
  if (ratio >= std[4]) level = 5;
  else if (ratio >= std[0]) {
    const i = std.findIndex((v, k) => ratio >= v && ratio < (std[k + 1] ?? Infinity));
    level = i + 1 + (ratio - std[i]) / (std[i + 1] - std[i]);
  } else level = ratio / std[0];
  const nextIdx = std.findIndex((v) => v > ratio);

  return {
    strengthLevel: round2(level),
    bodyweightRatio: round2(ratio),
    nextLevelWeight: nextIdx >= 0 ? round2(std[nextIdx] * bw) : 0,
    intermediateWeight: round2(std[2] * bw),
    advancedWeight: round2(std[3] * bw),
    eliteWeight: round2(std[4] * bw),
  };
};

export const sportsStrengthToolsCustomCalculators: Record<string, CustomCalculator> = {
  "time-under-tension-calculator": timeUnderTensionCalculator,
  "rest-time-calculator": restTimeCalculator,
  "weight-plate-calculator": weightPlateCalculator,
  "barbell-weight-calculator": barbellWeightCalculator,
  "push-up-weight-calculator": pushUpWeightCalculator,
  "incline-to-flat-bench-calculator": inclineToFlatBenchCalculator,
  "squat-to-deadlift-ratio-calculator": squatToDeadliftRatioCalculator,
  "max-pull-up-calculator": maxPullUpCalculator,
  "relative-strength-calculator": relativeStrengthCalculator,
  "strength-standards-calculator": strengthStandardsCalculator,
};
