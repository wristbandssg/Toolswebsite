// One-time (but safe to re-run) batch setup script: creates the 9 tools
// of the "Savings Calculators" sub-batch A (Core Savings Math). Part of the
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
// See src/lib/calc-engine-savings-core.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-core-calculators.ts
// or
//   npm run db:create-savings-core-calculators

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

const COMPOUNDING_OPTIONS = [
  { label: "Daily", value: 365 },
  { label: "Monthly", value: 12 },
  { label: "Quarterly", value: 4 },
  { label: "Annually", value: 1 },
];

const TOOLS: ToolDef[] = [
  {
    slug: "savings-interest-calculator",
    title: "Savings Interest Calculator",
    description: "Calculate how much interest a savings balance earns — this month, in the first year, and over several years — and the APY your compounding gives.",
    metaTitle: "Savings Interest Calculator — Interest Earned",
    metaDescription: "Free savings interest calculator. See the interest your balance earns in the first month, first year, and over any period, plus the APY.",
    calcInputs: [
      currencyField("balance", "Savings Balance", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
      dropdownField("compoundingPerYear", "Compounding Frequency", 12, COMPOUNDING_OPTIONS),
      numberField("years", "Years", { default: 3, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Total Interest", format: "currency" },
    calcResults: [
      { key: "totalInterest", label: "Total Interest Earned", format: "currency", highlight: true },
      { key: "endingBalance", label: "Ending Balance", format: "currency" },
      { key: "firstMonthInterest", label: "Interest in the First Month", format: "currency" },
      { key: "firstYearInterest", label: "Interest in the First Year", format: "currency" },
      { key: "apyPercent", label: "APY (Effective Annual Yield)", format: "percentage" },
    ],
    instructions:
      "Enter the balance in your savings account, the annual interest rate the bank quotes, how often interest is " +
      "compounded, and how many years you'll leave the money there. The tool shows the interest earned in the first " +
      "month and first year, the total over the whole period, and the APY — the rate you actually earn once " +
      "compounding is counted. No new deposits are assumed; use the Savings Calculator if you're adding money.",
    examples:
      "Example: $10,000 at 4.5% compounded monthly earns $37.50 in the first month and $459.40 in the first year. " +
      "After 3 years the balance is $11,442.48, so $1,442.48 of interest in total. The APY is 4.59%.",
    assumptions:
      "Assumes the rate stays the same for the whole period and all interest is left in the account. Interest may " +
      "be taxable. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why is the APY higher than the interest rate?",
        answer: "Because interest earns interest. With monthly compounding, each month's interest is added to the balance and earns interest itself for the rest of the year, so 4.5% compounded monthly works out to about 4.59% a year.",
      },
    ],
  },
  {
    slug: "monthly-savings-calculator",
    title: "Monthly Savings Calculator",
    description: "See what saving a fixed amount every month adds up to, starting from zero, and how much of the final balance comes from interest.",
    metaTitle: "Monthly Savings Calculator — Save a Set Amount",
    metaDescription: "Free monthly savings calculator. Find out how much you'll have by saving the same amount each month, including interest, after any number of years.",
    calcInputs: [
      currencyField("monthlyDeposit", "Amount Saved Each Month", { default: 300, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years of Saving", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total You Deposit", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "balanceAfterYear1", label: "Balance After Year 1", format: "currency" },
    ],
    instructions:
      "Enter how much you'll put aside each month, the interest rate on your savings, and how many years you'll " +
      "keep going. The tool assumes you start from nothing and shows your balance after the first year and at the " +
      "end, split into what you deposited and what interest added.",
    examples:
      "Example: saving $300 a month at 4% for 10 years gives you $44,174.94. You deposit $36,000 and interest adds " +
      "$8,174.94. After the first year you'd have $3,666.74.",
    assumptions:
      "Assumes deposits at the end of each month and interest compounded monthly at a fixed rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How much will I have if I save $100 a month?",
        answer: "Enter 100 as the monthly amount. At 4% for 10 years, $100 a month grows to about $14,725 — $12,000 of your own money plus roughly $2,725 of interest.",
      },
    ],
  },
  {
    slug: "future-value-calculator",
    title: "Future Value Calculator",
    description: "Calculate the future value of a single sum of money at compound interest, how many times it multiplies, and exactly how long it takes to double.",
    metaTitle: "Future Value Calculator — Lump Sum & Doubling Time",
    metaDescription: "Free future value calculator. See what a sum of money grows to at compound interest, its growth multiple, and the exact years it takes to double.",
    calcInputs: [
      currencyField("presentValue", "Amount Today (Present Value)", { default: 10000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 5, max: 30, step: 0.05 }),
      dropdownField("compoundingPerYear", "Compounding Frequency", 12, COMPOUNDING_OPTIONS),
      numberField("years", "Years", { default: 10, min: 1, max: 100, step: 1 }),
    ],
    calcResult: { label: "Future Value", format: "currency" },
    calcResults: [
      { key: "futureValue", label: "Future Value", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "growthMultiple", label: "Growth Multiple (Times Your Money)", format: "number" },
      { key: "yearsToDouble", label: "Years for Money to Double", format: "number" },
    ],
    instructions:
      "Enter an amount you have today, the interest rate, how often it compounds, and the number of years. The tool " +
      "works out its future value, how many times over your money grows, and the exact number of years it takes to " +
      "double at that rate — more precise than the Rule of 72 shortcut.",
    examples:
      "Example: $10,000 at 5% compounded monthly grows to $16,470.09 in 10 years — 1.647 times the original. At " +
      "that rate money doubles in 13.89 years.",
    assumptions:
      "Assumes a single deposit, a fixed rate, and no withdrawals. For regular payments on top of a lump sum, use " +
      "the Investment Future Value Calculator. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is the future value formula?",
        answer: "FV = PV × (1 + r/m)^(m × t), where PV is today's amount, r the annual rate, m the number of compounding periods a year, and t the number of years.",
      },
      {
        question: "How accurate is the Rule of 72?",
        answer: "It's a good shortcut for rates between about 4% and 12%. At 5%, 72 ÷ 5 = 14.4 years, while the exact answer with monthly compounding is 13.89 years.",
      },
    ],
  },
  {
    slug: "savings-growth-calculator",
    title: "Savings Growth Calculator",
    description: "Project how your savings grow when you raise your monthly deposit by a set percentage every year, and what share of the balance ends up being interest.",
    metaTitle: "Savings Growth Calculator — With Rising Deposits",
    metaDescription: "Free savings growth calculator. Raise your monthly savings a set % each year and see your final balance, total deposits, and the share from interest.",
    calcInputs: [
      currencyField("initialDeposit", "Starting Balance", { default: 5000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit (Year 1)", { default: 200, max: 1000000, step: 25 }),
      percentField("annualIncreasePercent", "Increase Deposit Each Year By", { default: 3, max: 25, step: 0.5 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 15, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Final Balance", format: "currency" },
    calcResults: [
      { key: "finalBalance", label: "Final Balance", format: "currency", highlight: true },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
      { key: "interestSharePercent", label: "Share of Balance from Interest", format: "percentage" },
      { key: "finalMonthlyDeposit", label: "Monthly Deposit in the Final Year", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, what you'll save each month in the first year, and how much you plan to raise " +
      "that amount every year — for example, in line with pay rises. Add the interest rate and number of years. The " +
      "tool shows the final balance, how much of it you paid in, and how much interest contributed.",
    examples:
      "Example: $5,000 to start, $200 a month rising 3% a year, at 4.5% for 15 years, grows to $71,843.57. You " +
      "deposit $49,637.39, interest adds $22,206.17 (30.91% of the balance), and by the last year you're saving " +
      "$302.52 a month.",
    assumptions:
      "Deposits are made at the end of each month and rise at the start of each new year. Interest is compounded " +
      "monthly at a fixed rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why raise my savings each year?",
        answer: "Small yearly increases add up. Raising $200 a month by 3% a year means depositing about $8,600 more over 15 years than keeping it flat — and that extra money earns interest too.",
      },
    ],
  },
  {
    slug: "savings-rate-calculator",
    title: "Savings Rate Calculator",
    description: "Work out your personal savings rate — the percentage of your income you save — measured against both gross pay and take-home pay.",
    metaTitle: "Savings Rate Calculator — % of Income You Save",
    metaDescription: "Free savings rate calculator. Find the share of your income you save, counting retirement contributions and employer match, against gross and net pay.",
    calcInputs: [
      currencyField("grossMonthlyIncome", "Gross Monthly Income (Before Tax)", { default: 6000, max: 10000000, step: 100 }),
      currencyField("takeHomeMonthlyPay", "Take-Home Pay per Month", { default: 4500, max: 10000000, step: 100 }),
      currencyField("monthlySavingsFromPay", "Saved from Take-Home Pay per Month", { default: 600, max: 10000000, step: 25 }),
      currencyField("preTaxRetirement", "Pre-Tax Retirement Contributions per Month", { default: 300, max: 1000000, step: 25 }),
      currencyField("employerMatch", "Employer Match per Month", { default: 150, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Savings Rate (Gross)", format: "percentage" },
    calcResults: [
      { key: "savingsRateOfGrossPercent", label: "Savings Rate (of Gross Income)", format: "percentage", highlight: true },
      { key: "savingsRateOfTakeHomePercent", label: "Savings Rate (of Take-Home Pay)", format: "percentage" },
      { key: "totalSavedPerMonth", label: "Total Saved per Month", format: "currency" },
      { key: "totalSavedPerYear", label: "Total Saved per Year", format: "currency" },
    ],
    instructions:
      "Enter your gross monthly income, your take-home pay, what you save from your take-home pay, anything taken " +
      "from your paycheck before tax for retirement (such as a 401(k)), and any employer match. The gross savings " +
      "rate counts everything you save; the take-home rate shows only what you save from the money that reaches " +
      "your bank account.",
    examples:
      "Example: with $6,000 gross, $4,500 take-home, $600 saved from pay, $300 into a pre-tax retirement plan, and " +
      "a $150 match, you save $1,050 a month ($12,600 a year). That's a 17.07% savings rate on gross income and " +
      "13.33% of take-home pay.",
    assumptions:
      "The employer match is added to both the savings and the income side of the gross rate, since it's " +
      "compensation you'd otherwise not receive. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a good savings rate?",
        answer: "A common guideline is 15–20% of gross income, including retirement contributions. People aiming to retire early often save 30–50% or more.",
      },
    ],
  },
  {
    slug: "savings-percentage-calculator",
    title: "Savings Percentage Calculator",
    description: "Choose a percentage of your income to save and see the monthly and yearly amount, what's left to spend, and how much it grows to.",
    metaTitle: "Savings Percentage Calculator — Save a % of Pay",
    metaDescription: "Free savings percentage calculator. Pick a % of income to save and see the monthly amount, what's left to spend, and the balance it grows to.",
    calcInputs: [
      currencyField("monthlyIncome", "Monthly Income", { default: 4000, max: 10000000, step: 100 }),
      percentField("savePercent", "Percentage to Save", { default: 15, max: 100, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 5, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Monthly Savings", format: "currency" },
    calcResults: [
      { key: "monthlySavings", label: "Amount Saved per Month", format: "currency", highlight: true },
      { key: "annualSavings", label: "Amount Saved per Year", format: "currency" },
      { key: "leftToSpendMonthly", label: "Left to Spend per Month", format: "currency" },
      { key: "balanceAfterPeriod", label: "Savings Balance at the End", format: "currency" },
      { key: "interestEarned", label: "Interest Earned", format: "currency" },
    ],
    instructions:
      "Enter your monthly income (use take-home pay if that's what you budget with), the percentage you want to " +
      "save, the interest rate on your savings, and the number of years. The tool turns the percentage into a " +
      "monthly amount, shows what's left for spending, and projects the savings balance.",
    examples:
      "Example: saving 15% of $4,000 a month is $600 a month ($7,200 a year), leaving $3,400 to spend. At 4% for 5 " +
      "years that grows to $39,779.39, including $3,779.39 of interest.",
    assumptions:
      "Assumes your income and savings percentage stay the same, with deposits at the end of each month and a " +
      "fixed rate. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What percentage of my income should I save?",
        answer: "The popular 50/30/20 budget puts 20% of take-home pay toward savings and debt repayment. If that's out of reach, start with 5–10% and raise it with each pay rise.",
      },
    ],
  },
  {
    slug: "savings-balance-calculator",
    title: "Savings Balance Calculator",
    description: "Project your savings account balance month by month with regular deposits, regular withdrawals, and a monthly account fee all taken into account.",
    metaTitle: "Savings Balance Calculator — Deposits & Withdrawals",
    metaDescription: "Free savings balance calculator. Project your account balance with monthly deposits, withdrawals, fees, and interest over any number of months.",
    calcInputs: [
      currencyField("startingBalance", "Current Balance", { default: 8000, max: 100000000, step: 100 }),
      currencyField("monthlyDeposit", "Monthly Deposits", { default: 400, max: 1000000, step: 25 }),
      currencyField("monthlyWithdrawal", "Monthly Withdrawals", { default: 150, max: 1000000, step: 25 }),
      currencyField("monthlyFee", "Monthly Account Fee", { default: 0, max: 1000, step: 1 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("months", "Number of Months", { default: 24, min: 1, max: 600, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "totalInterest", label: "Total Interest Earned", format: "currency" },
      { key: "totalFees", label: "Total Fees Paid", format: "currency" },
      { key: "netChange", label: "Net Change in Balance", format: "currency" },
    ],
    instructions:
      "Enter your current balance, what you usually pay in and take out each month, any monthly fee, the interest " +
      "rate, and how many months ahead to look. The tool steps through each month — adding interest, then " +
      "deposits, then taking out withdrawals and the fee — and shows where the balance ends up.",
    examples:
      "Example: $8,000 with $400 paid in and $150 taken out each month, at 4% with no fee, grows to $14,900.87 in " +
      "24 months. Interest adds $900.87 and the balance rises by $6,900.87 overall.",
    assumptions:
      "Interest is added monthly on the balance at the start of each month. The balance never goes below zero, and " +
      "a fee is never charged beyond what's in the account. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What happens if my withdrawals are bigger than my deposits?",
        answer: "The balance shrinks each month. The tool stops it at zero, and the Net Change result shows how much the account went down.",
      },
    ],
  },
  {
    slug: "savings-deposit-calculator",
    title: "Savings Deposit Calculator",
    description: "Find the single deposit you need to make today to reach a savings target by a set date, and how much of the target interest will cover.",
    metaTitle: "Savings Deposit Calculator — Deposit Needed Today",
    metaDescription: "Free savings deposit calculator. Find the one-off deposit to make today so compound interest grows it to your savings target by a set date.",
    calcInputs: [
      currencyField("targetAmount", "Savings Target", { default: 20000, max: 100000000, step: 500 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
      dropdownField("compoundingPerYear", "Compounding Frequency", 12, COMPOUNDING_OPTIONS),
      numberField("years", "Years Until You Need It", { default: 5, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Deposit Needed Today", format: "currency" },
    calcResults: [
      { key: "depositNeededToday", label: "Deposit Needed Today", format: "currency", highlight: true },
      { key: "interestEarned", label: "Interest That Covers the Rest", format: "currency" },
      { key: "interestSharePercent", label: "Share of Target from Interest", format: "percentage" },
    ],
    instructions:
      "Enter the amount you want to have, the interest rate, how often it compounds, and how many years until you " +
      "need the money. The tool works backwards to the one-off deposit you'd need to make today — its present " +
      "value — with no further deposits.",
    examples:
      "Example: to have $20,000 in 5 years at 4.5% compounded monthly, deposit $15,977.05 today. Interest covers the " +
      "other $4,022.95, or 20.11% of the target.",
    assumptions:
      "Assumes a fixed rate for the whole period and no withdrawals. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I can't deposit it all at once?",
        answer: "Use the Savings Goal Calculator or Savings Contribution Calculator instead — they work out the regular deposit that reaches the same target.",
      },
    ],
  },
  {
    slug: "savings-interest-rate-calculator",
    title: "Savings Interest Rate Calculator",
    description: "Find the interest rate your savings would need to earn to reach a target amount, given your starting balance and monthly deposits.",
    metaTitle: "Savings Interest Rate Calculator — Rate Needed",
    metaDescription: "Free savings interest rate calculator. Find the annual rate needed to reach your savings target from your current balance and monthly deposits.",
    calcInputs: [
      currencyField("currentSavings", "Current Savings", { default: 5000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 250, max: 1000000, step: 25 }),
      currencyField("targetAmount", "Savings Target", { default: 25000, max: 100000000, step: 500 }),
      numberField("years", "Years", { default: 5, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Interest Rate Needed", format: "percentage" },
    calcResults: [
      { key: "requiredRatePercent", label: "Annual Interest Rate Needed", format: "percentage", highlight: true },
      { key: "totalDeposits", label: "Total You Deposit (incl. Current Savings)", format: "currency" },
      { key: "interestNeeded", label: "Interest Needed to Close the Gap", format: "currency" },
    ],
    instructions:
      "Enter what you have saved now, what you'll add each month, your target, and the number of years. The tool " +
      "finds the annual interest rate (compounded monthly) that makes your deposits grow to exactly the target. If " +
      "your deposits alone reach the target, the rate needed is 0%.",
    examples:
      "Example: starting with $5,000 and adding $250 a month for 5 years, you deposit $20,000. To reach $25,000 you " +
      "need $5,000 of interest, which takes a rate of 7.02% a year.",
    assumptions:
      "Interest is compounded monthly and deposits are made at the end of each month. Results are capped at 100% — " +
      "a rate that high means the target isn't realistic for a savings account. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if the rate needed is higher than savings accounts pay?",
        answer: "Then you'll need to save more each month, allow more time, or lower the target. Rates above what savings accounts offer usually mean taking investment risk.",
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
