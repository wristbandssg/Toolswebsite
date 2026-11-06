// One-time (but safe to re-run) batch setup script: creates 12 calculators in Food & Drink
// Calculators > Diet, Macro & Meal Planning Calculators. Formulas and reference tables live in
// src/lib/calc-engine-food-diet.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-diet-calculators.ts
// or
//   npm run db:create-food-diet-calculators

import * as E from "../src/lib/calc-engine-food-diet";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  cat: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

const DM = "diet-macro-meal-planning-calculators";
const NOTES: Record<string, string> = {
  [DM]: "These are general estimates for healthy adults, not medical advice. Ask a doctor or registered dietitian before major diet changes, especially if you are pregnant, under 18, or have diabetes, kidney disease or a history of eating disorders.",
};

interface Spec { slug: string; cat: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  return {
    slug: s.slug,
    cat: s.cat,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Calculator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt] },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTES[s.cat]}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const BODY = (sexDef = 1) => [dropdown("units", "Units", opts(["US (lb, ft/in)", "Metric (kg, cm)"]), 0), dropdown("sex", "Sex", opts(["Male", "Female"]), sexDef), num("age", "Age", 35, 100, 1, 2), num("weight", "Weight", 160, 1000, 0.5, 20), num("heightFt", "Height — feet (US)", 5, 8, 1, 3), num("heightIn", "Height — inches (US)", 6, 11.9, 0.5), num("heightCm", "Height — cm (metric)", 168, 250, 0.5, 90)];
const ACT = dropdown("activity", "Activity Level", opts(["Sedentary (desk job, little exercise)", "Light (exercise 1–3 days/week)", "Moderate (3–5 days/week)", "Very active (6–7 days/week)", "Extra active (hard training or physical job)"]), 1);
const GOAL = (def = 3) => dropdown("goal", "Goal", opts(E.GOALS.map(([n]) => n)), def);
const exBody = { units: 0, sex: 1, age: 35, weight: 160, heightFt: 5, heightIn: 6, heightCm: 168 };

