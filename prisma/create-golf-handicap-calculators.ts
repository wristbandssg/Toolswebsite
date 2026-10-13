// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the golf sub-batch A (Handicaps). See
// src/lib/calc-engine-golf-handicap.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Golf
// Calculators), and src/lib/calc-engine-golf-handicap.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-golf-handicap-calculators.ts
// or
//   npm run db:create-golf-handicap-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Golf Calculators", slug: "golf-calculators" };

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
  "Estimates for planning and fun. Handicap figures follow the World Handicap System as published, but your club or committee has the final say; fitting numbers are starting points, so a professional fitting is best. Distances and calories are averages, not guarantees.";

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

const INDEX = (key = "handicapIndex", label = "Handicap Index", def = 15) => numberField(key, label, { default: def, min: -10, max: 54, step: 0.1 });
const TEES = () => [numberField("slopeRating", "Slope Rating", { default: 113, min: 55, max: 155 }), numberField("courseRating", "Course Rating", { default: 72, min: 25, max: 85, step: 0.1 }), numberField("par", "Par", { default: 72, min: 27, max: 80 })];
const CH = (i: number, def: number) => numberField(`player${i}Handicap`, `Player ${i} Course Handicap`, { default: def, min: -10, max: 60 });

const TOOLS: ToolDef[] = [
  {
    slug: "golf-handicap-calculator",
    title: "Golf Handicap Calculator",
    description: "Calculate your World Handicap System (WHS) Handicap Index from up to 20 scores or score differentials — using the official best-8-of-20 table.",
    metaTitle: "Golf Handicap Calculator — WHS Handicap Index",
    metaDescription: "Free golf handicap calculator. Work out your WHS Handicap Index from your last 20 scores or differentials, with the official adjustments.",
    calcInputs: [
      dropdown("entryMode", "What You're Entering", [["Adjusted gross scores (same tees)", 1], ["Score differentials", 2]], 1),
      numberField("courseRating", "Course Rating", { default: 72, min: 25, max: 85, step: 0.1 }),
      numberField("slopeRating", "Slope Rating", { default: 113, min: 55, max: 155 }),
      numberField("pcc", "Playing Conditions Calculation (PCC)", { default: 0, min: -1, max: 3, required: false }),
      ...Array.from({ length: 20 }, (_, i) => numberField(`round${i + 1}`, `Round ${i + 1}`, { default: i < 5 ? [88, 92, 85, 90, 95][i] : 0, min: -10, max: 200, step: 0.1, required: false })),
    ],
    calcResult: { label: "Handicap Index", format: "number" },
    calcResults: [num("handicapIndex", "Handicap Index", true, 1), num("roundsEntered", "Rounds Entered"), num("differentialsUsed", "Lowest Differentials Used"), num("lowestDifferential", "Lowest Differential"), num("averageOfUsed", "Average of Those Used")],
    instructions: "Choose whether you're entering adjusted gross scores (all from one set of tees, with its course and slope rating) or score differentials taken from your handicap record. Enter up to 20 rounds, most recent first; leave unused rounds at 0. You need at least 3 rounds.",
    examples: "Example: five scores of 88, 92, 85, 90 and 95 on a 72.0 / 113 course give differentials of 16, 20, 13, 18 and 23. With 5 rounds WHS uses the lowest 1, so the Handicap Index is 13.0.",
    assumptions: "Score differential = (113 ÷ Slope) × (Adjusted Gross Score − Course Rating − PCC), rounded to 0.1. Rounds counted (WHS Rule 5.2): 3 → lowest 1 −2.0; 4 → lowest 1 −1.0; 5 → lowest 1; 6 → average of lowest 2 −1.0; 7–8 → 2; 9–11 → 3; 12–14 → 4; 15–16 → 5; 17–18 → 6; 19 → 7; 20 → 8. Index capped at 54.0. Soft / hard caps and exceptional-score reductions aren't applied. " + DISCLAIMER,
    faq: [
      { question: "How many scores do I need for a handicap?", answer: "Under WHS you can get a Handicap Index from 54 holes — three 18-hole rounds or a mix of 9- and 18-hole scores." },
      { question: "What is a score differential?", answer: "It's how your score compares with the course rating, adjusted for slope so scores from hard and easy courses can be compared fairly." },
      { question: "Should I use my gross score?", answer: "Use your adjusted gross score — your score with each hole capped at net double bogey. The Adjusted Gross Score Calculator does that." },
    ],
  },
  {
    slug: "course-handicap-calculator",
    title: "Course Handicap Calculator",
    description: "Turn your Handicap Index into a Course Handicap for any set of tees — 18 or 9 holes — and see where your strokes fall.",
    metaTitle: "Course Handicap Calculator — WHS Formula",
    metaDescription: "Free course handicap calculator. Convert your Handicap Index to strokes for any tees using slope, course rating and par (18 or 9 holes).",
    calcInputs: [dropdown("holes", "Holes", [["18 holes", 18], ["9 holes", 9]], 18), INDEX(), ...TEES()],
    calcResult: { label: "Course Handicap", format: "number" },
    calcResults: [num("courseHandicap", "Course Handicap", true), num("unrounded", "Before Rounding"), num("netPar", "Net Par (Your Target Score)"), num("strokesOnEveryHole", "Strokes on Every Hole"), num("extraStrokeHoles", "Extra Stroke on Holes with Stroke Index 1 to …"), num("strokesGivenBack", "Strokes Given Back (Plus Handicap)")],
    instructions: "Enter your Handicap Index and the slope rating, course rating and par of the tees you're playing (they're on the scorecard). For 9 holes, use the 9-hole ratings and par.",
    examples: "Example: a 15.0 index on tees rated 71.4 / 128, par 72 → 15.0 × 128 ÷ 113 + (71.4 − 72) = 16.4 → Course Handicap 16. You get one stroke on stroke-index holes 1–16.",
    assumptions: "WHS: Course Handicap = Handicap Index × (Slope ÷ 113) + (Course Rating − Par), rounded to the nearest whole number (.5 rounds up). For 9 holes the index is halved and 9-hole ratings are used. A plus handicap gives strokes back, starting on stroke index 18. " + DISCLAIMER,
    faq: [
      { question: "What's the difference between a Handicap Index and a Course Handicap?", answer: "The index is portable; the Course Handicap is how many strokes you get on a particular set of tees." },
      { question: "Why is slope divided by 113?", answer: "113 is the slope of a course of standard difficulty — harder courses give you more strokes." },
    ],
  },
  {
    slug: "playing-handicap-calculator",
    title: "Playing Handicap Calculator",
    description: "Calculate your WHS Playing Handicap — your Course Handicap with the recommended allowance for stroke play, match play, Stableford or four-ball.",
    metaTitle: "Playing Handicap Calculator — WHS Allowances",
    metaDescription: "Free playing handicap calculator. Apply the WHS handicap allowance (95%, 100%, 85%, 90%) to your course handicap for any format.",
    calcInputs: [INDEX(), ...TEES(), dropdown("format", "Format", [["Individual stroke play (95%)", 1], ["Individual match play (100%)", 2], ["Stableford (95%)", 3], ["Par / bogey (95%)", 4], ["Four-ball stroke play (85%)", 5], ["Four-ball match play (90%)", 6], ["Custom allowance", 7]], 1), percentField("customAllowance", "Custom Allowance (if chosen)", { default: 100, max: 100 })],
    calcResult: { label: "Playing Handicap", format: "number" },
    calcResults: [num("playingHandicap", "Playing Handicap", true), num("courseHandicap", "Course Handicap (100%)"), pct("allowancePct", "Allowance Used"), num("strokesFromAllowance", "Strokes Removed by Allowance")],
    instructions: "Enter your Handicap Index and the tees, then pick the format you're playing. Team formats with one score per side (scramble, foursomes) have their own calculators.",
    examples: "Example: a 20.0 index on 72.0 / 125 tees, par 72, has a Course Handicap of 22.1 (22). For individual stroke play at 95% the Playing Handicap is 21.",
    assumptions: "Playing Handicap = Course Handicap × allowance, using the unrounded Course Handicap and rounding the result (WHS Rule 6.2 and Appendix C recommended allowances). Committees can set their own allowance. " + DISCLAIMER,
    faq: [
      { question: "Why is stroke play 95% and not 100%?", answer: "In bigger fields, higher handicaps win more often than their share; 95% evens out the chances." },
      { question: "Is Course Handicap the same as Playing Handicap?", answer: "Only at 100% allowance — for example in singles match play." },
    ],
  },
  {
    slug: "match-play-handicap-calculator",
    title: "Match Play Handicap Calculator",
    description: "Work out how many strokes the higher handicap gets in a singles match — off the low player, at 100% or your chosen allowance.",
    metaTitle: "Match Play Handicap Calculator — Strokes Received",
    metaDescription: "Free match play handicap calculator. See how many strokes the higher handicap receives in singles match play and on which holes.",
    calcInputs: [INDEX("playerAIndex", "Player A Handicap Index", 8), INDEX("playerBIndex", "Player B Handicap Index", 18), ...TEES(), percentField("allowance", "Handicap Allowance", { default: 100, max: 100 })],
    calcResult: { label: "Strokes Received", format: "number" },
    calcResults: [num("strokesReceived", "Strokes Received by Higher Handicap", true), num("receivingPlayer", "Receiving Player (1 = A, 2 = B, 0 = none)"), num("playerAPlayingHandicap", "Player A Playing Handicap"), num("playerBPlayingHandicap", "Player B Playing Handicap"), num("holesWithTwoStrokes", "Holes with Two Strokes")],
    instructions: "Enter both players' Handicap Indexes and the tees. The higher handicap receives the difference, taken on the holes with the lowest stroke index (1, 2, 3 …).",
    examples: "Example: indexes of 8.0 and 18.0 on 72.0 / 130 tees give Course Handicaps of 9 and 21 — Player B receives 12 strokes, on stroke-index holes 1–12.",
    assumptions: "Singles match play: each player's Course Handicap × allowance (WHS recommends 100%), rounded; the lower plays off scratch and the higher receives the difference (WHS Appendix C). Players on different tees should also adjust for the course-rating difference. " + DISCLAIMER,
    faq: [
      { question: "Where do I take my strokes?", answer: "On the holes ranked by stroke index on the scorecard — stroke index 1 first." },
      { question: "What if the difference is over 18?", answer: "The receiving player gets two strokes on the holes with the lowest stroke indexes." },
    ],
  },
  {
    slug: "best-ball-handicap-calculator",
    title: "Best Ball Handicap Calculator",
    description: "Calculate four-ball (best ball) playing handicaps for four players — 85% for stroke play or 90% for match play — with strokes off the low ball.",
    metaTitle: "Best Ball Handicap Calculator — Four-Ball Allowances",
    metaDescription: "Free best ball handicap calculator. Get four-ball stroke play (85%) and match play (90%) handicaps and strokes off the low ball.",
    calcInputs: [dropdown("format", "Format", [["Four-ball stroke play (85%)", 1], ["Four-ball match play (90%)", 2]], 2), INDEX("player1Index", "Player 1 Handicap Index", 6), INDEX("player2Index", "Player 2 Handicap Index", 14), INDEX("player3Index", "Player 3 Handicap Index", 10), INDEX("player4Index", "Player 4 Handicap Index", 22), ...TEES()],
    calcResult: { label: "Player 1 Handicap", format: "number" },
    calcResults: [pct("allowancePct", "Allowance"), num("player1Handicap", "Player 1 Playing Handicap", true), num("player2Handicap", "Player 2 Playing Handicap"), num("player3Handicap", "Player 3 Playing Handicap"), num("player4Handicap", "Player 4 Playing Handicap"), num("player1StrokesOffLow", "Player 1 Strokes off Low (Match Play)"), num("player2StrokesOffLow", "Player 2 Strokes off Low"), num("player3StrokesOffLow", "Player 3 Strokes off Low"), num("player4StrokesOffLow", "Player 4 Strokes off Low")],
    instructions: "Enter the four Handicap Indexes (players 1 & 2 are one side, 3 & 4 the other) and the tees. In match play, everyone plays off the lowest playing handicap in the group.",
    examples: "Example: indexes 6, 14, 10 and 22 on 72.0 / 113 tees at 90% give playing handicaps of 5, 13, 9 and 20 — strokes off the low ball of 0, 8, 4 and 15.",
    assumptions: "Four-ball allowances (WHS Appendix C): 85% of Course Handicap for stroke play, 90% for match play, each rounded. In match play the low player plays off zero and the others receive the difference. " + DISCLAIMER,
    faq: [
      { question: "Is best ball the same as four-ball?", answer: "Yes — two-person teams where each plays their own ball and the better score on each hole counts." },
      { question: "Why 85% in stroke play?", answer: "Partners covering each other's bad holes favour higher handicaps, so the allowance is reduced." },
    ],
  },
  {
    slug: "scramble-handicap-calculator",
    title: "Scramble Handicap Calculator",
    description: "Calculate a team handicap for a 2, 3 or 4-person scramble — USGA weighted percentages or a simple percentage of combined handicaps.",
    metaTitle: "Scramble Handicap Calculator — 2, 3 & 4-Person",
    metaDescription: "Free scramble handicap calculator. Get a team handicap with the USGA 25/20/15/10 method or a % of combined handicaps.",
    calcInputs: [dropdown("teamSize", "Team Size", [["2-person", 2], ["3-person", 3], ["4-person", 4]], 4), dropdown("method", "Method", [["USGA weighted (low to high)", 1], ["% of combined handicaps", 2]], 1), percentField("combinedPct", "Combined % (if chosen)", { default: 10, max: 50 }), CH(1, 4), CH(2, 12), CH(3, 18), CH(4, 26)],
    calcResult: { label: "Team Handicap", format: "number" },
    calcResults: [num("teamHandicap", "Team Handicap", true), num("unrounded", "Before Rounding"), num("combinedHandicaps", "Combined Course Handicaps"), num("lowestHandicap", "Lowest Course Handicap")],
    instructions: "Pick the team size and method, then enter each player's Course Handicap (players beyond the team size are ignored). The calculator sorts them from lowest to highest.",
    examples: "Example: a 4-person team with course handicaps 4, 12, 18 and 26 — USGA method: 25% × 4 + 20% × 12 + 15% × 18 + 10% × 26 = 8.7 → team handicap 9.",
    assumptions: "USGA recommended scramble allowances: 4-person 25% / 20% / 15% / 10%, 3-person 30% / 20% / 10%, 2-person 35% / 15% of Course Handicap, lowest to highest, then rounded. Many events use 10% (4-person) or 20% (2-person) of the combined total instead. " + DISCLAIMER,
    faq: [
      { question: "Why does the lowest handicap get the biggest percentage?", answer: "The best player's ball is used most often, so their handicap matters most." },
      { question: "Do I use Handicap Index or Course Handicap?", answer: "Course Handicap for the tees being played — use the Course Handicap Calculator first." },
    ],
  },
  {
    slug: "shamble-handicap-calculator",
    title: "Shamble Handicap Calculator",
    description: "Calculate each player's shamble handicap (best drive, then own ball) at 80%, 75% or 85% — plus the strokes on the balls that count.",
    metaTitle: "Shamble Handicap Calculator — Team Allowances",
    metaDescription: "Free shamble handicap calculator. Get each player's reduced handicap for a shamble and the strokes on the counted balls.",
    calcInputs: [dropdown("teamSize", "Team Size", [["2-person", 2], ["3-person", 3], ["4-person", 4]], 4), dropdown("allowance", "Allowance", [["80% (most common)", 1], ["75%", 2], ["85%", 3], ["Custom", 4]], 1), percentField("customAllowance", "Custom Allowance (if chosen)", { default: 80, max: 100 }), numberField("ballsCounted", "Balls Counted per Hole", { default: 2, min: 1, max: 4 }), CH(1, 6), CH(2, 12), CH(3, 18), CH(4, 24)],
    calcResult: { label: "Player 1 Handicap", format: "number" },
    calcResults: [pct("allowancePct", "Allowance"), num("player1Handicap", "Player 1 Shamble Handicap", true), num("player2Handicap", "Player 2 Shamble Handicap"), num("player3Handicap", "Player 3 Shamble Handicap"), num("player4Handicap", "Player 4 Shamble Handicap"), num("strokesOnCountedBalls", "Strokes of the Lowest Counted Players")],
    instructions: "Enter each player's Course Handicap, the team size, the allowance your event uses and how many balls count on each hole.",
    examples: "Example: course handicaps 6, 12, 18 and 24 at 80% give shamble handicaps of 5, 10, 14 and 19. With 2 balls counting, the two lowest carry 15 strokes between them.",
    assumptions: "A shamble has no official WHS allowance; 80% of Course Handicap is the most common choice, with 75–85% also used (rounded per player). Strokes are taken by stroke index as normal. " + DISCLAIMER,
    faq: [
      { question: "How is a shamble different from a scramble?", answer: "In a shamble the team picks the best drive, then everyone plays their own ball into the hole — so each player keeps an individual handicap." },
      { question: "Why reduce handicaps at all?", answer: "Every player gets the best drive, which helps higher handicaps most." },
    ],
  },
  {
    slug: "alternate-shot-greensomes-handicap-calculator",
    title: "Alternate Shot & Greensomes Handicap Calculator",
    description: "Calculate team handicaps for foursomes (alternate shot), greensomes and Chapman / Pinehurst — and the strokes in a foursomes match.",
    metaTitle: "Alternate Shot & Greensomes Handicap Calculator",
    metaDescription: "Free foursomes and greensomes handicap calculator. Get alternate shot (50%), greensomes and Chapman (60/40) team handicaps.",
    calcInputs: [dropdown("format", "Format", [["Foursomes / alternate shot (50% combined)", 1], ["Greensomes (60% low + 40% high)", 2], ["Chapman / Pinehurst (60% low + 40% high)", 3]], 1), numberField("player1Handicap", "Your Player 1 Course Handicap", { default: 10, min: -10, max: 60 }), numberField("player2Handicap", "Your Player 2 Course Handicap", { default: 20, min: -10, max: 60 }), numberField("opponent1Handicap", "Opponent 1 Course Handicap (match play, optional)", { default: 0, min: -10, max: 60, required: false }), numberField("opponent2Handicap", "Opponent 2 Course Handicap (optional)", { default: 0, min: -10, max: 60, required: false })],
    calcResult: { label: "Team Handicap", format: "number" },
    calcResults: [num("teamHandicap", "Team Handicap", true), num("unrounded", "Before Rounding"), num("opponentTeamHandicap", "Opponent Team Handicap"), num("matchStrokes", "Strokes Given in the Match")],
    instructions: "Pick the format and enter both partners' Course Handicaps. For a match, also enter the opponents' handicaps to see how many strokes change hands.",
    examples: "Example: partners on 10 and 20. Foursomes: 50% × 30 = 15. Greensomes: 60% × 10 + 40% × 20 = 14.",
    assumptions: "WHS Appendix C: foursomes stroke play 50% of the combined Course Handicaps; greensomes 60% of the lower + 40% of the higher. Chapman / Pinehurst uses the same 60/40 split. In a match the higher side receives the difference between the team handicaps. " + DISCLAIMER,
    faq: [
      { question: "What is the difference between foursomes and greensomes?", answer: "In foursomes one partner tees off on odd holes, the other on even holes. In greensomes both drive, then pick one ball and alternate from there." },
      { question: "What is Chapman (Pinehurst)?", answer: "Both drive, swap balls for the second shot, choose one ball, then alternate shots." },
    ],
  },
  {
    slug: "golf-league-handicap-calculator",
    title: "Golf League Handicap Calculator",
    description: "Calculate a simple golf league handicap from your recent 9-hole (or 18-hole) scores — average over par times 80% or 90%.",
    metaTitle: "Golf League Handicap Calculator — 9-Hole Leagues",
    metaDescription: "Free golf league handicap calculator. Average your recent league scores over par and apply 80% or 90% for a fair league handicap.",
    calcInputs: [numberField("par", "Par (9 or 18 holes)", { default: 36, min: 27, max: 80 }), dropdown("method", "Scores Used", [["Average of all scores entered", 1], ["Best 3 of last 5", 2], ["Best 4 of last 8", 3], ["Best half of scores", 4]], 2), percentField("percentage", "Handicap Percentage", { default: 80, max: 100 }), ...Array.from({ length: 10 }, (_, i) => numberField(`score${i + 1}`, i === 0 ? "Score 1 (most recent)" : `Score ${i + 1}`, { default: i < 5 ? [45, 48, 43, 50, 46][i] : 0, max: 200, required: false }))],
    calcResult: { label: "League Handicap", format: "number" },
    calcResults: [num("leagueHandicap", "League Handicap", true), num("scoresUsed", "Scores Used"), num("averageScore", "Average Score Used"), num("averageOverPar", "Average Over Par")],
    instructions: "Enter par for the holes you play in league, choose your league's method and percentage, then enter your recent scores with the most recent first. Leave unused boxes at 0.",
    examples: "Example: last 5 scores 45, 48, 43, 50 and 46 on a par-36 nine. Best 3 average 44.67 — 8.67 over par — × 80% = league handicap 7.",
    assumptions: "A common league method: handicap = (average of the chosen scores − par) × 80% (or 90%), rounded, never below 0. It doesn't use course or slope rating — for an official index use the Golf Handicap Calculator. " + DISCLAIMER,
    faq: [
      { question: "Why do leagues use 80%?", answer: "It stops high handicaps winning too often and rewards improvement." },
      { question: "Can a new player join without scores?", answer: "Most leagues use a first-night score or a WHS index until the player has 3–5 league rounds." },
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
