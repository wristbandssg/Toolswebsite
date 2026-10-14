// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// finance expansion 3 sub-batch "financial-analysis". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-financial-analysis.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-financial-analysis-calculators.ts
// or
//   npm run db:create-fin3-financial-analysis-calculators

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


const MICROECONOMICS = { name: "Microeconomics Calculators", slug: "microeconomics-calculators" };

const money = (key: string, label: string, def: number, required = true) => numberField(key, label, { unit: "$", default: def, min: -100000000000000, max: 100000000000000, step: 1, required });
const big = (key: string, label: string, def: number, required = true) => currencyField(key, label, { default: def, max: 100000000000000, step: 1, required });

const TOOLS: ToolDef[] = [
  {
    slug: "cash-flow-to-debt-ratio-calculator",
    category: MICROECONOMICS,
    title: "Cash Flow to Debt Ratio Calculator",
    description: "Calculate the cash flow to debt ratio — how much of its total debt a company could repay each year from operating cash flow — and how many years repayment would take.",
    metaTitle: "Cash Flow to Debt Ratio Calculator — Debt Coverage",
    metaDescription: "Free cash flow to debt ratio calculator. Divide operating cash flow (or free cash flow) by total debt and see the years needed to repay it.",
    calcInputs: [money("operatingCashFlow", "Operating Cash Flow (yearly)", 600000), big("totalDebt", "Total Debt", 2400000), big("capitalExpenditures", "Capital Expenditures (optional, for FCF)", 0, false)],
    calcResult: { label: "Cash Flow to Debt", format: "number" },
    calcResults: [num("cashFlowToDebt", "Cash Flow to Debt Ratio", true), pct("cashFlowToDebtPct", "As a Percentage"), num("freeCashFlowToDebt", "Free Cash Flow to Debt"), num("yearsToRepay", "Years to Repay from Cash Flow")],
    instructions: "Enter a year's operating cash flow and all interest-bearing debt. Add capital spending for the stricter free-cash-flow version.",
    examples: "Example: $600,000 of operating cash flow against $2.4M of debt is a ratio of 0.25 — 25% of the debt could be repaid each year, about 4 years in total.",
    assumptions: "Ratio = operating cash flow ÷ total debt. Credit analysts often see above 0.2–0.3 as comfortable; the inverse is a rough payback period. " + DISCLAIMER,
    faq: [
      { question: "What is a good cash flow to debt ratio?", answer: "Higher is better; around 0.2 or more is usually acceptable, and above 1 means all debt could be repaid within a year." },
      { question: "Why use cash flow instead of earnings?", answer: "Debt is repaid with cash, and cash flow is harder to flatter with accounting choices." },
    ],
  },
  {
    slug: "financial-leverage-ratio-calculator",
    category: MICROECONOMICS,
    title: "Financial Leverage Ratio Calculator",
    description: "Calculate a company's financial leverage ratios — equity multiplier, debt-to-equity, debt-to-EBITDA, debt-to-assets and the degree of financial leverage (DFL).",
    metaTitle: "Financial Leverage Calculator — Equity Multiplier & DFL",
    metaDescription: "Free financial leverage calculator. Get the equity multiplier, debt-to-equity, debt-to-EBITDA, debt-to-assets and degree of financial leverage.",
    calcInputs: [big("totalAssets", "Total Assets", 5000000), money("shareholdersEquity", "Shareholders' Equity", 2000000), big("totalDebt", "Total Debt", 2200000), money("ebitda", "EBITDA", 900000), money("ebit", "EBIT", 700000), big("interestExpense", "Interest Expense", 150000)],
    calcResult: { label: "Equity Multiplier", format: "number" },
    calcResults: [num("equityMultiplier", "Equity Multiplier (assets ÷ equity)", true), num("debtToEquity", "Debt-to-Equity"), num("debtToEbitda", "Debt ÷ EBITDA"), num("degreeOfFinancialLeverage", "Degree of Financial Leverage (DFL)"), pct("debtToAssets", "Debt-to-Assets")],
    instructions: "Enter totals from the balance sheet and income statement. The equity multiplier shows how much of the assets are financed by equity; DFL shows how a change in operating profit is magnified in earnings by fixed interest.",
    examples: "Example: $5M of assets on $2M of equity is an equity multiplier of 2.5. $2.2M of debt is 1.1× equity and 2.44× EBITDA, and with $150,000 of interest the DFL is 1.27 — a 10% EBIT rise lifts pre-tax profit 12.7%.",
    assumptions: "DFL = EBIT ÷ (EBIT − interest). Leverage norms vary widely by industry: utilities and banks run much higher than tech companies. " + DISCLAIMER,
    faq: [
      { question: "What is a good equity multiplier?", answer: "There's no single answer, but around 2 is common; very high values mean heavy reliance on debt." },
      { question: "How does leverage affect ROE?", answer: "More leverage raises ROE when returns exceed borrowing costs and lowers it when they don't — see DuPont analysis." },
    ],
  },
  {
    slug: "fixed-asset-turnover-ratio-calculator",
    category: MICROECONOMICS,
    title: "Fixed Asset Turnover Ratio Calculator",
    description: "Calculate the fixed asset turnover ratio — revenue per dollar of average net property, plant and equipment — to measure how efficiently a company uses its fixed assets.",
    metaTitle: "Fixed Asset Turnover Calculator — Revenue ÷ Net PP&E",
    metaDescription: "Free fixed asset turnover ratio calculator. Divide revenue by average net PP&E to see how much sales each dollar of fixed assets generates.",
    calcInputs: [big("revenue", "Revenue", 9000000), big("netPpeBeginning", "Net PP&E — Start of Year", 2800000), big("netPpeEnd", "Net PP&E — End of Year", 3200000)],
    calcResult: { label: "Fixed Asset Turnover", format: "number" },
    calcResults: [cur("averageNetFixedAssets", "Average Net Fixed Assets"), num("fixedAssetTurnover", "Fixed Asset Turnover", true), pct("ppePctOfRevenue", "Net PP&E as % of Revenue")],
    instructions: "Enter yearly revenue and net property, plant and equipment (after accumulated depreciation) at the start and end of the year.",
    examples: "Example: $9M of revenue on average net PP&E of $3M is a fixed asset turnover of 3.0 — each dollar of fixed assets supports $3 of sales.",
    assumptions: "FAT = revenue ÷ average net PP&E. Old, heavily depreciated assets inflate the ratio; compare within an industry. For all assets, see the Operating Asset Turnover Calculator. " + DISCLAIMER,
    faq: [
      { question: "What is a good fixed asset turnover?", answer: "It depends on the industry — retailers often exceed 5, while utilities and manufacturers may be under 1." },
      { question: "Why might the ratio fall?", answer: "Heavy new investment that hasn't produced sales yet, or falling sales on the same asset base." },
    ],
  },
  {
    slug: "fcfe-calculator",
    category: MICROECONOMICS,
    title: "FCFE Calculator",
    description: "Calculate free cash flow to equity (FCFE), also called levered free cash flow — the cash available to shareholders after reinvestment and debt flows — per share too.",
    metaTitle: "FCFE Calculator — Free Cash Flow to Equity (Levered FCF)",
    metaDescription: "Free FCFE calculator. Compute free cash flow to equity (levered free cash flow) from net income, D&A, capex, working capital and net borrowing.",
    calcInputs: [money("netIncome", "Net Income", 800000), big("depreciationAmortization", "Depreciation & Amortization", 300000), big("capitalExpenditures", "Capital Expenditures", 400000), money("changeInWorkingCapital", "Increase in Net Working Capital", 50000), money("netBorrowing", "Net Borrowing (new debt − repayments)", 100000), numberField("sharesOutstanding", "Shares Outstanding", { default: 1000000, min: 1, max: 100000000000 })],
    calcResult: { label: "FCFE", format: "currency" },
    calcResults: [cur("fcfe", "Free Cash Flow to Equity (Levered FCF)", true), cur("fcfePerShare", "FCFE per Share"), cur("fcfeBeforeBorrowing", "FCFE excluding Net Borrowing")],
    instructions: "Start with net income, add back non-cash depreciation, subtract capital spending and the cash tied up in working capital, then add new borrowing net of repayments.",
    examples: "Example: $800,000 net income + $300,000 D&A − $400,000 capex − $50,000 more working capital + $100,000 net borrowing = $750,000 FCFE, or $0.75 a share.",
    assumptions: "FCFE = NI + D&A − capex − ΔNWC + net borrowing. Discounted at the cost of equity, it values the equity directly; FCFF (unlevered) is discounted at WACC. Borrowing can flatter FCFE in a single year. " + DISCLAIMER,
    faq: [
      { question: "Is levered free cash flow the same as FCFE?", answer: "Essentially yes — both are cash left for shareholders after debt payments." },
      { question: "Why can FCFE be higher than net income?", answer: "Large non-cash charges or new borrowing add to it; heavy capex reduces it." },
    ],
  },
  {
    slug: "fcff-calculator",
    category: MICROECONOMICS,
    title: "FCFF Calculator",
    description: "Calculate free cash flow to the firm (FCFF), also called unlevered free cash flow — the cash available to all investors before debt payments — from EBIT.",
    metaTitle: "FCFF Calculator — Free Cash Flow to Firm (Unlevered FCF)",
    metaDescription: "Free FCFF calculator. Compute free cash flow to the firm (unlevered free cash flow) from EBIT, taxes, D&A, capex and working capital for DCF valuation.",
    calcInputs: [money("ebit", "EBIT (Operating Income)", 1200000), percentField("taxRate", "Tax Rate", { default: 25 }), big("depreciationAmortization", "Depreciation & Amortization", 300000), big("capitalExpenditures", "Capital Expenditures", 400000), money("changeInWorkingCapital", "Increase in Net Working Capital", 50000), big("revenue", "Revenue (optional, for margin)", 0, false)],
    calcResult: { label: "FCFF", format: "currency" },
    calcResults: [cur("nopat", "NOPAT (EBIT × (1 − t))"), cur("fcff", "Free Cash Flow to Firm (Unlevered FCF)", true), cur("reinvestment", "Net Reinvestment"), pct("fcffMargin", "FCFF Margin")],
    instructions: "Enter operating profit, the tax rate, depreciation, capital spending and the increase in working capital. This is the cash flow you discount at WACC in a DCF to get enterprise value.",
    examples: "Example: $1.2M EBIT at 25% tax gives $900,000 NOPAT. Adding $300,000 D&A and subtracting $400,000 capex and $50,000 of working capital leaves $750,000 of FCFF.",
    assumptions: "FCFF = EBIT(1 − t) + D&A − capex − ΔNWC. Equivalent to FCFE + after-tax interest − net borrowing. " + DISCLAIMER,
    faq: [
      { question: "Is unlevered free cash flow the same as FCFF?", answer: "Yes — both measure cash flow before any payments to lenders." },
      { question: "FCFF or FCFE for valuation?", answer: "FCFF with WACC values the whole business and is more stable when debt levels change; FCFE suits banks and stable-leverage firms." },
    ],
  },
  {
    slug: "net-operating-assets-calculator",
    category: MICROECONOMICS,
    title: "Net Operating Assets Calculator",
    description: "Calculate net operating assets (NOA) — operating assets minus operating liabilities — the capital tied up in running the business.",
    metaTitle: "Net Operating Assets Calculator — NOA",
    metaDescription: "Free net operating assets calculator. Subtract cash, investments and debt-free operating liabilities to find NOA from the balance sheet.",
    calcInputs: [big("totalAssets", "Total Assets", 10000000), big("cashAndInvestments", "Cash & Short-Term Investments", 1500000), big("totalLiabilities", "Total Liabilities", 6000000), big("totalDebt", "Interest-Bearing Debt", 3500000)],
    calcResult: { label: "NOA", format: "currency" },
    calcResults: [cur("operatingAssets", "Operating Assets"), cur("operatingLiabilities", "Operating Liabilities"), cur("netOperatingAssets", "Net Operating Assets", true)],
    instructions: "Enter total assets and liabilities, then remove the financial items: cash and investments from assets, and interest-bearing debt from liabilities. What's left is operating.",
    examples: "Example: $10M of assets less $1.5M of cash is $8.5M of operating assets. $6M of liabilities less $3.5M of debt is $2.5M of operating liabilities, so NOA is $6M.",
    assumptions: "NOA = (total assets − cash & investments) − (total liabilities − debt). NOA equals net debt + equity from the financing side. Used in ROIC, residual income and accrual ratios. " + DISCLAIMER,
    faq: [
      { question: "Why separate operating and financial items?", answer: "It isolates the assets that produce operating profit from how they're financed." },
      { question: "Is NOA the same as invested capital?", answer: "Very close — invested capital is NOA calculated from the financing side (debt + equity − cash)." },
    ],
  },
  {
    slug: "net-operating-working-capital-calculator",
    category: MICROECONOMICS,
    title: "Net Operating Working Capital Calculator",
    description: "Calculate net operating working capital (NOWC) — operating current assets minus operating current liabilities, excluding excess cash and short-term debt.",
    metaTitle: "Net Operating Working Capital Calculator — NOWC",
    metaDescription: "Free NOWC calculator. Remove excess cash and short-term debt from working capital to find net operating working capital and its share of revenue.",
    calcInputs: [big("currentAssets", "Current Assets", 2500000), big("excessCash", "Excess Cash & Securities", 400000, false), big("currentLiabilities", "Current Liabilities", 1600000), big("shortTermDebt", "Short-Term Debt & Current Portion of LTD", 500000, false), big("revenue", "Revenue (optional)", 0, false)],
    calcResult: { label: "NOWC", format: "currency" },
    calcResults: [cur("operatingCurrentAssets", "Operating Current Assets"), cur("operatingCurrentLiabilities", "Operating Current Liabilities"), cur("netOperatingWorkingCapital", "Net Operating Working Capital", true), pct("nowcPctOfRevenue", "NOWC as % of Revenue")],
    instructions: "Enter current assets and liabilities, then the cash beyond what operations need and any short-term debt — these are financing items, not operating ones.",
    examples: "Example: $2.5M of current assets less $400,000 of excess cash, minus ($1.6M of current liabilities less $500,000 of short-term debt), gives NOWC of $1M.",
    assumptions: "NOWC = (current assets − excess cash) − (current liabilities − short-term debt). Increases in NOWC are subtracted in free cash flow. For plain working capital, use the Working Capital Calculator. " + DISCLAIMER,
    faq: [
      { question: "How is NOWC different from working capital?", answer: "It excludes excess cash and interest-bearing short-term debt to focus on the operating cycle." },
      { question: "Is lower NOWC better?", answer: "Lower NOWC per dollar of sales means less cash tied up in operations — as long as you can still serve customers." },
    ],
  },
  {
    slug: "working-capital-turnover-ratio-calculator",
    category: MICROECONOMICS,
    title: "Working Capital Turnover Ratio Calculator",
    description: "Calculate the working capital turnover ratio — revenue per dollar of average working capital — and the days of sales tied up in working capital.",
    metaTitle: "Working Capital Turnover Ratio Calculator",
    metaDescription: "Free working capital turnover ratio calculator. Divide revenue by average working capital to measure how efficiently working capital supports sales.",
    calcInputs: [big("revenue", "Revenue (yearly)", 6000000), money("workingCapitalBeginning", "Working Capital — Start of Year", 900000), money("workingCapitalEnd", "Working Capital — End of Year", 1100000)],
    calcResult: { label: "Working Capital Turnover", format: "number" },
    calcResults: [cur("averageWorkingCapital", "Average Working Capital"), num("workingCapitalTurnover", "Working Capital Turnover", true), num("daysOfWorkingCapital", "Days of Sales in Working Capital")],
    instructions: "Enter yearly revenue and working capital (current assets − current liabilities) at the start and end of the year.",
    examples: "Example: $6M of revenue on $1M of average working capital is a turnover of 6 — each dollar of working capital supports $6 of sales, about 61 days' worth.",
    assumptions: "Turnover = revenue ÷ average working capital. Very high values can signal too little working capital (a liquidity risk) rather than efficiency. Not meaningful when working capital is negative. " + DISCLAIMER,
    faq: [
      { question: "What is a good working capital turnover?", answer: "Higher usually means efficient use, but compare with peers — around 4–8 is common for many industries." },
      { question: "Why might it be negative?", answer: "When current liabilities exceed current assets, as for some retailers and restaurants paid in cash before paying suppliers." },
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
