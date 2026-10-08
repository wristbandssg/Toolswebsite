// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the sports performance sub-batch F (Fitness Tests). See
// prisma/create-sports-strength-programming-calculators.ts for the full list
// of 8 sub-batches (76 tools under Sports Calculators > Sports Performance
// Calculators), and src/lib/calc-engine-sports-fitness-tests.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-sports-fitness-tests-calculators.ts
// or
//   npm run db:create-sports-fitness-tests-calculators

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
  "Fitness test norms are general guides from published population data; your sport, coach or organisation may use different standards. Warm up first, and stop any test if you feel pain, dizziness or chest discomfort. Check with a doctor before maximal testing if you have a health condition.";

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
const RATING5 = "Rating (5 Excellent, 4 Very Good, 3 Good, 2 Fair, 1 Needs Improvement)";
const RATING7 = "Rating (7 Excellent … 4 Average … 1 Very Poor)";

const TOOLS: ToolDef[] = [
  {
    slug: "lactate-threshold-calculator",
    title: "Lactate Threshold Calculator",
    description: "Find your lactate threshold heart rate and pace from a 30-minute time trial, with Joe Friel's heart-rate training zones.",
    metaTitle: "Lactate Threshold Calculator — LTHR & Zones",
    metaDescription: "Free lactate threshold calculator. Get your threshold heart rate, threshold pace and training zones from a 30-minute time trial.",
    calcInputs: [
      numberField("avgHrLast20", "Average HR, Last 20 Minutes of a 30-Min Trial (bpm)", { default: 165, min: 80, max: 220 }),
      numberField("distanceKm", "Distance Covered in 30 Minutes (km, Optional)", { default: 7.2, max: 15, step: 0.01, required: false }),
    ],
    calcResult: { label: "Threshold Heart Rate", format: "number" },
    calcResults: [
      num("lactateThresholdHr", "Lactate Threshold Heart Rate (bpm)", true),
      num("thresholdPaceMinPerKm", "Threshold Pace — Minutes per km"),
      num("thresholdPaceSecPerKm", "Threshold Pace — Seconds"),
      num("zone2Low", "Zone 2 Low (85%)"),
      num("zone2High", "Zone 2 High (89%)"),
      num("zone3Low", "Zone 3 Low (90%)"),
      num("zone3High", "Zone 3 High (94%)"),
      num("zone4Low", "Zone 4 Low (95%)"),
      num("zone4High", "Zone 4 High (99%)"),
      num("zone5Low", "Zone 5 Starts (100%+)"),
    ],
    instructions: "Warm up, then run (or ride) as hard as you can sustain for 30 minutes, alone. Press lap at 10 minutes and note your average heart rate for the last 20 minutes and the total distance.",
    examples: "Example: an average of 165 bpm over the last 20 minutes and 7.2 km covered gives a lactate threshold heart rate of 165 and a threshold pace of 4:10 per km. Zone 2 is 140–147 bpm and zone 4 is 157–163.",
    assumptions: "Joe Friel's 30-minute field test and running zones (zone 1 below 85% of LTHR). Threshold pace assumes even pacing over the 30 minutes. " + DISCLAIMER,
    faq: [
      { question: "What is lactate threshold?", answer: "The intensity above which lactate builds up faster than your body clears it — roughly the hardest pace you can hold for about an hour." },
      { question: "Why the last 20 minutes only?", answer: "Heart rate takes several minutes to settle at a steady effort, so the first 10 minutes are left out." },
    ],
  },
  {
    slug: "cooper-1-5-mile-calculator",
    title: "Cooper 1.5 Mile Calculator",
    description: "Turn your 1.5-mile run time into an estimated VO2 max, pace per mile, speed and aerobic capacity in METs.",
    metaTitle: "Cooper 1.5 Mile Run Calculator — VO2 Max",
    metaDescription: "Free 1.5 mile run calculator. Estimate VO2 max, pace per mile and speed from your 1.5-mile run test time.",
    calcInputs: [numberField("minutes", "Run Time — Minutes", { default: 12, min: 5, max: 40 }), numberField("seconds", "Run Time — Seconds", { default: 0, max: 59, required: false })],
    calcResult: { label: "VO2 Max", format: "number" },
    calcResults: [num("vo2Max", "Estimated VO2 Max (ml/kg/min)", true), num("paceMinPerMile", "Pace — Minutes per Mile"), num("paceSecPerMile", "Pace — Seconds"), num("speedMph", "Average Speed (mph)"), num("mets", "Aerobic Capacity (METs)")],
    instructions: "Run 1.5 miles (2.4 km, six laps of a 400 m track) as fast as you can and enter your time.",
    examples: "Example: a 12:00 run is an 8:00-per-mile pace at 7.5 mph, estimating a VO2 max of 43.8 ml/kg/min.",
    assumptions: "VO2 max = 3.5 + 483 ÷ time in minutes (Cooper Institute equation). The 1.5-mile run is used in military, police and fire service tests. " + DISCLAIMER,
    faq: [
      { question: "What is a good 1.5-mile time?", answer: "Under about 12 minutes is good for adult men and under 14 for women; under 10 minutes is excellent." },
      { question: "How is this different from the Cooper 12-minute test?", answer: "Cooper's original test measures distance in 12 minutes; the 1.5-mile test times a fixed distance. Both estimate VO2 max." },
    ],
  },
  {
    slug: "beep-test-calculator",
    title: "Beep Test Calculator",
    description: "Convert your beep test (20 m multistage fitness test) level and shuttle — or PACER laps — into an estimated VO2 max, total distance and final speed.",
    metaTitle: "Beep Test Calculator — Level to VO2 Max (PACER)",
    metaDescription: "Free beep test calculator. Turn your bleep test level and shuttle or PACER laps into VO2 max, distance and speed.",
    calcInputs: [
      numberField("level", "Level Reached", { default: 8, min: 1, max: 21 }),
      numberField("shuttle", "Shuttle Within That Level", { default: 4, max: 16 }),
      numberField("pacerLaps", "Or PACER Laps (0 = Use Level)", { default: 0, max: 250, required: false }),
    ],
    calcResult: { label: "VO2 Max", format: "number" },
    calcResults: [num("vo2Max", "Estimated VO2 Max (ml/kg/min)", true), num("totalShuttles", "Total Shuttles"), num("distanceMeters", "Total Distance (m)"), num("finalSpeedKmh", "Final Speed (km/h)"), num("level", "Level"), num("shuttle", "Shuttle")],
    instructions: "Enter the last level and shuttle you completed — written like 8.4 for level 8, shuttle 4. If you ran the FitnessGram PACER, enter your laps instead.",
    examples: "Example: level 8, shuttle 4 is 65 shuttles (1,300 m) at a final speed of 12 km/h, estimating a VO2 max of 41.2 ml/kg/min.",
    assumptions: "Flouris et al. (2005) equation; 20 m shuttles; level 1 at 8.5 km/h, +0.5 km/h per level. The PACER uses the same 20 m beep protocol. Also covers the PACER test calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good beep test score?", answer: "Level 9–10 is good for adult men and 7–8 for women; elite footballers often reach 13+." },
      { question: "Is the beep test the same as the PACER test?", answer: "Yes — the PACER is the FitnessGram name for the 20 m progressive shuttle run, scored in laps." },
    ],
  },
  {
    slug: "harvard-step-test-calculator",
    title: "Harvard Step Test Calculator",
    description: "Score the Harvard step test — long-form and short-form fitness index with a rating — and estimate VO2 max with the Queens College step test.",
    metaTitle: "Harvard Step Test Calculator — Fitness Index",
    metaDescription: "Free Harvard step test calculator. Get the long- and short-form fitness index, rating, and Queens College step test VO2 max.",
    calcInputs: [
      numberField("durationSeconds", "Seconds Stepped (Max 300)", { default: 300, min: 1, max: 300 }),
      numberField("hr1", "Beats Counted 1:00–1:30 After", { default: 70, min: 10, max: 150 }),
      numberField("hr2", "Beats Counted 2:00–2:30 After", { default: 60, min: 10, max: 150 }),
      numberField("hr3", "Beats Counted 3:00–3:30 After", { default: 55, min: 10, max: 150 }),
      dropdown("sex", "Sex (Queens College Test)", SEX, 1),
      numberField("queensHr", "Queens College Recovery HR in bpm (Optional)", { default: 0, max: 220, required: false }),
    ],
    calcResult: { label: "Fitness Index", format: "number" },
    calcResults: [num("fitnessIndex", "Harvard Fitness Index", true), num("rating", "Rating (5 Excellent, 4 Good, 3 High Avg, 2 Low Avg, 1 Poor)"), num("shortFormIndex", "Short-Form Index"), num("queensCollegeVo2", "Queens College VO2 Max")],
    instructions: "Step up and down on a 50 cm (20 in) step at 30 steps a minute for up to 5 minutes. Sit down and count your pulse beats for 30 seconds starting at 1:00, 2:00 and 3:00 after stopping. For the Queens College test (41.3 cm step, 3 minutes), enter your heart rate counted 5–20 seconds after, multiplied by 4.",
    examples: "Example: 5 full minutes with 70, 60 and 55 beats in the three counts gives a fitness index of 81.1 — good. The short form gives 77.9.",
    assumptions: "Long form = 100 × seconds ÷ (2 × sum of the three counts). Short form = 100 × seconds ÷ (5.5 × first count). Ratings: 90+ excellent, 80–89 good, 65–79 high average, 55–64 low average, below 55 poor. Queens College (McArdle 1972): men 111.33 − 0.42 × HR, women 65.81 − 0.1847 × HR. Also covers the step test calculator. " + DISCLAIMER,
    faq: [
      { question: "What does the Harvard step test measure?", answer: "How quickly your heart rate recovers after a steady workload — a good marker of aerobic fitness." },
      { question: "What if I can't finish 5 minutes?", answer: "Enter the seconds you managed; the index accounts for it." },
    ],
  },
  {
    slug: "push-up-test-calculator",
    title: "Push-Up Test Calculator",
    description: "Rate your push-up test score against age and sex norms — from needs improvement to excellent — and see the reps for the next level.",
    metaTitle: "Push-Up Test Calculator — Fitness Norms by Age",
    metaDescription: "Free push-up test calculator. Rate your max push-ups by age and sex and see how many reps you need for the next rating.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age", { default: 30, min: 15, max: 69 }), numberField("reps", "Push-Ups Completed", { default: 25, max: 150 })],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", RATING5, true), num("repsForNextRating", "Reps for Next Rating"), num("repsForExcellent", "Reps for Excellent")],
    instructions: "Do as many push-ups as you can without stopping and with good form — chest to about a fist's height from the floor. Men use the standard position, women the bent-knee position, as in the norms.",
    examples: "Example: a 30-year-old man doing 25 push-ups rates very good (22–29); 30 reaches excellent.",
    assumptions: "Canadian Society for Exercise Physiology (CSEP) norms for ages 15–69; women's norms are for knee push-ups. " + DISCLAIMER,
    faq: [
      { question: "How many push-ups should I be able to do?", answer: "For men in their 20s, 22–28 is good and 36+ excellent; for women (knee push-ups), 15–20 is good and 30+ excellent." },
      { question: "Is there a time limit?", answer: "No — this test counts continuous push-ups to fatigue. Military tests often use 1 or 2 minutes instead." },
    ],
  },
  {
    slug: "sit-up-test-calculator",
    title: "Sit-Up Test Calculator",
    description: "Rate your 1-minute sit-up test against age and sex norms on a 7-level scale, and see the reps you need for the next level.",
    metaTitle: "Sit-Up Test Calculator — 1-Minute Sit-Up Norms",
    metaDescription: "Free sit-up test calculator. Rate your 1-minute sit-ups by age and sex from very poor to excellent.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), numberField("age", "Age", { default: 30, min: 18, max: 99 }), numberField("reps", "Sit-Ups in 1 Minute", { default: 35, max: 100 })],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", RATING7, true), num("repsForNextRating", "Reps for Next Rating"), num("repsForExcellent", "Reps for Excellent")],
    instructions: "Lie on your back with knees bent and feet held down. Count full sit-ups in 60 seconds.",
    examples: "Example: a 30-year-old man doing 35 sit-ups in a minute rates above average (5 of 7); 40 is good and 45+ excellent.",
    assumptions: "Widely used 1-minute sit-up norms for ages 18–65+ (e.g. topendsports). Sit-up techniques differ between tests, so compare only like with like. " + DISCLAIMER,
    faq: [
      { question: "Are sit-ups bad for your back?", answer: "Lots of repeated sit-ups can bother some backs. Planks and dead bugs train the core with less spinal flexion." },
      { question: "What's a good 1-minute sit-up score?", answer: "For men 18–25, 44–49 is good and 50+ excellent; for women 18–25, 37–42 is good and 44+ excellent." },
    ],
  },
  {
    slug: "plank-test-calculator",
    title: "Plank Test Calculator",
    description: "Rate your plank hold time from poor to excellent and see how many more seconds you need for the next level.",
    metaTitle: "Plank Test Calculator — Plank Time Rating",
    metaDescription: "Free plank test calculator. Rate your forearm plank hold from poor to excellent and see the time to the next level.",
    calcInputs: [numberField("minutes", "Hold Time — Minutes", { default: 1, max: 30 }), numberField("seconds", "Hold Time — Seconds", { default: 30, max: 59 })],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", "Rating (5 Excellent, 4 Good, 3 Average, 2 Fair, 1 Poor)", true), num("holdSeconds", "Hold Time (Seconds)"), num("secondsToNextRating", "Seconds to Next Rating")],
    instructions: "Hold a forearm plank — elbows under shoulders, body in a straight line — until your hips sag or rise. Enter the time.",
    examples: "Example: a 1:30 plank rates good; holding 30 seconds longer (2:00) reaches excellent.",
    assumptions: "General adult guide: under 30 s poor, 30–59 s fair, 60–89 s average, 90–119 s good, 120 s+ excellent. Military tests (Army, Navy, Marines, Air Force) have their own plank scales — see those calculators. " + DISCLAIMER,
    faq: [
      { question: "How long should I be able to hold a plank?", answer: "One minute is a solid baseline for most adults; two minutes or more is excellent." },
      { question: "Is a longer plank always better?", answer: "Beyond about 2 minutes, harder variations (longer levers, added weight) build more strength than simply holding longer." },
    ],
  },
  {
    slug: "sit-and-reach-calculator",
    title: "Sit and Reach Calculator",
    description: "Rate your sit and reach flexibility test against age and sex norms, for a standard box (feet at 26 cm or 23 cm) or a reach measured from the toes.",
    metaTitle: "Sit and Reach Calculator — Flexibility Norms",
    metaDescription: "Free sit and reach test calculator. Rate hamstring and lower-back flexibility by age and sex for common box types.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("age", "Age", { default: 30, min: 15, max: 69 }),
      dropdown("unit", "Unit", [["cm", 1], ["inches", 2]], 1),
      dropdown("boxType", "How You Measured", [["Box, feet at 26 cm (CSEP)", 1], ["Box, feet at 23 cm", 2], ["From the toes (0 = touching toes)", 3]], 1),
      numberField("reach", "Best Reach", { default: 30, min: -30, max: 80, step: 0.5 }),
    ],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", RATING5, true), num("csepScoreCm", "Score on the CSEP Box (cm)"), num("cmForNextRating", "cm for Next Rating"), num("reachPastToesCm", "Reach Past Toes (cm)")],
    instructions: "Sit with legs straight and feet against the box. Reach forward slowly with both hands and hold for 2 seconds. Take the best of two tries. If you measure from your toes, enter negative numbers for short of the toes.",
    examples: "Example: a 30-year-old man reaching 30 cm on a standard box rates good (28–32 cm); 33 cm reaches very good.",
    assumptions: "CSEP norms (box with feet at the 26 cm mark). Other measurements are converted to that scale. " + DISCLAIMER,
    faq: [
      { question: "What does the sit and reach test measure?", answer: "Mainly hamstring and lower-back flexibility." },
      { question: "How can I improve my score?", answer: "Regular hamstring and hip stretching for a few weeks usually adds several centimetres." },
    ],
  },
  {
    slug: "grip-strength-calculator",
    title: "Grip Strength Calculator",
    description: "Rate your hand grip strength (dynamometer) against age and sex norms, with your combined score and the strength difference between hands.",
    metaTitle: "Grip Strength Calculator — Dynamometer Norms",
    metaDescription: "Free grip strength calculator. Rate combined left + right hand dynamometer scores by age and sex and check hand asymmetry.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      numberField("age", "Age", { default: 30, min: 15, max: 69 }),
      dropdown("unit", "Unit", [["kg", 1], ["lb", 2]], 1),
      numberField("rightHand", "Best Right-Hand Score", { default: 55, max: 200, step: 0.5 }),
      numberField("leftHand", "Best Left-Hand Score", { default: 50, max: 200, step: 0.5 }),
    ],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", RATING5, true), num("combinedKg", "Combined Grip (kg)"), pct("asymmetryPercent", "Difference Between Hands"), num("kgForNextRating", "kg for Next Rating")],
    instructions: "Squeeze a hand dynamometer as hard as you can, twice with each hand, arm by your side. Enter the best score for each hand.",
    examples: "Example: a 30-year-old man scoring 55 kg (right) and 50 kg (left) has a combined 105 kg — good; 113 kg is very good. His hands differ by 9%.",
    assumptions: "CSEP combined-hand norms for ages 15–69. A difference over about 10–15% between hands is worth noting, especially after an injury. " + DISCLAIMER,
    faq: [
      { question: "Why does grip strength matter?", answer: "It's a quick marker of overall strength and, in older adults, is linked to health and longevity." },
      { question: "How do I improve grip strength?", answer: "Heavy deadlifts and rows, farmer's carries, dead hangs and dedicated grippers all help." },
    ],
  },
  {
    slug: "broad-jump-test-calculator",
    title: "Broad Jump Test Calculator",
    description: "Rate your standing broad jump (standing long jump) for leg power on a 7-level scale, in cm, metres and feet.",
    metaTitle: "Broad Jump Test Calculator — Standing Long Jump",
    metaDescription: "Free standing broad jump calculator. Rate your jump distance from very poor to excellent and convert to metres and feet.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unit", "Unit", [["cm", 1], ["inches", 2]], 1),
      numberField("distance", "Jump Distance", { default: 230, max: 400, step: 0.5 }),
      numberField("height", "Your Height (Optional)", { default: 0, max: 250, step: 0.5, required: false }),
    ],
    calcResult: { label: "Rating", format: "number" },
    calcResults: [num("rating", RATING7, true), num("distanceMeters", "Distance (m)"), num("distanceFeet", "Distance (ft)"), num("cmForNextRating", "cm for Next Rating"), num("jumpToHeightRatio", "Jump ÷ Height")],
    instructions: "Stand behind a line, swing your arms and jump forward with both feet, landing on both feet. Measure from the line to the back of the nearest heel. Take the best of three.",
    examples: "Example: a 230 cm (7.55 ft) jump for a man rates average (221–230 cm); 1 cm more reaches above average.",
    assumptions: "Adult norms — men: 250+ excellent, 241–250 very good, 231–240 above average, 221–230 average, 211–220 below average, 191–210 poor; women: 200+, 191–200, 181–190, 171–180, 161–170, 141–160. " + DISCLAIMER,
    faq: [
      { question: "What is a good broad jump?", answer: "Around 2.4 m (8 ft) for men and 1.9 m (6.3 ft) for women is very good; NFL prospects often jump 3 m+." },
      { question: "What does the broad jump test measure?", answer: "Explosive horizontal leg power, important for sprinting and jumping sports." },
    ],
  },
  {
    slug: "vertical-jump-calculator",
    title: "Vertical Jump / Dunk Calculator",
    description: "Work out your vertical jump, max touch height and whether you can dunk — how far above or below the rim you reach and the vertical you need — plus jump power and rating.",
    metaTitle: "Vertical Jump Calculator — Can I Dunk?",
    metaDescription: "Free vertical jump and dunk calculator. See your touch height, rim clearance, vertical needed to dunk, jump power and rating.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 1),
      dropdown("unit", "Unit", [["cm / kg", 1], ["inches / lb", 2]], 1),
      numberField("standingReach", "Standing Reach (Flat-Footed)", { default: 230, max: 350, step: 0.5 }),
      numberField("verticalJump", "Vertical Jump", { default: 70, max: 150, step: 0.5 }),
      numberField("jumpTouch", "Or Highest Touch When Jumping (0 = Use Vertical)", { default: 0, max: 450, step: 0.5, required: false }),
      numberField("bodyweight", "Bodyweight (for Power)", { default: 80, max: 400, step: 0.1, required: false }),
    ],
    calcResult: { label: "Max Touch Height", format: "number" },
    calcResults: [
      num("maxTouchHeight", "Max Touch Height", true),
      num("verticalJump", "Vertical Jump"),
      num("aboveRim", "Above (+) or Below (−) the Rim"),
      num("verticalNeededToDunk", "Vertical Needed to Dunk"),
      num("canDunk", "Can Dunk (1 = Yes)"),
      num("rating", RATING7),
      num("peakPowerWatts", "Peak Power (W, Sayers)"),
    ],
    instructions: "Measure standing reach: stand side-on to a wall and reach as high as you can, flat-footed. Then enter your vertical jump, or the highest point you touch when jumping.",
    examples: "Example: a 230 cm standing reach and a 70 cm vertical give a 300 cm touch — 4.8 cm below the 3.05 m rim. Dunking needs about 90 cm of vertical. A 70 cm vertical rates excellent, about 5,800 W of peak power at 80 kg.",
    assumptions: "Rim height 3.05 m (10 ft). Dunking needs the hand about 15 cm (6 in) above the rim. Ratings (men): 70+ cm excellent … under 21 cm very poor; women about 10 cm lower. Power by the Sayers squat-jump equation. Results use the unit you choose. " + DISCLAIMER,
    faq: [
      { question: "How high do I need to jump to dunk?", answer: "Your standing reach plus your vertical must reach about 3.2 m (10 ft 6 in). Someone with an 8 ft (244 cm) reach needs about a 30 in (76 cm) vertical." },
      { question: "What is a good vertical jump?", answer: "About 50–60 cm (20–24 in) is above average for men; elite basketball players often jump 75–90 cm (30–35 in)." },
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
