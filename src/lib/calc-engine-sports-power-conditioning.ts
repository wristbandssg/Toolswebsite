/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch H
 * (Power & Conditioning, 12 tools). See
 * calc-engine-sports-strength-programming.ts for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - wingateTestCalculator: 30-second cycle sprint — peak, mean and minimum
 *    power → relative power, fatigue index, work (also peak power output).
 *  - anaerobicPowerCalculator: power from a vertical jump by the Lewis and
 *    Harman formulas.
 *  - sayersJumpPowerCalculator: Sayers peak power from a countermovement or
 *    squat jump.
 *  - margariaKalamenCalculator: stair-sprint power test.
 *  - hiitIntervalCalculator: any work/rest interval session — time, ratio,
 *    calories.
 *  - tabataCalculator: the fixed 20 s on / 10 s off × 8 protocol, in blocks.
 *  - emomCalculator: every-minute-on-the-minute reps, volume and rest.
 *  - amrapScoreCalculator / crossfitOpenScoreCalculator / murphTimeCalculator:
 *    CrossFit-style scoring and pacing.
 *  - hyroxTimeCalculator: your run pace + station times → finish time.
 *  - hyroxPaceCalculator: a TARGET finish time → the run pace and station
 *    times you need.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-power-conditioning-calculators.ts for the copy.
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
const LB = 0.45359237;
const kgOf = (values: Record<string, number>, key: string, d: number) => nonNeg(values[key], d) * (whole(values.unit, 1) === 2 ? LB : 1);
const cmOf = (values: Record<string, number>, key: string, d: number) => nonNeg(values[key], d) * (whole(values.unit, 1) === 2 ? 2.54 : 1);
/** kcal for a MET over minutes at a bodyweight (kg). */
const kcal = (met: number, kg: number, minutes: number) => ((met * 3.5 * kg) / 200) * minutes;
/** Splits seconds into h, m, s result lines. */
const hms = (sec: number) => ({ hours: Math.floor(sec / 3600), minutes: Math.floor((sec % 3600) / 60), seconds: Math.round(sec % 60) });

// --- 1. Wingate Test --------------------------------------------------------
export const wingateTestCalculator: CustomCalculator = (values) => {
  const kg = Math.max(1, kgOf(values, "bodyweight", 75));
  const peak = nonNeg(values.peakPower, 900);
  const mean = nonNeg(values.meanPower, 650);
  const min = nonNeg(values.minPower, 450);

  return {
    relativePeakPower: round2(peak / kg),
    relativeMeanPower: round2(mean / kg),
    fatigueIndex: peak > 0 ? round2(((peak - min) / peak) * 100) : 0,
    totalWorkKj: round2((mean * 30) / 1000),
    // Standard Wingate resistance: 0.075 kg per kg bodyweight (Monark).
    recommendedResistanceKg: round2(kg * 0.075),
  };
};

// --- 2. Anaerobic Power (Lewis & Harman) ------------------------------------
export const anaerobicPowerCalculator: CustomCalculator = (values) => {
  const kg = kgOf(values, "bodyweight", 75);
  const cm = cmOf(values, "jumpHeight", 50);
  // Lewis: P (kg·m/s) = √4.9 × mass × √jump (m); × 9.81 for watts.
  const lewis = Math.sqrt(4.9) * kg * Math.sqrt(cm / 100) * 9.81;

  return {
    lewisPowerWatts: Math.round(lewis),
    harmanPeakPowerWatts: Math.round(61.9 * cm + 36 * kg - 1822),
    harmanAveragePowerWatts: Math.round(21.2 * cm + 23 * kg - 1393),
    lewisPowerPerKg: kg > 0 ? round2(lewis / kg) : 0,
  };
};

// --- 3. Sayers Jump Power ---------------------------------------------------
export const sayersJumpPowerCalculator: CustomCalculator = (values) => {
  const kg = Math.max(1, kgOf(values, "bodyweight", 75));
  const cm = cmOf(values, "jumpHeight", 50);
  // Sayers et al. (1999): countermovement and squat-jump versions.
  const cmj = whole(values.jumpType, 1) === 1;
  const p = cmj ? 51.9 * cm + 48.9 * kg - 2007 : 60.7 * cm + 45.3 * kg - 2055;

  return { peakPowerWatts: Math.round(p), peakPowerPerKg: round2(p / kg), squatJumpFormulaWatts: Math.round(60.7 * cm + 45.3 * kg - 2055) };
};

