// One-time (but safe to re-run) batch setup script: creates the 6 tools
// of the "Salary & Income Calculators" sub-batch G (Side, Freelance & Self-Employed Income). Part of
// the Salary & Income tool-list build-out: 91 tools in the source list, 8
// skipped as duplicates (salary, hourly-to-salary, salary-to-hourly,
// overtime, paycheck, bonus and commission calculators in
// create-finance-salary-income-calculators.ts; take-home-pay-calculator under
// Tax Calculators), 83 built across 9 sub-batches, all filed under Finance
// Calculators > Salary & Income Calculators:
//   create-salary-conversions-calculators.ts (11 tools)
//   create-salary-period-conversions-calculators.ts (10 tools)
//   create-salary-hours-overtime-calculators.ts (11 tools)
//   create-salary-premiums-commission-calculators.ts (10 tools)
//   create-salary-raises-calculators.ts (8 tools)
//   create-salary-income-sources-calculators.ts (12 tools)
//   create-salary-self-employed-calculators.ts (6 tools)
//   create-salary-rates-calculators.ts (7 tools)
//   create-salary-deductions-net-calculators.ts (8 tools)
//
// See src/lib/calc-engine-salary-self-employed.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-self-employed-calculators.ts
// or
//   npm run db:create-salary-self-employed-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "salary-income-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, tax, legal or " +
  "employment advice. Pay rules, taxes and deductions depend on your employer, contract and location — check your " +
  "pay stub, employment agreement or a qualified adviser for exact figures.";

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
    slug: "side-income-calculator",
    title: "Side Income Calculator",
    description: "See what a side hustle really adds to your finances after expenses and tax — per year, per month and per hour of your spare time.",
    metaTitle: "Side Income Calculator — Side Hustle After Tax",
    metaDescription: "Free side income calculator. See what your side hustle really earns after expenses, self-employment tax and income tax, per month and per hour.",
    calcInputs: [
      currencyField("monthlyRevenue", "Side Hustle Revenue per Month", { default: 1200, max: 1000000, step: 50 }),
      currencyField("monthlyExpenses", "Expenses per Month", { default: 200, max: 1000000, step: 25 }),
      numberField("hoursPerWeek", "Hours per Week on It", { default: 8, min: 0, max: 80, step: 0.5 }),
      percentField("incomeTaxRatePercent", "Your Income Tax Bracket", { default: 22, max: 50, step: 1 }),
      dropdownField("includeSeTax", "Include US Self-Employment Tax (15.3%)?", 1, [
        { label: "Yes", value: 1 },
        { label: "No", value: 0 },
      ]),
    ],
    calcResult: { label: "Net Side Income per Year", format: "currency" },
    calcResults: [
      { key: "netSideIncomePerYear", label: "Net Side Income per Year", format: "currency", highlight: true },
      { key: "netPerMonth", label: "Net per Month", format: "currency" },
      { key: "netPerHour", label: "Net per Hour of Your Time", format: "currency" },
      { key: "taxesPerYear", label: "Taxes per Year", format: "currency" },
      { key: "profitBeforeTax", label: "Profit Before Tax", format: "currency" },
    ],
    instructions:
      "Enter your side hustle's monthly revenue and expenses, the hours you put in, and your income tax bracket. In the " +
      "US, side profit also owes self-employment tax (Social Security and Medicare) of about 15.3% on 92.35% of profit. " +
      "The per-hour figure shows whether the time is worth it.",
    examples:
      "Example: $1,200 a month of revenue with $200 of expenses is $12,000 of yearly profit. After $4,149.04 of " +
      "self-employment and income tax (22% bracket), you keep $7,850.96 — $654.25 a month, or $18.87 per hour at 8 hours a week.",
    assumptions: "Assumes your main job doesn't already take you over the Social Security wage base. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Do I have to pay tax on side income?", answer: "Yes. In the US, self-employment income over $400 in a year owes self-employment tax, plus income tax. Setting aside 25–30% of profit is a common rule of thumb." },
    ],
  },
  {
    slug: "freelance-income-calculator",
    title: "Freelance Income Calculator",
    description: "Project your freelance income from the number of projects and your average fee, after platform fees and business expenses.",
    metaTitle: "Freelance Income Calculator — Projects to Income",
    metaDescription: "Free freelance income calculator. Turn projects per month and your average fee into monthly and yearly income after platform fees and costs.",
    calcInputs: [
      numberField("projectsPerMonth", "Projects per Month", { default: 4, min: 0, max: 200, step: 0.5 }),
      currencyField("averageProjectFee", "Average Fee per Project", { default: 1500, max: 10000000, step: 50 }),
      percentField("platformFeePercent", "Platform or Agency Fee", { default: 10, max: 60, step: 0.5 }),
      currencyField("monthlyExpenses", "Business Expenses per Month", { default: 300, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Monthly Net Income", format: "currency" },
    calcResults: [
      { key: "monthlyNetIncome", label: "Monthly Income After Fees and Expenses", format: "currency", highlight: true },
      { key: "annualNetIncome", label: "Yearly Income After Fees and Expenses", format: "currency" },
      { key: "monthlyRevenue", label: "Monthly Revenue", format: "currency" },
      { key: "platformFeesPerYear", label: "Platform Fees per Year", format: "currency" },
      { key: "keepPerProject", label: "You Keep per Project", format: "currency" },
    ],
    instructions:
      "Enter how many projects you complete each month, your average fee, any platform or agency commission, and your " +
      "monthly business costs (software, equipment, insurance). The result is your income before tax.",
    examples: "Example: 4 projects a month at $1,500 is $6,000 of revenue. After a 10% platform fee and $300 of expenses you keep $5,100 a month ($61,200 a year) — $1,275 per project.",
    assumptions: "Income is before tax — freelancers usually pay self-employment and income tax; see the Contractor Income Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How much do freelance platforms charge?", answer: "Commonly 5–20% of each payment, depending on the platform and the client relationship; payment processing may add a few percent." },
    ],
  },
  {
    slug: "self-employment-income-calculator",
    title: "Self-Employment Income Calculator",
    description: "Work out your self-employment income: net profit from revenue and expenses, 2026 self-employment tax, and the income left before income tax.",
    metaTitle: "Self-Employment Income Calculator (2026) — SE Tax",
    metaDescription: "Free 2026 self-employment income calculator. Find your net profit, self-employment tax and income after SE tax from revenue and expenses.",
    calcInputs: [
      currencyField("grossRevenue", "Gross Business Revenue", { default: 120000, max: 100000000, step: 1000 }),
      currencyField("businessExpenses", "Business Expenses", { default: 25000, max: 100000000, step: 500 }),
      currencyField("otherW2Wages", "W-2 Wages from Another Job", { default: 0, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Net Profit", format: "currency" },
    calcResults: [
      { key: "netProfit", label: "Net Profit", format: "currency", highlight: true },
      { key: "selfEmploymentTax", label: "Self-Employment Tax", format: "currency" },
      { key: "incomeAfterSeTax", label: "Income After SE Tax", format: "currency" },
      { key: "halfSeTaxDeduction", label: "Deductible Half of SE Tax", format: "currency" },
      { key: "profitMarginPercent", label: "Profit Margin", format: "percentage" },
    ],
    instructions:
      "Enter your business revenue and deductible expenses, plus any W-2 wages from another job (they use up the Social " +
      "Security wage base first). Self-employment tax is 15.3% — 12.4% Social Security up to $184,500 in 2026 plus 2.9% " +
      "Medicare — on 92.35% of your profit. Half of it is deductible when you work out income tax.",
    examples:
      "Example: $120,000 of revenue less $25,000 of expenses is $95,000 of profit (a 79.17% margin). Self-employment tax is " +
      "$13,423.07, leaving $81,576.93 before income tax; $6,711.54 of it is deductible.",
    assumptions: "Excludes income tax and the 0.9% Additional Medicare Tax above $200,000. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What is self-employment tax?", answer: "The self-employed version of Social Security and Medicare tax. Employees split 15.3% with their employer; the self-employed pay both halves, on 92.35% of net profit." },
    ],
  },
  {
    slug: "contractor-income-calculator",
    title: "Contractor Income Calculator",
    description: "Estimate an independent contractor's (1099) take-home pay after self-employment and income tax, and the quarterly estimated tax to set aside.",
    metaTitle: "Contractor Income Calculator — 1099 Take-Home",
    metaDescription: "Free contractor income calculator. Estimate 1099 take-home pay after self-employment and income tax, plus your quarterly estimated payments.",
    calcInputs: [
      currencyField("annualBillings", "Annual Billings", { default: 95000, max: 100000000, step: 1000 }),
      currencyField("businessExpenses", "Business Expenses", { default: 8000, max: 10000000, step: 500 }),
      percentField("incomeTaxRatePercent", "Federal Income Tax (Average Rate)", { default: 18, max: 40, step: 0.5 }),
      percentField("stateTaxRatePercent", "State Income Tax Rate", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Take-Home Pay", format: "currency" },
    calcResults: [
      { key: "takeHomePay", label: "Yearly Take-Home Pay", format: "currency", highlight: true },
      { key: "monthlyTakeHome", label: "Monthly Take-Home", format: "currency" },
      { key: "totalTaxes", label: "Total Taxes", format: "currency" },
      { key: "quarterlyEstimatedPayment", label: "Quarterly Estimated Tax Payment", format: "currency" },
      { key: "setAsidePercentOfBillings", label: "Set Aside This % of Each Invoice", format: "percentage" },
    ],
    instructions:
      "Enter what you bill clients in a year, your business expenses, and your average federal and state income tax " +
      "rates. Contractors have no tax withheld, so the tool estimates the tax you'll owe and the quarterly payments " +
      "(due mid-April, June, September and January) to keep up with it.",
    examples:
      "Example: $95,000 of billings with $8,000 of expenses leaves $87,000 of profit. Self-employment tax plus 23% income " +
      "tax total $30,889.05, so you take home $56,110.95 ($4,675.91 a month). Pay about $7,722.26 each quarter — 32.51% of billings.",
    assumptions: "Uses average rates on profit after the deductible half of SE tax; ignores the QBI deduction and other credits. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How much should a 1099 contractor set aside for taxes?", answer: "Often 25–35% of profit, depending on income and state. Paying quarterly estimates avoids an underpayment penalty." },
    ],
  },
  {
    slug: "gig-income-calculator",
    title: "Gig Income Calculator",
    description: "Find your real hourly earnings from rideshare or delivery driving after platform pay, tips and the true cost of the miles you drive.",
    metaTitle: "Gig Income Calculator — Rideshare & Delivery Pay",
    metaDescription: "Free gig income calculator. Work out your real hourly pay from rideshare or delivery after tips, mileage costs and other expenses.",
    calcInputs: [
      currencyField("weeklyEarnings", "Weekly Platform Earnings (Before Tips)", { default: 900, max: 100000, step: 25 }),
      currencyField("tipsPerWeek", "Tips per Week", { default: 150, max: 100000, step: 10 }),
      numberField("hoursOnline", "Hours Online per Week (Incl. Waiting)", { default: 35, min: 0, max: 120, step: 0.5 }),
      numberField("milesPerWeek", "Miles Driven per Week", { default: 550, min: 0, max: 10000, step: 10 }),
      currencyField("costPerMile", "Your Vehicle Cost per Mile (Fuel, Wear)", { default: 0.35, max: 5, step: 0.01 }),
      currencyField("otherWeeklyCosts", "Other Weekly Costs (Phone, Insurance)", { default: 25, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Net per Hour", format: "currency" },
    calcResults: [
      { key: "netPerHour", label: "Net Pay per Hour", format: "currency", highlight: true },
      { key: "netPerWeek", label: "Net Pay per Week", format: "currency" },
      { key: "grossPerHour", label: "Gross per Hour (Before Costs)", format: "currency" },
      { key: "vehicleCostPerWeek", label: "Vehicle Cost per Week", format: "currency" },
      { key: "netPerYear", label: "Net Pay per Year", format: "currency" },
    ],
    instructions:
      "Enter your weekly platform earnings and tips, all the hours you're logged in (including waiting between orders), " +
      "the miles you drive, and what each mile costs you in fuel, maintenance and depreciation. Gig apps show gross pay; " +
      "this shows what you really earn per hour.",
    examples:
      "Example: $900 of earnings plus $150 in tips over 35 hours is $30 an hour gross. Take off $192.50 for 550 miles at " +
      "$0.35 and $25 of other costs, and you net $832.50 a week — $23.79 an hour, $43,290 a year before tax.",
    assumptions:
      "Before income and self-employment tax. For taxes, the IRS standard mileage rate is usually higher than your cash " +
      "cost per mile because it includes depreciation. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What does it cost per mile to drive for gig work?", answer: "Fuel and maintenance alone are often 15–30 cents a mile; including depreciation and insurance, total cost can be 50 cents or more. Use your own figures if you track them." },
    ],
  },
  {
    slug: "effective-hourly-rate-calculator",
    title: "Effective Hourly Rate Calculator",
    description: "Find what a freelance project really paid per hour once you count every hour it took — including unbilled time — and your expenses.",
    metaTitle: "Effective Hourly Rate Calculator — Freelance Projects",
    metaDescription: "Free effective hourly rate calculator. See what a project really paid per hour including unbilled time and expenses, and the fee to charge next time.",
    calcInputs: [
      currencyField("projectFee", "Project Fee", { default: 3000, max: 10000000, step: 50 }),
      numberField("billableHours", "Hours You Planned or Billed", { default: 30, min: 0, max: 10000, step: 0.5 }),
      numberField("unbilledHours", "Extra Unbilled Hours (Revisions, Admin, Calls)", { default: 12, min: 0, max: 10000, step: 0.5 }),
      currencyField("projectExpenses", "Project Expenses", { default: 150, max: 1000000, step: 10 }),
      currencyField("targetHourlyRate", "Hourly Rate You Want to Earn", { default: 85, max: 10000, step: 5 }),
    ],
    calcResult: { label: "Effective Hourly Rate", format: "currency" },
    calcResults: [
      { key: "effectiveHourlyRate", label: "Effective Hourly Rate", format: "currency", highlight: true },
      { key: "quotedHourlyRate", label: "Quoted Hourly Rate", format: "currency" },
      { key: "rateLostToUnbilledTimePercent", label: "Rate Lost to Unbilled Time and Costs", format: "percentage" },
      { key: "feeNeededForTargetRate", label: "Fee Needed Next Time for Your Target Rate", format: "currency" },
    ],
    instructions:
      "Enter a project's fee, the hours you planned, the extra hours you didn't bill (emails, revisions, calls, admin) " +
      "and any expenses. The tool shows what you really earned per hour, and what to quote next time to hit your target.",
    examples:
      "Example: a $3,000 project planned for 30 hours ($100 an hour) that took 12 extra unbilled hours and $150 of costs " +
      "really paid $67.86 an hour — 32.14% less. To earn $85 an hour for 42 hours, quote $3,720.",
    assumptions: "Before tax. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How can freelancers raise their effective hourly rate?", answer: "Limit revisions in the contract, bill for meetings and admin, price by value or project rather than hours, and track time so quotes reflect reality." },
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
