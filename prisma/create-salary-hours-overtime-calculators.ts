// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Salary & Income Calculators" sub-batch C (Work Hours & Overtime). Part of
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
// See src/lib/calc-engine-salary-hours-overtime.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-hours-overtime-calculators.ts
// or
//   npm run db:create-salary-hours-overtime-calculators

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

function dayFields(defaults: number[]) {
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return names.map((n, k) => numberField(n.toLowerCase(), `${n} Hours`, { default: defaults[k], min: 0, max: 24, step: 0.25 }));
}

const TOOLS: ToolDef[] = [
  {
    slug: "work-hours-calculator",
    title: "Work Hours Calculator",
    description: "Calculate the hours worked between a start and end time — including overnight shifts — minus your unpaid break, per day and per week.",
    metaTitle: "Work Hours Calculator — Start to End Time",
    metaDescription: "Free work hours calculator. Find hours worked between a start and end time, including overnight shifts, minus breaks, per day and week.",
    calcInputs: [
      numberField("startHour", "Start Time — Hour (0–23)", { default: 9, min: 0, max: 23, step: 1 }),
      numberField("startMinute", "Start Time — Minutes", { default: 0, min: 0, max: 59, step: 5 }),
      numberField("endHour", "End Time — Hour (0–23)", { default: 17, min: 0, max: 23, step: 1 }),
      numberField("endMinute", "End Time — Minutes", { default: 30, min: 0, max: 59, step: 5 }),
      numberField("breakMinutes", "Unpaid Break (Minutes)", { default: 30, min: 0, max: 240, step: 5 }),
      numberField("daysPerWeek", "Days Worked per Week", { default: 5, min: 0, max: 7, step: 1 }),
    ],
    calcResult: { label: "Hours per Day", format: "number" },
    calcResults: [
      { key: "hoursPerDay", label: "Hours Worked per Day (Decimal)", format: "number", highlight: true },
      { key: "wholeHours", label: "Hours", format: "number" },
      { key: "extraMinutes", label: "Plus Minutes", format: "number" },
      { key: "hoursPerWeek", label: "Hours per Week", format: "number" },
    ],
    instructions:
      "Enter your start and end times in 24-hour form (1:30 pm = 13 and 30), your unpaid break, and how many days a week " +
      "you work that shift. If the end time is earlier than the start, the shift is treated as running past midnight. " +
      "The decimal hours are what payroll uses — 7.5 hours means 7 hours 30 minutes.",
    examples:
      "Example: 9:00 to 17:30 with a 30-minute unpaid lunch is 8 hours a day — 40 hours over a 5-day week.",
    assumptions: "Paid breaks shouldn't be entered as unpaid. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I convert minutes to decimal hours?", answer: "Divide the minutes by 60: 15 minutes = 0.25, 30 = 0.5, 45 = 0.75 hours." },
    ],
  },
  {
    slug: "hours-worked-calculator",
    title: "Hours Worked Calculator",
    description: "Add up a weekly timesheet — hours for each day — and split the total into regular and overtime hours.",
    metaTitle: "Hours Worked Calculator — Weekly Timesheet",
    metaDescription: "Free hours worked calculator. Enter hours for each day of the week to total them and split regular hours from overtime over 40.",
    calcInputs: [
      ...dayFields([8, 9, 8, 10, 8, 0, 0]),
      numberField("weeklyThreshold", "Overtime Starts After (Hours per Week)", { default: 40, min: 0, max: 80, step: 1 }),
    ],
    calcResult: { label: "Total Hours", format: "number" },
    calcResults: [
      { key: "totalHours", label: "Total Hours This Week", format: "number", highlight: true },
      { key: "regularHours", label: "Regular Hours", format: "number" },
      { key: "overtimeHours", label: "Overtime Hours", format: "number" },
      { key: "daysWorked", label: "Days Worked", format: "number" },
      { key: "averageHoursPerDayWorked", label: "Average Hours per Day Worked", format: "number" },
    ],
    instructions:
      "Enter the hours you worked each day, in decimals (8.5 for eight and a half hours). The tool totals the week and " +
      "counts hours beyond the weekly threshold — 40 under the US federal rule — as overtime.",
    examples: "Example: 8, 9, 8, 10 and 8 hours Monday to Friday total 43 hours: 40 regular and 3 overtime, averaging 8.6 a day.",
    assumptions: "Uses a weekly overtime rule only. For daily overtime (as in California), use the Regular and Overtime Pay Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Is overtime calculated daily or weekly?", answer: "Federally in the US it's weekly (over 40 hours). A few states, such as California, also require daily overtime." },
    ],
  },
  {
    slug: "weekly-hours-calculator",
    title: "Weekly Hours Calculator",
    description: "Work out your paid hours per week from your shifts, shift length and unpaid breaks, and what that is as a share of full-time.",
    metaTitle: "Weekly Hours Calculator — Shifts to Hours",
    metaDescription: "Free weekly hours calculator. Turn shifts, shift length and unpaid breaks into paid hours per week and a full-time equivalent percentage.",
    calcInputs: [
      numberField("shiftsPerWeek", "Shifts per Week", { default: 4, min: 0, max: 14, step: 1 }),
      numberField("shiftLengthHours", "Shift Length (Hours, Incl. Break)", { default: 10, min: 0, max: 24, step: 0.25 }),
      numberField("unpaidBreakMinutes", "Unpaid Break per Shift (Minutes)", { default: 30, min: 0, max: 240, step: 5 }),
      numberField("fullTimeHours", "Full-Time Hours at Your Workplace", { default: 40, min: 1, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Paid Hours per Week", format: "number" },
    calcResults: [
      { key: "paidHoursPerWeek", label: "Paid Hours per Week", format: "number", highlight: true },
      { key: "fullTimeEquivalentPercent", label: "Full-Time Equivalent (FTE)", format: "percentage" },
      { key: "hoursPerYear", label: "Paid Hours per Year", format: "number" },
      { key: "unpaidBreakHoursPerWeek", label: "Unpaid Break Time per Week (Hours)", format: "number" },
    ],
    instructions:
      "Enter how many shifts you work a week, how long each one is from start to finish, and the unpaid break in each. " +
      "The tool shows your paid weekly hours and your FTE — the share of a full-time schedule you work.",
    examples: "Example: four 10-hour shifts with a 30-minute unpaid break are 38 paid hours a week — 95% of a 40-hour full-time job, or 1,976 hours a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What does FTE mean?", answer: "Full-time equivalent: your hours divided by a full-time schedule. 1.0 (100%) is full-time; 0.5 (50%) is half-time." },
    ],
  },
  {
    slug: "monthly-work-hours-calculator",
    title: "Monthly Work Hours Calculator",
    description: "Calculate your work hours for a specific month from its working days, and compare them with the average month.",
    metaTitle: "Monthly Work Hours Calculator — Hours This Month",
    metaDescription: "Free monthly work hours calculator. Find the work hours in a given month from its working days and compare with an average month.",
    calcInputs: [
      numberField("hoursPerDay", "Hours per Day", { default: 8, min: 0, max: 24, step: 0.25 }),
      numberField("workingDaysInMonth", "Working Days in the Month", { default: 22, min: 0, max: 31, step: 1 }),
      numberField("daysPerWeek", "Work Days per Week", { default: 5, min: 1, max: 7, step: 1 }),
    ],
    calcResult: { label: "Hours This Month", format: "number" },
    calcResults: [
      { key: "hoursThisMonth", label: "Work Hours This Month", format: "number", highlight: true },
      { key: "averageMonthlyHours", label: "Average Monthly Hours", format: "number" },
      { key: "differenceFromAverage", label: "Difference from Average", format: "number" },
      { key: "hoursPerWeek", label: "Hours per Week", format: "number" },
    ],
    instructions:
      "Enter your daily hours and the number of working days in the month (count weekdays, minus public holidays). " +
      "Months have 20 to 23 working days, so hourly pay swings from month to month while the average stays the same.",
    examples: "Example: 8 hours a day over 22 working days is 176 hours — 2.67 more than the average month's 173.33 hours at 40 hours a week.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "How many working hours are in an average month?", answer: "About 173.33 for a 40-hour week (40 × 52 ÷ 12)." },
    ],
  },
  {
    slug: "annual-work-hours-calculator",
    title: "Annual Work Hours Calculator",
    description: "Find how many hours you actually work in a year after vacation, holidays and sick days — compared with the standard 2,080.",
    metaTitle: "Annual Work Hours Calculator — Hours per Year",
    metaDescription: "Free annual work hours calculator. See the hours you really work in a year after vacation, holidays and sick days, vs the 2,080 standard.",
    calcInputs: [
      numberField("hoursPerWeek", "Hours per Week", { default: 40, min: 1, max: 100, step: 0.5 }),
      numberField("daysPerWeek", "Work Days per Week", { default: 5, min: 1, max: 7, step: 1 }),
      numberField("vacationDays", "Vacation Days", { default: 15, min: 0, max: 100, step: 1 }),
      numberField("holidays", "Public Holidays", { default: 10, min: 0, max: 40, step: 1 }),
      numberField("sickDays", "Sick Days", { default: 3, min: 0, max: 100, step: 1 }),
    ],
    calcResult: { label: "Hours Worked per Year", format: "number" },
    calcResults: [
      { key: "hoursActuallyWorked", label: "Hours Actually Worked", format: "number", highlight: true },
      { key: "scheduledHours", label: "Scheduled Hours (52 Weeks)", format: "number" },
      { key: "hoursOff", label: "Hours of Time Off", format: "number" },
      { key: "daysActuallyWorked", label: "Days Actually Worked", format: "number" },
    ],
    instructions:
      "Enter your weekly hours and days, and the days off you take in a year. The standard 2,080 hours (40 × 52) assumes " +
      "no time off at all; this shows the hours you really spend working — useful for true hourly rates and billing.",
    examples: "Example: at 40 hours a week with 15 vacation days, 10 holidays and 3 sick days, you work 1,856 hours (232 days) — 224 fewer than 2,080.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Why do employers use 2,080 hours?", answer: "It's 40 hours × 52 weeks — every paid hour in a year, including paid time off. It converts salaries to hourly rates, but it isn't the hours you actually work." },
    ],
  },
  {
    slug: "overtime-pay-calculator",
    title: "Overtime Pay Calculator",
    description: "Calculate overtime pay from the total hours you worked in a week — overtime hours, the overtime premium, and your total weekly pay.",
    metaTitle: "Overtime Pay Calculator — From Total Weekly Hours",
    metaDescription: "Free overtime pay calculator. Enter total weekly hours to find overtime hours, overtime pay, the premium portion and your total pay.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 24, max: 10000, step: 0.25 }),
      numberField("totalHours", "Total Hours Worked This Week", { default: 47, min: 0, max: 168, step: 0.25 }),
      numberField("weeklyThreshold", "Overtime Starts After (Hours)", { default: 40, min: 0, max: 80, step: 1 }),
      numberField("multiplier", "Overtime Multiplier", { default: 1.5, min: 1, max: 3, step: 0.25 }),
    ],
    calcResult: { label: "Overtime Pay", format: "currency" },
    calcResults: [
      { key: "overtimePay", label: "Overtime Pay", format: "currency", highlight: true },
      { key: "overtimeHours", label: "Overtime Hours", format: "number" },
      { key: "overtimePremiumOnly", label: "Overtime Premium (the Extra Half)", format: "currency" },
      { key: "regularPay", label: "Regular Pay", format: "currency" },
      { key: "totalWeeklyPay", label: "Total Weekly Pay", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, the total hours you worked, the point where overtime starts (40 under US federal law) and " +
      "the multiplier. The tool works out how many hours are overtime, and splits their pay into straight time and the " +
      "overtime premium — the part you earn only because it's overtime.",
    examples:
      "Example: 47 hours at $24 an hour means 7 overtime hours paid $252 at 1.5× — $84 of which is the premium. With $960 of " +
      "regular pay, the week pays $1,212.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the overtime premium?", answer: "The extra above your normal rate — the \"half\" in time-and-a-half. Overtime hours pay your normal rate plus this premium." },
    ],
  },
  {
    slug: "time-and-a-half-calculator",
    title: "Time and a Half Calculator",
    description: "Find your time-and-a-half rate (1.5× your hourly pay) and what a number of hours at that rate earns you.",
    metaTitle: "Time and a Half Calculator — 1.5× Hourly Rate",
    metaDescription: "Free time and a half calculator. Find your 1.5× overtime rate and the pay for any number of hours at time-and-a-half.",
    calcInputs: [
      currencyField("hourlyRate", "Normal Hourly Rate", { default: 20, max: 10000, step: 0.25 }),
      numberField("hours", "Hours at Time and a Half", { default: 8, min: 0, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Time-and-a-Half Rate", format: "currency" },
    calcResults: [
      { key: "timeAndAHalfRate", label: "Time-and-a-Half Rate", format: "currency", highlight: true },
      { key: "payForThoseHours", label: "Pay for Those Hours", format: "currency" },
      { key: "extraOverNormalPay", label: "Extra over Normal Pay", format: "currency" },
      { key: "normalPayForThoseHours", label: "Normal Pay for Those Hours", format: "currency" },
    ],
    instructions: "Enter your normal hourly rate and the hours paid at time and a half. The rate is your hourly pay × 1.5.",
    examples: "Example: at $20 an hour, time and a half is $30 an hour. Eight hours pay $240 — $80 more than the $160 you'd normally earn.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is time and a half for $20 an hour?", answer: "$30 an hour ($20 × 1.5)." },
    ],
  },
  {
    slug: "double-time-calculator",
    title: "Double Time Calculator",
    description: "Find your double-time rate (2× your hourly pay), what hours at that rate earn, and how much more that is than time and a half.",
    metaTitle: "Double Time Calculator — 2× Hourly Rate",
    metaDescription: "Free double time calculator. Find your 2× rate, the pay for hours at double time, and the difference from time and a half.",
    calcInputs: [
      currencyField("hourlyRate", "Normal Hourly Rate", { default: 20, max: 10000, step: 0.25 }),
      numberField("hours", "Hours at Double Time", { default: 6, min: 0, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Double-Time Rate", format: "currency" },
    calcResults: [
      { key: "doubleTimeRate", label: "Double-Time Rate", format: "currency", highlight: true },
      { key: "payForThoseHours", label: "Pay for Those Hours", format: "currency" },
      { key: "moreThanTimeAndAHalf", label: "More Than Time and a Half Would Pay", format: "currency" },
      { key: "extraOverNormalPay", label: "Extra over Normal Pay", format: "currency" },
    ],
    instructions:
      "Enter your normal hourly rate and the hours paid at double time. Double time is usually required by law only in a " +
      "few places (such as California after 12 hours in a day), but many employers and union contracts pay it for " +
      "holidays or long shifts.",
    examples: "Example: at $20 an hour, double time is $40. Six hours pay $240 — $60 more than time and a half, and $120 more than normal pay.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Is double time required by law?", answer: "Not under US federal law. California requires it for hours over 12 in a day and over 8 on the 7th consecutive workday; otherwise it's set by employer policy or contract." },
    ],
  },
  {
    slug: "overtime-hours-calculator",
    title: "Overtime Hours Calculator",
    description: "Find how many overtime hours you'd need to work to take home a target amount after tax.",
    metaTitle: "Overtime Hours Calculator — Hours for a Goal",
    metaDescription: "Free overtime hours calculator. See how many overtime hours it takes to take home a target amount after tax at your overtime rate.",
    calcInputs: [
      currencyField("targetTakeHome", "Amount You Want to Take Home", { default: 1000, max: 1000000, step: 50 }),
      currencyField("hourlyRate", "Normal Hourly Rate", { default: 25, max: 10000, step: 0.25 }),
      numberField("multiplier", "Overtime Multiplier", { default: 1.5, min: 1, max: 3, step: 0.25 }),
      percentField("taxRatePercent", "Tax Rate on Extra Pay", { default: 25, max: 60, step: 0.5 }),
    ],
    calcResult: { label: "Overtime Hours Needed", format: "number" },
    calcResults: [
      { key: "overtimeHoursNeeded", label: "Overtime Hours Needed", format: "number", highlight: true },
      { key: "grossOvertimePay", label: "Gross Overtime Pay", format: "currency" },
      { key: "takeHomePerOvertimeHour", label: "Take-Home per Overtime Hour", format: "currency" },
      { key: "extraWorkdays", label: "Equivalent Extra 8-Hour Days", format: "number" },
    ],
    instructions:
      "Enter what you want to take home — for a trip, a bill, or a savings goal — your hourly rate, the overtime multiplier " +
      "and the tax rate on extra pay (your marginal rate plus payroll tax). The tool works out the hours needed.",
    examples: "Example: to take home $1,000 at $25 an hour, time and a half and 25% tax, you'd need 35.56 overtime hours ($1,333.33 gross) — about 4.44 extra 8-hour days.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Is overtime taxed more?", answer: "Not at a special rate — it's added to your wages. But because it sits on top of your regular pay, it's taxed at your highest (marginal) rate, and withholding on a big check can look high." },
    ],
  },
  {
    slug: "overtime-rate-calculator",
    title: "Overtime Rate Calculator",
    description: "Work out the overtime rate for a salaried non-exempt employee — including a non-discretionary bonus in the regular rate, as US law requires.",
    metaTitle: "Overtime Rate Calculator — Salaried Non-Exempt",
    metaDescription: "Free overtime rate calculator for salaried non-exempt workers. Find the regular rate, overtime rate and overtime pay, including bonuses.",
    calcInputs: [
      currencyField("weeklySalary", "Weekly Salary", { default: 1000, max: 100000, step: 25 }),
      numberField("salaryCoversHours", "Hours the Salary Covers", { default: 40, min: 1, max: 60, step: 1 }),
      currencyField("weeklyBonus", "Non-Discretionary Bonus This Week", { default: 100, max: 100000, step: 10 }),
      numberField("hoursWorked", "Hours Worked This Week", { default: 46, min: 0, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Overtime Rate", format: "currency" },
    calcResults: [
      { key: "overtimeRate", label: "Overtime Rate", format: "currency", highlight: true },
      { key: "regularRate", label: "Regular Rate (incl. Bonus)", format: "currency" },
      { key: "overtimePay", label: "Overtime Pay", format: "currency" },
      { key: "totalWeeklyPay", label: "Total Weekly Pay", format: "currency" },
    ],
    instructions:
      "Enter the weekly salary, the hours it's meant to cover, any non-discretionary bonus (such as a production or " +
      "attendance bonus) and the hours actually worked. Under the US Fair Labor Standards Act, the regular rate for " +
      "overtime includes such bonuses — spread over all hours worked — so overtime pays more than 1.5 × salary ÷ hours.",
    examples:
      "Example: a $1,000 salary for 40 hours plus a $100 bonus, working 46 hours. The regular rate is $27.17 ($25 + $2.17 " +
      "of bonus), so overtime is $40.76 an hour. Overtime pay is $231.52 and the week totals $1,331.52.",
    assumptions: "For non-exempt employees paid a fixed salary for a fixed number of hours. Discretionary bonuses (truly at the employer's discretion) aren't included. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Do bonuses affect overtime pay?", answer: "Non-discretionary bonuses — ones promised for meeting goals, attendance or production — must be added to the regular rate, which raises overtime pay. Discretionary gifts don't." },
    ],
  },
  {
    slug: "regular-and-overtime-pay-calculator",
    title: "Regular and Overtime Pay Calculator",
    description: "Calculate a week's pay with both daily and weekly overtime rules — over 8 hours a day at 1.5×, over 12 at 2×, and over 40 a week — as in California.",
    metaTitle: "Regular and Overtime Pay Calculator — Daily Rules",
    metaDescription: "Free regular and overtime pay calculator. Apply daily (8 and 12 hour) and weekly (40 hour) overtime rules to a week of hours.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 22, max: 10000, step: 0.25 }),
      ...dayFields([10, 8, 13, 8, 9, 0, 0]),
      numberField("dailyThreshold", "Daily Overtime After (Hours)", { default: 8, min: 0, max: 24, step: 0.5 }),
      numberField("doubleTimeAfter", "Daily Double Time After (Hours)", { default: 12, min: 0, max: 24, step: 0.5 }),
    ],
    calcResult: { label: "Total Pay", format: "currency" },
    calcResults: [
      { key: "totalPay", label: "Total Pay This Week", format: "currency", highlight: true },
      { key: "regularHours", label: "Regular Hours", format: "number" },
      { key: "overtimeHours", label: "Overtime Hours (1.5×)", format: "number" },
      { key: "doubleTimeHours", label: "Double-Time Hours (2×)", format: "number" },
      { key: "effectiveHourlyRate", label: "Average Rate for the Week", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate and the hours worked each day. Hours over the daily limit (8) are paid at 1.5× and over the " +
      "double-time limit (12) at 2×. Then, if regular hours still exceed 40 for the week, the extra becomes overtime too — " +
      "without counting any hour twice. Set the daily limits very high to use a weekly-only rule.",
    examples:
      "Example: at $22 an hour, days of 10, 8, 13, 8 and 9 hours give 40 regular hours, 7 overtime hours and 1 double-time " +
      "hour — $1,155 for the week, an average of $24.06 an hour.",
    assumptions: "Follows California-style daily rules; it doesn't apply the special 7th-consecutive-day rule. Check your state's law. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Which states have daily overtime?", answer: "California is the best-known; Alaska, Nevada (for some lower-paid workers) and Colorado also have daily overtime rules. Most states follow the federal weekly 40-hour rule." },
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
