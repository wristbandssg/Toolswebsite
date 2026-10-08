/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch A
 * (Strength Programming, 10 tools). The 76-tool sports performance list is
 * built across 8 sub-batches:
 *   calc-engine-sports-strength-programming.ts (10)
 *   calc-engine-sports-strength-tools.ts (10)
 *   calc-engine-sports-powerlifting.ts (8)
 *   calc-engine-sports-body-composition.ts (9)
 *   calc-engine-sports-energy.ts (8)
 *   calc-engine-sports-fitness-tests.ts (11)
 *   calc-engine-sports-military-tests.ts (8)
 *   calc-engine-sports-power-conditioning.ts (12)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - oneRepMaxCalculator: weight × reps → estimated 1RM (7 formulas, best
 *    formula per lift — squat, bench, deadlift, overhead press, leg press).
 *  - percentageOf1rmCalculator: KNOWN 1RM → the weight at any % and the
 *    standard 95–60% loads, rounded to your plates.
 *  - rpeCalculator: a set at an RPE → e1RM (RTS RPE chart), and the weight
 *    for a target reps × RPE.
 *  - repsToFailureCalculator: 1RM + working weight → how many reps you can
 *    do, and the RIR/RPE of the set you did.
 *  - fiveThreeOneCalculator: Wendler 5/3/1 — training max and all 4 weeks.
 *  - startingStrengthCalculator: novice linear progression projection.
 *  - progressiveOverloadCalculator: weekly % (or fixed) load increases over
 *    a training block.
 *  - deloadCalculator: the deload week's weight, sets and reps.
 *  - setsAndRepsCalculator: rep range, sets, % 1RM and rest for a goal
 *    (incl. the hypertrophy rep range).
 *  - trainingVolumeCalculator: sets × reps × weight (tonnage) for a session.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-sports-strength-programming-calculators.ts for the tool
 * content/copy this math is wired to.
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
/** Rounds a load to the nearest plate increment (0 = no rounding). */
const toPlates = (w: number, inc: number) => (inc > 0 ? Math.round(w / inc) * inc : round2(w));

// 1RM formulas (w = weight, r = reps).
const FORMULAS = {
  epley: (w: number, r: number) => w * (1 + r / 30),
  brzycki: (w: number, r: number) => (r >= 37 ? w * 36 : (w * 36) / (37 - r)),
  lander: (w: number, r: number) => (100 * w) / (101.3 - 2.67123 * r),
  lombardi: (w: number, r: number) => w * Math.pow(r, 0.1),
  mayhew: (w: number, r: number) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)),
  oconner: (w: number, r: number) => w * (1 + 0.025 * r),
  wathan: (w: number, r: number) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
};

function estimate1rm(w: number, r: number) {
  if (r <= 1) return { epley: w, brzycki: w, average: w, all: Object.fromEntries(Object.keys(FORMULAS).map((k) => [k, w])) as Record<string, number> };
  const all = Object.fromEntries(Object.entries(FORMULAS).map(([k, f]) => [k, f(w, r)])) as Record<string, number>;
  const average = Object.values(all).reduce((a, b) => a + b, 0) / 7;
  return { epley: all.epley, brzycki: all.brzycki, average, all };
}

// --- 1. One Rep Max ---------------------------------------------------------
// Best-validated formula per lift (LeSuer et al. 1997 and later studies):
// 1 squat → Wathan, 2 bench → Mayhew, 3 deadlift → Wathan, 4 overhead press
// → Epley, 5 leg press → Epley, 6 other → average of all seven.
const LIFT_FORMULA: Record<number, keyof typeof FORMULAS | "average"> = { 1: "wathan", 2: "mayhew", 3: "wathan", 4: "epley", 5: "epley", 6: "average" };

