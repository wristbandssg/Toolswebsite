/**
 * Batch: "Savings Calculators" sub-batch A (Core Savings Math, 9 tools).
 * Part of the Savings Calculators tool-list build-out — 60 tools in the
 * source list, 3 skipped as exact-slug duplicates (savings-calculator,
 * savings-goal-calculator, emergency-fund-calculator, all already in
 * calc-engine-finance-savings.ts), 57 built across 6 sub-batches, all filed
 * under Finance Calculators > Savings Calculators (savings-calculators):
 *  - calc-engine-savings-core.ts (this file)
 *  - calc-engine-savings-schedules.ts
 *  - calc-engine-savings-accounts.ts
 *  - calc-engine-savings-withdrawals-emergency.ts
 *  - calc-engine-savings-goals.ts
 *  - calc-engine-savings-goal-planning.ts
 *
 * Near-namesakes are deliberately differentiated by inputs or output
 * framing:
 *  - savingsInterestCalculator: interest EARNED on an existing balance —
 *    first month, first year, and total — plus the APY the compounding
 *    choice produces. (savings-calculator adds deposits; compound-interest-
 *    calculator under Investment reports only the end value.)
 *  - monthlySavingsCalculator: monthly deposits ONLY, starting from zero,
 *    with the balance after year 1 and what the same deposits would total
 *    with no interest at all.
 *  - futureValueCalculator: a single sum's future value plus its growth
 *    multiple and exact doubling time. (investment-future-value-calculator
 *    covers lump sum + payment streams at any frequency/timing.)
 *  - savingsGrowthCalculator: deposits that RISE by a set % every year
 *    (a "step-up" plan), and the share of the end balance that is interest.
 *  - savingsRateCalculator: the personal savings rate — % of income saved,
 *    measured against gross and take-home pay, counting pre-tax retirement
 *    and employer match.
 *  - savingsPercentageCalculator: the reverse — pick a % of income to save
 *    and see the monthly amount, what's left to spend, and the balance it
 *    grows to.
 *  - savingsBalanceCalculator: a month-by-month balance with deposits,
 *    withdrawals AND a monthly fee all at once.
 *  - savingsDepositCalculator: the one-off deposit needed TODAY to reach a
 *    target (present value), and how much of the target interest covers.
 *  - savingsInterestRateCalculator: solves for the interest RATE needed to
 *    reach a target from a starting balance and monthly deposits.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-core-calculators.ts for the tool content/copy
 * this math is wired to.
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

// Future value of `pmt` deposited at the END of each of `n` periods at
// periodic rate `i`.
function fvAnnuity(pmt: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return i === 0 ? pmt * n : (pmt * (Math.pow(1 + i, n) - 1)) / i;
}

// --- 1. Savings Interest Calculator (interest earned on a balance) ----------
export const savingsInterestCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const compoundingPerYear = Math.max(1, safeNumber(values.compoundingPerYear, 12));
  const years = Math.max(0, safeNumber(values.years, 3));

  const periodic = annualRatePercent / 100 / compoundingPerYear;
  const growth = (t: number) => Math.pow(1 + periodic, compoundingPerYear * t);
  const endingBalance = balance * growth(years);

  return {
    totalInterest: round2(endingBalance - balance),
    endingBalance: round2(endingBalance),
    firstMonthInterest: round2(balance * (growth(1 / 12) - 1)),
    firstYearInterest: round2(balance * (growth(1) - 1)),
    apyPercent: round4((growth(1) - 1) * 100),
  };
};

// --- 2. Monthly Savings Calculator (monthly deposits from zero) ------------
export const monthlySavingsCalculator: CustomCalculator = (values) => {
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 10));

  const i = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);
  const finalBalance = fvAnnuity(monthlyDeposit, i, n);
  const totalDeposited = monthlyDeposit * n;

  return {
    finalBalance: round2(finalBalance),
    totalDeposited: round2(totalDeposited),
    interestEarned: round2(finalBalance - totalDeposited),
    balanceAfterYear1: round2(fvAnnuity(monthlyDeposit, i, Math.min(n, 12))),
  };
};

// --- 3. Future Value Calculator (single sum + doubling time) ---------------
export const futureValueCalculator: CustomCalculator = (values) => {
  const presentValue = Math.max(0, safeNumber(values.presentValue, 10000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 5));
  const compoundingPerYear = Math.max(1, safeNumber(values.compoundingPerYear, 12));
  const years = Math.max(0, safeNumber(values.years, 10));

  const periodic = annualRatePercent / 100 / compoundingPerYear;
  const multiple = Math.pow(1 + periodic, compoundingPerYear * years);
  const futureValue = presentValue * multiple;
  // Exact doubling time: solve (1 + r/m)^(m·t) = 2 for t.
  const yearsToDouble = periodic > 0 ? Math.log(2) / (compoundingPerYear * Math.log(1 + periodic)) : 0;

  return {
    futureValue: round2(futureValue),
    interestEarned: round2(futureValue - presentValue),
    growthMultiple: round4(multiple),
    yearsToDouble: round2(yearsToDouble),
  };
};

// --- 4. Savings Growth Calculator (deposits step up every year) ------------
export const savingsGrowthCalculator: CustomCalculator = (values) => {
  const initialDeposit = Math.max(0, safeNumber(values.initialDeposit, 5000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 200));
  const annualIncreasePercent = Math.max(0, safeNumber(values.annualIncreasePercent, 3));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const years = Math.max(0, safeNumber(values.years, 15));

  const i = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);
  let balance = initialDeposit;
  let deposited = initialDeposit;
  let deposit = monthlyDeposit;
  for (let m = 1; m <= n; m++) {
    // The deposit rises at the start of each new year (months 13, 25, ...).
    if (m > 1 && (m - 1) % 12 === 0) deposit *= 1 + annualIncreasePercent / 100;
    balance = balance * (1 + i) + deposit;
    deposited += deposit;
  }
  const interest = balance - deposited;

  return {
    finalBalance: round2(balance),
    totalDeposited: round2(deposited),
    interestEarned: round2(interest),
    interestSharePercent: balance > 0 ? round2((interest / balance) * 100) : 0,
    finalMonthlyDeposit: n > 0 ? round2(deposit) : round2(monthlyDeposit),
  };
};

// --- 5. Savings Rate Calculator (% of income saved) ------------------------
export const savingsRateCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 6000));
  const takeHomeMonthlyPay = Math.max(0, safeNumber(values.takeHomeMonthlyPay, 4500));
  const monthlySavingsFromPay = Math.max(0, safeNumber(values.monthlySavingsFromPay, 600));
  const preTaxRetirement = Math.max(0, safeNumber(values.preTaxRetirement, 300));
  const employerMatch = Math.max(0, safeNumber(values.employerMatch, 150));

  const totalSaved = monthlySavingsFromPay + preTaxRetirement + employerMatch;
  const grossBase = grossMonthlyIncome + employerMatch;

  return {
    savingsRateOfGrossPercent: grossBase > 0 ? round2((totalSaved / grossBase) * 100) : 0,
    savingsRateOfTakeHomePercent: takeHomeMonthlyPay > 0 ? round2((monthlySavingsFromPay / takeHomeMonthlyPay) * 100) : 0,
    totalSavedPerMonth: round2(totalSaved),
    totalSavedPerYear: round2(totalSaved * 12),
  };
};

// --- 6. Savings Percentage Calculator (save a set % of income) -------------
export const savingsPercentageCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 4000));
  const savePercent = Math.min(100, Math.max(0, safeNumber(values.savePercent, 15)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 5));

  const monthlySavings = (monthlyIncome * savePercent) / 100;
  const n = Math.round(years * 12);
  const balance = fvAnnuity(monthlySavings, annualRatePercent / 100 / 12, n);

  return {
    monthlySavings: round2(monthlySavings),
    annualSavings: round2(monthlySavings * 12),
    leftToSpendMonthly: round2(monthlyIncome - monthlySavings),
    balanceAfterPeriod: round2(balance),
    interestEarned: round2(balance - monthlySavings * n),
  };
};

// --- 7. Savings Balance Calculator (deposits, withdrawals and fees) --------
export const savingsBalanceCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 8000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 400));
  const monthlyWithdrawal = Math.max(0, safeNumber(values.monthlyWithdrawal, 150));
  const monthlyFee = Math.max(0, safeNumber(values.monthlyFee, 0));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const months = Math.max(0, Math.round(safeNumber(values.months, 24)));

  const i = annualRatePercent / 100 / 12;
  let balance = startingBalance;
  let interest = 0;
  let fees = 0;
  for (let m = 1; m <= months; m++) {
    const earned = balance * i;
    interest += earned;
    // The fee can't take the balance below zero — an empty account isn't
    // charged more than it holds.
    const available = Math.max(0, balance + earned + monthlyDeposit - monthlyWithdrawal);
    const fee = Math.min(monthlyFee, available);
    fees += fee;
    balance = available - fee;
  }

  return {
    endingBalance: round2(balance),
    totalInterest: round2(interest),
    totalFees: round2(fees),
    netChange: round2(balance - startingBalance),
  };
};

// --- 8. Savings Deposit Calculator (one-off deposit needed today) ----------
export const savingsDepositCalculator: CustomCalculator = (values) => {
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 20000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const compoundingPerYear = Math.max(1, safeNumber(values.compoundingPerYear, 12));
  const years = Math.max(0, safeNumber(values.years, 5));

  const multiple = Math.pow(1 + annualRatePercent / 100 / compoundingPerYear, compoundingPerYear * years);
  const depositNeeded = targetAmount / multiple;
  const interest = targetAmount - depositNeeded;

  return {
    depositNeededToday: round2(depositNeeded),
    interestEarned: round2(interest),
    interestSharePercent: targetAmount > 0 ? round2((interest / targetAmount) * 100) : 0,
  };
};

// --- 9. Savings Interest Rate Calculator (rate needed to hit a target) -----
export const savingsInterestRateCalculator: CustomCalculator = (values) => {
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 5000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 250));
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 25000));
  const years = Math.max(0, safeNumber(values.years, 5));

  const n = Math.round(years * 12);
  const totalDeposits = currentSavings + monthlyDeposit * n;
  const fv = (i: number) => currentSavings * Math.pow(1 + i, n) + fvAnnuity(monthlyDeposit, i, n);

  let requiredRatePercent = 0;
  if (n > 0 && totalDeposits > 0 && totalDeposits < targetAmount) {
    // Bisection on the monthly rate; fv() rises with the rate. Capped at
    // 100% a year — beyond that the target isn't realistic for savings.
    let lo = 0;
    let hi = 1 / 12;
    if (fv(hi) < targetAmount) {
      requiredRatePercent = 100;
    } else {
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        if (fv(mid) < targetAmount) lo = mid;
        else hi = mid;
      }
      requiredRatePercent = ((lo + hi) / 2) * 12 * 100;
    }
  }

  return {
    requiredRatePercent: round2(requiredRatePercent),
    totalDeposits: round2(totalDeposits),
    interestNeeded: round2(Math.max(0, targetAmount - totalDeposits)),
  };
};

export const savingsCoreCustomCalculators: Record<string, CustomCalculator> = {
  "savings-interest-calculator": savingsInterestCalculator,
  "monthly-savings-calculator": monthlySavingsCalculator,
  "future-value-calculator": futureValueCalculator,
  "savings-growth-calculator": savingsGrowthCalculator,
  "savings-rate-calculator": savingsRateCalculator,
  "savings-percentage-calculator": savingsPercentageCalculator,
  "savings-balance-calculator": savingsBalanceCalculator,
  "savings-deposit-calculator": savingsDepositCalculator,
  "savings-interest-rate-calculator": savingsInterestRateCalculator,
};
