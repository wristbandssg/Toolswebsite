/**
 * Batch: "Sports Calculators" > Running Calculators, sub-batch C (Running
 * Physiology & Conditions, 9 tools). See calc-engine-running-pace.ts for the
 * full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - aerobicThresholdCalculator: the top of easy running — MAF (180 − age),
 *    % of max HR and ~90% of lactate threshold HR.
 *  - runningCadenceCalculator: steps per minute from a count, stride length
 *    and a +5–10% cadence target.
 *  - runningPowerCalculator: running power in watts from speed, grade, weight
 *    and wind (physics model).
 *  - runningEconomyCalculator: oxygen cost per km from a VO2 test.
 *  - gapCalculator: grade-adjusted (flat-equivalent) pace on hills (Minetti),
 *    with a trail surface factor (also the trail running pace calculator).
 *  - runningAtAltitudeCalculator: VO2 max loss and pace slowdown at altitude.
 *  - windEffectOnRunningCalculator: head/tail/crosswind effect on pace.
 *  - dewPointRunningCalculator: temperature + dew point → pace adjustment.
 *  - whatToWearRunningCalculator: "dress for" temperature and clothing.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-running-conditions-calculators.ts for the copy.
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
const msSeconds = (v: Record<string, number>, p: string, dm: number, ds: number) => nonNeg(v[`${p}Min`], dm) * 60 + nonNeg(v[`${p}Sec`], ds);
function ms(prefix: string, sec: number) {
  const t = Math.round(Math.max(0, sec));
  return { [`${prefix}Min`]: Math.floor(t / 60), [`${prefix}Sec`]: t % 60 };
}
/** Pace input is per km (1) or per mile (2); returns seconds per km. */
const pacePerKm = (values: Record<string, number>, dm = 5, ds = 30) => msSeconds(values, "pace", dm, ds) / (whole(values.paceUnit, 1) === 2 ? MILE : 1);
const unitLen = (values: Record<string, number>) => (whole(values.paceUnit, 1) === 2 ? MILE : 1);
const toC = (t: number, unit: number) => (whole(unit, 1) === 2 ? ((t - 32) * 5) / 9 : t);
const toF = (c: number) => (c * 9) / 5 + 32;

// --- 1. Aerobic Threshold ---------------------------------------------------
export const aerobicThresholdCalculator: CustomCalculator = (values) => {
  const age = nonNeg(values.age, 35);
  // Maffetone adjustments: −10 recovering from illness, −5 injured/inconsistent,
  // 0 consistent, +5 two+ years of progress.
  const adj = ({ 1: -10, 2: -5, 3: 0, 4: 5 } as Record<number, number>)[whole(values.trainingStatus, 3)] ?? 0;
  const maf = 180 - age + adj;
  const max = nonNeg(values.maxHr, 0) || 208 - 0.7 * age;
  const lthr = nonNeg(values.lthr, 0);

  return {
    mafHeartRate: Math.round(maf),
    mafRangeLow: Math.round(maf - 10),
    fromMaxHrLow: Math.round(max * 0.7),
    fromMaxHrHigh: Math.round(max * 0.75),
    fromLthr: lthr > 0 ? Math.round(lthr * 0.9) : 0,
  };
};

// --- 2. Running Cadence -----------------------------------------------------
export const runningCadenceCalculator: CustomCalculator = (values) => {
  const steps = nonNeg(values.steps, 42);
  const secs = Math.max(1, nonNeg(values.countSeconds, 15));
  const cadence = (steps * 60) / secs;
  const pace = pacePerKm(values, 5, 30);
  const speed = pace > 0 ? 1000 / pace : 0; // m/s
  const stride = cadence > 0 ? (speed * 60) / cadence : 0;

  return {
    cadenceSpm: Math.round(cadence),
    strideLengthMeters: round2(stride),
    targetCadenceLow: Math.round(cadence * 1.05),
    targetCadenceHigh: Math.round(cadence * 1.1),
    stepsPerKm: stride > 0 ? Math.round(1000 / stride) : 0,
  };
};

// --- 3. Running Power -------------------------------------------------------
const RHO = 1.2; // air density, kg/m³

