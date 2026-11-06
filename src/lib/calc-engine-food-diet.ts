/**
 * Batch: "Food & Drink Calculators" → Diet, Macro & Meal Planning Calculators.
 *
 * Data / methods:
 *  - Mifflin-St Jeor BMR: 10 kg + 6.25 cm − 5 age + 5 (men) / − 161 (women); activity factors
 *    1.2 / 1.375 / 1.55 / 1.725 / 1.9. 1 lb of body fat ≈ 3,500 kcal.
 *  - IOM (2005) Estimated Energy Requirement: men 662 − 9.53A + PA(15.91 kg + 539.6 m), PA 1.00 /
 *    1.11 / 1.25 / 1.48; women 354 − 6.91A + PA(9.36 kg + 726 m), PA 1.00 / 1.12 / 1.27 / 1.45.
 *    Boys 9–18: 88.5 − 61.9A + PA(26.7 kg + 903 m) + 25, PA 1.00/1.13/1.26/1.42; girls 9–18:
 *    135.3 − 30.8A + PA(10 kg + 934 m) + 25, PA 1.00/1.16/1.31/1.56 (3–8 years: + 20).
 *    Pregnancy +0 / +340 / +452 kcal by trimester; lactation +330 (0–6 mo), +400 (7–12 mo).
 *  - USDA Healthy US-Style Dietary Pattern (DGA 2020–2025), daily amounts by calorie level 1,000–3,200.
 *  - USDA Smart Snacks in School (7 CFR 210.11): snacks ≤ 200 kcal, ≤ 200 mg sodium; entrées ≤ 350 kcal,
 *    ≤ 480 mg sodium; total fat ≤ 35% of kcal, saturated fat < 10% of kcal, trans fat 0 g,
 *    total sugar ≤ 35% of weight, plus a general food-group standard.
 *  - 21 Day Fix: calorie target = lb × 11 + 400 − 750, plans A 1,200–1,499, B 1,500–1,799,
 *    C 1,800–2,099, D 2,100–2,300 (clamped to that range).
 *  - Vegan nutrient targets: B12 2.4 µg (supplement 25–100 µg daily or 2,000 µg weekly); iron RDA × 1.8
 *    for vegetarians (IOM); zinc up to 1.5 × RDA; protein ≈ 1.0 g/kg; ALA 1.6 / 1.1 g; vitamin D 15 µg.
 *  - FEMA / Ready.gov: at least 3 days of food and water, 2 weeks recommended; 1 gallon of water per
 *    person per day. Dry rice ≈ 1,650 kcal/lb, dry beans ≈ 1,550 kcal/lb, peanut butter ≈ 2,660 kcal
 *    per 16 oz jar, a canned meal ≈ 400 kcal.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-food-diet-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pick = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.round(safeNumber(v))));
const round1 = (n: number) => Math.round(n * 10) / 10;
const ACTIVITY = [1.2, 1.375, 1.55, 1.725, 1.9];

/** Body measurements from US (lb, ft, in) or metric (kg, cm) inputs. */
function body(v: Record<string, number>) {
  const metric = pick(v.units, 2) === 1;
  const kg = metric ? nonNeg(v.weight) : nonNeg(v.weight) * 0.45359237;
  const cm = metric ? nonNeg(v.heightCm) : (nonNeg(v.heightFt) * 12 + nonNeg(v.heightIn)) * 2.54;
  return { kg, cm, age: nonNeg(v.age, 30), male: pick(v.sex, 2) === 0 };
}
const bmr = (b: ReturnType<typeof body>) => 10 * b.kg + 6.25 * b.cm - 5 * b.age + (b.male ? 5 : -161);
const tdee = (v: Record<string, number>) => bmr(body(v)) * ACTIVITY[pick(v.activity, ACTIVITY.length)];

