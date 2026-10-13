// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the hiking sub-batch A (Steps, Walking Speed & Walk Tests). See
// src/lib/calc-engine-hiking-steps.ts for the full list
// of 3 sub-batches (29 tools under Sports Calculators > Hiking
// Calculators), and src/lib/calc-engine-hiking-steps.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-hiking-steps-calculators.ts
// or
//   npm run db:create-hiking-steps-calculators

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

const SEX = () => dropdown("sex", "Sex", [["Male", 1], ["Female", 2]], 1);
const HEIGHT = (def = 170) => [numberField("height", "Height", { default: def, min: 50, max: 250, step: 0.5 }), dropdown("heightUnit", "Height Unit", [["cm", 1], ["inches", 2]], 1)];
const WEIGHT = (def = 70) => [numberField("weight", "Body Weight", { default: def, max: 300, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1)];
const DIST_UNIT_M = () => dropdown("distanceUnit", "Distance Unit", [["metres", 1], ["feet", 2]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "step-calculator",
    title: "Step Calculator",
    description: "Convert steps to kilometres and miles — plus walking time and calories — from your height or step length. Also a steps to km and 10,000 steps calculator.",
    metaTitle: "Step Calculator — Steps to km, Miles & Calories",
    metaDescription: "Free step calculator. Convert steps to km or miles, and see how long 10,000 steps takes and the calories burned, based on your height.",
    calcInputs: [numberField("steps", "Steps", { default: 10000, max: 200000, step: 100 }), ...HEIGHT(), SEX(), numberField("stepLength", "Your Step Length (same unit as height; 0 = estimate)", { default: 0, max: 150, step: 0.5, required: false }), ...WEIGHT(), dropdown("pace", "Walking Pace", [["Slow (2.5 mph / 4 km/h)", 1], ["Average (3 mph / 4.8 km/h)", 2], ["Brisk (3.5 mph / 5.6 km/h)", 3], ["Fast (4 mph / 6.4 km/h)", 4]], 2)],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceKm", "Distance (km)", true), num("distanceMiles", "Distance (miles)"), num("walkingMinutes", "Walking Time (min)"), num("calories", "Calories Burned (kcal)"), num("stepLengthCm", "Step Length Used (cm)"), num("stepsPerKm", "Steps per km"), num("stepsPerMile", "Steps per Mile")],
    instructions: "Enter your steps (try 10,000), your height and sex — or your own measured step length — plus your weight and usual pace.",
    examples: "Example: 10,000 steps for a 170 cm man is about 7.06 km (4.38 miles). At an average 3 mph that's about 88 minutes of walking and 358 kcal at 70 kg.",
    assumptions: "Step length ≈ 41.5% of height for men and 41.3% for women. Calories = walking MET (2011 Compendium: 3.0 at 2.5 mph, 3.5 at 3 mph, 4.3 at 3.5 mph, 5.0 at 4 mph) × weight × hours. Step length shortens on hills and in crowds, so trackers may differ. " + DISCLAIMER,
    faq: [
      { question: "How many km is 10,000 steps?", answer: "About 7–8 km (4.5–5 miles) for most adults, depending on height." },
      { question: "How many steps are in a mile?", answer: "Roughly 2,000–2,500 walking steps; taller people need fewer." },
    ],
  },
  {
    slug: "steps-per-day-calculator",
    title: "Steps per Day Calculator",
    description: "Work out your average steps per day, your activity level and how you compare with the step targets for your age.",
    metaTitle: "Steps per Day Calculator — How Many Steps a Day?",
    metaDescription: "Free steps per day calculator. Get your daily step average, activity level and the recommended steps per day for your age.",
    calcInputs: [numberField("totalSteps", "Total Steps in the Period", { default: 52500, max: 5000000, step: 100 }), numberField("days", "Days in the Period", { default: 7, min: 1, max: 366 }), numberField("age", "Age", { default: 40, min: 5, max: 110 }), numberField("dailyGoal", "Your Daily Goal", { default: 10000, max: 50000, step: 500 })],
    calcResult: { label: "Steps per Day", format: "number" },
    calcResults: [num("averageStepsPerDay", "Average Steps per Day", true), num("activityLevel", "Activity Level (1 Sedentary … 5 Highly Active)"), pct("percentOfGoal", "Percent of Your Goal"), num("stepsShortPerDay", "Steps Short of Goal per Day"), num("recommendedMin", "Recommended for Your Age — From"), num("recommendedMax", "Recommended for Your Age — To")],
    instructions: "Enter the total from your phone or tracker for a week (or any period) and the number of days, plus your age and goal.",
    examples: "Example: 52,500 steps in a week = 7,500 a day — \"somewhat active\" and 2,500 short of a 10,000 goal. Adults under 60 benefit most at about 8,000–10,000 a day.",
    assumptions: "Activity levels (Tudor-Locke): < 5,000 sedentary, 5,000–7,499 low active, 7,500–9,999 somewhat active, 10,000–12,499 active, 12,500+ highly active. Age targets from the 2022 Lancet step-count meta-analysis (Paluch et al.): benefits level off around 8,000–10,000 steps under 60 and 6,000–8,000 at 60+. " + DISCLAIMER,
    faq: [
      { question: "Do I really need 10,000 steps?", answer: "No — 10,000 started as a marketing number. Health benefits start well below it and level off around 7,000–10,000." },
      { question: "Do steps from running count?", answer: "Yes, all steps count, and faster steps give extra fitness benefit." },
    ],
  },
  {
    slug: "steps-to-minutes-calculator",
    title: "Steps to Minutes Calculator",
    description: "Convert steps to minutes of walking — or minutes to steps — at a slow, average, brisk or running cadence.",
    metaTitle: "Steps to Minutes Calculator — and Minutes to Steps",
    metaDescription: "Free steps to minutes calculator. Convert a step count to walking time, or minutes of activity to steps, at your cadence.",
    calcInputs: [dropdown("direction", "Convert", [["Steps → minutes", 1], ["Minutes → steps", 2]], 1), numberField("steps", "Steps", { default: 10000, max: 200000, step: 100 }), numberField("minutes", "Minutes", { default: 30, max: 1440 }), dropdown("pace", "Pace", [["Slow walk (90 steps/min)", 1], ["Average walk (100)", 2], ["Brisk walk (115)", 3], ["Fast walk (130)", 4], ["Running (160)", 5], ["Custom cadence", 6]], 2), numberField("customCadence", "Custom Cadence (steps/min)", { default: 100, min: 30, max: 250 })],
    calcResult: { label: "Result", format: "number" },
    calcResults: [num("minutes", "Minutes", true), num("steps", "Steps", true), num("hours", "Hours"), num("cadence", "Cadence Used (steps/min)")],
    instructions: "Choose the direction, enter steps or minutes, and pick your pace (or enter your own steps per minute).",
    examples: "Example: 10,000 steps at an average 100 steps a minute takes 100 minutes. 30 minutes of brisk walking at 115 steps a minute ≈ 3,450 steps.",
    assumptions: "Minutes = steps ÷ cadence; steps = minutes × cadence. Typical adult cadences: slow 90, average 100, brisk 115, fast 130, running 150–180 steps per minute. Measure yours with the Steps per Minute Calculator for a better answer. " + DISCLAIMER,
    faq: [
      { question: "How long does it take to walk 10,000 steps?", answer: "About 1 hour 30 minutes to 1 hour 45 minutes at a normal pace." },
      { question: "How many steps is a 30-minute walk?", answer: "Roughly 3,000–4,000 steps depending on pace." },
    ],
  },
  {
    slug: "steps-per-minute-calculator",
    title: "Steps per Minute Calculator",
    description: "Calculate your walking cadence (steps per minute) and steps per hour — and whether that's light, moderate or vigorous intensity.",
    metaTitle: "Steps per Minute Calculator — Cadence & Steps per Hour",
    metaDescription: "Free steps per minute calculator. Find your cadence, steps per hour and walking intensity (100 spm = moderate, 130 = vigorous).",
    calcInputs: [numberField("steps", "Steps Counted", { default: 1200, max: 100000 }), numberField("minutes", "Minutes", { default: 10, max: 1440 }), numberField("seconds", "Seconds", { default: 0, max: 59, required: false })],
    calcResult: { label: "Steps per Minute", format: "number" },
    calcResults: [num("stepsPerMinute", "Steps per Minute", true), num("stepsPerHour", "Steps per Hour"), num("intensity", "Intensity (1 Light, 2 Moderate, 3 Vigorous)"), num("estimatedMets", "Estimated METs"), num("stepsIn30Minutes", "Steps in 30 Minutes at This Cadence")],
    instructions: "Walk at your normal pace and count steps for a set time (or read the steps and minutes from your tracker), then enter them.",
    examples: "Example: 1,200 steps in 10 minutes = 120 steps per minute (7,200 an hour) — moderate intensity, about 5 METs.",
    assumptions: "Cadence = steps ÷ minutes. CADENCE-Adults study thresholds: about 100 steps/min ≈ moderate intensity (3 METs) and 130 steps/min ≈ vigorous (6 METs); METs are interpolated between them. " + DISCLAIMER,
    faq: [
      { question: "What is a good walking cadence?", answer: "100 steps per minute or more counts as moderate exercise for most adults." },
      { question: "How many steps per hour is normal?", answer: "Brisk walking gives about 6,000–7,000 steps an hour; across a whole day 250 steps an hour is a common minimum target for breaking up sitting." },
    ],
  },
  {
    slug: "step-length-calculator",
    title: "Step Length Calculator",
    description: "Find your walking step length and stride length from your height — or measure it exactly from a counted walk.",
    metaTitle: "Step Length Calculator — Step & Stride Length",
    metaDescription: "Free step length calculator. Estimate step and stride length from height, or measure it, plus steps per km and per mile.",
    calcInputs: [dropdown("method", "Method", [["Estimate from height", 1], ["Measure: distance ÷ steps", 2]], 1), ...HEIGHT(), SEX(), numberField("distance", "Distance Walked (measure method)", { default: 20, max: 10000 }), DIST_UNIT_M(), numberField("stepsCounted", "Steps Counted (measure method)", { default: 28, min: 1, max: 100000 })],
    calcResult: { label: "Step Length", format: "number" },
    calcResults: [num("stepLengthCm", "Step Length (cm)", true), num("stepLengthInches", "Step Length (in)"), num("strideLengthCm", "Stride Length — 2 Steps (cm)"), num("stepsPerKm", "Steps per km"), num("stepsPerMile", "Steps per Mile")],
    instructions: "Estimate from your height, or walk a measured distance (e.g. 20 m) at your normal pace, count your steps and enter both.",
    examples: "Example: a 170 cm man's step is about 70.6 cm (stride 141 cm) — about 1,417 steps per km. Walking 20 m in 28 steps measures 71.4 cm.",
    assumptions: "Height method: step ≈ 0.415 × height (men), 0.413 × height (women). A stride is two steps (left + right). Enter the measured step length in a tracker for better distance readings. " + DISCLAIMER,
    faq: [
      { question: "What's the difference between step and stride?", answer: "A step is heel to opposite heel; a stride is heel to the same heel — two steps." },
      { question: "What is an average step length?", answer: "About 70–80 cm (28–31 in) for men and 65–70 cm (26–28 in) for women." },
    ],
  },
  {
    slug: "walking-speed-calculator",
    title: "Walking Speed Calculator",
    description: "Calculate your walking speed (km/h and mph) and pace (min per km and per mile) from distance and time — and how brisk it is.",
    metaTitle: "Walking Speed Calculator — Speed & Pace",
    metaDescription: "Free walking speed calculator. Get km/h, mph and minutes per km or mile from any walk, and see if it counts as brisk.",
    calcInputs: [numberField("distance", "Distance", { default: 5, max: 1000, step: 0.01 }), dropdown("distanceUnit", "Unit", [["km", 1], ["miles", 2]], 1), numberField("hours", "Hours", { default: 0, max: 48, required: false }), numberField("minutes", "Minutes", { default: 60, max: 600 }), numberField("seconds", "Seconds", { default: 0, max: 59, required: false })],
    calcResult: { label: "Speed", format: "number" },
    calcResults: [num("speedKmh", "Speed (km/h)", true), num("speedMph", "Speed (mph)"), num("paceMinPerKm", "Pace (min per km)"), num("paceMinPerMile", "Pace (min per mile)"), num("category", "Pace (1 Stroll, 2 Average, 3 Brisk, 4 Very Brisk, 5 Race Walking)")],
    instructions: "Enter the distance you walked and how long it took.",
    examples: "Example: 5 km in 60 minutes = 5 km/h (3.11 mph), a pace of 12:00 per km or 19:19 per mile — brisk walking.",
    assumptions: "Speed = distance ÷ time. Bands: < 2 mph stroll, 2–3 mph average, 3–4 mph brisk (the CDC's moderate-intensity walk), 4–5 mph very brisk, 5+ mph race walking. Pace decimals are minutes (19.31 = 19 min 19 s). " + DISCLAIMER,
    faq: [
      { question: "What is an average walking speed?", answer: "About 3 mph (4.8 km/h) for adults, slowing gradually after 60." },
      { question: "What counts as brisk walking?", answer: "About 3 mph (100 steps a minute) or faster — you can talk but not sing." },
    ],
  },
  {
    slug: "walking-goal-calculator",
    title: "Walking Goal Calculator",
    description: "Plan a safe build-up from your current daily steps to a walking goal — weeks needed, next week's target and the extra minutes it takes.",
    metaTitle: "Walking Goal Calculator — Step Goal Plan",
    metaDescription: "Free walking goal calculator. Build up from your current steps to a daily goal, with weekly targets and the extra walking time.",
    calcInputs: [numberField("currentSteps", "Current Steps per Day", { default: 4000, min: 500, max: 50000, step: 100 }), numberField("goalSteps", "Goal Steps per Day", { default: 10000, max: 50000, step: 500 }), percentField("weeklyIncreasePct", "Increase per Week", { default: 10, min: 1, max: 50 }), numberField("cadence", "Your Cadence (steps/min)", { default: 100, min: 50, max: 180 })],
    calcResult: { label: "Weeks to Goal", format: "number" },
    calcResults: [num("weeksToGoal", "Weeks to Reach the Goal", true), num("nextWeekTarget", "Next Week's Daily Target"), num("extraStepsPerDay", "Extra Steps per Day at Goal"), num("extraMinutesPerDay", "Extra Walking Minutes per Day"), num("weeklyStepsAtGoal", "Weekly Steps at Goal")],
    instructions: "Enter your current daily average (from a week of tracking), your goal, how fast you want to build up and your normal steps per minute.",
    examples: "Example: going from 4,000 to 10,000 steps at 10% a week takes 10 weeks — next week aim for 4,400. At goal you're walking about 60 extra minutes a day.",
    assumptions: "Each week's target = the previous × (1 + increase %), so weeks = ln(goal ÷ current) ÷ ln(1 + rate), rounded up. A 10% weekly increase is a common rule for avoiding overuse injury. " + DISCLAIMER,
    faq: [
      { question: "How quickly should I increase my steps?", answer: "About 10% a week (or 500–1,000 steps a day each week) is easy to stick to." },
      { question: "Is it better to walk once or several times a day?", answer: "Both work. Several short walks add up and break up sitting time." },
    ],
  },
  {
    slug: "gait-speed-calculator",
    title: "Gait Speed Calculator",
    description: "Calculate gait speed in metres per second from a timed walk (4 m or 10 m test) and compare it with age and sex norms.",
    metaTitle: "Gait Speed Calculator — 4 m & 10 m Walk Test",
    metaDescription: "Free gait speed calculator. Get walking speed in m/s from a timed 4 m or 10 m walk test, with age norms and function bands.",
    calcInputs: [numberField("distance", "Timed Distance", { default: 4, min: 1, max: 100, step: 0.1 }), DIST_UNIT_M(), numberField("seconds", "Time (seconds)", { default: 4, min: 0.5, max: 300, step: 0.01 }), numberField("age", "Age", { default: 72, min: 20, max: 110 }), SEX()],
    calcResult: { label: "Gait Speed", format: "number" },
    calcResults: [num("gaitSpeedMs", "Gait Speed (m/s)", true), num("gaitSpeedKmh", "Gait Speed (km/h)"), num("ageNormMs", "Age & Sex Norm (m/s)"), pct("percentOfNorm", "Percent of Norm"), num("category", "Band (1 Household, 2 Limited Community, 3 Community, 4 Healthy)")],
    instructions: "Time the person walking at their usual pace over the middle section of a course (e.g. 4 m or 10 m, with 1–2 m to speed up and slow down outside the timed part).",
    examples: "Example: 4 m in 4.0 s = 1.0 m/s. For a 72-year-old woman the norm is 1.13 m/s, so that's 88.5% of norm — in the healthy band.",
    assumptions: "Gait speed = distance ÷ time. Norms: Bohannon & Williams Andrews (2011) comfortable gait speed by decade. Bands (Perry / Fritz & Lusardi): < 0.4 m/s household walker, 0.4–0.8 limited community, 0.8–1.0 community, ≥ 1.0 healthy (< 0.8 links to higher fall and hospital risk). A screening aid, not a diagnosis. " + DISCLAIMER,
    faq: [
      { question: "Why is gait speed called the sixth vital sign?", answer: "It predicts falls, hospital stays and survival in older adults, and it's quick to measure." },
      { question: "4 metres or 10 metres?", answer: "Both are used; 10 m with a flying start is a little more reliable, 4 m fits a clinic corridor." },
    ],
  },
  {
    slug: "six-minute-walk-test-calculator",
    title: "6 Minute Walk Test Calculator",
    description: "Compare a 6-minute walk test (6MWT) distance with the predicted normal for age, sex, height and weight — with estimated VO2 peak.",
    metaTitle: "6 Minute Walk Test Calculator — % Predicted",
    metaDescription: "Free 6 minute walk test calculator. Get predicted 6MWT distance (Enright), percent predicted, lower limit of normal and VO2 peak.",
    calcInputs: [numberField("distance", "Distance Walked in 6 Minutes", { default: 500, max: 3000 }), DIST_UNIT_M(), numberField("age", "Age", { default: 60, min: 18, max: 100 }), SEX(), ...HEIGHT(), ...WEIGHT(75)],
    calcResult: { label: "Percent Predicted", format: "percentage" },
    calcResults: [pct("percentPredicted", "Percent of Predicted", true), num("predictedMetres", "Predicted Distance (m)"), num("lowerLimitOfNormal", "Lower Limit of Normal (m)"), num("belowNormal", "Below Normal (1 = yes)"), num("estimatedVo2Peak", "Estimated VO2 Peak (ml/kg/min)"), num("walkingSpeedMs", "Average Speed (m/s)")],
    instructions: "Enter the distance covered in 6 minutes (usually laps of a 30 m corridor) and the person's age, sex, height and weight.",
    examples: "Example: a 60-year-old man, 170 cm and 75 kg, walks 500 m. Predicted = 545 m, so he reached 91.8% — above the 392 m lower limit of normal.",
    assumptions: "Enright & Sherrill (1998): men 7.57 × height(cm) − 5.02 × age − 1.76 × weight(kg) − 309 (LLN −153 m); women 2.11 × height − 2.29 × weight − 5.78 × age + 667 (LLN −139 m). VO2 peak ≈ 0.03 × distance(m) + 3.98 (Cahalin). A change of about 30 m is clinically meaningful. Follow ATS test guidelines. " + DISCLAIMER,
    faq: [
      { question: "What is a normal 6-minute walk distance?", answer: "Roughly 400–700 m for healthy adults, falling with age." },
      { question: "Can people stop during the test?", answer: "Yes — they may rest standing, and the clock keeps running." },
    ],
  },
  {
    slug: "rockport-walk-test-calculator",
    title: "Rockport Walk Test Calculator",
    description: "Estimate VO2 max from the Rockport 1-mile walk test and see your fitness rating for your age and sex (also a 1 mile walk test and walking VO2 max calculator).",
    metaTitle: "Rockport Walk Test Calculator — 1 Mile Walk VO2 Max",
    metaDescription: "Free Rockport 1-mile walk test calculator. Estimate VO2 max from walk time and heart rate, with an age and sex fitness rating.",
    calcInputs: [...WEIGHT(80), numberField("age", "Age", { default: 40, min: 18, max: 99 }), SEX(), numberField("minutes", "1-Mile Walk Time — Minutes", { default: 15, min: 5, max: 40 }), numberField("seconds", "Seconds", { default: 0, max: 59, required: false }), numberField("heartRate", "Heart Rate at the Finish (bpm)", { default: 130, min: 60, max: 220 })],
    calcResult: { label: "VO2 Max", format: "number" },
    calcResults: [num("vo2Max", "VO2 Max (ml/kg/min)", true), num("fitnessRating", "Rating (1 Very Poor, 2 Poor, 3 Fair, 4 Good, 5 Excellent, 6 Superior)"), num("mets", "Max METs"), num("timeForGoodRatingMinutes", "Walk Time for a \"Good\" Rating (min)")],
    instructions: "Warm up, then walk 1 mile (1.609 km, four laps of a 400 m track) as fast as you can without jogging. Take your heart rate the moment you finish (15-second count × 4).",
    examples: "Example: an 80 kg, 40-year-old man walking the mile in 15:00 with a finishing heart rate of 130 bpm → VO2 max ≈ 40.8 ml/kg/min, a \"Good\" rating. He'd need about 15:32 or faster to stay in that band.",
    assumptions: "Kline et al. (1987): VO2 max = 132.853 − 0.0769 × weight(lb) − 0.3877 × age + 6.315 × (1 male / 0 female) − 3.2649 × time(min) − 0.1565 × heart rate. Ratings from the Cooper Institute VO2 max norms by age and sex. Accuracy is about ±5 ml/kg/min. " + DISCLAIMER,
    faq: [
      { question: "Who is the Rockport walk test for?", answer: "Anyone who can walk briskly — especially older or less-fit adults who shouldn't do a maximal run test." },
      { question: "Does a lower heart rate improve my score?", answer: "Yes — at the same time, a lower finishing heart rate means you're fitter." },
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
