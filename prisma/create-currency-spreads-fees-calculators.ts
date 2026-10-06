// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Crypto Calculators" sub-batch C (Spreads, Fees & Money Transfers). Part of the
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
// See src/lib/calc-engine-currency-spreads-fees.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-spreads-fees-calculators.ts
// or
//   npm run db:create-currency-spreads-fees-calculators

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
    slug: "currency-spread-calculator",
    title: "Currency Spread Calculator",
    description: "Measure the spread between a provider's buy and sell rates for a currency, and how much you'd lose converting money and straight back again.",
    metaTitle: "Currency Spread Calculator — Buy vs Sell Rate",
    metaDescription: "Free currency spread calculator. Compare a provider's buy and sell rates to see the spread, its % of the mid rate, and what a round trip loses.",
    calcInputs: [
      rateField("providerSellsAt", "Provider Sells Foreign At (Home per 1 Foreign)", { default: 1.12 }),
      rateField("providerBuysAt", "Provider Buys Foreign Back At (Home per 1 Foreign)", { default: 1.04 }),
      currencyField("amount", "Amount to Convert", { default: 1000, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Round-Trip Loss", format: "currency" },
    calcResults: [
      { key: "roundTripLoss", label: "Round-Trip Loss", format: "currency", highlight: true },
      { key: "spread", label: "Spread", format: "number", decimals: 6 },
      { key: "spreadPercentOfMid", label: "Spread as % of Mid Rate", format: "percentage" },
      { key: "midRate", label: "Mid Rate", format: "number", decimals: 6 },
      { key: "foreignCurrencyBought", label: "Foreign Currency Bought", format: "number", decimals: 2 },
    ],
    instructions: "Enter the two rates on the provider's board — what it charges to sell you the foreign currency and what it pays to buy it back — as your currency per 1 unit of foreign, and an amount.",
    examples: "Example: a board showing 1.12 to buy and 1.04 to sell back has a 0.08 spread — 7.41% of the 1.08 mid rate. $1,000 buys 892.86 euros, and changing them straight back loses $71.43.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why is the spread so wide at airports?", answer: "Airport and hotel desks pay high rent and have captive customers. Spreads of 10% to 15% are common, against well under 1% at online providers." }],
  },
  {
    slug: "bid-ask-spread-calculator",
    title: "Bid-Ask Spread Calculator",
    description: "Calculate the bid-ask spread of any quote — currency, stock, ETF or crypto — in price and as a percentage, and what it costs on your trade size.",
    metaTitle: "Bid-Ask Spread Calculator — Spread % & Cost",
    metaDescription: "Free bid-ask spread calculator for any market. Find the spread in price and %, the mid price, and the spread's cost on your quantity.",
    calcInputs: [
      numberField("bid", "Bid Price", { default: 99.5, min: 0, max: 100000000, step: 0.01 }),
      numberField("ask", "Ask Price", { default: 100.5, min: 0, max: 100000000, step: 0.01 }),
      numberField("quantity", "Quantity (Units, Shares or Coins)", { default: 100, min: 0, max: 1000000000, step: 1 }),
    ],
    calcResult: { label: "Spread %", format: "percentage" },
    calcResults: [
      { key: "spreadPercentOfMid", label: "Spread as % of Mid", format: "percentage", highlight: true },
      { key: "spread", label: "Spread", format: "number", decimals: 6 },
      { key: "roundTripCost", label: "Round-Trip Cost", format: "number", decimals: 2 },
      { key: "costPerSide", label: "Cost per Side (Buy or Sell)", format: "number", decimals: 2 },
      { key: "midPrice", label: "Mid Price", format: "number", decimals: 6 },
    ],
    instructions: "Enter the bid (the highest price a buyer offers) and the ask (the lowest price a seller accepts), and how many units you'll trade.",
    examples: "Example: a bid of 99.50 and an ask of 100.50 is a spread of 1 — 1% of the 100 mid price. Buying and later selling 100 units at those quotes costs 100, or 50 each way.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What makes a spread narrow?", answer: "Heavy trading. Major currency pairs and large stocks trade constantly, so spreads are tiny; thinly traded assets and off-hours trading have wider spreads." }],
  },
  {
    slug: "exchange-rate-spread-calculator",
    title: "Exchange Rate Spread Calculator",
    description: "Compare a provider's exchange rate with the mid-market rate to find the hidden markup and what it costs you on a conversion.",
    metaTitle: "Exchange Rate Spread Calculator — Hidden Markup",
    metaDescription: "Free exchange rate spread calculator. Compare a provider's rate with the mid-market rate to reveal the markup % and the hidden cost on your amount.",
    calcInputs: [
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 0.92 }),
      rateField("providerRate", "Provider's Rate (Foreign per 1 Home)", { default: 0.9 }),
      currencyField("amount", "Amount to Convert", { default: 1000, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Markup", format: "percentage" },
    calcResults: [
      { key: "markupPercent", label: "Markup vs Mid-Market", format: "percentage", highlight: true },
      { key: "hiddenCost", label: "Hidden Cost", format: "currency" },
      { key: "receivedAtProviderRate", label: "You Receive at Provider Rate", format: "number", decimals: 2 },
      { key: "receivedAtMidMarket", label: "You'd Receive at Mid-Market", format: "number", decimals: 2 },
    ],
    instructions: "Enter the mid-market rate (from Google, Reuters or XE) and the rate the provider quotes you, both as foreign currency per 1 unit of yours.",
    examples: "Example: a provider offering 0.90 when the mid-market rate is 0.92 has a 2.17% markup. On $1,000 you'd get 900 euros instead of 920 — a hidden cost of $21.74.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How big a markup is normal?", answer: "Online money transfer services often charge 0.3% to 1%, banks 2% to 4%, and airport kiosks 10% or more." }],
  },
  {
    slug: "currency-exchange-fee-calculator",
    title: "Currency Exchange Fee Calculator",
    description: "Compare two currency exchange providers — each with its own rate and fee — to see which one gives you more foreign currency for your money.",
    metaTitle: "Currency Exchange Fee Calculator — Compare 2 Providers",
    metaDescription: "Free currency exchange fee calculator. Compare two providers' rates and fees to see which delivers more foreign currency and by how much.",
    calcInputs: [
      currencyField("amount", "Amount to Convert", { default: 1000, max: 1000000000, step: 10 }),
      rateField("rateA", "Provider A — Rate (Foreign per 1 Home)", { default: 0.905 }),
      currencyField("feeA", "Provider A — Fee", { default: 0, max: 1000000, step: 1 }),
      rateField("rateB", "Provider B — Rate (Foreign per 1 Home)", { default: 0.918 }),
      currencyField("feeB", "Provider B — Fee", { default: 8, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Difference (B − A)", format: "number", decimals: 2 },
    calcResults: [
      { key: "differenceBMinusA", label: "Extra Received with B (Negative = A Better)", format: "number", decimals: 2, highlight: true },
      { key: "receivedWithProviderA", label: "Received with Provider A", format: "number", decimals: 2 },
      { key: "receivedWithProviderB", label: "Received with Provider B", format: "number", decimals: 2 },
      { key: "effectiveRateA", label: "Effective Rate A", format: "number", decimals: 6 },
      { key: "effectiveRateB", label: "Effective Rate B", format: "number", decimals: 6 },
    ],
    instructions: "Enter the amount, then each provider's rate and upfront fee. A no-fee provider with a worse rate can cost more than one with a fee and a better rate.",
    examples: "Example: on $1,000, a no-fee provider at 0.905 gives 905 euros, while one charging $8 at 0.918 gives 910.66 — 5.66 more, despite the fee.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do I compare providers fairly?", answer: "Look at the final amount received for the same amount sent. That single number includes both the fee and the rate markup." }],
  },
  {
    slug: "foreign-transaction-fee-calculator",
    title: "Foreign Transaction Fee Calculator",
    description: "Add up what your card's foreign transaction fee costs on spending abroad or with overseas websites, and whether a no-foreign-fee card with an annual fee would save money.",
    metaTitle: "Foreign Transaction Fee Calculator — Card Fees",
    metaDescription: "Free foreign transaction fee calculator. See what a 3% card fee costs on foreign spending and whether a no-fee card's annual fee pays for itself.",
    calcInputs: [
      currencyField("monthlyForeignSpend", "Monthly Foreign Spending on the Card", { default: 800, max: 100000000, step: 50 }),
      percentField("feePercent", "Foreign Transaction Fee", { default: 3, max: 10, step: 0.1 }),
      numberField("months", "Months", { unit: "months", default: 12, min: 0, max: 600, step: 1 }),
      currencyField("noFeeCardAnnualFee", "No-Foreign-Fee Card's Annual Fee", { default: 95, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Total Foreign Transaction Fees", format: "currency" },
    calcResults: [
      { key: "totalFees", label: "Total Foreign Transaction Fees", format: "currency", highlight: true },
      { key: "feesPerMonth", label: "Fees per Month", format: "currency" },
      { key: "savingsWithNoFeeCard", label: "Savings with a No-Fee Card", format: "currency" },
      { key: "breakEvenMonthlySpend", label: "Monthly Spend Where It Breaks Even", format: "currency" },
    ],
    instructions: "Enter how much you put on the card in foreign currencies each month (including online purchases from foreign merchants), the fee your card charges, how many months, and the annual fee of a card without foreign fees.",
    examples: "Example: $800 a month at a 3% fee costs $24 a month, or $288 a year. A card with no foreign fee and a $95 annual fee would save $193 — it pays for itself above $263.89 a month of foreign spending.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Do debit cards charge foreign transaction fees too?", answer: "Many do, and ATM withdrawals abroad can add an ATM fee and your bank's out-of-network fee on top." }],
  },
  {
    slug: "currency-conversion-fee-calculator",
    title: "Currency Conversion Fee Calculator",
    description: "Add up the full cost of a currency conversion — the markup hidden in the exchange rate plus the stated percentage and fixed fees — in money and as a percentage.",
    metaTitle: "Currency Conversion Fee Calculator — Total Cost",
    metaDescription: "Free currency conversion fee calculator. Add the hidden rate markup to stated percentage and fixed fees to see the true cost of converting money.",
    calcInputs: [
      currencyField("amount", "Amount Converted", { default: 1000, max: 1000000000, step: 10 }),
      percentField("rateMarkupPercent", "Markup in the Exchange Rate", { default: 2, max: 20, step: 0.1 }),
      percentField("feePercent", "Stated Percentage Fee", { default: 0.5, max: 20, step: 0.1 }),
      currencyField("fixedFee", "Fixed Fee", { default: 3, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost of Conversion", format: "currency", highlight: true },
      { key: "totalCostPercent", label: "Total Cost %", format: "percentage" },
      { key: "hiddenRateMarkupCost", label: "Hidden Rate Markup", format: "currency" },
      { key: "statedFees", label: "Stated Fees", format: "currency" },
    ],
    instructions: "Enter the amount, the markup built into the provider's rate compared with mid-market (use the Exchange Rate Spread Calculator if you don't know it), and the fees the provider lists.",
    examples: "Example: converting $1,000 with a 2% rate markup ($20), a 0.5% fee and a $3 fixed fee ($8 of stated fees) costs $28 in all — 2.8%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why count the rate markup as a fee?", answer: "Because it is one — it's just not listed. Many 'zero fee' services earn entirely from the markup." }],
  },
  {
    slug: "international-transfer-fee-calculator",
    title: "International Transfer Fee Calculator",
    description: "See what an international bank wire really costs — sending, intermediary and receiving bank fees plus the exchange rate markup — and how much actually arrives.",
    metaTitle: "International Transfer Fee Calculator — Bank Wire",
    metaDescription: "Free international transfer fee calculator. Add sending, intermediary and receiving bank fees plus the rate markup to see what arrives abroad.",
    calcInputs: [
      currencyField("amount", "Amount Sent", { default: 2000, max: 1000000000, step: 50 }),
      currencyField("sendingFee", "Sending Bank Fee", { default: 35, max: 100000, step: 1 }),
      currencyField("intermediaryFee", "Intermediary Bank Fee", { default: 15, max: 100000, step: 1 }),
      currencyField("receivingFee", "Receiving Bank Fee", { default: 10, max: 100000, step: 1 }),
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("rateMarkupPercent", "Bank's Exchange Rate Markup", { default: 2.5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Recipient Gets", format: "number", decimals: 2 },
    calcResults: [
      { key: "recipientGets", label: "Recipient Gets (Foreign Currency)", format: "number", decimals: 2, highlight: true },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "totalCostPercent", label: "Total Cost %", format: "percentage" },
      { key: "flatFees", label: "Bank Fees", format: "currency" },
      { key: "rateMarkupCost", label: "Rate Markup Cost", format: "currency" },
    ],
    instructions: "Enter the amount, each bank's fee in your currency, the mid-market rate and your bank's exchange rate markup. Intermediary (correspondent) bank fees are often deducted along the way without warning.",
    examples: "Example: wiring $2,000 with $60 of bank fees and a 2.5% rate markup delivers 1,740.18 euros. Compared with the mid-market rate, the transfer cost $108.50 — 5.43%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How can I send money abroad more cheaply?", answer: "Online transfer services usually charge a small fee and a much smaller markup than banks, with no intermediary deductions. Compare the amount that arrives." }],
  },
  {
    slug: "money-transfer-exchange-rate-calculator",
    title: "Money Transfer Exchange Rate Calculator",
    description: "Check a money transfer quote: what the recipient gets, the all-in exchange rate once the transfer fee is included, and the total cost against the mid-market rate.",
    metaTitle: "Money Transfer Rate Calculator — All-In Rate",
    metaDescription: "Free money transfer exchange rate calculator. See what the recipient gets, the all-in rate after the fee, and the total cost vs the mid-market rate.",
    calcInputs: [
      currencyField("amountSent", "Amount You Send", { default: 1000, max: 1000000000, step: 10 }),
      currencyField("transferFee", "Transfer Fee", { default: 4.99, max: 100000, step: 0.01 }),
      rateField("offeredRate", "Rate Offered (Foreign per 1 Home)", { default: 0.915 }),
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 0.92 }),
    ],
    calcResult: { label: "Recipient Gets", format: "number", decimals: 2 },
    calcResults: [
      { key: "recipientGets", label: "Recipient Gets (Foreign Currency)", format: "number", decimals: 2, highlight: true },
      { key: "allInExchangeRate", label: "All-In Exchange Rate", format: "number", decimals: 6 },
      { key: "totalCostVsMidMarket", label: "Total Cost vs Mid-Market", format: "currency" },
      { key: "totalCostPercent", label: "Total Cost %", format: "percentage" },
    ],
    instructions: "Enter the amount you'll send, the service's fee and rate from its quote, and today's mid-market rate.",
    examples: "Example: sending $1,000 with a $4.99 fee at 0.915 delivers 910.43 euros — an all-in rate of 0.910434. Against the 0.92 mid-market rate, the transfer costs $10.40 (1.04%).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is an all-in exchange rate?", answer: "The amount received divided by the amount sent. It folds the fee into the rate, so you can compare quotes with different fees directly." }],
  },
  {
    slug: "remittance-calculator",
    title: "Remittance Calculator",
    description: "Plan regular money transfers home to family — how much they receive each month and year after fees and the exchange rate markup, and what the transfers cost you.",
    metaTitle: "Remittance Calculator — What Your Family Receives",
    metaDescription: "Free remittance calculator. See how much family abroad receives each month and year from regular transfers after fees and the rate markup.",
    calcInputs: [
      currencyField("monthlyAmount", "Amount Sent per Month", { default: 500, max: 100000000, step: 10 }),
      numberField("transfersPerMonth", "Transfers per Month", { default: 1, min: 0, max: 31, step: 1 }),
      currencyField("feePerTransfer", "Fee per Transfer", { default: 5, max: 100000, step: 0.5 }),
      rateField("midMarketRate", "Mid-Market Rate (Foreign per 1 Home)", { default: 83, step: 0.01 }),
      percentField("rateMarkupPercent", "Exchange Rate Markup", { default: 1, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Recipient Gets per Month", format: "number", decimals: 2 },
    calcResults: [
      { key: "recipientGetsPerMonth", label: "Recipient Gets per Month", format: "number", decimals: 2, highlight: true },
      { key: "recipientGetsPerYear", label: "Recipient Gets per Year", format: "number", decimals: 2 },
      { key: "yearlyCost", label: "Yearly Cost of Transfers", format: "currency" },
      { key: "costPercent", label: "Cost as % of Money Sent", format: "percentage" },
    ],
    instructions: "Enter how much you send each month, how many transfers you split it into, the fee per transfer, the mid-market rate and the provider's markup. The default is dollars to Indian rupees.",
    examples: "Example: sending $500 a month in one transfer with a $5 fee and a 1% markup at 83 rupees per dollar delivers 40,674.15 rupees a month — 488,089.80 a year. The transfers cost $119.40 a year (1.99%).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is one big transfer cheaper than several small ones?", answer: "Usually, when there's a fixed fee per transfer. Sending monthly instead of weekly can cut fees a lot." }],
  },
  {
    slug: "remittance-fee-calculator",
    title: "Remittance Fee Calculator",
    description: "Find the real cost of sending a remittance — fixed fee plus exchange rate margin — as a percentage of the amount, compared with the UN's 3% target.",
    metaTitle: "Remittance Fee Calculator — Cost vs 3% UN Target",
    metaDescription: "Free remittance fee calculator. See one transfer's total cost as a % of the amount, compare it with the UN 3% target, and your yearly fees.",
    calcInputs: [
      currencyField("amount", "Amount Sent per Transfer", { default: 200, max: 100000000, step: 10 }),
      currencyField("fixedFee", "Fixed Fee", { default: 5, max: 100000, step: 0.5 }),
      percentField("fxMarginPercent", "Exchange Rate Margin", { default: 3, max: 20, step: 0.1 }),
      numberField("sendsPerYear", "Transfers per Year", { default: 12, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "Total Cost %", format: "percentage" },
    calcResults: [
      { key: "totalCostPercent", label: "Total Cost %", format: "percentage", highlight: true },
      { key: "costPerSend", label: "Cost per Transfer", format: "currency" },
      { key: "pointsAboveUnTarget", label: "Points Above the 3% Target", format: "percentage" },
      { key: "yearlyCost", label: "Yearly Cost", format: "currency" },
      { key: "yearlyCostAt3Percent", label: "Yearly Cost at 3%", format: "currency" },
    ],
    instructions: "Enter the amount of one transfer, the provider's fixed fee, its exchange rate margin over mid-market, and how often you send.",
    examples: "Example: sending $200 with a $5 fee and a 3% margin costs $10.85 — 5.43% of the amount, 2.42 points above the UN's 3% target. Twelve transfers a year cost $130.20, against $72 at 3%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is the 3% remittance target?", answer: "UN Sustainable Development Goal 10.c aims to cut remittance costs to under 3% by 2030. The global average has been around 6%, per World Bank data." }],
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
