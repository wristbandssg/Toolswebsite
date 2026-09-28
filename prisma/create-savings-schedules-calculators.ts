// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Savings Calculators" sub-batch B (Deposit Schedules). Part of the
// Savings Calculators tool-list build-out: 60 tools in the source list, 3
// skipped as duplicates (savings-calculator, savings-goal-calculator and
// emergency-fund-calculator already exist in
// create-finance-savings-calculators.ts), 57 built across 6 sub-batches, all
// filed under Finance Calculators > Savings Calculators:
//   create-savings-core-calculators.ts (9 tools)
//   create-savings-schedules-calculators.ts (11 tools)
//   create-savings-accounts-calculators.ts (9 tools)
//   create-savings-withdrawals-emergency-calculators.ts (11 tools)
//   create-savings-goals-calculators.ts (11 tools)
//   create-savings-goal-planning-calculators.ts (6 tools)
//
// See src/lib/calc-engine-savings-schedules.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-schedules-calculators.ts
// or
//   npm run db:create-savings-schedules-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "savings-calculators";

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
  "This tool provides general estimates for informational purposes only and isn't financial advice. Actual " +
  "bank and credit union rates vary and change over time — check your institution's current rate and terms.";

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
    slug: "recurring-savings-calculator",
    title: "Recurring Savings Calculator",
    description: "Calculate the maturity value of a recurring deposit (RD) — a fixed monthly installment with interest compounded quarterly, as Indian banks and post offices calculate it.",
    metaTitle: "Recurring Savings Calculator — RD Maturity Value",
    metaDescription: "Free recurring deposit (RD) calculator. Enter your monthly installment, interest rate, and tenure to see the maturity value and interest earned.",
    calcInputs: [
      currencyField("monthlyInstallment", "Monthly Installment", { unit: "₹", default: 5000, max: 10000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 7, max: 15, step: 0.05 }),
      numberField("tenureMonths", "Tenure (Months)", { default: 12, min: 6, max: 120, step: 3 }),
    ],
    calcResult: { label: "Maturity Value", format: "currency", currency: "INR" },
    calcResults: [
      { key: "maturityValue", label: "Maturity Value", format: "currency", currency: "INR", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency", currency: "INR" },
      { key: "interestEarned", label: "Interest Earned", format: "currency", currency: "INR" },
    ],
    instructions:
      "Enter your monthly RD installment in rupees, the interest rate your bank or post office offers, and the " +
      "tenure in months. The tool uses the standard RD method: each installment earns interest compounded every " +
      "quarter for as long as it stays in the account, and everything is paid out together at maturity.",
    examples:
      "Example: ₹5,000 a month for 12 months at 7% matures at ₹62,310.66. You deposit ₹60,000 and earn ₹2,310.66 " +
      "of interest.",
    assumptions:
      "Assumes every installment is paid on time at the start of each month, and interest is compounded quarterly " +
      "at a fixed rate. Banks may round slightly differently, and TDS may be deducted from RD interest above the " +
      "yearly threshold. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How is RD interest calculated?",
        answer: "Banks compound RD interest quarterly. Each installment earns interest for the months it stays in the account, so the first installment earns the most and the last earns the least. The maturity value is the sum of every installment plus its interest.",
      },
      {
        question: "What happens if I miss an RD installment?",
        answer: "Most banks charge a small penalty for a late installment, and several missed installments can lead to the RD being closed early. Check your bank's rules.",
      },
    ],
  },
  {
    slug: "regular-savings-calculator",
    title: "Regular Savings Calculator",
    description: "Calculate the interest from a UK regular saver account — fixed monthly deposits for a set term — and see why the headline rate overstates your return.",
    metaTitle: "Regular Savings Calculator — UK Regular Saver",
    metaDescription: "Free regular saver calculator. See the interest a UK regular savings account really pays on monthly deposits and your true return on money paid in.",
    calcInputs: [
      currencyField("monthlyDeposit", "Monthly Deposit", { unit: "£", default: 300, max: 10000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (AER)", { default: 6.5, max: 15, step: 0.05 }),
      numberField("termMonths", "Term (Months)", { default: 12, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Interest Earned", format: "currency", currency: "GBP" },
    calcResults: [
      { key: "interestEarned", label: "Interest Earned", format: "currency", currency: "GBP", highlight: true },
      { key: "finalBalance", label: "Balance at the End", format: "currency", currency: "GBP" },
      { key: "totalDeposited", label: "Total Paid In", format: "currency", currency: "GBP" },
      { key: "returnOnTotalDepositedPercent", label: "Return on Total Paid In", format: "percentage", currency: "GBP" },
    ],
    instructions:
      "Enter your monthly deposit in pounds (regular savers usually cap this, often at £200–£500), the advertised " +
      "rate, and the term — usually 12 months. Each deposit earns interest only from the month it's paid in, so the " +
      "tool adds up the interest on every deposit separately.",
    examples:
      "Example: £300 a month for 12 months at 6.5% earns £126.75 of interest, giving £3,726.75 at the end. That's " +
      "only a 3.52% return on the £3,600 paid in, because on average your money is in the account for about half " +
      "the year.",
    assumptions:
      "Assumes deposits are made at the start of each month and interest is paid at the end of the term without " +
      "compounding, which is how most UK regular savers work. Interest may be taxable above your Personal Savings " +
      "Allowance. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a 6.5% regular saver really worth 6.5%?",
        answer: "The rate is real, but it only applies to money while it's in the account. Your first deposit earns a full year's interest and your last earns one month's, so over a 12-month term you earn roughly 54% of what a lump sum at the same rate would.",
      },
    ],
  },
  {
    slug: "weekly-savings-calculator",
    title: "Weekly Savings Calculator",
    description: "See what saving a set amount every week adds up to — with an optional weekly increase, perfect for the 52-week money challenge.",
    metaTitle: "Weekly Savings Calculator — 52-Week Challenge",
    metaDescription: "Free weekly savings calculator. See what weekly deposits grow to, with an optional weekly increase for the 52-week money saving challenge.",
    calcInputs: [
      currencyField("firstWeekDeposit", "Amount Saved in Week 1", { default: 20, max: 100000, step: 1 }),
      currencyField("weeklyIncrease", "Increase Each Week By", { default: 0, max: 10000, step: 1 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      numberField("weeks", "Number of Weeks", { default: 52, min: 1, max: 1040, step: 1 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "lastWeekDeposit", label: "Deposit in the Final Week", format: "currency" },
    ],
    instructions:
      "Enter what you'll save in the first week and, if you like, an amount to add each week after that. Add your " +
      "savings account's APY and the number of weeks. For the classic 52-week challenge, enter $1 for week 1, $1 as " +
      "the weekly increase, and 52 weeks — you save $1, then $2, then $3, up to $52.",
    examples:
      "Example: $20 a week for 52 weeks at 4% APY grows to $1,060.26 — $1,040 deposited plus $20.26 interest. The " +
      "52-week challenge ($1 rising by $1 a week) puts away $1,378 in a year.",
    assumptions:
      "Deposits are made at the end of each week, and the APY is converted to an equivalent weekly rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much does the 52-week money challenge save?",
        answer: "$1,378 in a year if you start at $1 and add $1 each week. Some people do it in reverse — $52 in week 1 down to $1 — to get the biggest deposits done early.",
      },
    ],
  },
  {
    slug: "biweekly-savings-calculator",
    title: "Biweekly Savings Calculator",
    description: "Calculate how much you'll save by putting money aside from every paycheck when you're paid every two weeks — 26 deposits a year.",
    metaTitle: "Biweekly Savings Calculator — Save Every Paycheck",
    metaDescription: "Free biweekly savings calculator. See what saving from every two-week paycheck grows to, and the two extra deposits you get each year.",
    calcInputs: [
      currencyField("perPaycheck", "Amount Saved per Paycheck", { default: 150, max: 1000000, step: 10 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "monthlyEquivalent", label: "Monthly Equivalent", format: "currency" },
      { key: "extraVsTwiceMonthlyPerYear", label: "Extra per Year vs Saving Twice a Month", format: "currency" },
    ],
    instructions:
      "Enter what you'll move to savings from each paycheck, your savings APY, and the number of years. Being paid " +
      "every two weeks means 26 paychecks a year, not 24, so the tool also shows how much more you save each year " +
      "than someone saving the same amount twice a month.",
    examples:
      "Example: $150 from every biweekly paycheck at 4% APY grows to $21,527.12 in 5 years — $19,500 deposited and " +
      "$2,027.12 of interest. That's the same as $325 a month, and $300 a year more than saving $150 twice a month.",
    assumptions:
      "Deposits are made on each payday, 26 times a year, and the APY is converted to an equivalent two-week rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does biweekly saving add up faster?",
        answer: "A year has 52 weeks, so a two-week pay schedule gives 26 paydays — two more than the 24 you'd get paid twice a month. In two months of the year you get three paychecks.",
      },
    ],
  },
  {
    slug: "annual-savings-calculator",
    title: "Annual Savings Calculator",
    description: "Work out how much you save per year by cutting or switching a regular expense, and what that saving grows to if you put it in savings.",
    metaTitle: "Annual Savings Calculator — Yearly Savings from Cuts",
    metaDescription: "Free annual savings calculator. See how much you save each year by cutting a regular cost, and what it's worth if you put the money in savings.",
    calcInputs: [
      currencyField("currentCost", "Current Cost", { default: 120, max: 1000000, step: 5 }),
      currencyField("newCost", "New Cost", { default: 70, max: 1000000, step: 5 }),
      dropdownField("periodsPerYear", "How Often You Pay", 12, [
        { label: "Every Week", value: 52 },
        { label: "Every Month", value: 12 },
        { label: "Every Quarter", value: 4 },
        { label: "Every Year", value: 1 },
      ]),
      percentField("annualRatePercent", "Interest Rate on Savings", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Annual Saving", format: "currency" },
    calcResults: [
      { key: "annualSaving", label: "Saving per Year", format: "currency", highlight: true },
      { key: "monthlySaving", label: "Saving per Month", format: "currency" },
      { key: "totalSavedOverPeriod", label: "Total Saved Over the Period", format: "currency" },
      { key: "valueIfSaved", label: "Value If Put into Savings", format: "currency" },
    ],
    instructions:
      "Enter what a regular bill or habit costs now, what it would cost after a change (a cheaper phone plan, " +
      "cancelling a subscription, cooking instead of takeout), and how often you pay it. Add a savings interest rate " +
      "and a number of years to see what the saving is worth if you put it into a savings account each month.",
    examples:
      "Example: cutting a $120 monthly bill to $70 saves $600 a year ($50 a month). Over 5 years that's $3,000, or " +
      "$3,314.95 if you put the $50 into a 4% savings account every month.",
    assumptions:
      "Assumes both costs stay the same and the saving is deposited monthly with interest compounded monthly. If " +
      "the new cost is higher, the results show negative numbers — the extra you'd be spending. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which cuts make the biggest yearly difference?",
        answer: "Recurring bills you pay every month or week — insurance, phone and internet plans, subscriptions, and daily purchases — because a small saving is repeated many times a year.",
      },
    ],
  },
  {
    slug: "daily-savings-calculator",
    title: "Daily Savings Calculator",
    description: "See how a small amount saved every day — or only on workdays — adds up per week, month and year, and what it grows to over time.",
    metaTitle: "Daily Savings Calculator — Save a Little Every Day",
    metaDescription: "Free daily savings calculator. Find out what saving a few dollars a day adds up to each week, month and year, and its value after interest.",
    calcInputs: [
      currencyField("dailyAmount", "Amount Saved per Day", { default: 5, max: 10000, step: 1 }),
      numberField("daysPerWeek", "Days per Week You Save", { default: 7, min: 1, max: 7, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Balance After the Period", format: "currency" },
    calcResults: [
      { key: "balanceAfterPeriod", label: "Balance After the Period", format: "currency", highlight: true },
      { key: "savedPerWeek", label: "Saved per Week", format: "currency" },
      { key: "savedPerMonth", label: "Saved per Month", format: "currency" },
      { key: "savedPerYear", label: "Saved per Year", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter the amount you'll save each day — say, the cost of a coffee — and how many days a week you'll do it " +
      "(5 for workdays only). Add an interest rate and a number of years. The tool shows the weekly, monthly and " +
      "yearly totals and what the money grows to if you move it into savings every month.",
    examples:
      "Example: $5 a day, every day, is $35 a week, $151.67 a month and $1,820 a year. Moved into a 4% savings " +
      "account monthly for 10 years, it grows to $22,332.89 — $4,132.89 of that is interest.",
    assumptions:
      "A year is taken as 52 weeks. Daily savings are moved into the account at the end of each month and interest " +
      "is compounded monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is saving $5 a day worth it?",
        answer: "Yes — $5 a day is $1,820 a year. It feels small day to day, but over 10 years with interest it becomes over $22,000.",
      },
    ],
  },
  {
    slug: "savings-with-contributions-calculator",
    title: "Savings with Contributions Calculator",
    description: "Plan savings in two phases: contribute (with a yearly raise) for a number of years, then stop and let the balance keep growing on its own.",
    metaTitle: "Savings with Contributions Calculator — 2 Phases",
    metaDescription: "Free savings with contributions calculator. Contribute for some years, then stop, and see your balance when contributions end and at the finish.",
    calcInputs: [
      currencyField("initialDeposit", "Starting Balance", { default: 2000, max: 100000000, step: 500 }),
      currencyField("monthlyContribution", "Monthly Contribution (Year 1)", { default: 300, max: 1000000, step: 25 }),
      percentField("annualIncreasePercent", "Raise Contributions Each Year By", { default: 2, max: 25, step: 0.5 }),
      numberField("contributionYears", "Years You Contribute", { default: 10, min: 0, max: 60, step: 1 }),
      numberField("totalYears", "Total Years (Contributing + Growing)", { default: 20, min: 1, max: 80, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "balanceWhenContributionsStop", label: "Balance When Contributions Stop", format: "currency" },
      { key: "totalContributed", label: "Total Contributed", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, your monthly contribution in the first year, and how much you'll raise it each " +
      "year. Then enter how many years you'll keep contributing and the total number of years you'll leave the " +
      "money — for example, contribute for 10 years and then let it grow untouched for 10 more.",
    examples:
      "Example: $2,000 to start, $300 a month rising 2% a year for 10 years, at 4.5%, reaches $52,438.82 when " +
      "contributions stop. Left alone for another 10 years it grows to $82,171.25. You contribute $41,419 in total " +
      "and interest adds $40,752.25.",
    assumptions:
      "Contributions are made at the end of each month and rise at the start of each new year. Interest is " +
      "compounded monthly at a fixed rate throughout. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does the balance keep growing after I stop?",
        answer: "Interest keeps compounding on everything already in the account. In the example, the balance grows by nearly $30,000 in the 10 years after contributions end — without adding a cent.",
      },
    ],
  },
  {
    slug: "savings-with-monthly-deposits-calculator",
    title: "Savings with Monthly Deposits Calculator",
    description: "Compare the same starting balance with and without monthly deposits, to see exactly how much your regular deposits add.",
    metaTitle: "Savings with Monthly Deposits Calculator — Compare",
    metaDescription: "Free savings with monthly deposits calculator. See your balance with and without monthly deposits, and how much interest the deposits earn.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 250, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Balance with Deposits", format: "currency" },
    calcResults: [
      { key: "balanceWithDeposits", label: "Balance with Monthly Deposits", format: "currency", highlight: true },
      { key: "balanceWithoutDeposits", label: "Balance Without Deposits", format: "currency" },
      { key: "extraFromDeposits", label: "Extra from the Deposits", format: "currency" },
      { key: "totalOfMonthlyDeposits", label: "Total of Monthly Deposits", format: "currency" },
      { key: "interestEarnedOnDeposits", label: "Interest Earned on the Deposits", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, the amount you'll deposit each month, the interest rate, and the number of " +
      "years. The tool shows two balances — one where you only leave the starting balance to grow, and one where " +
      "you also make the monthly deposits — so you can see the difference regular saving makes.",
    examples:
      "Example: $10,000 at 4% grows to $14,908.33 in 10 years on its own. Add $250 a month and it becomes " +
      "$51,720.78. The deposits add $36,812.45: $30,000 of your money plus $6,812.45 of interest on it.",
    assumptions:
      "Deposits are made at the end of each month and interest is compounded monthly at a fixed rate. " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which matters more, the starting balance or monthly deposits?",
        answer: "Over longer periods, regular deposits usually matter more. In the example, 10 years of $250 deposits add more than twice what the $10,000 starting balance grows to.",
      },
    ],
  },
  {
    slug: "savings-with-annual-deposits-calculator",
    title: "Savings with Annual Deposits Calculator",
    description: "Project savings when you add one deposit a year — like a tax refund or bonus — and see what depositing at the start of the year instead of the end is worth.",
    metaTitle: "Savings with Annual Deposits Calculator — Start vs End",
    metaDescription: "Free savings with annual deposits calculator. Add a yearly deposit to your savings and compare depositing at the start vs end of each year.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 5000, max: 100000000, step: 500 }),
      currencyField("annualDeposit", "Deposit Each Year", { default: 3000, max: 10000000, step: 100 }),
      dropdownField("depositAtStartOfYear", "When You Deposit", 1, [
        { label: "Start of Each Year", value: 1 },
        { label: "End of Each Year", value: 0 },
      ]),
      percentField("apyPercent", "Savings APY", { default: 4.5, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "extraFromDepositingAtStart", label: "Extra from Depositing at the Start of the Year", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, the amount you'll add once a year, whether you'll add it at the start or end " +
      "of each year, your APY, and the number of years. The last result shows how much more you'd end up with by " +
      "making each yearly deposit at the start of the year rather than the end.",
    examples:
      "Example: $5,000 plus $3,000 at the start of every year, at 4.5% APY for 10 years, grows to $46,288.38. You " +
      "deposit $35,000 and earn $11,288.38 of interest. Depositing at the start instead of the end of each year is " +
      "worth $1,658.91.",
    assumptions:
      "Interest is credited once a year at the APY. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why does depositing at the start of the year help?",
        answer: "Each deposit earns a full extra year of interest. Over 10 years that adds up to one year's interest on every deposit you make.",
      },
    ],
  },
  {
    slug: "lump-sum-savings-calculator",
    title: "Lump Sum Savings Calculator",
    description: "See what a one-off deposit grows to when tax is taken from the interest each year, compared with a tax-free account.",
    metaTitle: "Lump Sum Savings Calculator — After-Tax Growth",
    metaDescription: "Free lump sum savings calculator. See what a one-off deposit grows to after tax on interest, compared with a tax-free savings account.",
    calcInputs: [
      currencyField("lumpSum", "Lump Sum Deposit", { default: 25000, max: 100000000, step: 500 }),
      percentField("apyPercent", "Savings APY", { default: 4.5, max: 25, step: 0.05 }),
      percentField("taxRatePercent", "Your Tax Rate on Interest", { default: 22, max: 60, step: 1 }),
      numberField("years", "Years", { default: 5, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Balance After Tax", format: "currency" },
    calcResults: [
      { key: "balanceAfterTax", label: "Balance After Tax", format: "currency", highlight: true },
      { key: "balanceIfTaxFree", label: "Balance If Tax-Free", format: "currency" },
      { key: "interestAfterTax", label: "Interest Kept After Tax", format: "currency" },
      { key: "taxCost", label: "Cost of Tax on Interest", format: "currency" },
      { key: "afterTaxApyPercent", label: "After-Tax APY", format: "percentage" },
    ],
    instructions:
      "Enter a one-off amount you'll deposit — an inheritance, bonus or house sale, for example — the account's " +
      "APY, the tax rate you pay on interest, and the number of years. The tool takes tax off each year's interest " +
      "and compares the result with the same money in a tax-free account.",
    examples:
      "Example: $25,000 at 4.5% APY for 5 years grows to $31,154.55 tax-free. If 22% of each year's interest goes " +
      "in tax, you end up with $29,706.50 — an after-tax APY of 3.51%. Tax costs you $1,448.04.",
    assumptions:
      "Assumes interest is taxed every year at the same rate and the tax is paid from the interest itself. Use your " +
      "marginal (top) tax rate for the most realistic result. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is savings interest taxable?",
        answer: "In most countries, yes. In the US it's taxed as ordinary income; in the UK most people have a Personal Savings Allowance before tax applies. Tax-advantaged accounts such as ISAs, or retirement accounts, can shelter it.",
      },
    ],
  },
  {
    slug: "lump-sum-vs-monthly-savings-calculator",
    title: "Lump Sum vs Monthly Savings Calculator",
    description: "Compare putting a sum into savings all at once with feeding the same total in monthly, and find the monthly deposit that would match the lump sum.",
    metaTitle: "Lump Sum vs Monthly Savings Calculator — Which Wins",
    metaDescription: "Free lump sum vs monthly savings calculator. Compare depositing a sum at once with spreading it monthly, and see which ends up with more.",
    calcInputs: [
      currencyField("totalAmount", "Total Amount to Save", { default: 12000, max: 100000000, step: 500 }),
      numberField("spreadMonths", "Months to Spread It Over", { default: 12, min: 1, max: 240, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
      numberField("horizonYears", "Compare After (Years)", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Lump Sum Advantage", format: "currency" },
    calcResults: [
      { key: "lumpSumAdvantage", label: "Lump Sum Advantage", format: "currency", highlight: true },
      { key: "lumpSumValue", label: "Lump Sum — Value at the End", format: "currency" },
      { key: "monthlyDepositsValue", label: "Monthly Deposits — Value at the End", format: "currency" },
      { key: "monthlyDeposit", label: "Monthly Deposit (Same Total)", format: "currency" },
      { key: "monthlyDepositToMatchLumpSum", label: "Monthly Deposit Needed to Match the Lump Sum", format: "currency" },
    ],
    instructions:
      "Enter the total you want to save, how many months you'd spread it over if you didn't deposit it all at once, " +
      "the interest rate, and when to compare. Both options earn the same savings rate; the lump sum simply starts " +
      "earning sooner. The last result shows how much larger each monthly deposit would need to be to catch up.",
    examples:
      "Example: $12,000 deposited today at 4.5% is worth $15,021.55 after 5 years. Paying it in as $1,000 a month " +
      "for 12 months gives $14,661.72 — the lump sum is ahead by $359.83. To match it, you'd need to deposit " +
      "$1,024.54 a month.",
    assumptions:
      "Monthly deposits are made at the end of each month, and both balances earn the same fixed rate compounded " +
      "monthly. This compares savings accounts only — for investing in the market, see the Lump Sum vs Dollar-Cost " +
      "Averaging Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Is a lump sum always better in a savings account?",
        answer: "At a fixed, positive rate, yes — money deposited sooner earns interest for longer. Spreading it out only makes sense if you don't have the full amount yet or need to keep some cash on hand.",
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
