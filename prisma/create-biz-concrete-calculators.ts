// One-time (but safe to re-run) batch setup script: creates 26 concrete & masonry calculators
// (Business & Industrial Calculators > Concrete & Masonry Calculators). Formulas and material
// tables live in src/lib/calc-engine-biz-concrete.ts; examples are computed from the engine.
// Merged keywords (no separate page): Concrete Slab → concrete-calculator; Sonotube → concrete-column;
// Sakrete → quikrete-calculator; Concrete Mix Ratio → cement-calculator; Superior Walls Cost →
// foundation-cost; Dipra → thrust-block. Paver Calculator → existing paver-cost-calculator.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-concrete-calculators.ts
// or
//   npm run db:create-biz-concrete-calculators

import * as E from "../src/lib/calc-engine-biz-concrete";

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

const CAT = "concrete-masonry-calculators";
const NOTE = "Quantities are estimates — order a little extra and confirm mix, reinforcement and sizing with your supplier or engineer where codes apply.";

const BAGS = opts(E.BAG_SIZES.map(([lb, y]) => `${lb} lb bag (${y} cu ft)`));
const BARS = opts(E.REBAR.map(([n, d, w]) => `#${n} (${d}" dia, ${w} lb/ft)`));
const VOL: Line[] = [["cubicYards", "Concrete Needed (cubic yards)", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["bags80", "80 lb Bags", "n"], ["bags60", "60 lb Bags", "n"], ["concreteCost", "Ready-Mix Cost", "c"]];
const ydPrice = cur("pricePerYard", "Ready-Mix Price per Cubic Yard", 165, 1000);
const waste = pct("waste", "Extra for Waste / Spillage", 10, 50, 1);

const TOOLS: ToolDef[] = [
  mk({
    slug: "concrete-calculator", title: "Concrete Calculator",
    desc: "Work out how much concrete you need in cubic yards, cubic feet, cubic meters and 60 or 80 lb bags for slabs, round columns or round pads, plus the ready-mix cost.",
    meta: "Concrete Calculator — Cubic Yards, Bags & Cost",
    inputs: [dropdown("shape", "Shape", opts(["Slab / rectangle", "Round column / tube", "Round slab / pad"]), 0), num("length", "Length (ft) — or height for a column", 10, 1000, 0.5), num("width", "Width (ft)", 10, 1000, 0.5), num("thickness", "Thickness (in)", 4, 120, 0.5), num("diameter", "Diameter (in) — round shapes", 12, 240, 1), num("quantity", "Quantity", 1, 1000, 1, 1), waste, ydPrice],
    results: VOL,
    fn: E.concrete, ex: { shape: 0, length: 10, width: 10, thickness: 4, diameter: 12, quantity: 1, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: a 10 × 10 ft slab 4 in thick with 10% extra needs ${o.cubicYards} cubic yards (${o.cubicFeet} cu ft) — about ${o.bags80} bags of 80 lb premix, or ${usd(o.concreteCost)} of ready-mix at $165 a yard.`,
    how: "Pick the shape, enter the dimensions and how many you're pouring, then add a waste allowance (5–10% is normal). The slab option also covers footings, patios and driveways; use the round option for columns and Sonotubes.",
    assume: "Volume = length × width × thickness (or π r² × height). 27 cu ft = 1 cubic yard. Bag yields: 80 lb = 0.60 cu ft, 60 lb = 0.45 cu ft. Ready-mix price is a typical 2026 US delivered price; short loads under 4–5 yards often add a fee.",
    faq: [["How many bags of concrete make a yard?", "About 45 bags of 80 lb premix or 60 bags of 60 lb premix make one cubic yard."], ["When should I order ready-mix instead of bags?", "Past about 1 cubic yard, ready-mix is usually cheaper and much faster than mixing bags by hand."], ["How thick should a concrete slab be?", "4 in for patios and walkways, 5–6 in for driveways and garage floors, thicker for heavy trucks."]],
  }),
  mk({
    slug: "concrete-column-calculator", title: "Concrete Column Calculator (Sonotube)",
    desc: "Calculate concrete for round Sonotube columns or square columns — cubic yards, bags and how many form tubes to buy — from diameter, height and count.",
    meta: "Concrete Column & Sonotube Calculator — Yards & Bags",
    inputs: [dropdown("shape", "Column Shape", opts(["Round (Sonotube)", "Square"]), 0), num("diameter", "Diameter or Side (in)", 12, 120, 1), num("height", "Height (ft)", 4, 100, 0.5), num("count", "Number of Columns", 4, 500, 1, 1), num("tubeLength", "Form Tube Length (ft)", 12, 20, 1, 1), waste, ydPrice],
    results: [...VOL.slice(0, 5), ["perColumnCuFt", "Per Column (cu ft)", "n"], ["tubesNeeded", "Form Tubes Needed", "n"], ["concreteCost", "Ready-Mix Cost", "c"]],
    fn: E.concreteColumn, ex: { shape: 0, diameter: 12, height: 4, count: 4, tubeLength: 12, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: four 12 in Sonotubes 4 ft tall hold ${o.perColumnCuFt} cu ft each — ${o.cubicFeet} cu ft with 10% extra, or ${o.bags80} bags of 80 lb concrete.`,
    how: "Choose round or square, enter the diameter (or side), the column height and how many columns you're pouring.",
    assume: "Round volume = π × (d/2)² × height; square = side² × height. A 12 ft tube is assumed to cut into column lengths with no reuse of offcuts across columns.",
    faq: [["How much concrete fills a 12 inch Sonotube?", "About 0.785 cu ft per foot of height — roughly 1.3 bags of 80 lb premix per foot."], ["What size Sonotube for deck footings?", "8–12 in is common for decks; check the post load and frost depth in your local code."]],
  }),
  mk({
    slug: "concrete-footing-calculator", title: "Concrete Footing Calculator",
    desc: "Estimate concrete for continuous strip footings and square pad footings together — cubic yards for each, total with waste, bags and ready-mix cost.",
    meta: "Footing Calculator — Strip & Pad Footing Concrete",
    inputs: [num("stripLength", "Strip Footing Total Length (ft)", 120, 5000, 1), num("stripWidth", "Strip Footing Width (in)", 20, 120, 1), num("stripDepth", "Strip Footing Depth (in)", 10, 60, 1), num("padCount", "Number of Pad Footings", 6, 500), num("padLength", "Pad Length (ft)", 2, 20, 0.5), num("padWidth", "Pad Width (ft)", 2, 20, 0.5), num("padDepth", "Pad Depth (in)", 12, 60, 1), waste, ydPrice],
    results: [VOL[0], ["stripCubicYards", "Strip Footings (yd³)", "n"], ["padCubicYards", "Pad Footings (yd³)", "n"], VOL[1], VOL[3], VOL[5]],
    fn: E.concreteFooting, ex: { stripLength: 120, stripWidth: 20, stripDepth: 10, padCount: 6, padLength: 2, padWidth: 2, padDepth: 12, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: 120 ft of 20 × 10 in strip footing plus six 2 × 2 × 1 ft pads needs ${o.stripCubicYards} + ${o.padCubicYards} yd³ — ${o.cubicYards} yd³ with 10% extra (${usd(o.concreteCost)} of ready-mix).`,
    how: "Enter the total run of continuous (strip) footing and its cross-section, then the number and size of isolated pad footings. Set either part to zero if you don't have it.",
    assume: "Strip volume = length × width × depth; pads = count × length × width × depth. Typical residential strip footings are 16–24 in wide and 8–12 in deep, but sizing depends on soil bearing and frost depth.",
    faq: [["How deep should a footing be?", "Below the local frost line and at least 12 in into undisturbed soil — 36–48 in is common in cold US states."], ["How wide should a footing be?", "Usually twice the wall thickness — about 16 in for an 8 in wall."]],
  }),
  mk({
    slug: "post-hole-concrete-calculator", title: "Post Hole Concrete Calculator",
    desc: "Find how many bags of concrete you need to set fence or deck posts — by hole size, depth, post size and gravel base, with cost per post and in total.",
    meta: "Post Hole Concrete Calculator — Bags per Post",
    inputs: [num("holeDiameter", "Hole Diameter (in)", 10, 48, 1), num("holeDepth", "Hole Depth (in)", 30, 120, 1), num("gravelBase", "Gravel Base Depth (in)", 4, 24, 1), dropdown("postShape", "Post Shape", opts(["Square", "Round"]), 0), num("postSize", "Post Size (in) — 4×4 is 3.5", 3.5, 12, 0.25), num("posts", "Number of Posts", 10, 1000, 1, 1), dropdown("bagSize", "Bag Size", BAGS, 2), cur("bagPrice", "Price per Bag", 6.5, 50, 0.1), pct("waste", "Extra", 5, 50, 1)],
    results: [["bagsNeeded", "Bags Needed", "n"], ["bagsPerPost", "Bags per Post", "n"], ["cubicFeet", "Concrete (cu ft)", "n"], ["totalWeightLb", "Total Weight (lb)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.postHole, ex: { holeDiameter: 10, holeDepth: 30, gravelBase: 4, postShape: 0, postSize: 3.5, posts: 10, bagSize: 2, bagPrice: 6.5, waste: 5 },
    exText: (o) => `Example: ten 4×4 posts in 10 in holes 30 in deep (4 in gravel) take ${o.bagsPerPost} bags of 60 lb concrete each — ${o.bagsNeeded} bags in total, about ${usd(o.totalCost)}.`,
    how: "Enter the hole diameter and depth, the gravel layer at the bottom, and the post size. A 4×4 is actually 3.5 in square and a 6×6 is 5.5 in.",
    assume: "Concrete volume = hole cylinder above the gravel minus the post. Rule of thumb: hole diameter 3× the post width and depth one-third to one-half of the post height above ground.",
    faq: [["How many bags of concrete per fence post?", "Usually 1.5–2 bags of 50–60 lb premix for a 4×4 post in a 10 in hole 2–3 ft deep."], ["Should I add gravel under fence posts?", "Yes — 4–6 in of gravel helps drainage and keeps the post end out of standing water."]],
  }),
  mk({
    slug: "quikrete-calculator", title: "Quikrete Calculator (Concrete Bag Calculator)",
    desc: "Calculate how many bags of Quikrete or Sakrete premixed concrete you need — 40, 50, 60 or 80 lb bags — with total weight, pallets and cost.",
    meta: "Quikrete & Sakrete Bag Calculator — How Many Bags?",
    inputs: [num("length", "Length (ft)", 8, 1000, 0.5), num("width", "Width (ft)", 4, 1000, 0.5), num("depth", "Depth / Thickness (in)", 4, 60, 0.5), num("quantity", "Quantity", 1, 500, 1, 1), dropdown("bagSize", "Bag Size", BAGS, 3), cur("bagPrice", "Price per Bag", 6.98, 50, 0.01), pct("waste", "Extra", 5, 50, 1)],
    results: [["bagsNeeded", "Bags Needed", "n"], ["cubicFeet", "Volume (cu ft)", "n"], ["cubicYards", "Volume (cu yd)", "n"], ["bagsPerCubicYard", "Bags per Cubic Yard", "n"], ["totalWeightLb", "Total Weight (lb)", "n"], ["pallets", "Pallets", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.premixBags, ex: { length: 8, width: 4, depth: 4, quantity: 1, bagSize: 3, bagPrice: 6.98, waste: 5 },
    exText: (o) => `Example: an 8 × 4 ft pad 4 in thick is ${o.cubicFeet} cu ft with 5% extra — ${o.bagsNeeded} bags of 80 lb Quikrete (${fmt(o.totalWeightLb, 0)} lb), about ${usd(o.totalCost)}.`,
    how: "Enter the area and thickness, choose the bag size you're buying, and the shelf price. Sakrete, Quikrete and store brands use the same yields per bag size.",
    assume: "Published yields: 80 lb = 0.60 cu ft, 60 lb = 0.45 cu ft, 50 lb = 0.375 cu ft (fast-setting), 40 lb = 0.30 cu ft. Pallets: 42 × 80 lb, 56 × 60 lb, 70 × 40–50 lb.",
    faq: [["How much does an 80 lb bag of Quikrete cover?", "0.6 cu ft — about 1.8 sq ft at 4 in thick, or 2.4 sq ft at 3 in."], ["Is Sakrete the same as Quikrete?", "For bag-count purposes yes: both 80 lb bags yield about 0.6 cu ft."]],
  }),
  mk({
    slug: "self-leveling-concrete-calculator", title: "Self-Leveling Concrete Calculator",
    desc: "Estimate bags of self-leveling underlayment for a floor by area and average depth — with coverage per bag, mixing water, primer and total cost.",
    inputs: [num("area", "Floor Area (sq ft)", 200, 100000, 1), num("thickness", "Average Thickness (in)", 0.25, 2, 0.0625), num("bagYield", "Yield per Bag (cu ft) — 50 lb ≈ 0.5", 0.5, 1, 0.01), num("waterPerBag", "Water per Bag (quarts)", 5, 10, 0.25), cur("bagPrice", "Price per Bag", 42, 200, 0.5), cur("primerPrice", "Primer per Gallon", 35, 200, 1), pct("waste", "Extra", 10, 50, 1)],
    results: [["bagsNeeded", "Bags Needed", "n"], ["coveragePerBag", "Coverage per Bag (sq ft)", "n"], ["cubicFeet", "Volume (cu ft)", "n"], ["waterQuarts", "Mixing Water (quarts)", "n"], ["primerGallons", "Primer (gallons)", "n"], ["totalCost", "Total Material Cost", "c"]],
    fn: E.selfLeveling, ex: { area: 200, thickness: 0.25, bagYield: 0.5, waterPerBag: 5, bagPrice: 42, primerPrice: 35, waste: 10 },
    exText: (o) => `Example: 200 sq ft at 1/4 in needs ${o.bagsNeeded} bags (each covers ${o.coveragePerBag} sq ft at that depth) plus ${o.primerGallons} gal of primer — about ${usd(o.totalCost)}.`,
    how: "Measure the floor area and estimate the average depth you need to fill (check low spots with a straightedge). Use your product's yield per bag from the bag label.",
    assume: "A 50 lb bag of cement-based self-leveler yields about 0.5 cu ft (≈ 50 sq ft at 1/8 in). Primer at about 300 sq ft per gallon. Deep fills over 1 in often need an extended (aggregate) mix.",
    faq: [["How far does a bag of self-leveler go?", "About 50 sq ft at 1/8 in, 25 sq ft at 1/4 in and 12 sq ft at 1/2 in."], ["Do I need primer under self-leveling concrete?", "Yes — primer stops the subfloor pulling water out of the mix and improves the bond."]],
  }),
  mk({
    slug: "monolithic-slab-calculator", title: "Monolithic Slab Calculator",
    desc: "Calculate concrete for a monolithic (turned-down edge) slab — slab, thickened perimeter beam and interior beams in cubic yards, with trucks and cost.",
    inputs: [num("length", "Slab Length (ft)", 40, 500, 0.5), num("width", "Slab Width (ft)", 30, 500, 0.5), num("thickness", "Slab Thickness (in)", 4, 12, 0.5), num("beamWidth", "Edge Beam Width (in)", 12, 48, 1), num("beamDepth", "Edge Beam Total Depth (in)", 18, 60, 1), num("interiorBeamLength", "Interior Beam Length (ft)", 0, 2000), waste, ydPrice],
    results: [VOL[0], ["slabCubicYards", "Slab (yd³)", "n"], ["beamCubicYards", "Beams (yd³)", "n"], ["trucks", "10-Yard Trucks", "n"], VOL[2], VOL[5]],
    fn: E.monolithicSlab, ex: { length: 40, width: 30, thickness: 4, beamWidth: 12, beamDepth: 18, interiorBeamLength: 0, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: a 40 × 30 ft slab 4 in thick with a 12 × 18 in turned-down edge needs ${o.slabCubicYards} yd³ for the slab and ${o.beamCubicYards} yd³ for the beam — ${o.cubicYards} yd³ with 10% extra, ${o.trucks} trucks.`,
    how: "Enter the slab size and thickness, the width of the thickened edge and its total depth measured from the top of the slab. Add the length of any interior grade beams.",
    assume: "Beam volume counts only the depth below the slab (total depth − slab thickness), measured along the perimeter centerline (2 × (L + W) − 4 × beam width) so corners aren't double-counted.",
    faq: [["What is a monolithic slab?", "A slab and its footing poured in one go — the edges are thickened into a beam instead of a separate footing."], ["How thick is a monolithic slab edge?", "Commonly 12 in wide and 12–24 in deep, deeper in frost areas."]],
  }),
  mk({
    slug: "concrete-curb-calculator", title: "Concrete Curb Calculator",
    desc: "Calculate concrete for curb and gutter or a plain curb — by curb height and width, gutter width and thickness, and length — with yards per 100 ft and cost.",
    inputs: [num("length", "Curb Length (ft)", 100, 50000, 1), num("curbHeight", "Curb Height incl. below grade (in)", 18, 48, 0.5), num("curbWidth", "Curb Width (in)", 6, 24, 0.5), num("gutterWidth", "Gutter Width (in) — 0 for none", 24, 48, 1), num("gutterThickness", "Gutter Thickness (in)", 6, 12, 0.5), waste, ydPrice],
    results: [VOL[0], ["yardsPer100Ft", "Yards per 100 ft", "n"], ["crossSectionSqFt", "Cross Section (sq ft)", "n"], VOL[1], VOL[5]],
    fn: E.concreteCurb, ex: { length: 100, curbHeight: 18, curbWidth: 6, gutterWidth: 24, gutterThickness: 6, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: 100 ft of 6 × 18 in curb with a 24 × 6 in gutter is ${o.crossSectionSqFt} sq ft in section — ${o.yardsPer100Ft} yd³ per 100 ft, ${o.cubicYards} yd³ with 10% extra.`,
    how: "Enter the curb's full height (including the part below the gutter) and width, then the gutter pan. Use 0 for the gutter width if it's a curb only.",
    assume: "Cross section = curb height × width + gutter width × thickness (rectangles; batter and rounding are ignored, which adds a small safety margin).",
    faq: [["How much concrete per foot of curb and gutter?", "A standard 6 in curb with a 24 in gutter uses roughly 0.05–0.06 yd³ per foot."]],
  }),
  mk({
    slug: "concrete-steps-calculator", title: "Concrete Steps Calculator",
    desc: "Calculate concrete for solid poured steps — number of steps, rise, run, width and top landing — with total rise, total run, yards and bags.",
    meta: "Concrete Step Calculator — Yards & Bags for Steps",
    inputs: [num("steps", "Number of Steps", 3, 30, 1, 1), num("rise", "Rise per Step (in)", 7, 12, 0.25), num("run", "Run / Tread Depth (in)", 11, 24, 0.5), num("width", "Step Width (ft)", 4, 50, 0.5), num("platformDepth", "Top Landing Depth (in)", 36, 120, 1), waste, ydPrice],
    results: [VOL[0], VOL[1], VOL[3], ["totalRiseIn", "Total Rise (in)", "n"], ["totalRunIn", "Total Run (in)", "n"], VOL[5]],
    fn: E.concreteSteps, ex: { steps: 3, rise: 7, run: 11, width: 4, platformDepth: 36, waste: 10, pricePerYard: 165 },
    exText: (o) => `Example: 3 steps 4 ft wide with a 7 in rise, 11 in tread and a 36 in landing need ${o.cubicFeet} cu ft — ${o.bags80} bags of 80 lb concrete (total rise ${o.totalRiseIn} in).`,
    how: "Enter how many steps, the rise and tread depth, the width, and the depth of the top landing (the top step).",
    assume: "Solid steps sitting on grade: each step is a block from the ground up, and the top step uses the landing depth. Most codes allow a maximum 7¾ in rise and minimum 10 in tread.",
    faq: [["What is a comfortable step rise and run?", "About 7 in rise and 11 in run; 2 × rise + run ≈ 25 in is a common rule."]],
  }),
  mk({
    slug: "concrete-sidewalk-calculator", title: "Concrete Sidewalk Cost Calculator",
    desc: "Estimate the cost of a new concrete sidewalk or walkway — installed price per square foot, old concrete removal and permit — with concrete volume and a low–high range.",
    meta: "Concrete Sidewalk Cost Calculator — Price per Sq Ft",
    inputs: [num("length", "Length (ft)", 50, 5000, 1), num("width", "Width (ft)", 4, 20, 0.5), num("thickness", "Thickness (in)", 4, 8, 0.5), cur("costPerSqFt", "Installed Cost per Sq Ft", 9, 50, 0.25), yn("removeOld", "Remove Old Sidewalk?"), cur("removalPerSqFt", "Removal Cost per Sq Ft", 2.5, 20, 0.25), cur("permit", "Permit / Inspection", 150, 5000)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["installCost", "Installation", "c"], ["removalCost", "Removal", "c"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"], ["squareFeet", "Area (sq ft)", "n"], ["cubicYards", "Concrete (yd³)", "n"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.sidewalkCost, ex: { length: 50, width: 4, thickness: 4, costPerSqFt: 9, removeOld: 1, removalPerSqFt: 2.5, permit: 150 },
    exText: (o) => `Example: replacing 50 ft of 4 ft sidewalk (200 sq ft) at $9/sq ft plus $2.50/sq ft removal and a $150 permit costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Enter the sidewalk size, the installed price you've been quoted (or the default national average), and whether old concrete must be broken out.",
    assume: "2026 typical installed price for 4 in broom-finished sidewalk is about $6–12 per sq ft; removal $2–4 per sq ft. Range shown is −20% / +25%.",
    faq: [["How much does a concrete sidewalk cost per square foot?", "About $6–12 installed for a standard 4 in broom finish, more for decorative finishes."], ["Who pays for sidewalk repair?", "In many US cities the adjacent property owner does — check your city's sidewalk program."]],
  }),
  mk({
    slug: "concrete-wall-calculator", title: "Poured Concrete Wall Calculator",
    desc: "Estimate a poured concrete wall — concrete yards, forming, labor and pumping — for a total cost and cost per square foot of wall.",
    meta: "Poured Concrete Wall Cost Calculator",
    inputs: [num("length", "Wall Length (ft)", 100, 5000, 1), num("height", "Wall Height (ft)", 8, 30, 0.5), num("thickness", "Wall Thickness (in)", 8, 24, 1), num("openings", "Openings (sq ft)", 0, 5000), pct("waste", "Extra", 5, 50, 1), ydPrice, cur("formCostPerSqFt", "Forming per Sq Ft of Form Face", 4, 50, 0.25), cur("laborPerSqFt", "Placing & Finishing Labor per Sq Ft of Wall", 4, 50, 0.25), yn("pump", "Pump Truck Needed?", 1), cur("pumpCost", "Pump Truck Cost", 1200, 10000, 50)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerSqFtOfWall", "Cost per Sq Ft of Wall", "c"], ["cubicYards", "Concrete (yd³)", "n"], ["concreteCost", "Concrete", "c"], ["formingCost", "Forming (both faces)", "c"], ["laborCost", "Labor", "c"], ["wallAreaSqFt", "Wall Area (sq ft)", "n"]],
    fn: E.concreteWall, ex: { length: 100, height: 8, thickness: 8, openings: 0, waste: 5, pricePerYard: 165, formCostPerSqFt: 4, laborPerSqFt: 4, pump: 1, pumpCost: 1200 },
    exText: (o) => `Example: 100 ft of 8 ft wall, 8 in thick, needs ${o.cubicYards} yd³ of concrete; with forming, labor and a pump the total is about ${usd(o.totalCost)} — ${usd(o.costPerSqFtOfWall)} per sq ft of wall.`,
    how: "Enter the wall size and thickness, subtract window and door openings, and adjust the concrete, forming and labor prices to your local quotes.",
    assume: "Forming is priced on both faces of the wall. Typical 2026 poured foundation walls run about $15–30 per sq ft of wall all-in; reinforcement, waterproofing and excavation are extra.",
    faq: [["How much does a poured concrete wall cost?", "Roughly $15–30 per sq ft of wall face for an 8 in residential foundation wall."]],
  }),
  mk({
    slug: "concrete-driveway-calculator", title: "Concrete Driveway Calculator",
    desc: "Calculate a concrete driveway — cubic yards, gravel base tons, ready-mix trucks, finish upgrade and labor — for a total cost and price per square foot.",
    meta: "Driveway Concrete Calculator — Yards & Cost",
    inputs: [num("length", "Length (ft)", 40, 2000, 1), num("width", "Width (ft)", 12, 100, 0.5), num("thickness", "Thickness (in)", 5, 10, 0.5), num("baseDepth", "Gravel Base Depth (in)", 4, 12, 1), dropdown("finish", "Finish", opts(["Broom (standard)", "Colored", "Exposed aggregate", "Stamped", "Stamped + colored"]), 0), waste, ydPrice, cur("gravelPerTon", "Gravel Base per Ton", 35, 200, 1), cur("laborPerSqFt", "Labor per Sq Ft", 4, 30, 0.25)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["cubicYards", "Concrete (yd³)", "n"], ["trucks", "10-Yard Trucks", "n"], ["baseGravelTons", "Gravel Base (tons)", "n"], ["concreteCost", "Concrete", "c"], ["finishCost", "Finish Upgrade", "c"], ["laborCost", "Labor", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.driveway, ex: { length: 40, width: 12, thickness: 5, baseDepth: 4, finish: 0, waste: 10, pricePerYard: 165, gravelPerTon: 35, laborPerSqFt: 4 },
    exText: (o) => `Example: a 40 × 12 ft driveway 5 in thick needs ${o.cubicYards} yd³ (${o.trucks} truck) and ${o.baseGravelTons} tons of base gravel — about ${usd(o.totalCost)}, or ${usd(o.costPerSqFt)} per sq ft.`,
    how: "Enter the driveway size and thickness, the gravel base depth and the finish you want. Adjust prices to your local quotes.",
    assume: "Gravel base: 1.4 tons per compacted cubic yard plus 15% for compaction. Finish upgrades per sq ft: colored $2, exposed aggregate $3.50, stamped $6, stamped + colored $9.",
    faq: [["How thick should a concrete driveway be?", "5 in for cars, 6 in or more where trucks or RVs park."], ["How much is a concrete driveway in 2026?", "About $8–15 per sq ft for a standard broom finish, $15–25 for stamped."]],
  }),
  mk({
    slug: "foundation-cost-calculator", title: "Foundation Cost Calculator",
    desc: "Estimate the cost of a new house foundation — slab, monolithic slab, crawl space, pier & beam, basement or precast walls like Superior Walls — with a low–high range.",
    meta: "Concrete Foundation Cost Calculator — Slab, Crawl, Basement",
    inputs: [dropdown("type", "Foundation Type", opts(E.FOUNDATION_TYPES.map(([n, lo, hi]) => `${n} ($${lo}–$${hi}/sq ft)`)), 0), num("length", "Footprint Length (ft)", 50, 1000, 1), num("width", "Footprint Width (ft)", 30, 1000, 1), pct("regionAdjust", "Local Cost Adjustment (+/− %)", 0, 100, 1), cur("excavation", "Excavation / Site Prep", 3000, 200000, 100), cur("permits", "Permits & Engineering", 1500, 50000, 50), yn("waterproofing", "Add Waterproofing (~$3/sq ft)?")],
    results: [["estimatedCost", "Estimated Cost", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["footprintSqFt", "Footprint (sq ft)", "n"]],
    fn: E.foundationCost, ex: { type: 0, length: 50, width: 30, regionAdjust: 0, excavation: 3000, permits: 1500, waterproofing: 0 },
    exText: (o) => `Example: a 50 × 30 ft (1,500 sq ft) slab foundation costs about ${usd(o.estimatedCost)}, in a range of ${usd(o.lowEstimate)}–${usd(o.highEstimate)} including site prep and permits.`,
    how: "Pick the foundation type, enter the building footprint, and adjust for your area (for example +20% for high-cost metros).",
    assume: "Per-sq-ft ranges are 2025–2026 US installed averages; the estimate uses the midpoint. Precast basement walls such as Superior Walls are priced per sq ft of footprint for comparison. Poor soil, slopes and engineered piers can cost much more.",
    faq: [["What is the cheapest foundation?", "A slab-on-grade is usually cheapest, followed by crawl spaces; full basements cost the most."], ["How much does a Superior Walls foundation cost?", "Precast insulated basement walls typically land around $28–45 per sq ft of footprint installed, depending on height and region."]],
  }),
  mk({
    slug: "concrete-weight-calculator", title: "Concrete Weight Calculator",
    desc: "Find the weight of concrete in pounds, tons and kilograms — by slab size or cubic yards — for normal, reinforced, lightweight or heavyweight concrete.",
    inputs: [dropdown("mode", "Enter", opts(["Dimensions", "Cubic yards"]), 0), num("length", "Length (ft)", 10, 1000, 0.5), num("width", "Width (ft)", 10, 1000, 0.5), num("thickness", "Thickness (in)", 4, 120, 0.5), num("cubicYards", "Cubic Yards", 1, 10000, 0.25), num("quantity", "Quantity", 1, 1000, 1, 1), dropdown("density", "Concrete Type", opts(["Reinforced (150 lb/ft³)", "Normal weight plain (145 lb/ft³)", "Structural lightweight (115 lb/ft³)", "Lightweight insulating (100 lb/ft³)", "Heavyweight (225 lb/ft³)"]), 1)],
    results: [["weightLb", "Weight (lb)", "n"], ["shortTons", "Weight (US tons)", "n"], ["weightKg", "Weight (kg)", "n"], ["metricTonnes", "Weight (metric tonnes)", "n"], ["cubicYards", "Volume (yd³)", "n"]],
    fn: E.concreteWeight, ex: { mode: 0, length: 10, width: 10, thickness: 4, cubicYards: 1, quantity: 1, density: 1 },
    exText: (o) => `Example: a 10 × 10 ft slab 4 in thick weighs about ${fmt(o.weightLb, 0)} lb (${o.shortTons} tons) in normal-weight concrete.`,
    how: "Enter the slab dimensions or a volume in cubic yards and choose the concrete type.",
    assume: "Densities: plain normal-weight 145 lb/ft³ (≈ 3,915 lb per yd³), reinforced 150, structural lightweight 115, insulating 100, heavyweight 225.",
    faq: [["How much does a yard of concrete weigh?", "About 4,000 lb (2 tons) for normal concrete."], ["How much does a 4 inch slab weigh per square foot?", "About 48–50 lb per sq ft."]],
  }),
  mk({
    slug: "rebar-calculator", title: "Rebar Calculator",
    desc: "Calculate rebar for a slab grid — bars each way, total linear feet with lap splices, number of 20 ft bars, weight and cost — from slab size, spacing and bar size.",
    inputs: [num("length", "Slab Length (ft)", 20, 1000, 0.5), num("width", "Slab Width (ft)", 20, 1000, 0.5), num("spacing", "Bar Spacing (in on center)", 12, 48, 1, 4), num("edgeCover", "Edge Clearance (in)", 3, 12, 0.5), dropdown("barSize", "Bar Size", BARS, 1), num("stockLength", "Stock Bar Length (ft)", 20, 60, 1, 10), num("lapDiameters", "Lap Splice (bar diameters)", 40, 80, 1), pct("waste", "Extra", 5, 30, 1), cur("barPrice", "Price per Stock Bar", 9, 200, 0.25)],
    results: [["stockBars", "Stock Bars to Buy", "n"], ["totalLinearFeet", "Total Linear Feet", "n"], ["barsRunningLength", "Bars Running Lengthwise", "n"], ["barsRunningWidth", "Bars Running Widthwise", "n"], ["weightLb", "Weight (lb)", "n"], ["intersections", "Tie Points", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.rebarGrid, ex: { length: 20, width: 20, spacing: 12, edgeCover: 3, barSize: 1, stockLength: 20, lapDiameters: 40, waste: 5, barPrice: 9 },
    exText: (o) => `Example: a 20 × 20 ft slab with #4 bars at 12 in each way (3 in edge cover) needs ${o.barsRunningLength} + ${o.barsRunningWidth} bars — ${o.totalLinearFeet} linear ft with 5% extra, or ${o.stockBars} 20 ft bars weighing ${fmt(o.weightLb, 0)} lb.`,
    how: "Enter the slab size, bar spacing and clearance from the edges, then the bar size and stock length you'll buy. Lap length is set in bar diameters (40d is common).",
    assume: "Bars each way = floor(clear span ÷ spacing) + 1. Runs longer than one stock bar get lap splices of the chosen diameters. Unit weights per ASTM A615.",
    faq: [["How much rebar do I need for a slab?", "For #4 at 12 in each way, roughly 2 linear ft of rebar per sq ft of slab."], ["What size rebar for a driveway?", "#3 or #4 at 12–18 in on center is typical for residential driveways."]],
  }),
  mk({
    slug: "rebar-weight-calculator", title: "Rebar Weight Calculator",
    desc: "Calculate rebar weight by bar size (#3–#11), length and count — in pounds, kilograms and tons, with the unit weight per foot and total cost.",
    inputs: [dropdown("barSize", "Bar Size", BARS, 1), num("barLength", "Length per Bar (ft)", 20, 100, 0.5), num("bars", "Number of Bars", 50, 100000), dropdown("priceBasis", "Price Basis", opts(["Per pound", "Per ton"]), 0), cur("price", "Price", 0.75, 5000, 0.01)],
    results: [["weightLb", "Total Weight (lb)", "n"], ["weightKg", "Total Weight (kg)", "n"], ["shortTons", "Total Weight (tons)", "n"], ["poundsPerFoot", "Weight per Foot (lb)", "n"], ["totalFeet", "Total Length (ft)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.rebarWeight, ex: { barSize: 1, barLength: 20, bars: 50, priceBasis: 0, price: 0.75 },
    exText: (o) => `Example: fifty 20 ft #4 bars are ${fmt(o.totalFeet, 0)} ft × ${o.poundsPerFoot} lb/ft = ${fmt(o.weightLb, 0)} lb (${o.shortTons} tons), about ${usd(o.totalCost)} at $0.75/lb.`,
    how: "Choose the bar size, enter the length of each bar and how many, and optionally a price per pound or ton.",
    assume: "ASTM A615 nominal weights: #3 0.376, #4 0.668, #5 1.043, #6 1.502, #7 2.044, #8 2.670, #9 3.400, #10 4.303, #11 5.313 lb/ft.",
    faq: [["How much does a 20 ft piece of #4 rebar weigh?", "About 13.4 lb (0.668 lb/ft × 20 ft)."], ["What does rebar size number mean?", "The number is the diameter in eighths of an inch — #4 is 4/8 = 1/2 in."]],
  }),
  mk({
    slug: "concrete-curing-time-calculator", title: "Concrete Curing Time Calculator",
    desc: "Estimate when you can walk on, strip forms from, drive on and fully load new concrete — adjusted for air temperature and cement type.",
    inputs: [num("temperature", "Average Air Temperature (°F)", 70, 110, 1, 20), dropdown("cementType", "Mix", opts(["Standard (Type I/II)", "High-early (Type III)", "With accelerator", "With slag / fly ash (slower)"]), 0)],
    results: [["daysToDriveOn", "Days Until You Can Drive On It", "n"], ["hoursToWalkOn", "Hours Until You Can Walk On It", "n"], ["daysToStripForms", "Days to Strip Forms", "n"], ["daysTo70Percent", "Days to ~70% Strength", "n"], ["daysToFullStrength", "Days to Full Design Strength", "n"], ["maturityFactor", "Speed vs 70 °F (×)", "n"], ["coldWeatherWarning", "Below 40 °F — protect from cold (1 = yes)", "n"]],
    fn: E.curingTime, ex: { temperature: 50, cementType: 0 },
    exText: (o) => `Example: at an average of 50 °F standard concrete gains strength at ${o.maturityFactor}× the 70 °F rate — wait about ${o.daysToDriveOn} days before driving on it and ${o.daysToFullStrength} days for full strength.`,
    how: "Enter the average temperature expected over the first week and the type of mix you ordered.",
    assume: "Base schedule at 70 °F: walk 24 h, strip forms 2 days, cars 7 days, full strength 28 days. Times are scaled with the Nurse–Saul maturity method (−10 °C datum). Keep concrete moist for at least 7 days; below 40 °F use blankets or heated enclosures.",
    faq: [["How long before you can drive on new concrete?", "About 7 days for cars in mild weather and 28 days for heavy trucks."], ["Does cold weather slow concrete curing?", "Yes — at 50 °F it takes roughly 1.5× as long as at 70 °F, and curing almost stops near freezing."]],
  }),
  mk({
    slug: "cement-calculator", title: "Cement Calculator (Concrete Mix Ratio)",
    desc: "Calculate cement bags, sand and gravel for a concrete mix ratio such as 1:2:4 or 1:1.5:3 — by volume or slab size — with water at your water–cement ratio.",
    meta: "Cement Calculator — Concrete Mix Ratio, Sand & Gravel",
    inputs: [dropdown("mode", "Enter", opts(["Dimensions", "Cubic yards"]), 0), num("length", "Length (ft)", 10, 1000, 0.5), num("width", "Width (ft)", 10, 1000, 0.5), num("thickness", "Thickness (in)", 4, 60, 0.5), num("cubicYards", "Cubic Yards", 1, 1000, 0.25), dropdown("mix", "Mix Ratio (cement : sand : gravel)", opts(["1:2:4 general (≈3,000 psi)", "1:1.5:3 structural (≈M20 / 3,500 psi)", "1:2:3 strong", "1:3:6 lean / blinding", "1:1:2 high strength", "1:3 mortar / sand-cement (no gravel)"]), 0), num("waterCementRatio", "Water–Cement Ratio", 0.5, 0.8, 0.01, 0.3), pct("waste", "Extra", 5, 30, 1)],
    results: [["cementBags94", "Cement (94 lb bags)", "n"], ["cementLb", "Cement (lb)", "n"], ["cementBags50kg", "Cement (50 kg bags)", "n"], ["sandTons", "Sand (tons)", "n"], ["sandCubicYards", "Sand (yd³)", "n"], ["gravelTons", "Gravel (tons)", "n"], ["gravelCubicYards", "Gravel (yd³)", "n"], ["waterGallons", "Water (gallons)", "n"]],
    fn: E.cementMix, ex: { mode: 1, length: 10, width: 10, thickness: 4, cubicYards: 1, mix: 0, waterCementRatio: 0.5, waste: 0 },
    exText: (o) => `Example: 1 yd³ of 1:2:4 concrete needs ${o.cementBags94} bags of 94 lb Portland cement, ${o.sandTons} tons of sand and ${o.gravelTons} tons of gravel, with about ${o.waterGallons} gallons of water at w/c 0.5.`,
    how: "Enter the volume (or slab size), choose the mix ratio and water–cement ratio. Lower water–cement ratios give stronger concrete.",
    assume: "Dry-volume factor 1.54 for concrete (1.33 for mortar); a 94 lb bag of Portland cement is 1 cu ft. Sand 100 lb/ft³ and gravel 105 lb/ft³ loose. Proportions are by volume — engineered mixes should be designed by weight.",
    faq: [["How many bags of cement per cubic yard?", "About 6 bags of 94 lb cement for a 1:2:4 mix, close to 7 for 1:1.5:3."], ["What is the best concrete mix ratio?", "1:2:4 suits most slabs and paths; use 1:1.5:3 for structural work."]],
  }),
  mk({
    slug: "concrete-block-calculator", title: "Concrete Block (CMU) Calculator",
    desc: "Calculate how many concrete blocks (CMU) you need for a wall — by wall size, openings and block size — with courses, mortar bags and total cost.",
    meta: "Concrete Block Calculator — CMU Blocks & Mortar",
    inputs: [num("length", "Wall Length (ft)", 40, 5000, 0.5), num("height", "Wall Height (ft)", 8, 40, 0.5), num("openings", "Openings (sq ft)", 0, 5000), dropdown("blockSize", "Block Size", opts(E.BLOCKS.map(([n]) => n)), 0), pct("waste", "Extra", 5, 30, 1), cur("blockPrice", "Price per Block", 2.25, 50, 0.05), cur("mortarPrice", "Price per 80 lb Mortar Bag", 9, 50, 0.25)],
    results: [["blocksNeeded", "Blocks Needed", "n"], ["blocksPerSqFt", "Blocks per Sq Ft", "n"], ["courses", "Courses", "n"], ["mortarBags80", "Mortar (80 lb bags)", "n"], ["mortarCubicFeet", "Mortar (cu ft)", "n"], ["wallAreaSqFt", "Net Wall Area (sq ft)", "n"], ["totalCost", "Material Cost", "c"]],
    fn: E.cmu, ex: { length: 40, height: 8, openings: 0, blockSize: 0, waste: 5, blockPrice: 2.25, mortarPrice: 9 },
    exText: (o) => `Example: a 40 × 8 ft wall of standard 8×8×16 block needs ${o.blocksNeeded} blocks (${o.courses} courses) and ${o.mortarBags80} bags of mortar — about ${usd(o.totalCost)}.`,
    how: "Enter the wall length and height, subtract openings, and choose the block size. Prices are per block and per bag.",
    assume: "A 16 × 8 in face (with 3/8 in joints) covers 0.889 sq ft, so 1.125 blocks per sq ft. Mortar ≈ 8.5 cu ft per 100 standard blocks; an 80 lb premix bag yields about 0.67 cu ft.",
    faq: [["How many blocks are in 100 square feet of wall?", "About 113 standard 8×8×16 blocks."], ["How much mortar per 100 blocks?", "Roughly 8.5 cu ft — about 13 bags of 80 lb premixed mortar."]],
  }),
  mk({
    slug: "brick-calculator", title: "Brick Calculator",
    desc: "Calculate how many bricks or brick pavers you need — modular, queen, king, utility or 4×8 pavers — with mortar or bedding sand and cost.",
    meta: "Brick & Brick Paver Calculator — How Many Bricks?",
    inputs: [num("length", "Wall / Area Length (ft)", 20, 5000, 0.5), num("height", "Wall Height or Area Width (ft)", 8, 1000, 0.5), num("openings", "Openings (sq ft)", 0, 5000), dropdown("brickType", "Brick Type", opts(E.BRICKS.map(([n]) => n)), 0), num("joint", "Mortar Joint (in)", 0.375, 1, 0.125), pct("waste", "Extra", 5, 30, 1), cur("unitPrice", "Price per Brick", 0.75, 20, 0.01)],
    results: [["bricksNeeded", "Bricks Needed", "n"], ["bricksPerSqFt", "Bricks per Sq Ft", "n"], ["mortarBags80", "Mortar (80 lb bags)", "n"], ["mortarCubicFeet", "Mortar (cu ft)", "n"], ["beddingSandCubicYards", "Bedding Sand for Pavers (yd³)", "n"], ["areaSqFt", "Net Area (sq ft)", "n"], ["totalCost", "Brick Cost", "c"]],
    fn: E.brick, ex: { length: 20, height: 8, openings: 0, brickType: 0, joint: 0.375, waste: 5, unitPrice: 0.75 },
    exText: (o) => `Example: a 20 × 8 ft wall of modular brick with 3/8 in joints needs ${o.bricksNeeded} bricks (${o.bricksPerSqFt} per sq ft) and ${o.mortarBags80} bags of mortar — about ${usd(o.totalCost)} in brick.`,
    how: "Enter the wall (or patio) size, subtract openings, choose the brick type and joint width. Paver options assume sand-set pavers with no mortar and a 1 in sand bed.",
    assume: "Bricks per sq ft = 144 ÷ ((length + joint) × (height + joint)). Mortar is the joint volume through the brick's depth. Herringbone patterns add 5% for cuts.",
    faq: [["How many bricks per square foot?", "About 6.75 modular bricks with 3/8 in joints, or 4.5 flat 4×8 pavers."], ["How many bricks in 1,000 square feet?", "About 6,750 modular bricks plus waste."]],
  }),
  mk({
    slug: "mortar-calculator", title: "Mortar Calculator",
    desc: "Estimate mortar for brick, block or stone — in cubic feet, 60 or 80 lb premix bags, or masonry cement bags plus sand — from wall area and unit type.",
    inputs: [num("area", "Wall Area (sq ft)", 200, 100000), dropdown("unitType", "Masonry Type", opts(E.MORTAR_UNITS.map(([n]) => n)), 0), pct("waste", "Extra", 10, 50, 1), cur("bagPrice", "Price per 80 lb Premix Bag", 9, 50, 0.25)],
    results: [["premixBags80", "80 lb Premix Bags", "n"], ["premixBags60", "60 lb Premix Bags", "n"], ["mortarCubicFeet", "Mortar (cu ft)", "n"], ["masonryCementBags70", "Or Masonry Cement (70 lb bags)", "n"], ["sandTons", "+ Sand (tons)", "n"], ["totalCost", "Premix Cost", "c"]],
    fn: E.mortar, ex: { area: 200, unitType: 0, waste: 10, bagPrice: 9 },
    exText: (o) => `Example: 200 sq ft of modular brick needs ${o.mortarCubicFeet} cu ft of mortar — ${o.premixBags80} bags of 80 lb premix, or ${o.masonryCementBags70} bags of masonry cement with ${o.sandTons} tons of sand.`,
    how: "Enter the wall area and the kind of masonry. Choose premix bags for small jobs or masonry cement and sand for larger ones.",
    assume: "Mortar per sq ft: modular brick 0.059 cu ft (≈ 8.7 cu ft per 1,000 bricks), 8 in CMU 0.096, 12 in CMU 0.129, stone veneer 0.10. 80 lb premix ≈ 0.67 cu ft; one 70 lb bag of masonry cement with 3 cu ft of sand ≈ 3 cu ft of mortar.",
    faq: [["How many bags of mortar per 1,000 bricks?", "About 7 bags of masonry cement plus sand, or 13–15 bags of 80 lb premix."], ["Type S or Type N mortar?", "Type S for below-grade and structural walls, Type N for above-grade veneer."]],
  }),
  mk({
    slug: "block-fill-calculator", title: "Block Fill Calculator (CMU Grout)",
    desc: "Calculate grout or core-fill concrete to fill concrete block walls — fully or partly grouted — in cubic yards and 80 lb bags, by block width.",
    meta: "Block Fill Calculator — CMU Core Fill Grout",
    inputs: [num("length", "Wall Length (ft)", 40, 5000, 0.5), num("height", "Wall Height (ft)", 8, 40, 0.5), num("openings", "Openings (sq ft)", 0, 5000), dropdown("blockWidth", "Block Width", opts(E.GROUT_PER_SQFT.map(([n]) => n)), 1), pct("percentFilled", "Cells Filled (%)", 100, 100, 5), pct("waste", "Extra", 10, 50, 1), cur("pricePerYard", "Grout Price per Cubic Yard", 185, 1000)],
    results: [["groutCubicYards", "Grout (yd³)", "n"], ["groutCubicFeet", "Grout (cu ft)", "n"], ["bags80", "80 lb Bags", "n"], ["blocksInWall", "Blocks in Wall", "n"], ["totalCost", "Grout Cost", "c"]],
    fn: E.blockFill, ex: { length: 40, height: 8, openings: 0, blockWidth: 1, percentFilled: 100, waste: 10, pricePerYard: 185 },
    exText: (o) => `Example: fully grouting a 40 × 8 ft wall of 8 in block takes ${o.groutCubicYards} yd³ of grout (${o.bags80} bags if mixing by hand) — about ${usd(o.totalCost)}.`,
    how: "Enter the wall size and block width, and the share of cells you'll fill — 100% for fully grouted, or e.g. 25% for cells at 32 in on center.",
    assume: "Grout per sq ft of fully grouted wall: 6 in 0.167, 8 in 0.258, 10 in 0.347, 12 in 0.437 cu ft (NCMA tables, standard two-core units).",
    faq: [["How much grout to fill an 8 inch block wall?", "About 0.26 cu ft per sq ft of wall — roughly 1 yd³ per 105 sq ft."]],
  }),
  mk({
    slug: "icf-calculator", title: "ICF Block Calculator",
    desc: "Calculate insulated concrete form (ICF) blocks — straight and corner blocks, courses, concrete yards for the core and rebar — from wall size and core width.",
    meta: "ICF Block Calculator — Blocks, Concrete & Rebar",
    inputs: [num("length", "Total Wall Length (ft)", 160, 5000, 0.5), num("height", "Wall Height (ft)", 9, 40, 0.5), num("openings", "Openings (sq ft)", 120, 5000), num("corners", "Number of 90° Corners", 4, 100), dropdown("core", "Concrete Core", opts(E.ICF_CORES.map((c) => `${c} in core`)), 1), num("blockLength", "Block Length (in)", 48, 96, 1, 12), num("blockHeight", "Block Height (in)", 16, 24, 1, 8), num("verticalSpacing", "Vertical Rebar Spacing (in)", 24, 72, 1, 6), pct("waste", "Extra Blocks", 5, 30, 1)],
    results: [["totalBlocks", "Total ICF Blocks", "n"], ["straightBlocks", "Straight Blocks", "n"], ["cornerBlocks", "Corner Blocks", "n"], ["courses", "Courses", "n"], ["concreteCubicYards", "Concrete (yd³)", "n"], ["rebarLinearFeet", "Rebar (linear ft)", "n"], ["wallAreaSqFt", "Net Wall Area (sq ft)", "n"]],
    fn: E.icf, ex: { length: 160, height: 9, openings: 120, corners: 4, core: 1, blockLength: 48, blockHeight: 16, verticalSpacing: 24, waste: 5 },
    exText: (o) => `Example: 160 ft of 9 ft wall with a 6 in core and 120 sq ft of openings needs ${o.totalBlocks} blocks (${o.cornerBlocks} corners), ${o.concreteCubicYards} yd³ of concrete and about ${fmt(o.rebarLinearFeet, 0)} ft of rebar.`,
    how: "Enter the total wall length (all sides), height, openings and corner count, then the core width and block size from your ICF brand.",
    assume: "Standard ICF block face 48 × 16 in (5.33 sq ft). Concrete = net wall area × core width + 5%. Rebar: one horizontal bar per course (two for 8 in+ cores) plus verticals at the set spacing, +10% laps.",
    faq: [["How much concrete does an ICF wall take?", "About 0.0185 yd³ per sq ft for a 6 in core — 1 yd³ per 54 sq ft of wall."]],
  }),
  mk({
    slug: "grout-calculator", title: "Tile Grout Calculator",
    desc: "Calculate how much tile grout you need — pounds and 10 or 25 lb bags — from tile size, joint width, tile thickness and area, for sanded, unsanded or epoxy grout.",
    meta: "Grout Calculator — How Much Tile Grout (lb & bags)",
    inputs: [num("area", "Tiled Area (sq ft)", 100, 100000), num("tileLength", "Tile Length (in)", 12, 96, 0.25), num("tileWidth", "Tile Width (in)", 12, 96, 0.25), num("tileThickness", "Tile Thickness (in)", 0.375, 2, 0.0625), num("jointWidth", "Joint Width (in)", 0.125, 1, 0.0625), dropdown("groutType", "Grout Type", opts(["Sanded cement grout", "Unsanded cement grout", "Epoxy grout"]), 0), pct("waste", "Extra", 10, 50, 1)],
    results: [["groutLb", "Grout Needed (lb)", "n"], ["bags25lb", "25 lb Bags", "n"], ["bags10lb", "10 lb Bags", "n"], ["groutKg", "Grout (kg)", "n"], ["lbPer100SqFt", "lb per 100 Sq Ft", "n"], ["coveragePer25lbBag", "Sq Ft per 25 lb Bag", "n"]],
    fn: E.tileGrout, ex: { area: 100, tileLength: 12, tileWidth: 12, tileThickness: 0.375, jointWidth: 0.125, groutType: 0, waste: 10 },
    exText: (o) => `Example: 100 sq ft of 12 × 12 in tile, 3/8 in thick with 1/8 in joints, needs about ${o.groutLb} lb of sanded grout — ${o.bags10lb} × 10 lb bag(s).`,
    how: "Enter the area, tile size and thickness, and the joint width you're using. Use sanded grout for joints 1/8 in and wider.",
    assume: "Joint volume per sq ft = (L + W) ÷ (L × W) × joint width × tile thickness × 144. Density ≈ 0.0625 lb/in³ for cement grout (≈ 1.73 g/cm³) and 0.054 for epoxy. Manufacturer calculators (Mapei, Custom) use the same geometry.",
    faq: [["How much grout for 100 square feet?", "With 12 in tile and 1/8 in joints, about 4–6 lb; small mosaics or wide joints use far more."], ["Sanded or unsanded grout?", "Unsanded for joints under 1/8 in, sanded for 1/8 in and wider."]],
  }),
  mk({
    slug: "flowable-fill-calculator", title: "Flowable Fill Calculator",
    desc: "Calculate flowable fill (CLSM) for trenches and voids — cubic yards after subtracting the pipe, weight, trucks and cost.",
    inputs: [num("length", "Trench / Void Length (ft)", 100, 50000, 1), num("width", "Width (in)", 24, 240, 1), num("depth", "Depth (in)", 36, 240, 1), num("pipeDiameter", "Pipe Outside Diameter (in) — 0 if none", 8, 120, 0.5), num("density", "Fill Density (lb/ft³)", 120, 150, 1, 80), pct("waste", "Extra", 5, 50, 1), cur("pricePerYard", "Price per Cubic Yard", 125, 1000)],
    results: [["cubicYards", "Flowable Fill (yd³)", "n"], ["cubicMeters", "Volume (m³)", "n"], ["weightTons", "Weight (tons)", "n"], ["trucks", "10-Yard Trucks", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.flowableFill, ex: { length: 100, width: 24, depth: 36, pipeDiameter: 8, density: 120, waste: 5, pricePerYard: 125 },
    exText: (o) => `Example: 100 ft of 24 × 36 in trench around an 8 in pipe takes ${o.cubicYards} yd³ of flowable fill (${o.trucks} truck) — about ${usd(o.totalCost)}.`,
    how: "Enter the trench or void size and the outside diameter of any pipe it surrounds.",
    assume: "Volume = trench − pipe displacement. Excavatable flowable fill is typically 80–130 lb/ft³ and $100–150 per yd³ delivered in 2026.",
    faq: [["What is flowable fill?", "A low-strength, self-compacting cement slurry (CLSM) used instead of compacted backfill."]],
  }),
  mk({
    slug: "thrust-block-calculator", title: "Thrust Block Calculator",
    desc: "Size a concrete thrust block for a pressure pipe fitting — thrust force, required bearing area and concrete volume from pipe size, test pressure, fitting and soil.",
    meta: "Thrust Block Calculator — Bearing Area & Concrete",
    inputs: [num("pipeDiameter", "Pipe Diameter (in)", 8, 72, 1, 2), num("pressure", "Test Pressure (psi)", 150, 500, 5), dropdown("fitting", "Fitting", opts(E.FITTINGS.map(([n]) => n)), 0), dropdown("soil", "Soil Type (bearing, psf)", opts(E.SOILS.map(([n, b]) => (b ? `${n} (${b.toLocaleString("en-US")})` : n))), 4), num("safetyFactor", "Safety Factor", 1.5, 3, 0.1, 1), num("blockDepth", "Block Thickness Behind Fitting (ft)", 2, 10, 0.5)],
    results: [["thrustLb", "Thrust Force (lb)", "n"], ["bearingAreaSqFt", "Required Bearing Area (sq ft)", "n"], ["squareFaceSideFt", "Square Face Side (ft)", "n"], ["concreteCubicYards", "Concrete (yd³)", "n"], ["soilUnsuitable", "Soil Unsuitable — use restrained joints (1 = yes)", "n"]],
    fn: E.thrustBlock, ex: { pipeDiameter: 8, pressure: 150, fitting: 0, soil: 4, safetyFactor: 1.5, blockDepth: 2 },
    exText: (o) => `Example: an 8 in 90° bend at 150 psi produces ${fmt(o.thrustLb, 0)} lb of thrust; in sand (4,000 psf) with a 1.5 safety factor the block needs ${o.bearingAreaSqFt} sq ft of bearing (about ${o.squareFaceSideFt} ft square).`,
    how: "Enter the nominal pipe diameter, the test pressure, the fitting and your soil type. The thrust block bears against undisturbed soil.",
    assume: "Thrust T = 2PA sin(θ/2) for bends and T = PA for tees, dead ends and plugs, with A from the nominal diameter (AWWA M41 / DIPRA method). Soil bearing values are typical — use a geotechnical value where available.",
    faq: [["Why do water pipes need thrust blocks?", "Pressure pushes outward at bends, tees and dead ends; the block transfers that force into undisturbed soil so joints don't pull apart."]],
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
