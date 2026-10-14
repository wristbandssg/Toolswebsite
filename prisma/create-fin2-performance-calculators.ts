// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "performance". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-performance.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-performance-calculators.ts
// or
//   npm run db:create-fin2-performance-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


const GENERAL_INVESTMENT = { name: "General Investment Calculators", slug: "general-investment-calculators" };

const RET = (key: string, label: string, def: number) => percentField(key, label, { default: def, min: -100, max: 1000, step: 0.01 });

const TOOLS: ToolDef[] = [
  {
    slug: "discount-rate-calculator",
    category: GENERAL_INVESTMENT,
    title: "Discount Rate Calculator",
    description: "Calculate the discount rate that links a present value and a future value over a number of years, its effective annual rate, and the discount factor.",
    metaTitle: "Discount Rate Calculator — Rate from PV, FV & Years",
    metaDescription: "Free discount rate calculator. Find the rate that turns a present value into a future value, the effective annual rate and the discount factor.",
    calcInputs: [currencyField("presentValue", "Present Value", { default: 10000, max: 100000000000, step: 1 }), currencyField("futureValue", "Future Value", { default: 15000, max: 100000000000, step: 1 }), numberField("years", "Years", { default: 5, min: 0.01, max: 200, step: 0.01 }), dropdown("compoundingPerYear", "Compounding", [["Annually", 1], ["Semi-annually", 2], ["Quarterly", 4], ["Monthly", 12], ["Daily", 365]], 1)],
    calcResult: { label: "Discount Rate", format: "percentage" },
    calcResults: [{ key: "discountRate", label: "Discount Rate (nominal, per year)", format: "percentage", decimals: 4, highlight: true }, { key: "effectiveAnnualRate", label: "Effective Annual Rate", format: "percentage", decimals: 4 }, num("discountFactor", "Discount Factor (PV ÷ FV)", false, 4), num("oneYearDiscountFactor", "One-Year Discount Factor", false, 4)],
    instructions: "Enter what an amount is worth today and what it will be worth in the future, plus the years between. The result is the discount rate (or required return) that makes them equal.",
    examples: "Example: $10,000 today that becomes $15,000 in 5 years implies a discount rate of 8.4472% a year. Each future dollar is worth $0.6667 today, and a dollar one year out is worth $0.9221.",
    assumptions: "r = ((FV ÷ PV)^(1 ÷ (n·m)) − 1) × m. To choose a discount rate for a valuation instead, use the WACC or Cost of Equity calculators. " + DISCLAIMER,
    faq: [
      { question: "What is a discount rate?", answer: "The rate used to convert future money into today's value — your required return or cost of capital." },
      { question: "How is the discount rate different from an interest rate?", answer: "It's the same math in reverse: interest grows money forward, discounting brings future money back to today." },
    ],
  },
  {
    slug: "hedge-ratio-calculator",
    category: GENERAL_INVESTMENT,
    title: "Hedge Ratio Calculator",
    description: "Calculate your hedge ratio (the share of an exposure that's hedged) and the optimal minimum-variance hedge ratio and number of futures contracts to hedge a position.",
    metaTitle: "Hedge Ratio Calculator — Optimal Hedge Ratio & Contracts",
    metaDescription: "Free hedge ratio calculator. Get the hedged share of an exposure, the optimal (minimum variance) hedge ratio ρ·σs/σf and the futures contracts needed.",
    calcInputs: [currencyField("exposureValue", "Value of the Exposure (spot position)", { default: 1000000, max: 100000000000, step: 1000 }), currencyField("hedgedValue", "Value Currently Hedged", { default: 600000, max: 100000000000, step: 1000, required: false }), numberField("correlation", "Correlation (spot vs futures)", { default: 0.9, min: -1, max: 1, step: 0.01 }), percentField("spotVolatility", "Spot Price Volatility", { default: 20, max: 500, step: 0.1 }), percentField("futuresVolatility", "Futures Price Volatility", { default: 22, max: 500, step: 0.1 }), currencyField("futuresPrice", "Futures Price", { default: 5000, max: 100000000, step: 0.01 }), numberField("contractMultiplier", "Contract Size / Multiplier", { default: 50, min: 0.0001, max: 1000000, step: 0.0001 })],
    calcResult: { label: "Optimal Hedge Ratio", format: "number", decimals: 4 },
    calcResults: [pct("hedgeRatio", "Current Hedge Ratio"), cur("unhedgedExposure", "Unhedged Exposure"), num("optimalHedgeRatio", "Optimal Hedge Ratio (h*)", true, 4), num("optimalContracts", "Futures Contracts for Optimal Hedge"), pct("hedgeEffectiveness", "Hedge Effectiveness (ρ²)")],
    instructions: "Enter the position you want to protect and how much is already hedged. For the optimal hedge, enter the correlation and volatilities of the spot asset and the futures (from historical returns), plus the futures price and contract multiplier (e.g. 50 for E-mini S&P 500).",
    examples: "Example: a $1,000,000 portfolio with $600,000 hedged has a 60% hedge ratio. With ρ = 0.9 and volatilities of 20% and 22%, the optimal ratio is 0.818 — about 3 E-mini contracts at 5,000 × $50.",
    assumptions: "h* = ρ × σspot ÷ σfutures (minimum-variance hedge); contracts = h* × exposure ÷ (futures price × multiplier). Basis risk remains unless correlation is 1. For currency exposures there's also an FX Hedge Ratio Calculator. " + DISCLAIMER,
    faq: [
      { question: "What's a hedge ratio of 1?", answer: "The whole exposure is hedged — gains and losses on the position are fully offset if prices move together." },
      { question: "Why not always hedge 100%?", answer: "When the hedge doesn't move exactly with the asset, a 100% hedge can add risk; the optimal ratio minimises variance." },
    ],
  },
  {
    slug: "information-ratio-calculator",
    category: GENERAL_INVESTMENT,
    title: "Information Ratio Calculator",
    description: "Calculate the information ratio of a fund or portfolio — its return above a benchmark divided by tracking error — to judge a manager's skill.",
    metaTitle: "Information Ratio Calculator — vs Tracking Error",
    metaDescription: "Free information ratio calculator. Divide a portfolio's active return over its benchmark by tracking error to measure consistency of outperformance.",
    calcInputs: [RET("portfolioReturn", "Portfolio Return (annual)", 11), RET("benchmarkReturn", "Benchmark Return (annual)", 9), percentField("trackingError", "Tracking Error (annual)", { default: 4, max: 200, step: 0.01 })],
    calcResult: { label: "Information Ratio", format: "number", decimals: 4 },
    calcResults: [pct("activeReturn", "Active Return"), num("informationRatio", "Information Ratio", true, 4)],
    instructions: "Enter the portfolio's and its benchmark's returns over the same period and the tracking error — the standard deviation of the difference between them (fund fact sheets often show it).",
    examples: "Example: an 11% return against a 9% benchmark with 4% tracking error gives an information ratio of 0.5.",
    assumptions: "IR = (Rp − Rb) ÷ tracking error. Use annualised figures for both. " + DISCLAIMER,
    faq: [
      { question: "What is a good information ratio?", answer: "0.4–0.6 is good for active managers; above 1.0 is exceptional and rarely sustained." },
      { question: "How is it different from the Sharpe ratio?", answer: "Sharpe compares return with the risk-free rate and total volatility; the information ratio compares it with a benchmark and tracking error." },
    ],
  },
  {
    slug: "jensens-alpha-calculator",
    category: GENERAL_INVESTMENT,
    title: "Jensen's Alpha Calculator",
    description: "Calculate Jensen's alpha — how much a portfolio returned above (or below) what the CAPM predicts for its beta.",
    metaTitle: "Jensen's Alpha Calculator — Risk-Adjusted Excess Return",
    metaDescription: "Free Jensen's alpha calculator. Compare a portfolio's return with its CAPM expected return from beta, the risk-free rate and the market return.",
    calcInputs: [RET("portfolioReturn", "Portfolio Return", 12), RET("riskFreeRate", "Risk-Free Rate", 4), numberField("beta", "Portfolio Beta", { default: 1.1, min: -5, max: 5, step: 0.01 }), RET("marketReturn", "Market Return", 10)],
    calcResult: { label: "Jensen's Alpha", format: "percentage" },
    calcResults: [pct("capmExpectedReturn", "CAPM Expected Return"), pct("jensensAlpha", "Jensen's Alpha", true), pct("marketRiskPremium", "Market Risk Premium")],
    instructions: "Enter the portfolio's return, the risk-free rate and market return for the same period, and the portfolio's beta.",
    examples: "Example: a portfolio with beta 1.1 returned 12% when the market returned 10% and T-bills 4%. CAPM expected 4% + 1.1 × 6% = 10.6%, so alpha is +1.4%.",
    assumptions: "α = Rp − [Rf + β(Rm − Rf)]. A positive alpha means the manager beat what the portfolio's market risk alone would explain. " + DISCLAIMER,
    faq: [
      { question: "Is positive alpha proof of skill?", answer: "Not on its own — it can be luck, so look at alpha over many years and its statistical significance." },
      { question: "Which market return should I use?", answer: "The index that best matches the portfolio, such as the S&P 500 for US large-cap stocks." },
    ],
  },
  {
    slug: "sortino-ratio-calculator",
    category: GENERAL_INVESTMENT,
    title: "Sortino Ratio Calculator",
    description: "Calculate the Sortino ratio — return above a target per unit of downside deviation — and compare it with the Sharpe ratio.",
    metaTitle: "Sortino Ratio Calculator — Downside Risk-Adjusted Return",
    metaDescription: "Free Sortino ratio calculator. Divide excess return over your target by downside deviation, with the Sharpe ratio for comparison.",
    calcInputs: [RET("portfolioReturn", "Portfolio Return (annual)", 10), RET("targetReturn", "Target / Minimum Acceptable Return (often risk-free)", 4), percentField("downsideDeviation", "Downside Deviation (annual)", { default: 8, max: 500, step: 0.01 }), percentField("standardDeviation", "Standard Deviation (optional, for Sharpe)", { default: 0, max: 500, step: 0.01, required: false })],
    calcResult: { label: "Sortino Ratio", format: "number", decimals: 4 },
    calcResults: [pct("excessReturn", "Return Above Target"), num("sortinoRatio", "Sortino Ratio", true, 4), num("sharpeRatioForComparison", "Sharpe Ratio (if SD entered)", false, 4)],
    instructions: "Enter the annual return, your minimum acceptable return and the downside deviation — the standard deviation of only the returns below that target.",
    examples: "Example: a 10% return, a 4% target and 8% downside deviation give a Sortino ratio of 0.75. If total volatility is 12%, the Sharpe ratio is 0.5 — the fund's volatility is mostly on the upside.",
    assumptions: "Sortino = (Rp − T) ÷ downside deviation. Unlike Sharpe, it doesn't penalise upside volatility. " + DISCLAIMER,
    faq: [
      { question: "What is a good Sortino ratio?", answer: "Above 1 is good and above 2 very good; compare funds over the same period." },
      { question: "Why use Sortino instead of Sharpe?", answer: "Investors mind losses, not gains — Sortino only counts harmful volatility." },
    ],
  },
  {
    slug: "treynor-ratio-calculator",
    category: GENERAL_INVESTMENT,
    title: "Treynor Ratio Calculator",
    description: "Calculate the Treynor ratio — excess return per unit of market risk (beta) — and compare it with the market's own Treynor ratio.",
    metaTitle: "Treynor Ratio Calculator — Return per Unit of Beta",
    metaDescription: "Free Treynor ratio calculator. Divide a portfolio's return above the risk-free rate by its beta, and compare with the market's.",
    calcInputs: [RET("portfolioReturn", "Portfolio Return", 10), RET("riskFreeRate", "Risk-Free Rate", 4), numberField("beta", "Portfolio Beta", { default: 1.2, min: -5, max: 5, step: 0.01 }), RET("marketReturn", "Market Return (optional, for comparison)", 0)],
    calcResult: { label: "Treynor Ratio", format: "number", decimals: 4 },
    calcResults: [pct("excessReturn", "Excess Return"), num("treynorRatio", "Treynor Ratio", true, 4), num("marketTreynor", "Market's Treynor Ratio (beta 1)", false, 4)],
    instructions: "Enter the portfolio's return, the risk-free rate and the portfolio's beta. Add the market return to see the benchmark Treynor ratio (the market risk premium).",
    examples: "Example: a 10% return with a 4% risk-free rate and beta 1.2 gives a Treynor ratio of 5.0. If the market returned 9%, its Treynor ratio is 5.0 too — no better per unit of market risk.",
    assumptions: "Treynor = (Rp − Rf) ÷ β. Best for well-diversified portfolios, where beta captures most of the risk. " + DISCLAIMER,
    faq: [
      { question: "Treynor or Sharpe?", answer: "Treynor uses beta (market risk only) and suits diversified portfolios; Sharpe uses total volatility." },
      { question: "Can the Treynor ratio be negative?", answer: "Yes — if the portfolio returned less than the risk-free rate, or has a negative beta." },
    ],
  },
  {
    slug: "value-at-risk-calculator",
    category: GENERAL_INVESTMENT,
    title: "Value at Risk Calculator",
    description: "Calculate the value at risk (VaR) and expected shortfall of a portfolio for a chosen confidence level and time horizon with the parametric (variance-covariance) method.",
    metaTitle: "Value at Risk Calculator — VaR & Expected Shortfall",
    metaDescription: "Free VaR calculator. Estimate the most a portfolio could lose at 90–99% confidence over a set number of days, plus expected shortfall (CVaR).",
    calcInputs: [currencyField("portfolioValue", "Portfolio Value", { default: 1000000, max: 1000000000000, step: 1000 }), RET("expectedReturn", "Expected Annual Return", 7), percentField("volatility", "Annual Volatility", { default: 18, max: 500, step: 0.1 }), dropdown("confidence", "Confidence Level", [["95%", 95], ["99%", 99], ["97.5%", 97.5], ["90%", 90]], 95), numberField("horizonDays", "Time Horizon (trading days)", { default: 1, min: 1, max: 252 })],
    calcResult: { label: "Value at Risk", format: "currency" },
    calcResults: [cur("valueAtRisk", "Value at Risk (VaR)", true), pct("valueAtRiskPct", "VaR as % of Portfolio"), cur("expectedShortfall", "Expected Shortfall (CVaR)"), pct("horizonVolatility", "Volatility over Horizon")],
    instructions: "Enter the portfolio value, its expected return and annual volatility (standard deviation), the confidence level and how many trading days ahead. A 95% one-day VaR of $18,000 means on 19 days out of 20 you shouldn't lose more than that.",
    examples: "Example: a $1,000,000 portfolio with 18% volatility has a one-day 95% VaR of about $18,374. On the worst 5% of days the average loss (expected shortfall) is about $23,109.",
    assumptions: "Parametric VaR = V × (z·σ·√(t ÷ 252) − μ·t ÷ 252), assuming normally distributed returns. Real returns have fatter tails, so VaR can understate extreme losses — use historical or Monte Carlo VaR for complex portfolios. " + DISCLAIMER,
    faq: [
      { question: "What does 95% VaR mean?", answer: "There's a 5% chance of losing more than the VaR amount over the period." },
      { question: "Why is expected shortfall larger than VaR?", answer: "It's the average loss on the days that are worse than VaR, so it measures how bad the tail is." },
    ],
  },
  {
    slug: "perpetuity-calculator",
    category: GENERAL_INVESTMENT,
    title: "Perpetuity Calculator",
    description: "Calculate the present value of a perpetuity — a payment that continues forever — including a growing perpetuity and payments that start today.",
    metaTitle: "Perpetuity Calculator — Present Value & Growing Perpetuity",
    metaDescription: "Free perpetuity calculator. Find the present value of a level or growing perpetuity (C ÷ (r − g)), with payments at the end or start of each period.",
    calcInputs: [currencyField("payment", "Payment per Period (next payment)", { default: 1000, max: 10000000000, step: 1 }), percentField("discountRate", "Discount Rate per Period", { default: 5, max: 100, step: 0.01 }), percentField("growthRate", "Growth Rate per Period (0 for level)", { default: 0, min: -50, max: 100, step: 0.01, required: false }), dropdown("timing", "First Payment", [["One period from now", 1], ["Today (perpetuity due)", 2]], 1)],
    calcResult: { label: "Present Value", format: "currency" },
    calcResults: [cur("presentValue", "Present Value", true), num("valid", "Valid (1 = discount rate above growth)"), pct("impliedYield", "Payment ÷ Price (current yield)")],
    instructions: "Enter the next payment, the discount rate and, for a growing perpetuity, the growth rate. The growth rate must be below the discount rate or the value is infinite.",
    examples: "Example: $1,000 a year forever at 5% is worth $20,000 today. Growing 2% a year, it's worth $33,333.",
    assumptions: "PV = C ÷ (r − g); a perpetuity due is multiplied by (1 + r). Used for preferred stock, consols, endowments and the terminal value in a DCF. " + DISCLAIMER,
    faq: [
      { question: "Do real perpetuities exist?", answer: "A few — some government consols and preferred shares — and the idea is used for endowments and DCF terminal values." },
      { question: "Why can't growth exceed the discount rate?", answer: "Payments would then grow faster than they're discounted, giving an infinite value." },
    ],
  },
  {
    slug: "pvifa-calculator",
    category: GENERAL_INVESTMENT,
    title: "PVIFA Calculator",
    description: "Calculate the present value interest factor of an annuity (PVIFA) — and the matching future value factor (FVIFA) — for any rate and number of periods.",
    metaTitle: "PVIFA Calculator — Present Value Interest Factor of Annuity",
    metaDescription: "Free PVIFA calculator. Get the present value interest factor of an annuity and FVIFA for any rate and periods, and the value of a payment stream.",
    calcInputs: [percentField("rate", "Interest Rate per Period", { default: 6, max: 100, step: 0.01 }), numberField("periods", "Number of Periods", { default: 10, min: 1, max: 1200 }), dropdown("timing", "Payment Timing", [["End of period (ordinary)", 1], ["Start of period (annuity due)", 2]], 1), currencyField("payment", "Payment per Period (optional)", { default: 0, max: 10000000000, step: 1, required: false })],
    calcResult: { label: "PVIFA", format: "number", decimals: 4 },
    calcResults: [num("pvifa", "PVIFA", true, 4), num("fvifa", "FVIFA", false, 4), cur("presentValueOfPayments", "Present Value of Payments"), cur("futureValueOfPayments", "Future Value of Payments")],
    instructions: "Enter the rate per period and the number of periods (for monthly payments, divide the annual rate by 12 and multiply years by 12). Multiply any payment by PVIFA to get its present value.",
    examples: "Example: at 6% for 10 periods PVIFA is 7.3601 and FVIFA 13.1808. $1,000 a year for 10 years is worth $7,360.09 today and grows to $13,180.79.",
    assumptions: "PVIFA = (1 − (1 + r)^−n) ÷ r; FVIFA = ((1 + r)^n − 1) ÷ r; both × (1 + r) for an annuity due. These are the factors in annuity tables in finance textbooks.",
    faq: [
      { question: "How do I use PVIFA?", answer: "Multiply the payment by PVIFA to get the present value, or divide a loan amount by PVIFA to get the payment." },
      { question: "What's the difference between PVIFA and PVIF?", answer: "PVIF discounts a single future amount; PVIFA discounts a series of equal payments." },
    ],
  },
  {
    slug: "ttm-calculator",
    category: GENERAL_INVESTMENT,
    title: "TTM Calculator",
    description: "Calculate trailing twelve months (TTM) revenue, earnings or any figure from the last four quarters or from annual and year-to-date numbers, plus TTM per share and P/E.",
    metaTitle: "TTM Calculator — Trailing Twelve Months Revenue & EPS",
    metaDescription: "Free TTM calculator. Add the last four quarters, or use last fiscal year + YTD − prior YTD, to get trailing twelve months figures, TTM EPS and P/E.",
    calcInputs: [dropdown("method", "Method", [["Sum of last 4 quarters", 1], ["Fiscal year + this YTD − last YTD", 2]], 1), numberField("quarter1", "Quarter 1 (oldest)", { default: 2400000, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("quarter2", "Quarter 2", { default: 2550000, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("quarter3", "Quarter 3", { default: 2700000, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("quarter4", "Quarter 4 (most recent)", { default: 2900000, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("lastFiscalYear", "Last Full Fiscal Year", { default: 0, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("currentYtd", "This Year to Date", { default: 0, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("priorYtd", "Same Period Last Year", { default: 0, min: -100000000000, max: 100000000000, step: 1, required: false }), numberField("sharesOutstanding", "Shares Outstanding (optional)", { default: 0, max: 100000000000, required: false }), currencyField("sharePrice", "Share Price (optional)", { default: 0, max: 10000000, step: 0.01, required: false })],
    calcResult: { label: "TTM", format: "number" },
    calcResults: [num("ttmValue", "TTM Value", true), num("averagePerQuarter", "Average per Quarter"), num("runRateFromLatestQuarter", "Run Rate (latest quarter × 4)"), cur("ttmPerShare", "TTM per Share (e.g. TTM EPS)"), num("ttmPriceMultiple", "Price ÷ TTM per Share (e.g. TTM P/E)")],
    instructions: "Enter the last four quarters of revenue, net income or any metric, or use the annual-report method: last fiscal year plus this year's year-to-date minus last year's same period. Add shares and price to turn TTM earnings into TTM EPS and P/E.",
    examples: "Example: quarters of $2.40M, $2.55M, $2.70M and $2.90M give TTM revenue of $10.55M, while the latest quarter's run rate is $11.6M.",
    assumptions: "TTM smooths out seasonality and is more current than the last annual report. Run rate assumes the latest quarter repeats, which overstates seasonal businesses in their peak quarter. " + DISCLAIMER,
    faq: [
      { question: "What does TTM mean in finance?", answer: "Trailing twelve months — the most recent 12 months of results, whatever the fiscal year." },
      { question: "Is TTM P/E the same as trailing P/E?", answer: "Yes — the share price divided by the last 12 months of earnings per share." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