export const oneRepMaxCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.weight, 100);
  const r = Math.min(30, Math.max(1, whole(values.reps, 5)));
  const est = estimate1rm(w, r);
  const pick = LIFT_FORMULA[whole(values.exercise, 6)] ?? "average";
  const best = pick === "average" ? est.average : est.all[pick];

  return {
    estimated1rm: round2(best),
    averageOfFormulas: round2(est.average),
    epley: round2(est.epley),
    brzycki: round2(est.brzycki),
    load90: round2(best * 0.9),
    load80: round2(best * 0.8),
    load70: round2(best * 0.7),
  };
};

// --- 2. Percentage of 1RM ---------------------------------------------------
export const percentageOf1rmCalculator: CustomCalculator = (values) => {
  const orm = nonNeg(values.oneRepMax, 100);
  const pct = Math.min(120, nonNeg(values.percent, 75)) / 100;
  const inc = nonNeg(values.rounding, 2.5);
  // Reps you could do at that load (inverse of Epley).
  const repsAt = (p: number) => (p >= 1 ? 1 : Math.max(1, Math.floor(30 * (1 / p - 1))));

  return {
    weightAtPercent: toPlates(orm * pct, inc),
    estimatedRepsAtPercent: repsAt(pct),
    load95: toPlates(orm * 0.95, inc),
    load90: toPlates(orm * 0.9, inc),
    load85: toPlates(orm * 0.85, inc),
    load80: toPlates(orm * 0.8, inc),
    load75: toPlates(orm * 0.75, inc),
    load70: toPlates(orm * 0.7, inc),
    load65: toPlates(orm * 0.65, inc),
    load60: toPlates(orm * 0.6, inc),
  };
};

// --- 3. RPE -----------------------------------------------------------------
// RTS / Tuchscherer chart: % of 1RM for 1–12 reps at RPE 10. Lower RPEs are
// read as extra reps in reserve: % = chart[reps + (10 − RPE)].
const RPE10 = [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9, 57.4, 55.1, 52.9, 50.8, 48.9];

function rpePercent(reps: number, rpe: number): number {
  const eff = Math.min(RPE10.length, Math.max(1, reps + (10 - Math.min(10, Math.max(5, rpe)))));
  const lo = Math.floor(eff);
  const hi = Math.min(RPE10.length, lo + 1);
  return (RPE10[lo - 1] + (RPE10[hi - 1] - RPE10[lo - 1]) * (eff - lo)) / 100;
}

export const rpeCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.weight, 100);
  const reps = Math.min(12, Math.max(1, whole(values.reps, 5)));
  const rpe = safeNumber(values.rpe, 8);
  const e1rm = w / rpePercent(reps, rpe);
  const tReps = Math.min(12, Math.max(1, whole(values.targetReps, 3)));
  const tRpe = safeNumber(values.targetRpe, 8);
  const inc = nonNeg(values.rounding, 2.5);

  return {
    targetWeight: toPlates(e1rm * rpePercent(tReps, tRpe), inc),
    estimated1rm: round2(e1rm),
    percentOf1rmDone: round2(rpePercent(reps, rpe) * 100),
    percentOf1rmTarget: round2(rpePercent(tReps, tRpe) * 100),
    repsInReserve: round2(10 - Math.min(10, Math.max(5, rpe))),
  };
};

// --- 4. Reps to Failure -----------------------------------------------------
export const repsToFailureCalculator: CustomCalculator = (values) => {
  const orm = Math.max(0.01, nonNeg(values.oneRepMax, 100));
  const w = Math.min(orm, nonNeg(values.weight, 80));
  const p = w / orm;
  // Inverse Epley and inverse Brzycki, averaged.
  const epley = 30 * (1 / p - 1);
  const brzycki = 37 - 36 * p;
  const maxReps = p >= 1 ? 1 : Math.max(1, (epley + brzycki) / 2);
  const done = whole(values.repsDone, 5);
  const rir = Math.max(0, Math.floor(maxReps) - done);

  return {
    estimatedMaxReps: Math.floor(maxReps),
    percentOf1rm: round2(p * 100),
    repsInReserve: done > 0 ? rir : 0,
    setRpe: done > 0 ? Math.max(5, 10 - rir) : 0,
  };
};

