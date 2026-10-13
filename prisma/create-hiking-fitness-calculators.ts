// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the hiking sub-batch B (Calories, Rucking & Fitness). See
// src/lib/calc-engine-hiking-steps.ts for the full list
// of 3 sub-batches (29 tools under Sports Calculators > Hiking
// Calculators), and src/lib/calc-engine-hiking-fitness.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-hiking-fitness-calculators.ts
// or
//   npm run db:create-hiking-fitness-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Hiking Calculators", slug: "hiking-calculators" };

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
  "Estimates for planning only. Calorie, fitness and walk-test figures are general guidance, not medical advice — check with a doctor before starting a new exercise programme or a clinical test. Trail times, water and food needs vary with weather, terrain and fitness, so always plan a margin.";

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

const WEIGHT = (def = 70) => [numberField("weight", "Body Weight", { default: def, max: 300, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1)];
const SPEED = (def = 3) => [numberField("speed", "Walking Speed", { default: def, min: 0.5, max: 8, step: 0.1 }), dropdown("speedUnit", "Speed Unit", [["mph", 1], ["km/h", 2]], 1)];
const TERRAIN_OPTS: [string, number][] = [["Paved / treadmill", 1], ["Dirt road", 2], ["Trail / light brush", 3], ["Heavy brush", 4], ["Swampy / bog", 5], ["Loose sand / snow", 6]];

const TOOLS: ToolDef[] = [
  {
    slug: "walking-calorie-calculator",
    title: "Walking Calorie Calculator",
    description: "Calculate calories burned walking from your speed and weight — by time or distance, with gross and net calories.",
    metaTitle: "Walking Calorie Calculator — Calories Burned Walking",
    metaDescription: "Free calorie burn calculator for walking. See calories burned by speed, weight and time or distance, per mile and per km.",
    calcInputs: [dropdown("method", "Walk Length By", [["Time", 1], ["Distance", 2]], 1), ...SPEED(), ...WEIGHT(), numberField("minutes", "Minutes", { default: 60, max: 600 }), numberField("distance", "Distance (miles if mph, km if km/h)", { default: 3, max: 100, step: 0.1 })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("netCalories", "Net Calories (above resting)"), num("caloriesPerMile", "Calories per Mile"), num("caloriesPerKm", "Calories per km"), num("minutes", "Walking Time (min)"), num("met", "MET Value")],
    instructions: "Enter your walking speed and weight, then either how long you walked or how far.",
    examples: "Example: a 70 kg person walking at 3 mph for an hour burns about 245 kcal (175 above resting) — about 82 per mile.",
    assumptions: "Calories = MET × weight (kg) × hours, using 2011 Compendium walking METs interpolated by speed (2 mph 2.8, 3 mph 3.5, 3.5 mph 4.3, 4 mph 5.0, 4.5 mph 7.0). Net calories subtract 1 MET (what you'd burn sitting). For hills use the incline or hiking calculators. " + DISCLAIMER,
    faq: [
      { question: "How many calories does walking a mile burn?", answer: "Roughly 80–100 kcal for a 70–80 kg adult, more if you're heavier." },
      { question: "Is walking faster better than walking longer?", answer: "Per mile they're similar at normal speeds; above about 4.5 mph walking gets much less efficient and burns more." },
    ],
  },
  {
    slug: "walking-weight-loss-calculator",
    title: "Walking Weight Loss Calculator",
    description: "See how long it takes to reach your weight-loss goal by walking — calories per walk, weekly loss and weeks to goal, with or without a diet deficit.",
    metaTitle: "Walking Weight Loss Calculator — Weeks to Goal",
    metaDescription: "Free walking weight loss calculator. Estimate weekly weight loss and weeks to your goal from daily walks plus your diet deficit.",
    calcInputs: [...WEIGHT(85), numberField("goalLoss", "Weight to Lose (same unit)", { default: 5, max: 150, step: 0.5 }), ...SPEED(3.5), numberField("minutesPerDay", "Walking Minutes per Day", { default: 45, max: 300 }), numberField("daysPerWeek", "Walking Days per Week", { default: 5, max: 7 }), numberField("dietDeficit", "Daily Diet Deficit (kcal, optional)", { default: 250, max: 1500, required: false })],
    calcResult: { label: "Weeks to Goal", format: "number" },
    calcResults: [num("weeksToGoal", "Weeks to Reach Goal", true), num("caloriesPerWalk", "Net Calories per Walk"), num("weeklyDeficit", "Weekly Calorie Deficit"), num("lossPerWeek", "Loss per Week (your unit)"), num("lossPerMonth", "Loss per Month (your unit)")],
    instructions: "Enter your weight and how much you want to lose, your usual walking speed, how long and how often you walk, and any daily calorie cut from your diet.",
    examples: "Example: 85 kg, walking 45 minutes at 3.5 mph five days a week (210 net kcal each) plus a 250 kcal daily diet deficit → about 2,800 kcal a week, 0.36 kg a week, so 5 kg takes about 14 weeks.",
    assumptions: "Net walking calories = (MET − 1) × weight × hours. About 7,700 kcal ≈ 1 kg (3,500 kcal ≈ 1 lb) of body fat. Real loss slows as you get lighter and the body adapts, so treat this as a best case. " + DISCLAIMER,
    faq: [
      { question: "Can you lose weight just by walking?", answer: "Yes, but slowly — combining walking with a modest diet change is much faster and easier to sustain." },
      { question: "How much should I walk to lose weight?", answer: "Around 150–300 minutes a week is a common target for weight loss and keeping it off." },
    ],
  },
  {
    slug: "incline-walking-calories-calculator",
    title: "Incline Walking Calories Calculator",
    description: "Calculate calories burned walking uphill or on a treadmill incline — and how many more than walking on the flat (great for 12-3-30).",
    metaTitle: "Incline Walking Calories Calculator — Treadmill",
    metaDescription: "Free incline walking calories calculator. Get calories for treadmill incline walks (e.g. 12-3-30) with the ACSM equation.",
    calcInputs: [...SPEED(), percentField("incline", "Incline / Grade", { default: 12, max: 40, step: 0.5 }), ...WEIGHT(), numberField("minutes", "Minutes", { default: 30, max: 300 })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerMinute", "Calories per Minute"), num("flatCalories", "Same Walk on the Flat (kcal)"), num("extraFromIncline", "Extra from the Incline (kcal)"), num("vo2", "Oxygen Cost (ml/kg/min)"), num("mets", "METs")],
    instructions: "Enter treadmill speed and incline, your weight and the minutes walked.",
    examples: "Example: the 12-3-30 workout (12% incline, 3 mph, 30 minutes) for a 70 kg person burns about 304 kcal — 182 more than the same walk on the flat.",
    assumptions: "ACSM walking equation: VO2 = 3.5 + 0.1 × speed (m/min) + 1.8 × speed × grade; calories ≈ 5 kcal per litre of O2. Holding the handrails can cut the real burn by 20% or more. Valid for walking speeds (about 1.9–3.7 mph). " + DISCLAIMER,
    faq: [
      { question: "Does incline walking burn more than running?", answer: "A steep incline walk can match an easy jog for calories with much less impact." },
      { question: "What is 12-3-30?", answer: "A treadmill workout: 12% incline, 3 mph, for 30 minutes." },
    ],
  },
  {
    slug: "rucking-calorie-calculator",
    title: "Rucking Calorie Calculator",
    description: "Calculate calories burned rucking or walking with a weighted vest — by body weight, load, speed, grade and terrain (also a weighted vest walking calorie calculator).",
    metaTitle: "Rucking Calorie Calculator — Pack & Weighted Vest",
    metaDescription: "Free rucking calorie calculator. Calories for rucking or weighted vest walking using the Pandolf equation for load, speed, grade and terrain.",
    calcInputs: [dropdown("loadType", "Carrying", [["Rucksack / backpack", 1], ["Weighted vest", 2]], 1), numberField("weight", "Body Weight", { default: 80, max: 300, step: 0.5 }), numberField("load", "Load Weight (same unit)", { default: 20, max: 100, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), ...SPEED(), percentField("grade", "Uphill Grade", { default: 0, max: 30, step: 0.5 }), dropdown("terrain", "Terrain", TERRAIN_OPTS, 1), numberField("minutes", "Minutes", { default: 60, max: 600 })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("withoutLoadCalories", "Same Walk without the Load"), num("extraFromLoad", "Extra from the Load"), pct("loadPctBodyWeight", "Load as % of Body Weight")],
    instructions: "Enter your body weight and the weight you carry (pack or vest), your speed, the uphill grade, terrain and time.",
    examples: "Example: an 80 kg person rucking 20 kg (44 lb) at 3 mph on pavement for an hour burns about 346 kcal — 57 more than without the pack.",
    assumptions: "Pandolf et al. (1977): M (W) = 1.5W + 2(W + L)(L/W)² + η(W + L)(1.5V² + 0.35VG), with terrain η from 1.0 (paved) to 2.1 (loose sand); 1 W ≈ 0.86 kcal/h. A vest and a pack of equal weight cost about the same energy. Pandolf underestimates at slow speeds and on descents. Build load gradually — start around 10% of body weight. " + DISCLAIMER,
    faq: [
      { question: "How many more calories does rucking burn than walking?", answer: "Usually 15–40% more, depending on the load and terrain." },
      { question: "Is a weighted vest or a ruck better?", answer: "Calorie burn is similar. Vests spread the load more evenly; rucks carry heavier loads comfortably." },
    ],
  },
  {
    slug: "ruck-pace-calculator",
    title: "Ruck Pace Calculator",
    description: "Calculate your ruck march pace per mile and per km, and how you compare with the 12-mile-in-3-hours military standard.",
    metaTitle: "Ruck Pace Calculator — Ruck March Time & Pace",
    metaDescription: "Free ruck pace calculator. Get pace per mile/km and speed for a ruck march, and minutes ahead of the 15:00/mile standard.",
    calcInputs: [numberField("distance", "Distance", { default: 12, max: 100, step: 0.1 }), dropdown("distanceUnit", "Unit", [["miles", 1], ["km", 2]], 1), numberField("hours", "Time — Hours", { default: 2, max: 48 }), numberField("minutes", "Time — Minutes", { default: 50, max: 59 })],
    calcResult: { label: "Pace per Mile", format: "number" },
    calcResults: [num("paceMinPerMile", "Pace (min per mile)", true), num("paceMinPerKm", "Pace (min per km)"), num("speedMph", "Speed (mph)"), num("standardMinutes", "Time Allowed at 15:00/mile (min)"), num("minutesUnderStandard", "Minutes Ahead of Standard (− = behind)")],
    instructions: "Enter the ruck distance and your finish time (or target time).",
    examples: "Example: 12 miles in 2 h 50 min = 14:10 per mile (8:48 per km), 4.24 mph — 10 minutes inside the 3-hour standard.",
    assumptions: "Pace = time ÷ distance (decimals are minutes, so 14.17 = 14 min 10 s). Standard: 15:00 per mile, as in the US Army 12-mile foot march for the Expert Infantryman / Soldier Badge (3 hours, about 35 lb plus water and weapon). Check your unit's current requirements. " + DISCLAIMER,
    faq: [
      { question: "What is a good ruck pace?", answer: "15:00 per mile is the common military standard; 13–14 minutes per mile is strong with 35+ lb." },
      { question: "Should I run during a ruck?", answer: "Many people shuffle on downhills and flats to bank time, but it raises injury risk — build up gradually." },
    ],
  },
  {
    slug: "hiking-calorie-calculator",
    title: "Hike Calorie Calculator",
    description: "Calculate calories burned on a hike from distance, elevation gain, time, pack weight and terrain.",
    metaTitle: "Hiking Calorie Calculator — Calories Burned Hiking",
    metaDescription: "Free hike calorie calculator. Estimate calories burned hiking from distance, elevation gain, time, body and pack weight.",
    calcInputs: [numberField("weight", "Body Weight", { default: 75, max: 300, step: 0.5 }), numberField("packWeight", "Pack Weight (same unit)", { default: 10, max: 60, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("distance", "Distance", { default: 8, max: 100, step: 0.1 }), numberField("elevationGain", "Elevation Gain (ft if miles, m if km)", { default: 2000, max: 30000 }), dropdown("distanceUnit", "Units", [["miles & feet", 1], ["km & metres", 2]], 1), numberField("hours", "Hiking Time (hours)", { default: 4, min: 0.1, max: 24, step: 0.25 }), dropdown("terrain", "Terrain", TERRAIN_OPTS, 3)],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("climbingCalories", "Calories from Climbing"), num("caloriesPerMile", "Calories per Mile")],
    instructions: "Enter your weight and pack weight, the hike's distance and total elevation gain (from a map or app), how long it took and the terrain.",
    examples: "Example: a 75 kg hiker with a 10 kg pack covering 8 miles and 2,000 ft of climbing in 4 hours on a trail burns about 1,300 kcal — 486 of them from the climbing.",
    assumptions: "Moving cost from the Pandolf load-carriage equation at your average speed (trail η 1.2), plus climbing work = (body + pack) × g × elevation gain at 25% muscular efficiency. Descents are not added. Real values vary ±20%. " + DISCLAIMER,
    faq: [
      { question: "How many calories does hiking burn per hour?", answer: "Usually 300–600 kcal an hour, depending on weight, pack and how steep it is." },
      { question: "Why does elevation gain matter so much?", answer: "Lifting your body and pack uphill takes a lot of work — a 2,000 ft climb can add several hundred calories." },
    ],
  },
  {
    slug: "walking-heart-rate-calculator",
    title: "Walking Heart Rate Calculator",
    description: "Find your target heart rate for brisk walking and check whether your walking heart rate is light, moderate or vigorous.",
    metaTitle: "Walking Heart Rate Calculator — Target Zone",
    metaDescription: "Free walking heart rate calculator. Get your moderate and vigorous walking heart rate range and the intensity of your walk.",
    calcInputs: [numberField("age", "Age", { default: 45, min: 10, max: 100 }), numberField("restingHr", "Resting Heart Rate (bpm)", { default: 70, min: 30, max: 120 }), numberField("walkingHr", "Your Heart Rate While Walking (optional)", { default: 115, max: 220, required: false })],
    calcResult: { label: "Moderate Zone From", format: "number" },
    calcResults: [num("moderateLow", "Moderate Walking — From (bpm)", true), num("moderateHigh", "Moderate Walking — To (bpm)"), num("vigorousLow", "Vigorous — From (bpm)"), num("vigorousHigh", "Vigorous — To (bpm)"), num("maxHeartRate", "Estimated Max Heart Rate"), pct("yourIntensityPct", "Your Walk (% of Heart Rate Reserve)"), num("intensity", "Your Walk (1 Light, 2 Moderate, 3 Vigorous)")],
    instructions: "Enter your age and resting heart rate (measured in the morning). Add your heart rate during a walk to see how hard you were working.",
    examples: "Example: age 45, resting 70 bpm → max ≈ 177. Brisk (moderate) walking is 113–133 bpm. A walking heart rate of 115 is 42% of reserve — moderate.",
    assumptions: "Max heart rate = 208 − 0.7 × age (Tanaka). Heart-rate reserve (Karvonen) bands from ACSM: moderate 40–59%, vigorous 60–89%. Beta-blockers and some other medicines lower heart rate — use the talk test instead. " + DISCLAIMER,
    faq: [
      { question: "What is a normal heart rate while walking?", answer: "For most adults about 100–130 bpm on a brisk walk; it depends on age, fitness and pace." },
      { question: "How is this different from a target heart rate calculator?", answer: "It focuses on walking — the moderate brisk-walk band and rating the intensity of your actual walk." },
    ],
  },
  {
    slug: "altitude-oxygen-calculator",
    title: "Altitude Oxygen Calculator",
    description: "Calculate how much oxygen is available at altitude — air pressure, effective oxygen %, typical blood oxygen (SpO2) and altitude-sickness risk.",
    metaTitle: "Altitude Oxygen Calculator — Effective O2 & SpO2",
    metaDescription: "Free altitude oxygen calculator. See air pressure, effective oxygen percentage, typical SpO2 and risk level at any elevation.",
    calcInputs: [numberField("altitude", "Altitude", { default: 3000, min: -400, max: 30000 }), dropdown("altitudeUnit", "Unit", [["metres", 1], ["feet", 2]], 1)],
    calcResult: { label: "Effective Oxygen", format: "percentage" },
    calcResults: [pct("effectiveOxygenPct", "Effective Oxygen (sea-level equivalent)", true), pct("oxygenVsSeaLevelPct", "Oxygen vs Sea Level"), num("pressureMmHg", "Air Pressure (mmHg)"), num("inspiredO2MmHg", "Inspired O2 Pressure (mmHg)"), pct("typicalSpo2Pct", "Typical Resting SpO2"), num("altitudeRisk", "Altitude Level (1 Low, 2 Moderate, 3 High, 4 Extreme)")],
    instructions: "Enter the elevation of your hike, summit or sleeping spot.",
    examples: "Example: at 3,000 m (9,840 ft) each breath holds about 69% of sea-level oxygen — like breathing 14.5% O2. Typical resting SpO2 is about 90%. Mt Whitney (14,505 ft) is 58% (12.0% equivalent).",
    assumptions: "Standard atmosphere: P = 101.325 × (1 − 2.25577×10⁻⁵ × h)^5.256 kPa. Effective O2 = 20.9% × P ÷ sea-level P; inspired O2 = (P − 47 mmHg) × 0.2095. Typical SpO2 values are averages for healthy, unacclimatised people. Altitude illness is possible above about 2,500 m — climb slowly and descend if symptoms worsen. " + DISCLAIMER,
    faq: [
      { question: "Is the oxygen percentage lower at altitude?", answer: "No — air is always about 20.9% oxygen, but the pressure is lower, so each breath contains fewer oxygen molecules." },
      { question: "At what altitude does altitude sickness start?", answer: "Usually above about 2,500 m (8,000 ft), especially if you go up quickly." },
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
