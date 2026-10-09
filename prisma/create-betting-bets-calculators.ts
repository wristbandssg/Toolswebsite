// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the sports betting sub-batch B (Bet Types & Payouts). See
// src/lib/calc-engine-betting-odds.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Sports Betting &
// Racing Calculators), and src/lib/calc-engine-betting-bets.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-betting-bets-calculators.ts
// or
//   npm run db:create-betting-bets-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Sports Betting & Racing Calculators", slug: "sports-betting-racing-calculators" };

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
  "For information and entertainment only — not betting, financial or tax advice. Sports betting is legal only in some places and only for adults (21+ in most US states). Bet only what you can afford to lose. If gambling stops being fun, call or text 1-800-GAMBLER (US) for free, confidential help.";

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });
const FMT2: [string, number][] = [["American (−110, +150)", 1], ["Decimal (1.91, 2.50)", 2]];
const odds = (key: string, label: string, def: number, required = true) => numberField(key, label, { default: def, min: -100000, max: 100000, step: 0.01, required });
const YESNO: [string, number][] = [["Won", 1], ["Lost", 0]];

const TOOLS: ToolDef[] = [
  {
    slug: "parlay-calculator",
    title: "Parlay Calculator",
    description: "Calculate parlay payouts and odds for 2 to 8 legs — accumulators, doubles, trebles, same game parlays and bet builders — in American or decimal odds.",
    metaTitle: "Parlay Calculator — Accumulator Payout & Odds",
    metaDescription: "Free parlay calculator. Combine up to 8 legs to get payout, profit, parlay odds and implied probability for accumulators and SGPs.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      currencyField("stake", "Stake", { default: 10, max: 1000000 }),
      ...[-110, -110, 150, 0, 0, 0, 0, 0].map((d, i) => odds(`leg${i + 1}`, `Leg ${i + 1} Odds${i > 1 ? " (0 = None)" : ""}`, d, i < 2)),
    ],
    calcResult: { label: "Total Payout", format: "currency" },
    calcResults: [cur("totalPayout", "Total Payout", true), cur("profit", "Profit"), num("parlayAmericanOdds", "Parlay Odds (American)"), num("parlayDecimalOdds", "Parlay Odds (Decimal)"), pct("impliedProbability", "Implied Probability"), num("legs", "Legs Counted")],
    instructions: "Enter your stake and the odds of each leg. Leave unused legs at 0.",
    examples: "Example: $10 on a three-leg parlay at −110, −110 and +150 pays $91.12 — odds of +811, a 10.98% implied chance.",
    assumptions: "Parlay decimal odds = product of each leg's decimal odds. Pushed legs drop out (enter 0 for them). Same game parlays are priced by the book with correlation built in, so real SGP odds can differ from this product. Also covers the accumulator, double, treble, same game parlay and bet builder calculators. " + DISCLAIMER,
    faq: [
      { question: "What happens if one parlay leg pushes?", answer: "At most books the leg is removed and the parlay pays at the odds of the remaining legs." },
      { question: "Why do parlays pay so much?", answer: "Every leg must win, so the chance is small — and the bookmaker's margin grows with each leg added." },
    ],
  },
  {
    slug: "system-bet-calculator",
    title: "System Bet Calculator",
    description: "Settle full-cover and system bets — Trixie, Patent, Yankee, Lucky 15, Canadian, Lucky 31, Heinz, Lucky 63, Super Heinz, Goliath and round robins — from your selections' odds and results.",
    metaTitle: "System Bet Calculator — Yankee, Lucky 15, Round Robin",
    metaDescription: "Free system bet calculator for Yankee, Lucky 15, Trixie, Heinz, Goliath and round robin bets — number of bets, stake and returns.",
    calcInputs: [
      dropdown(
        "betType",
        "Bet Type",
        [
          ["Trixie (3 selections, 4 bets)", 1], ["Patent (3 selections, 7 bets)", 2], ["Yankee (4 selections, 11 bets)", 3], ["Lucky 15 (4 selections, 15 bets)", 4],
          ["Canadian / Super Yankee (5 selections, 26 bets)", 5], ["Lucky 31 (5 selections, 31 bets)", 6], ["Heinz (6 selections, 57 bets)", 7], ["Lucky 63 (6 selections, 63 bets)", 8],
          ["Super Heinz (7 selections, 120 bets)", 9], ["Goliath (8 selections, 247 bets)", 10], ["Round robin (choose below)", 11],
        ],
        3
      ),
      numberField("selections", "Round Robin: Number of Selections (3–8)", { default: 4, min: 3, max: 8, required: false }),
      numberField("parlaySize", "Round Robin: Parlay Size (2 = by 2s, 3 = by 3s…)", { default: 2, min: 2, max: 8, required: false }),
      currencyField("unitStake", "Stake per Bet (Unit)", { default: 1, max: 100000, step: 0.1 }),
      ...Array.from({ length: 8 }, (_, i) => [numberField(`odds${i + 1}`, `Selection ${i + 1} Decimal Odds`, { default: 2.5, min: 1, max: 1000, step: 0.01, required: false }), dropdown(`won${i + 1}`, `Selection ${i + 1} Result`, YESNO, i < 3 ? 1 : 0)]).flat(),
    ],
    calcResult: { label: "Total Return", format: "currency" },
    calcResults: [cur("totalReturn", "Total Return", true), num("numberOfBets", "Number of Bets"), cur("totalStake", "Total Stake"), cur("profit", "Profit"), cur("maxReturnIfAllWin", "Maximum Return if All Win"), num("winnersEntered", "Winning Selections")],
    instructions: "Choose the bet type, your stake per bet and each selection's decimal odds and result. Only the selections the bet type uses are counted (e.g. the first 4 for a Yankee).",
    examples: "Example: a $1 Yankee (11 bets, $11) on four 2.50 shots where three win returns $34.38 — three doubles and a treble — a $23.38 profit. All four winning would return $139.06.",
    assumptions: "Full-cover bets include every double and bigger combination (Lucky bets add the singles). Round robins include every parlay of the chosen size. Each-way systems and rule 4 deductions aren't modelled. Also covers the Trixie, Patent, Yankee, Lucky 15/31/63, Canadian, Heinz, Super Heinz, Goliath and round robin calculators. " + DISCLAIMER,
    faq: [
      { question: "What's the difference between a Yankee and a Lucky 15?", answer: "Both use 4 selections; the Lucky 15 adds the 4 singles, so one winner still returns something." },
      { question: "What is a round robin?", answer: "The US version of a system bet — all the 2-team (or 3-team…) parlays from your picks, so one loss doesn't kill everything." },
    ],
  },
  {
    slug: "teaser-calculator",
    title: "Teaser Calculator",
    description: "Calculate a teaser's payout, the break-even win rate per leg and its expected value from your own leg win probability.",
    metaTitle: "Teaser Calculator — Payout, Break-Even & EV",
    metaDescription: "Free teaser calculator. Get teaser payout, break-even per-leg win rate and EV for 2- to 10-team NFL and NBA teasers.",
    calcInputs: [
      numberField("legs", "Number of Teams (Legs)", { default: 2, min: 2, max: 10 }),
      odds("teaserOdds", "Teaser Odds (American)", -120),
      currencyField("stake", "Stake", { default: 100, max: 1000000 }),
      percentField("legWinProb", "Your Win Probability per Teased Leg", { default: 72, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Payout", format: "currency" },
    calcResults: [cur("payout", "Payout", true), cur("profit", "Profit"), pct("breakEvenPerLeg", "Break-Even Win Rate per Leg"), pct("chanceAllLegsWin", "Chance All Legs Win"), cur("expectedValue", "Expected Value")],
    instructions: "Enter the number of teams, the teaser price your book offers, your stake and how often you expect each teased leg to win.",
    examples: "Example: a 2-team 6-point teaser at −120 needs each leg to win 73.85% to break even. At 72% per leg it's worth −$4.96 per $100.",
    assumptions: "Legs treated as independent. Teaser prices vary by book and number of points (common: 2-team 6-point at −110 to −130). Classic 'Wong' NFL teasers crossing 3 and 7 historically win about 72–75% per leg. " + DISCLAIMER,
    faq: [
      { question: "What is a teaser bet?", answer: "A parlay where you move the point spread in your favour (e.g. 6 points in football) in exchange for a lower payout." },
      { question: "Which teasers are best?", answer: "NFL teasers that move a line through both 3 and 7 — the most common winning margins — e.g. −7.5 to −1.5 or +1.5 to +7.5." },
    ],
  },
  {
    slug: "reverse-bet-calculator",
    title: "Reverse Bet Calculator",
    description: "See every outcome of an if-bet reverse on two selections — both win, one wins, both lose — and the total risk.",
    metaTitle: "Reverse Bet Calculator — If-Bet Reverse Payouts",
    metaDescription: "Free reverse bet calculator. Get the profit or loss for every outcome of an if-bet reverse and the total amount at risk.",
    calcInputs: [currencyField("stake", "Stake per If-Bet", { default: 100, max: 1000000 }), odds("oddsA", "Bet A Odds (American)", -110), odds("oddsB", "Bet B Odds (American)", 150)],
    calcResult: { label: "Both Win", format: "currency" },
    calcResults: [cur("bothWinProfit", "Both Win — Profit", true), cur("aWinsBLosesProfit", "A Wins, B Loses"), cur("bWinsALosesProfit", "B Wins, A Loses"), cur("bothLoseProfit", "Both Lose"), cur("totalRisk", "Total Risk")],
    instructions: "Enter the stake for each if-bet and the American odds of both selections.",
    examples: "Example: a $100 reverse on A at −110 and B at +150 wins $481.82 if both win, loses $109.09 if only A wins, $50 if only B wins and $200 if both lose.",
    assumptions: "A reverse is two if-bets: A then B, and B then A. Each if-bet risks the stake on its first leg; the second leg only goes ahead if the first wins. Pushes usually still trigger the next bet — check your book's rules. " + DISCLAIMER,
    faq: [
      { question: "Is a reverse bet better than a parlay?", answer: "It's less risky — one loss doesn't wipe out everything — but the payout when both win is lower than a parlay." },
      { question: "Why risk twice the stake?", answer: "Because two separate if-bets are placed, each with its own stake." },
    ],
  },
  {
    slug: "each-way-bet-calculator",
    title: "Each Way Bet Calculator",
    description: "Settle an each-way single or each-way double: win and place parts, place odds from the terms (1/4, 1/5, 1/3) and your return.",
    metaTitle: "Each Way Bet Calculator — Place Odds & Returns",
    metaDescription: "Free each way calculator. Get place odds, win and place returns for each-way singles and doubles at 1/4, 1/5 or 1/3 terms.",
    calcInputs: [
      dropdown("selections", "Bet", [["Each-way single", 1], ["Each-way double", 2]], 1),
      currencyField("stakePerPart", "Stake per Part (Win and Place Each)", { default: 5, max: 100000, step: 0.5 }),
      dropdown("placeTerms", "Place Terms", [["1/4 the odds", 1], ["1/5 the odds", 2], ["1/3 the odds", 3]], 2),
      numberField("odds1", "Selection 1 Decimal Odds", { default: 6, min: 1.01, max: 1000, step: 0.01 }),
      dropdown("result1", "Selection 1 Result", [["Won", 1], ["Placed", 2], ["Lost", 3]], 1),
      numberField("odds2", "Selection 2 Decimal Odds (Double)", { default: 4, min: 1.01, max: 1000, step: 0.01, required: false }),
      dropdown("result2", "Selection 2 Result (Double)", [["Won", 1], ["Placed", 2], ["Lost", 3]], 1),
    ],
    calcResult: { label: "Total Return", format: "currency" },
    calcResults: [cur("totalReturn", "Total Return", true), cur("profit", "Profit"), cur("totalStake", "Total Stake"), cur("winPartReturn", "Win Part Return"), cur("placePartReturn", "Place Part Return"), num("placeOdds1", "Place Odds, Selection 1 (Decimal)")],
    instructions: "Enter the stake per part (an each-way bet is two bets), the place terms and each selection's decimal odds and result.",
    examples: "Example: $5 each way ($10 total) on a 5/1 shot (6.00) at 1/5 terms that wins returns $40 — $30 from the win part and $10 from the place part at place odds of 2.00.",
    assumptions: "Place odds = 1 + (decimal odds − 1) × terms. A double needs every selection to win (win part) or place (place part). Rule 4 deductions and dead heats aren't included. Also covers the each way double and place odds calculators. " + DISCLAIMER,
    faq: [
      { question: "What does each way mean?", answer: "Two equal bets: one to win and one to place. If the horse wins you collect both; if it only places, you collect the place part." },
      { question: "How many places pay?", answer: "Usually 2 places in 5–7 runners, 3 in 8+ runners, and 4 in big handicaps of 16+ runners — check the terms." },
    ],
  },
  {
    slug: "martingale-calculator",
    title: "Martingale Calculator",
    description: "See how the Martingale betting system escalates: the next stake after a losing streak, total losses, how many losses your bankroll covers and the chance of a ruinous run.",
    metaTitle: "Martingale Calculator — Stake & Bankroll Risk",
    metaDescription: "Free Martingale calculator. See stakes after a losing streak, total losses, how many losses your bankroll survives and the risk.",
    calcInputs: [
      currencyField("baseStake", "Base Stake", { default: 10, max: 100000 }),
      numberField("decimalOdds", "Decimal Odds", { default: 2, min: 1.01, max: 100, step: 0.01 }),
      numberField("losingStreak", "Losing Streak So Far", { default: 5, max: 50 }),
      currencyField("bankroll", "Bankroll", { default: 1000, max: 100000000 }),
      percentField("winProb", "Win Probability per Bet", { default: 48.6, max: 99, step: 0.1 }),
    ],
    calcResult: { label: "Next Stake", format: "currency" },
    calcResults: [cur("nextStake", "Next Stake", true), cur("totalLostAfterStreak", "Total Lost in the Streak"), num("lossesBankrollCovers", "Losses in a Row Your Bankroll Covers"), pct("chanceOfStreak", "Chance of This Streak"), pct("chanceToBustInARow", "Chance of Losing Enough in a Row to Bust")],
    instructions: "Enter your base stake, the odds, your current losing streak, your bankroll and the win probability (48.6% is a European roulette even-money bet).",
    examples: "Example: starting at $10 on even money, after 5 losses you've lost $310 and must bet $320 next. A $1,000 bankroll survives only 6 losses — a run that happens 1.84% of the time at 48.6%.",
    assumptions: "Each stake recovers all losses plus one base-stake profit: stake = (losses + base × (odds − 1)) ÷ (odds − 1). Martingale never changes the house edge — it trades many small wins for rare, very large losses. Table limits stop it too. " + DISCLAIMER,
    faq: [
      { question: "Does the Martingale system work?", answer: "No — it can't overcome a negative-EV game. A long losing streak eventually wipes out the gains, and stakes grow very fast." },
      { question: "How fast do Martingale stakes grow?", answer: "They double at even money: $10, $20, $40, $80, $160, $320, $640 — 7 losses need $1,270 in total." },
    ],
  },
  {
    slug: "fibonacci-betting-calculator",
    title: "Fibonacci Betting Calculator",
    description: "Follow the Fibonacci betting system: your next stake after a run of losses, total lost so far, the stake after a win and how many losses your bankroll covers.",
    metaTitle: "Fibonacci Betting Calculator — Stake Sequence",
    metaDescription: "Free Fibonacci betting calculator. Get the next stake, losses so far, stake after a win and bankroll limit in the Fibonacci system.",
    calcInputs: [currencyField("unit", "Base Unit", { default: 10, max: 100000 }), numberField("lossesInARow", "Losses in a Row", { default: 5, max: 50 }), currencyField("bankroll", "Bankroll", { default: 1000, max: 100000000 })],
    calcResult: { label: "Next Stake", format: "currency" },
    calcResults: [cur("nextStake", "Next Stake", true), cur("totalLostSoFar", "Total Lost So Far"), cur("stakeAfterNextWin", "Stake After Your Next Win (Two Steps Back)"), num("lossesBankrollCovers", "Losses in a Row Your Bankroll Covers")],
    instructions: "Enter your base unit, how many bets in a row you've lost and your bankroll.",
    examples: "Example: with a $10 unit, after 5 losses (1, 1, 2, 3, 5 units) you've lost $120 and the next stake is $80. A win sends you back two steps to $30; $1,000 covers 9 losses in a row.",
    assumptions: "Sequence 1, 1, 2, 3, 5, 8, 13 … units; move one step forward after a loss and two steps back after a win. Like all progressions, it can't beat a negative-EV game. " + DISCLAIMER,
    faq: [
      { question: "Is Fibonacci safer than Martingale?", answer: "Stakes rise more slowly, so it lasts longer, but a long losing run still causes big losses and it doesn't change the odds." },
      { question: "When does a Fibonacci cycle end?", answer: "When you return to the start of the sequence — usually after two wins for each loss along the way." },
    ],
  },
  {
    slug: "prop-bet-calculator",
    title: "Prop Bet Calculator",
    description: "Find the edge on an over/under prop bet — including player props — from your projection: over, under and push probability, EV of each side and the fair price.",
    metaTitle: "Prop Bet Calculator — Player Prop EV & Odds",
    metaDescription: "Free prop bet calculator. Compare a prop line with your projection to get over/under probability, EV and fair odds.",
    calcInputs: [
      numberField("line", "Prop Line", { default: 24.5, min: -1000, max: 10000, step: 0.5 }),
      numberField("projection", "Your Projection", { default: 26.5, min: -1000, max: 10000, step: 0.1 }),
      numberField("standardDeviation", "Typical Variation (Standard Deviation)", { default: 6, min: 0.1, max: 1000, step: 0.1 }),
      odds("overOdds", "Over Odds (American)", -115),
      odds("underOdds", "Under Odds (American)", -105),
    ],
    calcResult: { label: "Over Probability", format: "percentage" },
    calcResults: [pct("overProbability", "Over Probability", true), pct("underProbability", "Under Probability"), pct("pushProbability", "Push Probability"), pct("overEvPercent", "Over EV"), pct("underEvPercent", "Under EV"), num("fairOverOdds", "Fair Over Odds (American)")],
    instructions: "Enter the prop line, your projection, how much the stat usually varies from game to game (its standard deviation) and the odds on each side.",
    examples: "Example: a 24.5-point line, a 26.5-point projection and a 6-point standard deviation give the over a 63% chance — +17.9% EV at −115 (fair price −171).",
    assumptions: "Stat outcomes modelled as a normal distribution; whole-number lines can push. Counting stats like strikeouts or touchdowns are skewed, so use this as a guide. Also covers the player prop calculator. " + DISCLAIMER,
    faq: [
      { question: "How do I get the standard deviation?", answer: "From the player's game logs — or roughly 25–30% of the average for points and yards." },
      { question: "Why compare with the fair price?", answer: "If the offered odds are better than the fair odds from your probability, the bet has positive expected value." },
    ],
  },
  {
    slug: "sports-betting-tax-calculator",
    title: "Sports Betting Tax Calculator",
    description: "Estimate US federal and state tax on sports betting winnings, the deductible losses (with the 90% limit from 2026) and whether 24% withholding applies.",
    metaTitle: "Sports Betting Tax Calculator — US Gambling Tax",
    metaDescription: "Free sports betting tax calculator. Estimate federal and state tax on gambling winnings, deductible losses and 24% withholding.",
    calcInputs: [
      currencyField("winnings", "Total Gambling Winnings for the Year", { default: 10000, max: 100000000 }),
      currencyField("losses", "Total Gambling Losses for the Year", { default: 4000, max: 100000000 }),
      dropdown("itemize", "Do You Itemize Deductions?", [["Yes", 1], ["No (standard deduction)", 0]], 1),
      percentField("lossDeductionPercent", "Share of Losses Deductible (90% from 2026)", { default: 90, max: 100 }),
      percentField("federalRate", "Your Federal Marginal Tax Rate", { default: 22, max: 37 }),
      percentField("stateRate", "Your State Tax Rate", { default: 5, max: 15, step: 0.1 }),
      currencyField("largestWin", "Largest Single Win", { default: 6000, max: 100000000 }),
      currencyField("largestWinWager", "Wager on That Win", { default: 10, max: 100000000 }),
    ],
    calcResult: { label: "Total Tax", format: "currency" },
    calcResults: [cur("totalTax", "Estimated Total Tax", true), cur("taxableWinnings", "Taxable Winnings"), cur("federalTax", "Federal Tax"), cur("stateTax", "State Tax"), cur("deductibleLosses", "Deductible Losses"), cur("federalWithholding", "24% Federal Withholding on the Big Win"), cur("netAfterTax", "Net After Losses and Tax")],
    instructions: "Enter your year's winnings and losses, whether you itemize, your tax rates and your largest single win and its wager.",
    examples: "Example: $10,000 of winnings and $4,000 of losses, itemizing, leaves $6,400 taxable (90% of losses deductible) — about $1,408 federal tax at 22% and $320 state tax at 5%. A $6,000 win on a $10 bet triggers $1,440 of withholding.",
    assumptions: "All gambling winnings are taxable income in the US. Losses are deductible only if you itemize, never beyond your winnings, and — under the 2025 tax law — only 90% of losses from tax year 2026. Withholding of 24% applies to sports wins of $5,000+ that are at least 300× the wager. Simplified: winnings are taxed at a single marginal rate; state rules vary. Not tax advice. " + DISCLAIMER,
    faq: [
      { question: "Do I pay tax on sports betting winnings?", answer: "Yes — in the US all gambling winnings are taxable income, whether or not you get a W-2G." },
      { question: "Can I deduct my betting losses?", answer: "Only if you itemize, and only up to your winnings. From 2026, just 90% of losses count." },
    ],
  },
  {
    slug: "football-squares-payout-calculator",
    title: "Football Squares Payout Calculator",
    description: "Work out football squares pool payouts for each quarter (Super Bowl squares and more), your cost, your chance of winning and your expected winnings.",
    metaTitle: "Football Squares Payout Calculator — Super Bowl",
    metaDescription: "Free football squares calculator. Split the pot by quarter, and see your cost, chance to win and expected winnings.",
    calcInputs: [
      currencyField("pricePerSquare", "Price per Square", { default: 10, max: 100000 }),
      percentField("housePercent", "Organizer's Cut (e.g. for Charity)", { default: 0, max: 50 }),
      dropdown("payoutStructure", "Payout Split", [["25% each quarter", 1], ["20/20/20/40", 2], ["12.5/25/12.5/50", 3], ["Halftime & final 50/50", 4], ["Final score only", 5]], 1),
      numberField("mySquares", "Squares You Own", { default: 5, min: 0, max: 100 }),
    ],
    calcResult: { label: "Total Pot", format: "currency" },
    calcResults: [cur("totalPot", "Total Pot", true), cur("q1Payout", "1st Quarter"), cur("halftimePayout", "Halftime"), cur("q3Payout", "3rd Quarter"), cur("finalPayout", "Final Score"), cur("yourCost", "Your Cost"), pct("chanceToWinAtLeastOne", "Chance to Win at Least Once"), cur("yourExpectedWinnings", "Your Expected Winnings")],
    instructions: "Enter the price per square, any organizer's cut, the payout split and how many of the 100 squares you own.",
    examples: "Example: a $10-a-square board makes a $1,000 pot — $250 each quarter. Owning 5 squares costs $50 and gives about an 18.6% chance of winning at least once.",
    assumptions: "100 squares, random digits. Chance assumes squares are equally likely; in reality some digit pairs (like 7-0, 0-0, 7-3) win far more often than others. " + DISCLAIMER,
    faq: [
      { question: "What are the best football squares numbers?", answer: "0, 3, 7 and 4 on either side are the most common final digits in NFL games; 2, 5 and 8 are the least common." },
      { question: "Is a squares pool legal?", answer: "Rules vary by state; many allow social pools where all the money is paid out. Check local law." },
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
