// One-time (but safe to re-run) batch setup script: creates 24 plant, piping and fluid-handling
// calculators (Business & Industrial Calculators > Manufacturing, Metals & Engineering Calculators).
// Formulas and tables live in src/lib/calc-engine-biz-fluids.ts; examples are computed from the engine.
// Merged keywords (no separate page): Pipe Loss → pipe-pressure-drop; Heat Tracing → pipe-heat-loss;
// Pressure Pipe → smys; Containment → secondary-containment; 4-20 MA → 4-20ma; ifm flow → pipe-flow.
//
// HOW TO RUN (after prisma/setup-business-industrial-category.ts --apply)
//   npx tsx prisma/create-biz-fluids-calculators.ts
// or
//   npm run db:create-biz-fluids-calculators

import * as E from "../src/lib/calc-engine-biz-fluids";

import { PrismaClient, Prisma } from "@prisma/client";
import { sciMovedCategoryId } from "./setup-science-category";

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

const CAT = "manufacturing-metals-engineering-calculators";
const NOTE = "Engineering estimates for planning — final designs must follow the applicable codes and standards and be checked by a qualified engineer, and manufacturer data overrides the typical values used here.";


const TOOLS: ToolDef[] = [
  mk({
    slug: "manhole-sizing-calculator", title: "Manhole Sizing Calculator",
    desc: "Size a precast manhole for the pipes entering and leaving it — required inside diameter from pipe sizes, the angle between them and minimum concrete legs — with the standard size and riser count.",
    inputs: [num("pipe1Od", "Pipe 1 Outside Diameter (in)", 26, 120, 0.5), num("pipe2Od", "Pipe 2 Outside Diameter (in)", 20, 120, 0.5), num("angle", "Angle Between Pipes (°, 180 = straight)", 90, 180, 1, 10), num("clearance", "Hole Clearance over OD (in, boot/gasket)", 4, 12, 0.5), num("minLeg", "Minimum Concrete Leg Between Holes (in)", 8, 24, 0.5), num("depth", "Manhole Depth (ft)", 10, 60, 0.5)],
    results: [["recommendedDiameterIn", "Recommended Manhole ID (in)", "n"], ["requiredDiameterIn", "Required ID (in)", "n"], ["largestHoleIn", "Largest Hole (in)", "n"], ["riserSections4Ft", "4 ft Riser Sections (approx.)", "n"], ["concreteLegIn", "Leg Used (in)", "n"]],
    fn: E.manhole, ex: { pipe1Od: 26, pipe2Od: 20, angle: 90, clearance: 4, minLeg: 8, depth: 10 },
    exText: (o) => `Example: a 24 in pipe (26 in OD) and an 18 in pipe meeting at 90° need about ${o.requiredDiameterIn} in of manhole diameter — a ${o.recommendedDiameterIn} in manhole.`,
    how: "Enter the outside diameter of the two largest pipes, the angle between them (measured at the manhole center) and your precaster's minimum leg between openings.",
    assume: "Arc between hole centers must be at least half of each hole plus the leg: ID ≥ 2((h1 + h2)/2 + leg) ÷ θ; also ID ≥ largest hole + 2 legs, minimum 48 in (ASTM C478 practice). Always confirm with the precaster's hole chart.",
    faq: [["What size manhole do I need for a 24 inch pipe?", "A 48 in manhole for straight-through flow; larger (60 in+) when pipes turn sharply or several pipes enter."]],
  }),
  mk({
    slug: "secondary-containment-calculator", title: "Secondary Containment Calculator",
    desc: "Size a secondary containment dike for oil and chemical tanks — required volume at 110% of the largest tank (or 100% plus rainfall), minimum wall height and a check of an existing berm.",
    meta: "Secondary Containment Calculator — SPCC Dike Volume & Height",
    inputs: [num("largestTankGal", "Largest Tank (gal)", 10000, 10000000, 10), dropdown("rule", "Sizing Rule", opts(["110% of largest tank", "100% of largest + rainfall (SPCC)"]), 0), num("rainfallIn", "Design Rainfall (in, e.g. 25-yr 24-hr storm)", 6, 30, 0.1), num("dikeLength", "Containment Length (ft)", 40, 10000, 0.5), num("dikeWidth", "Containment Width (ft)", 30, 10000, 0.5), num("otherTanks", "Other Tanks Inside the Dike", 1, 100), num("tankDiameter", "Their Diameter (ft)", 10, 200, 0.5), num("wallHeight", "Existing Wall Height (ft)", 2, 30, 0.1)],
    results: [["requiredCapacityGal", "Required Containment (gal)", "n"], ["minWallHeightFt", "Minimum Wall Height (ft)", "n"], ["minWallHeightIn", "Minimum Wall Height (in)", "n"], ["existingCapacityGal", "Capacity at Existing Height (gal)", "n"], ["adequate", "Existing Dike Adequate (1 = yes)", "n"], ["netAreaSqFt", "Net Containment Area (sq ft)", "n"]],
    fn: E.containment, ex: { largestTankGal: 10000, rule: 0, rainfallIn: 6, dikeLength: 40, dikeWidth: 30, otherTanks: 1, tankDiameter: 10, wallHeight: 2 },
    exText: (o) => `Example: a 10,000 gal largest tank needs ${fmt(o.requiredCapacityGal, 0)} gal of containment; inside a 40 × 30 ft dike with one other 10 ft tank the wall must be at least ${o.minWallHeightIn} in high.`,
    how: "Enter the largest tank, the containment footprint and any other tanks that displace volume. Use the rainfall rule for uncovered outdoor containment under SPCC.",
    assume: "Many fire codes require 110% of the largest tank; EPA SPCC (40 CFR 112) requires the largest container plus sufficient freeboard for precipitation. Other tanks below the wall height reduce capacity.",
    faq: [["What is the 110% rule for secondary containment?", "Containment must hold 110% of the largest tank's volume — a common fire-code and industry standard."]],
  }),
  mk({
    slug: "pipe-flow-calculator", title: "Pipe Flow Calculator",
    desc: "Calculate water flow and velocity in a pipe — gpm, L/s and m³/h from inside diameter and velocity (or vice versa) — with Reynolds number and Hazen–Williams head loss per 100 ft.",
    meta: "Pipe Flow Calculator — GPM, Velocity & Head Loss",
    inputs: [dropdown("mode", "Known Value", opts(["Flow (gpm)", "Velocity (ft/s)"]), 0), num("insideDiameter", "Pipe Inside Diameter (in)", 2.067, 120, 0.001), num("flowGpm", "Flow (gpm)", 100, 1000000, 0.1), num("velocity", "Velocity (ft/s)", 5, 50, 0.1), num("hazenC", "Hazen–Williams C (PVC 150, steel 120)", 130, 160, 1, 60)],
    results: [["flowGpm", "Flow (gpm)", "n"], ["velocityFps", "Velocity (ft/s)", "n"], ["flowLps", "Flow (L/s)", "n"], ["flowM3h", "Flow (m³/h)", "n"], ["reynoldsNumber", "Reynolds Number", "n"], ["turbulent", "Turbulent Flow (1 = yes)", "n"], ["headLossPer100Ft", "Head Loss per 100 ft (ft)", "n"], ["psiLossPer100Ft", "Pressure Loss per 100 ft (psi)", "n"]],
    fn: E.pipeFlow, ex: { mode: 0, insideDiameter: 2.067, flowGpm: 100, velocity: 5, hazenC: 130 },
    exText: (o) => `Example: 100 gpm through 2 in Schedule 40 pipe (2.067 in ID) moves at ${o.velocityFps} ft/s and loses about ${o.psiLossPer100Ft} psi per 100 ft.`,
    how: "Enter the pipe's inside diameter and either the flow or velocity. Typical water design velocities: 4–8 ft/s in pressure piping.",
    assume: "Q = V × A; Reynolds number with water at 60 °F; Hazen–Williams for water only (use the pressure drop calculator for other fluids).",
    faq: [["How do you calculate flow rate in a pipe?", "Flow (gpm) = velocity (ft/s) × inside area (ft²) × 448.8."]],
  }),
  mk({
    slug: "pipe-pressure-drop-calculator", title: "Pipe Pressure Drop & Friction Loss Calculator",
    desc: "Calculate pressure drop and friction loss in a pipe with Darcy–Weisbach — any fluid by specific gravity and viscosity, pipe material roughness, fittings and elevation change.",
    meta: "Friction Loss Calculator — Pipe Pressure Drop (Darcy)",
    inputs: [num("flowGpm", "Flow (gpm)", 100, 1000000, 0.1), num("insideDiameter", "Inside Diameter (in)", 2.067, 120, 0.001), num("length", "Pipe Length (ft)", 200, 1000000, 1), num("fittingsEquivalentLength", "Fittings Equivalent Length (ft)", 30, 100000, 1), dropdown("material", "Pipe Material", opts(E.ROUGHNESS.map(([n]) => n)), 2), num("specificGravity", "Specific Gravity", 1, 3, 0.01, 0.5), num("viscosityCst", "Kinematic Viscosity (cSt; water 1.13)", 1.13, 10000, 0.01, 0.1), num("elevationChange", "Elevation Rise (ft, negative = drop)", 0, 10000, 0.5, -10000)],
    results: [["pressureDropPsi", "Friction Pressure Drop (psi)", "n"], ["totalPsiWithElevation", "Total incl. Elevation (psi)", "n"], ["headLossFt", "Friction Head Loss (ft)", "n"], ["velocityFps", "Velocity (ft/s)", "n"], ["reynoldsNumber", "Reynolds Number", "n"], ["frictionFactor", "Darcy Friction Factor", "n"], ["psiPer100Ft", "psi per 100 ft", "n"]],
    fn: E.pressureDrop, ex: { flowGpm: 100, insideDiameter: 2.067, length: 200, fittingsEquivalentLength: 30, material: 2, specificGravity: 1, viscosityCst: 1.13, elevationChange: 0 },
    exText: (o) => `Example: 100 gpm of water through 230 equivalent ft of 2 in steel pipe loses about ${o.pressureDropPsi} psi (${o.headLossFt} ft of head) at ${o.velocityFps} ft/s.`,
    how: "Enter flow, inside diameter, straight length plus fitting equivalent lengths, the pipe material and fluid properties.",
    assume: "Darcy–Weisbach with the Swamee–Jain explicit friction factor (laminar 64/Re below Re 2,300). Roughness values are typical for new pipe; aged pipe can be much rougher.",
    faq: [["What is friction loss in a pipe?", "The pressure lost to wall friction as fluid flows — it rises with roughly the square of velocity."]],
  }),
  mk({
    slug: "link-seal-calculator", title: "Link-Seal & Pipe Penetration Seal Calculator",
    desc: "Size a modular link seal for a pipe through a wall sleeve or core-drilled hole — annular gap, links needed, recommended hole size and whether the gap is in the seal's range.",
    meta: "Link Seal Calculator — Annular Gap & Links Needed",
    inputs: [num("pipeOd", "Pipe Outside Diameter (in)", 6.625, 120, 0.001), num("holeId", "Sleeve / Core Hole ID (in)", 9, 150, 0.001), num("sealMin", "Seal Model Min Annular Gap (in, from chart)", 1.0, 6, 0.01), num("sealMax", "Seal Model Max Annular Gap (in)", 1.3, 6, 0.01), num("linkPitch", "Link Pitch / Width (in, from chart)", 1.6, 6, 0.01)],
    results: [["annularGapIn", "Annular Gap (in)", "n"], ["withinSealRange", "Gap Within Seal Range (1 = yes)", "n"], ["linksNeeded", "Links Needed", "n"], ["recommendedHoleIdIn", "Recommended Hole ID for This Seal (in)", "n"], ["circumferenceIn", "Seal Circumference (in)", "n"]],
    fn: E.linkSeal, ex: { pipeOd: 6.625, holeId: 9, sealMin: 1, sealMax: 1.3, linkPitch: 1.6 },
    exText: (o) => `Example: a 6 in pipe (6.625 in OD) in a 9 in hole leaves a ${o.annularGapIn} in annular gap; at a 1.6 in link pitch the seal needs ${o.linksNeeded} links.`,
    how: "Measure pipe OD and hole ID, then enter the sealing range and link pitch for the seal model from the manufacturer's sizing chart. Independent calculator — not affiliated with Link-Seal®.",
    assume: "Annular gap = (hole ID − pipe OD) ÷ 2; links = π × (OD + gap) ÷ link pitch, rounded up. Always use the manufacturer's chart to select the model.",
    faq: [["How do I measure for a link seal?", "Measure the pipe OD and the sleeve or core-hole ID; the difference split in two is the annular space the seal must fill."]],
  }),
  mk({
    slug: "air-compressor-cfm-calculator", title: "Air Compressor CFM Calculator",
    desc: "Size an air compressor from your air tools — average and peak CFM with duty cycles, recommended compressor CFM at pressure, horsepower and tank size.",
    inputs: [...E.AIR_TOOLS.map(([n, c, d], i) => num(`tool${i}`, `${n} (${c} CFM, ${Math.round(d * 100)}% duty) — qty`, [1, 0, 0, 1, 0, 1, 0, 0, 1, 0][i], 50)), num("otherCfm", "Other Continuous Demand (CFM)", 0, 10000, 0.5), num("pressure", "Required Pressure (psi)", 90, 200, 1, 40), pct("margin", "Margin for Leaks & Growth", 30, 100, 1)],
    results: [["recommendedCfm", "Recommended Compressor CFM", "n"], ["averageDemandCfm", "Average Demand (CFM)", "n"], ["peakDemandCfm", "Peak if All Run at Once (CFM)", "n"], ["estimatedHp", "Estimated Horsepower", "n"], ["tankGallons", "Suggested Tank (gal)", "n"]],
    fn: E.compressorCfm, ex: { tool0: 1, tool1: 0, tool2: 0, tool3: 1, tool4: 0, tool5: 1, tool6: 0, tool7: 0, tool8: 1, tool9: 0, otherCfm: 0, pressure: 90, margin: 30 },
    exText: (o) => `Example: an impact wrench, DA sander, framing nailer and blow gun average ${o.averageDemandCfm} CFM; with 30% margin you need about ${o.recommendedCfm} CFM at 90 psi (~${o.estimatedHp} hp).`,
    how: "Enter how many of each tool may run in the same period. Sanders and spray guns run continuously, so they drive sizing.",
    assume: "Tool CFM at 90 psi and duty cycles are typical manufacturer values. About 4 CFM per hp at 90–100 psi for reciprocating compressors.",
    faq: [["How much CFM do I need for air tools?", "Add each tool's CFM × how much of the time it runs, then add 25–30% for leaks and future tools."]],
  }),
  mk({
    slug: "gas-pipe-sizing-calculator", title: "Gas Pipe Sizing Calculator",
    desc: "Size natural gas or propane piping with the IFGC low-pressure formula — required CFH from appliance BTU load, longest run, pressure drop — and the smallest Schedule 40 pipe that works.",
    inputs: [dropdown("gas", "Gas", opts(E.GAS_TYPES.map(([n]) => n)), 0), num("loadBtu", "Total Connected Load (BTU/h)", 250000, 100000000, 1000), num("length", "Longest Run from Meter (ft)", 60, 2000, 1, 10), num("pressureDrop", "Allowable Pressure Drop (in w.c.)", 0.5, 3, 0.1, 0.1)],
    results: [["pipeSizeIn", "Minimum Schedule 40 Size (in)", "n"], ["requiredCfh", "Required Flow (CFH)", "n"], ["capacityOfSelectedCfh", "Capacity of That Size (CFH)", "n"], ["capacityHalfInchCfh", "1/2 in Capacity at This Length (CFH)", "n"], ["capacityOneInchCfh", "1 in Capacity at This Length (CFH)", "n"], ["noneFits", "Larger Than 12 in Needed (1 = yes)", "n"]],
    fn: E.gasPipe, ex: { gas: 0, loadBtu: 250000, length: 60, pressureDrop: 0.5 },
    exText: (o) => `Example: 250,000 BTU/h of natural gas appliances (${o.requiredCfh} CFH) with a 60 ft longest run at 0.5 in w.c. drop needs ${o.pipeSizeIn} in Schedule 40 steel pipe.`,
    how: "Add up the BTU/h input of every appliance on the system and measure the longest run from the meter or regulator. Size each branch for its own load using the same longest length (longest-length method).",
    assume: "IFGC equation 4-1 for gas pressures under 1.5 psi; results closely match IFGC Table 402.4(2). CSST and polyethylene need their own tables.",
    faq: [["What size gas line do I need?", "It depends on total BTU load and length — a 100,000 BTU furnace 50 ft from the meter typically needs 3/4 in."]],
  }),
  mk({
    slug: "pump-size-calculator", title: "Pump Size Calculator",
    desc: "Size a centrifugal pump — total dynamic head from static lift, friction and discharge pressure, then water and brake horsepower, the motor size, kW and annual energy cost.",
    meta: "Pump Calculator — TDH, Horsepower & Motor Size",
    inputs: [num("flowGpm", "Flow (gpm)", 200, 1000000, 0.5), num("staticHead", "Static Head (ft)", 40, 5000, 0.5), num("frictionHead", "Friction Head (ft)", 15, 5000, 0.5), num("dischargePsi", "Required Discharge Pressure (psi)", 20, 2000, 0.5), num("specificGravity", "Specific Gravity", 1, 3, 0.01, 0.5), pct("pumpEff", "Pump Efficiency", 70, 95, 0.5), pct("motorEff", "Motor Efficiency", 92, 98, 0.5), num("hoursPerYear", "Run Hours per Year", 4000, 8760, 10), cur("pricePerKwh", "Electricity per kWh", 0.12, 1, 0.005)],
    results: [["recommendedMotorHp", "Recommended Motor (hp)", "n"], ["totalDynamicHeadFt", "Total Dynamic Head (ft)", "n"], ["brakeHp", "Brake Horsepower", "n"], ["waterHp", "Water Horsepower", "n"], ["inputKw", "Electrical Input (kW)", "n"], ["annualEnergyCost", "Annual Energy Cost", "c"]],
    fn: E.pumpSize, ex: { flowGpm: 200, staticHead: 40, frictionHead: 15, dischargePsi: 20, specificGravity: 1, pumpEff: 70, motorEff: 92, hoursPerYear: 4000, pricePerKwh: 0.12 },
    exText: (o) => `Example: 200 gpm against ${o.totalDynamicHeadFt} ft of TDH needs ${o.brakeHp} bhp at 70% efficiency — a ${o.recommendedMotorHp} hp motor costing about ${usd(o.annualEnergyCost)} a year to run 4,000 h.`,
    how: "Enter flow, the vertical lift, friction losses (from the pressure drop calculator) and any pressure needed at the outlet.",
    assume: "TDH = static + friction + psi × 2.31 ÷ SG; whp = gpm × TDH × SG ÷ 3,960; bhp = whp ÷ pump efficiency; motor sized with a 10% service margin.",
    faq: [["How do I size a pump?", "Find the flow you need and the total dynamic head, then pick a pump whose curve passes through that point near its best-efficiency point."]],
  }),
  mk({
    slug: "hydraulic-cylinder-calculator", title: "Hydraulic Cylinder Calculator",
    desc: "Calculate hydraulic cylinder push and pull force, extend and retract speed and time, oil volume and hydraulic horsepower from bore, rod, pressure, flow and stroke.",
    meta: "Hydraulic Calculator — Cylinder Force, Speed & HP",
    inputs: [num("bore", "Bore Diameter (in)", 4, 40, 0.125), num("rod", "Rod Diameter (in)", 2, 30, 0.125), num("pressure", "System Pressure (psi)", 2500, 10000, 10), num("flowGpm", "Pump Flow (gpm)", 10, 1000, 0.1), num("stroke", "Stroke (in)", 24, 500, 0.25)],
    results: [["extendForceLb", "Extend (Push) Force (lb)", "n"], ["extendForceTons", "Extend Force (tons)", "n"], ["retractForceLb", "Retract (Pull) Force (lb)", "n"], ["extendSpeedInPerSec", "Extend Speed (in/s)", "n"], ["retractSpeedInPerSec", "Retract Speed (in/s)", "n"], ["extendTimeSec", "Extend Time (s)", "n"], ["retractTimeSec", "Retract Time (s)", "n"], ["oilVolumeGal", "Oil Volume, Full Stroke (gal)", "n"], ["hydraulicHp", "Hydraulic Horsepower", "n"]],
    fn: E.hydraulicCylinder, ex: { bore: 4, rod: 2, pressure: 2500, flowGpm: 10, stroke: 24 },
    exText: (o) => `Example: a 4 in bore cylinder at 2,500 psi pushes ${fmt(o.extendForceLb, 0)} lb (${o.extendForceTons} tons); with 10 gpm it extends 24 in in ${o.extendTimeSec} s and retracts in ${o.retractTimeSec} s.`,
    how: "Enter bore, rod, pressure, pump flow and stroke.",
    assume: "Force = pressure × area (rod area subtracted on retract); speed = flow × 231 ÷ 60 ÷ area; hp = gpm × psi ÷ 1,714. Friction and pressure losses are ignored.",
    faq: [["How do you calculate hydraulic cylinder force?", "Force (lb) = pressure (psi) × piston area (in²) — 3.1416 × bore² ÷ 4."]],
  }),
  mk({
    slug: "grease-trap-sizing-calculator", title: "Grease Trap Sizing Calculator",
    desc: "Size a grease interceptor for a restaurant — gravity interceptor gallons by meals, waste flow, retention and hours (UPC method) and a hydromechanical unit's gpm from sink volume (PDI method).",
    meta: "Grease Trap Calculator — Interceptor Size (UPC & PDI)",
    inputs: [num("mealsPerPeakHour", "Meals Served in Peak Hour", 100, 10000), dropdown("service", "Kitchen Type", opts(["With dishwasher (6 gal/meal)", "Without dishwasher (5 gal/meal)", "Single-service / paper (2 gal/meal)"]), 0), num("retentionHours", "Retention Time (h)", 2.5, 4, 0.1, 1), num("hoursOpen", "Hours Open per Day", 12, 24, 0.5, 1), num("sinkLength", "Sink Compartment Length (in)", 24, 72, 0.5), num("sinkWidth", "Sink Compartment Width (in)", 24, 72, 0.5), num("sinkDepth", "Sink Depth (in)", 14, 36, 0.5), num("compartments", "Compartments Draining Together", 3, 10, 1, 1), dropdown("drainMinutes", "Drain Time", [["1 minute", 1], ["2 minutes", 2]], 1)],
    results: [["gravityInterceptorGal", "Gravity Interceptor (gal)", "n"], ["hydromechanicalGpm", "Hydromechanical Flow (gpm)", "n"], ["recommendedHmiGpm", "Recommended HMI Rating (gpm)", "n"], ["sinkVolumeGal", "Sink Volume (gal)", "n"], ["storageFactor", "Storage Factor", "n"]],
    fn: E.greaseTrap, ex: { mealsPerPeakHour: 100, service: 0, retentionHours: 2.5, hoursOpen: 12, sinkLength: 24, sinkWidth: 24, sinkDepth: 14, compartments: 3, drainMinutes: 1 },
    exText: (o) => `Example: 100 meals in the peak hour with a dishwasher, open 12 hours, needs a ${fmt(o.gravityInterceptorGal, 0)} gal gravity interceptor; a three-compartment 24 × 24 × 14 in sink drains at ${o.hydromechanicalGpm} gpm, so a ${o.recommendedHmiGpm} gpm hydromechanical unit.`,
    how: "Use the gravity method for in-ground interceptors and the sink method for under-sink hydromechanical units. Local pretreatment rules take priority.",
    assume: "UPC: size = meals × waste flow × retention time × storage factor (8 h = 1, 12 h = 1.5, 16 h = 2, 24 h = 3). PDI G-101: flow = sink volume × 75% fill ÷ drain time (1 or 2 minutes).",
    faq: [["What size grease trap does a restaurant need?", "Small under-sink units are rated 10–50 gpm; full-service restaurants often need 750–1,500 gal in-ground interceptors."]],
  }),
  mk({
    slug: "orifice-flow-calculator", title: "Orifice Flow Calculator",
    desc: "Calculate liquid flow through an orifice plate or nozzle — gpm and m³/h from orifice and pipe diameter, pressure drop, specific gravity and discharge coefficient — with beta ratio.",
    inputs: [num("orificeDiameter", "Orifice Diameter (in)", 1, 60, 0.001), num("pipeDiameter", "Pipe Inside Diameter (in, for β)", 2.067, 120, 0.001), num("pressureDrop", "Differential Pressure (psi)", 10, 5000, 0.1), num("specificGravity", "Specific Gravity", 1, 3, 0.01, 0.3), num("cd", "Discharge Coefficient Cd", 0.61, 1, 0.01, 0.3)],
    results: [["flowGpm", "Flow (gpm)", "n"], ["flowM3h", "Flow (m³/h)", "n"], ["betaRatio", "Beta Ratio (d/D)", "n"], ["approachFactor", "Velocity-of-Approach Factor", "n"], ["orificeVelocityFps", "Velocity through Orifice (ft/s)", "n"]],
    fn: E.orifice, ex: { orificeDiameter: 1, pipeDiameter: 2.067, pressureDrop: 10, specificGravity: 1, cd: 0.61 },
    exText: (o) => `Example: a 1 in orifice in 2 in pipe (β ${o.betaRatio}) with a 10 psi drop passes about ${o.flowGpm} gpm of water.`,
    how: "Enter the bore and pipe inside diameter, measured differential pressure and the fluid's specific gravity. Use Cd ≈ 0.61 for sharp-edged plates and 0.95–0.99 for smooth nozzles.",
    assume: "Q = 29.84 Cd d² √(ΔP/SG) ÷ √(1 − β⁴) for incompressible liquids. Gas flow needs an expansion factor (ISO 5167).",
    faq: [["How do you calculate flow through an orifice?", "Flow is proportional to the orifice area and the square root of the pressure drop."]],
  }),
  mk({
    slug: "dust-collector-calculator", title: "Dust Collector Calculator (CFM & Duct Size)",
    desc: "Size a dust collection system — CFM from open branches at transport velocity, main duct diameter, filter area by air-to-cloth ratio and fan horsepower.",
    inputs: [num("branches0", "4 in Branches Open at Once", 1, 50), num("branches1", "5 in Branches Open", 0, 50), num("branches2", "6 in Branches Open", 1, 50), num("branches3", "8 in Branches Open", 0, 50), num("otherCfm", "Other Airflow (CFM)", 0, 100000, 10), num("velocity", "Transport Velocity (fpm; wood 4,000)", 4000, 6000, 50, 2000), num("airToCloth", "Air-to-Cloth Ratio (cfm per sq ft)", 6, 15, 0.5, 1), num("staticPressure", "System Static Pressure (in w.c.)", 8, 30, 0.5, 1), pct("fanEff", "Fan Efficiency", 60, 85, 1)],
    results: [["totalCfm", "Total Airflow (CFM)", "n"], ["mainDuctDiameterIn", "Main Duct Diameter (in)", "n"], ["standardMainDuctIn", "Standard Main Duct Size (in)", "n"], ["filterAreaSqFt", "Filter Area Needed (sq ft)", "n"], ["estimatedFanHp", "Estimated Fan Horsepower", "n"]],
    fn: E.dustCollector, ex: { branches0: 1, branches1: 0, branches2: 1, branches3: 0, otherCfm: 0, velocity: 4000, airToCloth: 6, staticPressure: 8, fanEff: 60 },
    exText: (o) => `Example: one 4 in and one 6 in branch open at 4,000 fpm pull ${o.totalCfm} CFM; the main needs to be about ${o.standardMainDuctIn} in, with ${o.filterAreaSqFt} sq ft of filter and roughly ${o.estimatedFanHp} hp.`,
    how: "Count only branches open at the same time (blast gates closed on the rest). Use 3,500–4,000 fpm for wood dust and 4,000–4,500 for metal grinding.",
    assume: "CFM = velocity × duct area per branch; main duct sized to keep transport velocity; fan hp = CFM × SP ÷ (6,356 × efficiency).",
    faq: [["How many CFM do I need for a dust collector?", "About 350 CFM for a 4 in port and 800 CFM for a 6 in port at 4,000 fpm."]],
  }),
  mk({
    slug: "steam-pipe-sizing-calculator", title: "Steam Pipe Sizing Calculator",
    desc: "Size saturated steam piping from steam load and pressure — specific volume, required inside diameter at your velocity limit, the Schedule 40 size and actual velocity.",
    inputs: [num("steamLbPerHour", "Steam Flow (lb/h)", 2000, 10000000, 10), dropdown("pressure", "Steam Pressure (saturated)", opts(E.STEAM_V.map(([n, sv]) => `${n} (${sv} ft³/lb)`)), 5), num("maxVelocity", "Maximum Velocity (fpm)", 6000, 15000, 100, 1000)],
    results: [["pipeSizeIn", "Schedule 40 Pipe Size (in)", "n"], ["requiredIdIn", "Required Inside Diameter (in)", "n"], ["actualVelocityFpm", "Actual Velocity (fpm)", "n"], ["steamVolumeCfm", "Steam Volume Flow (cfm)", "n"], ["specificVolume", "Specific Volume (ft³/lb)", "n"]],
    fn: E.steamPipe, ex: { steamLbPerHour: 2000, pressure: 5, maxVelocity: 6000 },
    exText: (o) => `Example: 2,000 lb/h of 100 psig steam (${o.steamVolumeCfm} cfm) at a 6,000 fpm limit needs ${o.pipeSizeIn} in Schedule 40 pipe, running at ${fmt(o.actualVelocityFpm, 0)} fpm.`,
    how: "Enter steam load and pressure. Use 4,000–6,000 fpm for saturated steam mains and 2,000–4,000 for low-pressure or noise-sensitive lines; check pressure drop on long runs.",
    assume: "Volume flow = lb/h × specific volume ÷ 60; ID from area = flow ÷ velocity. Specific volumes from saturated steam tables.",
    faq: [["What velocity should steam pipe be sized for?", "Typically 4,000–6,000 fpm (20–30 m/s) for saturated steam."]],
  }),
  mk({
    slug: "rotary-airlock-valve-sizing-calculator", title: "Rotary Airlock Valve Sizing Calculator",
    desc: "Size a rotary airlock (rotary valve) feeder — required displacement per revolution from throughput, bulk density, rotor speed and pocket fill, the valve size and operating RPM.",
    inputs: [dropdown("rateUnit", "Throughput Unit", opts(["lb per hour", "cu ft per hour"]), 0), num("rate", "Throughput", 20000, 10000000, 10), num("bulkDensity", "Bulk Density (lb/ft³)", 40, 200, 0.5, 1), num("maxRpm", "Maximum Rotor Speed (rpm)", 20, 40, 1, 5), pct("fillEfficiency", "Pocket Fill Efficiency", 75, 100, 1)],
    results: [["valveSizeIn", "Valve Size (in)", "n"], ["requiredDisplacement", "Required Displacement (ft³/rev)", "n"], ["selectedDisplacement", "Selected Valve Displacement (ft³/rev)", "n"], ["operatingRpm", "Operating Speed (rpm)", "n"], ["throughputCuFtPerHour", "Throughput (ft³/h)", "n"]],
    fn: E.rotaryAirlock, ex: { rateUnit: 0, rate: 20000, bulkDensity: 40, maxRpm: 20, fillEfficiency: 75 },
    exText: (o) => `Example: 20,000 lb/h of a 40 lb/ft³ powder needs ${o.requiredDisplacement} ft³ per revolution at 20 rpm and 75% fill — a ${o.valveSizeIn} in valve running at about ${o.operatingRpm} rpm.`,
    how: "Enter throughput and bulk density, a maximum rotor speed (lower for abrasive or fluffy materials) and expected pocket fill.",
    assume: "Displacements are typical per-revolution values by inlet size; check the manufacturer's data. Fill efficiency drops at higher speeds and with poor-flowing materials.",
    faq: [["How fast should a rotary airlock turn?", "Usually 15–25 rpm; higher speeds reduce pocket fill and increase wear."]],
  }),
  mk({
    slug: "pipe-slope-calculator", title: "Pipe Slope Calculator (Drain & Sewer)",
    desc: "Calculate drain or sewer pipe slope — inches per foot, percent and angle from drop and run (or the drop needed) — with code minimum check and Manning full-flow capacity.",
    meta: "Sewer Pipe Slope Calculator — Fall per Foot & Flow",
    inputs: [dropdown("mode", "Calculate", opts(["Slope from drop and run", "Drop from slope and run"]), 0), num("runFt", "Horizontal Run (ft)", 40, 10000, 0.5), num("dropIn", "Drop (in)", 10, 10000, 0.125), num("slopeInPerFt", "Slope (in per ft)", 0.25, 12, 0.0625), num("diameterIn", "Pipe Inside Diameter (in)", 4, 120, 0.25), num("manningN", "Manning's n (PVC 0.010, concrete 0.013)", 0.011, 0.03, 0.001, 0.008)],
    results: [["slopeInPerFt", "Slope (in per ft)", "n"], ["slopePercent", "Slope", "p"], ["totalDropIn", "Total Drop (in)", "n"], ["angleDegrees", "Angle (°)", "n"], ["fullFlowGpm", "Full-Flow Capacity (gpm)", "n"], ["fullFlowVelocityFps", "Full-Flow Velocity (ft/s)", "n"], ["meetsCodeMinimum", "Meets Plumbing Code Minimum (1 = yes)", "n"], ["codeMinimumInPerFt", "Code Minimum (in/ft)", "n"]],
    fn: E.pipeSlope, ex: { mode: 0, runFt: 40, dropIn: 10, slopeInPerFt: 0.25, diameterIn: 4, manningN: 0.011 },
    exText: (o) => `Example: a 4 in drain falling 10 in over 40 ft is ${o.slopeInPerFt} in/ft (${o.slopePercent}%), carries about ${fmt(o.fullFlowGpm, 0)} gpm flowing full at ${o.fullFlowVelocityFps} ft/s.`,
    how: "Enter the run and drop (or the slope you want), the pipe diameter and material roughness.",
    assume: "IPC minimum slopes: 2.5 in and smaller ¼ in/ft; 3–6 in ⅛ in/ft; 8 in and larger 1/16 in/ft. Sewers should keep ≥ 2 ft/s for self-cleansing.",
    faq: [["What is the minimum slope for a sewer pipe?", "¼ in per foot for 2½ in and smaller and ⅛ in per foot for 3–6 in pipe under the IPC/UPC."]],
  }),
  mk({
    slug: "chemical-dosing-calculator", title: "Chemical Dosing Calculator",
    desc: "Calculate chemical feed for water treatment — active pounds per day from flow and target dose (mg/L), solution gallons per day, pump rate in gph and mL/min, cost and drum life.",
    inputs: [dropdown("flowUnit", "Flow Unit", opts(["Gallons per minute", "Million gallons per day (MGD)"]), 0), num("flow", "Flow", 500, 1000000, 0.1), num("doseMgL", "Target Dose (mg/L = ppm)", 2, 10000, 0.01), pct("strength", "Chemical Strength (active %)", 12.5, 100, 0.1), num("specificGravity", "Solution Specific Gravity", 1.2, 2.5, 0.01, 0.5), cur("pricePerGal", "Price per Gallon", 2.5, 100, 0.01)],
    results: [["pumpRateGph", "Pump Rate (gal/h)", "n"], ["pumpRateMlMin", "Pump Rate (mL/min)", "n"], ["solutionGalPerDay", "Solution per Day (gal)", "n"], ["activeLbPerDay", "Active Chemical (lb/day)", "n"], ["activeKgPerDay", "Active Chemical (kg/day)", "n"], ["costPerDay", "Chemical Cost per Day", "c"], ["daysPerDrum", "Days per 55-gal Drum", "n"]],
    fn: E.chemDosing, ex: { flowUnit: 0, flow: 500, doseMgL: 2, strength: 12.5, specificGravity: 1.2, pricePerGal: 2.5 },
    exText: (o) => `Example: dosing 2 mg/L of chlorine into 500 gpm (0.72 MGD) takes ${o.activeLbPerDay} lb/day of chlorine — ${o.solutionGalPerDay} gal/day of 12.5% sodium hypochlorite, a pump rate of ${o.pumpRateGph} gph.`,
    how: "Enter flow, the dose you want and the product's strength and specific gravity from its SDS.",
    assume: "lb/day = MGD × mg/L × 8.34; solution gal/day = lb/day ÷ (8.34 × SG × strength). Hypochlorite loses strength over time — test and adjust.",
    faq: [["How do you calculate chemical dosage?", "Pounds per day = flow in MGD × dose in mg/L × 8.34."]],
  }),
  mk({
    slug: "pipe-heat-loss-calculator", title: "Pipe Heat Loss & Heat Tracing Calculator",
    desc: "Calculate heat loss from bare or insulated pipe — BTU/h per foot and total, heat-trace watts per foot with safety factor, and annual energy cost.",
    meta: "Pipe Heat Loss Calculator — Insulation & Heat Tracing",
    inputs: [dropdown("pipeSize", "Pipe Size (nominal)", opts(E.PIPE_OD.map(([n, d]) => `${n} (OD ${d} in)`)), 4), dropdown("insulation", "Insulation", opts(E.INSULATION_K.map(([n]) => n)), 1), num("thickness", "Insulation Thickness (in)", 1, 6, 0.5), num("pipeTemp", "Pipe / Maintain Temperature (°F)", 50, 1000, 1, -100), num("ambientTemp", "Minimum Ambient Temperature (°F)", -10, 120, 1, -60), yn("outdoorWind", "Outdoors with Wind?", 1), num("surfaceH", "Surface Coefficient (BTU/h·ft²·°F, 0 = auto)", 0, 10, 0.1), num("length", "Pipe Length (ft)", 100, 100000, 1), num("hoursPerYear", "Hours per Year at This Condition", 2000, 8760, 10), cur("pricePerKwh", "Energy Price per kWh", 0.12, 1, 0.005)],
    results: [["heatTraceWattsPerFt", "Heat Trace Needed (W/ft, +20%)", "n"], ["heatLossBtuPerHrFt", "Heat Loss (BTU/h per ft)", "n"], ["totalBtuPerHr", "Total Heat Loss (BTU/h)", "n"], ["totalTraceWatts", "Total Heat Trace (W)", "n"], ["annualEnergyCost", "Annual Energy Cost", "c"], ["annualMmbtu", "Annual Heat Loss (MMBtu)", "n"]],
    fn: E.pipeHeatLoss, ex: { pipeSize: 4, insulation: 1, thickness: 1, pipeTemp: 50, ambientTemp: -10, outdoorWind: 1, surfaceH: 0, length: 100, hoursPerYear: 2000, pricePerKwh: 0.12 },
    exText: (o) => `Example: keeping 2 in pipe with 1 in fiberglass at 50 °F when it's −10 °F outside loses ${o.heatLossBtuPerHrFt} BTU/h per ft — about ${o.heatTraceWattsPerFt} W/ft of heat trace with a 20% safety factor.`,
    how: "Choose the pipe size and insulation, the temperature to maintain and the lowest expected ambient. For freeze protection, maintain 40–50 °F.",
    assume: "Radial conduction through insulation plus surface convection (1.65 still air, 4 with wind). Bare pipe uses a combined coefficient of ~2.5 (still) or 4 (wind) BTU/h·ft²·°F.",
    faq: [["How many watts per foot of heat tape do I need?", "Usually 3–8 W/ft for freeze protection of small insulated pipes in cold climates."]],
  }),
  mk({
    slug: "slurry-calculator", title: "Slurry Calculator",
    desc: "Calculate slurry properties — specific gravity and density from percent solids by weight (or solids % from slurry SG), solids by volume and solids tons per hour from flow.",
    inputs: [dropdown("mode", "Known Value", opts(["Solids % by weight", "Slurry specific gravity"]), 0), num("solidsWeightPercent", "Solids by Weight (%)", 30, 99, 0.1), num("slurrySg", "Slurry Specific Gravity", 1.23, 3, 0.001, 1), num("solidsSg", "Solids Specific Gravity", 2.65, 8, 0.01, 0.5), num("liquidSg", "Liquid Specific Gravity", 1, 2, 0.01, 0.5), num("flowGpm", "Slurry Flow (gpm)", 500, 1000000, 1)],
    results: [["slurrySg", "Slurry Specific Gravity", "n"], ["solidsByWeightPercent", "Solids by Weight (%)", "n"], ["solidsByVolumePercent", "Solids by Volume (%)", "n"], ["slurryDensityLbFt3", "Slurry Density (lb/ft³)", "n"], ["slurryDensityKgM3", "Slurry Density (kg/m³)", "n"], ["solidsTonsPerHour", "Dry Solids (short tons/h)", "n"]],
    fn: E.slurry, ex: { mode: 0, solidsWeightPercent: 30, slurrySg: 1.23, solidsSg: 2.65, liquidSg: 1, flowGpm: 500 },
    exText: (o) => `Example: 30% sand (SG 2.65) in water is a ${o.slurrySg} SG slurry with ${o.solidsByVolumePercent}% solids by volume; 500 gpm carries ${o.solidsTonsPerHour} tons of dry solids an hour.`,
    how: "Enter percent solids by weight (or measured slurry SG), the solids' specific gravity and the carrier liquid.",
    assume: "SGm = 100 ÷ (Cw/SGs + (100 − Cw)/SGl); Cv = Cw × SGm ÷ SGs.",
    faq: [["How do you calculate slurry density?", "From solids concentration and the specific gravities of solids and liquid using the mixture formula."]],
  }),
  mk({
    slug: "smys-calculator", title: "SMYS & Pipe Pressure Rating Calculator (Barlow)",
    desc: "Calculate pipeline hoop stress, percent of SMYS and maximum allowable operating pressure with Barlow's formula and ASME B31.8 design factors — by API 5L grade, OD, wall and class location.",
    meta: "SMYS Calculator — Barlow Pressure & % SMYS",
    inputs: [num("od", "Outside Diameter (in)", 12.75, 60, 0.001), num("wall", "Wall Thickness (in)", 0.25, 3, 0.001), dropdown("grade", "API 5L Grade", opts(E.API5L.map(([n]) => n)), 3), dropdown("locationClass", "Location Class (design factor)", opts(["Class 1 Div 2 (0.72)", "Class 2 (0.60)", "Class 3 (0.50)", "Class 4 (0.40)", "Class 1 Div 1 (0.80)"]), 0), num("jointFactor", "Joint Factor E", 1, 1, 0.05, 0.6), num("tempFactor", "Temperature Derating T", 1, 1, 0.01, 0.8), num("operatingPressure", "Operating Pressure (psig)", 1000, 10000, 1)],
    results: [["maopPsi", "Design Pressure / MAOP (psig)", "n"], ["percentSmys", "Operating Stress (% SMYS)", "n"], ["hoopStressPsi", "Hoop Stress at Operating Pressure (psi)", "n"], ["pressureAt100SmysPsi", "Pressure at 100% SMYS (psig)", "n"], ["designFactor", "Design Factor F", "n"], ["withinMaop", "Operating ≤ Design Pressure (1 = yes)", "n"]],
    fn: E.smys, ex: { od: 12.75, wall: 0.25, grade: 3, locationClass: 0, jointFactor: 1, tempFactor: 1, operatingPressure: 1000 },
    exText: (o) => `Example: 12.75 in × 0.25 in X52 pipe in a Class 1 location has a design pressure of ${fmt(o.maopPsi, 0)} psig; operating at 1,000 psig stresses it to ${o.percentSmys}% of SMYS.`,
    how: "Enter pipe OD, nominal wall, grade and class location. Use the corroded or minimum wall for integrity assessments.",
    assume: "Barlow: P = 2St/D; ASME B31.8 design pressure = 2StFET/D. API 5L SMYS values. Liquid pipelines (B31.4) use F = 0.72. Not a substitute for a code calculation of MAOP.",
    faq: [["What is SMYS?", "Specified minimum yield strength — the guaranteed minimum yield stress for a pipe grade, e.g. 52,000 psi for X52."]],
  }),
  mk({
    slug: "air-suspension-psi-calculator", title: "Air Suspension Load PSI Calculator",
    desc: "Find the air spring pressure needed to carry a load — psi per bag from axle load, number of air springs, effective area and leverage — and capacity at the bag's maximum pressure.",
    meta: "Air Suspension Load PSI Calculator — Air Bag Pressure",
    inputs: [num("axleLoad", "Load on the Axle / Bags (lb)", 6000, 100000, 10), num("bags", "Number of Air Springs", 2, 8, 1, 1), num("effectiveDiameter", "Effective Diameter (in)", 8, 20, 0.1), num("effectiveArea", "Or Effective Area (sq in, 0 = use diameter)", 0, 400, 0.1), num("leverageRatio", "Leverage Ratio (axle-to-pivot ÷ bag-to-pivot)", 1, 3, 0.01, 0.3), num("maxPsi", "Air Spring Maximum Pressure (psi)", 100, 200, 1, 20)],
    results: [["requiredPsi", "Required Pressure (psi)", "n"], ["loadPerBagLb", "Load per Air Spring (lb)", "n"], ["effectiveAreaSqIn", "Effective Area (sq in)", "n"], ["capacityAtMaxPsiLb", "Axle Capacity at Max psi (lb)", "n"], ["withinRating", "Within Max Pressure (1 = yes)", "n"]],
    fn: E.airSuspension, ex: { axleLoad: 6000, bags: 2, effectiveDiameter: 8, effectiveArea: 0, leverageRatio: 1, maxPsi: 100 },
    exText: (o) => `Example: 6,000 lb on two 8 in effective-diameter air springs mounted over the axle needs about ${o.requiredPsi} psi each.`,
    how: "Weigh the axle (or use GAWR), count the air springs and take the effective area from the spring's data sheet at ride height. Use a leverage ratio above 1 when bags sit closer to the pivot than the axle.",
    assume: "psi = load per bag × leverage ÷ effective area. Effective area changes with height — use the value at your design ride height.",
    faq: [["How much psi should air bags have?", "Enough to reach design ride height under load — typically 40–100 psi; never exceed the spring's maximum."]],
  }),
  mk({
    slug: "crane-size-calculator", title: "Crane Size Calculator",
    desc: "Estimate the crane needed for a lift — total lifted weight with rigging and hook block, required chart capacity at radius for standard or critical lifts, load moment and an approximate crane class.",
    meta: "Crane Calculator — Capacity at Radius & Crane Size",
    inputs: [num("loadLb", "Load Weight (lb)", 12000, 2000000, 10), num("riggingLb", "Rigging Weight (lb)", 600, 100000, 10), num("hookBlockLb", "Hook Block / Ball (lb)", 900, 50000, 10), num("radiusFt", "Working Radius (ft)", 60, 500, 1, 5), dropdown("liftType", "Lift Type (chart % used)", opts(["Standard lift, truck crane (85%)", "Critical lift (75%)", "Crawler crane (80%)"]), 0)],
    results: [["requiredCapacityAtRadiusLb", "Required Chart Capacity at Radius (lb)", "n"], ["totalLiftedWeightLb", "Total Lifted Weight (lb)", "n"], ["loadMomentFtTons", "Load Moment (ft-tons)", "n"], ["estimatedCraneClassTons", "Approximate Crane Class (tons)", "n"], ["chartPercentUsed", "Chart Limit Used (%)", "n"]],
    fn: E.craneSize, ex: { loadLb: 12000, riggingLb: 600, hookBlockLb: 900, radiusFt: 60, liftType: 0 },
    exText: (o) => `Example: a 12,000 lb load with rigging and hook block (${fmt(o.totalLiftedWeightLb, 0)} lb) at 60 ft radius needs about ${fmt(o.requiredCapacityAtRadiusLb, 0)} lb of chart capacity — roughly a ${o.estimatedCraneClassTons}-ton class crane.`,
    how: "Enter the load, rigging and hook block weights and the radius from crane centerline to the load. Always confirm on the specific crane's load chart with the planned boom length and configuration.",
    assume: "The crane class is a rule-of-thumb estimate (nominal ratings apply only at very short radius). Critical lifts are commonly limited to 75% of chart.",
    faq: [["How do I know what size crane I need?", "Find the total lifted weight and radius, then pick a crane whose load chart at that radius and boom length exceeds it with margin."]],
  }),
  mk({
    slug: "4-20ma-calculator", title: "4-20 mA Calculator",
    desc: "Scale a 4–20 mA signal to engineering units and back — value from current, current from value, percent of span, 1–5 V across 250 Ω and NAMUR NE 43 fault check.",
    meta: "4-20 mA Calculator — Signal Scaling & Conversion",
    inputs: [dropdown("mode", "Convert", opts(["mA → value", "Value → mA"]), 0), num("rangeLow", "Range Low (value at 4 mA)", 0, 1000000, 0.01, -1000000), num("rangeHigh", "Range High (value at 20 mA)", 150, 1000000, 0.01, -1000000), num("milliamps", "Signal (mA)", 12, 25, 0.01), num("value", "Process Value", 75, 1000000, 0.01, -1000000)],
    results: [["engineeringValue", "Process Value", "n"], ["milliamps", "Signal (mA)", "n"], ["percentOfSpan", "Percent of Span", "p"], ["voltsAcross250Ohm", "Voltage across 250 Ω (V)", "n"], ["fault", "NAMUR Fault (< 3.8 or > 20.5 mA) (1 = yes)", "n"]],
    fn: E.fourTwenty, ex: { mode: 0, rangeLow: 0, rangeHigh: 150, milliamps: 12, value: 75 },
    exText: (o) => `Example: 12 mA on a 0–150 psi transmitter reads ${o.engineeringValue} psi — ${o.percentOfSpan}% of span (${o.voltsAcross250Ohm} V across a 250 Ω resistor).`,
    how: "Enter the transmitter's calibrated range, then a current to convert to a value or a value to convert to the expected current.",
    assume: "Linear scaling: value = low + (mA − 4) ÷ 16 × span. NAMUR NE 43: below 3.8 mA or above 20.5 mA indicates a fault.",
    faq: [["Why is 4–20 mA used instead of 0–20?", "A live zero at 4 mA lets you tell a 0% reading apart from a broken wire (0 mA)."]],
  }),
  mk({
    slug: "bearing-life-calculator", title: "Bearing Size & Life Calculator (L10)",
    desc: "Calculate rolling bearing L10 life in hours and revolutions from dynamic load rating, equivalent load, speed and reliability — and the load rating needed to hit a target life.",
    meta: "Bearing Size Calculator — L10 Life & Required Rating",
    inputs: [dropdown("type", "Bearing Type", opts(["Ball bearing (p = 3)", "Roller bearing (p = 10/3)"]), 0), num("dynamicRating", "Dynamic Load Rating C (lbf or N)", 7000, 10000000, 1), num("equivalentLoad", "Equivalent Dynamic Load P (same units)", 1000, 10000000, 1), num("rpm", "Speed (rpm)", 1800, 100000, 1, 1), dropdown("reliability", "Reliability", opts(["90% (L10)", "95% (L5)", "96% (L4)", "97% (L3)", "98% (L2)", "99% (L1)"]), 0), num("targetHours", "Target Life (hours)", 40000, 1000000, 100)],
    results: [["lifeHours", "Rating Life (hours)", "n"], ["lifeMillionRevs", "Life (million revolutions)", "n"], ["lifeYearsAt8760", "Life at 24/7 (years)", "n"], ["requiredRatingForTarget", "C Needed for Target Life", "n"], ["loadRatio", "C / P Ratio", "n"], ["meetsTarget", "Meets Target (1 = yes)", "n"]],
    fn: E.bearingLife, ex: { type: 0, dynamicRating: 7000, equivalentLoad: 1000, rpm: 1800, reliability: 0, targetHours: 40000 },
    exText: (o) => `Example: a ball bearing with C = 7,000 lbf under 1,000 lbf at 1,800 rpm has an L10 life of about ${fmt(o.lifeHours, 0)} hours; reaching 40,000 hours would need C ≈ ${fmt(o.requiredRatingForTarget, 0)} lbf.`,
    how: "Take C from the bearing catalog and compute P from radial and axial loads (P = XFr + YFa). Enter the speed and target life.",
    assume: "ISO 281 basic rating life with reliability factor a1; lubrication and contamination factors (aISO) are taken as 1. Typical targets: 20,000–30,000 h for 8 h/day machines, 40,000–60,000 h for continuous duty.",
    faq: [["What does L10 life mean?", "The life that 90% of a group of identical bearings will reach or exceed under the same conditions."]],
  }),
  mk({
    slug: "desiccant-calculator", title: "Desiccant Calculator",
    desc: "Calculate desiccant for packaging (MIL-STD-2073 units from barrier area and dunnage) or for shipping containers by size, transit time and climate.",
    inputs: [dropdown("mode", "Application", opts(["Sealed package (MIL-STD-2073 Method II)", "Shipping container"]), 0), num("length", "Package Length (in)", 24, 500, 0.5), num("width", "Package Width (in)", 18, 500, 0.5), num("height", "Package Height (in)", 12, 500, 0.5), dropdown("dunnage", "Dunnage Material", opts(["Wood", "Cellulose / cardboard", "Rubber / felt", "Plastic foam"]), 1), num("dunnageLb", "Dunnage Weight (lb)", 3, 10000, 0.1), dropdown("container", "Container", opts(["20 ft", "40 ft", "40 ft high cube"]), 1), num("transitDays", "Transit Days", 30, 120, 1, 1), dropdown("climate", "Route Climate", opts(["Dry / temperate winter", "Temperate", "Tropical / humid"]), 1)],
    results: [["desiccantUnits", "Desiccant Units (package)", "n"], ["unitGrams", "Approx. Grams (package)", "n"], ["barrierAreaSqIn", "Barrier Area (sq in)", "n"], ["containerKg", "Container Desiccant (kg)", "n"], ["bags1kg", "1 kg Container Bags", "n"]],
    fn: E.desiccant, ex: { mode: 0, length: 24, width: 18, height: 12, dunnage: 1, dunnageLb: 3, container: 1, transitDays: 30, climate: 1 },
    exText: (o) => `Example: a 24 × 18 × 12 in barrier bag with 3 lb of cardboard dunnage needs ${o.desiccantUnits} units of desiccant (about ${fmt(o.unitGrams, 0)} g of clay).`,
    how: "For packages, enter the barrier bag size and dunnage. For containers, choose the size, transit time and climate.",
    assume: "MIL-STD-2073-1 Method II: U = 0.011 A + X D (A in sq in, D lb; X = 8 wood, 4 cellulose, 2 rubber, 0.5 foam). One unit ≈ 33 g of clay. Container rule of thumb: ~0.15 kg per m³ per month in temperate routes.",
    faq: [["How much desiccant do I need for a 40 ft container?", "Typically 8–16 kg (in hanging strips) for a 30-day temperate voyage, more in tropical conditions."]],
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
      categoryId: (await sciMovedCategoryId(prisma, def.slug)) ?? cat.id,
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
