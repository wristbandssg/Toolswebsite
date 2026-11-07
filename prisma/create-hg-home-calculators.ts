// One-time (but safe to re-run) batch setup script: creates 28 calculators in House & Garden
// Calculators > Home Building, Remodel & Cleaning Cost Calculators (measuring, cleaning mixes, glass, ladders and scaffolding, home value and cleaning prices). Formulas live in src/lib/calc-engine-hg-home.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-home-calculators.ts
// or
//   npm run db:create-hg-home-calculators

import * as E from "../src/lib/calc-engine-hg-home";

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

const CAT = "home-building-remodel-cleaning-cost-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region — get local quotes.";
const COSTRES: Line[] = [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]];

const TOOLS: ToolDef[] = [
  mk({
    slug: "square-footage-calculator", title: "Square Footage Calculator (Sq Ft, Sq M & Cost)",
    desc: "Calculate square footage for rectangles, circles, triangles and L-shaped rooms — in square feet, square meters, square yards and acres — with an optional price per square foot.",
    meta: "Square Footage Calculator — Sq Ft for Any Room or Area",
    inputs: [dd("shape", "Shape", E.AREA_SHAPES), num("length", "Length", 12, 100000, 0.1, 0, "ft"), num("width", "Width", 10, 100000, 0.1, 0, "ft"), num("length2", "Second Rectangle Length (L-shape)", 0, 100000, 0.1, 0, "ft"), num("width2", "Second Rectangle Width (L-shape)", 0, 100000, 0.1, 0, "ft"), usd("pricePerSqFt", "Price per Sq Ft (optional)", 0, 10000, 0.01)],
    results: [["sqFt", "Square Feet", "n"], ["sqM", "Square Meters", "n"], ["sqYd", "Square Yards", "n"], ["acres", "Acres", "n"], ["cost", "Cost at Your Price", "c"]],
    fn: E.squareFootage, ex: { shape: 0, length: 12, width: 10, length2: 0, width2: 0, pricePerSqFt: 0 },
    exText: (o) => `Example: a 12 × 10 ft room is ${o.sqFt} sq ft — ${o.sqM} m² or ${o.sqYd} sq yd.`,
    how: "Measure in feet (inches ÷ 12). Split odd rooms into rectangles and add them up — the L-shape option adds a second rectangle for you. Add 5–10% extra when buying flooring or tile.",
    assume: "Circle = π × (diameter ÷ 2)²; triangle = base × height ÷ 2; 1 m² = 10.764 sq ft; 1 acre = 43,560 sq ft.",
    faq: [["How do you calculate square footage?", "Multiply length by width in feet — a 12 × 10 ft room is 120 sq ft."], ["How many square feet is a 10x10 room?", "100 sq ft."]],
  }),
  mk({
    slug: "construction-cost-by-zip-calculator", title: "Construction Cost per Square Foot by Area Calculator",
    desc: "Estimate residential construction cost per square foot for your area — pick your region's cost index and build quality to get the cost per sq ft and total cost to build a house.",
    meta: "Construction Cost per Square Foot by ZIP / Area Calculator",
    inputs: [num("sqft", "House Size", 2000, 50000, 10, 100, "sq ft"), dd("region", "Region (closest to your ZIP)", E.COST_REGIONS), num("adjust", "Local Adjustment", 0, 100, 1, -50, "%"), dd("quality", "Build Quality", E.BUILD_QUALITY, 1), usd("basePerSqFt", "US Average Cost per Sq Ft (standard)", 175, 1000, 1)],
    results: [["totalCost", "Estimated Cost to Build", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costIndex", "Cost Index (US = 100)", "n"]],
    fn: E.constructionCostByZip, ex: { sqft: 2000, region: 0, adjust: 0, quality: 1, basePerSqFt: 175 },
    exText: (o) => `Example: a 2,000 sq ft standard-quality home at US-average costs runs about ${money(o.costPerSqFt)} per sq ft — ${money(o.totalCost)} to build.`,
    how: "Pick the region closest to your ZIP code, then use the local adjustment to fine-tune from local builders' quotes (e.g. +15% for a pricey suburb). Land, permits and site work (well, septic, utilities) are extra.",
    assume: `Base ≈ $175/sq ft for a standard US home (2026); quality ×0.75 / 1 / 1.45 / 2.1; regional index ≈ 0.85–1.5 from typical construction cost indexes. ${COST_NOTE}`,
    faq: [["How much does it cost to build a house per square foot?", "About $150–200 for a standard home in 2026, and $300+ for custom or high-cost metros."]],
  }),
  mk({
    slug: "cubic-feet-calculator", title: "Cubic Feet Calculator (Cu Ft, Cu Yd, Gallons)",
    desc: "Calculate cubic feet from length, width and height in feet, inches, yards, meters or centimeters — and convert to cubic yards, cubic meters, gallons and liters.",
    inputs: [dd("unit", "Measurement Unit", E.LENGTH_UNITS), num("length", "Length", 4, 100000, 0.01, 0), num("width", "Width", 2, 100000, 0.01, 0), num("height", "Height", 3, 100000, 0.01, 0), num("quantity", "Number of Items", 1, 10000, 1, 1)],
    results: [["cubicFeet", "Cubic Feet", "n"], ["cubicYards", "Cubic Yards", "n"], ["cubicMeters", "Cubic Meters", "n"], ["gallons", "US Gallons", "n"], ["liters", "Liters", "n"]],
    fn: E.cubicFeet, ex: { unit: 0, length: 4, width: 2, height: 3, quantity: 1 },
    exText: (o) => `Example: a 4 × 2 × 3 ft box is ${o.cubicFeet} cu ft — ${o.cubicYards} cu yd or ${n2(o.gallons)} gallons.`,
    how: "Use the same unit for all three sides. For firewood, a full cord is 128 cu ft (4 × 4 × 8 ft); for a moving truck, add up the boxes and furniture.",
    assume: "1 cu yd = 27 cu ft; 1 m³ = 35.315 cu ft; 1 cu ft = 7.48 US gal = 28.32 L.",
    faq: [["How do you calculate cubic feet?", "Length × width × height, all in feet."], ["How many cubic feet in a cubic yard?", "27."]],
  }),
  mk({
    slug: "room-area-calculator", title: "Room Area Calculator (Floor, Walls & Ceiling)",
    desc: "Calculate a room's floor area, wall square footage (minus doors and windows), ceiling area, paintable area and perimeter from its length, width and height.",
    inputs: [num("length", "Room Length", 14, 1000, 0.1, 0, "ft"), num("width", "Room Width", 12, 1000, 0.1, 0, "ft"), num("height", "Ceiling Height", 8, 50, 0.1, 0, "ft"), num("doors", "Doors", 1, 50, 1, 0), num("windows", "Windows", 2, 50, 1, 0)],
    results: [["floorSqFt", "Floor Area (sq ft)", "n"], ["wallSqFt", "Wall Area (sq ft)", "n"], ["ceilingSqFt", "Ceiling Area (sq ft)", "n"], ["paintableSqFt", "Walls + Ceiling (sq ft)", "n"], ["perimeterFt", "Perimeter (ft)", "n"]],
    fn: E.roomArea, ex: { length: 14, width: 12, height: 8, doors: 1, windows: 2 },
    exText: (o) => `Example: a 14 × 12 ft room with 8 ft ceilings has ${o.floorSqFt} sq ft of floor and ${o.wallSqFt} sq ft of wall after one door and two windows.`,
    how: "The wall area is what you need for paint, wallpaper or drywall; the perimeter gives baseboard and crown molding length (subtract door widths for baseboard).",
    assume: "Wall area = perimeter × height − 21 sq ft per door − 15 sq ft per window.",
    faq: [["How do I calculate wall square footage?", "Add the wall lengths, multiply by the height and subtract doors and windows."]],
  }),
  mk({
    slug: "linear-feet-to-square-feet-calculator", title: "Linear Feet to Square Feet Calculator (LF to SF)",
    desc: "Convert linear feet to square feet using the board or material width — and square feet back to linear feet — for flooring, decking, siding, trim and fabric.",
    inputs: [num("linearFeet", "Linear Feet", 100, 1000000, 0.1, 0, "ft"), num("width", "Material Width", 6, 1200, 0.01, 0, "in"), num("sqFtToConvert", "Square Feet to Convert to LF", 50, 1000000, 0.1, 0, "sq ft")],
    results: [["sqFt", "Square Feet", "n"], ["linearFeetFromSqFt", "Linear Feet for Your Sq Ft", "n"], ["sqM", "Square Meters", "n"]],
    fn: E.linearFeetToSquareFeet, ex: { linearFeet: 100, width: 6, sqFtToConvert: 50 },
    exText: (o) => `Example: 100 linear ft of 6 in wide boards covers ${o.sqFt} sq ft; 50 sq ft takes ${o.linearFeetFromSqFt} linear ft.`,
    how: "Use the face (coverage) width, not the nominal size — a 1×6 is 5.5 in wide and covers less once tongue-and-groove overlaps. Add waste.",
    assume: "Square feet = linear feet × width (in) ÷ 12.",
    faq: [["How many square feet is 100 linear feet?", "It depends on the width — 50 sq ft for 6 in material, 100 sq ft for 12 in."]],
  }),
  mk({
    slug: "floor-plan-area-calculator", title: "Floor Plan Square Footage Calculator (House Plan)",
    desc: "Add up the rooms on a floor plan or house plan to get net room area and gross square footage including walls — up to six rooms at a time.",
    inputs: [num("l1", "Room 1 Length", 16, 500, 0.1, 0, "ft"), num("w1", "Room 1 Width", 14, 500, 0.1, 0, "ft"), num("l2", "Room 2 Length", 12, 500, 0.1, 0, "ft"), num("w2", "Room 2 Width", 12, 500, 0.1, 0, "ft"), num("l3", "Room 3 Length", 12, 500, 0.1, 0, "ft"), num("w3", "Room 3 Width", 10, 500, 0.1, 0, "ft"), num("l4", "Room 4 Length", 10, 500, 0.1, 0, "ft"), num("w4", "Room 4 Width", 8, 500, 0.1, 0, "ft"), num("l5", "Room 5 Length", 0, 500, 0.1, 0, "ft"), num("w5", "Room 5 Width", 0, 500, 0.1, 0, "ft"), num("l6", "Room 6 Length", 0, 500, 0.1, 0, "ft"), num("w6", "Room 6 Width", 0, 500, 0.1, 0, "ft"), pct("wallPercent", "Add for Walls & Hallways", 10, 40, 1)],
    results: [["grossSqFt", "Gross Square Footage", "n"], ["netSqFt", "Net Room Area (sq ft)", "n"], ["sqM", "Gross (m²)", "n"], ["rooms", "Rooms Counted", "n"]],
    fn: E.floorPlanArea, ex: { l1: 16, w1: 14, l2: 12, w2: 12, l3: 12, w3: 10, l4: 10, w4: 8, l5: 0, w5: 0, l6: 0, w6: 0, wallPercent: 10 },
    exText: (o) => `Example: four rooms totaling ${o.netSqFt} sq ft come to about ${n2(o.grossSqFt)} sq ft with 10% for walls and halls.`,
    how: "For a listing or appraisal, measure the outside of the house instead (ANSI Z765) — finished, heated space only, not garages or unfinished basements. Run the calculator once per floor.",
    assume: "Gross = sum of rooms × (1 + wall allowance). Interior walls and halls usually add 8–15%.",
    faq: [["Does square footage include walls?", "Gross square footage does — it is measured to the outside of exterior walls."]],
  }),
  mk({
    slug: "bleach-dilution-calculator", title: "Bleach Dilution Calculator (Disinfecting & Sanitizing)",
    desc: "Work out how much bleach to add to water for a target strength in ppm — sanitizing, disinfecting or mold cleaning — in fluid ounces, teaspoons and milliliters, with the mixing ratio.",
    inputs: [num("water", "Water", 1, 1000, 0.25, 0.01, "gal"), num("ppm", "Target Chlorine Strength", 1000, 10000, 50, 1, "ppm"), pct("strength", "Bleach Strength (sodium hypochlorite)", 6, 15, 0.25)],
    results: [["bleachFlOz", "Bleach to Add (fl oz)", "n"], ["bleachTsp", "Teaspoons", "n"], ["bleachMl", "Milliliters", "n"], ["ratioParts", "Ratio (parts water per part bleach)", "n"]],
    fn: E.bleachDilution, ex: { water: 1, ppm: 1000, strength: 6 },
    exText: (o) => `Example: for a 1,000 ppm disinfecting solution, add about ${o.bleachFlOz} fl oz (${o.bleachTsp} tsp) of 6% bleach to a gallon of water — about 1 part bleach to ${o.ratioParts} parts water.`,
    how: "Common strengths: 50–200 ppm to sanitize food-contact surfaces (rinse-free), about 1,000 ppm to disinfect hard surfaces, 5,000 ppm for heavy contamination. Use cool water, mix fresh daily and never combine bleach with ammonia or acids.",
    assume: "Bleach volume = water × ppm ÷ (strength × 10,000 − ppm). Household bleach is usually 6–8.25%; 1 fl oz = 6 tsp = 29.57 mL.",
    faq: [["How much bleach per gallon of water to disinfect?", "About ⅓ cup of 6% bleach per gallon gives roughly 1,000–1,500 ppm — or follow the label."]],
  }),
  mk({
    slug: "vinegar-dilution-calculator", title: "Vinegar Dilution Calculator",
    desc: "Calculate how much vinegar and water to mix for a target acidity — from 5% white vinegar, 6% cleaning vinegar or 20–30% concentrated vinegar.",
    inputs: [pct("strength", "Vinegar Strength (acidity)", 5, 45, 0.5), pct("target", "Target Strength", 2.5, 45, 0.25), num("volume", "Total Mix Wanted", 32, 10000, 1, 1, "fl oz")],
    results: [["vinegarOz", "Vinegar (fl oz)", "n"], ["waterOz", "Water (fl oz)", "n"], ["vinegarCups", "Vinegar (cups)", "n"], ["ratioParts", "Parts Water per Part Vinegar", "n"]],
    fn: E.vinegarDilution, ex: { strength: 5, target: 2.5, volume: 32 },
    exText: (o) => `Example: a 32 oz spray bottle at 2.5% takes ${o.vinegarOz} fl oz of 5% vinegar and ${o.waterOz} fl oz of water (1:1).`,
    how: "A 1:1 mix of 5% vinegar and water is the classic glass and counter cleaner. Don't use vinegar on natural stone, waxed wood or cast iron. Concentrated (20–30%) vinegar is a caustic weed killer — wear eye protection.",
    assume: "C1 × V1 = C2 × V2.",
    faq: [["How do I dilute 30% vinegar to 5%?", "Mix 1 part 30% vinegar with 5 parts water."]],
  }),
  mk({
    slug: "softwash-mix-calculator", title: "Softwash Mix Calculator (SH, Water & Surfactant)",
    desc: "Calculate a soft wash mix — gallons of sodium hypochlorite (SH) and water for a target strength in your tank, surfactant ounces, and the strength at the nozzle with a downstream injector.",
    inputs: [num("tank", "Tank / Batch Size", 50, 1000, 1, 1, "gal"), pct("shStrength", "SH Strength", 12.5, 15, 0.5), pct("mix", "Target Mix Strength", 1, 6, 0.25), num("surfactantPerGal", "Surfactant per Gallon", 0.5, 4, 0.1, 0, "oz"), num("injectorRatio", "Downstream Injector Ratio (water : chemical)", 10, 20, 1, 1)],
    results: [["shGallons", "SH to Add (gal)", "n"], ["waterGallons", "Water (gal)", "n"], ["surfactantOz", "Surfactant (oz)", "n"], ["downstreamStrength", "Strength at Nozzle Downstream (%)", "n"]],
    fn: E.softwashMix, ex: { tank: 50, shStrength: 12.5, mix: 1, surfactantPerGal: 0.5, injectorRatio: 10 },
    exText: (o) => `Example: a 50 gallon house-wash mix at 1% takes ${o.shGallons} gal of 12.5% SH, ${o.waterGallons} gal of water and ${o.surfactantOz} oz of surfactant.`,
    how: "Typical strengths: 0.5–1% for vinyl siding house washes, 1–2% for stucco and fences, 3–4% for asphalt shingle roofs. Wet plants before and after, and rinse anything sensitive. A downstream injector delivers far weaker mixes (about 1% from 12.5% SH).",
    assume: "SH gallons = tank × mix % ÷ SH %; downstream strength ≈ SH % ÷ (1 + injector ratio).",
    faq: [["What is the soft wash mix for a house?", "About 1% — roughly 4 gallons of 12.5% SH in a 50 gallon tank."]],
  }),
  mk({
    slug: "garbage-bag-size-calculator", title: "Trash Bag Size Calculator (Garbage Bag Fit)",
    desc: "Find the right garbage bag size for a trash can — bag width and length in inches for round or square cans — plus the can's capacity in gallons.",
    inputs: [dd("shape", "Can Shape", E.CAN_SHAPES), num("height", "Can Height", 24, 60, 0.5, 5, "in"), num("diameter", "Diameter (round) or Width (square)", 16, 40, 0.5, 4, "in"), num("depth", "Depth (square cans)", 12, 40, 0.5, 0, "in")],
    results: [["bagWidthIn", "Bag Width (in)", "n"], ["bagLengthIn", "Bag Length (in)", "n"], ["canGallons", "Can Capacity (gal)", "n"]],
    fn: E.garbageBagSize, ex: { shape: 0, height: 24, diameter: 16, depth: 12 },
    exText: (o) => `Example: a 16 in round can 24 in tall holds about ${o.canGallons} gallons and needs a bag about ${o.bagWidthIn} × ${o.bagLengthIn} in.`,
    how: "Bag width is the flat width (half the circumference); the length covers the height, the bottom and 3–4 in of overhang. Bags labeled by gallons vary by brand — compare the inch dimensions on the box.",
    assume: "Round: width = π × D ÷ 2, length = H + D ÷ 2 + 3 in. Square: width = W + D, length = H + ½ the larger side + 3 in. Gallons = cu in ÷ 231.",
    faq: [["What size bag fits a 13 gallon can?", "Usually 24 × 27–28 in."]],
  }),
  mk({
    slug: "dumpster-weight-calculator", title: "Dumpster Weight Calculator (Debris Tonnage)",
    desc: "Estimate how much your debris weighs in a roll-off dumpster — pounds and tons for household junk, renovation debris, drywall, shingles, yard waste, concrete or dirt — and the overweight fee.",
    inputs: [dd("debris", "Debris Type", E.DEBRIS, 1), num("cubicYards", "Debris Volume", 15, 40, 0.5, 0, "cu yd"), num("dumpsterYards", "Dumpster Size", 20, 40, 1, 0, "cu yd"), num("tonsIncluded", "Tons Included in Rental", 3, 10, 0.5, 0), usd("overagePerTon", "Overage per Ton", 75, 300, 1)],
    results: [["weightTons", "Debris Weight (tons)", "n"], ["weightLb", "Debris Weight (lb)", "n"], ["overageCost", "Overweight Fee", "c"], ["percentFull", "Dumpster Fullness (%)", "n"]],
    fn: E.dumpsterWeight, ex: { debris: 1, cubicYards: 15, dumpsterYards: 20, tonsIncluded: 3, overagePerTon: 75 },
    exText: (o) => `Example: 15 cu yd of mixed renovation debris weighs about ${o.weightTons} tons — ${money(o.overageCost)} over a 3-ton allowance.`,
    how: "Heavy debris (concrete, dirt, shingles) usually needs a small 10-yard dumpster even when it would fit a bigger one, because of road weight limits. Don't fill above the rim.",
    assume: "Typical loose weights per cu yd: junk 225 lb, renovation debris and drywall 500, shingles 500, yard waste 200, wood 300, broken concrete 2,400, dirt 2,200.",
    faq: [["How much does a 20 yard dumpster of debris weigh?", "About 2–5 tons for renovation debris."]],
  }),
  mk({
    slug: "door-weight-calculator", title: "Door Weight Calculator",
    desc: "Estimate a door's weight from its size, thickness and type — hollow-core, solid-core, solid wood, steel, fiberglass or fire-rated — with the number of hinges it needs.",
    inputs: [dd("type", "Door Type", E.DOOR_TYPES, 1), num("width", "Width", 36, 72, 0.5, 12, "in"), num("height", "Height", 80, 120, 0.5, 48, "in"), num("thickness", "Thickness", 1.75, 3, 0.125, 1, "in")],
    results: [["weightLb", "Door Weight (lb)", "n"], ["weightKg", "Weight (kg)", "n"], ["hinges", "Hinges Recommended", "n"], ["lbPerHinge", "Weight per Hinge (lb)", "n"]],
    fn: E.doorWeight, ex: { type: 1, width: 36, height: 80, thickness: 1.75 },
    exText: (o) => `Example: a 36 × 80 in solid-core door 1¾ in thick weighs about ${o.weightLb} lb and hangs on ${o.hinges} hinges.`,
    how: "Interior doors are usually 1⅜ in thick and exterior doors 1¾ in. Add glass inserts with the glass weight calculator. Heavy doors (over about 100 lb) need heavy-duty or ball-bearing hinges.",
    assume: "Effective densities (lb/cu ft): hollow-core 9, solid-core 22, pine 28, hardwood 44, steel insulated 24, fiberglass 21, fire-rated 32. Hinges: 2 up to 60 in tall, 3 up to 90 in, 4 above.",
    faq: [["How much does a solid core door weigh?", "About 55–70 lb for a 36 × 80 in door."], ["How heavy is a hollow core door?", "About 15–25 lb."]],
  }),
  mk({
    slug: "glass-weight-calculator", title: "Glass Weight Calculator (Tempered Glass & Mirrors)",
    desc: "Calculate the weight of glass or a mirror — tempered, annealed or laminated — from its size and thickness, in pounds, kilograms and pounds per square foot.",
    inputs: [num("length", "Length", 48, 300, 0.25, 1, "in"), num("width", "Width", 36, 300, 0.25, 1, "in"), num("thicknessMm", "Thickness (1/4 in ≈ 6 mm)", 6, 50, 0.5, 2, "mm"), num("panes", "Number of Pieces", 1, 100, 1, 1)],
    results: [["weightLb", "Glass Weight (lb)", "n"], ["weightKg", "Weight (kg)", "n"], ["lbPerSqFt", "Weight per Sq Ft (lb)", "n"], ["areaSqFt", "Area per Piece (sq ft)", "n"]],
    fn: E.glassWeight, ex: { length: 48, width: 36, thicknessMm: 6, panes: 1 },
    exText: (o) => `Example: a 48 × 36 in piece of 1/4 in (6 mm) glass weighs about ${o.weightLb} lb — ${o.lbPerSqFt} lb per sq ft.`,
    how: "Tempering doesn't change the weight. For laminated or insulated (double-pane) glass, add up the thickness of each glass layer. Mirrors weigh the same as glass of the same thickness.",
    assume: "Glass density ≈ 2.5 g/cm³ (156 lb/cu ft) → 0.512 lb per sq ft per mm.",
    faq: [["How much does 1/4 inch glass weigh per square foot?", "About 3.1–3.3 lb."]],
  }),
  mk({
    slug: "glass-thickness-calculator", title: "Window Glass Thickness Calculator",
    desc: "Estimate the glass thickness a window pane needs for its size and wind pressure — annealed, heat-strengthened or tempered — with the nearest standard thickness and pane weight.",
    inputs: [num("width", "Pane Width", 36, 200, 0.5, 4, "in"), num("height", "Pane Height", 48, 200, 0.5, 4, "in"), num("pressure", "Design Wind Pressure", 30, 150, 1, 5, "psf"), dd("type", "Glass Type", E.GLASS_TYPES)],
    results: [["standard", "Recommended Standard Thickness", "l", E.GLASS_STD], ["requiredMm", "Calculated Thickness (mm)", "n"], ["requiredIn", "Calculated Thickness (in)", "n"], ["paneWeightLb", "Pane Weight (lb)", "n"]],
    fn: E.glassThickness, ex: { width: 36, height: 48, pressure: 30, type: 0 },
    exText: (o) => `Example: a 36 × 48 in annealed pane at 30 psf needs about ${o.requiredMm} mm — use ${E.GLASS_STD[o.standard]}.`,
    how: "Typical design pressures are 20–40 psf inland and 50+ psf in hurricane zones. Doors, glass near floors and glass in showers must be safety glass (tempered or laminated) by code regardless of thickness.",
    assume: "Plate formula σ = β·q·b² ÷ t² with allowable stress 2,800 psi annealed (×2 heat-strengthened, ×4 tempered). A rough estimate — final glass for buildings is sized to ASTM E1300 by the supplier.",
    faq: [["How thick should window glass be?", "Most home windows use 3–5 mm per pane; large or high-wind windows need 6 mm or more."]],
  }),
  mk({
    slug: "glass-shelf-calculator", title: "Glass Shelf Thickness & Load Calculator",
    desc: "Calculate how much weight a glass shelf can hold — or how thick it must be for your load — from the span, depth, glass thickness and whether it's tempered, with sag and shelf weight.",
    inputs: [num("span", "Span Between Supports", 30, 96, 0.5, 6, "in"), num("depth", "Shelf Depth", 10, 30, 0.5, 3, "in"), num("thicknessMm", "Glass Thickness (3/8 in ≈ 10 mm)", 10, 25, 0.5, 4, "mm"), dd("type", "Glass", ["Annealed", "Tempered"]), num("targetLoad", "Load You Want to Hold", 30, 500, 1, 0, "lb")],
    results: [["maxLoadLb", "Max Even Load (lb)", "n"], ["requiredThicknessMm", "Thickness Needed for Your Load (mm)", "n"], ["deflectionIn", "Sag at Your Load (in)", "n"], ["shelfWeightLb", "Shelf Weight (lb)", "n"]],
    fn: E.glassShelf, ex: { span: 30, depth: 10, thicknessMm: 10, type: 0, targetLoad: 30 },
    exText: (o) => `Example: a 30 in span, 10 in deep shelf of 10 mm annealed glass holds about ${o.maxLoadLb} lb spread evenly; 30 lb of books needs ${o.requiredThicknessMm} mm.`,
    how: "Loads are for weight spread evenly with the shelf supported at both ends. Tempered glass is about four times stronger but shatters completely if the edge is chipped. Keep sag under about span ÷ 175 so the shelf looks flat.",
    assume: "σ = 0.75 × W × L ÷ (b × t²); sustained allowable stress 1,000 psi annealed, 4,000 psi tempered; E = 10.4 × 10⁶ psi. An estimate — follow the bracket maker's rating.",
    faq: [["How much weight can a glass shelf hold?", "A 30 in long, 10 in deep, 10 mm annealed shelf holds roughly 60–70 lb spread evenly — much less for heavy items in the middle."]],
  }),
  mk({
    slug: "ladder-height-calculator", title: "Ladder Height & Angle Calculator",
    desc: "Find what size ladder you need — extension ladder length for a roof or gutter height using the 4-to-1 rule, how far to set the base, and the stepladder size for a ceiling.",
    inputs: [num("supportHeight", "Height Where Ladder Rests (gutter / roof edge)", 10, 60, 0.5, 2, "ft"), num("extendAbove", "Extend Above the Landing", 3, 5, 0.5, 0, "ft"), num("angle", "Ladder Angle", 75.5, 85, 0.5, 60, "°"), num("ceilingHeight", "Ceiling Height (for a stepladder)", 8, 20, 0.5, 6, "ft")],
    results: [["extensionLadderSize", "Extension Ladder to Buy (ft)", "n"], ["ladderLengthFt", "Working Length Needed (ft)", "n"], ["baseDistanceFt", "Set Base Out From Wall (ft)", "n"], ["stepladderFt", "Stepladder for Your Ceiling (ft)", "n"]],
    fn: E.ladderHeight, ex: { supportHeight: 10, extendAbove: 3, angle: 75.5, ceilingHeight: 8 },
    exText: (o) => `Example: to reach a 10 ft gutter line and step off, you need ${o.ladderLengthFt} ft of ladder — buy a ${o.extensionLadderSize} ft extension ladder and set the feet ${o.baseDistanceFt} ft from the wall.`,
    how: "Follow the 4-to-1 rule: 1 ft out for every 4 ft up (75.5°). For roof access the rails must extend 3 ft above the edge. Extension ladders lose 3–5 ft to overlap, so a 20 ft ladder reaches about 17 ft.",
    assume: "Working length = height ÷ sin(angle) + extension; overlap 3 ft up to 36 ft ladders, 4 ft to 48 ft. Stepladder ≈ ceiling height − 4 ft.",
    faq: [["What size ladder for a 2 story house?", "Usually a 28–32 ft extension ladder for gutters 18–22 ft up."], ["What size stepladder for an 8 ft ceiling?", "A 4 ft stepladder."]],
  }),
  mk({
    slug: "scaffolding-calculator", title: "Scaffolding Calculator (Sections, Frames & Hire Cost)",
    desc: "Estimate scaffolding for a wall — bays, levels, frames, cross braces and planks — and the rental (hire) cost for the weeks you need it.",
    inputs: [num("length", "Wall Length", 40, 1000, 1, 1, "ft"), num("height", "Working Height", 20, 200, 1, 1, "ft"), dd("frame", "Frame Size (7 ft bays)", E.SCAFFOLD_FRAMES), num("weeks", "Rental Weeks", 4, 104, 1, 1), usd("rentPerSectionWeek", "Rent per Section per Week", 35, 500, 1), usd("setup", "Delivery & Erection", 600, 50000, 10)],
    results: [["totalCost", "Estimated Rental Cost", "c"], ["sections", "Sections (bays × levels)", "n"], ["frames", "Frames", "n"], ["crossBraces", "Cross Braces", "n"], ["planks", "Planks (one deck)", "n"], ["faceSqFt", "Wall Area Covered (sq ft)", "n"]],
    fn: E.scaffolding, ex: { length: 40, height: 20, frame: 0, weeks: 4, rentPerSectionWeek: 35, setup: 600 },
    exText: (o) => `Example: scaffolding a 40 ft wall to 20 ft takes ${o.sections} sections (${o.frames} frames) — about ${money(o.totalCost)} for four weeks with delivery and setup.`,
    how: "Scaffolds over 4× their base width need ties or outriggers, and work platforms need guardrails above 10 ft (OSHA). In the UK, scaffolding is usually priced per job with a weekly rate after the first few weeks.",
    assume: `One section = 2 frames, 2 cross braces and 2 planks on a 7 ft bay. ${COST_NOTE}`,
    faq: [["How much does scaffolding cost?", "About $20–50 per section per week to rent, plus delivery and setup."]],
  }),
  mk({
    slug: "egress-window-calculator", title: "Egress Window Size Calculator (IRC Code Check)",
    desc: "Check whether a window meets IRC egress rules — net clear opening of 5.7 sq ft, 20 in minimum width, 24 in minimum height and 44 in maximum sill height — for casement, hung and slider windows.",
    inputs: [dd("type", "Window Type", E.EGRESS_TYPES), num("width", "Window Frame Width", 30, 120, 0.25, 12, "in"), num("height", "Window Frame Height", 48, 120, 0.25, 12, "in"), num("sill", "Sill Height Above Floor", 40, 120, 0.5, 0, "in"), dd("grade", "Floor Level", ["Basement or upper floor", "Ground (grade) floor"])],
    results: [["status", "Result", "l", E.EGRESS_STATUS], ["clearSqFt", "Net Clear Opening (sq ft)", "n"], ["clearWidthIn", "Clear Width (in)", "n"], ["clearHeightIn", "Clear Height (in)", "n"]],
    fn: E.egressWindow, ex: { type: 0, width: 30, height: 48, sill: 40, grade: 0 },
    exText: (o) => `Example: a 30 × 48 in casement opens to about ${o.clearWidthIn} × ${o.clearHeightIn} in (${o.clearSqFt} sq ft) — ${o.status === 0 ? "it meets IRC egress rules" : E.EGRESS_STATUS[o.status].toLowerCase()}.`,
    how: "Every bedroom and finished basement needs an egress opening. Basement egress below grade also needs a window well at least 9 sq ft with 36 in projection, and a ladder if it's deeper than 44 in. Check the actual clear opening on the manufacturer's spec sheet.",
    assume: "Clear opening estimated from frame size: casement −5 in each way; hung windows half the height −4 in; sliders half the width −4 in. Local codes may differ.",
    faq: [["What is the minimum egress window size?", "5.7 sq ft net clear opening (5.0 at grade), at least 20 in wide and 24 in high, with the sill no higher than 44 in."]],
  }),
  mk({
    slug: "tarp-size-calculator", title: "Tarp Size Calculator",
    desc: "Find what size tarp covers a car, boat, woodpile, roof patch or furniture — finished tarp length and width with sides and overhang, and the labeled size to buy.",
    inputs: [num("length", "Item Length", 16, 200, 0.5, 0, "ft"), num("width", "Item Width", 6, 200, 0.5, 0, "ft"), num("height", "Item Height (to cover the sides)", 4, 50, 0.5, 0, "ft"), num("overhang", "Extra Each Side (to tie down)", 1, 10, 0.5, 0, "ft")],
    results: [["buyLength", "Buy Labeled Length (ft)", "n"], ["buyWidth", "Buy Labeled Width (ft)", "n"], ["tarpLengthFt", "Finished Length Needed (ft)", "n"], ["tarpWidthFt", "Finished Width Needed (ft)", "n"], ["sqFt", "Tarp Area (sq ft)", "n"]],
    fn: E.tarpSize, ex: { length: 16, width: 6, height: 4, overhang: 1 },
    exText: (o) => `Example: covering a 16 × 6 ft item 4 ft tall, with 1 ft to tie down, takes a tarp at least ${o.tarpLengthFt} × ${o.tarpWidthFt} ft — buy a ${o.buyLength} × ${o.buyWidth}.`,
    how: "Labeled tarp sizes are cut sizes — finished tarps are usually about 3–6 in smaller after hemming, so this rounds up. For roof leaks, extend the tarp over the ridge and at least 4 ft past the damage.",
    assume: "Tarp = item + 2 × height + 2 × overhang each way; buy size rounded up to the next even foot after a 6 in allowance.",
    faq: [["What size tarp for a car?", "Usually 20 × 30 ft to cover it to the ground; 12 × 20 ft for the top only."]],
  }),
  mk({
    slug: "pressure-washer-nozzle-calculator", title: "Pressure Washer Nozzle Size Calculator",
    desc: "Find the right pressure washer nozzle (orifice) size for your machine's PSI and GPM — including surface cleaners with two nozzles — and the pressure you'll get with a standard size.",
    inputs: [num("psi", "Pump Pressure", 3000, 8000, 50, 500, "psi"), num("gpm", "Pump Flow", 2.5, 15, 0.1, 0.5, "gpm"), num("nozzles", "Nozzles Sharing the Flow (surface cleaner = 2)", 1, 4, 1, 1)],
    results: [["standardSize", "Nozzle Size to Buy", "n"], ["orificeSize", "Exact Orifice Size", "n"], ["pressureWithStandard", "Pressure With That Nozzle (psi)", "n"]],
    fn: E.pressureWasherNozzle, ex: { psi: 3000, gpm: 2.5, nozzles: 1 },
    exText: (o) => `Example: a 3,000 psi, 2.5 gpm pressure washer takes a size ${o.standardSize} nozzle (exact ${o.orificeSize}), giving about ${n2(o.pressureWithStandard)} psi.`,
    how: "The size number is separate from the spray angle color: red 0°, yellow 15°, green 25°, white 40°, black soap. A nozzle that's too small spikes pressure and trips the unloader; one too big loses pressure. Worn nozzles grow — replace them every season of heavy use.",
    assume: "Orifice size = gpm per nozzle × √(4,000 ÷ psi), the industry rating at 4,000 psi.",
    faq: [["What nozzle size for a 4 gpm 4000 psi pressure washer?", "Size 4.0."]],
  }),
  mk({
    slug: "window-energy-savings-calculator", title: "Window Replacement Energy Savings Calculator",
    desc: "Estimate how much new windows save on heating and cooling each year — from the old and new U-factors, window area and your climate's degree days — and the payback period.",
    inputs: [num("windows", "Number of Windows", 15, 200, 1, 1), num("sizeSqFt", "Average Window Size", 15, 100, 0.5, 1, "sq ft"), num("oldU", "Old Window U-Factor (single pane ≈ 1.1, old double ≈ 0.5)", 1.1, 1.3, 0.01, 0.1), num("newU", "New Window U-Factor (ENERGY STAR ≈ 0.22–0.30)", 0.27, 1.3, 0.01, 0.1), num("hdd", "Heating Degree Days", 5000, 12000, 50, 0), num("cdd", "Cooling Degree Days", 1200, 6000, 50, 0), usd("heatPerMMBtu", "Heat Cost per Million BTU", 15, 100, 0.5), usd("coolPerMMBtu", "Cooling Cost per Million BTU", 12, 100, 0.5), usd("costPerWindow", "Cost per Window Installed", 900, 5000, 10)],
    results: [["yearlySavings", "Yearly Savings", "c"], ["heatingSavings", "Heating Savings", "c"], ["coolingSavings", "Cooling Savings", "c"], ["paybackYears", "Payback (years)", "n"]],
    fn: E.windowEnergySavings, ex: { windows: 15, sizeSqFt: 15, oldU: 1.1, newU: 0.27, hdd: 5000, cdd: 1200, heatPerMMBtu: 15, coolPerMMBtu: 12, costPerWindow: 900 },
    exText: (o) => `Example: replacing 15 single-pane windows in a 5,000 degree-day climate saves about ${money(o.yearlySavings)} a year — a ${o.paybackYears}-year payback.`,
    how: "Savings are biggest when replacing single-pane windows in cold climates. Real savings can be higher where old windows leak air badly. Gas heat costs about $15 per million BTU; heat pumps about $15–20; oil and propane $25–40.",
    assume: `Conduction only: savings = ΔU × area × degree days × 24 ÷ 10⁶ × $/MMBtu. The federal 25C window credit ended after 2025. ${COST_NOTE}`,
    faq: [["How much do new windows save on energy?", "About $100–600 a year when replacing single-pane windows, much less for old double-pane."]],
  }),
  mk({
    slug: "skylight-calculator", title: "Skylight Size & Cost Calculator",
    desc: "Size skylights for a room — area as a share of the floor, number of units — and estimate the installed cost for fixed, venting, solar-powered or tubular skylights from brands like Velux.",
    inputs: [num("length", "Room Length", 15, 200, 0.5, 1, "ft"), num("width", "Room Width", 12, 200, 0.5, 1, "ft"), dd("light", "Existing Windows", E.ROOM_LIGHT), dd("type", "Skylight Type", E.SKYLIGHT_TYPES), num("unitSqFt", "Skylight Unit Size (2 × 4 ft ≈ 7.2 sq ft)", 7.2, 40, 0.1, 1, "sq ft"), num("adjust", "Price Adjustment", 0, 200, 1, -50, "%")],
    results: [["totalCost", "Estimated Installed Cost", "c"], ["skylightSqFt", "Skylight Area Needed (sq ft)", "n"], ["units", "Skylights", "n"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.skylight, ex: { length: 15, width: 12, light: 0, type: 0, unitSqFt: 7.2, adjust: 0 },
    exText: (o) => `Example: a 15 × 12 ft room with plenty of windows needs about ${o.skylightSqFt} sq ft of skylight — ${o.units} fixed ${o.units === 1 ? "skylight" : "skylights"} for about ${money(o.totalCost)} installed.`,
    how: "Too much skylight overheats a room in summer — stay near 5% of floor area in sunny rooms and use low-E glass. Tubular skylights suit closets, halls and bathrooms without an attic route.",
    assume: `Installed with flashing: fixed $1,800, manual vent $2,200, solar vent $2,900, tubular $900 each; cathedral ceilings and drywall finishing cost more. ${COST_NOTE}`,
    faq: [["How much does it cost to install a skylight?", "About $1,500–3,000 for a standard skylight and $600–1,200 for a tubular one."]],
  }),
  mk({
    slug: "home-addition-value-calculator", title: "Home Addition Value (ROI) Calculator",
    desc: "Estimate how much value a home addition adds — from the square footage, your area's price per square foot and the addition cost — with the share of the cost you'll recoup.",
    inputs: [num("sqft", "Addition Size", 400, 5000, 10, 10, "sq ft"), usd("cost", "Addition Cost", 100000, 2000000, 500), usd("localPerSqFt", "Local Home Price per Sq Ft", 200, 2000, 1), pct("resaleFactor", "Value of Added Space vs Average", 85, 120, 1), usd("homeValue", "Current Home Value", 400000, 20000000, 1000)],
    results: [["valueAdded", "Value Added", "c"], ["costRecouped", "Cost Recouped (%)", "n"], ["newHomeValue", "New Home Value", "c"], ["netGain", "Net Gain (Loss)", "c"]],
    fn: E.homeAdditionValue, ex: { sqft: 400, cost: 100000, localPerSqFt: 200, resaleFactor: 85, homeValue: 400000 },
    exText: (o) => `Example: a 400 sq ft, $100,000 addition where homes sell for $200/sq ft adds about ${money(o.valueAdded)} — ${o.costRecouped}% of its cost.`,
    how: "Added bedrooms and bathrooms add the most value; sunrooms and oversized primary suites add the least. Don't build far past the neighborhood's top prices — appraisers cap value at comparable sales.",
    assume: "Value added = sq ft × local $/sq ft × resale factor (85% default — added space usually sells below the average for the whole house).",
    faq: [["Does a home addition add value?", "Usually 50–80% of its cost, more where homes sell for high prices per sq ft."]],
  }),
  mk({
    slug: "renovation-roi-calculator", title: "Home Improvement ROI Calculator (Renovation Value)",
    desc: "Estimate the return on a home improvement — value added, cost recouped, ROI and home value after renovation — for kitchens, bathrooms, siding, decks, windows, roofs, basements and more.",
    inputs: [dd("project", "Project", E.RENO_PROJECTS, 3), usd("cost", "Project Cost", 30000, 2000000, 100), usd("homeValue", "Home Value Before", 400000, 20000000, 1000), pct("customRecoup", "Your Own Recoup % (0 = typical)", 0, 300, 1)],
    results: [["valueAdded", "Value Added", "c"], ["costRecouped", "Cost Recouped (%)", "n"], ["roiPercent", "ROI (%)", "n"], ["netCost", "Net Cost After Value Added", "c"], ["newHomeValue", "Home Value After", "c"]],
    fn: E.renovationRoi, ex: { project: 3, cost: 30000, homeValue: 400000, customRecoup: 0 },
    exText: (o) => `Example: a $30,000 minor kitchen remodel typically adds about ${money(o.valueAdded)} — ${o.costRecouped}% recouped.`,
    how: "Exterior projects (garage and entry doors, stone veneer, siding) recoup the most at resale. Big additions and upscale remodels recoup the least, but you also get to enjoy them. Enter your agent's estimate as your own recoup % if you have one.",
    assume: "Typical national cost-recouped percentages from Cost vs. Value–style surveys (rounded); they vary widely by market and change every year.",
    faq: [["What home improvements add the most value?", "Garage door and entry door replacements, stone veneer and minor kitchen remodels."], ["Does a finished basement add value?", "Usually about 70% of its cost."]],
  }),
  mk({
    slug: "airbnb-cleaning-fee-calculator", title: "Airbnb Cleaning Fee Calculator",
    desc: "Work out what to charge for an Airbnb or vacation rental cleaning fee — cleaner time by bedrooms and bathrooms, laundry and supplies — and what it adds per night.",
    inputs: [num("bedrooms", "Bedrooms", 2, 20, 1, 0), num("bathrooms", "Bathrooms", 1, 20, 0.5, 0), usd("hourlyRate", "Cleaner Rate per Hour", 30, 200, 1), usd("laundryPerBed", "Laundry per Bed", 8, 100, 0.5), usd("supplies", "Supplies & Restock per Turnover", 10, 200, 1), num("avgStay", "Average Stay", 3, 60, 1, 1, "nights")],
    results: [["suggestedFee", "Suggested Cleaning Fee", "c"], ["cleaningCost", "Your Cost per Turnover", "c"], ["hours", "Cleaning Time (hr)", "n"], ["perNight", "Fee per Night of Stay", "c"]],
    fn: E.airbnbCleaningFee, ex: { bedrooms: 2, bathrooms: 1, hourlyRate: 30, laundryPerBed: 8, supplies: 10, avgStay: 3 },
    exText: (o) => `Example: a 2-bedroom, 1-bath rental takes about ${o.hours} hours to turn over — charge about ${money(o.suggestedFee)}, or ${money(o.perNight)} per night on a 3-night stay.`,
    how: "Guests compare the total price, so a high cleaning fee hurts bookings on short stays. Many hosts keep the fee near cost and build the rest into the nightly rate. Check what similar listings nearby charge.",
    assume: "Time ≈ 1 hr + 0.75 hr per bedroom + 0.5 hr per bathroom; fee rounded up to the next $5.",
    faq: [["How much should I charge for Airbnb cleaning?", "Typically $75–150 for a 1–2 bedroom and $150–300 for larger homes."]],
  }),
  mk({
    slug: "commercial-cleaning-cost-calculator", title: "Commercial Cleaning Cost & Bid Calculator",
    desc: "Price a commercial or office cleaning bid — hours per visit from production rate, labor with payroll burden, supplies and profit margin — with the monthly price and price per square foot.",
    inputs: [num("sqft", "Building Size", 10000, 1000000, 100, 100, "sq ft"), num("perWeek", "Cleanings per Week", 5, 7, 1, 1), num("production", "Production Rate", 2500, 6000, 50, 500, "sq ft/hr"), usd("wage", "Cleaner Wage per Hour", 18, 100, 0.25), pct("burden", "Payroll Taxes & Insurance", 20, 60, 1), pct("supplies", "Supplies (% of labor)", 5, 30, 0.5), pct("margin", "Overhead & Profit Margin", 30, 70, 1)],
    results: [["monthlyBid", "Monthly Bid Price", "c"], ["pricePerVisit", "Price per Visit", "c"], ["hoursPerVisit", "Hours per Visit", "n"], ["pricePerSqFt", "Price per Sq Ft per Month", "c"]],
    fn: E.commercialCleaningCost, ex: { sqft: 10000, perWeek: 5, production: 2500, wage: 18, burden: 20, supplies: 5, margin: 30 },
    exText: (o) => `Example: cleaning a 10,000 sq ft office five nights a week takes ${o.hoursPerVisit} hours a visit — bid about ${money(o.monthlyBid)} a month.`,
    how: "Production rates: 2,000–3,000 sq ft/hr for offices, 1,000–1,500 for restrooms-heavy or medical space, 4,000+ for open warehouses. Walk the building before quoting, and price restrooms, floors and windows as extras if needed.",
    assume: `Monthly = price per visit × visits per week × 4.33; price = cost ÷ (1 − margin). ${COST_NOTE}`,
    faq: [["How much does commercial cleaning cost per square foot?", "Often $0.10–0.30 per sq ft per month for routine office cleaning, depending on frequency."]],
  }),
  mk({
    slug: "post-construction-cleaning-cost-calculator", title: "Post-Construction Cleaning Cost Calculator",
    desc: "Estimate post-construction cleaning cost — rough, final and touch-up (sparkle) cleans priced per square foot — with windows and debris haul-off.",
    inputs: [num("sqft", "Floor Area", 2500, 1000000, 10, 100, "sq ft"), dd("phase", "Cleaning Phase", E.PCC_PHASES, 1), num("windows", "Windows (inside & out)", 15, 1000, 1, 0), usd("windowRate", "Per Window", 8, 50, 0.5), usd("haul", "Debris Haul-Off", 0, 10000, 10), num("adjust", "Price Adjustment", 0, 200, 1, -50, "%")],
    results: COSTRES,
    fn: E.postConstructionCleaningCost, ex: { sqft: 2500, phase: 1, windows: 15, windowRate: 8, haul: 0, adjust: 0 },
    exText: (o) => `Example: a final clean of a 2,500 sq ft new home with 15 windows costs about ${money(o.totalCost)}.`,
    how: "Rough cleans remove debris and dust before painting and flooring; final cleans do every surface, fixtures and cabinets; the touch-up clean happens just before handover. Commercial contractors often bid all three together.",
    assume: `Typical rates per sq ft: rough $0.20, final $0.30, touch-up $0.12. ${COST_NOTE}`,
    faq: [["How much does post-construction cleaning cost?", "About $0.10–0.40 per sq ft per phase — $500–1,000 for a final clean of a typical home."]],
  }),
  mk({
    slug: "home-maintenance-cost-calculator", title: "Home Maintenance Cost Calculator (Yearly Budget)",
    desc: "Estimate how much to budget for home maintenance and repairs each year and month — using the 1% rule and the square-foot rule, adjusted for your home's age and climate.",
    inputs: [usd("homeValue", "Home Value", 400000, 20000000, 1000), num("sqft", "Home Size", 2000, 20000, 10, 100, "sq ft"), num("age", "Home Age", 20, 300, 1, 0, "years"), dd("climate", "Climate", E.CLIMATES)],
    results: [["recommendedYearly", "Recommended Yearly Budget", "c"], ["monthly", "Monthly Savings Target", "c"], ["onePercentRule", "1% Rule", "c"], ["squareFootRule", "$1.25 per Sq Ft Rule", "c"]],
    fn: E.homeMaintenanceCost, ex: { homeValue: 400000, sqft: 2000, age: 20, climate: 0 },
    exText: (o) => `Example: a 20-year-old, 2,000 sq ft, $400,000 home needs about ${money(o.recommendedYearly)} a year for upkeep — ${money(o.monthly)} a month.`,
    how: "Put the monthly amount into a separate savings account. Big items come in lumps: a roof every 20–30 years, HVAC every 15–20, a water heater every 10–12, exterior paint every 7–10.",
    assume: "Average of 1% of value and $1.25 per sq ft, × 0.8 under 10 years old, × 1.25 at 25–50 years, × 1.5 over 50, and × 1.25 in harsh climates.",
    faq: [["How much should I budget for home maintenance?", "About 1–2% of the home's value a year, more for older homes."]],
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
