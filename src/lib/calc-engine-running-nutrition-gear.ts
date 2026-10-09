/**
 * Batch: "Sports Calculators" > Running Calculators, sub-batch D (Running
 * Nutrition, Body & Gear, 8 tools). See calc-engine-running-pace.ts for the
 * full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - runCalorieCalculator: calories for ONE run from distance, pace,
 *    weight and hills (ACSM running equation) — also the calorie
 *    calculator for runners.
 *  - runningWeightLossCalculator: weekly running → fat lost per week and
 *    weeks to a goal weight.
 *  - idealRunningWeightCalculator: race weight from a target body fat %,
 *    and the time it could save.
 *  - sweatRateCalculator: sweat rate from a weigh-in test, plus sodium loss.
 *  - marathonFuelingCalculator: carbs, gels, fluid and sodium during a race
 *    (marathon, half, ultra or triathlon — also triathlon nutrition).
 *  - marathonCarbLoadingCalculator: carbohydrate in the days before a race.
 *  - triathlonCalculator: swim, T1, bike, T2 and run → finish time
 *    (sprint, Olympic, 70.3 and Ironman).
 *  - runningShoeSizeCalculator: foot length → US, UK and EU running sizes.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-running-nutrition-gear-calculators.ts for the copy.
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
const LB = 0.45359237;
const msSeconds = (v: Record<string, number>, p: string, dm: number, ds: number) => nonNeg(v[`${p}Min`], dm) * 60 + nonNeg(v[`${p}Sec`], ds);
function hms(prefix: string, sec: number) {
  const t = Math.round(Math.max(0, sec));
  return { [`${prefix}Hours`]: Math.floor(t / 3600), [`${prefix}Minutes`]: Math.floor((t % 3600) / 60), [`${prefix}Seconds`]: t % 60 };
}
const isLb = (v: number) => whole(v, 1) === 2;
const kgOf = (w: number, unit: number) => (isLb(unit) ? w * LB : w);

/** ACSM running VO2 (ml/kg/min) at speed v (m/min) and fractional grade. */
const acsmVo2 = (v: number, grade: number) => 0.2 * v + 0.9 * v * grade + 3.5;

// --- 1. Run Calorie ---------------------------------------------------------
export const runCalorieCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 70), values.weightUnit);
  const miles = whole(values.distanceUnit, 1) === 2;
  const km = nonNeg(values.distance, 10) * (miles ? MILE : 1);
  const pace = msSeconds(values, "pace", 6, 0) / (miles ? MILE : 1); // s per km
  const minutes = (pace * km) / 60;
  const v = pace > 0 ? 1000 / (pace / 60) : 0;
  const grade = Math.min(0.15, Math.max(0, nonNeg(values.gradePercent, 0) / 100));
  const vo2 = acsmVo2(v, grade);
  const gross = ((vo2 * kg) / 1000) * 5 * minutes;
  const net = (((vo2 - 3.5) * kg) / 1000) * 5 * minutes;

  return {
    caloriesBurned: Math.round(gross),
    netCalories: Math.round(net),
    caloriesPerKm: km > 0 ? round2(gross / km) : 0,
    caloriesPerMile: km > 0 ? round2((gross / km) * MILE) : 0,
    durationMinutes: round2(minutes),
  };
};

// --- 2. Running Weight Loss -------------------------------------------------
export const runningWeightLossCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 85), values.weightUnit);
  const goalKg = kgOf(nonNeg(values.goalWeight, 78), values.weightUnit);
  const miles = whole(values.distanceUnit, 1) === 2;
  const weeklyKm = nonNeg(values.weeklyDistance, 25) * (miles ? MILE : 1);
  // Net running cost ≈ 1 kcal per kg per km (ACSM net, flat).
  const runKcal = weeklyKm * kg * 0.95;
  const diet = nonNeg(values.dailyDeficit, 300) * 7;
  const weekly = runKcal + diet;
  const kgPerWeek = weekly / 7700;
  const weeks = goalKg < kg && kgPerWeek > 0 ? (kg - goalKg) / kgPerWeek : 0;
  const out = (x: number) => round2(isLb(values.weightUnit) ? x / LB : x);

  return {
    weightLossPerWeek: out(kgPerWeek),
    weeksToGoal: round2(weeks),
    runningCaloriesPerWeek: Math.round(runKcal),
    totalWeeklyDeficit: Math.round(weekly),
    lossPerMonth: out(kgPerWeek * 4.345),
  };
};

