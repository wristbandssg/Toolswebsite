// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the motorsports sub-batch D (Chassis Setup, Fuel & Strategy). See
// src/lib/calc-engine-motorsport-engine.ts for the full list
// of 5 sub-batches (55 tools under Sports Calculators > Motorsports &
// Racing Calculators), and src/lib/calc-engine-motorsport-chassis-fuel.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-motorsport-chassis-fuel-calculators.ts
// or
//   npm run db:create-motorsport-chassis-fuel-calculators

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

const CORNER = numberField("cornerSprungWeight", "Corner Sprung Weight (lb)", { default: 700, max: 5000, step: 5 });
const MR = numberField("motionRatio", "Motion Ratio (Spring Travel ÷ Wheel Travel)", { default: 0.9, min: 0.1, max: 1.5, step: 0.01 });
const ANGLE = numberField("springAngleDeg", "Spring Angle from Vertical (°)", { default: 10, max: 80 });

const TOOLS: ToolDef[] = [
  {
    slug: "ride-height-calculator",
    title: "Ride Height Calculator",
    description: "Predict how much a spring rate change or a preload/perch adjustment will raise or lower your car's ride height at that corner.",
    metaTitle: "Ride Height Calculator — Spring Change Effect",
    metaDescription: "Free ride height calculator. Predict ride height change from new spring rates or coilover preload using motion ratio.",
    calcInputs: [CORNER, MR, numberField("oldSpringRate", "Current Spring Rate (lb/in)", { default: 400, min: 1, max: 5000, step: 5 }), numberField("newSpringRate", "New Spring Rate (lb/in)", { default: 500, min: 1, max: 5000, step: 5 }), numberField("preloadChangeIn", "Perch / Preload Change (in, Raise +)", { default: 0, min: -5, max: 5, step: 0.05 })],
    calcResult: { label: "Ride Height Change", format: "number" },
    calcResults: [num("rideHeightChangeIn", "Ride Height Change (in, + Higher)", true), num("rideHeightChangeMm", "Ride Height Change (mm)"), num("oldWheelRate", "Current Wheel Rate (lb/in)"), num("newWheelRate", "New Wheel Rate (lb/in)"), num("staticDeflectionNewIn", "Static Wheel Deflection, New Spring (in)")],
    instructions: "Enter the sprung weight on that corner, the motion ratio, both spring rates and any change in the spring perch (positive raises the car).",
    examples: "Example: with 700 lb on the corner and a 0.9 motion ratio, swapping a 400 lb/in spring for a 500 lb/in spring at the same free length raises that corner about 0.43 in.",
    assumptions: "Static wheel deflection = load ÷ (spring rate × MR²). Assumes the same free length and a linear spring; perch changes move the wheel by perch change ÷ MR. Re-check corner weights after adjusting. " + DISCLAIMER,
    faq: [
      { question: "Why does a stiffer spring raise the car?", answer: "It compresses less under the same load, so with the same free length the car sits higher." },
      { question: "Does adjusting preload change spring rate?", answer: "No — on a coilover, preload (perch height) changes ride height only, not the rate." },
    ],
  },
  {
    slug: "race-car-spring-rate-calculator",
    title: "Race Car Spring Rate Calculator",
    description: "Pick the spring rate for a target ride frequency from corner weight, motion ratio and spring angle — the standard way to size race car springs.",
    metaTitle: "Race Car Spring Rate Calculator — Ride Frequency",
    metaDescription: "Free race car spring rate calculator. Get spring rate (lb/in, N/mm) for a target ride frequency from corner weight and motion ratio.",
    calcInputs: [CORNER, numberField("targetFrequencyHz", "Target Ride Frequency (Hz)", { default: 2, max: 6, step: 0.05 }), MR, ANGLE],
    calcResult: { label: "Spring Rate", format: "number" },
    calcResults: [num("springRateLbIn", "Spring Rate (lb/in)", true), num("springRateNmm", "Spring Rate (N/mm)"), num("wheelRateLbIn", "Wheel Rate (lb/in)"), num("staticDeflectionIn", "Static Wheel Deflection (in)")],
    instructions: "Enter the sprung weight at the corner, the ride frequency you want, the motion ratio and the spring's angle from vertical.",
    examples: "Example: 700 lb sprung corner weight at 2.0 Hz with a 0.9 motion ratio and a 10° spring angle needs about a 364 lb/in spring (64 N/mm).",
    assumptions: "Wheel rate = 4π² f² m; spring rate = wheel rate ÷ (MR² × cos² angle). Typical ride frequencies: 1–1.5 Hz street, 1.5–2 Hz sporty, 2–3 Hz track, 3–5 Hz+ high-downforce. Tire stiffness lowers the true frequency slightly. " + DISCLAIMER,
    faq: [
      { question: "What ride frequency should I choose?", answer: "About 1.5–2.0 Hz for a street/track car, 2.0–3.0 Hz for a dedicated race car without much aero." },
      { question: "Should rear frequency be higher?", answer: "Usually 10–20% higher at the rear so the car settles flat over bumps (the 'flat ride' rule)." },
    ],
  },
  {
    slug: "wheel-rate-calculator",
    title: "Wheel Rate Calculator",
    description: "Convert a spring rate into the effective wheel rate using motion ratio and spring angle — and see the resulting ride frequency.",
    metaTitle: "Wheel Rate Calculator — Spring to Wheel Rate",
    metaDescription: "Free wheel rate calculator. Convert spring rate to wheel rate with motion ratio and spring angle, plus ride frequency.",
    calcInputs: [numberField("springRate", "Spring Rate (lb/in)", { default: 500, max: 5000, step: 5 }), MR, ANGLE, CORNER],
    calcResult: { label: "Wheel Rate", format: "number" },
    calcResults: [num("wheelRateLbIn", "Wheel Rate (lb/in)", true), num("rideFrequencyHz", "Ride Frequency (Hz)"), num("effectiveMotionRatio", "Effective Motion Ratio"), num("wheelRateNmm", "Wheel Rate (N/mm)")],
    instructions: "Enter the spring rate, motion ratio, spring angle and the corner's sprung weight (for ride frequency).",
    examples: "Example: a 500 lb/in spring with a 0.9 motion ratio at 10° gives a 393 lb/in wheel rate — about 2.34 Hz with 700 lb on the corner.",
    assumptions: "Wheel rate = spring rate × MR² × cos²(angle); frequency = √(wheel rate ÷ mass) ÷ 2π. Measure the motion ratio by moving the wheel 1 in and measuring spring compression. " + DISCLAIMER,
    faq: [
      { question: "Why is motion ratio squared?", answer: "Leverage reduces both the force the spring sees and the distance it moves, so its effect at the wheel falls with the square." },
      { question: "What's a typical motion ratio?", answer: "MacPherson struts are near 0.9–1.0; double wishbones often 0.6–0.8 depending on the mount point." },
    ],
  },
  {
    slug: "camber-calculator",
    title: "Camber Calculator",
    description: "Measure wheel camber with a plumb line or level — convert the top-versus-bottom difference across the rim into camber angle.",
    metaTitle: "Camber Calculator — Measure Camber at Home",
    metaDescription: "Free camber calculator. Convert a plumb-line or level measurement across the wheel into camber degrees.",
    calcInputs: [numberField("topMinusBottom", "Top minus Bottom Distance to Plumb Line (in, Top In = −)", { default: -0.3, min: -5, max: 5, step: 0.01 }), numberField("measureSpan", "Vertical Span Between Measuring Points (in)", { default: 17, min: 1, max: 40, step: 0.1 })],
    calcResult: { label: "Camber", format: "number" },
    calcResults: [num("camberDegrees", "Camber (°, − Negative)", true), num("offsetPerInchOfSpan", "Difference per Inch of Span (in)"), num("offsetFor1Degree", "Difference for 1° over This Span (in)")],
    instructions: "Hang a plumb line (or hold a level) against the wheel, measure the gap to the rim at the top and at the bottom, and subtract. Enter the vertical distance between the two points.",
    examples: "Example: if the rim's top is 0.30 in closer to the car than the bottom across a 17 in span, camber is about −1.0°.",
    assumptions: "Camber = atan(difference ÷ span). Measure on a level floor with the car at ride height and the steering straight. Negative camber means the top of the tire leans in. " + DISCLAIMER,
    faq: [
      { question: "How much negative camber for the track?", answer: "Typically −1.5° to −3° front for track days on a street car, depending on the suspension and tires." },
      { question: "Does camber wear tires?", answer: "Too much negative camber wears the inside edge on the street; on track it evens out tire temperatures." },
    ],
  },
  {
    slug: "caster-calculator",
    title: "Caster Calculator",
    description: "Calculate caster angle with the camber-sweep method — measure camber with the wheel turned out and in, and convert the change to caster.",
    metaTitle: "Caster Calculator — Camber Sweep Method",
    metaDescription: "Free caster calculator. Get caster angle from camber readings with the wheel turned out and in (sweep method).",
    calcInputs: [numberField("sweepDeg", "Steering Sweep Each Way (°)", { default: 20, min: 5, max: 30 }), numberField("camberTurnedOut", "Camber with Wheel Turned Out (°)", { default: -2.8, min: -20, max: 20, step: 0.05 }), numberField("camberTurnedIn", "Camber with Wheel Turned In (°)", { default: 3.2, min: -20, max: 20, step: 0.05 })],
    calcResult: { label: "Caster", format: "number" },
    calcResults: [num("casterDegrees", "Caster (°)", true), num("camberChange", "Camber Change (°)"), num("multiplierUsed", "Multiplier Used")],
    instructions: "Turn the wheel the chosen number of degrees away from the car (use turn plates), read camber, then turn it the same amount toward the car and read camber again.",
    examples: "Example: with a 20° sweep, camber reading −2.8° turned out and +3.2° turned in is a 6.0° change — about 8.8° of positive caster.",
    assumptions: "Caster ≈ camber change ÷ (2 × sin sweep), which gives a multiplier of 1.46 for 20° and 1.5 for about 19.5°. Accurate to a few tenths if the turn angles are exact. " + DISCLAIMER,
    faq: [
      { question: "What does more caster do?", answer: "Improves straight-line stability and adds negative camber to the outside wheel when cornering, at the cost of heavier steering." },
      { question: "How much caster is typical?", answer: "Modern street cars run about 4–7°; track cars often 6–10°." },
    ],
  },
  {
    slug: "toe-calculator",
    title: "Toe Calculator",
    description: "Convert a toe measurement in inches or mm into degrees — total toe and per wheel — using the tire diameter.",
    metaTitle: "Toe Calculator — Inches/mm to Degrees",
    metaDescription: "Free alignment toe calculator. Convert total toe in inches or millimetres to degrees, total and per wheel.",
    calcInputs: [dropdown("unit", "Unit", [["Inches", 1], ["Millimetres", 2]], 1), numberField("totalToe", "Total Toe (Front − Rear Spacing Difference, In +)", { default: 0.125, min: -100, max: 100, step: 0.001 }), numberField("tireDiameter", "Tire Diameter (Measuring Span)", { default: 26, min: 1, max: 1500, step: 0.1 })],
    calcResult: { label: "Total Toe", format: "number" },
    calcResults: [num("totalToeDegrees", "Total Toe (°)", true), num("perWheelDegrees", "Per Wheel (°)"), num("totalToeMm", "Total Toe (mm)"), num("totalToeIn", "Total Toe (in)", false, 3), num("perWheelIn", "Per Wheel (in)", false, 3)],
    instructions: "Measure between the tires at the rear and front at hub height (string or toe plates). Enter the difference — positive for toe-in (fronts closer) — and the tire diameter you measured across.",
    examples: "Example: 1/8 in (0.125 in) of total toe-in measured across a 26 in tire is about 0.28° total, or 0.14° per wheel.",
    assumptions: "Toe angle = atan(difference ÷ diameter). Toe-in adds straight-line stability; toe-out sharpens turn-in. Small amounts make a big difference to tire wear. " + DISCLAIMER,
    faq: [
      { question: "What toe setting for the track?", answer: "Often 0 to slight toe-out at the front for turn-in, and slight toe-in at the rear for stability." },
      { question: "How much toe wears tires?", answer: "Even small toe errors scrub the tires sideways on every mile — keep street settings near factory spec." },
    ],
  },
  {
    slug: "octane-calculator",
    title: "Octane Calculator",
    description: "Work out the octane of a blend of two fuels (e.g. pump gas and race fuel) and how much race fuel to add to reach a target octane (also a fuel mix calculator).",
    metaTitle: "Octane Calculator — Fuel Blend Octane",
    metaDescription: "Free octane blending calculator. Get the octane of a pump gas and race fuel mix and the amount needed for a target.",
    calcInputs: [numberField("fuel1Gallons", "Fuel 1 Amount", { default: 10, max: 10000, step: 0.1 }), numberField("fuel1Octane", "Fuel 1 Octane", { default: 91, min: 60, max: 130, step: 0.5 }), numberField("fuel2Gallons", "Fuel 2 Amount", { default: 5, max: 10000, step: 0.1 }), numberField("fuel2Octane", "Fuel 2 Octane", { default: 110, min: 60, max: 130, step: 0.5 }), numberField("targetOctane", "Target Octane", { default: 100, min: 60, max: 130, step: 0.5 })],
    calcResult: { label: "Blend Octane", format: "number" },
    calcResults: [num("blendOctane", "Blend Octane", true), num("fuel2NeededForTarget", "Fuel 2 to Add to Fuel 1 for Target"), num("totalGallons", "Total Amount"), pct("fuel2Share", "Fuel 2 Share")],
    instructions: "Enter the amount and octane of each fuel (any volume unit, used consistently) and the octane you want. Use the same rating method for both (AKI/US pump or RON).",
    examples: "Example: 10 gallons of 91 with 5 gallons of 110 race fuel blends to about 97.3 octane. To reach 100, add 9 gallons of 110 to the 10 gallons of 91.",
    assumptions: "Blend octane is volume-weighted (a linear approximation — real blends of very different fuels may vary slightly). Don't mix leaded race fuel into cars with catalytic converters or O2 sensors. " + DISCLAIMER,
    faq: [
      { question: "Is octane blending linear?", answer: "Close enough for gasoline blends; ethanol blends tend to give a bit more octane than the linear average." },
      { question: "Does higher octane add power?", answer: "Only if the engine is knock-limited and tuned to use it — otherwise it just costs more." },
    ],
  },
  {
    slug: "e85-mix-calculator",
    title: "E85 Mix Calculator",
    description: "Find how much E85 and pump gas to add to your tank to hit a target ethanol blend like E30 or E40 (also an ethanol mix calculator).",
    metaTitle: "E85 Mix Calculator — Ethanol Blend for Your Tank",
    metaDescription: "Free E85 mix calculator. Find how many gallons of E85 and pump gas to add for an E30, E40 or any ethanol blend.",
    calcInputs: [numberField("tankSize", "Tank Size", { default: 16, min: 0.1, max: 200, step: 0.1 }), numberField("currentFuel", "Fuel Already in Tank", { default: 4, max: 200, step: 0.1 }), percentField("currentEthanolPercent", "Ethanol % of Fuel in Tank", { default: 10 }), percentField("targetEthanolPercent", "Target Ethanol %", { default: 40 }), percentField("pumpGasEthanolPercent", "Pump Gas Ethanol %", { default: 10 }), percentField("e85EthanolPercent", "Actual E85 Ethanol % (Often 70–85)", { default: 85, min: 50 })],
    calcResult: { label: "E85 to Add", format: "number" },
    calcResults: [num("e85ToAdd", "E85 to Add", true), num("pumpGasToAdd", "Pump Gas to Add"), pct("resultingEthanolPercent", "Resulting Ethanol Content"), num("targetReachable", "Target Reached (1 Yes, 0 No)")],
    instructions: "Enter the tank size and how much fuel is in it now (any unit), its ethanol content, your target and the real ethanol content of your local E85 and pump gas.",
    examples: "Example: a 16 gallon tank with 4 gallons of E10 left needs 6.4 gallons of E85 and 5.6 gallons of E10 pump gas to make E40.",
    assumptions: "Mass balance by volume, filling the tank completely. E85 can contain as little as 51–70% ethanol in winter — test it with an ethanol tester for precision. Only run ethanol blends your fuel system and tune support. " + DISCLAIMER,
    faq: [
      { question: "Why run E30 or E40?", answer: "Ethanol resists knock, so tuned engines can run more timing or boost — E30 gives much of the benefit without needing huge fuel system upgrades." },
      { question: "Does E85 always contain 85% ethanol?", answer: "No — it varies by season and region, often 70–83%. A flex-fuel sensor or tester shows the true content." },
    ],
  },
  {
    slug: "2-stroke-oil-mix-calculator",
    title: "2 Stroke Oil Mix Calculator",
    description: "Calculate how much two-stroke oil to add to gasoline for any premix ratio like 32:1 or 50:1, in ounces and millilitres (also a premix calculator).",
    metaTitle: "2 Stroke Oil Mix Calculator — Premix Ratio",
    metaDescription: "Free 2 stroke oil mix calculator. Get oil in oz and ml for any fuel ratio (32:1, 40:1, 50:1) and amount of gas.",
    calcInputs: [numberField("ratio", "Mix Ratio (e.g. 32 for 32:1)", { default: 32, min: 1, max: 200 }), numberField("fuelAmount", "Amount of Fuel", { default: 1, max: 1000, step: 0.1 }), dropdown("fuelUnit", "Fuel Unit", [["US gallons", 1], ["Litres", 2]], 1)],
    calcResult: { label: "Oil to Add", format: "number" },
    calcResults: [num("oilFlOz", "Oil to Add (fl oz)", true), num("oilMl", "Oil to Add (ml)"), num("oilPerGallonOz", "Oil per US Gallon (fl oz)"), num("oilPerLiterMl", "Oil per Litre (ml)")],
    instructions: "Enter the ratio your engine maker specifies, the amount of fuel and its unit.",
    examples: "Example: 1 US gallon at 32:1 needs 4.0 fl oz (118 ml) of two-stroke oil.",
    assumptions: "Oil = fuel volume ÷ ratio. Use the ratio from your owner's manual or oil maker — race bikes often run 32:1 to 40:1, many modern trimmers 50:1. Mix in a clean container and shake before fuelling. " + DISCLAIMER,
    faq: [
      { question: "Is 32:1 or 50:1 more oil?", answer: "32:1 — a lower number means more oil per unit of fuel." },
      { question: "What if I use too little oil?", answer: "Lean on oil risks scuffing and seizing the piston; too much smokes and fouls plugs. Stick to the recommended ratio." },
    ],
  },
  {
    slug: "racing-fuel-calculator",
    title: "Racing Fuel Calculator",
    description: "Calculate the fuel you need for a race by laps or by time — with a safety margin, starting fuel and fuel stops (also a sim racing fuel calculator for iRacing, ACC and more).",
    metaTitle: "Racing Fuel Calculator — Fuel for Race & Sim Racing",
    metaDescription: "Free racing fuel calculator for real and sim racing. Get total fuel, starting fuel and stops for lap or timed races.",
    calcInputs: [
      dropdown("raceType", "Race Length By", [["Laps", 1], ["Time (minutes)", 2]], 1),
      numberField("laps", "Race Laps", { default: 30, max: 2000 }),
      numberField("raceMinutes", "Race Duration (min)", { default: 45, max: 1500 }),
      numberField("lapTimeSeconds", "Average Lap Time (s, for Timed Races)", { default: 92, min: 1, max: 1000, step: 0.1 }),
      numberField("fuelPerLap", "Fuel per Lap (L or gal)", { default: 2.8, max: 100, step: 0.01 }),
      numberField("extraLaps", "Safety Margin (Extra Laps)", { default: 1.5, max: 20, step: 0.1 }),
      numberField("tankCapacity", "Tank Capacity (Same Unit)", { default: 110, max: 1000, step: 0.5 }),
    ],
    calcResult: { label: "Total Fuel Needed", format: "number" },
    calcResults: [num("totalFuelNeeded", "Total Fuel Needed", true), num("raceLaps", "Race Laps"), num("startingFuel", "Starting Fuel (Capped at Tank)"), num("pitStopsForFuel", "Fuel Stops Needed"), num("lapsPerTank", "Laps per Full Tank")],
    instructions: "Choose laps or timed race. Enter fuel per lap (from practice or telemetry), a safety margin in laps and your tank capacity. For timed races also enter your average lap time.",
    examples: "Example: a 30-lap race at 2.8 per lap with a 1.5-lap margin needs 88.2 litres — inside a 110 L tank, so no fuel stop is needed.",
    assumptions: "Timed races count the laps you can start before time expires, plus one. Fuel = per-lap use × (laps + margin). Formation laps, safety cars and fuel saving change consumption. " + DISCLAIMER,
    faq: [
      { question: "How do I find fuel per lap?", answer: "Divide fuel used over a stint by laps completed — sims like iRacing and ACC show it live." },
      { question: "How much safety margin?", answer: "1–2 laps is typical; more for timed races or if safety cars are likely to bunch the field." },
    ],
  },
  {
    slug: "race-strategy-calculator",
    title: "Race Strategy Calculator",
    description: "Compare 0, 1, 2 and 3 pit-stop strategies using tire degradation and pit lane time loss to find the fastest race plan (also a pit stop calculator).",
    metaTitle: "Race Strategy Calculator — Best Pit Stop Plan",
    metaDescription: "Free race strategy and pit stop calculator. Compare 0–3 stop race times from tire degradation and pit loss.",
    calcInputs: [numberField("laps", "Race Laps", { default: 50, min: 1, max: 2000 }), numberField("baseLapTime", "Lap Time on Fresh Tires (s)", { default: 90, max: 1000, step: 0.1 }), numberField("degradationPerLap", "Tire Degradation (s Slower per Lap of Age)", { default: 0.08, max: 5, step: 0.01 }), numberField("pitLossSeconds", "Pit Stop Time Loss (s)", { default: 22, max: 300, step: 0.5 })],
    calcResult: { label: "Best Number of Stops", format: "number" },
    calcResults: [num("bestNumberOfStops", "Best Number of Stops", true), num("raceTimeZeroStopsMin", "Race Time, No Stop (min)"), num("raceTimeOneStopMin", "Race Time, 1 Stop (min)"), num("raceTimeTwoStopsMin", "Race Time, 2 Stops (min)"), num("raceTimeThreeStopsMin", "Race Time, 3 Stops (min)"), num("gainVsNextBestSeconds", "Gain vs Next-Best Plan (s)")],
    instructions: "Enter race length, your fresh-tire lap time, how much slower each lap of tire age makes you, and the total time a pit stop costs (pit lane plus stationary time).",
    examples: "Example: a 50-lap race with 90 s laps, 0.08 s/lap degradation and a 22 s pit loss — one stop is fastest, about 5.4 s quicker than two stops and 28 s quicker than no stop.",
    assumptions: "Linear degradation, equal-length stints and a no-stop option allowed (ignores mandatory stops, fuel weight, traffic and safety cars). Use it to compare plans, not to predict exact times. " + DISCLAIMER,
    faq: [
      { question: "When is an extra stop worth it?", answer: "When the time saved on fresher tires exceeds the pit loss — high degradation or a short pit lane favour more stops." },
      { question: "Does fuel weight matter?", answer: "Yes — cars get faster as fuel burns off, which this simple model doesn't include." },
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
