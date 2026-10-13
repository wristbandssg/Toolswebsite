// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the other-sports sub-batch "Treadmill, Elliptical & Bikes". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-gym-cardio.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-gym-cardio-calculators.ts
// or
//   npm run db:create-other-gym-cardio-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

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
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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

const SPEED = (def = 3.5) => [numberField("speed", "Treadmill Speed", { default: def, min: 0.5, max: 15, step: 0.1 }), dropdown("speedUnit", "Speed Unit", [["mph", 1], ["km/h", 2]], 1)];
const WT = (def = 170) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 500 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];

const TOOLS: ToolDef[] = [
  {
    slug: "treadmill-calorie-calculator",
    title: "Treadmill Calorie Calculator",
    description: "Calculate calories burned on a treadmill from speed, incline, weight and time — walking or running (ACSM equations).",
    metaTitle: "Treadmill Calorie Calculator — Speed & Incline",
    metaDescription: "Free treadmill calorie calculator. Get calories burned walking or running on a treadmill from speed, incline, weight and time.",
    calcInputs: [...SPEED(), percentField("incline", "Incline", { default: 5, max: 40, step: 0.5 }), ...WT(), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 }), dropdown("mode", "Walking or Running", [["Auto (running from 4 mph)", 1], ["Walking", 2], ["Running", 3]], 1)],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerMinute", "Calories per Minute"), num("mets", "METs"), num("distanceMiles", "Distance (miles)")],
    instructions: "Enter speed, incline, your weight and the minutes you spent on the belt.",
    examples: "Example: 170 lb walking at 3.5 mph on a 5% incline for 30 minutes burns about 247 kcal. Running 6 mph at 1% for 30 minutes burns about 430 kcal.",
    assumptions: "ACSM: walking VO2 = 3.5 + 0.1 × speed (m/min) + 1.8 × speed × grade; running VO2 = 3.5 + 0.2 × speed + 0.9 × speed × grade; kcal ≈ VO2 × kg × minutes ÷ 200. Holding the handrails reduces the real burn; treadmill displays often overestimate. " + DISCLAIMER,
    faq: [
      { question: "Does incline burn more calories than speed?", answer: "Incline raises the cost of walking a lot — 12% at 3 mph burns about as much as a slow jog." },
      { question: "Are treadmill calorie readouts accurate?", answer: "They can be 10–20% high, especially if your weight isn't entered." },
    ],
  },
  {
    slug: "treadmill-pace-calculator",
    title: "Treadmill Pace Calculator",
    description: "Convert treadmill speed (mph or km/h) to running pace per mile and per km — and your time for a race distance.",
    metaTitle: "Treadmill Pace Calculator — Speed to Pace",
    metaDescription: "Free treadmill pace calculator. Convert mph or km/h to minutes per mile and per km, and see your 5K or 10K time.",
    calcInputs: [...SPEED(6), numberField("raceKm", "Race Distance (km)", { default: 5, min: 0.1, max: 100, step: 0.1 })],
    calcResult: { label: "Pace per Mile", format: "number" },
    calcResults: [num("paceMinPerMile", "Pace (min per mile)", true), num("paceMinPerKm", "Pace (min per km)"), num("speedKmh", "Speed (km/h)"), num("speedMph", "Speed (mph)"), num("raceTimeMinutes", "Race Time at This Pace (min)")],
    instructions: "Enter the treadmill speed and a race distance.",
    examples: "Example: 6.0 mph = 10:00 per mile (6:13 per km, 9.66 km/h) — a 5K in about 31:04.",
    assumptions: "Pace = 60 ÷ speed. Decimal minutes (6.21 = 6 min 13 s). Setting the treadmill to 1% incline roughly matches outdoor running effort on flat roads. " + DISCLAIMER,
    faq: [
      { question: "What treadmill speed is a 9-minute mile?", answer: "6.67 mph (10.7 km/h)." },
      { question: "Is treadmill running easier than outside?", answer: "Slightly — there's no wind resistance; 1% incline compensates." },
    ],
  },
  {
    slug: "treadmill-elevation-calculator",
    title: "Treadmill Elevation Calculator",
    description: "Calculate the elevation gain of a treadmill workout from incline and distance — in feet, metres and flights of stairs.",
    metaTitle: "Treadmill Elevation Calculator — Elevation Gain",
    metaDescription: "Free treadmill elevation gain calculator. Turn incline and distance into feet or metres climbed and floors.",
    calcInputs: [dropdown("method", "Distance From", [["Distance entered", 1], ["Speed × time", 2]], 1), numberField("distance", "Distance (miles or km)", { default: 2, max: 100, step: 0.01 }), ...SPEED(3), numberField("minutes", "Minutes", { default: 30, max: 600 }), percentField("incline", "Incline", { default: 12, max: 40, step: 0.5 })],
    calcResult: { label: "Elevation Gain", format: "number" },
    calcResults: [num("elevationGainFt", "Elevation Gain (ft)", true), num("elevationGainM", "Elevation Gain (m)"), num("floorsClimbed", "Floors Climbed (10 ft each)"), pct("everestPct", "Share of Everest"), num("distanceMiles", "Distance (miles)")],
    instructions: "Enter the distance (or speed and time) and the incline.",
    examples: "Example: 2 miles at 12% incline climbs about 1,258 ft (383 m) — 126 floors.",
    assumptions: "Gain = distance × sin(arctan(grade)). The treadmill readout distance is along the belt. 1 floor ≈ 10 ft. " + DISCLAIMER,
    faq: [
      { question: "How much elevation is 12-3-30?", answer: "30 min at 3 mph is 1.5 miles; at 12% that's about 943 ft." },
      { question: "Does a treadmill incline match hiking?", answer: "It matches the climbing work, but there's no descent or uneven terrain." },
    ],
  },
  {
    slug: "treadmill-distance-calculator",
    title: "Treadmill Distance Calculator",
    description: "Calculate how far you went on a treadmill from speed and time — miles, kilometres and track laps.",
    metaTitle: "Treadmill Distance Calculator — Miles & km",
    metaDescription: "Free treadmill distance calculator. Get distance in miles, km and 400 m laps from treadmill speed and time.",
    calcInputs: [...SPEED(6), numberField("hours", "Hours", { default: 0, max: 10, required: false }), numberField("minutes", "Minutes", { default: 30, max: 600 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMiles", "Distance (miles)", true), num("distanceKm", "Distance (km)"), num("trackLaps400m", "400 m Track Laps")],
    instructions: "Enter your average speed and time.",
    examples: "Example: 6 mph for 30 minutes = 3.0 miles (4.83 km, about 12 laps of a track).",
    assumptions: "Distance = speed × time. Use your average speed if you ran intervals. " + DISCLAIMER,
    faq: [
      { question: "How far is 30 minutes on a treadmill?", answer: "About 1.5 miles walking at 3 mph or 3 miles running at 6 mph." },
      { question: "Are treadmill distances accurate?", answer: "Usually within a few percent; belt calibration can drift over time." },
    ],
  },
  {
    slug: "treadmill-to-steps-calculator",
    title: "Treadmill to Steps Calculator",
    description: "Convert a treadmill workout to steps — from speed, time and height — for your step goal.",
    metaTitle: "Treadmill to Steps Calculator — Steps from Speed & Time",
    metaDescription: "Free treadmill to steps calculator. Estimate steps from treadmill speed, time and height, walking or running.",
    calcInputs: [...SPEED(), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 }), numberField("height", "Height", { default: 68, min: 30, max: 230 }), dropdown("heightUnit", "Height Unit", [["inches", 1], ["cm", 2]], 1), numberField("runCadence", "Running Cadence (steps/min, from 4.5 mph)", { default: 165, min: 120, max: 210 })],
    calcResult: { label: "Steps", format: "number" },
    calcResults: [num("steps", "Steps", true), num("stepsPerMinute", "Steps per Minute"), num("stepLengthCm", "Step Length (cm)"), num("distanceMiles", "Distance (miles)")],
    instructions: "Enter speed, minutes and your height. Running speeds use your running cadence.",
    examples: "Example: 30 minutes walking at 3.5 mph for a 5'8\" person ≈ 3,840 steps. Running 6 mph for 30 minutes at 165 steps/min = 4,950 steps.",
    assumptions: "Walking step ≈ 0.414 × height, lengthening slightly with speed; running steps = cadence × minutes. Fitness trackers count differently on treadmills (arm swing), so numbers may not match. " + DISCLAIMER,
    faq: [
      { question: "How many steps is a mile on a treadmill?", answer: "About 2,000–2,400 walking, 1,400–1,800 running." },
      { question: "Why doesn't my watch count treadmill steps?", answer: "Holding the rails stops arm swing, which wrist trackers use to count steps." },
    ],
  },
  {
    slug: "calories-to-steps-calculator",
    title: "Calories to Steps Calculator",
    description: "Find how many steps you need to walk to burn a calorie target — and how long and far that is.",
    metaTitle: "Calories to Steps Calculator — Steps to Burn Calories",
    metaDescription: "Free calories to steps calculator. See how many steps, minutes and miles it takes to burn a calorie goal.",
    calcInputs: [numberField("calories", "Calories to Burn", { default: 300, min: 1, max: 5000 }), ...WT(), dropdown("pace", "Pace", [["Slow walk", 1], ["Average walk", 2], ["Brisk walk", 3], ["Running", 4]], 2), dropdown("netOrGross", "Count", [["Extra calories above resting (net)", 1], ["Total calories (gross)", 2]], 1)],
    calcResult: { label: "Steps Needed", format: "number" },
    calcResults: [num("stepsNeeded", "Steps Needed", true), num("minutes", "Minutes"), num("distanceMiles", "Distance (miles)"), num("caloriesPer1000Steps", "Calories per 1,000 Steps")],
    instructions: "Enter the calories you want to burn, your weight and pace. Net counts only the extra calories from walking.",
    examples: "Example: burning 300 extra kcal at 170 lb with an average walk takes about 9,300 steps — 93 minutes, 4.7 miles.",
    assumptions: "Calories per minute = MET × kg ÷ 60 (2011 Compendium: 3.0 slow, 3.5 average, 4.3 brisk walking, 9.8 running at 6 mph), minus 1 MET for net; steps at typical cadences of 90, 100, 115 and 160 per minute. " + DISCLAIMER,
    faq: [
      { question: "How many calories do 10,000 steps burn?", answer: "Roughly 300–500 kcal for most adults." },
      { question: "Is running more efficient for burning calories?", answer: "Per minute yes; per step it's similar, because running steps are longer." },
    ],
  },
  {
    slug: "elliptical-calories-calculator",
    title: "Elliptical Calories Calculator",
    description: "Calculate calories burned on an elliptical trainer by effort, body weight and time.",
    metaTitle: "Elliptical Calories Calculator — Calories Burned",
    metaDescription: "Free elliptical calorie calculator. Estimate calories burned on an elliptical by effort, weight and minutes.",
    calcInputs: [...WT(), dropdown("effort", "Effort", [["Light", 1], ["Moderate", 2], ["Vigorous", 3]], 2), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose how hard you worked (you can talk easily = light; talk in short sentences = moderate; few words = vigorous).",
    examples: "Example: 30 minutes at a moderate effort at 170 lb burns about 193 kcal.",
    assumptions: "Calories = MET × weight (kg) × hours, with METs of 4.0 light, 5.0 moderate (2011 Compendium) and 7.5 vigorous. Elliptical consoles often read 20–30% higher. " + DISCLAIMER,
    faq: [
      { question: "Is the elliptical good for weight loss?", answer: "Yes — it's low impact, so many people can do more of it than running." },
      { question: "Should I use the handles?", answer: "Moving handles add upper-body work and a few more calories." },
    ],
  },
  {
    slug: "distance-on-elliptical-calculator",
    title: "Distance on Elliptical Calculator",
    description: "Calculate distance covered on an elliptical from strides per minute, stride length and time.",
    metaTitle: "Distance on Elliptical Calculator — Miles & km",
    metaDescription: "Free elliptical distance calculator. Get miles or km from strides per minute, machine stride length and time.",
    calcInputs: [numberField("stridesPerMinute", "Strides per Minute (SPM on console)", { default: 130, min: 10, max: 300 }), numberField("strideLength", "Machine Stride Length", { default: 20, min: 10, max: 70 }), dropdown("strideUnit", "Stride Unit", [["inches", 1], ["cm", 2]], 1), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMiles", "Distance (miles)", true), num("distanceKm", "Distance (km)"), num("totalStrides", "Total Strides"), num("speedMph", "Equivalent Speed (mph)")],
    instructions: "Read strides per minute from the console and the stride length from the machine's spec sheet (often 18–22\").",
    examples: "Example: 130 strides a minute on a 20\" stride for 30 minutes = 3,900 strides — about 1.23 miles (1.98 km).",
    assumptions: "Distance = strides × stride length. Elliptical consoles use their own formulas and often show larger distances, so 'elliptical miles' aren't directly comparable with running miles. " + DISCLAIMER,
    faq: [
      { question: "Is an elliptical mile the same as a running mile?", answer: "Not really — there's no impact and the motion is different, so effort per 'mile' varies." },
      { question: "What is a good SPM?", answer: "About 120–150 for steady cardio." },
    ],
  },
  {
    slug: "elliptical-stride-length-calculator",
    title: "Elliptical Stride Length Calculator",
    description: "Find the elliptical stride length that fits your height — useful when buying an elliptical trainer.",
    metaTitle: "Elliptical Stride Length Calculator — By Height",
    metaDescription: "Free elliptical stride length calculator. Get the recommended machine stride length for your height in inches and cm.",
    calcInputs: [numberField("height", "Your Height", { default: 68, min: 40, max: 230 }), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1)],
    calcResult: { label: "Stride Length", format: "number" },
    calcResults: [num("recommendedStrideInches", "Recommended Stride (in)", true), num("minimumStrideInches", "Minimum Comfortable (in)"), num("recommendedStrideCm", "Recommended Stride (cm)")],
    instructions: "Enter the height of the tallest regular user.",
    examples: "Example: 5'8\" (68\") → a 20\" stride; 18\" is the shortest that will feel natural.",
    assumptions: "Recommended stride ≈ 29% of height (about 18\" under 5'3\", 20\" for 5'7\"–6'0\", 22\"+ over 6'3\"), within 14–24\". Adjustable-stride machines suit households with very different heights. " + DISCLAIMER,
    faq: [
      { question: "What stride length is best for an elliptical?", answer: "20\" suits most adults; tall users prefer 21–22\"." },
      { question: "What happens if the stride is too short?", answer: "It feels choppy, like shuffling, and can strain knees and hips." },
    ],
  },
  {
    slug: "assault-bike-calorie-calculator",
    title: "Assault Bike Calorie Calculator",
    description: "Estimate air-bike (Assault / Echo) calories — the console's calorie count and your estimated real burn — from average watts.",
    metaTitle: "Assault Bike Calorie Calculator — Air Bike Calories",
    metaDescription: "Free Assault bike calorie calculator. Estimate console calories and metabolic calories from watts and time.",
    calcInputs: [numberField("watts", "Average Watts", { default: 200, min: 10, max: 2000 }), numberField("minutes", "Minutes", { default: 20, min: 0.5, max: 300, step: 0.5 }), ...WT()],
    calcResult: { label: "Console Calories", format: "number" },
    calcResults: [num("displayCalories", "Console-Style Calories", true), num("metabolicCalories", "Estimated Metabolic Calories"), num("caloriesPerMinute", "Console Calories per Minute"), num("wattsPerKg", "Watts per kg")],
    instructions: "Enter your average watts (shown on the console) and time.",
    examples: "Example: 200 W for 20 minutes → about 329 calories on a console-style count and about 261 kcal actually burned.",
    assumptions: "Console-style: kcal/h ≈ 3.44 × watts + 300 (the Concept2-style formula used by many air bikes, independent of body weight). Metabolic: work ÷ 22% efficiency. CrossFit 'calorie' targets use the console count. " + DISCLAIMER,
    faq: [
      { question: "Why are air-bike calories so hard to get?", answer: "Fan resistance rises with the cube of speed — going faster gets much harder." },
      { question: "Is console calorie count accurate?", answer: "It's a work-based estimate, consistent between machines but not tailored to you." },
    ],
  },
  {
    slug: "peloton-output-calculator",
    title: "Peloton Output Calculator",
    description: "Calculate Peloton total output (kJ) from average watts and ride length — and the watts needed to hit a kJ goal.",
    metaTitle: "Peloton Output Calculator — kJ, Watts & Calories",
    metaDescription: "Free Peloton output calculator. Convert average watts and minutes to total output in kJ, calories and target watts.",
    calcInputs: [numberField("avgOutput", "Average Output (watts)", { default: 150, min: 10, max: 1500 }), numberField("minutes", "Ride Length (min)", { default: 30, min: 1, max: 300 }), numberField("targetKj", "Target Total Output (kJ)", { default: 300, max: 5000 }), ...WT()],
    calcResult: { label: "Total Output", format: "number" },
    calcResults: [num("totalOutputKj", "Total Output (kJ)", true), num("estimatedCalories", "Estimated Calories"), num("wattsForTargetKj", "Average Watts for Target kJ"), num("wattsPerKg", "Watts per kg")],
    instructions: "Enter your average output and ride length, plus a total-output goal.",
    examples: "Example: 150 W for 30 minutes = 270 kJ (about 269 kcal). Hitting 300 kJ in 30 minutes needs about 167 W.",
    assumptions: "Total output (kJ) = average watts × seconds ÷ 1,000. Calories ≈ kJ ÷ (4.184 × 24% efficiency) — roughly 1 kcal per kJ. For FTP use the FTP Calculator (Peloton's FTP test is 95% of 20-minute average). Not affiliated with Peloton. " + DISCLAIMER,
    faq: [
      { question: "What is a good Peloton output for 30 minutes?", answer: "Around 250–350 kJ is common for regular riders; strong riders exceed 400." },
      { question: "Why do kJ and calories match?", answer: "Human efficiency (~24%) nearly cancels the 4.184 kJ-per-kcal conversion." },
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
