/**
 * Batch: "Sports Calculators" > Hiking Calculators, sub-batch A (Steps,
 * Walking Speed & Walk Tests, 10 tools). The hiking list is built in 3
 * sub-batches (29 tools):
 *  - hiking-steps (this file): step counts, cadence, step length, walking
 *    speed, step goals and clinical / fitness walk tests.
 *  - hiking-fitness: walking / incline / rucking / hiking calories, weight
 *    loss, ruck pace, walking heart rate, altitude oxygen.
 *  - hiking-trail: hiking time, distance and grade, AT and PCT thru-hike
 *    time, pack and base weight, food, water, tent size, trekking poles.
 *
 * Merged from the 37-keyword list: steps to km + 10000 steps -> step
 * calculator; minutes to steps -> steps to minutes; steps per hour -> steps
 * per minute; 1 mile walk test + walking VO2 max -> Rockport walk test;
 * weighted vest walking calories -> rucking calorie; backpacking calories
 * -> backpacking food.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - stepCalculator: a step count -> distance, time and calories (also
 *    steps to km and the 10,000 steps calculator).
 *  - stepsPerDayCalculator: your daily average vs activity levels and the
 *    age-based step targets.
 *  - stepsToMinutesCalculator: steps <-> minutes at a cadence (both ways).
 *  - stepsPerMinuteCalculator: cadence from a timed count, steps per hour
 *    and the intensity it represents.
 *  - stepLengthCalculator: your step / stride length from height or a
 *    measured walk.
 *  - walkingSpeedCalculator: speed and pace from distance and time.
 *  - walkingGoalCalculator: a gradual plan from current steps to a goal.
 *  - gaitSpeedCalculator: clinical gait speed (m/s) vs age norms.
 *  - sixMinuteWalkTestCalculator: 6MWT distance vs Enright predicted.
 *  - rockportWalkTestCalculator: 1-mile walk VO2 max with an age / sex
 *    fitness rating (the generic VO2 max calculator has no rating).
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-hiking-steps-calculators.ts for the copy.
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
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Body weight: unit 1 = kg, 2 = lb -> kg. */
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);
/** Height: unit 1 = cm, 2 = inches -> cm. */
const cm = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 2.54 : v);
const isFemale = (sex: number) => whole(sex, 1) === 2;
/** Walking step length (cm) from height: 0.415 x height (men), 0.413 (women). */
const stepFromHeight = (heightCm: number, sex: number) => heightCm * (isFemale(sex) ? 0.413 : 0.415);

/** 2011 Compendium walking METs by speed (mph), linearly interpolated. */
const WALK_MPH = [2, 2.5, 3, 3.5, 4, 4.5, 5];
const WALK_MET = [2.8, 3.0, 3.5, 4.3, 5.0, 7.0, 8.3];
function walkingMet(mph: number): number {
  if (mph <= WALK_MPH[0]) return WALK_MET[0];
  for (let i = 1; i < WALK_MPH.length; i++) {
    if (mph <= WALK_MPH[i]) return WALK_MET[i - 1] + ((mph - WALK_MPH[i - 1]) / (WALK_MPH[i] - WALK_MPH[i - 1])) * (WALK_MET[i] - WALK_MET[i - 1]);
  }
  return WALK_MET[WALK_MET.length - 1];
}

// --- 1. Step Calculator (steps -> km, miles, time, calories) ---------------------
const PACE_MPH: Record<number, number> = { 1: 2.5, 2: 3, 3: 3.5, 4: 4 };

export const stepCalculator: CustomCalculator = (values) => {
  const steps = nonNeg(values.steps, 10000);
  const own = nonNeg(values.stepLength, 0);
  const stepCm = own > 0 ? cm(own, values.heightUnit) : stepFromHeight(cm(nonNeg(values.height, 170), values.heightUnit), values.sex);
  const km = (steps * stepCm) / 100000;
  const miles = km / 1.609344;
  const mph = PACE_MPH[whole(values.pace, 2)] ?? 3;
  const hours = miles / mph;

  return {
    distanceKm: round2(km),
    distanceMiles: round2(miles),
    walkingMinutes: Math.round(hours * 60),
    calories: Math.round(walkingMet(mph) * kg(nonNeg(values.weight, 70), values.weightUnit) * hours),
    stepLengthCm: round2(stepCm),
    stepsPerKm: Math.round(div(100000, stepCm)),
    stepsPerMile: Math.round(div(160934.4, stepCm)),
  };
};

// --- 2. Steps per Day ---------------------------------------------------------------------
/** Tudor-Locke step-defined activity levels: 1 sedentary ... 5 highly active. */
function activityLevel(steps: number): number {
  if (steps < 5000) return 1;
  if (steps < 7500) return 2;
  if (steps < 10000) return 3;
  if (steps < 12500) return 4;
  return 5;
}

