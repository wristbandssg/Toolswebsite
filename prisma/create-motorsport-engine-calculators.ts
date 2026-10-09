// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the motorsports sub-batch A (Engine, Fuel & Forced Induction). See
// src/lib/calc-engine-motorsport-engine.ts for the full list
// of 5 sub-batches (55 tools under Sports Calculators > Motorsports &
// Racing Calculators), and src/lib/calc-engine-motorsport-engine.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-motorsport-engine-calculators.ts
// or
//   npm run db:create-motorsport-engine-calculators

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

const UNIT: [string, number][] = [["Inches", 1], ["Millimetres", 2]];
const SETUP: [string, number][] = [["Naturally aspirated (BSFC 0.50)", 1], ["Turbocharged (0.60)", 2], ["Supercharged (0.65)", 3], ["Nitrous (0.70)", 4], ["Rich race tune (0.80)", 5]];
const FUEL: [string, number][] = [["Gasoline", 1], ["E85", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "compression-ratio-calculator",
    title: "Compression Ratio Calculator",
    description: "Calculate your engine's static compression ratio from bore, stroke, chamber, piston, gasket and deck volumes — plus the dynamic compression ratio from intake valve closing.",
    metaTitle: "Compression Ratio Calculator — Static & Dynamic CR",
    metaDescription: "Free engine compression ratio calculator. Get static and dynamic CR from bore, stroke, chamber cc, piston dish, gasket and deck clearance.",
    calcInputs: [
      dropdown("unit", "Unit", UNIT, 1),
      numberField("bore", "Bore", { default: 4.03, max: 300, step: 0.001 }),
      numberField("stroke", "Stroke", { default: 3.48, max: 300, step: 0.001 }),
      numberField("chamberCc", "Combustion Chamber Volume (cc)", { default: 64, max: 500, step: 0.1 }),
      numberField("pistonCc", "Piston Volume (cc, Dish +, Dome −)", { default: 5, min: -100, max: 100, step: 0.1 }),
      numberField("gasketBore", "Head Gasket Bore", { default: 4.1, max: 300, step: 0.001 }),
      numberField("gasketThickness", "Head Gasket Thickness (Compressed)", { default: 0.04, max: 10, step: 0.001 }),
      numberField("deckClearance", "Deck Clearance (Piston Below Deck +)", { default: 0.005, min: -2, max: 10, step: 0.001 }),
      numberField("rodLength", "Connecting Rod Length", { default: 6.1, max: 500, step: 0.001 }),
      numberField("ivcAbdc", "Intake Valve Closing (° ABDC @ 0.050\")", { default: 60, max: 120 }),
    ],
    calcResult: { label: "Static Compression Ratio", format: "number" },
    calcResults: [num("staticCompressionRatio", "Static Compression Ratio (:1)", true), num("dynamicCompressionRatio", "Dynamic Compression Ratio (:1)"), num("sweptVolumeCc", "Swept Volume per Cylinder (cc)"), num("clearanceVolumeCc", "Clearance Volume (cc)"), num("effectiveStroke", "Effective Stroke After IVC")],
    instructions: "Choose inches or millimetres and enter the engine's dimensions. Piston volume: positive for a dish or valve reliefs, negative for a dome. Deck clearance: positive when the piston sits below the deck at TDC.",
    examples: "Example: a 4.03 × 3.48 in small block with 64 cc chambers, 5 cc dish, a 0.040 in gasket and 0.005 in deck is 10.24:1 static. With the intake closing at 60° ABDC and 6.1 in rods, the dynamic compression is about 8.43:1.",
    assumptions: "CR = (swept + clearance) ÷ clearance; clearance = chamber + piston + gasket + deck volumes. Dynamic CR uses the piston position at intake valve closing (exact slider-crank geometry). Pump gas usually tolerates about 8–8.5:1 dynamic. " + DISCLAIMER,
    faq: [
      { question: "What compression ratio for pump gas?", answer: "About 9.5–10.5:1 static with iron heads and 10.5–11.5:1 with aluminium heads, depending on the cam — dynamic CR is the better guide." },
      { question: "What is dynamic compression?", answer: "The compression actually achieved after the intake valve closes. A longer-duration cam closes later, lowering dynamic compression." },
    ],
  },
  {
    slug: "engine-displacement-calculator",
    title: "Engine Displacement Calculator",
    description: "Calculate engine displacement in cubic inches, cc and litres from bore, stroke and number of cylinders, plus the bore-to-stroke ratio.",
    metaTitle: "Engine Displacement Calculator — CI, CC, Litres",
    metaDescription: "Free engine displacement calculator. Enter bore, stroke and cylinders to get cubic inches, cc, litres and bore/stroke ratio.",
    calcInputs: [dropdown("unit", "Unit", UNIT, 1), numberField("bore", "Bore", { default: 4, max: 300, step: 0.001 }), numberField("stroke", "Stroke", { default: 3.48, max: 300, step: 0.001 }), numberField("cylinders", "Cylinders", { default: 8, min: 1, max: 16 })],
    calcResult: { label: "Cubic Inches", format: "number" },
    calcResults: [num("cubicInches", "Displacement (Cubic Inches)", true), num("cc", "Displacement (cc)"), num("liters", "Displacement (Litres)"), num("perCylinderCc", "Per Cylinder (cc)"), num("boreStrokeRatio", "Bore ÷ Stroke")],
    instructions: "Enter the bore, stroke (both in the same unit) and number of cylinders.",
    examples: "Example: a 4.00 in bore, 3.48 in stroke V8 is 349.9 cubic inches — 5,733 cc or 5.7 litres (the classic 350).",
    assumptions: "Displacement = π ÷ 4 × bore² × stroke × cylinders. An oversquare engine (ratio > 1) favours high RPM; undersquare favours low-end torque. " + DISCLAIMER,
    faq: [
      { question: "How much does an overbore add?", answer: "A 0.030 in overbore on a 4.00 in bore 350 adds about 5 cubic inches (to roughly 355)." },
      { question: "How do I convert CI to litres?", answer: "Multiply cubic inches by 0.016387 — 350 ci ≈ 5.7 L." },
    ],
  },
  {
    slug: "piston-speed-calculator",
    title: "Piston Speed Calculator",
    description: "Calculate mean piston speed in feet per minute and m/s from stroke and RPM, with a stress rating and the RPM that hits 4,500 fpm.",
    metaTitle: "Piston Speed Calculator — Mean Piston Speed",
    metaDescription: "Free piston speed calculator. Get mean piston speed (fpm and m/s) from stroke and RPM, with a safe-RPM guide.",
    calcInputs: [dropdown("unit", "Unit", UNIT, 1), numberField("stroke", "Stroke", { default: 3.48, max: 300, step: 0.001 }), numberField("rpm", "Engine RPM", { default: 6500, max: 25000, step: 50 })],
    calcResult: { label: "Mean Piston Speed", format: "number" },
    calcResults: [num("meanPistonSpeedFpm", "Mean Piston Speed (ft/min)", true), num("meanPistonSpeedMs", "Mean Piston Speed (m/s)"), num("stressLevel", "Stress (1 Street, 2 Performance, 3 Race, 4 Extreme)"), num("rpmAt4500Fpm", "RPM at 4,500 ft/min")],
    instructions: "Enter the stroke and the RPM you want to check.",
    examples: "Example: a 3.48 in stroke at 6,500 RPM averages 3,770 ft/min (19.2 m/s) — performance territory. It reaches 4,500 ft/min at about 7,760 RPM.",
    assumptions: "Mean piston speed = 2 × stroke × RPM. Rough guides: under 3,500 ft/min street, 3,500–4,500 performance with quality parts, 4,500–5,500 race-built, above that F1/extreme. " + DISCLAIMER,
    faq: [
      { question: "What is a safe piston speed?", answer: "About 4,000 ft/min for stock cast parts; forged race engines often run 4,500–5,000+." },
      { question: "Why do long-stroke engines rev lower?", answer: "The piston travels further each revolution, so it reaches high speeds — and stresses — at lower RPM." },
    ],
  },
  {
    slug: "rod-ratio-calculator",
    title: "Rod Ratio Calculator",
    description: "Find the rod-to-stroke ratio of an engine and the maximum connecting rod angle — and the rod length for a classic 1.75 ratio.",
    metaTitle: "Rod Ratio Calculator — Rod to Stroke Ratio",
    metaDescription: "Free rod ratio calculator. Get rod-to-stroke ratio and maximum rod angle from rod length and stroke.",
    calcInputs: [dropdown("unit", "Unit", UNIT, 1), numberField("rodLength", "Connecting Rod Length (Centre to Centre)", { default: 5.7, max: 500, step: 0.001 }), numberField("stroke", "Stroke", { default: 3.48, max: 300, step: 0.001 })],
    calcResult: { label: "Rod Ratio", format: "number" },
    calcResults: [num("rodRatio", "Rod Ratio (:1)", true), num("maxRodAngleDegrees", "Maximum Rod Angle (°)"), num("rodLengthForRatio175", "Rod Length for a 1.75 Ratio")],
    instructions: "Enter the rod's centre-to-centre length and the stroke in the same unit.",
    examples: "Example: a 5.7 in rod with a 3.48 in stroke (small-block Chevy 350) is a 1.64 ratio, with a maximum rod angle of 17.8°. A 6.09 in rod would give 1.75.",
    assumptions: "Rod ratio = rod length ÷ stroke; max rod angle = asin(stroke ÷ 2 ÷ rod length). Longer ratios reduce side loading on the cylinder wall; most engines are 1.5–1.9. " + DISCLAIMER,
    faq: [
      { question: "Is a higher rod ratio better?", answer: "It lowers piston side-thrust and helps high-RPM dwell at TDC, but needs a shorter piston or taller deck — gains are small." },
      { question: "What is a typical rod ratio?", answer: "Most production engines are 1.5–1.8; high-revving race engines often exceed 1.8." },
    ],
  },
  {
    slug: "cam-timing-calculator",
    title: "Cam Timing Calculator",
    description: "Turn camshaft valve events into intake and exhaust duration, lobe centrelines, lobe separation angle (LSA) and overlap.",
    metaTitle: "Cam Timing Calculator — Duration, LSA & Overlap",
    metaDescription: "Free cam timing calculator. Enter valve open/close events to get duration, intake/exhaust centreline, LSA and overlap.",
    calcInputs: [
      numberField("intakeOpenBtdc", "Intake Opens (° BTDC)", { default: 26, min: -60, max: 90 }),
      numberField("intakeCloseAbdc", "Intake Closes (° ABDC)", { default: 62, min: -60, max: 120 }),
      numberField("exhaustOpenBbdc", "Exhaust Opens (° BBDC)", { default: 70, min: -60, max: 120 }),
      numberField("exhaustCloseAtdc", "Exhaust Closes (° ATDC)", { default: 26, min: -60, max: 90 }),
    ],
    calcResult: { label: "Lobe Separation Angle", format: "number" },
    calcResults: [num("lobeSeparationAngle", "Lobe Separation Angle (°)", true), num("intakeDuration", "Intake Duration (°)"), num("exhaustDuration", "Exhaust Duration (°)"), num("intakeCenterlineAtdc", "Intake Centreline (° ATDC)"), num("exhaustCenterlineBtdc", "Exhaust Centreline (° BTDC)"), num("overlapDegrees", "Overlap (°)")],
    instructions: "Enter the four valve events from your cam card (all at the same lift — usually 0.050 in).",
    examples: "Example: intake 26° BTDC / 62° ABDC and exhaust 70° BBDC / 26° ATDC is 268°/276° duration, a 108° intake centreline, 110° LSA and 52° of overlap.",
    assumptions: "Duration = open + close + 180. Intake centreline = (close − open + 180) ÷ 2; LSA = average of the two centrelines; overlap = intake open + exhaust close. " + DISCLAIMER,
    faq: [
      { question: "What does a tighter LSA do?", answer: "Tighter (106–108°) adds overlap for more mid-range punch and a choppy idle; wider (112–116°) suits boost and smoother idle." },
      { question: "What is installed centreline?", answer: "Where the intake lobe peaks relative to TDC. Advancing the cam (smaller number) moves power lower in the rev range." },
    ],
  },
  {
    slug: "carburetor-cfm-calculator",
    title: "Carburetor CFM Calculator",
    description: "Find the right carburetor size in CFM from engine displacement, maximum RPM and volumetric efficiency.",
    metaTitle: "Carburetor CFM Calculator — Carb Size",
    metaDescription: "Free carburetor CFM calculator. Get the right carb size from cubic inches, max RPM and volumetric efficiency.",
    calcInputs: [numberField("cubicInches", "Engine Displacement (Cubic Inches)", { default: 350, max: 1000 }), numberField("maxRpm", "Maximum RPM", { default: 6000, max: 12000, step: 100 }), percentField("volumetricEfficiency", "Volumetric Efficiency", { default: 85, min: 50, max: 130 })],
    calcResult: { label: "Required CFM", format: "number" },
    calcResults: [num("requiredCfm", "Required CFM", true), num("nearestCommonSize", "Nearest Common Carb Size (CFM)"), num("cfmAt100Ve", "CFM at 100% VE")],
    instructions: "Enter displacement, the engine's maximum RPM and its volumetric efficiency (80% stock, 85% mild performance, 95%+ race).",
    examples: "Example: a 350 at 6,000 RPM and 85% VE needs about 516 CFM — a 600 CFM carb is the usual choice.",
    assumptions: "CFM = CID × RPM ÷ 3,456 × VE. Ratings are for 4-barrel carbs at 1.5 in Hg. Slightly small usually drives better than too big on the street. " + DISCLAIMER,
    faq: [
      { question: "What happens if a carb is too big?", answer: "Air speed drops, hurting throttle response and low-end torque — it can also bog off the line." },
      { question: "What VE should I use?", answer: "About 75–80% for stock engines, 85% for street performance and 95–110% for race engines with good heads and intake." },
    ],
  },
  {
    slug: "injector-size-calculator",
    title: "Injector Size Calculator",
    description: "Size your fuel injectors in lb/hr and cc/min from horsepower, BSFC, number of injectors and duty cycle — for gasoline or E85.",
    metaTitle: "Injector Size Calculator — lb/hr & cc/min",
    metaDescription: "Free fuel injector size calculator. Get injector size in lb/hr and cc/min from target horsepower, BSFC and duty cycle.",
    calcInputs: [numberField("horsepower", "Target Crank Horsepower", { default: 500, max: 5000, step: 10 }), dropdown("setup", "Setup", SETUP, 2), dropdown("fuel", "Fuel", FUEL, 1), numberField("injectors", "Number of Injectors", { default: 8, min: 1, max: 24 }), percentField("dutyCycle", "Max Duty Cycle", { default: 80, min: 50, max: 100 })],
    calcResult: { label: "Injector Size", format: "number" },
    calcResults: [num("injectorLbHr", "Injector Size (lb/hr)", true), num("injectorCcMin", "Injector Size (cc/min)"), num("totalFuelLbHr", "Total Fuel Flow (lb/hr)"), num("bsfcUsed", "BSFC Used")],
    instructions: "Enter your power target, the setup (which sets BSFC), fuel, number of injectors and the maximum duty cycle you'll allow.",
    examples: "Example: 500 hp turbocharged on gasoline with 8 injectors at 80% duty needs 46.9 lb/hr injectors — about 490 cc/min.",
    assumptions: "lb/hr = hp × BSFC ÷ (injectors × duty cycle); 1 lb/hr ≈ 10.5 cc/min at 43.5 psi. E85 needs about 40% more fuel. Fuel pressure changes flow — re-rate injectors if you run different pressure. " + DISCLAIMER,
    faq: [
      { question: "Why limit duty cycle to 80%?", answer: "Above about 85% the injector barely closes, flow becomes erratic and there's no headroom for hot days or more boost." },
      { question: "How much bigger for E85?", answer: "Roughly 30–40% larger than for gasoline at the same power." },
    ],
  },
  {
    slug: "fuel-pump-calculator",
    title: "Fuel Pump Calculator",
    description: "Find the fuel pump flow you need in LPH and GPH for your horsepower, setup and fuel, with a safety margin.",
    metaTitle: "Fuel Pump Calculator — LPH for Your Horsepower",
    metaDescription: "Free fuel pump size calculator. Get required fuel flow in LPH and GPH from horsepower, BSFC and fuel type.",
    calcInputs: [numberField("horsepower", "Target Crank Horsepower", { default: 500, max: 5000, step: 10 }), dropdown("setup", "Setup", SETUP, 2), dropdown("fuel", "Fuel", FUEL, 1), percentField("safetyMarginPercent", "Safety Margin", { default: 20, max: 100 })],
    calcResult: { label: "Required LPH", format: "number" },
    calcResults: [num("requiredLph", "Required Pump Flow (LPH)", true), num("requiredGph", "Required Pump Flow (GPH)"), num("fuelFlowLbHr", "Engine Fuel Flow (lb/hr)"), num("lbHrWithMargin", "Fuel Flow with Margin (lb/hr)")],
    instructions: "Enter your power target, setup, fuel and the margin you want above the engine's needs.",
    examples: "Example: 500 hp turbo on gasoline uses 300 lb/hr of fuel; with a 20% margin you need about 225 LPH (59 GPH) at your operating pressure.",
    assumptions: "Fuel flow = hp × BSFC; gasoline 6.07 lb/gal, E85 6.57 lb/gal. Pump ratings fall as pressure and boost rise and as voltage drops — check the flow chart at your real pressure. " + DISCLAIMER,
    faq: [
      { question: "Is a 255 LPH pump enough?", answer: "Typically good for about 500–550 hp on gasoline naturally aspirated or 450–500 hp boosted, depending on pressure and voltage." },
      { question: "Why does boost reduce pump flow?", answer: "With a rising-rate regulator the pump works against higher pressure under boost, which lowers its flow." },
    ],
  },
  {
    slug: "air-fuel-ratio-calculator",
    title: "Air Fuel Ratio Calculator",
    description: "Convert between air-fuel ratio and lambda for gasoline, E10, E85, ethanol, methanol and diesel — including gasoline-scale wideband readings.",
    metaTitle: "Air Fuel Ratio Calculator — AFR to Lambda",
    metaDescription: "Free air fuel ratio calculator. Convert AFR and lambda for gasoline, E85, methanol and more, and read gasoline-scale widebands.",
    calcInputs: [
      dropdown("fuel", "Fuel", [["Gasoline (14.7)", 1], ["E10 (14.1)", 2], ["E85 (9.77)", 3], ["Ethanol E100 (9.0)", 4], ["Methanol (6.4)", 5], ["Diesel (14.5)", 6]], 1),
      dropdown("inputMode", "I Have…", [["Lambda", 1], ["Gasoline-scale AFR (wideband)", 2], ["Actual AFR for this fuel", 3]], 1),
      numberField("value", "Value", { default: 0.85, min: 0.3, max: 30, step: 0.01 }),
    ],
    calcResult: { label: "Lambda", format: "number" },
    calcResults: [num("lambda", "Lambda (λ)", true, 3), num("actualAfr", "Actual AFR for This Fuel"), num("gasolineScaleAfr", "Gasoline-Scale AFR (Wideband Display)"), num("stoichiometricAfr", "Stoichiometric AFR"), pct("percentFromStoich", "Rich (−) or Lean (+) vs Stoich")],
    instructions: "Choose your fuel and what you're reading — lambda, a wideband showing gasoline AFR, or the true AFR for your fuel.",
    examples: "Example: λ 0.85 is 12.5:1 on gasoline — a typical full-power naturally aspirated target, 15% rich of stoichiometric.",
    assumptions: "AFR = λ × stoichiometric ratio. Many widebands display gasoline AFR whatever the fuel — on E85 a reading of 11.5 'gas AFR' is λ 0.78. Typical targets: cruise λ 1.0, NA power λ 0.85–0.88, boost λ 0.75–0.82. " + DISCLAIMER,
    faq: [
      { question: "What AFR should I tune for?", answer: "About 12.5–13:1 (λ 0.85–0.88) naturally aspirated at wide-open throttle on gasoline; 11.5–12:1 (λ 0.78–0.82) on boost." },
      { question: "Why use lambda?", answer: "It's the same for every fuel — λ 1.0 is always stoichiometric — so it avoids confusion with ethanol blends." },
    ],
  },
  {
    slug: "turbo-size-calculator",
    title: "Turbo Size Calculator",
    description: "Size a turbo compressor: pressure ratio, airflow in lb/min and CFM from displacement, RPM, VE, boost and intake temperature — and the horsepower it supports.",
    metaTitle: "Turbo Size Calculator — Pressure Ratio & lb/min",
    metaDescription: "Free turbo sizing calculator. Get compressor pressure ratio, airflow (lb/min, CFM) and supported horsepower.",
    calcInputs: [numberField("cubicInches", "Displacement (Cubic Inches)", { default: 122, max: 1000 }), numberField("rpm", "RPM at Peak Power", { default: 7000, max: 12000, step: 100 }), percentField("volumetricEfficiency", "Volumetric Efficiency", { default: 90, min: 50, max: 130 }), numberField("boostPsi", "Boost (psi)", { default: 18, max: 80, step: 0.5 }), numberField("intakeTempF", "Intake Air Temp After Intercooler (°F)", { default: 110, min: -20, max: 300 })],
    calcResult: { label: "Airflow", format: "number" },
    calcResults: [num("airflowLbMin", "Airflow (lb/min)", true), num("pressureRatio", "Pressure Ratio"), num("airflowCfm", "Airflow (CFM, Standard)"), num("horsepowerSupported", "Approx. Horsepower Supported")],
    instructions: "Enter displacement (2.0 L = 122 ci), the RPM of peak power, VE, target boost and the intake temperature after the intercooler. Plot the pressure ratio and lb/min on compressor maps.",
    examples: "Example: a 2.0 L at 7,000 RPM, 90% VE and 18 psi with 110 °F intake air needs a pressure ratio of 2.22 and about 34.5 lb/min — roughly 345 hp.",
    assumptions: "PR = (boost + 14.7) ÷ 14.7 at sea level; mass flow = CID × RPM ÷ 3,456 × VE × PR × density ratio × 0.0765 lb/ft³. About 10 hp per lb/min. Pressure drop across the intercooler and filter adds to the real PR. " + DISCLAIMER,
    faq: [
      { question: "How do I read a compressor map?", answer: "Plot pressure ratio (vertical) against airflow (horizontal) — the point should sit in the efficient centre islands, right of the surge line." },
      { question: "Why does altitude matter?", answer: "Thinner air means a higher pressure ratio for the same boost, pushing the turbo harder." },
    ],
  },
  {
    slug: "boost-to-horsepower-calculator",
    title: "Boost To Horsepower Calculator",
    description: "Estimate how much horsepower boost will add to an engine, the boost needed for a power target, and the absolute pressure and pressure ratio (also a boost calculator).",
    metaTitle: "Boost to Horsepower Calculator — PSI to HP",
    metaDescription: "Free boost to horsepower calculator. Estimate HP from boost psi, find the boost for a target and get the pressure ratio.",
    calcInputs: [numberField("naHorsepower", "Naturally Aspirated Horsepower", { default: 300, max: 3000, step: 5 }), numberField("boostPsi", "Boost (psi)", { default: 8, max: 80, step: 0.5 }), percentField("efficiencyPercent", "Efficiency (Heat & Losses)", { default: 85, min: 40, max: 100 }), numberField("targetHorsepower", "Target Horsepower", { default: 450, max: 5000, step: 5 })],
    calcResult: { label: "Estimated Horsepower", format: "number" },
    calcResults: [num("estimatedHorsepower", "Estimated Horsepower", true), num("horsepowerGain", "Horsepower Gain"), num("pressureRatio", "Pressure Ratio"), num("absolutePressurePsi", "Absolute Manifold Pressure (psia)"), num("boostForTargetPsi", "Boost Needed for Target (psi)")],
    instructions: "Enter the engine's naturally aspirated power, the boost and an efficiency factor (about 85–90% with a good intercooler, 70–80% without).",
    examples: "Example: a 300 hp engine at 8 psi with 85% efficiency makes about 439 hp. Reaching 450 hp needs about 8.7 psi.",
    assumptions: "HP ≈ NA HP × (1 + (pressure ratio − 1) × efficiency), sea-level atmosphere 14.7 psi. Real gains depend on tuning, compression, fuel and intercooling. " + DISCLAIMER,
    faq: [
      { question: "How much HP per psi of boost?", answer: "A rough rule is 6–7% of the engine's naturally aspirated power per psi with good intercooling." },
      { question: "What is a pressure ratio?", answer: "Absolute pressure after the compressor divided by the pressure before it — 14.7 psi of boost at sea level is a ratio of 2." },
    ],
  },
  {
    slug: "supercharger-pulley-calculator",
    title: "Supercharger Pulley Calculator",
    description: "See how a smaller (or larger) supercharger pulley changes blower speed and boost — positive-displacement (roots/twin-screw) or centrifugal.",
    metaTitle: "Supercharger Pulley Calculator — Boost & Blower RPM",
    metaDescription: "Free supercharger pulley calculator. Get new boost, blower RPM and drive ratio when changing pulley sizes.",
    calcInputs: [
      dropdown("type", "Supercharger Type", [["Positive displacement (roots / twin-screw)", 1], ["Centrifugal", 2]], 1),
      numberField("crankPulley", "Crank Pulley Diameter (in)", { default: 7, max: 20, step: 0.01 }),
      numberField("currentPulley", "Current Blower Pulley (in)", { default: 3.4, max: 20, step: 0.01 }),
      numberField("newPulley", "New Blower Pulley (in)", { default: 3.1, max: 20, step: 0.01 }),
      numberField("currentBoost", "Current Boost (psi)", { default: 10, max: 60, step: 0.5 }),
      numberField("engineRpm", "Engine RPM", { default: 6500, max: 12000, step: 100 }),
      numberField("internalStepUp", "Internal Step-Up (Centrifugal, e.g. 3.6; 1 = None)", { default: 1, min: 1, max: 6, step: 0.01 }),
    ],
    calcResult: { label: "New Boost", format: "number" },
    calcResults: [num("newBoostPsi", "Estimated New Boost (psi)", true), num("blowerRpm", "Blower RPM at Engine RPM"), num("blowerRpmBefore", "Blower RPM Before"), num("driveRatio", "Drive Ratio"), pct("speedIncreasePercent", "Blower Speed Change")],
    instructions: "Choose the blower type and enter the pulley sizes, current boost and engine RPM. Check the blower's maximum safe RPM.",
    examples: "Example: going from a 3.4 in to a 3.1 in pulley with a 7 in crank pulley on a roots blower spins it 9.7% faster — about 14,700 RPM at 6,500 — taking 10 psi to about 12.4 psi.",
    assumptions: "Positive-displacement boost (absolute) scales with blower speed; centrifugal boost scales roughly with speed squared. Real gains are lower if belts slip or the blower runs out of efficiency. " + DISCLAIMER,
    faq: [
      { question: "How much boost per pulley size?", answer: "On many roots/twin-screw kits, each 0.1 in smaller pulley adds roughly 0.5–1 psi." },
      { question: "Is there a limit to pulley changes?", answer: "Yes — blower max RPM, belt grip (wrap angle) and intake temperature limit how small you can go." },
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
