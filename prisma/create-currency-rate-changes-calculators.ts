// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Crypto Calculators" sub-batch B (Exchange Rate Changes, Gains & Performance). Part of the
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
// See src/lib/calc-engine-currency-rate-changes.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-rate-changes-calculators.ts
// or
//   npm run db:create-currency-rate-changes-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "exchange-rate-difference-calculator",
    title: "Exchange Rate Difference Calculator",
    description: "Compare two exchange rates — from two providers or two dates — and see the gap in rate, in pips, as a percentage and on the amount you're converting.",
    metaTitle: "Exchange Rate Difference Calculator — Compare Rates",
    metaDescription: "Free exchange rate difference calculator. Compare two rates for the same pair and see the gap in pips, as a percentage, and in money on your amount.",
    calcInputs: [
      rateField("rateA", "Rate A", { default: 1.085 }),
      rateField("rateB", "Rate B", { default: 1.07 }),
      numberField("amount", "Amount of Base Currency", { default: 1000, min: 0, max: 100000000000, step: 10 }),
      dropdownField("pipSize", "Pip Size", 0.0001, [
        { label: "0.0001 (most pairs)", value: 0.0001 },
        { label: "0.01 (JPY pairs)", value: 0.01 },
      ]),
    ],
    calcResult: { label: "Difference on Your Amount", format: "number", decimals: 2 },
    calcResults: [
      { key: "amountDifference", label: "Difference on Your Amount (A − B)", format: "number", decimals: 2, highlight: true },
      { key: "rateDifference", label: "Rate Difference", format: "number", decimals: 6 },
      { key: "differenceInPips", label: "Difference in Pips", format: "number" },
      { key: "differencePercent", label: "Difference as % of Rate A", format: "percentage" },
      { key: "amountAtRateA", label: "Amount at Rate A", format: "number", decimals: 2 },
      { key: "amountAtRateB", label: "Amount at Rate B", format: "number", decimals: 2 },
    ],
    instructions: "Enter the two rates for the same currency pair, quoted the same way, and the amount of the base currency you're converting.",
    examples: "Example: 1,000 euros at 1.085 bring 1,085 dollars but only 1,070 at 1.07 — a 15-dollar gap. The rates differ by 0.015, or 150 pips (1.38%).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is a small rate difference worth worrying about?", answer: "On a holiday budget, maybe not. On a house deposit or business payment, 1% to 2% can mean hundreds or thousands — always compare." }],
  },
  {
    slug: "exchange-rate-percentage-change-calculator",
    title: "Exchange Rate Percentage Change Calculator",
    description: "See how much each currency in a pair gained or lost when the exchange rate moved — the two percentages aren't the same.",
    metaTitle: "Exchange Rate % Change Calculator — Both Currencies",
    metaDescription: "Free exchange rate percentage change calculator. See how much the base currency rose and the quote currency fell when a rate moved from old to new.",
    calcInputs: [
      rateField("oldRate", "Old Rate (Quote per 1 Base)", { default: 1.05 }),
      rateField("newRate", "New Rate (Quote per 1 Base)", { default: 1.085 }),
    ],
    calcResult: { label: "Base Currency Change", format: "percentage" },
    calcResults: [
      { key: "baseCurrencyChangePercent", label: "Base Currency Change", format: "percentage", highlight: true },
      { key: "quoteCurrencyChangePercent", label: "Quote Currency Change", format: "percentage" },
      { key: "rateChange", label: "Rate Change", format: "number", decimals: 6 },
    ],
    instructions: "Enter the old and new rate for the pair. The base currency's change is new ÷ old − 1; the quote currency's change is old ÷ new − 1.",
    examples: "Example: when EUR/USD moves from 1.05 to 1.085, the euro gains 3.33% against the dollar, but the dollar loses only 3.23% against the euro.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why aren't the two changes equal and opposite?", answer: "Each is measured from a different starting point. A rise from 100 to 110 is +10%, but the fall back from 110 to 100 is only -9.09%." }],
  },
  {
    slug: "currency-appreciation-calculator",
    title: "Currency Appreciation Calculator",
    description: "Project a foreign currency rising against yours at a yearly rate — its future exchange rate, total appreciation, and what a holding in it will be worth in your currency.",
    metaTitle: "Currency Appreciation Calculator — Future Rate",
    metaDescription: "Free currency appreciation calculator. Project a currency's future rate at a yearly appreciation rate and the gain on a foreign-currency holding.",
    calcInputs: [
      rateField("currentRate", "Current Rate (Home per 1 Foreign)", { default: 1.085 }),
      percentField("appreciationPercent", "Yearly Appreciation", { default: 2, min: -50, max: 50, step: 0.1 }),
      numberField("years", "Years", { unit: "years", default: 5, min: 0, max: 100, step: 1 }),
      numberField("foreignHolding", "Foreign Currency Held", { default: 10000, min: 0, max: 100000000000, step: 100 }),
    ],
    calcResult: { label: "Projected Rate", format: "number", decimals: 6 },
    calcResults: [
      { key: "projectedRate", label: "Projected Rate", format: "number", decimals: 6, highlight: true },
      { key: "totalAppreciationPercent", label: "Total Appreciation", format: "percentage" },
      { key: "holdingValueNow", label: "Holding Value Now", format: "currency" },
      { key: "holdingValueThen", label: "Holding Value Then", format: "currency" },
      { key: "gainOnHolding", label: "Gain on Holding", format: "currency" },
    ],
    instructions: "Enter today's rate as your currency per 1 unit of the foreign one, an expected yearly appreciation (negative for a fall), the number of years, and how much of the foreign currency you hold.",
    examples: "Example: a euro at $1.085 rising 2% a year reaches 1.197928 in 5 years — up 10.41%. 10,000 euros worth $10,850 today would then be worth $11,979.28, a $1,129.28 gain.",
    assumptions: "Currencies don't move in straight lines; treat this as a scenario, not a forecast. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What makes a currency appreciate?", answer: "Higher interest rates, lower inflation, strong trade and growth, and safe-haven demand in uncertain times all tend to push a currency up." }],
  },
  {
    slug: "currency-depreciation-calculator",
    title: "Currency Depreciation Calculator",
    description: "Measure how much your currency has weakened against another, how much the other one strengthened, and how much more a foreign-priced item now costs you.",
    metaTitle: "Currency Depreciation Calculator — Cost Impact",
    metaDescription: "Free currency depreciation calculator. See how much your currency fell, how much the foreign one rose, and the extra cost of foreign-priced goods.",
    calcInputs: [
      rateField("oldRate", "Old Rate (Home per 1 Foreign)", { default: 80, step: 0.01 }),
      rateField("newRate", "New Rate (Home per 1 Foreign)", { default: 88, step: 0.01 }),
      numberField("foreignPrice", "Price of Item in Foreign Currency", { default: 500, min: 0, max: 100000000000, step: 10 }),
    ],
    calcResult: { label: "Home Currency Depreciation", format: "percentage" },
    calcResults: [
      { key: "homeCurrencyDepreciationPercent", label: "Your Currency Depreciated", format: "percentage", highlight: true },
      { key: "foreignCurrencyAppreciationPercent", label: "Foreign Currency Appreciated", format: "percentage" },
      { key: "costBefore", label: "Item Cost Before (Home Currency)", format: "number", decimals: 2 },
      { key: "costNow", label: "Item Cost Now (Home Currency)", format: "number", decimals: 2 },
      { key: "extraCost", label: "Extra Cost", format: "number", decimals: 2 },
    ],
    instructions: "Enter how many units of your currency one unit of the foreign currency cost before and now, and the foreign price of something you buy — an imported product, tuition, a subscription.",
    examples: "Example: if the dollar goes from 80 to 88 of your currency, your currency has lost 9.09% while the dollar gained 10%. A $500 item that cost 40,000 now costs 44,000 — 4,000 more.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Who is hurt by a currency depreciation?", answer: "Importers, travelers abroad and anyone paying foreign-currency debts or fees. Exporters and people earning in foreign currency benefit." }],
  },
  {
    slug: "currency-gain-loss-calculator",
    title: "Currency Gain/Loss Calculator",
    description: "Revalue a foreign-currency balance you hold from the rate you bought it at to today's rate, and see your gain or loss in your own currency.",
    metaTitle: "Currency Gain/Loss Calculator — Foreign Balance",
    metaDescription: "Free currency gain/loss calculator. Revalue a foreign-currency balance from its purchase rate to today's to see the gain or loss in your currency.",
    calcInputs: [
      numberField("foreignAmount", "Foreign Currency Held", { default: 10000, min: 0, max: 100000000000, step: 100 }),
      rateField("purchaseRate", "Rate When Bought (Home per 1 Foreign)", { default: 1.05 }),
      rateField("currentRate", "Rate Today (Home per 1 Foreign)", { default: 1.085 }),
    ],
    calcResult: { label: "Gain or Loss", format: "currency" },
    calcResults: [
      { key: "gainOrLoss", label: "Gain or Loss", format: "currency", highlight: true },
      { key: "gainOrLossPercent", label: "Gain or Loss %", format: "percentage" },
      { key: "costInHomeCurrency", label: "What It Cost You", format: "currency" },
      { key: "valueInHomeCurrency", label: "What It's Worth Now", format: "currency" },
    ],
    instructions: "Enter how much of the foreign currency you hold, the rate you paid for it and today's rate, both as your currency per 1 unit of the foreign one.",
    examples: "Example: 10,000 euros bought at $1.05 cost $10,500. At $1.085 they're worth $10,850 — a $350 gain (3.33%).",
    assumptions: "An unrealized gain until you convert back; selling costs a spread or fee. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Are currency gains taxable?", answer: "It depends on your country. In the U.S., personal gains under $200 per transaction are exempt; business and investment gains are generally taxable." }],
  },
  {
    slug: "foreign-exchange-gain-loss-calculator",
    title: "Foreign Exchange Gain/Loss Calculator",
    description: "Calculate the realized foreign exchange gain or loss on a foreign-currency invoice between the date it was booked and the date it was paid — for receivables and payables.",
    metaTitle: "FX Gain/Loss Calculator — Invoices & Accounting",
    metaDescription: "Free foreign exchange gain/loss calculator. Find the realized FX gain or loss on a foreign-currency receivable or payable from booking to settlement.",
    calcInputs: [
      numberField("invoiceAmount", "Invoice Amount (Foreign Currency)", { default: 50000, min: 0, max: 100000000000, step: 100 }),
      rateField("bookingRate", "Rate When Booked (Home per 1 Foreign)", { default: 1.1 }),
      rateField("settlementRate", "Rate When Settled (Home per 1 Foreign)", { default: 1.08 }),
      dropdownField("invoiceType", "Invoice Type", 1, [
        { label: "Receivable — a customer pays you", value: 1 },
        { label: "Payable — you pay a supplier", value: 2 },
      ]),
    ],
    calcResult: { label: "Exchange Gain or Loss", format: "currency" },
    calcResults: [
      { key: "exchangeGainOrLoss", label: "Exchange Gain (Loss)", format: "currency", highlight: true },
      { key: "bookedAmount", label: "Amount Booked", format: "currency" },
      { key: "settledAmount", label: "Amount Settled", format: "currency" },
      { key: "gainOrLossPercent", label: "Gain or Loss %", format: "percentage" },
    ],
    instructions: "Enter the invoice amount in the foreign currency, the rate on the invoice date and on the payment date, and whether you're being paid or paying.",
    examples: "Example: a 50,000-euro sale booked at $1.10 ($55,000) but paid when the rate is $1.08 brings in $54,000 — a $1,000 exchange loss (-1.82%). On a payable, the same move would be a $1,000 gain.",
    assumptions: "Shows the realized result at settlement. At a period end, open invoices are revalued at the closing rate, creating unrealized gains or losses. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Where does an FX gain or loss go in the accounts?", answer: "Usually in the income statement as other income or expense, separate from sales and cost of goods sold." }],
  },
  {
    slug: "currency-return-calculator",
    title: "Currency Return Calculator",
    description: "Work out the total return of keeping money in a foreign-currency deposit — the interest earned plus the currency move — and compare it with a deposit at home.",
    metaTitle: "Currency Return Calculator — Foreign Deposit Return",
    metaDescription: "Free currency return calculator. Combine a foreign deposit's interest with the exchange-rate move to see your total return vs a home deposit.",
    calcInputs: [
      currencyField("amount", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      percentField("foreignInterestPercent", "Foreign Deposit Interest Rate", { default: 6, min: -5, max: 100, step: 0.1 }),
      percentField("homeInterestPercent", "Home Deposit Interest Rate", { default: 4, min: -5, max: 100, step: 0.1 }),
      rateField("startRate", "Rate at Start (Home per 1 Foreign)", { default: 1.3 }),
      rateField("endRate", "Rate at End (Home per 1 Foreign)", { default: 1.28 }),
      numberField("months", "Months Held", { unit: "months", default: 12, min: 0, max: 600, step: 1 }),
    ],
    calcResult: { label: "Total Return", format: "percentage" },
    calcResults: [
      { key: "totalReturnPercent", label: "Total Return in Your Currency", format: "percentage", highlight: true },
      { key: "endValue", label: "End Value", format: "currency" },
      { key: "currencyEffectPercent", label: "Currency Effect", format: "percentage" },
      { key: "homeDepositReturnPercent", label: "Home Deposit Return", format: "percentage" },
      { key: "advantageVsHomePercent", label: "Advantage vs Home (Points)", format: "percentage" },
    ],
    instructions: "Enter the amount, the interest rates on the foreign and home deposits, the exchange rate at the start and at the end, and how long you hold the money.",
    examples: "Example: $10,000 in a 6% foreign deposit for 12 months, while that currency falls from $1.30 to $1.28 (-1.54%), returns 4.37% — $10,436.92 — only 0.37 points more than a 4% deposit at home.",
    assumptions: "Interest compounds yearly; taxes and conversion costs are extra. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a higher foreign interest rate a free lunch?", answer: "No. Currencies with high rates often weaken over time, which can wipe out the extra interest — the idea behind interest rate parity." }],
  },
  {
    slug: "currency-performance-calculator",
    title: "Currency Performance Calculator",
    description: "Compare how three foreign currencies performed against yours over the same period — each one's percentage change, the average and the spread between best and worst.",
    metaTitle: "Currency Performance Calculator — Compare 3",
    metaDescription: "Free currency performance calculator. Compare three currencies' change against yours over a period, with the average and the best-to-worst gap.",
    calcInputs: [
      rateField("startRate1", "Currency 1 — Start Rate (Home per 1)", { default: 1.04 }),
      rateField("endRate1", "Currency 1 — End Rate", { default: 1.085 }),
      rateField("startRate2", "Currency 2 — Start Rate (Home per 1)", { default: 1.24 }),
      rateField("endRate2", "Currency 2 — End Rate", { default: 1.27 }),
      rateField("startRate3", "Currency 3 — Start Rate (Home per 1)", { default: 0.0069, step: 0.00001 }),
      rateField("endRate3", "Currency 3 — End Rate", { default: 0.00667, step: 0.00001 }),
    ],
    calcResult: { label: "Average Change", format: "percentage" },
    calcResults: [
      { key: "averageChangePercent", label: "Average Change", format: "percentage", highlight: true },
      { key: "currency1ChangePercent", label: "Currency 1 Change", format: "percentage" },
      { key: "currency2ChangePercent", label: "Currency 2 Change", format: "percentage" },
      { key: "currency3ChangePercent", label: "Currency 3 Change", format: "percentage" },
      { key: "bestMinusWorstPoints", label: "Best Minus Worst (Points)", format: "percentage" },
    ],
    instructions: "For each currency, enter how many units of your currency one unit of it was worth at the start and end of the period. The defaults are the euro, pound and yen in dollars.",
    examples: "Example: the euro rose 4.33% and the pound 2.42% against the dollar while the yen fell 3.33% — an average of 1.14%, with 7.66 points between best and worst.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why compare currencies against each other?", answer: "It shows where your currency is strong or weak — useful for choosing where to travel, source goods, or hold savings." }],
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