export const smartSnack: CustomCalculator = (v) => {
  const entree = pick(v.itemType, 2) === 1;
  const kcal = nonNeg(v.calories);
  const ok = (b: boolean) => (b ? 1 : 0);
  const calOk = kcal <= (entree ? 350 : 200);
  const sodiumOk = nonNeg(v.sodium) <= (entree ? 480 : 200);
  const fatOk = kcal > 0 ? (nonNeg(v.totalFat) * 9) / kcal <= 0.35 : true;
  const satOk = kcal > 0 ? (nonNeg(v.satFat) * 9) / kcal < 0.1 : true;
  const transOk = nonNeg(v.transFat) === 0;
  const sugarOk = nonNeg(v.servingGrams) > 0 ? nonNeg(v.sugar) / nonNeg(v.servingGrams) <= 0.35 : false;
  const generalOk = pick(v.generalStandard, 2) === 1;
  const all = calOk && sodiumOk && fatOk && satOk && transOk && sugarOk && generalOk;
  return { meetsSmartSnacks: ok(all), caloriesOk: ok(calOk), sodiumOk: ok(sodiumOk), totalFatOk: ok(fatOk), saturatedFatOk: ok(satOk), transFatOk: ok(transOk), sugarOk: ok(sugarOk), generalStandardOk: ok(generalOk), fatPercentOfCalories: round1(kcal > 0 ? ((nonNeg(v.totalFat) * 9) / kcal) * 100 : 0), sugarPercentOfWeight: round1(nonNeg(v.servingGrams) > 0 ? (nonNeg(v.sugar) / nonNeg(v.servingGrams)) * 100 : 0) };
};

export const mealMacro: CustomCalculator = (v) => {
  const daily = nonNeg(v.dailyCalories, 2000);
  const meals = Math.max(1, nonNeg(v.mealsPerDay, 3));
  const p = nonNeg(v.proteinPct, 30) / 100;
  const c = nonNeg(v.carbPct, 40) / 100;
  const f = nonNeg(v.fatPct, 30) / 100;
  const perMeal = daily / meals;
  const prepMeals = nonNeg(v.prepDays) * meals;
  return { caloriesPerMeal: Math.round(perMeal), proteinPerMeal: round1((perMeal * p) / 4), carbsPerMeal: round1((perMeal * c) / 4), fatPerMeal: round1((perMeal * f) / 9), mealPrepProteinTotal: round1(((perMeal * p) / 4) * prepMeals), mealPrepContainers: Math.round(prepMeals), percentTotal: round1((p + c + f) * 100) };
};

export const GOALS: [string, number][] = [["Lose weight fast (−25%)", -0.25], ["Lose weight (−20%)", -0.2], ["Lose slowly (−10%)", -0.1], ["Maintain", 0], ["Gain slowly (+10%)", 0.1], ["Gain / bulk (+15%)", 0.15]];
export const mealPlan: CustomCalculator = (v) => {
  const t = tdee(v);
  const g = GOALS[pick(v.goal, GOALS.length)][1];
  const minK = body(v).male ? 1500 : 1200;
  const cal = Math.max(minK, t * (1 + g));
  const snacks = pick(v.snacks, 3);
  const split = [[0.3, 0.35, 0.35, 0], [0.25, 0.35, 0.3, 0.1], [0.25, 0.3, 0.3, 0.15]][snacks];
  const b = body(v);
  const proteinG = Math.max(b.kg * (g < 0 ? 1.6 : 1.2), (cal * 0.25) / 4);
  return { dailyCalories: Math.round(cal), breakfastCalories: Math.round(cal * split[0]), lunchCalories: Math.round(cal * split[1]), dinnerCalories: Math.round(cal * split[2]), snackCalories: Math.round(cal * split[3]), proteinGrams: Math.round(proteinG), carbsGrams: Math.round((cal * 0.45) / 4), fatGrams: Math.round((cal * 0.3) / 9), maintenanceCalories: Math.round(t) };
};

/** USDA Healthy US-Style pattern: [kcal, fruits cups, vegetables cups, grains oz-eq, protein oz-eq, dairy cups, oils g]. */
export const MYPLATE: [number, number, number, number, number, number, number][] = [
  [1000, 1, 1, 3, 2, 2, 15], [1200, 1, 1.5, 4, 3, 2.5, 17], [1400, 1.5, 1.5, 5, 4, 2.5, 17], [1600, 1.5, 2, 5, 5, 3, 22], [1800, 1.5, 2.5, 6, 5, 3, 24], [2000, 2, 2.5, 6, 5.5, 3, 27], [2200, 2, 3, 7, 6, 3, 29], [2400, 2, 3, 8, 6.5, 3, 31], [2600, 2, 3.5, 9, 6.5, 3, 34], [2800, 2.5, 3.5, 10, 7, 3, 36], [3000, 2.5, 4, 10, 7, 3, 44], [3200, 2.5, 4, 10, 7, 3, 51],
];
export const myPlate: CustomCalculator = (v) => {
  const t = tdee(v) * [1, 0.85, 1.1][pick(v.goal, 3)];
  const level = Math.min(3200, Math.max(1000, Math.round(t / 200) * 200));
  const row = MYPLATE.find((r) => r[0] === level) ?? MYPLATE[5];
  return { calorieLevel: row[0], fruitsCups: row[1], vegetablesCups: row[2], grainsOunces: row[3], wholeGrainsOunces: round1(row[3] / 2), proteinOunces: row[4], dairyCups: row[5], oilsGrams: row[6], estimatedNeeds: Math.round(t) };
};

