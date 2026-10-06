// One-time (but safe to re-run) batch setup script: creates the Derivatives & Trading Strategies tools
// (8) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Trading & Profit Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-derivatives.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-derivatives-calculators.ts
// or
//   npm run db:create-crypto-derivatives-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Crypto Calculators", slug: "crypto-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Crypto Trading & Profit Calculators", slug: "crypto-trading-profit-calculators" };

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

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't financial, investment or " +
  "tax advice. Crypto assets are highly volatile and can lose all their value; fees, rates and rules vary by " +
  "platform, network and country — check current figures before you act.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "perpetual-funding-rate-calculator",
    title: "Crypto Perpetual Futures Funding Rate Calculator",
    description: "Calculate perpetual futures funding payments for long or short positions, the annualized funding rate, and the return from a delta-neutral funding rate arbitrage.",
    metaTitle: "Perpetual Funding Rate Calculator — Funding Arbitrage",
    metaDescription: "Free crypto funding rate calculator. Find funding paid or received on perpetual futures and the return on funding arbitrage.",
    calcInputs: [
      currencyField("positionSize", "Position Size", { default: 10000, max: 1000000000, step: 100 }),
      numberField("fundingRatePercent", "Funding Rate per Interval (%)", { default: 0.01, min: -1, max: 1, step: 0.001 }),
      numberField("intervalsPerDay", "Funding Intervals per Day", { default: 3, min: 1, max: 24, step: 1 }),
      numberField("days", "Days Held", { default: 30, min: 0, max: 3650, step: 1 }),
      {
        key: "side", label: "Your Perpetual Position", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Long", value: 1 },
          { label: "Short", value: 2 },
        ],
      },
      percentField("tradingFeesPercent", "Arbitrage Trading Fees (All Legs)", { default: 0.4, max: 5, step: 0.05 }),
      numberField("perpLeverage", "Leverage on the Short Perp (Arbitrage)", { default: 3, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Funding Received or Paid", format: "currency" },
    calcResults: [
      { key: "fundingPerInterval", label: "Funding per Interval", format: "currency" },
      { key: "fundingReceivedOrPaid", label: "Funding Received (+) or Paid (−)", format: "currency", highlight: true },
      { key: "annualizedFundingRate", label: "Annualized Funding Rate", format: "percentage" },
      { key: "arbitrageNetProfit", label: "Funding Arbitrage Net Profit", format: "currency" },
      { key: "arbitrageAprOnCapital", label: "Funding Arbitrage APR on Capital", format: "percentage" },
    ],
    instructions:
      "Perpetual futures have no expiry; instead, traders pay each other a funding rate (usually every 8 hours) that " +
      "keeps the price near spot. When funding is positive, longs pay shorts; when negative, shorts pay longs.\n\n" +
      "Funding rate arbitrage buys the coin on spot and shorts the same amount on the perp, so price moves cancel out and " +
      "you collect positive funding. Rates change every interval and can turn negative.",
    examples:
      "Example: a $10,000 long perp at a 0.01% funding rate three times a day pays about $90 over " +
      "30 days — 10.95% a year. Running it as a delta-neutral arbitrage would earn $50 after fees.",
    assumptions:
      "Constant funding rate; spot and perp prices move together. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is funding rate arbitrage risk-free?",
        answer: "No — funding can flip negative, the short can be liquidated in a sharp rally if under-collateralized, and the exchange itself is a risk.",
      },
    ],
  },
  {
    slug: "crypto-basis-trade-calculator",
    title: "Crypto Futures Basis Trade Calculator",
    description: "Calculate the return from a crypto cash-and-carry basis trade — buying spot and selling a dated future at a premium — annualized and compared with a cash yield.",
    metaTitle: "Crypto Basis Trade Calculator — Cash-and-Carry Return",
    metaDescription: "Free crypto basis trade calculator. Find the futures premium, annualized basis and net return of a cash-and-carry trade.",
    calcInputs: [
      currencyField("spotPrice", "Spot Price", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("futuresPrice", "Futures Price", { default: 61500, max: 10000000, step: 0.01 }),
      numberField("daysToExpiry", "Days to Expiry", { default: 90, min: 1, max: 730, step: 1 }),
      currencyField("positionSize", "Position Size", { default: 100000, max: 1000000000, step: 1000 }),
      percentField("feesPercent", "Total Trading Fees", { default: 0.2, max: 5, step: 0.05 }),
      percentField("cashYieldPercent", "Cash / Treasury Yield to Beat", { default: 4.5, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Net Annualized Return", format: "percentage" },
    calcResults: [
      { key: "basisPercent", label: "Basis (Futures Premium)", format: "percentage" },
      { key: "annualizedBasisPercent", label: "Annualized Basis", format: "percentage" },
      { key: "profitAtExpiry", label: "Profit at Expiry (After Fees)", format: "currency" },
      { key: "netAnnualizedReturn", label: "Net Annualized Return", format: "percentage", highlight: true },
      { key: "excessOverCashYield", label: "Excess over Cash Yield", format: "percentage" },
    ],
    instructions:
      "When futures trade above spot (contango), you can buy the coin and sell the future: at expiry the prices converge " +
      "and you lock in the premium regardless of where the price goes. Institutions run this on CME and exchange futures.\n\n" +
      "Returns compare with a near risk-free yield, since the trade is market-neutral — but it ties up capital and needs " +
      "margin on the short.",
    examples:
      "Example: buying spot at $60,000 and selling a 90-day future at $61,500 locks in 2.50% — " +
      "$2,300 on $100,000, or 9.33% a year after fees.",
    assumptions:
      "Held to expiry; margin, funding of the margin and taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do crypto futures trade above spot?",
        answer: "Demand for leveraged long exposure usually exceeds the supply of sellers, so buyers pay a premium for futures.",
      },
    ],
  },
  {
    slug: "crypto-options-premium-calculator",
    title: "Crypto Options Premium Calculator",
    description: "Estimate the fair premium of a Bitcoin or Ethereum call or put option with the Black-Scholes model, plus its break-even price at expiry and delta.",
    metaTitle: "Crypto Options Premium Calculator — Black-Scholes",
    metaDescription: "Free crypto options calculator. Price BTC or ETH calls and puts with Black-Scholes and see break-even and delta.",
    calcInputs: [
      currencyField("spot", "Current Price", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("strike", "Strike Price", { default: 65000, max: 10000000, step: 0.01 }),
      numberField("days", "Days to Expiry", { default: 30, min: 0.01, max: 1095, step: 1 }),
      percentField("impliedVolPercent", "Implied Volatility", { default: 55, max: 400, step: 1 }),
      percentField("ratePercent", "Risk-Free Rate", { default: 4.5, max: 20, step: 0.1 }),
      {
        key: "type", label: "Option Type", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Call", value: 1 },
          { label: "Put", value: 2 },
        ],
      },
      numberField("coins", "Coins (Contract Size × Contracts)", { default: 1, min: 0, max: 1000000, step: 0.01 }),
    ],
    calcResult: { label: "Premium per Coin", format: "currency" },
    calcResults: [
      { key: "premiumPerCoin", label: "Premium per Coin", format: "currency", highlight: true },
      { key: "totalPremium", label: "Total Premium", format: "currency" },
      { key: "premiumPercentOfSpot", label: "Premium as % of Price", format: "percentage" },
      { key: "breakEvenAtExpiry", label: "Break-Even Price at Expiry", format: "currency" },
      { key: "delta", label: "Delta", format: "number", decimals: 3 },
    ],
    instructions:
      "An option's premium depends on the price, strike, time left and — above all for crypto — implied volatility, which " +
      "is often 40–80% for Bitcoin and higher for altcoins. Black-Scholes gives a fair-value estimate; market quotes on " +
      "options exchanges may differ.\n\n" +
      "Delta shows how much the option's price moves for a $1 move in the coin.",
    examples:
      "Example: a 30-day call with a $65,000 strike when the price is $60,000 and implied volatility is 55% is worth " +
      "about $1,989.45 per coin. It breaks even at expiry above $66,989.45.",
    assumptions:
      "European exercise; no dividends; constant volatility. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why are crypto options so expensive?",
        answer: "Because crypto prices swing far more than stocks — higher volatility means a higher chance of a big payoff, so premiums are higher.",
      },
    ],
  },
  {
    slug: "crypto-grid-trading-calculator",
    title: "Crypto Grid Trading Calculator",
    description: "Estimate the profit from a crypto grid trading bot: grid spacing, profit per grid after fees, and projected returns from completed buy-sell cycles.",
    metaTitle: "Crypto Grid Trading Calculator — Grid Bot Profit",
    metaDescription: "Free grid trading calculator. Find grid spacing, profit per grid after fees, and projected grid bot returns.",
    calcInputs: [
      currencyField("lowerPrice", "Lower Price", { default: 55000, max: 10000000, step: 0.01 }),
      currencyField("upperPrice", "Upper Price", { default: 65000, max: 10000000, step: 0.01 }),
      numberField("grids", "Number of Grids", { default: 20, min: 1, max: 1000, step: 1 }),
      currencyField("investment", "Investment", { default: 10000, max: 1000000000, step: 100 }),
      percentField("feePercent", "Trading Fee per Order", { default: 0.1, max: 2, step: 0.01 }),
      numberField("tradesPerDay", "Completed Grid Trades per Day", { default: 4, min: 0, max: 1000, step: 1 }),
      numberField("days", "Days Running", { default: 30, min: 0, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Total Grid Profit", format: "currency" },
    calcResults: [
      { key: "gridStep", label: "Grid Spacing", format: "currency" },
      { key: "profitPerGridPercent", label: "Profit per Grid (After Fees)", format: "percentage" },
      { key: "profitPerRoundTrip", label: "Profit per Completed Trade", format: "currency" },
      { key: "totalGridProfit", label: "Total Grid Profit", format: "currency", highlight: true },
      { key: "returnPercent", label: "Return", format: "percentage" },
      { key: "annualizedReturn", label: "Annualized Return", format: "percentage" },
    ],
    instructions:
      "A grid bot places buy orders below the price and sell orders above it at even intervals, earning the spacing each " +
      "time the price bounces between two levels. It works best in sideways markets.\n\n" +
      "If the price leaves the range, the bot stops trading and you may hold coins bought at higher prices (or cash if it " +
      "rises above) — that price risk isn't included in grid profit.",
    examples:
      "Example: 20 grids between $55,000 and $65,000 are $500 apart, earning 0.63% per grid after fees. " +
      "At 4 completed trades a day, $10,000 makes about $380 in 30 days.",
    assumptions:
      "Arithmetic grid; equal capital per grid; profit measured at the range midpoint. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many grids should I use?",
        answer: "More grids mean more, smaller trades — the spacing must stay well above twice your trading fee or each trade loses money.",
      },
    ],
  },
  {
    slug: "crypto-copy-trading-calculator",
    title: "Crypto Copy Trading Calculator",
    description: "Estimate your return from copying a crypto trader: the leader's return, less copy slippage and the profit share they take.",
    metaTitle: "Crypto Copy Trading Calculator — Returns After Profit Share",
    metaDescription: "Free crypto copy trading calculator. Estimate copy trading profit after slippage, profit share and platform fees.",
    calcInputs: [
      currencyField("investment", "Amount Allocated", { default: 5000, max: 100000000, step: 100 }),
      numberField("leaderReturnPercent", "Lead Trader's Return for the Period (%)", { default: 40, min: -100, max: 10000, step: 1 }),
      numberField("months", "Period (Months)", { default: 6, min: 0.1, max: 120, step: 1 }),
      percentField("slippagePercent", "Copy Slippage / Lag", { default: 2, max: 50, step: 0.5 }),
      percentField("profitSharePercent", "Profit Share to the Lead Trader", { default: 10, max: 50, step: 1 }),
      currencyField("platformFeeMonthly", "Subscription Fee per Month", { default: 0, max: 1000, step: 1, required: false }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
      { key: "profitShareFee", label: "Profit Share Paid", format: "currency" },
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "netReturnPercent", label: "Net Return", format: "percentage" },
      { key: "annualizedReturn", label: "Annualized Return", format: "percentage" },
    ],
    instructions:
      "Copy trading mirrors another trader's positions in your account. You rarely match their results exactly: your " +
      "orders fill a moment later at slightly worse prices, and most platforms take 8–20% of your profits for the lead " +
      "trader.\n\n" +
      "Past returns, especially short-term and leveraged ones, often don't last.",
    examples:
      "Example: copying a trader who made 40% over 6 months with $5,000 earns $1,900; after a " +
      "10% profit share you keep $1,710 (34.20%).",
    assumptions:
      "Profit share on net gains only. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I lose more than I invest copy trading?",
        answer: "On spot copy trading, no; with leveraged futures copy trading, liquidations can wipe out the allocated margin quickly.",
      },
    ],
  },
  {
    slug: "crypto-arbitrage-profit-calculator",
    title: "Crypto Arbitrage Profit Calculator",
    description: "Calculate the profit from buying crypto on one exchange and selling it on another, after trading fees and the transfer cost, and the spread needed to break even.",
    metaTitle: "Crypto Arbitrage Calculator — Cross-Exchange Profit",
    metaDescription: "Free crypto arbitrage calculator. Find cross-exchange profit after fees and transfer costs, and the break-even spread.",
    calcInputs: [
      currencyField("buyPrice", "Buy Price (Exchange A)", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("sellPrice", "Sell Price (Exchange B)", { default: 60450, max: 10000000, step: 0.01 }),
      currencyField("amount", "Amount to Trade", { default: 20000, max: 1000000000, step: 100 }),
      percentField("buyFeePercent", "Buy Fee", { default: 0.1, max: 5, step: 0.01 }),
      percentField("sellFeePercent", "Sell Fee", { default: 0.1, max: 5, step: 0.01 }),
      currencyField("transferFee", "Withdrawal / Network Transfer Fee", { default: 15, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "priceSpreadPercent", label: "Price Spread", format: "percentage" },
      { key: "saleProceeds", label: "Sale Proceeds", format: "currency" },
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "returnPercent", label: "Return", format: "percentage" },
      { key: "breakEvenSpreadPercent", label: "Break-Even Spread", format: "percentage", decimals: 3 },
    ],
    instructions:
      "Prices for the same coin differ slightly between exchanges. Buying where it's cheaper and selling where it's " +
      "dearer captures the gap — if it's bigger than your fees. Gaps usually close in seconds, and transfers between " +
      "exchanges can take minutes to hours, so many arbitrageurs keep balances on both sides.\n\n" +
      "Withdrawal limits and verification rules can also block a trade.",
    examples:
      "Example: buying $20,000 of crypto at $60,000 and selling at $60,450 — a 0.75% spread — nets $94.72 after " +
      "fees. The spread must exceed 0.28% to profit.",
    assumptions:
      "Prices don't move during the transfer. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is crypto arbitrage still profitable?",
        answer: "Large, easy gaps are rare on major exchanges; small gaps exist but need low fees, speed and capital on both sides.",
      },
    ],
  },
  {
    slug: "crypto-triangular-arbitrage-calculator",
    title: "Crypto Triangular Arbitrage Calculator",
    description: "Check a triangular arbitrage loop on one exchange — USDT to BTC to ETH and back to USDT — for profit after three trading fees, and how far the cross rate is mispriced.",
    metaTitle: "Crypto Triangular Arbitrage Calculator",
    metaDescription: "Free triangular arbitrage calculator. Test a USDT-BTC-ETH loop for profit after fees and see the cross-rate mispricing.",
    calcInputs: [
      currencyField("startAmount", "Starting USDT", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("btcUsdt", "BTC/USDT Price", { default: 60000, max: 10000000, step: 0.01 }),
      numberField("ethBtc", "ETH/BTC Price", { default: 0.0575, min: 0, max: 10, step: 0.0001 }),
      currencyField("ethUsdt", "ETH/USDT Price", { default: 3475, max: 1000000, step: 0.01 }),
      percentField("feePercent", "Fee per Trade", { default: 0.1, max: 2, step: 0.01 }),
    ],
    calcResult: { label: "Profit", format: "currency" },
    calcResults: [
      { key: "endingAmount", label: "Ending USDT", format: "currency" },
      { key: "profit", label: "Profit", format: "currency", highlight: true },
      { key: "profitPercent", label: "Profit", format: "percentage" },
      { key: "impliedEthUsdt", label: "Implied ETH/USDT (BTC/USDT × ETH/BTC)", format: "currency" },
      { key: "mispricingPercent", label: "Cross-Rate Mispricing", format: "percentage" },
    ],
    instructions:
      "Triangular arbitrage trades three pairs in a loop on one exchange. If the quoted ETH/USDT price differs from the " +
      "price implied by BTC/USDT × ETH/BTC by more than three trading fees, the loop ends with more than it started.\n\n" +
      "Real opportunities last milliseconds and are taken by bots; use order book prices you could actually fill at.",
    examples:
      "Example: with BTC at $60,000 and ETH/BTC at 0.0575, ETH should be $3,450. If ETH/USDT quotes $3,475, looping " +
      "$10,000 ends with $10,042.28 — $42.28 after fees.",
    assumptions:
      "All three trades fill at the quoted prices. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which direction should the loop go?",
        answer: "If ETH/USDT is above its implied price, go USDT→BTC→ETH→USDT; if below, run the loop the other way.",
      },
    ],
  },
  {
    slug: "crypto-maker-taker-fee-calculator",
    title: "Crypto Maker vs Taker Fee Calculator",
    description: "Compare the cost of limit orders (maker fees) with market orders (taker fees plus slippage) on crypto exchanges, per trade and per year.",
    metaTitle: "Crypto Maker vs Taker Fee Calculator — Limit vs Market",
    metaDescription: "Free maker vs taker fee calculator. Compare limit and market order costs on crypto exchanges, including slippage.",
    calcInputs: [
      currencyField("tradeSize", "Trade Size", { default: 10000, max: 1000000000, step: 100 }),
      numberField("tradesPerMonth", "Trades per Month", { default: 20, min: 0, max: 10000, step: 1 }),
      percentField("makerFeePercent", "Maker Fee", { default: 0.08, max: 2, step: 0.01 }),
      percentField("takerFeePercent", "Taker Fee", { default: 0.1, max: 2, step: 0.01 }),
      percentField("slippagePercent", "Market Order Slippage", { default: 0.05, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "Yearly Savings with Limit Orders", format: "currency" },
    calcResults: [
      { key: "limitOrderCostPerTrade", label: "Limit Order Cost per Trade", format: "currency" },
      { key: "marketOrderCostPerTrade", label: "Market Order Cost per Trade", format: "currency" },
      { key: "monthlyLimitCost", label: "Monthly Cost (Limit Orders)", format: "currency" },
      { key: "monthlyMarketCost", label: "Monthly Cost (Market Orders)", format: "currency" },
      { key: "yearlySavingsWithLimitOrders", label: "Yearly Savings with Limit Orders", format: "currency", highlight: true },
    ],
    instructions:
      "A limit order that rests on the order book adds liquidity and pays the lower maker fee; a market order takes " +
      "liquidity, pays the taker fee and can fill at a worse price (slippage). Fees drop at higher monthly volumes or when " +
      "you hold an exchange's token.\n\n" +
      "Limit orders may not fill if the price moves away — the cost of a missed trade isn't counted here.",
    examples:
      "Example: 20 trades of $10,000 a month cost $300 with market orders but $160 with limit orders — " +
      "$1,680 saved a year.",
    assumptions:
      "All limit orders fill as maker. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can a limit order still be charged the taker fee?",
        answer: "Yes — if your limit price crosses the spread and fills immediately, it's treated as a taker order. A \"post-only\" option prevents that.",
      },
    ],
  },
];

// Crypto Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
