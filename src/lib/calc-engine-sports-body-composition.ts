/**
 * Batch: "Sports Calculators" > Sports Performance Calculators, sub-batch D
 * (Body Composition & Physique, 9 tools). See
 * calc-engine-sports-strength-programming.ts for the full list.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bodyFatPercentageCalculator: general body fat % by the US Navy tape
 *    method or the BMI-based (Deurenberg) estimate, with an ACE category.
 *  - navyBodyFatCalculator: the Navy tape method in inches against the
 *    Navy's maximum allowable body fat by age — pass or fail.
 *  - leanBodyMassCalculator: lean mass by Boer, James and Hume formulas,
 *    or from a known body fat %.
 *  - ffmiCalculator: fat-free mass index (and normalised FFMI) — how
 *    muscular you are for your height.
 *  - muscleGainCalculator: realistic natural muscle gain per month/year by
 *    training age, and the FFMI-25 natural ceiling.
 *  - bulkingCalculator / cuttingCalculator: calories, rate and timeline to
 *    gain or lose weight, with macros.
 *  - proteinForMuscleGainCalculator: daily and per-meal protein.
 *  - creatineDoseCalculator: loading and maintenance doses.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-sports-body-composition-calculators.ts for the copy.
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
const IN = 2.54;
/** unit 1 = metric (kg, cm), 2 = imperial (lb, in) → kg and cm. */
const kgOf = (w: number, unit: number) => (whole(unit, 1) === 2 ? w * LB : w);
const cmOf = (l: number, unit: number) => (whole(unit, 1) === 2 ? l * IN : l);
const mass = (kg: number, unit: number) => (whole(unit, 1) === 2 ? kg / LB : kg);

/** US Navy circumference body fat % (Hodgdon & Beckett), lengths in cm. */
function navyBodyFat(female: boolean, heightCm: number, neckCm: number, waistCm: number, hipCm: number): number {
  const h = heightCm / IN;
  const n = neckCm / IN;
  const w = waistCm / IN;
  const hp = hipCm / IN;
  const bf = female
    ? 163.205 * Math.log10(Math.max(1e-6, w + hp - n)) - 97.684 * Math.log10(h) - 78.387
    : 86.01 * Math.log10(Math.max(1e-6, w - n)) - 70.041 * Math.log10(h) + 36.76;
  return Math.min(75, Math.max(2, bf));
}

/** ACE category: 1 essential, 2 athletes, 3 fitness, 4 average, 5 obese. */
function aceCategory(bf: number, female: boolean): number {
  const t = female ? [14, 21, 25, 32] : [6, 14, 18, 25];
  return bf < t[0] ? 1 : bf < t[1] ? 2 : bf < t[2] ? 3 : bf < t[3] ? 4 : 5;
}

/** Mifflin-St Jeor BMR. */
const mifflin = (kg: number, cm: number, age: number, female: boolean) => 10 * kg + 6.25 * cm - 5 * age + (female ? -161 : 5);
const ACTIVITY: Record<number, number> = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };

// --- 1. Body Fat Percentage -------------------------------------------------
export const bodyFatPercentageCalculator: CustomCalculator = (values) => {
  const female = isFemale(values.sex);
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 80), u);
  const cm = cmOf(nonNeg(values.height, 178), u);
  const age = nonNeg(values.age, 30);
  let bf: number;
  if (whole(values.method, 1) === 2) {
    const bmi = kg / Math.pow(cm / 100, 2);
    bf = 1.2 * bmi + 0.23 * age - 10.8 * (female ? 0 : 1) - 5.4;
  } else {
    bf = navyBodyFat(female, cm, cmOf(nonNeg(values.neck, 38), u), cmOf(nonNeg(values.waist, 86), u), cmOf(nonNeg(values.hip, 0), u));
  }
  bf = Math.min(75, Math.max(2, bf));

  return {
    bodyFatPercent: round2(bf),
    fatMass: round2(mass((kg * bf) / 100, u)),
    leanMass: round2(mass(kg * (1 - bf / 100), u)),
    aceCategory: aceCategory(bf, female),
  };
};

// --- 2. Navy Body Fat -------------------------------------------------------
// Navy maximum allowable body fat by age (17–21, 22–29, 30–39, 40+).
const NAVY_MAX = { M: [22, 23, 24, 26], F: [33, 34, 35, 36] };

export const navyBodyFatCalculator: CustomCalculator = (values) => {
  const female = isFemale(values.sex);
  const u = values.unitSystem;
  const bf = navyBodyFat(female, cmOf(nonNeg(values.height, 70), u), cmOf(nonNeg(values.neck, 15.5), u), cmOf(nonNeg(values.waist, 34), u), cmOf(nonNeg(values.hip, 0), u));
  const age = nonNeg(values.age, 25);
  const band = age < 22 ? 0 : age < 30 ? 1 : age < 40 ? 2 : 3;
  const max = (female ? NAVY_MAX.F : NAVY_MAX.M)[band];
  const rounded = Math.round(bf);

  return {
    bodyFatPercent: rounded,
    maxAllowed: max,
    passes: rounded <= max ? 1 : 0,
    marginPercentPoints: max - rounded,
    exactBodyFat: round2(bf),
  };
};

