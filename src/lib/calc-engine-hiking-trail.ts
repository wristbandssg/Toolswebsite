/**
 * Batch: "Sports Calculators" > Hiking Calculators, sub-batch C (Trail
 * Planning & Gear, 11 tools). See calc-engine-hiking-steps.ts for the full
 * list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - hikingTimeCalculator: time for a known route (Naismith + Langmuir
 *    descent corrections, fitness and breaks).
 *  - hikingDistanceCalculator: the reverse — how far you can hike in the
 *    hours you have, per day and per trip.
 *  - hikingGradeCalculator: steepness (% grade, angle, ft/mile) and a
 *    difficulty band.
 *  - appalachianTrailTimeCalculator: AT thru-hike length, finish date vs
 *    the Katahdin (Baxter) Oct 15 closing, budget.
 *  - pctTimeCalculator: PCT thru-hike, Kennedy Meadows (Sierra entry) date
 *    and finish vs the early-October Cascades snow window, budget.
 *  - backpackWeightCalculator: max pack weight as % of body weight.
 *  - baseWeightCalculator: pack weight without consumables and the
 *    ultralight class.
 *  - backpackingFoodCalculator: daily calories and food weight for a trip
 *    (also the backpacking calories calculator).
 *  - hikingWaterCalculator: water to drink and carry by heat and effort.
 *  - tentSizeCalculator: floor area, person rating and length for a group.
 *  - trekkingPoleLengthCalculator: pole length for flat, uphill, downhill.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-hiking-trail-calculators.ts for the copy.
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
/** Weight: unit 1 = kg, 2 = lb -> kg. */
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);
/** Height: unit 1 = cm, 2 = inches -> cm. */
const cm = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 2.54 : v);

const FITNESS: Record<number, number> = { 1: 0.8, 2: 1, 3: 1.25 };

// --- 1. Hiking Time (Naismith) -------------------------------------------------------
export const hikingTimeCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 1;
  const km = nonNeg(values.distance, 10) * (metric ? 1 : 1.609344);
  const up = nonNeg(values.ascent, 600) * (metric ? 1 : 0.3048);
  const down = nonNeg(values.descent, 0) * (metric ? 1 : 0.3048);
  const descentType = whole(values.descentType, 1); // 1 gentle (5–12°), 2 steep (> 12°)
  const baseMin = (km / 5) * 60 + (up / 600) * 60 + (down / 300) * 10 * (descentType === 2 ? 1 : -1);
  const moving = Math.max(0, baseMin) * (FITNESS[whole(values.fitness, 2)] ?? 1);
  const breaks = moving * nonNeg(values.breakPct, 10) / 100;
  const total = moving + breaks;

  return {
    totalHours: round2(total / 60),
    totalMinutes: Math.round(total),
    movingMinutes: Math.round(moving),
    breakMinutes: Math.round(breaks),
    averageSpeedKmh: round2(div(km, total / 60)),
  };
};

// --- 2. Hiking Distance (how far in the time you have) ---------------------------------------
export const hikingDistanceCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 1;
  const flatKmh = nonNeg(values.flatSpeed, metric ? 5 : 3) * (metric ? 1 : 1.609344);
  const gainPerKm = nonNeg(values.gainPerDistance, metric ? 50 : 250) * (metric ? 1 : 0.3048 / 1.609344);
  const moving = nonNeg(values.hoursPerDay, 7) * (1 - clamp(nonNeg(values.breakPct, 15), 0, 90) / 100);
  const hoursPerKm = (div(1, flatKmh) + gainPerKm / 600) * (FITNESS[whole(values.fitness, 2)] ?? 1);
  const dayKm = div(moving, hoursPerKm);
  const days = Math.max(1, nonNeg(values.days, 1));

  return {
    distancePerDayKm: round2(dayKm),
    distancePerDayMiles: round2(dayKm / 1.609344),
    tripDistanceKm: round2(dayKm * days),
    tripDistanceMiles: round2((dayKm * days) / 1.609344),
    elevationGainPerDay: Math.round(dayKm * gainPerKm * (metric ? 1 : 3.28084)),
  };
};

// --- 3. Hiking Grade -----------------------------------------------------------------------------
export const hikingGradeCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 1;
  const run = nonNeg(values.distance, 3) * (metric ? 1000 : 1609.344);
  const rise = nonNeg(values.elevationGain, 1500) * (metric ? 1 : 0.3048);
  const grade = div(rise, run) * 100;

  return {
    gradePct: round2(grade),
    angleDegrees: round2((Math.atan(div(rise, run)) * 180) / Math.PI),
    feetPerMile: Math.round(div(rise / 0.3048, run / 1609.344)),
    metresPerKm: Math.round(div(rise, run / 1000)),
    // 1 easy (< 5%), 2 moderate (5–10), 3 strenuous (10–15), 4 very strenuous (15–20), 5 extreme (≥ 20)
    difficulty: grade < 5 ? 1 : grade < 10 ? 2 : grade < 15 ? 3 : grade < 20 ? 4 : 5,
  };
};

