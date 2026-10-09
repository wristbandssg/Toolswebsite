/**
 * Batch: "Sports Calculators" > Running Calculators, sub-batch A (Pace &
 * Race Planning, 9 tools). The 35-tool running list is built across 4
 * sub-batches:
 *   calc-engine-running-pace.ts (9)
 *   calc-engine-running-performance.ts (9)
 *   calc-engine-running-conditions.ts (9)
 *   calc-engine-running-nutrition-gear.ts (8)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - paceCalculator: any two of pace, time and distance → the third, for
 *    preset races (5K, 8K, 10K, 15K, 5 mi, half, marathon, 50K, 100 mi) or
 *    any distance (also miles-to-minutes and running distance).
 *  - splitCalculator: a goal time split into halves and per-km/mile splits,
 *    even or negative split.
 *  - intervalPaceCalculator: rep times for 400 m … mile repeats from a 5K.
 *  - progressionRunCalculator: a run that speeds up segment by segment.
 *  - longRunCalculator: long-run distance from weekly volume and goal race.
 *  - runWalkRunCalculator: finish time with run/walk intervals.
 *  - yasso800Calculator: 800 m repeat time ↔ marathon time.
 *  - raceEquivalencyCalculator: one race → predicted times at other
 *    distances (Riegel).
 *  - vdotCalculator: Jack Daniels' VDOT and training paces.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-running-pace-calculators.ts for the copy.
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
const MILE = 1.609344;

// Preset race distances in km (0 = custom).
const PRESETS: Record<number, number> = { 1: 0, 2: MILE, 3: 5, 4: 8, 5: 10, 6: 15, 7: 5 * MILE, 8: 10 * MILE, 9: 21.0975, 10: 42.195, 11: 50, 12: 100 * MILE };

/** Distance in km from a preset dropdown, or a custom distance in km/mi. */
function distanceKm(values: Record<string, number>, defPreset = 3) {
  const preset = PRESETS[whole(values.race, defPreset)] ?? 5;
  if (preset > 0) return preset;
  const d = nonNeg(values.customDistance, 5);
  return whole(values.distanceUnit, 1) === 2 ? d * MILE : d;
}

const hmsSeconds = (v: Record<string, number>, p: string, dh = 0, dm = 25, ds = 0) => nonNeg(v[`${p}Hours`], dh) * 3600 + nonNeg(v[`${p}Minutes`], dm) * 60 + nonNeg(v[`${p}Seconds`], ds);
const msSeconds = (v: Record<string, number>, p: string, dm: number, ds: number) => nonNeg(v[`${p}Min`], dm) * 60 + nonNeg(v[`${p}Sec`], ds);

/** Splits seconds into result lines with a key prefix. */
function hms(prefix: string, sec: number) {
  const t = Math.round(Math.max(0, sec));
  return { [`${prefix}Hours`]: Math.floor(t / 3600), [`${prefix}Minutes`]: Math.floor((t % 3600) / 60), [`${prefix}Seconds`]: t % 60 };
}
function ms(prefix: string, sec: number) {
  const t = Math.round(Math.max(0, sec));
  return { [`${prefix}Min`]: Math.floor(t / 60), [`${prefix}Sec`]: t % 60 };
}

// --- 1. Pace ----------------------------------------------------------------
export const paceCalculator: CustomCalculator = (values) => {
  const mode = whole(values.solveFor, 1); // 1 pace, 2 finish time, 3 distance
  const perMile = whole(values.paceUnit, 1) === 2;
  const unitKm = perMile ? MILE : 1;
  let km = distanceKm(values);
  let time = hmsSeconds(values, "time");
  let pacePerKm = msSeconds(values, "pace", 5, 0) / unitKm;
  if (mode === 1) pacePerKm = km > 0 ? time / km : 0;
  else if (mode === 2) time = pacePerKm * km;
  else km = pacePerKm > 0 ? time / pacePerKm : 0;

  return {
    ...ms("pacePerKm", pacePerKm),
    ...ms("pacePerMile", pacePerKm * MILE),
    ...hms("finish", time),
    distanceKm: round2(km),
    distanceMiles: round2(km / MILE),
    speedKmh: pacePerKm > 0 ? round2(3600 / pacePerKm) : 0,
    speedMph: pacePerKm > 0 ? round2(3600 / (pacePerKm * MILE)) : 0,
  };
};

