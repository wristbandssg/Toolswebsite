/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 2 of 12 — Planning
 * Tools (8 tools), filed under Budget Calculators > Budgeting Methods &
 * Planning Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - weeklySpendingAllowance (incl. fun money allowance): what's left after
 *    bills and savings, per week/day and per person.
 *  - billDueDatePlanner (incl. cash flow calendar, autopay planner): bills
 *    due before each payday vs the paycheck, amount to move to balance.
 *  - budgetPercentage (incl. transportation, food, healthcare,
 *    entertainment, clothing, personal care, education, insurance,
 *    miscellaneous, cleaning, grooming, hobby, book & media shares).
 *  - financialGoalPrioritizer: employer match first, then high-interest
 *    debt, then the emergency fund, then the next goal — months for each.
 *  - windfallAllocationPlanner (incl. tax refund, bonus): fun share, then
 *    debt, emergency fund, long-term savings.
 *  - noSpendMonthChallenge: savings from cutting discretionary spending.
 *  - fiftyTwoWeekSavingsChallenge: deposits rising each week.
 *  - kidsAllowance: $X per year of age per week, save/give/spend split,
 *    savings by 18.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-planning-tools-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Weekly Spending Allowance Calculator ------------------------------------------
export const weeklySpendingAllowanceCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const fixedBills = pos(values.fixedBills, 2800);
  const savings = pos(values.savings, 700);
  const funSharePercent = Math.min(100, pos(values.funSharePercent, 30));
  const people = Math.max(1, Math.round(pos(values.people, 2)));

  const left = income - fixedBills - savings;
  const weekly = (left * 12) / 52;
  const fun = (Math.max(0, weekly) * funSharePercent) / 100;

  return {
    leftEachMonth: round2(left),
    weeklyAllowance: round2(weekly),
    dailyAllowance: round2((left * 12) / 365),
    funMoneyPerPersonPerWeek: round2(fun / people),
    weeklyForGroceriesAndGas: round2(Math.max(0, weekly) - fun),
  };
};

// --- 2. Bill Due Date Planner Calculator ----------------------------------------------
export const billDueDatePlannerCalculator: CustomCalculator = (values) => {
  const firstPaycheck = pos(values.firstPaycheck, 2500);
  const secondPaycheck = pos(values.secondPaycheck, 2500);
  const billsBeforeSecond = pos(values.billsBeforeSecond, 2600);
  const billsAfterSecond = pos(values.billsAfterSecond, 1100);
  const startingBalance = pos(values.startingBalance, 300);

  const afterFirst = startingBalance + firstPaycheck - billsBeforeSecond;
  const afterSecond = afterFirst + secondPaycheck - billsAfterSecond;
  // moving bills from the busy half to the light half evens the two halves out
  const toMove = (billsBeforeSecond - firstPaycheck - (billsAfterSecond - secondPaycheck)) / 2;

  return {
    leftAfterFirstHalf: round2(afterFirst),
    leftAtMonthEnd: round2(afterSecond),
    billsToMoveToSecondHalf: round2(Math.max(0, toMove)),
    lowestBalance: round2(Math.min(afterFirst, afterSecond)),
    totalMonthlyBills: round2(billsBeforeSecond + billsAfterSecond),
  };
};

// --- 3. Budget Percentage Calculator ---------------------------------------------------
export const budgetPercentageCalculator: CustomCalculator = (values) => {
  const income = pos(values.income, 5000);
  const cats: [string, number][] = [
    ["housing", pos(values.housing, 1500)],
    ["transportation", pos(values.transportation, 600)],
    ["food", pos(values.food, 700)],
    ["healthcare", pos(values.healthcare, 300)],
    ["insurance", pos(values.insurance, 250)],
    ["entertainment", pos(values.entertainment, 200)],
    ["clothing", pos(values.clothing, 150)],
    ["personalCare", pos(values.personalCare, 100)],
    ["education", pos(values.education, 100)],
    ["misc", pos(values.misc, 200)],
  ];
  const pct = (v: number) => round2(income > 0 ? (v / income) * 100 : 0);
  const total = cats.reduce((s, [, v]) => s + v, 0);
  const out: Record<string, number> = {};
  for (const [k, v] of cats) out[`${k}Percent`] = pct(v);
  out.totalSpendingPercent = pct(total);
  out.leftForSavingsAndDebt = round2(income - total);
  return out;
};

// --- 4. Financial Goal Prioritizer Calculator -----------------------------------------
export const financialGoalPrioritizerCalculator: CustomCalculator = (values) => {
  const monthlyAvailable = pos(values.monthlyAvailable, 1000);
  const matchGap = pos(values.matchGap, 200);
  const debtBalance = pos(values.debtBalance, 6000);
  const debtRatePercent = pos(values.debtRatePercent, 22);
  const emergencyTarget = pos(values.emergencyTarget, 15000);
  const emergencySaved = pos(values.emergencySaved, 3000);
  const nextGoal = pos(values.nextGoal, 30000);

  const toMatch = Math.min(monthlyAvailable, matchGap);
  const rest = monthlyAvailable - toMatch;
  const i = debtRatePercent / 100 / 12;
  let debt = debtBalance;
  let m = 0;
  let debtMonths = 0;
  let interest = 0;
  while (debt > 0.005 && m < 600) {
    const charge = debt * i;
    interest += charge;
    debt = debt + charge - rest;
    m++;
    if (rest <= debtBalance * i) break; // payment can't cover interest
  }
  debtMonths = debt <= 0.005 ? m : 600;
  const efGap = Math.max(0, emergencyTarget - emergencySaved);
  const efMonths = rest > 0 ? Math.ceil(efGap / rest) : 600;
  const goalMonths = rest > 0 ? Math.ceil(nextGoal / rest) : 600;

  return {
    toEmployerMatch: round2(toMatch),
    leftForGoals: round2(rest),
    monthsToPayOffDebt: debtMonths,
    debtInterestPaid: round2(debtMonths < 600 ? interest : 0),
    monthsToFillEmergencyFund: efMonths,
    monthsToNextGoal: goalMonths,
    totalMonthsForAll: Math.min(1800, debtMonths + efMonths + goalMonths),
  };
};

