// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// finance expansion 3 sub-batch "pay". See
// src/lib/calc-engine-fin3-derivatives-tax.ts for the full list of 10
// sub-batches, and src/lib/calc-engine-fin3-pay.ts for the math. Each tool
// is filed in the Finance Calculators sub-category the user named for it
// (created on first run; Retirement Calculators already exists).
//
// HOW TO RUN
//   npx tsx prisma/create-fin3-pay-calculators.ts
// or
//   npm run db:create-fin3-pay-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_SLUGS = ["finance-calculators", "finance"];

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
}

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "This tool gives estimates for learning and planning only and isn't financial, investment or tax advice. Results depend entirely on your inputs — check important decisions with a qualified professional.";

interface ToolDef {
  slug: string;
  category: { name: string; slug: string };
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });


const TAX_SALARY = { name: "Tax & Salary Calculators", slug: "tax-salary-calculators" };
const PERSONAL_FINANCE = { name: "Personal Finance Calculators", slug: "personal-finance-calculators" };

const TOOLS: ToolDef[] = [
  {
    slug: "12-hour-shift-pay-calculator",
    category: TAX_SALARY,
    title: "12-Hour Shift Pay Calculator",
    description: "Calculate weekly, biweekly and yearly pay for 12-hour shifts with overtime — under the federal 40-hour rule or California's daily overtime and double-time rules.",
    metaTitle: "12-Hour Shift Pay Calculator — Overtime & Weekly Pay",
    metaDescription: "Free 12-hour shift pay calculator. Work out regular, overtime and double-time hours and pay for 3 or 4 twelve-hour shifts a week, federal or California rules.",
    calcInputs: [currencyField("hourlyRate", "Hourly Rate", { default: 25, max: 10000, step: 0.25 }), numberField("shiftsPerWeek", "Shifts per Week", { default: 4, min: 1, max: 7 }), numberField("shiftLength", "Hours per Shift", { default: 12, min: 1, max: 24, step: 0.5 }), dropdown("overtimeRule", "Overtime Rule", [["Federal (over 40 hours a week)", 1], ["California (daily over 8 / double over 12)", 2]], 1), currencyField("shiftDifferential", "Shift Differential per Hour (optional)", { default: 0, max: 1000, step: 0.25, required: false })],
    calcResult: { label: "Weekly Pay", format: "currency" },
    calcResults: [num("hoursPerWeek", "Hours per Week"), num("regularHours", "Regular Hours"), num("overtimeHours", "Overtime Hours (1.5×)"), num("doubleTimeHours", "Double-Time Hours (2×)"), cur("weeklyPay", "Weekly Gross Pay", true), cur("biweeklyPay", "Biweekly Gross Pay"), cur("yearlyPay", "Yearly Gross Pay"), cur("effectiveHourlyRate", "Effective Hourly Rate")],
    instructions: "Enter your hourly rate, how many 12-hour shifts you work a week and which overtime rule applies. Nurses and others on a 3×12 schedule work 36 hours with no overtime federally; a fourth shift adds 8 overtime hours.\n\nIn California, every hour past 8 in a day is overtime and past 12 is double time.",
    examples: "Example: four 12-hour shifts at $25 is 48 hours — 40 regular and 8 overtime — or $1,300 a week ($67,600 a year). Under California rules the same week is 32 regular and 16 overtime hours: $1,400.",
    assumptions: "Overtime and double time are paid on the base rate plus any shift differential. Some employers use 8/80 or alternative workweek schedules that change the rules. " + DISCLAIMER,
    faq: [
      { question: "Do 12-hour shifts get overtime?", answer: "Under federal law only hours over 40 in a week count, so three 12s (36 hours) don't. California and a few other states also pay daily overtime." },
      { question: "How much is 3 12-hour shifts a week at $30 an hour?", answer: "36 hours × $30 = $1,080 a week, or about $56,160 a year." },
    ],
  },
  {
    slug: "billable-hours-calculator",
    category: TAX_SALARY,
    title: "Billable Hours Calculator",
    description: "Calculate your billable utilization rate, weekly and yearly billings, effective rate per hour worked, and the billable hours you need to hit a revenue goal.",
    metaTitle: "Billable Hours Calculator — Utilization & Billings",
    metaDescription: "Free billable hours calculator for lawyers, consultants and freelancers. Get your utilization rate, billings and the billable hours needed for a revenue target.",
    calcInputs: [numberField("hoursWorkedPerWeek", "Hours Worked per Week", { default: 45, max: 120, step: 0.5 }), numberField("billableHoursPerWeek", "Billable Hours per Week", { default: 30, max: 120, step: 0.5 }), currencyField("billingRate", "Billing Rate per Hour", { default: 150, max: 100000, step: 1 }), numberField("weeksPerYear", "Working Weeks per Year", { default: 48, min: 1, max: 52 }), currencyField("revenueGoal", "Yearly Revenue Goal (optional)", { default: 0, max: 100000000, step: 100, required: false })],
    calcResult: { label: "Yearly Billings", format: "currency" },
    calcResults: [pct("utilizationRate", "Utilization Rate"), cur("weeklyBillings", "Weekly Billings"), cur("yearlyBillings", "Yearly Billings", true), cur("effectiveRatePerHourWorked", "Effective Rate per Hour Worked"), num("billableHoursForGoalPerWeek", "Billable Hours per Week for Goal")],
    instructions: "Enter the hours you actually work and how many of them you can bill to clients. Utilization shows how much of your time earns money; admin, sales and training eat the rest.",
    examples: "Example: billing 30 of 45 hours a week at $150 is 67% utilization — $4,500 a week or $216,000 over 48 weeks. Spread over every hour worked, you earn $100 an hour.",
    assumptions: "Assumes every billable hour is invoiced and collected; real realization rates are often 85–95%. Law firm associates often target 1,800–2,000 billable hours a year. To set the rate itself, use the Billable Hour Rate Calculator.",
    faq: [
      { question: "What is a good utilization rate?", answer: "Around 70–80% for consultants and lawyers; agencies and freelancers often land at 60–75%." },
      { question: "How many billable hours are realistic?", answer: "About 5–6 a day for most professionals once email, meetings and admin are counted." },
    ],
  },
  {
    slug: "prorated-salary-calculator",
    category: TAX_SALARY,
    title: "Prorated Salary Calculator",
    description: "Calculate prorated salary for a partial month — when you start or leave mid-month or take unpaid days — and the salary for a part-time (FTE) position.",
    metaTitle: "Prorated Salary Calculator — Partial Month & FTE Pay",
    metaDescription: "Free prorated salary calculator. Work out pay for part of a month by working or calendar days, the daily rate, and a part-time FTE salary.",
    calcInputs: [currencyField("annualSalary", "Annual Salary (full-time)", { default: 72000, max: 100000000, step: 100 }), percentField("ftePercent", "FTE % (100 = full-time)", { default: 100, max: 200, step: 1 }), numberField("daysInPeriod", "Days in the Pay Period (working or calendar)", { default: 22, min: 1, max: 31 }), numberField("daysWorked", "Days Worked in the Period", { default: 12, max: 31, step: 0.5 })],
    calcResult: { label: "Prorated Pay", format: "currency" },
    calcResults: [cur("fteAdjustedSalary", "FTE-Adjusted Annual Salary"), cur("monthlySalary", "Full Monthly Salary"), cur("dailyRate", "Daily Rate"), cur("proratedPay", "Prorated Pay for the Period", true), cur("unpaidDeduction", "Amount Not Paid")],
    instructions: "Enter the full-time salary and, for a part-time role, the FTE percentage. Then enter the days in the month (working days or calendar days — use whichever your employer uses) and the days you worked.",
    examples: "Example: starting on a $72,000 salary with 12 of 22 working days left in the month pays $3,272.73 — $272.73 a day. A 0.8 FTE version of the job pays $57,600 a year.",
    assumptions: "Monthly salary = annual × FTE ÷ 12; daily rate = monthly ÷ days in the period. Some employers prorate on 260 working days a year or 365 calendar days instead; results differ slightly. " + DISCLAIMER,
    faq: [
      { question: "Should prorating use working or calendar days?", answer: "Either is legal in most places; check your contract or payroll policy — working days are most common." },
      { question: "What does 0.6 FTE mean?", answer: "60% of a full-time schedule, such as 24 hours of a 40-hour week, paid at 60% of the full salary." },
    ],
  },
  {
    slug: "selling-leave-days-calculator",
    category: TAX_SALARY,
    title: "Selling Leave Days Calculator",
    description: "Calculate how much you'd get for selling or cashing out unused vacation or leave days — the daily rate, gross payout and take-home after withholding.",
    metaTitle: "Selling Leave Days Calculator — PTO Cash-Out Value",
    metaDescription: "Free leave cash-out calculator. See what unused vacation or PTO days are worth at your daily rate, and the payout after supplemental tax withholding.",
    calcInputs: [numberField("leaveDays", "Leave Days to Sell", { default: 10, max: 365, step: 0.5 }), currencyField("annualSalary", "Annual Salary", { default: 65000, max: 100000000, step: 100 }), numberField("workdaysPerYear", "Paid Workdays per Year", { default: 260, min: 1, max: 366 }), percentField("payoutPercent", "Payout Rate (% of daily pay)", { default: 100, max: 200, step: 1 }), percentField("withholdingRate", "Federal Supplemental Withholding", { default: 22, max: 50, step: 0.1 }), percentField("stateAndFicaRate", "FICA + State Withholding", { default: 7.65, max: 30, step: 0.01 })],
    calcResult: { label: "Net Payout", format: "currency" },
    calcResults: [cur("dailyRate", "Daily Rate"), cur("grossPayout", "Gross Payout"), cur("withholding", "Withholding"), cur("netPayout", "Net Payout", true)],
    instructions: "Enter the days you can sell, your salary and the payout rate your employer uses (some pay less than 100% for sold leave). Cash-outs are supplemental wages, usually withheld at a flat 22% federal plus FICA and state tax.",
    examples: "Example: selling 10 days on a $65,000 salary (260 workdays) is worth $2,500 gross — about $1,759 after 22% federal and 7.65% FICA withholding.",
    assumptions: "Daily rate = salary ÷ paid workdays. Withholding isn't your final tax — the payout is taxed at your normal rate when you file. Whether unused leave can be sold or must be paid at termination depends on state law and company policy. " + DISCLAIMER,
    faq: [
      { question: "Is selling vacation days a good idea?", answer: "Financially it's extra pay, but rest has value too; some employers pay less per day for sold leave than for leave you take." },
      { question: "Is unused PTO paid when I quit?", answer: "Required in some states (e.g. California, Colorado, Massachusetts); elsewhere it depends on your employer's written policy." },
    ],
  },
  {
    slug: "lifetime-earnings-calculator",
    category: PERSONAL_FINANCE,
    title: "Lifetime Earnings Calculator",
    description: "Estimate how much you'll earn over the rest of your career with yearly raises — in total and in today's dollars — plus your final salary.",
    metaTitle: "Lifetime Earnings Calculator — Career Earnings Estimate",
    metaDescription: "Free lifetime earnings calculator. Project your total career earnings from your age, salary and raises, in nominal and today's dollars.",
    calcInputs: [numberField("currentAge", "Current Age", { default: 30, min: 14, max: 90 }), numberField("retirementAge", "Retirement Age", { default: 67, min: 15, max: 100 }), currencyField("currentSalary", "Current Yearly Pay", { default: 65000, max: 100000000, step: 100 }), percentField("annualRaise", "Average Yearly Raise", { default: 3, min: -20, max: 50, step: 0.1 }), percentField("inflation", "Inflation (for today's dollars)", { default: 2.5, min: -10, max: 30, step: 0.1 })],
    calcResult: { label: "Lifetime Earnings", format: "currency" },
    calcResults: [num("workingYearsLeft", "Working Years Left"), cur("lifetimeEarnings", "Lifetime Earnings", true), cur("lifetimeEarningsTodaysDollars", "In Today's Dollars"), cur("finalYearSalary", "Final-Year Salary"), cur("averageYearlyPay", "Average Yearly Pay")],
    instructions: "Enter your age, the age you plan to stop working, your current pay and the average raise you expect. Today's-dollar figures remove inflation so you can compare with prices now.",
    examples: "Example: a 30-year-old earning $65,000 with 3% raises until 67 would earn about $4.3 million over 37 years — about $2.63 million in today's money — finishing at $188,388 a year.",
    assumptions: "Steady raises every year with no career breaks; actual earnings usually rise fastest in your 20s–40s and flatten later. Social Security uses your highest 35 years of indexed earnings. " + DISCLAIMER,
    faq: [
      { question: "What are average US lifetime earnings?", answer: "Estimates range from about $1.7 million for high-school graduates to $2.8 million or more for bachelor's degree holders (2010s dollars)." },
      { question: "Why look at lifetime earnings?", answer: "It shows the value of education, career choices and raises, and puts big purchases or savings goals in perspective." },
    ],
  },
  {
    slug: "unpaid-work-calculator",
    category: PERSONAL_FINANCE,
    title: "Unpaid Work Calculator",
    description: "Calculate the market value of unpaid household work — cooking, cleaning, childcare, caregiving, errands and repairs — per week, month and year.",
    metaTitle: "Unpaid Work Calculator — Value of Housework & Care",
    metaDescription: "Free unpaid work calculator. Put a dollar value on cooking, cleaning, childcare, caregiving and errands at what it would cost to hire someone.",
    calcInputs: [
      numberField("cookingHours", "Cooking — Hours per Week", { default: 7, max: 168, step: 0.5 }), currencyField("cookingRate", "Cooking — Hourly Value", { default: 16, max: 1000, step: 0.5 }),
      numberField("cleaningHours", "Cleaning & Laundry — Hours per Week", { default: 6, max: 168, step: 0.5 }), currencyField("cleaningRate", "Cleaning — Hourly Value", { default: 17, max: 1000, step: 0.5 }),
      numberField("childcareHours", "Childcare — Hours per Week", { default: 10, max: 168, step: 0.5 }), currencyField("childcareRate", "Childcare — Hourly Value", { default: 15, max: 1000, step: 0.5 }),
      numberField("caregivingHours", "Adult Caregiving — Hours per Week", { default: 0, max: 168, step: 0.5, required: false }), currencyField("caregivingRate", "Caregiving — Hourly Value", { default: 18, max: 1000, step: 0.5, required: false }),
      numberField("errandsHours", "Shopping & Errands — Hours per Week", { default: 3, max: 168, step: 0.5 }), currencyField("errandsRate", "Errands — Hourly Value", { default: 15, max: 1000, step: 0.5 }),
      numberField("repairsHours", "Repairs & Yard Work — Hours per Week", { default: 2, max: 168, step: 0.5, required: false }), currencyField("repairsRate", "Repairs — Hourly Value", { default: 25, max: 1000, step: 0.5, required: false }),
    ],
    calcResult: { label: "Yearly Value", format: "currency" },
    calcResults: [num("hoursPerWeek", "Hours of Unpaid Work per Week"), cur("weeklyValue", "Weekly Value"), cur("monthlyValue", "Monthly Value"), cur("yearlyValue", "Yearly Value", true), cur("averageHourlyValue", "Average Hourly Value")],
    instructions: "Enter the hours you spend each week on each kind of unpaid work and what it would cost to pay someone to do it locally. The defaults are rough US hourly wages for each job.",
    examples: "Example: 28 hours a week of cooking, cleaning, childcare, errands and repairs is worth about $459 a week, or $23,868 a year at replacement cost.",
    assumptions: "Replacement-cost method: hours × the wage of a worker who'd do each task. Economists estimate unpaid care and housework would be 10–40% of GDP depending on the country. Values aren't taxable income.",
    faq: [
      { question: "Why value unpaid work?", answer: "It helps couples share household work fairly, size life insurance for a stay-at-home parent and shows its share of the economy." },
      { question: "How much is a stay-at-home parent's work worth?", answer: "Estimates often land between $40,000 and $180,000 a year depending on hours and the wages used." },
    ],
  },
  {
    slug: "us-income-percentile-calculator",
    category: PERSONAL_FINANCE,
    title: "US Income Percentile Calculator",
    description: "See where your household income ranks in the US — your income percentile, how you compare with the median, and the income needed for the top 20% and top 5%.",
    metaTitle: "US Income Percentile Calculator — Household Income Rank",
    metaDescription: "Free US household income percentile calculator. Compare your income with the latest Census data: percentile, median and the top 20% and 5% thresholds.",
    calcInputs: [currencyField("householdIncome", "Household Income (before tax, all members)", { default: 100000, max: 1000000000, step: 100 })],
    calcResult: { label: "Income Percentile", format: "number" },
    calcResults: [num("percentile", "Your Percentile", true), pct("topPercent", "You're in the Top"), pct("vsMedian", "Above (+) / Below (−) the Median"), cur("incomeForTop20", "Income for the Top 20%"), cur("incomeForTop5", "Income for the Top 5%")],
    instructions: "Enter your household's total income before tax — everyone living with you, including wages, business, investment and retirement income.",
    examples: "Example: $100,000 of household income is about the 55th percentile — higher than 55% of US households and 14% above the $87,460 median.",
    assumptions: "US Census Bureau CPS ASEC household income for 2025 (released September 2026): 20th $35,800, 40th $68,600, median $87,460, 60th $110,300, 80th $182,400, 95th $354,000. Percentiles between those points are interpolated; above the 95th they follow a Pareto curve, so they're estimates.",
    faq: [
      { question: "What household income is upper middle class?", answer: "Roughly the 60th–90th percentiles — about $110,000 to $250,000 nationally, though local costs matter a lot." },
      { question: "Why household rather than individual income?", answer: "Households share costs, and Census reports household income as the standard measure; individual earnings percentiles are lower." },
    ],
  },
  {
    slug: "unemployment-benefit-calculator",
    category: PERSONAL_FINANCE,
    title: "Unemployment Benefit Calculator",
    description: "Estimate your weekly unemployment benefit from your past wages, your state's formula and maximum, the total over your benefit weeks, and the amount after tax withholding.",
    metaTitle: "Unemployment Benefit Calculator — Weekly UI Estimate",
    metaDescription: "Free unemployment benefit calculator. Estimate your weekly benefit from high-quarter wages or average weekly wage, capped at your state's maximum.",
    calcInputs: [dropdown("method", "State Formula", [["Highest quarter wages ÷ 26 (most states)", 1], ["% of average weekly wage", 2]], 1), currencyField("highQuarterWages", "Wages in Your Highest-Paid Quarter", { default: 15000, max: 10000000, step: 100 }), currencyField("averageWeeklyWage", "Average Weekly Wage", { default: 1150, max: 1000000, step: 10 }), percentField("replacementPercent", "Replacement % (% method)", { default: 50, step: 1, required: false }), currencyField("stateMaxWeekly", "State Maximum Weekly Benefit", { default: 600, max: 10000, step: 1 }), currencyField("stateMinWeekly", "State Minimum Weekly Benefit", { default: 50, max: 10000, step: 1, required: false }), numberField("weeks", "Benefit Weeks", { default: 26, min: 1, max: 52 }), dropdown("withholdTax", "Withhold 10% Federal Tax?", [["No", 1], ["Yes", 2]], 1)],
    calcResult: { label: "Weekly Benefit", format: "currency" },
    calcResults: [cur("uncappedWeeklyBenefit", "Formula Amount (before cap)"), cur("weeklyBenefit", "Weekly Benefit", true), cur("weeklyAfterWithholding", "Weekly after Withholding"), cur("totalBenefit", "Total over Benefit Weeks"), pct("replacementOfWage", "Share of Your Weekly Wage Replaced")],
    instructions: "Find your highest-paid calendar quarter in the base period (usually the first four of the last five completed quarters) and your state's maximum weekly benefit. Most states pay about half of your prior weekly wage up to that cap.",
    examples: "Example: $15,000 earned in your best quarter ÷ 26 is $576.92 a week — under a $600 maximum — or $15,000 over 26 weeks, about 50% of a $1,150 weekly wage.",
    assumptions: "State formulas, maximums (from about $235 to over $1,000 a week) and durations (12–26 weeks) vary widely; dependants' allowances and partial-week earnings aren't included. The pandemic supplements (CARES Act FPUC, Lost Wages Assistance, HEALS/HEROES proposals) ended in 2021. Benefits are taxable federally. " + DISCLAIMER,
    faq: [
      { question: "How long does unemployment last?", answer: "Usually up to 26 weeks, but some states pay fewer weeks when their unemployment rate is low." },
      { question: "Is unemployment taxable?", answer: "Yes, federally and in most states — you can ask for 10% federal withholding when you apply." },
    ],
  },
];

// Every sub-category here hangs directly under Finance Calculators and is
// created on first use.
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
  if (!finance) throw new Error(`The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first.`);
  console.log(`Creating sub-category "${cat.name}" under "${finance.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const category = await ensureCategory(def.category);
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
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
