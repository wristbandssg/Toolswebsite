/**
 * Batch: "Retirement Calculators" (7 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 * Filed under "Retirement Calculators" per the source file's own Cluster
 * grouping (confirmed with the user rather than split across categories).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-finance-retirement-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Retirement Calculator (general savings projection + 4% rule income) ---
export const retirementCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, safeNumber(values.currentAge, 30));
  const retirementAge = Math.max(currentAge, safeNumber(values.retirementAge, 65));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);

  const monthlyRate = annualReturnPercent / 100 / 12;
  const numMonths = (retirementAge - currentAge) * 12;

  let projectedSavings: number;
  if (monthlyRate === 0) {
    projectedSavings = currentSavings + monthlyContribution * numMonths;
  } else {
    projectedSavings =
      currentSavings * Math.pow(1 + monthlyRate, numMonths) +
      monthlyContribution * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate);
  }

  const totalContributions = currentSavings + monthlyContribution * numMonths;
  // 4% rule: a commonly cited sustainable annual withdrawal rate in retirement.
  const estimatedMonthlyIncome = (projectedSavings * 0.04) / 12;

  return {
    projectedSavings: round2(projectedSavings),
    totalContributions: round2(totalContributions),
    estimatedMonthlyIncome: round2(estimatedMonthlyIncome),
  };
};

// --- 2. 401(k) Calculator (employee contribution + employer match) -----------
export const k401Calculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const annualSalary = Math.max(0, safeNumber(values.annualSalary));
  const employeeContributionPercent = Math.max(0, safeNumber(values.employeeContributionPercent, 6));
  const employerMatchPercent = Math.max(0, safeNumber(values.employerMatchPercent, 50));
  const employerMatchLimitPercent = Math.max(0, safeNumber(values.employerMatchLimitPercent, 6));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const yearsToGrow = Math.max(0, safeNumber(values.yearsToGrow, 30));

  // Employer match only applies up to a capped percentage of salary contributed.
  const matchableContributionPercent = Math.min(employeeContributionPercent, employerMatchLimitPercent);
  const employeeMonthlyContribution = (annualSalary * (employeeContributionPercent / 100)) / 12;
  const employerMonthlyMatch = (annualSalary * (matchableContributionPercent / 100) * (employerMatchPercent / 100)) / 12;
  const totalMonthlyContribution = employeeMonthlyContribution + employerMonthlyMatch;

  const monthlyRate = annualReturnPercent / 100 / 12;
  const numMonths = yearsToGrow * 12;

  let futureValue: number;
  if (monthlyRate === 0) {
    futureValue = currentBalance + totalMonthlyContribution * numMonths;
  } else {
    futureValue =
      currentBalance * Math.pow(1 + monthlyRate, numMonths) +
      totalMonthlyContribution * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate);
  }

  return {
    futureValue: round2(futureValue),
    totalEmployeeContributions: round2(employeeMonthlyContribution * numMonths),
    totalEmployerMatch: round2(employerMonthlyMatch * numMonths),
    totalContributions: round2(totalMonthlyContribution * numMonths),
  };
};

// --- 3. IRA Calculator (Traditional — tax-deferred, taxed on withdrawal) -----
export const iraCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 6000));
  const yearsToGrow = Math.max(0, safeNumber(values.yearsToGrow, 25));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 6);
  const retirementTaxRatePercent = Math.max(0, Math.min(100, safeNumber(values.retirementTaxRatePercent, 22)));

  const r = annualReturnPercent / 100;
  let futureValueBeforeTax: number;
  if (r === 0) {
    futureValueBeforeTax = currentBalance + annualContribution * yearsToGrow;
  } else {
    futureValueBeforeTax =
      currentBalance * Math.pow(1 + r, yearsToGrow) +
      annualContribution * ((Math.pow(1 + r, yearsToGrow) - 1) / r);
  }
  const estimatedAfterTaxValue = futureValueBeforeTax * (1 - retirementTaxRatePercent / 100);
  const totalContributions = currentBalance + annualContribution * yearsToGrow;

  return {
    futureValueBeforeTax: round2(futureValueBeforeTax),
    estimatedAfterTaxValue: round2(estimatedAfterTaxValue),
    totalContributions: round2(totalContributions),
  };
};

// --- 4. Roth IRA Calculator (after-tax contributions, tax-free growth) -------
export const rothIraCalculator: CustomCalculator = (values) => {
  const currentBalance = Math.max(0, safeNumber(values.currentBalance));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 6000));
  const yearsToGrow = Math.max(0, safeNumber(values.yearsToGrow, 25));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 6);

  const r = annualReturnPercent / 100;
  let futureValue: number;
  if (r === 0) {
    futureValue = currentBalance + annualContribution * yearsToGrow;
  } else {
    futureValue =
      currentBalance * Math.pow(1 + r, yearsToGrow) +
      annualContribution * ((Math.pow(1 + r, yearsToGrow) - 1) / r);
  }
  const totalContributions = currentBalance + annualContribution * yearsToGrow;
  const totalGrowth = futureValue - totalContributions;

  // Qualified Roth withdrawals are tax-free, so the future value here is
  // already the amount available to spend — unlike the Traditional IRA
  // Calculator, no after-tax adjustment is needed.
  return {
    futureValue: round2(futureValue),
    totalContributions: round2(totalContributions),
    totalGrowth: round2(totalGrowth),
  };
};

// --- 5. Pension Calculator (defined-benefit estimate) ------------------------
export const pensionCalculator: CustomCalculator = (values) => {
  const averageFinalSalary = Math.max(0, safeNumber(values.averageFinalSalary));
  const yearsOfService = Math.max(0, safeNumber(values.yearsOfService));
  const accrualRatePercent = Math.max(0, safeNumber(values.accrualRatePercent, 1.5));

  const annualPension = averageFinalSalary * yearsOfService * (accrualRatePercent / 100);
  const monthlyPension = annualPension / 12;

  return {
    annualPension: round2(annualPension),
    monthlyPension: round2(monthlyPension),
  };
};

// --- 6. Social Security Calculator (claiming-age adjustment, simplified) -----
// Uses the published SSA early/delayed-claiming adjustment rules: benefits
// are reduced for claiming before full retirement age (FRA) and increased
// for delaying past FRA (up to age 70). Requires the user's own
// estimated-benefit-at-FRA figure (from their SSA statement) — no live API.
export const socialSecurityCalculator: CustomCalculator = (values) => {
  const estimatedMonthlyBenefitAtFRA = Math.max(0, safeNumber(values.estimatedMonthlyBenefitAtFRA));
  const fullRetirementAge = Math.max(1, safeNumber(values.fullRetirementAge, 67));
  const claimingAge = Math.max(62, Math.min(70, safeNumber(values.claimingAge, 67)));

  let adjustedMonthlyBenefit = estimatedMonthlyBenefitAtFRA;
  let percentAdjustment = 0;

  if (claimingAge < fullRetirementAge) {
    const monthsEarly = (fullRetirementAge - claimingAge) * 12;
    const first36 = Math.min(monthsEarly, 36);
    const remaining = Math.max(0, monthsEarly - 36);
    // 5/9 of 1% per month for the first 36 months early, 5/12 of 1% per month beyond that.
    const reductionFactor = first36 * (5 / 9 / 100) + remaining * (5 / 12 / 100);
    adjustedMonthlyBenefit = estimatedMonthlyBenefitAtFRA * (1 - reductionFactor);
    percentAdjustment = -reductionFactor * 100;
  } else if (claimingAge > fullRetirementAge) {
    const monthsLate = Math.min((claimingAge - fullRetirementAge) * 12, (70 - fullRetirementAge) * 12);
    // 2/3 of 1% per month (8% per year) of delayed retirement credit.
    const increaseFactor = monthsLate * (2 / 3 / 100);
    adjustedMonthlyBenefit = estimatedMonthlyBenefitAtFRA * (1 + increaseFactor);
    percentAdjustment = increaseFactor * 100;
  }

  return {
    adjustedMonthlyBenefit: round2(adjustedMonthlyBenefit),
    annualBenefit: round2(adjustedMonthlyBenefit * 12),
    percentAdjustment: round2(percentAdjustment),
  };
};

// --- 7. Retirement Withdrawal Calculator (how long savings will last) -------
function simulateWithdrawal(startingBalance: number, monthlyWithdrawal: number, monthlyRate: number) {
  let balance = startingBalance;
  let months = 0;
  let totalWithdrawn = 0;
  const CAP = 600; // 50 years
  while (balance > 0 && months < CAP) {
    balance = balance * (1 + monthlyRate) - monthlyWithdrawal;
    months += 1;
    totalWithdrawn += monthlyWithdrawal;
  }
  return { months, totalWithdrawn, depleted: balance <= 0 && months < CAP };
}

export const retirementWithdrawalCalculator: CustomCalculator = (values) => {
  const currentSavings = Math.max(0, safeNumber(values.currentSavings));
  const monthlyWithdrawal = Math.max(0.01, safeNumber(values.monthlyWithdrawal));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 5);

  const monthlyRate = annualReturnPercent / 100 / 12;
  const { months, totalWithdrawn } = simulateWithdrawal(currentSavings, monthlyWithdrawal, monthlyRate);

  return {
    monthsLasting: months,
    yearsLasting: round2(months / 12),
    totalWithdrawn: round2(totalWithdrawn),
  };
};

export const financeRetirementCustomCalculators: Record<string, CustomCalculator> = {
  "retirement-calculator": retirementCalculator,
  "401k-calculator": k401Calculator,
  "ira-calculator": iraCalculator,
  "roth-ira-calculator": rothIraCalculator,
  "pension-calculator": pensionCalculator,
  "social-security-calculator": socialSecurityCalculator,
  "retirement-withdrawal-calculator": retirementWithdrawalCalculator,
};
