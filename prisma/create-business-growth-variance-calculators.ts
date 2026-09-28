// One-time (but safe to re-run) batch setup script: creates the 6 tools
// of the "Business Finance Calculators" sub-batch K (Growth & Variance). Part of
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
// See src/lib/calc-engine-business-growth-variance.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-growth-variance-calculators.ts
// or
//   npm run db:create-business-growth-variance-calculators

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
    slug: "business-growth-rate-calculator",
    title: "Business Growth Rate Calculator",
    description: "Measure your business's growth across three key metrics at once — revenue, customers and profit — plus revenue per customer.",
    metaTitle: "Business Growth Rate Calculator — Key Metrics",
    metaDescription: "Free business growth rate calculator. Compare revenue, customer and profit growth between two periods, plus growth in revenue per customer.",
    calcInputs: [
      currencyField("previousRevenue", "Revenue — Previous Period", { default: 800000, max: 100000000000, step: 1000 }),
      currencyField("currentRevenue", "Revenue — Current Period", { default: 920000, max: 100000000000, step: 1000 }),
      numberField("previousCustomers", "Customers — Previous Period", { default: 1200, min: 0, max: 1000000000, step: 10 }),
      numberField("currentCustomers", "Customers — Current Period", { default: 1320, min: 0, max: 1000000000, step: 10 }),
      currencyField("previousProfit", "Profit — Previous Period", { default: 90000, max: 100000000000, step: 1000 }),
      currencyField("currentProfit", "Profit — Current Period", { default: 117000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Revenue Growth", format: "percentage" },
    calcResults: [
      { key: "revenueGrowthPercent", label: "Revenue Growth", format: "percentage", highlight: true },
      { key: "customerGrowthPercent", label: "Customer Growth", format: "percentage" },
      { key: "profitGrowthPercent", label: "Profit Growth", format: "percentage" },
      { key: "revenuePerCustomerGrowthPercent", label: "Revenue per Customer Growth", format: "percentage" },
    ],
    instructions: "Enter revenue, customer count and profit for two periods. Looking at them together shows whether growth is coming from more customers, bigger spending per customer, or better profitability.",
    examples: "Example: revenue up from $800,000 to $920,000 (15%), customers up 10% and profit up 30% — revenue per customer grew 4.55%, and profit is growing twice as fast as sales.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good business growth rate?", answer: "It depends on size and stage — young companies often grow 20%+ a year, mature ones 5–10%. Profitable growth matters more than growth alone." }],
  },
  {
    slug: "cagr-business-growth-calculator",
    title: "CAGR Business Growth Calculator",
    description: "Calculate your business's compound annual growth rate (CAGR) in revenue over several years, and project where that trend leads.",
    metaTitle: "CAGR Business Growth Calculator — Revenue CAGR",
    metaDescription: "Free CAGR business growth calculator. Find your revenue's compound annual growth rate, total growth, years to double and a projection.",
    calcInputs: [
      currencyField("startingRevenue", "Starting Revenue", { default: 500000, max: 100000000000, step: 1000 }),
      currencyField("endingRevenue", "Ending Revenue", { default: 1100000, max: 100000000000, step: 1000 }),
      numberField("years", "Years Between Them", { default: 5, min: 0.5, max: 100, step: 0.5 }),
      numberField("yearsToProject", "Years to Project Ahead", { default: 3, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "CAGR", format: "percentage" },
    calcResults: [
      { key: "cagrPercent", label: "Compound Annual Growth Rate", format: "percentage", highlight: true },
      { key: "totalGrowthPercent", label: "Total Growth", format: "percentage" },
      { key: "projectedRevenue", label: "Projected Revenue on the Same Trend", format: "currency" },
      { key: "yearsToDouble", label: "Years to Double at This Rate", format: "number" },
    ],
    instructions: "Enter revenue at the start and end of a period and the years between. CAGR is the steady yearly growth that would get you from the first figure to the last — it smooths out good and bad years.",
    examples: "Example: growing from $500,000 to $1.1 million in 5 years is 120% total growth — a 17.08% CAGR, doubling every 4.4 years. Three more years at that pace would reach $1,765,412.89.",
    assumptions: "For an investment's CAGR, use the CAGR Calculator under Investment Calculators. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why use CAGR instead of average growth?", answer: "Averaging yearly growth rates overstates growth when years vary. CAGR gives the true compound rate between two points." }],
  },
  {
    slug: "budget-variance-calculator",
    title: "Budget Variance Calculator",
    description: "Compare actual revenue and expenses with budget, and see each variance in dollars and percent — favorable or unfavorable.",
    metaTitle: "Budget Variance Calculator — Budget vs Actual",
    metaDescription: "Free budget variance calculator. Compare actual revenue and expenses with budget and see each variance and the net effect on profit.",
    calcInputs: [
      currencyField("budgetedRevenue", "Budgeted Revenue", { default: 500000, max: 100000000000, step: 1000 }),
      currencyField("actualRevenue", "Actual Revenue", { default: 470000, max: 100000000000, step: 1000 }),
      currencyField("budgetedExpenses", "Budgeted Expenses", { default: 400000, max: 100000000000, step: 1000 }),
      currencyField("actualExpenses", "Actual Expenses", { default: 385000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Net Variance", format: "currency" },
    calcResults: [
      { key: "netVariance", label: "Net Effect on Profit (+ Favorable / − Unfavorable)", format: "currency", highlight: true },
      { key: "revenueVariance", label: "Revenue Variance", format: "currency" },
      { key: "revenueVariancePercent", label: "Revenue Variance %", format: "percentage" },
      { key: "expenseVariance", label: "Expense Variance (+ = Under Budget)", format: "currency" },
      { key: "expenseVariancePercent", label: "Expense Variance %", format: "percentage" },
    ],
    instructions: "Enter budgeted and actual revenue and expenses for the period. Positive variances are favorable (more revenue or less spending than planned); negative ones are unfavorable.",
    examples: "Example: revenue came in $30,000 (6%) under budget, but spending was $15,000 (3.75%) under budget too — a net $15,000 unfavorable effect on profit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a favorable variance?", answer: "A result better than budget: higher revenue or lower costs. An unfavorable variance is the opposite." }],
  },
  {
    slug: "cost-variance-calculator",
    title: "Cost Variance Calculator",
    description: "Split a cost variance into a price variance and a quantity (usage) variance using standard costing.",
    metaTitle: "Cost Variance Calculator — Price & Quantity",
    metaDescription: "Free cost variance calculator. Split the difference between standard and actual cost into price and quantity (usage) variances.",
    calcInputs: [
      currencyField("standardPrice", "Standard Price per Unit of Input", { default: 5, max: 10000000, step: 0.05 }),
      currencyField("actualPrice", "Actual Price per Unit of Input", { default: 5.4, max: 10000000, step: 0.05 }),
      numberField("standardQuantity", "Standard Quantity Allowed", { default: 10000, min: 0, max: 1000000000, step: 10 }),
      numberField("actualQuantity", "Actual Quantity Used", { default: 9500, min: 0, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Total Cost Variance", format: "currency" },
    calcResults: [
      { key: "totalCostVariance", label: "Total Cost Variance (+ Favorable / − Unfavorable)", format: "currency", highlight: true },
      { key: "priceVariance", label: "Price Variance", format: "currency" },
      { key: "quantityVariance", label: "Quantity (Usage) Variance", format: "currency" },
      { key: "actualTotalCost", label: "Actual Total Cost", format: "currency" },
      { key: "standardTotalCost", label: "Standard Total Cost", format: "currency" },
    ],
    instructions: "Enter the standard (planned) price and quantity of an input — materials or labor hours — and the actual price paid and quantity used. The price variance shows paying more or less than planned; the quantity variance shows using more or less.",
    examples: "Example: paying $5.40 instead of $5 for 9,500 units is a $3,800 unfavorable price variance, but using 500 fewer units than the 10,000 allowed saves $2,500 — a net $1,300 unfavorable ($51,300 vs $50,000).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why split cost variance into price and quantity?", answer: "They usually have different owners — purchasing controls price, production controls usage — so splitting them shows where to act." }],
  },
  {
    slug: "revenue-variance-calculator",
    title: "Revenue Variance Calculator",
    description: "Split the difference between budgeted and actual revenue into a sales price variance and a sales volume variance.",
    metaTitle: "Revenue Variance Calculator — Price & Volume",
    metaDescription: "Free revenue variance calculator. Split revenue vs budget into a sales price variance and a sales volume variance to see what drove it.",
    calcInputs: [
      currencyField("budgetedPrice", "Budgeted Price per Unit", { default: 50, max: 10000000, step: 0.5 }),
      currencyField("actualPrice", "Actual Average Price per Unit", { default: 47, max: 10000000, step: 0.5 }),
      numberField("budgetedUnits", "Budgeted Units", { default: 8000, min: 0, max: 1000000000, step: 10 }),
      numberField("actualUnits", "Actual Units Sold", { default: 8800, min: 0, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Total Revenue Variance", format: "currency" },
    calcResults: [
      { key: "totalRevenueVariance", label: "Total Revenue Variance (+ Favorable)", format: "currency", highlight: true },
      { key: "salesPriceVariance", label: "Sales Price Variance", format: "currency" },
      { key: "salesVolumeVariance", label: "Sales Volume Variance", format: "currency" },
      { key: "actualRevenue", label: "Actual Revenue", format: "currency" },
      { key: "budgetedRevenue", label: "Budgeted Revenue", format: "currency" },
    ],
    instructions: "Enter your budgeted price and units, and what you actually achieved. The tool shows how much of the revenue gap came from selling at a different price, and how much from selling a different number of units.",
    examples: "Example: selling 8,800 units at $47 instead of 8,000 at $50 brings $413,600 vs $400,000 budgeted. Discounting cost $26,400, but the extra volume added $40,000 — $13,600 favorable overall.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Did discounting pay off?", answer: "Compare the price variance with the volume variance: if the volume gained exceeds the price given up, revenue rose — but also check the effect on profit, since extra units add costs." }],
  },
  {
    slug: "profit-variance-calculator",
    title: "Profit Variance Calculator",
    description: "Compare actual profit with budget and see how much of the difference came from revenue and how much from costs.",
    metaTitle: "Profit Variance Calculator — Revenue vs Cost Effect",
    metaDescription: "Free profit variance calculator. Compare actual profit with budget and split the variance into the revenue effect and the cost effect.",
    calcInputs: [
      currencyField("budgetedRevenue", "Budgeted Revenue", { default: 750000, max: 100000000000, step: 1000 }),
      currencyField("actualRevenue", "Actual Revenue", { default: 780000, max: 100000000000, step: 1000 }),
      currencyField("budgetedCosts", "Budgeted Costs", { default: 630000, max: 100000000000, step: 1000 }),
      currencyField("actualCosts", "Actual Costs", { default: 672000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Profit Variance", format: "currency" },
    calcResults: [
      { key: "profitVariance", label: "Profit Variance (+ Favorable / − Unfavorable)", format: "currency", highlight: true },
      { key: "profitVariancePercent", label: "Profit Variance %", format: "percentage" },
      { key: "fromRevenue", label: "From Revenue", format: "currency" },
      { key: "fromCosts", label: "From Costs", format: "currency" },
      { key: "actualProfit", label: "Actual Profit", format: "currency" },
    ],
    instructions: "Enter budgeted and actual revenue and costs. The profit variance is split into the part from revenue (above or below plan) and the part from costs.",
    examples: "Example: budget profit was $120,000, actual $108,000 — $12,000 (10%) unfavorable. Revenue beat budget by $30,000, but costs ran $42,000 over.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do I explain a profit variance?", answer: "Break it into revenue and cost effects (as here), then into price, volume and cost drivers — the Revenue and Cost Variance calculators go one level deeper." }],
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
