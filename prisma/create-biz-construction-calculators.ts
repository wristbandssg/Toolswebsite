// One-time (but safe to re-run) batch setup script: creates 36 construction materials & estimating
// calculators (Business & Industrial Calculators > Construction Materials & Estimating Calculators).
// Formulas and tables live in src/lib/calc-engine-biz-construction.ts; examples are computed from the
// engine. Merged keywords (no separate page): Demo → demolition-cost; Board Length → lumber; Metal
// Stud → framing; Trex / TimberTech Decking → deck; Building Materials, Material Take Off, Free
// Building → material-estimator; Bid, Construction Job Cost, Estimating, Job Price → construction-bid;
// Resin Volume → epoxy; Residential / Commercial Fire Sprinkler → fire-sprinkler-system-cost.
// Near-namesakes kept distinct: fence-calculator / deck-calculator / blown-in-insulation-calculator
// count materials, while the existing fence-cost / deck-cost / insulation-cost tools price installs.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-construction-calculators.ts
// or
//   npm run db:create-biz-construction-calculators

import * as E from "../src/lib/calc-engine-biz-construction";

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

const CAT = "construction-materials-estimating-calculators";
const NOTE = "Results are planning estimates — prices vary by region and supplier, and structural, fire and life-safety work must be designed and checked by a licensed professional to local code.";

const waste = (def = 10) => pct("waste", "Extra for Waste", def, 50, 1);
const region = pct("regionAdjust", "Local Cost Adjustment (+/− %)", 0, 100, 1);
const SPECIES = opts(E.WOODS.map(([n]) => n));
const qty = (i: number, label: string, q: number, p: number) => [num(`qty${i}`, `${label} — Quantity`, q, 1000000, 1), cur(`price${i}`, `${label} — Unit Price`, p, 100000, 0.01)];

