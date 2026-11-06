// One-time (but safe to re-run) batch setup script: creates 30 calculators in Food & Drink
// Calculators > Food Nutrition & Calorie Calculators. Food data and formulas live in
// src/lib/calc-engine-food-nutrition.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-nutrition-calculators.ts
// or
//   npm run db:create-food-nutrition-calculators

import * as E from "../src/lib/calc-engine-food-nutrition";

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

const NC = "food-nutrition-calorie-calculators";
const NOTES: Record<string, string> = {
  [NC]: "Nutrition values are typical figures based on USDA FoodData Central and common restaurant portions — recipes, brands and portion sizes vary, so treat results as estimates and use package labels where you have them. Not medical or dietary advice.",
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

/** Builder slots: item i (dropdown from the list) + quantity i (servings). defaults = [listIndex, qty] per slot. */
const SLOTS = (list: E.Row[], defaults: [number, number][], qtyLabel = "Servings") => defaults.flatMap(([idx, q], i) => [dropdown(`item${i + 1}`, `Item ${i + 1}`, opts(list.map((x) => x[0])), idx), num(`qty${i + 1}`, `Item ${i + 1} — ${qtyLabel}`, q, 100, 0.25)]);
const exSlots = (defaults: [number, number][]) => Object.fromEntries(defaults.flatMap(([idx, q], i) => [[`item${i + 1}`, idx], [`qty${i + 1}`, q]])) as Record<string, number>;
const MACROS: Line[] = [["calories", "Calories", "n"], ["protein", "Protein (g)", "n"], ["carbs", "Carbohydrates (g)", "n"], ["fat", "Fat (g)", "n"], ["fiber", "Fiber (g)", "n"], ["sugar", "Sugar (g)", "n"], ["sodium", "Sodium (mg)", "n"], ["proteinPercentCalories", "Calories From Protein (%)", "n"], ["carbsPercentCalories", "Calories From Carbs (%)", "n"], ["fatPercentCalories", "Calories From Fat (%)", "n"]];
const BUILD_HOW = (what: string) => `Pick each item in your ${what} and enter how many servings of it (the serving size is shown in the item name — use 0.5 for half, 2 for double). Leave unused items at 0.`;
const FOOD_SLOTS = (n: number, defaults: [number, number][]) => [...Array(n)].flatMap((_, i) => [dropdown(`food${i + 1}`, `Food ${i + 1}`, opts(E.FOODS_100G.map((x) => x[0])), defaults[i]?.[0] ?? 0), num(`grams${i + 1}`, `Food ${i + 1} — grams`, defaults[i]?.[1] ?? 0, 10000, 1)]);
const exFoods = (n: number, defaults: [number, number][]) => Object.fromEntries([...Array(n)].flatMap((_, i) => [[`food${i + 1}`, defaults[i]?.[0] ?? 0], [`grams${i + 1}`, defaults[i]?.[1] ?? 0]])) as Record<string, number>;
const WEIGHT3 = dropdown("weightUnit", "Weight Unit", opts(["Ounces", "Grams", "Pounds"]), 0);

const SALAD_D: [number, number][] = [[0, 1], [2, 1], [13, 1], [10, 1], [19, 1], [14, 1], [22, 1], [20, 0]];
const POKE_D: [number, number][] = [[0, 1], [4, 1], [12, 1], [11, 1], [13, 1], [18, 1], [19, 1], [20, 1]];
const SMOOTHIE_D: [number, number][] = [[0, 1], [1, 1], [8, 1], [16, 1], [18, 1], [25, 0]];
const ACAI_D: [number, number][] = [[0, 2], [2, 1], [3, 1], [4, 1], [6, 1], [10, 1], [11, 1]];
const SUSHI_D: [number, number][] = [[0, 6], [1, 6], [9, 2], [15, 1], [18, 1], [14, 0]];
const CHINESE_D: [number, number][] = [[0, 2], [17, 1], [20, 1], [24, 1], [22, 0]];
const INDIAN_D: [number, number][] = [[1, 1.5], [14, 1], [16, 1], [19, 1], [24, 0]];
const BURRITO_D: [number, number][] = [[0, 1], [2, 1], [4, 1], [6, 1], [13, 1], [18, 0], [16, 0], [17, 1], [12, 0], [20, 1]];
const MEXICAN_D: [number, number][] = [[0, 3], [18, 1], [19, 1], [22, 1], [23, 1]];
const BREAKFAST_D: [number, number][] = [[0, 2], [3, 3], [7, 2], [32, 1], [30, 0], [26, 0]];
const HIBACHI_D: [number, number][] = [[0, 1.5], [4, 1], [2, 0.5], [3, 1], [12, 1], [15, 0]];
const BIBIMBAP_D: [number, number][] = [[0, 1], [2, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [13, 1], [14, 1]];
const COWBOY_D: [number, number][] = [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [10, 3], [11, 2], [12, 2], [15, 1]];
const BAKING_D: [number, number][] = [[0, 2.25], [5, 1], [2, 0.75], [3, 0.75], [7, 2], [13, 2], [25, 1], [27, 1], [28, 1], [16, 0]];

const TOOLS: ToolDef[] = [
  mk({
    slug: "nutrition-calculator", cat: NC, title: "Nutrition Calculator (Calories & Macros in Food)",
    desc: "Find the calories, protein, carbs, fat, fiber, sugar and sodium in up to six foods by weight — meat, fish, eggs, grains, beans, vegetables, fruit, dairy, nuts and oils — with the macro split.",
    meta: "Nutrition Calculator — Calories, Protein, Carbs & Fat in Food",
    inputs: FOOD_SLOTS(6, [[0, 150], [11, 180], [25, 100], [46, 10], [0, 0], [0, 0]]), results: MACROS,
    fn: E.nutrition, ex: exFoods(6, [[0, 150], [11, 180], [25, 100], [46, 10]]),
    exText: (o) => `Example: 150 g of chicken breast, 180 g of cooked rice, 100 g of broccoli and 10 g of olive oil add up to ${o.calories} calories, ${o.protein} g protein, ${o.carbs} g carbs and ${o.fat} g fat.`,
    how: "Choose each food and enter its weight in grams (a kitchen scale is the most accurate way to track). Weigh cooked foods as cooked and raw foods as raw — the values differ.\n\nFor packaged foods, the label is more accurate than a general database.",
    assume: "Values per 100 g from USDA FoodData Central (SR Legacy). Macro percentages use 4 kcal/g for protein and carbs and 9 kcal/g for fat.",
    faq: [["How many calories are in 100 g of chicken breast?", "About 165 calories cooked, with 31 g of protein."], ["How do I calculate the macros in my food?", "Weigh each food, multiply its per-100 g values by grams ÷ 100, and add them up — which is what this calculator does."]],
  }),
  mk({
    slug: "recipe-nutrition-calculator", cat: NC, title: "Recipe Nutrition Calculator (Calories per Serving)",
    desc: "Work out the nutrition of a homemade recipe — calories, protein, carbs, net carbs, fat, fiber, sugar and sodium per serving — from up to ten ingredients by weight, with % Daily Value for a nutrition facts label.",
    meta: "Recipe Nutrition Calculator — Calories & Macros per Serving",
    inputs: [...FOOD_SLOTS(10, [[13, 340], [2, 450], [32, 150], [28, 400], [46, 15], [44, 50], [0, 0], [0, 0], [0, 0], [0, 0]]), num("servings", "Servings the Recipe Makes", 6, 1000, 1, 1)],
    results: [["caloriesPerServing", "Calories per Serving", "n"], ["proteinPerServing", "Protein per Serving (g)", "n"], ["carbsPerServing", "Carbs per Serving (g)", "n"], ["netCarbsPerServing", "Net Carbs per Serving (g)", "n"], ["fatPerServing", "Fat per Serving (g)", "n"], ["fiberPerServing", "Fiber per Serving (g)", "n"], ["sugarPerServing", "Sugar per Serving (g)", "n"], ["sodiumPerServing", "Sodium per Serving (mg)", "n"], ["sodiumDvPercent", "Sodium % Daily Value", "n"], ["fatDvPercent", "Fat % Daily Value", "n"], ["totalCalories", "Whole Recipe (calories)", "n"]],
    fn: E.recipeNutrition, ex: { ...exFoods(10, [[13, 340], [2, 450], [32, 150], [28, 400], [46, 15], [44, 50]]), servings: 6 },
    exText: (o) => `Example: a pasta bake with 340 g dry-weight-cooked pasta, 450 g ground beef, onion, tomatoes, olive oil and mozzarella has about ${o.caloriesPerServing} calories and ${o.proteinPerServing} g protein in each of 6 servings.`,
    how: "Enter every ingredient that goes into the pot, by weight, and the number of servings. Use cooked weights for foods listed as cooked (rice, pasta, meat) and raw weights for the rest.\n\nFor exact labels for selling food, use a lab or FDA-compliant labelling software.",
    assume: "Ingredient values per 100 g from USDA FoodData Central. Net carbs = carbohydrates − fiber. % Daily Values use FDA references (fat 78 g, sodium 2,300 mg). Cooking losses of water do not change the per-serving totals.",
    faq: [["How do I calculate calories per serving of a recipe?", "Add the calories of every ingredient and divide by the number of servings."], ["Do I weigh ingredients raw or cooked?", "Either, as long as you use values for the same state — this database labels which is which."]],
  }),
  mk({
    slug: "beer-calorie-calculator", cat: NC, title: "Beer Calorie Calculator",
    desc: "Find the calories in a beer from its style or ABV and serving size — light beer, lager, IPA, stout, hard seltzer or non-alcoholic — with carbs, alcohol grams, standard drinks and the walking time to burn it off.",
    meta: "Beer Calorie Calculator — Calories in Beer by ABV & Style",
    inputs: [dropdown("style", "Beer Style", opts(E.BEER_STYLES.map(([n, a]) => (a ? `${n} (≈ ${a}%)` : n))), 4), num("ounces", "Serving Size (fl oz)", 12, 64, 0.5, 1), num("drinks", "Number of Drinks", 1, 50, 1), pct("abv", "ABV (custom only)", 5, 20, 0.1), num("carbsPer12", "Carbs per 12 oz (custom only, g)", 13, 60, 0.5)],
    results: [["caloriesPerDrink", "Calories per Drink", "n"], ["totalCalories", "Total Calories", "n"], ["carbsPerDrink", "Carbs per Drink (g)", "n"], ["alcoholGramsPerDrink", "Alcohol per Drink (g)", "n"], ["standardDrinks", "US Standard Drinks", "n"], ["minutesWalkingToBurn", "Minutes of Brisk Walking to Burn", "n"]],
    fn: E.beerCalories, ex: { style: 4, ounces: 16, drinks: 1, abv: 5, carbsPer12: 13 },
    exText: (o) => `Example: a 16 oz pint of 6.5% IPA has about ${o.caloriesPerDrink} calories and ${o.carbsPerDrink} g of carbs.`,
    how: "Pick a style for a typical estimate, or choose Custom and enter the ABV from the can. Most of a beer's calories come from alcohol, so stronger beers are always higher in calories.",
    assume: "Calories = alcohol grams × 7 + carbohydrate grams × 4; alcohol grams = fl oz × 29.57 × ABV × 0.789. Typical carbs per 12 oz: light 6.6 g, lager 12, IPA 18, stout 20, double IPA 24. Brisk walking burns about 4–5 kcal a minute.",
    faq: [["How many calories are in a beer?", "About 150 in a regular 12 oz beer, 100–110 in a light beer and 200–300 in a strong IPA pint."], ["How many calories in a pint of IPA?", "Roughly 250–300 for a 6.5–7% IPA."]],
  }),
  mk({
    slug: "salad-calories-calculator", cat: NC, title: "Salad Calorie Calculator (Build Your Salad)",
    desc: "Build a salad and count its calories — greens, chicken, salmon, eggs, cheese, avocado, croutons, nuts, seeds and dressings — with protein, carbs, fat, fiber and sodium.",
    meta: "Salad Calories Calculator — Calories in Salad and Dressing",
    inputs: SLOTS(E.SALAD, SALAD_D), results: MACROS, fn: E.salad, ex: exSlots(SALAD_D),
    exText: (o) => `Example: greens, grilled chicken, avocado, cheddar, tomatoes and croutons with ranch dressing come to ${o.calories} calories and ${o.protein} g protein.`,
    how: BUILD_HOW("salad") + "\n\nDressing, cheese, nuts and avocado are where most salad calories hide — 2 tablespoons of creamy dressing can add 130–160 calories.",
    assume: "Typical USDA values for each topping at the serving shown. Restaurant salads are often 600–1,200 calories because of larger portions of toppings and dressing.",
    faq: [["How many calories in a Caesar salad?", "About 350–500 for a side and 700+ for an entrée with chicken."], ["What is the lowest-calorie salad dressing?", "Vinegar, lemon juice, salsa or a light vinaigrette at 15–40 calories per 2 tablespoons."]],
  }),
  mk({
    slug: "poke-bowl-calorie-calculator", cat: NC, title: "Poke Bowl Calorie Calculator",
    desc: "Count the calories and macros of a poke bowl — sushi or brown rice, greens, ahi tuna, salmon, shrimp or tofu, toppings and sauces like spicy mayo and eel sauce.",
    meta: "Poke Bowl Calorie Calculator — Build Your Bowl",
    inputs: SLOTS(E.POKE, POKE_D), results: MACROS, fn: E.poke, ex: exSlots(POKE_D),
    exText: (o) => `Example: a bowl of sushi rice with ahi tuna, edamame, avocado, cucumber, sesame seeds, shoyu and spicy mayo has about ${o.calories} calories and ${o.protein} g protein.`,
    how: BUILD_HOW("poke bowl") + "\n\nSwap half the rice for greens or cauliflower rice and go light on spicy mayo to cut 200–300 calories.",
    assume: "Typical values for each base, protein, topping and sauce; seasoned sushi rice includes sugar and vinegar. Shop portions vary — a large bowl often has 1½–2 cups of rice.",
    faq: [["How many calories in a poke bowl?", "Usually 500–900 depending on rice, sauces and toppings."], ["Is a poke bowl healthy?", "It can be: lean fish, vegetables and moderate rice make a high-protein meal; heavy sauces add a lot of fat and sodium."]],
  }),
  mk({
    slug: "smoothie-calorie-calculator", cat: NC, title: "Smoothie Calorie Calculator",
    desc: "Add up the calories, protein, carbs, fat, fiber and sugar in a homemade smoothie — fruit, greens, milk or juice, yogurt, protein powder, nut butter, seeds and sweeteners.",
    meta: "Smoothie Calorie Calculator — Calories & Protein in Your Smoothie",
    inputs: SLOTS(E.SMOOTHIE, SMOOTHIE_D), results: MACROS, fn: E.smoothie, ex: exSlots(SMOOTHIE_D),
    exText: (o) => `Example: a banana, a cup of strawberries, a cup of milk, a scoop of whey and a tablespoon of peanut butter make a ${o.calories}-calorie smoothie with ${o.protein} g protein and ${o.sugar} g sugar.`,
    how: BUILD_HOW("smoothie") + "\n\nFor a filling, lower-sugar smoothie, use one fruit, add protein and greens, and use unsweetened milk instead of juice.",
    assume: "USDA values for fruits, milks and seeds; protein powders vary by brand (check your label). Natural fruit sugar is included in the sugar total.",
    faq: [["How many calories in a smoothie?", "Homemade smoothies are usually 250–500 calories; shop smoothies can exceed 600."], ["How can I add protein to a smoothie?", "Greek yogurt, protein powder, milk, soy milk or nut butter each add 4–24 g."]],
  }),
  mk({
    slug: "sushi-calorie-calculator", cat: NC, title: "Sushi Calorie Calculator",
    desc: "Count the calories in a sushi meal — California, spicy tuna, Philadelphia, shrimp tempura and specialty rolls, nigiri, sashimi, edamame, miso soup and soy sauce — piece by piece.",
    meta: "Sushi Calorie Calculator — Calories per Roll, Nigiri & Sashimi",
    inputs: SLOTS(E.SUSHI, SUSHI_D, "Pieces / servings"), results: MACROS, fn: E.sushi, ex: exSlots(SUSHI_D),
    exText: (o) => `Example: a California roll and a spicy tuna roll (6 pieces each), 2 salmon nigiri, miso soup and a tablespoon of soy sauce add up to ${o.calories} calories and ${fmt(o.sodium, 0)} mg of sodium.`,
    how: "Enter the number of pieces of each roll (most rolls are 6–8 pieces) and servings of sides. Tempura, cream cheese and mayo-based sauces are the high-calorie extras; sashimi is the leanest choice.",
    assume: "Typical restaurant values per piece. A standard roll uses about ¾ cup of seasoned rice. Soy sauce adds about 880 mg sodium per tablespoon.",
    faq: [["How many calories in a California roll?", "About 250–260 calories for 6 pieces."], ["Is sushi good for weight loss?", "Sashimi, nigiri and simple rolls are fairly light; tempura and specialty rolls with sauces can top 500 calories each."]],
  }),
  mk({
    slug: "chicken-protein-calculator", cat: NC, title: "Chicken Protein Calculator (by Cut, Raw or Cooked)",
    desc: "Find how much protein is in chicken — breast, thigh, drumstick, wing or ground — raw or cooked, with or without skin, by weight, with calories and fat.",
    meta: "Chicken Protein Calculator — Protein in Chicken Breast & Thigh",
    inputs: [dropdown("cut", "Cut", opts(E.CHICKEN_CUTS.map((c) => c[0])), 0), dropdown("state", "Weighed", opts(["Raw", "Cooked"]), 1), WEIGHT3, num("weight", "Weight", 6, 10000, 0.1)],
    results: [["protein", "Protein (g)", "n"], ["calories", "Calories", "n"], ["fat", "Fat (g)", "n"], ["proteinPer100g", "Protein per 100 g", "n"], ["proteinPerOz", "Protein per Ounce", "n"], ["caloriesFromProteinPercent", "Calories From Protein (%)", "n"]],
    fn: E.chickenProtein, ex: { cut: 0, state: 1, weightUnit: 0, weight: 6 },
    exText: (o) => `Example: 6 oz of cooked skinless chicken breast has about ${o.protein} g of protein and ${o.calories} calories.`,
    how: "Choose the cut and whether you weighed it raw or cooked. Chicken loses about 25% of its weight in cooking, so cooked chicken has more protein per ounce than raw.",
    assume: "USDA FoodData Central values per 100 g (meat only unless 'with skin'); cooked = roasted. Breast: raw 22.5 g, cooked 31 g protein per 100 g.",
    faq: [["How much protein is in a chicken breast?", "A typical 6 oz cooked breast has about 50–55 g of protein."], ["Does cooking chicken change the protein?", "No protein is lost; water is, so cooked chicken is more protein-dense by weight."]],
  }),
  mk({
    slug: "pizza-nutrition-calculator", cat: NC, title: "Pizza Nutrition Calculator (Calories per Slice)",
    desc: "Estimate calories, protein, carbs, fat and sodium in pizza by size, crust (thin, hand-tossed, pan or stuffed), toppings and how many slices you eat.",
    meta: "Pizza Nutrition Calculator — Calories per Slice by Size & Crust",
    inputs: [dropdown("size", "Pizza Size", opts(["Small 10 in (6 slices)", "Medium 12 in (8 slices)", "Large 14 in (8 slices)", "Extra-large 16 in (12 slices)"]), 2), dropdown("crust", "Crust", opts(["Thin crust", "Hand-tossed / regular", "Pan / deep dish", "Stuffed crust"]), 1), dropdown("toppings", "Toppings", opts(["Cheese only", "Pepperoni", "Sausage", "Veggie", "Meat lovers / supreme", "Chicken / BBQ chicken"]), 1), num("slices", "Slices Eaten", 2, 24, 1)],
    results: [["caloriesPerSlice", "Calories per Slice", "n"], ["totalCalories", "Total Calories", "n"], ["proteinTotal", "Protein (g)", "n"], ["carbsTotal", "Carbs (g)", "n"], ["fatTotal", "Fat (g)", "n"], ["sodiumTotal", "Sodium (mg)", "n"]],
    fn: E.pizzaNutrition, ex: { size: 2, crust: 1, toppings: 1, slices: 2 },
    exText: (o) => `Example: two slices of a large hand-tossed pepperoni pizza are about ${o.totalCalories} calories (${o.caloriesPerSlice} each) with ${fmt(o.sodiumTotal, 0)} mg of sodium.`,
    how: "Choose the size, crust and toppings. Slice size matters most — an extra-large slice is not the same as a small one. For a specific chain, check its nutrition guide.",
    assume: "Base: a large 14-inch hand-tossed cheese slice ≈ 285 calories, 12 g protein, 36 g carbs, 10 g fat, 640 mg sodium. Thin crust ×0.75, pan ×1.25, stuffed ×1.35; toppings add 10 (veggie) to 110 (meat lovers) calories per slice. Smaller pizzas have smaller slices.",
    faq: [["How many calories in a slice of pizza?", "About 250–350 for a large cheese or pepperoni slice."], ["Is thin crust pizza lower in calories?", "Yes — usually 20–30% fewer calories per slice than regular crust."]],
  }),
  mk({
    slug: "coffee-calorie-calculator", cat: NC, title: "Coffee Calorie Calculator (Lattes, Mochas & More)",
    desc: "Find the calories in your coffee drink — latte, cappuccino, flat white, mocha, macchiato, Frappuccino-style, chai, cold brew or drip — by size, milk, syrup pumps, sugar and whipped cream.",
    meta: "Coffee Calorie Calculator — Calories in a Latte by Milk & Size",
    inputs: [dropdown("drink", "Drink", opts(E.COFFEE_DRINKS.map(([n]) => n)), 0), dropdown("size", "Size", opts(["Short 8 oz", "Tall 12 oz", "Grande 16 oz", "Venti hot 20 oz", "Venti iced 24 oz"]), 2), dropdown("milk", "Milk", opts(E.MILKS.map(([n]) => n)), 1), num("splashOz", "Extra Milk / Creamer (fl oz)", 0, 16, 0.5), num("syrupPumps", "Syrup Pumps", 0, 12, 1), num("sugarPackets", "Sugar Packets / Teaspoons", 0, 12, 1), dropdown("whip", "Whipped Cream", opts(["No", "Yes"]), 0)],
    results: [["calories", "Calories", "n"], ["sugarGrams", "Sugar (g)", "n"], ["fatGrams", "Fat (g)", "n"], ["proteinGrams", "Protein (g)", "n"], ["milkOunces", "Milk (fl oz)", "n"], ["caloriesFromAddOns", "Calories From Syrup, Sugar & Whip", "n"]],
    fn: E.coffeeCalories, ex: { drink: 0, size: 2, milk: 1, splashOz: 0, syrupPumps: 0, sugarPackets: 0, whip: 0 },
    exText: (o) => `Example: a grande latte with 2% milk is about ${o.calories} calories and ${o.sugarGrams} g of (milk) sugar; add 4 pumps of syrup and it rises by about 80 calories.`,
    how: "Choose the drink, size and milk, and add syrups, sugar or whipped cream. Black coffee, Americanos and plain cold brew are under 5 calories — almost all calories come from milk and sweeteners.",
    assume: "Milk calories per fl oz: whole 18.6, 2% 15.3, skim 10.4, oat 17.5, unsweetened almond 4.6, soy 13, half-and-half 39. A syrup pump ≈ 20 kcal (5 g sugar); whipped cream ≈ 80 kcal. Café recipes vary.",
    faq: [["How many calories in a grande latte?", "About 190 with 2% milk, 130 with skim and 230 with whole milk."], ["Which milk has the fewest calories in coffee?", "Unsweetened almond milk, then skim milk."]],
  }),
  mk({
    slug: "chinese-food-calories-calculator", cat: NC, title: "Chinese Food Calorie Calculator",
    desc: "Count the calories in a Chinese takeout meal — General Tso's, orange and sesame chicken, beef and broccoli, lo mein, fried rice, egg rolls, crab rangoon, dumplings and soups — by the cup or piece.",
    meta: "Chinese Food Calories Calculator — Takeout Calories per Cup",
    inputs: SLOTS(E.CHINESE, CHINESE_D, "Cups / pieces"), results: MACROS, fn: E.chinese, ex: exSlots(CHINESE_D),
    exText: (o) => `Example: 2 cups of General Tso's chicken, a cup of chicken fried rice, an egg roll and a cup of wonton soup add up to about ${o.calories} calories and ${fmt(o.sodium, 0)} mg of sodium.`,
    how: "Enter cups of each dish (a takeout container holds about 3–4 cups) and pieces of appetizers. Steamed dishes with sauce on the side are the lightest choices; battered, fried dishes in sweet sauces are the heaviest.",
    assume: "Typical restaurant values per cup; recipes and portions vary widely, and many takeout entrées are 3–4 cups. Sodium is often very high — one meal can exceed a full day's 2,300 mg.",
    faq: [["How many calories in General Tso's chicken?", "About 380 per cup — a full takeout order can be 1,300–1,500."], ["What is the healthiest Chinese takeout?", "Steamed chicken or shrimp with vegetables, sauce on the side, with steamed rice."]],
  }),
  mk({
    slug: "indian-food-calorie-calculator", cat: NC, title: "Indian Food Calorie Calculator",
    desc: "Count the calories in an Indian meal — butter chicken, tikka masala, korma, palak paneer, chana masala, dal, biryani, naan, roti, samosas, tandoori chicken, raita and mango lassi.",
    meta: "Indian Food Calorie Calculator — Curry, Naan & Biryani Calories",
    inputs: SLOTS(E.INDIAN, INDIAN_D, "Cups / pieces"), results: MACROS, fn: E.indian, ex: exSlots(INDIAN_D),
    exText: (o) => `Example: 1½ cups of chicken tikka masala with a cup of basmati rice, a plain naan and a samosa come to about ${o.calories} calories.`,
    how: "Enter cups of curries and rice and pieces of breads and snacks. Creamy, butter-based curries (korma, makhani) are the richest; tandoori dishes, dal and chana masala are lighter.",
    assume: "Typical restaurant values per cup; home-cooked versions often use less cream and oil. A naan is about 260–300 calories; a restaurant curry portion is often 1½–2 cups.",
    faq: [["How many calories in chicken tikka masala?", "About 400 per cup, plus rice and naan."], ["What is the healthiest Indian dish?", "Tandoori chicken, chicken tikka, dal and chana masala with roti are among the lighter choices."]],
  }),
  mk({
    slug: "burrito-calorie-calculator", cat: NC, title: "Burrito Calorie Calculator (Build a Burrito or Bowl)",
    desc: "Build a burrito or burrito bowl and count its calories — tortilla, rice, beans, chicken, steak, carnitas or barbacoa, salsas, cheese, sour cream, guacamole and queso — with full macros.",
    meta: "Burrito Calorie Calculator — Build Your Burrito or Bowl",
    inputs: SLOTS(E.BURRITO, BURRITO_D), results: MACROS, fn: E.burrito, ex: exSlots(BURRITO_D),
    exText: (o) => `Example: a 13-inch burrito with white rice, black beans, chicken, pico, cheese and lettuce has about ${o.calories} calories and ${o.protein} g protein.`,
    how: BUILD_HOW("burrito") + "\n\nThe large tortilla alone is about 320 calories — a bowl saves those. Double portions of rice or meat count as 2 servings.",
    assume: "Typical Mexican-grill portion values (4 oz rice, beans and meat; 1 oz cheese; 2 oz sour cream; 4 oz guacamole), similar to those published by fast-casual chains.",
    faq: [["How many calories in a burrito?", "A fast-casual burrito is usually 900–1,300 calories."], ["Is a burrito bowl healthier than a burrito?", "It skips the ~320-calorie tortilla, so yes, if the fillings are the same."]],
  }),
  mk({
    slug: "juice-nutrition-calculator", cat: NC, title: "Juice Nutrition Calculator (Calories & Sugar in Juice)",
    desc: "Compare the calories, sugar, vitamin C and potassium in orange, apple, grape, cranberry, pineapple, tomato, carrot, celery, beet, green juice, coconut water and more, for any glass size.",
    meta: "Juice Nutrition Calculator — Calories & Sugar in Juice",
    inputs: [dropdown("juice", "Juice", opts(E.JUICES.map((j) => j[0])), 0), num("ounces", "Glass Size (fl oz)", 8, 64, 1, 1)],
    results: [["calories", "Calories", "n"], ["sugarGrams", "Sugar (g)", "n"], ["teaspoonsOfSugar", "Teaspoons of Sugar", "n"], ["carbsGrams", "Carbs (g)", "n"], ["vitaminCMg", "Vitamin C (mg)", "n"], ["vitaminCDvPercent", "Vitamin C % Daily Value", "n"], ["potassiumMg", "Potassium (mg)", "n"], ["sodiumMg", "Sodium (mg)", "n"]],
    fn: E.juiceNutrition, ex: { juice: 0, ounces: 8 },
    exText: (o) => `Example: an 8 oz glass of orange juice has ${o.calories} calories, ${o.sugarGrams} g of sugar (about ${o.teaspoonsOfSugar} teaspoons) and ${o.vitaminCDvPercent}% of your daily vitamin C.`,
    how: "Pick a juice and your glass size. Even 100% juice has as much sugar as soda by volume; whole fruit gives the same vitamins with fibre and fewer calories per serving.\n\nFor homemade juice, values are close to the bottled equivalent.",
    assume: "USDA values per 8 fl oz for 100% juice unless named (cranberry cocktail and lemonade are sweetened). Vegetable juices with added salt are high in sodium. Daily Values: vitamin C 90 mg, potassium 4,700 mg.",
    faq: [["How much sugar is in orange juice?", "About 21 g per 8 oz glass — all natural fruit sugar."], ["Which juice has the least sugar?", "Vegetable juices such as tomato, celery and V8-style juice."]],
  }),
  mk({
    slug: "bubble-tea-calorie-calculator", cat: NC, title: "Bubble Tea Calorie Calculator (Boba Calories)",
    desc: "Estimate the calories and sugar in bubble tea by flavor, size, sweetness level, milk or creamer and toppings — tapioca pearls, jelly, pudding, popping boba or cheese foam.",
    meta: "Bubble Tea Calorie Calculator — Boba Calories by Sweetness",
    inputs: [dropdown("flavor", "Drink", opts(["Classic milk tea", "Matcha milk tea", "Taro milk tea", "Fruit or green tea", "Brown sugar milk"]), 0), dropdown("size", "Size", opts(["Regular 16 oz", "Large 24 oz", "Small 12 oz"]), 0), dropdown("sweetness", "Sweetness Level", opts(["0%", "25%", "50%", "75%", "100% (regular)", "120% (extra sweet)"]), 4), dropdown("milk", "Milk", opts(["None (tea only)", "Whole milk", "Non-dairy creamer", "Oat milk", "Milk + creamer mix"]), 2), dropdown("topping", "Topping", opts(["None", "Tapioca pearls (boba)", "Fruit / grass jelly", "Pudding", "Popping boba", "Cheese foam"]), 1), num("toppingServings", "Topping Servings", 1, 4, 0.5)],
    results: [["calories", "Calories", "n"], ["sugarGrams", "Sugar (g)", "n"], ["teaspoonsOfSugar", "Teaspoons of Sugar", "n"], ["caloriesFromToppings", "Calories From Toppings", "n"], ["caloriesFromSugar", "Calories From Added Syrup", "n"], ["sugarDailyLimitPercent", "Share of 50 g Daily Added-Sugar Limit (%)", "n"]],
    fn: E.bubbleTea, ex: { flavor: 0, size: 0, sweetness: 4, milk: 2, topping: 1, toppingServings: 1 },
    exText: (o) => `Example: a regular 16 oz milk tea with creamer, full sugar and boba is about ${o.calories} calories with ${o.sugarGrams} g of sugar. At 50% sweetness it drops by about 100 calories.`,
    how: "Choose your drink and order details the way the shop asks for them. Sweetness level and toppings make the biggest difference; asking for 25–50% sugar cuts most of the added sugar.",
    assume: "At 100% sweetness a 16 oz drink has about 50 g of sugar syrup (60 g for brown sugar drinks). Toppings per serving: tapioca pearls ≈ 135 kcal, pudding 100, jelly and popping boba 70, cheese foam 45. Recipes vary by shop.",
    faq: [["How many calories in bubble tea?", "About 300–500 for a 16 oz milk tea with pearls at full sugar."], ["How many calories are in boba pearls?", "About 135 calories per serving (¼ cup) of tapioca pearls."]],
  }),
  mk({
    slug: "baking-calorie-calculator", cat: NC, title: "Baking Calorie Calculator (Calories per Cookie, Muffin or Slice)",
    desc: "Work out calories per cookie, muffin, brownie or slice from your baking recipe — flour, sugar, butter, eggs, milk, chocolate chips, nuts and more in cups — divided by how many pieces it makes.",
    meta: "Baking Calorie Calculator — Calories per Cookie, Brownie or Slice",
    inputs: [...SLOTS(E.BAKING, BAKING_D, "Amount (cups / units shown)"), num("pieces", "Pieces the Recipe Makes", 60, 1000, 1, 1)],
    results: [["caloriesPerPiece", "Calories per Piece", "n"], ["proteinPerPiece", "Protein per Piece (g)", "n"], ["carbsPerPiece", "Carbs per Piece (g)", "n"], ["fatPerPiece", "Fat per Piece (g)", "n"], ["sugarPerPiece", "Sugar per Piece (g)", "n"], ["sodiumPerPiece", "Sodium per Piece (mg)", "n"], ["totalCalories", "Whole Batch (calories)", "n"]],
    fn: E.bakingCalories, ex: { ...exSlots(BAKING_D), pieces: 60 },
    exText: (o) => `Example: the classic Toll House recipe (2¼ cups flour, 1 cup butter, ¾ cup each sugar and brown sugar, 2 eggs, 2 cups chips) makes about 5 dozen cookies of about ${o.caloriesPerPiece} calories each.`,
    how: "Enter each ingredient in the units shown (cups, or individual eggs and teaspoons) and how many pieces you cut or scoop. Bigger cookies mean fewer pieces and more calories each.",
    assume: "USDA values per cup for baking ingredients (spoon-and-level flour, packed brown sugar). Baking loses some water but not calories.",
    faq: [["How many calories in a homemade chocolate chip cookie?", "About 100–110 for a standard 1 tablespoon scoop; bakery-size cookies are 200–400."], ["How many calories in a cup of flour?", "About 455 calories in a cup of all-purpose flour."]],
  }),
  mk({
    slug: "acai-bowl-calories-calculator", cat: NC, title: "Açaí Bowl Calorie Calculator",
    desc: "Build an açaí bowl and count the calories — unsweetened or sweetened açaí packs, banana, berries, milk or juice, granola, honey, nut butter, coconut, chia and cacao toppings.",
    meta: "Acai Bowl Calories Calculator — Build Your Bowl",
    inputs: SLOTS(E.ACAI, ACAI_D), results: MACROS, fn: E.acai, ex: exSlots(ACAI_D),
    exText: (o) => `Example: two unsweetened açaí packs blended with banana, berries and almond milk, topped with granola, honey and peanut butter, come to about ${o.calories} calories and ${o.sugar} g of sugar.`,
    how: BUILD_HOW("açaí bowl") + "\n\nShop bowls often use sweetened açaí and generous granola and honey, which can push them past 600 calories.",
    assume: "Unsweetened açaí ≈ 60 kcal per 100 g pack; sweetened ≈ 100 kcal with 10 g sugar. Toppings at typical serving sizes; granola varies by brand.",
    faq: [["How many calories in an açaí bowl?", "Homemade bowls are usually 350–550 calories; shop bowls 500–800."], ["Is an açaí bowl healthy?", "It is rich in fruit and fibre but can be high in sugar — choose unsweetened açaí and go easy on honey and granola."]],
  }),
  mk({
    slug: "avocado-nutrition-calculator", cat: NC, title: "Avocado Nutrition Calculator",
    desc: "See the calories, healthy fat, fiber, net carbs, protein and potassium in an avocado — small, medium or large Hass, Florida avocado, or any weight in grams.",
    meta: "Avocado Nutrition Calculator — Calories in an Avocado",
    inputs: [dropdown("mode", "Measure By", opts(["Number of avocados", "Grams of flesh"]), 0), dropdown("size", "Avocado Size", opts(E.AVOCADO_SIZES.map(([n]) => n)), 1), num("count", "How Many (0.5 = half)", 1, 20, 0.25), num("grams", "Grams of Flesh (if measuring by grams)", 50, 5000, 1)],
    results: [["calories", "Calories", "n"], ["fat", "Fat (g)", "n"], ["fiber", "Fiber (g)", "n"], ["carbs", "Carbs (g)", "n"], ["netCarbs", "Net Carbs (g)", "n"], ["protein", "Protein (g)", "n"], ["potassiumMg", "Potassium (mg)", "n"], ["grams", "Flesh Weight (g)", "n"]],
    fn: E.avocado, ex: { mode: 0, size: 1, count: 1, grams: 50 },
    exText: (o) => `Example: one medium Hass avocado (about 136 g of flesh) has ${o.calories} calories, ${o.fat} g of mostly monounsaturated fat, ${o.fiber} g of fiber and ${o.netCarbs} g of net carbs.`,
    how: "Choose the size and how many, or weigh the flesh. A 'serving' on US labels is ⅓ of a medium avocado (50 g, 80 calories).",
    assume: "USDA FoodData Central per 100 g: Hass 160 kcal, 14.7 g fat, 6.7 g fiber, 8.5 g carbs; Florida 120 kcal, 10.1 g fat. Flesh weights are typical — avocados vary a lot.",
    faq: [["How many calories in a whole avocado?", "About 220–240 for a medium Hass avocado."], ["Is avocado keto?", "Yes — a medium avocado has only about 2–3 g of net carbs."]],
  }),
  mk({
    slug: "ground-beef-protein-calculator", cat: NC, title: "Ground Beef Protein Calculator (by Lean %)",
    desc: "Find the protein, calories and fat in ground beef from 70/30 to 97/3, weighed raw or cooked and drained, with protein and calories per 4 oz.",
    meta: "Ground Beef Protein Calculator — Protein in 80/20, 90/10 & More",
    inputs: [dropdown("lean", "Lean / Fat Ratio", opts(E.BEEF_LEAN.map(([n]) => n)), 2), dropdown("state", "Weighed", opts(["Raw", "Cooked and drained"]), 0), WEIGHT3, num("weight", "Weight", 4, 10000, 0.1)],
    results: [["protein", "Protein (g)", "n"], ["calories", "Calories", "n"], ["fat", "Fat (g)", "n"], ["proteinPer4oz", "Protein per 4 oz", "n"], ["caloriesPer4oz", "Calories per 4 oz", "n"], ["rawWeightGrams", "Raw Weight (g)", "n"]],
    fn: E.groundBeefProtein, ex: { lean: 2, state: 0, weightUnit: 0, weight: 4 },
    exText: (o) => `Example: 4 oz of raw 80/20 ground beef has about ${o.protein} g of protein, ${o.calories} calories and ${o.fat} g of fat.`,
    how: "Pick the lean ratio on the package and whether you weighed it raw or after cooking. Leaner beef has more protein and far fewer calories per ounce.",
    assume: "Raw values per 100 g from USDA (e.g. 80/20: 17.2 g protein, 20 g fat). Cooked and drained: about 72% of the raw weight remains, with all the protein and about 70% of the fat; draining well removes more.",
    faq: [["How much protein is in 4 oz of 80/20 ground beef?", "About 19–20 g raw, or about 27 g in 4 oz of cooked crumbles."], ["Which ground beef has the most protein?", "93/7 and leaner, with about 21–22 g per 100 g raw."]],
  }),
  mk({
    slug: "brassica-calories-calculator", cat: NC, title: "Cruciferous Vegetable Calorie Calculator (Brassicas)",
    desc: "Find the calories, fiber, protein, vitamin C and vitamin K in broccoli, cauliflower, cabbage, kale, Brussels sprouts, bok choy, collards, arugula and kohlrabi — raw or cooked, by cups or grams.",
    meta: "Brassica Calories Calculator — Broccoli, Kale & Cabbage Nutrition",
    inputs: [dropdown("veg", "Vegetable", opts(E.BRASSICAS.map((b) => b[0])), 0), dropdown("state", "Raw or Cooked", opts(["Raw", "Cooked"]), 0), dropdown("unit", "Measure By", opts(["Cups", "Grams"]), 0), num("amount", "Amount", 1, 10000, 0.25)],
    results: [["calories", "Calories", "n"], ["fiber", "Fiber (g)", "n"], ["protein", "Protein (g)", "n"], ["carbs", "Carbs (g)", "n"], ["vitaminCMg", "Vitamin C (mg)", "n"], ["vitaminKMcg", "Vitamin K (µg)", "n"], ["grams", "Weight (g)", "n"]],
    fn: E.brassica, ex: { veg: 0, state: 0, unit: 0, amount: 1 },
    exText: (o) => `Example: a cup of raw chopped broccoli has ${o.calories} calories, ${o.fiber} g of fiber and ${o.vitaminCMg} mg of vitamin C — nearly a full day's worth.`,
    how: "Choose the vegetable and amount. Cooked vegetables shrink, so a cup of cooked greens holds much more than a cup of raw. If you take blood thinners such as warfarin, keep your vitamin K intake steady.",
    assume: "USDA FoodData Central per 100 g raw. A cooked cup holds about 1.7× the raw weight; boiling loses roughly 40% of vitamin C (steaming loses less). Daily Values: vitamin C 90 mg, vitamin K 120 µg.",
    faq: [["How many calories in a cup of broccoli?", "About 31 raw and about 55 cooked."], ["Which cruciferous vegetable has the most vitamin K?", "Collard greens and kale."]],
  }),
  mk({
    slug: "food-health-score-calculator", cat: NC, title: "Food Health Score Calculator (Nutri-Score A–E)",
    desc: "Grade any packaged food from A to E with the Nutri-Score method — enter calories, sugar, saturated fat, sodium, fiber, protein and fruit/vegetable content per 100 g from the label.",
    meta: "Food Health Score Calculator — Nutri-Score Grade From the Label",
    inputs: [num("calories", "Calories per 100 g", 450, 1000, 1), num("sugar", "Sugars per 100 g (g)", 25, 100, 0.1), num("saturatedFat", "Saturated Fat per 100 g (g)", 6, 100, 0.1), num("sodium", "Sodium per 100 g (mg)", 300, 10000, 1), num("fiber", "Fiber per 100 g (g)", 3, 100, 0.1), num("protein", "Protein per 100 g (g)", 7, 100, 0.1), pct("fruitVegPercent", "Fruit, Vegetables, Legumes & Nuts (%)", 0, 100, 1)],
    results: [["nutriScoreGrade", "Nutri-Score Grade (1 A · 2 B · 3 C · 4 D · 5 E)", "n"], ["score", "Nutri-Score Points (lower is better)", "n"], ["negativePoints", "Negative Points", "n"], ["positivePoints", "Positive Points", "n"], ["healthScore100", "Health Score (0–100)", "n"], ["proteinCounted", "Protein Counted (1 = yes)", "n"]],
    fn: E.foodHealthScore, ex: { calories: 450, sugar: 25, saturatedFat: 6, sodium: 300, fiber: 3, protein: 7, fruitVegPercent: 0 },
    exText: (o) => `Example: a cookie-like snack with 450 kcal, 25 g sugar, 6 g saturated fat and 300 mg sodium per 100 g scores ${o.score} points — grade ${["A", "B", "C", "D", "E"][o.nutriScoreGrade - 1]}.`,
    how: "Copy the per-100 g values from the label (US labels show per serving — divide by the serving weight in grams and multiply by 100). Estimate the share of fruit, vegetables, legumes and nuts from the ingredient list.\n\nThe score is designed to compare foods in the same aisle, not to judge a whole diet.",
    assume: "Original Nutri-Score general-food algorithm: negative points for energy, sugars, saturated fat and sodium (0–10 each); positive for fruit/vegetables/nuts, fibre and protein (0–5 each); protein not counted when negative points ≥ 11 unless fruit points are 5. Grades: A ≤ −1, B 0–2, C 3–10, D 11–18, E ≥ 19. The 2023–24 update adjusts some thresholds; drinks, cheese and fats use special rules not included here.",
    faq: [["What is Nutri-Score?", "A front-of-pack grade from A (healthiest) to E used in several European countries."], ["Is grade A always healthy?", "It means better than similar foods, not that you can eat unlimited amounts."]],
  }),
  mk({
    slug: "fish-mercury-calculator", cat: NC, title: "Fish Mercury Calculator (Safe Weekly Servings)",
    desc: "Check how much mercury you get from the fish you eat — tuna, salmon, swordfish, shrimp, cod and 25+ more — versus the EPA safe limit for your body weight, and the most you can eat per week.",
    meta: "Fish Mercury Calculator — Is Your Fish Intake Safe?",
    inputs: [dropdown("fish", "Fish or Seafood", opts(E.FISH.map(([n]) => n)), 14), num("ouncesPerWeek", "Ounces Eaten per Week", 12, 200, 0.5), dropdown("weightUnit", "Body Weight Unit", opts(["Pounds", "Kilograms"]), 0), num("weight", "Body Weight", 150, 1000, 1, 10)],
    results: [["percentOfLimit", "Share of the Safe Weekly Limit (%)", "n"], ["mercuryMcgPerWeek", "Mercury per Week (µg)", "n"], ["weeklyLimitMcg", "Safe Weekly Limit for You (µg)", "n"], ["maxOuncesPerWeek", "Most You Can Eat per Week (oz)", "n"], ["mercuryPpm", "Mercury in This Fish (ppm)", "n"], ["fdaGroup", "FDA/EPA Advice (1 best choice · 2 good choice · 3 avoid)", "n"]],
    fn: E.fishMercury, ex: { fish: 14, ouncesPerWeek: 12, weightUnit: 0, weight: 150 },
    exText: (o) => `Example: a 150 lb adult eating 12 oz of canned light tuna a week gets ${o.mercuryMcgPerWeek} µg of mercury — ${o.percentOfLimit}% of the EPA limit. Up to ${o.maxOuncesPerWeek} oz a week would stay within it.`,
    how: "Choose the fish and how much you eat in a typical week. If you eat several kinds, run each and add the percentages.\n\nPregnant or breastfeeding women and young children should follow FDA/EPA advice: 2–3 servings a week from the 'best choices' list and none from the 'avoid' list.",
    assume: "Mean mercury from FDA monitoring (1990–2012). EPA reference dose 0.1 µg per kg of body weight per day. Fish also provides omega-3s, protein and vitamin D — the goal is to choose lower-mercury fish, not to avoid fish.",
    faq: [["How much tuna is safe to eat per week?", "For a 150 lb adult, about 30 oz of light tuna or 11 oz of albacore."], ["Which fish has the least mercury?", "Salmon, shrimp, sardines, tilapia, pollock, scallops and anchovies."]],
  }),
  mk({
    slug: "breakfast-calories-calculator", cat: NC, title: "Breakfast Calorie Calculator",
    desc: "Add up the calories in your breakfast — eggs, bacon, sausage, toast, pancakes, waffles, syrup, bagels, oatmeal, cereal, yogurt, fruit, juice, hash browns, burritos and coffee.",
    meta: "Breakfast Calories Calculator — Calories in Your Breakfast",
    inputs: SLOTS(E.BREAKFAST, BREAKFAST_D), results: MACROS, fn: E.breakfast, ex: exSlots(BREAKFAST_D),
    exText: (o) => `Example: two scrambled eggs, three slices of bacon, two slices of buttered toast and a cup of coffee with cream and sugar come to ${o.calories} calories and ${o.protein} g protein.`,
    how: BUILD_HOW("breakfast") + "\n\nA protein-rich breakfast (eggs, Greek yogurt) keeps most people fuller than a sugary one.",
    assume: "Typical USDA values at the serving shown. Restaurant breakfasts often use more butter and larger portions — a diner platter can exceed 1,000 calories.",
    faq: [["How many calories should breakfast be?", "Roughly 300–600, about a quarter of your daily calories."], ["How many calories in two eggs and toast?", "About 300–350 with buttered toast."]],
  }),
  mk({
    slug: "cowboy-caviar-nutrition-calculator", cat: NC, title: "Cowboy Caviar Nutrition Calculator",
    desc: "Get the calories, protein, fiber and sodium per serving of homemade cowboy caviar (Texas caviar) from your recipe — beans, black-eyed peas, corn, peppers, onion, tomatoes, avocado and dressing.",
    meta: "Cowboy Caviar Nutrition Calculator — Calories per Serving",
    inputs: [...SLOTS(E.COWBOY, COWBOY_D, "Amount"), num("servings", "Servings", 8, 200, 1, 1)],
    results: [["caloriesPerServing", "Calories per Serving", "n"], ["proteinPerServing", "Protein (g)", "n"], ["carbsPerServing", "Carbs (g)", "n"], ["fatPerServing", "Fat (g)", "n"], ["fiberPerServing", "Fiber (g)", "n"], ["sugarPerServing", "Sugar (g)", "n"], ["sodiumPerServing", "Sodium (mg)", "n"], ["totalCalories", "Whole Batch (calories)", "n"]],
    fn: E.cowboyCaviar, ex: { ...exSlots(COWBOY_D), servings: 8 },
    exText: (o) => `Example: a classic batch with black beans, black-eyed peas, corn, pepper, onion, tomatoes, avocado and an olive-oil dressing makes 8 servings of about ${o.caloriesPerServing} calories and ${o.fiberPerServing} g fiber.`,
    how: "Enter the cans and cups in your recipe and the number of servings (a serving is usually about ¾ cup as a side or dip). Rinsing canned beans removes about 40% of their sodium.",
    assume: "USDA values for drained canned beans and fresh produce. The olive-oil dressing is the main source of fat; bottled Italian dressing adds more sugar and sodium.",
    faq: [["Is cowboy caviar healthy?", "Yes — it is high in fibre and plant protein; watch the dressing and the chips you scoop it with."], ["How many calories in cowboy caviar?", "About 150–220 per ¾ cup, depending on the dressing and avocado."]],
  }),
  mk({
    slug: "hibachi-calories-calculator", cat: NC, title: "Hibachi Calorie Calculator",
    desc: "Count the calories in a hibachi dinner — fried rice, noodles, vegetables, steak, filet, chicken, shrimp, scallops, salmon or lobster, yum yum and ginger sauce, soup and salad.",
    meta: "Hibachi Calories Calculator — Steakhouse Dinner Calories",
    inputs: SLOTS(E.HIBACHI, HIBACHI_D), results: MACROS, fn: E.hibachi, ex: exSlots(HIBACHI_D),
    exText: (o) => `Example: hibachi steak with 1½ cups of fried rice, some noodles, vegetables and 2 tbsp of yum yum sauce is about ${o.calories} calories and ${fmt(o.sodium, 0)} mg of sodium.`,
    how: BUILD_HOW("hibachi dinner") + "\n\nAsk for steamed rice, extra vegetables and less butter, and keep yum yum sauce on the side, to save several hundred calories.",
    assume: "Typical Japanese-steakhouse portions, cooked with butter, oil and soy sauce. A full hibachi dinner with fried rice and sauces is commonly 1,200–1,800 calories.",
    faq: [["How many calories in a hibachi dinner?", "Usually 1,200–1,800 calories with fried rice and sauce."], ["How many calories in yum yum sauce?", "About 160 calories per 2 tablespoons."]],
  }),
  mk({
    slug: "bibimbap-nutrition-calculator", cat: NC, title: "Bibimbap Nutrition Calculator",
    desc: "Build a bibimbap bowl and see its calories and macros — white or multigrain rice, bulgogi, spicy pork, chicken or tofu, fried egg, namul vegetables, kimchi, gochujang and sesame oil.",
    meta: "Bibimbap Nutrition Calculator — Calories in Korean Rice Bowl",
    inputs: SLOTS(E.BIBIMBAP, BIBIMBAP_D), results: MACROS, fn: E.bibimbap, ex: exSlots(BIBIMBAP_D),
    exText: (o) => `Example: beef bibimbap with a cup of rice, a fried egg, four namul vegetables, gochujang and sesame oil comes to about ${o.calories} calories and ${o.protein} g protein.`,
    how: BUILD_HOW("bibimbap") + "\n\nDolsot (hot stone) bibimbap often uses more sesame oil for the crispy rice crust — add a teaspoon or two.",
    assume: "Typical Korean home and restaurant portions; namul are lightly dressed with sesame oil and salt. Restaurant bowls are often 600–800 calories.",
    faq: [["How many calories in bibimbap?", "Usually 500–800 calories per bowl."], ["Is bibimbap healthy?", "It is a balanced bowl of rice, vegetables, protein and egg; the gochujang adds sugar and sodium."]],
  }),
  mk({
    slug: "mexican-food-nutrition-calculator", cat: NC, title: "Mexican Food Nutrition Calculator (Tacos, Enchiladas & More)",
    desc: "Count the calories in a Mexican meal — tacos (crunchy, soft, street, fish), enchiladas, quesadillas, burritos, tamales, fajitas, nachos, chips and salsa, guacamole, queso, rice and beans, churros and margaritas.",
    meta: "Mexican Food Nutrition Calculator — Taco & Enchilada Calories",
    inputs: SLOTS(E.MEXICAN, MEXICAN_D, "Pieces / servings"), results: MACROS, fn: E.mexican, ex: exSlots(MEXICAN_D),
    exText: (o) => `Example: three crunchy beef tacos with an ounce of chips, salsa, refried beans and Mexican rice add up to about ${o.calories} calories.`,
    how: "Enter how many of each dish or side you had. Restaurant baskets of chips are often 4–6 oz (500–800 calories) before the meal arrives.",
    assume: "Typical US Mexican-restaurant and fast-food values per item. Corn-tortilla street tacos and grilled fajita fillings are lighter than fried, cheese-heavy dishes.",
    faq: [["How many calories in a taco?", "About 150–230 depending on the shell and filling."], ["What is the healthiest thing at a Mexican restaurant?", "Grilled chicken or fish tacos on corn tortillas, fajitas with fewer tortillas, salsa and beans."]],
  }),
  mk({
    slug: "rice-calorie-calculator", cat: NC, title: "Rice Calorie Calculator (Cooked & Uncooked)",
    desc: "Find the calories, carbs, protein and fiber in white, jasmine, basmati, brown, wild, sushi or fried rice — by cooked cups, cooked grams or uncooked cups.",
    meta: "Rice Calorie Calculator — Calories in a Cup of Rice",
    inputs: [dropdown("rice", "Rice Type", opts(E.RICES.map((x) => x[0])), 0), dropdown("mode", "Measure By", opts(["Cooked cups", "Cooked grams", "Uncooked (dry) cups"]), 0), num("amount", "Amount", 1, 10000, 0.25)],
    results: [["calories", "Calories", "n"], ["carbs", "Carbs (g)", "n"], ["protein", "Protein (g)", "n"], ["fat", "Fat (g)", "n"], ["fiber", "Fiber (g)", "n"], ["sodiumMg", "Sodium (mg)", "n"], ["cookedGrams", "Cooked Weight (g)", "n"], ["cookedCups", "Cooked Cups", "n"]],
    fn: E.riceCalories, ex: { rice: 0, mode: 0, amount: 1 },
    exText: (o) => `Example: a cup of cooked white rice (${o.cookedGrams} g) has ${o.calories} calories and ${o.carbs} g of carbs.`,
    how: "Choose the rice and how you are measuring it. Uncooked rice roughly triples in weight when cooked, so 1 cup dry makes about 3 cups cooked.",
    assume: "USDA FoodData Central per 100 g cooked (white 130 kcal, brown 123, basmati 121, wild 101). Cup weights: white 158 g, brown 195 g. Dry cup ≈ 185 g. Sushi rice includes vinegar seasoning; fried rice includes oil and egg.",
    faq: [["How many calories in a cup of rice?", "About 205 for cooked white rice and about 240 for cooked brown rice."], ["Is brown rice lower in calories than white rice?", "About the same per gram, but it has 3–4 times the fiber."]],
  }),
  mk({
    slug: "soup-calorie-calculator", cat: NC, title: "Soup Calorie Calculator",
    desc: "Find the calories, protein, carbs, fat and sodium in a cup or bowl of soup — chicken noodle, tomato, broccoli cheddar, clam chowder, minestrone, lentil, chili, French onion, pho, ramen and more — with crackers or a bread bowl.",
    meta: "Soup Calorie Calculator — Calories per Cup or Bowl of Soup",
    inputs: [dropdown("soup", "Soup", opts(E.SOUP.map((x) => x[0])), 5), dropdown("size", "Portion", opts(["Cup (8 oz)", "Bowl (12 oz)", "Large bowl (16 oz)"]), 1), num("servings", "Number of Portions", 1, 20, 0.5), dropdown("extra", "Extra", opts(E.SOUP_EXTRAS.map((x) => x[0])), 0), num("extraQty", "Extra Servings", 1, 10, 0.5)],
    results: [["calories", "Calories", "n"], ["protein", "Protein (g)", "n"], ["carbs", "Carbs (g)", "n"], ["fat", "Fat (g)", "n"], ["fiber", "Fiber (g)", "n"], ["sodium", "Sodium (mg)", "n"], ["sodiumDvPercent", "Sodium % Daily Value", "n"]],
    fn: E.soup, ex: { soup: 5, size: 1, servings: 1, extra: 0, extraQty: 1 },
    exText: (o) => `Example: a 12 oz bowl of broccoli cheddar soup is about ${o.calories} calories with ${fmt(o.sodium, 0)} mg of sodium — ${o.sodiumDvPercent}% of a day's limit. In a bread bowl it more than doubles.`,
    how: "Choose the soup and portion. Pho, ramen and instant ramen are priced as a whole bowl or package. Broth-based soups are low in calories but often very high in sodium; cream and cheese soups are higher in fat.",
    assume: "Typical USDA and restaurant values per 8 oz cup, scaled to the portion. Canned 'condensed' soups are shown as prepared. Sodium varies hugely by brand — look for 'low sodium' versions.",
    faq: [["How many calories in a bowl of soup?", "About 100–200 for broth soups and 300–450 for creamy soups per 12 oz bowl."], ["How many calories in a bread bowl?", "About 550–600 for the bread alone."]],
  }),
  mk({
    slug: "aubergine-nutrition-calculator", cat: NC, title: "Aubergine (Eggplant) Nutrition Calculator",
    desc: "Find the calories, fiber, carbs and potassium in aubergine (eggplant) — by size or weight — and how much the oil adds when you roast or fry it.",
    meta: "Aubergine Nutrition Calculator — Eggplant Calories Raw, Roasted, Fried",
    inputs: [dropdown("mode", "Measure By", opts(["Whole aubergines", "Grams"]), 0), dropdown("size", "Size", opts(E.EGGPLANT_SIZES.map(([n]) => n)), 1), num("count", "How Many", 1, 50, 0.25), num("grams", "Grams (if measuring by grams)", 200, 10000, 1), dropdown("method", "How It Is Cooked", opts(["Raw", "Grilled / steamed (no oil)", "Roasted with oil", "Pan- or deep-fried"]), 2), num("oilTbsp", "Oil Used (tbsp, roasting)", 2, 20, 0.5)],
    results: [["calories", "Calories", "n"], ["caloriesFromOil", "Calories From Oil", "n"], ["fiber", "Fiber (g)", "n"], ["carbs", "Carbs (g)", "n"], ["fat", "Fat (g)", "n"], ["protein", "Protein (g)", "n"], ["potassiumMg", "Potassium (mg)", "n"], ["grams", "Edible Weight (g)", "n"]],
    fn: E.aubergine, ex: { mode: 0, size: 1, count: 1, grams: 200, method: 2, oilTbsp: 2 },
    exText: (o) => `Example: a medium aubergine roasted with 2 tablespoons of oil has about ${o.calories} calories — ${o.caloriesFromOil} of them from the oil — plus ${o.fiber} g of fiber.`,
    how: "Choose the size or weigh it, and how you cook it. Aubergine soaks up oil like a sponge: salting it first, brushing instead of pouring oil, or air-frying keeps the calories down.",
    assume: "USDA FoodData Central raw: 25 kcal, 5.9 g carbs, 3 g fiber, 229 mg potassium per 100 g; about 8% is trimmed. Frying absorbs roughly 15 g of oil per 100 g of aubergine.",
    faq: [["How many calories in an aubergine?", "About 100–115 for a whole medium aubergine, before oil."], ["Why is fried eggplant so high in calories?", "Its spongy flesh absorbs a lot of oil — often more than doubling the calories."]],
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
