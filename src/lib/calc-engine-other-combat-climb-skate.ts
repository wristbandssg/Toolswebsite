/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-combat-climb-skate (combat sports, climbing, skating, hockey gear
 * and skydiving, 14 tools). See calc-engine-other-football.ts for the full
 * list of other-* sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - weightCutCalculator: how to split a cut between diet and water;
 *    mmaWeightClassCalculator: which division you should fight at.
 *  - giSizeCalculator: BJJ gi A/F size; bjjCalorieCalculator: calories.
 *  - fingerStrengthCalculator: hang strength vs bouldering grade;
 *    climbingShoeSizeCalculator: shoe size; rockClimbingCaloriesBurned
 *    Calculator: calories.
 *  - hockeyStickFlexCalculator vs hockeyStickLengthCalculator.
 *  - wingLoadingCalculator: skydiving canopy loading and jump-number
 *    guidance; parachuteSizeCalculator: canopy size for a descent rate
 *    (rocketry, drones, cargo).
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-combat-climb-skate-calculators.ts for the copy.
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
const lbOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 2.20462 : v);

// --- 1. Human punch force -----------------------------------------------------------
const PUNCH_MASS: Record<number, number> = { 1: 0.06, 2: 0.1, 3: 0.12, 4: 0.11 };

export const humanPunchForceCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 175), values.weightUnit);
  const v = nonNeg(values.punchSpeed, 20) * (whole(values.speedUnit, 1) === 1 ? 0.44704 : 1);
  const mEff = kg * (PUNCH_MASS[whole(values.punchType, 2)] ?? 0.1);
  const t = Math.max(0.005, nonNeg(values.contactMs, 15) / 1000);
  const force = (mEff * v) / t;

  return { forceNewtons: Math.round(force), forceLbf: Math.round(force * 0.224809), effectiveMassKg: round2(mEff), energyJoules: round2(0.5 * mEff * v * v) };
};

// --- 2. Finger strength (climbing) ------------------------------------------------------
export const fingerStrengthCalculator: CustomCalculator = (values) => {
  const bw = nonNeg(values.bodyWeight, 70);
  const total = Math.max(0, bw + safeNumber(values.addedWeight, 20)); // negative = assisted (pulley)
  const pct = div(total, bw) * 100;

  return { strengthPctBodyWeight: round2(pct), estimatedVGrade: Math.round(clamp((pct - 85) / 8, 0, 15)), perHandPct: round2(pct / 2), totalLoad: round2(total) };
};

// --- 3. Climbing shoe size -----------------------------------------------------------------
export const climbingShoeSizeCalculator: CustomCalculator = (values) => {
  let us = nonNeg(values.streetSize, 10);
  if (whole(values.sizeSystem, 1) === 2) us -= 1.5; // US women's -> US men's
  if (whole(values.sizeSystem, 1) === 3) us = us - 33; // EU -> US men's
  const level = whole(values.level, 1);
  let down = level === 1 ? 0.25 : level === 2 ? 0.75 : 1.25;
  if (whole(values.material, 1) === 2) down += 0.5; // unlined leather stretches
  const size = Math.round((us - down) * 2) / 2;

  return { usMensSize: size, usWomensSize: size + 1.5, euSize: round2(size + 33), sizeDown: round2(down) };
};

// --- 4. Rock climbing calories -----------------------------------------------------------------
const CLIMB_MET: Record<number, number> = { 1: 5.8, 2: 7.5, 3: 8, 4: 6, 5: 5 };

export const rockClimbingCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const met = CLIMB_MET[whole(values.style, 2)] ?? 7.5;
  const kg = kgOf(nonNeg(values.weight, 160), values.weightUnit);
  const climbingHours = (nonNeg(values.minutes, 90) / 60) * clamp(nonNeg(values.activePct, 50), 0, 100) / 100;
  const restHours = nonNeg(values.minutes, 90) / 60 - climbingHours;

  return { calories: Math.round(met * kg * climbingHours + 1.5 * kg * restHours), climbingCalories: Math.round(met * kg * climbingHours), caloriesPerClimbingHour: Math.round(met * kg), met };
};

// --- 5. BJJ gi size ---------------------------------------------------------------------------------
// Men A0–A6 and women F1–F5: [height in, weight lb] centres.
const MEN_GI: [number, number][] = [[61.5, 115], [65, 135], [68.5, 162], [71.5, 192], [74, 220], [76, 250], [78, 280]];
const WOMEN_GI: [number, number][] = [[60, 105], [63, 122], [66, 140], [69, 160], [72, 185]];

