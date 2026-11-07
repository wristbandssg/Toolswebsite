// One-time (but safe to re-run) batch setup script: creates 46 calculators in House & Garden
// Calculators > HVAC, Plumbing & Electrical Calculators (heating, cooling, refrigerant, ducts, ventilation, fireplaces and HVAC costs). Formulas live in src/lib/calc-engine-hg-hvac.ts; examples are computed
// from the engine.
//
// HOW TO RUN (after prisma/setup-house-garden-category.ts --apply)
//   npx tsx prisma/create-hg-hvac-calculators.ts
// or
//   npm run db:create-hg-hvac-calculators

import * as E from "../src/lib/calc-engine-hg-hvac";

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

const CAT = "hvac-plumbing-electrical-calculators";
const NOTE = "";
const COST_NOTE = "Prices are typical 2026 US installed costs and vary by region, brand and job — get at least three quotes.";
const REF = dd("refrigerant", "Refrigerant", E.REFRIGERANTS);
const COSTRES: Line[] = [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]];
const INS3 = (def = 1) => dd("insulation", "Insulation", ["Poor / none", "Average", "Good"], def);
const ROOMDIMS = [num("length", "Room Length", 14, 200, 0.5, 1, "ft"), num("width", "Room Width", 12, 200, 0.5, 1, "ft"), num("height", "Ceiling Height", 8, 30, 0.5, 6, "ft")];

