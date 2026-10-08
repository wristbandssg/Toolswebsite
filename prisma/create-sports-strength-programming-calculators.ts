// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the sports performance sub-batch A (Strength Programming). Part of the
// sports performance tool-list build-out: 102 keywords in the source list,
// 0 already built, 26 merged as same-intent duplicates (e.g. Squat 1RM,
// Bench Press Max, Overhead Press Max, Leg Press Max → One Rep Max), 76
// built across 8 sub-batches — all under Sports Calculators > Sports
// Performance Calculators:
//   create-sports-strength-programming-calculators.ts (10 tools)
//   create-sports-strength-tools-calculators.ts (10 tools)
//   create-sports-powerlifting-calculators.ts (8 tools)
//   create-sports-body-composition-calculators.ts (9 tools)
//   create-sports-energy-calculators.ts (8 tools)
//   create-sports-fitness-tests-calculators.ts (11 tools)
//   create-sports-military-tests-calculators.ts (8 tools)
//   create-sports-power-conditioning-calculators.ts (12 tools)
//
// See src/lib/calc-engine-sports-strength-programming.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-strength-programming-calculators.ts
// or
//   npm run db:create-sports-strength-programming-calculators

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

const ROUNDING = numberField("rounding", "Round to Nearest (Plate Increment)", { default: 2.5, max: 20, step: 0.5, required: false });
const UNIT_NOTE = "Use kg or lb consistently — results come out in the same unit you enter.";
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

