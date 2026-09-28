// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Salary & Income Calculators" sub-batch A (Pay Conversions). Part of
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
// See src/lib/calc-engine-salary-conversions.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-conversions-calculators.ts
// or
//   npm run db:create-salary-conversions-calculators

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

const PAY_FREQUENCY_OPTIONS = [
  { label: "Weekly (52 a year)", value: 52 },
  { label: "Every Two Weeks (26 a year)", value: 26 },
  { label: "Twice a Month (24 a year)", value: 24 },
  { label: "Monthly (12 a year)", value: 12 },
];

const TOOLS: ToolDef[] = [
  {
    slug: "monthly-salary-calculator",
    title: "Monthly Salary Calculator",
    description: "Turn an annual salary into monthly pay — the base amount, the monthly figure including a yearly bonus, and what's left after tax.",
    metaTitle: "Monthly Salary Calculator — Annual to Monthly Pay",
    metaDescription: "Free monthly salary calculator. Convert your annual salary and bonus into monthly pay before and after tax, in one quick calculation.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("annualBonus", "Yearly Bonus (Optional)", { default: 5000, max: 10000000, step: 500 }),
      percentField("taxRatePercent", "Your Average Tax Rate", { default: 22, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Monthly Base Salary", format: "currency" },
    calcResults: [
      { key: "monthlyBaseSalary", label: "Monthly Base Salary", format: "currency", highlight: true },
      { key: "monthlyIncludingBonus", label: "Monthly Including Bonus", format: "currency" },
      { key: "monthlyAfterTax", label: "Monthly After Tax (Incl. Bonus)", format: "currency" },
      { key: "annualTotal", label: "Total Yearly Pay", format: "currency" },
    ],
    instructions:
      "Enter your annual salary, any yearly bonus you expect, and your average tax rate (total tax ÷ total income — not " +
      "your top bracket). The tool divides everything by 12 so you can budget month by month.",
    examples:
      "Example: a $60,000 salary is $5,000 a month. With a $5,000 bonus spread over the year it's $5,416.67, and at a 22% " +
      "average tax rate you'd take home about $4,225 a month.",
    assumptions: "Assumes pay is spread evenly across 12 months. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I work out my monthly salary?", answer: "Divide your annual salary by 12. If you're paid every two weeks, your paychecks won't match this exactly — see the Biweekly Salary Calculator." },
    ],
  },
  {
    slug: "weekly-salary-calculator",
    title: "Weekly Salary Calculator",
    description: "Work out your weekly pay from an annual salary — including when you're only paid for the weeks you actually work.",
    metaTitle: "Weekly Salary Calculator — Annual to Weekly Pay",
    metaDescription: "Free weekly salary calculator. Find your weekly pay from an annual salary, even if you're only paid for some weeks of the year.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 52000, max: 10000000, step: 1000 }),
      numberField("paidWeeks", "Weeks You're Paid For", { default: 48, min: 1, max: 53, step: 1 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Weekly Pay When Working", format: "currency" },
    calcResults: [
      { key: "weeklyPayWhenWorking", label: "Weekly Pay in Weeks You Work", format: "currency", highlight: true },
      { key: "averagePerCalendarWeek", label: "Average per Calendar Week", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent", format: "currency" },
      { key: "unpaidWeeks", label: "Unpaid Weeks", format: "number" },
    ],
    instructions:
      "Enter your yearly earnings and how many weeks you're actually paid for. Most salaried jobs pay all 52 weeks, but " +
      "seasonal, term-time or contract work often doesn't — so your weekly pay while working is higher than the yearly " +
      "average suggests.",
    examples:
      "Example: $52,000 earned over 48 paid weeks is $1,083.33 a week while working ($27.08 an hour at 40 hours), even " +
      "though it averages $1,000 per calendar week across the 4 unpaid weeks.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I convert an annual salary to weekly pay?", answer: "Divide the annual salary by 52 if you're paid every week of the year, or by the number of weeks you're actually paid for." },
    ],
  },
  {
    slug: "biweekly-salary-calculator",
    title: "Biweekly Salary Calculator",
    description: "Find your paycheck when you're paid every two weeks — 26 checks a year — and how the two \"extra\" three-paycheck months help your budget.",
    metaTitle: "Biweekly Salary Calculator — 26 Paychecks a Year",
    metaDescription: "Free biweekly salary calculator. See your paycheck every two weeks, your average monthly pay, and the bonus of two three-paycheck months.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 65000, max: 10000000, step: 1000 }),
      percentField("taxRatePercent", "Your Average Tax and Deductions", { default: 20, max: 70, step: 0.5 }),
    ],
    calcResult: { label: "Gross per Paycheck", format: "currency" },
    calcResults: [
      { key: "grossPerPaycheck", label: "Gross per Paycheck", format: "currency", highlight: true },
      { key: "netPerPaycheck", label: "Take-Home per Paycheck", format: "currency" },
      { key: "averageMonthlyNet", label: "Average Monthly Take-Home", format: "currency" },
      { key: "extraFromThreePaycheckMonths", label: "Extra from the Two 3-Paycheck Months", format: "currency" },
      { key: "annualNet", label: "Yearly Take-Home", format: "currency" },
    ],
    instructions:
      "Enter your annual salary and the share taken out for tax and deductions. Being paid every two weeks means 26 " +
      "paychecks a year — two more than twice-monthly pay — so twice a year a month has three paydays. If you budget on " +
      "two checks a month, those extra checks are money you can save or put toward debt.",
    examples:
      "Example: $65,000 a year is $2,500 per biweekly check, or $2,000 after 20% deductions. That averages $4,333.33 a " +
      "month, and the two three-paycheck months give you an extra $4,000 a year.",
    assumptions: "Some years have 27 biweekly paydays — see the Annual to Biweekly Salary Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Is biweekly the same as twice a month?", answer: "No. Biweekly is every two weeks (26 paychecks); twice a month (semi-monthly) is usually the 15th and last day (24 paychecks), so each semi-monthly check is a little bigger." },
    ],
  },
  {
    slug: "semi-monthly-salary-calculator",
    title: "Semi-Monthly Salary Calculator",
    description: "Calculate your paycheck when you're paid twice a month — 24 checks a year — and compare it with biweekly pay.",
    metaTitle: "Semi-Monthly Salary Calculator — Paid Twice a Month",
    metaDescription: "Free semi-monthly salary calculator. Find your twice-a-month paycheck, compare it with biweekly pay, and see the hours each check covers.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 72000, max: 10000000, step: 1000 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Semi-Monthly Paycheck", format: "currency" },
    calcResults: [
      { key: "semiMonthlyPaycheck", label: "Semi-Monthly Paycheck", format: "currency", highlight: true },
      { key: "biweeklyPaycheckForComparison", label: "Biweekly Paycheck (for Comparison)", format: "currency" },
      { key: "differencePerCheck", label: "Larger per Check Than Biweekly", format: "currency" },
      { key: "hoursCoveredPerCheck", label: "Hours Each Check Covers", format: "number" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent", format: "currency" },
    ],
    instructions:
      "Enter your annual salary and weekly hours. Semi-monthly pay divides your salary into 24 equal checks, usually on " +
      "the 15th and the last day of the month. The tool compares that with the smaller biweekly check and shows how many " +
      "hours each check pays for.",
    examples:
      "Example: $72,000 paid semi-monthly is $3,000 per check — $230.77 more than a $2,769.23 biweekly check. Each check " +
      "covers about 86.67 hours at 40 hours a week.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why are semi-monthly checks bigger than biweekly ones?", answer: "The same salary is split into 24 checks instead of 26, so each one is larger — but you get the same total over the year." },
    ],
  },
  {
    slug: "daily-salary-calculator",
    title: "Daily Salary Calculator",
    description: "Work out what you earn per working day — after holidays and paid time off — compared with your pay per paid day.",
    metaTitle: "Daily Salary Calculator — Pay per Working Day",
    metaDescription: "Free daily salary calculator. Find your pay per day actually worked after holidays and PTO, and the value of your paid days off.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 60000, max: 10000000, step: 1000 }),
      numberField("workDaysPerWeek", "Work Days per Week", { default: 5, min: 1, max: 7, step: 1 }),
      numberField("paidHolidays", "Paid Holidays per Year", { default: 10, min: 0, max: 60, step: 1 }),
      numberField("paidTimeOffDays", "Paid Vacation/PTO Days per Year", { default: 15, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Pay per Day Worked", format: "currency" },
    calcResults: [
      { key: "payPerDayWorked", label: "Pay per Day Actually Worked", format: "currency", highlight: true },
      { key: "payPerPaidDay", label: "Pay per Paid Day", format: "currency" },
      { key: "daysActuallyWorked", label: "Days Actually Worked", format: "number" },
      { key: "valueOfPaidDaysOff", label: "Value of Your Paid Days Off", format: "currency" },
    ],
    instructions:
      "Enter your salary, the days you work each week, and your paid holidays and vacation days. Your salary pays for " +
      "every weekday, but you only work some of them — so your pay per day actually worked is higher than your daily " +
      "rate.",
    examples:
      "Example: $60,000 over 260 paid weekdays is $230.77 a day. After 10 holidays and 15 PTO days you work 235 days, so " +
      "you earn $255.32 per day worked. Your 25 paid days off are worth $5,769.23.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's my daily rate for unpaid leave?", answer: "Employers usually use salary ÷ 260 working days (or the working days in that month). See the Salary per Day Calculator for a specific month." },
    ],
  },
  {
    slug: "hourly-wage-calculator",
    title: "Hourly Wage Calculator",
    description: "Find the hourly wage behind any amount of pay — a paycheck, a job, a project — from the pay and the hours worked.",
    metaTitle: "Hourly Wage Calculator — Pay ÷ Hours Worked",
    metaDescription: "Free hourly wage calculator. Find your hourly wage from any pay and hours worked, plus what that rate means per week and per year.",
    calcInputs: [
      currencyField("grossPay", "Pay Received", { default: 2400, max: 10000000, step: 50 }),
      numberField("hoursWorked", "Hours Worked for That Pay", { default: 80, min: 0.25, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Usual Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Hourly Wage", format: "currency" },
    calcResults: [
      { key: "hourlyWage", label: "Hourly Wage", format: "currency", highlight: true },
      { key: "weeklyAtThisRate", label: "Weekly at This Rate", format: "currency" },
      { key: "annualAtThisRate", label: "Yearly at This Rate", format: "currency" },
      { key: "minutesPerDollar", label: "Minutes of Work per Dollar", format: "number" },
    ],
    instructions:
      "Enter an amount you were paid and the hours it took — for example, a paycheck and the hours on your timesheet. " +
      "The tool divides pay by hours and shows what that rate adds up to over a normal week and year.",
    examples:
      "Example: $2,400 for 80 hours is $30 an hour. At 40 hours a week that's $1,200 a week or $62,400 a year — 2 minutes " +
      "of work for every dollar.",
    assumptions: "Uses gross (before-tax) pay. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I calculate my hourly wage from a salary?", answer: "Divide the annual salary by the hours you work in a year — usually 2,080 (40 hours × 52 weeks). The Salary to Hourly Calculator does this directly." },
    ],
  },
  {
    slug: "annual-salary-calculator",
    title: "Annual Salary Calculator",
    description: "Work out your annual salary from a single paycheck, whether you're paid weekly, every two weeks, twice a month or monthly.",
    metaTitle: "Annual Salary Calculator — From One Paycheck",
    metaDescription: "Free annual salary calculator. Enter one gross paycheck and your pay frequency to see your yearly salary, plus monthly, weekly and hourly.",
    calcInputs: [
      currencyField("payPerPeriod", "Gross Pay per Paycheck", { default: 2500, max: 1000000, step: 50 }),
      dropdownField("periodsPerYear", "How Often You're Paid", 26, PAY_FREQUENCY_OPTIONS),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Annual Salary", format: "currency" },
    calcResults: [
      { key: "annualSalary", label: "Annual Salary", format: "currency", highlight: true },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "weeklyEquivalent", label: "Weekly Equivalent", format: "currency" },
      { key: "hourlyEquivalent", label: "Hourly Equivalent", format: "currency" },
    ],
    instructions:
      "Take the gross (before-deductions) amount from one paycheck and choose how often you're paid. The tool multiplies " +
      "by the number of paychecks in a year — handy for job applications, loan forms or comparing offers.",
    examples:
      "Example: $2,500 every two weeks is $65,000 a year — $5,416.67 a month, $1,250 a week, or $31.25 an hour at 40 hours.",
    assumptions: "Uses the gross amount, not your take-home pay. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Should I use gross or net pay to find my annual salary?", answer: "Gross. Your salary is the amount before tax and deductions — it's the \"Gross pay\" line on your pay stub." },
    ],
  },
  {
    slug: "salary-conversion-calculator",
    title: "Salary Conversion Calculator",
    description: "Convert pay from any frequency — hourly, daily, weekly, biweekly, twice-monthly, monthly or yearly — into every other one at once.",
    metaTitle: "Salary Conversion Calculator — Any Pay Frequency",
    metaDescription: "Free salary conversion calculator. Convert hourly, daily, weekly, biweekly, semi-monthly, monthly or annual pay into all the others at once.",
    calcInputs: [
      currencyField("amount", "Pay Amount", { default: 25, max: 10000000, step: 1 }),
      dropdownField("frequency", "That Amount Is Per", 0, [
        { label: "Hour", value: 0 },
        { label: "Day", value: -1 },
        { label: "Week", value: 52 },
        { label: "Two Weeks", value: 26 },
        { label: "Half Month", value: 24 },
        { label: "Month", value: 12 },
        { label: "Year", value: 1 },
      ]),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
      numberField("daysPerWeek", "Days per Week", { default: 5, min: 1, max: 7, step: 1 }),
    ],
    calcResult: { label: "Annual", format: "currency" },
    calcResults: [
      { key: "annual", label: "Per Year", format: "currency", highlight: true },
      { key: "monthly", label: "Per Month", format: "currency" },
      { key: "semiMonthly", label: "Per Half Month", format: "currency" },
      { key: "biweekly", label: "Per Two Weeks", format: "currency" },
      { key: "weekly", label: "Per Week", format: "currency" },
      { key: "daily", label: "Per Day", format: "currency" },
      { key: "hourly", label: "Per Hour", format: "currency" },
    ],
    instructions:
      "Enter any pay amount, choose what period it covers, and set your usual hours and days per week. The tool converts " +
      "it to every common pay period in one step — useful when job ads, contracts and pay stubs all quote pay differently.",
    examples:
      "Example: $25 an hour at 40 hours and 5 days a week is $52,000 a year, $4,333.33 a month, $2,166.67 per half month, " +
      "$2,000 every two weeks, $1,000 a week and $200 a day.",
    assumptions: "Assumes 52 weeks of pay a year, with no unpaid time off or overtime. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How many working hours are in a year?", answer: "At 40 hours a week for 52 weeks, 2,080 — the standard figure employers use to convert salaries to hourly rates." },
    ],
  },
  {
    slug: "hourly-to-monthly-salary-calculator",
    title: "Hourly to Monthly Salary Calculator",
    description: "Convert an hourly wage into monthly pay the right way — and see how much the common \"× 4 weeks\" shortcut underestimates it.",
    metaTitle: "Hourly to Monthly Salary Calculator — Exact Figure",
    metaDescription: "Free hourly to monthly salary calculator. Convert your hourly wage to monthly pay correctly and see why multiplying by 4 weeks is too low.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Wage", { default: 20, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Monthly Salary", format: "currency" },
    calcResults: [
      { key: "monthlySalary", label: "Monthly Salary", format: "currency", highlight: true },
      { key: "fourWeekEstimate", label: "\"× 4 Weeks\" Estimate", format: "currency" },
      { key: "underestimatedBy", label: "Shortcut Underestimates By", format: "currency" },
      { key: "averageHoursPerMonth", label: "Average Hours per Month", format: "number" },
    ],
    instructions:
      "Enter your hourly wage and weekly hours. A month has about 4.33 weeks, not 4, so the correct monthly figure is " +
      "hourly rate × hours per week × 52 ÷ 12.",
    examples:
      "Example: $20 an hour for 40 hours a week is $3,466.67 a month (about 173.33 hours). Multiplying by 4 weeks gives " +
      "only $3,200 — $266.67 too low.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How many work hours are in a month?", answer: "About 173.33 at 40 hours a week (2,080 hours ÷ 12). An actual month can have 160 to 184 depending on its working days." },
    ],
  },
  {
    slug: "hourly-to-weekly-salary-calculator",
    title: "Hourly to Weekly Salary Calculator",
    description: "Turn your hourly wage into weekly pay, including any overtime hours at time-and-a-half or another rate.",
    metaTitle: "Hourly to Weekly Salary Calculator — With Overtime",
    metaDescription: "Free hourly to weekly salary calculator. Convert your hourly wage into weekly pay, including overtime hours at time-and-a-half.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Wage", { default: 22, max: 10000, step: 0.25 }),
      numberField("regularHours", "Regular Hours This Week", { default: 40, min: 0, max: 80, step: 0.5 }),
      numberField("overtimeHours", "Overtime Hours This Week", { default: 5, min: 0, max: 80, step: 0.5 }),
      numberField("overtimeMultiplier", "Overtime Multiplier", { default: 1.5, min: 1, max: 3, step: 0.25 }),
    ],
    calcResult: { label: "Weekly Pay", format: "currency" },
    calcResults: [
      { key: "weeklyPay", label: "Weekly Pay", format: "currency", highlight: true },
      { key: "regularPay", label: "Regular Pay", format: "currency" },
      { key: "overtimePay", label: "Overtime Pay", format: "currency" },
      { key: "annualIfEveryWeek", label: "Yearly If Every Week Were Like This", format: "currency" },
    ],
    instructions:
      "Enter your hourly wage, your regular hours and any overtime hours this week, and the overtime multiplier (1.5 is " +
      "time-and-a-half). The tool shows your gross weekly pay and what a full year of similar weeks would add up to.",
    examples:
      "Example: $22 an hour for 40 regular hours plus 5 overtime hours at 1.5× is $880 + $165 = $1,045 for the week — " +
      "$54,340 a year if every week were the same.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "When does overtime start?", answer: "Under the US federal Fair Labor Standards Act, non-exempt employees earn at least 1.5× pay for hours over 40 in a workweek. Some states also have daily overtime rules." },
    ],
  },
  {
    slug: "hourly-to-annual-salary-calculator",
    title: "Hourly to Annual Salary Calculator",
    description: "Convert an hourly wage into an annual salary — accounting for paid time off and any unpaid weeks.",
    metaTitle: "Hourly to Annual Salary Calculator — With Time Off",
    metaDescription: "Free hourly to annual salary calculator. Convert your hourly wage into yearly pay, allowing for paid time off and unpaid weeks.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Wage", { default: 25, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 1 }),
      numberField("paidWeeksOff", "Paid Weeks Off (Vacation, Holidays)", { default: 2, min: 0, max: 26, step: 1 }),
      numberField("unpaidWeeksOff", "Unpaid Weeks Off", { default: 1, min: 0, max: 52, step: 1 }),
    ],
    calcResult: { label: "Annual Salary", format: "currency" },
    calcResults: [
      { key: "annualSalary", label: "Annual Pay", format: "currency", highlight: true },
      { key: "fullYearAt52Weeks", label: "Full 52 Paid Weeks", format: "currency" },
      { key: "lostToUnpaidTime", label: "Lost to Unpaid Time Off", format: "currency" },
      { key: "valueOfPaidTimeOff", label: "Value of Your Paid Time Off", format: "currency" },
    ],
    instructions:
      "Enter your hourly wage and weekly hours, then how many weeks off are paid and how many aren't. Paid time off still " +
      "counts toward your annual pay; unpaid weeks don't.",
    examples:
      "Example: $25 an hour at 40 hours is $52,000 over a full year. With 1 unpaid week off you'd earn $51,000; your 2 paid " +
      "weeks off are worth $2,000.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's $25 an hour annually?", answer: "About $52,000 a year at 40 hours a week for 52 paid weeks ($25 × 2,080)." },
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
