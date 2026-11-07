// One-time (but safe to re-run) batch setup script: creates 37 calculators in House & Garden
// Calculators > Deck, Fence & Stair Calculators (stairs, stringers, deck structure, fences, railings, gates, pergolas and outdoor-structure costs). Formulas live in src/lib/calc-engine-hg-deck.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-deck-calculators.ts
// or
//   npm run db:create-hg-deck-calculators

import * as E from "../src/lib/calc-engine-hg-deck";

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

const CAT = "deck-fence-stair-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US installed costs and vary by region and site — get local quotes.";
const FLEN = num("length", "Fence Length", 150, 100000, 1, 0, "ft");
const HEIGHT3 = dd("height", "Fence Height", ["4 ft", "5 ft", "6 ft"], 2);
const GATES = [num("walkGates", "Walk Gates", 1, 20, 1), num("driveGates", "Double / Drive Gates", 0, 10, 1), dd("removal", "Remove Old Fence?", ["No", "Yes"])];
const COSTRES: Line[] = [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perFoot", "Cost per Foot", "c"]];

const TOOLS: ToolDef[] = [
  mk({
    slug: "stair-calculator", title: "Stair Calculator (Rise, Run, Steps & Angle)",
    desc: "Calculate stairs from the total rise — number of risers and treads, exact riser height, total run, stair angle and the 2R + T comfort check — to IRC limits.",
    meta: "Stair Calculator — Rise and Run, Number of Steps & Angle",
    inputs: [num("totalRise", "Total Rise (floor to floor)", 108, 300, 0.25, 6, "in"), num("targetRiser", "Target Riser Height", 7.5, 7.75, 0.125, 4, "in"), num("tread", "Tread Depth (run)", 10.5, 14, 0.125, 9, "in")],
    results: [["risers", "Risers (steps)", "n"], ["riserHeight", "Riser Height (in)", "n"], ["treads", "Treads", "n"], ["totalRun", "Total Run (in)", "n"], ["angleDeg", "Stair Angle (°)", "n"], ["comfort", "Comfort Check", "l", E.STAIR_COMFORT], ["twoRPlusT", "2R + T (in)", "n"]],
    fn: E.stair, ex: { totalRise: 108, targetRiser: 7.5, tread: 10.5 },
    exText: (o) => `Example: a 108 in floor-to-floor rise needs ${o.risers} risers of ${o.riserHeight} in and ${o.treads} treads of 10.5 in — ${o.totalRun} in of run at ${o.angleDeg}°.`,
    how: "Measure the total rise from finished floor to finished floor. The calculator rounds up to equal risers no taller than your target. The IRC allows risers up to 7¾ in and treads of at least 10 in (plus a nosing).",
    assume: "Risers = rise ÷ target riser (rounded up); treads = risers − 1; comfort rule 2R + T ≈ 24–25.5 in. Also check 6 ft 8 in headroom and 36 in minimum width.",
    faq: [["How many steps for a 9 ft ceiling?", "A 108 in rise needs 15 risers of 7.2 in."], ["What is the maximum riser height?", "7¾ in under the IRC."]],
  }),
  mk({
    slug: "stair-stringer-calculator", title: "Stair Stringer Calculator (Layout, Length & Throat)",
    desc: "Lay out stair stringers — risers, treads, exact riser height, total run, stringer length, board to buy, number of stringers and the remaining throat depth.",
    inputs: [num("totalRise", "Total Rise", 54, 300, 0.25, 6, "in"), num("tread", "Tread Depth", 10, 14, 0.125, 9, "in"), num("boardDepth", "Stringer Board Depth (2×12 = 11.25)", 11.25, 14, 0.25, 7, "in"), num("stairWidth", "Stair Width", 36, 120, 1, 24, "in")],
    results: [["risers", "Risers", "n"], ["riserHeight", "Riser Height (in)", "n"], ["treads", "Treads", "n"], ["totalRun", "Total Run (in)", "n"], ["stringerLengthFt", "Stringer Length (ft)", "n"], ["boardLengthFt", "Board to Buy (ft)", "n"], ["stringers", "Stringers Needed", "n"], ["throatIn", "Throat Depth Left (in)", "n"]],
    fn: E.stairStringer, ex: { totalRise: 54, tread: 10, boardDepth: 11.25, stairWidth: 36 },
    exText: (o) => `Example: a 54 in rise has ${o.risers} risers of ${o.riserHeight} in and ${o.treads} treads; each stringer is ${o.stringerLengthFt} ft — buy ${o.boardLengthFt} ft 2×12s — with ${o.throatIn} in of throat left.`,
    how: "Mark the riser and tread on a framing square (stair gauges help) and step it down the board. Cut the bottom riser short by the tread thickness so all steps come out equal. Space stringers no more than 16 in apart for 5/4 decking (24 in for 2× treads).",
    assume: "Max riser 7¾ in; stringer length = √(rise² + (run + one tread)²); throat = board depth − R·T ÷ √(R² + T²) — keep at least 5 in.",
    faq: [["How many stringers do I need?", "One every 16 in across the stair width — three for a 36 in stair."]],
  }),
  mk({
    slug: "deck-stair-calculator", title: "Deck Stair Calculator (Steps, Stringers & Treads)",
    desc: "Plan deck stairs from the deck height — steps, riser height, run, number of 2×12 stringers, tread boards and the landing pad at the bottom.",
    inputs: [num("deckHeight", "Deck Height (top of decking to ground)", 30, 200, 0.25, 6, "in"), num("stairWidth", "Stair Width", 48, 120, 1, 36, "in")],
    results: [["steps", "Risers (steps)", "n"], ["riserHeight", "Riser Height (in)", "n"], ["treads", "Treads", "n"], ["totalRunIn", "Total Run (in)", "n"], ["stringers", "Stringers", "n"], ["stringerLengthFt", "Stringer Length (ft)", "n"], ["treadBoards", "Tread Boards (2 per step)", "n"], ["landingPadSqFt", "Landing Pad (sq ft)", "n"]],
    fn: E.deckStair, ex: { deckHeight: 30, stairWidth: 48 },
    exText: (o) => `Example: a 30 in high deck needs ${o.steps} risers of ${o.riserHeight} in, ${o.stringers} stringers for a 4 ft wide stair and ${o.treadBoards} tread boards.`,
    how: "Measure from the top of the decking straight down to where the bottom step will land (on sloping ground, measure at the landing spot). Treads here are two 5.5 in deck boards with a gap.",
    assume: "Max riser 7½ in for comfort (7¾ in code limit); tread 11.25 in; stringers every 16 in; landing pad 3.5 ft deep, 1 ft wider than the stair.",
    faq: [["How many stairs for a 30 inch deck?", "Four risers of 7.5 in and three treads."]],
  }),
  mk({
    slug: "stair-landing-calculator", title: "Stair Calculator with Landing (L & U Stairs)",
    desc: "Split a stair into two flights with a landing — risers in each flight, the landing height, each flight's run and the total straight run.",
    inputs: [num("totalRise", "Total Rise", 108, 300, 0.25, 6, "in"), num("tread", "Tread Depth", 10.5, 14, 0.125, 9, "in"), num("risersBeforeLanding", "Risers Before the Landing (0 = half)", 0, 30, 1, 0), num("landingDepth", "Landing Depth", 36, 120, 1, 36, "in")],
    results: [["risers", "Total Risers", "n"], ["riserHeight", "Riser Height (in)", "n"], ["flight1Risers", "Flight 1 Risers", "n"], ["flight2Risers", "Flight 2 Risers", "n"], ["landingHeight", "Landing Height (in)", "n"], ["flight1Run", "Flight 1 Run (in)", "n"], ["flight2Run", "Flight 2 Run (in)", "n"], ["straightRunTotal", "Total Run if Straight (in)", "n"]],
    fn: E.stairLanding, ex: { totalRise: 108, tread: 10.5, risersBeforeLanding: 0, landingDepth: 36 },
    exText: (o) => `Example: a 108 in rise splits into ${o.flight1Risers} + ${o.flight2Risers} risers of ${o.riserHeight} in, with the landing ${o.landingHeight} in up.`,
    how: "Landings must be at least as wide as the stair and at least 36 in deep in the direction of travel. A landing is required when a single flight would rise more than 12 ft 7 in (151 in).",
    assume: "Equal risers throughout; each flight has one fewer tread than risers (the landing acts as a tread).",
    faq: [["How deep does a stair landing need to be?", "At least 36 in (and as wide as the stairs)."]],
  }),
  mk({
    slug: "stair-angle-calculator", title: "Stair Angle Calculator (Pitch & Handrail Angle)",
    desc: "Find the angle of a stair or handrail from riser height and tread depth — slope percent and whether it's a comfortable stair, a steep stair or a ladder.",
    inputs: [num("rise", "Riser Height (or total rise)", 7.5, 300, 0.125, 0.5, "in"), num("run", "Tread Depth (or total run)", 10, 400, 0.125, 1, "in")],
    results: [["angleDeg", "Stair Angle (°)", "n"], ["category", "Type", "l", E.STAIR_ANGLES], ["slopePercent", "Slope (%)", "n"], ["handrailAngleDeg", "Handrail Angle (°)", "n"]],
    fn: E.stairAngle, ex: { rise: 7.5, run: 10 },
    exText: (o) => `Example: 7.5 in risers on 10 in treads make a ${o.angleDeg}° stair.`,
    how: "Enter one riser and tread, or the total rise and run. The handrail runs parallel to the stair nosings at the same angle (34–38 in above the nosings).",
    assume: "Angle = arctan(rise ÷ run). IRC maximums (7¾ in riser, 10 in tread) give about 37.8°.",
    faq: [["What is the best angle for stairs?", "About 30–37°."]],
  }),
  mk({
    slug: "stair-tread-calculator", title: "Stair Tread Calculator (Size, Board Feet & Cost)",
    desc: "Work out stair tread size with nosing, number of treads and risers, linear and board feet of tread stock, and the cost of treads.",
    inputs: [num("treads", "Number of Treads", 13, 40, 1, 1), num("width", "Stair Width", 36, 96, 0.5, 24, "in"), num("treadDepth", "Tread Run", 10.5, 14, 0.125, 9, "in"), num("nosing", "Nosing", 1, 1.25, 0.125, 0, "in"), num("thickness", "Tread Thickness", 1, 2, 0.25, 0.75, "in"), usd("pricePerTread", "Price per Tread", 60, 1000, 1)],
    results: [["treadSizeIn", "Tread Depth with Nosing (in)", "n"], ["treads", "Treads", "n"], ["riserBoards", "Riser Boards", "n"], ["linearFeet", "Tread Stock (linear ft)", "n"], ["boardFeet", "Board Feet", "n"], ["cost", "Tread Cost", "c"]],
    fn: E.stairTread, ex: { treads: 13, width: 36, treadDepth: 10.5, nosing: 1, thickness: 1, pricePerTread: 60 },
    exText: (o) => `Example: 13 oak treads for a 36 in stair are ${o.treadSizeIn} in deep with the nosing — ${o.boardFeet} board feet, about ${money(o.cost)}.`,
    how: "Treads are usually sold 11.5 in deep (10.5 in run + 1 in nosing). Count one more riser board than treads.",
    assume: "Board feet = treads × depth × width × thickness ÷ 144.",
    faq: [["How deep should a stair tread be?", "At least 10 in of run plus a ¾–1¼ in nosing."]],
  }),
  mk({
    slug: "spiral-staircase-calculator", title: "Spiral Staircase Calculator",
    desc: "Plan a spiral staircase — risers and treads for your floor height, degrees per tread, tread depth at the walkline and the floor opening — checked against IRC spiral-stair minimums.",
    inputs: [num("floorHeight", "Floor-to-Floor Height", 108, 200, 0.5, 60, "in"), dd("diameter", "Stair Diameter", ["4 ft (48 in)", "5 ft (60 in)", "6 ft (72 in)"], 1), dd("rotation", "Rotation", ["270°", "300°", "360°"], 2)],
    results: [["risers", "Risers", "n"], ["riserHeight", "Riser Height (in)", "n"], ["treads", "Treads", "n"], ["degreesPerTread", "Degrees per Tread", "n"], ["walklineTreadIn", "Tread Depth at Walkline (in)", "n"], ["compliant", "Code Check", "l", E.SPIRAL_OK], ["openingIn", "Floor Opening (in)", "n"]],
    fn: E.spiralStaircase, ex: { floorHeight: 108, diameter: 1, rotation: 2 },
    exText: (o) => `Example: a 5 ft spiral stair for a 108 in rise has ${o.risers} risers of ${o.riserHeight} in, ${o.degreesPerTread}° per tread and ${o.walklineTreadIn} in of tread at the walkline.`,
    how: "Pick the diameter and rotation. Larger diameters are much easier to climb and to carry furniture up. The landing must line up with the floor opening — kit makers' calculators fine-tune this.",
    assume: "IRC R311.7.10.1: riser ≤ 9½ in, tread ≥ 6¾ in at a walkline 12 in from the narrow edge, clear width ≥ 26 in (about a 52 in diameter), headroom ≥ 6 ft 6 in.",
    faq: [["What is the smallest legal spiral staircase?", "About 52 in in diameter to give the required 26 in clear width under the IRC."]],
  }),
  mk({
    slug: "deck-beam-span-calculator", title: "Deck Beam Span Calculator (Maximum Beam Span & Posts)",
    desc: "Estimate how far a built-up deck beam can span between posts — 2-ply and 3-ply 2×8 to 2×12 — for your joist span and species, with the number of posts.",
    inputs: [dd("beam", "Beam", E.BEAMS, 2), dd("species", "Species", E.SPECIES), num("joistSpan", "Joist Span Supported", 12, 20, 0.5, 4, "ft"), num("cantilever", "Joist Cantilever Beyond Beam", 0, 4, 0.5, 0, "ft"), num("deckLength", "Deck Length (along the beam)", 16, 100, 0.5, 4, "ft")],
    results: [["maxSpanFt", "Maximum Beam Span (ft)", "n"], ["feet", "Feet", "n"], ["inches", "+ Inches", "n"], ["posts", "Posts Needed", "n"], ["tributaryFt", "Tributary Width (ft)", "n"]],
    fn: E.deckBeamSpan, ex: { beam: 2, species: 0, joistSpan: 12, cantilever: 0, deckLength: 16 },
    exText: (o) => `Example: a 2-ply 2×12 southern pine beam carrying 12 ft joists can span about ${o.feet} ft ${o.inches} in — ${o.posts} posts for a 16 ft deck.`,
    how: "Enter the beam size, species and the joist span it carries (half of it bears on this beam; the other half goes to the ledger). Compare with IRC Table R507.5 or the DCA 6 guide before you build.",
    assume: "40 psf live + 10 psf dead; bending and L/360 live-load deflection with NDS No. 2 wet-service values. Estimate only — local code tables govern.",
    faq: [["How far can a 2-ply 2x10 deck beam span?", "Roughly 6–8 ft with 12 ft joists, depending on species."]],
  }),
  mk({
    slug: "deck-footing-calculator", title: "Deck Footing Calculator (Size, Spacing & Concrete)",
    desc: "Size deck footings — load per footing, footing diameter for your soil, number of footings and bags of concrete — from joist span, post spacing and frost depth.",
    inputs: [dd("support", "Deck Type", ["Attached with a ledger", "Freestanding / cantilevered beam"]), num("joistSpan", "Joist Span", 12, 20, 0.5, 4, "ft"), num("cantilever", "Cantilever Past Beam", 0, 4, 0.5, 0, "ft"), num("postSpacing", "Post Spacing Along the Beam", 8, 14, 0.5, 4, "ft"), num("deckLength", "Deck Length", 16, 100, 0.5, 4, "ft"), num("beams", "Beam Rows", 1, 4, 1, 1), num("soilBearing", "Soil Bearing Capacity", 1500, 4000, 100, 500, "psf"), num("frostDepth", "Footing Depth (frost line)", 36, 72, 1, 12, "in")],
    results: [["footingDiameterIn", "Footing Diameter (in)", "n"], ["loadPerFootingLb", "Load per Footing (lb)", "n"], ["footings", "Footings", "n"], ["bagsPerFooting", "80 lb Bags per Footing", "n"], ["totalBags", "Total 80 lb Bags", "n"], ["depthIn", "Footing Depth (in)", "n"]],
    fn: E.deckFooting, ex: { support: 0, joistSpan: 12, cantilever: 0, postSpacing: 8, deckLength: 16, beams: 1, soilBearing: 1500, frostDepth: 36 },
    exText: (o) => `Example: a 16 × 12 ft ledger deck with posts every 8 ft puts about ${n2(o.loadPerFootingLb)} lb on each footing — ${o.footings} footings ${o.footingDiameterIn} in across, ${o.totalBags} bags of concrete.`,
    how: "Footings must reach below the frost line. Use a larger diameter footing (or a footing pad under a tube) on weak soil. Check IRC Table R507.3.1 for minimum footing sizes.",
    assume: "50 psf total load; footing area = load ÷ soil bearing; minimum 12 in diameter; concrete 0.6 cu ft per 80 lb bag.",
    faq: [["How big should deck footings be?", "Typically 12–24 in diameter depending on load and soil."]],
  }),
  mk({
    slug: "deck-board-spacing-calculator", title: "Deck Board Spacing Calculator (Gap & Last Board)",
    desc: "Work out how many deck boards fit across your deck, the gap between them, an even gap that finishes flush, and how wide to rip the last board.",
    inputs: [num("deckWidth", "Width Across the Boards", 12, 100, 0.25, 1, "ft"), num("deckLength", "Board Run Length", 16, 100, 0.5, 1, "ft"), num("boardWidth", "Board Width", 5.5, 12, 0.125, 2, "in"), num("gap", "Gap", 0.1875, 0.5, 0.0625, 0, "in"), dd("moisture", "Boards", ["Dry / kiln-dried / composite (gap them)", "Wet pressure-treated (butt tight — they shrink)"])],
    results: [["boards", "Boards Across (incl. any ripped board)", "n"], ["gapIn", "Gap (in)", "n"], ["lastBoardRipIn", "Ripped Last Board at That Gap (in)", "n"], ["evenGapIn", "Gap for Full Boards Only (in)", "n"], ["sqFt", "Deck Area (sq ft)", "n"]],
    fn: E.deckBoardSpacing, ex: { deckWidth: 12, deckLength: 16, boardWidth: 5.5, gap: 0.1875, moisture: 0 },
    exText: (o) => `Example: a 12 ft wide deck takes ${o.boards} boards of 5.5 in: at 3/16 in gaps the last one is ripped to ${o.lastBoardRipIn} in — or open the gaps to ${o.evenGapIn} in and use only full boards.`,
    how: "Use the gap the board maker specifies (composite often 3/16–1/4 in side to side). Wet pressure-treated boards shrink, so lay them tight. Adjust the gap slightly to avoid a thin rip at the end.",
    assume: "Boards = (width + gap) ÷ (board + gap), rounded up.",
    faq: [["How far apart should deck boards be?", "About 1/8–1/4 in, or as the manufacturer specifies; wet pressure-treated boards go tight."]],
  }),
  mk({
    slug: "under-deck-drainage-calculator", title: "Under-Deck Drainage Calculator (Trough Systems)",
    desc: "Estimate an under-deck drainage system (like Trex RainEscape) — troughs between joists, trough length, collection gutter, downspouts and cost.",
    inputs: [num("length", "Deck Length (along the gutter)", 16, 100, 0.5, 2, "ft"), num("width", "Deck Depth (trough length)", 12, 40, 0.5, 2, "ft"), num("joistSpacing", "Joist Spacing", 16, 24, 1, 12, "in"), usd("ratePerSqFt", "Material Cost per Sq Ft", 5, 20, 0.25)],
    results: [["troughs", "Troughs (joist bays)", "n"], ["troughLengthFt", "Trough Length (ft)", "n"], ["gutterFeet", "Collection Gutter (ft)", "n"], ["downspouts", "Downspouts", "n"], ["cost", "Material Cost", "c"]],
    fn: E.underDeckDrainage, ex: { length: 16, width: 12, joistSpacing: 16, ratePerSqFt: 5 },
    exText: (o) => `Example: a 16 × 12 ft deck with joists at 16 in needs ${o.troughs} troughs of ${o.troughLengthFt} ft, ${o.gutterFeet} ft of gutter and ${o.downspouts} downspout(s).`,
    how: "Troughs slope from the house to a gutter at the outer beam, keeping the space under the deck dry. Install before the decking goes on. Follow the system maker's slope and fastening details.",
    assume: "One trough per joist bay; one downspout per 20 ft of gutter; material ≈ $4–6 per sq ft.",
    faq: [["How does under-deck drainage work?", "Troughs between joists catch water and channel it to a gutter at the edge of the deck."]],
  }),
  mk({
    slug: "shed-ramp-calculator", title: "Shed Ramp Calculator (Length, Angle & Lumber)",
    desc: "Work out how long a shed ramp needs to be for your floor height and slope — wheelchair, cart or mower — with the angle, runners and deck boards.",
    inputs: [num("height", "Shed Floor Height", 12, 60, 0.5, 1, "in"), dd("slope", "Slope", ["1:12 (wheelchair, 4.8°)", "1:8 (walking, 7.1°)", "1:6 (carts & mowers, 9.5°)", "1:4 (max for heavy wheeled gear, 14°)"], 2), num("width", "Ramp Width", 48, 120, 1, 24, "in")],
    results: [["runIn", "Ramp Run (horizontal, in)", "n"], ["rampLengthIn", "Ramp Length (sloped, in)", "n"], ["angleDeg", "Angle (°)", "n"], ["runners", "2×6 Runners", "n"], ["deckBoards", "Deck Boards", "n"]],
    fn: E.shedRamp, ex: { height: 12, slope: 2, width: 48 },
    exText: (o) => `Example: a shed floor 12 in up with a 1:6 ramp needs ${o.runIn} in of run — a ${o.rampLengthIn} in ramp at ${o.angleDeg}° with ${o.runners} runners.`,
    how: "Gentler is easier for heavy mowers and wheelbarrows. Support long ramps in the middle and use a non-slip surface.",
    assume: "Run = height × slope ratio; runners every 16 in; 5.5 in boards with small gaps.",
    faq: [["What angle should a shed ramp be?", "About 10–15° for mowers and carts; 1:12 for wheelchairs."]],
  }),
  mk({
    slug: "fence-picket-calculator", title: "Fence Picket Calculator (Pickets, Rails & Spacing)",
    desc: "Calculate fence pickets, sections, posts, rails and fasteners from the fence length, picket width, gap and post spacing — for picket or privacy fences.",
    inputs: [FLEN, num("picketWidth", "Picket Width", 5.5, 12, 0.125, 1, "in"), num("gap", "Gap Between Pickets (0 for privacy)", 0.5, 6, 0.125, 0, "in"), num("postSpacing", "Post Spacing", 8, 10, 0.5, 4, "ft"), num("postWidth", "Post Width", 3.5, 5.5, 0.5, 2, "in"), num("rails", "Rails per Section", 2, 4, 1, 2)],
    results: [["pickets", "Pickets (incl. 5%)", "n"], ["sections", "Sections", "n"], ["posts", "Posts", "n"], ["rails", "Rails", "n"], ["picketsPerSection", "Pickets per Section", "n"], ["fasteners", "Nails / Screws", "n"]],
    fn: E.fencePicket, ex: { length: 150, picketWidth: 5.5, gap: 0.5, postSpacing: 8, postWidth: 3.5, rails: 2 },
    exText: (o) => `Example: 150 ft of fence with 5.5 in pickets and 1/2 in gaps needs about ${o.pickets} pickets, ${o.posts} posts and ${o.rails} rails.`,
    how: "Enter the run and picket layout. Privacy fences use no gap (or board-on-board); pickets shrink a little as they dry, opening small gaps.",
    assume: "Pickets = (length − posts) ÷ (picket + gap), plus 5%; two fasteners per picket per rail; add gates and corners separately.",
    faq: [["How many pickets for 100 ft of fence?", "About 200–220 with 5.5 in pickets and small gaps."]],
  }),
  mk({
    slug: "board-on-board-fence-calculator", title: "Board-on-Board Fence Calculator",
    desc: "Calculate a board-on-board (shadowbox) privacy fence — front and back pickets, the gap between front boards for your overlap, posts and rails.",
    inputs: [FLEN, num("height", "Fence Height", 6, 8, 0.5, 3, "ft"), num("picketWidth", "Picket Width", 5.5, 12, 0.125, 1, "in"), num("overlap", "Overlap Each Side", 1, 2, 0.25, 0.25, "in"), num("postSpacing", "Post Spacing", 8, 10, 0.5, 4, "ft")],
    results: [["pickets", "Total Pickets (incl. 5%)", "n"], ["frontPickets", "Front Pickets", "n"], ["backPickets", "Back Pickets", "n"], ["gapIn", "Gap Between Front Boards (in)", "n"], ["posts", "Posts", "n"], ["rails", "Rails", "n"]],
    fn: E.boardOnBoardFence, ex: { length: 150, height: 6, picketWidth: 5.5, overlap: 1, postSpacing: 8 },
    exText: (o) => `Example: 150 ft of 6 ft board-on-board fence with 1 in overlaps needs about ${o.pickets} pickets — front boards ${o.gapIn} in apart — plus ${o.posts} posts.`,
    how: "Nail the front layer with a gap of (picket width − 2 × overlap), then center the back layer over the gaps. Board-on-board uses about 1.6–1.8 times as many pickets as a side-by-side fence.",
    assume: "Gap = width − 2 × overlap; same number of back boards; 3 rails per section for 6 ft fences.",
    faq: [["How much overlap for board-on-board fence?", "About 1 in on each side (1.5 in for wide boards)."]],
  }),
  mk({
    slug: "fence-post-calculator", title: "Fence Post Spacing Calculator (Posts & Gate Posts)",
    desc: "Work out how many fence posts you need — line, corner and gate posts — from the fence length and spacing, and what size gate posts to use.",
    inputs: [FLEN, num("spacing", "Post Spacing", 8, 10, 0.5, 4, "ft"), num("corners", "Corners", 2, 50, 1), num("gates", "Gates", 1, 20, 1), num("gateWidth", "Widest Gate", 4, 16, 0.5, 2, "ft")],
    results: [["posts", "Total Posts", "n"], ["linePosts", "Line Posts", "n"], ["sections", "Sections", "n"], ["gatePostSize", "Gate Posts", "l", E.GATE_POSTS]],
    fn: E.fencePost, ex: { length: 150, spacing: 8, corners: 2, gates: 1, gateWidth: 4 },
    exText: (o) => `Example: 150 ft of fence with posts every 8 ft, two corners and one gate needs about ${o.posts} posts.`,
    how: "Wood fences usually use posts every 6–8 ft (8 ft max for most rails); vinyl panels set the spacing. Gate posts carry the most load — set them deeper and use bigger posts.",
    assume: "Sections = length ÷ spacing (rounded up); one extra post per corner and per gate.",
    faq: [["How far apart are fence posts?", "Usually 6–8 ft for wood fences."]],
  }),
  mk({
    slug: "fence-post-depth-calculator", title: "Fence Post Depth Calculator (Hole Depth, Size & Concrete)",
    desc: "Find how deep to set fence posts — half the above-ground height, at least 2 ft and below the frost line — with hole diameter, post length and concrete per hole.",
    inputs: [num("height", "Fence Height", 6, 12, 0.5, 2, "ft"), num("postWidth", "Post Width", 3.5, 7.5, 0.5, 2, "in"), num("frostDepth", "Frost Depth (0 if none)", 0, 72, 1, 0, "in")],
    results: [["depthIn", "Hole Depth (in)", "n"], ["holeDiameterIn", "Hole Diameter (in)", "n"], ["postLengthFt", "Post Length to Buy (ft)", "n"], ["bagsPerHole", "80 lb Bags per Hole", "n"], ["gravelInches", "Gravel at the Bottom (in)", "n"]],
    fn: E.fencePostDepth, ex: { height: 6, postWidth: 3.5, frostDepth: 0 },
    exText: (o) => `Example: a 6 ft fence with 4×4 posts needs holes ${o.depthIn} in deep and ${o.holeDiameterIn} in wide — ${o.postLengthFt} ft posts and about ${o.bagsPerHole} bags of concrete per hole.`,
    how: "Bury about a third of the post's total length (half the fence height), never less than 2 ft, and below the frost line in cold areas. Put 6 in of gravel at the bottom for drainage.",
    assume: "Depth = max(2 ft, height ÷ 2, frost depth); hole diameter = 3 × post width; gravel fills part of the hole.",
    faq: [["How deep should a 6 ft fence post be?", "About 3 ft (2 ft minimum), deeper in frost areas."]],
  }),
  mk({
    slug: "chain-link-fence-calculator", title: "Chain Link Fence Calculator (Materials List)",
    desc: "Get a chain link fence materials list — fabric, line and terminal posts, top rail, tension bars and bands, ties and concrete — from the length, height, corners and gates.",
    inputs: [FLEN, num("height", "Fence Height", 4, 12, 1, 3, "ft"), num("corners", "Corners", 2, 50, 1), num("gates", "Gates", 1, 20, 1), num("gateWidth", "Gate Width", 4, 20, 0.5, 2, "ft")],
    results: [["fabricFt", "Fabric (ft)", "n"], ["linePosts", "Line Posts", "n"], ["terminalPosts", "Terminal Posts (ends, corners, gates)", "n"], ["topRailSticks", "Top Rail (21 ft sticks)", "n"], ["tensionBars", "Tension Bars", "n"], ["tensionBands", "Tension Bands", "n"], ["ties", "Fence Ties", "n"], ["concreteBags", "80 lb Concrete Bags", "n"]],
    fn: E.chainLinkFence, ex: { length: 150, height: 4, corners: 2, gates: 1, gateWidth: 4 },
    exText: (o) => `Example: 150 ft of 4 ft chain link with two corners and a 4 ft gate needs ${o.fabricFt} ft of fabric, ${o.linePosts} line posts, ${o.terminalPosts} terminal posts and ${o.topRailSticks} top rail sticks.`,
    how: "Terminal posts (ends, corners and gates) are larger than line posts. Stretch the fabric with a come-along between terminals before tying it off.",
    assume: "Line posts ≤ 10 ft apart; tension bars on each end and both sides of corners; one band per foot of height; ties every 12 in on line posts and 24 in on the rail; two bags of concrete per post.",
    faq: [["How far apart are chain link fence posts?", "No more than 10 ft."]],
  }),
  mk({
    slug: "vinyl-fence-calculator", title: "Vinyl Fence Calculator (Panels, Posts & Caps)",
    desc: "Calculate a vinyl fence — panels, posts (line, corner, end and gate), post caps and concrete — from the fence length, panel width, corners and gates.",
    inputs: [FLEN, dd("panel", "Panel Width", ["6 ft", "8 ft"]), num("corners", "Corners", 2, 50, 1), num("gates", "Gates", 1, 20, 1), num("gateWidth", "Gate Width", 4, 16, 0.5, 2, "ft")],
    results: [["panels", "Panels", "n"], ["posts", "Posts", "n"], ["postCaps", "Post Caps", "n"], ["concreteBags", "80 lb Concrete Bags", "n"], ["gates", "Gates", "n"]],
    fn: E.vinylFence, ex: { length: 150, panel: 0, corners: 2, gates: 1, gateWidth: 4 },
    exText: (o) => `Example: 150 ft of vinyl fence with 6 ft panels, two corners and a gate needs ${o.panels} panels and ${o.posts} posts.`,
    how: "Vinyl panels fix the post spacing, so measure carefully and plan cut panels at one end. Line, corner, end and gate posts are routed differently — order the right type for each spot.",
    assume: "Panels = (length − gates) ÷ panel width, rounded up; two bags of concrete per post (gate posts often get a steel insert).",
    faq: [["How many vinyl fence panels for 100 ft?", "About 17 six-foot panels."]],
  }),
  mk({
    slug: "railing-calculator", title: "Railing Calculator (Deck Railing Posts, Rails & Balusters)",
    desc: "Plan deck or stair railing — posts, sections, top and bottom rail, balusters at the 4 inch rule — and the railing cost per foot.",
    inputs: [num("length", "Railing Length", 40, 1000, 0.5, 1, "ft"), num("postSpacing", "Post Spacing", 6, 8, 0.5, 2, "ft"), num("corners", "Corners", 2, 20, 1), num("balusterWidth", "Baluster Width", 1.5, 3, 0.25, 0.5, "in"), usd("pricePerFoot", "Railing Price per Ft", 35, 500, 1)],
    results: [["posts", "Posts", "n"], ["sections", "Sections", "n"], ["balusters", "Balusters", "n"], ["railFeet", "Top + Bottom Rail (ft)", "n"], ["cost", "Railing Cost", "c"]],
    fn: E.railing, ex: { length: 40, postSpacing: 6, corners: 2, balusterWidth: 1.5, pricePerFoot: 35 },
    exText: (o) => `Example: 40 ft of deck railing with posts every 6 ft needs ${o.posts} posts and about ${o.balusters} balusters — roughly ${money(o.cost)} at $35 per ft.`,
    how: "Deck guards must be at least 36 in high (42 in for commercial) wherever the deck is more than 30 in above grade, with openings smaller than 4 in. Stair handrails go 34–38 in above the nosings.",
    assume: "Balusters per section keep gaps under 4 in; wood railing typically $30–60 per ft, aluminum $50–100, glass $150+.",
    faq: [["How far apart can deck railing posts be?", "Usually 6 ft for wood (up to 8 ft for some aluminum and composite systems)."]],
  }),
  mk({
    slug: "baluster-spacing-calculator", title: "Baluster & Spindle Spacing Calculator (4 Inch Rule)",
    desc: "Calculate baluster or spindle spacing for a deck or stair railing — number of balusters, the exact gap and on-center spacing — that keeps openings under 4 inches.",
    inputs: [num("railLength", "Distance Between Posts", 72, 240, 0.125, 6, "in"), num("balusterWidth", "Baluster Width", 1.5, 4, 0.125, 0.5, "in"), num("maxGap", "Maximum Gap", 3.875, 4, 0.125, 1, "in"), num("sections", "Identical Sections", 1, 100, 1, 1)],
    results: [["balusters", "Balusters per Section", "n"], ["actualGapIn", "Actual Gap (in)", "n"], ["onCenterIn", "On-Center Spacing (in)", "n"], ["totalBalusters", "Total Balusters", "n"]],
    fn: E.balusterSpacing, ex: { railLength: 72, balusterWidth: 1.5, maxGap: 3.875, sections: 1 },
    exText: (o) => `Example: 72 in between posts with 1.5 in balusters takes ${o.balusters} balusters with ${o.actualGapIn} in gaps (${o.onCenterIn} in on center).`,
    how: "Measure between the inside faces of the posts. Start with a gap at each post so the spacing is even. On stairs, the triangle under the bottom rail may be up to 6 in.",
    assume: "IRC R312: a 4 in sphere must not pass through the guard; the calculator keeps gaps just under 4 in.",
    faq: [["How far apart should balusters be?", "Less than 4 in — usually about 3.5–3.875 in clear."]],
  }),
  mk({
    slug: "gate-brace-calculator", title: "Gate Brace Calculator (Diagonal Length & Angle)",
    desc: "Calculate the diagonal brace for a wooden gate — brace length between rails, its angle and the cut angle — and which way it should run.",
    inputs: [num("gateWidth", "Gate Width (between frame sides)", 42, 192, 0.25, 12, "in"), num("railSpacing", "Distance Between Top and Bottom Rails (outside)", 48, 96, 0.25, 12, "in"), num("railWidth", "Rail Width", 3.5, 5.5, 0.25, 1.5, "in")],
    results: [["braceLengthIn", "Brace Length (in, long point)", "n"], ["braceAngleDeg", "Brace Angle (°)", "n"], ["cutAngleDeg", "End Cut Angle (°)", "n"]],
    fn: E.gateBrace, ex: { gateWidth: 42, railSpacing: 48, railWidth: 3.5 },
    exText: (o) => `Example: a 42 in gate with rails 48 in apart takes a ${o.braceLengthIn} in brace at ${o.braceAngleDeg}°.`,
    how: "Run the brace from the bottom of the hinge side up to the top of the latch side so it pushes the latch corner up and stops sagging. Cut and dry-fit it, then fasten.",
    assume: "Brace length = √(width² + (rail spacing − rail width)²); a simple estimate — trim to fit.",
    faq: [["Which way does a gate brace go?", "From the bottom hinge corner up to the top latch corner."]],
  }),
  mk({
    slug: "chain-link-fence-cost-calculator", title: "Chain Link Fence Cost Calculator",
    desc: "Estimate the cost of a chain link fence — by length and height, galvanized or vinyl-coated, with walk and drive gates, privacy slats and old fence removal.",
    inputs: [FLEN, dd("height", "Height", ["4 ft", "5 ft", "6 ft"]), dd("coating", "Finish", ["Galvanized", "Black or green vinyl-coated"]), num("walkGates", "Walk Gates", 1, 20, 1), num("driveGates", "Double Drive Gates", 0, 10, 1), dd("slats", "Privacy Slats?", ["No", "Yes"]), dd("removal", "Remove Old Fence?", ["No", "Yes"])],
    results: COSTRES,
    fn: E.chainLinkFenceCost, ex: { length: 150, height: 0, coating: 0, walkGates: 1, driveGates: 0, slats: 0, removal: 0 },
    exText: (o) => `Example: 150 ft of 4 ft galvanized chain link with one gate costs about ${money(o.totalCost)} — ${money(o.perFoot)} per ft.`,
    how: "Enter the length, height and options. Rocky ground and long runs of corners add cost.",
    assume: `Typical installed prices per ft: 4 ft $16, 5 ft $20, 6 ft $25; vinyl coating +25%; walk gates $300, drive gates $600; slats $4/ft; removal $3/ft. ${COST_NOTE}`,
    faq: [["How much does a chain link fence cost per foot?", "About $12–30 installed."]],
  }),
  mk({
    slug: "vinyl-fence-cost-calculator", title: "Vinyl Fence Cost Calculator",
    desc: "Estimate vinyl fence cost — picket, privacy or ranch rail — by length and height, with walk and drive gates and old fence removal.",
    inputs: [FLEN, dd("style", "Style", E.VINYL_STYLES, 1), HEIGHT3, usd("customRate", "Your Price per Ft (0 = typical)", 0, 200, 0.5), ...GATES],
    results: COSTRES,
    fn: E.vinylFenceCost, ex: { length: 150, style: 1, height: 2, customRate: 0, walkGates: 1, driveGates: 0, removal: 0 },
    exText: (o) => `Example: 150 ft of 6 ft vinyl privacy fence with a walk gate costs about ${money(o.totalCost)} — ${money(o.perFoot)} per ft.`,
    how: "Enter the run, style and height. Vinyl costs more than wood up front but needs no staining.",
    assume: `Typical installed prices per ft (4/5/6 ft): picket $22/26/30, privacy $28/32/36, ranch rail $14/16/18; walk gates $450, drive gates $1,500. ${COST_NOTE}`,
    faq: [["How much does a vinyl privacy fence cost?", "About $30–45 per ft installed for 6 ft privacy."]],
  }),
  mk({
    slug: "metal-fence-cost-calculator", title: "Metal Fence Cost Calculator (Aluminum, Steel & Wrought Iron)",
    desc: "Estimate the cost of an aluminum, ornamental steel or wrought iron fence — by length and height — with gates and removal.",
    inputs: [FLEN, dd("style", "Material", E.METAL_STYLES), HEIGHT3, usd("customRate", "Your Price per Ft (0 = typical)", 0, 300, 0.5), ...GATES],
    results: COSTRES,
    fn: E.metalFenceCost, ex: { length: 150, style: 0, height: 0, customRate: 0, walkGates: 1, driveGates: 0, removal: 0 },
    exText: (o) => `Example: 150 ft of 4 ft aluminum fence with a walk gate costs about ${money(o.totalCost)}.`,
    how: "Aluminum doesn't rust and suits pools; steel is stronger; true wrought iron is heavy, custom and the most expensive.",
    assume: `Typical installed prices per ft (4/5/6 ft): aluminum $28/32/38, steel $32/38/45, wrought iron $45/55/65; walk gates $500, drive gates $2,500. ${COST_NOTE}`,
    faq: [["How much does an aluminum fence cost?", "About $25–45 per ft installed."]],
  }),
  mk({
    slug: "composite-fence-cost-calculator", title: "Composite Fence Cost Calculator",
    desc: "Estimate composite fence cost — privacy or semi-privacy — by length and height, with gates and removal of the old fence.",
    inputs: [FLEN, dd("style", "Style", E.COMPOSITE_STYLES), HEIGHT3, usd("customRate", "Your Price per Ft (0 = typical)", 0, 300, 0.5), ...GATES],
    results: COSTRES,
    fn: E.compositeFenceCost, ex: { length: 150, style: 0, height: 2, customRate: 0, walkGates: 1, driveGates: 0, removal: 0 },
    exText: (o) => `Example: 150 ft of 6 ft composite privacy fence with a gate costs about ${money(o.totalCost)}.`,
    how: "Composite (wood-plastic) fencing costs more than wood or vinyl but resists rot and needs no paint. Most systems use aluminum or steel posts.",
    assume: `Typical installed prices per ft (4/5/6 ft): privacy $45/55/65, semi-privacy $40/48/58; gates $600 (walk) and $2,000 (drive). ${COST_NOTE}`,
    faq: [["Is composite fencing worth it?", "It lasts 25+ years with little upkeep but costs about twice as much as wood."]],
  }),
  mk({
    slug: "pool-fence-cost-calculator", title: "Pool Fence Cost Calculator",
    desc: "Estimate the cost of a pool safety fence — removable mesh, aluminum, vinyl, wrought iron or frameless glass — with self-closing, self-latching gates.",
    inputs: [num("length", "Fence Length", 120, 10000, 1, 0, "ft"), dd("type", "Fence Type", E.POOL_FENCES, 1), usd("customRate", "Your Price per Ft (0 = typical)", 0, 500, 1), num("gates", "Self-Closing Gates", 1, 10, 1, 1)],
    results: COSTRES,
    fn: E.poolFenceCost, ex: { length: 120, type: 1, customRate: 0, gates: 1 },
    exText: (o) => `Example: 120 ft of aluminum pool fence with one self-closing gate costs about ${money(o.totalCost)}.`,
    how: "Pool barriers must be at least 48 in high with no climbable gaps, and gates must self-close and self-latch with the latch at least 54 in up (ISPSC / IRC Appendix G). Check local rules — many are stricter.",
    assume: `Typical installed prices per ft: removable mesh $20, aluminum $35, vinyl $30, wrought iron $55, frameless glass $150; self-closing gates ≈ $600. ${COST_NOTE}`,
    faq: [["How much does a pool fence cost?", "About $2,500–6,000 for aluminum or mesh around a typical pool; glass costs far more."]],
  }),
  mk({
    slug: "gate-cost-calculator", title: "Gate Cost Calculator (Walk & Driveway Gates)",
    desc: "Estimate the cost of a new gate — wood, vinyl, chain link, aluminum or wrought iron, walk or double drive — with an automatic gate opener.",
    inputs: [dd("gate", "Gate", E.GATES), num("count", "Number of Gates", 1, 20, 1, 1), dd("opener", "Automatic Opener?", ["No", "Yes"])],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.gateCost, ex: { gate: 0, count: 1, opener: 0 },
    exText: (o) => `Example: one wooden walk gate costs about ${money(o.totalCost)} installed.`,
    how: "Pick the gate type. Wide driveway gates need strong posts, a cane bolt or wheel, and a proper opener foundation if automated.",
    assume: `Typical installed prices: wood walk $350, vinyl walk $450, chain link walk $250, aluminum walk $500, wood double drive $1,200, vinyl double $1,500, aluminum double $2,000, wrought iron driveway $3,500; opener ≈ $2,000. ${COST_NOTE}`,
    faq: [["How much does a driveway gate cost?", "About $1,200–5,000, plus $1,500–3,000 for an opener."]],
  }),
  mk({
    slug: "deck-repair-cost-calculator", title: "Deck Repair Cost Calculator",
    desc: "Estimate deck repair costs — replacing boards, sistering joists, railing, posts and footings, rebuilding stairs — plus an inspection.",
    inputs: [num("boards", "Deck Boards to Replace", 10, 500, 1), num("joists", "Joists to Sister / Replace", 0, 100, 1), num("railingFeet", "Railing to Replace", 0, 1000, 1, 0, "ft"), num("posts", "Posts / Footings to Replace", 0, 50, 1), dd("stairs", "Rebuild the Stairs?", ["No", "Yes"]), usd("inspection", "Inspection", 250, 2000, 10)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.deckRepairCost, ex: { boards: 10, joists: 0, railingFeet: 0, posts: 0, stairs: 0, inspection: 250 },
    exText: (o) => `Example: replacing 10 deck boards with an inspection costs about ${money(o.totalCost)}.`,
    how: "Probe joists, ledger and posts with a screwdriver — soft wood means rot. Loose ledgers and rotted posts are safety issues; fix them before cosmetic work. If more than about a third of the structure is bad, compare with replacement.",
    assume: `Typical prices: boards $40 each, joists $150 each, railing $40/ft, posts and footings $400 each, stairs $1,500. ${COST_NOTE}`,
    faq: [["How much does deck repair cost?", "Usually $500–5,000 depending on what's damaged."]],
  }),
  mk({
    slug: "deck-staining-cost-calculator", title: "Deck Staining Cost Calculator",
    desc: "Estimate the cost to stain or refinish a deck — per square foot with cleaning or stripping and sanding, semi-transparent or solid stain, railings and stairs.",
    inputs: [num("area", "Deck Area", 300, 10000, 1, 0, "sq ft"), usd("rate", "Price per Sq Ft", 3, 10, 0.05), dd("prep", "Prep", ["Clean / wash only", "Strip and sand"]), dd("stain", "Stain", ["Semi-transparent", "Solid"]), num("railingFeet", "Railing", 40, 1000, 1, 0, "ft"), num("stairs", "Stair Steps", 4, 50, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perSqFt", "All-In per Sq Ft", "c"]],
    fn: E.deckStainingCost, ex: { area: 300, rate: 3, prep: 0, stain: 0, railingFeet: 40, stairs: 4 },
    exText: (o) => `Example: cleaning and staining a 300 sq ft deck with 40 ft of railing and four steps costs about ${money(o.totalCost)}.`,
    how: "Enter the deck size and prep. Old film-forming stains usually need stripping and sanding, which adds about $1 per sq ft. Restain every 2–3 years.",
    assume: `Typical prices: $2–5 per sq ft for cleaning and staining; railing about $5 per ft; stairs $50 per step; $400 minimum. ${COST_NOTE}`,
    faq: [["How much does it cost to stain a deck?", "About $2–5 per sq ft — $600–1,500 for a typical deck."]],
  }),
  mk({
    slug: "stain-calculator", title: "Deck & Fence Stain Calculator (Gallons)",
    desc: "Calculate how much stain or paint you need for a deck or fence — gallons, 1-gallon cans and 5-gallon pails — by stain type, coats, railing and rough wood.",
    inputs: [dd("mode", "Surface", ["Deck", "Fence"]), num("length", "Deck Length / Fence Length", 16, 10000, 0.5, 0, "ft"), num("width", "Deck Width / Fence Height", 12, 100, 0.5, 0, "ft"), num("sides", "Fence Sides to Stain", 1, 2, 1, 1), num("railingFeet", "Deck Railing", 40, 1000, 1, 0, "ft"), dd("stain", "Product", E.STAIN_TYPES, 1), num("coats", "Coats", 2, 3, 1, 1), dd("rough", "Rough-Sawn or Weathered Wood?", ["No", "Yes"])],
    results: [["gallons", "Stain Needed (gal)", "n"], ["area", "Area (sq ft)", "n"], ["oneGallonCans", "1-Gallon Cans", "n"], ["fiveGallonPails", "Or 5-Gallon Pails", "n"]],
    fn: E.stain, ex: { mode: 0, length: 16, width: 12, sides: 1, railingFeet: 40, stain: 1, coats: 2, rough: 0 },
    exText: (o) => `Example: two coats of semi-transparent stain on a 16 × 12 ft deck with 40 ft of railing take about ${o.gallons} gallons.`,
    how: "Pick deck or fence. For a fence, enter its length and height and how many sides you'll stain. Rough or weathered wood soaks up about 30% more.",
    assume: "Coverage per coat: transparent 250 sq ft/gal, semi-transparent 200, solid 150, deck resurfacer 75. Railing ≈ 3 sq ft per foot.",
    faq: [["How much stain do I need for a 12x16 deck?", "About 2–3 gallons for two coats."]],
  }),
  mk({
    slug: "porch-cost-calculator", title: "Porch Cost Calculator (Front, Covered & Screened)",
    desc: "Estimate the cost to build a porch — open, covered, screened or enclosed three-season — by size, with railings and steps.",
    inputs: [num("depth", "Porch Depth", 8, 30, 0.5, 4, "ft"), num("width", "Porch Width", 20, 100, 0.5, 4, "ft"), dd("type", "Porch Type", E.PORCH_TYPES, 1), usd("customRate", "Your Price per Sq Ft (0 = typical)", 0, 500, 1), num("railingFeet", "Railing", 28, 500, 1, 0, "ft"), num("steps", "Steps", 3, 20, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["area", "Area (sq ft)", "n"], ["perSqFt", "All-In per Sq Ft", "c"]],
    fn: E.porchCost, ex: { depth: 8, width: 20, type: 1, customRate: 0, railingFeet: 28, steps: 3 },
    exText: (o) => `Example: an 8 × 20 ft covered front porch with railing and steps costs about ${money(o.totalCost)}.`,
    how: "Pick the porch type. A roof tied into the house, foundations and permits drive the cost; screening or enclosing an existing porch costs less than building new.",
    assume: `Typical prices per sq ft: open porch $35, covered $70, screened $90, enclosed three-season $150; railing $35/ft; steps $150 each. ${COST_NOTE}`,
    faq: [["How much does a covered front porch cost?", "About $50–90 per sq ft."]],
  }),
  mk({
    slug: "staircase-cost-calculator", title: "Staircase Cost Calculator",
    desc: "Estimate the cost of a new staircase — straight wood, carpeted or hardwood, L- or U-shaped with a landing, spiral or floating — with railing.",
    inputs: [dd("type", "Staircase", E.STAIRCASES, 2), num("floorHeight", "Floor-to-Floor Height", 9, 14, 0.5, 4, "ft"), num("railingFeet", "Railing / Balustrade", 14, 200, 1, 0, "ft"), usd("railingPerFoot", "Railing Price per Ft", 60, 1000, 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.staircaseCost, ex: { type: 2, floorHeight: 9, railingFeet: 14, railingPerFoot: 60 },
    exText: (o) => `Example: a straight hardwood staircase for a 9 ft floor height with 14 ft of railing costs about ${money(o.totalCost)}.`,
    how: "Pick the style. Moving or adding a staircase also means changing the floor framing and finishes around it.",
    assume: `Typical installed prices for a 9 ft rise: basic wood $2,500, carpeted $3,500, hardwood $6,000, L/U with landing $8,000, spiral kit $5,000, floating/custom $15,000+. ${COST_NOTE}`,
    faq: [["How much does a new staircase cost?", "About $2,000–10,000 for most, much more for custom designs."]],
  }),
  mk({
    slug: "awning-cost-calculator", title: "Awning Size & Cost Calculator",
    desc: "Estimate the cost of a patio or window awning — fixed fabric, manual or motorized retractable, metal or polycarbonate — and a good projection for a window.",
    inputs: [num("width", "Awning Width", 12, 50, 0.5, 2, "ft"), num("projection", "Projection (depth)", 10, 20, 0.5, 1, "ft"), dd("type", "Type", E.AWNINGS, 2), usd("install", "Installation", 500, 5000, 25), num("windowHeight", "Window Height (window awnings, 0 to skip)", 0, 120, 1, 0, "in")],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["area", "Area (sq ft)", "n"], ["projectionMinFt", "Window Awning Projection — Min (ft)", "n"], ["projectionMaxFt", "Window Awning Projection — Max (ft)", "n"]],
    fn: E.awningCost, ex: { width: 12, projection: 10, type: 2, install: 500, windowHeight: 0 },
    exText: (o) => `Example: a 12 × 10 ft motorized retractable awning costs about ${money(o.totalCost)} installed.`,
    how: "Size patio awnings to shade the seating area at the time of day you use it. For window awnings, a projection of about a third to a half of the window height blocks summer sun.",
    assume: `Typical prices per sq ft: fixed fabric $25, manual retractable $35, motorized $55, aluminum $30, polycarbonate/glass $60, plus installation. ${COST_NOTE}`,
    faq: [["How much does a retractable awning cost?", "About $3,000–7,000 installed for a typical patio size."]],
  }),
  mk({
    slug: "gazebo-size-calculator", title: "Gazebo Size Calculator (What Size Gazebo Do I Need?)",
    desc: "Find the right gazebo size for your space — how many people, a dining table or lounge set, a hot tub or grill — with a standard size recommendation.",
    inputs: [num("people", "People", 6, 30, 1, 1), dd("furniture", "Furniture", ["Benches / chairs only", "Dining table", "Lounge set"], 1), dd("hotTub", "Hot Tub Inside?", ["No", "Yes"]), dd("grill", "Grill Under It?", ["No", "Yes"])],
    results: [["size", "Recommended Size", "l", E.GAZEBO_SIZES], ["recommendedSqFt", "Area Needed (sq ft)", "n"], ["squareSideFt", "Square Side (ft)", "n"]],
    fn: E.gazeboSize, ex: { people: 6, furniture: 1, hotTub: 0, grill: 0 },
    exText: (o) => `Example: six people around a dining table need about ${o.recommendedSqFt} sq ft — a ${E.GAZEBO_SIZES[o.size].split(" (")[0]} gazebo.`,
    how: "Pick how you'll use it. Leave at least 3 ft around furniture to walk. Grills need a metal or high-clearance roof and good ventilation — follow the grill maker's clearances.",
    assume: "About 15 sq ft per person, plus 50 sq ft for a dining table, 90 for a lounge set, 100 for a hot tub and 30 for a grill.",
    faq: [["What size gazebo for 6 people?", "About 12 × 12 ft with a table."]],
  }),
  mk({
    slug: "fire-glass-calculator", title: "Fire Glass Calculator (Pounds for a Fire Pit)",
    desc: "Calculate how many pounds of fire glass you need for a round or rectangular fire pit or fire table — with a lava rock or filler base to save glass.",
    inputs: [dd("shape", "Fire Pit Shape", ["Round", "Square / rectangular"]), num("diameter", "Diameter (round)", 36, 120, 0.5, 6, "in"), num("lengthIn", "Length (rectangle)", 36, 200, 0.5, 6, "in"), num("widthIn", "Width (rectangle)", 12, 100, 0.5, 4, "in"), num("depth", "Fill Depth", 4, 12, 0.5, 1, "in"), dd("filler", "Lava Rock / Filler Underneath?", ["No — all glass", "Yes — glass top layer only"]), usd("pricePerLb", "Price per Lb", 4, 30, 0.25)],
    results: [["pounds", "Fire Glass (lb)", "n"], ["bags10lb", "10 lb Bags", "n"], ["glassDepthIn", "Glass Depth (in)", "n"], ["cost", "Glass Cost", "c"]],
    fn: E.firePitGlass, ex: { shape: 0, diameter: 36, lengthIn: 36, widthIn: 12, depth: 4, filler: 1, pricePerLb: 4 },
    exText: (o) => `Example: a 36 in round fire pit with lava rock underneath and a 1.5 in top layer of glass needs about ${o.pounds} lb of fire glass.`,
    how: "Measure the inside of the burner pan. Fire glass should cover the burner by about 1–2 in; filling the bottom with lava rock or a pan insert saves a lot of glass.",
    assume: "Fire glass ≈ 100 lb per cu ft: pounds ≈ length × width × depth (in) ÷ 17.3 (round: diameter² × 0.785 × depth ÷ 17.3). Seller charts vary; use glass only with gas burners rated for it.",
    faq: [["How much fire glass do I need for a 36 inch fire pit?", "About 60–80 lb for 1.5 in of glass, or 100–120 lb for 2–3 in — less with a lava rock base."]],
  }),
  mk({
    slug: "pergola-calculator", title: "Pergola Material Calculator (Posts, Beams, Rafters & Slats)",
    desc: "Calculate pergola lumber — posts, doubled beams, rafters and top slats with overhangs — a beam size suggestion for your post spacing and concrete for the posts.",
    inputs: [num("length", "Pergola Length (beam direction)", 12, 40, 0.5, 4, "ft"), num("width", "Pergola Width (rafter direction)", 12, 30, 0.5, 4, "ft"), num("overhang", "Overhang Each End", 1, 3, 0.5, 0, "ft"), num("postSpacing", "Maximum Post Spacing", 10, 16, 0.5, 4, "ft"), num("rafterSpacing", "Rafter Spacing", 16, 36, 1, 12, "in"), num("slatSpacing", "Top Slat Spacing", 12, 24, 1, 4, "in")],
    results: [["posts", "Posts", "n"], ["beamSize", "Beam Size", "l", E.PERGOLA_BEAMS], ["beamBoards", "Beam Boards", "n"], ["beamLengthFt", "Beam Length (ft)", "n"], ["rafters", "Rafters", "n"], ["rafterLengthFt", "Rafter Length (ft)", "n"], ["topSlats", "Top Slats", "n"], ["concreteBags", "80 lb Concrete Bags", "n"]],
    fn: E.pergola, ex: { length: 12, width: 12, overhang: 1, postSpacing: 10, rafterSpacing: 16, slatSpacing: 12 },
    exText: (o) => `Example: a 12 × 12 ft pergola needs ${o.posts} posts, ${o.beamBoards} beam boards of ${o.beamLengthFt} ft, ${o.rafters} rafters of ${o.rafterLengthFt} ft and ${o.topSlats} top slats.`,
    how: "Posts carry doubled beams along the length; rafters run across them and slats across the rafters. Use 6×6 posts for pergolas over about 10 ft tall or with heavy roofs, and anchor posts to proper footings.",
    assume: "Posts on both sides; two doubled beams (4 boards); three bags of concrete per post. Beam suggestions are typical practice — wind, snow and roof panels can require larger members.",
    faq: [["How far can a pergola beam span?", "About 8–12 ft for doubled 2×8 to 2×12 beams."]],
  }),
  mk({
    slug: "balcony-cost-calculator", title: "Balcony Cost Calculator",
    desc: "Estimate the cost to add a balcony — wood or composite, prefab steel bolt-on, cantilevered concrete or a Juliet balcony — with railing and engineering.",
    inputs: [dd("type", "Balcony Type", E.BALCONIES), num("depth", "Depth", 5, 12, 0.5, 2, "ft"), num("width", "Width", 10, 40, 0.5, 3, "ft"), dd("railing", "Railing", ["Wood", "Aluminum", "Glass"], 1), usd("engineering", "Engineering & Permit", 1500, 20000, 50)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["area", "Area (sq ft)", "n"]],
    fn: E.balconyCost, ex: { type: 0, depth: 5, width: 10, railing: 1, engineering: 1500 },
    exText: (o) => `Example: a 5 × 10 ft wood balcony with aluminum railing costs about ${money(o.totalCost)} including engineering.`,
    how: "Adding a balcony to an upper floor almost always needs an engineer and a permit — the attachment to the house and the door opening are the critical parts.",
    assume: `Typical prices: wood/composite $60 per sq ft, prefab steel $100, cantilevered concrete $150, Juliet balcony about $2,500; railing $40 (wood), $60 (aluminum), $200 (glass) per ft. ${COST_NOTE}`,
    faq: [["How much does it cost to add a balcony?", "Often $5,000–25,000 depending on type and size."]],
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
