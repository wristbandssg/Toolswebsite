// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the motorsports sub-batch C (Drag Racing, Dynamics & Aero). See
// src/lib/calc-engine-motorsport-engine.ts for the full list
// of 5 sub-batches (55 tools under Sports Calculators > Motorsports &
// Racing Calculators), and src/lib/calc-engine-motorsport-dynamics.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-motorsport-dynamics-calculators.ts
// or
//   npm run db:create-motorsport-dynamics-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Motorsports & Racing Calculators", slug: "motorsports-racing-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning and education only. Motorsport is dangerous: confirm figures against your manufacturer's specifications, a qualified mechanic or engine builder, and your series' official rules, and always use proper safety equipment.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const SPEED_UNIT: [string, number][] = [["mph", 1], ["km/h", 2]];
const RHO = numberField("airDensity", "Air Density (kg/m³, 1.225 = Sea Level)", { default: 1.225, min: 0.5, max: 1.5, step: 0.001 });

const TOOLS: ToolDef[] = [
  {
    slug: "1-8-to-1-4-mile-calculator",
    title: "1/8 To 1/4 Mile Calculator",
    description: "Convert an eighth-mile ET and trap speed into an estimated quarter-mile time and speed — or a quarter-mile pass back to the eighth.",
    metaTitle: "1/8 to 1/4 Mile Calculator — ET & MPH Conversion",
    metaDescription: "Free 1/8 to 1/4 mile calculator. Convert eighth-mile ET and mph to quarter-mile estimates, or back again.",
    calcInputs: [dropdown("direction", "Convert", [["1/8 mile → 1/4 mile", 1], ["1/4 mile → 1/8 mile", 2]], 1), numberField("et", "Elapsed Time (s)", { default: 7.8, max: 30, step: 0.001 }), numberField("mph", "Trap Speed (mph)", { default: 90, max: 350, step: 0.01 })],
    calcResult: { label: "Converted ET", format: "number" },
    calcResults: [num("convertedEt", "Converted ET (s)", true), num("convertedMph", "Converted Trap Speed (mph)"), num("etFactor", "ET Factor Used", false, 4), num("mphFactor", "MPH Factor Used", false, 3)],
    instructions: "Choose the direction and enter the elapsed time and trap speed from your time slip.",
    examples: "Example: a 7.80 s eighth mile at 90 mph converts to about a 12.35 s quarter mile at 113 mph.",
    assumptions: "Uses the common drag-racing factors ET × 1.5832 and mph × 1.255. Cars that pull hard on the top end (big turbos) often beat the estimate; traction-limited cars may fall short. " + DISCLAIMER,
    faq: [
      { question: "How accurate is the conversion?", answer: "Usually within about 0.1–0.2 s for typical street/strip cars; very high-powered or aero-limited cars differ more." },
      { question: "Why do tracks run 1/8 mile?", answer: "Shorter tracks need less shutdown room and are safer for very fast cars — many bracket tracks are 1/8 mile." },
    ],
  },
  {
    slug: "g-force-calculator",
    title: "G Force Calculator",
    description: "Calculate g-force from acceleration or braking (speed change over time) or from cornering (speed and turn radius).",
    metaTitle: "G Force Calculator — Acceleration & Cornering G",
    metaDescription: "Free g-force calculator. Get g from 0–60 times, braking or cornering speed and radius, in m/s² and ft/s².",
    calcInputs: [
      dropdown("mode", "Type", [["Acceleration / braking", 1], ["Cornering", 2]], 1),
      dropdown("speedUnit", "Speed Unit", SPEED_UNIT, 1),
      numberField("speedChange", "Speed Change (Accel/Braking)", { default: 60, max: 500 }),
      numberField("timeSeconds", "Time (s, Accel/Braking)", { default: 4, min: 0.01, max: 120, step: 0.01 }),
      numberField("speed", "Cornering Speed", { default: 60, max: 500 }),
      numberField("radiusFt", "Turn Radius", { default: 300, min: 0.1, max: 10000 }),
      dropdown("radiusUnit", "Radius Unit", [["Feet", 1], ["Metres", 2]], 1),
    ],
    calcResult: { label: "G Force", format: "number" },
    calcResults: [num("gForce", "G Force (g)", true), num("accelerationMs2", "Acceleration (m/s²)"), num("accelerationFtS2", "Acceleration (ft/s²)")],
    instructions: "For straight-line acceleration or braking, enter the speed change and the time it took. For cornering, enter the speed and the radius of the turn.",
    examples: "Example: 0–60 mph in 4.0 seconds averages 0.68 g. Cornering at 60 mph on a 300 ft radius pulls about 0.8 g.",
    assumptions: "Linear: a = Δv ÷ t. Cornering: a = v² ÷ r. 1 g = 9.80665 m/s². Results are averages — peak g is higher. " + DISCLAIMER,
    faq: [
      { question: "How many g can a car pull?", answer: "Street cars corner at about 0.8–1.0 g, track cars on slicks 1.2–1.5 g, and F1 cars over 5 g with downforce." },
      { question: "What is 1 g of braking?", answer: "Slowing by about 22 mph every second — good street tires on dry pavement reach roughly 1 g." },
    ],
  },
  {
    slug: "braking-distance-calculator",
    title: "Braking Distance Calculator",
    description: "Calculate total stopping distance — reaction distance plus braking distance — from speed, road surface, grade and reaction time.",
    metaTitle: "Braking Distance Calculator — Stopping Distance",
    metaDescription: "Free braking distance calculator. Get reaction, braking and total stopping distance from speed, surface and grade.",
    calcInputs: [
      numberField("speed", "Speed", { default: 60, max: 300 }),
      dropdown("speedUnit", "Speed Unit", SPEED_UNIT, 1),
      dropdown("surface", "Surface", [["Dry asphalt (0.7)", 1], ["Wet asphalt (0.4)", 2], ["Packed snow (0.2)", 3], ["Ice (0.1)", 4], ["Performance tires, dry (1.0)", 5], ["Race slicks (1.4)", 6]], 1),
      numberField("customFriction", "Custom Friction Coefficient (0 = Use Surface)", { default: 0, max: 2, step: 0.01, required: false }),
      numberField("gradePercent", "Road Grade (% Uphill +, Downhill −)", { default: 0, min: -30, max: 30, step: 0.5 }),
      numberField("reactionSeconds", "Reaction Time (s)", { default: 1.5, max: 5, step: 0.1 }),
    ],
    calcResult: { label: "Total Stopping Distance", format: "number" },
    calcResults: [num("totalStoppingDistanceFt", "Total Stopping Distance (ft)", true), num("brakingDistanceFt", "Braking Distance (ft)"), num("reactionDistanceFt", "Reaction Distance (ft)"), num("totalStoppingDistanceM", "Total Stopping Distance (m)"), num("stoppingTimeSeconds", "Total Stopping Time (s)"), num("decelerationG", "Deceleration (g)")],
    instructions: "Enter the speed, choose the surface (or type a friction coefficient), the grade and the driver's reaction time.",
    examples: "Example: at 60 mph on dry asphalt with a 1.5 s reaction, the car travels 132 ft before braking and 172 ft while braking — about 304 ft in total.",
    assumptions: "Braking distance = v² ÷ (2 g (μ + grade)); reaction distance = v × reaction time. Assumes full braking with no lock-up. Tire condition, brakes and load change real results. " + DISCLAIMER,
    faq: [
      { question: "Why does doubling speed quadruple braking distance?", answer: "Braking distance rises with the square of speed, because kinetic energy does." },
      { question: "What is a typical reaction time?", answer: "About 1–1.5 s for an alert driver; racers anticipating a braking point react far quicker." },
    ],
  },
  {
    slug: "density-altitude-calculator",
    title: "Density Altitude Calculator",
    description: "Calculate density altitude and air density from temperature, elevation, barometric pressure and dew point — and the power loss for a naturally aspirated engine (also an air density calculator).",
    metaTitle: "Density Altitude Calculator — Air Density for Racing",
    metaDescription: "Free density altitude calculator for racing. Get DA, air density and NA power loss from temperature, altitude, pressure and dew point.",
    calcInputs: [numberField("temperatureF", "Air Temperature (°F)", { default: 85, min: -40, max: 130 }), numberField("elevationFt", "Track Elevation (ft)", { default: 1000, min: -1500, max: 15000, step: 10 }), numberField("altimeterInHg", "Altimeter Setting (inHg, Sea-Level Corrected)", { default: 29.92, min: 25, max: 32, step: 0.01 }), numberField("dewPointF", "Dew Point (°F)", { default: 60, min: -40, max: 90 })],
    calcResult: { label: "Density Altitude", format: "number" },
    calcResults: [num("densityAltitudeFt", "Density Altitude (ft)", true), num("airDensityKgM3", "Air Density (kg/m³)", false, 4), num("airDensityLbFt3", "Air Density (lb/ft³)", false, 5), pct("relativeAirDensityPercent", "Relative Air Density"), pct("powerLossPercent", "NA Power Loss vs Standard"), num("pressureAltitudeFt", "Pressure Altitude (ft)")],
    instructions: "Enter the temperature, elevation, the altimeter (sea-level corrected) pressure from a weather report and the dew point.",
    examples: "Example: 85 °F at 1,000 ft with 29.92 inHg and a 60 °F dew point is a density altitude of about 3,100 ft — air density 1.117 kg/m³, costing a naturally aspirated engine about 8.8% of its sea-level power.",
    assumptions: "Pressure altitude from the altimeter setting, station pressure from the standard atmosphere, humid-air density from the dew point (Magnus formula), then density altitude from the standard-atmosphere density curve. Turbocharged engines lose less. " + DISCLAIMER,
    faq: [
      { question: "Why do drag racers watch density altitude?", answer: "Thinner air means less power and slower ETs — roughly 0.1 s per 1,000 ft for many cars — so it's key for dial-ins and tuning." },
      { question: "Does humidity hurt power?", answer: "Yes — water vapour displaces oxygen and is lighter than dry air, raising density altitude." },
    ],
  },
  {
    slug: "drag-coefficient-calculator",
    title: "Drag Coefficient Calculator",
    description: "Calculate aerodynamic drag force and the power needed to overcome it from Cd, frontal area and speed — or work out Cd from a measured drag force.",
    metaTitle: "Drag Coefficient Calculator — Aero Drag Force",
    metaDescription: "Free drag coefficient calculator. Get drag force, CdA and power to overcome drag, or Cd from measured force.",
    calcInputs: [numberField("dragCoefficient", "Drag Coefficient (Cd)", { default: 0.3, max: 2, step: 0.01 }), numberField("frontalAreaM2", "Frontal Area (m²)", { default: 2.2, max: 10, step: 0.05 }), numberField("speedMph", "Speed (mph)", { default: 70, max: 400 }), RHO, numberField("measuredForceN", "Measured Drag Force (N, Optional → Solves Cd)", { default: 0, max: 100000, required: false })],
    calcResult: { label: "Drag Force", format: "number" },
    calcResults: [num("dragForceLbf", "Drag Force (lbf)", true), num("dragForceN", "Drag Force (N)"), num("powerToOvercomeHp", "Power to Overcome Drag (hp)"), num("dragCoefficient", "Drag Coefficient (Cd)", false, 3), num("cdA", "CdA (m²)", false, 3)],
    instructions: "Enter Cd, frontal area and speed to get drag. If you've measured the drag force (e.g. from a coast-down test), enter it to solve for Cd instead.",
    examples: "Example: a car with Cd 0.30 and 2.2 m² frontal area at 70 mph faces about 89 lbf of drag, needing 16.6 hp just to push through the air.",
    assumptions: "Drag = ½ ρ Cd A v². Power = drag × speed. Default air density 1.225 kg/m³ (sea level, 15 °C). " + DISCLAIMER,
    faq: [
      { question: "What is CdA?", answer: "Cd × frontal area — the number that actually determines drag. A small car with a worse Cd can still have lower CdA." },
      { question: "How does speed affect drag power?", answer: "Drag force rises with speed squared and the power needed with speed cubed." },
    ],
  },
  {
    slug: "downforce-calculator",
    title: "Downforce Calculator",
    description: "Calculate wing or car downforce from lift coefficient, area and speed — plus the drag and power cost using lift-to-drag ratio.",
    metaTitle: "Downforce Calculator — Wing Downforce & Drag",
    metaDescription: "Free downforce calculator. Get downforce in lb and N from Cl, wing area and speed, plus induced drag and power cost.",
    calcInputs: [numberField("liftCoefficient", "Lift Coefficient (Cl)", { default: 1.5, max: 5, step: 0.05 }), numberField("wingAreaM2", "Wing / Reference Area (m²)", { default: 0.6, max: 10, step: 0.05 }), numberField("speedMph", "Speed (mph)", { default: 100, max: 300 }), numberField("liftToDrag", "Lift-to-Drag Ratio (L/D)", { default: 4, min: 0.1, max: 30, step: 0.1 }), RHO],
    calcResult: { label: "Downforce", format: "number" },
    calcResults: [num("downforceLbs", "Downforce (lb)", true), num("downforceN", "Downforce (N)"), num("dragN", "Drag from Downforce (N)"), num("dragPowerHp", "Power Cost (hp)"), num("downforceAt150MphLbs", "Downforce at 150 mph (lb)")],
    instructions: "Enter the wing's lift coefficient, its plan area, the speed and the lift-to-drag ratio (typically 3–8 for a rear wing).",
    examples: "Example: a 0.6 m² wing with Cl 1.5 at 100 mph makes about 248 lb of downforce, costing about 16.5 hp at an L/D of 4.",
    assumptions: "Downforce = ½ ρ Cl A v²; drag = downforce ÷ (L/D). Real downforce depends on angle, endplates, the airflow reaching the wing and ground effect. " + DISCLAIMER,
    faq: [
      { question: "How does downforce scale with speed?", answer: "With the square — double the speed gives four times the downforce." },
      { question: "Is more downforce always better?", answer: "Not on high-speed tracks: the extra drag lowers top speed. It's a trade-off between corner speed and straight-line speed." },
    ],
  },
  {
    slug: "rolling-resistance-calculator",
    title: "Rolling Resistance Calculator",
    description: "Calculate tire rolling resistance force and the horsepower it absorbs from vehicle weight, tire type and speed.",
    metaTitle: "Rolling Resistance Calculator — Force & Power",
    metaDescription: "Free rolling resistance calculator. Get rolling resistance force (lbf, N) and power from weight, tire Crr and speed.",
    calcInputs: [dropdown("tireType", "Tire / Surface", [["Low-rolling-resistance tire (0.008)", 1], ["Passenger car tire (0.012)", 2], ["Performance / truck tire (0.015)", 3], ["Gravel / off-road (0.03)", 4], ["Very low (high-pressure racing / eco, 0.004)", 5]], 2), numberField("customCrr", "Custom Crr (0 = Use Tire Type)", { default: 0, max: 0.5, step: 0.001, required: false }), numberField("weightLb", "Vehicle Weight (lb)", { default: 3500, max: 100000, step: 50 }), numberField("speedMph", "Speed (mph)", { default: 60, max: 300 })],
    calcResult: { label: "Rolling Resistance", format: "number" },
    calcResults: [num("rollingResistanceLbf", "Rolling Resistance (lbf)", true), num("rollingResistanceN", "Rolling Resistance (N)"), num("powerHp", "Power Absorbed (hp)"), num("crrUsed", "Crr Used", false, 4)],
    instructions: "Choose a tire type (or enter your own coefficient), then the vehicle weight and speed.",
    examples: "Example: a 3,500 lb car on passenger tires (Crr 0.012) has 42 lbf of rolling resistance, absorbing about 6.7 hp at 60 mph.",
    assumptions: "Force = Crr × weight; power = force × speed. Crr rises with low tire pressure, soft compounds and heat, and slightly with speed. " + DISCLAIMER,
    faq: [
      { question: "How does tire pressure affect rolling resistance?", answer: "Lower pressure increases tire deflection and Crr — under-inflation can raise it by 10% or more." },
      { question: "Is rolling resistance or drag bigger?", answer: "Rolling resistance dominates at low speed; aero drag overtakes it at around 40–50 mph for a typical car." },
    ],
  },
  {
    slug: "weight-transfer-calculator",
    title: "Weight Transfer Calculator",
    description: "Calculate longitudinal (braking/acceleration) and lateral (cornering) weight transfer from weight, CG height, wheelbase and track width.",
    metaTitle: "Weight Transfer Calculator — Braking & Cornering",
    metaDescription: "Free weight transfer calculator. Get front-rear and side-to-side load transfer from CG height, wheelbase, track and g.",
    calcInputs: [numberField("weightLb", "Vehicle Weight (lb)", { default: 3200, max: 20000, step: 10 }), numberField("cgHeightIn", "Centre of Gravity Height (in)", { default: 20, max: 100, step: 0.1 }), numberField("wheelbaseIn", "Wheelbase (in)", { default: 105, min: 1, max: 300, step: 0.1 }), numberField("trackWidthIn", "Track Width (in)", { default: 62, min: 1, max: 120, step: 0.1 }), numberField("longitudinalG", "Braking / Acceleration (g)", { default: 1, min: -3, max: 3, step: 0.05 }), numberField("lateralG", "Cornering (g)", { default: 1, max: 6, step: 0.05 })],
    calcResult: { label: "Longitudinal Transfer", format: "number" },
    calcResults: [num("longitudinalTransferLb", "Front–Rear Weight Transfer (lb)", true), num("lateralTransferLb", "Side-to-Side Weight Transfer (lb)"), pct("longitudinalPercent", "Front–Rear Transfer (% of Weight)"), pct("lateralPercent", "Side-to-Side Transfer (% of Weight)"), num("rolloverThresholdG", "Static Rollover Threshold (g)")],
    instructions: "Enter weight, CG height, wheelbase, track width and the g-forces to analyse.",
    examples: "Example: a 3,200 lb car with a 20 in CG, 105 in wheelbase and 62 in track transfers about 610 lb front-to-rear under 1 g braking and 1,032 lb side-to-side at 1 g cornering.",
    assumptions: "Longitudinal transfer = weight × g × CG height ÷ wheelbase; lateral = weight × g × CG height ÷ track. Springs and anti-roll bars change how the transfer splits between front and rear, not the total. " + DISCLAIMER,
    faq: [
      { question: "How do I reduce weight transfer?", answer: "Lower the centre of gravity or widen the track/lengthen the wheelbase — suspension stiffness only changes its timing and distribution." },
      { question: "What is the rollover threshold?", answer: "Half the track divided by CG height — the lateral g at which a rigid vehicle would tip. Real tires usually slide first." },
    ],
  },
  {
    slug: "corner-weight-calculator",
    title: "Corner Weight Calculator",
    description: "Turn four corner scale weights into total weight, front/rear and left/right distribution, cross weight and wedge (also a weight distribution calculator).",
    metaTitle: "Corner Weight Calculator — Cross Weight & Balance",
    metaDescription: "Free corner weight calculator. Get front/rear, left/right and cross-weight percentages and wedge from four scale readings.",
    calcInputs: [numberField("leftFront", "Left Front (lb)", { default: 850, max: 10000 }), numberField("rightFront", "Right Front (lb)", { default: 820, max: 10000 }), numberField("leftRear", "Left Rear (lb)", { default: 760, max: 10000 }), numberField("rightRear", "Right Rear (lb)", { default: 770, max: 10000 })],
    calcResult: { label: "Cross Weight", format: "percentage" },
    calcResults: [pct("crossWeightPercent", "Cross Weight (RF + LR)", true), num("totalWeight", "Total Weight (lb)"), pct("frontPercent", "Front"), pct("rearPercent", "Rear"), pct("leftPercent", "Left"), pct("rightPercent", "Right"), num("wedgeLb", "Wedge (RF + LR − LF − RR, lb)")],
    instructions: "Weigh the car on four scales on a level surface with the driver (or ballast) in the seat, then enter each corner.",
    examples: "Example: 850 / 820 / 760 / 770 lb (LF / RF / LR / RR) is 3,200 lb with 52.2% front and a 49.4% cross weight — 40 lb of negative wedge.",
    assumptions: "Cross weight = (RF + LR) ÷ total. Road racers usually target 50% cross weight for equal handling left and right; oval racers add wedge. Adjust with spring perches or ride-height screws. " + DISCLAIMER,
    faq: [
      { question: "What cross weight should I run?", answer: "50% for road courses and autocross; oval cars often run 52–56% (more on the RF/LR diagonal) to help turn left." },
      { question: "Does fuel load matter?", answer: "Yes — scale the car at the fuel level that matters most, or with ballast representing the driver and typical fuel." },
    ],
  },
  {
    slug: "ballast-calculator",
    title: "Ballast Calculator",
    description: "Work out how much ballast you need to reach a class minimum weight and the ballast that gets you to a target front weight percentage.",
    metaTitle: "Ballast Calculator — Race Car Minimum Weight",
    metaDescription: "Free race car ballast calculator. Find ballast to hit minimum weight and target front/rear balance by placement.",
    calcInputs: [numberField("currentWeight", "Current Weight with Driver (lb)", { default: 2400, max: 20000 }), percentField("currentFrontPercent", "Current Front Weight", { default: 55 }), numberField("minimumWeight", "Class Minimum Weight (lb)", { default: 2500, max: 20000 }), numberField("wheelbaseIn", "Wheelbase (in)", { default: 100, min: 1, max: 300 }), numberField("ballastPositionIn", "Ballast Position Behind Front Axle (in)", { default: 70, max: 300 }), percentField("targetFrontPercent", "Target Front Weight", { default: 52 })],
    calcResult: { label: "Ballast to Minimum", format: "number" },
    calcResults: [num("ballastToMinimumWeight", "Ballast to Reach Minimum (lb)", true), pct("frontPercentAfterMinimumBallast", "Front Weight After That Ballast"), num("ballastForTargetBalance", "Ballast for Target Front % at This Position (lb)"), num("targetReachable", "Target Reachable at This Position (1 Yes, 0 No)")],
    instructions: "Enter the car's current weight and front percentage, the class minimum, the wheelbase and where you'll mount the ballast (distance behind the front axle).",
    examples: "Example: a 2,400 lb car at 55% front needs 100 lb to reach a 2,500 lb minimum. Mounted 70 in behind the front axle of a 100 in wheelbase car, front weight drops to 54%; reaching 52% would take about 327 lb there.",
    assumptions: "Ballast at a point x behind the front axle adds (1 − x ÷ wheelbase) of its weight to the front axle. Mount ballast low, securely and as your rules require. " + DISCLAIMER,
    faq: [
      { question: "Where should I put ballast?", answer: "As low as possible and where it improves balance — usually near the centre or on the side that improves cross weight." },
      { question: "Why can't I reach my target?", answer: "If the ballast position's front share is on the wrong side of your target, adding weight there moves balance the wrong way — move it." },
    ],
  },
  {
    slug: "roll-center-calculator",
    title: "Roll Center Calculator",
    description: "Find the front-view roll centre height of a double-wishbone suspension from the control arm pivot points, plus the instant centre and swing-arm length.",
    metaTitle: "Roll Center Calculator — Double Wishbone",
    metaDescription: "Free roll center calculator. Get roll centre height, instant centre and swing-arm length from control arm pivot points.",
    calcInputs: [
      numberField("lowerInnerY", "Lower Arm Inner Pivot — From Centreline (in)", { default: 12, max: 60, step: 0.1 }),
      numberField("lowerInnerZ", "Lower Arm Inner Pivot — Height (in)", { default: 8, max: 60, step: 0.1 }),
      numberField("lowerOuterY", "Lower Ball Joint — From Centreline (in)", { default: 28, max: 60, step: 0.1 }),
      numberField("lowerOuterZ", "Lower Ball Joint — Height (in)", { default: 7, max: 60, step: 0.1 }),
      numberField("upperInnerY", "Upper Arm Inner Pivot — From Centreline (in)", { default: 15, max: 60, step: 0.1 }),
      numberField("upperInnerZ", "Upper Arm Inner Pivot — Height (in)", { default: 17, max: 60, step: 0.1 }),
      numberField("upperOuterY", "Upper Ball Joint — From Centreline (in)", { default: 26, max: 60, step: 0.1 }),
      numberField("upperOuterZ", "Upper Ball Joint — Height (in)", { default: 18, max: 60, step: 0.1 }),
      numberField("trackWidth", "Track Width (in)", { default: 62, max: 120, step: 0.1 }),
    ],
    calcResult: { label: "Roll Center Height", format: "number" },
    calcResults: [num("rollCenterHeightIn", "Roll Centre Height (in)", true), num("instantCenterLateralIn", "Instant Centre — From Centreline (in)"), num("instantCenterHeightIn", "Instant Centre — Height (in)"), num("swingArmLengthIn", "Front-View Swing Arm Length (in)")],
    instructions: "Measure the four pivot points on one side in front view — distance out from the car's centreline and height above the ground — plus the track width. Assumes a symmetrical car at ride height.",
    examples: "Example: with the default arm geometry (lower arm 12→28 in out, 8→7 in high; upper arm 15→26 in out, 17→18 in high) and a 62 in track, the roll centre sits about 4.7 in above the ground.",
    assumptions: "The instant centre is where the arm lines cross; the roll centre is where the line from the tire contact patch through the instant centre meets the centreline. Static only — the roll centre moves as the car rolls and dives. " + DISCLAIMER,
    faq: [
      { question: "What roll centre height is typical?", answer: "Often 0–4 in at the front of road-race cars, with the rear slightly higher; very low or below-ground centres increase body roll." },
      { question: "Why does roll centre matter?", answer: "Its height relative to the CG sets the roll moment — a higher roll centre reduces roll but adds jacking forces." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
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
