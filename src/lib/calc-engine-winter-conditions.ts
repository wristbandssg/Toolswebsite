/**
 * Batch: "Sports Calculators" > Winter Sports Calculators, sub-batch B
 * (Weather, Snow, Safety & Trip, 9 tools). See calc-engine-winter-gear.ts
 * for the full list of 2 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - slopeAngleCalculator: slope steepness in degrees and % grade, with
 *    piste rating and avalanche-angle flag.
 *  - caloriesBurnedSkiingCalculator: a ski/snowboard/Nordic day, active
 *    time vs lift time.
 *  - caloriesBurnedShovelingSnowCalculator: shovelling or snow blowing,
 *    plus the weight of snow moved.
 *  - windChillCalculator: NWS / Environment Canada wind chill index.
 *  - frostbiteTimeCalculator: minutes to frostbite on exposed skin.
 *  - iceThicknessCalculator: safe ice thickness for an activity.
 *  - snowfallCalculator: liquid precipitation → snow depth by temperature.
 *  - snowWaterEquivalentCalculator: snow depth → water and roof load.
 *  - skiTripCostCalculator: trip budget per person and per day.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-winter-conditions-calculators.ts for the copy.
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
const LB_KG = 0.45359237;
const DEG = 180 / Math.PI;
const fToC = (f: number) => ((f - 32) * 5) / 9;
const cToF = (c: number) => (c * 9) / 5 + 32;

// --- 1. Slope Angle ---------------------------------------------------------
export const slopeAngleCalculator: CustomCalculator = (values) => {
  const mode = whole(values.mode, 1); // 1 rise & run, 2 rise & slope length, 3 % grade
  const rise = nonNeg(values.rise, 100);
  let deg: number;
  if (mode === 3) deg = Math.atan(nonNeg(values.gradePercent, 30) / 100) * DEG;
  else if (mode === 2) deg = Math.asin(Math.min(1, rise / Math.max(rise, nonNeg(values.slopeLength, 320), 1e-9))) * DEG;
  else deg = Math.atan2(rise, Math.max(1e-9, nonNeg(values.run, 300))) * DEG;
  const grade = Math.tan(deg / DEG) * 100;

  return {
    slopeDegrees: round2(deg),
    gradePercent: round2(Math.min(grade, 100000)),
    // North American trail ratings: green < 25%, blue 25–40%, black 40%+.
    pisteRating: grade < 25 ? 1 : grade < 40 ? 2 : 3,
    // Most slab avalanches start on 30–45° slopes.
    avalancheAngle: deg >= 30 && deg <= 45 ? 1 : 0,
  };
};

// --- 2. Calories Burned Skiing ----------------------------------------------
// Compendium of Physical Activities METs (active time).
const SKI_MET: Record<number, number> = { 1: 4.3, 2: 5.3, 3: 8.0, 4: 6.8, 5: 9.0, 6: 12.5, 7: 15.0 };
const REST_MET = 1.5; // sitting on lifts / queueing

export const caloriesBurnedSkiingCalculator: CustomCalculator = (values) => {
  const kg = nonNeg(values.weight, 70) * (whole(values.units, 1) === 2 ? LB_KG : 1);
  const met = SKI_MET[whole(values.activity, 2)] ?? 5.3;
  const hours = nonNeg(values.hours, 4);
  const active = Math.min(100, nonNeg(values.activePercent, 60)) / 100;
  const activeKcal = met * kg * hours * active;
  const total = activeKcal + REST_MET * kg * hours * (1 - active);

  return { totalCalories: Math.round(total), activeCalories: Math.round(activeKcal), caloriesPerHour: hours > 0 ? Math.round(total / hours) : 0, metUsed: met };
};

// --- 3. Calories Burned Shoveling Snow --------------------------------------
const SHOVEL_MET: Record<number, number> = { 1: 2.5, 2: 5.3, 3: 7.5 };
const SNOW_LB_FT3: Record<number, number> = { 1: 7, 2: 15, 3: 20 };

export const caloriesBurnedShovelingSnowCalculator: CustomCalculator = (values) => {
  const imperial = whole(values.units, 1) === 2;
  const kg = nonNeg(values.weight, 80) * (imperial ? LB_KG : 1);
  const min = nonNeg(values.minutes, 30);
  const met = SHOVEL_MET[whole(values.effort, 2)] ?? 5.3;
  // Snow moved: area × depth × density.
  const areaFt2 = nonNeg(values.area, 56) * (imperial ? 1 : 10.7639);
  const depthFt = nonNeg(values.depth, 15) / (imperial ? 12 : 30.48);
  const lb = areaFt2 * depthFt * (SNOW_LB_FT3[whole(values.snowType, 2)] ?? 15);

  return { caloriesBurned: Math.round((met * kg * min) / 60), snowWeightLb: Math.round(lb), snowWeightKg: Math.round(lb * LB_KG), shovelfuls: Math.ceil(lb / 15), metUsed: met };
};

// --- 4. Wind Chill ----------------------------------------------------------
/** NWS / Environment Canada (2001) wind chill, °C and km/h. */
const windChillC = (tC: number, kmh: number) => (kmh < 4.8 ? tC : 13.12 + 0.6215 * tC - 11.37 * kmh ** 0.16 + 0.3965 * tC * kmh ** 0.16);
/** Environment Canada frostbite-risk bands on the wind chill (°C). */
const riskFromWc = (wc: number) => (wc > -28 ? 1 : wc > -40 ? 2 : wc > -48 ? 3 : wc > -55 ? 4 : 5);

