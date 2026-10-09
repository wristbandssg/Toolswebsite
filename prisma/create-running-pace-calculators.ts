// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the running sub-batch A (Pace & Race Planning). See
// src/lib/calc-engine-running-pace.ts for the full list
// of 4 sub-batches (35 tools under Sports Calculators > Running
// Calculators), and src/lib/calc-engine-running-pace.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-running-pace-calculators.ts
// or
//   npm run db:create-running-pace-calculators

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
  "Estimates for training and race planning only. Real performance depends on fitness, terrain, weather and the day itself. Build mileage gradually, and check with a doctor before starting hard training if you have a health condition.";

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

const RACES: [string, number][] = [
  ["Custom distance", 1], ["1 mile", 2], ["5K", 3], ["8K", 4], ["10K", 5], ["15K", 6], ["5 miles", 7], ["10 miles", 8],
  ["Half marathon", 9], ["Marathon", 10], ["50K", 11], ["100 miles", 12],
];
const PACE_UNIT: [string, number][] = [["per km", 1], ["per mile", 2]];
const raceFields = (def: number) => [
  dropdown("race", "Race / Distance", RACES, def),
  numberField("customDistance", "Custom Distance (if Chosen)", { default: 5, max: 500, step: 0.01, required: false }),
  dropdown("distanceUnit", "Custom Distance Unit", [["km", 1], ["miles", 2]], 1),
];
const hmsFields = (key: string, label: string, h: number, m: number, s: number) => [
  numberField(`${key}Hours`, `${label} — Hours`, { default: h, max: 100 }),
  numberField(`${key}Minutes`, `${label} — Minutes`, { default: m, max: 59 }),
  numberField(`${key}Seconds`, `${label} — Seconds`, { default: s, max: 59 }),
];
const msFields = (key: string, label: string, m: number, s: number) => [
  numberField(`${key}Min`, `${label} — Minutes`, { default: m, max: 60 }),
  numberField(`${key}Sec`, `${label} — Seconds`, { default: s, max: 59 }),
];
const hmsOut = (key: string, label: string, highlight = false) => [num(`${key}Hours`, `${label} — Hours`, highlight), num(`${key}Minutes`, `${label} — Minutes`), num(`${key}Seconds`, `${label} — Seconds`)];
const msOut = (key: string, label: string, highlight = false) => [num(`${key}Min`, `${label} — Minutes`, highlight), num(`${key}Sec`, `${label} — Seconds`)];