export const gainWeight: CustomCalculator = (v) => {
  const t = tdee(v);
  const rate = nonNeg(v.lbPerWeek, 0.5);
  const surplus = (rate * 3500) / 7;
  const b = body(v);
  const goalKg = pick(v.units, 2) === 1 ? nonNeg(v.goalWeight) : nonNeg(v.goalWeight) * 0.45359237;
  const toGainLb = Math.max(0, (goalKg - b.kg) / 0.45359237);
  return { dailyCalories: Math.round(t + surplus), surplusCalories: Math.round(surplus), maintenanceCalories: Math.round(t), proteinGrams: Math.round(b.kg * 1.8), weeksToGoal: round1(rate > 0 ? toGainLb / rate : 0), peanutButterTbspForSurplus: round1(surplus / 94), wholeMilkCupsForSurplus: round1(surplus / 149) };
};

export const FIX_PLANS: [string, number, number, number, number, number, number, number][] = [
  // plan, green, purple, red, yellow, blue, orange, teaspoons
  ["A (1,200–1,499)", 3, 2, 4, 2, 1, 1, 2], ["B (1,500–1,799)", 4, 3, 4, 3, 1, 1, 4], ["C (1,800–2,099)", 5, 3, 5, 4, 1, 1, 5], ["D (2,100–2,300)", 6, 4, 6, 4, 1, 1, 6],
];
export const fix21: CustomCalculator = (v) => {
  const lb = pick(v.weightUnit, 2) === 1 ? nonNeg(v.weight) / 0.45359237 : nonNeg(v.weight);
  const raw = lb * 11 + 400 - 750;
  const target = Math.min(2300, Math.max(1200, raw));
  const plan = target < 1500 ? 0 : target < 1800 ? 1 : target < 2100 ? 2 : 3;
  const p = FIX_PLANS[plan];
  return { plan: plan + 1, calorieTarget: Math.round(target), green: p[1], purple: p[2], red: p[3], yellow: p[4], blue: p[5], orange: p[6], teaspoons: p[7], calculatedBeforeLimits: Math.round(raw) };
};

export const iifym: CustomCalculator = (v) => {
  const t = tdee(v);
  const g = GOALS[pick(v.goal, GOALS.length)][1];
  const cal = t * (1 + g);
  const lb = body(v).kg / 0.45359237;
  const protein = lb * nonNeg(v.proteinPerLb, 1);
  const fat = (cal * (nonNeg(v.fatPercent, 25) / 100)) / 9;
  const carbs = Math.max(0, (cal - protein * 4 - fat * 9) / 4);
  return { dailyCalories: Math.round(cal), proteinGrams: Math.round(protein), fatGrams: Math.round(fat), carbsGrams: Math.round(carbs), fiberGrams: Math.round((cal / 1000) * 14), bmr: Math.round(bmr(body(v))), maintenanceCalories: Math.round(t) };
};

export const animalBased: CustomCalculator = (v) => {
  const t = tdee(v) * (1 + GOALS[pick(v.goal, GOALS.length)][1]);
  const lb = body(v).kg / 0.45359237;
  const protein = lb * nonNeg(v.proteinPerLb, 1);
  const carbs = (t * (nonNeg(v.carbPercent, 25) / 100)) / 4;
  const fat = Math.max(0, (t - protein * 4 - carbs * 4) / 9);
  // Food guide: ~75% of protein from meat (80/20 ground beef ≈ 78 g protein per raw lb), ~15% from eggs
  // (6 g each); carbs from fruit (≈ 25 g per serving) and honey (17 g per tbsp), split 80/20.
  return { dailyCalories: Math.round(t), proteinGrams: Math.round(protein), fatGrams: Math.round(fat), carbsGrams: Math.round(carbs), meatLbPerDay: round2((protein * 0.75) / 78), eggsPerDay: Math.round((protein * 0.15) / 6), fruitServings: round1((carbs * 0.8) / 25), honeyTbsp: round1((carbs * 0.2) / 17) };
};

