// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Investment Calculators" sub-batch D (Portfolio Construction,
// Fees & Inflation). Part of the Investment Calculators tool-list
// build-out — see create-investment-returns-calculators.ts for the full
// batch context and the 6 skipped duplicates. This is the last of the 4
// sub-batches (48 tools in the source list; 42 built across all 4).
//
// See src/lib/calc-engine-investment-portfolio-fees.ts for the math and
// for notes on how the portfolio, fee, and inflation clusters are each
// deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-portfolio-fees-calculators.ts
// or
//   npm run db:create-investment-portfolio-fees-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Investment Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts). Each tool is filed in one of them; a
// missing sub-category is created under Investment Calculators.
const PARENT_CATEGORY_SLUG = "investment-calculators";
const SUBCATEGORY_NAMES: Record<string, string> = {
  "investment-returns-planning-calculators": "Investment Returns & Planning Calculators",
  "fund-etf-calculators": "Fund & ETF Calculators",
};
const TOOL_CATEGORY: Record<string, string> = {
  "portfolio-allocation-calculator": "investment-returns-planning-calculators",
  "portfolio-rebalancing-calculator": "investment-returns-planning-calculators",
  "weighted-portfolio-return-calculator": "investment-returns-planning-calculators",
  "portfolio-expected-return-calculator": "investment-returns-planning-calculators",
  "portfolio-standard-deviation-calculator": "investment-returns-planning-calculators",
  "sharpe-ratio-calculator": "investment-returns-planning-calculators",
  "investment-fee-calculator": "investment-returns-planning-calculators",
  "expense-ratio-calculator": "fund-etf-calculators",
  "investment-fee-impact-calculator": "investment-returns-planning-calculators",
  "inflation-adjusted-return-calculator": "investment-returns-planning-calculators",
  "real-rate-of-return-calculator": "investment-returns-planning-calculators",
  "nominal-vs-real-return-calculator": "investment-returns-planning-calculators",
};

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
  "This tool provides general estimates for informational purposes only and isn't financial or investment " +
  "advice. Past returns don't guarantee future results — consider speaking with a licensed financial " +
  "professional about your own situation.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "portfolio-allocation-calculator",
    title: "Portfolio Allocation Calculator",
    description: "Split your portfolio between stocks, bonds, and cash using a simple age-based rule of thumb.",
    metaTitle: "Portfolio Allocation Calculator — By Age",
    metaDescription: "Free portfolio allocation calculator. Split your money between stocks, bonds, and cash using the 100, 110, or 120 minus your age rule.",
    calcInputs: [
      currencyField("portfolioValue", "Total Portfolio Value", { default: 100000, step: 1000 }),
      numberField("age", "Your Age", { default: 35, min: 18, max: 100, step: 1 }),
      {
        key: "ruleNumber", label: "Rule of Thumb", type: "dropdown", required: true, default: 110,
        options: [
          { label: "100 Minus Age (Conservative)", value: 100 },
          { label: "110 Minus Age (Moderate)", value: 110 },
          { label: "120 Minus Age (Aggressive)", value: 120 },
        ],
      },
      percentField("cashReservePercent", "Cash Reserve", { default: 5, max: 100, step: 1 }),
    ],
    calcResult: { label: "Amount in Stocks", format: "currency" },
    calcResults: [
      { key: "stockAmount", label: "Stocks", format: "currency", highlight: true },
      { key: "bondAmount", label: "Bonds", format: "currency" },
      { key: "cashAmount", label: "Cash", format: "currency" },
      { key: "stockPercentOfTotal", label: "Stocks as % of Total Portfolio", format: "percentage" },
    ],
    instructions:
      "Enter your portfolio's total value, your age, which version of the age rule you want to follow, and how " +
      "much you want to keep in cash. The tool first sets aside the cash, then splits the rest: the rule number " +
      "minus your age goes into stocks, and the remainder into bonds. Your stock share falls gradually as you get " +
      "older.",
    examples:
      "Example: a 35-year-old with $100,000 using the 110-minus-age rule and a 5% cash reserve would hold $71,250 " +
      "in stocks, $23,750 in bonds, and $5,000 in cash — 71.25% in stocks overall.",
    assumptions:
      "Age-based rules are a simple starting point, not a personal recommendation. Your time horizon, other " +
      "income such as a pension, and comfort with ups and downs all matter too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which rule should I use?",
        answer: "\"100 minus age\" was the traditional rule. Because people now live longer and bond yields have often been low, many now use 110 or 120 minus age to keep more in stocks for longer. The higher the number, the more growth — and the more ups and downs — you should expect.",
      },
    ],
  },
  {
    slug: "portfolio-rebalancing-calculator",
    title: "Portfolio Rebalancing Calculator",
    description: "Work out exactly how much to buy or sell of each asset to bring your portfolio back to its target mix, with optional new cash.",
    metaTitle: "Portfolio Rebalancing Calculator — Free & Instant",
    metaDescription: "Free portfolio rebalancing calculator. See how much to buy or sell of each asset to get back to your target mix, including any new cash you add.",
    calcInputs: [
      currencyField("assetACurrent", "Asset A (e.g. Stocks) — Current Value", { default: 70000, step: 1000 }),
      percentField("assetATargetPercent", "Asset A — Target %", { default: 60, max: 100, step: 1 }),
      currencyField("assetBCurrent", "Asset B (e.g. Bonds) — Current Value", { default: 25000, step: 1000 }),
      percentField("assetBTargetPercent", "Asset B — Target %", { default: 30, max: 100, step: 1 }),
      currencyField("assetCCurrent", "Asset C (e.g. Cash) — Current Value", { default: 5000, step: 1000 }),
      percentField("assetCTargetPercent", "Asset C — Target %", { default: 10, max: 100, step: 1 }),
      currencyField("newCash", "New Money to Add (Optional)", { default: 0, step: 500 }),
    ],
    calcResult: { label: "Asset A Trade", format: "currency" },
    calcResults: [
      { key: "tradeAssetA", label: "Asset A — Buy (+) or Sell (−)", format: "currency", highlight: true },
      { key: "tradeAssetB", label: "Asset B — Buy (+) or Sell (−)", format: "currency" },
      { key: "tradeAssetC", label: "Asset C — Buy (+) or Sell (−)", format: "currency" },
      { key: "newTotalValue", label: "Portfolio Value After Rebalancing", format: "currency" },
      { key: "targetTotalPercent", label: "Targets Entered (Should Be 100%)", format: "percentage" },
    ],
    instructions:
      "Enter the current value and target percentage for up to three holdings (set any you don't use to 0), and " +
      "any new money you're adding. A positive result means buy that amount; a negative result means sell it. " +
      "Adding new cash lets you rebalance partly or fully by buying, without selling anything.",
    examples:
      "Example: a $100,000 portfolio at $70,000 stocks / $25,000 bonds / $5,000 cash, with a 60/30/10 target, " +
      "needs to sell $10,000 of stocks and buy $5,000 each of bonds and cash.",
    assumptions:
      "Targets should add up to 100% — the total you entered is shown so you can check. Trading costs and taxes " +
      "on sales aren't included; in a taxable account, rebalancing with new money or inside tax-advantaged " +
      "accounts can avoid a tax bill. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How often should I rebalance?",
        answer: "Common approaches are once a year, or whenever a holding drifts more than about 5 percentage points from its target. Rebalancing too often mainly adds costs without much benefit.",
      },
    ],
  },
  {
    slug: "weighted-portfolio-return-calculator",
    title: "Weighted Portfolio Return Calculator",
    description: "Calculate your portfolio's overall return from each holding's weight and the return it actually delivered, for up to 5 holdings.",
    metaTitle: "Weighted Portfolio Return Calculator — Free",
    metaDescription: "Free weighted portfolio return calculator. Enter each holding's weight and return, up to 5 holdings, to get your portfolio's overall return.",
    calcInputs: [
      percentField("asset1WeightPercent", "Holding 1 — Weight", { default: 40, max: 100, step: 1 }),
      percentField("asset1ReturnPercent", "Holding 1 — Return", { default: 12, min: -100, max: 1000, step: 0.1 }),
      percentField("asset2WeightPercent", "Holding 2 — Weight", { default: 25, max: 100, step: 1 }),
      percentField("asset2ReturnPercent", "Holding 2 — Return", { default: 5, min: -100, max: 1000, step: 0.1 }),
      percentField("asset3WeightPercent", "Holding 3 — Weight", { default: 20, max: 100, step: 1 }),
      percentField("asset3ReturnPercent", "Holding 3 — Return", { default: 8, min: -100, max: 1000, step: 0.1 }),
      percentField("asset4WeightPercent", "Holding 4 — Weight", { default: 10, max: 100, step: 1 }),
      percentField("asset4ReturnPercent", "Holding 4 — Return", { default: -4, min: -100, max: 1000, step: 0.1 }),
      percentField("asset5WeightPercent", "Holding 5 — Weight", { default: 5, max: 100, step: 1 }),
      percentField("asset5ReturnPercent", "Holding 5 — Return", { default: 2, min: -100, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Weighted Portfolio Return", format: "percentage" },
    calcResults: [
      { key: "weightedReturnPercent", label: "Weighted Portfolio Return", format: "percentage", highlight: true },
      { key: "totalWeightPercent", label: "Weights Entered (Should Be 100%)", format: "percentage" },
    ],
    instructions:
      "For each holding, enter its share of your portfolio at the start of the period and the return it actually " +
      "delivered. Set unused holdings to 0% weight. The tool multiplies each return by its weight and adds them " +
      "up to give the return of the portfolio as a whole.",
    examples:
      "Example: 40% returning 12%, 25% returning 5%, 20% returning 8%, 10% returning −4%, and 5% returning 2% " +
      "gives a weighted portfolio return of 7.35%.",
    assumptions:
      "Weights are taken at the start of the period and no money is moved in or out. If the weights don't add up " +
      "to 100%, the tool scales them to their own total and shows the total you entered. For a forward-looking " +
      "estimate from dollar amounts, use the Portfolio Expected Return Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why can't I just average the returns?",
        answer: "Because a holding that's 40% of your money affects your result far more than one that's 5%. A simple average of these five returns is 4.6%, but the weighted return you actually earned is 7.35%.",
      },
    ],
  },
  {
    slug: "portfolio-expected-return-calculator",
    title: "Portfolio Expected Return Calculator",
    description: "Estimate your portfolio's expected return for the year ahead from the dollar amount in each holding and its expected return.",
    metaTitle: "Portfolio Expected Return Calculator — Free",
    metaDescription: "Free portfolio expected return calculator. Enter the dollar amount and expected return of up to 4 holdings to estimate next year's return and gain.",
    calcInputs: [
      currencyField("holding1Amount", "Holding 1 — Amount", { default: 50000, step: 1000 }),
      percentField("holding1ExpectedReturn", "Holding 1 — Expected Return", { default: 9, min: -50, max: 100, step: 0.1 }),
      currencyField("holding2Amount", "Holding 2 — Amount", { default: 30000, step: 1000 }),
      percentField("holding2ExpectedReturn", "Holding 2 — Expected Return", { default: 5, min: -50, max: 100, step: 0.1 }),
      currencyField("holding3Amount", "Holding 3 — Amount", { default: 15000, step: 1000 }),
      percentField("holding3ExpectedReturn", "Holding 3 — Expected Return", { default: 3.5, min: -50, max: 100, step: 0.1 }),
      currencyField("holding4Amount", "Holding 4 — Amount", { default: 5000, step: 1000 }),
      percentField("holding4ExpectedReturn", "Holding 4 — Expected Return", { default: 1, min: -50, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Expected Portfolio Return", format: "percentage" },
    calcResults: [
      { key: "expectedReturnPercent", label: "Expected Portfolio Return", format: "percentage", highlight: true },
      { key: "expectedAnnualGain", label: "Expected Gain Over the Next Year", format: "currency" },
      { key: "totalPortfolioValue", label: "Current Portfolio Value", format: "currency" },
      { key: "expectedValueNextYear", label: "Expected Value in One Year", format: "currency" },
    ],
    instructions:
      "Enter how much money is in each holding and the return you expect from it over the coming year. Leave " +
      "unused holdings at $0. The tool works out each holding's weight from the dollar amounts and combines the " +
      "expected returns into one figure for the whole portfolio, in both percent and dollars.",
    examples:
      "Example: $50,000 expected to return 9%, $30,000 at 5%, $15,000 at 3.5%, and $5,000 at 1% gives a $100,000 " +
      "portfolio with an expected return of 6.58% — about $6,575 over the next year.",
    assumptions:
      "Expected returns are estimates, not promises. Actual returns will vary, sometimes widely — see the Portfolio " +
      "Standard Deviation Calculator to gauge how much. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Weighted Portfolio Return Calculator?",
        answer: "That tool looks back: it combines returns your holdings already delivered, using percentage weights. This one looks ahead: it combines the returns you expect, using the actual dollar amounts you hold.",
      },
    ],
  },
  {
    slug: "portfolio-standard-deviation-calculator",
    title: "Portfolio Standard Deviation Calculator",
    description: "Calculate the volatility (standard deviation) of a 3-asset portfolio from each asset's weight, volatility, and correlation.",
    metaTitle: "Portfolio Standard Deviation Calculator — Free",
    metaDescription: "Free portfolio standard deviation calculator. Measure 3-asset portfolio risk from weights, volatilities, and correlations, plus the diversification benefit.",
    calcInputs: [
      percentField("asset1WeightPercent", "Asset 1 — Weight", { default: 60, max: 100, step: 1 }),
      percentField("asset1StdDev", "Asset 1 — Standard Deviation", { default: 18, max: 200, step: 0.1 }),
      percentField("asset2WeightPercent", "Asset 2 — Weight", { default: 30, max: 100, step: 1 }),
      percentField("asset2StdDev", "Asset 2 — Standard Deviation", { default: 6, max: 200, step: 0.1 }),
      percentField("asset3WeightPercent", "Asset 3 — Weight", { default: 10, max: 100, step: 1 }),
      percentField("asset3StdDev", "Asset 3 — Standard Deviation", { default: 1, max: 200, step: 0.1 }),
      numberField("correlation12", "Correlation: Asset 1 & 2 (−1 to 1)", { default: 0.2, min: -1, max: 1, step: 0.05 }),
      numberField("correlation13", "Correlation: Asset 1 & 3 (−1 to 1)", { default: 0, min: -1, max: 1, step: 0.05 }),
      numberField("correlation23", "Correlation: Asset 2 & 3 (−1 to 1)", { default: 0.1, min: -1, max: 1, step: 0.05 }),
    ],
    calcResult: { label: "Portfolio Standard Deviation", format: "percentage" },
    calcResults: [
      { key: "portfolioStdDevPercent", label: "Portfolio Standard Deviation", format: "percentage", highlight: true },
      { key: "weightedAverageStdDevPercent", label: "Weighted Average of Asset Standard Deviations", format: "percentage" },
      { key: "diversificationBenefitPercent", label: "Risk Reduced by Diversification", format: "percentage" },
    ],
    instructions:
      "Enter each asset's weight in the portfolio and its standard deviation (how much its yearly return " +
      "typically swings), then how closely each pair of assets moves together, from −1 (opposite directions) " +
      "through 0 (unrelated) to 1 (in lockstep). For a two-asset portfolio, set Asset 3's weight to 0.",
    examples:
      "Example: 60% stocks (18% volatility), 30% bonds (6%), and 10% cash (1%), with a 0.2 stock–bond correlation, " +
      "has a portfolio standard deviation of 11.30%, below the 12.70% weighted average of the three — a 1.40% " +
      "diversification benefit.",
    assumptions:
      "Uses the standard portfolio variance formula. Weights are scaled to add up to 100%. Correlations and " +
      "volatilities change over time and often rise together in market crashes, so the real diversification " +
      "benefit can be smaller when you need it most. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is portfolio risk lower than the average of the parts?",
        answer: "Because assets that don't move in perfect lockstep partly offset one another. The lower the correlation between them, the bigger the reduction; only at a correlation of 1 does the benefit disappear.",
      },
    ],
  },
  {
    slug: "sharpe-ratio-calculator",
    title: "Sharpe Ratio Calculator",
    description: "Calculate the Sharpe ratio — return earned per unit of risk — and convert monthly, weekly, or daily figures to an annual Sharpe ratio.",
    metaTitle: "Sharpe Ratio Calculator — Free & Instant",
    metaDescription: "Free Sharpe ratio calculator. Find return per unit of risk from return, risk-free rate, and volatility, and annualize monthly, weekly, or daily figures.",
    calcInputs: [
      percentField("portfolioReturn", "Portfolio Return (for the Period)", { default: 10, min: -100, max: 200, step: 0.1 }),
      percentField("riskFreeRate", "Risk-Free Rate (for the Same Period)", { default: 4, max: 20, step: 0.01 }),
      percentField("standardDeviation", "Standard Deviation (for the Same Period)", { default: 14, max: 200, step: 0.1 }),
      {
        key: "periodsPerYear", label: "Your Figures Are", type: "dropdown", required: true, default: 1,
        options: [
          { label: "Annual", value: 1 },
          { label: "Monthly", value: 12 },
          { label: "Weekly", value: 52 },
          { label: "Daily (Trading Days)", value: 252 },
        ],
      },
    ],
    calcResult: { label: "Annualized Sharpe Ratio", format: "number" },
    calcResults: [
      { key: "annualizedSharpeRatio", label: "Annualized Sharpe Ratio", format: "number", highlight: true },
      { key: "sharpeRatio", label: "Sharpe Ratio (Per Period Entered)", format: "number" },
      { key: "excessReturnPercent", label: "Excess Return Over Risk-Free", format: "percentage" },
    ],
    instructions:
      "Enter the portfolio's return, the risk-free rate, and the standard deviation of returns — all for the same " +
      "kind of period — then say whether they're annual, monthly, weekly, or daily figures. The tool calculates " +
      "the Sharpe ratio for that period and scales it to an annual figure so different funds can be compared.",
    examples:
      "Example: a 10% annual return with 14% volatility and a 4% risk-free rate gives a Sharpe ratio of 0.43. With " +
      "monthly figures of 1.2% return, 0.3% risk-free, and 4% volatility, the monthly Sharpe ratio is 0.225, which " +
      "annualizes to 0.78.",
    assumptions:
      "Sharpe ratio = (return − risk-free rate) ÷ standard deviation. Annualizing multiplies by the square root of " +
      "the number of periods per year, which assumes returns from one period to the next are unrelated. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good Sharpe ratio?",
        answer: "Roughly: below 1 is common for broad stock markets over long periods, above 1 is good, and above 2 is very good. Always compare funds over the same period and with the same risk-free rate.",
      },
    ],
  },
  {
    slug: "investment-fee-calculator",
    title: "Investment Fee Calculator",
    description: "Add up what your investments cost each year — advisory fees, fund expense ratios, trading commissions, and account fees.",
    metaTitle: "Investment Fee Calculator — Free & Instant",
    metaDescription: "Free investment fee calculator. Add up your yearly advisory fees, fund expense ratios, trading costs, and account fees in dollars and as a percentage.",
    calcInputs: [
      currencyField("portfolioValue", "Portfolio Value", { default: 250000, step: 5000 }),
      percentField("advisoryFeePercent", "Advisory / Management Fee", { default: 1, max: 5, step: 0.05 }),
      percentField("expenseRatioPercent", "Average Fund Expense Ratio", { default: 0.3, max: 5, step: 0.01 }),
      numberField("tradesPerYear", "Trades Per Year", { default: 12, max: 10000, step: 1 }),
      currencyField("commissionPerTrade", "Commission Per Trade", { default: 0, max: 1000, step: 1 }),
      currencyField("annualAccountFee", "Flat Yearly Account Fees", { default: 75, max: 100000, step: 5 }),
    ],
    calcResult: { label: "Total Annual Fees", format: "currency" },
    calcResults: [
      { key: "totalAnnualFees", label: "Total Annual Fees", format: "currency", highlight: true },
      { key: "advisoryFeeAmount", label: "Advisory Fee", format: "currency" },
      { key: "fundExpenseAmount", label: "Fund Expenses", format: "currency" },
      { key: "tradingAndAccountFees", label: "Trading & Account Fees", format: "currency" },
      { key: "allInCostPercent", label: "All-In Cost (% of Portfolio)", format: "percentage" },
    ],
    instructions:
      "Enter your portfolio value, your adviser's fee as a percentage, the average expense ratio of your funds, how " +
      "many trades you make a year and what each costs, and any flat account fees. The tool turns every fee into " +
      "dollars for one year and shows your total, all-in cost as a percentage.",
    examples:
      "Example: a $250,000 portfolio with a 1% advisory fee, 0.30% average fund expenses, commission-free trades, " +
      "and a $75 account fee costs $3,325 a year — an all-in cost of 1.33%.",
    assumptions:
      "Percentage fees are calculated on the current portfolio value for one year. Fund expense ratios are taken " +
      "out of fund returns automatically, so you won't see them as a separate charge on your statement. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does this cost me over the long run?",
        answer: "Much more than the yearly figure suggests, because fees also remove the growth that money would have earned. Use the Investment Fee Impact Calculator to see the long-term effect.",
      },
    ],
  },
  {
    slug: "expense-ratio-calculator",
    title: "Expense Ratio Calculator",
    description: "Compare two funds' expense ratios and see how much each costs, in dollars and in lost growth, over the years you hold them.",
    metaTitle: "Expense Ratio Calculator — Compare Two Funds",
    metaDescription: "Free expense ratio calculator. Compare two funds' expense ratios to see total fees paid and how much more you'd have in the lower-cost fund.",
    calcInputs: [
      currencyField("investmentAmount", "Amount Invested", { default: 50000, step: 1000 }),
      percentField("fundAExpenseRatio", "Fund A — Expense Ratio", { default: 0.75, max: 5, step: 0.01 }),
      percentField("fundBExpenseRatio", "Fund B — Expense Ratio", { default: 0.05, max: 5, step: 0.01 }),
      percentField("annualReturnPercent", "Expected Annual Return (Before Fees)", { default: 7, min: -20, max: 30, step: 0.1 }),
      numberField("years", "Years Held", { default: 20, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Fund B Advantage", format: "currency" },
    calcResults: [
      { key: "endingValueA", label: "Fund A — Ending Value", format: "currency" },
      { key: "endingValueB", label: "Fund B — Ending Value", format: "currency" },
      { key: "totalFeesA", label: "Fund A — Total Fees Paid", format: "currency" },
      { key: "totalFeesB", label: "Fund B — Total Fees Paid", format: "currency" },
      { key: "difference", label: "Extra Ending Value in Fund B", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount invested, the expense ratio of each fund (found on the fund's fact sheet), the return you " +
      "expect before fees, and how many years you'll hold it. The tool grows the same investment in both funds " +
      "and shows total fees paid and the difference in ending value.",
    examples:
      "Example: $50,000 at a 7% return for 20 years ends at $166,439.29 in a fund charging 0.75% (fees of " +
      "$15,077.46) versus $191,558.54 in a fund charging 0.05% (fees of $1,090.24) — $25,119.25 more in the " +
      "low-cost fund.",
    assumptions:
      "Both funds are assumed to earn the same return before fees. Each year the fund earns its return, then the " +
      "expense ratio is taken from the grown balance. No deposits, withdrawals, or taxes. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the difference bigger than the fees paid?",
        answer: "Because every dollar taken in fees also stops growing. The gap in ending value includes both the fees and the growth those fees would have earned.",
      },
    ],
  },
  {
    slug: "investment-fee-impact-calculator",
    title: "Investment Fee Impact Calculator",
    description: "See how much an all-in annual fee costs you over decades of investing — in lost growth and as a share of your final balance.",
    metaTitle: "Investment Fee Impact Calculator — Free",
    metaDescription: "Free investment fee impact calculator. See how much a yearly fee reduces your final balance over decades of investing with monthly contributions.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 50000, step: 1000 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 500, max: 1000000, step: 25 }),
      percentField("annualReturnPercent", "Expected Annual Return (Before Fees)", { default: 7, min: -20, max: 30, step: 0.1 }),
      percentField("annualFeePercent", "Total Annual Fees", { default: 1, max: 5, step: 0.05 }),
      numberField("years", "Years", { default: 30, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Total Cost of Fees", format: "currency" },
    calcResults: [
      { key: "endingWithoutFees", label: "Ending Balance With No Fees", format: "currency" },
      { key: "endingWithFees", label: "Ending Balance After Fees", format: "currency" },
      { key: "totalCostOfFees", label: "Total Cost of Fees (Incl. Lost Growth)", format: "currency", highlight: true },
      { key: "percentOfBalanceLost", label: "Share of Final Balance Lost to Fees", format: "percentage" },
    ],
    instructions:
      "Enter your starting amount, monthly contribution, the return you expect before fees, your total yearly fees " +
      "(advisory fee plus fund expense ratios), and how many years you'll invest. The tool compares your balance " +
      "with and without those fees to show their true long-term cost.",
    examples:
      "Example: $50,000 plus $500 a month at 7% for 30 years grows to $1,015,810.37 with no fees, but $802,302.35 " +
      "with a 1% yearly fee — $213,508.02, or 21.02% of the final balance, lost to fees.",
    assumptions:
      "Fees are charged monthly at 1/12 of the annual rate on the balance after that month's growth; " +
      "contributions are made at the end of each month. Taxes aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does 1% really matter that much?",
        answer: "Yes. 1% sounds small, but it's charged on your whole balance every year, and the money it removes also stops compounding. Over 30 years that can add up to around a fifth of what you'd otherwise have.",
      },
    ],
  },
  {
    slug: "inflation-adjusted-return-calculator",
    title: "Inflation-Adjusted Return Calculator",
    description: "Convert a nominal return into a real, inflation-adjusted return using the exact Fisher formula, and see how far off the quick shortcut is.",
    metaTitle: "Inflation-Adjusted Return Calculator — Free",
    metaDescription: "Free inflation-adjusted return calculator. Turn a nominal return into a real return with the exact formula, and compare it with the quick shortcut.",
    calcInputs: [
      percentField("nominalReturn", "Nominal Return", { default: 8, min: -100, max: 200, step: 0.1 }),
      percentField("inflationRate", "Inflation Rate", { default: 3, min: -10, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Real (Inflation-Adjusted) Return", format: "percentage" },
    calcResults: [
      { key: "realReturnPercent", label: "Real Return (Exact)", format: "percentage", highlight: true },
      { key: "approximateRealReturnPercent", label: "Shortcut: Return − Inflation", format: "percentage" },
      { key: "approximationErrorPercent", label: "How Far Off the Shortcut Is", format: "percentage" },
    ],
    instructions:
      "Enter your investment's nominal return (the number your statement shows) and the inflation rate for the " +
      "same period. The tool gives your real return — how much your purchasing power actually grew — using the " +
      "exact formula, alongside the common shortcut of simply subtracting inflation.",
    examples:
      "Example: an 8% return with 3% inflation is a real return of 4.8544%, not the 5% the shortcut suggests — the " +
      "shortcut overstates it by 0.1456%.",
    assumptions:
      "Uses the Fisher equation: real return = (1 + nominal) ÷ (1 + inflation) − 1. Fees and taxes aren't included " +
      "— use the Real Rate of Return Calculator to account for those too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "When does the shortcut go badly wrong?",
        answer: "When inflation or returns are high. At 30% returns and 20% inflation, the shortcut says 10%, but the real return is only about 8.3%.",
      },
    ],
  },
  {
    slug: "real-rate-of-return-calculator",
    title: "Real Rate of Return Calculator",
    description: "Find what's left of your return after fees, taxes, and inflation — step by step — to see your true growth in purchasing power.",
    metaTitle: "Real Rate of Return Calculator — Free & Instant",
    metaDescription: "Free real rate of return calculator. See your return after fees, then taxes, then inflation, to find your true growth in purchasing power.",
    calcInputs: [
      percentField("nominalReturn", "Nominal Return", { default: 8, min: -100, max: 200, step: 0.1 }),
      percentField("annualFees", "Annual Fees", { default: 0.5, max: 5, step: 0.05 }),
      percentField("taxRate", "Tax Rate on Returns", { default: 22, max: 60, step: 1 }),
      percentField("inflationRate", "Inflation Rate", { default: 3, min: -10, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Real After-Tax Return", format: "percentage" },
    calcResults: [
      { key: "afterFeeReturnPercent", label: "Step 1 — After Fees", format: "percentage" },
      { key: "afterTaxReturnPercent", label: "Step 2 — After Tax", format: "percentage" },
      { key: "realAfterTaxReturnPercent", label: "Step 3 — After Inflation (Real Return)", format: "percentage", highlight: true },
      { key: "returnLostPercent", label: "Total Lost to Fees, Tax & Inflation", format: "percentage" },
    ],
    instructions:
      "Enter your nominal return, your yearly fees, the tax rate you pay on investment returns, and the inflation " +
      "rate. The tool takes off fees first, then tax, then adjusts for inflation, showing the return left at each " +
      "step and how much of the original return was lost in total.",
    examples:
      "Example: an 8% return minus 0.5% in fees is 7.5%; after 22% tax it's 5.85%; and after 3% inflation the real " +
      "return is just 2.77% — 5.23 percentage points lost along the way.",
    assumptions:
      "Assumes the whole after-fee return is taxed each year at the rate entered (losses aren't taxed), as with " +
      "interest in a taxable account. Tax-advantaged accounts or lower capital-gains rates would leave more. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Inflation-Adjusted Return Calculator?",
        answer: "That tool adjusts for inflation only. This one also takes off fees and taxes, so it shows what you really keep in purchasing power.",
      },
    ],
  },
  {
    slug: "nominal-vs-real-return-calculator",
    title: "Nominal vs Real Return Calculator",
    description: "Compare what an investment will be worth in future dollars with what it's worth in today's purchasing power after inflation.",
    metaTitle: "Nominal vs Real Return Calculator — Free",
    metaDescription: "Free nominal vs real return calculator. Compare an investment's future dollar value with its value in today's money after years of inflation.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 10000, step: 500 }),
      percentField("nominalReturn", "Nominal Annual Return", { default: 7, min: -50, max: 50, step: 0.1 }),
      percentField("inflationRate", "Annual Inflation Rate", { default: 3, min: -10, max: 50, step: 0.1 }),
      numberField("years", "Years", { default: 25, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Real Value (Today's Dollars)", format: "currency" },
    calcResults: [
      { key: "nominalEndingValue", label: "Nominal Value (Future Dollars)", format: "currency" },
      { key: "realEndingValue", label: "Real Value (Today's Dollars)", format: "currency", highlight: true },
      { key: "inflationGap", label: "Difference Caused by Inflation", format: "currency" },
      { key: "realAnnualReturnPercent", label: "Real Annual Return", format: "percentage" },
    ],
    instructions:
      "Enter the amount you're investing, its expected yearly return, the inflation rate you expect, and the " +
      "number of years. The tool shows the dollar amount you'd see on your statement (nominal) and what that " +
      "amount would actually buy in today's money (real).",
    examples:
      "Example: $10,000 growing 7% a year for 25 years becomes $54,274.33 — but with 3% inflation that's worth " +
      "only $25,921.72 in today's money, a real return of 3.88% a year.",
    assumptions:
      "Returns and inflation are both assumed to be steady and compounded yearly. Fees and taxes aren't " +
      "included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which number should I plan with?",
        answer: "Use the real value when you're asking what your money will buy — for example, retirement spending. Use the nominal value when you're comparing it with a fixed-dollar target such as a loan balance.",
      },
    ],
  },
];

async function main() {
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  const categoryIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(SUBCATEGORY_NAMES)) {
    const existing = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!existing) console.log(`Creating sub-category "${name}" under "${parent.name}".`);
    const category =
      existing ??
      (await prisma.toolCategory.create({
        data: { name, slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
      }));
    categoryIds.set(slug, category.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: categoryIds.get(TOOL_CATEGORY[def.slug])!,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, filed under the Investment Calculators sub-categories.`);
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
