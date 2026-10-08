/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch G
 * (Military & Occupational Fitness Tests, 8 tools). See
 * calc-engine-sports-strength-programming.ts for the full list.
 *
 * Each service scores events against tables by age and sex. These tools
 * use the official minimum and maximum standards for every age group and
 * sex (sources noted per test) and interpolate points linearly between
 * them — exact at the pass line and the maximum, and an estimate in
 * between (real tables move in uneven steps).
 *
 *  - armyAcftCalculator: the Army Fitness Test (AFT), which replaced the
 *    ACFT on 1 June 2025 — 5 events, general (age/sex) or combat standard.
 *  - armyApftCalculator: the legacy APFT (push-ups, sit-ups, 2-mile run).
 *  - navyPrtCalculator: push-ups, forearm plank, 1.5-mile run.
 *  - airForcePtTestCalculator: the 2026 PFRA — 2-mile run, push-ups,
 *    sit-ups or plank, waist-to-height ratio.
 *  - marinePftCalculator: pull-ups or push-ups, plank, 3-mile run.
 *  - policeFitnessTestCalculator: Cooper Institute 30th-percentile
 *    standards used by many police academies.
 *  - firefighterCpatCalculator: the CPAT's 10:20 total-time limit.
 *  - presidentialFitnessTestCalculator: the classic Presidential Physical
 *    Fitness Award (85th percentile) for ages 6–17.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-military-tests-calculators.ts for the copy.
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
const isFemale = (v: number) => whole(v, 1) === 2;
/** "m:ss" anchors written as seconds. */
const s = (m: number, sec: number) => m * 60 + sec;
const timeOf = (values: Record<string, number>, key: string, dm: number, ds: number) => nonNeg(values[`${key}Min`], dm) * 60 + nonNeg(values[`${key}Sec`], ds);

/**
 * Points for a raw score between two anchors (minRaw → minPts, maxRaw →
 * maxPts), capped at maxPts and floored at 0. Works for "lower is better"
 * events too (maxRaw < minRaw).
 */
function points(raw: number, minRaw: number, maxRaw: number, minPts: number, maxPts: number): number {
  if (maxRaw === minRaw) return raw >= maxRaw ? maxPts : 0;
  const p = minPts + ((raw - minRaw) / (maxRaw - minRaw)) * (maxPts - minPts);
  return Math.max(0, Math.min(maxPts, p));
}

// --- 1. Army ACFT / AFT -----------------------------------------------------
// AFT general standard (effective 1 June 2025): per age group, per sex:
// [MDL60, MDL100 (lb), HRP60, HRP100, SDC60, SDC100 (s), PLK60, PLK100 (s), 2MR60, 2MR100 (s)].
const AFT_AGES = [21, 26, 31, 36, 41, 46, 51, 56, 61, Infinity];
const AFT: Record<"M" | "F", number[][]> = {
  M: [
    [150, 340, 15, 58, s(2, 28), s(1, 29), s(1, 30), s(3, 40), s(19, 57), s(13, 22)],
    [150, 350, 14, 61, s(2, 31), s(1, 30), s(1, 25), s(3, 35), s(19, 45), s(13, 25)],
    [150, 350, 14, 62, s(2, 32), s(1, 30), s(1, 20), s(3, 30), s(19, 45), s(13, 25)],
    [140, 350, 13, 60, s(2, 36), s(1, 33), s(1, 15), s(3, 25), s(20, 44), s(13, 42)],
    [140, 350, 12, 59, s(2, 41), s(1, 36), s(1, 10), s(3, 20), s(20, 44), s(13, 42)],
    [140, 350, 11, 57, s(2, 45), s(1, 40), s(1, 10), s(3, 20), s(22, 4), s(14, 5)],
    [140, 340, 11, 55, s(2, 53), s(1, 45), s(1, 10), s(3, 20), s(22, 4), s(14, 30)],
    [140, 330, 10, 51, s(3, 0), s(1, 52), s(1, 10), s(3, 20), s(22, 50), s(15, 9)],
    [140, 250, 10, 46, s(3, 12), s(1, 58), s(1, 10), s(3, 20), s(23, 36), s(15, 28)],
    [140, 230, 10, 43, s(3, 16), s(2, 9), s(1, 10), s(3, 20), s(23, 36), s(15, 28)],
  ],
  F: [
    [120, 220, 11, 53, s(3, 15), s(1, 55), s(1, 30), s(3, 40), s(22, 55), s(16, 0)],
    [120, 230, 11, 50, s(3, 15), s(1, 55), s(1, 25), s(3, 35), s(22, 45), s(15, 30)],
    [120, 240, 11, 48, s(3, 15), s(1, 55), s(1, 20), s(3, 30), s(22, 45), s(15, 30)],
    [120, 230, 11, 47, s(3, 22), s(1, 59), s(1, 15), s(3, 25), s(22, 50), s(15, 48)],
    [120, 220, 10, 43, s(3, 27), s(2, 2), s(1, 10), s(3, 20), s(22, 59), s(15, 51)],
    [120, 210, 10, 40, s(3, 42), s(2, 9), s(1, 10), s(3, 20), s(23, 15), s(16, 0)],
    [120, 200, 10, 38, s(3, 51), s(2, 11), s(1, 10), s(3, 20), s(23, 30), s(16, 30)],
    [120, 190, 10, 36, s(4, 3), s(2, 18), s(1, 10), s(3, 20), s(24, 0), s(16, 59)],
    [120, 170, 10, 24, s(4, 48), s(2, 26), s(1, 10), s(3, 20), s(24, 48), s(17, 18)],
    [120, 170, 10, 24, s(4, 48), s(2, 26), s(1, 10), s(3, 20), s(25, 0), s(17, 18)],
  ],
};