const TOOLS: ToolDef[] = [
  {
    slug: "one-rep-max-calculator",
    title: "One Rep Max (1RM) Calculator",
    description: "Estimate your one-rep max from any set of 1–30 reps. Works for squat, bench press, deadlift, overhead press and leg press, using the best-validated formula for each lift.",
    metaTitle: "One Rep Max (1RM) Calculator — Squat, Bench, Deadlift",
    metaDescription: "Free 1RM calculator. Estimate your one-rep max for squat, bench press, deadlift, overhead press or leg press from weight and reps with 7 formulas.",
    calcInputs: [
      dropdown("exercise", "Exercise", [["Squat", 1], ["Bench Press", 2], ["Deadlift", 3], ["Overhead Press", 4], ["Leg Press", 5], ["Other / Any Lift", 6]], 2),
      numberField("weight", "Weight Lifted (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      numberField("reps", "Reps Completed", { default: 5, min: 1, max: 30 }),
    ],
    calcResult: { label: "Estimated 1RM", format: "number" },
    calcResults: [
      num("estimated1rm", "Estimated 1RM (Best Formula for This Lift)", true),
      num("averageOfFormulas", "Average of 7 Formulas"),
      num("epley", "Epley Formula"),
      num("brzycki", "Brzycki Formula"),
      num("load90", "90% of 1RM (≈3 Reps)"),
      num("load80", "80% of 1RM (≈8 Reps)"),
      num("load70", "70% of 1RM (≈12 Reps)"),
    ],
    instructions: "Choose the lift, then enter the weight and the number of clean reps you completed in one set taken close to failure. Sets of 2–10 reps give the most accurate estimate. " + UNIT_NOTE,
    examples:
      "Example: 100 kg for 5 reps on the bench press estimates a 1RM of 119 kg with the Mayhew formula (the most accurate for bench). The average of all seven formulas is 115.5 kg, Epley gives 116.7 kg and Brzycki 112.5 kg.",
    assumptions:
      "Formulas: Epley, Brzycki, Lander, Lombardi, Mayhew, O'Conner and Wathan. Best formula per lift: squat and deadlift — Wathan; bench — Mayhew; overhead press and leg press — Epley; other — the average. Estimates get less reliable above 10 reps. Covers the squat 1RM, bench press max, overhead press max and leg press max. " + DISCLAIMER,
    faq: [
      { question: "How accurate is a 1RM calculator?", answer: "Usually within about 5% for sets of 2–10 reps taken close to failure. Accuracy drops for high-rep sets, very strong lifters and lifts where technique breaks down." },
      { question: "Should I test my true 1RM?", answer: "Not often. An estimated max from a hard set of 3–5 reps is safer and good enough to plan training percentages." },
    ],
  },
  {
    slug: "percentage-of-1rm-calculator",
    title: "Percentage of 1RM Calculator",
    description: "Find the weight for any percentage of your one-rep max, plus a full 60–95% loading chart rounded to your plates and the reps you can expect at each load.",
    metaTitle: "Percentage of 1RM Calculator — % Max Chart",
    metaDescription: "Free percentage of 1RM calculator. Get the weight at any % of your max and a 60–95% chart rounded to your plate increment.",
    calcInputs: [
      numberField("oneRepMax", "Your 1RM (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      percentField("percent", "Target Percentage", { default: 75, max: 120 }),
      ROUNDING,
    ],
    calcResult: { label: "Weight at Percentage", format: "number" },
    calcResults: [
      num("weightAtPercent", "Weight at Your Percentage", true),
      num("estimatedRepsAtPercent", "Reps You Can Expect at That Load"),
      num("load95", "95%"),
      num("load90", "90%"),
      num("load85", "85%"),
      num("load80", "80%"),
      num("load75", "75%"),
      num("load70", "70%"),
      num("load65", "65%"),
      num("load60", "60%"),
    ],
    instructions: "Enter your one-rep max (tested or estimated), the percentage your program calls for, and the smallest jump your plates allow (2.5 kg or 5 lb). " + UNIT_NOTE,
    examples: "Example: with a 100 kg max, 75% is 75 kg — a load most lifters can move for about 9 reps. 85% is 85 kg and 65% is 65 kg.",
    assumptions: "Expected reps use the inverse of the Epley formula; individuals vary by a few reps either way. " + DISCLAIMER,
    faq: [
      { question: "What percentage of 1RM builds muscle?", answer: "Roughly 65–85% of 1RM for 6–12 reps is the classic hypertrophy range, though lighter loads taken close to failure also work." },
      { question: "What percentage is best for strength?", answer: "Heavy work at 80–95% of 1RM for 1–5 reps builds maximal strength most directly." },
    ],
  },
  {
    slug: "rpe-calculator",
    title: "RPE Calculator",
    description: "Use rate of perceived exertion (RPE) to estimate your 1RM from any set, and find the right weight for a target reps × RPE — based on the RTS RPE chart.",
    metaTitle: "RPE Calculator — RPE Chart & e1RM",
    metaDescription: "Free RPE calculator. Estimate your 1RM from a set at an RPE and find the weight for your next set's reps and RPE using the RTS chart.",
    calcInputs: [
      numberField("weight", "Weight Lifted (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      numberField("reps", "Reps Done", { default: 5, min: 1, max: 12 }),
      numberField("rpe", "RPE of That Set (5–10)", { default: 8, min: 5, max: 10, step: 0.5 }),
      numberField("targetReps", "Target Reps", { default: 3, min: 1, max: 12 }),
      numberField("targetRpe", "Target RPE (5–10)", { default: 8, min: 5, max: 10, step: 0.5 }),
      ROUNDING,
    ],
    calcResult: { label: "Weight for Target Set", format: "number" },
    calcResults: [
      num("targetWeight", "Weight for Target Reps × RPE", true),
      num("estimated1rm", "Estimated 1RM (e1RM)"),
      pct("percentOf1rmDone", "Your Set as % of 1RM"),
      pct("percentOf1rmTarget", "Target Set as % of 1RM"),
      num("repsInReserve", "Reps in Reserve in Your Set"),
    ],
    instructions: "Enter a set you just did and how hard it felt on the RPE scale (10 = no reps left, 9 = one left, 8 = two left). Then enter the reps and RPE you want for your next set. " + UNIT_NOTE,
    examples: "Example: 100 kg × 5 at RPE 8 is 81.1% of 1RM, so your e1RM is 123.3 kg. A triple at RPE 8 is 86.3% — 107.5 kg after rounding.",
    assumptions: "RTS (Tuchscherer) RPE chart: each half-point of RPE below 10 counts as half a rep in reserve. Above 12 reps the chart is extrapolated. " + DISCLAIMER,
    faq: [
      { question: "What does RPE 8 mean?", answer: "You could have done about two more reps with good form. RPE 10 is a true maximum effort with nothing left." },
      { question: "Why train with RPE instead of percentages?", answer: "RPE adjusts to how you feel each day — if you're tired, the same RPE means a lighter weight, which keeps training productive." },
    ],
  },
  {
    slug: "reps-to-failure-calculator",
    title: "Reps to Failure Calculator",
    description: "See how many reps you can do with a weight before failure, and how many reps you left in reserve on a set.",
    metaTitle: "Reps to Failure Calculator — Max Reps & RIR",
    metaDescription: "Free reps to failure calculator. Estimate max reps at any weight from your 1RM, plus reps in reserve (RIR) and RPE of your set.",
    calcInputs: [
      numberField("oneRepMax", "Your 1RM (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      numberField("weight", "Working Weight (kg or lb)", { default: 80, max: 2000, step: 0.5 }),
      numberField("repsDone", "Reps You Did (Optional)", { default: 5, max: 50, required: false }),
    ],
    calcResult: { label: "Max Reps", format: "number" },
    calcResults: [
      num("estimatedMaxReps", "Estimated Reps to Failure", true),
      pct("percentOf1rm", "Weight as % of 1RM"),
      num("repsInReserve", "Reps in Reserve (RIR)"),
      num("setRpe", "RPE of Your Set"),
    ],
    instructions: "Enter your 1RM and the working weight. To check how hard a set was, also enter the reps you did. " + UNIT_NOTE,
    examples: "Example: 80 kg is 80% of a 100 kg max, good for about 7 reps to failure. Stopping at 5 reps leaves 2 in reserve — an RPE 8 set.",
    assumptions: "Average of the inverse Epley and Brzycki formulas. Endurance-trained lifters often get more reps than predicted, powerlifters fewer. " + DISCLAIMER,
    faq: [
      { question: "Should I train to failure?", answer: "Most sets work best stopped 1–3 reps short of failure. Going to failure on every set adds fatigue without much extra gain." },
      { question: "What is RIR?", answer: "Reps in reserve — how many more reps you could have done. RIR 2 is the same as RPE 8." },
    ],
  },
  {
    slug: "5-3-1-calculator",
    title: "5/3/1 Calculator (Wendler 531)",
    description: "Build Jim Wendler's 5/3/1 program: your training max and every working set for the 5s, 3s and 5/3/1 weeks plus the deload week.",
    metaTitle: "5/3/1 Calculator — Wendler 531 Program",
    metaDescription: "Free Wendler 5/3/1 calculator. Get your training max and all working sets for weeks 1–3 and the deload, rounded to your plates.",
    calcInputs: [
      numberField("oneRepMax", "Your 1RM for the Lift (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      percentField("trainingMaxPercent", "Training Max (% of 1RM)", { default: 90, min: 80, max: 100 }),
      ROUNDING,
    ],
    calcResult: { label: "Training Max", format: "number" },
    calcResults: [
      num("trainingMax", "Training Max", true),
      num("week1Set1", "Week 1: 5 reps @ 65%"),
      num("week1Set2", "Week 1: 5 reps @ 75%"),
      num("week1Set3", "Week 1: 5+ reps @ 85%"),
      num("week2Set1", "Week 2: 3 reps @ 70%"),
      num("week2Set2", "Week 2: 3 reps @ 80%"),
      num("week2Set3", "Week 2: 3+ reps @ 90%"),
      num("week3Set1", "Week 3: 5 reps @ 75%"),
      num("week3Set2", "Week 3: 3 reps @ 85%"),
      num("week3Set3", "Week 3: 1+ reps @ 95%"),
      num("deloadSet1", "Deload: 5 reps @ 40%"),
      num("deloadSet2", "Deload: 5 reps @ 50%"),
      num("deloadSet3", "Deload: 5 reps @ 60%"),
    ],
    instructions: "Enter your 1RM for one lift (squat, bench, deadlift or press) and your training max percentage — Wendler recommends 90%, many lifters now use 85%. Run it once per lift. " + UNIT_NOTE,
    examples: "Example: a 100 kg max gives a 90 kg training max. Week 1 is 57.5, 67.5 and 77.5 kg; week 3's top set is 85 kg for as many reps as possible; the deload uses 35–55 kg.",
    assumptions: "Percentages are of the training max, not the 1RM. After each cycle, add 2.5 kg (5 lb) to the bench and press training max and 5 kg (10 lb) to the squat and deadlift. Also covers the training max calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a training max in 5/3/1?", answer: "A slightly lowered max (85–90% of your true 1RM) that every percentage is based on, so the program stays submaximal and progresses steadily." },
      { question: "What does 5+ mean?", answer: "The last set of the day is an AMRAP — do at least the listed reps, then as many more as you can with good form." },
    ],
  },
  {
    slug: "starting-strength-calculator",
    title: "Starting Strength Calculator",
    description: "Project your lifts on a novice linear progression like Starting Strength — squat and deadlift go up every session, bench and press every other session.",
    metaTitle: "Starting Strength Calculator — Linear Progression",
    metaDescription: "Free Starting Strength calculator. See where your squat, bench, press and deadlift will be after weeks of novice linear progression.",
    calcInputs: [
      dropdown("unit", "Unit", [["kg", 1], ["lb", 2]], 1),
      numberField("squat", "Current Squat Working Weight", { default: 60, max: 1000, step: 0.5 }),
      numberField("bench", "Current Bench Working Weight", { default: 50, max: 1000, step: 0.5 }),
      numberField("press", "Current Press Working Weight", { default: 35, max: 1000, step: 0.5 }),
      numberField("deadlift", "Current Deadlift Working Weight", { default: 80, max: 1000, step: 0.5 }),
      numberField("weeks", "Weeks to Project (3 Sessions a Week)", { default: 8, min: 1, max: 26 }),
      numberField("squatIncrement", "Squat Increase per Session", { default: 2.5, max: 20, step: 0.5 }),
      numberField("pressIncrement", "Bench/Press Increase per Session", { default: 2.5, max: 20, step: 0.5 }),
      numberField("deadliftIncrement", "Deadlift Increase per Session", { default: 5, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Squat After", format: "number" },
    calcResults: [
      num("squatAfter", "Squat After", true),
      num("benchAfter", "Bench Press After"),
      num("pressAfter", "Overhead Press After"),
      num("deadliftAfter", "Deadlift After"),
      num("totalSessions", "Sessions"),
    ],
    instructions: "Enter today's working weights (3 sets of 5, 1 set of 5 for the deadlift), how many weeks to project and how much each lift goes up per session. Typical jumps: 2.5 kg (5 lb) for squat and presses, 5 kg (10 lb) for deadlift.",
    examples: "Example: starting at a 60 kg squat, 50 kg bench, 35 kg press and 80 kg deadlift, 8 weeks (24 sessions) projects 120 kg, 80 kg, 65 kg and 200 kg — if every session succeeds.",
    assumptions: "Squat and deadlift progress every session; bench and press alternate, so each progresses every other session. Real progress slows as weights get heavy — expect smaller jumps and resets after a few months. " + DISCLAIMER,
    faq: [
      { question: "How long does Starting Strength linear progression last?", answer: "Usually 3–9 months. When you stall on the same weight twice, smaller jumps and an intermediate program come next." },
      { question: "Why does the deadlift go up faster?", answer: "It's the lift with the most room to grow for novices and is done for just one work set, so it recovers well from bigger jumps." },
    ],
  },
  {
    slug: "progressive-overload-calculator",
    title: "Progressive Overload Calculator",
    description: "Plan progressive overload over a training block — a weekly percentage or fixed increase — and see the weight at weeks 4, 8 and 12.",
    metaTitle: "Progressive Overload Calculator — Weekly Increase",
    metaDescription: "Free progressive overload calculator. Plan weekly % or fixed weight increases and see your target load for every stage of the block.",
    calcInputs: [
      numberField("currentWeight", "Current Working Weight (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      numberField("weeks", "Weeks in the Block", { default: 8, min: 1, max: 52 }),
      percentField("weeklyIncreasePercent", "Weekly Increase (%)", { default: 2.5, max: 10, step: 0.5 }),
      numberField("weeklyIncreaseFixed", "Or Fixed Weekly Increase (0 = Use %)", { default: 0, max: 20, step: 0.5, required: false }),
      ROUNDING,
    ],
    calcResult: { label: "Final Weight", format: "number" },
    calcResults: [
      num("finalWeight", "Weight at End of Block", true),
      num("totalIncrease", "Total Increase"),
      pct("totalIncreasePercent", "Total Increase (%)"),
      num("weightWeek4", "Week 4"),
      num("weightWeek8", "Week 8"),
      num("weightWeek12", "Week 12"),
    ],
    instructions: "Enter your current working weight, the length of the block and either a weekly percentage increase or a fixed weekly jump. " + UNIT_NOTE,
    examples: "Example: 100 kg increased 2.5% a week for 8 weeks reaches 122.5 kg (a 21.8% increase), passing 110 kg at week 4.",
    assumptions: "Percentage increases compound weekly. 1–2.5% a week suits most intermediates; beginners can progress faster, advanced lifters much slower. Weeks after the end of the block show the final weight. " + DISCLAIMER,
    faq: [
      { question: "What is progressive overload?", answer: "Gradually asking more of your muscles — more weight, reps or sets over time — so they keep adapting." },
      { question: "Do I have to add weight every week?", answer: "No. Adding a rep or a set at the same weight is also progressive overload, and is often easier on the joints." },
    ],
  },
  {
    slug: "deload-calculator",
    title: "Deload Calculator",
    description: "Plan a deload week: the reduced weight, sets and reps by intensity, volume or a combined method, and how much volume you're cutting.",
    metaTitle: "Deload Calculator — Deload Week Weight & Sets",
    metaDescription: "Free deload calculator. Get your deload week weight, sets and reps by intensity, volume or combined deload and the volume reduction.",
    calcInputs: [
      numberField("workingWeight", "Normal Working Weight (kg or lb)", { default: 100, max: 2000, step: 0.5 }),
      numberField("sets", "Normal Sets", { default: 4, min: 1, max: 20 }),
      numberField("reps", "Normal Reps", { default: 8, min: 1, max: 50 }),
      dropdown("method", "Deload Method", [["Reduce intensity (60% weight)", 1], ["Reduce volume (half the sets)", 2], ["Both (80% weight, half sets, fewer reps)", 3]], 3),
      numberField("weeksSinceDeload", "Weeks Since Last Deload", { default: 6, max: 52, required: false }),
      ROUNDING,
    ],
    calcResult: { label: "Deload Weight", format: "number" },
    calcResults: [
      num("deloadWeight", "Deload Weight", true),
      num("deloadSets", "Deload Sets"),
      num("deloadReps", "Deload Reps"),
      pct("volumeReduction", "Volume Reduction"),
      num("weeksUntilNextDeload", "Weeks Until a Deload Is Due"),
    ],
    instructions: "Enter your normal working weight, sets and reps, and choose how you want to deload. " + UNIT_NOTE,
    examples: "Example: 4 × 8 at 100 kg with the combined method becomes 2 × 6 at 80 kg — 70% less volume. After 6 hard weeks, a deload is due now.",
    assumptions: "A deload every 4–8 weeks of hard training is common; this uses 6 weeks as the default interval. " + DISCLAIMER,
    faq: [
      { question: "Do I lose strength during a deload?", answer: "No — a week of lighter training lets fatigue clear, and most lifters come back stronger." },
      { question: "Which deload method is best?", answer: "Cutting volume while keeping weights moderately heavy keeps skills sharp; cutting intensity suits beat-up joints. The combined method is a safe middle ground." },
    ],
  },
  {
    slug: "sets-and-reps-calculator",
    title: "Sets and Reps Calculator",
    description: "Get the right rep range, sets per session, weekly sets, % of 1RM and rest time for your goal — strength, hypertrophy (muscle growth), endurance or power.",
    metaTitle: "Sets and Reps Calculator — Hypertrophy Rep Range",
    metaDescription: "Free sets and reps calculator. Rep range, weekly sets, % of 1RM and rest for strength, hypertrophy, endurance or power training.",
    calcInputs: [
      dropdown("goal", "Training Goal", [["Strength", 1], ["Hypertrophy (Muscle Growth)", 2], ["Muscular Endurance", 3], ["Power", 4]], 2),
      dropdown("experience", "Training Experience", [["Beginner (under 1 year)", 1], ["Intermediate (1–3 years)", 2], ["Advanced (3+ years)", 3]], 2),
      numberField("sessionsPerMuscle", "Sessions per Muscle per Week", { default: 2, min: 1, max: 6 }),
      numberField("oneRepMax", "Your 1RM for the Lift (Optional)", { default: 100, max: 2000, step: 0.5, required: false }),
      ROUNDING,
    ],
    calcResult: { label: "Sets per Session", format: "number" },
    calcResults: [
      num("setsPerSession", "Sets per Muscle per Session", true),
      num("repsLow", "Reps per Set (Low)"),
      num("repsHigh", "Reps per Set (High)"),
      num("weeklySetsLow", "Weekly Sets per Muscle (Low)"),
      num("weeklySetsHigh", "Weekly Sets per Muscle (High)"),
      num("weightLow", "Weight Range (Low)"),
      num("weightHigh", "Weight Range (High)"),
      num("restSecondsLow", "Rest Between Sets (Seconds, Low)"),
      num("restSecondsHigh", "Rest Between Sets (Seconds, High)"),
    ],
    instructions: "Choose your goal and experience, how often you train each muscle, and optionally your 1RM to see the weight range.",
    examples: "Example: an intermediate training for hypertrophy twice a week should do 6–12 reps per set, 12–18 hard sets per muscle a week (about 8 per session), at 67.5–85 kg with a 100 kg max, resting 60–120 seconds.",
    assumptions: "Ranges follow NSCA and ACSM guidance and recent volume research. Also covers the hypertrophy rep range calculator. " + DISCLAIMER,
    faq: [
      { question: "What is the best rep range for hypertrophy?", answer: "6–12 reps is the classic range, but anything from about 5 to 30 reps builds muscle if sets are taken close to failure." },
      { question: "How many sets per week build muscle?", answer: "About 10–20 hard sets per muscle per week works for most people; beginners grow on less." },
    ],
  },
  {
    slug: "training-volume-calculator",
    title: "Training Volume Calculator",
    description: "Calculate your workout's training volume (tonnage) — sets × reps × weight for up to five exercises — plus total reps, sets and weekly volume.",
    metaTitle: "Training Volume Calculator — Tonnage & Workout Volume",
    metaDescription: "Free training volume calculator. Add up sets × reps × weight (tonnage) for your workout, total reps and sets, and weekly volume.",
    calcInputs: [
      numberField("sets1", "Exercise 1: Sets", { default: 4, max: 20 }),
      numberField("reps1", "Exercise 1: Reps", { default: 8, max: 100 }),
      numberField("weight1", "Exercise 1: Weight", { default: 100, max: 2000, step: 0.5 }),
      numberField("sets2", "Exercise 2: Sets", { default: 3, max: 20, required: false }),
      numberField("reps2", "Exercise 2: Reps", { default: 10, max: 100, required: false }),
      numberField("weight2", "Exercise 2: Weight", { default: 60, max: 2000, step: 0.5, required: false }),
      numberField("sets3", "Exercise 3: Sets", { default: 3, max: 20, required: false }),
      numberField("reps3", "Exercise 3: Reps", { default: 12, max: 100, required: false }),
      numberField("weight3", "Exercise 3: Weight", { default: 40, max: 2000, step: 0.5, required: false }),
      numberField("sets4", "Exercise 4: Sets", { default: 0, max: 20, required: false }),
      numberField("reps4", "Exercise 4: Reps", { default: 0, max: 100, required: false }),
      numberField("weight4", "Exercise 4: Weight", { default: 0, max: 2000, step: 0.5, required: false }),
      numberField("sets5", "Exercise 5: Sets", { default: 0, max: 20, required: false }),
      numberField("reps5", "Exercise 5: Reps", { default: 0, max: 100, required: false }),
      numberField("weight5", "Exercise 5: Weight", { default: 0, max: 2000, step: 0.5, required: false }),
      numberField("bodyweight", "Your Bodyweight (Optional)", { default: 80, max: 400, required: false }),
      numberField("sessionsPerWeek", "Times You Do This Workout per Week", { default: 1, min: 1, max: 14 }),
    ],
    calcResult: { label: "Total Volume", format: "number" },
    calcResults: [
      num("totalVolume", "Total Volume (Tonnage)", true),
      num("totalReps", "Total Reps"),
      num("totalSets", "Total Sets"),
      num("averageWeightPerRep", "Average Weight per Rep"),
      num("volumePerBodyweight", "Volume in Bodyweights"),
      num("weeklyVolume", "Weekly Volume"),
    ],
    instructions: "For each exercise, enter sets, reps and weight. Leave unused exercises at 0. " + UNIT_NOTE,
    examples: "Example: 4 × 8 at 100 kg, 3 × 10 at 60 kg and 3 × 12 at 40 kg is 6,440 kg of volume over 98 reps and 10 sets — about 80 times an 80 kg lifter's bodyweight.",
    assumptions: "Volume load = sets × reps × weight. It's a useful way to track workload, but it doesn't capture how hard each set was. Also covers the tonnage and workout volume calculators. " + DISCLAIMER,
    faq: [
      { question: "What is tonnage in lifting?", answer: "The total weight moved in a session — every rep's weight added up. It's the same as training volume (volume load)." },
      { question: "Is more volume always better?", answer: "Up to a point. Volume drives muscle growth, but beyond what you can recover from it just adds fatigue." },
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