// --- 3. Ideal Running Weight ------------------------------------------------
export const idealRunningWeightCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 75), values.weightUnit);
  const bf = Math.min(60, nonNeg(values.bodyFatPercent, 20));
  const female = whole(values.sex, 1) === 2;
  const target = Math.min(60, nonNeg(values.targetBodyFat, female ? 18 : 10));
  const lean = kg * (1 - bf / 100);
  const raceKg = lean / (1 - target / 100);
  const lossKg = Math.max(0, kg - raceKg);
  const m = nonNeg(values.height, 178) * (isLb(values.weightUnit) ? 0.0254 : 0.01);
  // Rule of thumb: ~2 s per mile faster for each pound lost (fat only).
  const raceMiles = nonNeg(values.raceDistanceKm, 42.195) / MILE;
  const saved = (lossKg / LB) * 2 * raceMiles;
  const out = (x: number) => round2(isLb(values.weightUnit) ? x / LB : x);

  return {
    raceWeight: out(raceKg),
    weightToLose: out(lossKg),
    raceWeightBmi: m > 0 ? round2(raceKg / (m * m)) : 0,
    estimatedTimeSavedMinutes: round2(saved / 60),
  };
};

// --- 4. Sweat Rate (and sodium loss) ----------------------------------------
const SODIUM_MG_PER_L: Record<number, number> = { 1: 500, 2: 950, 3: 1500 };

export const sweatRateCalculator: CustomCalculator = (values) => {
  const lb = isLb(values.weightUnit);
  const pre = nonNeg(values.preWeight, 70) * (lb ? LB : 1);
  const post = nonNeg(values.postWeight, 69.2) * (lb ? LB : 1);
  const fluidL = nonNeg(values.fluidIntake, 500) / (lb ? 33.814 : 1000); // fl oz or ml
  const urineL = nonNeg(values.urine, 0) / (lb ? 33.814 : 1000);
  const hours = Math.max(0.1, nonNeg(values.durationMinutes, 60) / 60);
  const sweatL = pre - post + fluidL - urineL;
  const rate = sweatL / hours;
  const sodium = SODIUM_MG_PER_L[whole(values.sweatSaltiness, 2)] ?? 950;

  return {
    sweatRateLitersPerHour: round2(rate),
    sweatRateOzPerHour: round2(rate * 33.814),
    bodyWeightLossPercent: pre > 0 ? round2(((pre - post) / pre) * 100) : 0,
    sodiumLossMgPerHour: Math.round(rate * sodium),
    // Replace most, not all, of sweat losses during exercise.
    drinkPerHourMl: Math.round(rate * 1000 * 0.75),
  };
};

// --- 5. Race Fueling --------------------------------------------------------
export const marathonFuelingCalculator: CustomCalculator = (values) => {
  const hours = nonNeg(values.finishHours, 4) + nonNeg(values.finishMinutes, 0) / 60;
  // Carbs per hour by race length (ACSM / Jeukendrup).
  const perHour = nonNeg(values.carbsPerHour, 0) || (hours < 1 ? 0 : hours < 2.5 ? 45 : 75);
  const gel = Math.max(1, nonNeg(values.gelCarbs, 25));
  // Fueling starts after ~30 minutes.
  const fuelHours = Math.max(0, hours - 0.5);
  const carbs = perHour * fuelHours;
  const gels = Math.ceil(carbs / gel);
  const sweat = nonNeg(values.sweatRate, 0.8);

  return {
    totalCarbs: Math.round(carbs),
    carbsPerHour: Math.round(perHour),
    gelsNeeded: gels,
    gelEveryMinutes: gels > 0 ? Math.round((fuelHours * 60) / gels) : 0,
    fluidPerHourMl: Math.round(Math.min(800, sweat * 1000 * 0.75)),
    sodiumPerHourMg: Math.round(Math.min(1000, sweat * 700)),
  };
};

