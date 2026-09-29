// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Crypto Calculators" sub-batch F (Forex Costs, Returns & Account Growth). Part of the
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
// See src/lib/calc-engine-currency-forex-costs-growth.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-currency-forex-costs-growth-calculators.ts
// or
//   npm run db:create-currency-forex-costs-growth-calculators

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

const TOOLS: ToolDef[] = [
  {
    slug: "forex-break-even-calculator",
    title: "Forex Break-Even Calculator",
    description: "Find the price a forex trade has to reach just to cover its costs — the spread, commission and any swap — and how many pips away it is.",
    metaTitle: "Forex Break-Even Calculator — Price to Cover Costs",
    metaDescription: "Free forex break-even calculator. Find the price that covers the spread, commission and swap on a trade, and how many pips it is from your entry.",
    calcInputs: [
      rateField("entryPrice", "Entry Price", { default: 1.085 }),
      dropdownField("direction", "Direction", 1, DIRECTION_OPTIONS),
      numberField("lots", "Position Size", { unit: "lots", default: 1, min: 0.0001, max: 1000, step: 0.01 }),
      dropdownField("pipSize", "Pip Size", 0.0001, PIP_OPTIONS),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
      numberField("spreadPips", "Spread", { unit: "pips", default: 1.2, min: 0, max: 1000, step: 0.1 }),
      currencyField("commissionPerLotRoundTrip", "Commission per Lot (Round Trip)", { default: 7, max: 10000, step: 0.5 }),
      currencyField("swapCost", "Swap or Other Costs", { default: 0, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Break-Even Price", format: "number", decimals: 6 },
    calcResults: [
      { key: "breakEvenPrice", label: "Break-Even Price", format: "number", decimals: 6, highlight: true },
      { key: "pipsToBreakEven", label: "Pips to Break Even", format: "number" },
      { key: "totalCosts", label: "Total Trade Costs", format: "currency" },
    ],
    instructions: "Enter your entry, direction and size, the pip size and value, the spread, round-trip commission and any swap you'll pay.",
    examples: "Example: 1 lot bought at 1.085 with a 1.2-pip spread and $7 commission costs $19 — 1.9 pips — so the price must reach 1.08519 before the trade is in profit.",
    assumptions: "A standard lot is 100,000 units. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is my trade negative as soon as I open it?", answer: "Because you buy at the ask and could only sell at the bid. The spread, plus any commission, is paid on entry." }],
  },
  {
    slug: "forex-commission-calculator",
    title: "Forex Commission Calculator",
    description: "Add up what your broker's commission costs per trade, per month and per year, and what it equals in pips.",
    metaTitle: "Forex Commission Calculator — Monthly & Yearly Cost",
    metaDescription: "Free forex commission calculator. See your broker's commission per trade, month and year, and its size in pips per round trip.",
    calcInputs: [
      currencyField("commissionPerLotPerSide", "Commission per Lot per Side", { default: 3.5, max: 10000, step: 0.25 }),
      numberField("lotsPerTrade", "Average Lots per Trade", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      numberField("tradesPerMonth", "Trades per Month", { default: 40, min: 0, max: 100000, step: 1 }),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Commission per Month", format: "currency" },
    calcResults: [
      { key: "commissionPerMonth", label: "Commission per Month", format: "currency", highlight: true },
      { key: "commissionPerTrade", label: "Commission per Trade (Round Trip)", format: "currency" },
      { key: "commissionPerYear", label: "Commission per Year", format: "currency" },
      { key: "commissionInPips", label: "Commission in Pips", format: "number" },
    ],
    instructions: "Enter the commission charged per lot each time you open or close, your typical size and how often you trade.",
    examples: "Example: $3.50 per lot per side is $7 for a round-trip 1-lot trade — 0.7 pips. At 40 trades a month that's $280 a month and $3,360 a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Commission account or spread-only account?", answer: "Commission (ECN) accounts usually have tighter raw spreads. Compare the total — spread plus commission — for your typical trade." }],
  },
  {
    slug: "forex-spread-calculator",
    title: "Forex Spread Calculator",
    description: "See what the spread costs you on every forex trade, and how much it adds up to over a month and a year of trading.",
    metaTitle: "Forex Spread Calculator — Cost per Trade & Year",
    metaDescription: "Free forex spread calculator. Turn a spread in pips into its money cost per trade, per month and per year for your lot size.",
    calcInputs: [
      numberField("spreadPips", "Spread", { unit: "pips", default: 1.2, min: 0, max: 1000, step: 0.1 }),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
      numberField("lots", "Average Lots per Trade", { unit: "lots", default: 1, min: 0, max: 1000, step: 0.01 }),
      numberField("tradesPerMonth", "Trades per Month", { default: 40, min: 0, max: 100000, step: 1 }),
    ],
    calcResult: { label: "Spread Cost per Month", format: "currency" },
    calcResults: [
      { key: "spreadCostPerMonth", label: "Spread Cost per Month", format: "currency", highlight: true },
      { key: "spreadCostPerTrade", label: "Spread Cost per Trade", format: "currency" },
      { key: "spreadCostPerYear", label: "Spread Cost per Year", format: "currency" },
    ],
    instructions: "Enter the typical spread on your pair, the pip value per lot, your average size and how many trades you make each month.",
    examples: "Example: a 1.2-pip spread on 1 lot costs $12 a trade. Over 40 trades a month that's $480 — $5,760 a year.",
    assumptions: "Spreads widen around news and at the daily rollover. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good forex spread?", answer: "On EUR/USD, under 1 pip is competitive for a standard account; raw-spread accounts often show 0.0 to 0.3 pips plus commission." }],
  },
  {
    slug: "forex-swap-calculator",
    title: "Forex Swap Calculator",
    description: "Work out the overnight swap you pay or earn holding a forex position, from the broker's swap in pips per lot, including the triple swap charged midweek.",
    metaTitle: "Forex Swap Calculator — Overnight Swap Cost",
    metaDescription: "Free forex swap calculator. Turn your broker's swap rate in pips into the total you pay or earn over a hold, including triple-swap Wednesdays.",
    calcInputs: [
      numberField("swapPipsPerNight", "Swap per Lot per Night (Pips, Negative = Pay)", { default: -0.6, min: -1000, max: 1000, step: 0.1 }),
      currencyField("pipValuePerLot", "Pip Value per Standard Lot", { default: 10, max: 100000, step: 0.5 }),
      numberField("lots", "Position Size", { unit: "lots", default: 2, min: 0, max: 1000, step: 0.01 }),
      numberField("nights", "Nights Held", { unit: "nights", default: 10, min: 0, max: 3650, step: 1 }),
      numberField("tripleSwapDays", "Triple-Swap Days in the Hold", { default: 2, min: 0, max: 600, step: 1 }),
    ],
    calcResult: { label: "Total Swap", format: "currency" },
    calcResults: [
      { key: "totalSwap", label: "Total Swap (Negative = You Pay)", format: "currency", highlight: true },
      { key: "swapPerNight", label: "Swap per Night", format: "currency" },
      { key: "nightsCharged", label: "Nights Charged", format: "number" },
    ],
    instructions: "Copy the swap for your direction from your platform's contract specification (often in points or pips per lot), then enter your size, the nights held and how many of them are triple-swap days — usually Wednesday.",
    examples: "Example: a swap of -0.6 pips per lot on 2 lots costs $12 a night. Held 10 nights with 2 triple-swap Wednesdays, you're charged for 14 nights — $168 in total.",
    assumptions: "Some platforms quote swap in points (tenths of a pip) or in money — convert to pips first. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why is Wednesday's swap tripled?", answer: "Spot forex settles two days after the trade, so a position held over Wednesday night rolls over the weekend and is charged for three nights." }],
  },
  {
    slug: "forex-rollover-calculator",
    title: "Forex Rollover Calculator",
    description: "Estimate the daily rollover interest on a forex position from the two currencies' interest rates and the broker's markup — for a long and a short.",
    metaTitle: "Forex Rollover Calculator — Interest Differential",
    metaDescription: "Free forex rollover calculator. Estimate daily rollover from the two currencies' interest rates and the broker's markup, for longs and shorts.",
    calcInputs: [
      numberField("units", "Position Size in Units", { default: 100000, min: 0, max: 1000000000, step: 1000 }),
      rateField("pairPrice", "Pair Price", { default: 1.085 }),
      percentField("baseRatePercent", "Base Currency Interest Rate", { default: 2, min: -5, max: 100, step: 0.05 }),
      percentField("quoteRatePercent", "Quote Currency Interest Rate", { default: 4, min: -5, max: 100, step: 0.05 }),
      percentField("brokerMarkupPercent", "Broker Markup", { default: 0.5, max: 10, step: 0.05 }),
      rateField("quoteToAccountRate", "Quote-to-Account Currency Rate (1 if Same)", { default: 1 }),
      numberField("nights", "Nights Held", { unit: "nights", default: 1, min: 0, max: 3650, step: 1 }),
    ],
    calcResult: { label: "Long Rollover", format: "currency" },
    calcResults: [
      { key: "longRolloverTotal", label: "Long Position Rollover (Total)", format: "currency", highlight: true },
      { key: "shortRolloverTotal", label: "Short Position Rollover (Total)", format: "currency" },
      { key: "longRolloverPerNight", label: "Long — per Night", format: "currency" },
      { key: "shortRolloverPerNight", label: "Short — per Night", format: "currency" },
      { key: "longAnnualRatePercent", label: "Long — Net Yearly Rate", format: "percentage" },
      { key: "shortAnnualRatePercent", label: "Short — Net Yearly Rate", format: "percentage" },
    ],
    instructions: "Enter the position size and price, each currency's short-term interest rate, the broker's markup and the nights held. A long earns the base currency's rate and pays the quote's; a short does the opposite, and the markup is taken either way.",
    examples: "Example: long 100,000 EUR/USD when euro rates are 2% and dollar rates 4%, with a 0.5% markup, costs about $7.43 a night (-2.5% a year). The short earns about $4.46 a night (1.5% a year).",
    assumptions: "Brokers set their own rollover; this is an estimate from the interest-rate differential. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a carry trade?", answer: "Buying a high-interest currency against a low-interest one to earn positive rollover — profitable while the exchange rate holds steady, painful when it drops." }],
  },
  {
    slug: "forex-financing-cost-calculator",
    title: "Forex Financing Cost Calculator",
    description: "Estimate the financing cost of holding a leveraged forex or CFD position at a yearly financing rate — the total, the cost against your margin, and the pips per day needed to cover it.",
    metaTitle: "Forex Financing Cost Calculator — Leveraged Hold",
    metaDescription: "Free forex financing cost calculator. Find the cost of holding a leveraged position at a yearly rate, its % of your margin, and pips per day to cover it.",
    calcInputs: [
      currencyField("positionValue", "Position Value", { default: 100000, max: 100000000000, step: 1000 }),
      percentField("annualFinancingRatePercent", "Yearly Financing Rate (Benchmark + Markup)", { default: 6.5, max: 50, step: 0.05 }),
      numberField("days", "Days Held", { unit: "days", default: 30, min: 0, max: 3650, step: 1 }),
      currencyField("marginPosted", "Margin Posted", { default: 3333, max: 1000000000, step: 100 }),
      currencyField("pipValue", "Value of 1 Pip on the Position", { default: 10, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Total Financing Cost", format: "currency" },
    calcResults: [
      { key: "totalFinancingCost", label: "Total Financing Cost", format: "currency", highlight: true },
      { key: "financingCostPerDay", label: "Cost per Day", format: "currency" },
      { key: "costPercentOfMargin", label: "Cost as % of Margin", format: "percentage" },
      { key: "pipsPerDayToCover", label: "Pips per Day to Cover It", format: "number" },
    ],
    instructions: "Enter the position's full value, the yearly financing rate your broker charges (often a benchmark rate plus 2% to 3%), how long you'll hold, your margin and the pip value.",
    examples: "Example: financing a $100,000 position at 6.5% costs $17.81 a day — $534.25 over 30 days, or 16.03% of $3,333 of margin. The trade must gain 1.78 pips a day just to cover it.",
    assumptions: "Financing is charged on the full position, not only the margin. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does financing matter for longer trades?", answer: "Because you pay interest on the whole leveraged position every day. Over weeks or months, it can eat a large share of the expected profit." }],
  },
  {
    slug: "forex-return-calculator",
    title: "Forex Return Calculator",
    description: "Measure your trading account's true return for a period with deposits and withdrawals taken out, and the annualized return.",
    metaTitle: "Forex Return Calculator — Account Return %",
    metaDescription: "Free forex return calculator. Measure your account's return for a period net of deposits and withdrawals (Modified Dietz), and annualize it.",
    calcInputs: [
      currencyField("startBalance", "Starting Balance", { default: 10000, max: 1000000000, step: 100 }),
      currencyField("endBalance", "Ending Balance", { default: 11800, max: 1000000000, step: 100 }),
      currencyField("deposits", "Deposits During the Period", { default: 1000, max: 1000000000, step: 100 }),
      currencyField("withdrawals", "Withdrawals During the Period", { default: 500, max: 1000000000, step: 100 }),
      numberField("months", "Length of the Period", { unit: "months", default: 6, min: 0.1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Return", format: "percentage" },
    calcResults: [
      { key: "returnPercent", label: "Return for the Period", format: "percentage", highlight: true },
      { key: "tradingGain", label: "Trading Gain", format: "currency" },
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage" },
    ],
    instructions: "Enter the balance at the start and end, and any money you added or took out. The tool separates trading gains from cash moved in or out.",
    examples: "Example: an account going from $10,000 to $11,800 over 6 months, with $1,000 deposited and $500 withdrawn, made $1,300 from trading — a 12.68% return, or 26.97% annualized.",
    assumptions: "Uses the Modified Dietz method, treating cash flows as arriving mid-period. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why not just compare start and end balances?", answer: "Deposits would look like profit and withdrawals like losses. Removing them shows how well the trading itself did." }],
  },
  {
    slug: "forex-roi-calculator",
    title: "Forex ROI Calculator",
    description: "Estimate a trading strategy's expected profit and monthly return on your account from its win rate, average win, average loss, costs and trade frequency.",
    metaTitle: "Forex ROI Calculator — Expected Monthly Return",
    metaDescription: "Free forex ROI calculator. Estimate expected profit and monthly ROI from win rate, average win, average loss, costs and trades per month.",
    calcInputs: [
      currencyField("accountBalance", "Account Balance", { default: 10000, max: 1000000000, step: 100 }),
      percentField("winRatePercent", "Win Rate", { default: 50, max: 100, step: 1 }),
      currencyField("averageWin", "Average Winning Trade", { default: 150, max: 100000000, step: 5 }),
      currencyField("averageLoss", "Average Losing Trade", { default: 100, max: 100000000, step: 5 }),
      numberField("tradesPerMonth", "Trades per Month", { default: 20, min: 0, max: 100000, step: 1 }),
      currencyField("costsPerTrade", "Costs per Trade (Spread + Commission)", { default: 7, max: 100000, step: 0.5 }),
    ],
    calcResult: { label: "Monthly ROI", format: "percentage" },
    calcResults: [
      { key: "monthlyRoiPercent", label: "Expected Monthly ROI", format: "percentage", highlight: true },
      { key: "expectancyPerTrade", label: "Expected Profit per Trade", format: "currency" },
      { key: "expectedMonthlyProfit", label: "Expected Monthly Profit", format: "currency" },
      { key: "expectedYearlyProfit", label: "Expected Yearly Profit", format: "currency" },
      { key: "profitFactor", label: "Profit Factor (Before Costs)", format: "number" },
    ],
    instructions: "Enter your account size and figures from your trading history or backtest: win rate, average win and loss (before costs), costs per trade and trades per month.",
    examples: "Example: winning half of 20 monthly trades at $150 and losing $100 on the rest, with $7 of costs each, earns $18 a trade on average — $360 a month, a 3.6% monthly ROI and $4,320 a year.",
    assumptions: "Assumes past averages continue; real results vary widely from month to month. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a profit factor?", answer: "Gross profits divided by gross losses. Above 1 the strategy makes money; many traders look for 1.5 or more to leave room for costs and bad luck." }],
  },
  {
    slug: "forex-drawdown-calculator",
    title: "Forex Drawdown Calculator",
    description: "Measure your trading account's maximum and current drawdown from its peak, and the percentage gain needed to get back to the high.",
    metaTitle: "Forex Drawdown Calculator — Max & Recovery Gain",
    metaDescription: "Free forex drawdown calculator. Find the maximum and current drawdown from your account's peak, and the gain needed to recover to the high.",
    calcInputs: [
      currencyField("peakBalance", "Peak Balance", { default: 12000, max: 1000000000, step: 100 }),
      currencyField("lowestBalance", "Lowest Balance After the Peak", { default: 9000, max: 1000000000, step: 100 }),
      currencyField("currentBalance", "Current Balance", { default: 10500, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Maximum Drawdown", format: "percentage" },
    calcResults: [
      { key: "maxDrawdownPercent", label: "Maximum Drawdown", format: "percentage", highlight: true },
      { key: "maxDrawdownAmount", label: "Maximum Drawdown Amount", format: "currency" },
      { key: "gainNeededFromLowPercent", label: "Gain Needed from the Low", format: "percentage" },
      { key: "currentDrawdownPercent", label: "Current Drawdown", format: "percentage" },
      { key: "gainNeededFromCurrentPercent", label: "Gain Needed from Now", format: "percentage" },
    ],
    instructions: "Enter the account's highest balance, the lowest it fell to afterwards, and today's balance.",
    examples: "Example: falling from $12,000 to $9,000 is a 25% drawdown ($3,000) that needed a 33.33% gain to recover. At $10,500 the account is still 12.5% below its peak, needing 14.29% more.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why is recovering harder than losing?", answer: "Gains are measured from a smaller balance. A 50% loss needs a 100% gain to get back — which is why limiting drawdowns matters so much." }],
  },
  {
    slug: "forex-account-growth-calculator",
    title: "Forex Account Growth Calculator",
    description: "Project a trading account's growth at a steady monthly return with regular deposits — the balance after a number of months and how long it takes to reach a target.",
    metaTitle: "Forex Account Growth Calculator — Time to Target",
    metaDescription: "Free forex account growth calculator. Project your balance at a monthly return with deposits, and the months needed to reach a target balance.",
    calcInputs: [
      currencyField("startBalance", "Starting Balance", { default: 5000, max: 1000000000, step: 100 }),
      percentField("monthlyReturnPercent", "Monthly Return", { default: 3, min: -50, max: 100, step: 0.1 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 200, max: 100000000, step: 50 }),
      numberField("months", "Months", { unit: "months", default: 24, min: 0, max: 600, step: 1 }),
      currencyField("targetBalance", "Target Balance", { default: 20000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "End Balance", format: "currency" },
    calcResults: [
      { key: "endBalance", label: "Balance After the Period", format: "currency", highlight: true },
      { key: "tradingProfit", label: "Trading Profit", format: "currency" },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "monthsToTarget", label: "Months to Reach Target (0 = Already / Never)", format: "number" },
    ],
    instructions: "Enter your starting balance, an expected monthly return, what you'll add each month, the months to project and a balance you're aiming for.",
    examples: "Example: $5,000 growing 3% a month with $200 added monthly reaches $17,049.26 after 24 months — $7,249.26 of it trading profit on $9,800 deposited. You'd pass $20,000 in month 28.",
    assumptions: "Steady monthly returns are unrealistic in trading; use this to set expectations, not as a promise. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is 3% a month a realistic forex return?", answer: "Sustained over years, it would be exceptional — about 43% a year compounded. Most retail forex traders lose money." }],
  },
  {
    slug: "forex-compounding-calculator",
    title: "Forex Compounding Calculator",
    description: "See the effect of compounding trading profits — reinvesting them each period versus withdrawing a share — over a number of trades, days or weeks.",
    metaTitle: "Forex Compounding Calculator — Reinvest vs Withdraw",
    metaDescription: "Free forex compounding calculator. Compare reinvesting profits with withdrawing a share each period, and see the extra wealth compounding creates.",
    calcInputs: [
      currencyField("startBalance", "Starting Balance", { default: 1000, max: 1000000000, step: 100 }),
      percentField("returnPerPeriodPercent", "Return per Period", { default: 1, min: -50, max: 100, step: 0.1 }),
      numberField("periods", "Number of Periods (Trades, Days or Weeks)", { default: 100, min: 0, max: 1000, step: 1 }),
      percentField("withdrawPercentOfProfit", "Share of Each Profit Withdrawn", { default: 0, max: 100, step: 5 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "totalWealth", label: "Balance + Withdrawals", format: "currency" },
      { key: "wealthIfNoCompounding", label: "Wealth Without Compounding", format: "currency" },
      { key: "compoundingBonus", label: "Extra from Compounding", format: "currency" },
    ],
    instructions: "Enter the starting balance, the return you make each period, the number of periods, and what share of each profit you take out (0% = reinvest everything).",
    examples: "Example: $1,000 growing 1% a period for 100 periods, fully reinvested, becomes $2,704.81 — $704.81 more than the $2,000 you'd have if you withdrew every profit.",
    assumptions: "Losses aren't withdrawn; they reduce the balance. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does compounding make such a difference?", answer: "Each period's profit is earned on a bigger balance, so gains build on gains. The longer it runs, the bigger the gap — but losses compound too." }],
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