export const windChillCalculator: CustomCalculator = (values) => {
  const metric = whole(values.units, 1) === 2;
  const t = safeNumber(values.temperature, 0);
  const v = nonNeg(values.windSpeed, 15);
  const tC = metric ? t : fToC(t);
  const kmh = metric ? v : v * 1.609344;
  const wc = windChillC(tC, kmh);

  return {
    windChill: round2(metric ? wc : cToF(wc)),
    windChillC: round2(wc),
    windChillF: round2(cToF(wc)),
    frostbiteRisk: riskFromWc(wc),
    // The formula is defined for air ≤ 10 °C (50 °F) and wind ≥ 4.8 km/h (3 mph).
    formulaValid: tC <= 10 && kmh >= 4.8 ? 1 : 0,
  };
};

// --- 5. Frostbite Time ------------------------------------------------------
export const frostbiteTimeCalculator: CustomCalculator = (values) => {
  const metric = whole(values.units, 1) === 2;
  const t = safeNumber(values.temperature, -20);
  const v = nonNeg(values.windSpeed, 15);
  const tC = metric ? t : fToC(t);
  const kmh = metric ? v : v * 1.609344;
  // Tikuisis & Osczevski (Environment Canada): minutes to frostbite for the
  // most susceptible 5% of people; no frostbite expected above −4.8 °C.
  const minutes = tC < -4.8 ? (-24.5 * (0.667 * Math.max(kmh, 4.8) + 4.8) + 2111) * Math.pow(-4.8 - tC, -1.668) : Infinity;
  const finite = Number.isFinite(minutes) && minutes <= 60;
  const wc = windChillC(tC, kmh);

  return {
    minutesToFrostbite: finite ? round2(Math.max(0, minutes)) : 0,
    riskLevel: !finite || minutes > 30 ? 1 : minutes > 10 ? 2 : minutes > 5 ? 3 : minutes > 2 ? 4 : 5,
    windChillF: round2(cToF(wc)),
    windChillC: round2(wc),
  };
};

// --- 6. Ice Thickness -------------------------------------------------------
// Minimum clear-ice thickness (in) by activity (upper end of common guidance).
const ICE_NEED: Record<number, number> = { 1: 4, 2: 7, 3: 12, 4: 15 };
const ICE_STRENGTH: Record<number, number> = { 1: 1, 2: 0.75, 3: 0.5 };

export const iceThicknessCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const measured = nonNeg(values.thickness, 5) / (metric ? 2.54 : 1);
  const strength = ICE_STRENGTH[whole(values.iceType, 1)] ?? 1;
  const need = (ICE_NEED[whole(values.activity, 1)] ?? 4) / strength;
  const effective = measured * strength;

  return {
    safeForActivity: measured >= need ? 1 : 0,
    requiredThickness: round2(metric ? need * 2.54 : need),
    clearIceEquivalent: round2(metric ? effective * 2.54 : effective),
    // Gold's formula P = A h² with A ≈ 50 lb/in² (conservative, clear ice).
    maxLoadLb: Math.round(50 * effective * effective),
    maxLoadKg: Math.round(50 * effective * effective * LB_KG),
  };
};

