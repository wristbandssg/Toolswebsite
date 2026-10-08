// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the sports performance sub-batch D (Body Composition & Physique). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-body-composition.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-body-composition-calculators.ts
// or
//   npm run db:create-sports-body-composition-calculators

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
  "Estimates for general fitness planning only, not medical or nutrition advice. Body composition formulas have an error of several percentage points. Talk to a doctor or registered dietitian before big diet changes, especially with a health condition, during pregnancy or if you have a history of eating disorders.";

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
const ACTIVITY: [string, number][] = [
  ["Sedentary (little exercise)", 1],
  ["Light (1–3 sessions/week)", 2],
  ["Moderate (3–5 sessions/week)", 3],
  ["Very active (6–7 sessions/week)", 4],
  ["Athlete (2 sessions/day)", 5],
];
const EXPERIENCE: [string, number][] = [["Beginner (under 1 year)", 1], ["Intermediate (1–3 years)", 2], ["Advanced (3+ years)", 3]];
const MASS_NOTE = "Results come out in kg for metric and lb for imperial.";

const TOOLS: ToolDef[] = [
  {
    slug: "body-fat-percentage-calculator",
    title: "Body Fat Percentage Calculator",
    description: "Estimate your body fat percentage with the US Navy tape-measure method or a BMI-based formula, plus your fat mass, lean mass and fitness category.",
    metaTitle: "Body Fat Percentage Calculator — Navy & BMI Methods",
    metaDescription: "Free body fat percentage calculator. Estimate body fat with the Navy tape method or BMI formula, and see fat mass, lean mass and category.",
    calcInputs: [
      dropdown("method", "Method", [["US Navy (tape measure)", 1], ["BMI-based (no tape needed)", 2]], 1),
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      numberField("age", "Age", { default: 30, min: 15, max: 100 }),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("weight", "Weight", { default: 80, max: 400, step: 0.1 }),
      numberField("neck", "Neck Circumference (Navy)", { default: 38, max: 80, step: 0.5, required: false }),
      numberField("waist", "Waist Circumference (Navy)", { default: 86, max: 250, step: 0.5, required: false }),
      numberField("hip", "Hip Circumference (Navy, Women)", { default: 0, max: 250, step: 0.5, required: false }),
    ],
    calcResult: { label: "Body Fat", format: "percentage" },
    calcResults: [pct("bodyFatPercent", "Body Fat Percentage", true), num("fatMass", "Fat Mass"), num("leanMass", "Lean Mass"), num("aceCategory", "Category (1 Essential, 2 Athlete, 3 Fitness, 4 Average, 5 Obese)")],
    instructions: "Choose a method. For the Navy method, measure your neck below the larynx and your waist at the navel (men) or narrowest point (women); women also measure hips at the widest point. " + MASS_NOTE,
    examples: "Example: a 30-year-old man, 178 cm and 80 kg, with a 38 cm neck and 86 cm waist is about 17.3% body fat by the Navy method — 13.8 kg of fat and 66.2 kg lean mass, in the fitness category.",
    assumptions: "Navy method: Hodgdon & Beckett equations. BMI method: Deurenberg (1991). Both are estimates within about 3–4 percentage points; DEXA scans are more accurate. ACE categories — men: essential 2–5%, athletes 6–13%, fitness 14–17%, average 18–24%, obese 25%+; women: 10–13, 14–20, 21–24, 25–31, 32%+. " + DISCLAIMER,
    faq: [
      { question: "What is a healthy body fat percentage?", answer: "About 10–20% for men and 18–28% for women for most adults. Athletes are often lower, but going too low hurts health and performance." },
      { question: "Which method is most accurate?", answer: "Of the no-equipment methods, the tape method is better than BMI for muscular people. DEXA and hydrostatic weighing are the most accurate." },
    ],
  },
  {
    slug: "navy-body-fat-calculator",
    title: "Navy Body Fat Calculator",
    description: "Check your body fat with the US Navy tape test in inches and compare it with the Navy's maximum allowable body fat for your age and sex — pass or fail.",
    metaTitle: "Navy Body Fat Calculator — Tape Test Standards",
    metaDescription: "Free Navy body fat calculator. Run the Navy tape test with neck, waist and hip measurements and see if you pass your age's limit.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", [["Inches", 2], ["Centimetres", 1]], 2),
      numberField("age", "Age", { default: 25, min: 17, max: 70 }),
      numberField("height", "Height", { default: 70, max: 250, step: 0.5 }),
      numberField("neck", "Neck Circumference", { default: 15.5, max: 80, step: 0.5 }),
      numberField("waist", "Waist / Abdomen Circumference", { default: 34, max: 250, step: 0.5 }),
      numberField("hip", "Hip Circumference (Women)", { default: 0, max: 250, step: 0.5, required: false }),
    ],
    calcResult: { label: "Body Fat", format: "percentage" },
    calcResults: [pct("bodyFatPercent", "Body Fat (Rounded)", true), pct("maxAllowed", "Navy Maximum for Your Age"), num("passes", "Passes (1 = Yes)"), num("marginPercentPoints", "Margin (Percentage Points)"), pct("exactBodyFat", "Exact Body Fat")],
    instructions: "Measure height without shoes, neck just below the larynx, and abdomen at the navel (men) or waist at the narrowest point and hips at the widest (women). Measure to the nearest half inch.",
    examples: "Example: a 25-year-old man, 70 in tall, with a 15.5 in neck and 34 in waist is about 17% body fat (16.5% unrounded) — 6 points under the Navy's 23% limit for ages 22–29.",
    assumptions: "Hodgdon & Beckett circumference equations. Navy maximums — men: 22% (17–21), 23% (22–29), 24% (30–39), 26% (40+); women: 33%, 34%, 35%, 36%. The DoD updates its body composition rules from time to time — check the current OPNAV instruction for official use. " + DISCLAIMER,
    faq: [
      { question: "What happens if I fail the Navy tape test?", answer: "Sailors who exceed the limit are enrolled in the Fitness Enhancement Program and re-measured. Repeated failures can affect a career." },
      { question: "Is the tape test accurate?", answer: "It's usually within 3–4% of lab methods, but it can over-estimate body fat for people with a large waist and muscular build." },
    ],
  },
  {
    slug: "lean-body-mass-calculator",
    title: "Lean Body Mass Calculator",
    description: "Calculate your lean body mass with the Boer, James and Hume formulas — or exactly from your body fat percentage if you know it.",
    metaTitle: "Lean Body Mass Calculator — Boer, James, Hume",
    metaDescription: "Free lean body mass calculator. Estimate LBM with Boer, James and Hume formulas or from your body fat percentage.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("weight", "Weight", { default: 80, max: 400, step: 0.1 }),
      percentField("bodyFatPercent", "Body Fat % (Optional, 0 = Unknown)", { default: 0, max: 70, step: 0.5 }),
    ],
    calcResult: { label: "Lean Body Mass", format: "number" },
    calcResults: [num("leanBodyMass", "Lean Body Mass", true), num("boer", "Boer Formula"), num("james", "James Formula"), num("hume", "Hume Formula"), pct("leanPercent", "Lean Mass as % of Weight")],
    instructions: "Enter sex, height and weight. If you know your body fat percentage, enter it for the most accurate result. " + MASS_NOTE,
    examples: "Example: a man 178 cm and 80 kg has a lean body mass of about 60.9 kg by the Boer formula (76% of bodyweight); James gives 62.1 kg and Hume 57.1 kg.",
    assumptions: "Boer (1984), James (1976) and Hume (1966) formulas. They're designed for average builds and under-estimate lean mass in muscular athletes — use a body fat measurement when you can. " + DISCLAIMER,
    faq: [
      { question: "What is lean body mass?", answer: "Everything except fat — muscle, bone, organs and water." },
      { question: "Why does lean mass matter?", answer: "It drives your resting metabolism and is the best base for setting protein and calorie targets." },
    ],
  },
  {
    slug: "ffmi-calculator",
    title: "FFMI Calculator",
    description: "Calculate your fat-free mass index (FFMI) and normalised FFMI — how much muscle you carry for your height — and how you rate against natural limits.",
    metaTitle: "FFMI Calculator — Fat-Free Mass Index",
    metaDescription: "Free FFMI calculator. Get your fat-free mass index, normalised FFMI and rating from height, weight and body fat percentage.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("weight", "Weight", { default: 80, max: 400, step: 0.1 }),
      percentField("bodyFatPercent", "Body Fat %", { default: 15, max: 70, step: 0.5 }),
    ],
    calcResult: { label: "FFMI", format: "number" },
    calcResults: [num("ffmi", "FFMI", true), num("normalizedFfmi", "Normalised FFMI (to 1.8 m)"), num("fatFreeMass", "Fat-Free Mass"), num("rating", "Rating (1 Below Avg … 5 Superior, 6 Suspicious)")],
    instructions: "Enter height, weight and body fat percentage. " + MASS_NOTE,
    examples: "Example: a man 178 cm and 80 kg at 15% body fat has 68 kg of fat-free mass — an FFMI of 21.5 (21.6 normalised), above average.",
    assumptions: "FFMI = fat-free mass (kg) ÷ height (m)². Normalised FFMI adds 6.1 × (1.8 − height) to compare people of different heights. Men's ratings: <18 below average, 18–20 average, 20–22 above average, 22–23 excellent, 23–26 superior, 26+ rarely reached naturally. Women's thresholds are about 4 lower. " + DISCLAIMER,
    faq: [
      { question: "What is the natural FFMI limit?", answer: "About 25 for men in Kouri's 1995 study of drug-free athletes. A few genetically gifted lifters exceed it naturally." },
      { question: "Is FFMI better than BMI?", answer: "For lifters, yes — BMI can't tell muscle from fat, FFMI only counts fat-free mass." },
    ],
  },
  {
    slug: "muscle-gain-calculator",
    title: "Muscle Gain Calculator",
    description: "Estimate how much muscle you can realistically gain per month and over a period, based on training experience, and how far you are from your natural limit.",
    metaTitle: "Muscle Gain Calculator — Natural Muscle Potential",
    metaDescription: "Free muscle gain calculator. See realistic natural muscle gain per month by training age and your room to your natural limit.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      dropdown("experience", "Training Experience", EXPERIENCE, 1),
      numberField("weight", "Bodyweight", { default: 75, max: 400, step: 0.1 }),
      numberField("months", "Months of Training", { default: 12, min: 1, max: 60 }),
      numberField("height", "Height (for Natural Limit)", { default: 178, max: 250, step: 0.5, required: false }),
      percentField("bodyFatPercent", "Body Fat % (for Natural Limit)", { default: 15, max: 70, step: 0.5 }),
    ],
    calcResult: { label: "Muscle Gain", format: "number" },
    calcResults: [num("gainOverPeriodLow", "Gain Over Period (Low)", true), num("gainOverPeriodHigh", "Gain Over Period (High)"), num("monthlyGainLow", "Monthly Gain (Low)"), num("monthlyGainHigh", "Monthly Gain (High)"), num("naturalCeilingLeanMass", "Natural Ceiling Lean Mass"), num("roomToNaturalCeiling", "Room Left to Natural Ceiling")],
    instructions: "Choose sex, units and training experience, and enter bodyweight and the months ahead. Add height and body fat to see your natural limit. " + MASS_NOTE,
    examples: "Example: a 75 kg male beginner can gain about 0.75–1.1 kg of muscle a month — 9–13.5 kg in the first year of good training. At 178 cm and 15% fat, his natural ceiling is about 78.8 kg of lean mass, 15 kg above today.",
    assumptions: "Alan Aragon's model: beginners gain 1–1.5% of bodyweight a month, intermediates 0.5–1%, advanced 0.25–0.5%; women about half. Gains slow each year — treat a 12+ month projection at a fixed rate as an upper bound. Natural ceiling = normalised FFMI 25 (men) or 21 (women). " + DISCLAIMER,
    faq: [
      { question: "How fast can a beginner build muscle?", answer: "About 0.5–1 kg (1–2 lb) a month for men in the first year, roughly half that for women, with good training, protein and sleep." },
      { question: "Why does muscle gain slow down?", answer: "The closer you get to your genetic potential, the smaller the signal each workout gives. Advanced lifters may gain only 1–2 kg a year." },
    ],
  },
  {
    slug: "bulking-calculator",
    title: "Bulking Calculator",
    description: "Plan a lean bulk: daily calories, surplus, weekly weight gain target, macros and weeks to reach your goal weight, adjusted for training experience.",
    metaTitle: "Bulking Calculator — Lean Bulk Calories & Macros",
    metaDescription: "Free bulking calculator. Get lean bulk calories, surplus, weekly gain rate, macros and weeks to goal weight.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      numberField("age", "Age", { default: 30, min: 15, max: 100 }),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("weight", "Current Weight", { default: 80, max: 400, step: 0.1 }),
      numberField("goalWeight", "Goal Weight", { default: 86, max: 400, step: 0.1 }),
      dropdown("activity", "Activity Level", ACTIVITY, 3),
      dropdown("experience", "Training Experience", EXPERIENCE, 1),
    ],
    calcResult: { label: "Daily Calories", format: "number" },
    calcResults: [num("targetCalories", "Daily Calories for a Lean Bulk", true), num("maintenanceCalories", "Maintenance Calories"), num("dailySurplus", "Daily Surplus"), num("weeklyGain", "Target Weekly Gain"), num("weeksToGoal", "Weeks to Goal Weight"), num("proteinGrams", "Protein (g)"), num("carbGrams", "Carbs (g)"), num("fatGrams", "Fat (g)")],
    instructions: "Enter your details, goal weight, activity level and training experience. Weigh yourself weekly and adjust calories by about 100–200 if you gain faster or slower than the target. " + MASS_NOTE,
    examples: "Example: a 30-year-old man, 178 cm and 80 kg, moderately active and new to lifting, maintains on about 2,740 kcal. A lean bulk is about 2,900 kcal for 0.23 kg a week — around 26 weeks to reach 86 kg — with 144 g protein, 401 g carbs and 81 g fat.",
    assumptions: "Maintenance by Mifflin-St Jeor × activity. Weekly gain target: beginners 1.25%, intermediates 0.75%, advanced 0.4% of bodyweight a month. Surplus ≈ 5,000 kcal per kg gained. Protein 1.8 g/kg, fat ≥25% of calories. " + DISCLAIMER,
    faq: [
      { question: "How fast should I bulk?", answer: "Beginners about 0.25–0.5 kg (0.5–1 lb) a week; intermediates and advanced lifters slower, or most of the extra weight is fat." },
      { question: "What is a lean bulk?", answer: "A small calorie surplus that adds muscle with as little fat as possible, instead of eating everything in sight (a dirty bulk)." },
    ],
  },
  {
    slug: "cutting-calculator",
    title: "Cutting Calculator",
    description: "Plan a cut to lose fat and keep muscle: daily calories, deficit, weekly loss rate, high-protein macros and weeks to your goal weight.",
    metaTitle: "Cutting Calculator — Calories & Macros to Cut",
    metaDescription: "Free cutting calculator. Get cutting calories, deficit, weekly fat loss, high-protein macros and weeks to your goal weight.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unitSystem", "Units", UNITS, 1),
      numberField("age", "Age", { default: 30, min: 15, max: 100 }),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("weight", "Current Weight", { default: 80, max: 400, step: 0.1 }),
      numberField("goalWeight", "Goal Weight", { default: 74, max: 400, step: 0.1 }),
      dropdown("activity", "Activity Level", ACTIVITY, 3),
      percentField("weeklyLossPercent", "Weekly Loss (% of Bodyweight)", { default: 0.75, min: 0.25, max: 1.5, step: 0.25 }),
    ],
    calcResult: { label: "Daily Calories", format: "number" },
    calcResults: [num("targetCalories", "Daily Calories for the Cut", true), num("maintenanceCalories", "Maintenance Calories"), num("dailyDeficit", "Daily Deficit"), num("weeklyLoss", "Weekly Loss"), num("weeksToGoal", "Weeks to Goal Weight"), num("proteinGrams", "Protein (g)"), num("carbGrams", "Carbs (g)"), num("fatGrams", "Fat (g)")],
    instructions: "Enter your details, goal weight, activity and how fast to lose — 0.5–1% of bodyweight a week keeps muscle best. " + MASS_NOTE,
    examples: "Example: an 80 kg man maintaining on 2,740 kcal who loses 0.75% a week eats about 2,080 kcal (a 660 kcal deficit), losing 0.6 kg a week and reaching 74 kg in about 10 weeks — with 176 g protein, 214 g carbs and 58 g fat.",
    assumptions: "Maintenance by Mifflin-St Jeor × activity. ~7,700 kcal per kg of fat. Protein 2.2 g/kg to protect muscle, fat ≥25% of calories. Calories never go below 1,200. Loss slows as you get lighter — re-run the calculator every few weeks. " + DISCLAIMER,
    faq: [
      { question: "How fast should I cut?", answer: "0.5–1% of bodyweight a week. Faster cuts lose more muscle and make training harder." },
      { question: "Why so much protein on a cut?", answer: "High protein (about 2–2.5 g/kg) is the strongest dietary signal to keep muscle while in a calorie deficit." },
    ],
  },
  {
    slug: "protein-for-muscle-gain-calculator",
    title: "Protein for Muscle Gain Calculator",
    description: "Find how much protein you need a day to build muscle, maintain or cut, and how much to eat per meal for maximum muscle growth.",
    metaTitle: "Protein for Muscle Gain Calculator — Grams per Day",
    metaDescription: "Free protein calculator for muscle gain. Get daily protein (g/kg) for building, maintaining or cutting and protein per meal.",
    calcInputs: [
      dropdown("unit", "Weight Unit", [["kg", 1], ["lb", 2]], 1),
      numberField("weight", "Bodyweight", { default: 80, max: 400, step: 0.1 }),
      dropdown("goal", "Goal", [["Build muscle", 1], ["Maintain", 2], ["Cut (lose fat, keep muscle)", 3]], 1),
      numberField("meals", "Protein Meals per Day", { default: 4, min: 1, max: 8 }),
    ],
    calcResult: { label: "Daily Protein", format: "number" },
    calcResults: [num("dailyProteinTarget", "Daily Protein Target (g)", true), num("dailyProteinLow", "Daily Range Low (g)"), num("dailyProteinHigh", "Daily Range High (g)"), num("perMeal", "Per Meal at Your Meal Count (g)"), num("perMealOptimal", "Optimal per Meal (0.4 g/kg)")],
    instructions: "Enter your bodyweight, goal and how many protein-containing meals you eat a day.",
    examples: "Example: an 80 kg lifter building muscle needs about 128–176 g of protein a day — 152 g as a target, or 38 g at each of 4 meals.",
    assumptions: "ISSN position: 1.6–2.2 g/kg/day to build muscle, 1.2–1.6 to maintain, 2.0–2.7 when cutting. About 0.4 g/kg per meal, spread over 4+ meals, maximises muscle protein synthesis. " + DISCLAIMER,
    faq: [
      { question: "Is more than 2.2 g/kg useful?", answer: "For muscle gain on a calorie surplus, little extra benefit has been shown above about 1.6–2.2 g/kg. It helps more during a cut." },
      { question: "Is a high-protein diet safe?", answer: "For healthy people, yes. People with kidney disease should follow their doctor's advice." },
    ],
  },
  {
    slug: "creatine-dose-calculator",
    title: "Creatine Dose Calculator",
    description: "Work out your creatine monohydrate dose — the loading phase by bodyweight and the daily maintenance dose — and how long saturation takes without loading.",
    metaTitle: "Creatine Dose Calculator — Loading & Maintenance",
    metaDescription: "Free creatine dose calculator. Get your creatine loading dose (0.3 g/kg) and daily maintenance dose by bodyweight.",
    calcInputs: [dropdown("unit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("weight", "Bodyweight", { default: 80, max: 400, step: 0.1 }), numberField("loadingDays", "Loading Days (5–7)", { default: 5, min: 5, max: 7 })],
    calcResult: { label: "Maintenance Dose", format: "number" },
    calcResults: [num("maintenanceDose", "Daily Maintenance Dose (g)", true), num("loadingDailyDose", "Loading Dose per Day (g)"), num("loadingPerServing", "Loading Dose per Serving, 4 a Day (g)"), num("loadingDays", "Loading Days"), num("loadingPhaseTotal", "Total Creatine in Loading Phase (g)"), num("daysToSaturationWithoutLoading", "Days to Saturate Without Loading")],
    instructions: "Enter your bodyweight. Loading is optional — it simply fills your muscles faster.",
    examples: "Example: an 80 kg person can load with 24 g a day (four 6 g servings) for 5 days, then take 3 g a day. Skipping the load, 3 g a day saturates the muscles in about 4 weeks.",
    assumptions: "ISSN guidance: load 0.3 g/kg/day for 5–7 days, maintain at 3–5 g/day (0.03 g/kg, minimum 3 g). Applies to creatine monohydrate. " + DISCLAIMER,
    faq: [
      { question: "Do I need to load creatine?", answer: "No. Loading reaches full saturation in about a week; 3–5 g a day gets there in about 4 weeks with the same end result." },
      { question: "When should I take creatine?", answer: "Timing matters little — take it daily at a convenient time, ideally with a meal." },
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
