// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Business Finance Calculators" sub-batch I (Inventory, Receivables & Payables). Part of
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
// See src/lib/calc-engine-business-inventory-receivables.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-inventory-receivables-calculators.ts
// or
//   npm run db:create-business-inventory-receivables-calculators

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
    slug: "inventory-turnover-calculator",
    title: "Inventory Turnover Calculator",
    description: "Calculate how many times your inventory sells through in a year and the average days it takes to sell.",
    metaTitle: "Inventory Turnover Calculator — Turns per Year",
    metaDescription: "Free inventory turnover calculator. Find inventory turns from cost of goods sold and average inventory, and the days it takes to sell your stock.",
    calcInputs: [
      currencyField("costOfGoodsSold", "Cost of Goods Sold (Year)", { default: 600000, max: 100000000000, step: 1000 }),
      currencyField("beginningInventory", "Inventory at Start of Year", { default: 110000, max: 100000000000, step: 1000 }),
      currencyField("endingInventory", "Inventory at End of Year", { default: 90000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Inventory Turnover", format: "number" },
    calcResults: [
      { key: "inventoryTurnover", label: "Inventory Turnover (Times per Year)", format: "number", highlight: true },
      { key: "daysToSellInventory", label: "Average Days to Sell Inventory", format: "number" },
      { key: "averageInventory", label: "Average Inventory", format: "currency" },
    ],
    instructions: "Enter a year's cost of goods sold and your inventory value at the start and end of the year. Higher turnover means stock moves faster and less cash is tied up on the shelves.",
    examples: "Example: $600,000 of COGS on average inventory of $100,000 is 6 turns a year — stock sells in about 60.83 days on average.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good inventory turnover?", answer: "It depends on the industry: grocery might turn 12+ times a year, while furniture or jewelry may turn 2–4 times. Compare with similar businesses." }],
  },
  {
    slug: "inventory-days-calculator",
    title: "Inventory Days Calculator",
    description: "Find how many days of inventory you're holding, and how much cash you'd free by reducing it to a target number of days.",
    metaTitle: "Inventory Days Calculator — Days on Hand (DIO)",
    metaDescription: "Free inventory days calculator. Find days of inventory on hand and the cash you'd free by bringing stock down to a target number of days.",
    calcInputs: [
      currencyField("inventoryValue", "Current Inventory Value", { default: 120000, max: 100000000000, step: 1000 }),
      currencyField("annualCostOfGoodsSold", "Annual Cost of Goods Sold", { default: 730000, max: 100000000000, step: 10000 }),
      numberField("targetDays", "Target Days of Inventory", { default: 45, min: 0, max: 1000, step: 1 }),
    ],
    calcResult: { label: "Days of Inventory", format: "number" },
    calcResults: [
      { key: "daysOfInventoryOnHand", label: "Days of Inventory on Hand", format: "number", highlight: true },
      { key: "cashFreedAtTarget", label: "Cash Freed at Target Days", format: "currency" },
      { key: "inventoryAtTargetDays", label: "Inventory at Target Days", format: "currency" },
      { key: "dailyCostOfGoodsSold", label: "Daily Cost of Goods Sold", format: "currency" },
    ],
    instructions: "Enter your current inventory value, a year's COGS and the number of days of stock you'd like to hold. Days of inventory = inventory ÷ daily COGS.",
    examples: "Example: $120,000 of stock at $2,000 of COGS a day is 60 days on hand. Cutting to 45 days ($90,000) would free $30,000 of cash.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Is fewer inventory days always better?", answer: "Up to a point — too little stock causes missed sales and rush orders. Aim for the lowest level that still meets demand reliably." }],
  },
  {
    slug: "economic-order-quantity-calculator",
    title: "Economic Order Quantity (EOQ) Calculator",
    description: "Find the economic order quantity — the order size that minimizes your combined ordering and holding costs.",
    metaTitle: "EOQ Calculator — Economic Order Quantity",
    metaDescription: "Free EOQ calculator. Find the order size that minimizes ordering and holding costs, orders per year and days between orders.",
    calcInputs: [
      numberField("annualDemandUnits", "Annual Demand (Units)", { default: 12000, min: 0, max: 1000000000, step: 100 }),
      currencyField("costPerOrder", "Cost per Order (Admin, Delivery)", { default: 75, max: 1000000, step: 1 }),
      currencyField("holdingCostPerUnitPerYear", "Holding Cost per Unit per Year", { default: 2, max: 1000000, step: 0.1 }),
    ],
    calcResult: { label: "EOQ", format: "number" },
    calcResults: [
      { key: "economicOrderQuantity", label: "Economic Order Quantity (Units)", format: "number", highlight: true },
      { key: "ordersPerYear", label: "Orders per Year", format: "number" },
      { key: "daysBetweenOrders", label: "Days Between Orders", format: "number" },
      { key: "annualOrderingCost", label: "Annual Ordering Cost", format: "currency" },
      { key: "annualHoldingCost", label: "Annual Holding Cost", format: "currency" },
    ],
    instructions: "Enter yearly demand, the cost of placing one order, and the cost of holding one unit for a year (storage, insurance, the cost of the cash tied up). EOQ = √(2 × demand × order cost ÷ holding cost).",
    examples: "Example: 12,000 units a year at $75 per order and $2 a year to hold each unit gives an EOQ of 949 units — about 12.65 orders a year, every 28.86 days. At the EOQ, ordering and holding costs are equal ($948.68 each).",
    assumptions: "Assumes steady demand, fixed prices (no bulk discounts) and instant restocking. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Why are ordering and holding costs equal at the EOQ?", answer: "That's where their total is lowest — ordering more often raises order costs, ordering less often raises holding costs." }],
  },
  {
    slug: "reorder-point-calculator",
    title: "Reorder Point Calculator",
    description: "Find when to reorder stock — demand during the supplier lead time plus safety stock for the service level you want.",
    metaTitle: "Reorder Point Calculator — With Safety Stock",
    metaDescription: "Free reorder point calculator. Find the stock level to reorder at from daily demand, lead time and safety stock for your service level.",
    calcInputs: [
      numberField("averageDailyDemand", "Average Daily Demand (Units)", { default: 40, min: 0, max: 10000000, step: 1 }),
      numberField("leadTimeDays", "Supplier Lead Time (Days)", { default: 10, min: 0, max: 365, step: 1 }),
      numberField("dailyDemandStdDev", "Daily Demand Variation (Std. Deviation)", { default: 8, min: 0, max: 10000000, step: 1 }),
      dropdownField("serviceLevelZ", "Service Level (Chance of No Stock-Out)", 1.65, [
        { label: "90%", value: 1.28 },
        { label: "95%", value: 1.65 },
        { label: "97.5%", value: 1.96 },
        { label: "99%", value: 2.33 },
      ]),
    ],
    calcResult: { label: "Reorder Point", format: "number" },
    calcResults: [
      { key: "reorderPoint", label: "Reorder Point (Units)", format: "number", highlight: true },
      { key: "safetyStock", label: "Safety Stock (Units)", format: "number" },
      { key: "demandDuringLeadTime", label: "Demand During Lead Time", format: "number" },
    ],
    instructions: "Enter average daily sales, how many days suppliers take to deliver, how much daily demand varies, and how safe you want to be. When stock falls to the reorder point, place an order.",
    examples: "Example: 40 units a day over a 10-day lead time is 400 units of demand. At a 95% service level with demand varying by 8 a day, you need 42 units of safety stock, so reorder at 442.",
    assumptions: "Safety stock = z × demand variation × √lead time; assumes the lead time itself is steady. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is safety stock?", answer: "Extra inventory held to cover higher-than-usual demand or delays during the lead time, so you don't run out." }],
  },
  {
    slug: "inventory-carrying-cost-calculator",
    title: "Inventory Carrying Cost Calculator",
    description: "Calculate the yearly cost of holding inventory — cost of capital, storage, insurance and taxes, and shrinkage or obsolescence.",
    metaTitle: "Inventory Carrying Cost Calculator — Holding Cost",
    metaDescription: "Free inventory carrying cost calculator. Add capital, storage, insurance and shrinkage costs to find the yearly cost of holding your stock.",
    calcInputs: [
      currencyField("averageInventoryValue", "Average Inventory Value", { default: 200000, max: 100000000000, step: 1000 }),
      percentField("costOfCapitalPercent", "Cost of Capital", { default: 8, max: 50, step: 0.5 }),
      percentField("storagePercent", "Storage and Handling", { default: 6, max: 50, step: 0.5 }),
      percentField("insuranceAndTaxesPercent", "Insurance and Taxes", { default: 2, max: 20, step: 0.25 }),
      percentField("shrinkageObsolescencePercent", "Shrinkage and Obsolescence", { default: 5, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Annual Carrying Cost", format: "currency" },
    calcResults: [
      { key: "annualCarryingCost", label: "Annual Carrying Cost", format: "currency", highlight: true },
      { key: "carryingCostRatePercent", label: "Carrying Cost Rate", format: "percentage" },
      { key: "monthlyCarryingCost", label: "Monthly Carrying Cost", format: "currency" },
      { key: "costOfCapitalPortion", label: "Of Which Cost of Capital", format: "currency" },
    ],
    instructions: "Enter your average inventory value and each carrying cost as a yearly percentage of that value. Carrying costs of 20–30% a year are common, which is why excess stock is expensive.",
    examples: "Example: $200,000 of average inventory at 8% + 6% + 2% + 5% = 21% costs $42,000 a year to hold ($3,500 a month), $16,000 of it the cost of capital.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is inventory carrying cost?", answer: "Everything it costs to keep stock on hand — the money tied up, warehouse space, insurance, taxes, and losses from damage, theft or items going out of date." }],
  },
  {
    slug: "accounts-receivable-turnover-calculator",
    title: "Accounts Receivable Turnover Calculator",
    description: "Calculate how many times a year you collect your receivables and the average number of days customers take to pay.",
    metaTitle: "Accounts Receivable Turnover Calculator — Collection Days",
    metaDescription: "Free accounts receivable turnover calculator. Find receivables turnover and average collection days from credit sales and receivables.",
    calcInputs: [
      currencyField("netCreditSales", "Net Credit Sales (Year)", { default: 1200000, max: 100000000000, step: 10000 }),
      currencyField("beginningReceivables", "Receivables at Start of Year", { default: 140000, max: 100000000000, step: 1000 }),
      currencyField("endingReceivables", "Receivables at End of Year", { default: 160000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Receivables Turnover", format: "number" },
    calcResults: [
      { key: "receivablesTurnover", label: "Receivables Turnover (Times per Year)", format: "number", highlight: true },
      { key: "averageCollectionDays", label: "Average Collection Period (Days)", format: "number" },
      { key: "averageReceivables", label: "Average Receivables", format: "currency" },
    ],
    instructions: "Enter a year's sales made on credit (invoiced, not paid upfront) and your receivables at the start and end of the year. Higher turnover means customers pay faster.",
    examples: "Example: $1.2 million of credit sales on average receivables of $150,000 is a turnover of 8 — customers take about 45.63 days to pay.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How can I collect receivables faster?", answer: "Invoice promptly, offer early-payment discounts, make paying easy online, and follow up on overdue invoices quickly." }],
  },
  {
    slug: "accounts-payable-turnover-calculator",
    title: "Accounts Payable Turnover Calculator",
    description: "Calculate how many times a year you pay off your suppliers and the average days you take to pay them.",
    metaTitle: "Accounts Payable Turnover Calculator — Days to Pay",
    metaDescription: "Free accounts payable turnover calculator. Find payables turnover and the average days you take to pay suppliers from purchases and payables.",
    calcInputs: [
      currencyField("supplierPurchases", "Purchases from Suppliers (Year)", { default: 800000, max: 100000000000, step: 10000 }),
      currencyField("beginningPayables", "Payables at Start of Year", { default: 90000, max: 100000000000, step: 1000 }),
      currencyField("endingPayables", "Payables at End of Year", { default: 70000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Payables Turnover", format: "number" },
    calcResults: [
      { key: "payablesTurnover", label: "Payables Turnover (Times per Year)", format: "number", highlight: true },
      { key: "averageDaysToPaySuppliers", label: "Average Days to Pay Suppliers", format: "number" },
      { key: "averagePayables", label: "Average Payables", format: "currency" },
    ],
    instructions: "Enter a year's purchases on credit from suppliers and your accounts payable at the start and end of the year. Lower turnover (more days) keeps cash longer — but paying too slowly can hurt supplier relationships.",
    examples: "Example: $800,000 of purchases on average payables of $80,000 is a turnover of 10 — you pay suppliers in about 36.5 days.",
    assumptions: "Cost of goods sold is sometimes used in place of purchases. " + GENERAL_DISCLAIMER,
    faq: [{ question: "Is a low payables turnover good?", answer: "It means you hold cash longer, which helps cash flow — as long as you still pay within terms and don't miss early-payment discounts worth more than the cash." }],
  },
  {
    slug: "days-sales-outstanding-calculator",
    title: "Days Sales Outstanding (DSO) Calculator",
    description: "Calculate days sales outstanding for any period, compare it with your payment terms, and see the cash tied up in late payments.",
    metaTitle: "DSO Calculator — Days Sales Outstanding",
    metaDescription: "Free DSO calculator. Find days sales outstanding for any period, how far it runs past your payment terms, and the cash tied up.",
    calcInputs: [
      currencyField("accountsReceivable", "Accounts Receivable (End of Period)", { default: 95000, max: 100000000000, step: 1000 }),
      currencyField("creditSalesInPeriod", "Credit Sales in the Period", { default: 250000, max: 100000000000, step: 1000 }),
      numberField("daysInPeriod", "Days in the Period", { default: 90, min: 1, max: 366, step: 1 }),
      numberField("paymentTermsDays", "Your Payment Terms (Days)", { default: 30, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "DSO", format: "number" },
    calcResults: [
      { key: "daysSalesOutstanding", label: "Days Sales Outstanding", format: "number", highlight: true },
      { key: "daysBeyondTerms", label: "Days Beyond Your Terms", format: "number" },
      { key: "cashTiedUpBeyondTerms", label: "Cash Tied Up Beyond Terms", format: "currency" },
      { key: "receivablesIfPaidOnTerms", label: "Receivables If Customers Paid on Terms", format: "currency" },
    ],
    instructions: "Enter receivables at the end of a period, credit sales during it, the number of days, and your payment terms. DSO = receivables ÷ credit sales × days.",
    examples: "Example: $95,000 of receivables on $250,000 of quarterly credit sales is a DSO of 34.2 days — 4.2 days past 30-day terms, tying up about $11,666.67 extra.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good DSO?", answer: "Close to your payment terms. A DSO well above your terms means customers are paying late; watch the trend month to month." }],
  },
  {
    slug: "days-payable-outstanding-calculator",
    title: "Days Payable Outstanding (DPO) Calculator",
    description: "Calculate days payable outstanding for any period, and the cash you'd keep by paying suppliers on your full terms.",
    metaTitle: "DPO Calculator — Days Payable Outstanding",
    metaDescription: "Free DPO calculator. Find days payable outstanding for any period, days left on supplier terms, and the cash gained by paying on full terms.",
    calcInputs: [
      currencyField("accountsPayable", "Accounts Payable (End of Period)", { default: 60000, max: 100000000000, step: 1000 }),
      currencyField("costOfGoodsSoldInPeriod", "Cost of Goods Sold in the Period", { default: 180000, max: 100000000000, step: 1000 }),
      numberField("daysInPeriod", "Days in the Period", { default: 90, min: 1, max: 366, step: 1 }),
      numberField("supplierTermsDays", "Supplier Payment Terms (Days)", { default: 45, min: 0, max: 365, step: 1 }),
    ],
    calcResult: { label: "DPO", format: "number" },
    calcResults: [
      { key: "daysPayableOutstanding", label: "Days Payable Outstanding", format: "number", highlight: true },
      { key: "daysLeftOnTerms", label: "Days Left on Supplier Terms", format: "number" },
      { key: "cashGainedByPayingOnFullTerms", label: "Cash Kept by Paying on Full Terms", format: "currency" },
    ],
    instructions: "Enter payables at the end of a period, cost of goods sold during it, the number of days, and your suppliers' terms. DPO = payables ÷ COGS × days.",
    examples: "Example: $60,000 of payables on $180,000 of quarterly COGS is a DPO of 30 days. With 45-day terms, paying on the last allowed day would keep about $30,000 more cash in the business.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I pay suppliers as late as possible?", answer: "Within the agreed terms, paying on the due date keeps cash working for you. Paying later than agreed risks fees and supplier trust — and early-payment discounts can be worth more than the cash." }],
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
