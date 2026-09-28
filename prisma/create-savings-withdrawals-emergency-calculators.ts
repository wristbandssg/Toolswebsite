// One-time (but safe to re-run) batch setup script: creates the 11 tools
// of the "Savings Calculators" sub-batch D (Withdrawals, Inflation & Emergency Funds). Part of the
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
// See src/lib/calc-engine-savings-withdrawals-emergency.ts for the math and for notes on
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-savings-withdrawals-emergency-calculators.ts
// or
//   npm run db:create-savings-withdrawals-emergency-calculators

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
    slug: "savings-withdrawal-calculator",
    title: "Savings Withdrawal Calculator",
    description: "Find the most you can withdraw from your savings every month so the money lasts exactly as many years as you need, while the rest keeps earning interest.",
    metaTitle: "Savings Withdrawal Calculator — Monthly Income",
    metaDescription: "Free savings withdrawal calculator. Find the monthly amount you can take from your savings so it lasts a set number of years, with interest.",
    calcInputs: [
      currencyField("balance", "Savings Balance", { default: 100000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "How Many Years It Must Last", { default: 10, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Monthly Withdrawal", format: "currency" },
    calcResults: [
      { key: "monthlyWithdrawal", label: "Monthly Withdrawal", format: "currency", highlight: true },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "interestEarnedAlongTheWay", label: "Interest Earned Along the Way", format: "currency" },
    ],
    instructions:
      "Enter your savings balance, the interest rate it earns, and how many years you need it to last. The tool " +
      "finds the fixed monthly withdrawal that runs the balance down to exactly zero at the end, counting the " +
      "interest the remaining money earns each month.",
    examples:
      "Example: $100,000 earning 4% can pay you $1,012.45 a month for 10 years. You'd withdraw $121,494.17 in total " +
      "— $21,494.17 more than you started with, thanks to interest along the way.",
    assumptions:
      "Assumes equal withdrawals at the end of each month and a fixed rate. The withdrawal doesn't rise with " +
      "inflation — see the Savings Drawdown Calculator for that. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I want the money to last forever?",
        answer: "Withdraw no more than the interest it earns. At 4%, $100,000 earns about $333 a month, so withdrawals at or below that leave the balance intact (before inflation).",
      },
    ],
  },
  {
    slug: "savings-drawdown-calculator",
    title: "Savings Drawdown Calculator",
    description: "Find out how long your savings will last when you withdraw a monthly amount that rises with inflation every year.",
    metaTitle: "Savings Drawdown Calculator — How Long It Lasts",
    metaDescription: "Free savings drawdown calculator. See how many years your savings last with monthly withdrawals that rise with inflation each year.",
    calcInputs: [
      currencyField("balance", "Savings Balance", { default: 150000, max: 100000000, step: 1000 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      currencyField("monthlyWithdrawal", "Monthly Withdrawal (Year 1)", { default: 1200, max: 10000000, step: 50 }),
      percentField("annualIncreasePercent", "Raise Withdrawals Each Year By (Inflation)", { default: 3, max: 20, step: 0.1 }),
    ],
    calcResult: { label: "Years the Savings Last", format: "number" },
    calcResults: [
      { key: "yearsLasted", label: "Years the Savings Last (0 = 100+ years)", format: "number", highlight: true },
      { key: "monthsLasted", label: "Months the Savings Last (0 = 100+ years)", format: "number" },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "balanceAfter10Years", label: "Balance After 10 Years", format: "currency" },
    ],
    instructions:
      "Enter your savings, the interest rate, what you plan to withdraw each month in the first year, and how much " +
      "you'll raise the withdrawal each year to keep up with rising prices. The tool runs the account month by month " +
      "until it's empty and tells you when that happens. A result of 0 means the money lasts more than 100 years.",
    examples:
      "Example: $150,000 at 4%, withdrawing $1,200 a month and raising that 3% a year, lasts 135 months — 11.25 " +
      "years — and pays out $188,704.09 in total. After 10 years $23,019.19 would be left.",
    assumptions:
      "Withdrawals are taken at the end of each month and increase at the start of each new year. The interest rate " +
      "is fixed. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why raise withdrawals with inflation?",
        answer: "So your spending power stays the same. $1,200 buys less every year when prices rise 3%, so to live the same way you'd need about $1,610 a month after 10 years.",
      },
    ],
  },
  {
    slug: "savings-with-withdrawals-calculator",
    title: "Savings with Withdrawals Calculator",
    description: "Project an account you keep adding to but also dip into once a year, and see what those yearly withdrawals cost in lost interest.",
    metaTitle: "Savings with Withdrawals Calculator — Yearly Dips",
    metaDescription: "Free savings with withdrawals calculator. Keep saving monthly, withdraw once a year, and see your balance and the interest the withdrawals cost.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 400, max: 1000000, step: 25 }),
      currencyField("annualWithdrawal", "Withdrawal Once a Year", { default: 2500, max: 10000000, step: 100 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 50, step: 1 }),
    ],
    calcResult: { label: "Ending Balance", format: "currency" },
    calcResults: [
      { key: "endingBalance", label: "Ending Balance", format: "currency", highlight: true },
      { key: "endingBalanceWithoutWithdrawals", label: "Ending Balance Without Withdrawals", format: "currency" },
      { key: "totalWithdrawn", label: "Total Withdrawn", format: "currency" },
      { key: "interestLostToWithdrawals", label: "Interest Lost to Withdrawals", format: "currency" },
    ],
    instructions:
      "Enter your starting balance, your monthly deposit, a withdrawal you make once a year (for a holiday, gifts, " +
      "or annual bills), the interest rate, and the number of years. The tool compares your balance with and " +
      "without the withdrawals, and separates the money you took out from the interest that money would have earned.",
    examples:
      "Example: $10,000 plus $400 a month at 4%, taking out $2,500 each year, leaves $43,689.56 after 10 years. " +
      "Without the withdrawals you'd have $73,808.25. You withdrew $25,000, and it cost another $5,118.69 in " +
      "interest you didn't earn.",
    assumptions:
      "Deposits are made monthly and the withdrawal comes out at the end of each year. The balance never goes below " +
      "zero. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I use a separate account for yearly expenses?",
        answer: "Many people do — a sinking fund for known yearly costs keeps your main savings growing uninterrupted. See the Sinking Fund Calculator.",
      },
    ],
  },
  {
    slug: "savings-inflation-calculator",
    title: "Savings Inflation Calculator",
    description: "See how inflation shrinks the buying power of cash that sits idle, and how much of it a savings account protects.",
    metaTitle: "Savings Inflation Calculator — Buying Power Lost",
    metaDescription: "Free savings inflation calculator. See what inflation does to idle cash over time versus the same money in a savings account.",
    calcInputs: [
      currencyField("amount", "Amount of Cash", { default: 10000, max: 100000000, step: 500 }),
      percentField("inflationPercent", "Inflation Rate (Annual)", { default: 3, max: 30, step: 0.1 }),
      percentField("savingsApyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      numberField("years", "Years", { default: 10, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Idle Cash Buying Power", format: "currency" },
    calcResults: [
      { key: "idleCashBuyingPower", label: "Idle Cash — Buying Power in Today's Money", format: "currency", highlight: true },
      { key: "buyingPowerLostIfIdle", label: "Buying Power Lost If Left Idle", format: "currency" },
      { key: "savingsBalance", label: "In Savings — Balance", format: "currency" },
      { key: "savingsBuyingPower", label: "In Savings — Buying Power in Today's Money", format: "currency" },
      { key: "realReturnPercent", label: "Real Return on Savings (After Inflation)", format: "percentage" },
    ],
    instructions:
      "Enter an amount of cash, the inflation rate you expect, the APY a savings account would pay, and the number " +
      "of years. The tool shows what the cash would really be worth — in today's money — if it sat in a drawer or " +
      "a 0% account, and if it earned interest instead.",
    examples:
      "Example: with 3% inflation, $10,000 of idle cash buys only $7,440.94 worth of today's goods after 10 years — " +
      "a loss of $2,559.06. In a 4% savings account it grows to $14,802.44, worth $11,014.41 in today's money: a " +
      "real return of 0.97% a year.",
    assumptions:
      "Assumes steady inflation and a fixed savings rate, and ignores tax on interest (see the Real Savings Growth " +
      "Calculator). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Does a savings account beat inflation?",
        answer: "Only when its rate is higher than inflation. When savings rates are below inflation, even money in the bank slowly loses buying power.",
      },
    ],
  },
  {
    slug: "inflation-adjusted-savings-calculator",
    title: "Inflation-Adjusted Savings Calculator",
    description: "Turn a savings goal priced in today's money into what it will really cost in the future, and the monthly saving needed to reach it.",
    metaTitle: "Inflation-Adjusted Savings Calculator — Real Goal",
    metaDescription: "Free inflation-adjusted savings calculator. See what your goal will cost after inflation and the monthly saving you need to reach it.",
    calcInputs: [
      currencyField("goalTodaysMoney", "Goal in Today's Money", { default: 30000, max: 100000000, step: 500 }),
      percentField("inflationPercent", "Inflation Rate (Annual)", { default: 3, max: 30, step: 0.1 }),
      numberField("years", "Years Until You Need It", { default: 8, min: 1, max: 60, step: 1 }),
      percentField("annualRatePercent", "Interest Rate on Savings", { default: 4.5, max: 25, step: 0.05 }),
      currencyField("currentSavings", "Current Savings", { default: 5000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Monthly Saving Needed", format: "currency" },
    calcResults: [
      { key: "monthlySavingNeeded", label: "Monthly Saving Needed (Inflation-Adjusted)", format: "currency", highlight: true },
      { key: "futureGoal", label: "Goal After Inflation", format: "currency" },
      { key: "monthlyIfInflationIgnored", label: "Monthly Saving If Inflation Were Ignored", format: "currency" },
      { key: "extraPerMonthForInflation", label: "Extra per Month to Cover Inflation", format: "currency" },
    ],
    instructions:
      "Enter what your goal costs today, the inflation rate you expect, how many years until you need it, the " +
      "interest your savings earn, and what you've saved so far. The tool inflates the goal to its future price " +
      "and works out the monthly saving that reaches it — and how much less you'd save if you forgot inflation.",
    examples:
      "Example: a $30,000 goal in today's money costs $38,003.10 in 8 years at 3% inflation. With $5,000 saved and " +
      "4.5% interest, you need $267.49 a month. Ignoring inflation you'd save only $198.08 — $69.41 a month short.",
    assumptions:
      "Assumes steady inflation and interest, with deposits at the end of each month. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why plan with inflation?",
        answer: "Prices rise over time, so a goal priced today will cost more when you get there. Saving for today's price leaves you short.",
      },
    ],
  },
  {
    slug: "real-savings-growth-calculator",
    title: "Real Savings Growth Calculator",
    description: "See your savings growth after both tax on interest and inflation, expressed in today's money — the real value of what you'll have.",
    metaTitle: "Real Savings Growth Calculator — After Tax & Inflation",
    metaDescription: "Free real savings growth calculator. See your savings balance after tax on interest and inflation, in today's money, and your real rate.",
    calcInputs: [
      currencyField("startingBalance", "Starting Balance", { default: 10000, max: 100000000, step: 500 }),
      currencyField("monthlyDeposit", "Monthly Deposit", { default: 300, max: 1000000, step: 25 }),
      percentField("annualRatePercent", "Interest Rate (Annual)", { default: 4.5, max: 25, step: 0.05 }),
      percentField("taxRatePercent", "Tax Rate on Interest", { default: 22, max: 60, step: 1 }),
      percentField("inflationPercent", "Inflation Rate (Annual)", { default: 3, max: 30, step: 0.1 }),
      numberField("years", "Years", { default: 10, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Real Balance", format: "currency" },
    calcResults: [
      { key: "realBalanceTodaysMoney", label: "Balance in Today's Money", format: "currency", highlight: true },
      { key: "nominalBalanceAfterTax", label: "Balance After Tax (Future Dollars)", format: "currency" },
      { key: "totalDeposited", label: "Total Deposited", format: "currency" },
      { key: "realAfterTaxRatePercent", label: "Real After-Tax Rate (Annual)", format: "percentage" },
    ],
    instructions:
      "Enter your starting balance, monthly deposit, interest rate, the tax rate you pay on interest, expected " +
      "inflation, and the number of years. The tool grows your savings after tax, then converts the result into " +
      "today's money so you can see what it would actually buy.",
    examples:
      "Example: $10,000 plus $300 a month at 4.5%, with 22% tax on interest, grows to $57,249.88 in 10 years. With " +
      "3% inflation that's worth $42,599.29 in today's money — less than the $46,000 you deposited. Your real " +
      "after-tax rate is just 0.55% a year.",
    assumptions:
      "Tax is taken from interest monthly as it's earned, and inflation is steady. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Why can the real balance be less than I deposited?",
        answer: "Because tax and inflation together can take more than the interest adds. The real balance measures buying power, not dollars — you still have more dollars, but they buy less.",
      },
    ],
  },
  {
    slug: "emergency-fund-goal-calculator",
    title: "Emergency Fund Goal Calculator",
    description: "Build your emergency fund target from your essential monthly expenses, item by item, times the number of months of cover you want.",
    metaTitle: "Emergency Fund Goal Calculator — Itemized Target",
    metaDescription: "Free emergency fund goal calculator. Add up essential expenses like housing, food and bills to set an emergency fund target for 3 to 12 months.",
    calcInputs: [
      currencyField("housing", "Rent or Mortgage", { default: 1500, max: 1000000, step: 50 }),
      currencyField("utilities", "Utilities and Phone", { default: 250, max: 100000, step: 10 }),
      currencyField("food", "Groceries", { default: 600, max: 100000, step: 25 }),
      currencyField("transportation", "Transportation", { default: 350, max: 100000, step: 25 }),
      currencyField("insurance", "Insurance (Health, Car, Home)", { default: 300, max: 100000, step: 25 }),
      currencyField("minimumDebtPayments", "Minimum Debt Payments", { default: 200, max: 1000000, step: 25 }),
      currencyField("otherEssentials", "Other Essentials (Childcare, Medicine)", { default: 200, max: 1000000, step: 25 }),
      dropdownField("monthsOfCover", "Months of Cover", 6, [
        { label: "3 months", value: 3 },
        { label: "6 months", value: 6 },
        { label: "9 months", value: 9 },
        { label: "12 months", value: 12 },
      ]),
    ],
    calcResult: { label: "Emergency Fund Target", format: "currency" },
    calcResults: [
      { key: "emergencyFundTarget", label: "Emergency Fund Target", format: "currency", highlight: true },
      { key: "monthlyEssentials", label: "Essential Expenses per Month", format: "currency" },
      { key: "threeMonthMinimum", label: "3-Month Minimum", format: "currency" },
      { key: "housingSharePercent", label: "Housing as a Share of Essentials", format: "percentage" },
    ],
    instructions:
      "Enter only the costs you couldn't cut if you lost your income — housing, utilities, groceries, getting to " +
      "work, insurance, minimum debt payments, and other must-pays. Leave out eating out, subscriptions and " +
      "savings. Then choose how many months of cover you want: 3 is a minimum, 6 is typical, and 9–12 suits " +
      "irregular income or a single-income household.",
    examples:
      "Example: $1,500 housing, $250 utilities, $600 food, $350 transportation, $300 insurance, $200 debt payments " +
      "and $200 other essentials come to $3,400 a month. Six months of cover is $20,400, with $10,200 as the " +
      "3-month minimum.",
    assumptions:
      "Assumes your essential costs stay the same while you're drawing on the fund. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How many months should my emergency fund cover?",
        answer: "Three to six months of essential expenses is the usual guideline. Aim higher if you're self-employed, work in an unstable industry, or are the only earner in your household.",
      },
    ],
  },
  {
    slug: "emergency-fund-months-calculator",
    title: "Emergency Fund Months Calculator",
    description: "Find out how many months your current emergency fund would last if you lost your income, counting any income you'd still receive.",
    metaTitle: "Emergency Fund Months Calculator — How Long It Lasts",
    metaDescription: "Free emergency fund months calculator. See how many months and days your emergency savings would cover your essential expenses.",
    calcInputs: [
      currencyField("fundBalance", "Emergency Fund Balance", { default: 12000, max: 100000000, step: 500 }),
      currencyField("monthlyEssentials", "Essential Expenses per Month", { default: 3200, max: 1000000, step: 50 }),
      currencyField("monthlyIncomeDuringGap", "Income You'd Still Get per Month", { default: 800, max: 1000000, step: 50 }),
    ],
    calcResult: { label: "Months Covered", format: "number" },
    calcResults: [
      { key: "monthsCovered", label: "Months Covered (0 = Income Covers Expenses)", format: "number", highlight: true },
      { key: "daysCovered", label: "Days Covered", format: "number" },
      { key: "monthlyShortfall", label: "Monthly Shortfall the Fund Pays", format: "currency" },
      { key: "monthsIfNoIncome", label: "Months Covered with No Income at All", format: "number" },
    ],
    instructions:
      "Enter your emergency fund balance, your essential monthly expenses, and any income you'd still receive if " +
      "you lost your job — unemployment benefits, a partner's pay, or side income. The fund only has to cover the " +
      "gap between the two.",
    examples:
      "Example: a $12,000 fund with $3,200 of essential expenses and $800 of other income covers a $2,400 monthly " +
      "gap for 5 months (152 days). With no income at all it would last 3.75 months.",
    assumptions:
      "Assumes expenses and income stay the same and ignores interest on the fund. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I make my emergency fund last longer?",
        answer: "Cut non-essential spending quickly, apply for any benefits you're entitled to straight away, and pick up temporary income — each shrinks the monthly gap the fund has to cover.",
      },
    ],
  },
  {
    slug: "emergency-fund-contribution-calculator",
    title: "Emergency Fund Contribution Calculator",
    description: "Calculate how much to put into your emergency fund each month to reach your target by a deadline, and what share of your pay that takes.",
    metaTitle: "Emergency Fund Contribution Calculator — Monthly",
    metaDescription: "Free emergency fund contribution calculator. Find the monthly amount to reach your emergency fund target by a deadline, and its share of pay.",
    calcInputs: [
      currencyField("target", "Emergency Fund Target", { default: 15000, max: 100000000, step: 500 }),
      currencyField("currentFund", "Current Emergency Fund", { default: 3000, max: 100000000, step: 100 }),
      numberField("months", "Months to Reach the Target", { default: 18, min: 1, max: 120, step: 1 }),
      percentField("apyPercent", "Savings APY", { default: 4, max: 25, step: 0.05 }),
      currencyField("monthlyTakeHome", "Monthly Take-Home Pay", { default: 4200, max: 10000000, step: 100 }),
    ],
    calcResult: { label: "Monthly Contribution", format: "currency" },
    calcResults: [
      { key: "monthlyContribution", label: "Monthly Contribution", format: "currency", highlight: true },
      { key: "weeklyEquivalent", label: "Weekly Equivalent", format: "currency" },
      { key: "shareOfTakeHomePercent", label: "Share of Take-Home Pay", format: "percentage" },
      { key: "interestEarned", label: "Interest Earned Along the Way", format: "currency" },
    ],
    instructions:
      "Enter your target, what's in the fund now, how many months you want to take, the APY your emergency savings " +
      "account pays, and your monthly take-home pay. The tool finds the monthly contribution and shows what share " +
      "of your pay it needs — useful for checking the plan is realistic.",
    examples:
      "Example: to grow a $3,000 fund to $15,000 in 18 months at 4% APY, contribute $638.49 a month (about $147.34 " +
      "a week). That's 15.2% of $4,200 take-home pay, and interest adds $507.25 along the way.",
    assumptions:
      "Contributions are made at the end of each month into an account paying a fixed APY. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where should I keep my emergency fund?",
        answer: "Somewhere safe and easy to reach — a high-yield savings or money market account at an insured bank. Avoid investments that can fall in value just when you need the money.",
      },
    ],
  },
  {
    slug: "rainy-day-fund-calculator",
    title: "Rainy Day Fund Calculator",
    description: "Size a rainy day fund for the smaller, irregular costs you know will come up — car repairs, home fixes, medical bills — and how much to set aside to build it.",
    metaTitle: "Rainy Day Fund Calculator — Irregular Costs Fund",
    metaDescription: "Free rainy day fund calculator. Size a fund for car repairs, home fixes and medical bills, and see the monthly and weekly amount to build it.",
    calcInputs: [
      currencyField("carRepairs", "Car Repairs per Year", { default: 800, max: 1000000, step: 50 }),
      currencyField("homeRepairs", "Home Repairs per Year", { default: 600, max: 1000000, step: 50 }),
      currencyField("medicalDental", "Medical and Dental Bills per Year", { default: 500, max: 1000000, step: 50 }),
      currencyField("otherIrregular", "Other Irregular Costs per Year", { default: 400, max: 1000000, step: 50 }),
      percentField("bufferPercent", "Safety Buffer", { default: 20, max: 100, step: 5 }),
      currencyField("alreadySaved", "Already Saved", { default: 300, max: 100000000, step: 50 }),
      numberField("monthsToBuild", "Months to Build It", { default: 6, min: 1, max: 60, step: 1 }),
    ],
    calcResult: { label: "Rainy Day Fund Target", format: "currency" },
    calcResults: [
      { key: "rainyDayFundTarget", label: "Rainy Day Fund Target", format: "currency", highlight: true },
      { key: "expectedIrregularCostsPerYear", label: "Expected Irregular Costs per Year", format: "currency" },
      { key: "monthlySetAside", label: "Monthly Set-Aside", format: "currency" },
      { key: "weeklySetAside", label: "Weekly Set-Aside", format: "currency" },
    ],
    instructions:
      "Estimate what you typically spend in a year on unplanned-but-expected costs — look back at last year's bank " +
      "statements. Add a safety buffer, what you've already put aside, and how quickly you want to build the fund. " +
      "A rainy day fund is separate from, and smaller than, an emergency fund: it covers everyday surprises so your " +
      "emergency fund stays untouched for job loss or major crises.",
    examples:
      "Example: $800 car, $600 home, $500 medical and $400 other costs add up to $2,300 a year. With a 20% buffer " +
      "the fund target is $2,760. With $300 already saved, set aside $410 a month (about $94.62 a week) for 6 months.",
    assumptions:
      "The target covers one year of expected irregular costs plus the buffer. Interest is ignored because the " +
      "amounts and time are small. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's the difference between a rainy day fund and an emergency fund?",
        answer: "A rainy day fund covers small, fairly predictable surprises — a flat tire, a broken appliance. An emergency fund covers big, rare shocks such as losing your job, and is usually several months of expenses.",
      },
    ],
  },
  {
    slug: "sinking-fund-calculator",
    title: "Sinking Fund Calculator",
    description: "Plan a sinking fund for a known upcoming expense — the monthly amount to catch up before it's due, and the ongoing amount if it comes around again.",
    metaTitle: "Sinking Fund Calculator — Save for Known Expenses",
    metaDescription: "Free sinking fund calculator. Find the monthly amount to save for a known expense before it's due, and the ongoing amount for recurring costs.",
    calcInputs: [
      currencyField("expenseAmount", "Expense Amount", { default: 1200, max: 10000000, step: 50 }),
      numberField("monthsUntilDue", "Months Until It's Due", { default: 8, min: 1, max: 120, step: 1 }),
      currencyField("alreadySaved", "Already Saved for It", { default: 200, max: 10000000, step: 50 }),
      numberField("recursEveryMonths", "Repeats Every (Months, 0 = One-Off)", { default: 12, min: 0, max: 120, step: 1 }),
    ],
    calcResult: { label: "Monthly Until Due", format: "currency" },
    calcResults: [
      { key: "monthlyUntilDue", label: "Monthly Amount Until It's Due", format: "currency", highlight: true },
      { key: "ongoingMonthlyAfter", label: "Ongoing Monthly Amount After That", format: "currency" },
      { key: "weeklyUntilDue", label: "Weekly Amount Until It's Due", format: "currency" },
      { key: "stillToSave", label: "Still to Save", format: "currency" },
    ],
    instructions:
      "Enter the cost of an expense you know is coming — car insurance, holiday gifts, a property tax bill, a new " +
      "laptop — how many months until it's due, and what you've set aside already. If it repeats (every 12 months, " +
      "say), enter how often; the tool shows the catch-up amount until the next due date and the smaller, steady " +
      "amount to save after that.",
    examples:
      "Example: a $1,200 yearly insurance bill due in 8 months, with $200 saved, needs $125 a month (about $28.85 a " +
      "week) until it's due. After that, $100 a month covers it every year.",
    assumptions:
      "Interest is ignored, and the expense is assumed to cost the same each time. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What is a sinking fund?",
        answer: "Money you set aside bit by bit for a specific expense you know is coming, so it doesn't land on a credit card or come out of your emergency fund.",
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
