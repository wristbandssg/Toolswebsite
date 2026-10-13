// One-time (but safe to re-run) batch setup script: creates the 14 tools of
// the other-sports sub-batch "American Football". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-football.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-football-calculators.ts
// or
//   npm run db:create-other-football-calculators

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

const PASSING = () => [numberField("completions", "Completions", { default: 20, max: 1000 }), numberField("attempts", "Attempts", { default: 30, min: 1, max: 1500 }), numberField("yards", "Passing Yards", { default: 250, min: -100, max: 6000 }), numberField("touchdowns", "Touchdown Passes", { default: 2, max: 70 }), numberField("interceptions", "Interceptions", { default: 1, max: 50 })];

const TOOLS: ToolDef[] = [
  {
    slug: "quarterback-rating-calculator",
    title: "Quarterback Rating Calculator",
    description: "Calculate NFL passer rating (the 0–158.3 quarterback rating) from completions, attempts, yards, touchdowns and interceptions — also a QBR calculator.",
    metaTitle: "Quarterback Rating Calculator — NFL Passer Rating",
    metaDescription: "Free quarterback rating calculator. Get NFL passer rating (0–158.3) from completions, attempts, yards, TDs and interceptions.",
    calcInputs: PASSING(),
    calcResult: { label: "Passer Rating", format: "number" },
    calcResults: [num("passerRating", "Passer Rating", true), pct("completionPct", "Completion %"), num("yardsPerAttempt", "Yards per Attempt"), pct("touchdownPct", "Touchdown %"), pct("interceptionPct", "Interception %")],
    instructions: "Enter the quarterback's passing line for a game or season.",
    examples: "Example: 20 of 30 for 250 yards, 2 TDs and 1 interception → a passer rating of 100.7.",
    assumptions: "NFL formula: four parts — (Cmp/Att − 0.3) × 5, (Yds/Att − 3) × 0.25, TD/Att × 20, 2.375 − Int/Att × 25 — each capped between 0 and 2.375, summed, ÷ 6 × 100. Perfect = 158.3. ESPN's Total QBR is a different, proprietary 0–100 metric that also counts runs, sacks and game context. " + DISCLAIMER,
    faq: [
      { question: "What is a good passer rating?", answer: "Around 90 is average in today's NFL; 100+ is very good." },
      { question: "Is QBR the same as passer rating?", answer: "No. Passer rating uses only passing stats; ESPN's QBR is a 0–100 model of every play's value. Most people searching for a QBR calculator want passer rating." },
    ],
  },
  {
    slug: "college-passer-rating-calculator",
    title: "College Passer Rating Calculator",
    description: "Calculate NCAA passing efficiency (college passer rating) from completions, attempts, yards, touchdowns and interceptions.",
    metaTitle: "College Passer Rating Calculator — NCAA Efficiency",
    metaDescription: "Free college passer rating calculator. Get NCAA passing efficiency from completions, attempts, yards, TDs and interceptions.",
    calcInputs: PASSING(),
    calcResult: { label: "College Passer Rating", format: "number" },
    calcResults: [num("collegeRating", "NCAA Passer Rating", true), pct("completionPct", "Completion %"), num("yardsPerAttempt", "Yards per Attempt")],
    instructions: "Enter the passing line — the NCAA formula is also used in high school.",
    examples: "Example: 20 of 30, 250 yards, 2 TDs, 1 interception → (8.4 × 250 + 330 × 2 + 100 × 20 − 200 × 1) ÷ 30 = 152.0.",
    assumptions: "NCAA passing efficiency = (8.4 × yards + 330 × TD + 100 × completions − 200 × INT) ÷ attempts. No upper cap; it runs from −731.6 to 1,261.6. Average FBS is around 140. " + DISCLAIMER,
    faq: [
      { question: "Why is college passer rating higher than NFL rating?", answer: "It's a different scale with no cap — a 150 college rating isn't comparable to a 150 NFL rating." },
      { question: "What's a good college passer rating?", answer: "160+ is excellent; elite seasons reach 190–200." },
    ],
  },
  {
    slug: "completion-percentage-calculator",
    title: "Completion Percentage Calculator",
    description: "Calculate a quarterback's completion percentage and how many completions are needed to reach a target percentage.",
    metaTitle: "Completion Percentage Calculator — QB Completion %",
    metaDescription: "Free completion percentage calculator. Get completion % and the completions needed in your next attempts to hit a target.",
    calcInputs: [numberField("completions", "Completions", { default: 20, max: 1000 }), numberField("attempts", "Attempts", { default: 30, min: 1, max: 1500 }), percentField("targetPct", "Target Completion %", { default: 70 }), numberField("nextAttempts", "Upcoming Attempts", { default: 10, max: 1000, required: false })],
    calcResult: { label: "Completion %", format: "percentage" },
    calcResults: [pct("completionPct", "Completion Percentage", true), num("incompletions", "Incompletions"), num("completionsNeeded", "Completions Needed for Target"), num("possible", "Possible in Upcoming Attempts (1 = yes)")],
    instructions: "Enter completions and attempts, plus a target percentage and how many more passes you expect to throw.",
    examples: "Example: 20 of 30 is 66.7%. To reach 70% after 10 more attempts (40 total) the QB needs 8 more completions.",
    assumptions: "Completion % = completions ÷ attempts × 100. Completions needed = target × (attempts + upcoming) − current completions, rounded up. " + DISCLAIMER,
    faq: [
      { question: "What is a good completion percentage?", answer: "In the NFL about 65% is average; 70%+ is excellent." },
      { question: "Do spikes count as attempts?", answer: "Yes — spikes count as incomplete passes." },
    ],
  },
  {
    slug: "epa-calculator",
    title: "EPA Calculator",
    description: "Calculate expected points added (EPA) for a football play from down, distance and field position before and after the snap.",
    metaTitle: "EPA Calculator — Expected Points Added (Football)",
    metaDescription: "Free EPA calculator. Estimate expected points before and after a play and the expected points added by down, distance and yard line.",
    calcInputs: [dropdown("down", "Down (Before)", [["1st", 1], ["2nd", 2], ["3rd", 3], ["4th", 4]], 1), numberField("toGo", "Yards to Go (Before)", { default: 10, min: 1, max: 99 }), numberField("yardline", "Yards from Opponent's End Zone (Before)", { default: 75, min: 1, max: 99 }), dropdown("outcome", "Play Result", [["New down & distance", 1], ["Touchdown", 2], ["Field goal made", 3], ["Turnover / turnover on downs", 4], ["Safety", 5]], 1), dropdown("endDown", "Down (After)", [["1st", 1], ["2nd", 2], ["3rd", 3], ["4th", 4]], 1), numberField("endToGo", "Yards to Go (After)", { default: 10, min: 1, max: 99 }), numberField("endYardline", "Yards from Opponent's End Zone (After)", { default: 63, min: 1, max: 99 })],
    calcResult: { label: "EPA", format: "number" },
    calcResults: [num("epa", "Expected Points Added", true), num("epBefore", "Expected Points Before"), num("epAfter", "Expected Points After")],
    instructions: "Enter the situation before the snap and what happened. Field position is yards from the opponent's goal line (your own 25 = 75). For a turnover, enter where the opponent takes over in 'yards from opponent's end zone (after)' from your point of view.",
    examples: "Example: 1st & 10 at your own 25 (EP 0.24), a 12-yard gain to a new 1st & 10 at your 37 (EP about 1.05) → EPA ≈ +0.81.",
    assumptions: "First-and-10 expected points from the Carter & Machol table (−1.2 near your goal to 6.0 near theirs), interpolated, with approximate down-and-distance penalties. Touchdown = 6.95 (with PAT), field goal = 3, safety = −2, turnover = −(opponent's first-down EP). Public models such as nflfastR use far richer inputs; treat this as an estimate. " + DISCLAIMER,
    faq: [
      { question: "What is a good EPA per play?", answer: "Top NFL offenses average about +0.15 to +0.25 EPA per play; 0 is average." },
      { question: "Why can a positive gain have negative EPA?", answer: "A 3-yard gain on 3rd and 8 still leaves 4th down — field position improved but the drive got worse." },
    ],
  },
  {
    slug: "field-goal-calculator",
    title: "Field Goal Calculator",
    description: "Turn line of scrimmage into field goal distance and estimate the chance of making the kick in the NFL, college or high school.",
    metaTitle: "Field Goal Calculator — Kick Distance & Make %",
    metaDescription: "Free field goal calculator. Convert line of scrimmage to field goal distance (+17) and estimate make probability by level.",
    calcInputs: [numberField("lineOfScrimmage", "Line of Scrimmage (yards from opponent's goal line)", { default: 30, min: 1, max: 60 }), dropdown("level", "Level", [["NFL", 1], ["College", 2], ["High school", 3]], 1)],
    calcResult: { label: "Kick Distance", format: "number" },
    calcResults: [num("kickDistance", "Field Goal Distance (yd)", true), pct("makeProbabilityPct", "Estimated Make Probability"), num("expectedPoints", "Expected Points")],
    instructions: "Enter where the ball is spotted (e.g. the opponent's 30 = 30) and the level of play.",
    examples: "Example: from the opponent's 30, the kick is 47 yards (30 + 10 end zone + 7 snap). An NFL kicker makes about 80% from there — 2.4 expected points.",
    assumptions: "Distance = line of scrimmage + 17 yards (10-yard end zone + about 7 yards for the snap and hold). Make chance uses a logistic fit to recent NFL rates (≈ 97% at 30, 90% at 40, 74% at 50, 60% at 55); college and high school are shifted lower. Weather, altitude and the kicker matter a lot. " + DISCLAIMER,
    faq: [
      { question: "Why add 17 yards?", answer: "The goalposts are at the back of the 10-yard end zone, and the kick is taken about 7 yards behind the line of scrimmage." },
      { question: "What is the longest NFL field goal?", answer: "66 yards (Justin Tucker, 2021)." },
    ],
  },
  {
    slug: "football-win-probability-calculator",
    title: "Football Win Probability Calculator",
    description: "Estimate a football team's chance of winning from the score, time left, possession and the pre-game point spread.",
    metaTitle: "Football Win Probability Calculator — In-Game",
    metaDescription: "Free football win probability calculator. Estimate in-game win chance from lead, minutes left, possession and spread.",
    calcInputs: [numberField("lead", "Your Lead (negative if behind)", { default: 7, min: -60, max: 60 }), numberField("minutesLeft", "Minutes Left in the Game", { default: 10, max: 60, step: 0.5 }), dropdown("possession", "Who Has the Ball?", [["Your team", 1], ["Opponent / neutral", 2]], 2), numberField("pregameSpread", "Pre-Game Spread (+ if you were favoured)", { default: 0, min: -40, max: 40, step: 0.5 })],
    calcResult: { label: "Win Probability", format: "percentage" },
    calcResults: [pct("winProbabilityPct", "Your Win Probability", true), pct("opponentPct", "Opponent's Win Probability")],
    instructions: "Enter the current margin, time remaining, possession and (optionally) the point spread before kickoff.",
    examples: "Example: up 7 with 10 minutes left, the opponent has the ball, even teams → about 90% win probability.",
    assumptions: "Stern-style normal model: win probability = Φ((lead + spread × time fraction left) ÷ (13.45 × √time fraction)); possession adds about 2 points. Ignores field position, timeouts and down & distance. " + DISCLAIMER,
    faq: [
      { question: "How accurate are win probability models?", answer: "Good across many games, but any single game can swing — 10% chances happen one time in ten." },
      { question: "Why does the spread matter?", answer: "The better team is expected to keep outscoring the other for the remaining time." },
    ],
  },
  {
    slug: "40-yard-dash-calculator",
    title: "40 Yard Dash Calculator",
    description: "Convert a 40-yard dash time to mph, hand to electronic timing, and convert a 60-yard dash to a 40 time.",
    metaTitle: "40 Yard Dash Calculator — Speed & 60 to 40",
    metaDescription: "Free 40 yard dash calculator. Get mph from your 40 time, hand-to-electronic conversion and a 60 yard dash to 40 yard dash estimate.",
    calcInputs: [dropdown("method", "I Have a", [["40-yard dash time", 1], ["60-yard dash time", 2]], 1), numberField("time", "Time (seconds)", { default: 4.6, min: 3, max: 15, step: 0.01 }), dropdown("timing", "Timing", [["Electronic (laser / FAT)", 1], ["Hand-timed", 2]], 1)],
    calcResult: { label: "40 Time", format: "number" },
    calcResults: [num("fortyTime", "Electronic 40 Time (s)", true), num("averageMph", "Average Speed (mph)"), num("averageKmh", "Average Speed (km/h)"), num("estimatedTopSpeedMph", "Estimated Top Speed (mph)"), num("yardsPerSecond", "Yards per Second")],
    instructions: "Enter a 40-yard time, or a 60-yard time (baseball showcases) to estimate the 40. Choose hand-timed to add the usual 0.24 s.",
    examples: "Example: a 4.60 electronic 40 averages 17.8 mph, with a top speed around 21 mph. A 6.70 sixty converts to about a 4.69 forty.",
    assumptions: "Average speed = 40 yd ÷ time. Hand times are typically ~0.24 s faster than electronic. 40 ≈ 0.70 × 60-yard time; top speed ≈ 1.18 × average (athletes are still accelerating in the first 20 yards). " + DISCLAIMER,
    faq: [
      { question: "What is a good 40 time?", answer: "Under 4.5 is fast for NFL skill players; high school players run 4.6–5.0." },
      { question: "Why are hand times faster?", answer: "Timers react late to the start but on time at the finish, cutting about 0.2–0.3 seconds." },
    ],
  },
  {
    slug: "ras-score-calculator",
    title: "RAS Score Calculator",
    description: "Estimate a Relative Athletic Score (RAS, 0–10) from NFL combine results — 40, jumps, agility drills, bench and weight — by position group.",
    metaTitle: "RAS Score Calculator — Relative Athletic Score",
    metaDescription: "Free RAS score calculator. Estimate a 0–10 Relative Athletic Score from combine numbers for skill players, big skill or linemen.",
    calcInputs: [dropdown("group", "Position Group", [["Skill (WR, RB, CB, S)", 1], ["Big skill (TE, LB, QB)", 2], ["Linemen (OL, DL)", 3]], 1), numberField("weight", "Weight (lb)", { default: 205, max: 400 }), numberField("forty", "40-Yard Dash (s)", { default: 4.45, max: 6.5, step: 0.01, required: false }), numberField("vertical", "Vertical Jump (in)", { default: 38, max: 50, step: 0.5, required: false }), numberField("broad", "Broad Jump (in)", { default: 125, max: 150, required: false }), numberField("threeCone", "3-Cone Drill (s)", { default: 6.9, max: 9, step: 0.01, required: false }), numberField("shuttle", "20-Yard Shuttle (s)", { default: 4.15, max: 6, step: 0.01, required: false }), numberField("bench", "Bench Press Reps (225 lb)", { default: 16, max: 50, required: false })],
    calcResult: { label: "RAS", format: "number" },
    calcResults: [num("rasScore", "Estimated RAS (0–10)", true), num("metricsUsed", "Metrics Used"), num("bestMetricScore", "Best Single-Metric Score")],
    instructions: "Pick the position group and enter whatever combine or pro-day results you have — leave missing drills at 0.",
    examples: "Example: a 205 lb receiver with a 4.45 forty, 38\" vertical, 125\" broad, 6.90 three-cone, 4.15 shuttle and 16 reps scores about 6.6.",
    assumptions: "RAS-style estimate: each metric is turned into a 0–10 score from its percentile against typical combine averages for the position group (normal distribution), then averaged. The official RAS (Kent Lee Platte) uses full historical percentiles per position, height and split times, so results will differ. " + DISCLAIMER,
    faq: [
      { question: "What is a good RAS?", answer: "8+ is considered elite athletic testing; 5 is average for the position." },
      { question: "Does RAS predict NFL success?", answer: "It helps — very low scores rarely succeed — but football skill and production matter more." },
    ],
  },
  {
    slug: "football-position-calculator",
    title: "Football Position Calculator",
    description: "Find which football position best fits your height, weight and speed — compared with typical NFL player profiles.",
    metaTitle: "Football Position Calculator — What Position Should I Play?",
    metaDescription: "Free football position calculator. Match your height, weight and 40 time to QB, RB, WR, TE, OL, DL, LB, CB, S or kicker profiles.",
    calcInputs: [dropdown("unit", "Units", [["inches & lb", 1], ["cm & kg", 2]], 1), numberField("height", "Height", { default: 72, min: 48, max: 220 }), numberField("weight", "Weight", { default: 200, min: 60, max: 400 }), numberField("forty", "40-Yard Dash (s, optional)", { default: 4.7, max: 7, step: 0.01, required: false })],
    calcResult: { label: "Best Position", format: "number" },
    calcResults: [num("bestPosition", "Best Fit (1 QB, 2 RB, 3 WR, 4 TE, 5 OL, 6 DL, 7 LB, 8 CB, 9 S, 10 K/P)", true), num("secondPosition", "Second Choice (same codes)"), num("matchScore", "Match Score (0–100)")],
    instructions: "Enter your height, weight and, if you know it, your 40-yard time.",
    examples: "Example: 6'0\", 200 lb with a 4.7 forty matches the safety profile (9) best.",
    assumptions: "Compares you with average NFL profiles (e.g. WR 6'0½\" / 200 lb / 4.48; OL 6'5\" / 315 lb / 5.25) using distance in height (2\" steps), weight (20 lb) and 40 time (0.12 s). Body type is only part of it — skills, vision and the team's needs decide where you play. " + DISCLAIMER,
    faq: [
      { question: "What position is best for a fast, small player?", answer: "Running back, receiver or cornerback." },
      { question: "Can I change positions later?", answer: "Yes — players move as they grow, especially in high school." },
    ],
  },
  {
    slug: "nfl-playoff-calculator",
    title: "NFL Playoff Calculator",
    description: "Estimate an NFL team's playoff chances — the probability of reaching the win total you need from the current record and remaining games.",
    metaTitle: "NFL Playoff Calculator — Playoff Chances",
    metaDescription: "Free NFL playoff calculator. See the chance of reaching 10 (or any) wins from your record, games left and win probability.",
    calcInputs: [numberField("wins", "Wins", { default: 6, max: 17 }), numberField("losses", "Losses", { default: 3, max: 17 }), numberField("ties", "Ties", { default: 0, max: 17, required: false }), numberField("gamesLeft", "Games Left", { default: 8, max: 17 }), percentField("winPct", "Chance of Winning Each Remaining Game", { default: 55 }), numberField("winsNeeded", "Wins Needed for the Playoffs", { default: 10, max: 17, step: 0.5 })],
    calcResult: { label: "Playoff Chance", format: "percentage" },
    calcResults: [pct("playoffChancePct", "Chance of Reaching the Target", true), num("winsNeededRemaining", "Wins Needed in Remaining Games"), num("projectedWins", "Projected Wins"), num("maxWins", "Maximum Possible Wins")],
    instructions: "Enter the current record, games left, a per-game win chance (e.g. from betting lines) and the wins you think it takes — about 10 for a wild card in a 17-game season.",
    examples: "Example: 6–3 with 8 games left at 55% per game needs 4 more wins for 10 — about a 74% chance; projected 10.4 wins.",
    assumptions: "Binomial model: each remaining game is independent with the same win chance; ties count as half a win. Real playoff odds also depend on tiebreakers, division races and other results (see the NFL Tiebreaker Calculator). " + DISCLAIMER,
    faq: [
      { question: "How many wins do you need to make the NFL playoffs?", answer: "Usually 10 in a 17-game season; 9 sometimes gets in, 11 almost always does." },
      { question: "How many teams make the NFL playoffs?", answer: "14 — seven from each conference (four division winners and three wild cards)." },
    ],
  },
  {
    slug: "college-football-playoff-calculator",
    title: "College Football Playoff Calculator",
    description: "See a team's path through the 12-team College Football Playoff by seed — bye, first-round opponent, games to win and title odds.",
    metaTitle: "College Football Playoff Calculator — 12-Team CFP",
    metaDescription: "Free College Football Playoff calculator. Get first-round byes, matchups, games to win and championship odds for any CFP seed.",
    calcInputs: [numberField("seed", "CFP Seed (1–12)", { default: 6, min: 1, max: 12 }), percentField("winPct", "Chance of Winning Each Playoff Game", { default: 60 })],
    calcResult: { label: "Title Chance", format: "percentage" },
    calcResults: [num("firstRoundBye", "First-Round Bye (1 = yes)"), num("firstRoundOpponentSeed", "First-Round Opponent Seed"), num("hostsFirstRound", "Hosts First-Round Game (1 = yes)"), num("gamesToWinTitle", "Games to Win the Title"), pct("reachTitleGamePct", "Chance to Reach the Final"), pct("winTitlePct", "Chance to Win the Title", true)],
    instructions: "Enter the seed and a per-game win chance against playoff-level opponents.",
    examples: "Example: the 6 seed hosts the 11 seed in round one and must win 4 games. At 60% a game that's a 21.6% chance to reach the final and 13% to win it.",
    assumptions: "12-team format: seeds 1–4 get byes; first round 5 v 12, 6 v 11, 7 v 10, 8 v 9 at the higher seed's campus; quarterfinals and semifinals in bowls. Per-game chances are treated as equal and independent. Seeding and bye rules have changed between seasons — check the current CFP rules. " + DISCLAIMER,
    faq: [
      { question: "How many teams are in the College Football Playoff?", answer: "12 since the 2024 season (it was 4 from 2014 to 2023)." },
      { question: "Who gets a first-round bye?", answer: "The top four seeds." },
    ],
  },
  {
    slug: "nfl-salary-cap-calculator",
    title: "NFL Salary Cap Calculator",
    description: "Calculate a player's NFL cap hit with signing-bonus proration, your team's cap space, and the dead money and savings if he's released.",
    metaTitle: "NFL Salary Cap Calculator — Cap Hit & Dead Money",
    metaDescription: "Free NFL salary cap calculator. Get cap hit with bonus proration, team cap space, dead money and cap savings from a release.",
    calcInputs: [numberField("salaryCap", "League Salary Cap ($M — 2025 was 279.2)", { default: 279.2, max: 600, step: 0.1 }), numberField("carryover", "Rollover / Adjustments ($M)", { default: 0, min: -100, max: 200, step: 0.1, required: false }), numberField("committed", "Other Committed Cap ($M)", { default: 240, max: 600, step: 0.1 }), numberField("baseSalary", "Player Base Salary This Year ($M)", { default: 10, max: 100, step: 0.1 }), numberField("signingBonus", "Total Signing Bonus ($M)", { default: 20, max: 300, step: 0.1 }), numberField("contractYears", "Contract Years (proration, max 5)", { default: 4, min: 1, max: 5 }), numberField("yearsRemaining", "Years Remaining incl. This One", { default: 3, min: 1, max: 5 }), numberField("otherBonuses", "Roster / Workout Bonuses This Year ($M)", { default: 0, max: 100, step: 0.1, required: false })],
    calcResult: { label: "Cap Hit ($M)", format: "number" },
    calcResults: [num("playerCapHit", "Player Cap Hit ($M)", true), num("teamCapSpace", "Team Cap Space after Him ($M)"), num("deadMoneyIfReleased", "Dead Money if Released ($M)"), num("capSavingsIfReleased", "Cap Savings if Released ($M)")],
    instructions: "Enter the league cap (update for the current season), any rollover, the rest of your committed cap, and the player's contract.",
    examples: "Example: a $20M signing bonus on a 4-year deal prorates $5M a year. With a $10M salary the cap hit is $15M. Cutting him with 3 years left leaves $15M dead money and saves $0.",
    assumptions: "Signing bonuses are spread evenly over up to 5 years. Pre-June 1 release: all remaining proration accelerates into this year's dead money; savings = cap hit − dead money (base salary assumed not guaranteed). Post-June 1 designations split dead money over two years. " + DISCLAIMER,
    faq: [
      { question: "What is dead money?", answer: "Cap charges for players no longer on the roster — mostly unamortised signing bonus." },
      { question: "Why restructure a contract?", answer: "Turning salary into a signing bonus spreads it across future years, creating cap space now." },
    ],
  },
  {
    slug: "nfl-draft-trade-value-calculator",
    title: "NFL Draft Trade Value Calculator",
    description: "Compare NFL draft-pick trades with the Jimmy Johnson trade value chart — add up the picks each side gives and gets.",
    metaTitle: "NFL Draft Trade Value Calculator — Pick Chart",
    metaDescription: "Free NFL draft trade value calculator. Compare picks with the Jimmy Johnson trade chart and see who wins the trade.",
    calcInputs: [...[1, 2, 3, 4].map((i) => numberField(`givePick${i}`, `Pick You Give ${i} (overall #, 0 = none)`, { default: i === 1 ? 10 : 0, max: 262, required: i === 1 })), ...[1, 2, 3, 4].map((i) => numberField(`getPick${i}`, `Pick You Get ${i} (overall #, 0 = none)`, { default: i === 1 ? 20 : i === 2 ? 52 : 0, max: 262, required: i === 1 }))],
    calcResult: { label: "Difference", format: "number" },
    calcResults: [num("valueGiven", "Value You Give"), num("valueReceived", "Value You Get"), num("difference", "Difference (+ = you gain)", true), num("winner", "Better Side (1 = you, 2 = them, 0 = even)"), pct("gainPct", "Gain vs Value Given")],
    instructions: "Enter overall pick numbers (e.g. pick 10, pick 52) for each side of the trade.",
    examples: "Example: trading #10 (1,300 points) for #20 (850) and #52 (380) — 1,230 points — loses about 70 points (−5.4%).",
    assumptions: "Jimmy Johnson (1990s Cowboys) chart: #1 = 3,000, #10 = 1,300, #32 = 590, #64 = 270, #100 = 100, with later rounds interpolated down to 2 points. Modern analytics charts (e.g. Rich Hill, Fitzgerald-Spielberger) value later picks more. Future picks are often valued as a mid-round pick of that round. " + DISCLAIMER,
    faq: [
      { question: "Is the Jimmy Johnson chart still used?", answer: "Teams still reference it, but many use updated analytics charts that make top picks less dominant." },
      { question: "How are future picks valued?", answer: "Commonly as the middle pick of the round, sometimes discounted a round." },
    ],
  },
  {
    slug: "nfl-tiebreaker-calculator",
    title: "NFL Tiebreaker Calculator",
    description: "Break a two-team NFL tie step by step — head-to-head, division record, common games, conference record, strength of victory and schedule.",
    metaTitle: "NFL Tiebreaker Calculator — Two-Team Tiebreak",
    metaDescription: "Free NFL tiebreaker calculator. Apply the official two-team division or wild card tiebreak steps to see who wins.",
    calcInputs: [dropdown("tieType", "Tie Type", [["Division (same division)", 1], ["Wild card (different divisions)", 2]], 1), numberField("h2hWinsA", "Team A Head-to-Head Wins", { default: 1, max: 2 }), numberField("h2hWinsB", "Team B Head-to-Head Wins", { default: 1, max: 2 }), numberField("divWinsA", "Team A Division Wins", { default: 4, max: 6 }), numberField("divLossesA", "Team A Division Losses", { default: 2, max: 6 }), numberField("divWinsB", "Team B Division Wins", { default: 3, max: 6 }), numberField("divLossesB", "Team B Division Losses", { default: 3, max: 6 }), numberField("commonWinsA", "Team A Common-Games Wins", { default: 0, max: 17, required: false }), numberField("commonLossesA", "Team A Common-Games Losses", { default: 0, max: 17, required: false }), numberField("commonWinsB", "Team B Common-Games Wins", { default: 0, max: 17, required: false }), numberField("commonLossesB", "Team B Common-Games Losses", { default: 0, max: 17, required: false }), numberField("confWinsA", "Team A Conference Wins", { default: 0, max: 17, required: false }), numberField("confLossesA", "Team A Conference Losses", { default: 0, max: 17, required: false }), numberField("confWinsB", "Team B Conference Wins", { default: 0, max: 17, required: false }), numberField("confLossesB", "Team B Conference Losses", { default: 0, max: 17, required: false }), numberField("sovA", "Team A Strength of Victory (win %)", { default: 0, max: 1, step: 0.001, required: false }), numberField("sovB", "Team B Strength of Victory", { default: 0, max: 1, step: 0.001, required: false }), numberField("sosA", "Team A Strength of Schedule", { default: 0, max: 1, step: 0.001, required: false }), numberField("sosB", "Team B Strength of Schedule", { default: 0, max: 1, step: 0.001, required: false })],
    calcResult: { label: "Winner", format: "number" },
    calcResults: [num("winner", "Tiebreak Winner (1 = Team A, 2 = Team B, 0 = still tied)", true), num("decidedAtStep", "Decided at Step (1 H2H, 2 Division, 3 Common, 4 Conference, 5 SOV, 6 SOS)")],
    instructions: "Choose division or wild card, then fill in each step's records for both teams. Leave steps you don't have at 0 — they'll count as equal.",
    examples: "Example: split head-to-head 1–1, Team A 4–2 in the division vs Team B 3–3 → Team A wins the tiebreak at step 2 (division record).",
    assumptions: "NFL two-team procedure: division ties use head-to-head, division record, common games, conference record, strength of victory, strength of schedule; wild card ties skip division record and use conference record before common games (common games need at least 4). Later steps (point rankings, net points, coin toss) aren't included. Three-plus-team ties use different rules. " + DISCLAIMER,
    faq: [
      { question: "What is strength of victory?", answer: "The combined win percentage of the teams you beat." },
      { question: "Does point differential break ties?", answer: "Only far down the list, after strength of schedule and ranking steps." },
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