// --- 5. Windfall Allocation Planner Calculator -----------------------------------------
export const windfallAllocationPlannerCalculator: CustomCalculator = (values) => {
  const amount = pos(values.amount, 5000);
  const funPercent = Math.min(100, pos(values.funPercent, 10));
  const highInterestDebt = pos(values.highInterestDebt, 3000);
  const debtRatePercent = pos(values.debtRatePercent, 22);
  const emergencyGap = pos(values.emergencyGap, 1000);

  const fun = (amount * funPercent) / 100;
  let rest = amount - fun;
  const toDebt = Math.min(rest, highInterestDebt);
  rest -= toDebt;
  const toEmergency = Math.min(rest, emergencyGap);
  rest -= toEmergency;

  return {
    funMoney: round2(fun),
    toHighInterestDebt: round2(toDebt),
    toEmergencyFund: round2(toEmergency),
    toLongTermSavings: round2(rest),
    yearlyInterestSaved: round2((toDebt * debtRatePercent) / 100),
  };
};

// --- 6. No-Spend Month Challenge Calculator --------------------------------------------
export const noSpendMonthChallengeCalculator: CustomCalculator = (values) => {
  const dailyDiscretionary = pos(values.dailyDiscretionary, 35);
  const days = pos(values.days, 30);
  const challengesPerYear = pos(values.challengesPerYear, 2);
  const returnPercent = safeNumber(values.returnPercent, 7);
  const years = pos(values.years, 10);

  const saved = dailyDiscretionary * days;
  const yearly = saved * challengesPerYear;
  let fv = 0;
  for (let y = 0; y < Math.round(years); y++) fv = (fv + yearly) * (1 + returnPercent / 100);

  return {
    savedPerChallenge: round2(saved),
    savedPerYear: round2(yearly),
    valueIfInvested: round2(fv),
  };
};

// --- 7. 52-Week Savings Challenge Calculator -------------------------------------------
export const fiftyTwoWeekSavingsChallengeCalculator: CustomCalculator = (values) => {
  const startAmount = pos(values.startAmount, 1);
  const weeklyIncrease = pos(values.weeklyIncrease, 1);
  const weeks = Math.max(1, Math.round(pos(values.weeks, 52)));
  const apyPercent = pos(values.apyPercent, 4);

  const g = Math.pow(1 + apyPercent / 100, 1 / 52);
  let total = 0;
  let withInterest = 0;
  for (let k = 0; k < weeks; k++) {
    const dep = startAmount + weeklyIncrease * k;
    total += dep;
    withInterest = (withInterest + dep) * g;
  }

  return {
    totalSaved: round2(total),
    firstDeposit: round2(startAmount),
    lastDeposit: round2(startAmount + weeklyIncrease * (weeks - 1)),
    averagePerWeek: round2(total / weeks),
    totalWithInterest: round2(withInterest),
  };
};

// --- 8. Kids Allowance Calculator ------------------------------------------------------
export const kidsAllowanceCalculator: CustomCalculator = (values) => {
  const age = Math.max(0, Math.round(pos(values.age, 8)));
  const perYearOfAge = pos(values.perYearOfAge, 1);
  const savePercent = Math.min(100, pos(values.savePercent, 30));
  const givePercent = Math.min(100 - savePercent, pos(values.givePercent, 10));
  const interestPercent = pos(values.interestPercent, 4);

  const weekly = age * perYearOfAge;
  let saved = 0;
  for (let a = age; a < 18; a++) {
    saved = (saved + ((a * perYearOfAge * 52 * savePercent) / 100)) * (1 + interestPercent / 100);
  }

  return {
    weeklyAllowance: round2(weekly),
    monthlyAllowance: round2((weekly * 52) / 12),
    yearlyAllowance: round2(weekly * 52),
    weeklySave: round2((weekly * savePercent) / 100),
    weeklyGive: round2((weekly * givePercent) / 100),
    weeklySpend: round2((weekly * (100 - savePercent - givePercent)) / 100),
    savingsBy18: round2(saved),
  };
};

export const budgetPlanningToolsCustomCalculators: Record<string, CustomCalculator> = {
  "weekly-spending-allowance-calculator": weeklySpendingAllowanceCalculator,
  "bill-due-date-planner-calculator": billDueDatePlannerCalculator,
  "budget-percentage-calculator": budgetPercentageCalculator,
  "financial-goal-prioritizer-calculator": financialGoalPrioritizerCalculator,
  "windfall-allocation-planner-calculator": windfallAllocationPlannerCalculator,
  "no-spend-month-challenge-calculator": noSpendMonthChallengeCalculator,
  "52-week-savings-challenge-calculator": fiftyTwoWeekSavingsChallengeCalculator,
  "kids-allowance-calculator": kidsAllowanceCalculator,
};
