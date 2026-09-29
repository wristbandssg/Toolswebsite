// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Crypto Calculators" sub-batch G (Forwards, Parity & Exchange Rate Theory). Part of the
// currency, forex & crypto tool-list build-out: 89 tools in the source list,
// 3 already built (currency-converter, forex-profit-loss-calculator,
// forex-position-size-calculator — moved into Crypto Calculators), 86 built
// across 9 sub-batches — all under Finance Calculators > Crypto Calculators
// (the user's chosen name for the whole currency/forex/crypto section):
//   create-currency-conversion-calculators.ts (13 tools)
//   create-currency-rate-changes-calculators.ts (8 tools)
//   create-currency-spreads-fees-calculators.ts (10 tools)
//   create-currency-travel-consumer-calculators.ts (9 tools)
//   create-currency-forex-trade-calculators.ts (12 tools)
//   create-currency-forex-costs-growth-calculators.ts (11 tools)
//   create-currency-forwards-parity-calculators.ts (10 tools)
//   create-currency-business-hedging-calculators.ts (9 tools)
//   create-currency-crypto-metals-calculators.ts (4 tools)
//
// See src/lib/calc-engine-currency-forwards-parity.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-forwards-parity-calculators.ts
// or
//   npm run db:create-currency-forwards-parity-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "crypto-calculators";

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function currencyField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "currency",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 100000000,
    step: opts.step ?? 100,
  };
}

function percentField(
  key: string,
  label: string,
  opts: { required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 100,
    step: opts.step ?? 0.1,
  };
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
    max: opts.max ?? 1000000,
    step: opts.step ?? 1,
  };
}

function dropdownField(key: string, label: string, defaultValue: number, options: { label: string; value: number }[]) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
}

// Exchange rates and small prices need more decimal places than money.
function rateField(
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
    default: opts.default ?? 1,
    min: opts.min ?? 0.000001,
    max: opts.max ?? 100000,
    step: opts.step ?? 0.0001,
  };
}

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, investment, trading " +
  "or tax advice. Exchange rates, crypto and metal prices, fees and interest rates change constantly — enter the " +
  "current quotes from your bank, broker or exchange. Leveraged forex and crypto trading carries a high risk of loss.";

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

const PIP_OPTIONS = [
  { label: "0.0001 (most pairs)", value: 0.0001 },
  { label: "0.01 (JPY pairs)", value: 0.01 },
];

