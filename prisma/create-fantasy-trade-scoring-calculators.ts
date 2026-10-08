// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the fantasy sports sub-batch A (Fantasy Trade + Fantasy Points &
// Scoring). Part of the fantasy sports tool-list build-out: 28 keywords in
// the source list, 2 merged as same-intent duplicates (NFL Fantasy Score →
// Fantasy Football Points, NBA Fantasy Score → Fantasy Basketball Points),
// 26 built across 3 sub-batches — all under Sports Calculators >
// Fantasy Sports Calculators:
//   create-fantasy-trade-scoring-calculators.ts (12 tools)
//   create-fantasy-draft-playoffs-calculators.ts (9 tools)
//   create-fantasy-payouts-pools-calculators.ts (5 tools)
//
// See src/lib/calc-engine-fantasy-trade-scoring.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-fantasy-trade-scoring-calculators.ts
// or
//   npm run db:create-fantasy-trade-scoring-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Fantasy Sports Calculators", slug: "fantasy-sports-calculators" };

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
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 100 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const NFL_POS: [string, number][] = [
  ["QB", 1],
  ["RB", 2],
  ["WR", 3],
  ["TE", 4],
];

const DISCLAIMER =
  "This tool gives estimates for fun and planning only. Fantasy values depend on your league's scoring, roster rules " +
  "and the projections you enter — check your platform's official scoring settings. It isn't betting advice.";