// --- Thru-hike helpers -----------------------------------------------------------------------------------
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const dayOfYear = (month: number, day: number) => MONTH_START[clamp(whole(month, 1), 1, 12) - 1] + clamp(whole(day, 1), 1, 31);
function dateOf(doy: number): { month: number; day: number } {
  const d = ((Math.round(doy) - 1) % 365 + 365) % 365 + 1;
  let m = 11;
  while (m > 0 && MONTH_START[m] >= d) m--;
  return { month: m + 1, day: d - MONTH_START[m] };
}

/** Calendar days for a thru-hike: hiking days at miles/day plus zero days per week. */
function thruHikeDays(miles: number, perDay: number, zerosPerWeek: number): number {
  const hikingDays = Math.ceil(div(miles, Math.max(1, perDay)));
  const z = clamp(zerosPerWeek, 0, 6);
  return Math.ceil(hikingDays * (7 / (7 - z)));
}

// --- 4. Appalachian Trail Time ------------------------------------------------------------------------------
const AT_MILES = 2197.4;
const KATAHDIN_CLOSE_DOY = dayOfYear(10, 15);

export const appalachianTrailTimeCalculator: CustomCalculator = (values) => {
  const miles = nonNeg(values.miles, AT_MILES);
  const days = thruHikeDays(miles, nonNeg(values.milesPerDay, 15), nonNeg(values.zeroDaysPerWeek, 1));
  const start = dayOfYear(values.startMonth, values.startDay);
  const finish = start + days;
  const date = dateOf(finish);

  return {
    totalDays: days,
    months: round2(days / 30.44),
    finishMonth: date.month,
    finishDay: date.day,
    daysBeforeKatahdinClosing: KATAHDIN_CLOSE_DOY - finish,
    estimatedCost: Math.round(days * nonNeg(values.costPerDay, 40)),
  };
};

// --- 5. PCT Time -------------------------------------------------------------------------------------------------
const PCT_MILES = 2650;
const KENNEDY_MEADOWS_MILE = 702;
const CASCADES_SNOW_DOY = dayOfYear(10, 1);

export const pctTimeCalculator: CustomCalculator = (values) => {
  const perDay = nonNeg(values.milesPerDay, 18);
  const zeros = nonNeg(values.zeroDaysPerWeek, 1);
  const days = thruHikeDays(nonNeg(values.miles, PCT_MILES), perDay, zeros);
  const start = dayOfYear(values.startMonth, values.startDay);
  const km = dateOf(start + thruHikeDays(KENNEDY_MEADOWS_MILE, perDay, zeros));
  const finish = start + days;
  const date = dateOf(finish);

  return {
    totalDays: days,
    months: round2(days / 30.44),
    kennedyMeadowsMonth: km.month,
    kennedyMeadowsDay: km.day,
    finishMonth: date.month,
    finishDay: date.day,
    daysBeforeEarlyOctober: CASCADES_SNOW_DOY - finish,
    estimatedCost: Math.round(days * nonNeg(values.costPerDay, 45)),
  };
};

// --- 6. Backpack Weight ----------------------------------------------------------------------------------------------
const MAX_PCT: Record<number, number> = { 1: 10, 2: 20, 3: 25, 4: 15 };

export const backpackWeightCalculator: CustomCalculator = (values) => {
  const body = nonNeg(values.bodyWeight, 80);
  const pct = MAX_PCT[whole(values.tripType, 2)] ?? 20;
  const max = (body * pct) / 100;
  const pack = nonNeg(values.packWeight, 0);

  return {
    maxPackWeight: round2(max),
    maxPct: pct,
    yourPackPct: round2(div(pack, body) * 100),
    overBy: round2(pack > 0 ? pack - max : 0),
  };
};

// --- 7. Base Weight --------------------------------------------------------------------------------------------------
export const baseWeightCalculator: CustomCalculator = (values) => {
  const lbUnit = whole(values.unit, 2) === 2;
  const consumables = nonNeg(values.food, 0) + nonNeg(values.water, 0) + nonNeg(values.fuel, 0);
  const base = Math.max(0, nonNeg(values.totalPackWeight, 22) - consumables);
  const baseLb = lbUnit ? base : base / 0.45359237;

  return {
    baseWeight: round2(base),
    baseWeightOther: round2(lbUnit ? base * 0.45359237 : baseLb),
    consumables: round2(consumables),
    // 1 super ultralight (< 5 lb), 2 ultralight (< 10), 3 lightweight (< 20), 4 traditional
    category: baseLb < 5 ? 1 : baseLb < 10 ? 2 : baseLb < 20 ? 3 : 4,
  };
};