// --- 5. 5/3/1 (Wendler) -----------------------------------------------------
export const fiveThreeOneCalculator: CustomCalculator = (values) => {
  const orm = nonNeg(values.oneRepMax, 100);
  const tmPct = Math.min(100, nonNeg(values.trainingMaxPercent, 90)) / 100;
  const inc = nonNeg(values.rounding, 2.5);
  const tm = orm * tmPct;
  const at = (p: number) => toPlates(tm * p, inc);

  return {
    trainingMax: round2(tm),
    week1Set1: at(0.65),
    week1Set2: at(0.75),
    week1Set3: at(0.85),
    week2Set1: at(0.7),
    week2Set2: at(0.8),
    week2Set3: at(0.9),
    week3Set1: at(0.75),
    week3Set2: at(0.85),
    week3Set3: at(0.95),
    deloadSet1: at(0.4),
    deloadSet2: at(0.5),
    deloadSet3: at(0.6),
  };
};

// --- 6. Starting Strength (novice linear progression) -----------------------
export const startingStrengthCalculator: CustomCalculator = (values) => {
  const lb = whole(values.unit, 1) === 2;
  const weeks = whole(values.weeks, 8);
  const sessions = weeks * 3;
  // Program increments: squat and deadlift every session, bench and press
  // alternate (each trained 1.5× a week).
  const small = lb ? 5 : 2.5;
  const big = lb ? 10 : 5;
  const squatInc = nonNeg(values.squatIncrement, small);
  const pressInc = nonNeg(values.pressIncrement, small);
  const dlInc = nonNeg(values.deadliftIncrement, big);

  return {
    squatAfter: round2(nonNeg(values.squat, 60) + squatInc * sessions),
    benchAfter: round2(nonNeg(values.bench, 50) + pressInc * (sessions / 2)),
    pressAfter: round2(nonNeg(values.press, 35) + pressInc * (sessions / 2)),
    deadliftAfter: round2(nonNeg(values.deadlift, 80) + dlInc * sessions),
    totalSessions: sessions,
  };
};

// --- 7. Progressive Overload ------------------------------------------------
export const progressiveOverloadCalculator: CustomCalculator = (values) => {
  const start = nonNeg(values.currentWeight, 100);
  const weeks = whole(values.weeks, 8);
  const pct = nonNeg(values.weeklyIncreasePercent, 2.5) / 100;
  const fixed = nonNeg(values.weeklyIncreaseFixed, 0);
  const inc = nonNeg(values.rounding, 2.5);
  // A fixed increase, when given, replaces the percentage.
  const at = (w: number) => (fixed > 0 ? start + fixed * w : start * Math.pow(1 + pct, w));
  const end = at(weeks);

  return {
    finalWeight: toPlates(end, inc),
    totalIncrease: round2(end - start),
    totalIncreasePercent: start > 0 ? round2(((end - start) / start) * 100) : 0,
    weightWeek4: toPlates(at(Math.min(4, weeks)), inc),
    weightWeek8: toPlates(at(Math.min(8, weeks)), inc),
    weightWeek12: toPlates(at(Math.min(12, weeks)), inc),
  };
};

// --- 8. Deload --------------------------------------------------------------
export const deloadCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.workingWeight, 100);
  const sets = whole(values.sets, 4);
  const reps = whole(values.reps, 8);
  const method = whole(values.method, 3); // 1 intensity, 2 volume, 3 both
  const inc = nonNeg(values.rounding, 2.5);
  const dw = method === 2 ? w : w * (method === 1 ? 0.6 : 0.8);
  const ds = method === 1 ? sets : Math.max(1, Math.round(sets / 2));
  const dr = method === 3 ? Math.max(1, Math.round(reps * 0.75)) : reps;
  const before = w * sets * reps;
  const after = dw * ds * dr;
  const weeksTrained = whole(values.weeksSinceDeload, 6);

  return {
    deloadWeight: toPlates(dw, inc),
    deloadSets: ds,
    deloadReps: dr,
    volumeReduction: before > 0 ? round2((1 - after / before) * 100) : 0,
    weeksUntilNextDeload: Math.max(0, 6 - weeksTrained),
  };
};

