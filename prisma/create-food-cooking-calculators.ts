// One-time (but safe to re-run) batch setup script: creates 20 cooking-time, meat and curing
// calculators (Food & Drink Calculators > Cooking Time, Meat & Curing Calculators). Formulas and
// USDA tables live in src/lib/calc-engine-food-cooking.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-food-drink-category.ts --apply)
//   npx tsx prisma/create-food-cooking-calculators.ts
// or
//   npm run db:create-food-cooking-calculators

import * as E from "../src/lib/calc-engine-food-cooking";

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

function dateField(key: string, label: string, def: string) {
  return { key, label, type: "date", required: true, default: def };
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

const CK = "cooking-time-meat-curing-calculators";
const NOTES: Record<string, string> = {
  [CK]: "Times are estimates — ovens, smokers and cuts vary, so always check doneness with a meat thermometer. USDA safe minimums: poultry 165 °F, ground meat 160 °F, whole cuts of beef, pork and lamb 145 °F with a 3-minute rest.",
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

const WUNIT = dropdown("weightUnit", "Weight Unit", opts(["Pounds (lb)", "Kilograms (kg)"]), 0);
const DONE = (def = 1) => dropdown("doneness", "Doneness", opts(E.DONENESS.map(([n, p, f]) => `${n} (pull ${p} °F → ${f} °F)`)), def);
const DAY0 = 20763; // 6 Nov 2026 as a day number, for the worked examples only

const TOOLS: ToolDef[] = [
  mk({
    slug: "brine-calculator", cat: CK, title: "Brine Calculator (Salt, Sugar & Brining Time)",
    desc: "Make a wet brine for turkey, chicken, pork or seafood — grams and cups of salt for your salt brand, sugar, and how long to brine by weight and brine strength.",
    meta: "Brine Calculator — Salt per Gallon & Turkey Brine Time",
    inputs: [dropdown("volumeUnit", "Water Unit", opts(["US gallons", "Liters"]), 0), num("water", "Water", 2, 1000, 0.25), pct("salinity", "Brine Strength (salt % of brine; 5–6% standard)", 6, 26, 0.5), pct("sugarPercent", "Sugar (% of water, optional)", 3, 20, 0.5), dropdown("saltType", "Salt You Are Using", opts(E.SALTS.map(([n]) => n)), 0), dropdown("food", "What You Are Brining", opts(E.BRINE_FOODS.map(([n]) => n)), 0), WUNIT, num("meatWeight", "Weight of the Meat", 14, 100, 0.5)],
    results: [["saltGrams", "Salt (grams)", "n"], ["saltCups", "Salt (cups, your brand)", "n"], ["saltTablespoons", "Salt (tablespoons)", "n"], ["sugarGrams", "Sugar (grams)", "n"], ["sugarCups", "Sugar (cups)", "n"], ["brineHours", "Brining Time (hours)", "n"], ["waterLiters", "Water (liters)", "n"]],
    fn: E.brine, ex: { volumeUnit: 0, water: 2, salinity: 6, sugarPercent: 3, saltType: 0, food: 0, weightUnit: 0, meatWeight: 14 },
    exText: (o) => `Example: a 6% turkey brine with 2 gallons of water takes ${fmt(o.saltGrams, 0)} g of salt — ${o.saltCups} cups of Diamond Crystal kosher — and a 14 lb bird brines for about ${o.brineHours} hours.`,
    how: "Choose your salt brand — this matters: a cup of table salt is more than twice as salty as a cup of Diamond Crystal. Dissolve salt and sugar in part of the water, cool completely and keep the meat below 40 °F while it brines.\n\nRinse and pat dry afterwards. Do not brine kosher, 'enhanced' or self-basting turkeys — they are already salted.",
    assume: "Salt = water × S ÷ (1 − S), where S is the brine strength. Times are for a 6% brine; stronger brines are faster, weaker ones slower. Salt densities: Diamond Crystal 135 g/cup, Morton kosher 230 g/cup, table salt 288 g/cup.",
    faq: [["How much salt per gallon for a turkey brine?", "About 1 cup of Morton kosher or 1½–2 cups of Diamond Crystal per gallon (5–6%)."], ["How long should I brine a turkey?", "About 1 hour per pound, 12–24 hours for a whole bird — no longer, or it gets too salty."]],
  }),
  mk({
    slug: "turkey-cook-time-calculator", cat: CK, title: "Turkey Cooking Time Calculator (Whole, Breast & Spatchcock)",
    desc: "Find how long to roast a turkey by weight — whole unstuffed or stuffed at 325 °F, bone-in turkey breast, or spatchcocked at 450 °F — with when to start checking, resting time and servings.",
    meta: "Turkey Cook Time Calculator — How Long to Cook a Turkey",
    inputs: [WUNIT, num("weight", "Turkey Weight", 14, 60, 0.5, 1), dropdown("style", "How You Are Cooking It", opts(["Whole, unstuffed (325 °F)", "Whole, stuffed (325 °F)", "Bone-in breast (325 °F)", "Spatchcocked (450 °F)"]), 0)],
    results: [["totalHours", "Roasting Time (hours)", "n"], ["totalMinutes", "Roasting Time (minutes)", "n"], ["ovenTempF", "Oven Temperature (°F)", "n"], ["checkTempAtMinutes", "Start Checking the Temperature At (minutes)", "n"], ["restMinutes", "Rest Before Carving (minutes)", "n"], ["startBeforeServingHours", "Put It In This Many Hours Before Serving", "n"], ["servings", "Servings", "n"]],
    fn: E.turkeyCook, ex: { weightUnit: 0, weight: 14, style: 0 },
    exText: (o) => `Example: a 14 lb unstuffed turkey roasts for about ${o.totalHours} hours at 325 °F. Start checking at ${o.checkTempAtMinutes} minutes and put it in the oven about ${o.startBeforeServingHours} hours before dinner.`,
    how: "Enter the thawed weight and how you are cooking it. The turkey is done when the thickest part of the breast reads 165 °F; thighs are better at 175 °F. Stuffing must also reach 165 °F.\n\nSpatchcocking (removing the backbone and flattening the bird) cuts the time by more than half.",
    assume: "USDA roasting chart at 325 °F, interpolated between weight bands (e.g. 12–14 lb 3–3¾ h unstuffed, 3½–4 h stuffed). Spatchcocked about 7 minutes per pound at 450 °F. About 1¼ lb of whole turkey per person.",
    faq: [["How long to cook a 20 lb turkey?", "About 4½ hours unstuffed, or 4¾ hours stuffed, at 325 °F."], ["Should I cook a turkey at 325 or 350?", "325 °F is the USDA standard; 350 °F works and takes about 10–15% less time."]],
  }),
  mk({
    slug: "prime-rib-calculator", cat: CK, title: "Prime Rib Calculator (Cooking Time & Temperature)",
    desc: "Work out how long to cook a prime rib (standing rib roast) by weight and doneness — classic 325 °F roast, low-and-slow reverse sear or the 500 °F closed-oven method — with pull temperature, servings and bones.",
    meta: "Prime Rib Calculator — Cooking Time per Pound & Pull Temperature",
    inputs: [WUNIT, num("weight", "Roast Weight", 8, 40, 0.25, 1), DONE(1), dropdown("method", "Method", opts(["Classic roast at 325 °F", "Reverse sear (250 °F, then sear at 500 °F)", "Closed-oven (500 °F, then oven off 2 h)"]), 0), dropdown("boneIn", "Bone-In?", opts(["Boneless", "Bone-in (standing rib)"]), 1)],
    results: [["totalHours", "Cooking Time (hours)", "n"], ["totalMinutes", "Cooking Time (minutes)", "n"], ["pullTempF", "Pull From Oven At (°F)", "n"], ["finalTempF", "Final Temperature After Rest (°F)", "n"], ["restMinutes", "Rest (minutes)", "n"], ["servings", "Servings", "n"], ["ribBones", "Approx. Number of Ribs", "n"]],
    fn: E.primeRib, ex: { weightUnit: 0, weight: 8, doneness: 1, method: 0, boneIn: 1 },
    exText: (o) => `Example: an 8 lb bone-in prime rib for medium-rare roasts about ${o.totalHours} hours at 325 °F — pull it at ${o.pullTempF} °F. It serves about ${o.servings} people.`,
    how: "Bring the roast out of the fridge an hour ahead, season well and use a probe thermometer in the centre. Pull it 5–10 °F below your final temperature — it keeps rising as it rests.\n\nWith the closed-oven method do not open the door during the 2 hours.",
    assume: "Minutes per pound at 325 °F: rare 13, medium-rare 15, medium 17, medium-well 19, well 21. Reverse sear at 250 °F about 30–45 min/lb plus a 10-minute sear. Closed-oven: 5 min/lb at 500 °F then 2 hours off. Allow 1 lb bone-in (½ lb boneless) per person.",
    faq: [["How long to cook prime rib per pound?", "About 15 minutes per pound at 325 °F for medium-rare."], ["What temperature should I pull prime rib?", "At 125–130 °F for medium-rare; it rises to about 135 °F while resting."]],
  }),
  mk({
    slug: "meat-smoking-calculator", cat: CK, title: "Meat Smoking Time Calculator",
    desc: "Estimate how long to smoke brisket, pork butt, ribs, chicken, turkey, salmon or tri-tip at 225, 250 or 275 °F — with or without wrapping — and when to start so it is ready to serve.",
    meta: "Meat Smoking Calculator — Smoking Time per Pound & Start Time",
    inputs: [dropdown("meat", "Meat", opts(E.SMOKE_MEATS.map(([n]) => n)), 1), WUNIT, num("weight", "Weight (ignored for ribs)", 8, 100, 0.25), dropdown("smokerTemp", "Smoker Temperature", opts(["225 °F", "250 °F", "275 °F"]), 0), dropdown("wrap", "Wrap in Foil or Paper (Texas crutch)?", opts(["No", "Yes"]), 0)],
    results: [["smokeHours", "Smoking Time (hours)", "n"], ["smokeMinutes", "Smoking Time (minutes)", "n"], ["targetInternalF", "Target Internal Temperature (°F)", "n"], ["restHours", "Rest (hours)", "n"], ["startBeforeServingHours", "Start This Many Hours Before Serving", "n"], ["smokerTempF", "Smoker Temperature (°F)", "n"]],
    fn: E.meatSmoking, ex: { meat: 1, weightUnit: 0, weight: 8, smokerTemp: 0, wrap: 0 },
    exText: (o) => `Example: an 8 lb pork butt at 225 °F takes about ${o.smokeHours} hours to reach ${o.targetInternalF} °F. Start about ${o.startBeforeServingHours} hours before you want to eat.`,
    how: "Pick the meat, weight and smoker temperature. Big cuts often stall for hours around 150–170 °F — wrapping pushes through faster. Cook to temperature and tenderness, not the clock.\n\nBuild in an extra hour or two; a rested brisket or butt holds for hours wrapped in a cooler.",
    assume: "Hours per lb at 225 °F: brisket 1.5, pork butt 1.5, beef ribs 1.25, chicken 0.75, turkey 0.6, pork loin 0.75, salmon 0.5, tri-tip 0.75; rib racks 5–6 hours. 250 °F ≈ 20% faster, 275 °F ≈ 33% faster; wrapping ≈ 15% faster.",
    faq: [["How long to smoke a pork shoulder?", "About 1½ hours per pound at 225 °F — 12 hours for an 8 lb butt."], ["What is the stall?", "Evaporative cooling stops the temperature rising for hours in the 150s–160s °F; wrapping helps."]],
  }),
  mk({
    slug: "curing-salt-calculator", cat: CK, title: "Curing Salt Calculator (Prague Powder / Pink Salt)",
    desc: "Calculate how much Prague Powder #1 or #2 (pink curing salt) to use for a dry rub, ground meat and sausage, or a pastrami / corned beef brine, with salt and the ingoing nitrite level.",
    meta: "Curing Salt Calculator — How Much Pink Salt per Pound",
    inputs: [dropdown("method", "How You Are Curing", opts(["Dry rub (bacon, ham, jerky)", "Ground meat / sausage", "Brine (pastrami, corned beef)"]), 0), WUNIT, num("meatWeight", "Meat Weight", 5, 1000, 0.1), dropdown("volumeUnit", "Brine Water Unit (brine only)", opts(["US gallons", "Liters"]), 0), num("water", "Brine Water (brine only)", 1, 100, 0.1), pct("saltPercent", "Total Salt Target (% of weight)", 2.5, 10, 0.1)],
    results: [["cureGrams", "Curing Salt #1 / #2 (grams)", "n"], ["cureTeaspoons", "Curing Salt (level teaspoons)", "n"], ["ingoingNitritePpm", "Ingoing Nitrite (ppm)", "n"], ["saltGrams", "Additional Salt (grams)", "n"], ["totalWeightGrams", "Total Weight Cured (g)", "n"], ["brineCureTime", "Brining Time (days, brine only)", "n"]],
    fn: E.curingSalt, ex: { method: 0, weightUnit: 0, meatWeight: 5, volumeUnit: 0, water: 1, saltPercent: 2.5 },
    exText: (o) => `Example: 5 lb of pork belly needs ${o.cureGrams} g (about ${o.cureTeaspoons} tsp) of Prague Powder #1 — about ${o.ingoingNitritePpm} ppm nitrite — plus ${fmt(o.saltGrams, 0)} g of salt.`,
    how: "Use Prague Powder #1 for anything cured for days to weeks and then cooked or smoked (bacon, ham, pastrami, sausage). Use #2 only for long dry-cured products like salami and prosciutto.\n\nWeigh curing salt with a gram scale — it is toxic in large amounts. Never use it as table salt.",
    assume: "Curing salt at 0.25% of the total weight (meat, plus water in a brine) — about 1 level tsp (5.5 g) per 5 lb, giving ≈156 ppm ingoing nitrite. Curing salt is 6.25% sodium nitrite and 93.75% salt, which is subtracted from the extra salt.",
    faq: [["How much pink salt per pound of meat?", "About 1.1 g (¼ tsp) per pound, or 1 tsp per 5 lb."], ["What is the difference between Prague Powder #1 and #2?", "#2 also contains sodium nitrate for long, uncooked dry curing; #1 is for everything else."]],
  }),
  mk({
    slug: "ham-cooking-time-calculator", cat: CK, title: "Ham Cooking Time Calculator",
    desc: "Find how long to bake a ham at 325 °F by weight and type — fully cooked or cook-before-eating, whole, half, spiral-cut, boneless or fresh — with the target temperature and when to glaze.",
    meta: "Ham Cooking Time Calculator — Minutes per Pound at 325 °F",
    inputs: [dropdown("hamType", "Type of Ham", opts(E.HAMS.map(([n]) => n)), 2), WUNIT, num("weight", "Ham Weight", 8, 40, 0.25, 1)],
    results: [["totalHours", "Baking Time (hours)", "n"], ["totalMinutes", "Baking Time (minutes)", "n"], ["minMinutes", "Shortest Time (minutes)", "n"], ["maxMinutes", "Longest Time (minutes)", "n"], ["targetTempF", "Target Internal Temperature (°F)", "n"], ["servings", "Servings", "n"], ["glazeAtMinutes", "Add Glaze At (minutes)", "n"]],
    fn: E.hamCooking, ex: { hamType: 2, weightUnit: 0, weight: 8 },
    exText: (o) => `Example: an 8 lb fully cooked spiral ham takes about ${o.totalHours} hours at 325 °F to reach ${o.targetTempF} °F. Glaze it at about ${o.glazeAtMinutes} minutes.`,
    how: "Check the label: 'fully cooked' hams only need reheating to 140 °F; 'cook before eating' and fresh hams must reach 145 °F. Cover spiral hams with foil so they do not dry out.",
    assume: "USDA timetable at 325 °F (minutes per lb): fully cooked whole 15–18, half 18–24, spiral 10–14, boneless 10–15; cook-before-eating whole 18–20, half 22–25, shank or butt 35–40; fresh ham 22–26. About ½ lb bone-in (⅓ lb boneless) per person.",
    faq: [["How long to cook a spiral ham?", "About 10–14 minutes per pound at 325 °F — 1½ to 2 hours for an 8 lb ham."], ["What temperature should ham be cooked to?", "140 °F for fully cooked ham, 145 °F for raw or cook-before-eating ham."]],
  }),
  mk({
    slug: "brisket-calculator", cat: CK, title: "Brisket Calculator (Smoking Time & Cooked Yield)",
    desc: "Plan a smoked brisket: cooking time by weight and smoker temperature, wrapped or not, plus trimmed and cooked weight, servings and when to start.",
    meta: "Brisket Calculator — Smoking Time per Pound & Cooked Yield",
    inputs: [WUNIT, num("weight", "Untrimmed Brisket Weight", 14, 40, 0.25, 1), dropdown("smokerTemp", "Smoker Temperature", opts(["225 °F", "250 °F", "275 °F"]), 1), dropdown("wrap", "Wrap (Texas crutch)?", opts(["No", "Yes — foil or butcher paper"]), 1), pct("trimPercent", "Trim Loss", 20, 50, 1), pct("cookedYield", "Cooked Yield of Trimmed Weight", 60, 80, 1)],
    results: [["cookHours", "Smoking Time (hours)", "n"], ["cookedWeightLb", "Cooked Brisket (lb)", "n"], ["servings", "Servings (⅓ lb each)", "n"], ["restHours", "Rest (hours)", "n"], ["startBeforeServingHours", "Start This Many Hours Before Serving", "n"], ["trimmedWeightLb", "Trimmed Weight (lb)", "n"], ["targetInternalF", "Probe-Tender Around (°F)", "n"]],
    fn: E.brisket, ex: { weightUnit: 0, weight: 14, smokerTemp: 1, wrap: 1, trimPercent: 20, cookedYield: 60 },
    exText: (o) => `Example: a 14 lb packer smoked at 250 °F and wrapped takes about ${o.cookHours} hours, gives about ${o.cookedWeightLb} lb of cooked brisket and feeds ${o.servings} people.`,
    how: "Weigh the brisket before trimming. It is done when a probe slides in like butter, usually around 200–205 °F. Rest at least an hour (up to 4 in a cooler) before slicing against the grain.",
    assume: "About 1½ h/lb at 225 °F, 1¼ h/lb at 250 °F and 1 h/lb at 275 °F; wrapping saves about 15%. A packer loses 15–25% when trimmed and 40% of the trimmed weight while cooking.",
    faq: [["How long does it take to smoke a brisket?", "About 1–1½ hours per pound — 12–18 hours for a whole packer."], ["How much brisket per person?", "About ⅓–½ lb cooked, or 1 lb raw untrimmed."]],
  }),
  mk({
    slug: "leg-of-lamb-cooking-time-calculator", cat: CK, title: "Leg of Lamb Cooking Time Calculator",
    desc: "Find how long to roast a leg of lamb at 325 °F by weight and doneness — bone-in or boneless — with pull temperature, resting time and servings.",
    meta: "Leg of Lamb Cooking Time Calculator — Minutes per Pound",
    inputs: [WUNIT, num("weight", "Leg of Lamb Weight", 6, 20, 0.25, 1), dropdown("cut", "Cut", opts(["Bone-in", "Boneless (rolled and tied)"]), 0), dropdown("doneness", "Doneness", opts(["Medium-rare (145 °F)", "Medium (150–155 °F)", "Well done (160 °F)"]), 0)],
    results: [["totalHours", "Roasting Time (hours)", "n"], ["totalMinutes", "Roasting Time (minutes)", "n"], ["pullTempF", "Pull From the Oven At (°F)", "n"], ["finalTempF", "Temperature After Resting (°F)", "n"], ["minutesPerLb", "Minutes per Pound", "n"], ["restMinutes", "Rest (minutes)", "n"], ["servings", "Servings", "n"]],
    fn: E.lambLeg, ex: { weightUnit: 0, weight: 6, cut: 0, doneness: 0 },
    exText: (o) => `Example: a 6 lb bone-in leg of lamb roasts for about ${o.totalHours} hours at 325 °F for medium-rare — pull it at ${o.pullTempF} °F.`,
    how: "Rub the lamb with garlic, rosemary and oil, roast at 325 °F and check the thickest part away from the bone. Let it rest 15 minutes before carving.",
    assume: "USDA lamb chart at 325 °F: bone-in 20–25 min/lb medium-rare, 25–30 medium, 30–35 well done; boneless about 5 min/lb longer. About ⅔ lb bone-in or ⅖ lb boneless per person.",
    faq: [["How long to cook a leg of lamb per pound?", "About 20–25 minutes per pound at 325 °F for medium-rare."], ["What temperature is lamb done?", "145 °F with a 3-minute rest is the USDA minimum; many cooks prefer 135–140 °F for pink."]],
  }),
  mk({
    slug: "raw-to-cooked-calculator", cat: CK, title: "Raw to Cooked Weight Calculator (Meat, Rice & Pasta)",
    desc: "Convert raw weight to cooked weight — or cooked back to raw — for chicken, beef, pork, fish, bacon, rice, pasta, quinoa, oats and beans, and adjust calories and protein for meal tracking.",
    meta: "Raw to Cooked Calculator — Meat, Rice & Pasta Weight Conversion",
    inputs: [dropdown("food", "Food", opts(E.YIELDS.map(([n]) => n)), 2), dropdown("direction", "Convert", opts(["Raw → cooked", "Cooked → raw"]), 0), num("weight", "Weight (any unit)", 200, 100000, 1), num("caloriesPer100Raw", "Calories per 100 g Raw (optional)", 120, 1000, 1), num("proteinPer100Raw", "Protein per 100 g Raw (optional, g)", 22.5, 100, 0.1)],
    results: [["cookedWeight", "Cooked Weight", "n"], ["rawWeight", "Raw Weight", "n"], ["yieldPercent", "Cooked Yield (% of raw)", "n"], ["changeWeight", "Weight Change", "n"], ["caloriesPer100Cooked", "Calories per 100 g Cooked", "n"], ["proteinPer100Cooked", "Protein per 100 g Cooked (g)", "n"]],
    fn: E.rawToCooked, ex: { food: 2, direction: 0, weight: 200, caloriesPer100Raw: 120, proteinPer100Raw: 22.5 },
    exText: (o) => `Example: 200 g of raw chicken breast cooks down to about ${o.cookedWeight} g, so 100 g cooked has about ${fmt(o.caloriesPer100Cooked, 0)} calories and ${fmt(o.proteinPer100Cooked, 1)} g protein.`,
    how: "Choose the food and direction and enter the weight in any unit — the answer is in the same unit. For tracking, enter the raw nutrition from the package label to get values per cooked gram.\n\nMeat loses water and fat; grains and pasta absorb water.",
    assume: "Typical USDA cooking yields (cooked ÷ raw): ground beef 75%, steak 72%, chicken breast 75%, thigh 70%, pork 72%, pulled pork 60%, brisket 55%, bacon 33%, fish 82%; white rice ×3, brown rice ×2.6, pasta ×2.25, quinoa ×2.75, oats ×2.5, beans ×2.4. Your method and doneness change the yield.",
    faq: [["How much does chicken shrink when cooked?", "About 25% of its raw weight."], ["How much does rice expand?", "White rice roughly triples in weight — 100 g dry becomes about 300 g cooked."]],
  }),
  mk({
    slug: "sirloin-roast-cooking-time-calculator", cat: CK, title: "Sirloin Roast Cooking Time Calculator",
    desc: "Find how long to cook a top sirloin or sirloin tip roast by weight and doneness at 325 or 350 °F, with pull temperature, rest time and servings.",
    meta: "Sirloin Roast Cooking Time Calculator — Minutes per Pound",
    inputs: [WUNIT, num("weight", "Roast Weight", 3, 20, 0.25, 0.5), DONE(1), dropdown("ovenTemp", "Oven Temperature", opts(["325 °F", "350 °F"]), 0)],
    results: [["totalHours", "Cooking Time (hours)", "n"], ["totalMinutes", "Cooking Time (minutes)", "n"], ["pullTempF", "Pull From the Oven At (°F)", "n"], ["finalTempF", "Final Temperature (°F)", "n"], ["minutesPerLb", "Minutes per Pound", "n"], ["restMinutes", "Rest (minutes)", "n"], ["servings", "Servings", "n"]],
    fn: E.sirloinRoast, ex: { weightUnit: 0, weight: 3, doneness: 1, ovenTemp: 0 },
    exText: (o) => `Example: a 3 lb sirloin roast for medium-rare takes about ${o.totalMinutes} minutes at 325 °F — pull it at ${o.pullTempF} °F.`,
    how: "Sear the roast first if you like, then roast and check with a thermometer. Sirloin is lean, so it is best at rare to medium; slice thinly against the grain.",
    assume: "Approximate minutes per pound at 325 °F: rare 20, medium-rare 25, medium 30, medium-well 33, well 35; at 350 °F about 15% less. About ½ lb raw per person.",
    faq: [["How long to cook a 3 lb sirloin roast?", "About 75 minutes at 325 °F for medium-rare."], ["Should I cover a sirloin roast?", "No — roast it uncovered so the outside browns."]],
  }),
  mk({
    slug: "15-minutes-per-pound-calculator", cat: CK, title: "Minutes per Pound Cooking Calculator (15 Minutes per Pound)",
    desc: "Work out total roasting time for any 'minutes per pound' rule — 15 minutes per pound, 20 minutes per pound plus 20, or per 500 g — with resting time and when to start.",
    meta: "15 Minutes per Pound Calculator — Roasting Time by Weight",
    inputs: [dropdown("weightUnit", "Weight Unit", opts(["Pounds (minutes per lb)", "Kilograms (minutes per 500 g)"]), 0), num("weight", "Weight", 6, 100, 0.25), num("minutesPerUnit", "Minutes per Pound (or per 500 g)", 15, 120, 1), num("extraMinutes", "Extra Minutes ('plus 15 minutes')", 0, 240, 1), num("restMinutes", "Resting Time (minutes)", 15, 120, 1), num("preheatMinutes", "Preheat / Prep Time (minutes)", 15, 120, 1)],
    results: [["totalMinutes", "Cooking Time (minutes)", "n"], ["totalHours", "Cooking Time (hours)", "n"], ["withRestMinutes", "Cooking + Resting (minutes)", "n"], ["startBeforeServingHours", "Start This Many Hours Before Serving", "n"], ["checkAtMinutes", "First Temperature Check At (minutes)", "n"]],
    fn: E.perPound, ex: { weightUnit: 0, weight: 6, minutesPerUnit: 15, extraMinutes: 0, restMinutes: 15, preheatMinutes: 15 },
    exText: (o) => `Example: a 6 lb roast at 15 minutes per pound takes ${o.totalMinutes} minutes (${o.totalHours} hours); with resting and preheating, start ${o.startBeforeServingHours} hours before serving.`,
    how: "Enter the weight and the rule from your recipe. Classic rules: beef rare 15 min/lb + 15, medium 20 min/lb + 20; pork 25 min/lb + 25; chicken 20 min/lb + 20 (at about 350–375 °F).\n\nWith metric recipes, enter minutes per 500 g.",
    assume: "Time = weight × minutes per unit + extra. Rules of thumb assume a roast at fridge temperature and a correctly heated oven; always confirm with a thermometer.",
    faq: [["How long does a 5 lb roast take at 15 minutes per pound?", "75 minutes, plus resting time."], ["Is 15 minutes per pound enough for a turkey?", "Roughly 13–15 min/lb at 325 °F works for an unstuffed turkey; check it reaches 165 °F."]],
  }),
  mk({
    slug: "equilibrium-cure-calculator", cat: CK, title: "Equilibrium Cure Calculator (Dry-Cure Bacon & Meat)",
    desc: "Make an equilibrium dry cure for bacon, pancetta, ham or duck — exact salt, sugar and pink curing salt by meat weight — and how many days to cure by thickness.",
    meta: "Equilibrium Cure Calculator — Dry Cure Bacon Salt & Sugar",
    inputs: [WUNIT, num("meatWeight", "Meat Weight", 5, 500, 0.1), pct("saltPercent", "Salt (% of meat; 2–3% typical)", 2.5, 5, 0.1), pct("sugarPercent", "Sugar (% of meat)", 1, 10, 0.1), pct("pepperPercent", "Black Pepper / Spices (% of meat, optional)", 0.5, 5, 0.1), dropdown("useCure", "Add Prague Powder #1?", opts(["No", "Yes (0.25%)"]), 1), dropdown("thicknessUnit", "Thickness Unit", opts(["Inches", "Millimeters"]), 0), num("thickness", "Thickness of the Meat", 1.5, 200, 0.1)],
    results: [["saltGrams", "Salt (grams)", "n"], ["sugarGrams", "Sugar (grams)", "n"], ["cureGrams", "Prague Powder #1 (grams)", "n"], ["cureTeaspoons", "Prague Powder #1 (teaspoons)", "n"], ["cureDays", "Curing Time (days)", "n"], ["meatGrams", "Meat Weight (grams)", "n"], ["pepperGrams", "Pepper / Spices (grams)", "n"]],
    fn: E.equilibriumCure, ex: { weightUnit: 0, meatWeight: 5, saltPercent: 2.5, sugarPercent: 1, pepperPercent: 0.5, useCure: 1, thicknessUnit: 0, thickness: 1.5 },
    exText: (o) => `Example: a 5 lb pork belly for bacon takes ${fmt(o.saltGrams, 0)} g salt, ${fmt(o.sugarGrams, 0)} g sugar and ${o.cureGrams} g Prague Powder #1, cured for about ${o.cureDays} days.`,
    how: "Weigh the meat, mix the cure and rub it on all sides. Vacuum-seal or bag it and refrigerate, flipping daily. Because the salt is measured for the meat's weight, it cannot over-salt — longer curing just evens it out.\n\nRinse, dry and smoke or roast to finish.",
    assume: "Equilibrium curing: salt, sugar and cure as percentages of the meat weight. Prague Powder #1 at 0.25% (156 ppm nitrite); its salt content is subtracted from the added salt. Time ≈ 1 day per ¼ inch of thickness + 1 day.",
    faq: [["How much salt for an equilibrium cure?", "2–3% of the meat's weight — 2.5% is a common bacon level."], ["How long to cure bacon?", "About 7 days for a 1½-inch belly in the fridge."]],
  }),
  mk({
    slug: "venison-to-fat-ratio-calculator", cat: CK, title: "Venison to Fat Ratio Calculator (Grinding Burger & Sausage)",
    desc: "Find how much pork or beef fat to add to lean venison or other game for 80/20, 85/15 or any lean-to-fat ratio when grinding burger or sausage.",
    meta: "Venison to Fat Ratio Calculator — How Much Fat to Add",
    inputs: [WUNIT, num("venisonWeight", "Venison / Game Meat Weight", 10, 1000, 0.1), pct("venisonFatPercent", "Fat Already in the Venison", 3, 30, 0.5), pct("targetFatPercent", "Target Fat in the Blend (20% = 80/20)", 20, 50, 0.5), dropdown("fatSource", "Fat You Are Adding", opts(E.FAT_SOURCES.map(([n]) => n)), 0)],
    results: [["fatToAdd", "Fat to Add", "n"], ["totalBatch", "Total Batch Weight", "n"], ["finalFatPercent", "Final Fat (%)", "n"], ["fatShareOfBatch", "Added Fat as Share of Batch (%)", "n"], ["pattiesQuarterLb", "Quarter-Pound Patties", "n"]],
    fn: E.venisonFat, ex: { weightUnit: 0, venisonWeight: 10, venisonFatPercent: 3, targetFatPercent: 20, fatSource: 0 },
    exText: (o) => `Example: 10 lb of venison at 3% fat needs ${o.fatToAdd} lb of pork back fat for an 80/20 blend — ${o.totalBatch} lb in all.`,
    how: "Enter the lean weight and choose your fat. Pork fat gives a milder flavour and softer texture; beef fat suits burgers. Keep meat and fat almost frozen when grinding.\n\nIf you add pork butt instead of pure fat, you need much more of it, because it is only about 25% fat.",
    assume: "Solves (venison × its fat + added × fat %) ÷ total = target. Fat contents are typical: back fat 85%, trimmings 70–75%, pork butt 25%, bacon ends 45%.",
    faq: [["What is the best fat ratio for venison burger?", "80/20 or 85/15 for burgers; 70/30 to 75/25 for sausage."], ["How much pork fat per pound of venison?", "About 0.25 lb of back fat per pound of venison for 80/20."]],
  }),
  mk({
    slug: "steak-calculator", cat: CK, title: "Steak Cooking Time Calculator (by Thickness & Doneness)",
    desc: "Find how long to cook a steak per side on a grill or in a pan — or in the oven for a reverse sear — by thickness and doneness, with pull and final temperatures.",
    meta: "Steak Calculator — Cooking Time per Side by Thickness",
    inputs: [dropdown("thicknessUnit", "Thickness Unit", opts(["Inches", "Centimeters"]), 0), num("thickness", "Steak Thickness", 1, 10, 0.25, 0.25), DONE(1), dropdown("method", "Method", opts(["Grill (high direct heat)", "Pan sear (cast iron)", "Reverse sear (oven at 250 °F, then sear)"]), 0)],
    results: [["minutesPerSide", "Minutes per Side", "n"], ["totalMinutes", "Total Cooking Time (minutes)", "n"], ["pullTempF", "Pull at (°F)", "n"], ["finalTempF", "Final Temperature After Rest (°F)", "n"], ["restMinutes", "Rest (minutes)", "n"], ["reverseSearOvenMinutes", "Oven Time Before Searing (reverse sear)", "n"]],
    fn: E.steak, ex: { thicknessUnit: 0, thickness: 1, doneness: 1, method: 0 },
    exText: (o) => `Example: a 1-inch steak for medium-rare on a hot grill takes about ${o.minutesPerSide} minutes per side — pull it at ${o.pullTempF} °F.`,
    how: "Let the steak sit out 30 minutes, pat dry and season. Cook over high heat, flipping once (or every minute for an even crust). For steaks 1½ inches or thicker, the reverse sear gives the most even doneness.",
    assume: "Base times per side for a 1-inch steak over high heat: rare 3, medium-rare 4, medium 5, medium-well 6, well 7 minutes, scaled by thickness. Pull 5 °F early for carry-over.",
    faq: [["How long to cook a steak for medium-rare?", "About 4 minutes per side for a 1-inch steak on a hot grill."], ["What temperature is medium-rare?", "130–135 °F after resting."]],
  }),
  mk({
    slug: "chicken-cooking-time-calculator", cat: CK, title: "Chicken Cooking Time Calculator (Oven, Air Fryer & Grill)",
    desc: "Find how long to cook chicken — whole, breasts, thighs, drumsticks, wings or tenders — in the oven, air fryer or on the grill, until it reaches 165 °F.",
    meta: "Chicken Cooking Time Calculator — Oven, Air Fryer & Grill",
    inputs: [dropdown("cut", "Cut", opts(E.CHICKEN.map(([n]) => n)), 2), dropdown("method", "Method", opts(["Oven", "Air fryer (≈ 380 °F)", "Grill (medium-high)"]), 0), dropdown("size", "Piece Size", opts(["Small", "Medium", "Large"]), 1), WUNIT, num("weight", "Weight (whole chicken only)", 4, 20, 0.25)],
    results: [["totalMinutes", "Cooking Time (minutes)", "n"], ["totalHours", "Cooking Time (hours)", "n"], ["targetInternalF", "Safe Internal Temperature (°F)", "n"], ["checkAtMinutes", "Start Checking At (minutes)", "n"], ["restMinutes", "Rest (minutes)", "n"], ["flipAtMinutes", "Flip At (minutes; 0 = no need)", "n"]],
    fn: E.chickenCook, ex: { cut: 2, method: 0, size: 1, weightUnit: 0, weight: 4 },
    exText: (o) => `Example: medium boneless chicken breasts bake for about ${o.totalMinutes} minutes at 400 °F; check from ${o.checkAtMinutes} minutes until they read 165 °F.`,
    how: "Choose the cut and method. For a whole chicken enter its weight; pieces use typical sizes. Chicken is safe at 165 °F in the thickest part — thighs and drumsticks are more tender at 175–185 °F.",
    assume: "Oven times: whole chicken ≈ 22 min/lb at 350 °F; bone-in breast 40 min at 375 °F; boneless breast and thighs 22 min at 400 °F; bone-in thighs 40 min; drumsticks 40 min at 425 °F; wings 42 min; tenders 15 min. Air fryer ≈ 25% faster, grill ≈ 10% faster.",
    faq: [["How long to bake chicken breast at 400?", "About 20–25 minutes for a medium boneless breast."], ["How long to cook a whole chicken?", "About 20–25 minutes per pound at 350 °F — 1½ hours for a 4 lb bird."]],
  }),
  mk({
    slug: "turkey-fry-time-calculator", cat: CK, title: "Turkey Fry Time Calculator (Deep-Fried Turkey)",
    desc: "Work out how long to deep-fry a whole turkey or turkey breast by weight, roughly how much oil your pot needs, and the total time including heating and resting.",
    meta: "Turkey Fry Time Calculator — Minutes per Pound & Oil Needed",
    inputs: [WUNIT, num("weight", "Turkey Weight", 12, 30, 0.5, 1), dropdown("cut", "Cut", opts(["Whole turkey", "Turkey breast"]), 0), num("potQuarts", "Pot Size (quarts)", 30, 100, 1, 10)],
    results: [["fryMinutes", "Frying Time (minutes)", "n"], ["fryHours", "Frying Time (hours)", "n"], ["oilQuarts", "Approx. Oil Needed (quarts)", "n"], ["oilGallons", "Approx. Oil Needed (gallons)", "n"], ["totalWithHeatAndRest", "Total With Oil Heating & Rest (minutes)", "n"], ["tooLargeWarning", "Over 14 lb — Not Advised (1 = yes)", "n"]],
    fn: E.turkeyFry, ex: { weightUnit: 0, weight: 12, cut: 0, potQuarts: 30 },
    exText: (o) => `Example: a 12 lb turkey fries in about ${o.fryMinutes} minutes at 350 °F; a 30-quart pot needs about ${o.oilGallons} gallons of oil.`,
    how: "The turkey must be fully thawed and dry. Measure the oil line first: put the turkey in the empty pot, cover with water, remove the bird and mark the water level. Fry outdoors, away from buildings, and lower the bird slowly with the burner off.",
    assume: "About 3½ minutes per pound for whole birds and 6 minutes per pound for breasts at 350 °F, to 165 °F in the breast. Oil ≈ 70% of the pot less the turkey's displacement. Birds over 14 lb fry unevenly and overflow easily.",
    faq: [["How long to fry a 14 lb turkey?", "About 49 minutes at 350 °F."], ["How much oil to fry a turkey?", "Usually 3–5 gallons in a 30–40 quart pot — measure with water first."]],
  }),
  mk({
    slug: "butterball-turkey-thawing-calculator", cat: CK, title: "Turkey Thawing Calculator (When to Start Thawing)",
    desc: "Find when to move your frozen turkey to the fridge so it is thawed by cooking day — 1 day per 4 lb — or how long it takes in cold water, by weight.",
    meta: "Turkey Thawing Calculator — When to Thaw a Frozen Turkey",
    inputs: [WUNIT, num("weight", "Frozen Turkey Weight", 16, 40, 0.5, 1), dropdown("method", "Thawing Method", opts(["Refrigerator (recommended)", "Cold water (change every 30 min)"]), 0), dateField("cookDate", "Cooking Day", "today+21"), dateField("today", "Today's Date", "today")],
    results: [["startThawDate", "Move the Turkey to the Fridge On", "d"], ["fridgeDays", "Refrigerator Thawing Time (days)", "n"], ["coldWaterHours", "Cold-Water Thawing Time (hours)", "n"], ["waterChanges", "Water Changes Needed", "n"], ["daysFromToday", "Days From Today Until You Start", "n"]],
    fn: E.thawing, ex: { weightUnit: 0, weight: 16, method: 0, cookDate: DAY0 + 21, today: DAY0 },
    exText: (o) => `Example: a 16 lb frozen turkey needs ${o.fridgeDays} days in the fridge, or about ${o.coldWaterHours} hours in cold water (changing the water ${o.waterChanges} times).`,
    how: "Leave the turkey in its wrapper on a tray on the bottom shelf. A thawed turkey keeps 1–2 more days in the fridge, so starting a day early is fine.\n\nNever thaw on the counter. Cold-water thawing needs the bird fully submerged in its sealed wrapper and cooked straight after.",
    assume: "Refrigerator at 40 °F or below: 24 hours per 4–5 lb (Butterball and USDA). Cold water: 30 minutes per pound.",
    faq: [["How long does a 20 lb turkey take to thaw?", "About 5 days in the fridge, or 10 hours in cold water."], ["Can I cook a turkey from frozen?", "Yes — it takes about 50% longer, and you cannot remove the giblets until it softens."]],
  }),
  mk({
    slug: "food-shelf-life-calculator", cat: CK, title: "Food Shelf Life Calculator (Fridge & Freezer)",
    desc: "See how long food keeps in the fridge and freezer — raw meat, leftovers, eggs, dairy, deli meat and more — with the use-by date and days left, based on USDA FoodKeeper guidance.",
    meta: "Food Shelf Life Calculator — How Long Does Food Last in the Fridge?",
    inputs: [dropdown("food", "Food", opts(E.FOODS.map(([n]) => n)), 5), dateField("storedDate", "Date Cooked, Opened or Bought", "today-1"), dateField("today", "Today's Date", "today")],
    results: [["useByFridge", "Eat or Freeze By (refrigerator)", "d"], ["fridgeDaysLeft", "Days Left in the Fridge", "n"], ["fridgeDays", "Safe Fridge Storage (days)", "n"], ["freezerMonths", "Best Quality in the Freezer (months; 0 = do not freeze)", "n"], ["bestByFreezer", "Best-Quality Date if Frozen Today", "d"], ["freezerDaysLeft", "Freezer Days of Best Quality Left", "n"]],
    fn: E.shelfLife, ex: { food: 5, storedDate: DAY0 - 1, today: DAY0 },
    exText: (o) => `Example: leftovers cooked yesterday are good for ${o.fridgeDaysLeft} more days in the fridge, or about ${o.freezerMonths} months in the freezer.`,
    how: "Choose the food and the date it was cooked, opened or bought. Keep the fridge at 40 °F (4 °C) or below and the freezer at 0 °F (−18 °C).\n\nFrozen food stays safe indefinitely; the freezer times are for best quality.",
    assume: "USDA FoodKeeper ranges, using the cautious end for refrigerator storage (for example raw ground meat 1–2 days, leftovers 3–4 days, eggs 3–5 weeks). When in doubt, throw it out — smell and look are not reliable tests.",
    faq: [["How long are leftovers good for?", "3–4 days in the fridge."], ["How long does raw chicken last in the fridge?", "1–2 days; freeze it if you will not cook it by then."]],
  }),
  mk({
    slug: "beef-jerky-yield-calculator", cat: CK, title: "Beef Jerky Yield Calculator",
    desc: "Find how much jerky you will get from raw beef or venison after trimming and drying, the cost per ounce, servings and how much marinade to make.",
    meta: "Beef Jerky Yield Calculator — Raw Meat to Jerky Weight & Cost",
    inputs: [WUNIT, num("rawWeight", "Raw Meat Weight", 3, 500, 0.1), pct("trimPercent", "Fat & Sinew Trimmed Off", 10, 50, 1), pct("dryYield", "Dried Yield (% of trimmed; 35–45%)", 40, 70, 1), cur("pricePerLb", "Meat Price per lb", 7, 100), cur("marinadeCost", "Marinade & Seasoning Cost", 5, 1000)],
    results: [["jerkyOunces", "Jerky Made (oz)", "n"], ["jerkyPounds", "Jerky Made (lb)", "n"], ["costPerOunce", "Cost per Ounce", "c"], ["totalCost", "Total Cost", "c"], ["servings1oz", "1 oz Servings", "n"], ["marinadeCups", "Marinade to Make (cups)", "n"], ["trimmedWeightLb", "Trimmed Raw Weight (lb)", "n"]],
    fn: E.jerkyYield, ex: { weightUnit: 0, rawWeight: 3, trimPercent: 10, dryYield: 40, pricePerLb: 7, marinadeCost: 5 },
    exText: (o) => `Example: 3 lb of eye of round trimmed by 10% and dried to 40% makes about ${o.jerkyOunces} oz of jerky — ${usd(o.costPerOunce)} per ounce.`,
    how: "Use lean cuts such as eye of round, top round or flank. Slice ¼ inch thick, marinate, then dry at 160–165 °F until it bends and cracks but does not snap.\n\nUSDA advises heating meat to 160 °F before or during drying.",
    assume: "Lean beef loses about 55–65% of its trimmed weight as it dries (yield 35–45%). About 1 cup of marinade per 2 lb of sliced meat.",
    faq: [["How much jerky does 1 lb of beef make?", "About 6–7 oz."], ["Why is homemade jerky cheaper?", "Shop jerky costs $2–3 an ounce; homemade is often under $1."]],
  }),
  mk({
    slug: "sausage-salt-calculator", cat: CK, title: "Sausage Salt Calculator (Salt, Cure & Water per Pound)",
    desc: "Get the right salt for fresh, smoked or dry-cured sausage — grams of salt, pink curing salt, ice water and binder for your batch weight.",
    meta: "Sausage Salt Calculator — Salt and Cure per Pound of Sausage",
    inputs: [dropdown("type", "Sausage Type", opts(E.SAUSAGE_TYPES.map(([n]) => n)), 0), WUNIT, num("meatWeight", "Meat + Fat Weight", 5, 1000, 0.1), pct("saltPercent", "Salt % (0 = use the type's default)", 0, 5, 0.1), pct("waterPercent", "Ice Water (% of meat)", 10, 20, 1), pct("binderPercent", "Binder, e.g. milk powder (% of meat)", 0, 10, 0.5)],
    results: [["saltGrams", "Salt (grams)", "n"], ["saltTablespoonsMorton", "Salt (tbsp, Morton kosher)", "n"], ["cureGrams", "Curing Salt (grams)", "n"], ["cureType", "Curing Salt Type (0 none · 1 Prague #1 · 2 Prague #2)", "n"], ["iceWaterGrams", "Ice Water (grams)", "n"], ["binderGrams", "Binder (grams)", "n"], ["saltPercentUsed", "Salt Level Used (%)", "n"]],
    fn: E.sausageSalt, ex: { type: 0, weightUnit: 0, meatWeight: 5, saltPercent: 0, waterPercent: 10, binderPercent: 0 },
    exText: (o) => `Example: 5 lb of fresh breakfast sausage at ${o.saltPercentUsed}% needs ${fmt(o.saltGrams, 0)} g of salt (about ${o.saltTablespoonsMorton} tbsp of Morton kosher) and ${fmt(o.iceWaterGrams, 0)} g of ice water.`,
    how: "Weigh the meat and fat together. Fresh sausage is usually 1.5–1.8% salt; smoked and cooked sausage 1.8–2.2% with Prague Powder #1; dry-cured salami 2.5–3% with Prague Powder #2.\n\nFry a small patty to taste before stuffing.",
    assume: "Salt is a percentage of the meat weight, less the salt already in the curing salt (0.25% of weight). Morton kosher ≈ 14.4 g per tablespoon.",
    faq: [["How much salt per pound of sausage?", "About 7–8 g (1¼ tsp table salt) for fresh sausage."], ["Do I need curing salt for sausage?", "Only for smoked, slow-cooked or dried sausage; fresh sausage cooked right away does not need it."]],
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