export const runningPowerCalculator: CustomCalculator = (values) => {
  const kg = nonNeg(values.weight, 70) * (whole(values.weightUnit, 1) === 2 ? 0.45359237 : 1);
  const pace = pacePerKm(values, 5, 0);
  const v = pace > 0 ? 1000 / pace : 0;
  const grade = safeNumber(values.gradePercent, 0) / 100;
  const wind = safeNumber(values.headwindKmh, 0) / 3.6;
  // Metabolic-style running power: ~1.04 J/kg/m on the flat, plus the
  // vertical work of climbing and air resistance (CdA ≈ 0.24 m²).
  const flat = 1.04 * kg * v;
  const climb = kg * 9.81 * v * grade;
  const air = 0.5 * RHO * 0.24 * Math.pow(v + wind, 2) * v;
  const total = Math.max(0, flat + climb + air);

  return { powerWatts: Math.round(total), powerPerKg: kg > 0 ? round2(total / kg) : 0, airResistanceWatts: Math.round(air), climbingWatts: Math.round(climb) };
};

// --- 4. Running Economy -----------------------------------------------------
export const runningEconomyCalculator: CustomCalculator = (values) => {
  const vo2 = nonNeg(values.vo2, 42);
  const pace = pacePerKm(values, 5, 0);
  const kmPerMin = pace > 0 ? 60 / pace : 0;
  const perKm = kmPerMin > 0 ? vo2 / kmPerMin : 0;
  // 1 L O2 ≈ 5 kcal.
  const kcalPerKgKm = (perKm / 1000) * 5;

  return {
    oxygenCostPerKm: round2(perKm),
    energyCostKcalPerKgKm: round2(kcalPerKgKm),
    // 1 elite (<190), 2 good (190–209), 3 average (210–229), 4 below average.
    rating: perKm < 190 ? 1 : perKm < 210 ? 2 : perKm < 230 ? 3 : 4,
  };
};

// --- 5. Grade Adjusted Pace (Minetti) ---------------------------------------
/** Energy cost of running (J/kg/m) at gradient i (fraction), Minetti 2002. */
const cost = (i: number) => 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
const SURFACE: Record<number, number> = { 1: 1, 2: 1.05, 3: 1.12, 4: 1.2 };

export const gapCalculator: CustomCalculator = (values) => {
  const g = Math.min(0.45, Math.max(-0.45, safeNumber(values.gradePercent, 6) / 100));
  const pace = pacePerKm(values, 6, 0);
  const effort = cost(g) / cost(0);
  const surface = SURFACE[whole(values.surface, 1)] ?? 1;
  const u = unitLen(values);

  return {
    ...ms("gradeAdjustedPace", (pace / effort / surface) * u),
    effortMultiplier: round2(effort * surface),
    // Pace you'd hold here for the same effort as a flat target pace.
    ...ms("equivalentHillPace", msSeconds(values, "flatTarget", 5, 0) * effort * surface),
  };
};

// --- 6. Running at Altitude -------------------------------------------------
export const runningAtAltitudeCalculator: CustomCalculator = (values) => {
  const m = nonNeg(values.altitude, 1600) * (whole(values.altitudeUnit, 1) === 2 ? 0.3048 : 1);
  // VO2 max falls about 6.3% per 1,000 m above ~300 m (Wehrlin & Hallén 2006);
  // endurance race pace slows by roughly 70% of that loss.
  const vo2Loss = Math.max(0, (m - 300) / 1000) * 6.3;
  const slow = vo2Loss * 0.7;
  const pace = msSeconds(values, "pace", 5, 0);

  return {
    vo2MaxLossPercent: round2(vo2Loss),
    paceSlowdownPercent: round2(slow),
    ...ms("altitudePace", pace * (1 + slow / 100)),
    acclimatizationDays: m < 1500 ? 0 : m < 2500 ? 14 : 21,
  };
};

// --- 7. Wind Effect ---------------------------------------------------------
export const windEffectOnRunningCalculator: CustomCalculator = (values) => {
  const pace = pacePerKm(values, 5, 0);
  const v = pace > 0 ? 1000 / pace : 3;
  const windRaw = nonNeg(values.windSpeed, 15) * (whole(values.windUnit, 1) === 2 ? 1.609344 : 1);
  // 1 headwind, 2 tailwind, 3 crosswind (counted as a quarter headwind).
  const dir = whole(values.direction, 1);
  const w = (windRaw / 3.6) * (dir === 2 ? -1 : dir === 3 ? 0.25 : 1);
  const kg = 70;
  const k = 0.5 * RHO * 0.24;
  const power = (vv: number, ww: number) => 1.04 * kg * vv + k * Math.sign(vv + ww) * (vv + ww) ** 2 * vv;
  const target = power(v, 0);
  // Solve for the speed that needs the same power in the wind (bisection).
  let lo = 0.5;
  let hi = 12;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (power(mid, w) > target) hi = mid;
    else lo = mid;
  }
  const newPace = 1000 / lo;
  const u = unitLen(values);

  return {
    ...ms("windPace", newPace * u),
    secondsPerUnitChange: round2((newPace - pace) * u),
    percentChange: round2(((newPace - pace) / pace) * 100),
  };
};

