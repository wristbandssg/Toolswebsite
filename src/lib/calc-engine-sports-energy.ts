/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch E
 * (Energy, Nutrition & Cardio, 8 tools). See
 * calc-engine-sports-strength-programming.ts for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bmrForAthletesCalculator: resting energy by Cunningham (lean-mass
 *    based, best for athletes), Katch-McArdle, Mifflin and Harris-Benedict.
 *  - tdeeForAthletesCalculator: BMR × everyday activity PLUS the energy of
 *    the athlete's training hours — the athlete's full daily burn.
 *  - macroForAthletesCalculator: carbs by training load (g/kg), protein
 *    g/kg and fat for a calorie target.
 *  - energyAvailabilityCalculator: intake minus exercise energy, per kg of
 *    fat-free mass — the RED-S / low-energy-availability check.
 *  - caloriesBurnedByActivityCalculator: MET-based calories for 20+
 *    activities (also the MET calculator).
 *  - weightliftingCaloriesBurnedCalculator: resistance-training calories by
 *    intensity, plus the after-burn.
 *  - targetHeartRateCalculator: Karvonen target range and training zones
 *    (incl. the fat-burning zone).
 *  - vo2MaxCalculator: VO2 max by heart-rate ratio, Cooper 12-minute run,
 *    Rockport 1-mile walk or 1.5-mile run.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-energy-calculators.ts for the copy.
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
const LB = 0.45359237;
const imperial = (u: number) => whole(u, 1) === 2;
const kgOf = (w: number, u: number) => (imperial(u) ? w * LB : w);
const cmOf = (l: number, u: number) => (imperial(u) ? l * 2.54 : l);

function bmrSet(values: Record<string, number>) {
  const female = isFemale(values.sex);
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 75), u);
  const cm = cmOf(nonNeg(values.height, 178), u);
  const age = nonNeg(values.age, 25);
  const bf = Math.min(60, nonNeg(values.bodyFatPercent, 0));
  // Lean mass: from body fat % when known, else the Boer formula.
  const lbm = bf > 0 ? kg * (1 - bf / 100) : female ? 0.252 * kg + 0.473 * cm - 48.3 : 0.407 * kg + 0.267 * cm - 19.2;
  const mifflin = 10 * kg + 6.25 * cm - 5 * age + (female ? -161 : 5);
  const harris = female ? 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age : 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age;
  const cunningham = 500 + 22 * lbm;
  const katch = 370 + 21.6 * lbm;
  return { kg, lbm, mifflin, harris, cunningham, katch, bf };
}

// --- 1. Energy Availability -------------------------------------------------
export const energyAvailabilityCalculator: CustomCalculator = (values) => {
  const kg = imperial(values.unit) ? nonNeg(values.weight, 132) * LB : nonNeg(values.weight, 60);
  const ffm = kg * (1 - Math.min(60, nonNeg(values.bodyFatPercent, 20)) / 100);
  const ea = ffm > 0 ? (nonNeg(values.energyIntake, 2200) - nonNeg(values.exerciseEnergy, 600)) / ffm : 0;

  return {
    energyAvailability: round2(ea),
    // 1 low (<30), 2 reduced (30–45), 3 optimal (≥45) kcal/kg FFM/day.
    status: ea < 30 ? 1 : ea < 45 ? 2 : 3,
    fatFreeMass: round2(imperial(values.unit) ? ffm / LB : ffm),
    intakeForOptimal: Math.round(45 * ffm + nonNeg(values.exerciseEnergy, 600)),
    intakeForMinimum: Math.round(30 * ffm + nonNeg(values.exerciseEnergy, 600)),
  };
};

// --- 2. BMR for Athletes ----------------------------------------------------
export const bmrForAthletesCalculator: CustomCalculator = (values) => {
  const b = bmrSet(values);
  return {
    bmrCunningham: Math.round(b.cunningham),
    bmrKatchMcArdle: Math.round(b.katch),
    bmrMifflin: Math.round(b.mifflin),
    bmrHarrisBenedict: Math.round(b.harris),
    leanBodyMass: round2(imperial(values.unitSystem) ? b.lbm / LB : b.lbm),
  };
};

// --- 3. TDEE for Athletes ---------------------------------------------------
// Everyday activity outside training (multiplier on BMR).
const NEAT: Record<number, number> = { 1: 1.3, 2: 1.4, 3: 1.5, 4: 1.6 };
// Training intensity → MET.
const TRAIN_MET: Record<number, number> = { 1: 5, 2: 7, 3: 9, 4: 11 };

