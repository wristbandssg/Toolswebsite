// One-time (but safe to re-run) batch setup script: creates the 10 tools
// of the "Retirement Calculators" sub-batch B (Income & Withdrawals). Part of the
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
// See src/lib/calc-engine-retirement-income.ts for the math, the official
// 2026 figures it uses, and how near-namesake tools are differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-retirement-income-calculators.ts
// or
//   npm run db:create-retirement-income-calculators

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
    slug: "retirement-income-calculator",
    title: "Retirement Income Calculator",
    description: "Add up your total retirement income from every source — savings withdrawals, Social Security, pension, annuity and part-time work.",
    metaTitle: "Retirement Income Calculator — All Income Sources",
    metaDescription: "Free retirement income calculator. Add savings withdrawals, Social Security, pension, annuity and part-time pay to see your total monthly income.",
    calcInputs: [
      currencyField("savingsBalance", "Retirement Savings Balance", { default: 750000, max: 100000000, step: 5000 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, max: 10, step: 0.1 }),
      currencyField("socialSecurityMonthly", "Social Security per Month", { default: 2400, max: 100000, step: 50 }),
      currencyField("pensionMonthly", "Pension per Month", { default: 800, max: 100000, step: 50 }),
      currencyField("annuityMonthly", "Annuity per Month", { default: 0, max: 100000, step: 50 }),
      currencyField("partTimeMonthly", "Part-Time Work per Month", { default: 500, max: 100000, step: 50 }),
    ],
    calcResult: { label: "Total Monthly Income", format: "currency" },
    calcResults: [
      { key: "totalMonthlyIncome", label: "Total Monthly Income", format: "currency", highlight: true },
      { key: "totalAnnualIncome", label: "Total Yearly Income", format: "currency" },
      { key: "monthlyFromSavings", label: "Monthly from Savings", format: "currency" },
      { key: "guaranteedMonthlyIncome", label: "Guaranteed Monthly Income (SS + Pension + Annuity)", format: "currency" },
      { key: "shareFromSavingsPercent", label: "Share of Income from Savings", format: "percentage" },
    ],
    instructions:
      "Enter your savings balance and the withdrawal rate you plan to use, then each monthly income source you expect. " +
      "The tool adds everything up and shows how much of your income is guaranteed for life versus dependent on your " +
      "investments.",
    examples:
      "Example: $750,000 of savings at 4% gives $2,500 a month. Add $2,400 Social Security, an $800 pension and $500 from " +
      "part-time work, and your income is $6,200 a month ($74,400 a year) — 40.32% of it from savings.",
    assumptions:
      "Amounts are before tax. Savings income uses a simple withdrawal rate on the starting balance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the guaranteed share matter?",
        answer: "Guaranteed income keeps paying whatever the markets do. The more of your essential spending it covers, the less a bad year in the markets can hurt.",
      },
    ],
  },
  {
    slug: "safe-withdrawal-rate-calculator",
    title: "Safe Withdrawal Rate Calculator",
    description: "Find the starting withdrawal rate that makes your savings last exactly as long as you need, with withdrawals rising each year for inflation.",
    metaTitle: "Safe Withdrawal Rate Calculator — Custom Rate",
    metaDescription: "Free safe withdrawal rate calculator. Find the starting rate that lasts your retirement with inflation-rising withdrawals and your expected return.",
    calcInputs: [
      currencyField("balance", "Savings at Retirement", { default: 1000000, max: 100000000, step: 10000 }),
      numberField("years", "Years It Must Last", { default: 30, min: 1, max: 60, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 5, max: 15, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Safe Withdrawal Rate", format: "percentage" },
    calcResults: [
      { key: "safeWithdrawalRatePercent", label: "Starting Withdrawal Rate", format: "percentage", highlight: true },
      { key: "firstYearWithdrawal", label: "First-Year Withdrawal", format: "currency" },
      { key: "firstYearMonthly", label: "First-Year Monthly Amount", format: "currency" },
      { key: "finalYearWithdrawal", label: "Final-Year Withdrawal (After Inflation Raises)", format: "currency" },
    ],
    instructions:
      "Enter your savings, how many years they must last, your expected return and inflation. The tool solves for the " +
      "first-year withdrawal that, raised each year for inflation, spends the savings down to zero at exactly the end — " +
      "and shows it as a percentage of your starting balance.",
    examples:
      "Example: $1,000,000 lasting 30 years at a 5% return and 2.5% inflation supports a 4.63% starting rate — $46,261.71 " +
      "in year 1 ($3,855.14 a month), rising to $94,670.31 in the final year.",
    assumptions:
      "Assumes a steady return every year. Real markets are volatile, which is why published safe rates (like the 4% rule) " +
      "are lower than a steady-return calculation — see the Sequence of Returns Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is this higher than 4%?",
        answer: "The 4% rule was designed to survive the worst historical markets. A steady-return calculation doesn't allow for a crash early in retirement, so treat its result as an upper limit, not a guarantee.",
      },
    ],
  },
  {
    slug: "4-percent-rule-calculator",
    title: "4% Rule Calculator",
    description: "Apply the 4% rule: see your first-year withdrawal, what it grows to with inflation, and the nest egg (25 times spending) your target needs.",
    metaTitle: "4% Rule Calculator — Retirement Withdrawal Rule",
    metaDescription: "Free 4% rule calculator. See your first-year withdrawal, how it rises with inflation, and the 25x nest egg needed for your spending.",
    calcInputs: [
      currencyField("balance", "Savings at Retirement", { default: 800000, max: 100000000, step: 10000 }),
      percentField("rulePercent", "Withdrawal Rule", { default: 4, min: 1, max: 10, step: 0.1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
      currencyField("targetAnnualSpending", "Yearly Spending You Want from Savings", { default: 50000, max: 10000000, step: 1000 }),
    ],
    calcResult: { label: "First-Year Withdrawal", format: "currency" },
    calcResults: [
      { key: "firstYearWithdrawal", label: "First-Year Withdrawal", format: "currency", highlight: true },
      { key: "monthlyWithdrawal", label: "First-Year Monthly Amount", format: "currency" },
      { key: "year10Withdrawal", label: "Withdrawal in Year 10", format: "currency" },
      { key: "year30Withdrawal", label: "Withdrawal in Year 30", format: "currency" },
      { key: "nestEggForTargetSpending", label: "Nest Egg Needed for Your Target Spending", format: "currency" },
    ],
    instructions:
      "Enter your savings, the rule percentage (4% is the classic; many now use 3.5% for longer retirements), inflation, " +
      "and the yearly spending you want from savings. Under the rule you withdraw the percentage in year 1, then raise " +
      "that dollar amount each year by inflation — regardless of how markets do.",
    examples:
      "Example: $800,000 under the 4% rule gives $32,000 in year 1 ($2,666.67 a month). With 2.5% inflation that becomes " +
      "$39,963.62 in year 10 and $65,485.04 in year 30. To spend $50,000 a year you'd need $1,250,000 — 25 times spending.",
    assumptions:
      "The 4% rule comes from research on historical US stock and bond returns over 30-year periods. It isn't a " +
      "guarantee, and doesn't cover taxes or fees. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the 4% rule?",
        answer: "A rule of thumb from 1990s research: withdrawing 4% of your savings in the first year of retirement, then adjusting that amount for inflation, historically lasted at least 30 years in almost every period tested.",
      },
    ],
  },
  {
    slug: "retirement-drawdown-calculator",
    title: "Retirement Drawdown Calculator",
    description: "Plan a retirement drawdown where savings pay all your spending until Social Security starts later — the \"bridge\" years — and see when money runs out.",
    metaTitle: "Retirement Drawdown Calculator — Bridge to Social Security",
    metaDescription: "Free retirement drawdown calculator. Fund early retirement years from savings until Social Security starts, and see the age your money runs out.",
    calcInputs: [
      numberField("retirementAge", "Retirement Age", { default: 62, min: 40, max: 80, step: 1 }),
      currencyField("balance", "Savings at Retirement", { default: 600000, max: 100000000, step: 5000 }),
      currencyField("annualSpending", "Yearly Spending", { default: 55000, max: 10000000, step: 1000 }),
      numberField("socialSecurityStartAge", "Age Social Security Starts", { default: 70, min: 62, max: 70, step: 1 }),
      currencyField("socialSecurityAnnual", "Social Security per Year (Today's Money)", { default: 36000, max: 1000000, step: 1000 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 5, max: 15, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Age Money Runs Out", format: "number" },
    calcResults: [
      { key: "ageMoneyRunsOut", label: "Age Savings Run Out (0 = Past 120)", format: "number", highlight: true },
      { key: "balanceWhenSocialSecurityStarts", label: "Savings Left When Social Security Starts", format: "currency" },
      { key: "bridgeYears", label: "Bridge Years (Savings Pay Everything)", format: "number" },
      { key: "bridgeWithdrawalsTotal", label: "Total Withdrawn During the Bridge", format: "currency" },
    ],
    instructions:
      "Enter when you'll retire, your savings, and your yearly spending. Then enter when you'll start Social Security and " +
      "roughly what it will pay in today's money. Until it starts, savings pay for everything; after that they only cover " +
      "the gap. Spending and Social Security both rise with inflation.",
    examples:
      "Example: retiring at 62 with $600,000 and spending $55,000 a year, while delaying $36,000 of Social Security to 70, " +
      "means 8 bridge years costing $480,486.37. $288,061.88 is left at 70, and the savings last until age 84.",
    assumptions:
      "Yearly steps with withdrawals at the start of each year; Social Security's cost-of-living increases are assumed to " +
      "match inflation. A larger delayed benefit often makes this trade-off worthwhile. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why would anyone spend savings first and delay Social Security?",
        answer: "Each year you delay (up to 70) raises your benefit by about 8% for life, with inflation protection. Using savings to bridge the gap can give you more guaranteed income later.",
      },
    ],
  },
  {
    slug: "retirement-income-replacement-calculator",
    title: "Retirement Income Replacement Calculator",
    description: "Work out what share of your pre-retirement pay you'll need in retirement, based on the costs that stop — saving, payroll tax, work expenses — and new ones.",
    metaTitle: "Retirement Income Replacement Calculator — Ratio",
    metaDescription: "Free income replacement calculator. Find the % of your salary you'll need in retirement from what stops (saving, payroll tax, work costs) and new costs.",
    calcInputs: [
      currencyField("annualSalary", "Current Annual Salary", { default: 90000, max: 10000000, step: 1000 }),
      percentField("currentSavingsRatePercent", "Share of Pay You Save Now", { default: 10, max: 80, step: 0.5 }),
      percentField("payrollTaxPercent", "Payroll Tax (Social Security + Medicare)", { default: 7.65, max: 20, step: 0.05 }),
      percentField("workCostsPercent", "Work Costs (Commuting, Clothes, Lunches)", { default: 5, max: 30, step: 0.5 }),
      percentField("newCostsPercent", "New Costs in Retirement (Healthcare, Travel)", { default: 3, max: 50, step: 0.5 }),
    ],
    calcResult: { label: "Replacement Ratio", format: "percentage" },
    calcResults: [
      { key: "replacementRatioPercent", label: "Income Replacement Ratio", format: "percentage", highlight: true },
      { key: "annualIncomeNeeded", label: "Yearly Income Needed", format: "currency" },
      { key: "monthlyIncomeNeeded", label: "Monthly Income Needed", format: "currency" },
      { key: "incomeYouNoLongerNeed", label: "Pay You No Longer Need to Replace", format: "currency" },
    ],
    instructions:
      "Enter your salary and what share of it goes to saving, payroll tax (7.65% for most employees) and work-related " +
      "costs — spending that stops when you retire. Add any costs you expect to rise, such as healthcare or travel. The " +
      "result is the percentage of your pay you'd need to keep the same lifestyle.",
    examples:
      "Example: on $90,000, saving 10%, paying 7.65% payroll tax and spending 5% on work costs — but adding 3% for new " +
      "costs — you'd need 80.35% of your pay: $72,315 a year, or $6,026.25 a month.",
    assumptions:
      "Income tax is left in, since retirees usually still pay some. Replacement ratios of 70–85% are common rules of " +
      "thumb. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why don't I need 100% of my income in retirement?",
        answer: "You stop saving for retirement, stop paying Social Security and Medicare payroll tax on wages, and stop paying work costs — together often 20% or more of pay.",
      },
    ],
  },
  {
    slug: "retirement-spending-calculator",
    title: "Retirement Spending Calculator",
    description: "Model retirement spending in phases — active \"go-go\" years, slower \"slow-go\" years and quieter \"no-go\" years — and the nest egg that pattern needs.",
    metaTitle: "Retirement Spending Calculator — Go-Go to No-Go",
    metaDescription: "Free retirement spending calculator. Model go-go, slow-go and no-go spending phases and compare the nest egg needed with flat spending.",
    calcInputs: [
      numberField("retirementAge", "Retirement Age", { default: 65, min: 40, max: 85, step: 1 }),
      numberField("planToAge", "Plan to Age", { default: 95, min: 60, max: 110, step: 1 }),
      currencyField("baseAnnualSpending", "Yearly Spending in the Go-Go Years", { default: 60000, max: 10000000, step: 1000 }),
      percentField("slowGoPercent", "Slow-Go Spending (Ages 75–84) as % of Go-Go", { default: 85, max: 150, step: 1 }),
      percentField("noGoPercent", "No-Go Spending (85+) as % of Go-Go", { default: 75, max: 150, step: 1 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 5, max: 15, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Nest Egg Needed (Phased)", format: "currency" },
    calcResults: [
      { key: "nestEggNeededPhased", label: "Nest Egg Needed (Phased Spending)", format: "currency", highlight: true },
      { key: "nestEggNeededFlat", label: "Nest Egg Needed (Flat Spending)", format: "currency" },
      { key: "savedByPhasedSpending", label: "Smaller Nest Egg Thanks to Phases", format: "currency" },
      { key: "lifetimeSpendingPhased", label: "Total Lifetime Spending (Phased)", format: "currency" },
    ],
    instructions:
      "Enter your retirement age, the age to plan to, and your yearly spending in the active early years. Research on " +
      "retirees shows spending often falls as travel and activity slow, so set what share of that you expect to spend " +
      "from 75 to 84 and from 85 on. The tool values the whole pattern at retirement and compares it with spending the " +
      "same amount every year.",
    examples:
      "Example: retiring at 65, spending $60,000 a year to 75, then 85% and 75% of that, planned to 95, at 5% returns and " +
      "2.5% inflation, needs $1,150,041.72 — $146,927.09 less than the $1,296,968.82 flat spending would need.",
    assumptions:
      "Spending is paid at the start of each year and rises with inflation within each phase. Many plans add a reserve " +
      "for late-life healthcare costs. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Do retirees really spend less as they age?",
        answer: "On average, yes — studies of retiree spending find real spending tends to decline gradually through retirement, although healthcare costs can rise late in life.",
      },
    ],
  },
  {
    slug: "retirement-budget-calculator",
    title: "Retirement Budget Calculator",
    description: "Build a monthly retirement budget item by item, subtract Social Security and pensions, and see how much savings you need to fund the rest.",
    metaTitle: "Retirement Budget Calculator — Monthly Budget",
    metaDescription: "Free retirement budget calculator. List housing, food, healthcare and more, subtract guaranteed income, and see the savings needed for the gap.",
    calcInputs: [
      currencyField("housing", "Housing (Mortgage/Rent, Tax, Insurance)", { default: 1500, max: 100000, step: 50 }),
      currencyField("food", "Food", { default: 700, max: 100000, step: 25 }),
      currencyField("healthcare", "Healthcare (Medicare Premiums, Out-of-Pocket)", { default: 600, max: 100000, step: 25 }),
      currencyField("transportation", "Transportation", { default: 400, max: 100000, step: 25 }),
      currencyField("utilities", "Utilities and Phone", { default: 350, max: 100000, step: 25 }),
      currencyField("travelAndLeisure", "Travel and Leisure", { default: 500, max: 100000, step: 25 }),
      currencyField("other", "Other", { default: 450, max: 100000, step: 25 }),
      currencyField("guaranteedMonthlyIncome", "Social Security and Pension per Month", { default: 2800, max: 100000, step: 50 }),
      percentField("withdrawalRatePercent", "Withdrawal Rate", { default: 4, min: 1, max: 10, step: 0.1 }),
    ],
    calcResult: { label: "Monthly Budget", format: "currency" },
    calcResults: [
      { key: "monthlyBudget", label: "Monthly Retirement Budget", format: "currency", highlight: true },
      { key: "annualBudget", label: "Yearly Budget", format: "currency" },
      { key: "monthlyGapFromSavings", label: "Monthly Gap Savings Must Cover", format: "currency" },
      { key: "savingsNeededForGap", label: "Savings Needed to Cover the Gap", format: "currency" },
      { key: "healthcareSharePercent", label: "Healthcare Share of Budget", format: "percentage" },
    ],
    instructions:
      "Fill in what you expect to spend each month in retirement, category by category, then enter your expected Social " +
      "Security and pension income. The tool totals your budget, shows the monthly gap that has to come from savings, and " +
      "the savings needed to cover it at your withdrawal rate.",
    examples:
      "Example: a $4,500 monthly budget ($54,000 a year) with $2,800 of guaranteed income leaves $1,700 a month for " +
      "savings to cover — which needs $510,000 at a 4% withdrawal rate. Healthcare is 13.33% of the budget.",
    assumptions:
      "Amounts are in today's money and before tax. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What should I budget for healthcare in retirement?",
        answer: "Include Medicare Part B premiums, any Part D or Medigap/Advantage premiums, and out-of-pocket costs. Healthcare usually rises faster than other spending as you age.",
      },
    ],
  },
  {
    slug: "retirement-longevity-calculator",
    title: "Retirement Longevity Calculator",
    description: "Check whether your savings will outlast you: the age your money runs out with inflation-rising withdrawals, compared with the age you plan to live to.",
    metaTitle: "Retirement Longevity Calculator — Outlive Savings?",
    metaDescription: "Free retirement longevity calculator. See the age your savings run out with inflation-rising withdrawals, compared with the age you plan to live to.",
    calcInputs: [
      numberField("currentAge", "Current Age", { default: 65, min: 40, max: 100, step: 1 }),
      currencyField("balance", "Current Savings", { default: 700000, max: 100000000, step: 5000 }),
      currencyField("annualWithdrawal", "Yearly Withdrawal (First Year)", { default: 42000, max: 10000000, step: 1000 }),
      percentField("annualReturnPercent", "Expected Annual Return", { default: 5, max: 15, step: 0.25 }),
      percentField("inflationPercent", "Inflation Rate", { default: 2.5, max: 15, step: 0.1 }),
      numberField("planToAge", "Age You Plan to Live To", { default: 95, min: 60, max: 120, step: 1 }),
    ],
    calcResult: { label: "Age Money Runs Out", format: "number" },
    calcResults: [
      { key: "ageMoneyRunsOut", label: "Age Savings Run Out (0 = Past 120)", format: "number", highlight: true },
      { key: "yearsBeyondOrShortOfPlan", label: "Years Beyond (+) or Short of (−) Your Plan", format: "number" },
      { key: "balanceAtPlanAge", label: "Savings Left at Your Plan Age", format: "currency" },
      { key: "firstYearWithdrawalRatePercent", label: "First-Year Withdrawal Rate", format: "percentage" },
    ],
    instructions:
      "Enter your age, savings, the yearly withdrawal you'll start with, your expected return and inflation, and the age " +
      "you want to plan to — many planners use 90 to 95 because a 65-year-old has a real chance of living that long. The " +
      "tool raises withdrawals with inflation each year and reports the age the money would run out.",
    examples:
      "Example: at 65 with $700,000, withdrawing $42,000 a year (6%) rising with 2.5% inflation, at 5% returns, the money " +
      "runs out at 85 — 10 years short of planning to 95.",
    assumptions:
      "Withdrawals come out at the start of each year and returns are steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What age should I plan to live to?",
        answer: "Plan beyond average life expectancy. About half of people live past average, so many advisers use age 90 to 95 to reduce the risk of running out.",
      },
    ],
  },
  {
    slug: "retirement-inflation-calculator",
    title: "Retirement Inflation Calculator",
    description: "See what today's living costs will be when you retire and at the end of retirement, and the total you'll spend over your retirement after inflation.",
    metaTitle: "Retirement Inflation Calculator — Future Living Costs",
    metaDescription: "Free retirement inflation calculator. See what your expenses will cost when you retire and later, and your total retirement spending after inflation.",
    calcInputs: [
      currencyField("annualExpensesToday", "Yearly Expenses Today", { default: 50000, max: 10000000, step: 1000 }),
      numberField("yearsToRetirement", "Years Until Retirement", { default: 20, min: 0, max: 60, step: 1 }),
      numberField("yearsInRetirement", "Years in Retirement", { default: 30, min: 1, max: 60, step: 1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Expenses in Year 1 of Retirement", format: "currency" },
    calcResults: [
      { key: "expensesFirstYearOfRetirement", label: "Expenses in the First Year of Retirement", format: "currency", highlight: true },
      { key: "expensesFinalYearOfRetirement", label: "Expenses in the Final Year", format: "currency" },
      { key: "totalExpensesOverRetirement", label: "Total Expenses over Retirement", format: "currency" },
      { key: "valueOf100AtRetirement", label: "What $100 Today Is Worth at Retirement", format: "currency" },
    ],
    instructions:
      "Enter what you spend in a year today, the years until you retire, how long retirement will last, and the inflation " +
      "rate you expect. The tool shows the cost of the same lifestyle at the start and end of retirement, and the total " +
      "you'll need to spend across all those years.",
    examples:
      "Example: $50,000 of yearly expenses today becomes $90,305.56 by retirement in 20 years at 3% inflation, and " +
      "$212,810.97 by the last of 30 retirement years — $4,296,324.64 in total. $100 today is worth only $55.37 then.",
    assumptions:
      "Inflation is steady. Your own inflation rate depends on what you spend money on — healthcare has often risen faster " +
      "than average. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What inflation rate should I plan for?",
        answer: "The US long-run average is roughly 3%. Many plans use 2.5–3%, with a higher rate for healthcare costs.",
      },
    ],
  },
  {
    slug: "inflation-adjusted-retirement-income-calculator",
    title: "Inflation-Adjusted Retirement Income Calculator",
    description: "Compare a fixed retirement income with one that has a cost-of-living adjustment (COLA), and see what each is worth in today's money years from now.",
    metaTitle: "Inflation-Adjusted Retirement Income Calculator — COLA",
    metaDescription: "Free inflation-adjusted retirement income calculator. See what a fixed pension and a COLA-adjusted income are worth in today's money over time.",
    calcInputs: [
      currencyField("monthlyIncome", "Monthly Income Today", { default: 3000, max: 1000000, step: 50 }),
      numberField("years", "Years from Now", { default: 20, min: 1, max: 60, step: 1 }),
      percentField("inflationPercent", "Inflation Rate", { default: 3, max: 15, step: 0.1 }),
      percentField("colaPercent", "Yearly Cost-of-Living Adjustment (COLA)", { default: 2, max: 15, step: 0.1 }),
    ],
    calcResult: { label: "Fixed Income in Today's Money", format: "currency" },
    calcResults: [
      { key: "fixedIncomeTodaysMoney", label: "Fixed Income — Worth in Today's Money", format: "currency", highlight: true },
      { key: "buyingPowerLostPercent", label: "Buying Power Lost (Fixed Income)", format: "percentage" },
      { key: "colaIncomeInFutureDollars", label: "With COLA — Monthly Amount Then", format: "currency" },
      { key: "colaIncomeTodaysMoney", label: "With COLA — Worth in Today's Money", format: "currency" },
      { key: "colaNeededToKeepPace", label: "COLA Needed to Keep Full Buying Power", format: "percentage" },
    ],
    instructions:
      "Enter a monthly retirement income, how many years ahead to look, the inflation rate, and the yearly COLA your " +
      "pension or annuity pays (0% if it's fixed). The tool shows how much buying power a fixed income loses, and how " +
      "much a COLA protects.",
    examples:
      "Example: a fixed $3,000 a month is worth only $1,661.03 in today's money after 20 years of 3% inflation — 44.63% of " +
      "its buying power gone. With a 2% COLA it grows to $4,457.84, worth $2,468.20 today. A 3% COLA would keep pace fully.",
    assumptions:
      "Inflation and the COLA are steady. Social Security's COLA follows inflation; many private pensions have no COLA or " +
      "a capped one. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does Social Security keep up with inflation?",
        answer: "Yes — Social Security benefits get a yearly COLA based on consumer prices. For 2026 it was 2.8%. Most private pensions don't adjust, or adjust by a capped amount.",
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
