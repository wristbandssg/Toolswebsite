// One-time (but safe to re-run) batch setup script: creates 20 drink calculators —
// 11 in Food & Drink Calculators > Wine, Spirits & Cocktail Calculators and 9 in
// Coffee, Caffeine & Drink Calculators. Formulas live in src/lib/calc-engine-food-drinks.ts;
// examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-drinks-calculators.ts
// or
//   npm run db:create-food-drinks-calculators

import * as E from "../src/lib/calc-engine-food-drinks";

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

const WINE = "wine-spirits-cocktail-calculators";
const COFFEE = "coffee-caffeine-drink-calculators";
const NOTES: Record<string, string> = {
  [WINE]: "Alcohol figures are estimates for home use — measure with a hydrometer or alcoholmeter for anything sold, and drink responsibly.",
  [COFFEE]: "Caffeine and water figures are typical values for healthy adults, not medical advice — ask a doctor if you are pregnant, have a heart condition or take medication.",
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

const VOLUNIT = (def = 0) => dropdown("volumeUnit", "Volume Unit", opts(["Milliliters (mL)", "Fluid ounces (fl oz)", "Liters", "US gallons"]), def);
const STRENGTH = dropdown("strengthUnit", "Strength Unit", opts(["ABV %", "US proof"]), 0);
const US_METRIC = dropdown("unitSystem", "Units", opts(["US gallons", "Liters"]), 0);
const WUNIT = dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0);

