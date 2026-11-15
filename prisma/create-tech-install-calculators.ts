// One-time (but safe to re-run) batch setup script: 8 installation, solar, data-centre and welding tools
// from the tech keyword check (15 Nov 2026 — Claude outputs/Tech_Keyword_Check.md): House & Garden >
// HVAC, Plumbing & Electrical (5), Business & Industrial > Energy, Solar & Electrical (2) and
// > Manufacturing, Metals & Engineering (1). Formulas: src/lib/calc-engine-tech-install.ts.
//
// HOW TO RUN
//   npm run db:create-tech-install-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-tech-install";
import { mk, num, dd, tx, money, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.techInstallCustomCalculators;

const HOUSE: ToolDef[] = [
  mk({
    slug: "conduit-bending-calculator", title: "Conduit Bending Calculator (Offset, Saddle & 90° Stub)",
    meta: "Conduit Bending Calculator — Offset Multiplier, Shrink & Marks",
    desc: "Work out conduit bend marks for an offset (10°, 22½°, 30°, 45° or 60°), a 3-point saddle or a 90° stub-up: the distance between bends, the multiplier, the shrink and where to put each mark on EMT.",
    inputs: [dd("mode", "Bend", E.BEND_MODES, 0), num("height", "Offset / Saddle Height or Stub Length (in)", 6, 0, 200, 0.0625, "in"), num("dist", "Distance from Pipe End to Obstacle (in)", 24, 0, 1000, 0.0625, "in"), dd("angle", "Offset Angle", E.BEND_ANGLES.map((a) => `${a}°`), 2), dd("size", "Conduit (for 90° stub)", E.EMT_SIZES.map(([l]) => l), 0)],
    results: [["main", "Bend Marks", "t"], ["first", "Where to Mark", "t"], ["mult", "Multiplier", "t"], ["shrink", "Shrink", "t"], ["note", "Notes", "t"], ["between", "Distance (in, decimal)", "n", 2]],
    fn: C["conduit-bending-calculator"], ex: { mode: 0, height: 6, dist: 24, angle: 2, size: 0 },
    exText: (o) => `Example: a 6" offset with 30° bends puts the marks ${String(o.main).split(" ").slice(1).join(" ")} with ${o.shrink} of shrink. ${o.first}.`,
    how: "Offset: distance between marks = offset height × multiplier (the multiplier is 1 ÷ sin of the angle: 30° = 2, 45° = 1.41, 22½° = 2.6, 10° = 6). The conduit shrinks a little in length, so add the shrink to the distance to the obstacle for the first mark.\n\nSaddle: centre bend 45°, outer bends 22½°, outer marks 2½ × the saddle height from the centre. 90° stub: subtract the bender's take-up from the stub length.",
    assume: "Standard hand-bender practice for EMT. Take-up values vary by bender brand, so check the markings on yours. Field-verify before cutting.",
    faq: [["What is the multiplier for a 30° offset?", "2. The marks are twice the offset height apart."], ["What is shrink in conduit bending?", "The length the run loses because of the offset: about ¼\" per inch of rise at 30°."]],
  }),
  mk({
    slug: "pull-box-calculator", title: "Pull Box Size Calculator (NEC 314.28)",
    meta: "Pull Box Calculator — NEC 314.28 Straight & Angle Pull Sizing",
    desc: "Size a pull box or junction box for conductors 4 AWG and larger under NEC 314.28: minimum length for a straight pull, and distance to the opposite wall for angle or U pulls from the raceway trade sizes.",
    inputs: [dd("type", "Pull Type", E.PULL_TYPES, 1), num("largest", "Largest Raceway Trade Size (in)", 2, 0.5, 6, 0.25, "in"), tx("others", "Other Raceways in the Same Row (in, comma-separated)", "1.5, 1")],
    results: [["length", "Minimum Dimension", "t"], ["min", "Minimum (in)", "n", 2], ["spacing", "Raceway Spacing", "t"], ["width", "Other Walls", "t"], ["rule", "NEC Rule", "t"]],
    fn: C["pull-box-calculator"], ex: { type: 1, largest: 2, ...T("others", "1.5, 1") },
    exText: (o) => `Example: an angle pull with a 2" raceway plus 1½" and 1" in the same row needs ${o.min}" to the opposite wall.`,
    how: "Straight pull (raceways enter opposite walls): length ≥ 8 × the largest trade size. Angle or U pull (enter adjacent walls or the same wall): distance to the opposite wall ≥ 6 × the largest raceway + the sum of the other raceways entering in that row.\n\nCalculate each direction and each row separately; the largest value sets the box dimension.",
    assume: "Applies to conductors 4 AWG and larger (NEC 2023 314.28). For smaller conductors, use the Box Fill Calculator (NEC 314.16).",
    faq: [["What size pull box for 2\" conduit straight through?", "At least 16\" long (8 × 2\")."], ["Does pull-box sizing apply to small wire?", "No. Under 4 AWG, the volume-based box-fill rules apply instead."]],
  }),
  mk({
    slug: "cable-pulling-tension-calculator", title: "Cable Pulling Tension Calculator (Straights, Bends & Sidewall Pressure)",
    meta: "Cable Pulling Tension Calculator — Bends & Sidewall Pressure",
    desc: "Estimate the pulling tension for a cable pull through conduit sections and bends, from either end, with the sidewall bearing pressure at bends and a check against the conductors' maximum allowed tension.",
    inputs: [num("weight", "Total Cable Weight (lb/ft)", 1.5, 0.01, 100, 0.01, "lb/ft"), num("friction", "Coefficient of Friction (0.35 lubricated – 0.5)", 0.5, 0.05, 1.5, 0.01), tx("route", "Route: S <ft> straight, B <degrees> bend (separate with ;)", "S 100; B 90; S 50; B 90; S 30"), num("radius", "Bend Radius (ft)", 3, 0.1, 100, 0.1, "ft"), num("cmil", "Conductor Size (circular mils, e.g. 250000)", 250000, 0, 5e6, 1000), num("count", "Number of Conductors", 3, 1, 20, 1)],
    results: [["tension", "Pulling Tension — As Entered (lb)", "n", 0], ["reverse", "Pulling Tension — From Other End (lb)", "n", 0], ["best", "Better Direction", "t"], ["max", "Allowed Tension Check", "t"], ["sw", "Peak Sidewall Pressure (lb/ft)", "n", 0], ["swCheck", "Sidewall Check", "t"]],
    fn: C["cable-pulling-tension-calculator"], ex: { weight: 1.5, friction: 0.5, ...T("route", "S 100; B 90; S 50; B 90; S 30"), radius: 3, cmil: 250000, count: 3 },
    exText: (o) => `Example: three 250 kcmil cables (1.5 lb/ft) through 100 ft, a 90°, 50 ft, a 90° and 30 ft need about ${o.tension} lb pulled from the start, but only ${o.reverse} lb from the other end.`,
    how: "Straight sections add weight × friction × length. Bends multiply the tension by e^(friction × angle in radians), so a 90° bend near the end of the pull costs much more than one near the start. That's why pulling from the end nearest the bends is usually easier.\n\nSidewall pressure (tension ÷ bend radius) crushes insulation at bends; keep it within the cable maker's limit.",
    assume: "Horizontal pulls in conduit. Uphill/downhill sections and multi-cable weight-correction factors aren't modelled. Copper conductors allow 0.008 lb per circular mil (80% with more than three).",
    faq: [["Which end should I pull from?", "Usually the end closest to the bends, so the tension is lowest when the cable goes through them."], ["What does pulling lubricant do?", "It lowers the friction coefficient from about 0.5 to 0.35, which cuts tension a lot at bends."]],
  }),
  mk({
    slug: "led-strip-power-calculator", title: "LED Strip Power Supply Calculator (Watts, Amps & PSU Size)",
    meta: "LED Strip Power Calculator — Power Supply Size & Injection",
    desc: "Find the power supply (driver) size for an LED strip from its length, watts per metre and voltage (5 V, 12 V or 24 V), with headroom. Shows current, wire size and when you need power injection. Also works from LEDs per metre for WS2812/addressable strips.",
    inputs: [num("length", "Strip Length (m)", 5, 0.1, 1000, 0.1, "m"), num("wpm", "Watts per Metre (0 = calculate from LEDs)", 14.4, 0, 100, 0.1, "W/m"), num("volts", "Strip Voltage (V)", 24, 3, 48, 1, "V"), num("headroom", "Headroom (%)", 20, 0, 100, 1, "%"), num("ledsPerM", "LEDs per Metre (addressable)", 60, 0, 500, 1), num("ma", "Max mA per LED (WS2812B ≈ 60)", 60, 0, 200, 1, "mA")],
    results: [["psu", "Power Supply to Buy", "t"], ["watts", "Strip Power (W)", "n", 1], ["amps", "Current (A)", "n", 2], ["need", "With Headroom (W)", "n", 1], ["inject", "Power Injection", "t"], ["wire", "Feed Wire", "t"]],
    fn: C["led-strip-power-calculator"], ex: { length: 5, wpm: 14.4, volts: 24, headroom: 20, ledsPerM: 60, ma: 60 },
    exText: (o) => `Example: 5 m of 14.4 W/m strip at 24 V draws ${o.watts} W (${o.amps} A). With 20% headroom, use a ${o.psu} supply.`,
    how: "Power = length × watts per metre (from the strip's label or listing). Current = power ÷ voltage. Choose a supply at least 20% larger than the strip's power so it runs cool and lasts.\n\nLong strips dim and shift colour at the far end because of voltage drop. Feed power in at both ends or every few metres: about 2 m at 5 V, 5 m at 12 V and 10 m at 24 V.",
    assume: "Full-white, full-brightness load (worst case). Addressable strips rarely run every LED at full white, but size for it to be safe. Use a constant-voltage LED driver.",
    faq: [["What power supply for 10 m of 12 V LED strip?", "At 14.4 W/m: 144 W × 1.2 = 173 W, so a 200 W, 12 V supply, with power fed in at both ends."], ["How many amps does a WS2812 strip use?", "Up to 60 mA per LED at full white: 60 LEDs/m × 5 m = 18 A at 5 V."]],
  }),
  mk({
    slug: "beam-angle-calculator", title: "Beam Angle Calculator (Spot Size, Lux & Candela)",
    meta: "Beam Angle Calculator — Light Spot Diameter & Lux at Distance",
    desc: "Work out the diameter of a light's spot from its beam angle and distance, the lit area, average and centre lux and candela, or the beam angle needed for a given spot size, for downlights, spotlights, track and stage lights.",
    inputs: [num("angle", "Beam Angle (°)", 36, 1, 179, 0.5, "°"), num("dist", "Distance to Surface", 3, 0.01, 10000, 0.01), dd("units", "Units", ["Metres", "Feet"], 0), num("lumens", "Light Output (lumens in the beam)", 800, 0, 1e7, 1, "lm"), num("target", "Target Spot Diameter (optional)", 1, 0, 10000, 0.01)],
    results: [["dia", "Spot Diameter", "t"], ["area", "Lit Area", "t"], ["lux", "Average Illuminance (lux)", "n", 0], ["centre", "Centre Illuminance (lux, approx.)", "n", 0], ["cd", "Intensity (candela)", "n", 0], ["need", "Beam Angle for Target Spot", "t"]],
    fn: C["beam-angle-calculator"], ex: { angle: 36, dist: 3, units: 0, lumens: 800, target: 1 },
    exText: (o) => `Example: a 36° spotlight 3 m from the floor lights a circle ${o.dia} across. 800 lm spread over it gives about ${o.lux} lux.`,
    how: "Spot diameter = 2 × distance × tan(beam angle ÷ 2). Narrow beams (10–25°) are for accents and artwork, medium (25–40°) for task lighting and wide (60°+) for general light.\n\nLux = lumens ÷ area. The centre is brighter than the edge, because beam angle is defined where intensity falls to 50% of the peak.",
    assume: "Uniform cone approximation with all listed lumens inside the beam angle. Real fixtures spill light outside it, so check photometric data for exact values.",
    faq: [["What beam angle for 8 ft ceilings?", "About 36–40° for general downlighting and 15–25° for accent lighting."], ["How big is a 24° spot at 2 m?", "About 0.85 m across."]],
  }),
];

const ENERGY: ToolDef[] = [
  mk({
    slug: "solar-string-calculator", title: "Solar String Size Calculator (Panels per String)",
    meta: "Solar String Calculator — Max & Min Panels per Inverter String",
    desc: "Find how many solar panels you can put in series per string so the cold-weather open-circuit voltage stays below the inverter's maximum and the hot-weather MPP voltage stays within its MPPT range. Also checks string current.",
    inputs: [num("voc", "Panel Voc (V)", 49.5, 1, 200, 0.01, "V"), num("vmp", "Panel Vmp (V)", 41.6, 1, 200, 0.01, "V"), num("isc", "Panel Isc (A)", 13.9, 0.1, 50, 0.01, "A"), num("beta", "Voc Temperature Coefficient (%/°C)", -0.27, -1, 0, 0.01, "%/°C"), num("gamma", "Pmax/Vmp Temperature Coefficient (%/°C)", -0.35, -1, 0, 0.01, "%/°C"), num("tmin", "Record Low Temperature (°C)", -10, -60, 40, 1, "°C"), num("thot", "Hot Cell Temperature (°C)", 70, 25, 100, 1, "°C"), num("vmax", "Inverter Max DC Voltage (V)", 600, 50, 2000, 1, "V"), num("mppMin", "MPPT Range Minimum (V)", 100, 0, 2000, 1, "V"), num("mppMax", "MPPT Range Maximum (V)", 550, 0, 2000, 1, "V"), num("imax", "Inverter Max Input Current per MPPT (A)", 16, 0.1, 100, 0.1, "A")],
    results: [["range", "Panels per String", "t"], ["best", "Longest String", "t"], ["max", "Maximum Panels", "n", 0], ["min", "Minimum Panels", "n", 0], ["vocCold", "Voc per Panel at Cold (V)", "n", 2], ["vmpHot", "Vmp per Panel when Hot (V)", "n", 2], ["current", "Current Check", "t"]],
    fn: C["solar-string-calculator"], ex: { voc: 49.5, vmp: 41.6, isc: 13.9, beta: -0.27, gamma: -0.35, tmin: -10, thot: 70, vmax: 600, mppMin: 100, mppMax: 550, imax: 16 },
    exText: (o) => `Example: panels with Voc 49.5 V reach ${o.vocCold} V each at −10 °C, so a 600 V inverter takes up to ${o.max} in series (${o.range}).`,
    how: "Panel voltage rises in the cold, so the string's open-circuit voltage on the coldest morning must stay under the inverter's maximum DC voltage (NEC 690.7). When the panels are hot, voltage drops, so the string must still be above the MPPT minimum to keep producing.\n\nUse the record low temperature for your site, and about 25–35 °C above the air temperature for hot cell temperature.",
    assume: "Temperature-coefficient method (NEC 690.7(A)(2)). Shading, bifacial gain and inverter start-up voltage aren't included. Check the inverter's data sheet and local code.",
    faq: [["Why limit panels per string?", "Too many in series can exceed the inverter's voltage on a cold, sunny morning and damage it."], ["What hot cell temperature should I use?", "About 65–75 °C for roof-mounted panels in summer."]],
  }),
  mk({
    slug: "server-power-cost-calculator", title: "Server & Data Center Power Cost Calculator (PUE & Cooling)",
    meta: "Server Power Calculator — Electricity Cost, PUE & Cooling BTU",
    desc: "Estimate the electricity cost of running servers or a server room from the number of servers, average watts, PUE and your power price. Also gives monthly kWh, the IT and facility load, cooling in BTU/h and tons, and the current draw.",
    inputs: [num("servers", "Number of Servers", 10, 0, 1e6, 1), num("watts", "Average Power per Server (W)", 350, 1, 50000, 1, "W"), num("pue", "PUE (1.0 = no overhead, 1.5 typical)", 1.5, 1, 4, 0.01), money("price", "Electricity Price ($ per kWh)", 0.14), num("hours", "Hours per Day", 24, 1, 24, 0.5, "h")],
    results: [["monthly", "Monthly Cost", "c"], ["yearly", "Yearly Cost", "c"], ["perServer", "Cost per Server per Month", "t"], ["kwh", "Energy per Month (kWh)", "t"], ["it", "IT Load (kW)", "n", 2], ["facility", "Facility Load with PUE (kW)", "n", 2], ["btu", "Cooling Needed (BTU/h)", "t"], ["tons", "Cooling (tons)", "n", 2], ["amps", "Current Draw", "t"]],
    fn: C["server-power-cost-calculator"], ex: { servers: 10, watts: 350, pue: 1.5, price: 0.14, hours: 24 },
    exText: (o) => `Example: 10 servers averaging 350 W in a room with PUE 1.5 at $0.14/kWh cost about $${o.monthly} a month. They need ${o.btu} BTU/h of cooling.`,
    how: "Use the servers' average draw, not the power supply rating; it's usually 30–60% of nameplate. PUE (power usage effectiveness) adds cooling, UPS and lighting overhead: total power = IT power × PUE.\n\nEvery watt of IT load turns into heat, so cooling must remove 3.412 BTU/h per watt.",
    assume: "Constant average load. A month is 30.44 days. Demand charges and tiered tariffs aren't included.",
    faq: [["How much does it cost to run a server 24/7?", "A 300 W server uses about 219 kWh a month, which is about $30 at $0.14/kWh before cooling overhead."], ["What is a good PUE?", "Large modern data centres run about 1.1–1.3. Small server rooms are often 1.6–2.0."]],
  }),
];

const MFG: ToolDef[] = [
  mk({
    slug: "weld-settings-calculator", title: "Weld Settings Calculator (MIG, TIG & Stick Amps, Volts, Wire Speed)",
    meta: "Welding Settings Calculator — MIG, TIG & Stick Amperage Chart",
    desc: "Get starting welding settings from material thickness: amperage for MIG, flux-core, TIG or stick, plus wire size and wire-feed speed, voltage, tungsten or electrode size, shielding gas and whether multiple passes are needed.",
    inputs: [dd("process", "Process & Material", E.WELD_PROCESSES, 0), num("thick", "Material Thickness", 0.125, 0.01, 50, 0.001), dd("units", "Thickness Units", ["Inches", "Millimetres"], 0)],
    results: [["amps", "Amperage (A)", "n", 0], ["wire", "Wire / Tungsten / Electrode", "t"], ["feed", "Wire Feed / Filler", "t"], ["volts", "Voltage / Polarity", "t"], ["gas", "Shielding Gas", "t"], ["passes", "Passes", "t"]],
    fn: C["weld-settings-calculator"], ex: { process: 0, thick: 0.125, units: 0 },
    exText: (o) => `Example: MIG welding ⅛" mild steel starts around ${o.amps} A with ${o.wire}, ${o.feed} and ${o.volts}.`,
    how: "The classic rule of thumb is about 1 amp for every 0.001\" of steel thickness, so ⅛\" (0.125\") takes about 125 A. Aluminium needs about 10% more because it conducts heat away faster.\n\nFor MIG, the wire-feed speed sets the amperage and the voltage sets the arc length. Start here, run a test bead on scrap, then adjust using your machine's door chart.",
    assume: "Starting points for flat-position fillet and butt welds on clean metal. Vertical and overhead welds need 10–20% less current. Always follow your machine and wire maker's recommendations.",
    faq: [["What amperage for 1/4\" steel?", "About 180–250 A, usually in more than one pass with a bevel. Stick: a 1/8\" or 5/32\" E7018 at 120–160 A."], ["What wire size for MIG on sheet metal?", "0.023\" or 0.024\" for 22–16 gauge."]],
  }),
];

async function main() {
  const all = [...HOUSE, ...ENERGY, ...MFG];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("hvac-plumbing-electrical-calculators", HOUSE);
  await upsertTools("energy-solar-electrical-calculators", ENERGY);
  await upsertTools("manufacturing-metals-engineering-calculators", MFG);
}
main().catch((e) => { console.error(e); process.exit(1); });
