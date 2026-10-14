// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "equity-valuation". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-equity-valuation.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-equity-valuation-calculators.ts
// or
//   npm run db:create-fin2-equity-valuation-calculators

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


// Tool categories follow the 14 Oct 2026 consolidation of the Finance sub-categories
// (see prisma/consolidate-finance-subcategories.ts).
const STOCK_OPTIONS_CATEGORY = { name: "Stock & Options Calculators", slug: "stock-options-calculators" };
const BUSINESS_CATEGORY = { name: "Finance Calculators", slug: "finance-calculators" };

const evFields = (marketCap: number) => [currencyField("marketCap", "Market Capitalization", { default: marketCap, max: 100000000000000, step: 1000 }), currencyField("totalDebt", "Total Debt", { default: 600000000, max: 100000000000000, step: 1000 }), currencyField("preferredAndMinority", "Preferred Stock & Minority Interest", { default: 0, max: 100000000000000, step: 1000, required: false }), currencyField("cash", "Cash & Equivalents", { default: 200000000, max: 100000000000000, step: 1000 })];

const TOOLS: ToolDef[] = [
  {
    slug: "dividend-discount-model-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Dividend Discount Model Calculator",
    description: "Value a stock with the dividend discount model — the Gordon growth model or a two-stage DDM with a high-growth period — and compare the intrinsic value with the share price.",
    metaTitle: "Dividend Discount Model Calculator — Gordon & Two-Stage DDM",
    metaDescription: "Free dividend discount model calculator. Value a stock from its dividend, growth and required return with the Gordon growth or two-stage DDM.",
    calcInputs: [dropdown("model", "Model", [["Gordon growth (single-stage)", 1], ["Two-stage", 2]], 1), currencyField("currentDividend", "Current Annual Dividend per Share (D0)", { default: 2, max: 100000, step: 0.01 }), percentField("requiredReturn", "Required Return (cost of equity)", { default: 9, max: 50, step: 0.1 }), percentField("stableGrowth", "Long-Term Dividend Growth", { default: 4, min: -20, max: 20, step: 0.1 }), percentField("highGrowth", "High Growth Rate (two-stage)", { default: 10, min: -50, max: 100, step: 0.1, required: false }), numberField("highGrowthYears", "High-Growth Years (two-stage)", { default: 5, max: 50, required: false }), currencyField("sharePrice", "Current Share Price (optional)", { default: 0, max: 10000000, step: 0.01, required: false })],
    calcResult: { label: "Intrinsic Value", format: "currency" },
    calcResults: [cur("nextDividend", "Next Year's Dividend"), cur("pvOfHighGrowthDividends", "PV of High-Growth Dividends"), cur("pvOfTerminalValue", "PV of Terminal Value"), cur("intrinsicValue", "Intrinsic Value per Share", true), pct("upsidePct", "Upside vs Share Price"), num("valid", "Valid (1 = required return above growth)")],
    instructions: "Enter this year's dividend, your required return and the growth rate you expect forever. For a company growing faster now, choose two-stage and enter the faster rate and how many years it lasts.",
    examples: "Example: a $2.00 dividend growing 4% a year with a 9% required return is worth $2.08 ÷ (9% − 4%) = $41.60. With 10% growth for 5 years first, the two-stage value is about $53.82.",
    assumptions: "Gordon: V = D0(1 + g) ÷ (r − g). Two-stage: PV of dividends during high growth + PV of a Gordon terminal value at the end. Best for mature, steady dividend payers. " + DISCLAIMER,
    faq: [
      { question: "Can I use the DDM for a company with no dividend?", answer: "No — use a discounted cash flow or earnings-based model instead." },
      { question: "Why is the value so sensitive to growth?", answer: "The denominator r − g is small, so a 1-point change in growth or required return moves the value a lot." },
    ],
  },
  {
    slug: "graham-number-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Graham Number Calculator",
    description: "Calculate the Graham Number — Benjamin Graham's maximum fair price for a defensive stock from EPS and book value per share — and his growth formula value.",
    metaTitle: "Graham Number Calculator — Benjamin Graham Fair Value",
    metaDescription: "Free Graham Number calculator. Get √(22.5 × EPS × BVPS), your margin of safety at today's price, and Graham's revised growth formula value.",
    calcInputs: [numberField("eps", "Earnings per Share (EPS, trailing)", { unit: "$", default: 5, min: -100000, max: 100000, step: 0.01 }), numberField("bookValuePerShare", "Book Value per Share", { unit: "$", default: 30, min: -100000, max: 100000, step: 0.01 }), currencyField("sharePrice", "Share Price (optional)", { default: 0, max: 10000000, step: 0.01, required: false }), percentField("growthRate", "Expected EPS Growth (for Graham formula)", { default: 0, max: 50, step: 0.1, required: false }), percentField("aaaYield", "Current AAA Corporate Bond Yield", { default: 5, max: 30, step: 0.01, required: false })],
    calcResult: { label: "Graham Number", format: "currency" },
    calcResults: [cur("grahamNumber", "Graham Number", true), pct("marginOfSafetyVsGraham", "Margin of Safety at Current Price"), cur("grahamFormulaValue", "Graham Growth Formula Value")],
    instructions: "Enter the last 12 months' EPS and the latest book value per share. Graham's rule was not to pay more than 15× earnings and 1.5× book value, which combine to 22.5. Add expected growth and the AAA bond yield to use his growth formula as well.",
    examples: "Example: EPS of $5 and book value of $30 give a Graham Number of √(22.5 × 5 × 30) = $58.09. With 8% growth and a 5% AAA yield, the growth formula gives $107.80.",
    assumptions: "Graham Number = √(22.5 × EPS × BVPS), only meaningful for positive earnings and book value. Revised formula (1974): V = EPS × (8.5 + 2g) × 4.4 ÷ Y. Doesn't suit fast-growing or asset-light companies. " + DISCLAIMER,
    faq: [
      { question: "Is a stock below its Graham Number a buy?", answer: "It passes Graham's defensive price test, but you still need to check its finances, debt and earnings stability." },
      { question: "Why 22.5?", answer: "It's 15 (maximum P/E) × 1.5 (maximum price-to-book) from The Intelligent Investor." },
    ],
  },
  {
    slug: "margin-of-safety-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Margin of Safety Calculator",
    description: "Calculate the margin of safety for an investment (intrinsic value vs market price) or for a business (actual sales above break-even), and the buy price for a target margin.",
    metaTitle: "Margin of Safety Calculator — Investing & Break-Even",
    metaDescription: "Free margin of safety calculator. Find the discount to intrinsic value and the buy price for your target margin, or sales above break-even for a business.",
    calcInputs: [dropdown("mode", "Type", [["Investing (intrinsic value vs price)", 1], ["Accounting (sales vs break-even)", 2]], 1), currencyField("intrinsicValue", "Intrinsic Value per Share", { default: 120, max: 10000000, step: 0.01, required: false }), currencyField("marketPrice", "Market Price", { default: 90, max: 10000000, step: 0.01, required: false }), percentField("targetMargin", "Target Margin of Safety", { default: 30, step: 1, required: false }), currencyField("actualSales", "Actual or Budgeted Sales", { default: 500000, max: 100000000000, step: 100, required: false }), currencyField("breakEvenSales", "Break-Even Sales", { default: 350000, max: 100000000000, step: 100, required: false }), currencyField("sellingPricePerUnit", "Selling Price per Unit (optional)", { default: 0, max: 10000000, step: 0.01, required: false })],
    calcResult: { label: "Margin of Safety", format: "percentage" },
    calcResults: [pct("marginOfSafety", "Margin of Safety", true), cur("marginOfSafetyAmount", "Margin of Safety ($)"), num("marginOfSafetyUnits", "Margin of Safety (units)"), cur("buyPriceForTarget", "Maximum Buy Price for Target Margin")],
    instructions: "For investing, enter your estimate of intrinsic value and the market price; the target margin gives the most you should pay. For a business, switch the type and enter sales and break-even sales.",
    examples: "Example: a stock worth $120 trading at $90 has a 25% margin of safety; for a 30% margin you'd buy at $84 or less. A business selling $500,000 with break-even at $350,000 has a 30% margin of safety.",
    assumptions: "Investing: (intrinsic value − price) ÷ intrinsic value. Accounting: (sales − break-even sales) ÷ sales. The intrinsic value is only as good as your estimate. " + DISCLAIMER,
    faq: [
      { question: "What margin of safety do value investors want?", answer: "Often 20–50% depending on how certain the valuation is; Graham favoured about a third." },
      { question: "What does margin of safety mean in accounting?", answer: "How far sales can fall before the business starts making a loss." },
    ],
  },
  {
    slug: "peg-ratio-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "PEG Ratio Calculator",
    description: "Calculate the PEG ratio — the P/E ratio divided by expected earnings growth — and the dividend-adjusted PEG, to see whether a stock's price is justified by its growth.",
    metaTitle: "PEG Ratio Calculator — P/E to Growth Ratio",
    metaDescription: "Free PEG ratio calculator. Divide the P/E ratio by EPS growth to compare valuations of growth stocks, with a dividend-adjusted PEG option.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 50, max: 10000000, step: 0.01 }), numberField("eps", "Earnings per Share", { unit: "$", default: 2.5, min: -100000, max: 100000, step: 0.01 }), percentField("epsGrowth", "Expected Annual EPS Growth", { default: 15, min: -100, max: 500, step: 0.1 }), percentField("dividendYield", "Dividend Yield (optional)", { default: 0, max: 50, step: 0.01, required: false })],
    calcResult: { label: "PEG Ratio", format: "number" },
    calcResults: [num("peRatio", "P/E Ratio"), num("pegRatio", "PEG Ratio", true), num("dividendAdjustedPeg", "Dividend-Adjusted PEG")],
    instructions: "Enter the share price, EPS (trailing or next year — be consistent) and the expected yearly EPS growth rate in percent, usually over the next 3–5 years.",
    examples: "Example: a $50 stock earning $2.50 has a P/E of 20. With 15% expected growth its PEG is 1.33 — a little expensive for its growth by Peter Lynch's rule of thumb.",
    assumptions: "PEG = P/E ÷ growth (in whole percent). Dividend-adjusted PEG = P/E ÷ (growth + yield). Growth forecasts are uncertain, and PEG doesn't work for negative or zero growth. " + DISCLAIMER,
    faq: [
      { question: "What is a good PEG ratio?", answer: "Around 1 is often called fairly valued; below 1 may be undervalued relative to growth." },
      { question: "Should I use forward or trailing P/E?", answer: "Either, as long as the growth rate matches; analysts most often use forward P/E with 5-year growth estimates." },
    ],
  },
  {
    slug: "price-to-book-ratio-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Price to Book Ratio Calculator",
    description: "Calculate the price-to-book (P/B) ratio and book value per share, plus price to tangible book value excluding goodwill and intangibles.",
    metaTitle: "Price to Book Ratio Calculator — P/B & Book Value per Share",
    metaDescription: "Free P/B ratio calculator. Divide share price by book value per share, and see price-to-tangible-book after removing goodwill and intangibles.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 45, max: 10000000, step: 0.01 }), numberField("totalEquity", "Total Shareholders' Equity", { unit: "$", default: 900000000, min: -100000000000000, max: 100000000000000, step: 1 }), currencyField("preferredEquity", "Preferred Equity (optional)", { default: 0, max: 100000000000000, step: 1, required: false }), currencyField("intangibles", "Goodwill & Intangibles (optional)", { default: 0, max: 100000000000000, step: 1, required: false }), numberField("sharesOutstanding", "Shares Outstanding", { default: 30000000, min: 1, max: 100000000000 })],
    calcResult: { label: "P/B Ratio", format: "number" },
    calcResults: [cur("bookValuePerShare", "Book Value per Share"), num("priceToBook", "Price-to-Book Ratio", true), cur("tangibleBookPerShare", "Tangible Book Value per Share"), num("priceToTangibleBook", "Price-to-Tangible-Book")],
    instructions: "Enter the share price, total equity from the latest balance sheet and shares outstanding. Subtract preferred equity for common shareholders' book value, and intangibles for tangible book value.",
    examples: "Example: $900M of equity over 30M shares is $30 of book value per share, so a $45 price is a P/B of 1.5.",
    assumptions: "P/B = price ÷ (equity − preferred) per share. Most useful for banks, insurers and asset-heavy companies; less meaningful for software and brands, whose main assets aren't on the balance sheet. " + DISCLAIMER,
    faq: [
      { question: "What is a good P/B ratio?", answer: "Below 1 can signal undervaluation (or trouble); 1–3 is common. Compare within the same industry." },
      { question: "Why do banks use price to tangible book?", answer: "Goodwill from acquisitions can't absorb losses, so tangible book is a stricter measure of value." },
    ],
  },
  {
    slug: "price-to-cash-flow-ratio-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Price to Cash Flow Ratio Calculator",
    description: "Calculate the price-to-cash-flow (P/CF) ratio from operating cash flow per share, plus the price-to-free-cash-flow ratio after capital spending.",
    metaTitle: "Price to Cash Flow Ratio Calculator — P/CF & P/FCF",
    metaDescription: "Free price to cash flow calculator. Divide share price by operating cash flow per share, and by free cash flow per share for P/FCF.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 40, max: 10000000, step: 0.01 }), numberField("operatingCashFlow", "Operating Cash Flow (12 months)", { unit: "$", default: 250000000, min: -100000000000000, max: 100000000000000, step: 1 }), currencyField("capitalExpenditures", "Capital Expenditures (optional)", { default: 0, max: 100000000000000, step: 1, required: false }), numberField("sharesOutstanding", "Shares Outstanding", { default: 50000000, min: 1, max: 100000000000 })],
    calcResult: { label: "P/CF Ratio", format: "number" },
    calcResults: [cur("cashFlowPerShare", "Operating Cash Flow per Share"), num("priceToCashFlow", "Price-to-Cash-Flow", true), cur("freeCashFlowPerShare", "Free Cash Flow per Share"), num("priceToFreeCashFlow", "Price-to-Free-Cash-Flow")],
    instructions: "Enter the share price, the last 12 months' operating cash flow from the cash flow statement and shares outstanding. Add capital expenditures to see price to free cash flow.",
    examples: "Example: $250M of operating cash flow over 50M shares is $5 a share, so a $40 stock trades at 8× cash flow. With $100M of capex, free cash flow is $3 a share and P/FCF is 13.33.",
    assumptions: "P/CF = price ÷ operating cash flow per share. Cash flow is harder to flatter with accounting choices than earnings, which is why some investors prefer it to P/E. " + DISCLAIMER,
    faq: [
      { question: "What is a good price to cash flow ratio?", answer: "Under about 10 is often considered good value, but it varies widely by industry." },
      { question: "P/CF or P/E?", answer: "P/CF avoids non-cash items like depreciation and is useful when earnings are distorted; P/E is more widely quoted." },
    ],
  },
  {
    slug: "price-to-sales-ratio-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Price to Sales Ratio Calculator",
    description: "Calculate the price-to-sales (P/S) ratio — market capitalization divided by revenue — and sales per share.",
    metaTitle: "Price to Sales Ratio Calculator — P/S Ratio",
    metaDescription: "Free price to sales ratio calculator. Divide market cap by the last 12 months' revenue (or price by sales per share) to value companies, even unprofitable ones.",
    calcInputs: [currencyField("sharePrice", "Share Price", { default: 30, max: 10000000, step: 0.01 }), numberField("sharesOutstanding", "Shares Outstanding", { default: 100000000, min: 1, max: 100000000000 }), currencyField("revenue", "Revenue (last 12 months)", { default: 1500000000, max: 100000000000000, step: 1 })],
    calcResult: { label: "P/S Ratio", format: "number" },
    calcResults: [cur("marketCap", "Market Cap"), cur("salesPerShare", "Sales per Share"), num("priceToSales", "Price-to-Sales Ratio", true)],
    instructions: "Enter the share price, shares outstanding and trailing twelve months' revenue.",
    examples: "Example: 100M shares at $30 is a $3B market cap; with $1.5B of revenue the P/S ratio is 2.",
    assumptions: "P/S = market cap ÷ revenue. It works for companies without profits yet, but ignores margins and debt — EV/Sales accounts for debt. " + DISCLAIMER,
    faq: [
      { question: "What is a good P/S ratio?", answer: "Between 1 and 2 is often seen as reasonable; high-margin software companies trade much higher." },
      { question: "Why use P/S instead of P/E?", answer: "For young or cyclical companies with low or negative earnings, sales give a steadier base." },
    ],
  },
  {
    slug: "ebitda-multiple-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "EBITDA Multiple Calculator",
    description: "Calculate a company's EV/EBITDA multiple from market cap, debt and cash, and the implied enterprise and equity value at a target multiple.",
    metaTitle: "EBITDA Multiple Calculator — EV/EBITDA & Implied Value",
    metaDescription: "Free EBITDA multiple calculator. Get enterprise value and EV/EBITDA, and value a business at a target multiple of EBITDA.",
    calcInputs: [...evFields(2000000000), numberField("ebitda", "EBITDA (last 12 months)", { unit: "$", default: 300000000, min: -100000000000000, max: 100000000000000, step: 1 }), numberField("targetMultiple", "Target EV/EBITDA Multiple (optional)", { default: 0, max: 200, step: 0.1, required: false })],
    calcResult: { label: "EV/EBITDA", format: "number" },
    calcResults: [cur("enterpriseValue", "Enterprise Value"), num("evToEbitda", "EV/EBITDA Multiple", true), cur("impliedEnterpriseValue", "Implied EV at Target Multiple"), cur("impliedEquityValue", "Implied Equity Value at Target")],
    instructions: "Enter the market cap, total debt, preferred stock and minority interest, and cash to get enterprise value, then EBITDA. Add a target multiple from comparable companies or deals to value the business.",
    examples: "Example: a $2B market cap plus $600M of debt minus $200M of cash is a $2.4B enterprise value — 8× $300M of EBITDA. At a 10× multiple, equity would be worth $2.6B.",
    assumptions: "EV = market cap + debt + preferred + minority interest − cash. Multiples differ greatly by industry and growth. " + DISCLAIMER,
    faq: [
      { question: "What is a good EV/EBITDA multiple?", answer: "Under 10 is often seen as reasonable for mature companies; fast growers trade higher." },
      { question: "Why use EV/EBITDA instead of P/E?", answer: "It's unaffected by capital structure, tax and depreciation choices, so it compares companies with different debt levels." },
    ],
  },
  {
    slug: "ev-to-sales-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "EV to Sales Calculator",
    description: "Calculate the EV/Sales (enterprise value to sales) multiple, compare it with the price-to-sales ratio, and value a company at a target EV/Sales multiple.",
    metaTitle: "EV to Sales Calculator — Enterprise Value to Revenue",
    metaDescription: "Free EV to sales calculator. Get enterprise value and the EV/Sales multiple, compare with P/S, and find the implied equity value at a target multiple.",
    calcInputs: [...evFields(2000000000), currencyField("revenue", "Revenue (last 12 months)", { default: 1200000000, max: 100000000000000, step: 1 }), numberField("targetMultiple", "Target EV/Sales Multiple (optional)", { default: 0, max: 200, step: 0.1, required: false })],
    calcResult: { label: "EV/Sales", format: "number" },
    calcResults: [cur("enterpriseValue", "Enterprise Value"), num("evToSales", "EV/Sales Multiple", true), num("priceToSales", "Price-to-Sales (for comparison)"), cur("impliedEquityValue", "Implied Equity Value at Target")],
    instructions: "Enter the components of enterprise value and trailing twelve months' revenue. Add a target multiple from comparable companies to value the equity.",
    examples: "Example: a $2.4B enterprise value on $1.2B of revenue is an EV/Sales of 2.0, versus a P/S of 1.67 — the gap is the company's $400M of net debt.",
    assumptions: "EV/Sales = (market cap + debt + preferred + minority − cash) ÷ revenue. Better than P/S for comparing companies with different amounts of debt. " + DISCLAIMER,
    faq: [
      { question: "What's a good EV/Sales ratio?", answer: "1–3 is common for mature companies; SaaS companies often trade at 5–10× or more." },
      { question: "Why can EV/Sales be lower than P/S?", answer: "When a company holds more cash than debt, enterprise value is below its market cap." },
    ],
  },
  {
    slug: "year-over-year-growth-calculator",
    category: BUSINESS_CATEGORY,
    title: "Year Over Year Growth Calculator",
    description: "Calculate year-over-year (YoY) growth — or quarter-over-quarter, month-over-month and week-over-week — for revenue, EPS, traffic or any metric, and its annualised rate.",
    metaTitle: "Year Over Year Growth Calculator — YoY, QoQ, MoM, WoW",
    metaDescription: "Free YoY growth calculator. Get the percentage change between two periods — year, quarter, month or week over week — and the annualised growth rate.",
    calcInputs: [numberField("currentValue", "Current Period Value", { default: 125000, min: -1000000000000, max: 1000000000000, step: 0.01 }), numberField("previousValue", "Previous Period Value", { default: 100000, min: -1000000000000, max: 1000000000000, step: 0.01 }), dropdown("periodType", "Comparison", [["Year over year (YoY)", 1], ["Quarter over quarter (QoQ)", 2], ["Month over month (MoM)", 3], ["Week over week (WoW)", 4], ["Day over day", 5]], 1)],
    calcResult: { label: "Growth", format: "percentage" },
    calcResults: [num("change", "Change"), pct("growthRate", "Growth Rate", true), pct("annualizedGrowth", "Annualised Growth Rate")],
    instructions: "Enter the value for the current period and the same metric for the period you're comparing with — for YoY, the same month or quarter last year so seasonality cancels out.",
    examples: "Example: revenue of $125,000 against $100,000 a year earlier is 25% YoY growth. If that 25% were month-over-month, it would compound to over 1,355% a year.",
    assumptions: "Growth = (current − previous) ÷ |previous|. Annualised growth compounds the period rate: (1 + g)^periods per year − 1. For growth over several years, use the CAGR calculator.",
    faq: [
      { question: "Why compare year over year instead of month to month?", answer: "YoY removes seasonal swings — December sales are compared with last December, not with November." },
      { question: "How do I calculate EPS growth?", answer: "Enter this year's EPS and last year's EPS — the growth rate is the EPS growth." },
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
