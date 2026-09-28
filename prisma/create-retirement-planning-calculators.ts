// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Retirement Calculators" sub-batch A (Planning & Goals). Part of the
// Retirement Calculators tool-list build-out: 76 tools in the source list, 8
// skipped as duplicates (retirement-calculator, 401k-calculator,
// pension-calculator, social-security-calculator, retirement-withdrawal-
// calculator, ira-calculator and roth-ira-calculator already exist in
// create-finance-retirement-calculators.ts; retirement-savings-goal-
// calculator in create-savings-goals-calculators.ts, now filed here too), 68
// built across 7 sub-batches, all filed under Finance Calculators >
// Retirement Calculators:
//   create-retirement-planning-calculators.ts (10 tools)
//   create-retirement-income-calculators.ts (10 tools)
//   create-retirement-tax-ira-calculators.ts (9 tools)
//   create-retirement-workplace-plans-calculators.ts (9 tools)
//   create-retirement-pension-social-security-calculators.ts (12 tools)
//   create-retirement-fire-timing-calculators.ts (11 tools)
//   create-retirement-portfolio-calculators.ts (7 tools)
//
// See src/lib/calc-engine-retirement-planning.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-planning-calculators.ts
// or
//   npm run db:create-retirement-planning-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "retirement-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial, tax or legal " +
  "advice. Returns aren't guaranteed, and tax rules, contribution limits and benefit rules change — check " +
  "IRS.gov, SSA.gov or your plan provider, or ask a qualified adviser, before acting.";

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
    slug: "retirement-savings-calculator",
    title: "Retirement Savings Calculator",
    description: "Project your retirement savings when you save a percentage of a salary that rises each year — in future dollars, today's money, and as a multiple of your final salary.",
    metaTitle: "Retirement Savings Calculator — % of Salary Saved",
    metaDescription: "Free retirement savings calculator. Save a % of a rising salary and see your balance at retirement in future dollars, today's money and salary multiple.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 35, min: 18, max: 80, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 67, min: 40, max: 85, step: 1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 50000, max: 100000000, step: 1000 }),
      currencyField("annualSalary", "Annual Salary", { default: 70000, max: 10000000, step: 1000 }),
      percentField("savingsRatePercent", "Share of Salary Saved (incl. Employer)", { default: 12, max: 100, step: 0.5 }),
      percentField("salaryGrowthPercent", "Yearly Pay Raise", { default: 3, max: 15, step: 0.25 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Projected Savings", format: "currency" },
    calcResults: [
      { key: "projectedSavings", label: "Projected Savings at Retirement", format: "currency", highlight: true },
      { key: "projectedSavingsTodaysMoney", label: "In Today's Money", format: "currency" },
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "finalSalary", label: "Salary in Your Final Year", format: "currency" },
      { key: "multipleOfFinalSalary", label: "Savings as a Multiple of Final Salary", format: "number" },
    ],
    instructions:
      "Enter your age, the age you plan to retire, your current savings and salary, and the share of your pay that goes " +
      "into retirement savings (including any employer contribution). Because saving a percentage means you save more as " +
      "your pay rises, add your expected yearly raise. The tool also converts the result into today's money so you can " +
      "judge what it will really buy.",
    examples:
      "Example: a 35-year-old earning $70,000 with $50,000 saved, putting away 12% of pay, with 3% raises and a 6% return, " +
      "reaches $1,487,908.18 at 67. That's $675,168.92 in today's money at 2.5% inflation, or 8.5 times a final salary of " +
      "$175,005.62. Total contributions are $441,023.17.",
    assumptions:
      "Contributions are made monthly and rise once a year with your pay. Returns and inflation are steady; real markets " +
      "go up and down. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much of my salary should I save for retirement?",
        answer: "A common guideline is about 15% of pay, including any employer contribution, starting in your 20s or early 30s. Starting later usually means saving a larger share.",
      },
    ],
  },
  {
    slug: "retirement-age-calculator",
    title: "Retirement Age Calculator",
    description: "Find the earliest age you could retire — when your savings are large enough to cover your spending, after other income, at a chosen withdrawal rate.",
    metaTitle: "Retirement Age Calculator — When Can I Retire?",
    metaDescription: "Free retirement age calculator. Find the earliest age your savings can support your spending, allowing for Social Security, pensions and inflation.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 40, min: 18, max: 90, step: 1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 150000, max: 100000000, step: 1000 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 1500, max: 1000000, step: 50 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      currencyField("annualSpendingToday", "Yearly Spending in Retirement (Today's Money)", { default: 50000, max: 10000000, step: 1000 }),
      currencyField("otherIncomeToday", "Social Security and Pension per Year (Today's Money)", { default: 20000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Earliest Retirement Age", format: "number" },
    calcResults: [
      { key: "earliestRetirementAge", label: "Earliest Retirement Age (0 = Not by 100)", format: "number", highlight: true },
      { key: "yearsFromNow", label: "Years from Now", format: "number" },
      { key: "nestEggNeededThen", label: "Savings Needed at That Age", format: "currency" },
      { key: "projectedSavingsThen", label: "Your Projected Savings Then", format: "currency" },
    ],
    instructions:
      "Enter your age, savings, monthly contribution and expected return. Then enter the yearly spending you want in " +
      "retirement and the income you expect from Social Security or a pension, both in today's money. The tool checks " +
      "each birthday to find the first one where your savings, at your chosen withdrawal rate, cover the rest of your " +
      "spending — with that spending rising for inflation.",
    examples:
      "Example: at 40 with $150,000 saved, adding $1,500 a month at 6%, and needing $50,000 a year with $20,000 from other " +
      "income, you could retire at 61 — in 21 years. By then you'd need $1,259,686.39 and would have $1,281,466.79.",
    assumptions:
      "The savings target is the yearly gap (spending minus other income), inflated to that age and divided by the " +
      "withdrawal rate. Returns are steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the best way to retire earlier?",
        answer: "Save more each month, lower the spending you'll need in retirement, or both. Lower spending helps twice: you save more now and need a smaller nest egg later.",
      },
    ],
  },
  {
    slug: "retirement-goal-calculator",
    title: "Retirement Goal Calculator",
    description: "See how your retirement savings compare with common age-based goals — savings as a multiple of salary, from 1x at 30 to 10x at 67.",
    metaTitle: "Retirement Goal Calculator — Savings Goal by Age",
    metaDescription: "Free retirement goal calculator. Compare your savings with age-based benchmarks — 1x salary at 30, 3x at 40, 6x at 50, 10x at 67 — and see the gap.",
    calcInputs: [
      numberField("age", "Your Age", { default: 40, min: 18, max: 80, step: 1 }),
      currencyField("annualSalary", "Annual Salary", { default: 80000, max: 10000000, step: 1000 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 180000, max: 100000000, step: 1000 }),
    ],
    calcResult: { label: "Benchmark for Your Age", format: "currency" },
    calcResults: [
      { key: "benchmarkForYourAge", label: "Savings Goal for Your Age", format: "currency", highlight: true },
      { key: "benchmarkMultiple", label: "Goal as a Multiple of Salary", format: "number" },
      { key: "yourMultiple", label: "Your Savings as a Multiple of Salary", format: "number" },
      { key: "aheadOrBehind", label: "Ahead (+) or Behind (−)", format: "currency" },
      { key: "targetAt67", label: "Goal at 67 (10x Salary)", format: "currency" },
    ],
    instructions:
      "Enter your age, salary and total retirement savings. The tool uses widely used planning milestones — about 1x your " +
      "salary saved by 30, 2x by 35, 3x by 40, 4x by 45, 6x by 50, 7x by 55, 8x by 60 and 10x by 67 — and fills in the " +
      "ages in between, so you can see whether you're on track for your age.",
    examples:
      "Example: at 40 earning $80,000, the goal is 3x salary, or $240,000. With $180,000 saved (2.25x), you're $60,000 " +
      "behind. The goal at 67 is $800,000.",
    assumptions:
      "These milestones are rules of thumb that assume retiring at 67 and replacing a good share of pre-retirement " +
      "income. Your own target depends on your spending, other income and retirement age. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I'm behind the goal for my age?",
        answer: "It's common and fixable. Raising your savings rate, capturing your full employer match, and working a little longer all close the gap. The Retirement Monthly Savings Calculator shows what it takes.",
      },
    ],
  },
  {
    slug: "retirement-readiness-calculator",
    title: "Retirement Readiness Calculator",
    description: "Get a retirement readiness score — the share of the income you want that your savings, Social Security and pensions are on track to provide.",
    metaTitle: "Retirement Readiness Calculator — Readiness Score",
    metaDescription: "Free retirement readiness calculator. See what % of your target retirement income your savings, Social Security and pension are on track to provide.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 45, min: 18, max: 85, step: 1 }),
      numberField("retirementAge", "Retirement Age", { default: 67, min: 40, max: 85, step: 1 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 200000, max: 100000000, step: 1000 }),
      currencyField("monthlyContribution", "Monthly Contribution", { default: 1000, max: 1000000, step: 50 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      currencyField("desiredIncomeToday", "Yearly Income You Want (Today's Money)", { default: 70000, max: 10000000, step: 1000 }),
      currencyField("guaranteedIncomeToday", "Social Security and Pension per Year (Today's Money)", { default: 28000, max: 10000000, step: 1000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Readiness Score", format: "percentage" },
    calcResults: [
      { key: "readinessScorePercent", label: "Readiness Score (100% = On Track)", format: "percentage", highlight: true },
      { key: "projectedIncomeTodaysMoney", label: "Projected Yearly Income (Today's Money)", format: "currency" },
      { key: "incomeFromSavingsTodaysMoney", label: "Of Which from Savings (Today's Money)", format: "currency" },
      { key: "yearlyShortfallOrSurplus", label: "Yearly Shortfall (−) or Surplus (+)", format: "currency" },
      { key: "projectedNestEgg", label: "Projected Savings at Retirement", format: "currency" },
    ],
    instructions:
      "Enter your age, retirement age, savings, monthly contribution and expected return, then the yearly income you'd " +
      "like in retirement and what Social Security and pensions should provide (both in today's money). The tool " +
      "projects your savings, turns them into income at your withdrawal rate, adds guaranteed income, and compares the " +
      "total with your goal. 100% or more means you're on track.",
    examples:
      "Example: at 45 with $200,000 saved and $1,000 a month going in at 6%, you'd have $1,292,451.73 at 67. In today's " +
      "money that supports $30,029.58 a year; with $28,000 of guaranteed income, that's $58,029.58 — a readiness score " +
      "of 82.9% against a $70,000 goal, or $11,970.42 a year short.",
    assumptions:
      "Savings income is the projected balance × withdrawal rate, converted to today's money. Returns and inflation are " +
      "steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's a good retirement readiness score?",
        answer: "100% means your plan covers your target income. Many planners like a margin above 100% for surprises; below 80% usually calls for saving more, working longer, or adjusting the goal.",
      },
    ],
  },
  {
    slug: "retirement-contribution-calculator",
    title: "Retirement Contribution Calculator",
    description: "Check your total retirement saving rate — your contribution plus your employer's — against a 15% target, and see how much more to save.",
    metaTitle: "Retirement Contribution Calculator — Are You at 15%?",
    metaDescription: "Free retirement contribution calculator. Add your and your employer's contributions, compare with a 15% target, and see the extra needed per month.",
    calcInputs: [
      currencyField("annualSalary", "Annual Salary", { default: 65000, max: 10000000, step: 1000 }),
      percentField("yourContributionPercent", "Your Contribution (% of Pay)", { default: 6, max: 100, step: 0.5 }),
      percentField("employerContributionPercent", "Employer Contribution (% of Pay)", { default: 3, max: 50, step: 0.5 }),
      percentField("targetPercent", "Target Total Saving Rate", { default: 15, max: 100, step: 0.5 }),
    ],
    calcResult: { label: "Total Saving Rate", format: "percentage" },
    calcResults: [
      { key: "totalSavingRatePercent", label: "Total Saving Rate (You + Employer)", format: "percentage", highlight: true },
      { key: "totalPerYear", label: "Total Saved per Year", format: "currency" },
      { key: "extraPercentNeeded", label: "Extra % of Pay Needed to Hit the Target", format: "percentage" },
      { key: "extraPerMonthNeeded", label: "Extra per Month Needed", format: "currency" },
      { key: "yourContributionPerYear", label: "Your Contribution per Year", format: "currency" },
    ],
    instructions:
      "Enter your salary, the percentage you contribute to your retirement plan, and what your employer adds (match or " +
      "automatic contribution). The tool adds them up and compares the total with a target — 15% of pay is a widely used " +
      "guideline — showing the extra you'd need to contribute to reach it.",
    examples:
      "Example: on a $65,000 salary, contributing 6% with a 3% employer contribution is a 9% total — $5,850 a year. To " +
      "reach 15% you'd need another 6% of pay, or $325 a month.",
    assumptions:
      "Assumes percentages of your current salary. Contributions to IRAs and other retirement accounts count toward the " +
      "target too. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does my employer match count toward saving 15%?",
        answer: "Yes — most guidelines count everything going into retirement accounts, including employer contributions.",
      },
    ],
  },
  {
    slug: "retirement-gap-calculator",
    title: "Retirement Gap Calculator",
    description: "Find your monthly retirement income gap — what you need, minus Social Security, pensions and income from savings — and the savings it takes to close it.",
    metaTitle: "Retirement Gap Calculator — Income Shortfall",
    metaDescription: "Free retirement gap calculator. Find the monthly gap between the income you need and what Social Security, pensions and savings provide.",
    calcInputs: [
      currencyField("monthlyIncomeNeeded", "Monthly Income You Need", { default: 6000, max: 1000000, step: 100 }),
      currencyField("socialSecurityMonthly", "Social Security per Month", { default: 2400, max: 100000, step: 50 }),
      currencyField("pensionMonthly", "Pension per Month", { default: 500, max: 100000, step: 50 }),
      currencyField("otherMonthly", "Other Guaranteed Income per Month", { default: 0, max: 100000, step: 50 }),
      currencyField("savingsAtRetirement", "Savings at Retirement", { default: 600000, max: 100000000, step: 5000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Gap", format: "currency" },
    calcResults: [
      { key: "monthlyGap", label: "Monthly Income Gap", format: "currency", highlight: true },
      { key: "guaranteedMonthlyIncome", label: "Guaranteed Monthly Income", format: "currency" },
      { key: "monthlyIncomeFromSavings", label: "Monthly Income from Savings", format: "currency" },
      { key: "extraSavingsNeededToClose", label: "Extra Savings Needed to Close the Gap", format: "currency" },
      { key: "monthlySurplus", label: "Monthly Surplus (If Any)", format: "currency" },
    ],
    instructions:
      "Enter the monthly income you'll need in retirement, what Social Security, a pension and any other guaranteed " +
      "income will pay, and the savings you'll have when you retire. The tool turns your savings into monthly income at " +
      "your withdrawal rate, shows the remaining gap, and works out the extra savings needed to fill it.",
    examples:
      "Example: needing $6,000 a month with $2,400 from Social Security and a $500 pension leaves $3,100 to cover. " +
      "$600,000 of savings at 4% provides $2,000 a month, so the gap is $1,100 a month — closing it would take $330,000 " +
      "more in savings.",
    assumptions:
      "All amounts are at the start of retirement. The withdrawal rate turns savings into a yearly income. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I close a retirement income gap?",
        answer: "Save more before retiring, delay Social Security to raise it, work part-time early in retirement, lower planned spending, or buy an annuity for part of the gap.",
      },
    ],
  },
  {
    slug: "retirement-nest-egg-calculator",
    title: "Retirement Nest Egg Calculator",
    description: "Work out the nest egg you need to fund an inflation-rising income for a set number of retirement years, and compare it with the 4% rule.",
    metaTitle: "Retirement Nest Egg Calculator — How Much to Retire",
    metaDescription: "Free retirement nest egg calculator. Find the savings needed to pay an inflation-rising income for your retirement years, vs the 4% rule.",
    calcInputs: [
      currencyField("annualSpending", "Yearly Spending in Retirement", { default: 60000, max: 10000000, step: 1000 }),
      currencyField("otherAnnualIncome", "Social Security and Pension per Year", { default: 24000, max: 10000000, step: 1000 }),
      numberField("yearsInRetirement", "Years in Retirement", { default: 30, min: 1, max: 60, step: 1 }),
      percentField("returnInRetirementPercent", "Return During Retirement", { default: 5, max: 15, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Nest Egg Needed", format: "currency" },
    calcResults: [
      { key: "nestEggNeeded", label: "Nest Egg Needed at Retirement", format: "currency", highlight: true },
      { key: "firstYearWithdrawal", label: "First-Year Withdrawal from Savings", format: "currency" },
      { key: "fourPercentRuleNestEgg", label: "Nest Egg by the 4% Rule (25x)", format: "currency" },
      { key: "impliedWithdrawalRatePercent", label: "Starting Withdrawal Rate This Implies", format: "percentage" },
    ],
    instructions:
      "Enter the yearly spending you expect in retirement and the part covered by Social Security or a pension. Then " +
      "enter how many years retirement must last, the return your savings will earn, and inflation. The tool finds the " +
      "exact nest egg that pays the gap every year — rising with inflation — and runs out at the end, then compares it " +
      "with the simpler 4% rule.",
    examples:
      "Example: spending $60,000 with $24,000 of other income leaves $36,000 a year to draw. Over 30 years, earning 5% " +
      "with 2.5% inflation, you'd need $778,181.29 — less than the $900,000 the 4% rule suggests, a 4.63% starting rate.",
    assumptions:
      "Withdrawals are taken at the start of each year and rise with inflation; the fund reaches zero at the end of the " +
      "period. Real returns vary, so many people keep a margin. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is this different from the 4% rule?",
        answer: "The 4% rule is built to survive bad markets over 30 years, so it's cautious. This calculation assumes a steady return and spends the money down exactly, so it usually gives a smaller figure.",
      },
    ],
  },
  {
    slug: "retirement-future-value-calculator",
    title: "Retirement Future Value Calculator",
    description: "See what your retirement savings and yearly contributions will be worth when you retire — in future dollars and in today's money.",
    metaTitle: "Retirement Future Value Calculator — Today's Money",
    metaDescription: "Free retirement future value calculator. Project your retirement balance with yearly contributions and see what it's worth in today's money.",
    calcInputs: [
      currencyField("currentBalance", "Current Retirement Balance", { default: 75000, max: 100000000, step: 1000 }),
      currencyField("annualContribution", "Yearly Contribution", { default: 10000, max: 1000000, step: 500 }),
      numberField("years", "Years Until Retirement", { default: 25, min: 1, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value at Retirement", format: "currency", highlight: true },
      { key: "futureValueTodaysMoney", label: "Worth in Today's Money", format: "currency" },
      { key: "totalContributed", label: "Total Contributed (incl. Current Balance)", format: "currency" },
      { key: "lostToInflation", label: "Buying Power Lost to Inflation", format: "currency" },
    ],
    instructions:
      "Enter your current balance, what you add each year, the years until retirement, your expected return and " +
      "inflation. The tool shows the balance you'll see on your statement at retirement, and what that is worth in " +
      "today's money — a much better guide to the lifestyle it will pay for.",
    examples:
      "Example: $75,000 plus $10,000 a year for 25 years at 6% grows to $870,535.42. With 2.5% inflation that's worth " +
      "$469,558.62 in today's money — $400,976.81 of the headline figure is inflation.",
    assumptions:
      "Contributions are made at the end of each year and returns and inflation are steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why convert to today's money?",
        answer: "A million dollars in 25 years won't buy what a million buys today. Converting shows the balance in terms of today's prices, so you can compare it with what you spend now.",
      },
    ],
  },
  {
    slug: "retirement-monthly-savings-calculator",
    title: "Retirement Monthly Savings Calculator",
    description: "Find the monthly saving needed to reach your retirement target, and how much more it takes if you wait 5 or 10 years to start.",
    metaTitle: "Retirement Monthly Savings Calculator — Cost of Waiting",
    metaDescription: "Free retirement monthly savings calculator. Find the monthly amount to reach your retirement goal and the cost of waiting 5 or 10 years.",
    calcInputs: [
      currencyField("targetNestEgg", "Retirement Savings Target", { default: 1000000, max: 100000000, step: 10000 }),
      currencyField("currentSavings", "Current Retirement Savings", { default: 40000, max: 100000000, step: 1000 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 30, min: 1, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 6, max: 20, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Saving Needed", format: "currency" },
    calcResults: [
      { key: "monthlySavingNeeded", label: "Monthly Saving Needed (Starting Now)", format: "currency", highlight: true },
      { key: "monthlyIfYouWait5Years", label: "Monthly If You Wait 5 Years", format: "currency" },
      { key: "monthlyIfYouWait10Years", label: "Monthly If You Wait 10 Years", format: "currency" },
      { key: "totalDepositsStartingNow", label: "Total Deposits Starting Now", format: "currency" },
    ],
    instructions:
      "Enter your retirement target, what you've saved, the years until retirement and your expected return. The tool " +
      "finds the monthly saving that reaches the target — and what it would take if you put off starting for 5 or 10 " +
      "years, while your current savings keep growing.",
    examples:
      "Example: to reach $1,000,000 in 30 years from $40,000 at 6%, save $755.69 a month. Waiting 5 years raises that to " +
      "$1,095.39, and waiting 10 years to $1,642.92.",
    assumptions:
      "Deposits are made at the end of each month and returns are steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does waiting cost so much?",
        answer: "Money saved early has the most years to compound. Every year you wait, the same goal has to be reached with fewer deposits and less growth, so each deposit must be bigger.",
      },
    ],
  },
  {
    slug: "retirement-lump-sum-calculator",
    title: "Retirement Lump Sum Calculator",
    description: "See what a one-off lump sum invested today grows to by retirement, and the monthly income it could pay you for a set number of years.",
    metaTitle: "Retirement Lump Sum Calculator — Grow & Draw Income",
    metaDescription: "Free retirement lump sum calculator. See what a one-off investment grows to by retirement and the monthly income it can pay for a set number of years.",
    calcInputs: [
      currencyField("lumpSum", "Lump Sum to Invest", { default: 50000, max: 100000000, step: 1000 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 20, min: 0, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Return Before Retirement", { default: 6, max: 20, step: 0.25 }),
      numberField("yearsOfIncome", "Years of Retirement Income", { default: 25, min: 1, max: 50, step: 1 }),
      percentField("returnInRetirementPercent", "Return During Retirement", { default: 4, max: 15, step: 0.25 }),
    ],
    calcResult: { label: "Monthly Income", format: "currency" },
    calcResults: [
      { key: "monthlyIncome", label: "Monthly Income in Retirement", format: "currency", highlight: true },
      { key: "valueAtRetirement", label: "Value at Retirement", format: "currency" },
      { key: "totalIncomeReceived", label: "Total Income Received", format: "currency" },
      { key: "growthMultiple", label: "Growth Multiple Before Retirement", format: "number" },
    ],
    instructions:
      "Enter a lump sum you could invest now — an inheritance, bonus or rollover — the years until you retire, and the " +
      "return before retirement. Then enter how many years you want it to pay you, and the (usually lower) return during " +
      "retirement. The tool grows the lump sum and turns it into a level monthly income that uses it up exactly.",
    examples:
      "Example: $50,000 invested for 20 years at 6% grows to $165,510.22 — 3.31 times over. Earning 4% in retirement, it " +
      "can pay $873.62 a month for 25 years, $262,087.18 in total.",
    assumptions:
      "Compounding is monthly and the income is a fixed amount that doesn't rise with inflation. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I invest a lump sum all at once?",
        answer: "Historically, investing a lump sum right away has beaten spreading it out more often than not, because markets rise more often than they fall. Spreading it out can reduce regret if prices drop soon after.",
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
