// One-time (but safe to re-run) batch setup script: creates the 7 tools of
// the "Salary & Income Calculators" batch (Take-Home Pay Calculator was
// skipped — it already existed under this same category). Second of 8 new
// topic batches built from Finance_Calculators_Topical_SEO_Master.xlsx.
// Filed under the existing "Salary & Income Calculators" category
// (salary-income-calculators), created empty by
// reparent-tool-categories-under-finance.ts and populated here for the
// first time.
//
// See src/lib/calc-engine-finance-salary-income.ts for the math, and its
// header comment for why these gross-pay-only tools are a distinct,
// non-duplicate offering alongside this site's existing federal-tax-aware
// salary-tax-calculator/paycheck-tax-calculator/overtime-tax-calculator/
// bonus-tax-calculator/commission-tax-calculator.
//
// HOW TO RUN
//   npx tsx prisma/create-finance-salary-income-calculators.ts
// or
//   npm run db:create-finance-salary-income-calculators

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
    max: opts.max ?? 1000000,
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
    max: opts.max ?? 100,
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
    max: opts.max ?? 168,
    step: opts.step ?? 1,
  };
}

const payFrequencyField = {
  key: "payFrequency",
  label: "Pay Frequency",
  type: "dropdown",
  required: true,
  default: 26,
  options: [
    { label: "Weekly (52 paychecks/year)", value: 52 },
    { label: "Biweekly (26 paychecks/year)", value: 26 },
    { label: "Semi-Monthly (24 paychecks/year)", value: 24 },
    { label: "Monthly (12 paychecks/year)", value: 12 },
    { label: "Annually (1 payment/year)", value: 1 },
  ],
};

const NO_TAX_NOTE =
  "This is a GROSS pay calculator — it doesn't withhold any income tax, FICA, or other deductions. For an " +
  "after-tax, take-home-pay figure, see this site's Salary Tax Calculator or state-specific paycheck calculators " +
  "instead.";

