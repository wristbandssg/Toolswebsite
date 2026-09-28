// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Business Finance Calculators" sub-batch A (Revenue & Profit). Part of
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
// See src/lib/calc-engine-business-profit.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-profit-calculators.ts
// or
//   npm run db:create-business-profit-calculators

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
    slug: "revenue-calculator",
    title: "Revenue Calculator",
    description: "Add up total business revenue from several products, services and other income, and see which stream brings in the most.",
    metaTitle: "Revenue Calculator — Total Business Revenue",
    metaDescription: "Free revenue calculator. Add revenue from products, services and other income to get total business revenue and the share of your biggest stream.",
    calcInputs: [
      currencyField("product1Price", "Product 1 — Price", { default: 40, max: 1000000, step: 1 }),
      numberField("product1Units", "Product 1 — Units Sold", { default: 1200, min: 0, max: 100000000, step: 10 }),
      currencyField("product2Price", "Product 2 — Price", { default: 120, max: 1000000, step: 1 }),
      numberField("product2Units", "Product 2 — Units Sold", { default: 300, min: 0, max: 100000000, step: 10 }),
      currencyField("serviceRevenue", "Service Revenue", { default: 15000, max: 1000000000, step: 500 }),
      currencyField("otherIncome", "Other Income (Fees, Royalties)", { default: 2000, max: 1000000000, step: 100 }),
    ],
    calcResult: { label: "Total Revenue", format: "currency" },
    calcResults: [
      { key: "totalRevenue", label: "Total Revenue", format: "currency", highlight: true },
      { key: "productRevenue", label: "Product Revenue", format: "currency" },
      { key: "serviceRevenue", label: "Service Revenue", format: "currency" },
      { key: "largestStreamSharePercent", label: "Share from Your Biggest Stream", format: "percentage" },
    ],
    instructions: "Enter the price and units sold for up to two products, plus any service revenue and other income for the same period. Revenue is everything the business brings in before any costs are taken out.",
    examples: "Example: 1,200 units at $40 and 300 at $120 make $84,000 of product revenue. Add $15,000 of services and $2,000 of other income and total revenue is $101,000 — 47.52% of it from Product 1.",
    assumptions: "Revenue here is gross — before returns and discounts (see the Sales Revenue Calculator). " + GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between revenue and profit?", answer: "Revenue is the money coming in from sales; profit is what's left after subtracting all costs and expenses." }],
  },
  {
    slug: "operating-profit-calculator",
    title: "Operating Profit Calculator",
    description: "Calculate operating profit from revenue, cost of goods sold and itemized operating expenses — SG&A, R&D and depreciation — plus EBITDA.",
    metaTitle: "Operating Profit Calculator — Income from Operations",
    metaDescription: "Free operating profit calculator. Subtract COGS, SG&A, R&D and depreciation from revenue to find operating profit, operating margin and EBITDA.",
    calcInputs: [
      currencyField("revenue", "Revenue", { default: 500000, max: 10000000000, step: 1000 }),
      currencyField("costOfGoodsSold", "Cost of Goods Sold", { default: 220000, max: 10000000000, step: 1000 }),
      currencyField("sellingGeneralAdmin", "Selling, General & Administrative (SG&A)", { default: 140000, max: 10000000000, step: 1000 }),
      currencyField("researchDevelopment", "Research & Development", { default: 30000, max: 10000000000, step: 1000 }),
      currencyField("depreciationAmortization", "Depreciation & Amortization", { default: 20000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Operating Profit", format: "currency" },
    calcResults: [
      { key: "operatingProfit", label: "Operating Profit", format: "currency", highlight: true },
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
      { key: "totalOperatingExpenses", label: "Total Operating Expenses", format: "currency" },
      { key: "operatingMarginPercent", label: "Operating Margin", format: "percentage" },
      { key: "ebitda", label: "EBITDA", format: "currency" },
    ],
    instructions: "Enter revenue, cost of goods sold, and your operating expenses by type. Operating profit is what the core business earns before interest and tax — it leaves out financing costs and one-off gains.",
    examples: "Example: $500,000 of revenue less $220,000 COGS is $280,000 gross profit. Subtracting $190,000 of operating expenses leaves $90,000 operating profit — an 18% margin — and $110,000 of EBITDA.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is operating profit the same as EBIT?", answer: "Very close. EBIT can also include non-operating income such as investment gains; operating profit counts only the core business." }],
  },
  {
    slug: "gross-margin-calculator",
    title: "Gross Margin Calculator",
    description: "Find the gross margin on a product from its price and unit cost, and the price you'd need to hit a target margin.",
    metaTitle: "Gross Margin Calculator — Per Product & Target Price",
    metaDescription: "Free gross margin calculator. Find a product's gross margin from price and unit cost, and the selling price needed to hit your target margin.",
    calcInputs: [
      currencyField("sellingPrice", "Selling Price per Unit", { default: 50, max: 10000000, step: 0.5 }),
      currencyField("unitCost", "Cost per Unit (COGS)", { default: 30, max: 10000000, step: 0.5 }),
      percentField("targetMarginPercent", "Target Gross Margin", { default: 50, max: 95, step: 1 }),
    ],
    calcResult: { label: "Gross Margin", format: "percentage" },
    calcResults: [
      { key: "grossMarginPercent", label: "Gross Margin", format: "percentage", highlight: true },
      { key: "grossProfitPerUnit", label: "Gross Profit per Unit", format: "currency" },
      { key: "priceForTargetMargin", label: "Price for Your Target Margin", format: "currency" },
      { key: "markupPercent", label: "Equivalent Markup", format: "percentage" },
    ],
    instructions: "Enter a product's selling price, what it costs you to make or buy, and the margin you'd like. Gross margin = (price − cost) ÷ price.",
    examples: "Example: a $50 product costing $30 has a 40% gross margin ($20 per unit, a 66.67% markup). For a 50% margin you'd need to charge $60.",
    assumptions: "For company-wide totals, use the Gross Profit Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good gross margin?", answer: "It varies hugely by industry — software can exceed 70%, while grocery and retail often run 20–40%. Compare with businesses like yours." }],
  },
  {
    slug: "net-profit-margin-calculator",
    title: "Net Profit Margin Calculator",
    description: "Find your net profit margin from revenue and net income, and the revenue you'd need to reach a target profit at the same margin.",
    metaTitle: "Net Profit Margin Calculator — Margin & Target",
    metaDescription: "Free net profit margin calculator. Work out net profit margin from revenue and net income, and the revenue needed to reach your profit target.",
    calcInputs: [
      currencyField("revenue", "Revenue", { default: 850000, max: 10000000000, step: 1000 }),
      currencyField("netIncome", "Net Income (Bottom Line)", { default: 68000, max: 10000000000, step: 500 }),
      currencyField("targetNetIncome", "Target Net Income", { default: 100000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Net Profit Margin", format: "percentage" },
    calcResults: [
      { key: "netProfitMarginPercent", label: "Net Profit Margin", format: "percentage", highlight: true },
      { key: "totalExpenses", label: "Total Costs and Expenses", format: "currency" },
      { key: "expensesAsShareOfRevenuePercent", label: "Costs as a Share of Revenue", format: "percentage" },
      { key: "revenueNeededForTarget", label: "Revenue Needed for Target Net Income", format: "currency" },
    ],
    instructions: "Enter revenue and net income (the bottom line after all costs, interest and tax) from your income statement, plus a profit target. The tool shows your margin and how much you'd need to sell to hit the target at that margin.",
    examples: "Example: $68,000 net income on $850,000 revenue is an 8% net margin — $782,000 went on costs. To earn $100,000 at 8% you'd need $1,250,000 of revenue.",
    assumptions: "To build net profit up from costs, use the Net Profit Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good net profit margin?", answer: "Around 10% is often called healthy, 20% high and 5% low — but restaurants and retailers commonly run below 5%, while software firms may exceed 20%." }],
  },
  {
    slug: "contribution-margin-ratio-calculator",
    title: "Contribution Margin Ratio Calculator",
    description: "Calculate the contribution margin ratio from total sales and variable costs, and see how much profit every extra $1,000 of sales adds.",
    metaTitle: "Contribution Margin Ratio Calculator — CM Ratio",
    metaDescription: "Free contribution margin ratio calculator. Find your CM ratio from total sales and variable costs, and the profit each extra $1,000 of sales adds.",
    calcInputs: [
      currencyField("totalSales", "Total Sales", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("totalVariableCosts", "Total Variable Costs", { default: 240000, max: 10000000000, step: 1000 }),
      currencyField("fixedCosts", "Fixed Costs", { default: 110000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Contribution Margin Ratio", format: "percentage" },
    calcResults: [
      { key: "contributionMarginRatioPercent", label: "Contribution Margin Ratio", format: "percentage", highlight: true },
      { key: "totalContributionMargin", label: "Total Contribution Margin", format: "currency" },
      { key: "profitFromEachExtra1000Sales", label: "Profit Added by Each Extra $1,000 of Sales", format: "currency" },
      { key: "operatingProfit", label: "Operating Profit (After Fixed Costs)", format: "currency" },
      { key: "variableCostRatioPercent", label: "Variable Cost Ratio", format: "percentage" },
    ],
    instructions: "Enter total sales, total variable costs (costs that rise with sales, like materials and commissions) and fixed costs for the same period. The CM ratio is the share of each sales dollar left to cover fixed costs and profit.",
    examples: "Example: $400,000 of sales with $240,000 of variable costs is a 40% CM ratio ($160,000). Every extra $1,000 of sales adds $400 of profit, and after $110,000 of fixed costs operating profit is $50,000.",
    assumptions: "For per-unit figures, use the Contribution Margin Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How is the contribution margin ratio used?", answer: "Divide fixed costs by the CM ratio to get break-even sales, or multiply any change in sales by it to see the change in profit." }],
  },
  {
    slug: "profit-calculator",
    title: "Profit Calculator",
    description: "Calculate your business profit for a period — before and after tax — and your after-tax profit margin.",
    metaTitle: "Profit Calculator — Profit Before and After Tax",
    metaDescription: "Free profit calculator. Subtract total costs from revenue to see profit before tax, the tax on it, profit after tax and your after-tax margin.",
    calcInputs: [
      currencyField("revenue", "Revenue", { default: 250000, max: 10000000000, step: 1000 }),
      currencyField("totalCosts", "Total Costs and Expenses", { default: 205000, max: 10000000000, step: 1000 }),
      percentField("taxRatePercent", "Tax Rate on Profit", { default: 21, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Profit After Tax", format: "currency" },
    calcResults: [
      { key: "profitAfterTax", label: "Profit After Tax", format: "currency", highlight: true },
      { key: "profitBeforeTax", label: "Profit Before Tax", format: "currency" },
      { key: "tax", label: "Tax", format: "currency" },
      { key: "profitMarginAfterTaxPercent", label: "After-Tax Profit Margin", format: "percentage" },
    ],
    instructions: "Enter your revenue, total costs and the tax rate on profit (21% is the US federal corporate rate; pass-through owners pay their personal rate). No tax is charged on a loss.",
    examples: "Example: $250,000 of revenue less $205,000 of costs is $45,000 before tax. At 21%, tax is $9,450, leaving $35,550 — a 14.22% after-tax margin.",
    assumptions: "Uses one flat tax rate and ignores state tax and credits. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do I calculate profit?", answer: "Profit = revenue − costs. Subtract tax from pre-tax profit to get after-tax (net) profit." }],
  },
  {
    slug: "profit-percentage-calculator",
    title: "Profit Percentage Calculator",
    description: "Calculate profit or loss as a percentage of the cost price — the classic formula for buying and selling goods.",
    metaTitle: "Profit Percentage Calculator — Profit or Loss %",
    metaDescription: "Free profit percentage calculator. Enter cost price and selling price to find your profit or loss percentage and the profit amount.",
    calcInputs: [
      currencyField("costPrice", "Cost Price", { default: 800, max: 1000000000, step: 1 }),
      currencyField("sellingPrice", "Selling Price", { default: 1000, max: 1000000000, step: 1 }),
    ],
    calcResult: { label: "Profit or Loss %", format: "percentage" },
    calcResults: [
      { key: "profitOrLossPercent", label: "Profit (+) or Loss (−) % on Cost", format: "percentage", highlight: true },
      { key: "profitOrLoss", label: "Profit (+) or Loss (−)", format: "currency" },
      { key: "profitAsShareOfSellingPricePercent", label: "Profit as a Share of Selling Price (Margin)", format: "percentage" },
    ],
    instructions: "Enter what you paid (cost price) and what you sold for (selling price). Profit % = (selling price − cost price) ÷ cost price × 100. A negative result is a loss.",
    examples: "Example: buying at $800 and selling at $1,000 is a $200 profit — 25% on cost, or 20% of the selling price.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is profit percentage calculated on cost or selling price?", answer: "Traditionally on cost price. Profit as a share of the selling price is called margin — both are shown." }],
  },
  {
    slug: "profit-growth-calculator",
    title: "Profit Growth Calculator",
    description: "Measure how much your profit grew between two periods, alongside revenue growth and how your profit margin changed.",
    metaTitle: "Profit Growth Calculator — Profit Change %",
    metaDescription: "Free profit growth calculator. Compare profit and revenue for two periods to see profit growth, revenue growth and how your margin changed.",
    calcInputs: [
      currencyField("previousProfit", "Profit — Previous Period", { default: 80000, max: 10000000000, step: 500 }),
      currencyField("currentProfit", "Profit — Current Period", { default: 96000, max: 10000000000, step: 500 }),
      currencyField("previousRevenue", "Revenue — Previous Period", { default: 600000, max: 10000000000, step: 1000 }),
      currencyField("currentRevenue", "Revenue — Current Period", { default: 660000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Profit Growth", format: "percentage" },
    calcResults: [
      { key: "profitGrowthPercent", label: "Profit Growth", format: "percentage", highlight: true },
      { key: "profitChange", label: "Change in Profit", format: "currency" },
      { key: "revenueGrowthPercent", label: "Revenue Growth", format: "percentage" },
      { key: "previousMarginPercent", label: "Previous Profit Margin", format: "percentage" },
      { key: "currentMarginPercent", label: "Current Profit Margin", format: "percentage" },
    ],
    instructions: "Enter profit and revenue for two periods (say, last year and this year). When profit grows faster than revenue, your margin is improving.",
    examples: "Example: profit rising from $80,000 to $96,000 is 20% growth, while revenue grew 10% — so the margin improved from 13.33% to 14.55%.",
    assumptions: "Growth from a negative profit is measured against its absolute value. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why can profit grow faster than revenue?", answer: "Fixed costs don't rise with sales, so extra revenue flows to profit at a higher rate — this is called operating leverage." }],
  },
  {
    slug: "profit-per-unit-calculator",
    title: "Profit Per Unit Calculator",
    description: "Find the true profit on each unit you sell, including each unit's share of your fixed costs.",
    metaTitle: "Profit Per Unit Calculator — Incl. Fixed Costs",
    metaDescription: "Free profit per unit calculator. Find profit per unit after variable costs and each unit's share of fixed costs, plus total profit.",
    calcInputs: [
      currencyField("pricePerUnit", "Price per Unit", { default: 25, max: 10000000, step: 0.5 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 12, max: 10000000, step: 0.5 }),
      currencyField("fixedCosts", "Fixed Costs for the Period", { default: 30000, max: 10000000000, step: 500 }),
      numberField("unitsSold", "Units Sold in the Period", { default: 4000, min: 1, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Profit per Unit", format: "currency" },
    calcResults: [
      { key: "profitPerUnit", label: "Profit per Unit", format: "currency", highlight: true },
      { key: "contributionPerUnit", label: "Contribution per Unit (Before Fixed Costs)", format: "currency" },
      { key: "fixedCostPerUnit", label: "Fixed Cost per Unit", format: "currency" },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
    ],
    instructions: "Enter your price, variable cost per unit, fixed costs and units sold. Each unit carries its share of fixed costs, so selling more units lowers the fixed cost per unit and raises profit per unit.",
    examples: "Example: a $25 product with a $12 variable cost contributes $13. Spreading $30,000 of fixed costs over 4,000 units adds $7.50 each, leaving $5.50 profit per unit — $22,000 in total.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does profit per unit change with volume?", answer: "Fixed costs are shared across all units. More units means a smaller share each, so the profit per unit rises." }],
  },
  {
    slug: "target-profit-calculator",
    title: "Target Profit Calculator",
    description: "Find how many units and how much in sales you need to reach an after-tax profit goal.",
    metaTitle: "Target Profit Calculator — Sales for a Profit Goal",
    metaDescription: "Free target profit calculator. Find the units and sales needed to reach an after-tax profit target from your price, costs and tax rate.",
    calcInputs: [
      currencyField("fixedCosts", "Annual Fixed Costs", { default: 120000, max: 10000000000, step: 1000 }),
      currencyField("pricePerUnit", "Price per Unit", { default: 80, max: 10000000, step: 1 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 50, max: 10000000, step: 1 }),
      currencyField("targetProfitAfterTax", "Target Profit After Tax", { default: 60000, max: 10000000000, step: 1000 }),
      percentField("taxRatePercent", "Tax Rate", { default: 21, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Units Needed", format: "number" },
    calcResults: [
      { key: "unitsNeeded", label: "Units Needed", format: "number", highlight: true },
      { key: "salesNeeded", label: "Sales Needed", format: "currency" },
      { key: "profitBeforeTaxNeeded", label: "Profit Before Tax Needed", format: "currency" },
      { key: "unitsPerMonth", label: "Units per Month", format: "number" },
    ],
    instructions: "Enter fixed costs, your price and variable cost per unit, the after-tax profit you want, and your tax rate. The tool grosses up the target for tax, then works out the units needed to cover fixed costs plus that profit.",
    examples: "Example: to keep $60,000 after 21% tax you need $75,949.37 before tax. With $120,000 of fixed costs and $30 of contribution per unit, that's 6,532 units ($522,560 of sales) — about 545 a month.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the target profit formula?", answer: "Units = (fixed costs + target pre-tax profit) ÷ contribution margin per unit, where pre-tax profit = after-tax target ÷ (1 − tax rate)." }],
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
