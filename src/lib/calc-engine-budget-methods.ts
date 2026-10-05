/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 1 of 12 — Budgeting
 * Methods (8 tools), filed under Budget Calculators > Budgeting Methods &
 * Planning Calculators.
 *
 * Budget Calculators is a new Finance sub-category (created by these
 * scripts on first run, with 5 sub-categories). The user's 147-keyword list
 * was checked against every existing slug: 15 were already built (Home
 * Maintenance 1% = property-maintenance-cost; Home Renovation =
 * renovation-cost; Budget Variance and Quarterly Review = budget-variance;
 * Rent-to-Income; Debt Payment % = debt-to-income-ratio; Savings % =
 * savings-rate; Side Hustle = freelance-income; Freelance Tax Set-Aside =
 * self-employment-tax-estimator; six sinking funds = sinking-fund) and 48
 * were merged (see each engine's header). 84 new tools in 12 sub-batches:
 *  - budget-methods, budget-planning-tools           -> Budgeting Methods & Planning
 *  - budget-household-bills, budget-children,
 *    budget-family-care                              -> Household & Family Expense
 *  - budget-celebrations, budget-life-stages,
 *    budget-travel                                   -> Life Events & Travel Budget
 *  - budget-spending-analysis, budget-shopping-savings,
 *    budget-home-green-savings                       -> Money-Saving & Spending
 *  - budget-net-worth-col                            -> Net Worth & Cost of Living
 *
 *  - fiftyThirtyTwentyBudgetRule (incl. 70/20/10, 80/20, 60% Solution,
 *    essential vs discretionary): rule targets vs your actual spending.
 *  - zeroBasedBudget: every dollar assigned; amount left to assign.
 *  - envelopeBudgeting: cash per envelope per week/paycheck.
 *  - payYourselfFirstBudget: savings first, bills, what's left to spend.
 *  - monthlyHouseholdBudget (incl. single-income, annual planner, surplus
 *    or deficit, income-to-expense ratio).
 *  - biweeklyHouseholdBudget (incl. semi-monthly paychecks): bills per
 *    paycheck and the extra (third) paychecks.
 *  - dualIncomeHouseholdBudget: shared costs split in proportion to income.
 *  - irregularIncomeBudget: budget on the lowest month, buffer to build.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-methods-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. 50/30/20 Budget Rule Calculator -----------------------------------------------
export const fiftyThirtyTwentyBudgetRuleCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const raw = Math.round(safeNumber(values.rule, 1));
  const rule = [1, 2, 3, 4].includes(raw) ? raw : 1;
  const currentNeeds = pos(values.currentNeeds, 2800);
  const currentWants = pos(values.currentWants, 1400);

  // [needs/essentials, wants/flexible, savings] shares for each rule
  const shares = rule === 1 ? [50, 30, 20] : rule === 2 ? [70, 10, 20] : rule === 3 ? [80, 0, 20] : [60, 10, 30];
  const savings = income - currentNeeds - currentWants;

  return {
    needsTarget: round2((income * shares[0]) / 100),
    wantsTarget: round2((income * shares[1]) / 100),
    savingsTarget: round2((income * shares[2]) / 100),
    currentSavings: round2(savings),
    needsSharePercent: round2(income > 0 ? (currentNeeds / income) * 100 : 0),
    savingsGap: round2((income * shares[2]) / 100 - savings),
  };
};

// --- 2. Zero-Based Budget Calculator --------------------------------------------------
export const zeroBasedBudgetCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const items = [
    pos(values.housing, 1600),
    pos(values.transportation, 500),
    pos(values.food, 700),
    pos(values.utilities, 300),
    pos(values.insurance, 250),
    pos(values.debt, 400),
    pos(values.savings, 600),
    pos(values.other, 400),
  ];
  const assigned = items.reduce((s, v) => s + v, 0);

  return {
    totalAssigned: round2(assigned),
    leftToAssign: round2(income - assigned),
    percentAssigned: round2(income > 0 ? (assigned / income) * 100 : 0),
    savingsRate: round2(income > 0 ? (items[6] / income) * 100 : 0),
  };
};

// --- 3. Envelope Budgeting Calculator -------------------------------------------------
export const envelopeBudgetingCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const env = [
    pos(values.groceries, 600),
    pos(values.dining, 200),
    pos(values.gas, 200),
    pos(values.entertainment, 150),
    pos(values.personal, 100),
    pos(values.misc, 100),
  ];
  const monthly = env.reduce((s, v) => s + v, 0);

  return {
    monthlyCash: round2(monthly),
    weeklyCash: round2((monthly * 12) / 52),
    perBiweeklyPaycheck: round2((monthly * 12) / 26),
    groceriesPerWeek: round2((env[0] * 12) / 52),
    shareOfIncome: round2(income > 0 ? (monthly / income) * 100 : 0),
  };
};

// --- 4. Pay-Yourself-First Budget Calculator ------------------------------------------
export const payYourselfFirstBudgetCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const savingsRatePercent = Math.min(100, pos(values.savingsRatePercent, 20));
  const fixedBills = pos(values.fixedBills, 2500);
  const returnPercent = safeNumber(values.returnPercent, 5);
  const years = pos(values.years, 10);

  const save = (income * savingsRatePercent) / 100;
  const left = income - save - fixedBills;
  const g = Math.pow(1 + returnPercent / 100, 1 / 12);
  let fv = 0;
  for (let m = 0; m < Math.round(years * 12); m++) fv = (fv + save) * g;

  return {
    savedFirst: round2(save),
    leftAfterSavingsAndBills: round2(left),
    weeklySpendingMoney: round2((left * 12) / 52),
    yearlySavings: round2(save * 12),
    savingsAfterYears: round2(fv),
  };
};