const GENERAL_DISCLAIMER =
  "This tool provides general estimates for informational purposes only and isn't tax, legal, or financial " +
  "advice.";

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
    slug: "salary-calculator",
    title: "Salary Calculator",
    description: "Convert an annual salary into gross pay per paycheck, and see the weekly, monthly, and hourly equivalents.",
    metaTitle: "Salary Calculator — Free & Instant",
    metaDescription: "Free salary calculator. Enter your annual salary and pay frequency to see your gross pay per paycheck and its weekly, monthly, and hourly equivalents.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 2000000, step: 1000 }),
      payFrequencyField,
    ],
    calcResult: { label: "Gross Pay Per Paycheck", format: "currency" },
    calcResults: [
      { key: "grossPayPerPeriod", label: "Gross Pay Per Paycheck", format: "currency", highlight: true },
      { key: "weeklyEquivalent", label: "Weekly Equivalent", format: "currency" },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent (40 hrs/week)", format: "currency" },
    ],
    instructions:
      "Enter your annual salary and how often you're paid. The result shows your gross pay for a single " +
      "paycheck, plus what that salary works out to weekly, monthly, and per hour (assuming a standard 40-hour " +
      "work week) — handy for comparing job offers quoted in different pay frequencies.",
    examples: "Example: a $60,000 annual salary paid biweekly comes to $2,307.69 gross per paycheck — $1,153.85 a week, $5,000 a month, or $28.85 an hour.",
    assumptions: "The hourly equivalent assumes a standard 2,080-hour work year (40 hours a week for 52 weeks) — your actual hours may differ. " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include taxes?",
        answer: "No — this is a gross pay figure only, before any income tax, FICA, or other withholding. See this site's Salary Tax Calculator for an after-tax estimate.",
      },
      {
        question: "Why would I want the hourly equivalent of a salary?",
        answer: "It's a common way to compare a salaried job offer against an hourly one, or to sanity-check whether unpaid overtime is eating into your effective hourly rate.",
      },
    ],
  },
  {
    slug: "hourly-to-salary-calculator",
    title: "Hourly to Salary Calculator",
    description: "Convert an hourly wage into an equivalent annual salary, based on your hours per week and weeks worked per year.",
    metaTitle: "Hourly to Salary Calculator — Free & Instant",
    metaDescription: "Free hourly to salary calculator. Enter your hourly rate, hours per week, and weeks worked per year to see your annual, monthly, and weekly salary.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 25, max: 500, step: 0.5 }),
      numberField("hoursPerWeek", "Hours Per Week", { default: 40, max: 100, step: 1 }),
      numberField("weeksPerYear", "Weeks Worked Per Year", { default: 52, max: 52, step: 1 }),
    ],
    calcResult: { label: "Annual Salary", format: "currency" },
    calcResults: [
      { key: "annualSalary", label: "Annual Salary", format: "currency", highlight: true },
      { key: "monthlySalary", label: "Monthly Equivalent", format: "currency" },
      { key: "weeklySalary", label: "Weekly Equivalent", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, how many hours you typically work per week, and how many weeks a year you " +
      "actually work (52 if you take no unpaid time off — lower it if you take unpaid weeks). The result shows " +
      "the equivalent annual salary, plus its monthly and weekly breakdown.",
    examples: "Example: $25 an hour, 40 hours a week, 52 weeks a year works out to a $52,000 annual salary — about $4,333.33 a month.",
    assumptions: "Set \"Weeks Worked Per Year\" below 52 if you take unpaid time off, to get a more accurate annual figure. " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I take unpaid vacation?",
        answer: "Lower the \"Weeks Worked Per Year\" input below 52 to reflect it — for example, 2 unpaid weeks off means entering 50 instead of 52.",
      },
      {
        question: "Does this include overtime pay?",
        answer: "No — this assumes every hour you enter is paid at your straight hourly rate. For a separate overtime breakdown, see this site's Overtime Calculator.",
      },
    ],
  },
  {
    slug: "salary-to-hourly-calculator",
    title: "Salary to Hourly Calculator",
    description: "Convert an annual salary into an equivalent hourly rate, based on your hours per week and weeks worked per year.",
    metaTitle: "Salary to Hourly Calculator — Free & Instant",
    metaDescription: "Free salary to hourly calculator. Enter your annual salary, hours per week, and weeks worked per year to see your equivalent hourly, daily, and weekly rate.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 52000, max: 2000000, step: 1000 }),
      numberField("hoursPerWeek", "Hours Per Week", { default: 40, max: 100, step: 1 }),
      numberField("weeksPerYear", "Weeks Worked Per Year", { default: 52, max: 52, step: 1 }),
    ],
    calcResult: { label: "Hourly Rate", format: "currency" },
    calcResults: [
      { key: "hourlyRate", label: "Hourly Rate", format: "currency", highlight: true },
      { key: "dailyRate", label: "Daily Rate (8-hour day)", format: "currency" },
      { key: "weeklyRate", label: "Weekly Rate", format: "currency" },
    ],
    instructions:
      "Enter your annual salary, your typical hours per week, and how many weeks a year you work. The result " +
      "shows your equivalent hourly rate, plus a daily rate (assuming an 8-hour day) and weekly rate.",
    examples: "Example: a $52,000 salary at 40 hours a week for 52 weeks works out to a $25.00 hourly rate — $200 a day, or $1,000 a week.",
    assumptions: "The daily rate assumes an 8-hour work day; if your schedule differs, use the hourly rate directly instead. " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is my \"real\" hourly rate lower than expected?",
        answer: "If you regularly work more hours than you entered here (unpaid overtime, working through lunch, etc.), your true effective hourly rate is lower than this calculation, which only knows the hours you tell it about.",
      },
    ],
  },
  {
    slug: "overtime-calculator",
    title: "Overtime Calculator",
    description: "Calculate your gross overtime pay from your hourly rate, regular hours, overtime hours, and overtime multiplier.",
    metaTitle: "Overtime Calculator — Free & Instant",
    metaDescription: "Free overtime calculator. Enter your hourly rate and hours to see your regular pay, overtime pay, and total gross pay for the week.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 20, max: 500, step: 0.5 }),
      numberField("regularHours", "Regular Hours This Week", { default: 40, max: 80, step: 1 }),
      numberField("overtimeHours", "Overtime Hours This Week", { default: 5, max: 80, step: 1 }),
      { key: "overtimeMultiplier", label: "Overtime Multiplier", type: "dropdown", required: true, default: 1.5, options: [
        { label: "1.5x (time-and-a-half)", value: 1.5 },
        { label: "2x (double time)", value: 2 },
      ] },
    ],
    calcResult: { label: "Total Gross Pay", format: "currency" },
    calcResults: [
      { key: "regularPay", label: "Regular Pay", format: "currency" },
      { key: "overtimePay", label: "Overtime Pay", format: "currency" },
      { key: "totalGrossPay", label: "Total Gross Pay", format: "currency", highlight: true },
      { key: "effectiveHourlyRate", label: "Effective Hourly Rate (blended)", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, your regular hours this week, your overtime hours, and your overtime multiplier " +
      "(1.5x is the standard \"time-and-a-half\" rate under US federal law for non-exempt employees past 40 " +
      "hours; 2x \"double time\" applies in some states or union contracts). The result breaks down regular pay, " +
      "overtime pay, total gross pay, and your blended effective hourly rate across all hours worked.",
    examples: "Example: $20 an hour, 40 regular hours, and 5 overtime hours at 1.5x comes to $800 regular pay plus $150 overtime pay — $950 total, a $21.11 blended effective rate.",
    assumptions: "Federal law (the FLSA) generally requires 1.5x pay past 40 hours in a week for non-exempt employees — some states and union agreements set stricter rules (like daily overtime past 8 hours, or double time in certain cases). Check your state's specific overtime rules if you're unsure which applies. " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does this include the tax impact of overtime?",
        answer: "No — this is gross pay only. See this site's Overtime Tax Calculator for the after-tax, take-home-pay version, which also shows how much extra tax the overtime specifically adds.",
      },
      {
        question: "Is overtime always 1.5x?",
        answer: "1.5x (\"time-and-a-half\") is the standard federal minimum for eligible employees past 40 hours a week, but some states require daily overtime or double time in specific situations — check your state's labor department for the exact rule that applies to you.",
      },
    ],
  },
  {
    slug: "paycheck-calculator",
    title: "Paycheck Calculator",
    description: "See your gross paycheck amount and what's left after common pre-tax deductions like 401(k) contributions and health insurance.",
    metaTitle: "Paycheck Calculator — Free & Instant",
    metaDescription: "Free paycheck calculator. Enter your salary, pay frequency, and pre-tax deductions to see your gross pay and pay after pre-tax deductions.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 2000000, step: 1000 }),
      payFrequencyField,
      percentField("retirement401kPercent", "401(k) Contribution (% of pay)", { default: 5, max: 100, step: 0.5 }),
      currencyField("healthInsurancePerPeriod", "Health Insurance Premium (per paycheck)", { required: false, default: 100, max: 5000, step: 10 }),
      currencyField("otherPreTaxPerPeriod", "Other Pre-Tax Deductions (per paycheck)", { required: false, default: 0, max: 5000, step: 10 }),
    ],
    calcResult: { label: "Pay After Pre-Tax Deductions", format: "currency" },
    calcResults: [
      { key: "grossPayPerPeriod", label: "Gross Pay Per Paycheck", format: "currency" },
      { key: "retirementContribution", label: "401(k) Contribution", format: "currency" },
      { key: "totalPreTaxDeductions", label: "Total Pre-Tax Deductions", format: "currency" },
      { key: "payAfterPreTaxDeductions", label: "Pay After Pre-Tax Deductions", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your annual salary, pay frequency, and any pre-tax payroll deductions you have — a 401(k) or " +
      "similar retirement contribution (as a percentage of pay), a health insurance premium, and any other " +
      "pre-tax deduction (like an HSA or FSA contribution). The result shows your gross pay per paycheck and " +
      "what's left after those pre-tax deductions are subtracted — this is roughly the wage figure income tax " +
      "withholding is then calculated against.",
    examples: "Example: a $60,000 salary paid biweekly, with a 5% 401(k) contribution and a $100 health insurance premium, comes to $2,307.69 gross, $215.38 in total pre-tax deductions, and $2,092.31 left before income tax withholding.",
    assumptions: "This covers pre-tax deductions only — it doesn't calculate income tax, FICA, or any post-tax deduction (like Roth 401(k) or wage garnishment). " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does lowering my taxable pay matter?",
        answer: "Pre-tax deductions (like a traditional 401(k), health insurance premiums, or an HSA/FSA) reduce the wage amount that income tax withholding is calculated against, which is why they're taken out before tax rather than after.",
      },
      {
        question: "Does this show my actual take-home pay?",
        answer: "Not quite — it shows your pay after pre-tax deductions but before income tax and FICA are withheld. For your full after-tax take-home pay, see this site's Salary Tax Calculator or a state-specific paycheck calculator.",
      },
    ],
  },
  {
    slug: "commission-calculator",
    title: "Commission Calculator",
    description: "Calculate gross commission earnings from sales amount and commission rate, plus any base pay.",
    metaTitle: "Commission Calculator — Free & Instant",
    metaDescription: "Free commission calculator. Enter your sales amount, commission rate, and base pay to see your commission earned and total gross pay.",
    calcInputs: [
      currencyField("salesAmount", "Sales Amount", { default: 10000, max: 10000000, step: 100 }),
      percentField("commissionRate", "Commission Rate", { default: 5, max: 100, step: 0.25 }),
      currencyField("basePayPerPeriod", "Base Pay This Period (0 if commission-only)", { required: false, default: 500, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Total Gross Pay", format: "currency" },
    calcResults: [
      { key: "commissionEarned", label: "Commission Earned", format: "currency" },
      { key: "totalGrossPay", label: "Total Gross Pay", format: "currency", highlight: true },
    ],
    instructions:
      "Enter your sales amount for the period, your commission rate, and any base pay you receive alongside " +
      "commission (enter 0 if you're commission-only). The result shows your commission earned and your total " +
      "gross pay for the period.",
    examples: "Example: $10,000 in sales at a 5% commission rate, plus a $500 base, comes to $500 in commission earned and $1,000 total gross pay.",
    assumptions: "This assumes a single flat commission rate applied to the full sales amount — some commission plans use tiered rates (a higher rate past a sales threshold) or draws against future commission, which this simple version doesn't model. " + NO_TAX_NOTE + " " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my commission rate changes at different sales tiers?",
        answer: "Calculate each tier's sales and rate separately and add the results together — this tool applies one flat rate per calculation.",
      },
      {
        question: "Does this include the tax impact of commission?",
        answer: "No — this is gross pay only. Commission is generally taxed as a \"supplemental wage\" similarly to a bonus; see this site's Commission Tax Calculator for the after-tax version.",
      },
    ],
  },
  {
    slug: "bonus-calculator",
    title: "Bonus Calculator",
    description: "Work out the gross bonus needed for an employee to receive a specific net amount, after standard federal withholding.",
    metaTitle: "Bonus Calculator (Gross-Up) — Free & Instant",
    metaDescription: "Free bonus calculator. Enter your desired net bonus amount to see the gross bonus needed after standard federal and FICA withholding.",
    calcInputs: [
      currencyField("desiredNetBonus", "Desired Net (Take-Home) Bonus", { default: 1000, max: 500000, step: 50 }),
    ],
    calcResult: { label: "Required Gross Bonus", format: "currency" },
    calcResults: [
      { key: "requiredGrossBonus", label: "Required Gross Bonus", format: "currency", highlight: true },
      { key: "federalWithholding", label: "Federal Withholding (22% flat rate)", format: "currency" },
      { key: "ficaWithholding", label: "FICA Withholding (7.65%)", format: "currency" },
      { key: "totalWithholding", label: "Total Withholding", format: "currency" },
    ],
    instructions:
      "This is a \"gross-up\" calculator: enter the NET (take-home) bonus amount you want an employee to " +
      "actually receive, and it works out the GROSS bonus amount that needs to be paid so that, after standard " +
      "withholding, the employee nets exactly that amount.\n\n" +
      "It uses the standard flat 22% federal supplemental wage withholding rate (which applies to most bonuses " +
      "up to $1,000,000 in a year) plus the standard 7.65% FICA rate (6.2% Social Security + 1.45% Medicare) — " +
      "29.65% combined.",
    examples: "Example: to give an employee a $1,000 net bonus after standard withholding, you'd need to pay a $1,421.46 gross bonus — $312.72 in federal withholding plus $108.74 in FICA, for $421.46 total withheld.",
    assumptions:
      "This uses FEDERAL withholding only (22% flat supplemental rate + 7.65% FICA) — it doesn't include state or " +
      "local income tax, which would require an even larger gross bonus to hit the same net target. It also " +
      "assumes the employee is under the $1,000,000 year-to-date supplemental wage threshold, above which a " +
      "higher 37% federal rate applies. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why 22% and not my employee's actual tax bracket?",
        answer: "The IRS allows (and most employers use) a flat 22% federal withholding rate specifically for supplemental wages like bonuses, regardless of the employee's actual marginal tax bracket — their real tax liability is reconciled later when they file their return.",
      },
      {
        question: "Does this include state tax?",
        answer: "No — this covers federal withholding only. If your state also withholds tax on bonuses, you'd need a larger gross bonus than shown here to hit the same net target; check your state's supplemental wage withholding rate.",
      },
      {
        question: "How is this different from the Bonus Tax Calculator?",
        answer: "This tool solves the reverse problem: it starts from a desired NET amount and finds the GROSS bonus needed. The Bonus Tax Calculator instead starts from a known GROSS bonus and shows what the employee nets after withholding.",
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
