// One-time (but safe to re-run) batch setup script: creates 20 calculators in House & Garden
// Calculators > Gravel, Soil & Landscaping Calculators (soil, rock, gravel, sod, turf, drains, grading and landscaping costs). Formulas live in src/lib/calc-engine-hg-land.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-land-calculators.ts
// or
//   npm run db:create-hg-land-calculators

import * as E from "../src/lib/calc-engine-hg-land";

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

const CAT = "gravel-soil-landscaping-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region, access and season — use them to budget, then get local quotes.";
const SHAPE = dd("shape", "Shape", ["Rectangle", "Circle"]);
const LEN = (d: number) => num("length", "Length (or circle diameter)", d, 10000, 0.5, 0, "ft");
const WID = (d: number) => num("width", "Width", d, 10000, 0.5, 0, "ft");

const TOOLS: ToolDef[] = [
  mk({
    slug: "soil-dirt-calculator", title: "Soil & Dirt Calculator (Cubic Yards, Tons & Bags)",
    desc: "Work out how much soil or dirt you need — cubic yards, cubic feet, tons and bags — for topsoil, black dirt, fill, clay or garden soil, in a rectangle or circle.",
    meta: "Soil Calculator — How Much Dirt Do I Need? (Yards & Tons)",
    inputs: [SHAPE, LEN(20), WID(10), num("depth", "Depth", 4, 120, 0.5, 0, "in"), dd("soil", "Soil Type", E.SOIL_TYPES), num("bagCuFt", "Bag Size", 1, 3, 0.25, 0.25, "cu ft"), usd("pricePerYard", "Price per Cubic Yard", 35, 500, 1)],
    results: [["cubicYards", "Soil Needed (cu yd)", "n"], ["cubicFeet", "Cubic Feet", "n"], ["tons", "Weight (tons)", "n"], ["bags", "Bags", "n"], ["area", "Area (sq ft)", "n"], ["cost", "Bulk Cost", "c"]],
    fn: E.soilDirt, ex: { shape: 0, length: 20, width: 10, depth: 4, soil: 0, bagCuFt: 1, pricePerYard: 35 },
    exText: (o) => `Example: a 20 × 10 ft area 4 in deep needs ${o.cubicYards} cu yd (${o.cubicFeet} cu ft) of topsoil — about ${o.tons} tons, or ${o.bags} one-cubic-foot bags.`,
    how: "Enter the area and depth. Use 4–6 in of topsoil for new lawns, 6–12 in for garden beds. For more than about 1 cu yd, bulk delivery is usually far cheaper than bags.",
    assume: "Tons per loose cu yd: topsoil 1.2, black dirt 1.1, fill dirt 1.3, clay 1.5, compost blend 0.8 (moisture changes these). 1 cu yd = 27 cu ft.",
    faq: [["How many bags of soil make a yard?", "27 one-cubic-foot bags, or 36 bags of 0.75 cu ft."], ["How much does a yard of dirt weigh?", "About 1–1.5 tons depending on type and moisture."]],
  }),
  mk({
    slug: "landscape-rock-calculator", title: "Landscape Rock Calculator (River Rock, Lava Rock & Decorative Stone)",
    desc: "Calculate how much landscape rock you need — river rock, lava rock, decorative gravel, marble or slate chips — in tons, cubic yards and bags, with coverage per ton and cost.",
    meta: "Landscape Rock Calculator — How Much River Rock Do I Need?",
    inputs: [SHAPE, LEN(20), WID(5), num("depth", "Depth", 2, 24, 0.5, 0.5, "in"), dd("rock", "Rock Type", E.ROCK_TYPES), usd("pricePerTon", "Price per Ton", 90, 1000, 1)],
    results: [["tons", "Rock Needed (tons)", "n"], ["cubicYards", "Cubic Yards", "n"], ["bags", "0.5 cu ft Bags", "n"], ["sqFtPerTon", "Coverage per Ton (sq ft)", "n"], ["area", "Area (sq ft)", "n"], ["cost", "Rock Cost", "c"]],
    fn: E.landscapeRock, ex: { shape: 0, length: 20, width: 5, depth: 2, rock: 0, pricePerTon: 90 },
    exText: (o) => `Example: a 20 × 5 ft bed of river rock 2 in deep needs about ${o.tons} tons (${o.cubicYards} cu yd) — one ton covers roughly ${o.sqFtPerTon} sq ft at that depth.`,
    how: "Enter the bed size and depth. Use 2 in for 3/4–1.5 in rock, 3 in for 1–3 in rock and at least twice the stone size for large cobbles. Lay landscape fabric first to stop weeds.",
    assume: "Tons per cu yd: river rock 1.35, lava rock 0.5, decorative gravel 1.4, pea gravel 1.4, marble chips 1.5, slate chips 1.3, drain rock 1.35. Bags are 0.5 cu ft.",
    faq: [["How much area does a ton of river rock cover?", "About 100 sq ft at 2 in deep."]],
  }),
  mk({
    slug: "pea-gravel-calculator", title: "Pea Gravel Calculator (Tons, Yards & Bags)",
    desc: "Find how much pea gravel you need for a path, patio, play area or drainage — tons, cubic yards and 0.5 cu ft bags — with coverage per ton and cost.",
    inputs: [SHAPE, LEN(20), WID(10), num("depth", "Depth", 3, 24, 0.5, 0.5, "in"), usd("pricePerTon", "Price per Ton", 45, 500, 1)],
    results: [["tons", "Pea Gravel (tons)", "n"], ["cubicYards", "Cubic Yards", "n"], ["bags", "0.5 cu ft Bags", "n"], ["sqFtPerTon", "Coverage per Ton (sq ft)", "n"], ["cost", "Gravel Cost", "c"]],
    fn: E.peaGravel, ex: { shape: 0, length: 20, width: 10, depth: 3, pricePerTon: 45 },
    exText: (o) => `Example: a 20 × 10 ft patio 3 in deep needs ${o.tons} tons (${o.cubicYards} cu yd) of pea gravel.`,
    how: "Use 2–3 in for paths and patios, 3–4 in for driveways (on a base) and 9–12 in under play equipment. Pea gravel rolls, so edge it with steel, stone or timber.",
    assume: "Pea gravel ≈ 1.4 tons per cu yd; bags 0.5 cu ft (about 50 lb).",
    faq: [["How much does a ton of pea gravel cover?", "About 100 sq ft at 2 in deep, or 70 sq ft at 3 in."]],
  }),
  mk({
    slug: "sod-calculator", title: "Sod Calculator (Pallets, Rolls & Slabs)",
    desc: "Work out how much sod to order — square feet, slabs or rolls, and pallets — from your lawn size plus extra areas and a waste allowance, with the cost per pallet.",
    inputs: [num("length", "Lawn Length", 50, 10000, 0.5, 0, "ft"), num("width", "Lawn Width", 30, 10000, 0.5, 0, "ft"), num("extraArea", "Extra Areas (other shapes)", 0, 1000000, 1, 0, "sq ft"), pct("waste", "Waste Allowance", 5, 30), dd("piece", "Piece Size", ["16 × 24 in slab (2.67 sq ft)", "2 × 5 ft roll (10 sq ft)", "Big roll (30 sq ft)"]), num("palletSqFt", "Sq Ft per Pallet", 450, 1000, 10, 100), usd("palletPrice", "Price per Pallet", 250, 2000, 5)],
    results: [["pallets", "Pallets", "n"], ["sqFtToOrder", "Sq Ft to Order", "n"], ["pieces", "Slabs / Rolls", "n"], ["cost", "Sod Cost", "c"]],
    fn: E.sod, ex: { length: 50, width: 30, extraArea: 0, waste: 5, piece: 0, palletSqFt: 450, palletPrice: 250 },
    exText: (o) => `Example: a 50 × 30 ft lawn with 5% waste needs ${n2(o.sqFtToOrder)} sq ft of sod — ${o.pallets} pallets or about ${n2(o.pieces)} slabs.`,
    how: "Measure each part of the lawn and add them together. Order 5% extra for straight edges and 10% for curvy beds. Lay sod the day it arrives and water it daily for two weeks.",
    assume: "Pallets usually hold 400–500 sq ft (ask your supplier); slabs are 16 × 24 in. Prices vary by grass type (fescue, Bermuda, St. Augustine, Zoysia).",
    faq: [["How much sod is on a pallet?", "Usually 400–500 sq ft — about 150–180 slabs."]],
  }),
  mk({
    slug: "fill-dirt-calculator", title: "Fill Dirt Calculator (Yards, Tons & Truck Loads)",
    desc: "Calculate how much fill dirt you need to raise or level ground — loose cubic yards with compaction, tons, dump-truck loads and delivered cost.",
    inputs: [num("length", "Area Length", 30, 10000, 0.5, 0, "ft"), num("width", "Area Width", 20, 10000, 0.5, 0, "ft"), num("depth", "Fill Depth", 12, 240, 1, 0, "in"), pct("compaction", "Compaction Allowance", 15, 50), usd("pricePerYard", "Price per Cubic Yard", 15, 200, 1), num("truckYards", "Truck Size", 10, 30, 1, 1, "cu yd"), usd("deliveryPerLoad", "Delivery per Load", 100, 1000, 5)],
    results: [["cubicYards", "Fill Dirt (cu yd, loose)", "n"], ["tons", "Weight (tons)", "n"], ["truckLoads", "Truck Loads", "n"], ["cost", "Delivered Cost", "c"]],
    fn: E.fillDirt, ex: { length: 30, width: 20, depth: 12, compaction: 15, pricePerYard: 15, truckYards: 10, deliveryPerLoad: 100 },
    exText: (o) => `Example: raising a 30 × 20 ft area by 12 in takes about ${o.cubicYards} cu yd of fill dirt with 15% compaction — ${o.truckLoads} ten-yard truck loads.`,
    how: "Enter the area and how much you want to raise it. Fill compacts, so order 10–25% more and compact it in 6 in layers. Finish with 4–6 in of topsoil if you want grass to grow.",
    assume: "Fill dirt ≈ 1.3 tons per cu yd. Many suppliers sell by the ton; a single-axle dump truck carries about 5–7 yd, a tandem 10–14 yd.",
    faq: [["How many yards of fill dirt in a dump truck?", "About 10–14 cu yd in a tandem truck."]],
  }),
  mk({
    slug: "sod-cost-calculator", title: "Sod Cost Calculator (Installed vs DIY)",
    desc: "Estimate the cost to install sod — sod, soil prep, old lawn removal, labor and delivery — and compare a professional install with doing it yourself.",
    inputs: [num("area", "Lawn Area", 1500, 1000000, 1, 0, "sq ft"), usd("sodPerSqFt", "Sod Price per Sq Ft", 0.45, 5, 0.01), usd("laborPerSqFt", "Installation Labor per Sq Ft", 0.8, 5, 0.01), usd("prepPerSqFt", "Soil Prep / Grading per Sq Ft", 0.3, 5, 0.01), dd("removeOld", "Remove Old Lawn?", ["No", "Yes"]), usd("delivery", "Delivery", 100, 2000, 5)],
    results: [["proCost", "Installed Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["diyCost", "DIY Cost (sod + delivery)", "c"], ["proPerSqFt", "Installed per Sq Ft", "c"]],
    fn: E.sodCost, ex: { area: 1500, sodPerSqFt: 0.45, laborPerSqFt: 0.8, prepPerSqFt: 0.3, removeOld: 0, delivery: 100 },
    exText: (o) => `Example: sodding 1,500 sq ft costs about ${money(o.proCost)} installed, or ${money(o.diyCost)} if you lay it yourself.`,
    how: "Enter the lawn area and prices. Removing an old lawn (sod cutter or herbicide) adds about $0.50 per sq ft.",
    assume: `Typical prices: sod $0.30–0.80 per sq ft, installation $0.60–1.20, prep $0.20–0.50. DIY adds ~$0.05 per sq ft for rentals and starter fertilizer. ${COST_NOTE}`,
    faq: [["How much does it cost to sod a yard?", "Usually $1–2 per sq ft installed."]],
  }),
  mk({
    slug: "french-drain-calculator", title: "French Drain Calculator (Gravel, Pipe & Fabric)",
    desc: "Calculate the materials for a French drain — tons and yards of drainage gravel, perforated pipe and filter fabric — from the trench length, width and depth.",
    inputs: [num("length", "Drain Length", 50, 10000, 1, 0, "ft"), num("trenchWidth", "Trench Width", 12, 36, 1, 4, "in"), num("trenchDepth", "Trench Depth", 18, 60, 1, 6, "in"), num("pipeDiameter", "Pipe Diameter", 4, 8, 1, 0, "in"), usd("gravelPerTon", "Gravel Price per Ton", 45, 500, 1), usd("pipePerFoot", "Pipe Price per Ft", 1, 20, 0.05)],
    results: [["gravelTons", "Drainage Gravel (tons)", "n"], ["gravelCuYd", "Gravel (cu yd)", "n"], ["pipeFeet", "Perforated Pipe (ft)", "n"], ["fabricSqFt", "Filter Fabric (sq ft)", "n"], ["cost", "Material Cost", "c"]],
    fn: E.frenchDrain, ex: { length: 50, trenchWidth: 12, trenchDepth: 18, pipeDiameter: 4, gravelPerTon: 45, pipePerFoot: 1 },
    exText: (o) => `Example: a 50 ft French drain 12 in wide and 18 in deep with 4 in pipe needs about ${o.gravelTons} tons of gravel, ${o.pipeFeet} ft of pipe and ${o.fabricSqFt} sq ft of fabric.`,
    how: "Dig the trench with a fall of at least 1 in per 8 ft (1%) to a daylight outlet or dry well. Line it with fabric, add 2 in of washed 3/4–1.5 in gravel, lay the pipe holes-down, fill with gravel and wrap the fabric over the top.",
    assume: "Gravel volume = trench volume − pipe volume; washed drain rock ≈ 1.4 tons per cu yd. Fabric wraps the trench with 15% overlap. Pipe +5% for fittings.",
    faq: [["What size gravel for a French drain?", "Washed 3/4 to 1.5 in clean stone — no fines."]],
  }),
  mk({
    slug: "playground-mulch-calculator", title: "Playground Mulch Calculator (Rubber Mulch & Wood Chips)",
    desc: "Calculate playground surfacing — engineered wood fiber, wood chips, rubber mulch, pea gravel or sand — in cubic yards, bags and tons at the CPSC-recommended depth.",
    inputs: [num("length", "Play Area Length", 30, 1000, 0.5, 0, "ft"), num("width", "Play Area Width", 20, 1000, 0.5, 0, "ft"), dd("surface", "Surface", E.PLAY_SURFACES), num("depth", "Depth (0 = recommended)", 0, 24, 0.5, 0, "in"), usd("pricePerYard", "Price per Cubic Yard", 40, 1000, 1)],
    results: [["cubicYards", "Material (cu yd)", "n"], ["recommendedDepthIn", "Recommended Depth (in)", "n"], ["bags", "Bags", "n"], ["tons", "Weight (tons)", "n"], ["cost", "Material Cost", "c"]],
    fn: E.playgroundMulch, ex: { length: 30, width: 20, surface: 0, depth: 0, pricePerYard: 40 },
    exText: (o) => `Example: a 30 × 20 ft play area with engineered wood fiber at ${o.recommendedDepthIn} in needs about ${o.cubicYards} cu yd.`,
    how: "The use zone extends at least 6 ft beyond the equipment on every side. Loose-fill surfaces compress — install 12 in of wood fiber or chips so it stays at least 9 in deep, and rake it back under swings and slides.",
    assume: "CPSC Public Playground Safety Handbook: 12 in initial depth for wood chips and engineered wood fiber, 6 in for shredded rubber; sand and pea gravel are not recommended for fall heights over about 4–5 ft. Bag sizes: wood 2 cu ft, rubber 0.8 cu ft, gravel/sand 0.5 cu ft.",
    faq: [["How deep should playground mulch be?", "12 in of wood fiber or chips (maintained at 9 in), or 6 in of rubber mulch."]],
  }),
  mk({
    slug: "gravel-cost-calculator", title: "Gravel Cost Calculator (Price per Ton & Delivery)",
    desc: "Estimate what gravel will cost — pea gravel, #57 stone, river rock, crusher run, decorative gravel or DG — from the area and depth, with delivery and installation.",
    inputs: [num("length", "Area Length", 40, 10000, 0.5, 0, "ft"), num("width", "Area Width", 12, 10000, 0.5, 0, "ft"), num("depth", "Depth", 3, 24, 0.5, 0.5, "in"), dd("gravel", "Gravel Type", E.GRAVEL_TYPES), usd("customPricePerTon", "Your Price per Ton (0 = typical)", 0, 1000, 1), usd("delivery", "Delivery", 100, 2000, 5), usd("installPerSqFt", "Installation per Sq Ft (0 = DIY)", 0, 10, 0.05)],
    results: [["totalCost", "Total Cost", "c"], ["tons", "Gravel (tons)", "n"], ["materialCost", "Gravel Cost", "c"], ["laborCost", "Installation", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.gravelCost, ex: { length: 40, width: 12, depth: 3, gravel: 1, customPricePerTon: 0, delivery: 100, installPerSqFt: 0 },
    exText: (o) => `Example: a 40 × 12 ft gravel driveway topped with 3 in of #57 stone needs ${o.tons} tons and costs about ${money(o.totalCost)} delivered.`,
    how: "Enter the area, depth and gravel type. Bulk prices depend on how close the quarry is; delivery is often a flat fee per load.",
    assume: `Typical prices per ton: pea gravel $45, #57 stone $40, river rock $80, crusher run $30, decorative $100, DG $55; ≈ 1.4 tons per cu yd. ${COST_NOTE}`,
    faq: [["How much does a ton of gravel cost?", "About $25–60 for common crushed stone and $80–200 for decorative rock."]],
  }),
  mk({
    slug: "artificial-turf-calculator", title: "Artificial Turf Calculator (Rolls, Infill, Seams & Base)",
    desc: "Work out how much artificial grass to order — roll lengths for 15 or 12 ft rolls, infill bags, seam tape, nails and base rock — from your lawn's length and width.",
    inputs: [num("length", "Area Length", 30, 1000, 0.5, 0, "ft"), num("width", "Area Width", 20, 1000, 0.5, 0, "ft"), dd("rollWidth", "Roll Width", ["15 ft", "12 ft"]), num("infillPerSqFt", "Infill Rate", 2, 4, 0.25, 0, "lb/sq ft")],
    results: [["turfSqFt", "Turf to Order (sq ft)", "n"], ["rollLinearFeet", "Roll Length (linear ft)", "n"], ["strips", "Strips", "n"], ["infillBags", "Infill (50 lb bags)", "n"], ["infillLb", "Infill (lb)", "n"], ["seamFeet", "Seam Tape (ft)", "n"], ["nails", "Landscape Nails", "n"], ["baseTons", "Base Rock / DG (tons, 3 in)", "n"]],
    fn: E.artificialTurf, ex: { length: 30, width: 20, rollWidth: 0, infillPerSqFt: 2 },
    exText: (o) => `Example: a 30 × 20 ft lawn with 15 ft rolls needs ${o.strips} strips — ${n2(o.turfSqFt)} sq ft of turf — plus ${o.infillBags} bags of infill and ${o.seamFeet} ft of seam tape.`,
    how: "Lay the strips in the same direction so the blades lean the same way. Order extra length (about 6 in per strip) for trimming. Base: excavate 3–4 in, compact crushed rock or DG, then lay turf and brush in infill.",
    assume: "Turf ordered = strips × roll width × (length + 0.5 ft). Infill 1.5–3 lb per sq ft of silica sand; nails every 6 in around the edge and on a 2 ft grid. Base ≈ 1.4 tons per cu yd.",
    faq: [["How much infill does artificial grass need?", "About 1.5–3 lb per sq ft — 2 lb is common for landscape turf."]],
  }),
  mk({
    slug: "decomposed-granite-calculator", title: "Decomposed Granite Calculator (DG Tons & Stabilizer)",
    desc: "Calculate decomposed granite for paths and patios — tons, cubic yards and bags with compaction — plus stabilizer for stabilized DG.",
    inputs: [SHAPE, LEN(30), WID(4), num("depth", "Compacted Depth", 3, 12, 0.5, 1, "in"), dd("stabilized", "Stabilized DG?", ["No", "Yes"]), usd("pricePerTon", "Price per Ton", 55, 500, 1)],
    results: [["tons", "DG (tons)", "n"], ["cubicYards", "Cubic Yards (loose)", "n"], ["bags", "0.5 cu ft Bags", "n"], ["stabilizerLb", "Stabilizer (lb)", "n"], ["cost", "DG Cost", "c"]],
    fn: E.decomposedGranite, ex: { shape: 0, length: 30, width: 4, depth: 3, stabilized: 0, pricePerTon: 55 },
    exText: (o) => `Example: a 30 ft × 4 ft path of DG compacted to 3 in needs about ${o.tons} tons.`,
    how: "Use 2–3 in for paths and 3–4 in for patios, over landscape fabric and a compacted subgrade. Wet and compact DG in 1–2 in lifts. Stabilized DG (with a binder) holds up better on slopes.",
    assume: "DG ≈ 1.3 tons per cu yd, plus 15% for compaction. Stabilizer ≈ 12 lb per ton (check the product).",
    faq: [["How much decomposed granite do I need per square foot?", "About 0.02 tons (40 lb) per sq ft at 3 in compacted."]],
  }),
  mk({
    slug: "trenching-cost-calculator", title: "Trenching Cost Calculator (Per Foot)",
    desc: "Estimate the cost to dig a trench for irrigation, electrical conduit, water or gas lines or a French drain — by length, depth and soil — and compare with renting a trencher.",
    inputs: [num("length", "Trench Length", 100, 100000, 1, 0, "ft"), num("depth", "Depth", 24, 120, 1, 6, "in"), dd("use", "Purpose", E.TRENCH_USES), dd("soil", "Soil", ["Normal soil", "Clay / hard soil", "Rocky"]), usd("rentalPerDay", "Trencher Rental per Day", 150, 1000, 5)],
    results: [["totalCost", "Professional Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["diyRentalCost", "DIY Trencher Rental", "c"], ["costPerFoot", "Cost per Foot", "c"]],
    fn: E.trenchingCost, ex: { length: 100, depth: 24, use: 2, soil: 0, rentalPerDay: 150 },
    exText: (o) => `Example: trenching 100 ft at 24 in for a water line costs about ${money(o.totalCost)}, or about ${money(o.diyRentalCost)} to rent a trencher yourself.`,
    how: "Call 811 before you dig so buried utilities get marked. Water lines must go below the frost line; electrical burial depth depends on the conduit type (often 18–24 in).",
    assume: `Typical prices per foot at 24 in: $5 irrigation, $8 conduit, $10 water/gas, $12 French drain; deeper trenches cost proportionally more, clay +20%, rock +50%; $300 minimum. ${COST_NOTE}`,
    faq: [["How much does trenching cost per foot?", "About $4–12 per foot for typical residential trenches."]],
  }),
  mk({
    slug: "land-grading-cost-calculator", title: "Land Grading Cost Calculator (Yard Leveling)",
    desc: "Estimate the cost of grading or leveling a yard — fine grading, rough grading or regrading for drainage — with fill dirt and equipment mobilization.",
    inputs: [num("area", "Area", 5000, 10000000, 10, 0, "sq ft"), dd("grading", "Type of Grading", E.GRADING_TYPES), num("fillYards", "Fill Dirt Needed", 0, 10000, 1, 0, "cu yd"), usd("fillPerYard", "Fill Price per Yard (delivered)", 25, 200, 1), usd("mobilization", "Equipment Mobilization", 300, 5000, 25)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.landGradingCost, ex: { area: 5000, grading: 2, fillYards: 10, fillPerYard: 25, mobilization: 300 },
    exText: (o) => `Example: regrading a 5,000 sq ft yard for drainage with 10 yards of fill costs about ${money(o.totalCost)}.`,
    how: "Grade the ground to fall at least 6 in over the first 10 ft away from the foundation. Large earth moving may need a permit and a drainage plan.",
    assume: `Typical prices per sq ft: fine grading $0.50, rough grading $1, regrading/slope correction $2. ${COST_NOTE}`,
    faq: [["How much does it cost to grade a yard?", "About $0.40–2 per sq ft — $1,000–5,000 for a typical yard."]],
  }),
  mk({
    slug: "french-drain-cost-calculator", title: "French Drain Cost Calculator",
    desc: "Estimate the cost to install a French drain — yard, foundation or interior basement drains — per linear foot, with an optional sump pump and DIY material cost.",
    inputs: [num("length", "Drain Length", 60, 10000, 1, 0, "ft"), dd("type", "Drain Type", E.FRENCH_TYPES), usd("customRate", "Your Price per Foot (0 = typical)", 0, 500, 1), dd("sumpPump", "Add a Sump Pump?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["diyMaterialCost", "DIY Materials Only", "c"], ["costPerFoot", "Cost per Foot", "c"]],
    fn: E.frenchDrainCost, ex: { length: 60, type: 0, customRate: 0, sumpPump: 0 },
    exText: (o) => `Example: a 60 ft yard French drain costs about ${money(o.totalCost)} installed; materials alone are about ${money(o.diyMaterialCost)}.`,
    how: "Pick the drain type. Exterior drains along a foundation are deeper and slower to dig; interior drains require breaking and patching the basement slab and usually a sump pump.",
    assume: `Typical installed prices per foot: yard $25, foundation $45, interior basement $70; sump pump about $1,500 installed. ${COST_NOTE}`,
    faq: [["How much does a French drain cost?", "About $10–50 per foot outdoors and $40–100 per foot inside a basement."]],
  }),
  mk({
    slug: "mulch-installation-cost-calculator", title: "Mulch Installation Cost Calculator",
    desc: "Estimate the cost to have mulch installed — cubic yards needed, bulk mulch, labor, delivery and bed edging — from your bed area and depth.",
    inputs: [num("area", "Bed Area", 600, 1000000, 1, 0, "sq ft"), num("depth", "Mulch Depth", 3, 6, 0.5, 1, "in"), usd("pricePerYard", "Mulch Price per Yard", 40, 300, 1), usd("laborPerYard", "Labor per Yard Installed", 50, 300, 1), usd("delivery", "Delivery", 75, 1000, 5), num("edgingFeet", "Bed Edging", 0, 10000, 1, 0, "ft")],
    results: [["totalCost", "Estimated Cost", "c"], ["cubicYards", "Mulch (cu yd)", "n"], ["materialCost", "Mulch Cost", "c"], ["laborCost", "Labor (incl. edging)", "c"]],
    fn: E.mulchInstallationCost, ex: { area: 600, depth: 3, pricePerYard: 40, laborPerYard: 50, delivery: 75, edgingFeet: 0 },
    exText: (o) => `Example: 600 sq ft of beds at 3 in takes ${o.cubicYards} cu yd of mulch and costs about ${money(o.totalCost)} installed.`,
    how: "Enter the bed area and depth. Use 2–3 in for refreshing beds and 3–4 in for new beds; keep mulch a few inches away from tree trunks and stems.",
    assume: `Typical prices: bulk mulch $30–60 per yard, installation $40–70 per yard, edging about $2 per ft. ${COST_NOTE}`,
    faq: [["How much does mulch installation cost?", "About $80–130 per cubic yard installed."]],
  }),
  mk({
    slug: "flagstone-calculator", title: "Flagstone Calculator (Tons, Base & Sand)",
    desc: "Calculate how much flagstone you need for a patio or path — tons by thickness, coverage per ton, gravel base and bedding sand — with stone cost.",
    inputs: [num("area", "Patio Area", 200, 100000, 1, 0, "sq ft"), dd("thickness", "Flagstone Thickness", ["1–1.5 in (thin, mortar set)", "1.5–2.5 in (standard)", "2–3 in (heavy, dry set)"], 1), pct("waste", "Waste / Cuts", 10, 30), usd("pricePerTon", "Price per Ton", 350, 3000, 5)],
    results: [["tons", "Flagstone (tons)", "n"], ["sqFtPerTon", "Coverage per Ton (sq ft)", "n"], ["baseTons", "Gravel Base (tons, 4 in)", "n"], ["sandTons", "Bedding Sand (tons, 1 in)", "n"], ["cost", "Stone Cost", "c"]],
    fn: E.flagstone, ex: { area: 200, thickness: 1, waste: 10, pricePerTon: 350 },
    exText: (o) => `Example: a 200 sq ft patio of standard 1.5–2.5 in flagstone needs about ${o.tons} tons — each ton covers about ${o.sqFtPerTon} sq ft.`,
    how: "Pick the thickness: thin flagstone needs a concrete slab and mortar; thicker stone can be dry-laid on 4 in of compacted base and 1 in of sand. Add 10–15% for irregular pieces.",
    assume: "Coverage per ton: ≈ 140 sq ft (1–1.5 in), 90 (1.5–2.5 in), 70 (2–3 in). Base ≈ 1.4 tons per cu yd with 20% compaction; sand ≈ 1.35.",
    faq: [["How many square feet does a ton of flagstone cover?", "About 80–150 sq ft depending on thickness."]],
  }),
  mk({
    slug: "gabion-calculator", title: "Gabion Stone Calculator (Baskets, Stone & Cost)",
    desc: "Calculate gabion baskets and fill stone for a gabion wall — number of baskets, tons of stone and cubic yards — with the cost of stone and baskets.",
    inputs: [num("length", "Wall Length", 30, 10000, 0.5, 0, "ft"), num("height", "Wall Height", 3, 20, 0.5, 0, "ft"), num("depth", "Wall Depth", 3, 10, 0.5, 0.5, "ft"), num("basketLength", "Basket Length", 6, 12, 0.5, 1, "ft"), num("basketHeight", "Basket Height", 3, 3, 0.5, 0.5, "ft"), num("basketDepth", "Basket Depth", 3, 6, 0.5, 0.5, "ft"), usd("stonePerTon", "Stone Price per Ton", 60, 500, 1), usd("basketPrice", "Price per Basket", 120, 2000, 1)],
    results: [["stoneTons", "Fill Stone (tons)", "n"], ["baskets", "Baskets", "n"], ["cubicYards", "Wall Volume (cu yd)", "n"], ["cost", "Stone + Basket Cost", "c"]],
    fn: E.gabion, ex: { length: 30, height: 3, depth: 3, basketLength: 6, basketHeight: 3, basketDepth: 3, stonePerTon: 60, basketPrice: 120 },
    exText: (o) => `Example: a 30 ft gabion wall 3 ft high and 3 ft deep uses ${o.baskets} baskets (6 × 3 × 3 ft) and about ${o.stoneTons} tons of stone.`,
    how: "Enter the wall size and basket size. Fill baskets with 4–8 in hard, angular stone, placing the best faces at the front and tying internal bracing wires every foot of height.",
    assume: "Fill ≈ 1.4 tons per cu yd of basket (≈ 35% voids). Tall or retaining gabion walls need an engineered design.",
    faq: [["How much stone fills a gabion basket?", "About 1.4 tons per cubic yard of basket — a 6 × 3 × 3 ft basket takes about 2.8 tons."]],
  }),
  mk({
    slug: "sandbox-sand-calculator", title: "Sandbox Sand Calculator (Bags & Pounds)",
    desc: "Find how much play sand you need to fill a sandbox — 50 lb bags, cubic feet, pounds and tons — for a square, rectangular or round sandbox.",
    inputs: [SHAPE, LEN(4), WID(4), num("depth", "Sand Depth", 9, 24, 0.5, 1, "in")],
    results: [["bags", "50 lb Bags", "n"], ["cubicFeet", "Cubic Feet", "n"], ["pounds", "Pounds", "n"], ["tons", "Tons", "n"]],
    fn: E.sandboxSand, ex: { shape: 0, length: 4, width: 4, depth: 9 },
    exText: (o) => `Example: a 4 × 4 ft sandbox filled 9 in deep needs ${o.cubicFeet} cu ft — ${o.bags} bags of 50 lb play sand.`,
    how: "Fill sandboxes 6–12 in deep, leaving a few inches below the rim. Use washed play sand, put landscape fabric at the bottom and cover the box when it's not in use.",
    assume: "Play sand ≈ 100 lb per cu ft; a 50 lb bag ≈ 0.5 cu ft.",
    faq: [["How many bags of sand for a 4×4 sandbox?", "About 24 bags of 50 lb at 9 in deep."]],
  }),
  mk({
    slug: "backfill-calculator", title: "Backfill Calculator (Around Foundations, Pipes & Tanks)",
    desc: "Calculate how much backfill you need around a foundation, tank, pipe or wall — excavated volume minus the structure, with compaction — in cubic yards, tons and truck loads.",
    inputs: [num("digLength", "Excavation Length", 40, 10000, 0.5, 0, "ft"), num("digWidth", "Excavation Width", 4, 1000, 0.5, 0, "ft"), num("digDepth", "Excavation Depth", 8, 100, 0.5, 0, "ft"), num("structLength", "Structure Length (0 if none)", 40, 10000, 0.5, 0, "ft"), num("structWidth", "Structure Width / Thickness", 0.67, 1000, 0.01, 0, "ft"), num("structHeight", "Structure Height in the Hole", 8, 100, 0.5, 0, "ft"), pct("compaction", "Compaction Allowance", 20, 50), dd("material", "Backfill Material", ["Soil", "Gravel / crushed stone"])],
    results: [["cubicYards", "Backfill (cu yd, loose)", "n"], ["tons", "Weight (tons)", "n"], ["truckLoads", "10-Yard Truck Loads", "n"]],
    fn: E.backfill, ex: { digLength: 40, digWidth: 4, digDepth: 8, structLength: 40, structWidth: 0.67, structHeight: 8, compaction: 20, material: 1 },
    exText: (o) => `Example: backfilling a 40 ft × 4 ft × 8 ft over-dig around an 8 in foundation wall takes about ${o.cubicYards} cu yd of gravel with 20% compaction.`,
    how: "Enter the size of the hole and of whatever sits in it (a foundation wall, tank or pipe run). Backfill in 6–12 in lifts and compact each one; free-draining gravel against foundations reduces water pressure.",
    assume: "Backfill = (excavated volume − structure volume) × (1 + compaction). Soil ≈ 1.3 and gravel ≈ 1.4 tons per cu yd.",
    faq: [["How much extra backfill should I order for compaction?", "About 15–25% more than the hole volume."]],
  }),
  mk({
    slug: "landscape-fabric-calculator", title: "Landscape Fabric Calculator (Rolls & Staples)",
    desc: "Work out how much landscape fabric to buy — strips, linear feet and rolls with overlap — and how many landscape staples you need for a garden bed or under rock.",
    inputs: [num("length", "Bed Length", 40, 10000, 0.5, 0, "ft"), num("width", "Bed Width", 6, 1000, 0.5, 0, "ft"), num("overlap", "Overlap Between Strips", 6, 24, 1, 0, "in"), dd("roll", "Roll Size", ["3 × 50 ft", "4 × 100 ft", "6 × 100 ft", "3 × 100 ft"])],
    results: [["rolls", "Rolls", "n"], ["strips", "Strips", "n"], ["linearFeet", "Fabric (linear ft)", "n"], ["staples", "Landscape Staples", "n"]],
    fn: E.landscapeFabric, ex: { length: 40, width: 6, overlap: 6, roll: 0 },
    exText: (o) => `Example: a 40 × 6 ft bed with 3 ft rolls needs ${o.strips} strips — ${o.linearFeet} ft, ${o.rolls} roll(s) of 3 × 50 ft — and about ${o.staples} staples.`,
    how: "Overlap strips by 6–12 in and pin the seams and edges every 1–2 ft, plus every 3 ft across the bed. Cut X-shaped slits to plant through it, then cover with mulch or rock.",
    assume: "Strips = (width − overlap) ÷ (roll width − overlap), rounded up; 1 ft extra length per strip. Staples: one per 3 sq ft plus the perimeter.",
    faq: [["Should landscape fabric overlap?", "Yes — 6 to 12 in at every seam."]],
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
