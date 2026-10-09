/**
 * Batch: "Sports Calculators" > Cycling Calculators, sub-batch D (Rides,
 * Climbing, Energy & E-Bikes, 14 tools). See calc-engine-cycling-fit.ts
 * for the full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bikePaceCalculator: speed, pace and time for a distance (also cycling
 *    time and bike mileage).
 *  - stationaryBikeDistanceCalculator: road-equivalent distance from
 *    indoor power.
 *  - cyclingElevationGainCalculator / cyclingGradientCalculator /
 *    vamCalculator: climbing metrics.
 *  - bikingCalorieCalculator: outdoor rides by speed, MTB or e-bike (also
 *    ebike calorie), or from average power.
 *  - stationaryBikeCalorieCalculator: indoor bike by watts band.
 *  - cyclingNutritionCalculator: carbs per hour and fuel plan (also carbs
 *    per hour cycling).
 *  - cyclingHydrationCalculator: fluid and sodium per hour.
 *  - cyclingToRunningConversionCalculator / stepConversionCalculator:
 *    cycling credited as running distance or steps.
 *  - electricBikeRangeCalculator: range and battery Wh (also ebike
 *    battery).
 *  - ebikeSpeedCalculator: hub-motor top speed vs legal class limits.
 *  - bikingVsDrivingCalculator: yearly cost, CO2 and calories of a bike
 *    commute vs a car.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-cycling-ride-calculators.ts for the copy.
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
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);
const KM_MI = 1.609344;

// --- 1. Bike Pace (and cycling time, mileage) -------------------------------
export const bikePaceCalculator: CustomCalculator = (values) => {
  const dist = nonNeg(values.distance, 40);
  const min = nonNeg(values.hours, 1) * 60 + nonNeg(values.minutes, 20) + nonNeg(values.seconds, 0) / 60;
  const speed = div(dist, min / 60);
  const pace = div(min, dist); // minutes per km/mi
  const target = nonNeg(values.targetSpeed, 30);

  return {
    averageSpeed: round2(speed),
    paceMinutes: Math.floor(pace),
    paceSeconds: Math.round((pace - Math.floor(pace)) * 60) % 60,
    timeAtTargetSpeedMinutes: round2(div(dist, target) * 60),
    distanceIn3Hours: round2(speed * 3),
  };
};

// --- 2. Stationary Bike Distance --------------------------------------------
/** Flat-road speed (m/s) for a power: CdA 0.32, Crr 0.004, 80 kg system. */
function flatSpeed(watts: number, mass = 80): number {
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    if ((0.5 * 1.225 * 0.32 * v ** 3 + 0.004 * mass * 9.81 * v) / 0.975 > watts) hi = v;
    else lo = v;
  }
  return lo;
}

export const stationaryBikeDistanceCalculator: CustomCalculator = (values) => {
  const min = nonNeg(values.minutes, 45);
  const mode = whole(values.mode, 1); // 1 average power, 2 bike's speed reading
  const kmh = mode === 2 ? nonNeg(values.displayedSpeedKmh, 25) : flatSpeed(nonNeg(values.averageWatts, 150)) * 3.6;
  const km = (kmh * min) / 60;

  return { distanceKm: round2(km), distanceMiles: round2(km / KM_MI), equivalentSpeedKmh: round2(kmh), equivalentSpeedMph: round2(kmh / KM_MI) };
};

// --- 3. Cycling Elevation Gain ----------------------------------------------
export const cyclingElevationGainCalculator: CustomCalculator = (values) => {
  const km = nonNeg(values.climbDistanceKm, 20);
  const grade = nonNeg(values.averageGradientPercent, 4);
  const m = km * 1000 * (grade / 100);
  const hours = nonNeg(values.rideHours, 2);

  return { elevationGainM: Math.round(m), elevationGainFt: Math.round(m * 3.28084), equivalentFloors: Math.round(m / 3), climbingRateMPerHour: Math.round(div(m, hours)) };
};

// --- 4. Cycling Gradient ----------------------------------------------------
export const cyclingGradientCalculator: CustomCalculator = (values) => {
  const rise = nonNeg(values.elevationGainM, 300);
  const distM = nonNeg(values.distanceKm, 5) * 1000;
  const grade = div(rise, distM) * 100;
  // Strava-style climb score: length (m) × average grade (%).
  const score = distM * grade;

  return {
    gradientPercent: round2(grade),
    angleDegrees: round2((Math.atan(grade / 100) * 180) / Math.PI),
    difficulty: grade < 3 ? 1 : grade < 6 ? 2 : grade < 9 ? 3 : grade < 12 ? 4 : 5,
    climbScore: Math.round(score),
    // 0 uncategorised, 1 Cat 4, 2 Cat 3, 3 Cat 2, 4 Cat 1, 5 HC.
    climbCategory: score >= 80000 ? 5 : score >= 64000 ? 4 : score >= 32000 ? 3 : score >= 16000 ? 2 : score >= 8000 ? 1 : 0,
  };
};

