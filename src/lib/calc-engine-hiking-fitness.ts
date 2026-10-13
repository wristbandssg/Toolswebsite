/**
 * Batch: "Sports Calculators" > Hiking Calculators, sub-batch B (Calories,
 * Rucking & Fitness, 8 tools). See calc-engine-hiking-steps.ts for the
 * full list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - walkingCalorieCalculator: flat walking, METs by speed (gross and net).
 *  - inclineWalkingCaloriesCalculator: treadmill incline, ACSM walking
 *    equation, vs the same walk on the flat.
 *  - ruckingCalorieCalculator: carrying a load (backpack or weighted vest
 *    — also the weighted vest walking calorie calculator), Pandolf equation
 *    with terrain.
 *  - hikingCalorieCalculator: a whole hike — distance, elevation gain,
 *    pack and time (Pandolf on the flat + climbing work).
 *  - walkingWeightLossCalculator: weeks to a weight-loss goal from walking
 *    (net calories) plus diet.
 *  - ruckPaceCalculator: pace and finish time for a ruck vs the 15:00/mile
 *    military standard.
 *  - walkingHeartRateCalculator: moderate / vigorous walking HR range and
 *    the intensity of your measured walking HR.
 *  - altitudeOxygenCalculator: air pressure, effective O2 and typical SpO2
 *    at altitude.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-hiking-fitness-calculators.ts for the copy.
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
/** Weight: unit 1 = kg, 2 = lb -> kg. */
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);
/** Speed: unit 1 = mph, 2 = km/h -> mph. */
const mphOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 1.609344 : v);
const W_TO_KCAL_PER_HOUR = 3600 / 4184;

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

/** Pandolf et al. (1977) load-carriage metabolic rate in watts. grade in %. */
function pandolfWatts(bodyKg: number, loadKg: number, speedMs: number, gradePct: number, terrain: number): number {
  const w = Math.max(1, bodyKg);
  const total = w + loadKg;
  return 1.5 * w + 2 * total * Math.pow(loadKg / w, 2) + terrain * total * (1.5 * speedMs * speedMs + 0.35 * speedMs * Math.max(0, gradePct));
}
// Terrain factor η: 1 paved / treadmill, 1.1 dirt road, 1.2 light brush / trail, 1.5 heavy brush, 1.8 swampy, 2.1 loose sand.
const TERRAIN: Record<number, number> = { 1: 1, 2: 1.1, 3: 1.2, 4: 1.5, 5: 1.8, 6: 2.1 };

// --- 1. Walking Calories ---------------------------------------------------------------
export const walkingCalorieCalculator: CustomCalculator = (values) => {
  const mph = mphOf(nonNeg(values.speed, 3), values.speedUnit);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const hours = whole(values.method, 1) === 2 ? div(nonNeg(values.distance, 3) * (whole(values.speedUnit, 1) === 2 ? 1 / 1.609344 : 1), mph) : nonNeg(values.minutes, 60) / 60;
  const met = walkingMet(mph);
  const miles = mph * hours;

  return {
    calories: Math.round(met * w * hours),
    netCalories: Math.round((met - 1) * w * hours),
    caloriesPerMile: round2(div(met * w * hours, miles)),
    caloriesPerKm: round2(div(met * w * hours, miles * 1.609344)),
    minutes: Math.round(hours * 60),
    met: round2(met),
  };
};

// --- 2. Walking Weight Loss ----------------------------------------------------------------
export const walkingWeightLossCalculator: CustomCalculator = (values) => {
  const lbUnit = whole(values.weightUnit, 1) === 2;
  const w = kg(nonNeg(values.weight, 85), values.weightUnit);
  const lossKg = kg(nonNeg(values.goalLoss, 5), values.weightUnit);
  const mph = mphOf(nonNeg(values.speed, 3.5), values.speedUnit);
  const walkKcal = (walkingMet(mph) - 1) * w * (nonNeg(values.minutesPerDay, 45) / 60);
  const weekly = walkKcal * clamp(whole(values.daysPerWeek, 5), 0, 7) + nonNeg(values.dietDeficit, 0) * 7;
  const weeks = div(lossKg * 7700, weekly);
  const perWeekKg = weekly / 7700;

  return {
    weeksToGoal: round2(weeks),
    caloriesPerWalk: Math.round(walkKcal),
    weeklyDeficit: Math.round(weekly),
    lossPerWeek: round2(lbUnit ? perWeekKg / 0.45359237 : perWeekKg),
    lossPerMonth: round2((lbUnit ? perWeekKg / 0.45359237 : perWeekKg) * 4.345),
  };
};

