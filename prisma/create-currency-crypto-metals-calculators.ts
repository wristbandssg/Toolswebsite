// One-time (but safe to re-run) batch setup script: creates the 4 tools
// of the "Crypto Calculators" sub-batch I (Crypto & Precious Metal Converters). Part of the
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
// See src/lib/calc-engine-currency-crypto-metals.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-crypto-metals-calculators.ts
// or
//   npm run db:create-currency-crypto-metals-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Since 6 Oct 2026 Crypto Calculators is split into sub-categories (see
// organize-tool-categories.ts); these tools live under Currency Exchange & Forex
// Calculators, which this script creates under Crypto Calculators if needed.
const PARENT_SLUG = "crypto-calculators";
const CATEGORY = { name: "Currency Exchange & Forex Calculators", slug: "currency-exchange-forex-calculators" };
// The two crypto converters go to Crypto Trading & Profit Calculators instead.
const CRYPTO_CATEGORY = { name: "Crypto Trading & Profit Calculators", slug: "crypto-trading-profit-calculators" };
const CRYPTO_SLUGS = ["crypto-to-fiat-converter", "fiat-to-crypto-converter"];

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
    slug: "crypto-to-fiat-converter",
    title: "Crypto to Fiat Converter",
    description: "Convert Bitcoin, Ethereum or any cryptocurrency into dollars or your local currency — the cash you actually receive after the exchange's trading fee and withdrawal fee.",
    metaTitle: "Crypto to Fiat Converter — Cash Out After Fees",
    metaDescription: "Free crypto to fiat converter. See what selling Bitcoin or any coin brings in dollars or your currency after trading and withdrawal fees.",
    calcInputs: [
      numberField("coinAmount", "Amount of Crypto", { default: 0.5, min: 0, max: 1000000000, step: 0.0001 }),
      currencyField("coinPriceUsd", "Price per Coin (USD)", { default: 65000, max: 100000000, step: 100 }),
      percentField("tradingFeePercent", "Trading Fee", { default: 0.5, max: 10, step: 0.05 }),
      currencyField("withdrawalFeeUsd", "Withdrawal Fee (USD)", { default: 5, max: 100000, step: 0.5 }),
      rateField("usdToLocalRate", "Local Currency per 1 USD (1 = Stay in USD)", { default: 1, min: 0 }),
    ],
    calcResult: { label: "Net Cash Out", format: "currency" },
    calcResults: [
      { key: "netCashOutUsd", label: "Net Cash Out (USD)", format: "currency", highlight: true },
      { key: "netCashOutLocal", label: "Net Cash Out (Local Currency)", format: "number", decimals: 2 },
      { key: "grossValueUsd", label: "Gross Value (USD)", format: "currency" },
      { key: "totalFeesUsd", label: "Total Fees (USD)", format: "currency" },
    ],
    instructions: "Enter how many coins you're selling, the current price in dollars from your exchange, its trading fee and withdrawal fee, and — if you want another currency — how many units of it one dollar buys.",
    examples: "Example: selling 0.5 BTC at $65,000 is worth $32,500. After a 0.5% trading fee and a $5 withdrawal fee ($167.50 in all), you receive $32,332.50.",
    assumptions: "Crypto prices move fast; your exchange's price at the moment you sell decides the result. Selling may trigger capital gains tax. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is selling crypto for cash taxable?", answer: "In the U.S. and many other countries, yes — selling is a taxable event, and the gain or loss is the sale value minus what you paid." }],
  },
  {
    slug: "fiat-to-crypto-converter",
    title: "Fiat to Crypto Converter",
    description: "See how much Bitcoin or another cryptocurrency your money buys after the platform's fee and spread, and the effective price you really pay per coin.",
    metaTitle: "Fiat to Crypto Converter — Coins After Fees",
    metaDescription: "Free fiat to crypto converter. See how much Bitcoin or any coin your money buys after fees and spread, and the effective price you pay per coin.",
    calcInputs: [
      currencyField("fiatAmount", "Amount to Spend", { default: 1000, max: 1000000000, step: 10 }),
      currencyField("coinPrice", "Market Price per Coin", { default: 65000, max: 100000000, step: 100 }),
      percentField("feePercent", "Purchase Fee", { default: 1.5, max: 20, step: 0.1 }),
      percentField("spreadPercent", "Spread Above Market Price", { default: 0.5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Coins Received", format: "number", decimals: 8 },
    calcResults: [
      { key: "coinsReceived", label: "Coins Received", format: "number", decimals: 8, highlight: true },
      { key: "effectivePricePerCoin", label: "Effective Price per Coin", format: "currency" },
      { key: "coinsAtMarketPriceNoFees", label: "Coins at Market Price, No Fees", format: "number", decimals: 8 },
      { key: "totalCostOfFees", label: "Total Cost of Fees & Spread", format: "currency" },
    ],
    instructions: "Enter what you'll spend, the coin's market price, the platform's fee and the spread it adds to the price (often shown as the difference between its buy price and the market price).",
    examples: "Example: $1,000 at a $65,000 market price would buy 0.01538462 BTC with no costs. After a 1.5% fee and a 0.5% spread you get 0.01507845 BTC — an effective price of $66,319.80, with $19.90 lost to costs.",
    assumptions: "Card purchases and 'instant buy' options often carry higher fees than exchange order books. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a satoshi?", answer: "The smallest unit of Bitcoin: 0.00000001 BTC. You don't need to buy a whole coin — most platforms sell fractions worth a few dollars." }],
  },
  {
    slug: "gold-currency-converter",
    title: "Gold Currency Converter",
    description: "Convert gold by weight — grams, troy ounces, tolas or kilograms — and karat into its value in dollars or your local currency at the price you enter.",
    metaTitle: "Gold Value Calculator — Grams, Ounces, Tola & Karat",
    metaDescription: "Free gold currency converter. Value gold by grams, troy ounces, tola or kilograms and karat in dollars or your local currency at today's price.",
    calcInputs: [
      numberField("weight", "Weight", { default: 10, min: 0, max: 100000000, step: 0.1 }),
      dropdownField("gramsPerUnit", "Weight Unit", 1, [
        { label: "Grams", value: 1 },
        { label: "Troy ounces", value: 31.1034768 },
        { label: "Tola", value: 11.6638 },
        { label: "Kilograms", value: 1000 },
      ]),
      dropdownField("purityPercent", "Karat (Purity)", 99.9, [
        { label: "24K (99.9%)", value: 99.9 },
        { label: "22K (91.67%)", value: 91.67 },
        { label: "18K (75%)", value: 75 },
        { label: "14K (58.33%)", value: 58.33 },
      ]),
      currencyField("goldPricePerOunceUsd", "Gold Price per Troy Ounce (USD)", { default: 3500, max: 1000000, step: 10 }),
      rateField("usdToLocalRate", "Local Currency per 1 USD (1 = Stay in USD)", { default: 1, min: 0 }),
    ],
    calcResult: { label: "Gold Value", format: "number", decimals: 2 },
    calcResults: [
      { key: "valueInLocalCurrency", label: "Gold Value (Local Currency)", format: "number", decimals: 2, highlight: true },
      { key: "valueInUsd", label: "Gold Value (USD)", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (Grams)", format: "number", decimals: 4 },
      { key: "pricePerGramLocal", label: "Pure Gold Price per Gram (Local)", format: "number", decimals: 2 },
    ],
    instructions: "Enter the weight and pick its unit and karat, then today's gold spot price per troy ounce in dollars. To see the value in rupees, dirhams or any other currency, enter how many units of it one dollar buys.",
    examples: "Example: 10 grams of 24K gold contain 9.99 grams of pure gold. At $3,500 an ounce ($112.53 a gram), it's worth $1,124.15.",
    assumptions: "Gives the metal's spot (melt) value; jewelers and dealers buy below it and sell above it, and jewelry prices add making charges. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a troy ounce?", answer: "The unit precious metals are priced in: 31.1035 grams, about 10% heavier than an ordinary ounce." }],
  },
  {
    slug: "precious-metal-currency-converter",
    title: "Precious Metal Currency Converter",
    description: "Value silver, platinum, palladium or any precious metal by weight and purity in your currency — its melt value, a dealer's selling price, and what a dealer would pay you back.",
    metaTitle: "Precious Metal Value Calculator — Melt & Dealer Price",
    metaDescription: "Free precious metal currency converter. Value silver, platinum or any metal by weight and purity, with melt value, dealer price and buy-back price.",
    calcInputs: [
      currencyField("metalPricePerOunceUsd", "Metal Spot Price per Troy Ounce (USD)", { default: 38, max: 1000000, step: 0.5 }),
      numberField("weightGrams", "Weight", { unit: "grams", default: 1000, min: 0, max: 100000000, step: 1 }),
      percentField("purityPercent", "Purity", { default: 99.9, max: 100, step: 0.1 }),
      percentField("dealerPremiumPercent", "Dealer Premium When Buying", { default: 8, max: 100, step: 0.5 }),
      percentField("dealerBuybackDiscountPercent", "Dealer Discount When Buying Back", { default: 3, max: 50, step: 0.5 }),
      rateField("usdToLocalRate", "Local Currency per 1 USD (1 = Stay in USD)", { default: 1, min: 0 }),
    ],
    calcResult: { label: "Melt Value", format: "number", decimals: 2 },
    calcResults: [
      { key: "meltValue", label: "Melt Value", format: "number", decimals: 2, highlight: true },
      { key: "dealerSellingPrice", label: "Dealer's Selling Price", format: "number", decimals: 2 },
      { key: "dealerBuybackPrice", label: "Dealer's Buy-Back Price", format: "number", decimals: 2 },
      { key: "roundTripCost", label: "Cost of Buying and Selling Back", format: "number", decimals: 2 },
      { key: "priceRiseToBreakEvenPercent", label: "Price Rise Needed to Break Even", format: "percentage" },
    ],
    instructions: "Enter the metal's spot price per troy ounce in dollars, the weight in grams, its purity, the dealer's premium over spot and its discount when buying back, and your currency rate if not dollars.",
    examples: "Example: a kilo of 99.9% silver at $38 an ounce has a melt value of 1,220.51. A dealer charging 8% over spot sells it for 1,318.15 and buys it back at 3% under for 1,183.89 — so silver must rise 11.34% before you break even.",
    assumptions: "Premiums are higher on coins and small bars than on large bars. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is there a premium over the spot price?", answer: "Dealers add the cost of minting, distribution and their margin. Silver carries larger premiums than gold relative to its value." }],
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
  const cryptoCategory = await ensureCategory(CRYPTO_CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: CRYPTO_SLUGS.includes(def.slug) ? cryptoCategory.id : category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, filed under "${category.name}" and "${cryptoCategory.name}".`);
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