// --- 3. Lean Body Mass ------------------------------------------------------
export const leanBodyMassCalculator: CustomCalculator = (values) => {
  const female = isFemale(values.sex);
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 80), u);
  const cm = cmOf(nonNeg(values.height, 178), u);
  const boer = female ? 0.252 * kg + 0.473 * cm - 48.3 : 0.407 * kg + 0.267 * cm - 19.2;
  const james = female ? 1.07 * kg - 148 * Math.pow(kg / cm, 2) : 1.1 * kg - 128 * Math.pow(kg / cm, 2);
  const hume = female ? 0.29569 * kg + 0.41813 * cm - 43.2933 : 0.3281 * kg + 0.33929 * cm - 29.5336;
  const bf = nonNeg(values.bodyFatPercent, 0);
  const fromBf = bf > 0 ? kg * (1 - bf / 100) : boer;

  return {
    leanBodyMass: round2(mass(fromBf, u)),
    boer: round2(mass(boer, u)),
    james: round2(mass(james, u)),
    hume: round2(mass(hume, u)),
    leanPercent: kg > 0 ? round2((fromBf / kg) * 100) : 0,
  };
};

// --- 4. FFMI ----------------------------------------------------------------
export const ffmiCalculator: CustomCalculator = (values) => {
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 80), u);
  const m = cmOf(nonNeg(values.height, 178), u) / 100;
  const bf = Math.min(70, nonNeg(values.bodyFatPercent, 15));
  const ffm = kg * (1 - bf / 100);
  const ffmi = m > 0 ? ffm / (m * m) : 0;
  const normalized = ffmi + 6.1 * (1.8 - m);
  // 1 below average … 6 suspiciously high (natural limit about 25).
  const t = isFemale(values.sex) ? [14, 16, 17, 18, 20] : [18, 20, 22, 23, 26];
  const rating = normalized < t[0] ? 1 : normalized < t[1] ? 2 : normalized < t[2] ? 3 : normalized < t[3] ? 4 : normalized < t[4] ? 5 : 6;

  return { ffmi: round2(ffmi), normalizedFfmi: round2(normalized), fatFreeMass: round2(mass(ffm, u)), rating };
};

// --- 5. Muscle Gain ---------------------------------------------------------
// Monthly lean gain as % of bodyweight (Alan Aragon's model), women at half.
const GAIN: Record<number, number[]> = { 1: [1, 1.5], 2: [0.5, 1], 3: [0.25, 0.5] };

export const muscleGainCalculator: CustomCalculator = (values) => {
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 75), u);
  const months = nonNeg(values.months, 12);
  const g = GAIN[whole(values.experience, 1)] ?? GAIN[1];
  const f = isFemale(values.sex) ? 0.5 : 1;
  const lo = (kg * g[0] * f) / 100;
  const hi = (kg * g[1] * f) / 100;
  const m = cmOf(nonNeg(values.height, 178), u) / 100;
  const bf = nonNeg(values.bodyFatPercent, 15);
  // Natural ceiling: fat-free mass at a normalised FFMI of 25 (men) / 21 (women).
  const cap = isFemale(values.sex) ? 21 : 25;
  const capFfm = m > 0 ? (cap - 6.1 * (1.8 - m)) * m * m : 0;
  const ffm = bf > 0 ? kg * (1 - bf / 100) : 0;

  return {
    gainOverPeriodLow: round2(mass(lo * months, u)),
    gainOverPeriodHigh: round2(mass(hi * months, u)),
    monthlyGainLow: round2(mass(lo, u)),
    monthlyGainHigh: round2(mass(hi, u)),
    naturalCeilingLeanMass: round2(mass(capFfm, u)),
    roomToNaturalCeiling: ffm > 0 && capFfm > 0 ? round2(mass(Math.max(0, capFfm - ffm), u)) : 0,
  };
};

/** Shared calorie / macro plan for bulking and cutting. */
function plan(values: Record<string, number>, dailyChangeKcal: number, proteinPerKg: number) {
  const female = isFemale(values.sex);
  const u = values.unitSystem;
  const kg = kgOf(nonNeg(values.weight, 80), u);
  const cm = cmOf(nonNeg(values.height, 178), u);
  const tdee = mifflin(kg, cm, nonNeg(values.age, 30), female) * (ACTIVITY[whole(values.activity, 3)] ?? 1.55);
  const target = Math.max(1200, tdee + dailyChangeKcal);
  const protein = proteinPerKg * kg;
  const fat = Math.max(0.6 * kg, (target * 0.25) / 9);
  const carbs = Math.max(0, (target - protein * 4 - fat * 9) / 4);
  return { kg, u, tdee, target, protein, fat, carbs };
}

