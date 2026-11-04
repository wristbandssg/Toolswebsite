// One-time (but safe to re-run) batch setup script: creates 17 landscaping, aggregate & paving
// calculators (Business & Industrial Calculators > Landscaping, Aggregate & Paving Calculators).
// Densities and formulas live in src/lib/calc-engine-biz-landscape.ts; examples are computed from
// the engine. Merged keywords (no separate page): River Rock, Martin Marietta, FRED Burrows → gravel;
// Class 5, Base Material → road-base; Hot Top → asphalt; Tonnage → bulk-material. Artificial grass cost
// → existing artificial-turf-cost-calculator.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-landscape-calculators.ts
// or
//   npm run db:create-biz-landscape-calculators

import * as E from "../src/lib/calc-engine-biz-landscape";

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

const CAT = "landscaping-aggregate-paving-calculators";
const NOTE = "Densities vary by quarry, moisture and stone size — ask your supplier for their tons-per-yard figure and order 5–10% extra.";

const SHAPE = dropdown("shape", "Area Shape", opts(["Rectangle", "Circle (length = diameter)"]), 0);
const L = (def: number) => num("length", "Length or Diameter (ft)", def, 10000, 0.5);
const W = (def: number) => num("width", "Width (ft)", def, 10000, 0.5);
const D = (def: number, label = "Depth (in)") => num("depth", label, def, 60, 0.5);
const TRUCK = num("truckTons", "Truck Capacity (tons)", 15, 40, 1);
const SPREAD: Line[] = [["tons", "Tons Needed", "n"], ["cubicYards", "Cubic Yards", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["bags50lb", "50 lb Bags (if bagged)", "n"], ["truckLoads", "Truck Loads", "n"], ["totalCost", "Total Cost", "c"]];

const TOOLS: ToolDef[] = [
  mk({
    slug: "gravel-calculator", title: "Gravel Calculator",
    desc: "Calculate how much gravel you need in tons and cubic yards — pea gravel, #57 stone, river rock, crushed concrete or decomposed granite — with truck loads and cost.",
    meta: "Gravel Calculator — Tons & Cubic Yards of Gravel",
    inputs: [SHAPE, L(20), W(10), D(3), dropdown("material", "Material", opts(E.GRAVELS.map(([n, t]) => `${n} (${t} t/yd³)`)), 1), pct("waste", "Extra", 5, 50, 1), cur("pricePerTon", "Price per Ton", 45, 1000, 0.5), cur("delivery", "Delivery Fee", 85, 5000), TRUCK],
    results: SPREAD,
    fn: E.gravel, ex: { shape: 0, length: 20, width: 10, depth: 3, material: 1, waste: 5, pricePerTon: 45, delivery: 85, truckTons: 15 },
    exText: (o) => `Example: a 20 × 10 ft area 3 in deep needs ${o.cubicYards} yd³ of #57 stone — ${o.tons} tons, about ${usd(o.totalCost)} delivered at $45 a ton.`,
    how: "Enter the area and depth, pick the stone, and add your supplier's price per ton and delivery fee. For river rock, use at least 2× the stone size as depth.",
    assume: "Tons = cubic yards × density. Typical loose densities from quarry conversion charts (Martin Marietta, Vulcan and local suppliers publish similar figures). Common depths: paths 2–3 in, driveways 4–6 in.",
    faq: [["How many tons of gravel in a cubic yard?", "About 1.35–1.5 tons for most gravel and crushed stone."], ["How much area does a ton of gravel cover?", "About 100 sq ft at 2 in deep, or 70 sq ft at 3 in."], ["How much river rock do I need?", "Use 2 in depth for 1–2 in rock and 3–4 in for larger rock; a ton covers roughly 80–100 sq ft at 2 in."]],
  }),
  mk({
    slug: "road-base-calculator", title: "Road Base Calculator",
    desc: "Calculate road base, Class 5 or crusher run for driveways and pads — compacted and loose cubic yards, tons, truck loads and cost, with a compaction allowance.",
    meta: "Road Base & Class 5 Calculator — Tons Needed",
    inputs: [SHAPE, L(100), W(12), D(6, "Compacted Depth (in)"), dropdown("material", "Material", opts(E.BASES.map(([n, t]) => `${n} (${t} t/yd³ loose)`)), 0), pct("compaction", "Compaction Allowance", 25, 60, 1), cur("pricePerTon", "Price per Ton", 32, 500, 0.5), cur("delivery", "Delivery Fee", 150, 5000), TRUCK],
    results: [SPREAD[0], ["compactedCubicYards", "Compacted Cubic Yards", "n"], ["looseCubicYards", "Loose Cubic Yards to Order", "n"], SPREAD[5], SPREAD[6]],
    fn: E.roadBase, ex: { shape: 0, length: 100, width: 12, depth: 6, material: 0, compaction: 25, pricePerTon: 32, delivery: 150, truckTons: 15 },
    exText: (o) => `Example: a 100 × 12 ft driveway with 6 in of compacted road base needs ${o.compactedCubicYards} yd³ in place — order ${o.looseCubicYards} loose yd³, about ${o.tons} tons (${o.truckLoads} loads, ${usd(o.totalCost)}).`,
    how: "Enter the area and the finished (compacted) depth, the base material and how much it compacts. 20–30% is typical for well-graded base.",
    assume: "Loose volume = compacted volume × (1 + compaction %). Class 5 (Minnesota), crusher run, ABC and dense-grade aggregate behave similarly. Compact in 2–4 in lifts.",
    faq: [["How much does road base compact?", "Usually 20–30% — 1 loose yard compacts to about 0.75–0.8 yards."], ["How deep should road base be for a driveway?", "4–6 in compacted for cars on firm soil, 8–12 in for trucks or soft ground."]],
  }),
  mk({
    slug: "sand-calculator", title: "Sand Calculator",
    desc: "Calculate sand in tons, cubic yards and 50 lb bags — fill, mason, play, concrete or paver sand, dry or wet — with truck loads and cost.",
    meta: "Sand Calculator — Yards & Tons of Sand",
    inputs: [SHAPE, L(10), W(10), D(2), dropdown("material", "Sand Type", opts(E.SANDS.map(([n, t]) => `${n} (${t} t/yd³)`)), 0), pct("waste", "Extra", 5, 50, 1), cur("pricePerTon", "Price per Ton", 40, 1000, 0.5), cur("delivery", "Delivery Fee", 85, 5000), TRUCK],
    results: SPREAD,
    fn: E.sand, ex: { shape: 0, length: 10, width: 10, depth: 2, material: 0, waste: 5, pricePerTon: 40, delivery: 85, truckTons: 15 },
    exText: (o) => `Example: a 10 × 10 ft area 2 in deep needs ${o.cubicYards} yd³ of sand, ${o.tons} tons or ${o.bags50lb} × 50 lb bags.`,
    how: "Enter the area and depth and choose the sand. Wet sand is heavier per yard, so it weighs more for the same volume.",
    assume: "Dry sand ≈ 100 lb/ft³ (1.35 t/yd³); wet sand ≈ 1.7 t/yd³. Paver bedding is usually 1 in, sandboxes 6–12 in.",
    faq: [["How many tons of sand in a yard?", "About 1.35 tons of dry sand, up to 1.7 tons when wet."], ["How many 50 lb bags of sand in a yard?", "About 54 bags of dry sand."]],
  }),
  mk({
    slug: "topsoil-calculator", title: "Topsoil & Dirt Calculator",
    desc: "Calculate topsoil, loam, fill dirt or compost in cubic yards, tons and 40 lb bags — with settling, and whether bulk delivery or bags is cheaper.",
    meta: "Topsoil Calculator — Yards of Dirt & Loam",
    inputs: [SHAPE, L(20), W(10), D(4), dropdown("material", "Material", opts(E.SOILS.map(([n]) => n)), 0), pct("settling", "Settling Allowance", 15, 50, 1), cur("pricePerYard", "Bulk Price per Cubic Yard", 40, 500, 0.5), cur("delivery", "Delivery Fee", 75, 2000), cur("bagPrice", "Price per 0.75 cu ft Bag", 3.5, 50, 0.1)],
    results: [["cubicYards", "Cubic Yards", "n"], ["tons", "Tons", "n"], ["cubicFeet", "Cubic Feet", "n"], ["bags40lb", "0.75 cu ft Bags", "n"], ["bulkCost", "Bulk Cost (delivered)", "c"], ["bagCost", "Bagged Cost", "c"], ["cheaperOption", "Cheaper Option (1 = bulk, 2 = bags)", "n"]],
    fn: E.topsoil, ex: { shape: 0, length: 20, width: 10, depth: 4, material: 0, settling: 15, pricePerYard: 40, delivery: 75, bagPrice: 3.5 },
    exText: (o) => `Example: a 20 × 10 ft bed 4 in deep with 15% for settling needs ${o.cubicYards} yd³ of topsoil — ${usd(o.bulkCost)} delivered in bulk versus ${usd(o.bagCost)} for ${o.bags40lb} bags.`,
    how: "Enter the area and depth (4–6 in for new lawns, 8–12 in for raised beds), choose the soil and compare bulk and bag prices.",
    assume: "Topsoil ≈ 1.1 t/yd³ (≈ 2,200 lb), loam 1.0, fill dirt 1.25, compost 0.6. Loose soil settles 10–20% after watering.",
    faq: [["How much topsoil do I need for a new lawn?", "4–6 in — about 1.2–1.9 yd³ per 100 sq ft."], ["What's the difference between topsoil and fill dirt?", "Topsoil is the organic, fertile top layer for planting; fill dirt is subsoil for raising grade."]],
  }),
  mk({
    slug: "mulch-calculator", title: "Mulch Calculator",
    desc: "Calculate mulch in cubic yards and 2 or 3 cu ft bags for any bed size and depth — with bulk vs bagged cost and how far a yard goes.",
    meta: "Mulch Calculator — Yards & Bags of Mulch",
    inputs: [SHAPE, L(20), W(5), D(3), cur("pricePerYard", "Bulk Price per Cubic Yard", 38, 500, 0.5), cur("delivery", "Delivery Fee", 60, 2000), cur("bagPrice", "Price per 2 cu ft Bag", 4, 50, 0.1)],
    results: [["cubicYards", "Cubic Yards", "n"], ["bags2CuFt", "2 cu ft Bags", "n"], ["bags3CuFt", "3 cu ft Bags", "n"], ["cubicFeet", "Cubic Feet", "n"], ["bulkCost", "Bulk Cost (delivered)", "c"], ["bagCost", "Bagged Cost (2 cu ft)", "c"], ["coveragePerYardSqFt", "Sq Ft per Yard at This Depth", "n"]],
    fn: E.mulch, ex: { shape: 0, length: 20, width: 5, depth: 3, pricePerYard: 38, delivery: 60, bagPrice: 4 },
    exText: (o) => `Example: a 20 × 5 ft bed at 3 in deep needs ${o.cubicYards} yd³ of mulch, or ${o.bags2CuFt} bags of 2 cu ft — a yard covers ${o.coveragePerYardSqFt} sq ft at that depth.`,
    how: "Enter the bed size and depth. 2–3 in is ideal for weed control; top up 1 in a year.",
    assume: "1 cubic yard = 27 cu ft = 13.5 bags of 2 cu ft. Coverage per yard = 324 ÷ depth (in) sq ft.",
    faq: [["How much does a yard of mulch cover?", "About 108 sq ft at 3 in, 162 sq ft at 2 in."], ["How many bags of mulch in a yard?", "13.5 bags of 2 cu ft or 9 bags of 3 cu ft."]],
  }),
  mk({
    slug: "pine-straw-calculator", title: "Pine Straw Calculator",
    desc: "Calculate how many bales of pine straw you need — longleaf, slash or short-needle — by bed area and depth, with material and installed cost.",
    inputs: [SHAPE, L(40), W(10), num("depth", "Depth (in)", 3, 6, 0.5, 1), dropdown("type", "Pine Straw Type", opts(E.PINE_STRAW.map(([n, c]) => `${n} (~${c} sq ft/bale at 3 in)`)), 0), cur("balePrice", "Price per Bale", 6.5, 50, 0.25), cur("laborPerBale", "Installation Labor per Bale", 3, 50, 0.25)],
    results: [["balesNeeded", "Bales Needed", "n"], ["coveragePerBale", "Coverage per Bale (sq ft)", "n"], ["areaSqFt", "Area (sq ft)", "n"], ["materialCost", "Material Cost", "c"], ["installedCost", "Installed Cost", "c"]],
    fn: E.pineStraw, ex: { shape: 0, length: 40, width: 10, depth: 3, type: 0, balePrice: 6.5, laborPerBale: 3 },
    exText: (o) => `Example: 400 sq ft of beds at 3 in takes ${o.balesNeeded} bales of longleaf straw (${o.coveragePerBale} sq ft each) — ${usd(o.materialCost)} in material or ${usd(o.installedCost)} installed.`,
    how: "Enter the bed area, the depth you want and the straw type. Longleaf needles are longer and cover more per bale.",
    assume: "Coverage at 3 in: longleaf ≈ 60 sq ft, slash ≈ 50, loblolly ≈ 40 per bale; coverage scales with depth.",
    faq: [["How much does a bale of pine straw cover?", "40–60 sq ft at 2–3 in deep depending on needle type and bale size."]],
  }),
  mk({
    slug: "excavation-cost-calculator", title: "Excavation Cost Calculator",
    desc: "Estimate excavation cost — bank cubic yards, swell to loose yards, truck loads and haul-off — for basements, pools, trenches and site work.",
    inputs: [num("length", "Length (ft)", 40, 5000, 0.5), num("width", "Width (ft)", 30, 5000, 0.5), num("depth", "Depth (ft)", 8, 100, 0.5), dropdown("soil", "Soil Type (swell)", opts(E.SWELL.map(([n, s]) => `${n} (+${s}%)`)), 2), cur("digPerYard", "Digging Cost per Bank Yard", 12, 500, 0.5), yn("haulOff", "Haul Spoils Away?", 1), cur("haulPerYard", "Haul-Off per Loose Yard", 15, 500, 0.5), num("truckYards", "Truck Capacity (loose yd³)", 12, 30, 1, 1), cur("mobilization", "Mobilization / Permits", 800, 50000)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["bankCubicYards", "Bank (In-Place) Cubic Yards", "n"], ["looseCubicYards", "Loose Cubic Yards", "n"], ["truckLoads", "Truck Loads", "n"], ["diggingCost", "Digging", "c"], ["haulingCost", "Hauling", "c"], ["costPerBankYard", "All-In per Bank Yard", "c"]],
    fn: E.excavationCost, ex: { length: 40, width: 30, depth: 8, soil: 2, digPerYard: 12, haulOff: 1, haulPerYard: 15, truckYards: 12, mobilization: 800 },
    exText: (o) => `Example: a 40 × 30 ft basement dug 8 ft deep is ${fmt(o.bankCubicYards, 0)} bank yd³, swelling to ${fmt(o.looseCubicYards, 0)} loose yd³ (${o.truckLoads} truck loads) — about ${usd(o.totalCost)} including haul-off.`,
    how: "Enter the excavation size and soil type, your contractor's digging rate per bank yard and the haul-off rate per loose yard.",
    assume: "Dirt expands once dug: loose yards = bank yards × (1 + swell). Typical 2026 rates: $8–20 per bank yd³ to dig and $10–25 per loose yd³ to haul, so $50–200 per yard all-in for small residential jobs with minimums.",
    faq: [["How much does it cost to excavate a basement?", "Often $10,000–25,000 for a typical home, depending on soil, depth and haul distance."], ["What is swell factor?", "The increase in volume when soil is dug up — about 25% for common earth."]],
  }),
  mk({
    slug: "stump-grinding-cost-calculator", title: "Stump Grinding Cost Calculator",
    desc: "Estimate stump grinding cost by number of stumps and diameter — price per inch, per-stump and job minimums, root grinding and cleanup.",
    inputs: [num("stumps", "Number of Stumps", 3, 500), num("averageDiameter", "Average Diameter (in)", 24, 120, 1), cur("ratePerInch", "Rate per Inch of Diameter", 3.5, 20, 0.25), cur("minimumPerStump", "Minimum per Stump", 75, 1000), cur("jobMinimum", "Job Minimum", 150, 2000), yn("roots", "Grind Surface Roots (+25%)?"), yn("cleanup", "Remove Grindings / Cleanup?"), cur("cleanupPerStump", "Cleanup per Stump", 30, 500)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerStump", "Average per Stump", "c"], ["grindingCost", "Grinding", "c"], ["rootGrinding", "Root Grinding", "c"], ["cleanupCost", "Cleanup", "c"], ["totalDiameterInches", "Total Diameter (in)", "n"]],
    fn: E.stumpGrinding, ex: { stumps: 3, averageDiameter: 24, ratePerInch: 3.5, minimumPerStump: 75, jobMinimum: 150, roots: 0, cleanup: 1, cleanupPerStump: 30 },
    exText: (o) => `Example: three 24 in stumps at $3.50 per inch cost ${usd(o.grindingCost)} to grind, ${usd(o.totalCost)} with cleanup — about ${usd(o.costPerStump)} each.`,
    how: "Count the stumps and measure the diameter at ground level. Enter local rates or use the national averages.",
    assume: "Typical 2026 pricing: $2–5 per inch of diameter, $75–150 per stump minimum, $100–200 job minimum. Grinding 6–12 in below grade is standard.",
    faq: [["How much does stump grinding cost per inch?", "About $2–5 per inch of diameter, so a 24 in stump costs $50–120 before minimums."]],
  }),
  mk({
    slug: "hydroseeding-calculator", title: "Hydroseeding Cost Calculator",
    desc: "Estimate professional hydroseeding cost per square foot and the DIY materials — seed, fiber mulch, fertilizer, tackifier and water — for any lawn area.",
    meta: "Hydroseeding Cost Calculator — Price & Materials",
    inputs: [num("area", "Area (sq ft)", 5000, 2000000, 100), cur("costPerSqFt", "Professional Price per Sq Ft", 0.12, 2, 0.01), cur("minimumJob", "Job Minimum", 600, 10000, 10), num("seedRate", "Seed Rate (lb per 1,000 sq ft)", 5, 20, 0.5), cur("seedPricePerLb", "Seed Price per lb", 4, 50, 0.25), cur("mulchBalePrice", "Fiber Mulch per 50 lb Bale", 22, 200, 0.5)],
    results: [["professionalCost", "Professional Hydroseeding Cost", "c"], ["seedLb", "Seed (lb)", "n"], ["mulchBales50lb", "Fiber Mulch (50 lb bales)", "n"], ["fertilizerLb", "Starter Fertilizer (lb)", "n"], ["tackifierLb", "Tackifier (lb)", "n"], ["waterGallons", "Water (gallons)", "n"], ["diyMaterialCost", "DIY Seed + Mulch Cost", "c"]],
    fn: E.hydroseeding, ex: { area: 5000, costPerSqFt: 0.12, minimumJob: 600, seedRate: 5, seedPricePerLb: 4, mulchBalePrice: 22 },
    exText: (o) => `Example: 5,000 sq ft costs about ${usd(o.professionalCost)} professionally; DIY you'd need ${o.seedLb} lb of seed, ${o.mulchBales50lb} bales of fiber mulch and about ${fmt(o.waterGallons, 0)} gallons of water.`,
    how: "Enter the lawn area and local price per square foot. Adjust the seed rate for your grass (tall fescue 6–8 lb, Bermuda 1–2 lb per 1,000 sq ft).",
    assume: "Typical 2026 professional price $0.08–0.20 per sq ft. Per 1,000 sq ft: ~45 lb fiber mulch, 4 lb starter fertilizer, 3 lb tackifier; slurry ≈ 0.3 gal water per sq ft.",
    faq: [["Is hydroseeding cheaper than sod?", "Yes — usually a quarter to a third of the price of sod, but it takes 4–8 weeks to establish."]],
  }),
  mk({
    slug: "asphalt-calculator", title: "Asphalt Calculator",
    desc: "Calculate asphalt tonnage for a driveway, lot or hot top overlay — tons, cubic yards, truck loads, material cost and installed price.",
    meta: "Asphalt Calculator — Tons of Hot Mix & Cost",
    inputs: [SHAPE, L(50), W(12), num("thickness", "Compacted Thickness (in)", 3, 12, 0.5), num("density", "Density (lb/ft³)", 145, 160, 1, 120), pct("waste", "Extra", 5, 30, 1), cur("pricePerTon", "Hot Mix Price per Ton", 110, 500, 1), cur("installedPerSqFt", "Installed Price per Sq Ft", 5, 30, 0.25), num("truckTons", "Truck Capacity (tons)", 20, 40, 1, 1)],
    results: [["tons", "Asphalt Needed (tons)", "n"], ["cubicYards", "Cubic Yards", "n"], ["truckLoads", "Truck Loads", "n"], ["areaSqFt", "Area (sq ft)", "n"], ["materialCost", "Material Cost", "c"], ["installedCost", "Installed Cost", "c"], ["tonsPerSqFt", "Tons per 100 Sq Ft", "n"]],
    fn: E.asphalt, ex: { shape: 0, length: 50, width: 12, thickness: 3, density: 145, waste: 5, pricePerTon: 110, installedPerSqFt: 5, truckTons: 20 },
    exText: (o) => `Example: a 50 × 12 ft driveway with 3 in of compacted asphalt needs ${o.tons} tons of hot mix (${o.truckLoads} truck) — ${usd(o.materialCost)} in material or about ${usd(o.installedCost)} installed.`,
    how: "Enter the area and compacted thickness (2–3 in for driveways and hot top overlays, 3–4 in for parking lots).",
    assume: "Tons = area × thickness × 145 lb/ft³ ÷ 2,000 — about 0.006 tons per sq ft per inch of thickness, so 1 ton covers roughly 80 sq ft at 2 in. Installed price typically $3–7 per sq ft in 2026.",
    faq: [["How many tons of asphalt do I need?", "About 0.006 tons per sq ft per inch of thickness — roughly 11 tons for a 600 sq ft driveway at 3 in."], ["What is hot top?", "A New England term for asphalt paving, usually a thin hot-mix overlay."]],
  }),
  mk({
    slug: "asphalt-millings-calculator", title: "Asphalt Millings Calculator",
    desc: "Calculate recycled asphalt millings for a driveway or lot — compacted and loose yards, tons, truck loads, cost and price per square foot.",
    inputs: [SHAPE, L(100), W(12), D(4, "Compacted Depth (in)"), pct("compaction", "Compaction Allowance", 25, 60, 1), num("tonsPerYard", "Loose Density (tons per yd³)", 1.3, 2, 0.05, 0.8), cur("pricePerTon", "Price per Ton", 20, 200, 0.5), cur("delivery", "Delivery Fee", 150, 5000), TRUCK],
    results: [["tons", "Millings Needed (tons)", "n"], ["looseCubicYards", "Loose Cubic Yards", "n"], ["compactedCubicYards", "Compacted Cubic Yards", "n"], ["truckLoads", "Truck Loads", "n"], ["totalCost", "Total Cost", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.millings, ex: { shape: 0, length: 100, width: 12, depth: 4, compaction: 25, tonsPerYard: 1.3, pricePerTon: 20, delivery: 150, truckTons: 15 },
    exText: (o) => `Example: a 100 × 12 ft driveway with 4 in of compacted millings needs ${o.tons} tons (${o.truckLoads} loads) — about ${usd(o.totalCost)}, or ${usd(o.costPerSqFt)} per sq ft.`,
    how: "Enter the area and finished depth. Millings compact well when rolled warm; allow 20–30%.",
    assume: "Loose millings ≈ 1.2–1.4 tons per yd³. Typical 2026 price $10–30 per ton plus delivery.",
    faq: [["Are asphalt millings good for a driveway?", "Yes — they're cheap, compact hard and shed water, though they're not as smooth as new asphalt."]],
  }),
  mk({
    slug: "cold-patch-asphalt-calculator", title: "Cold Patch Asphalt Calculator",
    desc: "Calculate bags of cold patch asphalt for potholes — by hole size, depth and count — with compaction, pounds needed and cost.",
    meta: "Cold Patch Calculator — Bags for Potholes",
    inputs: [num("length", "Pothole Length (ft)", 2, 50, 0.25), num("width", "Pothole Width (ft)", 2, 50, 0.25), num("depth", "Depth (in)", 2, 12, 0.25), num("holes", "Number of Holes", 1, 500, 1, 1), pct("compaction", "Compaction Allowance", 20, 50, 1), num("bagWeight", "Bag Weight (lb)", 50, 60, 1, 10), cur("bagPrice", "Price per Bag", 18, 100, 0.25)],
    results: [["bagsNeeded", "Bags Needed", "n"], ["poundsNeeded", "Pounds Needed", "n"], ["cubicFeet", "Volume incl. Compaction (cu ft)", "n"], ["sqFtPerBagAt2In", "Sq Ft per Bag at 2 in", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.coldPatch, ex: { length: 2, width: 2, depth: 2, holes: 1, compaction: 20, bagWeight: 50, bagPrice: 18 },
    exText: (o) => `Example: a 2 × 2 ft pothole 2 in deep needs about ${fmt(o.poundsNeeded, 0)} lb of cold patch including 20% for compaction — ${o.bagsNeeded} × 50 lb bags.`,
    how: "Measure each pothole (or the average) and how many there are. Fill in 2 in lifts and tamp each one.",
    assume: "Cold patch ≈ 150 lb/ft³ compacted, so a 50 lb bag fills about 1.7 sq ft at 2 in after compaction. Overfill by 1/2 in before tamping.",
    faq: [["How much does a 50 lb bag of cold patch cover?", "About 1.5–2 sq ft at 2 in deep."]],
  }),
  mk({
    slug: "sealcoat-calculator", title: "Sealcoat Calculator",
    desc: "Calculate driveway sealcoat — gallons per coat, 5-gallon pails, drums, sand additive and material cost — or compare with a professional price per square foot.",
    meta: "Sealcoat Calculator — Gallons of Driveway Sealer",
    inputs: [num("area", "Area (sq ft)", 1000, 1000000, 10), num("coats", "Number of Coats", 2, 3, 1, 1), num("coverage", "Coverage per Gallon per Coat (sq ft)", 80, 150, 1, 20), pct("dilution", "Water Dilution", 15, 30, 1), num("sandPerGallon", "Sand Additive (lb per gallon)", 3, 8, 0.5), cur("pailPrice", "Price per 5-Gal Pail", 35, 300, 0.5), cur("sandBagPrice", "Price per 50 lb Sand Bag", 8, 50, 0.25), cur("proPerSqFt", "Professional Price per Sq Ft", 0.25, 2, 0.01)],
    results: [["sealerGallons", "Sealer Needed (gal, undiluted)", "n"], ["pails5Gal", "5-Gallon Pails", "n"], ["drums55Gal", "55-Gallon Drums", "n"], ["mixedGallons", "Mixed Gallons (with water)", "n"], ["sandLb", "Sand Additive (lb)", "n"], ["materialCost", "DIY Material Cost", "c"], ["proCost", "Professional Price", "c"]],
    fn: E.sealcoat, ex: { area: 1000, coats: 2, coverage: 80, dilution: 15, sandPerGallon: 3, pailPrice: 35, sandBagPrice: 8, proPerSqFt: 0.25 },
    exText: (o) => `Example: two coats on a 1,000 sq ft driveway need ${o.sealerGallons} gal of sealer (${o.pails5Gal} pails) and ${o.sandLb} lb of sand — ${usd(o.materialCost)} DIY vs about ${usd(o.proCost)} for a pro.`,
    how: "Enter the area, number of coats and the coverage rate from the product label. Commercial coal-tar or asphalt emulsion is often diluted 10–20% with water.",
    assume: "Coverage ≈ 70–90 sq ft per gallon per coat for driveway emulsions; sand 2–5 lb per gallon for traction. Professional sealcoating ≈ $0.15–0.35 per sq ft in 2026.",
    faq: [["How much sealcoat do I need per square foot?", "About 1 gallon per 80 sq ft per coat — 25 gallons for two coats on 1,000 sq ft."]],
  }),
  mk({
    slug: "cubic-yard-calculator", title: "Cubic Yard Calculator",
    desc: "Convert length, width and depth in feet, inches, meters or yards into cubic yards, cubic feet, cubic meters and liters — for rectangles or circles — with cost.",
    meta: "Cubic Yard Calculator — CY from Feet, Inches & Meters",
    inputs: [dropdown("shape", "Shape", opts(["Rectangle", "Circle (length = diameter)"]), 0), dropdown("lengthUnit", "Length / Width Unit", opts(["Feet", "Meters", "Yards"]), 0), num("length", "Length or Diameter", 10, 100000, 0.1), num("width", "Width", 10, 100000, 0.1), dropdown("depthUnit", "Depth Unit", opts(["Inches", "Feet", "Centimeters", "Meters"]), 0), num("depth", "Depth", 6, 10000, 0.1), num("quantity", "Quantity", 1, 1000, 1, 1), cur("pricePerYard", "Price per Cubic Yard (optional)", 0, 10000, 0.5)],
    results: [["cubicYards", "Cubic Yards", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["liters", "Liters", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.cubicYard, ex: { shape: 0, lengthUnit: 0, length: 10, width: 10, depthUnit: 0, depth: 6, quantity: 1, pricePerYard: 0 },
    exText: (o) => `Example: 10 × 10 ft at 6 in deep is ${o.cubicFeet} cu ft = ${o.cubicYards} cubic yards (${o.cubicMeters} m³).`,
    how: "Choose the shape and units, then enter the dimensions. Works for any material — soil, gravel, mulch, concrete or water.",
    assume: "1 cubic yard = 27 cubic feet = 0.7646 m³ = 764.6 liters.",
    faq: [["How do I calculate cubic yards?", "Multiply length × width × depth in feet and divide by 27."], ["How many square feet does a cubic yard cover?", "324 sq ft at 1 in deep, 108 sq ft at 3 in."]],
  }),
  mk({
    slug: "bulk-material-calculator", title: "Bulk Material Calculator (Tonnage)",
    desc: "Convert cubic yards to tons for gravel, sand, soil, mulch, riprap, asphalt, concrete and more — with metric tonnes, truck loads and cost per ton.",
    meta: "Bulk Material & Tonnage Calculator — Yards to Tons",
    inputs: [dropdown("mode", "Enter", opts(["Dimensions", "Cubic yards"]), 1), num("length", "Length (ft)", 20, 100000, 0.5), num("width", "Width (ft)", 10, 100000, 0.5), num("depth", "Depth (in)", 4, 600, 0.5), num("cubicYards", "Cubic Yards", 10, 1000000, 0.5), dropdown("material", "Material", opts(E.BULK.map(([n, lb]) => `${n} (${lb.toLocaleString("en-US")} lb/yd³)`)), 0), num("truckTons", "Truck Capacity (tons)", 15, 40, 1, 1), cur("pricePerTon", "Price per Ton", 0, 10000, 0.5)],
    results: [["tons", "Weight (US tons)", "n"], ["pounds", "Pounds", "n"], ["metricTonnes", "Metric Tonnes", "n"], ["cubicYards", "Cubic Yards", "n"], ["truckLoads", "Truck Loads", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.bulkMaterial, ex: { mode: 1, length: 20, width: 10, depth: 4, cubicYards: 10, material: 0, truckTons: 15, pricePerTon: 0 },
    exText: (o) => `Example: 10 cubic yards of gravel weigh about ${o.tons} tons (${fmt(o.pounds, 0)} lb) — ${o.truckLoads} loads in a 15-ton truck.`,
    how: "Enter a volume or dimensions, choose the material and your truck's legal payload.",
    assume: "Loose densities per cubic yard are typical supplier figures; moisture can change weight by 10–20%.",
    faq: [["How do I convert cubic yards to tons?", "Multiply cubic yards by the material's density in tons per yard — about 1.4 for gravel and 1.1 for topsoil."]],
  }),
  mk({
    slug: "rip-rap-calculator", title: "Rip Rap Calculator",
    desc: "Calculate riprap tons for shorelines, channels and outlets — by riprap class (D50), layer thickness (2 × D50), area — with filter fabric and cost.",
    meta: "Rip Rap Calculator — Tons of Riprap by Class",
    inputs: [num("length", "Length (ft)", 50, 10000, 0.5), num("width", "Width / Slope Length (ft)", 10, 1000, 0.5), dropdown("riprapClass", "Riprap Class", opts(E.RIPRAP.map(([n]) => n)), 1), num("thickness", "Layer Thickness (in) — 0 = 2 × D50", 0, 120, 1), num("tonsPerYard", "Placed Density (tons per yd³)", 1.5, 2, 0.05, 1), pct("waste", "Extra", 10, 50, 1), num("truckTons", "Truck Capacity (tons)", 20, 40, 1, 1), cur("pricePerTon", "Price per Ton", 45, 500, 0.5)],
    results: [["tons", "Riprap Needed (tons)", "n"], ["cubicYards", "Cubic Yards", "n"], ["layerThicknessIn", "Layer Thickness (in)", "n"], ["filterFabricSqYd", "Filter Fabric (sq yd, +15% overlap)", "n"], ["truckLoads", "Truck Loads", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.ripRap, ex: { length: 50, width: 10, riprapClass: 1, thickness: 0, tonsPerYard: 1.5, waste: 10, truckTons: 20, pricePerTon: 45 },
    exText: (o) => `Example: 50 × 10 ft of Class II riprap (D50 ≈ 9 in) at ${o.layerThicknessIn} in thick needs ${o.tons} tons — ${o.truckLoads} loads, about ${usd(o.totalCost)}, plus ${o.filterFabricSqYd} sq yd of filter fabric.`,
    how: "Measure the area along the slope, pick the riprap class your design calls for, and leave thickness at 0 to use the standard 2 × D50.",
    assume: "Layer thickness 2 × D50 (FHWA HEC-23); placed riprap ≈ 1.4–1.6 tons per yd³. Class names and sizes vary by state DOT — check your spec.",
    faq: [["How many tons of rip rap per square foot?", "For 18 in thick Class II, about 0.08 tons per sq ft."]],
  }),
  mk({
    slug: "brush-removal-cost-calculator", title: "Brush Removal Cost Calculator",
    desc: "Estimate brush and land clearing cost per acre by vegetation density and method — forestry mulching, cut and haul or brush hogging — with slope and haul-away.",
    inputs: [dropdown("unit", "Size Unit", opts(["Acres", "Square feet"]), 0), num("size", "Area", 1, 10000000, 0.1), dropdown("density", "Vegetation Density", opts(E.BRUSH.map(([n, c]) => `${n} (~$${c.toLocaleString("en-US")}/acre)`)), 1), dropdown("method", "Method", opts(["Forestry mulching", "Cut, pile & haul", "Brush hogging / mowing"]), 0), yn("slope", "Steep or Wet Ground (+20%)?"), yn("haulAway", "Haul Debris Away?"), cur("haulPerAcre", "Haul-Away per Acre", 800, 10000, 10), cur("minimum", "Job Minimum", 500, 10000, 10)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerAcre", "Cost per Acre", "c"], ["acres", "Acres", "n"], ["clearingCost", "Clearing", "c"], ["haulAwayCost", "Haul-Away", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.brushRemoval, ex: { unit: 0, size: 1, density: 1, method: 0, slope: 0, haulAway: 0, haulPerAcre: 800, minimum: 500 },
    exText: (o) => `Example: forestry mulching 1 acre of medium brush costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Enter the area, how thick the growth is and how it will be cleared.",
    assume: "Typical 2026 US ranges per acre: light $500–1,200, medium $1,200–2,500, heavy $2,500–5,000, wooded $4,000–7,000+. Cut-and-haul costs more than mulching in place.",
    faq: [["How much does it cost to clear an acre of brush?", "Roughly $1,000–3,000 for moderate brush; heavily wooded acres can exceed $5,000."]],
  }),
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-business-industrial-category.ts --apply" first.`);

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
