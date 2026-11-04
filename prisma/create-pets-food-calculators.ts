// One-time (but safe to re-run) batch setup script: creates 25 pet food, feeding, care-service and cost
// calculators (Pets & Animals Calculators > Pet Food, Care & Cost Calculators). Energy formulas and
// price tables live in src/lib/calc-engine-pets-food.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-pets-animals-category.ts --apply)
//   npx tsx prisma/create-pets-food-calculators.ts
// or
//   npm run db:create-pets-food-calculators

import * as E from "../src/lib/calc-engine-pets-food";

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function percentField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100, step: opts.step ?? 0.5 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const YESNO: [string, number][] = [["No", 0], ["Yes", 1]];
const yn = (key: string, label: string, def = 0) => dropdown(key, label, YESNO, def);
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const cur = (key: string, label: string, def: number, max = 10000000, step = 1) => currencyField(key, label, { default: def, max, step });
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][]; currency?: string }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt] = s.results[0];
  const c = s.currency ? { currency: s.currency } : {};
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? `${s.title} — Free Online Estimator`).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainFmt === "c" ? c : {}) },
    calcResults: s.results.map(([key, label, f], i) => ({ key, label, format: FMT[f], ...(f === "c" ? c : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: `${s.assume} ${NOTE}`,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}
const CAT = "pet-food-care-cost-calculators";
const NOTE = "Feeding amounts are starting points based on average energy needs — adjust by 10% up or down to keep your pet at an ideal body condition, and ask your veterinarian before big diet changes.";

const WUNIT = dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0);
const WT = (def: number) => num("weight", "Pet's Weight (ideal weight if over/underweight)", def, 2000, 0.1);
const DOGSTAGE = (def = 0) => dropdown("lifeStage", "Life Stage / Activity", opts(E.DOG_FACTORS.map(([n, f]) => `${n} (×${f})`)), def);
const CATSTAGE = (def = 0) => dropdown("lifeStage", "Life Stage / Activity", opts(E.CAT_FACTORS.map(([n, f]) => `${n} (×${f})`)), def);
const FEEDTYPE = (def = 0) => dropdown("feedingType", "Feeding Type", opts(["Dry food only", "Wet food only", "Mix of wet and dry"]), def);
const BAGUNIT = dropdown("bagUnit", "Bag Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0);
const ANALYSIS = (p: number, f: number, fi: number, m: number, ash: number) => [pct("protein", "Crude Protein (min %)", p, 100, 0.1), pct("fat", "Crude Fat (min %)", f, 100, 0.1), pct("fiber", "Crude Fiber (max %)", fi, 100, 0.1), pct("moisture", "Moisture (max %)", m, 99, 0.1), pct("ash", "Ash % (if not listed: ~8 dry, ~2.5 wet)", ash, 100, 0.1)];

const TOOLS: ToolDef[] = [
  mk({
    slug: "dog-food-calculator", title: "Dog Food Calculator (How Much to Feed Your Dog)",
    desc: "Work out how much to feed your dog per day — cups of dry food, cans of wet food or a mix — from weight, life stage and the calories on your food's label. Works for any brand, including fresh food like The Farmer's Dog and JustFoodForDogs.",
    meta: "Dog Food Calculator — How Much to Feed a Dog (Cups, Cans, Grams)",
    inputs: [WUNIT, WT(40), DOGSTAGE(0), FEEDTYPE(0), pct("wetPercent", "Share of Calories From Wet Food (mix only)", 50, 100, 1), num("kcalPerCup", "Dry Food Calories per Cup (kcal/cup on label)", 380, 2000, 1), num("kcalPerCan", "Wet / Fresh Food Calories per Can or Pack", 400, 3000, 1), num("gramsPerCup", "Grams per Cup of Dry Food", 100, 500, 1), num("meals", "Meals per Day", 2, 6, 1, 1)],
    results: [["dailyCalories", "Daily Calories (kcal)", "n"], ["cupsDryPerDay", "Cups of Dry Food per Day", "n"], ["cansWetPerDay", "Cans / Packs of Wet Food per Day", "n"], ["cupsPerMeal", "Cups of Dry Food per Meal", "n"], ["gramsDryPerDay", "Grams of Dry Food per Day", "n"], ["dryCalories", "Calories From Dry", "n"], ["wetCalories", "Calories From Wet", "n"]],
    fn: E.dogFood, ex: { weightUnit: 0, weight: 40, lifeStage: 0, feedingType: 0, wetPercent: 50, kcalPerCup: 380, kcalPerCan: 400, gramsPerCup: 100, meals: 2 },
    exText: (o) => `Example: a 40 lb neutered adult dog needs about ${fmt(o.dailyCalories, 0)} kcal a day — ${o.cupsDryPerDay} cups of a 380 kcal/cup kibble, or ${o.cupsPerMeal} cups per meal.`,
    how: "Enter your dog's ideal weight and activity, then the calories per cup or can from the bag. For diabetic or prescription diets, use the calorie figure your vet gives you and keep meals consistent.",
    assume: "Resting energy (RER) = 70 × body weight in kg^0.75. Daily need = RER × life-stage factor (WSAVA/NRC): neutered 1.6, intact 1.8, inactive 1.2, weight loss 1.0, puppy 3.0 then 2.0, working 2–5. Feeding-chart amounts on bags are often 10–20% high.",
    faq: [["How many cups of food should my dog eat?", "Divide daily calories by the kcal per cup on your bag — a 40 lb adult usually needs 2.5–3 cups of average kibble."], ["How do I mix wet and dry food?", "Choose the mix option and the share of calories from wet; the calculator splits the calories so the total stays the same."]],
  }),
  mk({
    slug: "dog-calorie-calculator", title: "Dog Calorie Calculator (RER & Daily Calories)",
    desc: "Calculate how many calories your dog needs per day — resting energy requirement (RER) and maintenance energy (MER) for puppies, adults, seniors, working dogs and weight loss.",
    meta: "Dog Calorie Calculator — RER & Daily Calories for Dogs and Puppies",
    inputs: [WUNIT, WT(50), DOGSTAGE(0), num("meals", "Meals per Day", 2, 6, 1, 1)],
    results: [["dailyCalories", "Daily Calories (MER, kcal)", "n"], ["restingEnergyRer", "Resting Energy (RER, kcal)", "n"], ["lifeStageFactor", "Life-Stage Factor", "n"], ["caloriesPerMeal", "Calories per Meal", "n"], ["treatAllowance", "Treat Allowance (10%)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.dogCalorie, ex: { weightUnit: 0, weight: 50, lifeStage: 0, meals: 2 },
    exText: (o) => `Example: a 50 lb neutered adult has an RER of ${o.restingEnergyRer} kcal and needs about ${fmt(o.dailyCalories, 0)} kcal a day.`,
    how: "Enter weight and life stage. For weight loss, enter the target (ideal) weight, not the current weight.",
    assume: "RER = 70 × kg^0.75. MER factors from WSAVA/NRC 2006 — the same method used by Hill's, Purina and vet nutrition calculators. Individual dogs vary by ±20%.",
    faq: [["What is RER?", "Resting energy requirement — calories needed at rest in a comfortable environment: 70 × (kg)^0.75."], ["How many calories does a senior dog need?", "Usually about 1.4 × RER, but active seniors may need more and inactive ones less."]],
  }),
  mk({
    slug: "cat-calorie-calculator", title: "Cat Calorie Calculator (RER & Daily Calories)",
    desc: "Find how many calories your cat needs a day — RER and MER for kittens, neutered and intact adults, indoor cats, seniors and weight loss.",
    meta: "Cat Calorie Calculator — RER & Daily Calories for Cats and Kittens",
    inputs: [WUNIT, WT(10), CATSTAGE(0), num("meals", "Meals per Day", 2, 6, 1, 1)],
    results: [["dailyCalories", "Daily Calories (MER, kcal)", "n"], ["restingEnergyRer", "Resting Energy (RER, kcal)", "n"], ["lifeStageFactor", "Life-Stage Factor", "n"], ["caloriesPerMeal", "Calories per Meal", "n"], ["treatAllowance", "Treat Allowance (10%)", "n"], ["weightKg", "Weight (kg)", "n"]],
    fn: E.catCalorie, ex: { weightUnit: 0, weight: 10, lifeStage: 0, meals: 2 },
    exText: (o) => `Example: a 10 lb neutered indoor cat needs about ${o.dailyCalories} kcal a day (RER ${o.restingEnergyRer}).`,
    how: "Enter your cat's ideal weight and life stage. Indoor, less active cats often do best with the 'inactive' factor.",
    assume: "RER = 70 × kg^0.75. Feline MER factors (WSAVA/NRC): neutered 1.2, intact 1.4, inactive 1.0, weight loss 0.8, kitten 2.5, nursing up to 3.0.",
    faq: [["How many calories should an indoor cat eat?", "Most 10 lb indoor cats need about 200–250 kcal a day."], ["How fast should a cat lose weight?", "About 1–2% of body weight per week — faster loss risks fatty liver disease."]],
  }),
  mk({
    slug: "cat-food-calculator", title: "Cat Food Calculator (How Much to Feed a Cat)",
    desc: "Work out how much wet and dry food to feed your cat each day — cans, cups and grams from weight, life stage and the calories on your food (Royal Canin, Purina, Hill's or any brand).",
    meta: "Cat Food Calculator — How Much Wet & Dry Food to Feed a Cat",
    inputs: [WUNIT, WT(10), CATSTAGE(0), FEEDTYPE(2), pct("wetPercent", "Share of Calories From Wet Food (mix only)", 50, 100, 1), num("kcalPerCup", "Dry Food Calories per Cup", 400, 2000, 1), num("kcalPerCan", "Wet Food Calories per Can / Pouch", 90, 1000, 1), num("gramsPerCup", "Grams per Cup of Dry Food", 100, 500, 1), num("meals", "Meals per Day", 2, 6, 1, 1)],
    results: [["dailyCalories", "Daily Calories (kcal)", "n"], ["cupsDryPerDay", "Cups of Dry Food per Day", "n"], ["cansWetPerDay", "Cans / Pouches of Wet Food per Day", "n"], ["cupsPerMeal", "Cups of Dry per Meal", "n"], ["gramsDryPerDay", "Grams of Dry Food per Day", "n"], ["dryCalories", "Calories From Dry", "n"], ["wetCalories", "Calories From Wet", "n"]],
    fn: E.catFood, ex: { weightUnit: 0, weight: 10, lifeStage: 0, feedingType: 2, wetPercent: 50, kcalPerCup: 400, kcalPerCan: 90, gramsPerCup: 100, meals: 2 },
    exText: (o) => `Example: a 10 lb neutered cat on a half-and-half diet gets ${o.cansWetPerDay} pouches (90 kcal) plus ${o.cupsDryPerDay} cups of dry food a day.`,
    how: "Enter your cat's weight and stage, choose dry, wet or a mix, and copy the kcal per cup and per can from the labels.",
    assume: "Daily calories = 70 × kg^0.75 × feline life-stage factor. Wet food is mostly water, so the volume is much larger for the same calories.",
    faq: [["How many cans of wet food should a cat eat a day?", "A 10 lb cat eating only wet food usually needs about two and a half 3 oz cans (or about 2–3 pouches) a day."]],
  }),
  mk({
    slug: "raw-dog-food-calculator", title: "Raw Dog Food Calculator (BARF & Prey Model)",
    desc: "Calculate how much raw food to feed your dog or puppy per day — grams and pounds by % of body weight, with the 80/10/5/5 meat, bone, liver and organ split and monthly cost.",
    meta: "Raw Dog Food Calculator — How Much Raw to Feed a Dog or Puppy",
    inputs: [WUNIT, WT(50), dropdown("stage", "Dog", opts(["Adult", "Puppy"]), 0), pct("percentBodyWeight", "Adult Feeding % of Ideal Body Weight (2–3%)", 2.5, 10, 0.1), num("ageMonths", "Puppy Age (months)", 4, 24, 1), cur("pricePerLb", "Raw Food Price per lb", 4, 100, 0.01)],
    results: [["gramsPerDay", "Raw Food per Day (g)", "n"], ["poundsPerDay", "Raw Food per Day (lb)", "n"], ["meatGrams", "Muscle Meat (80%) g", "n"], ["boneGrams", "Raw Bone (10%) g", "n"], ["liverGrams", "Liver (5%) g", "n"], ["otherOrganGrams", "Other Secreting Organ (5%) g", "n"], ["poundsPerWeek", "Pounds per Week", "n"], ["monthlyCost", "Monthly Cost", "c"], ["percentBodyWeightUsed", "% of Body Weight Fed", "p"]],
    fn: E.rawDog, ex: { weightUnit: 0, weight: 50, stage: 0, percentBodyWeight: 2.5, ageMonths: 4, pricePerLb: 4 },
    exText: (o) => `Example: a 50 lb adult at 2.5% eats ${o.poundsPerDay} lb (${fmt(o.gramsPerDay, 0)} g) of raw a day — about ${usd(o.monthlyCost)} a month at $4/lb.`,
    how: "Choose adult or puppy. Active dogs use 3%, couch potatoes or weight loss 2%. For commercial complete raw (Primal, Stella & Chewy, Northwest Naturals) use the % only and skip the ratio split.",
    assume: "Adult dogs: 2–3% of ideal weight daily. Puppies (of current weight): ≤3 months 10%, 4 months 8%, 5–6 months 6%, 7–9 months 4.5%, 10–12 months 3%. Prey-model split: 80% meat, 10% bone, 5% liver, 5% other organ.",
    faq: [["How much raw food should a puppy eat?", "Puppies eat a larger % of their weight — about 8–10% at 2–4 months, falling to 3% by a year — or about 2–3% of expected adult weight."], ["Is 80/10/10 complete?", "It's a widely used starting point, but homemade raw diets can lack vitamin E, D, zinc and omega-3s — consider a vet nutritionist review."]],
  }),
  mk({
    slug: "puppy-food-calculator", title: "Puppy Food Calculator (How Much to Feed a Puppy)",
    desc: "Find how much to feed your puppy by age and weight — daily calories, cups per day, meals per day and cups per meal — for any brand such as Blue Buffalo, Purina Pro Plan or Pedigree puppy food.",
    meta: "Puppy Food Calculator — Puppy Feeding Chart by Age & Weight",
    inputs: [WUNIT, num("weight", "Puppy's Current Weight", 15, 300, 0.1), num("ageMonths", "Age (months)", 4, 24, 0.5), num("kcalPerCup", "Food Calories per Cup", 400, 2000, 1), num("gramsPerCup", "Grams per Cup", 100, 500, 1)],
    results: [["dailyCalories", "Daily Calories (kcal)", "n"], ["cupsPerDay", "Cups per Day", "n"], ["mealsPerDay", "Meals per Day", "n"], ["cupsPerMeal", "Cups per Meal", "n"], ["gramsPerDay", "Grams per Day", "n"], ["growthFactor", "Growth Factor (× RER)", "n"]],
    fn: E.puppyFood, ex: { weightUnit: 0, weight: 15, ageMonths: 4, kcalPerCup: 400, gramsPerCup: 100 },
    exText: (o) => `Example: a 15 lb, 4-month-old puppy needs about ${fmt(o.dailyCalories, 0)} kcal — ${o.cupsPerDay} cups a day split into ${o.mealsPerDay} meals.`,
    how: "Enter current weight and age, plus the calories per cup from your puppy food bag. Re-check every 2 weeks as your puppy grows.",
    assume: "RER = 70 × kg^0.75; under 4 months × 3.0, 4–12 months × 2.0, adult × 1.6 (large breeds may stay on puppy food to 12–18 months). Meals: 4 a day under 3 months, 3 until 6 months, then 2.",
    faq: [["How many times a day should a puppy eat?", "Four meals until about 3 months, three until 6 months, then two."], ["When should I switch to adult food?", "Small breeds around 9–12 months; large and giant breeds 12–18 months."]],
  }),
  mk({
    slug: "homemade-dog-food-calculator", title: "Homemade Dog Food Calculator (Recipe Portions)",
    desc: "Turn your dog's daily calories into homemade food portions — grams of cooked protein, carbs, vegetables and oil — with a lower-carb option. A starting point to discuss with your vet or a tool like Balance IT.",
    meta: "Homemade Dog Food Calculator — Portions of Meat, Rice, Veg & Oil",
    inputs: [WUNIT, WT(40), DOGSTAGE(0), yn("lowCarb", "Lower-Carb Recipe (e.g. diabetic, weight control)", 0)],
    results: [["dailyCalories", "Daily Calories (kcal)", "n"], ["proteinGrams", "Cooked Lean Protein (g)", "n"], ["carbGrams", "Cooked Carbohydrate (g)", "n"], ["vegetableGrams", "Cooked Vegetables (g)", "n"], ["oilGrams", "Oil (g)", "n"], ["oilTeaspoons", "Oil (teaspoons)", "n"], ["totalGramsPerDay", "Total Food per Day (g)", "n"]],
    fn: E.homemade, ex: { weightUnit: 0, weight: 40, lifeStage: 0, lowCarb: 0 },
    exText: (o) => `Example: a 40 lb adult needs ${fmt(o.dailyCalories, 0)} kcal — about ${o.proteinGrams} g cooked chicken, ${o.carbGrams} g cooked rice, ${o.vegetableGrams} g veg and ${o.oilTeaspoons} tsp oil a day.`,
    how: "Enter weight and life stage. Split the totals across meals. Always add a vet-recommended vitamin-mineral supplement and calcium — meat, rice and veg alone are not complete.",
    assume: "Calories split 48% protein / 30% carbohydrate / 7% vegetables / 15% oil (lower-carb: 55/15/15/15). Energy densities: cooked lean meat 1.65 kcal/g, cooked rice 1.15, cooked veg 0.35, oil 8.84.",
    faq: [["Is homemade dog food healthy?", "It can be, but most online recipes are deficient in calcium and micronutrients — have it balanced by a board-certified vet nutritionist or software such as Balance IT."]],
  }),
  mk({
    slug: "dry-matter-calculator", title: "Pet Food Dry Matter Calculator (Protein, Fat & Carbs)",
    desc: "Convert the guaranteed analysis on dog or cat food to a dry matter basis so you can compare wet and dry foods — protein, fat, fiber and carbohydrate (NFE) %, plus the share of calories from each.",
    meta: "Dry Matter Calculator — Dog & Cat Food Protein, Fat & Carb Content",
    inputs: ANALYSIS(10, 5, 1, 78, 2.5),
    results: [["proteinDryMatter", "Protein — Dry Matter", "p"], ["fatDryMatter", "Fat — Dry Matter", "p"], ["carbsDryMatter", "Carbohydrate (NFE) — Dry Matter", "p"], ["fiberDryMatter", "Fiber — Dry Matter", "p"], ["carbsAsFed", "Carbohydrate — As Fed", "p"], ["proteinCaloriesPercent", "Calories From Protein", "p"], ["fatCaloriesPercent", "Calories From Fat", "p"], ["carbCaloriesPercent", "Calories From Carbs", "p"]],
    fn: E.dryMatter, ex: { protein: 10, fat: 5, fiber: 1, moisture: 78, ash: 2.5 },
    exText: (o) => `Example: a wet food with 10% protein and 78% moisture is ${o.proteinDryMatter}% protein on a dry matter basis — and ${o.carbsDryMatter}% carbs.`,
    how: "Copy the guaranteed analysis from the label. If ash isn't listed, leave the default (about 8% for kibble, 2.5% for wet).",
    assume: "Dry matter % = as-fed % ÷ (100 − moisture) × 100. Carbohydrate (NFE) = 100 − protein − fat − fiber − moisture − ash. Calories by modified Atwater factors: 3.5 kcal/g protein and carbs, 8.5 fat.",
    faq: [["Why convert to dry matter?", "Wet food is 75–80% water, so its label percentages look low. Dry matter puts wet and dry on the same footing."], ["What is a low-carb cat food?", "Usually under about 10–15% carbohydrate on a dry matter basis."]],
  }),
  mk({
    slug: "pet-food-calorie-content-calculator", title: "Pet Food Calorie Calculator (kcal per Cup & Can)",
    desc: "Estimate the calories in dog or cat food from the guaranteed analysis — kcal per kg, per cup, per can and per ounce — using the AAFCO modified Atwater method.",
    meta: "Pet Food Calorie Calculator — kcal/kg, per Cup & per Can From Label",
    inputs: [...ANALYSIS(26, 16, 4, 10, 7), num("gramsPerCup", "Grams per Cup (kibble ≈ 90–120 g)", 100, 500, 1), num("gramsPerCan", "Grams per Can / Pouch (wet only)", 0, 2000, 1)],
    results: [["kcalPerKg", "Calories per kg (kcal ME)", "n"], ["kcalPerCup", "Calories per Cup", "n"], ["kcalPerCan", "Calories per Can / Pouch", "n"], ["kcalPerGram", "Calories per Gram", "n"], ["kcalPerOunce", "Calories per Ounce", "n"], ["carbsAsFedPercent", "Carbohydrate (as fed)", "p"]],
    fn: E.foodCalories, ex: { protein: 26, fat: 16, fiber: 4, moisture: 10, ash: 7, gramsPerCup: 100, gramsPerCan: 0 },
    exText: (o) => `Example: a 26/16 kibble has about ${fmt(o.kcalPerKg, 0)} kcal/kg, or ${o.kcalPerCup} kcal per 100 g cup.`,
    how: "Enter the label's guaranteed analysis and how much a cup (or can) weighs. If the label already lists kcal/kg ME, that figure is more accurate.",
    assume: "AAFCO modified Atwater: ME (kcal/kg) = 10 × (3.5 × protein% + 8.5 × fat% + 3.5 × NFE%). Guaranteed analysis uses minimums and maximums, so the true value can differ by about 10%.",
    faq: [["How many calories are in a cup of dog food?", "Most kibbles have 300–500 kcal per cup; check the label's 'calorie content' statement."]],
  }),
  mk({
    slug: "pet-water-intake-calculator", title: "Dog & Cat Water Intake Calculator",
    desc: "How much water should your dog or cat drink a day? Get total daily water needs, how much to drink after moisture from food, in mL, cups and ounces, and the level that may signal excessive thirst.",
    meta: "Dog Water Intake Calculator — How Much Water Should a Dog or Cat Drink",
    inputs: [dropdown("species", "Pet", opts(["Dog", "Cat"]), 0), WUNIT, WT(40), dropdown("diet", "Diet", opts(["Dry food only", "Mix of wet and dry", "Wet or raw food only"]), 0), yn("hotOrActive", "Hot Weather or Very Active", 0), yn("nursing", "Nursing Mother", 0)],
    results: [["totalWaterMlPerDay", "Total Water Need (mL/day)", "n"], ["toDrinkMlPerDay", "Water to Drink (mL/day)", "n"], ["toDrinkCups", "Water to Drink (cups)", "n"], ["toDrinkOunces", "Water to Drink (fl oz)", "n"], ["fromFoodMl", "Water From Food (mL)", "n"], ["excessiveAboveMl", "Possible Excessive Thirst Above (mL/day)", "n"]],
    fn: E.waterIntake, ex: { species: 0, weightUnit: 0, weight: 40, diet: 0, hotOrActive: 0, nursing: 0 },
    exText: (o) => `Example: a 40 lb dog on kibble should drink about ${fmt(o.toDrinkMlPerDay, 0)} mL (${o.toDrinkCups} cups) a day.`,
    how: "Pick dog or cat, weight and diet. Wet and raw diets supply much of the water, so cats on wet food may drink very little.",
    assume: "Maintenance water ≈ 50 mL/kg/day for dogs and 45 mL/kg/day for cats (about 1 fl oz per lb for dogs). Food moisture: kibble ~0%, mixed ~30%, wet/raw ~65% of need. Drinking over 100 mL/kg/day is a common vet threshold for excessive thirst.",
    faq: [["How much water should a dog drink?", "About 1 ounce per pound of body weight per day — more in heat or after exercise."], ["Is my pet drinking too much?", "Over about 100 mL per kg a day can point to diabetes, kidney or hormone problems — see your vet."]],
  }),
  mk({
    slug: "kitten-feeding-chart-calculator", title: "Kitten Feeding Calculator (Feeding Chart by Age)",
    desc: "How much and how often to feed a kitten by age in weeks — milk replacer for newborns, then calories, feedings per day and cans or cups of kitten food up to a year.",
    meta: "Kitten Feeding Chart Calculator — How Much to Feed a Kitten by Age",
    inputs: [num("ageWeeks", "Kitten Age (weeks)", 10, 52, 1), WUNIT, num("weight", "Kitten Weight", 3, 30, 0.01), pct("wetPercent", "Share of Calories From Wet (8+ weeks)", 50, 100, 1), num("kcalPerCan", "Kitten Wet Food kcal per Can / Pouch", 90, 1000, 1), num("kcalPerCup", "Kitten Dry Food kcal per Cup", 450, 2000, 1)],
    results: [["stage", "Stage (1 bottle · 2 weaning · 3 growing · 4 adolescent)", "n"], ["dailyCalories", "Daily Calories (kcal)", "n"], ["feedingsPerDay", "Feedings per Day", "n"], ["milkReplacerMlPerDay", "Milk Replacer per Day (mL)", "n"], ["mlPerFeeding", "Milk Replacer per Feeding (mL)", "n"], ["wetCansPerDay", "Wet Food Cans / Pouches per Day", "n"], ["dryCupsPerDay", "Dry Food Cups per Day", "n"]],
    fn: E.kittenFeeding, ex: { ageWeeks: 10, weightUnit: 0, weight: 3, wetPercent: 50, kcalPerCan: 90, kcalPerCup: 450 },
    exText: (o) => `Example: a 10-week, 3 lb kitten needs about ${o.dailyCalories} kcal over ${o.feedingsPerDay} meals — ${o.wetCansPerDay} pouches plus ${o.dryCupsPerDay} cups of dry.`,
    how: "Enter age in weeks and weight. Under 4 weeks, the tool gives kitten milk replacer amounts (never cow's milk). Weigh young kittens daily — they should gain about 10–15 g a day.",
    assume: "Bottle babies: about 8 mL of replacer per oz of body weight per day, every 2–3 hours (≈0.9 kcal/mL). From 4 weeks: RER × 3 to 4 months, × 2.5 to 6 months, × 2 to a year. Feedings: 5 a day to 8 weeks, 4 to 12 weeks, 3 to 6 months, then 2.",
    faq: [["How much should a kitten eat?", "Kittens eat about two to three times as many calories per pound as adults; free feeding dry food plus wet meals is common."]],
  }),
  mk({
    slug: "raw-cat-food-calculator", title: "Raw Cat Food Calculator",
    desc: "Calculate how much raw food to feed a cat or kitten per day by % of body weight — grams, ounces, the 80/10/5/5 meat, bone and organ split and monthly cost.",
    meta: "Raw Cat Food Calculator — How Much Raw to Feed a Cat or Kitten",
    inputs: [WUNIT, WT(10), dropdown("stage", "Cat", opts(["Adult", "Kitten"]), 0), pct("percentBodyWeight", "Adult Feeding % of Ideal Body Weight (2–4%)", 3, 10, 0.1), num("ageMonths", "Kitten Age (months)", 4, 12, 1), cur("pricePerLb", "Raw Food Price per lb", 5, 100, 0.01)],
    results: [["gramsPerDay", "Raw Food per Day (g)", "n"], ["ouncesPerDay", "Raw Food per Day (oz)", "n"], ["meatGrams", "Muscle Meat (80%) g", "n"], ["boneGrams", "Raw Bone (10%) g", "n"], ["liverGrams", "Liver (5%) g", "n"], ["otherOrganGrams", "Other Organ (5%) g", "n"], ["monthlyCost", "Monthly Cost", "c"], ["percentBodyWeightUsed", "% of Body Weight Fed", "p"]],
    fn: E.rawCat, ex: { weightUnit: 0, weight: 10, stage: 0, percentBodyWeight: 3, ageMonths: 4, pricePerLb: 5 },
    exText: (o) => `Example: a 10 lb cat at 3% eats ${o.ouncesPerDay} oz (${o.gramsPerDay} g) of raw a day.`,
    how: "Choose adult or kitten. Cats must have taurine — heart and dark meat supply it; homemade raw diets need careful balancing.",
    assume: "Adult cats 2–4% of ideal weight a day (3% typical); kittens 6% under 6 months, then about 4.5%. Prey-model split 80/10/5/5.",
    faq: [["How much raw food does a cat eat?", "About 3% of body weight — roughly 4–5 oz a day for a 10 lb cat."]],
  }),
  mk({
    slug: "how-long-will-dog-food-last-calculator", title: "How Long Will a Bag of Dog Food Last Calculator",
    desc: "Find how many days or weeks a bag of dog food will last, how many cups are in the bag, and your cost per day, per month and bags per year.",
    meta: "How Long Will Dog Food Last Calculator — Days per Bag & Cost per Day",
    inputs: [BAGUNIT, num("bagWeight", "Bag Weight", 30, 1000, 0.1), num("cupsPerLb", "Cups per lb (kibble ≈ 4)", 4, 10, 0.1), num("cupsPerDayPerDog", "Cups Fed per Day per Dog", 3, 30, 0.25), num("dogs", "Number of Dogs", 1, 20, 1, 1), cur("bagPrice", "Bag Price", 60, 10000, 0.01)],
    results: [["daysBagLasts", "Days the Bag Lasts", "n"], ["weeksBagLasts", "Weeks the Bag Lasts", "n"], ["cupsInBag", "Cups in the Bag", "n"], ["costPerDay", "Cost per Day", "c"], ["costPerMonth", "Cost per Month", "c"], ["bagsPerYear", "Bags per Year", "n"]],
    fn: E.foodLast, ex: { bagUnit: 0, bagWeight: 30, cupsPerLb: 4, cupsPerDayPerDog: 3, dogs: 1, bagPrice: 60 },
    exText: (o) => `Example: a 30 lb bag (≈${fmt(o.cupsInBag, 0)} cups) at 3 cups a day lasts ${o.daysBagLasts} days — ${usd(o.costPerDay)} a day.`,
    how: "Enter bag size, how much you feed and the price. Dense or small kibble can be 3.5–5 cups per lb — weigh one cup to be exact.",
    assume: "A pound of typical kibble is about 4 cups (≈113 g per cup); 1 kg ≈ 8.8 cups. Months use 30.4 days.",
    faq: [["How many cups are in a 30 lb bag of dog food?", "About 120 cups for average kibble."]],
  }),
  mk({
    slug: "dog-food-transition-calculator", title: "Dog Food Transition Calculator (Switching Foods Schedule)",
    desc: "Plan a gradual switch to a new dog or cat food — exact amounts of old and new food for each phase of a 7, 10 or 14-day transition.",
    meta: "Dog Food Transition Calculator — Old vs New Food Schedule",
    inputs: [num("dailyAmount", "Total Daily Amount (cups, grams or cans)", 3, 10000, 0.1), dropdown("length", "Transition Length", opts(["7 days (standard)", "10 days", "14 days (sensitive stomach)"]), 0)],
    results: [["phase1OldAmount", "Phase 1 — Old Food (75%)", "n"], ["phase1NewAmount", "Phase 1 — New Food (25%)", "n"], ["phase2OldAmount", "Phase 2 — Old Food (50%)", "n"], ["phase2NewAmount", "Phase 2 — New Food (50%)", "n"], ["phase3OldAmount", "Phase 3 — Old Food (25%)", "n"], ["phase3NewAmount", "Phase 3 — New Food (75%)", "n"], ["daysPerPhase", "Days per Phase", "n"], ["fullNewFoodFromDay", "100% New Food From Day", "n"], ["totalDays", "Total Transition Days", "n"]],
    fn: E.transition, ex: { dailyAmount: 3, length: 0 },
    exText: (o) => `Example: for 3 cups a day over 7 days, feed ${o.phase1OldAmount} old + ${o.phase1NewAmount} new for ${o.daysPerPhase} days, then 50/50, then 25/75, and all new from day ${o.fullNewFoodFromDay}.`,
    how: "Enter the total amount your pet eats a day (in any unit) and the transition length. If the new food has very different calories per cup, recalculate the daily amount first.",
    assume: "Standard 25% steps: 75/25, 50/50, 25/75, then 100% new. Phases are split evenly across the chosen number of days (rounded).",
    faq: [["What if my dog gets diarrhea when switching food?", "Go back a step and slow down — use the 14-day schedule. See a vet if it lasts more than a day or two."]],
  }),
  mk({
    slug: "dog-food-comparison-calculator", title: "Dog Food Cost Comparison Calculator",
    desc: "Compare two dog foods by what they really cost to feed — cost per 1,000 calories, cost per day and the yearly difference, based on your dog's calorie needs.",
    meta: "Dog Food Comparison Calculator — Cost per Day & per 1,000 Calories",
    inputs: [WUNIT, WT(50), DOGSTAGE(0), BAGUNIT, cur("priceA", "Food A — Bag Price", 70, 10000, 0.01), num("bagA", "Food A — Bag Weight", 30, 1000, 0.1), num("kcalPerKgA", "Food A — kcal per kg", 3600, 10000, 1), cur("priceB", "Food B — Bag Price", 85, 10000, 0.01), num("bagB", "Food B — Bag Weight", 24, 1000, 0.1), num("kcalPerKgB", "Food B — kcal per kg", 4100, 10000, 1)],
    results: [["costPerDayA", "Food A — Cost per Day", "c"], ["costPerDayB", "Food B — Cost per Day", "c"], ["costPer1000KcalA", "Food A — Cost per 1,000 kcal", "c"], ["costPer1000KcalB", "Food B — Cost per 1,000 kcal", "c"], ["annualDifference", "Yearly Cost Difference", "c"], ["cheaperFood", "Cheaper to Feed (1 = A · 2 = B · 0 = same)", "n"], ["dailyCalories", "Dog's Daily Calories", "n"]],
    fn: E.foodComparison, ex: { weightUnit: 0, weight: 50, lifeStage: 0, bagUnit: 0, priceA: 70, bagA: 30, kcalPerKgA: 3600, priceB: 85, bagB: 24, kcalPerKgB: 4100 },
    exText: (o) => `Example: for a 50 lb dog, Food A costs ${usd(o.costPerDayA)} a day and Food B ${usd(o.costPerDayB)} — a ${usd(o.annualDifference)} yearly difference.`,
    how: "Enter both bags' price, weight and kcal/kg (from the calorie statement on the label). Price per pound misleads — a denser food needs less per day.",
    assume: "Cost per day = (price ÷ total bag calories) × dog's daily calories (70 × kg^0.75 × life-stage factor).",
    faq: [["Is cheaper dog food really cheaper?", "Not always — lower-calorie foods need bigger portions, so compare cost per 1,000 kcal."]],
  }),
  mk({
    slug: "dog-treats-per-day-calculator", title: "Dog Treats per Day Calculator (10% Rule)",
    desc: "How many treats can your dog have a day? Uses the 10% rule and your dog's calorie needs to give a treat calorie budget and number of treats.",
    meta: "Dog Treats per Day Calculator — 10% Treat Rule",
    inputs: [WUNIT, WT(30), DOGSTAGE(0), num("kcalPerTreat", "Calories per Treat", 30, 1000, 0.5), pct("treatPercent", "Treat Share of Daily Calories", 10, 30, 1)],
    results: [["treatsPerDay", "Treats per Day", "n"], ["treatCalorieAllowance", "Treat Calorie Allowance", "n"], ["dailyCalories", "Total Daily Calories", "n"], ["mealCaloriesAfterTreats", "Meal Calories After Treats", "n"]],
    fn: E.treats, ex: { weightUnit: 0, weight: 30, lifeStage: 0, kcalPerTreat: 30, treatPercent: 10 },
    exText: (o) => `Example: a 30 lb adult dog can have about ${o.treatsPerDay} 30-kcal treats a day (${o.treatCalorieAllowance} kcal).`,
    how: "Enter your dog's weight and the calories per treat (on the package). Training treats can be broken into small pieces.",
    assume: "Vets recommend treats make up no more than 10% of daily calories; the rest should come from complete and balanced food.",
    faq: [["How many treats is too many?", "More than 10% of daily calories can unbalance the diet and add weight."]],
  }),
  mk({
    slug: "mini-pig-calorie-calculator", title: "Mini Pig Calorie & Feed Calculator",
    desc: "Calculate how much to feed a pet mini pig (pot-bellied, Juliana, KuneKune) — daily calories, pounds and cups of mini-pig pellets and vegetables.",
    meta: "Mini Pig Calorie Calculator — How Much to Feed a Pet Pig",
    inputs: [WUNIT, WT(100), dropdown("stage", "Pig", opts(E.PIG_FACTORS.map(([n]) => n)), 0), num("pelletKcalPerLb", "Pellet Calories per lb", 1300, 3000, 1)],
    results: [["dailyCalories", "Daily Calories (kcal)", "n"], ["pelletPoundsPerDay", "Pellets per Day (lb)", "n"], ["pelletCupsPerDay", "Pellets per Day (cups)", "n"], ["vegetableCupsPerDay", "Vegetables per Day (cups)", "n"], ["percentBodyWeightFood", "Pellets as % of Body Weight", "p"]],
    fn: E.pigCalorie, ex: { weightUnit: 0, weight: 100, stage: 0, pelletKcalPerLb: 1300 },
    exText: (o) => `Example: a 100 lb adult mini pig needs about ${fmt(o.dailyCalories, 0)} kcal — ${o.pelletCupsPerDay} cups of pellets plus ${o.vegetableCupsPerDay} cups of veg a day.`,
    how: "Enter your pig's weight and stage. Mini pigs gain weight easily — check body condition and adjust.",
    assume: "Maintenance energy ≈ 106 × kg^0.75 kcal ME (NRC swine). About 75% of calories from mini-pig pellets (~1,300 kcal/lb, ~0.3 lb per cup), the rest from vegetables.",
    faq: [["How much should a mini pig eat?", "Roughly 1–2% of body weight in pellets a day for adults, split into two meals, plus vegetables."]],
  }),
  mk({
    slug: "pet-sitter-rates-calculator", title: "Pet Sitter Rates Calculator (Dog & Cat Sitting Cost)",
    desc: "Estimate the cost of a pet sitter or cat sitter — drop-in visits, overnights, boarding or house sitting — with extra pets, holiday surcharges, medication fees and a tip. Sitters can also use it to set prices.",
    meta: "Pet Sitter Rates Calculator — Pet & Cat Sitting Prices per Visit & Night",
    inputs: [dropdown("service", "Service", opts(E.SITTER.map(([n, p]) => `${n} (~$${p})`)), 1), num("units", "Number of Visits / Nights", 7, 365, 1), num("pets", "Number of Pets", 1, 20, 1, 1), cur("extraPetFee", "Extra Pet Fee (per pet per visit)", 8, 100, 0.5), num("holidayUnits", "Holiday Visits / Nights", 0, 365, 1), pct("holidaySurcharge", "Holiday Surcharge", 50, 200, 1), cur("medsFee", "Medication Fee (per visit)", 0, 100, 0.5), pct("marketAdjust", "Local Price Adjustment (±%)", 0, 200, 1), cur("rateOverride", "Use My Own Base Rate (0 = typical)", 0, 1000, 0.5)],
    results: [["totalCost", "Total Cost", "c"], ["pricePerVisitOrNight", "Price per Visit / Night", "c"], ["holidayCharges", "Holiday Surcharges", "c"], ["medicationFees", "Medication Fees", "c"], ["tipSuggestion", "Suggested Tip (15%)", "c"]],
    fn: E.petSitter, ex: { service: 1, units: 7, pets: 1, extraPetFee: 8, holidayUnits: 0, holidaySurcharge: 50, medsFee: 0, marketAdjust: 0, rateOverride: 0 },
    exText: (o) => `Example: 7 overnight stays for one dog cost about ${usd(o.totalCost)} at ${usd(o.pricePerVisitOrNight)} a night.`,
    how: "Choose the service and number of visits or nights, then add extra pets and holidays. Big cities often run 20–40% higher — use the local adjustment.",
    assume: "2026 US typical rates: drop-in $25, cat drop-in $22, overnight $90, boarding at the sitter's $55/night, live-in house sitting $75/day. Holiday surcharges commonly 25–50%.",
    faq: [["How much does a cat sitter cost?", "Typically $18–30 per 20–30 minute visit, once or twice a day."], ["How much should I charge for pet sitting overnight?", "Most sitters charge $75–125 per night in the US."]],
  }),
  mk({
    slug: "dog-walking-rate-calculator", title: "Dog Walking Rate Calculator",
    desc: "Estimate dog walking prices per walk, week, month and year by walk length and number of dogs — and what a walker actually earns per hour including travel time.",
    meta: "Dog Walking Rate Calculator — Price per Walk & Monthly Cost",
    inputs: [dropdown("duration", "Walk Length", opts(E.WALKS.map(([m, p]) => `${m} minutes (~$${p})`)), 1), num("walksPerWeek", "Walks per Week", 5, 21, 1), num("dogs", "Number of Dogs", 1, 6, 1, 1), cur("extraDogFee", "Extra Dog Fee (per walk)", 7, 100, 0.5), num("travelMinutes", "Walker Travel Time per Walk (min)", 15, 120, 1), pct("marketAdjust", "Local Price Adjustment (±%)", 0, 200, 1), cur("rateOverride", "Use My Own Rate (0 = typical)", 0, 500, 0.5)],
    results: [["pricePerWalk", "Price per Walk", "c"], ["weeklyCost", "Weekly Cost", "c"], ["monthlyCost", "Monthly Cost", "c"], ["annualCost", "Yearly Cost", "c"], ["walkerHourlyEarnings", "Walker Earnings per Hour", "c"]],
    fn: E.dogWalking, ex: { duration: 1, walksPerWeek: 5, dogs: 1, extraDogFee: 7, travelMinutes: 15, marketAdjust: 0, rateOverride: 0 },
    exText: (o) => `Example: five 30-minute walks a week cost about ${usd(o.weeklyCost)} a week, ${usd(o.monthlyCost)} a month.`,
    how: "Pick walk length and frequency. Walkers can enter their own rate and travel time to see real hourly earnings.",
    assume: "2026 US typical walk prices: 15 min $15, 30 min $22, 45 min $30, 60 min $38; extra dog $5–10. Month = 4.33 weeks.",
    faq: [["How much do dog walkers charge?", "About $20–25 for a 30-minute walk in most of the US, more in big cities."]],
  }),
  mk({
    slug: "pet-transport-cost-calculator", title: "Pet Transport Cost Calculator (Flying or Shipping a Pet)",
    desc: "Estimate the cost to transport a dog or cat — in-cabin, airline cargo, ground pet transport or international relocation — with crate dimensional weight, health certificate and paperwork.",
    meta: "Pet Transport Cost Calculator — Cost to Fly or Ship a Dog or Cat",
    inputs: [dropdown("mode", "Transport Method", opts(["In-cabin with you (small pets)", "Airline cargo / manifest (domestic)", "Ground pet transport service", "International pet relocation"]), 1), dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0), num("weight", "Pet's Weight", 50, 300, 0.1), num("crateL", "Crate Length (in)", 36, 72, 0.5), num("crateW", "Crate Width (in)", 25, 60, 0.5), num("crateH", "Crate Height (in)", 27, 60, 0.5), num("miles", "Distance (miles)", 1000, 15000, 1), yn("roundTrip", "Round Trip (air)", 0), cur("cabinFee", "Airline Cabin Pet Fee (one way)", 150, 1000, 1), cur("perMile", "Ground Transport Price per Mile", 1.1, 10, 0.01), cur("healthCertificate", "Vet Health Certificate", 150, 2000, 1), cur("importFees", "Import Permit / Quarantine Fees (international)", 300, 20000, 1), cur("crateCost", "Airline-Approved Crate Cost", 120, 2000, 1)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["carrierCharge", "Airline / Transport Charge", "c"], ["vetAndPaperwork", "Vet & Paperwork", "c"], ["billableWeightLb", "Billable Weight (lb)", "n"], ["crateCost", "Crate", "c"]],
    fn: E.transport, ex: { mode: 1, weightUnit: 0, weight: 50, crateL: 36, crateW: 25, crateH: 27, miles: 1000, roundTrip: 0, cabinFee: 150, perMile: 1.1, healthCertificate: 150, importFees: 300, crateCost: 120 },
    exText: (o) => `Example: shipping a 50 lb dog 1,000 miles by air cargo costs about ${usd(o.totalCost)} (billable weight ${o.billableWeightLb} lb).`,
    how: "Choose the method, enter your pet's weight and crate size. Airlines bill the greater of actual weight (pet + crate) or dimensional weight.",
    assume: "Dimensional weight = L × W × H ÷ 166 (in). Cargo estimate $200 + $3/billable lb, rising with distance, minimum $350. Ground transport ≈ $1.10/mile, minimum $300. International: from $1,500 plus USDA endorsement (~$173) and import fees. Get real quotes before booking.",
    faq: [["How much does it cost to fly a dog?", "In-cabin $95–200 each way; cargo usually $500–1,500 domestically; international relocation $1,500–6,000+."]],
  }),
  mk({
    slug: "invisible-fence-cost-calculator", title: "Invisible Dog Fence Cost Calculator",
    desc: "Compare the cost of an invisible (underground) dog fence — DIY wired, professionally installed, or GPS wireless collar — by yard perimeter and number of dogs.",
    meta: "Invisible Fence Cost Calculator — DIY vs Installed vs GPS Dog Fence",
    inputs: [num("perimeterFt", "Boundary Length (feet)", 1000, 50000, 1), num("dogs", "Number of Dogs", 1, 10, 1, 1), cur("gpsCollarPrice", "GPS Collar Price (per dog)", 500, 3000, 1), cur("gpsMonthlyFee", "GPS Subscription per Month", 10, 100, 0.5)],
    results: [["diyWiredCost", "DIY Wired Kit + Extra Wire", "c"], ["proInstalledCost", "Professionally Installed", "c"], ["gpsCollarFirstYear", "GPS Wireless Collar — First Year", "c"], ["acres", "Approx. Area if Square (acres)", "n"], ["cheapestOption", "Cheapest (1 DIY · 2 installed · 3 GPS)", "n"]],
    fn: E.invisibleFence, ex: { perimeterFt: 1000, dogs: 1, gpsCollarPrice: 500, gpsMonthlyFee: 10 },
    exText: (o) => `Example: a 1,000 ft boundary costs about ${usd(o.diyWiredCost)} DIY, ${usd(o.proInstalledCost)} installed, or ${usd(o.gpsCollarFirstYear)} for a GPS collar's first year.`,
    how: "Measure the boundary you want to contain (perimeter in feet) and enter the number of dogs. Training time matters as much as the hardware.",
    assume: "DIY kit ~$200 with 500 ft of wire, extra wire ~$0.12/ft, extra collars ~$120. Pro install ≈ $800 + $1.50/ft (minimum $1,200), extra collars ~$250. GPS collar price plus subscription.",
    faq: [["How much does an Invisible Fence cost?", "Professionally installed systems usually run $1,200–2,500 for a typical yard."]],
  }),
  mk({
    slug: "how-much-is-my-dog-worth-calculator", title: "How Much Is My Dog Worth Calculator",
    desc: "Estimate your dog's market value and replacement cost from typical breed price, pedigree, age, health testing and training — useful for insurance, pricing a litter or a lost-pet claim.",
    meta: "How Much Is My Dog Worth Calculator — Dog Value Estimator",
    inputs: [cur("breedPrice", "Typical Puppy Price for the Breed", 1500, 50000, 1), dropdown("pedigree", "Pedigree / Papers", opts(["Mixed breed / no papers", "Registered pet quality", "Show or breeding quality", "Champion bloodline"]), 1), dropdown("age", "Age", opts(["Puppy (under 1 year)", "Young adult (1–3 years)", "Adult (4–7 years)", "Senior (8+ years)"]), 1), yn("healthTested", "Health-Tested Parents / DNA Tested", 0), dropdown("training", "Training", opts(["Basic / none", "Obedience trained", "Advanced (hunting, agility titles)", "Service / protection dog"]), 0)],
    results: [["estimatedMarketValue", "Estimated Market Value", "c"], ["replacementCost", "Replacement Cost", "c"], ["trainingValue", "Value of Training", "c"], ["pedigreeFactor", "Pedigree Factor", "n"]],
    fn: E.dogWorth, ex: { breedPrice: 1500, pedigree: 1, age: 1, healthTested: 0, training: 0 },
    exText: (o) => `Example: a 2-year-old registered dog of a $1,500 breed has an estimated market value of ${usd(o.estimatedMarketValue)}; replacing it would cost about ${usd(o.replacementCost)}.`,
    how: "Look up the typical breeder price for your breed, then pick pedigree, age and training. Of course, to you your dog is priceless.",
    assume: "Pedigree factors: mixed 0.7, registered 1.0, show 1.4, champion 2.2. Age factors 1.0 / 0.75 / 0.5 / 0.25. Health testing +15%. Training value: obedience $500, advanced $2,500, service $25,000 (half counted in market value). Rough estimate only.",
    faq: [["How do I find out what my dog is worth?", "Start from breeder prices for the breed, then adjust for papers, age and training. Insurers and courts often use replacement cost."]],
  }),
  mk({
    slug: "akc-grand-champion-points-calculator", title: "AKC Grand Champion Points Calculator",
    desc: "Track progress to an AKC Grand Championship (GCH) — points, majors under different judges and wins over champions — plus points to Bronze, Silver, Gold and Platinum levels.",
    meta: "AKC Grand Champion Points Calculator — GCH Progress Tracker",
    inputs: [yn("isChampion", "Dog Is Already an AKC Champion (CH)", 1), num("points", "Grand Championship Points Earned", 10, 2000, 1), num("majors", "Majors Won (3+ point wins)", 1, 50, 1), num("majorJudges", "Different Judges Awarding Majors", 1, 50, 1), num("showsDefeatingChampion", "Shows Defeating at Least One Champion", 2, 100, 1)],
    results: [["pointsRemaining", "Points Still Needed (of 25)", "n"], ["majorsRemaining", "Majors Still Needed (of 3)", "n"], ["majorJudgesRemaining", "Different Major Judges Needed", "n"], ["championWinsRemaining", "Wins Over a Champion Still Needed", "n"], ["grandChampionEligible", "GCH Complete (1 = yes)", "n"], ["nextLevelPoints", "Next Level Total (25 GCH · 100 Bronze · 200 Silver · 400 Gold · 800 Platinum)", "n"], ["pointsToNextLevel", "Points to Next Level", "n"]],
    fn: E.akcPoints, ex: { isChampion: 1, points: 10, majors: 1, majorJudges: 1, showsDefeatingChampion: 2 },
    exText: (o) => `Example: with 10 points and 1 major, you still need ${o.pointsRemaining} points and ${o.majorsRemaining} more majors.`,
    how: "Enter totals from your AKC points record. Points come from Best of Breed, Best of Opposite Sex and Select wins depending on dogs defeated.",
    assume: "AKC GCH: 25 points, 3 majors under 3 different judges, at least one more judge, and defeating at least one champion at 3 shows. Bronze 100, Silver 200, Gold 400, Platinum 800 points. Always confirm with the AKC.",
    faq: [["How many points for an AKC Grand Champion?", "25 points, including three majors from three different judges."]],
  }),
  mk({
    slug: "proheart-12-cost-calculator", title: "ProHeart 12 Dose & Cost Calculator",
    desc: "Estimate the dose and yearly cost of a ProHeart 12 heartworm injection for your dog by weight — and compare it with a year of monthly heartworm pills.",
    meta: "ProHeart 12 Cost Calculator — Heartworm Shot Price by Dog Weight",
    inputs: [WUNIT, WT(50), cur("monthlyPreventive", "Monthly Heartworm Pill Cost (per dose)", 15, 200, 0.01), pct("marketAdjust", "Local Clinic Price Adjustment (±%)", 0, 200, 1), cur("priceOverride", "Your Clinic's Quoted Price (0 = estimate)", 0, 2000, 1)],
    results: [["annualInjectionCost", "ProHeart 12 Injection Cost (per year)", "c"], ["doseMl", "Injection Volume (mL)", "n"], ["doseMgMoxidectin", "Moxidectin Dose (mg)", "n"], ["monthlyPreventiveAnnualCost", "12 Monthly Pills (per year)", "c"], ["annualSavings", "Yearly Savings vs Pills", "c"], ["costPerMonthEquivalent", "Cost per Month Equivalent", "c"]],
    fn: E.proheart, ex: { weightUnit: 0, weight: 50, monthlyPreventive: 15, marketAdjust: 0, priceOverride: 0 },
    exText: (o) => `Example: a 50 lb dog gets about ${o.doseMl} mL of ProHeart 12, typically around ${usd(o.annualInjectionCost)} a year (${usd(o.costPerMonthEquivalent)}/month).`,
    how: "Enter your dog's weight. ProHeart 12 is given only by a veterinarian to healthy dogs 12 months or older that test heartworm-negative.",
    assume: "Label dose 0.5 mg/kg moxidectin = 0.05 mL/kg of the reconstituted 10 mg/mL suspension. Typical 2026 US clinic prices by weight: ≤25 lb $95, ≤50 $145, ≤75 $195, ≤100 $245, over 100 $295 (exam and test extra).",
    faq: [["How much is ProHeart 12?", "Usually $75–300 a year depending on dog size and clinic."], ["Is ProHeart 12 safe?", "It is FDA-approved; your vet will screen your dog first. Rare allergic reactions can occur."]],
  }),
  mk({
    slug: "dog-harness-size-calculator", title: "Dog Harness Size Calculator",
    desc: "Find your dog's harness size from chest girth — XS to XXL — with fit allowance, a between-sizes warning and neck opening size.",
    meta: "Dog Harness Size Calculator — Harness Size Chart by Chest Girth",
    inputs: [dropdown("unit", "Measurement Unit", opts(["Inches", "Centimeters"]), 0), num("chestGirth", "Chest Girth (widest part, behind front legs)", 24, 80, 0.1), num("neck", "Neck Circumference (optional)", 14, 40, 0.1)],
    results: [["sizeIndex", "Harness Size (1 XS · 2 S · 3 M · 4 L · 5 XL · 6 XXL)", "n"], ["chestRangeLowIn", "Size Chest Range — From (in)", "n"], ["chestRangeHighIn", "Size Chest Range — To (in)", "n"], ["measuredChestIn", "Your Dog's Chest (in)", "n"], ["betweenSizes", "Near Top of Size (1 = consider sizing up)", "n"], ["neckOpeningMinIn", "Minimum Neck Opening (in)", "n"]],
    fn: E.harnessSize, ex: { unit: 0, chestGirth: 24, neck: 14 },
    exText: (o) => `Example: a 24 in chest fits size ${["XS", "S", "M", "L", "XL", "XXL"][o.sizeIndex - 1]} (${o.chestRangeLowIn}–${o.chestRangeHighIn} in).`,
    how: "Measure around the widest part of the ribcage just behind the front legs with a soft tape. Brands differ — always check the specific brand's chart.",
    assume: "Adds 1 in of fit allowance. Typical sizing: XS 13–17 in, S 17–22, M 22–27, L 27–32, XL 32–40, XXL 40–48. You should fit two fingers under the straps.",
    faq: [["How do I measure my dog for a harness?", "Measure chest girth behind the front legs, and the neck where a collar sits."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-pets-animals-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
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
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
