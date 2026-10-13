/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-rowing-home-gym (rowing machine, home gym, jump rope & rebounder,
 * 10 tools). See calc-engine-other-football.ts for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - wattsToSplitCalculator: watts <-> 500 m split (Concept2 formula);
 *    rowingMachineDistanceCalculator: metres from split and time;
 *    rowingMachineCaloriesCalculator: display and body-weight calories;
 *    rowingStrokeRateCalculator: strokes per minute and metres per stroke.
 *  - homeGymCostCalculator vs gymFlooringCalculator: total equipment cost
 *    and membership break-even vs flooring tiles / mats needed.
 *  - jumpRopeLengthCalculator vs jumpingRopeCaloriesBurnedCalculator: rope
 *    size vs calories.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-rowing-home-gym-calculators.ts for the copy.
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
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);
const splitSec = (values: Record<string, number>, dm = 2, ds = 0) => nonNeg(values.splitMinutes, dm) * 60 + nonNeg(values.splitSeconds, ds);
/** Concept2: watts = 2.80 ÷ (pace per metre)³. */
const wattsFromSplit = (split500: number) => (split500 > 0 ? 2.8 / Math.pow(split500 / 500, 3) : 0);
const splitFromWatts = (w: number) => (w > 0 ? 500 * Math.pow(2.8 / w, 1 / 3) : 0);

// --- 1. Watts to split ----------------------------------------------------------------
export const wattsToSplitCalculator: CustomCalculator = (values) => {
  const toSplit = whole(values.direction, 1) === 1;
  const split = toSplit ? splitFromWatts(nonNeg(values.watts, 200)) : splitSec(values);
  const watts = toSplit ? nonNeg(values.watts, 200) : wattsFromSplit(split);

  return { splitSeconds: round2(split), splitMinutes: Math.floor(split / 60), splitRemainderSeconds: round2(split % 60), watts: round2(watts), time2kMinutes: round2((split * 4) / 60) };
};

// --- 2. Rowing machine distance -------------------------------------------------------------
export const rowingMachineDistanceCalculator: CustomCalculator = (values) => {
  const split = Math.max(60, splitSec(values));
  const secs = nonNeg(values.minutes, 20) * 60;
  const metres = (secs / split) * 500;

  return { distanceMetres: Math.round(metres), distanceKm: round2(metres / 1000), distanceMiles: round2(metres / 1609.344), watts: round2(wattsFromSplit(split)) };
};

// --- 3. Rowing machine calories ---------------------------------------------------------------
export const rowingMachineCaloriesCalculator: CustomCalculator = (values) => {
  const watts = whole(values.method, 1) === 2 ? nonNeg(values.watts, 150) : wattsFromSplit(Math.max(60, splitSec(values, 2, 15)));
  const min = nonNeg(values.minutes, 30);
  const display = ((4 * watts * 0.8604 + 300) * min) / 60;
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const met = watts < 100 ? 4.8 : watts < 150 ? 7 : watts < 200 ? 8.5 : 12;

  return { displayCalories: Math.round(display), bodyWeightCalories: Math.round((met * kg * min) / 60), watts: round2(watts), caloriesPerHourDisplay: Math.round(4 * watts * 0.8604 + 300) };
};

// --- 4. Rowing stroke rate ------------------------------------------------------------------------
export const rowingStrokeRateCalculator: CustomCalculator = (values) => {
  const strokes = nonNeg(values.strokes, 480);
  const min = nonNeg(values.minutes, 20);
  const spm = div(strokes, min);
  const dps = div(nonNeg(values.distance, 5000), strokes);

  return { strokesPerMinute: round2(spm), metresPerStroke: round2(dps), zone: spm < 18 ? 1 : spm < 24 ? 2 : spm < 30 ? 3 : 4 };
};

// --- 5. Home gym cost -------------------------------------------------------------------------------
export const homeGymCostCalculator: CustomCalculator = (values) => {
  const keys = ["rack", "barbell", "plates", "bench", "dumbbells", "cardio", "flooring", "accessories"];
  const total = keys.reduce((s, k) => s + nonNeg(values[k], 0), 0);
  const membership = nonNeg(values.membershipMonthly, 50) + nonNeg(values.commuteMonthly, 20);
  const breakEven = div(total, membership);

  return { totalCost: round2(total), breakEvenMonths: round2(breakEven), fiveYearSavings: round2(membership * 60 - total - nonNeg(values.upkeepYearly, 50) * 5), monthlyGymCost: round2(membership) };
};

