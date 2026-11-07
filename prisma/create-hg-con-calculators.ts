// One-time (but safe to re-run) batch setup script: creates 28 calculators in House & Garden
// Calculators > Concrete, Masonry & Paving Calculators (pavers, patios, concrete, walls, footings,
// driveways and masonry repair costs). Formulas live in src/lib/calc-engine-hg-con.ts; examples are
// computed from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-con-calculators.ts
// or
//   npm run db:create-hg-con-calculators

import * as E from "../src/lib/calc-engine-hg-con";

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

const CAT = "concrete-masonry-paving-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US installed costs and vary a lot by region, access and season — use them to budget, then get at least two local quotes.";
const STORIES = ["One story", "Two stories", "Three or more"];

const TOOLS: ToolDef[] = [
  mk({
    slug: "paver-calculator", title: "Paver Calculator (Pavers, Base & Sand)",
    desc: "Work out how many pavers you need for a patio, walkway or driveway — plus the gravel base and bedding sand in cubic yards and tons, edge restraint and paver cost.",
    meta: "Paver Calculator — How Many Pavers, Base Gravel & Sand",
    inputs: [num("length", "Patio Length", 20, 1000, 0.5, 0, "ft"), num("width", "Patio Width", 12, 1000, 0.5, 0, "ft"), num("paverLength", "Paver Length", 8, 48, 0.25, 1, "in"), num("paverWidth", "Paver Width", 4, 48, 0.25, 1, "in"), num("joint", "Joint Width", 0.125, 1, 0.0625, 0, "in"), pct("waste", "Waste / Cuts", 10, 30), num("baseDepth", "Gravel Base Depth", 4, 18, 0.5, 0, "in"), num("sandDepth", "Bedding Sand Depth", 1, 3, 0.25, 0, "in"), usd("pricePerPaver", "Price per Paver", 0.75, 100, 0.01)],
    results: [["pavers", "Pavers Needed", "n"], ["area", "Patio Area (sq ft)", "n"], ["paversPerSqFt", "Pavers per Sq Ft", "n"], ["baseTons", "Gravel Base (tons)", "n"], ["baseCuYd", "Gravel Base (cu yd)", "n"], ["sandTons", "Bedding Sand (tons)", "n"], ["sandCuYd", "Bedding Sand (cu yd)", "n"], ["edgeFeet", "Edge Restraint (ft)", "n"], ["paverCost", "Paver Cost", "c"]],
    fn: E.paver, ex: { length: 20, width: 12, paverLength: 8, paverWidth: 4, joint: 0.125, waste: 10, baseDepth: 4, sandDepth: 1, pricePerPaver: 0.75 },
    exText: (o) => `Example: a 20 × 12 ft patio of 4 × 8 in pavers needs about ${n2(o.pavers)} pavers with 10% extra, ${o.baseTons} tons of gravel base (4 in) and ${o.sandTons} ton(s) of bedding sand.`,
    how: "Enter the patio size, the paver size from the pallet label and the joint width. Use 4 in of compacted base for walkways and patios, 6 in for heavy use and 8–12 in for driveways, with 1 in of bedding sand on top.\n\nAdd 5% waste for straight layouts and 10–15% for herringbone, curves or many cuts.",
    assume: "Base volume includes a 20% compaction allowance; crushed gravel base ≈ 1.4 tons per cu yd and sand ≈ 1.35 tons per cu yd. Edge restraint is the full perimeter (subtract any side against the house).",
    faq: [["How many pavers are in a square foot?", "4 × 8 in pavers: about 4.5 per sq ft; 6 × 6 in: 4; 12 × 12 in: 1."], ["How deep should a paver base be?", "4–6 in for patios and walkways, 8–12 in for driveways, plus 1 in of sand."]],
  }),
  mk({
    slug: "paver-base-calculator", title: "Paver Base Calculator (Gravel Tons & Bags)",
    desc: "Calculate the crushed-gravel base for pavers or a patio — loose cubic yards and tons with compaction, 50 lb bags for small jobs, and cost per ton.",
    inputs: [num("length", "Area Length", 15, 1000, 0.5, 0, "ft"), num("width", "Area Width", 10, 1000, 0.5, 0, "ft"), num("depth", "Base Depth (compacted)", 6, 24, 0.5, 1, "in"), pct("compaction", "Compaction Allowance", 20, 50), usd("pricePerTon", "Price per Ton", 45, 500, 1)],
    results: [["baseTons", "Base Gravel (tons)", "n"], ["baseCuYd", "Loose Volume (cu yd)", "n"], ["area", "Area (sq ft)", "n"], ["bags50lb", "50 lb Bags (small jobs)", "n"], ["cost", "Gravel Cost", "c"]],
    fn: E.paverBase, ex: { length: 15, width: 10, depth: 6, compaction: 20, pricePerTon: 45 },
    exText: (o) => `Example: a 15 × 10 ft patio with a 6 in compacted base needs about ${o.baseTons} tons (${o.baseCuYd} cu yd loose) of crushed gravel.`,
    how: "Enter the area and the compacted depth you want. Gravel shrinks when you compact it, so order 15–20% more than the finished volume. Compact in 2–3 in lifts with a plate compactor.",
    assume: "Crushed stone base (3/4 in minus, road base or Class 5) ≈ 1.4 tons per loose cu yd. Bags assume 50 lb each — for anything over a few square yards, bulk delivery is far cheaper.",
    faq: [["What gravel is best under pavers?", "3/4 in minus crushed stone (with fines) that compacts hard — not round pea gravel."]],
  }),
  mk({
    slug: "polymeric-sand-calculator", title: "Polymeric Sand Calculator (Paver Joint Sand)",
    desc: "Estimate how many bags of polymeric or paver joint sand you need from the patio area, paver size and joint width and depth — with pounds and coverage per bag.",
    inputs: [num("area", "Paved Area", 240, 100000, 1, 0, "sq ft"), num("paverLength", "Paver Length", 8, 48, 0.25, 1, "in"), num("paverWidth", "Paver Width", 4, 48, 0.25, 1, "in"), num("jointWidth", "Joint Width", 0.25, 2, 0.0625, 0, "in"), num("jointDepth", "Joint Depth (paver thickness)", 2.375, 6, 0.125, 0, "in"), num("bagWeight", "Bag Weight", 50, 80, 1, 1, "lb")],
    results: [["bags", "Bags Needed", "n"], ["pounds", "Sand (lb)", "n"], ["jointLinearFeet", "Joint Length (ft)", "n"], ["sqFtPerBag", "Coverage per Bag (sq ft)", "n"]],
    fn: E.polymericSand, ex: { area: 240, paverLength: 8, paverWidth: 4, jointWidth: 0.25, jointDepth: 2.375, bagWeight: 50 },
    exText: (o) => `Example: 240 sq ft of 4 × 8 in pavers with 1/4 in joints needs about ${o.bags} bags (${o.pounds} lb) of polymeric sand.`,
    how: "Enter the area and paver size. Small pavers and wide joints use much more sand. Sweep the sand in dry, compact, top up, then mist with water as the bag directs.",
    assume: "Joint length per sq ft = 12 ÷ paver length + 12 ÷ paver width; sand ≈ 90 lb per cu ft of joint plus 10% for spillage. Brand coverage charts (e.g. Dominator, Techniseal, Alliance) vary with joint size.",
    faq: [["How much polymeric sand do I need per square foot?", "Roughly 0.1–0.3 lb per sq ft for narrow joints; wide joints and small pavers need more."]],
  }),
  mk({
    slug: "patio-slab-calculator", title: "Patio Slab Calculator (Paving Slabs, Sub-Base & Mortar)",
    desc: "Work out how many paving slabs you need for a patio in metres — plus MOT Type 1 sub-base tonnes, sharp sand and cement bags for a full mortar bed.",
    meta: "Patio Slab Calculator — How Many Paving Slabs Do I Need?",
    inputs: [num("length", "Patio Length", 5, 100, 0.1, 0, "m"), num("width", "Patio Width", 4, 100, 0.1, 0, "m"), dd("slabSize", "Slab Size", ["600 × 600 mm", "600 × 900 mm", "450 × 450 mm", "300 × 600 mm", "900 × 900 mm", "400 × 400 mm"]), num("joint", "Joint Width", 10, 30, 1, 0, "mm"), pct("waste", "Waste / Cuts", 5, 30), num("subBaseDepth", "Sub-Base Depth (MOT Type 1)", 100, 300, 5, 0, "mm"), num("beddingDepth", "Mortar Bed Depth", 40, 75, 5, 0, "mm")],
    results: [["slabs", "Slabs Needed", "n"], ["area", "Patio Area (m²)", "n"], ["subBaseTonnes", "MOT Type 1 (tonnes)", "n"], ["sharpSandTonnes", "Sharp Sand (tonnes)", "n"], ["cementBags", "Cement (25 kg bags)", "n"]],
    fn: E.patioSlab, ex: { length: 5, width: 4, slabSize: 0, joint: 10, waste: 5, subBaseDepth: 100, beddingDepth: 40 },
    exText: (o) => `Example: a 5 × 4 m patio of 600 × 600 mm slabs needs about ${o.slabs} slabs, ${o.subBaseTonnes} tonnes of MOT Type 1 and ${o.sharpSandTonnes} tonnes of sharp sand with ${o.cementBags} bags of cement.`,
    how: "Enter the patio size in metres and pick the slab size. Lay a 100 mm compacted MOT Type 1 sub-base (150 mm on soft ground), then bed each slab on a full 4:1 sharp sand and cement mortar bed — not dabs.\n\nAllow a fall of about 1:60 away from the house.",
    assume: "MOT Type 1 ≈ 2.1 t/m³ compacted; mortar bed 4:1 sharp sand : cement by volume (dry materials ≈ 1.3 × the wet bed volume), sharp sand ≈ 1.6 t/m³, cement 25 kg bags. Pointing mortar is extra.",
    faq: [["How many 600 × 600 slabs per square metre?", "About 2.6 with 10 mm joints."]],
  }),
  mk({
    slug: "patio-size-calculator", title: "Patio Size Calculator (How Big Should My Patio Be?)",
    desc: "Find a comfortable patio size for your furniture and uses — dining table, lounge set, grill, fire pit and hot tub — with suggested dimensions and the slope drop away from the house.",
    inputs: [num("people", "People Who Use It Regularly", 4, 40, 1, 1), dd("dining", "Dining Area", ["None", "4-seat table", "6-seat table", "8-seat table"], 2), dd("lounge", "Lounge Seating", ["None", "Two chairs", "Sofa set"], 1), dd("grill", "Grill Station", ["No", "Yes"], 1), dd("firePit", "Fire Pit Area", ["No", "Yes"]), dd("hotTub", "Hot Tub", ["No", "Yes"]), num("patioDepth", "Patio Depth Away From House", 12, 60, 0.5, 0, "ft"), num("slopePerFoot", "Slope per Foot", 0.25, 0.5, 0.0625, 0, "in")],
    results: [["recommendedArea", "Recommended Area (sq ft)", "n"], ["suggestedDepthFt", "Suggested Depth (ft)", "n"], ["suggestedWidthFt", "Suggested Width (ft)", "n"], ["slopeDropInches", "Total Slope Drop (in)", "n"]],
    fn: E.patioSize, ex: { people: 4, dining: 2, lounge: 1, grill: 1, firePit: 0, hotTub: 0, patioDepth: 12, slopePerFoot: 0.25 },
    exText: (o) => `Example: a 6-seat dining table, two lounge chairs and a grill need about ${o.recommendedArea} sq ft — roughly ${o.suggestedDepthFt} × ${o.suggestedWidthFt} ft. A 12 ft deep patio should drop about ${o.slopeDropInches} in from the house.`,
    how: "Pick what you want on the patio. Each zone includes room to pull out chairs and walk around (about 3 ft of clearance). Slope the patio 1/8–1/4 in per foot away from the house so water drains.",
    assume: "Zone allowances: dining 100 / 144 / 196 sq ft for 4 / 6 / 8 seats, lounge 80–140 sq ft, grill 40, fire pit circle 150, hot tub 90; at least 25 sq ft per person.",
    faq: [["How big should a patio be for a table for 6?", "About 12 × 12 ft for the table and chairs alone."], ["How much slope does a patio need?", "1/8 to 1/4 in per foot (about 1–2%) away from the house."]],
  }),
  mk({
    slug: "dry-pour-concrete-calculator", title: "Dry Pour Concrete Calculator (Bags for Post Holes)",
    desc: "Work out how many bags of concrete to dry-pour into fence or deck post holes — 40, 60 or 80 lb bags, bags per hole and the water to add — plus small slabs.",
    inputs: [num("holes", "Number of Holes", 10, 1000, 1), num("holeDiameter", "Hole Diameter", 10, 36, 0.5, 2, "in"), num("holeDepth", "Hole Depth", 36, 120, 1, 6, "in"), num("postSize", "Post Width (0 if none)", 3.5, 12, 0.5, 0, "in"), num("slabArea", "Small Slab Area (optional)", 0, 1000, 1, 0, "sq ft"), num("slabThickness", "Slab Thickness", 4, 8, 0.5, 2, "in"), dd("bagSize", "Bag Size", ["40 lb", "60 lb", "80 lb"], 2)],
    results: [["bags", "Bags Needed", "n"], ["cubicFeet", "Concrete (cu ft)", "n"], ["bagsPerHole", "Bags per Hole", "n"], ["waterGallons", "Water to Add (gal)", "n"]],
    fn: E.dryPourConcrete, ex: { holes: 10, holeDiameter: 10, holeDepth: 36, postSize: 3.5, slabArea: 0, slabThickness: 4, bagSize: 2 },
    exText: (o) => `Example: ten 10 in × 36 in holes with 4 × 4 posts need about ${o.bags} bags of 80 lb concrete — ${o.bagsPerHole} bags per hole.`,
    how: "Set the post, pour the dry mix into the hole in layers, and soak each layer with water (about 1 gallon per 80 lb bag). Dry pouring works for fence posts; mix slabs and footings properly instead — dry-poured slabs are weak and crack.",
    assume: "Bag yields: 40 lb = 0.375 cu ft, 60 lb = 0.45, 80 lb = 0.60 cu ft. Includes 10% extra. Fast-setting post mixes yield about the same per bag.",
    faq: [["Can you pour concrete dry into a post hole?", "Yes for fence posts — add water as you fill. It's weaker than mixed concrete, so don't dry-pour footings or slabs."]],
  }),
  mk({
    slug: "concrete-countertop-calculator", title: "Concrete Countertop Calculator (Mix, Weight & Cost)",
    desc: "Calculate the concrete for a countertop — bags of countertop mix, weight, square footage — plus a backsplash, and compare DIY material cost with a professional install.",
    inputs: [num("length", "Countertop Length", 96, 600, 1, 1, "in"), num("depth", "Countertop Depth", 25.5, 60, 0.5, 1, "in"), num("thickness", "Thickness", 1.5, 4, 0.25, 0.75, "in"), num("cutout", "Sink / Cooktop Cutouts", 0, 5000, 10, 0, "sq in"), num("splashHeight", "Backsplash Height (0 if none)", 4, 24, 0.5, 0, "in"), num("splashThickness", "Backsplash Thickness", 0.75, 2, 0.25, 0, "in"), usd("bagPrice", "Price per 80 lb Bag", 28, 200, 0.5), usd("proPerSqFt", "Pro Install per Sq Ft", 100, 500, 1)],
    results: [["bags", "80 lb Bags of Countertop Mix", "n"], ["cubicFeet", "Concrete (cu ft)", "n"], ["weightLb", "Finished Weight (lb)", "n"], ["sqFt", "Countertop Area (sq ft)", "n"], ["diyMaterialCost", "DIY Material Cost (incl. sealer, form)", "c"], ["proCost", "Professional Cost", "c"]],
    fn: E.concreteCountertop, ex: { length: 96, depth: 25.5, thickness: 1.5, cutout: 0, splashHeight: 4, splashThickness: 0.75, bagPrice: 28, proPerSqFt: 100 },
    exText: (o) => `Example: an 8 ft × 25.5 in countertop 1.5 in thick with a 4 in backsplash needs about ${o.bags} bags of 80 lb countertop mix and weighs about ${o.weightLb} lb.`,
    how: "Enter the countertop size in inches. Standard depth is 25–25.5 in and thickness 1.5 in (2 in for long spans). Subtract sink and cooktop cutouts. Concrete is heavy (about 18 lb per sq ft at 1.5 in), so check your cabinets can carry it.",
    assume: "Countertop mix (e.g. Quikrete Countertop Mix) yields ≈ 0.6 cu ft per 80 lb bag; concrete ≈ 150 lb per cu ft. DIY cost adds about $6 per sq ft for form melamine, reinforcement and sealer. Pro prices typically run $75–150 per sq ft.",
    faq: [["How thick should a concrete countertop be?", "1.5 in is standard; 2 in for overhangs and long spans."], ["How much does a concrete countertop weigh?", "About 18–20 lb per sq ft at 1.5 in thick."]],
  }),
  mk({
    slug: "concrete-thickness-calculator", title: "Concrete Slab Thickness Calculator",
    desc: "Find the right concrete slab thickness for a sidewalk, patio, shed or hot tub pad, driveway, garage or RV pad — with reinforcement advice and the concrete volume.",
    inputs: [dd("use", "What the Slab Is For", E.THICKNESS_USES, 2), num("area", "Slab Area", 400, 100000, 1, 0, "sq ft")],
    results: [["recommendation", "Recommendation", "l", E.THICKNESS_NOTES], ["thicknessInches", "Thickness (in)", "n"], ["cubicYards", "Concrete at That Thickness (cu yd)", "n"], ["extraYardsPerInch", "Extra Concrete per Added Inch (cu yd)", "n"]],
    fn: E.concreteThickness, ex: { use: 2, area: 400 },
    exText: (o) => `Example: a 400 sq ft car driveway should be about ${o.thicknessInches} in thick — ${o.cubicYards} cu yd — and every extra inch adds ${o.extraYardsPerInch} cu yd.`,
    how: "Pick the use and enter the area. Thickness matters more than strength for most residential slabs; a properly compacted base and control joints matter just as much.",
    assume: "Typical residential guidance (ACI 332 and common practice): 4 in for foot traffic, 4–5 in for cars, 6–8 in for heavy vehicles. Local codes and soil conditions may require more.",
    faq: [["How thick should a concrete driveway be?", "4 in minimum, 5 in preferred for cars; 6 in or more for trucks and RVs."]],
  }),
  mk({
    slug: "anchor-epoxy-calculator", title: "Anchoring Epoxy Calculator (Rebar & Anchor Holes)",
    desc: "Estimate how many cartridges of anchoring epoxy you need to set rebar dowels or threaded rod — from hole and anchor diameter, embedment depth and number of holes.",
    inputs: [num("holes", "Number of Holes", 20, 10000, 1), num("holeDiameter", "Drilled Hole Diameter", 0.625, 2, 0.0625, 0.25, "in"), num("anchorDiameter", "Rebar / Rod Diameter", 0.5, 1.75, 0.0625, 0.125, "in"), num("embed", "Embedment Depth", 4.5, 30, 0.25, 1, "in"), num("cartridgeOz", "Cartridge Size", 10, 60, 0.5, 1, "fl oz"), pct("waste", "Waste Allowance", 15, 50)],
    results: [["cartridges", "Cartridges Needed", "n"], ["cubicInches", "Epoxy Needed (cu in)", "n"], ["cubicInchesPerHole", "Epoxy per Hole (cu in)", "n"], ["holesPerCartridge", "Holes per Cartridge", "n"]],
    fn: E.anchorEpoxy, ex: { holes: 20, holeDiameter: 0.625, anchorDiameter: 0.5, embed: 4.5, cartridgeOz: 10, waste: 15 },
    exText: (o) => `Example: twenty 1/2 in rebar dowels in 5/8 in holes 4.5 in deep need about ${o.cubicInches} cu in of epoxy — ${o.cartridges} 10 oz cartridge(s).`,
    how: "Enter the drill bit size, the anchor diameter and embedment from the engineer's or manufacturer's table (Hilti, Simpson, DeWalt). Fill holes about two-thirds full from the bottom so the anchor displaces the rest.",
    assume: "Annular volume = π/4 × (hole² − anchor²) × depth; 1 fl oz ≈ 1.805 cu in. Waste covers the first mix out of the nozzle and overfill. Always follow the product's hole-cleaning and cure-time instructions.",
    faq: [["What size hole for 1/2 in rebar epoxy?", "Usually 5/8 in (anchor diameter + 1/8 in) — check the product's installation table."]],
  }),
  mk({
    slug: "wire-mesh-calculator", title: "Concrete Wire Mesh Calculator (Sheets, Rolls & Weight)",
    desc: "Calculate welded wire mesh for a concrete slab — number of sheets or rolls with overlap, and the total weight for common 6×6 and 4×4 mesh gauges.",
    inputs: [num("length", "Slab Length", 20, 1000, 0.5, 0, "ft"), num("width", "Slab Width", 20, 1000, 0.5, 0, "ft"), dd("mesh", "Mesh Type", E.WIRE_MESH), dd("format", "Sold As", ["5 × 10 ft sheets", "5 × 150 ft rolls"])],
    results: [["pieces", "Sheets / Rolls Needed", "n"], ["weightLb", "Total Weight (lb)", "n"], ["area", "Slab Area (sq ft)", "n"], ["areaWithOverlap", "Mesh Area incl. Overlap (sq ft)", "n"]],
    fn: E.wireMesh, ex: { length: 20, width: 20, mesh: 0, format: 0 },
    exText: (o) => `Example: a 20 × 20 ft slab needs ${o.pieces} sheets of 6×6 W1.4 mesh (5 × 10 ft), about ${o.weightLb} lb in total.`,
    how: "Enter the slab size and mesh type. Overlap sheets by one full square (6 in) and lift the mesh into the middle of the slab on chairs — mesh lying on the ground does nothing.",
    assume: "Weights per 100 sq ft from WRI tables: 6×6 W1.4 21 lb, W2.1 30, W2.9 42, W4.0 58; 4×4 W1.4 31, W2.9 62. A 10% overlap allowance is added.",
    faq: [["What is 6x6 10/10 wire mesh?", "6 in squares of 10-gauge wire (W1.4) — the common light mesh for patios and sidewalks."]],
  }),
  mk({
    slug: "concrete-form-calculator", title: "Concrete Form Calculator (Form Boards, Stakes & Plywood)",
    desc: "Estimate concrete formwork — form contact area, 2×6 form boards, stakes, plywood sheets and form-release oil for slab edges, walls, footings and columns.",
    inputs: [dd("type", "Form Type", E.FORM_TYPES), num("length", "Total Form Length (or column height)", 60, 10000, 1, 0, "ft"), num("height", "Form Height", 6, 120, 0.5, 1, "in"), num("columnSide", "Column Side (columns only)", 12, 48, 1, 4, "in"), num("count", "Number of Columns", 1, 500, 1, 1)],
    results: [["contactSqFt", "Form Contact Area (sq ft)", "n"], ["boardFeet2x6", "2×6 Form Boards (linear ft)", "n"], ["stakes", "Stakes", "n"], ["plywoodSheets", "4×8 Plywood Sheets", "n"], ["formOilGallons", "Form Release Oil (gal)", "n"]],
    fn: E.concreteForm, ex: { type: 0, length: 60, height: 6, columnSide: 12, count: 1 },
    exText: (o) => `Example: 60 ft of 6 in slab edge needs about ${o.boardFeet2x6} ft of 2×6 form board and ${o.stakes} stakes.`,
    how: "Pick the form type and enter the total run. Slab edges use one side; walls and footings need two. Stake slab forms every 3–4 ft (closer for deeper pours) and brace wall forms well — wet concrete pushes hard.",
    assume: "2×6 boards are 5.5 in wide (stacked for taller edges); stakes every 3 ft plus one at each end; plywood sheets 32 sq ft; form oil ≈ 450 sq ft per gallon. Wall forms also need ties and walers.",
    faq: [["How often should concrete forms be staked?", "About every 3–4 ft, and at every joint and corner."]],
  }),
  mk({
    slug: "concrete-sealer-calculator", title: "Concrete Sealer Calculator (Gallons & Cost)",
    desc: "Find how much concrete sealer you need — gallons and containers for acrylic, penetrating silane/siloxane or epoxy sealers on driveways, patios and garage floors.",
    inputs: [num("area", "Area to Seal", 600, 100000, 1, 0, "sq ft"), num("coats", "Coats", 2, 4, 1, 1), dd("sealer", "Sealer Type", E.sealerUse), num("containerGallons", "Container Size", 5, 55, 0.25, 0.25, "gal"), usd("containerPrice", "Price per Container", 150, 5000, 1)],
    results: [["gallons", "Sealer Needed (gal)", "n"], ["containers", "Containers", "n"], ["cost", "Sealer Cost", "c"]],
    fn: E.concreteSealer, ex: { area: 600, coats: 2, sealer: 0, containerGallons: 5, containerPrice: 150 },
    exText: (o) => `Example: two coats of solvent acrylic on a 600 sq ft driveway take about ${o.gallons} gallons — ${o.containers} 5-gallon pail(s).`,
    how: "Enter the area, coats and sealer type. Porous, broom-finished or old concrete soaks up more; check the product label's coverage and apply thin coats.",
    assume: "Typical coverage per coat: solvent acrylic 250 sq ft/gal, water-based acrylic 300, penetrating silane/siloxane 150, epoxy/urethane 250. Plus 5% extra.",
    faq: [["How much does a gallon of concrete sealer cover?", "About 150–300 sq ft per coat depending on the sealer and surface."]],
  }),
  mk({
    slug: "retaining-wall-calculator", title: "Retaining Wall Calculator (Blocks, Caps & Gravel)",
    desc: "Calculate retaining wall blocks, courses, cap stones, drainage gravel and drain pipe from the wall length and height — with block and cap cost.",
    meta: "Retaining Wall Block Calculator — Blocks, Caps & Gravel",
    inputs: [num("length", "Wall Length", 30, 1000, 0.5, 0, "ft"), num("height", "Wall Height (above grade)", 3, 10, 0.25, 0.5, "ft"), num("blockLength", "Block Face Length", 16, 48, 0.5, 4, "in"), num("blockHeight", "Block Height", 6, 24, 0.5, 2, "in"), num("buried", "Buried Courses", 1, 3, 1, 0), num("capLength", "Cap Length", 16, 48, 0.5, 4, "in"), num("gravelDepth", "Drainage Gravel Behind Wall", 1, 3, 0.5, 0.5, "ft"), usd("blockPrice", "Price per Block", 4, 100, 0.25), usd("capPrice", "Price per Cap", 5, 100, 0.25)],
    results: [["blocks", "Wall Blocks", "n"], ["courses", "Courses (incl. buried)", "n"], ["blocksPerCourse", "Blocks per Course", "n"], ["caps", "Cap Stones", "n"], ["gravelCuYd", "Drainage + Base Gravel (cu yd)", "n"], ["drainPipeFeet", "Perforated Drain Pipe (ft)", "n"], ["cost", "Block + Cap Cost", "c"]],
    fn: E.retainingWall, ex: { length: 30, height: 3, blockLength: 16, blockHeight: 6, buried: 1, capLength: 16, gravelDepth: 1, blockPrice: 4, capPrice: 5 },
    exText: (o) => `Example: a 30 ft wall 3 ft high in 16 × 6 in blocks needs ${o.courses} courses of ${o.blocksPerCourse} — about ${o.blocks} blocks with 5% extra — plus ${o.caps} caps and ${o.gravelCuYd} cu yd of gravel.`,
    how: "Enter the visible wall length and height and the block size. Bury the first course (about 1 in per 8 in of wall height, at least one course), set it on 6 in of compacted gravel, backfill with 12 in of clean drainage gravel and run a perforated pipe at the base.\n\nWalls over about 4 ft usually need geogrid and an engineered design.",
    assume: "Courses = ceil(height ÷ block height) + buried courses; 5% extra blocks and caps for cuts. Gravel includes the drainage zone behind the wall and a 12 × 6 in leveling pad.",
    faq: [["How many retaining wall blocks do I need?", "Wall length ÷ block length per course × number of courses (plus 5%)."], ["Do retaining walls need drainage?", "Yes — gravel backfill and a drain pipe prevent water pressure from pushing the wall over."]],
  }),
  mk({
    slug: "stone-wall-calculator", title: "Stone Wall Calculator (Tons of Stone & Mortar)",
    desc: "Estimate how many tons of stone you need for a dry-stack or mortared stone wall — from wall length, height and thickness — plus mortar bags and stone cost.",
    inputs: [num("length", "Wall Length", 20, 1000, 0.5, 0, "ft"), num("height", "Wall Height", 3, 10, 0.25, 0, "ft"), num("thickness", "Wall Thickness", 1.5, 4, 0.25, 0.5, "ft"), dd("stone", "Stone Type", E.STONE_TYPES), dd("mortared", "Mortared?", ["No — dry stack", "Yes"]), usd("pricePerTon", "Stone Price per Ton", 250, 2000, 5)],
    results: [["tons", "Stone Needed (tons)", "n"], ["wallCubicFeet", "Wall Volume (cu ft)", "n"], ["faceSqFt", "Wall Face (sq ft)", "n"], ["mortarBags", "80 lb Mortar Bags", "n"], ["cost", "Stone Cost", "c"]],
    fn: E.stoneWall, ex: { length: 20, height: 3, thickness: 1.5, stone: 0, mortared: 0, pricePerTon: 250 },
    exText: (o) => `Example: a 20 ft dry-stack fieldstone wall 3 ft high and 18 in thick needs about ${o.tons} tons of stone.`,
    how: "Enter the wall size. Dry-stack walls should be about half as thick as they are tall at the base and batter (lean back) about 1 in per foot of height. Mortared walls need a concrete footing below the frost line.",
    assume: "Stone ≈ 165 lb per solid cu ft; walls are about 70% solid (fieldstone), 80% (flat ledgestone) or 90% (cut stone), plus 10% waste. Mortar ≈ 20% of wall volume, 0.6 cu ft per 80 lb bag.",
    faq: [["How much does a ton of stone cover in a wall?", "Roughly 15–25 sq ft of wall face for an 18 in thick fieldstone wall."]],
  }),
  mk({
    slug: "stone-veneer-calculator", title: "Stone Veneer Calculator (Flats, Corners, Mortar & Lath)",
    desc: "Calculate manufactured or thin stone veneer — flat square footage and boxes, corner boxes, Type S mortar bags and metal lath sheets for a wall or fireplace.",
    inputs: [num("wallArea", "Wall Area", 200, 100000, 1, 0, "sq ft"), num("openings", "Windows & Doors to Subtract", 20, 10000, 1, 0, "sq ft"), num("cornerFeet", "Outside Corners (linear ft)", 16, 5000, 1, 0, "ft"), num("flatBox", "Flats per Box", 10, 50, 0.5, 1, "sq ft"), num("cornerBox", "Corners per Box", 8, 30, 0.5, 1, "linear ft")],
    results: [["flatBoxes", "Flat Boxes", "n"], ["flatSqFt", "Flats Needed (sq ft, incl. 10%)", "n"], ["cornerBoxes", "Corner Boxes", "n"], ["mortarBags", "Type S Mortar (80 lb bags)", "n"], ["lathSheets", "Metal Lath Sheets", "n"]],
    fn: E.stoneVeneer, ex: { wallArea: 200, openings: 20, cornerFeet: 16, flatBox: 10, cornerBox: 8 },
    exText: (o) => `Example: 200 sq ft of wall with 20 sq ft of openings and 16 ft of corners needs about ${o.flatBoxes} boxes of flats, ${o.cornerBoxes} boxes of corners and ${o.mortarBags} bags of mortar.`,
    how: "Measure the wall area and subtract openings. Measure every outside corner top to bottom. Corner pieces cover some wall area too, so the calculator subtracts them from the flats.",
    assume: "Each linear ft of corner covers ≈ 0.75 sq ft; 10% extra flats and 5% extra corners. Scratch + setting coats ≈ one 80 lb bag per 25 sq ft; 2.5 lb lath ≈ 18 sq ft per sheet. Check your brand's box coverage.",
    faq: [["How much mortar for stone veneer?", "About one 80 lb bag of Type S per 20–25 sq ft for the scratch coat and setting bed."]],
  }),
  mk({
    slug: "stucco-calculator", title: "Stucco Calculator (Bags, Coverage & Lath)",
    desc: "Work out how many bags of stucco you need for a wall — traditional three-coat, one-coat or finish coat — from the wall area and openings, plus metal lath sheets.",
    inputs: [num("wallArea", "Wall Area", 500, 100000, 1, 0, "sq ft"), num("openings", "Openings to Subtract", 50, 10000, 1, 0, "sq ft"), dd("system", "Stucco System", E.STUCCO_SYSTEMS)],
    results: [["bags", "80 lb Bags", "n"], ["netArea", "Area to Cover (sq ft)", "n"], ["cubicFeet", "Material (cu ft)", "n"], ["lathSheets", "Metal Lath Sheets", "n"]],
    fn: E.stucco, ex: { wallArea: 500, openings: 50, system: 0 },
    exText: (o) => `Example: 450 sq ft of traditional three-coat stucco (7/8 in) takes about ${o.bags} bags of 80 lb premixed stucco and ${o.lathSheets} lath sheets.`,
    how: "Enter the wall area and openings and pick the system. Three-coat stucco is a scratch coat, brown coat and finish (about 7/8 in total); one-coat systems are about 3/8 in. Mist-cure each coat.",
    assume: "Premixed stucco ≈ 0.83 cu ft per 80 lb bag; 10% extra. Lath sheets ≈ 18 sq ft. Finish-coat-only bags cover about 70–90 sq ft at 1/8 in.",
    faq: [["How many square feet does a bag of stucco cover?", "About 10–12 sq ft at 7/8 in, 25–30 sq ft at 3/8 in, 70–90 sq ft for a 1/8 in finish coat."]],
  }),
  mk({
    slug: "foundation-depth-calculator", title: "Foundation Depth Calculator (Footing Depth & Width)",
    desc: "Find how deep and wide footings should be — the frost-line depth (12 in minimum), and typical footing width and thickness for a house, garage or deck by stories and soil.",
    inputs: [num("frostDepth", "Local Frost Depth", 36, 100, 1, 0, "in"), dd("building", "Building", ["House", "Garage or addition", "Deck, shed or porch post"]), dd("stories", "Stories Supported", ["One", "Two", "Three"]), dd("soil", "Soil Bearing Capacity", ["1,500 psf (clay, unknown)", "2,000 psf (sandy clay)", "3,000 psf (sand, gravel)"])],
    results: [["footingDepthIn", "Footing Depth Below Grade (in)", "n"], ["footingDepthMm", "Footing Depth (mm)", "n"], ["footingWidthIn", "Minimum Footing Width (in)", "n"], ["footingThicknessIn", "Footing Thickness (in)", "n"]],
    fn: E.foundationDepth, ex: { frostDepth: 36, building: 0, stories: 1, soil: 0 },
    exText: (o) => `Example: a two-story house where the frost line is 36 in needs footings at least ${o.footingDepthIn} in deep and about ${o.footingWidthIn} in wide on 1,500 psf soil.`,
    how: "Look up the frost depth for your county from the building department (it ranges from 0–12 in in the far South to 48–60+ in in the northern states). Footings must sit below it and at least 12 in below undisturbed ground.\n\nIn the UK, foundations are usually at least 0.45 m deep, and 0.75–1.0 m or more in shrinkable clay or near trees.",
    assume: "IRC R403.1.4: footing bottom below the frost line and ≥ 12 in below grade. Widths follow the pattern of IRC Table R403.1(1) for light-frame houses (simplified); thickness ≥ 6 in. Always follow your local code and engineer.",
    faq: [["How deep should a foundation footing be?", "Below the local frost line and at least 12 in below grade."]],
  }),
  mk({
    slug: "lintel-calculator", title: "Lintel Size Calculator (Concrete Lintel Length & Depth)",
    desc: "Work out the concrete lintel length for a window or door opening — with 150 mm end bearings — and a rule-of-thumb lintel depth for light, standard or heavy loads.",
    inputs: [num("opening", "Opening Width", 900, 6000, 10, 300, "mm"), dd("load", "Load Above", ["Light (window, little above)", "Standard (floor or wall above)", "Heavy (roof or point loads)"], 1)],
    results: [["lintelSize", "Suggested Lintel", "l", E.LINTEL_SIZES], ["lintelLengthMm", "Lintel Length (mm)", "n"], ["stockLengthMm", "Nearest Stock Length (mm)", "n"], ["bearingEachEndMm", "Bearing Each End (mm)", "n"]],
    fn: E.lintel, ex: { opening: 900, load: 1 },
    exText: (o) => `Example: a 900 mm window opening under a floor needs a ${o.lintelLengthMm} mm lintel (${o.bearingEachEndMm} mm bearing each end) — ${E.LINTEL_SIZES[o.lintelSize].split(" — ")[0]}.`,
    how: "Enter the clear opening width. Lintels need at least 150 mm of bearing on each side (100 mm on short spans is sometimes allowed — check the manufacturer). Cavity walls normally use a steel cavity lintel.",
    assume: "Rule of thumb only, based on common precast concrete lintel tables (65, 140 and 215 mm deep). Loads above openings vary — for anything beyond a simple window, get a structural engineer or building-control approval.",
    faq: [["How much longer than the opening should a lintel be?", "At least 300 mm longer — 150 mm bearing at each end."]],
  }),
  mk({
    slug: "driveway-cost-calculator", title: "Driveway Cost Calculator (Asphalt, Concrete, Gravel & Pavers)",
    desc: "Estimate the cost of a new driveway — asphalt, concrete, gravel, pavers, stamped concrete, resin, tar and chip or heated — from its size, with old driveway removal and site prep.",
    meta: "Driveway Cost Calculator — Asphalt, Concrete, Gravel & Pavers",
    inputs: [num("length", "Driveway Length", 50, 5000, 1, 0, "ft"), num("width", "Driveway Width", 12, 100, 0.5, 0, "ft"), dd("material", "Material", E.DRIVEWAY_MATERIALS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 200, 0.25), dd("removal", "Remove Old Driveway?", ["No", "Yes"]), usd("sitePrep", "Grading & Base per Sq Ft", 1, 20, 0.25)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["area", "Area (sq ft)", "n"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"]],
    fn: E.drivewayCost, ex: { length: 50, width: 12, material: 0, customRate: 0, removal: 0, sitePrep: 1 },
    exText: (o) => `Example: a 50 × 12 ft asphalt driveway costs about ${money(o.totalCost)} (${money(o.costLow)}–${money(o.costHigh)}) including $1/sq ft of base work.`,
    how: "Enter the size and pick a material. Removing an old asphalt or concrete driveway adds about $2 per sq ft; poor soil, slopes or long hauls raise the base cost.",
    assume: `Typical installed prices per sq ft: asphalt $5, concrete $10, gravel $2, pavers $25, stamped concrete $16, resin-bound $12, tar and chip $4, heated concrete $30. ${COST_NOTE}`,
    faq: [["Is asphalt or concrete cheaper for a driveway?", "Asphalt is usually about half the price up front; concrete lasts longer with less upkeep."]],
  }),
  mk({
    slug: "driveway-sealing-cost-calculator", title: "Driveway Sealing Cost Calculator (DIY vs Pro)",
    desc: "Compare the cost of sealcoating an asphalt driveway yourself with hiring a pro — sealer pails, crack filling and coats — and see how much you save.",
    inputs: [num("area", "Driveway Area", 800, 100000, 1, 0, "sq ft"), num("coats", "Coats", 2, 3, 1, 1), num("crackFeet", "Cracks to Fill", 20, 10000, 1, 0, "linear ft"), usd("pailPrice", "Sealer Price per 4.75 gal Pail", 30, 200, 0.5), usd("proRate", "Pro Price per Sq Ft per Coat", 0.25, 2, 0.01)],
    results: [["proCost", "Professional Cost", "c"], ["diyCost", "DIY Cost", "c"], ["pails", "Sealer Pails (DIY)", "n"], ["savings", "DIY Savings", "c"]],
    fn: E.drivewaySealingCost, ex: { area: 800, coats: 2, crackFeet: 20, pailPrice: 30, proRate: 0.25 },
    exText: (o) => `Example: two coats on an 800 sq ft driveway cost about ${money(o.proCost)} from a pro, or ${money(o.diyCost)} DIY with ${o.pails} pails of sealer.`,
    how: "Enter the area and cracks. Seal new asphalt after 6–12 months and then every 2–3 years. Fill cracks first and apply in dry weather above 50 °F.",
    assume: `DIY sealer covers ≈ 80 sq ft per gallon per coat (4.75 gal pails). Pros typically charge $0.15–0.35 per sq ft per coat with a minimum around $150, and about $1.50 per ft for crack filling. ${COST_NOTE}`,
    faq: [["How much does it cost to seal a driveway?", "Usually $0.15–0.35 per sq ft per coat professionally — $200–500 for an average driveway."]],
  }),
  mk({
    slug: "tar-and-chip-calculator", title: "Tar and Chip Driveway Calculator (Cost, Stone & Emulsion)",
    desc: "Estimate a tar and chip (chip seal) driveway — cost for single or double layers, tons of chip stone, gallons of emulsion and optional gravel base.",
    inputs: [num("area", "Driveway Area", 2000, 1000000, 1, 0, "sq ft"), dd("layers", "Layers", ["Single chip seal", "Double chip seal"]), usd("rate1", "Single-Layer Price per Sq Ft", 2.5, 20, 0.05), usd("rate2", "Double-Layer Price per Sq Ft", 4, 20, 0.05), num("baseDepth", "New Gravel Base Depth (0 if none)", 0, 12, 0.5, 0, "in")],
    results: [["cost", "Estimated Cost", "c"], ["stoneTons", "Chip Stone (tons)", "n"], ["emulsionGallons", "Asphalt Emulsion (gal)", "n"], ["baseTons", "Gravel Base (tons)", "n"]],
    fn: E.tarAndChip, ex: { area: 2000, layers: 0, rate1: 2.5, rate2: 4, baseDepth: 0 },
    exText: (o) => `Example: a 2,000 sq ft single-layer tar and chip driveway costs about ${money(o.cost)} and uses about ${o.stoneTons} tons of chip stone.`,
    how: "Tar and chip needs a well-compacted gravel base. A single layer suits light traffic; a double layer lasts longer (7–10 years).",
    assume: `≈ 25 lb of 3/8 in chip and 0.35 gal of emulsion per sq yd per layer. Typical prices $2–4 (single) and $3.50–6 (double) per sq ft. ${COST_NOTE}`,
    faq: [["Is tar and chip cheaper than asphalt?", "Usually yes — about half the price of asphalt, with a rougher, gravel-like look."]],
  }),
  mk({
    slug: "foundation-repair-cost-calculator", title: "Foundation Repair Cost Calculator (Piers, Leveling & Cracks)",
    desc: "Estimate foundation repair costs — crack sealing, steel or helical piers, slabjacking or foam leveling, wall anchors and full replacement — with engineer and permit fees.",
    inputs: [dd("repair", "Repair Type", E.FOUNDATION_REPAIRS, 1), num("quantity", "Quantity (cracks, piers, sq ft or anchors)", 8, 100000, 1), usd("customRate", "Your Unit Price (0 = typical)", 0, 100000, 1), usd("engineer", "Structural Engineer Report", 600, 10000, 50), usd("permit", "Permit", 150, 10000, 10)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["unitCost", "Unit Price Used", "c"]],
    fn: E.foundationRepairCost, ex: { repair: 1, quantity: 8, customRate: 0, engineer: 600, permit: 150 },
    exText: (o) => `Example: eight steel piers with an engineer's report and permit cost about ${money(o.totalCost)} (${money(o.costLow)}–${money(o.costHigh)}).`,
    how: "Get a structural engineer's report first — it says what is moving and how many piers or anchors you need. Repair quotes from foundation companies can vary widely.\n\nUnderpinning and house leveling are usually priced per pier.",
    assume: `Typical unit prices: crack sealing $500 per crack, piers $1,500 each, slabjacking/foam $10 per sq ft, wall anchors $700 each, replacement $60 per sq ft of footprint. ${COST_NOTE}`,
    faq: [["How much does foundation repair cost?", "Most homeowners pay $2,000–8,000; pier jobs often run $10,000–20,000+."]],
  }),
  mk({
    slug: "block-wall-cost-calculator", title: "Block Wall Cost Calculator (Block, Brick & Stone Walls)",
    desc: "Estimate the cost to build a block, brick, stone or poured concrete wall — from length and height — with footing cost and an optional stucco finish.",
    inputs: [num("length", "Wall Length", 50, 5000, 1, 0, "ft"), num("height", "Wall Height", 6, 20, 0.5, 0, "ft"), dd("wall", "Wall Type", E.WALL_TYPES), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 500, 0.5), usd("footingPerFoot", "Footing Cost per Linear Ft", 25, 200, 1), dd("stucco", "Stucco Finish?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["faceSqFt", "Wall Face (sq ft)", "n"], ["costPerSqFt", "All-In per Sq Ft", "c"]],
    fn: E.blockWallCost, ex: { length: 50, height: 6, wall: 0, customRate: 0, footingPerFoot: 25, stucco: 0 },
    exText: (o) => `Example: a 50 ft concrete block wall 6 ft high costs about ${money(o.totalCost)} including the footing.`,
    how: "Enter the wall size and pick the material. Garden walls over about 4 ft, and any retaining wall, may need a permit and engineering.",
    assume: `Typical installed prices per sq ft of face: CMU $16, split-face $22, brick $25, natural stone $40, poured concrete $30; stucco adds about $7. ${COST_NOTE}`,
    faq: [["How much does a cinder block wall cost?", "About $12–25 per sq ft of wall face installed, plus the footing."]],
  }),
  mk({
    slug: "tuckpointing-cost-calculator", title: "Tuckpointing Cost Calculator (Repointing Brick)",
    desc: "Estimate the cost to tuckpoint or repoint brick and stone — from wall area, the share of joints that need work, price per sq ft and wall height.",
    inputs: [num("area", "Wall Area", 400, 100000, 1, 0, "sq ft"), pct("repairShare", "Share Needing Repointing", 100), usd("rate", "Price per Sq Ft", 12, 100, 0.5), dd("stories", "Height", STORIES)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["sqFtRepointed", "Area Repointed (sq ft)", "n"]],
    fn: E.tuckpointingCost, ex: { area: 400, repairShare: 100, rate: 12, stories: 0 },
    exText: (o) => `Example: repointing 400 sq ft of one-story brick costs about ${money(o.totalCost)}.`,
    how: "Enter the area of brick that needs work. Repointing grinds out 1/2–3/4 in of old mortar and packs in new; matching the mortar color and strength (often a soft lime mortar on old brick) matters.",
    assume: `Typical price $5–25 per sq ft (default $12); two stories +20%, three or more +40% for scaffolding. ${COST_NOTE}`,
    faq: [["What is the difference between tuckpointing and repointing?", "Repointing replaces worn mortar; tuckpointing adds a contrasting thin line of mortar for a crisp look. Most people use the terms interchangeably."]],
  }),
  mk({
    slug: "concrete-demolition-cost-calculator", title: "Concrete Removal Cost Calculator (Demolition & Haul-Away)",
    desc: "Estimate the cost to break up and haul away a concrete slab, patio or driveway — plus the tons of debris and truck loads — from its area and thickness.",
    inputs: [num("area", "Slab Area", 500, 100000, 1, 0, "sq ft"), num("thickness", "Thickness", 4, 12, 0.5, 2, "in"), dd("reinforced", "Rebar or Mesh?", ["No", "Yes"]), usd("rate", "Removal Price per Sq Ft", 4, 30, 0.25), usd("disposalPerTon", "Disposal per Ton", 50, 300, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["debrisTons", "Debris (tons)", "n"], ["truckLoads", "10-Ton Truck Loads", "n"]],
    fn: E.concreteDemolitionCost, ex: { area: 500, thickness: 4, reinforced: 0, rate: 4, disposalPerTon: 50 },
    exText: (o) => `Example: removing a 500 sq ft, 4 in slab costs about ${money(o.totalCost)} and produces ${o.debrisTons} tons of debris.`,
    how: "Enter the slab size. Reinforced concrete takes longer to break. Clean concrete can often go to a recycler for less than landfill rates.",
    assume: `Concrete ≈ 145 lb per cu ft. Typical removal $2–6 per sq ft (+25% for rebar). ${COST_NOTE}`,
    faq: [["How much does it cost to remove a concrete patio?", "About $2–6 per sq ft — $1,000–3,000 for a typical patio."]],
  }),
  mk({
    slug: "stucco-cost-calculator", title: "Stucco Cost Calculator (New, Repair & Replace)",
    desc: "Estimate stucco costs — new three-coat or one-coat stucco, patching and repairs, or remove-and-replace — from wall area and height.",
    inputs: [num("area", "Wall Area", 1500, 100000, 1, 0, "sq ft"), dd("job", "Job", E.STUCCO_JOBS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 100, 0.25), dd("stories", "Height", STORIES)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.stuccoCost, ex: { area: 1500, job: 0, customRate: 0, stories: 0 },
    exText: (o) => `Example: 1,500 sq ft of new three-coat stucco on a one-story house costs about ${money(o.totalCost)}.`,
    how: "Enter the area and job. Small repairs have a minimum charge (about $300); cracks from water damage may need the lath and sheathing behind replaced too.",
    assume: `Typical prices per sq ft: new 3-coat $9, one-coat $7, repair $20 (small areas), remove and replace $14. ${COST_NOTE}`,
    faq: [["How much does stucco cost per square foot?", "About $6–10 for new stucco; repairs cost more per sq ft."]],
  }),
  mk({
    slug: "concrete-resurfacing-cost-calculator", title: "Concrete Resurfacing Cost Calculator",
    desc: "Estimate the cost to resurface worn concrete — resurfacer, microtopping, stamped overlay, epoxy or grind-and-polish — with crack repair.",
    inputs: [num("area", "Area", 500, 100000, 1, 0, "sq ft"), dd("method", "Method", E.RESURFACE_METHODS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 100, 0.25), num("crackFeet", "Cracks to Repair", 20, 10000, 1, 0, "linear ft")],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.concreteResurfacingCost, ex: { area: 500, method: 0, customRate: 0, crackFeet: 20 },
    exText: (o) => `Example: resurfacing a 500 sq ft patio with a skim coat costs about ${money(o.totalCost)}.`,
    how: "Resurfacing suits concrete that is structurally sound but spalled or stained. Heaved or badly cracked slabs need replacing instead.",
    assume: `Typical prices per sq ft: resurfacer $4, microtopping $8, stamped overlay $12, epoxy $6, polishing $5; crack repair $3 per ft. ${COST_NOTE}`,
    faq: [["Is it cheaper to resurface or replace concrete?", "Resurfacing usually costs a third to half as much as replacement."]],
  }),
  mk({
    slug: "screed-calculator", title: "Floor Screed Calculator (Volume, Sand, Cement & Drying Time)",
    desc: "Calculate floor screed in m³ and tonnes — sand and cement bags for a 1:4 mix or liquid anhydrite — from the floor area and depth, with an estimated drying time.",
    inputs: [num("area", "Floor Area", 20, 10000, 0.5, 0, "m²"), num("depth", "Screed Depth", 65, 150, 5, 15, "mm"), dd("type", "Screed Type", E.SCREED_TYPES)],
    results: [["volumeM3", "Screed Volume (m³)", "n"], ["tonnes", "Weight (tonnes)", "n"], ["sandTonnes", "Sharp Sand (tonnes)", "n"], ["cementBags", "Cement (25 kg bags)", "n"], ["dryingDays", "Approx. Drying Time (days)", "n"]],
    fn: E.screed, ex: { area: 20, depth: 65, type: 0 },
    exText: (o) => `Example: 20 m² of 65 mm sand and cement screed is ${o.volumeM3} m³ — about ${o.sandTonnes} tonnes of sharp sand and ${o.cementBags} bags of cement — and needs roughly ${o.dryingDays} days to dry.`,
    how: "Enter the floor area and depth. Bonded screeds can be 25–40 mm, unbonded 50 mm+, and floating screeds over insulation 65–75 mm (traditional) or 35–50 mm (liquid).\n\nTest moisture before laying timber or vinyl floors.",
    assume: "Sand and cement 1:4 ≈ 2.1 t/m³ (dry materials ≈ 1.3 × wet volume); liquid anhydrite ≈ 2.0 t/m³ (ordered ready-mixed). Drying: 1 mm/day up to 40 mm and 0.5 mm/day beyond; fast-drying screeds per the product sheet.",
    faq: [["How long does a 65 mm screed take to dry?", "About 3 months for traditional sand and cement in good conditions."]],
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
