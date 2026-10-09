// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the running sub-batch C (Running Physiology & Conditions). See
// src/lib/calc-engine-running-pace.ts for the full list
// of 4 sub-batches (35 tools under Sports Calculators > Running
// Calculators), and src/lib/calc-engine-running-conditions.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-running-conditions-calculators.ts
// or
//   npm run db:create-running-conditions-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Running Calculators", slug: "running-calculators" };

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
  "Estimates for training planning only, not medical advice. Heat, humidity, altitude and cold can be dangerous — slow down, drink, and stop if you feel dizzy, confused or unwell. Check with a doctor before hard training if you have a health condition.";

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

const PACE_UNIT: [string, number][] = [["per km", 1], ["per mile", 2]];
const msFields = (key: string, label: string, m: number, s: number) => [
  numberField(`${key}Min`, `${label} — Minutes`, { default: m, max: 60 }),
  numberField(`${key}Sec`, `${label} — Seconds`, { default: s, max: 59 }),
];
const msOut = (key: string, label: string, highlight = false) => [num(`${key}Min`, `${label} — Minutes`, highlight), num(`${key}Sec`, `${label} — Seconds`)];
const paceFields = (m: number, s: number) => [dropdown("paceUnit", "Pace Unit", PACE_UNIT, 1), ...msFields("pace", "Pace", m, s)];
const TEMP_UNIT: [string, number][] = [["°C", 1], ["°F", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "aerobic-threshold-calculator",
    title: "Aerobic Threshold Calculator",
    description: "Find your aerobic threshold heart rate — the top of easy, zone 2 running — with the MAF 180 formula, % of max heart rate and your lactate threshold.",
    metaTitle: "Aerobic Threshold Calculator — MAF & Zone 2 HR",
    metaDescription: "Free aerobic threshold calculator. Get your MAF heart rate (180 − age), zone 2 range from max HR, and AeT from lactate threshold.",
    calcInputs: [
      numberField("age", "Age", { default: 35, min: 10, max: 100 }),
      dropdown("trainingStatus", "Training Status (MAF Adjustment)", [["Recovering from illness / on medication (−10)", 1], ["Injured, inconsistent or new (−5)", 2], ["Training consistently (0)", 3], ["2+ years of steady progress (+5)", 4]], 3),
      numberField("maxHr", "Max Heart Rate (0 = Estimate)", { default: 0, max: 230, required: false }),
      numberField("lthr", "Lactate Threshold HR (Optional)", { default: 165, max: 220, required: false }),
    ],
    calcResult: { label: "MAF Heart Rate", format: "number" },
    calcResults: [num("mafHeartRate", "MAF Heart Rate (Top of Aerobic Zone)", true), num("mafRangeLow", "MAF Range Low"), num("fromMaxHrLow", "70% of Max HR"), num("fromMaxHrHigh", "75% of Max HR"), num("fromLthr", "≈90% of Lactate Threshold HR")],
    instructions: "Enter your age and training status. Add your measured max HR and lactate threshold HR (from the Lactate Threshold Calculator) for extra estimates.",
    examples: "Example: a 35-year-old training consistently has a MAF heart rate of 145 bpm (aerobic range 135–145). With a lactate threshold of 165, the aerobic threshold is about 149.",
    assumptions: "MAF (Phil Maffetone): 180 − age, adjusted for training status. Aerobic threshold ≈ 70–75% of max HR (Tanaka 208 − 0.7 × age if not entered) or ≈ 90% of LTHR. A lab or DFA-alpha1 test is more precise. " + DISCLAIMER,
    faq: [
      { question: "What is the aerobic threshold?", answer: "The first rise in blood lactate — the top of truly easy running. Below it you can run for hours; most training should happen there." },
      { question: "Is aerobic threshold the same as zone 2?", answer: "Roughly — in many 5-zone systems, the aerobic threshold marks the top of zone 2." },
    ],
  },
  {
    slug: "running-cadence-calculator",
    title: "Running Cadence Calculator",
    description: "Work out your running cadence (steps per minute) from a step count, your stride length at your pace, and a +5–10% cadence target.",
    metaTitle: "Running Cadence Calculator — Steps per Minute",
    metaDescription: "Free running cadence calculator. Get steps per minute, stride length and a safe cadence target from a quick step count.",
    calcInputs: [numberField("steps", "Steps Counted", { default: 42, max: 500 }), numberField("countSeconds", "Over How Many Seconds", { default: 15, min: 5, max: 120 }), ...paceFields(5, 30)],
    calcResult: { label: "Cadence", format: "number" },
    calcResults: [num("cadenceSpm", "Cadence (Steps per Minute)", true), num("strideLengthMeters", "Stride Length (m)"), num("targetCadenceLow", "Target Cadence (+5%)"), num("targetCadenceHigh", "Target Cadence (+10%)"), num("stepsPerKm", "Steps per km")],
    instructions: "Count every foot strike for 15 or 30 seconds at your normal pace, and enter that pace.",
    examples: "Example: 42 steps in 15 seconds is a cadence of 168 spm. At 5:30 per km that's a 1.08 m stride; a gradual +5–10% target is 176–185 spm.",
    assumptions: "Stride length = speed ÷ cadence. Raising cadence 5–10% can reduce impact on the knees and hips (Heiderscheit et al. 2011); there's no single ideal number. " + DISCLAIMER,
    faq: [
      { question: "Is 180 steps per minute the ideal cadence?", answer: "No — 180 came from observing elite racers. Your best cadence depends on height, speed and running style." },
      { question: "How do I increase cadence?", answer: "Use a metronome app 5% above your current cadence on easy runs and take shorter, quicker steps." },
    ],
  },
  {
    slug: "running-power-calculator",
    title: "Running Power Calculator",
    description: "Estimate running power in watts from your pace, bodyweight, hill grade and headwind — the effort number used by running power meters.",
    metaTitle: "Running Power Calculator — Watts from Pace",
    metaDescription: "Free running power calculator. Estimate watts and W/kg from pace, weight, grade and wind, including air resistance.",
    calcInputs: [
      dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1),
      numberField("weight", "Bodyweight", { default: 70, max: 300, step: 0.1 }),
      ...paceFields(5, 0),
      percentField("gradePercent", "Hill Grade", { default: 0, min: -20, max: 30, step: 0.5 }),
      numberField("headwindKmh", "Headwind (km/h, Negative = Tailwind)", { default: 0, min: -60, max: 60, required: false }),
    ],
    calcResult: { label: "Power", format: "number" },
    calcResults: [num("powerWatts", "Running Power (W)", true), num("powerPerKg", "Power per kg (W/kg)"), num("airResistanceWatts", "Air Resistance (W)"), num("climbingWatts", "Climbing (W)")],
    instructions: "Enter bodyweight, pace, grade and any headwind.",
    examples: "Example: a 70 kg runner at 5:00 per km on the flat with no wind produces about 248 W (3.54 W/kg), of which about 5 W is air resistance.",
    assumptions: "Power ≈ 1.04 J/kg/m × weight × speed (metabolic-style running power), plus climbing work and air drag (CdA 0.24 m², air 1.2 kg/m³). Devices like Stryd use their own models, so numbers differ between brands. " + DISCLAIMER,
    faq: [
      { question: "Why use running power?", answer: "It reacts instantly to hills and wind, unlike heart rate, and stays consistent unlike pace on varied terrain." },
      { question: "What is a good running power?", answer: "Power per kg matters most: about 3–4 W/kg is typical for recreational runners at easy-to-moderate effort; elites race above 6 W/kg." },
    ],
  },
  {
    slug: "running-economy-calculator",
    title: "Running Economy Calculator",
    description: "Calculate running economy — the oxygen cost per kilometre — from a VO2 measurement at a set pace, with energy cost and a rating.",
    metaTitle: "Running Economy Calculator — Oxygen Cost per km",
    metaDescription: "Free running economy calculator. Turn VO2 at a set pace into oxygen cost per km, energy cost and a rating.",
    calcInputs: [numberField("vo2", "VO2 at That Pace (ml/kg/min)", { default: 42, max: 90, step: 0.1 }), ...paceFields(5, 0)],
    calcResult: { label: "Oxygen Cost", format: "number" },
    calcResults: [num("oxygenCostPerKm", "Oxygen Cost (ml O₂/kg/km)", true), num("energyCostKcalPerKgKm", "Energy Cost (kcal/kg/km)"), num("rating", "Rating (1 Elite, 2 Good, 3 Average, 4 Below Average)")],
    instructions: "Enter the steady-state VO2 measured at a submaximal pace (from a lab test or metabolic cart) and that pace.",
    examples: "Example: 42 ml/kg/min at 5:00 per km is an oxygen cost of 210 ml/kg/km (about 1.05 kcal/kg/km) — average economy.",
    assumptions: "Oxygen cost = VO2 ÷ speed (km/min); 1 litre of O₂ ≈ 5 kcal. Rough ratings: elite under 190, good 190–209, average 210–229 ml/kg/km. Measure below lactate threshold for a valid value. " + DISCLAIMER,
    faq: [
      { question: "What is running economy?", answer: "How much oxygen you use at a given pace — like fuel efficiency. Better economy means a faster pace for the same effort." },
      { question: "How can I improve running economy?", answer: "Consistent mileage, strides and hill sprints, strength and plyometric training, and lighter, responsive shoes all help." },
    ],
  },
  {
    slug: "gap-calculator",
    title: "GAP Calculator (Grade Adjusted Pace)",
    description: "Calculate grade adjusted pace (GAP) — the flat-ground equivalent of your pace on a hill — and the hill pace that matches a flat target effort, with road or trail surface.",
    metaTitle: "GAP Calculator — Grade Adjusted Pace & Trail Pace",
    metaDescription: "Free grade adjusted pace calculator. Convert hill pace to flat-equivalent pace and plan uphill and trail running pace.",
    calcInputs: [
      percentField("gradePercent", "Grade (Negative = Downhill)", { default: 6, min: -40, max: 40, step: 0.5 }),
      ...paceFields(6, 0),
      dropdown("surface", "Surface", [["Road / track", 1], ["Smooth trail", 2], ["Technical trail", 3], ["Very technical / sand / snow", 4]], 1),
      ...msFields("flatTarget", "Flat Target Pace (for Hill Equivalent)", 5, 0),
    ],
    calcResult: { label: "Grade Adjusted Pace", format: "number" },
    calcResults: [...msOut("gradeAdjustedPace", "Grade Adjusted (Flat-Equivalent) Pace", true), num("effortMultiplier", "Effort vs Flat Road"), ...msOut("equivalentHillPace", "Hill/Trail Pace for Your Flat Target")],
    instructions: "Enter the grade and your pace on it, the surface, and optionally a flat target pace to see what that effort looks like on this hill.",
    examples: "Example: 6:00 per km up a 6% road grade takes 1.37× the effort of flat running — a grade adjusted pace of 4:23. Holding the effort of a 5:00 flat pace on that hill means about 6:51 per km.",
    assumptions: "Minetti et al. (2002) energy cost of running on gradients (valid about −45% to +45%). Surface factors: smooth trail +5%, technical +12%, very technical +20%. Also covers the trail running pace calculator. " + DISCLAIMER,
    faq: [
      { question: "What is grade adjusted pace?", answer: "Your pace converted to what it would be on flat ground for the same effort — Strava and many watches show it." },
      { question: "Is downhill running always faster?", answer: "Up to about −10% the effort drops; steeper downhills cost more energy again because you brake." },
    ],
  },
  {
    slug: "running-at-altitude-calculator",
    title: "Running at Altitude Calculator",
    description: "Estimate how altitude affects your running — the drop in VO2 max, the slowdown in pace and how long to acclimatize.",
    metaTitle: "Running at Altitude Calculator — Pace Adjustment",
    metaDescription: "Free running at altitude calculator. Estimate VO2 max loss, pace slowdown and acclimatization time at elevation.",
    calcInputs: [dropdown("altitudeUnit", "Altitude Unit", [["metres", 1], ["feet", 2]], 1), numberField("altitude", "Altitude", { default: 1600, max: 6000, step: 10 }), ...msFields("pace", "Sea-Level Pace (per km or mile)", 5, 0)],
    calcResult: { label: "Pace Slowdown", format: "percentage" },
    calcResults: [pct("paceSlowdownPercent", "Pace Slowdown", true), pct("vo2MaxLossPercent", "VO2 Max Loss"), ...msOut("altitudePace", "Equivalent Pace at Altitude"), num("acclimatizationDays", "Days to Acclimatize (Approx.)")],
    instructions: "Enter the altitude and your sea-level pace for the same effort.",
    examples: "Example: at 1,600 m (Denver), VO2 max drops about 8.2% and endurance pace slows about 5.7% — a 5:00 per km effort becomes about 5:17.",
    assumptions: "VO2 max falls about 6.3% per 1,000 m above ~300 m (Wehrlin & Hallén 2006); pace is assumed to slow by about 70% of that. Acclimatization: about 2 weeks below 2,500 m, 3 weeks above. Individual responses vary widely. " + DISCLAIMER,
    faq: [
      { question: "How much slower will I run at altitude?", answer: "Roughly 1–2% per 300 m (1,000 ft) above about 1,000 m for distance races; sprints are hardly affected." },
      { question: "Does altitude training make you faster?", answer: "It can raise red blood cell mass after 3–4 weeks, but benefits vary and training quality often drops at altitude." },
    ],
  },
  {
    slug: "wind-effect-on-running-calculator",
    title: "Wind Effect on Running Calculator",
    description: "Find how much a headwind slows you — and how little a tailwind helps — at the same effort, using the physics of air resistance.",
    metaTitle: "Wind Effect on Running Calculator — Headwind Pace",
    metaDescription: "Free wind effect calculator for runners. See how headwind, tailwind or crosswind changes your pace at the same effort.",
    calcInputs: [...paceFields(5, 0), dropdown("windUnit", "Wind Unit", [["km/h", 1], ["mph", 2]], 1), numberField("windSpeed", "Wind Speed", { default: 15, max: 80 }), dropdown("direction", "Wind Direction", [["Headwind", 1], ["Tailwind", 2], ["Crosswind", 3]], 1)],
    calcResult: { label: "Pace in the Wind", format: "number" },
    calcResults: [...msOut("windPace", "Pace in the Wind (Same Effort)", true), num("secondsPerUnitChange", "Change per km/mile (s)"), pct("percentChange", "Pace Change")],
    instructions: "Enter your still-air pace, the wind speed and its direction.",
    examples: "Example: at 5:00 per km, a 15 km/h headwind slows you to about 5:24 per km (+8%) for the same effort, while the same tailwind only speeds you up to about 4:53 (−2%).",
    assumptions: "Same total power in still air and in wind: 1.04 J/kg/m running cost (70 kg) plus air drag 0.5 × 1.2 × 0.24 × (speed + wind)² × speed. Crosswind counted as a quarter headwind. Running behind others cuts the headwind effect a lot. " + DISCLAIMER,
    faq: [
      { question: "Why doesn't a tailwind help as much as a headwind hurts?", answer: "Drag grows with the square of air speed against you, and you spend more time running into a headwind on an out-and-back course." },
      { question: "How can I cope with headwind?", answer: "Run by effort, not pace — and tuck in behind other runners when you can." },
    ],
  },
  {
    slug: "dew-point-running-calculator",
    title: "Dew Point Running Calculator",
    description: "Adjust your running pace for heat and humidity with the temperature + dew point rule — enter the dew point or humidity.",
    metaTitle: "Dew Point Running Calculator — Heat Pace Adjustment",
    metaDescription: "Free dew point running calculator. Add temperature and dew point to get your pace adjustment for heat and humidity.",
    calcInputs: [
      dropdown("tempUnit", "Temperature Unit", TEMP_UNIT, 2),
      numberField("temperature", "Air Temperature", { default: 80, min: -30, max: 130 }),
      dropdown("inputType", "I Know the…", [["Dew point", 1], ["Relative humidity", 2]], 1),
      numberField("dewPoint", "Dew Point", { default: 65, min: -40, max: 100, required: false }),
      percentField("humidity", "Relative Humidity", { default: 60, min: 1, max: 100 }),
      ...msFields("pace", "Normal Pace (per km or mile)", 8, 0),
    ],
    calcResult: { label: "Pace Adjustment", format: "percentage" },
    calcResults: [pct("paceAdjustmentPercent", "Pace Adjustment", true), num("temperaturePlusDewPoint", "Temperature + Dew Point (°F)"), ...msOut("adjustedPace", "Adjusted Pace"), num("dewPoint", "Dew Point"), num("hardRunningNotAdvised", "Hard Running Not Advised (1 = Yes)")],
    instructions: "Enter the temperature and either the dew point or the relative humidity, plus your normal pace for the run.",
    examples: "Example: 80 °F with a 65 °F dew point adds up to 145 — slow down about 4.5%, so an 8:00 per mile run becomes about 8:22.",
    assumptions: "The runners' temperature + dew point (°F) chart: 100 or less no change; 101–110 0–0.5%; 111–120 0.5–1%; 121–130 1–2%; 131–140 2–3%; 141–150 3–4.5%; 151–160 4.5–6%; 161–170 6–8%; 171–180 8–10%; above 180 hard running isn't recommended. Dew point from humidity by the Magnus formula. " + DISCLAIMER,
    faq: [
      { question: "Why use dew point instead of humidity?", answer: "Dew point measures the actual moisture in the air; relative humidity changes with temperature, so a 'humid' cool morning can be easy running." },
      { question: "What dew point is uncomfortable for running?", answer: "Above about 60 °F (15 °C) most runners feel it; above 70 °F (21 °C) is oppressive." },
    ],
  },
  {
    slug: "what-to-wear-running-calculator",
    title: "What to Wear Running Calculator",
    description: "Decide what to wear for a run from the temperature, wind and how hard you'll run — feels-like temperature, the temperature to dress for and a clothing checklist.",
    metaTitle: "What to Wear Running Calculator — Dress for the Weather",
    metaDescription: "Free what to wear running calculator. Get the feels-like temperature, the temperature to dress for and what clothes to wear.",
    calcInputs: [
      dropdown("tempUnit", "Temperature Unit", TEMP_UNIT, 2),
      numberField("temperature", "Temperature", { default: 45, min: -40, max: 120 }),
      dropdown("windUnit", "Wind Unit", [["km/h", 1], ["mph", 2]], 2),
      numberField("windSpeed", "Wind Speed", { default: 5, max: 80 }),
      dropdown("effort", "Run Type", [["Easy / long run", 1], ["Steady / workout", 2], ["Race", 3]], 2),
    ],
    calcResult: { label: "Dress For", format: "number" },
    calcResults: [num("dressFor", "Dress for This Temperature", true), num("feelsLike", "Feels Like (Wind Chill)"), num("layersOnTop", "Layers on Top"), num("longSleeves", "Long Sleeves (1 = Yes)"), num("tightsOrPants", "Tights or Pants (1 = Yes)"), num("glovesAndHat", "Gloves and Hat (1 = Yes)"), num("windJacket", "Wind/Rain Jacket (1 = Yes)")],
    instructions: "Enter the temperature, wind speed and what kind of run it is.",
    examples: "Example: at 45 °F with a 5 mph wind it feels like 42 °F; for a steady run, dress as if it's 57 °F — a long-sleeve top and shorts, no gloves.",
    assumptions: "NWS wind chill (at or below 50 °F with wind over 3 mph). Dress as if it's 10 °F (easy), 15 °F (steady) or 20 °F (race) warmer than it feels. Clothing cut-offs: long sleeves below 60 °F, tights below 45 °F, gloves and hat below 45 °F, jacket below 35 °F or in wind over 15 mph. Rain and sun change the picture — adjust for them. " + DISCLAIMER,
    faq: [
      { question: "What is the 20-degree rule for running?", answer: "Dress as if it's about 20 °F (11 °C) warmer than it is, because running heats you up — less for easy runs, more for races." },
      { question: "Should I start a run feeling cold?", answer: "Yes — feeling slightly chilly for the first mile usually means you're dressed right." },
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