export const giSizeCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.height, 69) / (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const lb = nonNeg(values.weight, 170) * (whole(values.unit, 1) === 2 ? 2.20462 : 1);
  const women = whole(values.cut, 1) === 2;
  const table = women ? WOMEN_GI : MEN_GI;
  let best = 0;
  let bestD = Infinity;
  table.forEach(([th, tw], i) => {
    const d = Math.hypot((h - th) / 2.5, (lb - tw) / 20);
    if (d < bestD) { bestD = d; best = i; }
  });

  return { giSize: women ? best + 1 : best, isWomensCut: women ? 1 : 0, betweenSizes: bestD > 0.6 ? 1 : 0 };
};

// --- 6. BJJ calories --------------------------------------------------------------------------------------
const BJJ_MET: Record<number, number> = { 1: 5.3, 2: 7.5, 3: 10.3 };

export const bjjCalorieCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const drill = nonNeg(values.drillMinutes, 30) / 60;
  const roll = nonNeg(values.rollMinutes, 30) / 60;
  const rollMet = BJJ_MET[whole(values.rollIntensity, 3)] ?? 10.3;
  const kcal = BJJ_MET[1] * kg * drill + rollMet * kg * roll;

  return { calories: Math.round(kcal), drillingCalories: Math.round(BJJ_MET[1] * kg * drill), rollingCalories: Math.round(rollMet * kg * roll), caloriesPerHour: Math.round(div(kcal, drill + roll)) };
};

// --- 7. Weight cut -------------------------------------------------------------------------------------------
export const weightCutCalculator: CustomCalculator = (values) => {
  const current = nonNeg(values.currentWeight, 170);
  const target = nonNeg(values.targetWeight, 155);
  const total = Math.max(0, current - target);
  const weeks = nonNeg(values.weeksOut, 6);
  const sameDay = whole(values.weighIn, 2) === 1;
  const waterMax = current * (sameDay ? 0.03 : 0.06);
  const water = Math.min(total, waterMax);
  const diet = total - water;
  const perWeek = div(diet, weeks);
  const pctTotal = div(total, current) * 100;

  return {
    totalCutPct: round2(pctTotal),
    waterCut: round2(water),
    dietLossNeeded: round2(diet),
    dietLossPerWeek: round2(perWeek),
    // 1 low, 2 moderate, 3 high, 4 dangerous
    risk: pctTotal <= 5 ? 1 : pctTotal <= 8 && div(perWeek, current) <= 0.01 ? 2 : pctTotal <= 12 ? 3 : 4,
  };
};

// --- 8. MMA weight class ---------------------------------------------------------------------------------------
const MEN_CLASSES = [125, 135, 145, 155, 170, 185, 205, 265];
const WOMEN_CLASSES = [115, 125, 135, 145];

export const mmaWeightClassCalculator: CustomCalculator = (values) => {
  const lb = lbOf(nonNeg(values.walkingWeight, 175), values.unit);
  const cut = clamp(nonNeg(values.cutPct, 8), 0, 15) / 100;
  const classes = whole(values.division, 1) === 2 ? WOMEN_CLASSES : MEN_CLASSES;
  const reach = lb * (1 - cut);
  const idx = classes.findIndex((c) => reach <= c);
  const i = idx < 0 ? classes.length - 1 : idx;

  return { weightClassLimitLb: classes[i], classCode: i + 1, cutNeededLb: round2(Math.max(0, lb - classes[i])), cutNeededPct: round2(div(Math.max(0, lb - classes[i]), lb) * 100) };
};

// --- 9. Skateboard size ------------------------------------------------------------------------------------------
export const skateboardSizeCalculator: CustomCalculator = (values) => {
  const shoe = nonNeg(values.shoeSize, 10);
  let width = shoe <= 6 ? 7.5 : shoe <= 8 ? 7.875 : shoe <= 10 ? 8.125 : shoe <= 12 ? 8.375 : 8.625;
  const style = whole(values.style, 1); // 1 street, 2 all-round, 3 transition / bowl, 4 cruising
  width += style === 1 ? -0.125 : style === 3 ? 0.25 : style === 4 ? 0.375 : 0;
  const wheel = style === 1 ? 52 : style === 2 ? 54 : style === 3 ? 56 : 60;

  return { deckWidthInches: width, wheelSizeMm: wheel, truckAxleInches: width };
};

// --- 10. Roller skating calories -------------------------------------------------------------------------------------
const SKATE_MET: Record<number, number> = { 1: 5.5, 2: 7, 3: 7.5, 4: 9.8 };

export const rollerSkatingCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const met = SKATE_MET[whole(values.style, 2)] ?? 7;
  const kg = kgOf(nonNeg(values.weight, 160), values.weightUnit);
  const h = nonNeg(values.minutes, 45) / 60;

  return { calories: Math.round(met * kg * h), caloriesPerHour: Math.round(met * kg), met };
};