export const armyAcftCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.age, 22);
  const band = AFT_AGES.findIndex((a) => age <= a);
  const combat = whole(values.standard, 1) === 2;
  // The combat standard uses the male column for everyone and needs 350.
  const t = (combat || !isFemale(values.sex) ? AFT.M : AFT.F)[band];
  const mdl = points(nonNeg(values.deadlift, 250), t[0], t[1], 60, 100);
  const hrp = points(nonNeg(values.pushUps, 30), t[2], t[3], 60, 100);
  const sdc = points(timeOf(values, "sdc", 2, 0), t[4], t[5], 60, 100);
  const plk = points(timeOf(values, "plank", 2, 30), t[6], t[7], 60, 100);
  const run = points(timeOf(values, "run", 17, 0), t[8], t[9], 60, 100);
  const total = mdl + hrp + sdc + plk + run;
  const minEach = Math.min(mdl, hrp, sdc, plk, run);

  return {
    totalScore: Math.round(total),
    passes: minEach >= 60 && total >= (combat ? 350 : 300) ? 1 : 0,
    deadliftPoints: Math.round(mdl),
    pushUpPoints: Math.round(hrp),
    sprintDragCarryPoints: Math.round(sdc),
    plankPoints: Math.round(plk),
    runPoints: Math.round(run),
  };
};

// --- 2. Army APFT (legacy) --------------------------------------------------
// FM 7-22: [push-ups 60, 100, sit-ups 60, 100, run 60, run 100 (s)].
const APFT_AGES = [21, 26, 31, 36, 41, 46, 51, 56, 61, Infinity];
const APFT_SITUPS = [[53, 78], [50, 80], [45, 82], [42, 76], [38, 76], [32, 72], [30, 66], [28, 66], [27, 64], [26, 63]];
const APFT_PUSH = {
  M: [[42, 71], [40, 75], [39, 77], [36, 75], [34, 73], [30, 66], [25, 59], [20, 56], [18, 53], [16, 53]],
  F: [[19, 42], [17, 46], [17, 50], [15, 45], [13, 40], [12, 37], [10, 34], [9, 31], [8, 28], [7, 26]],
};
const APFT_RUN = {
  M: [[s(15, 54), s(13, 0)], [s(16, 36), s(13, 0)], [s(17, 0), s(13, 18)], [s(17, 42), s(13, 18)], [s(18, 18), s(13, 36)], [s(18, 42), s(14, 6)], [s(19, 30), s(14, 24)], [s(19, 48), s(14, 42)], [s(19, 54), s(15, 18)], [s(20, 0), s(15, 42)]],
  F: [[s(18, 54), s(15, 36)], [s(19, 36), s(15, 36)], [s(20, 30), s(15, 48)], [s(21, 42), s(15, 54)], [s(22, 42), s(17, 0)], [s(23, 42), s(17, 24)], [s(24, 0), s(17, 36)], [s(24, 24), s(19, 0)], [s(24, 52), s(19, 42)], [s(25, 0), s(20, 0)]],
};

