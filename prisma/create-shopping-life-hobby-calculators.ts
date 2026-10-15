// One-time (but safe to re-run) batch setup script: creates 11 pet and hobby craft tools
// from the user's shopping list (Shopping Calculators > Lifestyle, Party & Wedding Calculators).
// See src/lib/calc-engine-shopping-life-hobby.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-life-hobby-calculators.ts
// or
//   npm run db:create-shopping-life-hobby-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Lifestyle, Party & Wedding Calculators", slug: "lifestyle-party-wedding-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
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

const OILS = (key: string, label: string, def: number) => dropdown(key, label, [["Olive oil", 0.135], ["Coconut oil (76°)", 0.183], ["Palm oil", 0.142], ["Shea butter", 0.128], ["Castor oil", 0.128], ["Sunflower oil", 0.134], ["Cocoa butter", 0.137], ["Lard", 0.138], ["Avocado oil", 0.133], ["Sweet almond oil", 0.136]], def);

const TOOLS: ToolDef[] = [
  {
    slug: "beer-abv-calculator",
    title: "Beer ABV Calculator",
    description: "Calculate your homebrew's alcohol by volume from original and final gravity — standard and alternate formulas — plus apparent attenuation and calories per 12 oz.",
    metaTitle: "Beer ABV Calculator — Homebrew Alcohol %",
    metaDescription: "Free beer ABV calculator. Find homebrew alcohol by volume from original and final gravity, with attenuation and calories per 12 oz.",
    calcInputs: [
      numberField("og", "Original Gravity (OG)", { default: 1.055, min: 1, max: 1.2, step: 0.001 }),
      numberField("fg", "Final Gravity (FG)", { default: 1.012, min: 0.98, max: 1.1, step: 0.001 }),
    ],
    calcResult: { label: "ABV", format: "percentage" },
    calcResults: [
      { key: "abvPercent", label: "Alcohol by Volume (%)", format: "percentage", highlight: true },
      { key: "abvAlternate", label: "ABV, Alternate Formula — Better for Strong Beers (%)", format: "percentage" },
      { key: "apparentAttenuation", label: "Apparent Attenuation (%)", format: "percentage" },
      { key: "caloriesPer12oz", label: "Calories per 12 oz", format: "number" },
    ],
    instructions: "Take a hydrometer reading before pitching yeast (OG) and again when fermentation is finished (FG), corrected to the hydrometer's calibration temperature.",
    examples: "Example: a beer brewed at 1.055 that finishes at 1.012 is about 5.64% ABV with 78.18% attenuation and roughly 181 calories per 12 oz.",
    assumptions: "Standard formula: ABV = (OG − FG) × 131.25. The alternate formula is more accurate above about 7% ABV. Calories use real extract and alcohol by weight. Refractometer readings after fermentation need alcohol correction before use.",
    faq: [
      { question: "How do I calculate ABV for homebrew?", answer: "Subtract final gravity from original gravity and multiply by 131.25 — 1.050 to 1.010 gives about 5.25%." },
      { question: "What is apparent attenuation?", answer: "The share of sugars the yeast appears to have fermented; most ale yeasts reach 70–80%." },
    ],
  },
  {
    slug: "candle-wax-calculator",
    title: "Candle Wax Calculator",
    description: "Work out how much wax and fragrance oil you need to fill your candle jars — by container volume, fill level and fragrance load — with total supply cost.",
    metaTitle: "Candle Wax Calculator — Wax for Jars",
    metaDescription: "Free candle wax calculator. Find how much wax and fragrance oil you need for your candle containers, with supply cost.",
    calcInputs: [
      numberField("candles", "Number of Candles", { default: 12, min: 1, max: 10000 }),
      numberField("containerFlOz", "Container Capacity (Brim Full)", { unit: "fl oz", default: 8, max: 128, step: 0.5 }),
      percentField("fillPercent", "Fill Level", { default: 90, min: 50, max: 100 }),
      percentField("fragranceLoad", "Fragrance Load", { default: 8, max: 15 }),
      currencyField("waxPricePerLb", "Wax Price per lb", { default: 3.5, max: 50, step: 0.25 }),
      currencyField("fragrancePricePerOz", "Fragrance Oil Price per oz", { default: 2, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Wax Needed", format: "number" },
    calcResults: [
      { key: "waxLb", label: "Wax Needed (lb)", format: "number", highlight: true },
      { key: "waxOzTotal", label: "Wax Needed (oz)", format: "number" },
      { key: "fragranceOzTotal", label: "Fragrance Oil (oz)", format: "number" },
      { key: "waxPerCandleOz", label: "Wax per Candle (oz)", format: "number" },
      { key: "pouredWeightPerCandleOz", label: "Poured Weight per Candle (oz)", format: "number" },
      { key: "suppliesCost", label: "Wax + Fragrance Cost", format: "currency" },
    ],
    instructions: "Measure the container's brim-full volume with water (in fluid ounces), choose how full you'll pour and your fragrance load (check the wax's maximum), and enter supply prices.",
    examples: "Example: 12 eight-ounce jars filled to 90% with an 8% fragrance load need about 4.3 lb of wax and 5.5 oz of fragrance oil — about $26.06 in supplies.",
    assumptions: "Wax weighs about 0.86 oz per fluid ounce of container volume (soy and most blends are 0.8–0.9). The poured weight includes fragrance, so wax = poured weight ÷ (1 + load). Buy about 5–10% extra for the melting pot and test pours.",
    faq: [
      { question: "How much wax do I need for an 8 oz candle?", answer: "About 6 oz poured (wax plus fragrance) by weight, since wax is lighter than water and jars aren't filled to the brim." },
      { question: "How much fragrance oil per pound of wax?", answer: "About 1–1.6 oz per pound (6–10% load); never exceed the wax manufacturer's maximum." },
    ],
  },
  {
    slug: "candle-fragrance-load-calculator",
    title: "Candle Fragrance Load Calculator",
    description: "Calculate how much fragrance oil to add to your candle wax for a given fragrance load — in ounces and grams — and check it against your wax's maximum.",
    metaTitle: "Candle Fragrance Load Calculator — FO Amount",
    metaDescription: "Free candle fragrance load calculator. Find how much fragrance oil to add to your wax by load %, in ounces and grams, with cost.",
    calcInputs: [
      numberField("waxOz", "Wax Weight", { unit: "oz", default: 16, max: 10000, step: 0.5 }),
      percentField("load", "Fragrance Load", { default: 8, max: 20, step: 0.5 }),
      percentField("maxLoad", "Wax's Maximum Load", { default: 10, max: 20, step: 0.5 }),
      currencyField("pricePerOz", "Fragrance Oil Price per oz", { default: 2, max: 20, step: 0.1, required: false }),
    ],
    calcResult: { label: "Fragrance Oil", format: "number" },
    calcResults: [
      { key: "fragranceOz", label: "Fragrance Oil (oz)", format: "number", highlight: true },
      { key: "fragranceGrams", label: "Fragrance Oil (g)", format: "number" },
      { key: "totalBatchOz", label: "Total Batch Weight (oz)", format: "number" },
      { key: "overWaxMaximum", label: "Over the Wax's Maximum? (1 = Yes)", format: "number" },
      { key: "fragranceCost", label: "Fragrance Cost", format: "currency" },
    ],
    instructions: "Weigh your wax, choose a fragrance load (6–10% is typical) and enter your wax's maximum load from the supplier.",
    examples: "Example: 16 oz of wax at an 8% load needs 1.28 oz (36.29 g) of fragrance oil.",
    assumptions: "Fragrance oil = wax weight × load %. Add fragrance at the temperature your wax supplier recommends (often about 185°F for soy) and stir for 2 minutes. More fragrance isn't always a stronger throw — overloading can cause sweating and poor burns.",
    faq: [
      { question: "What fragrance load should I use?", answer: "Most candle makers use 6–10%; start around 8% and test burn for scent throw." },
      { question: "Is fragrance load by weight or volume?", answer: "By weight — weigh both the wax and the fragrance oil on a scale." },
    ],
  },
  {
    slug: "soap-lye-calculator",
    title: "Soap Lye Calculator",
    description: "Calculate how much lye (sodium hydroxide) and water you need for cold process soap — up to three oils with their SAP values, superfat and water ratio.",
    metaTitle: "Soap Lye Calculator — Cold Process NaOH",
    metaDescription: "Free soap lye calculator. Find NaOH and water amounts for cold process soap from your oils, superfat and water ratio.",
    calcInputs: [
      OILS("oil1", "Oil 1", 0.135),
      numberField("weight1", "Oil 1 Weight", { unit: "oz", default: 16, max: 1000, step: 0.1 }),
      OILS("oil2", "Oil 2", 0.183),
      numberField("weight2", "Oil 2 Weight", { unit: "oz", default: 8, max: 1000, step: 0.1, required: false }),
      OILS("oil3", "Oil 3", 0.128),
      numberField("weight3", "Oil 3 Weight", { unit: "oz", default: 2, max: 1000, step: 0.1, required: false }),
      percentField("superfat", "Superfat", { default: 5, max: 20 }),
      percentField("waterPercent", "Water as % of Oils", { default: 33, min: 20, max: 40 }),
    ],
    calcResult: { label: "Lye", format: "number" },
    calcResults: [
      { key: "lyeOz", label: "Lye — Sodium Hydroxide (oz)", format: "number", highlight: true },
      { key: "lyeGrams", label: "Lye (g)", format: "number" },
      { key: "waterOz", label: "Distilled Water (oz)", format: "number" },
      { key: "totalOilsOz", label: "Total Oils (oz)", format: "number" },
      { key: "batchWeightOz", label: "Total Batch Weight (oz)", format: "number" },
      { key: "lyeConcentration", label: "Lye Concentration (%)", format: "percentage" },
    ],
    instructions: "Choose each oil and enter its weight (set unused oils to 0), your superfat (5% is common) and water as a percentage of oil weight. Always double-check with a second lye calculator before making soap.",
    examples: "Example: 16 oz olive oil, 8 oz coconut oil and 2 oz shea butter at 5% superfat need 3.69 oz of lye and 8.58 oz of water.",
    assumptions: "SAP values are typical NaOH values per ounce of oil. Lye = Σ(oil × SAP) × (1 − superfat). Water at 33% of oils is a common starting point (lye concentration about 25–33%). Safety: wear goggles and gloves, add lye to water (never water to lye) and work in a ventilated area.",
    faq: [
      { question: "What is superfat in soap making?", answer: "The percentage of oils left unsaponified for a milder, more moisturizing bar — usually 4–8%." },
      { question: "Can I use KOH instead of NaOH?", answer: "Not with these numbers — potassium hydroxide (for liquid soap) needs about 1.4× the SAP values of sodium hydroxide." },
    ],
  },
  {
    slug: "cross-stitch-size-calculator",
    title: "Cross Stitch Size Calculator",
    description: "Find the finished size of a cross-stitch design and how much fabric to cut — from the stitch count and Aida or evenweave fabric count — in inches and centimeters.",
    metaTitle: "Cross Stitch Size Calculator — Fabric Size",
    metaDescription: "Free cross stitch size calculator. Find finished design size and fabric to cut from stitch count and Aida or evenweave count.",
    calcInputs: [
      numberField("stitchesWide", "Design Width in Stitches", { default: 140, max: 5000 }),
      numberField("stitchesHigh", "Design Height in Stitches", { default: 100, max: 5000 }),
      dropdown("fabricCount", "Fabric Count", [["11-count Aida", 11], ["14-count Aida", 14], ["16-count Aida", 16], ["18-count Aida", 18], ["22-count Hardanger", 22], ["28-count evenweave over 2 (=14)", 14], ["32-count linen over 2 (=16)", 16]], 14),
      numberField("marginIn", "Margin on Each Side", { unit: "in", default: 3, max: 10, step: 0.5 }),
    ],
    calcResult: { label: "Design Width", format: "number" },
    calcResults: [
      { key: "designWidthIn", label: "Finished Design Width (in)", format: "number", highlight: true },
      { key: "designHeightIn", label: "Finished Design Height (in)", format: "number" },
      { key: "fabricWidthIn", label: "Fabric to Cut — Width (in)", format: "number" },
      { key: "fabricHeightIn", label: "Fabric to Cut — Height (in)", format: "number" },
      { key: "designWidthCm", label: "Design Width (cm)", format: "number" },
      { key: "designHeightCm", label: "Design Height (cm)", format: "number" },
    ],
    instructions: "Enter the pattern's stitch count (width × height, from the chart key), pick your fabric and add a margin for framing — 3 in per side is standard, more for large frames or mats.",
    examples: "Example: a 140 × 100 stitch design on 14-count Aida finishes at 10 × 7.14 in; cut fabric about 16 × 13.14 in.",
    assumptions: "Design size = stitches ÷ stitches per inch. Evenweave and linen are usually stitched over two threads, halving the count. Higher counts make smaller, finer designs.",
    faq: [
      { question: "How do I calculate cross-stitch size?", answer: "Divide the number of stitches by the fabric count — 140 stitches on 14-count is 10 inches." },
      { question: "How much extra fabric should I leave?", answer: "About 3 inches on each side for framing, or 2 inches for small hoop or ornament finishes." },
    ],
  },
  {
    slug: "dog-food-amount-calculator",
    title: "Dog Food Amount Calculator",
    description: "Find how much to feed your dog each day — calories and cups — by weight, life stage and activity, plus how long a bag lasts and the monthly cost.",
    metaTitle: "Dog Food Amount Calculator — Cups per Day",
    metaDescription: "Free dog food calculator. Find daily calories and cups of food by weight and activity, cups per meal, days per bag and monthly cost.",
    calcInputs: [
      numberField("weightLb", "Dog's Weight (Ideal)", { unit: "lb", default: 50, max: 250, step: 0.5 }),
      dropdown("lifeStage", "Life Stage / Activity", [["Neutered adult (1.6)", 1.6], ["Intact adult (1.8)", 1.8], ["Inactive / weight loss (1.2)", 1.2], ["Active / working (2.5)", 2.5], ["Puppy under 4 months (3.0)", 3], ["Puppy over 4 months (2.0)", 2], ["Senior (1.4)", 1.4]], 1.6),
      numberField("kcalPerCup", "Food Calories per Cup (on the Bag)", { unit: "kcal", default: 380, min: 200, max: 700 }),
      numberField("meals", "Meals per Day", { default: 2, min: 1, max: 4 }),
      numberField("bagLb", "Bag Size", { unit: "lb", default: 30, max: 60, step: 1 }),
      currencyField("bagPrice", "Bag Price", { default: 60, max: 300 }),
    ],
    calcResult: { label: "Cups per Day", format: "number" },
    calcResults: [
      { key: "cupsPerDay", label: "Cups per Day", format: "number", highlight: true },
      { key: "caloriesPerDay", label: "Calories per Day", format: "number" },
      { key: "cupsPerMeal", label: "Cups per Meal", format: "number" },
      { key: "daysPerBag", label: "Days a Bag Lasts", format: "number" },
      { key: "monthlyCost", label: "Monthly Food Cost", format: "currency" },
    ],
    instructions: "Enter your dog's ideal weight, life stage and activity, the calories per cup from the food bag, meals per day and the bag size and price. Adjust by 10% if your dog gains or loses weight.",
    examples: "Example: a 50 lb neutered adult dog needs about 1,164 calories — 3.06 cups a day of a 380 kcal/cup food; a 30 lb bag lasts about 39.18 days.",
    assumptions: "Daily calories = 70 × (weight in kg)^0.75 × life-stage factor (veterinary RER/MER method). About 4 cups of dry kibble per pound. Treats should be under 10% of calories. Ask your vet about puppies, pregnancy and medical conditions.",
    faq: [
      { question: "How much should I feed my dog?", answer: "It depends on weight, activity and the food's calories — a 50 lb adult dog usually needs about 1,100–1,300 calories, roughly 3 cups of typical kibble." },
      { question: "How do I know if I'm feeding my dog the right amount?", answer: "You should feel the ribs without pressing hard and see a waist from above — adjust portions by about 10% if not." },
    ],
  },
  {
    slug: "cat-food-amount-calculator",
    title: "Cat Food Amount Calculator",
    description: "Work out how much to feed your cat — daily calories, cups of dry food and cans of wet food — by weight and life stage, with a wet/dry mix and the monthly cost.",
    metaTitle: "Cat Food Amount Calculator — Wet & Dry",
    metaDescription: "Free cat food calculator. Find daily calories, cups of dry food and cans of wet food by weight and life stage, with monthly cost.",
    calcInputs: [
      numberField("weightLb", "Cat's Weight (Ideal)", { unit: "lb", default: 10, max: 30, step: 0.5 }),
      dropdown("lifeStage", "Life Stage", [["Neutered adult (1.2)", 1.2], ["Intact adult (1.4)", 1.4], ["Weight loss (0.8)", 0.8], ["Kitten (2.5)", 2.5], ["Senior (1.1)", 1.1]], 1.2),
      percentField("wetPercent", "Calories From Wet Food", { default: 50, max: 100 }),
      numberField("dryKcalPerCup", "Dry Food Calories per Cup", { unit: "kcal", default: 400, min: 250, max: 600 }),
      numberField("wetKcalPerCan", "Wet Food Calories per Can", { unit: "kcal", default: 180, min: 50, max: 400 }),
      currencyField("dryCostPerCup", "Dry Food Cost per Cup", { default: 0.45, max: 5, step: 0.05 }),
      currencyField("canPrice", "Price per Can", { default: 1.5, max: 10, step: 0.05 }),
    ],
    calcResult: { label: "Calories per Day", format: "number" },
    calcResults: [
      { key: "caloriesPerDay", label: "Calories per Day", format: "number", highlight: true },
      { key: "dryCupsPerDay", label: "Dry Food (Cups per Day)", format: "number" },
      { key: "wetCansPerDay", label: "Wet Food (Cans per Day)", format: "number" },
      { key: "dailyCost", label: "Daily Food Cost", format: "currency" },
      { key: "monthlyCost", label: "Monthly Food Cost", format: "currency" },
    ],
    instructions: "Enter your cat's ideal weight and life stage, the share of calories you want from wet food, and calories per cup and per can from the labels, plus prices.",
    examples: "Example: a 10 lb neutered cat needs about 261 calories a day; half from wet food is 0.73 cans plus 0.33 cups of dry — about $37.54 a month.",
    assumptions: "Daily calories = 70 × (weight in kg)^0.75 × life-stage factor. A 5.5 oz can is often 150–250 kcal and a cup of dry food 350–500 kcal — check your labels. Many vets recommend some wet food for hydration.",
    faq: [
      { question: "How much should I feed my cat per day?", answer: "A typical 10 lb neutered indoor cat needs about 220–270 calories a day." },
      { question: "Is wet or dry food better for cats?", answer: "Both can be complete diets; wet food adds moisture, while dry is cheaper and convenient — many owners feed a mix." },
    ],
  },
  {
    slug: "dog-crate-size-calculator",
    title: "Dog Crate Size Calculator",
    description: "Find the right dog crate size from your dog's length and sitting height — with the minimum interior dimensions and the standard crate size to buy.",
    metaTitle: "Dog Crate Size Calculator — What Size Crate?",
    metaDescription: "Free dog crate size calculator. Find the right crate size from your dog's length and height, with minimum inside dimensions.",
    calcInputs: [
      numberField("lengthIn", "Dog's Length (Nose to Base of Tail)", { unit: "in", default: 28, max: 60, step: 0.5 }),
      numberField("heightIn", "Height Sitting (Floor to Top of Head)", { unit: "in", default: 24, max: 50, step: 0.5 }),
      dropdown("puppy", "Still Growing?", [["No — adult", 0], ["Yes — puppy", 1]], 0),
    ],
    calcResult: { label: "Crate Size", format: "number" },
    calcResults: [
      { key: "recommendedCrateIn", label: "Crate Size to Buy (in, Length)", format: "number", highlight: true },
      { key: "minimumLengthIn", label: "Minimum Inside Length (in)", format: "number" },
      { key: "minimumHeightIn", label: "Minimum Inside Height (in)", format: "number" },
      { key: "useDivider", label: "Use a Divider Panel? (1 = Yes)", format: "number" },
    ],
    instructions: "Measure your dog standing from nose to the base of the tail, and sitting from the floor to the top of the head (or ear tips if taller). For puppies, use expected adult size and a divider.",
    examples: "Example: a dog 28 in long and 24 in tall sitting needs at least 32 × 27 in inside — buy a 36 in crate.",
    assumptions: "Add about 4 in to length and 3 in to height so the dog can stand, turn around and lie down. Standard crates: 18, 22, 24, 30, 36, 42, 48 and 54 in. Too large a crate can slow house-training, so use a divider for puppies.",
    faq: [
      { question: "How do I know what size crate my dog needs?", answer: "Measure length and sitting height, add 2–4 inches, and pick the next standard size up." },
      { question: "Can a dog crate be too big?", answer: "For house-training, yes — puppies may use one end as a bathroom, so divide the space until they're trained." },
    ],
  },
  {
    slug: "bird-cage-size-calculator",
    title: "Bird Cage Size Calculator",
    description: "Find the minimum bird cage size and bar spacing for finches, budgies, cockatiels, conures, African greys and macaws — and how much bigger to go for more birds.",
    metaTitle: "Bird Cage Size Calculator — Cage & Bar Spacing",
    metaDescription: "Free bird cage size calculator. Find minimum cage dimensions and bar spacing for your bird species and number of birds.",
    calcInputs: [
      dropdown("bird", "Bird", [["Finch / canary", 0], ["Budgie (parakeet)", 1], ["Cockatiel / lovebird", 2], ["Conure / caique", 3], ["African grey / Amazon", 4], ["Cockatoo / macaw", 5]], 1),
      numberField("birds", "Number of Birds", { default: 1, min: 1, max: 10 }),
    ],
    calcResult: { label: "Minimum Width", format: "number" },
    calcResults: [
      { key: "minimumWidthIn", label: "Minimum Cage Width (in)", format: "number", highlight: true },
      { key: "minimumDepthIn", label: "Minimum Depth (in)", format: "number" },
      { key: "minimumHeightIn", label: "Minimum Height (in)", format: "number" },
      { key: "barSpacingIn", label: "Bar Spacing (in)", format: "number", decimals: 3 },
      { key: "floorAreaSqIn", label: "Floor Area (sq in)", format: "number" },
    ],
    instructions: "Choose your bird species and how many will share the cage. Bigger is always better — these are minimums, and birds also need daily time out of the cage.",
    examples: "Example: one budgie needs a cage at least 18 × 18 × 24 in with 0.5 in bar spacing.",
    assumptions: "Minimums follow common avian-vet and rescue guidance; flight cages for finches should be wide rather than tall. Each additional bird adds about 50% width. Bar spacing must be small enough that the bird can't get its head through.",
    faq: [
      { question: "What size cage does a budgie need?", answer: "At least 18 × 18 × 24 in for one budgie, with bar spacing of about 1/2 inch — larger if possible." },
      { question: "Why does bar spacing matter?", answer: "Too-wide bars let birds get their heads stuck or escape; too-narrow bars on large birds can be chewed apart." },
    ],
  },
  {
    slug: "aquarium-size-calculator",
    title: "Aquarium Size Calculator",
    description: "Calculate an aquarium's volume in gallons and liters from its dimensions, its filled weight, how many inches of fish it can hold — and the tank size your fish need.",
    metaTitle: "Aquarium Size Calculator — Gallons & Stocking",
    metaDescription: "Free aquarium size calculator. Find tank gallons and liters from dimensions, filled weight, fish capacity and the tank size your fish need.",
    calcInputs: [
      numberField("lengthIn", "Tank Length", { unit: "in", default: 36, max: 240, step: 0.5 }),
      numberField("widthIn", "Tank Width (Front to Back)", { unit: "in", default: 13, max: 72, step: 0.5 }),
      numberField("heightIn", "Tank Height", { unit: "in", default: 16, max: 72, step: 0.5 }),
      numberField("fishCount", "Number of Fish", { default: 15, max: 1000 }),
      numberField("fishLengthIn", "Average Adult Fish Length", { unit: "in", default: 1.5, max: 36, step: 0.25 }),
      dropdown("stocking", "Stocking Level", [["Light (2 gal per inch)", 2], ["Standard (1 gal per inch)", 1], ["Heavy / planted, strong filter (0.75)", 0.75]], 1),
    ],
    calcResult: { label: "Tank Gallons", format: "number" },
    calcResults: [
      { key: "tankGallons", label: "Tank Volume (US Gallons)", format: "number", highlight: true },
      { key: "tankLiters", label: "Tank Volume (Liters)", format: "number" },
      { key: "filledWeightLb", label: "Filled Weight (lb, Approx.)", format: "number" },
      { key: "fishInchesCapacity", label: "Fish Capacity (Inches of Fish)", format: "number" },
      { key: "gallonsNeededForFish", label: "Gallons Your Fish Need", format: "number" },
    ],
    instructions: "Measure the tank's inside length, width and height in inches, then enter how many fish you want and their average adult size (not the size at the store).",
    examples: "Example: a 36 × 13 × 16 in tank holds about 32.42 gallons and weighs about 282 lb filled; 15 fish that grow to 1.5 in need about 22.5 gallons.",
    assumptions: "Gallons = L × W × H ÷ 231. Water is about 90% of the tank volume after gravel and decor; filled weight adds about 1.2 lb per gallon for glass, substrate and rock. The inch-per-gallon rule suits small community fish; large, messy or territorial fish need far more space.",
    faq: [
      { question: "How many fish can I put in a 20 gallon tank?", answer: "Roughly 15–20 inches of small adult fish under the 1-inch-per-gallon rule, fewer for large or messy species." },
      { question: "How heavy is a full aquarium?", answer: "About 10–12 lb per gallon including water, glass and gravel — a 55 gallon tank weighs over 600 lb." },
    ],
  },
  {
    slug: "aquarium-heater-size-calculator",
    title: "Aquarium Heater Size Calculator",
    description: "Find what wattage aquarium heater you need from tank size and the difference between room and target water temperature — with when to use two heaters and the running cost.",
    metaTitle: "Aquarium Heater Size Calculator — Watts Needed",
    metaDescription: "Free aquarium heater size calculator. Find the heater wattage for your tank from room and target temperature, with running cost.",
    calcInputs: [
      numberField("gallons", "Tank Size", { unit: "gal", default: 40, max: 500 }),
      numberField("roomF", "Coldest Room Temperature", { unit: "°F", default: 68, min: 40, max: 90 }),
      numberField("targetF", "Target Water Temperature", { unit: "°F", default: 78, min: 60, max: 90 }),
      currencyField("rate", "Electricity Rate per kWh", { default: 0.17, max: 1, step: 0.01, required: false }),
    ],
    calcResult: { label: "Heater Size", format: "number" },
    calcResults: [
      { key: "heaterSizeW", label: "Heater Size (W, Each)", format: "number", highlight: true },
      { key: "wattsNeeded", label: "Total Watts Needed", format: "number" },
      { key: "heaters", label: "Number of Heaters", format: "number" },
      { key: "monthlyElectricityCost", label: "Monthly Electricity Cost (Est.)", format: "currency" },
      { key: "temperatureRiseF", label: "Temperature Rise (°F)", format: "number" },
    ],
    instructions: "Enter your tank size, the coldest the room gets and your target water temperature (most tropical fish like 76–80°F).",
    examples: "Example: a 40 gallon tank heated from 68°F to 78°F needs about 200 W — a 200 W heater, costing about $7.44 a month to run.",
    assumptions: "Rule of thumb: about 0.5 W per gallon per °F of temperature rise (roughly 3–5 W per gallon for typical rooms). Tanks over 75 gallons use two heaters for even heat and backup. Running cost assumes the heater is on about 30% of the time; lids reduce heat loss.",
    faq: [
      { question: "What size heater do I need for a 20 gallon tank?", answer: "About 75–100 W if the room is around 68°F and you want 78°F water." },
      { question: "Should I use two aquarium heaters?", answer: "For large tanks, yes — two smaller heaters spread heat evenly, and if one fails the other prevents a dangerous temperature drop." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
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