const TOOLS: ToolDef[] = [
  mk({
    slug: "smart-snack-calculator", cat: DM, title: "Smart Snacks in School Calculator (USDA Standards Check)",
    desc: "Check whether a snack or à la carte entrée meets USDA Smart Snacks in School nutrition standards — calories, sodium, total fat, saturated fat, trans fat and sugar — from its nutrition facts label.",
    meta: "Smart Snack Calculator — Does It Meet USDA Smart Snacks Rules?",
    inputs: [dropdown("itemType", "Item Type", opts(["Snack or side", "Entrée (sold à la carte)"]), 0), num("servingGrams", "Serving Size (g)", 28, 2000, 0.5), num("calories", "Calories", 140, 2000, 1), num("totalFat", "Total Fat (g)", 5, 200, 0.5), num("satFat", "Saturated Fat (g)", 1, 100, 0.5), num("transFat", "Trans Fat (g)", 0, 50, 0.1), num("sugar", "Total Sugars (g)", 8, 500, 0.5), num("sodium", "Sodium (mg)", 160, 5000, 5), dropdown("generalStandard", "General Standard Met? (first ingredient is a whole grain, fruit, vegetable, dairy or protein food; or ≥ ¼ cup fruit/veg)", opts(["No", "Yes"]), 1)],
    results: [["meetsSmartSnacks", "Meets Smart Snacks (1 = yes · 0 = no)", "n"], ["caloriesOk", "Calories OK", "n"], ["sodiumOk", "Sodium OK", "n"], ["totalFatOk", "Total Fat ≤ 35% of Calories", "n"], ["saturatedFatOk", "Saturated Fat < 10% of Calories", "n"], ["transFatOk", "Trans Fat 0 g", "n"], ["sugarOk", "Sugar ≤ 35% by Weight", "n"], ["generalStandardOk", "General Standard", "n"], ["fatPercentOfCalories", "Fat % of Calories", "n"], ["sugarPercentOfWeight", "Sugar % of Weight", "n"]],
    fn: E.smartSnack, ex: { itemType: 0, servingGrams: 28, calories: 140, totalFat: 5, satFat: 1, transFat: 0, sugar: 8, sodium: 160, generalStandard: 1 },
    exText: (o) => `Example: a 28 g whole-grain snack bar with 140 calories, 5 g fat, 1 g saturated fat, 8 g sugar and 160 mg sodium ${o.meetsSmartSnacks ? "meets" : "does not meet"} the Smart Snacks standards (fat is ${o.fatPercentOfCalories}% of calories).`,
    how: "Copy the values for one serving as sold from the nutrition facts label. Snacks and sides must be 200 calories or less and 200 mg sodium or less; à la carte entrées 350 calories and 480 mg sodium.\n\nSome foods are exempt from parts of the rules (for example plain nuts and seeds from the fat limit, dried fruit from the sugar limit, reduced-fat cheese from the fat limits) — this check does not apply exemptions.",
    assume: "USDA Smart Snacks in School standards (7 CFR 210.11), which apply to foods sold to students during the school day outside school meals. Beverages have separate size and calorie rules not covered here.",
    faq: [["What are the Smart Snacks rules?", "≤ 200 calories, ≤ 200 mg sodium, ≤ 35% of calories from fat, < 10% from saturated fat, 0 g trans fat and ≤ 35% sugar by weight, plus a food-group requirement."], ["Do Smart Snacks rules apply to class parties?", "No — they apply to food sold to students during the school day; celebrations are set by local wellness policies."]],
  }),
  mk({
    slug: "meal-macro-calculator", cat: DM, title: "Meal Macro Calculator (Macros per Meal & Meal Prep)",
    desc: "Split your daily calories and macro targets into meals — protein, carbs and fat per meal — and plan a meal-prep batch with total protein to cook and containers needed.",
    meta: "Meal Macro Calculator — Protein, Carbs & Fat per Meal",
    inputs: [num("dailyCalories", "Daily Calorie Target", 2000, 10000, 10), num("mealsPerDay", "Meals per Day", 3, 8, 1, 1), pct("proteinPct", "Protein (% of calories)", 30, 70, 1), pct("carbPct", "Carbs (% of calories)", 40, 80, 1), pct("fatPct", "Fat (% of calories)", 30, 80, 1), num("prepDays", "Days of Meal Prep (0 to skip)", 5, 14, 1)],
    results: [["caloriesPerMeal", "Calories per Meal", "n"], ["proteinPerMeal", "Protein per Meal (g)", "n"], ["carbsPerMeal", "Carbs per Meal (g)", "n"], ["fatPerMeal", "Fat per Meal (g)", "n"], ["mealPrepProteinTotal", "Protein to Prep for the Batch (g)", "n"], ["mealPrepContainers", "Meal-Prep Containers", "n"], ["percentTotal", "Macro Percentages Total (should be 100)", "n"]],
    fn: E.mealMacro, ex: { dailyCalories: 2000, mealsPerDay: 3, proteinPct: 30, carbPct: 40, fatPct: 30, prepDays: 5 },
    exText: (o) => `Example: 2,000 calories over 3 meals at 30/40/30 is ${o.caloriesPerMeal} calories per meal — ${o.proteinPerMeal} g protein, ${o.carbsPerMeal} g carbs and ${o.fatPerMeal} g fat.`,
    how: "Enter your daily target (from a TDEE or IIFYM calculator) and your macro split; make sure the percentages add up to 100. For meal prep, enter how many days you are cooking for.\n\nAbout 113 g (4 oz) of cooked chicken breast gives 35 g of protein.",
    assume: "Grams = calories × share ÷ 4 for protein and carbs, ÷ 9 for fat. Meals are split evenly; move calories between meals if you prefer a bigger dinner.",
    faq: [["How much protein should I eat per meal?", "Around 25–40 g per meal suits most adults aiming for muscle maintenance or growth."], ["What is a good macro split?", "30/40/30 (protein/carbs/fat) is a common balanced split; athletes often use more carbs."]],
  }),
  mk({
    slug: "meal-plan-calculator", cat: DM, title: "Meal Plan Calculator (Calories per Meal)",
    desc: "Work out your daily calories for weight loss, maintenance or gain and split them into breakfast, lunch, dinner and snacks, with daily protein, carb and fat targets.",
    meta: "Meal Plan Calculator — Daily Calories Split Into Meals",
    inputs: [...BODY(), ACT, GOAL(1), dropdown("snacks", "Snacks", opts(["No snacks (3 meals)", "1 snack", "2 snacks"]), 1)],
    results: [["dailyCalories", "Daily Calories", "n"], ["breakfastCalories", "Breakfast", "n"], ["lunchCalories", "Lunch", "n"], ["dinnerCalories", "Dinner", "n"], ["snackCalories", "Snacks (total)", "n"], ["proteinGrams", "Protein (g/day)", "n"], ["carbsGrams", "Carbs (g/day)", "n"], ["fatGrams", "Fat (g/day)", "n"], ["maintenanceCalories", "Maintenance Calories (TDEE)", "n"]],
    fn: E.mealPlan, ex: { ...exBody, activity: 1, goal: 1, snacks: 1 },
    exText: (o) => `Example: a 35-year-old, 5 ft 6 in, 160 lb woman with light activity aiming to lose weight needs about ${fmt(o.dailyCalories, 0)} calories a day — about ${o.breakfastCalories} at breakfast, ${o.lunchCalories} at lunch, ${o.dinnerCalories} at dinner and ${o.snackCalories} in snacks.`,
    how: "Enter your details and goal. The plan never goes below 1,200 calories (women) or 1,500 (men) without medical supervision.\n\nBuild each meal around a protein, a vegetable or fruit, and a whole grain or starchy food.",
    assume: "Maintenance = Mifflin-St Jeor BMR × activity factor. Goals adjust it by −25% to +15%. Protein is at least 1.6 g/kg when losing weight (1.2 g/kg otherwise) or 25% of calories; carbs 45% and fat 30% of calories.",
    faq: [["How many calories should I eat to lose weight?", "About 10–25% below your maintenance calories — for many people 1,400–2,000 a day."], ["How should I split calories between meals?", "A common split is 25% breakfast, 35% lunch, 30% dinner and 10% snacks."]],
  }),
  mk({
    slug: "myplate-plan-calculator", cat: DM, title: "MyPlate Plan Calculator (Daily Food Group Amounts)",
    desc: "Get your USDA MyPlate food group targets — cups of fruits and vegetables, ounces of grains and protein, cups of dairy and oils — for your calorie level based on age, sex, size and activity.",
    meta: "MyPlate Plan Calculator — Daily Food Groups by Calorie Level",
    inputs: [...BODY(), ACT, dropdown("goal", "Goal", opts(["Maintain my weight", "Lose weight", "Gain weight"]), 0)],
    results: [["calorieLevel", "MyPlate Calorie Level", "n"], ["fruitsCups", "Fruits (cups/day)", "n"], ["vegetablesCups", "Vegetables (cups/day)", "n"], ["grainsOunces", "Grains (oz-equivalents/day)", "n"], ["wholeGrainsOunces", "…of Which Whole Grains (oz)", "n"], ["proteinOunces", "Protein Foods (oz-equivalents/day)", "n"], ["dairyCups", "Dairy (cups/day)", "n"], ["oilsGrams", "Oils (g/day)", "n"], ["estimatedNeeds", "Estimated Calorie Needs", "n"]],
    fn: E.myPlate, ex: { ...exBody, activity: 1, goal: 0 },
    exText: (o) => `Example: at the ${fmt(o.calorieLevel, 0)}-calorie level, MyPlate recommends ${o.fruitsCups} cups of fruit, ${o.vegetablesCups} cups of vegetables, ${o.grainsOunces} oz of grains, ${o.proteinOunces} oz of protein foods and ${o.dairyCups} cups of dairy a day.`,
    how: "Enter your details. Equivalents: 1 oz of grains = 1 slice of bread or ½ cup cooked rice or pasta; 1 oz of protein = 1 oz meat or fish, 1 egg, ¼ cup beans or 1 tbsp peanut butter; 1 cup dairy = 1 cup milk or yogurt or 1½ oz cheese.",
    assume: "Daily amounts from the USDA Healthy US-Style Dietary Pattern (Dietary Guidelines 2020–2025) at calorie levels from 1,000 to 3,200, chosen from Mifflin-St Jeor × activity rounded to the nearest 200. Children and pregnancy have separate MyPlate plans.",
    faq: [["How many cups of vegetables a day?", "2½ cups at 2,000 calories, rising to 3–4 cups at higher calorie levels."], ["What is a MyPlate Plan?", "USDA's personalised list of daily food group amounts for your calorie level."]],
  }),
  mk({
    slug: "gain-weight-food-calorie-calculator", cat: DM, title: "Weight Gain Calorie Calculator",
    desc: "Find how many calories to eat to gain weight at a healthy pace — your maintenance, daily surplus, protein target and weeks to your goal weight — with easy foods to cover the surplus.",
    meta: "Gain Weight Calorie Calculator — Calories to Gain Weight",
    inputs: [...BODY(0), ACT, num("goalWeight", "Goal Weight (same unit)", 175, 1000, 0.5), num("lbPerWeek", "Gain per Week (lb; 0.25–1 recommended)", 0.5, 2, 0.05, 0.1)],
    results: [["dailyCalories", "Daily Calories to Gain", "n"], ["surplusCalories", "Daily Surplus", "n"], ["maintenanceCalories", "Maintenance Calories", "n"], ["proteinGrams", "Protein (g/day)", "n"], ["weeksToGoal", "Weeks to Goal", "n"], ["peanutButterTbspForSurplus", "Surplus as Tablespoons of Peanut Butter", "n"], ["wholeMilkCupsForSurplus", "…or Cups of Whole Milk", "n"]],
    fn: E.gainWeight, ex: { units: 0, sex: 0, age: 25, weight: 150, heightFt: 5, heightIn: 10, heightCm: 178, activity: 2, goalWeight: 165, lbPerWeek: 0.5 },
    exText: (o) => `Example: a 25-year-old, 5 ft 10 in, 150 lb man who exercises moderately needs about ${fmt(o.dailyCalories, 0)} calories a day to gain half a pound a week, reaching 165 lb in about ${o.weeksToGoal} weeks.`,
    how: "Choose a gain rate — about 0.25–0.5 lb a week keeps most of the gain as muscle if you strength-train. Add calories with energy-dense foods: nut butters, whole milk, olive oil, granola, dried fruit, rice and smoothies.",
    assume: "Maintenance = Mifflin-St Jeor × activity. Surplus = lb per week × 3,500 ÷ 7. Protein 1.8 g per kg of body weight. Weight change is rarely linear — adjust after 2–3 weeks.",
    faq: [["How many extra calories do I need to gain a pound a week?", "About 500 extra a day."], ["What foods help you gain weight healthily?", "Nuts, nut butters, whole milk, yogurt, eggs, oily fish, avocado, olive oil, rice, oats and smoothies."]],
  }),
  mk({
    slug: "21-day-fix-calculator", cat: DM, title: "21 Day Fix Calculator (Container Plan)",
    desc: "Find your 21 Day Fix calorie bracket (Plan A, B, C or D) from your weight and how many green, purple, red, yellow, blue and orange containers and teaspoons to eat each day.",
    meta: "21 Day Fix Calculator — Calorie Bracket & Container Counts",
    inputs: [dropdown("weightUnit", "Weight Unit", opts(["Pounds", "Kilograms"]), 0), num("weight", "Current Weight", 160, 1000, 0.5, 50)],
    results: [["plan", "Plan (1 A · 2 B · 3 C · 4 D)", "n"], ["calorieTarget", "Calorie Target", "n"], ["green", "Green — Vegetables", "n"], ["purple", "Purple — Fruits", "n"], ["red", "Red — Proteins", "n"], ["yellow", "Yellow — Carbs", "n"], ["blue", "Blue — Healthy Fats", "n"], ["orange", "Orange — Seeds & Dressings", "n"], ["teaspoons", "Teaspoons — Oils & Nut Butters", "n"], ["calculatedBeforeLimits", "Calculated Target Before Limits", "n"]],
    fn: E.fix21, ex: { weightUnit: 0, weight: 160 },
    exText: (o) => `Example: at 160 lb the formula gives ${fmt(o.calculatedBeforeLimits, 0)} calories — Plan ${["A", "B", "C", "D"][o.plan - 1]}: ${o.green} green, ${o.purple} purple, ${o.red} red, ${o.yellow} yellow, ${o.blue} blue, ${o.orange} orange and ${o.teaspoons} teaspoons a day.`,
    how: "Enter your current weight. Fill each colour container level with the matching food group. If your result is below 1,200, the program rounds up to Plan A; above 2,300, it rounds down to Plan D.",
    assume: "Program formula: weight (lb) × 11 = baseline; + 400 for the workouts; − 750 for the deficit. Brackets: A 1,200–1,499, B 1,500–1,799, C 1,800–2,099, D 2,100–2,300. The program is independent of this site.",
    faq: [["How do I calculate my 21 Day Fix bracket?", "Multiply your weight by 11, add 400 and subtract 750."], ["What do the 21 Day Fix container colours mean?", "Green vegetables, purple fruit, red protein, yellow carbs, blue healthy fats, orange seeds and dressings."]],
  }),
  mk({
    slug: "if-it-fits-your-macros-calculator", cat: DM, title: "IIFYM Calculator (If It Fits Your Macros)",
    desc: "Calculate flexible-dieting macros: your calories for your goal and grams of protein, fat and carbs, using protein per pound and a fat percentage, with your BMR and TDEE.",
    meta: "IIFYM Calculator — If It Fits Your Macros Targets",
    inputs: [...BODY(0), ACT, GOAL(2), num("proteinPerLb", "Protein (g per lb of body weight)", 1, 1.5, 0.05, 0.5), pct("fatPercent", "Fat (% of calories)", 25, 50, 1)],
    results: [["dailyCalories", "Daily Calories", "n"], ["proteinGrams", "Protein (g)", "n"], ["fatGrams", "Fat (g)", "n"], ["carbsGrams", "Carbs (g)", "n"], ["fiberGrams", "Fiber Target (g)", "n"], ["bmr", "BMR", "n"], ["maintenanceCalories", "TDEE (maintenance)", "n"]],
    fn: E.iifym, ex: { units: 0, sex: 0, age: 30, weight: 185, heightFt: 5, heightIn: 11, heightCm: 180, activity: 2, goal: 2, proteinPerLb: 1, fatPercent: 25 },
    exText: (o) => `Example: a 30-year-old, 185 lb, 5 ft 11 in man who trains moderately and wants slow fat loss gets ${fmt(o.dailyCalories, 0)} calories — ${o.proteinGrams} g protein, ${o.fatGrams} g fat and ${o.carbsGrams} g carbs.`,
    how: "Set protein first (0.7–1 g per lb), fat at 20–35% of calories, and let carbs fill the rest. Within those numbers you can eat any foods you like — but keep fibre and micronutrients in mind.",
    assume: "TDEE = Mifflin-St Jeor × activity; goals adjust by −25% to +15%. Carbs = (calories − protein × 4 − fat × 9) ÷ 4. Fiber 14 g per 1,000 calories (Dietary Guidelines).",
    faq: [["What does IIFYM mean?", "If It Fits Your Macros — flexible dieting where you hit calorie and macro targets with any foods."], ["How much protein for IIFYM?", "Usually 0.7–1 g per pound of body weight."]],
  }),
  mk({
    slug: "animal-based-calculator", cat: DM, title: "Animal-Based Diet Calculator (Macros & Food Amounts)",
    desc: "Plan an animal-based diet — meat, eggs, fruit and honey — with daily calories, protein, fat and carbs and roughly how much meat, how many eggs and how much fruit and honey that means.",
    meta: "Animal Based Diet Calculator — Macros, Meat & Fruit per Day",
    inputs: [...BODY(0), ACT, GOAL(3), num("proteinPerLb", "Protein (g per lb of body weight)", 1, 1.5, 0.05, 0.5), pct("carbPercent", "Carbs From Fruit & Honey (% of calories)", 25, 60, 1)],
    results: [["dailyCalories", "Daily Calories", "n"], ["proteinGrams", "Protein (g)", "n"], ["fatGrams", "Fat (g)", "n"], ["carbsGrams", "Carbs (g)", "n"], ["meatLbPerDay", "Meat per Day (lb raw, 80/20 equivalent)", "n"], ["eggsPerDay", "Eggs per Day", "n"], ["fruitServings", "Fruit Servings", "n"], ["honeyTbsp", "Honey (tbsp)", "n"]],
    fn: E.animalBased, ex: { units: 0, sex: 0, age: 35, weight: 180, heightFt: 5, heightIn: 10, heightCm: 178, activity: 1, goal: 3, proteinPerLb: 1, carbPercent: 25 },
    exText: (o) => `Example: a 180 lb man maintaining weight needs about ${fmt(o.dailyCalories, 0)} calories — ${o.proteinGrams} g protein, ${o.fatGrams} g fat and ${o.carbsGrams} g carbs, or roughly ${o.meatLbPerDay} lb of meat, ${o.eggsPerDay} eggs, ${o.fruitServings} servings of fruit and ${o.honeyTbsp} tbsp of honey.`,
    how: "The animal-based approach builds meals around meat, organ meats, eggs and dairy, with fruit and honey as the main carbs. Set your protein and carb share; fat fills the rest.\n\nVery high red-meat intake raises saturated fat — talk to your doctor if you have heart or kidney concerns, and get your blood work checked.",
    assume: "Calories = Mifflin-St Jeor × activity × goal. About 75% of protein from meat (80/20 ground beef ≈ 78 g protein per raw lb) and 15% from eggs (6 g each); carbs split 80% fruit (≈ 25 g a serving) and 20% honey (17 g per tbsp).",
    faq: [["What is the animal-based diet?", "A diet centred on animal foods — meat, organs, eggs, dairy — plus fruit and honey, and few other plant foods."], ["How much meat a day on an animal-based diet?", "Often 1–2 lb a day, depending on body size and protein target."]],
  }),
  mk({
    slug: "mediterranean-diet-macros-calculator", cat: DM, title: "Mediterranean Diet Macro Calculator",
    desc: "Get Mediterranean-diet targets for your calories — carbs, fat and protein in grams, tablespoons of olive oil, daily vegetable and fruit servings, weekly fish and legumes, and fiber.",
    meta: "Mediterranean Diet Macros Calculator — Daily Targets",
    inputs: [...BODY(), ACT, GOAL(3)],
    results: [["dailyCalories", "Daily Calories", "n"], ["carbsGrams", "Carbs (g) — about 45%", "n"], ["fatGrams", "Fat (g) — about 37%", "n"], ["proteinGrams", "Protein (g) — about 18%", "n"], ["oliveOilTbsp", "Extra-Virgin Olive Oil (tbsp/day)", "n"], ["vegetableServings", "Vegetable Servings / Day", "n"], ["fruitServings", "Fruit Servings / Day", "n"], ["fishServingsPerWeek", "Fish / Seafood (servings/week)", "n"], ["legumeServingsPerWeek", "Legumes (servings/week)", "n"], ["fiberGrams", "Fiber (g/day)", "n"]],
    fn: E.mediterranean, ex: { ...exBody, activity: 1, goal: 3 },
    exText: (o) => `Example: at ${fmt(o.dailyCalories, 0)} calories, a Mediterranean pattern is about ${o.carbsGrams} g carbs, ${o.fatGrams} g fat (including ${o.oliveOilTbsp} tbsp olive oil) and ${o.proteinGrams} g protein, with ${o.vegetableServings} servings of vegetables a day.`,
    how: "Build meals around vegetables, fruit, whole grains, beans and lentils, nuts and olive oil; eat fish twice or more a week; keep red meat and sweets occasional.",
    assume: "Macros reflect typical Mediterranean-diet trials (PREDIMED-style): ~45% carbs, ~37% fat (mainly olive oil and nuts), ~18% protein. Olive oil up to 4 tbsp/day; at least 3 servings of fish and 3–4 of legumes a week; fibre 14 g per 1,000 calories.",
    faq: [["How much olive oil on the Mediterranean diet?", "About 2–4 tablespoons a day in most studies."], ["Is the Mediterranean diet high in carbs?", "Moderate — mostly from vegetables, fruit, legumes and whole grains."]],
  }),
  mk({
    slug: "vegan-nutrition-calculator", cat: DM, title: "Vegan Nutrition Calculator (Daily Nutrient Needs)",
    desc: "See the key nutrients to plan for on a vegan diet — protein, iron, zinc, calcium, vitamin B12, omega-3 ALA, vitamin D and iodine — adjusted for your age, sex, weight, pregnancy or breastfeeding.",
    meta: "Vegan Nutrition Calculator — Protein, B12, Iron & Zinc Needs",
    inputs: [...BODY(), ACT, dropdown("lifeStage", "Pregnancy / Breastfeeding", opts(["Neither", "Pregnant", "Breastfeeding"]), 0)],
    results: [["proteinGrams", "Protein (g/day)", "n"], ["ironMg", "Iron (mg/day, vegetarian RDA)", "n"], ["zincMg", "Zinc (mg/day, up to)", "n"], ["calciumMg", "Calcium (mg/day)", "n"], ["b12Mcg", "Vitamin B12 RDA (µg/day — supplement)", "n"], ["omega3AlaGrams", "Omega-3 ALA (g/day)", "n"], ["vitaminDMcg", "Vitamin D (µg/day)", "n"], ["iodineMcg", "Iodine (µg/day)", "n"], ["calories", "Estimated Calories", "n"]],
    fn: E.veganNeeds, ex: { ...exBody, activity: 1, lifeStage: 0 },
    exText: (o) => `Example: a 35-year-old, 160 lb vegan woman should aim for about ${o.proteinGrams} g protein, ${o.ironMg} mg iron, ${o.calciumMg} mg calcium and a reliable B12 source every day.`,
    how: "Use these as daily targets. Good vegan sources: protein — tofu, tempeh, seitan, lentils, beans, soy milk; iron — lentils, beans, tofu, fortified cereal (with vitamin C); calcium — fortified plant milk, calcium-set tofu, kale; omega-3 — flax, chia, walnuts; iodine — iodised salt.\n\nVitamin B12 must come from a supplement or fortified foods.",
    assume: "IOM recommended intakes, with iron × 1.8 for vegetarian diets (lower absorption of non-heme iron) and zinc up to × 1.5. Protein ≈ 1.0 g/kg (1.3 in pregnancy or breastfeeding) to allow for plant-protein digestibility. B12: a common supplement plan is 25–100 µg daily or 2,000 µg once a week.",
    faq: [["Do vegans need B12 supplements?", "Yes — B12 is not reliably available from plant foods."], ["How do vegans get enough iron?", "Beans, lentils, tofu and fortified foods eaten with vitamin C; vegetarians need about 1.8 times the usual iron RDA."]],
  }),
  mk({
    slug: "nutrition-eer-calculator", cat: DM, title: "Estimated Energy Requirement (EER) Calculator",
    desc: "Calculate your Estimated Energy Requirement with the Institute of Medicine equations used by dietitians — for adults and children 3–18 — with the extra calories for pregnancy and breastfeeding.",
    meta: "Nutrition EER Calculator — Estimated Energy Requirement (IOM)",
    inputs: [...BODY(), dropdown("activity", "Physical Activity Level", opts(["Sedentary", "Low active", "Active", "Very active"]), 1), dropdown("lifeStage", "Pregnancy / Lactation", opts(["Neither", "Pregnant — 1st trimester", "Pregnant — 2nd trimester", "Pregnant — 3rd trimester", "Breastfeeding 0–6 months", "Breastfeeding 7–12 months"]), 0)],
    results: [["eer", "Estimated Energy Requirement (kcal/day)", "n"], ["baseEer", "EER Before Pregnancy / Lactation", "n"], ["pregnancyLactationExtra", "Extra for Pregnancy / Lactation", "n"], ["bmrMifflin", "BMR (Mifflin-St Jeor, for comparison)", "n"], ["proteinRdaGrams", "Protein RDA (g/day)", "n"], ["caloriesPerKg", "Calories per kg Body Weight", "n"]],
    fn: E.eer, ex: { ...exBody, activity: 1, lifeStage: 0 },
    exText: (o) => `Example: a 35-year-old, 5 ft 6 in, 160 lb woman who is low active has an EER of about ${fmt(o.eer, 0)} calories a day.`,
    how: "Choose the activity level that matches your typical day: sedentary is daily-living only; low active adds about 30–60 minutes of moderate activity; active about 1–2 hours; very active more than that.",
    assume: "IOM Dietary Reference Intakes (2005). Adults: men 662 − 9.53 × age + PA × (15.91 × kg + 539.6 × m); women 354 − 6.91 × age + PA × (9.36 × kg + 726 × m). Children 3–8 and 9–18 use the IOM child equations with +20 or +25 kcal for growth. Pregnancy adds 0 / 340 / 452 kcal by trimester; lactation 330 then 400. Protein RDA 0.8 g/kg (+25 g in later pregnancy and lactation). NASEM updated these equations in 2023; results are close for most adults.",
    faq: [["What is EER?", "Estimated Energy Requirement — the average calories needed to maintain weight for a healthy person of your age, sex, size and activity."], ["How many extra calories in pregnancy?", "About 340 a day in the second trimester and 450 in the third; none extra in the first."]],
  }),
  mk({
    slug: "emergency-food-supply-calculator", cat: DM, title: "Emergency Food Supply Calculator",
    desc: "Plan an emergency food and water supply for your household — total calories, gallons of water, and how much rice, beans, canned meals and peanut butter to store for 3 days to several months.",
    meta: "Emergency Food Supply Calculator — Food & Water to Store",
    inputs: [num("adults", "Adults", 2, 100, 1), num("kids", "Children", 2, 100, 1), num("days", "Days to Prepare For", 14, 365, 1, 1), num("adultCalories", "Calories per Adult per Day", 2000, 5000, 50, 1000), num("waterPerDay", "Water per Person per Day (gallons)", 1, 5, 0.25, 0.5)],
    results: [["totalCalories", "Total Calories to Store", "n"], ["waterGallons", "Water (gallons)", "n"], ["riceLb", "Rice (lb) — 30% of calories", "n"], ["beansLb", "Dried Beans (lb) — 20%", "n"], ["cannedMeals", "Canned Meals / Soups (≈ 400 kcal) — 35%", "n"], ["peanutButterJars", "Peanut Butter (16 oz jars) — 15%", "n"], ["caloriesPerPersonPerDay", "Calories per Person per Day", "n"]],
    fn: E.emergencyFood, ex: { adults: 2, kids: 2, days: 14, adultCalories: 2000, waterPerDay: 1 },
    exText: (o) => `Example: a family of four preparing for two weeks needs about ${fmt(o.totalCalories, 0)} calories and ${o.waterGallons} gallons of water — for example ${o.riceLb} lb of rice, ${o.beansLb} lb of beans, ${o.cannedMeals} canned meals and ${o.peanutButterJars} jars of peanut butter.`,
    how: "Ready.gov advises at least 3 days of food and water, and 2 weeks if you can. Store foods your family already eats, rotate them, and include a manual can opener, baby food, medications and pet food as needed.\n\nRice and dried beans need extra water and fuel to cook; add more canned and ready-to-eat food if you may lose power.",
    assume: "Children ≈ 1,400 kcal/day. 1 gallon of water per person per day for drinking and basic hygiene (more in hot weather, for nursing mothers and the sick). Dry rice ≈ 1,650 kcal/lb, dry beans ≈ 1,550 kcal/lb, peanut butter ≈ 2,660 kcal per 16 oz jar.",
    faq: [["How much emergency water do I need?", "At least 1 gallon per person per day — 14 gallons per person for two weeks."], ["How much food for a 3-day emergency kit?", "About 6,000 calories per adult of non-perishable, ready-to-eat food."]],
  }),
];

async function main() {
  const cats = new Map<string, string>();
  for (const slug of new Set(TOOLS.map((t) => t.cat))) {
    const cat = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!cat) throw new Error(`The "${slug}" category doesn't exist — run "npx tsx prisma/setup-food-drink-category.ts --apply" first.`);
    cats.set(slug, cat.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cats.get(def.cat)!,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      // Published straight away (user, 6 Nov 2026: no tool should stay Draft).
      await prisma.tool.create({
        data: { slug: def.slug, status: "published", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all published.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
