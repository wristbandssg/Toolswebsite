// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Business Finance Calculators" sub-batch B (Break-Even, Margin & Markup). Part of
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
// See src/lib/calc-engine-business-breakeven-margin.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-breakeven-margin-calculators.ts
// or
//   npm run db:create-business-breakeven-margin-calculators

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

function dropdownField(key: string, label: string, defaultValue: number, options: { label: string; value: number }[]) {
  return { key, label, type: "dropdown", required: true, default: defaultValue, options };
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
    slug: "break-even-point-calculator",
    title: "Break-Even Point Calculator",
    description: "Find when a new business or product line earns back its start-up costs — in months — and the monthly sales needed just to cover fixed costs.",
    metaTitle: "Break-Even Point Calculator — Months to Break Even",
    metaDescription: "Free break-even point calculator. See how many months until you recover start-up costs, and the units and revenue needed each month to break even.",
    calcInputs: [
      currencyField("startupCosts", "Start-Up Costs", { default: 50000, max: 10000000000, step: 1000 }),
      currencyField("monthlyFixedCosts", "Monthly Fixed Costs", { default: 8000, max: 1000000000, step: 100 }),
      currencyField("pricePerUnit", "Price per Unit", { default: 60, max: 10000000, step: 1 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 25, max: 10000000, step: 1 }),
      numberField("unitsPerMonth", "Expected Units Sold per Month", { default: 400, min: 0, max: 100000000, step: 10 }),
    ],
    calcResult: { label: "Months to Break Even", format: "number" },
    calcResults: [
      { key: "monthsToRecoverStartupCosts", label: "Months to Recover Start-Up Costs (0 = Never)", format: "number", highlight: true },
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency" },
      { key: "monthlyBreakEvenUnits", label: "Units per Month to Cover Fixed Costs", format: "number" },
      { key: "monthlyBreakEvenRevenue", label: "Revenue per Month to Cover Fixed Costs", format: "currency" },
    ],
    instructions: "Enter what it costs to get started, your monthly fixed costs, price, variable cost per unit and expected monthly sales. The tool shows the monthly sales needed to cover running costs, and how long monthly profit takes to repay the start-up costs.",
    examples: "Example: $50,000 to start, $8,000 a month of fixed costs, and $35 of contribution on each of 400 units a month gives $6,000 profit a month — you'd break even on the start-up costs in 8.33 months. Covering fixed costs alone takes 229 units ($13,740) a month.",
    assumptions: "Assumes steady monthly sales. For break-even units and revenue without start-up costs, use the Break-Even Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How long does it take a new business to break even?", answer: "It varies widely — many small businesses take one to three years. Lower start-up costs and a higher contribution per sale shorten it." }],
  },
  {
    slug: "break-even-revenue-calculator",
    title: "Break-Even Revenue Calculator",
    description: "Find the sales revenue you need to break even from your fixed costs and contribution margin ratio — no unit data needed — plus your margin of safety.",
    metaTitle: "Break-Even Revenue Calculator — Sales to Break Even",
    metaDescription: "Free break-even revenue calculator. Find break-even sales from fixed costs and contribution margin ratio, and your margin of safety.",
    calcInputs: [
      currencyField("annualFixedCosts", "Annual Fixed Costs", { default: 180000, max: 10000000000, step: 1000 }),
      percentField("contributionMarginRatioPercent", "Contribution Margin Ratio", { default: 40, max: 100, step: 0.5 }),
      currencyField("currentRevenue", "Current Annual Revenue", { default: 600000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Break-Even Revenue", format: "currency" },
    calcResults: [
      { key: "breakEvenRevenue", label: "Break-Even Revenue (Yearly)", format: "currency", highlight: true },
      { key: "monthlyBreakEvenRevenue", label: "Break-Even Revenue (Monthly)", format: "currency" },
      { key: "marginOfSafety", label: "Margin of Safety", format: "currency" },
      { key: "marginOfSafetyPercent", label: "Margin of Safety %", format: "percentage" },
    ],
    instructions: "Enter your yearly fixed costs, your contribution margin ratio (the share of each sale left after variable costs) and your current revenue. Useful for service businesses or stores with many products, where per-unit figures don't make sense.",
    examples: "Example: $180,000 of fixed costs at a 40% contribution margin ratio needs $450,000 of sales ($37,500 a month). With $600,000 of revenue, sales could fall $150,000 (25%) before you'd make a loss.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is the margin of safety?", answer: "How far sales can drop before you reach break-even — current revenue minus break-even revenue. A bigger margin means less risk." }],
  },
  {
    slug: "break-even-sales-calculator",
    title: "Break-Even Sales Calculator",
    description: "Find the break-even point for a business selling two products in a set sales mix — total break-even sales and units of each product.",
    metaTitle: "Break-Even Sales Calculator — Two-Product Mix",
    metaDescription: "Free break-even sales calculator for a product mix. Find break-even sales and units of each product using a weighted contribution margin.",
    calcInputs: [
      currencyField("fixedCosts", "Fixed Costs", { default: 90000, max: 10000000000, step: 1000 }),
      currencyField("productAPrice", "Product A — Price", { default: 50, max: 10000000, step: 1 }),
      currencyField("productAVariableCost", "Product A — Variable Cost", { default: 30, max: 10000000, step: 1 }),
      currencyField("productBPrice", "Product B — Price", { default: 120, max: 10000000, step: 1 }),
      currencyField("productBVariableCost", "Product B — Variable Cost", { default: 60, max: 10000000, step: 1 }),
      percentField("productASharePercent", "Product A Share of Units Sold", { default: 75, max: 100, step: 5 }),
    ],
    calcResult: { label: "Break-Even Sales", format: "currency" },
    calcResults: [
      { key: "breakEvenSales", label: "Break-Even Sales", format: "currency", highlight: true },
      { key: "breakEvenUnitsProductA", label: "Product A Units", format: "number" },
      { key: "breakEvenUnitsProductB", label: "Product B Units", format: "number" },
      { key: "weightedContributionPerUnit", label: "Weighted Contribution per Unit", format: "currency" },
    ],
    instructions: "Enter fixed costs, price and variable cost for each product, and what share of the units you sell are Product A. The tool weights each product's contribution by the mix to find the break-even point.",
    examples: "Example: with 75% of units as Product A ($20 contribution) and 25% as Product B ($60), the weighted contribution is $30 a unit. Covering $90,000 of fixed costs takes 2,250 A and 750 B — $202,500 of sales.",
    assumptions: "Assumes the sales mix stays the same; selling more of the higher-margin product lowers the break-even point. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why does sales mix affect break-even?", answer: "Products contribute different amounts. Selling more of the high-contribution one covers fixed costs sooner." }],
  },
  {
    slug: "break-even-price-calculator",
    title: "Break-Even Price Calculator",
    description: "Find the lowest price that covers all your costs at an expected sales volume, and the price that gives a target profit margin.",
    metaTitle: "Break-Even Price Calculator — Minimum Price",
    metaDescription: "Free break-even price calculator. Find the lowest price that covers fixed and variable costs at your volume, and the price for a target margin.",
    calcInputs: [
      currencyField("fixedCosts", "Fixed Costs", { default: 40000, max: 10000000000, step: 500 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 18, max: 10000000, step: 0.5 }),
      numberField("expectedUnits", "Expected Units Sold", { default: 2500, min: 1, max: 1000000000, step: 10 }),
      percentField("targetMarginPercent", "Target Profit Margin", { default: 20, max: 90, step: 1 }),
    ],
    calcResult: { label: "Break-Even Price", format: "currency" },
    calcResults: [
      { key: "breakEvenPrice", label: "Break-Even Price", format: "currency", highlight: true },
      { key: "fixedCostPerUnit", label: "Fixed Cost per Unit", format: "currency" },
      { key: "priceForTargetMargin", label: "Price for Your Target Margin", format: "currency" },
      { key: "breakEvenRevenue", label: "Revenue at Break-Even Price", format: "currency" },
    ],
    instructions: "Enter your fixed costs, variable cost per unit, the units you expect to sell and a target margin. Break-even price = variable cost + fixed costs ÷ units — anything below it loses money.",
    examples: "Example: $40,000 of fixed costs over 2,500 units adds $16 to an $18 variable cost, so the break-even price is $34. For a 20% profit margin, charge $42.50.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does the break-even price fall as volume rises?", answer: "Fixed costs are spread over more units, so each unit needs to cover less of them." }],
  },
  {
    slug: "margin-calculator",
    title: "Margin Calculator",
    description: "Find the selling price that gives you a target profit margin on a cost — margin-based pricing, not markup.",
    metaTitle: "Margin Calculator — Price for a Target Margin",
    metaDescription: "Free margin calculator. Enter your cost and the margin you want to find the selling price, profit per sale and equivalent markup.",
    calcInputs: [
      currencyField("cost", "Cost", { default: 40, max: 1000000000, step: 0.5 }),
      percentField("targetMarginPercent", "Margin You Want", { default: 35, max: 95, step: 0.5 }),
    ],
    calcResult: { label: "Selling Price", format: "currency" },
    calcResults: [
      { key: "sellingPrice", label: "Selling Price", format: "currency", highlight: true },
      { key: "profitPerSale", label: "Profit per Sale", format: "currency" },
      { key: "equivalentMarkupPercent", label: "Equivalent Markup", format: "percentage" },
    ],
    instructions: "Enter the cost of an item and the margin you want. Price = cost ÷ (1 − margin). Adding the margin % to cost (e.g. cost × 1.35) gives a smaller margin — that's markup.",
    examples: "Example: for a 35% margin on a $40 cost, charge $61.54 — a $21.54 profit, which is a 53.85% markup.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why isn't a 35% margin the same as cost + 35%?", answer: "Margin is measured on the selling price; markup on cost. $40 + 35% = $54, but $14 is only a 25.9% margin of $54." }],
  },
  {
    slug: "margin-percentage-calculator",
    title: "Margin Percentage Calculator",
    description: "Calculate the margin percentage from a selling price and a cost, and total profit and revenue for a quantity.",
    metaTitle: "Margin Percentage Calculator — Margin from Price",
    metaDescription: "Free margin percentage calculator. Enter selling price and cost to get your margin percentage, profit per item and totals for a quantity.",
    calcInputs: [
      currencyField("sellingPrice", "Selling Price", { default: 75, max: 1000000000, step: 0.5 }),
      currencyField("cost", "Cost", { default: 45, max: 1000000000, step: 0.5 }),
      numberField("quantity", "Quantity", { default: 100, min: 0, max: 1000000000, step: 1 }),
    ],
    calcResult: { label: "Margin", format: "percentage" },
    calcResults: [
      { key: "marginPercent", label: "Margin Percentage", format: "percentage", highlight: true },
      { key: "profitPerItem", label: "Profit per Item", format: "currency" },
      { key: "totalProfit", label: "Total Profit", format: "currency" },
      { key: "totalRevenue", label: "Total Revenue", format: "currency" },
    ],
    instructions: "Enter the selling price and cost of an item, and how many you sell. Margin % = (price − cost) ÷ price × 100.",
    examples: "Example: selling at $75 something that costs $45 is a 40% margin — $30 per item, or $3,000 profit on $7,500 of sales for 100 items.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do I calculate margin percentage?", answer: "Subtract cost from price, divide by price, and multiply by 100." }],
  },
  {
    slug: "markup-percentage-calculator",
    title: "Markup Percentage Calculator",
    description: "Find the markup percentage from a cost and selling price, and the markup you'd need for a target margin.",
    metaTitle: "Markup Percentage Calculator — Markup from Price",
    metaDescription: "Free markup percentage calculator. Find your markup and margin from cost and price, and the markup needed to hit a target margin.",
    calcInputs: [
      currencyField("cost", "Cost", { default: 30, max: 1000000000, step: 0.5 }),
      currencyField("sellingPrice", "Selling Price", { default: 45, max: 1000000000, step: 0.5 }),
      percentField("targetMarginPercent", "Target Margin", { default: 40, max: 95, step: 0.5 }),
    ],
    calcResult: { label: "Markup", format: "percentage" },
    calcResults: [
      { key: "markupPercent", label: "Markup Percentage", format: "percentage", highlight: true },
      { key: "marginPercent", label: "Margin Percentage", format: "percentage" },
      { key: "markupNeededForTargetMarginPercent", label: "Markup Needed for Target Margin", format: "percentage" },
      { key: "priceAtTargetMargin", label: "Price at Target Margin", format: "currency" },
    ],
    instructions: "Enter your cost and selling price. Markup % = (price − cost) ÷ cost × 100. The tool also shows the markup needed for a target margin — useful when a supplier or retailer quotes margins.",
    examples: "Example: a $30 item sold for $45 has a 50% markup but a 33.33% margin. A 40% margin needs a 66.67% markup — a $50 price.",
    assumptions: "To set a price from a markup, use the Markup Calculator. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a 50% markup the same as a 50% margin?", answer: "No — a 50% markup is a 33.3% margin. A 50% margin needs a 100% markup (doubling the cost)." }],
  },
  {
    slug: "margin-vs-markup-calculator",
    title: "Margin vs Markup Calculator",
    description: "Convert a margin percentage into the equivalent markup, or a markup into margin, and see the price and profit on a cost.",
    metaTitle: "Margin vs Markup Calculator — Convert Either Way",
    metaDescription: "Free margin vs markup calculator. Convert margin to markup or markup to margin, and see the resulting price and profit on your cost.",
    calcInputs: [
      percentField("percent", "Percentage", { default: 25, max: 1000, step: 0.5 }),
      dropdownField("entered", "That Percentage Is a", 1, [
        { label: "Margin", value: 1 },
        { label: "Markup", value: 2 },
      ]),
      currencyField("cost", "Cost (for the Example Price)", { default: 100, max: 1000000000, step: 1 }),
    ],
    calcResult: { label: "Markup", format: "percentage" },
    calcResults: [
      { key: "markupPercent", label: "Markup", format: "percentage", highlight: true },
      { key: "marginPercent", label: "Margin", format: "percentage" },
      { key: "priceOnThisCost", label: "Selling Price on This Cost", format: "currency" },
      { key: "profitOnThisCost", label: "Profit on This Cost", format: "currency" },
    ],
    instructions: "Enter a percentage and say whether it's a margin or a markup. Markup = margin ÷ (1 − margin); margin = markup ÷ (1 + markup). Enter a cost to see the price each implies.",
    examples: "Example: a 25% margin equals a 33.33% markup — on a $100 cost, a $133.33 price and $33.33 profit.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Which should I use — margin or markup?", answer: "Retail pricing is often set by markup, but financial reports and targets use margin. Just be clear which one you mean — mixing them up underprices products." }],
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
