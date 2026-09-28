/**
 * Batch: "Savings Calculators" sub-batch B (Deposit Schedules, 11 tools).
 * Part of the Savings Calculators build-out — see calc-engine-savings-core.ts
 * for the full list of 6 sub-batches. Filed under Finance Calculators >
 * Savings Calculators.
 *
 * Every tool here is about HOW OFTEN or HOW money goes in, and each is
 * deliberately differentiated:
 *  - recurringSavingsCalculator: an Indian bank Recurring Deposit (RD) —
 *    rupees, monthly installments, interest compounded QUARTERLY, using the
 *    banks' standard maturity formula.
 *  - regularSavingsCalculator: a UK "regular saver" account — fixed monthly
 *    deposits for a set term, SIMPLE interest on each deposit only for the
 *    months it's held, paid at the end; shows why the headline rate
 *    overstates the return on the total paid in. Pounds.
 *  - weeklySavingsCalculator: weekly deposits that can rise by a fixed
 *    amount each week (e.g. the 52-week money challenge).
 *  - biweeklySavingsCalculator: saving from every paycheck (26 a year), and
 *    the 2 extra deposits a year compared with saving twice a month.
 *  - annualSavingsCalculator: the yearly saving from cutting a recurring
 *    cost, and what that saving grows to if it's put into savings.
 *  - dailySavingsCalculator: a small amount set aside each day (on a chosen
 *    number of days a week) and what it adds up to.
 *  - savingsWithContributionsCalculator: two phases — contribute (with a
 *    yearly raise) for some years, then stop and let it grow.
 *  - savingsWithMonthlyDepositsCalculator: the SAME starting balance with
 *    and without monthly deposits, isolating what the deposits add.
 *  - savingsWithAnnualDepositsCalculator: a starting balance plus one
 *    deposit a year, made at the start or the end of each year, and what
 *    depositing early is worth.
 *  - lumpSumSavingsCalculator: a one-off deposit when tax is taken from
 *    the interest every year — before- vs after-tax balance.
 *  - lumpSumVsMonthlySavingsCalculator: depositing a sum today vs feeding
 *    the same total in monthly, both at the same savings rate. (lump-sum-
 *    vs-dollar-cost-averaging-calculator under Investment is about
 *    investing in the market.)
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-schedules-calculators.ts for the tool
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

// Periodic rate for `periodsPerYear` periods that compounds to `apyPercent`.
function periodicFromApy(apyPercent: number, periodsPerYear: number): number {
  return Math.pow(1 + apyPercent / 100, 1 / periodsPerYear) - 1;
}

// --- 1. Recurring Savings Calculator (Indian Recurring Deposit) ------------
export const recurringSavingsCalculator: CustomCalculator = (values) => {
  const monthlyInstallment = Math.max(0, safeNumber(values.monthlyInstallment, 5000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 7));
  const tenureMonths = Math.max(1, Math.round(safeNumber(values.tenureMonths, 12)));

  // Standard RD maturity: each installment compounds quarterly for the
  // months it stays in, i.e. M = Σ R·(1 + r/400)^(k/3), k = months remaining.
  const q = 1 + annualRatePercent / 400;
  let maturity = 0;
  for (let k = 1; k <= tenureMonths; k++) maturity += monthlyInstallment * Math.pow(q, k / 3);
  const deposited = monthlyInstallment * tenureMonths;

  return {
    maturityValue: round2(maturity),
    totalDeposited: round2(deposited),
    interestEarned: round2(maturity - deposited),
  };
};

// --- 2. Regular Savings Calculator (UK regular saver) ----------------------
export const regularSavingsCalculator: CustomCalculator = (values) => {
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 6.5));
  const termMonths = Math.max(1, Math.round(safeNumber(values.termMonths, 12)));

  // Deposit k (made at the start of month k) earns simple interest for the
  // (term − k + 1) months it's held: Σ D·r·(m − k + 1)/12 = D·r·m(m+1)/24.
  const r = annualRatePercent / 100;
  const interest = (monthlyDeposit * r * termMonths * (termMonths + 1)) / 24;
  const deposited = monthlyDeposit * termMonths;

  return {
    interestEarned: round2(interest),
    finalBalance: round2(deposited + interest),
    totalDeposited: round2(deposited),
    returnOnTotalDepositedPercent: deposited > 0 ? round2((interest / deposited) * 100) : 0,
  };
};

// --- 3. Weekly Savings Calculator (optional weekly step-up) ----------------
export const weeklySavingsCalculator: CustomCalculator = (values) => {
  const firstWeekDeposit = Math.max(0, safeNumber(values.firstWeekDeposit, 20));
  const weeklyIncrease = Math.max(0, safeNumber(values.weeklyIncrease, 0));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const weeks = Math.max(1, Math.round(safeNumber(values.weeks, 52)));

  const w = periodicFromApy(apyPercent, 52);
  let balance = 0;
  let deposited = 0;
  let deposit = firstWeekDeposit;
  for (let k = 1; k <= weeks; k++) {
    deposit = firstWeekDeposit + (k - 1) * weeklyIncrease;
    balance = balance * (1 + w) + deposit;
    deposited += deposit;
  }

  return {
    finalBalance: round2(balance),
    totalDeposited: round2(deposited),
    interestEarned: round2(balance - deposited),
    lastWeekDeposit: round2(deposit),
  };
};

// --- 4. Biweekly Savings Calculator (every paycheck) -----------------------
export const biweeklySavingsCalculator: CustomCalculator = (values) => {
  const perPaycheck = Math.max(0, safeNumber(values.perPaycheck, 150));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const years = Math.max(0, safeNumber(values.years, 5));

  const n = Math.round(years * 26);
  const balance = fvAnnuity(perPaycheck, periodicFromApy(apyPercent, 26), n);
  const deposited = perPaycheck * n;

  return {
    finalBalance: round2(balance),
    totalDeposited: round2(deposited),
    interestEarned: round2(balance - deposited),
    monthlyEquivalent: round2((perPaycheck * 26) / 12),
    extraVsTwiceMonthlyPerYear: round2(perPaycheck * 2),
  };
};

// --- 5. Annual Savings Calculator (savings from cutting a cost) ------------
export const annualSavingsCalculator: CustomCalculator = (values) => {
  const currentCost = Math.max(0, safeNumber(values.currentCost, 120));
  const newCost = Math.max(0, safeNumber(values.newCost, 70));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 5));

  const annualSaving = (currentCost - newCost) * periodsPerYear;
  const monthlySaving = annualSaving / 12;
  const n = Math.round(years * 12);
  const invested = monthlySaving > 0 ? fvAnnuity(monthlySaving, annualRatePercent / 100 / 12, n) : monthlySaving * n;

  return {
    annualSaving: round2(annualSaving),
    monthlySaving: round2(monthlySaving),
    totalSavedOverPeriod: round2(monthlySaving * n),
    valueIfSaved: round2(invested),
  };
};

// --- 6. Daily Savings Calculator --------------------------------------------
export const dailySavingsCalculator: CustomCalculator = (values) => {
  const dailyAmount = Math.max(0, safeNumber(values.dailyAmount, 5));
  const daysPerWeek = Math.min(7, Math.max(1, Math.round(safeNumber(values.daysPerWeek, 7))));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 10));

  const perYear = dailyAmount * daysPerWeek * 52;
  const perMonth = perYear / 12;
  const n = Math.round(years * 12);
  const balance = fvAnnuity(perMonth, annualRatePercent / 100 / 12, n);

  return {
    savedPerWeek: round2(dailyAmount * daysPerWeek),
    savedPerMonth: round2(perMonth),
    savedPerYear: round2(perYear),
    balanceAfterPeriod: round2(balance),
    interestEarned: round2(balance - perMonth * n),
  };
};

// --- 7. Savings with Contributions (contribute, then stop and grow) --------
export const savingsWithContributionsCalculator: CustomCalculator = (values) => {
  const initialDeposit = Math.max(0, safeNumber(values.initialDeposit, 2000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 300));
  const annualIncreasePercent = Math.max(0, safeNumber(values.annualIncreasePercent, 2));
  const contributionYears = Math.max(0, safeNumber(values.contributionYears, 10));
  const totalYears = Math.max(0, safeNumber(values.totalYears, 20));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));

  const i = annualRatePercent / 100 / 12;
  const totalMonths = Math.round(Math.max(totalYears, contributionYears) * 12);
  const contributionMonths = Math.round(contributionYears * 12);
  let balance = initialDeposit;
  let contributed = initialDeposit;
  let contribution = monthlyContribution;
  let balanceWhenContributionsStop = contributionMonths === 0 ? initialDeposit : 0;
  for (let m = 1; m <= totalMonths; m++) {
    if (m > 1 && (m - 1) % 12 === 0) contribution *= 1 + annualIncreasePercent / 100;
    balance *= 1 + i;
    if (m <= contributionMonths) {
      balance += contribution;
      contributed += contribution;
    }
    if (m === contributionMonths) balanceWhenContributionsStop = balance;
  }

  return {
    finalBalance: round2(balance),
    balanceWhenContributionsStop: round2(balanceWhenContributionsStop),
    totalContributed: round2(contributed),
    interestEarned: round2(balance - contributed),
  };
};

// --- 8. Savings with Monthly Deposits (with vs without the deposits) -------
export const savingsWithMonthlyDepositsCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 10000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 250));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 10));

  const i = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);
  const withoutDeposits = startingBalance * Math.pow(1 + i, n);
  const fromDeposits = fvAnnuity(monthlyDeposit, i, n);
  const depositsTotal = monthlyDeposit * n;

  return {
    balanceWithDeposits: round2(withoutDeposits + fromDeposits),
    balanceWithoutDeposits: round2(withoutDeposits),
    extraFromDeposits: round2(fromDeposits),
    totalOfMonthlyDeposits: round2(depositsTotal),
    interestEarnedOnDeposits: round2(fromDeposits - depositsTotal),
  };
};

// --- 9. Savings with Annual Deposits (start vs end of year) ---------------
export const savingsWithAnnualDepositsCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 5000));
  const annualDeposit = Math.max(0, safeNumber(values.annualDeposit, 3000));
  const depositAtStartOfYear = safeNumber(values.depositAtStartOfYear, 1) >= 1;
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4.5));
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  const r = apyPercent / 100;
  const lump = startingBalance * Math.pow(1 + r, years);
  const endOfYear = fvAnnuity(annualDeposit, r, years);
  const startOfYear = endOfYear * (1 + r);
  const balance = lump + (depositAtStartOfYear ? startOfYear : endOfYear);
  const deposited = startingBalance + annualDeposit * years;

  return {
    finalBalance: round2(balance),
    totalDeposited: round2(deposited),
    interestEarned: round2(balance - deposited),
    extraFromDepositingAtStart: round2(startOfYear - endOfYear),
  };
};

// --- 10. Lump Sum Savings Calculator (tax on interest each year) -----------
export const lumpSumSavingsCalculator: CustomCalculator = (values) => {
  const lumpSum = Math.max(0, safeNumber(values.lumpSum, 25000));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4.5));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 22)));
  const years = Math.max(0, safeNumber(values.years, 5));

  const r = apyPercent / 100;
  const afterTaxRate = r * (1 - taxRatePercent / 100);
  const beforeTax = lumpSum * Math.pow(1 + r, years);
  const afterTax = lumpSum * Math.pow(1 + afterTaxRate, years);

  return {
    balanceAfterTax: round2(afterTax),
    balanceIfTaxFree: round2(beforeTax),
    interestAfterTax: round2(afterTax - lumpSum),
    taxCost: round2(beforeTax - afterTax),
    afterTaxApyPercent: round2(afterTaxRate * 100),
  };
};

// --- 11. Lump Sum vs Monthly Savings Calculator -----------------------------
export const lumpSumVsMonthlySavingsCalculator: CustomCalculator = (values) => {
  const totalAmount = Math.max(0, safeNumber(values.totalAmount, 12000));
  const spreadMonths = Math.max(1, Math.round(safeNumber(values.spreadMonths, 12)));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const horizonYears = Math.max(0, safeNumber(values.horizonYears, 5));

  const i = annualRatePercent / 100 / 12;
  const horizon = Math.max(spreadMonths, Math.round(horizonYears * 12));
  const lumpValue = totalAmount * Math.pow(1 + i, horizon);
  const monthlyDeposit = totalAmount / spreadMonths;
  const monthlyValue = fvAnnuity(monthlyDeposit, i, spreadMonths) * Math.pow(1 + i, horizon - spreadMonths);
  // Monthly deposit (over the same months) that would match the lump sum.
  const matchingDeposit = (totalAmount * Math.pow(1 + i, spreadMonths)) / fvAnnuity(1, i, spreadMonths);

  return {
    lumpSumValue: round2(lumpValue),
    monthlyDepositsValue: round2(monthlyValue),
    lumpSumAdvantage: round2(lumpValue - monthlyValue),
    monthlyDeposit: round2(monthlyDeposit),
    monthlyDepositToMatchLumpSum: round2(matchingDeposit),
  };
};

export const savingsSchedulesCustomCalculators: Record<string, CustomCalculator> = {
  "recurring-savings-calculator": recurringSavingsCalculator,
  "regular-savings-calculator": regularSavingsCalculator,
  "weekly-savings-calculator": weeklySavingsCalculator,
  "biweekly-savings-calculator": biweeklySavingsCalculator,
  "annual-savings-calculator": annualSavingsCalculator,
  "daily-savings-calculator": dailySavingsCalculator,
  "savings-with-contributions-calculator": savingsWithContributionsCalculator,
  "savings-with-monthly-deposits-calculator": savingsWithMonthlyDepositsCalculator,
  "savings-with-annual-deposits-calculator": savingsWithAnnualDepositsCalculator,
  "lump-sum-savings-calculator": lumpSumSavingsCalculator,
  "lump-sum-vs-monthly-savings-calculator": lumpSumVsMonthlySavingsCalculator,
};
