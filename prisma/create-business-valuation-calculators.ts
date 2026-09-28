// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Business Finance Calculators" sub-batch J (Valuation, Earnings & Coverage). Part of
// the Business Finance tool-list build-out: 108 tools in the source list, 17
// skipped as duplicates (9 in create-finance-business-calculators.ts, 8
// business-loan tools in create-loan-business-student-calculators.ts), 91
// built across 11 sub-batches — all under Finance Calculators > Business
// Finance Calculators except create-business-loans-calculators.ts (Loan
// Calculators):
//   create-business-profit-calculators.ts (10 tools)
//   create-business-breakeven-margin-calculators.ts (8 tools)
//   create-business-pricing-calculators.ts (7 tools)
//   create-business-revenue-calculators.ts (11 tools)
//   create-business-costs-calculators.ts (7 tools)
//   create-business-unit-returns-calculators.ts (9 tools)
//   create-business-liquidity-cash-calculators.ts (12 tools)
//   create-business-loans-calculators.ts (4 tools)
//   create-business-inventory-receivables-calculators.ts (9 tools)
//   create-business-valuation-calculators.ts (8 tools)
//   create-business-growth-variance-calculators.ts (6 tools)
//
// See src/lib/calc-engine-business-valuation.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-valuation-calculators.ts
// or
//   npm run db:create-business-valuation-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "business-finance-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, accounting, tax " +
  "or legal advice. Results depend on the figures you enter — check them against your own accounts, or ask an " +
  "accountant or financial adviser before making business decisions.";

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
    slug: "business-valuation-calculator",
    title: "Business Valuation Calculator",
    description: "Estimate what a small business is worth using an earnings multiple and a revenue multiple, then the equity value to the owners after debt.",
    metaTitle: "Business Valuation Calculator — Multiples Method",
    metaDescription: "Free business valuation calculator. Value a small business with earnings and revenue multiples, and find the equity value after net debt.",
    calcInputs: [
      currencyField("annualEarnings", "Annual Earnings (EBITDA or SDE)", { default: 300000, max: 100000000000, step: 5000 }),
      numberField("earningsMultiple", "Earnings Multiple", { default: 4, min: 0, max: 50, step: 0.25 }),
      currencyField("annualRevenue", "Annual Revenue", { default: 1500000, max: 100000000000, step: 10000 }),
      numberField("revenueMultiple", "Revenue Multiple", { default: 0.9, min: 0, max: 50, step: 0.05 }),
      currencyField("netDebt", "Net Debt (Debt − Cash)", { default: 150000, max: 100000000000, step: 5000 }),
    ],
    calcResult: { label: "Business Value", format: "currency" },
    calcResults: [
      { key: "blendedBusinessValue", label: "Estimated Business Value (Average of Both)", format: "currency", highlight: true },
      { key: "valueByEarningsMultiple", label: "Value by Earnings Multiple", format: "currency" },
      { key: "valueByRevenueMultiple", label: "Value by Revenue Multiple", format: "currency" },
      { key: "equityValueToOwners", label: "Equity Value to Owners (After Net Debt)", format: "currency" },
    ],
    instructions: "Enter yearly earnings — EBITDA, or seller's discretionary earnings (SDE) for owner-run businesses — and a multiple typical for your industry and size, plus revenue and a revenue multiple. The tool averages the two methods and subtracts net debt to show what the owners' share is worth.",
    examples: "Example: $300,000 of earnings at 4× is $1.2 million; $1.5 million of revenue at 0.9× is $1.35 million. The average, $1,275,000, less $150,000 of net debt leaves $1,125,000 for the owners.",
    assumptions: "Multiples vary widely by industry, size, growth and risk — a quick estimate, not a formal valuation. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What multiple do small businesses sell for?", answer: "Many small, owner-run businesses sell for roughly 2–4× SDE; larger, growing companies can command 5–10× EBITDA or more." }],
  },
  {
    slug: "ebitda-calculator",
    title: "EBITDA Calculator",
    description: "Calculate EBITDA by adding interest, taxes, depreciation and amortization back to net income — plus adjusted EBITDA with one-off costs added back.",
    metaTitle: "EBITDA Calculator — EBITDA & Adjusted EBITDA",
    metaDescription: "Free EBITDA calculator. Add interest, taxes, depreciation and amortization back to net income, and find adjusted EBITDA with one-off add-backs.",
    calcInputs: [
      currencyField("netIncome", "Net Income", { default: 180000, max: 100000000000, step: 1000 }),
      currencyField("interestExpense", "Interest Expense", { default: 30000, max: 100000000000, step: 1000 }),
      currencyField("incomeTaxes", "Income Taxes", { default: 50000, max: 100000000000, step: 1000 }),
      currencyField("depreciation", "Depreciation", { default: 40000, max: 100000000000, step: 1000 }),
      currencyField("amortization", "Amortization", { default: 10000, max: 100000000000, step: 1000 }),
      currencyField("oneTimeExpenses", "One-Time Expenses to Add Back", { default: 15000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "EBITDA", format: "currency" },
    calcResults: [
      { key: "ebitda", label: "EBITDA", format: "currency", highlight: true },
      { key: "adjustedEbitda", label: "Adjusted EBITDA", format: "currency" },
      { key: "ebit", label: "EBIT", format: "currency" },
      { key: "addBacksTotal", label: "Total Added Back to Net Income", format: "currency" },
    ],
    instructions: "Start from net income and enter interest, taxes, depreciation and amortization from your income statement. For adjusted EBITDA, add genuine one-offs such as a lawsuit settlement or relocation costs.",
    examples: "Example: $180,000 of net income plus $30,000 interest and $50,000 tax is $260,000 EBIT. Adding $50,000 of depreciation and amortization gives $310,000 EBITDA — $325,000 adjusted for $15,000 of one-off costs.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why do buyers and lenders use EBITDA?", answer: "It compares operating earnings across companies regardless of how they're financed, taxed, or depreciate assets. But it ignores real cash needs like equipment replacement." }],
  },
  {
    slug: "ebit-calculator",
    title: "EBIT Calculator",
    description: "Calculate EBIT (earnings before interest and taxes) from revenue, cost of goods sold and operating expenses, with and without non-operating income.",
    metaTitle: "EBIT Calculator — Earnings Before Interest & Tax",
    metaDescription: "Free EBIT calculator. Find earnings before interest and taxes from revenue, COGS and operating expenses, plus EBIT margin.",
    calcInputs: [
      currencyField("revenue", "Revenue", { default: 1200000, max: 100000000000, step: 10000 }),
      currencyField("costOfGoodsSold", "Cost of Goods Sold", { default: 650000, max: 100000000000, step: 10000 }),
      currencyField("operatingExpenses", "Operating Expenses (Incl. Depreciation)", { default: 330000, max: 100000000000, step: 10000 }),
      currencyField("nonOperatingIncome", "Non-Operating Income (− for Losses)", { default: 10000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "EBIT", format: "currency" },
    calcResults: [
      { key: "ebit", label: "EBIT (Operating)", format: "currency", highlight: true },
      { key: "ebitMarginPercent", label: "EBIT Margin", format: "percentage" },
      { key: "ebitIncludingNonOperatingIncome", label: "EBIT Including Non-Operating Income", format: "currency" },
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
    ],
    instructions: "Enter revenue, cost of goods sold and operating expenses (including depreciation). Some analysts also include non-operating income like investment gains — both versions are shown.",
    examples: "Example: $1.2 million of revenue less $650,000 COGS and $330,000 of operating expenses is $220,000 EBIT — an 18.33% margin, or $230,000 with $10,000 of non-operating income.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between EBIT and EBITDA?", answer: "EBITDA adds depreciation and amortization back to EBIT. EBIT is usually the more conservative measure." }],
  },
  {
    slug: "ebitda-margin-calculator",
    title: "EBITDA Margin Calculator",
    description: "Calculate your EBITDA margin and the EBITDA you'd need to hit a target margin at your current revenue.",
    metaTitle: "EBITDA Margin Calculator — Margin & Target",
    metaDescription: "Free EBITDA margin calculator. Find EBITDA as a percentage of revenue and the EBITDA needed to reach your target margin.",
    calcInputs: [
      currencyField("ebitda", "EBITDA", { default: 280000, max: 100000000000, step: 1000 }),
      currencyField("revenue", "Revenue", { default: 1750000, max: 100000000000, step: 10000 }),
      percentField("targetMarginPercent", "Target EBITDA Margin", { default: 20, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "EBITDA Margin", format: "percentage" },
    calcResults: [
      { key: "ebitdaMarginPercent", label: "EBITDA Margin", format: "percentage", highlight: true },
      { key: "ebitdaNeededForTarget", label: "EBITDA Needed for Target Margin", format: "currency" },
      { key: "gapToTarget", label: "Gap to Target", format: "currency" },
    ],
    instructions: "Enter EBITDA and revenue for the same period, and a target margin — from a lender, a buyer's expectations or industry benchmarks.",
    examples: "Example: $280,000 of EBITDA on $1.75 million of revenue is a 16% margin. Reaching 20% would need $350,000 — $70,000 more.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good EBITDA margin?", answer: "It varies by industry — 10–15% is common for many small businesses, while software firms can exceed 25%." }],
  },
  {
    slug: "enterprise-value-calculator",
    title: "Enterprise Value Calculator",
    description: "Calculate a company's enterprise value from market capitalization, debt, cash and other claims, and its EV/EBITDA multiple.",
    metaTitle: "Enterprise Value Calculator — EV & EV/EBITDA",
    metaDescription: "Free enterprise value calculator. Add market cap and debt, subtract cash, to find EV, net debt and the EV/EBITDA multiple.",
    calcInputs: [
      currencyField("sharePrice", "Share Price", { default: 25, max: 10000000, step: 0.25 }),
      numberField("sharesOutstanding", "Shares Outstanding", { default: 4000000, min: 0, max: 100000000000, step: 10000 }),
      currencyField("totalDebt", "Total Debt", { default: 30000000, max: 1000000000000, step: 100000 }),
      currencyField("preferredAndMinorityInterest", "Preferred Stock and Minority Interest", { default: 0, max: 1000000000000, step: 100000 }),
      currencyField("cashAndEquivalents", "Cash and Equivalents", { default: 12000000, max: 1000000000000, step: 100000 }),
      currencyField("ebitda", "EBITDA", { default: 14000000, max: 1000000000000, step: 100000 }),
    ],
    calcResult: { label: "Enterprise Value", format: "currency" },
    calcResults: [
      { key: "enterpriseValue", label: "Enterprise Value", format: "currency", highlight: true },
      { key: "marketCapitalization", label: "Market Capitalization", format: "currency" },
      { key: "netDebt", label: "Net Debt", format: "currency" },
      { key: "evToEbitda", label: "EV / EBITDA", format: "number" },
    ],
    instructions: "Enter the share price and share count, total debt, any preferred stock or minority interest, cash, and EBITDA. Enterprise value is roughly what it would cost to buy the whole business, debts and all, net of its cash.",
    examples: "Example: 4 million shares at $25 is a $100 million market cap. Adding $30 million of debt and subtracting $12 million of cash gives a $118 million enterprise value — 8.43× EBITDA.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why is cash subtracted from enterprise value?", answer: "A buyer gets the company's cash along with it, which effectively lowers the price they pay." }],
  },
  {
    slug: "price-to-earnings-ratio-calculator",
    title: "Price-to-Earnings (P/E) Ratio Calculator",
    description: "Calculate the P/E ratio from share price and earnings per share, plus the earnings yield and the PEG ratio.",
    metaTitle: "P/E Ratio Calculator — Price to Earnings & PEG",
    metaDescription: "Free P/E ratio calculator. Find earnings per share, the price-to-earnings ratio, earnings yield and the PEG ratio from growth.",
    calcInputs: [
      currencyField("sharePrice", "Share Price", { default: 60, max: 10000000, step: 0.25 }),
      currencyField("netIncome", "Net Income (Last 12 Months)", { default: 20000000, max: 1000000000000, step: 100000 }),
      numberField("sharesOutstanding", "Shares Outstanding", { default: 5000000, min: 1, max: 100000000000, step: 10000 }),
      percentField("earningsGrowthPercent", "Expected Yearly Earnings Growth", { default: 10, min: -50, max: 200, step: 0.5 }),
    ],
    calcResult: { label: "P/E Ratio", format: "number" },
    calcResults: [
      { key: "priceToEarningsRatio", label: "P/E Ratio", format: "number", highlight: true },
      { key: "earningsPerShare", label: "Earnings per Share (EPS)", format: "currency" },
      { key: "earningsYieldPercent", label: "Earnings Yield", format: "percentage" },
      { key: "pegRatio", label: "PEG Ratio (P/E ÷ Growth)", format: "number" },
    ],
    instructions: "Enter the share price, net income and shares outstanding (to get EPS), and the earnings growth you expect. The PEG ratio adjusts P/E for growth — around 1 is often considered fair value.",
    examples: "Example: $20 million of earnings over 5 million shares is $4 EPS. At $60 a share the P/E is 15 (a 6.67% earnings yield), and with 10% growth the PEG is 1.5.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good P/E ratio?", answer: "There's no single answer — the long-run average for the S&P 500 is around 15–20, but fast-growing companies often trade higher and slow ones lower." }],
  },
  {
    slug: "debt-service-coverage-ratio-calculator",
    title: "Debt Service Coverage Ratio (DSCR) Calculator",
    description: "Calculate the debt service coverage ratio, and the largest loan a lender would allow at a minimum DSCR.",
    metaTitle: "DSCR Calculator — Debt Service Coverage Ratio",
    metaDescription: "Free DSCR calculator. Find your debt service coverage ratio and the maximum loan amount a lender would allow at a minimum DSCR.",
    calcInputs: [
      currencyField("netOperatingIncome", "Net Operating Income (or EBITDA)", { default: 180000, max: 100000000000, step: 1000 }),
      currencyField("annualDebtService", "Current Annual Debt Payments", { default: 130000, max: 100000000000, step: 1000 }),
      numberField("minimumDscr", "Lender's Minimum DSCR", { default: 1.25, min: 0.5, max: 5, step: 0.05 }),
      percentField("loanRatePercent", "Loan Interest Rate", { default: 7.5, max: 30, step: 0.05 }),
      numberField("loanYears", "Loan Term (Years)", { default: 20, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "DSCR", format: "number" },
    calcResults: [
      { key: "debtServiceCoverageRatio", label: "Debt Service Coverage Ratio", format: "number", highlight: true },
      { key: "maxAnnualDebtServiceAllowed", label: "Max Annual Debt Payments Allowed", format: "currency" },
      { key: "maxLoanAmount", label: "Max Loan at That Rate and Term", format: "currency" },
      { key: "cushionAboveDebtService", label: "Income Left After Debt Payments", format: "currency" },
    ],
    instructions: "Enter the income available to pay debt (net operating income for property, EBITDA for businesses), your yearly loan payments, and a lender's minimum DSCR plus the rate and term of a new loan. DSCR = income ÷ debt payments.",
    examples: "Example: $180,000 of income against $130,000 of payments is a 1.38 DSCR. At a 1.25 minimum, a lender would allow $144,000 a year of payments — about $1,489,585.57 of loan at 7.5% over 20 years.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What DSCR do lenders require?", answer: "Commonly 1.20–1.25 for commercial real estate and SBA-style business loans — meaning income covers debt payments by 20–25% extra." }],
  },
  {
    slug: "interest-coverage-ratio-calculator",
    title: "Interest Coverage Ratio Calculator",
    description: "Calculate how many times operating profit covers interest expense, and how the ratio would hold up if interest costs rise.",
    metaTitle: "Interest Coverage Ratio Calculator — With Rate Shock",
    metaDescription: "Free interest coverage ratio calculator. Find how many times EBIT covers interest, and the ratio if your interest costs rise.",
    calcInputs: [
      currencyField("ebit", "EBIT (Operating Profit)", { default: 400000, max: 100000000000, step: 1000 }),
      currencyField("interestExpense", "Annual Interest Expense", { default: 80000, max: 100000000000, step: 1000 }),
      percentField("rateIncreasePercent", "If Interest Costs Rise By", { default: 30, max: 300, step: 5 }),
    ],
    calcResult: { label: "Interest Coverage", format: "number" },
    calcResults: [
      { key: "interestCoverageRatio", label: "Interest Coverage Ratio", format: "number", highlight: true },
      { key: "coverageIfInterestRises", label: "Coverage If Interest Rises", format: "number" },
      { key: "ebitCushionAboveInterest", label: "EBIT Left After Interest", format: "currency" },
    ],
    instructions: "Enter operating profit (EBIT) and yearly interest expense. Then test a rise in interest costs — useful if you have variable-rate debt.",
    examples: "Example: $400,000 of EBIT against $80,000 of interest is 5× coverage. If interest costs rose 30%, coverage would drop to 3.85×.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's a healthy interest coverage ratio?", answer: "Lenders often like 3× or more; below 1.5× is a warning sign that the business may struggle to pay interest." }],
  },
];

async function main() {
  const category = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY_SLUG } });
  if (!category) {
    throw new Error(
      `The "${CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, ` +
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