// --- 5. VAM -----------------------------------------------------------------
export const vamCalculator: CustomCalculator = (values) => {
  const gain = nonNeg(values.elevationGainM, 800);
  const min = nonNeg(values.minutes, 40);
  const grade = nonNeg(values.gradientPercent, 8);
  const vam = div(gain, min / 60);
  // Ferrari's estimate: W/kg ≈ VAM ÷ ((2 + gradient ÷ 10) × 100).
  const wkg = vam / ((2 + grade / 10) * 100);

  return { vamMetresPerHour: Math.round(vam), estimatedWattsPerKg: round2(wkg), level: vam < 700 ? 1 : vam < 1000 ? 2 : vam < 1300 ? 3 : vam < 1600 ? 4 : 5 };
};

// --- 6. Biking Calorie (and e-bike) -----------------------------------------
// Compendium of Physical Activities METs by riding type.
const BIKE_MET: Record<number, number> = { 1: 4.0, 2: 6.8, 3: 8.0, 4: 10.0, 5: 12.0, 6: 15.8, 7: 8.5, 8: 5.5 };

export const bikingCalorieCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const min = nonNeg(values.minutes, 60);
  const watts = nonNeg(values.averageWatts, 0);
  const met = BIKE_MET[whole(values.rideType, 3)] ?? 8;
  // With a power meter: kJ of work ≈ kcal burned (about 24% efficiency).
  const kcal = watts > 0 ? (watts * min * 60) / 1000 : (met * w * min) / 60;

  return { caloriesBurned: Math.round(kcal), caloriesPerHour: Math.round(div(kcal, min) * 60), metUsed: watts > 0 ? 0 : met };
};

// --- 7. Stationary Bike Calorie ---------------------------------------------
const STATIONARY_MET: Record<number, number> = { 1: 3.5, 2: 4.8, 3: 6.8, 4: 8.8, 5: 11.0, 6: 14.0 };

export const stationaryBikeCalorieCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const min = nonNeg(values.minutes, 45);
  const watts = nonNeg(values.averageWatts, 0);
  const met = STATIONARY_MET[whole(values.intensity, 3)] ?? 6.8;
  const kcal = watts > 0 ? (watts * min * 60) / 1000 : (met * w * min) / 60;

  return { caloriesBurned: Math.round(kcal), caloriesPerHour: Math.round(div(kcal, min) * 60), metUsed: watts > 0 ? 0 : met };
};

// --- 8. Cycling Nutrition (carbs per hour) ----------------------------------
export const cyclingNutritionCalculator: CustomCalculator = (values) => {
  const hours = nonNeg(values.hours, 3);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const intensity = whole(values.intensity, 2); // 1 easy, 2 moderate, 3 hard/race
  const trained = whole(values.gutTrained, 0) === 1;
  // Guidance: < 1 h none needed; 1–2.5 h 30–60 g/h; > 2.5 h 60–90 g/h (up to 120 if trained).
  let g = hours < 1 ? 0 : hours <= 2.5 ? [30, 45, 60][intensity - 1] ?? 45 : [60, 75, 90][intensity - 1] ?? 75;
  if (trained && hours > 2.5 && intensity === 3) g = 110;
  const total = g * hours;

  return { carbsPerHourG: g, totalCarbsG: Math.round(total), gelsNeeded: Math.ceil(total / 25), carbCaloriesPerHour: g * 4, preRideCarbsG: Math.round(w * 2) };
};

// --- 9. Cycling Hydration ---------------------------------------------------
export const cyclingHydrationCalculator: CustomCalculator = (values) => {
  const hours = nonNeg(values.hours, 2);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const tC = safeNumber(values.temperatureC, 25);
  const intensity = whole(values.intensity, 2);
  const custom = nonNeg(values.sweatRateLPerHour, 0);
  // Estimated sweat rate: 0.5 L/h at 20 °C, +0.03 L/h per °C, ±0.2 L/h for intensity.
  const sweat = custom || Math.max(0.3, 0.5 + 0.03 * (tC - 20) + (intensity === 1 ? -0.2 : intensity === 3 ? 0.2 : 0));
  // Replace about 80% of sweat losses.
  const drink = sweat * 0.8;

  return {
    fluidPerHourMl: Math.round(drink * 1000),
    totalFluidL: round2(drink * hours),
    bottles750ml: Math.ceil((drink * hours) / 0.75),
    sodiumPerHourMg: Math.round(sweat * 900 * 0.8),
    weightLossIfNoDrinkPercent: w > 0 ? round2(((sweat * hours) / w) * 100) : 0,
  };
};

// --- 10. Cycling to Running Conversion --------------------------------------
const RUN_RATIO: Record<number, number> = { 1: 3, 2: 4, 3: 2 };

export const cyclingToRunningConversionCalculator: CustomCalculator = (values) => {
  const d = nonNeg(values.cyclingDistance, 30);
  const ratio = RUN_RATIO[whole(values.rideType, 1)] ?? 3;

  return { runningEquivalent: round2(d / ratio), ratioUsed: ratio, cyclingNeededFor10: round2(10 * ratio) };
};

