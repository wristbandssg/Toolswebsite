// One-time (but safe to re-run) batch setup script: creates the Budgeting Method tools
// (8) of the Budget Calculators expansion, filed under Budget Calculators >
// Budgeting Methods & Planning Calculators (both categories are created on first run).
// See src/lib/calc-engine-budget-methods.ts for the math and
// src/lib/calc-engine-budget-methods.ts for the full batch context.
//
// HOW TO RUN
//   npx tsx prisma/create-budget-methods-calculators.ts
// or
//   npm run db:create-budget-methods-calculators

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
    slug: "50-30-20-budget-rule-calculator",
    title: "50/30/20 Budget Rule Calculator",
    description: "Split your after-tax income with the 50/30/20 rule — or the 70/20/10, 80/20 or 60% Solution rule — and compare the targets with what you spend on needs and wants now.",
    metaTitle: "50/30/20 Budget Calculator — Needs, Wants & Savings",
    metaDescription: "Free 50/30/20 budget calculator. Split take-home pay into needs, wants and savings (or 70/20/10, 80/20, 60% rules) and see your savings gap.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      {
        key: "rule", label: "Budget Rule", type: "dropdown", required: true, default: 1,
        options: [
          { label: "50/30/20 (Needs / Wants / Savings)", value: 1 },
          { label: "70/20/10 (Living / Savings / Debt & Giving)", value: 2 },
          { label: "80/20 (Spending / Savings)", value: 3 },
          { label: "60% Solution (Committed / Fun / Savings)", value: 4 },
        ],
      },
      currencyField("currentNeeds", "What You Spend on Needs Now", { default: 2800, max: 10000000, step: 50 }),
      currencyField("currentWants", "What You Spend on Wants Now", { default: 1400, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Savings Target", format: "currency" },
    calcResults: [
      { key: "needsTarget", label: "Needs / Essentials Target", format: "currency" },
      { key: "wantsTarget", label: "Wants / Flexible Target", format: "currency" },
      { key: "savingsTarget", label: "Savings Target", format: "currency", highlight: true },
      { key: "currentSavings", label: "What You Save Now", format: "currency" },
      { key: "needsSharePercent", label: "Needs as % of Income Now", format: "percentage" },
      { key: "savingsGap", label: "Extra Savings Needed to Hit the Target", format: "currency" },
    ],
    instructions:
      "The 50/30/20 rule puts 50% of take-home pay toward needs (housing, utilities, groceries, insurance, minimum debt " +
      "payments), 30% toward wants (dining out, entertainment, travel) and 20% toward savings and extra debt payoff. " +
      "Separating essential from discretionary spending shows where to cut.\n\n" +
      "Other rules: 70/20/10 (70% living costs, 20% savings, 10% debt or giving), 80/20 (spend 80%, save 20%) and the 60% " +
      "Solution (60% committed expenses, 10% each to retirement, long-term savings, short-term savings and fun). For 70/20/10, " +
      "the second line is debt and giving.",
    examples:
      "Example: on $5,000 a month, 50/30/20 targets $2,500 for needs, $1,500 for wants and $1,000 for " +
      "savings. Spending $2,800 on needs (56% of income) and $1,400 on wants leaves " +
      "$800 — $200 short of the savings target.",
    assumptions:
      "Uses after-tax income; retirement contributions taken from your paycheck count toward savings. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if my needs are more than 50%?",
        answer: "Common in high-cost areas. Start with the savings target and trim wants first; over time, look at the biggest needs — housing, car, insurance — for savings.",
      },
    ],
  },
  {
    slug: "zero-based-budget-calculator",
    title: "Zero-Based Budget Calculator",
    description: "Build a zero-based budget by giving every dollar of income a job, and see how much is still left to assign until income minus spending and savings equals zero.",
    metaTitle: "Zero-Based Budget Calculator — Give Every Dollar a Job",
    metaDescription: "Free zero-based budget calculator. Assign every dollar of income to spending, debt and savings and see how much is left to assign.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      currencyField("housing", "Housing", { default: 1600, max: 1000000, step: 25 }),
      currencyField("transportation", "Transportation", { default: 500, max: 1000000, step: 25 }),
      currencyField("food", "Food", { default: 700, max: 1000000, step: 25 }),
      currencyField("utilities", "Utilities & Phone", { default: 300, max: 1000000, step: 25 }),
      currencyField("insurance", "Insurance", { default: 250, max: 1000000, step: 25 }),
      currencyField("debt", "Debt Payments", { default: 400, max: 1000000, step: 25 }),
      currencyField("savings", "Savings & Investing", { default: 600, max: 1000000, step: 25 }),
      currencyField("other", "Everything Else", { default: 400, max: 1000000, step: 25 }),
    ],
    calcResult: { label: "Left to Assign", format: "currency" },
    calcResults: [
      { key: "totalAssigned", label: "Total Assigned", format: "currency" },
      { key: "leftToAssign", label: "Left to Assign", format: "currency", highlight: true },
      { key: "percentAssigned", label: "Share of Income Assigned", format: "percentage" },
      { key: "savingsRate", label: "Savings Rate", format: "percentage" },
    ],
    instructions:
      "In a zero-based budget, income minus every planned expense, debt payment and savings goal equals zero — not because " +
      "you spend everything, but because every dollar is assigned on purpose, including to savings. Build it before the " +
      "month starts.\n\n" +
      "Keep adjusting categories until \"left to assign\" is zero. A negative number means you've planned more than you earn.",
    examples:
      "Example: with $5,000 of take-home pay, assigning $4,750 across housing, food, bills, debt and savings leaves " +
      "$250 to assign — 95% is planned. Putting that last $250 toward savings would finish " +
      "the budget.",
    assumptions:
      "Monthly amounts; spread yearly bills (insurance, gifts) into monthly categories. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Zero-based budget or 50/30/20?",
        answer: "50/30/20 sets broad targets; zero-based budgeting plans every dollar. Detail-oriented people often prefer zero-based, while 50/30/20 is quicker to keep up.",
      },
    ],
  },
  {
    slug: "envelope-budgeting-calculator",
    title: "Envelope Budgeting Calculator",
    description: "Set up cash envelopes for groceries, dining, gas and other variable spending, and see how much to put in each envelope per week or per paycheck.",
    metaTitle: "Envelope Budgeting Calculator — Cash per Week & Paycheck",
    metaDescription: "Free envelope budget calculator. Plan cash envelopes for variable spending and see the amount per week and per paycheck.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      currencyField("groceries", "Groceries Envelope (Monthly)", { default: 600, max: 100000, step: 10 }),
      currencyField("dining", "Dining Out Envelope", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("gas", "Gas Envelope", { default: 200, max: 100000, step: 10, required: false }),
      currencyField("entertainment", "Entertainment Envelope", { default: 150, max: 100000, step: 10, required: false }),
      currencyField("personal", "Personal Care Envelope", { default: 100, max: 100000, step: 10, required: false }),
      currencyField("misc", "Miscellaneous Envelope", { default: 100, max: 100000, step: 10, required: false }),
    ],
    calcResult: { label: "Cash per Week", format: "currency" },
    calcResults: [
      { key: "monthlyCash", label: "Total Monthly Envelope Cash", format: "currency" },
      { key: "weeklyCash", label: "Cash per Week", format: "currency", highlight: true },
      { key: "perBiweeklyPaycheck", label: "Cash per Biweekly Paycheck", format: "currency" },
      { key: "groceriesPerWeek", label: "Groceries per Week", format: "currency" },
      { key: "shareOfIncome", label: "Envelopes as % of Income", format: "percentage" },
    ],
    instructions:
      "With envelope budgeting, you put cash for each variable category in its own envelope (or a digital equivalent) at " +
      "the start of the period. When an envelope is empty, spending in that category stops until the next refill. Fixed " +
      "bills stay on autopay; envelopes are for spending that tends to creep.\n\n" +
      "Enter monthly amounts for each envelope.",
    examples:
      "Example: envelopes totaling $1,350 a month — 27% of a $5,000 take-home pay — mean withdrawing " +
      "$311.54 a week, or $623.08 each biweekly payday. Groceries alone get $138.46 a week.",
    assumptions:
      "Weekly and paycheck amounts are the yearly total spread evenly (52 weeks, 26 paychecks). " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Can I do envelope budgeting without cash?",
        answer: "Yes — many apps and banks let you create digital envelopes or sub-accounts, which works the same way without carrying cash.",
      },
    ],
  },
  {
    slug: "pay-yourself-first-budget-calculator",
    title: "Pay-Yourself-First Budget Calculator",
    description: "Set aside savings the moment you're paid, then cover bills and spend the rest guilt-free — see your weekly spending money and how the savings grow.",
    metaTitle: "Pay-Yourself-First Budget Calculator — Save First",
    metaDescription: "Free pay-yourself-first calculator. Save a set share of every paycheck first, see what's left to spend each week, and how savings grow.",
    calcInputs: [
      currencyField("income", "Monthly Take-Home Pay", { default: 5000, max: 10000000, step: 50 }),
      percentField("savingsRatePercent", "Savings Rate", { default: 20, max: 100, step: 1 }),
      currencyField("fixedBills", "Fixed Monthly Bills", { default: 2500, max: 10000000, step: 50 }),
      percentField("returnPercent", "Return on Savings", { default: 5, min: -10, max: 20, step: 0.25 }),
      numberField("years", "Years", { default: 10, min: 0, max: 50, step: 1 }),
    ],
    calcResult: { label: "Weekly Spending Money", format: "currency" },
    calcResults: [
      { key: "savedFirst", label: "Saved First Each Month", format: "currency" },
      { key: "leftAfterSavingsAndBills", label: "Left After Savings & Bills", format: "currency" },
      { key: "weeklySpendingMoney", label: "Weekly Spending Money", format: "currency", highlight: true },
      { key: "yearlySavings", label: "Saved per Year", format: "currency" },
      { key: "savingsAfterYears", label: "Savings After the Years", format: "currency" },
    ],
    instructions:
      "\"Pay yourself first\" means moving savings out automatically on payday — before bills or spending — so saving " +
      "never depends on what's left at the end of the month. Then pay fixed bills, and whatever remains is yours to spend.\n\n" +
      "Enter your pay, savings rate and fixed bills. If the weekly amount is too tight, lower the rate and raise it with " +
      "each pay increase.",
    examples:
      "Example: saving 20% of $5,000 puts $1,000 away each month. After $2,500 of bills, " +
      "$1,500 is left — $346.15 a week to spend. At 5%, the savings grow to " +
      "$154,992.06 in 10 years.",
    assumptions:
      "Savings deposited monthly and compounded monthly. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Where should paid-first savings go?",
        answer: "Usually an emergency fund first, then retirement accounts (at least enough for any employer match), then other goals.",
      },
    ],
  },
  {
    slug: "monthly-household-budget-calculator",
    title: "Monthly Household Budget Calculator",
    description: "Build a monthly household budget: total income and expenses, your surplus or deficit, the income-to-expense ratio, your housing share and savings rate.",
    metaTitle: "Monthly Household Budget Calculator — Surplus or Deficit",
    metaDescription: "Free household budget calculator. Add up income and expenses to see your monthly surplus or deficit, income-to-expense ratio and savings rate.",
    calcInputs: [
      currencyField("income", "Take-Home Pay (All Earners)", { default: 6000, max: 10000000, step: 50 }),
      currencyField("otherIncome", "Other Income", { default: 0, max: 10000000, step: 50, required: false }),
      currencyField("housing", "Rent or Mortgage", { default: 1700, max: 1000000, step: 25 }),
      currencyField("utilities", "Utilities & Internet", { default: 300, max: 100000, step: 10 }),
      currencyField("food", "Groceries & Dining", { default: 800, max: 100000, step: 25 }),
      currencyField("transportation", "Transportation", { default: 450, max: 100000, step: 25 }),
      currencyField("insurance", "Insurance", { default: 300, max: 100000, step: 10 }),
      currencyField("debt", "Debt Payments", { default: 400, max: 1000000, step: 25, required: false }),
      currencyField("childcare", "Childcare", { default: 0, max: 100000, step: 25, required: false }),
      currencyField("other", "Everything Else", { default: 600, max: 1000000, step: 25, required: false }),
      currencyField("savings", "Planned Savings", { default: 500, max: 1000000, step: 25, required: false }),
    ],
    calcResult: { label: "Surplus or Deficit", format: "currency" },
    calcResults: [
      { key: "totalIncome", label: "Total Income", format: "currency" },
      { key: "totalExpenses", label: "Total Expenses", format: "currency" },
      { key: "surplusOrDeficit", label: "Surplus or Deficit", format: "currency", highlight: true },
      { key: "yearlySurplusOrDeficit", label: "Yearly Surplus or Deficit", format: "currency" },
      { key: "incomeToExpenseRatio", label: "Income-to-Expense Ratio", format: "number" },
      { key: "housingShare", label: "Housing as % of Income", format: "percentage" },
      { key: "savingsRate", label: "Savings Rate (Incl. Surplus)", format: "percentage" },
    ],
    instructions:
      "List your household's take-home income and monthly spending. Spread yearly or irregular costs (car registration, " +
      "gifts, annual subscriptions) across 12 months. A negative surplus is a deficit: you're spending more than you earn " +
      "and need to cut costs or raise income.\n\n" +
      "An income-to-expense ratio above 1 means income covers expenses; aim for 1.2 or more. Housing is often kept under " +
      "30% of income. Multiply by 12 for an annual budget.",
    examples:
      "Example: $6,000 of income against $4,550 of expenses and $500 of planned savings leaves a " +
      "$950 surplus — $11,400 a year. The income-to-expense ratio is 1.32, " +
      "housing takes 28.33% and you save 24.17% of income.",
    assumptions:
      "Monthly figures; the savings rate counts planned savings plus any surplus. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "What if I have a deficit?",
        answer: "Look first at the largest flexible costs — food, transportation, subscriptions — and any high-interest debt. Even small cuts across several categories can close the gap.",
      },
    ],
  },
  {
    slug: "biweekly-household-budget-calculator",
    title: "Biweekly Household Budget Calculator",
    description: "Budget around biweekly or semi-monthly paychecks: how much of each check goes to bills, what's left, and how to use the two extra paychecks a year.",
    metaTitle: "Biweekly Budget Calculator — Bills per Paycheck",
    metaDescription: "Free biweekly budget calculator. See how much of each paycheck covers bills, what's left, and the extra paychecks a biweekly schedule gives you.",
    calcInputs: [
      currencyField("paycheck", "Take-Home Pay per Check", { default: 2200, max: 10000000, step: 25 }),
      {
        key: "paychecksPerYear", label: "Pay Schedule", type: "dropdown", required: true, default: 26,
        options: [
          { label: "Biweekly (26 Paychecks)", value: 26 },
          { label: "Semi-Monthly (24 Paychecks)", value: 24 },
        ],
      },
      currencyField("monthlyBills", "Monthly Bills & Expenses", { default: 3800, max: 10000000, step: 25 }),
    ],
    calcResult: { label: "Left per Paycheck", format: "currency" },
    calcResults: [
      { key: "monthlyIncomeEquivalent", label: "Average Monthly Income", format: "currency" },
      { key: "billsPerPaycheck", label: "Bills to Set Aside per Paycheck", format: "currency" },
      { key: "leftPerPaycheck", label: "Left per Paycheck", format: "currency", highlight: true },
      { key: "leftPerCheckIfBudgetingOnTwo", label: "Left per Check If You Budget on Two Checks a Month", format: "currency" },
      { key: "extraPaychecksPerYear", label: "Extra (Third) Paychecks per Year", format: "number" },
      { key: "extraPaycheckMoney", label: "Money From Extra Paychecks", format: "currency" },
    ],
    instructions:
      "Biweekly pay means 26 checks a year — two months each year have three paydays. Many people budget monthly bills on " +
      "two checks a month and treat the third checks as a bonus for savings or debt. Semi-monthly pay (the 15th and last " +
      "day) gives exactly 24 even checks.\n\n" +
      "Setting aside the same share of bills from every check smooths out months with big bills.",
    examples:
      "Example: $2,200 biweekly averages $4,766.67 a month. Setting aside $1,753.85 from each check " +
      "for $3,800 of monthly bills leaves $446.15. Budgeting on two checks a month instead leaves $300 " +
      "per check, plus 2 extra checks worth $4,400 a year.",
    assumptions:
      "Same take-home pay every check. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Which months have three paychecks?",
        answer: "It depends on your first payday of the year — check a calendar: any month with three of your paydays is a three-paycheck month. There are usually two a year.",
      },
    ],
  },
  {
    slug: "dual-income-household-budget-calculator",
    title: "Dual-Income Household Budget Calculator",
    description: "Split shared household costs fairly between two earners in proportion to income, and see what each partner pays and keeps — compared with a 50/50 split.",
    metaTitle: "Dual-Income Budget Calculator — Split Bills by Income",
    metaDescription: "Free dual-income budget calculator. Split shared expenses in proportion to each partner's income and compare with a 50/50 split.",
    calcInputs: [
      currencyField("incomeA", "Partner A Take-Home Pay", { default: 6000, max: 10000000, step: 50 }),
      currencyField("incomeB", "Partner B Take-Home Pay", { default: 4000, max: 10000000, step: 50 }),
      currencyField("sharedExpenses", "Shared Monthly Expenses", { default: 5000, max: 10000000, step: 50 }),
    ],
    calcResult: { label: "Partner A Pays", format: "currency" },
    calcResults: [
      { key: "partnerAShare", label: "Partner A's Share", format: "percentage" },
      { key: "partnerAPays", label: "Partner A Pays", format: "currency", highlight: true },
      { key: "partnerBPays", label: "Partner B Pays", format: "currency" },
      { key: "partnerALeft", label: "Partner A Keeps", format: "currency" },
      { key: "partnerBLeft", label: "Partner B Keeps", format: "currency" },
      { key: "partnerBSavingsVsEvenSplit", label: "Partner B Pays Less Than a 50/50 Split", format: "currency" },
    ],
    instructions:
      "Many couples with different incomes split shared bills in proportion to income, so each contributes the same share " +
      "of their pay and keeps the same share for personal spending and savings. Others split 50/50 or pool everything — " +
      "pick what feels fair to both of you.\n\n" +
      "Enter each partner's take-home pay and the shared expenses (housing, utilities, groceries, joint savings).",
    examples:
      "Example: Partner A earns $6,000 and Partner B $4,000, so A covers 60% of $5,000 of shared " +
      "costs: $3,000, with B paying $2,000. Each keeps half their pay — $3,000 and $2,000.",
    assumptions:
      "Take-home pay after taxes and individual retirement contributions. " + GENERAL_DISCLAIMER,
    faq: [
      {
        question: "Should couples combine finances?",
        answer: "There's no single right answer. Joint accounts simplify bills; separate accounts keep independence. Many use a joint account for shared costs and individual accounts for the rest.",
      },
    ],
  },
  {
    slug: "irregular-income-budget-calculator",
    title: "Irregular Income Budget Calculator",
    description: "Budget on a variable income: base your plan on your lowest month, see any shortfall for essentials, and how long it takes to build a cash buffer from better months.",
    metaTitle: "Irregular Income Budget Calculator — Variable Pay",
    metaDescription: "Free irregular income budget calculator. Budget on your lowest month, find the essential-cost shortfall, and plan a buffer from good months.",
    calcInputs: [
      currencyField("lowestMonth", "Lowest Monthly Income (Past Year)", { default: 3000, max: 10000000, step: 50 }),
      currencyField("averageMonth", "Average Monthly Income", { default: 4500, max: 10000000, step: 50 }),
      currencyField("essentials", "Essential Monthly Expenses", { default: 3200, max: 10000000, step: 50 }),
      numberField("bufferMonths", "Buffer Target (Months of Essentials)", { default: 2, min: 0, max: 24, step: 1 }),
    ],
    calcResult: { label: "Months to Build the Buffer", format: "number" },
    calcResults: [
      { key: "baselineBudget", label: "Baseline Monthly Budget", format: "currency" },
      { key: "lowMonthShortfall", label: "Shortfall in a Low Month", format: "currency" },
      { key: "bufferTarget", label: "Buffer Target", format: "currency" },
      { key: "averageMonthSurplus", label: "Surplus in an Average Month", format: "currency" },
      { key: "monthsToBuildBuffer", label: "Months to Build the Buffer", format: "number", highlight: true },
    ],
    instructions:
      "With freelance, commission, seasonal or gig income, budget on what you can count on — your lowest recent month — " +
      "and cover essentials first. Put money from better months into a buffer (a holding account), then pay yourself a " +
      "steady \"salary\" from it each month.\n\n" +
      "Once the buffer covers a couple of months of essentials, low months stop being a crisis.",
    examples:
      "Example: with income between $3,000 and an average of $4,500, essentials of $3,200 leave a " +
      "$200 gap in a low month. Saving the $1,300 surplus from average months builds a " +
      "$6,400 buffer in about 5 months.",
    assumptions:
      "Set aside estimated taxes before budgeting if you're self-employed (see the self-employment tax estimator). " +
      GENERAL_DISCLAIMER,
    faq: [
      {
        question: "How big should my buffer be?",
        answer: "One month of expenses is a start; three to six months suits very uneven income, on top of a separate emergency fund.",
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
