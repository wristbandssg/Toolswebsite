/**
 * Batch: "Savings Calculators" sub-batch F (Goal Planning & Tracking, 6
 * tools). Part of the Savings Calculators build-out — see
 * calc-engine-savings-core.ts for the full list of 6 sub-batches. Filed
 * under Finance Calculators > Savings Calculators.
 *
 * All six answer a different question about the same kind of goal, and
 * none repeats savings-goal-calculator (the monthly deposit to reach a goal):
 *  - savingsContributionCalculator: the deposit needed at ANY frequency —
 *    weekly, every two weeks, monthly, quarterly or yearly.
 *  - savingsTimeCalculator: HOW LONG it takes to reach a target.
 *  - savingsTargetDateCalculator: whether you'll hit a target BY a set
 *    date — projected surplus or shortfall, and the fix if short.
 *  - savingsGoalProgressCalculator: a progress check part-way through —
 *    % done vs % of time gone, ahead/behind, and the new monthly amount.
 *  - savingsGoalContributionCalculator: splitting one monthly budget across
 *    up to three goals, each with its own deadline.
 *  - savingsGoalTimelineCalculator: WHEN you pass 25%, 50%, 75% and 100%.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-goal-planning-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Future value of `pmt` deposited at the END of each of `n` periods at
// periodic rate `i`.
function fvAnnuity(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (Math.pow(1 + i, n) - 1)) / i;
}

// Longest wait any "months to" result reports: 100 years.
const MAX_MONTHS = 1200;

// Whole months until `current` plus `deposit` a month at monthly rate `i`
// first reaches `target` (0 if already there, MAX_MONTHS if never).
function monthsToReach(target: number, current: number, deposit: number, i: number): number {
  if (current >= target) return 0;
  let n: number;
  if (i === 0) {
    if (deposit <= 0) return MAX_MONTHS;
    n = (target - current) / deposit;
  } else {
    // Solve current·(1+i)^n + deposit·((1+i)^n − 1)/i = target for n.
    const numerator = target * i + deposit;
    const denominator = current * i + deposit;
    if (denominator <= 0) return MAX_MONTHS;
    n = Math.log(numerator / denominator) / Math.log(1 + i);
  }
  // Guard against floating-point noise pushing an exact month up by one.
  return Math.min(MAX_MONTHS, Math.ceil(n - 1e-9));
}

// --- 1. Savings Contribution Calculator (any deposit frequency) ------------
export const savingsContributionCalculator: CustomCalculator = (values) => {
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 20000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 2000));
  const years = Math.max(0, safeNumber(values.years, 4));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const depositsPerYear = Math.max(1, safeNumber(values.depositsPerYear, 26));

  const i = Math.pow(1 + apyPercent / 100, 1 / depositsPerYear) - 1;
  const n = Math.round(years * depositsPerYear);
  const grown = currentSavings * Math.pow(1 + i, n);
  const deposit = n > 0 ? Math.max(0, (targetAmount - grown) / fvAnnuity(1, i, n)) : 0;
  const finalBalance = deposit > 0 ? targetAmount : grown;

  return {
    depositPerPeriod: round2(deposit),
    numberOfDeposits: n,
    totalDeposits: round2(deposit * n),
    interestEarned: round2(finalBalance - currentSavings - deposit * n),
  };
};

// --- 2. Savings Time Calculator (how long to reach a target) ---------------
export const savingsTimeCalculator: CustomCalculator = (values) => {
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 15000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 3000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 400));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));

  const i = annualRatePercent / 100 / 12;
  const months = monthsToReach(targetAmount, currentSavings, monthlyDeposit, i);
  const balance = currentSavings * Math.pow(1 + i, months) + fvAnnuity(monthlyDeposit, i, months);

  return {
    // 1200 means 100 years or more.
    monthsNeeded: months,
    yearsNeeded: round2(months / 12),
    totalDeposited: round2(currentSavings + monthlyDeposit * months),
    balanceWhenReached: round2(balance),
  };
};

// --- 3. Savings Target Date Calculator (on track by a deadline?) -----------
export const savingsTargetDateCalculator: CustomCalculator = (values) => {
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 12000));
  const monthsUntilDate = Math.max(1, Math.round(safeNumber(values.monthsUntilDate, 18)));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 2500));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 450));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));

  const i = annualRatePercent / 100 / 12;
  const factor = fvAnnuity(1, i, monthsUntilDate);
  const projected = currentSavings * Math.pow(1 + i, monthsUntilDate) + monthlyDeposit * factor;
  const gap = projected - targetAmount;
  const months = monthsToReach(targetAmount, currentSavings, monthlyDeposit, i);

  return {
    projectedBalanceOnDate: round2(projected),
    surplusOrShortfall: round2(gap),
    extraMonthlyNeeded: round2(gap < 0 ? -gap / factor : 0),
    // Positive = reached this many months early; negative = months late.
    monthsEarlyOrLate: monthsUntilDate - months,
  };
};

// --- 4. Savings Goal Progress Calculator ------------------------------------
export const savingsGoalProgressCalculator: CustomCalculator = (values) => {
  const goalAmount = Math.max(0, safeNumber(values.goalAmount, 10000));
  const savedSoFar = Math.max(0, safeNumber(values.savedSoFar, 3800));
  const monthsElapsed = Math.max(0, Math.round(safeNumber(values.monthsElapsed, 8)));
  const totalMonthsPlanned = Math.max(1, Math.round(safeNumber(values.totalMonthsPlanned, 20)));

  const monthsLeft = Math.max(0, totalMonthsPlanned - monthsElapsed);
  // Straight-line plan: an equal share of the goal each month.
  const plannedByNow = (goalAmount * Math.min(monthsElapsed, totalMonthsPlanned)) / totalMonthsPlanned;
  const remaining = Math.max(0, goalAmount - savedSoFar);

  return {
    percentComplete: goalAmount > 0 ? round2(Math.min(100, (savedSoFar / goalAmount) * 100)) : 0,
    percentOfTimeElapsed: round2(Math.min(100, (monthsElapsed / totalMonthsPlanned) * 100)),
    aheadOrBehindPlan: round2(savedSoFar - plannedByNow),
    monthlyNeededFromNow: monthsLeft > 0 ? round2(remaining / monthsLeft) : round2(remaining),
    stillToSave: round2(remaining),
  };
};

// --- 5. Savings Goal Contribution Calculator (split across 3 goals) --------
export const savingsGoalContributionCalculator: CustomCalculator = (values) => {
  const monthlyBudget = Math.max(0, safeNumber(values.monthlyBudget, 900));
  const need = (goal: number, saved: number, months: number) =>
    Math.max(0, goal - saved) / Math.max(1, Math.round(months));
  const goal1 = need(Math.max(0, safeNumber(values.goal1Amount, 3000)), Math.max(0, safeNumber(values.goal1Saved, 500)), safeNumber(values.goal1Months, 10));
  const goal2 = need(Math.max(0, safeNumber(values.goal2Amount, 6000)), Math.max(0, safeNumber(values.goal2Saved, 1000)), safeNumber(values.goal2Months, 24));
  const goal3 = need(Math.max(0, safeNumber(values.goal3Amount, 1500)), Math.max(0, safeNumber(values.goal3Saved, 0)), safeNumber(values.goal3Months, 6));
  const total = goal1 + goal2 + goal3;

  return {
    goal1Monthly: round2(goal1),
    goal2Monthly: round2(goal2),
    goal3Monthly: round2(goal3),
    totalMonthlyNeeded: round2(total),
    budgetLeftOverOrShort: round2(monthlyBudget - total),
  };
};

// --- 6. Savings Goal Timeline Calculator (25/50/75/100% milestones) --------
export const savingsGoalTimelineCalculator: CustomCalculator = (values) => {
  const goalAmount = Math.max(0, safeNumber(values.goalAmount, 20000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 1000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 500));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));

  const i = Math.pow(1 + apyPercent / 100, 1 / 12) - 1;
  const at = (share: number) => monthsToReach(goalAmount * share, currentSavings, monthlyDeposit, i);

  return {
    // Each is months from now; 0 = already passed, 1200 = 100+ years.
    monthsTo25Percent: at(0.25),
    monthsTo50Percent: at(0.5),
    monthsTo75Percent: at(0.75),
    monthsTo100Percent: at(1),
  };
};

export const savingsGoalPlanningCustomCalculators: Record<string, CustomCalculator> = {
  "savings-contribution-calculator": savingsContributionCalculator,
  "savings-time-calculator": savingsTimeCalculator,
  "savings-target-date-calculator": savingsTargetDateCalculator,
  "savings-goal-progress-calculator": savingsGoalProgressCalculator,
  "savings-goal-contribution-calculator": savingsGoalContributionCalculator,
  "savings-goal-timeline-calculator": savingsGoalTimelineCalculator,
};
