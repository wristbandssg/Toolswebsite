// One-time (but safe to re-run) batch setup script: creates 31 calculators in House & Garden
// Calculators > Framing, Drywall, Insulation & Siding Calculators (drywall, framing, joists, sheathing, siding, insulation, woodworking and shed or barn materials). Formulas live in src/lib/calc-engine-hg-frame.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-frame-calculators.ts
// or
//   npm run db:create-hg-frame-calculators

import * as E from "../src/lib/calc-engine-hg-frame";

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

const CAT = "framing-drywall-insulation-siding-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region and job — get local quotes.";
const PERIM = num("perimeter", "Wall Perimeter", 160, 10000, 1, 0, "ft");
const WALLH = num("wallHeight", "Wall Height", 9, 30, 0.5, 6, "ft");
const GABLES = [num("gables", "Gable Ends", 2, 10, 1), num("gableWidth", "Gable Width", 30, 200, 0.5, 0, "ft"), num("gableRise", "Gable Rise (height)", 7.5, 40, 0.5, 0, "ft")];
const PIECE = (i: number, w: number, l: number, q: number) => [num(`w${i}`, `Piece ${i} Width`, w, 48, 0.125, 0, "in"), num(`l${i}`, `Piece ${i} Length`, l, 96, 0.125, 0, "in"), num(`q${i}`, `Piece ${i} Quantity`, q, 200, 1, 0)];