// --- 4. Margaria-Kalamen ----------------------------------------------------
export const margariaKalamenCalculator: CustomCalculator = (values) => {
  const kg = Math.max(1, kgOf(values, "bodyweight", 75));
  // Vertical height from step 3 to step 9 = 6 steps.
  const h = (cmOf(values, "stepHeight", 17.5) * 6) / 100;
  const t = Math.max(0.05, nonNeg(values.timeSeconds, 0.6));
  const p = (kg * 9.81 * h) / t;

  return { powerWatts: Math.round(p), powerPerKg: round2(p / kg), verticalHeightMeters: round2(h) };
};

// --- 5. HIIT Interval -------------------------------------------------------
export const hiitIntervalCalculator: CustomCalculator = (values) => {
  const work = nonNeg(values.workSeconds, 40);
  const rest = nonNeg(values.restSeconds, 20);
  const rounds = whole(values.rounds, 8);
  const sets = Math.max(1, whole(values.sets, 3));
  const setRest = nonNeg(values.restBetweenSetsSeconds, 60);
  const warm = nonNeg(values.warmUpMinutes, 5) * 60;
  const cool = nonNeg(values.coolDownMinutes, 5) * 60;
  const main = sets * rounds * (work + rest) - (rest > 0 ? sets * rest : 0) + (sets - 1) * setRest;
  const total = warm + main + cool;
  const workTotal = sets * rounds * work;
  const kg = kgOf(values, "bodyweight", 75);
  // ~10 MET while working, ~4 while resting, ~4 for warm-up and cool-down.
  const cals = kg > 0 ? kcal(10, kg, workTotal / 60) + kcal(4, kg, (total - workTotal) / 60) : 0;

  return {
    totalMinutes: round2(total / 60),
    workMinutes: round2(workTotal / 60),
    workToRestRatio: rest > 0 ? round2(work / rest) : 0,
    totalIntervals: sets * rounds,
    estimatedCalories: Math.round(cals),
  };
};

// --- 6. Tabata --------------------------------------------------------------
export const tabataCalculator: CustomCalculator = (values) => {
  const blocks = Math.max(1, whole(values.blocks, 4));
  const between = nonNeg(values.restBetweenBlocksSeconds, 60);
  // Classic Tabata: 8 rounds of 20 s work / 10 s rest = 4 minutes.
  const total = blocks * 240 + (blocks - 1) * between;
  const kg = kgOf(values, "bodyweight", 75);
  const met = ({ 1: 8, 2: 10, 3: 12 } as Record<number, number>)[whole(values.intensity, 2)] ?? 10;
  const cals = kg > 0 ? kcal(met, kg, (blocks * 160) / 60) + kcal(4, kg, (total - blocks * 160) / 60) : 0;

  return {
    totalMinutes: round2(total / 60),
    workMinutes: round2((blocks * 160) / 60),
    totalRounds: blocks * 8,
    estimatedCalories: Math.round(cals),
  };
};

// --- 7. EMOM ----------------------------------------------------------------
export const emomCalculator: CustomCalculator = (values) => {
  const minutes = whole(values.minutes, 12);
  const reps = whole(values.repsPerMinute, 10);
  const secPerRep = nonNeg(values.secondsPerRep, 3);
  const load = nonNeg(values.weight, 24);
  const work = reps * secPerRep;

  return {
    totalReps: minutes * reps,
    totalVolume: round2(minutes * reps * load),
    workSecondsPerMinute: round2(Math.min(60, work)),
    restSecondsPerMinute: round2(Math.max(0, 60 - work)),
    // Over ~45 s of work leaves too little rest to keep the clock.
    sustainable: work <= 45 ? 1 : 0,
  };
};

// --- 8. AMRAP Score ---------------------------------------------------------
export const amrapScoreCalculator: CustomCalculator = (values) => {
  const perRound = Math.max(1, whole(values.repsPerRound, 30));
  const rounds = whole(values.roundsCompleted, 6);
  const extra = Math.min(perRound - 1, whole(values.extraReps, 12));
  const cap = Math.max(1, nonNeg(values.timeCapMinutes, 20));
  const total = rounds * perRound + extra;

  return {
    totalReps: total,
    roundsDecimal: round2(total / perRound),
    repsPerMinute: round2(total / cap),
    secondsPerRound: total > 0 ? round2((cap * 60) / (total / perRound)) : 0,
  };
};

