// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Business Finance Calculators" sub-batch F (Unit Economics & Returns). Part of
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
// See src/lib/calc-engine-business-unit-returns.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-unit-returns-calculators.ts
// or
//   npm run db:create-business-unit-returns-calculators

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
    slug: "unit-economics-calculator",
    title: "Unit Economics Calculator",
    description: "Check your unit economics — contribution per order, lifetime profit per customer after acquisition cost, and your LTV to CAC ratio.",
    metaTitle: "Unit Economics Calculator — Profit per Customer",
    metaDescription: "Free unit economics calculator. See contribution per order, lifetime contribution per customer, profit after acquisition cost and LTV:CAC.",
    calcInputs: [
      currencyField("averageOrderValue", "Average Order Value", { default: 60, max: 10000000, step: 1 }),
      currencyField("productCostPerOrder", "Product Cost per Order", { default: 24, max: 10000000, step: 1 }),
      currencyField("fulfillmentCostPerOrder", "Shipping and Fulfillment per Order", { default: 8, max: 10000000, step: 0.5 }),
      numberField("ordersPerCustomer", "Orders per Customer (Lifetime)", { default: 4, min: 0, max: 10000, step: 0.5 }),
      currencyField("customerAcquisitionCost", "Customer Acquisition Cost", { default: 45, max: 10000000, step: 1 }),
    ],
    calcResult: { label: "Profit per Customer", format: "currency" },
    calcResults: [
      { key: "profitPerCustomerAfterCac", label: "Lifetime Profit per Customer After CAC", format: "currency", highlight: true },
      { key: "contributionPerOrder", label: "Contribution per Order", format: "currency" },
      { key: "lifetimeContribution", label: "Lifetime Contribution per Customer", format: "currency" },
      { key: "ltvToCacRatio", label: "LTV to CAC Ratio", format: "number" },
      { key: "contributionMarginPercent", label: "Contribution Margin per Order", format: "percentage" },
    ],
    instructions: "Enter your average order, what each order costs in product and fulfillment, how many orders a customer places over time, and what it costs to win a customer. Healthy unit economics mean each customer is profitable after paying to acquire them.",
    examples: "Example: a $60 order costing $32 to fulfil contributes $28 (46.67%). Over 4 orders that's $112, so after a $45 acquisition cost each customer earns $67 — an LTV:CAC of 2.49.",
    assumptions: "Excludes fixed costs such as salaries and rent. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What are unit economics?", answer: "The revenue and costs tied to one unit of your business — usually one customer or order. If each unit loses money, growing faster only loses money faster." }],
  },
  {
    slug: "customer-acquisition-cost-calculator",
    title: "Customer Acquisition Cost (CAC) Calculator",
    description: "Calculate customer acquisition cost — blended across all marketing and sales spend, and for paid advertising on its own.",
    metaTitle: "CAC Calculator — Customer Acquisition Cost",
    metaDescription: "Free CAC calculator. Find your blended customer acquisition cost from marketing and sales spend, and your paid-advertising CAC.",
    calcInputs: [
      currencyField("marketingSpend", "Marketing Spend", { default: 30000, max: 10000000000, step: 500 }),
      currencyField("salesSpend", "Sales Spend (Salaries, Commissions, Tools)", { default: 20000, max: 10000000000, step: 500 }),
      numberField("newCustomers", "New Customers Won", { default: 400, min: 1, max: 1000000000, step: 1 }),
      currencyField("paidAdSpend", "Paid Advertising Spend", { default: 18000, max: 10000000000, step: 500 }),
      numberField("customersFromPaidAds", "Customers from Paid Ads", { default: 150, min: 1, max: 1000000000, step: 1 }),
    ],
    calcResult: { label: "Blended CAC", format: "currency" },
    calcResults: [
      { key: "blendedCac", label: "Blended CAC", format: "currency", highlight: true },
      { key: "paidCac", label: "Paid-Advertising CAC", format: "currency" },
      { key: "marketingOnlyCac", label: "Marketing-Only CAC", format: "currency" },
      { key: "totalAcquisitionSpend", label: "Total Acquisition Spend", format: "currency" },
    ],
    instructions: "Enter what you spent on marketing and sales in a period and how many new customers you won. Blended CAC includes customers who found you for free; paid CAC shows what advertising alone costs per customer.",
    examples: "Example: $50,000 of marketing and sales spend for 400 new customers is a $125 blended CAC. $18,000 of ads brought 150 customers — a $120 paid CAC.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What should be included in CAC?", answer: "All costs of winning new customers: ads, marketing staff and tools, sales salaries and commissions, and agency fees." }],
  },
  {
    slug: "customer-lifetime-value-calculator",
    title: "Customer Lifetime Value (LTV) Calculator",
    description: "Calculate customer lifetime value for a subscription business from monthly revenue per customer, gross margin and churn.",
    metaTitle: "LTV Calculator — Customer Lifetime Value",
    metaDescription: "Free customer lifetime value calculator. Find LTV from revenue per customer, gross margin and churn, plus average customer lifetime.",
    calcInputs: [
      currencyField("monthlyRevenuePerCustomer", "Monthly Revenue per Customer", { default: 50, max: 10000000, step: 1 }),
      percentField("grossMarginPercent", "Gross Margin", { default: 75, max: 100, step: 1 }),
      percentField("monthlyChurnPercent", "Monthly Churn", { default: 3, min: 0.01, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Customer Lifetime Value", format: "currency" },
    calcResults: [
      { key: "customerLifetimeValue", label: "Customer Lifetime Value (Gross Profit)", format: "currency", highlight: true },
      { key: "averageLifetimeMonths", label: "Average Customer Lifetime (Months)", format: "number" },
      { key: "lifetimeRevenue", label: "Lifetime Revenue per Customer", format: "currency" },
      { key: "monthlyGrossProfitPerCustomer", label: "Monthly Gross Profit per Customer", format: "currency" },
    ],
    instructions: "Enter what a customer pays per month, your gross margin, and the share of customers who cancel each month. Average lifetime = 1 ÷ churn; LTV = monthly gross profit × lifetime.",
    examples: "Example: $50 a month at a 75% margin is $37.50 of gross profit. With 3% monthly churn customers stay 33.33 months on average, so LTV is $1,250 (on $1,666.67 of revenue).",
    assumptions: "Assumes steady churn and pricing; ignores discounting future profit. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Should LTV use revenue or profit?", answer: "Gross profit is better — it's what's actually available to pay back acquisition costs." }],
  },
  {
    slug: "ltv-to-cac-ratio-calculator",
    title: "LTV to CAC Ratio Calculator",
    description: "Calculate the LTV to CAC ratio, how many months it takes to earn back acquisition cost, and the most you can spend per customer for a 3:1 ratio.",
    metaTitle: "LTV to CAC Ratio Calculator — With Payback",
    metaDescription: "Free LTV to CAC ratio calculator. See your LTV:CAC, CAC payback in months, and the most you can spend per customer to keep a 3:1 ratio.",
    calcInputs: [
      currencyField("customerLifetimeValue", "Customer Lifetime Value", { default: 1200, max: 10000000, step: 10 }),
      currencyField("customerAcquisitionCost", "Customer Acquisition Cost", { default: 350, max: 10000000, step: 5 }),
      currencyField("monthlyGrossProfitPerCustomer", "Monthly Gross Profit per Customer", { default: 37.5, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "LTV to CAC", format: "number" },
    calcResults: [
      { key: "ltvToCacRatio", label: "LTV to CAC Ratio", format: "number", highlight: true },
      { key: "cacPaybackMonths", label: "CAC Payback (Months)", format: "number" },
      { key: "profitPerCustomerAfterCac", label: "Profit per Customer After CAC", format: "currency" },
      { key: "maxCacForRatioOf3", label: "Most You Can Spend per Customer (3:1)", format: "currency" },
    ],
    instructions: "Enter lifetime value, acquisition cost and monthly gross profit per customer. A 3:1 ratio is the common benchmark; CAC payback under 12 months is usually considered healthy.",
    examples: "Example: $1,200 of lifetime value against $350 CAC is 3.43:1, and $37.50 a month pays the CAC back in 9.33 months. To keep 3:1 you could spend up to $400 per customer.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good LTV to CAC ratio?", answer: "About 3:1 is the usual target. Below 1:1 loses money on every customer; far above 5:1 may mean you're under-investing in growth." }],
  },
  {
    slug: "payback-period-calculator",
    title: "Payback Period Calculator",
    description: "Find how long an investment takes to pay for itself — simple payback and discounted payback that allows for the time value of money.",
    metaTitle: "Payback Period Calculator — Simple & Discounted",
    metaDescription: "Free payback period calculator. See how many years an investment takes to pay back, with both the simple and discounted payback period.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 100000, max: 10000000000, step: 1000 }),
      currencyField("annualCashFlow", "Yearly Cash Flow It Generates", { default: 28000, max: 10000000000, step: 500 }),
      percentField("discountRatePercent", "Discount Rate (Cost of Capital)", { default: 8, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Payback Period", format: "number" },
    calcResults: [
      { key: "paybackYears", label: "Payback Period (Years)", format: "number", highlight: true },
      { key: "discountedPaybackYears", label: "Discounted Payback (Years)", format: "number" },
      { key: "paybackMonths", label: "Payback Period (Months)", format: "number" },
    ],
    instructions: "Enter the upfront cost, the cash it brings in (or saves) each year, and your cost of capital. Discounted payback counts future cash as worth less than cash today, so it's always longer.",
    examples: "Example: a $100,000 investment returning $28,000 a year pays back in 3.57 years (42.86 months). Discounted at 8%, it takes 4.38 years.",
    assumptions: "Assumes equal yearly cash flows; payback ignores cash after the payback point. 0 means it never pays back. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good payback period?", answer: "It depends on the investment's life and risk — many small businesses look for 2–3 years; long-lived assets can justify longer." }],
  },
  {
    slug: "business-roi-calculator",
    title: "Business ROI Calculator",
    description: "Calculate the return on a business investment — new equipment, software or a project — from the yearly gains or savings it produces.",
    metaTitle: "Business ROI Calculator — Project Return",
    metaDescription: "Free business ROI calculator. Work out the ROI, average yearly return and payback of an investment from the gains or savings it brings each year.",
    calcInputs: [
      currencyField("investmentCost", "Investment Cost", { default: 40000, max: 10000000000, step: 500 }),
      currencyField("annualGainOrSavings", "Yearly Gain or Cost Savings", { default: 15000, max: 10000000000, step: 500 }),
      currencyField("annualRunningCosts", "Yearly Running Costs", { default: 2000, max: 10000000000, step: 100 }),
      numberField("years", "Years of Use", { default: 4, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "ROI", format: "percentage" },
    calcResults: [
      { key: "roiPercent", label: "ROI over the Period", format: "percentage", highlight: true },
      { key: "netGainOverPeriod", label: "Net Gain", format: "currency" },
      { key: "averageAnnualRoiPercent", label: "Average Yearly ROI", format: "percentage" },
      { key: "paybackYears", label: "Payback (Years)", format: "number" },
    ],
    instructions: "Enter the upfront cost, the extra profit or savings it brings each year, any yearly running costs, and how many years you'll use it. For a simple start-and-end value, use the ROI Calculator instead.",
    examples: "Example: a $40,000 machine saving $15,000 a year with $2,000 of running costs nets $13,000 a year. Over 4 years that's $12,000 of gain — a 30% ROI (7.5% a year) — paying back in 3.08 years.",
    assumptions: "Ignores the time value of money; see the Payback Period Calculator for discounted payback. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do I calculate business ROI?", answer: "ROI = (total gains − total costs) ÷ investment cost × 100." }],
  },
  {
    slug: "return-on-assets-calculator",
    title: "Return on Assets (ROA) Calculator",
    description: "Calculate return on assets using average total assets, and see its two drivers — profit margin and asset turnover.",
    metaTitle: "ROA Calculator — Return on Assets",
    metaDescription: "Free return on assets calculator. Find ROA from net income and average total assets, with profit margin and asset turnover.",
    calcInputs: [
      currencyField("netIncome", "Net Income", { default: 120000, max: 100000000000, step: 1000 }),
      currencyField("assetsStartOfYear", "Total Assets — Start of Year", { default: 1400000, max: 100000000000, step: 10000 }),
      currencyField("assetsEndOfYear", "Total Assets — End of Year", { default: 1600000, max: 100000000000, step: 10000 }),
      currencyField("revenue", "Revenue", { default: 2000000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "ROA", format: "percentage" },
    calcResults: [
      { key: "returnOnAssetsPercent", label: "Return on Assets", format: "percentage", highlight: true },
      { key: "averageTotalAssets", label: "Average Total Assets", format: "currency" },
      { key: "netProfitMarginPercent", label: "Net Profit Margin", format: "percentage" },
      { key: "assetTurnover", label: "Asset Turnover", format: "number" },
    ],
    instructions: "Enter net income, total assets at the start and end of the year, and revenue. ROA shows how much profit the business makes from everything it owns. ROA = profit margin × asset turnover.",
    examples: "Example: $120,000 of net income on average assets of $1.5 million is an 8% ROA — a 6% margin times 1.33 turns of assets.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good ROA?", answer: "Often 5% or more is considered good, but asset-heavy industries (utilities, manufacturing) run lower than asset-light ones (software, services)." }],
  },
  {
    slug: "return-on-equity-calculator",
    title: "Return on Equity (ROE) Calculator",
    description: "Calculate return on equity and break it down with the DuPont formula into profit margin, asset turnover and leverage.",
    metaTitle: "ROE Calculator — Return on Equity (DuPont)",
    metaDescription: "Free return on equity calculator. Find ROE and its DuPont breakdown — net profit margin, asset turnover and equity multiplier.",
    calcInputs: [
      currencyField("netIncome", "Net Income", { default: 150000, max: 100000000000, step: 1000 }),
      currencyField("revenue", "Revenue", { default: 1500000, max: 100000000000, step: 10000 }),
      currencyField("totalAssets", "Total Assets", { default: 1200000, max: 100000000000, step: 10000 }),
      currencyField("shareholdersEquity", "Shareholders' Equity", { default: 600000, max: 100000000000, step: 10000 }),
    ],
    calcResult: { label: "ROE", format: "percentage" },
    calcResults: [
      { key: "returnOnEquityPercent", label: "Return on Equity", format: "percentage", highlight: true },
      { key: "netProfitMarginPercent", label: "Net Profit Margin", format: "percentage" },
      { key: "assetTurnover", label: "Asset Turnover", format: "number" },
      { key: "equityMultiplier", label: "Equity Multiplier (Leverage)", format: "number" },
    ],
    instructions: "Enter net income, revenue, total assets and shareholders' equity. The DuPont breakdown shows whether ROE comes from profitability, efficient use of assets, or borrowing — high leverage raises ROE but also risk.",
    examples: "Example: a 10% margin × 1.25 asset turnover × 2.0 equity multiplier gives a 25% ROE ($150,000 on $600,000 of equity).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is the DuPont formula?", answer: "ROE = net profit margin × asset turnover × equity multiplier (assets ÷ equity). It explains what drives the return." }],
  },
  {
    slug: "return-on-capital-employed-calculator",
    title: "Return on Capital Employed (ROCE) Calculator",
    description: "Calculate return on capital employed — EBIT divided by total assets minus current liabilities — and compare it with your cost of capital.",
    metaTitle: "ROCE Calculator — Return on Capital Employed",
    metaDescription: "Free ROCE calculator. Find return on capital employed from EBIT, total assets and current liabilities, and compare it with your cost of capital.",
    calcInputs: [
      currencyField("ebit", "EBIT (Operating Profit)", { default: 250000, max: 100000000000, step: 1000 }),
      currencyField("totalAssets", "Total Assets", { default: 1800000, max: 100000000000, step: 10000 }),
      currencyField("currentLiabilities", "Current Liabilities", { default: 400000, max: 100000000000, step: 10000 }),
      percentField("costOfCapitalPercent", "Cost of Capital", { default: 10, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "ROCE", format: "percentage" },
    calcResults: [
      { key: "returnOnCapitalEmployedPercent", label: "Return on Capital Employed", format: "percentage", highlight: true },
      { key: "capitalEmployed", label: "Capital Employed", format: "currency" },
      { key: "spreadOverCostOfCapitalPercent", label: "Spread over Cost of Capital", format: "percentage" },
    ],
    instructions: "Enter EBIT, total assets and current liabilities, plus your cost of capital. ROCE measures profit from all long-term capital (debt and equity), so it's good for comparing companies with different financing.",
    examples: "Example: $250,000 of EBIT on $1.4 million of capital employed ($1.8 million − $400,000) is a 17.86% ROCE — 7.86 points above a 10% cost of capital.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good ROCE?", answer: "Above your cost of capital — otherwise the business destroys value. Many analysts look for ROCE of 15–20% or more." }],
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
