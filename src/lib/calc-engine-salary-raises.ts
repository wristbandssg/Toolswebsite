/**
 * Batch: "Salary & Income Calculators" sub-batch E (Raises & Comparisons, 8
 * tools). Part of the Salary & Income build-out — see
 * calc-engine-salary-conversions.ts for the full list of 9 sub-batches.
 * Filed under Finance Calculators > Salary & Income Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - raiseCalculator: a raise given as a % OR a dollar amount — new salary
 *    and what it adds per paycheck, month and year.
 *  - salaryIncreaseCalculator: whether a raise beats inflation — the REAL
 *    increase in buying power.
 *  - payRaisePercentageCalculator: the % raise from an old and new figure.
 *  - salaryDecreaseCalculator: a pay cut — the loss, and the raise needed
 *    later just to get back to where you were.
 *  - salaryDifferenceCalculator: the gap between two salaries per year,
 *    month, paycheck and hour.
 *  - salaryComparisonCalculator: two job offers' TOTAL compensation —
 *    bonus, retirement match, benefits and commuting cost.
 *  - hourlyWageIncreaseCalculator: an hourly raise in weekly and yearly
 *    terms.
 *  - incomeGrowthCalculator: the average yearly growth rate (CAGR) between
 *    two incomes, and where that trend leads.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-salary-raises-calculators.ts for the tool content/copy
 * this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Raise Calculator (% or $) -------------------------------------------
export const raiseCalculator: CustomCalculator = (values) => {
  const currentSalary = Math.max(0, safeNumber(values.currentSalary, 60000));
  // 1 = raise is a percentage, 2 = raise is a dollar amount per year
  const raiseType = Math.round(safeNumber(values.raiseType, 1)) === 2 ? 2 : 1;
  const raiseAmount = Math.max(0, safeNumber(values.raiseAmount, 4));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 26));

  const extra = raiseType === 1 ? (currentSalary * raiseAmount) / 100 : raiseAmount;

  return {
    newSalary: round2(currentSalary + extra),
    raisePerYear: round2(extra),
    raisePerMonth: round2(extra / 12),
    raisePerPaycheck: round2(extra / periodsPerYear),
    raisePercent: currentSalary > 0 ? round2((extra / currentSalary) * 100) : 0,
  };
};

// --- 2. Salary Increase Calculator (vs inflation) --------------------------
export const salaryIncreaseCalculator: CustomCalculator = (values) => {
  const currentSalary = Math.max(0, safeNumber(values.currentSalary, 70000));
  const increasePercent = safeNumber(values.increasePercent, 3.5);
  const inflationPercent = safeNumber(values.inflationPercent, 3);

  const newSalary = currentSalary * (1 + increasePercent / 100);
  const real = ((1 + increasePercent / 100) / (1 + inflationPercent / 100) - 1) * 100;
  const keepPace = currentSalary * (1 + inflationPercent / 100);

  return {
    realIncreasePercent: round2(real),
    newSalary: round2(newSalary),
    salaryNeededToKeepPace: round2(keepPace),
    aboveOrBelowInflation: round2(newSalary - keepPace),
  };
};

// --- 3. Pay Raise Percentage Calculator -------------------------------------
export const payRaisePercentageCalculator: CustomCalculator = (values) => {
  const oldPay = Math.max(0, safeNumber(values.oldPay, 52000));
  const newPay = Math.max(0, safeNumber(values.newPay, 55640));

  return {
    raisePercent: oldPay > 0 ? round2(((newPay - oldPay) / oldPay) * 100) : 0,
    raiseAmount: round2(newPay - oldPay),
    raisePerMonth: round2((newPay - oldPay) / 12),
  };
};

// --- 4. Salary Decrease Calculator (and the climb back) -------------------
export const salaryDecreaseCalculator: CustomCalculator = (values) => {
  const currentSalary = Math.max(0, safeNumber(values.currentSalary, 80000));
  const decreasePercent = Math.min(99.99, Math.max(0, safeNumber(values.decreasePercent, 10)));

  const newSalary = currentSalary * (1 - decreasePercent / 100);
  const loss = currentSalary - newSalary;

  return {
    newSalary: round2(newSalary),
    lossPerYear: round2(loss),
    lossPerMonth: round2(loss / 12),
    raiseNeededToRecoverPercent: newSalary > 0 ? round2((currentSalary / newSalary - 1) * 100) : 0,
  };
};

// --- 5. Salary Difference Calculator ----------------------------------------
export const salaryDifferenceCalculator: CustomCalculator = (values) => {
  const salaryA = Math.max(0, safeNumber(values.salaryA, 68000));
  const salaryB = Math.max(0, safeNumber(values.salaryB, 75000));
  const hoursPerWeek = Math.max(0.1, safeNumber(values.hoursPerWeek, 40));

  const diff = salaryB - salaryA;

  return {
    differencePerYear: round2(diff),
    differencePercent: salaryA > 0 ? round2((diff / salaryA) * 100) : 0,
    differencePerMonth: round2(diff / 12),
    differencePerBiweeklyCheck: round2(diff / 26),
    differencePerHour: round2(diff / (hoursPerWeek * 52)),
  };
};

// --- 6. Salary Comparison Calculator (total compensation) ----------------
export const salaryComparisonCalculator: CustomCalculator = (values) => {
  const salaryA = Math.max(0, safeNumber(values.salaryA, 80000));
  const bonusA = Math.max(0, safeNumber(values.bonusA, 5000));
  const matchPercentA = Math.max(0, safeNumber(values.matchPercentA, 4));
  const benefitsA = Math.max(0, safeNumber(values.benefitsA, 6000));
  const commuteCostA = Math.max(0, safeNumber(values.commuteCostA, 3000));
  const salaryB = Math.max(0, safeNumber(values.salaryB, 88000));
  const bonusB = Math.max(0, safeNumber(values.bonusB, 0));
  const matchPercentB = Math.max(0, safeNumber(values.matchPercentB, 3));
  const benefitsB = Math.max(0, safeNumber(values.benefitsB, 4000));
  const commuteCostB = Math.max(0, safeNumber(values.commuteCostB, 5500));

  const total = (s: number, b: number, m: number, ben: number, c: number) => s + b + (s * m) / 100 + ben - c;
  const a = total(salaryA, bonusA, matchPercentA, benefitsA, commuteCostA);
  const b = total(salaryB, bonusB, matchPercentB, benefitsB, commuteCostB);

  return {
    differenceBMinusA: round2(b - a),
    totalValueJobA: round2(a),
    totalValueJobB: round2(b),
    salaryDifferenceOnly: round2(salaryB - salaryA),
  };
};

// --- 7. Hourly Wage Increase Calculator ------------------------------------
export const hourlyWageIncreaseCalculator: CustomCalculator = (values) => {
  const currentHourly = Math.max(0, safeNumber(values.currentHourly, 18));
  const newHourly = Math.max(0, safeNumber(values.newHourly, 19.5));
  const hoursPerWeek = Math.max(0, safeNumber(values.hoursPerWeek, 38));

  const diff = newHourly - currentHourly;

  return {
    increasePercent: currentHourly > 0 ? round2((diff / currentHourly) * 100) : 0,
    extraPerWeek: round2(diff * hoursPerWeek),
    extraPerMonth: round2((diff * hoursPerWeek * 52) / 12),
    extraPerYear: round2(diff * hoursPerWeek * 52),
    newAnnualPay: round2(newHourly * hoursPerWeek * 52),
  };
};

// --- 8. Income Growth Calculator (CAGR + projection) -----------------------
export const incomeGrowthCalculator: CustomCalculator = (values) => {
  const startingIncome = Math.max(0.01, safeNumber(values.startingIncome, 45000));
  const currentIncome = Math.max(0, safeNumber(values.currentIncome, 62000));
  const yearsBetween = Math.max(0.1, safeNumber(values.yearsBetween, 6));
  const yearsToProject = Math.max(0, safeNumber(values.yearsToProject, 5));

  const cagr = Math.pow(currentIncome / startingIncome, 1 / yearsBetween) - 1;

  return {
    averageYearlyGrowthPercent: round2(cagr * 100),
    totalGrowthPercent: round2((currentIncome / startingIncome - 1) * 100),
    projectedIncome: round2(currentIncome * Math.pow(1 + cagr, yearsToProject)),
    incomeIncrease: round2(currentIncome - startingIncome),
  };
};

export const salaryRaisesCustomCalculators: Record<string, CustomCalculator> = {
  "raise-calculator": raiseCalculator,
  "salary-increase-calculator": salaryIncreaseCalculator,
  "pay-raise-percentage-calculator": payRaisePercentageCalculator,
  "salary-decrease-calculator": salaryDecreaseCalculator,
  "salary-difference-calculator": salaryDifferenceCalculator,
  "salary-comparison-calculator": salaryComparisonCalculator,
  "hourly-wage-increase-calculator": hourlyWageIncreaseCalculator,
  "income-growth-calculator": incomeGrowthCalculator,
};
