// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the baseball sub-batch C (Fielding, Value & Standings). See
// src/lib/calc-engine-baseball-hitting.ts for the full list
// of 3 sub-batches (31 tools under Sports Calculators > Baseball & Softball
// Calculators), and src/lib/calc-engine-baseball-team.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-baseball-team-calculators.ts
// or
//   npm run db:create-baseball-team-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Baseball & Softball Calculators", slug: "baseball-softball-calculators" };

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
  "Estimates for analysis, coaching and fan use. League constants (2024 MLB) change every season and official sites such as FanGraphs and Baseball-Reference may use slightly different adjustments. Follow your league's rules for equipment and pitching.";

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

const stat = (key: string, label: string, def: number, max = 2000) => numberField(key, label, { default: def, max });
const BASES: [string, number][] = [["Bases empty", 1], ["Runner on 1st", 2], ["Runner on 2nd", 3], ["Runner on 3rd", 4], ["1st & 2nd", 5], ["1st & 3rd", 6], ["2nd & 3rd", 7], ["Bases loaded", 8]];
const OUTS: [string, number][] = [["0 outs", 0], ["1 out", 1], ["2 outs", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "fielding-percentage-calculator",
    title: "Fielding Percentage Calculator",
    description: "Calculate fielding percentage from putouts, assists and errors — plus total chances and error rate.",
    metaTitle: "Fielding Percentage Calculator — FPCT",
    metaDescription: "Free fielding percentage calculator. Get FPCT, total chances and error rate from putouts, assists and errors.",
    calcInputs: [stat("putouts", "Putouts (PO)", 250, 5000), stat("assists", "Assists (A)", 350, 5000), stat("errors", "Errors (E)", 10, 500)],
    calcResult: { label: "Fielding Percentage", format: "number", decimals: 3 },
    calcResults: [num("fieldingPercentage", "Fielding Percentage", true, 3), num("totalChances", "Total Chances"), pct("errorRate", "Error Rate")],
    instructions: "Enter the fielder's (or team's) putouts, assists and errors.",
    examples: "Example: 250 putouts, 350 assists and 10 errors is a .984 fielding percentage on 610 chances.",
    assumptions: "FPCT = (PO + A) ÷ (PO + A + E). It doesn't credit range — a fielder who reaches fewer balls can post a higher percentage — so pair it with range metrics like OAA or DRS. MLB team averages are about .985. " + DISCLAIMER,
    faq: [
      { question: "What is a good fielding percentage?", answer: "It depends on position — first basemen and catchers often exceed .990, shortstops around .970–.980." },
      { question: "Is fielding percentage a good defence stat?", answer: "It measures sure-handedness only; it ignores range and arm, which modern metrics capture." },
    ],
  },
  {
    slug: "war-calculator",
    title: "WAR Calculator",
    description: "Calculate a position player's WAR (wins above replacement) from batting, baserunning and fielding runs, position and playing time — FanGraphs-style.",
    metaTitle: "WAR Calculator — Wins Above Replacement",
    metaDescription: "Free WAR calculator for position players. Combine batting, baserunning, fielding, positional and replacement runs into WAR.",
    calcInputs: [
      numberField("battingRuns", "Batting Runs Above Average (wRAA)", { default: 25, min: -100, max: 150, step: 0.1 }),
      numberField("baserunningRuns", "Baserunning Runs", { default: 2, min: -30, max: 30, step: 0.1 }),
      numberField("fieldingRuns", "Fielding Runs (e.g. OAA/DRS in Runs)", { default: 5, min: -50, max: 50, step: 0.1 }),
      dropdown("position", "Primary Position", [["Catcher (+12.5)", 1], ["First base (−12.5)", 2], ["Second base (+2.5)", 3], ["Third base (+2.5)", 4], ["Shortstop (+7.5)", 5], ["Left field (−7.5)", 6], ["Centre field (+2.5)", 7], ["Right field (−7.5)", 8], ["Designated hitter (−17.5)", 9]], 7),
      stat("games", "Games Played at Position", 150, 162),
      stat("plateAppearances", "Plate Appearances", 600, 800),
      numberField("runsPerWin", "Runs per Win", { default: 9.6, min: 1, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "WAR", format: "number" },
    calcResults: [num("war", "WAR", true), num("runsAboveReplacement", "Runs Above Replacement"), num("positionalAdjustment", "Positional Adjustment (Runs)"), num("replacementRuns", "Replacement Level Runs")],
    instructions: "Enter the player's batting, baserunning and fielding runs above average (from FanGraphs or your own estimates), primary position, games and plate appearances.",
    examples: "Example: +25 batting, +2 baserunning and +5 fielding runs for a centre fielder over 150 games and 600 PA is about 5.7 WAR — All-Star level.",
    assumptions: "WAR = (batting + baserunning + fielding + positional adjustment + replacement runs) ÷ runs per win. Positional adjustments are FanGraphs' per-162-game values; replacement level ≈ 20 runs per 600 PA; runs per win ≈ 9.6 (2024). The league adjustment is ignored, so results can differ slightly from published fWAR. " + DISCLAIMER,
    faq: [
      { question: "What is a good WAR?", answer: "0–1 is a bench player, 2 a solid starter, 3–4 good, 5+ All-Star and 8+ MVP level." },
      { question: "Why do shortstops get a bonus?", answer: "It's harder to field the position, so an average shortstop is worth more runs than an average first baseman." },
    ],
  },
  {
    slug: "run-differential-calculator",
    title: "Run Differential Calculator",
    description: "Calculate run differential and a team's Pythagorean expected win percentage and wins — and how lucky its record has been.",
    metaTitle: "Run Differential Calculator — Pythagorean Record",
    metaDescription: "Free run differential calculator. Get run differential, Pythagorean win %, expected wins and luck from runs scored and allowed.",
    calcInputs: [stat("runsScored", "Runs Scored", 750, 2000), stat("runsAllowed", "Runs Allowed", 650, 2000), stat("gamesPlayed", "Games Played", 162, 200), stat("actualWins", "Actual Wins", 92, 200), numberField("exponent", "Pythagorean Exponent", { default: 1.83, min: 0.1, max: 5, step: 0.01 })],
    calcResult: { label: "Run Differential", format: "number" },
    calcResults: [num("runDifferential", "Run Differential", true), num("pythagoreanWinPct", "Pythagorean Win %", false, 3), num("expectedWins", "Expected Wins"), num("winsAboveExpected", "Wins Above Expected (Luck)"), num("runDifferentialPerGame", "Run Differential per Game")],
    instructions: "Enter runs scored and allowed, games played and the team's actual wins.",
    examples: "Example: 750 runs scored and 650 allowed is a +100 differential and a .565 Pythagorean win % — about 91.5 expected wins over 162 games.",
    assumptions: "Pythagorean win % = RS^x ÷ (RS^x + RA^x), with x = 1.83 (Baseball-Reference); Bill James' original used 2. Roughly 10 runs of differential equals one win. Teams far above their expected record often regress. " + DISCLAIMER,
    faq: [
      { question: "How many runs is a win worth?", answer: "About 10 runs of differential per win in a normal scoring environment." },
      { question: "Why do some teams beat their Pythagorean record?", answer: "Strong bullpens and luck in one-run games — but it rarely lasts from season to season." },
    ],
  },
  {
    slug: "run-expectancy-calculator",
    title: "Run Expectancy Calculator",
    description: "Look up run expectancy (RE24) for any base-out state and measure how many runs a play added or cost — like a bunt, steal or double play.",
    metaTitle: "Run Expectancy Calculator — RE24 Matrix",
    metaDescription: "Free run expectancy calculator. Get RE24 for any base-out state and the run value of a play such as a bunt, steal or double play.",
    calcInputs: [dropdown("basesBefore", "Bases Before the Play", BASES, 2), dropdown("outsBefore", "Outs Before", OUTS, 0), dropdown("basesAfter", "Bases After the Play", BASES, 3), dropdown("outsAfter", "Outs After", [...OUTS, ["3 outs (inning over)", 3]], 1), stat("runsScored", "Runs Scored on the Play", 0, 4)],
    calcResult: { label: "Play Value", format: "number" },
    calcResults: [num("playValueRe24", "Run Value of the Play (RE24)", true, 3), num("runExpectancyBefore", "Run Expectancy Before", false, 3), num("runExpectancyAfter", "Run Expectancy After", false, 3)],
    instructions: "Choose the base-out state before and after the play and enter any runs that scored on it.",
    examples: "Example: a sacrifice bunt that moves a runner from first (0 outs, 0.859 expected runs) to second (1 out, 0.664) costs about 0.195 runs.",
    assumptions: "Uses the 2010–2015 MLB run expectancy matrix (expected runs from that state to the end of the inning). Play value = RE after − RE before + runs scored. Values shift slightly with the scoring environment. " + DISCLAIMER,
    faq: [
      { question: "Is bunting a bad idea?", answer: "On average a sacrifice lowers expected runs, though it can raise the chance of scoring exactly one run late in close games." },
      { question: "What is RE24?", answer: "The total change in run expectancy over a player's plate appearances — the runs they added across the 24 base-out states." },
    ],
  },
  {
    slug: "baseball-win-probability-calculator",
    title: "Baseball Win Probability Calculator",
    description: "Estimate each team's chance of winning from the score, inning, half-inning and outs — for 9-inning baseball or 7-inning softball.",
    metaTitle: "Baseball Win Probability Calculator",
    metaDescription: "Free baseball win probability calculator. Estimate home and away win chances from score, inning and outs for baseball or softball.",
    calcInputs: [stat("homeScore", "Home Team Runs", 3, 50), stat("awayScore", "Away Team Runs", 2, 50), stat("inning", "Inning", 7, 30), dropdown("half", "Half", [["Top (away batting)", 1], ["Bottom (home batting)", 2]], 1), dropdown("outs", "Outs", OUTS, 0), stat("scheduledInnings", "Scheduled Innings (9 Baseball, 7 Softball)", 9, 12)],
    calcResult: { label: "Home Win Probability", format: "percentage" },
    calcResults: [pct("homeWinProbability", "Home Team Win Probability", true), pct("awayWinProbability", "Away Team Win Probability"), num("scoreDifference", "Home Lead (Runs)")],
    instructions: "Enter the score, inning, which half, the outs and the scheduled game length. Use the last scheduled inning for extra innings.",
    examples: "Example: the home team leading 3–2 in the top of the 7th with no outs wins about 71% of the time.",
    assumptions: "Simulates the remaining half-innings with MLB-typical runs-per-inning odds (0 runs 73%, 1 run 15%, 2 runs 7% …), treating partial innings by outs left and giving the home team 52% of extra-inning games. It ignores base runners, team strength and pitchers, so it's a quick estimate. " + DISCLAIMER,
    faq: [
      { question: "How likely is a team up one in the 9th to win?", answer: "A home team up one entering the top of the 9th wins roughly 85% of the time." },
      { question: "Is there a home-field advantage?", answer: "Yes — MLB home teams win about 53–54% of games, partly from batting last." },
    ],
  },
  {
    slug: "games-behind-calculator",
    title: "Games Behind Calculator",
    description: "Calculate how many games a team is behind the division or wild-card leader from both teams' wins and losses.",
    metaTitle: "Games Behind Calculator — GB in the Standings",
    metaDescription: "Free games behind calculator. Find how many games a team trails the leader from wins and losses, plus both win percentages.",
    calcInputs: [stat("leaderWins", "Leader Wins", 90, 200), stat("leaderLosses", "Leader Losses", 60, 200), stat("teamWins", "Your Team Wins", 85, 200), stat("teamLosses", "Your Team Losses", 65, 200)],
    calcResult: { label: "Games Behind", format: "number" },
    calcResults: [num("gamesBehind", "Games Behind (GB)", true), num("leaderWinPct", "Leader Win %", false, 3), num("teamWinPct", "Your Team Win %", false, 3)],
    instructions: "Enter the wins and losses of the leader and your team.",
    examples: "Example: a 90–60 leader and an 85–65 chaser are 5 games apart.",
    assumptions: "GB = ((leader W − team W) + (team L − leader L)) ÷ 2. Half games appear when teams have played different numbers of games. Standings are ranked by win %, so a team can lead by win % while being 'behind' in GB. " + DISCLAIMER,
    faq: [
      { question: "What does a half game behind mean?", answer: "The teams have played an odd number of games apart — e.g. one team has an extra loss." },
      { question: "Can games behind be negative?", answer: "A negative value means your team is actually ahead of the team entered as leader." },
    ],
  },
  {
    slug: "magic-number-calculator",
    title: "Magic Number Calculator",
    description: "Calculate a baseball team's magic number to clinch the division or a playoff spot — the combination of its wins and the chaser's losses needed.",
    metaTitle: "Magic Number Calculator — Clinch Number",
    metaDescription: "Free MLB magic number calculator. Find the wins plus opponent losses needed to clinch a division or playoff spot.",
    calcInputs: [stat("seasonGames", "Games in Season", 162, 200), stat("leaderWins", "Leader Wins", 90, 200), stat("leaderLosses", "Leader Losses", 60, 200), stat("chaserLosses", "Closest Chaser's Losses", 65, 200)],
    calcResult: { label: "Magic Number", format: "number" },
    calcResults: [num("magicNumber", "Magic Number", true), num("leaderGamesRemaining", "Leader Games Remaining"), num("clinched", "Clinched (1 Yes)"), num("chaserMaxWins", "Chaser's Maximum Possible Wins")],
    instructions: "Enter the season length, the leader's record and the losses of the closest pursuing team.",
    examples: "Example: in a 162-game season, a 90–60 leader with the chaser on 65 losses has a magic number of 8 — any combination of 8 leader wins and chaser losses clinches.",
    assumptions: "Magic number = games in season + 1 − leader wins − chaser losses. The +1 avoids a tie; if tiebreakers favour the leader, one fewer may be enough (MLB has no tiebreaker games since 2022). The same number is the chaser's 'tragic' or elimination number. " + DISCLAIMER,
    faq: [
      { question: "Why add 1 in the magic number formula?", answer: "To guarantee the leader finishes strictly ahead rather than tied." },
      { question: "What is the elimination number?", answer: "The same calculation from the trailing team's view — when it reaches 0 they're out." },
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