// --- 9. CrossFit Open Score -------------------------------------------------
export const crossfitOpenScoreCalculator: CustomCalculator = (values) => {
  const field = Math.max(1, whole(values.participants, 200000));
  const ranks = [whole(values.rank1, 50000), whole(values.rank2, 60000), whole(values.rank3, 45000)].filter((r) => r > 0);
  const points = ranks.reduce((a, b) => a + b, 0);
  const avg = ranks.length ? points / ranks.length : 0;
  const pct = ranks.length ? ranks.reduce((a, r) => a + (1 - (r - 1) / field), 0) / ranks.length : 0;

  return {
    totalPoints: points,
    averageRank: Math.round(avg),
    // Your average workout percentile — a close guide to the overall one.
    averagePercentile: round2(pct * 100),
    topPercent: round2((1 - pct) * 100),
  };
};

// --- 10. Murph Time ---------------------------------------------------------
export const murphTimeCalculator: CustomCalculator = (values) => {
  const vest = whole(values.vest, 1) === 2;
  const slow = vest ? 1.12 : 1; // a 20 lb vest slows most athletes ~10–15%
  const mile = (nonNeg(values.mileMinutes, 8) * 60 + nonNeg(values.mileSeconds, 0)) * slow;
  const cal = (nonNeg(values.pullUpSeconds, 3) * 100 + nonNeg(values.pushUpSeconds, 2) * 200 + nonNeg(values.squatSeconds, 1.5) * 300) * slow + nonNeg(values.restMinutes, 10) * 60;
  const total = mile * 2 + cal;
  const t = hms(total);

  return {
    totalMinutes: round2(total / 60),
    hours: t.hours,
    minutes: t.minutes,
    seconds: t.seconds,
    runMinutes: round2((mile * 2) / 60),
    calisthenicsMinutes: round2(cal / 60),
  };
};

// --- 11. Hyrox Time ---------------------------------------------------------
const STATIONS = ["skiErg", "sledPush", "sledPull", "burpeeBroadJumps", "rowing", "farmersCarry", "sandbagLunges", "wallBalls"];
const STATION_DEFAULTS = [270, 180, 240, 300, 285, 120, 270, 360];

export const hyroxTimeCalculator: CustomCalculator = (values) => {
  const pace = nonNeg(values.runPaceMin, 5) * 60 + nonNeg(values.runPaceSec, 30);
  const runs = pace * 8;
  const stations = STATIONS.reduce((sum, k, i) => sum + nonNeg(values[k], STATION_DEFAULTS[i]), 0);
  const rox = nonNeg(values.roxzoneMinutes, 8) * 60;
  const total = runs + stations + rox;
  const t = hms(total);

  return {
    finishHours: t.hours,
    finishMinutes: t.minutes,
    finishSeconds: t.seconds,
    totalRunMinutes: round2(runs / 60),
    totalStationMinutes: round2(stations / 60),
    roxzoneMinutes: round2(rox / 60),
    runShare: total > 0 ? round2((runs / total) * 100) : 0,
  };
};

// --- 12. Hyrox Pace ---------------------------------------------------------
export const hyroxPaceCalculator: CustomCalculator = (values) => {
  const target = nonNeg(values.targetHours, 1) * 3600 + nonNeg(values.targetMinutes, 20) * 60;
  const rox = nonNeg(values.roxzoneMinutes, 7) * 60;
  const runShare = Math.min(80, Math.max(20, nonNeg(values.runSharePercent, 50))) / 100;
  const active = Math.max(0, target - rox);
  const runs = active * runShare;
  const stations = active - runs;
  const pace = runs / 8;

  return {
    runPaceMinPerKm: Math.floor(pace / 60),
    runPaceSecPerKm: Math.round(pace % 60),
    averageStationMinutes: round2(stations / 8 / 60),
    totalRunMinutes: round2(runs / 60),
    totalStationMinutes: round2(stations / 60),
  };
};

export const sportsPowerConditioningCustomCalculators: Record<string, CustomCalculator> = {
  "wingate-test-calculator": wingateTestCalculator,
  "anaerobic-power-calculator": anaerobicPowerCalculator,
  "sayers-jump-power-calculator": sayersJumpPowerCalculator,
  "margaria-kalamen-calculator": margariaKalamenCalculator,
  "hiit-interval-calculator": hiitIntervalCalculator,
  "tabata-calculator": tabataCalculator,
  "emom-calculator": emomCalculator,
  "amrap-score-calculator": amrapScoreCalculator,
  "crossfit-open-score-calculator": crossfitOpenScoreCalculator,
  "murph-time-calculator": murphTimeCalculator,
  "hyrox-time-calculator": hyroxTimeCalculator,
  "hyrox-pace-calculator": hyroxPaceCalculator,
};