// --- 11. Step Conversion (cycling to steps) ---------------------------------
const STEP_RATE: Record<number, number> = { 1: 100, 2: 150, 3: 200 };

export const stepConversionCalculator: CustomCalculator = (values) => {
  const min = nonNeg(values.minutes, 45);
  const rate = STEP_RATE[whole(values.intensity, 2)] ?? 150;
  const steps = min * rate;

  return { equivalentSteps: Math.round(steps), stepsPerMinute: rate, walkingDistanceKm: round2((steps * 0.762) / 1000), minutesFor10000Steps: Math.round(10000 / rate) };
};

// --- 12. Electric Bike Range (and battery) ----------------------------------
const ASSIST_WH_KM: Record<number, number> = { 1: 6, 2: 9, 3: 13, 4: 18 };
const TERRAIN: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.45 };

export const electricBikeRangeCalculator: CustomCalculator = (values) => {
  const wh = nonNeg(values.batteryVolts, 36) * nonNeg(values.batteryAh, 13);
  const rider = nonNeg(values.riderWeightKg, 75);
  const perKm = (ASSIST_WH_KM[whole(values.assistLevel, 2)] ?? 9) * (TERRAIN[whole(values.terrain, 1)] ?? 1) * (1 + (rider - 75) / 150);
  const range = (wh * 0.9) / Math.max(0.5, perKm);
  const charger = Math.max(0.1, nonNeg(values.chargerAmps, 4));

  return {
    rangeKm: round2(range),
    rangeMiles: round2(range / KM_MI),
    batteryWh: Math.round(wh),
    whPerKm: round2(perKm),
    chargeTimeHours: round2((nonNeg(values.batteryAh, 13) / charger) * 1.15),
    costPerFullCharge: round2(((wh / 1000) / 0.9) * nonNeg(values.electricityPrice, 0.15)),
  };
};

// --- 13. Ebike Speed --------------------------------------------------------
const LIMIT_KMH: Record<number, number> = { 1: 32.19, 2: 45.06, 3: 25 };

export const ebikeSpeedCalculator: CustomCalculator = (values) => {
  const rpm = nonNeg(values.motorKv, 9) * nonNeg(values.voltage, 48) * (Math.min(100, nonNeg(values.loadPercent, 85)) / 100);
  const wheelIn = nonNeg(values.wheelDiameterIn, 26);
  const mph = (rpm * Math.PI * wheelIn * 60) / 63360;
  const kmh = mph * KM_MI;
  const limit = LIMIT_KMH[whole(values.legalClass, 1)] ?? 32.19;

  return { topSpeedKmh: round2(kmh), topSpeedMph: round2(mph), wheelRpm: Math.round(rpm), assistLimitKmh: limit, exceedsAssistLimit: kmh > limit ? 1 : 0 };
};

// --- 14. Biking vs Driving --------------------------------------------------
export const bikingVsDrivingCalculator: CustomCalculator = (values) => {
  const trips = nonNeg(values.daysPerWeek, 5) * nonNeg(values.weeksPerYear, 48) * 2;
  const km = nonNeg(values.oneWayKm, 10) * trips;
  const car = km * nonNeg(values.carCostPerKm, 0.25) + (trips / 2) * nonNeg(values.parkingPerDay, 5);
  const bike = km * nonNeg(values.bikeCostPerKm, 0.05);
  const w = nonNeg(values.riderWeightKg, 70);
  const bikeKmh = Math.max(1, nonNeg(values.bikeSpeedKmh, 18));
  const carKmh = Math.max(1, nonNeg(values.carSpeedKmh, 35));
  const hours = km / bikeKmh;

  return {
    annualSavings: round2(car - bike),
    carCostPerYear: round2(car),
    bikeCostPerYear: round2(bike),
    co2SavedKg: Math.round((km * nonNeg(values.carCo2GPerKm, 170)) / 1000),
    caloriesPerYear: Math.round(6.8 * w * hours),
    extraMinutesPerTrip: round2(trips > 0 ? ((km / bikeKmh - km / carKmh) * 60) / trips : 0),
  };
};

export const cyclingRideCustomCalculators: Record<string, CustomCalculator> = {
  "bike-pace-calculator": bikePaceCalculator,
  "stationary-bike-distance-calculator": stationaryBikeDistanceCalculator,
  "cycling-elevation-gain-calculator": cyclingElevationGainCalculator,
  "cycling-gradient-calculator": cyclingGradientCalculator,
  "vam-calculator": vamCalculator,
  "biking-calorie-calculator": bikingCalorieCalculator,
  "stationary-bike-calorie-calculator": stationaryBikeCalorieCalculator,
  "cycling-nutrition-calculator": cyclingNutritionCalculator,
  "cycling-hydration-calculator": cyclingHydrationCalculator,
  "cycling-to-running-conversion-calculator": cyclingToRunningConversionCalculator,
  "step-conversion-calculator": stepConversionCalculator,
  "electric-bike-range-calculator": electricBikeRangeCalculator,
  "ebike-speed-calculator": ebikeSpeedCalculator,
  "biking-vs-driving-calculator": bikingVsDrivingCalculator,
};
