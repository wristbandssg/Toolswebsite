/**
 * Batch: "Retirement Calculators" sub-batch A (Planning & Goals, 10 tools).
 * Part of the Retirement Calculators tool-list build-out — 76 tools in the
 * source list, 8 skipped as exact-slug duplicates (retirement-calculator,
 * 401k-calculator, pension-calculator, social-security-calculator,
 * retirement-withdrawal-calculator, ira-calculator, roth-ira-calculator —
 * all in calc-engine-finance-retirement.ts — and retirement-savings-goal-
 * calculator in calc-engine-savings-goals.ts), 68 built across 7 sub-
 * batches, all filed under Finance Calculators > Retirement Calculators
 * (retirement-calculators):
 *  - calc-engine-retirement-planning.ts (this file)
 *  - calc-engine-retirement-income.ts
 *  - calc-engine-retirement-tax-ira.ts
 *  - calc-engine-retirement-workplace-plans.ts
 *  - calc-engine-retirement-pension-social-security.ts
 *  - calc-engine-retirement-fire-timing.ts
 *  - calc-engine-retirement-portfolio.ts
 *
 * Near-namesakes, and how each is deliberately different (none repeats
 * retirement-calculator, which projects a flat monthly contribution, or
 * retirement-savings-goal-calculator, which sizes a nest egg with a
 * withdrawal rate):
 *  - retirementSavingsCalculator: saving a % of a salary that RISES each
 *    year; result also in today's money and as a multiple of final salary.
 *  - retirementAgeCalculator: the EARLIEST age your savings cover your
 *    spending (inflated) at a chosen withdrawal rate.
 *  - retirementGoalCalculator: age-based savings BENCHMARKS as multiples of
 *    salary (1x at 30 ... 10x at 67) — where you should be by now.
 *  - retirementReadinessCalculator: a readiness SCORE — projected income
 *    from savings + Social Security/pension as a % of the income you want.
 *  - retirementContributionCalculator: your total retirement saving rate
 *    (you + employer) vs a 15% target, and the extra needed to hit it.
 *  - retirementGapCalculator: a static monthly income gap at retirement —
 *    what guaranteed income and savings cover, and the lump sum to close it.
 *  - retirementNestEggCalculator: the nest egg sized by drawing an
 *    inflation-rising income for a set number of years (growing annuity),
 *    compared with the 4% rule's figure.
 *  - retirementFutureValueCalculator: a balance + yearly contributions at
 *    retirement, in future AND today's dollars.
 *  - retirementMonthlySavingsCalculator: the monthly saving to reach a
 *    target, and the extra it costs to start 5 or 10 years later.
 *  - retirementLumpSumCalculator: a one-off sum invested now — its value at
 *    retirement and the monthly income it pays for a set number of years.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-planning-calculators.ts for the tool
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

// Level monthly deposit that grows `current` plus the deposits to `goal`
// after `n` months at monthly rate `i` (0 if `current` alone gets there).
function monthlyNeeded(goal: number, current: number, i: number, n: number): number {
  if (n <= 0) return Math.max(0, goal - current);
  return Math.max(0, (goal - current * Math.pow(1 + i, n)) / fvAnnuity(1, i, n));
}

// --- 1. Retirement Savings Calculator (% of a rising salary) --------------
export const retirementSavingsCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, Math.round(safeNumber(values.currentAge, 35)));
  const retirementAge = Math.max(currentAge, Math.round(safeNumber(values.retirementAge, 67)));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 50000));
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 70000));
  const savingsRatePercent = Math.max(0, safeNumber(values.savingsRatePercent, 12));
  const salaryGrowthPercent = Math.max(0, safeNumber(values.salaryGrowthPercent, 3));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const years = retirementAge - currentAge;
  const i = annualReturnPercent / 100 / 12;
  let balance = currentSavings;
  let contributed = 0;
  let salary = annualSalary;
  for (let y = 0; y < years; y++) {
    if (y > 0) salary *= 1 + salaryGrowthPercent / 100;
    const monthly = (salary * savingsRatePercent) / 100 / 12;
    for (let m = 0; m < 12; m++) balance = balance * (1 + i) + monthly;
    contributed += monthly * 12;
  }
  const todaysMoney = balance / Math.pow(1 + inflationPercent / 100, years);

  return {
    projectedSavings: round2(balance),
    projectedSavingsTodaysMoney: round2(todaysMoney),
    totalContributed: round2(contributed),
    finalSalary: round2(salary),
    multipleOfFinalSalary: salary > 0 ? round2(balance / salary) : 0,
  };
};

// --- 2. Retirement Age Calculator (earliest age savings cover spending) ---
export const retirementAgeCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, Math.round(safeNumber(values.currentAge, 40)));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 150000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 1500));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const annualSpendingToday = Math.max(0, safeNumber(values.annualSpendingToday, 50000));
  const otherIncomeToday = Math.max(0, safeNumber(values.otherIncomeToday, 20000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const i = annualReturnPercent / 100 / 12;
  const gapToday = Math.max(0, annualSpendingToday - otherIncomeToday);
  let balance = currentSavings;
  let years = 0;
  const needAt = (y: number) => (gapToday * Math.pow(1 + inflationPercent / 100, y)) / (withdrawalRatePercent / 100);
  // Checks each birthday up to age 100 (0 years = you could retire now).
  while (balance < needAt(years) && currentAge + years < 100) {
    for (let m = 0; m < 12; m++) balance = balance * (1 + i) + monthlyContribution;
    years++;
  }
  const reached = balance >= needAt(years);

  return {
    // 0 means not reached by age 100.
    earliestRetirementAge: reached ? currentAge + years : 0,
    yearsFromNow: reached ? years : 0,
    nestEggNeededThen: round2(needAt(years)),
    projectedSavingsThen: round2(balance),
  };
};

// --- 3. Retirement Goal Calculator (savings benchmarks by age) ------------
// Common planning benchmarks: savings as a multiple of salary by age.
const BENCHMARKS: [number, number][] = [
  [30, 1],
  [35, 2],
  [40, 3],
  [45, 4],
  [50, 6],
  [55, 7],
  [60, 8],
  [67, 10],
];

function benchmarkMultiple(age: number): number {
  if (age <= 25) return 0;
  if (age <= BENCHMARKS[0][0]) return (BENCHMARKS[0][1] * (age - 25)) / (BENCHMARKS[0][0] - 25);
  for (let k = 1; k < BENCHMARKS.length; k++) {
    const [a1, m1] = BENCHMARKS[k];
    const [a0, m0] = BENCHMARKS[k - 1];
    if (age <= a1) return m0 + ((m1 - m0) * (age - a0)) / (a1 - a0);
  }
  return BENCHMARKS[BENCHMARKS.length - 1][1];
}

export const retirementGoalCalculator: CustomCalculator = (values) => {
  const age = Math.max(18, Math.round(safeNumber(values.age, 40)));
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 80000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 180000));

  const multiple = benchmarkMultiple(age);
  const benchmark = annualSalary * multiple;

  return {
    benchmarkForYourAge: round2(benchmark),
    benchmarkMultiple: round2(multiple),
    yourMultiple: annualSalary > 0 ? round2(currentSavings / annualSalary) : 0,
    aheadOrBehind: round2(currentSavings - benchmark),
    targetAt67: round2(annualSalary * 10),
  };
};

// --- 4. Retirement Readiness Calculator (income score) --------------------
export const retirementReadinessCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, Math.round(safeNumber(values.currentAge, 45)));
  const retirementAge = Math.max(currentAge, Math.round(safeNumber(values.retirementAge, 67)));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 200000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 1000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const desiredIncomeToday = Math.max(0, safeNumber(values.desiredIncomeToday, 70000));
  const guaranteedIncomeToday = Math.max(0, safeNumber(values.guaranteedIncomeToday, 28000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const years = retirementAge - currentAge;
  const n = years * 12;
  const i = annualReturnPercent / 100 / 12;
  const nestEgg = currentSavings * Math.pow(1 + i, n) + fvAnnuity(monthlyContribution, i, n);
  const deflator = Math.pow(1 + inflationPercent / 100, years);
  const savingsIncomeToday = (nestEgg * withdrawalRatePercent) / 100 / deflator;
  const projectedIncomeToday = savingsIncomeToday + guaranteedIncomeToday;

  return {
    readinessScorePercent: desiredIncomeToday > 0 ? round2((projectedIncomeToday / desiredIncomeToday) * 100) : 0,
    projectedIncomeTodaysMoney: round2(projectedIncomeToday),
    incomeFromSavingsTodaysMoney: round2(savingsIncomeToday),
    yearlyShortfallOrSurplus: round2(projectedIncomeToday - desiredIncomeToday),
    projectedNestEgg: round2(nestEgg),
  };
};

// --- 5. Retirement Contribution Calculator (vs a 15% target) -------------
export const retirementContributionCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 65000));
  const yourContributionPercent = Math.max(0, safeNumber(values.yourContributionPercent, 6));
  const employerContributionPercent = Math.max(0, safeNumber(values.employerContributionPercent, 3));
  const targetPercent = Math.max(0, safeNumber(values.targetPercent, 15));

  const totalPercent = yourContributionPercent + employerContributionPercent;
  const extraPercent = Math.max(0, targetPercent - totalPercent);

  return {
    totalSavingRatePercent: round2(totalPercent),
    totalPerYear: round2((annualSalary * totalPercent) / 100),
    extraPercentNeeded: round2(extraPercent),
    extraPerMonthNeeded: round2((annualSalary * extraPercent) / 100 / 12),
    yourContributionPerYear: round2((annualSalary * yourContributionPercent) / 100),
  };
};

// --- 6. Retirement Gap Calculator (monthly income gap at retirement) -----
export const retirementGapCalculator: CustomCalculator = (values) => {
  const monthlyIncomeNeeded = Math.max(0, safeNumber(values.monthlyIncomeNeeded, 6000));
  const socialSecurityMonthly = Math.max(0, safeNumber(values.socialSecurityMonthly, 2400));
  const pensionMonthly = Math.max(0, safeNumber(values.pensionMonthly, 500));
  const otherMonthly = Math.max(0, safeNumber(values.otherMonthly, 0));
  const savingsAtRetirement = Math.max(0, safeNumber(values.savingsAtRetirement, 600000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));

  const guaranteed = socialSecurityMonthly + pensionMonthly + otherMonthly;
  const fromSavings = (savingsAtRetirement * withdrawalRatePercent) / 100 / 12;
  const gap = monthlyIncomeNeeded - guaranteed - fromSavings;

  return {
    monthlyGap: round2(Math.max(0, gap)),
    guaranteedMonthlyIncome: round2(guaranteed),
    monthlyIncomeFromSavings: round2(fromSavings),
    extraSavingsNeededToClose: round2(Math.max(0, (gap * 12) / (withdrawalRatePercent / 100))),
    // Positive = more income than needed.
    monthlySurplus: round2(Math.max(0, -gap)),
  };
};

// --- 7. Retirement Nest Egg Calculator (growing annuity for N years) -----
export const retirementNestEggCalculator: CustomCalculator = (values) => {
  const annualSpending = Math.max(0, safeNumber(values.annualSpending, 60000));
  const otherAnnualIncome = Math.max(0, safeNumber(values.otherAnnualIncome, 24000));
  const yearsInRetirement = Math.max(1, Math.round(safeNumber(values.yearsInRetirement, 30)));
  const returnInRetirementPercent = Math.max(0, safeNumber(values.returnInRetirementPercent, 5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  // First-year withdrawal W at the start of each year, rising with
  // inflation g, discounted at return r: PV = W·Σ ((1+g)/(1+r))^k, k=0..N−1.
  const w = Math.max(0, annualSpending - otherAnnualIncome);
  const q = (1 + inflationPercent / 100) / (1 + returnInRetirementPercent / 100);
  const factor = Math.abs(q - 1) < 1e-12 ? yearsInRetirement : (1 - Math.pow(q, yearsInRetirement)) / (1 - q);
  const nestEgg = w * factor;

  return {
    nestEggNeeded: round2(nestEgg),
    firstYearWithdrawal: round2(w),
    fourPercentRuleNestEgg: round2(w * 25),
    impliedWithdrawalRatePercent: nestEgg > 0 ? round2((w / nestEgg) * 100) : 0,
  };
};

// --- 8. Retirement Future Value Calculator (future and today's dollars) --
export const retirementFutureValueCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 75000));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 10000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 25)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const r = annualReturnPercent / 100;
  const fv = currentBalance * Math.pow(1 + r, years) + fvAnnuity(annualContribution, r, years);
  const today = fv / Math.pow(1 + inflationPercent / 100, years);

  return {
    futureValue: round2(fv),
    futureValueTodaysMoney: round2(today),
    totalContributed: round2(currentBalance + annualContribution * years),
    lostToInflation: round2(fv - today),
  };
};

// --- 9. Retirement Monthly Savings Calculator (cost of waiting) ----------
export const retirementMonthlySavingsCalculator: CustomCalculator = (values) => {
  const targetNestEgg = Math.max(0, safeNumber(values.targetNestEgg, 1000000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 40000));
  const yearsToRetirement = Math.max(1, Math.round(safeNumber(values.yearsToRetirement, 30)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  const i = annualReturnPercent / 100 / 12;
  const n = yearsToRetirement * 12;
  const startNow = monthlyNeeded(targetNestEgg, currentSavings, i, n);
  // Waiting: current savings keep growing, but deposits start later.
  const afterWait = (wait: number) =>
    wait >= yearsToRetirement ? 0 : monthlyNeeded(targetNestEgg, currentSavings * Math.pow(1 + i, wait * 12), i, n - wait * 12);

  return {
    monthlySavingNeeded: round2(startNow),
    monthlyIfYouWait5Years: round2(afterWait(5)),
    monthlyIfYouWait10Years: round2(afterWait(10)),
    totalDepositsStartingNow: round2(startNow * n),
  };
};

// --- 10. Retirement Lump Sum Calculator (one-off sum → income) -----------
export const retirementLumpSumCalculator: CustomCalculator = (values) => {
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 50000));
  const yearsToRetirement = Math.max(0, Math.round(safeNumber(values.yearsToRetirement, 20)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const yearsOfIncome = Math.max(1, Math.round(safeNumber(values.yearsOfIncome, 25)));
  const returnInRetirementPercent = Math.max(0, safeNumber(values.returnInRetirementPercent, 4));

  const atRetirement = lumpSum * Math.pow(1 + annualReturnPercent / 100 / 12, yearsToRetirement * 12);
  const j = returnInRetirementPercent / 100 / 12;
  const n = yearsOfIncome * 12;
  const monthlyIncome = j === 0 ? atRetirement / n : (atRetirement * j) / (1 - Math.pow(1 + j, -n));

  return {
    valueAtRetirement: round2(atRetirement),
    monthlyIncome: round2(monthlyIncome),
    totalIncomeReceived: round2(monthlyIncome * n),
    growthMultiple: lumpSum > 0 ? round2(atRetirement / lumpSum) : 0,
  };
};

export const retirementPlanningCustomCalculators: Record<string, CustomCalculator> = {
  "retirement-savings-calculator": retirementSavingsCalculator,
  "retirement-age-calculator": retirementAgeCalculator,
  "retirement-goal-calculator": retirementGoalCalculator,
  "retirement-readiness-calculator": retirementReadinessCalculator,
  "retirement-contribution-calculator": retirementContributionCalculator,
  "retirement-gap-calculator": retirementGapCalculator,
  "retirement-nest-egg-calculator": retirementNestEggCalculator,
  "retirement-future-value-calculator": retirementFutureValueCalculator,
  "retirement-monthly-savings-calculator": retirementMonthlySavingsCalculator,
  "retirement-lump-sum-calculator": retirementLumpSumCalculator,
};
