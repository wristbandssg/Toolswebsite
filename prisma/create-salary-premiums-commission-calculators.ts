// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Salary & Income Calculators" sub-batch D (Premium Pay, Bonus, Commission & Paychecks). Part of
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
// See src/lib/calc-engine-salary-premiums-commission.ts for the math and for how
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-salary-premiums-commission-calculators.ts
// or
//   npm run db:create-salary-premiums-commission-calculators

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
    slug: "shift-differential-calculator",
    title: "Shift Differential Calculator",
    description: "Calculate shift differential pay — an extra dollar amount or percentage per hour for evening, night or weekend shifts — per week and per year.",
    metaTitle: "Shift Differential Calculator — $ or % per Hour",
    metaDescription: "Free shift differential calculator. Add a dollar or percentage differential to your shift hours and see your shift rate, weekly and yearly extra.",
    calcInputs: [
      currencyField("baseRate", "Base Hourly Rate", { default: 20, max: 10000, step: 0.25 }),
      dropdownField("differentialType", "Differential Type", 1, [
        { label: "Dollars per hour", value: 1 },
        { label: "Percent of base rate", value: 2 },
      ]),
      numberField("differential", "Differential Amount ($ or %)", { default: 2, min: 0, max: 1000, step: 0.25 }),
      numberField("differentialHours", "Hours on the Differential Shift per Week", { default: 24, min: 0, max: 100, step: 0.5 }),
      numberField("totalHours", "Total Hours per Week", { default: 40, min: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Shift Rate", format: "currency" },
    calcResults: [
      { key: "shiftRate", label: "Hourly Rate on the Shift", format: "currency", highlight: true },
      { key: "extraPerWeek", label: "Extra per Week", format: "currency" },
      { key: "totalWeeklyPay", label: "Total Weekly Pay", format: "currency" },
      { key: "extraPerYear", label: "Extra per Year", format: "currency" },
    ],
    instructions:
      "Enter your base rate and your employer's differential — either a flat amount per hour (like $2) or a percentage " +
      "(like 10%) — plus how many of your weekly hours are on the differential shift.",
    examples: "Example: a $2 differential on 24 of your 40 hours at $20 an hour makes the shift rate $22, adds $48 a week (total $848) and $2,496 a year.",
    assumptions: "If you also work overtime, the differential raises your overtime rate — see the Night Shift Pay Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a typical shift differential?", answer: "Often $1–$3 an hour or 5–15% for evening and night shifts, and more in healthcare and manufacturing. It isn't required by federal law — it's employer policy or contract." },
    ],
  },
  {
    slug: "night-shift-pay-calculator",
    title: "Night Shift Pay Calculator",
    description: "Calculate night shift pay, including how a night differential raises your overtime rate under US wage law.",
    metaTitle: "Night Shift Pay Calculator — Differential & Overtime",
    metaDescription: "Free night shift pay calculator. Add a night differential and see how it raises your overtime rate and total weekly pay.",
    calcInputs: [
      currencyField("baseRate", "Base Hourly Rate", { default: 21, max: 10000, step: 0.25 }),
      currencyField("nightDifferential", "Night Differential per Hour", { default: 3, max: 1000, step: 0.25 }),
      numberField("nightHours", "Night Hours per Week", { default: 30, min: 0, max: 100, step: 0.5 }),
      numberField("totalHours", "Total Hours per Week", { default: 45, min: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Total Weekly Pay", format: "currency" },
    calcResults: [
      { key: "totalWeeklyPay", label: "Total Weekly Pay", format: "currency", highlight: true },
      { key: "nightDifferentialPay", label: "Night Differential Pay", format: "currency" },
      { key: "regularRateForOvertime", label: "Regular Rate Used for Overtime", format: "currency" },
      { key: "overtimePremium", label: "Overtime Premium", format: "currency" },
      { key: "extraNightPayPerYear", label: "Night Differential per Year", format: "currency" },
    ],
    instructions:
      "Enter your base rate, the night differential per hour, your night hours and total hours for the week. Under the " +
      "US Fair Labor Standards Act, shift differentials are part of your \"regular rate\", so overtime is 1.5× that " +
      "blended rate, not just 1.5× your base pay.",
    examples:
      "Example: 45 hours at $21, 30 of them nights with a $3 differential. Straight-time pay is $1,035 ($945 + $90), making " +
      "the regular rate $23. The 5 overtime hours add a $57.50 premium, so the week pays $1,092.50.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Does a shift differential count toward overtime?", answer: "Yes. In the US, shift differentials are part of the regular rate of pay, so they raise the overtime rate for non-exempt employees." },
    ],
  },
  {
    slug: "weekend-pay-calculator",
    title: "Weekend Pay Calculator",
    description: "Calculate your pay with separate premium rates for Saturday and Sunday hours, and what weekend work adds per week and per year.",
    metaTitle: "Weekend Pay Calculator — Saturday & Sunday Rates",
    metaDescription: "Free weekend pay calculator. Apply separate Saturday and Sunday premiums to your hours and see your weekly pay and yearly weekend extra.",
    calcInputs: [
      currencyField("baseRate", "Base Hourly Rate", { default: 18, max: 10000, step: 0.25 }),
      numberField("weekdayHours", "Weekday Hours", { default: 32, min: 0, max: 100, step: 0.5 }),
      numberField("saturdayHours", "Saturday Hours", { default: 8, min: 0, max: 24, step: 0.5 }),
      percentField("saturdayPremiumPercent", "Saturday Premium", { default: 25, max: 200, step: 5 }),
      numberField("sundayHours", "Sunday Hours", { default: 4, min: 0, max: 24, step: 0.5 }),
      percentField("sundayPremiumPercent", "Sunday Premium", { default: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Weekly Pay", format: "currency" },
    calcResults: [
      { key: "totalWeeklyPay", label: "Total Weekly Pay", format: "currency", highlight: true },
      { key: "saturdayPay", label: "Saturday Pay", format: "currency" },
      { key: "sundayPay", label: "Sunday Pay", format: "currency" },
      { key: "extraFromWeekendRates", label: "Extra from Weekend Rates", format: "currency" },
      { key: "extraPerYear", label: "Weekend Extra per Year", format: "currency" },
    ],
    instructions:
      "Enter your base rate, weekday hours, and hours plus premium for Saturday and Sunday. Many retail, hospitality and " +
      "healthcare jobs (and awards in countries like Australia) pay a higher rate for Sundays than Saturdays.",
    examples:
      "Example: at $18 an hour, 32 weekday hours, 8 Saturday hours at +25% and 4 Sunday hours at +50% pay $864 — $72 more " +
      "than the same hours at base rate, or $3,744 a year.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "Is weekend pay required by law?", answer: "Not in the US federal law — weekend premiums come from employer policy or contracts. Some countries (such as Australia under its awards) set weekend penalty rates by law." },
    ],
  },
  {
    slug: "holiday-pay-calculator",
    title: "Holiday Pay Calculator",
    description: "Calculate holiday pay — hours worked on a holiday at premium rates plus paid holiday hours when you're off.",
    metaTitle: "Holiday Pay Calculator — Worked & Paid Holidays",
    metaDescription: "Free holiday pay calculator. Work out pay for hours worked on a holiday at a premium rate plus paid holiday time off.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 22, max: 10000, step: 0.25 }),
      numberField("holidayHoursWorked", "Hours Worked on the Holiday", { default: 8, min: 0, max: 24, step: 0.5 }),
      numberField("holidayMultiplier", "Holiday Pay Multiplier", { default: 1.5, min: 1, max: 3, step: 0.25 }),
      numberField("paidHolidayHoursNotWorked", "Paid Holiday Hours Not Worked", { default: 8, min: 0, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Total Holiday Pay", format: "currency" },
    calcResults: [
      { key: "totalHolidayPay", label: "Total Holiday Pay", format: "currency", highlight: true },
      { key: "payForHoursWorked", label: "Pay for Holiday Hours Worked", format: "currency" },
      { key: "paidHolidayOffPay", label: "Paid Holiday (Time Off)", format: "currency" },
      { key: "premiumAboveNormalRate", label: "Premium Above Normal Rate", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, hours worked on the holiday and the premium multiplier your employer pays (commonly 1.5× " +
      "or 2×), plus any paid holiday hours for a holiday you had off. Some employers pay both when you work a holiday.",
    examples:
      "Example: at $22 an hour, working 8 holiday hours at 1.5× pays $264, and 8 paid holiday hours off pay $176 — $440 in " +
      "total, with an $88 premium.",
    assumptions: "US federal law doesn't require holiday pay; it's employer policy or contract. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Do I get overtime for working on a holiday?", answer: "Not automatically. In the US, holiday premiums are set by the employer; overtime still depends on hours over 40 in the week." },
    ],
  },
  {
    slug: "bonus-after-tax-calculator",
    title: "Bonus After Tax Calculator",
    description: "See what you'll keep from a bonus in 2026 after US federal supplemental withholding (22%), Social Security, Medicare and state tax.",
    metaTitle: "Bonus After Tax Calculator (2026) — What You Keep",
    metaDescription: "Free 2026 bonus after tax calculator. See your bonus after the 22% federal supplemental rate, Social Security, Medicare and state tax.",
    calcInputs: [
      currencyField("bonus", "Bonus Amount", { default: 10000, max: 100000000, step: 500 }),
      currencyField("wagesSoFarThisYear", "Wages Paid So Far This Year", { default: 60000, max: 100000000, step: 1000 }),
      percentField("stateRatePercent", "State Withholding Rate", { default: 5, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Bonus After Tax", format: "currency" },
    calcResults: [
      { key: "bonusAfterTax", label: "Bonus After Tax", format: "currency", highlight: true },
      { key: "federalWithholding", label: "Federal Withholding (22%)", format: "currency" },
      { key: "socialSecurity", label: "Social Security (6.2%)", format: "currency" },
      { key: "medicare", label: "Medicare", format: "currency" },
      { key: "stateWithholding", label: "State Withholding", format: "currency" },
      { key: "keepPercent", label: "Share You Keep", format: "percentage" },
    ],
    instructions:
      "Enter the bonus, your wages paid so far this year, and your state's withholding rate (0 if none). Employers usually " +
      "withhold a flat 22% federal tax on bonuses. Social Security stops once your year's wages pass the $184,500 limit, " +
      "and an extra 0.9% Medicare applies above $200,000.",
    examples:
      "Example: a $10,000 bonus with $60,000 already earned has $2,200 federal withholding, $620 Social Security, $145 " +
      "Medicare and $500 state tax withheld — you keep $6,535, or 65.35%.",
    assumptions:
      "Shows withholding, not your final tax: when you file, the bonus is taxed with your other income, so you may get " +
      "some back or owe more. 37% applies to supplemental wages over $1 million. To work backwards from the net you " +
      "want, use the Bonus Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "Why is my bonus taxed so much?", answer: "Bonuses are usually withheld at a flat 22% federal rate plus Social Security, Medicare and state tax. If 22% is more than your real rate, you'll get the difference back at tax time." },
    ],
  },
  {
    slug: "commission-rate-calculator",
    title: "Commission Rate Calculator",
    description: "Find the commission rate you earned on your sales, and the sales you'd need to reach a commission target.",
    metaTitle: "Commission Rate Calculator — Rate & Sales Needed",
    metaDescription: "Free commission rate calculator. Find your commission rate from earnings and sales, and the sales needed to hit your commission goal.",
    calcInputs: [
      currencyField("commissionEarned", "Commission Earned", { default: 4500, max: 100000000, step: 50 }),
      currencyField("salesAmount", "Sales That Earned It", { default: 90000, max: 1000000000, step: 1000 }),
      currencyField("targetCommission", "Commission You Want to Earn", { default: 6000, max: 100000000, step: 100 }),
    ],
    calcResult: { label: "Commission Rate", format: "percentage" },
    calcResults: [
      { key: "commissionRatePercent", label: "Your Commission Rate", format: "percentage", highlight: true },
      { key: "salesNeededForTarget", label: "Sales Needed for Your Target", format: "currency" },
      { key: "extraSalesNeeded", label: "Extra Sales Needed", format: "currency" },
      { key: "commissionPer1000Sold", label: "Commission per $1,000 Sold", format: "currency" },
    ],
    instructions:
      "Enter the commission you earned and the sales it came from. The tool works out your rate, then uses it to show the " +
      "sales you'd need to reach a target commission.",
    examples: "Example: $4,500 on $90,000 of sales is a 5% rate — $50 per $1,000 sold. Earning $6,000 would take $120,000 of sales, $30,000 more.",
    assumptions: "Assumes a single flat rate. For tiered plans, use the Sales Commission Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "How do I calculate a commission rate?", answer: "Divide the commission by the sale amount and multiply by 100. $4,500 ÷ $90,000 × 100 = 5%." },
    ],
  },
  {
    slug: "base-salary-plus-commission-calculator",
    title: "Base Salary Plus Commission Calculator",
    description: "Calculate total yearly pay from a base salary plus commission on your annual sales, and how much of your pay depends on commission.",
    metaTitle: "Base Salary Plus Commission Calculator — Total Pay",
    metaDescription: "Free base salary plus commission calculator. Add commission on annual sales to your base pay and see your total and commission share.",
    calcInputs: [
      currencyField("baseSalary", "Base Salary", { default: 45000, max: 10000000, step: 1000 }),
      currencyField("annualSales", "Expected Annual Sales", { default: 600000, max: 1000000000, step: 10000 }),
      percentField("commissionRatePercent", "Commission Rate", { default: 5, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Total Annual Pay", format: "currency" },
    calcResults: [
      { key: "totalAnnualPay", label: "Total Annual Pay", format: "currency", highlight: true },
      { key: "annualCommission", label: "Annual Commission", format: "currency" },
      { key: "monthlyAverage", label: "Monthly Average", format: "currency" },
      { key: "shareFromCommissionPercent", label: "Share of Pay from Commission", format: "percentage" },
    ],
    instructions:
      "Enter your base salary, the sales you expect to close in a year, and your commission rate. The tool shows your " +
      "total pay and how much of it is \"at risk\" — dependent on hitting those sales.",
    examples: "Example: a $45,000 base plus 5% on $600,000 of sales ($30,000) is $75,000 a year, $6,250 a month on average — 40% of it from commission.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a good base-to-commission split?", answer: "Common sales plans run from 70/30 to 50/50 base to commission. A higher commission share means more upside and more risk." },
    ],
  },
  {
    slug: "sales-commission-calculator",
    title: "Sales Commission Calculator",
    description: "Calculate tiered sales commission — one rate up to quota and a higher \"accelerator\" rate on sales above it.",
    metaTitle: "Sales Commission Calculator — Tiered & Accelerators",
    metaDescription: "Free sales commission calculator. Work out tiered commission with a higher accelerator rate above quota and your effective rate.",
    calcInputs: [
      currencyField("sales", "Sales This Period", { default: 150000, max: 1000000000, step: 1000 }),
      currencyField("quota", "Quota", { default: 100000, max: 1000000000, step: 1000 }),
      percentField("rateUpToQuotaPercent", "Commission Rate up to Quota", { default: 6, max: 100, step: 0.25 }),
      percentField("rateAboveQuotaPercent", "Commission Rate Above Quota", { default: 10, max: 100, step: 0.25 }),
    ],
    calcResult: { label: "Total Commission", format: "currency" },
    calcResults: [
      { key: "totalCommission", label: "Total Commission", format: "currency", highlight: true },
      { key: "commissionUpToQuota", label: "Commission up to Quota", format: "currency" },
      { key: "commissionAboveQuota", label: "Commission Above Quota", format: "currency" },
      { key: "quotaAttainmentPercent", label: "Quota Attainment", format: "percentage" },
      { key: "effectiveRatePercent", label: "Effective Commission Rate", format: "percentage" },
    ],
    instructions:
      "Enter your sales, your quota, and the two commission rates. Sales up to quota earn the first rate; every dollar " +
      "above quota earns the higher rate — an accelerator that rewards over-performance.",
    examples: "Example: $150,000 of sales on a $100,000 quota earns 6% on the first $100,000 ($6,000) and 10% on the next $50,000 ($5,000) — $11,000, an effective 7.33%.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What is a commission accelerator?", answer: "A higher commission rate on sales above quota. It rewards top performers, since each extra sale pays more than the ones before quota." },
    ],
  },
  {
    slug: "gross-pay-calculator",
    title: "Gross Pay Calculator",
    description: "Calculate your gross pay for a pay period from regular hours, overtime, tips and commission or bonus — before any deductions.",
    metaTitle: "Gross Pay Calculator — Hours, Overtime & Tips",
    metaDescription: "Free gross pay calculator. Add regular hours, overtime, tips and commission for one pay period to find your gross pay before deductions.",
    calcInputs: [
      currencyField("hourlyRate", "Hourly Rate", { default: 20, max: 10000, step: 0.25 }),
      numberField("regularHours", "Regular Hours This Pay Period", { default: 80, min: 0, max: 400, step: 0.25 }),
      numberField("overtimeHours", "Overtime Hours (Paid at 1.5×)", { default: 6, min: 0, max: 200, step: 0.25 }),
      currencyField("tips", "Tips Reported", { default: 150, max: 1000000, step: 10 }),
      currencyField("commissionOrBonus", "Commission or Bonus", { default: 0, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Gross Pay", format: "currency" },
    calcResults: [
      { key: "grossPay", label: "Gross Pay This Period", format: "currency", highlight: true },
      { key: "regularPay", label: "Regular Pay", format: "currency" },
      { key: "overtimePay", label: "Overtime Pay", format: "currency" },
      { key: "otherPay", label: "Tips, Commission and Bonus", format: "currency" },
    ],
    instructions:
      "Enter your hourly rate, the regular and overtime hours in the pay period, and any tips, commission or bonus. Gross " +
      "pay is everything you earned before tax and deductions — the top line on your pay stub.",
    examples: "Example: 80 regular hours at $20 ($1,600), 6 overtime hours at $30 ($180) and $150 in tips make $1,930 gross pay.",
    assumptions: GENERAL_DISCLAIMER,
    faq: [
      { question: "What's the difference between gross and net pay?", answer: "Gross pay is what you earn before anything is taken out; net pay is what reaches your bank after taxes and deductions. See the Net Pay Calculator." },
    ],
  },
  {
    slug: "net-pay-calculator",
    title: "Net Pay Calculator",
    description: "Work out your net (take-home) pay from a paycheck's gross pay and each deduction on your pay stub, per check and per year.",
    metaTitle: "Net Pay Calculator — Take-Home from Your Pay Stub",
    metaDescription: "Free net pay calculator. Subtract taxes and deductions from your gross paycheck to find your take-home pay per check and per year.",
    calcInputs: [
      currencyField("grossPay", "Gross Pay per Paycheck", { default: 2500, max: 1000000, step: 50 }),
      currencyField("federalTax", "Federal Income Tax Withheld", { default: 250, max: 1000000, step: 5 }),
      currencyField("stateTax", "State/Local Tax Withheld", { default: 100, max: 1000000, step: 5 }),
      currencyField("socialSecurityAndMedicare", "Social Security + Medicare", { default: 191.25, max: 1000000, step: 1 }),
      currencyField("retirement", "Retirement Contribution", { default: 125, max: 1000000, step: 5 }),
      currencyField("healthInsurance", "Health Insurance", { default: 90, max: 1000000, step: 5 }),
      currencyField("otherDeductions", "Other Deductions", { default: 20, max: 1000000, step: 5 }),
      dropdownField("periodsPerYear", "Pay Frequency", 26, [
        { label: "Weekly", value: 52 },
        { label: "Every Two Weeks", value: 26 },
        { label: "Twice a Month", value: 24 },
        { label: "Monthly", value: 12 },
      ]),
    ],
    calcResult: { label: "Net Pay", format: "currency" },
    calcResults: [
      { key: "netPay", label: "Net Pay per Paycheck", format: "currency", highlight: true },
      { key: "totalDeductions", label: "Total Deductions per Check", format: "currency" },
      { key: "takeHomePercent", label: "Share of Gross You Take Home", format: "percentage" },
      { key: "netPayPerYear", label: "Net Pay per Year", format: "currency" },
      { key: "taxesPerYear", label: "Taxes per Year", format: "currency" },
    ],
    instructions:
      "Copy the amounts from your pay stub: gross pay and each deduction. The tool subtracts them to show your take-home " +
      "pay, what share of your gross you keep, and the yearly totals. It works for any country — just enter your own " +
      "deduction amounts.",
    examples:
      "Example: $2,500 gross less $250 federal tax, $100 state tax, $191.25 Social Security and Medicare, $125 retirement, " +
      "$90 health insurance and $20 other leaves $1,723.75 — 68.95% of gross, or $44,817.50 a year.",
    assumptions: "To estimate US tax withholding instead of copying it, use the Paycheck Tax Calculator under Tax Calculators. " + GENERAL_DISCLAIMER,
    faq: [
      { question: "What are common paycheck deductions?", answer: "Income tax, Social Security and Medicare (7.65% in the US), state or local tax, retirement contributions, health and other insurance premiums, and sometimes union dues or garnishments." },
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
