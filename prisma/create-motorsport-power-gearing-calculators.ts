// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the motorsports sub-batch B (Power, Gearing, Wheels & Performance). See
// src/lib/calc-engine-motorsport-engine.ts for the full list
// of 5 sub-batches (55 tools under Sports Calculators > Motorsports &
// Racing Calculators), and src/lib/calc-engine-motorsport-power-gearing.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-motorsport-power-gearing-calculators.ts
// or
//   npm run db:create-motorsport-power-gearing-calculators

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

const tireFields = ([kw, ka, kr]: string[], w: number, a: number, r: number, label: string) => [
  numberField(kw, `${label} Width (mm)`, { default: w, min: 100, max: 400, step: 5 }),
  numberField(ka, `${label} Aspect Ratio (%)`, { default: a, min: 20, max: 90, step: 5 }),
  numberField(kr, `${label} Rim Diameter (in)`, { default: r, min: 10, max: 26 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "torque-to-horsepower-calculator",
    title: "Torque To Horsepower Calculator",
    description: "Convert engine torque to horsepower at any RPM — or horsepower back to torque — with kW, Nm and metric PS.",
    metaTitle: "Torque to Horsepower Calculator — lb-ft to HP",
    metaDescription: "Free torque to horsepower calculator. Convert lb-ft and RPM to horsepower (or HP to torque) with kW, Nm and PS.",
    calcInputs: [dropdown("mode", "Convert", [["Torque → horsepower", 1], ["Horsepower → torque", 2]], 1), numberField("torqueLbFt", "Torque (lb-ft)", { default: 400, max: 10000 }), numberField("horsepower", "Horsepower", { default: 400, max: 10000 }), numberField("rpm", "Engine RPM", { default: 5252, min: 1, max: 25000, step: 50 })],
    calcResult: { label: "Horsepower", format: "number" },
    calcResults: [num("horsepower", "Horsepower", true), num("torqueLbFt", "Torque (lb-ft)"), num("kilowatts", "Power (kW)"), num("torqueNm", "Torque (Nm)"), num("metricHorsepowerPs", "Metric Horsepower (PS)")],
    instructions: "Choose the direction, enter torque or horsepower and the RPM it's made at.",
    examples: "Example: 400 lb-ft at 5,252 RPM is exactly 400 hp (298 kW) — torque and horsepower curves always cross at 5,252 RPM.",
    assumptions: "HP = torque (lb-ft) × RPM ÷ 5,252. 1 hp = 0.7457 kW; 1 lb-ft = 1.3558 Nm; 1 hp = 1.0139 PS. " + DISCLAIMER,
    faq: [
      { question: "Why 5,252?", answer: "It comes from 33,000 ft-lb/min per horsepower divided by 2π — so torque and HP are equal at 5,252 RPM." },
      { question: "Is torque or horsepower more important?", answer: "Horsepower decides acceleration at any given speed; torque across the rev range shows how flexible the engine feels." },
    ],
  },
  {
    slug: "wheel-horsepower-calculator",
    title: "Wheel Horsepower Calculator",
    description: "Convert crank horsepower to wheel horsepower (or a dyno reading back to crank) using typical drivetrain losses for FWD, RWD and AWD.",
    metaTitle: "Wheel Horsepower Calculator — Crank to WHP",
    metaDescription: "Free wheel horsepower calculator. Convert crank HP to WHP or dyno WHP to crank HP using drivetrain loss by layout.",
    calcInputs: [dropdown("mode", "Convert", [["Crank HP → wheel HP", 1], ["Wheel HP (dyno) → crank HP", 2]], 1), numberField("horsepower", "Horsepower", { default: 400, max: 10000 }), dropdown("drivetrain", "Drivetrain", [["FWD (12%)", 1], ["RWD (15%)", 2], ["AWD (18%)", 3], ["4WD / older automatic (22%)", 4]], 2), percentField("customLossPercent", "Custom Loss (0 = Use Drivetrain)", { default: 0, max: 50 })],
    calcResult: { label: "Wheel Horsepower", format: "number" },
    calcResults: [num("wheelHorsepower", "Wheel Horsepower", true), num("crankHorsepower", "Crank Horsepower"), num("drivetrainLoss", "Drivetrain Loss (hp)"), pct("lossPercentUsed", "Loss Used")],
    instructions: "Choose the direction, enter the horsepower and drivetrain — or type your own loss percentage.",
    examples: "Example: a 400 hp (crank) rear-wheel-drive car makes about 340 hp at the wheels with a 15% loss.",
    assumptions: "WHP = crank HP × (1 − loss). Real losses vary by gearbox, dyno type (Dynojet reads higher than load-bearing dynos) and conditions. " + DISCLAIMER,
    faq: [
      { question: "How much power is lost through the drivetrain?", answer: "Typically 10–15% for manual FWD/RWD and 15–25% for AWD or older automatics." },
      { question: "Is drivetrain loss a percentage or fixed?", answer: "It's partly both — a percentage is the common rule of thumb but overstates loss on very powerful cars." },
    ],
  },
  {
    slug: "engine-rpm-calculator",
    title: "Engine RPM Calculator",
    description: "Find engine RPM at any road speed from gear ratio, final drive and tire diameter (also an RPM at speed calculator) — plus top speed at redline.",
    metaTitle: "Engine RPM Calculator — RPM at Speed",
    metaDescription: "Free engine RPM calculator. Get RPM at a speed from gear, final drive and tire size, plus mph per 1,000 RPM and speed at redline.",
    calcInputs: [
      numberField("speed", "Road Speed", { default: 70, max: 300 }),
      dropdown("speedUnit", "Speed Unit", [["mph", 1], ["km/h", 2]], 1),
      numberField("gearRatio", "Transmission Gear Ratio", { default: 0.7, max: 6, step: 0.01 }),
      numberField("finalDrive", "Final Drive Ratio", { default: 3.73, max: 10, step: 0.01 }),
      numberField("tireDiameter", "Tire Diameter (in)", { default: 27, min: 1, max: 60, step: 0.1 }),
      percentField("slipPercent", "Converter / Clutch Slip", { default: 0, max: 20 }),
      numberField("redline", "Redline RPM", { default: 6500, max: 20000, step: 100 }),
    ],
    calcResult: { label: "Engine RPM", format: "number" },
    calcResults: [num("engineRpm", "Engine RPM", true), num("speedAtRedlineMph", "Speed at Redline in This Gear (mph)"), num("speedAtRedlineKmh", "Speed at Redline (km/h)"), num("overallRatio", "Overall Ratio"), num("mphPer1000Rpm", "mph per 1,000 RPM")],
    instructions: "Enter the speed, the gear's ratio, the final drive and tire diameter (use the Tire Diameter Calculator if you only know the size code).",
    examples: "Example: 70 mph in a 0.70 overdrive with 3.73 gears and 27 in tires is about 2,275 RPM. In that gear a 6,500 RPM redline would be about 200 mph.",
    assumptions: "RPM = mph × gear × final drive × 336.13 ÷ tire diameter (in), plus slip. Tires grow slightly at speed, so real RPM may be a little lower. " + DISCLAIMER,
    faq: [
      { question: "What is a good cruise RPM?", answer: "Most engines are efficient and quiet around 1,800–2,500 RPM at highway speed." },
      { question: "How do bigger tires change RPM?", answer: "A taller tire lowers RPM at the same speed in proportion to the diameter change." },
    ],
  },
  {
    slug: "torque-converter-calculator",
    title: "Torque Converter Calculator",
    description: "Calculate torque converter slip from engine RPM, road speed, gearing and tire size — and see whether your converter is tight or loose.",
    metaTitle: "Torque Converter Slip Calculator",
    metaDescription: "Free torque converter slip calculator. Get slip %, input shaft RPM and RPM lost from engine speed, gearing and tire size.",
    calcInputs: [
      numberField("engineRpm", "Engine RPM (Tach)", { default: 2050, min: 1, max: 10000, step: 10 }),
      numberField("speedMph", "Road Speed (mph)", { default: 60, max: 300 }),
      numberField("gearRatio", "Gear Ratio", { default: 0.7, max: 6, step: 0.01 }),
      numberField("finalDrive", "Final Drive Ratio", { default: 3.73, max: 10, step: 0.01 }),
      numberField("tireDiameter", "Tire Diameter (in)", { default: 27, min: 1, max: 60, step: 0.1 }),
    ],
    calcResult: { label: "Converter Slip", format: "percentage" },
    calcResults: [pct("slipPercent", "Converter Slip", true), num("inputShaftRpm", "Transmission Input Shaft RPM"), num("rpmLost", "RPM Lost to Slip"), num("slipRating", "Rating (1 Tight, 2 Normal, 3 Loose, 4 Very Loose)")],
    instructions: "Hold a steady speed with the converter unlocked, note the tach and speed, then enter your gearing and tire diameter.",
    examples: "Example: 2,050 RPM at 60 mph in a 0.70 overdrive with 3.73 gears and 27 in tires means the input shaft turns about 1,950 RPM — 4.9% slip, normal for a street converter.",
    assumptions: "Input shaft RPM = mph × gear × final drive × 336.13 ÷ tire diameter; slip = (engine − shaft) ÷ engine. Rating bands: under 3% tight/locked, 3–8% normal, 8–15% loose, above 15% very loose. " + DISCLAIMER,
    faq: [
      { question: "How much converter slip is normal?", answer: "Around 3–8% at cruise for a stock-to-mild converter; high-stall race converters slip more." },
      { question: "Does a lock-up converter slip?", answer: "Once locked it's essentially 0% — measure slip with lock-up disengaged." },
    ],
  },
  {
    slug: "final-drive-ratio-calculator",
    title: "Final Drive Ratio Calculator",
    description: "Find the ideal rear-end gear for a target speed at a target RPM (also a drag racing gear ratio calculator) and see how your current gear compares.",
    metaTitle: "Final Drive Ratio Calculator — Rear Gear Ratio",
    metaDescription: "Free final drive and drag racing gear ratio calculator. Get the ideal rear gear for a trap speed at RPM, with common ratios.",
    calcInputs: [
      numberField("targetSpeedMph", "Target Speed (mph, e.g. Trap Speed)", { default: 120, min: 1, max: 350 }),
      numberField("rpmAtTarget", "RPM at Target Speed", { default: 6500, max: 20000, step: 100 }),
      numberField("tireDiameter", "Tire Diameter (in)", { default: 28, min: 1, max: 60, step: 0.1 }),
      numberField("topGearRatio", "Gear Used at Target (e.g. 1.00)", { default: 1, min: 0.1, max: 6, step: 0.01 }),
      percentField("slipPercent", "Converter / Tire Slip", { default: 3, max: 20 }),
      numberField("currentRatio", "Current Final Drive", { default: 3.73, max: 10, step: 0.01 }),
    ],
    calcResult: { label: "Ideal Final Drive", format: "number" },
    calcResults: [num("idealFinalDrive", "Ideal Final Drive Ratio", true), num("nearestCommonRatio", "Nearest Common Ratio"), num("currentRpmAtTarget", "Current Gear: RPM at Target Speed"), num("currentSpeedAtRpm", "Current Gear: Speed at Target RPM (mph)")],
    instructions: "Enter the speed you want to reach (for drag racing, your trap speed) and the RPM you want to cross the line at, then the tire diameter and the gear you'll be in.",
    examples: "Example: to cross the stripe at 120 mph and 6,500 RPM in 1:1 top gear with 28 in tires and 3% slip, you need about a 4.38 rear gear — 4.30 is the nearest common ratio.",
    assumptions: "Ratio = RPM × tire diameter ÷ (mph × 336.13 × gear × (1 + slip)). Drag racers usually aim to cross the finish a few hundred RPM past peak power. " + DISCLAIMER,
    faq: [
      { question: "What does a higher numerical gear do?", answer: "A 4.10 over a 3.73 gives harder acceleration but higher cruise RPM and a lower top speed in each gear." },
      { question: "How much slip should I allow?", answer: "About 2–5% for a street automatic or slicks; near 0% for a locked converter and good tire hook." },
    ],
  },
  {
    slug: "tire-diameter-calculator",
    title: "Tire Diameter Calculator",
    description: "Convert a metric tire size like 245/40R18 into overall diameter, sidewall height, circumference and revs per mile — and compare it with a second size.",
    metaTitle: "Tire Diameter Calculator — Tire Size Comparison",
    metaDescription: "Free tire diameter calculator. Convert 245/40R18-style sizes to diameter, sidewall, revs per mile, and compare two tires.",
    calcInputs: [...tireFields(["width1", "aspect1", "rim1"], 245, 40, 18, "Tire"), ...tireFields(["width2", "aspect2", "rim2"], 255, 40, 18, "Compare Tire")],
    calcResult: { label: "Diameter", format: "number" },
    calcResults: [num("diameterInches", "Overall Diameter (in)", true), num("diameterMm", "Overall Diameter (mm)"), num("sidewallMm", "Sidewall Height (mm)"), num("circumferenceInches", "Circumference (in)"), num("revsPerMile", "Revolutions per Mile"), num("secondTireDiameter", "Compare Tire Diameter (in)"), pct("differencePercent", "Diameter Difference")],
    instructions: "Enter the three numbers from the tire sidewall — width (mm), aspect ratio (%) and rim size (in) — and optionally a second size to compare.",
    examples: "Example: a 245/40R18 is 25.72 in tall with a 98 mm sidewall and turns about 784 times per mile. A 255/40R18 is 1.22% taller.",
    assumptions: "Diameter = 2 × width × aspect ÷ 25.4 + rim. Actual tires vary slightly by brand and inflation. Keep diameter changes within about ±3% to avoid ABS and speedometer problems. " + DISCLAIMER,
    faq: [
      { question: "What do the numbers on a tire mean?", answer: "245/40R18: 245 mm wide, sidewall 40% of the width, radial construction, fits an 18 in rim." },
      { question: "How far can I change tire size?", answer: "Staying within about 3% of the original diameter is the usual guideline." },
    ],
  },
  {
    slug: "speedometer-calculator",
    title: "Speedometer Calculator",
    description: "See how a new tire size changes your speedometer and odometer — the real speed when the dash shows a given number.",
    metaTitle: "Speedometer Calculator — Tire Size Speed Error",
    metaDescription: "Free speedometer calculator. Find your true speed and odometer error after changing tire size.",
    calcInputs: [...tireFields(["oldWidth", "oldAspect", "oldRim"], 225, 45, 17, "Original Tire"), ...tireFields(["newWidth", "newAspect", "newRim"], 245, 45, 17, "New Tire"), numberField("indicatedSpeed", "Speedometer Reading", { default: 60, max: 300 })],
    calcResult: { label: "Actual Speed", format: "number" },
    calcResults: [num("actualSpeed", "Actual Speed", true), pct("errorPercent", "Speedometer Error"), num("oldDiameter", "Original Diameter (in)"), num("newDiameter", "New Diameter (in)"), num("odometerMilesPer100", "Actual Miles per 100 Shown")],
    instructions: "Enter the original tire size the speedometer was calibrated for, the new size and the speed your dash shows.",
    examples: "Example: going from 225/45R17 to 245/45R17, a speedometer reading of 60 means you're really doing about 61.7 — 2.84% faster than shown.",
    assumptions: "Actual speed = shown × new diameter ÷ old diameter. Odometer error is the same percentage. The factory speedometer may already read a little high. " + DISCLAIMER,
    faq: [
      { question: "Do bigger tires make my speedometer read low?", answer: "Yes — a taller tire covers more ground per turn, so you're going faster than the dash shows." },
      { question: "Can I recalibrate the speedometer?", answer: "Most modern cars can be reprogrammed with a tuner or dealer tool; older cars use a different speedometer drive gear." },
    ],
  },
  {
    slug: "wheel-offset-calculator",
    title: "Wheel Offset Calculator",
    description: "Compare old and new wheel width and offset to see how far the tire moves out toward the fender and in toward the suspension — plus backspacing.",
    metaTitle: "Wheel Offset Calculator — Poke & Clearance",
    metaDescription: "Free wheel offset calculator. Compare width and offset to get outer poke, inner clearance change and backspacing.",
    calcInputs: [numberField("oldWidth", "Current Wheel Width (in)", { default: 8, min: 4, max: 15, step: 0.5 }), numberField("oldOffset", "Current Offset (mm)", { default: 45, min: -100, max: 100 }), numberField("newWidth", "New Wheel Width (in)", { default: 9, min: 4, max: 15, step: 0.5 }), numberField("newOffset", "New Offset (mm)", { default: 35, min: -100, max: 100 })],
    calcResult: { label: "Outer Poke Change", format: "number" },
    calcResults: [num("outerPokeChangeMm", "Outer Edge Moves Out (mm)", true), num("innerClearanceChangeMm", "Inner Edge Moves In (mm)"), num("oldBackspacingIn", "Current Backspacing (in)"), num("newBackspacingIn", "New Backspacing (in)")],
    instructions: "Enter the width and offset (ET) of your current wheel and the one you're considering. Positive results move toward the fender (outer) or toward the strut (inner).",
    examples: "Example: going from an 8 in +45 to a 9 in +35 wheel pushes the outer edge 22.7 mm further out and brings the inner edge 2.7 mm closer to the suspension.",
    assumptions: "Outer change = half the width change − offset change; inner change = half the width change + offset change. Backspacing assumes about 1 in of total rim flange. Check tire bulge, brake caliper and fender clearance too. " + DISCLAIMER,
    faq: [
      { question: "What does a lower offset do?", answer: "It pushes the wheel further out — a wider stance, but more poke and steering scrub." },
      { question: "What is backspacing?", answer: "The distance from the hub mounting face to the inner edge of the wheel — more backspacing tucks the wheel further in." },
    ],
  },
  {
    slug: "top-speed-calculator",
    title: "Top Speed Calculator",
    description: "Estimate a car's top speed from horsepower, drag coefficient, frontal area and weight — and check whether gearing or aerodynamics sets the limit.",
    metaTitle: "Top Speed Calculator — HP, Drag & Gearing",
    metaDescription: "Free top speed calculator. Estimate drag-limited and gearing-limited top speed from horsepower, Cd, frontal area and gear ratios.",
    calcInputs: [
      numberField("horsepower", "Crank Horsepower", { default: 400, max: 5000 }),
      percentField("drivetrainLossPercent", "Drivetrain Loss", { default: 15, max: 40 }),
      numberField("dragCoefficient", "Drag Coefficient (Cd)", { default: 0.32, max: 2, step: 0.01 }),
      numberField("frontalAreaM2", "Frontal Area (m²)", { default: 2.2, max: 10, step: 0.05 }),
      numberField("weightLb", "Weight (lb)", { default: 3500, max: 20000, step: 50 }),
      numberField("rollingResistance", "Rolling Resistance Coefficient", { default: 0.012, max: 0.1, step: 0.001 }),
      numberField("topGearRatio", "Top Gear Ratio (0 = Ignore Gearing)", { default: 0, max: 6, step: 0.01, required: false }),
      numberField("finalDrive", "Final Drive Ratio", { default: 3.42, max: 10, step: 0.01, required: false }),
      numberField("redline", "Redline RPM", { default: 7000, max: 20000, step: 100, required: false }),
      numberField("tireDiameter", "Tire Diameter (in)", { default: 27, min: 1, max: 60, step: 0.1, required: false }),
    ],
    calcResult: { label: "Top Speed", format: "number" },
    calcResults: [num("topSpeedMph", "Top Speed (mph)", true), num("topSpeedKmh", "Top Speed (km/h)"), num("dragLimitedMph", "Drag-Limited Speed (mph)"), num("gearingLimitedMph", "Gearing-Limited Speed (mph, 0 = Not Set)"), num("limitedByGearing", "Limited by Gearing (1 Yes, 0 No)")],
    instructions: "Enter power, drag coefficient, frontal area and weight. To check gearing, add the top gear ratio, final drive, redline and tire diameter.",
    examples: "Example: 400 hp with 15% drivetrain loss, a 0.32 Cd, 2.2 m² frontal area and 3,500 lb gives a drag-limited top speed of about 184 mph (295 km/h).",
    assumptions: "Solves wheel power = ½ ρ Cd A v³ + Crr m g v at sea-level air density (1.225 kg/m³). Real top speed also depends on peak power RPM, altitude, wind and lift. " + DISCLAIMER,
    faq: [
      { question: "How much power to go faster?", answer: "Drag rises with the cube of speed — roughly double the power is needed for 26% more top speed." },
      { question: "What is a typical Cd and frontal area?", answer: "Modern sedans are about 0.25–0.30 Cd and 2.1–2.3 m²; sports cars 0.30–0.35 and 1.9–2.1 m²." },
    ],
  },
  {
    slug: "0-60-time-calculator",
    title: "0-60 Time Calculator",
    description: "Estimate a car's 0–60 mph (and 0–100 km/h) time from horsepower, weight, drivetrain and tire grip.",
    metaTitle: "0-60 Time Calculator — Estimate 0 to 60 mph",
    metaDescription: "Free 0-60 calculator. Estimate 0–60 mph and 0–100 km/h times from horsepower, weight, drivetrain and tire grip.",
    calcInputs: [numberField("horsepower", "Horsepower", { default: 300, min: 1, max: 3000 }), numberField("weightLb", "Weight with Driver (lb)", { default: 3500, min: 100, max: 15000, step: 50 }), dropdown("drivetrain", "Drivetrain", [["FWD", 1], ["RWD", 2], ["AWD", 3]], 2), numberField("tireGrip", "Tire Grip (1.0 Street, 1.2 Sport, 1.5 Slick)", { default: 1, min: 0.5, max: 1.6, step: 0.05 })],
    calcResult: { label: "0-60 Time", format: "number" },
    calcResults: [num("zeroToSixtySeconds", "0–60 mph (s)", true), num("zeroToHundredKmhSeconds", "0–100 km/h (s)"), num("poundsPerHorsepower", "Pounds per Horsepower"), num("limitedByTraction", "Traction-Limited (1 Yes, 0 No)")],
    instructions: "Enter horsepower, weight (with driver), drivetrain and a tire grip factor.",
    examples: "Example: a 300 hp, 3,500 lb rear-wheel-drive car on street tires runs 0–60 mph in about 5.4 seconds — 11.7 lb per hp.",
    assumptions: "Takes the slower of a power-limited time (energy ÷ average usable power) and a traction-limited time, plus 0.3 s for launch. An estimate — gearing, launch control and power curve make real times vary by ±0.5 s. " + DISCLAIMER,
    faq: [
      { question: "Why does AWD launch faster?", answer: "All four tires put power down, so powerful cars are less traction-limited off the line." },
      { question: "How much does weight matter?", answer: "Every 100 lb is worth roughly 0.1 s in 0–60 for a typical car." },
    ],
  },
  {
    slug: "quarter-mile-calculator",
    title: "Quarter Mile Calculator",
    description: "Estimate quarter-mile ET and trap speed from weight and horsepower — or work out horsepower from your time slip (also a quarter mile HP calculator).",
    metaTitle: "Quarter Mile Calculator — ET, MPH & HP",
    metaDescription: "Free quarter mile calculator. Estimate 1/4 mile ET and trap speed from horsepower and weight, or HP from ET and trap mph.",
    calcInputs: [numberField("weightLb", "Race Weight with Driver (lb)", { default: 3500, min: 100, max: 15000, step: 10 }), numberField("horsepower", "Crank Horsepower", { default: 400, min: 1, max: 5000 }), numberField("etSeconds", "Your ET (s, for HP Estimate)", { default: 12.5, max: 30, step: 0.01 }), numberField("trapMph", "Your Trap Speed (mph, for HP Estimate)", { default: 110, max: 350, step: 0.1 })],
    calcResult: { label: "Estimated ET", format: "number" },
    calcResults: [num("estimatedEt", "Estimated Quarter-Mile ET (s)", true), num("estimatedTrapMph", "Estimated Trap Speed (mph)"), num("eighthMileEt", "Estimated 1/8-Mile ET (s)"), num("horsepowerFromEt", "Horsepower from Your ET"), num("horsepowerFromTrap", "Horsepower from Your Trap Speed")],
    instructions: "Enter race weight and horsepower to predict ET and trap speed. Add a real time slip's ET and trap speed to estimate the horsepower you're making.",
    examples: "Example: a 3,500 lb car with 400 hp should run about 12.0 s at 113.6 mph. A 12.5 s ET suggests about 354 hp; a 110 mph trap about 364 hp.",
    assumptions: "Hale formulas: ET = 5.825 × (weight ÷ hp)^⅓, mph = 234 × (hp ÷ weight)^⅓. Trap speed is the better HP indicator — ET depends heavily on launch and traction. " + DISCLAIMER,
    faq: [
      { question: "Why is trap speed better for estimating HP?", answer: "Trap speed reflects power over the whole run; ET is affected far more by the launch and 60 ft time." },
      { question: "Is the horsepower crank or wheel?", answer: "These formulas are calibrated to roughly crank (flywheel) horsepower." },
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
