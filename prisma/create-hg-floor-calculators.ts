// One-time (but safe to re-run) batch setup script: creates 39 calculators in House & Garden
// Calculators > Flooring, Tile, Paint & Interior Calculators (paint, wallpaper, flooring, carpet, tile, trim and interior sizing tools). Formulas live in src/lib/calc-engine-hg-floor.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-floor-calculators.ts
// or
//   npm run db:create-hg-floor-calculators

import * as E from "../src/lib/calc-engine-hg-floor";

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

const CAT = "flooring-tile-paint-interior-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region and job — get local quotes.";
const ROOM = (l: number, w: number) => [num("length", "Room Length", l, 500, 0.5, 0, "ft"), num("width", "Room Width", w, 500, 0.5, 0, "ft")];
const PLANK_INPUTS = (box: number, price: number, install: number) => [...ROOM(15, 12), num("extraArea", "Closets / Extra Area", 0, 10000, 1, 0, "sq ft"), pct("waste", "Waste", 10, 30), num("boxSqFt", "Sq Ft per Box", box, 100, 0.01, 1), usd("pricePerSqFt", "Material Price per Sq Ft", price, 50, 0.01), usd("installPerSqFt", "Installation per Sq Ft (0 = DIY)", install, 30, 0.05)];
const PLANK_RES: Line[] = [["boxes", "Boxes Needed", "n"], ["sqFtToBuy", "Sq Ft You'll Buy", "n"], ["area", "Room Area (sq ft)", "n"], ["underlaymentRolls", "Underlayment Rolls (100 sq ft)", "n"], ["materialCost", "Material Cost", "c"], ["installCost", "Installation Cost", "c"]];
const PLANK_EX = (box: number, price: number, install: number) => ({ length: 15, width: 12, extraArea: 0, waste: 10, boxSqFt: box, pricePerSqFt: price, installPerSqFt: install });

