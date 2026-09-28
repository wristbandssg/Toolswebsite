// One-time (but safe to re-run) batch setup script: creates the 8 tools
// of the "Salary & Income Calculators" sub-batch I (Deductions, Gross & Net). Part of
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
// See src/lib/calc-engine-salary-deductions-net.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-deductions-net-calculators.ts
// or
//   npm run db:create-salary-deductions-net-calculators

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
    slug: "gross-to-net-salary-calculator",
    title: "Gross to Net Salary Calculator",
    description: "Convert a gross salary to net pay using the income tax, social contribution and pension rates you enter — works for any country.",
    metaTitle: "Gross to Net Salary Calculator — Any Country",
    metaDescription: "Free gross to net salary calculator. Enter your tax, social contribution and pension rates to see your net salary, line by line, for any country.",
    calcInputs: [
      currencyField("grossSalary", "Gross Annual Salary", { default: 60000, max: 100000000, step: 1000 }),
      percentField("incomeTaxPercent", "Income Tax (Average Rate)", { default: 15, max: 60, step: 0.5 }),
      percentField("socialContributionsPercent", "Social Security / National Insurance", { default: 7.65, max: 40, step: 0.05 }),
      percentField("pensionPercent", "Pension Contribution", { default: 5, max: 50, step: 0.5 }),
      currencyField("otherDeductionsPerYear", "Other Deductions per Year", { default: 1200, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Net Annual Salary", format: "currency" },
    calcResults: [
      { key: "netAnnualSalary", label: "Net Annual Salary", format: "currency", highlight: true },
      { key: "netMonthly", label: "Net Monthly", format: "currency" },
      { key: "incomeTax", label: "Income Tax", format: "currency" },
      { key: "socialContributions", label: "Social Contributions", format: "currency" },
      { key: "pensionContributions", label: "Pension Contributions", format: "currency" },
      { key: "takeHomePercent", label: "Share of Gross You Keep", format: "percentage" },
    ],
    instructions:
      "Enter your gross salary and the rates that apply to you: your average income tax rate, social security or national " +
      "insurance contributions, pension contributions, and any other yearly deductions. Because you enter the rates, it " +
      "works for any country. For US federal brackets worked out for you, use the Net Salary Calculator under Tax Calculators.",
    examples:
      "Example: $60,000 gross with 15% income tax ($9,000), 7.65% social contributions ($4,590), 5% pension ($3,000) and " +
      "$1,200 of other deductions leaves $42,210 net — $3,517.50 a month, or 70.35% of gross.",
    assumptions: "Applies flat rates to the whole salary; progressive tax systems give a lower average rate than your top rate. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the difference between gross and net salary?", answer: "Gross is your salary before anything is deducted; net is what you actually receive after income tax, social contributions, pension and other deductions." },
    ],
  },
  {
    slug: "income-replacement-calculator",
    title: "Income Replacement Calculator",
    description: "See how much of your take-home pay disability insurance would replace — allowing for the benefit percentage, a monthly cap and whether benefits are taxed.",
    metaTitle: "Income Replacement Calculator — Disability Cover",
    metaDescription: "Free income replacement calculator. See how much of your take-home pay disability insurance would replace, with caps and tax taken into account.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 72000, max: 10000000, step: 1000 }),
      percentField("benefitPercent", "Benefit (% of Salary)", { default: 60, max: 100, step: 5 }),
      currencyField("monthlyBenefitCap", "Maximum Monthly Benefit", { default: 5000, max: 1000000, step: 250 }),
      dropdownField("whoPaidPremium", "Who Pays the Premium?", 1, [
        { label: "Employer (benefits are taxable)", value: 1 },
        { label: "Me, with after-tax money (benefits are tax-free)", value: 2 },
      ]),
      percentField("taxRatePercent", "Your Average Tax Rate", { default: 20, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Monthly Benefit After Tax", format: "currency" },
    calcResults: [
      { key: "monthlyBenefitAfterTax", label: "Monthly Benefit After Tax", format: "currency", highlight: true },
      { key: "monthlyBenefitBeforeTax", label: "Monthly Benefit Before Tax", format: "currency" },
      { key: "shareOfTakeHomeReplacedPercent", label: "Share of Take-Home Pay Replaced", format: "percentage" },
      { key: "monthlyShortfall", label: "Monthly Shortfall vs Your Take-Home", format: "currency" },
    ],
    instructions:
      "Enter your salary, the policy's benefit percentage (60% is common for group long-term disability) and its monthly " +
      "cap, who pays the premium, and your average tax rate. If your employer pays the premium, benefits are usually " +
      "taxable; if you pay with after-tax money, they're usually tax-free.",
    examples:
      "Example: 60% of a $72,000 salary is $3,600 a month. Paid for by the employer and taxed at 20%, you'd receive $2,880 — " +
      "60% of your $4,800 take-home, leaving a $1,920 monthly gap.",
    assumptions: "Check your own policy's definition of salary, waiting period, benefit period and offsets (such as Social Security). " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How much disability insurance do I need?", answer: "Enough to cover essential expenses if you couldn't work. Group plans often replace 60% of salary before tax; an individual policy can fill the gap." },
    ],
  },
  {
    slug: "salary-after-deductions-calculator",
    title: "Salary After Deductions Calculator",
    description: "Calculate your salary after pre-tax deductions, tax and post-tax deductions — and how much tax your pre-tax deductions save you.",
    metaTitle: "Salary After Deductions Calculator — Pre vs Post Tax",
    metaDescription: "Free salary after deductions calculator. Apply pre-tax deductions, tax and post-tax deductions to your salary and see the tax you save.",
    calcInputs: [
      currencyField("grossSalary", "Gross Annual Salary", { default: 75000, max: 100000000, step: 1000 }),
      percentField("preTaxRetirementPercent", "Pre-Tax Retirement (e.g. 401(k))", { default: 6, max: 100, step: 0.5 }),
      currencyField("preTaxHealthPerYear", "Pre-Tax Health Premiums and HSA per Year", { default: 2400, max: 1000000, step: 100 }),
      currencyField("otherPreTaxPerYear", "Other Pre-Tax Deductions per Year (FSA, Commuter)", { default: 1000, max: 1000000, step: 100 }),
      percentField("taxRatePercent", "Tax Rate on Remaining Pay", { default: 25, max: 60, step: 0.5 }),
      currencyField("postTaxDeductionsPerYear", "Post-Tax Deductions per Year (Roth, Union Dues)", { default: 600, max: 1000000, step: 100 }),
    ],
    calcResult: { label: "Net Salary", format: "currency" },
    calcResults: [
      { key: "netSalaryPerYear", label: "Salary After All Deductions", format: "currency", highlight: true },
      { key: "netPerMonth", label: "Per Month", format: "currency" },
      { key: "preTaxDeductions", label: "Pre-Tax Deductions", format: "currency" },
      { key: "taxOnRemainingPay", label: "Tax on Remaining Pay", format: "currency" },
      { key: "taxSavedByPreTaxDeductions", label: "Tax Saved by Pre-Tax Deductions", format: "currency" },
    ],
    instructions:
      "Enter your salary, pre-tax deductions (they come out before tax and shrink your taxable pay), the tax rate on what's " +
      "left, and post-tax deductions (taken after tax). The last result shows how much tax the pre-tax deductions save.",
    examples:
      "Example: on $75,000, $7,900 of pre-tax deductions leave $67,100 taxable. At 25% that's $16,775 of tax; after $600 of " +
      "post-tax deductions you keep $49,725 ($4,143.75 a month). The pre-tax deductions saved $1,975 of tax.",
    assumptions: "Uses one flat tax rate. Some pre-tax deductions (like 401(k)) still owe Social Security and Medicare tax. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the difference between pre-tax and post-tax deductions?", answer: "Pre-tax deductions come out before income tax is calculated, so they lower your tax. Post-tax deductions come out afterwards and don't." },
    ],
  },
  {
    slug: "paycheck-deductions-calculator",
    title: "Paycheck Deductions Calculator",
    description: "Find out how much is being deducted from your paycheck — per check, as a percentage of gross, and per year — from the gross and net on your pay stub.",
    metaTitle: "Paycheck Deductions Calculator — How Much Is Taken",
    metaDescription: "Free paycheck deductions calculator. Enter the gross and net from your pay stub to see total deductions per check, per year and as a percentage.",
    calcInputs: [
      currencyField("grossPerCheck", "Gross Pay per Paycheck", { default: 2800, max: 1000000, step: 25 }),
      currencyField("netPerCheck", "Net (Take-Home) Pay per Paycheck", { default: 2050, max: 1000000, step: 25 }),
      dropdownField("periodsPerYear", "Pay Frequency", 26, [
        { label: "Weekly", value: 52 },
        { label: "Every Two Weeks", value: 26 },
        { label: "Twice a Month", value: 24 },
        { label: "Monthly", value: 12 },
      ]),
    ],
    calcResult: { label: "Deductions per Check", format: "currency" },
    calcResults: [
      { key: "deductionsPerCheck", label: "Deductions per Paycheck", format: "currency", highlight: true },
      { key: "deductionsPercentOfGross", label: "Deductions as % of Gross", format: "percentage" },
      { key: "deductionsPerYear", label: "Deductions per Year", format: "currency" },
      { key: "netPayPerYear", label: "Take-Home Pay per Year", format: "currency" },
    ],
    instructions: "Enter the gross and net amounts from a pay stub and your pay frequency. The gap between them is everything deducted — taxes, benefits, retirement and more.",
    examples: "Example: $2,800 gross and $2,050 net means $750 is deducted each check — 26.79% of gross, or $19,500 a year. Your yearly take-home is $53,300.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What percentage of a paycheck goes to deductions?", answer: "For many US workers, roughly 20–35% once federal and state tax, Social Security, Medicare, benefits and retirement contributions are included." },
    ],
  },
  {
    slug: "pre-tax-income-calculator",
    title: "Pre-Tax Income Calculator",
    description: "Find how much pre-tax income you must earn to pay for something with after-tax money — and how many hours of work that takes.",
    metaTitle: "Pre-Tax Income Calculator — Earn This to Afford It",
    metaDescription: "Free pre-tax income calculator. See how much you must earn before tax to pay for a purchase, and how many hours of work it really costs.",
    calcInputs: [
      currencyField("afterTaxAmount", "Cost (Paid with After-Tax Money)", { default: 5000, max: 100000000, step: 100 }),
      percentField("incomeTaxPercent", "Your Income Tax Rate (Top Bracket)", { default: 22, max: 60, step: 0.5 }),
      percentField("payrollTaxPercent", "Payroll Tax (Social Security + Medicare)", { default: 7.65, max: 20, step: 0.05 }),
      currencyField("hourlyWage", "Your Hourly Wage", { default: 30, max: 10000, step: 0.5 }),
    ],
    calcResult: { label: "Pre-Tax Income Needed", format: "currency" },
    calcResults: [
      { key: "preTaxIncomeNeeded", label: "Pre-Tax Income Needed", format: "currency", highlight: true },
      { key: "taxOnThatIncome", label: "Tax on That Income", format: "currency" },
      { key: "hoursOfWorkNeeded", label: "Hours of Work It Takes", format: "number" },
      { key: "youKeepPerDollarEarned", label: "You Keep per Dollar Earned", format: "currency" },
    ],
    instructions:
      "Enter the price of something you'd pay for from your take-home pay — a vacation, a car repair, a gadget — plus your " +
      "top income tax rate, payroll tax and hourly wage. The tool shows how much you actually have to earn to pay for it.",
    examples:
      "Example: at a 22% income tax rate plus 7.65% payroll tax, you keep about $0.70 of each extra dollar. A $5,000 purchase " +
      "needs $7,107.32 of pre-tax pay — about 236.91 hours of work at $30 an hour.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why are pre-tax benefits valuable?", answer: "Paying for something through a pre-tax deduction (like an FSA or HSA) skips the tax, so it costs you less of your gross pay than paying with after-tax money." },
    ],
  },
  {
    slug: "post-tax-income-calculator",
    title: "Post-Tax Income Calculator",
    description: "Break your after-tax income down per year, month, paycheck, week, day and hour.",
    metaTitle: "Post-Tax Income Calculator — Every Time Period",
    metaDescription: "Free post-tax income calculator. See your after-tax income per year, month, biweekly paycheck, week, day and hour.",
    calcInputs: [
      currencyField("annualIncome", "Annual Pre-Tax Income", { default: 68000, max: 100000000, step: 1000 }),
      percentField("effectiveTaxRatePercent", "Effective Tax Rate (All Taxes)", { default: 24, max: 70, step: 0.5 }),
      numberField("hoursPerWeek", "Hours Worked per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Post-Tax Annual", format: "currency" },
    calcResults: [
      { key: "postTaxAnnual", label: "Per Year", format: "currency", highlight: true },
      { key: "postTaxMonthly", label: "Per Month", format: "currency" },
      { key: "postTaxBiweekly", label: "Per Biweekly Paycheck", format: "currency" },
      { key: "postTaxWeekly", label: "Per Week", format: "currency" },
      { key: "postTaxDaily", label: "Per Working Day", format: "currency" },
      { key: "postTaxHourly", label: "Per Hour", format: "currency" },
    ],
    instructions: "Enter your annual income and your effective tax rate — all taxes you pay divided by your income. The tool shows your after-tax income in every period you might budget with.",
    examples: "Example: $68,000 at a 24% effective rate leaves $51,680 a year — $4,306.67 a month, $1,987.69 every two weeks, $993.85 a week, $198.77 a working day or $24.85 an hour.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the difference between effective and marginal tax rate?", answer: "Your marginal rate is the rate on your last dollar; your effective rate is your total tax divided by total income. Use the effective rate for take-home pay." },
    ],
  },
  {
    slug: "gross-monthly-income-calculator",
    title: "Gross Monthly Income Calculator",
    description: "Calculate your gross monthly income for a loan, mortgage or rental application — from hourly pay, regular overtime, bonus and other income.",
    metaTitle: "Gross Monthly Income Calculator — For Applications",
    metaDescription: "Free gross monthly income calculator. Work out gross monthly income from hourly pay, overtime, bonus and other income for loan or rental forms.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 26, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Regular Hours per Week", { default: 40, min: 0, max: 80, step: 0.5 }),
      numberField("overtimeHoursPerWeek", "Average Overtime Hours per Week", { default: 3, min: 0, max: 60, step: 0.5 }),
      currencyField("annualBonus", "Yearly Bonus", { default: 2400, max: 10000000, step: 100 }),
      currencyField("otherMonthlyIncome", "Other Monthly Income", { default: 0, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Gross Monthly Income", format: "currency" },
    calcResults: [
      { key: "grossMonthlyIncome", label: "Gross Monthly Income", format: "currency", highlight: true },
      { key: "basePayPerMonth", label: "Base Pay per Month", format: "currency" },
      { key: "overtimePerMonth", label: "Overtime per Month", format: "currency" },
      { key: "grossAnnualIncome", label: "Gross Annual Income", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, regular weekly hours, average overtime (paid at 1.5×), yearly bonus and any other monthly " +
      "income. Landlords and lenders usually ask for gross (before-tax) monthly income — often wanting rent to be no more " +
      "than about a third of it.",
    examples: "Example: $26 an hour for 40 hours ($4,506.67 a month), 3 overtime hours a week ($507 a month) and a $2,400 bonus ($200 a month) make $5,213.67 a month — $62,564 a year.",
    assumptions: "Lenders may only count overtime and bonus with a two-year history. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I calculate gross monthly income from hourly pay?", answer: "Multiply your hourly rate by weekly hours, then by 52, and divide by 12." },
    ],
  },
  {
    slug: "net-monthly-income-calculator",
    title: "Net Monthly Income Calculator",
    description: "Turn your take-home paycheck into true net monthly income on any pay schedule — and see how a typical month compares.",
    metaTitle: "Net Monthly Income Calculator — From Your Paycheck",
    metaDescription: "Free net monthly income calculator. Convert your take-home paycheck into true monthly income and compare it with a typical month.",
    calcInputs: [
      currencyField("netPaycheck", "Take-Home Pay per Paycheck", { default: 1950, max: 1000000, step: 25 }),
      dropdownField("periodsPerYear", "Pay Frequency", 26, [
        { label: "Weekly", value: 52 },
        { label: "Every Two Weeks", value: 26 },
        { label: "Twice a Month", value: 24 },
        { label: "Monthly", value: 12 },
      ]),
      currencyField("otherNetMonthly", "Other Monthly Take-Home Income", { default: 0, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Net Monthly Income", format: "currency" },
    calcResults: [
      { key: "netMonthlyIncome", label: "True Net Monthly Income (Average)", format: "currency", highlight: true },
      { key: "typicalMonthOnPaychecksAlone", label: "Income in a Typical Month", format: "currency" },
      { key: "netAnnualIncome", label: "Net Annual Income", format: "currency" },
      { key: "extraPaychecksPerYear", label: "Extra Paychecks per Year", format: "number" },
    ],
    instructions:
      "Enter the take-home amount of one paycheck, how often you're paid, and any other monthly take-home income. Weekly " +
      "and biweekly pay don't divide evenly into months — most months have 4 (or 2) paydays, but a few have more.",
    examples: "Example: $1,950 every two weeks averages $4,225 a month ($50,700 a year). A typical month brings only $3,900 from two paychecks — the 2 extra paychecks come in the three-payday months.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Should I budget on my average or typical monthly income?", answer: "Budget on the typical month (e.g. two biweekly checks) and treat the extra paychecks as a bonus for savings or debt — it keeps your budget safe in every month." },
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