export const mediterranean: CustomCalculator = (v) => {
  const t = tdee(v) * (1 + GOALS[pick(v.goal, GOALS.length)][1]);
  return { dailyCalories: Math.round(t), carbsGrams: Math.round((t * 0.45) / 4), fatGrams: Math.round((t * 0.37) / 9), proteinGrams: Math.round((t * 0.18) / 4), oliveOilTbsp: round1(Math.min(4, (t * 0.15) / 119)), vegetableServings: Math.round(t / 400), fruitServings: Math.round(t / 800), fishServingsPerWeek: 3, legumeServingsPerWeek: 4, fiberGrams: Math.round((t / 1000) * 14) };
};

export const veganNeeds: CustomCalculator = (v) => {
  const b = body(v);
  const life = pick(v.lifeStage, 3); // none, pregnant, breastfeeding
  const female = !b.male;
  const ironRda = life === 1 ? 27 : life === 2 ? 9 : female && b.age < 51 ? 18 : 8;
  const zincRda = life === 1 ? 11 : life === 2 ? 12 : female ? 8 : 11;
  return { proteinGrams: Math.round(b.kg * (life ? 1.3 : 1.0)), ironMg: round1(ironRda * 1.8), zincMg: round1(zincRda * 1.5), calciumMg: (female && b.age > 50) || b.age > 70 ? 1200 : 1000, b12Mcg: life === 1 ? 2.6 : life === 2 ? 2.8 : 2.4, omega3AlaGrams: life === 1 ? 1.4 : life === 2 ? 1.3 : female ? 1.1 : 1.6, vitaminDMcg: b.age > 70 ? 20 : 15, iodineMcg: life === 1 ? 220 : life === 2 ? 290 : 150, calories: Math.round(tdee(v)) };
};

export const eer: CustomCalculator = (v) => {
  const b = body(v);
  const m = b.cm / 100;
  const a = pick(v.activity, 4);
  const age = b.age;
  let kcal: number;
  if (age >= 19) {
    kcal = b.male ? 662 - 9.53 * age + [1, 1.11, 1.25, 1.48][a] * (15.91 * b.kg + 539.6 * m) : 354 - 6.91 * age + [1, 1.12, 1.27, 1.45][a] * (9.36 * b.kg + 726 * m);
  } else {
    const extra = age >= 9 ? 25 : 20;
    kcal = b.male ? 88.5 - 61.9 * age + [1, 1.13, 1.26, 1.42][a] * (26.7 * b.kg + 903 * m) + extra : 135.3 - 30.8 * age + [1, 1.16, 1.31, 1.56][a] * (10 * b.kg + 934 * m) + extra;
  }
  const add = [0, 0, 340, 452, 330, 400][pick(v.lifeStage, 6)];
  return { eer: Math.round(kcal + add), baseEer: Math.round(kcal), pregnancyLactationExtra: add, bmrMifflin: Math.round(bmr(b)), proteinRdaGrams: Math.round(b.kg * 0.8 + (pick(v.lifeStage, 6) >= 2 ? 25 : 0)), caloriesPerKg: round1(b.kg > 0 ? (kcal + add) / b.kg : 0) };
};

export const emergencyFood: CustomCalculator = (v) => {
  const days = nonNeg(v.days, 14);
  const kcal = (nonNeg(v.adults, 2) * nonNeg(v.adultCalories, 2000) + nonNeg(v.kids) * 1400) * days;
  const people = nonNeg(v.adults, 2) + nonNeg(v.kids);
  return { totalCalories: Math.round(kcal), waterGallons: Math.round(people * days * nonNeg(v.waterPerDay, 1)), riceLb: round1((kcal * 0.3) / 1650), beansLb: round1((kcal * 0.2) / 1550), cannedMeals: Math.ceil((kcal * 0.35) / 400), peanutButterJars: Math.ceil((kcal * 0.15) / 2660), caloriesPerPersonPerDay: Math.round(people > 0 ? kcal / people / Math.max(1, days) : 0) };
};

export const foodDietCustomCalculators: Record<string, CustomCalculator> = {
  "smart-snack-calculator": smartSnack,
  "meal-macro-calculator": mealMacro,
  "meal-plan-calculator": mealPlan,
  "myplate-plan-calculator": myPlate,
  "gain-weight-food-calorie-calculator": gainWeight,
  "21-day-fix-calculator": fix21,
  "if-it-fits-your-macros-calculator": iifym,
  "animal-based-calculator": animalBased,
  "mediterranean-diet-macros-calculator": mediterranean,
  "vegan-nutrition-calculator": veganNeeds,
  "nutrition-eer-calculator": eer,
  "emergency-food-supply-calculator": emergencyFood,
};