const TOOLS: ToolDef[] = [
  {
    slug: "forward-exchange-rate-calculator",
    title: "Forward Exchange Rate Calculator",
    description: "Calculate a currency forward rate from the spot rate and the two currencies' interest rates for any number of days, plus the forward points.",
    metaTitle: "Forward Exchange Rate Calculator — Rate & Points",
    metaDescription: "Free forward exchange rate calculator. Find the forward rate from spot and both currencies' interest rates for any term, with forward points.",
    calcInputs: [
      rateField("spotRate", "Spot Rate (Quote per 1 Base)", { default: 1.085 }),
      percentField("quoteRatePercent", "Quote Currency Interest Rate", { default: 4.25, min: -5, max: 100, step: 0.05 }),
      percentField("baseRatePercent", "Base Currency Interest Rate", { default: 2.25, min: -5, max: 100, step: 0.05 }),
      numberField("days", "Days to Delivery", { unit: "days", default: 90, min: 0, max: 3650, step: 1 }),
      dropdownField("dayBasis", "Day Count", 360, [
        { label: "Actual/360 (USD, EUR and most currencies)", value: 360 },
        { label: "Actual/365 (GBP and some others)", value: 365 },
      ]),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
    ],
    calcResult: { label: "Forward Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "forwardRate", label: "Forward Rate", format: "number", decimals: 6, highlight: true },
      { key: "forwardPoints", label: "Forward Points (Pips)", format: "number" },
      { key: "premiumPercent", label: "Premium (Discount) vs Spot", format: "percentage" },
    ],
    instructions: "Enter the spot rate, the interest rate for each currency over the period (such as SOFR for USD and €STR for EUR), the number of days and the day-count convention.",
    examples: "Example: with EUR/USD spot at 1.085, dollar rates at 4.25% and euro rates at 2.25%, the 90-day forward is 1.090395 — about 53.95 points above spot (a 0.5% premium on the euro).",
    assumptions: "Uses simple money-market interest; dealers add a bid/ask spread. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a forward rate a forecast?", answer: "No. It's set by the interest-rate difference so no one can profit risk-free. The currency with the lower interest rate trades at a forward premium." }],
  },
  {
    slug: "forward-premium-calculator",
    title: "Forward Premium Calculator",
    description: "Calculate the forward premium or discount from quoted spot and forward rates — for the period, annualized, and in forward points.",
    metaTitle: "Forward Premium Calculator — Annualized %",
    metaDescription: "Free forward premium calculator. Compare spot and forward rates to find the premium or discount for the period, annualized, and in points.",
    calcInputs: [
      rateField("spotRate", "Spot Rate", { default: 1.085 }),
      rateField("forwardRate", "Forward Rate", { default: 1.0904 }),
      numberField("days", "Days to Delivery", { unit: "days", default: 90, min: 1, max: 3650, step: 1 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
    ],
    calcResult: { label: "Annualized Premium", format: "percentage" },
    calcResults: [
      { key: "annualizedPremiumPercent", label: "Annualized Premium (Negative = Discount)", format: "percentage", highlight: true },
      { key: "premiumForPeriodPercent", label: "Premium for the Period (%)", format: "number", decimals: 4 },
      { key: "forwardPoints", label: "Forward Points (Pips)", format: "number" },
    ],
    instructions: "Enter the spot and forward rates for the pair, quoted the same way, and the days until the forward settles.",
    examples: "Example: a 90-day forward at 1.0904 against 1.085 spot is 54 points higher — a 0.4977% premium on the base currency, or 2.02% a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What does a forward premium mean?", answer: "The base currency costs more for future delivery than today, usually because its interest rate is lower than the quote currency's." }],
  },
  {
    slug: "forward-discount-calculator",
    title: "Forward Discount Calculator",
    description: "Turn an annual forward discount into the forward rate for a given term, the forward points, and the value you'd lock in on an amount.",
    metaTitle: "Forward Discount Calculator — Forward Rate from %",
    metaDescription: "Free forward discount calculator. Convert an annual discount into the forward rate for your term, the forward points, and the value locked in.",
    calcInputs: [
      rateField("spotRate", "Spot Rate (e.g. USD/JPY)", { default: 150, step: 0.01 }),
      percentField("annualDiscountPercent", "Annual Forward Discount", { default: 3.5, max: 100, step: 0.05 }),
      numberField("days", "Days to Delivery", { unit: "days", default: 180, min: 0, max: 3650, step: 1 }),
      numberField("baseAmount", "Amount of Base Currency", { default: 1000000, min: 0, max: 100000000000, step: 10000 }),
      dropdownField("pipSize", "Pip Size", 0.01, PIP_OPTIONS),
    ],
    calcResult: { label: "Forward Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "forwardRate", label: "Forward Rate", format: "number", decimals: 6, highlight: true },
      { key: "forwardPoints", label: "Forward Points (Pips)", format: "number" },
      { key: "valueLockedAtForward", label: "Value Locked In (Quote Currency)", format: "number", decimals: 2 },
      { key: "differenceVsSpot", label: "Difference vs Spot (Quote Currency)", format: "number", decimals: 2 },
    ],
    instructions: "Enter the spot rate, the base currency's annual forward discount (roughly the interest-rate gap between the two currencies), the days to delivery and the amount.",
    examples: "Example: at USD/JPY 150 with a 3.5% annual discount, the 180-day forward is 147.410959 — 258.9 pips below spot. Selling $1,000,000 forward locks in 147,410,958.90 yen, 2,589,041.10 less than at spot.",
    assumptions: "Uses simple interest over the term. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why would the dollar trade at a forward discount to the yen?", answer: "Because dollar interest rates are higher. Holding dollars earns more interest, so dollars for future delivery cost less." }],
  },
  {
    slug: "currency-forward-calculator",
    title: "Currency Forward Calculator",
    description: "See what a business locks in by selling expected foreign-currency income forward — compared with waiting and converting at the expected rate or a worst-case rate.",
    metaTitle: "Currency Forward Calculator — Hedge a Receivable",
    metaDescription: "Free currency forward calculator. Compare locking in a forward rate on foreign income with converting later at expected or worst-case rates.",
    calcInputs: [
      numberField("foreignAmount", "Foreign Currency to Receive", { default: 500000, min: 0, max: 100000000000, step: 1000 }),
      rateField("forwardRate", "Forward Rate (Home per 1 Foreign)", { default: 1.09 }),
      rateField("expectedSpotRate", "Expected Rate at Payment", { default: 1.06 }),
      rateField("worstCaseSpotRate", "Worst-Case Rate at Payment", { default: 1.02 }),
    ],
    calcResult: { label: "Amount Locked In", format: "currency" },
    calcResults: [
      { key: "amountLockedIn", label: "Amount Locked In with the Forward", format: "currency", highlight: true },
      { key: "unhedgedAtExpectedRate", label: "Unhedged at Expected Rate", format: "currency" },
      { key: "unhedgedAtWorstRate", label: "Unhedged at Worst-Case Rate", format: "currency" },
      { key: "hedgeBenefitVsExpected", label: "Hedge Benefit vs Expected", format: "currency" },
      { key: "hedgeBenefitVsWorst", label: "Hedge Benefit vs Worst Case", format: "currency" },
    ],
    instructions: "Enter the foreign currency you expect to receive, the forward rate your bank quotes for that date, and the rate you expect — and fear — when the money arrives.",
    examples: "Example: selling 500,000 euros forward at $1.09 locks in $545,000. Waiting would bring $530,000 at 1.06, or $510,000 at 1.02 — so the hedge protects $15,000 to $35,000.",
    assumptions: "A forward is binding: if the rate moves in your favor, you don't benefit. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Forward contract or currency option?", answer: "A forward fixes the rate at no upfront cost but removes any upside. An option costs a premium but lets you benefit if the rate moves your way." }],
  },
  {
    slug: "covered-interest-parity-calculator",
    title: "Covered Interest Parity Calculator",
    description: "Check whether a quoted forward rate matches covered interest parity — the gap in pips and the arbitrage profit it would allow on a notional amount.",
    metaTitle: "Covered Interest Parity Calculator — Arbitrage Check",
    metaDescription: "Free covered interest parity calculator. Compare a market forward with the parity forward from interest rates, and see the arbitrage profit.",
    calcInputs: [
      rateField("spotRate", "Spot Rate (Quote per 1 Base)", { default: 1.085 }),
      rateField("marketForwardRate", "Market Forward Rate", { default: 1.0915 }),
      percentField("quoteRatePercent", "Quote Currency Interest Rate", { default: 4.25, min: -5, max: 100, step: 0.05 }),
      percentField("baseRatePercent", "Base Currency Interest Rate", { default: 2.25, min: -5, max: 100, step: 0.05 }),
      numberField("days", "Days", { unit: "days", default: 90, min: 0, max: 3650, step: 1 }),
      numberField("notional", "Notional (Base Currency)", { default: 1000000, min: 0, max: 100000000000, step: 10000 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
    ],
    calcResult: { label: "Deviation from Parity", format: "number" },
    calcResults: [
      { key: "deviationPips", label: "Market Forward vs Parity (Pips)", format: "number", highlight: true },
      { key: "parityForwardRate", label: "Parity Forward Rate", format: "number", decimals: 6 },
      { key: "arbitrageProfit", label: "Arbitrage Profit (Quote Currency)", format: "number", decimals: 2 },
    ],
    instructions: "Enter spot, the market forward, both interest rates, the term and a notional. A positive profit comes from borrowing the quote currency, buying the base spot, investing it and selling it forward; a negative one means the reverse trade profits.",
    examples: "Example: with parity implying 1.090395 but the market quoting 1.0915, the forward is 11.05 pips rich. On 1,000,000 euros the covered arbitrage would earn about 1,111.56 dollars before costs.",
    assumptions: "Uses Actual/360 simple interest and ignores bid/ask spreads and funding limits, which usually close such gaps. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Does covered interest parity always hold?", answer: "Very nearly for major currencies. Since 2008, small persistent gaps (the 'cross-currency basis') have appeared, reflecting bank balance-sheet costs." }],
  },
  {
    slug: "interest-rate-parity-calculator",
    title: "Interest Rate Parity Calculator",
    description: "Use uncovered interest rate parity to see the future exchange rate the interest-rate gap between two currencies implies over one or more years.",
    metaTitle: "Interest Rate Parity Calculator — Implied Future Rate",
    metaDescription: "Free interest rate parity calculator. Project the future spot rate implied by two currencies' interest rates over any number of years.",
    calcInputs: [
      rateField("spotRate", "Spot Rate (Quote per 1 Base)", { default: 1.085 }),
      percentField("quoteRatePercent", "Quote Currency Interest Rate", { default: 4.25, min: -5, max: 100, step: 0.05 }),
      percentField("baseRatePercent", "Base Currency Interest Rate", { default: 2.25, min: -5, max: 100, step: 0.05 }),
      numberField("years", "Years", { unit: "years", default: 2, min: 0, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Expected Future Spot", format: "number", decimals: 6 },
    calcResults: [
      { key: "expectedFutureSpot", label: "Implied Future Spot Rate", format: "number", decimals: 6, highlight: true },
      { key: "expectedBaseChangePercent", label: "Implied Change in the Base Currency", format: "percentage" },
      { key: "interestDifferentialPoints", label: "Interest Differential (Points)", format: "percentage" },
    ],
    instructions: "Enter the spot rate, each currency's interest rate and the horizon in years. Parity says the higher-rate currency should weaken by roughly the interest gap each year.",
    examples: "Example: with dollar rates 2 points above euro rates, EUR/USD at 1.085 implies 1.12786 in two years — the euro rising 3.95% to offset the extra interest on dollars.",
    assumptions: "Uncovered parity often fails in practice — high-yield currencies frequently don't weaken as predicted. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Covered vs uncovered interest parity?", answer: "Covered parity links interest rates to the forward rate and is enforced by arbitrage. Uncovered parity links them to the expected future spot rate and holds only loosely." }],
  },
  {
    slug: "purchasing-power-parity-calculator",
    title: "Purchasing Power Parity Calculator",
    description: "Compare the price of the same item in two countries to find the purchasing power parity exchange rate and whether the foreign currency looks over- or undervalued.",
    metaTitle: "PPP Calculator — Is a Currency Over or Undervalued?",
    metaDescription: "Free purchasing power parity calculator. Use one item's price in two countries to find the PPP rate and whether a currency is over- or undervalued.",
    calcInputs: [
      currencyField("priceAtHome", "Price at Home", { default: 5.79, max: 100000000, step: 0.01 }),
      numberField("priceAbroad", "Price Abroad (Foreign Currency)", { default: 5.2, min: 0, max: 100000000, step: 0.01 }),
      rateField("actualRate", "Actual Exchange Rate (Foreign per 1 Home)", { default: 0.92 }),
    ],
    calcResult: { label: "Foreign Currency Valuation", format: "percentage" },
    calcResults: [
      { key: "foreignCurrencyValuationPercent", label: "Foreign Currency Over (Under) Valued", format: "percentage", highlight: true },
      { key: "impliedPppRate", label: "Implied PPP Rate (Foreign per 1 Home)", format: "number", decimals: 6 },
      { key: "foreignPriceInHomeCurrency", label: "Foreign Price in Your Currency", format: "currency" },
    ],
    instructions: "Enter what the same product costs at home and abroad — The Economist's Big Mac Index uses a burger — and the actual exchange rate.",
    examples: "Example: if an item costs $5.79 at home and 5.20 euros abroad, the implied PPP rate is 0.8981 euros per dollar. The actual rate is 0.92, so the euro looks 2.38% undervalued; the item costs $5.65 in dollars.",
    assumptions: "One product is a rough guide; official PPP rates use large baskets of goods and services. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is purchasing power parity?", answer: "The idea that exchange rates should adjust so the same goods cost the same everywhere. It holds loosely over the long run, not day to day." }],
  },
  {
    slug: "real-exchange-rate-calculator",
    title: "Real Exchange Rate Calculator",
    description: "Find the real — inflation-adjusted — change in an exchange rate, showing whether a currency really became stronger once price differences are taken into account.",
    metaTitle: "Real Exchange Rate Calculator — Inflation-Adjusted",
    metaDescription: "Free real exchange rate calculator. Adjust a nominal rate change for home and foreign inflation to see the real change in competitiveness.",
    calcInputs: [
      rateField("startRate", "Start Rate (Home per 1 Foreign)", { default: 1.05 }),
      rateField("endRate", "End Rate (Home per 1 Foreign)", { default: 1.085 }),
      percentField("homeInflationPercent", "Home Inflation Over the Period", { default: 3, min: -20, max: 1000, step: 0.1 }),
      percentField("foreignInflationPercent", "Foreign Inflation Over the Period", { default: 2, min: -20, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Real Change", format: "percentage" },
    calcResults: [
      { key: "realChangePercent", label: "Real Change in the Foreign Currency", format: "percentage", highlight: true },
      { key: "nominalChangePercent", label: "Nominal Change", format: "percentage" },
      { key: "realRateIndex", label: "Real Rate Index (Start = 100)", format: "number" },
    ],
    instructions: "Enter the exchange rate at the start and end of the period, as your currency per 1 unit of the foreign one, and the inflation rate in each country over the same period.",
    examples: "Example: the foreign currency rose 3.33% nominally, from 1.05 to 1.085. With inflation of 3% at home and 2% abroad, its real rise is only 2.33% — an index of 102.33.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does the real exchange rate matter?", answer: "It measures competitiveness. If your prices rise faster than a partner's, your goods get dearer abroad even if the nominal rate hasn't moved." }],
  },
  {
    slug: "nominal-exchange-rate-calculator",
    title: "Nominal Exchange Rate Calculator",
    description: "Project the nominal exchange rate that relative purchasing power parity implies when two countries have different inflation rates.",
    metaTitle: "Nominal Exchange Rate Calculator — PPP Projection",
    metaDescription: "Free nominal exchange rate calculator. Project where a nominal rate heads under relative PPP when home and foreign inflation differ.",
    calcInputs: [
      rateField("currentRate", "Current Rate (Home per 1 Foreign)", { default: 1.085 }),
      percentField("homeInflationPercent", "Home Inflation per Year", { default: 3, min: -20, max: 1000, step: 0.1 }),
      percentField("foreignInflationPercent", "Foreign Inflation per Year", { default: 2, min: -20, max: 1000, step: 0.1 }),
      numberField("years", "Years", { unit: "years", default: 5, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Projected Nominal Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "projectedNominalRate", label: "Projected Nominal Rate", format: "number", decimals: 6, highlight: true },
      { key: "projectedChangePercent", label: "Projected Change", format: "percentage" },
      { key: "yearlyChangePercent", label: "Change per Year", format: "percentage" },
    ],
    instructions: "Enter today's rate as your currency per 1 unit of the foreign one, each country's expected yearly inflation and the number of years.",
    examples: "Example: with inflation of 3% at home and 2% abroad, a rate of 1.085 would drift to 1.139239 in 5 years — the foreign currency gaining 5% (0.98% a year) to keep real prices in line.",
    assumptions: "Relative PPP is a long-run tendency; exchange rates can stray from it for years. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Nominal vs real exchange rate?", answer: "The nominal rate is the quoted price of one currency in another. The real rate adjusts it for the two countries' price levels." }],
  },
  {
    slug: "effective-exchange-rate-calculator",
    title: "Effective Exchange Rate Calculator",
    description: "Build a trade-weighted effective exchange rate for your currency against three trading partners — the nominal and real (inflation-adjusted) change.",
    metaTitle: "Effective Exchange Rate Calculator — NEER & REER",
    metaDescription: "Free effective exchange rate calculator. Weight your currency's moves against three trading partners to get the nominal and real effective change.",
    calcInputs: [
      percentField("weight1", "Partner 1 — Trade Weight", { default: 40, max: 100, step: 1 }),
      percentField("change1", "Partner 1 — Your Currency's Change", { default: 3, min: -99, max: 1000, step: 0.1 }),
      percentField("weight2", "Partner 2 — Trade Weight", { default: 35, max: 100, step: 1 }),
      percentField("change2", "Partner 2 — Your Currency's Change", { default: -2, min: -99, max: 1000, step: 0.1 }),
      percentField("weight3", "Partner 3 — Trade Weight", { default: 25, max: 100, step: 1 }),
      percentField("change3", "Partner 3 — Your Currency's Change", { default: 5, min: -99, max: 1000, step: 0.1 }),
      percentField("homeInflationPercent", "Home Inflation", { default: 3, min: -20, max: 1000, step: 0.1 }),
      percentField("partnerInflationPercent", "Trade-Weighted Partner Inflation", { default: 2, min: -20, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Nominal Effective Change", format: "percentage" },
    calcResults: [
      { key: "nominalEffectiveChangePercent", label: "Nominal Effective Change (NEER)", format: "percentage", highlight: true },
      { key: "realEffectiveChangePercent", label: "Real Effective Change (REER)", format: "percentage" },
      { key: "nominalIndex", label: "NEER Index (Start = 100)", format: "number" },
      { key: "realIndex", label: "REER Index (Start = 100)", format: "number" },
    ],
    instructions: "For each trading partner, enter its share of your trade and how much your currency rose (+) or fell (−) against its currency. Add home inflation and average partner inflation for the real measure.",
    examples: "Example: rising 3% against a 40%-weight partner, falling 2% against a 35% one and rising 5% against a 25% one lifts your currency 1.71% on a trade-weighted basis. With inflation 1 point above partners, the real rise is 2.71%.",
    assumptions: "Uses a geometric weighted average, as central banks do. Weights are normalized if they don't add to 100. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What does a rising REER mean?", answer: "Your currency is strengthening in real terms against your trading partners, making your exports more expensive and imports cheaper." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }

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
  console.log(
    "New tools are created with status Draft — open them in /admin/tools, review, and set Status to Published " +
      "when you're happy with each one."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