// --- 2. Split ---------------------------------------------------------------
export const splitCalculator: CustomCalculator = (values) => {
  const km = distanceKm(values, 10);
  const total = hmsSeconds(values, "goal", 3, 30, 0);
  // Negative split: the second half is this % faster than the first.
  const neg = Math.min(20, safeNumber(values.negativeSplitPercent, 2)) / 100;
  const first = total / (2 - neg);
  const second = total - first;
  const halfKm = km / 2;
  const perMile = whole(values.splitUnit, 1) === 2;
  const u = perMile ? MILE : 1;

  return {
    ...hms("firstHalf", first),
    ...hms("secondHalf", second),
    ...ms("evenSplit", (total / km) * u),
    ...ms("firstHalfSplit", (first / halfKm) * u),
    ...ms("secondHalfSplit", (second / halfKm) * u),
    differenceSeconds: Math.round(first - second),
  };
};

// --- 3. Interval Pace -------------------------------------------------------
export const intervalPaceCalculator: CustomCalculator = (values) => {
  const t5k = hmsSeconds(values, "fiveK", 0, 25, 0);
  // Riegel from the 5K to mile and 3K race pace (seconds per metre).
  const riegel = (d: number) => t5k * Math.pow(d / 5000, 1.06);
  const milePace = riegel(1609.344) / 1609.344;
  const threeKPace = riegel(3000) / 3000;
  const fiveKPace = t5k / 5000;

  return {
    ...ms("rep400", milePace * 400),
    ...ms("rep800", threeKPace * 800),
    ...ms("rep1000", fiveKPace * 1000),
    ...ms("rep1600", fiveKPace * 1600),
    ...ms("recovery400", milePace * 400 * 0.75),
  };
};

// --- 4. Progression Run -----------------------------------------------------
export const progressionRunCalculator: CustomCalculator = (values) => {
  const dist = nonNeg(values.distance, 10);
  const segs = Math.max(2, whole(values.segments, 4));
  const start = msSeconds(values, "startPace", 6, 0);
  const finish = msSeconds(values, "finishPace", 5, 0);
  const step = (start - finish) / (segs - 1);
  const segDist = dist / segs;
  let total = 0;
  for (let i = 0; i < segs; i++) total += (start - step * i) * segDist;

  return {
    ...hms("total", total),
    ...ms("averagePace", dist > 0 ? total / dist : 0),
    stepSeconds: round2(step),
    segmentDistance: round2(segDist),
    ...ms("segment2Pace", start - step),
    ...ms("segment3Pace", start - step * 2),
  };
};

// --- 5. Long Run ------------------------------------------------------------
// Long-run share of weekly volume and cap by goal race (km).
const LONG: Record<number, { share: number[]; cap: number }> = {
  1: { share: [0.25, 0.3], cap: 12 }, // 5K
  2: { share: [0.25, 0.3], cap: 18 }, // 10K
  3: { share: [0.25, 0.33], cap: 24 }, // half
  4: { share: [0.28, 0.35], cap: 35 }, // marathon
  5: { share: [0.3, 0.4], cap: 50 }, // ultra
};

export const longRunCalculator: CustomCalculator = (values) => {
  const weekly = nonNeg(values.weeklyDistance, 40);
  const g = LONG[whole(values.goalRace, 4)] ?? LONG[4];
  // Caps are in km; convert when the user works in miles.
  const cap = whole(values.unit, 1) === 2 ? g.cap / MILE : g.cap;
  const lo = Math.min(cap, weekly * g.share[0]);
  const hi = Math.min(cap, weekly * g.share[1]);
  const easy = msSeconds(values, "easyPace", 6, 15);

  return {
    longRunLow: round2(lo),
    longRunHigh: round2(hi),
    maxLongRun: round2(cap),
    ...hms("timeOnFeet", ((lo + hi) / 2) * easy),
    shareOfWeek: weekly > 0 ? round2((((lo + hi) / 2) / weekly) * 100) : 0,
  };
};