export const armyApftCalculator: CustomCalculator = (values) => {
  const band = APFT_AGES.findIndex((a) => nonNeg(values.age, 22) <= a);
  const f = isFemale(values.sex);
  const pu = (f ? APFT_PUSH.F : APFT_PUSH.M)[band];
  const su = APFT_SITUPS[band];
  const rn = (f ? APFT_RUN.F : APFT_RUN.M)[band];
  const p = points(nonNeg(values.pushUps, 50), pu[0], pu[1], 60, 100);
  const si = points(nonNeg(values.sitUps, 60), su[0], su[1], 60, 100);
  const r = points(timeOf(values, "run", 15, 0), rn[0], rn[1], 60, 100);
  const total = p + si + r;

  return {
    totalScore: Math.round(total),
    passes: Math.min(p, si, r) >= 60 && total >= 180 ? 1 : 0,
    pushUpPoints: Math.round(p),
    sitUpPoints: Math.round(si),
    runPoints: Math.round(r),
  };
};

// --- 3. Navy PRT ------------------------------------------------------------
// Probationary (45 pts) and maximum (100 pts): [push-ups, plank s, run s].
const NAVY_AGES = [19, 24, 29, 34, 39, 44, 49, 54, 59, 64, Infinity];
const NAVY = {
  M: [
    [42, 92, s(1, 11), s(3, 24), s(12, 45), s(8, 15)],
    [37, 87, s(1, 10), s(3, 20), s(13, 30), s(8, 30)],
    [34, 84, s(1, 9), s(3, 16), s(14, 0), s(8, 55)],
    [31, 80, s(1, 7), s(3, 12), s(14, 30), s(9, 20)],
    [27, 76, s(1, 6), s(3, 8), s(15, 0), s(9, 25)],
    [24, 72, s(1, 5), s(3, 4), s(15, 30), s(9, 30)],
    [21, 68, s(1, 3), s(3, 1), s(16, 8), s(9, 33)],
    [19, 64, s(1, 2), s(2, 57), s(16, 45), s(9, 35)],
    [10, 60, s(1, 1), s(2, 54), s(17, 9), s(10, 42)],
    [8, 57, s(1, 0), s(2, 50), s(18, 52), s(11, 21)],
    [4, 48, s(0, 58), s(2, 47), s(20, 35), s(11, 41)],
  ],
  F: [
    [19, 51, s(1, 1), s(3, 14), s(15, 0), s(9, 29)],
    [16, 48, s(1, 0), s(3, 10), s(15, 30), s(9, 47)],
    [13, 46, s(0, 59), s(3, 6), s(16, 8), s(10, 17)],
    [11, 44, s(0, 58), s(3, 2), s(16, 45), s(10, 46)],
    [9, 43, s(0, 56), s(2, 59), s(17, 0), s(10, 51)],
    [7, 41, s(0, 55), s(2, 55), s(17, 15), s(10, 56)],
    [5, 40, s(0, 54), s(2, 52), s(17, 23), s(10, 58)],
    [2, 38, s(0, 53), s(2, 48), s(17, 30), s(11, 0)],
    [2, 30, s(0, 52), s(2, 45), s(18, 34), s(12, 23)],
    [2, 26, s(0, 51), s(2, 42), s(19, 43), s(13, 34)],
    [1, 22, s(0, 50), s(2, 38), s(20, 52), s(14, 45)],
  ],
};

export const navyPrtCalculator: CustomCalculator = (values) => {
  const band = NAVY_AGES.findIndex((a) => nonNeg(values.age, 22) <= a);
  const t = (isFemale(values.sex) ? NAVY.F : NAVY.M)[band];
  const pu = points(nonNeg(values.pushUps, 50), t[0], t[1], 45, 100);
  const pl = points(timeOf(values, "plank", 2, 0), t[2], t[3], 45, 100);
  const rn = points(timeOf(values, "run", 12, 0), t[4], t[5], 45, 100);
  const avg = (pu + pl + rn) / 3;

  return {
    overallScore: round2(avg),
    passes: Math.min(pu, pl, rn) >= 45 ? 1 : 0,
    pushUpPoints: Math.round(pu),
    plankPoints: Math.round(pl),
    runPoints: Math.round(rn),
  };
};