// --- 6. Carb Loading --------------------------------------------------------
export const marathonCarbLoadingCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 70), values.weightUnit);
  const perKg = Math.min(12, Math.max(6, nonNeg(values.gramsPerKg, 10)));
  const days = Math.min(3, Math.max(1, whole(values.days, 2)));
  const daily = kg * perKg;

  return {
    carbsPerDay: Math.round(daily),
    totalCarbs: Math.round(daily * days),
    caloriesFromCarbsPerDay: Math.round(daily * 4),
    carbsPerMeal: Math.round(daily / 5),
    raceMorningCarbs: Math.round(kg * 2),
  };
};

// --- 7. Triathlon -----------------------------------------------------------
// [swim km, bike km, run km]
const TRI: Record<number, number[]> = { 1: [0.75, 20, 5], 2: [1.5, 40, 10], 3: [1.9, 90, 21.0975], 4: [3.8, 180.2, 42.195] };

export const triathlonCalculator: CustomCalculator = (values) => {
  const d = TRI[whole(values.race, 2)] ?? TRI[2];
  const swim = (msSeconds(values, "swimPace", 2, 0) * d[0] * 1000) / 100; // pace per 100 m
  const bikeSpeed = Math.max(1, nonNeg(values.bikeKmh, 30));
  const bike = (d[1] / bikeSpeed) * 3600;
  const run = msSeconds(values, "runPace", 5, 30) * d[2]; // per km
  const t1 = nonNeg(values.t1Minutes, 3) * 60;
  const t2 = nonNeg(values.t2Minutes, 2) * 60;
  const total = swim + t1 + bike + t2 + run;

  return {
    ...hms("finish", total),
    swimMinutes: round2(swim / 60),
    bikeMinutes: round2(bike / 60),
    runMinutes: round2(run / 60),
    transitionMinutes: round2((t1 + t2) / 60),
  };
};

// --- 8. Running Shoe Size ---------------------------------------------------
export const runningShoeSizeCalculator: CustomCalculator = (values) => {
  const cm = nonNeg(values.footLength, 26.5) * (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const inches = cm / 2.54;
  // Brannock scale: US men's = 3 × foot length (in) − 22; women's = men's + 1.5;
  // UK = men's − 0.5 (approx.); EU (Paris points) = 1.5 × (foot + 1.5 cm).
  const usMen = 3 * inches - 22;
  const half = (x: number) => Math.round(x * 2) / 2;
  // Running shoes: about half a size up for toe room (~1 cm / a thumb's width).
  const run = 0.5;

  return {
    usMensRunning: half(usMen + run),
    usWomensRunning: half(usMen + 1.5 + run),
    ukRunning: half(usMen - 0.5 + run),
    euRunning: half(1.5 * (cm + 1.5) + 0.75),
    mondopointMm: Math.round(cm * 10),
    usMensStreet: half(usMen),
  };
};

export const runningNutritionGearCustomCalculators: Record<string, CustomCalculator> = {
  "run-calorie-calculator": runCalorieCalculator,
  "running-weight-loss-calculator": runningWeightLossCalculator,
  "ideal-running-weight-calculator": idealRunningWeightCalculator,
  "sweat-rate-calculator": sweatRateCalculator,
  "marathon-fueling-calculator": marathonFuelingCalculator,
  "marathon-carb-loading-calculator": marathonCarbLoadingCalculator,
  "triathlon-calculator": triathlonCalculator,
  "running-shoe-size-calculator": runningShoeSizeCalculator,
};
