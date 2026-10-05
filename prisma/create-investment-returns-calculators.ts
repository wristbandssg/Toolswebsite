// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Investment Calculators" sub-batch A (Returns & Required Return).
// Part of the Investment Calculators tool-list build-out: 48 tools in the
// source list, 6 skipped as duplicates of existing tools
// (investment-calculator, cagr-calculator, dollar-cost-averaging-calculator,
// stock-profit-calculator, dividend-calculator, and roi-calculator under
// Business Finance), 42 built across 4 sub-batches:
//   create-investment-returns-calculators.ts (this file, 11 tools)
//   create-investment-planning-calculators.ts (10 tools)
//   create-investment-stocks-dividends-calculators.ts (9 tools)
//   create-investment-portfolio-fees-calculators.ts (12 tools)
//
// See src/lib/calc-engine-investment-returns.ts for the math and for notes
// on how the many "return" tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-investment-returns-calculators.ts
// or
//   npm run db:create-investment-returns-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Re-pointed 5 Oct 2026: Investment Calculators was split into 5 sub-categories
// (see organize-tool-categories.ts). Each tool is filed in one of them; a
// missing sub-category is created under Investment Calculators.
const PARENT_CATEGORY_SLUG = "investment-calculators";
const SUBCATEGORY_NAMES: Record<string, string> = {
  "investment-returns-planning-calculators": "Investment Returns & Planning Calculators",
  "stock-options-calculators": "Stock & Options Calculators",
};
const TOOL_CATEGORY: Record<string, string> = {
  "investment-return-calculator": "investment-returns-planning-calculators",
  "stock-return-calculator": "stock-options-calculators",
  "portfolio-return-calculator": "investment-returns-planning-calculators",
  "annualized-return-calculator": "investment-returns-planning-calculators",
  "holding-period-return-calculator": "investment-returns-planning-calculators",
  "total-return-calculator": "investment-returns-planning-calculators",
  "average-annual-return-calculator": "investment-returns-planning-calculators",
  "expected-return-calculator": "investment-returns-planning-calculators",
  "required-rate-of-return-calculator": "investment-returns-planning-calculators",
  "risk-adjusted-return-calculator": "investment-returns-planning-calculators",
  "break-even-investment-return-calculator": "investment-returns-planning-calculators",
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
    slug: "investment-return-calculator",
    title: "Investment Return Calculator",
    description: "Calculate the net gain, total return, and annualized return on an investment, including any income it paid along the way.",
    metaTitle: "Investment Return Calculator — Free & Instant",
    metaDescription: "Free investment return calculator. Enter what you invested, what it's worth now, and income received to see your total and annualized return.",
    calcInputs: [
      currencyField("amountInvested", "Amount Invested", { default: 10000, step: 500 }),
      currencyField("finalValue", "Current or Final Value", { default: 14500, step: 500 }),
      currencyField("incomeReceived", "Income Received (Dividends/Interest)", { default: 600, step: 50 }),
      numberField("yearsHeld", "Years Held", { default: 4, min: 0.1, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Total Return", format: "percentage" },
    calcResults: [
      { key: "netGain", label: "Net Gain", format: "currency" },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage", highlight: true },
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage" },
    ],
    instructions:
      "Enter how much you originally invested, what the investment is worth today (or what you sold it for), any " +
      "dividends or interest it paid you while you held it, and how many years you held it. The tool adds the " +
      "income to the change in value, then shows the result as a total return and as an average yearly " +
      "(annualized) return, so you can compare investments held for different lengths of time.",
    examples:
      "Example: $10,000 invested, now worth $14,500, that also paid $600 in dividends over 4 years has a net gain " +
      "of $5,100 — a 51% total return, or 10.85% a year annualized.",
    assumptions:
      "Assumes the income was received in cash (not reinvested) and that there were no additional deposits or " +
      "withdrawals. If you added or removed money during the period, use the Portfolio Return Calculator " +
      "instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from an ROI calculator?",
        answer: "A basic ROI calculator compares gain to cost for any kind of project. This tool is built for investments: it counts dividends or interest you received as part of the return, and it annualizes the result so a 4-year holding and a 1-year holding can be compared fairly.",
      },
      {
        question: "Why is the annualized return lower than total return divided by years?",
        answer: "Because returns compound. 51% over 4 years isn't 12.75% a year — growing 10.85% a year for 4 years (with each year building on the last) is what gets you to 51%.",
      },
    ],
  },
  {
    slug: "stock-return-calculator",
    title: "Stock Return Calculator",
    description: "Calculate the total and annualized return on a stock position from shares, buy and sell prices, dividends per share, commissions, and days held.",
    metaTitle: "Stock Return Calculator — Free & Instant",
    metaDescription: "Free stock return calculator. Enter shares, buy and sell price, dividends per share, commissions, and days held to see total and annualized return.",
    calcInputs: [
      numberField("shares", "Number of Shares", { default: 100, min: 0, max: 10000000, step: 1 }),
      currencyField("buyPrice", "Buy Price Per Share", { default: 50, max: 1000000, step: 0.01 }),
      currencyField("sellPrice", "Sell (or Current) Price Per Share", { default: 62, max: 1000000, step: 0.01 }),
      currencyField("dividendsPerShare", "Dividends Received Per Share", { default: 1.5, max: 100000, step: 0.01 }),
      currencyField("buyCommission", "Buy Commission", { default: 5, max: 10000, step: 1 }),
      currencyField("sellCommission", "Sell Commission", { default: 5, max: 10000, step: 1 }),
      numberField("daysHeld", "Days Held", { default: 540, min: 1, max: 36500, step: 1 }),
    ],
    calcResult: { label: "Total Return", format: "percentage" },
    calcResults: [
      { key: "totalCost", label: "Total Cost (Incl. Buy Commission)", format: "currency" },
      { key: "dividendIncome", label: "Dividend Income", format: "currency" },
      { key: "totalReturn", label: "Total Return ($)", format: "currency" },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage", highlight: true },
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage" },
    ],
    instructions:
      "Enter how many shares you bought, the price you paid and the price you sold at (or today's price), the total " +
      "dividends paid per share while you held it, your buy and sell commissions, and how many days you held the " +
      "stock. The result combines price gain and dividends, minus commissions, and also converts it to a yearly " +
      "rate based on the exact number of days held.",
    examples:
      "Example: 100 shares bought at $50 and sold at $62 after 540 days, with $1.50 per share in dividends and $5 " +
      "commissions each way, costs $5,005 and returns $1,340 in total — 26.77%, or 17.39% a year annualized.",
    assumptions:
      "Dividends are counted as cash received, not reinvested. Taxes aren't included. Annualizing a holding of " +
      "less than a year projects that short-term result over a full year, which can look unusually large or " +
      "small. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is this different from the Stock Profit Calculator?",
        answer: "The Stock Profit Calculator shows the profit on a trade from price and commission alone. This tool also counts dividends and converts the result into an annualized return using the number of days you held the stock.",
      },
    ],
  },
  {
    slug: "portfolio-return-calculator",
    title: "Portfolio Return Calculator",
    description: "Calculate your portfolio's true investment return for a period, correcting for money you added or withdrew along the way.",
    metaTitle: "Portfolio Return Calculator — Free & Instant",
    metaDescription: "Free portfolio return calculator. Enter starting and ending value plus deposits and withdrawals to see your real return, not just the balance change.",
    calcInputs: [
      currencyField("startingValue", "Starting Portfolio Value", { default: 50000, step: 1000 }),
      currencyField("contributions", "Money Added During Period", { default: 6000, step: 500 }),
      currencyField("withdrawals", "Money Withdrawn During Period", { default: 2000, step: 500 }),
      currencyField("endingValue", "Ending Portfolio Value", { default: 58500, step: 1000 }),
    ],
    calcResult: { label: "Portfolio Return", format: "percentage" },
    calcResults: [
      { key: "investmentGain", label: "Investment Gain (Excl. Deposits/Withdrawals)", format: "currency" },
      { key: "portfolioReturnPercent", label: "Portfolio Return", format: "percentage", highlight: true },
      { key: "unadjustedChangePercent", label: "Raw Balance Change (Not a Return)", format: "percentage" },
    ],
    instructions:
      "Enter your portfolio value at the start of the period (for example, 1 January), the total you deposited and " +
      "the total you withdrew during the period, and the value at the end. The tool strips out your own deposits " +
      "and withdrawals so the result reflects only what your investments earned, then compares it to the raw " +
      "balance change so you can see how misleading that simple number can be.",
    examples:
      "Example: a portfolio that starts at $50,000 and ends at $58,500, with $6,000 added and $2,000 withdrawn " +
      "during the year, earned $4,500 from investments — an 8.65% return, even though the balance itself went " +
      "up 17%.",
    assumptions:
      "Uses the Modified Dietz method with deposits and withdrawals assumed to happen, on average, halfway " +
      "through the period. If large amounts moved in or out at the very start or end of the period, the true " +
      "time-weighted return can differ somewhat. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why not just compare the starting and ending balance?",
        answer: "Because your own deposits aren't investment performance. If you add $6,000 to a $50,000 account, the balance rises 12% even if your investments earned nothing — this tool removes that effect.",
      },
    ],
  },
  {
    slug: "annualized-return-calculator",
    title: "Annualized Return Calculator",
    description: "Convert a gain or loss over any holding period — years, months, and days — into an equivalent yearly return.",
    metaTitle: "Annualized Return Calculator — Free & Instant",
    metaDescription: "Free annualized return calculator. Enter beginning and ending value and a holding period in years, months, and days to get the yearly return rate.",
    calcInputs: [
      currencyField("beginningValue", "Beginning Value", { default: 10000, step: 500 }),
      currencyField("endingValue", "Ending Value", { default: 11800, step: 500 }),
      numberField("years", "Holding Period — Years", { default: 1, min: 0, max: 100, step: 1 }),
      numberField("months", "Holding Period — Months", { default: 6, min: 0, max: 11, step: 1 }),
      numberField("days", "Holding Period — Days", { default: 0, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "Annualized Return", format: "percentage" },
    calcResults: [
      { key: "annualizedReturnPercent", label: "Annualized Return", format: "percentage", highlight: true },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage" },
      { key: "holdingPeriodYears", label: "Holding Period (Years)", format: "number" },
    ],
    instructions:
      "Enter the value at the start and the value at the end (including any reinvested income), then the length " +
      "of time you held the investment in years, months, and days. The tool converts the holding period into " +
      "years and finds the steady yearly rate that would turn the beginning value into the ending value.",
    examples:
      "Example: $10,000 growing to $11,800 over 1 year and 6 months is an 18% total return, which works out to " +
      "11.67% a year annualized.",
    assumptions:
      "Months are counted as 1/12 of a year and days as 1/365 of a year. For periods shorter than a year the " +
      "result is an extrapolation — it shows what the return would be if the same pace continued for a full " +
      "year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is annualized return the same as CAGR?",
        answer: "It's the same idea — a steady yearly growth rate. The CAGR Calculator takes a whole number of years; this tool accepts years, months, and days so it handles odd or partial holding periods precisely.",
      },
    ],
  },
  {
    slug: "holding-period-return-calculator",
    title: "Holding Period Return Calculator",
    description: "Link together the returns from up to 5 consecutive periods to find the total holding period return and the average return per period.",
    metaTitle: "Holding Period Return Calculator — Free & Instant",
    metaDescription: "Free holding period return calculator. Enter the return for each period (up to 5) to see the linked total return, ending value, and average per period.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 10000, step: 500 }),
      {
        key: "numberOfPeriods", label: "Number of Periods", type: "dropdown", required: true, default: 4,
        options: [
          { label: "1 Period", value: 1 },
          { label: "2 Periods", value: 2 },
          { label: "3 Periods", value: 3 },
          { label: "4 Periods", value: 4 },
          { label: "5 Periods", value: 5 },
        ],
      },
      percentField("period1ReturnPercent", "Period 1 Return", { default: 8, min: -100, max: 1000, step: 0.1 }),
      percentField("period2ReturnPercent", "Period 2 Return", { default: -3, min: -100, max: 1000, step: 0.1 }),
      percentField("period3ReturnPercent", "Period 3 Return", { default: 12, min: -100, max: 1000, step: 0.1 }),
      percentField("period4ReturnPercent", "Period 4 Return", { default: 5, min: -100, max: 1000, step: 0.1 }),
      percentField("period5ReturnPercent", "Period 5 Return", { default: 0, min: -100, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Holding Period Return", format: "percentage" },
    calcResults: [
      { key: "holdingPeriodReturnPercent", label: "Holding Period Return", format: "percentage", highlight: true },
      { key: "endingValue", label: "Ending Value", format: "currency" },
      { key: "geometricAveragePerPeriodPercent", label: "Average Return Per Period (Compounded)", format: "percentage" },
    ],
    instructions:
      "Choose how many periods you held the investment (quarters, years, or any equal periods), then enter the " +
      "return for each one — use a minus sign for a loss. The tool chains the periods together, so each period's " +
      "return is applied to the balance left by the one before, giving the true cumulative return. Returns for " +
      "periods beyond the number you choose are ignored.",
    examples:
      "Example: returns of +8%, −3%, +12%, and +5% over 4 periods link to a 23.20% holding period return — $10,000 " +
      "becomes $12,319.78, an average of 5.35% per period compounded.",
    assumptions:
      "Each period's return should already include any income for that period. Periods can be any length, but " +
      "the average per period only means something if they're all the same length. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why not just add the period returns together?",
        answer: "Because each period's gain or loss is on a different balance. +8%, −3%, +12%, and +5% add up to 22%, but chained together they actually produce 23.20%.",
      },
    ],
  },
  {
    slug: "total-return-calculator",
    title: "Total Return Calculator",
    description: "Calculate an investment's total return and split it into price return (change in value) and income return (dividends or interest).",
    metaTitle: "Total Return Calculator — Free & Instant",
    metaDescription: "Free total return calculator. See how much of your return came from price change and how much from dividends or interest.",
    calcInputs: [
      currencyField("beginningValue", "Beginning Value", { default: 20000, step: 500 }),
      currencyField("endingValue", "Ending Value", { default: 22400, step: 500 }),
      currencyField("incomeReceived", "Dividends/Interest Received", { default: 800, step: 50 }),
    ],
    calcResult: { label: "Total Return", format: "percentage" },
    calcResults: [
      { key: "totalReturn", label: "Total Return ($)", format: "currency" },
      { key: "totalReturnPercent", label: "Total Return", format: "percentage", highlight: true },
      { key: "priceReturnPercent", label: "Price Return", format: "percentage" },
      { key: "incomeReturnPercent", label: "Income Return", format: "percentage" },
    ],
    instructions:
      "Enter the investment's value at the start, its value at the end, and any dividends or interest paid out to " +
      "you in between. The tool shows your total return along with its two parts — how much came from the price " +
      "rising or falling, and how much came from income.",
    examples:
      "Example: an investment that grows from $20,000 to $22,400 and pays $800 in dividends has a $3,200 total " +
      "return of 16% — 12% from price and 4% from income.",
    assumptions:
      "Income is treated as paid out in cash. If dividends were automatically reinvested, they're already " +
      "inside the ending value — enter $0 for income so they aren't counted twice. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does income return matter?",
        answer: "Price-only charts ignore dividends, which can be a large share of long-term returns for income stocks and funds. Splitting the two shows where your return actually came from.",
      },
    ],
  },
  {
    slug: "average-annual-return-calculator",
    title: "Average Annual Return Calculator",
    description: "Compare the simple (arithmetic) average of up to 5 yearly returns with the compounded (geometric) average you actually earned.",
    metaTitle: "Average Annual Return Calculator — Free & Instant",
    metaDescription: "Free average annual return calculator. Enter up to 5 yearly returns to compare the simple average with the compounded average you really earned.",
    calcInputs: [
      currencyField("startingAmount", "Starting Amount", { default: 10000, step: 500 }),
      {
        key: "yearsIncluded", label: "Number of Years", type: "dropdown", required: true, default: 5,
        options: [
          { label: "2 Years", value: 2 },
          { label: "3 Years", value: 3 },
          { label: "4 Years", value: 4 },
          { label: "5 Years", value: 5 },
        ],
      },
      percentField("year1ReturnPercent", "Year 1 Return", { default: 15, min: -100, max: 1000, step: 0.1 }),
      percentField("year2ReturnPercent", "Year 2 Return", { default: -10, min: -100, max: 1000, step: 0.1 }),
      percentField("year3ReturnPercent", "Year 3 Return", { default: 20, min: -100, max: 1000, step: 0.1 }),
      percentField("year4ReturnPercent", "Year 4 Return", { default: 5, min: -100, max: 1000, step: 0.1 }),
      percentField("year5ReturnPercent", "Year 5 Return", { default: 8, min: -100, max: 1000, step: 0.1 }),
    ],
    calcResult: { label: "Arithmetic Average Return", format: "percentage" },
    calcResults: [
      { key: "arithmeticAveragePercent", label: "Simple (Arithmetic) Average", format: "percentage", highlight: true },
      { key: "geometricAveragePercent", label: "Compounded (Geometric) Average", format: "percentage" },
      { key: "volatilityDragPercent", label: "Volatility Drag (Gap Between the Two)", format: "percentage" },
      { key: "endingValue", label: "Ending Value", format: "currency" },
    ],
    instructions:
      "Choose how many years to include and enter each year's return, using a minus sign for a losing year. The " +
      "tool shows the simple average most fund reports quote, the compounded average you actually earned, and " +
      "the gap between them — called volatility drag, it grows the more your returns swing up and down.",
    examples:
      "Example: yearly returns of 15%, −10%, 20%, 5%, and 8% have a simple average of 7.60%, but the compounded " +
      "average is only 7.09% — a 0.51% volatility drag. $10,000 grows to $14,084.28.",
    assumptions:
      "Each year's return should include reinvested income. The compounded (geometric) average is the one to " +
      "use for projecting how money actually grows. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which average should I believe?",
        answer: "For how your money actually grew, use the compounded (geometric) average. The simple average is always equal to or higher than it, so a fund that quotes only the simple average can make its track record look a little better than investors really experienced.",
      },
    ],
  },
  {
    slug: "expected-return-calculator",
    title: "Expected Return Calculator",
    description: "Calculate the probability-weighted expected return of an investment across three scenarios, plus how widely the outcomes spread.",
    metaTitle: "Expected Return Calculator — Free & Instant",
    metaDescription: "Free expected return calculator. Enter a probability and return for good, base, and bad scenarios to get the expected return and its standard deviation.",
    calcInputs: [
      percentField("scenario1Probability", "Good Scenario — Probability", { default: 25, max: 100, step: 1 }),
      percentField("scenario1ReturnPercent", "Good Scenario — Return", { default: 20, min: -100, max: 1000, step: 0.5 }),
      percentField("scenario2Probability", "Base Scenario — Probability", { default: 50, max: 100, step: 1 }),
      percentField("scenario2ReturnPercent", "Base Scenario — Return", { default: 8, min: -100, max: 1000, step: 0.5 }),
      percentField("scenario3Probability", "Bad Scenario — Probability", { default: 25, max: 100, step: 1 }),
      percentField("scenario3ReturnPercent", "Bad Scenario — Return", { default: -12, min: -100, max: 1000, step: 0.5 }),
    ],
    calcResult: { label: "Expected Return", format: "percentage" },
    calcResults: [
      { key: "expectedReturnPercent", label: "Expected Return", format: "percentage", highlight: true },
      { key: "standardDeviationPercent", label: "Standard Deviation of Outcomes", format: "percentage" },
      { key: "probabilityTotalPercent", label: "Probabilities Entered (Should Be 100%)", format: "percentage" },
    ],
    instructions:
      "Describe three possible outcomes for the coming year — a good case, a base case, and a bad case — with " +
      "the chance of each happening and the return you'd get. The tool weights each return by its probability to " +
      "get the expected return, and shows the standard deviation so you can see how uncertain that estimate is.",
    examples:
      "Example: a 25% chance of +20%, a 50% chance of +8%, and a 25% chance of −12% gives an expected return of " +
      "6%, with a standard deviation of 11.49%.",
    assumptions:
      "Probabilities should add up to 100%. If they don't, the tool scales them to their own total so the result " +
      "still makes sense, and shows the total you entered so you can correct it. The expected return is an " +
      "average across scenarios — not a prediction of what will happen in any single year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the standard deviation matter?",
        answer: "Two investments can have the same expected return but very different ranges of outcomes. A higher standard deviation means the actual result is likely to land further from the expected figure, in either direction.",
      },
    ],
  },
  {
    slug: "required-rate-of-return-calculator",
    title: "Required Rate of Return Calculator",
    description: "Estimate the minimum return a stock should offer, using both the CAPM (risk-free rate, beta, market return) and dividend discount methods.",
    metaTitle: "Required Rate of Return Calculator — Free (CAPM)",
    metaDescription: "Free required rate of return calculator. Estimate the minimum return a stock should offer using CAPM and the dividend discount model.",
    calcInputs: [
      percentField("riskFreeRate", "Risk-Free Rate (e.g. Treasury Yield)", { default: 4.5, max: 20, step: 0.05 }),
      numberField("beta", "Stock Beta", { default: 1.2, min: -3, max: 5, step: 0.05 }),
      percentField("expectedMarketReturn", "Expected Market Return", { default: 10, max: 50, step: 0.1 }),
      currencyField("nextYearDividend", "Expected Dividend Next Year (Per Share)", { default: 2.1, max: 10000, step: 0.01 }),
      currencyField("currentPrice", "Current Share Price", { default: 60, max: 1000000, step: 0.01 }),
      percentField("dividendGrowthRate", "Expected Dividend Growth Rate", { default: 5, min: -50, max: 50, step: 0.1 }),
    ],
    calcResult: { label: "Required Return (CAPM)", format: "percentage" },
    calcResults: [
      { key: "capmRequiredReturnPercent", label: "Required Return — CAPM", format: "percentage", highlight: true },
      { key: "marketRiskPremiumPercent", label: "Market Risk Premium", format: "percentage" },
      { key: "ddmRequiredReturnPercent", label: "Required Return — Dividend Discount Model", format: "percentage" },
    ],
    instructions:
      "For the CAPM method, enter the risk-free rate, the stock's beta (how much it moves compared with the " +
      "market), and the return you expect from the market overall. For the dividend method, enter next year's " +
      "expected dividend per share, today's price, and how fast you expect the dividend to grow. Leave the " +
      "dividend at $0 for a stock that doesn't pay one.",
    examples:
      "Example: with a 4.5% risk-free rate, a beta of 1.2, and a 10% expected market return, CAPM gives an 11.10% " +
      "required return (market risk premium 5.5%). A $2.10 expected dividend on a $60 stock growing 5% a year " +
      "implies 8.50%.",
    assumptions:
      "CAPM: required return = risk-free rate + beta × (market return − risk-free rate). Dividend discount model: " +
      "required return = next dividend ÷ price + dividend growth rate, which assumes the dividend grows at a " +
      "steady rate forever. Both are estimates that depend heavily on your inputs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why do the two methods give different answers?",
        answer: "They measure different things. CAPM asks what return the stock's market risk deserves; the dividend model asks what return today's price implies if the dividend grows as you expect. A big gap can suggest the stock is priced cheaply or expensively relative to its risk — or that one of the inputs is off.",
      },
    ],
  },
  {
    slug: "risk-adjusted-return-calculator",
    title: "Risk-Adjusted Return Calculator",
    description: "Measure an investment's return relative to its risk with the M-squared (M²) return, Sortino ratio, and Treynor ratio.",
    metaTitle: "Risk-Adjusted Return Calculator — M², Sortino, Treynor",
    metaDescription: "Free risk-adjusted return calculator. Get the M-squared return, Sortino ratio, and Treynor ratio from return, volatility, downside risk, and beta.",
    calcInputs: [
      percentField("portfolioReturn", "Portfolio Annual Return", { default: 12, min: -100, max: 200, step: 0.1 }),
      percentField("riskFreeRate", "Risk-Free Rate", { default: 4, max: 20, step: 0.05 }),
      percentField("standardDeviation", "Portfolio Standard Deviation", { default: 15, max: 200, step: 0.1 }),
      percentField("downsideDeviation", "Portfolio Downside Deviation", { default: 9, max: 200, step: 0.1 }),
      numberField("beta", "Portfolio Beta", { default: 1.1, min: -3, max: 5, step: 0.05 }),
      percentField("benchmarkStandardDeviation", "Benchmark Standard Deviation", { default: 12, max: 200, step: 0.1 }),
    ],
    calcResult: { label: "M² Risk-Adjusted Return", format: "percentage" },
    calcResults: [
      { key: "m2ReturnPercent", label: "M² Risk-Adjusted Return", format: "percentage", highlight: true },
      { key: "sharpeRatio", label: "Sharpe Ratio (Used for M²)", format: "number" },
      { key: "sortinoRatio", label: "Sortino Ratio", format: "number" },
      { key: "treynorRatio", label: "Treynor Ratio", format: "number" },
    ],
    instructions:
      "Enter the portfolio's annual return, the risk-free rate, its standard deviation (total volatility), its " +
      "downside deviation (volatility of losing periods only), its beta, and the standard deviation of the " +
      "benchmark you compare it against, such as a broad stock index. All figures should cover the same period.",
    examples:
      "Example: a 12% return with 15% volatility, 9% downside deviation, and a beta of 1.1, against a 4% " +
      "risk-free rate and a benchmark with 12% volatility, gives an M² return of 10.40%, a Sortino ratio of 0.89, " +
      "and a Treynor ratio of 7.27.",
    assumptions:
      "M² = risk-free rate + Sharpe ratio × benchmark standard deviation — the return the portfolio would have " +
      "earned at the benchmark's level of risk, so it can be compared directly with the benchmark's return. " +
      "Sortino = excess return ÷ downside deviation. Treynor = excess return ÷ beta. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which measure should I use?",
        answer: "M² is the easiest to read because it's a percentage you can compare with the benchmark's actual return. Sortino only penalizes downside swings, which suits investors who don't mind upside volatility. Treynor measures return per unit of market risk and suits a portfolio that's one part of a larger, diversified holding.",
      },
      {
        question: "Where's the Sharpe ratio?",
        answer: "It's shown here because M² is built from it, but the separate Sharpe Ratio Calculator covers it in more detail, including converting monthly or daily figures to an annual Sharpe ratio.",
      },
    ],
  },
  {
    slug: "break-even-investment-return-calculator",
    title: "Break-Even Investment Return Calculator",
    description: "Find the return your investments need just to keep up with inflation after fees and taxes — the minimum to avoid losing purchasing power.",
    metaTitle: "Break-Even Investment Return Calculator — Free",
    metaDescription: "Free break-even return calculator. Find the return you need just to keep pace with inflation after investment fees and taxes are taken out.",
    calcInputs: [
      percentField("inflationRate", "Expected Inflation Rate", { default: 3, max: 30, step: 0.1 }),
      percentField("taxRate", "Tax Rate on Investment Returns", { default: 24, max: 60, step: 1 }),
      percentField("annualFee", "Annual Fees (Expense Ratio + Advisory)", { default: 0.75, max: 5, step: 0.05 }),
      percentField("expectedReturn", "Your Expected Return (to Compare)", { default: 6, min: -50, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Break-Even Return", format: "percentage" },
    calcResults: [
      { key: "breakEvenReturnPercent", label: "Break-Even Return Needed", format: "percentage", highlight: true },
      { key: "inflationAfterTaxComponentPercent", label: "Of Which: Inflation, Grossed Up for Tax", format: "percentage" },
      { key: "realReturnAtExpectedPercent", label: "Real Return at Your Expected Return", format: "percentage" },
    ],
    instructions:
      "Enter the inflation rate you expect, the tax rate you pay on investment returns, and your total yearly fees. " +
      "The tool works out the return you'd need before fees and taxes just to stay level with inflation. Enter the " +
      "return you actually expect to see your real, after-everything return at that level.",
    examples:
      "Example: with 3% inflation, a 24% tax rate, and 0.75% in fees, you need a 4.70% return just to break even in " +
      "real terms. At a 6% return, your real after-fee, after-tax return is only 0.96%.",
    assumptions:
      "Assumes fees are deducted before tax and that the whole remaining return is taxed each year at the rate " +
      "entered (as with interest in a taxable account). Tax-advantaged accounts, lower long-term capital gains " +
      "rates, or tax deferral would lower the break-even return. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the break-even return higher than inflation?",
        answer: "Because tax is charged on your whole nominal return, including the part that only makes up for inflation, and fees come off the top as well. With a 24% tax rate, you need about 3.95% before tax just to keep 3% after tax, plus enough extra to cover fees.",
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