export const stepsPerDayCalculator: CustomCalculator = (values) => {
  const avg = div(nonNeg(values.totalSteps, 52500), Math.max(1, whole(values.days, 7)));
  const goal = nonNeg(values.dailyGoal, 10000);
  const older = nonNeg(values.age, 40) >= 60;

  return {
    averageStepsPerDay: Math.round(avg),
    activityLevel: activityLevel(avg),
    percentOfGoal: round2(div(avg, goal) * 100),
    stepsShortPerDay: Math.max(0, Math.round(goal - avg)),
    recommendedMin: older ? 6000 : 8000,
    recommendedMax: older ? 8000 : 10000,
  };
};

// --- 3. Steps to Minutes (and minutes to steps) -------------------------------------------
const CADENCE: Record<number, number> = { 1: 90, 2: 100, 3: 115, 4: 130, 5: 160 };

export const stepsToMinutesCalculator: CustomCalculator = (values) => {
  const spm = whole(values.pace, 2) === 6 ? Math.max(1, nonNeg(values.customCadence, 100)) : CADENCE[whole(values.pace, 2)] ?? 100;
  if (whole(values.direction, 1) === 2) {
    const minutes = nonNeg(values.minutes, 30);
    return { minutes: round2(minutes), steps: Math.round(minutes * spm), hours: round2(minutes / 60), cadence: spm };
  }
  const steps = nonNeg(values.steps, 10000);
  const minutes = steps / spm;
  return { minutes: round2(minutes), steps: Math.round(steps), hours: round2(minutes / 60), cadence: spm };
};

// --- 4. Steps per Minute (cadence) & per Hour ------------------------------------------------
/** Approximate METs from walking cadence (CADENCE-Adults: 100 spm ≈ 3 METs, 130 ≈ 6). */
function metFromCadence(spm: number): number {
  if (spm < 100) return Math.max(1.5, 2 + (spm - 60) / 40);
  return 3 + (spm - 100) * 0.1;
}

export const stepsPerMinuteCalculator: CustomCalculator = (values) => {
  const steps = nonNeg(values.steps, 1200);
  const minutes = nonNeg(values.minutes, 10) + nonNeg(values.seconds, 0) / 60;
  const spm = div(steps, minutes);

  return {
    stepsPerMinute: round2(spm),
    stepsPerHour: Math.round(spm * 60),
    intensity: spm < 100 ? 1 : spm < 130 ? 2 : 3,
    estimatedMets: round2(clamp(metFromCadence(spm), 1.5, 12)),
    stepsIn30Minutes: Math.round(spm * 30),
  };
};

// --- 5. Step Length ----------------------------------------------------------------------------
export const stepLengthCalculator: CustomCalculator = (values) => {
  let stepCm: number;
  if (whole(values.method, 1) === 2) {
    const metres = nonNeg(values.distance, 20) * (whole(values.distanceUnit, 1) === 2 ? 0.3048 : 1);
    stepCm = div(metres * 100, nonNeg(values.stepsCounted, 28));
  } else {
    stepCm = stepFromHeight(cm(nonNeg(values.height, 170), values.heightUnit), values.sex);
  }

  return {
    stepLengthCm: round2(stepCm),
    stepLengthInches: round2(stepCm / 2.54),
    strideLengthCm: round2(stepCm * 2),
    stepsPerKm: Math.round(div(100000, stepCm)),
    stepsPerMile: Math.round(div(160934.4, stepCm)),
  };
};

// --- 6. Walking Speed ---------------------------------------------------------------------------
export const walkingSpeedCalculator: CustomCalculator = (values) => {
  const km = nonNeg(values.distance, 5) * (whole(values.distanceUnit, 1) === 2 ? 1.609344 : 1);
  const minutes = nonNeg(values.hours, 0) * 60 + nonNeg(values.minutes, 60) + nonNeg(values.seconds, 0) / 60;
  const kmh = div(km, minutes / 60);
  const mph = kmh / 1.609344;

  return {
    speedKmh: round2(kmh),
    speedMph: round2(mph),
    paceMinPerKm: round2(div(minutes, km)),
    paceMinPerMile: round2(div(minutes, km / 1.609344)),
    category: mph < 2 ? 1 : mph < 3 ? 2 : mph < 4 ? 3 : mph < 5 ? 4 : 5,
  };
};

// --- 7. Walking Goal (gradual step increase) -----------------------------------------------------
export const walkingGoalCalculator: CustomCalculator = (values) => {
  const current = Math.max(500, nonNeg(values.currentSteps, 4000));
  const goal = Math.max(current, nonNeg(values.goalSteps, 10000));
  const rate = Math.max(0.01, nonNeg(values.weeklyIncreasePct, 10) / 100);
  const weeks = goal > current ? Math.ceil(Math.log(goal / current) / Math.log(1 + rate)) : 0;
  const extra = goal - current;
  const cadence = Math.max(1, nonNeg(values.cadence, 100));

  return {
    weeksToGoal: weeks,
    nextWeekTarget: Math.round(Math.min(goal, current * (1 + rate))),
    extraStepsPerDay: Math.round(extra),
    extraMinutesPerDay: Math.round(extra / cadence),
    weeklyStepsAtGoal: Math.round(goal * 7),
  };
};

