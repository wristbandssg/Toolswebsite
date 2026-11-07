// One-time (but safe to re-run) batch setup script: creates 35 calculators in House & Garden
// Calculators > Lawn, Garden & Tree Calculators (lawn, seed, planting, frost dates, grow lights, irrigation, compost and tree tools and costs). Formulas live in src/lib/calc-engine-hg-gard.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-gard-calculators.ts
// or
//   npm run db:create-hg-gard-calculators

import * as E from "../src/lib/calc-engine-hg-gard";

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

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; labels?: string[] };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

/** Number input: key, label, default, max, step, min, unit. */
const num = (key: string, label: string, def: number, max = 100000, step = 1, min = 0, unit?: string) => ({ key, label, type: "number", ...(unit ? { unit } : {}), required: true, default: def, min, max, step });
/** Dollar input. */
const usd = (key: string, label: string, def: number, max = 10000000, step = 1) => ({ key, label, type: "currency", required: true, default: def, min: 0, max, step });
/** Percent input. */
const pct = (key: string, label: string, def: number, max = 100, step = 0.5) => ({ key, label, type: "percentage", required: true, default: def, min: 0, max, step });
const opts = (labels: string[]) => labels.map((l, i) => ({ label: l, value: i }));
/** Dropdown with index values. */
const dd = (key: string, label: string, labels: string[], def = 0) => ({ key, label, type: "dropdown", required: true, default: def, options: opts(labels) });
const FMT = { n: "number", l: "label", c: "currency", p: "percentage", d: "date" } as const;
/** [key, label, format, labels for "l" lines]. */
type Line = [key: string, label: string, fmt: keyof typeof FMT, labels?: string[]];
const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const n2 = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

interface Spec { slug: string; title: string; desc: string; meta?: string; inputs: Record<string, unknown>[]; results: Line[]; fn: E.CustomCalculator; ex: Record<string, number>; exText: (o: Record<string, number>) => string; how: string; assume: string; faq: [string, string][] }
function mk(s: Spec): ToolDef {
  const o = r(s.fn, s.ex);
  const [, mainLabel, mainFmt, mainLabels] = s.results[0];
  return {
    slug: s.slug,
    title: s.title,
    description: s.desc,
    metaTitle: (s.meta ?? s.title).slice(0, 70),
    metaDescription: s.desc.length > 158 ? `${s.desc.slice(0, 155).replace(/\s+\S*$/, "")}…` : s.desc,
    calcInputs: s.inputs,
    calcResult: { label: mainLabel, format: FMT[mainFmt], ...(mainLabels ? { labels: mainLabels } : {}) },
    calcResults: s.results.map(([key, label, f, labels], i) => ({ key, label, format: FMT[f], ...(labels ? { labels } : {}), ...(i === 0 ? { highlight: true } : {}) })),
    instructions: s.how,
    examples: s.exText(o),
    assumptions: NOTE ? `${s.assume}\n\n${NOTE}` : s.assume,
    faq: s.faq.map(([question, answer]) => ({ question, answer })),
  };
}

const CAT = "lawn-garden-tree-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region and season — get local quotes.";
const date = (key: string, label: string, def: string) => ({ key, label, type: "date", required: true, default: def });
const D = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 864e5;
const fmtD = (n: number) => new Date(n * 864e5).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const MAT3 = (k: string, l: string, def: number) => dd(k, l, E.COMPOST_MATERIALS, def);