// --- 4. Air Force PT (2026 PFRA) --------------------------------------------
// Per age band (<25, 25–29 … 55–59, 60+), per sex:
// [run 50-pt, run 35-pt (s), push-ups 15-pt, 2.5-pt, sit-ups 15-pt, 2.5-pt, plank 15-pt, 2.5-pt (s)].
const AF_AGES = [24, 29, 34, 39, 44, 49, 54, 59, Infinity];
const AF = {
  M: [
    [s(13, 25), s(19, 45), 67, 30, 58, 33, s(3, 40), s(1, 35)],
    [s(13, 35), s(19, 55), 63, 28, 56, 31, s(3, 35), s(1, 30)],
    [s(13, 42), s(20, 44), 60, 26, 54, 29, s(3, 30), s(1, 25)],
    [s(13, 56), s(21, 16), 56, 23, 52, 27, s(3, 25), s(1, 20)],
    [s(14, 5), s(22, 4), 52, 21, 50, 25, s(3, 20), s(1, 15)],
    [s(14, 30), s(22, 27), 49, 19, 48, 23, s(3, 15), s(1, 10)],
    [s(15, 9), s(22, 50), 45, 17, 46, 21, s(3, 10), s(1, 5)],
    [s(15, 28), s(23, 36), 42, 14, 44, 19, s(3, 5), s(1, 0)],
    [s(16, 58), s(24, 0), 38, 12, 42, 17, s(3, 0), s(0, 55)],
  ],
  F: [
    [s(15, 30), s(25, 23), 50, 15, 54, 29, s(3, 35), s(1, 30)],
    [s(15, 55), s(25, 40), 47, 14, 50, 25, s(3, 30), s(1, 25)],
    [s(16, 10), s(26, 15), 44, 12, 45, 20, s(3, 25), s(1, 20)],
    [s(16, 12), s(26, 30), 42, 11, 43, 18, s(3, 20), s(1, 15)],
    [s(16, 45), s(26, 52), 39, 10, 41, 16, s(3, 15), s(1, 10)],
    [s(16, 55), s(27, 15), 36, 8, 35, 10, s(3, 10), s(1, 5)],
    [s(17, 10), s(28, 5), 34, 7, 34, 9, s(3, 5), s(1, 0)],
    [s(17, 43), s(28, 40), 31, 5, 32, 7, s(3, 0), s(0, 55)],
    [s(18, 20), s(29, 40), 28, 3, 31, 6, s(2, 55), s(0, 50)],
  ],
};

/** Waist-to-height points (20 max, no minimum). */
function whtrPoints(r: number): number {
  if (r <= 0) return 0;
  if (r < 0.5) return 20;
  const steps: [number, number][] = [[0.5, 19], [0.51, 18], [0.52, 17], [0.53, 16], [0.54, 15], [0.55, 12.5], [0.56, 10], [0.57, 7.5], [0.58, 5], [0.59, 2.5]];
  const r2 = Math.round(r * 100) / 100;
  return steps.find(([v]) => r2 <= v)?.[1] ?? 0;
}

export const airForcePtTestCalculator: CustomCalculator = (values) => {
  const band = AF_AGES.findIndex((a) => nonNeg(values.age, 22) <= a);
  const t = (isFemale(values.sex) ? AF.F : AF.M)[band];
  const run = points(timeOf(values, "run", 16, 0), t[1], t[0], 35, 50);
  const push = points(nonNeg(values.pushUps, 40), t[3], t[2], 2.5, 15);
  const plankChosen = whole(values.coreEvent, 1) === 2;
  const core = plankChosen ? points(timeOf(values, "plank", 2, 30), t[7], t[6], 2.5, 15) : points(nonNeg(values.sitUps, 45), t[5], t[4], 2.5, 15);
  const waist = nonNeg(values.waist, 32);
  const height = nonNeg(values.height, 70);
  const wh = height > 0 && waist > 0 ? whtrPoints(waist / height) : 0;
  const total = run + push + core + wh;

  return {
    compositeScore: round2(total),
    passes: total >= 75 && run >= 35 && push >= 2.5 && core >= 2.5 ? 1 : 0,
    runPoints: round2(run),
    pushUpPoints: round2(push),
    corePoints: round2(core),
    waistToHeightPoints: wh,
    waistToHeightRatio: height > 0 ? round2(waist / height) : 0,
  };
};

