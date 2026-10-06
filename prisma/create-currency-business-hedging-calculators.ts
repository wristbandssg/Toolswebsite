// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Crypto Calculators" sub-batch H (Currency Baskets, Hedging & Business FX). Part of the
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
// See src/lib/calc-engine-currency-business-hedging.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-business-hedging-calculators.ts
// or
//   npm run db:create-currency-business-hedging-calculators

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
    slug: "currency-basket-calculator",
    title: "Currency Basket Calculator",
    description: "Value a currency basket made of fixed amounts of up to five currencies — like the IMF's SDR — in your currency, and see each currency's weight in it.",
    metaTitle: "Currency Basket Calculator — SDR-Style Valuation",
    metaDescription: "Free currency basket calculator. Value a basket of fixed currency amounts, like the IMF SDR, in your currency and see each currency's weight.",
    calcInputs: [
      numberField("units1", "Currency 1 — Units in Basket (USD)", { default: 0.57813, min: 0, max: 100000000, step: 0.00001 }),
      rateField("rate1", "Currency 1 — Value in Your Currency", { default: 1 }),
      numberField("units2", "Currency 2 — Units in Basket (EUR)", { default: 0.37379, min: 0, max: 100000000, step: 0.00001 }),
      rateField("rate2", "Currency 2 — Value in Your Currency", { default: 1.085 }),
      numberField("units3", "Currency 3 — Units in Basket (CNY)", { default: 1.0993, min: 0, max: 100000000, step: 0.00001 }),
      rateField("rate3", "Currency 3 — Value in Your Currency", { default: 0.14 }),
      numberField("units4", "Currency 4 — Units in Basket (JPY)", { default: 13.452, min: 0, max: 100000000, step: 0.001 }),
      rateField("rate4", "Currency 4 — Value in Your Currency", { default: 0.00667, step: 0.00001 }),
      numberField("units5", "Currency 5 — Units in Basket (GBP)", { default: 0.08087, min: 0, max: 100000000, step: 0.00001 }),
      rateField("rate5", "Currency 5 — Value in Your Currency", { default: 1.27 }),
    ],
    calcResult: { label: "Basket Value", format: "number", decimals: 6 },
    calcResults: [
      { key: "basketValue", label: "Basket Value in Your Currency", format: "number", decimals: 6, highlight: true },
      { key: "weight1Percent", label: "Currency 1 Weight", format: "percentage" },
      { key: "weight2Percent", label: "Currency 2 Weight", format: "percentage" },
      { key: "weight3Percent", label: "Currency 3 Weight", format: "percentage" },
      { key: "weight4Percent", label: "Currency 4 Weight", format: "percentage" },
      { key: "weight5Percent", label: "Currency 5 Weight", format: "percentage" },
    ],
    instructions: "Enter how many units of each currency the basket holds and what one unit of each is worth in your currency. The defaults are the SDR's currency amounts set in August 2022, valued in dollars — update the rates to today's.",
    examples: "Example: at the default rates, the SDR basket is worth 1.330024 dollars. The dollar makes up 43.47% of it, the euro 30.49%, the yuan 11.57%, the yen 6.75% and the pound 7.72%.",
    assumptions: "The IMF reviews the SDR basket every five years; check the IMF website for the current amounts. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is the SDR?", answer: "Special Drawing Rights are the IMF's reserve asset, valued from a basket of five currencies. Some fees and compensation limits, such as airline liability, are set in SDRs." }],
  },
  {
    slug: "weighted-currency-basket-calculator",
    title: "Weighted Currency Basket Calculator",
    description: "Split money across three foreign currencies by percentage weights and see the basket's return in your currency and how much each currency contributed.",
    metaTitle: "Weighted Currency Basket Calculator — Return",
    metaDescription: "Free weighted currency basket calculator. Split money across three currencies by weight and see the basket's return and each one's contribution.",
    calcInputs: [
      currencyField("amount", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      percentField("weight1", "Currency 1 — Weight", { default: 50, max: 100, step: 1 }),
      rateField("startRate1", "Currency 1 — Start Rate (Home per 1)", { default: 1.04 }),
      rateField("endRate1", "Currency 1 — End Rate", { default: 1.085 }),
      percentField("weight2", "Currency 2 — Weight", { default: 30, max: 100, step: 1 }),
      rateField("startRate2", "Currency 2 — Start Rate (Home per 1)", { default: 1.24 }),
      rateField("endRate2", "Currency 2 — End Rate", { default: 1.27 }),
      percentField("weight3", "Currency 3 — Weight", { default: 20, max: 100, step: 1 }),
      rateField("startRate3", "Currency 3 — Start Rate (Home per 1)", { default: 0.0069, step: 0.00001 }),
      rateField("endRate3", "Currency 3 — End Rate", { default: 0.00667, step: 0.00001 }),
    ],
    calcResult: { label: "Basket Return", format: "percentage" },
    calcResults: [
      { key: "basketReturnPercent", label: "Basket Return", format: "percentage", highlight: true },
      { key: "endValue", label: "End Value", format: "currency" },
      { key: "contribution1Points", label: "Currency 1 Contribution (Points)", format: "percentage" },
      { key: "contribution2Points", label: "Currency 2 Contribution (Points)", format: "percentage" },
      { key: "contribution3Points", label: "Currency 3 Contribution (Points)", format: "percentage" },
    ],
    instructions: "Enter the amount, each currency's weight, and its start and end rate in your currency. Weights are scaled to 100% if they add up to something else. Interest on the balances isn't included.",
    examples: "Example: $10,000 split 50/30/20 between euros, pounds and yen ends at $10,222.26 — a 2.22% return. The euro added 2.16 points and the pound 0.73, while the yen took away 0.67.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why hold a basket of currencies?", answer: "Spreading money across currencies reduces the impact of any one of them falling — useful for people with costs or plans in several countries." }],
  },
  {
    slug: "currency-hedging-calculator",
    title: "Currency Hedging Calculator",
    description: "Compare the currency result on a foreign investment with and without a hedge — for any hedge ratio — after the hedge's cost.",
    metaTitle: "Currency Hedging Calculator — Hedged vs Unhedged",
    metaDescription: "Free currency hedging calculator. Compare the currency gain or loss on a foreign asset hedged vs unhedged, at any hedge ratio, after hedge costs.",
    calcInputs: [
      currencyField("foreignAssetValue", "Foreign Asset Value (in Your Currency)", { default: 100000, max: 100000000000, step: 1000 }),
      percentField("hedgeRatioPercent", "Hedge Ratio", { default: 50, max: 100, step: 5 }),
      percentField("currencyMovePercent", "Foreign Currency Move", { default: -8, min: -100, max: 1000, step: 0.5 }),
      percentField("annualHedgeCostPercent", "Yearly Hedge Cost", { default: 1.5, max: 20, step: 0.1 }),
      numberField("months", "Months", { unit: "months", default: 12, min: 0, max: 600, step: 1 }),
    ],
    calcResult: { label: "Currency Result Hedged", format: "currency" },
    calcResults: [
      { key: "currencyResultHedged", label: "Currency Result — Hedged", format: "currency", highlight: true },
      { key: "currencyResultUnhedged", label: "Currency Result — Unhedged", format: "currency" },
      { key: "hedgeCost", label: "Hedge Cost", format: "currency" },
      { key: "differenceFromHedging", label: "Difference from Hedging", format: "currency" },
    ],
    instructions: "Enter the value of your foreign assets in your currency, the share you hedge, a currency move to test, the hedge's yearly cost (roughly the interest-rate gap between the two currencies) and the period.",
    examples: "Example: if the foreign currency falls 8% on a $100,000 holding, unhedged you lose $8,000. Hedging half costs $750 over a year but cuts the loss to $4,750 — $3,250 better.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should investors hedge currency risk?", answer: "Hedging usually makes sense for foreign bonds, where currency swings dwarf returns. For stocks, many investors hedge part or none, since currencies can help diversify over time." }],
  },
  {
    slug: "fx-hedge-ratio-calculator",
    title: "FX Hedge Ratio Calculator",
    description: "Calculate the minimum-variance hedge ratio for a currency exposure from correlation and volatilities, and the number of futures contracts needed.",
    metaTitle: "FX Hedge Ratio Calculator — Minimum Variance",
    metaDescription: "Free FX hedge ratio calculator. Find the minimum-variance hedge ratio from correlation and volatility, the amount to hedge and futures contracts needed.",
    calcInputs: [
      numberField("correlation", "Correlation (Spot vs Futures)", { default: 0.9, min: -1, max: 1, step: 0.01 }),
      percentField("spotVolatilityPercent", "Spot Volatility", { default: 10, max: 200, step: 0.5 }),
      percentField("futuresVolatilityPercent", "Futures Volatility", { default: 11, min: 0.1, max: 200, step: 0.5 }),
      numberField("exposure", "Exposure (Foreign Currency)", { default: 1000000, min: 0, max: 100000000000, step: 10000 }),
      numberField("contractSize", "Futures Contract Size", { default: 125000, min: 1, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Optimal Hedge Ratio", format: "number", decimals: 4 },
    calcResults: [
      { key: "optimalHedgeRatio", label: "Optimal Hedge Ratio", format: "number", decimals: 4, highlight: true },
      { key: "amountToHedge", label: "Amount to Hedge", format: "number", decimals: 2 },
      { key: "contractsNeeded", label: "Contracts Needed (Exact)", format: "number" },
      { key: "contractsRounded", label: "Contracts (Rounded)", format: "number" },
      { key: "varianceReductionPercent", label: "Risk (Variance) Reduction", format: "percentage" },
    ],
    instructions: "Enter the correlation between the exposure's currency and the futures contract, both volatilities, the exposure and the contract size (125,000 euros for CME euro futures).",
    examples: "Example: with 0.9 correlation, 10% spot and 11% futures volatility, the optimal hedge ratio is 0.8182. Hedging 1,000,000 euros means 818,181.82 — 6.55 contracts, rounded to 7 — cutting variance by 81%.",
    assumptions: "Estimates of correlation and volatility come from past data and change over time. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why not always hedge 100%?", answer: "When the hedging instrument doesn't move exactly with the exposure (basis risk), a hedge ratio below 1 can reduce risk more than a full hedge." }],
  },
  {
    slug: "currency-exposure-calculator",
    title: "Currency Exposure Calculator",
    description: "Measure a business's net foreign currency exposure — receivables minus payables, less what's already hedged — and what a sudden currency move would cost.",
    metaTitle: "Currency Exposure Calculator — Net Open Position",
    metaDescription: "Free currency exposure calculator. Net receivables against payables and hedges to find open FX exposure and the impact of a rate shock.",
    calcInputs: [
      numberField("receivables", "Foreign-Currency Receivables", { default: 800000, min: 0, max: 100000000000, step: 1000 }),
      numberField("payables", "Foreign-Currency Payables", { default: 300000, min: 0, max: 100000000000, step: 1000 }),
      numberField("hedgedAmount", "Amount Already Hedged", { default: 250000, min: 0, max: 100000000000, step: 1000 }),
      rateField("exchangeRate", "Exchange Rate (Home per 1 Foreign)", { default: 1.085 }),
      percentField("shockPercent", "Currency Shock to Test", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Impact of Shock", format: "currency" },
    calcResults: [
      { key: "impactOfShock", label: "Loss from an Adverse Shock", format: "currency", highlight: true },
      { key: "netExposure", label: "Net Exposure (Foreign)", format: "number", decimals: 2 },
      { key: "openExposure", label: "Open (Unhedged) Exposure (Foreign)", format: "number", decimals: 2 },
      { key: "openExposureInHomeCurrency", label: "Open Exposure in Your Currency", format: "currency" },
      { key: "hedgedSharePercent", label: "Share Hedged", format: "percentage" },
    ],
    instructions: "Enter what customers owe you and what you owe suppliers in the foreign currency, what you've already hedged, today's rate and a shock to test. Payables naturally offset receivables.",
    examples: "Example: 800,000 of receivables against 300,000 of payables leaves 500,000 of net exposure; with 250,000 hedged (50%), 250,000 is open — $271,250. A 10% adverse move would cost $27,125.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a natural hedge?", answer: "Matching foreign-currency income with costs in the same currency, so a move that cuts one also cuts the other." }],
  },
  {
    slug: "foreign-currency-invoice-calculator",
    title: "Foreign Currency Invoice Calculator",
    description: "Work out how much to invoice a customer in their currency so you receive a target amount in yours — covering bank fees and a buffer for rate moves — and what you'd get if the rate turns against you.",
    metaTitle: "Foreign Currency Invoice Calculator — Price It Right",
    metaDescription: "Free foreign currency invoice calculator. Find the foreign amount to invoice to receive your target after fees, with a buffer and a worst-case check.",
    calcInputs: [
      currencyField("targetHomeAmount", "Amount You Want to Receive", { default: 10000, max: 1000000000, step: 100 }),
      rateField("exchangeRate", "Current Rate (Foreign per 1 Home)", { default: 0.92 }),
      percentField("bankFeePercent", "Bank or Platform Conversion Fee", { default: 1, max: 50, step: 0.1 }),
      percentField("bufferPercent", "Buffer for Rate Moves", { default: 3, max: 50, step: 0.5 }),
      rateField("worstCaseRate", "Worst-Case Rate at Payment (Foreign per 1 Home)", { default: 0.96 }),
    ],
    calcResult: { label: "Amount to Invoice", format: "number", decimals: 2 },
    calcResults: [
      { key: "amountToInvoice", label: "Amount to Invoice (Foreign)", format: "number", decimals: 2, highlight: true },
      { key: "receivedAtCurrentRate", label: "You Receive at Today's Rate", format: "currency" },
      { key: "receivedAtWorstRate", label: "You Receive at the Worst-Case Rate", format: "currency" },
      { key: "worstCaseVsTarget", label: "Worst Case vs Target", format: "currency" },
    ],
    instructions: "Enter what you need to receive in your currency, today's rate, the fee your bank or payment platform takes to convert, a buffer, and a worst-case rate for when the customer pays.",
    examples: "Example: to receive $10,000 at 0.92 euros per dollar with a 1% fee and a 3% buffer, invoice 9,571.72 euros. At today's rate you'd get $10,300; if the rate moves to 0.96, you'd get $9,870.83 — $129.17 short.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I invoice in my currency or the customer's?", answer: "Invoicing in yours moves the currency risk to the customer; invoicing in theirs can win business but leaves the risk with you." }],
  },
  {
    slug: "import-cost-currency-calculator",
    title: "Import Cost Currency Calculator",
    description: "Calculate the landed cost of imported goods in your currency — supplier price, payment fee, import duty and shipping — and what a currency move would add.",
    metaTitle: "Import Cost Currency Calculator — Landed Cost",
    metaDescription: "Free import cost currency calculator. Convert supplier prices and add fees, duty and shipping for landed cost per unit, plus the impact of a currency move.",
    calcInputs: [
      numberField("unitPriceForeign", "Supplier Price per Unit (Foreign)", { default: 20, min: 0, max: 100000000, step: 0.5 }),
      numberField("quantity", "Quantity", { default: 1000, min: 0, max: 1000000000, step: 10 }),
      rateField("exchangeRate", "Exchange Rate (Foreign per 1 Home)", { default: 0.92 }),
      currencyField("shippingHome", "Shipping & Freight", { default: 1500, max: 100000000, step: 50 }),
      percentField("dutyPercent", "Import Duty", { default: 5, max: 200, step: 0.5 }),
      percentField("paymentFeePercent", "Payment / Conversion Fee", { default: 1, max: 20, step: 0.1 }),
      percentField("currencyMovePercent", "Foreign Currency Rise to Test", { default: 5, min: -50, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Total Landed Cost", format: "currency" },
    calcResults: [
      { key: "totalLandedCost", label: "Total Landed Cost", format: "currency", highlight: true },
      { key: "landedCostPerUnit", label: "Landed Cost per Unit", format: "currency" },
      { key: "goodsCostInHomeCurrency", label: "Goods Cost in Your Currency", format: "currency" },
      { key: "landedCostAfterCurrencyMove", label: "Landed Cost After the Currency Move", format: "currency" },
      { key: "extraCostFromMove", label: "Extra Cost from the Move", format: "currency" },
    ],
    instructions: "Enter the supplier's unit price and quantity, the exchange rate, shipping, the duty rate and your payment fee. The test shows what happens if the supplier's currency rises by the percentage you choose before you pay.",
    examples: "Example: 1,000 units at 20 euros each cost $21,739.13. Adding the 1% payment fee, 5% duty and $1,500 of shipping gives $24,543.48 — $24.54 a unit. A 5% rise in the euro would add $1,152.17.",
    assumptions: "Duty is applied to the goods' value; some countries also add import VAT or charge duty on shipping. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How can importers manage currency risk?", answer: "Lock in a forward rate when you place the order, pay in your own currency if the supplier agrees, or build a buffer into your selling prices." }],
  },
  {
    slug: "export-revenue-currency-calculator",
    title: "Export Revenue Currency Calculator",
    description: "Convert export sales earned in a foreign currency into your currency, with part of them locked in at a forward rate, and see how a rate move changes the result.",
    metaTitle: "Export Revenue Currency Calculator — Partly Hedged",
    metaDescription: "Free export revenue currency calculator. Convert foreign sales into your currency with part hedged at a forward rate, and test a rate move.",
    calcInputs: [
      numberField("salesForeign", "Export Sales (Foreign Currency)", { default: 250000, min: 0, max: 100000000000, step: 1000 }),
      rateField("spotRate", "Spot Rate (Home per 1 Foreign)", { default: 1.085 }),
      percentField("hedgedPercent", "Share Hedged with Forwards", { default: 60, max: 100, step: 5 }),
      rateField("forwardRate", "Forward Rate (Home per 1 Foreign)", { default: 1.09 }),
      percentField("feePercent", "Conversion Fee", { default: 0.5, max: 20, step: 0.1 }),
      percentField("rateMovePercent", "Rate Move to Test", { default: -5, min: -99, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Revenue in Your Currency", format: "currency" },
    calcResults: [
      { key: "homeRevenue", label: "Revenue in Your Currency", format: "currency", highlight: true },
      { key: "revenueAfterRateMove", label: "Revenue After the Rate Move", format: "currency" },
      { key: "changeFromRateMove", label: "Change from the Rate Move", format: "currency" },
      { key: "revenueIfFullyUnhedged", label: "Revenue if Unhedged at Spot", format: "currency" },
      { key: "changePerOnePercentMove", label: "Change per 1% Rate Move", format: "currency" },
    ],
    instructions: "Enter your foreign sales, today's spot rate, the share you've sold forward and at what rate, your conversion fee and a rate move to test on the unhedged part.",
    examples: "Example: 250,000 euros of sales with 60% hedged at 1.09 and the rest at 1.085 bring in $270,640 after fees. A 5% fall in the euro would cut that by $5,397.87 — each 1% move is worth about $1,079.58.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How much of their exports do companies hedge?", answer: "Many hedge 50% to 80% of forecast sales for the next year, more for near-term flows they're sure of and less further out." }],
  },
  {
    slug: "foreign-investment-currency-return-calculator",
    title: "Foreign Investment Currency Return Calculator",
    description: "See how the currency changes an overseas investment's return in your money — unhedged, where the currency move adds or subtracts, versus hedged at a cost.",
    metaTitle: "Foreign Investment Return in Your Currency",
    metaDescription: "Free foreign investment currency return calculator. Combine the local return with the currency move, and compare with a hedged return after costs.",
    calcInputs: [
      currencyField("amount", "Amount Invested", { default: 10000, max: 1000000000, step: 100 }),
      percentField("localReturnPercent", "Return in the Local Currency", { default: 8, min: -100, max: 1000, step: 0.5 }),
      percentField("currencyChangePercent", "Change in the Foreign Currency", { default: -4, min: -100, max: 1000, step: 0.5 }),
      percentField("hedgeCostPercent", "Hedging Cost", { default: 1.5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Unhedged Return", format: "percentage" },
    calcResults: [
      { key: "unhedgedReturnPercent", label: "Return in Your Currency — Unhedged", format: "percentage", highlight: true },
      { key: "hedgedReturnPercent", label: "Return in Your Currency — Hedged", format: "percentage" },
      { key: "currencyEffectPoints", label: "Currency Effect (Points)", format: "percentage" },
      { key: "unhedgedEndValue", label: "End Value — Unhedged", format: "currency" },
      { key: "hedgedEndValue", label: "End Value — Hedged", format: "currency" },
    ],
    instructions: "Enter the amount, the investment's return in its own currency, how much that currency rose or fell against yours, and the cost of hedging it for the period.",
    examples: "Example: a foreign fund returning 8% while its currency falls 4% earns you only 3.68% unhedged ($10,368). Fully hedged at a 1.5% cost, you'd earn 6.5% ($10,650).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How does currency affect foreign investments?", answer: "Your return is the local return combined with the currency move: (1 + local) × (1 + currency) − 1. A falling foreign currency eats into gains." }],
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