// --- 6. Bulking -------------------------------------------------------------
export const bulkingCalculator: CustomCalculator = (values) => {
  // Weekly gain target by training age (% bodyweight per month → per week).
  const rate = ({ 1: 1.25, 2: 0.75, 3: 0.4 } as Record<number, number>)[whole(values.experience, 1)] ?? 1;
  const kgNow = kgOf(nonNeg(values.weight, 80), values.unitSystem);
  const weeklyGainKg = (kgNow * rate) / 100 / 4.345;
  // ~7,700 kcal per kg of new tissue during a lean bulk is too high (much is
  // muscle and water); a surplus of ~5,000 kcal per kg gained is used.
  const surplus = (weeklyGainKg * 5000) / 7;
  const p = plan(values, surplus, 1.8);
  const goal = kgOf(nonNeg(values.goalWeight, 86), p.u);
  const weeks = goal > p.kg && weeklyGainKg > 0 ? (goal - p.kg) / weeklyGainKg : 0;

  return {
    targetCalories: Math.round(p.target),
    maintenanceCalories: Math.round(p.tdee),
    dailySurplus: Math.round(surplus),
    weeklyGain: round2(mass(weeklyGainKg, p.u)),
    weeksToGoal: round2(weeks),
    proteinGrams: Math.round(p.protein),
    carbGrams: Math.round(p.carbs),
    fatGrams: Math.round(p.fat),
  };
};

// --- 7. Cutting -------------------------------------------------------------
export const cuttingCalculator: CustomCalculator = (values) => {
  const ratePct = Math.min(1.5, nonNeg(values.weeklyLossPercent, 0.75));
  const kgNow = kgOf(nonNeg(values.weight, 80), values.unitSystem);
  const weeklyLossKg = (kgNow * ratePct) / 100;
  // ~7,700 kcal per kg of body fat.
  const deficit = (weeklyLossKg * 7700) / 7;
  const p = plan(values, -deficit, 2.2);
  const goal = kgOf(nonNeg(values.goalWeight, 74), p.u);
  const weeks = goal > 0 && goal < p.kg && weeklyLossKg > 0 ? Math.log(goal / p.kg) / Math.log(1 - ratePct / 100) : 0;

  return {
    targetCalories: Math.round(p.target),
    maintenanceCalories: Math.round(p.tdee),
    dailyDeficit: Math.round(p.tdee - p.target),
    weeklyLoss: round2(mass(weeklyLossKg, p.u)),
    weeksToGoal: round2(weeks),
    proteinGrams: Math.round(p.protein),
    carbGrams: Math.round(p.carbs),
    fatGrams: Math.round(p.fat),
  };
};

// --- 8. Protein for Muscle Gain ---------------------------------------------
// g/kg/day ranges: 1 build muscle, 2 maintain, 3 cutting (lean-mass based when known).
const PROTEIN: Record<number, number[]> = { 1: [1.6, 2.2], 2: [1.2, 1.6], 3: [2.0, 2.7] };

export const proteinForMuscleGainCalculator: CustomCalculator = (values) => {
  const kg = whole(values.unit, 1) === 2 ? nonNeg(values.weight, 176) * LB : nonNeg(values.weight, 80);
  const r = PROTEIN[whole(values.goal, 1)] ?? PROTEIN[1];
  const meals = Math.max(1, whole(values.meals, 4));
  const low = kg * r[0];
  const high = kg * r[1];
  const mid = (low + high) / 2;

  return {
    dailyProteinTarget: Math.round(mid),
    dailyProteinLow: Math.round(low),
    dailyProteinHigh: Math.round(high),
    perMeal: Math.round(mid / meals),
    // ~0.4 g/kg per meal maximises muscle protein synthesis.
    perMealOptimal: Math.round(kg * 0.4),
  };
};

// --- 9. Creatine Dose -------------------------------------------------------
export const creatineDoseCalculator: CustomCalculator = (values) => {
  const kg = whole(values.unit, 1) === 2 ? nonNeg(values.weight, 176) * LB : nonNeg(values.weight, 80);
  const loadDaily = 0.3 * kg;
  const maint = Math.min(10, Math.max(3, 0.03 * kg));
  const loadDays = Math.min(7, Math.max(5, whole(values.loadingDays, 5)));

  return {
    loadingDailyDose: round2(loadDaily),
    loadingPerServing: round2(loadDaily / 4),
    loadingDays: loadDays,
    maintenanceDose: round2(maint),
    daysToSaturationWithoutLoading: 28,
    loadingPhaseTotal: round2(loadDaily * loadDays),
  };
};

export const sportsBodyCompositionCustomCalculators: Record<string, CustomCalculator> = {
  "body-fat-percentage-calculator": bodyFatPercentageCalculator,
  "navy-body-fat-calculator": navyBodyFatCalculator,
  "lean-body-mass-calculator": leanBodyMassCalculator,
  "ffmi-calculator": ffmiCalculator,
  "muscle-gain-calculator": muscleGainCalculator,
  "bulking-calculator": bulkingCalculator,
  "cutting-calculator": cuttingCalculator,
  "protein-for-muscle-gain-calculator": proteinForMuscleGainCalculator,
  "creatine-dose-calculator": creatineDoseCalculator,
};