// --- 5. Marine PFT ----------------------------------------------------------
// Per age (17–20, 21–25 … 46–50, 51+), per sex:
// [pull-ups min, max, push-ups min, max, run min (slowest passing), run max (s)].
const USMC_AGES = [20, 25, 30, 35, 40, 45, 50, Infinity];
const USMC = {
  M: [[4, 20, 42, 82, s(27, 40), s(18, 0)], [5, 23, 40, 87, s(27, 40), s(18, 0)], [5, 23, 39, 84, s(28, 0), s(18, 0)], [5, 23, 36, 80, s(28, 20), s(18, 0)], [5, 21, 34, 76, s(28, 40), s(18, 0)], [5, 20, 30, 72, s(29, 20), s(18, 30)], [4, 19, 25, 68, s(30, 0), s(19, 0)], [3, 18, 20, 64, s(33, 0), s(19, 30)]],
  F: [[1, 7, 19, 42, s(30, 50), s(21, 0)], [3, 11, 18, 48, s(30, 50), s(21, 0)], [4, 12, 18, 50, s(31, 10), s(21, 0)], [3, 11, 16, 46, s(31, 30), s(21, 0)], [3, 10, 14, 43, s(31, 50), s(21, 0)], [2, 8, 12, 41, s(32, 30), s(21, 30)], [2, 6, 11, 40, s(33, 30), s(22, 0)], [2, 4, 10, 38, s(36, 0), s(22, 30)]],
};

export const marinePftCalculator: CustomCalculator = (values) => {
  const band = USMC_AGES.findIndex((a) => nonNeg(values.age, 22) <= a);
  const f = isFemale(values.sex);
  const t = (f ? USMC.F : USMC.M)[band];
  const usePushUps = whole(values.upperBodyEvent, 1) === 2;
  // Pull-ups score up to 100 (women's minimum is worth 60); push-ups top out at 70.
  const upper = usePushUps ? points(nonNeg(values.reps, 50), t[2], t[3], 40, 70) : points(nonNeg(values.reps, 12), t[0], t[1], f ? 60 : 40, 100);
  const plank = points(timeOf(values, "plank", 2, 30), s(1, 10), s(3, 45), 40, 100);
  const run = points(timeOf(values, "run", 22, 0), t[4], t[5], 40, 100);
  const total = upper + plank + run;
  const passEach = upper >= (usePushUps || !f ? 40 : 60) && plank >= 40 && run >= 40;

  return {
    totalScore: Math.round(total),
    // 1 first class (235+), 2 second (200+), 3 third (150+), 0 fail.
    pftClass: !passEach ? 0 : total >= 235 ? 1 : total >= 200 ? 2 : total >= 150 ? 3 : 0,
    upperBodyPoints: Math.round(upper),
    plankPoints: Math.round(plank),
    runPoints: Math.round(run),
  };
};

// --- 6. Police Fitness Test (Cooper 30th percentile) ------------------------
// Ages 20–29, 30–39, 40–49, 50+: [sit-ups, push-ups, 1.5-mile run (s)].
const POLICE = {
  M: [[35, 26, s(13, 16)], [32, 20, s(13, 46)], [27, 15, s(14, 34)], [21, 10, s(15, 58)]],
  F: [[30, 13, s(15, 52)], [22, 9, s(16, 38)], [17, 7, s(17, 22)], [12, 9, s(18, 59)]],
};

export const policeFitnessTestCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.age, 25);
  const t = (isFemale(values.sex) ? POLICE.F : POLICE.M)[age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : 3];
  const su = nonNeg(values.sitUps, 35);
  const pu = nonNeg(values.pushUps, 30);
  const run = timeOf(values, "run", 13, 0);
  const passed = [su >= t[0], pu >= t[1], run <= t[2]];

  return {
    eventsPassed: passed.filter(Boolean).length,
    passes: passed.every(Boolean) ? 1 : 0,
    sitUpsRequired: t[0],
    pushUpsRequired: t[1],
    runSecondsRequired: t[2],
    runSecondsMargin: t[2] - run,
  };
};

