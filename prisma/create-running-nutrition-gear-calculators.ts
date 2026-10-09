// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the running sub-batch D (Running Nutrition, Body & Gear). See
// src/lib/calc-engine-running-pace.ts for the full list
// of 4 sub-batches (35 tools under Sports Calculators > Running
// Calculators), and src/lib/calc-engine-running-nutrition-gear.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-running-nutrition-gear-calculators.ts
// or
//   npm run db:create-running-nutrition-gear-calculators

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
  "Estimates for general training and nutrition planning only, not medical or dietary advice. Needs vary between people — practise race nutrition in training, and talk to a doctor or sports dietitian about weight loss, fluid or sodium needs, especially with a health condition.";

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

const WUNIT: [string, number][] = [["kg", 1], ["lb", 2]];
const DUNIT: [string, number][] = [["km", 1], ["miles", 2]];
const msFields = (key: string, label: string, m: number, s: number) => [
  numberField(`${key}Min`, `${label} — Minutes`, { default: m, max: 60 }),
  numberField(`${key}Sec`, `${label} — Seconds`, { default: s, max: 59 }),
];
const hmsOut = (key: string, label: string, highlight = false) => [num(`${key}Hours`, `${label} — Hours`, highlight), num(`${key}Minutes`, `${label} — Minutes`), num(`${key}Seconds`, `${label} — Seconds`)];

