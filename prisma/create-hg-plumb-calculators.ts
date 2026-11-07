// One-time (but safe to re-run) batch setup script: creates 31 calculators in House & Garden
// Calculators > HVAC, Plumbing & Electrical Calculators (plumbing, water, pumps, septic, electrical and lighting tools and costs). Formulas live in src/lib/calc-engine-hg-plumb.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-plumb-calculators.ts
// or
//   npm run db:create-hg-plumb-calculators

import * as E from "../src/lib/calc-engine-hg-plumb";

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

const CAT = "hvac-plumbing-electrical-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US costs and vary by region and job — get local quotes.";
const ELEC_NOTE = "Electrical work must follow the NEC as adopted locally — check with your inspector, and hire a licensed electrician where required.";
const COSTRES: Line[] = [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]];
const STORIES = dd("stories", "Stories", ["One", "Two", "Three"]);

const TOOLS: ToolDef[] = [
  mk({
    slug: "conduit-fill-calculator", title: "Conduit Fill Calculator (NEC Chapter 9)",
    desc: "Check conduit fill for THHN wires in EMT, PVC Schedule 40 or 80 and rigid conduit — percent fill against the NEC limit, the maximum wires that fit and the smallest conduit size that works.",
    meta: "Conduit Fill Calculator — How Many Wires in a Conduit?",
    inputs: [dd("type", "Conduit Type", E.CONDUIT_TYPES), dd("size", "Conduit Size", E.CONDUIT_SIZES, 1), dd("wire", "Wire Size (THHN / THWN)", E.WIRES, 1), num("count", "Number of Wires", 6, 100, 1, 1)],
    results: [["fillPercent", "Conduit Fill (%)", "n"], ["ok", "Result", "l", E.FILL_OK], ["maxWires", "Max Wires of This Size (40%)", "n"], ["smallestSize", "Smallest Conduit That Works", "l", E.CONDUIT_SIZES]],
    fn: E.conduitFill, ex: { type: 0, size: 1, wire: 1, count: 6 },
    exText: (o) => `Example: six 12 AWG THHN wires in ¾ in EMT fill ${o.fillPercent}% — ${o.ok ? "within" : "over"} the NEC limit; up to ${o.maxWires} would fit.`,
    how: "Count every conductor, including grounds. More than three current-carrying conductors in a conduit also need ampacity derating (NEC 310.15(C)(1)) — fill isn't the only limit.",
    assume: `NEC Chapter 9: 53% fill for one wire, 31% for two, 40% for three or more; Table 4 conduit areas and Table 5 THHN areas. ${ELEC_NOTE}`,
    faq: [["How many 12 gauge wires in 1/2 inch EMT?", "Up to 9 THHN wires by fill."]],
  }),
  mk({
    slug: "box-fill-calculator", title: "Electrical Box Fill Calculator (Junction Box Size)",
    desc: "Calculate electrical box fill under NEC 314.16 — volume needed for 14 to 6 AWG conductors, devices, clamps and grounds — and whether your box is big enough.",
    inputs: [num("boxVolume", "Box Volume (marked on the box)", 18, 100, 0.25, 1, "cu in"), num("c14", "14 AWG Conductors", 0, 30, 1), num("c12", "12 AWG Conductors", 4, 30, 1), num("c10", "10 AWG Conductors", 0, 30, 1), num("c8", "8 AWG Conductors", 0, 30, 1), num("c6", "6 AWG Conductors", 0, 30, 1), num("devices", "Devices (switches / receptacles)", 1, 6, 1), dd("clamps", "Internal Cable Clamps?", ["No", "Yes"], 1), dd("grounds", "Ground Wires Present?", ["No", "Yes"], 1)],
    results: [["requiredCuIn", "Volume Required (cu in)", "n"], ["ok", "Result", "l", E.BOX_OK], ["spareCuIn", "Spare Volume (cu in)", "n"]],
    fn: E.boxFill, ex: { boxVolume: 18, c14: 0, c12: 4, c10: 0, c8: 0, c6: 0, devices: 1, clamps: 1, grounds: 1 },
    exText: (o) => `Example: two 12/2 cables (4 conductors), one receptacle, clamps and grounds need ${o.requiredCuIn} cu in — an 18 cu in box works.`,
    how: "Count each insulated conductor entering the box; pigtails that start and end in the box don't count. Each device counts as two conductors, all grounds together as one, internal clamps as one.",
    assume: `NEC 314.16(B): 14 AWG 2.0, 12 AWG 2.25, 10 AWG 2.5, 8 AWG 3.0, 6 AWG 5.0 cu in per conductor, using the largest conductor for devices, clamps and grounds. ${ELEC_NOTE}`,
    faq: [["How many wires can go in a single gang box?", "It depends on the box volume — an 18 cu in box holds up to eight 12 AWG conductors with no device."]],
  }),
  mk({
    slug: "breaker-size-calculator", title: "Circuit Breaker Size Calculator (and Wire Size)",
    desc: "Find the breaker size for a load — from amps or watts and voltage, with the 125% rule for continuous loads — and the copper wire gauge that matches.",
    inputs: [num("amps", "Load (amps, or 0 to use watts)", 0, 400, 0.5, 0, "A"), num("watts", "Or Load in Watts", 3600, 100000, 10, 0, "W"), dd("voltage", "Voltage", ["120 V", "240 V", "208 V"], 1), dd("continuous", "Continuous Load (3+ hours)?", ["No", "Yes"], 1)],
    results: [["breakerAmps", "Breaker Size (A)", "n"], ["wire", "Copper Wire (typical)", "l", E.WIRE_FOR_BREAKER], ["loadAmps", "Load (A)", "n"], ["designAmps", "Design Current (A)", "n"]],
    fn: E.breakerSize, ex: { amps: 0, watts: 3600, voltage: 1, continuous: 1 },
    exText: (o) => `Example: a 3,600 W continuous load at 240 V draws ${o.loadAmps} A — ×1.25 = ${o.designAmps} A — so use a ${o.breakerAmps} A breaker on ${E.WIRE_FOR_BREAKER[o.wire]}.`,
    how: "Continuous loads (EV chargers, water heaters, heaters running 3+ hours) must be sized at 125%. Motors and appliances with a nameplate MCA/MOCP follow those numbers instead.",
    assume: `Standard breaker sizes; wire per common practice (14 AWG 15 A, 12 AWG 20 A, 10 AWG 30 A, 8 AWG 40 A, 6 AWG 50–55 A, 4 AWG 70 A, 3 AWG 100 A at 75 °C). Long runs need bigger wire for voltage drop. ${ELEC_NOTE}`,
    faq: [["What size breaker for a 4,500 W water heater?", "A 30 A, 240 V breaker on 10 AWG copper."]],
  }),
  mk({
    slug: "pipe-bend-calculator", title: "Conduit Offset Bend Calculator (Pipe Bending)",
    desc: "Calculate conduit offset bends — distance between bends and shrink for 10°, 22.5°, 30°, 45° or 60° — and the 90° stub take-up for ½ to 1¼ in EMT.",
    inputs: [num("offset", "Offset Depth", 6, 48, 0.125, 0.25, "in"), dd("angle", "Bend Angle", E.BEND_ANGLES, 2), dd("size", "EMT Size (for 90° take-up)", ["1/2 in", "3/4 in", "1 in", "1-1/4 in"])],
    results: [["distanceBetweenBendsIn", "Distance Between Bends (in)", "n"], ["shrinkIn", "Shrink (in)", "n"], ["takeUp90In", "90° Stub Take-Up (in)", "n"], ["multiplier", "Multiplier", "n"]],
    fn: E.pipeBend, ex: { offset: 6, angle: 2, size: 0 },
    exText: (o) => `Example: a 6 in offset with 30° bends needs marks ${o.distanceBetweenBendsIn} in apart and loses ${o.shrinkIn} in of length.`,
    how: "Mark the first bend, add the distance between bends for the second mark, and add the shrink to your overall measurement. The same multipliers work for any tube bender.",
    assume: "Multiplier = cosecant of the angle (10° 6.0, 22.5° 2.6, 30° 2.0, 45° 1.4, 60° 1.2); shrink per inch of offset 1/16, 3/16, 1/4, 3/8, 1/2 in. Take-ups for common hand benders.",
    faq: [["What is the multiplier for a 30 degree offset?", "2 — the bends are twice the offset depth apart."]],
  }),
  mk({
    slug: "lighting-layout-calculator", title: "Lighting Layout Calculator (How Many Lights & Spacing)",
    desc: "Plan room lighting — lumens needed for the room type, number of fixtures, rows and columns and spacing from the walls — for LED downlights, shop lights or any fixture.",
    meta: "Lighting Layout Calculator — How Many Lights Do I Need?",
    inputs: [num("length", "Room Length", 14, 500, 0.5, 2, "ft"), num("width", "Room Width", 12, 500, 0.5, 2, "ft"), dd("room", "Room Type", E.ROOM_FC), num("customFc", "Target Foot-Candles (0 = typical)", 0, 200, 1, 0), num("fixtureLumens", "Lumens per Fixture", 800, 50000, 10, 100)],
    results: [["fixtures", "Fixtures", "n"], ["lumensNeeded", "Total Lumens Needed", "n"], ["rows", "Rows", "n"], ["columns", "Fixtures per Row", "n"], ["spacingFt", "Spacing (ft)", "n"], ["fromWallFt", "First Light From Wall (ft)", "n"], ["targetFc", "Target Foot-Candles", "n"]],
    fn: E.lightingLayout, ex: { length: 14, width: 12, room: 0, customFc: 0, fixtureLumens: 800 },
    exText: (o) => `Example: a 14 × 12 ft living room at 15 foot-candles needs about ${n2(o.lumensNeeded)} lumens — ${o.fixtures} fixtures of 800 lumens in ${o.rows} rows.`,
    how: "Pick the room and your fixture's lumen rating (on the box). Place the first row about half the spacing from the walls. Layer light: add task and accent lights where you need more.",
    assume: "Lumens = foot-candles × area ÷ 0.6 (light lost to fixtures, walls and dirt). Target levels follow IES-style recommendations.",
    faq: [["How many lumens does a room need?", "About 10–20 lumens per sq ft for living areas and 30–50 for kitchens and offices."]],
  }),
  mk({
    slug: "foot-candle-calculator", title: "Foot-Candle Calculator (Lumens, Lux & Area)",
    desc: "Convert lumens and area into foot-candles and lux — and find the lumens needed to hit a target light level — for rooms, shops and grow spaces.",
    inputs: [num("lumens", "Total Fixture Lumens", 8000, 10000000, 10, 0), num("area", "Area Lit", 200, 1000000, 1, 1, "sq ft"), num("factor", "Coefficient of Use × Light Loss", 0.6, 1, 0.05, 0.1), num("targetFc", "Target Foot-Candles", 50, 1000, 1, 1)],
    results: [["footCandles", "Foot-Candles", "n"], ["lux", "Lux", "n"], ["lumensForTarget", "Lumens for the Target", "n"]],
    fn: E.footCandle, ex: { lumens: 8000, area: 200, factor: 0.6, targetFc: 50 },
    exText: (o) => `Example: 8,000 lumens over 200 sq ft give about ${o.footCandles} foot-candles (${o.lux} lux); 50 fc would need ${n2(o.lumensForTarget)} lumens.`,
    how: "One foot-candle is one lumen per square foot reaching the surface. The 0.6 factor accounts for light absorbed by the fixture, walls and dirt — use about 0.7 for white rooms with open fixtures.",
    assume: "fc = lumens × factor ÷ area; 1 fc = 10.764 lux.",
    faq: [["How many foot-candles for a workshop?", "About 50–75 fc on the work surface."]],
  }),
  mk({
    slug: "panel-upgrade-cost-calculator", title: "Electrical Panel Upgrade Cost Calculator (200 Amp Service)",
    desc: "Estimate the cost of an electrical panel upgrade — panel replacement, 100 to 200 amp, full service upgrade, 400 amp or a subpanel — with new circuits, permit and utility fees.",
    inputs: [dd("job", "Upgrade", E.PANEL_JOBS, 2), num("circuits", "New Circuits", 2, 40, 1), usd("permit", "Permit & Inspection", 300, 3000, 10), usd("utilityFee", "Utility Disconnect / Reconnect Fee", 0, 5000, 10)],
    results: COSTRES,
    fn: E.panelUpgradeCost, ex: { job: 2, circuits: 2, permit: 300, utilityFee: 0 },
    exText: (o) => `Example: a full 200 A service upgrade with two new circuits and a permit costs about ${money(o.totalCost)}.`,
    how: "A load calculation (NEC 220) shows whether you need a bigger service for an EV charger, heat pump or electric range — sometimes a load-management device avoids it.",
    assume: `Typical prices: panel swap $1,800, 100→200 A panel $2,800, full service upgrade $4,500, 400 A $7,000, subpanel $1,500; new circuits ≈ $300 each. ${COST_NOTE}`,
    faq: [["How much does a 200 amp service upgrade cost?", "About $3,500–6,000 including the meter base and permit."]],
  }),
  mk({
    slug: "rewire-cost-calculator", title: "House Rewiring Cost Calculator",
    desc: "Estimate the cost to rewire a house — per square foot by stories, with plaster walls and a panel upgrade — plus permit.",
    inputs: [num("area", "Home Size", 1800, 20000, 10, 0, "sq ft"), usd("ratePerSqFt", "Price per Sq Ft", 4, 20, 0.25), STORIES, dd("plaster", "Plaster Walls?", ["No", "Yes"]), dd("panel", "Upgrade the Panel Too?", ["No", "Yes"]), usd("permit", "Permit", 500, 5000, 10)],
    results: COSTRES,
    fn: E.rewireCost, ex: { area: 1800, ratePerSqFt: 4, stories: 0, plaster: 0, panel: 0, permit: 500 },
    exText: (o) => `Example: rewiring an 1,800 sq ft single-story home costs about ${money(o.totalCost)} plus wall patching.`,
    how: "Rewiring is common for homes with knob-and-tube or aluminum branch wiring. Older homes with plaster walls take longer to fish wires through. Budget separately for drywall/plaster patching and paint.",
    assume: `Typical prices $3–6 per sq ft; plaster +30%; two stories +10%, three +20%; panel upgrade ≈ $2,800. ${COST_NOTE}`,
    faq: [["How much does it cost to rewire a house?", "About $6,000–15,000 for a typical home."]],
  }),
  mk({
    slug: "water-heater-installation-cost-calculator", title: "Water Heater Installation Cost Calculator",
    desc: "Estimate water heater installation cost — gas or electric tank, tankless or heat pump — with unit and labor split, tank-to-tankless conversion, expansion tank, permit and haul-away.",
    inputs: [dd("type", "Water Heater", E.WH_TYPES), dd("conversion", "Converting Tank → Tankless (venting, gas line)?", ["No", "Yes"]), dd("expansionTank", "Add an Expansion Tank?", ["No", "Yes"], 1), usd("permit", "Permit", 100, 1000, 10)],
    results: [["totalCost", "Estimated Cost", "c"], ["unitCost", "Water Heater", "c"], ["laborCost", "Labor & Parts", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.waterHeaterInstallCost, ex: { type: 0, conversion: 0, expansionTank: 1, permit: 100 },
    exText: (o) => `Example: replacing a 50 gallon gas tank water heater with an expansion tank costs about ${money(o.totalCost)} — about ${money(o.laborCost)} of it labor.`,
    how: "Like-for-like tank swaps are cheapest. Tankless gas heaters often need a larger gas line and new venting; heat pump water heaters need space and a condensate drain.",
    assume: `Typical units: gas tank $800, electric tank $650, gas tankless $1,700, electric tankless $900, heat pump $1,900; labor $800–1,800; haul-away $100. ${COST_NOTE}`,
    faq: [["How much does it cost to install a water heater?", "About $1,500–2,500 for a standard tank, $3,000–5,000+ for tankless."]],
  }),
  mk({
    slug: "water-heater-lifespan-calculator", title: "Water Heater Age & Lifespan Calculator",
    desc: "Estimate how many years your water heater has left — by type, age, water hardness and maintenance — and the year to plan a replacement.",
    inputs: [dd("type", "Type", E.WH_LIFE_TYPES), num("age", "Current Age", 8, 40, 1, 0, "years"), dd("hardness", "Water", ["Soft", "Average", "Hard"], 1), dd("maintained", "Flushed / Anode Checked Regularly?", ["No", "Yes"]), num("currentYear", "Current Year", 2026, 2100, 1, 2000)],
    results: [["yearsLeft", "Estimated Years Left", "n"], ["status", "Status", "l", E.WH_STATUS], ["expectedLifeYears", "Expected Life (years)", "n"], ["replaceByYear", "Plan to Replace By", "n"]],
    fn: E.waterHeaterLifespan, ex: { type: 0, age: 8, hardness: 1, maintained: 0, currentYear: 2026 },
    exText: (o) => `Example: an 8-year-old gas tank heater with average water has about ${o.yearsLeft} years left — ${E.WH_STATUS[o.status].toLowerCase()}.`,
    how: "Find the age from the serial number (most brands encode the year and month). Rust-colored water, rumbling and leaks at the base mean replacement is near.",
    assume: "Typical lives: gas tank 10 yr, electric tank 12, tankless 20, heat pump 13; hard water −20%, soft +10%, regular maintenance +10%.",
    faq: [["How long do water heaters last?", "About 8–12 years for tanks and 20 years for tankless units."]],
  }),
  mk({
    slug: "dryer-energy-cost-calculator", title: "Clothes Dryer Energy Cost Calculator",
    desc: "Calculate what it costs to run a clothes dryer — electric, gas or heat pump — per load, per month and per year.",
    inputs: [dd("type", "Dryer", E.DRYERS), num("loadsPerWeek", "Loads per Week", 5, 30, 1, 0), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005), usd("gasPrice", "Natural Gas per Therm", 1.4, 10, 0.01)],
    results: [["costPerLoad", "Cost per Load", "c"], ["costPerMonth", "Cost per Month", "c"], ["costPerYear", "Cost per Year", "c"]],
    fn: E.dryerEnergyCost, ex: { type: 0, loadsPerWeek: 5, kwhPrice: 0.17, gasPrice: 1.4 },
    exText: (o) => `Example: five loads a week in an electric dryer cost about $${o.costPerLoad.toFixed(2)} each — ${money(o.costPerYear)} a year.`,
    how: "Clean the lint screen every load and the vent yearly — a clogged vent makes drying much slower and is a fire risk. High-spin washes cut drying time.",
    assume: "Per load: electric ≈ 3.3 kWh; gas ≈ 0.2 therm + 0.3 kWh; heat pump ≈ 1.2 kWh.",
    faq: [["How much does it cost to run a dryer?", "About $0.40–0.70 per load for electric and $0.30–0.40 for gas."]],
  }),
  mk({
    slug: "hot-tub-electricity-cost-calculator", title: "Hot Tub Electricity Cost Calculator",
    desc: "Estimate monthly and yearly electricity cost for a hot tub or spa — by size, cover and insulation quality, climate and how often you use it.",
    inputs: [dd("size", "Hot Tub Size", ["Small (2–3 people)", "Medium (4–6 people)", "Large (7+ people)"], 1), dd("insulation", "Cover & Insulation", ["Poor / old cover", "Average", "Excellent (full foam, new cover)"], 1), dd("climate", "Climate", ["Mild", "Moderate", "Cold winters"], 1), num("hoursPerWeek", "Hours of Use per Week", 4, 40, 0.5, 0), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005)],
    results: [["costPerMonth", "Cost per Month", "c"], ["costPerYear", "Cost per Year", "c"], ["kwhPerMonth", "kWh per Month", "n"]],
    fn: E.hotTubElectricity, ex: { size: 1, insulation: 1, climate: 1, hoursPerWeek: 4, kwhPrice: 0.17 },
    exText: (o) => `Example: a medium hot tub in a moderate climate costs about ${money(o.costPerMonth)} a month (${o.kwhPerMonth} kWh).`,
    how: "The cover does most of the work — a waterlogged cover can double costs. Lower the set temperature a few degrees when you're away.",
    assume: "≈ 150 / 250 / 400 kWh per month by climate for a medium, average tub, scaled for size, insulation and use.",
    faq: [["How much does a hot tub add to the electric bill?", "Typically $25–60 a month."]],
  }),
  mk({
    slug: "water-leak-calculator", title: "Water Leak Calculator (Dripping Faucet & Running Toilet)",
    desc: "See how much water a dripping faucet or running toilet wastes — gallons per day and year — and what it costs on your water and sewer bill.",
    inputs: [num("dripsPerMinute", "Drips per Minute", 30, 600, 1, 0), num("runningToiletGpm", "Running Toilet Flow (0 if none)", 0, 5, 0.05, 0, "gpm"), usd("pricePer1000", "Water + Sewer per 1,000 Gallons", 10, 50, 0.25)],
    results: [["gallonsPerDay", "Gallons Wasted per Day", "n"], ["gallonsPerYear", "Gallons per Year", "n"], ["costPerYear", "Cost per Year", "c"]],
    fn: E.waterLeak, ex: { dripsPerMinute: 30, runningToiletGpm: 0, pricePer1000: 10 },
    exText: (o) => `Example: a faucet dripping 30 times a minute wastes about ${o.gallonsPerDay} gallons a day — ${n2(o.gallonsPerYear)} gallons a year.`,
    how: "Count drips for a minute. Test a toilet by putting food coloring in the tank — if color shows in the bowl after 15 minutes without flushing, it's leaking. A silent running toilet can waste 200+ gallons a day.",
    assume: "About 15,140 drips per gallon (¼ mL per drip). Water and sewer combined often cost $8–20 per 1,000 gallons.",
    faq: [["How much water does a dripping faucet waste?", "One drip per second wastes about 3,000 gallons a year."]],
  }),
  mk({
    slug: "pipe-volume-calculator", title: "Pipe Volume Calculator (Gallons per Foot)",
    desc: "Calculate how much water a pipe holds — gallons, gallons per foot, liters and water weight — for Schedule 40 steel or PVC, copper type L and PEX.",
    inputs: [dd("material", "Pipe", E.PIPE_MATS), dd("size", "Nominal Size", E.PIPE_SIZES, 1), num("length", "Length", 100, 100000, 1, 0, "ft")],
    results: [["gallons", "Volume (gallons)", "n"], ["gallonsPerFoot", "Gallons per Foot", "n"], ["liters", "Liters", "n"], ["waterWeightLb", "Water Weight (lb)", "n"]],
    fn: E.pipeVolume, ex: { material: 1, size: 1, length: 100 },
    exText: (o) => `Example: 100 ft of ¾ in copper holds about ${o.gallons} gallons (${o.gallonsPerFoot} gal per ft).`,
    how: "Use it for glycol and antifreeze fills, flushing and chlorinating new lines, or to see how long hot water takes to arrive. PEX above 2 in uses the 2 in figure.",
    assume: "Gallons = π/4 × ID² × length × 12 ÷ 231, with standard inside diameters for each pipe type.",
    faq: [["How many gallons in 100 feet of 3/4 inch pipe?", "About 2.5 gallons for copper or 2.8 for Schedule 40."]],
  }),
  mk({
    slug: "pipe-size-calculator", title: "Pipe Size Calculator (Water Flow, Heating & Drain)",
    desc: "Size a water pipe from flow and velocity — or from hydronic heating BTU — and size a drain line from drainage fixture units.",
    inputs: [num("gpm", "Water Flow", 10, 1000, 0.5, 0, "gpm"), dd("service", "Use", ["Cold water (5 fps max)", "Hot water / recirculation (4 fps)", "Irrigation (8 fps)"]), num("btu", "Or Hydronic Heat Load (0 to skip)", 0, 1000000, 1000, 0, "BTU/hr"), num("deltaT", "Hydronic ΔT", 20, 40, 1, 5, "°F"), num("dfu", "Drainage Fixture Units (for drain size)", 0, 1000, 1, 0)],
    results: [["nominalSize", "Water Pipe Size", "l", E.PIPE_SIZES], ["requiredIdIn", "Required Inside Diameter (in)", "n"], ["flowGpm", "Flow (gpm)", "n"], ["drainSizeIn", "Horizontal Drain Size (in)", "n"]],
    fn: E.pipeSize, ex: { gpm: 10, service: 0, btu: 0, deltaT: 20, dfu: 0 },
    exText: (o) => `Example: 10 gpm of cold water at no more than 5 ft/s needs a ${o.requiredIdIn} in inside diameter — ${E.PIPE_SIZES[o.nominalSize]} pipe.`,
    how: "Higher velocities are noisy and erode copper; hot-water loops should stay under about 4 ft/s. For drains, add up the DFU of every fixture (see the fixture units calculator).",
    assume: "ID = √(0.4085 × gpm ÷ velocity); hydronic gpm = BTU ÷ (500 × ΔT); drain sizes from IPC horizontal fixture branch limits (1½ in 3 DFU … 4 in 160).",
    faq: [["What size pipe for 10 gpm?", "About 1 in for cold water at 5 ft/s."]],
  }),
  mk({
    slug: "water-service-line-size-calculator", title: "Water Service Line Size Calculator",
    desc: "Size the water service line from the street to your house — demand GPM from your fixtures, available pressure, line length and elevation — with friction loss.",
    inputs: [num("bathrooms", "Bathrooms", 2, 10, 0.5, 0), num("kitchens", "Kitchens", 1, 3, 1, 0), num("laundry", "Laundry Rooms", 1, 3, 1, 0), num("hoseBibbs", "Hose Bibbs", 2, 10, 1, 0), num("streetPressure", "Street Pressure", 60, 150, 1, 20, "psi"), num("length", "Service Line Length", 80, 1000, 1, 1, "ft"), num("elevation", "House Higher Than the Main By", 10, 100, 1, -50, "ft")],
    results: [["serviceSize", "Service Line Size", "l", E.SERVICE_SIZES], ["demandGpm", "Peak Demand (gpm)", "n"], ["wsfu", "Water Supply Fixture Units", "n"], ["frictionPsi", "Friction Loss (psi)", "n"], ["availablePsi", "Pressure Available for Friction (psi)", "n"]],
    fn: E.waterServiceLine, ex: { bathrooms: 2, kitchens: 1, laundry: 1, hoseBibbs: 2, streetPressure: 60, length: 80, elevation: 10 },
    exText: (o) => `Example: a two-bath home (${o.wsfu} WSFU, about ${o.demandGpm} gpm) 80 ft from a 60 psi main needs a ${E.SERVICE_SIZES[o.serviceSize]} service line.`,
    how: "Many utilities now require at least a 1 in service for new homes, and fire sprinklers need more. Ask the water company for the static pressure at your address.",
    assume: "Demand from WSFU (IPC Appendix E, tank toilets); 20 psi at the highest fixture plus 5 psi for the meter; Hazen–Williams C 150 with 30% added for fittings; velocity ≤ 8 ft/s.",
    faq: [["What size water line do I need for my house?", "Usually ¾–1 in for most homes; 1¼ in or more for large homes or long runs."]],
  }),
  mk({
    slug: "plumbing-fixture-units-calculator", title: "Plumbing Fixture Units Calculator (WSFU & DFU)",
    desc: "Count plumbing fixture units — water supply fixture units (WSFU) and drainage fixture units (DFU) — from your fixtures, with peak demand and building drain size.",
    inputs: [num("tubs", "Bathtubs", 1, 20, 1), num("showers", "Showers", 1, 20, 1), num("lavs", "Bathroom Sinks", 2, 20, 1), num("toilets", "Toilets (tank)", 2, 20, 1), num("kitchenSinks", "Kitchen Sinks", 1, 5, 1), num("dishwashers", "Dishwashers", 1, 5, 1), num("washers", "Clothes Washers", 1, 5, 1), num("hoseBibbs", "Hose Bibbs", 2, 10, 1)],
    results: [["wsfu", "Water Supply Fixture Units", "n"], ["dfu", "Drainage Fixture Units", "n"], ["demandGpm", "Peak Demand (gpm)", "n"], ["buildingDrainIn", "Building Drain at ¼ in/ft (in)", "n"]],
    fn: E.fixtureUnits, ex: { tubs: 1, showers: 1, lavs: 2, toilets: 2, kitchenSinks: 1, dishwashers: 1, washers: 1, hoseBibbs: 2 },
    exText: (o) => `Example: a two-bath house with a kitchen and laundry totals about ${o.wsfu} WSFU and ${o.dfu} DFU — about ${o.demandGpm} gpm peak and a ${o.buildingDrainIn} in building drain.`,
    how: "Fixture units let plumbers size supply and drain pipes by probable use rather than all fixtures running at once. Use your local code's tables — the IPC and UPC values differ slightly.",
    assume: "IPC private-use values: WSFU tub 4, shower 2, lavatory 1, tank toilet 2.5, kitchen sink 1.5, dishwasher 1.5, washer 4, hose bibb 2.5; DFU tub 2, shower 2, lavatory 1, toilet 3, sink 2, dishwasher 2, washer 2.",
    faq: [["How many fixture units is a bathroom?", "About 6 WSFU and 6 DFU for a full bath with a tank toilet."]],
  }),
  mk({
    slug: "pump-head-calculator", title: "Pump TDH & NPSHa Calculator (Water Pump Size)",
    desc: "Size a water pump — total dynamic head (TDH) from lift, height, pipe friction and outlet pressure, available NPSH on the suction side and motor horsepower — for wells, irrigation, sewage and fountain pumps.",
    inputs: [num("gpm", "Flow", 20, 5000, 0.5, 0.5, "gpm"), dd("pipe", "Pipe Size (Sch 40)", E.PIPE_SIZES, 3), num("suctionLift", "Suction Lift (water below pump)", 0, 25, 0.5, 0, "ft"), num("suctionLength", "Suction Pipe Length", 10, 500, 1, 0, "ft"), num("dischargeHeight", "Discharge Height Above Pump", 20, 1000, 1, 0, "ft"), num("pipeLength", "Total Pipe Length", 100, 10000, 1, 0, "ft"), num("fittingsFt", "Fittings (equivalent length)", 20, 1000, 1, 0, "ft"), num("outletPsi", "Pressure Needed at the Outlet", 20, 100, 1, 0, "psi"), num("elevation", "Site Elevation", 0, 10000, 100, 0, "ft")],
    results: [["tdhFt", "Total Dynamic Head (ft)", "n"], ["tdhPsi", "TDH (psi)", "n"], ["frictionFt", "Pipe Friction (ft)", "n"], ["npshaFt", "NPSH Available (ft)", "n"], ["motorHp", "Approx. Motor Size (hp at 60%)", "n"]],
    fn: E.pumpHead, ex: { gpm: 20, pipe: 3, suctionLift: 0, suctionLength: 10, dischargeHeight: 20, pipeLength: 100, fittingsFt: 20, outletPsi: 20, elevation: 0 },
    exText: (o) => `Example: pumping 20 gpm up 20 ft through 120 ft of 1¼ in pipe to 20 psi needs about ${o.tdhFt} ft of head (${o.tdhPsi} psi) — roughly a ${o.motorHp} hp pump.`,
    how: "Pick a pump whose curve delivers your flow at this head, and whose required NPSH (NPSHr) is below the NPSHa shown, or it will cavitate. Submersible well pumps have no suction lift.",
    assume: "Hazen–Williams C 150 (PVC); 2.31 ft of head per psi; NPSHa = 33.9 ft at sea level − lift − suction friction − 0.6 ft vapor pressure (60 °F water); motor hp = gpm × TDH ÷ (3,960 × 0.6).",
    faq: [["How do you calculate total dynamic head?", "Static height + friction losses + required outlet pressure (in feet of head)."]],
  }),
  mk({
    slug: "repipe-cost-calculator", title: "Repiping Cost Calculator (Whole-House Repipe)",
    desc: "Estimate the cost to repipe a house — PEX, CPVC or copper — by number of bathrooms and stories, with drywall repair.",
    inputs: [num("bathrooms", "Bathrooms", 2, 10, 0.5, 1), dd("material", "Pipe", E.REPIPE_MATS), STORIES, dd("drywall", "Include Drywall Repair?", ["No", "Yes"], 1)],
    results: COSTRES,
    fn: E.repipeCost, ex: { bathrooms: 2, material: 0, stories: 0, drywall: 1 },
    exText: (o) => `Example: repiping a single-story, two-bath home with PEX, including drywall patching, costs about ${money(o.totalCost)}.`,
    how: "Repiping is worth it for failing galvanized pipes, polybutylene or repeated pinhole leaks in old copper. PEX is cheaper and faster to install; copper costs about 80% more.",
    assume: `≈ $2,000 per bathroom plus $2,000 for the kitchen and laundry (PEX); CPVC +10%, copper +80%; two stories +10%; drywall repair ≈ $1,500. ${COST_NOTE}`,
    faq: [["How much does it cost to repipe a house?", "About $4,000–8,000 with PEX, $8,000–15,000 with copper."]],
  }),
  mk({
    slug: "plumbing-cost-calculator", title: "Plumbing Cost Calculator (Plumber Prices)",
    desc: "Estimate plumber costs for common jobs — repairs, leaks, clogs, toilet and faucet installs, disposals, water heater flushes, rough-in per fixture and sewer line repairs — with trip fee and after-hours rates.",
    inputs: [dd("job", "Job", E.PLUMBING_JOBS, 1), num("quantity", "Quantity", 1, 50, 1, 1), usd("tripFee", "Trip / Service Call Fee", 100, 500, 5), dd("afterHours", "Emergency / After Hours?", ["No", "Yes"])],
    results: COSTRES,
    fn: E.plumbingCost, ex: { job: 1, quantity: 1, tripFee: 100, afterHours: 0 },
    exText: (o) => `Example: a typical leak repair with a service call costs about ${money(o.totalCost)}.`,
    how: "Plumbers often charge a call-out fee plus a flat rate per job or $75–150 per hour. Emergency calls at night or on weekends cost about 1.5–2× more.",
    assume: `Typical flat prices: repair $250, leak $350, drain clog $225, toilet install $400, faucet $300, disposal $450, water heater flush $150, rough-in $1,500 per fixture, sewer line repair $3,000. ${COST_NOTE}`,
    faq: [["How much does a plumber cost?", "About $150–500 for most small jobs."]],
  }),
  mk({
    slug: "slab-leak-repair-cost-calculator", title: "Slab Leak Repair Cost Calculator",
    desc: "Estimate slab leak repair costs — breaking the slab, rerouting the line, epoxy lining or a whole-house repipe — with leak detection and flooring repair.",
    inputs: [dd("method", "Repair Method", E.SLAB_METHODS, 1), usd("detection", "Leak Detection", 350, 2000, 10), usd("flooring", "Flooring Repair", 800, 20000, 25)],
    results: COSTRES,
    fn: E.slabLeakCost, ex: { method: 1, detection: 350, flooring: 800 },
    exText: (o) => `Example: rerouting a leaking line under the slab, with leak detection and floor repair, costs about ${money(o.totalCost)}.`,
    how: "Signs include warm spots on the floor, the sound of running water and a rising water bill. Rerouting through walls or the attic avoids breaking the slab; repeated slab leaks point to a full repipe.",
    assume: `Typical prices: direct access $2,000, reroute $2,500, epoxy lining $3,000, repipe $6,000; detection $250–500. Homeowner's insurance often covers the access and floor damage but not the pipe. ${COST_NOTE}`,
    faq: [["How much does slab leak repair cost?", "About $2,000–4,000 for most repairs."]],
  }),
  mk({
    slug: "gas-line-cost-calculator", title: "Gas Line Installation Cost Calculator",
    desc: "Estimate the cost to run a new gas line — black iron or CSST per foot, appliance hookups, outdoor trenching and permit — for a range, dryer, fireplace, grill or generator.",
    inputs: [num("length", "Line Length", 30, 1000, 1, 1, "ft"), dd("material", "Pipe", ["Black iron", "CSST (flexible)"], 1), num("appliances", "Appliances to Connect", 1, 10, 1, 1), num("outdoorFeet", "Buried Outdoor Run", 0, 1000, 1, 0, "ft"), usd("permit", "Permit", 150, 1000, 10)],
    results: COSTRES,
    fn: E.gasLineCost, ex: { length: 30, material: 1, appliances: 1, outdoorFeet: 0, permit: 150 },
    exText: (o) => `Example: running 30 ft of CSST to a new gas range costs about ${money(o.totalCost)}.`,
    how: "Gas work needs a licensed fitter and a pressure test. Check the meter and main line can carry the added load (BTU) — a bigger appliance may need a larger line from the meter.",
    assume: `Typical prices: black iron $20 per ft, CSST $15; hookups $200 each; buried outdoor runs +$10 per ft; $250 minimum. ${COST_NOTE}`,
    faq: [["How much does it cost to run a gas line?", "About $250–800 for a short indoor run to one appliance."]],
  }),
  mk({
    slug: "water-line-cost-calculator", title: "Water Line Installation Cost Calculator",
    desc: "Estimate the cost to install or replace a water line — per foot for trenching and PE, PVC or copper pipe — with the connection fee, for runs up to 1,000 ft or more.",
    inputs: [num("length", "Line Length", 100, 10000, 1, 1, "ft"), usd("trenchPerFoot", "Trenching per Ft", 10, 100, 0.5), dd("material", "Pipe", ["PE / PEX", "PVC", "Copper"]), usd("connectionFee", "Tap / Connection Fee", 500, 10000, 10)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perFoot", "Cost per Foot", "c"]],
    fn: E.waterLineCost, ex: { length: 100, trenchPerFoot: 10, material: 0, connectionFee: 500 },
    exText: (o) => `Example: a 100 ft PE water line with trenching and connection costs about ${money(o.totalCost)}.`,
    how: "Bury water lines below the frost line. Trenchless (pipe bursting or boring) costs more per foot but avoids digging up driveways and landscaping.",
    assume: `Pipe $2–10 per ft plus trenching; utility tap fees vary widely. ${COST_NOTE}`,
    faq: [["How much does it cost to run a water line 1,000 feet?", "Often $12,000–25,000 including trenching."]],
  }),
  mk({
    slug: "septic-system-cost-calculator", title: "Septic System Cost Calculator",
    desc: "Estimate a new septic system's cost — conventional, chamber, mound, aerobic or drip — by number of bedrooms, with perc test, design and permit.",
    inputs: [dd("system", "System Type", E.SEPTIC_TYPES), num("bedrooms", "Bedrooms", 3, 10, 1, 1), usd("design", "Perc Test & Design", 1500, 10000, 50), usd("permit", "Permit", 800, 5000, 25)],
    results: COSTRES,
    fn: E.septicSystemCost, ex: { system: 0, bedrooms: 3, design: 1500, permit: 800 },
    exText: (o) => `Example: a conventional septic system for a three-bedroom home costs about ${money(o.totalCost)}.`,
    how: "The soil test decides the system: good soil allows a conventional gravity system; poor soil or a high water table needs a mound or aerobic system, which costs much more and needs more maintenance.",
    assume: `Typical prices (3 bedrooms): conventional $7,000, chamber $8,500, mound $18,000, aerobic $15,000, drip $20,000; scaled for larger homes. ${COST_NOTE}`,
    faq: [["How much does a septic system cost?", "About $5,000–12,000 for a conventional system and $15,000–30,000 for engineered systems."]],
  }),
  mk({
    slug: "drain-field-size-calculator", title: "Septic Drain Field Size Calculator",
    desc: "Estimate septic drain field (leach field) size — daily flow, absorption area, trench length and tank size — from bedrooms and soil percolation.",
    inputs: [num("bedrooms", "Bedrooms", 3, 10, 1, 1), dd("soil", "Soil Percolation", ["Fast (sand, under 10 min/in)", "Moderate (loam, 10–30 min/in)", "Slow (clay loam, 30–60 min/in)"], 1)],
    results: [["absorptionSqFt", "Absorption Area (sq ft)", "n"], ["trenchFeet", "Trench Length at 3 ft Wide (ft)", "n"], ["dailyFlowGal", "Design Flow (gal/day)", "n"], ["tankGallons", "Septic Tank (gal)", "n"]],
    fn: E.drainFieldSize, ex: { bedrooms: 3, soil: 1 },
    exText: (o) => `Example: a three-bedroom home on moderate soil needs about ${o.absorptionSqFt} sq ft of absorption area — ${o.trenchFeet} ft of 3 ft trench — and a ${n2(o.tankGallons)} gallon tank.`,
    how: "Local health departments set the design flow and loading rates — always follow their perc test results. Keep the field clear of trees, driveways and downspouts.",
    assume: "150 gal/day per bedroom; loading rates 1.2 / 0.8 / 0.4 gal per sq ft per day; tank 1,000 gal up to three bedrooms, +250 per extra bedroom.",
    faq: [["How big is a drain field for a 3 bedroom house?", "Often 500–1,000 sq ft of trench bottom, depending on soil."]],
  }),
  mk({
    slug: "grease-trap-size-calculator", title: "Grease Trap Size Calculator (Restaurant Sinks)",
    desc: "Size a grease trap (interceptor) for a restaurant sink by the PDI drain-down method — sink volume, flow rate in gpm and grease capacity in pounds.",
    inputs: [num("compartments", "Sink Compartments", 3, 6, 1, 1), num("length", "Compartment Length", 18, 48, 0.5, 6, "in"), num("width", "Compartment Width", 18, 48, 0.5, 6, "in"), num("depth", "Compartment Depth", 12, 24, 0.5, 4, "in"), dd("drainMinutes", "Drain-Down Time", ["1 minute", "2 minutes"])],
    results: [["trapGpm", "Grease Trap Size (gpm)", "n"], ["greaseCapacityLb", "Grease Capacity (lb)", "n"], ["flowGpm", "Calculated Flow (gpm)", "n"], ["sinkGallons", "Sink Volume (gal)", "n"]],
    fn: E.greaseTrapSize, ex: { compartments: 3, length: 18, width: 18, depth: 12, drainMinutes: 0 },
    exText: (o) => `Example: a three-compartment 18 × 18 × 12 in sink drains about ${o.flowGpm} gpm — use a ${o.trapGpm} gpm trap with ${o.greaseCapacityLb} lb of grease capacity.`,
    how: "Many cities require large gravity interceptors sized by seats or meals — check with your local pretreatment program before buying a small hydromechanical trap.",
    assume: "PDI G-101 method: sink volume × 75% fill ÷ drain time; standard sizes 10–100 gpm; grease capacity = 2 lb per gpm.",
    faq: [["What size grease trap for a 3 compartment sink?", "Often 20–35 gpm depending on sink size."]],
  }),
  mk({
    slug: "pipe-offset-calculator", title: "Pipe Offset Calculator (Rolling Offset & 45°)",
    desc: "Calculate pipe offsets — travel and run for 45°, 22½°, 60° and 11¼° fittings — including rolling offsets from rise and roll.",
    inputs: [dd("fitting", "Fittings", E.FITTINGS), num("rise", "Offset (or rise for a rolling offset)", 12, 200, 0.125, 0, "in"), num("roll", "Roll (rolling offsets only, 0 if none)", 0, 200, 0.125, 0, "in")],
    results: [["travelIn", "Travel (center to center, in)", "n"], ["runIn", "Run / Setback (in)", "n"], ["trueOffsetIn", "True Offset (in)", "n"], ["constant", "Travel Constant", "n"]],
    fn: E.pipeOffset, ex: { fitting: 0, rise: 12, roll: 0 },
    exText: (o) => `Example: a 12 in offset with 45° fittings has a travel of ${o.travelIn} in center to center and a run of ${o.runIn} in.`,
    how: "Measure center to center. Subtract the fitting take-off from the travel to get the pipe's cut length. For rolling offsets, the true offset is the diagonal of the rise and roll.",
    assume: "Travel = offset ÷ sin(angle); run = offset ÷ tan(angle); constants 45° 1.414, 22½° 2.613, 60° 1.155, 11¼° 5.126.",
    faq: [["What is the 45 degree offset multiplier?", "1.414 — travel = offset × 1.414."]],
  }),
  mk({
    slug: "heat-tape-calculator", title: "Heat Tape (Heat Trace) Calculator — Pipes & Roof",
    desc: "Calculate heat tape or heat cable — feet for straight or spiral-wrapped pipes or zig-zag roof and gutter de-icing — with watts, amps, circuits and monthly running cost.",
    inputs: [dd("mode", "Use", E.HEAT_TAPE_MODES), num("length", "Pipe Length or Roof Edge Length", 20, 1000, 1, 1, "ft"), num("pipeDiameter", "Pipe Diameter (spiral wrap)", 2, 12, 0.25, 0.5, "in"), num("downspoutFeet", "Downspouts & Gutters (roof)", 20, 500, 1, 0, "ft"), num("wattsPerFoot", "Cable Rating", 5, 12, 0.5, 2, "W/ft"), num("hoursPerDay", "Hours On per Day", 8, 24, 0.5, 0), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005)],
    results: [["cableFeet", "Cable Length (ft)", "n"], ["watts", "Load (W)", "n"], ["amps120", "Amps at 120 V", "n"], ["circuits20A", "20 A Circuits Needed", "n"], ["monthlyCost", "Monthly Running Cost", "c"]],
    fn: E.heatTape, ex: { mode: 0, length: 20, pipeDiameter: 2, downspoutFeet: 20, wattsPerFoot: 5, hoursPerDay: 8, kwhPrice: 0.17 },
    exText: (o) => `Example: 20 ft of pipe needs about ${o.cableFeet} ft of 5 W/ft heat cable — ${o.watts} W, about ${money(o.monthlyCost)} a month at 8 hours a day.`,
    how: "Use self-regulating cable where possible and plug it into a GFCI (required). Insulate over pipe heat tape. Roof cables run in a zig-zag above the eaves and down inside gutters and downspouts.",
    assume: "Straight runs +10%; spiral wraps grow with pipe size; roof edges ≈ 2.5 ft of cable per ft of eave plus 2× downspouts; 20 A circuits loaded to 80% (1,920 W).",
    faq: [["How much heat tape do I need for a roof?", "About 2.5 ft of cable per foot of roof edge, plus gutters and downspouts."]],
  }),
  mk({
    slug: "tap-drill-size-calculator", title: "Tap Drill Size Calculator (UNC, UNF, Metric & NPT)",
    desc: "Look up the tap drill size for a thread — UNC and UNF screw sizes, metric threads and NPT pipe threads — with the decimal inch and millimeter size.",
    inputs: [dd("thread", "Thread", E.TAPS, 4)],
    results: [["drill", "Tap Drill", "l", E.TAP_DRILLS], ["decimalIn", "Drill Size (in)", "n"], ["millimeters", "Drill Size (mm)", "n"]],
    fn: E.tapDrill, ex: { thread: 4 },
    exText: (o) => `Example: a 1/4-20 UNC thread uses a ${E.TAP_DRILLS[o.drill]} drill (${o.decimalIn} in).`,
    how: "These drills give about 75% thread engagement, the standard for most materials. For NPT pipe threads, ream with a tapered reamer when you need a tight seal.",
    assume: "Standard tap drill charts (Machinery's Handbook); metric drills = major diameter − pitch.",
    faq: [["What size drill for a 1/4-20 tap?", "#7 (0.201 in)."], ["What drill for 1/2 NPT?", "23/32 in."]],
  }),
  mk({
    slug: "range-hood-height-calculator", title: "Range Hood Height Calculator",
    desc: "Find how high to mount a range hood above an electric, induction or gas cooktop — minimum, maximum and recommended height — and how wide the hood should be.",
    inputs: [dd("cooktop", "Cooktop", ["Electric or induction", "Gas"]), dd("hood", "Hood Type", ["Wall / under-cabinet", "Island"]), num("cooktopWidth", "Cooktop Width", 30, 60, 1, 24, "in")],
    results: [["recommendedIn", "Recommended Height Above Cooktop (in)", "n"], ["minHeightIn", "Minimum (in)", "n"], ["maxHeightIn", "Maximum (in)", "n"], ["hoodWidthIn", "Hood Width (in)", "n"]],
    fn: E.rangeHoodHeight, ex: { cooktop: 1, hood: 0, cooktopWidth: 30 },
    exText: (o) => `Example: over a 30 in gas range, mount a wall hood about ${o.recommendedIn} in above the cooktop (${o.minHeightIn}–${o.maxHeightIn} in) and at least ${o.hoodWidthIn} in wide.`,
    how: "Always follow the hood's installation manual — it may require a specific height. Island hoods catch less smoke, so mount them lower in the range and wider than the cooktop.",
    assume: "Typical ranges: electric 24–30 in, gas 30–36 in above the cooking surface; island hoods ≈ 6 in wider than the cooktop.",
    faq: [["How high should a range hood be above a gas stove?", "About 30–36 in."]],
  }),
  mk({
    slug: "copper-pipe-weight-calculator", title: "Pipe Weight Calculator (Copper, PVC & Steel)",
    desc: "Calculate pipe weight — copper type K, L and M tube, PVC Schedule 40 or steel Schedule 40 — in pounds and kilograms, per foot, plus the scrap value of copper.",
    inputs: [dd("material", "Pipe", E.PIPE_WEIGHT_MATS, 1), dd("size", "Nominal Size", E.PIPE_SIZES.slice(0, 8), 1), num("length", "Length", 100, 100000, 1, 0, "ft"), usd("scrapPrice", "Copper Scrap Price per Lb", 3.5, 10, 0.05)],
    results: [["weightLb", "Weight (lb)", "n"], ["weightKg", "Weight (kg)", "n"], ["lbPerFoot", "Pounds per Foot", "n"], ["scrapValue", "Scrap Value (copper)", "c"]],
    fn: E.pipeWeight, ex: { material: 1, size: 1, length: 100, scrapPrice: 3.5 },
    exText: (o) => `Example: 100 ft of ¾ in type L copper weighs ${o.weightLb} lb — about ${money(o.scrapValue)} as clean scrap.`,
    how: "Type K is the thickest wall (underground), L is standard for water lines, M is thin-wall. Scrap yards pay most for clean, bare copper with fittings cut off.",
    assume: "Weights per ft from ASTM B88 for copper and typical Schedule 40 tables for PVC and steel.",
    faq: [["How much does 3/4 copper pipe weigh?", "About 0.455 lb per foot for type L."]],
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