// --- 7. Snowfall ------------------------------------------------------------
/** Typical snow-to-liquid ratio by surface temperature (°F). */
const snowRatio = (f: number) => (f >= 28 ? 10 : f >= 20 ? 15 : f >= 15 ? 20 : f >= 10 ? 30 : f >= 0 ? 40 : f >= -20 ? 50 : 100);

export const snowfallCalculator: CustomCalculator = (values) => {
  const metric = whole(values.units, 1) === 2;
  const liquid = nonNeg(values.liquid, 0.5);
  const tF = metric ? cToF(safeNumber(values.temperature, 25)) : safeNumber(values.temperature, 25);
  const ratio = nonNeg(values.customRatio, 0) || snowRatio(tF);
  // Liquid in inches (imperial) or mm (metric) → snow in inches or cm.
  const snow = metric ? (liquid * ratio) / 10 : liquid * ratio;

  return { snowDepth: round2(snow), ratioUsed: ratio, mixedPrecipitationLikely: tF > 34 ? 1 : 0 };
};

// --- 8. Snow Water Equivalent -----------------------------------------------
const SNOW_DENSITY: Record<number, number> = { 1: 0.07, 2: 0.1, 3: 0.25, 4: 0.35, 5: 0.45 };

export const snowWaterEquivalentCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const depthIn = nonNeg(values.snowDepth, 12) / (metric ? 2.54 : 1);
  const density = Math.min(1, nonNeg(values.customDensity, 0) / 100 || SNOW_DENSITY[whole(values.snowType, 2)] || 0.1);
  const sweIn = depthIn * density;

  return {
    sweInches: round2(sweIn),
    sweMm: round2(sweIn * 25.4),
    snowToLiquidRatio: round2(1 / density),
    // 1 in of water = 5.2 lb/ft²; 1 mm of water = 1 kg/m².
    snowLoadLbFt2: round2(sweIn * 5.202),
    snowLoadKgM2: round2(sweIn * 25.4),
  };
};

// --- 9. Ski Trip Cost -------------------------------------------------------
export const skiTripCostCalculator: CustomCalculator = (values) => {
  const people = Math.max(1, whole(values.travelers, 4));
  const days = whole(values.skiDays, 3);
  const nights = whole(values.nights, 3);
  const lift = nonNeg(values.liftTicketPerDay, 120) * people * days;
  const lodging = nonNeg(values.lodgingPerNight, 300) * nights;
  const rentals = nonNeg(values.rentalPerDay, 50) * whole(values.renters, 2) * days;
  const food = nonNeg(values.foodPerPersonPerDay, 60) * people * Math.max(days, nights);
  const total = lift + lodging + rentals + food + nonNeg(values.lessons, 0) + nonNeg(values.travel, 400) + nonNeg(values.other, 100);

  return {
    totalCost: round2(total),
    costPerPerson: round2(total / people),
    costPerPersonPerDay: round2(days > 0 ? total / people / days : 0),
    liftTicketsTotal: round2(lift),
    lodgingTotal: round2(lodging),
    foodTotal: round2(food),
    rentalsTotal: round2(rentals),
  };
};

export const winterConditionsCustomCalculators: Record<string, CustomCalculator> = {
  "slope-angle-calculator": slopeAngleCalculator,
  "calories-burned-skiing-calculator": caloriesBurnedSkiingCalculator,
  "calories-burned-shoveling-snow-calculator": caloriesBurnedShovelingSnowCalculator,
  "wind-chill-calculator": windChillCalculator,
  "frostbite-time-calculator": frostbiteTimeCalculator,
  "ice-thickness-calculator": iceThicknessCalculator,
  "snowfall-calculator": snowfallCalculator,
  "snow-water-equivalent-calculator": snowWaterEquivalentCalculator,
  "ski-trip-cost-calculator": skiTripCostCalculator,
};
