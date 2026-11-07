// One-time (but safe to re-run) batch setup script: creates 27 calculators in House & Garden
// Calculators > Home Building, Remodel & Cleaning Cost Calculators (remodel, addition, repair, remediation and replacement costs). Formulas live in src/lib/calc-engine-hg-home2.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-home2-calculators.ts
// or
//   npm run db:create-hg-home2-calculators

import * as E from "../src/lib/calc-engine-hg-home2";

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

const CAT = "home-building-remodel-cleaning-cost-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region — get at least three local quotes.";
const ADJ = num("adjust", "Local Price Adjustment", 0, 200, 1, -50, "%");
const COSTRES: Line[] = [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]];
const plus = (...l: Line[]): Line[] => [...COSTRES, ...l];

const TOOLS: ToolDef[] = [
  mk({
    slug: "mold-remediation-cost-calculator", title: "Mold Remediation Cost Calculator",
    desc: "Estimate mold remediation (removal) cost from the affected area and how severe it is — with mold testing and HVAC duct cleaning.",
    inputs: [num("area", "Affected Area", 50, 10000, 1, 1, "sq ft"), dd("severity", "Severity", E.MOLD_LEVELS, 1), usd("testing", "Mold Inspection & Testing", 500, 5000, 10), usd("hvac", "HVAC / Duct Cleaning", 0, 10000, 10), ADJ],
    results: COSTRES, fn: E.moldRemediationCost, ex: { area: 50, severity: 1, testing: 500, hvac: 0, adjust: 0 },
    exText: (o) => `Example: remediating 50 sq ft of moderate mold with testing costs about ${money(o.totalCost)}.`,
    how: "The EPA says you can usually clean under about 10 sq ft yourself. Larger areas need containment, HEPA air scrubbers and removal of damaged drywall. Fix the moisture source first or the mold comes back.",
    assume: `$12 / $20 / $30 per sq ft by severity, minimum $500; rebuilding finishes is extra. ${COST_NOTE}`,
    faq: [["How much does mold remediation cost?", "Typically $1,200–3,500, and $10,000+ for whole attics, crawl spaces or HVAC systems."]],
  }),
  mk({
    slug: "second-story-addition-cost-calculator", title: "Second Story Addition Cost Calculator",
    desc: "Estimate the cost to add a second story (two-story addition) — per square foot by finish level, structural reinforcement, design and permits, and temporary housing.",
    inputs: [num("sqft", "Second Story Size", 1000, 10000, 10, 100, "sq ft"), dd("finish", "Finish Level", E.FINISH_LEVELS, 1), usd("structural", "Foundation & Structural Reinforcement", 15000, 500000, 500), pct("designPct", "Design, Engineering & Permits", 10, 30, 0.5), num("months", "Months Living Elsewhere", 4, 24, 1, 0), usd("rent", "Temporary Housing per Month", 2500, 20000, 50), ADJ],
    results: plus(["perSqFt", "All-in Cost per Sq Ft", "c"]), fn: E.secondStoryAdditionCost, ex: { sqft: 1000, finish: 1, structural: 15000, designPct: 10, months: 4, rent: 2500, adjust: 0 },
    exText: (o) => `Example: a 1,000 sq ft mid-range second story costs about ${money(o.totalCost)} all-in — ${money(o.perSqFt)} per sq ft.`,
    how: "A structural engineer must confirm the foundation and walls can carry a second floor — reinforcing them is the big unknown. You'll usually need to move out while the roof is off.",
    assume: `$300 / $400 / $550 per sq ft by finish. ${COST_NOTE}`,
    faq: [["How much does a second story addition cost?", "About $300–550 per sq ft — often $300,000–600,000 for 1,000 sq ft."]],
  }),
  mk({
    slug: "pest-control-cost-calculator", title: "Pest Control & Termite Treatment Cost Calculator",
    desc: "Estimate pest control and termite treatment cost — quarterly pest plans, liquid termite barriers, bait stations, tent fumigation, bed bug heat treatment and rodent exclusion — plus termite damage repair.",
    inputs: [dd("treatment", "Treatment", E.PEST_TREATMENTS, 1), num("sqft", "Home Size", 2000, 20000, 10, 100, "sq ft"), num("perimeter", "Foundation Perimeter", 180, 2000, 1, 0, "ft"), usd("damageRepair", "Termite Damage Repair", 0, 200000, 50), ADJ],
    results: plus(["treatmentCost", "Treatment Only", "c"]), fn: E.pestControlCost, ex: { treatment: 1, sqft: 2000, perimeter: 180, damageRepair: 0, adjust: 0 },
    exText: (o) => `Example: a liquid termite barrier around a 180 ft foundation costs about ${money(o.totalCost)}.`,
    how: "Liquid barriers (e.g. fipronil) protect 5+ years; bait systems need yearly monitoring. Fumigation is for drywood termites. Termite damage repair runs $500 to $10,000+ if framing must be replaced.",
    assume: `Quarterly plan $120 a visit; liquid barrier $300 + $8 per linear ft; bait $1,500; fumigation $500 + $2.50 per sq ft; bed bug heat $300 + $2 per sq ft; rodent exclusion $600. ${COST_NOTE}`,
    faq: [["How much does termite treatment cost?", "About $1,000–2,500 for a liquid barrier and $1,500–3,000 for bait stations."]],
  }),
  mk({
    slug: "stair-lift-cost-calculator", title: "Stair Lift Cost Calculator",
    desc: "Estimate stair lift cost installed — straight, curved, outdoor or heavy-duty — for one or more staircases, with extras like a powered swivel seat or folding rail.",
    inputs: [dd("type", "Stair Lift Type", E.STAIR_TYPES), num("staircases", "Staircases", 1, 5, 1, 1), usd("extras", "Extras (powered swivel, folding rail)", 0, 10000, 10), ADJ],
    results: COSTRES, fn: E.stairLiftCost, ex: { type: 0, staircases: 1, extras: 0, adjust: 0 },
    exText: (o) => `Example: a straight stair lift costs about ${money(o.totalCost)} installed.`,
    how: "Curved lifts need a custom rail, so they cost far more and can't easily be resold. Ask about rentals and reconditioned units for short-term needs. Medicare doesn't cover stair lifts, but some Medicaid waivers and VA grants do.",
    assume: `Installed: straight $4,000, curved $12,000, outdoor $6,000, heavy-duty $6,500. ${COST_NOTE}`,
    faq: [["How much does a stair lift cost?", "About $3,000–6,000 for a straight staircase and $10,000–15,000+ for curved."]],
  }),
  mk({
    slug: "impact-window-cost-calculator", title: "Hurricane Impact Window Cost Calculator",
    desc: "Estimate hurricane impact window cost installed — by window count, size and frame (vinyl, aluminum, fiberglass) — plus impact sliding doors.",
    inputs: [num("windows", "Windows", 12, 200, 1, 0), num("sizeSqFt", "Average Window Size", 15, 100, 0.5, 2, "sq ft"), dd("frame", "Frame", E.IMPACT_FRAMES), num("doors", "Impact Sliding / French Doors", 0, 20, 1, 0), ADJ],
    results: plus(["perWindow", "Cost per Window", "c"]), fn: E.impactWindowCost, ex: { windows: 12, sizeSqFt: 15, frame: 0, doors: 0, adjust: 0 },
    exText: (o) => `Example: 12 vinyl impact windows averaging 15 sq ft cost about ${money(o.totalCost)} installed — ${money(o.perWindow)} each.`,
    how: "In Florida's high-velocity hurricane zones, windows need Miami-Dade or Florida Product Approval. Impact windows can lower windstorm insurance premiums — ask your insurer for the wind mitigation discount.",
    assume: `$70 / $80 / $100 per sq ft installed by frame; impact doors $4,000 each. ${COST_NOTE}`,
    faq: [["How much do hurricane impact windows cost?", "About $1,000–2,000 per window installed — $15,000–40,000 for a typical house."]],
  }),
  mk({
    slug: "water-damage-repair-cost-calculator", title: "Water Damage Repair Cost Calculator",
    desc: "Estimate water damage restoration cost — water extraction and drying by water category, then rebuilding drywall, flooring and contents.",
    inputs: [num("area", "Affected Area", 200, 10000, 1, 1, "sq ft"), dd("category", "Water Type", E.WATER_CATEGORIES), usd("rebuildPerSqFt", "Rebuild per Sq Ft (drywall, flooring)", 10, 200, 0.5), usd("contents", "Contents Cleaning / Replacement", 0, 100000, 50), ADJ],
    results: plus(["dryingCost", "Extraction & Drying", "c"], ["rebuildCost", "Rebuild", "c"]), fn: E.waterDamageRepairCost, ex: { area: 200, category: 0, rebuildPerSqFt: 10, contents: 0, adjust: 0 },
    exText: (o) => `Example: drying and rebuilding 200 sq ft after a clean-water leak costs about ${money(o.totalCost)}.`,
    how: "Start drying within 24–48 hours to prevent mold. Homeowners insurance usually covers sudden leaks (burst pipes) but not floods or slow leaks — call your insurer before work starts and photograph everything.",
    assume: `Drying $4 / $5.50 / $7.50 per sq ft by IICRC category. ${COST_NOTE}`,
    faq: [["How much does water damage repair cost?", "About $3–7.50 per sq ft for drying, plus rebuild — often $2,500–8,000 per room."]],
  }),
  mk({
    slug: "tub-to-shower-cost-calculator", title: "Tub to Shower Conversion Cost Calculator",
    desc: "Estimate the cost to convert a bathtub to a shower — prefab kit, one-day acrylic conversion, custom tile or curbless walk-in — with a glass door, plumbing changes and grab bars.",
    inputs: [dd("type", "Shower Type", E.SHOWER_TYPES, 1), usd("glassDoor", "Glass Door / Enclosure", 1200, 10000, 10), usd("plumbing", "Plumbing Changes", 0, 10000, 10), num("grabBars", "Grab Bars", 0, 10, 1, 0), ADJ],
    results: COSTRES, fn: E.tubToShowerCost, ex: { type: 1, glassDoor: 1200, plumbing: 0, grabBars: 0, adjust: 0 },
    exText: (o) => `Example: a one-day acrylic tub-to-shower conversion with a glass door costs about ${money(o.totalCost)}.`,
    how: "One-day acrylic systems fit over the existing footprint; tile and curbless showers need demolition, a new pan and waterproofing. Keep at least one tub in the house if you may sell to families.",
    assume: `Installed: prefab $4,500, one-day acrylic $7,500, custom tile $11,000, curbless $15,000. ${COST_NOTE}`,
    faq: [["How much does a one-day tub to shower conversion cost?", "Usually about $6,000–10,000."]],
  }),
  mk({
    slug: "crawl-space-encapsulation-cost-calculator", title: "Crawl Space Encapsulation Cost Calculator",
    desc: "Estimate crawl space encapsulation cost — vapor barrier by thickness, dehumidifier, sump pump and crawl space cleaning.",
    inputs: [num("area", "Crawl Space Area", 1500, 10000, 10, 50, "sq ft"), dd("liner", "Vapor Barrier", ["10 mil", "12–15 mil", "20 mil reinforced"], 1), usd("dehumidifier", "Dehumidifier", 1800, 5000, 10), usd("sump", "Sump Pump", 0, 5000, 10), usd("cleanup", "Cleaning / Debris Removal", 1000, 10000, 10), ADJ],
    results: plus(["linerCost", "Barrier & Sealing", "c"]), fn: E.crawlSpaceEncapsulationCost, ex: { area: 1500, liner: 1, dehumidifier: 1800, sump: 0, cleanup: 1000, adjust: 0 },
    exText: (o) => `Example: encapsulating a 1,500 sq ft crawl space with a dehumidifier and cleanup costs about ${money(o.totalCost)}.`,
    how: "Full encapsulation seals the floor and walls, closes the vents and adds a dehumidifier. Fix standing water and grading first. Mold or wet insulation removal adds cost.",
    assume: `$4.50 / $5.50 / $7 per sq ft by liner thickness. ${COST_NOTE}`,
    faq: [["How much does crawl space encapsulation cost?", "About $5,000–15,000 for most homes."]],
  }),
  mk({
    slug: "closet-cost-calculator", title: "Custom Closet Cost Calculator (Fitted Wardrobe Price)",
    desc: "Estimate custom closet or fitted wardrobe cost by linear feet of shelving and material — wire, laminate system or custom wood — with doors and accessories.",
    inputs: [num("linearFeet", "Shelving / Wall Length", 12, 200, 0.5, 1, "ft"), dd("material", "System", E.CLOSET_MATERIALS, 1), num("doors", "Doors", 0, 20, 1, 0), usd("accessories", "Accessories (drawers, lighting)", 500, 20000, 10), ADJ],
    results: COSTRES, fn: E.closetCost, ex: { linearFeet: 12, material: 1, doors: 0, accessories: 500, adjust: 0 },
    exText: (o) => `Example: 12 ft of laminate closet system with accessories costs about ${money(o.totalCost)} installed.`,
    how: "Measure every wall that gets shelving. Drawers, islands and lighting add the most cost. In the UK, fitted wardrobes are usually priced per door — about £500–1,000 per door.",
    assume: `Per linear ft installed: wire $30, laminate $200, custom wood $400; doors $300 each. ${COST_NOTE}`,
    faq: [["How much does a custom closet cost?", "About $1,000–3,000 for a reach-in and $3,000–10,000+ for a walk-in."]],
  }),
  mk({
    slug: "front-door-cost-calculator", title: "Front Door Replacement Cost Calculator",
    desc: "Estimate the cost to replace a front door or patio door — steel, fiberglass, wood, sliding or French — with sidelights, transom, hardware and a new frame.",
    inputs: [dd("type", "Door Type", E.ENTRY_DOORS), num("sidelights", "Sidelights", 0, 2, 1, 0), dd("transom", "Transom Window", ["No", "Yes"]), dd("frame", "Replacement", ["Pre-hung door into existing opening", "New frame & trim repair"]), usd("hardware", "Lockset & Hardware", 200, 3000, 10), ADJ],
    results: COSTRES, fn: E.frontDoorCost, ex: { type: 0, sidelights: 0, transom: 0, frame: 0, hardware: 200, adjust: 0 },
    exText: (o) => `Example: replacing a front door with a pre-hung steel door costs about ${money(o.totalCost)} installed.`,
    how: "Steel entry doors recoup the most at resale. Measure the rough opening, not the old slab. Fiberglass resists dents and rot; wood looks best but needs refinishing.",
    assume: `Installed: steel $1,800, fiberglass $2,500, wood $3,500, sliding patio $3,000, French $4,500; sidelights $800 each. ${COST_NOTE}`,
    faq: [["How much does it cost to replace a front door?", "About $1,000–3,500 installed, more with sidelights."]],
  }),
  mk({
    slug: "sunroom-cost-calculator", title: "Sunroom & Screened Porch Cost Calculator (Lanai Enclosure)",
    desc: "Estimate sunroom, screened porch or lanai enclosure cost per square foot — screen enclosure, screened porch, three-season or four-season room — with foundation and heating & cooling.",
    inputs: [num("sqft", "Room Size", 200, 2000, 10, 20, "sq ft"), dd("type", "Room Type", E.SUNROOM_TYPES, 2), usd("foundation", "New Slab / Foundation", 0, 50000, 50), usd("hvac", "Heating & Cooling (mini-split)", 0, 20000, 50), ADJ],
    results: plus(["perSqFt", "Cost per Sq Ft", "c"]), fn: E.sunroomCost, ex: { sqft: 200, type: 2, foundation: 0, hvac: 0, adjust: 0 },
    exText: (o) => `Example: a 200 sq ft three-season room costs about ${money(o.totalCost)}.`,
    how: "A screen enclosure over an existing patio is the cheapest; a four-season room is a true addition with insulation, permits and HVAC. In Florida, pool cages and lanai screens are priced per sq ft of enclosure.",
    assume: `Per sq ft: screen enclosure $20, screened porch $60, three-season $175, four-season $300. ${COST_NOTE}`,
    faq: [["How much does a sunroom cost?", "About $25,000–50,000 for a three-season room and $50,000–100,000 for a four-season room."]],
  }),
  mk({
    slug: "interior-demolition-cost-calculator", title: "Interior Demolition Cost Calculator",
    desc: "Estimate interior demolition cost — light strip-out, full gut, bathroom or kitchen demo — with a dumpster and asbestos testing.",
    inputs: [num("area", "Area to Demolish", 100, 50000, 1, 10, "sq ft"), dd("scope", "Scope", E.DEMO_SCOPES, 1), usd("dumpster", "Dumpster", 500, 5000, 10), usd("testing", "Asbestos / Lead Testing", 0, 2000, 10), ADJ],
    results: COSTRES, fn: E.interiorDemolitionCost, ex: { area: 100, scope: 1, dumpster: 500, testing: 0, adjust: 0 },
    exText: (o) => `Example: gutting 100 sq ft to the studs with a dumpster costs about ${money(o.totalCost)}.`,
    how: "Test for asbestos and lead before demolishing in homes built before 1980. Shut off and cap utilities first. Load-bearing walls need an engineer — see the wall removal calculator.",
    assume: `Per sq ft: strip-out $2.50, full gut $6, bathroom $25, kitchen $15. ${COST_NOTE}`,
    faq: [["How much does bathroom demolition cost?", "About $1,000–2,000 for a typical bathroom."]],
  }),
  mk({
    slug: "shed-removal-cost-calculator", title: "Shed Removal Cost Calculator",
    desc: "Estimate shed removal and demolition cost by size and material — plastic, metal or wood — with concrete slab removal and haul-off.",
    inputs: [num("area", "Shed Size", 120, 2000, 1, 10, "sq ft"), dd("type", "Shed Material", E.SHED_TYPES, 2), dd("slab", "Remove Concrete Slab?", ["No", "Yes"]), usd("dump", "Dump / Haul Fees", 150, 3000, 10), ADJ],
    results: COSTRES, fn: E.shedRemovalCost, ex: { area: 120, type: 2, slab: 0, dump: 150, adjust: 0 },
    exText: (o) => `Example: removing a 10 × 12 ft wood shed costs about ${money(o.totalCost)} with haul-off.`,
    how: "Junk removal companies often price by truckload. Metal sheds can be scrapped. Check for electrical lines and old chemicals before demolition.",
    assume: `Per sq ft: plastic $3, metal $4, wood $6; slab $6 per sq ft; minimum $250. ${COST_NOTE}`,
    faq: [["How much does it cost to remove a shed?", "About $400–1,500, more with a concrete slab."]],
  }),
  mk({
    slug: "glass-block-window-cost-calculator", title: "Glass Block Window Cost Calculator",
    desc: "Estimate glass block window cost installed — mortared, prefab vinyl-framed or with an air vent — for basements and bathrooms.",
    inputs: [num("windows", "Windows", 3, 100, 1, 1), num("sizeSqFt", "Size per Window (32 × 16 in ≈ 3.5 sq ft)", 3.5, 50, 0.25, 1, "sq ft"), dd("type", "Type", ["Mortared on site", "Prefab vinyl-framed panel", "With air vent / dryer vent"]), ADJ],
    results: plus(["perWindow", "Cost per Window", "c"]), fn: E.glassBlockWindowCost, ex: { windows: 3, sizeSqFt: 3.5, type: 0, adjust: 0 },
    exText: (o) => `Example: three 32 × 16 in basement glass block windows cost about ${money(o.totalCost)} — ${money(o.perWindow)} each.`,
    how: "Glass block windows add security and privacy but can't be used as bedroom egress windows. Include a vent where you need airflow, such as a bathroom or laundry room.",
    assume: `$150 per window plus $90 / $100 / $120 per sq ft by type. ${COST_NOTE}`,
    faq: [["How much does a glass block window cost?", "About $400–800 installed for a typical basement window."]],
  }),
  mk({
    slug: "basement-waterproofing-cost-calculator", title: "Basement Waterproofing Cost Calculator",
    desc: "Estimate basement waterproofing cost — interior sealant, interior drain tile (French drain) or exterior excavation and membrane — with a sump pump and crack repair.",
    inputs: [dd("method", "Method", E.WATERPROOF_METHODS, 1), num("perimeter", "Basement Perimeter", 140, 2000, 1, 10, "ft"), num("wallHeight", "Wall Height (sealant)", 8, 12, 0.5, 2, "ft"), usd("sump", "Sump Pump & Basin", 1500, 5000, 10), num("cracks", "Cracks to Inject", 0, 50, 1, 0), ADJ],
    results: plus(["mainCost", "Main Waterproofing", "c"]), fn: E.basementWaterproofingCost, ex: { method: 1, perimeter: 140, wallHeight: 8, sump: 1500, cracks: 0, adjust: 0 },
    exText: (o) => `Example: interior drain tile around a 140 ft basement with a sump pump costs about ${money(o.totalCost)}.`,
    how: "Fix gutters, downspouts and grading first — they're the cheapest cure. Sealants only help with damp walls, not hydrostatic pressure. Exterior membranes are most effective but need excavation.",
    assume: `Sealant $6 per sq ft of wall; interior drain $70 and exterior $150 per linear ft; crack injection $500 each. ${COST_NOTE}`,
    faq: [["How much does basement waterproofing cost?", "About $5,000–15,000 for interior drain tile and $15,000–30,000+ for exterior work."]],
  }),
  mk({
    slug: "asbestos-abatement-cost-calculator", title: "Asbestos Abatement & Removal Cost Calculator",
    desc: "Estimate asbestos abatement cost by material and area — popcorn ceilings, floor tiles, pipe insulation, siding, vermiculite or drywall — with testing, clearance and the encapsulation alternative.",
    inputs: [num("area", "Area", 500, 50000, 1, 10, "sq ft"), dd("material", "Material", E.ASBESTOS_MATERIALS), usd("testing", "Testing / Inspection", 500, 5000, 10), usd("clearance", "Air Clearance Test", 300, 3000, 10), ADJ],
    results: plus(["encapsulationCost", "Encapsulation Instead", "c"]), fn: E.asbestosAbatementCost, ex: { area: 500, material: 0, testing: 500, clearance: 300, adjust: 0 },
    exText: (o) => `Example: removing 500 sq ft of asbestos popcorn ceiling costs about ${money(o.totalCost)} with testing and clearance.`,
    how: "Never sand or scrape suspected asbestos. Have it tested first (homes built before 1980). Undamaged material can often be left or encapsulated instead. Many states require licensed abatement contractors.",
    assume: `Per sq ft: popcorn ceiling $5, floor tile $6, pipe insulation $15, siding/roofing $8, vermiculite $10, drywall $7; minimum $1,500. ${COST_NOTE}`,
    faq: [["How much does asbestos removal cost?", "About $5–15 per sq ft — often $1,500–5,000 for a single area."]],
  }),
  mk({
    slug: "furnish-house-cost-calculator", title: "Cost to Furnish a House Calculator",
    desc: "Estimate the cost to furnish a house or apartment room by room — bedrooms, living rooms, dining, office and kitchen essentials — on a budget, mid-range or high-end budget.",
    inputs: [dd("tier", "Budget Level", E.BUDGET_TIERS, 1), num("bedrooms", "Bedrooms", 3, 20, 1, 0), num("living", "Living / Family Rooms", 1, 10, 1, 0), num("dining", "Dining Areas", 1, 5, 1, 0), num("offices", "Home Offices", 1, 5, 1, 0), usd("outdoor", "Outdoor Furniture", 0, 100000, 50), ADJ],
    results: COSTRES, fn: E.furnishHouseCost, ex: { tier: 1, bedrooms: 3, living: 1, dining: 1, offices: 1, outdoor: 0, adjust: 0 },
    exText: (o) => `Example: furnishing a 3-bedroom house at mid-range prices costs about ${money(o.totalCost)}.`,
    how: "Buy the big-use pieces first (beds, sofa, dining table) and fill in over time. Rugs, lamps, window treatments and décor typically add 15–25%.",
    assume: "Per room (budget / mid / high): bedroom $1,500 / $4,000 / $10,000; living room $2,500 / $6,000 / $15,000; dining $1,000 / $3,000 / $8,000; office $700 / $2,000 / $5,000; kitchen essentials $800 / $2,000 / $5,000.",
    faq: [["How much does it cost to furnish a house?", "About $15,000–30,000 for a mid-range 3-bedroom home."]],
  }),
  mk({
    slug: "double-glazing-cost-calculator", title: "Double Glazing & uPVC Window Cost Calculator",
    desc: "Estimate double glazing and uPVC window cost — uPVC, aluminium, timber or triple glazing — by number and size of windows, plus patio or French doors.",
    inputs: [num("windows", "Windows", 8, 100, 1, 1), dd("type", "Frame & Glazing", E.GLAZING_TYPES), dd("size", "Typical Size", E.WINDOW_SIZES, 1), num("doors", "Patio / French Doors", 0, 10, 1, 0), ADJ],
    results: plus(["perWindow", "Cost per Window", "c"]), fn: E.doubleGlazingCost, ex: { windows: 8, type: 0, size: 1, doors: 0, adjust: 0 },
    exText: (o) => `Example: 8 medium uPVC double-glazed windows cost about ${money(o.totalCost)} fitted — ${money(o.perWindow)} each.`,
    how: "Prices here are US dollars. In the UK, uPVC double glazing typically costs about £400–1,000 per window fitted and £5,000–8,000 for a 3-bed semi — enter your quote as the adjustment. Look for an A-rated window and a FENSA or CERTASS installer.",
    assume: `Per window installed (medium): uPVC $750, aluminium $1,100, timber $1,400, triple glazed $950; × 0.8 small, × 1.4 large; doors $2,500. ${COST_NOTE}`,
    faq: [["How much does double glazing cost?", "About $600–1,400 per window in the US or £400–1,000 in the UK."]],
  }),
  mk({
    slug: "extension-cost-calculator", title: "House Extension Cost Calculator (Single & Double Storey)",
    desc: "Estimate house extension cost — single-storey, double-storey or kitchen extension — by floor area and specification, per square foot and per square metre, with design and approvals.",
    inputs: [num("sqft", "Extension Floor Area (1 m² = 10.76 sq ft)", 300, 5000, 10, 20, "sq ft"), dd("type", "Extension Type", E.EXTENSION_TYPES), dd("spec", "Specification", E.SPEC_LEVELS, 1), pct("designPct", "Design, Structural & Approvals", 12, 30, 0.5), ADJ],
    results: plus(["perSqFt", "Build Cost per Sq Ft", "c"], ["perSqM", "Build Cost per m²", "c"]), fn: E.extensionCost, ex: { sqft: 300, type: 0, spec: 1, designPct: 12, adjust: 0 },
    exText: (o) => `Example: a 300 sq ft (28 m²) standard single-storey extension costs about ${money(o.totalCost)} — ${money(o.perSqFt)} per sq ft.`,
    how: "Double-storey extensions cost less per square foot because they share one foundation and roof. In the UK, single-storey extensions typically run about £2,000–3,000 per m² in 2026 — use the adjustment to match local quotes.",
    assume: `Per sq ft (standard): single-storey $250, double-storey $220, kitchen $300; ×0.85 basic, ×1.35 high spec. ${COST_NOTE}`,
    faq: [["How much does a single storey extension cost?", "About $200–350 per sq ft in the US, or £2,000–3,000 per m² in the UK."]],
  }),
  mk({
    slug: "conservatory-cost-calculator", title: "Conservatory Cost Calculator (incl. Roof Replacement)",
    desc: "Estimate conservatory cost by style and size — lean-to, Victorian, gable or orangery — or the cost to replace a conservatory roof with a solid tiled roof or new glazing.",
    inputs: [dd("job", "Job", E.CONSERVATORY_JOBS), dd("style", "Style (new builds)", E.CONSERVATORY_STYLES), num("sqft", "Floor Area", 120, 1000, 1, 20, "sq ft"), usd("base", "Base / Foundation (new builds)", 3000, 30000, 50), ADJ],
    results: COSTRES, fn: E.conservatoryCost, ex: { job: 0, style: 0, sqft: 120, base: 3000, adjust: 0 },
    exText: (o) => `Example: a 120 sq ft lean-to conservatory costs about ${money(o.totalCost)} with its base.`,
    how: "Swapping a polycarbonate roof for a solid insulated roof makes a conservatory usable year-round. For roof replacements, set the base to 0. Many small conservatories don't need planning permission in the UK, but solid roofs need building regulations approval.",
    assume: `New per sq ft: lean-to $200, Victorian $240, gable $260, orangery $320; solid roof $120 and glass roof $90 per sq ft. ${COST_NOTE}`,
    faq: [["How much does a conservatory roof replacement cost?", "Roughly $10,000–20,000 for a solid tiled roof on a typical conservatory."]],
  }),
  mk({
    slug: "loft-conversion-cost-calculator", title: "Loft Conversion Cost Calculator",
    desc: "Estimate loft (attic) conversion cost — rooflight, dormer, hip-to-gable or mansard — by floor area, with an en-suite bathroom and new staircase.",
    inputs: [dd("type", "Conversion Type", E.LOFT_TYPES, 1), num("sqft", "Usable Floor Area", 300, 3000, 10, 50, "sq ft"), usd("bathroom", "En-Suite Bathroom", 10000, 50000, 100), usd("stairs", "New Staircase", 4000, 20000, 50), ADJ],
    results: plus(["perSqFt", "Cost per Sq Ft", "c"]), fn: E.loftConversionCost, ex: { type: 1, sqft: 300, bathroom: 10000, stairs: 4000, adjust: 0 },
    exText: (o) => `Example: a 300 sq ft dormer loft conversion with an en-suite and stairs costs about ${money(o.totalCost)}.`,
    how: "You need about 7.5 ft (2.2 m) of head height at the highest point. Rooflight conversions are cheapest; mansards add the most room. UK guide: about £25,000–45,000 for a rooflight, £45,000–70,000 for a dormer and £60,000–90,000+ for a mansard.",
    assume: `Per sq ft: rooflight $150, dormer $220, hip-to-gable $250, mansard $300. ${COST_NOTE}`,
    faq: [["How much does a loft conversion cost?", "About $45,000–90,000 in the US or £45,000–70,000 for a UK dormer."]],
  }),
  mk({
    slug: "interior-design-cost-calculator", title: "Interior Design Cost Calculator (Designer Fees & Budget)",
    desc: "Estimate interior designer fees — hourly, percentage of project, per square foot or flat fee — and your total interior design budget including furnishings.",
    inputs: [dd("feeType", "Fee Structure", E.DESIGN_FEES, 1), usd("budget", "Project / Furnishing Budget", 50000, 10000000, 500), pct("percent", "Percentage Fee", 15, 40, 0.5), num("hours", "Hours (hourly)", 40, 2000, 1, 0), usd("rate", "Hourly Rate", 150, 1000, 5), num("sqft", "Area (per sq ft)", 1500, 50000, 10, 0, "sq ft"), usd("perSqFt", "Fee per Sq Ft", 7, 50, 0.25), usd("flat", "Flat Fee", 5000, 500000, 50)],
    results: [["designFee", "Design Fee", "c"], ["totalProject", "Total With Budget", "c"], ["feeShare", "Fee as % of Budget", "n"]],
    fn: E.interiorDesignCost, ex: { feeType: 1, budget: 50000, percent: 15, hours: 40, rate: 150, sqft: 1500, perSqFt: 7, flat: 5000 },
    exText: (o) => `Example: a designer charging 15% on a $50,000 project costs ${money(o.designFee)} — ${money(o.totalProject)} total.`,
    how: "Ask whether the designer marks up furniture (often 20–35%) or passes on trade discounts. E-design services cost a few hundred dollars per room for a plan you carry out yourself.",
    assume: `Typical fees: $100–300 an hour, 10–30% of the project, or $5–15 per sq ft. ${COST_NOTE}`,
    faq: [["How much does an interior designer cost?", "About $100–300 an hour or 10–30% of the project cost."]],
  }),
  mk({
    slug: "garage-conversion-cost-calculator", title: "Garage Conversion Cost Calculator",
    desc: "Estimate garage conversion cost — basic finished room, bedroom or office with HVAC, or a full apartment / ADU with kitchen and bathroom — with the garage door infill and permits.",
    inputs: [num("sqft", "Garage Size (1-car ≈ 240, 2-car ≈ 480)", 480, 2000, 10, 100, "sq ft"), dd("level", "Conversion", E.GARAGE_LEVELS, 1), usd("doorInfill", "Garage Door Infill Wall & Window", 3000, 20000, 50), usd("permits", "Permits & Plans", 1500, 20000, 50), ADJ],
    results: plus(["perSqFt", "Cost per Sq Ft", "c"]), fn: E.garageConversionCost, ex: { sqft: 480, level: 1, doorInfill: 3000, permits: 1500, adjust: 0 },
    exText: (o) => `Example: converting a 2-car garage into a bedroom or office costs about ${money(o.totalCost)}.`,
    how: "Raise or insulate the slab, add egress for a bedroom, and check whether you must replace the lost parking. An ADU needs utility connections and may need its own address.",
    assume: `Per sq ft: basic $60, room with HVAC $100, ADU $200. ${COST_NOTE}`,
    faq: [["How much does a garage conversion cost?", "About $20,000–50,000 for a room and $60,000–150,000 for an ADU."]],
  }),
  mk({
    slug: "home-staging-cost-calculator", title: "Home Staging Cost Calculator",
    desc: "Estimate home staging cost to sell — vacant staging with rented furniture by rooms and months, or occupied staging using your furniture.",
    inputs: [dd("type", "Staging Type", E.STAGING_TYPES), num("rooms", "Rooms to Stage", 4, 20, 1, 1), num("months", "Months on Market", 2, 12, 1, 1), usd("monthlyPerRoom", "Furniture Rental per Room per Month", 500, 3000, 10), usd("setupFee", "Design, Delivery & Setup", 1500, 10000, 10), usd("consultation", "Consultation (occupied)", 400, 2000, 10)],
    results: COSTRES, fn: E.homeStagingCost, ex: { type: 0, rooms: 4, months: 2, monthlyPerRoom: 500, setupFee: 1500, consultation: 400 },
    exText: (o) => `Example: staging 4 rooms of a vacant home for 2 months costs about ${money(o.totalCost)}.`,
    how: "Stage the living room, primary bedroom, kitchen and dining room first — they matter most to buyers. Some agents pay for staging or a consultation.",
    assume: `Occupied staging adds $300 per room. ${COST_NOTE}`,
    faq: [["How much does home staging cost?", "About $1,500–5,000 for a vacant home's first month and $500–700 per room after that."]],
  }),
  mk({
    slug: "house-material-cost-calculator", title: "House Material Cost Calculator (Building Materials)",
    desc: "Estimate the materials cost to build a house — total and broken down into foundation, framing lumber, roofing, windows and doors, siding, mechanical, insulation and drywall, and interior finishes.",
    inputs: [num("sqft", "House Size", 2000, 50000, 10, 100, "sq ft"), dd("quality", "Build Quality", E.MATERIAL_QUALITY, 1), usd("basePerSqFt", "Total Build Cost per Sq Ft (standard)", 175, 1000, 1), pct("materialShare", "Materials Share of Build Cost", 50, 80, 1), ADJ],
    results: [["totalMaterials", "Total Materials", "c"], ["perSqFt", "Materials per Sq Ft", "c"], ["foundation", "Foundation & Concrete", "c"], ["framing", "Framing & Lumber", "c"], ["roofing", "Roofing", "c"], ["windowsDoors", "Windows & Doors", "c"], ["siding", "Siding & Exterior", "c"], ["mep", "Plumbing, Electrical & HVAC", "c"], ["insulationDrywall", "Insulation & Drywall", "c"], ["finishes", "Interior Finishes", "c"]],
    fn: E.houseMaterialCost, ex: { sqft: 2000, quality: 1, basePerSqFt: 175, materialShare: 50, adjust: 0 },
    exText: (o) => `Example: materials for a standard 2,000 sq ft house cost about ${money(o.totalMaterials)}, including ${money(o.framing)} of framing and lumber.`,
    how: "Materials are usually 40–50% of the build cost; labor, permits and profit are the rest. Interior finishes vary the most — cabinets, countertops and flooring can double the finish budget.",
    assume: `Materials share split: foundation 12%, framing 20%, roofing 7%, windows & doors 10%, siding 8%, MEP 15%, insulation & drywall 8%, finishes 20%. ${COST_NOTE}`,
    faq: [["How much do materials cost to build a house?", "About $75–100 per sq ft for a standard home — roughly half the total build cost."]],
  }),
  mk({
    slug: "roller-shutter-cost-calculator", title: "Roller Shutter Cost Calculator",
    desc: "Estimate roller shutter cost installed — manual, electric (motorized) or solar/smart — for windows, doors and storefronts, by size and number of shutters.",
    inputs: [num("shutters", "Shutters", 4, 100, 1, 1), num("width", "Width", 4, 40, 0.5, 1, "ft"), num("height", "Height", 5, 20, 0.5, 1, "ft"), dd("operation", "Operation", E.SHUTTER_OPS, 1), ADJ],
    results: plus(["perShutter", "Cost per Shutter", "c"]), fn: E.rollerShutterCost, ex: { shutters: 4, width: 4, height: 5, operation: 1, adjust: 0 },
    exText: (o) => `Example: four 4 × 5 ft electric roller shutters cost about ${money(o.totalCost)} installed — ${money(o.perShutter)} each.`,
    how: "Hurricane-rated rolling shutters need product approval in coastal zones. Motorized shutters need a power supply at each window, or choose solar. Garage and commercial roller doors are priced separately.",
    assume: `Per sq ft installed: manual $25, electric $40, solar/smart $50. ${COST_NOTE}`,
    faq: [["How much do roller shutters cost?", "About $25–50 per sq ft installed — $500–1,200 for a typical window."]],
  }),
  mk({
    slug: "wall-removal-cost-calculator", title: "Wall Removal Cost Calculator (Load-Bearing & Non-Load-Bearing)",
    desc: "Estimate the cost to remove an interior wall — non-load-bearing or load-bearing with a beam — plus rerouting wiring or plumbing, drywall and paint finishing, and floor patching.",
    inputs: [dd("type", "Wall Type", E.WALL_TYPES), num("length", "Wall Length", 12, 100, 0.5, 1, "ft"), usd("reroute", "Reroute Electrical / Plumbing / HVAC", 0, 20000, 50), usd("finishPerFt", "Drywall & Paint Finish per ft", 35, 200, 1), usd("floorPatchPerFt", "Floor Patch per ft", 25, 200, 1), ADJ],
    results: plus(["wallCost", "Wall Removal & Structure", "c"]), fn: E.wallRemovalCost, ex: { type: 0, length: 12, reroute: 0, finishPerFt: 35, floorPatchPerFt: 25, adjust: 0 },
    exText: (o) => `Example: removing a 12 ft non-load-bearing wall and finishing the area costs about ${money(o.totalCost)}.`,
    how: "Walls running across the joists, under a post or in the middle of the house are often load-bearing — get a structural engineer before removing them. Load-bearing removals need a permit, temporary supports and an LVL or steel beam.",
    assume: `Non-load-bearing $300 + $40 per ft; load-bearing $2,500 (engineer, permit, posts) + $300 per ft of beam. ${COST_NOTE}`,
    faq: [["How much does it cost to remove a load-bearing wall?", "About $5,000–15,000 including the beam, permit and finishing."]],
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