const TOOLS: ToolDef[] = [
  mk({
    slug: "wet-bulb-calculator", title: "Wet Bulb Temperature Calculator (Heat Stress & Dew Point)",
    desc: "Calculate the wet bulb temperature from air temperature and relative humidity — with the dew point and a heat-stress rating — in °F and °C.",
    meta: "Wet Bulb Calculator — Wet Bulb Temperature & Dew Point",
    inputs: [num("temp", "Air Temperature", 90, 130, 0.5, -20, "°F"), pct("humidity", "Relative Humidity", 50, 100, 1)],
    results: [["wetBulbF", "Wet Bulb (°F)", "n"], ["wetBulbC", "Wet Bulb (°C)", "n"], ["dewPointF", "Dew Point (°F)", "n"], ["stress", "Heat Stress", "l", E.HEAT_STRESS]],
    fn: E.wetBulb, ex: { temp: 90, humidity: 50 },
    exText: (o) => `Example: 90 °F air at 50% humidity has a wet bulb of about ${o.wetBulbF} °F (${o.wetBulbC} °C) and a dew point of ${o.dewPointF} °F.`,
    how: "Wet bulb is the lowest temperature evaporation can reach — it tells you how well sweat (or an evaporative cooler) can cool. A wet bulb near 95 °F (35 °C) is beyond what the human body can tolerate for long.",
    assume: "Stull (2011) formula, accurate to about ±0.6 °F for humidity 5–99% at sea level; dew point by the Magnus formula.",
    faq: [["What is a dangerous wet bulb temperature?", "Above about 86 °F (30 °C) for hard work; 95 °F (35 °C) is the theoretical survival limit."]],
  }),
  mk({
    slug: "mixed-air-calculator", title: "Mixed Air Temperature Calculator (Outside Air %)",
    desc: "Calculate the mixed air temperature from outside and return air temperatures and the outside-air percentage — or find the outside-air % from a measured mixed temperature.",
    inputs: [num("outsideTemp", "Outside Air Temperature", 30, 120, 0.5, -40, "°F"), num("returnTemp", "Return Air Temperature", 72, 100, 0.5, 40, "°F"), pct("outsidePct", "Outside Air", 20, 100, 1), num("measuredMixed", "Measured Mixed Air (optional)", 0, 120, 0.5, -40, "°F")],
    results: [["mixedTempF", "Mixed Air Temperature (°F)", "n"], ["outsideAirPctFromMeasured", "Outside Air % From Measurement", "n"]],
    fn: E.mixedAir, ex: { outsideTemp: 30, returnTemp: 72, outsidePct: 20, measuredMixed: 0 },
    exText: (o) => `Example: 20% outside air at 30 °F mixed with 72 °F return air gives about ${o.mixedTempF} °F mixed air.`,
    how: "Use it to check economizer settings or freeze protection on air handlers. Measure mixed air well downstream of the mixing box, where it's fully blended.",
    assume: "Mixed temperature = OA% × OAT + (1 − OA%) × RAT (sensible mixing).",
    faq: [["How do you calculate outside air percentage?", "(Mixed − return) ÷ (outside − return) × 100."]],
  }),
  mk({
    slug: "delta-t-calculator", title: "HVAC Delta T Calculator (Temperature Split)",
    desc: "Check your AC or furnace temperature split — the delta T between return and supply air — whether it's in the normal range, and the BTU/hr it represents at your airflow.",
    inputs: [dd("mode", "Mode", ["Cooling", "Heating (furnace temperature rise)"]), num("returnTemp", "Return Air Temperature", 75, 120, 0.5, 30, "°F"), num("supplyTemp", "Supply Air Temperature", 57, 160, 0.5, 30, "°F"), num("cfm", "Airflow", 1200, 10000, 10, 0, "cfm")],
    results: [["deltaT", "Delta T (°F)", "n"], ["status", "Diagnosis", "l", E.DELTA_STATUS], ["btuPerHour", "Sensible Capacity (BTU/hr)", "n"]],
    fn: E.deltaT, ex: { mode: 0, returnTemp: 75, supplyTemp: 57, cfm: 1200 },
    exText: (o) => `Example: 75 °F return and 57 °F supply air is an ${o.deltaT} °F split — ${E.DELTA_STATUS[o.status].split(" — ")[0].toLowerCase()}.`,
    how: "Measure at the return grille and the supply register closest to the air handler after the system has run 10–15 minutes. Humid days lower the cooling split; the furnace rise range is printed on its data plate.",
    assume: "Normal cooling split ≈ 16–22 °F; furnace rise ≈ 30–70 °F. Sensible BTU/hr = 1.08 × cfm × ΔT.",
    faq: [["What should the AC temperature difference be?", "About 16–22 °F between return and supply air."]],
  }),
  mk({
    slug: "refrigerant-pt-calculator", title: "Refrigerant Pressure–Temperature (PT) Calculator",
    desc: "Look up refrigerant saturation temperature from pressure (and pressure from temperature) for R-410A, R-22 and R-134a — plus an R-12 to R-134a charge conversion.",
    inputs: [REF, num("pressure", "Pressure", 118, 600, 0.5, -5, "psig"), num("temp", "Temperature", 40, 150, 0.5, -20, "°F"), num("r12Charge", "Original R-12 Charge (optional)", 0, 200, 0.5, 0, "oz")],
    results: [["satTempF", "Saturation Temp at That Pressure (°F)", "n"], ["pressureAtTempPsig", "Pressure at That Temperature (psig)", "n"], ["r134aChargeOz", "R-134a Charge for R-12 Conversion (oz)", "n"]],
    fn: E.refrigerantPt, ex: { refrigerant: 0, pressure: 118, temp: 40, r12Charge: 0 },
    exText: (o) => `Example: R-410A at 118 psig boils at about ${o.satTempF} °F; at 40 °F its saturation pressure is ${o.pressureAtTempPsig} psig.`,
    how: "Use the saturation temperature with your line temperature to get superheat or subcooling. When converting a car from R-12, charge R-134a at about 80–90% of the original R-12 weight.",
    assume: "Interpolated from standard PT charts (−20 to 130 °F). Blends with glide (R-407C, R-454B) need dew/bubble tables from the maker. Refrigerant work requires EPA Section 608 certification.",
    faq: [["What is R-410A pressure at 40 degrees?", "About 118 psig."]],
  }),
  mk({
    slug: "superheat-calculator", title: "Superheat Calculator (AC Charge Check)",
    desc: "Calculate superheat from suction pressure and suction line temperature for R-410A, R-22 or R-134a — and see whether it's low, normal or high.",
    inputs: [REF, num("suctionPressure", "Suction Pressure", 118, 300, 0.5, 0, "psig"), num("lineTemp", "Suction Line Temperature", 52, 120, 0.5, -20, "°F")],
    results: [["superheatF", "Superheat (°F)", "n"], ["satTempF", "Suction Saturation Temp (°F)", "n"], ["status", "Diagnosis", "l", E.SUPERHEAT_STATUS]],
    fn: E.superheat, ex: { refrigerant: 0, suctionPressure: 118, lineTemp: 52 },
    exText: (o) => `Example: R-410A at 118 psig with a 52 °F suction line has about ${o.superheatF} °F of superheat.`,
    how: "Measure the suction line temperature 6 in from the service valve with a clamp thermometer. Fixed-orifice systems use a target superheat chart (indoor wet bulb and outdoor temperature); TXV systems are charged by subcooling.",
    assume: "Superheat = line temperature − saturation temperature (PT chart). Typical ranges only — follow the manufacturer's charging chart.",
    faq: [["What should superheat be on R-410A?", "Often about 8–14 °F on TXV systems, but use the target from the charging chart."]],
  }),
  mk({
    slug: "subcooling-calculator", title: "Subcooling Calculator (TXV Charge Check)",
    desc: "Calculate subcooling from liquid line pressure and temperature for R-410A, R-22 or R-134a — and compare it with the typical target for TXV systems.",
    inputs: [REF, num("liquidPressure", "Liquid Line Pressure", 317, 600, 0.5, 0, "psig"), num("lineTemp", "Liquid Line Temperature", 90, 150, 0.5, 30, "°F")],
    results: [["subcoolingF", "Subcooling (°F)", "n"], ["satTempF", "Condensing Saturation Temp (°F)", "n"], ["status", "Diagnosis", "l", E.SUBCOOL_STATUS]],
    fn: E.subcooling, ex: { refrigerant: 0, liquidPressure: 317, lineTemp: 90 },
    exText: (o) => `Example: R-410A at 317 psig with a 90 °F liquid line has ${o.subcoolingF} °F of subcooling.`,
    how: "Measure liquid pressure and line temperature at the condenser's liquid service valve. The target subcooling is on the outdoor unit's data plate (often 8–12 °F).",
    assume: "Subcooling = saturation temperature − line temperature.",
    faq: [["What is normal subcooling for R-410A?", "Usually about 8–12 °F — check the unit's data plate."]],
  }),
  mk({
    slug: "refrigerant-charge-calculator", title: "Refrigerant Charge Calculator (Line Set Length)",
    desc: "Calculate how much refrigerant to add for a long line set — ounces per foot by liquid line size beyond the factory charge — for R-410A or R-454B.",
    inputs: [dd("refrigerant", "Refrigerant", ["R-410A", "R-454B"]), num("lineLength", "Line Set Length", 35, 200, 1, 0, "ft"), num("factoryLength", "Length Included in Factory Charge", 15, 50, 1, 0, "ft"), dd("liquidLine", "Liquid Line Size", ["1/4 in", "5/16 in", "3/8 in", "1/2 in"], 2), num("factoryCharge", "Factory Charge (data plate)", 6, 50, 0.1, 0, "lb")],
    results: [["addOz", "Refrigerant to Add (oz)", "n"], ["addLb", "To Add (lb)", "n"], ["totalChargeLb", "Total System Charge (lb)", "n"], ["extraFeet", "Extra Line Length (ft)", "n"]],
    fn: E.refrigerantCharge, ex: { refrigerant: 0, lineLength: 35, factoryLength: 15, liquidLine: 2, factoryCharge: 6 },
    exText: (o) => `Example: a 35 ft line set with a 3/8 in liquid line needs about ${o.addOz} oz of R-410A beyond the 15 ft factory charge.`,
    how: "The unit's installation manual lists the factory-charged length and ounces per foot — use those first. Weigh the charge in, then verify with subcooling or superheat.",
    assume: "Typical additional charge for R-410A: 1/4 in 0.3, 5/16 in 0.4, 3/8 in 0.6, 1/2 in 1.2 oz per ft; R-454B about 10% less by weight.",
    faq: [["How much refrigerant per foot of line set?", "About 0.6 oz per ft for a 3/8 in liquid line with R-410A."]],
  }),
  mk({
    slug: "manual-j-load-calculator", title: "HVAC Load Calculator (Manual J Estimate)",
    desc: "Estimate a home's heating and cooling loads — BTU/hr, AC tons and furnace size — from floor area, climate zone, insulation, ceiling height, windows, sun and occupants.",
    meta: "HVAC Load Calculator — Manual J Style Heating & Cooling Estimate",
    inputs: [num("area", "Conditioned Floor Area", 2000, 20000, 10, 0, "sq ft"), dd("zone", "Climate Zone", ["Zone 1 (very hot)", "Zone 2 (hot)", "Zone 3 (warm)", "Zone 4 (mixed)", "Zone 5 (cool)", "Zone 6 (cold)", "Zone 7 (very cold)"], 3), INS3(), num("ceiling", "Average Ceiling Height", 8, 20, 0.5, 7, "ft"), dd("windows", "Windows", ["Few / small", "Average", "Lots of glass"], 1), dd("sun", "Sun Exposure", ["Mostly shaded", "Average", "Full sun"], 1), num("occupants", "Occupants", 4, 20, 1, 1)],
    results: [["coolingBtu", "Cooling Load (BTU/hr)", "n"], ["tons", "AC Size (tons)", "n"], ["heatingBtu", "Heating Load (BTU/hr)", "n"], ["furnaceInputBtu", "Furnace Input at 95% AFUE (BTU/hr)", "n"]],
    fn: E.manualJLoad, ex: { area: 2000, zone: 3, insulation: 1, ceiling: 8, windows: 1, sun: 1, occupants: 4 },
    exText: (o) => `Example: a 2,000 sq ft average home in climate zone 4 needs about ${n2(o.coolingBtu)} BTU/hr of cooling (${o.tons} tons) and ${n2(o.heatingBtu)} BTU/hr of heating.`,
    how: "This is a quick estimate. A real ACCA Manual J calculation room by room (required by many codes and utility rebates) uses wall, window and duct details and often gives a smaller system than rules of thumb.",
    assume: "Cooling 16–30 BTU/sq ft and heating 10–50 BTU/sq ft by climate zone, adjusted for insulation, height, glass and sun; +400 BTU per occupant and 1,200 for the kitchen.",
    faq: [["What size AC do I need for 2,000 square feet?", "Often 3–4 tons by rule of thumb; a Manual J may show 2.5–3 tons for a well-insulated home."]],
  }),
  mk({
    slug: "heat-loss-calculator", title: "Heat Loss Calculator (Room & Whole House)",
    desc: "Calculate room heat loss in BTU/hr and watts — through walls, windows, ceiling and floor using R-values and U-values, plus air leakage — for heater and radiator sizing.",
    inputs: [...ROOMDIMS, num("exteriorWall", "Exterior Wall Length", 26, 500, 0.5, 0, "ft"), num("windowArea", "Window Area", 20, 1000, 1, 0, "sq ft"), num("wallR", "Wall R-Value", 13, 60, 1, 1), num("windowU", "Window U-Factor", 0.35, 1.2, 0.01, 0.1), dd("ceilingExposed", "Ceiling Below an Unheated Attic?", ["No", "Yes"], 1), num("ceilingR", "Ceiling R-Value", 38, 80, 1, 1), dd("floorExposed", "Floor Over Unheated Space?", ["No", "Yes"]), num("floorR", "Floor R-Value", 19, 60, 1, 1), num("ach", "Air Changes per Hour (leakage)", 0.5, 3, 0.05, 0), num("insideTemp", "Indoor Temperature", 70, 80, 1, 50, "°F"), num("outsideTemp", "Design Outdoor Temperature", 10, 60, 1, -40, "°F")],
    results: [["btuPerHour", "Heat Loss (BTU/hr)", "n"], ["watts", "Heat Loss (W)", "n"], ["btuPerSqFt", "BTU/hr per Sq Ft", "n"]],
    fn: E.heatLoss, ex: { length: 14, width: 12, height: 8, exteriorWall: 26, windowArea: 20, wallR: 13, windowU: 0.35, ceilingExposed: 1, ceilingR: 38, floorExposed: 0, floorR: 19, ach: 0.5, insideTemp: 70, outsideTemp: 10 },
    exText: (o) => `Example: a 14 × 12 ft corner bedroom with R-13 walls, 20 sq ft of double-pane windows and an R-38 ceiling loses about ${n2(o.btuPerHour)} BTU/hr (${o.watts} W) at 10 °F outside.`,
    how: "Use your area's winter design temperature (the 99% heating design temperature). Add up all rooms for the whole house. Old, leaky houses can have 1–2 air changes per hour; new tight homes 0.3–0.5.",
    assume: "Conduction = Σ(area ÷ R or × U) × ΔT; infiltration = 0.018 × volume × ACH × ΔT. Ignores framing thermal bridges and ducts in unconditioned space.",
    faq: [["How do you calculate heat loss for a room?", "Add each surface's area ÷ R-value × temperature difference, plus air leakage."]],
  }),
  mk({
    slug: "commercial-hvac-size-calculator", title: "Commercial HVAC Sizing Calculator (Tons per Sq Ft)",
    desc: "Estimate commercial HVAC tonnage by building type — office, retail, restaurant, warehouse, medical, school or server room — with BTU/hr and rooftop units.",
    inputs: [num("area", "Floor Area", 10000, 10000000, 100, 0, "sq ft"), dd("type", "Building Type", E.COMMERCIAL_TYPES), num("customSqFtPerTon", "Your Sq Ft per Ton (0 = typical)", 0, 2000, 10, 0), num("maxUnitTons", "Largest Rooftop Unit", 25, 100, 1, 3, "tons")],
    results: [["tons", "Cooling (tons)", "n"], ["btuPerHour", "BTU/hr", "n"], ["rooftopUnits", "Rooftop Units", "n"], ["sqFtPerTon", "Sq Ft per Ton Used", "n"]],
    fn: E.commercialHvacSize, ex: { area: 10000, type: 0, customSqFtPerTon: 0, maxUnitTons: 25 },
    exText: (o) => `Example: a 10,000 sq ft office needs roughly ${o.tons} tons of cooling — about ${o.rooftopUnits} rooftop unit(s).`,
    how: "Rules of thumb give a first budget number only. Commercial systems must be designed with a full load calculation (ASHRAE / ACCA Manual N) for ventilation, occupancy, lighting and equipment.",
    assume: "Typical sq ft per ton: office 350, retail 300, restaurant 200, warehouse 1,000, medical 250, school 300, server room 100.",
    faq: [["How many tons of AC per square foot for commercial?", "Often 1 ton per 250–400 sq ft for offices and retail."]],
  }),
  mk({
    slug: "metal-building-hvac-calculator", title: "Metal Building HVAC Size Calculator",
    desc: "Estimate heating and cooling for a metal building, shop or barndominium — tons, BTU/hr and kW — by area, eave height, insulation and climate.",
    inputs: [num("area", "Floor Area", 2400, 1000000, 10, 0, "sq ft"), num("height", "Eave Height", 14, 40, 0.5, 8, "ft"), dd("insulation", "Insulation", ["None (bare steel)", "Fiberglass blanket (3–6 in)", "Spray foam"], 1), dd("climate", "Climate", ["Hot", "Mixed", "Cold"], 1)],
    results: [["coolingTons", "Cooling (tons)", "n"], ["coolingBtu", "Cooling (BTU/hr)", "n"], ["heatingBtu", "Heating (BTU/hr)", "n"], ["heatingKw", "Heating (kW)", "n"]],
    fn: E.metalBuildingHvac, ex: { area: 2400, height: 14, insulation: 1, climate: 1 },
    exText: (o) => `Example: an insulated 2,400 sq ft shop with 14 ft walls needs about ${o.coolingTons} tons of cooling and ${n2(o.heatingBtu)} BTU/hr of heat.`,
    how: "Uninsulated steel buildings gain and lose heat fast — insulating the roof first gives the biggest improvement. Tall eaves add volume that has to be heated.",
    assume: "Cooling 22–40 and heating 24–45 BTU/sq ft by insulation, adjusted for climate and for height above 10 ft.",
    faq: [["What size AC for a 40x60 metal building?", "About 5–8 tons insulated, depending on climate."]],
  }),
  mk({
    slug: "garage-heater-size-calculator", title: "Garage Heater Size Calculator (BTU & kW)",
    desc: "Size a garage heater — BTU/hr, kW, 240 V amps and propane use — from the garage size, insulation and how much warmer you want it than outside.",
    inputs: [num("length", "Garage Length", 24, 100, 0.5, 8, "ft"), num("width", "Garage Width", 24, 100, 0.5, 8, "ft"), num("height", "Ceiling Height", 9, 20, 0.5, 7, "ft"), INS3(), num("insideTemp", "Desired Temperature", 55, 75, 1, 32, "°F"), num("outsideTemp", "Cold-Day Temperature", 10, 50, 1, -30, "°F")],
    results: [["btuPerHour", "Heater Size (BTU/hr)", "n"], ["kilowatts", "Electric Heater (kW)", "n"], ["amps240", "Amps at 240 V", "n"], ["propaneGalPerHour", "Propane at Full Output (gal/hr)", "n"]],
    fn: E.garageHeater, ex: { length: 24, width: 24, height: 9, insulation: 1, insideTemp: 55, outsideTemp: 10 },
    exText: (o) => `Example: a 24 × 24 ft two-car garage held at 55 °F on a 10 °F day needs about ${n2(o.btuPerHour)} BTU/hr (${o.kilowatts} kW).`,
    how: "Insulating the garage door and walls cuts the heater size a lot. Unvented propane heaters aren't safe in closed garages — use vented gas or electric units.",
    assume: "BTU/hr = volume × temperature rise × 0.18 (uninsulated), 0.133 (average) or 0.1 (well insulated).",
    faq: [["What size heater for a 2 car garage?", "About 30,000–45,000 BTU/hr (9–13 kW) for an average insulated garage in cold weather."]],
  }),
  mk({
    slug: "tube-heater-size-calculator", title: "Radiant Tube Heater Sizing Calculator",
    desc: "Size infrared radiant tube heaters for a shop, warehouse or garage — BTU/hr, number of heaters and spacing — from building size, insulation and temperature rise.",
    inputs: [num("length", "Building Length", 60, 1000, 1, 10, "ft"), num("width", "Building Width", 40, 500, 1, 10, "ft"), num("height", "Ceiling Height", 16, 50, 0.5, 8, "ft"), INS3(), num("insideTemp", "Desired Temperature", 60, 75, 1, 40, "°F"), num("outsideTemp", "Design Outdoor Temperature", 0, 50, 1, -40, "°F"), num("heaterBtu", "Heater Size", 100000, 250000, 5000, 20000, "BTU/hr")],
    results: [["btuPerHour", "Total Heating (BTU/hr)", "n"], ["heaters", "Heaters", "n"], ["spacingFt", "Spacing Along the Building (ft)", "n"]],
    fn: E.tubeHeater, ex: { length: 60, width: 40, height: 16, insulation: 1, insideTemp: 60, outsideTemp: 0, heaterBtu: 100000 },
    exText: (o) => `Example: a 60 × 40 ft shop with 16 ft ceilings needs about ${n2(o.btuPerHour)} BTU/hr — ${o.heaters} tube heater(s) of 100,000 BTU.`,
    how: "Radiant heaters warm people and floors directly, so they're typically sized about 15% smaller than forced-air heaters. Follow the maker's clearance-to-combustibles and mounting-height charts.",
    assume: "Convective estimate × 0.85; factors 0.065 / 0.045 / 0.032 BTU per cu ft per °F for poor, average and good insulation.",
    faq: [["How do you size a tube heater?", "Estimate the building heat loss, then use roughly 85% of it in radiant heater BTUs."]],
  }),
  mk({
    slug: "sauna-heater-size-calculator", title: "Sauna Heater Size Calculator (kW)",
    desc: "Find the right sauna heater size in kW — from room dimensions plus glass and bare stone or tile surfaces — with a standard heater size and 240 V amps.",
    inputs: [num("length", "Sauna Length", 6, 20, 0.25, 3, "ft"), num("width", "Sauna Width", 6, 20, 0.25, 3, "ft"), num("height", "Sauna Height", 7, 10, 0.25, 6, "ft"), num("glass", "Glass Door / Windows", 0, 100, 0.5, 0, "sq ft"), num("stone", "Uninsulated Stone, Tile or Concrete", 0, 200, 0.5, 0, "sq ft")],
    results: [["heaterSizeKw", "Standard Heater Size (kW)", "n"], ["recommendedKw", "Calculated Need (kW)", "n"], ["effectiveVolumeM3", "Effective Volume (m³)", "n"], ["amps240", "Amps at 240 V", "n"]],
    fn: E.saunaHeater, ex: { length: 6, width: 6, height: 7, glass: 0, stone: 0 },
    exText: (o) => `Example: a 6 × 6 × 7 ft wood-lined sauna (${o.effectiveVolumeM3} m³) suits a ${o.heaterSizeKw} kW heater.`,
    how: "Every square foot of glass or bare masonry soaks up heat, so it counts as extra volume. Always stay within the heater maker's room-size range and use a dedicated circuit.",
    assume: "≈ 1 kW per m³, with each m² of glass or uninsulated masonry adding ~1.2 m³; standard sizes 3, 4.5, 6, 8, 9, 10.5, 12 and 15 kW.",
    faq: [["What size heater for a 6x6 sauna?", "About 6 kW for a 7 ft tall, wood-lined room."]],
  }),
  mk({
    slug: "boiler-size-calculator", title: "Boiler Size Calculator (BTU, kW & Combi Size)",
    desc: "Estimate the boiler size you need — heating BTU/hr and kW from home size, climate and insulation — and which combi or system boiler suits your bathrooms.",
    inputs: [num("area", "Heated Floor Area", 2000, 20000, 10, 0, "sq ft"), dd("climate", "Climate", ["Mild", "Moderate", "Cold", "Very cold"], 1), INS3(), num("bathrooms", "Bathrooms", 1, 6, 1, 1), dd("showersAtOnce", "Two Showers Often Run at Once?", ["No", "Yes"])],
    results: [["heatingBtu", "Heating Output Needed (BTU/hr)", "n"], ["heatingKw", "Heating Output (kW)", "n"], ["combi", "Hot Water Recommendation", "l", E.COMBI_SIZES], ["boilerInputBtu", "Boiler Input at 90% (BTU/hr)", "n"]],
    fn: E.boilerSize, ex: { area: 2000, climate: 1, insulation: 1, bathrooms: 1, showersAtOnce: 0 },
    exText: (o) => `Example: a 2,000 sq ft home in a moderate climate needs about ${n2(o.heatingBtu)} BTU/hr (${o.heatingKw} kW) of heat.`,
    how: "Combi boilers heat water on demand — size them for hot-water flow (bathrooms), not only for heating. Homes with several bathrooms usually do better with a system boiler and a hot-water cylinder. A room-by-room heat loss gives the most accurate size.",
    assume: "30–60 BTU/sq ft by climate, ±15–20% for insulation; combi sizes are common UK/US guidance.",
    faq: [["What size boiler do I need?", "About 50,000–100,000 BTU/hr for many 1,500–2,500 sq ft homes; combis are 24–40 kW."]],
  }),
  mk({
    slug: "radiator-btu-calculator", title: "Radiator BTU Calculator (Size & Output)",
    desc: "Calculate the BTU and watts a room's radiator needs — by room type, size, north-facing walls, windows and insulation — and convert a radiator's ΔT50 output to your system's flow temperature.",
    inputs: [...ROOMDIMS.map((x, i) => (i === 0 ? num("length", "Room Length", 12, 100, 0.5, 1, "ft") : i === 1 ? num("width", "Room Width", 12, 100, 0.5, 1, "ft") : x)), dd("room", "Room", ["Living room", "Bedroom", "Bathroom", "Kitchen", "Hallway"]), dd("north", "North-Facing?", ["No", "Yes"]), dd("windows", "Large or Single-Glazed Windows?", ["No", "Yes"]), num("externalWalls", "External Walls", 1, 4, 1, 0), dd("insulation", "Well Insulated?", ["No", "Yes"]), num("radiatorDelta50", "Radiator Rated Output at ΔT50 (optional)", 0, 10000, 10, 0, "W"), num("flowTemp", "Flow Temperature", 70, 90, 1, 30, "°C"), num("returnTemp", "Return Temperature", 60, 80, 1, 20, "°C"), num("roomTemp", "Room Temperature", 20, 25, 0.5, 10, "°C")],
    results: [["btuPerHour", "Heat Needed (BTU/hr)", "n"], ["watts", "Heat Needed (W)", "n"], ["radiatorOutputW", "Your Radiator's Real Output (W)", "n"], ["deltaT", "System ΔT (°C)", "n"]],
    fn: E.radiatorBtu, ex: { length: 12, width: 12, height: 8, room: 0, north: 0, windows: 0, externalWalls: 1, insulation: 0, radiatorDelta50: 0, flowTemp: 70, returnTemp: 60, roomTemp: 20 },
    exText: (o) => `Example: a 12 × 12 ft living room with 8 ft ceilings needs about ${n2(o.btuPerHour)} BTU/hr (${n2(o.watts)} W) of radiator output.`,
    how: "Radiator outputs are usually quoted at ΔT50 (75 °C flow). Heat pumps and condensing boilers run cooler — at ΔT30 a radiator gives only about half its ΔT50 rating, so enter your flow temperature to check.",
    assume: "Rule of thumb: room volume (cu ft) × 5 (living), 4 (bedroom, kitchen), 6 (bathroom); +15% north-facing, +10% big or single-glazed windows, +10% for two or more external walls, −10% if well insulated. Output at ΔT = ΔT50 rating × (ΔT ÷ 50)^1.3.",
    faq: [["How many BTUs does a radiator need?", "Roughly 4–6 BTU per cubic foot of room depending on the room."]],
  }),
  mk({
    slug: "baseboard-heater-size-calculator", title: "Baseboard Heater Size Calculator (Watts & Feet)",
    desc: "Size electric baseboard heat for a room — watts, feet of baseboard heater, number of heaters and 240 V amps — from room area, ceiling height and insulation.",
    inputs: [num("area", "Room Area", 150, 2000, 1, 10, "sq ft"), num("ceiling", "Ceiling Height", 8, 20, 0.5, 6, "ft"), INS3()],
    results: [["watts", "Heating Needed (W)", "n"], ["heaterFeet", "Baseboard Length (ft at 250 W/ft)", "n"], ["heaters", "Heaters (up to 6 ft each)", "n"], ["amps240", "Amps at 240 V", "n"]],
    fn: E.baseboardHeater, ex: { area: 150, ceiling: 8, insulation: 1 },
    exText: (o) => `Example: a 150 sq ft room with average insulation needs about ${n2(o.watts)} W — ${o.heaterFeet} ft of baseboard heater.`,
    how: "Place baseboard heaters under windows on exterior walls. Keep the circuit's continuous load under 80% of the breaker (16 A on a 20 A circuit).",
    assume: "10 W per sq ft for 8 ft ceilings with average insulation (12.5 poor, 7.5 good); 250 W per ft of standard baseboard.",
    faq: [["How many watts of baseboard heat per square foot?", "About 10 W per sq ft."]],
  }),
  mk({
    slug: "ac-amps-calculator", title: "AC Amps Calculator (Tons to Amps & Breaker)",
    desc: "Estimate how many amps an air conditioner draws — running amps, minimum circuit ampacity and maximum breaker — from tons or BTU, voltage and efficiency.",
    inputs: [num("tons", "AC Size (tons, or 0 to use BTU)", 3, 25, 0.5, 0), num("btu", "Or BTU/hr", 36000, 300000, 1000, 5000), dd("voltage", "Voltage", ["240 V", "208 V", "120 V (window / portable)"]), num("eer", "EER", 11, 20, 0.5, 5)],
    results: [["runningAmps", "Running Amps (approx.)", "n"], ["watts", "Power (W)", "n"], ["minCircuitAmps", "Minimum Circuit Ampacity (est.)", "n"], ["maxBreakerAmps", "Max Breaker (est.)", "n"]],
    fn: E.acAmps, ex: { tons: 3, btu: 36000, voltage: 0, eer: 11 },
    exText: (o) => `Example: a 3-ton AC at 240 V with an EER of 11 draws about ${o.runningAmps} A — MCA about ${o.minCircuitAmps} A, breaker up to ${o.maxBreakerAmps} A.`,
    how: "The condenser's data plate lists the exact MCA (minimum circuit ampacity) and MOCP (maximum breaker) — always use those for wiring. Starting current is several times higher for a moment.",
    assume: "Watts = BTU ÷ EER; running amps = watts ÷ volts; MCA ≈ 1.25 × running amps; max breaker ≈ 2.25 × running amps rounded down to a standard size.",
    faq: [["How many amps does a 5 ton AC draw?", "About 25–28 A running at 240 V."]],
  }),
  mk({
    slug: "duct-size-calculator", title: "Duct Size Calculator (CFM, Round & Rectangular)",
    desc: "Size HVAC ducts from airflow — round duct diameter at your friction rate, nominal size, air velocity and the equivalent rectangular duct — from CFM or AC tons.",
    meta: "Duct Size Calculator — CFM to Round & Rectangular Duct",
    inputs: [num("cfm", "Airflow (0 = use tons)", 400, 20000, 10, 0, "cfm"), num("tons", "Or AC Tons (400 cfm per ton)", 3, 25, 0.5, 0), num("friction", "Friction Rate", 0.08, 0.3, 0.01, 0.02, "in. w.c./100 ft"), num("rectHeight", "Rectangular Duct Height", 8, 30, 1, 4, "in")],
    results: [["roundDiameterIn", "Round Duct Diameter (in)", "n"], ["nominalRoundIn", "Nominal Round Size (in)", "n"], ["velocityFpm", "Velocity (fpm)", "n"], ["rectWidthIn", "Equivalent Rectangular Width (in)", "n"], ["cfm", "Airflow (cfm)", "n"]],
    fn: E.ductSize, ex: { cfm: 400, tons: 3, friction: 0.08, rectHeight: 8 },
    exText: (o) => `Example: 400 cfm at 0.08 in. w.c. per 100 ft needs a ${o.roundDiameterIn} in round duct — use ${o.nominalRoundIn} in — or about ${o.rectWidthIn} × 8 in rectangular, at ${o.velocityFpm} fpm.`,
    how: "Most residential systems are designed at 0.06–0.10 in. w.c. per 100 ft (Manual D sets the actual rate from fan pressure and duct length). Keep supply branches under about 700 fpm and mains under 900 fpm to stay quiet.",
    assume: "Equal-friction fit Δp = 0.109136 Q^1.9 ÷ D^5.02 for smooth metal duct; flex duct has more friction — go up a size. Rectangular equivalence by the Huebscher formula.",
    faq: [["What size duct for 400 CFM?", "About a 10 in round duct at 0.08 friction rate."]],
  }),
  mk({
    slug: "return-air-duct-calculator", title: "Return Air Duct & Grille Size Calculator",
    desc: "Size the return air duct and filter grille for an HVAC system — return duct diameter, free area needed at 300 fpm and a standard grille size — from CFM or tons.",
    inputs: [num("cfm", "Airflow (0 = use tons)", 0, 10000, 10, 0, "cfm"), num("tons", "Or System Tons", 3, 10, 0.5, 0.5)],
    results: [["returnDuctIn", "Return Duct (in, round)", "n"], ["freeAreaSqIn", "Grille Free Area Needed (sq in)", "n"], ["grilleWidthIn", "Grille Width (in)", "n"], ["grilleHeightIn", "Grille Height (in)", "n"], ["cfm", "Airflow (cfm)", "n"]],
    fn: E.returnAirDuct, ex: { cfm: 0, tons: 3 },
    exText: (o) => `Example: a 3-ton system (${n2(o.cfm)} cfm) needs about a ${o.returnDuctIn} in return duct and a ${o.grilleWidthIn} × ${o.grilleHeightIn} in filter grille.`,
    how: "Undersized returns are one of the most common HVAC problems — they cause noise, high static pressure and poor airflow. Split the return across several grilles if one is too big for the wall.",
    assume: "Return duct at 0.05 in. w.c. per 100 ft; free area for a 300 fpm face velocity; grille chosen at about 200 sq in of gross grille area per ton.",
    faq: [["What size return grille for a 3 ton system?", "About 20 × 30 in, or two 20 × 20 in grilles."]],
  }),
  mk({
    slug: "exhaust-fan-duct-calculator", title: "Exhaust Fan Duct Size Calculator",
    desc: "Find the right duct size for a bathroom or exhaust fan from its CFM and duct run length — and the air velocity in 4 in and 6 in duct.",
    inputs: [num("cfm", "Fan Rating", 80, 1000, 5, 30, "cfm"), num("runFeet", "Duct Run Length", 15, 100, 1, 1, "ft")],
    results: [["ductSize", "Recommended Duct", "l", E.EXHAUST_DUCTS], ["velocityFpm4in", "Velocity in 4 in Duct (fpm)", "n"], ["velocityFpm6in", "Velocity in 6 in Duct (fpm)", "n"]],
    fn: E.exhaustFanDuct, ex: { cfm: 80, runFeet: 15 },
    exText: (o) => `Example: an 80 cfm bath fan with a 15 ft run works on a ${E.EXHAUST_DUCTS[o.ductSize].split(" (")[0]}.`,
    how: "Use smooth metal duct where you can, keep runs short with few elbows, and vent outdoors through a damper — never into the attic.",
    assume: "Rule-of-thumb sizing from HVI guidance; long runs and elbows cut real airflow a lot.",
    faq: [["What size duct for a bathroom exhaust fan?", "4 in for most fans up to about 110 cfm on short runs; 6 in for bigger fans or long runs."]],
  }),
  mk({
    slug: "exhaust-fan-cfm-calculator", title: "Bathroom Exhaust Fan CFM Calculator",
    desc: "Find the bathroom fan size you need — CFM by floor area (up to 100 sq ft) or by fixtures for larger bathrooms — plus an 8-air-changes check.",
    inputs: [num("length", "Bathroom Length", 8, 50, 0.5, 3, "ft"), num("width", "Bathroom Width", 10, 50, 0.5, 3, "ft"), num("ceiling", "Ceiling Height", 8, 20, 0.5, 6, "ft"), num("toilets", "Toilets", 1, 4, 1), num("showers", "Showers", 1, 4, 1), num("tubs", "Bathtubs", 0, 4, 1), num("jetted", "Jetted Tubs", 0, 2, 1)],
    results: [["recommendedCfm", "Recommended Fan (cfm)", "n"], ["byAreaCfm", "By Floor Area (cfm)", "n"], ["byFixturesCfm", "By Fixtures (cfm)", "n"], ["byAchCfm", "8 Air Changes / hr (cfm)", "n"]],
    fn: E.exhaustFanCfm, ex: { length: 8, width: 10, ceiling: 8, toilets: 1, showers: 1, tubs: 0, jetted: 0 },
    exText: (o) => `Example: an 8 × 10 ft bathroom with 8 ft ceilings needs about a ${o.recommendedCfm} cfm fan.`,
    how: "For bathrooms up to 100 sq ft, use 1 cfm per sq ft (more for tall ceilings). Larger bathrooms add 50 cfm per toilet, shower and tub and 100 for a jetted tub. Run the fan 20 minutes after showering.",
    assume: "Home Ventilating Institute (HVI) sizing; minimum 50 cfm.",
    faq: [["What size bathroom fan do I need?", "About 1 cfm per sq ft — an 80 cfm fan for an 80 sq ft bathroom."]],
  }),
  mk({
    slug: "air-changes-per-hour-calculator", title: "Air Changes per Hour (ACH) & CFM Calculator",
    desc: "Calculate air changes per hour from a fan's CFM and the room volume — or the CFM needed for a target ACH — plus CFM per square foot, for ventilation and air quality.",
    inputs: [...ROOMDIMS.map((x, i) => (i === 0 ? num("length", "Room Length", 20, 500, 0.5, 1, "ft") : i === 1 ? num("width", "Room Width", 15, 500, 0.5, 1, "ft") : x)), num("cfm", "Fan / Purifier Airflow", 100, 100000, 5, 0, "cfm"), num("targetAch", "Target ACH", 6, 60, 0.5, 0.5)],
    results: [["ach", "Air Changes per Hour", "n"], ["cfmForTarget", "CFM for Target ACH", "n"], ["cfmPerSqFt", "CFM per Sq Ft", "n"], ["roomCuFt", "Room Volume (cu ft)", "n"]],
    fn: E.airChanges, ex: { length: 20, width: 15, height: 8, cfm: 100, targetAch: 6 },
    exText: (o) => `Example: 100 cfm in a 20 × 15 ft room with 8 ft ceilings gives ${o.ach} air changes per hour; 6 ACH would take ${o.cfmForTarget} cfm.`,
    how: "ACH = cfm × 60 ÷ room volume. Typical targets: homes 0.35 ACH of fresh air, bedrooms with purifiers 4–6 ACH, workshops 6–10, kitchens 15+.",
    assume: "Assumes the airflow mixes through the whole room.",
    faq: [["How many CFM for 6 air changes per hour?", "Room volume × 6 ÷ 60 — 240 cfm for a 2,400 cu ft room."]],
  }),
  mk({
    slug: "erv-sizing-calculator", title: "ERV / HRV Sizing Calculator (ASHRAE 62.2)",
    desc: "Size an ERV or HRV for whole-house ventilation — continuous CFM by the ASHRAE 62.2 formula, a boost setting and the equivalent air changes per hour.",
    inputs: [num("area", "Conditioned Floor Area", 2000, 20000, 10, 0, "sq ft"), num("bedrooms", "Bedrooms", 3, 10, 1, 0), num("ceiling", "Average Ceiling Height", 8, 20, 0.5, 7, "ft")],
    results: [["continuousCfm", "Continuous Ventilation (cfm)", "n"], ["boostCfm", "Boost Setting (cfm)", "n"], ["achEquivalent", "Equivalent ACH", "n"]],
    fn: E.ervSizing, ex: { area: 2000, bedrooms: 3, ceiling: 8 },
    exText: (o) => `Example: a 2,000 sq ft, three-bedroom home needs about ${o.continuousCfm} cfm of continuous fresh air (ASHRAE 62.2).`,
    how: "ERVs (energy recovery) also swap moisture — good for humid summers or very dry winters; HRVs (heat recovery) suit cold, dry climates. Pick a unit whose rated airflow at your duct pressure covers this number.",
    assume: "ASHRAE 62.2: cfm = 0.03 × floor area + 7.5 × (bedrooms + 1); boost ≈ 1.5×.",
    faq: [["What size ERV do I need?", "About 90–100 cfm continuous for a 2,000 sq ft three-bedroom home."]],
  }),
  mk({
    slug: "whole-house-fan-calculator", title: "Whole House Fan Size Calculator",
    desc: "Size a whole house fan — CFM for 15–20 air changes per hour or 2–3 CFM per square foot — and the attic vent area it needs.",
    inputs: [num("area", "Living Area", 2000, 20000, 10, 0, "sq ft"), num("ceiling", "Average Ceiling Height", 8, 20, 0.5, 7, "ft"), num("airChanges", "Air Changes per Hour", 20, 40, 1, 5)],
    results: [["cfm", "Fan Size (cfm)", "n"], ["cfmLow", "2 cfm per Sq Ft", "n"], ["cfmHigh", "3 cfm per Sq Ft", "n"], ["atticNfaSqFt", "Attic Vent Area Needed (sq ft NFA)", "n"]],
    fn: E.wholeHouseFan, ex: { area: 2000, ceiling: 8, airChanges: 20 },
    exText: (o) => `Example: a 2,000 sq ft home needs about a ${n2(o.cfm)} cfm whole house fan and ${o.atticNfaSqFt} sq ft of attic venting.`,
    how: "Whole house fans pull cool evening air in through open windows and push hot air out through the attic. The attic must have enough vent area or the fan will push air back into the house.",
    assume: "Attic net free area ≈ 1 sq ft per 750 cfm.",
    faq: [["What size whole house fan for 2,000 sq ft?", "About 4,000–6,000 cfm."]],
  }),
  mk({
    slug: "attic-fan-calculator", title: "Attic Fan Size Calculator (CFM & Intake Vents)",
    desc: "Size a powered attic ventilator — CFM from attic area (more for dark roofs) — and the intake vent area it needs to work without depressurizing the house.",
    inputs: [num("atticArea", "Attic Floor Area", 1500, 20000, 10, 0, "sq ft"), dd("darkRoof", "Dark Roof?", ["No", "Yes"])],
    results: [["cfm", "Attic Fan (cfm)", "n"], ["intakeSqIn", "Intake Vent Area (sq in)", "n"], ["intakeSqFt", "Intake Vent Area (sq ft)", "n"]],
    fn: E.atticFan, ex: { atticArea: 1500, darkRoof: 0 },
    exText: (o) => `Example: a 1,500 sq ft attic needs about a ${n2(o.cfm)} cfm attic fan with ${o.intakeSqIn} sq in of intake vents.`,
    how: "Without enough soffit intake, attic fans pull conditioned air out of the house through ceiling gaps — air-seal the ceiling first. Many building scientists prefer passive ridge and soffit vents.",
    assume: "≈ 0.7 cfm per sq ft of attic (+15% for dark roofs); 1 sq ft of intake per 300 cfm.",
    faq: [["What size attic fan do I need?", "About 0.7 cfm per sq ft of attic — roughly 1,000–1,200 cfm for 1,500 sq ft."]],
  }),
  mk({
    slug: "fan-law-calculator", title: "Fan Law Calculator (CFM, RPM, Pressure & Power)",
    desc: "Apply the fan affinity laws — new airflow, static pressure and horsepower when fan speed changes — and calculate fan horsepower from CFM and static pressure.",
    inputs: [num("cfm1", "Current Airflow", 2000, 1000000, 10, 0, "cfm"), num("rpm1", "Current Speed", 1000, 10000, 10, 1, "rpm"), num("rpm2", "New Speed", 1200, 10000, 10, 1, "rpm"), num("sp1", "Current Static Pressure", 0.5, 20, 0.05, 0, "in. w.c."), num("hp1", "Current Fan Power", 0.5, 500, 0.05, 0, "hp"), pct("efficiency", "Fan Efficiency", 60, 90, 1)],
    results: [["cfm2", "New Airflow (cfm)", "n"], ["staticPressure2", "New Static Pressure (in. w.c.)", "n"], ["hp2", "New Power (hp)", "n"], ["fanHp1", "Fan Power Needed at Current Point (hp)", "n"]],
    fn: E.fanLaw, ex: { cfm1: 2000, rpm1: 1000, rpm2: 1200, sp1: 0.5, hp1: 0.5, efficiency: 60 },
    exText: (o) => `Example: speeding a 2,000 cfm fan from 1,000 to 1,200 rpm gives ${n2(o.cfm2)} cfm, ${o.staticPressure2} in. w.c. and ${o.hp2} hp — power rises with the cube of speed.`,
    how: "Small speed increases need big motor increases, so check the motor rating before speeding up a fan. The laws hold for the same fan and system.",
    assume: "cfm ∝ rpm, SP ∝ rpm², hp ∝ rpm³; fan hp = cfm × SP ÷ (6,356 × efficiency).",
    faq: [["What are the fan laws?", "Airflow changes with speed, pressure with speed squared and power with speed cubed."]],
  }),
  mk({
    slug: "combustion-air-calculator", title: "Combustion Air Calculator (Furnace & Water Heater)",
    desc: "Check combustion air for gas appliances — the room volume needed for indoor air (50 cu ft per 1,000 BTU/hr) and the size of outdoor air openings by the NFPA 54 methods.",
    inputs: [num("btu", "Total Appliance Input", 140000, 2000000, 1000, 1000, "BTU/hr"), num("spaceVolume", "Volume of the Space and Connected Rooms", 3000, 1000000, 10, 0, "cu ft")],
    results: [["requiredVolumeCuFt", "Volume Needed for Indoor Air (cu ft)", "n"], ["indoorOk", "Enough Indoor Air (1 = yes)", "n"], ["eachOpeningVerticalSqIn", "Two Openings, Vertical Ducts / Direct (sq in each)", "n"], ["eachOpeningHorizontalSqIn", "Two Openings, Horizontal Ducts (sq in each)", "n"], ["singleOpeningSqIn", "Or One High Opening (sq in)", "n"]],
    fn: E.combustionAir, ex: { btu: 140000, spaceVolume: 3000 },
    exText: (o) => `Example: a 100,000 BTU furnace plus a 40,000 BTU water heater need ${n2(o.requiredVolumeCuFt)} cu ft of room for indoor combustion air; otherwise use two outdoor openings of ${o.eachOpeningVerticalSqIn} sq in each.`,
    how: "Closets and small utility rooms usually can't supply enough indoor air. Sealed-combustion (direct-vent) appliances bring in their own air and don't need these openings. Local code and the appliance manual govern.",
    assume: "NFPA 54 / IFGC 304 standard method: 50 cu ft per 1,000 BTU/hr; outdoor openings 1 sq in per 4,000 BTU/hr (vertical ducts or direct), 1 per 2,000 (horizontal ducts), single opening 1 per 3,000.",
    faq: [["How much combustion air does a furnace need?", "50 cu ft of room per 1,000 BTU/hr for indoor air, or outdoor air openings."]],
  }),
  mk({
    slug: "glycol-mix-calculator", title: "Glycol Mix Calculator (Freeze Protection)",
    desc: "Find the propylene or ethylene glycol concentration needed to protect a hydronic, snowmelt or geothermal system to a given temperature — and gallons of glycol and water.",
    inputs: [num("systemGallons", "System Volume", 30, 10000, 1, 1, "gal"), num("protectTemp", "Protect Down To", 0, 32, 1, -60, "°F"), dd("glycol", "Glycol", ["Propylene glycol (non-toxic)", "Ethylene glycol"])],
    results: [["glycolPercent", "Glycol Concentration (%)", "n"], ["glycolGallons", "Glycol (gal)", "n"], ["waterGallons", "Water (gal)", "n"]],
    fn: E.glycolMix, ex: { systemGallons: 30, protectTemp: 0, glycol: 0 },
    exText: (o) => `Example: protecting a 30 gallon system to 0 °F with propylene glycol takes about ${o.glycolPercent}% — ${o.glycolGallons} gal of glycol.`,
    how: "Use inhibited propylene glycol for anything connected to potable water. More glycol lowers heat transfer and raises pumping power, so don't overdo it; burst protection needs less than freeze protection.",
    assume: "Interpolated freeze points: propylene 20% ≈ 18 °F, 30% ≈ 8 °F, 40% ≈ −7 °F, 50% ≈ −28 °F; ethylene a few degrees lower. Check the product's chart.",
    faq: [["What percentage of glycol for 0 degrees?", "About 35% propylene glycol."]],
  }),
  mk({
    slug: "geothermal-loop-calculator", title: "Geothermal Loop Sizing Calculator",
    desc: "Estimate ground loop size for a geothermal heat pump — feet of pipe, number of vertical bores, horizontal trench length and land area — by tons, loop type and soil.",
    inputs: [num("tons", "Heat Pump Size", 3, 50, 0.5, 1, "tons"), dd("loop", "Loop Type", E.LOOP_TYPES), dd("soil", "Soil", ["Moist / saturated (best)", "Average", "Dry / sandy (worst)"], 1)],
    results: [["loopFeet", "Loop Length (ft of pipe / bore)", "n"], ["bores", "Vertical Bores (300 ft)", "n"], ["trenchFeet", "Trench Length (ft)", "n"], ["landSqFt", "Land Area for Trenches (sq ft)", "n"], ["gpmOpenLoop", "Well Water Needed (gpm, open loop)", "n"]],
    fn: E.geothermalLoop, ex: { tons: 3, loop: 1, soil: 1 },
    exText: (o) => `Example: a 3-ton system on a vertical loop needs about ${o.loopFeet} ft of bore — ${o.bores} bores of 300 ft.`,
    how: "Loop design depends on soil conductivity and the home's load — installers often run a test bore. Horizontal loops are cheaper but need much more land.",
    assume: "Rules of thumb: horizontal ≈ 500 ft of pipe per ton, vertical ≈ 175 ft of bore per ton, pond ≈ 300 ft per ton; open loop ≈ 1.5 gpm per ton; soil ±15–30%.",
    faq: [["How much loop does a geothermal system need?", "About 150–200 ft of vertical bore per ton."]],
  }),
  mk({
    slug: "ac-running-cost-calculator", title: "Air Conditioner Running Cost Calculator",
    desc: "Calculate how much it costs to run an air conditioner — per hour, day and month — from its BTU and EER (or watts), daily run time and electricity price.",
    inputs: [num("btu", "Cooling Capacity", 12000, 120000, 500, 1000, "BTU/hr"), num("eer", "EER", 10, 25, 0.5, 5), num("watts", "Or Measured Watts (0 = use BTU/EER)", 0, 20000, 10, 0, "W"), num("hoursPerDay", "Hours per Day", 8, 24, 0.5, 0), num("kwhPrice", "Electricity Price ($/kWh)", 0.17, 1, 0.01, 0)],
    results: [["costPerMonth", "Cost per Month", "c"], ["costPerDay", "Cost per Day", "c"], ["costPerHour", "Cost per Hour", "c"], ["kwhPerDay", "kWh per Day", "n"], ["watts", "Power (W)", "n"]],
    fn: E.acRunningCost, ex: { btu: 12000, eer: 10, watts: 0, hoursPerDay: 8, kwhPrice: 0.17 },
    exText: (o) => `Example: a 12,000 BTU unit with an EER of 10 running 8 hours a day costs about ${money(o.costPerMonth)} a month at $0.17/kWh.`,
    how: "EER is on the unit's yellow EnergyGuide label (CEER for window units). Real compressors cycle, so actual hours at full power are usually fewer than hours switched on.",
    assume: "Watts = BTU ÷ EER; cost = kWh × price.",
    faq: [["How much does it cost to run a window AC?", "Often $20–60 a month depending on size, hours and electricity price."]],
  }),
  mk({
    slug: "heat-pump-running-cost-calculator", title: "Heat Pump Running Cost Calculator (vs Gas Boiler)",
    desc: "Compare the yearly running cost of a heat pump with a gas boiler — from your annual heat demand, the heat pump's SCOP and electricity and gas prices per kWh.",
    inputs: [num("heatDemandKwh", "Annual Heat Demand", 12000, 100000, 100, 0, "kWh"), num("scop", "Heat Pump SCOP", 3, 5, 0.1, 1.5), num("elecPrice", "Electricity Price per kWh", 0.25, 1, 0.005, 0), num("gasPrice", "Gas Price per kWh", 0.07, 0.5, 0.005, 0), pct("boilerEfficiency", "Gas Boiler Efficiency", 90, 100, 1)],
    results: [["heatPumpCost", "Heat Pump Cost per Year", "n"], ["gasBoilerCost", "Gas Boiler Cost per Year", "n"], ["difference", "Heat Pump Saves (− costs more)", "n"], ["heatPumpKwh", "Heat Pump Electricity (kWh)", "n"]],
    fn: E.heatPumpRunningCost, ex: { heatDemandKwh: 12000, scop: 3, elecPrice: 0.25, gasPrice: 0.07, boilerEfficiency: 90 },
    exText: (o) => `Example: 12,000 kWh of heat at a SCOP of 3 costs about ${n2(o.heatPumpCost)} a year with electricity at 0.25 per kWh, versus ${n2(o.gasBoilerCost)} with gas at 0.07 — at these prices the boiler is slightly cheaper.`,
    how: "Find annual heat demand on your EPC or from past gas use (gas kWh × boiler efficiency). Prices are in your own currency. Heat pumps do best with low flow temperatures and a smart or time-of-use tariff.",
    assume: "Heat pump electricity = heat ÷ SCOP; gas = heat ÷ boiler efficiency. Ignores standing charges.",
    faq: [["Is a heat pump cheaper to run than a gas boiler?", "It depends on the price ratio: with a SCOP of 3, a heat pump wins when electricity costs less than about 3× the gas price per kWh."]],
  }),
  mk({
    slug: "home-heating-cost-calculator", title: "Home Heating Cost Calculator (Gas, Propane, Oil, Electric & Wood)",
    desc: "Compare the yearly cost of heating your home with natural gas, propane, heating oil, electric resistance, a heat pump or wood — from home size, climate and fuel prices.",
    inputs: [num("area", "Heated Floor Area", 2000, 20000, 10, 0, "sq ft"), dd("climate", "Climate", ["Mild", "Moderate", "Cold", "Very cold"], 1), usd("gasPrice", "Natural Gas per Therm", 1.4, 10, 0.01), usd("propanePrice", "Propane per Gallon", 2.8, 10, 0.01), usd("oilPrice", "Heating Oil per Gallon", 3.8, 10, 0.01), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005), num("cop", "Heat Pump COP (seasonal)", 2.8, 5, 0.1, 1), usd("cordPrice", "Firewood per Cord", 300, 1000, 5)],
    results: [["gasCost", "Natural Gas (95%)", "c"], ["propaneCost", "Propane (90%)", "c"], ["oilCost", "Heating Oil (85%)", "c"], ["electricCost", "Electric Resistance", "c"], ["heatPumpCost", "Heat Pump", "c"], ["woodCost", "Wood Stove (70%)", "c"], ["heatNeedMmbtu", "Heat Needed (million BTU/yr)", "n"]],
    fn: E.homeHeatingCost, ex: { area: 2000, climate: 1, gasPrice: 1.4, propanePrice: 2.8, oilPrice: 3.8, kwhPrice: 0.17, cop: 2.8, cordPrice: 300 },
    exText: (o) => `Example: heating a 2,000 sq ft home in a moderate climate costs about ${money(o.gasCost)} a year with gas, ${money(o.heatPumpCost)} with a heat pump and ${money(o.propaneCost)} with propane.`,
    how: "Enter your local prices from recent bills. The heat needed is an estimate — your past fuel use is the best guide for your own home.",
    assume: "Heat need 15–45 million BTU per 1,000 sq ft per year by climate. Energy: gas 100,000 BTU/therm, propane 91,500 BTU/gal, oil 138,500 BTU/gal, 3,412 BTU/kWh, seasoned hardwood ≈ 20 million BTU per cord.",
    faq: [["What is the cheapest way to heat a home?", "Usually natural gas or a heat pump, depending on local gas and electricity prices."]],
  }),
  mk({
    slug: "gas-fireplace-cost-calculator", title: "Gas Fireplace Running Cost Calculator",
    desc: "Calculate how much it costs to run a gas fireplace or log set — per hour and per month — on natural gas or propane, from its BTU rating and your usage.",
    inputs: [num("btu", "Fireplace Input", 30000, 100000, 500, 5000, "BTU/hr"), dd("fuel", "Fuel", ["Natural gas ($ per therm)", "Propane ($ per gallon)"]), usd("price", "Fuel Price", 1.4, 10, 0.01), num("hoursPerDay", "Hours per Day", 4, 24, 0.5, 0), num("days", "Days per Month", 30, 31, 1, 0)],
    results: [["costPerHour", "Cost per Hour", "c"], ["costPerMonth", "Cost per Month", "c"], ["unitsPerHour", "Therms or Gallons per Hour", "n"]],
    fn: E.gasFireplaceCost, ex: { btu: 30000, fuel: 0, price: 1.4, hoursPerDay: 4, days: 30 },
    exText: (o) => `Example: a 30,000 BTU gas fireplace costs about $${o.costPerHour.toFixed(2)} per hour — ${money(o.costPerMonth)} a month at 4 hours a day on natural gas.`,
    how: "The BTU rating is on the rating plate or manual. Running on low uses less. A standing pilot light alone uses roughly 600–1,000 BTU/hr all year.",
    assume: "Natural gas 100,000 BTU per therm; propane 91,500 BTU per gallon.",
    faq: [["How much does it cost to run a gas fireplace per hour?", "About $0.30–0.60 on natural gas and $0.70–1.50 on propane."]],
  }),
  mk({
    slug: "seer-savings-calculator", title: "SEER Savings Calculator (SEER vs SEER2)",
    desc: "Compare cooling costs between an old and a new air conditioner or heat pump by SEER — yearly savings, payback on the extra cost — and the SEER2 equivalent.",
    inputs: [num("tons", "System Size", 3, 10, 0.5, 1, "tons"), num("hours", "Cooling Hours per Year", 1500, 5000, 50, 100), num("oldSeer", "Current SEER", 10, 25, 0.5, 6), num("newSeer", "New SEER", 16, 30, 0.5, 8), usd("kwhPrice", "Electricity per kWh", 0.17, 1, 0.005), usd("extraCost", "Extra Cost of the Efficient Unit", 2000, 50000, 50)],
    results: [["yearlySavings", "Yearly Savings", "c"], ["oldCost", "Current Cooling Cost / yr", "c"], ["newCost", "New Cooling Cost / yr", "c"], ["paybackYears", "Payback (years)", "n"], ["newSeer2", "New Unit in SEER2 (approx.)", "n"]],
    fn: E.seerSavings, ex: { tons: 3, hours: 1500, oldSeer: 10, newSeer: 16, kwhPrice: 0.17, extraCost: 2000 },
    exText: (o) => `Example: replacing a 3-ton, 10 SEER unit with a 16 SEER unit saves about ${money(o.yearlySavings)} a year at 1,500 hours — a ${o.paybackYears}-year payback on $2,000 extra.`,
    how: "Cooling hours vary a lot: about 1,000 in the North, 2,000–3,000 in the Deep South and Southwest. Since 2023, new equipment is rated in SEER2, which reads about 5% lower than SEER.",
    assume: "kWh = BTU/hr × hours ÷ (SEER × 1,000); SEER2 ≈ SEER × 0.95.",
    faq: [["Is 16 SEER worth it over 14 SEER?", "In hot climates with long cooling seasons, often yes; in mild climates the payback can be long."]],
  }),
  mk({
    slug: "hvac-replacement-cost-calculator", title: "HVAC Replacement Cost Calculator (AC, Furnace & Heat Pump)",
    desc: "Estimate the cost to replace your HVAC system — central AC, gas furnace, AC plus furnace, heat pump or a full system with new ductwork — by size and efficiency tier.",
    meta: "HVAC Replacement Cost Calculator — New AC, Furnace or Heat Pump",
    inputs: [dd("system", "System", E.HVAC_SYSTEMS, 2), num("tons", "System Size", 3, 6, 0.5, 1, "tons"), dd("tier", "Efficiency Tier", ["Standard (14–15 SEER2, 80–95% AFUE)", "Mid (16–17 SEER2)", "High (18+ SEER2, variable speed)"]), usd("rebates", "Rebates / Incentives", 0, 20000, 50)],
    results: COSTRES,
    fn: E.hvacReplacementCost, ex: { system: 2, tons: 3, tier: 0, rebates: 0 },
    exText: (o) => `Example: replacing a 3-ton AC and gas furnace with standard-efficiency equipment costs about ${money(o.totalCost)} (${money(o.costLow)}–${money(o.costHigh)}).`,
    how: "Get a load calculation before replacing — many homes are oversized. Quotes vary by brand, refrigerant line replacement, electrical work and whether ducts need changes. The federal 25C tax credit ended for systems installed after 2025; check utility and state rebates.",
    assume: `Typical installed prices: AC $2,200 per ton, furnace $4,500, heat pump $2,800 per ton, new ductwork ≈ $5,000; mid tier +15%, high +35%. ${COST_NOTE}`,
    faq: [["How much does it cost to replace an AC and furnace?", "About $10,000–15,000 for a standard 3-ton system."]],
  }),
  mk({
    slug: "heat-pump-cost-calculator", title: "Heat Pump Cost Calculator (Installed)",
    desc: "Estimate the installed cost of a heat pump — ducted air-source, ductless multi-zone mini-split, cold-climate or dual-fuel — with ductwork, electrical upgrades and rebates.",
    inputs: [dd("type", "Heat Pump Type", E.HEAT_PUMP_TYPES), num("tons", "Size", 3, 6, 0.5, 1, "tons"), dd("ductwork", "New Ductwork Needed?", ["No", "Yes"]), dd("electrical", "Electrical Panel / Circuit Upgrade?", ["No", "Yes"]), usd("rebates", "Rebates / Incentives", 0, 30000, 50)],
    results: [["netCost", "Net Cost", "c"], ["grossCost", "Cost Before Rebates", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"]],
    fn: E.heatPumpCost, ex: { type: 0, tons: 3, ductwork: 0, electrical: 0, rebates: 0 },
    exText: (o) => `Example: a 3-ton ducted air-source heat pump costs about ${money(o.grossCost)} installed before rebates.`,
    how: "Cold-climate heat pumps keep full output to around 5 °F and below. The federal 25C credit ended for systems installed after 31 Dec 2025 — enter any utility or state rebate you qualify for.",
    assume: `Typical installed prices per ton: ducted $2,800, ductless multi-zone $3,500, cold-climate $3,600, dual-fuel $3,000; ductwork $5,000; electrical $2,000. ${COST_NOTE}`,
    faq: [["How much does a heat pump cost to install?", "About $7,000–15,000 for a typical home, more for cold-climate or multi-zone systems."]],
  }),
  mk({
    slug: "mini-split-cost-calculator", title: "Mini Split Cost Calculator (Single & Multi-Zone)",
    desc: "Estimate ductless mini-split costs — DIY kits, single-zone or multi-zone professional installs — by number of zones and BTU per zone, with electrical work.",
    inputs: [num("zones", "Indoor Units (zones)", 1, 8, 1, 1), num("btuPerZone", "BTU per Zone", 12000, 36000, 3000, 6000), dd("type", "Install", ["DIY kit (materials only)", "Professional, single-zone", "Professional, multi-zone"], 1), dd("electrical", "New Circuit Needed?", ["No", "Yes"], 1)],
    results: [["totalCost", "Estimated Cost", "c"], ["costLow", "Low Estimate", "c"], ["costHigh", "High Estimate", "c"], ["perZone", "Per Zone", "c"]],
    fn: E.miniSplitCost, ex: { zones: 1, btuPerZone: 12000, type: 1, electrical: 1 },
    exText: (o) => `Example: one 12,000 BTU mini split professionally installed with a new circuit costs about ${money(o.totalCost)}.`,
    how: "Each indoor head needs a line set to the outdoor unit; long runs and wall chases add cost. DIY pre-charged kits avoid refrigerant work but void some warranties if installed wrong.",
    assume: `Typical prices: DIY kit $1,500 per zone; pro single-zone $4,000 (+$3,000 per extra unit); multi-zone $1,500 + $3,500 per zone; new circuit $500. ${COST_NOTE}`,
    faq: [["How much does a mini split cost installed?", "About $3,000–5,000 for one zone and $8,000–15,000 for three or four."]],
  }),
  mk({
    slug: "ductwork-cost-calculator", title: "Ductwork Replacement Cost Calculator",
    desc: "Estimate ductwork costs — sealing and repair, partial or full replacement, or new ductwork in a house without ducts — by home size and access.",
    inputs: [num("area", "Home Size", 2000, 20000, 10, 0, "sq ft"), dd("scope", "Work", ["Repair & seal", "Partial replacement", "Full replacement", "New install (no existing ducts)"], 2), dd("access", "Hard to Reach (tight attic, finished basement)?", ["No", "Yes"])],
    results: COSTRES,
    fn: E.ductworkCost, ex: { area: 2000, scope: 2, access: 0 },
    exText: (o) => `Example: replacing all the ductwork in a 2,000 sq ft home costs about ${money(o.totalCost)}.`,
    how: "Leaky ducts in attics and crawl spaces can waste 20–30% of heating and cooling — sealing with mastic or aerosol sealant is often the best value.",
    assume: `Typical prices per sq ft of home: repair/seal $0.75, partial $2, full $3.50, new install $5; difficult access +20%. ${COST_NOTE}`,
    faq: [["How much does it cost to replace ductwork?", "About $5,000–9,000 for a typical 2,000 sq ft home."]],
  }),
  mk({
    slug: "duct-cleaning-cost-calculator", title: "Duct Cleaning Cost Calculator",
    desc: "Estimate air duct cleaning costs — by number of vents and systems — with dryer vent cleaning, sanitizing and coil cleaning.",
    inputs: [num("vents", "Supply & Return Vents", 12, 100, 1, 1), num("systems", "HVAC Systems", 1, 4, 1, 1), dd("dryer", "Dryer Vent Cleaning?", ["No", "Yes"]), dd("sanitize", "Sanitizer / Antimicrobial?", ["No", "Yes"]), dd("coil", "Evaporator Coil Cleaning?", ["No", "Yes"])],
    results: COSTRES,
    fn: E.ductCleaningCost, ex: { vents: 12, systems: 1, dryer: 1, sanitize: 0, coil: 0 },
    exText: (o) => `Example: cleaning 12 vents on one system plus the dryer vent costs about ${money(o.totalCost)}.`,
    how: "Duct cleaning helps after renovations, pest problems or visible mold; it isn't needed routinely. Beware very cheap \"whole-house\" offers that upsell later.",
    assume: `Typical prices: $100 base + $30 per vent; dryer vent $125; sanitizing $100; coil cleaning $200. ${COST_NOTE}`,
    faq: [["How much does duct cleaning cost?", "About $300–700 for a typical home."]],
  }),
  mk({
    slug: "boiler-cost-calculator", title: "Boiler Replacement Cost Calculator",
    desc: "Estimate the cost to replace a boiler — gas combi, system or regular, high-efficiency condensing, oil or electric — by size, with a system flush.",
    inputs: [dd("type", "Boiler Type", E.BOILER_TYPES, 2), num("kw", "Boiler Size", 30, 100, 1, 10, "kW"), dd("flush", "Power Flush / System Clean?", ["No", "Yes"], 1), usd("rebates", "Rebates / Incentives", 0, 10000, 50)],
    results: COSTRES,
    fn: E.boilerCost, ex: { type: 2, kw: 30, flush: 1, rebates: 0 },
    exText: (o) => `Example: replacing a boiler with a 30 kW high-efficiency condensing gas boiler and flushing the system costs about ${money(o.totalCost)}.`,
    how: "Condensing boilers need a condensate drain and work best at lower return temperatures. Moving the boiler or changing the type (regular to combi) adds pipework and cost.",
    assume: `Typical installed prices around 30 kW: gas combi $7,000, system/regular $8,000, condensing $9,500, oil $9,000, electric $5,500; flush $600. ${COST_NOTE}`,
    faq: [["How much does a new boiler cost?", "About $5,000–12,000 installed in the US."]],
  }),
  mk({
    slug: "geothermal-cost-calculator", title: "Geothermal Heat Pump Cost Calculator (and Payback)",
    desc: "Estimate geothermal heat pump installation cost by size and loop type — horizontal, vertical, pond or open loop — with incentives, yearly savings and payback.",
    inputs: [num("tons", "System Size", 3, 20, 0.5, 1, "tons"), dd("loop", "Loop Type", E.LOOP_TYPES, 1), usd("incentives", "Incentives / Rebates", 0, 50000, 100), usd("currentHvacCost", "Current Heating + Cooling Cost per Year", 2500, 20000, 50), pct("savingsPct", "Expected Savings", 40, 80, 1)],
    results: [["netCost", "Net Cost", "c"], ["grossCost", "Cost Before Incentives", "c"], ["yearlySavings", "Yearly Savings", "c"], ["paybackYears", "Payback (years)", "n"]],
    fn: E.geothermalCost, ex: { tons: 3, loop: 1, incentives: 0, currentHvacCost: 2500, savingsPct: 40 },
    exText: (o) => `Example: a 3-ton vertical-loop geothermal system costs about ${money(o.grossCost)}; saving 40% of a $2,500 yearly bill pays back in about ${o.paybackYears} years.`,
    how: "The ground loop is the big cost and lasts 50+ years; the heat pump itself lasts 20–25. The federal 25D credit ended for systems installed after 2025 — check state and utility programs.",
    assume: `Typical prices: equipment and install $3,500 per ton plus loop $2,500 (horizontal), $5,000 (vertical), $2,000 (pond) or $1,500 (open) per ton. ${COST_NOTE}`,
    faq: [["How much does geothermal cost?", "About $18,000–35,000 for a typical home with a vertical loop."]],
  }),
  mk({
    slug: "fireplace-size-calculator", title: "Fireplace Size Calculator (Opening, Hearth & Flue)",
    desc: "Find a well-proportioned fireplace opening for your room — width, height and depth — plus the hearth extension the code requires and the flue area needed.",
    inputs: [num("roomArea", "Room Area", 300, 3000, 1, 50, "sq ft")],
    results: [["openingWidthIn", "Opening Width (in)", "n"], ["openingHeightIn", "Opening Height (in)", "n"], ["depthIn", "Firebox Depth (in)", "n"], ["hearthFrontIn", "Hearth Extension in Front (in)", "n"], ["hearthSidesIn", "Hearth Extension Each Side (in)", "n"], ["flueAreaSqIn", "Flue Area Needed (sq in, round)", "n"]],
    fn: E.fireplaceSize, ex: { roomArea: 300 },
    exText: (o) => `Example: a 300 sq ft living room suits a fireplace about ${o.openingWidthIn} in wide and ${o.openingHeightIn} in high, with a ${o.hearthFrontIn} in hearth extension in front.`,
    how: "Proportions affect how well a masonry fireplace draws. Hearth extensions must be noncombustible: 16 in in front and 8 in at the sides, or 20 and 12 in when the opening is 6 sq ft or larger (IRC R1001.10).",
    assume: "Opening width ≈ 2 × √(room area); height ≈ ⅔ width (max 32 in); depth ≈ half the height (16 in minimum); round flue ≥ 1/10 of the opening.",
    faq: [["What size fireplace for my room?", "About 30–36 in wide for a 250–350 sq ft room."]],
  }),
  mk({
    slug: "chimney-flue-size-calculator", title: "Chimney Flue Size & Height Calculator",
    desc: "Calculate the minimum flue area for a fireplace (round or rectangular) and how tall a chimney must be above the roof under the 3-2-10 rule.",
    inputs: [num("openingWidth", "Fireplace Opening Width", 36, 100, 0.5, 12, "in"), num("openingHeight", "Fireplace Opening Height", 28, 60, 0.5, 12, "in"), num("pitch", "Roof Pitch (rise per 12)", 6, 24, 0.5, 0), num("distanceToRidge", "Horizontal Distance to the Ridge (if under 10 ft)", 10, 10, 0.5, 0, "ft")],
    results: [["flueAreaRoundSqIn", "Min Round Flue Area (sq in)", "n"], ["roundFlueDiameterIn", "Round Flue Diameter (in)", "n"], ["flueAreaRectSqIn", "Min Rectangular Flue Area (sq in)", "n"], ["heightAboveRoofFt", "Chimney Height Above Roof Penetration (ft)", "n"]],
    fn: E.chimneyFlue, ex: { openingWidth: 36, openingHeight: 28, pitch: 6, distanceToRidge: 10 },
    exText: (o) => `Example: a 36 × 28 in fireplace needs a round flue of at least ${o.flueAreaRoundSqIn} sq in (${o.roundFlueDiameterIn} in); on a 6/12 roof the chimney should rise about ${o.heightAboveRoofFt} ft above where it leaves the roof.`,
    how: "The 3-2-10 rule: at least 3 ft above the roof penetration and 2 ft higher than any roof or building within 10 ft horizontally. Wood stoves use the stove maker's flue size (usually the collar size, often 6 in).",
    assume: "IRC R1001.12: round flues ≥ 1/10 and rectangular ≥ 1/8 of the opening (simplified); height from the 3-2-10 rule using the roof pitch within 10 ft.",
    faq: [["How tall does a chimney need to be?", "3 ft above the roof and 2 ft above anything within 10 ft."]],
  }),
  mk({
    slug: "oil-tank-level-calculator", title: "Heating Oil Tank Level Calculator (Gallons from Depth)",
    desc: "Convert a dipstick reading into gallons for a 275 or 330 gallon oval heating oil tank, upright or lying flat — with percent full and how much it takes to fill.",
    inputs: [dd("tank", "Tank", E.TANK_TYPES), num("depth", "Oil Depth (dipstick)", 20, 44, 0.25, 0, "in")],
    results: [["gallons", "Oil in the Tank (gal)", "n"], ["percentFull", "Percent Full (%)", "n"], ["gallonsToFill", "Gallons to Fill (to 90%)", "n"], ["capacityGallons", "Actual Capacity (gal)", "n"]],
    fn: E.oilTankLevel, ex: { tank: 0, depth: 20 },
    exText: (o) => `Example: 20 in of oil in an upright 275 gallon tank is about ${o.gallons} gallons — ${o.percentFull}% full.`,
    how: "Put a clean stick straight down through the fill pipe to the bottom and read the wet mark. Order before the tank falls under a quarter to avoid drawing sludge.",
    assume: "Oval (obround) tanks 27 × 44 in, 60 in long (275) or 72 in (330). Fill only to about 90% to allow for expansion.",
    faq: [["How many gallons are in a 275 gallon tank at 20 inches?", "About 115–120 gallons when standing upright."]],
  }),
  mk({
    slug: "u-value-calculator", title: "U-Value Calculator (Walls, Roofs & Floors)",
    desc: "Calculate the U-value of a wall, roof or floor build-up — up to five layers of insulation (PIR such as Kingspan or Celotex, mineral wool such as Rockwool, EPS, XPS), masonry and boards — and the extra insulation to hit a target.",
    inputs: [dd("m1", "Layer 1", E.LAYER_MATS, 10), num("t1", "Layer 1 Thickness", 15, 500, 1, 0, "mm"), dd("m2", "Layer 2", E.LAYER_MATS, 5), num("t2", "Layer 2 Thickness", 102, 500, 1, 0, "mm"), dd("m3", "Layer 3", E.LAYER_MATS, 1), num("t3", "Layer 3 Thickness", 100, 500, 1, 0, "mm"), dd("m4", "Layer 4", E.LAYER_MATS, 7), num("t4", "Layer 4 Thickness", 100, 500, 1, 0, "mm"), dd("m5", "Layer 5", E.LAYER_MATS, 9), num("t5", "Layer 5 Thickness", 12.5, 500, 0.5, 0, "mm"), num("targetU", "Target U-Value", 0.18, 2, 0.01, 0, "W/m²K")],
    results: [["uValue", "U-Value (W/m²K)", "n"], ["rValueSi", "Total R (m²K/W)", "n"], ["rValueUs", "Total R (US, h·ft²·°F/BTU)", "n"], ["extraPirMm", "Extra PIR Needed for Target (mm)", "n"]],
    fn: E.uValue, ex: { m1: 10, t1: 15, m2: 5, t2: 102, m3: 1, t3: 100, m4: 7, t4: 100, m5: 9, t5: 12.5, targetU: 0.18 },
    exText: (o) => `Example: render, brick, 100 mm of PIR in the cavity, aerated block and plasterboard give a U-value of about ${o.uValue} W/m²K.`,
    how: "List the layers from outside to inside with their thicknesses. Building regulations in England (2022) call for about 0.18 W/m²K for new external walls; extensions and renovations have their own limits.",
    assume: "U = 1 ÷ (0.13 + Σ thickness ÷ λ + 0.04). Ignores thermal bridging from studs, ties and fixings — a BR 443 calculation adds corrections. Product λ values vary; use the data sheet.",
    faq: [["What U-value do walls need?", "About 0.18 W/m²K for new external walls in England (Part L 2022)."]],
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
