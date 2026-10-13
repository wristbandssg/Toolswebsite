// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the golf sub-batch B (Scoring, Games & Rounds). See
// src/lib/calc-engine-golf-handicap.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Golf
// Calculators), and src/lib/calc-engine-golf-scoring.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-golf-scoring-calculators.ts
// or
//   npm run db:create-golf-scoring-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const LIES: [string, number][] = [["Tee", 1], ["Fairway", 2], ["Rough", 3], ["Sand / bunker", 4], ["Recovery (trees, blocked)", 5], ["Green", 6]];
const HOLE = (i: number, par: number, si: number, score: number) => [
  dropdown(`hole${i}Par`, `Problem Hole ${i} — Par`, [["Par 3", 3], ["Par 4", 4], ["Par 5", 5]], par),
  numberField(`hole${i}StrokeIndex`, `Problem Hole ${i} — Stroke Index`, { default: si, min: 1, max: 18 }),
  numberField(`hole${i}Score`, `Problem Hole ${i} — Your Score (0 = unused)`, { default: score, max: 20, required: false }),
];

const TOOLS: ToolDef[] = [
  {
    slug: "golf-score-calculator",
    title: "Golf Score Calculator",
    description: "Calculate your gross and net golf score, score to par and round stats — fairways hit, greens in regulation and putts per hole (also a golf net score calculator).",
    metaTitle: "Golf Score Calculator — Gross, Net & Stats",
    metaDescription: "Free golf score calculator. Get gross and net score, score to par, fairways hit %, greens in regulation % and putts per hole.",
    calcInputs: [dropdown("holes", "Holes", [["18 holes", 18], ["9 holes", 9]], 18), numberField("frontNine", "Front Nine Strokes", { default: 45, max: 150 }), numberField("backNine", "Back Nine Strokes (18 holes)", { default: 47, max: 150, required: false }), numberField("par", "Course Par", { default: 72, min: 27, max: 80 }), numberField("courseHandicap", "Course Handicap (for net)", { default: 18, min: -10, max: 60, required: false }), numberField("fairwaysHit", "Fairways Hit", { default: 7, max: 18, required: false }), numberField("fairwayHoles", "Fairways Available (par 4s & 5s)", { default: 14, min: 1, max: 18, required: false }), numberField("greensHit", "Greens in Regulation", { default: 5, max: 18, required: false }), numberField("putts", "Total Putts", { default: 34, max: 80, required: false })],
    calcResult: { label: "Net Score", format: "number" },
    calcResults: [num("grossScore", "Gross Score"), num("grossToPar", "Gross to Par"), num("netScore", "Net Score", true), num("netToPar", "Net to Par"), num("averagePerHole", "Average Strokes per Hole"), pct("fairwaysHitPct", "Fairways Hit"), pct("greensInRegulationPct", "Greens in Regulation"), num("puttsPerHole", "Putts per Hole")],
    instructions: "Enter your front and back nine totals, course par and your Course Handicap for the tees you played. Add fairways, greens and putts if you tracked them.",
    examples: "Example: 45 + 47 = 92 gross, +20 on a par 72. With a Course Handicap of 18 the net score is 74 (+2). 7 of 14 fairways = 50%, 5 greens = 27.8%, 34 putts = 1.89 per hole.",
    assumptions: "Net score = gross − Course Handicap. Fairways are counted on par 4s and 5s; greens in regulation means on the green in par − 2 strokes. For handicap posting use your adjusted gross score (see the Adjusted Gross Score Calculator). " + DISCLAIMER,
    faq: [
      { question: "What is a good golf score?", answer: "About 90–100 is typical for an average amateur on 18 holes; breaking 90 puts you ahead of most golfers, and 80 is the mark of a good player." },
      { question: "What is a net score?", answer: "Your gross score minus your handicap strokes — it lets golfers of different abilities compete." },
    ],
  },
  {
    slug: "adjusted-gross-score-calculator",
    title: "Adjusted Gross Score Calculator",
    description: "Calculate your adjusted gross score for handicap posting — caps blow-up holes at net double bogey (also a net double bogey calculator).",
    metaTitle: "Adjusted Gross Score & Net Double Bogey Calculator",
    metaDescription: "Free adjusted gross score calculator. Cap each hole at net double bogey (par + 2 + strokes) to get the score you post for your handicap.",
    calcInputs: [numberField("grossScore", "Gross Score", { default: 98, max: 200 }), numberField("courseHandicap", "Course Handicap", { default: 20, min: -10, max: 60 }), dropdown("hasHandicap", "Do You Have a Handicap Index?", [["Yes — net double bogey", 1], ["Not yet — par + 5", 2]], 1), ...HOLE(1, 4, 3, 9), ...HOLE(2, 5, 9, 8), ...HOLE(3, 3, 17, 0), ...HOLE(4, 4, 1, 0), ...HOLE(5, 4, 1, 0), ...HOLE(6, 4, 1, 0)],
    calcResult: { label: "Adjusted Gross Score", format: "number" },
    calcResults: [num("adjustedGrossScore", "Adjusted Gross Score", true), num("strokesRemoved", "Strokes Removed"), num("hole1MaxScore", "Hole 1 Max Score (Net Double Bogey)"), num("hole2MaxScore", "Hole 2 Max Score"), num("hole3MaxScore", "Hole 3 Max Score"), num("hole4MaxScore", "Hole 4 Max Score"), num("hole5MaxScore", "Hole 5 Max Score"), num("hole6MaxScore", "Hole 6 Max Score")],
    instructions: "Enter your gross score and Course Handicap. Then list up to 6 holes where you scored badly — par, the hole's stroke index from the scorecard and your score. Holes left at 0 are ignored.",
    examples: "Example: Course Handicap 20 means 2 strokes on stroke index 1–2 and 1 stroke elsewhere. A 9 on a par 4 (SI 3) is capped at 4 + 2 + 1 = 7; an 8 on a par 5 (SI 9) is capped at 8. 98 gross − 2 = 96 adjusted gross score.",
    assumptions: "WHS Rule 3.1: the most you can post on a hole is net double bogey = par + 2 + handicap strokes received on that hole. Players without a Handicap Index cap holes at par + 5. Strokes received = Course Handicap ÷ 18 on every hole plus one more on the lowest stroke indexes; plus handicaps give strokes back from stroke index 18. " + DISCLAIMER,
    faq: [
      { question: "What is net double bogey?", answer: "Par + 2 + any handicap strokes you get on the hole — the maximum score that counts for handicap purposes." },
      { question: "Did ESC go away?", answer: "Yes. Equitable Stroke Control was replaced by net double bogey when the World Handicap System started in 2020." },
    ],
  },
  {
    slug: "stableford-scoring-calculator",
    title: "Stableford Scoring Calculator",
    description: "Calculate Stableford points from your hole results — standard Stableford or the modified (PGA Tour) system — and compare with the 36-point target.",
    metaTitle: "Stableford Scoring Calculator — Standard & Modified",
    metaDescription: "Free Stableford calculator. Count points for eagles, birdies, pars and bogeys under standard or modified Stableford scoring.",
    calcInputs: [dropdown("system", "Scoring System", [["Standard Stableford", 1], ["Modified Stableford (PGA Tour)", 2]], 1), numberField("albatrosses", "Net Albatrosses (−3)", { default: 0, max: 18, required: false }), numberField("eagles", "Net Eagles (−2)", { default: 0, max: 18, required: false }), numberField("birdies", "Net Birdies (−1)", { default: 3, max: 18 }), numberField("pars", "Net Pars", { default: 8, max: 18 }), numberField("bogeys", "Net Bogeys (+1)", { default: 5, max: 18 }), numberField("doubles", "Net Double Bogey or Worse", { default: 2, max: 18 })],
    calcResult: { label: "Stableford Points", format: "number" },
    calcResults: [num("totalPoints", "Total Points", true), num("holesCounted", "Holes Counted"), num("pointsPerHole", "Points per Hole"), num("versusTarget", "Versus 2 Points per Hole (Standard)")],
    instructions: "Count how many holes you made each net result on (after handicap strokes for standard Stableford; gross for the pro modified version) and enter them.",
    examples: "Example (standard): 3 birdies (9) + 8 pars (16) + 5 bogeys (5) + 2 doubles (0) = 30 points, 6 below the 36-point target.",
    assumptions: "Standard Stableford: double bogey or worse 0, bogey 1, par 2, birdie 3, eagle 4, albatross 5. Modified Stableford: albatross 8, eagle 5, birdie 2, par 0, bogey −1, double or worse −3. WHS recommends a 95% handicap allowance for individual Stableford. " + DISCLAIMER,
    faq: [
      { question: "What's a good Stableford score?", answer: "36 points means you played to your handicap; anything above is a good round." },
      { question: "Why play Stableford?", answer: "One bad hole costs at most 2 points, so the pace of play is quicker — you can pick up once you can't score." },
    ],
  },
  {
    slug: "skins-calculator",
    title: "Skins Calculator (Golf)",
    description: "Split a golf skins pot — value per skin and your winnings — or pay a fixed amount per skin with carryovers.",
    metaTitle: "Golf Skins Calculator — Payout per Skin",
    metaDescription: "Free golf skins calculator. Work out the value of each skin from the pot, or a fixed price per skin, and your net winnings.",
    calcInputs: [dropdown("mode", "Skins Game Type", [["Pot split by skins won", 1], ["Fixed value per skin", 2]], 1), numberField("players", "Players", { default: 8, min: 2, max: 200 }), currencyField("buyIn", "Buy-In per Player", { default: 20 }), numberField("totalSkinsWon", "Total Skins Won by Everyone", { default: 6, min: 1, max: 54 }), numberField("yourSkins", "Skins You Won", { default: 2, max: 54 }), currencyField("skinValue", "Value per Skin (fixed game)", { default: 5 })],
    calcResult: { label: "Your Winnings", format: "currency" },
    calcResults: [cur("valuePerSkin", "Value per Skin"), cur("yourWinnings", "Your Winnings", true), cur("yourNet", "Your Net (after buy-in)"), cur("totalPot", "Total Pot")],
    instructions: "For a pot game enter the players, buy-in, the total number of skins won and how many you won. For a fixed game, enter the value per skin and the skins you won (with carryovers already counted in).",
    examples: "Example: 8 players × $20 = $160 pot. 6 skins won in total → $26.67 per skin. Winning 2 pays $53.33 — $33.33 profit.",
    assumptions: "Pot game: value per skin = pot ÷ total skins won (a skin is a hole won outright; ties carry over or are void depending on your rules). Fixed game: winnings = skins × value. Net skins use handicap strokes on each hole. " + DISCLAIMER,
    faq: [
      { question: "What happens when a hole is tied?", answer: "Usually the skin carries over to the next hole, making it worth more. Some groups void tied skins instead." },
      { question: "What are net skins?", answer: "Skins played with handicap strokes so everyone has a fair chance." },
    ],
  },
  {
    slug: "strokes-gained-calculator",
    title: "Strokes Gained Calculator",
    description: "Calculate strokes gained for any golf shot — tee, approach, short game or putting — against an approximate PGA Tour baseline.",
    metaTitle: "Strokes Gained Calculator — Per Shot",
    metaDescription: "Free strokes gained calculator. See how many strokes a shot gained or lost vs a PGA Tour baseline, from tee to green.",
    calcInputs: [dropdown("startLie", "Starting Lie", LIES, 1), numberField("startDistance", "Starting Distance (yards; feet on the green)", { default: 400, max: 650 }), dropdown("endLie", "Where the Ball Finished", [...LIES.slice(1), ["Holed", 7]], 2), numberField("endDistance", "Finishing Distance (yards; feet on the green)", { default: 140, max: 650, required: false })],
    calcResult: { label: "Strokes Gained", format: "number" },
    calcResults: [num("strokesGained", "Strokes Gained", true), num("expectedBefore", "Expected Strokes Before"), num("expectedAfter", "Expected Strokes After")],
    instructions: "Choose where the shot started and finished and enter the distances to the hole — yards off the green, feet on the green. Negative strokes gained means the shot lost strokes against a Tour player.",
    examples: "Example: a 400-yard tee shot that finishes in the fairway with 140 yards left: 3.99 − 2.91 − 1 = +0.08 strokes gained.",
    assumptions: "Strokes gained = expected strokes before − expected strokes after − 1. Expected strokes are approximate PGA Tour baselines after Mark Broadie's \"Every Shot Counts\", interpolated between distances. Amateur baselines are higher, so amateurs will show negative numbers on most shots. " + DISCLAIMER,
    faq: [
      { question: "What is strokes gained putting?", answer: "The same idea on the green: a Tour player averages about 1.61 putts from 10 feet, so holing a 10-footer gains 0.61." },
      { question: "Why compare against Tour players?", answer: "It's the common reference. What matters is comparing your categories — driving, approach, short game, putting — to find where you lose most." },
    ],
  },
  {
    slug: "golf-tournament-payout-calculator",
    title: "Golf Tournament Payout Calculator",
    description: "Split a golf tournament purse across the paid places — PGA Tour percentages, linear, top-heavy or equal shares.",
    metaTitle: "Golf Tournament Payout Calculator — Prize Split",
    metaDescription: "Free golf tournament payout calculator. Split entry fees and added money across 1–10 places using PGA Tour or custom structures.",
    calcInputs: [numberField("entrants", "Entrants", { default: 40, min: 1, max: 1000 }), currencyField("entryFee", "Entry Fee", { default: 50 }), percentField("deductionPct", "Deducted for Green Fees / Costs", { default: 40, max: 100 }), currencyField("addedMoney", "Added Money / Sponsorship", { default: 0, required: false }), numberField("placesPaid", "Places Paid", { default: 5, min: 1, max: 10 }), dropdown("structure", "Payout Structure", [["PGA Tour percentages (rescaled)", 1], ["Linear (N, N−1 … 1)", 2], ["Top-heavy (each place half the one above)", 3], ["Equal split", 4]], 1)],
    calcResult: { label: "First Place", format: "currency" },
    calcResults: [cur("prizePool", "Prize Pool"), cur("first", "1st Place", true), cur("second", "2nd Place"), cur("third", "3rd Place"), cur("fourth", "4th Place"), cur("fifth", "5th Place"), cur("lastPaidPlace", "Last Paid Place")],
    instructions: "Enter the field size, entry fee, the share that goes to costs, any added money, how many places you pay and the structure.",
    examples: "Example: 40 × $50 = $2,000, minus 40% costs = $1,200. Paying 5 places with PGA Tour percentages: $482.14, $291.96, $184.82, $131.25 and $109.82.",
    assumptions: "PGA Tour structure uses the Tour's top-10 percentages (18%, 10.9%, 6.9%, 4.9%, 4.1%, 3.625%, 3.375%, 3.125%, 2.925%, 2.725%) rescaled so the paid places share 100% of the pool. Ties normally split the combined money for the tied places. " + DISCLAIMER,
    faq: [
      { question: "How many places should a golf tournament pay?", answer: "A common rule is about 1 in 8 to 1 in 10 entrants (or flights)." },
      { question: "How do ties work?", answer: "Add the prizes for the tied places together and divide equally between the tied players." },
    ],
  },
  {
    slug: "hole-in-one-odds-calculator",
    title: "Hole in One Odds Calculator",
    description: "Calculate your chances of a hole in one — per round, per year and over your golfing life — for an amateur, low handicapper or tour pro.",
    metaTitle: "Hole in One Odds Calculator — Your Chances",
    metaDescription: "Free hole in one odds calculator. See the chance of an ace per round, per year and how many years until you're more likely than not.",
    calcInputs: [dropdown("golfer", "Golfer", [["Average amateur (1 in 12,500)", 1], ["Low handicapper (1 in 5,000)", 2], ["Club / college pro (1 in 3,500)", 3], ["Tour pro (1 in 2,500)", 4], ["Custom odds", 5]], 1), numberField("customOdds", "Custom Odds — 1 in …", { default: 12500, min: 1, max: 1000000 }), numberField("par3sPerRound", "Par 3s per Round", { default: 4, max: 18 }), numberField("roundsPerYear", "Rounds per Year", { default: 30, max: 365 }), numberField("years", "Years", { default: 20, max: 80 })],
    calcResult: { label: "Chance Over the Period", format: "percentage" },
    calcResults: [pct("chanceOverPeriodPct", "Chance over the Period", true), { key: "chancePerRoundPct", label: "Chance per Round", format: "percentage", decimals: 4 }, num("oneInRounds", "Odds per Round — 1 in"), pct("chancePerYearPct", "Chance per Year"), num("yearsForFiftyPctChance", "Years for a 50% Chance")],
    instructions: "Pick your level (or enter your own odds per par-3 tee shot), how many par 3s you play per round and how often you play.",
    examples: "Example: an average amateur playing 30 rounds a year with 4 par 3s per round has a 0.032% chance per round (1 in 3,125), 0.96% a year and about 17.5% over 20 years.",
    assumptions: "Commonly quoted odds per par-3 tee shot: amateur 12,500 : 1, low handicap 5,000 : 1, club pro 3,500 : 1, tour pro 2,500 : 1 (National Hole-in-One Registry / Golf Digest). Each attempt is treated as independent; real odds depend on hole length and skill. " + DISCLAIMER,
    faq: [
      { question: "What are the odds of a hole in one?", answer: "About 12,500 to 1 for an average amateur on a par 3, and about 2,500 to 1 for a tour pro." },
      { question: "Can you insure a hole-in-one prize?", answer: "Yes — events offering a car or cash usually buy hole-in-one insurance priced on these odds and the number of players." },
    ],
  },
  {
    slug: "golf-pace-of-play-calculator",
    title: "Golf Pace of Play Calculator",
    description: "Estimate how long a round of golf takes and when you'll finish — by par mix, group size, walking or riding.",
    metaTitle: "Golf Pace of Play Calculator — Round Time",
    metaDescription: "Free golf pace of play calculator. Estimate round length, minutes per hole and finish time from par mix and group size.",
    calcInputs: [numberField("par3s", "Par 3s", { default: 4, max: 18 }), numberField("par4s", "Par 4s", { default: 10, max: 18 }), numberField("par5s", "Par 5s", { default: 4, max: 18 }), dropdown("groupSize", "Group Size", [["1 player", 1], ["2 players", 2], ["3 players", 3], ["4 players", 4]], 4), dropdown("transport", "Walking or Riding", [["Walking", 1], ["Riding a cart", 2]], 1), numberField("breakMinutes", "Break at the Turn (min)", { default: 10, max: 60, required: false }), numberField("teeHour", "Tee Time — Hour (0–23)", { default: 8, max: 23 }), numberField("teeMinute", "Tee Time — Minute", { default: 30, max: 59 })],
    calcResult: { label: "Round Time", format: "number" },
    calcResults: [num("roundMinutes", "Round Time (minutes)", true), num("roundHours", "Round Time (hours)"), num("minutesPerHole", "Minutes per Hole"), num("finishHour", "Finish — Hour"), num("finishMinute", "Finish — Minute")],
    instructions: "Enter the number of par 3s, 4s and 5s (18 holes = 4 / 10 / 4 on a par-72 course), your group, whether you walk or ride, any break and your tee time.",
    examples: "Example: a four-ball walking a par 72 with a 10-minute turn: 4 × 10 + 10 × 14 + 4 × 17 = 248 + 10 = 258 minutes (4 h 18 min). Teeing off at 8:30 you finish at 12:48.",
    assumptions: "Target times per hole for a four-ball: par 3 = 10 min, par 4 = 14 min, par 5 = 17 min (in line with R&A / USGA pace guidance of about 4 hours for 18). Threesomes ≈ 92%, twosomes ≈ 80%, singles ≈ 60% of that; carts ≈ 5% faster. Busy courses run slower. " + DISCLAIMER,
    faq: [
      { question: "How long should 18 holes take?", answer: "About 4 hours for a four-ball, around 3½ hours for a two-ball." },
      { question: "How can I play faster?", answer: "Play ready golf, keep up with the group in front and line up putts while others play." },
    ],
  },
  {
    slug: "golf-calories-burned-calculator",
    title: "Golf Calories Burned Calculator",
    description: "Calculate calories burned playing golf — walking and carrying, pushing a trolley, riding a cart, the driving range or mini golf.",
    metaTitle: "Golf Calories Burned Calculator — Walking vs Cart",
    metaDescription: "Free golf calories burned calculator. See calories for 9 or 18 holes walking, carrying, pushing a cart or riding.",
    calcInputs: [dropdown("activity", "Type of Golf", [["Walking, carrying clubs", 1], ["Walking, pulling / pushing clubs", 2], ["Riding a golf cart", 3], ["General golf", 4], ["Driving range", 5], ["Mini golf", 6]], 1), numberField("weight", "Body Weight", { default: 80, max: 250, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("minutes", "Time Playing (minutes)", { default: 240, min: 1, max: 600 }), numberField("holes", "Holes Played", { default: 18, max: 36 })],
    calcResult: { label: "Calories Burned", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("caloriesPerHole", "Calories per Hole"), num("met", "MET Value")],
    instructions: "Choose how you played, enter your weight, how long you were on the course and how many holes.",
    examples: "Example: an 80 kg golfer walking and carrying for 4 hours burns 4.3 × 80 × 4 = 1,376 kcal — about 76 per hole.",
    assumptions: "Calories = MET × body weight (kg) × hours, using the 2011 Compendium of Physical Activities: walking and carrying 4.3, walking and pulling 5.3, riding a cart 3.5, general golf 4.8, driving range 3.0, mini golf 3.0. Individual results vary ±20%. " + DISCLAIMER,
    faq: [
      { question: "Is golf good exercise?", answer: "Walking 18 holes is roughly 10,000+ steps and over 1,000 calories for most adults." },
      { question: "Does using a push cart burn fewer calories?", answer: "Not much — the Compendium actually rates pulling clubs slightly higher than carrying because rounds take longer at a steady walk." },
    ],
  },
  {
    slug: "disc-golf-rating-calculator",
    title: "Disc Golf Rating Calculator",
    description: "Estimate a PDGA-style disc golf round rating from the course SSA — or more accurately from two rated scores in the same round.",
    metaTitle: "Disc Golf Rating Calculator — Round Rating",
    metaDescription: "Free disc golf rating calculator. Estimate your round rating from SSA or from two known score ratings, plus points per throw.",
    calcInputs: [dropdown("method", "Method", [["From the course SSA", 1], ["From two rated scores in the same round", 2]], 1), numberField("score", "Your Score", { default: 52, min: 10, max: 150 }), numberField("ssa", "Scratch Scoring Average (SSA)", { default: 54, min: 30, max: 80, step: 0.1 }), numberField("refScore1", "Known Score 1", { default: 50, max: 150 }), numberField("refRating1", "Rating of Known Score 1", { default: 980, max: 1200 }), numberField("refScore2", "Known Score 2", { default: 58, max: 150 }), numberField("refRating2", "Rating of Known Score 2", { default: 900, max: 1200 })],
    calcResult: { label: "Round Rating", format: "number" },
    calcResults: [num("roundRating", "Round Rating", true), num("pointsPerThrow", "Rating Points per Throw"), num("scoreFor1000Rating", "Score for a 1000 Rating")],
    instructions: "If you know the SSA (the score a 1000-rated player averages on the layout), use method 1. If the event results already show ratings for two other scores from the same round and layout, method 2 is more accurate.",
    examples: "Example: SSA 54 and a score of 52. Points per throw = −0.1875 × 54 + 16.5 = 6.38, so the rating ≈ 1000 + 2 × 6.38 = 1013.",
    assumptions: "PDGA-style formula: rating = 1000 + (SSA − score) × points per throw, where points per throw ≈ −0.225 × SSA + 18.15 (SSA < 50.3) or −0.1875 × SSA + 16.5 (SSA ≥ 50.3). Official ratings come from propagators in the field and can differ. Not affiliated with the PDGA. " + DISCLAIMER,
    faq: [
      { question: "What is a 1000-rated round?", answer: "A round played at the level of a scratch (1000-rated) player — the SSA." },
      { question: "How many points is one throw worth?", answer: "Usually about 7–10 points; on longer, higher-SSA courses each throw is worth fewer points." },
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
