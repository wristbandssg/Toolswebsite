// One-time (but safe to re-run) batch setup script: creates 8 markup and pricing method tools
// from the user's shopping list (Shopping Calculators > Pricing, Markup & Seller Fee Calculators).
// See src/lib/calc-engine-shopping-price-markup.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-price-markup-calculators.ts
// or
//   npm run db:create-shopping-price-markup-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Pricing, Markup & Seller Fee Calculators", slug: "pricing-markup-seller-fee-calculators" };

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
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
}

interface ToolDef {
  slug: string;
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

const MARGIN_NOTE = "Markup is profit as a percentage of cost; margin is profit as a percentage of the selling price — a 50% markup is only a 33% margin.";

const TOOLS: ToolDef[] = [
  {
    slug: "labor-markup-calculator",
    title: "Labor Markup Calculator",
    description: "Turn a worker's hourly wage into a profitable bill rate — adding labor burden, overhead and non-billable time, then your target profit margin.",
    metaTitle: "Labor Markup Calculator — Hourly Bill Rate",
    metaDescription: "Free labor markup calculator. Add labor burden, overhead and non-billable time to an hourly wage and find the bill rate for your target margin.",
    calcInputs: [
      currencyField("hourlyWage", "Worker's Hourly Wage", { default: 28, max: 1000, step: 0.25 }),
      percentField("burdenPercent", "Labor Burden (Taxes, Insurance, Benefits)", { default: 30, max: 100, step: 1 }),
      currencyField("overheadPerHour", "Overhead per Paid Hour", { default: 12, max: 1000, step: 0.5, required: false }),
      percentField("billablePercent", "Share of Paid Hours That Are Billable", { default: 80, max: 100, step: 1 }),
      percentField("profitMargin", "Target Profit Margin", { default: 20, max: 80, step: 1 }),
    ],
    calcResult: { label: "Bill Rate", format: "currency" },
    calcResults: [
      { key: "billRate", label: "Hourly Bill Rate", format: "currency", highlight: true },
      { key: "burdenedWage", label: "Burdened Wage", format: "currency" },
      { key: "breakEvenRate", label: "Break-Even Rate per Billed Hour", format: "currency" },
      { key: "profitPerBilledHour", label: "Profit per Billed Hour", format: "currency" },
      { key: "markupOnWage", label: "Markup on the Wage", format: "percentage" },
    ],
    instructions:
      "Enter the worker's hourly wage and the labor burden — payroll taxes, workers' comp, insurance and benefits, typically 25–40% of wages. Add overhead per paid hour (vehicles, tools, office, admin).\n\n" +
      "Set the share of paid hours you can actually bill (travel and shop time aren't billable) and your target profit margin.",
    examples: "Example: a $28 wage with 30% burden and $12 of overhead per hour, billing 80% of hours. Each billed hour costs $60.50; for a 20% margin, charge $75.62 — a 170.09% markup on the wage.",
    assumptions: "Bill rate = (wage × (1 + burden) + overhead) ÷ billable share ÷ (1 − margin). " + MARGIN_NOTE,
    faq: [
      { question: "How much should I mark up labor?", answer: "Most trades bill two to three times the hourly wage once burden, overhead, non-billable time and profit are covered." },
      { question: "What is labor burden?", answer: "Costs on top of wages: payroll taxes, workers' comp, unemployment insurance, health insurance, retirement and paid time off — often 25–40% of wages." },
    ],
  },
  {
    slug: "parts-markup-calculator",
    title: "Parts Markup Calculator",
    description: "Price parts with a repair-shop parts matrix — a higher markup on cheap parts and a lower one on expensive parts — or your own markup, with margin and profit.",
    metaTitle: "Parts Markup Calculator — Parts Pricing Matrix",
    metaDescription: "Free parts markup calculator. Price auto and repair parts with a sliding parts matrix or custom markup, and see margin and gross profit.",
    calcInputs: [
      currencyField("partCost", "Your Cost per Part", { default: 85, max: 1000000, step: 0.01 }),
      numberField("quantity", "Quantity", { default: 2, min: 1, max: 10000 }),
      percentField("customMarkup", "Custom Markup (0 = Use the Matrix)", { default: 0, max: 500, step: 1, required: false }),
    ],
    calcResult: { label: "Price Each", format: "currency" },
    calcResults: [
      { key: "priceEach", label: "Price to Charge Each", format: "currency", highlight: true },
      { key: "totalPrice", label: "Total Parts Price", format: "currency" },
      { key: "markupPercent", label: "Markup", format: "percentage" },
      { key: "grossMargin", label: "Gross Margin", format: "percentage" },
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
    ],
    instructions:
      "Enter your cost for the part and the quantity. Leave custom markup at 0 to use the sliding matrix, or enter your own markup.",
    examples: "Example: a part costing $85 falls in the $50–$100 band of the matrix (75% markup), so charge $148.75 each — $297.50 for two, a 42.86% margin and $127.50 profit.",
    assumptions: "Matrix used: up to $10 → 150% markup; $10–$50 → 100%; $50–$100 → 75%; $100–$250 → 60%; $250–$500 → 45%; over $500 → 35%. Shops tune their matrix to the local market and their target gross profit on parts (often 40–50%). " + MARGIN_NOTE,
    faq: [
      { question: "What is a parts matrix?", answer: "A pricing table that applies a higher markup to cheap parts and a lower one to expensive parts, so the shop earns a fair profit without overpricing big-ticket items." },
      { question: "What is a typical markup on auto parts?", answer: "Shops often aim for about 40–50% gross margin on parts overall, which means markups from around 35% on expensive parts to 100%+ on cheap ones." },
    ],
  },
  {
    slug: "contractor-markup-calculator",
    title: "Contractor Markup Calculator",
    description: "Build a contractor bid from materials, labor, subcontractors and equipment with separate markups, overhead and profit — and see the overall markup and real profit margin.",
    metaTitle: "Contractor Markup Calculator — Bid Price & Margin",
    metaDescription: "Free contractor markup calculator. Mark up materials, labor and subs, add overhead and profit, and find your bid price and true profit margin.",
    calcInputs: [
      currencyField("materials", "Materials", { default: 12000, max: 100000000, step: 10 }),
      percentField("materialMarkup", "Material Markup", { default: 15, max: 100, step: 1 }),
      currencyField("labor", "Labor Cost", { default: 9000, max: 100000000, step: 10 }),
      percentField("laborMarkup", "Labor Markup", { default: 0, max: 200, step: 1, required: false }),
      currencyField("subcontractors", "Subcontractors", { default: 6000, max: 100000000, step: 10, required: false }),
      percentField("subMarkup", "Subcontractor Markup", { default: 10, max: 100, step: 1, required: false }),
      currencyField("equipment", "Equipment, Permits & Disposal", { default: 1500, max: 10000000, step: 10, required: false }),
      percentField("overheadPercent", "Overhead (% of Direct Costs)", { default: 12, max: 50, step: 0.5 }),
      percentField("profitPercent", "Profit Added", { default: 10, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Bid Price", format: "currency" },
    calcResults: [
      { key: "bidPrice", label: "Bid Price", format: "currency", highlight: true },
      { key: "directCosts", label: "Direct Costs", format: "currency" },
      { key: "overhead", label: "Overhead", format: "currency" },
      { key: "grossProfit", label: "Net Profit on the Job", format: "currency" },
      { key: "overallMarkup", label: "Overall Markup on Direct Costs", format: "percentage" },
      { key: "profitMargin", label: "Net Profit Margin", format: "percentage" },
    ],
    instructions:
      "Enter the job's costs — materials, labor, subcontractors and equipment/permits — and the markup you apply to each (materials and subs are often marked up 10–20%).\n\n" +
      "Add overhead as a percentage of direct costs and the profit you add on top.",
    examples: "Example: $12,000 materials (+15%), $9,000 labor, $6,000 subs (+10%) and $1,500 equipment, with 12% overhead and 10% profit. The bid is $37,752.00, an overall markup of 32.46% on $28,500.00 of direct costs, for a 15.45% net margin.",
    assumptions: "Overhead is figured on direct costs and covered by the bid; net profit = bid − direct costs − overhead. Residential remodelers commonly need a 30–50% markup to reach a 10–20% net margin. " + MARGIN_NOTE,
    faq: [
      { question: "What markup should a contractor use?", answer: "Often 30% to 50% on direct costs for residential work, enough to cover overhead (10–20%) and leave a 10–20% profit." },
      { question: "Should I mark up materials?", answer: "Most contractors do, typically 10–25%, to cover sourcing, handling, waste and warranty risk." },
    ],
  },
  {
    slug: "staffing-markup-calculator",
    title: "Staffing Markup Calculator",
    description: "Calculate a staffing agency bill rate from the worker's pay rate and markup, the employer burden, and the gross margin per hour and per week.",
    metaTitle: "Staffing Markup Calculator — Agency Bill Rate",
    metaDescription: "Free staffing markup calculator. Find the bill rate from pay rate and markup, subtract burden, and see gross margin per hour and per week.",
    calcInputs: [
      currencyField("payRate", "Worker's Pay Rate per Hour", { default: 22, max: 1000, step: 0.25 }),
      percentField("markupPercent", "Markup", { default: 50, max: 300, step: 1 }),
      percentField("burdenPercent", "Employer Burden (FICA, Unemployment, Workers' Comp)", { default: 18, max: 60, step: 0.5 }),
      numberField("hoursPerWeek", "Hours per Week", { unit: "hours", default: 40, max: 80 }),
    ],
    calcResult: { label: "Bill Rate", format: "currency" },
    calcResults: [
      { key: "billRate", label: "Bill Rate", format: "currency", highlight: true },
      { key: "spread", label: "Spread (Bill − Pay)", format: "currency" },
      { key: "burdenCost", label: "Burden per Hour", format: "currency" },
      { key: "grossMarginPerHour", label: "Gross Margin per Hour", format: "currency" },
      { key: "grossMarginPercent", label: "Gross Margin %", format: "percentage" },
      { key: "weeklyGrossMargin", label: "Weekly Gross Margin", format: "currency" },
    ],
    instructions:
      "Enter the worker's pay rate, the markup you charge the client and your employer burden — FICA (7.65%), federal and state unemployment, workers' comp and any benefits.",
    examples: "Example: a $22 pay rate with a 50% markup bills at $33.00. After 18% burden ($3.96 an hour), the gross margin is $7.04 an hour — $281.60 for a 40-hour week.",
    assumptions: "Bill rate = pay × (1 + markup). Burden is paid by the agency out of the spread. Typical light-industrial markups are 35–60%; professional and IT staffing 50–100%. Overtime is usually billed at 1.5× the bill rate.",
    faq: [
      { question: "What is a typical staffing agency markup?", answer: "About 35% to 60% for light industrial and clerical roles, and 50% to 100% for skilled, IT or professional roles." },
      { question: "What's included in staffing burden?", answer: "Employer FICA (7.65%), FUTA and SUTA unemployment taxes, workers' comp, and any benefits or paid time off." },
    ],
  },
  {
    slug: "wholesale-price-calculator",
    title: "Wholesale Price Calculator",
    description: "Set a wholesale price from your unit cost and target margin, and see the suggested retail price at the retailer's markup (keystone or otherwise) and each side's profit.",
    metaTitle: "Wholesale Price Calculator — Wholesale & MSRP",
    metaDescription: "Free wholesale price calculator. Set your wholesale price from cost and margin, find the suggested retail price and both sides' profit per unit.",
    calcInputs: [
      currencyField("unitCost", "Your Cost per Unit", { default: 6, max: 1000000, step: 0.01 }),
      percentField("wholesaleMargin", "Your Wholesale Margin", { default: 50, max: 90, step: 1 }),
      numberField("retailMultiplier", "Retailer's Multiplier (Keystone = 2)", { default: 2, min: 1, max: 5, step: 0.1 }),
    ],
    calcResult: { label: "Wholesale Price", format: "currency" },
    calcResults: [
      { key: "wholesalePrice", label: "Wholesale Price", format: "currency", highlight: true },
      { key: "suggestedRetail", label: "Suggested Retail Price (MSRP)", format: "currency" },
      { key: "yourProfitPerUnit", label: "Your Profit per Unit", format: "currency" },
      { key: "retailerProfitPerUnit", label: "Retailer's Profit per Unit", format: "currency" },
      { key: "retailerMargin", label: "Retailer's Margin", format: "percentage" },
      { key: "costShareOfRetail", label: "Your Cost as % of Retail", format: "percentage" },
    ],
    instructions:
      "Enter your full cost per unit (materials, labor, packaging), the margin you want on wholesale orders and the multiplier retailers in your industry use.",
    examples: "Example: a $6 product at a 50% wholesale margin sells to stores for $12.00. With keystone pricing (2×) it retails at $24.00, leaving you $6.00 and the retailer $12.00 a unit.",
    assumptions: "Wholesale price = cost ÷ (1 − margin); retail = wholesale × multiplier. Keystone (2×) is common in gifts, apparel and handmade goods; grocery and electronics use much smaller multipliers. Your cost should be under about 25% of retail to sell wholesale profitably.",
    faq: [
      { question: "How do you calculate wholesale price?", answer: "Divide your cost by (1 − your target margin). A $6 cost at 50% margin gives a $12 wholesale price." },
      { question: "What is keystone pricing?", answer: "Retailers doubling the wholesale price to set the retail price — a 100% markup, or 50% margin." },
    ],
  },
  {
    slug: "pricing-strategy-calculator",
    title: "Pricing Strategy Calculator",
    description: "Compare three pricing strategies side by side — cost-plus, competitor-based and target-margin — with the margin and break-even sales volume for each.",
    metaTitle: "Pricing Strategy Calculator — Compare 3 Methods",
    metaDescription: "Free pricing strategy calculator. Compare cost-plus, competitor-based and target-margin prices, with margins and break-even units for each.",
    calcInputs: [
      currencyField("unitCost", "Variable Cost per Unit", { default: 18, max: 1000000, step: 0.01 }),
      currencyField("fixedCosts", "Fixed Costs per Month", { default: 6000, max: 100000000, step: 10, required: false }),
      percentField("markupPercent", "Cost-Plus Markup", { default: 60, max: 500, step: 1 }),
      currencyField("competitorPrice", "Main Competitor's Price", { default: 34, max: 1000000, step: 0.01 }),
      percentField("positioning", "Your Price vs Competitor (− Below, + Above)", { default: -5, min: -50, max: 100, step: 1 }),
      percentField("targetMargin", "Target Margin", { default: 45, max: 90, step: 1 }),
    ],
    calcResult: { label: "Target-Margin Price", format: "currency" },
    calcResults: [
      { key: "targetMarginPrice", label: "Target-Margin Price", format: "currency", highlight: true },
      { key: "costPlusPrice", label: "Cost-Plus Price", format: "currency" },
      { key: "competitivePrice", label: "Competitor-Based Price", format: "currency" },
      { key: "competitiveMargin", label: "Margin at the Competitor-Based Price", format: "percentage" },
      { key: "breakEvenUnitsTarget", label: "Break-Even Units — Target Margin", format: "number" },
      { key: "breakEvenUnitsCostPlus", label: "Break-Even Units — Cost-Plus", format: "number" },
      { key: "breakEvenUnitsCompetitive", label: "Break-Even Units — Competitor-Based", format: "number" },
    ],
    instructions:
      "Enter your variable cost per unit and monthly fixed costs. Then set a cost-plus markup, your main competitor's price and where you want to sit relative to it, and a target margin.\n\n" +
      "Compare the three prices and how many units each needs to sell to cover fixed costs.",
    examples: "Example: an $18 product with $6,000 of monthly fixed costs. Cost-plus at 60% gives $28.80, pricing 5% under a $34 competitor gives $32.30 (44.27% margin), and a 45% margin needs $32.73. To cover fixed costs you need 408 sales a month at the target-margin price, but 556 at the cost-plus price.",
    assumptions: "Break-even units = fixed costs ÷ (price − variable cost). Cost-plus ignores what customers will pay; competitor-based ignores your costs; target margin ignores both demand and competition — which is why comparing all three is useful. Demand at each price isn't modelled.",
    faq: [
      { question: "What are the main pricing strategies?", answer: "Cost-plus (cost + markup), competitor-based (priced against rivals), value-based (priced on customer value), and target-margin pricing." },
      { question: "Which pricing strategy is best?", answer: "It depends on your market. Many businesses start with cost-plus as a floor, check competitor prices, then price toward the value customers see." },
    ],
  },
  {
    slug: "value-based-pricing-calculator",
    title: "Value-Based Pricing Calculator",
    description: "Set a value-based price from the customer's next best alternative plus the value of your advantages, minus any drawbacks, and the share of that extra value you keep.",
    metaTitle: "Value-Based Pricing Calculator — EVC Price",
    metaDescription: "Free value-based pricing calculator. Find the economic value to the customer from their next best alternative and set a price that shares it.",
    calcInputs: [
      currencyField("alternativePrice", "Price of the Customer's Next Best Alternative", { default: 120, max: 10000000, step: 1 }),
      currencyField("positiveValue", "Extra Value of Your Advantages", { default: 80, max: 10000000, step: 1 }),
      currencyField("negativeValue", "Cost of Your Drawbacks to the Customer", { default: 10, max: 10000000, step: 1, required: false }),
      percentField("valueShare", "Share of the Extra Value You Keep", { default: 60, max: 100, step: 5 }),
      currencyField("unitCost", "Your Cost per Unit", { default: 55, max: 10000000, step: 1, required: false }),
    ],
    calcResult: { label: "Recommended Price", format: "currency" },
    calcResults: [
      { key: "recommendedPrice", label: "Recommended Price", format: "currency", highlight: true },
      { key: "economicValueToCustomer", label: "Economic Value to the Customer", format: "currency" },
      { key: "customerSurplus", label: "Value Left for the Customer", format: "currency" },
      { key: "profitPerUnit", label: "Profit per Unit", format: "currency" },
      { key: "margin", label: "Margin", format: "percentage" },
      { key: "premiumOverAlternative", label: "Premium Over the Alternative", format: "percentage" },
    ],
    instructions:
      "Enter the price of what the customer would buy instead. Put a dollar value on what makes yours better (time saved, lower running costs, better results) and on any drawbacks (switching costs, missing features).\n\n" +
      "Choose how much of the extra value to capture — leaving some gives customers a reason to switch.",
    examples: "Example: the alternative costs $120, your advantages are worth $80 and drawbacks cost $10, so the economic value is $190.00. Keeping 60% of the extra value gives a price of $162.00 — a 66.05% margin on a $55 cost, with $28.00 of value left for the customer.",
    assumptions: "Economic value to the customer (EVC) = reference price + positive differentiation − negative differentiation. Price = reference price + share × (EVC − reference price). The hard part is putting honest dollar values on differences — customer interviews help.",
    faq: [
      { question: "What is value-based pricing?", answer: "Setting your price on what the product is worth to the customer compared with their alternatives, rather than on your costs." },
      { question: "How much of the value should I charge for?", answer: "Commonly 50% to 80% of the extra value you create, so customers still feel they're getting a good deal." },
    ],
  },
  {
    slug: "dropshipping-profit-calculator",
    title: "Dropshipping Profit Calculator",
    description: "Calculate dropshipping profit per order after the supplier's price and shipping, platform and payment fees, ad cost per sale and refunds — plus your break-even ROAS.",
    metaTitle: "Dropshipping Profit Calculator — Margin & ROAS",
    metaDescription: "Free dropshipping profit calculator. Find profit per order after supplier, shipping, fees, ads and refunds, plus break-even ad cost and ROAS.",
    calcInputs: [
      currencyField("sellingPrice", "Selling Price", { default: 39.99, max: 100000, step: 0.01 }),
      currencyField("shippingCharged", "Shipping Charged to Customer", { default: 0, max: 1000, step: 0.01, required: false }),
      currencyField("supplierCost", "Supplier Product Cost", { default: 11, max: 100000, step: 0.01 }),
      currencyField("supplierShipping", "Supplier Shipping Cost", { default: 4.5, max: 1000, step: 0.01, required: false }),
      percentField("platformFee", "Platform / App Fees", { default: 2, max: 30, step: 0.1, required: false }),
      percentField("paymentRate", "Payment Processing Rate", { default: 2.9, max: 10, step: 0.1 }),
      currencyField("paymentFixed", "Payment Fixed Fee", { default: 0.3, max: 5, step: 0.01 }),
      currencyField("adCostPerSale", "Ad Cost per Sale (CPA)", { default: 12, max: 10000, step: 0.01 }),
      percentField("refundRate", "Refunds & Chargebacks", { default: 3, max: 50, step: 0.5, required: false }),
      numberField("ordersPerMonth", "Orders per Month", { default: 300, max: 1000000, required: false }),
    ],
    calcResult: { label: "Profit per Order", format: "currency" },
    calcResults: [
      { key: "profitPerOrder", label: "Profit per Order", format: "currency", highlight: true },
      { key: "profitMargin", label: "Profit Margin", format: "percentage" },
      { key: "totalCostPerOrder", label: "Total Cost per Order", format: "currency" },
      { key: "breakEvenAdCost", label: "Break-Even Ad Cost per Sale", format: "currency" },
      { key: "breakEvenRoas", label: "Break-Even ROAS", format: "number" },
      { key: "monthlyProfit", label: "Monthly Profit", format: "currency" },
    ],
    instructions:
      "Enter the selling price and any shipping you charge, the supplier's product and shipping costs, your platform and payment fees, and what you pay in ads for each sale.\n\n" +
      "Add a refund rate and your monthly orders to see monthly profit.",
    examples: "Example: a $39.99 product costing $15.50 delivered, with 2% app fees, 2.9% + 30¢ processing, $12 ad cost per sale and 3% refunds. Profit is $9.03 an order (22.58%); you break even at $21.03 of ad spend per sale, a ROAS of 1.9.",
    assumptions: "Refunds are treated as lost revenue (products are rarely returned to the supplier). ROAS = revenue ÷ ad spend; break-even ROAS is the lowest you can run ads at without losing money. Store subscription and app monthly costs aren't spread per order here.",
    faq: [
      { question: "What is a good profit margin for dropshipping?", answer: "Around 15% to 30% after ad costs is healthy; many products look profitable before ads and lose money after." },
      { question: "What is break-even ROAS?", answer: "The return on ad spend at which ads pay for themselves exactly — revenue divided by profit before ads. Below it, every sale loses money." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
