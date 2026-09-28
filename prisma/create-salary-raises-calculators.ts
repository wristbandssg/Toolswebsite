// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Salary & Income Calculators" sub-batch E (Raises & Comparisons). Part of
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
// See src/lib/calc-engine-salary-raises.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-raises-calculators.ts
// or
//   npm run db:create-salary-raises-calculators

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
    slug: "raise-calculator",
    title: "Raise Calculator",
    description: "Calculate your new salary after a raise — given as a percentage or a dollar amount — and what it adds per year, month and paycheck.",
    metaTitle: "Raise Calculator — New Salary After a Raise",
    metaDescription: "Free raise calculator. Enter a raise as a percent or dollar amount to see your new salary and the extra per year, month and paycheck.",
    calcInputs: [
      currencyField("currentSalary", "Current Salary", { default: 60000, max: 10000000, step: 1000 }),
      dropdownField("raiseType", "Raise Given As", 1, [
        { label: "A percentage", value: 1 },
        { label: "A dollar amount per year", value: 2 },
      ]),
      numberField("raiseAmount", "Raise (% or $)", { default: 4, min: 0, max: 10000000, step: 0.5 }),
      dropdownField("periodsPerYear", "Pay Frequency", 26, [
        { label: "Weekly", value: 52 },
        { label: "Every Two Weeks", value: 26 },
        { label: "Twice a Month", value: 24 },
        { label: "Monthly", value: 12 },
      ]),
    ],
    calcResult: { label: "New Salary", format: "currency" },
    calcResults: [
      { key: "newSalary", label: "New Salary", format: "currency", highlight: true },
      { key: "raisePerYear", label: "Raise per Year", format: "currency" },
      { key: "raisePerMonth", label: "Raise per Month", format: "currency" },
      { key: "raisePerPaycheck", label: "Raise per Paycheck (Before Tax)", format: "currency" },
      { key: "raisePercent", label: "Raise as a Percentage", format: "percentage" },
    ],
    instructions: "Enter your current salary, choose whether your raise is a percentage or a yearly dollar amount, enter it, and pick your pay frequency.",
    examples: "Example: a 4% raise on $60,000 is $2,400 a year — a new salary of $62,400, or about $200 a month and $92.31 per biweekly paycheck before tax.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a typical annual raise?", answer: "In the US, average merit raises have typically been around 3–4% a year in recent years; promotions and job changes usually bring bigger jumps." },
    ],
  },
  {
    slug: "salary-increase-calculator",
    title: "Salary Increase Calculator",
    description: "See whether your salary increase beats inflation — your new salary, the real increase in buying power, and the salary needed just to keep pace.",
    metaTitle: "Salary Increase Calculator — Real Raise vs Inflation",
    metaDescription: "Free salary increase calculator. Compare your raise with inflation to see your real increase in buying power and the salary needed to keep pace.",
    calcInputs: [
      currencyField("currentSalary", "Current Salary", { default: 70000, max: 10000000, step: 1000 }),
      percentField("increasePercent", "Salary Increase", { default: 3.5, min: -50, max: 100, step: 0.1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, max: 30, step: 0.1 }),
    ],
    calcResult: { label: "Real Increase", format: "percentage" },
    calcResults: [
      { key: "realIncreasePercent", label: "Real Increase (After Inflation)", format: "percentage", highlight: true },
      { key: "newSalary", label: "New Salary", format: "currency" },
      { key: "salaryNeededToKeepPace", label: "Salary Needed to Keep Pace with Inflation", format: "currency" },
      { key: "aboveOrBelowInflation", label: "Above (+) or Below (−) Inflation", format: "currency" },
    ],
    instructions:
      "Enter your salary, the percentage increase you're getting, and the current inflation rate. A raise only increases " +
      "what you can buy if it's bigger than inflation — this shows your real, after-inflation raise.",
    examples: "Example: a 3.5% raise on $70,000 takes you to $72,450. With 3% inflation you needed $72,100 just to stand still, so your real raise is only 0.49% ($350).",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a real salary increase?", answer: "Your raise after subtracting inflation. A 3% raise with 3% inflation is a 0% real raise — your pay buys the same as before." },
    ],
  },
  {
    slug: "pay-raise-percentage-calculator",
    title: "Pay Raise Percentage Calculator",
    description: "Find the percentage raise between your old pay and your new pay, and how much more you'll earn per year and month.",
    metaTitle: "Pay Raise Percentage Calculator — Old vs New Pay",
    metaDescription: "Free pay raise percentage calculator. Enter your old and new pay to find the percentage raise and the extra per year and month.",
    calcInputs: [
      currencyField("oldPay", "Old Pay", { default: 52000, max: 10000000, step: 100 }),
      currencyField("newPay", "New Pay", { default: 55640, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Raise Percentage", format: "percentage" },
    calcResults: [
      { key: "raisePercent", label: "Raise Percentage", format: "percentage", highlight: true },
      { key: "raiseAmount", label: "Raise Amount", format: "currency" },
      { key: "raisePerMonth", label: "Raise per Month (If Yearly Figures)", format: "currency" },
    ],
    instructions: "Enter your old and new pay for the same period — both yearly, both hourly, and so on. The raise percentage is (new − old) ÷ old × 100.",
    examples: "Example: going from $52,000 to $55,640 is a 7% raise — $3,640 a year, or $303.33 a month.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I calculate a raise percentage?", answer: "Subtract the old pay from the new pay, divide by the old pay, and multiply by 100." },
    ],
  },
  {
    slug: "salary-decrease-calculator",
    title: "Salary Decrease Calculator",
    description: "Calculate the effect of a pay cut — your new salary, what you lose each year and month, and the raise you'd need later just to get back to where you were.",
    metaTitle: "Salary Decrease Calculator — Effect of a Pay Cut",
    metaDescription: "Free salary decrease calculator. See your salary after a pay cut, the yearly and monthly loss, and the raise needed to recover.",
    calcInputs: [
      currencyField("currentSalary", "Current Salary", { default: 80000, max: 10000000, step: 1000 }),
      percentField("decreasePercent", "Pay Cut", { default: 10, max: 99, step: 0.5 }),
    ],
    calcResult: { label: "New Salary", format: "currency" },
    calcResults: [
      { key: "newSalary", label: "Salary After the Cut", format: "currency", highlight: true },
      { key: "lossPerYear", label: "Loss per Year", format: "currency" },
      { key: "lossPerMonth", label: "Loss per Month", format: "currency" },
      { key: "raiseNeededToRecoverPercent", label: "Raise Needed Later to Recover", format: "percentage" },
    ],
    instructions:
      "Enter your salary and the percentage pay cut. Because a later raise is applied to the smaller salary, you need a " +
      "bigger percentage raise to get back — a 10% cut needs an 11.1% raise to recover.",
    examples: "Example: a 10% cut on $80,000 leaves $72,000 — $8,000 a year or $666.67 a month less. Getting back to $80,000 would take an 11.11% raise.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why doesn't a 10% raise undo a 10% pay cut?", answer: "The raise is a percentage of the smaller, reduced salary. 10% of $72,000 is only $7,200, leaving you $800 short of $80,000." },
    ],
  },
  {
    slug: "salary-difference-calculator",
    title: "Salary Difference Calculator",
    description: "Compare two salaries and see the difference per year, month, paycheck and hour, and as a percentage.",
    metaTitle: "Salary Difference Calculator — Compare Two Salaries",
    metaDescription: "Free salary difference calculator. See the difference between two salaries per year, month, paycheck and hour, and in percent.",
    calcInputs: [
      currencyField("salaryA", "Salary A (e.g. Current)", { default: 68000, max: 10000000, step: 1000 }),
      currencyField("salaryB", "Salary B (e.g. Offer)", { default: 75000, max: 10000000, step: 1000 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Difference per Year", format: "currency" },
    calcResults: [
      { key: "differencePerYear", label: "Difference per Year (B − A)", format: "currency", highlight: true },
      { key: "differencePercent", label: "Difference as % of Salary A", format: "percentage" },
      { key: "differencePerMonth", label: "Difference per Month", format: "currency" },
      { key: "differencePerBiweeklyCheck", label: "Difference per Biweekly Paycheck", format: "currency" },
      { key: "differencePerHour", label: "Difference per Hour", format: "currency" },
    ],
    instructions: "Enter two salaries — your current pay and an offer, for example — and your weekly hours. A positive difference means Salary B is higher.",
    examples: "Example: $75,000 versus $68,000 is $7,000 more a year (10.29%) — $583.33 a month, $269.23 per biweekly check, or $3.37 an hour.",
    assumptions: "Compares gross salaries only. For bonuses, benefits and commuting, use the Salary Comparison Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Is a 10% higher salary worth changing jobs for?", answer: "Maybe — compare the whole package: benefits, retirement match, commute, hours and growth prospects, not just base pay." },
    ],
  },
  {
    slug: "salary-comparison-calculator",
    title: "Salary Comparison Calculator",
    description: "Compare two job offers on total value — salary, bonus, retirement match and benefits, minus commuting costs — not just base pay.",
    metaTitle: "Salary Comparison Calculator — Compare Job Offers",
    metaDescription: "Free salary comparison calculator. Compare two jobs on total value: salary, bonus, retirement match and benefits minus commuting costs.",
    calcInputs: [
      currencyField("salaryA", "Job A — Salary", { default: 80000, max: 10000000, step: 1000 }),
      currencyField("bonusA", "Job A — Expected Bonus", { default: 5000, max: 10000000, step: 500 }),
      percentField("matchPercentA", "Job A — Retirement Match (% of Salary)", { default: 4, max: 25, step: 0.5 }),
      currencyField("benefitsA", "Job A — Other Benefits Value per Year", { default: 6000, max: 1000000, step: 500 }),
      currencyField("commuteCostA", "Job A — Commuting Cost per Year", { default: 3000, max: 1000000, step: 250 }),
      currencyField("salaryB", "Job B — Salary", { default: 88000, max: 10000000, step: 1000 }),
      currencyField("bonusB", "Job B — Expected Bonus", { default: 0, max: 10000000, step: 500 }),
      percentField("matchPercentB", "Job B — Retirement Match (% of Salary)", { default: 3, max: 25, step: 0.5 }),
      currencyField("benefitsB", "Job B — Other Benefits Value per Year", { default: 4000, max: 1000000, step: 500 }),
      currencyField("commuteCostB", "Job B — Commuting Cost per Year", { default: 5500, max: 1000000, step: 250 }),
    ],
    calcResult: { label: "Difference (B − A)", format: "currency" },
    calcResults: [
      { key: "differenceBMinusA", label: "Total Value Difference (B − A)", format: "currency", highlight: true },
      { key: "totalValueJobA", label: "Job A — Total Value", format: "currency" },
      { key: "totalValueJobB", label: "Job B — Total Value", format: "currency" },
      { key: "salaryDifferenceOnly", label: "Salary Difference Only", format: "currency" },
    ],
    instructions:
      "For each job enter the salary, expected bonus, retirement match, the yearly value of other benefits (the part of " +
      "health insurance the employer pays, and so on) and your commuting cost. A job with a higher salary can still be " +
      "worth less overall.",
    examples:
      "Example: Job B pays $8,000 more in salary, but Job A's $5,000 bonus, bigger match, better benefits and cheaper commute " +
      "make it worth $91,200 against $89,140 — Job A comes out $2,060 ahead.",
    assumptions: "All figures are before tax. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I value health insurance in a job offer?", answer: "Use the employer's share of the premium (often shown in your benefits summary or on a W-2 in box 12, code DD), plus any difference in your own premiums and deductibles." },
    ],
  },
  {
    slug: "hourly-wage-increase-calculator",
    title: "Hourly Wage Increase Calculator",
    description: "See what an hourly raise means per week, month and year, and as a percentage increase.",
    metaTitle: "Hourly Wage Increase Calculator — Raise per Hour",
    metaDescription: "Free hourly wage increase calculator. See your raise per hour as a percent and in extra pay per week, month and year.",
    calcInputs: [
      currencyField("currentHourly", "Current Hourly Wage", { default: 18, max: 10000, step: 0.25 }),
      currencyField("newHourly", "New Hourly Wage", { default: 19.5, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 38, min: 1, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Increase", format: "percentage" },
    calcResults: [
      { key: "increasePercent", label: "Increase", format: "percentage", highlight: true },
      { key: "extraPerWeek", label: "Extra per Week", format: "currency" },
      { key: "extraPerMonth", label: "Extra per Month", format: "currency" },
      { key: "extraPerYear", label: "Extra per Year", format: "currency" },
      { key: "newAnnualPay", label: "New Annual Pay", format: "currency" },
    ],
    instructions: "Enter your current and new hourly wage and your usual weekly hours. Small hourly raises add up — this shows by how much.",
    examples: "Example: going from $18 to $19.50 an hour is an 8.33% raise. At 38 hours a week that's $57 more a week, $247 a month and $2,964 a year, for $38,532 in total.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's a $1 raise worth per year?", answer: "About $2,080 before tax at 40 hours a week (2,080 hours × $1)." },
    ],
  },
  {
    slug: "income-growth-calculator",
    title: "Income Growth Calculator",
    description: "Find the average yearly growth rate of your income between two points in time, and where that trend would take you.",
    metaTitle: "Income Growth Calculator — Yearly Growth Rate",
    metaDescription: "Free income growth calculator. Find your income's average yearly growth rate (CAGR) and project your future income on the same trend.",
    calcInputs: [
      currencyField("startingIncome", "Income Then", { default: 45000, max: 10000000, step: 1000 }),
      currencyField("currentIncome", "Income Now", { default: 62000, max: 10000000, step: 1000 }),
      numberField("yearsBetween", "Years Between the Two", { default: 6, min: 0.5, max: 60, step: 0.5 }),
      numberField("yearsToProject", "Years to Project Ahead", { default: 5, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Average Yearly Growth", format: "percentage" },
    calcResults: [
      { key: "averageYearlyGrowthPercent", label: "Average Yearly Growth (CAGR)", format: "percentage", highlight: true },
      { key: "totalGrowthPercent", label: "Total Growth", format: "percentage" },
      { key: "incomeIncrease", label: "Increase in Dollars", format: "currency" },
      { key: "projectedIncome", label: "Projected Income on the Same Trend", format: "currency" },
    ],
    instructions:
      "Enter an earlier income, your income now and the years between them. The compound annual growth rate (CAGR) is the " +
      "steady yearly raise that would have produced the same change. The tool then projects ahead at that rate.",
    examples: "Example: going from $45,000 to $62,000 in 6 years is 37.78% growth — 5.49% a year on average. On the same trend you'd earn $80,979.36 in 5 years.",
    assumptions: "Past growth doesn't guarantee future raises. Compare with inflation to judge real growth. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What is CAGR?", answer: "Compound annual growth rate: (ending value ÷ starting value)^(1 ÷ years) − 1. It smooths uneven raises into one average yearly rate." },
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