const TOOLS: ToolDef[] = [
  mk({
    slug: "drywall-calculator", title: "Drywall Calculator (Sheets, Screws, Mud & Tape)",
    desc: "Work out how many sheets of drywall you need for a room's walls and ceiling — 4×8, 4×10 or 4×12 — minus doors and windows, with screws, joint compound and tape.",
    meta: "Drywall Calculator — How Many Sheets of Drywall Do I Need?",
    inputs: [num("length", "Room Length", 12, 200, 0.5, 1, "ft"), num("width", "Room Width", 12, 200, 0.5, 1, "ft"), num("height", "Wall Height", 8, 20, 0.5, 6, "ft"), dd("ceiling", "Include Ceiling?", ["No", "Yes"], 1), num("doors", "Doors", 1, 20, 1), num("windows", "Windows", 2, 30, 1), dd("sheet", "Sheet Size", ["4 × 8 ft", "4 × 10 ft", "4 × 12 ft"])],
    results: [["sheets", "Drywall Sheets (incl. 10%)", "n"], ["area", "Total Area (sq ft)", "n"], ["wallArea", "Wall Area (sq ft)", "n"], ["ceilingArea", "Ceiling Area (sq ft)", "n"], ["screws", "Drywall Screws", "n"], ["mudBuckets", "Joint Compound (4.5 gal buckets)", "n"], ["tapeFeet", "Paper Tape (ft)", "n"]],
    fn: E.drywall, ex: { length: 12, width: 12, height: 8, ceiling: 1, doors: 1, windows: 2, sheet: 0 },
    exText: (o) => `Example: a 12 × 12 ft room with 8 ft walls, one door and two windows needs ${o.sheets} sheets of 4 × 8 drywall (walls + ceiling) and about ${o.mudBuckets} bucket(s) of joint compound.`,
    how: "Enter the room size and openings. Longer sheets mean fewer seams — use 4 × 12 ft sheets on big walls and ceilings if you can get them in. Use ½ in on walls and ⅝ in (or ½ in sag-resistant) on ceilings.",
    assume: "Doors ≈ 21 sq ft, windows ≈ 15 sq ft; 10% waste. Screws ≈ 32 per sheet on walls and 40 on ceilings; compound ≈ 138 lb per 1,000 sq ft; tape ≈ 370 ft per 1,000 sq ft.",
    faq: [["How many sheets of drywall for a 12x12 room?", "About 14–16 sheets of 4 × 8 for the walls and ceiling."]],
  }),
  mk({
    slug: "drywall-mud-calculator", title: "Drywall Mud Calculator (Joint Compound & Tape)",
    desc: "Estimate joint compound for drywall finishing — buckets of ready-mix, pounds and gallons, setting-compound bags and rolls of tape — by area and finish level.",
    inputs: [num("area", "Drywall Area", 1000, 1000000, 10, 0, "sq ft"), dd("level", "Finish Level", ["Level 3 (under heavy texture)", "Level 4 (standard for paint)", "Level 5 (full skim coat)"], 1)],
    results: [["buckets", "Ready-Mix Buckets (4.5 gal)", "n"], ["pounds", "Joint Compound (lb)", "n"], ["gallons", "Gallons", "n"], ["powderBags", "Or Setting Compound (18 lb bags)", "n"], ["tapeRolls", "Paper Tape (500 ft rolls)", "n"]],
    fn: E.drywallMud, ex: { area: 1000, level: 1 },
    exText: (o) => `Example: finishing 1,000 sq ft of drywall to level 4 takes about ${o.pounds} lb of joint compound — ${o.buckets} buckets — and ${o.tapeRolls} roll(s) of tape.`,
    how: "Use setting-type compound (hot mud) for taping and the first coat if you're in a hurry, then all-purpose or lightweight ready-mix for finish coats. Level 5 adds a thin skim over the whole wall for glossy paint or strong side light.",
    assume: "≈ 138 lb of ready-mix per 1,000 sq ft for level 4 (USG); level 3 ×0.85, level 5 ×1.6; 4.5 gal buckets ≈ 61 lb; setting powder ≈ 1.3 lb of mixed compound per lb of powder.",
    faq: [["How much joint compound do I need?", "About one 4.5 gallon bucket per 400–450 sq ft of drywall for a standard finish."]],
  }),
  mk({
    slug: "drywall-repair-cost-calculator", title: "Drywall Repair Cost Calculator",
    desc: "Estimate drywall repair costs — small, medium and large holes, water-damaged ceiling areas, texture matching and paint — with a typical minimum charge.",
    inputs: [num("small", "Small Holes (under 4 in)", 2, 100, 1), num("medium", "Medium Holes (4–12 in)", 1, 100, 1), num("large", "Large Holes / Sections (over 12 in)", 0, 100, 1), num("ceilingSqFt", "Water-Damaged Ceiling Area", 0, 1000, 1, 0, "sq ft"), dd("texture", "Match Texture?", ["No", "Yes"]), dd("paint", "Paint the Repairs?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.drywallRepairCost, ex: { small: 2, medium: 1, large: 0, ceilingSqFt: 0, texture: 0, paint: 1 },
    exText: (o) => `Example: patching two small and one medium hole and painting them costs about ${money(o.totalCost)}.`,
    how: "Handymen usually charge a minimum visit fee, so bundle repairs. Fix the cause of water damage first, and replace soaked drywall rather than patching it.",
    assume: `Typical prices: small $100, medium $200, large $400 each, water-damaged ceiling $8 per sq ft, texture matching $50 per patch, paint touch-up $150; $150 minimum. ${COST_NOTE}`,
    faq: [["How much does drywall repair cost?", "About $100–400 per hole, with a $150–250 minimum for a visit."]],
  }),
  mk({
    slug: "framing-cost-calculator", title: "Framing Cost Calculator (House & Interior Walls)",
    desc: "Estimate framing costs — whole-house framing per square foot (labor and materials or labor only) or interior wood or metal stud walls per linear foot.",
    inputs: [dd("mode", "What You're Framing", E.FRAMING_MODES), num("quantity", "Square Feet (house) or Linear Feet (walls)", 2000, 100000, 1, 0), usd("customRate", "Your Price (0 = typical)", 0, 500, 0.5)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["rate", "Rate Used", "c"]],
    fn: E.framingCost, ex: { mode: 0, quantity: 2000, customRate: 0 },
    exText: (o) => `Example: framing a 2,000 sq ft house (labor and materials) costs about ${money(o.totalCost)}.`,
    how: "Pick what you're framing. Lumber prices swing a lot — ask the framer whether the quote includes materials, sheathing, trusses and hardware.",
    assume: `Typical prices: whole-house framing $18 per sq ft with materials or $8 labor only; interior wood stud walls $30 and metal stud walls $35 per linear ft (8 ft tall). ${COST_NOTE}`,
    faq: [["How much does it cost to frame a house?", "Roughly $15–25 per sq ft of floor area for labor and materials."]],
  }),
  mk({
    slug: "framing-nails-calculator", title: "Framing Nail Calculator (How Many Nails to Order)",
    desc: "Estimate framing nails — 16d nails for wall framing and 8d nails for wall, roof and floor sheathing — in nails, pounds and collated boxes.",
    inputs: [num("wallFeet", "Wall Length (all walls)", 200, 100000, 1, 0, "ft"), num("studSpacing", "Stud Spacing", 16, 24, 1, 12, "in"), num("sheathingSheets", "Wall & Roof Sheathing Sheets", 60, 10000, 1, 0), num("deckSheets", "Subfloor Sheets", 30, 10000, 1, 0)],
    results: [["framingNails16d", "16d Framing Nails", "n"], ["framingLb", "16d Nails (lb)", "n"], ["sheathingNails8d", "8d Sheathing Nails", "n"], ["sheathingLb", "8d Nails (lb)", "n"], ["boxes", "Collated Boxes (2,500)", "n"]],
    fn: E.framingNails, ex: { wallFeet: 200, studSpacing: 16, sheathingSheets: 60, deckSheets: 30 },
    exText: (o) => `Example: 200 ft of 2×4 walls and 90 sheets of sheathing take about ${n2(o.framingNails16d)} 16d nails and ${n2(o.sheathingNails8d)} 8d nails — ${o.boxes} collated boxes.`,
    how: "Enter your wall length and sheet counts. Order a little extra — framing crews go through nails fast — and check your local nailing schedule (IRC Table R602.3(1)).",
    assume: "Per foot of wall: 4 end-nails per stud plus top- and bottom-plate nailing, +20% for headers and corners. Sheathing ≈ 50 nails per wall/roof sheet, 60 per subfloor sheet. ≈ 47 16d and 106 8d nails per lb.",
    faq: [["How many nails do I need to frame a wall?", "About 6 framing nails per foot of wall, plus sheathing nails."]],
  }),
  mk({
    slug: "rake-wall-calculator", title: "Rake Wall Calculator (Sloped Wall Stud Lengths)",
    desc: "Lay out a rake (sloped) wall — number of studs, shortest and tallest stud, how much each stud grows, top plate length and angle — from wall length and pitch.",
    inputs: [num("length", "Wall Length", 12, 100, 0.25, 1, "ft"), num("lowHeight", "Shortest Stud Length", 92.625, 200, 0.125, 12, "in"), num("pitch", "Roof Pitch (rise per 12)", 4, 24, 0.5, 0.5, "in"), num("spacing", "Stud Spacing", 16, 24, 1, 12, "in")],
    results: [["studs", "Studs", "n"], ["shortestStudIn", "Shortest Stud (in)", "n"], ["tallestStudIn", "Tallest Stud (in)", "n"], ["incrementIn", "Each Stud Grows By (in)", "n"], ["topPlateFt", "Top Plate Length (ft)", "n"], ["angleDeg", "Top Cut Angle (°)", "n"]],
    fn: E.rakeWall, ex: { length: 12, lowHeight: 92.625, pitch: 4, spacing: 16 },
    exText: (o) => `Example: a 12 ft rake wall at 4/12 with studs every 16 in has ${o.studs} studs growing ${o.incrementIn} in each — from ${o.shortestStudIn} to ${o.tallestStudIn} in.`,
    how: "Snap the slope on the floor, lay out studs on the bottom plate, and cut each one taller by the increment. Cut the stud tops at the roof angle.",
    assume: "Increment = spacing × pitch ÷ 12; lengths measured on the short side of the angled cut.",
    faq: [["How do you figure rake wall stud lengths?", "Add spacing × pitch ÷ 12 to each stud as you move up the slope."]],
  }),
  mk({
    slug: "joist-span-calculator", title: "Joist Span Calculator (Floor, Deck & Ceiling Joists)",
    desc: "Estimate maximum spans for floor, deck and ceiling joists — 2×6 to 2×12, by species and spacing — and how many joists a floor needs.",
    inputs: [dd("size", "Joist Size", E.LUMBER, 2), dd("species", "Species & Grade", E.SPECIES), dd("spacing", "Spacing", ["12 in", "16 in", "19.2 in", "24 in"], 1), dd("use", "Use", E.JOIST_USES), num("floorLength", "Floor Length (for joist count)", 20, 500, 0.5, 1, "ft")],
    results: [["maxSpanFt", "Maximum Span (ft)", "n"], ["feet", "Feet", "n"], ["inches", "+ Inches", "n"], ["joists", "Joists Needed", "n"], ["limitedBy", "Limited By", "l", E.SPAN_LIMITS]],
    fn: E.joistSpan, ex: { size: 2, species: 0, spacing: 1, use: 0, floorLength: 20 },
    exText: (o) => `Example: 2×10 Douglas fir No. 2 floor joists at 16 in can span about ${o.feet} ft ${o.inches} in — ${o.joists} joists for a 20 ft floor.`,
    how: "Pick the joist, spacing and use. Spans are clear spans between supports. For I-joists or open-web trusses, use the manufacturer's span tables.",
    assume: "Bending and deflection with NDS 2018 No. 2 values (repetitive-member factor); floors 40 or 30 psf live + 10 dead at L/360, decks wet-service, ceilings L/240. Estimate only — IRC Tables R502.3 and R802.5 govern.",
    faq: [["How far can a 2x10 floor joist span?", "About 15–16 ft at 16 in on center for typical species."]],
  }),
  mk({
    slug: "plywood-calculator", title: "Plywood Sheet Calculator (Sheets, Weight & Cost)",
    desc: "Work out how many sheets of plywood or OSB you need for a floor, roof, wall or project — 4×8, 4×9 or 4×10 — with waste, weight and cost.",
    meta: "Plywood Calculator — How Many Sheets of Plywood Do I Need?",
    inputs: [num("length", "Area Length", 20, 1000, 0.5, 0, "ft"), num("width", "Area Width", 12, 1000, 0.5, 0, "ft"), num("extraArea", "Extra Area", 0, 100000, 1, 0, "sq ft"), dd("sheet", "Sheet Size", ["4 × 8 ft", "4 × 9 ft", "4 × 10 ft"]), dd("thickness", "Panel", E.PLY_THICK, 2), pct("waste", "Waste", 10, 30), usd("sheetPrice", "Price per Sheet", 45, 300, 0.5)],
    results: [["sheets", "Sheets Needed", "n"], ["area", "Area (sq ft)", "n"], ["weightLb", "Total Weight (lb)", "n"], ["cost", "Cost", "c"]],
    fn: E.plywood, ex: { length: 20, width: 12, extraArea: 0, sheet: 0, thickness: 2, waste: 10, sheetPrice: 45 },
    exText: (o) => `Example: a 20 × 12 ft subfloor takes ${o.sheets} sheets of ¾ in plywood (4 × 8) with 10% waste — about ${n2(o.weightLb)} lb.`,
    how: "Enter the area to cover. Stagger sheet joints, run the long side across the joists, and leave ⅛ in gaps between sheets for expansion.",
    assume: "Typical sheet weights (4 × 8): ½ in plywood 40 lb, ⅝ in 50, ¾ in 61, 7/16 OSB 47, 23/32 OSB 70.",
    faq: [["How many sheets of plywood for a 12x20 floor?", "About 8 sheets of 4 × 8, plus waste — 9 sheets."]],
  }),
  mk({
    slug: "sheathing-calculator", title: "Sheathing & OSB Calculator (Walls, Roof & Subfloor)",
    desc: "Calculate OSB or plywood sheathing for walls, roof decking and subfloor — sheets for each, total sheets, sheathing nails and roof H-clips.",
    inputs: [PERIM, WALLH, num("openings", "Large Openings to Subtract", 100, 10000, 1, 0, "sq ft"), num("roofArea", "Roof Area", 2000, 100000, 10, 0, "sq ft"), num("floorArea", "Subfloor Area", 0, 100000, 10, 0, "sq ft")],
    results: [["totalSheets", "Total 4 × 8 Sheets", "n"], ["wallSheets", "Wall Sheets", "n"], ["roofSheets", "Roof Sheets", "n"], ["floorSheets", "Subfloor Sheets", "n"], ["nails8d", "8d Nails", "n"], ["hClips", "Roof H-Clips", "n"]],
    fn: E.sheathing, ex: { perimeter: 160, wallHeight: 9, openings: 100, roofArea: 2000, floorArea: 0 },
    exText: (o) => `Example: 160 ft of 9 ft walls and a 2,000 sq ft roof need about ${o.wallSheets} wall sheets and ${o.roofSheets} roof sheets of 4 × 8 OSB.`,
    how: "Sheath walls through window and door openings and cut them out after — only subtract large openings like garage doors. Use H-clips between roof rafters or trusses spaced 24 in.",
    assume: "10% waste; ≈ 50 nails per wall/roof sheet (6 in edges, 12 in field), 60 per subfloor sheet; 2 H-clips per roof sheet.",
    faq: [["How many sheets of OSB for a roof?", "Roof area ÷ 32, plus about 10% — 69 sheets for 2,000 sq ft."]],
  }),
  mk({
    slug: "plywood-cut-calculator", title: "Plywood Cut List Calculator (Sheets for Your Parts)",
    desc: "Estimate how many 4×8 sheets you need for a cut list — up to five part sizes and quantities — with sheet utilization and waste, for cabinets and furniture.",
    inputs: [...PIECE(1, 23.25, 34.5, 4), ...PIECE(2, 23.25, 30, 2), ...PIECE(3, 11.25, 30, 4), ...PIECE(4, 0, 0, 0), ...PIECE(5, 0, 0, 0), num("kerf", "Saw Kerf", 0.125, 0.25, 0.0625, 0, "in")],
    results: [["sheets", "4 × 8 Sheets Needed", "n"], ["utilization", "Sheet Utilization (%)", "n"], ["pieceAreaSqFt", "Parts Area (sq ft)", "n"], ["wasteSqFt", "Waste (sq ft)", "n"], ["tooBig", "Parts Too Big for a Sheet", "n"]],
    fn: E.plywoodCut, ex: { w1: 23.25, l1: 34.5, q1: 4, w2: 23.25, l2: 30, q2: 2, w3: 11.25, l3: 30, q3: 4, w4: 0, l4: 0, q4: 0, w5: 0, l5: 0, q5: 0, kerf: 0.125 },
    exText: (o) => `Example: four cabinet sides, two bottoms and four shelves fit on about ${o.sheets} sheets of 4 × 8 plywood at ${o.utilization}% utilization.`,
    how: "List each part's width, length and quantity. The calculator packs parts in strips across the sheet (allowing rotation) — a quick estimate; a dedicated optimizer or your saw layout may squeeze a little more out.",
    assume: "48 × 96 in sheets with your kerf between parts; grain direction is ignored.",
    faq: [["How many cabinet boxes from a sheet of plywood?", "Usually one base cabinet box (sides, bottom, back rails) per 1–1.5 sheets."]],
  }),
  mk({
    slug: "siding-calculator", title: "Siding Calculator (Squares, Planks & Trim)",
    desc: "Calculate siding for a house — squares for vinyl, or planks for fiber cement (Hardie), LP SmartSide and cedar lap — plus starter strip, outside corners, J-channel and nails.",
    meta: "Siding Calculator — Squares, Planks, J-Channel & Corners",
    inputs: [dd("type", "Siding Type", E.SIDING_TYPES), PERIM, WALLH, ...GABLES, num("openings", "Windows & Doors Area", 200, 10000, 1, 0, "sq ft"), num("corners", "Outside Corners", 4, 50, 1), pct("waste", "Waste", 10, 30)],
    results: [["squares", "Siding Squares (incl. waste)", "n"], ["area", "Area (sq ft)", "n"], ["planks", "Lap Planks", "n"], ["starterFt", "Starter Strip (ft)", "n"], ["outsideCornerFt", "Outside Corners (ft)", "n"], ["jChannelFt", "J-Channel / Trim (ft)", "n"], ["nailsLb", "Siding Nails (lb)", "n"]],
    fn: E.siding, ex: { type: 1, perimeter: 160, wallHeight: 9, gables: 2, gableWidth: 30, gableRise: 7.5, openings: 200, corners: 4, waste: 10 },
    exText: (o) => `Example: a 160 ft perimeter house with 9 ft walls and two gables needs about ${o.squares} squares — ${o.planks} fiber cement planks.`,
    how: "Enter the wall perimeter and height, the gable ends and the openings. Siding is sold by the square (100 sq ft) or by the plank; exposure (how much of each plank shows) sets the plank count.",
    assume: "Plank coverage: fiber cement 8.25 in × 12 ft at 7 in exposure ≈ 7 sq ft; LP 8 in × 16 ft ≈ 9.1 sq ft; cedar lap 6 in exposure × 12 ft ≈ 6 sq ft. J-channel ≈ 0.9 ft per sq ft of openings plus gable rakes.",
    faq: [["How many squares of siding do I need?", "Wall area minus openings, divided by 100, plus 10%."]],
  }),
  mk({
    slug: "board-batten-calculator", title: "Board and Batten Calculator (Spacing & Boards)",
    desc: "Lay out a board and batten wall — number of vertical battens, even spacing and on-center distance, linear feet, 8 ft pieces and nails — for interior accent walls or siding.",
    inputs: [num("wallWidth", "Wall Width", 144, 2000, 0.25, 12, "in"), num("wallHeight", "Batten Height", 96, 400, 0.25, 12, "in"), num("battenWidth", "Batten Width", 2.5, 8, 0.25, 0.5, "in"), num("spacing", "Target Gap Between Battens", 16, 48, 0.5, 2, "in"), num("rails", "Horizontal Rails (top / middle)", 1, 6, 1, 0)],
    results: [["verticalBattens", "Vertical Battens", "n"], ["actualSpacingIn", "Actual Gap (in)", "n"], ["onCenterIn", "On-Center Spacing (in)", "n"], ["linearFeet", "Total Batten (linear ft)", "n"], ["eightFtPieces", "8 ft Pieces (incl. 10%)", "n"], ["nails", "Brad Nails", "n"]],
    fn: E.boardBatten, ex: { wallWidth: 144, wallHeight: 96, battenWidth: 2.5, spacing: 16, rails: 1 },
    exText: (o) => `Example: a 12 ft wall with 2.5 in battens and about 16 in gaps takes ${o.verticalBattens} vertical battens spaced ${o.actualSpacingIn} in apart — ${o.eightFtPieces} eight-foot pieces with a top rail.`,
    how: "Start and end with a batten at each corner and space the rest evenly. For exterior board and batten, battens cover the seams between wide boards, so match the spacing to the board width.",
    assume: "Battens = round((width − batten) ÷ (gap + batten)) + 1, then spaced evenly. Two nails per foot of batten.",
    faq: [["How far apart should board and batten be?", "Usually 12–24 in between battens for accent walls; on siding, battens sit over every board seam."]],
  }),
  mk({
    slug: "tongue-groove-calculator", title: "Tongue & Groove Paneling Calculator",
    desc: "Calculate tongue and groove boards for a wall or ceiling — linear feet, boards by length and nails — using the board's face (coverage) width.",
    inputs: [num("width", "Wall / Ceiling Width", 12, 200, 0.5, 1, "ft"), num("height", "Height (or ceiling length)", 8, 200, 0.5, 1, "ft"), num("openings", "Openings to Subtract", 0, 1000, 1, 0, "sq ft"), num("faceWidth", "Board Face (Coverage) Width", 5.25, 12, 0.125, 1, "in"), num("boardLength", "Board Length", 8, 16, 1, 2, "ft"), pct("waste", "Waste", 10, 30)],
    results: [["linearFeet", "Boards (linear ft)", "n"], ["boards", "Boards to Buy", "n"], ["area", "Area incl. Waste (sq ft)", "n"], ["nails", "Finish / Blind Nails", "n"]],
    fn: E.tongueGroove, ex: { width: 12, height: 8, openings: 0, faceWidth: 5.25, boardLength: 8, waste: 10 },
    exText: (o) => `Example: a 12 × 8 ft wall in 1×6 tongue and groove (5.25 in coverage) needs ${o.linearFeet} linear ft — ${o.boards} eight-foot boards.`,
    how: "Use the face width that shows once boards interlock (a 1×6 T&G usually covers about 5¼ in). Blind-nail through the tongue into each stud or furring strip.",
    assume: "Linear ft = area × 12 ÷ face width; one nail per board per 16 in.",
    faq: [["How much tongue and groove do I need?", "Area × 12 ÷ face width in inches gives the linear feet."]],
  }),
  mk({
    slug: "mobile-home-skirting-calculator", title: "Mobile Home Skirting Calculator (Panels, Track & Vents)",
    desc: "Calculate mobile home skirting — vinyl panels, top and bottom track, skirting square footage and the vents needed for crawl-space ventilation.",
    inputs: [num("length", "Home Length", 70, 100, 0.5, 20, "ft"), num("width", "Home Width", 14, 32, 0.5, 8, "ft"), num("height", "Average Skirting Height", 30, 72, 1, 12, "in"), num("panelWidth", "Panel Width", 16, 24, 0.5, 8, "in")],
    results: [["panels", "Skirting Panels (incl. 10%)", "n"], ["perimeterFt", "Perimeter (ft)", "n"], ["trackFt", "Top + Bottom Track (ft)", "n"], ["vents", "Vents", "n"], ["skirtingSqFt", "Skirting Area (sq ft)", "n"]],
    fn: E.mobileHomeSkirting, ex: { length: 70, width: 14, height: 30, panelWidth: 16 },
    exText: (o) => `Example: a 70 × 14 ft single-wide needs about ${o.panels} skirting panels, ${o.trackFt} ft of track and ${o.vents} vents.`,
    how: "Measure the height at several points around the home — sloped lots vary a lot — and cut panels to fit. Leave an access panel near the plumbing.",
    assume: "Ventilation ≈ 1 sq ft of net free area per 150 sq ft of floor (HUD), vents ≈ 0.35 sq ft each.",
    faq: [["How much skirting does a single-wide need?", "About 170 linear ft for a 70 × 14 ft home."]],
  }),
  mk({
    slug: "house-wrap-calculator", title: "House Wrap Calculator (Rolls, Tape & Cap Nails)",
    desc: "Calculate house wrap (Tyvek-style weather barrier) — rolls by size, seam tape and cap nails — from wall perimeter, height and gable ends.",
    inputs: [PERIM, WALLH, ...GABLES, dd("roll", "Roll Size", ["9 × 150 ft", "9 × 100 ft", "10 × 150 ft"])],
    results: [["rolls", "Rolls", "n"], ["area", "Area incl. Laps (sq ft)", "n"], ["seamTapeFt", "Seam Tape (ft)", "n"], ["capNails", "Cap Nails / Staples", "n"]],
    fn: E.houseWrap, ex: { perimeter: 160, wallHeight: 9, gables: 2, gableWidth: 30, gableRise: 7.5, roll: 0 },
    exText: (o) => `Example: a 160 ft perimeter house with 9 ft walls and two gables needs ${o.rolls} rolls of 9 × 150 ft house wrap and about ${n2(o.capNails)} cap fasteners.`,
    how: "Wrap over window and door openings, then cut and fold the flaps in. Lap upper courses over lower ones by at least 6 in and vertical seams by 6–12 in, and tape every seam.",
    assume: "10% for laps and waste; cap fasteners about one per 2 sq ft (12–18 in apart).",
    faq: [["How much house wrap do I need?", "Wall area plus 10%, divided by the roll's square footage."]],
  }),
  mk({
    slug: "insulation-calculator", title: "Insulation Calculator (Attic & Wall R-Value, Bags & Inches)",
    desc: "Work out how much insulation to add to reach a target R-value — inches, blown-in bags, batt packages or spray foam board feet — for attics, walls and floors.",
    meta: "Insulation Calculator — How Much Insulation Do I Need?",
    inputs: [num("area", "Area to Insulate", 1000, 100000, 10, 0, "sq ft"), num("currentR", "Current R-Value", 11, 60, 1, 0), num("targetR", "Target R-Value", 49, 70, 1, 1), dd("type", "Insulation Type", E.INS_TYPES, 1)],
    results: [["addRValue", "R-Value to Add", "n"], ["inchesToAdd", "Inches to Add", "n"], ["bags", "Blown-In Bags", "n"], ["battPackages", "Batt Packages (40 sq ft)", "n"], ["boardFeetFoam", "Spray Foam (board feet)", "n"]],
    fn: E.insulation, ex: { area: 1000, currentR: 11, targetR: 49, type: 1 },
    exText: (o) => `Example: taking a 1,000 sq ft attic from R-11 to R-49 with blown fiberglass means adding R-${o.addRValue} — about ${o.inchesToAdd} in, roughly ${o.bags} bags.`,
    how: "Find your current R-value (about R-3 per inch of old fiberglass) and the target for your climate — the 2021 IECC calls for R-49 to R-60 in attics in most of the US. Air-seal the attic floor before you insulate.",
    assume: "R per inch: batts 3.2, blown fiberglass 2.5, cellulose 3.6, open-cell foam 3.7, closed-cell 6.5. Bag counts are approximate — always use the coverage chart printed on the bag.",
    faq: [["How much insulation should I have in my attic?", "R-38 to R-60 in most US climates (about 12–20 in of blown insulation)."]],
  }),
  mk({
    slug: "batt-insulation-calculator", title: "Batt Insulation Calculator (Walls, Rolls & R-Value)",
    desc: "Calculate fiberglass or mineral wool batts for walls — net wall area, batts and packages for 16 or 24 in stud spacing — and the R-value that fits 2×4 or 2×6 walls.",
    inputs: [PERIM, num("wallHeight", "Wall Height", 8, 20, 0.5, 6, "ft"), num("openings", "Windows & Doors", 150, 10000, 1, 0, "sq ft"), dd("spacing", "Stud Spacing", ["16 in (15 in batts)", "24 in (23 in batts)"]), dd("wall", "Wall", ["2×4", "2×6"]), dd("density", "Batt Density", ["Standard", "High-density"]), num("packageSqFt", "Package Coverage", 40, 200, 1, 10, "sq ft")],
    results: [["batts", "Batts (93 in)", "n"], ["packages", "Packages", "n"], ["area", "Cavity Area (sq ft)", "n"], ["rValue", "R-Value", "n"]],
    fn: E.battInsulation, ex: { perimeter: 160, wallHeight: 8, openings: 150, spacing: 0, wall: 0, density: 0, packageSqFt: 40 },
    exText: (o) => `Example: 160 ft of 8 ft 2×4 walls with 150 sq ft of openings need about ${o.batts} R-${o.rValue} batts — ${o.packages} packages.`,
    how: "Cut batts to fit snugly around boxes and pipes — gaps and compression cut R-value. Use faced batts or a separate vapor retarder where your climate zone requires it.",
    assume: "Studs take up about 10% (16 in) or 6% (24 in) of the wall; batts 15 or 23 in × 93 in; 5% waste. 2×4 walls: R-13 / R-15; 2×6: R-19 / R-21.",
    faq: [["What R-value fits in a 2x4 wall?", "R-13 or high-density R-15."]],
  }),
  mk({
    slug: "insulation-savings-calculator", title: "Insulation Energy Savings Calculator (Payback)",
    desc: "Estimate how much adding insulation saves on heating and cooling each year — from area, old and new R-values, degree days, fuel and price — and the payback time.",
    inputs: [num("area", "Area Insulated", 1000, 100000, 10, 0, "sq ft"), num("currentR", "Current R-Value", 11, 60, 1, 0.5), num("newR", "New R-Value", 49, 80, 1, 1), num("hdd", "Heating Degree Days", 5000, 12000, 100, 0), dd("fuel", "Heating Fuel", E.FUELS), num("fuelPrice", "Fuel Price (per unit above)", 1.4, 10, 0.01, 0), pct("efficiency", "Furnace / Boiler Efficiency", 90, 100, 1), num("cdd", "Cooling Degree Days", 1000, 5000, 50, 0), num("seer", "AC SEER", 14, 30, 0.5, 8), num("kwhPrice", "Electricity Price ($/kWh)", 0.17, 1, 0.01, 0), usd("installCost", "Insulation Cost", 2000, 100000, 50)],
    results: [["yearlySavings", "Yearly Savings", "c"], ["heatingSavings", "Heating Savings", "c"], ["coolingSavings", "Cooling Savings", "c"], ["paybackYears", "Payback (years)", "n"]],
    fn: E.insulationSavings, ex: { area: 1000, currentR: 11, newR: 49, hdd: 5000, fuel: 0, fuelPrice: 1.4, efficiency: 90, cdd: 1000, seer: 14, kwhPrice: 0.17, installCost: 2000 },
    exText: (o) => `Example: going from R-11 to R-49 over a 1,000 sq ft attic in a 5,000 degree-day climate with gas heat saves about ${money(o.yearlySavings)} a year — a ${o.paybackYears}-year payback on $2,000.`,
    how: "Look up heating and cooling degree days for your city (base 65 °F). Savings shrink with each extra R — going from R-0 to R-11 saves far more than R-38 to R-49.",
    assume: "Heat flow = area × (1/R₁ − 1/R₂) × degree days × 24. Ignores air leakage (often a bigger win — air-seal first) and attic temperature effects.",
    faq: [["Is adding attic insulation worth it?", "Usually, if you have less than about R-30 — payback is often 2–6 years."]],
  }),
  mk({
    slug: "wood-movement-calculator", title: "Wood Movement Calculator (Shrinkage, Swelling & EMC)",
    desc: "Estimate how much a board will shrink and swell across its width between dry and humid seasons — by species and flatsawn or quartersawn grain — using equilibrium moisture content.",
    inputs: [num("width", "Board Width", 10, 48, 0.25, 0.5, "in"), dd("species", "Species", E.WOODS), dd("grain", "Grain", ["Flatsawn (tangential)", "Quartersawn (radial)"]), pct("rh1", "Driest Indoor Humidity", 30, 100, 1), pct("rh2", "Most Humid Indoor Humidity", 70, 100, 1), num("temp", "Indoor Temperature", 70, 100, 1, 32, "°F")],
    results: [["movementIn", "Seasonal Movement (in)", "n"], ["movementMm", "Movement (mm)", "n"], ["emcLow", "Dry-Season EMC (%)", "n"], ["emcHigh", "Humid-Season EMC (%)", "n"], ["coefficient", "Dimensional Change Coefficient", "n"]],
    fn: E.woodMovement, ex: { width: 10, species: 0, grain: 0, rh1: 30, rh2: 70, temp: 70 },
    exText: (o) => `Example: a 10 in flatsawn red oak tabletop moving between 30% and 70% humidity changes width by about ${o.movementIn} in (EMC ${o.emcLow}% to ${o.emcHigh}%).`,
    how: "Allow for movement with buttons or figure-8 fasteners on tabletops, floating panels in frames and elongated screw holes. Quartersawn wood moves about half as much across the width.",
    assume: "EMC from the Simpson (1973) equation in the USDA Wood Handbook; ΔW = width × coefficient × ΔEMC. Real movement is smaller when finishes slow moisture exchange.",
    faq: [["How much does wood move seasonally?", "About 1/8–1/4 in across a 12 in flatsawn board in many homes."]],
  }),
  mk({
    slug: "compound-miter-calculator", title: "Compound Miter Calculator (Crown Molding Angles)",
    desc: "Find the miter and bevel angles for cutting crown molding flat on a compound miter saw — for any spring angle (38°, 45°, 52°) and any wall corner angle.",
    inputs: [num("spring", "Crown Spring Angle", 38, 60, 1, 30, "°"), num("corner", "Wall Corner Angle", 90, 179, 0.5, 60, "°")],
    results: [["miterDeg", "Miter Angle (°)", "n"], ["bevelDeg", "Bevel Angle (°)", "n"], ["nestedMiterDeg", "Miter if Cutting Nested (°)", "n"]],
    fn: E.compoundMiter, ex: { spring: 38, corner: 90 },
    exText: (o) => `Example: 38° spring-angle crown on a 90° corner cuts flat at a ${o.miterDeg}° miter and ${o.bevelDeg}° bevel.`,
    how: "Measure the actual wall corner with an angle finder (walls are rarely exactly 90°) and find the spring angle on the molding's packaging. If you cut crown upside-down and nested against the fence, use the nested miter (half the turn) with no bevel.",
    assume: "Flat cut: miter = atan(sin S ÷ tan(corner ÷ 2)), bevel = asin(cos S × cos(corner ÷ 2)).",
    faq: [["What are the compound miter angles for 38 degree crown?", "31.6° miter and 33.9° bevel for a 90° corner."]],
  }),
  mk({
    slug: "kerf-bending-calculator", title: "Kerf Bending Calculator (Kerf Spacing & Count)",
    desc: "Work out kerf spacing and how many saw kerfs it takes to bend wood or plywood to a radius — from thickness, the wood left uncut, kerf width and bend angle.",
    inputs: [num("thickness", "Board Thickness", 0.75, 2, 0.0625, 0.25, "in"), num("remaining", "Wood Left Uncut", 0.125, 0.5, 0.0625, 0.0625, "in"), num("kerfWidth", "Saw Kerf Width", 0.125, 0.25, 0.0625, 0.0625, "in"), num("radius", "Inside Bend Radius", 12, 200, 0.25, 1, "in"), num("bendAngle", "Bend Angle", 90, 360, 1, 1, "°")],
    results: [["kerfSpacingIn", "Kerf Spacing (in)", "n"], ["kerfs", "Number of Kerfs", "n"], ["kerfDepthIn", "Kerf Depth (in)", "n"], ["arcLengthIn", "Bent Length (in)", "n"]],
    fn: E.kerfBending, ex: { thickness: 0.75, remaining: 0.125, kerfWidth: 0.125, radius: 12, bendAngle: 90 },
    exText: (o) => `Example: bending ¾ in stock to a 12 in radius through 90° takes ${o.kerfs} kerfs ${o.kerfDepthIn} in deep, spaced ${o.kerfSpacingIn} in apart.`,
    how: "Test on a scrap: cut one kerf, clamp one side and lift the other end until the kerf closes — the lift at the radius distance confirms the spacing. Kerfs go on the inside of the bend.",
    assume: "Each closed kerf turns the board by kerf width ÷ kerf depth (radians); spacing = radius × that angle.",
    faq: [["How far apart should kerf cuts be?", "It depends on the radius — tighter bends need closer kerfs; test on a scrap first."]],
  }),
  mk({
    slug: "geodesic-dome-calculator", title: "Geodesic Dome Calculator (Strut Lengths & Hubs)",
    desc: "Calculate a 2V or 3V geodesic dome — strut lengths and counts for each strut type, number of hubs, floor area and height — from the dome radius.",
    inputs: [num("radius", "Dome Radius", 10, 100, 0.5, 2, "ft"), dd("frequency", "Dome Type", E.DOME_FREQ)],
    results: [["strutA", "Strut A Length (ft)", "n"], ["countA", "Strut A Count", "n"], ["strutB", "Strut B Length (ft)", "n"], ["countB", "Strut B Count", "n"], ["strutC", "Strut C Length (ft)", "n"], ["countC", "Strut C Count", "n"], ["hubs", "Hubs", "n"], ["floorArea", "Floor Area (sq ft)", "n"], ["heightFt", "Height (ft)", "n"]],
    fn: E.geodesicDome, ex: { radius: 10, frequency: 0 },
    exText: (o) => `Example: a 2V dome with a 10 ft radius uses ${o.countA} struts of ${o.strutA} ft and ${o.countB} of ${o.strutB} ft on ${o.hubs} hubs, covering ${o.floorArea} sq ft.`,
    how: "Strut lengths are hub-center to hub-center; subtract the hub connector size for the actual cut length. 3V domes are rounder and more stable for larger sizes.",
    assume: "Chord factors: 2V A 0.54653, B 0.61803; 3V (5/8 sphere) A 0.34862, B 0.40355, C 0.41241.",
    faq: [["How many struts in a 2V dome?", "65 struts (30 A and 35 B) and 26 hubs for a hemisphere."]],
  }),
  mk({
    slug: "shelf-bracket-spacing-calculator", title: "Shelf Bracket Spacing Calculator (Sag & Load)",
    desc: "Find how many shelf brackets you need and how far apart — by shelf material, load and bracket rating — plus load per bracket and a stud-friendly spacing.",
    inputs: [num("length", "Shelf Length", 72, 240, 1, 12, "in"), dd("material", "Shelf Material", E.SHELF_MATS), dd("load", "What It Holds", ["Light (decor, light items)", "Books", "Kitchen / dishes", "Garage / heavy storage"], 1), num("bracketRating", "Bracket Rating (each)", 100, 2000, 5, 10, "lb")],
    results: [["brackets", "Brackets Needed", "n"], ["spacingIn", "Even Spacing (in)", "n"], ["maxSpacingIn", "Maximum Recommended Spacing (in)", "n"], ["loadPerBracketLb", "Load per Bracket (lb)", "n"], ["studAlignedIn", "Stud-Aligned Spacing (in)", "n"]],
    fn: E.shelfBracketSpacing, ex: { length: 72, material: 0, load: 1, bracketRating: 100 },
    exText: (o) => `Example: a 6 ft plywood bookshelf needs ${o.brackets} brackets about ${o.spacingIn} in apart (max ${o.maxSpacingIn} in).`,
    how: "Screw brackets into studs (16 in apart in most US walls) — drywall anchors only for light loads. Long shelves sag over time, so stay under the maximum spacing.",
    assume: "Rule-of-thumb spans that keep long-term sag small (≈ 0.02 in per ft); load ≈ 15–40 lb per ft of shelf.",
    faq: [["How far apart should shelf brackets be?", "About 16–32 in, depending on shelf material and load."]],
  }),
  mk({
    slug: "workbench-height-calculator", title: "Workbench Height Calculator",
    desc: "Find the right workbench height for your height — general work, heavy work like hand planing, and precision or assembly work.",
    inputs: [num("height", "Your Height", 70, 90, 0.5, 50, "in")],
    results: [["generalIn", "General Workbench (in)", "n"], ["heavyWorkIn", "Heavy Work / Planing (in)", "n"], ["precisionIn", "Precision / Assembly (in)", "n"], ["wristIn", "Your Approx. Wrist Height (in)", "n"]],
    fn: E.workbenchHeight, ex: { height: 70 },
    exText: (o) => `Example: for someone 5 ft 10 in tall, a general bench of about ${o.generalIn} in, a planing bench of ${o.heavyWorkIn} in and a precision bench of ${o.precisionIn} in work well.`,
    how: "Stand relaxed with arms at your sides: a bench top near your wrist crease suits most woodworking. Go lower for heavy hand-tool work and higher (near elbow height) for detailed work.",
    assume: "Typical standing wrist height ≈ 0.485 × height and elbow height ≈ 0.63 × height; adjust to your own measurements and shoes.",
    faq: [["How tall should a workbench be?", "Usually 34–38 in for an average adult."]],
  }),
  mk({
    slug: "drawer-size-calculator", title: "Drawer Size Calculator (Box Size for Drawer Slides)",
    desc: "Work out drawer box width, height and depth from the cabinet opening and slide type — side-mount, undermount or center-mount — plus the drawer front size for overlay.",
    inputs: [num("openingWidth", "Opening Width", 18, 48, 0.0625, 6, "in"), num("openingHeight", "Opening Height", 6, 24, 0.0625, 2, "in"), num("depth", "Cabinet Inside Depth", 22, 30, 0.25, 8, "in"), dd("slide", "Slide Type", E.SLIDES), num("overlay", "Front Overlay (each side)", 0.5, 1.5, 0.0625, 0, "in")],
    results: [["boxWidthIn", "Drawer Box Width (in)", "n"], ["boxHeightIn", "Drawer Box Height (in)", "n"], ["slideLengthIn", "Slide Length (in)", "n"], ["boxDepthIn", "Drawer Box Depth (in)", "n"], ["frontWidthIn", "Drawer Front Width (in)", "n"], ["frontHeightIn", "Drawer Front Height (in)", "n"]],
    fn: E.drawerSize, ex: { openingWidth: 18, openingHeight: 6, depth: 22, slide: 0, overlay: 0.5 },
    exText: (o) => `Example: an 18 × 6 in opening with side-mount slides takes a ${o.boxWidthIn} × ${o.boxHeightIn} in box on ${o.slideLengthIn} in slides.`,
    how: "Measure the opening inside the face frame or between cabinet sides. Clearances vary by slide brand — undermount slides (Blum, Salice) have exact rules for width and bottom recess, so check the maker's sheet before cutting.",
    assume: "Typical clearances: side-mount −1 in width, −1 in height; undermount −⅝ in width, −⅞ in height; center-mount −¼ in width. Slide = longest standard length ≤ depth − 1 in.",
    faq: [["How much smaller should a drawer be than the opening?", "1 in narrower for standard side-mount slides (½ in each side)."]],
  }),
  mk({
    slug: "window-rough-opening-calculator", title: "Window Rough Opening Calculator (RO, Header & Replacement Size)",
    desc: "Find a window's rough opening from its unit size — or the replacement window size from the existing opening — with header length, header size and jack studs.",
    inputs: [dd("mode", "Mode", ["New construction: unit size → rough opening", "Replacement: measured opening → window size"]), num("width", "Width (unit, or smallest measured)", 36, 200, 0.125, 6, "in"), num("height", "Height (unit, or smallest measured)", 60, 200, 0.125, 6, "in")],
    results: [["resultWidthIn", "Rough Opening / Window Width (in)", "n"], ["resultHeightIn", "Rough Opening / Window Height (in)", "n"], ["headerLengthIn", "Header Length (in)", "n"], ["headerSize", "Typical Header", "l", E.HEADERS], ["jackStudsEachSide", "Jack Studs Each Side", "n"]],
    fn: E.windowRoughOpening, ex: { mode: 0, width: 36, height: 60 },
    exText: (o) => `Example: a 36 × 60 in window unit needs a ${o.resultWidthIn} × ${o.resultHeightIn} in rough opening and a ${o.headerLengthIn} in header.`,
    how: "New windows: use the manufacturer's listed rough opening if given; otherwise add about ½ in to the unit width and height. Replacement inserts: measure the opening width at the top, middle and bottom and height at left, center and right, take the smallest and subtract ¼ in.",
    assume: "Header length = RO width + two jack studs (3 in). Header sizes are typical for a one-story bearing wall — IRC Table R602.7(1) and loads above decide the real size.",
    faq: [["How big is the rough opening for a 36x60 window?", "About 36½ × 60½ in, unless the maker specifies otherwise."]],
  }),
  mk({
    slug: "bay-window-angle-calculator", title: "Bay Window Angle Calculator",
    desc: "Calculate a bay window's side angle, the miter for the seat, sill and trim, the interior angle and the side window length — from the opening width, center width and projection.",
    inputs: [num("openingWidth", "Overall Opening Width", 8, 30, 0.25, 3, "ft"), num("centerWidth", "Center Window Width", 4, 20, 0.25, 1, "ft"), num("projection", "Projection From the Wall", 1.5, 6, 0.125, 0.25, "ft")],
    results: [["sideAngleDeg", "Side Angle From the Wall (°)", "n"], ["miterDeg", "Miter for Seat & Trim (°)", "n"], ["interiorAngleDeg", "Interior Angle (°)", "n"], ["sideLengthFt", "Side Window Length (ft)", "n"]],
    fn: E.bayWindowAngle, ex: { openingWidth: 8, centerWidth: 4, projection: 1.5 },
    exText: (o) => `Example: an 8 ft bay with a 4 ft center window projecting 1.5 ft has sides at ${o.sideAngleDeg}° — cut the seat and trim at ${o.miterDeg}°.`,
    how: "Standard bays use 30° or 45° sides; bows use many small angles. The miter at each joint is half the change in direction.",
    assume: "Side angle = atan(projection ÷ half the difference between the opening and center width).",
    faq: [["What angle is a standard bay window?", "Usually 30° or 45°."]],
  }),
  mk({
    slug: "stc-rating-calculator", title: "STC Rating Calculator (Wall Soundproofing)",
    desc: "Estimate the Sound Transmission Class (STC) of a wall — from the wall assembly plus extra drywall layers, damping compound and 5/8 in drywall — and what you'll hear through it.",
    inputs: [dd("assembly", "Wall Assembly", E.WALL_ASSEMBLIES, 1), num("extraLayers", "Extra Drywall Layers", 0, 4, 1, 0), dd("damping", "Damping Compound Between Layers (e.g. Green Glue)", ["No", "Yes"]), dd("fiveEighths", "5/8 in Drywall Instead of 1/2 in", ["No", "Yes"])],
    results: [["stc", "Estimated STC", "n"], ["rating", "What You'd Hear", "l", E.STC_LABELS]],
    fn: E.stcRating, ex: { assembly: 1, extraLayers: 0, damping: 0, fiveEighths: 0 },
    exText: (o) => `Example: an insulated 2×4 wall with ½ in drywall rates about STC ${o.stc} — ${E.STC_LABELS[o.rating].split(" — ")[0].toLowerCase()}.`,
    how: "Mass, decoupling (resilient channel, staggered or double studs), damping and absorption all add STC. Gaps, outlets and doors leak sound — seal them or the wall underperforms. Building codes require STC 50 between apartments.",
    assume: "Base values from typical tested assemblies; added layers ≈ +3 each, damping compound ≈ +6, 5/8 in board ≈ +1. A rough estimate — field results are often 5 points lower.",
    faq: [["What STC rating is good for a bedroom wall?", "STC 45–50 or higher."]],
  }),
  mk({
    slug: "shed-material-calculator", title: "Shed Material Calculator (Lumber List)",
    desc: "Get a shed materials list — floor joists and subfloor, wall studs, plates, siding sheets, rafters, roof sheathing and shingles — for a gable or lean-to shed.",
    inputs: [num("width", "Shed Width", 8, 20, 0.5, 4, "ft"), num("length", "Shed Length", 10, 40, 0.5, 4, "ft"), num("wallHeight", "Wall Height", 8, 12, 0.5, 6, "ft"), dd("roof", "Roof", ["Gable", "Lean-to (single slope)"]), num("pitch", "Roof Pitch (rise per 12)", 4, 12, 0.5, 1, "in")],
    results: [["floorJoists", "Floor Joists (2×6)", "n"], ["floorSheets", "Floor Sheets (¾ in)", "n"], ["studs", "Wall Studs", "n"], ["platesFt", "Wall Plates (linear ft)", "n"], ["wallSheets", "Siding / Sheathing Sheets", "n"], ["rafters", "Rafters", "n"], ["rafterLengthFt", "Rafter Length (ft)", "n"], ["roofSheets", "Roof Sheathing Sheets", "n"], ["shingleBundles", "Shingle Bundles", "n"]],
    fn: E.shedMaterial, ex: { width: 8, length: 10, wallHeight: 8, roof: 0, pitch: 4 },
    exText: (o) => `Example: an 8 × 10 ft gable shed needs about ${o.studs} studs, ${o.wallSheets} siding sheets, ${o.rafters} rafters and ${o.shingleBundles} bundles of shingles.`,
    how: "Enter the shed size and roof style. Add framing for doors and windows, a ridge board, trim and hardware. Check local rules — many towns require permits for sheds over 120–200 sq ft.",
    assume: "Floor joists 16 in apart; studs 16 in apart plus 12 for corners and openings; triple plates; rafters 24 in apart with a 1 ft overhang; 10% waste on sheets.",
    faq: [["How much lumber for an 8x10 shed?", "Roughly 40–50 studs, 6–8 rafter pairs, 3 floor sheets and 10 siding sheets."]],
  }),
  mk({
    slug: "pole-barn-calculator", title: "Pole Barn Material Calculator (Posts, Trusses, Girts & Steel)",
    desc: "Estimate pole barn materials — posts, trusses, wall girts, roof purlins, roof and wall steel square footage and post concrete — from the building size.",
    inputs: [num("width", "Width", 30, 100, 1, 12, "ft"), num("length", "Length", 40, 300, 1, 12, "ft"), num("eaveHeight", "Eave Height", 12, 24, 0.5, 8, "ft"), num("postSpacing", "Post Spacing", 8, 12, 1, 4, "ft"), num("trussSpacing", "Truss Spacing", 8, 12, 1, 2, "ft"), num("girtSpacing", "Girt Spacing", 24, 36, 1, 12, "in"), num("purlinSpacing", "Purlin Spacing", 24, 48, 1, 12, "in"), num("pitch", "Roof Pitch", 4, 12, 0.5, 1, "in")],
    results: [["posts", "Posts", "n"], ["trusses", "Trusses", "n"], ["girtFt", "Wall Girts (linear ft)", "n"], ["purlinFt", "Roof Purlins (linear ft)", "n"], ["roofSqFt", "Roof Steel (sq ft)", "n"], ["wallSqFt", "Wall Steel (sq ft)", "n"], ["concreteBags", "80 lb Concrete Bags", "n"]],
    fn: E.poleBarn, ex: { width: 30, length: 40, eaveHeight: 12, postSpacing: 8, trussSpacing: 8, girtSpacing: 24, purlinSpacing: 24, pitch: 4 },
    exText: (o) => `Example: a 30 × 40 ft pole barn with 12 ft eaves needs about ${o.posts} posts, ${o.trusses} trusses, ${n2(o.girtFt)} ft of girts and ${n2(o.roofSqFt)} sq ft of roof steel.`,
    how: "Enter the building size and spacings. Doors, windows, trim, fasteners and any interior framing are extra. Post-frame buildings need engineered trusses and post embedment for wind and snow loads.",
    assume: "Posts on both long walls plus end-wall posts; one truss per truss spacing; four bags of concrete per post; 1 ft roof overhangs.",
    faq: [["How many posts does a 30x40 pole barn need?", "About 16–20 posts with 8 ft spacing."]],
  }),
  mk({
    slug: "plaster-calculator", title: "Plaster Calculator (Bags & Plastering Cost)",
    desc: "Work out how many 25 kg bags of plaster you need — multi-finish skim, bonding, hardwall or one-coat — from the wall area and thickness, with material and labour cost.",
    inputs: [num("area", "Wall / Ceiling Area", 30, 10000, 0.5, 0, "m²"), dd("type", "Plaster", E.PLASTERS), num("thickness", "Thickness (0 = standard)", 0, 25, 0.5, 0, "mm"), num("bagPrice", "Price per 25 kg Bag", 12, 100, 0.5, 0), num("labourPerM2", "Labour Price per m² (0 to skip)", 0, 100, 0.5, 0)],
    results: [["bags", "25 kg Bags (incl. 10%)", "n"], ["coveragePerBag", "Coverage per Bag (m²)", "n"], ["materialCost", "Material Cost", "n"], ["labourCost", "Labour Cost", "n"]],
    fn: E.plaster, ex: { area: 30, type: 0, thickness: 0, bagPrice: 12, labourPerM2: 0 },
    exText: (o) => `Example: skimming 30 m² with multi-finish at 2 mm takes about ${o.bags} bags of 25 kg.`,
    how: "Enter the area in square metres. Skim coats are about 2 mm; backing coats 8–11 mm. Prices are in your own currency. Measure each wall and ceiling and add them together.",
    assume: "Typical coverage per 25 kg bag at standard thickness: multi-finish ≈ 10 m² at 2 mm, bonding ≈ 2.7 m² and hardwall ≈ 3.1 m² at 11 mm, one-coat ≈ 4.5 m² at 13 mm; 10% extra. Check the product sheet.",
    faq: [["How much does a bag of skim plaster cover?", "About 9–11 m² at 2 mm."]],
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
