// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the fantasy sports sub-batch B (Fantasy Draft & Roster + Fantasy Playoff &
// Standings). See prisma/create-fantasy-trade-scoring-calculators.ts for the
// full list of 3 sub-batches, and src/lib/calc-engine-fantasy-draft-playoffs.ts
// for the math and how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-fantasy-draft-playoffs-calculators.ts
// or
//   npm run db:create-fantasy-draft-playoffs-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "currency", required: true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for fun and planning only. Results depend on your league's rules and the projections you " +
  "enter, and real seasons are full of injuries and surprises. It isn't betting advice.";

const SD_NOTE =
  "Weekly scores are modelled as a normal distribution; a weekly standard deviation of about 25 points fits most 12-team PPR leagues " +
  "(use about 20 for standard scoring).";

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
  // ----------------------------------------------------------- Draft & roster
  {
    slug: "fantasy-auction-value-calculator",    title: "Fantasy Auction Value Calculator",
    description: "Work out what a player is worth in a fantasy auction draft, from his projected points over replacement and the money in your league.",
    metaTitle: "Fantasy Auction Value Calculator — $ Value",
    metaDescription: "Free fantasy auction value calculator. Turn projected points over replacement into a dollar value for your league's budget and roster size.",
    calcInputs: [
      numberField("projectedPoints", "Player's Projected Season Points", { default: 300, max: 600 }),
      numberField("replacementPoints", "Replacement-Level Points at His Position", { default: 150, max: 500 }),
      numberField("teams", "Teams in League", { default: 12, min: 4, max: 32 }),
      currencyField("budget", "Auction Budget per Team", { default: 200, max: 10000 }),
      numberField("rosterSpots", "Roster Spots per Team", { default: 16, min: 1, max: 40 }),
      percentField("benchSharePercent", "Budget Kept for Bench / K / DST", { default: 10, max: 50 }),
      numberField("leagueTotalVor", "League Total Points Over Replacement (All Drafted Starters)", { default: 7500, max: 100000, step: 100 }),
    ],
    calcResult: { label: "Auction Value", format: "currency" },
    calcResults: [
      { key: "auctionValue", label: "Auction Value", format: "currency", highlight: true },
      { key: "valueOverReplacement", label: "Points Over Replacement", format: "number" },
      { key: "dollarsPerVorPoint", label: "Dollars per Point Over Replacement", format: "currency" },
      { key: "percentOfBudget", label: "Share of One Team's Budget", format: "percentage" },
    ],
    instructions:
      "Enter the player's projected season points and the projected points of the last starter drafted at his position (the replacement level — e.g. about the 24th RB in a 12-team league).\n\n" +
      "Then enter your league's teams, budget and roster size. If your projections spreadsheet totals points over replacement for every drafted starter, enter it; otherwise keep the default.",
    examples:
      "Example: in a 12-team, $200, 16-roster league that keeps 10% for the bench, $1,968 chases 7,500 points over replacement — $0.26 a point. " +
      "A player projected for 300 points against a 150-point replacement is worth $1 + 150 × $0.26 = $40.36, about 20% of a budget.",
    assumptions:
      "Standard value-over-replacement auction pricing: every roster spot costs at least $1, and the rest of the money is shared in proportion to points over replacement. " +
      "The 7,500 default is a typical 12-team PPR total; it scales with league size and scoring. " + DISCLAIMER,
    faq: [
      { question: "What is replacement level?", answer: "The points of the best player you could get for $1 or off waivers at that position. In a 12-team league that starts 2 RBs, it's roughly the RB24–RB30." },
      { question: "Why do real auction prices differ?", answer: "Managers overpay for stars and bargain late. Use the value as a ceiling for players you want and a target for bargains." },
    ],
  },
  {
    slug: "fantasy-football-draft-grade-calculator",    title: "Fantasy Football Draft Grade Calculator",
    description: "Grade your fantasy football draft. Adds up your projected starting lineup and compares it with the league average to give a draft score, win chance and expected record.",
    metaTitle: "Fantasy Football Draft Grade Calculator",
    metaDescription: "Free fantasy football draft grade calculator. Score your drafted lineup vs the league average and get your projected win % and record.",
    calcInputs: [
      numberField("qb", "QB Projected Points per Week", { default: 20, max: 50, step: 0.1 }),
      numberField("rb1", "RB1 Projected Points per Week", { default: 16, max: 50, step: 0.1 }),
      numberField("rb2", "RB2 Projected Points per Week", { default: 12, max: 50, step: 0.1 }),
      numberField("wr1", "WR1 Projected Points per Week", { default: 17, max: 50, step: 0.1 }),
      numberField("wr2", "WR2 Projected Points per Week", { default: 13, max: 50, step: 0.1 }),
      numberField("te", "TE Projected Points per Week", { default: 9, max: 50, step: 0.1 }),
      numberField("flex", "FLEX Projected Points per Week", { default: 11, max: 50, step: 0.1 }),
      numberField("k", "Kicker Projected Points per Week", { default: 8, max: 30, step: 0.1, required: false }),
      numberField("dst", "Defense Projected Points per Week", { default: 7, max: 30, step: 0.1, required: false }),
      numberField("leagueAverage", "League Average Projected Points per Week", { default: 110, max: 300, step: 0.5 }),
      numberField("weeklySd", "Weekly Score Standard Deviation", { default: 25, min: 1, max: 60 }),
      numberField("seasonWeeks", "Regular-Season Weeks", { default: 14, min: 1, max: 18 }),
    ],
    calcResult: { label: "Draft Score", format: "number" },
    calcResults: [
      { key: "draftScore", label: "Draft Score (0–100, 50 = Average)", format: "number", highlight: true },
      { key: "projectedWeeklyPoints", label: "Projected Points per Week", format: "number" },
      { key: "pointsVsLeagueAverage", label: "Points vs League Average", format: "number" },
      { key: "expectedWins", label: "Expected Wins", format: "number" },
      { key: "expectedLosses", label: "Expected Losses", format: "number" },
    ],
    instructions:
      "Enter the projected weekly points of each starter you drafted, using one projection source. Then enter the league's average projected weekly total — add up every team's starters and divide by the number of teams, or use your platform's projected standings.",
    examples:
      "Example: a lineup projected for 113 points a week in a league averaging 110 has a 53.4% chance of winning any given week. Over a 14-week season that's about 7.5 wins — a draft score of 53, a slightly above-average (C+) draft.",
    assumptions:
      "Draft score is your projected weekly win chance against an average team. A rough letter guide: 70+ A, 60–70 B, 50–60 C+, 40–50 C−, below 40 D. " + SD_NOTE + " Bench depth isn't counted. " + DISCLAIMER,
    faq: [
      { question: "Why grade a draft by win chance?", answer: "Points only matter compared with your opponents. A few extra projected points a week turn into a measurable edge in your weekly win chance." },
      { question: "Are site draft grades better?", answer: "Platform grades use their own projections and often reward value picks. This score shows how strong your actual starting lineup is against the league, using the projections you trust." },
    ],
  },
  {
    slug: "fantasy-keeper-calculator",    title: "Fantasy Keeper Calculator",
    description: "Decide whether a player is worth keeping. Compares the round he'd go in this year's draft with the round you'd give up to keep him, and shows next year's cost.",
    metaTitle: "Fantasy Keeper Calculator — Keeper Value",
    metaDescription: "Free fantasy keeper calculator. Compare a player's ADP round with his keeper cost round to see his surplus value and next year's cost.",
    calcInputs: [
      numberField("adpRound", "Round He'd Be Drafted This Year (ADP Round)", { default: 3, min: 1, max: 30, step: 0.5 }),
      numberField("keeperCostRound", "Round You Give Up to Keep Him", { default: 8, min: 1, max: 30 }),
      numberField("teams", "Teams in League", { default: 12, min: 4, max: 32 }),
      numberField("roundEscalation", "Rounds His Cost Rises Each Year Kept", { default: 1, max: 10 }),
    ],
    calcResult: { label: "Keeper Surplus Value", format: "number" },
    calcResults: [
      { key: "keeperSurplusValue", label: "Keeper Surplus Value (Pick-Value Points)", format: "number", highlight: true },
      { key: "roundsOfValue", label: "Rounds of Value", format: "number" },
      { key: "picksOfValue", label: "Picks of Value", format: "number" },
      { key: "nextYearCostRound", label: "Cost Round Next Year", format: "number" },
      { key: "playerPickValue", label: "Value of His ADP Pick", format: "number" },
      { key: "costPickValue", label: "Value of the Pick You Give Up", format: "number" },
    ],
    instructions:
      "Enter the round the player is going in drafts this year (his average draft position in rounds), the round you'd forfeit to keep him, your league size, and how many rounds earlier his cost moves each year you keep him.\n\n" +
      "Run it for each keeper candidate and keep the ones with the highest surplus value.",
    examples:
      "Example: a player going in round 3 who costs your 8th-round pick in a 12-team league gives 5 rounds (60 picks) of value. On the draft value curve that's 47.8 − 10.7 = 37.2 points of surplus. Next year he'd cost a 7th.",
    assumptions:
      "Pick value follows an exponential draft curve: the 1st overall pick is 100 and each later pick is worth about 2.5% less. Early rounds are worth far more than late ones, so a 3rd-rounder kept for a 4th beats a 10th-rounder kept for a 15th. " + DISCLAIMER,
    faq: [
      { question: "Is a bigger round gap always better?", answer: "Not always. Saving 5 rounds on an early pick is worth much more than saving 5 rounds late, because early picks are scarce. That's why the surplus value uses a pick value curve, not just rounds." },
      { question: "What if my league uses auction keepers?", answer: "Compare his keeper price with his value from the Fantasy Auction Value Calculator — the difference is the surplus." },
    ],
  },
  {
    slug: "faab-calculator",    title: "FAAB Calculator",
    description: "Find how much free agent acquisition budget (FAAB) to bid on a waiver player, based on his tier, your remaining budget, competition and weeks left.",
    metaTitle: "FAAB Calculator — How Much to Bid",
    metaDescription: "Free FAAB calculator for fantasy waivers. Get a recommended bid from player tier, remaining budget, likely rival bidders and weeks left.",
    calcInputs: [
      currencyField("remainingBudget", "Your Remaining FAAB", { default: 80, max: 1000 }),
      numberField("weeksLeft", "Weeks Left in Regular Season", { default: 8, min: 1, max: 20 }),
      dropdown(
        "playerTier",
        "Player Tier",
        [
          ["League-winner (new starter at a scarce spot)", 1],
          ["Weekly starter", 2],
          ["Flex / bye-week fill-in", 3],
          ["Stash / handcuff", 4],
          ["One-week streamer", 5],
        ],
        2
      ),
      numberField("likelyBidders", "Teams Likely to Bid", { default: 3, min: 1, max: 20 }),
    ],
    calcResult: { label: "Recommended Bid", format: "currency" },
    calcResults: [
      { key: "recommendedBid", label: "Recommended Bid", format: "currency", highlight: true },
      { key: "bidPercentOfRemaining", label: "Share of Your Remaining Budget", format: "percentage" },
      { key: "budgetLeftAfterBid", label: "Budget Left if You Win", format: "currency" },
      { key: "budgetPerWeekLeft", label: "Budget per Week Left", format: "currency" },
    ],
    instructions: "Enter your remaining FAAB, weeks left, how good the player is likely to be for your team, and how many teams need him.",
    examples:
      "Example: with $80 left and 8 weeks to go, a weekly-starter pickup that 3 teams want gets a bid of 25% × 1.2 = 30% of your budget — $24, leaving $56.",
    assumptions:
      "Base bid by tier: league-winner 50% of remaining budget, starter 25%, flex 12%, stash 5%, streamer 2%. Each extra likely bidder adds 10% (up to +50%), and in the last 3 weeks bids rise 50% because leftover budget is worth nothing. Minimum bid $1. " + DISCLAIMER,
    faq: [
      { question: "Should I spend big early?", answer: "The best FAAB values often come in the first weeks, when roles change fast. Spending most of your budget by mid-season is normal — just keep enough for injury replacements." },
      { question: "Does it matter if my league allows $0 bids?", answer: "Yes — streamers and stashes can be $0 bids in those leagues. Round the recommendation down for low-tier players." },
    ],
  },
  {
    slug: "start-sit-calculator",    title: "Start/Sit Calculator (Fantasy)",
    description: "Decide which of two fantasy players to start this week, using projections, floor and ceiling, matchup, and whether your team needs a safe score or a big one.",
    metaTitle: "Start/Sit Calculator — Fantasy Football",
    metaDescription: "Free fantasy start/sit calculator. Compare two players by projection, floor, ceiling and matchup, and get the right call for favourites and underdogs.",
    calcInputs: [
      numberField("aProjection", "Player A Projected Points", { default: 14, max: 60, step: 0.1 }),
      numberField("aFloor", "Player A Floor (Bad Week)", { default: 9, max: 60, step: 0.5 }),
      numberField("aCeiling", "Player A Ceiling (Great Week)", { default: 20, max: 80, step: 0.5 }),
      dropdown("aMatchup", "Player A Matchup", [["Tough (−10%)", 1], ["Neutral", 2], ["Good (+10%)", 3]], 2),
      numberField("bProjection", "Player B Projected Points", { default: 13, max: 60, step: 0.1 }),
      numberField("bFloor", "Player B Floor (Bad Week)", { default: 3, max: 60, step: 0.5 }),
      numberField("bCeiling", "Player B Ceiling (Great Week)", { default: 28, max: 80, step: 0.5 }),
      dropdown("bMatchup", "Player B Matchup", [["Tough (−10%)", 1], ["Neutral", 2], ["Good (+10%)", 3]], 3),
      dropdown("teamOutlook", "Your Team This Week", [["Favourite — protect the floor", 1], ["Even matchup", 2], ["Underdog — chase the ceiling", 3]], 3),
    ],
    calcResult: { label: "Start Score Difference", format: "number" },
    calcResults: [
      { key: "startScoreDifference", label: "A minus B Start Score (+ = Start A, − = Start B)", format: "number", highlight: true },
      { key: "chanceAOutscoresB", label: "Chance A Outscores B", format: "percentage" },
      { key: "playerAStartScore", label: "Player A Start Score", format: "number" },
      { key: "playerBStartScore", label: "Player B Start Score", format: "number" },
    ],
    instructions:
      "Enter each player's projected points, his realistic floor and ceiling this week, and his matchup. Then say whether your team is the favourite or the underdog this week.",
    examples:
      "Example: Player A is projected for 14 (floor 9, ceiling 20); Player B for 13 (floor 3, ceiling 28) with a good matchup. As an underdog you need upside: B's start score is 20.7 against A's 16.8, so start B — even though A is slightly more likely to outscore him (48.6% for A).",
    assumptions:
      "Floor and ceiling are read as the bottom and top of a 90% range. Favourites use each player's 20th-percentile score, underdogs the 80th percentile, even matchups the projection. Matchups move the projection 10%. " + DISCLAIMER,
    faq: [
      { question: "Why would I start the player with the lower projection?", answer: "If you're a big underdog, a steady 14 points probably loses anyway. A boom-or-bust player gives you a real chance at the big week you need." },
      { question: "Where do floor and ceiling numbers come from?", answer: "Many projection sites publish them; otherwise use the player's low and high scores from recent comparable weeks." },
    ],
  },
  // ----------------------------------------------------- Playoffs & standings
  {
    slug: "fantasy-football-playoff-odds-calculator",    title: "Fantasy Football Playoff Odds Calculator",
    description: "Estimate your chances of making the fantasy football playoffs from your record, games left, scoring strength and the wins usually needed for a spot.",
    metaTitle: "Fantasy Football Playoff Odds Calculator",
    metaDescription: "Free fantasy football playoff odds calculator. Get your playoff chances from your record, points per game, games left and the wins needed.",
    calcInputs: [
      numberField("wins", "Current Wins", { default: 5, max: 17 }),
      numberField("gamesRemaining", "Regular-Season Games Left", { default: 5, max: 17 }),
      numberField("yourPpg", "Your Points per Game (Projected)", { default: 120, max: 300, step: 0.5 }),
      numberField("leagueAvgPpg", "League Average Points per Game", { default: 115, max: 300, step: 0.5 }),
      numberField("weeklySd", "Weekly Score Standard Deviation", { default: 25, min: 1, max: 60 }),
      numberField("winsNeeded", "Wins Usually Needed for the Last Playoff Spot", { default: 8, max: 17 }),
      percentField("tiebreakChance", "Chance You Win a Tiebreaker (e.g. Points For)", { default: 50 }),
    ],
    calcResult: { label: "Playoff Odds", format: "percentage" },
    calcResults: [
      { key: "playoffOdds", label: "Playoff Odds", format: "percentage", highlight: true },
      { key: "weeklyWinProbability", label: "Chance to Win Each Week", format: "percentage" },
      { key: "expectedFinalWins", label: "Expected Final Wins", format: "number" },
      { key: "chanceToReachCutoff", label: "Chance to Reach the Usual Cutoff", format: "percentage" },
      { key: "chanceOneWinShort", label: "Chance to Finish One Win Short (Bubble)", format: "percentage" },
    ],
    instructions:
      "Enter your wins, games left, your projected points per game and the league average. Then enter how many wins usually take the last playoff spot in your league (look at past seasons) and your chance of winning a tiebreaker.",
    examples:
      "Example: at 5 wins with 5 games left, scoring 120 a week in a 115-average league, you win each week 55.6% of the time and expect 7.8 wins. If 8 wins usually gets in, you reach 8 wins 60.5% of the time and land one short 27% of the time; with a 50% tiebreak chance your playoff odds are 74%.",
    assumptions: "Each remaining game is an independent coin weighted by your scoring edge. " + SD_NOTE + " Your actual schedule and other teams' results aren't modelled — use the Playoff Scenario Calculator for a race against one rival. " + DISCLAIMER,
    faq: [
      { question: "How many wins do I need to make the playoffs?", answer: "In a 12-team, 14-week league with 6 playoff teams, 8 wins is usually safe and 7 wins is a coin flip decided by points for." },
      { question: "Why use points per game instead of my record?", answer: "Records are noisy — points scored predict future wins better than past wins do." },
    ],
  },
  {
    slug: "fantasy-playoff-scenario-calculator",    title: "Fantasy Playoff Scenario Calculator",
    description: "Race one rival for a playoff spot. Get your chance to finish ahead, including head-to-head games and tiebreakers, and the wins you need to control your own fate.",
    metaTitle: "Fantasy Playoff Scenario Calculator",
    metaDescription: "Free fantasy playoff scenario calculator. Your chance to finish ahead of a rival, with head-to-head games, tiebreakers and wins needed to clinch.",
    calcInputs: [
      numberField("yourWins", "Your Current Wins", { default: 6, max: 17 }),
      numberField("rivalWins", "Rival's Current Wins", { default: 7, max: 17 }),
      numberField("gamesRemaining", "Games Left (Each Team)", { default: 4, max: 17 }),
      numberField("headToHeadGames", "Games Left Against Each Other", { default: 1, max: 5 }),
      percentField("yourWinChance", "Your Chance to Win a Typical Week", { default: 55 }),
      percentField("rivalWinChance", "Rival's Chance to Win a Typical Week", { default: 50 }),
      percentField("tiebreakChance", "Chance You Win the Tiebreaker (100 = You Hold It)", { default: 50 }),
    ],
    calcResult: { label: "Chance to Finish Ahead", format: "percentage" },
    calcResults: [
      { key: "chanceToFinishAhead", label: "Chance to Finish Ahead of Your Rival", format: "percentage", highlight: true },
      { key: "chanceOfTie", label: "Chance of a Tie in Wins", format: "percentage" },
      { key: "winsNeededToControlFate", label: "Wins Needed if Rival Wins Out", format: "number" },
      { key: "canControlOwnFate", label: "You Control Your Own Fate (1 = Yes)", format: "number" },
      { key: "headToHeadWinChance", label: "Your Chance in Head-to-Head Games", format: "percentage" },
    ],
    instructions:
      "Enter your wins and your rival's, the games left, how many of them are against each other, and each team's chance of winning a typical week (the Playoff Odds Calculator shows yours). If you'd win a tie on points for, set the tiebreaker to your best guess — 100 if it's locked.",
    examples:
      "Example: you're 6 wins to your rival's 7 with 4 games left, one of them head to head. Winning 55% of weeks against the rival's 50%, you finish ahead 33.6% of the time, including half of the 22.2% chance of a tie. Even winning all 4 isn't enough if the rival wins his other 3 — you'd need 5 wins, so you don't control your own fate.",
    assumptions:
      "Weeks are independent. In head-to-head games your chance comes from both teams' win rates (the Log5 method). Ties in wins go to the tiebreaker chance. " + DISCLAIMER,
    faq: [
      { question: "What does 'control your own fate' mean?", answer: "That winning every remaining game guarantees you finish ahead, no matter what the rival does." },
      { question: "Why do head-to-head games matter so much?", answer: "Each one is a two-game swing: your win is also his loss." },
    ],
  },
  {
    slug: "fantasy-football-magic-number-calculator",    title: "Fantasy Football Magic Number Calculator",
    description: "Find your magic number to clinch a playoff spot over the team chasing you, and your elimination number against the team ahead of you.",
    metaTitle: "Fantasy Football Magic Number Calculator",
    metaDescription: "Free fantasy football magic number calculator. See the wins and rival losses you need to clinch, and your elimination number.",
    calcInputs: [
      numberField("totalGames", "Total Regular-Season Games", { default: 14, min: 1, max: 18 }),
      numberField("yourWins", "Your Wins", { default: 9, max: 18 }),
      numberField("yourLosses", "Your Losses", { default: 3, max: 18 }),
      numberField("chaserLosses", "Losses of the First Team Out (Chasing You)", { default: 5, max: 18 }),
      numberField("leaderWins", "Wins of the Team Just Ahead of You", { default: 10, max: 18 }),
      dropdown("holdTiebreaker", "Do You Hold the Tiebreaker Over the Chaser?", [["No / unsure", 0], ["Yes", 1]], 0),
    ],
    calcResult: { label: "Magic Number", format: "number" },
    calcResults: [
      { key: "magicNumber", label: "Magic Number to Clinch", format: "number", highlight: true },
      { key: "eliminationNumber", label: "Elimination Number vs Team Ahead", format: "number" },
      { key: "gamesRemaining", label: "Your Games Remaining", format: "number" },
      { key: "clinched", label: "Already Clinched (1 = Yes)", format: "number" },
    ],
    instructions:
      "Enter the season length, your record, the losses of the best team currently outside the playoffs, and the wins of the team just above you. Say whether you'd win a tie with the chaser.",
    examples:
      "Example: in a 14-game season you're 9-3 and the first team out has 5 losses. Your magic number is 14 + 1 − 9 − 5 = 1 — one more win by you, or one more loss by them, clinches. Against a 10-win team ahead, your elimination number is 2.",
    assumptions: "Magic number = total games + 1 − your wins − the chaser's losses (minus 1 more if you hold the tiebreaker). Ties count as half a game and aren't modelled. " + DISCLAIMER,
    faq: [
      { question: "What is a magic number?", answer: "The combined number of your wins and the chasing team's losses that guarantees you finish ahead of them. When it hits 0, you've clinched." },
      { question: "Which chasing team should I enter?", answer: "The team with the best record outside the playoff spots. If several teams are close, run it for each — the largest magic number is the one that matters." },
    ],
  },
  {
    slug: "fantasy-football-luck-calculator",    title: "Fantasy Football Luck Calculator",
    description: "Measure how lucky your fantasy football season has been — your actual wins against the wins your scoring (or all-play record) says you deserved.",
    metaTitle: "Fantasy Football Luck Calculator",
    metaDescription: "Free fantasy football luck calculator. Compare your record with expected wins from points scored or all-play record to see your luck.",
    calcInputs: [
      numberField("wins", "Your Wins", { default: 6, max: 18 }),
      numberField("losses", "Your Losses", { default: 4, max: 18 }),
      numberField("pointsFor", "Your Total Points For", { default: 1250, max: 10000, step: 0.5 }),
      numberField("pointsAgainst", "Your Total Points Against", { default: 1100, max: 10000, step: 0.5 }),
      numberField("leagueAvgPpg", "League Average Points per Game", { default: 118, max: 300, step: 0.5 }),
      numberField("weeklySd", "Weekly Score Standard Deviation", { default: 25, min: 1, max: 60 }),
      numberField("allPlayWins", "All-Play Wins (Optional)", { default: 0, max: 400, required: false }),
      numberField("allPlayLosses", "All-Play Losses (Optional)", { default: 0, max: 400, required: false }),
    ],
    calcResult: { label: "Luck (Wins)", format: "number" },
    calcResults: [
      { key: "luckWins", label: "Luck in Wins (+ = Lucky)", format: "number", highlight: true },
      { key: "expectedWins", label: "Wins You Deserved", format: "number" },
      { key: "pointsBasedExpectedWins", label: "Expected Wins from Points Scored", format: "number" },
      { key: "pointsAgainstVsAverage", label: "Opponents' Points per Game vs Average", format: "number" },
      { key: "actualWinPercent", label: "Actual Win %", format: "percentage" },
    ],
    instructions:
      "Enter your record, total points for and against, and the league average points per game. If your platform shows an all-play record (your record if you played every team every week), enter it — it's the most accurate measure.",
    examples:
      "Example: 6-4 with 1,250 points for (125 a game) in a league averaging 118 is worth about 5.8 wins, so you're +0.2 wins lucky. Your opponents averaged 8 points a game below the league average — a soft schedule.",
    assumptions: "Expected wins use all-play when entered; otherwise your points per game against the league average. " + SD_NOTE + " " + DISCLAIMER,
    faq: [
      { question: "What is an all-play record?", answer: "Your record if you played every other team every week. Scoring the second-most points in a week makes you 10-1 that week in a 12-team league, whoever you actually played." },
      { question: "Is a lucky team likely to keep winning?", answer: "Usually not. Luck tends to even out, so a team with many more wins than its points deserve often slides back later in the season." },
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
