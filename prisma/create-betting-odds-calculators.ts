// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the sports betting sub-batch A (Odds, Value & Bankroll). See
// src/lib/calc-engine-betting-odds.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Sports Betting &
// Racing Calculators), and src/lib/calc-engine-betting-odds.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-betting-odds-calculators.ts
// or
//   npm run db:create-betting-odds-calculators

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
const FMT3: [string, number][] = [...FMT2, ["Fractional (5/2)", 3]];
const odds = (key: string, label: string, def: number, required = true) => numberField(key, label, { default: def, min: -100000, max: 100000, step: 0.01, required });

const TOOLS: ToolDef[] = [
  {
    slug: "betting-odds-calculator",
    title: "Betting Odds Calculator",
    description: "Calculate your payout and profit from any bet — American (moneyline), decimal or fractional odds — plus the implied probability and the odds in every format.",
    metaTitle: "Betting Odds Calculator — Payout & Profit",
    metaDescription: "Free betting odds calculator. Enter American, decimal or fractional odds and your stake to see payout, profit and implied probability.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT3, 1),
      odds("odds", "Odds (American or Decimal)", -110),
      numberField("fracNum", "Fractional Odds — First Number (e.g. 5 in 5/2)", { default: 5, max: 1000, required: false }),
      numberField("fracDen", "Fractional Odds — Second Number (e.g. 2 in 5/2)", { default: 2, min: 1, max: 1000, required: false }),
      currencyField("stake", "Stake", { default: 100, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Total Payout", format: "currency" },
    calcResults: [cur("totalPayout", "Total Payout (Stake + Profit)", true), cur("profit", "Profit"), pct("impliedProbability", "Implied Probability"), num("decimalOdds", "Decimal Odds"), num("americanOdds", "American Odds"), num("fractionalToOne", "Fractional Odds (X to 1)")],
    instructions: "Choose the odds format, enter the odds (for fractional odds, fill in the two numbers instead) and your stake.",
    examples: "Example: $100 on −110 pays $190.91 — $90.91 profit — with an implied probability of 52.38%. At +150 the same $100 pays $250.",
    assumptions: "Decimal = 1 + American ÷ 100 for positive odds, 1 + 100 ÷ |American| for negative; payout = stake × decimal. Also covers the American odds, moneyline, decimal odds, fractional odds, bet return and MMA odds calculators. " + DISCLAIMER,
    faq: [
      { question: "What does −110 mean?", answer: "You risk $110 to win $100 (or $10 to win $9.09). Negative odds show how much you must stake to win $100." },
      { question: "What does +150 mean?", answer: "A $100 bet wins $150 profit — $250 back in total. Positive odds show the profit on a $100 stake." },
    ],
  },
  {
    slug: "odds-converter-calculator",
    title: "Odds Converter Calculator",
    description: "Convert betting odds between American, decimal, fractional, Hong Kong, Indonesian and Malay formats, with the implied probability.",
    metaTitle: "Odds Converter — American, Decimal, Fractional",
    metaDescription: "Free odds converter. Convert American, decimal and fractional odds plus Hong Kong, Indonesian and Malay odds and implied probability.",
    calcInputs: [
      dropdown("oddsFormat", "Convert From", FMT3, 1),
      odds("odds", "Odds (American or Decimal)", 150),
      numberField("fracNum", "Fractional — First Number", { default: 3, max: 1000, required: false }),
      numberField("fracDen", "Fractional — Second Number", { default: 2, min: 1, max: 1000, required: false }),
    ],
    calcResult: { label: "Decimal Odds", format: "number" },
    calcResults: [num("decimalOdds", "Decimal Odds", true, 3), num("americanOdds", "American Odds"), num("fractionalToOne", "Fractional (X to 1)"), pct("impliedProbability", "Implied Probability"), num("hongKongOdds", "Hong Kong Odds"), num("indonesianOdds", "Indonesian Odds"), num("malayOdds", "Malay Odds")],
    instructions: "Pick the format you have and enter the odds.",
    examples: "Example: +150 is 2.50 decimal, 3/2 (1.5 to 1) fractional, 1.50 Hong Kong, 1.50 Indonesian and −0.67 Malay — a 40% implied probability.",
    assumptions: "Hong Kong = decimal − 1; Indonesian = American ÷ 100; Malay = Hong Kong odds up to 1, otherwise −1 ÷ Hong Kong odds. Fractional is shown as X to 1. " + DISCLAIMER,
    faq: [
      { question: "Which odds format is best?", answer: "They all describe the same price. Decimal is easiest for maths; American is standard in the US; fractional in UK horse racing." },
      { question: "How do I convert fractional to decimal?", answer: "Divide the first number by the second and add 1 — 5/2 is 2.5 + 1 = 3.50." },
    ],
  },
  {
    slug: "implied-probability-calculator",
    title: "Implied Probability Calculator",
    description: "Turn betting odds into implied probability — the break-even win rate you need for a bet to be profitable (also a break even calculator).",
    metaTitle: "Implied Probability Calculator — Break-Even Win %",
    metaDescription: "Free implied probability calculator. Convert American or decimal odds into implied probability and break-even win rate.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 1), odds("odds", "Odds", -110)],
    calcResult: { label: "Implied Probability", format: "percentage" },
    calcResults: [pct("impliedProbability", "Implied Probability", true), pct("breakEvenWinRate", "Break-Even Win Rate"), num("winsNeededPer100Bets", "Wins Needed per 100 Bets"), num("decimalOdds", "Decimal Odds"), num("profitPer100Staked", "Profit per 100 Staked When It Wins")],
    instructions: "Enter the odds in American or decimal format.",
    examples: "Example: −110 implies 52.38% — you must win 52.4 of every 100 bets at −110 just to break even.",
    assumptions: "Implied probability = 1 ÷ decimal odds. It includes the bookmaker's margin — use the No-Vig Calculator for the fair probability. " + DISCLAIMER,
    faq: [
      { question: "Why is 52.38% the magic number?", answer: "It's the break-even win rate at standard −110 odds, because you risk $110 to win $100." },
      { question: "Is implied probability the true chance?", answer: "No — it's the bookmaker's price, which includes their margin. Your edge comes from estimating the true chance better." },
    ],
  },
  {
    slug: "no-vig-calculator",
    title: "No-Vig (Fair Odds) Calculator",
    description: "Remove the vig (juice) from a two-way or three-way market to find the fair probabilities and fair odds, and see the bookmaker's margin.",
    metaTitle: "No-Vig Calculator — Fair Odds & Vig %",
    metaDescription: "Free no-vig fair odds calculator. Remove the juice from 2- or 3-way odds to get true probabilities, fair odds and the vig percentage.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 1), odds("oddsA", "Side A Odds", -110), odds("oddsB", "Side B Odds", -110), odds("oddsC", "Side C Odds (Draw — 0 if Two-Way)", 0, false)],
    calcResult: { label: "Vig", format: "percentage" },
    calcResults: [pct("vigPercent", "Bookmaker Margin (Vig)", true), pct("fairProbabilityA", "Fair Probability A"), pct("fairProbabilityB", "Fair Probability B"), pct("fairProbabilityC", "Fair Probability C"), num("fairDecimalA", "Fair Decimal Odds A"), num("fairDecimalB", "Fair Decimal Odds B"), num("fairAmericanA", "Fair American Odds A"), num("fairAmericanB", "Fair American Odds B")],
    instructions: "Enter the odds for every outcome in the market — two sides, or three for soccer 1X2 markets.",
    examples: "Example: −110 on both sides has a 4.76% vig. Removing it leaves a fair 50% each — fair odds of +100 (2.00).",
    assumptions: "Proportional (multiplicative) de-vig: fair probability = implied ÷ sum of implied. Other methods (power, Shin) shift a little more margin onto longshots. " + DISCLAIMER,
    faq: [
      { question: "What is vig or juice?", answer: "The bookmaker's built-in margin — the reason both sides of a coin-flip are priced at −110 instead of +100." },
      { question: "How do bettors use no-vig odds?", answer: "As the fair price to beat: if another book offers better odds than the no-vig price from a sharp book, the bet may be +EV." },
    ],
  },
  {
    slug: "expected-value-calculator",
    title: "Expected Value Calculator",
    description: "Calculate the expected value (EV) of a bet or parlay from the odds and your own win probability — how much you should win or lose on average.",
    metaTitle: "Expected Value (EV) Calculator — Bets & Parlays",
    metaDescription: "Free betting EV calculator. Find the expected value, EV %, and edge of a single bet or a parlay from odds and your win probability.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      currencyField("stake", "Stake", { default: 100, max: 1000000, step: 1 }),
      odds("odds1", "Leg 1 Odds", 150),
      percentField("winProb1", "Leg 1 Win Probability", { default: 45, max: 100, step: 0.5 }),
      odds("odds2", "Leg 2 Odds (0 = Single Bet)", 0, false),
      percentField("winProb2", "Leg 2 Win Probability", { default: 50, max: 100, step: 0.5 }),
      odds("odds3", "Leg 3 Odds (0 = None)", 0, false),
      percentField("winProb3", "Leg 3 Win Probability", { default: 50, max: 100, step: 0.5 }),
      odds("odds4", "Leg 4 Odds (0 = None)", 0, false),
      percentField("winProb4", "Leg 4 Win Probability", { default: 50, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Expected Value", format: "currency" },
    calcResults: [cur("expectedValue", "Expected Value", true), pct("evPercent", "EV as % of Stake"), pct("winProbability", "Chance the Bet Wins"), cur("payoutIfWin", "Payout if It Wins"), pct("impliedProbability", "Implied Probability"), num("edge", "Your Edge (Percentage Points)")],
    instructions: "Enter your stake, the odds and your honest estimate of the chance each leg wins. Add legs 2–4 for a parlay.",
    examples: "Example: $100 at +150 (40% implied) on a bet you think wins 45% of the time is worth +$12.50 — a 12.5% edge in EV terms.",
    assumptions: "EV = stake × (decimal odds × win probability − 1); parlay legs are treated as independent. Your EV is only as good as your probability estimates. Also covers the parlay EV calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a +EV bet?", answer: "A bet whose odds pay more than the true chance of winning justifies — over many bets it should show a profit." },
      { question: "Why are most parlays −EV?", answer: "The bookmaker's margin compounds on every leg, so a 3-leg parlay at −110 per leg carries roughly three times the vig." },
    ],
  },
  {
    slug: "kelly-criterion-calculator",
    title: "Kelly Criterion Calculator",
    description: "Find the optimal bet size with the Kelly criterion from the odds, your win probability and bankroll — full, half or quarter Kelly.",
    metaTitle: "Kelly Criterion Calculator — Optimal Bet Size",
    metaDescription: "Free Kelly criterion calculator for betting. Get the optimal stake as a % of bankroll from odds and win probability.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      odds("odds", "Odds", 120),
      percentField("winProb", "Your Win Probability", { default: 50, max: 100, step: 0.5 }),
      currencyField("bankroll", "Bankroll", { default: 1000, max: 10000000, step: 10 }),
      dropdown("kellyFraction", "Kelly Fraction", [["Full Kelly", 1], ["Half Kelly (recommended)", 2], ["Quarter Kelly", 3]], 2),
    ],
    calcResult: { label: "Recommended Stake", format: "currency" },
    calcResults: [cur("recommendedStake", "Recommended Stake", true), pct("percentOfBankroll", "Share of Bankroll"), pct("fullKellyPercent", "Full Kelly %"), pct("edgePercent", "Edge (EV %)"), pct("expectedGrowthPercent", "Expected Bankroll Growth per Bet")],
    instructions: "Enter the odds, your estimated win probability, your bankroll and how aggressive to be. A zero stake means the bet has no edge.",
    examples: "Example: +120 odds with a 50% win chance is a 10% edge. Full Kelly says bet 8.33% of the bankroll; half Kelly on $1,000 is $41.67.",
    assumptions: "Kelly fraction = (b × p − q) ÷ b, where b = decimal odds − 1, p = win probability, q = 1 − p. Full Kelly is very volatile and assumes your probabilities are exact — most bettors use half or quarter Kelly. " + DISCLAIMER,
    faq: [
      { question: "Why not bet full Kelly?", answer: "Small errors in your win probability lead to big over-betting and wild swings. Half Kelly keeps most of the growth with far less risk." },
      { question: "What if Kelly is negative?", answer: "Then the bet has negative expected value — don't place it." },
    ],
  },
  {
    slug: "betting-unit-bankroll-calculator",
    title: "Betting Unit & Bankroll Calculator",
    description: "Set your betting unit size from your bankroll and risk level, with your maximum bet, weekly risk and how long a losing streak it would take to halve the bankroll.",
    metaTitle: "Betting Unit & Bankroll Calculator — Unit Size",
    metaDescription: "Free betting unit size calculator. Get your unit from bankroll and risk level, max bet, weekly risk and losing-streak tolerance.",
    calcInputs: [
      currencyField("bankroll", "Bankroll", { default: 1000, max: 10000000, step: 10 }),
      dropdown("riskLevel", "Risk Level", [["Conservative — 1% per unit", 1], ["Moderate — 2% per unit", 2], ["Aggressive — 3% per unit", 3], ["Very aggressive — 5% per unit", 4]], 2),
      numberField("betsPerWeek", "Bets per Week (1 Unit Each)", { default: 10, max: 200 }),
    ],
    calcResult: { label: "Unit Size", format: "currency" },
    calcResults: [cur("unitSize", "Unit Size", true), num("unitsInBankroll", "Units in Your Bankroll"), cur("maxSingleBet", "Maximum Single Bet (3 Units)"), cur("weeklyAmountAtRisk", "Weekly Amount at Risk"), num("losingStreakToHalve", "Straight Losses to Halve the Bankroll")],
    instructions: "Enter the money set aside only for betting, your risk level and roughly how many bets you make a week.",
    examples: "Example: a $1,000 bankroll at 2% per unit gives a $20 unit — 50 units. Ten bets a week puts $200 at risk, and it would take 25 straight losses to halve the bankroll.",
    assumptions: "Flat-unit staking; a 3-unit cap for your strongest plays. Recalculate units when the bankroll changes a lot. " + DISCLAIMER,
    faq: [
      { question: "What is a unit in sports betting?", answer: "A standard bet size, usually 1–3% of your bankroll, so results can be compared regardless of bankroll size." },
      { question: "Should my bankroll be separate?", answer: "Yes — only bet money set aside for betting, never rent, bills or savings." },
    ],
  },
  {
    slug: "betting-roi-calculator",
    title: "Betting ROI Calculator",
    description: "Measure your betting ROI and profit, and compare your win rate with the break-even rate for your average odds.",
    metaTitle: "Betting ROI Calculator — Return on Investment",
    metaDescription: "Free sports betting ROI calculator. Get ROI, profit, win rate and break-even win rate from your betting record.",
    calcInputs: [
      currencyField("totalStaked", "Total Amount Staked", { default: 5000, max: 100000000, step: 10 }),
      currencyField("totalReturned", "Total Returned (Including Stakes on Winners)", { default: 5300, max: 100000000, step: 10 }),
      numberField("wins", "Wins", { default: 55, max: 100000 }),
      numberField("losses", "Losses", { default: 45, max: 100000 }),
      odds("averageOdds", "Average American Odds", -110),
    ],
    calcResult: { label: "ROI", format: "percentage" },
    calcResults: [pct("roiPercent", "ROI (Yield)", true), cur("profit", "Profit"), pct("winRate", "Win Rate"), pct("breakEvenWinRate", "Break-Even Win Rate at Your Average Odds"), cur("averageStake", "Average Stake")],
    instructions: "Enter what you've staked in total, what came back (winnings plus returned stakes), your win-loss record and your average odds.",
    examples: "Example: $5,000 staked with $5,300 back is a $300 profit — 6% ROI. A 55–45 record at −110 beats the 52.38% break-even rate.",
    assumptions: "ROI = profit ÷ total staked. Pushes are left out of the record. A few hundred bets are needed before ROI says much about skill. " + DISCLAIMER,
    faq: [
      { question: "What is a good betting ROI?", answer: "Long-term, 2–5% is very good; sustained ROI above 10% is rare." },
      { question: "Is ROI the same as yield?", answer: "In betting, yes — both mean profit divided by total stakes." },
    ],
  },
  {
    slug: "closing-line-value-calculator",
    title: "Closing Line Value Calculator",
    description: "Check your closing line value (CLV) — how much better your odds were than the closing line — and the EV that implies.",
    metaTitle: "Closing Line Value (CLV) Calculator",
    metaDescription: "Free CLV calculator. Compare your odds with the closing line to get CLV %, implied probability shift and estimated EV.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      odds("oddsTaken", "Odds You Bet At", -105),
      odds("closingOdds", "Closing Odds (Same Side)", -120),
      odds("closingOtherSide", "Closing Odds, Other Side (Optional, for De-Vig)", 0, false),
    ],
    calcResult: { label: "CLV", format: "percentage" },
    calcResults: [pct("clvPercent", "Closing Line Value", true), pct("impliedAtBet", "Implied Probability When You Bet"), pct("impliedAtClose", "Implied Probability at Close"), pct("estimatedEvPercent", "Estimated EV (If the Close Is Fair)")],
    instructions: "Enter the odds you got and the closing odds for the same side. Add the other side's closing odds to remove the vig for a better EV estimate.",
    examples: "Example: betting −105 when the line closes −120 is 6.5% closing line value — the market moved toward your side after you bet.",
    assumptions: "CLV = your decimal odds ÷ closing decimal odds − 1. EV assumes the closing line (de-vigged when both sides are given) reflects the true probability, which is a reasonable assumption in big markets. " + DISCLAIMER,
    faq: [
      { question: "Why does closing line value matter?", answer: "Consistently beating the closing line is the best evidence of long-term betting skill — results take much longer to prove it." },
      { question: "Can I win without beating the close?", answer: "In the short run, yes; over thousands of bets, bettors who lose to the close almost always lose money." },
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