const TOOLS: ToolDef[] = [
  mk({
    slug: "paint-calculator", title: "Paint Calculator (Gallons for Walls & Ceilings)",
    desc: "Work out how much paint you need for a room — wall and ceiling gallons for one or more coats, minus doors and windows, plus primer — for any brand (Sherwin-Williams, Behr, Benjamin Moore and more).",
    meta: "Paint Calculator — How Much Paint Do I Need for a Room?",
    inputs: [...ROOM(12, 14), num("height", "Wall Height", 8, 20, 0.5, 6, "ft"), num("doors", "Doors", 1, 20, 1), num("windows", "Windows", 2, 30, 1), num("coats", "Coats", 2, 4, 1, 1), dd("ceiling", "Paint the Ceiling Too?", ["No", "Yes"]), dd("primer", "Prime First?", ["No", "Yes"]), num("coverage", "Coverage per Gallon", 350, 450, 10, 100, "sq ft")],
    results: [["gallons", "Paint Needed (gal)", "n"], ["wallGallons", "Walls (gal)", "n"], ["ceilingGallons", "Ceiling (gal)", "n"], ["primerGallons", "Primer (gal)", "n"], ["wallArea", "Wall Area (sq ft)", "n"], ["cansToBuy", "1-Gallon Cans to Buy", "n"]],
    fn: E.paint, ex: { length: 12, width: 14, height: 8, doors: 1, windows: 2, coats: 2, ceiling: 0, primer: 0, coverage: 350 },
    exText: (o) => `Example: two coats on a 12 × 14 ft room with 8 ft walls, one door and two windows take about ${o.gallons} gallons — buy ${o.cansToBuy} one-gallon cans.`,
    how: "Enter the room size and openings. Most paints cover 250–400 sq ft per gallon per coat — check the can. Plan two coats for a color change, and prime over patches, stains or very dark colors.",
    assume: "Doors ≈ 21 sq ft and windows ≈ 15 sq ft are subtracted; coverage from the can (350 default). Textured walls and rough surfaces use more.",
    faq: [["How much paint for a 12x14 room?", "About 2 gallons for two coats on the walls."], ["How many square feet does a gallon of paint cover?", "About 350–400 sq ft per coat on smooth walls."]],
  }),
  mk({
    slug: "ceiling-paint-calculator", title: "Ceiling Paint Calculator",
    desc: "Calculate how much ceiling paint you need — gallons for one or two coats on smooth or textured (popcorn, knockdown) ceilings.",
    inputs: [...ROOM(12, 14), num("coats", "Coats", 2, 3, 1, 1), dd("texture", "Ceiling Texture", ["Smooth", "Textured (popcorn, knockdown)"]), num("coverage", "Coverage per Gallon", 350, 450, 10, 100, "sq ft")],
    results: [["gallons", "Ceiling Paint (gal)", "n"], ["area", "Ceiling Area (sq ft)", "n"], ["cansToBuy", "1-Gallon Cans", "n"]],
    fn: E.ceilingPaint, ex: { length: 12, width: 14, coats: 2, texture: 0, coverage: 350 },
    exText: (o) => `Example: two coats on a 12 × 14 ft smooth ceiling take about ${o.gallons} gallon(s).`,
    how: "Use a flat ceiling paint to hide imperfections. Textured ceilings soak up about 30% more and are best rolled with a thick-nap roller.",
    assume: "Ceiling area = length × width; textured ceilings ×1.3.",
    faq: [["How much paint for a ceiling?", "About 1 gallon per 350 sq ft per coat."]],
  }),
  mk({
    slug: "exterior-paint-calculator", title: "Exterior Paint Calculator (House Paint Gallons)",
    desc: "Calculate exterior house paint — gallons and 5-gallon buckets for walls and gables by siding type (smooth, wood lap, stucco or brick) — plus trim paint.",
    inputs: [num("perimeter", "House Perimeter", 160, 5000, 1, 0, "ft"), num("wallHeight", "Wall Height", 10, 40, 0.5, 6, "ft"), num("gables", "Gable Ends", 2, 10, 1), num("gableWidth", "Gable Width", 30, 200, 0.5, 0, "ft"), num("gableRise", "Gable Height", 7.5, 40, 0.5, 0, "ft"), num("openings", "Windows & Doors", 200, 5000, 1, 0, "sq ft"), dd("surface", "Surface", ["Smooth (fiber cement, vinyl)", "Wood lap / clapboard", "Stucco or brick"], 1), num("coats", "Coats", 2, 3, 1, 1), num("trimFeet", "Trim to Paint", 300, 10000, 1, 0, "ft")],
    results: [["gallons", "Wall Paint (gal)", "n"], ["buckets5gal", "5-Gallon Buckets", "n"], ["trimGallons", "Trim Paint (gal)", "n"], ["area", "Wall Area (sq ft)", "n"]],
    fn: E.exteriorPaint, ex: { perimeter: 160, wallHeight: 10, gables: 2, gableWidth: 30, gableRise: 7.5, openings: 200, surface: 1, coats: 2, trimFeet: 300 },
    exText: (o) => `Example: a 160 ft perimeter house with 10 ft walls and two gables needs about ${o.gallons} gallons of siding paint (${o.buckets5gal} buckets) and ${o.trimGallons} gallons for trim.`,
    how: "Measure the perimeter and wall height and add the gable triangles. Rough wood, stucco and brick absorb more paint. Paint in dry weather between 50 and 90 °F.",
    assume: "Coverage per coat: smooth 350, wood lap 300, stucco/brick 200 sq ft per gallon; trim ≈ 150 linear ft per gallon per coat.",
    faq: [["How much paint to paint a house exterior?", "Roughly 10–20 gallons for an average 2,000 sq ft house, two coats."]],
  }),
  mk({
    slug: "commercial-painting-cost-calculator", title: "Commercial Painting Cost Calculator",
    desc: "Estimate commercial painting costs per square foot — interior offices and retail, warehouses and industrial, or exterior commercial — with high walls and after-hours work.",
    inputs: [num("area", "Paintable Area", 10000, 10000000, 100, 0, "sq ft"), dd("type", "Job", ["Interior office / retail", "Warehouse / industrial", "Exterior commercial"]), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 20, 0.05), dd("tall", "Walls Over 12 ft (lifts)?", ["No", "Yes"]), dd("afterHours", "Nights / Weekends?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perSqFt", "All-In per Sq Ft", "c"]],
    fn: E.commercialPaintingCost, ex: { area: 10000, type: 0, customRate: 0, tall: 0, afterHours: 0 },
    exText: (o) => `Example: painting 10,000 sq ft of office walls costs about ${money(o.totalCost)}.`,
    how: "Use the paintable surface area (walls and ceilings), not the floor area. Lifts, after-hours work and special coatings add cost.",
    assume: `Typical prices per sq ft of surface: interior $2, warehouse $1.50, exterior $2.50; high walls +20%; after hours +15%. ${COST_NOTE}`,
    faq: [["How much does commercial painting cost per square foot?", "Usually $1.50–4 per sq ft of surface."]],
  }),
  mk({
    slug: "accent-wall-calculator", title: "Accent Wall Calculator (Paint, Wallpaper, Shiplap & Trim)",
    desc: "Plan an accent wall — area, paint gallons, wallpaper rolls, shiplap linear feet, grid-trim moulding or peel-and-stick panels — from the wall's width and height.",
    inputs: [num("width", "Wall Width", 12, 100, 0.5, 1, "ft"), num("height", "Wall Height", 8, 20, 0.5, 1, "ft")],
    results: [["area", "Wall Area (sq ft)", "n"], ["paintGallons", "Paint, 2 Coats (gal)", "n"], ["wallpaperRolls", "Wallpaper Rolls (56 sq ft)", "n"], ["shiplapFt", "Shiplap (linear ft)", "n"], ["gridTrimFt", "Grid Trim, 16 in Squares (ft)", "n"], ["peelStickPanels", "Peel-and-Stick Panels (2.5 sq ft)", "n"]],
    fn: E.accentWall, ex: { width: 12, height: 8 },
    exText: (o) => `Example: a 12 × 8 ft accent wall is ${o.area} sq ft — about ${o.paintGallons} gallons of paint, ${o.wallpaperRolls} wallpaper rolls or ${o.shiplapFt} ft of shiplap.`,
    how: "Pick the wall that you see first when you walk in (or behind the bed or sofa). Use the specific tools for detailed layouts: board and batten, wainscoting or wallpaper with pattern repeat.",
    assume: "Paint 350 sq ft per gallon; wallpaper 56 sq ft per roll +15%; shiplap 5.5 in coverage +10%; grid trim at 16 in spacing.",
    faq: [["How much paint for an accent wall?", "Usually 1 gallon for two coats on a standard wall."]],
  }),
  mk({
    slug: "wallpaper-calculator", title: "Wallpaper Calculator (Rolls with Pattern Repeat)",
    desc: "Calculate how many rolls of wallpaper you need — US double rolls, European rolls, wide rolls or your own size — allowing for pattern repeat, wall height and openings.",
    meta: "Wallpaper Calculator — How Many Rolls (with Pattern Repeat)?",
    inputs: [num("wallWidth", "Total Wall Width", 40, 1000, 0.5, 1, "ft"), num("wallHeight", "Wall Height", 8, 20, 0.25, 4, "ft"), num("openings", "Doors & Windows", 35, 1000, 1, 0, "sq ft"), num("repeat", "Pattern Repeat", 0, 36, 0.25, 0, "in"), dd("roll", "Roll", ["US double roll (20.5 in × 33 ft)", "European roll (0.53 × 10.05 m)", "Wide roll (27 in × 27 ft)", "Custom size"]), num("customWidth", "Custom Roll Width", 20.5, 60, 0.25, 10, "in"), num("customLength", "Custom Roll Length", 33, 100, 0.5, 5, "ft")],
    results: [["rolls", "Rolls Needed (incl. 10%)", "n"], ["strips", "Strips (drops)", "n"], ["stripsPerRoll", "Strips per Roll", "n"], ["wallArea", "Wall Area (sq ft)", "n"]],
    fn: E.wallpaper, ex: { wallWidth: 40, wallHeight: 8, openings: 35, repeat: 0, roll: 0, customWidth: 20.5, customLength: 33 },
    exText: (o) => `Example: 40 ft of 8 ft walls with no pattern repeat needs ${o.strips} strips — ${o.stripsPerRoll} per double roll — so ${o.rolls} rolls with 10% extra.`,
    how: "Add the width of every wall to be papered. Large pattern repeats waste paper at every strip, so they need more rolls. Buy all rolls from the same batch (dye lot).",
    assume: "Strips per roll = roll length ÷ (wall height + repeat + 2 in trim); openings reduce strips by about half their width.",
    faq: [["How many rolls of wallpaper for a 12x12 room?", "About 6–8 single rolls (3–4 double rolls) depending on height and repeat."]],
  }),
  mk({
    slug: "fabric-yardage-calculator", title: "Fabric Yardage Calculator (Upholstery, Cushions & Drapery)",
    desc: "Calculate fabric yardage for pieces, cushions and upholstery — how many fit across 44, 54 or 60 in fabric, pattern repeat — or box cushions with boxing strips.",
    inputs: [dd("mode", "Project", ["Rectangular pieces", "Box cushions"]), num("pieceWidth", "Piece Width", 22, 120, 0.25, 1, "in"), num("pieceLength", "Piece Length", 24, 400, 0.25, 1, "in"), num("cushionWidth", "Cushion Width", 22, 100, 0.25, 4, "in"), num("cushionDepth", "Cushion Depth", 22, 100, 0.25, 4, "in"), num("thickness", "Cushion Thickness", 4, 12, 0.25, 1, "in"), num("quantity", "Quantity", 2, 100, 1, 1), dd("fabricWidth", "Fabric Width", ["44–45 in", "54 in (upholstery)", "60 in"], 1), num("repeat", "Pattern Repeat", 0, 36, 0.25, 0, "in"), usd("pricePerYard", "Price per Yard", 25, 500, 0.5)],
    results: [["yards", "Fabric (yards, incl. 10%)", "n"], ["meters", "Meters", "n"], ["totalInches", "Length Before Allowance (in)", "n"], ["cost", "Fabric Cost", "c"]],
    fn: E.fabricYardage, ex: { mode: 1, pieceWidth: 22, pieceLength: 24, cushionWidth: 22, cushionDepth: 22, thickness: 4, quantity: 2, fabricWidth: 1, repeat: 0, pricePerYard: 25 },
    exText: (o) => `Example: two 22 × 22 × 4 in box cushions in 54 in fabric take about ${o.yards} yards.`,
    how: "Add seam allowances to piece sizes (the cushion mode adds ½ in each side). Patterned fabric must be matched, so each piece's length rounds up to the pattern repeat.",
    assume: "Pieces are placed side by side across the fabric width; box cushions = top + bottom panels plus a boxing strip around the perimeter; 10% extra.",
    faq: [["How much fabric for a box cushion?", "About 1–1.5 yards of 54 in fabric for a typical seat cushion."]],
  }),
  mk({
    slug: "flooring-calculator", title: "Flooring Calculator (Square Feet & Boxes)",
    desc: "Work out how much flooring to buy — square feet with waste for straight, diagonal or herringbone layouts, boxes, underlayment and cost — for any flooring type.",
    meta: "Flooring Calculator — How Many Boxes of Flooring Do I Need?",
    inputs: [...ROOM(15, 12), num("extraArea", "Closets / Extra Area", 0, 10000, 1, 0, "sq ft"), dd("layout", "Layout", ["Straight (7%)", "Diagonal (15%)", "Herringbone / chevron (20%)"]), num("boxSqFt", "Sq Ft per Box", 20, 100, 0.01, 1), usd("pricePerSqFt", "Price per Sq Ft", 3.5, 50, 0.01)],
    results: [["boxes", "Boxes Needed", "n"], ["sqFtToBuy", "Sq Ft You'll Buy", "n"], ["area", "Room Area (sq ft)", "n"], ["underlaymentRolls", "Underlayment Rolls (100 sq ft)", "n"], ["cost", "Flooring Cost", "c"]],
    fn: E.flooring, ex: { length: 15, width: 12, extraArea: 0, layout: 0, boxSqFt: 20, pricePerSqFt: 3.5 },
    exText: (o) => `Example: a 15 × 12 ft room laid straight needs ${o.boxes} boxes of 20 sq ft — ${o.sqFtToBuy} sq ft for about ${money(o.cost)}.`,
    how: "Measure each room (and closets) and add them up. Waste covers cuts at walls and doorways — more for diagonal and herringbone patterns. Keep a spare box for future repairs.",
    assume: "Waste: straight 7%, diagonal 15%, herringbone 20%. Underlayment in 100 sq ft rolls (skip if the flooring has it attached).",
    faq: [["How much extra flooring should I buy?", "About 5–10% for straight layouts and 15–20% for diagonal or herringbone."]],
  }),
  mk({
    slug: "laminate-flooring-calculator", title: "Laminate Flooring Calculator (Boxes & Cost)",
    desc: "Calculate how many boxes of laminate flooring you need — with waste, underlayment and material and installation cost — from your room size.",
    inputs: PLANK_INPUTS(20.17, 2.5, 2.5), results: PLANK_RES,
    fn: E.plankFlooring, ex: PLANK_EX(20.17, 2.5, 2.5),
    exText: (o) => `Example: a 15 × 12 ft room needs ${o.boxes} boxes of laminate (20.17 sq ft each) — about ${money(o.materialCost)} in material and ${money(o.installCost)} to install.`,
    how: "Enter the room size and the box coverage printed on the carton. Let laminate acclimate for 48 hours, leave a ¼–⅜ in expansion gap at walls and stagger the end joints at least 12 in.",
    assume: `10% waste default. Typical installed labor $2–4 per sq ft. ${COST_NOTE}`,
    faq: [["How many boxes of laminate for 200 square feet?", "About 11 boxes of 20 sq ft with 10% waste."]],
  }),
  mk({
    slug: "vinyl-plank-flooring-calculator", title: "Vinyl Plank Flooring Calculator (LVP Boxes & Cost)",
    desc: "Calculate luxury vinyl plank (LVP) flooring — boxes with waste, square feet to buy, underlayment and material and installation cost.",
    inputs: PLANK_INPUTS(23.64, 3, 2.5), results: PLANK_RES,
    fn: E.plankFlooring, ex: PLANK_EX(23.64, 3, 2.5),
    exText: (o) => `Example: a 15 × 12 ft room takes ${o.boxes} boxes of LVP at 23.64 sq ft per box — ${o.sqFtToBuy} sq ft.`,
    how: "Rigid-core LVP floats over most subfloors; glue-down vinyl needs a very flat floor. Check whether your planks have attached padding before buying underlayment.",
    assume: `10% waste; typical LVP $2–5 per sq ft and installation $2–3 per sq ft. ${COST_NOTE}`,
    faq: [["How much does LVP flooring cost installed?", "About $4.50–8 per sq ft."]],
  }),
  mk({
    slug: "hardwood-flooring-calculator", title: "Hardwood Flooring Calculator (Boxes & Cost)",
    desc: "Calculate solid or engineered hardwood flooring — square feet with waste, boxes or bundles and material and installation cost.",
    inputs: PLANK_INPUTS(20, 6, 4), results: PLANK_RES,
    fn: E.plankFlooring, ex: PLANK_EX(20, 6, 4),
    exText: (o) => `Example: a 15 × 12 ft room needs ${o.boxes} boxes of hardwood — about ${money(o.materialCost)} in wood and ${money(o.installCost)} to install.`,
    how: "Order 10% extra (15% for random-length or herringbone). Let solid hardwood acclimate for several days and check the subfloor's moisture before nailing.",
    assume: `Typical prices: oak $4–8 per sq ft, exotic $8–15; installation $3–6 per sq ft. ${COST_NOTE}`,
    faq: [["How much hardwood flooring do I need?", "Room square footage plus 10%."]],
  }),
  mk({
    slug: "carpet-calculator", title: "Carpet Calculator (Square Yards, Pad & Seams)",
    desc: "Calculate carpet for a room in square yards — using 12, 13.2 or 15 ft roll widths — with pad, tack strip, seams and cost per square yard.",
    meta: "Carpet Calculator — How Much Carpet Do I Need (Square Yards)?",
    inputs: [...ROOM(15, 12), dd("rollWidth", "Roll Width", ["12 ft", "15 ft", "13.2 ft"]), pct("waste", "Waste / Pattern Match", 5, 30), usd("pricePerSqYd", "Price per Sq Yd (installed)", 30, 300, 0.5)],
    results: [["squareYards", "Carpet to Order (sq yd)", "n"], ["roomSqYd", "Room Area (sq yd)", "n"], ["linearFeet", "Roll Length (ft)", "n"], ["seams", "Seams", "n"], ["padSqYd", "Pad (sq yd)", "n"], ["tackStripFt", "Tack Strip (ft)", "n"], ["cost", "Carpet Cost", "c"]],
    fn: E.carpet, ex: { length: 15, width: 12, rollWidth: 0, waste: 5, pricePerSqYd: 30 },
    exText: (o) => `Example: a 15 × 12 ft room fits one 12 ft wide piece with no seams — ${o.squareYards} sq yd of carpet and ${o.padSqYd} sq yd of pad.`,
    how: "Carpet comes in fixed roll widths, so you pay for the full width. Run seams away from doorways and traffic paths. Stairs are measured separately (see the stair runner calculator).",
    assume: "Order = strips × roll width × (length + 6 in) + waste; 1 sq yd = 9 sq ft; pad = room area + 5%.",
    faq: [["How do I convert square feet to square yards for carpet?", "Divide by 9."]],
  }),
  mk({
    slug: "stair-runner-calculator", title: "Stair Runner Calculator (Carpet for Stairs)",
    desc: "Calculate a carpet stair runner — length per step from tread, riser and nosing, total linear feet and yards, stair rods and cost — for straight stairs and landings.",
    inputs: [num("steps", "Steps", 13, 40, 1, 1), num("tread", "Tread Depth", 10, 14, 0.25, 8, "in"), num("riser", "Riser Height", 7.5, 8, 0.25, 4, "in"), num("nosing", "Nosing Wrap", 1.5, 3, 0.25, 0, "in"), num("landing", "Landing Length (if any)", 0, 200, 1, 0, "in"), usd("pricePerFoot", "Runner Price per Linear Ft", 25, 300, 0.5)],
    results: [["linearFeet", "Runner Length (ft, incl. 10%)", "n"], ["yards", "Yards", "n"], ["perStepIn", "Per Step (in)", "n"], ["stairRods", "Stair Rods (optional)", "n"], ["cost", "Runner Cost", "c"]],
    fn: E.stairRunner, ex: { steps: 13, tread: 10, riser: 7.5, nosing: 1.5, landing: 0, pricePerFoot: 25 },
    exText: (o) => `Example: 13 steps with 10 in treads and 7.5 in risers need about ${o.linearFeet} ft of runner (${o.yards} yd).`,
    how: "Measure one step from the back of the tread, over the nosing and down the riser. Runners usually leave 3–4 in of wood showing on each side (a 27–30 in runner on a 36 in stair).",
    assume: "Per step = tread + riser + nosing wrap; 10% extra for turns and finishing.",
    faq: [["How much runner do I need for 13 stairs?", "About 21–23 ft for typical steps."]],
  }),
  mk({
    slug: "subfloor-calculator", title: "Subfloor Calculator (Sheets, Adhesive & Screws)",
    desc: "Calculate subfloor sheets — 4×8 tongue-and-groove plywood or OSB — with the right thickness for your joist spacing, construction adhesive and screws.",
    inputs: [num("length", "Floor Length", 20, 1000, 0.5, 1, "ft"), num("width", "Floor Width", 12, 1000, 0.5, 1, "ft"), dd("joistSpacing", "Joist Spacing", ["16 in", "19.2 in", "24 in"])],
    results: [["sheets", "4 × 8 Sheets (incl. 10%)", "n"], ["thickness", "Recommended Panel", "l", E.SUBFLOOR_THICK], ["area", "Floor Area (sq ft)", "n"], ["adhesiveTubes", "Construction Adhesive (28 oz tubes)", "n"], ["screws", "Subfloor Screws", "n"]],
    fn: E.subfloor, ex: { length: 20, width: 12, joistSpacing: 0 },
    exText: (o) => `Example: a 20 × 12 ft floor on joists 16 in apart takes ${o.sheets} sheets of 23/32 in T&G subfloor and about ${o.adhesiveTubes} tubes of adhesive.`,
    how: "Run sheets perpendicular to the joists, stagger the end joints, glue every joist and screw about every 6 in at edges and 12 in in the field.",
    assume: "Thickness follows typical APA span ratings (16 in o.c. → 23/32 in; 24 in → 7/8–1⅛ in). One adhesive tube per two sheets; ≈ 50 screws per sheet.",
    faq: [["How thick should subfloor be?", "23/32 in (¾ in) for joists 16 in apart."]],
  }),
  mk({
    slug: "radiant-floor-heating-calculator", title: "Radiant Floor Heating Calculator (Mat Size, Cost & Running Cost)",
    desc: "Size electric radiant floor heating — mat square footage, watts and 240 V amps — and estimate installation and monthly running cost (Schluter DITRA-HEAT, Nuheat and others).",
    inputs: [num("area", "Room Area", 60, 2000, 1, 0, "sq ft"), pct("heatedShare", "Share That Can Be Heated (no cabinets / tub)", 85, 100, 1), dd("system", "System", ["Electric mat or cable", "Hydronic (hot water)"]), usd("installCost", "Thermostat & Installation", 600, 10000, 25), num("hoursPerDay", "Hours On per Day", 4, 24, 0.5, 0), num("kwhPrice", "Electricity Price ($/kWh)", 0.17, 1, 0.01, 0)],
    results: [["matSqFt", "Heating Mat (sq ft)", "n"], ["watts", "Heating Load (W)", "n"], ["amps240", "Amps at 240 V", "n"], ["installCost", "Installed Cost", "c"], ["monthlyRunningCost", "Monthly Running Cost", "c"]],
    fn: E.radiantFloor, ex: { area: 60, heatedShare: 85, system: 0, installCost: 600, hoursPerDay: 4, kwhPrice: 0.17 },
    exText: (o) => `Example: a 60 sq ft bathroom needs about ${o.matSqFt} sq ft of heating mat (${o.watts} W) and costs about ${money(o.monthlyRunningCost)} a month at 4 hours a day.`,
    how: "Only heat open floor — not under vanities, tubs or toilets. Order mats slightly smaller than the heated area; never cut heating cables. Large areas usually need a dedicated 240 V circuit (GFCI).",
    assume: `Electric systems ≈ 12 W per sq ft; materials $12 (electric) to $15 (hydronic) per sq ft; hydronic running cost assumed about half of electric resistance. ${COST_NOTE}`,
    faq: [["How much does it cost to run radiant floor heat?", "About $5–20 a month for a bathroom."]],
  }),
  mk({
    slug: "polished-concrete-floor-cost-calculator", title: "Polished Concrete Floor Cost Calculator",
    desc: "Estimate the cost of polished concrete floors — grind and seal, salt-and-pepper polish or high-gloss exposed aggregate — with dye or stain and crack repair.",
    inputs: [num("area", "Floor Area", 1000, 1000000, 10, 0, "sq ft"), dd("level", "Finish", E.POLISH_LEVELS, 1), dd("stain", "Add Dye / Stain?", ["No", "Yes"]), num("crackFeet", "Crack Repair", 20, 10000, 1, 0, "linear ft")],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perSqFt", "Cost per Sq Ft", "c"]],
    fn: E.polishedConcreteCost, ex: { area: 1000, level: 1, stain: 0, crackFeet: 20 },
    exText: (o) => `Example: polishing a 1,000 sq ft basement slab to a salt-and-pepper finish costs about ${money(o.totalCost)}.`,
    how: "The existing slab decides the result — patches, glue residue and cracks show through. New slabs can be planned for polishing from the start.",
    assume: `Typical prices per sq ft: grind and seal $3, mid-level polish $5, high gloss / exposed aggregate $8; dye +$1; crack repair $3 per ft; $1,500 minimum. ${COST_NOTE}`,
    faq: [["How much do polished concrete floors cost?", "About $3–8 per sq ft for existing slabs."]],
  }),
  mk({
    slug: "drop-ceiling-cost-calculator", title: "Drop Ceiling Installation Cost Calculator",
    desc: "Estimate the cost to install a drop (suspended) ceiling — basic, mid-range or premium acoustic tiles — with removal of an old ceiling.",
    inputs: [num("area", "Ceiling Area", 400, 100000, 1, 0, "sq ft"), dd("tile", "Tile Grade", ["Basic mineral fiber", "Mid-range acoustic", "Premium / decorative"], 1), dd("removal", "Remove an Old Ceiling?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perSqFt", "Cost per Sq Ft", "c"]],
    fn: E.dropCeilingCost, ex: { area: 400, tile: 1, removal: 0 },
    exText: (o) => `Example: a 400 sq ft basement drop ceiling with mid-range tiles costs about ${money(o.totalCost)} installed.`,
    how: "Drop ceilings need about 3–4 in of clearance below joists, pipes and ducts. Use the drop ceiling calculator for the grid and tile count.",
    assume: `Typical installed prices per sq ft: basic $6, mid-range $9, premium $13; removal of an old ceiling about $1. ${COST_NOTE}`,
    faq: [["How much does a drop ceiling cost?", "About $5–15 per sq ft installed."]],
  }),
  mk({
    slug: "marble-flooring-cost-calculator", title: "Marble Flooring Cost Calculator",
    desc: "Estimate marble floor costs — Carrara, Calacatta, travertine, Emperador or Thassos tile — with 10% waste, installation labor and subfloor prep.",
    inputs: [num("area", "Floor Area", 300, 100000, 1, 0, "sq ft"), dd("marble", "Marble", E.MARBLES), usd("customMaterial", "Your Material Price per Sq Ft (0 = typical)", 0, 200, 0.5), usd("laborPerSqFt", "Installation per Sq Ft", 12, 50, 0.5), dd("prep", "Subfloor Prep / Leveling?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["materialCost", "Marble (incl. 10%)", "c"], ["laborCost", "Installation", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.marbleFlooringCost, ex: { area: 300, marble: 0, customMaterial: 0, laborPerSqFt: 12, prep: 0 },
    exText: (o) => `Example: 300 sq ft of Carrara marble tile costs about ${money(o.totalCost)} installed.`,
    how: "Marble needs a stiff, flat subfloor (deflection L/720 for natural stone) and sealing. Honed finishes are less slippery and hide scratches better than polished.",
    assume: `Typical tile prices per sq ft: Carrara $15, Calacatta $35, travertine $8, Emperador $18, Thassos $25; installation $10–15. ${COST_NOTE}`,
    faq: [["How much does marble flooring cost?", "About $20–50 per sq ft installed."]],
  }),
  mk({
    slug: "tile-calculator", title: "Tile Calculator (Tiles & Boxes)",
    desc: "Calculate how many tiles and boxes you need for a floor or wall — any tile size and grout joint — with waste for straight, diagonal or herringbone layouts.",
    meta: "Tile Calculator — How Many Tiles Do I Need?",
    inputs: [num("length", "Area Length", 10, 500, 0.5, 0, "ft"), num("width", "Area Width", 8, 500, 0.5, 0, "ft"), num("extraArea", "Extra Area", 0, 10000, 1, 0, "sq ft"), num("tileWidth", "Tile Width", 12, 60, 0.25, 0.5, "in"), num("tileLength", "Tile Length", 24, 120, 0.25, 0.5, "in"), num("joint", "Grout Joint", 0.125, 0.5, 0.0625, 0, "in"), dd("layout", "Layout", ["Straight (10%)", "Diagonal / offset (15%)", "Herringbone (20%)"]), num("boxSqFt", "Sq Ft per Box", 15.5, 100, 0.01, 1)],
    results: [["tiles", "Tiles Needed (incl. waste)", "n"], ["boxes", "Boxes", "n"], ["area", "Area (sq ft)", "n"], ["tilesPerSqFt", "Tiles per Sq Ft", "n"]],
    fn: E.tile, ex: { length: 10, width: 8, extraArea: 0, tileWidth: 12, tileLength: 24, joint: 0.125, layout: 0, boxSqFt: 15.5 },
    exText: (o) => `Example: an 80 sq ft floor in 12 × 24 in tile with ⅛ in joints needs about ${o.tiles} tiles — ${o.boxes} boxes of 15.5 sq ft.`,
    how: "Enter the area and tile size. Large tiles and herringbone waste more at the edges. Keep a few spare tiles from the same lot for repairs.",
    assume: "Tiles = area ÷ (tile + joint) × waste. Wall tile, shower and backsplash tools are listed separately.",
    faq: [["How many 12x24 tiles do I need for 100 square feet?", "About 55 tiles with 10% waste."]],
  }),
  mk({
    slug: "shower-tile-calculator", title: "Shower Tile Calculator (Walls, Floor & Niche)",
    desc: "Calculate tile for a shower — wall and floor square footage, wall tiles and floor mosaic with waste, a niche, thinset bags and waterproofing membrane.",
    inputs: [num("width", "Shower Width", 5, 12, 0.25, 2, "ft"), num("depth", "Shower Depth", 3, 12, 0.25, 2, "ft"), num("height", "Tile Height", 7, 10, 0.25, 4, "ft"), dd("walls", "Walls Tiled", ["One (back wall)", "Two (corner)", "Three (alcove)"], 2), dd("floor", "Tile the Floor?", ["No (pan / base)", "Yes"]), dd("niche", "Add a Niche?", ["No", "Yes"]), num("wallTileW", "Wall Tile Width", 3, 24, 0.25, 1, "in"), num("wallTileL", "Wall Tile Length", 6, 48, 0.25, 1, "in"), num("floorTile", "Floor Tile Size", 2, 12, 0.25, 1, "in")],
    results: [["wallSqFt", "Wall Tile Area (sq ft)", "n"], ["floorSqFt", "Floor Tile Area (sq ft)", "n"], ["wallTiles", "Wall Tiles (incl. 15%)", "n"], ["floorTiles", "Floor Tiles (incl. 15%)", "n"], ["thinsetBags", "Thinset (50 lb bags)", "n"], ["waterproofingSqFt", "Waterproofing (sq ft)", "n"]],
    fn: E.showerTile, ex: { width: 5, depth: 3, height: 7, walls: 2, floor: 0, niche: 0, wallTileW: 3, wallTileL: 6, floorTile: 2 },
    exText: (o) => `Example: a 5 × 3 ft alcove shower tiled 7 ft high has ${o.wallSqFt} sq ft of wall — about ${o.wallTiles} subway tiles (3 × 6 in).`,
    how: "Pick how many walls you'll tile. Waterproof every tiled surface (liquid membrane or a sheet system) before tiling. Small floor tiles (2 in mosaic) follow the slope to the drain better.",
    assume: "15% waste for cuts around the valve, niche and edges; thinset ≈ 65 sq ft per bag.",
    faq: [["How much tile do I need for a shower?", "About 80–100 sq ft for a standard 5 × 3 ft alcove tiled to 7–8 ft."]],
  }),
  mk({
    slug: "backsplash-calculator", title: "Backsplash Tile Calculator (Tiles & Cost)",
    desc: "Calculate a kitchen backsplash — square feet, tiles and boxes for subway or any tile size — and material and installed cost.",
    inputs: [num("length", "Backsplash Length", 12, 100, 0.5, 1, "ft"), num("height", "Height", 18, 60, 0.5, 3, "in"), num("subtract", "Windows / Range Hood Area to Skip", 0, 100, 0.5, 0, "sq ft"), num("tileW", "Tile Width", 3, 24, 0.25, 0.5, "in"), num("tileL", "Tile Length", 6, 48, 0.25, 0.5, "in"), num("joint", "Grout Joint", 0.0625, 0.25, 0.0625, 0, "in"), num("boxSqFt", "Sq Ft per Box", 10, 50, 0.25, 1), usd("tilePerSqFt", "Tile Price per Sq Ft", 10, 200, 0.5), usd("laborPerSqFt", "Installation per Sq Ft", 20, 100, 0.5)],
    results: [["sqFt", "Backsplash Area (sq ft)", "n"], ["tiles", "Tiles (incl. 10%)", "n"], ["boxes", "Boxes", "n"], ["materialCost", "Tile Cost", "c"], ["installedCost", "Installed Cost", "c"]],
    fn: E.backsplash, ex: { length: 12, height: 18, subtract: 0, tileW: 3, tileL: 6, joint: 0.0625, boxSqFt: 10, tilePerSqFt: 10, laborPerSqFt: 20 },
    exText: (o) => `Example: 12 ft of backsplash 18 in tall is ${o.sqFt} sq ft — about ${o.tiles} 3 × 6 in subway tiles, roughly ${money(o.installedCost)} installed.`,
    how: "Measure from the countertop to the bottom of the upper cabinets (usually 18 in) along each wall. Behind a range, many people tile to the hood.",
    assume: `10% waste. Typical installation $15–30 per sq ft (small or intricate tiles cost more). ${COST_NOTE}`,
    faq: [["How much does a kitchen backsplash cost?", "About $1,000–3,000 installed for a typical kitchen."]],
  }),
  mk({
    slug: "thinset-calculator", title: "Thinset Mortar Calculator (Bags & Trowel Size)",
    desc: "Calculate how many bags of thinset mortar (tile adhesive) you need and which trowel notch to use — from the area and tile size, with back-buttering for large-format tile.",
    inputs: [num("area", "Area to Tile", 100, 100000, 1, 0, "sq ft"), num("tileSize", "Longest Tile Side", 12, 72, 0.5, 1, "in")],
    results: [["bags", "50 lb Bags", "n"], ["trowelNotch", "Trowel", "l", E.TROWELS], ["sqFtPerBag", "Coverage per Bag (sq ft)", "n"], ["pounds", "Thinset (lb)", "n"]],
    fn: E.thinset, ex: { area: 100, tileSize: 12 },
    exText: (o) => `Example: 100 sq ft of 12 in tile set with a ¼ × ⅜ in notch takes about ${o.bags} bag(s) of thinset (${o.sqFtPerBag} sq ft per bag).`,
    how: "Bigger tiles need a bigger notch so the back is fully covered (95% on floors and showers). Back-butter large-format tiles and check coverage by lifting a tile now and then.",
    assume: "Coverage per 50 lb bag: ¼ × ¼ in ≈ 90 sq ft, ¼ × ⅜ in ≈ 65, ½ × ½ in ≈ 42; +20% for back-buttering 15 in+ tiles. Check the bag's chart (Mapei, Custom, Laticrete).",
    faq: [["How much does a bag of thinset cover?", "About 40–95 sq ft depending on the trowel notch."]],
  }),
  mk({
    slug: "tile-layout-calculator", title: "Tile Layout Calculator (Rows, Cuts & Centering)",
    desc: "Plan a tile layout — tiles across and down, and the cut size at each edge when you center the layout (avoiding thin slivers) or start from a wall.",
    inputs: [num("roomWidth", "Room Width", 120, 2000, 0.25, 12, "in"), num("roomLength", "Room Length", 144, 2000, 0.25, 12, "in"), num("tileW", "Tile Width", 12, 60, 0.25, 1, "in"), num("tileL", "Tile Length", 12, 120, 0.25, 1, "in"), num("joint", "Grout Joint", 0.125, 0.5, 0.0625, 0, "in"), dd("start", "Layout", ["Centered (balanced edge cuts)", "Start full tiles at one wall"])],
    results: [["tilesAcross", "Tiles Across", "n"], ["tilesDown", "Tiles Down", "n"], ["edgeCutAcrossIn", "Edge Cut Across (in)", "n"], ["edgeCutDownIn", "Edge Cut Down (in)", "n"], ["totalTiles", "Tiles (full + cut)", "n"]],
    fn: E.tileLayout, ex: { roomWidth: 120, roomLength: 144, tileW: 12, tileL: 12, joint: 0.125, start: 0 },
    exText: (o) => `Example: a 10 × 12 ft room in 12 in tile, centered, has ${o.tilesAcross} tiles across with ${o.edgeCutAcrossIn} in cuts at each side.`,
    how: "Centering gives equal cuts on opposite walls; if those cuts would be under a third of a tile, the layout shifts half a tile to avoid slivers. Start at the most visible wall or doorway if you can't center.",
    assume: "Tile pitch = tile size + joint. Walls are rarely square — snap reference lines first.",
    faq: [["How do I avoid small tile cuts?", "Center the layout and shift by half a tile if the edge cuts come out under a third of a tile."]],
  }),
  mk({
    slug: "baseboard-trim-calculator", title: "Baseboard & Trim Calculator (Baseboard, Casing & Skirting)",
    desc: "Calculate baseboard (skirting) and door and window casing — linear feet, 8, 12 or 16 ft pieces and caulk tubes — from room perimeter, doors and windows.",
    inputs: [num("perimeter", "Room Perimeter", 52, 5000, 0.5, 0, "ft"), num("doors", "Doors", 1, 50, 1), num("windows", "Windows", 2, 50, 1), num("windowW", "Window Width", 3, 10, 0.25, 1, "ft"), num("windowH", "Window Height", 4, 10, 0.25, 1, "ft"), dd("pieceLength", "Piece Length", ["8 ft", "12 ft", "16 ft"], 2)],
    results: [["baseboardFt", "Baseboard (ft, incl. 10%)", "n"], ["baseboardPieces", "Baseboard Pieces", "n"], ["casingFt", "Door & Window Casing (ft)", "n"], ["casingPieces", "Casing Pieces", "n"], ["caulkTubes", "Caulk Tubes", "n"]],
    fn: E.baseboardTrim, ex: { perimeter: 52, doors: 1, windows: 2, windowW: 3, windowH: 4, pieceLength: 2 },
    exText: (o) => `Example: a 12 × 14 ft room with one door and two windows needs ${o.baseboardFt} ft of baseboard (${o.baseboardPieces} sixteen-foot pieces) and ${o.casingFt} ft of casing.`,
    how: "Measure the perimeter and subtract door openings. Buy the longest pieces you can handle to avoid joints on long walls; cope inside corners.",
    assume: "Doors 3 ft wide; door casing ≈ 17 ft per side (two sides); window casing = perimeter + 1 ft; 10% waste.",
    faq: [["How much baseboard do I need for a room?", "The room's perimeter minus doorways, plus 10%."]],
  }),
  mk({
    slug: "crown-molding-calculator", title: "Crown Molding Calculator (Linear Feet & Pieces)",
    desc: "Calculate crown molding — linear feet with waste, 8, 12 or 16 ft pieces, the number of corner joints and caulk — from the room perimeter.",
    inputs: [num("perimeter", "Room Perimeter", 52, 5000, 0.5, 0, "ft"), num("insideCorners", "Inside Corners", 4, 50, 1), num("outsideCorners", "Outside Corners", 0, 50, 1), dd("pieceLength", "Piece Length", ["8 ft", "12 ft", "16 ft"], 2)],
    results: [["linearFeet", "Crown Molding (ft, incl. 15%)", "n"], ["pieces", "Pieces", "n"], ["joints", "Corner Joints to Cut", "n"], ["caulkTubes", "Caulk Tubes", "n"]],
    fn: E.crownMolding, ex: { perimeter: 52, insideCorners: 4, outsideCorners: 0, pieceLength: 2 },
    exText: (o) => `Example: a 12 × 14 ft room needs ${o.linearFeet} ft of crown — ${o.pieces} pieces of 16 ft with 15% for corner cuts.`,
    how: "Crown wastes more than baseboard because of the corner cuts. Use the compound miter calculator for the saw angles, or cope the inside corners.",
    assume: "15% waste; caulk ≈ one tube per 40 ft.",
    faq: [["How much crown molding do I need?", "The room's perimeter plus about 15%."]],
  }),
  mk({
    slug: "wainscoting-calculator", title: "Wainscoting Calculator (Panels, Boxes & Chair Rail)",
    desc: "Plan wainscoting — a recommended height, picture-frame boxes with even spacing and moulding length, chair rail, and beadboard panels — from wall length and height.",
    inputs: [num("wallLength", "Wall Length (total)", 40, 2000, 0.5, 1, "ft"), num("wallHeight", "Ceiling Height", 8, 20, 0.5, 6, "ft"), num("height", "Wainscot Height", 36, 72, 0.5, 24, "in"), num("boxWidth", "Target Box Width", 30, 72, 0.5, 8, "in")],
    results: [["recommendedHeightIn", "Recommended Height (⅓ of wall, in)", "n"], ["boxes", "Picture-Frame Boxes", "n"], ["boxWidthIn", "Box Width (in)", "n"], ["boxMouldingFt", "Box Moulding (ft)", "n"], ["chairRailFt", "Chair Rail (ft)", "n"], ["beadboardSheets", "Or Beadboard Sheets (4 × 8)", "n"]],
    fn: E.wainscoting, ex: { wallLength: 40, wallHeight: 8, height: 36, boxWidth: 30 },
    exText: (o) => `Example: 40 ft of wall at 36 in high takes ${o.boxes} boxes about ${o.boxWidthIn} in wide — ${o.boxMouldingFt} ft of box moulding and ${o.chairRailFt} ft of chair rail.`,
    how: "A classic wainscot is about a third of the wall height (32–36 in on 8 ft walls; taller in dining rooms). Space boxes evenly between corners, doors and windows — the calculator gives a starting layout for one long wall.",
    assume: "4 in stiles between boxes; boxes 10 in shorter than the wainscot (rail and base); 10% extra moulding.",
    faq: [["How high should wainscoting be?", "About one third of the wall height — 32–36 in for 8 ft ceilings."]],
  }),
  mk({
    slug: "frame-molding-calculator", title: "Picture Frame Molding Calculator (Frames & Wall Boxes)",
    desc: "Calculate picture frame moulding for a frame from the artwork size and moulding width — and plan picture-frame wall moulding boxes with even widths and total length.",
    inputs: [num("artWidth", "Artwork Width", 16, 100, 0.25, 1, "in"), num("artHeight", "Artwork Height", 20, 100, 0.25, 1, "in"), num("moldingWidth", "Moulding Width", 2, 6, 0.125, 0.25, "in"), num("wallWidth", "Wall Width (wall boxes)", 120, 1000, 0.5, 12, "in"), num("boxHeight", "Box Height", 24, 96, 0.5, 4, "in"), num("boxes", "Number of Boxes", 3, 20, 1, 1), num("gap", "Gap Between Boxes", 4, 24, 0.25, 0, "in"), num("margin", "Margin at Wall Ends", 4, 24, 0.25, 0, "in")],
    results: [["pictureMoldingIn", "Frame Moulding (in)", "n"], ["pictureMoldingFt", "Frame Moulding (ft)", "n"], ["wallBoxWidthIn", "Wall Box Width (in)", "n"], ["wallMouldingFt", "Wall Box Moulding (ft)", "n"], ["pieces8ft", "8 ft Moulding Pieces", "n"]],
    fn: E.frameMolding, ex: { artWidth: 16, artHeight: 20, moldingWidth: 2, wallWidth: 120, boxHeight: 24, boxes: 3, gap: 4, margin: 4 },
    exText: (o) => `Example: a 16 × 20 in print with 2 in moulding needs ${o.pictureMoldingIn} in of moulding; three wall boxes on a 10 ft wall come out ${o.wallBoxWidthIn} in wide.`,
    how: "Frames: each corner miter uses twice the moulding width, so add 8 × the width plus waste. Wall boxes: pick how many boxes and the gaps — the calculator splits the wall evenly.",
    assume: "Frame = 2 × (width + height) + 8 × moulding width + 10%; wall boxes +10% for miters.",
    faq: [["How much moulding do I need for a picture frame?", "The perimeter plus 8 times the moulding width, plus 10%."]],
  }),
  mk({
    slug: "picture-spacing-calculator", title: "Picture & Gallery Wall Spacing Calculator",
    desc: "Space pictures evenly on a wall — the gap between frames, the nail height for an eye-level center (57 in) and where each nail goes from the left edge.",
    inputs: [num("wallWidth", "Wall Width (or space to fill)", 96, 1000, 0.25, 12, "in"), num("frames", "Number of Frames", 3, 20, 1, 1), num("frameWidth", "Frame Width", 16, 100, 0.25, 1, "in"), num("frameHeight", "Frame Height", 20, 100, 0.25, 1, "in"), num("centerHeight", "Center Height From Floor", 57, 72, 0.5, 40, "in"), num("hangerDrop", "Hanger Drop (top of frame to hook)", 3, 20, 0.25, 0, "in")],
    results: [["gapIn", "Gap Between Frames (in)", "n"], ["nailHeightIn", "Nail Height (in)", "n"], ["firstNailFromLeftIn", "First Nail From Left (in)", "n"], ["nailSpacingIn", "Then Every (in)", "n"]],
    fn: E.pictureSpacing, ex: { wallWidth: 96, frames: 3, frameWidth: 16, frameHeight: 20, centerHeight: 57, hangerDrop: 3 },
    exText: (o) => `Example: three 16 × 20 in frames on an 8 ft wall are ${o.gapIn} in apart; put the first nail ${o.firstNailFromLeftIn} in from the left at ${o.nailHeightIn} in high, then every ${o.nailSpacingIn} in.`,
    how: "Galleries hang art with its center about 57 in from the floor. Pull the hanging wire up to measure the drop. Over a sofa, keep the bottom of frames 8–10 in above the back.",
    assume: "Equal gaps at the ends and between frames; nail height = center height + half the frame height − hanger drop.",
    faq: [["How high should pictures be hung?", "With the center about 57–60 in above the floor."]],
  }),
  mk({
    slug: "cabinet-door-calculator", title: "Cabinet Door Size Calculator (Overlay & Inset)",
    desc: "Calculate cabinet door sizes from the opening — full overlay, partial overlay or inset — and split wide openings into a pair of doors with a center gap.",
    inputs: [num("openingWidth", "Opening Width", 30, 60, 0.0625, 6, "in"), num("openingHeight", "Opening Height", 30, 60, 0.0625, 6, "in"), dd("style", "Door Style", E.DOOR_STYLES)],
    results: [["doors", "Doors", "n"], ["doorWidthIn", "Door Width (each, in)", "n"], ["doorHeightIn", "Door Height (in)", "n"], ["overlayEachSideIn", "Overlay Each Side (in)", "n"]],
    fn: E.cabinetDoor, ex: { openingWidth: 30, openingHeight: 30, style: 0 },
    exText: (o) => `Example: a 30 × 30 in opening with ½ in overlay takes ${o.doors} doors ${o.doorWidthIn} × ${o.doorHeightIn} in each.`,
    how: "Measure the face-frame opening. Openings wider than about 24 in usually get two doors. Hinge type sets the overlay — check your hinges before ordering doors.",
    assume: "Overlay doors are 1 in larger than the opening (½ in each side); pairs leave ⅛ in between doors; inset doors are 1/16 in smaller each side.",
    faq: [["How do I size cabinet doors for ½ inch overlay?", "Add 1 in to the opening width and height."]],
  }),
  mk({
    slug: "cabinet-hardware-calculator", title: "Cabinet Knob & Pull Placement Calculator",
    desc: "Choose the right pull size for a drawer width and find where to put knobs and pulls on drawers and doors — center-to-center spacing and distances from the edges.",
    inputs: [num("drawerWidth", "Drawer Front Width", 18, 60, 0.25, 6, "in"), num("drawerHeight", "Drawer Front Height", 6, 30, 0.25, 3, "in")],
    results: [["pullSize", "Suggested Hardware", "l", E.PULL_SIZES], ["centerToCenterIn", "Pull Center-to-Center (in)", "n"], ["pullFromTopIn", "Pull Height From Top of Drawer (in)", "n"], ["doorKnobFromEdgeIn", "Door Knob From Opening Edge (in)", "n"], ["doorKnobFromCornerIn", "Door Knob From Top/Bottom Corner (in)", "n"]],
    fn: E.cabinetHardware, ex: { drawerWidth: 18, drawerHeight: 6 },
    exText: (o) => `Example: an 18 in wide drawer looks right with a ${E.PULL_SIZES[o.pullSize].split(" (")[0].toLowerCase()} (${o.centerToCenterIn} in center to center), centered ${o.pullFromTopIn} in down.`,
    how: "A pull about a third of the drawer width is a common rule. On lower doors, put knobs near the top corner; on uppers, near the bottom corner. Make a cardboard template so every drawer matches.",
    assume: "Common sizes: 3¾ in (96 mm), 5 in (128 mm), 7½ in (192 mm). Tall drawers (over 10 in) get pulls about 2½ in from the top.",
    faq: [["What size pulls for a 30 inch drawer?", "About a 5–6 in (128–160 mm) pull, or two smaller pulls."]],
  }),
  mk({
    slug: "home-theater-size-calculator", title: "Home Theater Screen Size & Seating Calculator",
    desc: "Find the right screen size for your seating distance (THX and SMPTE viewing angles) and how many rows and seats fit in a home theater room.",
    inputs: [num("seatingDistance", "Seating Distance (eyes to screen)", 12, 40, 0.5, 4, "ft"), num("roomLength", "Room Length", 20, 60, 0.5, 8, "ft"), num("roomWidth", "Room Width", 14, 60, 0.5, 6, "ft")],
    results: [["thxDiagonalIn", "Immersive Screen — THX 40° (in, 16:9)", "n"], ["smpteDiagonalIn", "Comfortable Screen — SMPTE 30° (in)", "n"], ["rows", "Seating Rows", "n"], ["seatsPerRow", "Seats per Row", "n"]],
    fn: E.homeTheater, ex: { seatingDistance: 12, roomLength: 20, roomWidth: 14 },
    exText: (o) => `Example: sitting 12 ft from the screen suits a ${o.smpteDiagonalIn}–${o.thxDiagonalIn} in 16:9 screen; a 20 × 14 ft room fits about ${o.rows} row(s) of ${o.seatsPerRow} seats.`,
    how: "Pick a size between the SMPTE (comfortable) and THX (immersive) numbers. Allow about 6 ft per row for recliners and risers of 12–18 in for back rows.",
    assume: "THX ≈ 40° horizontal angle (width = 0.728 × distance), SMPTE ≈ 30° (width = 0.536 × distance); seats ≈ 2.2 ft wide.",
    faq: [["What size screen for 12 feet away?", "About 88–120 in diagonal."]],
  }),
  mk({
    slug: "furniture-fit-door-calculator", title: "Will It Fit Through the Door Calculator (Sofa & Couch)",
    desc: "Check whether a sofa, couch or other furniture will fit through a door — flat, tilted (diagonal depth) or upended — using the classic sofa diagonal measurement.",
    inputs: [num("height", "Sofa Height (back)", 34, 60, 0.25, 10, "in"), num("depth", "Sofa Depth", 38, 60, 0.25, 10, "in"), num("diagonalDepth", "Diagonal Depth (0 = estimate)", 0, 60, 0.25, 0, "in"), num("length", "Sofa Length", 84, 140, 0.5, 20, "in"), num("doorWidth", "Door Opening Width", 32, 72, 0.25, 20, "in"), num("doorHeight", "Door Opening Height", 80, 100, 0.25, 60, "in")],
    results: [["result", "Result", "l", E.FIT_RESULTS], ["clearanceIn", "Clearance (in)", "n"], ["doorDiagonalIn", "Door Diagonal (in)", "n"], ["upendOk", "Can Be Upended Through the Door (1 = yes)", "n"]],
    fn: E.furnitureFit, ex: { height: 34, depth: 38, diagonalDepth: 0, length: 84, doorWidth: 32, doorHeight: 80 },
    exText: (o) => `Example: a 34 in tall, 38 in deep sofa and a 32 in door — ${E.FIT_RESULTS[o.result].split(" — ")[0].toLowerCase()}.`,
    how: "Measure the diagonal depth: run a tape from the top back of the sofa to the front edge of the arm or seat, then measure the shortest distance from that line to the back bottom. If it's less than the door width, you can tilt it through. Remove the door from its hinges for an extra inch or two.",
    assume: "If you don't enter a diagonal depth, it's estimated at 60% of the height–depth diagonal. Hallway turns and stairs can still block a fit.",
    faq: [["How do I know if a couch will fit through my door?", "Compare the couch's diagonal depth (or its smaller of height and depth) with the door width."]],
  }),
  mk({
    slug: "acoustic-panels-calculator", title: "Acoustic Panel Calculator (How Many Panels for a Room)",
    desc: "Estimate how many acoustic panels a room needs to reach a target reverberation time (RT60) for a home theater, studio, living room or office — with wall coverage.",
    inputs: [num("length", "Room Length", 16, 200, 0.5, 4, "ft"), num("width", "Room Width", 12, 200, 0.5, 4, "ft"), num("height", "Ceiling Height", 8, 30, 0.5, 6, "ft"), dd("use", "Room Use", E.ACOUSTIC_USES), dd("furnished", "Room Now", ["Hard surfaces, little furniture", "Carpet, sofa, curtains"])],
    results: [["panels", "2 × 4 ft Panels Needed", "n"], ["currentRt60", "Current Reverb Time (s)", "n"], ["targetRt60", "Target Reverb Time (s)", "n"], ["extraSabins", "Extra Absorption Needed (sabins)", "n"], ["wallCoveragePct", "Wall Coverage (%)", "n"]],
    fn: E.acousticPanels, ex: { length: 16, width: 12, height: 8, use: 0, furnished: 1 },
    exText: (o) => `Example: a 16 × 12 ft furnished home theater (RT60 about ${o.currentRt60} s) needs about ${o.panels} panels of 2 × 4 ft to reach ${o.targetRt60} s.`,
    how: "Put panels at first-reflection points (side walls, ceiling between you and the speakers) and on the back wall. Thicker panels (2–4 in) absorb more bass; bass traps go in corners.",
    assume: "Sabine RT60 = 0.049 × volume ÷ absorption; average absorption 0.05 (hard) or 0.12 (furnished); each panel ≈ 6.8 sabins (NRC 0.85). A rough planning estimate.",
    faq: [["How many acoustic panels do I need?", "Often enough to cover 15–30% of the wall area."]],
  }),
  mk({
    slug: "bean-bag-fill-calculator", title: "Bean Bag Filling Calculator (Cubic Feet & Liters)",
    desc: "Work out how much bean bag filler you need — cubic feet, liters and bags — for round or rectangular bean bags at your preferred fill level.",
    inputs: [dd("shape", "Shape", ["Round / ball", "Rectangular / cube"]), num("diameter", "Diameter (round)", 36, 100, 0.5, 10, "in"), num("length", "Length (rectangular)", 30, 100, 0.5, 10, "in"), num("width", "Width", 30, 100, 0.5, 10, "in"), num("height", "Height", 24, 100, 0.5, 10, "in"), pct("fill", "Fill Level", 75, 100, 5), num("bagCuFt", "Filler Bag Size", 4, 20, 0.5, 0.5, "cu ft")],
    results: [["cubicFeet", "Filler (cu ft)", "n"], ["liters", "Liters", "n"], ["bags", "Filler Bags", "n"]],
    fn: E.beanBagFill, ex: { shape: 0, diameter: 36, length: 30, width: 30, height: 24, fill: 75, bagCuFt: 4 },
    exText: (o) => `Example: a 36 in round bean bag filled to 75% takes about ${o.cubicFeet} cu ft (${o.liters} L) of filler — ${o.bags} bags of 4 cu ft.`,
    how: "Fill to about two-thirds to three-quarters so the bag molds around you; top up as beads compress over time.",
    assume: "Sphere volume π/6 × diameter³; box = L × W × H. 1 cu ft = 28.3 L.",
    faq: [["How much filler for a bean bag?", "About 5–8 cu ft for an adult-size bag."]],
  }),
  mk({
    slug: "lamp-shade-size-calculator", title: "Lamp Shade Size Calculator",
    desc: "Find the right lamp shade size for a lamp base — shade height, bottom and top diameter and harp size — using classic proportions.",
    inputs: [num("baseHeight", "Base Height (to the socket)", 20, 48, 0.5, 6, "in"), num("baseWidth", "Base Widest Point", 6, 24, 0.5, 2, "in")],
    results: [["shadeHeightIn", "Shade Height (in)", "n"], ["bottomDiameterIn", "Bottom Diameter (in)", "n"], ["topDiameterIn", "Top Diameter (in)", "n"], ["harpIn", "Harp Size (in)", "n"]],
    fn: E.lampShade, ex: { baseHeight: 20, baseWidth: 6 },
    exText: (o) => `Example: a 20 in base suits a shade about ${o.shadeHeightIn} in tall and ${o.bottomDiameterIn} in across the bottom, on a ${o.harpIn} in harp.`,
    how: "The shade should be about two-thirds the base height and at least twice the base's widest point (about as wide as the base is tall for most table lamps), covering the socket when you're seated.",
    assume: "Shade height ≈ ⅔ base height; bottom ≈ max(2 × base width, 0.8 × base height); top ≈ ¾ of the bottom (use the same for a drum shade).",
    faq: [["What size lamp shade do I need?", "About two-thirds the height of the base and roughly as wide as the base is tall."]],
  }),
  mk({
    slug: "bed-height-calculator", title: "Bed Height Calculator (Mattress & Frame Height)",
    desc: "Find a comfortable bed height for your height — the top of the mattress at about knee height — and the frame height to pair with your mattress thickness.",
    inputs: [num("height", "Your Height", 68, 90, 0.5, 48, "in"), num("mattress", "Mattress Thickness", 12, 20, 0.5, 4, "in"), num("extra", "Extra Height Preferred", 1.5, 6, 0.5, -3, "in")],
    results: [["mattressTopIn", "Top of Mattress (in)", "n"], ["frameHeightIn", "Frame / Foundation Height (in)", "n"], ["kneeHeightIn", "Your Knee Height (in)", "n"]],
    fn: E.bedHeight, ex: { height: 68, mattress: 12, extra: 1.5 },
    exText: (o) => `Example: for someone 5 ft 8 in tall, the top of the mattress at about ${o.mattressTopIn} in is comfortable — a ${o.frameHeightIn} in frame under a 12 in mattress.`,
    how: "Sit on the edge of the bed: your feet should rest flat with knees at about 90°. Older adults often prefer a little higher to stand up easily.",
    assume: "Knee height ≈ 0.285 × standing height (typical adult proportions).",
    faq: [["How high should a bed be?", "With the mattress top roughly at knee height — about 20–25 in for most adults."]],
  }),
  mk({
    slug: "counter-height-calculator", title: "Kitchen Counter Height Calculator (Ergonomic)",
    desc: "Find an ergonomic kitchen counter height for your height — work and baking counters, the 36 in standard, bar height and bathroom vanity.",
    inputs: [num("height", "Your Height", 66, 90, 0.5, 48, "in")],
    results: [["workCounterIn", "Ergonomic Work Counter (in)", "n"], ["bakingCounterIn", "Baking / Kneading Counter (in)", "n"], ["standardIn", "Standard Counter (in)", "n"], ["barHeightIn", "Bar Height (in)", "n"], ["vanityIn", "Bathroom Vanity (in)", "n"]],
    fn: E.counterHeight, ex: { height: 66 },
    exText: (o) => `Example: for someone 5 ft 6 in tall, an ergonomic work counter is about ${o.workCounterIn} in (the standard is 36 in) and a baking counter ${o.bakingCounterIn} in.`,
    how: "Stand with elbows bent at 90°: a counter about 5 in (4–6 in) below your elbow is comfortable for chopping. Kneading and baking work well a few inches lower.",
    assume: "Standing elbow height ≈ 0.63 × stature. Most kitchen cabinets give a 36 in counter; custom heights affect appliances and resale.",
    faq: [["What is the standard kitchen counter height?", "36 in."]],
  }),
  mk({
    slug: "stone-slab-weight-calculator", title: "Countertop Slab Weight Calculator (Quartz, Granite & Marble)",
    desc: "Calculate how much a stone countertop weighs — quartz, granite, marble, quartzite, soapstone or porcelain at 2 or 3 cm — in pounds and kilograms, per sq ft, and how many people to carry it.",
    inputs: [num("lengthIn", "Countertop Length", 96, 600, 0.5, 6, "in"), num("depthIn", "Countertop Depth", 25.5, 72, 0.5, 6, "in"), dd("stone", "Material", E.STONES), dd("thickness", "Thickness", ["2 cm (¾ in)", "3 cm (1¼ in)", "1.2 cm (½ in, porcelain)"], 1)],
    results: [["weightLb", "Weight (lb)", "n"], ["weightKg", "Weight (kg)", "n"], ["lbPerSqFt", "Pounds per Sq Ft", "n"], ["sqFt", "Area (sq ft)", "n"], ["carriers", "People to Carry It", "n"]],
    fn: E.stoneSlabWeight, ex: { lengthIn: 96, depthIn: 25.5, stone: 0, thickness: 1 },
    exText: (o) => `Example: an 8 ft × 25.5 in granite countertop at 3 cm weighs about ${o.weightLb} lb (${o.lbPerSqFt} lb per sq ft).`,
    how: "Enter the size and material. Stone is heavy and brittle — carry slabs on edge, never flat, and check cabinets can take the load (especially overhangs and islands).",
    assume: "Densities (g/cm³): granite 2.70, quartz 2.45, marble 2.71, quartzite 2.65, soapstone 2.98, porcelain 2.40; about 75 lb per person carrying.",
    faq: [["How much does a 3 cm granite countertop weigh?", "About 17 lb per sq ft."]],
  }),
  mk({
    slug: "countertop-area-calculator", title: "Countertop Square Footage Calculator",
    desc: "Calculate countertop square footage — up to three runs plus an island and a full-height or 4 in backsplash, minus cutouts — and how many stone slabs to order.",
    inputs: [num("l1", "Run 1 Length", 96, 600, 0.5, 0, "in"), num("d1", "Run 1 Depth", 25.5, 60, 0.5, 0, "in"), num("l2", "Run 2 Length", 60, 600, 0.5, 0, "in"), num("d2", "Run 2 Depth", 25.5, 60, 0.5, 0, "in"), num("l3", "Run 3 Length", 0, 600, 0.5, 0, "in"), num("d3", "Run 3 Depth", 0, 60, 0.5, 0, "in"), num("islandL", "Island Length", 72, 300, 0.5, 0, "in"), num("islandD", "Island Depth", 36, 100, 0.5, 0, "in"), num("splashLength", "Stone Backsplash Length", 156, 1000, 0.5, 0, "in"), num("splashHeight", "Stone Backsplash Height", 4, 48, 0.5, 0, "in"), num("cutouts", "Sink Cutouts (to subtract)", 0, 3000, 10, 0, "sq in")],
    results: [["sqFt", "Countertop Area (sq ft)", "n"], ["topSqFt", "Tops (sq ft)", "n"], ["splashSqFt", "Backsplash (sq ft)", "n"], ["slabs", "Slabs to Order (≈ 120 × 55 in)", "n"]],
    fn: E.countertopArea, ex: { l1: 96, d1: 25.5, l2: 60, d2: 25.5, l3: 0, d3: 0, islandL: 72, islandD: 36, splashLength: 156, splashHeight: 4, cutouts: 0 },
    exText: (o) => `Example: an 8 ft and a 5 ft run plus a 6 × 3 ft island and a 4 in splash come to about ${o.sqFt} sq ft — ${o.slabs} slabs.`,
    how: "Measure each run along the wall and its depth (usually 25.5 in with the overhang). Fabricators often price the full slab, so ask how they count leftovers and cutouts.",
    assume: "Slabs ≈ 120 × 55 in (45.8 sq ft) with 20% waste for seams and grain matching; cutouts are usually still charged.",
    faq: [["How do I measure countertops in square feet?", "Length × depth in inches for each piece, added up, divided by 144."]],
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
