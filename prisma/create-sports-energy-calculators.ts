// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the sports performance sub-batch E (Energy, Nutrition & Cardio). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-energy.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-energy-calculators.ts
// or
//   npm run db:create-sports-energy-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Sports Performance Calculators", slug: "sports-performance-calculators" };

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
  "Estimates for general fitness and sports nutrition planning only, not medical advice. Energy formulas can be off by 10% or more for an individual. Check with a doctor before hard exercise if you have a heart condition or other health concern, and with a sports dietitian for personal nutrition plans.";

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

const SEX: [string, number][] = [["Male", 1], ["Female", 2]];
const UNITS: [string, number][] = [["Metric (kg, cm)", 1], ["Imperial (lb, in)", 2]];
const WUNIT: [string, number][] = [["kg", 1], ["lb", 2]];
const BODY_FIELDS = [
  dropdown("sex", "Sex", SEX, 1),
  dropdown("unitSystem", "Units", UNITS, 1),
  numberField("age", "Age", { default: 25, min: 13, max: 100 }),
  numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
  numberField("weight", "Weight", { default: 75, max: 400, step: 0.1 }),
  percentField("bodyFatPercent", "Body Fat % (Optional, 0 = Unknown)", { default: 0, max: 60, step: 0.5 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "energy-availability-calculator",
    title: "Energy Availability Calculator",
    description: "Check your energy availability — the calories left for your body after training, per kg of fat-free mass — to spot low energy availability and RED-S risk.",
    metaTitle: "Energy Availability Calculator — RED-S Check",
    metaDescription: "Free energy availability calculator for athletes. Find calories left after exercise per kg of fat-free mass and your RED-S risk.",
    calcInputs: [
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 60, max: 400, step: 0.1 }),
      percentField("bodyFatPercent", "Body Fat %", { default: 20, max: 60, step: 0.5 }),
      numberField("energyIntake", "Daily Calorie Intake (kcal)", { default: 2200, max: 10000, step: 10 }),
      numberField("exerciseEnergy", "Daily Exercise Calories (kcal)", { default: 600, max: 6000, step: 10 }),
    ],
    calcResult: { label: "Energy Availability", format: "number" },
    calcResults: [num("energyAvailability", "Energy Availability (kcal/kg FFM/day)", true), num("status", "Status (1 Low, 2 Reduced, 3 Optimal)"), num("fatFreeMass", "Fat-Free Mass"), num("intakeForOptimal", "Intake for Optimal EA (kcal)"), num("intakeForMinimum", "Intake for the 30 kcal/kg Minimum")],
    instructions: "Enter bodyweight and body fat, your average daily food intake and the calories your training burns on an average day (a sports watch estimate is fine).",
    examples: "Example: a 60 kg athlete at 20% body fat (48 kg fat-free mass) eating 2,200 kcal and burning 600 in training has 33.3 kcal/kg FFM — reduced. Eating about 2,760 kcal would restore optimal energy availability.",
    assumptions: "EA = (intake − exercise energy) ÷ fat-free mass. Below 30 kcal/kg FFM/day is low energy availability, linked to hormonal, bone and performance problems (RED-S); 45+ is optimal for health. " + DISCLAIMER,
    faq: [
      { question: "What is RED-S?", answer: "Relative Energy Deficiency in Sport — health and performance problems caused by not eating enough for the training you do, affecting hormones, bones, immunity and recovery." },
      { question: "Who is most at risk of low energy availability?", answer: "Endurance, aesthetic and weight-class athletes, and anyone training hard while dieting." },
    ],
  },
  {
    slug: "bmr-for-athletes-calculator",
    title: "BMR for Athletes Calculator",
    description: "Calculate basal metabolic rate the athlete way — Cunningham and Katch-McArdle (lean-mass based) alongside Mifflin-St Jeor and Harris-Benedict.",
    metaTitle: "BMR for Athletes Calculator — Cunningham Formula",
    metaDescription: "Free BMR calculator for athletes. Compare Cunningham, Katch-McArdle, Mifflin-St Jeor and Harris-Benedict resting metabolic rates.",
    calcInputs: BODY_FIELDS,
    calcResult: { label: "BMR (Cunningham)", format: "number" },
    calcResults: [num("bmrCunningham", "BMR — Cunningham (Athletes)", true), num("bmrKatchMcArdle", "BMR — Katch-McArdle"), num("bmrMifflin", "BMR — Mifflin-St Jeor"), num("bmrHarrisBenedict", "BMR — Harris-Benedict"), num("leanBodyMass", "Lean Body Mass Used")],
    instructions: "Enter your details. Body fat percentage makes the lean-mass formulas much more accurate for muscular athletes; without it, lean mass is estimated with the Boer formula.",
    examples: "Example: a 25-year-old man, 178 cm and 75 kg, burns about 1,795 kcal a day at rest by the Cunningham formula, 1,743 by Mifflin-St Jeor and 1,805 by Harris-Benedict.",
    assumptions: "Cunningham: 500 + 22 × lean mass (kg). Katch-McArdle: 370 + 21.6 × lean mass. Mifflin-St Jeor and the revised Harris-Benedict use weight, height, age and sex. Muscular athletes usually have a higher BMR than general formulas predict. " + DISCLAIMER,
    faq: [
      { question: "Which BMR formula is best for athletes?", answer: "Cunningham, because it's based on lean mass — athletes carry more muscle than the general population the other formulas were built on." },
      { question: "Is BMR the calories I need?", answer: "No — it's only what you burn at complete rest. Use the TDEE for Athletes Calculator for your full daily needs." },
    ],
  },
  {
    slug: "tdee-for-athletes-calculator",
    title: "TDEE for Athletes Calculator",
    description: "Estimate total daily energy expenditure for athletes — resting needs and daily activity plus the real calorie cost of your weekly training hours.",
    metaTitle: "TDEE for Athletes Calculator — Daily Calories",
    metaDescription: "Free TDEE calculator for athletes. Combine BMR, daily activity and training hours by intensity to get your full daily calorie burn.",
    calcInputs: [
      ...BODY_FIELDS,
      dropdown("dailyActivity", "Activity Outside Training", [["Desk job, little walking", 1], ["Some walking / on feet part of the day", 2], ["On feet most of the day", 3], ["Physical job", 4]], 2),
      numberField("trainingHoursPerWeek", "Training Hours per Week", { default: 8, max: 50, step: 0.5 }),
      dropdown("trainingIntensity", "Typical Training Intensity", [["Light (technique, easy cardio)", 1], ["Moderate (team practice, steady runs)", 2], ["Hard (intervals, lifting, games)", 3], ["Very hard (racing pace, high-level sport)", 4]], 2),
      numberField("trainingDays", "Training Days per Week", { default: 5, min: 1, max: 7 }),
    ],
    calcResult: { label: "TDEE", format: "number" },
    calcResults: [num("tdee", "Average Daily Calories (TDEE)", true), num("bmr", "BMR Used"), num("nonTrainingCalories", "Calories Without Training"), num("trainingCaloriesPerDay", "Training Calories (Daily Average)"), num("trainingDayCalories", "Calories on a Training Day")],
    instructions: "Enter your body details, how active you are outside training, and your weekly training hours and intensity.",
    examples: "Example: a 25-year-old man, 178 cm and 75 kg, training 8 hours a week at moderate intensity over 5 days burns about 2,954 kcal a day on average — about 3,160 on training days.",
    assumptions: "BMR: Cunningham when body fat is entered, otherwise Mifflin-St Jeor. Non-training activity multiplier 1.3–1.6. Training cost = (MET − 1) × kg × hours, with MET 5/7/9/11 for the four intensities. " + DISCLAIMER,
    faq: [
      { question: "Why not use a normal TDEE calculator?", answer: "General calculators lump training into a vague activity level. Athletes' training volume varies a lot, so counting training hours directly is more accurate." },
      { question: "Should I eat more on training days?", answer: "Many athletes do — matching carbs and calories to the day's training supports performance and recovery." },
    ],
  },
  {
    slug: "macro-for-athletes-calculator",
    title: "Macro for Athletes Calculator",
    description: "Set athlete macros: carbohydrates by training load (g/kg), protein by bodyweight and fat for the rest of your calories, with gram and percentage targets.",
    metaTitle: "Macro Calculator for Athletes — Carbs by Training Load",
    metaDescription: "Free macro calculator for athletes. Get carbs by training load, protein and fat in grams and percent for your calorie target.",
    calcInputs: [
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("calories", "Daily Calories (kcal)", { default: 3000, max: 10000, step: 10 }),
      dropdown("trainingLoad", "Training Load", [["Light — about 1 h/day easy (4 g/kg carbs)", 1], ["Moderate — about 1 h/day (6 g/kg)", 2], ["High — 1–3 h/day (8 g/kg)", 3], ["Very high — 4+ h/day (10 g/kg)", 4]], 2),
      numberField("proteinPerKg", "Protein (g per kg)", { default: 1.8, min: 1.2, max: 3, step: 0.1 }),
    ],
    calcResult: { label: "Carbs", format: "number" },
    calcResults: [num("carbGrams", "Carbohydrates (g)", true), num("proteinGrams", "Protein (g)"), num("fatGrams", "Fat (g)"), pct("carbPercent", "Carbs % of Calories"), pct("proteinPercent", "Protein % of Calories"), pct("fatPercent", "Fat % of Calories"), num("carbsPerKg", "Carbs per kg")],
    instructions: "Enter bodyweight, your daily calorie target (from the TDEE for Athletes Calculator) and your training load.",
    examples: "Example: a 75 kg athlete eating 3,000 kcal with moderate training gets 450 g carbs (6 g/kg, 60%), 135 g protein (18%) and 73 g fat (22%).",
    assumptions: "Carbohydrate targets follow the IOC/ACSM sports nutrition ranges. Fat is never set below 20% of calories; if calories are too low for the carb target, carbs are reduced first. " + DISCLAIMER,
    faq: [
      { question: "Why base carbs on training load?", answer: "Carbs fuel hard training. Needs scale with how much you train, so grams per kg of bodyweight is more useful than a fixed percentage." },
      { question: "Is low-carb bad for athletes?", answer: "For high-intensity and endurance sports, low carb usually hurts performance. Some low-intensity athletes do fine on less." },
    ],
  },
  {
    slug: "calories-burned-by-activity-calculator",
    title: "Calories Burned by Activity Calculator",
    description: "Calculate calories burned for 24 activities — running, cycling, swimming, sports and more — from MET values, your weight and duration (also a MET calculator).",
    metaTitle: "Calories Burned by Activity Calculator — MET",
    metaDescription: "Free calories burned calculator. Pick from 24 activities or enter a MET value to get calories burned, kcal per hour and MET-minutes.",
    calcInputs: [
      dropdown(
        "activity",
        "Activity",
        [
          ["Walking, 3 mph", 1], ["Walking, 4 mph (brisk)", 2], ["Hiking", 3], ["Running, 5 mph (12 min/mile)", 4], ["Running, 6 mph (10 min/mile)", 5], ["Running, 8 mph (7.5 min/mile)", 6],
          ["Cycling, 12–14 mph", 7], ["Cycling, 14–16 mph", 8], ["Stationary bike, moderate", 9], ["Swimming laps, moderate", 10], ["Swimming laps, vigorous", 11], ["Elliptical, moderate", 12],
          ["Rowing machine, moderate", 13], ["Jump rope", 14], ["Stair climbing", 15], ["Circuit training / HIIT", 16], ["Weight training, vigorous", 17], ["Yoga", 18],
          ["Aerobic dance", 19], ["Basketball game", 20], ["Soccer, competitive", 21], ["Tennis, singles", 22], ["Boxing, sparring", 23], ["Golf, walking", 24],
        ],
        5
      ),
      numberField("customMet", "Or Enter a MET Value (0 = Use Activity)", { default: 0, max: 25, step: 0.1, required: false }),
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("minutes", "Duration (Minutes)", { default: 30, max: 600 }),
    ],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("caloriesBurned", "Calories Burned", true), num("caloriesPerHour", "Calories per Hour"), num("metValue", "MET Value Used"), num("metMinutes", "MET-Minutes")],
    instructions: "Pick an activity (or enter a MET value from another source), then your bodyweight and how long you did it.",
    examples: "Example: a 75 kg person running at 6 mph (9.8 METs) for 30 minutes burns about 386 kcal — 772 an hour.",
    assumptions: "Calories per minute = MET × 3.5 × kg ÷ 200. MET values from the 2011 Compendium of Physical Activities. Real burn varies with fitness, terrain and effort. " + DISCLAIMER,
    faq: [
      { question: "What is a MET?", answer: "A metabolic equivalent — the energy cost of an activity compared with sitting still (1 MET). Running at 6 mph is about 9.8 METs." },
      { question: "Are fitness tracker calories more accurate?", answer: "Trackers using heart rate can be closer for you personally, but they often over-estimate. MET estimates are a good, consistent baseline." },
    ],
  },
  {
    slug: "weightlifting-calories-burned-calculator",
    title: "Weightlifting Calories Burned Calculator",
    description: "Estimate calories burned lifting weights, by intensity and workout length, including the after-burn (EPOC) from resistance training.",
    metaTitle: "Weightlifting Calories Burned Calculator",
    metaDescription: "Free weightlifting calories burned calculator. Estimate calories for light to circuit-style lifting, plus the after-burn effect.",
    calcInputs: [
      dropdown("unit", "Weight Unit", WUNIT, 1),
      numberField("weight", "Bodyweight", { default: 80, max: 400, step: 0.1 }),
      numberField("minutes", "Workout Length (Minutes)", { default: 60, max: 300 }),
      dropdown("intensity", "Workout Style", [["Light (machines, long rests)", 1], ["Moderate (typical gym session)", 2], ["Vigorous (heavy compounds, short rests)", 3], ["Circuit (little rest between exercises)", 4]], 2),
    ],
    calcResult: { label: "Total Calories", format: "number" },
    calcResults: [num("totalCalories", "Total Calories (Incl. After-Burn)", true), num("caloriesDuringWorkout", "During the Workout"), num("afterburnCalories", "After-Burn (EPOC)"), num("caloriesPerHour", "Calories per Hour")],
    instructions: "Enter bodyweight, workout length and the style of session.",
    examples: "Example: an 80 kg lifter doing a moderate 60-minute session burns about 420 kcal, plus about 42 kcal of after-burn — 462 in total.",
    assumptions: "MET 3.5 / 5.0 / 6.0 / 8.0 for the four styles (2011 Compendium). After-burn estimated at 10% of workout calories (studies range about 6–15%). " + DISCLAIMER,
    faq: [
      { question: "Does lifting burn as many calories as cardio?", answer: "Per minute, usually fewer — but lifting builds muscle, which raises daily energy use, and it adds an after-burn." },
      { question: "What is EPOC?", answer: "Excess post-exercise oxygen consumption — the extra energy your body uses to recover after a workout." },
    ],
  },
  {
    slug: "target-heart-rate-calculator",
    title: "Target Heart Rate Calculator",
    description: "Find your target heart rate range with the Karvonen method and your training zones — fat-burning zone, aerobic and anaerobic — from age and resting heart rate.",
    metaTitle: "Target Heart Rate Calculator — Fat Burning Zone",
    metaDescription: "Free target heart rate calculator. Karvonen target range and training zones, including the fat-burning zone, from age and resting HR.",
    calcInputs: [
      numberField("age", "Age", { default: 30, min: 10, max: 100 }),
      numberField("restingHr", "Resting Heart Rate (bpm)", { default: 65, min: 30, max: 120 }),
      dropdown("maxHrFormula", "Max Heart Rate", [["220 − age", 1], ["Tanaka: 208 − 0.7 × age", 2], ["I know my measured max", 3]], 1),
      numberField("measuredMaxHr", "Measured Max HR (if Known)", { default: 0, max: 230, required: false }),
      percentField("intensityLow", "Target Intensity Low", { default: 60, min: 30, max: 100, step: 5 }),
      percentField("intensityHigh", "Target Intensity High", { default: 80, min: 30, max: 100, step: 5 }),
    ],
    calcResult: { label: "Target Range Low", format: "number" },
    calcResults: [
      num("targetLow", "Target Heart Rate Low (bpm)", true),
      num("targetHigh", "Target Heart Rate High (bpm)"),
      num("maxHeartRate", "Max Heart Rate"),
      num("heartRateReserve", "Heart Rate Reserve"),
      num("fatBurningZoneLow", "Fat-Burning Zone Low (60%)"),
      num("fatBurningZoneHigh", "Fat-Burning Zone High (70%)"),
      num("aerobicZoneLow", "Aerobic Zone Low (70%)"),
      num("aerobicZoneHigh", "Aerobic Zone High (80%)"),
      num("anaerobicZoneLow", "Anaerobic Zone Low (80%)"),
      num("anaerobicZoneHigh", "Anaerobic Zone High (90%)"),
    ],
    instructions: "Enter your age and resting heart rate (count your pulse for a minute before getting up in the morning). Choose a max heart rate formula, or enter a measured max.",
    examples: "Example: a 30-year-old with a resting heart rate of 65 has an estimated max of 190 and a target of 140–165 bpm at 60–80% intensity. The fat-burning zone is 140–153 bpm.",
    assumptions: "Karvonen: target = resting HR + (max HR − resting HR) × intensity. The fat-burning zone (60–70%) burns the highest share of calories from fat, but higher intensities burn more total calories. Also covers the fat burning zone calculator. " + DISCLAIMER,
    faq: [
      { question: "Is the fat-burning zone best for weight loss?", answer: "Not necessarily. It burns a higher percentage of fat, but harder exercise burns more total calories — and total calorie balance drives fat loss." },
      { question: "Why use resting heart rate?", answer: "The Karvonen method accounts for fitness: a fitter person with a low resting heart rate gets zones that match their real effort." },
    ],
  },
  {
    slug: "vo2-max-calculator",
    title: "VO2 Max Calculator",
    description: "Estimate your VO2 max four ways — heart-rate ratio, Cooper 12-minute run, Rockport 1-mile walk or 1.5-mile run — with METs and the equivalent Cooper distance.",
    metaTitle: "VO2 Max Calculator — Cooper, Rockport & HR Methods",
    metaDescription: "Free VO2 max calculator. Estimate VO2 max from heart rate, a 12-minute run, the Rockport walk test or a 1.5-mile run.",
    calcInputs: [
      dropdown("method", "Method", [["Heart rate ratio (max ÷ resting)", 1], ["Cooper 12-minute run", 2], ["Rockport 1-mile walk", 3], ["1.5-mile run", 4]], 1),
      numberField("maxHr", "Max Heart Rate (HR Method)", { default: 190, max: 230, required: false }),
      numberField("restingHr", "Resting Heart Rate (HR Method)", { default: 60, min: 30, max: 120, required: false }),
      numberField("distanceMeters", "Distance in 12 Minutes, m (Cooper)", { default: 2400, max: 5000, step: 10, required: false }),
      dropdown("sex", "Sex (Rockport)", [["Male", 1], ["Female", 2]], 1),
      numberField("age", "Age (Rockport)", { default: 30, min: 10, max: 100, required: false }),
      dropdown("unit", "Weight Unit (Rockport)", WUNIT, 1),
      numberField("weight", "Bodyweight (Rockport)", { default: 75, max: 400, step: 0.1, required: false }),
      numberField("timeMinutes", "Time in Minutes (Rockport Walk or 1.5-Mile Run)", { default: 12, max: 60, step: 0.1, required: false }),
      numberField("finishHr", "Heart Rate at Finish (Rockport)", { default: 130, max: 230, required: false }),
    ],
    calcResult: { label: "VO2 Max", format: "number" },
    calcResults: [num("vo2Max", "VO2 Max (ml/kg/min)", true), num("mets", "Aerobic Capacity in METs"), num("cooperDistanceMeters", "Equivalent Cooper 12-Min Distance (m)")],
    instructions: "Choose a method and fill in only the fields it uses. For the 1.5-mile run and Rockport walk, enter the time as minutes with decimals (12.5 = 12:30).",
    examples: "Example: a max heart rate of 190 and a resting heart rate of 60 estimate a VO2 max of 48.5 ml/kg/min — about 13.8 METs, like covering 2,672 m in Cooper's 12-minute run.",
    assumptions: "Uth–Sørensen (15.3 × max/resting HR), Cooper (distance − 504.9) ÷ 44.73, Rockport (Kline et al. 1987) and the 1.5-mile run (3.5 + 483 ÷ minutes). Field tests are within about 10% of lab tests for most people. " + DISCLAIMER,
    faq: [
      { question: "What is a good VO2 max?", answer: "For adults 20–39, roughly 40+ for men and 35+ for women is good; elite endurance athletes reach 70–85." },
      { question: "Can I improve my VO2 max?", answer: "Yes — interval training and consistent aerobic work typically raise it 5–20% over a few months." },
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