// --- 11. Hockey stick flex ---------------------------------------------------------------------------------------------
const FLEXES = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 77, 80, 85, 87, 90, 95, 100, 102, 105, 110, 115];

export const hockeyStickFlexCalculator: CustomCalculator = (values) => {
  const lb = lbOf(nonNeg(values.weight, 170), values.unit);
  const style = whole(values.style, 2); // 1 quick release / wrist shots, 2 balanced, 3 heavy slap shots / D-man
  const target = lb / 2 + (style === 1 ? -5 : style === 3 ? 10 : 0);
  const pick = FLEXES.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  const cut = nonNeg(values.inchesCut, 0);

  return { recommendedFlex: pick, effectiveFlexAfterCut: Math.round(pick + cut * 4), idealFlexRaw: round2(target) };
};

// --- 12. Hockey stick length -------------------------------------------------------------------------------------------
export const hockeyStickLengthCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.height, 70) / (whole(values.unit, 1) === 2 ? 2.54 : 1);
  const pos = whole(values.position, 1); // 1 forward, 2 defence
  const len = h - 12 + (pos === 2 ? 1 : -0.5) + (whole(values.skates, 1) === 2 ? 2 : 0);
  const size = len < 48 ? 1 : len < 54 ? 2 : len < 58 ? 3 : 4;

  return { stickLengthInches: round2(len), stickLengthCm: Math.round(len * 2.54), sizeCategory: size };
};

// --- 13. Wing loading (skydiving) ----------------------------------------------------------------------------------------
export const wingLoadingCalculator: CustomCalculator = (values) => {
  const exit = lbOf(nonNeg(values.bodyWeight, 180), values.unit) + lbOf(nonNeg(values.gearWeight, 25), values.unit);
  const canopy = Math.max(50, nonNeg(values.canopySize, 190));
  const wl = exit / canopy;
  const jumps = nonNeg(values.jumps, 150);
  const maxWl = jumps < 200 ? 1.0 : Math.min(1.8, 1.0 + Math.floor((jumps - 100) / 100) * 0.1);

  return { wingLoading: round2(wl), exitWeightLb: Math.round(exit), suggestedMaxWingLoading: round2(maxWl), smallestSuggestedCanopy: Math.ceil(exit / maxWl / 10) * 10, withinGuidance: wl <= maxWl + 1e-9 ? 1 : 0 };
};

// --- 14. Parachute size (descent rate) -------------------------------------------------------------------------------------
const CD: Record<number, number> = { 1: 1.5, 2: 0.75, 3: 0.8, 4: 2.2 };

export const parachuteSizeCalculator: CustomCalculator = (values) => {
  const kg = nonNeg(values.mass, 1) * (whole(values.massUnit, 1) === 2 ? 0.45359237 : whole(values.massUnit, 1) === 3 ? 0.001 : 1);
  const v = Math.max(0.5, nonNeg(values.descentRate, 5) * (whole(values.rateUnit, 1) === 2 ? 0.3048 : 1));
  const cd = CD[whole(values.shape, 1)] ?? 1.5;
  const rho = 1.225 * Math.pow(1 - 2.25577e-5 * nonNeg(values.altitudeM, 0), 5.25588);
  const area = (2 * kg * 9.81) / (rho * cd * v * v);
  const d = Math.sqrt((4 * area) / Math.PI);

  return { diameterM: round2(d), diameterInches: round2(d / 0.0254), areaM2: round2(area), areaSqFt: round2(area * 10.7639) };
};

export const otherCombatClimbSkateCustomCalculators: Record<string, CustomCalculator> = {
  "human-punch-force-calculator": humanPunchForceCalculator,
  "finger-strength-calculator": fingerStrengthCalculator,
  "climbing-shoe-size-calculator": climbingShoeSizeCalculator,
  "rock-climbing-calories-burned-calculator": rockClimbingCaloriesBurnedCalculator,
  "gi-size-calculator": giSizeCalculator,
  "bjj-calorie-calculator": bjjCalorieCalculator,
  "weight-cut-calculator": weightCutCalculator,
  "mma-weight-class-calculator": mmaWeightClassCalculator,
  "skateboard-size-calculator": skateboardSizeCalculator,
  "roller-skating-calories-burned-calculator": rollerSkatingCaloriesBurnedCalculator,
  "hockey-stick-flex-calculator": hockeyStickFlexCalculator,
  "hockey-stick-length-calculator": hockeyStickLengthCalculator,
  "wing-loading-calculator": wingLoadingCalculator,
  "parachute-size-calculator": parachuteSizeCalculator,
};
