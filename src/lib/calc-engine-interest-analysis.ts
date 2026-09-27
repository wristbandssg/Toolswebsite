/**
 * Batch: "Interest Calculators" sub-batch C (Fixed Rate Instances,
 * Contributions/Withdrawals & Growth Analysis, 10 tools). Part of the
 * Interest_Calculators_Topical_Map_Tool_List.xlsx build-out — see
 * calc-engine-interest-core.ts for the full batch context, skipped
 * duplicates, and the other 2 sub-batches (calc-engine-interest-core.ts,
 * calc-engine-interest-rates.ts).
 *
 * Deliberate differentiation across the contribution/deposit/withdrawal
 * cluster (a recurring risk area for near-duplicate tools, following the
 * same discipline used in the Mortgage batches): compoundInterestWith-
 * ContributionsCalculator is the general, fully-flexible version
 * (selectable compounding frequency, timing); compoundInterestWith-
 * MonthlyContributionsCalculator is a FIXED monthly/end-of-month
 * instance of it with no dropdowns; compoundInterestWithRegularDeposits-
 * Calculator is entered in NUMBER OF DEPOSITS rather than years and
 * headlines the deposited-vs-interest breakdown; compoundInterestWith-
 * WithdrawalsCalculator is the mirror-image decumulation case. Similarly
 * interestEarnedCalculator, interestAccumulationCalculator, interest-
 * GrowthCalculator, and interestComparisonCalculator all use the same
 * underlying compound-growth math but are differentiated by OUTPUT
 * shape/focus: total interest only, a year-by-year schedule, growth-rate
 * metrics (multiple/doubling time), and a two-scenario side-by-side
 * comparison, respectively.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-interest-analysis-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// --- 1. Daily Interest Rate Calculator (annual -> daily, day-count basis) ---
export const dailyInterestRateCalculator: CustomCalculator = (values) => {
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const dayCountBasis = Math.max(1, safeNumber(values.dayCountBasis, 365));
  const dailyRate = annualRatePercent / dayCountBasis;
  return round4(dailyRate);
};

// --- 2. Monthly Interest Rate Calculator (annual -> monthly, fixed n=12) ----
export const monthlyInterestRateCalculator: CustomCalculator = (values) => {
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const monthlyRate = annualRatePercent / 12;
  return round4(monthlyRate);
};

// --- 3. Compound Interest with Contributions Calculator (general) ----------
export const compoundInterestWithContributionsCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));
  const contributionAmount = Math.max(0, safeNumber(values.contributionAmount, 200));
  const years = Math.max(0, safeNumber(values.years, 10));
  const contributionTiming = safeNumber(values.contributionTiming, 0); // 0 = end of period, 1 = beginning

  const i = annualRatePercent / 100 / compoundingFrequency;
  const periods = compoundingFrequency * years;

  const fvLumpSum = principal * Math.pow(1 + i, periods);
  let fvContributions: number;
  if (i === 0) {
    fvContributions = contributionAmount * periods;
  } else {
    fvContributions = contributionAmount * ((Math.pow(1 + i, periods) - 1) / i);
    if (contributionTiming === 1) {
      fvContributions *= 1 + i;
    }
  }

  const endingBalance = fvLumpSum + fvContributions;
  const totalContributions = principal + contributionAmount * periods;
  const totalInterest = endingBalance - totalContributions;

  return {
    endingBalance: round2(endingBalance),
    totalContributions: round2(totalContributions),
    totalInterest: round2(totalInterest),
  };
};

// --- 4. Compound Interest with Monthly Contributions Calculator (fixed) ----
// Fixed instance of tool #3: monthly compounding, monthly contributions,
// end-of-month timing — no dropdowns, the single most common case.
export const compoundInterestWithMonthlyContributionsCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 200));
  const years = Math.max(0, safeNumber(values.years, 10));

  const i = annualRatePercent / 100 / 12;
  const periods = 12 * years;

  const fvLumpSum = principal * Math.pow(1 + i, periods);
  const fvContributions = i === 0 ? monthlyContribution * periods : monthlyContribution * ((Math.pow(1 + i, periods) - 1) / i);

  const endingBalance = fvLumpSum + fvContributions;
  const totalContributions = principal + monthlyContribution * periods;
  const totalInterest = endingBalance - totalContributions;

  return {
    endingBalance: round2(endingBalance),
    totalContributions: round2(totalContributions),
    totalInterest: round2(totalInterest),
  };
};

// --- 5. Compound Interest with Regular Deposits Calculator -----------------
// Entered in NUMBER OF DEPOSITS (not years) at a chosen deposit frequency,
// and headlines the deposited-vs-interest breakdown — distinct framing
// from tools #3/#4 above.
export const compoundInterestWithRegularDepositsCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 1000));
  const depositAmount = Math.max(0, safeNumber(values.depositAmount, 150));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const depositsPerYear = Math.max(1, safeNumber(values.depositsPerYear, 12));
  const numberOfDeposits = Math.max(0, safeNumber(values.numberOfDeposits, 60));

  const i = annualRatePercent / 100 / depositsPerYear;

  const fvLumpSum = startingBalance * Math.pow(1 + i, numberOfDeposits);
  const fvDeposits = i === 0 ? depositAmount * numberOfDeposits : depositAmount * ((Math.pow(1 + i, numberOfDeposits) - 1) / i);

  const endingBalance = fvLumpSum + fvDeposits;
  const totalDeposited = startingBalance + depositAmount * numberOfDeposits;
  const totalInterest = endingBalance - totalDeposited;

  return {
    endingBalance: round2(endingBalance),
    totalDeposited: round2(totalDeposited),
    totalInterest: round2(totalInterest),
  };
};

// --- 6. Compound Interest with Withdrawals Calculator (decumulation) -------
export const compoundInterestWithWithdrawalsCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const monthlyWithdrawal = Math.max(0, safeNumber(values.monthlyWithdrawal, 500));
  const years = Math.max(0, safeNumber(values.years, 10));

  const i = annualRatePercent / 100 / 12;
  const totalMonths = Math.round(years * 12);

  let balance = principal;
  let totalWithdrawn = 0;
  let monthsUntilDepleted = -1; // -1 means not depleted within the horizon
  const cap = Math.min(totalMonths, 1200);

  for (let m = 1; m <= cap; m++) {
    balance = balance * (1 + i) - monthlyWithdrawal;
    totalWithdrawn += monthlyWithdrawal;
    if (balance <= 0) {
      balance = 0;
      monthsUntilDepleted = m;
      break;
    }
  }

  const totalInterestEarned = balance + totalWithdrawn - principal;

  return {
    endingBalance: round2(Math.max(0, balance)),
    totalWithdrawn: round2(totalWithdrawn),
    totalInterestEarned: round2(totalInterestEarned),
    monthsUntilDepleted: monthsUntilDepleted === -1 ? 0 : monthsUntilDepleted,
  };
};

// --- 7. Interest Earned Calculator (headline = interest only) --------------
export const interestEarnedCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 4));
  const years = Math.max(0, safeNumber(values.years, 8));

  const i = annualRatePercent / 100 / compoundingFrequency;
  const periods = compoundingFrequency * years;
  const endingBalance = principal * Math.pow(1 + i, periods);
  const interestEarned = endingBalance - principal;

  return {
    interestEarned: round2(interestEarned),
    endingBalance: round2(endingBalance),
  };
};

// --- 8. Interest Accumulation Calculator (fixed 10-year schedule) ----------
export const interestAccumulationCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));

  const i = annualRatePercent / 100 / compoundingFrequency;

  const balanceAtYear = (yr: number) => principal * Math.pow(1 + i, compoundingFrequency * yr);

  return {
    balanceYear1: round2(balanceAtYear(1)),
    balanceYear2: round2(balanceAtYear(2)),
    balanceYear3: round2(balanceAtYear(3)),
    balanceYear4: round2(balanceAtYear(4)),
    balanceYear5: round2(balanceAtYear(5)),
    balanceYear6: round2(balanceAtYear(6)),
    balanceYear7: round2(balanceAtYear(7)),
    balanceYear8: round2(balanceAtYear(8)),
    balanceYear9: round2(balanceAtYear(9)),
    balanceYear10: round2(balanceAtYear(10)),
  };
};

// --- 9. Interest Growth Calculator (growth-rate metrics) --------------------
export const interestGrowthCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0.01, safeNumber(values.principal, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6));
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));
  const years = Math.max(0, safeNumber(values.years, 15));

  const i = annualRatePercent / 100 / compoundingFrequency;
  const periods = compoundingFrequency * years;
  const endingBalance = principal * Math.pow(1 + i, periods);

  const growthMultiple = endingBalance / principal;
  const totalGrowthPercent = (growthMultiple - 1) * 100;

  const ear = Math.pow(1 + i, compoundingFrequency) - 1;
  const doublingTimeYears = ear > 0 ? Math.log(2) / Math.log(1 + ear) : Infinity;

  return {
    endingBalance: round2(endingBalance),
    totalGrowthPercent: round2(totalGrowthPercent),
    growthMultiple: round4(growthMultiple),
    doublingTimeYears: Number.isFinite(doublingTimeYears) ? round2(doublingTimeYears) : 0,
  };
};

// --- 10. Interest Comparison Calculator (two independent scenarios) --------
export const interestComparisonCalculator: CustomCalculator = (values) => {
  const principalA = Math.max(0, safeNumber(values.principalA, 10000));
  const rateAPercent = Math.max(0, safeNumber(values.rateAPercent, 5));
  const compoundingA = Math.max(1, safeNumber(values.compoundingA, 12));

  const principalB = Math.max(0, safeNumber(values.principalB, 10000));
  const rateBPercent = Math.max(0, safeNumber(values.rateBPercent, 5.5));
  const compoundingB = Math.max(1, safeNumber(values.compoundingB, 1));

  const years = Math.max(0, safeNumber(values.years, 10));

  const iA = rateAPercent / 100 / compoundingA;
  const endingBalanceA = principalA * Math.pow(1 + iA, compoundingA * years);

  const iB = rateBPercent / 100 / compoundingB;
  const endingBalanceB = principalB * Math.pow(1 + iB, compoundingB * years);

  return {
    endingBalanceA: round2(endingBalanceA),
    endingBalanceB: round2(endingBalanceB),
    difference: round2(endingBalanceB - endingBalanceA),
  };
};

export const interestAnalysisCustomCalculators: Record<string, CustomCalculator> = {
  "daily-interest-rate-calculator": dailyInterestRateCalculator,
  "monthly-interest-rate-calculator": monthlyInterestRateCalculator,
  "compound-interest-with-contributions-calculator": compoundInterestWithContributionsCalculator,
  "compound-interest-with-monthly-contributions-calculator": compoundInterestWithMonthlyContributionsCalculator,
  "compound-interest-with-regular-deposits-calculator": compoundInterestWithRegularDepositsCalculator,
  "compound-interest-with-withdrawals-calculator": compoundInterestWithWithdrawalsCalculator,
  "interest-earned-calculator": interestEarnedCalculator,
  "interest-accumulation-calculator": interestAccumulationCalculator,
  "interest-growth-calculator": interestGrowthCalculator,
  "interest-comparison-calculator": interestComparisonCalculator,
};
