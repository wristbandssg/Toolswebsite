// One-time (but safe to re-run) batch setup script: creates the 12 tools
// of the "Salary & Income Calculators" sub-batch F (Income Totals & Averages). Part of
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
// See src/lib/calc-engine-salary-income-sources.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-income-sources-calculators.ts
// or
//   npm run db:create-salary-income-sources-calculators

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
    slug: "income-calculator",
    title: "Income Calculator",
    description: "Add up your total income from salary, bonus and other sources, and see it before and after tax per year, month and week.",
    metaTitle: "Income Calculator — Gross and Net Income",
    metaDescription: "Free income calculator. Total your salary, bonus and other income and see your gross and after-tax income per year, month and week.",
    calcInputs: [
      currencyField("salary", "Salary or Wages per Year", { default: 58000, max: 10000000, step: 1000 }),
      currencyField("bonus", "Bonus per Year", { default: 3000, max: 10000000, step: 500 }),
      currencyField("otherIncome", "Other Income per Year", { default: 2400, max: 10000000, step: 500 }),
      percentField("averageTaxRatePercent", "Average Tax Rate", { default: 18, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Gross Annual Income", format: "currency" },
    calcResults: [
      { key: "grossAnnualIncome", label: "Gross Annual Income", format: "currency", highlight: true },
      { key: "netAnnualIncome", label: "Net Annual Income (After Tax)", format: "currency" },
      { key: "grossMonthly", label: "Gross Monthly", format: "currency" },
      { key: "netMonthly", label: "Net Monthly", format: "currency" },
      { key: "netWeekly", label: "Net Weekly", format: "currency" },
    ],
    instructions:
      "Enter your yearly salary, bonus and any other income (interest, rent, side work), plus your average tax rate — your " +
      "total tax divided by total income. The tool shows your income before and after tax in the periods you budget with.",
    examples: "Example: $58,000 salary, $3,000 bonus and $2,400 other income make $63,400 gross. At an 18% average tax rate that's $51,988 net — $4,332.33 a month or $999.77 a week.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the difference between gross and net income?", answer: "Gross income is everything you earn before tax; net income is what's left after income tax and other taxes." },
    ],
  },
  {
    slug: "monthly-income-calculator",
    title: "Monthly Income Calculator",
    description: "Combine income paid on different schedules — weekly, every two weeks, twice a month, monthly and yearly — into one monthly income figure.",
    metaTitle: "Monthly Income Calculator — Mixed Pay Schedules",
    metaDescription: "Free monthly income calculator. Combine weekly, biweekly, semi-monthly, monthly and yearly income into one accurate monthly figure.",
    calcInputs: [
      currencyField("weeklyIncome", "Income Paid Weekly", { default: 0, max: 1000000, step: 25 }),
      currencyField("biweeklyIncome", "Income Paid Every Two Weeks", { default: 1800, max: 1000000, step: 25 }),
      currencyField("semiMonthlyIncome", "Income Paid Twice a Month", { default: 0, max: 1000000, step: 25 }),
      currencyField("monthlyIncome", "Income Paid Monthly", { default: 600, max: 1000000, step: 25 }),
      currencyField("yearlyIncome", "Income Paid Once a Year", { default: 1200, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Total Monthly Income", format: "currency" },
    calcResults: [
      { key: "totalMonthlyIncome", label: "Total Monthly Income", format: "currency", highlight: true },
      { key: "annualIncome", label: "Annual Income", format: "currency" },
      { key: "weeklyAverage", label: "Weekly Average", format: "currency" },
    ],
    instructions:
      "Enter each income under the schedule it's paid on — for example a biweekly paycheck, a monthly pension and a yearly " +
      "dividend. The tool converts each one correctly (weekly × 52 ÷ 12, biweekly × 26 ÷ 12) and adds them up.",
    examples: "Example: a $1,800 biweekly paycheck ($3,900 a month), $600 of monthly income and $1,200 once a year ($100 a month) make $4,600 a month — $55,200 a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I convert biweekly pay to monthly income?", answer: "Multiply by 26 and divide by 12 — not by 2, which would leave out the two extra paychecks you get each year." },
    ],
  },
  {
    slug: "weekly-income-calculator",
    title: "Weekly Income Calculator",
    description: "Calculate weekly income from an hourly job including tips and other weekly earnings, and your effective hourly rate with tips.",
    metaTitle: "Weekly Income Calculator — Wages Plus Tips",
    metaDescription: "Free weekly income calculator. Add hourly wages, tips and other weekly earnings to find your weekly, monthly and yearly income.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Wage", { default: 15, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 32, min: 0, max: 100, step: 0.5 }),
      currencyField("tipsPerWeek", "Tips per Week", { default: 180, max: 100000, step: 10 }),
      currencyField("otherWeekly", "Other Weekly Earnings", { default: 0, max: 100000, step: 10 }),
    ],
    calcResult: { label: "Weekly Income", format: "currency" },
    calcResults: [
      { key: "weeklyIncome", label: "Weekly Income", format: "currency", highlight: true },
      { key: "monthlyIncome", label: "Monthly Income", format: "currency" },
      { key: "annualIncome", label: "Annual Income", format: "currency" },
      { key: "effectiveHourlyIncludingTips", label: "Effective Hourly Rate with Tips", format: "currency" },
    ],
    instructions: "Enter your hourly wage and hours, your average weekly tips, and any other weekly earnings. Great for service and hospitality jobs where tips are a big part of pay.",
    examples: "Example: $15 an hour for 32 hours plus $180 in tips is $660 a week — $2,860 a month or $34,320 a year, an effective $20.63 an hour.",
    assumptions: "Tips are income and must be reported for tax. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Do tips count as income?", answer: "Yes. In the US, cash and card tips are taxable income and must be reported to your employer when they total $20 or more in a month." },
    ],
  },
  {
    slug: "daily-income-calculator",
    title: "Daily Income Calculator",
    description: "Break your annual income down to a daily figure — per working day, per weekday and per calendar day.",
    metaTitle: "Daily Income Calculator — Income per Day",
    metaDescription: "Free daily income calculator. Break annual income down into income per working day, per weekday and per calendar day.",
    calcInputs: [
      currencyField("annualIncome", "Annual Income", { default: 65000, max: 10000000, step: 1000 }),
      numberField("workDaysPerYear", "Days You Actually Work per Year", { default: 235, min: 1, max: 366, step: 1 }),
    ],
    calcResult: { label: "Income per Work Day", format: "currency" },
    calcResults: [
      { key: "incomePerWorkDay", label: "Income per Day Worked", format: "currency", highlight: true },
      { key: "incomePerWeekday", label: "Income per Weekday (260)", format: "currency" },
      { key: "incomePerCalendarDay", label: "Income per Calendar Day (365)", format: "currency" },
      { key: "incomePerMonth", label: "Income per Month", format: "currency" },
    ],
    instructions: "Enter your annual income and how many days you actually work (about 235 for a full-time job with holidays and vacation). The calendar-day figure is handy for comparing with daily spending.",
    examples: "Example: $65,000 over 235 working days is $276.60 a day worked, $250 per weekday, or $178.08 per calendar day.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How many working days are in a year?", answer: "About 260 weekdays; after around 10 public holidays and 15 vacation days, a typical full-time worker works about 235." },
    ],
  },
  {
    slug: "household-income-calculator",
    title: "Household Income Calculator",
    description: "Add up everyone's income in your household, and see the monthly total, the income per person, and how much depends on the main earner.",
    metaTitle: "Household Income Calculator — Total & per Person",
    metaDescription: "Free household income calculator. Add every earner's income plus other household income for your total, monthly and per-person figures.",
    calcInputs: [
      currencyField("earner1", "Earner 1 — Annual Income", { default: 62000, max: 10000000, step: 1000 }),
      currencyField("earner2", "Earner 2 — Annual Income", { default: 48000, max: 10000000, step: 1000 }),
      currencyField("otherEarners", "Other Earners — Annual Income", { default: 0, max: 10000000, step: 1000 }),
      currencyField("otherHouseholdIncome", "Other Household Income (Benefits, Rent, Support)", { default: 3000, max: 10000000, step: 500 }),
      numberField("householdSize", "People in the Household", { default: 4, min: 1, max: 20, step: 1 }),
    ],
    calcResult: { label: "Household Income", format: "currency" },
    calcResults: [
      { key: "totalHouseholdIncome", label: "Total Household Income", format: "currency", highlight: true },
      { key: "monthlyHouseholdIncome", label: "Monthly Household Income", format: "currency" },
      { key: "incomePerPerson", label: "Income per Person", format: "currency" },
      { key: "largestEarnerSharePercent", label: "Share from the Largest Earner", format: "percentage" },
    ],
    instructions:
      "Enter each earner's yearly income, any other income the household receives, and how many people live in the " +
      "household. Many programs, forms and surveys ask for total household income, and per-person income helps compare " +
      "households of different sizes.",
    examples: "Example: $62,000 + $48,000 + $3,000 of other income is $113,000 a year ($9,416.67 a month). For 4 people that's $28,250 each; the main earner provides 54.87%.",
    assumptions: "Uses gross income. Definitions of \"household income\" vary by program — check the form you're filling in. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What counts as household income?", answer: "Usually the combined gross income of everyone living together — wages, self-employment, benefits, pensions and investment income. Some programs only count certain members." },
    ],
  },
  {
    slug: "combined-income-calculator",
    title: "Combined Income Calculator",
    description: "Combine two applicants' incomes for a loan, mortgage or lease, and see your debt-to-income ratio now and with a new payment.",
    metaTitle: "Combined Income Calculator — Two Applicants & DTI",
    metaDescription: "Free combined income calculator. Add two applicants' incomes and check your debt-to-income ratio before and after a new loan payment.",
    calcInputs: [
      currencyField("applicant1Monthly", "Applicant 1 — Gross Monthly Income", { default: 4800, max: 1000000, step: 100 }),
      currencyField("applicant2Monthly", "Applicant 2 — Gross Monthly Income", { default: 3600, max: 1000000, step: 100 }),
      currencyField("otherMonthly", "Other Monthly Income", { default: 0, max: 1000000, step: 100 }),
      currencyField("monthlyDebtPayments", "Current Monthly Debt Payments", { default: 900, max: 1000000, step: 50 }),
      currencyField("plannedNewPayment", "New Payment (Mortgage, Rent, Loan)", { default: 1800, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Combined Monthly Income", format: "currency" },
    calcResults: [
      { key: "combinedMonthlyIncome", label: "Combined Monthly Income", format: "currency", highlight: true },
      { key: "combinedAnnualIncome", label: "Combined Annual Income", format: "currency" },
      { key: "debtToIncomeNowPercent", label: "Debt-to-Income Now", format: "percentage" },
      { key: "debtToIncomeWithNewPaymentPercent", label: "Debt-to-Income with New Payment", format: "percentage" },
    ],
    instructions:
      "Enter both applicants' gross monthly incomes, any other income, your current monthly debt payments (loans, card " +
      "minimums) and the new payment you're applying for. Lenders often look for a total debt-to-income ratio of about " +
      "36–43% or less.",
    examples: "Example: $4,800 + $3,600 is $8,400 a month ($100,800 a year). $900 of debts is a 10.71% DTI; adding an $1,800 mortgage makes it 32.14%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What debt-to-income ratio do lenders want?", answer: "Many mortgage lenders prefer 36% or less and often allow up to about 43–45%; some programs go higher. Lower is better." },
    ],
  },
  {
    slug: "part-time-income-calculator",
    title: "Part-Time Income Calculator",
    description: "Calculate your part-time income for the year, and compare it with the same job full-time.",
    metaTitle: "Part-Time Income Calculator — vs Full-Time",
    metaDescription: "Free part-time income calculator. See your yearly and monthly part-time earnings, your FTE, and what the same job pays full-time.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Wage", { default: 17, max: 10000, step: 0.25 }),
      numberField("hoursPerWeek", "Hours per Week", { default: 20, min: 0, max: 60, step: 0.5 }),
      numberField("weeksPerYear", "Weeks Worked per Year", { default: 50, min: 1, max: 53, step: 1 }),
      numberField("fullTimeHours", "Full-Time Hours per Week", { default: 40, min: 1, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Annual Part-Time Income", format: "currency" },
    calcResults: [
      { key: "annualPartTimeIncome", label: "Annual Part-Time Income", format: "currency", highlight: true },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "fullTimeEquivalentPercent", label: "Full-Time Equivalent", format: "percentage" },
      { key: "sameJobFullTime", label: "Same Job Full-Time", format: "currency" },
      { key: "lessThanFullTime", label: "Less Than Full-Time", format: "currency" },
    ],
    instructions: "Enter your hourly wage, your part-time hours, the weeks you work, and what counts as full-time at your workplace.",
    examples: "Example: 20 hours a week at $17 for 50 weeks is $17,000 a year ($1,416.67 a month) — half-time (50%), versus $34,000 full-time.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How many hours is part-time?", answer: "There's no single legal definition in the US; employers often treat under 30–35 hours a week as part-time. The Affordable Care Act uses 30 hours for its full-time rules." },
    ],
  },
  {
    slug: "full-time-income-calculator",
    title: "Full-Time Income Calculator",
    description: "See the full value of a full-time job — salary plus health coverage, retirement match and other benefits — and what paid time off is worth.",
    metaTitle: "Full-Time Income Calculator — Salary + Benefits",
    metaDescription: "Free full-time income calculator. Add health coverage, retirement match and other benefits to your salary to see your total compensation.",
    calcInputs: [
      currencyField("salary", "Salary", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("employerHealthCoverage", "Employer's Share of Health Insurance per Year", { default: 7000, max: 1000000, step: 500 }),
      percentField("retirementMatchPercent", "Retirement Match (% of Salary)", { default: 4, max: 25, step: 0.5 }),
      currencyField("otherBenefits", "Other Benefits per Year", { default: 1500, max: 1000000, step: 250 }),
      numberField("paidDaysOff", "Paid Days Off per Year", { default: 25, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Total Compensation", format: "currency" },
    calcResults: [
      { key: "totalCompensation", label: "Total Compensation", format: "currency", highlight: true },
      { key: "benefitsValue", label: "Value of Benefits", format: "currency" },
      { key: "benefitsSharePercent", label: "Benefits as Share of Total", format: "percentage" },
      { key: "valueOfPaidTimeOff", label: "Value of Paid Time Off (Within Salary)", format: "currency" },
      { key: "hourlyValueOfTotalPackage", label: "Hourly Value of Total Package", format: "currency" },
    ],
    instructions:
      "Enter your salary and the yearly value of the benefits your employer provides. Paid time off is already inside your " +
      "salary, so it's shown separately. This is useful when comparing a full-time job with contract or freelance work.",
    examples:
      "Example: a $60,000 salary plus $7,000 of health coverage, a 4% match ($2,400) and $1,500 of other benefits is worth " +
      "$70,900 — 15.37% in benefits, or $34.09 an hour. Your 25 paid days off are worth $5,769.23 of the salary.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How much are benefits worth on top of salary?", answer: "Commonly 20–30% of salary once employer health insurance, retirement contributions and payroll taxes are counted." },
    ],
  },
  {
    slug: "multiple-income-streams-calculator",
    title: "Multiple Income Streams Calculator",
    description: "Add up to four income streams, see your blended hourly rate across all of them, and how much you depend on your biggest one.",
    metaTitle: "Multiple Income Streams Calculator — Total & Mix",
    metaDescription: "Free multiple income streams calculator. Total up to four incomes, find your blended hourly rate and your reliance on the biggest stream.",
    calcInputs: [
      currencyField("stream1Income", "Stream 1 — Yearly Income (e.g. Job)", { default: 55000, max: 10000000, step: 500 }),
      numberField("stream1HoursPerWeek", "Stream 1 — Hours per Week", { default: 40, min: 0, max: 100, step: 0.5 }),
      currencyField("stream2Income", "Stream 2 — Yearly Income (e.g. Side Business)", { default: 9000, max: 10000000, step: 500 }),
      numberField("stream2HoursPerWeek", "Stream 2 — Hours per Week", { default: 8, min: 0, max: 100, step: 0.5 }),
      currencyField("stream3Income", "Stream 3 — Yearly Income (e.g. Rental)", { default: 4800, max: 10000000, step: 500 }),
      numberField("stream3HoursPerWeek", "Stream 3 — Hours per Week", { default: 3, min: 0, max: 100, step: 0.5 }),
      currencyField("stream4Income", "Stream 4 — Yearly Income (e.g. Dividends)", { default: 1200, max: 10000000, step: 100 }),
      numberField("stream4HoursPerWeek", "Stream 4 — Hours per Week", { default: 0, min: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Total Annual Income", format: "currency" },
    calcResults: [
      { key: "totalAnnualIncome", label: "Total Annual Income", format: "currency", highlight: true },
      { key: "totalMonthlyIncome", label: "Total Monthly Income", format: "currency" },
      { key: "blendedHourlyRate", label: "Blended Hourly Rate (All Streams)", format: "currency" },
      { key: "shareFromBiggestStreamPercent", label: "Share from Your Biggest Stream", format: "percentage" },
      { key: "incomeOutsideMainStream", label: "Income Outside Your Main Stream", format: "currency" },
    ],
    instructions:
      "Enter each income stream's yearly amount and the hours a week it takes (0 for passive income). The tool totals " +
      "them, works out what you earn per hour of effort overall, and shows how dependent you are on one source.",
    examples:
      "Example: a $55,000 job, $9,000 side business, $4,800 rental and $1,200 of dividends total $70,000 a year ($5,833.33 a " +
      "month), a blended $26.40 per working hour. 78.57% comes from the job; $15,000 comes from elsewhere.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why have multiple income streams?", answer: "Diversifying income means losing one source — a job or a client — hurts less. The \"share from your biggest stream\" shows how concentrated you are." },
    ],
  },
  {
    slug: "year-to-date-income-calculator",
    title: "Year-to-Date Income Calculator",
    description: "Project your full-year income from your year-to-date (YTD) earnings on a pay stub, plus any bonus still to come.",
    metaTitle: "Year-to-Date Income Calculator — Project Full Year",
    metaDescription: "Free year-to-date income calculator. Project your total yearly income from YTD earnings and pay periods, plus any bonus still to come.",
    calcInputs: [
      currencyField("ytdIncome", "Year-to-Date Gross Income", { default: 41000, max: 100000000, step: 100 }),
      numberField("periodsSoFar", "Pay Periods So Far This Year", { default: 18, min: 1, max: 53, step: 1 }),
      numberField("periodsPerYear", "Pay Periods in a Year", { default: 26, min: 1, max: 53, step: 1 }),
      currencyField("expectedOneOffs", "Bonus or One-Offs Still Expected", { default: 2000, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Projected Annual Income", format: "currency" },
    calcResults: [
      { key: "projectedAnnualIncome", label: "Projected Annual Income", format: "currency", highlight: true },
      { key: "averagePerPayPeriod", label: "Average per Pay Period So Far", format: "currency" },
      { key: "stillToEarnThisYear", label: "Still to Earn This Year", format: "currency" },
      { key: "shareOfYearEarnedPercent", label: "Share of the Year Earned So Far", format: "percentage" },
    ],
    instructions:
      "Take the year-to-date (YTD) gross pay from your latest pay stub and count the pay periods so far. The tool averages " +
      "them and projects the rest of the year, adding any bonus you still expect. Lenders often ask for this.",
    examples: "Example: $41,000 after 18 of 26 biweekly pay periods averages $2,277.78 a check. With a $2,000 bonus still to come, the year should total $61,222.22.",
    assumptions: "Assumes the rest of the year's paychecks match your average so far. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What does YTD mean on a pay stub?", answer: "Year to date — the total paid (or deducted) from January 1 up to that paycheck." },
    ],
  },
  {
    slug: "average-monthly-income-calculator",
    title: "Average Monthly Income Calculator",
    description: "Average six months of irregular income, see your lowest and highest months, and a safe monthly figure to budget on.",
    metaTitle: "Average Monthly Income Calculator — Irregular Pay",
    metaDescription: "Free average monthly income calculator. Average six months of irregular income, see the swing, and find a safe amount to budget on.",
    calcInputs: [
      currencyField("month1", "Month 1 Income", { default: 3200, max: 10000000, step: 50 }),
      currencyField("month2", "Month 2 Income", { default: 4100, max: 10000000, step: 50 }),
      currencyField("month3", "Month 3 Income", { default: 2600, max: 10000000, step: 50 }),
      currencyField("month4", "Month 4 Income", { default: 5200, max: 10000000, step: 50 }),
      currencyField("month5", "Month 5 Income", { default: 3800, max: 10000000, step: 50 }),
      currencyField("month6", "Month 6 Income", { default: 2900, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Average Monthly Income", format: "currency" },
    calcResults: [
      { key: "averageMonthlyIncome", label: "Average Monthly Income", format: "currency", highlight: true },
      { key: "lowestMonth", label: "Lowest Month", format: "currency" },
      { key: "highestMonth", label: "Highest Month", format: "currency" },
      { key: "swingPercent", label: "Swing (Highest − Lowest) vs Average", format: "percentage" },
      { key: "safeMonthlyBudget", label: "Safe Amount to Budget Each Month", format: "currency" },
    ],
    instructions:
      "Enter your income for each of the last six months. Freelancers, commission earners and gig workers can budget on " +
      "the lowest month and save the rest in good months, so bills are covered even in a slow month.",
    examples: "Example: monthly income of $3,200, $4,100, $2,600, $5,200, $3,800 and $2,900 averages $3,633.33, but swings 71.56% between the lowest ($2,600) and highest ($5,200). Budgeting on $2,600 is safe.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How should I budget with irregular income?", answer: "Base your fixed budget on a low month, keep a buffer in savings, and move extra from good months into that buffer or toward goals." },
    ],
  },
  {
    slug: "average-annual-income-calculator",
    title: "Average Annual Income Calculator",
    description: "Average your income over several years — including the two-year average lenders use for self-employed and variable income — and see the trend.",
    metaTitle: "Average Annual Income Calculator — Multi-Year Average",
    metaDescription: "Free average annual income calculator. Average up to 5 years of income, see the 2-year average lenders use, and your yearly trend.",
    calcInputs: [
      currencyField("year1", "Year 1 (Oldest) Income", { default: 48000, max: 100000000, step: 500 }),
      currencyField("year2", "Year 2 Income", { default: 52000, max: 100000000, step: 500 }),
      currencyField("year3", "Year 3 Income", { default: 61000, max: 100000000, step: 500 }),
      currencyField("year4", "Year 4 Income (0 if Not Used)", { default: 0, max: 100000000, step: 500 }),
      currencyField("year5", "Year 5 Income (0 if Not Used)", { default: 0, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Average Annual Income", format: "currency" },
    calcResults: [
      { key: "averageAnnualIncome", label: "Average Annual Income", format: "currency", highlight: true },
      { key: "averageOfLastTwoYears", label: "Average of the Last Two Years", format: "currency" },
      { key: "averageMonthlyIncome", label: "Average Monthly Income", format: "currency" },
      { key: "yearlyTrendPercent", label: "Average Yearly Change", format: "percentage" },
      { key: "yearsCounted", label: "Years Counted", format: "number" },
    ],
    instructions:
      "Enter your yearly income, oldest first; leave unused years at 0. Mortgage lenders often average the last two years " +
      "of self-employed, commission or bonus income — and look closely if income is falling.",
    examples: "Example: $48,000, $52,000 and $61,000 average $53,666.67 a year ($4,472.22 a month). The last two years average $56,500, and income grew 12.73% a year on average.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why do lenders average two years of income?", answer: "Self-employed, commission and bonus income varies, so a two-year average (from tax returns) gives a steadier picture of what you can reliably earn." },
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
