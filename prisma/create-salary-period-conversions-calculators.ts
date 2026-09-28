// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Salary & Income Calculators" sub-batch B (Period Conversions & Rates). Part of
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
// See src/lib/calc-engine-salary-period-conversions.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-period-conversions-calculators.ts
// or
//   npm run db:create-salary-period-conversions-calculators

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
    slug: "monthly-to-annual-salary-calculator",
    title: "Monthly to Annual Salary Calculator",
    description: "Convert a monthly salary to an annual salary — including countries and contracts that pay a 13th or 14th monthly salary.",
    metaTitle: "Monthly to Annual Salary Calculator — 13th & 14th",
    metaDescription: "Free monthly to annual salary calculator. Convert monthly pay to yearly, including 13th- and 14th-month salaries paid in many countries.",
    calcInputs: [
      currencyField("monthlySalary", "Monthly Salary", { default: 4000, max: 10000000, step: 100 }),
      dropdownField("salariesPerYear", "Monthly Salaries Paid per Year", 14, [
        { label: "12 (standard)", value: 12 },
        { label: "13 (with a 13th-month salary)", value: 13 },
        { label: "14 (13th and 14th-month salaries)", value: 14 },
      ]),
    ],
    calcResult: { label: "Annual Salary", format: "currency" },
    calcResults: [
      { key: "annualSalary", label: "Annual Salary", format: "currency", highlight: true },
      { key: "extraFrom13thAnd14thMonth", label: "Extra from 13th/14th-Month Pay", format: "currency" },
      { key: "averagePerCalendarMonth", label: "Average per Calendar Month", format: "currency" },
      { key: "weeklyEquivalent", label: "Weekly Equivalent", format: "currency" },
    ],
    instructions:
      "Enter your monthly salary and how many monthly salaries you receive each year. In many countries — including " +
      "parts of Europe, Latin America and Asia — employers pay a 13th or even 14th salary, often around the summer and " +
      "year-end holidays, which makes your real annual pay more than 12 × your monthly salary.",
    examples:
      "Example: $4,000 a month with 14 salaries a year is $56,000 — $8,000 more than 12 months alone, or an average of " +
      "$4,666.67 per calendar month.",
    assumptions: "The 13th/14th salaries are assumed equal to one regular monthly salary. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a 13th-month salary?", answer: "An extra month's pay paid once a year — required by law in some countries (such as the Philippines and several in Latin America) and common by contract in others." },
    ],
  },
  {
    slug: "weekly-to-annual-salary-calculator",
    title: "Weekly to Annual Salary Calculator",
    description: "Convert weekly pay into annual income based on the weeks you actually work — ideal for seasonal, contract or part-year jobs.",
    metaTitle: "Weekly to Annual Salary Calculator — Weeks Worked",
    metaDescription: "Free weekly to annual salary calculator. Turn weekly pay into yearly income based on the number of weeks you actually work.",
    calcInputs: [
      currencyField("weeklyPay", "Weekly Pay", { default: 900, max: 1000000, step: 25 }),
      numberField("weeksWorked", "Weeks Worked per Year", { default: 48, min: 1, max: 53, step: 1 }),
    ],
    calcResult: { label: "Annual Income", format: "currency" },
    calcResults: [
      { key: "annualIncome", label: "Annual Income", format: "currency", highlight: true },
      { key: "fullYearAt52Weeks", label: "If You Worked All 52 Weeks", format: "currency" },
      { key: "averageMonthlyIncome", label: "Average Monthly Income", format: "currency" },
      { key: "averagePerCalendarWeek", label: "Average per Calendar Week", format: "currency" },
    ],
    instructions:
      "Enter your weekly pay and how many weeks a year you're paid. If you're paid all 52 weeks, just enter 52. For " +
      "seasonal or contract work, enter the weeks you actually work to get a realistic yearly figure for budgeting or " +
      "loan applications.",
    examples:
      "Example: $900 a week for 48 weeks is $43,200 a year — $3,600 a month on average — compared with $46,800 for a full " +
      "52 weeks.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's $900 a week annually?", answer: "$46,800 if you're paid all 52 weeks, or less if some weeks are unpaid." },
    ],
  },
  {
    slug: "biweekly-to-annual-salary-calculator",
    title: "Biweekly to Annual Salary Calculator",
    description: "Convert a biweekly paycheck into annual income — for a normal 26-payday year or a year with 27 paydays.",
    metaTitle: "Biweekly to Annual Salary Calculator — 26 or 27 Pays",
    metaDescription: "Free biweekly to annual salary calculator. Turn your every-two-weeks paycheck into yearly income for a 26- or 27-payday year.",
    calcInputs: [
      currencyField("biweeklyPay", "Biweekly Paycheck (Gross)", { default: 2300, max: 1000000, step: 50 }),
      dropdownField("paydaysThisYear", "Paydays This Year", 26, [
        { label: "26 (most years)", value: 26 },
        { label: "27 (about every 11 years)", value: 27 },
      ]),
    ],
    calcResult: { label: "Annual Income", format: "currency" },
    calcResults: [
      { key: "annualIncome", label: "Annual Income", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "twoCheckMonthIncome", label: "Income in a Two-Paycheck Month", format: "currency" },
      { key: "extraFromTheExtraPayday", label: "Extra from a 27th Payday", format: "currency" },
    ],
    instructions:
      "Enter your gross biweekly paycheck and choose 26 or 27 paydays. A year has 52 weeks plus a day or two, so every " +
      "11 years or so a biweekly schedule fits 27 paydays into one calendar year.",
    examples:
      "Example: $2,300 every two weeks is $59,800 over 26 paydays — $4,983.33 a month on average, though most months you " +
      "only receive $4,600.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I convert biweekly pay to annual salary?", answer: "Multiply your biweekly gross pay by 26 (or 27 in a year with an extra payday)." },
    ],
  },
  {
    slug: "annual-to-monthly-salary-calculator",
    title: "Annual to Monthly Salary Calculator",
    description: "Split an annual salary into monthly payments — 12, or 13 or 14 if your employer pays extra-month salaries.",
    metaTitle: "Annual to Monthly Salary Calculator — 12, 13 or 14",
    metaDescription: "Free annual to monthly salary calculator. Split a yearly salary into 12, 13 or 14 monthly payments and see each regular paycheck.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 54000, max: 10000000, step: 1000 }),
      dropdownField("paymentsPerYear", "Monthly Payments per Year", 14, [
        { label: "12", value: 12 },
        { label: "13", value: 13 },
        { label: "14", value: 14 },
      ]),
    ],
    calcResult: { label: "Regular Monthly Payment", format: "currency" },
    calcResults: [
      { key: "regularMonthlyPayment", label: "Regular Monthly Payment", format: "currency", highlight: true },
      { key: "monthlyIfPaidIn12", label: "If Paid in 12 Payments", format: "currency" },
      { key: "differencePerMonth", label: "Smaller per Month Than 12 Payments", format: "currency" },
      { key: "extraPaymentsTotal", label: "Paid in the Extra Payments", format: "currency" },
    ],
    instructions:
      "Enter your annual salary and how many monthly payments it's split into. When an employer quotes a yearly salary " +
      "but pays 13 or 14 times, each regular monthly check is smaller — the difference arrives as extra payments.",
    examples:
      "Example: $54,000 paid in 14 payments is $3,857.14 a month, $642.86 less than $4,500 in 12 payments. The two extra " +
      "payments bring $7,714.29.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Is 14 payments better than 12?", answer: "The yearly total is the same; only the timing changes. Fewer, larger payments help monthly budgets, while extra payments act like built-in savings for holidays." },
    ],
  },
  {
    slug: "annual-to-weekly-salary-calculator",
    title: "Annual to Weekly Salary Calculator",
    description: "Turn an annual salary into weekly pay, and see what happens in a year with 53 weekly paydays.",
    metaTitle: "Annual to Weekly Salary Calculator — 52 or 53 Weeks",
    metaDescription: "Free annual to weekly salary calculator. Convert yearly salary into weekly pay and see the effect of a 53-payday year.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 52000, max: 10000000, step: 1000 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Weekly Pay", format: "currency" },
    calcResults: [
      { key: "weeklyPay", label: "Weekly Pay (52 Paydays)", format: "currency", highlight: true },
      { key: "weeklyIfSplitOver53", label: "Weekly If Your Employer Divides by 53", format: "currency" },
      { key: "extraIfPaid53Weeks", label: "Extra If You're Paid 53 Full Weeks", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent", format: "currency" },
    ],
    instructions:
      "Enter your annual salary and weekly hours. Some years contain 53 weekly paydays. Employers handle this differently: " +
      "some pay an extra full week (more money that year), others divide the salary by 53 (smaller checks).",
    examples:
      "Example: $52,000 is $1,000 a week ($25 an hour). In a 53-payday year it's $981.13 a week if divided by 53, or an " +
      "extra $1,000 if you're paid for all 53 weeks.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I convert annual salary to weekly pay?", answer: "Divide the annual salary by 52." },
    ],
  },
  {
    slug: "annual-to-biweekly-salary-calculator",
    title: "Annual to Biweekly Salary Calculator",
    description: "Convert an annual salary into a biweekly paycheck, and see how checks change if your employer divides by 27 in a 27-payday year.",
    metaTitle: "Annual to Biweekly Salary Calculator — 26 vs 27",
    metaDescription: "Free annual to biweekly salary calculator. Find your paycheck every two weeks and how it changes in a 27-payday year.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 78000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Biweekly Paycheck", format: "currency" },
    calcResults: [
      { key: "biweeklyPaycheck", label: "Biweekly Paycheck (÷ 26)", format: "currency", highlight: true },
      { key: "paycheckIfDividedBy27", label: "Paycheck If Divided by 27", format: "currency" },
      { key: "smallerByPerCheck", label: "Smaller per Check", format: "currency" },
      { key: "paidOver27ChecksAt26Rate", label: "Paid in a 27-Check Year at the Normal Rate", format: "currency" },
    ],
    instructions:
      "Enter your annual salary. Normally it's divided into 26 biweekly checks. In a year with 27 paydays, some employers " +
      "keep the same check (so you earn more that year) while others divide by 27 so the yearly total stays the same.",
    examples:
      "Example: $78,000 is $3,000 every two weeks. Divided by 27 it would be $2,888.89 — $111.11 less per check. Keeping " +
      "the normal rate for 27 checks would pay $81,000 that year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's $78,000 a year biweekly?", answer: "$3,000 per paycheck before tax (78,000 ÷ 26)." },
    ],
  },
  {
    slug: "salary-per-day-calculator",
    title: "Salary per Day Calculator",
    description: "Find your daily rate for a particular month from its working days, and how much unpaid days off will take out of that month's pay.",
    metaTitle: "Salary per Day Calculator — Unpaid Leave Deduction",
    metaDescription: "Free salary per day calculator. Find your daily rate for a month's working days and the pay deduction for unpaid days off.",
    calcInputs: [
      currencyField("monthlySalary", "Monthly Salary", { default: 4500, max: 10000000, step: 100 }),
      numberField("workingDaysInMonth", "Working Days in the Month", { default: 22, min: 1, max: 31, step: 1 }),
      numberField("unpaidDaysOff", "Unpaid Days Off This Month", { default: 2, min: 0, max: 31, step: 1 }),
    ],
    calcResult: { label: "Daily Rate This Month", format: "currency" },
    calcResults: [
      { key: "dailyRateThisMonth", label: "Daily Rate This Month", format: "currency", highlight: true },
      { key: "deductionForUnpaidDays", label: "Deduction for Unpaid Days", format: "currency" },
      { key: "payThisMonth", label: "Pay This Month", format: "currency" },
      { key: "calendarDayRate", label: "Rate per Calendar Day", format: "currency" },
    ],
    instructions:
      "Enter your monthly salary, the working days in the month (usually 20–23), and any unpaid days off. Many employers " +
      "pro-rate a monthly salary this way for unpaid leave or a partial first or last month; others use calendar days — " +
      "both rates are shown.",
    examples:
      "Example: $4,500 over a 22-working-day month is $204.55 a day. Two unpaid days off take $409.09 off, leaving " +
      "$4,090.91. By calendar day the rate is $147.95.",
    assumptions: "Your employer's method may differ — check your contract or HR policy. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How is salary calculated for a partial month?", answer: "Usually monthly salary ÷ working days in that month × days worked, or monthly salary ÷ calendar days × calendar days employed. Contracts and local laws decide which." },
    ],
  },
  {
    slug: "salary-per-hour-calculator",
    title: "Salary per Hour Calculator",
    description: "See what a salary really pays per hour when you work longer than your contracted hours — and how many unpaid extra hours that adds up to.",
    metaTitle: "Salary per Hour Calculator — Your Real Hourly Rate",
    metaDescription: "Free salary per hour calculator. See the real hourly rate of a salaried job when you work more than your contracted hours.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 75000, max: 10000000, step: 1000 }),
      numberField("contractedHoursPerWeek", "Contracted Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
      numberField("actualHoursPerWeek", "Hours You Actually Work per Week", { default: 48, min: 1, max: 120, step: 1 }),
      numberField("weeksWorked", "Weeks Worked per Year", { default: 48, min: 1, max: 52, step: 1 }),
    ],
    calcResult: { label: "Real Hourly Rate", format: "currency" },
    calcResults: [
      { key: "realHourlyRate", label: "Real Hourly Rate", format: "currency", highlight: true },
      { key: "contractedHourlyRate", label: "Contracted Hourly Rate", format: "currency" },
      { key: "differencePerHour", label: "Less per Hour Than Contracted", format: "currency" },
      { key: "unpaidExtraHoursPerYear", label: "Extra Unpaid Hours per Year", format: "number" },
    ],
    instructions:
      "Enter your salary, the hours your contract says, the hours you really work, and the weeks you work after " +
      "vacation. Salaried (exempt) employees aren't paid more for longer hours, so extra hours lower your true hourly " +
      "rate.",
    examples:
      "Example: $75,000 for 40 hours a week is $36.06 an hour. Working 48 hours a week for 48 weeks drops it to $32.55 — " +
      "$3.51 less — with 384 extra unpaid hours a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Do salaried employees get paid overtime?", answer: "In the US, exempt salaried employees don't; non-exempt ones do, even if salaried. See the Overtime Rate Calculator for non-exempt salaried pay." },
    ],
  },
  {
    slug: "equivalent-salary-calculator",
    title: "Equivalent Salary Calculator",
    description: "Find the salary you'd need in a new city to keep the same standard of living, using cost-of-living index numbers, and compare it with a job offer.",
    metaTitle: "Equivalent Salary Calculator — Cost of Living",
    metaDescription: "Free equivalent salary calculator. Find the salary you'd need in another city for the same lifestyle and check whether a job offer measures up.",
    calcInputs: [
      currencyField("currentSalary", "Current Salary", { default: 70000, max: 10000000, step: 1000 }),
      numberField("currentCityIndex", "Current City Cost-of-Living Index", { default: 100, min: 1, max: 500, step: 1 }),
      numberField("newCityIndex", "New City Cost-of-Living Index", { default: 125, min: 1, max: 500, step: 1 }),
      currencyField("offeredSalary", "Salary Offered in the New City", { default: 82000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "Equivalent Salary", format: "currency" },
    calcResults: [
      { key: "equivalentSalary", label: "Salary Needed in the New City", format: "currency", highlight: true },
      { key: "costOfLivingChangePercent", label: "Cost-of-Living Difference", format: "percentage" },
      { key: "offerAboveOrBelowEquivalent", label: "Offer Above (+) or Below (−) Equivalent", format: "currency" },
      { key: "offerWorthInCurrentCity", label: "Offer Is Worth This in Your Current City", format: "currency" },
    ],
    instructions:
      "Enter your current salary and the cost-of-living index for both cities (from any published index where 100 = the " +
      "average). Then enter the salary you've been offered. The tool shows the salary that keeps your lifestyle the " +
      "same and whether the offer beats it.",
    examples:
      "Example: moving from a city indexed at 100 to one at 125 (25% more expensive), your $70,000 salary would need to be " +
      "$87,500. An $82,000 offer falls $5,500 short — it's worth only $65,600 in your current city.",
    assumptions: "Cost-of-living indexes are averages; housing, taxes and your own spending habits can shift the answer. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Where can I find cost-of-living index numbers?", answer: "Many sites publish city cost-of-living indexes, and government data such as the US regional price parities give state and metro comparisons. Use the same source for both cities." },
    ],
  },
  {
    slug: "annual-income-calculator",
    title: "Annual Income Calculator",
    description: "Add up your annual income for an application or budget — monthly pay, other regular income, and yearly bonuses or one-off amounts.",
    metaTitle: "Annual Income Calculator — Total Yearly Income",
    metaDescription: "Free annual income calculator. Add monthly pay, other regular income and yearly bonuses to find your total annual income for any application.",
    calcInputs: [
      currencyField("monthlyGrossPay", "Monthly Gross Pay from Work", { default: 5000, max: 10000000, step: 100 }),
      currencyField("otherMonthlyIncome", "Other Monthly Income (Rent, Benefits, Side Work)", { default: 400, max: 10000000, step: 50 }),
      currencyField("yearlyBonusOrOneOffs", "Yearly Bonus or One-Off Income", { default: 3000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Annual Income", format: "currency" },
    calcResults: [
      { key: "annualIncome", label: "Total Annual Income", format: "currency", highlight: true },
      { key: "fromEmployment", label: "From Employment (Incl. Bonus)", format: "currency" },
      { key: "fromOtherSources", label: "From Other Sources", format: "currency" },
      { key: "averageMonthlyIncome", label: "Average Monthly Income", format: "currency" },
    ],
    instructions:
      "Enter your monthly gross pay, other regular monthly income, and anything you receive once a year, such as a bonus. " +
      "Credit card, rental and loan applications often ask for total annual income — this adds it all up.",
    examples:
      "Example: $5,000 a month from work, $400 a month from other sources and a $3,000 yearly bonus make $67,800 a year — " +
      "an average of $5,650 a month.",
    assumptions: "Uses gross (before-tax) income, which is what most applications ask for. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What counts as annual income on a credit card application?", answer: "Generally your gross income from all sources you can rely on — wages, self-employment, benefits, investment income, and (if you're 21+) a spouse's income you have reasonable access to." },
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
