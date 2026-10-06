// One-time (but safe to re-run) batch setup script: creates the 13 tools
// of the "Crypto Calculators" sub-batch A (Currency Conversion & Rates). Part of the
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
// See src/lib/calc-engine-currency-conversion.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-conversion-calculators.ts
// or
//   npm run db:create-currency-conversion-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Since 6 Oct 2026 Crypto Calculators is split into sub-categories (see
// organize-tool-categories.ts); these tools live under Currency Exchange & Forex
// Calculators, which this script creates under Crypto Calculators if needed.
const PARENT_SLUG = "crypto-calculators";
const CATEGORY = { name: "Currency Exchange & Forex Calculators", slug: "currency-exchange-forex-calculators" };

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

const TOOLS: ToolDef[] = [
  {
    slug: "exchange-rate-calculator",
    title: "Exchange Rate Calculator",
    description: "Work out the exchange rate you actually got from what you paid and what you received, and how much hidden markup it carried compared with the mid-market rate.",
    metaTitle: "Exchange Rate Calculator — The Rate You Really Got",
    metaDescription: "Free exchange rate calculator. Enter what you paid and received to find the rate you got, its inverse, and the hidden markup vs the mid-market rate.",
    calcInputs: [
      currencyField("amountPaid", "Amount You Paid (Home Currency)", { default: 1000, max: 1000000000, step: 10 }),
      numberField("amountReceived", "Amount You Received (Foreign Currency)", { default: 905, min: 0, max: 100000000000, step: 1 }),
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 0.92 }),
    ],
    calcResult: { label: "Your Exchange Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "effectiveRate", label: "Your Exchange Rate (Foreign per 1 Home)", format: "number", decimals: 6, highlight: true },
      { key: "inverseRate", label: "Inverse Rate (Home per 1 Foreign)", format: "number", decimals: 6 },
      { key: "markupVsMidMarketPercent", label: "Markup vs Mid-Market", format: "percentage" },
      { key: "hiddenCost", label: "Hidden Cost in Home Currency", format: "currency" },
    ],
    instructions: "Enter how much of your own currency you handed over and how much foreign currency you got back (from a receipt or statement). Add the mid-market rate for that day — the rate you see on Google or Reuters — to see the markup built into the rate.",
    examples: "Example: paying $1,000 and receiving 905 euros is a rate of 0.905 euros per dollar. The mid-market rate was 0.92, so the provider kept a 1.63% markup — a hidden cost of $16.30.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is the mid-market rate?", answer: "The midpoint between the buy and sell prices banks trade at with each other. It's the fairest benchmark; consumer rates are usually worse, and the gap is the provider's markup." }],
  },
  {
    slug: "foreign-exchange-calculator",
    title: "Foreign Exchange Calculator",
    description: "Convert money either way across a currency pair — from the base currency into the quote currency, or back — using one quoted pair price.",
    metaTitle: "Foreign Exchange Calculator — Convert Either Way",
    metaDescription: "Free foreign exchange calculator. Convert an amount base-to-quote or quote-to-base from one pair price like EUR/USD 1.085, with the rate and its inverse.",
    calcInputs: [
      numberField("amount", "Amount", { default: 1000, min: 0, max: 100000000000, step: 10 }),
      rateField("pairPrice", "Pair Price (Quote per 1 Base, e.g. EUR/USD)", { default: 1.085 }),
      dropdownField("direction", "Direction", 1, [
        { label: "Base → quote (e.g. euros to dollars)", value: 1 },
        { label: "Quote → base (e.g. dollars to euros)", value: 2 },
      ]),
    ],
    calcResult: { label: "Converted Amount", format: "number", decimals: 2 },
    calcResults: [
      { key: "convertedAmount", label: "Converted Amount", format: "number", decimals: 2, highlight: true },
      { key: "rateUsed", label: "Rate Used", format: "number", decimals: 6 },
      { key: "inverseRate", label: "Inverse of Rate Used", format: "number", decimals: 6 },
    ],
    instructions: "Enter the amount, the pair's price as quoted (EUR/USD 1.085 means 1 euro = 1.085 dollars), and which way you're converting. Converting from the quote currency divides by the price instead of multiplying.",
    examples: "Example: at EUR/USD 1.085, 1,000 euros are worth 1,085 dollars. Switch the direction and 1,000 dollars buy about 922 euros, using the inverse rate of 0.921659.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Which currency is the base in EUR/USD?", answer: "The first one — the euro. The price tells you how many units of the second (quote) currency one unit of the base buys." }],
  },
  {
    slug: "profit-loss-currency-calculator",
    title: "Profit/Loss Currency Calculator",
    description: "Find your profit or loss from buying a foreign currency and later selling it back — including the fee or spread paid in each direction.",
    metaTitle: "Currency Profit/Loss Calculator — Buy & Sell Back",
    metaDescription: "Free profit/loss currency calculator. Buy a foreign currency, sell it back later at a new rate, and see the profit or loss after fees both ways.",
    calcInputs: [
      currencyField("homeAmount", "Amount Converted (Home Currency)", { default: 5000, max: 1000000000, step: 100 }),
      rateField("buyRate", "Rate When You Bought (Foreign per 1 Home)", { default: 0.92 }),
      rateField("sellRate", "Rate When You Sell Back (Foreign per 1 Home)", { default: 0.88 }),
      percentField("feePercentEachWay", "Fee or Spread Each Way", { default: 1, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "profitOrLossPercent", label: "Profit or Loss %", format: "percentage" },
      { key: "amountBack", label: "Amount You Get Back", format: "currency" },
      { key: "foreignCurrencyBought", label: "Foreign Currency Bought", format: "number", decimals: 2 },
      { key: "profitBeforeFees", label: "Profit Before Fees", format: "currency" },
    ],
    instructions: "Enter how much of your currency you converted, the rate you bought at, the rate you sell back at (both as foreign currency per 1 unit of yours), and the fee or spread charged each time.",
    examples: "Example: $5,000 at 0.92 less a 1% fee buys 4,554 euros. The euro then strengthens to 0.88 per dollar; selling back with another 1% fee returns $5,123.25 — a $123.25 profit (2.47%), against $227.27 without fees.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does a lower rate mean a profit here?", answer: "The rates are foreign currency per dollar. A lower number means each dollar buys less foreign currency — so the foreign currency you hold has become more valuable." }],
  },
  {
    slug: "currency-conversion-calculator",
    title: "Currency Conversion Calculator",
    description: "See how much foreign currency you actually receive after a provider's percentage fee and fixed fee, and the effective rate once fees are counted.",
    metaTitle: "Currency Conversion Calculator — After Fees",
    metaDescription: "Free currency conversion calculator. Convert an amount after percentage and fixed fees to see what you really receive and your effective exchange rate.",
    calcInputs: [
      currencyField("amount", "Amount to Convert (Home Currency)", { default: 1000, max: 1000000000, step: 10 }),
      rateField("exchangeRate", "Exchange Rate Offered (Foreign per 1 Home)", { default: 0.92 }),
      percentField("feePercent", "Percentage Fee", { default: 1.5, max: 20, step: 0.1 }),
      currencyField("fixedFee", "Fixed Fee", { default: 5, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Amount You Receive", format: "number", decimals: 2 },
    calcResults: [
      { key: "amountReceived", label: "Amount You Receive (Foreign)", format: "number", decimals: 2, highlight: true },
      { key: "totalFees", label: "Total Fees", format: "currency" },
      { key: "feesPercentOfAmount", label: "Fees as % of Amount", format: "percentage" },
      { key: "effectiveRate", label: "Effective Rate After Fees", format: "number", decimals: 6 },
    ],
    instructions: "Enter the amount, the rate the provider offers, and its fees. Fees come off before conversion, so the effective rate shows the real deal.",
    examples: "Example: converting $1,000 at 0.92 with a 1.5% fee and a $5 fixed fee costs $20 in fees (2%). You receive 901.60 euros — an effective rate of 0.9016.",
    assumptions: "Some providers take fees from the converted amount instead; the result is the same. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a no-fee conversion really free?", answer: "Often not — the cost can be hidden in a worse exchange rate. Compare the rate offered with the mid-market rate to see it." }],
  },
  {
    slug: "live-currency-converter",
    title: "Live Currency Converter",
    description: "Convert an amount at a live bid/ask quote — what you'd get selling the currency, what it costs to buy, the mid-market value and the spread cost.",
    metaTitle: "Live Currency Converter — Bid, Ask & Mid Value",
    metaDescription: "Free live currency converter. Enter the current bid and ask to see what you get selling, what buying costs, the mid-market value and the spread.",
    calcInputs: [
      numberField("amount", "Amount of Base Currency", { default: 1000, min: 0, max: 100000000000, step: 10 }),
      rateField("bid", "Current Bid (You Sell At)", { default: 1.0848 }),
      rateField("ask", "Current Ask (You Buy At)", { default: 1.0852 }),
    ],
    calcResult: { label: "Mid-Market Value", format: "number", decimals: 2 },
    calcResults: [
      { key: "midMarketValue", label: "Mid-Market Value (Quote Currency)", format: "number", decimals: 2, highlight: true },
      { key: "youGetSelling", label: "You Get if You Sell", format: "number", decimals: 2 },
      { key: "itCostsBuying", label: "It Costs to Buy", format: "number", decimals: 2 },
      { key: "spreadCost", label: "Spread Cost", format: "number", decimals: 2 },
      { key: "midRate", label: "Mid Rate", format: "number", decimals: 6 },
    ],
    instructions: "Copy the current bid and ask for the pair from your broker, bank app or a live-rate site, and enter the amount of the base currency. Quotes move every second, so refresh them before you trade.",
    examples: "Example: with EUR/USD at 1.0848 / 1.0852, 1,000 euros are worth 1,085 dollars at mid. Selling gets you 1,084.80; buying the same euros costs 1,085.20 — a 0.40 spread.",
    assumptions: "This page doesn't fetch rates itself — it uses the quote you enter, so the result matches your provider. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why are there two prices?", answer: "The bid is what the market pays you for the base currency; the ask is what you pay for it. The gap between them — the spread — is how dealers earn." }],
  },
  {
    slug: "historical-currency-converter",
    title: "Historical Currency Converter",
    description: "Compare what an amount of foreign currency was worth at a past exchange rate with what it's worth at today's rate, and the change.",
    metaTitle: "Historical Currency Converter — Then vs Now",
    metaDescription: "Free historical currency converter. Enter a past exchange rate and today's to compare what an amount was worth then and now, and the change.",
    calcInputs: [
      numberField("amount", "Amount of Base Currency", { default: 1000, min: 0, max: 100000000000, step: 10 }),
      rateField("pastRate", "Past Rate (Quote per 1 Base)", { default: 1.12 }),
      rateField("currentRate", "Today's Rate (Quote per 1 Base)", { default: 1.085 }),
    ],
    calcResult: { label: "Value Today", format: "number", decimals: 2 },
    calcResults: [
      { key: "valueNow", label: "Value Today", format: "number", decimals: 2, highlight: true },
      { key: "valueThen", label: "Value at the Past Rate", format: "number", decimals: 2 },
      { key: "change", label: "Change", format: "number", decimals: 2 },
      { key: "changePercent", label: "Change %", format: "percentage" },
    ],
    instructions: "Enter the amount and the exchange rate on the past date (from a central bank or historical-rate site), then today's rate.",
    examples: "Example: 1,000 euros at a past rate of 1.12 were worth 1,120 dollars; at today's 1.085 they're worth 1,085 — 35 dollars less, a change of -3.13%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Where can I find historical exchange rates?", answer: "Central banks such as the Federal Reserve and the European Central Bank publish daily reference rates going back decades." }],
  },
  {
    slug: "historical-exchange-rate-calculator",
    title: "Historical Exchange Rate Calculator",
    description: "Analyze an exchange rate over four years — its average, high and low, the total change and the average yearly change.",
    metaTitle: "Historical Exchange Rate Calculator — Avg & Trend",
    metaDescription: "Free historical exchange rate calculator. Enter four yearly rates to get the average, high, low, total change and annualized change of a currency pair.",
    calcInputs: [
      rateField("rateYear1", "Rate — Year 1", { default: 1.18 }),
      rateField("rateYear2", "Rate — Year 2", { default: 1.05 }),
      rateField("rateYear3", "Rate — Year 3", { default: 1.08 }),
      rateField("rateYear4", "Rate — Year 4 (Latest)", { default: 1.085 }),
    ],
    calcResult: { label: "Average Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "averageRate", label: "Average Rate", format: "number", decimals: 6, highlight: true },
      { key: "highestRate", label: "Highest Rate", format: "number", decimals: 6 },
      { key: "lowestRate", label: "Lowest Rate", format: "number", decimals: 6 },
      { key: "totalChangePercent", label: "Total Change (Year 1 to 4)", format: "percentage" },
      { key: "annualizedChangePercent", label: "Average Yearly Change", format: "percentage" },
    ],
    instructions: "Enter the pair's rate on the same date in four consecutive years (or four yearly averages). Useful for budgeting foreign costs or translating yearly figures at an average rate.",
    examples: "Example: rates of 1.18, 1.05, 1.08 and 1.085 average 1.09875, with a high of 1.18 and a low of 1.05. From the first to the last year the rate fell 8.05% — about -2.76% a year.",
    assumptions: "A simple average of four points; accounting standards may call for a daily or monthly average. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why use an average exchange rate?", answer: "Income and expenses earned through the year are often translated at an average rate, because using one day's rate would exaggerate swings." }],
  },
  {
    slug: "cross-currency-rate-calculator",
    title: "Cross Currency Rate Calculator",
    description: "Work out the cross rate between two currencies from their rates against a common currency — for example EUR/GBP from EUR/USD and GBP/USD.",
    metaTitle: "Cross Currency Rate Calculator — via a Common Pair",
    metaDescription: "Free cross currency rate calculator. Find EUR/GBP or any cross rate from two rates quoted against the same currency, and convert an amount.",
    calcInputs: [
      rateField("currencyAInCommon", "Currency A in the Common Currency (e.g. EUR/USD)", { default: 1.085 }),
      rateField("currencyBInCommon", "Currency B in the Common Currency (e.g. GBP/USD)", { default: 1.27 }),
      numberField("amount", "Amount of Currency A", { default: 1000, min: 0, max: 100000000000, step: 10 }),
    ],
    calcResult: { label: "Cross Rate A/B", format: "number", decimals: 6 },
    calcResults: [
      { key: "crossRateAtoB", label: "Cross Rate (B per 1 A)", format: "number", decimals: 6, highlight: true },
      { key: "crossRateBtoA", label: "Cross Rate (A per 1 B)", format: "number", decimals: 6 },
      { key: "amountInCurrencyB", label: "Amount in Currency B", format: "number", decimals: 2 },
    ],
    instructions: "Enter what one unit of each currency is worth in the same third currency — usually US dollars (EUR/USD and GBP/USD). The cross rate divides one by the other.",
    examples: "Example: with EUR/USD at 1.085 and GBP/USD at 1.27, EUR/GBP is 0.854331 (GBP/EUR 1.170507), so 1,000 euros are worth 854.33 pounds.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why calculate a cross rate?", answer: "Many currencies trade mainly against the dollar. Banks derive rates between two other currencies from their dollar rates — this is how." }],
  },
  {
    slug: "currency-cross-rate-calculator",
    title: "Currency Cross Rate Calculator",
    description: "Chain two currency pairs to get a third — for example EUR/JPY from EUR/USD and USD/JPY — and convert an amount at the resulting cross rate.",
    metaTitle: "Currency Cross Rate Calculator — Chain Two Pairs",
    metaDescription: "Free currency cross rate calculator. Multiply two linked pairs like EUR/USD and USD/JPY to get EUR/JPY, its inverse, and a converted amount.",
    calcInputs: [
      rateField("rateAtoB", "Pair A/B (e.g. EUR/USD)", { default: 1.085 }),
      rateField("rateBtoC", "Pair B/C (e.g. USD/JPY)", { default: 150, step: 0.01 }),
      numberField("amount", "Amount of Currency A", { default: 1000, min: 0, max: 100000000000, step: 10 }),
    ],
    calcResult: { label: "Cross Rate A/C", format: "number", decimals: 6 },
    calcResults: [
      { key: "crossRateAtoC", label: "Cross Rate (C per 1 A)", format: "number", decimals: 6, highlight: true },
      { key: "crossRateCtoA", label: "Inverse (A per 1 C)", format: "number", decimals: 8 },
      { key: "amountInCurrencyC", label: "Amount in Currency C", format: "number", decimals: 2 },
    ],
    instructions: "Enter two pairs that share a middle currency: the first priced in it (A/B) and the second priced from it (B/C). Multiplying them cancels out the middle currency.",
    examples: "Example: EUR/USD 1.085 × USD/JPY 150 gives EUR/JPY 162.75, so 1,000 euros buy 162,750 yen. The inverse is 0.00614439 euros per yen.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Multiply or divide — how do I know?", answer: "Multiply when the shared currency is the quote of the first pair and the base of the second (EUR/USD × USD/JPY). If both pairs are quoted against the same currency, divide instead — use the Cross Currency Rate Calculator." }],
  },
  {
    slug: "inverse-exchange-rate-calculator",
    title: "Inverse Exchange Rate Calculator",
    description: "Flip an exchange rate to its inverse — for example EUR/USD 1.085 into USD/EUR — and convert an amount in both directions.",
    metaTitle: "Inverse Exchange Rate Calculator — Flip Any Rate",
    metaDescription: "Free inverse exchange rate calculator. Turn EUR/USD into USD/EUR or any rate into its reciprocal, and convert an amount both ways.",
    calcInputs: [
      rateField("exchangeRate", "Exchange Rate (Quote per 1 Base)", { default: 1.085 }),
      numberField("amount", "Amount", { default: 1000, min: 0, max: 100000000000, step: 10 }),
    ],
    calcResult: { label: "Inverse Rate", format: "number", decimals: 8 },
    calcResults: [
      { key: "inverseRate", label: "Inverse Rate (Base per 1 Quote)", format: "number", decimals: 8, highlight: true },
      { key: "baseToQuote", label: "Amount Converted Base → Quote", format: "number", decimals: 2 },
      { key: "quoteToBase", label: "Amount Converted Quote → Base", format: "number", decimals: 2 },
    ],
    instructions: "Enter a rate as quoted and an amount. The inverse is 1 divided by the rate.",
    examples: "Example: the inverse of 1.085 is 0.92165899, so 1,000 euros are 1,085 dollars and 1,000 dollars are 921.66 euros.",
    assumptions: "Applies to a mid rate; for a bid/ask quote, the inverse bid is 1 ÷ ask and the inverse ask is 1 ÷ bid. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why do rates look different on different sites?", answer: "Some quote EUR/USD (dollars per euro) and others USD/EUR (euros per dollar). They're the same rate, one the inverse of the other." }],
  },
  {
    slug: "currency-pair-calculator",
    title: "Currency Pair Calculator",
    description: "Understand a currency pair quote: the quote-currency value of a base amount, the inverse pair, what one pip is worth, and the price and value change after a move of N pips.",
    metaTitle: "Currency Pair Calculator — Pips & Price Moves",
    metaDescription: "Free currency pair calculator. See the value of a base amount, the inverse pair, the pip value in the quote currency, and the price after a pip move.",
    calcInputs: [
      rateField("pairPrice", "Pair Price", { default: 1.085 }),
      numberField("baseAmount", "Amount of Base Currency", { default: 10000, min: 0, max: 100000000000, step: 1000 }),
      dropdownField("pipSize", "Pip Size", 0.0001, [
        { label: "0.0001 (most pairs)", value: 0.0001 },
        { label: "0.01 (JPY pairs)", value: 0.01 },
      ]),
      numberField("pipMove", "Price Move in Pips (Negative = Down)", { default: 50, min: -100000, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Value in Quote Currency", format: "number", decimals: 2 },
    calcResults: [
      { key: "quoteAmount", label: "Value in Quote Currency", format: "number", decimals: 2, highlight: true },
      { key: "inversePairPrice", label: "Inverse Pair Price", format: "number", decimals: 6 },
      { key: "pipValueInQuote", label: "Value of 1 Pip (Quote Currency)", format: "number", decimals: 4 },
      { key: "priceAfterMove", label: "Price After the Move", format: "number", decimals: 6 },
      { key: "valueChangeInQuote", label: "Value Change (Quote Currency)", format: "number", decimals: 2 },
    ],
    instructions: "Enter the pair price, an amount of the base currency, the pair's pip size and a price move in pips.",
    examples: "Example: 10,000 euros at EUR/USD 1.085 are worth 10,850 dollars. One pip (0.0001) is worth 1 dollar on that amount, so a 50-pip rise to 1.09 adds 50 dollars.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a pip?", answer: "The standard smallest price step for a currency pair — the fourth decimal place for most pairs and the second for pairs quoted in yen." }],
  },
  {
    slug: "multi-currency-converter",
    title: "Multi-Currency Converter",
    description: "Convert one amount into four currencies at once using rates you enter — handy for pricing, travel planning or comparing costs across countries.",
    metaTitle: "Multi-Currency Converter — One Amount, 4 Currencies",
    metaDescription: "Free multi-currency converter. Convert one amount into four currencies at once, such as euros, pounds, yen and rupees, using rates you enter.",
    calcInputs: [
      currencyField("amount", "Amount (Home Currency)", { default: 1000, max: 1000000000, step: 10 }),
      rateField("rate1", "Currency 1 per 1 Home (e.g. EUR)", { default: 0.92 }),
      rateField("rate2", "Currency 2 per 1 Home (e.g. GBP)", { default: 0.79 }),
      rateField("rate3", "Currency 3 per 1 Home (e.g. JPY)", { default: 150, step: 0.01 }),
      rateField("rate4", "Currency 4 per 1 Home (e.g. INR)", { default: 88, step: 0.01 }),
    ],
    calcResult: { label: "Amount in Currency 1", format: "number", decimals: 2 },
    calcResults: [
      { key: "amountInCurrency1", label: "Amount in Currency 1", format: "number", decimals: 2, highlight: true },
      { key: "amountInCurrency2", label: "Amount in Currency 2", format: "number", decimals: 2 },
      { key: "amountInCurrency3", label: "Amount in Currency 3", format: "number", decimals: 2 },
      { key: "amountInCurrency4", label: "Amount in Currency 4", format: "number", decimals: 2 },
    ],
    instructions: "Enter an amount in your currency and how many units of each other currency one unit of yours buys. The defaults are dollars into euros, pounds, yen and rupees — replace them with today's rates or any currencies you need.",
    examples: "Example: $1,000 converts to 920 euros, 790 pounds, 150,000 yen and 88,000 rupees at the default rates.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Can I use it for currencies other than the defaults?", answer: "Yes — the four slots accept any currency. Just enter the rate as units of that currency per one unit of yours." }],
  },
  {
    slug: "base-currency-calculator",
    title: "Base Currency Calculator",
    description: "Total balances held in three different currencies in one base currency, and see what share of your money sits in each.",
    metaTitle: "Base Currency Calculator — Consolidate Balances",
    metaDescription: "Free base currency calculator. Convert balances in three currencies into one base currency, see the total and each currency's share of it.",
    calcInputs: [
      numberField("amount1", "Balance 1 (e.g. Euros)", { default: 5000, min: 0, max: 100000000000, step: 100 }),
      rateField("rateToBase1", "Base Currency per 1 Unit of Balance 1", { default: 1.085 }),
      numberField("amount2", "Balance 2 (e.g. Pounds)", { default: 3000, min: 0, max: 100000000000, step: 100 }),
      rateField("rateToBase2", "Base Currency per 1 Unit of Balance 2", { default: 1.27 }),
      numberField("amount3", "Balance 3 (e.g. Yen)", { default: 200000, min: 0, max: 100000000000, step: 1000 }),
      rateField("rateToBase3", "Base Currency per 1 Unit of Balance 3", { default: 0.00667, step: 0.00001 }),
    ],
    calcResult: { label: "Total in Base Currency", format: "currency" },
    calcResults: [
      { key: "totalInBaseCurrency", label: "Total in Base Currency", format: "currency", highlight: true },
      { key: "holding1InBase", label: "Balance 1 in Base Currency", format: "currency" },
      { key: "holding2InBase", label: "Balance 2 in Base Currency", format: "currency" },
      { key: "holding3InBase", label: "Balance 3 in Base Currency", format: "currency" },
      { key: "holding1SharePercent", label: "Balance 1 Share", format: "percentage" },
      { key: "holding2SharePercent", label: "Balance 2 Share", format: "percentage" },
      { key: "holding3SharePercent", label: "Balance 3 Share", format: "percentage" },
    ],
    instructions: "Enter each balance in its own currency and what one unit of it is worth in your base currency (the currency you report or think in). Enter 0 for a balance you don't have.",
    examples: "Example: 5,000 euros, 3,000 pounds and 200,000 yen are worth $10,569 in total — 51.33% in euros, 36.05% in pounds and 12.62% in yen.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a base currency?", answer: "The single currency you measure everything in — for a person, usually the currency they spend; for a business, its reporting currency." }],
  },
];

async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
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
