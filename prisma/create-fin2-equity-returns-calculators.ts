// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// finance expansion 2 sub-batch "equity-returns". See
// src/lib/calc-engine-fin2-investing.ts for the full list of 9 sub-batches,
// and src/lib/calc-engine-fin2-equity-returns.ts for the math. Each tool is filed in
// the Finance Calculators sub-category the user named for it (created on
// first run).
//
// HOW TO RUN
//   npx tsx prisma/create-fin2-equity-returns-calculators.ts
// or
//   npm run db:create-fin2-equity-returns-calculators

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

const money = (key: string, label: string, def: number, required = true) => numberField(key, label, { unit: "$", default: def, min: -100000000000000, max: 100000000000000, step: 1, required });

const TOOLS: ToolDef[] = [
  {
    slug: "dividend-payout-ratio-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Dividend Payout Ratio Calculator",
    description: "Calculate the dividend payout ratio and retention ratio from dividends and earnings per share, plus the payout as a share of free cash flow.",
    metaTitle: "Dividend Payout Ratio Calculator — Payout & Retention Ratio",
    metaDescription: "Free dividend payout ratio calculator. Divide dividends per share by EPS to get the payout ratio, the retention (plowback) ratio and the FCF payout ratio.",
    calcInputs: [currencyField("dividendsPerShare", "Dividends per Share (annual)", { default: 1.2, max: 100000, step: 0.01 }), numberField("eps", "Earnings per Share", { unit: "$", default: 4, min: -100000, max: 100000, step: 0.01 }), numberField("freeCashFlowPerShare", "Free Cash Flow per Share (optional)", { unit: "$", default: 0, min: -100000, max: 100000, step: 0.01, required: false })],
    calcResult: { label: "Payout Ratio", format: "percentage" },
    calcResults: [pct("payoutRatio", "Dividend Payout Ratio", true), pct("retentionRatio", "Retention (Plowback) Ratio"), cur("retainedPerShare", "Earnings Retained per Share"), pct("fcfPayoutRatio", "Payout as % of Free Cash Flow")],
    instructions: "Enter yearly dividends and earnings per share (or total dividends and net income — the ratio is the same). The retention ratio is the share of profit reinvested in the business.",
    examples: "Example: a company earning $4.00 a share and paying $1.20 in dividends has a 30% payout ratio and retains 70% of its earnings.",
    assumptions: "Payout = dividends ÷ earnings; retention = 1 − payout. A payout above 100% means the dividend isn't covered by earnings. " + DISCLAIMER,
    faq: [
      { question: "What is a safe dividend payout ratio?", answer: "Generally below 60% for most companies; REITs and utilities commonly pay out more because of their structure." },
      { question: "What does the retention ratio tell you?", answer: "How much profit is reinvested for growth — multiplied by ROE it gives the sustainable growth rate." },
    ],
  },
  {
    slug: "dupont-analysis-calculator",
    category: BUSINESS_CATEGORY,
    title: "DuPont Analysis Calculator",
    description: "Break down return on equity with DuPont analysis — 3-step (profit margin × asset turnover × equity multiplier) and 5-step (tax burden, interest burden, EBIT margin).",
    metaTitle: "DuPont Analysis Calculator — 3-Step & 5-Step ROE",
    metaDescription: "Free DuPont analysis calculator. Split ROE into profit margin, asset turnover and leverage, plus the 5-step tax burden, interest burden and EBIT margin.",
    calcInputs: [money("netIncome", "Net Income", 120000), currencyField("revenue", "Revenue", { default: 1500000, max: 100000000000000, step: 1 }), currencyField("totalAssets", "Total Assets (average)", { default: 1000000, max: 100000000000000, step: 1 }), money("shareholdersEquity", "Shareholders' Equity (average)", 600000), money("ebt", "Earnings Before Tax (for 5-step)", 160000, false), money("ebit", "EBIT (for 5-step)", 180000, false)],
    calcResult: { label: "ROE", format: "percentage" },
    calcResults: [pct("netProfitMargin", "Net Profit Margin"), num("assetTurnover", "Asset Turnover", false, 4), num("equityMultiplier", "Equity Multiplier", false, 4), pct("roe", "Return on Equity (ROE)", true), num("taxBurden", "Tax Burden (NI ÷ EBT)", false, 4), num("interestBurden", "Interest Burden (EBT ÷ EBIT)", false, 4), pct("ebitMargin", "EBIT Margin")],
    instructions: "Enter figures from the income statement and balance sheet (averages of the opening and closing balance sheets are best). The breakdown shows whether ROE comes from profitability, efficiency or leverage.",
    examples: "Example: an 8% net margin × 1.5 asset turnover × 1.67 equity multiplier = 20% ROE. The 5-step view adds a 0.75 tax burden, 0.89 interest burden and 12% EBIT margin.",
    assumptions: "ROE = (NI ÷ sales) × (sales ÷ assets) × (assets ÷ equity) = tax burden × interest burden × EBIT margin × asset turnover × equity multiplier. " + DISCLAIMER,
    faq: [
      { question: "Why use DuPont analysis?", answer: "Two companies with the same ROE can get there very differently — one through high margins, another through heavy debt." },
      { question: "Is a high equity multiplier bad?", answer: "It means more debt, which boosts ROE but raises risk." },
    ],
  },
  {
    slug: "economic-value-added-calculator",
    category: BUSINESS_CATEGORY,
    title: "Economic Value Added Calculator",
    description: "Calculate economic value added (EVA) — NOPAT minus a charge for all the capital invested — plus ROIC and the spread over the cost of capital.",
    metaTitle: "Economic Value Added Calculator — EVA",
    metaDescription: "Free EVA calculator. Subtract the capital charge (WACC × invested capital) from NOPAT to see whether a business earns more than its cost of capital.",
    calcInputs: [money("nopat", "NOPAT", 900000), currencyField("investedCapital", "Invested Capital (debt + equity − cash)", { default: 7000000, max: 100000000000000, step: 1 }), percentField("wacc", "WACC", { default: 9, max: 50, step: 0.01 })],
    calcResult: { label: "EVA", format: "currency" },
    calcResults: [cur("capitalCharge", "Capital Charge (WACC × capital)"), cur("eva", "Economic Value Added (EVA)", true), pct("roic", "ROIC"), pct("spread", "ROIC − WACC Spread")],
    instructions: "Enter net operating profit after tax (use the NOPAT Calculator), the capital invested in the business and the weighted average cost of capital.",
    examples: "Example: $900,000 NOPAT on $7M of capital at a 9% WACC: the capital charge is $630,000, so EVA is $270,000 — a 12.86% ROIC, 3.86 points above WACC.",
    assumptions: "EVA = NOPAT − WACC × invested capital (Stern Stewart). Full EVA practice adjusts accounts (e.g. capitalising R&D); this uses the figures as entered. " + DISCLAIMER,
    faq: [
      { question: "Can a profitable company have negative EVA?", answer: "Yes — if its profit doesn't cover the return investors could earn elsewhere at similar risk." },
      { question: "How is EVA different from MVA?", answer: "EVA is one year's economic profit; MVA is the market's verdict on all future EVA combined." },
    ],
  },
  {
    slug: "market-value-added-calculator",
    category: BUSINESS_CATEGORY,
    title: "MVA Calculator",
    description: "Calculate market value added (MVA) — how much value a company has created for investors above the capital they put in — and its market-to-book ratio.",
    metaTitle: "MVA Calculator — Market Value Added",
    metaDescription: "Free market value added calculator. Subtract capital invested (book equity and debt) from the market value of the company to measure value created.",
    calcInputs: [numberField("sharesOutstanding", "Shares Outstanding", { default: 50000000, min: 1, max: 100000000000 }), currencyField("sharePrice", "Share Price", { default: 40, max: 10000000, step: 0.01 }), money("bookEquity", "Book Value of Equity (capital invested)", 1200000000), currencyField("debtMarketValue", "Debt — Market Value (optional)", { default: 0, max: 100000000000000, step: 1, required: false }), currencyField("debtBookValue", "Debt — Book Value (optional)", { default: 0, max: 100000000000000, step: 1, required: false })],
    calcResult: { label: "MVA", format: "currency" },
    calcResults: [cur("marketValueOfFirm", "Market Value of the Firm"), cur("capitalInvested", "Capital Invested"), cur("mva", "Market Value Added (MVA)", true), num("marketToBook", "Market-to-Book (equity)")],
    instructions: "Enter shares and price for the equity's market value, and book equity for the capital shareholders have invested (including retained earnings). Add debt at market and book value to measure value for all investors.",
    examples: "Example: 50M shares at $40 is $2B of market value against $1.2B of book equity — an MVA of $800M and a market-to-book of 1.67.",
    assumptions: "MVA = (market value of equity + debt) − (book equity + debt). With debt at book value on both sides, MVA = market cap − book equity. " + DISCLAIMER,
    faq: [
      { question: "What does a negative MVA mean?", answer: "The market values the company below the capital invested in it — value has been destroyed." },
      { question: "Is MVA the same as market-to-book?", answer: "They use the same inputs; MVA is the dollar difference and market-to-book is the ratio." },
    ],
  },
  {
    slug: "residual-income-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Residual Income Calculator",
    description: "Calculate residual income — net income minus a charge for the cost of equity — and value a stock with the residual income model.",
    metaTitle: "Residual Income Calculator — RI Valuation Model",
    metaDescription: "Free residual income calculator. Find net income above the equity charge and the residual income model value: book value plus the PV of future residual income.",
    calcInputs: [money("netIncome", "Net Income (next year)", 15000000), currencyField("bookEquity", "Book Value of Equity (start of year)", { default: 100000000, max: 100000000000000, step: 1 }), percentField("costOfEquity", "Cost of Equity", { default: 10, max: 50, step: 0.1 }), percentField("residualIncomeGrowth", "Residual Income Growth (after next year)", { default: 2, min: -50, max: 20, step: 0.1 }), numberField("sharesOutstanding", "Shares Outstanding (optional)", { default: 10000000, max: 100000000000, required: false })],
    calcResult: { label: "Value per Share", format: "currency" },
    calcResults: [cur("equityCharge", "Equity Charge (r × book value)"), cur("residualIncome", "Residual Income", true), pct("roe", "Return on Equity"), cur("intrinsicValue", "Residual Income Model Value"), cur("valuePerShare", "Value per Share")],
    instructions: "Enter next year's expected net income, current book equity, the cost of equity and how fast residual income grows afterwards (0% for no growth, negative if it fades).",
    examples: "Example: $15M of income on $100M of equity at a 10% cost of equity leaves $5M of residual income. Growing 2% a year, the model values the equity at $163.75M — $16.38 a share.",
    assumptions: "RI = NI − r × BV. Value = BV0 + RI1 × (1 + g) ÷ (r − g), a single-stage form of the residual income model. " + DISCLAIMER,
    faq: [
      { question: "Why use residual income instead of dividends?", answer: "It works for companies that pay no dividends and relies more on the balance sheet, so less of the value sits in the far future." },
      { question: "What does negative residual income mean?", answer: "The company earns less than its cost of equity — it should trade below book value." },
    ],
  },
  {
    slug: "roic-calculator",
    category: BUSINESS_CATEGORY,
    title: "ROIC Calculator",
    description: "Calculate return on invested capital (ROIC) — NOPAT divided by debt plus equity minus cash — and the spread over your cost of capital.",
    metaTitle: "ROIC Calculator — Return on Invested Capital",
    metaDescription: "Free ROIC calculator. Divide NOPAT (EBIT × (1 − tax)) by invested capital to measure how well a company turns capital into profit, versus WACC.",
    calcInputs: [money("ebit", "EBIT (Operating Income)", 2000000), percentField("taxRate", "Tax Rate", { default: 25 }), currencyField("totalDebt", "Total Debt", { default: 4000000, max: 100000000000000, step: 1 }), money("totalEquity", "Shareholders' Equity", 8000000), currencyField("cash", "Cash & Equivalents", { default: 1000000, max: 100000000000000, step: 1, required: false }), percentField("wacc", "WACC (optional)", { default: 0, max: 50, step: 0.1, required: false })],
    calcResult: { label: "ROIC", format: "percentage" },
    calcResults: [cur("nopat", "NOPAT"), cur("investedCapital", "Invested Capital"), pct("roic", "Return on Invested Capital", true), pct("spreadOverWacc", "Spread over WACC")],
    instructions: "Enter operating income, the tax rate and the balance sheet's debt, equity and cash. Compare ROIC with WACC: a company creates value only when ROIC is higher.",
    examples: "Example: $2M EBIT taxed at 25% gives $1.5M NOPAT. Invested capital is $4M + $8M − $1M = $11M, so ROIC is 13.64%.",
    assumptions: "ROIC = EBIT × (1 − t) ÷ (debt + equity − cash). Use average invested capital for a fairer picture when it changes a lot during the year. " + DISCLAIMER,
    faq: [
      { question: "What is a good ROIC?", answer: "Above the cost of capital — usually 8–10% — and consistently above 15% is a sign of a strong business." },
      { question: "ROIC vs ROE?", answer: "ROE can be boosted by debt; ROIC measures returns on all capital regardless of how it's financed." },
    ],
  },
  {
    slug: "sustainable-growth-rate-calculator",
    category: BUSINESS_CATEGORY,
    title: "Sustainable Growth Rate Calculator",
    description: "Calculate a company's sustainable growth rate (SGR) — how fast it can grow without new equity or more leverage — and the internal growth rate.",
    metaTitle: "Sustainable Growth Rate Calculator — SGR = ROE × b",
    metaDescription: "Free sustainable growth rate calculator. Multiply ROE by the retention ratio for SGR, and find the internal growth rate from ROA.",
    calcInputs: [percentField("roe", "Return on Equity", { default: 15, min: -100, max: 200, step: 0.1 }), percentField("payoutRatio", "Dividend Payout Ratio", { default: 40, max: 200, step: 0.1 }), percentField("roa", "Return on Assets (optional)", { default: 0, min: -100, max: 100, step: 0.1, required: false })],
    calcResult: { label: "Sustainable Growth Rate", format: "percentage" },
    calcResults: [pct("retentionRatio", "Retention Ratio"), pct("sustainableGrowthRate", "Sustainable Growth Rate", true), pct("internalGrowthRate", "Internal Growth Rate (no new debt)")],
    instructions: "Enter return on equity and the share of earnings paid as dividends. Add return on assets to see the internal growth rate — how fast the company can grow with no outside financing at all.",
    examples: "Example: a 15% ROE and a 40% payout ratio give a sustainable growth rate of 15% × 60% = 9% a year.",
    assumptions: "SGR = ROE × (1 − payout), holding leverage, margins and asset turnover constant. Internal growth = ROA·b ÷ (1 − ROA·b). " + DISCLAIMER,
    faq: [
      { question: "What if a company grows faster than its SGR?", answer: "It must borrow more, issue shares or improve margins and efficiency." },
      { question: "Why does a higher payout lower SGR?", answer: "Less profit is reinvested, so equity grows more slowly." },
    ],
  },
  {
    slug: "portfolio-beta-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Portfolio Beta Calculator",
    description: "Calculate the beta of your stock portfolio as the value-weighted average of each holding's beta, and its CAPM expected return.",
    metaTitle: "Portfolio Beta Calculator — Weighted Average Beta",
    metaDescription: "Free portfolio beta calculator. Enter up to 8 holdings with their value and beta to get your portfolio's weighted beta and CAPM expected return.",
    calcInputs: [...Array.from({ length: 8 }, (_, i) => [
      currencyField(`value${i + 1}`, `Holding ${i + 1} — Value`, { default: [40000, 30000, 20000, 10000, 0, 0, 0, 0][i], max: 100000000000, step: 1, required: false }),
      numberField(`beta${i + 1}`, `Holding ${i + 1} — Beta`, { default: [1.2, 0.9, 1.5, 0.3, 0, 0, 0, 0][i], min: -5, max: 5, step: 0.01, required: false }),
    ]).flat(), percentField("riskFreeRate", "Risk-Free Rate", { default: 4, max: 30, step: 0.01 }), percentField("marketReturn", "Expected Market Return", { default: 10, min: -50, max: 50, step: 0.1 })],
    calcResult: { label: "Portfolio Beta", format: "number", decimals: 4 },
    calcResults: [cur("portfolioValue", "Portfolio Value"), num("portfolioBeta", "Portfolio Beta", true, 4), pct("capmExpectedReturn", "CAPM Expected Return"), pct("marketDropImpact", "Expected Move if the Market Falls 10%")],
    instructions: "Enter the value and beta of each holding (betas are on most quote pages). Bonds and cash have betas near 0.",
    examples: "Example: $40,000 at beta 1.2, $30,000 at 0.9, $20,000 at 1.5 and $10,000 at 0.3 give a portfolio beta of 1.08 — if the market falls 10%, expect about −10.8%. CAPM expects 10.48% a year.",
    assumptions: "Portfolio beta = Σ (weight × beta). Betas are estimated from past returns and change over time. " + DISCLAIMER,
    faq: [
      { question: "What is a good portfolio beta?", answer: "It depends on your risk tolerance: below 1 is more defensive than the market, above 1 more aggressive." },
      { question: "How can I lower my portfolio beta?", answer: "Add low-beta stocks, bonds or cash, or hedge with index futures or puts." },
    ],
  },
  {
    slug: "unlevered-beta-calculator",
    category: STOCK_OPTIONS_CATEGORY,
    title: "Unlevered Beta Calculator",
    description: "Calculate unlevered (asset) beta from a stock's levered beta, debt-to-equity and tax rate with the Hamada equation, and re-lever it to a target capital structure.",
    metaTitle: "Unlevered Beta Calculator — Hamada Asset Beta",
    metaDescription: "Free unlevered beta calculator. Strip out financial leverage with βu = βL ÷ (1 + (1 − t)D/E) and re-lever beta for a target debt-to-equity ratio.",
    calcInputs: [numberField("leveredBeta", "Levered (Equity) Beta", { default: 1.3, min: -5, max: 10, step: 0.01 }), currencyField("totalDebt", "Total Debt", { default: 400, max: 100000000000000, step: 1 }), currencyField("equityValue", "Market Value of Equity", { default: 1000, max: 100000000000000, step: 1 }), percentField("taxRate", "Tax Rate", { default: 25 }), percentField("targetDebtToEquity", "Target D/E to Re-Lever (optional, %)", { default: 0, max: 1000, step: 1, required: false })],
    calcResult: { label: "Unlevered Beta", format: "number", decimals: 4 },
    calcResults: [pct("debtToEquity", "Debt-to-Equity"), num("unleveredBeta", "Unlevered (Asset) Beta", true, 4), num("releveredBeta", "Re-Levered Beta at Target D/E", false, 4)],
    instructions: "Enter a company's equity beta, its debt and equity (in any consistent units) and the tax rate. Analysts unlever comparable companies' betas, average them, then re-lever at the target company's own capital structure.",
    examples: "Example: a levered beta of 1.3 with D/E of 40% and a 25% tax rate unlevers to 1.0. At a 60% D/E it re-levers to 1.45.",
    assumptions: "Hamada: βu = βL ÷ (1 + (1 − t) × D/E), assuming debt has a beta of zero. " + DISCLAIMER,
    faq: [
      { question: "Why unlever beta?", answer: "To compare business risk across companies with different amounts of debt, or to value a private company using public comparables." },
      { question: "Is unlevered beta always lower?", answer: "Yes, for a company with debt — leverage magnifies equity risk." },
    ],
  },
  {
    slug: "operating-cash-flow-ratio-calculator",
    category: BUSINESS_CATEGORY,
    title: "Operating Cash Flow Ratio Calculator",
    description: "Calculate the operating cash flow ratio — whether cash from operations covers current liabilities — plus the operating cash flow margin and cash conversion of earnings.",
    metaTitle: "Operating Cash Flow Ratio Calculator — OCF Ratio",
    metaDescription: "Free operating cash flow ratio calculator. Divide operating cash flow by current liabilities, and see OCF margin and cash flow to net income.",
    calcInputs: [money("operatingCashFlow", "Operating Cash Flow", 450000), currencyField("currentLiabilities", "Current Liabilities", { default: 300000, max: 100000000000000, step: 1 }), currencyField("revenue", "Revenue (optional)", { default: 0, max: 100000000000000, step: 1, required: false }), money("netIncome", "Net Income (optional)", 0, false)],
    calcResult: { label: "OCF Ratio", format: "number" },
    calcResults: [num("operatingCashFlowRatio", "Operating Cash Flow Ratio", true), pct("ocfMargin", "Operating Cash Flow Margin"), num("cashFlowToNetIncome", "Operating Cash Flow ÷ Net Income")],
    instructions: "Enter cash flow from operations (cash flow statement) and current liabilities (balance sheet). Add revenue and net income for the margin and earnings-quality ratios.",
    examples: "Example: $450,000 of operating cash flow against $300,000 of current liabilities is a ratio of 1.5 — operations generate enough cash to pay short-term obligations 1.5 times over.",
    assumptions: "OCF ratio = operating cash flow ÷ current liabilities. Cash flow ÷ net income above 1 suggests high-quality earnings backed by cash. " + DISCLAIMER,
    faq: [
      { question: "What is a good operating cash flow ratio?", answer: "Above 1 means short-term liabilities are covered by operating cash; below 1 may signal liquidity pressure." },
      { question: "How is it different from the current ratio?", answer: "The current ratio uses balance-sheet assets; the OCF ratio uses cash actually generated in the period." },
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