// --- 8. Gait Speed ------------------------------------------------------------------------------------
// Bohannon & Williams Andrews 2011 comfortable gait speed norms (m/s), by decade 20s … 80s.
const GAIT_NORM_MEN = [1.36, 1.43, 1.43, 1.43, 1.34, 1.26, 0.97];
const GAIT_NORM_WOMEN = [1.34, 1.34, 1.39, 1.31, 1.24, 1.13, 0.94];

export const gaitSpeedCalculator: CustomCalculator = (values) => {
  const metres = nonNeg(values.distance, 4) * (whole(values.distanceUnit, 1) === 2 ? 0.3048 : 1);
  const speed = div(metres, nonNeg(values.seconds, 4));
  const decade = clamp(Math.floor(nonNeg(values.age, 70) / 10) - 2, 0, 6);
  const norm = (isFemale(values.sex) ? GAIT_NORM_WOMEN : GAIT_NORM_MEN)[decade];

  return {
    gaitSpeedMs: round2(speed),
    gaitSpeedKmh: round2(speed * 3.6),
    ageNormMs: norm,
    percentOfNorm: round2(div(speed, norm) * 100),
    // 1 household (< 0.4), 2 limited community (0.4–0.8), 3 community (0.8–1.0), 4 healthy (≥ 1.0)
    category: speed < 0.4 ? 1 : speed < 0.8 ? 2 : speed < 1 ? 3 : 4,
  };
};

// --- 9. Six-Minute Walk Test ------------------------------------------------------------------------------
// Enright & Sherrill 1998 reference equations.
export const sixMinuteWalkTestCalculator: CustomCalculator = (values) => {
  const dist = nonNeg(values.distance, 500) * (whole(values.distanceUnit, 1) === 2 ? 0.3048 : 1);
  const age = nonNeg(values.age, 60);
  const h = cm(nonNeg(values.height, 170), values.heightUnit);
  const w = kg(nonNeg(values.weight, 75), values.weightUnit);
  const female = isFemale(values.sex);
  const predicted = female ? 2.11 * h - 2.29 * w - 5.78 * age + 667 : 7.57 * h - 5.02 * age - 1.76 * w - 309;
  const lln = predicted - (female ? 139 : 153);

  return {
    percentPredicted: round2(div(dist, predicted) * 100),
    predictedMetres: Math.round(predicted),
    lowerLimitOfNormal: Math.round(lln),
    belowNormal: dist < lln ? 1 : 0,
    estimatedVo2Peak: round2(0.03 * dist + 3.98),
    walkingSpeedMs: round2(dist / 360),
  };
};

// --- 10. Rockport Walk Test (1-mile walk VO2 max) -------------------------------------------------------------
// Cooper Institute VO2 max norms (ml/kg/min): lower bounds of Poor, Fair, Good, Excellent, Superior.
const VO2_MEN: number[][] = [
  [33, 37, 42, 46, 52.5], [31.5, 35.5, 41, 45, 49.5], [30.2, 33.6, 39, 43.8, 48.1], [26.1, 31, 35.8, 41, 45.4], [20.5, 26.1, 32.3, 36.5, 44.3],
];
const VO2_WOMEN: number[][] = [
  [23.6, 29, 33, 37, 41.1], [22.8, 27, 31.5, 35.7, 40.1], [21, 24.5, 29, 32.9, 37], [20.2, 22.8, 27, 31.5, 35.8], [17.5, 20.2, 24.5, 30.3, 31.5],
];

export const rockportWalkTestCalculator: CustomCalculator = (values) => {
  const lb = kg(nonNeg(values.weight, 80), values.weightUnit) / 0.45359237;
  const age = nonNeg(values.age, 40);
  const male = isFemale(values.sex) ? 0 : 1;
  const time = nonNeg(values.minutes, 15) + nonNeg(values.seconds, 0) / 60;
  const hr = nonNeg(values.heartRate, 130);
  const base = 132.853 - 0.0769 * lb - 0.3877 * age + 6.315 * male - 0.1565 * hr;
  const vo2 = Math.max(0, base - 3.2649 * time);
  const row = (male ? VO2_MEN : VO2_WOMEN)[clamp(Math.floor(age / 10) - 2, 0, 4)];
  let rating = 1; // 1 very poor … 6 superior
  for (const t of row) if (vo2 >= t) rating++;
  const goodTime = (base - row[2]) / 3.2649;

  return { vo2Max: round2(vo2), fitnessRating: rating, mets: round2(vo2 / 3.5), timeForGoodRatingMinutes: round2(Math.max(0, goodTime)) };
};

export const hikingStepsCustomCalculators: Record<string, CustomCalculator> = {
  "step-calculator": stepCalculator,
  "steps-per-day-calculator": stepsPerDayCalculator,
  "steps-to-minutes-calculator": stepsToMinutesCalculator,
  "steps-per-minute-calculator": stepsPerMinuteCalculator,
  "step-length-calculator": stepLengthCalculator,
  "walking-speed-calculator": walkingSpeedCalculator,
  "walking-goal-calculator": walkingGoalCalculator,
  "gait-speed-calculator": gaitSpeedCalculator,
  "six-minute-walk-test-calculator": sixMinuteWalkTestCalculator,
  "rockport-walk-test-calculator": rockportWalkTestCalculator,
};