// --- 5. Monthly Household Budget Calculator -------------------------------------------
export const monthlyHouseholdBudgetCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 6000);
  const otherIncome = pos(values.otherIncome, 0);
  const costs = [
    pos(values.housing, 1700),
    pos(values.utilities, 300),
    pos(values.food, 800),
    pos(values.transportation, 450),
    pos(values.insurance, 300),
    pos(values.debt, 400),
    pos(values.childcare, 0),
    pos(values.other, 600),
  ];
  const savings = pos(values.savings, 500);

  const totalIncome = income + otherIncome;
  const expenses = costs.reduce((s, v) => s + v, 0);
  const surplus = totalIncome - expenses - savings;

  return {
    totalIncome: round2(totalIncome),
    totalExpenses: round2(expenses),
    surplusOrDeficit: round2(surplus),
    yearlySurplusOrDeficit: round2(surplus * 12),
    incomeToExpenseRatio: round2(expenses > 0 ? totalIncome / expenses : 0),
    housingShare: round2(totalIncome > 0 ? (costs[0] / totalIncome) * 100 : 0),
    savingsRate: round2(totalIncome > 0 ? ((savings + Math.max(0, surplus)) / totalIncome) * 100 : 0),
  };
};

// --- 6. Biweekly Household Budget Calculator ------------------------------------------
export const biweeklyHouseholdBudgetCalculator: CustomCalculator = (values) => {
  const paycheck = pos(values.paycheck, 2200);
  const raw = Math.round(safeNumber(values.paychecksPerYear, 26));
  const perYear = raw === 24 ? 24 : 26;
  const monthlyBills = pos(values.monthlyBills, 3800);

  const billsPerCheck = (monthlyBills * 12) / perYear;
  const extra = perYear === 26 ? 2 : 0;
  // budget on two checks a month: the extra (third) checks are free money
  const leftPerCheckOnTwo = paycheck - monthlyBills / 2;

  return {
    monthlyIncomeEquivalent: round2((paycheck * perYear) / 12),
    billsPerPaycheck: round2(billsPerCheck),
    leftPerPaycheck: round2(paycheck - billsPerCheck),
    leftPerCheckIfBudgetingOnTwo: round2(leftPerCheckOnTwo),
    extraPaychecksPerYear: extra,
    extraPaycheckMoney: round2(extra * paycheck),
  };
};

// --- 7. Dual-Income Household Budget Calculator ---------------------------------------
export const dualIncomeHouseholdBudgetCalculator: CustomCalculator = (values) => {
  const incomeA = pos(values.incomeA, 6000);
  const incomeB = pos(values.incomeB, 4000);
  const sharedExpenses = pos(values.sharedExpenses, 5000);

  const total = incomeA + incomeB;
  const shareA = total > 0 ? incomeA / total : 0.5;
  const payA = sharedExpenses * shareA;
  const payB = sharedExpenses - payA;

  return {
    partnerAShare: round2(shareA * 100),
    partnerAPays: round2(payA),
    partnerBPays: round2(payB),
    partnerALeft: round2(incomeA - payA),
    partnerBLeft: round2(incomeB - payB),
    partnerBSavingsVsEvenSplit: round2(sharedExpenses / 2 - payB),
  };
};

// --- 8. Irregular Income Budget Calculator --------------------------------------------
export const irregularIncomeBudgetCalculator: CustomCalculator = (values) => {
  const lowestMonth = pos(values.lowestMonth, 3000);
  const averageMonth = pos(values.averageMonth, 4500);
  const essentials = pos(values.essentials, 3200);
  const bufferMonths = pos(values.bufferMonths, 2);

  const shortfall = Math.max(0, essentials - lowestMonth);
  const buffer = essentials * bufferMonths;
  const extra = averageMonth - essentials;

  return {
    baselineBudget: round2(Math.min(lowestMonth, essentials)),
    lowMonthShortfall: round2(shortfall),
    bufferTarget: round2(buffer),
    averageMonthSurplus: round2(extra),
    monthsToBuildBuffer: extra > 0 ? Math.ceil(buffer / extra) : 0,
  };
};

export const budgetMethodsCustomCalculators: Record<string, CustomCalculator> = {
  "50-30-20-budget-rule-calculator": fiftyThirtyTwentyBudgetRuleCalculator,
  "zero-based-budget-calculator": zeroBasedBudgetCalculator,
  "envelope-budgeting-calculator": envelopeBudgetingCalculator,
  "pay-yourself-first-budget-calculator": payYourselfFirstBudgetCalculator,
  "monthly-household-budget-calculator": monthlyHouseholdBudgetCalculator,
  "biweekly-household-budget-calculator": biweeklyHouseholdBudgetCalculator,
  "dual-income-household-budget-calculator": dualIncomeHouseholdBudgetCalculator,
  "irregular-income-budget-calculator": irregularIncomeBudgetCalculator,
};