interface ToolDef {
  slug: string;  title: string;
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

const TOOLS: ToolDef[] = [
  // ---------------------------------------------------------------- Trades
  {
    slug: "fantasy-football-trade-calculator",    title: "Fantasy Football Trade Calculator",
    description: "Find out who wins a redraft fantasy football trade. Compare up to three players on each side by rest-of-season points over a waiver replacement.",
    metaTitle: "Fantasy Football Trade Calculator — Who Wins?",
    metaDescription: "Free fantasy football trade calculator. Compare up to 3 players per side by rest-of-season points over replacement and see who wins the trade.",
    calcInputs: [
      numberField("give1", "You Give: Player 1 (Projected PPG)", { default: 18, max: 50, step: 0.1 }),
      numberField("give2", "You Give: Player 2 (PPG, 0 if none)", { default: 0, max: 50, step: 0.1, required: false }),
      numberField("give3", "You Give: Player 3 (PPG, 0 if none)", { default: 0, max: 50, step: 0.1, required: false }),
      numberField("get1", "You Get: Player 1 (Projected PPG)", { default: 14, max: 50, step: 0.1 }),
      numberField("get2", "You Get: Player 2 (PPG, 0 if none)", { default: 12, max: 50, step: 0.1, required: false }),
      numberField("get3", "You Get: Player 3 (PPG, 0 if none)", { default: 0, max: 50, step: 0.1, required: false }),
      numberField("replacementPpg", "Waiver Replacement Player (PPG)", { default: 8, max: 30, step: 0.5 }),
      numberField("weeksRemaining", "Weeks Left in Your Season", { default: 10, max: 18 }),
    ],
    calcResult: { label: "Net Points Gained", format: "number" },
    calcResults: [
      { key: "netPointsGained", label: "Net Rest-of-Season Points (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get (Points Over Replacement)", format: "number" },
      { key: "valueGiven", label: "Value You Give (Points Over Replacement)", format: "number" },
      { key: "netPointsPerWeek", label: "Net Points per Week", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions:
      "Enter each player's projected fantasy points per game for the rest of the season, in your league's scoring. Leave unused slots at 0.\n\n" +
      "Then enter the points per game of the best player on your waiver wire and the weeks left in your season.",
    examples:
      "Example: you trade an 18 PPG running back for a 14 PPG and a 12 PPG receiver, with 10 weeks left and an 8 PPG waiver option. " +
      "The star is worth (18 − 8) × 10 = 100 points over replacement. The two receivers are worth 60 + 40 = 100. The trade is dead even — the 26 total PPG you get is not a win, because only one of them replaces the star in your lineup.",
    assumptions:
      "Value over replacement: each player is worth only what he scores above the waiver player who would otherwise take his spot. " +
      "Players who wouldn't start for you add little. " + DISCLAIMER,
    faq: [
      { question: "Why doesn't a 2-for-1 trade just add up the points?", answer: "You can only start so many players. The second player usually replaces someone already on your roster or a waiver pickup, so only his points above that player count." },
      { question: "Where do I get rest-of-season projections?", answer: "Most fantasy platforms and sites like FantasyPros publish rest-of-season projections. Use the same source for every player so the comparison is fair." },
    ],
  },
  {
    slug: "dynasty-trade-calculator",    title: "Dynasty Trade Calculator",
    description: "Value a dynasty fantasy football trade over several seasons. Accounts for each player's age and position aging curve, future-year discounting, and rookie draft picks.",
    metaTitle: "Dynasty Trade Calculator — Fantasy Football",
    metaDescription: "Free dynasty trade calculator for fantasy football. Value players by age, position aging curve and rookie picks over 1–10 seasons.",
    calcInputs: [
      numberField("give1Ppg", "You Give: Player 1 PPG", { default: 18, max: 50, step: 0.1 }),
      numberField("give1Age", "You Give: Player 1 Age", { default: 28, min: 20, max: 40 }),
      dropdown("give1Pos", "You Give: Player 1 Position", NFL_POS, 2),
      numberField("give2Ppg", "You Give: Player 2 PPG (0 if none)", { default: 0, max: 50, step: 0.1, required: false }),
      numberField("give2Age", "You Give: Player 2 Age", { default: 25, min: 20, max: 40, required: false }),
      dropdown("give2Pos", "You Give: Player 2 Position", NFL_POS, 3),
      numberField("givePicks", "You Give: 1st-Round Rookie Picks", { default: 0, max: 10, required: false }),
      numberField("get1Ppg", "You Get: Player 1 PPG", { default: 14, max: 50, step: 0.1 }),
      numberField("get1Age", "You Get: Player 1 Age", { default: 23, min: 20, max: 40 }),
      dropdown("get1Pos", "You Get: Player 1 Position", NFL_POS, 3),
      numberField("get2Ppg", "You Get: Player 2 PPG (0 if none)", { default: 0, max: 50, step: 0.1, required: false }),
      numberField("get2Age", "You Get: Player 2 Age", { default: 25, min: 20, max: 40, required: false }),
      dropdown("get2Pos", "You Get: Player 2 Position", NFL_POS, 3),
      numberField("getPicks", "You Get: 1st-Round Rookie Picks", { default: 1, max: 10, required: false }),
      numberField("horizonYears", "Seasons to Value", { default: 4, min: 1, max: 10 }),
      percentField("discountRate", "Discount per Future Season", { default: 10, max: 50 }),
    ],
    calcResult: { label: "Net Dynasty Value", format: "number" },
    calcResults: [
      { key: "netDynastyValue", label: "Net Dynasty Value (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get", format: "number" },
      { key: "valueGiven", label: "Value You Give", format: "number" },
      { key: "firstRoundPickValue", label: "Value of One 1st-Round Pick", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions:
      "For each player, enter his current fantasy points per game, his age and his position. Add any 1st-round rookie picks in the deal.\n\n" +
      "Choose how many seasons to value (contenders often use 2–3, rebuilding teams 5+) and how much less a future season is worth to you than this one.",
    examples:
      "Example: trading a 28-year-old running back scoring 18 PPG for a 23-year-old receiver scoring 14 PPG plus a 1st-round pick, over 4 seasons with a 10% discount. " +
      "The running back is worth 892 points — he's past the running back prime and declines each year. The receiver is still improving and the pick adds 332, so you get 1,208. You win the deal by 316 points.",
    assumptions:
      "Aging curves: QBs peak around 27 and hold until 33; RBs peak at 24 and decline about 12% a year after 26; WRs peak at 25 and decline about 9% a year after 28; TEs peak at 26 and decline about 10% a year after 29. " +
      "A season is 17 games. A 1st-round rookie pick is valued as a 21-year-old receiver expected to reach 11 PPG, at a 60% hit rate. " + DISCLAIMER,
    faq: [
      { question: "Why are running backs worth less in dynasty?", answer: "Running backs peak earliest and decline fastest. A 28-year-old back may have one or two good years left, while a receiver of the same age can produce for several more." },
      { question: "What discount rate should I use?", answer: "Use 0–5% if you're rebuilding and care about the long term, 10% for a balanced view, and 20%+ if you're all-in on winning this season." },
    ],
  },
  {
    slug: "fantasy-basketball-trade-calculator",    title: "Fantasy Basketball Trade Calculator",
    description: "Evaluate a redraft fantasy basketball trade using each player's fantasy points per game and his own games remaining, measured over a waiver replacement.",
    metaTitle: "Fantasy Basketball Trade Calculator — NBA",
    metaDescription: "Free fantasy basketball trade calculator. Compare players by fantasy points per game and games remaining over a waiver replacement.",
    calcInputs: [
      numberField("give1Fppg", "You Give: Player 1 FPPG", { default: 45, max: 100, step: 0.1 }),
      numberField("give1Games", "You Give: Player 1 Games Remaining", { default: 40, max: 82 }),
      numberField("give2Fppg", "You Give: Player 2 FPPG (0 if none)", { default: 0, max: 100, step: 0.1, required: false }),
      numberField("give2Games", "You Give: Player 2 Games Remaining", { default: 0, max: 82, required: false }),
      numberField("get1Fppg", "You Get: Player 1 FPPG", { default: 38, max: 100, step: 0.1 }),
      numberField("get1Games", "You Get: Player 1 Games Remaining", { default: 50, max: 82 }),
      numberField("get2Fppg", "You Get: Player 2 FPPG (0 if none)", { default: 28, max: 100, step: 0.1, required: false }),
      numberField("get2Games", "You Get: Player 2 Games Remaining", { default: 45, max: 82, required: false }),
      numberField("replacementFppg", "Waiver Replacement Player (FPPG)", { default: 22, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Net Value Gained", format: "number" },
    calcResults: [
      { key: "netValueGained", label: "Net Value (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get (Points Over Replacement)", format: "number" },
      { key: "valueGiven", label: "Value You Give (Points Over Replacement)", format: "number" },
      { key: "rawPointsReceived", label: "Raw Fantasy Points You Get", format: "number" },
      { key: "rawPointsGiven", label: "Raw Fantasy Points You Give", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions:
      "Enter each player's fantasy points per game and how many games he is expected to play for the rest of your season — subtract known injuries and planned rest days.\n\n" +
      "Then enter the FPPG of the best free agent you could pick up instead.",
    examples:
      "Example: you give a 45 FPPG star who will miss time and play only 40 more games. You get a 38 FPPG player with 50 games left and a 28 FPPG player with 45. " +
      "With a 22 FPPG replacement, the star is worth 920 points over replacement and the two players 1,070, so you gain 150 — even though you give up the best player in the deal.",
    assumptions: "Value over replacement over the games each player is expected to play. Weekly games limits and category leagues aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "Why do games remaining matter so much in basketball?", answer: "NBA stars rest and miss games far more often than NFL players miss weeks. A great player who plays 40 of the last 60 games can be worth less than a good one who plays them all." },
      { question: "Does this work for category leagues?", answer: "It's built for points leagues. For 9-category leagues, use a points-per-game estimate from your platform's player rater as a rough guide." },
    ],
  },
  {
    slug: "dynasty-basketball-trade-calculator",    title: "Dynasty Basketball Trade Calculator",
    description: "Value a dynasty fantasy basketball trade across several seasons, using an NBA aging curve that rises to the late 20s and declines after 30.",
    metaTitle: "Dynasty Basketball Trade Calculator — NBA",
    metaDescription: "Free dynasty fantasy basketball trade calculator. Compare players over 1–10 seasons with an NBA aging curve and future-season discount.",
    calcInputs: [
      numberField("give1Fppg", "You Give: Player 1 FPPG", { default: 48, max: 100, step: 0.1 }),
      numberField("give1Age", "You Give: Player 1 Age", { default: 31, min: 18, max: 42 }),
      numberField("give2Fppg", "You Give: Player 2 FPPG (0 if none)", { default: 0, max: 100, step: 0.1, required: false }),
      numberField("give2Age", "You Give: Player 2 Age", { default: 25, min: 18, max: 42, required: false }),
      numberField("get1Fppg", "You Get: Player 1 FPPG", { default: 38, max: 100, step: 0.1 }),
      numberField("get1Age", "You Get: Player 1 Age", { default: 22, min: 18, max: 42 }),
      numberField("get2Fppg", "You Get: Player 2 FPPG (0 if none)", { default: 0, max: 100, step: 0.1, required: false }),
      numberField("get2Age", "You Get: Player 2 Age", { default: 25, min: 18, max: 42, required: false }),
      numberField("gamesPerSeason", "Games Played per Season", { default: 70, max: 82 }),
      numberField("horizonYears", "Seasons to Value", { default: 4, min: 1, max: 10 }),
      percentField("discountRate", "Discount per Future Season", { default: 10, max: 50 }),
    ],
    calcResult: { label: "Net Dynasty Value", format: "number" },
    calcResults: [
      { key: "netDynastyValue", label: "Net Dynasty Value (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get", format: "number" },
      { key: "valueGiven", label: "Value You Give", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions: "Enter each player's current fantasy points per game and age, the games a player typically plays in a season, how many seasons to value, and how much a future season is discounted.",
    examples:
      "Example: a 31-year-old star at 48 FPPG for a 22-year-old at 38 FPPG, over 4 seasons at 70 games and a 10% discount. " +
      "The veteran is worth 10,353 fantasy points of value as he declines; the young player 9,928 as he improves. The veteran still edges it by 425 over 4 years — stretch the horizon to 6 seasons and the young player wins.",
    assumptions: "Aging curve: players improve about 6% a year until 26, hold their level from 26 to 30, then decline about 8% a year. " + DISCLAIMER,
    faq: [
      { question: "When do NBA players peak in fantasy?", answer: "Fantasy production usually peaks between about 26 and 30. Guards who rely on athleticism tend to decline earlier than skilled big men and shooters." },
      { question: "Should a contender trade young players for veterans?", answer: "Often yes — set the horizon to 1–2 seasons and the discount higher. The calculator then rewards present production over future growth." },
    ],
  },
  {
    slug: "fantasy-baseball-trade-calculator",    title: "Fantasy Baseball Trade Calculator",
    description: "Compare hitters and pitchers in a fantasy baseball points-league trade. Converts points per game or per start into points per week by role, over a waiver replacement.",
    metaTitle: "Fantasy Baseball Trade Calculator — Points",
    metaDescription: "Free fantasy baseball trade calculator. Compare hitters, starting pitchers and relievers by weekly points over replacement for the rest of the season.",
    calcInputs: [
      numberField("give1Points", "You Give: Player 1 Points per Game/Start", { default: 18, max: 60, step: 0.1 }),
      dropdown("give1Role", "You Give: Player 1 Role", [["Hitter (~6 games/week)", 1], ["Starting Pitcher (~1.1 starts/week)", 2], ["Relief Pitcher (~3 outings/week)", 3]], 2),
      numberField("give2Points", "You Give: Player 2 Points per Game/Start (0 if none)", { default: 0, max: 60, step: 0.1, required: false }),
      dropdown("give2Role", "You Give: Player 2 Role", [["Hitter (~6 games/week)", 1], ["Starting Pitcher (~1.1 starts/week)", 2], ["Relief Pitcher (~3 outings/week)", 3]], 1),
      numberField("get1Points", "You Get: Player 1 Points per Game/Start", { default: 3.2, max: 60, step: 0.1 }),
      dropdown("get1Role", "You Get: Player 1 Role", [["Hitter (~6 games/week)", 1], ["Starting Pitcher (~1.1 starts/week)", 2], ["Relief Pitcher (~3 outings/week)", 3]], 1),
      numberField("get2Points", "You Get: Player 2 Points per Game/Start (0 if none)", { default: 0, max: 60, step: 0.1, required: false }),
      dropdown("get2Role", "You Get: Player 2 Role", [["Hitter (~6 games/week)", 1], ["Starting Pitcher (~1.1 starts/week)", 2], ["Relief Pitcher (~3 outings/week)", 3]], 1),
      numberField("replacementPerWeek", "Waiver Replacement (Points per Week)", { default: 12, max: 100, step: 0.5 }),
      numberField("weeksRemaining", "Weeks Left in Your Season", { default: 12, max: 26 }),
    ],
    calcResult: { label: "Net Points Gained", format: "number" },
    calcResults: [
      { key: "netPointsGained", label: "Net Points (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get (Points Over Replacement)", format: "number" },
      { key: "valueGiven", label: "Value You Give (Points Over Replacement)", format: "number" },
      { key: "netPointsPerWeek", label: "Net Points per Week", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions:
      "Enter points per game for hitters, points per start for starting pitchers and points per appearance for relievers, and pick each player's role.\n\n" +
      "Then enter what a waiver player would score in that roster spot per week, and the weeks left.",
    examples:
      "Example: trading a starter who averages 18 points per start for a hitter averaging 3.2 points per game, with 12 weeks left and a 12-points-per-week replacement. " +
      "The pitcher makes about 19.8 points a week (93.6 over replacement); the hitter about 19.2 (86.4). You lose 7.2 points — a close deal.",
    assumptions: "Hitters play about 6 games a week, starting pitchers make about 1.1 starts, relievers about 3 appearances. Two-start weeks and off-days aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "Why convert to points per week?", answer: "A hitter plays almost every day while a starter pitches once every five days. Points per week puts both on the same scale." },
      { question: "Does it work for rotisserie (roto) leagues?", answer: "Not directly — roto leagues score categories, not points. Use a points estimate from your platform's player rater as a rough proxy." },
    ],
  },
  {
    slug: "fantasy-hockey-trade-calculator",    title: "Fantasy Hockey Trade Calculator",
    description: "Evaluate a fantasy hockey trade between skaters and goalies, with separate waiver replacement levels for each and each player's games remaining.",
    metaTitle: "Fantasy Hockey Trade Calculator — NHL",
    metaDescription: "Free fantasy hockey trade calculator. Compare skaters and goalies by fantasy points per game and games remaining over position replacement levels.",
    calcInputs: [
      numberField("give1Fppg", "You Give: Player 1 FPPG", { default: 4.5, max: 20, step: 0.1 }),
      numberField("give1Games", "You Give: Player 1 Games (Starts) Remaining", { default: 30, max: 82 }),
      dropdown("give1Pos", "You Give: Player 1 Position", [["Skater", 1], ["Goalie", 2]], 2),
      numberField("give2Fppg", "You Give: Player 2 FPPG (0 if none)", { default: 0, max: 20, step: 0.1, required: false }),
      numberField("give2Games", "You Give: Player 2 Games Remaining", { default: 0, max: 82, required: false }),
      dropdown("give2Pos", "You Give: Player 2 Position", [["Skater", 1], ["Goalie", 2]], 1),
      numberField("get1Fppg", "You Get: Player 1 FPPG", { default: 3.1, max: 20, step: 0.1 }),
      numberField("get1Games", "You Get: Player 1 Games Remaining", { default: 40, max: 82 }),
      dropdown("get1Pos", "You Get: Player 1 Position", [["Skater", 1], ["Goalie", 2]], 1),
      numberField("get2Fppg", "You Get: Player 2 FPPG (0 if none)", { default: 2.4, max: 20, step: 0.1, required: false }),
      numberField("get2Games", "You Get: Player 2 Games Remaining", { default: 40, max: 82, required: false }),
      dropdown("get2Pos", "You Get: Player 2 Position", [["Skater", 1], ["Goalie", 2]], 1),
      numberField("skaterReplacement", "Waiver Skater (FPPG)", { default: 1.8, max: 10, step: 0.1 }),
      numberField("goalieReplacement", "Waiver Goalie (FPPG per Start)", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Net Value Gained", format: "number" },
    calcResults: [
      { key: "netValueGained", label: "Net Value (+ = You Win)", format: "number", highlight: true },
      { key: "valueReceived", label: "Value You Get (Points Over Replacement)", format: "number" },
      { key: "valueGiven", label: "Value You Give (Points Over Replacement)", format: "number" },
      { key: "tradeFairness", label: "Trade Fairness (100 = Even)", format: "percentage" },
    ],
    instructions: "Enter each player's fantasy points per game (per start for goalies), games or starts remaining, and position. Then enter what the best available waiver skater and goalie score.",
    examples:
      "Example: you trade a goalie scoring 4.5 points per start with 30 starts left for two skaters at 3.1 and 2.4 FPPG with 40 games each. " +
      "Against a 2.5-point waiver goalie, the goalie is worth 60 points over replacement. Against a 1.8-point waiver skater, the two skaters are worth 52 + 24 = 76. You gain 16.",
    assumptions: "Value over position replacement over the games each player is expected to play. Daily lineup limits aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "Why do goalies have their own replacement level?", answer: "Goalies score in bigger chunks (wins, saves, shutouts) but only when they start. A streamable goalie scores very differently from a streamable skater, so each is compared with its own waiver option." },
      { question: "How many starts does a goalie get?", answer: "A true starter plays about 55–65 of 82 games; a 1B or tandem goalie 35–45. Check recent starts before entering a number." },
    ],
  },
  // ---------------------------------------------------------------- Points
  {
    slug: "fantasy-football-points-calculator",    title: "Fantasy Football Points Calculator",
    description: "Calculate fantasy football points for any player in Standard, Half PPR or PPR scoring, with 4- or 6-point passing touchdowns — also known as an NFL fantasy score calculator.",
    metaTitle: "Fantasy Football Points Calculator — PPR",
    metaDescription: "Free fantasy football points calculator for NFL players. Standard, Half PPR and PPR scoring with passing, rushing and receiving breakdown.",
    calcInputs: [
      dropdown("scoringFormat", "Scoring Format", [["Standard (0 per catch)", 0], ["Half PPR (0.5 per catch)", 1], ["PPR (1 per catch)", 2]], 2),
      dropdown("passTdPoints", "Passing TD Points", [["4 points", 4], ["6 points", 6]], 4),
      numberField("passYards", "Passing Yards", { default: 0, max: 700 }),
      numberField("passTds", "Passing TDs", { default: 0, max: 10 }),
      numberField("interceptions", "Interceptions Thrown", { default: 0, max: 10 }),
      numberField("rushYards", "Rushing Yards", { default: 45, max: 400 }),
      numberField("rushTds", "Rushing TDs", { default: 0, max: 10 }),
      numberField("receptions", "Receptions", { default: 7, max: 25 }),
      numberField("recYards", "Receiving Yards", { default: 96, max: 400 }),
      numberField("recTds", "Receiving TDs", { default: 1, max: 10 }),
      numberField("twoPointConversions", "2-Point Conversions", { default: 0, max: 5, required: false }),
      numberField("fumblesLost", "Fumbles Lost", { default: 0, max: 5, required: false }),
    ],
    calcResult: { label: "Fantasy Points", format: "number" },
    calcResults: [
      { key: "totalPoints", label: "Total Fantasy Points", format: "number", highlight: true },
      { key: "passingPoints", label: "Passing Points", format: "number" },
      { key: "rushingPoints", label: "Rushing Points", format: "number" },
      { key: "receivingPoints", label: "Receiving Points", format: "number" },
      { key: "otherPoints", label: "2-Point Conversions & Fumbles", format: "number" },
    ],
    instructions: "Pick your league's scoring format and passing TD value, then enter the player's stat line for the game (or season).",
    examples:
      "Example: a receiver with 7 catches, 96 receiving yards, a touchdown and 45 rushing yards scores 27.1 points in PPR — 4.5 rushing and 22.6 receiving. In standard scoring the same game is 20.1.",
    assumptions:
      "Standard league scoring: 1 point per 25 passing yards (0.04 a yard), 1 per 10 rushing or receiving yards, 6 per rushing or receiving TD, −2 per interception and fumble lost, 2 per 2-point conversion. " + DISCLAIMER,
    faq: [
      { question: "What is PPR?", answer: "Points per reception: every catch earns a point (half a point in Half PPR). It makes pass-catching running backs and slot receivers more valuable." },
      { question: "Is NFL fantasy score the same as fantasy football points?", answer: "Yes. Season-long leagues on ESPN, Yahoo, Sleeper and NFL.com all use this same structure; only the PPR and TD settings differ. For DraftKings rules, use the DraftKings Points Calculator." },
    ],
  },
  {
    slug: "draftkings-points-calculator",    title: "DraftKings Points Calculator",
    description: "Calculate DraftKings NFL fantasy points with Classic scoring — full PPR, 0.04 per passing yard and 3-point yardage bonuses — plus points per $1,000 of salary.",
    metaTitle: "DraftKings Points Calculator — NFL DFS",
    metaDescription: "Free DraftKings points calculator for NFL DFS. Classic scoring with 300/100-yard bonuses and points per $1K salary value.",
    calcInputs: [
      numberField("passYards", "Passing Yards", { default: 312, max: 700 }),
      numberField("passTds", "Passing TDs", { default: 2, max: 10 }),
      numberField("interceptions", "Interceptions Thrown", { default: 1, max: 10 }),
      numberField("rushYards", "Rushing Yards", { default: 18, max: 400 }),
      numberField("rushTds", "Rushing TDs", { default: 0, max: 10 }),
      numberField("receptions", "Receptions", { default: 0, max: 25 }),
      numberField("recYards", "Receiving Yards", { default: 0, max: 400 }),
      numberField("recTds", "Receiving TDs", { default: 0, max: 10 }),
      numberField("returnTds", "Punt/Kick/FG Return TDs", { default: 0, max: 5, required: false }),
      numberField("twoPointConversions", "2-Point Conversions", { default: 0, max: 5, required: false }),
      numberField("fumblesLost", "Fumbles Lost", { default: 0, max: 5, required: false }),
      currencyField("salary", "DraftKings Salary (Optional)", { default: 7200, max: 15000, step: 100, required: false }),
    ],
    calcResult: { label: "DraftKings Points", format: "number" },
    calcResults: [
      { key: "totalPoints", label: "DraftKings Points", format: "number", highlight: true },
      { key: "pointsPer1kSalary", label: "Points per $1K Salary", format: "number" },
      { key: "passingPoints", label: "Passing Points", format: "number" },
      { key: "rushingPoints", label: "Rushing Points", format: "number" },
      { key: "receivingPoints", label: "Receiving Points", format: "number" },
      { key: "bonusPoints", label: "Yardage Bonuses", format: "number" },
      { key: "otherPoints", label: "Return TDs, 2-Pt & Fumbles", format: "number" },
    ],
    instructions: "Enter the player's stat line. Add his DraftKings salary to see his value — points per $1,000 of salary.",
    examples:
      "Example: a quarterback throwing for 312 yards, 2 touchdowns and an interception, with 18 rushing yards, scores 24.28 DraftKings points — 19.48 passing, 1.8 rushing and a 3-point bonus for 300+ passing yards. At a $7,200 salary that is 3.37 points per $1K.",
    assumptions:
      "DraftKings NFL Classic scoring: 0.04 per passing yard, 4 per passing TD, −1 per interception, 0.1 per rushing/receiving yard, 6 per rushing/receiving/return TD, 1 per reception, 2 per 2-point conversion, −1 per fumble lost, and +3 for 300+ passing, 100+ rushing or 100+ receiving yards. DST scoring isn't included. " + DISCLAIMER,
    faq: [
      { question: "What is a good points-per-$1K value?", answer: "A common cash-game target is about 3x salary (3 points per $1K); tournament winners usually need players hitting 4–5x." },
      { question: "How is DraftKings scoring different from season-long leagues?", answer: "DraftKings is full PPR, takes only 1 point for an interception or fumble, and adds 3-point yardage bonuses that season-long leagues usually don't have." },
    ],
  },
  {
    slug: "fantasy-basketball-points-calculator",    title: "Fantasy Basketball Points Calculator",
    description: "Calculate fantasy basketball points from an NBA stat line using ESPN or Yahoo default points-league scoring — also known as an NBA fantasy score calculator.",
    metaTitle: "Fantasy Basketball Points Calculator — NBA",
    metaDescription: "Free fantasy basketball points calculator. Turn an NBA box score into ESPN or Yahoo fantasy points, with shooting efficiency and stocks.",
    calcInputs: [
      dropdown("platform", "Scoring System", [["ESPN Points League", 1], ["Yahoo Points League", 2]], 1),
      numberField("points", "Points", { default: 28, max: 100 }),
      numberField("rebounds", "Rebounds", { default: 8, max: 40 }),
      numberField("assists", "Assists", { default: 6, max: 30 }),
      numberField("steals", "Steals", { default: 1, max: 15 }),
      numberField("blocks", "Blocks", { default: 1, max: 15 }),
      numberField("turnovers", "Turnovers", { default: 3, max: 15 }),
      numberField("threesMade", "3-Pointers Made (ESPN)", { default: 3, max: 20, required: false }),
      numberField("fgMade", "Field Goals Made (ESPN)", { default: 10, max: 40, required: false }),
      numberField("fgAttempted", "Field Goals Attempted (ESPN)", { default: 20, max: 60, required: false }),
      numberField("ftMade", "Free Throws Made (ESPN)", { default: 5, max: 30, required: false }),
      numberField("ftAttempted", "Free Throws Attempted (ESPN)", { default: 6, max: 40, required: false }),
    ],
    calcResult: { label: "Fantasy Points", format: "number" },
    calcResults: [
      { key: "totalPoints", label: "Total Fantasy Points", format: "number", highlight: true },
      { key: "scoringPoints", label: "From Points Scored", format: "number" },
      { key: "shootingEfficiencyPoints", label: "Shooting Efficiency (ESPN)", format: "number" },
      { key: "stocksPoints", label: "Steals + Blocks", format: "number" },
    ],
    instructions: "Choose ESPN or Yahoo scoring and enter the box score. The shooting fields only count in ESPN scoring.",
    examples:
      "Example: 28 points, 8 rebounds, 6 assists, a steal, a block and 3 turnovers on 10-of-20 shooting with 3 threes and 5-of-6 free throws scores 52 ESPN points. The same line is 49.6 on Yahoo.",
    assumptions:
      "ESPN default: points 1, 3PM 1, FGM 2, FGA −1, FTM 1, FTA −1, rebounds 1, assists 2, steals 4, blocks 4, turnovers −2. " +
      "Yahoo default: points 1, rebounds 1.2, assists 1.5, steals 3, blocks 3, turnovers −1. " + DISCLAIMER,
    faq: [
      { question: "Why does ESPN subtract for missed shots?", answer: "ESPN counts field-goal and free-throw attempts as −1 and makes as +2 and +1, so efficient scorers gain and volume shooters on bad nights lose points." },
      { question: "Is NBA fantasy score the same thing?", answer: "Yes — it's the same box-score-to-points conversion. Daily fantasy and pick'em apps use their own weights, so check their rules for those." },
    ],
  },
  {
    slug: "fantasy-baseball-points-calculator",    title: "Fantasy Baseball Points Calculator",
    description: "Calculate fantasy baseball points for a hitter on ESPN, Yahoo or DraftKings scoring — singles to home runs, runs, RBIs, walks and steals.",
    metaTitle: "Fantasy Baseball Points Calculator — Hitters",
    metaDescription: "Free fantasy baseball points calculator for hitters. ESPN, Yahoo and DraftKings scoring for hits, runs, RBIs, walks and stolen bases.",
    calcInputs: [
      dropdown("platform", "Scoring System", [["ESPN Points League", 1], ["Yahoo Points League", 2], ["DraftKings (DFS)", 3]], 1),
      numberField("singles", "Singles", { default: 1, max: 10 }),
      numberField("doubles", "Doubles", { default: 1, max: 10 }),
      numberField("triples", "Triples", { default: 0, max: 5 }),
      numberField("homeRuns", "Home Runs", { default: 1, max: 6 }),
      numberField("runs", "Runs", { default: 2, max: 10 }),
      numberField("rbi", "RBIs", { default: 3, max: 15 }),
      numberField("walks", "Walks", { default: 1, max: 10 }),
      numberField("hitByPitch", "Hit by Pitch", { default: 0, max: 5, required: false }),
      numberField("stolenBases", "Stolen Bases", { default: 0, max: 10 }),
      numberField("strikeouts", "Strikeouts (ESPN)", { default: 1, max: 10, required: false }),
    ],
    calcResult: { label: "Fantasy Points", format: "number" },
    calcResults: [
      { key: "totalPoints", label: "Total Fantasy Points", format: "number", highlight: true },
      { key: "hittingPoints", label: "From Hits", format: "number" },
      { key: "otherPoints", label: "Runs, RBIs, Walks & Steals", format: "number" },
      { key: "totalBases", label: "Total Bases", format: "number" },
    ],
    instructions: "Pick the scoring system and enter the hitter's game (or season) stats.",
    examples:
      "Example: a single, a double, a home run, 2 runs, 3 RBIs, a walk and a strikeout is 12 ESPN points — 7 total bases plus 5 for runs, RBIs and the walk, minus 1 for the strikeout.",
    assumptions:
      "ESPN: 1 per total base, run, RBI, walk and stolen base, −1 per strikeout. Yahoo: single 2.6, double 5.2, triple 7.8, HR 10.4, run 1.9, RBI 1.9, walk 2.6, HBP 2.6, SB 4.2. DraftKings: single 3, double 5, triple 8, HR 10, run 2, RBI 2, walk 2, HBP 2, SB 5. For pitchers, use the MLB Pitcher Fantasy Score Calculator. " + DISCLAIMER,
    faq: [
      { question: "Why are the totals so different between sites?", answer: "Yahoo and DraftKings weight hits much more heavily than ESPN, so the same game scores two to three times more points there. Compare players only within one system." },
      { question: "Does ESPN count home runs separately?", answer: "Not by default — a home run counts through total bases (4), plus the run and RBI it produces." },
    ],
  },
  {
    slug: "mlb-pitcher-fantasy-score-calculator",    title: "MLB Pitcher Fantasy Score Calculator",
    description: "Calculate a pitcher's fantasy score on PrizePicks, DraftKings, Yahoo or ESPN scoring — outs, strikeouts, wins, quality starts and earned runs.",
    metaTitle: "MLB Pitcher Fantasy Score Calculator",
    metaDescription: "Free MLB pitcher fantasy score calculator. PrizePicks, DraftKings, Yahoo and ESPN scoring with outs, strikeouts, wins and quality starts.",
    calcInputs: [
      dropdown("platform", "Scoring System", [["ESPN Points League", 1], ["Yahoo Points League", 2], ["DraftKings (DFS)", 3], ["PrizePicks Pitcher Fantasy Score", 4]], 4),
      numberField("inningsFull", "Full Innings Pitched", { default: 6, max: 9 }),
      numberField("extraOuts", "Extra Outs (0, 1 or 2)", { default: 1, max: 2 }),
      numberField("strikeouts", "Strikeouts", { default: 8, max: 20 }),
      dropdown("win", "Pitcher Got the Win?", [["No", 0], ["Yes", 1]], 1),
      dropdown("loss", "Pitcher Took the Loss? (ESPN)", [["No", 0], ["Yes", 1]], 0),
      dropdown("save", "Save? (ESPN/Yahoo)", [["No", 0], ["Yes", 1]], 0),
      numberField("earnedRuns", "Earned Runs", { default: 2, max: 15 }),
      numberField("hitsAllowed", "Hits Allowed", { default: 5, max: 20 }),
      numberField("walks", "Walks Allowed", { default: 2, max: 15 }),
      numberField("hitBatters", "Hit Batters", { default: 0, max: 5, required: false }),
    ],
    calcResult: { label: "Fantasy Score", format: "number" },
    calcResults: [
      { key: "fantasyScore", label: "Pitcher Fantasy Score", format: "number", highlight: true },
      { key: "outsRecorded", label: "Outs Recorded", format: "number" },
      { key: "qualityStart", label: "Quality Start (1 = Yes)", format: "number" },
      { key: "strikeoutPoints", label: "Points from Strikeouts", format: "number" },
    ],
    instructions: "Enter innings as full innings plus extra outs (6.1 innings = 6 full innings and 1 extra out), then the rest of the pitching line, and pick the scoring system.",
    examples:
      "Example: 6.1 innings, 8 strikeouts, a win and 2 earned runs scores 47 on PrizePicks — 19 outs, 24 for strikeouts, 6 for the win and 4 for the quality start, minus 6 for the earned runs.",
    assumptions:
      "PrizePicks: 1 per out, 3 per strikeout, 6 per win, 4 per quality start (6+ innings, 3 or fewer earned runs), −3 per earned run. " +
      "DraftKings: 2.25 per inning, 2 per K, 4 per win, −2 per ER, −0.6 per hit, walk or hit batter. " +
      "Yahoo: 7.4 per inning, 3 per K, 4.3 per win, 5 per save, −3 per ER, −1.3 per hit, walk or hit batter. " +
      "ESPN: 3 per inning, 1 per K, 2 per win, −2 per loss, 5 per save, −2 per ER, −1 per hit and walk. Complete-game and no-hitter bonuses aren't included. " + DISCLAIMER,
    faq: [
      { question: "What is a quality start?", answer: "At least 6 innings pitched with 3 or fewer earned runs. PrizePicks adds 4 points for one." },
      { question: "How do I enter 5.2 innings?", answer: "5.2 means 5 full innings and 2 outs. Enter 5 in full innings and 2 in extra outs." },
    ],
  },
  {
    slug: "tennis-fantasy-score-calculator",    title: "Tennis Fantasy Score Calculator",
    description: "Calculate a tennis player's fantasy score from a match — games, sets, aces and double faults — on PrizePicks or DraftKings scoring.",
    metaTitle: "Tennis Fantasy Score Calculator",
    metaDescription: "Free tennis fantasy score calculator. PrizePicks and DraftKings scoring from games, sets, aces, double faults, breaks and bonuses.",
    calcInputs: [
      dropdown("platform", "Scoring System", [["PrizePicks Fantasy Score", 1], ["DraftKings Tennis (Classic)", 2]], 1),
      numberField("gamesWon", "Games Won", { default: 12, max: 60 }),
      numberField("gamesLost", "Games Lost", { default: 7, max: 60 }),
      numberField("setsWon", "Sets Won", { default: 2, max: 3 }),
      numberField("setsLost", "Sets Lost", { default: 0, max: 3 }),
      numberField("aces", "Aces", { default: 6, max: 60 }),
      numberField("doubleFaults", "Double Faults", { default: 2, max: 30 }),
      dropdown("bestOf", "Match Format (DraftKings)", [["Best of 3 sets", 3], ["Best of 5 sets", 5]], 3),
      numberField("breaks", "Breaks of Serve (DraftKings)", { default: 4, max: 20, required: false }),
      numberField("cleanSets", "Sets Won 6-0 (DraftKings)", { default: 0, max: 3, required: false }),
    ],
    calcResult: { label: "Fantasy Score", format: "number" },
    calcResults: [
      { key: "fantasyScore", label: "Tennis Fantasy Score", format: "number", highlight: true },
      { key: "gamesPoints", label: "Points from Games", format: "number" },
      { key: "setsPoints", label: "Points from Sets", format: "number" },
      { key: "bonusPoints", label: "Bonuses (DraftKings)", format: "number" },
    ],
    instructions: "Pick the scoring system, then enter the player's match stats. Breaks, clean sets and match format only count on DraftKings.",
    examples:
      "Example: winning 6-4, 6-3 (12 games won, 7 lost, 2 sets to 0) with 6 aces and 2 double faults scores 23 on PrizePicks. On DraftKings, with 4 breaks, the same match scores 73.4, including 6 for a straight-sets win.",
    assumptions:
      "PrizePicks: 10 for playing, +1 per game won, −1 per game lost, +3 per set won, −3 per set lost, +0.5 per ace, −0.5 per double fault. " +
      "DraftKings: 30 for playing, +2.5 per game won, −2 per game lost, +6 per set won, −3 per set lost, +6 for the match win, +0.4 per ace, −1 per double fault, +0.75 per break, +4 per 6-0 set, +6 straight-sets win (+5 in best of 5), +2.5 for no double faults, +2 for 10+ aces. " + DISCLAIMER,
    faq: [
      { question: "Why does the losing player still score points?", answer: "Every game and set won earns points, and both sites give points just for playing, so a close loss can still score well." },
      { question: "Do retirements count?", answer: "Rules differ — PrizePicks usually voids props for a player who doesn't finish. Check the app's rules for retirements and walkovers." },
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
