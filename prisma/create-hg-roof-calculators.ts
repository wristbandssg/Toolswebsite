// One-time (but safe to re-run) batch setup script: creates 43 calculators in House & Garden
// Calculators > Roofing & Gutter Calculators (roof pitch, rafters, trusses, shingles, metal and tile roofing, ventilation, gutters and roofing costs). Formulas live in src/lib/calc-engine-hg-roof.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-roof-calculators.ts
// or
//   npm run db:create-hg-roof-calculators

import * as E from "../src/lib/calc-engine-hg-roof";

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

const CAT = "roofing-gutter-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US installed costs and vary by region, roof complexity and season — get at least three local quotes.";
const STORIES = ["One story", "Two stories", "Three or more"];
const PITCH = (d = 6) => num("pitch", "Roof Pitch (rise per 12 in of run)", d, 24, 0.5, 0, "in");
const OH = num("overhang", "Eave Overhang", 12, 36, 1, 0, "in");

const TOOLS: ToolDef[] = [
  mk({
    slug: "roof-pitch-calculator", title: "Roof Pitch Calculator (Pitch, Angle & Slope)",
    desc: "Convert roof rise and run into pitch (x/12), angle in degrees, slope percent and the pitch multiplier — and see what kind of roofing the pitch suits.",
    meta: "Roof Pitch Calculator — Pitch to Degrees, Slope & Multiplier",
    inputs: [num("rise", "Rise", 6, 100, 0.25, 0, "in"), num("run", "Run", 12, 100, 0.25, 0.25, "in")],
    results: [["pitchPer12", "Pitch (x / 12)", "n"], ["angleDeg", "Angle (degrees)", "n"], ["slopePercent", "Slope (%)", "n"], ["pitchFactor", "Pitch Multiplier", "n"], ["pitchClass", "Roof Type", "l", E.PITCH_CLASSES]],
    fn: E.roofPitch, ex: { rise: 6, run: 12 },
    exText: (o) => `Example: a roof that rises 6 in for every 12 in of run is a ${o.pitchPer12}/12 pitch — ${o.angleDeg}° (${o.slopePercent}% slope), multiplier ${o.pitchFactor}.`,
    how: "Measure the rise over a level 12 in run (put a level on a rafter or the roof surface and measure straight down). You can also enter total rise and run in inches, such as ridge height and half the building width.\n\nMultiply the flat footprint by the pitch multiplier to get the roof's real surface area.",
    assume: "Angle = arctan(rise ÷ run); pitch multiplier = √(1 + (rise ÷ 12)²). Asphalt shingles need at least 2/12 (with double underlayment below 4/12).",
    faq: [["What is a 6/12 pitch in degrees?", "26.6°."], ["What is the most common roof pitch?", "Between 4/12 and 9/12 on most houses."]],
  }),
  mk({
    slug: "rafter-calculator", title: "Rafter Length Calculator (with Overhang & Ridge Board)",
    desc: "Calculate common rafter length from the building span and roof pitch — with overhang and ridge board — plus the lumber length to buy, plumb cut angle, ridge height and number of rafters.",
    meta: "Rafter Length Calculator — Rafter Size, Cut Angle & Count",
    inputs: [num("span", "Building Span (wall to wall)", 24, 100, 0.5, 4, "ft"), PITCH(), OH, num("ridgeThickness", "Ridge Board Thickness", 1.5, 3.5, 0.25, 0, "in"), num("buildingLength", "Building Length", 40, 500, 0.5, 4, "ft"), num("spacing", "Rafter Spacing", 16, 24, 1, 12, "in")],
    results: [["rafterLengthFt", "Rafter Length (ft)", "n"], ["lumberLengthFt", "Lumber Length to Buy (ft)", "n"], ["plumbCutDeg", "Plumb Cut Angle (°)", "n"], ["ridgeRiseFt", "Ridge Height Above Walls (ft)", "n"], ["rafters", "Rafters (both sides)", "n"]],
    fn: E.rafter, ex: { span: 24, pitch: 6, overhang: 12, ridgeThickness: 1.5, buildingLength: 40, spacing: 16 },
    exText: (o) => `Example: a 24 ft span at 6/12 with a 12 in overhang needs ${o.rafterLengthFt} ft rafters — buy ${o.lumberLengthFt} ft boards — and the ridge sits ${o.ridgeRiseFt} ft above the wall plates.`,
    how: "Enter the outside-of-wall span, pitch and overhang. Each rafter runs half the span minus half the ridge board. Cut the plumb cut at the pitch angle, then mark the birdsmouth where the rafter sits on the wall.",
    assume: "Rafter length = (run + overhang) × pitch multiplier, measured along the top edge from the ridge to the tail. Rafter count = (length ÷ spacing + 1) × 2. Check rafter size with the rafter span calculator.",
    faq: [["How long is a rafter for a 24 ft wide building?", "About 13.4 ft at 6/12 without overhang — 14.5 ft with a 12 in overhang."]],
  }),
  mk({
    slug: "roof-area-calculator", title: "Roof Area & Squares Calculator (Roof Square Footage)",
    desc: "Calculate roof square footage and roofing squares from the house footprint, overhangs and pitch — with a waste allowance — for shingles, metal or any roofing.",
    meta: "Roof Square Footage Calculator — Roof Area & Squares",
    inputs: [num("length", "House Length", 50, 1000, 0.5, 0, "ft"), num("width", "House Width", 30, 1000, 0.5, 0, "ft"), OH, PITCH(), num("extraArea", "Extra Areas (porches, dormers)", 0, 100000, 1, 0, "sq ft"), pct("waste", "Waste Allowance", 10, 30)],
    results: [["squares", "Roofing Squares (incl. waste)", "n"], ["roofArea", "Roof Area (sq ft)", "n"], ["areaWithWaste", "Area with Waste (sq ft)", "n"], ["footprint", "Footprint incl. Overhangs (sq ft)", "n"]],
    fn: E.roofArea, ex: { length: 50, width: 30, overhang: 12, pitch: 6, extraArea: 0, waste: 10 },
    exText: (o) => `Example: a 50 × 30 ft house with 12 in overhangs and a 6/12 roof has about ${n2(o.roofArea)} sq ft of roof — ${o.squares} squares with 10% waste.`,
    how: "Measure the house footprint (or read it from your plans or a satellite view), add the overhangs and pick the pitch. One roofing square = 100 sq ft. Use 10% waste for simple gables and 15% for hips and valleys.\n\nRoof size \"by address\" tools use aerial imagery; this calculator gives the same result from the footprint and pitch.",
    assume: "Roof area = footprint (incl. overhangs) × √(1 + (pitch ÷ 12)²). Works for gable and hip roofs of one pitch.",
    faq: [["How many squares is a 2,000 sq ft house?", "About 22–28 squares for a single-story house, depending on pitch and overhangs."]],
  }),
  mk({
    slug: "gable-roof-calculator", title: "Gable Roof Calculator (Area, Rafters & Gable Ends)",
    desc: "Calculate a gable roof — roof area and squares, rafter length, ridge length with rake overhangs, roof rise and the gable-end wall area for siding.",
    inputs: [num("width", "Building Width", 24, 200, 0.5, 4, "ft"), num("length", "Building Length", 40, 500, 0.5, 4, "ft"), PITCH(), OH, num("rakeOverhang", "Rake (Gable) Overhang", 12, 36, 1, 0, "in")],
    results: [["roofArea", "Roof Area (sq ft)", "n"], ["squares", "Squares (incl. 10%)", "n"], ["rafterLengthFt", "Rafter Length (ft)", "n"], ["ridgeLengthFt", "Ridge Length (ft)", "n"], ["riseFt", "Roof Rise (ft)", "n"], ["gableEndSqFt", "Both Gable Ends (sq ft)", "n"]],
    fn: E.gableRoof, ex: { width: 24, length: 40, pitch: 6, overhang: 12, rakeOverhang: 12 },
    exText: (o) => `Example: a 24 × 40 ft gable roof at 6/12 has ${n2(o.roofArea)} sq ft (${o.squares} squares) and ${o.rafterLengthFt} ft rafters; the two gable ends add ${o.gableEndSqFt} sq ft of siding.`,
    how: "Enter the building size, pitch and overhangs. Gable roofs are the simplest to frame and shingle — 10% waste is usually enough.",
    assume: "Each slope = rafter length × (length + 2 rake overhangs); gable end area = width × rise ÷ 2 each.",
    faq: [["How do you calculate gable roof area?", "Rafter length × ridge length × 2."]],
  }),
  mk({
    slug: "hip-roof-calculator", title: "Hip Roof Calculator (Area, Hip Rafters & Ridge)",
    desc: "Calculate a hip roof — roof area and squares, hip rafter length, common rafter length, ridge length and the total hip and ridge for ridge cap shingles.",
    inputs: [num("length", "Building Length", 40, 500, 0.5, 4, "ft"), num("width", "Building Width", 28, 200, 0.5, 4, "ft"), PITCH(), OH],
    results: [["roofArea", "Roof Area (sq ft)", "n"], ["squares", "Squares (incl. 15%)", "n"], ["hipRafterFt", "Hip Rafter Length (ft)", "n"], ["commonRafterFt", "Common Rafter Length (ft)", "n"], ["ridgeLengthFt", "Ridge Length (ft)", "n"], ["hipAndRidgeFt", "Hips + Ridge (ft, for ridge cap)", "n"]],
    fn: E.hipRoof, ex: { length: 40, width: 28, pitch: 6, overhang: 12 },
    exText: (o) => `Example: a 40 × 28 ft hip roof at 6/12 covers ${n2(o.roofArea)} sq ft (${o.squares} squares with 15% waste); each hip rafter is ${o.hipRafterFt} ft and the ridge ${o.ridgeLengthFt} ft.`,
    how: "Enter the building size and pitch. A hip roof of one pitch has the same area as a gable over the same footprint, but more cutting — use 15% waste — and much more ridge cap.",
    assume: "Hip rafter = √(2 × run² + rise²) where run = half the narrower side (incl. overhang); ridge = long side − short side.",
    faq: [["How long is a hip rafter?", "About 1.5 times the common rafter run at a 6/12 pitch."]],
  }),
  mk({
    slug: "gambrel-roof-calculator", title: "Gambrel Roof Calculator (Barn Roof Rafters & Truss)",
    desc: "Lay out a gambrel (barn-style) roof with the classic half-circle method — equal rafter lengths, roof height, lower and upper angles, roof area and number of trusses.",
    inputs: [num("width", "Building Width", 24, 100, 0.5, 6, "ft"), num("length", "Building Length", 32, 500, 0.5, 4, "ft"), num("spacing", "Truss Spacing", 24, 48, 1, 12, "in")],
    results: [["rafterLengthFt", "Each Rafter Length (ft)", "n"], ["heightFt", "Roof Height Above Walls (ft)", "n"], ["lowerAngleDeg", "Lower Rafter Angle (°)", "n"], ["upperAngleDeg", "Upper Rafter Angle (°)", "n"], ["roofArea", "Roof Area (sq ft)", "n"], ["trusses", "Trusses", "n"]],
    fn: E.gambrelRoof, ex: { width: 24, length: 32, spacing: 24 },
    exText: (o) => `Example: a 24 ft wide gambrel uses four ${o.rafterLengthFt} ft rafters per truss — ${o.heightFt} ft tall at the peak — with ${o.trusses} trusses for 32 ft.`,
    how: "The half-circle layout puts the four rafter joints on a semicircle whose diameter is the building width, so all rafters are the same length — easy to cut and strong. Join rafters with plywood gussets on both sides.",
    assume: "Rafter (chord) = width × sin 22.5°; lower rafters at 67.5° and upper at 22.5° from horizontal; height = half the width. Other gambrel proportions work too.",
    faq: [["What angles are used on a gambrel roof?", "Classic barn layouts use about 60–70° on the lower slope and 20–30° on the upper."]],
  }),
  mk({
    slug: "shed-roof-pitch-calculator", title: "Shed (Lean-To) Roof Pitch Calculator",
    desc: "Find the pitch, angle and rafter length of a shed or lean-to roof from the run and the high and low wall heights — with overhangs.",
    inputs: [num("run", "Roof Run (wall to wall)", 10, 100, 0.25, 1, "ft"), num("highWall", "High Wall Height", 9, 30, 0.25, 0, "ft"), num("lowWall", "Low Wall Height", 7, 30, 0.25, 0, "ft"), OH],
    results: [["pitchPer12", "Pitch (x / 12)", "n"], ["angleDeg", "Angle (°)", "n"], ["rafterLengthFt", "Rafter Length incl. Overhangs (ft)", "n"], ["riseIn", "Rise (in)", "n"]],
    fn: E.shedRoofPitch, ex: { run: 10, highWall: 9, lowWall: 7, overhang: 12 },
    exText: (o) => `Example: a 10 ft lean-to with walls of 9 and 7 ft has a ${o.pitchPer12}/12 pitch (${o.angleDeg}°) and needs ${o.rafterLengthFt} ft rafters.`,
    how: "Enter the run and both wall heights. Shed roofs should be at least 1/4 in per ft (about 1/48) for membranes, 3/12 for exposed-fastener metal and 4/12 for standard shingle installation.",
    assume: "Pitch = (high − low) ÷ run × 12; overhangs at both ends.",
    faq: [["What is the minimum pitch for a shed roof?", "About 2/12–3/12 for metal and shingles; flat membranes can go as low as 1/4 in per ft."]],
  }),
  mk({
    slug: "birdsmouth-calculator", title: "Birdsmouth Cut Calculator",
    desc: "Lay out a rafter birdsmouth — plumb (heel) cut height, seat cut, the height above plate — and check it stays within one-third of the rafter depth.",
    inputs: [PITCH(), num("rafterDepth", "Rafter Actual Depth", 7.25, 11.25, 0.25, 3.5, "in"), num("seat", "Seat Cut (wall plate width)", 3.5, 7.25, 0.25, 1, "in")],
    results: [["plumbCutIn", "Plumb (Heel) Cut Height (in)", "n"], ["okay", "Check", "l", E.BIRDSMOUTH_OK], ["seatCutIn", "Seat Cut (in)", "n"], ["heightAbovePlateIn", "Height Above Plate (in)", "n"], ["maxSeatIn", "Longest Seat Within 1/3 (in)", "n"]],
    fn: E.birdsmouth, ex: { pitch: 6, rafterDepth: 7.25, seat: 3.5 },
    exText: (o) => `Example: a 2×8 rafter at 6/12 sitting on a 2×4 wall needs a ${o.plumbCutIn} in heel cut with a 3.5 in seat — within the one-third limit.`,
    how: "Mark the plumb line where the rafter crosses the outside of the wall, then square off the seat the width of the top plate. Codes and good practice keep the notch to no more than a third of the rafter's depth.",
    assume: "Heel cut = seat × pitch ÷ 12; height above plate = depth ÷ cos(angle) − heel cut.",
    faq: [["How deep should a birdsmouth cut be?", "No more than 1/3 of the rafter depth."]],
  }),
  mk({
    slug: "roof-truss-calculator", title: "Roof Truss Calculator (Span, Pitch, Count & Lumber)",
    desc: "Plan roof trusses — number of trusses, truss height, top chord length and lumber per truss — for common, king post, scissor, mono, attic and gambrel trusses, with a rough truss cost.",
    inputs: [dd("type", "Truss Type", E.TRUSS_TYPES), num("span", "Span", 24, 80, 0.5, 6, "ft"), PITCH(), OH, num("buildingLength", "Building Length", 40, 500, 0.5, 4, "ft"), num("spacing", "Truss Spacing", 24, 48, 1, 12, "in"), usd("pricePerFtSpan", "Price per Foot of Span (per truss)", 8, 50, 0.25)],
    results: [["trusses", "Trusses Needed", "n"], ["heightFt", "Truss Height (ft)", "n"], ["topChordFt", "Top Chord Length (ft)", "n"], ["lumberPerTrussFt", "Lumber per Truss (linear ft)", "n"], ["cost", "Estimated Truss Cost", "c"]],
    fn: E.roofTruss, ex: { type: 0, span: 24, pitch: 6, overhang: 12, buildingLength: 40, spacing: 24, pricePerFtSpan: 8 },
    exText: (o) => `Example: a 24 ft span building 40 ft long with common trusses at 24 in needs ${o.trusses} trusses, each ${o.heightFt} ft tall — roughly ${money(o.cost)} from a truss plant.`,
    how: "Pick the truss type and enter the span, pitch and building length. Pre-engineered trusses come with stamped drawings — for a house or garage, buy engineered trusses rather than building your own.",
    assume: "Count = length ÷ spacing + 1; lumber includes webs at a typical factor for each type; scissor, attic and gambrel trusses cost about 40% more.",
    faq: [["How much does a 24 ft roof truss cost?", "Often $150–300 for a common truss, more for scissor or attic trusses."]],
  }),
  mk({
    slug: "rafter-span-calculator", title: "Rafter Span Calculator (Maximum Rafter Span)",
    desc: "Estimate the maximum horizontal span for 2×6 to 2×12 rafters by species, spacing and roof snow or live load — from bending strength and deflection.",
    inputs: [dd("size", "Rafter Size", E.LUMBER, 1), dd("species", "Species & Grade", E.SPECIES), dd("spacing", "Spacing", ["12 in", "16 in", "24 in"], 1), dd("load", "Roof Live / Snow Load", ["20 psf (no snow)", "30 psf snow", "50 psf snow", "70 psf snow"], 1), num("deadLoad", "Dead Load", 10, 30, 1, 5, "psf")],
    results: [["maxSpanFt", "Maximum Horizontal Span (ft)", "n"], ["feet", "Feet", "n"], ["inches", "+ Inches", "n"], ["bendingLimitFt", "Bending Limit (ft)", "n"], ["deflectionLimitFt", "Deflection Limit (ft)", "n"]],
    fn: E.rafterSpan, ex: { size: 1, species: 0, spacing: 1, load: 1, deadLoad: 10 },
    exText: (o) => `Example: 2×8 Douglas fir No. 2 rafters at 16 in with a 30 psf snow load can span about ${o.feet} ft ${o.inches} in horizontally.`,
    how: "Pick the lumber, spacing and your local roof snow load. The span is measured horizontally from the wall to the ridge, not along the slope. Use the IRC rafter span tables (R802.4.1) or an engineer for permitted work.",
    assume: "Bending and live-load deflection (L/180, no ceiling attached) with NDS 2018 No. 2 design values, repetitive-member and snow-duration factors. Planning estimate only — local code tables govern.",
    faq: [["How far can a 2x8 rafter span?", "Roughly 14–17 ft at 16 in spacing for light snow loads, depending on species."]],
  }),
  mk({
    slug: "ridge-beam-calculator", title: "Ridge Beam Size Calculator (LVL)",
    desc: "Estimate the LVL size for a structural ridge beam — plies and depth — from the beam span between posts, building width and roof snow and dead loads.",
    inputs: [num("beamSpan", "Ridge Beam Span (post to post)", 16, 40, 0.5, 4, "ft"), num("buildingWidth", "Building Width (rafter span)", 24, 60, 0.5, 6, "ft"), num("snowLoad", "Roof Snow / Live Load", 30, 100, 5, 20, "psf"), num("deadLoad", "Dead Load", 15, 40, 1, 5, "psf")],
    results: [["plies", "LVL Plies (1.75 in each)", "n"], ["depthIn", "LVL Depth (in)", "n"], ["widthIn", "Beam Width (in)", "n"], ["loadPerFt", "Load on Beam (lb/ft)", "n"], ["momentLbFt", "Bending Moment (lb·ft)", "n"], ["requiredSectionModulus", "Required Section Modulus (in³)", "n"]],
    fn: E.ridgeBeam, ex: { beamSpan: 16, buildingWidth: 24, snowLoad: 30, deadLoad: 15 },
    exText: (o) => `Example: a 16 ft structural ridge on a 24 ft wide building with 30 psf snow needs about a ${o.plies}-ply 1.75 × ${o.depthIn} in LVL (${o.loadPerFt} lb/ft).`,
    how: "A structural ridge beam carries half of each rafter's load (vaulted ceilings with no ties). A ridge board in a tied roof carries almost nothing. A result of 0 means the span is too long for 4-ply LVL — add a post or get an engineered beam.",
    assume: "Tributary width = half the building width; simple span; LVL Fb 2,600 psi, E 2.0M psi; deflection L/240. Estimate only — an engineer or the LVL maker's span tables must confirm, and posts need proper bearing to the foundation.",
    faq: [["Do I need a ridge beam or a ridge board?", "A ridge beam for vaulted ceilings without ceiling joists or rafter ties; a ridge board otherwise."]],
  }),
  mk({
    slug: "roof-snow-load-calculator", title: "Roof Snow & Dead Load Calculator (ASCE 7)",
    desc: "Estimate the design roof snow load from the ground snow load (ASCE 7 method) — exposure, thermal and slope factors — plus the dead load of the roofing and the total weight on the roof.",
    inputs: [num("groundSnow", "Ground Snow Load (pg)", 30, 300, 1, 0, "psf"), dd("exposure", "Exposure", ["Fully exposed (open, windy)", "Partially exposed (typical)", "Sheltered (trees, buildings)"], 1), dd("thermal", "Building Heat", ["Heated building", "Unheated / vented attic", "Freezer or open-air structure"]), num("importance", "Importance Factor", 1, 1.2, 0.1, 0.8), num("slopeDeg", "Roof Slope", 26.6, 70, 0.1, 0, "°"), dd("roofing", "Roofing", ["Asphalt shingles", "Metal", "Concrete / clay tile", "Slate", "Wood shakes"]), num("otherDead", "Other Dead Load (sheathing, framing)", 7, 30, 0.5, 0, "psf"), num("roofArea", "Roof Area", 1500, 100000, 10, 0, "sq ft")],
    results: [["designSnowPsf", "Design Roof Snow Load (psf)", "n"], ["flatRoofSnowPsf", "Flat-Roof Snow Load (psf)", "n"], ["deadLoadPsf", "Dead Load (psf)", "n"], ["totalPsf", "Total Load (psf)", "n"], ["totalLb", "Total on the Roof (lb)", "n"]],
    fn: E.snowLoad, ex: { groundSnow: 30, exposure: 1, thermal: 0, importance: 1, slopeDeg: 26.6, roofing: 0, otherDead: 7, roofArea: 1500 },
    exText: (o) => `Example: a 30 psf ground snow load on a heated house with a 6/12 shingle roof gives a design roof snow load of about ${o.designSnowPsf} psf and ${o.totalPsf} psf in total.`,
    how: "Look up the ground snow load for your site from the local building department or the ASCE Hazard Tool. Drifts against higher roofs, valleys and parapets can be much heavier than the uniform load.",
    assume: "ASCE 7-16 simplified: pf = 0.7·Ce·Ct·Is·pg, sloped roofs reduced above 30°. Ignores drifting, rain-on-snow and minimum-load rules. Roofing dead loads: shingles 3, metal 1.5, tile 10, slate 9, shakes 4.5 psf.",
    faq: [["How much does snow on a roof weigh?", "Fresh snow 5–20 lb per cu ft; packed or wet snow can exceed 20 lb per cu ft."]],
  }),
  mk({
    slug: "purlin-spacing-calculator", title: "Purlin Spacing Calculator (Metal Roof)",
    desc: "Find the maximum purlin spacing for a metal roof by panel gauge and snow load — with the number of purlin rows, total linear feet and a suggested purlin size for your truss spacing.",
    inputs: [dd("gauge", "Panel Gauge", ["29 gauge", "26 gauge", "24 gauge"], 1), dd("snow", "Snow Load", ["Up to 30 psf", "30–60 psf", "Over 60 psf"]), num("slopeLength", "Slope Length (eave to ridge)", 12, 60, 0.5, 2, "ft"), num("roofLength", "Roof Length", 30, 500, 0.5, 2, "ft"), num("sides", "Roof Sides", 2, 2, 1, 1), num("trussSpacing", "Truss / Rafter Spacing", 2, 10, 0.5, 1, "ft")],
    results: [["spacingIn", "Purlin Spacing (in, on center)", "n"], ["rows", "Purlin Rows per Side", "n"], ["linearFeet", "Total Purlin Length (ft)", "n"], ["purlinSize", "Suggested Purlin", "l", E.PURLIN_SIZES]],
    fn: E.purlinSpacing, ex: { gauge: 1, snow: 0, slopeLength: 12, roofLength: 30, sides: 2, trussSpacing: 2 },
    exText: (o) => `Example: 26 ga panels with light snow can sit on purlins about ${o.spacingIn} in apart — ${o.rows} rows per side, ${o.linearFeet} ft of purlins in all.`,
    how: "Always check the panel maker's span table — it lists the maximum purlin spacing by gauge, profile and load. Put a purlin at the eave and at the ridge.",
    assume: "Rule-of-thumb spacings (in): 29 ga 24 / 18 / 12, 26 ga 36 / 24 / 18, 24 ga 48 / 36 / 24 for the three snow ranges. Purlin size suggestions are typical post-frame practice.",
    faq: [["How far apart should purlins be for metal roofing?", "Often 24 in for 29 ga and up to 36–48 in for heavier gauges — check the manufacturer."]],
  }),
  mk({
    slug: "shingle-calculator", title: "Shingle Calculator (Bundles, Squares, Starter & Ridge Cap)",
    desc: "Work out how many bundles of shingles you need — squares, starter strip, hip and ridge cap, underlayment rolls and nails — from your roof area and edges.",
    meta: "Shingle Calculator — How Many Bundles of Shingles Do I Need?",
    inputs: [num("roofArea", "Roof Area", 2000, 100000, 10, 0, "sq ft"), pct("waste", "Waste Allowance", 10, 30), num("bundlesPerSquare", "Bundles per Square", 3, 5, 1, 2), num("eavesRakes", "Eaves + Rakes (for starter)", 160, 10000, 1, 0, "ft"), num("hipRidge", "Hips + Ridges (for cap)", 40, 10000, 1, 0, "ft")],
    results: [["bundles", "Shingle Bundles", "n"], ["squares", "Squares (incl. waste)", "n"], ["starterBundles", "Starter Strip Bundles", "n"], ["ridgeCapBundles", "Hip & Ridge Cap Bundles", "n"], ["underlaymentRolls", "Synthetic Underlayment Rolls (10 sq)", "n"], ["nailsLb", "Roofing Nails (lb)", "n"]],
    fn: E.shingle, ex: { roofArea: 2000, waste: 10, bundlesPerSquare: 3, eavesRakes: 160, hipRidge: 40 },
    exText: (o) => `Example: a 2,000 sq ft roof with 10% waste needs ${o.bundles} bundles (${o.squares} squares), ${o.starterBundles} bundles of starter and ${o.ridgeCapBundles} of ridge cap.`,
    how: "Enter the roof area (use the roof area calculator if you only know the footprint and pitch). Most architectural shingles are 3 bundles per square; some heavy designer shingles are 4–5.",
    assume: "Starter ≈ 105 linear ft per bundle; hip and ridge ≈ 33 ft per bundle; synthetic underlayment 10 squares per roll; ≈ 2.5 lb of nails per square.",
    faq: [["How many bundles of shingles cover 100 square feet?", "Usually 3 bundles = 1 square = 100 sq ft."]],
  }),
  mk({
    slug: "shingle-weight-calculator", title: "Roof Shingle Weight Calculator (Roof Weight)",
    desc: "Calculate how much a roof weighs — asphalt shingles, metal, tile, slate or shakes — per square and in total, including extra layers, for dumpsters and structural checks.",
    inputs: [num("squares", "Roof Squares", 20, 1000, 0.5, 0), dd("material", "Roofing", E.ROOF_MATS, 1), num("layers", "Layers", 1, 3, 1, 1)],
    results: [["totalLb", "Total Weight (lb)", "n"], ["tons", "Tons", "n"], ["psf", "Weight per Sq Ft (psf)", "n"], ["perSquareLb", "Weight per Square (lb)", "n"], ["bundleLb", "Bundle Weight (lb, shingles)", "n"]],
    fn: E.shingleWeight, ex: { squares: 20, material: 1, layers: 1 },
    exText: (o) => `Example: 20 squares of architectural shingles weigh about ${n2(o.totalLb)} lb (${o.tons} tons) — ${o.psf} psf.`,
    how: "Enter the squares and material. For a tear-off, count every layer; for a reroof over shingles, check the code (usually only two layers allowed in total).",
    assume: "Typical weights per square: 3-tab 230 lb, architectural 300, designer 400, metal 100, concrete tile 950, clay tile 1,100, slate 900, wood shakes 350.",
    faq: [["How much does a square of shingles weigh?", "About 230–400 lb depending on the shingle."]],
  }),
  mk({
    slug: "roofing-nails-calculator", title: "Roofing Nail Calculator (Nails, Pounds & Coils)",
    desc: "Calculate how many roofing nails you need for shingles — 4 or 6 nails per shingle, 3-tab or architectural — in nails, pounds and coil boxes.",
    inputs: [num("squares", "Roof Squares", 20, 1000, 0.5, 0), dd("shingle", "Shingle Type", ["3-tab", "Architectural"], 1), dd("pattern", "Nailing Pattern", ["Standard (4 nails)", "High-wind (6 nails)"])],
    results: [["nails", "Nails Needed", "n"], ["pounds", "Pounds of 1¼ in Nails", "n"], ["coilBoxes", "Coil Boxes (7,200)", "n"], ["nailsPerSquare", "Nails per Square", "n"]],
    fn: E.roofingNails, ex: { squares: 20, shingle: 1, pattern: 0 },
    exText: (o) => `Example: 20 squares of architectural shingles with 4 nails each need about ${n2(o.nails)} nails — ${o.pounds} lb or ${o.coilBoxes} coil box(es).`,
    how: "Use the nailing pattern on the shingle wrapper; high-wind warranties and many coastal codes require 6 nails. Use 1¼ in galvanized roofing nails (longer through thick sheathing or ridge cap).",
    assume: "≈ 78 three-tab or 66 architectural shingles per square; ≈ 140 coil nails per lb; 5% extra.",
    faq: [["How many nails per square of shingles?", "About 260–320 with 4 nails per shingle."]],
  }),
  mk({
    slug: "ice-water-shield-calculator", title: "Ice & Water Shield Calculator (Rolls)",
    desc: "Calculate ice and water shield for eaves and valleys — courses needed to reach 24 in inside the warm wall, square feet and rolls.",
    inputs: [num("eaves", "Total Eave Length", 100, 10000, 1, 0, "ft"), num("valleys", "Total Valley Length", 20, 10000, 1, 0, "ft"), PITCH(), OH, num("insideWall", "Required Distance Inside the Wall", 24, 48, 1, 0, "in"), dd("roll", "Roll Size", ["2 squares (200 sq ft)", "1.5 squares (150 sq ft)", "225 sq ft"])],
    results: [["rolls", "Rolls Needed", "n"], ["sqFt", "Coverage Needed (sq ft)", "n"], ["courses", "Courses Up from the Eave", "n"], ["upSlopeFt", "Distance Up the Slope (ft)", "n"]],
    fn: E.iceWaterShield, ex: { eaves: 100, valleys: 20, pitch: 6, overhang: 12, insideWall: 24 , roll: 0 },
    exText: (o) => `Example: 100 ft of eaves at 6/12 with a 12 in overhang needs ${o.courses} course(s) and 20 ft of valleys — ${o.rolls} rolls of 2-square ice and water shield.`,
    how: "In cold climates the IRC (R905.1.2) requires an ice barrier from the eave to at least 24 in inside the exterior wall. Valleys get a full 36 in wide strip.",
    assume: "Rolls are 36 in wide with 3 in laps (2.75 ft per course); 6 in wall thickness added; 10% for laps and cuts.",
    faq: [["How far up should ice and water shield go?", "From the eave to at least 24 in inside the warm wall — often two courses on low pitches."]],
  }),
  mk({
    slug: "metal-roof-calculator", title: "Metal Roof Calculator (Panels, Screws, Clips & Trim)",
    desc: "Calculate metal roofing panels — number and length per side — plus screws or clips, ridge cap and trim, and the minimum slope for your panel type.",
    inputs: [dd("type", "Panel Type", E.METAL_TYPES), num("roofLength", "Roof Length (along the eave)", 40, 500, 0.5, 1, "ft"), num("run", "Slope Length (eave to ridge)", 14, 60, 0.25, 1, "ft"), num("sides", "Roof Sides", 2, 4, 1, 1), num("panelWidth", "Panel Coverage Width", 36, 48, 0.5, 12, "in")],
    results: [["panels", "Panels", "n"], ["panelLengthFt", "Panel Length (ft)", "n"], ["screws", "Screws (exposed fastener)", "n"], ["clips", "Clips (standing seam)", "n"], ["ridgeCapFt", "Ridge Cap (ft)", "n"], ["trimFt", "Eave & Rake Trim (ft)", "n"], ["minSlope", "Minimum Slope (x / 12)", "n"]],
    fn: E.metalRoof, ex: { type: 0, roofLength: 40, run: 14, sides: 2, panelWidth: 36 },
    exText: (o) => `Example: a 40 ft roof with 14 ft slopes needs ${o.panels} panels of ${o.panelLengthFt} ft (36 in coverage) and about ${n2(o.screws)} screws.`,
    how: "Measure each slope from eave to ridge and the length along the eave. Order panels cut to length (add 2 in overhang at the eave) and check the maker's screw pattern and minimum slope.",
    assume: "Exposed-fastener panels ≈ 80 screws per 100 sq ft; standing seam clips ≈ one per 2.5 sq ft. Minimum slopes: exposed fastener 3/12, snap-lock 3/12, mechanically seamed 1/2:12 (some products 1/4:12).",
    faq: [["What is the minimum slope for a metal roof?", "Usually 3/12 for exposed-fastener and snap-lock panels; 1/4–1/2:12 for mechanically seamed panels."]],
  }),
  mk({
    slug: "roof-tile-calculator", title: "Roof Tile Calculator (Tiles, Battens, Ridge & Membrane)",
    desc: "Calculate how many roof tiles you need — plain, concrete interlocking, pantiles or Double Roman — with battens, ridge tiles and underlay membrane in metres.",
    inputs: [dd("tile", "Tile Type", E.TILE_TYPES, 1), num("slopeLength", "Rafter Length (eave to ridge)", 5, 30, 0.1, 0.5, "m"), num("roofWidth", "Roof Width (along the eave)", 10, 100, 0.1, 1, "m"), num("sides", "Roof Slopes", 2, 4, 1, 1), num("ridgeLength", "Ridge Length", 10, 100, 0.1, 0, "m")],
    results: [["tiles", "Tiles Needed", "n"], ["roofAreaM2", "Roof Area (m²)", "n"], ["battenMetres", "Battens (m)", "n"], ["ridgeTiles", "Ridge Tiles", "n"], ["membraneM2", "Underlay Membrane (m²)", "n"]],
    fn: E.roofTile, ex: { tile: 1, slopeLength: 5, roofWidth: 10, sides: 2, ridgeLength: 10 },
    exText: (o) => `Example: a 10 m wide roof with 5 m rafters on both sides (${o.roofAreaM2} m²) needs about ${n2(o.tiles)} concrete interlocking tiles, ${o.battenMetres} m of battens and ${o.ridgeTiles} ridge tiles.`,
    how: "Measure the rafter length and roof width. Tiles per m² and batten gauge vary by product and pitch — check the manufacturer's data sheet, and order 5% extra for cuts and breakages.",
    assume: "Typical coverage: plain tiles 60/m² at 100 mm gauge, concrete interlocking 9.8/m² (345 mm), clay pantiles 16/m² (250 mm), Double Roman 9.6/m² (340 mm); ridge tiles 450 mm long.",
    faq: [["How many roof tiles per square metre?", "About 10 concrete interlocking tiles or 60 plain tiles."]],
  }),
  mk({
    slug: "slate-roof-calculator", title: "Slate Roof Calculator (Slates per Square & Cost)",
    desc: "Calculate a slate roof — slates per square from slate size and headlap, total slates with waste, weight and installed cost — and see the exposure.",
    inputs: [num("roofArea", "Roof Area", 2000, 100000, 10, 0, "sq ft"), dd("slateLength", "Slate Length", ["12 in", "14 in", "16 in", "18 in", "20 in", "24 in"], 3), num("slateWidth", "Slate Width (0 = half the length)", 0, 16, 0.5, 0, "in"), num("headlap", "Headlap", 3, 4, 0.5, 2, "in"), usd("costPerSquare", "Installed Cost per Square", 2000, 6000, 50)],
    results: [["slates", "Slates Needed (incl. 10%)", "n"], ["slatesPerSquare", "Slates per Square", "n"], ["exposureIn", "Exposure (in)", "n"], ["weightLb", "Roof Weight (lb)", "n"], ["cost", "Installed Cost", "c"]],
    fn: E.slateRoof, ex: { roofArea: 2000, slateLength: 3, slateWidth: 0, headlap: 3, costPerSquare: 2000 },
    exText: (o) => `Example: 18 × 9 in slates with a 3 in headlap have a ${o.exposureIn} in exposure — ${o.slatesPerSquare} slates per square, ${n2(o.slates)} for a 2,000 sq ft roof.`,
    how: "Exposure = (slate length − headlap) ÷ 2. Steeper roofs can use a smaller headlap (often 3 in); low slopes need 4 in. Slate roofs weigh 800–1,500 lb per square — check the framing.",
    assume: `Slates per square = 14,400 ÷ (exposure × width); weight ≈ 900 lb per square for 3/16–1/4 in slate. Installed cost often $1,500–3,000+ per square. ${COST_NOTE}`,
    faq: [["How many slates are in a square?", "About 160–230 for 18 in slates, depending on width and headlap."]],
  }),
  mk({
    slug: "flat-roof-material-calculator", title: "Flat Roof Material Calculator (EPDM & TPO)",
    desc: "Calculate EPDM or TPO membrane for a flat roof — sheet strips and square feet to order, bonding adhesive, seam tape, edge trim and insulation boards.",
    inputs: [num("length", "Roof Length", 30, 500, 0.5, 1, "ft"), num("width", "Roof Width", 20, 500, 0.5, 1, "ft"), dd("membrane", "Membrane", E.MEMBRANES)],
    results: [["membraneSqFt", "Membrane to Order (sq ft)", "n"], ["strips", "Sheets / Strips", "n"], ["adhesiveGallons", "Bonding Adhesive (gal)", "n"], ["seamTapeFt", "Seam Tape (ft)", "n"], ["edgeTrimFt", "Edge Trim (ft)", "n"], ["insulationBoards", "4 × 8 Insulation / Cover Boards", "n"]],
    fn: E.flatRoofMaterial, ex: { length: 30, width: 20, membrane: 1 },
    exText: (o) => `Example: a 30 × 20 ft flat roof can be covered in one 20 ft EPDM sheet — ${n2(o.membraneSqFt)} sq ft — with about ${o.adhesiveGallons} gallons of bonding adhesive.`,
    how: "Order the membrane in as few pieces as possible — every seam is a possible leak. Add about 6 in up each wall or over each edge. TPO is heat-welded; EPDM uses adhesive and seam tape.",
    assume: "Strips overlap 6 in; 1 ft extra length; bonding adhesive ≈ 65 sq ft per gallon applied to both surfaces.",
    faq: [["How much EPDM adhesive do I need?", "About 1 gallon per 60–75 sq ft of roof (both surfaces coated)."]],
  }),
  mk({
    slug: "flat-roof-slope-calculator", title: "Flat Roof Slope Calculator (Drainage Fall)",
    desc: "Calculate the fall a flat roof needs to drain — 1/4 in per foot minimum — the tapered insulation thickness at the high end, slope percent and angle.",
    inputs: [num("run", "Distance to the Drain or Gutter", 20, 200, 0.5, 1, "ft"), dd("slope", "Slope", ["1/4 in per ft (code minimum, new roofs)", "1/8 in per ft (some reroofs)", "1/2 in per ft (better drainage)"]), num("minThickness", "Thinnest Insulation at the Drain", 0.5, 4, 0.25, 0, "in")],
    results: [["fallIn", "Total Fall (in)", "n"], ["highEndThicknessIn", "Taper at the High End (in)", "n"], ["slopePercent", "Slope (%)", "n"], ["angleDeg", "Angle (°)", "n"]],
    fn: E.flatRoofSlope, ex: { run: 20, slope: 0, minThickness: 0.5 },
    exText: (o) => `Example: 20 ft to the gutter at 1/4 in per ft needs ${o.fallIn} in of fall — tapered insulation from 0.5 to ${o.highEndThicknessIn} in.`,
    how: "\"Flat\" roofs still need a slope so water doesn't pond. The IRC and IBC require at least 1/4 in per ft (2%) for most low-slope roofs.",
    assume: "Fall = run × slope per ft. Crickets behind chimneys and between drains add extra taper.",
    faq: [["What is the minimum slope for a flat roof?", "1/4 in per foot (2%)."]],
  }),
  mk({
    slug: "attic-ventilation-calculator", title: "Attic Ventilation Calculator (Intake & Exhaust NFA)",
    desc: "Calculate attic ventilation — net free area (NFA) for intake and exhaust by the 1/150 or 1/300 rule — and how many feet of ridge vent, box vents and soffit vents you need.",
    meta: "Attic Ventilation Calculator — Ridge, Soffit & Box Vents",
    inputs: [num("atticArea", "Attic Floor Area", 1500, 100000, 10, 0, "sq ft"), dd("ratio", "Rule", ["1/150 (standard)", "1/300 (balanced, with vapor retarder)"], 1), pct("intakeShare", "Share as Intake", 50, 70, 5), num("ridgeNfa", "Ridge Vent NFA per Ft", 18, 30, 0.5, 1, "sq in"), num("boxNfa", "Box Vent NFA Each", 50, 150, 1, 1, "sq in"), num("soffitNfa", "Soffit Vent NFA Each", 56, 150, 1, 1, "sq in")],
    results: [["totalNfaSqIn", "Total Ventilation NFA (sq in)", "n"], ["intakeSqIn", "Intake NFA (sq in)", "n"], ["exhaustSqIn", "Exhaust NFA (sq in)", "n"], ["ridgeVentFt", "Ridge Vent Needed (ft)", "n"], ["boxVents", "Or Box Vents", "n"], ["soffitVents", "Individual Soffit Vents", "n"], ["continuousSoffitFt", "Or Continuous Soffit Vent (ft)", "n"]],
    fn: E.atticVentilation, ex: { atticArea: 1500, ratio: 1, intakeShare: 50, ridgeNfa: 18, boxNfa: 50, soffitNfa: 56 },
    exText: (o) => `Example: a 1,500 sq ft attic at 1/300 needs ${o.totalNfaSqIn} sq in of NFA — ${o.ridgeVentFt} ft of ridge vent for exhaust and about ${o.continuousSoffitFt} ft of continuous soffit vent for intake.`,
    how: "Find NFA on the vent's packaging (GAF, Owens Corning, Lomanco and CertainTeed all publish it). Balance intake and exhaust — at least half should be low intake — and don't mix ridge vents with gable or box vents on the same roof.",
    assume: "IRC R806.2: 1 sq ft NFA per 150 sq ft of attic floor, or 1/300 when 40–50% is high exhaust (or a vapor retarder is used in cold climates). Continuous soffit vent ≈ 9 sq in per ft.",
    faq: [["How many roof vents do I need?", "About 1 sq ft of net free area per 300 sq ft of attic, split between intake and exhaust."]],
  }),
  mk({
    slug: "soffit-calculator", title: "Soffit Calculator (Panels & J-Channel)",
    desc: "Calculate vinyl or aluminum soffit panels from eave length and overhang depth — with J- or F-channel and how many panels should be vented.",
    inputs: [num("eaveLength", "Total Eave Length", 150, 10000, 1, 0, "ft"), num("overhang", "Soffit Depth (overhang)", 16, 48, 1, 4, "in"), dd("panel", "Panel Size", ["12 in × 12 ft (12 sq ft)", "16 in × 12 ft (16 sq ft)"]), pct("ventedShare", "Share Vented", 50, 100, 5)],
    results: [["panels", "Soffit Panels", "n"], ["sqFt", "Soffit Area (sq ft)", "n"], ["channelFt", "J / F-Channel (ft)", "n"], ["ventedPanels", "Vented Panels", "n"]],
    fn: E.soffit, ex: { eaveLength: 150, overhang: 16, panel: 0, ventedShare: 50 },
    exText: (o) => `Example: 150 ft of 16 in soffit is ${o.sqFt} sq ft — ${o.panels} panels of 12 sq ft with 10% extra and ${o.channelFt} ft of channel.`,
    how: "Measure all eaves and the overhang depth. Use vented panels where the attic needs intake ventilation (see the attic ventilation calculator).",
    assume: "10% extra panels for cuts; channel on both edges of the soffit.",
    faq: [["How many soffit panels do I need?", "Soffit area ÷ panel coverage (12–16 sq ft each), plus about 10%."]],
  }),
  mk({
    slug: "gutter-calculator", title: "Gutter Calculator (Feet, Downspouts, Hangers & Slope)",
    desc: "Plan a gutter install — gutter feet, downspouts and downspout length, hangers, end caps, elbows and the slope drop per run.",
    inputs: [num("gutterFeet", "Total Gutter Length", 120, 10000, 1, 0, "ft"), num("runs", "Separate Gutter Runs", 4, 50, 1, 1), num("wallHeight", "Eave Height", 10, 40, 1, 6, "ft")],
    results: [["gutterFeet", "Gutter to Order (ft)", "n"], ["downspouts", "Downspouts", "n"], ["downspoutFeet", "Downspout Pipe (ft)", "n"], ["hangers", "Hangers (every 2 ft)", "n"], ["endCaps", "End Caps", "n"], ["elbows", "Elbows", "n"], ["totalDropIn", "Slope Drop per Run (in)", "n"]],
    fn: E.gutter, ex: { gutterFeet: 120, runs: 4, wallHeight: 10 },
    exText: (o) => `Example: 120 ft of gutter in four runs needs ${o.downspouts} downspouts, ${o.hangers} hangers and a slope of about ${o.totalDropIn} in per run.`,
    how: "Slope gutters 1/4 in per 10 ft toward each downspout, with a downspout every 30–40 ft and at least one per run. Use hidden hangers every 2 ft (every 16 in in snow country).",
    assume: "5% extra gutter; three elbows per downspout; 2 ft extra per downspout for extensions.",
    faq: [["How much slope do gutters need?", "About 1/4 in per 10 ft (some installers use 1/2 in)."]],
  }),
  mk({
    slug: "gutter-size-calculator", title: "Gutter & Downspout Size Calculator",
    desc: "Find the gutter size (5 in or 6 in K-style) and how many 2×3 or 3×4 downspouts a roof section needs — from the roof area, pitch and rainfall intensity.",
    inputs: [num("roofArea", "Roof Area Draining to One Gutter Run", 600, 100000, 10, 0, "sq ft"), dd("pitch", "Roof Pitch", ["Flat to 3/12", "4/12–5/12", "6/12–8/12", "9/12–11/12", "12/12 or steeper"], 2), num("intensity", "Rainfall Intensity", 6, 15, 0.5, 1, "in/hr")],
    results: [["gutterSize", "Gutter Size", "l", E.GUTTER_SIZES], ["effectiveArea", "Effective Drainage Area (sq ft)", "n"], ["downspouts2x3", "2 × 3 in Downspouts", "n"], ["downspouts3x4", "Or 3 × 4 in Downspouts", "n"]],
    fn: E.gutterSize, ex: { roofArea: 600, pitch: 2, intensity: 6 },
    exText: (o) => `Example: 600 sq ft of 6/12 roof in a 6 in/hr storm needs a ${E.GUTTER_SIZES[o.gutterSize]} gutter and ${o.downspouts2x3} downspout(s) of 2 × 3 in.`,
    how: "Use the 5-minute, 100-year rainfall intensity for your area (from NOAA Atlas 14 or local code). Steeper roofs shed water faster, so they count as more area.",
    assume: "Capacity at 1 in/hr: 5 in K-style ≈ 5,520 sq ft, 6 in ≈ 7,960 sq ft (SMACNA-based tables); downspouts 2 × 3 ≈ 3,600 and 3 × 4 ≈ 7,200 sq ft·in/hr; pitch factors 1.0–1.3.",
    faq: [["Should I get 5 inch or 6 inch gutters?", "6 in gutters for large or steep roofs and heavy-rain areas; 5 in is standard for most homes."]],
  }),
  mk({
    slug: "snow-guard-calculator", title: "Snow Guard Calculator (Rows & Spacing)",
    desc: "Estimate how many snow guards you need — rows and guards per row — for a metal, shingle or tile roof from the eave length, slope length and snow load.",
    inputs: [num("eaveLength", "Eave Length", 40, 1000, 0.5, 1, "ft"), num("slopeLength", "Slope Length (eave to ridge)", 16, 60, 0.5, 1, "ft"), num("groundSnow", "Ground Snow Load", 30, 200, 5, 0, "psf"), dd("roof", "Roof Type", ["Metal standing seam", "Asphalt shingles", "Tile or slate"])],
    results: [["guards", "Snow Guards", "n"], ["rows", "Rows", "n"], ["perRow", "Guards per Row", "n"], ["spacingIn", "Spacing Along the Row (in)", "n"]],
    fn: E.snowGuard, ex: { eaveLength: 40, slopeLength: 16, groundSnow: 30, roof: 0 },
    exText: (o) => `Example: a 40 ft metal roof with 16 ft slopes in a 30 psf area needs about ${o.guards} snow guards in ${o.rows} row(s).`,
    how: "Put the first row just above the exterior wall line. Long slopes and heavy snow need extra rows higher up. Manufacturers (e.g. S-5!, Alpine) publish layout calculators for their products — use them for warranties.",
    assume: "Rule of thumb: one row up to 20 ft and 30 psf, two up to 30 ft / 60 psf, three beyond. Spacing: 24 in (metal), 18 in (shingle), 12 in (tile/slate).",
    faq: [["How far apart should snow guards be?", "Usually 18–24 in along each row, more rows on long or heavy-snow roofs."]],
  }),
  mk({
    slug: "metal-roof-cost-calculator", title: "Metal Roof Cost Calculator (Standing Seam & Corrugated)",
    desc: "Estimate the cost of a metal roof — exposed-fastener steel, standing seam steel or aluminum, metal shingles, copper or zinc — with tear-off, per square and per sq ft.",
    inputs: [num("roofArea", "Roof Area", 2000, 100000, 10, 0, "sq ft"), dd("type", "Metal Roof Type", E.METAL_ROOF_TYPES, 1), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 100, 0.25), dd("tearOff", "Tear Off Old Roof?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSquare", "Cost per Square", "c"]],
    fn: E.metalRoofCost, ex: { roofArea: 2000, type: 1, customRate: 0, tearOff: 1 },
    exText: (o) => `Example: a 2,000 sq ft standing seam steel roof with tear-off costs about ${money(o.totalCost)} (${money(o.costLow)}–${money(o.costHigh)}).`,
    how: "Enter the roof area (not the house floor area) and the panel type. Standing seam costs more but has hidden fasteners and lasts 40–70 years.",
    assume: `Typical installed prices per sq ft: exposed-fastener $9, standing seam steel $14, aluminum $17, metal shingles $12, copper/zinc $30; tear-off $1.50. ${COST_NOTE}`,
    faq: [["How much does a standing seam metal roof cost?", "About $12–18 per sq ft installed — $24,000–36,000 for 2,000 sq ft."]],
  }),
  mk({
    slug: "flat-roof-cost-calculator", title: "Flat Roof Cost Calculator (EPDM, TPO & Modified Bitumen)",
    desc: "Estimate the cost of a flat roof replacement — EPDM rubber, TPO, PVC, modified bitumen, built-up or a coating — with tear-off and insulation.",
    inputs: [num("area", "Roof Area", 1000, 100000, 10, 0, "sq ft"), dd("type", "Roofing System", E.FLAT_ROOF_TYPES), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 50, 0.25), dd("tearOff", "Tear Off Old Roof?", ["No", "Yes"], 1), dd("insulation", "New Insulation?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.flatRoofCost, ex: { area: 1000, type: 0, customRate: 0, tearOff: 1, insulation: 0 },
    exText: (o) => `Example: a 1,000 sq ft EPDM flat roof with tear-off costs about ${money(o.totalCost)}.`,
    how: "Enter the roof area and system. Rotten decking and new tapered insulation add cost; ask for the membrane thickness (60 mil is a good standard).",
    assume: `Typical installed prices per sq ft: EPDM $8, TPO $9, PVC $11, modified bitumen $7, built-up $8, coating $5; tear-off $1.50, insulation $2; $1,500 minimum. ${COST_NOTE}`,
    faq: [["How much does a rubber roof cost?", "About $6–12 per sq ft installed."]],
  }),
  mk({
    slug: "commercial-roof-cost-calculator", title: "Commercial Roof Cost Calculator (TPO, EPDM, PVC & Metal)",
    desc: "Estimate a commercial roof replacement — TPO, EPDM, PVC, modified bitumen, built-up, standing seam metal, spray foam or coating restoration — with tear-off and insulation.",
    inputs: [num("area", "Roof Area", 20000, 10000000, 100, 0, "sq ft"), dd("system", "Roofing System", E.COMMERCIAL_SYSTEMS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 50, 0.25), dd("tearOff", "Tear Off Existing?", ["No", "Yes"], 1), dd("insulation", "New ISO Insulation?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Cost per Sq Ft", "c"]],
    fn: E.commercialRoofCost, ex: { area: 20000, system: 0, customRate: 0, tearOff: 1, insulation: 1 },
    exText: (o) => `Example: a 20,000 sq ft TPO roof with tear-off and new insulation costs about ${money(o.totalCost)}.`,
    how: "Enter the roof area and system. Commercial pricing depends heavily on access, rooftop units, edge details, warranty length and whether the deck needs repairs.",
    assume: `Typical prices per sq ft: TPO $8, EPDM $7.50, PVC $10, mod-bit $7, BUR $8, standing seam $14, spray foam $6, coating $4; tear-off $2; ISO insulation $2.50. ${COST_NOTE}`,
    faq: [["How much does a commercial TPO roof cost?", "About $7–12 per sq ft installed, more with tear-off and insulation."]],
  }),
  mk({
    slug: "solar-roof-cost-calculator", title: "Solar Roof Cost Calculator (Solar Shingles)",
    desc: "Estimate the cost of a solar shingle roof (such as Tesla Solar Roof) — active solar tiles and plain tiles, tear-off and batteries — with system size, yearly output and cost per watt.",
    inputs: [num("roofArea", "Roof Area", 2000, 100000, 10, 0, "sq ft"), pct("activeShare", "Share of Roof as Solar Tiles", 40, 100, 5), usd("activeRate", "Solar Tile Cost per Sq Ft", 42, 100, 0.5), usd("inactiveRate", "Plain Tile Cost per Sq Ft", 14, 50, 0.5), dd("tearOff", "Tear Off Old Roof?", ["No", "Yes"], 1), usd("battery", "Battery / Powerwall", 0, 100000, 100), pct("taxCredit", "Tax Credit / Incentives", 0, 50, 1), num("kwhPerKw", "Yearly kWh per kW", 1300, 2000, 10, 800)],
    results: [["netCost", "Net Cost", "c"], ["grossCost", "Gross Cost", "c"], ["systemKw", "Solar System Size (kW)", "n"], ["annualKwh", "Yearly Output (kWh)", "n"], ["costPerWatt", "Net Cost per Watt", "c"]],
    fn: E.solarRoofCost, ex: { roofArea: 2000, activeShare: 40, activeRate: 42, inactiveRate: 14, tearOff: 1, battery: 0, taxCredit: 0, kwhPerKw: 1300 },
    exText: (o) => `Example: a 2,000 sq ft roof with 40% solar tiles is about a ${o.systemKw} kW system costing ${money(o.netCost)} — roughly $${o.costPerWatt.toFixed(2)} per watt.`,
    how: "Solar roofs replace the whole roof, so compare them with a new roof plus panels. Use your installer's design for the share of active tiles and expected output.",
    assume: `Active tiles ≈ 15 W per sq ft; typical prices $35–50 per sq ft for solar tiles and $12–16 for plain tiles. The federal 30% residential clean energy credit (25D) ended for systems installed after 31 Dec 2025 — enter any state or utility incentive you still qualify for. ${COST_NOTE}`,
    faq: [["How much does a Tesla Solar Roof cost?", "Often $60,000–120,000+ for a typical home, depending on roof size and complexity."]],
  }),
  mk({
    slug: "roof-coating-cost-calculator", title: "Roof Coating & Rejuvenation Cost Calculator (Roof Maxx, Silicone)",
    desc: "Estimate the cost of a roof coating or rejuvenation — asphalt rejuvenation (e.g. Roof Maxx), silicone, acrylic or elastomeric coatings, or spray foam — per sq ft.",
    inputs: [num("area", "Roof Area", 2000, 1000000, 10, 0, "sq ft"), dd("type", "Treatment", E.COATING_TYPES), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 20, 0.05)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSqFt", "Price per Sq Ft Used", "c"]],
    fn: E.roofCoatingCost, ex: { area: 2000, type: 0, customRate: 0 },
    exText: (o) => `Example: rejuvenating a 2,000 sq ft shingle roof costs about ${money(o.totalCost)}.`,
    how: "Coatings extend the life of a roof that is still sound — they don't fix leaks from failed flashing, soft decking or missing shingles.",
    assume: `Typical prices per sq ft: shingle rejuvenation ≈ $1, silicone $3, acrylic $2.50, elastomeric $2, spray foam + coating $5; $500 minimum. ${COST_NOTE}`,
    faq: [["Is roof coating worth it?", "On flat and low-slope roofs in good condition, a coating can add 10–15 years for a fraction of replacement cost."]],
  }),
  mk({
    slug: "roof-paint-calculator", title: "Roof Paint Calculator (Gallons & Cost)",
    desc: "Calculate how much roof paint or coating you need — gallons and 5-gallon buckets for elastomeric, acrylic or silicone — with material cost and a pro price.",
    inputs: [num("area", "Roof Area", 1500, 1000000, 10, 0, "sq ft"), num("coats", "Coats", 2, 3, 1, 1), dd("product", "Product", E.ROOF_PAINTS), usd("bucketPrice", "Price per 5-Gallon Bucket", 150, 1000, 1), usd("proRate", "Pro Price per Sq Ft", 2, 10, 0.05)],
    results: [["gallons", "Gallons Needed", "n"], ["buckets5gal", "5-Gallon Buckets", "n"], ["materialCost", "Material Cost (DIY)", "c"], ["proCost", "Professional Cost", "c"]],
    fn: E.roofPaint, ex: { area: 1500, coats: 2, product: 0, bucketPrice: 150, proRate: 2 },
    exText: (o) => `Example: two coats of elastomeric coating on a 1,500 sq ft roof take about ${o.gallons} gallons — ${o.buckets5gal} buckets.`,
    how: "Clean and prime the roof first. Elastomeric and silicone coatings go on thick (about 1–1.5 gal per 100 sq ft per coat); acrylic roof paints cover more.",
    assume: "Coverage per coat: elastomeric ≈ 100 sq ft/gal, acrylic roof paint ≈ 250, silicone ≈ 100; plus 5%.",
    faq: [["How much does a gallon of roof coating cover?", "About 100 sq ft per coat for elastomeric or silicone."]],
  }),
  mk({
    slug: "roof-cleaning-cost-calculator", title: "Roof Cleaning Cost Calculator (Soft Wash & Moss Removal)",
    desc: "Estimate the cost of roof cleaning — soft washing, moss removal and treatment, or pressure cleaning tile and metal — by roof area and height.",
    inputs: [num("area", "Roof Area", 2000, 100000, 10, 0, "sq ft"), dd("method", "Method", ["Soft wash (algae streaks)", "Moss removal + treatment", "Low-pressure wash (tile / metal)"]), dd("stories", "Height", STORIES)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.roofCleaningCost, ex: { area: 2000, method: 0, stories: 0 },
    exText: (o) => `Example: soft-washing a 2,000 sq ft single-story roof costs about ${money(o.totalCost)}.`,
    how: "Don't pressure-wash asphalt shingles — it strips granules. Soft washing with a bleach-based cleaner kills algae; zinc or copper strips near the ridge slow regrowth.",
    assume: `Typical prices per sq ft: soft wash $0.35, moss removal $0.60, low-pressure wash $0.30; two stories +15%, three +30%; $300 minimum. ${COST_NOTE}`,
    faq: [["How much does roof cleaning cost?", "Usually $300–800 for an average roof."]],
  }),
  mk({
    slug: "roof-tear-off-cost-calculator", title: "Roof Tear-Off Cost Calculator (Removal & Disposal)",
    desc: "Estimate the cost to tear off an old roof — labor per square per layer, disposal by the ton and dumpsters — for asphalt shingles, shakes, tile or slate.",
    inputs: [num("squares", "Roof Squares", 20, 1000, 0.5, 0), num("layers", "Layers", 1, 3, 1, 1), dd("material", "Material", ["Asphalt shingles", "Wood shakes", "Tile", "Slate"]), usd("laborPerSquare", "Labor per Square per Layer", 100, 500, 5), usd("disposalPerTon", "Disposal per Ton", 60, 300, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["debrisTons", "Debris (tons)", "n"], ["dumpsters20yd", "20-Yard Dumpsters", "n"]],
    fn: E.roofTearOffCost, ex: { squares: 20, layers: 1, material: 0, laborPerSquare: 100, disposalPerTon: 60 },
    exText: (o) => `Example: tearing off one layer of shingles from a 20-square roof costs about ${money(o.totalCost)} and produces ${o.debrisTons} tons of debris.`,
    how: "Enter the roof size and layers. Most codes allow only two layers, and a tear-off lets the roofer inspect and repair the decking.",
    assume: `Debris per square per layer: shingles 230 lb, shakes 350, tile 950, slate 900. Tile and slate removal +60%. ${COST_NOTE}`,
    faq: [["How much does a roof tear-off cost?", "About $1–2 per sq ft per layer for shingles, including disposal."]],
  }),
  mk({
    slug: "roofing-labor-cost-calculator", title: "Roofing Labor Cost per Square Calculator",
    desc: "Estimate roofing labor — price per square adjusted for roof steepness and height — plus tear-off layers, with labor per square and a low/high range.",
    inputs: [num("squares", "Roof Squares", 20, 1000, 0.5, 0), usd("ratePerSquare", "Base Labor per Square", 150, 1000, 5), dd("steepness", "Steepness", ["Walkable (up to 6/12)", "Steep (7/12–9/12)", "Very steep (10/12+)"]), dd("stories", "Height", STORIES), num("tearOffLayers", "Tear-Off Layers", 1, 3, 1, 0)],
    results: [["laborCost", "Labor Cost", "c"], ["perSquare", "Labor per Square", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.roofingLaborCost, ex: { squares: 20, ratePerSquare: 150, steepness: 0, stories: 0, tearOffLayers: 1 },
    exText: (o) => `Example: installing 20 squares of shingles with one tear-off layer costs about ${money(o.laborCost)} in labor — ${money(o.perSquare)} per square.`,
    how: "Labor is often 40–60% of a roof job. Steep, tall or cut-up roofs (many valleys, dormers or skylights) take longer.",
    assume: `Typical asphalt labor $100–250 per square; steep roofs +15–30%; two stories +15%; tear-off ≈ $50 per square per layer. ${COST_NOTE}`,
    faq: [["How much do roofers charge per square for labor?", "About $100–250 per square for asphalt shingles."]],
  }),
  mk({
    slug: "roof-repair-cost-calculator", title: "Roof Repair Cost Calculator",
    desc: "Estimate roof repair costs — replacing shingles, leaks, flashing, valleys, chimney flashing, skylights or structural sag — by roof type and height.",
    inputs: [dd("repair", "Repair", E.REPAIRS, 1), num("quantity", "Number of Repairs / Areas", 1, 50, 1, 1), dd("roof", "Roof Type", ["Asphalt shingles", "Metal", "Tile", "Slate"]), dd("stories", "Height", STORIES)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.roofRepairCost, ex: { repair: 1, quantity: 1, roof: 0, stories: 0 },
    exText: (o) => `Example: a typical leak repair on a one-story shingle roof costs about ${money(o.totalCost)}.`,
    how: "Pick the repair. If the roof is near the end of its life or has several problems, compare the repair total with a replacement quote.",
    assume: `Typical prices: shingle patch $300, leak repair $450, flashing $500, valley $650, chimney flashing $700, skylight reflash $550, structural $2,500+; metal ×1.2, tile ×1.5, slate ×2. ${COST_NOTE}`,
    faq: [["How much does it cost to fix a roof leak?", "Usually $300–1,000 for a simple repair."]],
  }),
  mk({
    slug: "gutter-cleaning-cost-calculator", title: "Gutter Cleaning Cost Calculator",
    desc: "Estimate the cost of gutter cleaning — per linear foot by height, with gutter guards and downspout flushing — and the yearly cost at your cleaning frequency.",
    inputs: [num("feet", "Gutter Length", 150, 5000, 1, 0, "ft"), usd("ratePerFoot", "Price per Foot", 1, 5, 0.05), dd("stories", "Height", STORIES), dd("guards", "Gutter Guards Installed?", ["No", "Yes"]), num("downspouts", "Downspouts to Flush", 4, 50, 1), num("timesPerYear", "Cleanings per Year", 2, 4, 1, 1)],
    results: [["totalCost", "Cost per Cleaning", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["yearlyCost", "Yearly Cost", "c"]],
    fn: E.gutterCleaningCost, ex: { feet: 150, ratePerFoot: 1, stories: 0, guards: 0, downspouts: 4, timesPerYear: 2 },
    exText: (o) => `Example: cleaning 150 ft of single-story gutters and flushing four downspouts costs about ${money(o.totalCost)} — ${money(o.yearlyCost)} a year twice a year.`,
    how: "Clean gutters at least in late spring and late fall (more under pine trees). Guards cut cleanings but most still need an occasional rinse.",
    assume: `Typical price $0.70–1.50 per ft for one story; two stories +15%, three +30%; guards add about 50% (removal); $100 minimum. ${COST_NOTE}`,
    faq: [["How much does gutter cleaning cost?", "About $100–250 for a single-story home."]],
  }),
  mk({
    slug: "soffit-fascia-cost-calculator", title: "Soffit & Fascia Cost Calculator",
    desc: "Estimate the cost to replace soffit and fascia — vinyl, aluminum, wood or composite — per linear foot, by house height.",
    inputs: [num("soffitFeet", "Soffit Length", 150, 5000, 1, 0, "ft"), dd("soffitMat", "Soffit Material", ["Vinyl", "Aluminum", "Wood"]), num("fasciaFeet", "Fascia Length", 150, 5000, 1, 0, "ft"), dd("fasciaMat", "Fascia Material", ["Aluminum wrap / vinyl", "Wood", "Composite / PVC"]), dd("stories", "Height", STORIES)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["soffitCost", "Soffit", "c"], ["fasciaCost", "Fascia", "c"]],
    fn: E.soffitFasciaCost, ex: { soffitFeet: 150, soffitMat: 0, fasciaFeet: 150, fasciaMat: 0, stories: 0 },
    exText: (o) => `Example: replacing 150 ft each of vinyl soffit and wrapped fascia on a one-story home costs about ${money(o.totalCost)}.`,
    how: "Enter the lengths and materials. Rotten rafter tails or sub-fascia behind the boards add cost once they're exposed.",
    assume: `Typical installed prices per ft: soffit vinyl $7, aluminum $9, wood $14; fascia wrap $6, wood $9, composite $12; two stories +15%. ${COST_NOTE}`,
    faq: [["How much does soffit and fascia replacement cost?", "About $15–25 per linear foot for both together."]],
  }),
  mk({
    slug: "dormer-cost-calculator", title: "Dormer Cost Calculator",
    desc: "Estimate the cost to add a dormer — gable (doghouse), shed, hip or eyebrow — with optional interior finishing, per dormer and in total.",
    inputs: [dd("type", "Dormer Type", E.DORMERS), num("count", "Number of Dormers", 1, 10, 1, 1), num("width", "Width (shed dormers)", 12, 40, 1, 4, "ft"), dd("finish", "Finish the Interior?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perDormer", "Per Dormer", "c"]],
    fn: E.dormerCost, ex: { type: 0, count: 1, width: 12, finish: 1 },
    exText: (o) => `Example: adding one gable dormer with interior finishing costs about ${money(o.totalCost)}.`,
    how: "Shed dormers add the most headroom per dollar; gable and hip dormers mainly add light and curb appeal. Structural work and permits are needed.",
    assume: `Typical prices: gable $15,000, shed $2,500 per ft of width, hip $18,000, eyebrow $20,000; interior finishing ≈ $5,000. ${COST_NOTE}`,
    faq: [["How much does it cost to add a dormer?", "About $10,000–25,000 for a gable dormer and $20,000–50,000 for a large shed dormer."]],
  }),
  mk({
    slug: "roof-depreciation-calculator", title: "Roof Depreciation Calculator (Insurance ACV)",
    desc: "Estimate roof depreciation for an insurance claim — actual cash value (ACV) from the roof's age, expected life and replacement cost — plus remaining life.",
    inputs: [num("age", "Roof Age", 10, 100, 1, 0, "years"), dd("type", "Roof Type", E.LIFE_TYPES, 1), num("customLife", "Expected Life Override (0 = typical)", 0, 100, 1, 0, "years"), usd("replacementCost", "Replacement Cost (RCV)", 15000, 1000000, 100)],
    results: [["actualCashValue", "Actual Cash Value (ACV)", "c"], ["depreciationPercent", "Depreciation (%)", "n"], ["depreciationAmount", "Depreciation", "c"], ["remainingLifeYears", "Remaining Life (years)", "n"], ["lifeYears", "Expected Life (years)", "n"]],
    fn: E.roofDepreciation, ex: { age: 10, type: 1, customLife: 0, replacementCost: 15000 },
    exText: (o) => `Example: a 10-year-old architectural shingle roof with a $15,000 replacement cost has depreciated ${o.depreciationPercent}% — an ACV of ${money(o.actualCashValue)}.`,
    how: "Check whether your policy pays replacement cost (RCV) or actual cash value (ACV) for roofs — many now pay ACV on older roofs, and the depreciation comes off the claim before the deductible.",
    assume: "Straight-line depreciation over a typical life (3-tab 20 yr, architectural 25, metal and tile 50, slate 75, flat 20). Insurers use their own schedules and condition adjustments.",
    faq: [["How do insurance companies depreciate a roof?", "Usually straight-line by age over its expected life, adjusted for condition."]],
  }),
  mk({
    slug: "florida-roof-cost-calculator", title: "Florida Roof Replacement Cost Calculator",
    desc: "Estimate a roof replacement in Florida — shingles, metal, concrete or clay tile, or flat — with High-Velocity Hurricane Zone (Miami-Dade/Broward) rules, a secondary water barrier and permits.",
    inputs: [num("roofArea", "Roof Area", 2200, 100000, 10, 0, "sq ft"), dd("material", "Roofing", E.REGIONAL_MATERIALS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 50, 0.25), dd("hvhz", "In the HVHZ (Miami-Dade / Broward)?", ["No", "Yes"]), dd("secondaryBarrier", "Add Secondary Water Barrier?", ["No", "Yes"], 1), usd("permit", "Permit & Inspections", 500, 5000, 25)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSquare", "Cost per Square", "c"]],
    fn: E.floridaRoofCost, ex: { roofArea: 2200, material: 0, customRate: 0, hvhz: 0, secondaryBarrier: 1, permit: 500 },
    exText: (o) => `Example: a 2,200 sq ft architectural shingle reroof in Florida with a sealed roof deck costs about ${money(o.totalCost)}.`,
    how: "Florida roofs must meet the Florida Building Code's wind rules. A wind-mitigation inspection after the new roof can cut insurance premiums. If less than 25% of a roof is damaged and it was built to the 2007 code or later, Florida law no longer forces a full replacement.",
    assume: `Typical installed prices per sq ft: shingles $6, metal $14, concrete tile $13, clay tile $18, flat $9; HVHZ adds about $1.20 and a secondary water barrier $0.60 per sq ft. ${COST_NOTE}`,
    faq: [["How much does a new roof cost in Florida?", "Roughly $12,000–25,000 for shingles on an average house, and $25,000–50,000+ for tile or metal."]],
  }),
  mk({
    slug: "austin-roof-cost-calculator", title: "Austin Roof Replacement Cost Calculator",
    desc: "Estimate a roof replacement in Austin, Texas — shingles, metal, tile or flat — with impact-resistant Class 4 shingles for hail, an extra tear-off layer and permit.",
    inputs: [num("roofArea", "Roof Area", 2400, 100000, 10, 0, "sq ft"), dd("material", "Roofing", E.REGIONAL_MATERIALS), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 50, 0.25), dd("class4", "Class 4 Impact-Resistant Shingles?", ["No", "Yes"], 1), dd("tearOff2", "Second Layer to Remove?", ["No", "Yes"]), usd("permit", "Permit", 400, 5000, 25)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["costPerSquare", "Cost per Square", "c"]],
    fn: E.austinRoofCost, ex: { roofArea: 2400, material: 0, customRate: 0, class4: 1, tearOff2: 0, permit: 400 },
    exText: (o) => `Example: a 2,400 sq ft Class 4 shingle roof in Austin costs about ${money(o.totalCost)}.`,
    how: "Central Texas hail makes impact-resistant (UL 2218 Class 4) shingles popular — many Texas insurers give a premium discount for them. Ask whether your quote includes decking repairs and new flashing.",
    assume: `Typical Austin-area installed prices per sq ft: shingles $5.50, metal $13, concrete tile $12, clay tile $17, flat $9; Class 4 upgrade ≈ $0.75; extra layer $0.50. ${COST_NOTE}`,
    faq: [["How much does a roof cost in Austin?", "About $11,000–20,000 for an average shingle roof, more for metal or tile."]],
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