const TOOLS: ToolDef[] = [
  {
    slug: "pace-calculator",
    title: "Pace Calculator",
    description: "Calculate running pace, finish time or distance — for a 5K, 8K, 10K, 15K, 5 miles, half marathon, marathon, 50K, 100 miles or any distance — in minutes per km and per mile.",
    metaTitle: "Pace Calculator — Running Pace per Mile & km",
    metaDescription: "Free running pace calculator. Find pace, finish time or distance for 5K, 10K, half marathon, marathon or any race, per km and per mile.",
    calcInputs: [
      dropdown("solveFor", "Calculate", [["Pace (from time and distance)", 1], ["Finish time (from pace and distance)", 2], ["Distance (from time and pace)", 3]], 1),
      ...raceFields(3),
      ...hmsFields("time", "Time", 0, 25, 0),
      dropdown("paceUnit", "Pace Unit", PACE_UNIT, 1),
      ...msFields("pace", "Pace", 5, 0),
    ],
    calcResult: { label: "Pace per km", format: "number" },
    calcResults: [
      ...msOut("pacePerKm", "Pace per km", true),
      ...msOut("pacePerMile", "Pace per Mile"),
      ...hmsOut("finish", "Finish Time"),
      num("distanceKm", "Distance (km)"),
      num("distanceMiles", "Distance (miles)"),
      num("speedKmh", "Speed (km/h)"),
      num("speedMph", "Speed (mph)"),
    ],
    instructions: "Choose what to calculate, pick a race (or a custom distance) and fill in the other two values — time and/or pace. Fields that aren't needed for your choice are ignored.",
    examples: "Example: a 25:00 5K is a pace of 5:00 per km (8:03 per mile) at 12 km/h. A 4:00 marathon needs 5:41 per km; a 2:00 half marathon needs 9:09 per mile.",
    assumptions: "Pace = time ÷ distance; 1 mile = 1.609344 km; half marathon 21.0975 km, marathon 42.195 km. Also covers the 5K, 8K, 10K, 15K, 5-mile, half marathon mile pace, marathon pace, 50K and 100-mile pace calculators, miles-to-minutes and running distance calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a good running pace?", answer: "For recreational runners, around 5:30–6:30 per km (9–10:30 per mile) is typical for easy runs; race pace is faster depending on distance." },
      { question: "How many minutes is a mile at my pace?", answer: "Choose 'Finish time', set the distance to 1 mile and enter your pace — or read the 'Pace per Mile' result." },
    ],
  },
  {
    slug: "split-calculator",
    title: "Split Calculator",
    description: "Turn a goal race time into first- and second-half times and per-km or per-mile splits, for an even pace or a negative split.",
    metaTitle: "Split Calculator — Even & Negative Splits",
    metaDescription: "Free running split calculator. Get half splits and per-km or per-mile pace for an even or negative-split race plan.",
    calcInputs: [
      ...raceFields(10),
      ...hmsFields("goal", "Goal Time", 3, 30, 0),
      percentField("negativeSplitPercent", "Second Half Faster By (0 = Even)", { default: 2, min: -10, max: 10, step: 0.5 }),
      dropdown("splitUnit", "Split Unit", PACE_UNIT, 1),
    ],
    calcResult: { label: "First Half", format: "number" },
    calcResults: [...hmsOut("firstHalf", "First Half", true), ...hmsOut("secondHalf", "Second Half"), ...msOut("evenSplit", "Even Split"), ...msOut("firstHalfSplit", "First-Half Split"), ...msOut("secondHalfSplit", "Second-Half Split"), num("differenceSeconds", "First Half Minus Second Half (s)")],
    instructions: "Pick the race, enter your goal time and how much faster you want to run the second half (2% is a typical negative split; 0 is even).",
    examples: "Example: a 3:30 marathon with a 2% negative split is 1:46:04 then 1:43:56 — about 5:02 per km for the first half and 4:56 for the second, against an even 4:59.",
    assumptions: "Second half time = first half × (1 − percentage). A negative percentage plans a positive split. Also covers the marathon negative split calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a negative split?", answer: "Running the second half of a race faster than the first. Most marathon world records are run with even or slightly negative splits." },
      { question: "How big should my negative split be?", answer: "1–3% is a good target — enough to hold back early, not so much that you leave time on the course." },
    ],
  },
  {
    slug: "interval-pace-calculator",
    title: "Interval Pace Calculator",
    description: "Get rep times for 400 m, 800 m, 1 km and mile intervals from your 5K time, plus recovery jog times.",
    metaTitle: "Interval Pace Calculator — 400m, 800m, 1K Reps",
    metaDescription: "Free interval pace calculator. Turn your 5K time into target times for 400 m, 800 m, 1 km and 1600 m repeats.",
    calcInputs: hmsFields("fiveK", "Current 5K Time", 0, 25, 0),
    calcResult: { label: "400 m Rep", format: "number" },
    calcResults: [...msOut("rep400", "400 m Rep (Mile Pace)", true), ...msOut("rep800", "800 m Rep (3K Pace)"), ...msOut("rep1000", "1 km Rep (5K Pace)"), ...msOut("rep1600", "1600 m Rep (5K Pace)"), ...msOut("recovery400", "Recovery Jog After 400s")],
    instructions: "Enter a recent 5K race (or hard time-trial) time.",
    examples: "Example: a 25:00 5K runner should run 400 m reps in about 1:52, 800 m reps in 3:53 and 1 km reps in 5:00, with about 1:24 of recovery after each 400.",
    assumptions: "Mile and 3K paces come from your 5K with Riegel's formula (exponent 1.06): 400s at mile pace, 800s at 3K pace, 1K and 1600 m reps at 5K pace. Recovery ≈ 75% of the 400 rep time. " + DISCLAIMER,
    faq: [
      { question: "How many intervals should I run?", answer: "A common session totals 3–5 km of fast running — e.g. 8–12 × 400 m or 5–6 × 800 m." },
      { question: "Should intervals be all-out?", answer: "No — hit the target time on every rep. If the last reps are much slower, the pace was too fast." },
    ],
  },
  {
    slug: "progression-run-calculator",
    title: "Progression Run Calculator",
    description: "Plan a progression run — start easy and get faster each segment — with the pace for every segment, the step between them and the total time.",
    metaTitle: "Progression Run Calculator — Segment Paces",
    metaDescription: "Free progression run calculator. Get segment paces, pace steps, average pace and total time from start and finish pace.",
    calcInputs: [
      numberField("distance", "Total Distance (km or miles)", { default: 10, max: 60, step: 0.5 }),
      numberField("segments", "Number of Segments", { default: 4, min: 2, max: 12 }),
      ...msFields("startPace", "Starting Pace (per km or mile)", 6, 0),
      ...msFields("finishPace", "Finishing Pace", 5, 0),
    ],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [...hmsOut("total", "Total Time", true), ...msOut("averagePace", "Average Pace"), num("stepSeconds", "Seconds Faster Each Segment"), num("segmentDistance", "Segment Distance"), ...msOut("segment2Pace", "Segment 2 Pace"), ...msOut("segment3Pace", "Segment 3 Pace")],
    instructions: "Enter the distance, how many equal segments to split it into and your starting and finishing paces, all in the same unit (km or miles).",
    examples: "Example: 10 km in 4 segments from 6:00 down to 5:00 per km drops 20 seconds a segment (6:00, 5:40, 5:20, 5:00) and takes 55:00 — an average of 5:30 per km.",
    assumptions: "Equal-length segments with equal pace steps. " + DISCLAIMER,
    faq: [
      { question: "What is a progression run?", answer: "A run that starts at an easy pace and finishes near tempo or race pace. It builds fitness with less strain than a full tempo run." },
      { question: "How fast should I finish?", answer: "Usually around marathon to half-marathon pace for long progressions, or tempo pace for shorter ones." },
    ],
  },
  {
    slug: "long-run-calculator",
    title: "Long Run Calculator",
    description: "Find how long your long run should be from your weekly mileage and goal race, with a safe maximum and time on feet.",
    metaTitle: "Long Run Calculator — How Long Should It Be?",
    metaDescription: "Free long run calculator. Get your ideal long run distance from weekly volume and goal race, plus time on feet.",
    calcInputs: [
      dropdown("unit", "Unit", [["km", 1], ["miles", 2]], 1),
      numberField("weeklyDistance", "Weekly Distance", { default: 40, max: 300, step: 0.5 }),
      dropdown("goalRace", "Goal Race", [["5K", 1], ["10K", 2], ["Half marathon", 3], ["Marathon", 4], ["Ultra", 5]], 4),
      ...msFields("easyPace", "Easy Pace (per km or mile)", 6, 15),
    ],
    calcResult: { label: "Long Run Low", format: "number" },
    calcResults: [num("longRunLow", "Long Run — Low", true), num("longRunHigh", "Long Run — High"), num("maxLongRun", "Maximum Useful Long Run"), ...hmsOut("timeOnFeet", "Time on Feet"), pct("shareOfWeek", "Share of Weekly Volume")],
    instructions: "Enter your weekly distance, goal race and easy pace in the same unit.",
    examples: "Example: running 40 km a week for a marathon, your long run should be 11.2–14 km now (about 1:19 on your feet at 6:15 per km), building toward a 35 km maximum as weekly volume grows.",
    assumptions: "Long run ≈ 25–35% of weekly volume (up to 40% for ultras), capped at about 12/18/24/35/50 km for 5K/10K/half/marathon/ultra training. " + DISCLAIMER,
    faq: [
      { question: "How long should my longest marathon training run be?", answer: "Most plans peak at 30–35 km (18–22 miles), or about 3 hours — longer runs add more fatigue than fitness." },
      { question: "Why limit the long run to a share of weekly mileage?", answer: "A long run that's too big a slice of your week raises injury risk — build overall volume first." },
    ],
  },
  {
    slug: "run-walk-run-calculator",
    title: "Run Walk Run Calculator",
    description: "Predict your finish time with run/walk intervals (the Galloway method) — set your run and walk segments and paces for any race.",
    metaTitle: "Run Walk Run Calculator — Galloway Intervals",
    metaDescription: "Free run walk run calculator. Predict race time with run/walk intervals and see your average pace.",
    calcInputs: [
      ...raceFields(9),
      numberField("runSeconds", "Run Segment (Seconds)", { default: 240, min: 10, max: 3600 }),
      numberField("walkSeconds", "Walk Segment (Seconds)", { default: 60, max: 600 }),
      dropdown("paceUnit", "Pace Unit", PACE_UNIT, 1),
      ...msFields("runPace", "Running Pace", 6, 0),
      ...msFields("walkPace", "Walking Pace", 10, 0),
    ],
    calcResult: { label: "Finish Time", format: "number" },
    calcResults: [...hmsOut("finish", "Finish Time", true), ...msOut("averagePace", "Average Pace"), num("cycles", "Run/Walk Cycles"), pct("walkShare", "Time Spent Walking")],
    instructions: "Pick the race, set your run and walk segment lengths, and your running and walking paces.",
    examples: "Example: a half marathon running 4:00 at 6:00/km and walking 1:00 at 10:00/km finishes in about 2:17:36 — an average of 6:31 per km.",
    assumptions: "Repeats run + walk cycles to the finish at steady paces. " + DISCLAIMER,
    faq: [
      { question: "Is run/walk slower than running?", answer: "Not always — many runners finish faster because short walk breaks prevent the late-race slowdown." },
      { question: "What ratio should I use?", answer: "Beginners often use 1:1 to 2:1; experienced runners 4:1 to 8:1 (minutes running to minutes walking)." },
    ],
  },
  {
    slug: "yasso-800-calculator",
    title: "Yasso 800 Calculator",
    description: "Use Bart Yasso's 800s to predict your marathon time from your 800 m repeat time — or find the 800 time for your marathon goal.",
    metaTitle: "Yasso 800 Calculator — Marathon Predictor",
    metaDescription: "Free Yasso 800 calculator. Turn your 800 m repeat time into a marathon prediction, or get the 800 time for your goal.",
    calcInputs: [...msFields("rep", "Average 800 m Repeat Time", 3, 30), numberField("goalHours", "Goal Marathon — Hours", { default: 3, max: 8 }), numberField("goalMinutes", "Goal Marathon — Minutes", { default: 30, max: 59 })],
    calcResult: { label: "Predicted Marathon", format: "number" },
    calcResults: [...hmsOut("marathon", "Predicted Marathon", true), ...msOut("targetRep", "800 m Target for Your Goal"), ...msOut("marathonPacePerKm", "Predicted Marathon Pace per km"), num("recommendedReps", "Reps in the Full Workout")],
    instructions: "Enter the average time of your 800 m repeats (with equal-time jog recoveries), or a goal marathon time to get your 800 target.",
    examples: "Example: 10 × 800 m averaging 3:30 predicts a 3:30 marathon (4:59 per km). For a 3:30 goal, run your 800s in 3:30.",
    assumptions: "Yasso rule: an 800 time of M:SS ≈ a marathon of M hours SS minutes. It works best when backed by long runs and weekly mileage — many runners finish slower than the prediction. " + DISCLAIMER,
    faq: [
      { question: "How do I run Yasso 800s?", answer: "Run 800 m at your goal time, jog for the same time, and repeat — build from 4 reps to 10 about 2–3 weeks before the marathon." },
      { question: "Are Yasso 800s accurate?", answer: "They're a decent fitness check but optimistic for runners with low mileage; treat the result as a best case." },
    ],
  },
  {
    slug: "race-equivalency-calculator",
    title: "Race Equivalency Calculator",
    description: "Predict your equivalent times at other distances from one race result — 5K, 10K, half marathon, marathon or any distance — with Riegel's formula.",
    metaTitle: "Race Equivalency Calculator — Race Time Predictor",
    metaDescription: "Free race equivalency calculator. Predict 5K, 10K, half marathon and marathon times from one recent race result.",
    calcInputs: [
      ...raceFields(3),
      ...hmsFields("time", "Your Race Time", 0, 25, 0),
      dropdown("targetRace", "Predict For", RACES, 10),
      numberField("targetCustomKm", "Custom Target Distance (km)", { default: 42.195, max: 500, step: 0.01, required: false }),
      numberField("exponent", "Fatigue Exponent (1.06 Standard)", { default: 1.06, min: 1, max: 1.2, step: 0.01 }),
    ],
    calcResult: { label: "Predicted Time", format: "number" },
    calcResults: [...hmsOut("target", "Predicted Time", true), ...hmsOut("fiveK", "5K"), ...hmsOut("tenK", "10K"), ...hmsOut("half", "Half Marathon"), ...hmsOut("marathon", "Marathon")],
    instructions: "Enter a recent race and your time, then the distance to predict. Use 1.07–1.08 as the exponent if you're stronger at short races or lack long-run training.",
    examples: "Example: a 25:00 5K predicts about 52:07 for 10K, 1:55:00 for a half marathon and 3:59:47 for a marathon.",
    assumptions: "Riegel: T2 = T1 × (D2 ÷ D1)^1.06. Predictions assume equal training for the new distance; marathon predictions from short races are usually optimistic. " + DISCLAIMER,
    faq: [
      { question: "How accurate are race time predictions?", answer: "Usually within 2–5% for nearby distances; less reliable from 5K to marathon unless you've done the long-run training." },
      { question: "What's the difference from VDOT?", answer: "VDOT uses Jack Daniels' oxygen-cost model; Riegel uses a simple power law. Their predictions are close for most runners." },
    ],
  },
  {
    slug: "vdot-calculator",
    title: "VDOT Calculator",
    description: "Find your Jack Daniels VDOT from a race and get your training paces — easy, marathon, threshold, interval and repetition.",
    metaTitle: "VDOT Calculator — Jack Daniels Training Paces",
    metaDescription: "Free VDOT calculator. Get your VDOT from a race result and Daniels training paces: easy, marathon, threshold, interval and rep.",
    calcInputs: [...raceFields(3), ...hmsFields("time", "Race Time", 0, 25, 0), dropdown("paceUnit", "Show Paces", PACE_UNIT, 1)],
    calcResult: { label: "VDOT", format: "number" },
    calcResults: [num("vdot", "VDOT", true), ...msOut("easyPace", "Easy Pace"), ...msOut("marathonPace", "Marathon Pace"), ...msOut("thresholdPace", "Threshold Pace"), ...msOut("intervalPace", "Interval Pace"), num("rep400Seconds", "Repetition 400 m (Seconds)")],
    instructions: "Enter a recent race and your time. Choose paces per km or per mile.",
    examples: "Example: a 25:00 5K gives a VDOT of 38.3 — easy runs at about 6:19 per km, marathon pace 5:38, threshold 5:16, intervals 4:51 and 400 m reps in 111 seconds.",
    assumptions: "Daniels & Gilbert oxygen-cost and %VO2max-duration equations. Training paces at about 70% (easy), 81% (marathon), 88% (threshold), 97.5% (interval) and 104% (repetition) of VDOT. " + DISCLAIMER,
    faq: [
      { question: "What is VDOT?", answer: "Jack Daniels' performance-based measure of running fitness — like a race-derived VO2 max — used to set training paces." },
      { question: "What is a good VDOT?", answer: "About 35–40 is typical for recreational runners, 50+ for strong club runners and 70+ for elites." },
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
