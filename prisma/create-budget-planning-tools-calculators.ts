// One-time (but safe to re-run) batch setup script: creates the Budget Planning tools
// (8) of the Budget Calculators expansion, filed under Budget Calculators >
// Budgeting Methods & Planning Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-planning-tools.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-planning-tools-calculators.ts
// or
//   npm run db:create-budget-planning-tools-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_CATEGORY = { name: "Budget Calculators", slug: "budget-calculators" };
const FINANCE_SLUGS = ["finance-calculators", "finance"];
const CATEGORY = { name: "Budgeting Methods & Planning Calculators", slug: "budgeting-methods-calculators" };

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
  "This tool provides general estimates for planning purposes only and isn't financial advice. Your actual " +
  "costs depend on where you live, your prices and your choices — adjust the inputs to your situation.";

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
    slug: "weekly-spending-allowance-calculator",
    title: "Weekly Spending Allowance Calculator",
    description: "Work out how much you can spend each week once bills and savings are covered, plus a fun-money allowance for each person in the household.",
    metaTitle: "Weekly Spending Allowance Calculator — Fun Money",
    metaDescription: "Free weekly spending allowance calculator. See what you can spend each week after bills and savings, and the fun money for each person.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      currencyField("fixedBills", "Fixed Monthly Bills", { default: 2800, max: 10000000, step: 50 }),
      currencyField("savings", "Monthly Savings", { default: 700, max: 10000000, step: 50 }),
      percentField("funSharePercent", "Share of Weekly Money for Fun", { default: 30, max: 100, step: 5 }),
      numberField("people", "Adults Sharing the Fun Money", { default: 2, min: 1, max: 10, step: 1 }),
    ],
    calcResult: { label: "Weekly Spending Allowance", format: "currency" },
    calcResults: [
      { key: "leftEachMonth", label: "Left Each Month", format: "currency" },
      { key: "weeklyAllowance", label: "Weekly Spending Allowance", format: "currency", highlight: true },
      { key: "dailyAllowance", label: "Daily Allowance", format: "currency" },
      { key: "weeklyForGroceriesAndGas", label: "Weekly for Groceries, Gas & Essentials", format: "currency" },
      { key: "funMoneyPerPersonPerWeek", label: "Fun Money per Person per Week", format: "currency" },
    ],
    instructions:
      "A weekly allowance turns your budget into one simple number: after fixed bills and savings, whatever is left is what " +
      "you can spend this week on groceries, gas and everything else. Setting aside \"fun money\" for each partner — no " +
      "questions asked — helps couples avoid arguments over small purchases.\n\n" +
      "Enter your monthly figures; the weekly amount spreads the month over 52 weeks a year.",
    examples:
      "Example: $5,000 of pay minus $2,800 of bills and $700 of savings leaves $1,500 a month — " +
      "$346.15 a week. With 30% set aside as fun money, each of 2 adults gets " +
      "$51.92 a week.",
    assumptions:
      "Monthly amounts converted at 52 weeks a year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What counts as a fixed bill?",
        answer: "Anything with a set amount each month — rent or mortgage, insurance, loan payments, subscriptions, phone and internet. Variable costs come from the weekly allowance.",
      },
    ],
  },
  {
    slug: "bill-due-date-planner-calculator",
    title: "Bill Due Date Planner Calculator",
    description: "Line up bill due dates with your paydays: see what's left after each half of the month, your lowest balance, and how much in bills to move so both paychecks carry an even load.",
    metaTitle: "Bill Due Date Planner — Match Bills to Paydays",
    metaDescription: "Free bill due date planner. See your balance after each payday, the lowest point, and how much in bills to shift to balance your paychecks.",
    calcInputs: [
      currencyField("startingBalance", "Checking Balance Before the First Payday", { default: 300, max: 10000000, step: 50 }),
      currencyField("firstPaycheck", "First Paycheck of the Month", { default: 2500, max: 10000000, step: 50 }),
      currencyField("billsBeforeSecond", "Bills Due Before the Second Payday", { default: 2600, max: 10000000, step: 50 }),
      currencyField("secondPaycheck", "Second Paycheck of the Month", { default: 2500, max: 10000000, step: 50 }),
      currencyField("billsAfterSecond", "Bills Due After the Second Payday", { default: 1100, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Bills to Move to the Second Half", format: "currency" },
    calcResults: [
      { key: "leftAfterFirstHalf", label: "Left Before the Second Payday", format: "currency" },
      { key: "leftAtMonthEnd", label: "Left at Month End", format: "currency" },
      { key: "lowestBalance", label: "Lowest Balance", format: "currency" },
      { key: "billsToMoveToSecondHalf", label: "Bills to Move to the Second Half", format: "currency", highlight: true },
      { key: "totalMonthlyBills", label: "Total Monthly Bills", format: "currency" },
    ],
    instructions:
      "When rent, the car payment and credit cards all land before your second paycheck, money gets tight mid-month even " +
      "if the month as a whole is fine. Many lenders and utilities let you change due dates — moving some bills to just " +
      "after your second payday smooths out your cash flow, and autopay makes sure nothing is missed.\n\n" +
      "Add up the bills due in each half of the month and enter your paychecks.",
    examples:
      "Example: starting with $300, a $2,500 paycheck has to cover $2,600 of bills, leaving " +
      "only $200 before the next payday, while the second half has just $1,100 due. Moving about " +
      "$750 of bills to after the second payday would even out both halves.",
    assumptions:
      "Two paychecks a month; day-to-day spending is not included — keep a cushion for it. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I change my bill due dates?",
        answer: "Often yes — credit card issuers, many lenders, utilities and insurers will move a due date on request, sometimes once a year.",
      },
    ],
  },
  {
    slug: "budget-percentage-calculator",
    title: "Budget Percentage Calculator",
    description: "See what percentage of your income goes to housing, transportation, food, healthcare, insurance, entertainment, clothing, personal care, education and other spending.",
    metaTitle: "Budget Percentage Calculator — Spending by Category",
    metaDescription: "Free budget percentage calculator. See the share of income you spend on housing, transportation, food, healthcare and every other category.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      currencyField("housing", "Housing", { default: 1500, max: 1000000, step: 25 }),
      currencyField("transportation", "Transportation", { default: 600, max: 1000000, step: 25 }),
      currencyField("food", "Food", { default: 700, max: 1000000, step: 25 }),
      currencyField("healthcare", "Healthcare", { default: 300, max: 1000000, step: 25, required: false }),
      currencyField("insurance", "Insurance", { default: 250, max: 1000000, step: 25, required: false }),
      currencyField("entertainment", "Entertainment & Hobbies", { default: 200, max: 1000000, step: 25, required: false }),
      currencyField("clothing", "Clothing", { default: 150, max: 1000000, step: 25, required: false }),
      currencyField("personalCare", "Personal Care & Grooming", { default: 100, max: 1000000, step: 25, required: false }),
      currencyField("education", "Education", { default: 100, max: 1000000, step: 25, required: false }),
      currencyField("misc", "Miscellaneous (Cleaning, Books, Gifts…)", { default: 200, max: 1000000, step: 25, required: false }),
    ],
    calcResult: { label: "Total Spending as % of Income", format: "percentage" },
    calcResults: [
      { key: "housingPercent", label: "Housing", format: "percentage" },
      { key: "transportationPercent", label: "Transportation", format: "percentage" },
      { key: "foodPercent", label: "Food", format: "percentage" },
      { key: "healthcarePercent", label: "Healthcare", format: "percentage" },
      { key: "insurancePercent", label: "Insurance", format: "percentage" },
      { key: "entertainmentPercent", label: "Entertainment & Hobbies", format: "percentage" },
      { key: "clothingPercent", label: "Clothing", format: "percentage" },
      { key: "personalCarePercent", label: "Personal Care", format: "percentage" },
      { key: "educationPercent", label: "Education", format: "percentage" },
      { key: "miscPercent", label: "Miscellaneous", format: "percentage" },
      { key: "totalSpendingPercent", label: "Total Spending as % of Income", format: "percentage", highlight: true },
      { key: "leftForSavingsAndDebt", label: "Left for Savings & Extra Debt Payments", format: "currency" },
    ],
    instructions:
      "Common guidelines for shares of take-home pay: housing 25–30%, transportation 10–15%, food 10–15%, healthcare and " +
      "insurance 10–20% together, entertainment and hobbies 5–10%, clothing 3–5%, personal care 2–5% — leaving at least 15–20% " +
      "for savings and debt payoff. They're starting points, not rules.\n\n" +
      "Enter your monthly spending in each category to see where your money goes. For debt payments as a share of income, " +
      "see the debt-to-income ratio calculator; for savings, the savings rate calculator.",
    examples:
      "Example: on $5,000 a month, housing takes 30%, transportation 12% and food " +
      "14%. All spending adds up to 82% of income, leaving $900 for savings and " +
      "extra debt payments.",
    assumptions:
      "Percentages of after-tax income. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which category is easiest to cut?",
        answer: "Food (especially dining out), subscriptions and entertainment usually offer the quickest savings; housing and transportation give the biggest but take longer to change.",
      },
    ],
  },
  {
    slug: "financial-goal-prioritizer-calculator",
    title: "Financial Goal Prioritizer Calculator",
    description: "Put your money goals in a sensible order — employer match, high-interest debt, emergency fund, then your next goal — and see how long each one takes.",
    metaTitle: "Financial Goal Prioritizer — What to Save for First",
    metaDescription: "Free financial goal prioritizer. Order your goals — employer match, high-interest debt, emergency fund, next goal — and see months for each.",
    calcInputs: [
      currencyField("monthlyAvailable", "Money Available for Goals Each Month", { default: 1000, max: 10000000, step: 50 }),
      currencyField("matchGap", "Extra Needed to Get the Full Employer Match (Monthly)", { default: 200, max: 100000, step: 25, required: false }),
      currencyField("debtBalance", "High-Interest Debt Balance", { default: 6000, max: 10000000, step: 100, required: false }),
      percentField("debtRatePercent", "Debt Interest Rate", { default: 22, max: 40, step: 0.25 }),
      currencyField("emergencyTarget", "Emergency Fund Target", { default: 15000, max: 10000000, step: 500 }),
      currencyField("emergencySaved", "Emergency Fund Saved So Far", { default: 3000, max: 10000000, step: 500, required: false }),
      currencyField("nextGoal", "Next Goal (e.g., Down Payment)", { default: 30000, max: 100000000, step: 500 }),
    ],
    calcResult: { label: "Months to Reach All Goals", format: "number" },
    calcResults: [
      { key: "toEmployerMatch", label: "To Employer Match (Monthly)", format: "currency" },
      { key: "leftForGoals", label: "Left for Other Goals (Monthly)", format: "currency" },
      { key: "monthsToPayOffDebt", label: "Step 1: Months to Pay Off Debt", format: "number" },
      { key: "debtInterestPaid", label: "Interest Paid on the Debt", format: "currency" },
      { key: "monthsToFillEmergencyFund", label: "Step 2: Months to Fill the Emergency Fund", format: "number" },
      { key: "monthsToNextGoal", label: "Step 3: Months to the Next Goal", format: "number" },
      { key: "totalMonthsForAll", label: "Months to Reach All Goals", format: "number", highlight: true },
    ],
    instructions:
      "A common order: first contribute enough to get any employer retirement match (it's an instant return), then pay " +
      "off high-interest debt such as credit cards, then build a full emergency fund (3–6 months of expenses), then save for " +
      "bigger goals. Many people keep a small starter emergency fund while paying down debt.\n\n" +
      "Enter what you can put toward goals each month. The steps run one after another.",
    examples:
      "Example: with $1,000 a month, $200 goes to the employer match and $800 to goals. The " +
      "$6,000 debt is gone in 9 months, the emergency fund is full 15 months " +
      "later, and the $30,000 goal takes 38 more — 62 months in all.",
    assumptions:
      "The match contribution continues throughout; savings earn no interest; 600 means a step can't be finished at this " +
      "amount. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I save for an emergency fund before paying off debt?",
        answer: "A small one (around $1,000 or one month of expenses) first, so a surprise bill doesn't go back on the credit card; then attack the debt.",
      },
    ],
  },
  {
    slug: "windfall-allocation-planner-calculator",
    title: "Windfall Allocation Planner Calculator",
    description: "Plan what to do with a tax refund, bonus, inheritance or other windfall: a share to enjoy, then high-interest debt, your emergency fund and long-term savings.",
    metaTitle: "Windfall Calculator — Tax Refund & Bonus Allocation",
    metaDescription: "Free windfall allocation planner. Split a tax refund, bonus or inheritance between fun, debt, emergency savings and investing.",
    calcInputs: [
      currencyField("amount", "Windfall Amount (Refund, Bonus, Gift)", { default: 5000, max: 100000000, step: 100 }),
      percentField("funPercent", "Share to Enjoy", { default: 10, max: 100, step: 5 }),
      currencyField("highInterestDebt", "High-Interest Debt", { default: 3000, max: 10000000, step: 100, required: false }),
      percentField("debtRatePercent", "Debt Interest Rate", { default: 22, max: 40, step: 0.25 }),
      currencyField("emergencyGap", "Emergency Fund Shortfall", { default: 1000, max: 10000000, step: 100, required: false }),
    ],
    calcResult: { label: "To Long-Term Savings", format: "currency" },
    calcResults: [
      { key: "funMoney", label: "To Enjoy", format: "currency" },
      { key: "toHighInterestDebt", label: "To High-Interest Debt", format: "currency" },
      { key: "toEmergencyFund", label: "To Emergency Fund", format: "currency" },
      { key: "toLongTermSavings", label: "To Long-Term Savings", format: "currency", highlight: true },
      { key: "yearlyInterestSaved", label: "Interest Saved per Year", format: "currency" },
    ],
    instructions:
      "Windfalls — a tax refund, work bonus, inheritance or gift — are a chance to get ahead. A popular approach: set aside " +
      "a small share to enjoy (so the plan sticks), then wipe out high-interest debt, top up your emergency fund, and invest " +
      "the rest for long-term goals.\n\n" +
      "Remember a bonus is taxed as income; enter the amount you actually receive.",
    examples:
      "Example: a $5,000 windfall gives $500 to enjoy, clears $3,000 of credit card debt (saving about " +
      "$660 a year in interest), adds $1,000 to the emergency fund and puts $500 " +
      "into long-term savings.",
    assumptions:
      "Interest saved is a year of interest on the debt paid off. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should I adjust my withholding if I get a big tax refund?",
        answer: "A large refund means you overpaid during the year. Adjusting your W-4 puts that money in each paycheck instead — useful if you'd rather have it sooner.",
      },
    ],
  },
  {
    slug: "no-spend-month-challenge-calculator",
    title: "No-Spend Month Challenge Calculator",
    description: "See how much a no-spend challenge saves by cutting non-essential spending for a month, how much that adds up to each year, and what it could grow to if invested.",
    metaTitle: "No-Spend Month Challenge Calculator — Savings",
    metaDescription: "Free no-spend challenge calculator. See how much cutting discretionary spending for a month saves, per year, and if invested.",
    calcInputs: [
      currencyField("dailyDiscretionary", "Usual Non-Essential Spending per Day", { default: 35, max: 10000, step: 1 }),
      numberField("days", "Challenge Length (Days)", { default: 30, min: 1, max: 365, step: 1 }),
      numberField("challengesPerYear", "Challenges per Year", { default: 2, min: 0, max: 12, step: 1 }),
      percentField("returnPercent", "Return If Invested", { default: 7, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Saved per Challenge", format: "currency" },
    calcResults: [
      { key: "savedPerChallenge", label: "Saved per Challenge", format: "currency", highlight: true },
      { key: "savedPerYear", label: "Saved per Year", format: "currency" },
      { key: "valueIfInvested", label: "Value If Invested", format: "currency" },
    ],
    instructions:
      "In a no-spend challenge you buy only essentials — rent, bills, groceries, gas — for a set period, cutting takeout, " +
      "shopping and entertainment. Besides the savings, it shows which purchases you really miss.\n\n" +
      "Check your bank statements for your usual daily non-essential spending.",
    examples:
      "Example: skipping $35 a day of non-essential spending for 30 days saves $1,050. Doing it " +
      "2 times a year saves $2,100, which could grow to $31,045.56 in 10 years at " +
      "7%.",
    assumptions:
      "Savings invested at the end of each year. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What's allowed during a no-spend month?",
        answer: "You set the rules. Most people allow fixed bills, groceries, gas and medical costs, and pause dining out, shopping and new subscriptions.",
      },
    ],
  },
  {
    slug: "52-week-savings-challenge-calculator",
    title: "52-Week Savings Challenge Calculator",
    description: "Plan the 52-week money challenge: deposit a little more each week and see the total saved, the first and last deposits, and the balance with interest.",
    metaTitle: "52-Week Savings Challenge Calculator — Total Saved",
    metaDescription: "Free 52-week savings challenge calculator. See your total, weekly deposits and balance with interest when you save a bit more each week.",
    calcInputs: [
      currencyField("startAmount", "First Week's Deposit", { default: 1, max: 10000, step: 1 }),
      currencyField("weeklyIncrease", "Increase Each Week", { default: 1, max: 10000, step: 1 }),
      numberField("weeks", "Weeks", { default: 52, min: 1, max: 520, step: 1 }),
      percentField("apyPercent", "Savings Account APY", { default: 4, max: 15, step: 0.05, required: false }),
    ],
    calcResult: { label: "Total Saved", format: "currency" },
    calcResults: [
      { key: "totalSaved", label: "Total Saved", format: "currency", highlight: true },
      { key: "firstDeposit", label: "First Deposit", format: "currency" },
      { key: "lastDeposit", label: "Last Deposit", format: "currency" },
      { key: "averagePerWeek", label: "Average per Week", format: "currency" },
      { key: "totalWithInterest", label: "Total With Interest", format: "currency" },
    ],
    instructions:
      "The classic 52-week challenge starts with $1 in week 1, $2 in week 2, and so on up to $52 in week 52 — $1,378 in a " +
      "year. Doing it in reverse (starting at $52) front-loads the bigger deposits while motivation is high, and suits " +
      "tighter budgets around the holidays.\n\n" +
      "Change the starting amount and weekly step to scale the challenge up or down.",
    examples:
      "Example: starting at $1 and adding $1 more each week, you deposit $52 in the final " +
      "week and save $1,378 — about $26.50 a week. In a 4% savings account it grows to " +
      "$1,396.90.",
    assumptions:
      "Interest compounds weekly. The total is the same whether you go forward or in reverse. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How can I save more than $1,378?",
        answer: "Double the steps ($2, $4, $6…) for $2,756, or start at $5 and add $5 a week for $6,890.",
      },
    ],
  },
  {
    slug: "kids-allowance-calculator",
    title: "Kids Allowance Calculator",
    description: "Set a child's allowance by age, split it into save, give and spend, and see how much the savings could grow to by age 18.",
    metaTitle: "Kids Allowance Calculator — How Much by Age",
    metaDescription: "Free kids allowance calculator. Set an allowance by age, split it into save, give and spend, and see the savings by 18.",
    calcInputs: [
      numberField("age", "Child's Age", { default: 8, min: 3, max: 17, step: 1 }),
      currencyField("perYearOfAge", "Weekly Allowance per Year of Age", { default: 1, max: 100, step: 0.25 }),
      percentField("savePercent", "Share to Save", { default: 30, max: 100, step: 5 }),
      percentField("givePercent", "Share to Give", { default: 10, max: 100, step: 5, required: false }),
      percentField("interestPercent", "Interest on Savings", { default: 4, max: 20, step: 0.25, required: false }),
    ],
    calcResult: { label: "Weekly Allowance", format: "currency" },
    calcResults: [
      { key: "weeklyAllowance", label: "Weekly Allowance", format: "currency", highlight: true },
      { key: "monthlyAllowance", label: "Monthly Allowance", format: "currency" },
      { key: "yearlyAllowance", label: "Yearly Allowance", format: "currency" },
      { key: "weeklySave", label: "Weekly to Save", format: "currency" },
      { key: "weeklyGive", label: "Weekly to Give", format: "currency" },
      { key: "weeklySpend", label: "Weekly to Spend", format: "currency" },
      { key: "savingsBy18", label: "Savings by Age 18", format: "currency" },
    ],
    instructions:
      "A popular rule is $1 a week for each year of age — $8 a week at age 8 — rising each birthday. Splitting it into save, " +
      "give and spend jars teaches budgeting early; matching your child's savings or paying \"interest\" shows how money " +
      "grows.\n\n" +
      "Enter the age and amounts; the savings projection raises the allowance every year until 18.",
    examples:
      "Example: at 8, $1 per year of age is $8 a week — $2.40 to save, $0.80 to " +
      "give and $4.80 to spend. Saving that share every year with 4% interest builds $2,371.97 by 18.",
    assumptions:
      "Allowance rises each birthday; savings earn interest yearly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should allowance be tied to chores?",
        answer: "Families differ. Some pay a base allowance for learning money skills and extra for bigger jobs; others link it all to chores.",
      },
    ],
  },
];

// Budget Calculators (and its sub-categories) are created on first use, under
// Finance Calculators.
async function ensureCategory() {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  let parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_CATEGORY.slug } });
  if (!parent) {
    const finance = await prisma.toolCategory.findFirst({ where: { slug: { in: FINANCE_SLUGS } } });
    if (!finance) {
      throw new Error(
        `The "finance-calculators" category doesn't exist yet — run "npm run db:organize-categories -- --apply" first, ` +
          "then re-run this script."
      );
    }
    console.log(`Creating category "${PARENT_CATEGORY.name}" under "${finance.name}".`);
    parent = await prisma.toolCategory.create({
      data: { name: PARENT_CATEGORY.name, slug: PARENT_CATEGORY.slug, parentId: finance.id, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  console.log(`Creating sub-category "${CATEGORY.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