const TOOLS: ToolDef[] = [
  {
    slug: "run-calorie-calculator",
    title: "Run Calorie Calculator",
    description: "Calculate calories burned running from your distance, pace, weight and hills — total, net and per km or mile (a calorie calculator for runners).",
    metaTitle: "Run Calorie Calculator — Calories Burned Running",
    metaDescription: "Free running calorie calculator. Get calories burned for a run from distance, pace, weight and incline, per km and per mile.",
    calcInputs: [
      dropdown("weightUnit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 70, max: 300, step: 0.1 }),
      dropdown("distanceUnit", "Distance Unit", DUNIT, 1),
      numberField("distance", "Distance", { default: 10, max: 200, step: 0.1 }),
      ...msFields("pace", "Pace (per km or mile)", 6, 0),
      percentField("gradePercent", "Average Incline (Treadmill / Hills)", { default: 0, max: 15, step: 0.5 }),
    ],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("caloriesBurned", "Calories Burned", true), num("netCalories", "Net Calories (Above Resting)"), num("caloriesPerKm", "Calories per km"), num("caloriesPerMile", "Calories per Mile"), num("durationMinutes", "Run Duration (Minutes)")],
    instructions: "Enter your weight, the distance and your pace, plus any average incline.",
    examples: "Example: a 70 kg runner covering 10 km at 6:00 per km burns about 774 calories (700 above resting) — about 77 per km or 124 per mile.",
    assumptions: "ACSM running equation: VO2 = 0.2 × speed (m/min) + 0.9 × speed × grade + 3.5; 1 litre O₂ ≈ 5 kcal. A handy rule: running burns about 1 kcal per kg per km at any pace. " + DISCLAIMER,
    faq: [
      { question: "Does running faster burn more calories?", answer: "Per minute yes, per kilometre only slightly — distance covered matters more than speed." },
      { question: "Are watch calories accurate?", answer: "They can be 10–30% off. This calculator's estimate is a consistent baseline." },
    ],
  },
  {
    slug: "running-weight-loss-calculator",
    title: "Running Weight Loss Calculator",
    description: "See how much weight you can lose by running — fat lost per week and month from your weekly distance and diet, and weeks to your goal weight.",
    metaTitle: "Running Weight Loss Calculator — Weeks to Goal",
    metaDescription: "Free running weight loss calculator. Estimate weekly weight loss from running and diet, and how long to reach your goal.",
    calcInputs: [
      dropdown("weightUnit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Current Weight", { default: 85, max: 300, step: 0.1 }),
      numberField("goalWeight", "Goal Weight", { default: 78, max: 300, step: 0.1 }),
      dropdown("distanceUnit", "Distance Unit", DUNIT, 1),
      numberField("weeklyDistance", "Weekly Running Distance", { default: 25, max: 300, step: 0.5 }),
      numberField("dailyDeficit", "Daily Calorie Deficit from Diet", { default: 300, max: 1500, step: 50, required: false }),
    ],
    calcResult: { label: "Weight Loss per Week", format: "number" },
    calcResults: [num("weightLossPerWeek", "Weight Loss per Week", true), num("weeksToGoal", "Weeks to Goal Weight"), num("lossPerMonth", "Loss per Month"), num("runningCaloriesPerWeek", "Running Calories per Week"), num("totalWeeklyDeficit", "Total Weekly Calorie Deficit")],
    instructions: "Enter your weight and goal, your weekly running distance and any daily calorie deficit from eating less.",
    examples: "Example: an 85 kg runner covering 25 km a week and eating 300 kcal a day less loses about 0.53 kg a week — 78 kg in about 13 weeks.",
    assumptions: "Net running cost ≈ 0.95 kcal per kg per km; 7,700 kcal per kg of fat. Many new runners eat more without noticing — tracking food helps. " + DISCLAIMER,
    faq: [
      { question: "Can I lose weight just by running?", answer: "Yes, but it's slow — 20 km a week burns about the energy of 0.2 kg of fat. Combining running with a modest calorie deficit works best." },
      { question: "Why am I not losing weight running?", answer: "Hunger often rises with training, and muscle and water weight can mask fat loss at first." },
    ],
  },
  {
    slug: "ideal-running-weight-calculator",
    title: "Ideal Running Weight Calculator",
    description: "Find your racing weight from a target body fat percentage, how much to lose, and how much time it could save in a race.",
    metaTitle: "Ideal Running Weight Calculator — Racing Weight",
    metaDescription: "Free ideal running weight calculator. Get your racing weight from target body fat and the race time it could save.",
    calcInputs: [
      dropdown("sex", "Sex", [["Male", 1], ["Female", 2]], 1),
      dropdown("weightUnit", "Units", [["kg / cm", 1], ["lb / in", 2]], 1),
      numberField("weight", "Current Weight", { default: 75, max: 300, step: 0.1 }),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      percentField("bodyFatPercent", "Current Body Fat", { default: 20, max: 60, step: 0.5 }),
      percentField("targetBodyFat", "Target Body Fat", { default: 10, min: 5, max: 40, step: 0.5 }),
      numberField("raceDistanceKm", "Race Distance (km)", { default: 42.195, max: 200, step: 0.1 }),
    ],
    calcResult: { label: "Racing Weight", format: "number" },
    calcResults: [num("raceWeight", "Racing Weight", true), num("weightToLose", "Weight to Lose"), num("raceWeightBmi", "BMI at Racing Weight"), num("estimatedTimeSavedMinutes", "Estimated Race Time Saved (Minutes)")],
    instructions: "Enter your weight, height, current and target body fat (healthy athletic targets: about 8–15% for men, 15–22% for women) and your race distance.",
    examples: "Example: a 75 kg man at 20% body fat with a 10% target has a racing weight of 66.7 kg — 8.3 kg to lose — which could save about 16 minutes in a marathon.",
    assumptions: "Racing weight = lean mass ÷ (1 − target body fat), keeping all lean mass. Time saving: the rule of thumb of about 2 seconds per mile for each pound of fat lost — real gains vary and shrink near your ideal weight. " + DISCLAIMER,
    faq: [
      { question: "Is lighter always faster?", answer: "Only to a point. Losing fat helps; under-fuelling to get very lean harms health, bones and performance (RED-S)." },
      { question: "How much faster per pound lost?", answer: "A common estimate is about 2 seconds per mile per pound (about 1.4 s per km per kg) of fat lost." },
    ],
  },
  {
    slug: "sweat-rate-calculator",
    title: "Sweat Rate Calculator",
    description: "Calculate your sweat rate from a simple before-and-after weigh-in, how much to drink per hour, and your sodium loss.",
    metaTitle: "Sweat Rate Calculator — Fluid & Sodium Loss",
    metaDescription: "Free sweat rate calculator. Weigh in before and after a run to get litres per hour, how much to drink and sodium loss.",
    calcInputs: [
      dropdown("weightUnit", "Units", [["kg / ml", 1], ["lb / fl oz", 2]], 1),
      numberField("preWeight", "Weight Before (Nude)", { default: 70, max: 300, step: 0.05 }),
      numberField("postWeight", "Weight After (Nude, Towelled Dry)", { default: 69.2, max: 300, step: 0.05 }),
      numberField("fluidIntake", "Fluid Drunk During", { default: 500, max: 5000, step: 10 }),
      numberField("urine", "Urine Passed During (Optional)", { default: 0, max: 2000, step: 10, required: false }),
      numberField("durationMinutes", "Run Duration (Minutes)", { default: 60, min: 10, max: 600 }),
      dropdown("sweatSaltiness", "How Salty Is Your Sweat?", [["Light (500 mg/L)", 1], ["Average (950 mg/L)", 2], ["Salty — white marks on clothes (1500 mg/L)", 3]], 2),
    ],
    calcResult: { label: "Sweat Rate", format: "number" },
    calcResults: [num("sweatRateLitersPerHour", "Sweat Rate (L/hour)", true), num("sweatRateOzPerHour", "Sweat Rate (fl oz/hour)"), pct("bodyWeightLossPercent", "Bodyweight Lost"), num("sodiumLossMgPerHour", "Sodium Loss (mg/hour)"), num("drinkPerHourMl", "Drink per Hour (ml)")],
    instructions: "Weigh yourself nude before a run of about an hour, note everything you drink, then weigh again after towelling off.",
    examples: "Example: weighing 70 kg before and 69.2 kg after a 60-minute run, having drunk 500 ml, is a sweat rate of 1.3 L per hour — about 1,235 mg of sodium lost per hour. Aim to drink about 975 ml an hour in similar conditions.",
    assumptions: "Sweat loss = weight lost + fluid drunk − urine (1 kg ≈ 1 L). Drink about 75% of losses — enough to keep weight loss under 2% without over-drinking. Sodium concentration varies a lot; a sweat test gives your real number. Also covers the sodium loss calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a normal sweat rate?", answer: "Most runners lose 0.5–1.5 litres per hour; heavy sweaters in heat can exceed 2 litres." },
      { question: "Can I drink too much?", answer: "Yes — drinking more than you sweat can cause hyponatremia (low blood sodium), which is dangerous. Don't gain weight during a race." },
    ],
  },
  {
    slug: "marathon-fueling-calculator",
    title: "Marathon Fueling Calculator",
    description: "Plan race fueling for a marathon, half, ultra or triathlon: carbs per hour, gels needed and how often, plus fluid and sodium per hour (also triathlon nutrition).",
    metaTitle: "Marathon Fueling Calculator — Gels, Carbs & Fluid",
    metaDescription: "Free marathon fueling calculator. Plan carbs per hour, number of gels, gel timing, fluid and sodium for your race.",
    calcInputs: [
      numberField("finishHours", "Expected Finish — Hours", { default: 4, max: 24 }),
      numberField("finishMinutes", "Expected Finish — Minutes", { default: 0, max: 59 }),
      numberField("carbsPerHour", "Carbs per Hour (0 = Recommend)", { default: 0, max: 120, required: false }),
      numberField("gelCarbs", "Carbs per Gel (g)", { default: 25, min: 5, max: 60 }),
      numberField("sweatRate", "Sweat Rate (L/hour)", { default: 0.8, min: 0.2, max: 3, step: 0.1 }),
    ],
    calcResult: { label: "Gels Needed", format: "number" },
    calcResults: [num("gelsNeeded", "Gels Needed", true), num("gelEveryMinutes", "Take a Gel Every (Minutes)"), num("totalCarbs", "Total Carbs (g)"), num("carbsPerHour", "Carbs per Hour (g)"), num("fluidPerHourMl", "Fluid per Hour (ml)"), num("sodiumPerHourMg", "Sodium per Hour (mg)")],
    instructions: "Enter your expected finish time, the carbs in your gel (check the label) and your sweat rate (from the Sweat Rate Calculator). Practise the plan in long runs before race day.",
    examples: "Example: a 4:00 marathon at 75 g of carbs an hour needs about 263 g of carbs from 30 minutes in — 11 gels of 25 g, one every 19 minutes — plus about 600 ml of fluid and 560 mg of sodium per hour.",
    assumptions: "Carbs per hour: none under 1 hour, about 45 g for 1–2.5 hours, about 75 g beyond (60–90 g with trained guts; above 60 g needs glucose + fructose products). Fueling starts after about 30 minutes. Fluid ≈ 75% of sweat losses (max 800 ml/h); sodium about 700 mg per litre sweated. " + DISCLAIMER,
    faq: [
      { question: "How many gels for a marathon?", answer: "Most runners need 6–12, depending on finish time and gel size — this calculator works it out." },
      { question: "Can I take 90 g of carbs per hour?", answer: "Many elites do with gut training and dual-carb (glucose + fructose) products. Build up gradually in training." },
    ],
  },
  {
    slug: "marathon-carb-loading-calculator",
    title: "Marathon Carb Loading Calculator",
    description: "Work out how many grams of carbohydrate to eat each day before your marathon, the total load and your race-morning breakfast.",
    metaTitle: "Marathon Carb Loading Calculator — Grams per Day",
    metaDescription: "Free carb loading calculator. Get daily carbohydrate grams (10–12 g/kg), total load and race-morning carbs for your marathon.",
    calcInputs: [
      dropdown("weightUnit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 70, max: 300, step: 0.1 }),
      numberField("gramsPerKg", "Carbs per kg per Day (8–12)", { default: 10, min: 6, max: 12, step: 0.5 }),
      numberField("days", "Loading Days (1–3)", { default: 2, min: 1, max: 3 }),
    ],
    calcResult: { label: "Carbs per Day", format: "number" },
    calcResults: [num("carbsPerDay", "Carbs per Day (g)", true), num("totalCarbs", "Total Carbs Over the Load (g)"), num("caloriesFromCarbsPerDay", "Calories from Carbs per Day"), num("carbsPerMeal", "Per Meal or Snack (5 a Day, g)"), num("raceMorningCarbs", "Race-Morning Breakfast Carbs (g)")],
    instructions: "Enter your bodyweight, how many grams per kg you'll eat and for how many days before the race.",
    examples: "Example: a 70 kg runner loading at 10 g/kg for 2 days eats about 700 g of carbs a day (2,800 kcal from carbs) — about 140 g at each of 5 meals and snacks — and about 140 g at breakfast 3–4 hours before the start.",
    assumptions: "ACSM / IOC guidance: 10–12 g/kg/day for 36–48 hours before races over 90 minutes; race breakfast about 1–4 g/kg (2 g/kg used here). Choose low-fibre foods to avoid stomach trouble. " + DISCLAIMER,
    faq: [
      { question: "Will carb loading make me gain weight?", answer: "Usually 1–2 kg — mostly water stored with glycogen. That's normal and the stored fuel helps you race." },
      { question: "Do I need carb loading for a half marathon?", answer: "Less so — a carb-rich dinner and breakfast usually suffice for races under 90 minutes." },
    ],
  },
  {
    slug: "triathlon-calculator",
    title: "Triathlon Calculator",
    description: "Predict your triathlon finish time — sprint, Olympic, 70.3 half Ironman or full Ironman — from swim pace, bike speed, run pace and transitions.",
    metaTitle: "Triathlon Calculator — Ironman & 70.3 Time",
    metaDescription: "Free triathlon time calculator. Predict sprint, Olympic, 70.3 and Ironman finish times from swim, bike, run and transitions.",
    calcInputs: [
      dropdown("race", "Race Distance", [["Sprint (750 m / 20 km / 5 km)", 1], ["Olympic (1.5 km / 40 km / 10 km)", 2], ["70.3 Half Ironman (1.9 km / 90 km / 21.1 km)", 3], ["Ironman (3.8 km / 180 km / 42.2 km)", 4]], 2),
      ...msFields("swimPace", "Swim Pace per 100 m", 2, 0),
      numberField("t1Minutes", "T1 (Swim to Bike, Minutes)", { default: 3, max: 30, step: 0.5 }),
      numberField("bikeKmh", "Bike Average Speed (km/h)", { default: 30, min: 5, max: 60, step: 0.5 }),
      numberField("t2Minutes", "T2 (Bike to Run, Minutes)", { default: 2, max: 30, step: 0.5 }),
      ...msFields("runPace", "Run Pace per km", 5, 30),
    ],
    calcResult: { label: "Finish Time", format: "number" },
    calcResults: [...hmsOut("finish", "Finish Time", true), num("swimMinutes", "Swim (Min)"), num("bikeMinutes", "Bike (Min)"), num("runMinutes", "Run (Min)"), num("transitionMinutes", "Transitions (Min)")],
    instructions: "Choose the race, then enter your expected swim pace per 100 m, bike speed, run pace per km (off the bike — usually slower than a stand-alone run) and transition times.",
    examples: "Example: an Olympic-distance triathlon at 2:00 per 100 m, 30 km/h on the bike, 5:30 per km running and 5 minutes of transitions finishes in 2:50:00 — 30 min swim, 80 min bike, 55 min run.",
    assumptions: "Standard distances: sprint 750 m/20 km/5 km; Olympic 1.5/40/10 km; 70.3 1.9/90/21.1 km; Ironman 3.8/180.2/42.2 km. Also covers the Ironman time and 70.3 time calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a good Ironman time?", answer: "Most age-groupers finish in 11–14 hours; under 10 hours is very competitive. The cut-off is usually 17 hours." },
      { question: "How much slower is running off the bike?", answer: "Typically 5–10% slower than your open-race pace for the same distance." },
    ],
  },
  {
    slug: "running-shoe-size-calculator",
    title: "Running Shoe Size Calculator",
    description: "Convert your foot length into running shoe sizes — US men's, US women's, UK and EU — with the extra room running shoes need.",
    metaTitle: "Running Shoe Size Calculator — US, UK, EU",
    metaDescription: "Free running shoe size calculator. Measure your foot and get US men's, US women's, UK and EU running shoe sizes.",
    calcInputs: [dropdown("unit", "Foot Length Unit", [["cm", 1], ["inches", 2]], 1), numberField("footLength", "Foot Length (Heel to Longest Toe)", { default: 26.5, min: 15, max: 35, step: 0.1 })],
    calcResult: { label: "US Men's Running Size", format: "number" },
    calcResults: [num("usMensRunning", "US Men's Running Size", true), num("usWomensRunning", "US Women's Running Size"), num("ukRunning", "UK Running Size"), num("euRunning", "EU Running Size"), num("mondopointMm", "Mondopoint (mm)"), num("usMensStreet", "US Men's Everyday Size")],
    instructions: "Stand on paper with your heel against a wall, mark the tip of your longest toe and measure in the late afternoon (feet swell). Measure both feet and use the longer one.",
    examples: "Example: a 26.5 cm foot is about a US men's 9.5 everyday shoe and a US men's 10 running shoe — US women's 11.5, UK 9.5, EU 43.",
    assumptions: "Brannock scale: US men's = 3 × foot length (in) − 22; women's = men's + 1.5; UK ≈ men's − 0.5; EU = 1.5 × (foot length + 1.5 cm). Running sizes add half a size for about a thumb's width (1–1.5 cm) of toe room. Brands differ — always try shoes on. " + DISCLAIMER,
    faq: [
      { question: "Should running shoes be bigger than normal shoes?", answer: "Usually half a size — feet swell and slide forward on long runs and downhills, so you need a thumb's width at the front." },
      { question: "Are shoe sizes the same across brands?", answer: "No — sizing and fit vary by brand and even by model. Use this as a starting point." },
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
