// One-time (but safe to re-run) batch setup script: creates 15 aquarium, reef, reptile and small-pet
// calculators (Pets & Animals Calculators > Aquarium, Reptile & Small Pet Calculators). Water chemistry,
// genetics and sizing rules live in src/lib/calc-engine-pets-aqua.ts; examples are computed from the engine.
//
// HOW TO RUN (after prisma/setup-pets-animals-category.ts --apply)
//   npx tsx prisma/create-pets-aqua-calculators.ts
// or
//   npm run db:create-pets-aqua-calculators

import * as E from "../src/lib/calc-engine-pets-aqua";

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
const CAT = "aquarium-reptile-small-pet-calculators";
const NOTE = "These are planning estimates — always test your water, follow product labels, and ask an aquatic or exotics veterinarian when animals are sick.";

const GAL = (def: number, label = "Tank Volume (US gallons)") => num("gallons", label, def, 100000, 0.5);
const LEN = (key: string, label: string, def: number) => num(key, label, def, 1000, 0.1);
const UNIT = (def = 0) => dropdown("unit", "Unit", opts(["Inches", "Centimeters"]), def);
const BODYDD = (i: number, def: number) => dropdown(`body${i}`, `Group ${i} — Body Type`, opts(E.BODY.map(([n]) => n)), def);
const INHERIT = (i: number) => dropdown(`type${i}`, `Gene ${i} — Inheritance`, opts(["Recessive (e.g. albino, clown, piebald, eclipse)", "Incomplete dominant / co-dominant (e.g. pastel, mojave, enigma has super form)", "Dominant (e.g. spider, pinstripe, tremper giant)"]), i === 1 ? 0 : 1);
const GENOTYPE = (key: string, label: string, def: number) => dropdown(key, label, opts(["Normal (no copy)", "One copy (het / single visual)", "Two copies (visual recessive / super)"]), def);
const TEMPER = (key: string, label: string, def: number) => dropdown(key, label, opts(["Peaceful", "Semi-aggressive", "Aggressive / territorial"]), def);

