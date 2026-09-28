// One-time (but safe to re-run) batch setup script: creates the 7 tools
// of the "Salary & Income Calculators" sub-batch H (Rates & Targets). Part of
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
// See src/lib/calc-engine-salary-rates.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-rates-calculators.ts
// or
//   npm run db:create-salary-rates-calculators

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
    slug: "true-hourly-wage-calculator",
    title: "True Hourly Wage Calculator",
    description: "Find your true hourly wage — what you really keep per hour of your life given to work, after tax, work costs and unpaid commuting time.",
    metaTitle: "True Hourly Wage Calculator — Real Pay per Hour",
    metaDescription: "Free true hourly wage calculator. See what you really earn per hour after tax, commuting time and work costs, compared with your stated rate.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 10000000, step: 1000 }),
      numberField("hoursWorkedPerWeek", "Hours Worked per Week", { default: 45, min: 1, max: 100, step: 0.5 }),
      numberField("commuteHoursPerWeek", "Commuting Hours per Week", { default: 5, min: 0, max: 40, step: 0.5 }),
      currencyField("workCostsPerYear", "Work Costs per Year (Commute, Clothes, Childcare, Lunches)", { default: 6000, max: 1000000, step: 250 }),
      percentField("taxRatePercent", "Average Tax Rate", { default: 22, max: 60, step: 0.5 }),
      numberField("weeksWorked", "Weeks Worked per Year", { default: 48, min: 1, max: 52, step: 1 }),
    ],
    calcResult: { label: "True Hourly Wage", format: "currency" },
    calcResults: [
      { key: "trueHourlyWage", label: "True Hourly Wage", format: "currency", highlight: true },
      { key: "statedHourlyRate", label: "Stated Hourly Rate (Salary ÷ 2,080)", format: "currency" },
      { key: "hoursGivenToWorkPerYear", label: "Hours Given to Work per Year", format: "number" },
      { key: "moneyLeftAfterTaxAndWorkCosts", label: "Money Left After Tax and Work Costs", format: "currency" },
    ],
    instructions:
      "Enter your salary, the hours you really work, your weekly commute, what the job costs you each year, your average " +
      "tax rate and the weeks you work. The tool divides what you keep by all the time the job takes — a useful number " +
      "when weighing a job change, a shorter commute or remote work.",
    examples:
      "Example: a $60,000 salary looks like $28.85 an hour. After 22% tax and $6,000 of work costs you keep $40,800; spread " +
      "over 2,400 hours of work and commuting, your true wage is $17 an hour.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why is my true hourly wage so much lower?", answer: "Tax, commuting time and job-related costs all come out of your pay or your time, but aren't counted in the headline rate." },
    ],
  },
  {
    slug: "contract-rate-to-salary-calculator",
    title: "Contract Rate to Salary Calculator",
    description: "Convert a contract hourly rate into the equivalent employee salary, allowing for unpaid time off, benefits you'd pay yourself and the employer's share of payroll tax.",
    metaTitle: "Contract Rate to Salary Calculator — 1099 vs W-2",
    metaDescription: "Free contract rate to salary calculator. See what a contract hourly rate is worth as a salary once you pay your own benefits, taxes and time off.",
    calcInputs: [
      currencyField("hourlyRate", "Contract Hourly Rate", { default: 60, max: 10000, step: 1 }),
      numberField("billableHoursPerWeek", "Billable Hours per Week", { default: 40, min: 1, max: 80, step: 1 }),
      numberField("billableWeeks", "Billable Weeks per Year", { default: 46, min: 1, max: 52, step: 1 }),
      currencyField("selfFundedBenefits", "Benefits You'd Pay Yourself per Year (Health, Retirement)", { default: 9000, max: 1000000, step: 500 }),
    ],
    calcResult: { label: "Equivalent Salary", format: "currency" },
    calcResults: [
      { key: "equivalentSalary", label: "Equivalent Employee Salary", format: "currency", highlight: true },
      { key: "annualBillings", label: "Annual Contract Billings", format: "currency" },
      { key: "naiveSalaryAt2080Hours", label: "Naive Figure (Rate × 2,080)", format: "currency" },
      { key: "salaryAsMultipleOfRate", label: "Salary ≈ Hourly Rate ×", format: "number" },
    ],
    instructions:
      "Enter the contract rate, the hours and weeks you'll actually bill (contractors aren't paid for vacation or " +
      "holidays), and what you'd spend on benefits an employer would normally provide. As a contractor you also pay the " +
      "employer's 7.65% share of Social Security and Medicare, which the tool takes into account.",
    examples:
      "Example: $60 an hour for 40 hours × 46 weeks bills $110,400. After $9,000 of self-paid benefits and the employer " +
      "payroll-tax share, it's like a $94,194.15 salary — not the $124,800 a simple × 2,080 suggests.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's a quick rule for comparing contract and salary pay?", answer: "Many people use hourly rate × roughly 1,500–1,600 to get a comparable salary, or expect a contract rate of about 1.3–1.5× the salary's hourly equivalent." },
    ],
  },
  {
    slug: "salary-to-contract-rate-calculator",
    title: "Salary to Contract Rate Calculator",
    description: "Work out the minimum hourly contract rate that matches a salaried job's full package, based on benefits and realistic billable hours.",
    metaTitle: "Salary to Contract Rate Calculator — Hourly Rate",
    metaDescription: "Free salary to contract rate calculator. Find the hourly rate you'd need as a contractor to match a salary plus benefits and payroll taxes.",
    calcInputs: [
      currencyField("salary", "Salary to Match", { default: 90000, max: 10000000, step: 1000 }),
      percentField("benefitsPercent", "Benefits Value (% of Salary)", { default: 25, max: 100, step: 1 }),
      numberField("billableHoursPerYear", "Billable Hours per Year", { default: 1800, min: 100, max: 3000, step: 50 }),
      percentField("extraMarginPercent", "Extra Margin for Risk and Gaps", { default: 10, max: 100, step: 1 }),
    ],
    calcResult: { label: "Minimum Contract Rate", format: "currency" },
    calcResults: [
      { key: "minimumContractRate", label: "Minimum Contract Rate", format: "currency", highlight: true },
      { key: "recommendedRateWithMargin", label: "Recommended Rate with Margin", format: "currency" },
      { key: "salaryPerHourAt2080", label: "Salary per Hour (÷ 2,080)", format: "currency" },
      { key: "totalPackageValue", label: "Total Package Value", format: "currency" },
    ],
    instructions:
      "Enter the salary you want to match, what its benefits are worth as a percentage, the hours you expect to bill in a " +
      "year (1,500–1,800 is common after time off and gaps between contracts), and any extra margin. The tool adds the " +
      "employer's 7.65% payroll tax to the package.",
    examples:
      "Example: matching $90,000 with 25% benefits is a $119,385 package. Over 1,800 billable hours that needs at least " +
      "$66.33 an hour — $72.96 with a 10% margin — against $43.27 per hour of salary.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why should a contract rate be higher than a salary's hourly rate?", answer: "Contractors pay their own benefits and both halves of payroll tax, get no paid time off, and have gaps between contracts." },
    ],
  },
  {
    slug: "freelance-rate-calculator",
    title: "Freelance Rate Calculator",
    description: "Find the hourly rate you need to charge as a freelancer to take home a target income after tax and business expenses.",
    metaTitle: "Freelance Rate Calculator — What to Charge",
    metaDescription: "Free freelance rate calculator. Work out the hourly and day rate to charge to take home your target income after tax and expenses.",
    calcInputs: [
      currencyField("targetTakeHome", "Yearly Take-Home Income You Want", { default: 70000, max: 10000000, step: 1000 }),
      currencyField("businessExpenses", "Business Expenses per Year", { default: 8000, max: 1000000, step: 500 }),
      percentField("totalTaxRatePercent", "Total Tax Rate (Income + Self-Employment)", { default: 30, max: 60, step: 0.5 }),
      numberField("billableHoursPerWeek", "Billable Hours per Week", { default: 25, min: 1, max: 60, step: 0.5 }),
      numberField("workingWeeks", "Working Weeks per Year", { default: 46, min: 1, max: 52, step: 1 }),
    ],
    calcResult: { label: "Hourly Rate to Charge", format: "currency" },
    calcResults: [
      { key: "hourlyRateToCharge", label: "Hourly Rate to Charge", format: "currency", highlight: true },
      { key: "dayRateAt8Hours", label: "Day Rate (8 Hours)", format: "currency" },
      { key: "revenueNeeded", label: "Revenue Needed per Year", format: "currency" },
      { key: "billableHoursPerYear", label: "Billable Hours per Year", format: "number" },
    ],
    instructions:
      "Enter the take-home income you want, your business costs, your total tax rate, and realistic billable hours — " +
      "freelancers spend a lot of time on admin, marketing and finding clients, so 20–30 billable hours a week is common.",
    examples:
      "Example: to take home $70,000 with $8,000 of costs and 30% tax you need $108,000 of revenue. Billing 25 hours a week " +
      "for 46 weeks (1,150 hours) means charging $93.91 an hour, or $751.30 a day.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How many hours can a freelancer really bill?", answer: "Often 50–70% of working time. The rest goes to finding work, admin, invoicing and learning." },
    ],
  },
  {
    slug: "consulting-rate-calculator",
    title: "Consulting Rate Calculator",
    description: "Set your consulting day rate from your target income, overhead, profit margin and how many days you can realistically bill.",
    metaTitle: "Consulting Rate Calculator — Day Rate & Hourly",
    metaDescription: "Free consulting rate calculator. Set your day, half-day and hourly consulting rates from target income, overhead, profit and utilization.",
    calcInputs: [
      currencyField("targetIncome", "Target Personal Income", { default: 150000, max: 10000000, step: 5000 }),
      currencyField("annualOverhead", "Annual Overhead (Office, Software, Insurance, Travel)", { default: 20000, max: 10000000, step: 1000 }),
      percentField("profitMarginPercent", "Profit Margin", { default: 15, max: 60, step: 1 }),
      numberField("workingDays", "Working Days per Year", { default: 220, min: 50, max: 300, step: 5 }),
      percentField("utilizationPercent", "Utilization (Share of Days Billed)", { default: 60, min: 10, max: 100, step: 5 }),
    ],
    calcResult: { label: "Day Rate", format: "currency" },
    calcResults: [
      { key: "dayRate", label: "Day Rate", format: "currency", highlight: true },
      { key: "halfDayRate", label: "Half-Day Rate", format: "currency" },
      { key: "hourlyRate", label: "Hourly Rate (8-Hour Day)", format: "currency" },
      { key: "billableDaysPerYear", label: "Billable Days per Year", format: "number" },
      { key: "revenueNeeded", label: "Revenue Needed", format: "currency" },
    ],
    instructions:
      "Enter the income you want to pay yourself, your yearly overhead, a profit margin for the business, your working " +
      "days and your utilization — the share of those days you'll actually bill a client. Consultants often plan on " +
      "50–70% utilization.",
    examples:
      "Example: $150,000 of income and $20,000 of overhead with a 15% margin needs $200,000 of revenue. At 60% of 220 days " +
      "(132 billable days) that's $1,515.15 a day — $757.58 per half day or $189.39 an hour.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Should consultants charge by the day or the hour?", answer: "Day rates suit on-site and project work and avoid clock-watching; hourly suits small, unpredictable tasks. Many consultants quote a day rate and derive an hourly rate from it." },
    ],
  },
  {
    slug: "billable-hour-rate-calculator",
    title: "Billable Hour Rate Calculator",
    description: "Set a firm's billing rate for an employee from their salary, benefits, share of overhead, billable hours and target profit margin.",
    metaTitle: "Billable Hour Rate Calculator — Firm Billing Rate",
    metaDescription: "Free billable hour rate calculator. Set an employee's billing rate from salary, benefits, overhead, billable hours and target profit margin.",
    calcInputs: [
      currencyField("employeeSalary", "Employee Salary", { default: 80000, max: 10000000, step: 1000 }),
      percentField("benefitsAndTaxesPercent", "Benefits and Payroll Taxes (% of Salary)", { default: 30, max: 100, step: 1 }),
      currencyField("overheadPerEmployee", "Overhead per Employee per Year", { default: 25000, max: 10000000, step: 1000 }),
      numberField("billableHoursPerYear", "Billable Hours per Year", { default: 1500, min: 100, max: 3000, step: 50 }),
      percentField("profitMarginPercent", "Target Profit Margin", { default: 20, max: 80, step: 1 }),
    ],
    calcResult: { label: "Billable Hour Rate", format: "currency" },
    calcResults: [
      { key: "billableHourRate", label: "Billable Hour Rate", format: "currency", highlight: true },
      { key: "fullyLoadedCostPerHour", label: "Fully Loaded Cost per Billable Hour", format: "currency" },
      { key: "profitPerBillableHour", label: "Profit per Billable Hour", format: "currency" },
      { key: "rateAsMultipleOfSalaryPerHour", label: "Rate as Multiple of Salary per Hour", format: "number" },
    ],
    instructions:
      "For agencies, law, accounting and consulting firms: enter the employee's salary, benefits and payroll taxes, their " +
      "share of overhead (rent, software, admin staff), expected billable hours and your target profit margin.",
    examples:
      "Example: an $80,000 employee with 30% benefits and $25,000 of overhead costs $129,000 a year — $86 per billable hour " +
      "over 1,500 hours. A 20% margin sets the rate at $107.50, about 2.8× their salary per hour.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is the rule of three for billing rates?", answer: "A traditional guideline that an employee should bill about three times their salary per hour: one third for their pay, one for overhead, one for profit." },
    ],
  },
  {
    slug: "target-salary-calculator",
    title: "Target Salary Calculator",
    description: "Work out the gross salary you need to cover your monthly expenses, debt payments and savings goals after tax.",
    metaTitle: "Target Salary Calculator — Salary You Need",
    metaDescription: "Free target salary calculator. Find the gross salary needed to cover your monthly expenses, debt payments and savings goal after tax.",
    calcInputs: [
      currencyField("monthlyExpenses", "Monthly Living Expenses", { default: 3200, max: 1000000, step: 50 }),
      currencyField("monthlyDebtPayments", "Monthly Debt Payments", { default: 400, max: 1000000, step: 25 }),
      currencyField("monthlySavingsGoal", "Monthly Savings Goal", { default: 800, max: 1000000, step: 25 }),
      percentField("taxAndDeductionsPercent", "Tax and Deductions (% of Gross)", { default: 25, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Target Annual Salary", format: "currency" },
    calcResults: [
      { key: "targetAnnualSalary", label: "Target Annual Salary", format: "currency", highlight: true },
      { key: "targetMonthlyGross", label: "Target Monthly Gross", format: "currency" },
      { key: "takeHomeNeededPerMonth", label: "Take-Home Needed per Month", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent (2,080 Hours)", format: "currency" },
    ],
    instructions:
      "Enter what you spend each month, your debt payments, how much you want to save, and the share of pay that goes to " +
      "tax and deductions. The tool grosses up your take-home needs into the salary to aim for — handy for job hunting or " +
      "salary negotiations.",
    examples:
      "Example: $3,200 of expenses, $400 of debt payments and $800 of savings need $4,400 a month take-home. With 25% going " +
      "to tax and deductions, aim for $70,400 a year ($5,866.67 a month, or $33.85 an hour).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How much salary do I need to live comfortably?", answer: "Add up your real monthly costs and savings goals, then gross them up for tax — that's exactly what this calculator does. A common rule is to keep essentials under 50% of take-home pay." },
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
