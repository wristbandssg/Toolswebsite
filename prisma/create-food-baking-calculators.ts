// One-time (but safe to re-run) batch setup script: creates 24 calculators — 14 in
// Food & Drink Calculators > Baking & Recipe Calculators and 10 in Party & Event Food Calculators.
// Formulas live in src/lib/calc-engine-food-baking.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-baking-calculators.ts
// or
//   npm run db:create-food-baking-calculators

import * as E from "../src/lib/calc-engine-food-baking";

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

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const opts = (labels: string[]) => labels.map((l, i) => [l, i] as [string, number]);
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0) => numberField(key, label, { default: def, max, step, min });
const pct = (key: string, label: string, def: number, max = 100, step = 0.1) => percentField(key, label, { default: def, max, step });
const cur = (key: string, label: string, def: number, max = 100000, step = 0.01) => currencyField(key, label, { default: def, max, step });
const FMT = { c: "currency", n: "number", p: "percentage", d: "date" } as const;
type Line = [key: string, label: string, fmt: keyof typeof FMT];

const BK = "baking-recipe-calculators";
const PF = "party-event-food-calculators";
const NOTES: Record<string, string> = {
  [BK]: "Results are kitchen estimates — weigh ingredients where you can, since flour and sugar pack differently by brand and by how you fill the cup.",
  [PF]: "Quantities are planning estimates based on common catering portions — buy about 10% extra for big eaters, and less if you are serving many other dishes.",
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

const TEMP = dropdown("tempUnit", "Temperature Unit", opts(["°F", "°C"]), 0);
const GUESTS = [num("adults", "Adults", 20, 10000, 1), num("kids", "Children (under 12)", 0, 10000, 1), dropdown("appetite", "Appetite", opts(["Light", "Average", "Hearty"]), 1)];
const SHAPES = opts(["Round (diameter)", "Square (side)", "Rectangle (length × width)"]);

const TOOLS: ToolDef[] = [
  mk({
    slug: "recipe-calculator", cat: BK, title: "Recipe Scaler Calculator (Resize Any Recipe)",
    desc: "Scale a recipe up or down — by servings, by pan size (round, square or rectangular) or by a simple multiplier — and get the new amount of each ingredient and eggs.",
    meta: "Recipe Calculator — Scale a Recipe by Servings or Pan Size",
    inputs: [dropdown("mode", "Scale By", opts(["Servings", "Pan size", "Multiplier"]), 0), num("originalServings", "Recipe Serves", 4, 1000, 1), num("newServings", "You Want to Serve", 10, 10000, 1), num("multiplier", "Multiplier (multiplier mode)", 2, 100, 0.25),
      dropdown("originalShape", "Recipe Pan Shape", SHAPES, 0), num("originalSize", "Recipe Pan Size (in)", 8, 30, 0.5), num("originalSize2", "Recipe Pan Width (rectangles, in)", 8, 30, 0.5), dropdown("newShape", "Your Pan Shape", SHAPES, 2), num("newSize", "Your Pan Size (in)", 13, 30, 0.5), num("newSize2", "Your Pan Width (rectangles, in)", 9, 30, 0.5),
      num("ing1", "Ingredient 1 Amount", 2, 100000, 0.01), num("ing2", "Ingredient 2 Amount", 1, 100000, 0.01), num("ing3", "Ingredient 3 Amount", 0.5, 100000, 0.01), num("ing4", "Ingredient 4 Amount", 0.25, 100000, 0.01), num("eggs", "Eggs in the Recipe", 2, 100, 1)],
    results: [["scaleFactor", "Scale Factor", "n"], ["ingredient1", "Ingredient 1 (new amount)", "n"], ["ingredient2", "Ingredient 2 (new amount)", "n"], ["ingredient3", "Ingredient 3 (new amount)", "n"], ["ingredient4", "Ingredient 4 (new amount)", "n"], ["eggs", "Eggs (rounded)", "n"]],
    fn: E.recipeScale, ex: { mode: 0, originalServings: 4, newServings: 10, multiplier: 2, originalShape: 0, originalSize: 8, originalSize2: 8, newShape: 2, newSize: 13, newSize2: 9, ing1: 2, ing2: 1, ing3: 0.5, ing4: 0.25, eggs: 2 },
    exText: (o) => `Example: scaling a 4-serving recipe to 10 servings multiplies everything by ${o.scaleFactor} — 2 cups becomes ${o.ingredient1} cups, and 2 eggs become ${o.eggs}.`,
    how: "Choose how to scale, then enter your ingredient amounts in whatever units the recipe uses — the scaled amounts are in the same units.\n\nWhen changing pan size, keep the batter depth similar and check for doneness early; a larger, shallower pan bakes faster.",
    assume: "Factor = new servings ÷ original servings, or new pan area ÷ original pan area (round = π r²). Spices, salt and leavening often need a little less than straight scaling when you more than double a recipe.",
    faq: [["How do I convert an 8-inch round recipe to a 9 × 13 pan?", "A 9 × 13 pan has about 2.3 times the area, so multiply the recipe by about 2.3."], ["How do I halve a recipe with 3 eggs?", "Use 1 egg plus half of a beaten second egg (about 2 tablespoons)."]],
  }),
  mk({
    slug: "sourdough-hydration-calculator", cat: BK, title: "Sourdough Hydration Calculator (Including Starter)",
    desc: "Find the true hydration of your sourdough — counting the flour and water in your starter — plus inoculation, salt percentage and the water needed to hit a target hydration.",
    meta: "Sourdough Hydration Calculator — True Hydration With Starter",
    inputs: [num("flour", "Flour (g)", 500, 100000, 1), num("water", "Water (g)", 350, 100000, 1), num("starter", "Starter / Levain (g)", 100, 100000, 1), pct("starterHydration", "Starter Hydration", 100, 300, 5), num("salt", "Salt (g)", 10, 10000, 0.5), pct("targetHydration", "Target Hydration (optional)", 75, 120, 1)],
    results: [["hydration", "True Dough Hydration (%)", "n"], ["totalFlour", "Total Flour Incl. Starter (g)", "n"], ["totalWater", "Total Water Incl. Starter (g)", "n"], ["inoculation", "Starter as % of Flour", "n"], ["saltPercent", "Salt as % of Total Flour", "n"], ["waterForTarget", "Water to Add for Your Target (g)", "n"], ["totalDough", "Total Dough Weight (g)", "n"]],
    fn: E.sourdoughHydration, ex: { flour: 500, water: 350, starter: 100, starterHydration: 100, salt: 10, targetHydration: 75 },
    exText: (o) => `Example: 500 g flour, 350 g water and 100 g of 100% starter is really ${o.hydration}% hydration. To reach 75% you would use ${fmt(o.waterForTarget, 0)} g of water.`,
    how: "Enter your recipe in grams. A 100% starter is equal weights of flour and water. Most beginners do well at 65–72% hydration; open-crumb loaves are 75–85%.\n\nWhole-grain flours absorb more water, so they feel stiffer at the same hydration.",
    assume: "Starter flour = starter ÷ (1 + h); starter water = starter × h ÷ (1 + h). Hydration = total water ÷ total flour. Salt is usually 1.8–2.2% of total flour.",
    faq: [["Does starter count toward hydration?", "Yes — its flour and water are part of the dough, so the true hydration is higher than water ÷ flour alone."], ["What is a good sourdough hydration?", "70–75% is a forgiving middle ground for an open but manageable loaf."]],
  }),
  mk({
    slug: "pizza-dough-hydration-calculator", cat: BK, title: "Pizza Dough Calculator (Hydration, Salt & Yeast)",
    desc: "Make pizza dough for any number of dough balls — flour, water, salt, yeast, oil and sugar in grams — from ball weight and hydration, for Neapolitan, New York or pan pizza.",
    meta: "Pizza Dough Hydration Calculator — Grams for Any Number of Balls",
    inputs: [num("balls", "Number of Dough Balls", 4, 500, 1, 1), num("ballWeight", "Dough Ball Weight (g)", 250, 2000, 5, 50), pct("hydration", "Hydration", 65, 100, 0.5), pct("saltPercent", "Salt", 2.8, 5, 0.1), dropdown("yeastType", "Yeast Type", opts(E.YEAST.map(([n]) => n)), 0), pct("yeastPercent", "Yeast (as instant dry, % of flour)", 0.3, 3, 0.05), pct("oilPercent", "Oil", 0, 10, 0.5), pct("sugarPercent", "Sugar", 0, 10, 0.5), pct("waste", "Extra for Dough Left in the Bowl", 2, 10, 0.5)],
    results: [["flourGrams", "Flour (g)", "n"], ["waterGrams", "Water (g)", "n"], ["saltGrams", "Salt (g)", "n"], ["yeastGrams", "Yeast (g, your type)", "n"], ["oilGrams", "Oil (g)", "n"], ["sugarGrams", "Sugar (g)", "n"], ["totalDoughGrams", "Total Dough (g)", "n"], ["flourCups", "Flour (cups, approx.)", "n"]],
    fn: E.pizzaDough, ex: { balls: 4, ballWeight: 250, hydration: 65, saltPercent: 2.8, yeastType: 0, yeastPercent: 0.3, oilPercent: 0, sugarPercent: 0, waste: 2 },
    exText: (o) => `Example: four 250 g Neapolitan balls at 65% hydration need ${fmt(o.flourGrams, 0)} g flour, ${fmt(o.waterGrams, 0)} g water, ${o.saltGrams} g salt and ${o.yeastGrams} g instant yeast.`,
    how: "Pick your style: Neapolitan 250 g balls (10–12 in) at 60–65% with no oil or sugar; New York 280–350 g at 62–65% with 1–2% oil and sugar; pan or Detroit 70–75%.\n\nFor a 24–72 hour cold ferment use 0.1–0.3% instant yeast; for same-day dough, 0.5–1%.",
    assume: "Flour = total dough ÷ (1 + hydration + salt + yeast + oil + sugar). Active dry yeast is 1.25× and fresh yeast 3× the instant dry amount. Bread flour ≈ 127 g per cup.",
    faq: [["What hydration is best for pizza dough?", "60–65% for Neapolitan in a very hot oven, 62–65% for New York style and 70%+ for pan pizza."], ["How much dough for a 12-inch pizza?", "About 250–280 g for a thin crust, 350 g for a thicker one."]],
  }),
  mk({
    slug: "cooking-calculator", cat: BK, title: "Cooking Measurement Converter (Cups to Grams & More)",
    desc: "Convert cooking and baking measurements — cups, tablespoons, teaspoons, fluid ounces, milliliters, grams, ounces and pounds — for flour, sugar, butter, milk, honey, rice and more.",
    meta: "Cooking Calculator — Convert Cups, Grams, Tbsp & Ounces",
    inputs: [num("amount", "Amount", 1, 100000, 0.01), dropdown("fromUnit", "From", opts(E.UNITS.map(([n]) => n)), 0), dropdown("toUnit", "To", opts(E.UNITS.map(([n]) => n)), 6), dropdown("ingredient", "Ingredient", opts(E.DENSITIES.map(([n]) => n)), 2)],
    results: [["result", "Converted Amount", "n"], ["grams", "Grams", "n"], ["ounces", "Ounces (weight)", "n"], ["cups", "Cups", "n"], ["tablespoons", "Tablespoons", "n"], ["milliliters", "Milliliters", "n"]],
    fn: E.cookingConvert, ex: { amount: 1, fromUnit: 0, toUnit: 6, ingredient: 2 },
    exText: (o) => `Example: 1 cup of all-purpose flour weighs about ${o.result} g, while a cup of granulated sugar is about 200 g.`,
    how: "Choose the ingredient — it matters whenever you convert between volume (cups, spoons) and weight (grams, ounces). Volume-to-volume conversions are the same for every ingredient.\n\nFor flour, the figure assumes spoon-and-level; scooping straight from the bag packs in up to 20% more.",
    assume: "US customary cup = 236.6 mL = 16 tbsp = 48 tsp. Densities (g/cup): flour 120, bread flour 127, sugar 200, brown sugar 213, powdered sugar 120, butter 227, oil 218, milk 245, honey 340, oats 90, cocoa 85, rice 185, salt 288.",
    faq: [["How many grams in a cup of flour?", "About 120 g of all-purpose flour, spooned and levelled."], ["How many tablespoons in a cup?", "16 tablespoons, or 48 teaspoons."]],
  }),
  mk({
    slug: "serving-size-calculator", cat: BK, title: "Serving Size Calculator (Portion Weight per Serving)",
    desc: "Divide a finished recipe into equal portions — the weight of each serving, or how many servings a portion size gives — with calories and protein per serving.",
    meta: "Serving Size Calculator — Portion Size and Calories per Serving",
    inputs: [num("totalWeight", "Total Weight of the Finished Dish (g)", 1800, 1000000, 1), dropdown("mode", "Work Out", opts(["Weight per serving (from number of servings)", "Number of servings (from portion size)"]), 0), num("servings", "Number of Servings", 6, 10000, 1, 1), num("portion", "Portion Size (g)", 300, 100000, 1), num("totalCalories", "Total Calories in the Recipe (optional)", 2400, 1000000, 1), num("totalProtein", "Total Protein in the Recipe (g, optional)", 150, 100000, 1)],
    results: [["servingWeight", "Weight per Serving (g)", "n"], ["servings", "Number of Servings", "n"], ["caloriesPerServing", "Calories per Serving", "n"], ["proteinPerServing", "Protein per Serving (g)", "n"], ["caloriesPer100", "Calories per 100 g", "n"]],
    fn: E.servingSize, ex: { totalWeight: 1800, mode: 0, servings: 6, portion: 300, totalCalories: 2400, totalProtein: 150 },
    exText: (o) => `Example: a 1,800 g casserole split six ways is ${o.servingWeight} g per serving — ${o.caloriesPerServing} calories and ${o.proteinPerServing} g protein each.`,
    how: "Weigh the empty pot, then the pot with the cooked food, and subtract to get the total weight. Divide into servings, or enter a portion size to see how many you get — handy for meal prep and calorie tracking.",
    assume: "Serving weight = total ÷ servings. Nutrition per serving = recipe totals ÷ servings (add up the totals from your ingredient labels or a recipe nutrition calculator).",
    faq: [["How do I calculate serving size for a recipe?", "Weigh the whole cooked dish and divide by the number of servings."], ["What is a normal portion size?", "About 3–4 oz of cooked meat, ½ cup of grains or pasta and 1 cup of vegetables."]],
  }),
  mk({
    slug: "bakers-percentage-calculator", cat: BK, title: "Baker's Percentage Calculator",
    desc: "Turn baker's percentages into grams — water, salt, yeast and two more ingredients — from a flour weight, or work backwards from the total dough weight you need.",
    meta: "Baker's Percentage Calculator — Grams From Percentages",
    inputs: [dropdown("mode", "Start From", opts(["Flour weight", "Total dough weight"]), 0), num("flour", "Flour (g)", 1000, 1000000, 1), num("totalDough", "Total Dough Wanted (g)", 1800, 1000000, 1), pct("waterPct", "Water", 70, 150, 0.5), pct("saltPct", "Salt", 2, 10, 0.1), pct("yeastPct", "Yeast", 1, 10, 0.1), pct("other1Pct", "Other 1 (e.g. sugar)", 0, 100, 0.5), pct("other2Pct", "Other 2 (e.g. butter / oil)", 0, 100, 0.5)],
    results: [["flourGrams", "Flour (g)", "n"], ["waterGrams", "Water (g)", "n"], ["saltGrams", "Salt (g)", "n"], ["yeastGrams", "Yeast (g)", "n"], ["other1Grams", "Other 1 (g)", "n"], ["other2Grams", "Other 2 (g)", "n"], ["totalDoughGrams", "Total Dough (g)", "n"], ["totalPercent", "Total Formula (%)", "n"]],
    fn: E.bakersPercentage, ex: { mode: 0, flour: 1000, totalDough: 1800, waterPct: 70, saltPct: 2, yeastPct: 1, other1Pct: 0, other2Pct: 0 },
    exText: (o) => `Example: 1,000 g of flour at 70% water, 2% salt and 1% yeast needs ${o.waterGrams} g water, ${o.saltGrams} g salt and ${o.yeastGrams} g yeast — ${o.totalDoughGrams} g of dough.`,
    how: "In baker's percentages, flour is always 100% and every other ingredient is a percentage of the flour weight. To make a set amount of dough (for example 3 loaves of 600 g), choose 'total dough weight'.",
    assume: "Ingredient = flour × percentage. Flour from total = total ÷ (sum of all percentages). If you use several flours, their combined weight is the 100%.",
    faq: [["What is baker's percentage?", "A way of writing recipes where each ingredient is a percentage of the flour's weight."], ["Why do baker's percentages add up to more than 100%?", "Because flour alone is 100%; water, salt and the rest are added on top."]],
  }),
  mk({
    slug: "fresh-to-dried-herb-conversion-calculator", cat: BK, title: "Fresh to Dried Herb Conversion Calculator",
    desc: "Convert fresh herbs to dried (and back) — leafy herbs, ground dried herbs and fresh ginger — in teaspoons, tablespoons and cups.",
    meta: "Fresh to Dried Herb Conversion Calculator — Teaspoons & Tablespoons",
    inputs: [dropdown("herb", "Herb Type", opts(E.HERBS.map(([n]) => n)), 0), dropdown("direction", "Convert", opts(["Fresh → dried", "Dried → fresh"]), 0), num("amount", "Amount", 1, 1000, 0.25), dropdown("unit", "Unit", opts(["Teaspoons", "Tablespoons", "Cups"]), 1)],
    results: [["resultTeaspoons", "Converted Amount (tsp)", "n"], ["resultTablespoons", "Converted Amount (tbsp)", "n"], ["resultCups", "Converted Amount (cups)", "n"], ["ratio", "Ratio (fresh : dried)", "n"], ["inputTeaspoons", "Your Amount (tsp)", "n"]],
    fn: E.herbConvert, ex: { herb: 0, direction: 0, amount: 1, unit: 1 },
    exText: (o) => `Example: 1 tablespoon of fresh basil equals about ${o.resultTeaspoons} teaspoon of dried basil.`,
    how: "Choose the herb form and direction. Add dried herbs early in cooking so they rehydrate; add fresh tender herbs (basil, parsley, cilantro) near the end.",
    assume: "Leafy herbs 3 : 1 (1 tbsp fresh = 1 tsp dried); ground herbs 6 : 1 (1 tbsp fresh = ½ tsp ground); fresh ginger to ground ginger 12 : 1 (1 tbsp fresh = ¼ tsp ground). Old dried herbs lose strength — use a little more if they are over a year old.",
    faq: [["How much dried herb equals fresh?", "Use one-third as much dried: 1 teaspoon dried for 1 tablespoon fresh."], ["Can I substitute dried basil for fresh?", "Yes in cooked sauces; for pesto or garnishes, fresh is much better."]],
  }),
  mk({
    slug: "sourdough-feeding-ratio-calculator", cat: BK, title: "Sourdough Starter Feeding Ratio Calculator",
    desc: "Feed your sourdough starter at 1:1:1, 1:2:2, 1:5:5 or any ratio — grams of starter, flour and water for the amount you need — and estimate when it will peak at your kitchen temperature.",
    meta: "Sourdough Feeding Ratio Calculator — Starter, Flour & Water",
    inputs: [num("starterPart", "Starter Part (ratio)", 1, 20, 0.5, 0.5), num("flourPart", "Flour Part (ratio)", 2, 50, 0.5), num("waterPart", "Water Part (ratio)", 2, 50, 0.5), num("totalWanted", "Total Starter You Want (g)", 150, 10000, 5), TEMP, num("temp", "Kitchen Temperature", 75, 100, 0.5), num("currentStarter", "Starter You Have Now (g, optional)", 0, 10000, 1)],
    results: [["starterGrams", "Starter to Keep (g)", "n"], ["flourGrams", "Flour to Add (g)", "n"], ["waterGrams", "Water to Add (g)", "n"], ["hydration", "Starter Hydration (%)", "n"], ["hoursToPeak", "Estimated Hours to Peak", "n"], ["discardIfKeeping", "Discard (g)", "n"]],
    fn: E.sourdoughFeeding, ex: { starterPart: 1, flourPart: 2, waterPart: 2, totalWanted: 150, tempUnit: 0, temp: 75, currentStarter: 100 },
    exText: (o) => `Example: for 150 g of starter at 1:2:2, keep ${o.starterGrams} g of starter and add ${o.flourGrams} g each of flour and water. At 75 °F it should peak in about ${o.hoursToPeak} hours.`,
    how: "Enter your ratio and the amount you need for the recipe plus a little to keep. Higher ratios (1:5:5, 1:10:10) slow the starter down — handy for feeding at night and baking in the morning.",
    assume: "Peak time is a rough guide: about 4 hours at 1:1:1 and 75 °F, longer at higher feeds, and roughly doubling for every 17 °F (9–10 °C) cooler. Flour type and starter strength change it a lot.",
    faq: [["What is the best sourdough feeding ratio?", "1:1:1 for a quick rise, 1:2:2 for a 6–8 hour schedule and 1:5:5 overnight."], ["How do I know my starter has peaked?", "It has doubled or more, has a domed top full of bubbles and is just starting to fall."]],
  }),
  mk({
    slug: "shortening-to-butter-conversion-calculator", cat: BK, title: "Shortening to Butter Conversion Calculator",
    desc: "Swap shortening for butter (or butter for shortening or oil) in baking — the equivalent amount by fat content and how much liquid to adjust for butter's water.",
    meta: "Shortening to Butter Conversion Calculator — Baking Substitution",
    inputs: [dropdown("swap", "Substitution", opts(E.FATS.map(([n]) => n)), 0), num("amount", "Amount in the Recipe", 1, 100000, 0.01), dropdown("unit", "Unit", opts(["Cups", "Grams"]), 0)],
    results: [["resultCups", "Use This Much (cups)", "n"], ["resultTablespoons", "Use This Much (tbsp)", "n"], ["resultGrams", "Use This Much (g)", "n"], ["reduceLiquidTbsp", "Reduce Recipe Liquid By (tbsp)", "n"], ["addLiquidTbsp", "Add Liquid (tbsp)", "n"], ["inputCups", "Recipe Amount (cups)", "n"]],
    fn: E.fatSwap, ex: { swap: 0, amount: 1, unit: 0 },
    exText: (o) => `Example: replace 1 cup of shortening with ${o.resultCups} cups (about ${fmt(o.resultTablespoons, 0)} tbsp) of butter and cut the liquid by about ${fmt(o.reduceLiquidTbsp, 1)} tbsp.`,
    how: "Butter is about 81% fat and 16% water, so the same fat takes a little more butter, and that water should come out of the recipe's milk or water. Cookies made with butter spread more and taste richer; shortening keeps them taller and softer.",
    assume: "Equivalents by fat: 1 cup shortening ≈ 1¼ cups butter, ⅞ cup oil; 1 cup butter ≈ ¾ cup oil. Shortening 191 g/cup, butter 227 g/cup, oil 218 g/cup. Many bakers simply swap 1 : 1 for small amounts.",
    faq: [["Can I use butter instead of shortening?", "Yes — use about 1 cup plus 2–4 tablespoons of butter per cup of shortening and reduce liquid slightly."], ["Can I substitute butter for shortening in pie crust?", "Yes; an all-butter crust is flakier and tastier but less tender and harder to handle."]],
  }),
  mk({
    slug: "high-altitude-baking-calculator", cat: BK, title: "High Altitude Baking Calculator",
    desc: "Adjust a sea-level recipe for baking at high altitude — baking powder or soda, sugar, liquid, flour, oven temperature and bake time — for 3,000 to 10,000+ feet.",
    meta: "High Altitude Baking Calculator — Adjust Recipes for Elevation",
    inputs: [dropdown("altUnit", "Altitude Unit", opts(["Feet", "Meters"]), 0), num("altitude", "Your Altitude", 5280, 15000, 10), num("bakingPowder", "Baking Powder or Soda (tsp)", 2, 100, 0.125), num("sugar", "Sugar (cups)", 1, 100, 0.125), num("liquid", "Liquid (cups)", 1, 100, 0.125), num("flour", "Flour (cups)", 2, 100, 0.125), num("ovenTemp", "Oven Temperature (°F)", 350, 500, 5), num("bakeMinutes", "Bake Time (minutes)", 30, 600, 1)],
    results: [["bakingPowderTsp", "Baking Powder / Soda (tsp)", "n"], ["sugarCups", "Sugar (cups)", "n"], ["liquidCups", "Liquid (cups)", "n"], ["flourCups", "Flour (cups)", "n"], ["ovenTempF", "Oven Temperature (°F)", "n"], ["bakeMinutes", "Check for Doneness At (minutes)", "n"], ["altitudeBand", "Altitude Band (0 under 3,000 ft · 1 3,000+ · 2 5,000+ · 3 7,000+)", "n"]],
    fn: E.highAltitude, ex: { altUnit: 0, altitude: 5280, bakingPowder: 2, sugar: 1, liquid: 1, flour: 2, ovenTemp: 350, bakeMinutes: 30 },
    exText: (o) => `Example: in Denver (5,280 ft) a cake with 2 tsp baking powder, 1 cup sugar and 1 cup milk becomes ${o.bakingPowderTsp} tsp, ${o.sugarCups} cups and ${o.liquidCups} cups, baked at ${o.ovenTempF} °F and checked at ${o.bakeMinutes} minutes.`,
    how: "Enter your altitude and the recipe's amounts. Lower air pressure makes batters rise faster and lose moisture, so you use less leavening and sugar, more liquid and flour, and a hotter, shorter bake.\n\nYeast breads need no chemical changes — just shorter rises.",
    assume: "Based on Colorado State University Extension guidance: 3,000 ft — leavening −⅛ tsp per tsp, sugar −½ tbsp/cup, liquid +1½ tbsp/cup; 5,000 ft — −⅛ to ¼ tsp, −1 tbsp, +3 tbsp; 7,000 ft — −¼ tsp, −2 tbsp, +3½ tbsp. Flour +1 tbsp/cup from 3,500 ft plus 1 per 1,500 ft; oven +15–25 °F; bake about 20% shorter.",
    faq: [["At what altitude do you need to adjust baking?", "Usually from about 3,000 feet; most recipes need changes above 3,500 feet."], ["Why do cakes fall at high altitude?", "Gas bubbles expand too fast and the structure sets too late, so the cake rises then collapses."]],
  }),
  mk({
    slug: "ice-cream-calculator", cat: BK, title: "Ice Cream Recipe Calculator (Fat, Sugar & Solids)",
    desc: "Balance a homemade ice cream base — milk, cream, sugar, egg yolks and milk powder — and see butterfat, sugar, milk solids and total solids percentages plus how much it makes.",
    meta: "Ice Cream Calculator — Balance Butterfat, Sugar & Solids",
    inputs: [num("milk", "Whole Milk (g)", 600, 100000, 1), num("cream", "Heavy Cream, 36% (g)", 400, 100000, 1), num("sugar", "Sugar (g)", 200, 100000, 1), num("yolks", "Egg Yolks", 6, 100, 1), num("milkPowder", "Skim Milk Powder (g)", 30, 10000, 1), pct("overrun", "Overrun (air churned in)", 25, 100, 1)],
    results: [["fatPercent", "Butterfat (%)", "n"], ["sugarPercent", "Sugar (%)", "n"], ["msnfPercent", "Milk Solids Non-Fat (%)", "n"], ["totalSolidsPercent", "Total Solids (%)", "n"], ["totalMixGrams", "Total Base (g)", "n"], ["quartsAfterChurning", "Ice Cream Yield (quarts)", "n"], ["servingsHalfCup", "½-Cup Servings", "n"]],
    fn: E.iceCream, ex: { milk: 600, cream: 400, sugar: 200, yolks: 6, milkPowder: 30, overrun: 25 },
    exText: (o) => `Example: 600 g milk, 400 g cream, 200 g sugar, 6 yolks and 30 g milk powder gives ${o.fatPercent}% butterfat and ${o.totalSolidsPercent}% total solids — about ${o.quartsAfterChurning} quarts.`,
    how: "Aim for 12–16% butterfat, 15–18% sugar, 9–12% milk solids non-fat and 36–42% total solids for smooth, scoopable ice cream. Too little solids makes it icy; too much fat feels greasy.\n\nCook custard bases to 170–175 °F and chill overnight before churning.",
    assume: "Whole milk 3.5% fat / 8.7% MSNF; heavy cream 36% / 5.5%; egg yolk ≈ 17 g with 32% fat and 50% solids; skim milk powder 96% MSNF. Base density ≈ 1.03 g/mL; home machines add 20–30% overrun.",
    faq: [["What fat percentage should ice cream be?", "US 'ice cream' must be at least 10% butterfat; premium is 14–16%."], ["Why is my homemade ice cream icy?", "Usually too little sugar or solids — add milk powder or a little more sugar."]],
  }),
  mk({
    slug: "ball-pectin-calculator", cat: BK, title: "Ball Pectin Calculator (Scale a Jam Recipe)",
    desc: "Scale the jam or jelly recipe printed on your Ball pectin package to the fruit you have — pectin, sugar, lemon juice and jars — and convert between Ball Classic tablespoons and boxes of other brands.",
    meta: "Ball Pectin Calculator — Scale Jam Pectin, Sugar & Jars",
    inputs: [num("recipeFruitCups", "Fruit in the Package Recipe (cups, prepared)", 6, 100, 0.25, 0.25), num("recipePectinTbsp", "Pectin in the Package Recipe (tbsp)", 4.5, 50, 0.25), num("recipeSugarCups", "Sugar in the Package Recipe (cups)", 3, 50, 0.25), num("recipeLemonTbsp", "Bottled Lemon Juice in the Recipe (tbsp)", 0, 20, 0.5), num("recipeJars", "Half-Pint Jars the Recipe Makes", 6, 50, 1), num("yourFruitCups", "Fruit You Have (cups, prepared)", 3, 100, 0.25)],
    results: [["pectinTbsp", "Pectin to Use (tbsp)", "n"], ["sugarCups", "Sugar (cups)", "n"], ["lemonJuiceTbsp", "Lemon Juice (tbsp)", "n"], ["halfPintJars", "Half-Pint Jars", "n"], ["batchesNeeded", "Separate Batches Needed (max 10 jars each)", "n"], ["boxesOfOtherBrand", "Equivalent Boxes of Other Brands", "n"], ["scaleFactor", "Scale Factor", "n"]],
    fn: E.pectin, ex: { recipeFruitCups: 6, recipePectinTbsp: 4.5, recipeSugarCups: 3, recipeLemonTbsp: 0, recipeJars: 6, yourFruitCups: 3 },
    exText: (o) => `Example: halving a 6-cup recipe that uses 4½ tbsp of pectin and 3 cups of sugar needs ${o.pectinTbsp} tbsp of pectin and ${o.sugarCups} cups of sugar for about ${o.halfPintJars} jars.`,
    how: "Copy the recipe for your fruit from the pectin package insert or Ball's website — amounts differ by fruit and by regular, low-sugar or no-sugar versions — then enter how much prepared fruit you have.\n\nDo not make more than 10 jars in one batch; the jam may not set. Process jars in a boiling-water canner for the time on the recipe, adjusted for altitude.",
    assume: "All amounts are scaled in proportion to the fruit. Ball packaging states 6 tablespoons of Ball Classic pectin equal one box of other brands. Do not reduce sugar in a regular-sugar recipe — use the low- or no-sugar version instead.",
    faq: [["How much Ball pectin equals one box of Sure-Jell?", "Ball says 6 tablespoons of its Classic pectin replaces one box of other brands."], ["Can I double a jam recipe?", "It is better to make separate batches — big batches often fail to set."]],
  }),
  mk({
    slug: "buttercream-icing-calculator", cat: BK, title: "Buttercream Frosting Calculator (How Much Icing)",
    desc: "Work out how much buttercream you need to fill, frost and decorate round, square or sheet cakes and cupcakes — in cups, with the butter, powdered sugar and milk to make it.",
    meta: "Buttercream Icing Calculator — How Much Frosting for a Cake",
    inputs: [dropdown("cake", "Cake Size", opts(E.CAKES.map(([n]) => n)), 1), num("cakes", "Number of These Cakes", 1, 100, 1), num("layers", "Layers per Cake", 2, 8, 1, 1), num("height", "Cake Height (in)", 4, 12, 0.5, 1), dropdown("frostSides", "Frost the Sides?", opts(["No (top and filling only)", "Yes"]), 1), num("thickness", "Frosting Thickness (in)", 0.25, 1, 0.05, 0.1), num("cupcakes", "Cupcakes", 0, 1000, 1), num("perCupcakeTbsp", "Frosting per Cupcake (tbsp; 2 flat, 3–4 piped swirl)", 2, 8, 0.5), pct("decorationPercent", "Extra for Piping & Decoration", 15, 100, 5)],
    results: [["frostingCups", "Buttercream Needed (cups)", "n"], ["butterCups", "Butter (cups)", "n"], ["butterGrams", "Butter (g)", "n"], ["powderedSugarCups", "Powdered Sugar (cups)", "n"], ["powderedSugarGrams", "Powdered Sugar (g)", "n"], ["milkTbsp", "Milk or Cream (tbsp)", "n"], ["batches4Cup", "4-Cup Batches", "n"]],
    fn: E.buttercream, ex: { cake: 1, cakes: 1, layers: 2, height: 4, frostSides: 1, thickness: 0.25, cupcakes: 0, perCupcakeTbsp: 2, decorationPercent: 15 },
    exText: (o) => `Example: an 8-inch two-layer cake, filled and frosted, needs about ${o.frostingCups} cups of buttercream — ${o.butterCups} cups of butter and ${o.powderedSugarCups} cups of powdered sugar.`,
    how: "Pick the pan size and layers, then add cupcakes if you are making both. Increase the extra percentage for borders, rosettes and lettering.\n\nOne batch of 1 cup butter, 4 cups powdered sugar and 2–3 tbsp milk makes about 4 cups of American buttercream.",
    assume: "Frosting volume = (top + sides + fillings) × thickness ÷ 14.44 cubic inches per cup — about 3½ cups for an 8-inch two-layer cake, matching Wilton's chart.",
    faq: [["How much frosting for a 9 × 13 cake?", "About 3–4 cups to fill and frost; 2 cups for the top only."], ["How much frosting for 24 cupcakes?", "About 3 cups for a flat spread or 5–6 cups for tall piped swirls."]],
  }),
  mk({
    slug: "dough-temp-calculator", cat: BK, title: "Desired Dough Temperature Calculator (Water Temperature)",
    desc: "Find the water temperature to hit your desired dough temperature, from room, flour and preferment temperatures and your mixer's friction factor.",
    meta: "Dough Temp Calculator — Water Temperature for Bread Dough",
    inputs: [TEMP, num("desiredTemp", "Desired Dough Temperature", 76, 100, 0.5), num("roomTemp", "Room Temperature", 72, 110, 0.5), num("flourTemp", "Flour Temperature", 70, 110, 0.5), dropdown("preferment", "Using a Preferment / Levain?", opts(["No", "Yes"]), 0), num("prefermentTemp", "Preferment Temperature", 72, 110, 0.5), num("friction", "Friction Factor (hand 0–5, stand mixer 20–28 °F)", 24, 40, 1)],
    results: [["waterTemp", "Water Temperature", "n"], ["waterTempF", "Water Temperature (°F)", "n"], ["waterTempC", "Water Temperature (°C)", "n"], ["needsIce", "Below 50 °F — Use Ice Water (1 = yes)", "n"], ["factorsUsed", "Temperature Factors Used", "n"]],
    fn: E.doughTemp, ex: { tempUnit: 0, desiredTemp: 76, roomTemp: 72, flourTemp: 70, preferment: 0, prefermentTemp: 72, friction: 24 },
    exText: (o) => `Example: for a 76 °F dough in a 72 °F kitchen with 70 °F flour and a stand mixer, use ${o.waterTempF} °F water.`,
    how: "Most breads ferment best at a dough temperature of 75–78 °F (24–26 °C). Measure your room and flour, choose your mixing method's friction factor, and use water at the temperature shown.\n\nTo find your own friction factor, mix a batch, measure the dough and subtract the other temperatures.",
    assume: "Water = desired × 3 − (room + flour + friction); with a preferment, × 4 and include its temperature. Friction factors are in Fahrenheit degrees (Celsius inputs are converted).",
    faq: [["What is desired dough temperature?", "The temperature the dough should be after mixing — usually about 76 °F (24–25 °C)."], ["What is the friction factor?", "The heat added by mixing: near 0 by hand, 20–28 °F in a stand mixer."]],
  }),
  mk({
    slug: "pizza-calculator", cat: PF, title: "Pizza Party Calculator (How Many Pizzas to Order)",
    desc: "Find how many pizzas to order for a party — by adults, kids, appetite and pizza size — with total slices, leftovers and cost per person.",
    meta: "Pizza Calculator — How Many Pizzas for a Party",
    inputs: [...GUESTS, dropdown("size", "Pizza Size", opts(E.PIZZAS.map(([n]) => n)), 2), cur("pricePerPizza", "Price per Pizza", 18, 200)],
    results: [["pizzas", "Pizzas to Order", "n"], ["slicesNeeded", "Slices Needed", "n"], ["totalSlices", "Total Slices", "n"], ["extraSlices", "Spare Slices", "n"], ["totalCost", "Total Cost", "c"], ["costPerPerson", "Cost per Person", "c"]],
    fn: E.pizzaParty, ex: { adults: 20, kids: 0, appetite: 1, size: 2, pricePerPizza: 18 },
    exText: (o) => `Example: 20 adults eat about ${o.slicesNeeded} slices — order ${o.pizzas} large pizzas for about ${usd(o.totalCost)}.`,
    how: "Enter your guests and choose a size. Plan on about 3 slices per adult and 2 per child, more for teens or if pizza is the only food.",
    assume: "Slices = adults × 3 + kids × 2, adjusted ±20–25% for appetite. Slice counts are typical chain cuts and vary by shop.",
    faq: [["How many pizzas for 20 people?", "About 8 large pizzas if pizza is the main food."], ["How many slices are in a large pizza?", "Usually 8 slices in a 14-inch large."]],
  }),
  mk({
    slug: "taco-bar-calculator", cat: PF, title: "Taco Bar Calculator (Food for a Taco Party)",
    desc: "Plan a taco bar for any crowd — pounds of meat, tortillas, cheese, lettuce, salsa, sour cream, avocados, rice and beans — from your guest count.",
    meta: "Taco Bar Calculator — How Much Taco Meat for a Crowd",
    inputs: [...GUESTS, num("tacosPerPerson", "Tacos per Adult", 3, 10, 0.5, 1)],
    results: [["tacos", "Tacos", "n"], ["meatLbRaw", "Ground Beef / Chicken (lb, raw)", "n"], ["tortillas", "Tortillas or Shells", "n"], ["cheeseCups", "Shredded Cheese (cups)", "n"], ["lettuceHeads", "Lettuce (heads)", "n"], ["salsaCups", "Salsa (cups)", "n"], ["sourCreamCups", "Sour Cream (cups)", "n"], ["avocados", "Avocados (for guacamole)", "n"], ["riceCupsDry", "Rice (cups, uncooked)", "n"], ["beansCans", "Beans (15 oz cans)", "n"]],
    fn: E.tacoBar, ex: { adults: 20, kids: 0, appetite: 1, tacosPerPerson: 3 },
    exText: (o) => `Example: a taco bar for 20 adults needs about ${o.meatLbRaw} lb of raw meat, ${o.tortillas} tortillas, ${o.cheeseCups} cups of cheese and ${o.avocados} avocados.`,
    how: "Enter guests and tacos per adult (2–3 with sides, 3–4 if tacos are the whole meal). Offering two proteins? Split the meat total between them.",
    assume: "About 2 oz raw meat, 2 tbsp cheese, 2 tbsp salsa and 1 tbsp sour cream per taco; one avocado per 8 tacos; ½ cup cooked rice per person; one can of beans per 5 people. Children count as about 0.6 of an adult.",
    faq: [["How much taco meat per person?", "About ¼–⅓ lb of raw meat per adult."], ["How many tortillas per person?", "Plan 3 per adult, plus 10% for breakage."]],
  }),
  mk({
    slug: "party-food-calculator", cat: PF, title: "Party Food Calculator (Side Dishes for a Crowd)",
    desc: "Work out how much food to make for a party or event — pasta salad, fruit, spaghetti, chili, mashed potatoes, potato salad, coleslaw, mac and cheese, beans, rice or soup — for 20, 50 or 100+ guests.",
    meta: "Party Food Calculator — How Much Food for 50 or 100 Guests",
    inputs: [...GUESTS, dropdown("dish", "Dish", opts(E.DISHES.map(([n]) => n)), 0), dropdown("role", "Served As", opts(["A main dish", "A side dish"]), 1)],
    results: [["totalAmount", "Total to Make (cups — or lb where shown)", "n"], ["quarts", "Quarts", "n"], ["gallons", "Gallons", "n"], ["halfPans", "Half Steam Pans", "n"], ["perGuest", "Per Guest", "n"], ["unitIsPounds", "Amount Is in Pounds (1 = yes)", "n"], ["sauceQuarts", "Pasta Sauce (quarts, spaghetti only)", "n"]],
    fn: E.partyFood, ex: { adults: 50, kids: 0, appetite: 1, dish: 0, role: 1 },
    exText: (o) => `Example: pasta salad as a side for 50 guests means about ${o.totalAmount} cups — ${o.gallons} gallons, or ${o.halfPans} half pans.`,
    how: "Choose the dish and whether it is a main or one of several sides. With 3–4 sides, the side amounts are right; with only one side, choose 'main' or increase appetite.\n\nSpaghetti, mashed potatoes, rice and salad greens are given in pounds to buy; the others in cups of finished food.",
    assume: "Per guest as a side / main: pasta or potato salad ½ / 1 cup; fruit ½ / ¾ cup; dry spaghetti 2 / 3 oz with ½ cup sauce; chili ¾ / 1½ cups; potatoes ⅓ / ½ lb raw; coleslaw ½ / ¾ cup; lettuce 1 / 2 oz; mac and cheese ½ / 1 cup; beans ½ / ¾ cup; dry rice 1½ / 2¾ oz; soup 1 / 1½ cups.",
    faq: [["How much pasta salad for 50 people?", "About 25 cups (1½ gallons) as a side dish."], ["How much spaghetti for 100 people?", "About 19 lb of dry pasta and 12–13 quarts of sauce as a main course."]],
  }),
  mk({
    slug: "low-country-boil-calculator", cat: PF, title: "Low Country Boil Calculator (Shrimp Boil for a Crowd)",
    desc: "Plan a Low Country or Frogmore shrimp boil — pounds of shrimp and sausage, ears of corn, red potatoes, onions, lemons, seasoning and pot size — for your guests, with a cost estimate.",
    meta: "Low Country Boil Calculator — Shrimp Boil per Person",
    inputs: [...GUESTS, cur("shrimpPrice", "Shrimp Price per lb", 12, 100), cur("sausagePrice", "Smoked Sausage Price per lb", 5, 100)],
    results: [["shrimpLb", "Shrimp, Shell-On (lb)", "n"], ["sausageLb", "Smoked Sausage (lb)", "n"], ["cornEars", "Ears of Corn", "n"], ["redPotatoesLb", "Small Red Potatoes (lb)", "n"], ["onions", "Onions", "n"], ["lemons", "Lemons", "n"], ["seasoningCups", "Old Bay–Style Seasoning (cups)", "n"], ["potQuarts", "Pot Size (quarts)", "n"], ["cost", "Estimated Cost", "c"]],
    fn: E.lowCountryBoil, ex: { adults: 20, kids: 0, appetite: 1, shrimpPrice: 12, sausagePrice: 5 },
    exText: (o) => `Example: a boil for 20 needs ${o.shrimpLb} lb of shrimp, ${o.sausageLb} lb of sausage, ${o.cornEars} ears of corn and ${o.redPotatoesLb} lb of potatoes, in about a ${o.potQuarts}-quart pot (or several smaller ones).`,
    how: "Add potatoes first (15–20 minutes), then sausage and corn (5–7 minutes), and shrimp last for only 2–3 minutes until pink. Drain and pour onto a paper-lined table.",
    assume: "Per adult: ½ lb shell-on shrimp, ¼ lb sausage, 1½ ears of corn, ⅓ lb potatoes; 1 onion and 1 lemon per 4 people. Cost includes corn at about $0.60 an ear and potatoes at $1.20 a lb.",
    faq: [["How much shrimp per person for a shrimp boil?", "About ½ lb of shell-on shrimp per adult."], ["What size pot for a low country boil?", "A 30-quart pot handles about 10–12 people; use two pots for bigger crowds."]],
  }),
  mk({
    slug: "jambalaya-calculator", cat: PF, title: "Jambalaya & Gumbo Calculator (For a Crowd)",
    desc: "Scale jambalaya or gumbo for a party — gallons to make, pounds of chicken and sausage, rice, stock, onions, peppers, roux and pot size — from your guest count.",
    meta: "Jambalaya Calculator — How Much Jambalaya or Gumbo per Person",
    inputs: [...GUESTS, dropdown("dish", "Dish", opts(["Jambalaya", "Gumbo (served over rice)"]), 0), dropdown("role", "Served As", opts(["Main dish (1½ cups)", "Side or one of several dishes (1 cup)"]), 0)],
    results: [["totalGallons", "Total to Make (gallons)", "n"], ["proteinLb", "Chicken + Sausage / Seafood (lb)", "n"], ["riceCupsDry", "Rice (cups, uncooked)", "n"], ["stockQuarts", "Stock (quarts)", "n"], ["onions", "Onions", "n"], ["bellPeppers", "Bell Peppers", "n"], ["roux", "Roux — Flour (cups; same amount of oil, gumbo only)", "n"], ["potQuarts", "Pot Size (quarts)", "n"]],
    fn: E.jambalaya, ex: { adults: 30, kids: 0, appetite: 1, dish: 0, role: 0 },
    exText: (o) => `Example: jambalaya as the main dish for 30 people is about ${o.totalGallons} gallons — ${o.proteinLb} lb of meat, ${o.riceCupsDry} cups of rice and ${o.stockQuarts} quarts of stock in a ${o.potQuarts}-quart pot.`,
    how: "Choose jambalaya or gumbo and how it is served. For gumbo, the rice is cooked separately and served under it.\n\nAdd celery equal to about half the onion amount for the 'holy trinity'.",
    assume: "Jambalaya: 1 cup dry rice makes about 6 cups finished; 2 cups stock per cup of rice; ¼ lb meat per 1½-cup serving. Gumbo: ¾ of the volume is stock, ½ cup cooked rice per serving, ¼ cup each flour and oil per quart for a dark roux.",
    faq: [["How much jambalaya per person?", "About 1½ cups as a main, or 1 cup with other dishes."], ["How much gumbo for 50 people?", "About 5 gallons as a main, plus 8–9 cups of uncooked rice."]],
  }),
  mk({
    slug: "bacon-calculator", cat: PF, title: "Bacon Calculator (How Much Bacon per Person)",
    desc: "Find how much bacon to buy for a brunch or breakfast crowd — slices, pounds, 12 oz and 1 lb packages, sheet pans and cost — for regular, thick or thin cut.",
    meta: "Bacon Calculator — How Much Bacon for a Crowd",
    inputs: [...GUESTS, num("slicesPerPerson", "Slices per Adult", 3, 12, 0.5, 1), dropdown("cut", "Bacon Cut", opts(E.BACON.map(([n]) => n)), 0), cur("pricePerLb", "Price per lb", 6.5, 50)],
    results: [["poundsToBuy", "Bacon to Buy (lb)", "n"], ["slices", "Slices", "n"], ["packages12oz", "12 oz Packages", "n"], ["packages16oz", "1 lb Packages", "n"], ["cookedWeightLb", "Cooked Weight (lb)", "n"], ["sheetPans", "Sheet Pans to Bake", "n"], ["cost", "Cost", "c"]],
    fn: E.bacon, ex: { adults: 20, kids: 0, appetite: 1, slicesPerPerson: 3, cut: 0, pricePerLb: 6.5 },
    exText: (o) => `Example: 3 slices each for 20 adults is ${o.slices} slices — about ${o.poundsToBuy} lb, or ${o.packages12oz} twelve-ounce packs, baked on ${o.sheetPans} sheet pans.`,
    how: "For a crowd, bake bacon on foil-lined sheet pans at 400 °F for 15–20 minutes — no flipping. Enter guests and how many slices each.",
    assume: "Regular bacon ≈ 16 slices per lb, thick ≈ 11, thin ≈ 22; about 14 slices fit a half-sheet pan; bacon cooks down to about a third of its raw weight.",
    faq: [["How much bacon per person?", "2–3 slices per adult at a brunch with other dishes."], ["How many slices are in a pound of bacon?", "About 16 regular slices or 10–12 thick-cut slices."]],
  }),
  mk({
    slug: "appetizers-per-person-calculator", cat: PF, title: "Appetizers per Person Calculator",
    desc: "Work out how many appetizers to serve per person — before dinner, at a cocktail party with no meal, or alongside a light meal — with total pieces, how many varieties and dips.",
    meta: "Appetizers per Person Calculator — How Many Pieces per Guest",
    inputs: [num("guests", "Guests", 30, 10000, 1), num("hours", "Event Length (hours)", 2, 12, 0.5, 1), dropdown("eventType", "Event Type", opts(["Before a dinner", "Cocktail party — appetizers are the meal", "Alongside a light meal"]), 1), dropdown("appetite", "Appetite", opts(["Light", "Average", "Hearty"]), 1), cur("costPerPiece", "Average Cost per Piece", 0.75, 50)],
    results: [["totalPieces", "Total Appetizer Pieces", "n"], ["piecesPerGuest", "Pieces per Guest", "n"], ["varieties", "Number of Varieties", "n"], ["piecesPerVariety", "Pieces per Variety", "n"], ["dipsCups", "Dips & Spreads (cups)", "n"], ["cost", "Estimated Cost", "c"]],
    fn: E.appetizers, ex: { guests: 30, hours: 2, eventType: 1, appetite: 1, costPerPiece: 0.75 },
    exText: (o) => `Example: a 2-hour cocktail party for 30 needs about ${o.totalPieces} pieces — ${o.varieties} kinds of about ${o.piecesPerVariety} each.`,
    how: "Choose the event type. When appetizers replace a meal, guests eat more, and more in the first hour. Mix hot and cold, and include something filling (meatballs, sliders, skewers).",
    assume: "Before dinner: about 5 pieces per guest. Cocktail party: 6 per guest in the first hour plus 4 per hour after. With a light meal: 3 plus 2 per hour. Varieties scale with the crowd (4 for 15 guests up to 10 for 60+); about ½ cup of dip per 4 guests.",
    faq: [["How many appetizers per person for a 3-hour party?", "About 14 pieces per guest if there is no meal."], ["How many appetizers before dinner?", "4–6 pieces per person so guests still have room for dinner."]],
  }),
  mk({
    slug: "burger-calculator", cat: PF, title: "Burger Calculator (Cookout Burgers for a Crowd)",
    desc: "Plan a cookout: how many burgers to grill, pounds of ground beef for your patty size, buns, cheese, lettuce, tomatoes, onions and cost.",
    meta: "Burger Calculator — How Much Ground Beef for a Cookout",
    inputs: [...GUESTS, dropdown("pattySize", "Patty Size (raw)", opts(["¼ lb", "⅓ lb", "½ lb"]), 0), cur("beefPrice", "Ground Beef Price per lb", 6, 50), cur("bunPrice", "Price per 8-Pack of Buns", 3.5, 50)],
    results: [["burgers", "Burgers to Make", "n"], ["groundBeefLb", "Ground Beef (lb)", "n"], ["bunPacks8", "8-Packs of Buns", "n"], ["cheeseSlices", "Cheese Slices", "n"], ["lettuceHeads", "Lettuce (heads)", "n"], ["tomatoes", "Tomatoes", "n"], ["onions", "Onions", "n"], ["cost", "Beef + Bun Cost", "c"]],
    fn: E.burgers, ex: { adults: 20, kids: 5, appetite: 1, pattySize: 0, beefPrice: 6, bunPrice: 3.5 },
    exText: (o) => `Example: 20 adults and 5 kids need about ${o.burgers} quarter-pound burgers — ${o.groundBeefLb} lb of ground beef and ${o.bunPacks8} packs of buns.`,
    how: "Plan about 1½ burgers per adult and 1 per child, fewer if you are also serving hot dogs or chicken. 80/20 ground beef makes the juiciest burgers.",
    assume: "Burgers = 1.5 per adult + 1 per child, adjusted for appetite. One lettuce head per 15 burgers, one tomato per 6, one onion per 10.",
    faq: [["How many burgers per person?", "About 1½ per adult at a cookout with sides."], ["How many burgers from a pound of beef?", "Four quarter-pound or three ⅓-lb patties."]],
  }),
  mk({
    slug: "sandwich-calculator", cat: PF, title: "Sandwich Calculator (Sandwiches for a Party or Lunch)",
    desc: "Plan sandwiches for a crowd — full sandwiches, party halves or sliders — with pounds of deli meat and cheese, loaves or rolls, lettuce, tomatoes and cost.",
    meta: "Sandwich Calculator — How Much Deli Meat for a Crowd",
    inputs: [...GUESTS, dropdown("style", "Sandwich Style", opts(["Full sandwiches (lunch)", "Party halves / tea sandwiches", "Sliders on small rolls"]), 0), cur("meatPrice", "Deli Meat Price per lb", 10, 100)],
    results: [["sandwiches", "Sandwiches / Pieces", "n"], ["meatLb", "Deli Meat (lb)", "n"], ["cheeseLb", "Sliced Cheese (lb)", "n"], ["breadLoaves", "Bread Loaves (party halves)", "n"], ["rollsOrBuns", "Rolls or Slider Buns", "n"], ["lettuceHeads", "Lettuce (heads)", "n"], ["tomatoes", "Tomatoes", "n"], ["cost", "Meat Cost", "c"]],
    fn: E.sandwiches, ex: { adults: 20, kids: 0, appetite: 1, style: 0, meatPrice: 10 },
    exText: (o) => `Example: a lunch for 20 needs about ${o.sandwiches} sandwiches — ${o.meatLb} lb of deli meat and ${o.cheeseLb} lb of cheese.`,
    how: "Choose full sandwiches for a lunch, halves for a party spread or sliders. With chips, salads and dessert, the default amounts are right.",
    assume: "Full sandwiches 1¼ per person with 3 oz meat; party halves 2 per person with 1¾ oz; sliders 3 per person with 1¼ oz. Cheese about a third of the meat weight; about 20 slices per loaf.",
    faq: [["How much deli meat per person?", "About 3–4 oz (¼ lb) for full sandwiches."], ["How many sandwiches for 50 people?", "About 60–65 full sandwiches, or 100 halves."]],
  }),
  mk({
    slug: "popcorn-calculator", cat: PF, title: "Popcorn Calculator (Popcorn for a Party or Movie Night)",
    desc: "Find how much popcorn to make — cups of kernels, pounds, microwave bags, oil, butter and salt — for your guests, with calories.",
    meta: "Popcorn Calculator — How Many Kernels for a Crowd",
    inputs: [num("guests", "Guests", 20, 10000, 1), num("cupsPerPerson", "Popped Cups per Person", 4, 20, 0.5), dropdown("style", "Style", opts(["Air-popped", "Oil-popped"]), 1)],
    results: [["kernelsCups", "Unpopped Kernels (cups)", "n"], ["kernelsLb", "Unpopped Kernels (lb)", "n"], ["poppedCups", "Popped Popcorn (cups)", "n"], ["microwaveBags", "Or Microwave Bags", "n"], ["oilTbsp", "Oil for Popping (tbsp)", "n"], ["butterTbsp", "Melted Butter (tbsp)", "n"], ["saltTsp", "Salt (tsp)", "n"], ["calories", "Total Calories (with butter)", "n"]],
    fn: E.popcorn, ex: { guests: 20, cupsPerPerson: 4, style: 1 },
    exText: (o) => `Example: 4 cups each for 20 guests is ${o.poppedCups} cups — about ${o.kernelsCups} cups of kernels or ${o.microwaveBags} microwave bags.`,
    how: "Plan 3–4 cups per person for a snack or movie and 5–6 at a popcorn bar. Pop in batches: about ¼–½ cup of kernels at a time in a large pot.",
    assume: "1 cup of kernels (≈ 190 g) pops to about 32 cups. A microwave bag makes about 11 cups. 1 tbsp oil per ¼ cup kernels and 1 tbsp butter per 4 cups popped. Air-popped ≈ 31 kcal/cup, oil-popped ≈ 55, butter 102 kcal/tbsp.",
    faq: [["How much popcorn does ½ cup of kernels make?", "About 16 cups popped."], ["How much popcorn per person?", "About 3–4 cups for a snack."]],
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