// --- 8. Dew Point -----------------------------------------------------------
export const dewPointRunningCalculator: CustomCalculator = (values) => {
  const tC = toC(safeNumber(values.temperature, 80), values.tempUnit);
  let dpC: number;
  if (whole(values.inputType, 1) === 2) {
    // Dew point from relative humidity (Magnus formula).
    const rh = Math.min(100, Math.max(1, nonNeg(values.humidity, 60)));
    const g = Math.log(rh / 100) + (17.62 * tC) / (243.12 + tC);
    dpC = (243.12 * g) / (17.62 - g);
  } else dpC = toC(safeNumber(values.dewPoint, 65), values.tempUnit);
  const sum = toF(tC) + toF(dpC);
  // Pace adjustment by temperature + dew point (°F) — the widely used runner's chart.
  const steps: [number, number][] = [[100, 0], [110, 0.5], [120, 1], [130, 2], [140, 3], [150, 4.5], [160, 6], [170, 8], [180, 10]];
  const adj = sum > 180 ? 12 : (steps.find(([lim]) => sum <= lim)?.[1] ?? 0);
  const pace = msSeconds(values, "pace", 8, 0);

  return {
    temperaturePlusDewPoint: Math.round(sum),
    paceAdjustmentPercent: adj,
    ...ms("adjustedPace", pace * (1 + adj / 100)),
    dewPoint: round2(whole(values.tempUnit, 1) === 2 ? toF(dpC) : dpC),
    hardRunningNotAdvised: sum > 180 ? 1 : 0,
  };
};

// --- 9. What to Wear Running ------------------------------------------------
export const whatToWearRunningCalculator: CustomCalculator = (values) => {
  const fUnit = whole(values.tempUnit, 1) === 2;
  const tF = fUnit ? safeNumber(values.temperature, 45) : toF(safeNumber(values.temperature, 7));
  const windMph = nonNeg(values.windSpeed, 5) * (whole(values.windUnit, 1) === 2 ? 1 : 0.621371);
  // Wind chill (NWS) applies at or below 50 °F with wind over 3 mph.
  const chill = tF <= 50 && windMph > 3 ? 35.74 + 0.6215 * tF - 35.75 * windMph ** 0.16 + 0.4275 * tF * windMph ** 0.16 : tF;
  // Dress as if it's about 15 °F warmer (10 for easy runs, 20 for races).
  const bonus = ({ 1: 10, 2: 15, 3: 20 } as Record<number, number>)[whole(values.effort, 2)] ?? 15;
  const dress = chill + bonus;
  const out = (f: number) => round2(fUnit ? f : ((f - 32) * 5) / 9);

  return {
    feelsLike: out(chill),
    dressFor: out(dress),
    layersOnTop: dress >= 45 ? 1 : dress >= 30 ? 2 : 3,
    longSleeves: dress < 60 ? 1 : 0,
    tightsOrPants: dress < 45 ? 1 : 0,
    glovesAndHat: dress < 45 ? 1 : 0,
    windJacket: dress < 35 || windMph > 15 ? 1 : 0,
  };
};

export const runningConditionsCustomCalculators: Record<string, CustomCalculator> = {
  "aerobic-threshold-calculator": aerobicThresholdCalculator,
  "running-cadence-calculator": runningCadenceCalculator,
  "running-power-calculator": runningPowerCalculator,
  "running-economy-calculator": runningEconomyCalculator,
  "gap-calculator": gapCalculator,
  "running-at-altitude-calculator": runningAtAltitudeCalculator,
  "wind-effect-on-running-calculator": windEffectOnRunningCalculator,
  "dew-point-running-calculator": dewPointRunningCalculator,
  "what-to-wear-running-calculator": whatToWearRunningCalculator,
};