const TOOLS: ToolDef[] = [
  mk({
    slug: "demolition-cost-calculator", title: "Demolition Cost Calculator",
    desc: "Estimate demolition cost for interior gutting, a whole house, concrete removal, a garage, deck or commercial building — labor, debris tonnage, disposal, hazmat and permits.",
    meta: "Demolition Cost Calculator — House, Interior & Concrete",
    inputs: [dropdown("type", "What's Being Demolished", opts(E.DEMO_TYPES.map(([n, r]) => `${n} (~$${r}/sq ft)`)), 1), num("area", "Area (sq ft)", 1500, 1000000, 10), region, cur("disposalPerTon", "Disposal / Tipping Fee per Ton", 65, 500, 1), yn("hazmat", "Asbestos / Lead Abatement Needed?"), cur("hazmatPerSqFt", "Abatement Cost per Sq Ft", 3, 50, 0.25), cur("permit", "Demolition Permit", 500, 20000, 10)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["demolitionLabor", "Demolition (labor & equipment)", "c"], ["debrisTons", "Debris (tons)", "n"], ["disposalCost", "Disposal", "c"], ["hazmatCost", "Abatement", "c"], ["dumpsters30Yd", "30-Yard Dumpsters (approx.)", "n"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"]],
    fn: E.demolitionCost, ex: { type: 1, area: 1500, regionAdjust: 0, disposalPerTon: 65, hazmat: 0, hazmatPerSqFt: 3, permit: 500 },
    exText: (o) => `Example: tearing down a 1,500 sq ft wood-frame house generates about ${o.debrisTons} tons of debris and costs roughly ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft with disposal and permit.`,
    how: "Pick what's coming down, enter the area, and adjust disposal fees and permit costs for your city. Add abatement if the building predates 1980 and tests positive.",
    assume: "2026 typical demolition rates: interior gut $2–7, wood house $4–15, concrete removal $2–6, commercial $8–15 per sq ft. Debris factors: house ≈ 120 lb per sq ft, interior gut ≈ 25 lb.",
    faq: [["How much does it cost to demolish a house?", "Typically $6,000–25,000 for an average home, more with basements, asbestos or tight access."], ["How much does concrete removal cost?", "About $2–6 per sq ft for a 4 in slab including haul-off."]],
  }),
  mk({
    slug: "board-foot-calculator", title: "Board Foot Calculator",
    desc: "Calculate board feet of lumber from thickness, width, length and piece count — with cubic feet, cubic meters and total cost at a price per board foot.",
    inputs: [num("thickness", "Thickness (in)", 1, 24, 0.25), num("width", "Width (in)", 6, 48, 0.25), num("length", "Length (ft)", 8, 100, 0.5), num("pieces", "Number of Pieces", 10, 100000, 1, 1), waste(0), cur("pricePerBoardFoot", "Price per Board Foot", 6.5, 200, 0.05)],
    results: [["boardFeet", "Total Board Feet", "n"], ["boardFeetEach", "Board Feet per Piece", "n"], ["cubicFeet", "Cubic Feet", "n"], ["cubicMeters", "Cubic Meters", "n"], ["linearFeet", "Linear Feet", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.boardFoot, ex: { thickness: 1, width: 6, length: 8, pieces: 10, waste: 0, pricePerBoardFoot: 6.5 },
    exText: (o) => `Example: ten 1 × 6 in boards 8 ft long are ${o.boardFeetEach} BF each — ${o.boardFeet} board feet, ${usd(o.totalCost)} at $6.50/BF.`,
    how: "Enter the rough (nominal) thickness and width in inches, the length in feet and how many pieces. Hardwood is sold by nominal quarters: 4/4 = 1 in, 8/4 = 2 in.",
    assume: "Board feet = T (in) × W (in) × L (ft) ÷ 12. One board foot = 144 cubic inches; 12 BF = 1 cu ft.",
    faq: [["What is a board foot?", "A volume of wood 1 in thick, 12 in wide and 12 in long (144 cubic inches)."], ["How many board feet in a 2×4×8?", "5.33 board feet (2 × 4 × 8 ÷ 12) using nominal size."]],
  }),
  mk({
    slug: "lumber-calculator", title: "Lumber Calculator",
    desc: "Work out how many boards to buy — from total linear feet or a cut list of pieces — for any lumber size and stock length, with offcuts, board feet and cost.",
    meta: "Lumber Calculator — How Many Boards to Buy",
    inputs: [dropdown("mode", "Calculate From", opts(["Total linear feet", "Cut list (pieces × length)"]), 0), dropdown("size", "Lumber Size", opts(E.LUMBER_SIZES.map(([n]) => n)), 3), dropdown("stockLength", "Stock Board Length", opts(E.STOCK_LENGTHS.map((l) => `${l} ft`)), 0), num("linearFeet", "Total Linear Feet Needed", 200, 1000000, 1), num("pieceCount", "Cut List — Number of Pieces", 12, 100000), num("pieceLength", "Cut List — Piece Length (in)", 30, 480, 0.25), waste(10), cur("boardPrice", "Price per Board", 4.5, 1000, 0.05)],
    results: [["boardsNeeded", "Boards to Buy", "n"], ["linearFeet", "Linear Feet", "n"], ["boardFeet", "Board Feet (nominal)", "n"], ["offcutPerBoardFt", "Offcut per Board (ft, cut list)", "n"], ["totalCost", "Total Cost", "c"], ["costPerLinearFoot", "Cost per Linear Foot", "c"]],
    fn: E.lumber, ex: { mode: 0, size: 3, stockLength: 0, linearFeet: 200, pieceCount: 12, pieceLength: 30, waste: 10, boardPrice: 4.5 },
    exText: (o) => `Example: 200 linear ft of 2×4 with 10% waste is ${o.boardsNeeded} boards of 8 ft — ${o.boardFeet} board feet, about ${usd(o.totalCost)}.`,
    how: "Either enter the total linear feet you need, or switch to a cut list and enter how many pieces of what length. The cut list allows 1/8 in per saw cut.",
    assume: "Cut list: pieces per board = floor(board length ÷ (piece + kerf)); leftover pieces aren't joined. Board feet use nominal dimensions.",
    faq: [["How do I figure how much lumber I need?", "Add up the linear feet of each size, add 10–15% for waste, and divide by the board length you'll buy."]],
  }),
  mk({
    slug: "framing-calculator", title: "Framing Calculator (Wall Studs)",
    desc: "Calculate wall studs, top and bottom plates, headers and fasteners for wood or metal stud framing — by wall length, stud spacing, corners and openings.",
    meta: "Framing Calculator — Studs, Plates & Headers",
    inputs: [num("wallLength", "Total Wall Length (ft)", 40, 10000, 0.5), dropdown("spacing", "Stud Spacing", opts(E.SPACINGS.map((s) => `${s} in on center`)), 1), dropdown("material", "Stud Material", opts(["Wood", "Metal (steel) studs"]), 0), num("corners", "Corners", 4, 200), num("intersections", "Wall Intersections (T-walls)", 2, 200), num("openings", "Door & Window Openings", 4, 200), num("avgOpeningWidth", "Average Opening Width (ft)", 3, 20, 0.5), dropdown("topPlates", "Plates", opts(["Single top + bottom", "Double top + bottom"]), 1), waste(10), cur("studPrice", "Price per Stud", 4.25, 100, 0.05), cur("platePrice", "Price per 16 ft Plate", 9.5, 200, 0.05)],
    results: [["studsNeeded", "Studs Needed", "n"], ["plateLinearFeet", "Plate Linear Feet", "n"], ["plateBoards16Ft", "16 ft Plate Boards", "n"], ["headerLinearFeet", "Header Stock (linear ft)", "n"], ["screwsOrNails", "Nails / Screws (approx.)", "n"], ["totalCost", "Stud + Plate Cost", "c"]],
    fn: E.framing, ex: { wallLength: 40, spacing: 1, material: 0, corners: 4, intersections: 2, openings: 4, avgOpeningWidth: 3, topPlates: 1, waste: 10, studPrice: 4.25, platePrice: 9.5 },
    exText: (o) => `Example: 40 ft of wall at 16 in on center with 4 corners, 2 T-walls and 4 openings needs ${o.studsNeeded} studs and ${o.plateBoards16Ft} plates — about ${usd(o.totalCost)}.`,
    how: "Enter the total length of walls, the stud spacing and counts of corners, wall intersections and openings. Metal studs use the same layout.",
    assume: "Studs = length ÷ spacing + 1, plus 2 per corner, intersection and opening (king/jack studs), plus waste. Headers are doubled and include bearing. A common shortcut is one stud per linear foot of wall.",
    faq: [["How many studs do I need for a wall?", "Roughly one stud per foot of wall at 16 in on center once corners and openings are included."], ["Are metal studs spaced the same as wood?", "Yes — 16 or 24 in on center, though gauge and height limits differ."]],
  }),
  mk({
    slug: "log-weight-calculator", title: "Log & Tree Weight Calculator",
    desc: "Estimate the weight of a log or tree trunk by species, diameter and length — green or seasoned — in pounds, tons and kilograms, with Doyle board feet.",
    meta: "Log Weight Calculator — Tree Trunk Weight by Species",
    inputs: [dropdown("species", "Species", SPECIES, 0), num("smallEndDiameter", "Small-End Diameter (in)", 16, 120, 0.5), num("largeEndDiameter", "Large-End Diameter (in)", 18, 120, 0.5), num("length", "Log Length (ft)", 10, 100, 0.5), num("count", "Number of Logs", 1, 1000, 1, 1), dropdown("moisture", "Condition", opts(["Green (fresh cut)", "Seasoned (~12% moisture)"]), 0)],
    results: [["weightLb", "Weight (lb)", "n"], ["weightTons", "Weight (US tons)", "n"], ["weightKg", "Weight (kg)", "n"], ["cubicFeet", "Volume (cu ft)", "n"], ["densityUsed", "Density Used (lb/ft³)", "n"], ["doyleBoardFeet", "Doyle Scale (board feet)", "n"]],
    fn: E.logWeight, ex: { species: 0, smallEndDiameter: 16, largeEndDiameter: 18, length: 10, count: 1, moisture: 0 },
    exText: (o) => `Example: a green red oak log 10 ft long, 16–18 in across, holds ${o.cubicFeet} cu ft and weighs about ${fmt(o.weightLb, 0)} lb (${o.weightTons} tons).`,
    how: "Measure the diameter at both ends inside the bark and the length. For a standing tree trunk, use the diameter at the base and at the top of the usable section.",
    assume: "Volume is a frustum of a cone (Smalian-style). Densities: USDA Wood Handbook, green and 12% moisture content. Bark and branches add 10–25%.",
    faq: [["How much does a log weigh?", "Green hardwoods weigh 45–65 lb per cubic foot, so a 16 in × 10 ft oak log is about 1,000 lb."]],
  }),
  mk({
    slug: "lumber-weight-calculator", title: "Lumber Weight Calculator",
    desc: "Calculate the weight of boards and dimensional lumber by species, size and length — kiln-dried or green — per piece and for the whole stack.",
    inputs: [dropdown("species", "Species", SPECIES, 10), dropdown("size", "Size", opts([...E.LUMBER_SIZES.map(([n, t, w]) => `${n} (${t} × ${w} in actual)`), "Custom (enter below)"]), 3), num("thickness", "Custom Thickness (in, actual)", 1, 24, 0.125), num("width", "Custom Width (in, actual)", 6, 48, 0.125), num("length", "Length (ft)", 8, 100, 0.5), num("pieces", "Number of Pieces", 50, 100000, 1, 1), dropdown("moisture", "Condition", opts(["Kiln-dried (~12%)", "Green / wet"]), 0)],
    results: [["weightLb", "Total Weight (lb)", "n"], ["weightPerPieceLb", "Weight per Piece (lb)", "n"], ["weightKg", "Total Weight (kg)", "n"], ["cubicFeet", "Volume (cu ft)", "n"], ["boardFeetActual", "Board Feet (actual size)", "n"]],
    fn: E.lumberWeight, ex: { species: 10, size: 3, thickness: 1, width: 6, length: 8, pieces: 50, moisture: 0 },
    exText: (o) => `Example: fifty kiln-dried Douglas fir 2×4×8s weigh about ${o.weightPerPieceLb} lb each — ${fmt(o.weightLb, 0)} lb in total.`,
    how: "Choose the species and nominal size (or enter actual dimensions), the length and number of pieces.",
    assume: "Weight = actual volume × density. Kiln-dried densities at ~12% moisture; green lumber can weigh 30–60% more.",
    faq: [["How much does a 2×4×8 weigh?", "About 9–11 lb kiln-dried in Douglas fir or SPF, up to 15 lb green or in southern pine."]],
  }),
  mk({
    slug: "shiplap-calculator", title: "Shiplap Calculator",
    desc: "Calculate shiplap or nickel-gap boards for a wall or ceiling — linear feet by board exposure, boards to buy, nails and cost per square foot.",
    inputs: [num("length", "Wall Width (ft)", 12, 1000, 0.5), num("height", "Wall Height (ft)", 8, 50, 0.5), num("openings", "Openings (sq ft)", 0, 1000), dropdown("board", "Board", opts(E.SHIPLAP_EXPOSURE.map(([n]) => n)), 0), num("boardLength", "Board Length (ft)", 8, 20, 1, 1), waste(10), cur("boardPrice", "Price per Board", 12, 500, 0.25)],
    results: [["boardsNeeded", "Boards Needed", "n"], ["linearFeet", "Linear Feet", "n"], ["areaSqFt", "Net Area (sq ft)", "n"], ["nails", "Nails (approx.)", "n"], ["totalCost", "Total Cost", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.shiplap, ex: { length: 12, height: 8, openings: 0, board: 0, boardLength: 8, waste: 10, boardPrice: 12 },
    exText: (o) => `Example: a 12 × 8 ft accent wall in 1×6 shiplap needs ${o.linearFeet} linear ft — ${o.boardsNeeded} boards of 8 ft, about ${usd(o.totalCost)}.`,
    how: "Enter the wall size and openings and choose the board. Exposure is the visible face after the overlap.",
    assume: "Linear feet = area × 12 ÷ exposure. Nails: about 1.5 per linear foot (two per stud crossing at 16 in o.c.).",
    faq: [["How much shiplap do I need for a wall?", "About 2.3 linear ft per sq ft with 1×6 boards — 220 ft for a 12 × 8 ft wall before waste."]],
  }),
  mk({
    slug: "construction-calculator", title: "Construction Calculator (Feet & Inches)",
    desc: "Add, subtract, multiply and divide feet-inch-fraction measurements, find area or a diagonal — results in feet, inches and sixteenths, decimal feet and millimeters.",
    meta: "Construction Calculator — Feet, Inches & Fractions",
    inputs: [dropdown("operation", "Operation", opts(["A + B", "A − B", "A × number", "A ÷ number", "Area A × B (sq ft)", "Diagonal √(A² + B²)"]), 0), num("feet1", "A — Feet", 12, 100000), num("inches1", "A — Inches", 6, 11, 1), num("fraction1", "A — Fraction Numerator", 3, 15, 1), num("feet2", "B — Feet", 5, 100000), num("inches2", "B — Inches", 9, 11, 1), num("fraction2", "B — Fraction Numerator", 7, 15, 1), dropdown("denominator", "Fraction Denominator", opts(["None", "/2", "/4", "/8", "/16"]), 4), num("factor", "Number (for × or ÷)", 2, 10000, 0.01)],
    results: [["decimalFeet", "Result (decimal feet)", "n"], ["feet", "Feet", "n"], ["inches", "Inches", "n"], ["sixteenths", "Sixteenths", "n"], ["totalInches", "Total Inches", "n"], ["millimeters", "Millimeters", "n"], ["areaSqFt", "Area (sq ft)", "n"]],
    fn: E.feetInch, ex: { operation: 0, feet1: 12, inches1: 6, fraction1: 3, feet2: 5, inches2: 9, fraction2: 7, denominator: 4, factor: 2 },
    exText: (o) => `Example: 12′ 6-3/16″ + 5′ 9-7/16″ = ${o.feet}′ ${o.inches}-${o.sixteenths}/16″ (${o.decimalFeet} ft).`,
    how: "Enter two measurements in feet, inches and a fraction (choose the denominator), pick the operation, and read the result rounded to the nearest 1/16 in.",
    assume: "Results are rounded to the nearest 1/16 in for the feet-inch display; decimal values are exact to two places.",
    faq: [["How do I add feet and inches?", "Convert both to inches, add, then divide by 12 — the whole number is feet and the remainder is inches."]],
  }),
  mk({
    slug: "deck-calculator", title: "Deck Calculator (Boards, Joists & Screws)",
    desc: "Calculate deck materials — decking boards for wood, Trex or TimberTech composite, joists, screws or hidden clips and posts — from deck size and board length.",
    meta: "Deck Material Calculator — Trex, TimberTech & Wood",
    inputs: [num("length", "Deck Length (ft, along the boards)", 16, 500, 0.5), num("width", "Deck Width (ft, along the joists)", 12, 100, 0.5), dropdown("board", "Decking", opts(E.DECK_BOARDS.map(([n]) => n)), 2), dropdown("boardLength", "Board Length", opts(E.BOARD_LENGTHS.map((l) => `${l} ft`)), 1), dropdown("joistSpacing", "Joist Spacing", opts(["16 in on center", "12 in on center (diagonal / composite)"]), 0), waste(10), cur("boardPrice", "Price per Board", 45, 1000, 0.5)],
    results: [["deckBoards", "Deck Boards", "n"], ["deckingLinearFeet", "Decking Linear Feet", "n"], ["joists", "Joists", "n"], ["joistLengthFt", "Joist Length (ft)", "n"], ["screwsOrClips", "Screws or Hidden Clips", "n"], ["postsApprox", "Posts (approx.)", "n"], ["deckAreaSqFt", "Deck Area (sq ft)", "n"], ["boardCost", "Decking Cost", "c"]],
    fn: E.deck, ex: { length: 16, width: 12, board: 2, boardLength: 1, joistSpacing: 0, waste: 10, boardPrice: 45 },
    exText: (o) => `Example: a 16 × 12 ft composite deck takes ${o.deckBoards} Trex-style boards 16 ft long, ${o.joists} joists and about ${fmt(o.screwsOrClips, 0)} clips — ${usd(o.boardCost)} in decking.`,
    how: "Enter the deck size with the length running parallel to the boards, choose the board type and length, and the joist spacing.",
    assume: "Rows = width ÷ (board width + gap): wood 1/8 in, composite 3/16 in. Two fasteners per board per joist. Posts assume beams about every 10 ft and posts every 8 ft.",
    faq: [["How many Trex boards do I need?", "For 5.5 in composite boards, about 2.1 linear ft per sq ft of deck plus waste."], ["Do composite decks need closer joists?", "Most composites allow 16 in on center straight, 12 in for diagonal layouts."]],
  }),
  mk({
    slug: "fence-calculator", title: "Fence Material Calculator",
    desc: "Calculate fence materials — posts, rails, pickets and concrete bags — by fence length, post spacing, picket size and gates, with material cost per foot.",
    meta: "Fence Material Calculator — Posts, Rails & Pickets",
    inputs: [num("length", "Fence Length (ft)", 150, 50000, 1), num("postSpacing", "Post Spacing (ft)", 8, 10, 0.5, 4), num("railsPerSection", "Rails per Section", 2, 4, 1, 1), num("picketWidth", "Picket Width (in)", 5.5, 12, 0.25, 1), num("gap", "Gap Between Pickets (in)", 0, 6, 0.125), num("gates", "Gates", 1, 50), num("gateWidth", "Gate Width (ft)", 4, 20, 0.5), num("bagsPerPost", "Concrete Bags per Post", 2, 5, 0.5), waste(5), cur("postPrice", "Price per Post", 18, 200, 0.25), cur("railPrice", "Price per Rail", 8, 100, 0.25), cur("picketPrice", "Price per Picket", 3, 50, 0.05), cur("bagPrice", "Price per Concrete Bag", 6.5, 50, 0.1)],
    results: [["posts", "Posts", "n"], ["rails", "Rails", "n"], ["pickets", "Pickets", "n"], ["concreteBags", "Concrete Bags", "n"], ["sections", "Sections", "n"], ["materialCost", "Material Cost", "c"], ["costPerFoot", "Material Cost per Foot", "c"]],
    fn: E.fence, ex: { length: 150, postSpacing: 8, railsPerSection: 2, picketWidth: 5.5, gap: 0, gates: 1, gateWidth: 4, bagsPerPost: 2, waste: 5, postPrice: 18, railPrice: 8, picketPrice: 3, bagPrice: 6.5 },
    exText: (o) => `Example: 150 ft of privacy fence with one gate needs ${o.posts} posts, ${o.rails} rails, ${o.pickets} pickets and ${o.concreteBags} bags of concrete — about ${usd(o.materialCost)} in materials.`,
    how: "Enter the total fence length, post spacing, rails per section and picket size. Use 0 gap for a privacy fence.",
    assume: "Posts = sections + 1 + one extra per gate. Pickets cover the length minus gate openings. Gate hardware and stain aren't included.",
    faq: [["How many pickets for 100 ft of fence?", "About 220 pickets of 5.5 in with no gap."], ["How far apart should fence posts be?", "6–8 ft for wood fences; 8 ft is the most common."]],
  }),
  mk({
    slug: "linear-feet-calculator", title: "Linear Feet Calculator",
    desc: "Calculate linear feet from pieces and length (inches, feet or meters) or from square feet and board width — with yards, meters and cost per linear foot.",
    meta: "Linear Feet Calculator — LF from Pieces or Sq Ft",
    inputs: [dropdown("mode", "Calculate From", opts(["Pieces × length", "Square feet ÷ board width"]), 0), num("pieces", "Number of Pieces", 10, 1000000), num("pieceLength", "Length per Piece", 8, 100000, 0.1), dropdown("pieceUnit", "Piece Length Unit", opts(["Feet", "Inches", "Meters"]), 0), num("area", "Area (sq ft)", 100, 10000000), num("boardWidth", "Board / Material Width (in)", 5.5, 120, 0.125), cur("pricePerFoot", "Price per Linear Foot (optional)", 0, 10000, 0.01)],
    results: [["linearFeet", "Linear Feet", "n"], ["linearYards", "Linear Yards", "n"], ["meters", "Meters", "n"], ["inches", "Inches", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.linearFeet, ex: { mode: 0, pieces: 10, pieceLength: 8, pieceUnit: 0, area: 100, boardWidth: 5.5, pricePerFoot: 0 },
    exText: (o) => `Example: ten 8 ft boards are ${o.linearFeet} linear feet (${o.meters} m).`,
    how: "Count pieces and their length, or switch to area mode to find how many linear feet of a given width cover a floor or wall.",
    assume: "Linear feet measure length only. Area mode: LF = sq ft × 12 ÷ width in inches.",
    faq: [["How do I convert square feet to linear feet?", "Multiply square feet by 12 and divide by the board width in inches."]],
  }),
  mk({
    slug: "coverage-calculator", title: "Coverage Calculator",
    desc: "Calculate how many units of any product you need — paint, primer, sealer, adhesive, stain or bags — from area, coats and the coverage per unit on the label.",
    inputs: [num("area", "Total Area (sq ft)", 500, 10000000), num("exclude", "Area to Exclude (sq ft)", 40, 10000000), num("coats", "Coats / Layers", 2, 10, 1, 1), num("coveragePerUnit", "Coverage per Unit (sq ft)", 350, 100000, 1), waste(10), cur("unitPrice", "Price per Unit", 38, 10000, 0.25)],
    results: [["unitsNeeded", "Units to Buy", "n"], ["exactUnits", "Exact Units", "n"], ["totalCoverageNeeded", "Total Coverage Needed (sq ft)", "n"], ["leftoverCoverage", "Leftover Coverage (sq ft)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.coverage, ex: { area: 500, exclude: 40, coats: 2, coveragePerUnit: 350, waste: 10, unitPrice: 38 },
    exText: (o) => `Example: two coats over 460 sq ft with a product that covers 350 sq ft per gallon needs ${o.exactUnits} gallons — buy ${o.unitsNeeded}, about ${usd(o.totalCost)}.`,
    how: "Enter the area, anything to exclude (doors, windows), coats and the coverage per unit from the product label.",
    assume: "Units = area × coats × (1 + waste) ÷ coverage per unit, rounded up. Rough or porous surfaces can cut coverage by 20–40%.",
    faq: [["How much does a gallon of paint cover?", "About 350–400 sq ft per coat on smooth walls."]],
  }),
  mk({
    slug: "sealant-calculator", title: "Sealant & Caulk Calculator",
    desc: "Calculate caulk or sealant cartridges, sausages or pails for a joint — by joint width, depth and length — with linear feet per tube and backer rod.",
    meta: "Sealant Calculator — Caulk Tubes per Joint (Tremco-style)",
    inputs: [num("length", "Joint Length (ft)", 100, 1000000), num("jointWidth", "Joint Width (in)", 0.5, 4, 0.0625), num("jointDepth", "Sealant Depth (in)", 0.25, 2, 0.0625), dropdown("pack", "Package", opts(E.SEALANT_PACKS.map(([n]) => n)), 0), waste(10), cur("unitPrice", "Price per Package", 9, 1000, 0.1)],
    results: [["unitsNeeded", "Packages Needed", "n"], ["linearFeetPerUnit", "Linear Feet per Package", "n"], ["cubicInches", "Sealant Volume (in³)", "n"], ["gallons", "Gallons", "n"], ["backerRodFeet", "Backer Rod (ft)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.sealant, ex: { length: 100, jointWidth: 0.5, jointDepth: 0.25, pack: 0, waste: 10, unitPrice: 9 },
    exText: (o) => `Example: 100 ft of 1/2 × 1/4 in joint needs ${o.cubicInches} in³ — ${o.unitsNeeded} cartridges of 10.1 oz (${o.linearFeetPerUnit} ft each).`,
    how: "Enter the joint length, width and the sealant depth (usually half the width, min 1/4 in, set by backer rod). Manufacturer yield charts (Tremco, Sika, DOW) use the same geometry.",
    assume: "10.1 fl oz cartridge = 18.2 in³, 20 oz sausage = 36.1 in³, 1 gal = 231 in³. Width-to-depth ratio of about 2:1 is standard for moving joints.",
    faq: [["How many feet does a tube of caulk do?", "A 10.1 oz tube runs about 24 ft at 1/4 × 1/4 in, or 12 ft at 1/2 × 1/4 in."]],
  }),
  mk({
    slug: "material-estimator-calculator", title: "Building Material Estimator",
    desc: "Build a quick material takeoff — up to six line items with quantity and unit price, plus waste allowance, sales tax and delivery — for a total material budget.",
    meta: "Material Estimator & Takeoff Calculator",
    inputs: [...qty(1, "Item 1", 120, 4.25), ...qty(2, "Item 2", 40, 15.75), ...qty(3, "Item 3", 30, 6.5), ...qty(4, "Item 4", 10, 12), ...qty(5, "Item 5", 0, 0), ...qty(6, "Item 6", 0, 0), waste(10), pct("taxRate", "Sales Tax", 7, 20, 0.05), cur("delivery", "Delivery", 75, 10000)],
    results: [["grandTotal", "Grand Total", "c"], ["materialsSubtotal", "Materials Subtotal", "c"], ["wasteAllowance", "Waste Allowance", "c"], ["salesTax", "Sales Tax", "c"], ["line1", "Item 1", "c"], ["line2", "Item 2", "c"], ["line3", "Item 3", "c"], ["line4", "Item 4", "c"], ["line5", "Item 5", "c"], ["line6", "Item 6", "c"]],
    fn: E.materialEstimator, ex: { qty1: 120, price1: 4.25, qty2: 40, price2: 15.75, qty3: 30, price3: 6.5, qty4: 10, price4: 12, qty5: 0, price5: 0, qty6: 0, price6: 0, waste: 10, taxRate: 7, delivery: 75 },
    exText: (o) => `Example: 120 studs, 40 drywall sheets, 30 bags and 10 boxes of screws come to ${usd(o.materialsSubtotal)}; with 10% waste, 7% tax and delivery the budget is ${usd(o.grandTotal)}.`,
    how: "Enter each material's quantity and unit price (leave unused lines at zero), then your waste allowance, sales tax rate and delivery.",
    assume: "Waste is applied to the subtotal before tax; tax is charged on materials plus waste; delivery isn't taxed.",
    faq: [["What is a material takeoff?", "A list of every material and quantity needed for a job, priced to build the estimate."]],
  }),
  mk({
    slug: "marble-calculator", title: "Marble Calculator",
    desc: "Calculate marble tiles or slabs for a floor, wall or countertop — pieces, square feet to buy, weight and material and installed cost.",
    inputs: [num("length", "Length (ft)", 12, 1000, 0.25), num("width", "Width (ft)", 10, 1000, 0.25), dropdown("format", "Tile / Slab Size", opts(E.MARBLE_FORMATS.map(([n]) => n)), 1), dropdown("thickness", "Thickness", opts(["3/8 in tile", "2 cm slab", "3 cm slab"]), 0), waste(10), cur("pricePerSqFt", "Material Price per Sq Ft", 12, 500, 0.25), cur("laborPerSqFt", "Installation per Sq Ft", 10, 200, 0.25)],
    results: [["piecesNeeded", "Pieces Needed", "n"], ["sqFtToBuy", "Sq Ft to Buy", "n"], ["areaSqFt", "Area (sq ft)", "n"], ["weightLb", "Weight (lb)", "n"], ["materialCost", "Material Cost", "c"], ["installedCost", "Installed Cost", "c"]],
    fn: E.marble, ex: { length: 12, width: 10, format: 1, thickness: 0, waste: 10, pricePerSqFt: 12, laborPerSqFt: 10 },
    exText: (o) => `Example: a 12 × 10 ft floor in 18 × 18 in marble tile needs ${o.piecesNeeded} tiles (${o.sqFtToBuy} sq ft) weighing about ${fmt(o.weightLb, 0)} lb — ${usd(o.installedCost)} installed.`,
    how: "Enter the area, tile or slab size and thickness, waste (10% straight lay, 15% diagonal) and prices.",
    assume: "Marble density ≈ 168 lb/ft³ (2.7 g/cm³). Slabs are priced by the full slab area.",
    faq: [["How much does marble weigh per square foot?", "About 5 lb for 3/8 in tile, 11 lb for 2 cm and 17 lb for 3 cm slab."]],
  }),
  mk({
    slug: "construction-bid-calculator", title: "Construction Bid Calculator",
    desc: "Price a construction job or bid — materials, burdened labor, equipment, subs, contingency, overhead and profit — with gross margin and markup.",
    meta: "Construction Bid & Estimating Calculator",
    inputs: [cur("materials", "Materials", 18000, 100000000), num("laborHours", "Labor Hours", 320, 1000000), cur("laborRate", "Labor Rate per Hour", 35, 1000, 0.5), pct("laborBurden", "Labor Burden (taxes, insurance)", 30, 100, 1), cur("equipment", "Equipment Rental", 2500, 10000000), cur("subcontractors", "Subcontractors", 6000, 100000000), cur("permits", "Permits & Fees", 800, 1000000), pct("contingency", "Contingency", 5, 50, 0.5), pct("overhead", "Overhead", 12, 100, 0.5), pct("profit", "Profit", 10, 100, 0.5)],
    results: [["bidPrice", "Bid Price", "c"], ["directCost", "Direct Cost", "c"], ["laborCost", "Burdened Labor", "c"], ["contingencyAmount", "Contingency", "c"], ["overheadAmount", "Overhead", "c"], ["profitAmount", "Profit", "c"], ["grossMarginPercent", "Gross Margin on Bid", "p"], ["markupOnDirectPercent", "Markup on Direct Cost", "p"]],
    fn: E.constructionBid, ex: { materials: 18000, laborHours: 320, laborRate: 35, laborBurden: 30, equipment: 2500, subcontractors: 6000, permits: 800, contingency: 5, overhead: 12, profit: 10 },
    exText: (o) => `Example: ${usd(o.directCost)} of direct cost (including ${usd(o.laborCost)} of burdened labor) with 5% contingency, 12% overhead and 10% profit gives a bid of ${usd(o.bidPrice)} — a ${o.grossMarginPercent}% margin.`,
    how: "Enter direct costs, then contingency, overhead and profit percentages. Works for general bids, job pricing and estimating any trade.",
    assume: "Contingency is applied to direct cost; overhead to direct + contingency; profit to total cost. Margin = (bid − direct) ÷ bid.",
    faq: [["What's the difference between markup and margin?", "Markup is a percentage of cost; margin is a percentage of the selling price — a 25% markup is a 20% margin."], ["What overhead and profit should a contractor charge?", "Commonly 10–20% overhead and 5–15% profit, depending on trade and risk."]],
  }),
  mk({
    slug: "bison-pedestal-calculator", title: "Paver Pedestal Calculator (Bison-Style)",
    desc: "Calculate adjustable pedestals and pavers for a raised paver or tile deck — pedestal grid count, perimeter pedestals, average height and cost.",
    meta: "Pedestal Paver Calculator — Bison-Style Deck Pedestals",
    inputs: [num("length", "Deck Length (ft)", 20, 1000, 0.5), num("width", "Deck Width (ft)", 12, 1000, 0.5), dropdown("paverSize", "Paver Size", opts(E.PAVER_SIZES.map(([n]) => n)), 0), num("minHeight", "Lowest Height (in)", 2, 40, 0.25), num("maxHeight", "Highest Height (in)", 4, 40, 0.25), waste(5), cur("pedestalPrice", "Price per Pedestal", 9, 200, 0.25), cur("paverPrice", "Price per Paver", 28, 500, 0.25)],
    results: [["pedestalsNeeded", "Pedestals Needed", "n"], ["paversNeeded", "Pavers Needed", "n"], ["perimeterPedestals", "Perimeter Pedestals", "n"], ["averageHeightIn", "Average Height (in)", "n"], ["pedestalCost", "Pedestal Cost", "c"], ["paverCost", "Paver Cost", "c"]],
    fn: E.pedestals, ex: { length: 20, width: 12, paverSize: 0, minHeight: 2, maxHeight: 4, waste: 5, pedestalPrice: 9, paverPrice: 28 },
    exText: (o) => `Example: a 20 × 12 ft roof deck in 24 × 24 in pavers needs ${o.paversNeeded} pavers and ${o.pedestalsNeeded} pedestals at an average height of ${o.averageHeightIn} in.`,
    how: "Enter the deck size, paver size and the lowest and highest pedestal heights (slope). Use the average height to pick the pedestal model from your supplier's chart. Independent calculator — not affiliated with any manufacturer.",
    assume: "One pedestal at every paver corner: (columns + 1) × (rows + 1). Edge pedestals are often cut or use half-tabs.",
    faq: [["How many pedestals per paver?", "About one per paver in the field, since each pedestal supports four corners."]],
  }),
  mk({
    slug: "blown-in-insulation-calculator", title: "Blown-In Insulation Calculator",
    desc: "Calculate bags of blown-in attic insulation — fiberglass, cellulose or mineral wool — to reach R-30, R-38, R-49 or R-60, with depth to add and cost.",
    meta: "Blow In Insulation Calculator — Bags to Reach R-49",
    inputs: [num("area", "Attic Floor Area (sq ft)", 1000, 100000), dropdown("material", "Material", opts(E.BLOWN.map(([n, r]) => `${n} (R-${r}/in)`)), 1), dropdown("targetR", "Target R-Value", opts(E.R_TARGETS.map((r) => `R-${r}`)), 2), num("existingR", "Existing R-Value", 11, 60, 1), num("bagWeight", "Bag Weight (lb)", 25, 40, 0.5, 5), waste(5), cur("bagPrice", "Price per Bag", 14, 100, 0.25), cur("proPerSqFt", "Professional Price per Sq Ft", 1.75, 10, 0.05)],
    results: [["bagsNeeded", "Bags Needed", "n"], ["inchesToAdd", "Inches to Add", "n"], ["rValueAdded", "R-Value Added", "n"], ["poundsNeeded", "Pounds Needed", "n"], ["materialCost", "DIY Material Cost", "c"], ["proCost", "Professional Cost", "c"]],
    fn: E.blownInsulation, ex: { area: 1000, material: 1, targetR: 2, existingR: 11, bagWeight: 25, waste: 5, bagPrice: 14, proPerSqFt: 1.75 },
    exText: (o) => `Example: topping up 1,000 sq ft from R-11 to R-49 with cellulose adds ${o.inchesToAdd} in — about ${o.bagsNeeded} bags (${usd(o.materialCost)} DIY vs ${usd(o.proCost)} installed).`,
    how: "Enter the attic floor area, existing R-value (about R-3 per inch of old batts) and your target. Check the bag chart on your product — it gives bags per 1,000 sq ft by R-value.",
    assume: "Fiberglass ≈ R-2.6/in at 0.4 lb/ft³; cellulose ≈ R-3.6/in at 1.5 lb/ft³ settled; mineral wool ≈ R-3.0/in at 2 lb/ft³. DOE recommends R-38 to R-60 for most US attics.",
    faq: [["How many bags of blown-in insulation do I need?", "Roughly 40–60 bags of cellulose per 1,000 sq ft to reach R-49 from an empty attic."]],
  }),
  mk({
    slug: "r-value-calculator", title: "R-Value Calculator",
    desc: "Add up the total R-value of a wall, roof or floor assembly from up to four layers — then see the U-factor, heat loss in BTU per hour and metric RSI.",
    inputs: [dropdown("material1", "Layer 1", opts(E.R_MATERIALS.map(([n, r]) => (r ? `${n} (R-${r}/in)` : n))), 12), num("thickness1", "Layer 1 Thickness (in)", 0.5, 48, 0.125), dropdown("material2", "Layer 2", opts(E.R_MATERIALS.map(([n, r]) => (r ? `${n} (R-${r}/in)` : n))), 1), num("thickness2", "Layer 2 Thickness (in)", 3.5, 48, 0.125), dropdown("material3", "Layer 3", opts(E.R_MATERIALS.map(([n, r]) => (r ? `${n} (R-${r}/in)` : n))), 10), num("thickness3", "Layer 3 Thickness (in)", 0.5, 48, 0.125), dropdown("material4", "Layer 4", opts(E.R_MATERIALS.map(([n, r]) => (r ? `${n} (R-${r}/in)` : n))), 0), num("thickness4", "Layer 4 Thickness (in)", 0, 48, 0.125), yn("airFilms", "Include Air Films (R-0.85)?", 1), num("area", "Area (sq ft)", 100, 1000000), num("deltaT", "Indoor − Outdoor Temperature (°F)", 40, 150), num("heatingHours", "Heating Hours per Year", 3000, 8760, 10)],
    results: [["totalRValue", "Total R-Value", "n"], ["uFactor", "U-Factor (BTU/h·ft²·°F)", "n"], ["heatLossBtuPerHour", "Heat Loss (BTU/h)", "n"], ["rsiMetric", "RSI (m²·K/W)", "n"], ["annualHeatLossTherms", "Annual Heat Loss (therms)", "n"]],
    fn: E.rValue, ex: { material1: 12, thickness1: 0.5, material2: 1, thickness2: 3.5, material3: 10, thickness3: 0.5, material4: 0, thickness4: 0, airFilms: 1, area: 100, deltaT: 40, heatingHours: 3000 },
    exText: (o) => `Example: 1/2 in drywall + 3.5 in fiberglass batt + 1/2 in OSB with air films is about R-${o.totalRValue} through the insulated bay (U = ${o.uFactor}), losing ${fmt(o.heatLossBtuPerHour, 0)} BTU/h per 100 sq ft at a 40 °F difference.`,
    how: "Choose each layer's material and thickness from inside to outside. Leave unused layers as None.",
    assume: "R-values add in series; this ignores thermal bridging through studs, which lowers a 2×4 wall's whole-wall R-value by roughly 15–25%.",
    faq: [["What is a good R-value for walls?", "R-13 to R-21 in 2×4 and 2×6 walls; codes in cold zones require continuous exterior insulation too."]],
  }),
  mk({
    slug: "spray-foam-calculator", title: "Spray Foam Insulation Calculator",
    desc: "Calculate spray foam board feet for open- or closed-cell foam — R-value achieved, DIY kits needed, professional cost and how many sets a contractor uses.",
    meta: "Spray Foam Calculator — Board Feet, Kits & Cost",
    inputs: [num("area", "Area (sq ft)", 500, 1000000), num("thickness", "Thickness (in)", 2, 12, 0.5), dropdown("foam", "Foam Type", opts(["Open-cell (R-3.6/in)", "Closed-cell (R-6.5/in)"]), 1), waste(10), num("kitBoardFeet", "DIY Kit Size (board feet)", 600, 5000, 1, 10), cur("kitPrice", "Price per Kit", 720, 10000, 5), cur("proPerBoardFoot", "Professional Price per Board Foot", 1.25, 5, 0.01)],
    results: [["boardFeet", "Board Feet", "n"], ["rValue", "R-Value Achieved", "n"], ["diyKits", "DIY Kits Needed", "n"], ["diyCost", "DIY Kit Cost", "c"], ["proCost", "Professional Cost", "c"], ["setsForPro", "Contractor Sets (approx.)", "n"]],
    fn: E.sprayFoam, ex: { area: 500, thickness: 2, foam: 1, waste: 10, kitBoardFeet: 600, kitPrice: 720, proPerBoardFoot: 1.25 },
    exText: (o) => `Example: 2 in of closed-cell foam over 500 sq ft is ${o.boardFeet} board feet (R-${o.rValue}) — ${o.diyKits} DIY kits (${usd(o.diyCost)}) or about ${usd(o.proCost)} installed.`,
    how: "Enter the area and thickness. A spray-foam board foot is 1 sq ft at 1 in thick.",
    assume: "Typical 2026 installed prices: closed-cell $1.00–1.50, open-cell $0.45–0.65 per board foot. Contractor sets yield about 4,000–5,000 BF closed-cell and 15,000–17,000 BF open-cell.",
    faq: [["How much does spray foam cost?", "About $1–1.50 per board foot for closed-cell and $0.45–0.65 for open-cell, installed."]],
  }),
  mk({
    slug: "gutter-coil-calculator", title: "Gutter Coil Calculator",
    desc: "Calculate aluminum coil for seamless gutters — coil feet and rolls by gutter size, coil weight, hangers, downspouts and end caps.",
    inputs: [num("gutterLength", "Total Gutter Run (ft)", 150, 100000), dropdown("gutter", "Gutter Size", opts(E.GUTTER_COIL.map(([n]) => n)), 0), num("corners", "Miters / Corners", 6, 200), num("runs", "Separate Runs", 4, 200, 1, 1), num("thickness", "Coil Thickness (in)", 0.027, 0.04, 0.001, 0.019), num("coilLength", "Coil Length per Roll (ft)", 500, 5000, 10, 50), num("hangerSpacing", "Hanger Spacing (ft)", 2, 3, 0.5, 1), cur("coilPricePerFoot", "Coil Price per Foot", 1.1, 20, 0.01)],
    results: [["coilFeetNeeded", "Coil Needed (ft)", "n"], ["coilRolls", "Coil Rolls", "n"], ["coilWeightLb", "Coil Weight (lb)", "n"], ["hangers", "Hangers", "n"], ["downspouts", "Downspouts (≈ 1 per 35 ft)", "n"], ["endCaps", "End Caps", "n"], ["coilCost", "Coil Cost", "c"]],
    fn: E.gutterCoil, ex: { gutterLength: 150, gutter: 0, corners: 6, runs: 4, thickness: 0.027, coilLength: 500, hangerSpacing: 2, coilPricePerFoot: 1.1 },
    exText: (o) => `Example: 150 ft of 5 in K-style gutter with 6 miters and 4 runs uses ${o.coilFeetNeeded} ft of 11⅞ in coil (${fmt(o.coilWeightLb, 0)} lb), ${o.hangers} hangers and about ${o.downspouts} downspouts.`,
    how: "Enter the total gutter length, size, number of corners and separate runs. Coil comes in rolls by length or weight — use your supplier's roll length.",
    assume: "2 ft of coil per miter and 1 ft per run for end trims. Aluminum ≈ 0.0975 lb/in³, so 0.027 in × 11⅞ in coil weighs about 0.375 lb/ft.",
    faq: [["What size coil for 5 inch gutters?", "11⅞ in wide coil; 6 in gutters use 15 in coil."]],
  }),
  mk({
    slug: "drop-ceiling-calculator", title: "Drop Ceiling Calculator",
    desc: "Calculate a suspended (drop) ceiling grid — 2×2 or 2×4 tiles, 12 ft main tees, 4 ft and 2 ft cross tees, wall angle and hanger wires — with cost.",
    meta: "Drop Ceiling Grid Calculator — Tiles, Tees & Wall Angle",
    inputs: [num("length", "Room Length (ft)", 20, 1000, 0.5), num("width", "Room Width (ft)", 12, 1000, 0.5), dropdown("panel", "Panel Size", opts(["2 × 2 ft", "2 × 4 ft"]), 0), waste(5), cur("panelPrice", "Price per Panel", 4, 200, 0.05), cur("gridPerSqFt", "Grid Cost per Sq Ft", 0.9, 10, 0.05)],
    results: [["panels", "Ceiling Panels", "n"], ["mainTees12Ft", "12 ft Main Tees", "n"], ["crossTees4Ft", "4 ft Cross Tees", "n"], ["crossTees2Ft", "2 ft Cross Tees", "n"], ["wallAngle10Ft", "10 ft Wall Angle", "n"], ["hangerWires", "Hanger Wires", "n"], ["areaSqFt", "Area (sq ft)", "n"], ["totalCost", "Material Cost", "c"]],
    fn: E.dropCeiling, ex: { length: 20, width: 12, panel: 0, waste: 5, panelPrice: 4, gridPerSqFt: 0.9 },
    exText: (o) => `Example: a 20 × 12 ft room in 2×2 tiles needs ${o.panels} panels, ${o.mainTees12Ft} main tees, ${o.crossTees4Ft} 4 ft and ${o.crossTees2Ft} 2 ft cross tees and ${o.wallAngle10Ft} pieces of wall angle.`,
    how: "Enter the room size and panel size. Mains run the long way, 4 ft apart.",
    assume: "Main tees every 4 ft, cross tees every 2 ft, hanger wires every 4 ft along each main. Balance the border tiles so edge rows are at least half a tile.",
    faq: [["How many ceiling tiles do I need?", "Divide the room area by 4 sq ft for 2×2 tiles or 8 sq ft for 2×4, then add 5–10%."]],
  }),
  mk({
    slug: "epoxy-calculator", title: "Epoxy Calculator (How Much Epoxy Do I Need?)",
    desc: "Calculate epoxy resin for a river table, tabletop pour or casting by volume — or for a floor coating by area and mils — with part A/B split, kits and cost.",
    meta: "Epoxy Calculator — How Much Epoxy Resin Do I Need",
    inputs: [dropdown("mode", "Project", opts(["Pour / casting / river table (volume)", "Floor or countertop coating (area × mils)"]), 0), num("length", "Pour Length (in)", 72, 1000, 0.25), num("width", "Pour Width (in)", 12, 1000, 0.25), num("depth", "Pour Depth (in)", 1, 12, 0.0625), pct("fillPercent", "Share of Area Filled With Epoxy", 100, 100, 1), num("area", "Coating Area (sq ft)", 500, 100000), num("mils", "Coating Thickness (mils)", 10, 250, 1), num("coats", "Coats", 2, 5, 1, 1), pct("solids", "Solids Content", 100, 100, 1), dropdown("ratio", "Mix Ratio (A:B)", opts(["1:1", "2:1", "3:1"]), 0), waste(10), num("kitGallons", "Kit Size (gallons)", 1, 20, 0.25, 0.1), cur("kitPrice", "Price per Kit", 95, 5000, 0.5)],
    results: [["totalGallons", "Epoxy Needed (gallons)", "n"], ["liters", "Liters", "n"], ["partAGallons", "Part A (resin, gal)", "n"], ["partBGallons", "Part B (hardener, gal)", "n"], ["kitsNeeded", "Kits Needed", "n"], ["weightLb", "Weight (lb)", "n"], ["totalCost", "Total Cost", "c"]],
    fn: E.epoxy, ex: { mode: 0, length: 72, width: 12, depth: 1, fillPercent: 100, area: 500, mils: 10, coats: 2, solids: 100, ratio: 0, waste: 10, kitGallons: 1, kitPrice: 95 },
    exText: (o) => `Example: a 72 × 12 in river 1 in deep needs ${o.totalGallons} gallons of epoxy with 10% extra (${o.liters} L) — ${o.kitsNeeded} one-gallon kits.`,
    how: "For pours, enter the cavity size and depth (use the fill share for a river through a slab). For coatings, enter the area, film thickness in mils and coats. Check your product's maximum pour depth per layer.",
    assume: "1 US gallon = 231 in³ and covers 1,604 sq ft at 1 mil when 100% solids. Epoxy weighs about 9.2 lb per gallon.",
    faq: [["How much epoxy for a river table?", "Length × width × depth in inches ÷ 231 gives gallons — a 72 × 12 × 1 in river takes about 3.7 gal plus waste."], ["How much epoxy for a garage floor?", "About 1 gallon per 160 sq ft at 10 mils for a 100% solids product."]],
  }),
  mk({
    slug: "vapor-barrier-cost-calculator", title: "Vapor Barrier Cost Calculator",
    desc: "Estimate crawl space or slab vapor barrier cost — square feet with overlap, rolls, seam tape, material cost by thickness (6–20 mil) and professional install.",
    inputs: [num("length", "Length (ft)", 40, 1000, 0.5), num("width", "Width (ft)", 30, 1000, 0.5), dropdown("coverWalls", "Also Cover Walls?", opts(["Floor only", "Floor + walls (encapsulation)"]), 0), num("wallHeight", "Wall Height (ft)", 3, 20, 0.5), dropdown("thickness", "Barrier", opts(E.VAPOR.map(([n, p]) => `${n} (~$${p}/sq ft)`)), 2), cur("pricePerSqFt", "Your Price per Sq Ft (0 = default)", 0, 10, 0.01), pct("overlap", "Seam Overlap", 10, 30, 1), cur("proPerSqFt", "Professional Installed per Sq Ft", 1.5, 15, 0.05)],
    results: [["materialCost", "DIY Material Cost", "c"], ["proInstalledCost", "Professional Installed Cost", "c"], ["sqFtToBuy", "Sq Ft to Buy", "n"], ["rolls10x100", "10 × 100 ft Rolls", "n"], ["seamTapeRolls", "Seam Tape Rolls", "n"], ["coveredAreaSqFt", "Covered Area (sq ft)", "n"]],
    fn: E.vaporBarrier, ex: { length: 40, width: 30, coverWalls: 0, wallHeight: 3, thickness: 2, pricePerSqFt: 0, overlap: 10, proPerSqFt: 1.5 },
    exText: (o) => `Example: a 40 × 30 ft crawl space floor in 12 mil reinforced liner needs ${fmt(o.sqFtToBuy, 0)} sq ft (${o.rolls10x100} rolls) — about ${usd(o.materialCost)} DIY or ${usd(o.proInstalledCost)} installed.`,
    how: "Enter the space size, whether walls are included, the barrier thickness, and adjust prices to your quotes.",
    assume: "Overlap 6–12 in at seams (≈ 10%). Full crawl-space encapsulation with dehumidifier typically costs $3–8 per sq ft; a plain barrier $0.75–2.",
    faq: [["What thickness vapor barrier for a crawl space?", "At least 6 mil; 10–20 mil reinforced liners last longer where people crawl."]],
  }),
  mk({
    slug: "beam-load-calculator", title: "Beam Load Calculator",
    desc: "Calculate reactions, maximum bending moment, shear and deflection for a simply supported beam with a uniform load and a center point load.",
    inputs: [num("span", "Span (ft)", 12, 200, 0.25), num("uniformLoad", "Uniform Load (lb per ft)", 400, 100000, 10), num("pointLoad", "Center Point Load (lb)", 0, 1000000, 10), dropdown("material", "Material (modulus E)", opts(["Douglas fir (1.6M psi)", "Southern pine (1.4M psi)", "LVL (2.0M psi)", "Glulam (1.8M psi)", "Steel (29M psi)"]), 2), num("momentOfInertia", "Moment of Inertia I (in⁴)", 415, 100000, 0.1), num("sectionModulus", "Section Modulus S (in³)", 73, 10000, 0.1)],
    results: [["maxMomentFtLb", "Max Bending Moment (ft-lb)", "n"], ["maxShearLb", "Max Shear (lb)", "n"], ["reactionEachLb", "Reaction at Each Support (lb)", "n"], ["maxDeflectionIn", "Max Deflection (in)", "n"], ["spanOverDeflection", "Deflection Ratio (L/Δ)", "n"], ["bendingStressPsi", "Bending Stress (psi)", "n"]],
    fn: E.beamLoad, ex: { span: 12, uniformLoad: 400, pointLoad: 0, material: 2, momentOfInertia: 415, sectionModulus: 73 },
    exText: (o) => `Example: a 12 ft LVL (I = 415 in⁴) with 400 lb/ft has ${fmt(o.maxMomentFtLb, 0)} ft-lb of moment, ${fmt(o.reactionEachLb, 0)} lb at each support and deflects ${o.maxDeflectionIn} in (L/${fmt(o.spanOverDeflection, 0)}).`,
    how: "Enter the span, loads, material and the section properties (I and S) from the beam's spec sheet. A 2-ply 1.75 × 11.875 in LVL has I ≈ 488 in⁴, S ≈ 82 in³.",
    assume: "Simply supported: M = wL²/8 + PL/4, V = wL/2 + P/2, Δ = 5wL⁴/384EI + PL³/48EI. Self-weight should be included in the uniform load.",
    faq: [["What deflection limit should a floor beam meet?", "L/360 under live load is the usual floor limit; L/240 for total load."]],
  }),
  mk({
    slug: "beam-span-calculator", title: "Beam Size & Span Calculator",
    desc: "Find the beam depth needed for a span — sawn lumber, LVL or glulam — from tributary width and floor loads, checking bending, shear and deflection.",
    meta: "Beam Size Calculator — Wood, LVL & Glulam Span",
    inputs: [num("span", "Beam Span (ft)", 12, 60, 0.25), num("tributaryWidth", "Tributary Width (ft)", 10, 60, 0.25), num("liveLoad", "Live Load (psf)", 40, 300, 5), num("deadLoad", "Dead Load (psf)", 10, 200, 5), dropdown("material", "Beam Material", opts(E.BEAM_MATERIALS.map(([n]) => n)), 2), num("plies", "Number of Plies (sawn / LVL)", 2, 4, 1, 1), dropdown("deflectionLimit", "Live-Load Deflection Limit", opts(["L/360 (floors)", "L/240 (roofs)", "L/480 (stone / tile)"]), 0)],
    results: [["recommendedDepthIn", "Smallest Depth That Works (in)", "n"], ["beamWidthIn", "Beam Width (in)", "n"], ["utilizationPercent", "Utilization", "p"], ["totalLoadPlf", "Total Load (lb/ft)", "n"], ["maxMomentFtLb", "Max Moment (ft-lb)", "n"], ["maxShearLb", "Max Shear (lb)", "n"], ["allowableDeflectionIn", "Allowable Deflection (in)", "n"], ["noSizeWorks", "No Listed Size Works (1 = yes)", "n"]],
    fn: E.beamSpan, ex: { span: 12, tributaryWidth: 10, liveLoad: 40, deadLoad: 10, material: 2, plies: 2, deflectionLimit: 0 },
    exText: (o) => `Example: a 12 ft beam carrying 10 ft of floor (40 + 10 psf) is ${o.totalLoadPlf} lb/ft; a 2-ply LVL needs at least ${o.recommendedDepthIn} in depth (${o.utilizationPercent}% utilized).`,
    how: "Enter the span, the width of floor or roof the beam supports (half the joist span on each side), loads and beam type.",
    assume: "Simple span; NDS reference values with load-duration, size and repetitive factors = 1.0; shear at the support; no notches. This is a preliminary sizing aid — have beams verified by an engineer or code span table.",
    faq: [["How do I find tributary width?", "Add half the joist span on each side of the beam."]],
  }),
  mk({
    slug: "wind-load-calculator", title: "Wind Load Calculator",
    desc: "Calculate wind pressure and force with the ASCE 7 velocity pressure formula — Kz by exposure and height, design pressure in psf and kPa, and total force on an area.",
    meta: "Wind Load Calculator — ASCE 7 Wind Pressure",
    inputs: [num("windSpeed", "Basic Wind Speed (mph)", 115, 250, 1, 60), dropdown("exposure", "Exposure Category", opts(["B (urban / suburban)", "C (open terrain)", "D (flat, open coastline)"]), 1), num("height", "Height Above Ground (ft)", 30, 2000, 1), num("kzt", "Topographic Factor Kzt", 1, 3, 0.01, 1), num("kd", "Directionality Factor Kd", 0.85, 1, 0.01, 0.5), num("ke", "Ground Elevation Factor Ke", 1, 1.2, 0.01, 0.5), num("pressureCoefficient", "Net Pressure Coefficient (G·Cp − G·Cpi)", 1, 3, 0.01, 0), num("area", "Surface Area (sq ft)", 100, 1000000)],
    results: [["designPressurePsf", "Design Pressure (psf)", "n"], ["velocityPressurePsf", "Velocity Pressure qz (psf)", "n"], ["kz", "Kz", "n"], ["windForceLb", "Wind Force on Area (lb)", "n"], ["designPressureKpa", "Design Pressure (kPa)", "n"]],
    fn: E.windLoad, ex: { windSpeed: 115, exposure: 1, height: 30, kzt: 1, kd: 0.85, ke: 1, pressureCoefficient: 1, area: 100 },
    exText: (o) => `Example: 115 mph, exposure C at 30 ft gives Kz = ${o.kz} and qz = ${o.velocityPressurePsf} psf; with a net coefficient of 1.0, a 100 sq ft sign sees about ${fmt(o.windForceLb, 0)} lb.`,
    how: "Find the basic wind speed for your site on the ASCE wind map (or local code), choose the exposure and height, and enter the net pressure coefficient for the element.",
    assume: "ASCE 7-16: qz = 0.00256 Kz Kzt Kd Ke V², with Kz = 2.01 (z/zg)^(2/α) and z ≥ 15 ft. Design pressures for components and cladding need the GCp tables — this tool does not replace a full code analysis.",
    faq: [["How do I convert wind speed to pressure?", "Roughly 0.00256 × V² psf at ground-level exposure — about 34 psf at 115 mph before factors."]],
  }),
  mk({
    slug: "well-drilling-cost-calculator", title: "Well Drilling Cost Calculator",
    desc: "Estimate water well drilling cost — drilling per foot by geology, casing, pump system, permits and water testing — with total, cost per foot and a range.",
    inputs: [num("depth", "Well Depth (ft)", 250, 3000, 5), cur("drillPerFoot", "Drilling Price per Foot", 30, 200, 0.5), dropdown("geology", "Ground Conditions", opts(["Soft soil / sand", "Mixed", "Hard rock"]), 1), num("casingFeet", "Casing Length (ft)", 80, 3000, 5), cur("casingPerFoot", "Casing Price per Foot", 18, 200, 0.5), yn("includePump", "Include Pump, Tank & Wiring?", 1), cur("pumpSystem", "Pump System Cost", 3500, 30000, 50), cur("permitsTesting", "Permits & Water Testing", 600, 10000, 10)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["drillingCost", "Drilling", "c"], ["casingCost", "Casing", "c"], ["pumpSystemCost", "Pump System", "c"], ["costPerFoot", "All-In Cost per Foot", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.wellDrilling, ex: { depth: 250, drillPerFoot: 30, geology: 1, casingFeet: 80, casingPerFoot: 18, includePump: 1, pumpSystem: 3500, permitsTesting: 600 },
    exText: (o) => `Example: a 250 ft residential well with 80 ft of casing and a pump system costs about ${usd(o.totalCost)} (${usd(o.lowEstimate)}–${usd(o.highEstimate)}), or ${usd(o.costPerFoot)} per foot all-in.`,
    how: "Ask local drillers for typical depth and price per foot, then adjust for ground conditions.",
    assume: "2026 typical residential drilling $25–65 per ft depending on rock, casing $15–30 per ft, submersible pump system $2,000–5,000.",
    faq: [["How much does it cost to drill a well?", "Usually $8,000–25,000 for a home well with pump, depending on depth and geology."]],
  }),
  mk({
    slug: "construction-bond-cost-calculator", title: "Construction Bond Cost Calculator",
    desc: "Estimate the premium for a construction performance and payment bond — using the standard tiered rate schedule — adjusted for credit, with the effective rate.",
    meta: "Construction Bond Cost Calculator — Performance Bond Premium",
    inputs: [cur("contractAmount", "Contract / Bond Amount", 750000, 1000000000, 1000), dropdown("credit", "Contractor Credit & Financials", opts(["Standard (good credit, solid financials)", "Mid-market", "Sub-standard / high risk"]), 0), yn("maintenanceBond", "Include Maintenance Period (+10%)?"), cur("minimumPremium", "Minimum Premium", 250, 10000, 10)],
    results: [["bondPremium", "Estimated Bond Premium", "c"], ["effectiveRatePercent", "Effective Rate", "p"], ["standardPremium", "Standard-Market Premium", "c"], ["bondAmount", "Bond Amount", "c"]],
    fn: E.bondCost, ex: { contractAmount: 750000, credit: 0, maintenanceBond: 0, minimumPremium: 250 },
    exText: (o) => `Example: a $750,000 contract on the standard schedule costs about ${usd(o.bondPremium)} to bond — an effective ${o.effectiveRatePercent}%.`,
    how: "Enter the contract amount and choose your credit tier. Performance and payment bonds are usually priced together on the contract value.",
    assume: "Standard schedule: 2.5% of the first $100k, 1.5% of the next $400k, 1.0% of the next $2M, 0.75% of the next $2.5M and 0.7% above $5M. Sub-standard credit can pay 2–4× more.",
    faq: [["How much does a performance bond cost?", "Usually 0.5–3% of the contract amount, falling as the job gets bigger."]],
  }),
  mk({
    slug: "5-cut-calculator", title: "5 Cut Calculator (Table Saw Sled)",
    desc: "Calibrate a table saw crosscut sled or miter gauge with the five-cut method — error per cut, angle error and how far to move the fence.",
    meta: "5 Cut Calculator — Square Your Table Saw Sled",
    inputs: [num("frontWidth", "Offcut Width at Front / Leading End (in)", 1.012, 10, 0.001), num("backWidth", "Offcut Width at Back / Trailing End (in)", 1, 10, 0.001), num("cutLength", "Length of the 5th Cut (in)", 12, 60, 0.125, 1), num("fenceLength", "Distance from Fence Pivot to Adjustment Point (in)", 24, 60, 0.125)],
    results: [["fenceAdjustmentIn", "Move the Fence End (in)", "n"], ["errorPerCutIn", "Error per Cut over the Board (in)", "n"], ["angleErrorDegrees", "Angle Error (degrees)", "n"], ["errorPerFootIn", "Error per Foot (in)", "n"], ["totalErrorIn", "Total Measured Error (in)", "n"]],
    fn: E.fiveCut, ex: { frontWidth: 1.012, backWidth: 1, cutLength: 12, fenceLength: 24 },
    exText: (o) => `Example: a 12 in offcut that's 0.012 in wider at one end means ${o.errorPerCutIn} in of error per cut (${o.angleErrorDegrees}°) — move the fence end ${o.fenceAdjustmentIn} in at 24 in from the pivot.`,
    how: "Cut all four edges of a square panel in turn, then rip a thin strip off the first edge (the 5th cut). Measure the strip at both ends with calipers and enter the widths.",
    assume: "The total error is four times the angle error, so error per cut = (A − B) ÷ 4. A wider leading end means the fence needs to rotate to make the cut more square.",
    faq: [["Why use the 5-cut method?", "It multiplies the error four times so you can measure tiny angle errors with calipers."]],
  }),
  mk({
    slug: "commercial-renovation-cost-calculator", title: "Commercial Renovation Cost per Square Foot Calculator",
    desc: "Estimate a commercial renovation by building type and scope — light, moderate or full gut — with soft costs, contingency, cost per square foot and a range.",
    meta: "Commercial Renovation Cost per Square Foot",
    inputs: [dropdown("type", "Building Type", opts(E.RENO.map(([n]) => n)), 0), dropdown("level", "Scope", opts(["Light / cosmetic", "Moderate", "Full gut / major"]), 1), num("area", "Area (sq ft)", 5000, 10000000, 10), region, pct("softCosts", "Soft Costs (design, permits, fees)", 15, 50, 0.5), pct("contingency", "Contingency", 10, 50, 0.5)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerSqFt", "All-In Cost per Sq Ft", "c"], ["constructionCost", "Construction (hard cost)", "c"], ["softCosts", "Soft Costs", "c"], ["contingencyAmount", "Contingency", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.commercialReno, ex: { type: 0, level: 1, area: 5000, regionAdjust: 0, softCosts: 15, contingency: 10 },
    exText: (o) => `Example: a moderate renovation of 5,000 sq ft of office space costs about ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft including soft costs and contingency.`,
    how: "Choose the building type and scope, enter the area, and adjust for your market (for example +25% in major metros).",
    assume: "2026 US hard-cost midpoints per sq ft (light / moderate / gut): office 30 / 80 / 160, retail 35 / 90 / 175, restaurant 75 / 200 / 350, medical 80 / 200 / 350, warehouse 15 / 45 / 100.",
    faq: [["How much does an office renovation cost per square foot?", "Roughly $30–60 for cosmetic updates, $60–120 moderate and $120–200+ for a full gut."]],
  }),
  mk({
    slug: "horizontal-directional-drilling-calculator", title: "Horizontal Directional Drill (HDD) Calculator",
    desc: "Calculate a directional bore — reamed hole size, hole and annular volume, drilling fluid, bentonite bags, cuttings and cost — from bore length and pipe size.",
    meta: "Horizontal Directional Drill Calculator — HDD Fluid & Cost",
    inputs: [num("boreLength", "Bore Length (ft)", 500, 20000, 5), num("pipeDiameter", "Product Pipe OD (in)", 6.625, 60, 0.125, 0.5), num("reamFactor", "Ream Factor (hole ÷ pipe OD)", 1.5, 2, 0.05, 1), num("fluidFactor", "Fluid Factor (× hole volume)", 3, 6, 0.5, 1), num("bentonitePer100Gal", "Bentonite (lb per 100 gal)", 25, 60, 1), cur("costPerFoot", "Bore Price per Foot", 45, 1000, 1), cur("mobilization", "Mobilization", 3500, 100000, 50)],
    results: [["reamedHoleDiameterIn", "Reamed Hole Diameter (in)", "n"], ["holeVolumeGallons", "Hole Volume (gal)", "n"], ["annularVolumeGallons", "Annular Volume (gal)", "n"], ["drillingFluidGallons", "Drilling Fluid Needed (gal)", "n"], ["bentoniteBags50lb", "Bentonite (50 lb bags)", "n"], ["cuttingsCubicYards", "Cuttings (yd³)", "n"], ["estimatedCost", "Estimated Cost", "c"]],
    fn: E.hdd, ex: { boreLength: 500, pipeDiameter: 6.625, reamFactor: 1.5, fluidFactor: 3, bentonitePer100Gal: 25, costPerFoot: 45, mobilization: 3500 },
    exText: (o) => `Example: a 500 ft bore for 6 in pipe (6.625 in OD) reamed to ${o.reamedHoleDiameterIn} in holds ${fmt(o.holeVolumeGallons, 0)} gal; plan on ${fmt(o.drillingFluidGallons, 0)} gal of fluid and ${o.bentoniteBags50lb} bags of bentonite — about ${usd(o.estimatedCost)}.`,
    how: "Enter the bore length and product pipe outside diameter. Ream to about 1.5 × OD; use 3–5 × hole volume of fluid depending on soil.",
    assume: "Hole volume = π(D/2)² × length; 7.48 gal per cu ft. Clay and rock need more fluid and additives.",
    faq: [["How big should an HDD reamed hole be?", "About 1.5 × the pipe OD (or OD + 12 in for large pipe)."]],
  }),
  mk({
    slug: "metal-building-cost-calculator", title: "Metal Building Cost Calculator",
    desc: "Estimate a steel (metal) building — kit price by size and eave height, concrete slab, erection, insulation, roll-up and walk doors — with cost per square foot.",
    meta: "Metal Building Cost Calculator — Steel Building Price",
    inputs: [num("length", "Length (ft)", 60, 1000, 1), num("width", "Width (ft)", 40, 500, 1), num("eaveHeight", "Eave Height (ft)", 14, 60, 1, 8), cur("kitPerSqFt", "Kit Price per Sq Ft (at 12 ft eave)", 22, 200, 0.5), yn("foundation", "Include Concrete Slab?", 1), cur("slabPerSqFt", "Slab Cost per Sq Ft", 7, 50, 0.25), cur("erectionPerSqFt", "Erection per Sq Ft", 8, 50, 0.25), yn("insulation", "Insulate Roof & Walls (~$1.50/sq ft)?", 1), num("rollUpDoors", "Roll-Up Doors", 2, 50), cur("doorPrice", "Price per Roll-Up Door", 2200, 20000, 50), num("walkDoors", "Walk Doors (~$900)", 2, 50), cur("delivery", "Delivery", 2500, 50000, 50)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["buildingKit", "Building Kit", "c"], ["foundation", "Foundation", "c"], ["erection", "Erection", "c"], ["insulationCost", "Insulation", "c"], ["doorsCost", "Doors", "c"], ["floorAreaSqFt", "Floor Area (sq ft)", "n"]],
    fn: E.metalBuilding, ex: { length: 60, width: 40, eaveHeight: 14, kitPerSqFt: 22, foundation: 1, slabPerSqFt: 7, erectionPerSqFt: 8, insulation: 1, rollUpDoors: 2, doorPrice: 2200, walkDoors: 2, delivery: 2500 },
    exText: (o) => `Example: a 60 × 40 ft building with 14 ft eaves, slab, insulation and four doors costs about ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft.`,
    how: "Enter the building size, eave height and your kit quote per square foot, then add the slab, erection and options.",
    assume: "Kit prices rise about 2.5% per foot of eave height above 12 ft. Typical 2026 turnkey shells: $35–70 per sq ft; finished interiors cost far more.",
    faq: [["How much does a 40×60 metal building cost?", "About $25,000–45,000 for the kit and $60,000–150,000 turnkey with slab and erection."]],
  }),
  mk({
    slug: "fire-alarm-installation-cost-calculator", title: "Fire Alarm System Installation Cost Calculator",
    desc: "Estimate fire alarm installation cost by system type and building size — residential interconnected, conventional, addressable or voice evacuation — plus monitoring and inspection.",
    inputs: [dropdown("system", "System Type", opts(E.ALARM.map(([n, m]) => `${n} (~$${m}/sq ft)`)), 2), num("area", "Building Area (sq ft)", 10000, 10000000, 10), region, yn("retrofit", "Retrofit in Existing Building (+25%)?"), yn("monitoring", "Central Station Monitoring?", 1), cur("annualInspection", "Annual Inspection & Testing", 400, 50000, 10), cur("minimum", "Minimum Job Price", 1500, 100000, 50)],
    results: [["installCost", "Installation Cost", "c"], ["firstYearCost", "First-Year Total", "c"], ["annualOngoing", "Ongoing per Year", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.fireAlarm, ex: { system: 2, area: 10000, regionAdjust: 0, retrofit: 0, monitoring: 1, annualInspection: 400, minimum: 1500 },
    exText: (o) => `Example: an addressable system for a 10,000 sq ft building costs about ${usd(o.installCost)} to install (${usd(o.lowEstimate)}–${usd(o.highEstimate)}), plus ${usd(o.annualOngoing)} a year for monitoring and inspection.`,
    how: "Choose the system type, enter the floor area, and add monitoring and inspection. Retrofits cost more because wiring must be fished through finished walls.",
    assume: "2026 typical installed prices per sq ft: residential $1–2.50, conventional $2–4, addressable $3–6, voice evac $5–9. NFPA 72 requires annual inspection and testing.",
    faq: [["How much does a commercial fire alarm system cost?", "Usually $2–6 per sq ft installed, depending on system type and building complexity."]],
  }),
  mk({
    slug: "seawall-cost-calculator", title: "Seawall Cost Calculator",
    desc: "Estimate seawall or bulkhead cost per linear foot — vinyl, concrete, steel, timber, riprap, gabion or boulder — with wall height, barge access, removal and permits.",
    inputs: [num("length", "Wall Length (ft)", 100, 50000, 1), dropdown("material", "Material", opts(E.SEAWALL.map(([n, r]) => `${n} (~$${r}/ft)`)), 0), num("height", "Exposed Wall Height (ft)", 6, 30, 0.5, 2), yn("bargeAccess", "Barge / Water-Side Access Only (+20%)?"), yn("removeOld", "Remove Old Wall (~$100/ft)?"), cur("permitsEngineering", "Permits & Engineering", 5000, 500000, 50)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerLinearFoot", "Cost per Linear Foot", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.seawall, ex: { length: 100, material: 0, height: 6, bargeAccess: 0, removeOld: 0, permitsEngineering: 5000 },
    exText: (o) => `Example: 100 ft of vinyl sheet-pile seawall about 6 ft high costs roughly ${usd(o.totalCost)} — ${usd(o.costPerLinearFoot)} per foot (${usd(o.lowEstimate)}–${usd(o.highEstimate)}).`,
    how: "Enter the shoreline length, wall type and height. Waterfront permits (Army Corps, state and local) can take months.",
    assume: "2026 US mid-range installed prices per linear foot at ~6 ft exposed height; each extra foot of height adds about 8%.",
    faq: [["How much does a seawall cost per foot?", "Typically $150–800 per linear foot, with vinyl and concrete the most common."]],
  }),
  mk({
    slug: "fire-sprinkler-system-cost-calculator", title: "Fire Sprinkler System Cost Calculator",
    desc: "Estimate fire sprinkler system cost for residential or commercial buildings — wet, dry or pre-action — with sprinkler heads, water service, backflow and permits.",
    meta: "Fire Sprinkler System Cost Calculator — Residential & Commercial",
    inputs: [dropdown("system", "System", opts(E.SPRINKLER.map(([n, m]) => `${n} (~$${m}/sq ft)`)), 2), num("area", "Protected Area (sq ft)", 10000, 10000000, 10), region, yn("waterService", "New / Upsized Water Service?"), cur("waterServiceCost", "Water Service Cost", 8000, 200000, 100), yn("backflow", "Backflow Preventer?", 1), cur("backflowCost", "Backflow Preventer Cost", 3500, 50000, 50), cur("permits", "Permits & Design", 2000, 100000, 50)],
    results: [["totalCost", "Estimated Total Cost", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["sprinklerHeads", "Sprinkler Heads (approx.)", "n"], ["extrasCost", "Water Service, Backflow & Permits", "c"], ["lowEstimate", "Low Estimate", "c"], ["highEstimate", "High Estimate", "c"]],
    fn: E.fireSprinkler, ex: { system: 2, area: 10000, regionAdjust: 0, waterService: 0, waterServiceCost: 8000, backflow: 1, backflowCost: 3500, permits: 2000 },
    exText: (o) => `Example: a light-hazard wet system for 10,000 sq ft needs about ${o.sprinklerHeads} heads and costs roughly ${usd(o.totalCost)} — ${usd(o.costPerSqFt)} per sq ft.`,
    how: "Pick the system type and enter the protected area. Residential (NFPA 13D/13R) systems are cheaper than commercial NFPA 13 systems.",
    assume: "2026 typical installed prices per sq ft: residential new $1.25–2.50, retrofit $2.50–5, commercial wet $3–7, dry $5–9, pre-action $6–12. Head coverage: 144 sq ft residential, 130–200 commercial.",
    faq: [["How much does a fire sprinkler system cost?", "About $1.50–2.50 per sq ft in new homes and $3–7 in commercial buildings."], ["Are dry systems more expensive?", "Yes — they need an air compressor and dry valve and cost about 25–50% more than wet systems."]],
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