// --- 3. Incline Walking Calories (ACSM) ---------------------------------------------------------
export const inclineWalkingCaloriesCalculator: CustomCalculator = (values) => {
  const mMin = mphOf(nonNeg(values.speed, 3), values.speedUnit) * 26.8224;
  const grade = clamp(nonNeg(values.incline, 12), 0, 40) / 100;
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const minutes = nonNeg(values.minutes, 30);
  const vo2 = 3.5 + 0.1 * mMin + 1.8 * mMin * grade;
  const flat = 3.5 + 0.1 * mMin;
  const kcal = (vo2 * w * 5 * minutes) / 1000;
  const flatKcal = (flat * w * 5 * minutes) / 1000;

  return {
    calories: Math.round(kcal),
    caloriesPerMinute: round2(kcal / Math.max(1, minutes)),
    flatCalories: Math.round(flatKcal),
    extraFromIncline: Math.round(kcal - flatKcal),
    vo2: round2(vo2),
    mets: round2(vo2 / 3.5),
  };
};

// --- 4. Rucking Calories (backpack or weighted vest) ------------------------------------------------
export const ruckingCalorieCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 80), values.weightUnit);
  const load = kg(nonNeg(values.load, 20), values.weightUnit);
  const v = mphOf(nonNeg(values.speed, 3), values.speedUnit) * 0.44704;
  const grade = nonNeg(values.grade, 0);
  const eta = TERRAIN[whole(values.terrain, 1)] ?? 1;
  const hours = nonNeg(values.minutes, 60) / 60;
  const loaded = pandolfWatts(w, load, v, grade, eta) * W_TO_KCAL_PER_HOUR;
  const unloaded = pandolfWatts(w, 0, v, grade, eta) * W_TO_KCAL_PER_HOUR;

  return {
    calories: Math.round(loaded * hours),
    caloriesPerHour: Math.round(loaded),
    withoutLoadCalories: Math.round(unloaded * hours),
    extraFromLoad: Math.round((loaded - unloaded) * hours),
    loadPctBodyWeight: round2(div(load, w) * 100),
  };
};

// --- 5. Ruck Pace ----------------------------------------------------------------------------------------
const STANDARD_MIN_PER_MILE = 15; // Army 12-mile ruck / EIB-ESB: 12 miles in 3 hours

export const ruckPaceCalculator: CustomCalculator = (values) => {
  const km = whole(values.distanceUnit, 1) === 2;
  const miles = nonNeg(values.distance, 12) / (km ? 1.609344 : 1);
  const minutes = nonNeg(values.hours, 3) * 60 + nonNeg(values.minutes, 0);
  const pace = div(minutes, miles);

  return {
    paceMinPerMile: round2(pace),
    paceMinPerKm: round2(pace / 1.609344),
    speedMph: round2(div(miles, minutes / 60)),
    standardMinutes: round2(miles * STANDARD_MIN_PER_MILE),
    minutesUnderStandard: round2(miles * STANDARD_MIN_PER_MILE - minutes),
  };
};

// --- 6. Hiking Calories --------------------------------------------------------------------------------------
const CLIMB_EFFICIENCY = 0.25;

