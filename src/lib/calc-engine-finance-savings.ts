/**
 * Batch: "Savings Calculators" (5 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 * Filed under "Savings Calculators" per the source file's own Cluster
 * grouping (confirmed with the user rather than split across categories).
 * Last of the 8 new topic batches.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-finance-savings-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Savings Calculator (lump sum + regular monthly deposits) -------------
export const savingsCalculator: CustomCalculator = (values) => {
  const initialDeposit = Math.max(0, safeNumber(values.initialDeposit));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit));
  const annualInterestRatePercent = safeNumber(values.annualInterestRatePercent, 4);
  const years = Math.max(0, safeNumber(values.years, 5));

  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const numMonths = years * 12;

  let futureValue: number;
  if (monthlyRate === 0) {
    futureValue = initialDeposit + monthlyDeposit * numMonths;
  } else {
    futureValue =
      initialDeposit * Math.pow(1 + monthlyRate, numMonths) +
      monthlyDeposit * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate);
  }

  const totalContributions = initialDeposit + monthlyDeposit * numMonths;
  const totalInterest = futureValue - totalContributions;

  return {
    futureValue: round2(futureValue),
    totalContributions: round2(totalContributions),
    totalInterest: round2(totalInterest),
  };
};

// --- 2. Emergency Fund Calculator --------------------------------------------
export const emergencyFundCalculator: CustomCalculator = (values) => {
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses));
  const monthsOfCoverage = Math.max(1, safeNumber(values.monthsOfCoverage, 6));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution));

  const targetAmount = monthlyExpenses * monthsOfCoverage;
  const amountStillNeeded = Math.max(0, targetAmount - currentSavings);
  const monthsToGoal = monthlyContribution > 0 ? Math.ceil(amountStillNeeded / monthlyContribution) : 0;

  return {
    targetAmount: round2(targetAmount),
    amountStillNeeded: round2(amountStillNeeded),
    monthsToGoal,
  };
};

// --- 3. Savings Goal Calculator (required monthly deposit to hit a goal) ----
export const savingsGoalCalculator: CustomCalculator = (values) => {
  const goalAmount = Math.max(0, safeNumber(values.goalAmount));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings));
  const monthsToGoal = Math.max(1, Math.round(safeNumber(values.monthsToGoal, 24)));
  const annualInterestRatePercent = safeNumber(values.annualInterestRatePercent, 3);

  const monthlyRate = annualInterestRatePercent / 100 / 12;

  let requiredMonthlyDeposit: number;
  if (monthlyRate === 0) {
    requiredMonthlyDeposit = (goalAmount - currentSavings) / monthsToGoal;
  } else {
    const growthFactor = Math.pow(1 + monthlyRate, monthsToGoal);
    requiredMonthlyDeposit = (goalAmount - currentSavings * growthFactor) / ((growthFactor - 1) / monthlyRate);
  }
  requiredMonthlyDeposit = Math.max(0, requiredMonthlyDeposit);

  return {
    requiredMonthlyDeposit: round2(requiredMonthlyDeposit),
    totalDeposits: round2(requiredMonthlyDeposit * monthsToGoal),
  };
};

// --- 4. CD Calculator (fixed-term certificate of deposit) --------------------
export const cdCalculator: CustomCalculator = (values) => {
  const depositAmount = Math.max(0, safeNumber(values.depositAmount));
  const apyPercent = safeNumber(values.apyPercent, 4.5);
  const termMonths = Math.max(1, safeNumber(values.termMonths, 12));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));

  const termYears = termMonths / 12;
  const futureValue = depositAmount * Math.pow(1 + apyPercent / 100 / compoundingFrequency, compoundingFrequency * termYears);
  const interestEarned = futureValue - depositAmount;

  return {
    futureValue: round2(futureValue),
    interestEarned: round2(interestEarned),
  };
};

// --- 5. APY Calculator (nominal rate -> effective annual yield) -------------
export const apyCalculator: CustomCalculator = (values) => {
  const nominalRatePercent = Math.max(0, safeNumber(values.nominalRatePercent, 5));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));
  const depositAmount = Math.max(0, safeNumber(values.depositAmount, 10000));

  const apyPercent = (Math.pow(1 + nominalRatePercent / 100 / compoundingFrequency, compoundingFrequency) - 1) * 100;
  const annualInterestOnDeposit = depositAmount * (apyPercent / 100);

  return {
    apyPercent: Math.round(apyPercent * 10000) / 10000,
    annualInterestOnDeposit: round2(annualInterestOnDeposit),
  };
};

export const financeSavingsCustomCalculators: Record<string, CustomCalculator> = {
  "savings-calculator": savingsCalculator,
  "emergency-fund-calculator": emergencyFundCalculator,
  "savings-goal-calculator": savingsGoalCalculator,
  "cd-calculator": cdCalculator,
  "apy-calculator": apyCalculator,
};