const TOOLS: ToolDef[] = [
  mk({
    slug: "aquarium-stocking-calculator", title: "Aquarium Stocking Calculator",
    desc: "Check if your aquarium is overstocked — enter tank size, filter flow and up to three groups of fish to get a stocking level %, bioload and room left for more fish.",
    meta: "Aquarium Stocking Calculator — How Many Fish Can I Put in My Tank",
    inputs: [GAL(29), num("filterGph", "Filter Flow (gallons per hour)", 200, 10000, 1), yn("planted", "Live Plants", 0), num("count1", "Group 1 — Number of Fish", 10, 500, 1), LEN("length1", "Group 1 — Adult Length (in)", 1.5), BODYDD(1, 0), num("count2", "Group 2 — Number of Fish", 6, 500, 1), LEN("length2", "Group 2 — Adult Length (in)", 2), BODYDD(2, 1), num("count3", "Group 3 — Number of Fish", 1, 500, 1), LEN("length3", "Group 3 — Adult Length (in)", 4), BODYDD(3, 2)],
    results: [["stockingPercent", "Stocking Level", "p"], ["status", "Status (1 room to add · 2 fully stocked · 3 overstocked)", "n"], ["bioloadInches", "Bioload (weighted inches)", "n"], ["capacityInches", "Tank Capacity (weighted inches)", "n"], ["remainingInches", "Room Left (weighted inches)", "n"], ["totalFishInches", "Total Adult Fish Length (in)", "n"], ["totalFish", "Total Fish", "n"], ["filterTurnover", "Filter Turnover (× tank per hour)", "n"]],
    fn: E.stocking, ex: { gallons: 29, filterGph: 200, planted: 0, count1: 10, length1: 1.5, body1: 0, count2: 6, length2: 2, body2: 1, count3: 1, length3: 4, body3: 2 },
    exText: (o) => `Example: 10 tetras, 6 platies and a 4 in pleco in a 29 gallon tank are at ${o.stockingPercent}% stocking.`,
    how: "Use adult length, not the size at the store. Choose the body type that fits — chunky or messy fish produce far more waste than slim ones.",
    assume: "Starting point of 1 inch of slim adult fish per gallon, weighted ×1.5 for medium-bodied and ×2.5 for heavy-bioload fish. Filter turnover under 4× lowers capacity 15%, over 8× raises it 15%; live plants add 10%. Territorial and schooling needs also matter.",
    faq: [["How many fish can I put in a 20 gallon tank?", "About 20 inches of small slim fish — e.g. a school of 10–12 tetras plus a few corydoras — with good filtration."]],
  }),
  mk({
    slug: "aquarium-copper-treatment-calculator", title: "Aquarium Copper Treatment Calculator (Copper Power & Cupramine)",
    desc: "Work out how much copper medication to add to your aquarium or quarantine tank for ich and marine velvet — from your product's label dose, true water volume, target and current copper level.",
    meta: "Copper Treatment Calculator — Copper Power & Cupramine Dose for Aquariums",
    inputs: [GAL(40), pct("displacement", "Rock / Sand Displacement", 10, 90, 1), num("labelMl", "Label Dose (mL)", 1, 1000, 0.1), num("labelGallons", "… Treats This Many Gallons", 1, 10000, 0.1), num("labelPpm", "… to This Copper Level (ppm on label)", 2, 10, 0.01), num("targetPpm", "Target Copper Level (ppm)", 2, 10, 0.01), num("currentPpm", "Current Copper Test Reading (ppm)", 0, 10, 0.01)],
    results: [["doseMl", "Total Dose to Add (mL)", "n"], ["doseTeaspoons", "Total Dose (teaspoons)", "n"], ["firstStepMl", "Day-1 Half Dose (mL)", "n"], ["waterGallons", "True Water Volume (gal)", "n"], ["waterLiters", "True Water Volume (L)", "n"], ["ppmIncrease", "Copper Increase (ppm)", "n"]],
    fn: E.copper, ex: { gallons: 40, displacement: 10, labelMl: 1, labelGallons: 1, labelPpm: 2, targetPpm: 2, currentPpm: 0 },
    exText: (o) => `Example: raising 36 gallons of real water to 2.0 ppm at 1 mL per gallon takes ${o.doseMl} mL — add about ${o.firstStepMl} mL on day 1.`,
    how: "Copy the dose from your bottle (e.g. 'X mL per Y gallons gives Z ppm'). Chelated copper (Copper Power) runs near 2.0 ppm; ionic copper (Cupramine) about 0.5 ppm — never mix them. Treat in a fish-only quarantine tank.",
    assume: "Dose = (target − current) ÷ label ppm × label mL × (true gallons ÷ label gallons). True volume subtracts rock and sand displacement. Raise slowly over 2–3 days and test daily with a matching copper test kit.",
    faq: [["Is copper safe for invertebrates?", "No — copper kills shrimp, snails, corals and other invertebrates, and can stay in rock and sand. Use a hospital tank."], ["How long do you treat with copper?", "Typically 14–30 days at the therapeutic level, depending on the product and parasite."]],
  }),
  mk({
    slug: "reef-tank-dosing-calculator", title: "Reef Tank Dosing Calculator (Alkalinity, Calcium & Magnesium)",
    desc: "Calculate how much baking soda, soda ash, calcium chloride and magnesium chloride to add to raise your reef tank's alkalinity (dKH), calcium and magnesium — with a safe number of days to get there. Works with BRS and DIY two-part.",
    meta: "Reef Dosing Calculator — Raise Alkalinity, Calcium & Magnesium",
    inputs: [GAL(75, "Net Water Volume (US gallons)"), dropdown("alkSource", "Alkalinity Additive", opts(["Sodium bicarbonate (baking soda)", "Sodium carbonate (soda ash / baked baking soda)"]), 0), num("currentAlk", "Current Alkalinity (dKH)", 7, 20, 0.1), num("targetAlk", "Target Alkalinity (dKH)", 8.5, 20, 0.1), num("currentCa", "Current Calcium (ppm)", 380, 600, 1), num("targetCa", "Target Calcium (ppm)", 430, 600, 1), num("currentMg", "Current Magnesium (ppm)", 1250, 2000, 1), num("targetMg", "Target Magnesium (ppm)", 1350, 2000, 1)],
    results: [["alkalinityGrams", "Alkalinity Additive (g)", "n"], ["alkalinityTeaspoons", "Alkalinity Additive (tsp)", "n"], ["calciumChlorideGrams", "Calcium Chloride Dihydrate (g)", "n"], ["magnesiumChlorideGrams", "Magnesium Chloride Hexahydrate (g)", "n"], ["daysToReachTarget", "Days to Reach Target Safely", "n"], ["alkGramsPerDay", "Alkalinity Additive per Day (g)", "n"], ["calciumGramsPerDay", "Calcium Chloride per Day (g)", "n"]],
    fn: E.reefDosing, ex: { gallons: 75, alkSource: 0, currentAlk: 7, targetAlk: 8.5, currentCa: 380, targetCa: 430, currentMg: 1250, targetMg: 1350 },
    exText: (o) => `Example: raising 75 gallons from 7 to 8.5 dKH needs ${o.alkalinityGrams} g of baking soda; 380→430 ppm calcium needs ${o.calciumChlorideGrams} g of calcium chloride.`,
    how: "Enter net water volume (tank + sump minus rock) and test results. Dissolve in RO/DI water and add slowly to a high-flow area. Use the per-day amounts so changes stay gentle.",
    assume: "1 dKH = 0.357 meq/L: baking soda 30.0 mg/L per dKH, soda ash 18.9 mg/L. CaCl2·2H2O 3.67 mg per mg Ca; MgCl2·6H2O 8.37 mg per mg Mg (long-term, balance with magnesium sulfate). Max change per day: 1.4 dKH, 50 ppm Ca, 100 ppm Mg.",
    faq: [["How much baking soda raises dKH?", "About 1.1 g per 10 US gallons raises alkalinity by 1 dKH."], ["What are ideal reef parameters?", "Alkalinity 7–11 dKH, calcium 400–450 ppm, magnesium 1,250–1,400 ppm — stability matters most."]],
  }),
  mk({
    slug: "gfo-carbon-dosing-calculator", title: "GFO & Activated Carbon Calculator",
    desc: "How much GFO (granular ferric oxide) and activated carbon to use in your reef or freshwater tank — full and starting doses, cups, how often to change it and yearly cost.",
    meta: "GFO Calculator — How Much GFO & Carbon for My Aquarium",
    inputs: [GAL(75, "Total Water Volume (US gallons)"), num("changeWeeks", "Replace Every (weeks)", 6, 26, 1, 1), cur("pricePerLb", "Media Price per lb", 15, 500, 0.01)],
    results: [["gfoGrams", "GFO Full Dose (g)", "n"], ["gfoStartGrams", "GFO Starting Dose (g)", "n"], ["gfoCups", "GFO (cups)", "n"], ["carbonGrams", "Activated Carbon (g)", "n"], ["carbonCups", "Activated Carbon (cups)", "n"], ["changesPerYear", "Media Changes per Year", "n"], ["yearlyCost", "Yearly Media Cost", "c"]],
    fn: E.gfo, ex: { gallons: 75, changeWeeks: 6, pricePerLb: 15 },
    exText: (o) => `Example: a 75 gallon reef needs about ${o.gfoGrams} g of GFO (start with ${o.gfoStartGrams} g) and ${o.carbonGrams} g of carbon.`,
    how: "Enter total system volume. Start with half the GFO dose and watch phosphate — dropping it too fast can stress corals. Rinse media before use and run it in a reactor or filter bag.",
    assume: "Typical manufacturer guidance: GFO ≈ 0.4 g per gallon (~215 g per cup), activated carbon ≈ 1.5 g per gallon (~120 g per cup). Follow your brand's label where it differs.",
    faq: [["How often should I change GFO?", "When phosphate starts rising again — usually every 4–8 weeks."]],
  }),
  mk({
    slug: "aquarium-volume-calculator", title: "Aquarium Volume Calculator (Liters & Gallons, Any Shape)",
    desc: "Calculate aquarium volume in liters, US gallons and UK gallons for rectangular, cylinder, hexagon and corner tanks in cm or inches — e.g. a 40×40×40 cm tank is 64 liters — plus net water after decor and water weight.",
    meta: "Aquarium Volume Calculator — Liters & Gallons (40×40×40 = 64 L)",
    inputs: [dropdown("shape", "Tank Shape", opts(["Rectangle / cube", "Cylinder (enter diameter as length)", "Hexagon (enter one side as length)", "Quarter-circle corner (enter radius as length)"]), 0), UNIT(1), LEN("length", "Length / Diameter / Side / Radius", 40), LEN("width", "Width (rectangle only)", 40), LEN("height", "Water Height", 40), pct("displacement", "Decor / Substrate Displacement", 0, 90, 1)],
    results: [["liters", "Volume (liters)", "n"], ["usGallons", "Volume (US gallons)", "n"], ["ukGallons", "Volume (UK gallons)", "n"], ["netGallons", "Net Water (US gallons)", "n"], ["netLiters", "Net Water (liters)", "n"], ["waterWeightLb", "Water Weight (lb)", "n"], ["waterWeightKg", "Water Weight (kg)", "n"]],
    fn: E.volume, ex: { shape: 0, unit: 1, length: 40, width: 40, height: 40, displacement: 0 },
    exText: (o) => `Example: a 40×40×40 cm tank holds ${o.liters} liters (${o.usGallons} US gallons).`,
    how: "Measure inside dimensions, using the water height rather than the glass height. Add 10–15% displacement for sand and rock to get true water volume for dosing.",
    assume: "Volume: rectangle L×W×H, cylinder π(d/2)²H, regular hexagon (3√3/2)s²H, quarter-circle πr²H/4. 1 L = 1,000 cm³; 1 US gal = 3.785 L; 1 UK gal = 4.546 L; water ≈ 1 kg/L.",
    faq: [["How many liters is 40×40×40 cm?", "64 liters (about 16.9 US gallons)."]],
  }),
  mk({
    slug: "aquarium-weight-calculator", title: "Aquarium Weight Calculator (Filled Tank & Floor Load)",
    desc: "How much does a filled aquarium weigh? Add water, glass, substrate, rock, stand and equipment for the total weight, plus floor load per square foot to check your floor.",
    meta: "Aquarium Weight Calculator — How Much Does a Full Fish Tank Weigh",
    inputs: [GAL(75), dropdown("water", "Water", opts(["Fresh water (8.34 lb/gal)", "Salt water (≈8.55 lb/gal)"]), 0), pct("displacement", "Rock / Sand Displacement", 10, 90, 1), num("tankWeight", "Empty Tank Weight (lb, 0 = estimate)", 0, 10000, 1), num("substrateLb", "Substrate (lb)", 75, 10000, 1), num("rockLb", "Rock / Decor (lb)", 30, 10000, 1), num("standLb", "Stand / Cabinet (lb)", 60, 5000, 1), num("equipmentLb", "Sump, Lights & Equipment (lb)", 20, 5000, 1), LEN("footLength", "Stand Footprint Length (in)", 48), LEN("footWidth", "Stand Footprint Width (in)", 18)],
    results: [["totalWeightLb", "Total Filled Weight (lb)", "n"], ["totalWeightKg", "Total Filled Weight (kg)", "n"], ["waterWeightLb", "Water Weight (lb)", "n"], ["emptyTankLb", "Empty Tank (lb)", "n"], ["floorLoadPsf", "Floor Load (lb per sq ft of footprint)", "n"], ["overTypicalFloorRating", "Above 40 psf Typical Rating (1 = check floor)", "n"]],
    fn: E.tankWeight, ex: { gallons: 75, water: 0, displacement: 10, tankWeight: 0, substrateLb: 75, rockLb: 30, standLb: 60, equipmentLb: 20, footLength: 48, footWidth: 18 },
    exText: (o) => `Example: a filled 75 gallon freshwater setup weighs about ${fmt(o.totalWeightLb, 0)} lb — ${fmt(o.floorLoadPsf, 0)} lb per sq ft on a 48×18 in stand.`,
    how: "Enter tank size and what's in it. If you don't know the empty glass weight, leave 0 to estimate. Place large tanks across floor joists and near a load-bearing wall.",
    assume: "Water 8.34 lb/gal fresh, 8.55 salt, minus displacement. Empty glass tank ≈ 1.25 lb per gallon + 5 lb. US residential floors are typically designed for 40 lb/sq ft live load spread over the room, so concentrated tank loads can exceed it — ask a structural engineer for very large tanks.",
    faq: [["How much does a 75 gallon aquarium weigh full?", "Around 850 lb with substrate, rock and stand."]],
  }),
  mk({
    slug: "aquarium-sand-calculator", title: "Aquarium Sand & Gravel Calculator",
    desc: "How much sand, gravel, aragonite or aqua soil do you need for your aquarium? Get pounds, kilograms, bags and cost from tank size and depth.",
    meta: "Aquarium Sand Calculator — How Much Sand or Gravel for My Tank",
    inputs: [UNIT(0), LEN("length", "Tank Length", 36), LEN("width", "Tank Width", 18), LEN("depth", "Substrate Depth", 2), dropdown("substrate", "Substrate", opts(E.SUBSTRATES.map(([n]) => n)), 0), num("bagLb", "Bag Size (lb)", 20, 200, 1), cur("bagPrice", "Bag Price", 25, 1000, 0.01)],
    results: [["poundsNeeded", "Substrate Needed (lb)", "n"], ["kilogramsNeeded", "Substrate Needed (kg)", "n"], ["bagsNeeded", "Bags Needed", "n"], ["volumeLiters", "Volume (liters)", "n"], ["cost", "Cost", "c"]],
    fn: E.sand, ex: { unit: 0, length: 36, width: 18, depth: 2, substrate: 0, bagLb: 20, bagPrice: 25 },
    exText: (o) => `Example: 2 in of sand in a 36×18 in tank takes about ${fmt(o.poundsNeeded, 0)} lb — ${o.bagsNeeded} bags of 20 lb.`,
    how: "Enter the tank's inside footprint and the depth you want (1–2 in for most tanks, 2–3 in for planted, 1 in or 4+ in for reef sand beds). Slope it higher at the back if you like.",
    assume: "Bulk densities: aquarium sand 1.6 g/cm³, aragonite 1.45, gravel 1.55, aqua soil 1.0, crushed coral 1.3. Rule of thumb: about 1 lb of sand per gallon for 1 inch of depth.",
    faq: [["How much sand do I need for a 20 gallon tank?", "About 20–25 lb for 1 inch, or 40–50 lb for 2 inches."]],
  }),
  mk({
    slug: "goldfish-tank-size-calculator", title: "Goldfish Tank Size Calculator",
    desc: "Find the minimum tank size for your goldfish — fancy or common/comet — by number of fish, with filter flow, weekly water change and when a pond is better.",
    meta: "Goldfish Tank Size Calculator — How Many Gallons per Goldfish",
    inputs: [dropdown("type", "Goldfish Type", opts(E.GOLDFISH.map(([n]) => n)), 0), num("count", "Number of Goldfish", 2, 100, 1, 1), num("currentTank", "Your Current Tank (gallons, optional)", 0, 10000, 1)],
    results: [["minimumGallons", "Minimum Tank (US gallons)", "n"], ["minimumLiters", "Minimum Tank (liters)", "n"], ["filterGph", "Filter Flow (gallons per hour)", "n"], ["weeklyWaterChangeGallons", "Weekly Water Change (gallons, 30%)", "n"], ["currentTankShortfall", "Gallons Short in Current Tank", "n"], ["pondRecommended", "Pond Recommended (1 = yes)", "n"]],
    fn: E.goldfish, ex: { type: 0, count: 2, currentTank: 0 },
    exText: (o) => `Example: two fancy goldfish need at least ${o.minimumGallons} gallons with a ${o.filterGph} gph filter.`,
    how: "Choose fancy (round-bodied, double tail) or common/comet (slim, single tail). Goldfish produce lots of waste and grow 6–12 in, so bowls are never suitable.",
    assume: "Fancy: 20 gallons for the first fish + 10 for each extra. Common/comet/shubunkin: 40 + 20 each, and ponds are best for more than three. Filter rated 10× tank volume per hour.",
    faq: [["How big a tank does one goldfish need?", "At least 20 gallons for a fancy goldfish and 40 gallons for a common or comet."]],
  }),
  mk({
    slug: "turtle-tank-size-calculator", title: "Turtle Tank Size Calculator",
    desc: "Find the right tank size for a red-eared slider, painted, map or musk turtle from shell length and number of turtles — with minimum water depth, filter rating and basking area.",
    meta: "Turtle Tank Size Calculator — Gallons per Inch of Shell",
    inputs: [UNIT(0), num("shellLength", "Shell Length (largest turtle)", 6, 40, 0.1), num("count", "Number of Turtles", 1, 20, 1, 1)],
    results: [["minimumGallons", "Minimum Tank (US gallons)", "n"], ["minimumLiters", "Minimum Tank (liters)", "n"], ["minimumWaterDepthIn", "Minimum Water Depth (in)", "n"], ["filterRatedGallons", "Filter Rated For (gallons)", "n"], ["baskingAreaIn", "Basking Spot at Least (in long)", "n"]],
    fn: E.turtle, ex: { unit: 0, shellLength: 6, count: 1 },
    exText: (o) => `Example: a 6 in red-eared slider needs at least ${o.minimumGallons} gallons with ${o.minimumWaterDepthIn} in of water depth.`,
    how: "Measure the top shell straight from front to back. Plan for adult size — sliders reach 8–12 in. Add a dry basking area with UVB and heat.",
    assume: "Rule of thumb: 10 gallons per inch of shell for one turtle, +50% for each additional turtle; minimum 20 gallons. Water depth at least 1.5× shell length; canister filter rated 2–3× the water volume.",
    faq: [["What size tank for a red-eared slider?", "About 10 gallons per inch — so a 10 in adult needs around 100 gallons."]],
  }),
  mk({
    slug: "aquarium-ammonia-calculator", title: "Aquarium Ammonia Calculator (Free NH3 Toxicity)",
    desc: "Convert your total ammonia test reading to toxic free ammonia (NH3) using pH and temperature, see the risk level, and the highest total ammonia that stays safe in your tank or pond.",
    meta: "Aquarium Ammonia Calculator — Free NH3 From pH & Temperature",
    inputs: [num("totalAmmonia", "Total Ammonia Test Reading (ppm NH3/NH4+)", 1, 100, 0.01), num("ph", "pH", 7.6, 14, 0.1), dropdown("tempUnit", "Temperature Unit", opts(["°F", "°C"]), 0), num("temperature", "Water Temperature", 78, 120, 0.1)],
    results: [["freeAmmoniaMgL", "Free Ammonia NH3 (mg/L)", "n"], ["percentFreeAmmonia", "Share That Is Toxic NH3", "p"], ["ammoniumMgL", "Ammonium NH4+ (mg/L)", "n"], ["riskLevel", "Risk (0 safe · 1 stress · 2 toxic · 3 lethal)", "n"], ["maxSafeTotalAmmonia", "Max Safe Total Ammonia at This pH (ppm)", "n"]],
    fn: E.ammonia, ex: { totalAmmonia: 1, ph: 7.6, tempUnit: 0, temperature: 78 },
    exText: (o) => `Example: 1 ppm total ammonia at pH 7.6 and 78°F contains ${o.freeAmmoniaMgL} mg/L of toxic NH3 (${o.percentFreeAmmonia}%).`,
    how: "Enter the reading from an API or Seachem-type total ammonia test, plus pH and temperature. Higher pH and warmer water turn more ammonia into the toxic form.",
    assume: "Un-ionised fraction = 1 / (1 + 10^(pKa − pH)), pKa = 0.09018 + 2729.92 / T(K) (Emerson 1975, freshwater; seawater is similar to slightly lower). Free NH3 above 0.02 mg/L stresses fish; above 0.05 is toxic. Any ammonia in an established tank signals a problem.",
    faq: [["Is 0.25 ppm ammonia bad?", "At pH 7 it's fairly low risk, but at pH 8.2 it can reach stressful free NH3 — do a water change and find the cause."]],
  }),
  mk({
    slug: "fish-compatibility-calculator", title: "Fish Compatibility Calculator",
    desc: "Check if two fish species can live together — overlapping temperature and pH range, adult size ratio (predation risk) and temperament give a 0–100 compatibility score.",
    meta: "Fish Compatibility Calculator — Can These Fish Live Together",
    inputs: [num("tempMinA", "Fish A — Min Temp (°F)", 72, 100, 1), num("tempMaxA", "Fish A — Max Temp (°F)", 80, 100, 1), num("phMinA", "Fish A — Min pH", 6, 14, 0.1), num("phMaxA", "Fish A — Max pH", 7.5, 14, 0.1), LEN("sizeA", "Fish A — Adult Size (in)", 1.5), TEMPER("temperA", "Fish A — Temperament", 0), num("tempMinB", "Fish B — Min Temp (°F)", 75, 100, 1), num("tempMaxB", "Fish B — Max Temp (°F)", 82, 100, 1), num("phMinB", "Fish B — Min pH", 6.5, 14, 0.1), num("phMaxB", "Fish B — Max pH", 7.8, 14, 0.1), LEN("sizeB", "Fish B — Adult Size (in)", 2.5), TEMPER("temperB", "Fish B — Temperament", 1)],
    results: [["compatibilityScore", "Compatibility Score (0–100)", "n"], ["compatible", "Likely Compatible (1 = yes)", "n"], ["sharedTempLow", "Shared Temp Range — Low (°F)", "n"], ["sharedTempHigh", "Shared Temp Range — High (°F)", "n"], ["sharedPhLow", "Shared pH — Low", "n"], ["sharedPhHigh", "Shared pH — High", "n"], ["sizeRatio", "Adult Size Ratio", "n"], ["predationRisk", "Predation Risk (1 = bigger fish may eat smaller)", "n"]],
    fn: E.compatibility, ex: { tempMinA: 72, tempMaxA: 80, phMinA: 6, phMaxA: 7.5, sizeA: 1.5, temperA: 0, tempMinB: 75, tempMaxB: 82, phMinB: 6.5, phMaxB: 7.8, sizeB: 2.5, temperB: 1 },
    exText: (o) => `Example: a peaceful 1.5 in tetra and a semi-aggressive 2.5 in barb score ${o.compatibilityScore}/100, sharing ${o.sharedTempLow}–${o.sharedTempHigh}°F.`,
    how: "Enter each species' care ranges from a reliable profile. No temperature or pH overlap means they can't share a tank, whatever the score.",
    assume: "Score = 0 if temperature or pH ranges don't overlap; otherwise 50% size (ratio ≤2 good, 2–3 caution, >3 predation risk) + 50% temperament pairing. A rough screen — fin-nippers, species-only fish and swimming level also matter.",
    faq: [["Can bettas live with other fish?", "Sometimes, with small peaceful non-flashy tankmates like corydoras or snails in 10+ gallons — never with other male bettas."]],
  }),
  mk({
    slug: "reptile-morph-genetics-calculator", title: "Reptile Morph Genetics Calculator (Ball Python, Leopard Gecko & More)",
    desc: "Predict offspring morph odds for ball pythons, leopard geckos, corn snakes, boas and other reptiles — recessive, co-dominant/incomplete dominant and dominant genes, two genes at once, with possible-het % and expected visuals per clutch.",
    meta: "Reptile Morph Calculator — Ball Python & Leopard Gecko Genetics Odds",
    inputs: [INHERIT(1), GENOTYPE("mom1", "Gene 1 — Female", 1), GENOTYPE("dad1", "Gene 1 — Male", 2), INHERIT(2), GENOTYPE("mom2", "Gene 2 — Female", 1), GENOTYPE("dad2", "Gene 2 — Male", 0), num("clutchSize", "Clutch / Litter Size", 6, 100, 1)],
    results: [["gene1VisualPercent", "Gene 1 — Visual (recessive) / Single", "p"], ["gene1HetPercent", "Gene 1 — Het (carrier)", "p"], ["gene1SuperPercent", "Gene 1 — Super / Homozygous", "p"], ["gene1NormalPercent", "Gene 1 — Normal", "p"], ["gene1PossibleHetPercent", "Gene 1 — Normal-Looking Babies That Are Het", "p"], ["gene2VisualPercent", "Gene 2 — Visual / Single", "p"], ["gene2HetPercent", "Gene 2 — Het", "p"], ["gene2SuperPercent", "Gene 2 — Super", "p"], ["gene2NormalPercent", "Gene 2 — Normal", "p"], ["bothGenesVisualPercent", "Visual for Both Genes", "p"], ["expectedBothVisualPerClutch", "Expected Double Visuals per Clutch", "n"]],
    fn: E.morph, ex: { type1: 0, mom1: 1, dad1: 2, type2: 1, mom2: 1, dad2: 0, clutchSize: 6 },
    exText: (o) => `Example: het albino × visual albino gives ${o.gene1VisualPercent}% albino babies; adding a pastel female, ${o.bothGenesVisualPercent}% are albino pastel — about ${o.expectedBothVisualPerClutch} per clutch of 6.`,
    how: "Pick each gene's inheritance and how many copies each parent carries. For a recessive gene, a visual animal has two copies and a het has one. For co-dominant genes, one copy is visual and two copies is the 'super'.",
    assume: "Standard Mendelian Punnett squares; the two genes are treated as unlinked. Real clutches vary by chance. Some genes have health issues in super form (e.g. spider wobble, lemon frost tumors) — research before pairing.",
    faq: [["What does 66% possible het mean?", "From het × het recessive pairings, two-thirds of the normal-looking babies carry the gene."]],
  }),
  mk({
    slug: "dubia-roach-colony-calculator", title: "Dubia Roach Colony Calculator (Feeder Insects)",
    desc: "Plan a dubia roach feeder colony for bearded dragons, leopard geckos and other reptiles — how many breeding females and males you need, bin size, startup cost and the money you'll save on buying feeders.",
    meta: "Dubia Roach Colony Calculator — How Many Roaches to Breed",
    inputs: [num("reptiles", "Number of Reptiles", 1, 100, 1, 1), num("feedersPerFeeding", "Feeders per Feeding (per reptile)", 8, 200, 1), num("feedingsPerWeek", "Feedings per Week", 4, 21, 1), cur("feederPrice", "Price per Feeder Bought", 0.3, 10, 0.01), cur("adultPrice", "Price per Breeding Adult", 1, 20, 0.01), cur("setupCost", "Bin, Egg Crate & Heat Setup", 60, 2000, 1)],
    results: [["feedersPerWeek", "Feeders Needed per Week", "n"], ["femalesNeeded", "Breeding Females Needed", "n"], ["malesNeeded", "Breeding Males Needed", "n"], ["binGallons", "Bin Size (gallons)", "n"], ["monthsUntilSelfSustaining", "Months Before Regular Harvest", "n"], ["yearlyFeederCostSaved", "Yearly Cost of Buying Feeders", "c"], ["startupCost", "Colony Startup Cost", "c"], ["paybackMonths", "Months to Pay Back", "n"]],
    fn: E.feederColony, ex: { reptiles: 1, feedersPerFeeding: 8, feedingsPerWeek: 4, feederPrice: 0.3, adultPrice: 1, setupCost: 60 },
    exText: (o) => `Example: one bearded dragon eating 32 roaches a week needs about ${o.femalesNeeded} females and ${o.malesNeeded} males — saving ${usd(o.yearlyFeederCostSaved)} a year.`,
    how: "Enter how many feeders your reptiles eat. Keep the colony at 80–95°F for good breeding; it takes about 4 months before you can harvest steadily.",
    assume: "A healthy female produces about 20–40 nymphs every 2 months, so plan ~3 sustainable feeders per female per week, +25% buffer. 1 male per 5 females. Bin: about 1 gallon per 60 roaches, minimum 10 gallons.",
    faq: [["How many dubia roaches does a bearded dragon eat?", "Juveniles eat 20–60 small roaches a day; adults about 10–20 a few times a week alongside greens."]],
  }),
  mk({
    slug: "rat-cage-size-calculator", title: "Rat Cage Size Calculator",
    desc: "Find how many pet rats a cage can hold — cubic feet, maximum number of rats, floor area and whether the bar spacing is safe for babies or adults.",
    meta: "Rat Cage Calculator — How Many Rats Can Live in My Cage",
    inputs: [UNIT(0), LEN("length", "Cage Length", 36), LEN("width", "Cage Width", 24), LEN("height", "Cage Height", 36), num("barSpacing", "Bar Spacing (in)", 0.5, 3, 0.05), dropdown("ratAge", "Rats", opts(["Babies / young does", "Adult bucks or does"]), 1)],
    results: [["cubicFeet", "Cage Volume (cubic feet)", "n"], ["maxRats", "Maximum Rats", "n"], ["floorAreaSqFt", "Floor Area (sq ft)", "n"], ["barSpacingOk", "Bar Spacing Safe (1 = yes)", "n"], ["roomForPair", "Big Enough for a Pair (1 = yes)", "n"]],
    fn: E.ratCage, ex: { unit: 0, length: 36, width: 24, height: 36, barSpacing: 0.5, ratAge: 1 },
    exText: (o) => `Example: a 36×24×36 in cage is ${o.cubicFeet} cubic feet — enough for ${o.maxRats} rats.`,
    how: "Measure the cage's outside length, width and height. Rats are social, so keep at least two. Use solid or narrow-wire shelves.",
    assume: "Widely used rat-club guideline: 2.5 cubic feet per rat (the 'rat cage calculator' formula: L × W × H in inches ÷ 1,728 ÷ 2.5). Bar spacing ≤ 1/2 in for babies and young females, ≤ 1 in for adults.",
    faq: [["How many rats can I keep in a Critter Nation?", "A double Critter Nation (about 36×24×63 in) fits roughly 12 rats by this guideline."]],
  }),
  mk({
    slug: "pigeon-velocity-calculator", title: "Racing Pigeon Velocity Calculator",
    desc: "Calculate a racing pigeon's speed in yards per minute (YPM) and meters per minute from race distance, liberation time and clock-in time — with overnight races and night hours deducted.",
    meta: "Pigeon Velocity Calculator — Yards per Minute (YPM) for Pigeon Racing",
    inputs: [dropdown("distanceUnit", "Distance Unit", opts(["Miles (+ yards)", "Kilometers", "Yards"]), 0), num("distance", "Race Distance", 300, 100000, 0.001), num("extraYards", "Plus Yards (miles mode)", 0, 1759, 1), num("releaseHour", "Liberation Time — Hour (0–23)", 7, 23, 1), num("releaseMinute", "Liberation Time — Minute", 0, 59, 1), num("arrivalHour", "Clocked Time — Hour (0–23)", 14, 23, 1), num("arrivalMinute", "Clocked Time — Minute", 30, 59, 1), num("arrivalSecond", "Clocked Time — Second", 0, 59, 1), num("daysLater", "Days After Liberation (0 = same day)", 0, 7, 1), num("nightHours", "Night Hours to Deduct", 0, 100, 0.25)],
    results: [["yardsPerMinute", "Velocity (yards per minute)", "n"], ["metersPerMinute", "Velocity (meters per minute)", "n"], ["milesPerHour", "Speed (mph)", "n"], ["kmPerHour", "Speed (km/h)", "n"], ["flyingMinutes", "Flying Time (minutes)", "n"], ["distanceYards", "Distance (yards)", "n"]],
    fn: E.pigeon, ex: { distanceUnit: 0, distance: 300, extraYards: 0, releaseHour: 7, releaseMinute: 0, arrivalHour: 14, arrivalMinute: 30, arrivalSecond: 0, daysLater: 0, nightHours: 0 },
    exText: (o) => `Example: 300 miles in 7 h 30 min is ${fmt(o.yardsPerMinute, 2)} yards per minute (${o.milesPerHour} mph).`,
    how: "Enter the official race distance to your loft, the liberation time and your clock time. For birds that arrive the next day, set days later and the night (darkness) hours your club deducts.",
    assume: "Velocity = distance in yards ÷ flying minutes (1 mile = 1,760 yd; 1 yd = 0.9144 m). Flying time = clocked time − liberation time − night hours. Use your club's official distance and clock rules.",
    faq: [["What is a good pigeon racing speed?", "Typical race velocities are 1,000–1,600 yards per minute (35–55 mph), higher with a tailwind."]],
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