export const tdeeForAthletesCalculator: CustomCalculator = (values) => {
  const b = bmrSet(values);
  const bmr = b.bf > 0 ? b.cunningham : b.mifflin;
  const base = bmr * (NEAT[whole(values.dailyActivity, 2)] ?? 1.4);
  const met = TRAIN_MET[whole(values.trainingIntensity, 2)] ?? 7;
  const hours = nonNeg(values.trainingHoursPerWeek, 8);
  // Training calories above resting: (MET − 1) × kg × hours.
  const training = ((met - 1) * b.kg * hours) / 7;
  const tdee = base + training;

  return {
    tdee: Math.round(tdee),
    bmr: Math.round(bmr),
    nonTrainingCalories: Math.round(base),
    trainingCaloriesPerDay: Math.round(training),
    trainingDayCalories: Math.round(base + ((met - 1) * b.kg * hours) / Math.max(1, whole(values.trainingDays, 5))),
  };
};

// --- 4. Macros for Athletes -------------------------------------------------
// Carbohydrate g/kg by training load (IOC / ACSM sports nutrition ranges).
const CARBS: Record<number, number> = { 1: 4, 2: 6, 3: 8, 4: 10 };

export const macroForAthletesCalculator: CustomCalculator = (values) => {
  const kg = imperial(values.unit) ? nonNeg(values.weight, 165) * LB : nonNeg(values.weight, 75);
  const kcal = nonNeg(values.calories, 3000);
  const protein = kg * Math.min(3, nonNeg(values.proteinPerKg, 1.8));
  let carbs = kg * (CARBS[whole(values.trainingLoad, 2)] ?? 6);
  // Fat fills the rest, but never below 20% of calories; carbs give way first.
  let fat = (kcal - protein * 4 - carbs * 4) / 9;
  const minFat = (kcal * 0.2) / 9;
  if (fat < minFat) {
    fat = minFat;
    carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  }
  const pct = (g: number, k: number) => (kcal > 0 ? round2(((g * k) / kcal) * 100) : 0);

  return {
    carbGrams: Math.round(carbs),
    proteinGrams: Math.round(protein),
    fatGrams: Math.round(fat),
    carbPercent: pct(carbs, 4),
    proteinPercent: pct(protein, 4),
    fatPercent: pct(fat, 9),
    carbsPerKg: kg > 0 ? round2(carbs / kg) : 0,
  };
};

// --- 5. Calories Burned by Activity (MET) -----------------------------------
// MET values from the 2011 Compendium of Physical Activities.
const MET: Record<number, number> = {
  1: 3.5, // walking 3 mph
  2: 5.0, // walking 4 mph brisk
  3: 6.0, // hiking
  4: 8.3, // running 5 mph (12 min/mile)
  5: 9.8, // running 6 mph (10 min/mile)
  6: 11.8, // running 8 mph (7.5 min/mile)
  7: 8.0, // cycling 12–13.9 mph
  8: 10.0, // cycling 14–15.9 mph
  9: 6.8, // stationary bike, moderate
  10: 5.8, // swimming laps, light/moderate
  11: 9.8, // swimming laps, vigorous
  12: 5.0, // elliptical, moderate
  13: 7.0, // rowing machine, moderate
  14: 11.8, // jump rope, moderate
  15: 8.8, // stair climbing
  16: 8.0, // circuit training / HIIT
  17: 6.0, // weight training, vigorous
  18: 2.5, // yoga
  19: 7.3, // aerobic dance
  20: 8.0, // basketball game
  21: 10.0, // soccer, competitive
  22: 8.0, // tennis singles
  23: 7.8, // boxing, sparring
  24: 4.8, // golf, walking and carrying clubs
};

export const caloriesBurnedByActivityCalculator: CustomCalculator = (values) => {
  const kg = imperial(values.unit) ? nonNeg(values.weight, 165) * LB : nonNeg(values.weight, 75);
  const custom = nonNeg(values.customMet, 0);
  const met = custom > 0 ? custom : MET[whole(values.activity, 5)] ?? 5;
  const minutes = nonNeg(values.minutes, 30);
  const perMin = (met * 3.5 * kg) / 200;

  return {
    caloriesBurned: Math.round(perMin * minutes),
    caloriesPerHour: Math.round(perMin * 60),
    metValue: met,
    metMinutes: round2(met * minutes),
  };
};

