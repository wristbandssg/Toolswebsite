// One-time (but safe to re-run) batch setup script: creates the 11 tools of
// the sports betting sub-batch D (Lines, Markets & Horse Racing). See
// src/lib/calc-engine-betting-odds.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Sports Betting &
// Racing Calculators), and src/lib/calc-engine-betting-lines-racing.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-betting-lines-racing-calculators.ts
// or
//   npm run db:create-betting-lines-racing-calculators

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
  "For information and entertainment only — not betting, financial or tax advice. Sports and race betting is legal only in some places and only for adults (18+ or 21+ depending on where you live). Bet only what you can afford to lose. If gambling stops being fun, call or text 1-800-GAMBLER (US) for free, confidential help.";

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
const SPORTS: [string, number][] = [["NFL", 1], ["College football", 2], ["NBA", 3], ["College basketball", 4], ["MLB (run line)", 5], ["NHL (puck line)", 6]];
const odds = (key: string, label: string, def: number, required = true) => numberField(key, label, { default: def, min: -100000, max: 100000, step: 0.01, required });

const TOOLS: ToolDef[] = [
  {
    slug: "point-spread-calculator",
    title: "Point Spread Calculator",
    description: "Find your chance to cover a point spread — or MLB run line and NHL puck line — from your projected margin, plus push chance, EV and the fair price.",
    metaTitle: "Point Spread Calculator — Cover Probability & EV",
    metaDescription: "Free point spread calculator. Get cover probability, push chance, EV and fair odds for NFL, NBA, college, MLB run line and NHL puck line bets.",
    calcInputs: [
      dropdown("sport", "Sport", SPORTS, 1),
      numberField("spread", "Your Team's Spread (e.g. −6.5)", { default: -6.5, min: -100, max: 100, step: 0.5 }),
      odds("odds", "Odds (American)", -110),
      numberField("projectedMargin", "Your Projected Margin for Your Team", { default: 7.5, min: -100, max: 100, step: 0.5 }),
      numberField("customSd", "Margin Standard Deviation (0 = Sport Default)", { default: 0, max: 50, step: 0.1, required: false }),
    ],
    calcResult: { label: "Cover Probability", format: "percentage" },
    calcResults: [pct("coverProbability", "Chance to Cover", true), pct("pushProbability", "Chance of a Push"), pct("evPercent", "Expected Value"), pct("breakEvenProbability", "Break-Even Win Rate"), num("fairOdds", "Fair Odds (American)")],
    instructions: "Choose the sport, enter your team's spread and odds, and how many points you expect your team to win by (negative if you expect it to lose).",
    examples: "Example: laying −6.5 at −110 with a projected 7.5-point NFL win gives a 53% chance to cover — just above the 52.38% break-even, about +1.1% EV (fair price −113).",
    assumptions: "Final margins modelled as normal with sport-typical standard deviations: NFL 13.5, college football 16, NBA 12, college basketball 11, MLB 4.2 runs, NHL 2.4 goals. Whole-number spreads can push. NFL key numbers (3, 7) aren't modelled. Also covers the run line calculator. " + DISCLAIMER,
    faq: [
      { question: "What does −6.5 mean?", answer: "The team must win by 7 or more for the bet to win. +6.5 wins if the team loses by 6 or fewer — or wins." },
      { question: "What is a run line?", answer: "Baseball's point spread, almost always ±1.5 runs, usually priced away from −110." },
    ],
  },
  {
    slug: "spread-to-moneyline-calculator",
    title: "Spread To Moneyline Calculator",
    description: "Convert a point spread into win probability and the equivalent moneyline for the favourite and underdog, with or without the vig.",
    metaTitle: "Spread to Moneyline Calculator — Convert Spread",
    metaDescription: "Free spread to moneyline converter. Turn NFL, NBA, college, MLB or NHL point spreads into win probability and moneyline odds.",
    calcInputs: [dropdown("sport", "Sport", SPORTS, 1), numberField("spread", "Favourite's Spread (Points)", { default: 7, max: 50, step: 0.5 }), percentField("vigPercent", "Bookmaker Vig", { default: 4.5, max: 15, step: 0.5 })],
    calcResult: { label: "Favourite Win Probability", format: "percentage" },
    calcResults: [pct("favoriteWinProbability", "Favourite Win Probability", true), pct("underdogWinProbability", "Underdog Win Probability"), num("fairFavoriteMoneyline", "Fair Favourite Moneyline"), num("fairUnderdogMoneyline", "Fair Underdog Moneyline"), num("favoriteMoneylineWithVig", "Favourite Moneyline with Vig"), num("underdogMoneylineWithVig", "Underdog Moneyline with Vig")],
    instructions: "Choose the sport and enter how many points the favourite is giving.",
    examples: "Example: a 7-point NFL favourite wins about 70% of the time — a fair moneyline of −231 (underdog +231), or roughly −269 / +217 with a 4.5% vig.",
    assumptions: "Win probability = normal CDF of spread ÷ sport standard deviation (NFL 13.5, college football 16, NBA 12, college basketball 11, MLB 4.2, NHL 2.4). Real NFL conversions jump around key numbers 3 and 7. " + DISCLAIMER,
    faq: [
      { question: "Is the spread or the moneyline better?", answer: "Neither is always better — compare the moneyline with the spread's equivalent price and take whichever offers more value." },
      { question: "What moneyline matches a 3-point favourite?", answer: "In the NFL, roughly −150 to −165, because so many games are decided by exactly 3." },
    ],
  },
  {
    slug: "over-under-calculator",
    title: "Over/Under Calculator",
    description: "Price game totals: the chance of going over or under the line from your projected total, push chance and the EV of each side.",
    metaTitle: "Over/Under Calculator — Totals Probability & EV",
    metaDescription: "Free over/under calculator. Get over, under and push probability and EV for NFL, NBA, college, MLB and NHL totals.",
    calcInputs: [
      dropdown("sport", "Sport", SPORTS, 1),
      numberField("line", "Total Line", { default: 47.5, max: 400, step: 0.5 }),
      numberField("projectedTotal", "Your Projected Total", { default: 50, max: 400, step: 0.5 }),
      numberField("customSd", "Total Standard Deviation (0 = Sport Default)", { default: 0, max: 50, step: 0.1, required: false }),
      odds("overOdds", "Over Odds (American)", -110),
      odds("underOdds", "Under Odds (American)", -110),
    ],
    calcResult: { label: "Over Probability", format: "percentage" },
    calcResults: [pct("overProbability", "Over Probability", true), pct("underProbability", "Under Probability"), pct("pushProbability", "Push Probability"), pct("overEvPercent", "Over EV"), pct("underEvPercent", "Under EV")],
    instructions: "Choose the sport, enter the total line, your projected total and the odds on each side.",
    examples: "Example: an NFL total of 47.5 with a 50-point projection gives the over a 57% chance — +9.5% EV at −110.",
    assumptions: "Totals modelled as normal with sport-typical standard deviations: NFL 13.5, college football 16, NBA 18, college basketball 15, MLB 4.4, NHL 2.3. Weather, pace and injuries move totals — build them into your projection. " + DISCLAIMER,
    faq: [
      { question: "How do over/under bets work?", answer: "You bet on whether the combined score is above or below the bookmaker's line. Whole-number lines push if hit exactly." },
      { question: "Do overs or unders win more?", answer: "Over long periods, unders have hit slightly more often in several leagues, but it varies by season." },
    ],
  },
  {
    slug: "asian-handicap-calculator",
    title: "Asian Handicap Calculator",
    description: "Settle Asian handicap bets — whole, half and quarter lines (−0.25, −0.75, +1.25 …) — from the goal difference: full win, half win, push, half loss or loss.",
    metaTitle: "Asian Handicap Calculator — Quarter Lines Explained",
    metaDescription: "Free Asian handicap calculator. Settle whole, half and quarter lines and see the return, profit and result for any score.",
    calcInputs: [
      numberField("handicap", "Handicap (e.g. −0.75, +0.25)", { default: -0.75, min: -10, max: 10, step: 0.25 }),
      numberField("decimalOdds", "Decimal Odds", { default: 1.95, min: 1.01, max: 100, step: 0.01 }),
      currencyField("stake", "Stake", { default: 100, max: 1000000 }),
      numberField("goalDifference", "Final Goal Difference (Your Team − Opponent)", { default: 1, min: -20, max: 20 }),
    ],
    calcResult: { label: "Total Return", format: "currency" },
    calcResults: [cur("totalReturn", "Total Return", true), cur("profit", "Profit"), num("result", "Result (1 Win, 0.5 Half Win, 0 Push, −0.5 Half Loss, −1 Loss)"), cur("stakeOnEachLine", "Stake on Each Line"), num("splitLines", "Lines the Stake Is Split Over")],
    instructions: "Enter the handicap on your team, the decimal odds, your stake and the final goal difference from your team's side.",
    examples: "Example: $100 on −0.75 at 1.95 when your team wins by one goal is a half win — half the stake wins on −0.5, half is refunded on −1 — returning $147.50.",
    assumptions: "Quarter lines split the stake equally over the two nearest lines (−0.75 = −0.5 and −1). A whole-line tie refunds that part. " + DISCLAIMER,
    faq: [
      { question: "What does −0.25 mean?", answer: "Half your stake is on 0 (draw no bet) and half on −0.5. A draw loses half the stake and refunds the other half." },
      { question: "Why bet Asian handicaps?", answer: "They remove or reduce the draw, giving two-way markets with lower margins than 1X2 betting." },
    ],
  },
  {
    slug: "draw-no-bet-calculator",
    title: "Draw No Bet Calculator",
    description: "Work out draw no bet odds from the 1X2 (home/draw/away) prices — your stake is refunded on a draw — and the profit if your team wins.",
    metaTitle: "Draw No Bet Calculator — DNB Odds from 1X2",
    metaDescription: "Free draw no bet calculator. Convert home, draw and away odds into draw-no-bet odds and profit.",
    calcInputs: [numberField("homeOdds", "Home Win Odds (Decimal)", { default: 2.1, min: 1.01, max: 100, step: 0.01 }), numberField("drawOdds", "Draw Odds (Decimal)", { default: 3.4, min: 1.01, max: 100, step: 0.01 }), numberField("awayOdds", "Away Win Odds (Decimal)", { default: 3.6, min: 1.01, max: 100, step: 0.01 }), currencyField("stake", "Stake", { default: 100, max: 1000000 })],
    calcResult: { label: "Home DNB Odds", format: "number" },
    calcResults: [num("homeDnbOdds", "Home Draw No Bet Odds", true), num("awayDnbOdds", "Away Draw No Bet Odds"), cur("homeDnbProfit", "Profit on Home DNB"), cur("awayDnbProfit", "Profit on Away DNB"), cur("drawCoverStake", "Draw Stake to Build DNB Yourself")],
    instructions: "Enter the three 1X2 decimal odds and your stake.",
    examples: "Example: home 2.10, draw 3.40, away 3.60 gives draw no bet odds of 1.48 (home) and 2.54 (away). $100 on the home DNB wins $48.24.",
    assumptions: "DNB odds = win odds × (1 − 1 ÷ draw odds). You can build it yourself by backing the win and putting stake ÷ draw odds on the draw. Equivalent to Asian handicap 0. " + DISCLAIMER,
    faq: [
      { question: "What is draw no bet?", answer: "A bet on a team to win where a draw refunds your stake, so there are only two outcomes that count." },
      { question: "Is draw no bet the same as Asian handicap 0?", answer: "Yes — both refund the stake on a draw." },
    ],
  },
  {
    slug: "double-chance-calculator",
    title: "Double Chance Calculator",
    description: "Calculate double chance odds — home or draw (1X), draw or away (X2), home or away (12) — from the 1X2 prices, plus the bookmaker margin.",
    metaTitle: "Double Chance Calculator — 1X, X2, 12 Odds",
    metaDescription: "Free double chance calculator. Convert home, draw and away odds into 1X, X2 and 12 double chance odds.",
    calcInputs: [numberField("homeOdds", "Home Win Odds (Decimal)", { default: 2.1, min: 1.01, max: 100, step: 0.01 }), numberField("drawOdds", "Draw Odds (Decimal)", { default: 3.4, min: 1.01, max: 100, step: 0.01 }), numberField("awayOdds", "Away Win Odds (Decimal)", { default: 3.6, min: 1.01, max: 100, step: 0.01 })],
    calcResult: { label: "1X Odds", format: "number" },
    calcResults: [num("homeOrDrawOdds", "Home or Draw (1X)", true), num("drawOrAwayOdds", "Draw or Away (X2)"), num("homeOrAwayOdds", "Home or Away (12)"), pct("homeOrDrawProbability", "Implied Chance of 1X"), pct("bookMarginPercent", "Bookmaker Margin")],
    instructions: "Enter the three 1X2 decimal odds.",
    examples: "Example: home 2.10, draw 3.40, away 3.60 gives double chance odds of 1.30 (1X), 1.75 (X2) and 1.33 (12) — the 1X2 market carries a 4.81% margin.",
    assumptions: "Double chance odds = 1 ÷ (1/odds A + 1/odds B). The bookmaker's margin carries over; actual double chance prices may be slightly different. " + DISCLAIMER,
    faq: [
      { question: "What is a double chance bet?", answer: "One bet that covers two of the three results in a football match, so it wins more often at shorter odds." },
      { question: "When is double chance useful?", answer: "Backing an underdog not to lose (X2), or a favourite in a tight game where you want draw protection (1X)." },
    ],
  },
  {
    slug: "horse-racing-bet-calculator",
    title: "Horse Racing Bet Calculator",
    description: "Calculate the cost of exacta, quinella, trifecta and superfecta bets — straight, box or key — and the number of combinations.",
    metaTitle: "Horse Racing Bet Calculator — Exacta, Trifecta Box",
    metaDescription: "Free horse racing bet calculator for exacta, quinella, trifecta and superfecta boxes and keys — combinations and total cost.",
    calcInputs: [
      dropdown("betType", "Bet Type", [["Exacta (1st and 2nd in order)", 1], ["Quinella (1st and 2nd any order)", 2], ["Trifecta (1st, 2nd, 3rd in order)", 3], ["Superfecta (1st–4th in order)", 4]], 3),
      dropdown("structure", "Structure", [["Straight (one combination)", 1], ["Box (all orders)", 2], ["Key (one horse on top)", 3]], 2),
      numberField("horses", "Horses in the Box", { default: 4, min: 2, max: 20 }),
      numberField("keyWith", "Key: Number of Horses Under Your Key", { default: 4, min: 1, max: 20, required: false }),
      currencyField("baseBet", "Base Bet per Combination", { default: 1, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [cur("totalCost", "Total Ticket Cost", true), num("combinations", "Combinations"), cur("costPerCombination", "Cost per Combination")],
    instructions: "Choose the bet, how it's structured, the number of horses and the base bet amount.",
    examples: "Example: a $1 trifecta box with 4 horses is 24 combinations — $24. A $1 exacta box with 3 horses is 6 combinations ($6).",
    assumptions: "Box combinations: exacta n(n−1), quinella n(n−1)/2, trifecta n(n−1)(n−2), superfecta n(n−1)(n−2)(n−3). A key puts one horse on top of the others. Minimum bets vary by track ($0.10 superfectas are common). Also covers the exacta, quinella and trifecta & superfecta calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a trifecta box?", answer: "A bet that your chosen horses finish 1st, 2nd and 3rd in any order — it covers every order, so the cost multiplies." },
      { question: "Is a key cheaper than a box?", answer: "Yes — keying one horse on top removes all combinations where it doesn't win." },
    ],
  },
  {
    slug: "pick-4-calculator",
    title: "Pick 4 Calculator",
    description: "Price a Pick 4 ticket — or a daily double, Pick 3, Pick 5 or Pick 6 — from the horses you use in each leg and the base bet.",
    metaTitle: "Pick 4 Calculator — Pick 3, Pick 6 & Daily Double",
    metaDescription: "Free Pick 4 calculator. Get combinations and ticket cost for daily double, Pick 3, Pick 4, Pick 5 and Pick 6 bets.",
    calcInputs: [
      dropdown("betType", "Bet", [["Daily double (2 races)", 1], ["Pick 3", 2], ["Pick 4", 3], ["Pick 5", 4], ["Pick 6", 5]], 3),
      ...[2, 3, 1, 4, 1, 1].map((d, i) => numberField(`leg${i + 1}`, `Horses in Leg ${i + 1}`, { default: d, min: 1, max: 20, required: i < 2 })),
      currencyField("baseBet", "Base Bet", { default: 0.5, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Ticket Cost", format: "currency" },
    calcResults: [cur("totalCost", "Ticket Cost", true), num("combinations", "Combinations"), num("legs", "Legs")],
    instructions: "Choose the bet and enter how many horses you're using in each leg, plus the base bet. Extra legs beyond the bet are ignored.",
    examples: "Example: a 50-cent Pick 4 using 2, 3, 1 and 4 horses is 24 combinations — a $12 ticket.",
    assumptions: "Combinations = product of horses in each leg. Base bets of $0.50 (Pick 4/5) and $0.20–$2 (Pick 6, jackpots) are common; check the track. Also covers the Pick 3, Pick 6 and daily double calculators. " + DISCLAIMER,
    faq: [
      { question: "How do I make a Pick 4 cheaper?", answer: "Single a strong horse in one or two legs and spread in the most open races." },
      { question: "What is a daily double?", answer: "Picking the winners of two consecutive races — effectively a Pick 2." },
    ],
  },
  {
    slug: "pari-mutuel-calculator",
    title: "Pari Mutuel Calculator",
    description: "Calculate horse racing payouts in a pari-mutuel (tote) pool from the pool size, takeout and money bet on your horse — or straight from the odds board.",
    metaTitle: "Pari Mutuel Calculator — Horse Racing Payout",
    metaDescription: "Free pari-mutuel calculator. Work out win payouts per $2 from the pool and takeout, or from tote board odds, with breakage.",
    calcInputs: [
      dropdown("mode", "Calculate From", [["Pool size and takeout", 1], ["Tote board odds", 2]], 1),
      currencyField("winPool", "Total Win Pool", { default: 100000, max: 100000000 }),
      percentField("takeoutPercent", "Track Takeout", { default: 17, max: 40, step: 0.5 }),
      currencyField("betOnHorse", "Amount Bet on Your Horse", { default: 15000, max: 100000000 }),
      numberField("oddsToOne", "Board Odds (X to 1, e.g. 2.5 for 5-2)", { default: 5, max: 999, step: 0.1, required: false }),
      currencyField("yourBet", "Your Bet", { default: 2, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Payout per $2", format: "currency" },
    calcResults: [cur("payoutPer2", "Payout per $2", true), cur("yourPayout", "Your Payout"), cur("yourProfit", "Your Profit"), num("oddsToOne", "Final Odds (X to 1)"), pct("impliedProbability", "Implied Probability")],
    instructions: "Choose whether to work from the pool or the tote board. For the pool, enter the win pool, the track takeout and how much is bet on your horse.",
    examples: "Example: a $100,000 win pool with 17% takeout and $15,000 on your horse pays $11.00 for a $2 win ticket — about 4.5-to-1.",
    assumptions: "Payout = pool × (1 − takeout) ÷ money on your horse, rounded down to 10 cents per $2 (breakage), minimum $2.10. Place and show pools are shared between 2 or 3 horses and aren't covered here. Also covers the horse racing payout calculator. " + DISCLAIMER,
    faq: [
      { question: "What is pari-mutuel betting?", answer: "All bets go into a pool; the track takes its cut and the rest is shared by the winners — so odds change until the race starts." },
      { question: "What is takeout?", answer: "The track's commission, typically 15–20% of win pools and 20–25%+ on exotic bets." },
    ],
  },
  {
    slug: "horse-racing-pace-calculator",
    title: "Horse Racing Pace Calculator",
    description: "Analyse a race's pace from fractional times — quarter splits, final fraction, seconds per furlong, speed — and a beaten horse's time from lengths behind.",
    metaTitle: "Horse Racing Pace Calculator — Fractions & Splits",
    metaDescription: "Free horse racing pace calculator. Get splits, final fraction, seconds per furlong, mph and a beaten horse's time.",
    calcInputs: [
      numberField("furlongs", "Race Distance (Furlongs)", { default: 6, min: 2, max: 20, step: 0.5 }),
      numberField("quarterTime", "First Quarter Time (s)", { default: 22.4, max: 60, step: 0.01 }),
      numberField("halfTime", "Half-Mile Time (s)", { default: 45.6, max: 120, step: 0.01 }),
      numberField("finalTime", "Final Time (s)", { default: 70.2, max: 400, step: 0.01 }),
      numberField("lengthsBehind", "Your Horse's Lengths Behind the Winner", { default: 0, max: 50, step: 0.25, required: false }),
    ],
    calcResult: { label: "Your Horse's Time", format: "number" },
    calcResults: [num("yourHorseTime", "Your Horse's Time (s)", true), num("secondQuarter", "Second Quarter Split (s)"), num("finalFraction", "Final Fraction (s)"), num("secondsPerFurlong", "Seconds per Furlong"), num("speedMph", "Average Speed (mph)"), num("feetPerSecond", "Feet per Second"), pct("earlyPaceShare", "Half-Mile Time as % of Final Time")],
    instructions: "Enter the race distance and the fractional times (in seconds; 1:10.20 = 70.2), and how many lengths your horse finished behind.",
    examples: "Example: fractions of 22.40 and 45.60 and a final 1:10.20 for 6 furlongs mean a 23.20 second quarter, a 24.60 final fraction, 11.7 seconds per furlong and about 38.5 mph.",
    assumptions: "One furlong = 660 ft (1/8 mile). Beaten lengths converted at 1 length ≈ 0.2 s. A slow final fraction after fast early splits signals a pace collapse — good for closers. " + DISCLAIMER,
    faq: [
      { question: "What is a fast pace in a sprint?", answer: "For a 6-furlong dirt sprint, a first quarter under 22 seconds and a half under 45 is fast at most US tracks." },
      { question: "How many seconds is a length?", answer: "Traditionally one-fifth of a second, though some handicappers use 0.15–0.17 s at sprint speeds." },
    ],
  },
  {
    slug: "horse-racing-handicapping-calculator",
    title: "Horse Racing Handicapping Calculator",
    description: "Turn your win chances for up to four horses into a fair odds line and compare it with the tote board to find overlays (value bets) and underlays.",
    metaTitle: "Horse Racing Handicapping Calculator — Odds Line",
    metaDescription: "Free handicapping calculator. Build a fair odds line from your win percentages and find overlays against the tote board.",
    calcInputs: [1, 2, 3, 4].flatMap((i) => [
      percentField(`prob${i}`, `Horse ${i} — Your Win Chance`, { default: [30, 25, 15, 10][i - 1], max: 100, step: 0.5 }),
      numberField(`odds${i}`, `Horse ${i} — Board Odds (X to 1)`, { default: [2.5, 4, 6, 12][i - 1], max: 999, step: 0.1 }),
    ]),
    calcResult: { label: "Horse 1 EV", format: "percentage" },
    calcResults: [pct("ev1", "Horse 1 — Value (EV per $1)", true), num("fairOdds1", "Horse 1 — Fair Odds (X to 1)"), pct("ev2", "Horse 2 — Value"), num("fairOdds2", "Horse 2 — Fair Odds"), pct("ev3", "Horse 3 — Value"), num("fairOdds3", "Horse 3 — Fair Odds"), pct("ev4", "Horse 4 — Value"), num("fairOdds4", "Horse 4 — Fair Odds"), pct("totalProbability", "Total of Your Win Chances")],
    instructions: "Enter your estimated chance of winning for each horse you're considering and its current odds on the tote board.",
    examples: "Example: a horse you give 25% is fair at 3-1; at 4-1 on the board it's a 25% overlay. Your 30% favourite at 5-2 is only a 5% overlay.",
    assumptions: "Fair odds = 100 ÷ win % − 1. Value per $1 = win chance × (odds + 1) − 1; positive = overlay. Your percentages for the whole field should add to about 100%; tote odds change until post time and don't show the final payout. " + DISCLAIMER,
    faq: [
      { question: "What is an overlay?", answer: "A horse whose odds pay more than its real chance of winning justifies — the only bets that win over the long run." },
      { question: "How do handicappers set an odds line?", answer: "By rating each horse on speed, pace, class and form, turning the ratings into win percentages that add up to 100%." },
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
