// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the other-sports sub-batch "Bowling, Darts & Practical Shooting". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-target-games.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-target-games-calculators.ts
// or
//   npm run db:create-other-target-games-calculators

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

const EX_FRAMES: [number, number][] = [[10, 0], [7, 3], [9, 0], [10, 0], [0, 8], [8, 2], [0, 6], [10, 0], [10, 0], [10, 8]];
const FRAMES = () => [
  ...EX_FRAMES.flatMap(([a, b], i) => [
    numberField(`frame${i + 1}Ball1`, `Frame ${i + 1} — Ball 1 Pins`, { default: a, max: 10 }),
    numberField(`frame${i + 1}Ball2`, `Frame ${i + 1} — Ball 2 Pins${i < 9 ? " (0 after a strike)" : ""}`, { default: b, max: 10, required: false }),
  ]),
  numberField("frame10Ball3", "Frame 10 — Ball 3 Pins (after strike or spare)", { default: 1, max: 10, required: false }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "bowling-score-calculator",
    title: "Bowling Score Calculator",
    description: "Score a ten-pin bowling game frame by frame — strikes, spares and the tenth frame are scored for you.",
    metaTitle: "Bowling Score Calculator — Frame by Frame",
    metaDescription: "Free bowling score calculator. Enter pins per ball for each frame and get your total score, strikes, spares and open frames.",
    calcInputs: FRAMES(),
    calcResult: { label: "Total Score", format: "number" },
    calcResults: [num("totalScore", "Total Score", true), num("strikes", "Strikes"), num("spares", "Spares"), num("openFrames", "Open Frames")],
    instructions: "Enter the pins knocked down by each ball. A strike is 10 on ball 1 (leave ball 2 at 0). A spare is when the two balls add to 10. In the 10th frame you get a third ball after a strike or spare.",
    examples: "Example: X, 7/, 9-, X, -8, 8/, -6, X, X, X81 scores 167 — 5 strikes, 2 spares and 3 open frames. Twelve strikes in a row is a perfect 300.",
    assumptions: "Standard ten-pin scoring: a strike scores 10 + the next two balls, a spare 10 + the next ball, an open frame the pins knocked down. The 10th frame allows bonus balls only for a strike or spare. " + DISCLAIMER,
    faq: [
      { question: "How are strikes scored?", answer: "10 plus the pins from your next two balls — so three strikes in a row (a turkey) give 30 in the first frame." },
      { question: "What's the highest score?", answer: "300 — twelve strikes in a row." },
    ],
  },
  {
    slug: "bowling-handicap-calculator",
    title: "Bowling Handicap Calculator",
    description: "Calculate your bowling handicap from your average, the league basis and percentage — per game and per series.",
    metaTitle: "Bowling Handicap Calculator — League Handicap",
    metaDescription: "Free bowling handicap calculator. Get handicap pins per game and series from your average, basis score and percentage.",
    calcInputs: [numberField("average", "Your Average", { default: 160, max: 300 }), numberField("basis", "League Basis Score", { default: 220, max: 300 }), percentField("percentage", "Handicap Percentage", { default: 90 }), numberField("games", "Games per Series", { default: 3, min: 1, max: 10 }), numberField("gameScore", "A Game Score to Check (scratch)", { default: 170, max: 300, required: false })],
    calcResult: { label: "Handicap per Game", format: "number" },
    calcResults: [num("handicapPerGame", "Handicap per Game", true), num("seriesHandicap", "Series Handicap"), num("gameWithHandicap", "That Game with Handicap"), num("expectedHandicapSeries", "Expected Series with Handicap")],
    instructions: "Enter your current average and your league's basis and percentage (common: 90% of 220, 80% of 200 or 100% of 230).",
    examples: "Example: a 160 average in a 90%-of-220 league → (220 − 160) × 0.9 = 54 pins per game, 162 for a 3-game series. A 170 game becomes 224.",
    assumptions: "Handicap = (basis − average) × percentage, rounded down and never negative (some leagues cap it). Averages are usually truncated to whole pins. Check your league rules. " + DISCLAIMER,
    faq: [
      { question: "Why do bowling leagues use handicap?", answer: "So bowlers of different abilities can compete fairly." },
      { question: "What if my average is above the basis?", answer: "Your handicap is zero (leagues rarely use negative handicaps)." },
    ],
  },
  {
    slug: "bowling-prize-fund-calculator",
    title: "Bowling Prize Fund Calculator",
    description: "Calculate a bowling tournament's prize fund after lineage and expenses, the places paid and the payout from first to last.",
    metaTitle: "Bowling Prize Fund Calculator — Tournament Payout",
    metaDescription: "Free bowling prize fund calculator. Work out prize fund, places paid at your ratio and first- and last-place prizes.",
    calcInputs: [numberField("entries", "Entries", { default: 64, min: 1, max: 5000 }), currencyField("entryFee", "Entry Fee", { default: 60 }), currencyField("lineagePerGame", "Lineage per Game per Bowler", { default: 3, step: 0.25 }), numberField("games", "Games per Bowler", { default: 6, min: 1, max: 30 }), percentField("expensesPct", "Expenses (% of entries)", { default: 10 }), currencyField("addedMoney", "Added Money", { default: 0, required: false }), numberField("ratio", "Pay 1 in Every …", { default: 5, min: 1, max: 20 })],
    calcResult: { label: "Prize Fund", format: "currency" },
    calcResults: [cur("prizeFund", "Prize Fund", true), num("placesPaid", "Places Paid"), cur("firstPlace", "First Place"), cur("lastPlace", "Last Paid Place"), pct("returnPct", "Prize Fund as % of Entries")],
    instructions: "Enter entries, entry fee, lineage (lane fees), games, expenses, any added money and your payout ratio.",
    examples: "Example: 64 entries × $60 = $3,840 minus $1,152 lineage and 10% expenses = $2,304. Paying 1 in 5 (13 places) on a straight-line scale: first ≈ $329, 13th ≈ $25.",
    assumptions: "Prize fund = entries × fee − lineage − expenses + added money. Places = entries ÷ ratio, rounded up. Payouts fall in equal steps (N, N − 1 … 1 shares). Many tournaments set the last cash at least equal to the entry fee — adjust the ratio if it isn't. " + DISCLAIMER,
    faq: [
      { question: "What is lineage?", answer: "The fee paid to the bowling centre for each game bowled." },
      { question: "What is a typical payout ratio?", answer: "1 in 4 to 1 in 6 for most bowling tournaments." },
    ],
  },
  {
    slug: "bowling-ball-weight-calculator",
    title: "Bowling Ball Weight Calculator",
    description: "Find the right bowling ball weight for your body weight, age and strength.",
    metaTitle: "Bowling Ball Weight Calculator — What Weight Ball?",
    metaDescription: "Free bowling ball weight calculator. Get a recommended ball weight from body weight (the 10% rule), age and strength.",
    calcInputs: [numberField("bodyWeight", "Body Weight", { default: 160, min: 20, max: 500 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), numberField("age", "Age", { default: 30, min: 3, max: 100 }), dropdown("strength", "Strength / Wrist", [["Light / injury or arthritis", 1], ["Average", 2], ["Strong", 3]], 2)],
    calcResult: { label: "Ball Weight", format: "number" },
    calcResults: [num("recommendedLb", "Recommended Ball (lb)", true), num("rangeLowLb", "Range — From (lb)"), num("rangeHighLb", "Range — To (lb)"), num("recommendedKg", "Recommended Ball (kg)")],
    instructions: "Enter your body weight, age and how strong your arm and wrist feel.",
    examples: "Example: a 160 lb adult → 16 lb ball (10% of body weight, the maximum allowed). A 120 lb bowler would start around 12 lb.",
    assumptions: "Rule of thumb: about 10% of body weight, capped at 16 lb (the maximum under USBC rules) and at least 6 lb; young children roughly 1 lb per year of age. You should swing it comfortably for 3 games — many modern bowlers use 14–15 lb. " + DISCLAIMER,
    faq: [
      { question: "Does a heavier ball knock down more pins?", answer: "A little, but only if you can throw it with good speed and accuracy." },
      { question: "What ball weight do pros use?", answer: "Most use 15–16 lb." },
    ],
  },
  {
    slug: "bowling-ball-speed-calculator",
    title: "Bowling Ball Speed Calculator",
    description: "Calculate bowling ball speed (mph and km/h) from the time it takes to travel from the foul line to the head pin.",
    metaTitle: "Bowling Ball Speed Calculator — MPH",
    metaDescription: "Free bowling ball speed calculator. Time your ball from the foul line to the pins and get average speed in mph and km/h.",
    calcInputs: [numberField("seconds", "Time from Release to Pin Impact (s)", { default: 2.5, min: 0.5, max: 10, step: 0.01 })],
    calcResult: { label: "Speed", format: "number" },
    calcResults: [num("speedMph", "Average Speed (mph)", true), num("speedKmh", "Average Speed (km/h)"), num("feetPerSecond", "Feet per Second"), num("category", "Speed (1 Slow, 2 Moderate, 3 Typical, 4 Fast)")],
    instructions: "Have a friend start a stopwatch when the ball crosses the foul line and stop it when it hits the pins.",
    examples: "Example: 2.5 seconds over the 60 ft lane = 24 ft/s — about 16.4 mph average.",
    assumptions: "Speed = 60 ft ÷ time. This is the average down the lane; speed at release is roughly 10–15% higher and at the pins lower. Typical league bowlers average 15–18 mph; pros around 17–19 mph. " + DISCLAIMER,
    faq: [
      { question: "What is a good bowling ball speed?", answer: "About 16–18 mph average is ideal for most hook bowlers." },
      { question: "Why does speed matter?", answer: "Too slow and the ball hooks too early; too fast and it doesn't hook enough." },
    ],
  },
  {
    slug: "darts-score-calculator",
    title: "Darts Score Calculator",
    description: "Track a 501 (or 301) darts game — score left, three-dart average and turns to finish.",
    metaTitle: "Darts Score Calculator — 501 & 3-Dart Average",
    metaDescription: "Free darts score calculator. Get points remaining in 501 or 301, your 3-dart average and estimated turns to check out.",
    calcInputs: [numberField("startScore", "Starting Score", { default: 501, min: 101, max: 1001 }), numberField("pointsScored", "Points Scored So Far", { default: 300, max: 1001 }), numberField("dartsThrown", "Darts Thrown", { default: 15, min: 1, max: 500 })],
    calcResult: { label: "Remaining", format: "number" },
    calcResults: [num("remaining", "Score Remaining", true), num("threeDartAverage", "Three-Dart Average"), num("estimatedTurnsToFinish", "Turns to Finish at This Average"), num("checkoutPossible", "Checkout Possible in One Visit (1 = yes)")],
    instructions: "Enter the starting score, points scored and how many darts you've thrown (3 per turn).",
    examples: "Example: 300 scored with 15 darts in 501 → 201 left and a 60.0 three-dart average — about 4 more turns at that rate.",
    assumptions: "Three-dart average = points ÷ darts × 3. Checkouts of 2–170 are possible in one visit except 159, 162, 163, 165, 166, 168 and 169 (bogey numbers); double-out rules apply. " + DISCLAIMER,
    faq: [
      { question: "What is a good darts average?", answer: "40–50 is a solid pub player; pros average 90–100+." },
      { question: "What is the highest checkout?", answer: "170 — treble 20, treble 20, bullseye." },
    ],
  },
  {
    slug: "darts-checkout-calculator",
    title: "Darts Checkout Calculator",
    description: "Find the darts to check out any score from 2 to 170 with a double finish.",
    metaTitle: "Darts Checkout Calculator — Out Shots 2–170",
    metaDescription: "Free darts checkout calculator. Get a one-, two- or three-dart double-out finish for any score from 2 to 170.",
    calcInputs: [numberField("remaining", "Score Remaining", { default: 100, min: 2, max: 170 })],
    calcResult: { label: "Darts Needed", format: "number" },
    calcResults: [num("dartsNeeded", "Darts Needed (0 = no checkout)", true), num("dart1Number", "Dart 1 — Segment (25 outer bull, 50 bull)"), num("dart1Multiplier", "Dart 1 — 1 Single, 2 Double, 3 Treble"), num("dart2Number", "Dart 2 — Segment"), num("dart2Multiplier", "Dart 2 — Multiplier"), num("dart3Number", "Dart 3 — Segment"), num("dart3Multiplier", "Dart 3 — Multiplier")],
    instructions: "Enter the score you have left. Read each dart as segment and multiplier — e.g. 20 and 3 means treble 20; 50 means the bullseye (counts as a double).",
    examples: "Example: 100 → treble 20, double 20. 81 → treble 15, double 18. 170 → treble 20, treble 20, bull.",
    assumptions: "Searches for the fewest darts, finishing on a double (or the bull), preferring finishes on double 20, 16, 8 and other doubles that leave easy follow-ups. Pros sometimes choose different routes for their own reasons. 159, 162, 163, 165, 166, 168 and 169 have no 3-dart checkout. " + DISCLAIMER,
    faq: [
      { question: "Why finish on double 16?", answer: "If you hit single 16, you're left on double 8, then 4, 2 and 1 — lots of chances." },
      { question: "Does the bull count as a double?", answer: "Yes — the inner bull (50) is a valid double finish." },
    ],
  },
  {
    slug: "uspsa-hit-factor-calculator",
    title: "USPSA Hit Factor Calculator",
    description: "Calculate a USPSA (practical shooting) hit factor from hits, penalties and time — and your stage points vs the stage winner.",
    metaTitle: "USPSA Hit Factor Calculator — Stage Points",
    metaDescription: "Free USPSA hit factor calculator. Get points, hit factor and stage points for major or minor power factor.",
    calcInputs: [dropdown("powerFactor", "Power Factor", [["Minor", 1], ["Major", 2]], 1), numberField("alphas", "A Hits", { default: 14, max: 500 }), numberField("charlies", "C Hits", { default: 3, max: 500 }), numberField("deltas", "D Hits", { default: 1, max: 500 }), numberField("misses", "Misses", { default: 0, max: 100, required: false }), numberField("noShoots", "No-Shoots", { default: 0, max: 100, required: false }), numberField("procedurals", "Procedurals", { default: 0, max: 50, required: false }), numberField("time", "Stage Time (s)", { default: 12, min: 0.5, max: 600, step: 0.01 }), numberField("topHitFactor", "Stage Winner's Hit Factor (optional)", { default: 7.5, max: 50, step: 0.0001, required: false }), numberField("stageMax", "Stage Max Points", { default: 80, max: 1000 })],
    calcResult: { label: "Hit Factor", format: "number" },
    calcResults: [num("hitFactor", "Hit Factor", true, 4), num("points", "Points"), num("stagePoints", "Stage Points"), pct("pctOfWinner", "Percent of Stage Winner")],
    instructions: "Enter your scored hits, penalties and time. Add the winner's hit factor and stage max points to see your stage score.",
    examples: "Example (minor): 14 A, 3 C, 1 D = 70 + 9 + 1 = 80 points in 12.00 s → hit factor 6.6667. If the winner shot 7.5, you earn 71.1 of 80 stage points (88.9%).",
    assumptions: "Comstock scoring: A = 5; C = 3 minor / 4 major; D = 1 minor / 2 major; misses, no-shoots and procedurals −10 each. Hit factor = points ÷ time (points can't go below 0). Stage points = your HF ÷ top HF × stage max. " + DISCLAIMER,
    faq: [
      { question: "What is a good hit factor?", answer: "It depends on the stage — short close stages can exceed 10, long field courses may be 3–5." },
      { question: "What's the difference between major and minor?", answer: "Major is a more powerful load (power factor ≥ 165) and scores more for C and D hits." },
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
