// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the sports performance sub-batch G (Military & Occupational Fitness Tests). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-military-tests.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-military-tests-calculators.ts
// or
//   npm run db:create-sports-military-tests-calculators

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
  "Unofficial calculators for practice and planning. Official scores come only from your service's or agency's current scoring tables and test administrators, and standards change — always check the latest official guidance. Get medical clearance before maximal fitness testing.";

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

const SEX: [string, number][] = [["Male", 1], ["Female", 2]];
const ESTIMATE =
  "Points between the pass line and the maximum are interpolated in a straight line from the official minimum and maximum standards for your age and sex, so they can differ by a few points from the official table — the pass/fail lines and maximums are exact.";
const time = (key: string, label: string, m: number, s: number, maxMin = 60) => [
  numberField(`${key}Min`, `${label} — Minutes`, { default: m, max: maxMin }),
  numberField(`${key}Sec`, `${label} — Seconds`, { default: s, max: 59 }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "army-acft-calculator",
    title: "Army ACFT Calculator (AFT 2025)",
    description: "Score the Army fitness test — the Army Fitness Test (AFT) that replaced the ACFT in 2025: deadlift, hand-release push-ups, sprint-drag-carry, plank and 2-mile run, general or combat standard.",
    metaTitle: "Army ACFT / AFT Calculator 2025 — Score Your Test",
    metaDescription: "Free Army ACFT and AFT score calculator. Score all 5 events by age and sex on the general or combat standard and see if you pass.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("age", "Age", { default: 22, min: 17, max: 70 }),
      dropdown("standard", "Standard", [["General (age and sex)", 1], ["Combat (age only, 350 total)", 2]], 1),
      numberField("deadlift", "3-Rep Max Deadlift (lb)", { default: 250, max: 400, step: 10 }),
      numberField("pushUps", "Hand-Release Push-Ups (2 Min)", { default: 30, max: 100 }),
      ...time("sdc", "Sprint-Drag-Carry", 2, 0, 10),
      ...time("plank", "Plank", 2, 30, 10),
      ...time("run", "2-Mile Run", 17, 0, 40),
    ],
    calcResult: { label: "Total Score", format: "number" },
    calcResults: [num("totalScore", "Total Score (out of 500)", true), num("passes", "Passes (1 = Yes)"), num("deadliftPoints", "Deadlift Points"), num("pushUpPoints", "Push-Up Points"), num("sprintDragCarryPoints", "Sprint-Drag-Carry Points"), num("plankPoints", "Plank Points"), num("runPoints", "2-Mile Run Points")],
    instructions: "Choose sex, age and standard, then enter your raw score for each event. Times are minutes and seconds.",
    examples: "Example: a 22-year-old man with a 250 lb deadlift, 30 push-ups, a 2:00 sprint-drag-carry, a 2:30 plank and a 17:00 two-mile scores about 391 of 500 — a pass (every event 60+ and 300+ total).",
    assumptions: "AFT scoring tables effective 1 June 2025 (60 and 100-point standards for every age group and sex). General standard: 60+ per event and 300+ total. Combat standard: male column for everyone and 350+ total. The AFT dropped the ACFT's standing power throw. " + ESTIMATE + " " + DISCLAIMER,
    faq: [
      { question: "Is the ACFT still used?", answer: "No — the Army Fitness Test (AFT) replaced the ACFT as the test of record on 1 June 2025. It keeps five of the ACFT's six events and drops the standing power throw." },
      { question: "What score do I need to pass?", answer: "At least 60 points in every event and 300 total on the general standard; combat specialties need 350 on the sex-neutral combat standard." },
    ],
  },
  {
    slug: "army-apft-calculator",
    title: "Army APFT Calculator",
    description: "Score the legacy Army Physical Fitness Test (APFT) — 2-minute push-ups, 2-minute sit-ups and the 2-mile run — by age and sex.",
    metaTitle: "Army APFT Calculator — Push-Ups, Sit-Ups, 2-Mile",
    metaDescription: "Free APFT score calculator. Score push-ups, sit-ups and the 2-mile run by age and sex and see if you pass the 180-point standard.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age", { default: 22, min: 17, max: 70 }), numberField("pushUps", "Push-Ups (2 Min)", { default: 50, max: 120 }), numberField("sitUps", "Sit-Ups (2 Min)", { default: 60, max: 120 }), ...time("run", "2-Mile Run", 15, 0, 40)],
    calcResult: { label: "Total Score", format: "number" },
    calcResults: [num("totalScore", "Total Score (out of 300)", true), num("passes", "Passes (1 = Yes)"), num("pushUpPoints", "Push-Up Points"), num("sitUpPoints", "Sit-Up Points"), num("runPoints", "2-Mile Run Points")],
    instructions: "Enter sex, age, push-ups and sit-ups in 2 minutes each, and your 2-mile run time.",
    examples: "Example: a 22-year-old man with 50 push-ups, 60 sit-ups and a 15:00 two-mile scores about 223 of 300 — a pass.",
    assumptions: "FM 7-22 APFT standards (60 and 100-point values for every age group and sex). Pass: 60+ in each event and 180+ total. The APFT was replaced as the Army's test of record (by the ACFT in 2020, then the AFT in 2025), but some programmes and other organisations still use it. " + ESTIMATE + " " + DISCLAIMER,
    faq: [
      { question: "Is the APFT still used?", answer: "Not as the Army's test of record, but it's still used for some ROTC, JROTC, academy and civilian fitness programmes." },
      { question: "What's a perfect APFT score?", answer: "300 — 100 in each event. For men 17–21 that's 71 push-ups, 78 sit-ups and a 13:00 two-mile." },
    ],
  },
  {
    slug: "navy-prt-calculator",
    title: "Navy PRT Calculator",
    description: "Score the Navy Physical Readiness Test — push-ups, forearm plank and 1.5-mile run — by age and sex, with event points and an overall score.",
    metaTitle: "Navy PRT Calculator — Push-Ups, Plank, 1.5-Mile",
    metaDescription: "Free Navy PRT calculator. Score push-ups, plank and 1.5-mile run by age and sex and see if you pass.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age", { default: 22, min: 17, max: 80 }), numberField("pushUps", "Push-Ups (2 Min)", { default: 50, max: 150 }), ...time("plank", "Forearm Plank", 2, 0, 10), ...time("run", "1.5-Mile Run", 12, 0, 30)],
    calcResult: { label: "Overall Score", format: "number" },
    calcResults: [num("overallScore", "Overall Score (Average of Events)", true), num("passes", "Passes (1 = Yes)"), num("pushUpPoints", "Push-Up Points"), num("plankPoints", "Plank Points"), num("runPoints", "1.5-Mile Run Points")],
    instructions: "Enter sex, age, push-ups in 2 minutes, your plank hold and your 1.5-mile run time.",
    examples: "Example: a 22-year-old man with 50 push-ups, a 2:00 plank and a 12:00 run scores about 59, 66 and 62 points — an overall 62, a pass.",
    assumptions: "Navy PRT standards per age group and sex: Probationary (45 points, the minimum pass in each event) to Outstanding High (100). Overall score = average of the three events. " + ESTIMATE + " Check the current Navy PRT guide for official use. " + DISCLAIMER,
    faq: [
      { question: "What do I need to pass the Navy PRT?", answer: "At least the Probationary level (45 points) in all three events — failing one event fails the test." },
      { question: "Can I do an alternative cardio event?", answer: "Yes — commands can allow a 2 km row, 12-minute bike or 500 yd swim instead of the run. This calculator scores the run." },
    ],
  },
  {
    slug: "air-force-pt-test-calculator",
    title: "Air Force PT Test Calculator (2026 PFRA)",
    description: "Score the 2026 Air Force fitness test (PFRA): 2-mile run (50 pts), push-ups (15), sit-ups or plank (15) and waist-to-height ratio (20), by age and sex.",
    metaTitle: "Air Force PT Test Calculator 2026 — PFRA Score",
    metaDescription: "Free Air Force PT calculator for the 2026 PFRA. Score the 2-mile run, push-ups, sit-ups or plank and waist-to-height ratio.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("age", "Age", { default: 22, min: 17, max: 70 }),
      ...time("run", "2-Mile Run", 16, 0, 40),
      numberField("pushUps", "Push-Ups (1 Min)", { default: 40, max: 120 }),
      dropdown("coreEvent", "Core Event", [["Sit-ups (1 min)", 1], ["Forearm plank", 2]], 1),
      numberField("sitUps", "Sit-Ups (1 Min)", { default: 45, max: 120, required: false }),
      ...time("plank", "Plank (if Chosen)", 2, 30, 10),
      numberField("waist", "Waist Circumference (in)", { default: 32, max: 80, step: 0.25 }),
      numberField("height", "Height (in)", { default: 70, min: 48, max: 90, step: 0.25 }),
    ],
    calcResult: { label: "Composite Score", format: "number" },
    calcResults: [num("compositeScore", "Composite Score (out of 100)", true), num("passes", "Passes (1 = Yes)"), num("runPoints", "2-Mile Run Points (of 50)"), num("pushUpPoints", "Push-Up Points (of 15)"), num("corePoints", "Core Points (of 15)"), num("waistToHeightPoints", "Waist-to-Height Points (of 20)"), num("waistToHeightRatio", "Waist-to-Height Ratio")],
    instructions: "Enter sex, age, your 2-mile run time, push-ups in 1 minute, your core event and your waist (at the top of the hip bone) and height in inches.",
    examples: "Example: a 22-year-old man running 16:00, doing 40 push-ups and 45 sit-ups, with a 32 in waist at 70 in tall (ratio 0.46), scores about 78.3 — a pass.",
    assumptions: "2026 PFRA (official from 1 July 2026): cardio 50 (pass 35), strength 15 and core 15 (minimum 2.5 each), waist-to-height 20 (0.49 or less = 20 points, 0.60+ = 0, no minimum). Pass = 75+ composite with no failed component. " + ESTIMATE + " The HAMR and hand-release push-up options aren't scored here. " + DISCLAIMER,
    faq: [
      { question: "What changed in the 2026 Air Force PT test?", answer: "The run became 2 miles, waist-to-height ratio returned as a scored component (20 points), and strength and core dropped to 15 points each. Testing is every six months." },
      { question: "Can I fail on waist-to-height ratio alone?", answer: "No — it has no minimum, but a poor ratio costs up to 20 points toward the 75 needed." },
    ],
  },
  {
    slug: "marine-pft-calculator",
    title: "Marine PFT Calculator",
    description: "Score the Marine Corps Physical Fitness Test — pull-ups or push-ups, plank and 3-mile run — by age and sex, with your class (1st, 2nd or 3rd).",
    metaTitle: "Marine PFT Calculator — USMC PFT Score",
    metaDescription: "Free Marine Corps PFT calculator. Score pull-ups or push-ups, plank and the 3-mile run by age and sex and see your PFT class.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("age", "Age", { default: 22, min: 17, max: 70 }),
      dropdown("upperBodyEvent", "Upper-Body Event", [["Pull-ups (up to 100 pts)", 1], ["Push-ups, 2 min (up to 70 pts)", 2]], 1),
      numberField("reps", "Reps", { default: 12, max: 150 }),
      ...time("plank", "Plank", 2, 30, 10),
      ...time("run", "3-Mile Run", 22, 0, 45),
    ],
    calcResult: { label: "Total Score", format: "number" },
    calcResults: [num("totalScore", "Total Score (out of 300)", true), num("pftClass", "PFT Class (1st, 2nd, 3rd; 0 = Fail)"), num("upperBodyPoints", "Upper-Body Points"), num("plankPoints", "Plank Points"), num("runPoints", "3-Mile Run Points")],
    instructions: "Enter sex and age, choose pull-ups or push-ups and enter your reps, then your plank and 3-mile run times.",
    examples: "Example: a 22-year-old man with 12 pull-ups, a 2:30 plank and a 22:00 three-mile scores about 209 — a second-class PFT.",
    assumptions: "USMC PFT standards by age group and sex (MCO 6100.13A with the 2023 plank change). Pull-ups score 40–100 (women's minimum earns 60), push-ups 40–70, plank 1:10 = 40 to 3:45 = 100, run 40–100. Classes: 1st 235+, 2nd 200–234, 3rd 150–199. " + ESTIMATE + " " + DISCLAIMER,
    faq: [
      { question: "Should I do pull-ups or push-ups?", answer: "Pull-ups if you can — push-ups top out at 70 points, so a perfect 300 needs pull-ups." },
      { question: "Did crunches leave the Marine PFT?", answer: "Yes — the plank fully replaced crunches in 2023." },
    ],
  },
  {
    slug: "police-fitness-test-calculator",
    title: "Police Fitness Test Calculator",
    description: "Check your police fitness test against the Cooper Institute standards many academies use — 1-minute sit-ups, 1-minute push-ups and the 1.5-mile run, by age and sex.",
    metaTitle: "Police Fitness Test Calculator — Cooper Standards",
    metaDescription: "Free police fitness test calculator. Check sit-ups, push-ups and 1.5-mile run against Cooper Institute academy standards.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age", { default: 25, min: 18, max: 70 }), numberField("sitUps", "Sit-Ups (1 Min)", { default: 35, max: 100 }), numberField("pushUps", "Push-Ups (1 Min)", { default: 30, max: 120 }), ...time("run", "1.5-Mile Run", 13, 0, 30)],
    calcResult: { label: "Events Passed", format: "number" },
    calcResults: [num("eventsPassed", "Events Passed (of 3)", true), num("passes", "Passes All (1 = Yes)"), num("sitUpsRequired", "Sit-Ups Required"), num("pushUpsRequired", "Push-Ups Required"), num("runSecondsRequired", "1.5-Mile Time Allowed (Seconds)"), num("runSecondsMargin", "Run Margin (Seconds, + = Under Limit)")],
    instructions: "Enter sex, age and your scores. Check your agency's exact standards — many use these, but some set their own.",
    examples: "Example: a 25-year-old man with 35 sit-ups, 30 push-ups and a 13:00 run passes all three events (needs 35, 26 and 13:16), with 16 seconds to spare on the run.",
    assumptions: "Cooper Institute 30th-percentile law enforcement standards (ages 20–29, 30–39, 40–49, 50+) used by many US academies, e.g. Pennsylvania MPOETC. Some agencies use the 40th or 50th percentile, a 300 m run or a different battery. " + DISCLAIMER,
    faq: [
      { question: "Do all police academies use the same test?", answer: "No — standards vary by state and agency. The Cooper Institute's age- and sex-adjusted standards are among the most common." },
      { question: "How do I prepare for a police fitness test?", answer: "Practise the exact events at the test's pace and form for 8–12 weeks, building to above the required numbers." },
    ],
  },
  {
    slug: "firefighter-cpat-calculator",
    title: "Firefighter CPAT Calculator",
    description: "Add up your Candidate Physical Ability Test (CPAT) event times and walks to see if you finish under the 10:20 limit, and by how much.",
    metaTitle: "Firefighter CPAT Calculator — 10:20 Time Limit",
    metaDescription: "Free CPAT calculator for firefighter candidates. Add your event and walk times and check them against the 10 min 20 s limit.",
    calcInputs: [
      numberField("stairClimb", "Stair Climb (Fixed 3:00 = 180 s)", { default: 180, max: 400 }),
      numberField("hoseDrag", "Hose Drag (s)", { default: 60, max: 400 }),
      numberField("equipmentCarry", "Equipment Carry (s)", { default: 50, max: 400 }),
      numberField("ladderRaise", "Ladder Raise & Extension (s)", { default: 50, max: 400 }),
      numberField("forcibleEntry", "Forcible Entry (s)", { default: 40, max: 400 }),
      numberField("search", "Search (s)", { default: 70, max: 400 }),
      numberField("rescueDrag", "Rescue Drag (s)", { default: 45, max: 400 }),
      numberField("ceilingBreach", "Ceiling Breach & Pull (s)", { default: 70, max: 400 }),
      numberField("transitions", "Walks Between Events, Total (s)", { default: 50, max: 400 }),
    ],
    calcResult: { label: "Total Time", format: "number" },
    calcResults: [num("totalSeconds", "Total Time (Seconds)", true), num("totalMinutes", "Total — Minutes"), num("totalRemainderSeconds", "Total — Seconds"), num("passes", "Passes (1 = Yes)"), num("secondsUnderLimit", "Seconds Under the Limit (− = Over)")],
    instructions: "Enter how long each event takes you in practice, plus the walking time between events. The stair climb is a fixed 3 minutes.",
    examples: "Example: the default practice times add up to 615 seconds — 10:15, a pass with 5 seconds to spare.",
    assumptions: "CPAT: 8 events in sequence wearing a 50 lb vest (plus 25 lb on the shoulders for the stair climb), with 85 ft walks between events; the total must be 10:20 or less. Any failed event (e.g. stepping off the stair climber) fails the test regardless of time. " + DISCLAIMER,
    faq: [
      { question: "What is the CPAT time limit?", answer: "10 minutes and 20 seconds for all eight events, including the walks between them." },
      { question: "Can I run between CPAT events?", answer: "No — running is not allowed between events; you must walk." },
    ],
  },
  {
    slug: "presidential-fitness-test-calculator",
    title: "Presidential Fitness Test Calculator",
    description: "Check whether a student aged 6–17 meets the Presidential Physical Fitness Award standards (85th percentile) for curl-ups, shuttle run, V-sit reach, the mile and pull-ups or push-ups.",
    metaTitle: "Presidential Fitness Test Calculator — Award Standards",
    metaDescription: "Free Presidential Fitness Test calculator. Check curl-ups, shuttle run, V-sit, mile and pull-ups against the 85th percentile award.",
    calcInputs: [
      dropdown("sex", "Sex", [["Boy", 1], ["Girl", 2]], 1),
      numberField("age", "Age (6–17)", { default: 12, min: 6, max: 17 }),
      numberField("curlUps", "Curl-Ups (1 Min)", { default: 52, max: 100 }),
      numberField("shuttleRun", "Shuttle Run (Seconds)", { default: 9.6, min: 5, max: 30, step: 0.1 }),
      numberField("vSitReach", "V-Sit Reach (Inches)", { default: 4.5, min: -10, max: 20, step: 0.5 }),
      ...time("mile", "1-Mile Run", 7, 5, 30),
      dropdown("upperBodyEvent", "Upper-Body Event", [["Pull-ups", 1], ["Right-angle push-ups", 2]], 1),
      numberField("upperBodyReps", "Pull-Ups or Push-Ups", { default: 8, max: 100 }),
    ],
    calcResult: { label: "Events Met", format: "number" },
    calcResults: [num("eventsMet", "Events at Award Standard (of 5)", true), num("presidentialAward", "Presidential Award (1 = Yes)"), num("curlUpsNeeded", "Curl-Ups Needed"), num("shuttleRunNeeded", "Shuttle Run Needed (s)"), num("vSitNeeded", "V-Sit Needed (in)"), num("mileSecondsNeeded", "Mile Needed (Seconds)"), num("upperBodyNeeded", "Pull-Ups / Push-Ups Needed")],
    instructions: "Enter the student's sex, age and score in each of the five events.",
    examples: "Example: a 12-year-old boy with 52 curl-ups, a 9.6 s shuttle run, a 4.5 in V-sit, a 7:05 mile and 8 pull-ups meets all five standards (50, 9.8 s, 4 in, 7:11 and 7) — Presidential Award level.",
    assumptions: "Classic President's Challenge Presidential Physical Fitness Award standards (85th percentile of the 1985 School Population Fitness Survey). The award needs all five events. The reinstated 2025 Presidential Fitness Test may use different events and standards — check your school's version. " + DISCLAIMER,
    faq: [
      { question: "Is the Presidential Fitness Test back?", answer: "Yes — it was reinstated by executive order in 2025. Schools may use updated events and standards; this tool uses the classic award benchmarks." },
      { question: "What percentile is the Presidential Award?", answer: "The 85th percentile — better than 85% of students of the same age and sex in every event." },
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
