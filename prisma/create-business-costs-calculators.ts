// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the "Business Finance Calculators" sub-batch E (Costs). Part of
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
// See src/lib/calc-engine-business-costs.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-costs-calculators.ts
// or
//   npm run db:create-business-costs-calculators

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
    slug: "cost-of-goods-sold-calculator",
    title: "Cost of Goods Sold (COGS) Calculator",
    description: "Calculate cost of goods sold with the inventory formula — beginning inventory plus purchases minus ending inventory — and your gross margin.",
    metaTitle: "COGS Calculator — Cost of Goods Sold",
    metaDescription: "Free COGS calculator. Work out cost of goods sold from beginning inventory, purchases and ending inventory, plus gross profit and gross margin.",
    calcInputs: [
      currencyField("beginningInventory", "Beginning Inventory", { default: 40000, max: 10000000000, step: 500 }),
      currencyField("purchases", "Purchases During the Period", { default: 150000, max: 10000000000, step: 1000 }),
      currencyField("directLaborAndFreight", "Direct Labor and Freight-In", { default: 20000, max: 10000000000, step: 500 }),
      currencyField("endingInventory", "Ending Inventory", { default: 35000, max: 10000000000, step: 500 }),
      currencyField("revenue", "Revenue for the Period", { default: 300000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "COGS", format: "currency" },
    calcResults: [
      { key: "costOfGoodsSold", label: "Cost of Goods Sold", format: "currency", highlight: true },
      { key: "goodsAvailableForSale", label: "Goods Available for Sale", format: "currency" },
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
      { key: "grossMarginPercent", label: "Gross Margin", format: "percentage" },
    ],
    instructions: "Enter inventory at the start and end of the period, what you bought, and direct costs of getting goods ready to sell (production labor, freight-in). COGS is the cost of the goods you actually sold.",
    examples: "Example: $40,000 of opening stock, $150,000 of purchases and $20,000 of direct costs make $210,000 available for sale. With $35,000 left at the end, COGS is $175,000 — on $300,000 of revenue, a 41.67% gross margin.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is included in COGS?", answer: "Direct costs of the goods sold — materials or purchase cost, direct labor, and freight to get them in. Rent, marketing and office costs are operating expenses, not COGS." }],
  },
  {
    slug: "operating-expense-calculator",
    title: "Operating Expense Calculator",
    description: "Total your operating expenses by category and find your operating expense ratio — the share of revenue they consume.",
    metaTitle: "Operating Expense Calculator — OpEx & Ratio",
    metaDescription: "Free operating expense calculator. Add up rent, salaries, marketing and other costs to get total OpEx, monthly OpEx and your operating expense ratio.",
    calcInputs: [
      currencyField("rent", "Rent and Facilities", { default: 36000, max: 10000000000, step: 500 }),
      currencyField("salaries", "Salaries and Benefits", { default: 180000, max: 10000000000, step: 1000 }),
      currencyField("marketing", "Marketing and Advertising", { default: 24000, max: 10000000000, step: 500 }),
      currencyField("utilitiesAndSoftware", "Utilities and Software", { default: 12000, max: 10000000000, step: 500 }),
      currencyField("insuranceAndProfessional", "Insurance and Professional Fees", { default: 15000, max: 10000000000, step: 500 }),
      currencyField("otherExpenses", "Other Operating Expenses", { default: 8000, max: 10000000000, step: 500 }),
      currencyField("revenue", "Revenue for the Same Period", { default: 600000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Total OpEx", format: "currency" },
    calcResults: [
      { key: "totalOperatingExpenses", label: "Total Operating Expenses", format: "currency", highlight: true },
      { key: "operatingExpenseRatioPercent", label: "Operating Expense Ratio", format: "percentage" },
      { key: "monthlyOperatingExpenses", label: "Monthly Operating Expenses", format: "currency" },
      { key: "salariesSharePercent", label: "Salaries as a Share of OpEx", format: "percentage" },
    ],
    instructions: "Enter a year's operating expenses by category and the revenue for the same year. Operating expenses are the costs of running the business that aren't part of making the product (those are COGS).",
    examples: "Example: $275,000 of operating expenses on $600,000 of revenue is a 45.83% operating expense ratio — $22,916.67 a month, with salaries 65.45% of the total.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's a good operating expense ratio?", answer: "Lower is better, but it depends on the industry. Watch the trend: a rising ratio means costs are growing faster than revenue." }],
  },
  {
    slug: "business-expense-calculator",
    title: "Business Expense Calculator",
    description: "Find the true monthly cost of running your business — monthly bills plus yearly bills and one-off purchases spread out over time.",
    metaTitle: "Business Expense Calculator — True Monthly Cost",
    metaDescription: "Free business expense calculator. Combine monthly bills, yearly bills and one-off purchases into the true monthly and yearly cost of your business.",
    calcInputs: [
      currencyField("monthlyExpenses", "Monthly Expenses (Rent, Software, Wages)", { default: 4200, max: 1000000000, step: 50 }),
      currencyField("yearlyExpenses", "Yearly Expenses (Insurance, Licenses, Renewals)", { default: 6000, max: 1000000000, step: 100 }),
      currencyField("oneOffPurchases", "One-Off Purchases (Equipment, Fit-Out)", { default: 18000, max: 1000000000, step: 500 }),
      numberField("usefulLifeYears", "Useful Life of One-Off Purchases (Years)", { default: 3, min: 1, max: 40, step: 1 }),
    ],
    calcResult: { label: "True Monthly Cost", format: "currency" },
    calcResults: [
      { key: "trueMonthlyCost", label: "True Monthly Cost", format: "currency", highlight: true },
      { key: "trueAnnualCost", label: "True Yearly Cost", format: "currency" },
      { key: "yearlyBillsPerMonth", label: "Yearly Bills per Month", format: "currency" },
      { key: "oneOffPurchasesPerMonth", label: "One-Off Purchases per Month", format: "currency" },
    ],
    instructions: "Enter your regular monthly costs, bills you pay once a year, and big one-off purchases with how many years they'll last. Spreading these out shows what the business really costs to run each month — useful for pricing and budgeting.",
    examples: "Example: $4,200 a month of regular costs, plus $6,000 of yearly bills ($500 a month) and $18,000 of equipment lasting 3 years ($500 a month), is a true cost of $5,200 a month — $62,400 a year.",
    assumptions: "Spreading one-off purchases is similar to depreciation but isn't a tax calculation. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why spread yearly bills monthly?", answer: "So your budget and prices cover them. Otherwise a big insurance renewal or license fee arrives as a shock." }],
  },
  {
    slug: "fixed-cost-calculator",
    title: "Fixed Cost Calculator",
    description: "Split a mixed cost into its fixed and variable parts with the high-low method, using your total costs at two activity levels.",
    metaTitle: "Fixed Cost Calculator — High-Low Method",
    metaDescription: "Free fixed cost calculator. Use the high-low method to split total costs at two activity levels into fixed cost and variable cost per unit.",
    calcInputs: [
      numberField("highActivityUnits", "Busiest Period — Units", { default: 12000, min: 0, max: 1000000000, step: 100 }),
      currencyField("highActivityTotalCost", "Busiest Period — Total Cost", { default: 98000, max: 10000000000, step: 500 }),
      numberField("lowActivityUnits", "Quietest Period — Units", { default: 7000, min: 0, max: 1000000000, step: 100 }),
      currencyField("lowActivityTotalCost", "Quietest Period — Total Cost", { default: 73000, max: 10000000000, step: 500 }),
    ],
    calcResult: { label: "Fixed Cost", format: "currency" },
    calcResults: [
      { key: "fixedCost", label: "Fixed Cost per Period", format: "currency", highlight: true },
      { key: "variableCostPerUnit", label: "Variable Cost per Unit", format: "currency" },
      { key: "fixedShareAtHighActivityPercent", label: "Fixed Share of Cost in the Busy Period", format: "percentage" },
    ],
    instructions: "From your records, pick the busiest and quietest periods and enter the units (or hours, or sales) and total costs for each. The change in cost divided by the change in activity is the variable cost per unit; what's left is fixed.",
    examples: "Example: costs of $98,000 at 12,000 units and $73,000 at 7,000 units mean each extra unit costs $5, and fixed costs are $38,000 a period (38.78% of the busy period's cost).",
    assumptions: "The high-low method uses only two points; regression on more periods is more precise. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What are fixed costs?", answer: "Costs that stay the same regardless of how much you sell — rent, salaries, insurance, loan payments — at least in the short term." }],
  },
  {
    slug: "variable-cost-calculator",
    title: "Variable Cost Calculator",
    description: "Calculate variable cost per unit from materials, direct labor, shipping and sales commission, plus total variable cost and contribution per unit.",
    metaTitle: "Variable Cost Calculator — Per Unit & Total",
    metaDescription: "Free variable cost calculator. Add materials, labor, shipping and commission to find variable cost per unit, total variable cost and contribution.",
    calcInputs: [
      currencyField("materialsPerUnit", "Materials per Unit", { default: 9, max: 10000000, step: 0.25 }),
      currencyField("directLaborPerUnit", "Direct Labor per Unit", { default: 6, max: 10000000, step: 0.25 }),
      currencyField("shippingPerUnit", "Shipping per Unit", { default: 3, max: 10000000, step: 0.25 }),
      percentField("salesCommissionPercent", "Sales Commission (% of Price)", { default: 5, max: 50, step: 0.5 }),
      currencyField("pricePerUnit", "Selling Price per Unit", { default: 40, max: 10000000, step: 0.5 }),
      numberField("units", "Units", { default: 3000, min: 0, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Variable Cost per Unit", format: "currency" },
    calcResults: [
      { key: "variableCostPerUnit", label: "Variable Cost per Unit", format: "currency", highlight: true },
      { key: "totalVariableCost", label: "Total Variable Cost", format: "currency" },
      { key: "variableCostRatioPercent", label: "Variable Cost Ratio", format: "percentage" },
      { key: "contributionPerUnit", label: "Contribution per Unit", format: "currency" },
    ],
    instructions: "Enter every cost that rises with each unit sold — including commission, which is a percentage of price — plus your price and volume.",
    examples: "Example: $9 materials, $6 labor, $3 shipping and a 5% commission on a $40 price ($2) is $20 of variable cost per unit — 50% of the price — and $60,000 for 3,000 units, leaving $20 of contribution each.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is labor a variable cost?", answer: "Piece-rate or hourly production labor that scales with output is variable; salaried staff are usually fixed." }],
  },
  {
    slug: "total-cost-calculator",
    title: "Total Cost Calculator",
    description: "Calculate total cost and average cost per unit at your volume and at a comparison volume, showing how scale lowers unit costs.",
    metaTitle: "Total Cost Calculator — Fixed + Variable Costs",
    metaDescription: "Free total cost calculator. Add fixed and variable costs to find total cost and average cost per unit at two volumes to see economies of scale.",
    calcInputs: [
      currencyField("fixedCosts", "Fixed Costs", { default: 50000, max: 10000000000, step: 500 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 12, max: 10000000, step: 0.5 }),
      numberField("units", "Units", { default: 4000, min: 1, max: 1000000000, step: 10 }),
      numberField("compareUnits", "Comparison Volume (Units)", { default: 8000, min: 1, max: 1000000000, step: 10 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
      { key: "averageCostPerUnit", label: "Average Cost per Unit", format: "currency" },
      { key: "totalCostAtComparisonVolume", label: "Total Cost at Comparison Volume", format: "currency" },
      { key: "averageCostPerUnitAtComparisonVolume", label: "Average Cost per Unit at Comparison Volume", format: "currency" },
    ],
    instructions: "Enter your fixed costs, variable cost per unit and volume, plus a second volume to compare. Total cost = fixed costs + variable cost × units.",
    examples: "Example: $50,000 fixed plus $12 per unit is $98,000 for 4,000 units ($24.50 each). At 8,000 units the total is $146,000, but the average falls to $18.25 — economies of scale.",
    assumptions: "Assumes fixed costs don't jump at the higher volume (in reality you may need more space or staff). " + GENERAL_DISCLAIMER,
    faq: [{ question: "What are economies of scale?", answer: "Unit costs falling as volume rises, mainly because fixed costs are shared across more units." }],
  },
  {
    slug: "cost-per-unit-calculator",
    title: "Cost Per Unit Calculator",
    description: "Calculate a production batch's cost per good unit — materials, labor, overhead and setup — after allowing for scrap and defects.",
    metaTitle: "Cost Per Unit Calculator — Batch with Scrap",
    metaDescription: "Free cost per unit calculator. Find a production batch's cost per good unit from materials, labor, overhead and setup, allowing for scrap.",
    calcInputs: [
      currencyField("materialsCost", "Materials for the Batch", { default: 6000, max: 10000000000, step: 100 }),
      currencyField("laborCost", "Labor for the Batch", { default: 4000, max: 10000000000, step: 100 }),
      currencyField("overheadCost", "Overhead for the Batch", { default: 2000, max: 10000000000, step: 100 }),
      currencyField("setupCost", "Setup Cost", { default: 500, max: 10000000000, step: 50 }),
      numberField("unitsProduced", "Units Produced", { default: 1000, min: 1, max: 1000000000, step: 10 }),
      percentField("scrapPercent", "Scrap / Defect Rate", { default: 4, max: 90, step: 0.5 }),
    ],
    calcResult: { label: "Cost per Good Unit", format: "currency" },
    calcResults: [
      { key: "costPerGoodUnit", label: "Cost per Good Unit", format: "currency", highlight: true },
      { key: "costPerUnitBeforeScrap", label: "Cost per Unit Before Scrap", format: "currency" },
      { key: "goodUnits", label: "Good Units", format: "number" },
      { key: "totalBatchCost", label: "Total Batch Cost", format: "currency" },
    ],
    instructions: "Enter everything a production run costs — materials, labor, overhead and setup — plus the units made and the share you'll scrap. Only good units can be sold, so they carry the whole cost.",
    examples: "Example: a $12,500 batch of 1,000 units costs $12.50 each — but with 4% scrap only 960 are sellable, so the real cost is $13.02 per good unit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How can I lower cost per unit?", answer: "Run bigger batches (to spread setup costs), cut scrap, negotiate material prices, and improve labor efficiency." }],
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
