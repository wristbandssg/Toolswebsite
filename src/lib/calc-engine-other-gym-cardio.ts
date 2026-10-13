/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-gym-cardio (treadmill, elliptical, air bike & Peloton, 11 tools).
 * See calc-engine-other-football.ts for the full list of other-* batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - treadmillCalorieCalculator: ACSM walking / running energy cost;
 *    treadmillPaceCalculator: speed <-> pace and race times;
 *    treadmillDistanceCalculator: distance from speed and time;
 *    treadmillElevationCalculator: vertical gain from incline;
 *    treadmillToStepsCalculator: steps from a treadmill session.
 *  - caloriesToStepsCalculator: steps needed to burn a calorie target.
 *  - ellipticalCaloriesCalculator / distanceOnEllipticalCalculator /
 *    ellipticalStrideLengthCalculator: calories, distance, machine stride.
 *  - assaultBikeCalorieCalculator vs pelotonOutputCalculator: air-bike
 *    calories from watts vs Peloton kJ output.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-gym-cardio-calculators.ts for the copy.
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
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);
/** Speed: unit 1 = mph, 2 = km/h -> mph. */
const mphOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 1.609344 : v);

/** ACSM oxygen cost (ml/kg/min): walking below ~4 mph, running above (or as chosen). */
function acsmVo2(mph: number, gradePct: number, mode: number): number {
  const m = mph * 26.8224;
  const g = gradePct / 100;
  const run = mode === 3 ? true : mode === 2 ? false : mph >= 4;
  return run ? 3.5 + 0.2 * m + 0.9 * m * g : 3.5 + 0.1 * m + 1.8 * m * g;
}

// --- 1. Treadmill calories --------------------------------------------------------
export const treadmillCalorieCalculator: CustomCalculator = (values) => {
  const mph = mphOf(nonNeg(values.speed, 3.5), values.speedUnit);
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const min = nonNeg(values.minutes, 30);
  const vo2 = acsmVo2(mph, clamp(nonNeg(values.incline, 0), 0, 40), whole(values.mode, 1));
  const kcal = (vo2 * kg * min) / 200;

  return { calories: Math.round(kcal), caloriesPerMinute: round2(kcal / Math.max(1, min)), mets: round2(vo2 / 3.5), distanceMiles: round2((mph * min) / 60) };
};

// --- 2. Treadmill pace ----------------------------------------------------------------------
export const treadmillPaceCalculator: CustomCalculator = (values) => {
  const mph = Math.max(0.1, mphOf(nonNeg(values.speed, 6), values.speedUnit));
  const pace = 60 / mph;
  const dist = nonNeg(values.raceKm, 5) / 1.609344;

  return { paceMinPerMile: round2(pace), paceMinPerKm: round2(pace / 1.609344), speedKmh: round2(mph * 1.609344), speedMph: round2(mph), raceTimeMinutes: round2(dist * pace) };
};

// --- 3. Treadmill elevation gain -----------------------------------------------------------------
export const treadmillElevationCalculator: CustomCalculator = (values) => {
  const miles = whole(values.method, 1) === 2 ? (mphOf(nonNeg(values.speed, 3), values.speedUnit) * nonNeg(values.minutes, 30)) / 60 : nonNeg(values.distance, 2) / (whole(values.speedUnit, 1) === 2 ? 1.609344 : 1);
  const g = clamp(nonNeg(values.incline, 12), 0, 40) / 100;
  const ft = miles * 5280 * Math.sin(Math.atan(g));

  return { elevationGainFt: Math.round(ft), elevationGainM: Math.round(ft * 0.3048), floorsClimbed: Math.round(ft / 10), everestPct: round2((ft / 29032) * 100), distanceMiles: round2(miles) };
};

// --- 4. Treadmill distance --------------------------------------------------------------------------
export const treadmillDistanceCalculator: CustomCalculator = (values) => {
  const mph = mphOf(nonNeg(values.speed, 6), values.speedUnit);
  const miles = (mph * (nonNeg(values.hours, 0) * 60 + nonNeg(values.minutes, 30))) / 60;

  return { distanceMiles: round2(miles), distanceKm: round2(miles * 1.609344), trackLaps400m: round2((miles * 1609.344) / 400) };
};

// --- 5. Treadmill to steps ------------------------------------------------------------------------------
export const treadmillToStepsCalculator: CustomCalculator = (values) => {
  const mph = Math.max(0.1, mphOf(nonNeg(values.speed, 3.5), values.speedUnit));
  const min = nonNeg(values.minutes, 30);
  const heightM = nonNeg(values.height, 68) * (whole(values.heightUnit, 1) === 2 ? 0.01 : 0.0254);
  const ms = mph * 0.44704;
  const running = mph >= 4.5;
  const stepM = running ? ms / (nonNeg(values.runCadence, 165) / 60) : heightM * 0.414 * (0.85 + 0.05 * mph);
  const steps = div(ms * min * 60, stepM);

  return { steps: Math.round(steps), stepsPerMinute: Math.round(div(steps, min)), stepLengthCm: round2(stepM * 100), distanceMiles: round2((mph * min) / 60) };
};

