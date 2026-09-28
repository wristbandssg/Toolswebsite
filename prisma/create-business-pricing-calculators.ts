// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the "Business Finance Calculators" sub-batch C (Pricing). Part of
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
// See src/lib/calc-engine-business-pricing.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-pricing-calculators.ts
// or
//   npm run db:create-business-pricing-calculators

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
    slug: "selling-price-calculator",
    title: "Selling Price Calculator",
    description: "Set a selling price that hits your target margin after payment or marketplace fees, and see the price with sales tax or VAT added.",
    metaTitle: "Selling Price Calculator — Margin After Fees & Tax",
    metaDescription: "Free selling price calculator. Find the price that keeps your target margin after payment or marketplace fees, plus the price including sales tax.",
    calcInputs: [
      currencyField("cost", "Cost per Item", { default: 20, max: 1000000000, step: 0.5 }),
      percentField("targetMarginPercent", "Target Margin", { default: 40, max: 90, step: 0.5 }),
      percentField("feePercent", "Payment or Marketplace Fee", { default: 3, max: 50, step: 0.1 }),
      percentField("salesTaxPercent", "Sales Tax or VAT", { default: 8, max: 30, step: 0.25 }),
    ],
    calcResult: { label: "Selling Price", format: "currency" },
    calcResults: [
      { key: "sellingPrice", label: "Selling Price (Before Tax)", format: "currency", highlight: true },
      { key: "priceIncludingSalesTax", label: "Price Including Sales Tax", format: "currency" },
      { key: "feesPerSale", label: "Fees per Sale", format: "currency" },
      { key: "profitPerSale", label: "Profit per Sale (After Fees)", format: "currency" },
    ],
    instructions: "Enter your cost, the margin you want to keep, the percentage your payment processor or marketplace takes, and any sales tax or VAT. Fees are a percentage of the price, so the tool solves for the price that still leaves your full margin.",
    examples: "Example: a $20 item with a 40% target margin and 3% fees should sell for $35.09. Fees take $1.05, leaving $14.04 profit (40%). With 8% sales tax the customer pays $37.89.",
    assumptions: "Sales tax is collected on top of the price and passed to the government, so it doesn't affect your margin. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Should my margin be calculated before or after fees?", answer: "After — fees come out of your revenue. Pricing for a margin before fees leaves you short by roughly the fee percentage." }],
  },
  {
    slug: "cost-price-calculator",
    title: "Cost Price Calculator",
    description: "Work backwards from a selling price to the cost price — the most you can pay a supplier while keeping your margin or markup.",
    metaTitle: "Cost Price Calculator — Maximum Cost to Pay",
    metaDescription: "Free cost price calculator. Work back from a selling price to the most you can pay for an item and still keep your target margin or markup.",
    calcInputs: [
      currencyField("sellingPrice", "Selling Price", { default: 60, max: 1000000000, step: 0.5 }),
      percentField("percent", "Margin or Markup You Want", { default: 40, max: 1000, step: 0.5 }),
      dropdownField("basis", "That Percentage Is a", 1, [
        { label: "Margin (of selling price)", value: 1 },
        { label: "Markup (on cost)", value: 2 },
      ]),
    ],
    calcResult: { label: "Cost Price", format: "currency" },
    calcResults: [
      { key: "costPrice", label: "Maximum Cost Price", format: "currency", highlight: true },
      { key: "profitPerSale", label: "Profit per Sale", format: "currency" },
      { key: "marginPercent", label: "Margin", format: "percentage" },
      { key: "markupPercent", label: "Markup", format: "percentage" },
    ],
    instructions: "Enter the price customers will pay, the margin or markup you need, and which one it is. The tool gives the highest cost you can accept — handy when negotiating with suppliers or deciding whether a product is worth stocking.",
    examples: "Example: to sell at $60 with a 40% margin, you can pay at most $36 — a $24 profit, which is a 66.67% markup.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do I find cost price from selling price and margin?", answer: "Cost = selling price × (1 − margin). With markup instead: cost = selling price ÷ (1 + markup)." }],
  },
  {
    slug: "pricing-calculator",
    title: "Pricing Calculator",
    description: "See what a price change would do to your sales volume, revenue and profit, using the price elasticity of demand.",
    metaTitle: "Pricing Calculator — Price Change Impact",
    metaDescription: "Free pricing calculator. Model a price increase or cut with price elasticity to see the effect on units sold, revenue and profit.",
    calcInputs: [
      currencyField("currentPrice", "Current Price", { default: 50, max: 10000000, step: 0.5 }),
      numberField("currentUnits", "Current Units Sold", { default: 1000, min: 0, max: 1000000000, step: 10 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 30, max: 10000000, step: 0.5 }),
      percentField("priceChangePercent", "Price Change (− for a Cut)", { default: 10, min: -90, max: 200, step: 1 }),
      numberField("elasticity", "Price Elasticity of Demand", { default: 1.5, min: 0, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Profit Change", format: "currency" },
    calcResults: [
      { key: "profitChange", label: "Change in Profit", format: "currency", highlight: true },
      { key: "newPrice", label: "New Price", format: "currency" },
      { key: "newUnits", label: "Expected Units at New Price", format: "number" },
      { key: "revenueChange", label: "Change in Revenue", format: "currency" },
      { key: "newContributionProfit", label: "New Profit (Before Fixed Costs)", format: "currency" },
    ],
    instructions: "Enter your current price, units and variable cost, a price change, and how sensitive customers are to price (elasticity: 1.5 means a 1% price rise loses about 1.5% of sales). Above 1 is \"elastic\" — revenue falls when price rises — but profit can still go up.",
    examples: "Example: raising a $50 price by 10% with elasticity 1.5 drops sales from 1,000 to about 867. Revenue falls $2,326.87, but because each sale earns more, profit rises $1,669.60.",
    assumptions: "Uses constant elasticity; real demand may react differently to big changes. Fixed costs are unchanged. " + GENERAL_DISCLAIMER,
    faq: [{ question: "How do I estimate price elasticity?", answer: "From past price changes or tests: elasticity ≈ % change in units ÷ % change in price. Essentials are often below 1; luxuries and products with close substitutes above 1." }],
  },
  {
    slug: "product-pricing-calculator",
    title: "Product Pricing Calculator",
    description: "Price a physical product from the ground up — materials, labor, packaging, shipping and overhead — with marketplace fees and a target margin.",
    metaTitle: "Product Pricing Calculator — Cost Build-Up",
    metaDescription: "Free product pricing calculator. Build a price from materials, labor, packaging, shipping, overhead, marketplace fees and your target margin.",
    calcInputs: [
      currencyField("materials", "Materials per Unit", { default: 8, max: 10000000, step: 0.25 }),
      currencyField("labor", "Labor per Unit", { default: 6, max: 10000000, step: 0.25 }),
      currencyField("packaging", "Packaging per Unit", { default: 1.5, max: 10000000, step: 0.25 }),
      currencyField("shipping", "Shipping per Unit", { default: 4.5, max: 10000000, step: 0.25 }),
      percentField("overheadPercent", "Overhead (% of Direct Costs)", { default: 15, max: 200, step: 1 }),
      percentField("marketplaceFeePercent", "Marketplace or Payment Fee", { default: 15, max: 50, step: 0.5 }),
      percentField("targetMarginPercent", "Target Profit Margin", { default: 30, max: 80, step: 1 }),
    ],
    calcResult: { label: "Recommended Price", format: "currency" },
    calcResults: [
      { key: "recommendedPrice", label: "Recommended Price", format: "currency", highlight: true },
      { key: "fullCostPerUnit", label: "Full Cost per Unit (with Overhead)", format: "currency" },
      { key: "directCostPerUnit", label: "Direct Cost per Unit", format: "currency" },
      { key: "marketplaceFeePerUnit", label: "Marketplace Fee per Unit", format: "currency" },
      { key: "profitPerUnit", label: "Profit per Unit", format: "currency" },
    ],
    instructions: "Enter each cost of making and delivering one unit, an overhead percentage for rent, tools and admin, your marketplace or payment fee, and the profit margin you want. Popular with makers selling on Etsy, Amazon or their own store.",
    examples: "Example: $20 of direct costs plus 15% overhead is a $23 full cost. With a 15% marketplace fee and a 30% margin, price it at $41.82 — the fee is $6.27 and you keep $12.55.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What should I include in product cost?", answer: "Everything it takes to make and deliver one unit — materials, your time, packaging, shipping — plus a share of overhead like equipment, software and rent." }],
  },
  {
    slug: "service-pricing-calculator",
    title: "Service Pricing Calculator",
    description: "Price a service job from the hours it takes, your labor cost, materials, overhead and target margin — and see the effective hourly rate.",
    metaTitle: "Service Pricing Calculator — Price a Job",
    metaDescription: "Free service pricing calculator. Price a job from hours, labor cost, materials, overhead and margin, and see your effective hourly rate.",
    calcInputs: [
      numberField("hoursPerJob", "Hours per Job", { default: 6, min: 0, max: 10000, step: 0.25 }),
      currencyField("laborCostPerHour", "Labor Cost per Hour", { default: 35, max: 100000, step: 1 }),
      currencyField("materialsPerJob", "Materials per Job", { default: 120, max: 10000000, step: 5 }),
      percentField("overheadPercent", "Overhead (% of Job Cost)", { default: 25, max: 200, step: 1 }),
      percentField("targetMarginPercent", "Target Profit Margin", { default: 30, max: 90, step: 1 }),
    ],
    calcResult: { label: "Job Price", format: "currency" },
    calcResults: [
      { key: "jobPrice", label: "Price to Quote", format: "currency", highlight: true },
      { key: "jobCost", label: "Total Job Cost", format: "currency" },
      { key: "profitPerJob", label: "Profit per Job", format: "currency" },
      { key: "effectiveHourlyRate", label: "Effective Hourly Rate Charged", format: "currency" },
    ],
    instructions: "Enter how long a typical job takes, what the labor costs per hour (wages plus payroll costs), materials, an overhead percentage for vehicles, insurance and admin, and your target margin. Great for trades, cleaning, repairs and agencies.",
    examples: "Example: 6 hours at $35 plus $120 of materials, with 25% overhead, costs $412.50. At a 30% margin quote $589.29 — $176.79 profit, or $98.21 per hour on the job.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I charge by the hour or by the job?", answer: "Flat job prices reward efficiency and are easier for customers; hourly suits unpredictable work. Either way, base the price on your full costs plus margin." }],
  },
  {
    slug: "cost-plus-pricing-calculator",
    title: "Cost Plus Pricing Calculator",
    description: "Set a cost-plus price from the FULL cost per unit — fixed costs spread over expected volume plus variable cost — and a markup.",
    metaTitle: "Cost Plus Pricing Calculator — Full Cost + Markup",
    metaDescription: "Free cost plus pricing calculator. Spread fixed costs over volume, add variable cost and a markup to set a price, with profit per unit and in total.",
    calcInputs: [
      currencyField("fixedCosts", "Fixed Costs", { default: 60000, max: 10000000000, step: 1000 }),
      numberField("expectedUnits", "Expected Units", { default: 5000, min: 1, max: 1000000000, step: 10 }),
      currencyField("variableCostPerUnit", "Variable Cost per Unit", { default: 14, max: 10000000, step: 0.5 }),
      percentField("markupPercent", "Markup on Full Cost", { default: 30, max: 500, step: 1 }),
    ],
    calcResult: { label: "Cost-Plus Price", format: "currency" },
    calcResults: [
      { key: "costPlusPrice", label: "Cost-Plus Price", format: "currency", highlight: true },
      { key: "fullCostPerUnit", label: "Full Cost per Unit", format: "currency" },
      { key: "profitPerUnit", label: "Profit per Unit", format: "currency" },
      { key: "totalProfitAtExpectedVolume", label: "Total Profit at Expected Volume", format: "currency" },
    ],
    instructions: "Enter your fixed costs, the units you expect to sell, the variable cost per unit and your markup. Cost-plus pricing (common in manufacturing and government contracts) makes sure every price covers a fair share of fixed costs.",
    examples: "Example: $60,000 of fixed costs over 5,000 units adds $12 to a $14 variable cost, a $26 full cost. A 30% markup sets the price at $33.80 — $7.80 a unit, $39,000 in total.",
    assumptions: "If you sell fewer units than expected, the full cost per unit rises and profit shrinks. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What are the drawbacks of cost-plus pricing?", answer: "It ignores what customers are willing to pay and what competitors charge, so it can leave money on the table — or price you out of the market." }],
  },
  {
    slug: "average-order-value-calculator",
    title: "Average Order Value Calculator",
    description: "Calculate average order value (AOV) and see how much extra revenue a higher AOV would bring in.",
    metaTitle: "Average Order Value Calculator — AOV & Uplift",
    metaDescription: "Free average order value calculator. Find your AOV from revenue and orders, and the extra revenue from raising it by a set percentage.",
    calcInputs: [
      currencyField("totalRevenue", "Total Revenue", { default: 84000, max: 10000000000, step: 500 }),
      numberField("numberOfOrders", "Number of Orders", { default: 1400, min: 1, max: 1000000000, step: 10 }),
      percentField("aovIncreasePercent", "AOV Increase to Test", { default: 10, max: 200, step: 1 }),
    ],
    calcResult: { label: "Average Order Value", format: "currency" },
    calcResults: [
      { key: "averageOrderValue", label: "Average Order Value", format: "currency", highlight: true },
      { key: "aovAfterIncrease", label: "AOV After the Increase", format: "currency" },
      { key: "extraRevenueFromIncrease", label: "Extra Revenue (Same Orders)", format: "currency" },
      { key: "ordersNeededForSameRevenueAtNewAov", label: "Orders Needed for Today's Revenue at the New AOV", format: "number" },
    ],
    instructions: "Enter revenue and number of orders for a period, and a percentage increase to test — from bundles, free-shipping thresholds or upsells.",
    examples: "Example: $84,000 from 1,400 orders is an AOV of $60. Raising it 10% to $66 on the same orders adds $8,400 — or you'd need only 1,273 orders to match today's revenue.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How can I increase average order value?", answer: "Product bundles, free-shipping thresholds just above your current AOV, volume discounts, and relevant add-ons at checkout are the most common methods." }],
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