const TOOLS: ToolDef[] = [
  mk({
    slug: "tree-removal-cost-calculator", title: "Tree Removal Cost Calculator",
    desc: "Estimate the cost to remove a tree — by height, trunk diameter and type (shade tree, pine or palm) — with risk near the house or power lines, stump grinding and haul-away.",
    inputs: [num("trees", "Number of Trees", 1, 100, 1, 1), num("height", "Tree Height", 40, 200, 1, 5, "ft"), num("diameter", "Trunk Diameter", 18, 120, 1, 2, "in"), dd("type", "Tree Type", E.TREE_TYPES), dd("location", "Location", ["Open yard", "Near the house or power lines", "Already fallen"]), dd("stump", "Grind the Stump?", ["No", "Yes"], 1), dd("haul", "Haul Away Wood & Debris?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["stumpCost", "Stump Grinding (per tree)", "c"], ["perTree", "Cost per Tree", "c"]],
    fn: E.treeRemovalCost, ex: { trees: 1, height: 40, diameter: 18, type: 0, location: 0, stump: 1, haul: 1 },
    exText: (o) => `Example: removing a 40 ft shade tree with an 18 in trunk, grinding the stump and hauling the wood costs about ${money(o.totalCost)} (${money(o.costLow)}–${money(o.costHigh)}).`,
    how: "Enter the tree's height and trunk diameter (measured at chest height). Trees that need climbing or a crane near a house or wires cost much more; trees already on the ground cost less.\n\nAsk whether the quote includes stump grinding, cleanup and hauling — many don't.",
    assume: `Base prices: under 30 ft $400, 30–60 ft $900, 60–80 ft $1,500, over 80 ft $2,200; palms ×0.8; near structures ×1.5; fallen ×0.7; trunks over 24 in scale up. Stump grinding ≈ $3 per inch of diameter (minimum $100). ${COST_NOTE}`,
    faq: [["How much does it cost to remove a large tree?", "About $1,000–2,500 for a 60–80 ft tree, more near a house."]],
  }),
  mk({
    slug: "tree-trimming-cost-calculator", title: "Tree & Hedge Trimming Cost Calculator",
    desc: "Estimate the cost to trim trees, palms, hedges and shrubs — by tree size and number, linear feet of hedge and number of shrubs.",
    inputs: [num("trees", "Trees to Trim", 2, 200, 1), dd("size", "Tree Size", ["Small (under 30 ft)", "Medium (30–60 ft)", "Large (over 60 ft)"], 1), dd("palm", "Palms?", ["No", "Yes"]), num("hedgeFeet", "Hedge Length", 0, 10000, 1, 0, "ft"), num("shrubs", "Shrubs", 0, 1000, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["treeCost", "Tree Trimming", "c"]],
    fn: E.treeTrimmingCost, ex: { trees: 2, size: 1, palm: 0, hedgeFeet: 50, shrubs: 4 },
    exText: (o) => `Example: trimming two medium trees, 50 ft of hedge and four shrubs costs about ${money(o.totalCost)}.`,
    how: "Enter what needs trimming. Prune most trees in late winter while dormant; avoid removing more than about 25% of the canopy at once.",
    assume: `Typical prices per tree: small $300, medium $600, large $1,200 (palms about 40% less); hedges about $3 per ft; shrubs $60 each; $150 minimum. ${COST_NOTE}`,
    faq: [["How much does tree trimming cost?", "About $250–1,500 per tree depending on size and access."]],
  }),
  mk({
    slug: "tree-planting-cost-calculator", title: "Tree Planting Cost Calculator",
    desc: "Estimate the cost to buy and plant trees — from bare-root whips to large balled-and-burlapped trees — with stakes, mulch and delivery.",
    inputs: [num("trees", "Number of Trees", 3, 1000, 1, 1), dd("size", "Tree Size", ["Seedling / whip", "5–15 gallon container", "1.5–2 in caliper (B&B)", "3–4 in caliper (B&B)", "Large 6 in+ (spade-moved)"], 2), usd("suppliesPerTree", "Stakes, Mulch & Soil per Tree", 25, 500, 1), usd("delivery", "Delivery", 75, 2000, 5)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perTree", "Cost per Tree", "c"]],
    fn: E.treePlantingCost, ex: { trees: 3, size: 2, suppliesPerTree: 25, delivery: 75 },
    exText: (o) => `Example: three 1.5–2 in caliper trees, planted, cost about ${money(o.totalCost)} — ${money(o.perTree)} each.`,
    how: "Pick the tree size. Smaller trees are far cheaper and often catch up with big ones within a few years. Plant with the root flare at grade and water deeply weekly for the first year.",
    assume: `Typical installed prices: seedlings $40, container trees $150, 1.5–2 in B&B $400, 3–4 in $900, large spade-moved $2,000+. ${COST_NOTE}`,
    faq: [["How much does it cost to plant a tree?", "About $150–500 for a typical nursery tree, installed."]],
  }),
  mk({
    slug: "yard-cleanup-cost-calculator", title: "Yard Cleanup & Leaf Removal Cost Calculator",
    desc: "Estimate the cost of a yard cleanup — leaf removal, bush removal and haul-away — from lot size and how much debris there is.",
    inputs: [num("acres", "Lot Size", 0.25, 20, 0.05, 0.05, "acres"), dd("cover", "Leaves & Debris", ["Light", "Moderate", "Heavy"], 1), num("bushes", "Bushes to Remove", 0, 200, 1), num("haulLoads", "Truck Loads Hauled Away", 1, 50, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.yardCleanupCost, ex: { acres: 0.25, cover: 1, bushes: 0, haulLoads: 1 },
    exText: (o) => `Example: a moderate fall cleanup on a quarter-acre lot with one haul-away load costs about ${money(o.totalCost)}.`,
    how: "Pick the lot size and how much debris there is. Many towns collect bagged leaves free — mulching leaves into the lawn with a mower is free too.",
    assume: `Typical prices per acre: light $300, moderate $500, heavy $800; bush removal $75 each; haul-away $100 per load; $150 minimum. ${COST_NOTE}`,
    faq: [["How much does leaf removal cost?", "About $150–500 for an average yard."]],
  }),
  mk({
    slug: "lawn-aeration-cost-calculator", title: "Lawn Aeration Cost Calculator",
    desc: "Estimate the cost of core aeration for your lawn — per 1,000 sq ft with a minimum — with optional overseeding, and compare it with renting an aerator.",
    inputs: [num("area", "Lawn Area", 5000, 1000000, 10, 0, "sq ft"), usd("ratePer1000", "Price per 1,000 Sq Ft", 15, 100, 0.5), dd("overseed", "Overseed Too?", ["No", "Yes"]), usd("rental", "Aerator Rental per Day", 90, 500, 5)],
    results: [["totalCost", "Professional Cost", "c"], ["aerationCost", "Aeration", "c"], ["overseedCost", "Overseeding", "c"], ["diyRentalCost", "DIY Rental (+ seed)", "c"]],
    fn: E.lawnAerationCost, ex: { area: 5000, ratePer1000: 15, overseed: 1, rental: 90 },
    exText: (o) => `Example: aerating and overseeding a 5,000 sq ft lawn costs about ${money(o.totalCost)} from a pro.`,
    how: "Aerate cool-season lawns in early fall and warm-season lawns in late spring, when the grass is growing. Water the day before so the tines go in deep.",
    assume: `Typical prices $10–20 per 1,000 sq ft with a $75 minimum; overseeding about $0.15 per sq ft including seed. ${COST_NOTE}`,
    faq: [["How much does lawn aeration cost?", "About $75–200 for an average lawn."]],
  }),
  mk({
    slug: "grass-seed-calculator", title: "Grass Seed Calculator (Pounds & Bags)",
    desc: "Work out how much grass seed you need for a new lawn or overseeding — pounds and bags by grass type (fescue, bluegrass, ryegrass, Bermuda, Zoysia and more).",
    inputs: [num("area", "Lawn Area", 5000, 1000000, 10, 0, "sq ft"), dd("grass", "Grass Type", E.GRASS_TYPES), dd("mode", "Job", ["New lawn", "Overseeding"]), num("bagLb", "Bag Size", 20, 50, 1, 1, "lb"), usd("bagPrice", "Price per Bag", 80, 1000, 1)],
    results: [["pounds", "Seed Needed (lb)", "n"], ["bags", "Bags", "n"], ["ratePer1000", "Rate (lb per 1,000 sq ft)", "n"], ["cost", "Seed Cost", "c"]],
    fn: E.grassSeed, ex: { area: 5000, grass: 0, mode: 0, bagLb: 20, bagPrice: 80 },
    exText: (o) => `Example: seeding a new 5,000 sq ft tall fescue lawn takes about ${o.pounds} lb — ${o.bags} bags of 20 lb.`,
    how: "Pick the grass type and job. Overseeding uses about half the new-lawn rate. Rake seed into loose soil, keep it moist and mow when the grass reaches about 3–4 in.",
    assume: "Rates (lb per 1,000 sq ft, new/overseed): tall fescue 8/4, Kentucky bluegrass 3/1.5, perennial ryegrass 8/4, fine fescue 5/2.5, Bermuda 2/1, Zoysia 1.5/1, centipede 0.5/0.25, Bahia 8/4. Follow your seed bag's label.",
    faq: [["How much grass seed per 1,000 sq ft?", "About 6–8 lb of tall fescue or 2–3 lb of bluegrass for a new lawn."]],
  }),
  mk({
    slug: "lawn-size-calculator", title: "Lawn Size Calculator (Square Feet & Acres)",
    desc: "Measure your lawn — add up to three rectangles, a circle and a triangle, subtract the house, driveway and beds — in square feet, acres and square meters.",
    inputs: [num("l1", "Area 1 Length", 60, 10000, 0.5, 0, "ft"), num("w1", "Area 1 Width", 40, 10000, 0.5, 0, "ft"), num("l2", "Area 2 Length", 30, 10000, 0.5, 0, "ft"), num("w2", "Area 2 Width", 20, 10000, 0.5, 0, "ft"), num("l3", "Area 3 Length", 0, 10000, 0.5, 0, "ft"), num("w3", "Area 3 Width", 0, 10000, 0.5, 0, "ft"), num("circleDiameter", "Round Area Diameter", 0, 1000, 0.5, 0, "ft"), num("triBase", "Triangle Base", 0, 1000, 0.5, 0, "ft"), num("triHeight", "Triangle Height", 0, 1000, 0.5, 0, "ft"), num("exclude", "Subtract (beds, patio, etc.)", 200, 1000000, 1, 0, "sq ft")],
    results: [["sqFt", "Lawn Area (sq ft)", "n"], ["acres", "Acres", "n"], ["sqMeters", "Square Meters", "n"], ["fertilizerBags5k", "5,000 sq ft Fertilizer Bags", "n"]],
    fn: E.lawnSize, ex: { l1: 60, w1: 40, l2: 30, w2: 20, l3: 0, w3: 0, circleDiameter: 0, triBase: 0, triHeight: 0, exclude: 200 },
    exText: (o) => `Example: a 60 × 40 ft back lawn plus a 30 × 20 ft front lawn, minus 200 sq ft of beds, is ${n2(o.sqFt)} sq ft (${o.acres} acres).`,
    how: "Split the lawn into simple shapes, measure each and subtract anything that isn't grass. Use the total to buy seed, fertilizer and sod — product bags list their coverage in square feet.",
    assume: "Circle area = π × (diameter ÷ 2)²; triangle = ½ × base × height. 1 acre = 43,560 sq ft.",
    faq: [["How big is the average lawn?", "About 5,000–10,000 sq ft for a suburban US home."]],
  }),
  mk({
    slug: "lawn-top-dressing-calculator", title: "Lawn Top Dressing Calculator",
    desc: "Calculate how much compost, sand or soil you need to top-dress a lawn — cubic yards, cubic feet, tons and bags — at 1/8 to 1/2 inch.",
    inputs: [num("area", "Lawn Area", 5000, 1000000, 10, 0, "sq ft"), num("depth", "Depth", 0.25, 1, 0.125, 0.125, "in"), dd("material", "Material", ["Compost", "Sand", "Soil / sand mix"])],
    results: [["cubicYards", "Material (cu yd)", "n"], ["cubicFeet", "Cubic Feet", "n"], ["tons", "Weight (tons)", "n"], ["bags", "1 cu ft Bags", "n"]],
    fn: E.lawnTopDressing, ex: { area: 5000, depth: 0.25, material: 0 },
    exText: (o) => `Example: top-dressing 5,000 sq ft with 1/4 in of compost takes about ${o.cubicYards} cu yd.`,
    how: "Spread 1/8–1/4 in after aerating so the material falls into the holes; never bury the grass more than about 1/2 in at a time.",
    assume: "Tons per cu yd: compost 0.8, sand 1.35, soil/sand mix 1.1.",
    faq: [["How much compost to top-dress a lawn?", "About 0.4 cu yd per 1,000 sq ft at 1/4 in."]],
  }),
  mk({
    slug: "pre-emergent-calculator", title: "Pre-Emergent Herbicide Calculator (Prodiamine Rate)",
    desc: "Work out how much pre-emergent (prodiamine, dithiopyr or granular products) and water you need for your lawn from the label rate per 1,000 sq ft.",
    inputs: [num("area", "Lawn Area", 5000, 1000000, 10, 0, "sq ft"), dd("unit", "Product Form", E.PRE_UNITS), num("ratePer1000", "Label Rate per 1,000 Sq Ft", 0.5, 20, 0.01, 0), num("carrierPer1000", "Water per 1,000 Sq Ft (sprays)", 1, 5, 0.25, 0, "gal"), num("tankGallons", "Sprayer Size", 2, 100, 0.5, 0.5, "gal")],
    results: [["productAmount", "Product Needed (label units)", "n"], ["waterGallons", "Water (gal)", "n"], ["tanks", "Sprayer Tanks", "n"], ["productPerAcre", "Rate per Acre", "n"]],
    fn: E.preEmergent, ex: { area: 5000, unit: 0, ratePer1000: 0.5, carrierPer1000: 1, tankGallons: 2 },
    exText: (o) => `Example: prodiamine 65 WDG at 0.5 oz per 1,000 sq ft on a 5,000 sq ft lawn takes ${o.productAmount} oz in ${o.waterGallons} gallons of water.`,
    how: "Take the rate from your product label (it depends on the product, grass type and how long you need control). Apply before soil reaches 55 °F for several days in spring, then water it in.",
    assume: "Product = area ÷ 1,000 × label rate. This tool doesn't know your product's label — the label is the law, so always check the maximum yearly rate and grass-type restrictions.",
    faq: [["How much prodiamine per gallon?", "It depends on the label rate per 1,000 sq ft and how much water you spray per 1,000 sq ft — often 0.37–0.83 oz of 65 WDG per 1,000 sq ft."]],
  }),
  mk({
    slug: "herbicide-mix-calculator", title: "Herbicide Mix Calculator (Roundup per Gallon & per Acre)",
    desc: "Calculate how much weed killer concentrate to mix — fluid ounces, tablespoons and mL per sprayer tank — plus the area a tank covers and the rate per acre.",
    inputs: [num("ratePerGallon", "Label Rate per Gallon", 2.5, 20, 0.05, 0, "fl oz"), num("tankGallons", "Sprayer Size", 2, 100, 0.5, 0.25, "gal"), num("sprayPer1000", "Spray Volume per 1,000 Sq Ft", 1, 5, 0.25, 0.1, "gal")],
    results: [["productFlOz", "Concentrate per Tank (fl oz)", "n"], ["tablespoons", "Tablespoons", "n"], ["milliliters", "Milliliters", "n"], ["areaCovered", "Area per Tank (sq ft)", "n"], ["productPerAcre", "Concentrate per Acre (fl oz)", "n"]],
    fn: E.herbicideMix, ex: { ratePerGallon: 2.5, tankGallons: 2, sprayPer1000: 1 },
    exText: (o) => `Example: a 41% glyphosate concentrate at 2.5 fl oz per gallon needs ${o.productFlOz} fl oz (${o.tablespoons} tbsp) in a 2-gallon sprayer, covering about ${n2(o.areaCovered)} sq ft.`,
    how: "Enter the rate from your product label (for example 2.5 fl oz per gallon for many 41% glyphosate concentrates, more for tough weeds). Hose-end sprayers such as Ortho Dial N Spray mix automatically — set the dial to the label's oz per gallon.",
    assume: "Concentrate = rate per gallon × tank gallons. Spray to wet the leaves, not to runoff. Always follow the label for rates, protective equipment and where the product can be used.",
    faq: [["How much Roundup per gallon of water?", "Many 41% concentrates use about 2.5 fl oz per gallon for general weeds — check your product's label."]],
  }),
  mk({
    slug: "plant-spacing-calculator", title: "Plant Spacing Calculator (Plants per Area & Row)",
    desc: "Find how many plants fit in a bed, field or hedge row — square or triangular (staggered) spacing — with plants per square foot, per acre and per row.",
    inputs: [num("length", "Bed Length", 20, 100000, 0.5, 0, "ft"), num("width", "Bed Width", 4, 100000, 0.5, 0, "ft"), num("spacing", "Plant Spacing", 12, 600, 0.5, 0.5, "in"), dd("pattern", "Pattern", ["Square grid", "Triangular / staggered"]), num("rowLength", "Hedge or Row Length (optional)", 0, 10000, 0.5, 0, "ft")],
    results: [["plants", "Plants for the Bed", "n"], ["plantsPerSqFt", "Plants per Sq Ft", "n"], ["plantsPerAcre", "Plants per Acre", "n"], ["plantsInRow", "Plants in the Row", "n"]],
    fn: E.plantSpacing, ex: { length: 20, width: 4, spacing: 12, pattern: 0, rowLength: 0 },
    exText: (o) => `Example: a 20 × 4 ft bed at 12 in spacing holds ${o.plants} plants on a square grid (${n2(o.plantsPerAcre)} per acre).`,
    how: "Enter the bed size and the spacing on the plant tag. Triangular spacing fits about 15% more plants and covers ground faster. For hedges, enter the row length — laurel and privet are often planted 2–3 ft apart, arborvitae 3 ft.",
    assume: "Square grid: 1 ÷ spacing²; triangular: × 1.155. Row = length ÷ spacing + 1.",
    faq: [["How far apart should arborvitae be planted?", "About 3 ft apart for a privacy screen (Green Giant 5–6 ft)."]],
  }),
  mk({
    slug: "ground-cover-calculator", title: "Ground Cover Plant Calculator (Plants & Flats)",
    desc: "Calculate how many ground cover plants and flats you need — creeping thyme, vinca, pachysandra, sedum and more — from area and spacing, with cost.",
    inputs: [num("area", "Area", 100, 100000, 1, 0, "sq ft"), num("spacing", "Spacing", 12, 36, 1, 3, "in"), dd("pattern", "Pattern", ["Square grid", "Triangular / staggered"], 1), num("perFlat", "Plants per Flat", 18, 72, 1, 1), usd("pricePerPlant", "Price per Plant", 3, 50, 0.25)],
    results: [["plants", "Plants Needed", "n"], ["flats", "Flats", "n"], ["cost", "Plant Cost", "c"]],
    fn: E.groundCover, ex: { area: 100, spacing: 12, pattern: 1, perFlat: 18, pricePerPlant: 3 },
    exText: (o) => `Example: 100 sq ft planted 12 in apart in a staggered pattern needs ${o.plants} plants — ${o.flats} flats of 18.`,
    how: "Closer spacing fills in faster but costs more. Most ground covers are planted 8–18 in apart and take 1–3 seasons to fill in; mulch between plants meanwhile.",
    assume: "Plants = area ÷ spacing² (× 1.155 staggered).",
    faq: [["How many ground cover plants per square foot?", "About 1 at 12 in spacing, 2.25 at 8 in, 4 at 6 in."]],
  }),
  mk({
    slug: "raised-bed-soil-calculator", title: "Raised Bed Soil Calculator (Cubic Feet, Bags & Mix)",
    desc: "Work out how much soil you need to fill raised garden beds — cubic feet, cubic yards and bags — and how much topsoil, compost and potting mix (or Mel's Mix) to blend.",
    inputs: [num("beds", "Number of Beds", 2, 100, 1, 1), num("length", "Bed Length", 8, 100, 0.5, 0, "ft"), num("width", "Bed Width", 4, 20, 0.5, 0, "ft"), num("depth", "Soil Depth", 12, 48, 1, 1, "in"), dd("mix", "Mix", E.MIXES), num("bagCuFt", "Bag Size", 1.5, 3, 0.25, 0.25, "cu ft")],
    results: [["cubicFeet", "Soil Needed (cu ft)", "n"], ["cubicYards", "Cubic Yards", "n"], ["bags", "Bags", "n"], ["partA", "Topsoil or Compost (cu ft)", "n"], ["partB", "Compost or Peat / Coir (cu ft)", "n"], ["partC", "Potting Mix or Vermiculite (cu ft)", "n"]],
    fn: E.raisedBedSoil, ex: { beds: 2, length: 8, width: 4, depth: 12, mix: 0, bagCuFt: 1.5 },
    exText: (o) => `Example: two 8 × 4 ft beds 12 in deep hold ${o.cubicFeet} cu ft (${o.cubicYards} cu yd) — ${o.bags} bags of 1.5 cu ft, or about ${o.partA} cu ft topsoil, ${o.partB} compost and ${o.partC} potting mix.`,
    how: "Enter your beds and pick a mix. For the 60/30/10 mix, the three parts are topsoil, compost and potting mix; for Mel's Mix they are compost, peat or coir, and vermiculite. Tall beds can be part-filled with logs or branches first.",
    assume: "Bulk soil is far cheaper than bags above about 1 cu yd (27 cu ft). Soil settles 10–20% the first season — top up with compost.",
    faq: [["How much soil for a 4×8 raised bed?", "32 cu ft (about 1.2 cu yd) at 12 in deep."]],
  }),
  mk({
    slug: "potting-soil-calculator", title: "Potting Soil Calculator (Quarts, Liters & Bags)",
    desc: "Find how much potting soil you need for round or square pots and planters — quarts, liters, cubic feet and how many bags.",
    inputs: [num("pots", "Number of Pots", 4, 1000, 1, 1), dd("shape", "Pot Shape", ["Round", "Square"]), num("diameter", "Pot Diameter / Width", 12, 60, 0.5, 2, "in"), num("fillDepth", "Soil Depth", 10, 48, 0.5, 1, "in"), dd("bag", "Bag Size", ["8 qt", "16 qt", "1 cu ft", "1.5 cu ft", "2 cu ft"], 3)],
    results: [["bags", "Bags", "n"], ["quarts", "Dry Quarts", "n"], ["liters", "Liters", "n"], ["cubicFeet", "Cubic Feet", "n"]],
    fn: E.pottingSoil, ex: { pots: 4, shape: 0, diameter: 12, fillDepth: 10, bag: 3 },
    exText: (o) => `Example: four 12 in round pots filled 10 in deep need ${o.quarts} quarts (${o.cubicFeet} cu ft) — ${o.bags} bag(s) of 1.5 cu ft.`,
    how: "Measure the inside diameter and how deep you'll fill (leave about 1 in below the rim). Tapered pots hold less than this, so it slightly overestimates.",
    assume: "Volume = π r² × depth for round pots, width² × depth for square. 1 cu ft = 25.7 dry quarts = 28.3 L.",
    faq: [["How much soil does a 12 inch pot hold?", "About 13–15 quarts."]],
  }),
  mk({
    slug: "seed-starting-calculator", title: "Seed Starting Calculator (When to Start Seeds Indoors)",
    desc: "Find when to start vegetable and flower seeds indoors, when to harden off and when to transplant — counted from your last frost date.",
    inputs: [date("lastFrost", "Average Last Spring Frost", "2027-04-20"), dd("crop", "Crop", E.CROPS)],
    results: [["startIndoors", "Start Seeds Indoors", "d"], ["hardenOff", "Begin Hardening Off", "d"], ["transplant", "Transplant Outdoors", "d"], ["weeksIndoors", "Weeks Indoors", "n"]],
    fn: E.seedStarting, ex: { lastFrost: D(2027, 4, 20), crop: 0 },
    exText: (o) => `Example: with a last frost of April 20, start tomatoes indoors around ${fmtD(o.startIndoors)} and transplant around ${fmtD(o.transplant)}.`,
    how: "Enter your average last frost date (from your extension service or the frost date calculator) and pick a crop. Harden seedlings off for about 7–10 days before transplanting.",
    assume: "Typical timings: tomatoes 7 weeks before frost, peppers and eggplant 9, broccoli and cabbage 7 (out 2–3 weeks before frost), lettuce 5, onions 11, cucumbers, squash and melons 3 (out 2 weeks after frost), basil 6, marigolds 7.",
    faq: [["When should I start tomato seeds indoors?", "About 6–8 weeks before your last frost."]],
  }),
  mk({
    slug: "frost-date-calculator", title: "Frost Date Calculator (Last & First Frost by Zone)",
    desc: "See typical last spring and first fall frost dates for USDA zones 3–10, the length of the growing season and key planting dates.",
    meta: "Frost Date Calculator — Last & First Frost Dates by Zone",
    inputs: [dd("zone", "USDA Hardiness Zone", E.ZONES, 3), num("year", "Year", 2027, 2100, 1, 2000)],
    results: [["lastFrost", "Average Last Spring Frost", "d"], ["firstFrost", "Average First Fall Frost", "d"], ["growingDays", "Growing Season (days)", "n"], ["plantPeas", "Plant Peas", "d"], ["startTomatoes", "Start Tomatoes Indoors", "d"], ["sowBeans", "Sow Beans", "d"], ["transplantTomatoes", "Transplant Tomatoes", "d"], ["plantGarlic", "Plant Garlic", "d"]],
    fn: E.frostDate, ex: { zone: 3, year: 2027 },
    exText: (o) => `Example: in zone 6 the last frost is typically around ${fmtD(o.lastFrost)} and the first around ${fmtD(o.firstFrost)} — about ${o.growingDays} frost-free days.`,
    how: "Pick your zone. Frost dates vary a lot within a zone (hills, valleys, cities), so check your local date with the Farmer's Almanac or extension service and treat these as averages — there's still a chance of frost after the average last date.",
    assume: "Zone averages used: 3 May 15 / Sep 15, 4 May 10 / Sep 25, 5 Apr 30 / Oct 10, 6 Apr 20 / Oct 20, 7 Apr 10 / Oct 30, 8 Mar 25 / Nov 10, 9 Feb 25 / Dec 1, 10 Jan 30 / Dec 15. Planting dates: peas 4 weeks before last frost, tomatoes started 6 weeks before and transplanted 2 weeks after, beans 1 week after, garlic about 4 weeks before first frost.",
    faq: [["What is the last frost date for zone 6?", "Around mid to late April on average."]],
  }),
  mk({
    slug: "vpd-calculator", title: "VPD Calculator (Vapor Pressure Deficit for Grow Rooms)",
    desc: "Calculate leaf and air vapor pressure deficit (VPD) in kPa from temperature, humidity and leaf temperature — and see whether it suits propagation, veg or flower.",
    inputs: [num("airTemp", "Air Temperature", 77, 120, 0.5, 32, "°F"), pct("humidity", "Relative Humidity", 60, 100, 1), num("leafOffset", "Leaf Temperature vs Air", -2, 10, 0.5, -10, "°F")],
    results: [["leafVpd", "Leaf VPD (kPa)", "n"], ["stage", "Best For", "l", E.VPD_STAGES], ["airVpd", "Air VPD (kPa)", "n"], ["svpAir", "Saturation Vapor Pressure (kPa)", "n"], ["actualVp", "Actual Vapor Pressure (kPa)", "n"]],
    fn: E.vpd, ex: { airTemp: 77, humidity: 60, leafOffset: -2 },
    exText: (o) => `Example: 77 °F air at 60% humidity with leaves 2 °F cooler gives a leaf VPD of ${o.leafVpd} kPa — ${E.VPD_STAGES[o.stage].split(" (")[0].toLowerCase()}.`,
    how: "Measure leaf temperature with an infrared thermometer (leaves are usually 1–3 °F cooler than the air). Raise VPD by lowering humidity or raising temperature; lower it by adding humidity.",
    assume: "Tetens equation for saturation vapor pressure. Target ranges are common growing guidelines, not crop-specific rules.",
    faq: [["What is a good VPD for flowering?", "About 1.2–1.5 kPa."]],
  }),
  mk({
    slug: "par-dli-calculator", title: "PAR & DLI Calculator (Grow Light Daily Light Integral)",
    desc: "Calculate the daily light integral (DLI) from PPFD and light hours — or from a grow light's PPF and coverage area — and check it against targets for seedlings, greens, fruiting crops and houseplants.",
    inputs: [num("ppfd", "Measured PPFD (used if PPF is 0)", 400, 2500, 10, 0, "µmol/m²/s"), num("fixturePpf", "Fixture PPF (0 to use PPFD)", 0, 5000, 10, 0, "µmol/s"), num("areaSqFt", "Coverage Area", 16, 1000, 1, 1, "sq ft"), num("hours", "Light Hours per Day", 16, 24, 0.5, 1), dd("crop", "Crop", E.DLI_CROPS, 1)],
    results: [["dli", "Daily Light Integral (mol/m²/day)", "n"], ["status", "Versus Target", "l", E.DLI_STATUS], ["ppfd", "Average PPFD (µmol/m²/s)", "n"], ["ppfdForTarget", "PPFD for Mid-Target", "n"]],
    fn: E.parDli, ex: { ppfd: 400, fixturePpf: 0, areaSqFt: 16, hours: 16, crop: 1 },
    exText: (o) => `Example: 400 µmol/m²/s for 16 hours gives a DLI of ${o.dli} mol/m²/day — ${E.DLI_STATUS[o.status].split(" — ")[0].toLowerCase()} for leafy greens.`,
    how: "Measure PPFD at canopy height with a PAR meter (or a phone app as a rough guide), or enter the fixture's PPF and the area it covers. Adjust the hanging height or hours to reach the crop's target DLI.",
    assume: "DLI = PPFD × hours × 3,600 ÷ 1,000,000. From PPF, average PPFD assumes ~85% of the light lands on the canopy. Target ranges are typical horticulture guidelines.",
    faq: [["What DLI do tomatoes need?", "About 20–30 mol/m²/day."]],
  }),
  mk({
    slug: "grow-room-calculator", title: "Grow Room Calculator (CO2, Exhaust Fan & Dehumidifier)",
    desc: "Size a grow room or tent — exhaust fan CFM with a carbon filter, CO2 needed to reach a target ppm, and dehumidifier pints per day from plant water use.",
    inputs: [num("length", "Room / Tent Length", 4, 100, 0.5, 1, "ft"), num("width", "Room / Tent Width", 4, 100, 0.5, 1, "ft"), num("height", "Height", 7, 20, 0.5, 1, "ft"), num("exchangeMinutes", "Air Exchange Every", 1, 10, 0.5, 0.5, "min"), dd("carbonFilter", "Carbon Filter?", ["No", "Yes"], 1), num("targetPpm", "Target CO2", 1200, 1500, 50, 400, "ppm"), num("ambientPpm", "Outside CO2", 420, 600, 10, 300, "ppm"), num("plants", "Plants", 4, 1000, 1), num("waterPerPlant", "Water per Plant per Day", 0.5, 5, 0.05, 0, "gal")],
    results: [["exhaustCfm", "Exhaust Fan (CFM)", "n"], ["co2CuFt", "CO2 to Reach Target (cu ft)", "n"], ["co2Lb", "CO2 per Fill (lb)", "n"], ["roomCuFt", "Room Volume (cu ft)", "n"], ["dehumidifierPints", "Dehumidifier (pints/day)", "n"]],
    fn: E.growRoom, ex: { length: 4, width: 4, height: 7, exchangeMinutes: 1, carbonFilter: 1, targetPpm: 1200, ambientPpm: 420, plants: 4, waterPerPlant: 0.5 },
    exText: (o) => `Example: a 4 × 4 × 7 ft tent with a carbon filter needs about a ${o.exhaustCfm} CFM fan; four plants drinking 0.5 gal a day release about ${o.dehumidifierPints} pints of water.`,
    how: "Size the fan to change the air every 1–5 minutes. Carbon filters and long duct runs cut airflow, so size up. Only add CO2 in a sealed room with the exhaust off.",
    assume: "CFM = volume ÷ exchange minutes × 1.2 (ducting) × 1.25 (carbon filter). CO2 density 1.98 kg/m³. About 90% of irrigation water is transpired.",
    faq: [["What size fan for a 4x4 tent?", "About 150–250 CFM, depending on lights and filter."]],
  }),
  mk({
    slug: "greenhouse-heater-calculator", title: "Greenhouse Heater Size Calculator (BTU)",
    desc: "Size a greenhouse heater — BTU per hour, kW and propane use — from the greenhouse size, covering (glass, poly or polycarbonate) and the temperature difference.",
    inputs: [num("length", "Length", 16, 500, 0.5, 4, "ft"), num("width", "Width", 10, 100, 0.5, 4, "ft"), num("eaveHeight", "Side Wall Height", 7, 20, 0.5, 3, "ft"), dd("cover", "Covering", E.GREENHOUSE_COVERS, 3), num("insideTemp", "Minimum Inside Temperature", 50, 80, 1, 32, "°F"), num("outsideTemp", "Coldest Night Outside", 20, 60, 1, -40, "°F")],
    results: [["btuPerHour", "Heater Size (BTU/hr)", "n"], ["kilowatts", "Electric Heater (kW)", "n"], ["propaneGalPerHour", "Propane at Full Output (gal/hr)", "n"], ["surfaceAreaSqFt", "Surface Area (sq ft)", "n"]],
    fn: E.greenhouseHeater, ex: { length: 16, width: 10, eaveHeight: 7, cover: 3, insideTemp: 50, outsideTemp: 20 },
    exText: (o) => `Example: a 16 × 10 ft twin-wall polycarbonate greenhouse kept at 50 °F on a 20 °F night needs about ${n2(o.btuPerHour)} BTU/hr (${o.kilowatts} kW).`,
    how: "Enter the size, covering and the coldest night you plan for. Bubble wrap or a second film layer cuts heat loss dramatically. Vent fuel-burning heaters and keep a CO detector.",
    assume: "Heat loss = surface area × U × ΔT + 10% for air leaks; U (BTU/hr·sq ft·°F): glass 1.13, single poly 1.15, double poly 0.70, twin-wall 0.65. Gable roof at about 30°.",
    faq: [["What size heater for a 10x12 greenhouse?", "Roughly 8,000–15,000 BTU/hr for a 30 °F temperature lift, depending on the covering."]],
  }),
  mk({
    slug: "greenhouse-ventilation-calculator", title: "Greenhouse Ventilation Calculator (Exhaust Fan CFM)",
    desc: "Size greenhouse exhaust fans — total CFM, CFM per fan and intake louver area — from the floor area and elevation, for one air change per minute.",
    inputs: [num("length", "Length", 24, 500, 0.5, 4, "ft"), num("width", "Width", 12, 100, 0.5, 4, "ft"), num("cfmPerSqFt", "CFM per Sq Ft of Floor", 8, 15, 0.5, 4), num("elevation", "Elevation", 0, 10000, 100, 0, "ft"), num("fans", "Number of Fans", 1, 20, 1, 1)],
    results: [["totalCfm", "Total Exhaust (CFM)", "n"], ["cfmPerFan", "CFM per Fan", "n"], ["intakeSqFt", "Intake Louver Area (sq ft)", "n"], ["floorSqFt", "Floor Area (sq ft)", "n"]],
    fn: E.greenhouseVentilation, ex: { length: 24, width: 12, cfmPerSqFt: 8, elevation: 0, fans: 1 },
    exText: (o) => `Example: a 24 × 12 ft greenhouse needs about ${n2(o.totalCfm)} CFM of exhaust and roughly ${o.intakeSqFt} sq ft of intake louvers.`,
    how: "Use about 8 CFM per sq ft for summer cooling (up to 12 in hot climates). Put fans on the downwind end and intakes on the opposite end so air sweeps the whole house.",
    assume: "One air change per minute ≈ 8 CFM per sq ft at sea level, +4% per 1,000 ft of elevation; intake area = CFM ÷ 400 fpm.",
    faq: [["How many CFM does a greenhouse need?", "About 8–12 CFM per sq ft of floor area for summer cooling."]],
  }),
  mk({
    slug: "sun-hours-calculator", title: "Sunlight Hours Calculator (Daylight & Sun Angle for Gardens)",
    desc: "Find daylight hours and the noon sun angle for any latitude and date — and what the hours of direct sun in your garden spot mean (full sun, part shade or shade).",
    inputs: [num("latitude", "Latitude", 40, 66, 0.1, -66, "°"), date("date", "Date", "2027-06-21"), num("directHours", "Hours of Direct Sun You Observe", 6, 16, 0.5, 0)],
    results: [["daylightHours", "Daylight Hours", "n"], ["noonSunAngle", "Noon Sun Height (°)", "n"], ["sunCategory", "Your Spot Is", "l", E.SUN_CATEGORIES], ["declination", "Sun Declination (°)", "n"]],
    fn: E.sunHours, ex: { latitude: 40, date: D(2027, 6, 21), directHours: 6 },
    exText: (o) => `Example: at 40° N on June 21 there are ${o.daylightHours} hours of daylight and the noon sun is ${o.noonSunAngle}° above the horizon.`,
    how: "Enter your latitude and date. Then check your garden spot every hour or two on a sunny day and count the hours it gets direct sun — that, not daylight length, decides what will grow.",
    assume: "Day length from solar declination (ignores refraction and terrain). Plant labels: full sun = 6+ hours of direct sun, part sun 3–6, shade under 3.",
    faq: [["What counts as full sun?", "At least 6 hours of direct sunlight a day."]],
  }),
  mk({
    slug: "rainwater-collection-calculator", title: "Rainwater Harvesting Calculator (Gallons from Your Roof)",
    desc: "Calculate how much rainwater you can collect from a roof — gallons per storm and per year, rain barrels needed and gallons per inch of rain.",
    inputs: [num("roofArea", "Roof Footprint Draining to the Barrel", 1000, 100000, 10, 0, "sq ft"), num("stormInches", "Rain per Storm", 1, 10, 0.1, 0, "in"), num("annualInches", "Annual Rainfall", 40, 200, 1, 0, "in"), pct("efficiency", "Collection Efficiency", 85, 100, 1)],
    results: [["gallonsPerStorm", "Gallons per Storm", "n"], ["gallonsPerYear", "Gallons per Year", "n"], ["barrels55", "55-Gallon Barrels for One Storm", "n"], ["gallonsPerInch", "Gallons per Inch of Rain", "n"]],
    fn: E.rainwaterCollection, ex: { roofArea: 1000, stormInches: 1, annualInches: 40, efficiency: 85 },
    exText: (o) => `Example: 1,000 sq ft of roof collects about ${o.gallonsPerStorm} gallons from a 1 in storm and ${n2(o.gallonsPerYear)} gallons a year with 40 in of rain.`,
    how: "Use the roof's footprint (not the sloped area) for the part that drains to your downspout. Some states limit rainwater collection — check local rules.",
    assume: "1 in of rain on 1 sq ft = 0.623 gallons; efficiency covers evaporation, first-flush diversion and overflow.",
    faq: [["How much water can I collect from my roof?", "About 600 gallons per inch of rain per 1,000 sq ft."]],
  }),
  mk({
    slug: "sprinkler-zone-calculator", title: "Sprinklers per Zone Calculator (GPM & Heads)",
    desc: "Work out how many sprinkler heads you can run per zone from your water supply (bucket test or GPM) — spray heads, rotors or rotary nozzles — and weekly water use.",
    inputs: [num("bucketGallons", "Bucket Size (bucket test)", 5, 10, 0.5, 1, "gal"), num("bucketSeconds", "Seconds to Fill (0 to enter GPM)", 30, 600, 1, 0), num("supplyGpm", "Supply Flow (if no bucket test)", 10, 100, 0.5, 0, "GPM"), dd("head", "Head Type", ["Fixed spray heads", "Rotors", "Rotary nozzles (MP-style)"]), dd("arc", "Typical Arc", ["Full circle", "Half circle", "Quarter circle"], 1), num("minutes", "Minutes per Run", 20, 120, 1, 1), num("runsPerWeek", "Runs per Week", 3, 14, 1, 1)],
    results: [["headsPerZone", "Heads per Zone", "n"], ["supplyGpm", "Supply Flow (GPM)", "n"], ["usableGpm", "Usable Flow (75%)", "n"], ["gallonsPerWeek", "Water per Zone per Week (gal)", "n"]],
    fn: E.sprinklerZone, ex: { bucketGallons: 5, bucketSeconds: 30, supplyGpm: 10, head: 0, arc: 1, minutes: 20, runsPerWeek: 3 },
    exText: (o) => `Example: a 5-gallon bucket that fills in 30 seconds means ${o.supplyGpm} GPM — enough for about ${o.headsPerZone} half-circle spray heads per zone.`,
    how: "Time how long an outdoor spigot takes to fill a bucket, then pick your head type. Keep each zone to about 75% of the supply so pressure stays up. Don't mix sprays and rotors on one zone.",
    assume: "Full-circle flow: spray 1.6 GPM, rotor 3 GPM, rotary nozzle 0.9 GPM (scaled by arc). Check the nozzle chart for your heads.",
    faq: [["How many sprinkler heads per zone?", "Typically 4–8 spray heads or 3–6 rotors on a 10–12 GPM supply."]],
  }),
  mk({
    slug: "drip-irrigation-calculator", title: "Drip Irrigation Calculator (Flow, Emitters & Zones)",
    desc: "Calculate drip irrigation flow — GPH and GPM from emitters and drip line — gallons per watering, emitters on a drip line and how many zones your water supply can run.",
    inputs: [num("emitters", "Individual Emitters", 20, 10000, 1), num("emitterGph", "Emitter Flow", 1, 10, 0.1, 0.1, "GPH"), num("lineFeet", "Drip Line (inline emitters)", 100, 10000, 1, 0, "ft"), num("spacing", "Inline Emitter Spacing", 12, 36, 1, 4, "in"), num("lineGph", "Inline Emitter Flow", 0.9, 4, 0.1, 0.1, "GPH"), num("minutes", "Minutes per Watering", 30, 600, 1, 1), num("supplyGpm", "Water Supply", 8, 50, 0.5, 0.5, "GPM")],
    results: [["totalGph", "Total Flow (GPH)", "n"], ["totalGpm", "Total Flow (GPM)", "n"], ["gallonsPerWatering", "Gallons per Watering", "n"], ["lineEmitters", "Emitters on the Drip Line", "n"], ["zonesNeeded", "Zones Needed", "n"]],
    fn: E.dripIrrigation, ex: { emitters: 20, emitterGph: 1, lineFeet: 100, spacing: 12, lineGph: 0.9, minutes: 30, supplyGpm: 8 },
    exText: (o) => `Example: 20 one-GPH emitters plus 100 ft of drip line with 0.9 GPH emitters every 12 in use ${o.totalGph} GPH (${o.totalGpm} GPM) — ${o.gallonsPerWatering} gallons per 30-minute watering.`,
    how: "Add up all emitters and drip line. Keep 1/2 in tubing runs to about 200 ft and 1/4 in tubing to about 30 ft. Use a pressure regulator (25–30 psi) and a filter.",
    assume: "Zones = total GPM ÷ (75% of supply), rounded up.",
    faq: [["How long should I run drip irrigation?", "Often 30–60 minutes 2–3 times a week, depending on soil and plants."]],
  }),
  mk({
    slug: "hose-flow-calculator", title: "Garden Hose Flow Rate Calculator (GPM & Fill Time)",
    desc: "Estimate how many gallons per minute a garden hose delivers from its diameter, length and water pressure — plus the hose's own volume and the time to fill a pool or tank.",
    inputs: [dd("diameter", "Hose Diameter", ["1/2 in", "5/8 in", "3/4 in", "1 in"], 1), num("length", "Hose Length", 50, 500, 5, 5, "ft"), num("pressure", "Water Pressure", 50, 120, 1, 15, "psi"), num("fillGallons", "Gallons to Fill (optional)", 0, 1000000, 10, 0)],
    results: [["gpm", "Flow (GPM)", "n"], ["gph", "Flow (gallons per hour)", "n"], ["fillMinutes", "Fill Time (minutes)", "n"], ["hoseVolumeGallons", "Water Inside the Hose (gal)", "n"]],
    fn: E.hoseFlow, ex: { diameter: 1, length: 50, pressure: 50, fillGallons: 0 },
    exText: (o) => `Example: a 50 ft, 5/8 in hose at 50 psi delivers roughly ${o.gpm} GPM — about ${n2(o.gph)} gallons an hour.`,
    how: "Enter your hose and home water pressure (40–60 psi is typical). Real flow is usually lower because of the spigot, fittings and nozzle — time a bucket for the real number.",
    assume: "Hazen–Williams friction (C = 140) with 10 psi left at the outlet. An estimate only.",
    faq: [["How many GPM does a garden hose put out?", "About 9–17 GPM for a 5/8 in hose at typical pressure, less with a nozzle."]],
  }),
  mk({
    slug: "tree-age-calculator", title: "Tree Age Calculator (from Trunk Circumference)",
    desc: "Estimate a tree's age from its trunk circumference or diameter at 4.5 ft and its species growth factor — oak, maple, pine, birch, walnut and more.",
    inputs: [num("circumference", "Trunk Circumference at 4.5 ft", 60, 1000, 0.5, 1, "in"), num("diameter", "Or Diameter (0 to use circumference)", 0, 400, 0.5, 0, "in"), dd("species", "Species", E.TREE_SPECIES)],
    results: [["ageYears", "Estimated Age (years)", "n"], ["diameterIn", "Diameter (in)", "n"], ["growthFactor", "Growth Factor", "n"]],
    fn: E.treeAge, ex: { circumference: 60, diameter: 0, species: 0 },
    exText: (o) => `Example: a red oak with a 60 in circumference (${o.diameterIn} in diameter) is roughly ${o.ageYears} years old.`,
    how: "Wrap a tape around the trunk 4.5 ft above the ground (diameter at breast height). Trees in open, well-watered sites grow faster than forest trees, so the result is an estimate.",
    assume: "Age = diameter × species growth factor (ISA / Morton Arboretum values, e.g. red oak 4.0, white oak 5.0, sugar maple 5.5, silver maple 3.0, white pine 5.0).",
    faq: [["How do you tell a tree's age without cutting it?", "Multiply its diameter at 4.5 ft by its species growth factor."]],
  }),
  mk({
    slug: "tree-value-calculator", title: "Tree Value Calculator (Appraisal by Trunk Formula)",
    desc: "Estimate the appraised value of a landscape tree with a simplified trunk formula — trunk area, unit price and species, condition and location ratings.",
    inputs: [num("dbh", "Trunk Diameter at 4.5 ft", 18, 120, 0.5, 1, "in"), usd("unitPrice", "Unit Price per Sq In of Trunk", 50, 200, 1), pct("species", "Species Rating", 70, 100, 5), pct("condition", "Condition Rating", 80, 100, 5), pct("location", "Location Rating", 80, 100, 5)],
    results: [["value", "Appraised Value", "c"], ["trunkAreaSqIn", "Trunk Area (sq in)", "n"], ["basicValue", "Basic Value (before ratings)", "c"]],
    fn: E.treeValue, ex: { dbh: 18, unitPrice: 50, species: 70, condition: 80, location: 80 },
    exText: (o) => `Example: an 18 in tree in good condition is valued at about ${money(o.value)} with these ratings.`,
    how: "Ratings run 0–100%: species (how desirable and long-lived it is), condition (health and structure) and location (how much it adds to the site). For insurance or legal claims, hire an ISA-certified arborist.",
    assume: "Value = trunk cross-section area × unit price × species × condition × location. Unit prices vary by region (often $40–90 per sq in). The current CTLA Guide for Plant Appraisal uses more detailed methods.",
    faq: [["How much is a mature tree worth?", "Often several thousand dollars — large healthy trees can be valued at $10,000 or more."]],
  }),
  mk({
    slug: "root-protection-area-calculator", title: "Root Protection Area Calculator (BS 5837)",
    desc: "Calculate a tree's root protection area (RPA) and radius under BS 5837:2012 — for single or multi-stemmed trees — from stem diameters at 1.5 m.",
    inputs: [num("stem1", "Stem 1 Diameter", 400, 3000, 5, 0, "mm"), num("stem2", "Stem 2 Diameter (0 if none)", 0, 3000, 5, 0, "mm"), num("stem3", "Stem 3", 0, 3000, 5, 0, "mm"), num("stem4", "Stem 4", 0, 3000, 5, 0, "mm"), num("stem5", "Stem 5", 0, 3000, 5, 0, "mm"), num("extraStems", "Further Stems (beyond 5)", 0, 50, 1, 0), num("extraMean", "Mean Diameter of Further Stems", 0, 3000, 5, 0, "mm")],
    results: [["rpaRadiusM", "RPA Radius (m)", "n"], ["rpaAreaM2", "RPA Area (m²)", "n"], ["squareSideM", "Equivalent Square Side (m)", "n"], ["combinedDiameterMm", "Combined Stem Diameter (mm)", "n"]],
    fn: E.rootProtectionArea, ex: { stem1: 400, stem2: 0, stem3: 0, stem4: 0, stem5: 0, extraStems: 0, extraMean: 0 },
    exText: (o) => `Example: a single-stemmed tree 400 mm across at 1.5 m has an RPA radius of ${o.rpaRadiusM} m — ${o.rpaAreaM2} m².`,
    how: "Measure stem diameter 1.5 m above ground. For trees with up to five stems, enter each one; for more, enter the extra stems' count and mean diameter. Protect the RPA with fencing during construction.",
    assume: "BS 5837:2012: radius = 12 × diameter; 2–5 stems d = √(Σd²); more than 5 stems d = √(mean d² × n); RPA capped at 707 m² (15 m radius). An arboriculturist can adjust the shape for site conditions.",
    faq: [["How is a root protection area calculated?", "Radius = 12 times the stem diameter at 1.5 m (BS 5837)."]],
  }),
  mk({
    slug: "firewood-cord-calculator", title: "Firewood Cord Calculator (Cords, Face Cords & Weight)",
    desc: "Measure a firewood stack in full cords and face cords, its weight by species and its value — and see how many cords a season of burning takes.",
    inputs: [num("length", "Stack Length", 8, 1000, 0.5, 0, "ft"), num("height", "Stack Height", 4, 10, 0.5, 0, "ft"), num("logLength", "Log Length", 16, 48, 1, 6, "in"), dd("species", "Wood", E.WOOD_SPECIES), usd("pricePerCord", "Price per Full Cord", 300, 2000, 5), dd("use", "How You Burn", ["Occasional fires", "Weekends all winter", "Main heat source"], 1)],
    results: [["cords", "Full Cords", "n"], ["faceCords", "Face Cords (ricks)", "n"], ["cubicFeet", "Cubic Feet", "n"], ["weightLb", "Seasoned Weight (lb)", "n"], ["value", "Value", "c"], ["cordsForSeason", "Typical Cords per Season", "n"]],
    fn: E.firewoodCord, ex: { length: 8, height: 4, logLength: 16, species: 0, pricePerCord: 300, use: 1 },
    exText: (o) => `Example: an 8 × 4 ft stack of 16 in logs is ${o.cords} cord — ${o.faceCords} face cord — and weighs about ${n2(o.weightLb)} lb in seasoned red oak.`,
    how: "Measure the stacked wood (tightly stacked, not thrown). A full cord is 4 × 4 × 8 ft = 128 cu ft; a face cord (rick) is 4 × 8 ft of one row, usually 16 in logs — a third of a cord.",
    assume: "Seasoned weight per cord: red oak 3,600 lb, white oak 4,200, sugar maple 3,700, ash 3,500, birch 3,000, cherry 2,900, pine 2,200, poplar 2,100. Season use is a rough guide.",
    faq: [["How much is a face cord compared to a full cord?", "With 16 in logs, a face cord is one third of a full cord."]],
  }),
  mk({
    slug: "chainsaw-chain-calculator", title: "Chainsaw Chain Length Calculator (Drive Links)",
    desc: "Estimate the number of drive links a chainsaw chain needs from the bar length and chain pitch — 1/4, .325, 3/8 low profile, 3/8 and .404.",
    inputs: [num("barLength", "Bar Length", 18, 42, 1, 6, "in"), dd("pitch", "Chain Pitch", E.CHAIN_PITCHES, 1)],
    results: [["driveLinks", "Approximate Drive Links", "n"], ["chainLengthIn", "Chain Loop Length (in)", "n"], ["pitchIn", "Pitch (in)", "n"]],
    fn: E.chainsawChain, ex: { barLength: 18, pitch: 1 },
    exText: (o) => `Example: an 18 in bar with .325 pitch chain usually takes about ${o.driveLinks} drive links.`,
    how: "Use this as a starting point — the exact drive-link count, pitch and gauge are stamped on the bar tail or listed in the saw's manual, and the same bar length can need different chains.",
    assume: "Chain loop ≈ 2 × bar length + the wrap around the sprocket and nose (8–14 in by pitch); drive links = loop ÷ (2 × pitch).",
    faq: [["How many drive links on an 18 inch chain?", "Commonly 62 (3/8 low profile), 68–72 (.325) or 66–68 (3/8) — check the bar."]],
  }),
  mk({
    slug: "pumpkin-weight-calculator", title: "Giant Pumpkin Weight Calculator (OTT Method)",
    desc: "Estimate a giant pumpkin's weight from its over-the-top (OTT) measurement — side to side, stem to blossom and circumference — in pounds and kilograms with a heavy/light range.",
    inputs: [num("ott", "Over-the-Top Measurement (OTT)", 300, 700, 1, 50, "in")],
    results: [["weightLb", "Estimated Weight (lb)", "n"], ["weightKg", "Estimated Weight (kg)", "n"], ["heavyLb", "If It Goes Heavy (+15%)", "n"], ["lightLb", "If It Goes Light (−15%)", "n"]],
    fn: E.pumpkinWeight, ex: { ott: 300 },
    exText: (o) => `Example: an OTT of 300 in estimates about ${n2(o.weightLb)} lb (${o.weightKg} kg).`,
    how: "Add three tape measurements over the top of the pumpkin: side to side (ground to ground across the middle), stem to blossom end, and the circumference around the widest part. Enter the total.",
    assume: "Uses the regression behind the 2019 growers' OTT weight chart. Pumpkins often weigh 10–25% more or less than chart (\"going heavy\" or \"light\") — only a certified scale is official.",
    faq: [["How do you measure a giant pumpkin's OTT?", "Side-to-side + stem-to-blossom + circumference, all measured over the top in inches."]],
  }),
  mk({
    slug: "chicken-coop-size-calculator", title: "Chicken Coop Size Calculator (Coop, Run, Nests & Roosts)",
    desc: "Work out how big a chicken coop and run should be for your flock — square feet per bird for bantams, standard or large breeds — with nest boxes and roost length.",
    inputs: [num("hens", "Number of Chickens", 6, 500, 1, 1), dd("breed", "Breed Size", ["Bantam", "Standard (e.g. Leghorn, Rhode Island Red)", "Large (e.g. Brahma, Jersey Giant)"], 1), dd("range", "Outdoor Access", ["Confined to coop + run", "Run plus some free-ranging", "Free-range all day"])],
    results: [["coopSqFt", "Coop Floor (sq ft)", "n"], ["runSqFt", "Run (sq ft)", "n"], ["nestBoxes", "Nest Boxes", "n"], ["roostInches", "Roost Bar Length (in)", "n"]],
    fn: E.chickenCoopSize, ex: { hens: 6, breed: 1, range: 0 },
    exText: (o) => `Example: six standard hens need about ${o.coopSqFt} sq ft of coop, a ${o.runSqFt} sq ft run, ${o.nestBoxes} nest boxes and ${o.roostInches} in of roost bar.`,
    how: "Pick breed size and how much they roam. More space reduces pecking and disease. Check local rules on flock size and roosters.",
    assume: "Coop: 2 / 4 / 5 sq ft per bird (bantam / standard / large), 20% less if free-ranging; run 8 / 10 / 15 sq ft per bird; one nest box per 4 hens; 7–10 in of roost per bird.",
    faq: [["How big should a coop be for 6 chickens?", "About 24 sq ft of coop and a 60 sq ft run for standard breeds."]],
  }),
  mk({
    slug: "hammock-hang-calculator", title: "Hammock Hang Calculator (Strap Length, Height & Force)",
    desc: "Work out how high to hang a hammock, how long the straps need to be and the force on each tree — from hammock length, the distance between anchors and the hang angle.",
    inputs: [num("hammockLength", "Hammock Length (end to end)", 11, 14, 0.5, 6, "ft"), num("distance", "Distance Between Trees", 15, 30, 0.5, 6, "ft"), num("angle", "Hang Angle", 30, 60, 1, 10, "°"), num("sitHeight", "Desired Sit Height", 18, 36, 1, 6, "in"), num("weight", "Occupant Weight", 200, 500, 5, 20, "lb")],
    results: [["hangHeightIn", "Hang Point Height (in)", "n"], ["strapLengthFt", "Strap Length Each Side (ft)", "n"], ["forcePerStrapLb", "Force on Each Anchor (lb)", "n"], ["ridgelineFt", "Ideal Ridgeline (ft)", "n"]],
    fn: E.hammockHang, ex: { hammockLength: 11, distance: 15, angle: 30, sitHeight: 18, weight: 200 },
    exText: (o) => `Example: an 11 ft hammock between trees 15 ft apart at 30° hangs from about ${o.hangHeightIn} in up, with ${o.strapLengthFt} ft straps and ${o.forcePerStrapLb} lb on each tree.`,
    how: "A 30° hang angle is the classic sweet spot — flatter angles multiply the force on straps and trees. Use wide tree straps (at least 1 in) to protect the bark.",
    assume: "Ridgeline ≈ 83% of hammock length; force per strap = weight ÷ (2 sin θ); the hammock body sags √((length ÷ 2)² − (ridgeline ÷ 2)²) below the hang line. A simplified version of hammock-hang formulas.",
    faq: [["How high should I hang my hammock?", "About 6 ft up at a 30° angle for trees around 15 ft apart."]],
  }),
  mk({
    slug: "compost-calculator", title: "Compost Calculator (Carbon-to-Nitrogen Ratio)",
    desc: "Calculate your compost pile's carbon-to-nitrogen (C:N) ratio from up to three ingredients, see how many pounds of leaves or grass to add to reach 30:1, and how much compost to spread.",
    inputs: [MAT3("m1", "Ingredient 1", 0), num("lb1", "Ingredient 1 Weight", 30, 10000, 1, 0, "lb"), MAT3("m2", "Ingredient 2", 5), num("lb2", "Ingredient 2 Weight", 20, 10000, 1, 0, "lb"), MAT3("m3", "Ingredient 3", 1), num("lb3", "Ingredient 3 Weight", 10, 10000, 1, 0, "lb"), num("spreadArea", "Area to Spread Compost (optional)", 0, 1000000, 1, 0, "sq ft"), num("spreadDepth", "Spread Depth", 1, 6, 0.25, 0, "in")],
    results: [["ratio", "C:N Ratio (x:1)", "n"], ["status", "Your Mix", "l", E.COMPOST_STATUS], ["addLeavesLb", "Dry Leaves to Add (lb)", "n"], ["addGrassLb", "Grass Clippings to Add (lb)", "n"], ["spreadYards", "Compost to Spread (cu yd)", "n"]],
    fn: E.compost, ex: { m1: 0, lb1: 30, m2: 5, lb2: 20, m3: 1, lb3: 10, spreadArea: 0, spreadDepth: 1 },
    exText: (o) => `Example: 30 lb of grass, 20 lb of dry leaves and 10 lb of food scraps have a C:N ratio of about ${o.ratio}:1 — ${E.COMPOST_STATUS[o.status].split(" — ")[0].toLowerCase()}.`,
    how: "Weigh (or estimate) what goes in. Aim for about 25–35 parts carbon to 1 part nitrogen; keep the pile as damp as a wrung-out sponge and turn it every week or two.",
    assume: "Typical C:N and nitrogen content: grass 20:1 / 2.4%, food scraps 15:1 / 2.5%, coffee grounds 20:1 / 2%, cow manure 20:1 / 1.7%, chicken manure 7:1 / 3.5%, dry leaves 60:1 / 0.9%, straw 80:1 / 0.6%, wood chips 400:1, cardboard 350:1, newspaper 175:1. Real materials vary.",
    faq: [["What is the best C:N ratio for compost?", "About 30:1 (25–35:1)."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-house-garden-category.ts --apply" first.`);

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
