// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the sports performance sub-batch B (Strength Tools). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-strength-tools.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-strength-tools-calculators.ts
// or
//   npm run db:create-sports-strength-tools-calculators

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

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for training planning only, not medical advice. Warm up properly, use a spotter or safety bars for " +
  "heavy sets, and stop if anything hurts. Talk to a doctor before starting a new program if you have a health condition.";

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

const UNIT: [string, number][] = [["kg", 1], ["lb", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "time-under-tension-calculator",
    title: "Time Under Tension Calculator",
    description: "Calculate time under tension (TUT) per rep, per set and per workout from your lifting tempo, and check if your sets fall in the hypertrophy range.",
    metaTitle: "Time Under Tension Calculator — Tempo & TUT",
    metaDescription: "Free time under tension calculator. Turn your lifting tempo into TUT per rep, set and workout, and see if sets hit the 40–70 s range.",
    calcInputs: [
      numberField("eccentric", "Lowering (Eccentric) Seconds", { default: 3, max: 10, step: 0.5 }),
      numberField("bottomPause", "Pause at Bottom (Seconds)", { default: 1, max: 10, step: 0.5, required: false }),
      numberField("concentric", "Lifting (Concentric) Seconds", { default: 1, max: 10, step: 0.5 }),
      numberField("topPause", "Pause at Top (Seconds)", { default: 0, max: 10, step: 0.5, required: false }),
      numberField("reps", "Reps per Set", { default: 10, min: 1, max: 50 }),
      numberField("sets", "Sets", { default: 3, min: 1, max: 20 }),
    ],
    calcResult: { label: "TUT per Set", format: "number" },
    calcResults: [
      num("tutPerSet", "Time Under Tension per Set (s)", true),
      num("tutPerRep", "Seconds per Rep"),
      num("totalTut", "Total Time Under Tension (s)"),
      num("inHypertrophyRange", "In the 40–70 s Hypertrophy Range (1 = Yes)"),
    ],
    instructions: "Enter your tempo — the four numbers written like 3-1-1-0 (lowering, bottom pause, lifting, top pause) — and your reps and sets.",
    examples: "Example: a 3-1-1-0 tempo is 5 seconds a rep, so 10 reps keep the muscle under tension for 50 seconds a set and 150 seconds over 3 sets — inside the 40–70 second range often used for muscle growth.",
    assumptions: "TUT is one tool for controlling effort; total hard sets and progressive overload matter more for growth than any exact tempo. " + DISCLAIMER,
    faq: [
      { question: "What does tempo 3-1-1-0 mean?", answer: "3 seconds lowering, 1 second paused at the bottom, 1 second lifting and no pause at the top." },
      { question: "Is a longer time under tension better?", answer: "Only to a point. Very slow reps force lighter weights; a controlled 2–4 second lowering is enough for most lifters." },
    ],
  },
  {
    slug: "rest-time-calculator",
    title: "Rest Time Calculator",
    description: "Find how long to rest between sets for strength, hypertrophy, endurance or power, adjusted for compound or isolation lifts and how hard the set was.",
    metaTitle: "Rest Time Calculator — Rest Between Sets",
    metaDescription: "Free rest time calculator. Get the right rest between sets by goal, exercise type and RPE, and the total rest in your workout.",
    calcInputs: [
      dropdown("goal", "Training Goal", [["Strength", 1], ["Hypertrophy", 2], ["Muscular Endurance", 3], ["Power", 4]], 2),
      dropdown("exerciseType", "Exercise Type", [["Compound (squat, bench, row…)", 1], ["Isolation (curl, raise, extension…)", 2]], 1),
      numberField("rpe", "How Hard the Set Was (RPE 5–10)", { default: 8, min: 5, max: 10, step: 0.5 }),
      numberField("sets", "Total Sets in the Workout", { default: 15, min: 1, max: 60 }),
    ],
    calcResult: { label: "Recommended Rest", format: "number" },
    calcResults: [
      num("recommendedRestSeconds", "Recommended Rest (Seconds)", true),
      num("restLowSeconds", "Range Low (Seconds)"),
      num("restHighSeconds", "Range High (Seconds)"),
      num("totalRestMinutes", "Total Rest in Workout (Minutes)"),
    ],
    instructions: "Choose your goal and the type of exercise, and how hard the set was. Harder sets push the rest toward the top of the range.",
    examples: "Example: a hypertrophy compound lift at RPE 8 calls for about 150 seconds of rest (range 90–180). Across 15 sets that's 35 minutes of rest.",
    assumptions: "Ranges: strength and power 3–5 min (compound) / 2–3 min (isolation); hypertrophy 1.5–3 / 1–1.5 min; endurance 30–90 / 30–60 s. Rounded to 15 seconds. " + DISCLAIMER,
    faq: [
      { question: "Does short rest build more muscle?", answer: "Not usually. Research favours at least 1.5–2 minutes on big lifts, because longer rest lets you lift more total volume." },
      { question: "Can I rest less on isolation exercises?", answer: "Yes — small muscles recover faster, so 60–90 seconds is usually enough." },
    ],
  },
  {
    slug: "weight-plate-calculator",
    title: "Weight Plate Calculator",
    description: "Work out which plates to load on each side of the bar for a target weight, in kg or lb plates — the plate math done for you, with the total in the other unit.",
    metaTitle: "Weight Plate Calculator — Plate Math (kg & lb)",
    metaDescription: "Free weight plate calculator. Enter a target weight and get the plates per side for kg or lb plates, plus the total converted.",
    calcInputs: [
      dropdown("unit", "Plate Unit", UNIT, 1),
      numberField("targetWeight", "Target Total Weight", { default: 100, max: 2000, step: 0.5 }),
      numberField("barWeight", "Bar Weight (20 kg / 45 lb Standard)", { default: 20, max: 100, step: 0.5 }),
      numberField("collarsTotal", "Collars (Both, Total)", { default: 0, max: 20, step: 0.5, required: false }),
    ],
    calcResult: { label: "Loaded Weight", format: "number" },
    calcResults: [
      num("plate1", "25 kg / 45 lb Plates per Side", true),
      num("plate2", "20 kg / 35 lb Plates per Side"),
      num("plate3", "15 kg / 25 lb Plates per Side"),
      num("plate4", "10 kg / 10 lb Plates per Side"),
      num("plate5", "5 kg / 5 lb Plates per Side"),
      num("plate6", "2.5 kg / 2.5 lb Plates per Side"),
      num("plate7", "1.25 kg Plates per Side (kg Only)"),
      num("loadedWeight", "Weight Actually Loaded"),
      num("shortBy", "Short of Target By"),
      num("loadedInOtherUnit", "Loaded Weight in the Other Unit"),
    ],
    instructions: "Pick kg or lb plates, enter the total weight you want and your bar weight. The result lists plates for ONE side, biggest first.",
    examples: "Example: 100 kg on a 20 kg bar needs 40 kg per side — one 25 kg and one 15 kg plate. In lb plates, 225 lb on a 45 lb bar is two 45s a side.",
    assumptions: "Standard plate sets with plenty of each size: kg 25/20/15/10/5/2.5/1.25, lb 45/35/25/10/5/2.5. If the target can't be made exactly, the closest lower load is shown. Also covers the plate loading, plate math and kg-to-lb plates calculators. " + DISCLAIMER,
    faq: [
      { question: "How much does an Olympic bar weigh?", answer: "A men's Olympic bar is 20 kg (often called 45 lb); a women's bar is 15 kg (about 33 lb). Gym bars and specialty bars vary." },
      { question: "Do I count the collars?", answer: "In competition, yes — 2.5 kg each. Spring clips in most gyms weigh so little they're usually ignored." },
    ],
  },
  {
    slug: "barbell-weight-calculator",
    title: "Barbell Weight Calculator",
    description: "Add up how much is on the bar — enter the plates on each side and your bar weight to get the total load in kg and lb (also a bar load calculator).",
    metaTitle: "Barbell Weight Calculator — Bar Load Total",
    metaDescription: "Free barbell weight calculator. Count the plates on each side and get the total bar load in kg and lb.",
    calcInputs: [
      dropdown("unit", "Plate Unit", UNIT, 2),
      numberField("barWeight", "Bar Weight", { default: 45, max: 100, step: 0.5 }),
      numberField("plate1", "25 kg / 45 lb Plates per Side", { default: 2, max: 10 }),
      numberField("plate2", "20 kg / 35 lb Plates per Side", { default: 0, max: 10, required: false }),
      numberField("plate3", "15 kg / 25 lb Plates per Side", { default: 0, max: 10, required: false }),
      numberField("plate4", "10 kg / 10 lb Plates per Side", { default: 1, max: 10, required: false }),
      numberField("plate5", "5 kg / 5 lb Plates per Side", { default: 0, max: 10, required: false }),
      numberField("plate6", "2.5 kg / 2.5 lb Plates per Side", { default: 0, max: 10, required: false }),
      numberField("plate7", "1.25 kg Plates per Side", { default: 0, max: 10, required: false }),
      numberField("collarsTotal", "Collars (Both, Total)", { default: 0, max: 20, step: 0.5, required: false }),
    ],
    calcResult: { label: "Total Weight", format: "number" },
    calcResults: [
      num("totalWeight", "Total Weight on the Bar", true),
      num("weightPerSide", "Plates per Side (Weight)"),
      num("totalInOtherUnit", "Total in the Other Unit"),
    ],
    instructions: "Pick kg or lb plates, enter the bar weight and how many of each plate are on ONE side of the bar.",
    examples: "Example: a 45 lb bar with two 45s and a 10 on each side is 45 + 2 × 100 = 245 lb — 111.1 kg.",
    assumptions: "Assumes the same plates on both sides. " + DISCLAIMER,
    faq: [
      { question: "Do people count the bar when saying how much they lift?", answer: "Yes — a lift's weight always includes the bar. \"Two plates\" on bench means 225 lb (or 100 kg with 20 kg plates and a 20 kg bar)." },
      { question: "Why do kg and lb plates add up differently?", answer: "A 45 lb plate is 20.4 kg and a 25 kg plate is 55 lb, so the same number of plates means a different total in each system." },
    ],
  },
  {
    slug: "push-up-weight-calculator",
    title: "Push-Up Weight Calculator",
    description: "Find how much weight you lift in a push-up — the share of your bodyweight for standard, knee, incline and decline push-ups — and your total volume.",
    metaTitle: "Push-Up Weight Calculator — % of Bodyweight",
    metaDescription: "Free push-up weight calculator. See how much of your bodyweight you lift in standard, knee, incline and decline push-ups.",
    calcInputs: [
      numberField("bodyweight", "Bodyweight (kg or lb)", { default: 80, max: 400, step: 0.5 }),
      dropdown("variation", "Push-Up Variation", [["Standard", 1], ["Knee push-up", 2], ["Hands raised 30 cm (incline)", 3], ["Hands raised 60 cm (incline)", 4], ["Feet raised 30 cm (decline)", 5], ["Feet raised 60 cm (decline)", 6]], 1),
      numberField("reps", "Reps per Set", { default: 20, max: 200 }),
      numberField("sets", "Sets", { default: 3, min: 1, max: 20 }),
    ],
    calcResult: { label: "Weight per Rep", format: "number" },
    calcResults: [num("weightPerRep", "Weight Lifted per Rep", true), pct("percentOfBodyweight", "Share of Bodyweight"), num("volumePerSet", "Volume per Set"), num("totalVolume", "Total Volume")],
    instructions: "Enter your bodyweight, the push-up variation and your reps and sets. Results are in the same unit as your bodyweight.",
    examples: "Example: an 80 kg person lifts about 51.2 kg (64% of bodyweight) in a standard push-up. 3 sets of 20 move 3,072 kg in total.",
    assumptions: "Shares measured at the top position by Ebben et al. (2011): standard 64%, knee 49%, hands raised 30/60 cm 55%/41%, feet raised 30/60 cm 70%/74%. " + DISCLAIMER,
    faq: [
      { question: "Is a push-up like a bench press?", answer: "Partly — a standard push-up moves about two-thirds of your bodyweight, but it also trains core stability that the bench press doesn't." },
      { question: "How do I make push-ups harder?", answer: "Raise your feet, slow the lowering, add a pause or wear a weighted vest." },
    ],
  },
  {
    slug: "incline-to-flat-bench-calculator",
    title: "Incline to Flat Bench Calculator",
    description: "Convert between incline and flat bench press — estimate your flat bench from your incline, or your incline from your flat — by bench angle.",
    metaTitle: "Incline to Flat Bench Calculator",
    metaDescription: "Free incline to flat bench calculator. Convert incline bench press to flat bench (or back) for 15°, 30°, 45° and 60° benches.",
    calcInputs: [
      dropdown("direction", "Convert", [["Incline → Flat", 1], ["Flat → Incline", 2]], 1),
      numberField("liftWeight", "Weight (1RM or Working Weight)", { default: 80, max: 1000, step: 0.5 }),
      dropdown("angle", "Incline Angle", [["15°", 1], ["30°", 2], ["45°", 3], ["60°", 4]], 2),
    ],
    calcResult: { label: "Converted Weight", format: "number" },
    calcResults: [num("convertedWeight", "Converted Weight", true), num("flatBench", "Flat Bench"), num("inclineBench", "Incline Bench"), pct("inclinePercentOfFlat", "Incline as % of Flat")],
    instructions: "Choose the direction, enter the weight you know, and pick the incline angle.",
    examples: "Example: an 80 kg incline press on a 30° bench suggests a flat bench of about 94 kg, since incline strength is about 85% of flat at that angle.",
    assumptions: "Typical incline strength: 90% of flat at 15°, 85% at 30°, 80% at 45°, 75% at 60°. Individual ratios vary with arm length and training history. " + DISCLAIMER,
    faq: [
      { question: "Why is incline bench weaker than flat?", answer: "A steeper angle shifts work from the chest to the smaller shoulder muscles and shortens the leverage of the chest." },
      { question: "What incline angle is best for the upper chest?", answer: "About 30° — steeper angles turn it into more of a shoulder press." },
    ],
  },
  {
    slug: "squat-to-deadlift-ratio-calculator",
    title: "Squat to Deadlift Ratio Calculator",
    description: "Check the balance between your squat and deadlift — the ratio, the squat as a % of your deadlift, and what each lift would be at a typical 1.2 ratio.",
    metaTitle: "Squat to Deadlift Ratio Calculator",
    metaDescription: "Free squat to deadlift ratio calculator. Compare your lifts with the typical 1.2 ratio to find which one is lagging.",
    calcInputs: [numberField("squat", "Squat 1RM", { default: 140, max: 2000, step: 0.5 }), numberField("deadlift", "Deadlift 1RM", { default: 170, max: 2000, step: 0.5 })],
    calcResult: { label: "Deadlift-to-Squat Ratio", format: "number" },
    calcResults: [
      num("deadliftToSquatRatio", "Deadlift ÷ Squat", true),
      pct("squatPercentOfDeadlift", "Squat as % of Deadlift"),
      num("expectedDeadlift", "Deadlift at a Typical 1.2 Ratio"),
      num("expectedSquat", "Squat at a Typical 1.2 Ratio"),
      pct("differenceFromTypical", "Deadlift vs Typical Ratio"),
    ],
    instructions: "Enter your squat and deadlift maxes in the same unit.",
    examples: "Example: a 140 kg squat and 170 kg deadlift is a 1.21 ratio — the squat is 82% of the deadlift, almost exactly the typical balance.",
    assumptions: "Most balanced lifters deadlift about 1.1–1.25× their squat. Long arms favour the deadlift; short femurs favour the squat. " + DISCLAIMER,
    faq: [
      { question: "What is a normal squat to deadlift ratio?", answer: "A squat around 80–90% of the deadlift is typical. Much lower can point to weak legs; much higher often to a weak back or grip." },
      { question: "Should my squat be higher than my deadlift?", answer: "For most people no — it happens mainly with very short arms or a squat-focused training history." },
    ],
  },
  {
    slug: "max-pull-up-calculator",
    title: "Max Pull-Up Calculator",
    description: "Estimate your weighted pull-up 1RM and how many bodyweight pull-ups you can do, from any set with or without added weight.",
    metaTitle: "Max Pull-Up Calculator — Weighted Pull-Up 1RM",
    metaDescription: "Free max pull-up calculator. Estimate your weighted pull-up 1RM, total load and max bodyweight pull-ups from any set.",
    calcInputs: [
      numberField("bodyweight", "Bodyweight", { default: 80, max: 400, step: 0.5 }),
      numberField("addedWeight", "Added Weight (0 = Bodyweight Only)", { default: 20, max: 300, step: 0.5, required: false }),
      numberField("reps", "Reps Completed", { default: 5, min: 1, max: 50 }),
    ],
    calcResult: { label: "Added-Weight 1RM", format: "number" },
    calcResults: [
      num("addedWeight1rm", "1RM Added Weight", true),
      num("totalLoad1rm", "1RM Total Load (Body + Added)"),
      num("estimatedBodyweightReps", "Estimated Max Bodyweight Pull-Ups"),
      num("relativeStrength", "Total Load ÷ Bodyweight"),
    ],
    instructions: "Enter your bodyweight, any weight added on a belt or vest, and how many strict reps you did. Use the same unit throughout.",
    examples: "Example: an 80 kg lifter doing 5 reps with 20 kg added has a 1RM total load of 116.7 kg — 36.7 kg added — and should manage about 13 bodyweight pull-ups.",
    assumptions: "Epley formula on total load (bodyweight + added). Predictions of high bodyweight reps are rough — endurance varies a lot. " + DISCLAIMER,
    faq: [
      { question: "How many pull-ups is good?", answer: "For men, 10–15 strict pull-ups is good and 20+ excellent; for women, 5–10 is good. A weighted pull-up with half your bodyweight added is advanced." },
      { question: "Do chin-ups count?", answer: "Chin-ups (palms facing you) are usually a little easier, so expect slightly higher numbers than for pull-ups." },
    ],
  },
  {
    slug: "relative-strength-calculator",
    title: "Relative Strength Calculator",
    description: "Measure strength for your size — any lift divided by your bodyweight (strength-to-weight ratio, bench press ratio) plus an allometric pound-for-pound score.",
    metaTitle: "Relative Strength Calculator — Strength to Weight",
    metaDescription: "Free relative strength calculator. Get your strength-to-weight ratio, % of bodyweight and allometric pound-for-pound score for any lift.",
    calcInputs: [dropdown("unit", "Unit", UNIT, 1), numberField("liftWeight", "Lift 1RM", { default: 120, max: 2000, step: 0.5 }), numberField("bodyweight", "Bodyweight", { default: 80, max: 400, step: 0.5 })],
    calcResult: { label: "Strength-to-Weight Ratio", format: "number" },
    calcResults: [num("strengthToWeightRatio", "Strength-to-Weight Ratio", true), pct("percentOfBodyweight", "Lift as % of Bodyweight"), num("allometricScore", "Allometric (Pound-for-Pound) Score")],
    instructions: "Enter the lift's 1RM and your bodyweight in the same unit. Works for bench (bench press ratio), squat, deadlift or any lift.",
    examples: "Example: a 120 kg lift at 80 kg bodyweight is a 1.5 ratio — 150% of bodyweight — with an allometric score of 6.37.",
    assumptions: "Allometric score = lift ÷ bodyweight^0.67 (both in kg). Simple ratios favour lighter lifters; the allometric score corrects most of that bias. Also covers the strength-to-weight ratio and bench press ratio calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a good bench press to bodyweight ratio?", answer: "For men, 1.0× bodyweight is a solid milestone and 1.5× advanced; for women, 0.75× is strong and 1.0× advanced." },
      { question: "Why use allometric scaling?", answer: "Strength grows with muscle cross-section, not bodyweight, so heavier lifters naturally lift less per kilogram. Allometric scaling compares them more fairly." },
    ],
  },
  {
    slug: "strength-standards-calculator",
    title: "Strength Standards Calculator",
    description: "See how strong you are for your bodyweight — beginner to elite standards for the squat, bench press, deadlift, overhead press and pull-up, for men and women.",
    metaTitle: "Strength Standards Calculator — Squat, Bench, Deadlift",
    metaDescription: "Free strength standards calculator. Rate your squat, bench, deadlift, press or pull-up from beginner to elite by bodyweight and sex.",
    calcInputs: [
      dropdown("sex", "Sex", [["Male", 1], ["Female", 2]], 1),
      dropdown("lift", "Lift", [["Squat", 1], ["Bench Press", 2], ["Deadlift", 3], ["Overhead Press", 4], ["Pull-Up (Bodyweight + Added)", 5]], 2),
      numberField("bodyweight", "Bodyweight", { default: 80, max: 400, step: 0.5 }),
      numberField("oneRepMax", "Your 1RM", { default: 100, max: 2000, step: 0.5 }),
    ],
    calcResult: { label: "Strength Level", format: "number" },
    calcResults: [
      num("strengthLevel", "Strength Level (1 Beginner … 5 Elite)", true),
      num("bodyweightRatio", "Lift ÷ Bodyweight"),
      num("nextLevelWeight", "Weight for Next Level"),
      num("intermediateWeight", "Intermediate Standard"),
      num("advancedWeight", "Advanced Standard"),
      num("eliteWeight", "Elite Standard"),
    ],
    instructions: "Choose your sex and the lift, then enter your bodyweight and 1RM in the same unit. For pull-ups, enter bodyweight plus any added weight as the 1RM.",
    examples: "Example: a 100 kg bench press at 80 kg bodyweight for a man is 1.25× bodyweight — level 3, intermediate. Advanced starts at 140 kg and elite at 160 kg.",
    assumptions:
      "Bodyweight-ratio standards (Beginner/Novice/Intermediate/Advanced/Elite) — men: squat 0.75/1.25/1.5/2.25/2.75, bench 0.5/0.75/1.25/1.75/2.0, deadlift 1/1.5/2/2.5/3, press 0.35/0.55/0.8/1.1/1.4; women: squat 0.5/0.75/1.25/1.5/2.0, bench 0.25/0.5/0.75/1/1.5, deadlift 0.5/1/1.25/1.75/2.5, press 0.2/0.35/0.5/0.75/1. These are general guides, not federation standards. Also covers bench, squat, deadlift and pull-up strength standards. " + DISCLAIMER,
    faq: [
      { question: "What does intermediate mean?", answer: "Stronger than most regular gym-goers — usually reached after 1–2 years of consistent, well-planned training." },
      { question: "Are strength standards different by age?", answer: "Yes — after about 40, standards drop a little each decade. These standards are for adults roughly 18–40." },
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
