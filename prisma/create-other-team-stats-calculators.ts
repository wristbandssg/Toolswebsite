// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the other-sports sub-batch "Cricket, Soccer, Volleyball & Hockey Stats". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-team-stats.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-team-stats-calculators.ts
// or
//   npm run db:create-other-team-stats-calculators

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

const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const OVERS = (key: string, label: string, def: number) => numberField(key, label, { default: def, max: 500, step: 0.1 });
const ALL_OUT = (key: string, label: string) => dropdown(key, label, [["No", 1], ["Yes — use full overs", 2]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "hitting-percentage-calculator",
    title: "Hitting Percentage Calculator",
    description: "Calculate volleyball hitting percentage (attack efficiency) from kills, errors and total attempts.",
    metaTitle: "Hitting Percentage Calculator — Volleyball",
    metaDescription: "Free volleyball hitting percentage calculator. Get hitting % (kills − errors ÷ attempts), kill % and error %.",
    calcInputs: [numberField("kills", "Kills", { default: 15, max: 5000 }), numberField("errors", "Attack Errors", { default: 5, max: 5000 }), numberField("attempts", "Total Attempts", { default: 40, min: 1, max: 10000 })],
    calcResult: { label: "Hitting %", format: "number" },
    calcResults: [num("hittingPct", "Hitting Percentage (.xxx)", true, 3), pct("killPct", "Kill %"), pct("errorPct", "Error %")],
    instructions: "Enter kills, attack errors (hit out, into the net or blocked for a point) and total attack attempts.",
    examples: "Example: 15 kills, 5 errors in 40 attempts → (15 − 5) ÷ 40 = .250.",
    assumptions: "Hitting % = (kills − errors) ÷ total attempts, shown as a decimal. It can be negative. Good college hitters are around .300; .400+ is elite for middles. " + DISCLAIMER,
    faq: [
      { question: "What is a good hitting percentage in volleyball?", answer: ".250+ is solid, .300+ very good." },
      { question: "Do blocked attacks count as errors?", answer: "Yes, if the block wins the point directly." },
    ],
  },
  {
    slug: "dls-score-calculator",
    title: "DLS Score Calculator",
    description: "Estimate the Duckworth-Lewis-Stern (DLS) revised target in a rain-affected cricket match — overs reduced at the start or lost during the chase.",
    metaTitle: "DLS Score Calculator — Revised Target (Cricket)",
    metaDescription: "Free DLS calculator. Estimate the revised target and par score for rain-reduced ODI or T20 run chases.",
    calcInputs: [numberField("team1Score", "Team 1 Score", { default: 250, max: 600 }), OVERS("team1Overs", "Team 1 Overs Available", 50), OVERS("team2Overs", "Team 2 Overs Available at the Start", 50), OVERS("oversLeftAtStop", "Team 2 Overs Left When Play Stopped (0 = no stoppage)", 20), OVERS("oversLost", "Overs Lost to the Stoppage", 10), numberField("wicketsAtStop", "Team 2 Wickets Down When Play Stopped", { default: 2, max: 9 })],
    calcResult: { label: "Revised Target", format: "number" },
    calcResults: [num("revisedTarget", "Revised Target", true), num("parScore", "Par Score"), pct("team1Resources", "Team 1 Resources"), pct("team2Resources", "Team 2 Resources")],
    instructions: "Enter Team 1's score and overs, Team 2's overs at the start and — if play stopped during the chase — the overs left, overs lost and wickets down at that moment.",
    examples: "Example: Team 1 makes 250 in 50 overs. Team 2's innings is cut to 30 overs before it starts → about 77% of resources, target 193. If instead rain takes 10 overs when Team 2 had 20 left at 2 down, the target is about 197.",
    assumptions: "Resource % uses a Duckworth–Lewis exponential fitted to the Standard Edition table (e.g. 30 overs / 0 down ≈ 77%). Par = S × R2 ÷ R1 when Team 2 has fewer resources, otherwise S + G50 × (R2 − R1) ÷ 100 with G50 = 245. The official DLS uses the Professional Edition software, so match targets can differ by a few runs. " + DISCLAIMER,
    faq: [
      { question: "What does DLS stand for?", answer: "Duckworth-Lewis-Stern — named after the statisticians who built it." },
      { question: "Why isn't the target just reduced by run rate?", answer: "Because wickets in hand matter too — DLS measures both overs and wickets as 'resources'." },
    ],
  },
  {
    slug: "cricket-net-run-rate-calculator",
    title: "Cricket Net Run Rate Calculator",
    description: "Calculate a team's net run rate (NRR) for a cricket tournament from runs scored, runs conceded and overs.",
    metaTitle: "Cricket Net Run Rate Calculator — NRR",
    metaDescription: "Free cricket NRR calculator. Get net run rate from total runs and overs for and against, with the all-out rule.",
    calcInputs: [OVERS("oversPerInnings", "Overs per Innings (for all-out rule)", 20), numberField("runsScored", "Total Runs Scored", { default: 1450, max: 100000 }), OVERS("oversFaced", "Total Overs Faced (e.g. 98.3)", 98.3), ALL_OUT("allOutBatting", "Bowled Out? (single match)"), numberField("runsConceded", "Total Runs Conceded", { default: 1400, max: 100000 }), OVERS("oversBowled", "Total Overs Bowled", 100), ALL_OUT("allOutBowling", "Bowled the Opponent Out? (single match)")],
    calcResult: { label: "NRR", format: "number" },
    calcResults: [num("netRunRate", "Net Run Rate", true, 3), num("runRateFor", "Run Rate For"), num("runRateAgainst", "Run Rate Against")],
    instructions: "Enter tournament totals. Write overs in cricket notation (98.3 = 98 overs 3 balls). For a single all-out innings, choose Yes to count the full quota of overs.",
    examples: "Example: 1,450 runs off 98.3 overs (14.72 an over) and 1,400 conceded in 100 overs (14.00) → NRR +0.721.",
    assumptions: "NRR = runs scored ÷ overs faced − runs conceded ÷ overs bowled, with balls converted to sixths of an over. A team bowled out is treated as having faced its full quota. Abandoned matches are excluded. " + DISCLAIMER,
    faq: [
      { question: "What is a good net run rate?", answer: "Anything positive means you score faster than you concede; +1.0 is strong in T20s." },
      { question: "How do I improve NRR quickly?", answer: "Win big — chase targets in fewer overs or bowl opponents out cheaply." },
    ],
  },
  {
    slug: "cricket-run-rate-calculator",
    title: "Cricket Run Rate Calculator",
    description: "Calculate a cricket team's current run rate, required run rate in a chase, runs and balls left, and projected score.",
    metaTitle: "Cricket Run Rate Calculator — CRR & Required Rate",
    metaDescription: "Free cricket run rate calculator. Get current run rate, required run rate, runs needed, balls left and projected total.",
    calcInputs: [numberField("runs", "Runs Scored", { default: 120, max: 1000 }), OVERS("oversBowled", "Overs Bowled (e.g. 25.3)", 25.3), OVERS("totalOvers", "Overs in the Innings", 50), numberField("target", "Target (0 if batting first)", { default: 280, max: 1000, required: false })],
    calcResult: { label: "Current Run Rate", format: "number" },
    calcResults: [num("currentRunRate", "Current Run Rate", true), num("requiredRunRate", "Required Run Rate"), num("runsNeeded", "Runs Needed"), num("ballsLeft", "Balls Left"), num("projectedScore", "Projected Score at This Rate")],
    instructions: "Enter runs and overs so far (in cricket notation), the innings length and the target if chasing.",
    examples: "Example: 120 for 25.3 overs chasing 280 in 50 → current rate 4.71, required 6.53 with 160 needed off 147 balls; at this rate they'd reach about 235.",
    assumptions: "Run rate = runs ÷ overs (balls as sixths of an over). Required rate = runs needed ÷ overs remaining. Projected score assumes the current rate continues. " + DISCLAIMER,
    faq: [
      { question: "What does 25.3 overs mean?", answer: "25 complete overs and 3 balls — 25.5 overs as a decimal." },
      { question: "What is a good ODI run rate?", answer: "About 5.5–6.5 an over for a 300-plus total." },
    ],
  },
  {
    slug: "xg-calculator",
    title: "xG Calculator",
    description: "Estimate expected goals (xG) for a soccer shot from its distance and angle, shot type and chance quality — and for several shots.",
    metaTitle: "xG Calculator — Expected Goals per Shot",
    metaDescription: "Free xG calculator. Estimate expected goals from shot distance, angle, header or penalty, and the chance of scoring.",
    calcInputs: [numberField("distanceFromGoalLine", "Distance from Goal Line (m)", { default: 11, min: 0.5, max: 60, step: 0.5 }), numberField("distanceFromCentre", "Distance Left/Right of Centre (m)", { default: 0, max: 35, step: 0.5, required: false }), dropdown("shotType", "Shot Type", [["Foot", 1], ["Header", 2], ["Penalty kick", 3]], 1), dropdown("bigChance", "Clear-Cut Chance (1-v-1, open goal)?", [["No", 1], ["Yes", 2]], 1), numberField("shots", "Number of Shots Like This", { default: 1, min: 1, max: 50 })],
    calcResult: { label: "xG per Shot", format: "number" },
    calcResults: [num("xgPerShot", "xG per Shot", true, 3), num("totalXg", "Total xG"), pct("chanceOfAtLeastOneGoalPct", "Chance of at Least One Goal"), num("shotAngleDegrees", "Shot Angle (°)"), num("shotDistanceM", "Distance to Goal Centre (m)")],
    instructions: "Enter where the shot was taken (the penalty spot is 11 m out, edge of the box 16.5 m), the shot type and whether it was a clear-cut chance.",
    examples: "Example: an open-play shot from the penalty spot ≈ 0.24 xG. Five shots from 18 m central ≈ 0.09 each — 0.44 xG and a 37% chance of at least one goal.",
    assumptions: "Logistic model on the visible goal-mouth angle and distance (logit = −1 + 1.6 × angle − 0.11 × distance; headers −0.9, big chances +1), fitted to typical public xG values. Penalties = 0.76. Pro models also use assist type, defender positions and game state. " + DISCLAIMER,
    faq: [
      { question: "What does 0.3 xG mean?", answer: "Shots like that are scored about 30% of the time." },
      { question: "Why compare goals with xG?", answer: "Scoring well above xG often means good finishing — or luck that may not last." },
    ],
  },
  {
    slug: "hockey-save-percentage-calculator",
    title: "Hockey Save Percentage Calculator",
    description: "Calculate a goalie's save percentage (SV%) and goals saved above average.",
    metaTitle: "Hockey Save Percentage Calculator — SV%",
    metaDescription: "Free hockey save percentage calculator. Get SV% from shots and goals against, plus goals saved vs league average.",
    calcInputs: [numberField("shotsAgainst", "Shots on Goal Against", { default: 30, min: 1, max: 5000 }), numberField("goalsAgainst", "Goals Against", { default: 3, max: 1000 }), numberField("leagueAverage", "League Average SV% (decimal)", { default: 0.9, min: 0.8, max: 0.95, step: 0.001 })],
    calcResult: { label: "Save %", format: "number" },
    calcResults: [num("savePct", "Save Percentage (.xxx)", true, 3), num("saves", "Saves"), num("goalsSavedVsAverage", "Goals Saved Above Average")],
    instructions: "Enter shots on goal and goals allowed (game or season). Also works for soccer, lacrosse and handball goalkeepers.",
    examples: "Example: 27 saves on 30 shots → .900 — exactly league average at .900, so 0 goals saved above average.",
    assumptions: "SV% = saves ÷ shots on goal. Goals saved above average = (SV% − league SV%) × shots. NHL average is roughly .900–.910. " + DISCLAIMER,
    faq: [
      { question: "What is a good NHL save percentage?", answer: ".915+ is very good; elite seasons reach .930." },
      { question: "Do empty-net goals count?", answer: "No — they aren't charged to the goalie." },
    ],
  },
  {
    slug: "gaa-calculator-hockey",
    title: "GAA Calculator (Hockey)",
    description: "Calculate a hockey goalie's goals against average (GAA) — goals allowed per 60 minutes played.",
    metaTitle: "GAA Calculator Hockey — Goals Against Average",
    metaDescription: "Free hockey GAA calculator. Get goals against average per 60 minutes from goals allowed and minutes played.",
    calcInputs: [numberField("goalsAgainst", "Goals Against", { default: 30, max: 2000 }), numberField("minutes", "Minutes Played", { default: 600, min: 1, max: 100000, step: 0.1 }), numberField("gameLength", "Regulation Game Length (min)", { default: 60, min: 10, max: 90 })],
    calcResult: { label: "GAA", format: "number" },
    calcResults: [num("gaa", "Goals Against Average", true), num("gamesPlayed", "Full Games Equivalent"), num("goalsPerPeriod", "Goals per 20-Minute Period")],
    instructions: "Enter goals allowed and minutes played. Change game length for youth hockey (e.g. 45 min) or other sports.",
    examples: "Example: 30 goals in 600 minutes → 30 × 60 ÷ 600 = 3.00 GAA.",
    assumptions: "GAA = goals against × game length ÷ minutes played. Shootout goals and empty-net goals don't count. GAA depends on team defence; pair it with save percentage. " + DISCLAIMER,
    faq: [
      { question: "What is a good GAA in the NHL?", answer: "Under 2.50 is very good; around 3.00 is average." },
      { question: "Can GAA be used for soccer?", answer: "Yes — use 90-minute games." },
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
