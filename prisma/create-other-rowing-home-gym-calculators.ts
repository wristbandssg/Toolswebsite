// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the other-sports sub-batch "Rowing, Home Gym & Jump Rope". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-rowing-home-gym.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-rowing-home-gym-calculators.ts
// or
//   npm run db:create-other-rowing-home-gym-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const SPLIT = (m = 2, s = 0) => [numberField("splitMinutes", "Split per 500 m — Minutes", { default: m, max: 10 }), numberField("splitSeconds", "Split per 500 m — Seconds", { default: s, max: 59.9, step: 0.1 })];
const WT = (def = 170) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 500 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];

const TOOLS: ToolDef[] = [
  {
    slug: "watts-to-split-calculator",
    title: "Watts to Split Calculator",
    description: "Convert rowing machine watts to a 500 m split — or a split to watts — with the Concept2 formula.",
    metaTitle: "Watts to Split Calculator — Rowing Machine",
    metaDescription: "Free watts to split calculator. Convert erg watts to 500 m split and back, plus your 2K time at that pace.",
    calcInputs: [dropdown("direction", "Convert", [["Watts → split", 1], ["Split → watts", 2]], 1), numberField("watts", "Watts", { default: 200, min: 1, max: 2000 }), ...SPLIT()],
    calcResult: { label: "Split", format: "number" },
    calcResults: [num("splitSeconds", "Split per 500 m (s)", true), num("splitMinutes", "Split — Minutes"), num("splitRemainderSeconds", "Split — Seconds"), num("watts", "Watts"), num("time2kMinutes", "2,000 m Time at This Pace (min)")],
    instructions: "Choose the direction and enter watts or a 500 m split.",
    examples: "Example: 200 W ≈ a 2:00.5 split; a 2:00.0 split = 202.5 W — an 8:00 2K.",
    assumptions: "Concept2: watts = 2.80 ÷ (pace in seconds per metre)³, so doubling power improves the split by only about 21%. " + DISCLAIMER,
    faq: [
      { question: "Why does a little faster split need so much more power?", answer: "Power rises with the cube of speed on the erg." },
      { question: "What is a good 500 m split?", answer: "Around 2:00 is a solid fitness pace; elite rowers race under 1:30." },
    ],
  },
  {
    slug: "rowing-machine-distance-calculator",
    title: "Rowing Machine Distance Calculator",
    description: "Calculate how far you row from your 500 m split and time — metres, km and miles.",
    metaTitle: "Rowing Machine Distance Calculator — Metres from Split",
    metaDescription: "Free rowing machine distance calculator. Get metres, km and miles from your 500 m split and workout time.",
    calcInputs: [...SPLIT(), numberField("minutes", "Workout Time (min)", { default: 20, min: 0.5, max: 600, step: 0.5 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMetres", "Distance (m)", true), num("distanceKm", "Distance (km)"), num("distanceMiles", "Distance (miles)"), num("watts", "Average Watts")],
    instructions: "Enter your average split per 500 m and how long you rowed.",
    examples: "Example: 20 minutes at a 2:00 split = 5,000 m (5 km, 3.1 miles) at about 203 W.",
    assumptions: "Distance = time ÷ split × 500 m. Concept2 power formula for watts. " + DISCLAIMER,
    faq: [
      { question: "How far should I row in 30 minutes?", answer: "Around 6,000–7,500 m is typical for fit recreational rowers." },
      { question: "Is rowing distance comparable between machines?", answer: "Between Concept2 ergs yes; other brands calibrate differently." },
    ],
  },
  {
    slug: "rowing-machine-calories-calculator",
    title: "Rowing Machine Calories Calculator",
    description: "Calculate calories burned on a rowing machine — the Concept2 display count and a body-weight estimate — from split or watts.",
    metaTitle: "Rowing Machine Calories Calculator — Erg Calories",
    metaDescription: "Free rowing machine calorie calculator. Get calories from split or watts and time, plus a body-weight-based estimate.",
    calcInputs: [dropdown("method", "I Know My", [["Split per 500 m", 1], ["Average watts", 2]], 1), ...SPLIT(2, 15), numberField("watts", "Average Watts", { default: 150, min: 1, max: 1500 }), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 }), ...WT()],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("displayCalories", "Monitor Calories (Concept2)", true), num("bodyWeightCalories", "Body-Weight Estimate (kcal)"), num("watts", "Average Watts"), num("caloriesPerHourDisplay", "Monitor Calories per Hour")],
    instructions: "Enter your average split (or watts), time and weight.",
    examples: "Example: 30 minutes at a 2:15 split (≈ 142 W) → about 395 monitor calories; a 170 lb rower's body-weight estimate is about 270 kcal.",
    assumptions: "Concept2 monitor: kcal/h = 4 × watts × 0.8604 + 300 (assumes a ~175 lb rower). Body-weight estimate uses Compendium rowing METs (4.8 light, 7.0 moderate, 8.5 vigorous, 12.0 very vigorous) chosen from your watts. " + DISCLAIMER,
    faq: [
      { question: "Why does the monitor ignore my weight?", answer: "It measures work done on the flywheel and adds a fixed resting allowance." },
      { question: "Is rowing good for burning calories?", answer: "Yes — it uses legs, back and arms, around 400–800 kcal an hour for most people." },
    ],
  },
  {
    slug: "rowing-stroke-rate-calculator",
    title: "Rowing Stroke Rate Calculator",
    description: "Calculate rowing stroke rate (strokes per minute) and distance per stroke — and which training zone it fits.",
    metaTitle: "Rowing Stroke Rate Calculator — SPM & Distance per Stroke",
    metaDescription: "Free rowing stroke rate calculator. Get strokes per minute, metres per stroke and the rate zone for your row.",
    calcInputs: [numberField("strokes", "Total Strokes", { default: 480, min: 1, max: 50000 }), numberField("minutes", "Minutes", { default: 20, min: 0.5, max: 600, step: 0.5 }), numberField("distance", "Distance (m)", { default: 5000, max: 100000 })],
    calcResult: { label: "Stroke Rate", format: "number" },
    calcResults: [num("strokesPerMinute", "Strokes per Minute", true), num("metresPerStroke", "Metres per Stroke"), num("zone", "Zone (1 Technique < 18, 2 Steady 18–23, 3 Threshold 24–29, 4 Race 30+)")],
    instructions: "Enter total strokes, time and distance (from the monitor's summary).",
    examples: "Example: 480 strokes in 20 minutes covering 5,000 m → 24 spm and 10.4 m per stroke.",
    assumptions: "SPM = strokes ÷ minutes; distance per stroke = metres ÷ strokes. Typical rates: steady rows 18–22 spm, 2K races 30–36. Longer strokes (more metres per stroke) at the same rate mean more power. " + DISCLAIMER,
    faq: [
      { question: "What stroke rate should I row at?", answer: "Around 20–24 spm for steady cardio; faster only for short hard pieces." },
      { question: "Is a higher stroke rate faster?", answer: "Only if each stroke stays powerful — rushing often lowers distance per stroke." },
    ],
  },
  {
    slug: "home-gym-cost-calculator",
    title: "Home Gym Cost Calculator",
    description: "Add up the cost of a home gym and see how many months it takes to pay for itself versus a gym membership.",
    metaTitle: "Home Gym Cost Calculator — Break-Even vs Membership",
    metaDescription: "Free home gym cost calculator. Total your equipment cost and compare with gym membership for break-even and 5-year savings.",
    calcInputs: [currencyField("rack", "Power Rack / Squat Stand", { default: 600 }), currencyField("barbell", "Barbell", { default: 250 }), currencyField("plates", "Weight Plates", { default: 400 }), currencyField("bench", "Bench", { default: 200 }), currencyField("dumbbells", "Dumbbells / Kettlebells", { default: 300 }), currencyField("cardio", "Cardio Machine", { default: 0, required: false }), currencyField("flooring", "Flooring", { default: 250 }), currencyField("accessories", "Accessories (bands, collars, rope)", { default: 100 }), currencyField("membershipMonthly", "Gym Membership per Month", { default: 50 }), currencyField("commuteMonthly", "Travel to the Gym per Month", { default: 20, required: false }), currencyField("upkeepYearly", "Home Gym Upkeep per Year", { default: 50, required: false })],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Home Gym Cost", true), num("breakEvenMonths", "Break-Even (months)"), cur("fiveYearSavings", "Savings over 5 Years"), cur("monthlyGymCost", "Gym Cost per Month (incl. travel)")],
    instructions: "Enter what you'll spend on each item (0 for anything you skip) and what the gym costs you each month.",
    examples: "Example: a $2,100 home gym vs a $50 membership plus $20 travel a month pays for itself in 30 months and saves about $1,850 over 5 years.",
    assumptions: "Break-even = equipment cost ÷ monthly gym cost. 5-year savings = 60 months of gym costs − equipment − upkeep. Used equipment keeps much of its value if you sell it. " + DISCLAIMER,
    faq: [
      { question: "What do I need for a basic home gym?", answer: "A rack, barbell, plates and a bench cover most strength training." },
      { question: "Is a home gym worth it?", answer: "If you'll train regularly — it saves travel time and usually money after 2–3 years." },
    ],
  },
  {
    slug: "gym-flooring-calculator",
    title: "Gym Flooring Calculator",
    description: "Calculate how many rubber tiles or mats you need for a home gym floor — with waste, cost and total weight.",
    metaTitle: "Gym Flooring Calculator — Rubber Tiles & Mats",
    metaDescription: "Free gym flooring calculator. Get the number of rubber tiles or stall mats, cost and weight for your gym floor.",
    calcInputs: [numberField("length", "Room Length (ft)", { default: 12, min: 1, max: 500 }), numberField("width", "Room Width (ft)", { default: 10, min: 1, max: 500 }), dropdown("tileSize", "Tile / Mat Size", [["2 × 2 ft tiles", 1], ["4 × 6 ft stall mats", 2], ["1 × 1 ft tiles", 3], ["Rolled rubber, per 6 sq ft", 4]], 1), percentField("wastePct", "Waste / Cuts", { default: 5, max: 30 }), currencyField("pricePerPiece", "Price per Tile / Mat", { default: 15 }), numberField("thicknessIn", "Thickness (in)", { default: 0.75, min: 0.125, max: 2, step: 0.125 })],
    calcResult: { label: "Pieces Needed", format: "number" },
    calcResults: [num("piecesNeeded", "Tiles / Mats Needed", true), num("areaSqFt", "Floor Area (sq ft)"), num("coveredSqFt", "Area Covered (sq ft)"), cur("totalCost", "Total Cost"), num("weightLb", "Approx. Total Weight (lb)")],
    instructions: "Enter the room size, the tile or mat size and price, and a waste allowance for cuts.",
    examples: "Example: a 12 × 10 ft room with 2 × 2 ft tiles and 5% waste needs 32 tiles — $480 at $15 each, about 509 lb at ¾\".",
    assumptions: "Pieces = area × (1 + waste) ÷ piece area, rounded up. Rubber weighs about 5.3 lb per sq ft per inch of thickness. ¾\" is common under free weights; use thicker platforms for heavy deadlift drops. " + DISCLAIMER,
    faq: [
      { question: "What thickness for a home gym floor?", answer: "⅜\" for cardio, ¾\" for general lifting, 1\"+ or a platform for dropping heavy weights." },
      { question: "Are horse stall mats good for gyms?", answer: "Yes — 4 × 6 ft, ¾\" mats are a cheap, tough option (about 100 lb each)." },
    ],
  },
  {
    slug: "workout-time-calculator",
    title: "Workout Time Calculator",
    description: "Estimate how long a strength workout takes from exercises, sets, reps, tempo and rest.",
    metaTitle: "Workout Time Calculator — How Long Is My Workout?",
    metaDescription: "Free workout time calculator. Estimate total workout length, work time and rest from sets, reps, tempo and rest periods.",
    calcInputs: [numberField("exercises", "Exercises", { default: 6, min: 1, max: 30 }), numberField("sets", "Sets per Exercise", { default: 3, min: 1, max: 20 }), numberField("reps", "Reps per Set", { default: 10, min: 1, max: 100 }), numberField("secondsPerRep", "Seconds per Rep (tempo)", { default: 3, min: 0.5, max: 15, step: 0.5 }), numberField("restSeconds", "Rest Between Sets (s)", { default: 90, max: 600 }), numberField("transitionSeconds", "Change-Over Between Exercises (s)", { default: 120, max: 900 }), numberField("warmupMinutes", "Warm-Up (min)", { default: 10, max: 60 }), numberField("cooldownMinutes", "Cool-Down (min)", { default: 5, max: 60 })],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalMinutes", "Total Workout (min)", true), num("workingMinutes", "Time Under Load (min)"), num("restMinutes", "Rest & Change-Overs (min)"), pct("workPct", "Share of Time Working")],
    instructions: "Enter your plan: exercises, sets, reps, rep speed, rest periods and warm-up.",
    examples: "Example: 6 exercises × 3 sets × 10 reps at 3 s/rep with 90 s rests, 2 min change-overs and a 15-minute warm-up and cool-down → about 52 minutes (9 minutes actually lifting).",
    assumptions: "Total = sets × reps × tempo + rests between sets + change-overs + warm-up and cool-down. Supersets and circuits cut rest time a lot. " + DISCLAIMER,
    faq: [
      { question: "How long should a workout be?", answer: "45–75 minutes suits most strength sessions." },
      { question: "How long should I rest between sets?", answer: "2–3 minutes for heavy strength work, 60–90 s for muscle building, under 60 s for endurance." },
    ],
  },
  {
    slug: "rebounder-calories-burned-calculator",
    title: "Rebounder Calories Burned Calculator",
    description: "Calculate calories burned on a rebounder (mini trampoline) by intensity, weight and time.",
    metaTitle: "Rebounder Calories Burned Calculator — Mini Trampoline",
    metaDescription: "Free rebounder calorie calculator. Estimate calories burned bouncing on a mini trampoline by intensity and time.",
    calcInputs: [...WT(160), dropdown("intensity", "Intensity", [["Gentle bouncing / health bounce", 1], ["Moderate (jogging, jumping jacks)", 2], ["Vigorous (sprints, high jumps)", 3]], 2), numberField("minutes", "Minutes", { default: 20, min: 1, max: 300 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose how hard you bounce and enter your weight and time.",
    examples: "Example: 20 minutes of moderate rebounding at 160 lb burns about 109 kcal.",
    assumptions: "METs: 3.5 gentle (Compendium recreational trampoline), 4.5 moderate (competitive trampoline), 6.5 vigorous rebound aerobics. Arm movements and hand weights increase the burn. " + DISCLAIMER,
    faq: [
      { question: "Is rebounding good exercise?", answer: "Yes — it's low impact and works balance, legs and core." },
      { question: "How long should I rebound?", answer: "Start with 5–10 minutes and build to 20–30." },
    ],
  },
  {
    slug: "jump-rope-length-calculator",
    title: "Jump Rope Length Calculator",
    description: "Find the right jump rope length for your height and skill level.",
    metaTitle: "Jump Rope Length Calculator — What Size Rope?",
    metaDescription: "Free jump rope length calculator. Get the right skipping rope length from your height for beginner to speed ropes.",
    calcInputs: [numberField("height", "Your Height", { default: 68, min: 30, max: 230 }), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), dropdown("level", "Level", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3], ["Speed / double-unders", 4]], 1)],
    calcResult: { label: "Rope Length", format: "number" },
    calcResults: [num("ropeLengthFeet", "Rope Length (ft)", true), num("ropeLengthInches", "Rope Length (in)"), num("ropeLengthCm", "Rope Length (cm)")],
    instructions: "Enter your height and level.",
    examples: "Example: a 5'8\" beginner → an 8'8\" (about 104\") rope. An advanced jumper the same height might use about 7'8\".",
    assumptions: "Rope length ≈ height + 3 ft (beginner), + 2.5 ft (intermediate), + 2 ft (advanced), + 1¼ ft (speed). Check: standing on the middle, the handles should reach your armpits (beginner) or lower chest (advanced). " + DISCLAIMER,
    faq: [
      { question: "What if my rope is too long?", answer: "It's slower and easier to trip on the extra slack — shorten it as you improve." },
      { question: "Can I adjust the rope?", answer: "Most ropes adjust at the handle; cut off the excess cable." },
    ],
  },
  {
    slug: "jumping-rope-calories-burned-calculator",
    title: "Jumping Rope Calories Burned Calculator",
    description: "Calculate calories burned jumping rope by pace, body weight and time — plus total skips.",
    metaTitle: "Jumping Rope Calories Burned Calculator",
    metaDescription: "Free jump rope calorie calculator. Estimate calories burned skipping by pace, weight and minutes.",
    calcInputs: [...WT(160), dropdown("pace", "Pace", [["Slow (under 100 skips/min)", 1], ["Moderate (100–120)", 2], ["Fast (120–160)", 3]], 2), numberField("minutes", "Minutes Skipping", { default: 15, min: 1, max: 180 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerMinute", "Calories per Minute"), num("totalSkips", "Approx. Skips"), num("met", "MET Value")],
    instructions: "Enter your weight, pace and minutes actually jumping.",
    examples: "Example: 15 minutes at a moderate pace at 160 lb burns about 214 kcal (about 1,650 skips).",
    assumptions: "2011 Compendium METs: 8.8 slow, 11.8 moderate, 12.3 fast. Count only time jumping, not rests. " + DISCLAIMER,
    faq: [
      { question: "Does jumping rope burn more than running?", answer: "Per minute it's similar to running at about 7–8 mph." },
      { question: "How many calories are 1,000 skips?", answer: "Roughly 100–150 kcal for most adults." },
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