// --- 8. Backpacking Food & Calories ------------------------------------------------------------------------------------
const TRIP_PAL: Record<number, number> = { 1: 1.8, 2: 2.1, 3: 2.5 };

export const backpackingFoodCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 75), values.weightUnit);
  const h = cm(nonNeg(values.height, 175), values.heightUnit);
  const age = nonNeg(values.age, 35);
  const bmr = 10 * w + 6.25 * h - 5 * age + (whole(values.sex, 1) === 2 ? -161 : 5);
  const daily = bmr * (TRIP_PAL[whole(values.intensity, 2)] ?? 2.1);
  const density = Math.max(50, nonNeg(values.caloriesPerOunce, 125));
  const ozPerDay = daily / density;
  const days = Math.max(0, nonNeg(values.days, 4));

  return {
    caloriesPerDay: Math.round(daily / 10) * 10,
    foodPerDayOz: round2(ozPerDay),
    foodPerDayLb: round2(ozPerDay / 16),
    totalFoodLb: round2((ozPerDay * days) / 16),
    totalFoodKg: round2((ozPerDay * days * 0.028349523125)),
    totalCalories: Math.round(daily * days),
  };
};

// --- 9. Hiking Water -----------------------------------------------------------------------------------------------------
const WATER_L_PER_HOUR: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1 };
const EFFORT: Record<number, number> = { 1: 0.8, 2: 1, 3: 1.25 };

export const hikingWaterCalculator: CustomCalculator = (values) => {
  const hours = nonNeg(values.hours, 5);
  const perHour = (WATER_L_PER_HOUR[whole(values.temperature, 2)] ?? 0.75) * (EFFORT[whole(values.effort, 2)] ?? 1) + (whole(values.highAltitude, 1) === 2 ? 0.1 : 0);
  const total = perHour * hours;
  const between = nonNeg(values.hoursBetweenSources, 0);
  const carry = between > 0 ? Math.min(total, perHour * between) : total;

  return {
    totalLitres: round2(total),
    totalOunces: Math.round(total * 33.814),
    litresPerHour: round2(perHour),
    litresToCarry: round2(carry),
    carryWeightKg: round2(carry),
    carryWeightLb: round2(carry * 2.20462),
  };
};

// --- 10. Tent Size -----------------------------------------------------------------------------------------------------------
const AREA_PER_PERSON: Record<number, number> = { 1: 14, 2: 18, 3: 22 };
const SQFT_PER_RATED_PERSON = 14.5;

export const tentSizeCalculator: CustomCalculator = (values) => {
  const people = Math.max(1, whole(values.people, 2));
  const area = people * (AREA_PER_PERSON[whole(values.comfort, 2)] ?? 18) + whole(values.dogs, 0) * 8 + (whole(values.gearInside, 1) === 2 ? people * 5 : 0);
  const tallestIn = nonNeg(values.tallestHeight, 72) / (whole(values.heightUnit, 2) === 1 ? 2.54 : 1);

  return {
    floorAreaSqFt: round2(area),
    floorAreaSqM: round2(area * 0.09290304),
    tentPersonRating: Math.ceil(area / SQFT_PER_RATED_PERSON - 1e-9),
    minFloorLengthInches: Math.round(tallestIn + 12),
    minFloorLengthCm: Math.round((tallestIn + 12) * 2.54),
  };
};

// --- 11. Trekking Pole Length --------------------------------------------------------------------------------------------------
export const trekkingPoleLengthCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 175), values.heightUnit);
  const flat = h * 0.68;
  const fixed = clamp(Math.round(flat / 5) * 5, 90, 145);

  return {
    flatLengthCm: Math.round(flat),
    flatLengthInches: round2(flat / 2.54),
    uphillLengthCm: Math.round(flat - 7.5),
    downhillLengthCm: Math.round(flat + 7.5),
    fixedPoleSizeCm: fixed,
  };
};

export const hikingTrailCustomCalculators: Record<string, CustomCalculator> = {
  "hiking-time-calculator": hikingTimeCalculator,
  "hiking-distance-calculator": hikingDistanceCalculator,
  "hiking-grade-calculator": hikingGradeCalculator,
  "appalachian-trail-time-calculator": appalachianTrailTimeCalculator,
  "pct-time-calculator": pctTimeCalculator,
  "backpack-weight-calculator": backpackWeightCalculator,
  "base-weight-calculator": baseWeightCalculator,
  "backpacking-food-calculator": backpackingFoodCalculator,
  "hiking-water-calculator": hikingWaterCalculator,
  "tent-size-calculator": tentSizeCalculator,
  "trekking-pole-length-calculator": trekkingPoleLengthCalculator,
};