// --- 6. Run Walk Run --------------------------------------------------------
export const runWalkRunCalculator: CustomCalculator = (values) => {
  const km = distanceKm(values, 9);
  const runS = Math.max(1, nonNeg(values.runSeconds, 240));
  const walkS = nonNeg(values.walkSeconds, 60);
  const runPace = msSeconds(values, "runPace", 6, 0); // per km or mile
  const walkPace = msSeconds(values, "walkPace", 10, 0);
  const u = whole(values.paceUnit, 1) === 2 ? MILE : 1;
  // Distance covered in one run+walk cycle (km).
  const cycleKm = runS / (runPace / u) + walkS / (walkPace / u);
  const cycleT = runS + walkS;
  const total = (km / cycleKm) * cycleT;

  return {
    ...hms("finish", total),
    ...ms("averagePace", (total / km) * u),
    cycles: round2(km / cycleKm),
    walkShare: round2((walkS / cycleT) * 100),
  };
};

// --- 7. Yasso 800 -----------------------------------------------------------
export const yasso800Calculator: CustomCalculator = (values) => {
  const rep = msSeconds(values, "rep", 3, 30);
  // Bart Yasso: an 800 m time of M:SS ≈ a marathon of M hours SS minutes.
  const marathonSec = (rep / 60) * 3600;
  const goal = nonNeg(values.goalHours, 3) * 3600 + nonNeg(values.goalMinutes, 30) * 60;

  return {
    ...hms("marathon", marathonSec),
    ...ms("targetRep", goal / 60),
    ...ms("marathonPacePerKm", marathonSec / 42.195),
    recommendedReps: 10,
  };
};

// --- 8. Race Equivalency (Riegel) -------------------------------------------
export const raceEquivalencyCalculator: CustomCalculator = (values) => {
  const km = distanceKm(values, 3);
  const t = hmsSeconds(values, "time", 0, 25, 0);
  const exp = Math.min(1.2, Math.max(1, safeNumber(values.exponent, 1.06)));
  const at = (d: number) => (km > 0 ? t * Math.pow(d / km, exp) : 0);
  const target = PRESETS[whole(values.targetRace, 10)] || nonNeg(values.targetCustomKm, 42.195);

  return {
    ...hms("target", at(target)),
    ...hms("fiveK", at(5)),
    ...hms("tenK", at(10)),
    ...hms("half", at(21.0975)),
    ...hms("marathon", at(42.195)),
  };
};

// --- 9. VDOT (Jack Daniels) -------------------------------------------------
const vo2At = (v: number) => -4.6 + 0.182258 * v + 0.000104 * v * v; // v in m/min
const pctMax = (tMin: number) => 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
/** Velocity (m/min) that costs a given VO2. */
const velocityFor = (vo2: number) => (-0.182258 + Math.sqrt(0.182258 ** 2 + 4 * 0.000104 * (vo2 + 4.6))) / (2 * 0.000104);

export const vdotCalculator: CustomCalculator = (values) => {
  const m = distanceKm(values, 3) * 1000;
  const t = hmsSeconds(values, "time", 0, 25, 0) / 60;
  const vdot = t > 0 ? vo2At(m / t) / pctMax(t) : 0;
  const u = whole(values.paceUnit, 1) === 2 ? 1609.344 : 1000;
  const pace = (share: number) => (vdot > 0 ? (u / velocityFor(vdot * share)) * 60 : 0);

  return {
    vdot: round2(vdot),
    ...ms("easyPace", pace(0.7)),
    ...ms("marathonPace", pace(0.81)),
    ...ms("thresholdPace", pace(0.88)),
    ...ms("intervalPace", pace(0.975)),
    rep400Seconds: vdot > 0 ? Math.round((400 / velocityFor(vdot * 1.04)) * 60) : 0,
  };
};

export const runningPaceCustomCalculators: Record<string, CustomCalculator> = {
  "pace-calculator": paceCalculator,
  "split-calculator": splitCalculator,
  "interval-pace-calculator": intervalPaceCalculator,
  "progression-run-calculator": progressionRunCalculator,
  "long-run-calculator": longRunCalculator,
  "run-walk-run-calculator": runWalkRunCalculator,
  "yasso-800-calculator": yasso800Calculator,
  "race-equivalency-calculator": raceEquivalencyCalculator,
  "vdot-calculator": vdotCalculator,
};