export const hikingCalorieCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 75), values.weightUnit);
  const load = kg(nonNeg(values.packWeight, 10), values.weightUnit);
  const metric = whole(values.distanceUnit, 1) === 2;
  const metres = nonNeg(values.distance, 8) * (metric ? 1000 : 1609.344);
  const gain = nonNeg(values.elevationGain, 2000) * (metric ? 1 : 0.3048);
  const hours = Math.max(0.1, nonNeg(values.hours, 4));
  const v = metres / (hours * 3600);
  const flat = pandolfWatts(w, load, v, 0, TERRAIN[whole(values.terrain, 3)] ?? 1.2) * W_TO_KCAL_PER_HOUR * hours;
  const climb = ((w + load) * 9.81 * gain) / CLIMB_EFFICIENCY / 4184;
  const total = flat + climb;

  return {
    calories: Math.round(total),
    caloriesPerHour: Math.round(total / hours),
    climbingCalories: Math.round(climb),
    caloriesPerMile: round2(div(total, metres / 1609.344)),
  };
};

// --- 7. Walking Heart Rate ------------------------------------------------------------------------------------
export const walkingHeartRateCalculator: CustomCalculator = (values) => {
  const max = 208 - 0.7 * nonNeg(values.age, 45);
  const rest = nonNeg(values.restingHr, 70);
  const hrr = Math.max(1, max - rest);
  const at = (p: number) => Math.round(rest + hrr * p);
  const walking = nonNeg(values.walkingHr, 0);
  const pct = walking > 0 ? ((walking - rest) / hrr) * 100 : 0;

  return {
    moderateLow: at(0.4),
    moderateHigh: at(0.59),
    vigorousLow: at(0.6),
    vigorousHigh: at(0.89),
    maxHeartRate: Math.round(max),
    yourIntensityPct: round2(Math.max(0, pct)),
    // 0 = not entered, 1 light (< 40% HRR), 2 moderate, 3 vigorous (≥ 60%)
    intensity: walking > 0 ? (pct < 40 ? 1 : pct < 60 ? 2 : 3) : 0,
  };
};

// --- 8. Altitude Oxygen ------------------------------------------------------------------------------------------
// Typical resting SpO2 (%) of healthy, unacclimatised people by altitude (m).
const SPO2_ALT = [0, 1500, 2500, 3500, 4500, 5500, 6500, 8849];
const SPO2 = [98, 95, 92, 88, 84, 78, 72, 60];

export const altitudeOxygenCalculator: CustomCalculator = (values) => {
  const m = clamp(num(values.altitude, 3000) * (whole(values.altitudeUnit, 1) === 2 ? 0.3048 : 1), -400, 9000);
  const kPa = 101.325 * Math.pow(1 - 2.25577e-5 * m, 5.25588);
  const mmHg = kPa * 7.50062;
  const ratio = kPa / 101.325;
  let spo2 = SPO2[0];
  for (let i = 1; i < SPO2_ALT.length; i++) {
    if (m <= SPO2_ALT[i]) {
      spo2 = SPO2[i - 1] + ((Math.max(0, m) - SPO2_ALT[i - 1]) / (SPO2_ALT[i] - SPO2_ALT[i - 1])) * (SPO2[i] - SPO2[i - 1]);
      break;
    }
    spo2 = SPO2[i];
  }

  return {
    effectiveOxygenPct: round2(20.9 * ratio),
    oxygenVsSeaLevelPct: round2(ratio * 100),
    pressureMmHg: round2(mmHg),
    inspiredO2MmHg: round2(Math.max(0, mmHg - 47) * 0.2095),
    typicalSpo2Pct: round2(spo2),
    // 1 low (< 2,500 m), 2 moderate, 3 high (3,500–5,800), 4 extreme
    altitudeRisk: m < 2500 ? 1 : m < 3500 ? 2 : m < 5800 ? 3 : 4,
  };
};

export const hikingFitnessCustomCalculators: Record<string, CustomCalculator> = {
  "walking-calorie-calculator": walkingCalorieCalculator,
  "walking-weight-loss-calculator": walkingWeightLossCalculator,
  "incline-walking-calories-calculator": inclineWalkingCaloriesCalculator,
  "rucking-calorie-calculator": ruckingCalorieCalculator,
  "ruck-pace-calculator": ruckPaceCalculator,
  "hiking-calorie-calculator": hikingCalorieCalculator,
  "walking-heart-rate-calculator": walkingHeartRateCalculator,
  "altitude-oxygen-calculator": altitudeOxygenCalculator,
};