// --- 6. Calories to steps --------------------------------------------------------------------------------
const PACE: Record<number, [number, number, number]> = { 1: [2.5, 3.0, 90], 2: [3, 3.5, 100], 3: [3.5, 4.3, 115], 4: [6, 9.8, 160] }; // mph, MET, steps/min

export const caloriesToStepsCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const [mph, met, cadence] = PACE[whole(values.pace, 2)] ?? PACE[2];
  const netPerMin = ((met - (whole(values.netOrGross, 1) === 1 ? 1 : 0)) * kg) / 60;
  const minutes = div(nonNeg(values.calories, 300), netPerMin);

  return { stepsNeeded: Math.round(minutes * cadence), minutes: Math.round(minutes), distanceMiles: round2((mph * minutes) / 60), caloriesPer1000Steps: round2((netPerMin / cadence) * 1000) };
};

// --- 7. Elliptical calories ------------------------------------------------------------------------------
const ELLIPTICAL_MET: Record<number, number> = { 1: 4, 2: 5, 3: 7.5 };

export const ellipticalCaloriesCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const met = ELLIPTICAL_MET[whole(values.effort, 2)] ?? 5;
  const hours = nonNeg(values.minutes, 30) / 60;

  return { calories: Math.round(met * kg * hours), caloriesPerHour: Math.round(met * kg), met };
};

// --- 8. Distance on an elliptical ----------------------------------------------------------------------------
export const distanceOnEllipticalCalculator: CustomCalculator = (values) => {
  const strideIn = nonNeg(values.strideLength, 20) / (whole(values.strideUnit, 1) === 2 ? 2.54 : 1);
  const steps = nonNeg(values.stridesPerMinute, 130) * nonNeg(values.minutes, 30);
  const miles = (steps * strideIn) / 63360;

  return { distanceMiles: round2(miles), distanceKm: round2(miles * 1.609344), totalStrides: Math.round(steps), speedMph: round2(div(miles, nonNeg(values.minutes, 30) / 60)) };
};

// --- 9. Elliptical stride length -------------------------------------------------------------------------------
export const ellipticalStrideLengthCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.height, 68) / (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const rec = clamp(Math.round(h * 0.29), 14, 24);

  return { recommendedStrideInches: rec, minimumStrideInches: Math.max(14, rec - 2), recommendedStrideCm: Math.round(rec * 2.54) };
};

// --- 10. Assault / air bike calories --------------------------------------------------------------------------------
export const assaultBikeCalorieCalculator: CustomCalculator = (values) => {
  const watts = nonNeg(values.watts, 200);
  const min = nonNeg(values.minutes, 20);
  const display = ((3.44 * watts + 300) * min) / 60;
  const metabolic = (watts * min * 60) / 4184 / 0.22;

  return { displayCalories: Math.round(display), metabolicCalories: Math.round(metabolic), caloriesPerMinute: round2(display / Math.max(1, min)), wattsPerKg: round2(div(watts, kgOf(nonNeg(values.weight, 170), values.weightUnit))) };
};

// --- 11. Peloton total output (kJ) ------------------------------------------------------------------------------------
export const pelotonOutputCalculator: CustomCalculator = (values) => {
  const watts = nonNeg(values.avgOutput, 150);
  const min = nonNeg(values.minutes, 30);
  const kj = (watts * min * 60) / 1000;
  const target = nonNeg(values.targetKj, 300);

  return { totalOutputKj: round2(kj), estimatedCalories: Math.round(kj / (4.184 * 0.24)), wattsForTargetKj: round2(div(target * 1000, min * 60)), wattsPerKg: round2(div(watts, kgOf(nonNeg(values.weight, 170), values.weightUnit))) };
};

export const otherGymCardioCustomCalculators: Record<string, CustomCalculator> = {
  "treadmill-calorie-calculator": treadmillCalorieCalculator,
  "treadmill-pace-calculator": treadmillPaceCalculator,
  "treadmill-elevation-calculator": treadmillElevationCalculator,
  "treadmill-distance-calculator": treadmillDistanceCalculator,
  "treadmill-to-steps-calculator": treadmillToStepsCalculator,
  "calories-to-steps-calculator": caloriesToStepsCalculator,
  "elliptical-calories-calculator": ellipticalCaloriesCalculator,
  "distance-on-elliptical-calculator": distanceOnEllipticalCalculator,
  "elliptical-stride-length-calculator": ellipticalStrideLengthCalculator,
  "assault-bike-calorie-calculator": assaultBikeCalorieCalculator,
  "peloton-output-calculator": pelotonOutputCalculator,
};
