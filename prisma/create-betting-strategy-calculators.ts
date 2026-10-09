// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the sports betting sub-batch C (Strategy, Promos & Models). See
// src/lib/calc-engine-betting-odds.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Sports Betting &
// Racing Calculators), and src/lib/calc-engine-betting-strategy.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-betting-strategy-calculators.ts
// or
//   npm run db:create-betting-strategy-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "arbitrage-betting-calculator",
    title: "Arbitrage Betting Calculator",
    description: "Find the stakes that lock in a profit across two or three bookmakers whatever the result — an arbitrage or 'sure bet' — and the guaranteed return.",
    metaTitle: "Arbitrage Betting Calculator — Sure Bet Stakes",
    metaDescription: "Free arbitrage betting calculator. Split your stake across 2 or 3 outcomes to lock in a guaranteed profit and check if it's an arb.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 2), currencyField("totalStake", "Total Stake", { default: 1000, max: 10000000 }), odds("oddsA", "Outcome A Odds (Book 1)", 2.1), odds("oddsB", "Outcome B Odds (Book 2)", 2.05), odds("oddsC", "Outcome C Odds (Draw — 0 if None)", 0, false)],
    calcResult: { label: "Guaranteed Profit", format: "currency" },
    calcResults: [cur("guaranteedProfit", "Guaranteed Profit", true), pct("profitPercent", "Profit as % of Stake"), num("isArbitrage", "Arbitrage Exists (1 = Yes)"), cur("stakeA", "Stake on A"), cur("stakeB", "Stake on B"), cur("stakeC", "Stake on C"), pct("marketPercent", "Combined Market %")],
    instructions: "Enter the best odds for each outcome (usually from different bookmakers) and the total you want to stake.",
    examples: "Example: 2.10 on one side and 2.05 on the other add up to a 96.4% market — an arb. Staking $493.98 and $506.02 returns $1,037.35 either way: a $37.35 (3.7%) guaranteed profit.",
    assumptions: "Stakes are proportional to 1 ÷ odds so every outcome returns the same. An arb exists only when the combined implied probability is under 100%. Odds can move before both bets are placed, and books may limit arbers. " + DISCLAIMER,
    faq: [
      { question: "Is arbitrage betting legal?", answer: "Yes in most places, but bookmakers dislike it and may limit or close accounts that arb regularly." },
      { question: "How big are arbitrage profits?", answer: "Usually 1–3% of the stake per arb — small, but nearly risk-free if both bets are placed at the quoted odds." },
    ],
  },
  {
    slug: "dutching-calculator",
    title: "Dutching Calculator",
    description: "Back up to five selections in the same race or market so each one returns the same profit — the dutching stakes, combined odds and return.",
    metaTitle: "Dutching Calculator — Equal-Profit Stakes",
    metaDescription: "Free dutching calculator. Split your stake across up to 5 selections so every winner returns the same profit.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 2), currencyField("totalStake", "Total Stake", { default: 100, max: 10000000 }), ...[3, 5, 8, 0, 0].map((d, i) => odds(`odds${i + 1}`, `Selection ${i + 1} Odds${i > 1 ? " (0 = None)" : ""}`, d, i < 2))],
    calcResult: { label: "Return if Any Wins", format: "currency" },
    calcResults: [cur("returnIfAnyWins", "Return if Any Selection Wins", true), cur("profitIfAnyWins", "Profit if Any Selection Wins"), cur("stake1", "Stake on Selection 1"), cur("stake2", "Stake on Selection 2"), cur("stake3", "Stake on Selection 3"), cur("stake4", "Stake on Selection 4"), cur("stake5", "Stake on Selection 5"), pct("combinedProbability", "Combined Implied Probability"), num("combinedDecimalOdds", "Combined Decimal Odds")],
    instructions: "Enter your total stake and the odds of each selection you want to back.",
    examples: "Example: $100 dutched across 3.00, 5.00 and 8.00 shots stakes $50.63, $30.38 and $18.99 — any of them winning returns $151.90 ($51.90 profit). Together it's like backing one selection at 1.52.",
    assumptions: "Stake on each = total return ÷ its odds. You lose the total stake if none of your selections win. " + DISCLAIMER,
    faq: [
      { question: "What is dutching?", answer: "Backing several selections in one event with stakes sized so the profit is the same whichever of them wins." },
      { question: "How is dutching different from arbitrage?", answer: "Arbitrage covers every outcome for a guaranteed profit; dutching covers only the selections you choose, so you can still lose." },
    ],
  },
  {
    slug: "hedge-bet-calculator",
    title: "Hedge Bet Calculator",
    description: "Work out how much to hedge an existing bet — to lock in the same profit whatever happens, or just to get your stake back.",
    metaTitle: "Hedge Bet Calculator — Lock In Profit",
    metaDescription: "Free hedge bet calculator. Find the hedge stake that guarantees profit or recovers your stake on a futures or parlay bet.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 1), currencyField("originalStake", "Original Stake", { default: 100, max: 10000000 }), odds("originalOdds", "Original Bet Odds", 400), odds("hedgeOdds", "Hedge Odds (Other Side, Now)", -150)],
    calcResult: { label: "Hedge Stake", format: "currency" },
    calcResults: [cur("hedgeStake", "Hedge Stake for Equal Profit", true), cur("guaranteedProfit", "Guaranteed Profit"), cur("breakEvenHedgeStake", "Hedge Stake Just to Get Your Stake Back"), cur("profitIfOriginalWinsAfterBreakEvenHedge", "Profit if Original Wins (Break-Even Hedge)"), cur("originalPayout", "Original Potential Payout")],
    instructions: "Enter your original stake and odds, and the odds now available on the opposite outcome.",
    examples: "Example: $100 on a +400 future pays $500. With the other side at −150, hedging $300 locks in $100 profit either way; a smaller $150 hedge just protects your stake and keeps $250 profit if your bet wins.",
    assumptions: "Equal-profit hedge: hedge stake × hedge decimal odds = original payout. Hedging gives up expected value in exchange for certainty. " + DISCLAIMER,
    faq: [
      { question: "When should I hedge a bet?", answer: "When the guaranteed money matters more to you than the extra expected value — for example a big parlay going into its last leg." },
      { question: "Is hedging the same as cashing out?", answer: "It has the same goal, but placing your own hedge usually gives a better price than the book's cash-out offer." },
    ],
  },
  {
    slug: "cash-out-calculator",
    title: "Cash Out Calculator",
    description: "Check if a sportsbook's cash-out offer is fair — the fair value of your bet from its live odds, the offer as a % of fair value and the EV of holding.",
    metaTitle: "Cash Out Calculator — Is the Offer Fair?",
    metaDescription: "Free cash out calculator. Compare a sportsbook's cash-out offer with your bet's fair value from live odds.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      currencyField("stake", "Original Stake", { default: 50, max: 10000000 }),
      odds("originalOdds", "Original Odds", 500),
      odds("currentOdds", "Current Live Odds for Your Bet to Win", 150),
      percentField("marginPercent", "Bookmaker Margin in Live Odds", { default: 5, max: 15, step: 0.5 }),
      currencyField("cashOutOffer", "Cash-Out Offer", { default: 100, max: 10000000 }),
    ],
    calcResult: { label: "Fair Cash-Out Value", format: "currency" },
    calcResults: [cur("fairCashOutValue", "Fair Cash-Out Value", true), pct("offerAsPercentOfFair", "Offer as % of Fair Value"), cur("potentialPayout", "Potential Payout"), pct("currentWinChance", "Current Chance to Win"), cur("expectedValueIfYouHold", "Expected Profit if You Hold"), cur("cashOutProfit", "Profit if You Cash Out")],
    instructions: "Enter your stake and original odds, the live odds now offered for your selection to win, and the cash-out offer.",
    examples: "Example: $50 at +500 pays $300. If the live price is +150, the fair value is about $114 — so a $100 cash-out offer is 87.5% of fair value.",
    assumptions: "Fair value = potential payout × current win probability, from the live odds with the margin removed. Most cash-out offers are 5–15% below fair value. " + DISCLAIMER,
    faq: [
      { question: "Should I cash out my bet?", answer: "Mathematically, holding is usually worth more because offers are below fair value — cash out only if you value the certainty." },
      { question: "Why is the cash-out offer lower than fair?", answer: "The sportsbook builds its margin into the offer, just like into the original odds." },
    ],
  },
  {
    slug: "matched-betting-calculator",
    title: "Matched Betting Calculator",
    description: "Calculate the lay stake and liability for matched betting — qualifying bets and free bets (stake not returned or returned) — with the exchange commission.",
    metaTitle: "Matched Betting Calculator — Lay Stake & Liability",
    metaDescription: "Free matched betting calculator. Get the lay stake, liability and profit for qualifying bets and free bets with commission.",
    calcInputs: [
      dropdown("betType", "Bet Type", [["Qualifying bet (normal)", 1], ["Free bet — stake not returned (SNR)", 2], ["Free bet — stake returned (SR)", 3]], 1),
      currencyField("backStake", "Back Stake", { default: 20, max: 1000000 }),
      numberField("backOdds", "Back Odds (Decimal)", { default: 3, min: 1.01, max: 1000, step: 0.01 }),
      numberField("layOdds", "Lay Odds (Decimal)", { default: 3.1, min: 1.01, max: 1000, step: 0.01 }),
      percentField("commissionPercent", "Exchange Commission", { default: 2, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Lay Stake", format: "currency" },
    calcResults: [cur("layStake", "Lay Stake", true), cur("liability", "Liability"), cur("profitIfBackWins", "Profit if the Back Bet Wins"), cur("profitIfLayWins", "Profit if the Lay Bet Wins"), pct("freeBetRetentionPercent", "Free Bet Retention")],
    instructions: "Choose the bet type, then enter the back stake and odds from the bookmaker and the lay odds and commission from the exchange.",
    examples: "Example: a $20 qualifying bet at 3.0 laid at 3.1 with 2% commission needs a $19.48 lay (liability $40.91) and loses $0.91 whatever happens. A $20 free bet (SNR) at the same odds needs a $12.99 lay and locks in about $12.73 — 64% of its value.",
    assumptions: "Lay stake: qualifying and SR = back stake × back odds ÷ (lay odds − commission); SNR = back stake × (back odds − 1) ÷ (lay odds − commission). Also covers the lay bet calculator. " + DISCLAIMER,
    faq: [
      { question: "What is matched betting?", answer: "Using bookmaker free bets and covering every outcome on an exchange to turn the promotion into near-guaranteed profit." },
      { question: "What is liability?", answer: "The amount you must have in the exchange to cover a lay bet — what you pay out if the selection wins." },
    ],
  },
  {
    slug: "free-bet-calculator",
    title: "Free Bet Calculator",
    description: "See what a free bet is worth — the return if it wins (stake not returned or returned) and its expected value at the odds you choose.",
    metaTitle: "Free Bet Calculator — Free Bet Value & Returns",
    metaDescription: "Free bet calculator. Get the return and expected value of a sportsbook free bet, stake returned or not.",
    calcInputs: [dropdown("oddsFormat", "Odds Format", FMT2, 1), currencyField("freeBetAmount", "Free Bet Amount", { default: 25, max: 1000000 }), odds("odds", "Odds", 300), dropdown("stakeReturned", "Free Bet Type", [["Stake not returned (most common)", 1], ["Stake returned", 2]], 1)],
    calcResult: { label: "Return if It Wins", format: "currency" },
    calcResults: [cur("returnIfWins", "Return if It Wins", true), cur("profitIfWins", "Cash Profit if It Wins"), cur("expectedValue", "Expected Value"), pct("conversionPercent", "Expected Value as % of the Free Bet")],
    instructions: "Enter the free bet amount, the odds you'll use it at and whether the stake is returned.",
    examples: "Example: a $25 free bet (stake not returned) at +300 returns $75 if it wins. At the book's fair probability it's worth about $17.86 — 71% of its face value.",
    assumptions: "Stake-not-returned free bets pay only the winnings. EV uses the odds' implied probability with about 5% margin removed. Longer odds keep more of a free bet's value. " + DISCLAIMER,
    faq: [
      { question: "What odds should I use a free bet on?", answer: "Longer odds (around +300 to +500) usually keep the most value from a stake-not-returned free bet." },
      { question: "Can I withdraw a free bet?", answer: "No — only the winnings from it, and sometimes only after meeting the terms." },
    ],
  },
  {
    slug: "risk-free-bet-calculator",
    title: "Risk Free Bet Calculator",
    description: "Value a 'risk-free' (second chance) bet that refunds a loss as a free bet — expected value, what you keep if it loses and the profit if it wins.",
    metaTitle: "Risk Free Bet Calculator — Second Chance Bet EV",
    metaDescription: "Free risk free bet calculator. Get the expected value of a second-chance bet refunded as a free bet.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      currencyField("stake", "Stake", { default: 100, max: 1000000 }),
      odds("odds", "Odds", 200),
      currencyField("maxRefund", "Maximum Refund (as Free Bet)", { default: 100, max: 1000000 }),
      percentField("freeBetConversion", "Free Bet Value You Can Keep", { default: 70, max: 100 }),
      percentField("winProb", "Your Win Probability (0 = Use Odds)", { default: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Expected Value", format: "currency" },
    calcResults: [cur("expectedValue", "Expected Value", true), cur("profitIfWins", "Profit if It Wins"), cur("netIfLoses", "Net if It Loses (After Using the Refund)"), cur("refundValue", "Value of the Refund"), pct("winProbabilityUsed", "Win Probability Used")],
    instructions: "Enter your stake, odds, the maximum refund and how much of a free bet's face value you expect to keep (about 70% with matched betting or long odds).",
    examples: "Example: $100 at +200 with a $100 refund worth 70% is +$43 EV. If it loses you're effectively down only $30.",
    assumptions: "EV = p × profit − (1 − p) × stake + (1 − p) × refund × conversion; p from the odds (minus ~5% margin) unless you enter your own. 'Risk-free' bets refund as site credit, not cash. " + DISCLAIMER,
    faq: [
      { question: "Are risk-free bets really risk-free?", answer: "No — a loss comes back as a free bet, not cash, and a free bet is worth less than its face value." },
      { question: "What odds are best for a risk-free bet?", answer: "Longer odds, because the refund matters only when you lose — and a bigger win compensates the risk." },
    ],
  },
  {
    slug: "profit-boost-calculator",
    title: "Profit Boost Calculator",
    description: "Calculate a sportsbook profit boost or odds boost — boosted profit, boosted odds, extra winnings (with any cap) and the boost's expected value.",
    metaTitle: "Profit Boost Calculator — Odds Boost Value",
    metaDescription: "Free profit boost calculator. Get boosted profit, boosted odds, capped extra winnings and expected value for odds boosts.",
    calcInputs: [
      dropdown("oddsFormat", "Odds Format", FMT2, 1),
      currencyField("stake", "Stake", { default: 25, max: 1000000 }),
      odds("odds", "Original Odds", 150),
      percentField("boostPercent", "Profit Boost", { default: 50, max: 500, step: 5 }),
      currencyField("maxExtraWinnings", "Max Extra Winnings (0 = No Cap)", { default: 0, max: 1000000, required: false }),
      percentField("fairProb", "Fair Win Probability (0 = From Odds)", { default: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Boosted Profit", format: "currency" },
    calcResults: [cur("boostedProfit", "Boosted Profit", true), cur("extraWinnings", "Extra Winnings from the Boost"), num("boostedDecimalOdds", "Boosted Decimal Odds"), num("boostedAmericanOdds", "Boosted American Odds"), cur("expectedValue", "Expected Value")],
    instructions: "Enter your stake, the original odds and the boost percentage. Add the maximum extra winnings if the promotion caps it.",
    examples: "Example: a 50% profit boost on $25 at +150 raises the profit from $37.50 to $56.25 — boosted odds of +225 — worth about +$6.10 in expected value.",
    assumptions: "Boosted profit = normal profit × (1 + boost), capped where stated. EV uses the original odds' probability with about 4.5% margin removed unless you give a fair probability. Also covers the odds boost calculator. " + DISCLAIMER,
    faq: [
      { question: "Is a profit boost the same as an odds boost?", answer: "Nearly — a profit boost multiplies your winnings; an odds boost raises the price. Both increase the payout on a win." },
      { question: "Are profit boosts +EV?", answer: "Often, if the boost is big enough to overcome the bookmaker's margin — 25%+ boosts on fair-priced markets usually are." },
    ],
  },
  {
    slug: "poisson-betting-calculator",
    title: "Poisson Betting Calculator",
    description: "Predict football (soccer) scores with the Poisson distribution from each team's expected goals — win/draw/win, over 2.5, both teams to score and any correct score (also a correct score calculator).",
    metaTitle: "Poisson Betting Calculator — Correct Score Odds",
    metaDescription: "Free Poisson calculator for football betting. Get 1X2, over 2.5, BTTS and correct score probabilities and fair odds from expected goals.",
    calcInputs: [
      numberField("homeXg", "Home Team Expected Goals", { default: 1.6, min: 0.05, max: 6, step: 0.05 }),
      numberField("awayXg", "Away Team Expected Goals", { default: 1.1, min: 0.05, max: 6, step: 0.05 }),
      numberField("scoreHome", "Correct Score — Home Goals", { default: 1, max: 10 }),
      numberField("scoreAway", "Correct Score — Away Goals", { default: 1, max: 10 }),
    ],
    calcResult: { label: "Home Win", format: "percentage" },
    calcResults: [pct("homeWinProbability", "Home Win", true), pct("drawProbability", "Draw"), pct("awayWinProbability", "Away Win"), pct("over25Probability", "Over 2.5 Goals"), pct("bttsProbability", "Both Teams to Score"), pct("correctScoreProbability", "Your Correct Score"), num("correctScoreFairOdds", "Correct Score Fair Decimal Odds"), num("mostLikelyHomeGoals", "Most Likely Score — Home"), num("mostLikelyAwayGoals", "Most Likely Score — Away")],
    instructions: "Enter each team's expected goals for the match (from xG models or adjusted scoring averages) and a correct score to price.",
    examples: "Example: 1.6 vs 1.1 expected goals gives a 49% home win, 25% draw and 26% away win, a 51% chance of over 2.5 goals and 53% of both teams scoring. 1-1 is the most likely score at 11.8% — fair odds of 8.45.",
    assumptions: "Each team's goals follow an independent Poisson distribution. Real matches have slightly more draws than the basic model predicts (the Dixon-Coles adjustment corrects this). " + DISCLAIMER,
    faq: [
      { question: "How do I estimate expected goals?", answer: "Use xG data, or multiply a team's attack strength by the opponent's defensive weakness and the league average goals." },
      { question: "Why use the Poisson distribution?", answer: "Goals are rare, roughly independent events — exactly what the Poisson distribution describes." },
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
