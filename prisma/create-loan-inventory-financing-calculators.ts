// One-time (but safe to re-run) batch setup script: creates the Inventory Financing Loan tools
// (7) of the Loan Calculators expansion 3, filed under Loan Calculators > General Loan Calculators.
// See src/lib/calc-engine-loan-inventory-financing.ts for the math and
// src/lib/calc-engine-loan-sba.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-loan-inventory-financing-calculators.ts
// or
//   npm run db:create-loan-inventory-financing-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY_SLUG = "loan-calculators";
const CATEGORY = { name: "General Loan Calculators", slug: "general-loan-calculators" };

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. " +
  "Actual rates, fees, and terms depend on the lender and your credit profile — check your loan agreement " +
  "or ask your lender for exact figures.";

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
    slug: "inventory-financing-loan-calculator",
    title: "Inventory Financing Loan Calculator",
    description: "Estimate how much you can borrow against your inventory and what it costs: the advance, monthly interest, origination fee and total cost while the stock sells.",
    metaTitle: "Inventory Financing Calculator — Advance & Cost",
    metaDescription: "Free inventory financing loan calculator. See how much you can borrow against stock, the monthly interest, fees and total cost.",
    calcInputs: [
      currencyField("inventoryValue", "Inventory Value (at Cost)", { default: 200000, max: 100000000, step: 1000 }),
      percentField("advanceRatePercent", "Lender's Advance Rate", { default: 60, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.25 }),
      numberField("monthsOutstanding", "Months Until Repaid", { default: 4, min: 0, max: 36, step: 0.5 }),
      percentField("originationFeePercent", "Origination Fee", { default: 1.5, max: 10, step: 0.1, required: false }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "loanAmount", label: "Loan Amount (Advance)", format: "currency" },
      { key: "monthlyInterest", label: "Monthly Interest", format: "currency" },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "originationFee", label: "Origination Fee", format: "currency" },
      { key: "totalCost", label: "Total Cost", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the cost value of the inventory you'll pledge, the share the lender advances (often 50%–80% of cost, " +
      "lower for perishable or specialized stock), the rate, how long until it's repaid, and any origination fee. " +
      "Inventory financing is common before a busy season, when you need to stock up before the sales come in.",
    examples:
      "Example: $200,000 of inventory at a 60% advance rate supports a $120,000 loan. At " +
      "12%, interest is $1,200 a month — $4,800 over 4 months. " +
      "With a $1,800 fee, the total cost is $6,600.",
    assumptions:
      "Interest on the full advance for the whole period, repaid in one go (interest-only). If you repay as items sell, " +
      "the cost will be lower. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is inventory financing?",
        answer: "A loan or credit line secured by your inventory. If you don't repay, the lender can take and sell the stock — so it usually lends well below its value.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-payment-calculator",
    title: "Inventory Financing Loan Payment Calculator",
    description: "Find the monthly payment on an inventory term loan and what it costs per unit sold — and as a share of the gross profit those sales bring in.",
    metaTitle: "Inventory Loan Payment Calculator — Per Unit Sold",
    metaDescription: "Free inventory financing payment calculator. See the monthly payment, the payment per unit sold, and its share of gross profit.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 100000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 11, max: 40, step: 0.25 }),
      numberField("termMonths", "Loan Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
      numberField("unitsPerMonth", "Units Sold per Month", { default: 400, min: 0, max: 10000000, step: 10 }),
      currencyField("grossProfitPerUnit", "Gross Profit per Unit", { default: 45, max: 1000000, step: 1 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "paymentPerUnitSold", label: "Payment per Unit Sold", format: "currency" },
      { key: "paymentShareOfGrossProfit", label: "Payment as Share of Gross Profit", format: "percentage" },
    ],
    instructions:
      "Enter the loan, rate and term, then how many units you sell a month and the gross profit on each (price minus " +
      "cost). Seeing the payment per unit shows whether the stock you financed earns enough to repay the loan.",
    examples:
      "Example: a $100,000 inventory loan at 11% over 12 months costs $8,838.17 a " +
      "month. Selling 400 units, that's $22.10 per unit — 49.10% of the " +
      "gross profit at $45 a unit.",
    assumptions:
      "Fixed rate, equal monthly payments, steady sales. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if the payment is more than my gross profit?",
        answer: "Then the inventory isn't paying for itself on that schedule — ask for a longer term, borrow less, or improve margins before borrowing.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-payoff-calculator",
    title: "Inventory Financing Loan Payoff Calculator",
    description: "When you repay as stock sells, see how long the loan takes to clear at your sell-through rate — and how much interest faster sales would save.",
    metaTitle: "Inventory Loan Payoff Calculator — Sell-Through",
    metaDescription: "Free inventory financing payoff calculator. See payoff time and interest when you repay as inventory sells, and the saving from faster sales.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 150000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.25 }),
      percentField("sellThroughPercent", "Share of the Financed Stock Sold Each Month", { default: 15, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Months to Pay Off", format: "number" },
    calcResults: [
      { key: "principalRepaidPerMonth", label: "Principal Repaid per Month", format: "currency" },
      { key: "monthsToPayoff", label: "Months to Pay Off", format: "number", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "interestIfSellingTwiceAsFast", label: "Interest If Selling Twice as Fast", format: "currency" },
      { key: "savingsFromFasterSales", label: "Saving From Faster Sales", format: "currency" },
    ],
    instructions:
      "Many inventory lenders are repaid as each item sells: you pay back the amount advanced on that item, plus " +
      "interest on what's still outstanding. Enter the loan, rate, and the share of the financed stock you sell each " +
      "month. Slow-moving inventory costs more because the balance stays high longer.",
    examples:
      "Example: a $150,000 loan at 12%, with 15% of the stock selling each month, is " +
      "repaid at $22,500 a month and clears in 7 months, costing $5,775. " +
      "Selling twice as fast would cut interest to $3,300 — $2,475 saved.",
    assumptions:
      "Sales are steady; interest is charged monthly on the remaining balance. Lenders may also require payment by a " +
      "fixed date even if stock hasn't sold. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if inventory doesn't sell?",
        answer: "Many lenders require 'curtailment' payments — paying down part of the advance on aged stock — or full repayment by a set date.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-interest-calculator",
    title: "Inventory Financing Loan Interest Calculator",
    description: "Calculate the financing cost of each unit by the days it sits in stock — floor-plan style — and how much of the unit's margin that eats up.",
    metaTitle: "Inventory Financing Interest Calculator — Per Unit",
    metaDescription: "Free inventory financing interest calculator. See interest per day and per unit by days in stock, its share of margin, and break-even days.",
    calcInputs: [
      currencyField("unitCost", "Financed Cost per Unit", { default: 30000, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate", { default: 9, max: 40, step: 0.25 }),
      numberField("daysInStock", "Days in Stock", { default: 75, min: 0, max: 1000, step: 1 }),
      currencyField("flatFeePerUnit", "Flat Fee per Unit (Audit / Handling)", { default: 75, max: 100000, step: 5, required: false }),
      currencyField("grossMarginPerUnit", "Gross Margin per Unit", { default: 2500, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Financing Cost per Unit", format: "currency" },
    calcResults: [
      { key: "interestPerDay", label: "Interest per Day", format: "currency" },
      { key: "interestPerUnit", label: "Interest per Unit", format: "currency" },
      { key: "totalCostPerUnit", label: "Financing Cost per Unit", format: "currency", highlight: true },
      { key: "shareOfUnitMargin", label: "Share of the Unit's Margin", format: "percentage" },
      { key: "breakEvenDays", label: "Days Until Financing Eats the Whole Margin", format: "number" },
    ],
    instructions:
      "Dealers of cars, boats, equipment and other big-ticket items often finance each unit separately (a 'floor " +
      "plan'), paying interest for every day it's unsold. Enter the financed cost, rate, days in stock, any per-unit " +
      "fee, and the gross margin you'll make on the sale.",
    examples:
      "Example: a $30,000 unit at 9% costs $7.40 a day. After 75 days, " +
      "interest is $554.79, or $629.79 with the $75 fee — 25.19% of a " +
      "$2,500 margin. After 327 days, financing would wipe out the whole margin.",
    assumptions:
      "Simple daily interest on a 365-day year; no curtailment payments. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is floor plan financing?",
        answer: "A revolving credit line that finances each item of a dealer's inventory; the dealer repays each item's advance when it sells.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-affordability-calculator",
    title: "Inventory Financing Loan Affordability Calculator",
    description: "Find how much inventory financing you can carry by keeping its interest within a share of your monthly gross profit, and the stock needed as collateral.",
    metaTitle: "Inventory Financing Affordability Calculator",
    metaDescription: "Free inventory financing affordability calculator. Set a financing budget from gross profit and see the max loan and collateral needed.",
    calcInputs: [
      currencyField("monthlyGrossProfit", "Monthly Gross Profit", { default: 40000, max: 100000000, step: 1000 }),
      percentField("maxSharePercent", "Maximum Share for Financing Cost", { default: 10, max: 100, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate", { default: 12, max: 40, step: 0.25 }),
      percentField("advanceRatePercent", "Lender's Advance Rate", { default: 60, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Maximum Loan Amount", format: "currency" },
    calcResults: [
      { key: "monthlyFinancingBudget", label: "Monthly Interest Budget", format: "currency" },
      { key: "maxLoanAmount", label: "Maximum Loan Amount", format: "currency", highlight: true },
      { key: "inventoryNeededAsCollateral", label: "Inventory Needed as Collateral", format: "currency" },
    ],
    instructions:
      "Enter your monthly gross profit (sales minus cost of goods), the most of it you'd spend on financing, the rate, " +
      "and the lender's advance rate. The calculator finds the largest balance whose monthly interest fits the budget " +
      "and the inventory needed to back it.",
    examples:
      "Example: $40,000 of gross profit with 10% for financing gives a $4,000 " +
      "monthly interest budget. At 12%, that carries a $400,000 balance, which needs " +
      "$666,666.67 of inventory at a 60% advance rate.",
    assumptions:
      "Interest-only: the balance is rolled over as stock is replaced. Fees aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of my profit should go to financing?",
        answer: "There's no fixed rule, but keeping interest to a small share of gross profit leaves room for rent, payroll and slow months.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-comparison-calculator",
    title: "Inventory Financing Loan Comparison Calculator",
    description: "Compare an inventory loan with a business line of credit for the same amount and period — fees included — and see the effective annual rate of each.",
    metaTitle: "Inventory Loan vs Line of Credit Calculator",
    metaDescription: "Free inventory financing comparison calculator. Compare an inventory loan and a business line of credit by total cost and effective rate.",
    calcInputs: [
      currencyField("amount", "Amount Needed", { default: 100000, max: 100000000, step: 1000 }),
      numberField("months", "Months Borrowed", { default: 6, min: 0, max: 60, step: 0.5 }),
      percentField("invRatePercent", "Inventory Loan — Rate", { default: 12, max: 40, step: 0.25 }),
      percentField("invFeePercent", "Inventory Loan — Origination Fee", { default: 1.5, max: 10, step: 0.1, required: false }),
      percentField("locRatePercent", "Line of Credit — Rate", { default: 10, max: 40, step: 0.25 }),
      percentField("locDrawFeePercent", "Line of Credit — Draw Fee", { default: 1, max: 10, step: 0.1, required: false }),
      currencyField("locAnnualFee", "Line of Credit — Annual Fee", { default: 500, max: 100000, step: 50, required: false }),
    ],
    calcResult: { label: "Savings With the Line of Credit", format: "currency" },
    calcResults: [
      { key: "inventoryLoanCost", label: "Inventory Loan — Total Cost", format: "currency" },
      { key: "lineOfCreditCost", label: "Line of Credit — Total Cost", format: "currency" },
      { key: "inventoryLoanEffectiveRate", label: "Inventory Loan — Effective Annual Rate", format: "percentage" },
      { key: "lineOfCreditEffectiveRate", label: "Line of Credit — Effective Annual Rate", format: "percentage" },
      { key: "savingsWithLineOfCredit", label: "Savings With the Line of Credit", format: "currency", highlight: true },
    ],
    instructions:
      "Enter the amount, how long you'll need it, and each option's rate and fees. Lines of credit are often cheaper " +
      "but need stronger credit and financials; inventory loans are easier to get because the stock secures them. A " +
      "negative saving means the inventory loan is cheaper.",
    examples:
      "Example: $100,000 for 6 months costs $7,500 as an inventory loan (12% + " +
      "1.50% fee) — an effective 15% a year. A line of credit at 10% with a " +
      "1% draw fee and $500 annual fee costs $6,250 " +
      "(12.50%), saving $1,250.",
    assumptions:
      "The full amount is outstanding for the whole period with simple interest; the annual fee is prorated. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I use a line of credit to buy inventory?",
        answer: "Yes — it's one of the most common uses. You draw when you buy stock and repay as it sells, paying interest only on what you use.",
      },
    ],
  },
  {
    slug: "inventory-financing-loan-eligibility-calculator",
    title: "Inventory Financing Loan Eligibility Calculator",
    description: "Work out your inventory borrowing base: eligible stock after excluding slow-moving or obsolete items, the lender's advance, and your inventory turnover.",
    metaTitle: "Inventory Financing Eligibility — Borrowing Base",
    metaDescription: "Free inventory financing eligibility calculator. See eligible inventory, your borrowing base, the amount you can get, and turnover.",
    calcInputs: [
      currencyField("inventoryValue", "Total Inventory (at Cost)", { default: 300000, max: 100000000, step: 1000 }),
      percentField("ineligiblePercent", "Slow-Moving, Obsolete or Consigned Stock", { default: 15, max: 100, step: 1 }),
      percentField("advanceRatePercent", "Lender's Advance Rate", { default: 50, max: 100, step: 1 }),
      currencyField("requestedAmount", "Amount You Want to Borrow", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("annualCogs", "Annual Cost of Goods Sold", { default: 1200000, max: 1000000000, step: 10000 }),
    ],
    calcResult: { label: "Borrowing Base", format: "currency" },
    calcResults: [
      { key: "eligibleInventory", label: "Eligible Inventory", format: "currency" },
      { key: "borrowingBase", label: "Borrowing Base", format: "currency", highlight: true },
      { key: "approvableAmount", label: "Amount You Could Borrow", format: "currency" },
      { key: "shortfall", label: "Shortfall vs Your Request", format: "currency" },
      { key: "inventoryTurnover", label: "Inventory Turnover (Times per Year)", format: "number" },
    ],
    instructions:
      "Lenders don't lend against all your stock. They exclude items that are slow-moving, obsolete, damaged, on " +
      "consignment or already pledged, then advance a percentage of the rest. Enter your total inventory, the share " +
      "that's ineligible, the advance rate, what you want to borrow, and your yearly cost of goods sold — lenders " +
      "favor stock that turns over quickly.",
    examples:
      "Example: $300,000 of inventory with 15% excluded leaves $255,000 eligible. At " +
      "50%, the borrowing base is $127,500, short of the $150,000 request by " +
      "$22,500. With $1,200,000 of cost of goods sold, inventory turns 4 times a year.",
    assumptions:
      "Lenders also review credit, financial statements and inventory reports, and may require field exams. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good inventory turnover?",
        answer: "It depends on the industry — grocery turns very fast, furniture and jewelry slowly. Lenders compare you with peers and favor faster-moving stock.",
      },
    ],
  },
];

async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY_SLUG } });
  if (!parent) {
    throw new Error(
      `The "${PARENT_CATEGORY_SLUG}" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
        "then re-run this script."
    );
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
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