// --- 7. Firefighter CPAT ----------------------------------------------------
export const firefighterCpatCalculator: CustomCalculator = (values) => {
  const keys = ["stairClimb", "hoseDrag", "equipmentCarry", "ladderRaise", "forcibleEntry", "search", "rescueDrag", "ceilingBreach"];
  const defaults = [180, 60, 50, 50, 40, 70, 45, 70];
  const total = keys.reduce((sum, k, i) => sum + nonNeg(values[k], defaults[i]), 0) + nonNeg(values.transitions, 50);
  const limit = 620; // 10 minutes 20 seconds

  return {
    totalSeconds: Math.round(total),
    totalMinutes: Math.floor(total / 60),
    totalRemainderSeconds: Math.round(total % 60),
    passes: total <= limit ? 1 : 0,
    secondsUnderLimit: Math.round(limit - total),
  };
};

// --- 8. Presidential Fitness Test -------------------------------------------
// Presidential Physical Fitness Award (85th percentile), ages 6–17:
// [curl-ups, shuttle run s, V-sit reach in, 1-mile run s, pull-ups, push-ups].
const PRES = {
  M: [
    [33, 12.1, 3.5, s(10, 15), 2, 9], [36, 11.5, 3.5, s(9, 22), 4, 14], [40, 11.1, 3, s(8, 48), 5, 17], [41, 10.9, 3, s(8, 31), 5, 18],
    [45, 10.3, 4, s(7, 57), 6, 22], [47, 10, 4, s(7, 32), 6, 27], [50, 9.8, 4, s(7, 11), 7, 31], [53, 9.5, 3.5, s(6, 50), 7, 39],
    [56, 9.1, 4.5, s(6, 26), 10, 40], [57, 9, 5, s(6, 20), 11, 42], [56, 8.7, 6, s(6, 8), 11, 44], [55, 8.7, 7, s(6, 6), 13, 53],
  ],
  F: [
    [32, 12.4, 5.5, s(11, 20), 2, 9], [34, 12.1, 5, s(10, 36), 2, 14], [38, 11.8, 4.5, s(10, 2), 2, 17], [39, 11.1, 5.5, s(9, 30), 2, 18],
    [40, 10.8, 6, s(9, 19), 3, 20], [42, 10.5, 6.5, s(9, 2), 3, 19], [45, 10.4, 7, s(8, 23), 2, 20], [46, 10.2, 7, s(8, 13), 2, 21],
    [47, 10.1, 8, s(7, 59), 2, 20], [48, 10, 8, s(8, 8), 2, 20], [45, 10.1, 9, s(8, 23), 1, 24], [44, 10, 8, s(8, 15), 1, 25],
  ],
};

export const presidentialFitnessTestCalculator: CustomCalculator = (values) => {
  const age = Math.min(17, Math.max(6, whole(values.age, 12)));
  const t = (isFemale(values.sex) ? PRES.F : PRES.M)[age - 6];
  const usePushUps = whole(values.upperBodyEvent, 1) === 2;
  const met = [
    nonNeg(values.curlUps, 52) >= t[0],
    nonNeg(values.shuttleRun, 9.6) <= t[1],
    safeNumber(values.vSitReach, 4.5) >= t[2],
    timeOf(values, "mile", 7, 5) <= t[3],
    usePushUps ? nonNeg(values.upperBodyReps, 15) >= t[5] : nonNeg(values.upperBodyReps, 8) >= t[4],
  ];

  return {
    eventsMet: met.filter(Boolean).length,
    presidentialAward: met.every(Boolean) ? 1 : 0,
    curlUpsNeeded: t[0],
    shuttleRunNeeded: t[1],
    vSitNeeded: t[2],
    mileSecondsNeeded: t[3],
    upperBodyNeeded: usePushUps ? t[5] : t[4],
  };
};

export const sportsMilitaryTestsCustomCalculators: Record<string, CustomCalculator> = {
  "army-acft-calculator": armyAcftCalculator,
  "army-apft-calculator": armyApftCalculator,
  "navy-prt-calculator": navyPrtCalculator,
  "air-force-pt-test-calculator": airForcePtTestCalculator,
  "marine-pft-calculator": marinePftCalculator,
  "police-fitness-test-calculator": policeFitnessTestCalculator,
  "firefighter-cpat-calculator": firefighterCpatCalculator,
  "presidential-fitness-test-calculator": presidentialFitnessTestCalculator,
};
