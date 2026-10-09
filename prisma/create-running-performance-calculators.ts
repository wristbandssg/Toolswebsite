// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the running sub-batch B (Race Scoring & Training Load). See
// src/lib/calc-engine-running-pace.ts for the full list
// of 4 sub-batches (35 tools under Sports Calculators > Running
// Calculators), and src/lib/calc-engine-running-performance.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-running-performance-calculators.ts
// or
//   npm run db:create-running-performance-calculators

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
  "Estimates for training and race planning only, not medical advice. Scores and predictions are guides, not official results. Build training load gradually and see a professional for persistent pain or injury.";

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
const RACES: [string, number][] = [["1 mile", 1], ["5K", 2], ["8K", 3], ["5 miles", 4], ["10K", 5], ["15K", 6], ["10 miles", 7], ["Half marathon", 8], ["Marathon", 9], ["50K", 10], ["100K", 11]];
const hmsFields = (key: string, label: string, h: number, m: number, s: number) => [
  numberField(`${key}Hours`, `${label} — Hours`, { default: h, max: 100 }),
  numberField(`${key}Minutes`, `${label} — Minutes`, { default: m, max: 59 }),
  numberField(`${key}Seconds`, `${label} — Seconds`, { default: s, max: 59 }),
];
const hmsOut = (key: string, label: string) => [num(`${key}Hours`, `${label} — Hours`), num(`${key}Minutes`, `${label} — Minutes`), num(`${key}Seconds`, `${label} — Seconds`)];
const DIST_UNIT: [string, number][] = [["km", 1], ["miles", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "age-grade-calculator",
    title: "Age Grade Calculator",
    description: "Age-grade your race time with the official 2025 WMA/USATF road factors — your performance as a percentage of the world-best standard for your age and sex, plus your open-age equivalent time.",
    metaTitle: "Age Grade Calculator — WMA 2025 Running Factors",
    metaDescription: "Free running age grade calculator with official 2025 WMA/USATF factors. Get your age-graded % and open-equivalent time.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age on Race Day", { default: 45, min: 5, max: 100 }), dropdown("race", "Race", RACES, 2), ...hmsFields("time", "Finish Time", 0, 25, 0)],
    calcResult: { label: "Age Grade", format: "percentage" },
    calcResults: [pct("ageGradePercent", "Age-Graded Score", true), num("level", "Level (5 World, 4 National, 3 Regional, 2 Local, 1 Below)"), num("ageFactor", "Age Factor", false, 4), ...hmsOut("openEquivalent", "Open-Age Equivalent Time"), ...hmsOut("ageStandard", "World Standard for Your Age")],
    instructions: "Choose your sex, age on race day and race distance, then enter your finish time.",
    examples: "Example: a 45-year-old man running a 25:00 5K scores 56.3% — like a 22:47 run by an athlete in their prime. The world-best standard for his age is 14:04.",
    assumptions: "Official 2025 WMA/USATF road age-grading tables (Alan Jones, version 2025-07-25), ages 5–100, 11 road distances. Age grade = age standard ÷ your time. 90%+ world class, 80%+ national, 70%+ regional, 60%+ local class. " + DISCLAIMER,
    faq: [
      { question: "What is a good age-graded score?", answer: "60%+ is a solid local-class performance, 70%+ regional, 80%+ national class and 90%+ world class." },
      { question: "Why use age grading?", answer: "It lets runners of different ages and sexes compare fairly — and lets you compare your own results across the years." },
    ],
  },
  {
    slug: "purdy-points-calculator",
    title: "Purdy Points Calculator",
    description: "Score any race with Gardner–Purdy points (950 = the world standard), so you can compare a 5K with a marathon on one scale.",
    metaTitle: "Purdy Points Calculator — Compare Race Distances",
    metaDescription: "Free Purdy points calculator. Score races from the mile to the marathon on the Gardner–Purdy scale and compare distances.",
    calcInputs: [dropdown("race", "Race", [...RACES, ["Custom distance", 12]], 2), numberField("customKm", "Custom Distance (km)", { default: 5, max: 200, step: 0.01, required: false }), ...hmsFields("time", "Finish Time", 0, 25, 0)],
    calcResult: { label: "Purdy Points", format: "number" },
    calcResults: [num("purdyPoints", "Purdy Points", true), ...hmsOut("worldStandard", "950-Point World Standard"), ...hmsOut("time500Points", "Time for 500 Points")],
    instructions: "Choose the race (or a custom distance) and enter your time. Higher points = better.",
    examples: "Example: a 25:00 5K scores about 140 Purdy points. The 950-point standard for 5K is 13:17, and 500 points needs about 17:57.",
    assumptions: "Gardner & Purdy (1970) world-standard velocity curve and points formula (k = 0.0654 − 0.00258v), without the small start and turn corrections — results can differ by a few points from published tables. " + DISCLAIMER,
    faq: [
      { question: "What do Purdy points mean?", answer: "950 points equals the 1970-era world-standard performance at any distance; 500 points is a strong club runner." },
      { question: "Purdy points or age grading?", answer: "Purdy compares distances ignoring age; age grading also adjusts for age and sex." },
    ],
  },
  {
    slug: "world-athletics-points-calculator",
    title: "World Athletics Points Calculator",
    description: "Get your World Athletics (IAAF) scoring-table points for 1500 m, mile, 3000 m, 5K, 10K, 15K, 10 miles, half marathon, marathon and 100K.",
    metaTitle: "World Athletics Points Calculator — 2025 Tables",
    metaDescription: "Free World Athletics points calculator using the 2025 scoring tables for track and road distance events, men and women.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("event", "Event", [["1500 m", 1], ["Mile", 2], ["3000 m", 3], ["5K", 4], ["10K", 5], ["15K", 6], ["10 miles", 7], ["Half marathon", 8], ["Marathon", 9], ["100K", 10]], 4),
      ...hmsFields("time", "Time", 0, 15, 0),
    ],
    calcResult: { label: "Points", format: "number" },
    calcResults: [num("worldAthleticsPoints", "World Athletics Points", true), num("nextPointsLevel", "Next 100-Point Level"), ...hmsOut("timeForNext100", "Time Needed for That Level")],
    instructions: "Choose sex and event, then enter your time.",
    examples: "Example: a man running 5K in 15:00 scores 810 points; 900 points needs about 14:31.",
    assumptions: "World Athletics Scoring Tables 2025 (points = floor(a × (T − b)²)), coefficients as implemented in the open-source GlaivePro WA calculator. Track and road events of the same distance share coefficients here. " + DISCLAIMER,
    faq: [
      { question: "What are World Athletics points used for?", answer: "Comparing performances across events and building world rankings and championship qualification." },
      { question: "What is 1000 points?", answer: "A strong national-level performance — about a 14:00 5K or a 2:17:30 marathon for men." },
    ],
  },
  {
    slug: "running-percentile-calculator",
    title: "Running Percentile Calculator",
    description: "See what percentage of race finishers you beat — for the mile, 5K, 10K, half marathon, marathon and more — by sex (also the marathon percentile calculator).",
    metaTitle: "Running Percentile Calculator — How Fast Am I?",
    metaDescription: "Free running percentile calculator. See what share of 5K, 10K, half marathon and marathon finishers you're faster than.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), dropdown("race", "Race", RACES, 2), ...hmsFields("time", "Finish Time", 0, 25, 0)],
    calcResult: { label: "Faster Than", format: "percentage" },
    calcResults: [pct("percentile", "Faster Than (Percent of Finishers)", true), pct("topPercent", "You're in the Top"), ...hmsOut("median", "Median Finisher"), ...hmsOut("top10Percent", "Top-10% Time")],
    instructions: "Choose sex and race, and enter your finish time.",
    examples: "Example: a man running 5K in 25:00 is faster than about 88% of male finishers — the median is about 31:30 and the top 10% run under 24:23.",
    assumptions: "Approximate medians from large recreational race results (5K men 31:30 / women 38:00, 10K 58:00 / 1:07:00, half 2:00:00 / 2:15:00, marathon 4:20:00 / 4:45:00), other distances by Riegel, with log-normal spread (σ 0.2). Fields differ — trail and championship races are faster. " + DISCLAIMER,
    faq: [
      { question: "What is an average marathon time?", answer: "About 4:20 for men and 4:45 for women among recreational finishers." },
      { question: "Is the percentile against all runners?", answer: "Against people who finish races — a fitter group than the general population." },
    ],
  },
  {
    slug: "marathon-training-plan-calculator",
    title: "Marathon Training Plan Calculator",
    description: "Build a marathon or half marathon training plan outline: weekly volume build with cutback weeks, peak week, long-run peak and taper.",
    metaTitle: "Marathon Training Plan Calculator — Half & Full",
    metaDescription: "Free marathon and half marathon training plan calculator. Get your weekly build, peak week, long run peak and taper.",
    calcInputs: [
      dropdown("race", "Race", [["Marathon", 1], ["Half marathon", 2]], 1),
      dropdown("unit", "Unit", DIST_UNIT, 1),
      numberField("weeksToRace", "Weeks Until Race", { default: 16, min: 8, max: 30 }),
      numberField("currentWeekly", "Current Weekly Distance", { default: 30, max: 300, step: 0.5 }),
      numberField("peakWeekly", "Target Peak Weekly Distance", { default: 65, max: 300, step: 0.5 }),
    ],
    calcResult: { label: "Peak Week Volume", format: "number" },
    calcResults: [num("peakWeeklyVolume", "Peak Weekly Volume", true), num("peakWeek", "Week You Reach Peak"), num("reachesPlannedPeak", "Reaches Your Target Peak (1 = Yes)"), num("taperStartsWeek", "Taper Starts in Week"), num("taperWeeks", "Taper Weeks"), num("longRunPeak", "Long Run at Peak"), num("startingLongRun", "Starting Long Run"), num("raceWeekVolume", "Race-Week Volume")],
    instructions: "Choose the race, enter weeks until race day, your current weekly distance and the peak you're aiming for, in km or miles.",
    examples: "Example: 16 weeks out from a marathon at 30 km a week, building toward 65 km, you reach the peak in week 11, taper from week 14 (3 weeks) with a 22.75 km peak long run, starting from 9 km.",
    assumptions: "Volume rises up to 10% a week with a cutback week every 4th week; taper 3 weeks (marathon) or 2 (half). Long run ≈ 35% (marathon) or 33% (half) of peak volume, capped at 32 km / 20 mi (marathon) and 20 km / 13 mi (half). Also covers the half marathon training plan calculator. " + DISCLAIMER,
    faq: [
      { question: "How many weeks do I need to train for a marathon?", answer: "16–20 weeks for most runners with a base of 30+ km (20 miles) a week; beginners may want longer." },
      { question: "Why cutback weeks?", answer: "Lighter weeks every 3–4 weeks let your body absorb the training and lower injury risk." },
    ],
  },
  {
    slug: "10-percent-rule-running-calculator",
    title: "10 Percent Rule Running Calculator",
    description: "Plan safe mileage increases with the 10 percent rule — next week's distance, where you'll be after several weeks and how long it takes to reach a target.",
    metaTitle: "10 Percent Rule Running Calculator — Mileage Build",
    metaDescription: "Free 10 percent rule calculator for runners. See weekly mileage increases, total volume and weeks to reach your target.",
    calcInputs: [
      dropdown("unit", "Unit", DIST_UNIT, 1),
      numberField("currentWeekly", "Current Weekly Distance", { default: 30, max: 300, step: 0.5 }),
      percentField("increasePercent", "Weekly Increase", { default: 10, min: 1, max: 20 }),
      numberField("weeks", "Weeks to Build", { default: 8, min: 1, max: 52 }),
      numberField("targetWeekly", "Target Weekly Distance", { default: 50, max: 300, step: 0.5 }),
    ],
    calcResult: { label: "Weekly Distance After", format: "number" },
    calcResults: [num("weeklyAfter", "Weekly Distance After the Build", true), num("nextWeek", "Next Week"), num("weeksToTarget", "Weeks to Reach Your Target"), num("totalOverPeriod", "Total Distance Over the Build")],
    instructions: "Enter your current weekly distance, the weekly increase and how many weeks you'll build.",
    examples: "Example: from 30 km a week, increasing 10% a week reaches 33 km next week and 64.3 km after 8 weeks; 50 km is reached in 6 weeks.",
    assumptions: "Compounding weekly increases. The 10% rule is a guideline — most coaches also add cutback weeks and hold volume for a while after big jumps. " + DISCLAIMER,
    faq: [
      { question: "Is the 10 percent rule necessary?", answer: "It's a sensible cap, not a law. Returning runners can often build faster back to old volumes; injury-prone runners may need less." },
      { question: "Should I increase every week?", answer: "No — build 2–3 weeks, then cut back a week, to give your body time to adapt." },
    ],
  },
  {
    slug: "running-recovery-time-calculator",
    title: "Running Recovery Time Calculator",
    description: "Estimate how many days you need to recover after a race or hard run, before your next hard workout and before racing again.",
    metaTitle: "Running Recovery Time Calculator — After a Race",
    metaDescription: "Free running recovery calculator. Estimate recovery days after a race or hard run, and when to train hard or race again.",
    calcInputs: [
      dropdown("unit", "Unit", DIST_UNIT, 1),
      numberField("distance", "Race / Run Distance", { default: 21.0975, max: 200, step: 0.01 }),
      dropdown("effort", "Effort", [["Easy / steady", 1], ["Hard workout / tempo", 2], ["All-out race", 3]], 3),
      numberField("age", "Age", { default: 35, min: 10, max: 100 }),
    ],
    calcResult: { label: "Full Recovery Days", format: "number" },
    calcResults: [num("fullRecoveryDays", "Days to Full Recovery", true), num("daysBeforeHardWorkout", "Days Before a Hard Workout"), num("daysBeforeNextRace", "Days Before Racing Again"), num("restDays", "Complete Rest Days Right After")],
    instructions: "Enter the distance, how hard it was and your age.",
    examples: "Example: an all-out half marathon at 35 needs about 13 days to recover fully — wait about a week before hard workouts and a little over 2 weeks before racing again.",
    assumptions: "Rule of thumb: about one easy day per mile raced at full effort (less for workouts), +10% after 40 and +25% after 50. Listen to your body — soreness, sleep and resting heart rate are better guides. " + DISCLAIMER,
    faq: [
      { question: "How long should I rest after a marathon?", answer: "Most runners need 3–4 weeks before hard training or racing, with a few days fully off and easy running after." },
      { question: "Is easy running OK during recovery?", answer: "Yes — short, easy runs after a few days help blood flow and recovery." },
    ],
  },
  {
    slug: "acute-chronic-workload-ratio-calculator",
    title: "Acute Chronic Workload Ratio Calculator",
    description: "Calculate your acute:chronic workload ratio (ACWR) from your last four weeks of training to check injury risk, with the rolling and EWMA methods.",
    metaTitle: "Acute Chronic Workload Ratio (ACWR) Calculator",
    metaDescription: "Free ACWR calculator. Compare this week's load with your 4-week average to spot training spikes and injury risk.",
    calcInputs: [
      numberField("week1", "Load 3 Weeks Ago (km, miles, minutes or TRIMP)", { default: 40, max: 10000, step: 0.5 }),
      numberField("week2", "Load 2 Weeks Ago", { default: 42, max: 10000, step: 0.5 }),
      numberField("week3", "Load Last Week", { default: 38, max: 10000, step: 0.5 }),
      numberField("week4", "Load This Week", { default: 45, max: 10000, step: 0.5 }),
    ],
    calcResult: { label: "ACWR", format: "number" },
    calcResults: [num("acwr", "Acute:Chronic Ratio", true), num("riskZone", "Zone (1 Low Load, 2 Sweet Spot, 3 Caution, 4 High Risk)"), num("acuteLoad", "Acute Load (This Week)"), num("chronicLoad", "Chronic Load (4-Week Average)"), num("ewmaRatio", "EWMA Ratio"), num("maxSafeNextWeek", "Max Next-Week Load (1.3 Ratio)")],
    instructions: "Enter your training load for each of the last four weeks, oldest first, in one measure — distance, minutes or TRIMP.",
    examples: "Example: weekly loads of 40, 42, 38 and 45 km give a ratio of 1.09 — the 0.8–1.3 sweet spot. Next week should stay under about 53.6 km.",
    assumptions: "Rolling average: acute = latest week, chronic = 4-week mean (Gabbett 2016). EWMA uses 1- and 4-week decay constants applied weekly. ACWR is a guide only — its link to injury is debated. " + DISCLAIMER,
    faq: [
      { question: "What is a good ACWR?", answer: "About 0.8–1.3 is called the sweet spot; above 1.5 marks a big spike linked to higher injury risk." },
      { question: "What load measure should I use?", answer: "Any consistent one — distance for runners, or minutes × effort (session RPE) or TRIMP to capture intensity." },
    ],
  },
  {
    slug: "trimp-calculator",
    title: "TRIMP Calculator",
    description: "Calculate Banister TRIMP (training impulse) for a workout from duration and heart rate — a single number for how hard the session was.",
    metaTitle: "TRIMP Calculator — Banister Training Impulse",
    metaDescription: "Free TRIMP calculator. Get Banister training impulse from duration, average, resting and max heart rate.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("minutes", "Duration (Minutes)", { default: 60, max: 1000 }),
      numberField("avgHr", "Average Heart Rate (bpm)", { default: 150, min: 40, max: 230 }),
      numberField("restingHr", "Resting Heart Rate (bpm)", { default: 55, min: 30, max: 120 }),
      numberField("maxHr", "Max Heart Rate (bpm)", { default: 190, min: 100, max: 230 }),
    ],
    calcResult: { label: "TRIMP", format: "number" },
    calcResults: [num("trimp", "TRIMP", true), pct("heartRateReservePercent", "Average % of Heart Rate Reserve"), num("trimpPerHour", "TRIMP per Hour"), num("sessionLoad", "Session Load (1 Easy … 4 Very Hard)")],
    instructions: "Enter the workout's duration and average heart rate, plus your resting and maximum heart rate.",
    examples: "Example: a 60-minute run averaging 150 bpm, with a resting HR of 55 and max of 190, is 70% of heart rate reserve and a TRIMP of 104 — a hard session.",
    assumptions: "Banister TRIMP = minutes × HRr × 0.64e^(1.92 × HRr) for men (0.86e^(1.67 × HRr) for women), where HRr is the fraction of heart rate reserve. Using average HR under-counts interval sessions. " + DISCLAIMER,
    faq: [
      { question: "What is a high TRIMP?", answer: "Under 50 is easy, 50–100 moderate, 100–200 hard and over 200 very hard for a single session." },
      { question: "How do I use TRIMP?", answer: "Add it up week by week to track training load, or use it in the ACWR calculator." },
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
