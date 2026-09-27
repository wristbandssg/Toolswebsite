// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Business Finance Calculators" batch. Third of 8 new topic
// batches built from Finance_Calculators_Topical_SEO_Master.xlsx. Filed
// under the existing "Business Finance Calculators" category
// (business-finance-calculators), created empty by
// reparent-tool-categories-under-finance.ts and populated here for the
// first time.
//
// See src/lib/calc-engine-finance-business.ts for the math.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-business-calculators.ts
// or
//   npm run db:create-finance-business-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "business-finance-calculators";

// Tools filed somewhere other than CATEGORY_SLUG. business-loan-calculator
// was moved to Loan Calculators on 27 Sep 2026 (user request, alongside the
// Loan Calculators batch) — see organize-tool-categories.ts.
const CATEGORY_OVERRIDES: Record<string, string> = {
  "business-loan-calculator": "loan-calculators",
};

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
  opts: { required?: boolean; default?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "percentage",
    unit: "%",
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: 0,
    max: opts.max ?? 200,
    step: opts.step ?? 0.5,
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
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice. For guidance specific to your business, consult a qualified accountant or financial advisor.";

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const TOOLS: ToolDef[] = [
  {
    slug: "profit-margin-calculator",
    title: "Profit Margin Calculator",
    description: "Calculate your profit margin from total revenue and total costs — a quick, all-in-one profitability check.",
    metaTitle: "Profit Margin Calculator — Free & Instant",
    metaDescription: "Free profit margin calculator. Enter your revenue and total costs to see your profit and profit margin percentage.",
    calcInputs: [
      currencyField("revenue", "Total Revenue", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("totalCosts", "Total Costs (all costs combined)", { default: 70000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Profit Margin", format: "percentage" },
    calcResults: [
      { key: "profit", label: "Profit", format: "currency" },
      { key: "profitMarginPercent", label: "Profit Margin", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your total revenue and total costs (every cost combined — cost of goods sold, operating expenses, " +
      "everything). The result shows your profit and profit margin as a percentage of revenue — a quick overall " +
      "profitability check.",
    examples: "Example: $100,000 in revenue against $70,000 in total costs gives a $30,000 profit — a 30% profit margin.",
    assumptions:
      "This is a simple, all-costs-combined view. For a breakdown that separates cost of goods sold from " +
      "operating expenses, see this site's Gross Profit Calculator, Operating Margin Calculator, or Net Profit " +
      "Calculator instead. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good profit margin?",
        answer: "It varies enormously by industry — grocery and retail often run in the low single digits, while software and services businesses commonly see 20% or higher. Compare against your specific industry's typical range rather than a universal benchmark.",
      },
      {
        question: "How is this different from the Gross Profit or Net Profit Calculator?",
        answer: "This tool uses one combined \"total costs\" figure for a quick overall check. The Gross Profit Calculator isolates cost of goods sold specifically, and the Net Profit Calculator breaks out cost of goods sold, operating expenses, and other expenses separately.",
      },
    ],
  },
  {
    slug: "gross-profit-calculator",
    title: "Gross Profit Calculator",
    description: "Calculate gross profit and gross margin from revenue and cost of goods sold (COGS).",
    metaTitle: "Gross Profit Calculator — Free & Instant",
    metaDescription: "Free gross profit calculator. Enter your revenue and cost of goods sold to see your gross profit and gross margin percentage.",
    calcInputs: [
      currencyField("revenue", "Total Revenue", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("costOfGoodsSold", "Cost of Goods Sold (COGS)", { default: 60000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Gross Margin", format: "percentage" },
    calcResults: [
      { key: "grossProfit", label: "Gross Profit", format: "currency" },
      { key: "grossMarginPercent", label: "Gross Margin", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your total revenue and cost of goods sold (COGS — the direct cost of producing what you sold: " +
      "materials, direct labor, and similar direct costs, but not overhead like rent or marketing). The result " +
      "shows your gross profit and gross margin percentage.",
    examples: "Example: $100,000 in revenue against $60,000 in COGS gives a $40,000 gross profit — a 40% gross margin.",
    assumptions:
      "COGS should include only direct production costs, not operating expenses like rent, marketing, or admin " +
      "salaries — those come out further down the income statement. See this site's Net Profit Calculator for a " +
      "figure that accounts for those too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as cost of goods sold?",
        answer: "Direct costs tied to producing what you sold — raw materials, direct labor, manufacturing overhead directly tied to production. It excludes indirect costs like rent, marketing, and administrative salaries, which are operating expenses instead.",
      },
      {
        question: "Is gross margin the same as net margin?",
        answer: "No — gross margin only accounts for COGS. Net margin (see this site's Net Profit Calculator) also subtracts operating expenses and other costs, so it's always lower than or equal to gross margin.",
      },
    ],
  },
  {
    slug: "net-profit-calculator",
    title: "Net Profit Calculator",
    description: "Calculate net profit and net margin from revenue, cost of goods sold, operating expenses, and other expenses.",
    metaTitle: "Net Profit Calculator — Free & Instant",
    metaDescription: "Free net profit calculator. Enter your revenue, COGS, operating expenses, and other expenses to see your net profit and net margin.",
    calcInputs: [
      currencyField("revenue", "Total Revenue", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("costOfGoodsSold", "Cost of Goods Sold (COGS)", { default: 60000, max: 100000000, step: 1000 }),
      currencyField("operatingExpenses", "Operating Expenses (rent, salaries, marketing, etc.)", { default: 20000, max: 100000000, step: 1000 }),
      currencyField("otherExpenses", "Other Expenses (interest, taxes, one-offs)", { required: false, default: 5000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Net Margin", format: "percentage" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency" },
      { key: "netMarginPercent", label: "Net Margin", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your total revenue, cost of goods sold, operating expenses (rent, salaries, marketing, and " +
      "similar), and any other expenses (interest, taxes, one-time costs). The result shows your net profit — " +
      "what's left after every cost — and net margin as a percentage of revenue.",
    examples: "Example: $100,000 in revenue, $60,000 COGS, $20,000 operating expenses, and $5,000 in other expenses leaves a $15,000 net profit — a 15% net margin.",
    assumptions:
      "This is the most complete profitability figure of this site's three profit calculators — it accounts for " +
      "every major cost category. Net margin is always lower than or equal to gross margin and operating " +
      "margin, since it subtracts everything they subtract, plus more. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between net profit and net income?",
        answer: "They're generally the same thing — \"net profit\" and \"net income\" are used interchangeably to mean what's left after every expense, including taxes and interest, is subtracted from revenue.",
      },
      {
        question: "Why is net margin lower than gross margin?",
        answer: "Because net margin subtracts operating expenses and other costs on top of cost of goods sold, while gross margin only accounts for COGS — net margin will always be equal to or lower than gross margin for the same business.",
      },
    ],
  },
  {
    slug: "markup-calculator",
    title: "Markup Calculator",
    description: "Calculate the selling price and profit from a product's cost and your target markup percentage.",
    metaTitle: "Markup Calculator — Free & Instant",
    metaDescription: "Free markup calculator. Enter your cost and target markup percentage to see the selling price, profit, and resulting margin.",
    calcInputs: [
      currencyField("cost", "Cost", { default: 50, max: 1000000, step: 1 }),
      percentField("markupPercent", "Markup Percentage", { default: 40, max: 500, step: 1 }),
    ],
    calcResult: { label: "Selling Price", format: "currency" },
    calcResults: [
      { key: "sellingPrice", label: "Selling Price", format: "currency", highlight: true },
      { key: "profit", label: "Profit", format: "currency" },
      { key: "resultingMarginPercent", label: "Resulting Margin (% of selling price)", format: "percentage" },
    ],
    instructions:
      "Enter your cost per unit and your target markup percentage (markup is calculated on top of COST, unlike " +
      "margin which is calculated as a percentage of the SELLING PRICE — a common point of confusion). The " +
      "result shows the selling price, your profit per unit, and what that markup translates to as a margin " +
      "percentage of the selling price.",
    examples: "Example: a $50 cost with a 40% markup gives a $70 selling price and a $20 profit — which works out to a 28.57% margin (not 40%, since margin is measured against the selling price, not the cost).",
    assumptions:
      "Markup and margin are commonly confused but aren't the same number for the same transaction — a 40% " +
      "markup on cost is always a LOWER percentage margin on selling price. This calculator shows both so you " +
      "can see the difference directly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between markup and margin?",
        answer: "Markup is profit as a percentage of COST; margin is profit as a percentage of SELLING PRICE. Because selling price is always higher than cost (when there's a profit), the same dollar profit is a bigger percentage of cost (markup) than of selling price (margin).",
      },
      {
        question: "How do I hit a specific margin instead of a markup?",
        answer: "Margin and markup convert with the formula markup% = margin% / (1 - margin%) — for example, a 25% target margin requires a 33.3% markup on cost, not a 25% markup.",
      },
    ],
  },
  {
    slug: "break-even-calculator",
    title: "Break-Even Calculator",
    description: "Calculate how many units you need to sell to cover your fixed costs, from your price, variable cost, and fixed costs.",
    metaTitle: "Break-Even Calculator — Free & Instant",
    metaDescription: "Free break-even calculator. Enter your fixed costs, price per unit, and variable cost per unit to see your break-even point in units and revenue.",
    calcInputs: [
      currencyField("fixedCosts", "Total Fixed Costs", { default: 50000, max: 100000000, step: 500 }),
      currencyField("pricePerUnit", "Price Per Unit", { default: 25, max: 1000000, step: 0.5 }),
      currencyField("variableCostPerUnit", "Variable Cost Per Unit", { default: 15, max: 1000000, step: 0.5 }),
    ],
    calcResult: { label: "Break-Even Units", format: "number" },
    calcResults: [
      { key: "breakEvenUnits", label: "Break-Even Point (Units)", format: "number", highlight: true },
      { key: "breakEvenRevenue", label: "Break-Even Revenue", format: "currency" },
      { key: "contributionMarginPerUnit", label: "Contribution Margin Per Unit", format: "currency" },
    ],
    instructions:
      "Enter your total fixed costs (rent, salaries, insurance — costs that don't change with sales volume), " +
      "your price per unit, and your variable cost per unit (materials, direct labor — costs that scale with " +
      "each unit sold). The result shows how many units you need to sell to break even, and the revenue that " +
      "represents.",
    examples: "Example: $50,000 in fixed costs, a $25 price per unit, and $15 variable cost per unit gives a $10 contribution margin per unit — meaning you need to sell 5,000 units ($125,000 in revenue) to break even.",
    assumptions:
      "If your price per unit is at or below your variable cost per unit, you can never break even by volume " +
      "alone (each sale loses money) — the calculator flags this rather than showing a misleading number. This " +
      "also assumes fixed costs and per-unit variable costs stay constant regardless of volume, which may not " +
      "hold at very large scale. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my price is lower than my variable cost?",
        answer: "Then every unit sold loses money before fixed costs are even considered — there's no break-even point by volume; you'd need to raise price, cut variable cost, or both.",
      },
      {
        question: "What's contribution margin?",
        answer: "The amount each unit sold contributes toward covering fixed costs (price minus variable cost per unit) — once enough units are sold to cover total fixed costs, every additional unit's contribution margin becomes profit.",
      },
    ],
  },
  {
    slug: "cash-flow-calculator",
    title: "Cash Flow Calculator",
    description: "Calculate your net cash flow and ending cash balance from your starting balance, cash inflows, and cash outflows.",
    metaTitle: "Cash Flow Calculator — Free & Instant",
    metaDescription: "Free cash flow calculator. Enter your starting cash balance, inflows, and outflows to see your net cash flow and ending balance.",
    calcInputs: [
      currencyField("startingCashBalance", "Starting Cash Balance", { default: 20000, max: 100000000, step: 500 }),
      currencyField("totalCashInflows", "Total Cash Inflows (this period)", { default: 80000, max: 100000000, step: 500 }),
      currencyField("totalCashOutflows", "Total Cash Outflows (this period)", { default: 65000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Ending Cash Balance", format: "currency" },
    calcResults: [
      { key: "netCashFlow", label: "Net Cash Flow", format: "currency" },
      { key: "endingCashBalance", label: "Ending Cash Balance", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your starting cash balance for the period, total cash coming in (sales collected, loans received, " +
      "and similar), and total cash going out (expenses paid, loan payments, and similar). The result shows " +
      "your net cash flow for the period and your ending cash balance.",
    examples: "Example: a $20,000 starting balance with $80,000 in cash inflows and $65,000 in cash outflows gives a $15,000 net cash flow — a $35,000 ending balance.",
    assumptions:
      "This is a simple net cash flow view (cash in vs. cash out) rather than a full cash flow statement — it " +
      "doesn't separately categorize operating, investing, and financing activities the way formal accounting " +
      "does. It also measures actual CASH movement, which can differ from profit shown on an income statement " +
      "(a sale on credit is profit but not yet cash, for example). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is cash flow the same as profit?",
        answer: "No — profit (see this site's Profit Margin, Gross Profit, and Net Profit calculators) can include revenue you've billed but not yet collected, and excludes cash items like loan principal payments. Cash flow tracks only actual cash moving in and out.",
      },
      {
        question: "Why might I be profitable but have negative cash flow?",
        answer: "Common causes include customers paying slowly (revenue booked but cash not yet collected), large loan principal payments (which reduce cash but aren't an expense on the income statement), or big one-time purchases like equipment.",
      },
    ],
  },
  {
    slug: "business-loan-calculator",
    title: "Business Loan Calculator",
    description: "Calculate your monthly payment, total interest, and total repayment on a business loan.",
    metaTitle: "Business Loan Calculator — Free & Instant",
    metaDescription: "Free business loan calculator. Enter your loan amount, interest rate, and term to see your monthly payment and total interest cost.",
    calcInputs: [
      currencyField("loanAmount", "Loan Amount", { default: 50000, max: 10000000, step: 1000 }),
      percentField("annualInterestRate", "Annual Interest Rate (APR)", { default: 8, max: 36, step: 0.1 }),
      numberField("loanTermMonths", "Loan Term (Months)", { default: 60, max: 360, step: 6 }),
    ],
    calcResult: { label: "Monthly Payment", format: "currency" },
    calcResults: [
      { key: "monthlyPayment", label: "Monthly Payment", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest", format: "currency" },
      { key: "totalRepayment", label: "Total Repayment", format: "currency" },
    ],
    instructions:
      "Enter your business loan amount, annual interest rate (APR), and term in months. The result shows your " +
      "fixed monthly payment, total interest cost, and total amount repaid over the life of the loan.",
    examples: "Example: a $50,000 loan at 8% APR over 60 months (5 years) comes to about $1,013.82 a month — $60,829.18 total repaid, or $10,829.18 in total interest.",
    assumptions:
      "This assumes a standard fixed-rate, fully amortizing loan with equal monthly payments — some business " +
      "loans (like a merchant cash advance, or a loan with interest-only or balloon payment structures) work " +
      "differently and aren't modeled here. It also doesn't include any origination fees some lenders charge. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include origination fees?",
        answer: "No — some business lenders charge an upfront origination fee (often 1-6% of the loan amount), which would add to your effective cost beyond what's shown here. Factor in any fee you're quoted separately.",
      },
      {
        question: "What if my loan has a variable rate?",
        answer: "This calculator assumes a fixed rate for the full term — for a variable-rate loan, your actual payment and total interest will change if the rate changes; re-run this calculator with an updated rate to see the new figures.",
      },
    ],
  },
  {
    slug: "operating-margin-calculator",
    title: "Operating Margin Calculator",
    description: "Calculate operating income and operating margin from revenue, cost of goods sold, and operating expenses — before interest and taxes.",
    metaTitle: "Operating Margin Calculator — Free & Instant",
    metaDescription: "Free operating margin calculator. Enter your revenue, COGS, and operating expenses to see your operating income and operating margin.",
    calcInputs: [
      currencyField("revenue", "Total Revenue", { default: 100000, max: 100000000, step: 1000 }),
      currencyField("costOfGoodsSold", "Cost of Goods Sold (COGS)", { default: 60000, max: 100000000, step: 1000 }),
      currencyField("operatingExpenses", "Operating Expenses (rent, salaries, marketing, etc.)", { default: 15000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Operating Margin", format: "percentage" },
    calcResults: [
      { key: "operatingIncome", label: "Operating Income (EBIT)", format: "currency" },
      { key: "operatingMarginPercent", label: "Operating Margin", format: "percentage", highlight: true },
    ],
    instructions:
      "Enter your total revenue, cost of goods sold, and operating expenses (rent, salaries, marketing, and " +
      "similar day-to-day costs). The result shows operating income — often called EBIT (earnings before " +
      "interest and taxes) — and operating margin as a percentage of revenue.",
    examples: "Example: $100,000 in revenue, $60,000 COGS, and $15,000 in operating expenses gives $25,000 in operating income — a 25% operating margin.",
    assumptions:
      "Operating margin deliberately excludes interest expense and taxes (that's what makes it \"operating\" — " +
      "it measures how profitable the core business is before financing and tax decisions). For a figure that " +
      "includes those, see this site's Net Profit Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What does EBIT stand for?",
        answer: "Earnings Before Interest and Taxes — another name for operating income. It's a common way to compare the core profitability of businesses with different debt loads or tax situations, since it excludes both.",
      },
      {
        question: "How is operating margin different from net margin?",
        answer: "Operating margin excludes interest and taxes; net margin (see this site's Net Profit Calculator) includes them. Operating margin is usually higher than net margin for a business that pays interest or taxes.",
      },
    ],
  },
  {
    slug: "roi-calculator",
    title: "ROI Calculator",
    description: "Calculate return on investment (ROI) — and annualized ROI — from your initial investment and final value.",
    metaTitle: "ROI Calculator — Free & Instant",
    metaDescription: "Free ROI calculator. Enter your initial investment, final value, and holding period to see your ROI and annualized ROI.",
    calcInputs: [
      currencyField("initialInvestment", "Initial Investment", { default: 10000, max: 100000000, step: 100 }),
      currencyField("finalValue", "Final Value", { default: 14000, max: 100000000, step: 100 }),
      numberField("investmentPeriodYears", "Investment Period (Years)", { default: 3, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "ROI", format: "percentage" },
    calcResults: [
      { key: "netGain", label: "Net Gain", format: "currency" },
      { key: "roiPercent", label: "Total ROI", format: "percentage", highlight: true },
      { key: "annualizedRoiPercent", label: "Annualized ROI", format: "percentage" },
    ],
    instructions:
      "Enter your initial investment amount, its final value, and how many years you held it. The result shows " +
      "your net gain, total ROI over the whole period, and annualized ROI — a year-by-year rate that lets you " +
      "compare investments held for different lengths of time.",
    examples: "Example: a $10,000 investment that grows to $14,000 over 3 years is a $4,000 net gain — a 40% total ROI, or about an 11.87% annualized ROI.",
    assumptions:
      "Total ROI is the simplest, most commonly quoted figure, but it doesn't account for HOW LONG the money " +
      "was invested — a 40% return over 1 year is very different from 40% over 10 years. Annualized ROI (using " +
      "a compound growth rate) makes investments of different lengths directly comparable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is annualized ROI lower than total ROI?",
        answer: "Because it spreads the total gain out as a compound annual rate rather than a lump sum — for any holding period longer than one year, the annualized rate will be lower than the total (cumulative) ROI, since compounding needs a smaller yearly rate to reach the same total.",
      },
      {
        question: "Does this account for additional contributions over time?",
        answer: "No — this assumes a single lump-sum investment at the start and a single final value at the end. For an investment with regular ongoing contributions, see this site's Investment Calculator instead.",
      },
    ],
  },
  {
    slug: "contribution-margin-calculator",
    title: "Contribution Margin Calculator",
    description: "Calculate contribution margin per unit and total contribution margin from price, variable cost, and units sold.",
    metaTitle: "Contribution Margin Calculator — Free & Instant",
    metaDescription: "Free contribution margin calculator. Enter your price per unit, variable cost per unit, and units sold to see your contribution margin.",
    calcInputs: [
      currencyField("pricePerUnit", "Price Per Unit", { default: 50, max: 1000000, step: 0.5 }),
      currencyField("variableCostPerUnit", "Variable Cost Per Unit", { default: 30, max: 1000000, step: 0.5 }),
      numberField("unitsSold", "Units Sold", { default: 1000, max: 100000000, step: 10 }),
    ],
    calcResult: { label: "Contribution Margin Ratio", format: "percentage" },
    calcResults: [
      { key: "contributionMarginPerUnit", label: "Contribution Margin Per Unit", format: "currency" },
      { key: "contributionMarginRatio", label: "Contribution Margin Ratio", format: "percentage", highlight: true },
      { key: "totalContributionMargin", label: "Total Contribution Margin", format: "currency" },
    ],
    instructions:
      "Enter your price per unit, variable cost per unit, and how many units you've sold (or plan to sell). The " +
      "result shows your contribution margin per unit, the contribution margin ratio (as a percentage of " +
      "price), and the total contribution margin across all units — the amount available to cover fixed costs " +
      "and generate profit.",
    examples: "Example: a $50 price per unit and $30 variable cost per unit gives a $20 contribution margin per unit (a 40% ratio) — across 1,000 units sold, that's $20,000 in total contribution margin.",
    assumptions:
      "Contribution margin measures profitability BEFORE fixed costs are subtracted — for the point at which " +
      "total contribution margin covers your fixed costs entirely (true break-even), see this site's Break-Even " +
      "Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is contribution margin different from gross profit?",
        answer: "Contribution margin subtracts only VARIABLE costs (which scale with volume); gross profit subtracts cost of goods sold, which can include some fixed manufacturing overhead. They're related but not always identical, depending on how a business classifies its costs.",
      },
      {
        question: "What's contribution margin used for?",
        answer: "It's the core input for break-even analysis (how many units cover fixed costs) and for decisions like whether a specific product, order, or customer is worth pursuing — a positive contribution margin means each additional unit sold helps cover fixed costs and, beyond that, adds profit.",
      },
    ],
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

  const overrideIds = new Map<string, string>();
  for (const slug of new Set(Object.values(CATEGORY_OVERRIDES))) {
    const override = await prisma.toolCategory.findUnique({ where: { slug } });
    if (!override) {
      throw new Error(
        `The "${slug}" category doesn't exist yet — run "npm run db:setup-finance-categories" first, then re-run this script.`
      );
    }
    overrideIds.set(slug, override.id);
  }

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const overrideSlug = CATEGORY_OVERRIDES[def.slug];
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: overrideSlug ? overrideIds.get(overrideSlug)! : category.id,
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