const TOOLS: ToolDef[] = [
  mk({
    slug: "alcohol-dilution-calculator", cat: WINE, title: "Alcohol Dilution Calculator (Proofing Down Spirits)",
    desc: "Work out how much water to add to bring a spirit, tincture or high-proof alcohol down to a target ABV or proof — the proofing calculator for moonshine, Everclear, liqueurs and home distilling.",
    meta: "Alcohol Dilution Calculator — Proof Down Spirits to a Target ABV",
    inputs: [VOLUNIT(0), num("volume", "Starting Volume", 750, 10000000, 1), STRENGTH, num("currentStrength", "Current Strength", 95, 200, 0.1), num("targetStrength", "Target Strength", 40, 200, 0.1)],
    results: [["waterToAdd", "Water to Add (same unit as volume)", "n"], ["finalVolume", "Final Volume", "n"], ["waterMl", "Water to Add (mL)", "n"], ["finalAbv", "Final ABV (%)", "n"], ["finalProof", "Final US Proof", "n"], ["pureAlcoholMl", "Pure Alcohol (mL)", "n"]],
    fn: E.alcoholDilution, ex: { volumeUnit: 0, volume: 750, strengthUnit: 0, currentStrength: 95, targetStrength: 40 },
    exText: (o) => `Example: to take 750 mL of 95% grain alcohol down to 40% (80 proof), add ${fmt(o.waterToAdd, 0)} mL of water for ${fmt(o.finalVolume, 0)} mL in total.`,
    how: "Enter the volume and current strength, then the strength you want. You can work in ABV or US proof (proof = 2 × ABV).\n\nAdd water slowly, stir, let it rest for a day and re-measure — mixing alcohol and water shrinks the total volume slightly, so the result can read a little high.",
    assume: "Water to add = V × (current ÷ target − 1). Volume contraction (about 1–3% near 40–60% ABV) is ignored. Use distilled water to avoid cloudiness.",
    faq: [["How much water do I add to 190 proof to make 80 proof?", "About 1.375 parts water to 1 part spirit — 750 mL becomes about 1.78 L."], ["What is the difference between ABV and proof?", "In the US, proof is exactly twice the ABV; 40% ABV is 80 proof."]],
  }),
  mk({
    slug: "shot-calculator", cat: WINE, title: "Shot Calculator (Shots per Bottle & Bottles Needed)",
    desc: "Find how many shots are in a bottle — 50 mL to a 1.75 L handle — for any shot size, and how many bottles to buy for your guests.",
    meta: "Shot Calculator — How Many Shots in a Bottle (Fifth, Liter, Handle)",
    inputs: [dropdown("bottleSize", "Bottle Size", opts(E.BOTTLE_SIZES.map(([n]) => n)), 3), num("shotOz", "Shot Size (fl oz)", 1.5, 10, 0.25, 0.25), num("abv", "Spirit ABV (%)", 40, 96, 0.5), num("guests", "Guests (for a party estimate)", 20, 10000, 1), num("shotsPerGuest", "Shots per Guest", 2, 50, 0.5)],
    results: [["shotsPerBottle", "Shots per Bottle", "n"], ["fullShotsPerBottle", "Full Shots per Bottle", "n"], ["bottlesNeeded", "Bottles to Buy for Your Guests", "n"], ["shotsNeeded", "Shots Needed", "n"], ["shotMl", "Shot Size (mL)", "n"], ["standardDrinksPerShot", "US Standard Drinks per Shot", "n"]],
    fn: E.shots, ex: { bottleSize: 3, shotOz: 1.5, abv: 40, guests: 20, shotsPerGuest: 2 },
    exText: (o) => `Example: a 750 mL fifth holds about ${o.shotsPerBottle} shots of 1.5 oz. For 20 guests having two shots each you need ${o.bottlesNeeded} bottles.`,
    how: "Choose the bottle size and your pour. A US shot is 1.5 oz (44 mL); a 'pony' is 1 oz and a double is 3 oz. UK single measures are 25 mL or 35 mL (0.85 or 1.2 oz).",
    assume: "Shots = bottle mL ÷ (shot oz × 29.57). Bottles are rounded up using full shots only. One 1.5 oz shot of 40% spirit is one US standard drink (14 g alcohol).",
    faq: [["How many shots are in a fifth?", "About 17 one-and-a-half-ounce shots (25 one-ounce shots)."], ["How many shots in a handle?", "About 39 standard 1.5 oz shots in a 1.75 L bottle."]],
  }),
  mk({
    slug: "cocktail-abv-calculator", cat: WINE, title: "Cocktail ABV Calculator (Alcohol in a Mixed Drink)",
    desc: "Calculate the alcohol content of a cocktail from up to four ingredients and how it is mixed — built, stirred, shaken or blended — with proof and standard drinks per glass.",
    meta: "Cocktail ABV Calculator — How Strong Is My Mixed Drink?",
    inputs: [num("ing1Oz", "Ingredient 1 (oz)", 2, 32, 0.25), pct("ing1Abv", "Ingredient 1 ABV", 40, 96, 0.5), num("ing2Oz", "Ingredient 2 (oz)", 0.75, 32, 0.25), pct("ing2Abv", "Ingredient 2 ABV", 0, 96, 0.5), num("ing3Oz", "Ingredient 3 (oz)", 0.75, 32, 0.25), pct("ing3Abv", "Ingredient 3 ABV", 0, 96, 0.5), num("ing4Oz", "Ingredient 4 (oz)", 0, 32, 0.25), pct("ing4Abv", "Ingredient 4 ABV", 0, 96, 0.5), dropdown("method", "How It Is Mixed", opts(E.DILUTION.map(([n]) => n)), 2)],
    results: [["finalAbv", "Cocktail ABV (%)", "n"], ["undilutedAbv", "ABV Before Ice Melt (%)", "n"], ["finalProof", "Proof", "n"], ["finalVolumeOz", "Drink Volume (oz)", "n"], ["standardDrinks", "US Standard Drinks", "n"], ["pureAlcoholOz", "Pure Alcohol (oz)", "n"]],
    fn: E.cocktailAbv, ex: { ing1Oz: 2, ing1Abv: 40, ing2Oz: 0.75, ing2Abv: 0, ing3Oz: 0.75, ing3Abv: 0, ing4Oz: 0, ing4Abv: 0, method: 2 },
    exText: (o) => `Example: a daiquiri (2 oz rum, ¾ oz lime, ¾ oz syrup) shaken with ice is about ${o.finalAbv}% ABV and ${o.standardDrinks} standard drinks.`,
    how: "Enter each ingredient's amount and strength — juices, syrups and sodas are 0%, liqueurs 15–40%, vermouth 15–18%. Choose how it is mixed; shaking melts more ice than stirring.",
    assume: "ABV = total alcohol ÷ (ingredients + melted ice). Typical dilution: built 10%, stirred 22%, shaken 28%, blended 40%. One US standard drink = 14 g of alcohol.",
    faq: [["How strong is a margarita?", "A classic margarita is usually 15–20% ABV after shaking."], ["Does ice change the ABV of a cocktail?", "Yes — melt water typically adds 20–30% volume, lowering the ABV."]],
  }),
  mk({
    slug: "mead-calculator", cat: WINE, title: "Mead Calculator (Honey, Gravity & ABV)",
    desc: "Find how much honey you need for a mead batch to hit a target original gravity, plus potential ABV, expected final gravity and sweetness for your yeast's alcohol tolerance.",
    meta: "Mead Calculator — How Much Honey for a Gallon of Mead",
    inputs: [US_METRIC, num("batchSize", "Batch Size", 1, 10000, 0.1), num("targetOg", "Target Original Gravity", 1.1, 1.2, 0.001, 1), pct("yeastTolerance", "Yeast Alcohol Tolerance (ABV)", 14, 20, 0.5)],
    results: [["honeyLb", "Honey Needed (lb)", "n"], ["honeyKg", "Honey Needed (kg)", "n"], ["honeyVolumeGal", "Honey Volume (gal)", "n"], ["waterGal", "Water to Add (gal)", "n"], ["potentialAbv", "Potential ABV if Fermented Dry (%)", "n"], ["expectedAbv", "Expected ABV (%)", "n"], ["expectedFg", "Expected Final Gravity", "n"], ["sweetness", "Sweetness (0 dry · 1 semi-dry · 2 semi-sweet · 3 sweet)", "n"]],
    fn: E.mead, ex: { unitSystem: 0, batchSize: 1, targetOg: 1.1, yeastTolerance: 14 },
    exText: (o) => `Example: a 1-gallon mead at OG 1.100 needs about ${o.honeyLb} lb of honey. With a 14% yeast it finishes around ${fmt(o.expectedFg, 3)} — ${o.expectedAbv}% ABV.`,
    how: "Enter your batch size, the starting gravity you want (1.080–1.090 for a dry mead, 1.100–1.120 for semi-sweet, 1.130+ for dessert mead) and your yeast's tolerance — for example Lalvin 71B 14%, D47 14%, EC-1118 18%.\n\nIf potential ABV is above the yeast's tolerance, the leftover sugar keeps the mead sweet.",
    assume: "Honey ≈ 35 gravity points per lb per gallon and ≈ 12 lb per gallon. ABV = (OG − FG) × 131.25, with a dry finish at 0.996. Honey varies in moisture (17–20%), so check with a hydrometer.",
    faq: [["How much honey for 1 gallon of mead?", "About 3 lb for a dry mead (OG ≈ 1.100) and 3.5–4 lb for sweet."], ["How long does mead take?", "Primary fermentation takes 2–6 weeks; most meads improve with 3–12 months of ageing."]],
  }),
  mk({
    slug: "chaptalization-calculator", cat: WINE, title: "Chaptalization Calculator (Sugar to Add to Wine Must)",
    desc: "Calculate how much sugar to add to grape juice or must to raise its potential alcohol to a target ABV, from the current Brix or specific gravity.",
    meta: "Chaptalization Calculator — Sugar to Raise Wine Alcohol",
    inputs: [VOLUNIT(2), num("volume", "Must Volume", 20, 10000000, 0.1), dropdown("readingUnit", "Reading Type", opts(["Specific gravity", "Brix"]), 0), num("reading", "Current Reading", 1.08, 1.2, 0.001), pct("targetAbv", "Target Potential Alcohol (ABV)", 13, 18, 0.1), dropdown("wineType", "Wine Type", opts(["White / rosé (17 g/L per 1%)", "Red, fermented on skins (19 g/L per 1%)"]), 1)],
    results: [["sugarGrams", "Sugar to Add (grams)", "n"], ["sugarKg", "Sugar to Add (kg)", "n"], ["sugarLb", "Sugar to Add (lb)", "n"], ["currentPotentialAbv", "Current Potential Alcohol (%)", "n"], ["abvIncrease", "Increase (% ABV)", "n"], ["gramsPerLiter", "Sugar per Liter (g/L)", "n"], ["currentSg", "Current Specific Gravity", "n"]],
    fn: E.chaptalization, ex: { volumeUnit: 2, volume: 20, readingUnit: 0, reading: 1.08, targetAbv: 13, wineType: 1 },
    exText: (o) => `Example: 20 L of red must at 1.080 (about ${o.currentPotentialAbv}% potential) needs ${fmt(o.sugarKg, 2)} kg of sugar to reach 13%.`,
    how: "Measure the must, enter the reading and the alcohol you want. Dissolve the sugar in some of the juice and stir it in at the start of fermentation.\n\nChaptalization is regulated — it is banned in some regions (for example California and Italy for most wines) and capped in the EU.",
    assume: "Potential alcohol = (SG − 0.996) × 131.25. Sugar needed ≈ 17 g/L per 1% for whites and 19 g/L for reds. Added sugar slightly increases the volume.",
    faq: [["How much sugar raises wine 1%?", "About 17 g per liter (2.3 oz per gallon) for white wine and 19 g/L for red."], ["Is chaptalization legal?", "It is allowed in cooler regions such as France, Germany and Oregon, but not in California or Australia."]],
  }),
  mk({
    slug: "alcohol-units-calculator", cat: WINE, title: "Alcohol Units Calculator (UK Units & US Standard Drinks)",
    desc: "Count the alcohol units in your drinks — UK units, US standard drinks and grams of alcohol — and see how many shots of spirits a beer or glass of wine equals.",
    meta: "Alcohol Units Calculator — UK Units, Standard Drinks & Beer to Shots",
    inputs: [dropdown("drinkType", "Drink", opts(E.DRINKS.map(([n]) => n)), 0), num("drinks", "Number of Drinks", 1, 100, 1), VOLUNIT(1), num("customVolume", "Custom Drink Size (custom only)", 12, 5000, 0.1), pct("customAbv", "Custom Drink ABV (custom only)", 5, 96, 0.1)],
    results: [["ukUnits", "UK Units", "n"], ["usStandardDrinks", "US Standard Drinks", "n"], ["gramsAlcohol", "Grams of Alcohol", "n"], ["equivalentShots", "Equivalent 1.5 oz Shots (40%)", "n"], ["shareOfUkWeeklyLimit", "Share of UK 14-Unit Weekly Guideline (%)", "n"], ["hoursToProcess", "Rough Hours for the Body to Process", "n"]],
    fn: E.alcoholUnits, ex: { drinkType: 1, drinks: 2, volumeUnit: 1, customVolume: 12, customAbv: 5 },
    exText: (o) => `Example: two 16 oz pints of 7% IPA are ${o.ukUnits} UK units — ${o.usStandardDrinks} US standard drinks, the same alcohol as about ${o.equivalentShots} shots.`,
    how: "Pick a common drink or choose Custom and enter the size and ABV from the label. A US standard drink is 14 g of alcohol; a UK unit is 10 mL (8 g).",
    assume: "Units = mL × ABV ÷ 1000; grams = mL × ABV × 0.789. The body clears roughly one UK unit an hour, but this varies widely and does not make it safe to drive.",
    faq: [["How many shots equal a beer?", "A 12 oz 5% beer has about the same alcohol as one 1.5 oz shot of 40% spirit."], ["How many units is a bottle of wine?", "A 750 mL bottle of 13% wine is about 9.75 UK units."]],
  }),
  mk({
    slug: "batch-calculator", cat: WINE, title: "Batch Cocktail Calculator (Scale Drinks for a Party)",
    desc: "Scale a cocktail recipe to a big batch for a party or pitcher — total of each ingredient in ounces and milliliters, the water to add for dilution and how many bottles it fills.",
    meta: "Batch Cocktail Calculator — Scale a Cocktail Recipe for a Crowd",
    inputs: [num("servings", "Number of Drinks", 20, 10000, 1), num("ing1Oz", "Ingredient 1 per Drink (oz)", 2, 16, 0.25), num("ing2Oz", "Ingredient 2 per Drink (oz)", 1, 16, 0.25), num("ing3Oz", "Ingredient 3 per Drink (oz)", 0.75, 16, 0.25), num("ing4Oz", "Ingredient 4 per Drink (oz)", 0, 16, 0.25), pct("dilution", "Water for Dilution (if not shaking each drink)", 20, 60, 1)],
    results: [["totalBatchOz", "Total Batch (fl oz)", "n"], ["totalBatchMl", "Total Batch (mL)", "n"], ["ingredient1Oz", "Ingredient 1 Total (oz)", "n"], ["ingredient2Oz", "Ingredient 2 Total (oz)", "n"], ["ingredient3Oz", "Ingredient 3 Total (oz)", "n"], ["ingredient4Oz", "Ingredient 4 Total (oz)", "n"], ["waterOz", "Water to Add (oz)", "n"], ["totalCups", "Total Batch (cups)", "n"], ["bottles750", "750 mL Bottles to Fill", "n"]],
    fn: E.batchCocktail, ex: { servings: 20, ing1Oz: 2, ing2Oz: 1, ing3Oz: 0.75, ing4Oz: 0, dilution: 20 },
    exText: (o) => `Example: 20 margaritas (2 oz tequila, 1 oz lime, ¾ oz agave) need ${o.ingredient1Oz} oz tequila, ${o.ingredient2Oz} oz lime and ${o.ingredient3Oz} oz agave, plus ${o.waterOz} oz of water — ${o.totalCups} cups in all.`,
    how: "Enter one drink's recipe and how many drinks you want. If you will pour over ice straight from a pitcher or bottle, add 15–25% water so it tastes like a freshly stirred drink; set dilution to 0 if you will shake each one.\n\nAdd fresh citrus on the day — it loses brightness after about 12 hours.",
    assume: "Totals are recipe × servings; water = total × dilution %. Keep pre-diluted batches cold and use within a day if they contain juice.",
    faq: [["How much water do I add to a batched cocktail?", "About 20% of the batch for stirred drinks and 25% for shaken-style drinks served without shaking."], ["How many cocktails in a 750 mL bottle?", "About 12 drinks with 2 oz of spirit each."]],
  }),
  mk({
    slug: "vanilla-calculator", cat: WINE, title: "Vanilla Extract Calculator (Beans per Ounce of Alcohol)",
    desc: "Find how many vanilla beans to use for homemade vanilla extract — single or double fold — for any amount of vodka, bourbon or rum, to the FDA standard.",
    meta: "Vanilla Extract Calculator — How Many Vanilla Beans per Ounce",
    inputs: [VOLUNIT(1), num("alcoholVolume", "Alcohol Volume", 8, 100000, 0.1), STRENGTH, num("alcoholStrength", "Alcohol Strength", 40, 200, 0.5), dropdown("fold", "Strength", [["Single fold (FDA standard)", 1], ["Double fold (2×)", 2]], 1), num("beanWeight", "Weight of One Bean (g; grade A ≈ 5, grade B ≈ 4)", 4.5, 20, 0.1, 1), cur("pricePerBean", "Price per Bean", 2, 100)],
    results: [["beanGrams", "Vanilla Beans (grams)", "n"], ["beanOunces", "Vanilla Beans (ounces)", "n"], ["beanCount", "Number of Beans", "n"], ["alcoholMl", "Alcohol (mL)", "n"], ["meetsFdaStrength", "Alcohol Is at Least 35% ABV (1 = yes)", "n"], ["costEstimate", "Bean Cost", "c"]],
    fn: E.vanilla, ex: { volumeUnit: 1, alcoholVolume: 8, strengthUnit: 0, alcoholStrength: 40, fold: 1, beanWeight: 4.5, pricePerBean: 2 },
    exText: (o) => `Example: 8 oz of 80-proof vodka needs about ${o.beanGrams} g of beans — ${o.beanCount} beans, about ${usd(o.costEstimate)}.`,
    how: "Enter how much alcohol you will use. Split the beans lengthwise, submerge them fully and shake weekly. Single-fold extract is ready in about 8 weeks and better at 6–12 months.",
    assume: "FDA 21 CFR 169.175: 13.35 oz of beans (at 25% moisture) per gallon of at least 35% alcohol — about 0.83 oz (23.6 g) per cup. Bean weight varies a lot, so weighing beats counting.",
    faq: [["How many vanilla beans per 8 oz of vodka?", "About 5–6 beans (0.83 oz) for single-fold extract."], ["What alcohol is best for vanilla extract?", "Any 70–80 proof spirit; vodka is neutral, bourbon and rum add warmth."]],
  }),
  mk({
    slug: "limoncello-calculator", cat: WINE, title: "Limoncello Calculator (Alcohol, Sugar & Water)",
    desc: "Make homemade limoncello to your target strength — how much sugar and water for the syrup, how many lemons, and the final volume — from Everclear, grain alcohol or vodka.",
    meta: "Limoncello Calculator — Sugar & Water for Everclear or Vodka",
    inputs: [VOLUNIT(0), num("alcoholVolume", "Alcohol Volume", 750, 100000, 1), STRENGTH, num("alcoholStrength", "Alcohol Strength", 95, 200, 0.5), pct("targetAbv", "Target Limoncello ABV", 30, 60, 0.5), num("sugarRatio", "Syrup Richness (grams sugar per gram water)", 1, 2, 0.1, 0.2)],
    results: [["finalVolumeMl", "Final Limoncello (mL)", "n"], ["syrupMl", "Simple Syrup to Add (mL)", "n"], ["waterMl", "Water for Syrup (mL)", "n"], ["sugarGrams", "Sugar for Syrup (g)", "n"], ["sugarCups", "Sugar (cups)", "n"], ["lemons", "Lemons to Zest", "n"], ["bottles500", "500 mL Bottles", "n"], ["finalAbv", "Final ABV (%)", "n"]],
    fn: E.limoncello, ex: { volumeUnit: 0, alcoholVolume: 750, strengthUnit: 0, alcoholStrength: 95, targetAbv: 30, sugarRatio: 1 },
    exText: (o) => `Example: 750 mL of 190-proof alcohol at 30% makes ${fmt(o.finalVolumeMl, 0)} mL of limoncello — dissolve ${fmt(o.sugarGrams, 0)} g of sugar in ${fmt(o.waterMl, 0)} mL of water and zest about ${o.lemons} lemons.`,
    how: "Steep the zest (yellow part only) in the alcohol for 4–30 days, strain, then stir in the cooled syrup. Most limoncello is 26–32% ABV; 1:1 syrup gives a classic sweetness.\n\nWith 40% vodka there is little room for syrup — the calculator will show a small amount; use a higher-proof base for a sweeter liqueur.",
    assume: "Final volume = alcohol × strength ÷ target. Sugar adds about 0.63 mL of volume per gram, which is accounted for. About one lemon per 75 mL of alcohol.",
    faq: [["How much sugar for limoncello?", "For 750 mL of Everclear at 30%, about 800–900 g of sugar in a similar weight of water."], ["Why is my limoncello cloudy?", "That is the louche effect from lemon oils — it is normal and a sign of good flavour."]],
  }),
  mk({
    slug: "proof-gallon-calculator", cat: WINE, title: "Proof Gallon Calculator (and Federal Spirits Excise Tax)",
    desc: "Convert any volume of spirits to proof gallons and estimate the US federal excise tax at the craft-distiller rates of $2.70, $13.34 or $13.50 per proof gallon.",
    meta: "Proof Gallon Calculator — TTB Proof Gallons & Excise Tax",
    inputs: [VOLUNIT(3), num("volume", "Volume of Spirits", 100, 100000000, 0.01), dropdown("strengthUnit", "Strength Unit", opts(["ABV %", "US proof"]), 0), num("strength", "Strength", 40, 200, 0.1), dropdown("taxTier", "Federal Rate Tier", opts(["First 100,000 PG — $2.70", "100,000–22.23 million PG — $13.34", "Above 22.23 million PG / standard — $13.50"]), 0)],
    results: [["proofGallons", "Proof Gallons", "n"], ["federalExcise", "Federal Excise Tax", "c"], ["wineGallons", "Wine (Liquid) Gallons", "n"], ["proof", "Proof", "n"], ["taxPerBottle750", "Tax per 750 mL Bottle", "c"], ["ratePerProofGallon", "Rate per Proof Gallon ($)", "n"]],
    fn: E.proofGallon, ex: { volumeUnit: 3, volume: 100, strengthUnit: 0, strength: 40, taxTier: 0 },
    exText: (o) => `Example: 100 gallons of 80-proof whiskey is ${o.proofGallons} proof gallons — ${usd(o.federalExcise)} of federal excise at the $2.70 craft rate.`,
    how: "Enter the liquid volume and strength. A proof gallon is one US gallon of spirits at 100 proof (50% ABV); TTB taxes and reports by proof gallons.",
    assume: "Proof gallons = gallons × proof ÷ 100. Rates per 26 U.S.C. 5001(c), as made permanent in 2020; state excise taxes are extra. Rates apply per calendar year to spirits removed from bond.",
    faq: [["What is a proof gallon?", "One gallon of liquid at 50% alcohol — so a gallon of 80-proof spirit is 0.8 proof gallons."], ["What is the federal tax on a bottle of vodka?", "At $13.50 per proof gallon, a 750 mL bottle of 80-proof vodka carries about $2.14."]],
  }),
  mk({
    slug: "mead-backsweetening-calculator", cat: WINE, title: "Mead Backsweetening Calculator (Honey to Add)",
    desc: "Work out how much honey or sugar to add to a finished, stabilised mead, wine or cider to reach a target sweetness gravity, with sorbate and metabisulfite doses.",
    meta: "Mead Backsweetening Calculator — Honey to Reach a Target Gravity",
    inputs: [US_METRIC, num("volume", "Mead Volume", 5, 10000, 0.1), num("currentGravity", "Current Gravity", 0.998, 1.1, 0.001, 0.98), num("targetGravity", "Target Gravity (1.005 semi-dry · 1.012 semi-sweet · 1.020 sweet)", 1.012, 1.1, 0.001, 0.99), dropdown("sweetener", "Sweetener", opts(["Honey", "Table sugar", "Corn sugar (dextrose)"]), 0)],
    results: [["sweetenerLb", "Sweetener to Add (lb)", "n"], ["sweetenerKg", "Sweetener to Add (kg)", "n"], ["sweetenerCups", "Sweetener (cups)", "n"], ["finalVolumeGal", "Final Volume (gal)", "n"], ["sorbateGrams", "Potassium Sorbate (g)", "n"], ["metabisulfiteGrams", "Potassium Metabisulfite (g)", "n"]],
    fn: E.backsweeten, ex: { unitSystem: 0, volume: 5, currentGravity: 0.998, targetGravity: 1.012, sweetener: 0 },
    exText: (o) => `Example: to take 5 gallons of dry mead from 0.998 to 1.012, stabilise with ${o.sorbateGrams} g sorbate and ${o.metabisulfiteGrams} g metabisulfite, then stir in ${o.sweetenerLb} lb of honey.`,
    how: "Stabilise first — add the sorbate and metabisulfite and wait 24–48 hours — or the yeast will ferment the new sugar and can over-carbonate bottles.\n\nAdd sweetener a little at a time, taste and re-measure.",
    assume: "Honey ≈ 35 points per lb per gallon (sugar 46, dextrose 42); the extra volume the sweetener adds is included. Sorbate 200 mg/L; metabisulfite ≈ 87 mg/L for about 50 ppm SO₂.",
    faq: [["How much honey to backsweeten a gallon of mead?", "About 0.4 lb (6 oz) raises a gallon by roughly 14 points, from dry to semi-sweet."], ["Do I have to stabilise before backsweetening?", "Yes, unless you will keg and keep it cold or pasteurise the bottles."]],
  }),
  mk({
    slug: "caffeine-calculator", cat: COFFEE, title: "Caffeine Calculator (Daily Caffeine Intake)",
    desc: "Add up the caffeine in your coffee, espresso, tea, soda, energy drinks and pre-workout and compare it with the FDA's 400 mg daily limit (200 mg in pregnancy), with mg per kg of body weight.",
    meta: "Caffeine Calculator — How Much Caffeine Am I Having a Day?",
    inputs: [...E.CAFFEINE.map(([k, l]) => num(k, l, k === "dripCoffee" ? 2 : 0, 50, 0.5)), num("otherMg", "Other Caffeine (mg)", 0, 5000, 1), WUNIT, num("weight", "Body Weight", 160, 1000, 1, 1), dropdown("group", "Who Is It For", opts(["Healthy adult (400 mg)", "Pregnant or breastfeeding (200 mg)", "Teen 12–18 (100 mg)"]), 0)],
    results: [["totalCaffeineMg", "Total Caffeine (mg)", "n"], ["dailyLimitMg", "Daily Limit (mg)", "n"], ["remainingMg", "Remaining Before the Limit (mg)", "n"], ["percentOfLimit", "Share of the Limit (%)", "n"], ["mgPerKg", "Caffeine per kg Body Weight", "n"], ["cupsOfCoffeeEquivalent", "Equivalent 8 oz Cups of Coffee", "n"]],
    fn: E.caffeine, ex: { dripCoffee: 2, espresso: 1, coldBrew: 0, blackTea: 0, greenTea: 0, cola: 1, energySmall: 0, energyLarge: 0, preWorkout: 0, darkChocolate: 0, otherMg: 0, weightUnit: 0, weight: 160, group: 0 },
    exText: (o) => `Example: two cups of coffee, one espresso and a cola add up to ${o.totalCaffeineMg} mg — ${fmt(o.percentOfLimit, 0)}% of the 400 mg limit.`,
    how: "Enter how many of each drink you have in a day. Café drinks vary a lot — a 16 oz coffee from a chain can have 300 mg or more — so use the Other field with the brand's own figure where you know it.",
    assume: "Typical values: brewed coffee 95 mg/8 oz, espresso 64 mg/shot, cold brew 200 mg/16 oz, black tea 47, green tea 28, cola 34/12 oz, energy drinks 80–160, pre-workout 200/scoop. Limits: FDA 400 mg for adults, ACOG 200 mg in pregnancy, AAP ≤100 mg for teens.",
    faq: [["How much caffeine is too much?", "Over 400 mg a day for most adults, or about 1,200 mg at once, which can be dangerous."], ["How much caffeine is in a cup of coffee?", "About 80–100 mg in 8 oz of brewed coffee."]],
  }),
  mk({
    slug: "coffee-half-life-calculator", cat: COFFEE, title: "Caffeine Half-Life Calculator (How Long Coffee Stays in Your System)",
    desc: "See how much caffeine is still in your body hours after coffee, and when it will drop low enough not to disturb sleep, using caffeine's half-life for your situation.",
    meta: "Coffee Half Life Calculator — Caffeine Left in Your System",
    inputs: [num("caffeineMg", "Caffeine Consumed (mg)", 200, 2000, 1), num("hoursSince", "Hours Since You Had It", 6, 72, 0.25), dropdown("profile", "Your Situation", opts(E.HALF_LIVES.map(([n]) => n)), 0), num("sleepThreshold", "Level That Won't Disturb Sleep (mg)", 50, 400, 5, 5)],
    results: [["caffeineRemainingMg", "Caffeine Still in Your System (mg)", "n"], ["percentRemaining", "Share Remaining (%)", "n"], ["halfLifeHours", "Half-Life Used (hours)", "n"], ["hoursUntilBelowThreshold", "Hours Until Below Sleep Level", "n"], ["totalHoursToThreshold", "Total Hours From Drinking to Sleep Level", "n"], ["hoursUntil95Cleared", "Hours Until 95% Cleared", "n"]],
    fn: E.caffeineHalfLife, ex: { caffeineMg: 200, hoursSince: 6, profile: 0, sleepThreshold: 50 },
    exText: (o) => `Example: 200 mg of caffeine (a large coffee) still leaves ${o.caffeineRemainingMg} mg in your body 6 hours later; it takes ${o.totalHoursToThreshold} hours to fall below 50 mg.`,
    how: "Enter the caffeine you had and when. If you had several drinks, run each one and add the remaining amounts.",
    assume: "Remaining = dose × 0.5^(hours ÷ half-life). Half-life averages about 5 hours (range 2–10): shorter in smokers, longer with oral contraceptives, late pregnancy and liver disease.",
    faq: [["How long does caffeine stay in your system?", "Half is gone in about 5 hours, but a quarter is still there after 10 hours."], ["When should I stop drinking coffee before bed?", "Sleep researchers suggest at least 8–10 hours before bedtime for a typical cup."]],
  }),
  mk({
    slug: "hydration-needs-calculator", cat: COFFEE, title: "Hydration Calculator (How Much Water Should I Drink)",
    desc: "Estimate how much water to drink a day from your weight, exercise, climate and pregnancy or breastfeeding — in liters, ounces, cups and bottles.",
    meta: "Hydration Needs Calculator — Daily Water Intake by Weight",
    inputs: [WUNIT, num("weight", "Body Weight", 160, 1000, 1, 1), num("exerciseMinutes", "Exercise per Day (minutes)", 30, 600, 5), dropdown("climate", "Climate", opts(["Temperate / indoors", "Hot or humid", "Very hot, or high altitude"]), 0), dropdown("lifeStage", "Pregnancy / Breastfeeding", opts(["Neither", "Pregnant", "Breastfeeding"]), 0)],
    results: [["dailyWaterLiters", "Daily Water (liters)", "n"], ["dailyWaterOz", "Daily Water (fl oz)", "n"], ["cups8oz", "8 oz Cups", "n"], ["bottles500ml", "500 mL Bottles", "n"], ["baselineLiters", "Baseline Before Exercise (L)", "n"], ["extraForExerciseMl", "Extra for Exercise (mL)", "n"]],
    fn: E.hydration, ex: { weightUnit: 0, weight: 160, exerciseMinutes: 30, climate: 0, lifeStage: 0 },
    exText: (o) => `Example: a 160 lb adult who exercises 30 minutes a day should aim for about ${o.dailyWaterLiters} L (${fmt(o.dailyWaterOz, 0)} oz) of fluids.`,
    how: "Enter your weight and typical activity. The total includes all drinks — water, tea, coffee and milk; food supplies roughly another 20% of your water.",
    assume: "Baseline 33 mL per kg, plus about 350 mL per 30 minutes of exercise (ACSM), 500–750 mL for heat, 300 mL in pregnancy and 700 mL when breastfeeding. Pale-yellow urine is a good everyday check.",
    faq: [["How much water should I drink a day?", "Most adults need about 2–3.5 liters of total fluids a day."], ["Does coffee count toward hydration?", "Yes — moderate coffee is not dehydrating and counts toward your fluids."]],
  }),
  mk({
    slug: "espresso-calculator", cat: COFFEE, title: "Espresso Ratio Calculator (Dose, Yield & Shot Time)",
    desc: "Dial in espresso: find the shot yield for your dose and brew ratio — ristretto, normale or lungo — with flow rate, approximate caffeine and whether your shot time is on target.",
    meta: "Espresso Calculator — Brew Ratio, Yield & Shot Time",
    inputs: [num("dose", "Dose of Ground Coffee (g)", 18, 30, 0.1, 5), dropdown("style", "Shot Style", opts(E.ESPRESSO.map(([n]) => n)), 1), num("customRatio", "Custom Ratio (1 : x)", 2.2, 5, 0.1, 0.5), num("shotTime", "Shot Time (seconds)", 28, 90, 1)],
    results: [["yieldGrams", "Target Yield in the Cup (g)", "n"], ["brewRatio", "Brew Ratio (1 : x)", "n"], ["yieldMlApprox", "Yield (mL, approx.)", "n"], ["flowRateGps", "Flow Rate (g/s)", "n"], ["caffeineMgApprox", "Caffeine (mg, approx.)", "n"], ["timeVerdict", "Shot Time (−1 too fast · 0 good · 1 too slow)", "n"]],
    fn: E.espresso, ex: { dose: 18, style: 1, customRatio: 2.2, shotTime: 28 },
    exText: (o) => `Example: an 18 g dose pulled at 1:2 should yield ${o.yieldGrams} g in about 25–30 seconds (${o.flowRateGps} g/s at 28 s).`,
    how: "Weigh the dose, choose a ratio and pull the shot until the cup scale shows the target yield. If it runs faster than about 22 seconds, grind finer; slower than about 35 seconds, grind coarser.",
    assume: "Yield = dose × ratio; espresso is about 0.92 g/mL because of crema. Caffeine roughly 7–8 mg per gram of coffee extracted (varies by bean and roast).",
    faq: [["What is the best espresso ratio?", "1:2 (for example 18 g in, 36 g out) is the modern standard; 1:1.5 is a ristretto and 1:3 a lungo."], ["How long should an espresso shot take?", "About 25–30 seconds from first pump to target yield."]],
  }),
  mk({
    slug: "coffee-calculator", cat: COFFEE, title: "Coffee Ratio Calculator (Coffee to Water)",
    desc: "Find how much coffee to use for drip, pour over, Chemex, French press, AeroPress or moka pot — in grams, tablespoons and scoops — for any number of cups and strength.",
    meta: "Coffee Calculator — Coffee to Water Ratio for Any Brew Method",
    inputs: [dropdown("method", "Brew Method", opts(E.METHODS.map(([n]) => n)), 0), dropdown("strength", "Strength", opts(["Mild", "Medium", "Strong"]), 1), dropdown("inputMode", "Start From", opts(["Number of cups", "Grams of coffee"]), 0), num("cups", "Cups to Brew", 4, 100, 1, 1), num("cupSizeOz", "Cup Size (fl oz)", 8, 32, 1, 4), num("coffeeGrams", "Coffee (grams, if starting from coffee)", 30, 2000, 1)],
    results: [["coffeeGrams", "Coffee (grams)", "n"], ["waterMl", "Water (mL)", "n"], ["waterOz", "Water (fl oz)", "n"], ["tablespoons", "Level Tablespoons of Ground Coffee", "n"], ["scoops", "Coffee Scoops (2 tbsp)", "n"], ["ratio", "Ratio (1 : x)", "n"], ["grindIndex", "Grind (0 medium · 1 medium-fine · 2 coarse · 3 fine-medium · 4 fine)", "n"]],
    fn: E.coffeeRatio, ex: { method: 0, strength: 1, inputMode: 0, cups: 4, cupSizeOz: 8, coffeeGrams: 30 },
    exText: (o) => `Example: four 8 oz cups of drip coffee at 1:16 need ${o.coffeeGrams} g of coffee — about ${fmt(o.tablespoons, 0)} level tablespoons or ${fmt(o.scoops, 1)} scoops — and ${fmt(o.waterOz, 0)} oz of water.`,
    how: "Choose your method and strength and enter how many cups you want, or start from the coffee you have. Note that a coffee-maker 'cup' is often only 5–6 oz.\n\nWeighing with a scale is far more consistent than spoons, because roast and grind change how much fits in a spoon.",
    assume: "Golden-cup ratios: drip, pour over and Chemex 1:16, French press 1:15, AeroPress 1:13, moka pot 1:7, percolator 1:17. Mild uses 10% more water, strong 10% less. A level tablespoon of ground coffee ≈ 5.3 g.",
    faq: [["How many tablespoons of coffee per cup?", "About 1.5–2 level tablespoons (8–10 g) per 8 oz cup."], ["What is the best coffee-to-water ratio?", "1:15 to 1:17 by weight suits most brewing methods."]],
  }),
  mk({
    slug: "cold-brew-ratio-calculator", cat: COFFEE, title: "Cold Brew Ratio Calculator",
    desc: "Work out how much coffee and water to use for cold brew concentrate or ready-to-drink cold brew, with the yield after the grounds soak up water and how many servings it makes.",
    meta: "Cold Brew Ratio Calculator — Coffee to Water for Cold Brew",
    inputs: [dropdown("style", "Cold Brew Style", opts(["Strong concentrate (1:4)", "Concentrate (1:5)", "Ready to drink (1:8)", "Custom ratio"]), 1), num("customRatio", "Custom Ratio (1 : x)", 6, 20, 0.5, 2), dropdown("inputMode", "Start From", opts(["Water", "Coffee (grams)"]), 0), VOLUNIT(2), num("water", "Water", 1, 100000, 0.1), num("coffeeGrams", "Coffee (grams, if starting from coffee)", 200, 100000, 1)],
    results: [["coffeeGrams", "Coarse-Ground Coffee (g)", "n"], ["coffeeOunces", "Coffee (oz)", "n"], ["coffeeCups", "Coffee (cups of grounds)", "n"], ["waterMl", "Water (mL)", "n"], ["concentrateYieldMl", "Cold Brew Yield (mL)", "n"], ["servings8oz", "8 oz Servings (concentrate diluted 1:1)", "n"], ["ratio", "Ratio (1 : x)", "n"]],
    fn: E.coldBrew, ex: { style: 1, customRatio: 6, inputMode: 0, volumeUnit: 2, water: 1, coffeeGrams: 200 },
    exText: (o) => `Example: 1 liter of water at 1:5 takes ${o.coffeeGrams} g of coarse coffee and yields about ${fmt(o.concentrateYieldMl, 0)} mL of concentrate — ${o.servings8oz} servings once diluted.`,
    how: "Grind coarse, stir the coffee into cold water and steep 12–18 hours in the fridge (or 12 hours at room temperature), then strain. Dilute concentrate about 1:1 with water or milk.",
    assume: "Coffee grounds retain about 2 g of water per gram, so yield = water − 2 × coffee. Cold brew concentrate has roughly 100–200 mg caffeine per 4 oz depending on ratio.",
    faq: [["What is the ratio for cold brew?", "1:4 to 1:5 for concentrate, 1:8 for ready-to-drink."], ["How long should cold brew steep?", "12–18 hours; past 24 hours it can taste woody and bitter."]],
  }),
  mk({
    slug: "super-juice-calculator", cat: COFFEE, title: "Super Juice Calculator (Citric & Malic Acid)",
    desc: "Turn lime, lemon or orange peels into 'super juice' — the citric and malic acid, sugar and total yield for any weight of peel, using Nickle Morris's original ratios.",
    meta: "Super Juice Calculator — Citric & Malic Acid per Gram of Peel",
    inputs: [dropdown("fruit", "Citrus", opts(E.SUPER_JUICE.map(([n]) => n)), 0), num("peelGrams", "Peel Weight (grams)", 100, 10000, 1, 1)],
    results: [["citricAcidGrams", "Citric Acid (g)", "n"], ["malicAcidGrams", "Malic Acid (g)", "n"], ["sugarGrams", "Sugar (g, orange only)", "n"], ["totalYieldMl", "Total Super Juice Yield (mL)", "n"], ["yieldOz", "Yield (fl oz)", "n"], ["fruitsNeeded", "Approx. Fruits for This Much Peel", "n"]],
    fn: E.superJuice, ex: { fruit: 0, peelGrams: 100 },
    exText: (o) => `Example: 100 g of lime peel (about ${o.fruitsNeeded} limes) with ${o.citricAcidGrams} g citric and ${o.malicAcidGrams} g malic acid makes about ${o.totalYieldMl} mL of super juice.`,
    how: "Peel the fruit, weigh the peels and toss them with the acids for an hour. Blend with water, strain, then add the juice squeezed from the fruit and top up with water to the yield shown.\n\nUse it like fresh juice, 1:1, in any cocktail. It keeps 3–5 days refrigerated.",
    assume: "Per liter (Morris): lime 100 g peel + 44 g citric + 7 g malic; lemon 100 g + 47 g + 9 g; orange 120 g + 23 g + 2 g + 70 g sugar. Peel per fruit: lime ≈ 11 g, lemon ≈ 13 g, orange ≈ 40 g.",
    faq: [["What is super juice?", "A citrus juice stretched with peel oils, acid and water — up to about 8× more juice per fruit."], ["Does super juice taste like fresh juice?", "Very close in cocktails, and it stays bright longer than fresh juice."]],
  }),
  mk({
    slug: "grind-size-calculator", cat: COFFEE, title: "Coffee Grind Size Calculator (by Brew Method)",
    desc: "Find the right coffee grind size in microns for espresso, pour over, drip, AeroPress, French press or cold brew, an approximate burr-grinder setting, and whether to go finer or coarser from your brew time.",
    meta: "Grind Size Calculator — Coffee Grind Size Chart in Microns",
    inputs: [dropdown("method", "Brew Method", opts(E.GRIND.map(([n]) => n)), 4), num("brewSeconds", "Your Brew Time (seconds, 0 to skip)", 210, 100000, 1)],
    results: [["targetMicronsMid", "Target Grind Size (microns)", "n"], ["targetMicronsLow", "Range — From (µm)", "n"], ["targetMicronsHigh", "Range — To (µm)", "n"], ["encoreSettingApprox", "Approx. Baratza Encore Setting (1–40)", "n"], ["brewTimeTargetSec", "Target Brew Time (seconds)", "n"], ["adjustment", "Adjust (−1 grind coarser · 0 good · 1 grind finer)", "n"]],
    fn: E.grindSize, ex: { method: 4, brewSeconds: 210 },
    exText: (o) => `Example: pour over wants about ${o.targetMicronsLow}–${o.targetMicronsHigh} µm (around setting ${o.encoreSettingApprox} on a Baratza Encore); a 3½-minute brew means you should ${o.adjustment === 1 ? "grind a little finer" : o.adjustment === -1 ? "grind coarser" : "keep the grind"}.`,
    how: "Pick your method to see the grind range. Enter your actual brew time: a brew that runs long and tastes bitter needs a coarser grind; one that runs fast and tastes sour needs a finer grind.\n\nEvery grinder is different — use the setting as a starting point only.",
    assume: "Typical ranges: Turkish 40–220 µm, espresso 180–380, moka 360–660, AeroPress 320–960, pour over 400–700, drip 300–900, Chemex 600–900, French press 690–1,300, cold brew 800–1,400. Target times: espresso 25 s, pour over 3 min, drip 5 min, French press 4 min.",
    faq: [["What grind size for French press?", "Coarse — about 700–1,300 microns, like sea salt."], ["What grind for pour over?", "Medium-fine, roughly 400–700 microns, like table salt."]],
  }),
  mk({
    slug: "coffee-roasting-weight-loss-calculator", cat: COFFEE, title: "Coffee Roasting Weight Loss Calculator",
    desc: "Calculate the weight loss of a coffee roast, estimate the roast level from it, and find how much green coffee to roast to end up with the amount of roasted coffee you want.",
    meta: "Coffee Roasting Weight Loss Calculator — Green to Roasted",
    inputs: [num("greenWeight", "Green Coffee Weight (g)", 500, 1000000, 1), num("roastedWeight", "Roasted Coffee Weight (g)", 425, 1000000, 1), dropdown("targetLevel", "Roast Level You Want (for planning)", opts(["Light (≈12%)", "Medium (≈14%)", "Medium-dark (≈16%)", "Dark (≈18.5%)"]), 1), num("wantRoasted", "Roasted Coffee You Want (g)", 340, 1000000, 1)],
    results: [["weightLossPercent", "Weight Loss (%)", "n"], ["roastLevelIndex", "Roast Level (0 under · 1 light · 2 medium · 3 medium-dark · 4 dark)", "n"], ["moistureLostGrams", "Weight Lost (g)", "n"], ["greenNeededForTarget", "Green Coffee to Roast for Your Target (g)", "n"], ["targetLossPercent", "Planning Loss Used (%)", "n"]],
    fn: E.roastLoss, ex: { greenWeight: 500, roastedWeight: 425, targetLevel: 1, wantRoasted: 340 },
    exText: (o) => `Example: 500 g of green coffee roasted to 425 g lost ${o.weightLossPercent}% — a medium roast. To get a 340 g (12 oz) bag at medium, roast ${fmt(o.greenNeededForTarget, 0)} g of green beans.`,
    how: "Weigh the beans before and after roasting. Weight loss tracks roast development: light roasts lose 11–13%, medium 13–15%, medium-dark 15–17% and dark 17–20%.",
    assume: "Loss = (green − roasted) ÷ green. Bean density, moisture (typically 10–12%) and roaster type shift the numbers, so compare roasts on the same machine.",
    faq: [["How much weight does coffee lose when roasted?", "About 12–20%, mostly water, depending on the roast level."], ["How much green coffee makes a pound of roasted?", "About 1.18 lb for a medium roast."]],
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