// --- 6. Gym flooring -----------------------------------------------------------------------------------
const TILE_SQFT: Record<number, number> = { 1: 4, 2: 24, 3: 1, 4: 6 };

export const gymFlooringCalculator: CustomCalculator = (values) => {
  const area = nonNeg(values.length, 12) * nonNeg(values.width, 10);
  const tile = TILE_SQFT[whole(values.tileSize, 1)] ?? 4;
  const waste = 1 + Math.min(30, nonNeg(values.wastePct, 5)) / 100;
  const pieces = Math.ceil((area * waste) / tile);
  const thickness = nonNeg(values.thicknessIn, 0.75);

  return { piecesNeeded: pieces, areaSqFt: round2(area), coveredSqFt: pieces * tile, totalCost: round2(pieces * nonNeg(values.pricePerPiece, 15)), weightLb: Math.round(pieces * tile * thickness * 5.3) };
};

// --- 7. Workout time --------------------------------------------------------------------------------------
export const workoutTimeCalculator: CustomCalculator = (values) => {
  const ex = whole(values.exercises, 6);
  const sets = whole(values.sets, 3);
  const work = ex * sets * whole(values.reps, 10) * nonNeg(values.secondsPerRep, 3);
  const rest = ex * Math.max(0, sets - 1) * nonNeg(values.restSeconds, 90) + Math.max(0, ex - 1) * nonNeg(values.transitionSeconds, 120);
  const extra = (nonNeg(values.warmupMinutes, 10) + nonNeg(values.cooldownMinutes, 5)) * 60;
  const total = work + rest + extra;

  return { totalMinutes: round2(total / 60), workingMinutes: round2(work / 60), restMinutes: round2(rest / 60), workPct: round2(div(work, total) * 100) };
};

// --- 8. Rebounder calories ------------------------------------------------------------------------------------
const REBOUND_MET: Record<number, number> = { 1: 3.5, 2: 4.5, 3: 6.5 };

export const rebounderCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 160), values.weightUnit);
  const met = REBOUND_MET[whole(values.intensity, 2)] ?? 4.5;
  const hours = nonNeg(values.minutes, 20) / 60;

  return { calories: Math.round(met * kg * hours), caloriesPerHour: Math.round(met * kg), met };
};

// --- 9. Jump rope length ----------------------------------------------------------------------------------------
const ROPE_ADD_FT: Record<number, number> = { 1: 3, 2: 2.5, 3: 2, 4: 1.25 };

export const jumpRopeLengthCalculator: CustomCalculator = (values) => {
  const ft = nonNeg(values.height, 68) / (whole(values.unit, 1) === 2 ? 30.48 : 12);
  const len = ft + (ROPE_ADD_FT[whole(values.level, 1)] ?? 3);

  return { ropeLengthFeet: round2(len), ropeLengthInches: Math.round(len * 12), ropeLengthCm: Math.round(len * 30.48) };
};

// --- 10. Jumping rope calories --------------------------------------------------------------------------------------
const ROPE_MET: Record<number, number> = { 1: 8.8, 2: 11.8, 3: 12.3 };
const ROPE_SPM: Record<number, number> = { 1: 90, 2: 110, 3: 140 };

export const jumpingRopeCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 160), values.weightUnit);
  const pace = whole(values.pace, 2);
  const min = nonNeg(values.minutes, 15);
  const kcal = ((ROPE_MET[pace] ?? 11.8) * kg * min) / 60;

  return { calories: Math.round(kcal), caloriesPerMinute: round2(kcal / Math.max(1, min)), totalSkips: Math.round((ROPE_SPM[pace] ?? 110) * min), met: ROPE_MET[pace] ?? 11.8 };
};

export const otherRowingHomeGymCustomCalculators: Record<string, CustomCalculator> = {
  "watts-to-split-calculator": wattsToSplitCalculator,
  "rowing-machine-distance-calculator": rowingMachineDistanceCalculator,
  "rowing-machine-calories-calculator": rowingMachineCaloriesCalculator,
  "rowing-stroke-rate-calculator": rowingStrokeRateCalculator,
  "home-gym-cost-calculator": homeGymCostCalculator,
  "gym-flooring-calculator": gymFlooringCalculator,
  "workout-time-calculator": workoutTimeCalculator,
  "rebounder-calories-burned-calculator": rebounderCaloriesBurnedCalculator,
  "jump-rope-length-calculator": jumpRopeLengthCalculator,
  "jumping-rope-calories-burned-calculator": jumpingRopeCaloriesBurnedCalculator,
};
