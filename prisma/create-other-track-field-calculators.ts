// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the other-sports sub-batch "Track & Field". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-track-field.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-track-field-calculators.ts
// or
//   npm run db:create-other-track-field-calculators

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


const SPEED_UNIT = () => dropdown("speedUnit", "Speed Unit", [["m/s", 1], ["mph", 2]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "400m-pace-calculator",
    title: "400m Pace Calculator",
    description: "Calculate 400 m lap times, 200 m and 100 m splits for a goal time in any track race — 400 m, 800 m, 1500 m, mile, 3000 m, 5000 m or 10,000 m (also an 800m pace calculator).",
    metaTitle: "400m Pace Calculator — Lap Splits for Any Track Race",
    metaDescription: "Free 400m pace calculator. Get lap, 200 m and 100 m splits for your goal 400, 800, 1500, mile, 5K or 10K time.",
    calcInputs: [dropdown("race", "Race", [["400 m", 1], ["800 m", 2], ["1500 m", 3], ["Mile", 4], ["3000 m", 5], ["5000 m", 6], ["10,000 m", 7]], 2), numberField("minutes", "Goal Time — Minutes", { default: 2, max: 120 }), numberField("seconds", "Goal Time — Seconds", { default: 0, max: 59.99, step: 0.01 })],
    calcResult: { label: "400 m Lap", format: "number" },
    calcResults: [num("lap400Sec", "Per 400 m Lap (s)", true), num("split200Sec", "Per 200 m (s)"), num("split100Sec", "Per 100 m (s)"), num("pacePerKmMin", "Pace per km (min)"), num("pacePerMileMin", "Pace per Mile (min)"), num("laps", "Laps of the Track")],
    instructions: "Choose the race and enter your goal time.",
    examples: "Example: a 2:00 800 m = 60-second laps (30 s per 200). A 20:00 5,000 m = 96-second laps.",
    assumptions: "Even pace: lap time = goal time ÷ distance × 400. Most 800 m runners go out 1–3 s faster on lap one; the 1500 m and mile start from a different line. Decimal minutes (4.02 = 4 min 1 s). " + DISCLAIMER,
    faq: [
      { question: "What is a good 400 m lap time for a 5K?", answer: "For a 20-minute 5K, 96 seconds per lap." },
      { question: "Should I run even laps in the 800?", answer: "Elite 800s are usually 1–2 s faster on the first lap." },
    ],
  },
  {
    slug: "100m-time-calculator",
    title: "100m Time Calculator",
    description: "Estimate your 100 m sprint time from a 40-yard dash, a 60 m time, a hand-timed 100 m or a 100-yard time.",
    metaTitle: "100m Time Calculator — From 40 Yard, 60m or Hand Time",
    metaDescription: "Free 100m time calculator. Predict 100 m FAT time from 40-yard or 60 m times, hand timing or 100 yards, with average speed.",
    calcInputs: [dropdown("method", "I Have a", [["40-yard dash", 1], ["60 m time", 2], ["Hand-timed 100 m", 3], ["100-yard time", 4]], 1), numberField("time", "Time (s)", { default: 4.8, min: 2, max: 30, step: 0.01 })],
    calcResult: { label: "100 m Time", format: "number" },
    calcResults: [num("time100m", "Estimated 100 m (FAT, s)", true), num("averageSpeedMs", "Average Speed (m/s)"), num("averageSpeedMph", "Average Speed (mph)"), num("estimatedTopSpeedMph", "Estimated Top Speed (mph)")],
    instructions: "Pick what you have and enter the time.",
    examples: "Example: a 4.80 forty predicts about 11.54 s for 100 m. A hand-timed 11.0 is about 11.24 fully automatic.",
    assumptions: "100 m ≈ 2.3 × 40-yd time + 0.5; ≈ 1.6 × 60 m time − 0.2; hand times + 0.24 s; 100 yd × 1.0936 (distance ratio). Rough predictions — top speed endurance varies a lot between athletes. " + DISCLAIMER,
    faq: [
      { question: "What is a good 100 m time?", answer: "Under 12 s is quick for adult men, under 13.5 s for women; elites run under 10 and 11." },
      { question: "Why add 0.24 s to hand times?", answer: "Timers react late to the gun, so hand times read fast." },
    ],
  },
  {
    slug: "wind-calculator-100m",
    title: "Wind Calculator 100m",
    description: "Adjust a 100 m (or 100/110 m hurdles) time for tailwind or headwind and altitude — and check whether the wind was legal.",
    metaTitle: "Wind Calculator 100m — Wind-Adjusted Sprint Time",
    metaDescription: "Free 100m wind calculator. Convert a sprint time to its zero-wind, sea-level equivalent and check the +2.0 m/s legal limit.",
    calcInputs: [numberField("time", "100 m Time (s)", { default: 10.5, min: 8, max: 20, step: 0.01 }), numberField("wind", "Wind (m/s, + tail / − head)", { default: 2, min: -10, max: 10, step: 0.1 }), numberField("altitude", "Altitude (m)", { default: 0, max: 4000 })],
    calcResult: { label: "Zero-Wind Time", format: "number" },
    calcResults: [num("zeroWindTime", "Zero-Wind, Sea-Level Time (s)", true), num("windEffectSec", "Wind + Altitude Effect (s)"), num("windOnlyAdjusted", "Wind-Only Adjusted Time (s)"), num("windLegal", "Wind Legal for Records (1 = yes)")],
    instructions: "Enter the time, the official wind reading and the stadium altitude.",
    examples: "Example: 10.00 s with a +2.0 m/s tailwind at sea level ≈ 10.11 s in still air. At 1,500 m altitude it adjusts to about 10.14.",
    assumptions: "Mureika (2001): t₀ = t × [1.03 − 0.03 × e^(−0.000125 × altitude) × (1 − wind × t ÷ 100)²]. A +2.0 m/s tailwind is worth about 0.1 s; records need wind ≤ +2.0 m/s. Works for 100 m and sprint hurdles; the 200 m is affected about half as much. " + DISCLAIMER,
    faq: [
      { question: "What is a legal wind in track?", answer: "Up to +2.0 m/s for records and qualifying marks in the 100 m, 200 m, hurdles, long and triple jump." },
      { question: "Does altitude help sprinters?", answer: "Yes — thinner air reduces drag, worth a few hundredths at 1,000–2,000 m." },
    ],
  },
  {
    slug: "relay-calculator",
    title: "Relay Calculator",
    description: "Estimate a 4×100 m or 4×400 m relay time from each runner's open time, including the flying-start gain.",
    metaTitle: "Relay Calculator — 4x100 & 4x400 Relay Time",
    metaDescription: "Free relay calculator. Estimate 4×100 or 4×400 relay time from open times plus flying-start gains on legs 2–4.",
    calcInputs: [dropdown("relay", "Relay", [["4 × 100 m", 1], ["4 × 400 m", 2]], 1), numberField("leg1", "Leg 1 Open Time (s)", { default: 11, max: 200, step: 0.01 }), numberField("leg2", "Leg 2 Open Time (s)", { default: 11.2, max: 200, step: 0.01 }), numberField("leg3", "Leg 3 Open Time (s)", { default: 11.1, max: 200, step: 0.01 }), numberField("leg4", "Leg 4 Open Time (s)", { default: 10.9, max: 200, step: 0.01 }), numberField("flyingStartGain", "Flying-Start Gain per Leg (s)", { default: 0.8, max: 3, step: 0.05 })],
    calcResult: { label: "Relay Time", format: "number" },
    calcResults: [num("estimatedRelayTime", "Estimated Relay Time (s)", true), num("sumOfOpenTimes", "Sum of Open Times (s)"), num("averageLeg", "Average Leg (s)"), num("timeSaved", "Time Saved by Flying Starts (s)")],
    instructions: "Enter each runner's individual (open) time and the time a flying start saves per leg — about 0.7–0.9 s in the 4×100, 0.3–0.5 s in the 4×400.",
    examples: "Example: open 100s of 11.0, 11.2, 11.1 and 10.9 (44.2 total) with 0.8 s gained on each of legs 2–4 → about 41.8 s.",
    assumptions: "Relay ≈ sum of open times − flying-start gain on legs 2–4. Good baton passing (in the 30 m zone) makes the 4×100 much faster than the sum of the parts; dropped or slowed exchanges cost tenths. " + DISCLAIMER,
    faq: [
      { question: "Who should run the anchor leg?", answer: "Usually the fastest runner or best competitor; leg 1 needs a good starter and bend runner." },
      { question: "How big is the exchange zone?", answer: "30 m in the 4×100 (since 2018)." },
    ],
  },
  {
    slug: "heptathlon-calculator",
    title: "Heptathlon Calculator",
    description: "Calculate women's heptathlon points with the World Athletics scoring tables — each event, each day and the total.",
    metaTitle: "Heptathlon Calculator — Points per Event & Total",
    metaDescription: "Free heptathlon calculator. Score 100 m hurdles, high jump, shot put, 200 m, long jump, javelin and 800 m with official formulas.",
    calcInputs: [numberField("hurdles100", "100 m Hurdles (s)", { default: 13.8, max: 30, step: 0.01 }), numberField("highJump", "High Jump (m)", { default: 1.75, max: 2.5, step: 0.01 }), numberField("shotPut", "Shot Put (m)", { default: 13.5, max: 25, step: 0.01 }), numberField("run200", "200 m (s)", { default: 24.5, max: 45, step: 0.01 }), numberField("longJump", "Long Jump (m)", { default: 6.2, max: 8, step: 0.01 }), numberField("javelin", "Javelin (m)", { default: 45, max: 80, step: 0.01 }), numberField("run800Min", "800 m — Minutes", { default: 2, max: 6 }), numberField("run800Sec", "800 m — Seconds", { default: 15, max: 59.99, step: 0.01 })],
    calcResult: { label: "Total Points", format: "number" },
    calcResults: [num("totalPoints", "Total Points", true), num("day1Points", "Day 1 Points"), num("day2Points", "Day 2 Points"), num("hurdles100", "100 m Hurdles"), num("highJump", "High Jump"), num("shotPut", "Shot Put"), num("run200", "200 m"), num("longJump", "Long Jump"), num("javelin", "Javelin"), num("run800", "800 m")],
    instructions: "Enter results in seconds and metres (leave an event at 0 to score it as 0).",
    examples: "Example: Jackie Joyner-Kersee's world record (12.69, 1.86, 15.80, 22.56, 7.27, 45.66, 2:08.51) scores exactly 7,291. The default line (13.8, 1.75, 13.50, 24.5, 6.20, 45, 2:15) scores 6,185.",
    assumptions: "World Athletics combined-events tables: track points = A × (B − T)^C, field points = A × (M − B)^C (jumps in cm, throws in m), rounded down. Hand times should have 0.24 s added (the tables are for FAT). " + DISCLAIMER,
    faq: [
      { question: "What is a good heptathlon score?", answer: "5,000+ is strong at college level; 6,500+ is world-class." },
      { question: "Which events are on each day?", answer: "Day 1: 100 m hurdles, high jump, shot put, 200 m. Day 2: long jump, javelin, 800 m." },
    ],
  },
  {
    slug: "dec-calculator",
    title: "Decathlon (DEC) Calculator",
    description: "Calculate men's decathlon points (DEC) with the World Athletics scoring tables — all ten events, each day and the total.",
    metaTitle: "Decathlon Calculator — DEC Points",
    metaDescription: "Free decathlon (DEC) calculator. Score all 10 events with official World Athletics formulas and see day 1, day 2 and total points.",
    calcInputs: [numberField("run100", "100 m (s)", { default: 11, max: 20, step: 0.01 }), numberField("longJump", "Long Jump (m)", { default: 7, max: 9.5, step: 0.01 }), numberField("shotPut", "Shot Put (m)", { default: 14, max: 25, step: 0.01 }), numberField("highJump", "High Jump (m)", { default: 1.95, max: 2.5, step: 0.01 }), numberField("run400", "400 m (s)", { default: 50, max: 90, step: 0.01 }), numberField("hurdles110", "110 m Hurdles (s)", { default: 15, max: 30, step: 0.01 }), numberField("discus", "Discus (m)", { default: 42, max: 80, step: 0.01 }), numberField("poleVault", "Pole Vault (m)", { default: 4.6, max: 6.5, step: 0.01 }), numberField("javelin", "Javelin (m)", { default: 58, max: 100, step: 0.01 }), numberField("run1500Min", "1500 m — Minutes", { default: 4, max: 10 }), numberField("run1500Sec", "1500 m — Seconds", { default: 40, max: 59.99, step: 0.01 })],
    calcResult: { label: "Total Points", format: "number" },
    calcResults: [num("totalPoints", "Total Points", true), num("day1Points", "Day 1 Points"), num("day2Points", "Day 2 Points"), num("run100", "100 m"), num("longJump", "Long Jump"), num("shotPut", "Shot Put"), num("highJump", "High Jump"), num("run400", "400 m"), num("hurdles110", "110 m Hurdles"), num("discus", "Discus"), num("poleVault", "Pole Vault"), num("javelin", "Javelin"), num("run1500", "1500 m")],
    instructions: "Enter each result in seconds or metres.",
    examples: "Example: 11.00, 7.00, 14.00, 1.95, 50.00, 15.00, 42.00, 4.60, 58.00, 4:40 → 7,709 points (3,976 on day 1).",
    assumptions: "World Athletics men's decathlon tables: track = A × (B − T)^C, field = A × (M − B)^C (jumps in cm, throws in m), rounded down to whole points. Electronic timing assumed. " + DISCLAIMER,
    faq: [
      { question: "What is the decathlon world record?", answer: "9,126 points by Kevin Mayer (2018)." },
      { question: "What is a good decathlon score?", answer: "7,000+ is a good college score; 8,000+ is international class." },
    ],
  },
  {
    slug: "long-jump-calculator",
    title: "Long Jump Calculator",
    description: "Estimate long jump distance from run-up speed — or from take-off speed and angle — using projectile physics.",
    metaTitle: "Long Jump Calculator — Distance from Speed",
    metaDescription: "Free long jump calculator. Estimate jump distance in metres and feet from approach speed or take-off speed and angle.",
    calcInputs: [dropdown("method", "I Know My", [["Approach (run-up) speed", 1], ["Take-off speed", 2]], 1), numberField("approachSpeed", "Approach Speed", { default: 9, min: 1, max: 25, step: 0.1 }), numberField("takeoffSpeed", "Take-off Speed", { default: 9, min: 1, max: 25, step: 0.1 }), SPEED_UNIT(), numberField("takeoffAngle", "Take-off Angle (°)", { default: 20, min: 5, max: 45 })],
    calcResult: { label: "Jump Distance", format: "number" },
    calcResults: [num("jumpMetres", "Jump Distance (m)", true), num("jumpFeet", "Jump Distance (ft)"), num("flightTimeSec", "Flight Time (s)"), num("takeoffSpeedMs", "Take-off Speed (m/s)")],
    instructions: "Enter your approach speed (elite men reach about 10.5–11 m/s, school athletes 7–9 m/s) or take-off speed, and a take-off angle (about 18–24°).",
    examples: "Example: a 9 m/s approach with a 20° take-off → about 6.31 m (20'8\"). At 10.5 m/s it's about 8.12 m.",
    assumptions: "Take-off speed ≈ 96% of approach speed; flight from projectile motion with the centre of mass landing 0.45 m lower than at take-off, plus about 0.4 m for take-off and landing positions. Technique changes these a lot. " + DISCLAIMER,
    faq: [
      { question: "Why isn't 45° the best long jump angle?", answer: "Jumpers can't keep their speed while pushing up steeply — about 20° is optimal in practice." },
      { question: "How important is speed in the long jump?", answer: "Very — distance rises roughly with the square of take-off speed." },
    ],
  },
  {
    slug: "throw-distance-calculator",
    title: "Throw Distance Calculator",
    description: "Calculate how far a ball, shot, javelin or any object travels from release speed, angle and height — and the best angle.",
    metaTitle: "Throw Distance Calculator — Projectile Range",
    metaDescription: "Free throw distance calculator. Get throw distance, flight time and optimal angle from release speed, angle and height.",
    calcInputs: [numberField("speed", "Release Speed", { default: 25, min: 1, max: 200, step: 0.1 }), dropdown("speedUnit", "Speed Unit", [["m/s", 1], ["mph", 2], ["km/h", 3]], 1), numberField("angle", "Release Angle (°)", { default: 40, min: 0, max: 89 }), numberField("releaseHeight", "Release Height (m)", { default: 2, max: 10, step: 0.05 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMetres", "Throw Distance (m)", true), num("distanceFeet", "Throw Distance (ft)"), num("flightTimeSec", "Flight Time (s)"), num("optimalAngle", "Optimal Angle for This Speed & Height (°)"), num("maxDistanceMetres", "Max Distance at Optimal Angle (m)")],
    instructions: "Enter the release speed, angle above horizontal and release height.",
    examples: "Example: 25 m/s at 40° from 2 m → about 65 m with a 3.4 s flight; the best angle would be about 44° for 65.7 m.",
    assumptions: "Vacuum projectile motion (no air resistance or lift): distance = v cosθ × (v sinθ + √((v sinθ)² + 2gh)) ÷ g. Real throws differ — javelins and discs fly on aerodynamics, balls lose speed to drag. Optimal angle = arcsin(1 ÷ √(2 + 2gh ÷ v²)). " + DISCLAIMER,
    faq: [
      { question: "Why is the best angle below 45°?", answer: "Releasing above the landing height means a slightly flatter throw goes further." },
      { question: "How fast do elite shot putters release?", answer: "About 13–14 m/s at roughly 37° from 2.2 m." },
    ],
  },
  {
    slug: "pole-calculator",
    title: "Pole Vault Pole Calculator",
    description: "Find the pole vault pole length and weight rating for your body weight and grip height — and an estimated clearance.",
    metaTitle: "Pole Vault Pole Calculator — Pole Length & Weight",
    metaDescription: "Free pole vault pole calculator. Get pole length and weight rating from body weight and grip height, plus estimated bar height.",
    calcInputs: [numberField("bodyWeight", "Body Weight", { default: 160, min: 50, max: 300 }), dropdown("weightUnit", "Unit", [["lb", 1], ["kg", 2]], 1), numberField("gripFeet", "Top-Hand Grip Height — Feet", { default: 12, min: 6, max: 18 }), numberField("gripInches", "Grip Height — Inches", { default: 0, max: 11.5, step: 0.5 }), dropdown("level", "Level", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3]], 2)],
    calcResult: { label: "Pole Length", format: "number" },
    calcResults: [num("poleLengthFeet", "Pole Length (ft)", true), num("poleWeightRatingLb", "Pole Weight Rating (lb)"), num("estimatedClearanceFeet", "Estimated Bar Clearance (ft)"), num("estimatedClearanceMetres", "Estimated Bar Clearance (m)")],
    instructions: "Measure your top-hand grip from the bottom of the pole and enter your body weight and level.",
    examples: "Example: a 160 lb intermediate gripping at 12 ft → a 12'6\" pole rated about 165 lb, clearing roughly 13'9\".",
    assumptions: "Pole length ≈ grip height + 6\", rounded up to 6\" steps; weight rating ≈ body weight (+5 lb intermediate, +10 lb advanced), never below body weight for safety. Clearance ≈ grip + 1–2.5 ft depending on technique. Only use poles rated for your weight and work with a qualified coach. " + DISCLAIMER,
    faq: [
      { question: "Can I use a pole rated below my weight?", answer: "No — it can break. Most rules require a pole rated at or above your body weight." },
      { question: "When should I move to a longer pole?", answer: "When you can consistently hold higher with good speed and the current pole feels too soft." },
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
