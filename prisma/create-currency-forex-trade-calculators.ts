// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Crypto Calculators" sub-batch E (Forex Trade Sizing, Pips & Risk). Part of the
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
// See src/lib/calc-engine-currency-forex-trade.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-forex-trade-calculators.ts
// or
//   npm run db:create-currency-forex-trade-calculators

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
const DIRECTION_OPTIONS = [
  { label: "Long (buy)", value: 1 },
  { label: "Short (sell)", value: 2 },
];
const FOREX_NOTE = "A standard lot is 100,000 units of the base currency. ";

const TOOLS: ToolDef[] = [
  {
    slug: "forex-calculator",
    title: "Forex Calculator",
    description: "Get an overview of a forex position before you place it — its value, what one pip is worth, the margin it ties up, and one pip as a share of your account.",
    metaTitle: "Forex Calculator — Position Value, Pip & Margin",
    metaDescription: "Free forex calculator. See a trade's position value, pip value, required margin and what one pip means for your account before you place it.",
    calcInputs: [
      rateField("pairPrice", "Pair Price", { default: 1.085 }),
      numberField("lots", "Position Size", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
      numberField("leverage", "Leverage", { unit: "to 1", default: 30, min: 1, max: 3000, step: 1 }),
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Pip Value", format: "currency" },
    calcResults: [
      { key: "pipValue", label: "Value of 1 Pip", format: "currency", highlight: true },
      { key: "positionValue", label: "Position Value", format: "currency" },
      { key: "marginRequired", label: "Margin Required", format: "currency" },
      { key: "units", label: "Units", format: "number" },
      { key: "onePipPercentOfAccount", label: "1 Pip as % of Account", format: "number", decimals: 4 },
    ],
    instructions: "Enter the pair price, your position size in lots, the pip size, the rate that turns the quote currency into your account currency (1 for a USD account trading a pair quoted in USD), your leverage and balance.",
    examples: "Example: 1 lot of EUR/USD at 1.085 is a $108,500 position. Each pip is worth $10 — 0.1% of a $10,000 account — and at 30:1 leverage the trade ties up $3,616.67 of margin.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "What is the quote-to-account rate?", answer: "Profits are earned in the pair's quote currency. If your account is in another currency, this rate converts them — for a USD account trading EUR/GBP, it's GBP/USD." }],
  },
  {
    slug: "forex-profit-calculator",
    title: "Forex Profit Calculator",
    description: "Calculate a forex trade's net profit after the spread and commission — not just the gross price move — in money and in pips.",
    metaTitle: "Forex Profit Calculator — Net of Spread & Commission",
    metaDescription: "Free forex profit calculator. Find a trade's net profit after spread and commission, with gross profit, gross pips and net pips.",
    calcInputs: [
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      rateField("exitPrice", "Exit Price", { default: 1.092 }),
      dropdownField("direction", "Direction", 1, DIRECTION_OPTIONS),
      numberField("lots", "Position Size", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
      numberField("spreadPips", "Spread", { unit: "pips", default: 1, min: 0, max: 1000, step: 0.1 }),
      currencyField("commissionPerLotRoundTrip", "Commission per Lot (Round Trip)", { default: 7, max: 10000, step: 0.5 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
      { key: "grossPips", label: "Gross Pips", format: "number" },
      { key: "netPips", label: "Net Pips", format: "number" },
      { key: "spreadCost", label: "Spread Cost", format: "currency" },
      { key: "commission", label: "Commission", format: "currency" },
    ],
    instructions: "Enter the entry and exit prices, whether you bought or sold, your size, the spread you paid and the broker's round-trip commission per lot. If your platform shows prices after the spread already, set the spread to 0.",
    examples: "Example: buying 1 lot of EUR/USD at 1.085 and selling at 1.092 gains 70 pips ($700). A 1-pip spread ($10) and $7 of commission leave $683 — 68.3 pips net.",
    assumptions: FOREX_NOTE + "Overnight swap is not included. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is my net profit less than the pips suggest?", answer: "Every trade pays the spread and often a commission. On short-term trades these costs can take a large share of the profit." }],
  },
  {
    slug: "forex-loss-calculator",
    title: "Forex Loss Calculator",
    description: "See what a losing streak does to your trading account at a fixed risk per trade — the balance left, the drawdown and the gain you'd need to recover.",
    metaTitle: "Forex Loss Calculator — Losing Streak Impact",
    metaDescription: "Free forex loss calculator. See how a streak of losing trades at a fixed risk % shrinks your account, the drawdown, and the gain needed to recover.",
    calcInputs: [
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 1000000000, step: 100 }),
      percentField("riskPercent", "Risk per Trade", { default: 2, max: 100, step: 0.25 }),
      numberField("losingTrades", "Losing Trades in a Row", { default: 5, min: 0, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Balance After Streak", format: "currency" },
    calcResults: [
      { key: "balanceAfterStreak", label: "Balance After the Streak", format: "currency", highlight: true },
      { key: "totalLoss", label: "Total Loss", format: "currency" },
      { key: "drawdownPercent", label: "Drawdown", format: "percentage" },
      { key: "gainNeededToRecoverPercent", label: "Gain Needed to Recover", format: "percentage" },
      { key: "firstTradeLoss", label: "Loss on the First Trade", format: "currency" },
    ],
    instructions: "Enter your balance, the percentage you risk on each trade, and how many losses in a row to test. Each loss is a percentage of the balance left, so losses shrink as the account shrinks.",
    examples: "Example: risking 2% of $10,000, the first loss is $200. After 5 losses in a row you'd have $9,039.21 — a 9.61% drawdown needing a 10.63% gain to get back.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How many losing trades in a row should I plan for?", answer: "Even a strategy that wins half the time will see 5 to 8 losses in a row over a few hundred trades. Size your risk so that doesn't cripple the account." }],
  },
  {
    slug: "forex-pip-calculator",
    title: "Forex Pip Calculator",
    description: "Count the pips between two prices on a currency pair and see what that move is worth in money for your position size.",
    metaTitle: "Forex Pip Calculator — Pips Between Two Prices",
    metaDescription: "Free forex pip calculator. Count the pips between two prices on any pair and see what the move is worth for your position size.",
    calcInputs: [
      rateField("price1", "Starting Price", { default: 1.085 }),
      rateField("price2", "Ending Price", { default: 1.0923 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      numberField("lots", "Position Size", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
    ],
    calcResult: { label: "Pips", format: "number" },
    calcResults: [
      { key: "pips", label: "Pips (Negative = Down)", format: "number", highlight: true },
      { key: "moneyValue", label: "Value of the Move", format: "currency" },
      { key: "pipValue", label: "Value of 1 Pip", format: "currency" },
    ],
    instructions: "Enter the two prices, the pair's pip size, your position size and the quote-to-account rate.",
    examples: "Example: EUR/USD moving from 1.085 to 1.0923 is 73 pips. On 1 lot, at $10 a pip, that's worth $730.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a pipette?", answer: "A fractional pip — the fifth decimal (third for JPY pairs) many brokers show. Ten pipettes make one pip." }],
  },
  {
    slug: "pip-value-calculator",
    title: "Pip Value Calculator",
    description: "Work out what one pip is worth per standard, mini and micro lot and for your position — whether your account currency is the pair's quote, its base, or a third currency.",
    metaTitle: "Pip Value Calculator — Any Pair, Any Account",
    metaDescription: "Free pip value calculator. Find the pip value per standard, mini and micro lot and for your size, for any pair and any account currency.",
    calcInputs: [
      numberField("lots", "Position Size", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      dropdownField("accountIs", "Your Account Currency Is the Pair's…", 1, [
        { label: "Quote currency (USD account, EUR/USD)", value: 1 },
        { label: "Base currency (USD account, USD/JPY)", value: 2 },
        { label: "Neither (a third currency)", value: 3 },
      ]),
      rateField("pairPrice", "Pair Price (If Account = Base)", { default: 150, step: 0.01 }),
      rateField("quoteToAccountRate", "Quote-to-Account Rate (If Third Currency)", { default: 0.0067, step: 0.00001 }),
    ],
    calcResult: { label: "Pip Value for Your Size", format: "currency" },
    calcResults: [
      { key: "pipValueForYourSize", label: "Pip Value for Your Size", format: "currency", highlight: true },
      { key: "pipValuePerStandardLot", label: "Per Standard Lot (100,000)", format: "currency" },
      { key: "pipValuePerMiniLot", label: "Per Mini Lot (10,000)", format: "number", decimals: 4 },
      { key: "pipValuePerMicroLot", label: "Per Micro Lot (1,000)", format: "number", decimals: 4 },
    ],
    instructions: "Enter your size and the pip size, then say how your account currency relates to the pair. If it's the base currency, enter the pair price; if it's a third currency, enter how much of your account currency one unit of the quote currency is worth.",
    examples: "Example: on EUR/USD with a USD account, a pip is worth $10 per standard lot, $1 per mini lot and 0.1 per micro lot. For USD/JPY at 150 with a USD account, a 0.01 pip is worth roughly $6.7 per lot.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does pip value change?", answer: "When your account currency isn't the quote currency, the pip value is converted at the current rate, so it moves as prices move." }],
  },
  {
    slug: "forex-lot-size-calculator",
    title: "Forex Lot Size Calculator",
    description: "Convert a position in units into standard, mini and micro lots, and find the lot size that gives you a chosen value per pip.",
    metaTitle: "Forex Lot Size Calculator — Units to Lots",
    metaDescription: "Free forex lot size calculator. Convert units into standard, mini and micro lots, and find the lots needed for a target value per pip.",
    calcInputs: [
      numberField("units", "Position Size in Units", { default: 250000, min: 0, max: 1000000000, step: 1000 }),
      currencyField("targetPipValue", "Target Value per Pip", { default: 5, max: 100000, step: 0.5 }),
      currencyField("pipValuePerStandardLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Standard Lots", format: "number", decimals: 4 },
    calcResults: [
      { key: "standardLots", label: "Standard Lots", format: "number", decimals: 4, highlight: true },
      { key: "miniLots", label: "Mini Lots", format: "number", decimals: 4 },
      { key: "microLots", label: "Micro Lots", format: "number", decimals: 4 },
      { key: "lotsForTargetPipValue", label: "Lots for Your Target Pip Value", format: "number", decimals: 4 },
      { key: "unitsForTargetPipValue", label: "Units for Your Target Pip Value", format: "number" },
    ],
    instructions: "Enter a position size in units, the value per pip you want, and the pair's pip value per standard lot ($10 for pairs quoted in USD with a USD account).",
    examples: "Example: 250,000 units are 2.5 standard lots, 25 mini lots or 250 micro lots. For $5 a pip on a $10-per-lot pair, trade 0.5 lots — 50,000 units.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "What lot size should a beginner use?", answer: "Micro lots (0.01) keep pip values around $0.10, so mistakes are cheap while you learn. Size up only with a tested plan." }],
  },
  {
    slug: "forex-margin-calculator",
    title: "Forex Margin Calculator",
    description: "Find the margin a forex trade requires at your leverage, the free margin left in your account, and your margin level.",
    metaTitle: "Forex Margin Calculator — Required & Free Margin",
    metaDescription: "Free forex margin calculator. Find the margin a position needs at your leverage, the free margin left, and your margin level percentage.",
    calcInputs: [
      numberField("lots", "Position Size", { unit: "lots", default: 2, min: 0, max: 1000, step: 0.01 }),
      rateField("pairPrice", "Pair Price", { default: 1.085 }),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
      numberField("leverage", "Leverage", { unit: "to 1", default: 30, min: 1, max: 3000, step: 1 }),
      currencyField("accountEquity", "Account Equity", { default: 10000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Margin Required", format: "currency" },
    calcResults: [
      { key: "marginRequired", label: "Margin Required", format: "currency", highlight: true },
      { key: "positionValue", label: "Position Value", format: "currency" },
      { key: "freeMargin", label: "Free Margin", format: "currency" },
      { key: "marginLevelPercent", label: "Margin Level", format: "percentage" },
      { key: "marginRequirementPercent", label: "Margin Requirement", format: "percentage" },
    ],
    instructions: "Enter your size, the pair price, the quote-to-account rate, your leverage and account equity. Margin is the position value divided by leverage.",
    examples: "Example: 2 lots of EUR/USD at 1.085 are worth $217,000. At 30:1 (a 3.33% requirement) that needs $7,233.33 of margin, leaving $2,766.67 free on $10,000 — a 138.25% margin level.",
    assumptions: FOREX_NOTE + "Brokers usually issue a margin call around 100% and close positions near 50%, but levels vary. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What leverage is allowed for forex?", answer: "It depends on the regulator: the U.S. caps major pairs at 50:1, and the EU, UK and Australia at 30:1 for retail traders." }],
  },
  {
    slug: "forex-leverage-calculator",
    title: "Forex Leverage Calculator",
    description: "See the leverage you're actually using — total position size compared with your equity — against your broker's maximum, and how far the market can move before your account is wiped out.",
    metaTitle: "Forex Leverage Calculator — Effective Leverage",
    metaDescription: "Free forex leverage calculator. Compare your effective leverage with the broker's maximum, the margin used, and the move that would wipe out the account.",
    calcInputs: [
      currencyField("accountEquity", "Account Equity", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("positionValue", "Total Position Value", { default: 150000, max: 100000000000, step: 1000 }),
      numberField("brokerMaxLeverage", "Broker's Maximum Leverage", { unit: "to 1", default: 30, min: 1, max: 3000, step: 1 }),
    ],
    calcResult: { label: "Effective Leverage", format: "number" },
    calcResults: [
      { key: "effectiveLeverage", label: "Effective Leverage (× Equity)", format: "number", highlight: true },
      { key: "maxPositionValue", label: "Largest Position Allowed", format: "currency" },
      { key: "marginUsed", label: "Margin Used", format: "currency" },
      { key: "marginUsedPercentOfEquity", label: "Margin Used as % of Equity", format: "percentage" },
      { key: "movePercentToLoseAccount", label: "Adverse Move That Wipes Out the Account", format: "percentage" },
    ],
    instructions: "Enter your equity, the total value of your open positions and the broker's maximum leverage. Effective leverage is what drives your risk, not the maximum you're allowed.",
    examples: "Example: $150,000 of positions on $10,000 of equity is 15:1 effective leverage. The broker would allow up to $300,000. A 6.67% move against you would wipe out the account.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is high leverage dangerous?", answer: "Yes — it multiplies losses as much as gains. Many professional traders keep effective leverage well under 10:1." }],
  },
  {
    slug: "forex-risk-calculator",
    title: "Forex Risk Calculator",
    description: "Check how much money and what percentage of your account a sized forex trade puts at risk between entry and stop, and the most lots that fit your target risk.",
    metaTitle: "Forex Risk Calculator — Money & % at Risk",
    metaDescription: "Free forex risk calculator. See the money and % of your account at risk from entry to stop-loss, and the maximum lots for your target risk.",
    calcInputs: [
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 1000000000, step: 100 }),
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      rateField("stopPrice", "Stop-Loss Price", { default: 1.08 }),
      numberField("lots", "Position Size", { unit: "lots", default: 0.5, min: 0, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
      percentField("targetRiskPercent", "Target Risk per Trade", { default: 1, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Money at Risk", format: "currency" },
    calcResults: [
      { key: "moneyAtRisk", label: "Money at Risk", format: "currency", highlight: true },
      { key: "riskPercentOfAccount", label: "Risk as % of Account", format: "percentage" },
      { key: "stopDistancePips", label: "Stop Distance", format: "number" },
      { key: "maxLotsForTargetRisk", label: "Max Lots for Target Risk", format: "number", decimals: 4 },
    ],
    instructions: "Enter your balance, entry and stop prices, the lots you plan to trade, the pip size, the quote-to-account rate and the risk you're comfortable with per trade.",
    examples: "Example: 0.5 lots with a 50-pip stop risks $250 — 2.5% of a $10,000 account. To keep risk at 1%, trade no more than 0.2 lots.",
    assumptions: FOREX_NOTE + "Stops can slip in fast markets, so actual losses may be larger. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How much should I risk per trade?", answer: "Many traders risk 0.5% to 2% of their account per trade, so a losing streak doesn't do lasting damage." }],
  },
  {
    slug: "forex-risk-reward-calculator",
    title: "Forex Risk-Reward Calculator",
    description: "Find a trade's reward-to-risk ratio from entry, stop and target, the win rate you need to break even, and the expectancy at your own win rate.",
    metaTitle: "Forex Risk-Reward Calculator — R:R & Expectancy",
    metaDescription: "Free forex risk-reward calculator. Get the reward:risk ratio from entry, stop and target, the break-even win rate, and expectancy at your win rate.",
    calcInputs: [
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      rateField("stopPrice", "Stop-Loss Price", { default: 1.08 }),
      rateField("targetPrice", "Take-Profit Price", { default: 1.0975 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      percentField("winRatePercent", "Your Win Rate", { default: 45, max: 100, step: 1 }),
    ],
    calcResult: { label: "Reward:Risk Ratio", format: "number" },
    calcResults: [
      { key: "rewardToRiskRatio", label: "Reward:Risk Ratio", format: "number", highlight: true },
      { key: "riskPips", label: "Risk (Pips)", format: "number" },
      { key: "rewardPips", label: "Reward (Pips)", format: "number" },
      { key: "breakEvenWinRatePercent", label: "Win Rate Needed to Break Even", format: "percentage" },
      { key: "expectancyInR", label: "Expectancy per Trade (in R)", format: "number" },
    ],
    instructions: "Enter the entry, stop and target prices and your historical win rate. Expectancy in R is the average result per trade measured in units of the amount risked — above 0 means the strategy makes money over time.",
    examples: "Example: risking 50 pips to make 125 is a 2.5:1 ratio, so you break even winning just 28.57% of trades. At a 45% win rate, each trade earns 0.58R on average.",
    assumptions: "Costs such as the spread lower the real ratio slightly. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a higher risk-reward ratio always better?", answer: "Not by itself — far targets get hit less often. What matters is the ratio and win rate together, which is what expectancy measures." }],
  },
  {
    slug: "forex-stop-loss-calculator",
    title: "Forex Stop Loss Calculator",
    description: "Work out where to place your stop-loss so that a trade of a fixed lot size risks exactly the percentage of your account you choose.",
    metaTitle: "Forex Stop Loss Calculator — Stop for Your Risk",
    metaDescription: "Free forex stop loss calculator. Find the stop distance and stop price that risk exactly your chosen % of the account at a fixed lot size.",
    calcInputs: [
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 1000000000, step: 100 }),
      percentField("riskPercent", "Risk per Trade", { default: 2, max: 100, step: 0.25 }),
      numberField("lots", "Position Size", { unit: "lots", default: 0.5, min: 0.0001, max: 1000, step: 0.01 }),
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      dropdownField("direction", "Direction", 1, DIRECTION_OPTIONS),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Stop-Loss Price", format: "number", decimals: 6 },
    calcResults: [
      { key: "stopLossPrice", label: "Stop-Loss Price", format: "number", decimals: 6, highlight: true },
      { key: "stopDistancePips", label: "Stop Distance (Pips)", format: "number" },
      { key: "moneyAtRisk", label: "Money at Risk", format: "currency" },
    ],
    instructions: "Enter your balance and risk %, the lot size you want to trade, your entry, the direction, and the pip value per lot. If the stop this gives is tighter than the chart allows, trade a smaller size instead.",
    examples: "Example: risking 2% of $10,000 ($200) on 0.5 lots at $10 per pip per lot allows a 40-pip stop — at 1.081 for a buy from 1.085.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "Should the stop be set by risk or by the chart?", answer: "Ideally by the chart — beyond a level that proves the trade wrong — and then the position size is adjusted to fit your risk. This tool shows the reverse, for a fixed size." }],
  },
  {
    slug: "forex-take-profit-calculator",
    title: "Forex Take Profit Calculator",
    description: "Set a take-profit price from your entry, stop distance and chosen reward-to-risk ratio, and see the profit if it's hit against the loss if the stop is.",
    metaTitle: "Forex Take Profit Calculator — Target from R:R",
    metaDescription: "Free forex take profit calculator. Get the take-profit price from entry, stop distance and your reward:risk ratio, with profit vs loss in money.",
    calcInputs: [
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      dropdownField("direction", "Direction", 1, DIRECTION_OPTIONS),
      numberField("stopPips", "Stop Distance", { unit: "pips", default: 40, min: 0, max: 100000, step: 1 }),
      numberField("rewardRiskRatio", "Reward:Risk Ratio", { default: 2, min: 0, max: 100, step: 0.1 }),
      numberField("lots", "Position Size", { unit: "lots", default: 0.5, min: 0, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Take-Profit Price", format: "number", decimals: 6 },
    calcResults: [
      { key: "takeProfitPrice", label: "Take-Profit Price", format: "number", decimals: 6, highlight: true },
      { key: "takeProfitPips", label: "Take-Profit Distance (Pips)", format: "number" },
      { key: "profitAtTarget", label: "Profit at Target", format: "currency" },
      { key: "lossAtStop", label: "Loss at Stop", format: "currency" },
      { key: "stopLossPrice", label: "Stop-Loss Price", format: "number", decimals: 6 },
    ],
    instructions: "Enter your entry, direction, stop distance in pips, the reward:risk ratio you want, your size and the pip value per lot.",
    examples: "Example: buying at 1.085 with a 40-pip stop (at 1.081) and a 2:1 target puts take-profit 80 pips away at 1.093. On 0.5 lots that's $400 of profit against $200 of risk.",
    assumptions: FOREX_NOTE + GENERAL_DISCLAIMER,
    faq: [{ question: "Should take-profit always be a fixed multiple of risk?", answer: "It's a good starting rule, but many traders also check that the target sits before a major support or resistance level." }],
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
