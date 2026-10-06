// One-time (but safe to re-run) batch setup script: creates the Crypto Trading tools
// (8) of the Crypto Calculators expansion, filed under Crypto
// Calculators > Crypto Trading & Profit Calculators (both categories are created on first run).
// See src/lib/calc-engine-crypto-trading.ts for the math and
// src/lib/calc-engine-crypto-trading.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-crypto-trading-calculators.ts
// or
//   npm run db:create-crypto-trading-calculators

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
    slug: "crypto-profit-and-loss-calculator",
    title: "Crypto Profit and Loss Calculator",
    description: "Calculate profit or loss on Bitcoin, Ethereum, Solana, XRP, BNB, Cardano, Dogecoin and any other crypto trade after exchange fees, with ROI, annualized return and your break-even sell price.",
    metaTitle: "Crypto Profit Calculator — Bitcoin & Altcoin Profit and Loss",
    metaDescription: "Free crypto profit and loss calculator for Bitcoin, Ethereum and any coin. Find profit, ROI and break-even price after fees.",
    calcInputs: [
      {
        key: "coin", label: "Coin", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Bitcoin (BTC)", value: 1 },
          { label: "Ethereum (ETH)", value: 2 },
          { label: "Solana (SOL)", value: 3 },
          { label: "XRP", value: 4 },
          { label: "BNB", value: 5 },
          { label: "Cardano (ADA)", value: 6 },
          { label: "Dogecoin (DOGE)", value: 7 },
          { label: "Litecoin (LTC)", value: 8 },
          { label: "Polkadot (DOT)", value: 9 },
          { label: "Avalanche (AVAX)", value: 10 },
          { label: "Polygon (POL)", value: 11 },
          { label: "Chainlink (LINK)", value: 12 },
          { label: "Other Coin or Token", value: 13 },
        ],
      },
      currencyField("investment", "Amount Invested", { default: 1000, max: 100000000, step: 50 }),
      currencyField("buyPrice", "Buy Price per Coin", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("sellPrice", "Sell Price per Coin", { default: 75000, max: 10000000, step: 0.01 }),
      percentField("buyFeePercent", "Buy Fee", { default: 0.5, max: 10, step: 0.05 }),
      percentField("sellFeePercent", "Sell Fee", { default: 0.5, max: 10, step: 0.05 }),
      numberField("holdingDays", "Days Held", { default: 365, min: 1, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "coinsBought", label: "Coins Bought", format: "number", decimals: 8 },
      { key: "saleProceeds", label: "Sale Proceeds (After Fee)", format: "currency" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "roiPercent", label: "Return on Investment", format: "percentage" },
      { key: "annualizedRoiPercent", label: "Annualized Return", format: "percentage" },
      { key: "breakEvenSellPrice", label: "Break-Even Sell Price", format: "currency" },
    ],
    instructions:
      "Pick the coin, then enter what you invested and your buy and sell prices. Exchange fees are taken when you buy " +
      "(fewer coins) and when you sell (smaller proceeds), so your break-even price is a little above your buy price.\n\n" +
      "The math is the same for every coin — the coin choice is just a label. Profits from selling or trading crypto " +
      "are taxable in most countries.",
    examples:
      "Example: investing $1,000 at $60,000 and selling at $75,000 with 0.5% fees each way returns $1,237.53 — " +
      "a profit of $237.53 (23.75%). You'd break even at $60,604.53.",
    assumptions:
      "Percentage fees on each trade; network withdrawal fees and taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is swapping one crypto for another taxable?",
        answer: "In the US and many other countries, yes — a crypto-to-crypto trade is treated as selling the first coin.",
      },
    ],
  },
  {
    slug: "nft-profit-and-loss-calculator",
    title: "NFT Profit and Loss Calculator",
    description: "Calculate profit or loss when you flip an NFT, after marketplace fees, creator royalties and gas fees, plus the break-even sale price.",
    metaTitle: "NFT Profit Calculator — Fees, Royalties & Gas",
    metaDescription: "Free NFT profit and loss calculator. Find your NFT profit after marketplace fees, creator royalties and gas, and your break-even price.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase or Mint Price", { default: 2000, max: 100000000, step: 10 }),
      currencyField("gasToBuy", "Gas Fee to Buy or Mint", { default: 20, max: 10000, step: 1 }),
      currencyField("salePrice", "Sale Price", { default: 3500, max: 100000000, step: 10 }),
      percentField("marketplaceFeePercent", "Marketplace Fee", { default: 2.5, max: 20, step: 0.1 }),
      percentField("royaltyPercent", "Creator Royalty", { default: 5, max: 20, step: 0.5 }),
      currencyField("gasToSell", "Gas Fee to Sell", { default: 15, max: 10000, step: 1, required: false }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "marketplaceAndRoyaltyFees", label: "Marketplace Fee & Royalty", format: "currency" },
      { key: "netProceeds", label: "Net Proceeds", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency" },
      { key: "profitOrLoss", label: "Profit or Loss", format: "currency", highlight: true },
      { key: "roiPercent", label: "Return on Investment", format: "percentage" },
      { key: "breakEvenSalePrice", label: "Break-Even Sale Price", format: "currency" },
    ],
    instructions:
      "When an NFT sells, the marketplace takes a fee and the creator may receive a royalty — both come out of the sale " +
      "price. Gas fees apply on blockchains like Ethereum when you mint, buy or list. Royalties are optional on some " +
      "marketplaces.\n\n" +
      "Enter prices in dollars at the time of each trade; if you priced in ETH, the dollar value at sale is what matters for tax.",
    examples:
      "Example: buying an NFT for $2,000 and selling for $3,500 with a 2.50% fee and 5% " +
      "royalty nets $3,222.50 — a profit of $1,202.50. You'd need to sell for $2,200 to break even.",
    assumptions:
      "Fees as a share of the sale price. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Are NFT profits taxed?",
        answer: "Yes — in the US, NFTs are generally taxed like property, and some may be treated as collectibles with a higher long-term rate.",
      },
    ],
  },
  {
    slug: "crypto-portfolio-value-calculator",
    title: "Crypto Portfolio Value Calculator",
    description: "Add up the value of up to five crypto holdings, see your biggest position's share of the portfolio, and your unrealized gain or loss.",
    metaTitle: "Crypto Portfolio Value Calculator — Holdings & Gain",
    metaDescription: "Free crypto portfolio calculator. Total the value of your coins, see each holding's share, and your unrealized gain or loss.",
    calcInputs: [
      numberField("amount1", "Holding 1 — Coins", { default: 0.1, min: 0, max: 1000000000, step: 0.0001 }),
      currencyField("price1", "Holding 1 — Price", { default: 70000, max: 10000000, step: 0.01 }),
      numberField("amount2", "Holding 2 — Coins", { default: 2, min: 0, max: 1000000000, step: 0.0001 }),
      currencyField("price2", "Holding 2 — Price", { default: 3500, max: 10000000, step: 0.01 }),
      numberField("amount3", "Holding 3 — Coins", { default: 20, min: 0, max: 1000000000, step: 0.0001 }),
      currencyField("price3", "Holding 3 — Price", { default: 150, max: 10000000, step: 0.01 }),
      numberField("amount4", "Holding 4 — Coins", { default: 0, min: 0, max: 1000000000, step: 0.0001, required: false }),
      currencyField("price4", "Holding 4 — Price", { default: 0, max: 10000000, step: 0.01, required: false }),
      numberField("amount5", "Holding 5 — Coins", { default: 0, min: 0, max: 1000000000, step: 0.0001, required: false }),
      currencyField("price5", "Holding 5 — Price", { default: 0, max: 10000000, step: 0.01, required: false }),
      currencyField("costBasis", "Total Amount You Paid", { default: 15000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Total Portfolio Value", format: "currency" },
    calcResults: [
      { key: "holding1Value", label: "Holding 1 Value", format: "currency" },
      { key: "holding2Value", label: "Holding 2 Value", format: "currency" },
      { key: "holding3Value", label: "Holding 3 Value", format: "currency" },
      { key: "holding4Value", label: "Holding 4 Value", format: "currency" },
      { key: "holding5Value", label: "Holding 5 Value", format: "currency" },
      { key: "totalValue", label: "Total Portfolio Value", format: "currency", highlight: true },
      { key: "largestHoldingShare", label: "Largest Holding's Share", format: "percentage" },
      { key: "unrealizedGain", label: "Unrealized Gain or Loss", format: "currency" },
      { key: "unrealizedGainPercent", label: "Unrealized Gain or Loss", format: "percentage" },
    ],
    instructions:
      "Enter how many coins you hold of each crypto and today's price. The total shows what your portfolio is worth, and " +
      "comparing it with what you paid shows your unrealized (paper) gain or loss.\n\n" +
      "A single coin making up most of the portfolio means its price swings drive your results.",
    examples:
      "Example: 0.10 BTC at $70,000, 2 ETH at $3,500 and 20 SOL at $150 are worth $17,000. " +
      "Against $15,000 paid, that's an unrealized gain of $2,000.",
    assumptions:
      "Values at the prices you enter. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do I owe tax on unrealized gains?",
        answer: "Generally no — tax is due when you sell, trade or spend crypto, not while you hold it.",
      },
    ],
  },
  {
    slug: "crypto-take-profit-calculator",
    title: "Crypto Take-Profit Calculator",
    description: "Plan profit target prices and a take-profit ladder — selling part of your crypto at up to three targets — and see your average exit price and total profit.",
    metaTitle: "Crypto Take-Profit Calculator — Profit Target & Ladder",
    metaDescription: "Free crypto take-profit calculator. Set profit target prices, plan a take-profit ladder and see your average exit and profit.",
    calcInputs: [
      currencyField("entryPrice", "Entry Price", { default: 60000, max: 10000000, step: 0.01 }),
      numberField("coins", "Coins Held", { default: 0.5, min: 0, max: 1000000000, step: 0.0001 }),
      percentField("gain1Percent", "Target 1 — Gain", { default: 25, max: 10000, step: 5 }),
      percentField("sell1Percent", "Target 1 — Share of Coins to Sell", { default: 30, max: 100, step: 5 }),
      percentField("gain2Percent", "Target 2 — Gain", { default: 50, max: 10000, step: 5 }),
      percentField("sell2Percent", "Target 2 — Share of Coins to Sell", { default: 30, max: 100, step: 5 }),
      percentField("gain3Percent", "Target 3 — Gain", { default: 100, max: 10000, step: 5 }),
      percentField("sell3Percent", "Target 3 — Share of Coins to Sell", { default: 40, max: 100, step: 5 }),
      percentField("feePercent", "Trading Fee", { default: 0.2, max: 5, step: 0.05 }),
    ],
    calcResult: { label: "Total Profit", format: "currency" },
    calcResults: [
      { key: "target1Price", label: "Target 1 Price", format: "currency" },
      { key: "target2Price", label: "Target 2 Price", format: "currency" },
      { key: "target3Price", label: "Target 3 Price", format: "currency" },
      { key: "proceedsFromTargets", label: "Proceeds from Targets", format: "currency" },
      { key: "averageExitPrice", label: "Average Exit Price", format: "currency" },
      { key: "totalProfit", label: "Total Profit", format: "currency", highlight: true },
      { key: "profitPercent", label: "Profit", format: "percentage" },
      { key: "coinsLeftUnsold", label: "Coins Left Unsold", format: "number", decimals: 8 },
    ],
    instructions:
      "A take-profit ladder sells part of a position at each of several price targets, locking in gains on the way up " +
      "while keeping some exposure if the price keeps rising. Set a single target by putting 100% in target 1.\n\n" +
      "If your sell shares add up to less than 100%, the rest is shown as unsold at your entry price; above 100%, they're " +
      "scaled down.",
    examples:
      "Example: holding 0.50 coins bought at $60,000, selling in three steps at $75,000, $90,000 and " +
      "$120,000 gives an average exit of $97,305 and a profit of $18,652.50 (62.18%).",
    assumptions:
      "All targets are reached; taxes not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I sell everything at one target?",
        answer: "Many traders scale out instead, since nobody can reliably pick the top — a ladder trades some upside for more certainty.",
      },
    ],
  },
  {
    slug: "crypto-stop-loss-calculator",
    title: "Crypto Stop-Loss Calculator",
    description: "Find the stop-loss price for a long or short crypto trade, how much you'd lose if it's hit including fees, and a 2:1 reward target.",
    metaTitle: "Crypto Stop-Loss Calculator — Stop Price & Loss",
    metaDescription: "Free crypto stop-loss calculator. Find your stop price, the loss if it triggers including fees, and a 2:1 profit target.",
    calcInputs: [
      currencyField("entryPrice", "Entry Price", { default: 60000, max: 10000000, step: 0.01 }),
      percentField("stopPercent", "Stop Distance", { default: 8, max: 100, step: 0.5 }),
      currencyField("positionSize", "Position Size", { default: 5000, max: 100000000, step: 100 }),
      {
        key: "direction", label: "Trade Direction", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Long (Buy)", value: 1 },
          { label: "Short (Sell)", value: 2 },
        ],
      },
      percentField("feePercent", "Trading Fee per Side", { default: 0.1, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "Stop-Loss Price", format: "currency" },
    calcResults: [
      { key: "stopPrice", label: "Stop-Loss Price", format: "currency", highlight: true },
      { key: "lossAtStop", label: "Loss If Stopped Out (incl. Fees)", format: "currency" },
      { key: "lossPercentOfPosition", label: "Loss as % of Position", format: "percentage" },
      { key: "twoToOneTargetPrice", label: "2:1 Reward Target Price", format: "currency" },
    ],
    instructions:
      "A stop-loss order closes your trade automatically if the price moves against you by a set amount, capping the loss. " +
      "Crypto is volatile, so stops that are too tight get hit by normal swings; many traders set them beyond recent " +
      "support or resistance.\n\n" +
      "In fast markets a stop can fill worse than its price (slippage).",
    examples:
      "Example: a $5,000 long position from $60,000 with an 8% stop exits at $55,200, losing about $409.60 " +
      "with fees. A 2:1 target would be $69,600.",
    assumptions:
      "Stop fills at its price; no leverage. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a stop-market and stop-limit order?",
        answer: "A stop-market fills at the next available price; a stop-limit only fills at your limit or better, so it may not fill in a crash.",
      },
    ],
  },
  {
    slug: "crypto-position-size-calculator",
    title: "Crypto Position Size Calculator",
    description: "Work out how big a crypto position to take so that hitting your stop-loss loses only a set percentage of your account.",
    metaTitle: "Crypto Position Size Calculator — Risk per Trade",
    metaDescription: "Free crypto position size calculator. Size trades from account risk and stop-loss distance, with coins and margin needed.",
    calcInputs: [
      currencyField("accountSize", "Account Size", { default: 10000, max: 1000000000, step: 100 }),
      percentField("riskPercent", "Risk per Trade", { default: 1, max: 100, step: 0.25 }),
      currencyField("entryPrice", "Entry Price", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("stopPrice", "Stop-Loss Price", { default: 57000, max: 10000000, step: 0.01 }),
      numberField("leverage", "Leverage (1 = None)", { default: 1, min: 1, max: 125, step: 1 }),
    ],
    calcResult: { label: "Position Size", format: "currency" },
    calcResults: [
      { key: "riskAmount", label: "Amount at Risk", format: "currency" },
      { key: "stopDistancePercent", label: "Stop Distance", format: "percentage" },
      { key: "positionSizeUsd", label: "Position Size", format: "currency", highlight: true },
      { key: "positionSizeCoins", label: "Position Size in Coins", format: "number", decimals: 8 },
      { key: "marginNeeded", label: "Margin Needed", format: "currency" },
      { key: "positionAsShareOfAccount", label: "Position as % of Account", format: "percentage" },
    ],
    instructions:
      "Position sizing keeps any one losing trade small. Decide how much of your account you'll risk — often 1–2% — and " +
      "where your stop goes. Position size = amount at risk ÷ stop distance.\n\n" +
      "Leverage only changes how much margin you post, not the size you should trade.",
    examples:
      "Example: risking 1% of a $10,000 account with a stop 5% below a $60,000 entry means a " +
      "$2,000 position — 0.03333333 coins.",
    assumptions:
      "Fees and slippage not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if the position is bigger than my account?",
        answer: "That happens with very tight stops — it would need leverage. Widening the stop or lowering risk reduces the size.",
      },
    ],
  },
  {
    slug: "crypto-margin-trading-calculator",
    title: "Crypto Margin Trading Calculator",
    description: "Calculate a leveraged crypto trade's profit or loss, return on margin, margin requirement and liquidation price for longs and shorts.",
    metaTitle: "Crypto Margin & Liquidation Price Calculator — Leverage",
    metaDescription: "Free crypto margin trading calculator. Find leveraged profit, return on margin, initial margin and liquidation price.",
    calcInputs: [
      currencyField("margin", "Your Margin (Collateral)", { default: 1000, max: 100000000, step: 50 }),
      numberField("leverage", "Leverage", { default: 10, min: 1, max: 125, step: 1 }),
      currencyField("entryPrice", "Entry Price", { default: 60000, max: 10000000, step: 0.01 }),
      currencyField("exitPrice", "Exit Price", { default: 63000, max: 10000000, step: 0.01 }),
      {
        key: "direction", label: "Trade Direction", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Long", value: 1 },
          { label: "Short", value: 2 },
        ],
      },
      percentField("maintenanceMarginPercent", "Maintenance Margin Rate", { default: 0.5, max: 10, step: 0.1 }),
      percentField("feePercent", "Trading Fee per Side", { default: 0.05, max: 1, step: 0.01 }),
    ],
    calcResult: { label: "Profit or Loss", format: "currency" },
    calcResults: [
      { key: "positionSize", label: "Position Size", format: "currency" },
      { key: "initialMarginPercent", label: "Initial Margin Requirement", format: "percentage" },
      { key: "profitOrLoss", label: "Profit or Loss (After Fees)", format: "currency", highlight: true },
      { key: "returnOnMarginPercent", label: "Return on Margin", format: "percentage" },
      { key: "liquidationPrice", label: "Liquidation Price", format: "currency" },
      { key: "distanceToLiquidationPercent", label: "Distance to Liquidation", format: "percentage" },
    ],
    instructions:
      "Leverage multiplies your position — and your gains and losses — relative to the margin you post. The initial " +
      "margin requirement is 1 ÷ leverage. With isolated margin, if the price moves against you until your margin falls " +
      "to the maintenance level, the position is liquidated and you lose the margin.\n\n" +
      "Liquidation price ≈ entry × (1 − 1/leverage + maintenance rate) for a long. Exchanges' exact formulas and tiers " +
      "differ, and perpetual funding payments aren't included.",
    examples:
      "Example: $1,000 at 10x controls a $10,000 long from $60,000. Closing at $63,000 earns $489.75 " +
      "after fees — 48.98% on margin. The position would be liquidated near $54,300.",
    assumptions:
      "Isolated margin; liquidation fees and funding not included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is crypto margin trading available in the US?",
        answer: "Leveraged crypto trading for retail US customers is limited to CFTC-regulated venues; offshore exchanges often block US users.",
      },
    ],
  },
  {
    slug: "crypto-whale-impact-calculator",
    title: "Crypto Whale Transaction Impact Calculator",
    description: "Estimate how much a large (whale) crypto buy or sell order moves the price, the average slippage and what it costs, from the order book depth.",
    metaTitle: "Crypto Whale Impact Calculator — Price Impact & Slippage",
    metaDescription: "Free crypto price impact calculator. Estimate how much a large order moves the price and its slippage cost.",
    calcInputs: [
      currencyField("orderSize", "Order Size", { default: 500000, max: 10000000000, step: 1000 }),
      currencyField("depthPerPercent", "Order Book Depth Within 1% of Price", { default: 2000000, max: 100000000000, step: 10000 }),
      currencyField("price", "Current Price", { default: 60000, max: 10000000, step: 0.01 }),
      {
        key: "direction", label: "Order Side", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Buy", value: 1 },
          { label: "Sell", value: 2 },
        ],
      },
    ],
    calcResult: { label: "Slippage Cost", format: "currency" },
    calcResults: [
      { key: "priceMovePercent", label: "Price Move", format: "percentage", decimals: 3 },
      { key: "averageSlippagePercent", label: "Average Slippage", format: "percentage", decimals: 3 },
      { key: "slippageCost", label: "Slippage Cost", format: "currency", highlight: true },
      { key: "averageFillPrice", label: "Average Fill Price", format: "currency" },
      { key: "priceAfterOrder", label: "Price After the Order", format: "currency" },
    ],
    instructions:
      "A market order eats through the order book: the bigger it is relative to the liquidity resting near the price, " +
      "the further the price moves and the worse your average fill. Exchanges and data sites show depth as the amount " +
      "available within ±1% or ±2% of the price.\n\n" +
      "Large traders reduce impact by splitting orders over time, using limit orders or trading through OTC desks.",
    examples:
      "Example: a $500,000 buy against $2,000,000 of depth within 1% pushes the price up about 0.25%, costing " +
      "$625 in slippage.",
    assumptions:
      "Liquidity spread evenly within the 1% band; other traders don't react. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do whale wallet transfers move prices?",
        answer: "Big transfers to exchanges can signal an upcoming sale, and other traders often react before any order is placed.",
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
