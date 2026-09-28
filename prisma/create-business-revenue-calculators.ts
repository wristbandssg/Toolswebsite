// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Business Finance Calculators" sub-batch D (Revenue, Recurring Revenue & Sales). Part of
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
// See src/lib/calc-engine-business-revenue.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-business-revenue-calculators.ts
// or
//   npm run db:create-business-revenue-calculators

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
    slug: "revenue-growth-calculator",
    title: "Revenue Growth Calculator",
    description: "Measure year-over-year revenue growth across three years and your average (compound) yearly growth rate.",
    metaTitle: "Revenue Growth Calculator — Year-over-Year Growth",
    metaDescription: "Free revenue growth calculator. Enter three years of revenue to see year-over-year growth, total growth and the average yearly growth rate.",
    calcInputs: [
      currencyField("year1Revenue", "Year 1 Revenue", { default: 400000, max: 10000000000, step: 1000 }),
      currencyField("year2Revenue", "Year 2 Revenue", { default: 460000, max: 10000000000, step: 1000 }),
      currencyField("year3Revenue", "Year 3 Revenue", { default: 552000, max: 10000000000, step: 1000 }),
    ],
    calcResult: { label: "Average Yearly Growth", format: "percentage" },
    calcResults: [
      { key: "averageYearlyGrowthPercent", label: "Average Yearly Growth (Compound)", format: "percentage", highlight: true },
      { key: "growthYear1To2Percent", label: "Growth Year 1 → 2", format: "percentage" },
      { key: "growthYear2To3Percent", label: "Growth Year 2 → 3", format: "percentage" },
      { key: "totalGrowthPercent", label: "Total Growth over Two Years", format: "percentage" },
    ],
    instructions: "Enter revenue for three consecutive years. The tool shows each year's growth and the compound average, which smooths out an uneven year.",
    examples: "Example: $400,000 → $460,000 → $552,000 is 15% then 20% growth — 38% in total, an average of 17.47% a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why not just average the two growth rates?", answer: "A simple average (17.5%) slightly overstates it; the compound rate is the steady yearly growth that gets you from the first figure to the last." }],
  },
  {
    slug: "monthly-revenue-calculator",
    title: "Monthly Revenue Calculator",
    description: "Estimate monthly revenue for a shop, café or service business from customers per day, average spend and days open.",
    metaTitle: "Monthly Revenue Calculator — Customers × Spend",
    metaDescription: "Free monthly revenue calculator. Estimate monthly revenue from daily customers, average spend and days open, plus your yearly run rate.",
    calcInputs: [
      numberField("customersPerDay", "Customers per Day", { default: 80, min: 0, max: 1000000, step: 1 }),
      currencyField("averageSpend", "Average Spend per Customer", { default: 18, max: 1000000, step: 0.5 }),
      numberField("daysOpenPerMonth", "Days Open per Month", { default: 26, min: 0, max: 31, step: 1 }),
    ],
    calcResult: { label: "Monthly Revenue", format: "currency" },
    calcResults: [
      { key: "monthlyRevenue", label: "Monthly Revenue", format: "currency", highlight: true },
      { key: "dailyRevenue", label: "Daily Revenue", format: "currency" },
      { key: "customersPerMonth", label: "Customers per Month", format: "number" },
      { key: "annualRunRate", label: "Yearly Run Rate", format: "currency" },
    ],
    instructions: "Enter how many customers you serve on an average day, what each spends, and the days you're open in a month. Useful for business plans and checking whether a location can work.",
    examples: "Example: 80 customers a day spending $18, open 26 days, is $1,440 a day and $37,440 a month (2,080 customers) — a $449,280 yearly run rate.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How can I grow monthly revenue?", answer: "Get more customers, raise the average spend (upsells, bundles, prices) or open more days — improving any one of the three raises revenue." }],
  },
  {
    slug: "annual-revenue-calculator",
    title: "Annual Revenue Calculator",
    description: "Project next year's revenue from this month's revenue and a monthly growth rate, and compare it with the simple run rate.",
    metaTitle: "Annual Revenue Calculator — Projection with Growth",
    metaDescription: "Free annual revenue calculator. Project the next 12 months of revenue from this month and a monthly growth rate, vs the simple ×12 run rate.",
    calcInputs: [
      currencyField("currentMonthlyRevenue", "This Month's Revenue", { default: 30000, max: 10000000000, step: 500 }),
      percentField("monthlyGrowthPercent", "Monthly Growth Rate", { default: 3, min: -50, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Projected Annual Revenue", format: "currency" },
    calcResults: [
      { key: "projectedAnnualRevenue", label: "Revenue over the Next 12 Months", format: "currency", highlight: true },
      { key: "simpleRunRate", label: "Simple Run Rate (× 12)", format: "currency" },
      { key: "extraFromGrowth", label: "Extra from Growth", format: "currency" },
      { key: "monthlyRevenueInMonth12", label: "Monthly Revenue in Month 12", format: "currency" },
    ],
    instructions: "Enter this month's revenue and the monthly growth rate you expect. The tool grows revenue month by month for the next 12 months and adds it up.",
    examples: "Example: $30,000 a month growing 3% a month adds up to $438,533.71 over the next 12 months — $78,533.71 more than the $360,000 run rate — reaching $42,772.83 a month by month 12.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What is a revenue run rate?", answer: "Current revenue extended over a full year — for example this month × 12. It's quick but ignores growth and seasonality." }],
  },
  {
    slug: "recurring-revenue-calculator",
    title: "Recurring Revenue Calculator",
    description: "Project subscription revenue over the next 12 months from your current subscribers, new sign-ups and monthly churn.",
    metaTitle: "Recurring Revenue Calculator — Subscriptions",
    metaDescription: "Free recurring revenue calculator. Project subscribers and recurring revenue 12 months ahead from sign-ups and churn, and your steady-state size.",
    calcInputs: [
      numberField("currentSubscribers", "Current Subscribers", { default: 500, min: 0, max: 100000000, step: 10 }),
      currencyField("monthlyPrice", "Monthly Price", { default: 29, max: 1000000, step: 1 }),
      numberField("newSubscribersPerMonth", "New Subscribers per Month", { default: 60, min: 0, max: 10000000, step: 5 }),
      percentField("monthlyChurnPercent", "Monthly Churn", { default: 4, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "MRR in 12 Months", format: "currency" },
    calcResults: [
      { key: "monthlyRecurringRevenueIn12Months", label: "Monthly Recurring Revenue in 12 Months", format: "currency", highlight: true },
      { key: "subscribersIn12Months", label: "Subscribers in 12 Months", format: "number" },
      { key: "revenueCollectedOver12Months", label: "Revenue Collected over 12 Months", format: "currency" },
      { key: "steadyStateSubscribers", label: "Size Where Sign-Ups Only Replace Churn", format: "number" },
    ],
    instructions: "Enter your subscriber count, price, how many new subscribers join each month and what percentage cancel each month. The tool shows where you'll be in a year, and the size at which growth stalls because churn equals new sign-ups.",
    examples: "Example: 500 subscribers at $29, adding 60 a month with 4% churn, grow to 887 — $25,731.42 of monthly recurring revenue — collecting $252,445.99 over the year. Growth levels off around 1,500 subscribers.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Why does churn matter so much?", answer: "Churn caps your size: at 4% monthly churn, 60 new subscribers a month can never grow you past about 1,500. Halving churn doubles that ceiling." }],
  },
  {
    slug: "monthly-recurring-revenue-calculator",
    title: "Monthly Recurring Revenue (MRR) Calculator",
    description: "Calculate MRR and its movements — new, expansion, contraction and churned MRR — plus net revenue retention.",
    metaTitle: "MRR Calculator — Monthly Recurring Revenue",
    metaDescription: "Free MRR calculator. Track new, expansion, contraction and churned MRR to find ending MRR, net new MRR, growth and net revenue retention.",
    calcInputs: [
      currencyField("startingMrr", "Starting MRR", { default: 50000, max: 10000000000, step: 500 }),
      currencyField("newMrr", "New MRR (New Customers)", { default: 6000, max: 10000000000, step: 100 }),
      currencyField("expansionMrr", "Expansion MRR (Upgrades)", { default: 2500, max: 10000000000, step: 100 }),
      currencyField("contractionMrr", "Contraction MRR (Downgrades)", { default: 800, max: 10000000000, step: 100 }),
      currencyField("churnedMrr", "Churned MRR (Cancellations)", { default: 2200, max: 10000000000, step: 100 }),
    ],
    calcResult: { label: "Ending MRR", format: "currency" },
    calcResults: [
      { key: "endingMrr", label: "Ending MRR", format: "currency", highlight: true },
      { key: "netNewMrr", label: "Net New MRR", format: "currency" },
      { key: "mrrGrowthPercent", label: "MRR Growth This Month", format: "percentage" },
      { key: "netRevenueRetentionPercent", label: "Net Revenue Retention (Monthly)", format: "percentage" },
      { key: "annualizedRunRate", label: "Annualized Run Rate", format: "currency" },
    ],
    instructions: "Enter last month's MRR and this month's movements: new customers, upgrades, downgrades and cancellations. Net revenue retention shows how much of last month's revenue you kept from existing customers alone.",
    examples: "Example: $50,000 of MRR plus $6,000 new and $2,500 expansion, minus $800 contraction and $2,200 churn, ends at $55,500 — 11% growth. Existing customers kept 99% of their revenue.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What counts as MRR?", answer: "Predictable subscription revenue normalized to a month — annual plans divided by 12. One-time fees and usage spikes are left out." }],
  },
  {
    slug: "annual-recurring-revenue-calculator",
    title: "Annual Recurring Revenue (ARR) Calculator",
    description: "Calculate annual recurring revenue from monthly subscriptions and annual contracts — excluding one-time fees — and the gap to your ARR target.",
    metaTitle: "ARR Calculator — Annual Recurring Revenue",
    metaDescription: "Free ARR calculator. Combine monthly subscriptions and annual contracts into annual recurring revenue, leave out one-time fees, and see your gap to target.",
    calcInputs: [
      currencyField("monthlySubscriptionRevenue", "Monthly Subscription Revenue (MRR)", { default: 40000, max: 10000000000, step: 500 }),
      currencyField("annualContractsValue", "Annual Contracts (Yearly Value)", { default: 180000, max: 10000000000, step: 1000 }),
      currencyField("oneTimeFees", "One-Time Fees (Setup, Services)", { default: 25000, max: 10000000000, step: 500 }),
      currencyField("targetArr", "ARR Target", { default: 1000000, max: 10000000000, step: 10000 }),
    ],
    calcResult: { label: "ARR", format: "currency" },
    calcResults: [
      { key: "annualRecurringRevenue", label: "Annual Recurring Revenue", format: "currency", highlight: true },
      { key: "fromMonthlySubscriptions", label: "From Monthly Subscriptions", format: "currency" },
      { key: "excludedOneTimeFees", label: "One-Time Fees (Not Counted)", format: "currency" },
      { key: "gapToTargetArr", label: "Gap to ARR Target", format: "currency" },
    ],
    instructions: "Enter your monthly subscription revenue, the yearly value of annual contracts, any one-time fees, and your ARR goal. One-time fees are shown but not counted, because they don't recur.",
    examples: "Example: $40,000 of MRR ($480,000 a year) plus $180,000 of annual contracts is $660,000 of ARR — $340,000 short of a $1 million target. The $25,000 of setup fees isn't included.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between ARR and revenue?", answer: "ARR counts only recurring subscription revenue at today's rate. Total revenue also includes one-time fees and services, and reflects when money was actually earned." }],
  },
  {
    slug: "average-revenue-per-user-calculator",
    title: "Average Revenue Per User (ARPU) Calculator",
    description: "Calculate ARPU across all users and ARPPU across paying users, per month and per year.",
    metaTitle: "ARPU Calculator — Average Revenue per User",
    metaDescription: "Free ARPU calculator. Find average revenue per user and per paying user (ARPPU) per month and year, and your share of paying users.",
    calcInputs: [
      currencyField("revenue", "Revenue for the Period", { default: 120000, max: 10000000000, step: 500 }),
      numberField("totalUsers", "Total Active Users", { default: 20000, min: 1, max: 10000000000, step: 100 }),
      numberField("payingUsers", "Paying Users", { default: 1500, min: 1, max: 10000000000, step: 10 }),
      numberField("monthsInPeriod", "Months in the Period", { default: 1, min: 1, max: 24, step: 1 }),
    ],
    calcResult: { label: "ARPU per Month", format: "currency" },
    calcResults: [
      { key: "arpuPerMonth", label: "ARPU per Month (All Users)", format: "currency", highlight: true },
      { key: "arppuPerMonth", label: "ARPPU per Month (Paying Users)", format: "currency" },
      { key: "payingUserSharePercent", label: "Share of Users Who Pay", format: "percentage" },
      { key: "arpuPerYear", label: "ARPU per Year", format: "currency" },
    ],
    instructions: "Enter revenue for a period, total active users, paying users and the number of months the revenue covers. Freemium apps and games track both: ARPU across everyone, ARPPU across payers.",
    examples: "Example: $120,000 in a month from 20,000 users is an ARPU of $6 ($72 a year). Only 1,500 (7.5%) pay, so ARPPU is $80.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between ARPU and ARPPU?", answer: "ARPU divides revenue by all users, including free ones; ARPPU divides it only by paying users." }],
  },
  {
    slug: "revenue-per-employee-calculator",
    title: "Revenue Per Employee Calculator",
    description: "Measure productivity with revenue and profit per full-time-equivalent employee, counting part-timers as half.",
    metaTitle: "Revenue Per Employee Calculator — Productivity",
    metaDescription: "Free revenue per employee calculator. Find revenue and profit per full-time-equivalent employee to measure your team's productivity.",
    calcInputs: [
      currencyField("annualRevenue", "Annual Revenue", { default: 3600000, max: 100000000000, step: 10000 }),
      numberField("fullTimeEmployees", "Full-Time Employees", { default: 22, min: 0, max: 10000000, step: 1 }),
      numberField("partTimeEmployees", "Part-Time Employees", { default: 6, min: 0, max: 10000000, step: 1 }),
      currencyField("netProfit", "Annual Net Profit", { default: 360000, max: 100000000000, step: 1000 }),
    ],
    calcResult: { label: "Revenue per Employee", format: "currency" },
    calcResults: [
      { key: "revenuePerEmployee", label: "Revenue per Employee (FTE)", format: "currency", highlight: true },
      { key: "profitPerEmployee", label: "Profit per Employee (FTE)", format: "currency" },
      { key: "fullTimeEquivalents", label: "Full-Time Equivalents", format: "number" },
      { key: "monthlyRevenuePerEmployee", label: "Monthly Revenue per Employee", format: "currency" },
    ],
    instructions: "Enter annual revenue, full-time and part-time headcount, and net profit. Part-timers count as half a full-time equivalent (FTE).",
    examples: "Example: $3.6 million of revenue with 22 full-timers and 6 part-timers (25 FTE) is $144,000 per employee, and $14,400 of profit per employee.",
    assumptions: "Compare with businesses in the same industry — labor-heavy services naturally have lower figures than software or distribution. " + GENERAL_DISCLAIMER,
    faq: [{ question: "What is a good revenue per employee?", answer: "It depends on the industry: many service businesses run $100,000–$200,000, while large tech companies often exceed $1 million." }],
  },
  {
    slug: "sales-revenue-calculator",
    title: "Sales Revenue Calculator",
    description: "Calculate net sales — gross sales minus returns, allowances and discounts — and how much of gross sales those deductions take.",
    metaTitle: "Sales Revenue Calculator — Gross to Net Sales",
    metaDescription: "Free sales revenue calculator. Find gross sales and net sales after returns, allowances and discounts, and the deductions as a share of gross.",
    calcInputs: [
      numberField("unitsSold", "Units Sold", { default: 5000, min: 0, max: 1000000000, step: 10 }),
      currencyField("pricePerUnit", "Price per Unit", { default: 45, max: 10000000, step: 0.5 }),
      currencyField("returns", "Returns", { default: 6000, max: 10000000000, step: 100 }),
      currencyField("allowances", "Allowances (Price Reductions for Defects)", { default: 1500, max: 10000000000, step: 100 }),
      currencyField("discounts", "Sales Discounts", { default: 4500, max: 10000000000, step: 100 }),
    ],
    calcResult: { label: "Net Sales", format: "currency" },
    calcResults: [
      { key: "netSales", label: "Net Sales", format: "currency", highlight: true },
      { key: "grossSales", label: "Gross Sales", format: "currency" },
      { key: "totalDeductions", label: "Total Deductions", format: "currency" },
      { key: "deductionsPercentOfGross", label: "Deductions as % of Gross Sales", format: "percentage" },
    ],
    instructions: "Enter units sold and price, then returns, allowances and discounts for the same period. Net sales is the figure that appears as revenue at the top of an income statement.",
    examples: "Example: 5,000 units at $45 is $225,000 of gross sales. Returns, allowances and discounts of $12,000 (5.33%) leave $213,000 of net sales.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "What's the difference between gross and net sales?", answer: "Gross sales is everything invoiced; net sales subtracts returns, allowances and discounts — what you actually keep." }],
  },
  {
    slug: "sales-growth-calculator",
    title: "Sales Growth Calculator",
    description: "Measure month-over-month and year-over-year sales growth, and what this month's growth rate would mean over a full year.",
    metaTitle: "Sales Growth Calculator — Month & Year Growth",
    metaDescription: "Free sales growth calculator. Find month-over-month and year-over-year sales growth and what that monthly pace means over a full year.",
    calcInputs: [
      currencyField("thisMonthSales", "This Month's Sales", { default: 58000, max: 10000000000, step: 500 }),
      currencyField("lastMonthSales", "Last Month's Sales", { default: 52000, max: 10000000000, step: 500 }),
      currencyField("sameMonthLastYearSales", "Same Month Last Year", { default: 47000, max: 10000000000, step: 500 }),
    ],
    calcResult: { label: "Month-over-Month Growth", format: "percentage" },
    calcResults: [
      { key: "monthOverMonthPercent", label: "Month-over-Month Growth", format: "percentage", highlight: true },
      { key: "yearOverYearPercent", label: "Year-over-Year Growth", format: "percentage" },
      { key: "annualizedMomGrowthPercent", label: "If This Pace Lasted a Year", format: "percentage" },
      { key: "salesChangeFromLastMonth", label: "Change from Last Month", format: "currency" },
    ],
    instructions: "Enter this month's sales, last month's, and the same month a year ago. Year-over-year growth removes seasonal swings; month-over-month shows momentum.",
    examples: "Example: $58,000 this month vs $52,000 last month is 11.54% growth; vs $47,000 a year ago it's 23.4%. Kept up every month, 11.54% would compound to 270.76% in a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "Should I track month-over-month or year-over-year growth?", answer: "Both. Year-over-year is fairer for seasonal businesses; month-over-month reacts faster to changes." }],
  },
  {
    slug: "sales-target-calculator",
    title: "Sales Target Calculator",
    description: "Break a revenue goal into the deals and leads you need each year and month, and the revenue each sales rep must bring in.",
    metaTitle: "Sales Target Calculator — Deals & Leads Needed",
    metaDescription: "Free sales target calculator. Turn a revenue goal into deals and leads needed per year and month, and a quota for each sales rep.",
    calcInputs: [
      currencyField("annualRevenueGoal", "Annual Revenue Goal", { default: 1200000, max: 100000000000, step: 10000 }),
      currencyField("averageDealSize", "Average Deal Size", { default: 8000, max: 1000000000, step: 100 }),
      percentField("closeRatePercent", "Close Rate (Leads → Deals)", { default: 20, min: 0.1, max: 100, step: 0.5 }),
      numberField("salesReps", "Number of Sales Reps", { default: 4, min: 1, max: 10000, step: 1 }),
    ],
    calcResult: { label: "Deals Needed per Year", format: "number" },
    calcResults: [
      { key: "dealsNeededPerYear", label: "Deals Needed per Year", format: "number", highlight: true },
      { key: "dealsPerMonth", label: "Deals per Month", format: "number" },
      { key: "leadsNeededPerYear", label: "Leads Needed per Year", format: "number" },
      { key: "leadsPerMonth", label: "Leads per Month", format: "number" },
      { key: "revenuePerRep", label: "Revenue Quota per Rep", format: "currency" },
    ],
    instructions: "Enter your revenue goal, average deal size, the share of leads that become customers, and your number of reps. The tool works backwards to the activity needed to hit the goal.",
    examples: "Example: $1.2 million at $8,000 a deal needs 150 deals (12.5 a month). At a 20% close rate that's 750 leads (62.5 a month); 4 reps each need $300,000.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [{ question: "How do I raise sales without more leads?", answer: "Improve the close rate or grow the average deal size — each has the same effect on revenue as more leads." }],
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
