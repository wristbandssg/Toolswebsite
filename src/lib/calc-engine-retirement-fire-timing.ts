/**
 * Batch: "Retirement Calculators" sub-batch F (FIRE & Retirement Timing, 11
 * tools). Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * FIRE = Financial Independence, Retire Early. Returns here are REAL
 * (after inflation), so every dollar figure is in today's money — the usual
 * FIRE-community convention.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fireCalculator: the whole picture from income and spending — savings
 *    rate, FIRE number, years and age at financial independence.
 *  - fireNumberCalculator: the target alone, grossed up for health
 *    insurance before Medicare and tax on withdrawals.
 *  - coastFireCalculator: the amount that, left alone, grows into your FIRE
 *    number by retirement — and the age you hit it.
 *  - baristaFireCalculator: a smaller target because part-time work covers
 *    some spending.
 *  - leanFireCalculator: a lean budget vs your regular budget — the years a
 *    lean lifestyle saves.
 *  - fatFireCalculator: a big budget at a more cautious withdrawal rate, and
 *    the yearly saving to get there by a set time.
 *  - retirementBreakEvenCalculator: retire earlier on less income vs later
 *    on more — the age where the later choice catches up (any income, not
 *    just Social Security).
 *  - earlyRetirementCalculator: the "bridge" before 59½ — whether taxable
 *    savings cover spending and health insurance until retirement accounts
 *    open up.
 *  - retirementDateCalculator: time left in months, paychecks and workdays.
 *  - yearsToRetirementCalculator: years until savings reach a set target.
 *  - lifeExpectancyRetirementCalculator: expected lifespan from the IRS
 *    Single Life Table and the years of retirement to fund.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-fire-timing-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Longest horizon any "years to" result reports.
const MAX_YEARS = 100;

// Years (fractional) for `current` plus `annualSavings` a year (added
// monthly) at real annual return `r` to reach `target`; MAX_YEARS if never.
function yearsToTarget(target: number, current: number, annualSavings: number, r: number): number {
  if (current >= target) return 0;
  const i = Math.pow(1 + r, 1 / 12) - 1;
  const d = annualSavings / 12;
  let n: number;
  if (i === 0) {
    if (d <= 0) return MAX_YEARS;
    n = (target - current) / d;
  } else {
    const num = target * i + d;
    const den = current * i + d;
    if (den <= 0 || num <= 0) return MAX_YEARS;
    n = Math.log(num / den) / Math.log(1 + i);
  }
  return Math.min(MAX_YEARS, n / 12);
}

// --- 1. FIRE Calculator -------------------------------------------------------
export const fireCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(16, Math.round(safeNumber(values.currentAge, 30)));
  const annualIncome = Math.max(0, safeNumber(values.annualIncome, 90000));
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 45000));
  const currentInvestments = Math.max(0, safeNumber(values.currentInvestments, 60000));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));

  const fireNumber = annualExpenses / (withdrawalRatePercent / 100);
  const savings = Math.max(0, annualIncome - annualExpenses);
  const years = yearsToTarget(fireNumber, currentInvestments, savings, realReturnPercent / 100);

  return {
    yearsToFinancialIndependence: round2(years),
    fireNumber: round2(fireNumber),
    savingsRatePercent: annualIncome > 0 ? round2((savings / annualIncome) * 100) : 0,
    ageAtFinancialIndependence: round2(currentAge + years),
    annualSavings: round2(savings),
  };
};

// --- 2. FIRE Number Calculator (health insurance + tax) -------------------
export const fireNumberCalculator: CustomCalculator = (values) => {
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 50000));
  const healthInsuranceAnnual = Math.max(0, safeNumber(values.healthInsuranceAnnual, 9000));
  const withdrawalTaxRatePercent = Math.min(90, Math.max(0, safeNumber(values.withdrawalTaxRatePercent, 10)));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));

  const grossWithdrawal = (annualExpenses + healthInsuranceAnnual) / (1 - withdrawalTaxRatePercent / 100);
  const fireNumber = grossWithdrawal / (withdrawalRatePercent / 100);
  const simple = annualExpenses / (withdrawalRatePercent / 100);

  return {
    fireNumber: round2(fireNumber),
    grossAnnualWithdrawal: round2(grossWithdrawal),
    simpleFireNumber: round2(simple),
    extraForHealthcareAndTax: round2(fireNumber - simple),
    multipleOfExpenses: annualExpenses > 0 ? round2(fireNumber / annualExpenses) : 0,
  };
};

// --- 3. Coast FIRE Calculator ----------------------------------------------------
export const coastFireCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(16, Math.round(safeNumber(values.currentAge, 32)));
  const retirementAge = Math.max(currentAge, Math.round(safeNumber(values.retirementAge, 65)));
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 50000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));
  const currentInvestments = Math.max(0, safeNumber(values.currentInvestments, 150000));

  const r = realReturnPercent / 100;
  const fireNumber = annualExpenses / (withdrawalRatePercent / 100);
  const coastNumber = fireNumber / Math.pow(1 + r, retirementAge - currentAge);
  // Age at which today's balance, left alone, reaches the FIRE number.
  const yearsAlone = currentInvestments >= fireNumber ? 0 : r > 0 && currentInvestments > 0 ? Math.log(fireNumber / currentInvestments) / Math.log(1 + r) : MAX_YEARS;

  return {
    coastFireNumberToday: round2(coastNumber),
    aheadOrBehindCoastNumber: round2(currentInvestments - coastNumber),
    fireNumberAtRetirement: round2(fireNumber),
    ageYourBalanceAloneReachesFire: round2(Math.min(currentAge + yearsAlone, currentAge + MAX_YEARS)),
  };
};

// --- 4. Barista FIRE Calculator (part-time income) --------------------------
export const baristaFireCalculator: CustomCalculator = (values) => {
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 50000));
  const partTimeIncome = Math.max(0, safeNumber(values.partTimeIncome, 20000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));
  const currentInvestments = Math.max(0, safeNumber(values.currentInvestments, 200000));
  const annualSavings = Math.max(0, safeNumber(values.annualSavings, 30000));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));

  const wr = withdrawalRatePercent / 100;
  const barista = Math.max(0, annualExpenses - partTimeIncome) / wr;
  const full = annualExpenses / wr;
  const r = realReturnPercent / 100;

  return {
    baristaFireNumber: round2(barista),
    fullFireNumber: round2(full),
    lessYouNeedToSave: round2(full - barista),
    yearsToBaristaFire: round2(yearsToTarget(barista, currentInvestments, annualSavings, r)),
    yearsToFullFire: round2(yearsToTarget(full, currentInvestments, annualSavings, r)),
  };
};

// --- 5. Lean FIRE Calculator -------------------------------------------------------
export const leanFireCalculator: CustomCalculator = (values) => {
  const regularExpenses = Math.max(0, safeNumber(values.regularExpenses, 55000));
  const leanExpenses = Math.max(0, safeNumber(values.leanExpenses, 35000));
  const currentInvestments = Math.max(0, safeNumber(values.currentInvestments, 100000));
  const annualSavings = Math.max(0, safeNumber(values.annualSavings, 35000));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));

  const wr = withdrawalRatePercent / 100;
  const r = realReturnPercent / 100;
  const lean = leanExpenses / wr;
  const regular = regularExpenses / wr;
  const yLean = yearsToTarget(lean, currentInvestments, annualSavings, r);
  const yRegular = yearsToTarget(regular, currentInvestments, annualSavings, r);

  return {
    leanFireNumber: round2(lean),
    yearsToLeanFire: round2(yLean),
    regularFireNumber: round2(regular),
    yearsToRegularFire: round2(yRegular),
    yearsSavedByGoingLean: round2(yRegular - yLean),
  };
};

// --- 6. Fat FIRE Calculator ---------------------------------------------------------
export const fatFireCalculator: CustomCalculator = (values) => {
  const fatExpenses = Math.max(0, safeNumber(values.fatExpenses, 120000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 3.5));
  const currentInvestments = Math.max(0, safeNumber(values.currentInvestments, 500000));
  const annualSavings = Math.max(0, safeNumber(values.annualSavings, 80000));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));
  const targetYears = Math.max(1, Math.round(safeNumber(values.targetYears, 15)));

  const r = realReturnPercent / 100;
  const fat = fatExpenses / (withdrawalRatePercent / 100);
  // Yearly saving (added monthly) to reach the target in `targetYears`.
  const i = Math.pow(1 + r, 1 / 12) - 1;
  const n = targetYears * 12;
  const grown = currentInvestments * Math.pow(1 + i, n);
  const factor = i === 0 ? n : (Math.pow(1 + i, n) - 1) / i;
  const neededAnnual = Math.max(0, ((fat - grown) / factor) * 12);

  return {
    fatFireNumber: round2(fat),
    yearsToFatFire: round2(yearsToTarget(fat, currentInvestments, annualSavings, r)),
    annualSavingsForTargetYears: round2(neededAnnual),
    extraVsFourPercentRule: round2(fat - fatExpenses * 25),
  };
};

// --- 7. Retirement Break-Even Calculator (retire earlier vs later) ---------
export const retirementBreakEvenCalculator: CustomCalculator = (values) => {
  const earlierAge = Math.max(40, safeNumber(values.earlierAge, 62));
  const earlierAnnualIncome = Math.max(0, safeNumber(values.earlierAnnualIncome, 30000));
  const laterAge = Math.max(earlierAge, safeNumber(values.laterAge, 65));
  const laterAnnualIncome = Math.max(0, safeNumber(values.laterAnnualIncome, 40000));

  const gapYears = laterAge - earlierAge;
  const forgone = earlierAnnualIncome * gapYears;
  const extra = laterAnnualIncome - earlierAnnualIncome;
  const breakEven = extra > 0 ? laterAge + forgone / extra : 0;
  const totalBy = (age: number, start: number, income: number) => Math.max(0, age - start) * income;

  return {
    // 0 = the later choice never catches up (it doesn't pay more).
    breakEvenAge: round2(breakEven),
    incomeGivenUpByWaiting: round2(forgone),
    extraIncomePerYearByWaiting: round2(Math.max(0, extra)),
    totalBy85Earlier: round2(totalBy(85, earlierAge, earlierAnnualIncome)),
    totalBy85Later: round2(totalBy(85, laterAge, laterAnnualIncome)),
  };
};

// --- 8. Early Retirement Calculator (bridge to 59½ and 65) ---------------
export const earlyRetirementCalculator: CustomCalculator = (values) => {
  const retirementAge = Math.max(30, Math.min(59, safeNumber(values.retirementAge, 50)));
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 50000));
  const healthInsuranceAnnual = Math.max(0, safeNumber(values.healthInsuranceAnnual, 10000));
  const taxableSavings = Math.max(0, safeNumber(values.taxableSavings, 500000));
  const retirementAccounts = Math.max(0, safeNumber(values.retirementAccounts, 600000));
  const realReturnPercent = Math.max(0, safeNumber(values.realReturnPercent, 5));

  // Month by month until 59½, spending (and health cover) from taxable
  // savings while retirement accounts grow untouched.
  const i = Math.pow(1 + realReturnPercent / 100, 1 / 12) - 1;
  const months = Math.round((59.5 - retirementAge) * 12);
  const monthlyNeed = (annualExpenses + healthInsuranceAnnual) / 12;
  let taxable = taxableSavings;
  let bridgeRunsOutAge = 0;
  for (let m = 0; m < months; m++) {
    taxable = taxable * (1 + i) - monthlyNeed;
    if (taxable < 0 && !bridgeRunsOutAge) bridgeRunsOutAge = retirementAge + (m + 1) / 12;
  }

  return {
    taxableSavingsLeftAt59AndHalf: round2(taxable),
    bridgeYears: round2(months / 12),
    // 0 = taxable savings last the whole bridge.
    ageTaxableSavingsRunOut: round2(bridgeRunsOutAge),
    retirementAccountsAt59AndHalf: round2(retirementAccounts * Math.pow(1 + i, months)),
    yearsUntilMedicareAt65: round2(65 - retirementAge),
  };
};

// --- 9. Retirement Date Calculator (time left) -------------------------------
export const retirementDateCalculator: CustomCalculator = (values) => {
  const currentAgeYears = Math.max(0, Math.round(safeNumber(values.currentAgeYears, 48)));
  const currentAgeExtraMonths = Math.min(11, Math.max(0, Math.round(safeNumber(values.currentAgeExtraMonths, 4))));
  const retirementAgeYears = Math.max(0, Math.round(safeNumber(values.retirementAgeYears, 65)));
  const retirementAgeExtraMonths = Math.min(11, Math.max(0, Math.round(safeNumber(values.retirementAgeExtraMonths, 0))));

  const months = Math.max(0, retirementAgeYears * 12 + retirementAgeExtraMonths - (currentAgeYears * 12 + currentAgeExtraMonths));

  return {
    monthsUntilRetirement: months,
    yearsUntilRetirement: round2(months / 12),
    biweeklyPaychecksLeft: Math.floor((months * 26) / 12),
    // About 250 workdays a year (weekdays less ~10 holidays).
    workdaysLeft: Math.round((months * 250) / 12),
    weeksLeft: Math.round((months * 52) / 12),
  };
};

// --- 10. Years to Retirement Calculator (savings reach a target) ----------
export const yearsToRetirementCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(16, Math.round(safeNumber(values.currentAge, 38)));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 120000));
  const annualContribution = Math.max(0, safeNumber(values.annualContribution, 18000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const targetNestEgg = Math.max(0, safeNumber(values.targetNestEgg, 1200000));

  const years = yearsToTarget(targetNestEgg, currentSavings, annualContribution, annualReturnPercent / 100);

  return {
    // 100 means 100 years or more.
    yearsToReachTarget: round2(years),
    ageWhenYouReachIt: round2(currentAge + years),
    totalYouContribute: round2(annualContribution * years),
  };
};

// --- 11. Life Expectancy Retirement Calculator -------------------------------
// Treas. Reg. §1.401(a)(9)-9(b) Single Life Table (years remaining), 0–120.
const SINGLE_LIFE: number[] = [
  84.6, 83.7, 82.8, 81.8, 80.8, 79.8, 78.8, 77.9, 76.9, 75.9, 74.9, 73.9, 72.9, 71.9, 70.9, 69.9, 69.0, 68.0, 67.0,
  66.0, 65.0, 64.1, 63.1, 62.1, 61.1, 60.2, 59.2, 58.2, 57.3, 56.3, 55.3, 54.4, 53.4, 52.5, 51.5, 50.5, 49.6, 48.6,
  47.7, 46.7, 45.7, 44.8, 43.8, 42.9, 41.9, 41.0, 40.0, 39.0, 38.1, 37.1, 36.2, 35.3, 34.3, 33.4, 32.5, 31.6, 30.6,
  29.8, 28.9, 28.0, 27.1, 26.2, 25.4, 24.5, 23.7, 22.9, 22.0, 21.2, 20.4, 19.6, 18.8, 18.0, 17.2, 16.4, 15.6, 14.8,
  14.1, 13.3, 12.6, 11.9, 11.2, 10.5, 9.9, 9.3, 8.7, 8.1, 7.6, 7.1, 6.6, 6.1, 5.7, 5.3, 4.9, 4.6, 4.3, 4.0, 3.7,
  3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.3, 2.2, 2.1, 2.1, 2.1, 2.0, 2.0, 2.0, 2.0, 2.0, 1.9, 1.9, 1.8, 1.8, 1.6, 1.4,
  1.1, 1.0,
];

export const lifeExpectancyRetirementCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, Math.min(120, Math.round(safeNumber(values.currentAge, 55))));
  const retirementAge = Math.max(0, Math.round(safeNumber(values.retirementAge, 65)));
  const annualSpending = Math.max(0, safeNumber(values.annualSpending, 50000));
  const extraYearsBuffer = Math.max(0, Math.round(safeNumber(values.extraYearsBuffer, 5)));

  const remaining = SINGLE_LIFE[currentAge];
  const expectedAge = currentAge + remaining;
  const planToAge = expectedAge + extraYearsBuffer;
  const yearsToFund = Math.max(0, planToAge - Math.max(retirementAge, currentAge));

  return {
    expectedAge: round2(expectedAge),
    yearsRemaining: remaining,
    planToAge: round2(planToAge),
    retirementYearsToFund: round2(yearsToFund),
    totalSpendingToFund: round2(yearsToFund * annualSpending),
  };
};

export const retirementFireTimingCustomCalculators: Record<string, CustomCalculator> = {
  "fire-calculator": fireCalculator,
  "fire-number-calculator": fireNumberCalculator,
  "coast-fire-calculator": coastFireCalculator,
  "barista-fire-calculator": baristaFireCalculator,
  "lean-fire-calculator": leanFireCalculator,
  "fat-fire-calculator": fatFireCalculator,
  "retirement-break-even-calculator": retirementBreakEvenCalculator,
  "early-retirement-calculator": earlyRetirementCalculator,
  "retirement-date-calculator": retirementDateCalculator,
  "years-to-retirement-calculator": yearsToRetirementCalculator,
  "life-expectancy-retirement-calculator": lifeExpectancyRetirementCalculator,
};
