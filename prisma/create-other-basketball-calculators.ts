// One-time (but safe to re-run) batch setup script: creates the 15 tools of
// the other-sports sub-batch "Basketball". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-basketball.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-basketball-calculators.ts
// or
//   npm run db:create-other-basketball-calculators

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

const UNIT = () => dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1);
const SHOTS = () => [numberField("fgm", "Field Goals Made", { default: 9, max: 5000 }), numberField("fga", "Field Goals Attempted", { default: 18, min: 1, max: 10000 })];

const TOOLS: ToolDef[] = [
  {
    slug: "ape-index-calculator",
    title: "Ape Index Calculator",
    description: "Calculate your ape index (wingspan minus height) and wingspan-to-height ratio — or estimate your wingspan from your height (also a wingspan calculator).",
    metaTitle: "Ape Index Calculator — Wingspan vs Height",
    metaDescription: "Free ape index calculator. Get wingspan minus height, the wingspan ratio and an estimated wingspan, compared with NBA players.",
    calcInputs: [UNIT(), numberField("height", "Height", { default: 75, min: 20, max: 260, step: 0.25 }), numberField("wingspan", "Wingspan (fingertip to fingertip; 0 = estimate)", { default: 79, max: 300, step: 0.25, required: false })],
    calcResult: { label: "Ape Index", format: "number" },
    calcResults: [num("apeIndex", "Ape Index (wingspan − height)", true), num("ratio", "Wingspan ÷ Height", false, 3), num("wingspan", "Wingspan Used"), num("nbaTypicalWingspan", "Typical NBA Wingspan at Your Height")],
    instructions: "Stand against a wall with arms straight out to the sides and measure fingertip to fingertip. Enter that and your height (no shoes). Leave wingspan at 0 to estimate it.",
    examples: "Example: 6'3\" (75\") with a 79\" wingspan → ape index +4\" (ratio 1.053). The average NBA player's wingspan is about 6% longer than his height (79.5\" here).",
    assumptions: "Ape index = wingspan − height; ratio = wingspan ÷ height. Most people are close to 1.00; NBA players average about 1.06. Without a measurement the wingspan is estimated as equal to height. Positive ape index helps in basketball, climbing, swimming and boxing. " + DISCLAIMER,
    faq: [
      { question: "What is a good ape index?", answer: "Anything positive is useful in reach sports; +4\" or more is considered long." },
      { question: "Who has the biggest ape index in the NBA?", answer: "Players like Rudy Gobert and Mo Bamba have wingspans 10\"+ longer than their height." },
    ],
  },
  {
    slug: "standing-reach-calculator",
    title: "Standing Reach Calculator",
    description: "Estimate your standing reach from height and wingspan — and how high you need to jump to touch the rim or dunk.",
    metaTitle: "Standing Reach Calculator — Rim & Dunk Jump",
    metaDescription: "Free standing reach calculator. Estimate standing reach from height and wingspan and the vertical needed to touch the rim or dunk.",
    calcInputs: [UNIT(), numberField("height", "Height (no shoes)", { default: 72, min: 20, max: 260, step: 0.25 }), numberField("wingspan", "Wingspan (optional)", { default: 74, max: 300, step: 0.25, required: false })],
    calcResult: { label: "Standing Reach", format: "number" },
    calcResults: [num("standingReach", "Standing Reach (your unit)", true), num("standingReachFeet", "Standing Reach (feet)"), num("jumpToTouchRim", "Vertical Needed to Touch the Rim"), num("jumpToDunk", "Vertical Needed to Dunk")],
    instructions: "Enter your height and, if you know it, your wingspan. For an exact number, reach one arm straight up beside a wall and measure to your fingertips.",
    examples: "Example: 6'0\" with a 74\" wingspan → standing reach about 94.8\" (7.9 ft). You'd need a 25\" vertical to touch the 10-ft rim and about 31\" to dunk.",
    assumptions: "Reach ≈ 1.3 × height + 0.6 × (wingspan − height), or 1.32 × height without wingspan (fitted to NBA combine data). Rim = 10 ft (120\"); dunking needs roughly 6\" above the rim. " + DISCLAIMER,
    faq: [
      { question: "What is an average standing reach?", answer: "About 1.3 times your height — around 7'9\"–8'0\" for a 6-foot man." },
      { question: "How high do I need to jump to dunk?", answer: "Typically your reach plus 6\" must clear 10 feet." },
    ],
  },
  {
    slug: "true-shooting-percentage-calculator",
    title: "True Shooting Percentage Calculator",
    description: "Calculate true shooting percentage (TS%) — scoring efficiency including 2s, 3s and free throws.",
    metaTitle: "True Shooting Percentage Calculator — TS%",
    metaDescription: "Free true shooting percentage calculator. Get TS% from points, field goal attempts and free throw attempts.",
    calcInputs: [numberField("points", "Points", { default: 25, max: 10000 }), numberField("fga", "Field Goal Attempts", { default: 18, max: 10000 }), numberField("fta", "Free Throw Attempts", { default: 6, max: 5000 })],
    calcResult: { label: "TS%", format: "percentage" },
    calcResults: [pct("trueShootingPct", "True Shooting %", true), num("trueShootingAttempts", "True Shooting Attempts"), num("pointsPerShot", "Points per Shooting Possession")],
    instructions: "Enter points, field goal attempts and free throw attempts for a game or season.",
    examples: "Example: 25 points on 18 shots and 6 free throws → TS% = 25 ÷ (2 × (18 + 0.44 × 6)) = 60.6%.",
    assumptions: "TS% = PTS ÷ (2 × (FGA + 0.44 × FTA)). The 0.44 factor converts free throw trips into shooting possessions (and-ones, technicals and 3-shot fouls). NBA average is about 57–58%. " + DISCLAIMER,
    faq: [
      { question: "What is a good true shooting percentage?", answer: "60%+ is very efficient in the NBA; 55% is around average for high-volume scorers." },
      { question: "TS% or eFG%?", answer: "TS% includes free throws, so it's the fuller measure of scoring efficiency." },
    ],
  },
  {
    slug: "effective-field-goal-percentage-calculator",
    title: "Effective Field Goal Percentage Calculator",
    description: "Calculate effective field goal percentage (eFG%) — field goal % adjusted for the extra value of three-pointers.",
    metaTitle: "Effective Field Goal Percentage Calculator — eFG%",
    metaDescription: "Free eFG% calculator. Get effective field goal percentage from makes, attempts and three-pointers made.",
    calcInputs: [...SHOTS(), numberField("threesMade", "Three-Pointers Made", { default: 3, max: 3000 })],
    calcResult: { label: "eFG%", format: "percentage" },
    calcResults: [pct("effectiveFgPct", "Effective FG %", true), pct("fieldGoalPct", "Plain FG %"), pct("boostFromThrees", "Boost from Threes")],
    instructions: "Enter field goals made and attempted and how many of the makes were threes.",
    examples: "Example: 9 of 18 with 3 threes → eFG% = (9 + 0.5 × 3) ÷ 18 = 58.3%, versus a plain 50% FG%.",
    assumptions: "eFG% = (FGM + 0.5 × 3PM) ÷ FGA — one of Dean Oliver's Four Factors. It ignores free throws (use TS% for that). " + DISCLAIMER,
    faq: [
      { question: "Why is a three worth 1.5 makes?", answer: "It scores 3 points instead of 2 — 50% more." },
      { question: "What is a good eFG%?", answer: "Around 54–55% is NBA average; 60%+ is elite." },
    ],
  },
  {
    slug: "field-goal-percentage-calculator",
    title: "Field Goal Percentage Calculator",
    description: "Calculate basketball field goal percentage (FG%), plus two-point and three-point percentages.",
    metaTitle: "Field Goal Percentage Calculator — FG%, 2P%, 3P%",
    metaDescription: "Free field goal percentage calculator. Get FG%, 2-point % and 3-point % from makes and attempts.",
    calcInputs: [...SHOTS(), numberField("threesMade", "Three-Pointers Made", { default: 3, max: 3000, required: false }), numberField("threesAttempted", "Three-Pointers Attempted", { default: 8, max: 6000, required: false })],
    calcResult: { label: "FG%", format: "percentage" },
    calcResults: [pct("fieldGoalPct", "Field Goal %", true), pct("twoPointPct", "Two-Point %"), pct("threePointPct", "Three-Point %"), num("misses", "Missed Shots")],
    instructions: "Enter made and attempted field goals; add three-pointers to split 2P% and 3P%.",
    examples: "Example: 9 of 18 overall (50%), including 3 of 8 from three (37.5%) → 6 of 10 on twos (60%).",
    assumptions: "FG% = FGM ÷ FGA; 2P% = (FGM − 3PM) ÷ (FGA − 3PA); 3P% = 3PM ÷ 3PA. Free throws aren't field goals — see the Free Throw Percentage Calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good field goal percentage?", answer: "Around 47% is NBA average; big men who shoot near the rim often top 60%." },
      { question: "Is a basketball field goal the same as a football field goal?", answer: "No — in basketball it's any shot other than a free throw. For kicking, see the Field Goal Calculator." },
    ],
  },
  {
    slug: "free-throw-percentage-calculator",
    title: "Free Throw Percentage Calculator",
    description: "Calculate free throw percentage and how many straight makes you need to reach a target percentage.",
    metaTitle: "Free Throw Percentage Calculator — FT%",
    metaDescription: "Free free throw percentage calculator. Get FT% and the consecutive makes needed to reach your target.",
    calcInputs: [numberField("ftm", "Free Throws Made", { default: 40, max: 5000 }), numberField("fta", "Free Throws Attempted", { default: 50, min: 1, max: 5000 }), percentField("targetPct", "Target FT %", { default: 85, max: 99.9, step: 0.5 })],
    calcResult: { label: "FT%", format: "percentage" },
    calcResults: [pct("freeThrowPct", "Free Throw %", true), num("misses", "Misses"), num("straightMakesForTarget", "Straight Makes Needed for Target")],
    instructions: "Enter made and attempted free throws and a target percentage.",
    examples: "Example: 40 of 50 is 80%. To reach 85% you'd need 17 makes in a row (57 of 67).",
    assumptions: "FT% = FTM ÷ FTA. Straight makes x solve (FTM + x) ÷ (FTA + x) ≥ target. NBA average is about 78%. " + DISCLAIMER,
    faq: [
      { question: "What is a good free throw percentage?", answer: "80%+ is good; elite shooters make 90%." },
      { question: "How can I improve my free throws?", answer: "A consistent routine and lots of game-like reps — shoot when tired, not just fresh." },
    ],
  },
  {
    slug: "points-per-game-calculator",
    title: "Points per Game Calculator",
    description: "Calculate points per game (PPG) and the points you need in your next games to reach a target scoring average.",
    metaTitle: "Points per Game Calculator — PPG",
    metaDescription: "Free points per game calculator. Get PPG and the points needed over your next games to reach a target average.",
    calcInputs: [numberField("points", "Total Points", { default: 450, max: 100000 }), numberField("games", "Games Played", { default: 20, min: 1, max: 2000 }), numberField("targetPpg", "Target PPG", { default: 25, max: 100, step: 0.1 }), numberField("nextGames", "Next Games", { default: 5, max: 200 })],
    calcResult: { label: "PPG", format: "number" },
    calcResults: [num("pointsPerGame", "Points per Game", true), num("pointsNeededTotal", "Points Needed in Next Games"), num("pointsNeededPerGame", "Points per Game Needed")],
    instructions: "Enter total points and games played, plus a target average and how many games are left to get there.",
    examples: "Example: 450 points in 20 games = 22.5 PPG. To average 25 after 5 more games you need 175 points — 35 a game.",
    assumptions: "PPG = points ÷ games. Points needed = target × (games + next games) − points so far. Works for any sport that keeps a per-game average. " + DISCLAIMER,
    faq: [
      { question: "Does PPG count games I didn't play?", answer: "No — it's points per game played." },
      { question: "What is the NBA's highest season PPG?", answer: "Wilt Chamberlain's 50.4 in 1961–62." },
    ],
  },
  {
    slug: "game-score-calculator",
    title: "Game Score Calculator",
    description: "Calculate John Hollinger's Game Score — a one-number rating of a player's basketball box score.",
    metaTitle: "Game Score Calculator — Basketball GmSc",
    metaDescription: "Free basketball Game Score calculator. Rate a box score with Hollinger's GmSc formula (10 average, 40 outstanding).",
    calcInputs: [numberField("pts", "Points", { default: 25, max: 150 }), numberField("fgm", "FG Made", { default: 9, max: 50 }), numberField("fga", "FG Attempted", { default: 18, max: 80 }), numberField("ftm", "FT Made", { default: 5, max: 40 }), numberField("fta", "FT Attempted", { default: 6, max: 40 }), numberField("orb", "Offensive Rebounds", { default: 2, max: 30 }), numberField("drb", "Defensive Rebounds", { default: 6, max: 40 }), numberField("ast", "Assists", { default: 5, max: 40 }), numberField("stl", "Steals", { default: 1, max: 20 }), numberField("blk", "Blocks", { default: 1, max: 20 }), numberField("tov", "Turnovers", { default: 3, max: 20 }), numberField("pf", "Personal Fouls", { default: 2, max: 6 })],
    calcResult: { label: "Game Score", format: "number" },
    calcResults: [num("gameScore", "Game Score", true), num("rating", "Level (1 Poor, 2 Average, 3 Good, 4 Great, 5 Outstanding)")],
    instructions: "Enter the player's box score for one game.",
    examples: "Example: 25 points on 9-18 shooting, 5-6 FT, 2 OREB, 6 DREB, 5 AST, 1 STL, 1 BLK, 3 TO, 2 PF → Game Score 20.2 (a good game).",
    assumptions: "GmSc = PTS + 0.4 FG − 0.7 FGA − 0.4 (FTA − FT) + 0.7 ORB + 0.3 DRB + STL + 0.7 AST + 0.7 BLK − 0.4 PF − TOV. Scale: 10 is average, 40 is outstanding. " + DISCLAIMER,
    faq: [
      { question: "What is the highest Game Score ever?", answer: "Kobe Bryant's 81-point game scored about 63.5." },
      { question: "How is Game Score related to PER?", answer: "Hollinger built it as a single-game cousin of PER." },
    ],
  },
  {
    slug: "player-efficiency-rating-calculator",
    title: "Player Efficiency Rating Calculator",
    description: "Calculate a basketball player's PER (Player Efficiency Rating), where 15 is league average, from per-game or season stats.",
    metaTitle: "Player Efficiency Rating Calculator — PER",
    metaDescription: "Free PER calculator. Estimate Hollinger's Player Efficiency Rating (league average 15) from a player's box-score stats.",
    calcInputs: [numberField("minutes", "Minutes", { default: 34, min: 1, max: 4000, step: 0.1 }), numberField("fgm", "FG Made", { default: 9, max: 1500, step: 0.1 }), numberField("fga", "FG Attempted", { default: 18, max: 3000, step: 0.1 }), numberField("threesMade", "3-Pointers Made", { default: 2, max: 500, step: 0.1 }), numberField("ftm", "FT Made", { default: 5, max: 1000, step: 0.1 }), numberField("fta", "FT Attempted", { default: 6, max: 1200, step: 0.1 }), numberField("orb", "Offensive Rebounds", { default: 2, max: 500, step: 0.1 }), numberField("trb", "Total Rebounds", { default: 8, max: 1500, step: 0.1 }), numberField("ast", "Assists", { default: 5, max: 1200, step: 0.1 }), numberField("stl", "Steals", { default: 1, max: 300, step: 0.1 }), numberField("blk", "Blocks", { default: 1, max: 400, step: 0.1 }), numberField("tov", "Turnovers", { default: 3, max: 500, step: 0.1 }), numberField("pf", "Personal Fouls", { default: 2, max: 400, step: 0.1 })],
    calcResult: { label: "PER", format: "number" },
    calcResults: [num("per", "Player Efficiency Rating", true), num("unadjustedPer", "Unadjusted PER (per minute)", false, 4)],
    instructions: "Enter per-game averages (or season totals) — minutes and box-score stats in the same basis.",
    examples: "Example: 34 minutes with 25 points (9-18, 2 threes, 5-6 FT), 8 rebounds (2 offensive), 5 assists, 1 steal, 1 block, 3 turnovers and 2 fouls → PER about 22.7.",
    assumptions: "Hollinger's uPER formula with constants from typical recent NBA league averages (pace not adjusted), scaled so a league-average team = 15. Basketball-Reference uses each season's exact league and team numbers, so results differ slightly. " + DISCLAIMER,
    faq: [
      { question: "What is a good PER?", answer: "15 is average, 20+ is All-Star level and 25+ is MVP territory." },
      { question: "What doesn't PER capture?", answer: "Most defence beyond steals and blocks — it favours high-usage scorers." },
    ],
  },
  {
    slug: "nba-luxury-tax-calculator",
    title: "NBA Luxury Tax Calculator",
    description: "Calculate an NBA team's luxury tax bill from payroll — tiered rates, repeater tax and the first and second aprons.",
    metaTitle: "NBA Luxury Tax Calculator — Tax Bill & Aprons",
    metaDescription: "Free NBA luxury tax calculator. Get the tax bill from payroll with tiered and repeater rates and first/second apron status.",
    calcInputs: [numberField("payroll", "Team Salary ($M)", { default: 200, max: 500, step: 0.1 }), numberField("taxLine", "Tax Line ($M — 2025-26: 187.895)", { default: 187.895, max: 500, step: 0.001 }), numberField("firstApron", "First Apron ($M — 2025-26: 195.945)", { default: 195.945, max: 500, step: 0.001 }), numberField("secondApron", "Second Apron ($M — 2025-26: 207.824)", { default: 207.824, max: 500, step: 0.001 }), dropdown("repeater", "Repeater Taxpayer?", [["No", 1], ["Yes (taxed 3 of the last 4 years)", 2]], 1)],
    calcResult: { label: "Tax Bill ($M)", format: "number" },
    calcResults: [num("taxBill", "Luxury Tax Bill ($M)", true), num("amountOverTax", "Amount over the Tax Line ($M)"), num("totalCost", "Salary + Tax ($M)"), num("overFirstApron", "Over First Apron (1 = yes)"), num("overSecondApron", "Over Second Apron (1 = yes)")],
    instructions: "Enter team salary and the season's tax line and aprons (update them each year), and whether the team is a repeat taxpayer.",
    examples: "Example: $200M payroll is $12.1M over a $187.9M tax line: $5M × 1.5 + $5M × 1.75 + $2.1M × 2.5 = $21.5M in tax — $221.5M all in, and over the first apron.",
    assumptions: "2023 CBA rates per $5M over the line: 1.50, 1.75, 2.50, 3.25, then +0.50 per extra band; repeaters pay 2.50, 2.75, 3.50, 4.25, then +0.50. Default thresholds are 2025-26 figures. Aprons restrict trades and signings rather than adding tax. " + DISCLAIMER,
    faq: [
      { question: "Who is a repeater taxpayer?", answer: "A team that paid tax in at least three of the previous four seasons." },
      { question: "Where does luxury tax money go?", answer: "Mostly to non-taxpaying teams." },
    ],
  },
  {
    slug: "turnover-percentage-calculator",
    title: "Turnover Percentage Calculator",
    description: "Calculate basketball turnover percentage (TOV%) — turnovers per 100 plays used by a player or team.",
    metaTitle: "Turnover Percentage Calculator — TOV%",
    metaDescription: "Free turnover percentage calculator. Get TOV% from turnovers, field goal attempts and free throw attempts.",
    calcInputs: [numberField("tov", "Turnovers", { default: 3, max: 5000 }), numberField("fga", "Field Goal Attempts", { default: 18, max: 10000 }), numberField("fta", "Free Throw Attempts", { default: 6, max: 5000 })],
    calcResult: { label: "TOV%", format: "percentage" },
    calcResults: [pct("turnoverPct", "Turnover %", true), num("playsUsed", "Plays Used")],
    instructions: "Enter turnovers, field goal attempts and free throw attempts for a player or team.",
    examples: "Example: 3 turnovers with 18 FGA and 6 FTA → 3 ÷ (18 + 0.44 × 6 + 3) = 12.7%.",
    assumptions: "TOV% = TOV ÷ (FGA + 0.44 × FTA + TOV) × 100 — one of Dean Oliver's Four Factors. Team average is about 12–13%. " + DISCLAIMER,
    faq: [
      { question: "What is a good turnover percentage?", answer: "Under 10% is excellent for a guard; 15%+ is high." },
      { question: "Why not just turnovers per game?", answer: "Players who handle the ball more will have more turnovers — TOV% adjusts for usage." },
    ],
  },
  {
    slug: "assist-to-turnover-ratio-calculator",
    title: "Assist to Turnover Ratio Calculator",
    description: "Calculate assist-to-turnover ratio (AST/TO) and per-game assists and turnovers for a point guard or team.",
    metaTitle: "Assist to Turnover Ratio Calculator — AST/TO",
    metaDescription: "Free assist to turnover ratio calculator. Get AST/TO, assists per game and turnovers per game.",
    calcInputs: [numberField("assists", "Assists", { default: 120, max: 20000 }), numberField("turnovers", "Turnovers", { default: 50, max: 20000 }), numberField("games", "Games", { default: 20, min: 1, max: 2000 })],
    calcResult: { label: "AST/TO", format: "number" },
    calcResults: [num("assistToTurnoverRatio", "Assist-to-Turnover Ratio", true), num("assistsPerGame", "Assists per Game"), num("turnoversPerGame", "Turnovers per Game"), num("rating", "Level (1 Below 2, 2 Good 2–3, 3 Elite 3+)")],
    instructions: "Enter total assists, turnovers and games.",
    examples: "Example: 120 assists and 50 turnovers in 20 games → 2.4 AST/TO (6.0 assists, 2.5 turnovers a game).",
    assumptions: "AST/TO = assists ÷ turnovers. 2.0 is good for a point guard, 3.0+ elite. " + DISCLAIMER,
    faq: [
      { question: "What is a good assist-to-turnover ratio?", answer: "About 2:1 for guards; elite playmakers reach 3:1 or better." },
      { question: "Is AST/TO used in other sports?", answer: "Yes — volleyball setters, hockey and lacrosse track similar ratios." },
    ],
  },
  {
    slug: "per-36-calculator",
    title: "Per 36 Calculator",
    description: "Convert basketball stats to per-36-minute (or per-48) rates to compare starters and bench players fairly.",
    metaTitle: "Per 36 Calculator — Per-36 Minute Stats",
    metaDescription: "Free per 36 calculator. Convert points, rebounds, assists, steals and blocks to per-36 or per-48-minute averages.",
    calcInputs: [dropdown("basis", "Per", [["36 minutes", 36], ["48 minutes", 48]], 36), numberField("minutes", "Minutes Played", { default: 24, min: 1, max: 4000, step: 0.1 }), numberField("points", "Points", { default: 14, max: 4000, step: 0.1 }), numberField("rebounds", "Rebounds", { default: 6, max: 2000, step: 0.1 }), numberField("assists", "Assists", { default: 3, max: 1500, step: 0.1 }), numberField("steals", "Steals", { default: 1, max: 300, step: 0.1, required: false }), numberField("blocks", "Blocks", { default: 0.5, max: 400, step: 0.1, required: false })],
    calcResult: { label: "Points per 36", format: "number" },
    calcResults: [num("pointsPer", "Points", true), num("reboundsPer", "Rebounds"), num("assistsPer", "Assists"), num("stealsPer", "Steals"), num("blocksPer", "Blocks")],
    instructions: "Enter minutes and stats on the same basis (per game or totals).",
    examples: "Example: 14 points, 6 rebounds and 3 assists in 24 minutes → 21.0 points, 9.0 rebounds and 4.5 assists per 36.",
    assumptions: "Per-36 stat = stat ÷ minutes × 36. It assumes production stays the same with more minutes, which often isn't true (fatigue, tougher matchups). " + DISCLAIMER,
    faq: [
      { question: "Why 36 minutes?", answer: "It's roughly a starter's workload, making bench and starter numbers comparable." },
      { question: "Per 36 or per 100 possessions?", answer: "Per 100 also adjusts for team pace; per 36 is simpler and more common." },
    ],
  },
  {
    slug: "rpi-calculator",
    title: "RPI Calculator",
    description: "Calculate a team's Rating Percentage Index (RPI) from its winning percentage, opponents' and opponents' opponents' records — with home/road weighting.",
    metaTitle: "RPI Calculator — Rating Percentage Index",
    metaDescription: "Free RPI calculator. Get RPI = 25% WP + 50% OWP + 25% OOWP, with NCAA basketball home/road win weighting.",
    calcInputs: [dropdown("method", "Winning % From", [["Enter winning %", 1], ["Home / neutral / road record (weighted)", 2]], 1), percentField("winPct", "Winning %", { default: 70 }), numberField("homeWins", "Home Wins", { default: 10, max: 50 }), numberField("neutralWins", "Neutral Wins", { default: 2, max: 50 }), numberField("roadWins", "Road Wins", { default: 6, max: 50 }), numberField("homeLosses", "Home Losses", { default: 2, max: 50 }), numberField("neutralLosses", "Neutral Losses", { default: 1, max: 50 }), numberField("roadLosses", "Road Losses", { default: 5, max: 50 }), percentField("oppWinPct", "Opponents' Winning % (OWP)", { default: 55 }), percentField("oppOppWinPct", "Opponents' Opponents' Winning % (OOWP)", { default: 52 })],
    calcResult: { label: "RPI", format: "number" },
    calcResults: [num("rpi", "RPI", true, 4), pct("weightedWinPct", "Winning % Used"), num("strengthOfSchedule", "Strength of Schedule", false, 4)],
    instructions: "Enter the team's winning percentage (or its home, neutral and road record) and the opponents' and opponents' opponents' winning percentages.",
    examples: "Example: 70% WP, 55% OWP, 52% OOWP → RPI = 0.25 × 0.70 + 0.50 × 0.55 + 0.25 × 0.52 = 0.5800.",
    assumptions: "RPI = 0.25 × WP + 0.50 × OWP + 0.25 × OOWP. NCAA basketball weighting counts home wins 0.6, road wins 1.4 (losses the reverse). NCAA basketball replaced RPI with the NET in 2018, but RPI is still used in baseball, softball, volleyball and many high-school associations. " + DISCLAIMER,
    faq: [
      { question: "What is a good RPI?", answer: "About 0.600+ is typically top-25 level in college sports." },
      { question: "Why is OWP weighted 50%?", answer: "To reward a tough schedule as much as the team's own record." },
    ],
  },
  {
    slug: "nba-playoff-calculator",
    title: "NBA Playoff Calculator",
    description: "Estimate an NBA team's chances of a top-6 playoff spot and of making the play-in from its record and remaining 82-game schedule.",
    metaTitle: "NBA Playoff Calculator — Playoff & Play-In Odds",
    metaDescription: "Free NBA playoff calculator. See the chance of reaching playoff and play-in win totals from your record and win rate.",
    calcInputs: [numberField("wins", "Wins", { default: 25, max: 82 }), numberField("losses", "Losses", { default: 20, max: 82 }), percentField("winPct", "Chance of Winning Each Remaining Game", { default: 55 }), numberField("playoffWins", "Wins Needed for a Top-6 Seed", { default: 45, max: 82 }), numberField("playInWins", "Wins Needed for the Play-In (7–10)", { default: 38, max: 82 })],
    calcResult: { label: "Top-6 Chance", format: "percentage" },
    calcResults: [pct("top6ChancePct", "Chance of a Top-6 Seed", true), pct("playInChancePct", "Chance of at Least the Play-In"), num("gamesLeft", "Games Left"), num("projectedWins", "Projected Wins"), num("winsNeededTop6", "Wins Needed for Top 6")],
    instructions: "Enter the current record, a per-game win chance for the rest of the season and the win totals you think it takes in your conference.",
    examples: "Example: 25–20 with 37 games left at 55% → 45 projected wins: about a 61% chance of 45 wins (top 6) and 99.5% of 38 (play-in).",
    assumptions: "Binomial model over the remaining games of an 82-game season. Typical thresholds: about 44–48 wins for a top-6 seed, 36–40 for the play-in — they vary by conference and year. " + DISCLAIMER,
    faq: [
      { question: "How many teams make the NBA playoffs?", answer: "16 — the top 6 in each conference directly, plus 2 per conference through the 7–10 play-in." },
      { question: "How many wins does it take to make the play-in?", answer: "Usually mid-to-high 30s." },
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