// --- 6. Weightlifting Calories Burned ---------------------------------------
const LIFT_MET: Record<number, number> = { 1: 3.5, 2: 5.0, 3: 6.0, 4: 8.0 };

export const weightliftingCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const kg = imperial(values.unit) ? nonNeg(values.weight, 180) * LB : nonNeg(values.weight, 80);
  const met = LIFT_MET[whole(values.intensity, 2)] ?? 5;
  const minutes = nonNeg(values.minutes, 60);
  const during = ((met * 3.5 * kg) / 200) * minutes;
  // After-burn (EPOC) from resistance training: roughly 6–15% extra.
  const epoc = during * 0.1;

  return {
    caloriesDuringWorkout: Math.round(during),
    afterburnCalories: Math.round(epoc),
    totalCalories: Math.round(during + epoc),
    caloriesPerHour: Math.round((met * 3.5 * kg * 60) / 200),
  };
};

// --- 7. Target Heart Rate (Karvonen) ----------------------------------------
export const targetHeartRateCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.age, 30);
  const rest = nonNeg(values.restingHr, 65);
  const formula = whole(values.maxHrFormula, 1);
  const measured = nonNeg(values.measuredMaxHr, 0);
  const max = formula === 3 && measured > 0 ? measured : formula === 2 ? 208 - 0.7 * age : 220 - age;
  const hrr = Math.max(0, max - rest);
  const at = (p: number) => Math.round(rest + hrr * p);
  const lo = Math.min(100, nonNeg(values.intensityLow, 60)) / 100;
  const hi = Math.min(100, nonNeg(values.intensityHigh, 80)) / 100;

  return {
    targetLow: at(lo),
    targetHigh: at(hi),
    maxHeartRate: Math.round(max),
    heartRateReserve: Math.round(hrr),
    fatBurningZoneLow: at(0.6),
    fatBurningZoneHigh: at(0.7),
    aerobicZoneLow: at(0.7),
    aerobicZoneHigh: at(0.8),
    anaerobicZoneLow: at(0.8),
    anaerobicZoneHigh: at(0.9),
  };
};

// --- 8. VO2 Max -------------------------------------------------------------
export const vo2MaxCalculator: CustomCalculator = (values) => {
  const method = whole(values.method, 1);
  let vo2: number;
  if (method === 2) {
    // Cooper 12-minute run (metres).
    vo2 = (nonNeg(values.distanceMeters, 2400) - 504.9) / 44.73;
  } else if (method === 3) {
    // Rockport 1-mile walk (weight lb, time min, HR at finish).
    const lb = imperial(values.unit) ? nonNeg(values.weight, 165) : nonNeg(values.weight, 75) / LB;
    vo2 = 132.853 - 0.0769 * lb - 0.3877 * nonNeg(values.age, 30) + 6.315 * (isFemale(values.sex) ? 0 : 1) - 3.2649 * nonNeg(values.timeMinutes, 15) - 0.1565 * nonNeg(values.finishHr, 130);
  } else if (method === 4) {
    // 1.5-mile run (minutes).
    vo2 = 3.5 + 483 / Math.max(5, nonNeg(values.timeMinutes, 12));
  } else {
    // Uth–Sørensen heart-rate ratio.
    const max = nonNeg(values.maxHr, 190);
    const rest = Math.max(30, nonNeg(values.restingHr, 60));
    vo2 = 15.3 * (max / rest);
  }
  vo2 = Math.max(0, vo2);

  return {
    vo2Max: round2(vo2),
    mets: round2(vo2 / 3.5),
    // Equivalent Cooper 12-minute distance.
    cooperDistanceMeters: Math.round(vo2 * 44.73 + 504.9),
  };
};

export const sportsEnergyCustomCalculators: Record<string, CustomCalculator> = {
  "energy-availability-calculator": energyAvailabilityCalculator,
  "bmr-for-athletes-calculator": bmrForAthletesCalculator,
  "tdee-for-athletes-calculator": tdeeForAthletesCalculator,
  "macro-for-athletes-calculator": macroForAthletesCalculator,
  "calories-burned-by-activity-calculator": caloriesBurnedByActivityCalculator,
  "weightlifting-calories-burned-calculator": weightliftingCaloriesBurnedCalculator,
  "target-heart-rate-calculator": targetHeartRateCalculator,
  "vo2-max-calculator": vo2MaxCalculator,
};
