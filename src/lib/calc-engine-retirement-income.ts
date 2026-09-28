/**
 * Batch: "Retirement Calculators" sub-batch B (Income & Withdrawals, 10
 * tools). Part of the Retirement Calculators build-out — see
 * calc-engine-retirement-planning.ts for the full list of 7 sub-batches.
 * Filed under Finance Calculators > Retirement Calculators.
 *
 * Near-namesakes, and how each is deliberately different (none repeats
 * retirement-withdrawal-calculator, which runs a FLAT withdrawal down):
 *  - retirementIncomeCalculator: adds up every income source — savings at a
 *    withdrawal rate, Social Security, pension, annuity, part-time work.
 *  - safeWithdrawalRateCalculator: SOLVES for the starting withdrawal rate
 *    that lasts exactly N years with inflation-rising withdrawals.
 *  - fourPercentRuleCalculator: applies a fixed rule % — first-year
 *    withdrawal, what it becomes in years 10 and 30, and the "25x" target.
 *  - retirementDrawdownCalculator: a "bridge" drawdown — spending comes
 *    entirely from savings until Social Security starts at a later age.
 *  - retirementIncomeReplacementCalculator: the replacement ratio you need,
 *    built from what stops at retirement (saving, payroll tax, work costs).
 *  - retirementSpendingCalculator: "go-go / slow-go / no-go" spending phases
 *    and the nest egg that pattern needs vs flat spending.
 *  - retirementBudgetCalculator: an itemized retirement budget less
 *    guaranteed income, and the savings it takes to fund the rest.
 *  - retirementLongevityCalculator: whether savings outlast you — the AGE
 *    money runs out vs the age you plan to live to.
 *  - retirementInflationCalculator: today's expenses priced at the start and
 *    end of retirement, and the total over the whole retirement.
 *  - inflationAdjustedRetirementIncomeCalculator: a fixed pension vs one
 *    with a cost-of-living adjustment (COLA), in today's money.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-retirement-income-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Present value, at the start of year 1, of `years` yearly amounts paid at
// the START of each year, the first being `first`, rising by `g` a year and
// discounted at `r`.
function growingAnnuityDue(first: number, g: number, r: number, years: number): number {
  const q = (1 + g) / (1 + r);
  if (years <= 0) return 0;
  return Math.abs(q - 1) < 1e-12 ? first * years : (first * (1 - Math.pow(q, years))) / (1 - q);
}

// --- 1. Retirement Income Calculator (all sources) -------------------------
export const retirementIncomeCalculator: CustomCalculator = (values) => {
  const savingsBalance = Math.max(0, safeNumber(values.savingsBalance, 750000));
  const withdrawalRatePercent = Math.max(0, safeNumber(values.withdrawalRatePercent, 4));
  const socialSecurityMonthly = Math.max(0, safeNumber(values.socialSecurityMonthly, 2400));
  const pensionMonthly = Math.max(0, safeNumber(values.pensionMonthly, 800));
  const annuityMonthly = Math.max(0, safeNumber(values.annuityMonthly, 0));
  const partTimeMonthly = Math.max(0, safeNumber(values.partTimeMonthly, 500));

  const fromSavings = (savingsBalance * withdrawalRatePercent) / 100 / 12;
  const total = fromSavings + socialSecurityMonthly + pensionMonthly + annuityMonthly + partTimeMonthly;

  return {
    totalMonthlyIncome: round2(total),
    totalAnnualIncome: round2(total * 12),
    monthlyFromSavings: round2(fromSavings),
    guaranteedMonthlyIncome: round2(socialSecurityMonthly + pensionMonthly + annuityMonthly),
    shareFromSavingsPercent: total > 0 ? round2((fromSavings / total) * 100) : 0,
  };
};

// --- 2. Safe Withdrawal Rate Calculator (rate that lasts N years) --------
export const safeWithdrawalRateCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 1000000));
  const years = Math.max(1, Math.round(safeNumber(values.years, 30)));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const firstYear = balance / growingAnnuityDue(1, inflationPercent / 100, annualReturnPercent / 100, years);

  return {
    safeWithdrawalRatePercent: balance > 0 ? round2((firstYear / balance) * 100) : 0,
    firstYearWithdrawal: round2(firstYear),
    firstYearMonthly: round2(firstYear / 12),
    finalYearWithdrawal: round2(firstYear * Math.pow(1 + inflationPercent / 100, years - 1)),
  };
};

// --- 3. 4% Rule Calculator ---------------------------------------------------
export const fourPercentRuleCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 800000));
  const rulePercent = Math.max(0.1, safeNumber(values.rulePercent, 4));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));
  const targetAnnualSpending = Math.max(0, safeNumber(values.targetAnnualSpending, 50000));

  const first = (balance * rulePercent) / 100;
  const g = 1 + inflationPercent / 100;

  return {
    firstYearWithdrawal: round2(first),
    monthlyWithdrawal: round2(first / 12),
    year10Withdrawal: round2(first * Math.pow(g, 9)),
    year30Withdrawal: round2(first * Math.pow(g, 29)),
    nestEggForTargetSpending: round2(targetAnnualSpending / (rulePercent / 100)),
  };
};

// --- 4. Retirement Drawdown Calculator (bridge to Social Security) -------
export const retirementDrawdownCalculator: CustomCalculator = (values) => {
  const retirementAge = Math.max(40, Math.round(safeNumber(values.retirementAge, 62)));
  const balance = Math.max(0, safeNumber(values.balance, 600000));
  const annualSpending = Math.max(0, safeNumber(values.annualSpending, 55000));
  const socialSecurityStartAge = Math.max(retirementAge, Math.round(safeNumber(values.socialSecurityStartAge, 70)));
  const socialSecurityAnnual = Math.max(0, safeNumber(values.socialSecurityAnnual, 36000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  // Yearly steps; spending and Social Security both rise with inflation
  // (Social Security's COLA). Withdrawals at the start of each year.
  const r = annualReturnPercent / 100;
  const g = 1 + inflationPercent / 100;
  let running = balance;
  let runsOutAge = 0;
  let balanceWhenSsStarts = balance;
  let bridgeCost = 0;
  for (let age = retirementAge; age < 120; age++) {
    const k = age - retirementAge;
    if (age === socialSecurityStartAge) balanceWhenSsStarts = running;
    const spend = annualSpending * Math.pow(g, k);
    const ss = age >= socialSecurityStartAge ? socialSecurityAnnual * Math.pow(g, k) : 0;
    const need = Math.max(0, spend - ss);
    if (age < socialSecurityStartAge) bridgeCost += need;
    if (need > running) {
      runsOutAge = age;
      break;
    }
    running = (running - need) * (1 + r);
  }

  return {
    // 0 means the money lasts past age 120.
    ageMoneyRunsOut: runsOutAge,
    balanceWhenSocialSecurityStarts: round2(runsOutAge && runsOutAge <= socialSecurityStartAge ? 0 : balanceWhenSsStarts),
    bridgeYears: socialSecurityStartAge - retirementAge,
    bridgeWithdrawalsTotal: round2(bridgeCost),
  };
};

// --- 5. Retirement Income Replacement Calculator ---------------------------
export const retirementIncomeReplacementCalculator: CustomCalculator = (values) => {
  const annualSalary = Math.max(0, safeNumber(values.annualSalary, 90000));
  const currentSavingsRatePercent = Math.max(0, safeNumber(values.currentSavingsRatePercent, 10));
  const payrollTaxPercent = Math.max(0, safeNumber(values.payrollTaxPercent, 7.65));
  const workCostsPercent = Math.max(0, safeNumber(values.workCostsPercent, 5));
  const newCostsPercent = Math.max(0, safeNumber(values.newCostsPercent, 3));

  // Spending that stops (saving, payroll tax, commuting/work costs) no
  // longer needs replacing; new costs in retirement (e.g. healthcare) do.
  const ratio = Math.max(0, 100 - currentSavingsRatePercent - payrollTaxPercent - workCostsPercent + newCostsPercent);
  const annual = (annualSalary * ratio) / 100;

  return {
    replacementRatioPercent: round2(ratio),
    annualIncomeNeeded: round2(annual),
    monthlyIncomeNeeded: round2(annual / 12),
    incomeYouNoLongerNeed: round2(annualSalary - annual),
  };
};

// --- 6. Retirement Spending Calculator (go-go / slow-go / no-go) ---------
export const retirementSpendingCalculator: CustomCalculator = (values) => {
  const retirementAge = Math.max(40, Math.round(safeNumber(values.retirementAge, 65)));
  const planToAge = Math.max(retirementAge + 1, Math.round(safeNumber(values.planToAge, 95)));
  const baseAnnualSpending = Math.max(0, safeNumber(values.baseAnnualSpending, 60000));
  const slowGoPercent = Math.max(0, safeNumber(values.slowGoPercent, 85));
  const noGoPercent = Math.max(0, safeNumber(values.noGoPercent, 75));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));

  const r = 1 + annualReturnPercent / 100;
  const g = 1 + inflationPercent / 100;
  let pvPhased = 0;
  let pvFlat = 0;
  let totalPhased = 0;
  for (let age = retirementAge; age < planToAge; age++) {
    const k = age - retirementAge;
    // Go-go until 75, slow-go 75–84, no-go from 85.
    const share = age < 75 ? 1 : age < 85 ? slowGoPercent / 100 : noGoPercent / 100;
    const spend = baseAnnualSpending * share * Math.pow(g, k);
    totalPhased += spend;
    pvPhased += spend / Math.pow(r, k);
    pvFlat += (baseAnnualSpending * Math.pow(g, k)) / Math.pow(r, k);
  }

  return {
    nestEggNeededPhased: round2(pvPhased),
    nestEggNeededFlat: round2(pvFlat),
    savedByPhasedSpending: round2(pvFlat - pvPhased),
    lifetimeSpendingPhased: round2(totalPhased),
  };
};

// --- 7. Retirement Budget Calculator (itemized) ----------------------------
export const retirementBudgetCalculator: CustomCalculator = (values) => {
  const housing = Math.max(0, safeNumber(values.housing, 1500));
  const food = Math.max(0, safeNumber(values.food, 700));
  const healthcare = Math.max(0, safeNumber(values.healthcare, 600));
  const transportation = Math.max(0, safeNumber(values.transportation, 400));
  const utilities = Math.max(0, safeNumber(values.utilities, 350));
  const travelAndLeisure = Math.max(0, safeNumber(values.travelAndLeisure, 500));
  const other = Math.max(0, safeNumber(values.other, 450));
  const guaranteedMonthlyIncome = Math.max(0, safeNumber(values.guaranteedMonthlyIncome, 2800));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));

  const monthly = housing + food + healthcare + transportation + utilities + travelAndLeisure + other;
  const gap = Math.max(0, monthly - guaranteedMonthlyIncome);

  return {
    monthlyBudget: round2(monthly),
    annualBudget: round2(monthly * 12),
    monthlyGapFromSavings: round2(gap),
    savingsNeededForGap: round2((gap * 12) / (withdrawalRatePercent / 100)),
    healthcareSharePercent: monthly > 0 ? round2((healthcare / monthly) * 100) : 0,
  };
};

// --- 8. Retirement Longevity Calculator (age money runs out) ---------------
export const retirementLongevityCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(40, Math.round(safeNumber(values.currentAge, 65)));
  const balance = Math.max(0, safeNumber(values.balance, 700000));
  const annualWithdrawal = Math.max(0, safeNumber(values.annualWithdrawal, 42000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 2.5));
  const planToAge = Math.max(currentAge, Math.round(safeNumber(values.planToAge, 95)));

  const r = annualReturnPercent / 100;
  const g = 1 + inflationPercent / 100;
  let running = balance;
  let runsOut = 0;
  let balanceAtPlanAge = 0;
  for (let age = currentAge; age < 120; age++) {
    if (age === planToAge) balanceAtPlanAge = running;
    const w = annualWithdrawal * Math.pow(g, age - currentAge);
    if (w > running) {
      runsOut = age;
      break;
    }
    running = (running - w) * (1 + r);
  }
  const lastsTo = runsOut === 0 ? 120 : runsOut;

  return {
    // 0 means it lasts past age 120.
    ageMoneyRunsOut: runsOut,
    yearsBeyondOrShortOfPlan: lastsTo - planToAge,
    balanceAtPlanAge: round2(runsOut !== 0 && runsOut <= planToAge ? 0 : balanceAtPlanAge),
    firstYearWithdrawalRatePercent: balance > 0 ? round2((annualWithdrawal / balance) * 100) : 0,
  };
};

// --- 9. Retirement Inflation Calculator ------------------------------------
export const retirementInflationCalculator: CustomCalculator = (values) => {
  const annualExpensesToday = Math.max(0, safeNumber(values.annualExpensesToday, 50000));
  const yearsToRetirement = Math.max(0, Math.round(safeNumber(values.yearsToRetirement, 20)));
  const yearsInRetirement = Math.max(1, Math.round(safeNumber(values.yearsInRetirement, 30)));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));

  const g = 1 + inflationPercent / 100;
  const first = annualExpensesToday * Math.pow(g, yearsToRetirement);
  const last = first * Math.pow(g, yearsInRetirement - 1);
  const total = Math.abs(g - 1) < 1e-12 ? first * yearsInRetirement : (first * (Math.pow(g, yearsInRetirement) - 1)) / (g - 1);

  return {
    expensesFirstYearOfRetirement: round2(first),
    expensesFinalYearOfRetirement: round2(last),
    totalExpensesOverRetirement: round2(total),
    // What $100 of spending money is worth, in today's terms, at retirement.
    valueOf100AtRetirement: round2(100 / Math.pow(g, yearsToRetirement)),
  };
};

// --- 10. Inflation-Adjusted Retirement Income (fixed vs COLA) -------------
export const inflationAdjustedRetirementIncomeCalculator: CustomCalculator = (values) => {
  const monthlyIncome = Math.max(0, safeNumber(values.monthlyIncome, 3000));
  const years = Math.max(0, Math.round(safeNumber(values.years, 20)));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const colaPercent = Math.max(0, safeNumber(values.colaPercent, 2));

  const deflator = Math.pow(1 + inflationPercent / 100, years);
  const fixedReal = monthlyIncome / deflator;
  const colaNominal = monthlyIncome * Math.pow(1 + colaPercent / 100, years);

  return {
    fixedIncomeTodaysMoney: round2(fixedReal),
    buyingPowerLostPercent: round2((1 - 1 / deflator) * 100),
    colaIncomeInFutureDollars: round2(colaNominal),
    colaIncomeTodaysMoney: round2(colaNominal / deflator),
    colaNeededToKeepPace: round2(inflationPercent),
  };
};

export const retirementIncomeCustomCalculators: Record<string, CustomCalculator> = {
  "retirement-income-calculator": retirementIncomeCalculator,
  "safe-withdrawal-rate-calculator": safeWithdrawalRateCalculator,
  "4-percent-rule-calculator": fourPercentRuleCalculator,
  "retirement-drawdown-calculator": retirementDrawdownCalculator,
  "retirement-income-replacement-calculator": retirementIncomeReplacementCalculator,
  "retirement-spending-calculator": retirementSpendingCalculator,
  "retirement-budget-calculator": retirementBudgetCalculator,
  "retirement-longevity-calculator": retirementLongevityCalculator,
  "retirement-inflation-calculator": retirementInflationCalculator,
  "inflation-adjusted-retirement-income-calculator": inflationAdjustedRetirementIncomeCalculator,
};