// --- 9. Sets and Reps -------------------------------------------------------
// goal → [rep low, rep high, %1RM low, %1RM high, rest s low, rest s high]
const GOALS: Record<number, number[]> = {
  1: [1, 5, 85, 95, 180, 300], // strength
  2: [6, 12, 67, 85, 60, 120], // hypertrophy
  3: [12, 20, 50, 67, 30, 60], // muscular endurance
  4: [1, 5, 75, 90, 180, 300], // power (explosive, fewer reps than max)
};
// Hard sets per muscle per week by training age.
const WEEKLY_SETS: Record<number, number[]> = { 1: [8, 12], 2: [12, 18], 3: [16, 22] };

export const setsAndRepsCalculator: CustomCalculator = (values) => {
  const g = GOALS[whole(values.goal, 2)] ?? GOALS[2];
  const ws = WEEKLY_SETS[whole(values.experience, 2)] ?? WEEKLY_SETS[2];
  const orm = nonNeg(values.oneRepMax, 100);
  const inc = nonNeg(values.rounding, 2.5);
  const freq = Math.max(1, whole(values.sessionsPerMuscle, 2));

  return {
    repsLow: g[0],
    repsHigh: g[1],
    setsPerSession: Math.round((ws[0] + ws[1]) / 2 / freq),
    weeklySetsLow: ws[0],
    weeklySetsHigh: ws[1],
    weightLow: orm > 0 ? toPlates((orm * g[2]) / 100, inc) : 0,
    weightHigh: orm > 0 ? toPlates((orm * g[3]) / 100, inc) : 0,
    restSecondsLow: g[4],
    restSecondsHigh: g[5],
  };
};

// --- 10. Training Volume (tonnage) ------------------------------------------
// Example session used when fields are blank: [sets, reps, weight].
const TV_DEFAULTS = [[4, 8, 100], [3, 10, 60], [3, 12, 40], [0, 0, 0], [0, 0, 0]];

export const trainingVolumeCalculator: CustomCalculator = (values) => {
  let volume = 0;
  let reps = 0;
  let sets = 0;
  for (let i = 1; i <= 5; i++) {
    const s = whole(values[`sets${i}`], TV_DEFAULTS[i - 1][0]);
    const r = whole(values[`reps${i}`], TV_DEFAULTS[i - 1][1]);
    const w = nonNeg(values[`weight${i}`], TV_DEFAULTS[i - 1][2]);
    if (!s || !r) continue;
    volume += s * r * w;
    reps += s * r;
    sets += s;
  }
  const bw = nonNeg(values.bodyweight, 80);
  const sessions = Math.max(1, whole(values.sessionsPerWeek, 1));

  return {
    totalVolume: round2(volume),
    totalReps: reps,
    totalSets: sets,
    averageWeightPerRep: reps > 0 ? round2(volume / reps) : 0,
    volumePerBodyweight: bw > 0 ? round2(volume / bw) : 0,
    weeklyVolume: round2(volume * sessions),
  };
};

export const sportsStrengthProgrammingCustomCalculators: Record<string, CustomCalculator> = {
  "one-rep-max-calculator": oneRepMaxCalculator,
  "percentage-of-1rm-calculator": percentageOf1rmCalculator,
  "rpe-calculator": rpeCalculator,
  "reps-to-failure-calculator": repsToFailureCalculator,
  "5-3-1-calculator": fiveThreeOneCalculator,
  "starting-strength-calculator": startingStrengthCalculator,
  "progressive-overload-calculator": progressiveOverloadCalculator,
  "deload-calculator": deloadCalculator,
  "sets-and-reps-calculator": setsAndRepsCalculator,
  "training-volume-calculator": trainingVolumeCalculator,
};
