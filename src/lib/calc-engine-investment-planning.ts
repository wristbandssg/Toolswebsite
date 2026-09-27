/**
 * Batch: "Investment Calculators" sub-batch B (Growth, Goals & Time Value,
 * 10 tools). Part of the Investment Calculators tool-list build-out — see
 * calc-engine-investment-returns.ts for the full batch context, the 6
 * skipped duplicates, and the other 3 sub-batches.
 *
 * Deliberate differentiation (this cluster sits next to the existing
 * investment-calculator — lump sum + fixed monthly contribution — and the
 * Interest Calculators' compound/contribution tools):
 *  - compoundInvestmentCalculator: monthly contributions that STEP UP by a
 *    set % every year (raises/inflation), which none of the existing tools
 *    model.
 *  - investmentGrowthCalculator: lump sum only, annual compounding, and a
 *    milestone table every 5 years out to 30 (the Interest Accumulation
 *    tool shows years 1-10 of an interest rate instead).
 *  - investmentGoalCalculator: an "am I on track?" check — projected value
 *    vs a goal, the surplus/shortfall, and the extra monthly amount needed.
 *  - investmentContributionCalculator: solves for the contribution needed
 *    at a chosen frequency (weekly ... annual), using the periodic rate
 *    EQUIVALENT to the annual return, so changing frequency doesn't quietly
 *    change the underlying return.
 *  - investmentTimeHorizonCalculator: solves for TIME to reach a target.
 *  - investmentFutureValueCalculator: textbook TVM future value (any
 *    payment frequency, ordinary annuity or annuity due) with the lump-sum
 *    and payment-stream parts shown separately.
 *  - investmentPresentValueCalculator: the reverse — discounts a future
 *    lump sum and a stream of annual payments back to today.
 *  - lumpSumVsDollarCostAveragingCalculator: deterministic comparison of
 *    investing all at once vs spreading it out, with idle cash earning a
 *    cash yield in the meantime.
 *  - ruleOf72Calculator: the mental-math shortcut (72, 70, 69.3) compared
 *    to the exact answer.
 *  - investmentDoublingTimeCalculator: exact doubling and tripling time
 *    with monthly compounding, AND doubling time when you keep adding
 *    monthly contributions.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-investment-planning-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Future value of a level payment stream (end of period) — the standard
// annuity factor, with the zero-rate limit handled.
function annuityFactor(i: number, n: number): number {
  return i === 0 ? n : (Math.pow(1 + i, n) - 1) / i;
}

// --- 1. Compound Investment Calculator (step-up contributions) --------------
export const compoundInvestmentCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 10000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 300));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const annualIncreasePercent = safeNumber(values.annualIncreasePercent, 0);
  const years = Math.min(60, Math.max(0, Math.round(safeNumber(values.years, 20))));

  const i = annualReturnPercent / 100 / 12;
  let balance = initialInvestment;
  let totalContributed = initialInvestment;

  for (let year = 1; year <= years; year++) {
    const contributionThisYear = monthlyContribution * Math.pow(1 + annualIncreasePercent / 100, year - 1);
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + i) + contributionThisYear;
      totalContributed += contributionThisYear;
    }
  }

  return {
    endingBalance: round2(balance),
    totalContributed: round2(totalContributed),
    totalGrowth: round2(balance - totalContributed),
  };
};

// --- 2. Investment Growth Calculator (5-year milestones to 30) --------------
export const investmentGrowthCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 25000));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const growth = 1 + annualReturnPercent / 100;
  const valueAt = (year: number) => round2(initialInvestment * Math.pow(growth, year));

  return {
    valueYear5: valueAt(5),
    valueYear10: valueAt(10),
    valueYear15: valueAt(15),
    valueYear20: valueAt(20),
    valueYear25: valueAt(25),
    valueYear30: valueAt(30),
  };
};

// --- 3. Investment Goal Calculator (on-track check) -------------------------
export const investmentGoalCalculator: CustomCalculator = (values) => {
  const goalAmount = Math.max(0, safeNumber(values.goalAmount, 750000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 50000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 800));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const years = Math.max(0, safeNumber(values.years, 20));

  const i = annualReturnPercent / 100 / 12;
  const n = Math.round(years * 12);
  const factor = annuityFactor(i, n);
  const projectedValue = currentSavings * Math.pow(1 + i, n) + monthlyContribution * factor;
  const shortfall = Math.max(0, goalAmount - projectedValue);

  return {
    projectedValue: round2(projectedValue),
    surplusOrShortfall: round2(projectedValue - goalAmount),
    extraMonthlyNeeded: factor > 0 ? round2(shortfall / factor) : 0,
  };
};

// --- 4. Investment Contribution Calculator (solve for contribution) ---------
export const investmentContributionCalculator: CustomCalculator = (values) => {
  const targetAmount = Math.max(0, safeNumber(values.targetAmount, 250000));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 20000));
  const years = Math.max(0, safeNumber(values.years, 15));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const contributionsPerYear = Math.max(1, safeNumber(values.contributionsPerYear, 12));

  // Periodic rate equivalent to the annual return (not simply annual / f).
  const i = Math.pow(1 + annualReturnPercent / 100, 1 / contributionsPerYear) - 1;
  const n = Math.round(contributionsPerYear * years);
  const factor = annuityFactor(i, n);
  const balanceGrowth = currentBalance * Math.pow(1 + i, n);
  const contributionPerPeriod = factor > 0 ? Math.max(0, (targetAmount - balanceGrowth) / factor) : 0;
  const totalContributions = contributionPerPeriod * n;

  return {
    contributionPerPeriod: round2(contributionPerPeriod),
    annualContributionTotal: round2(contributionPerPeriod * contributionsPerYear),
    totalContributions: round2(totalContributions),
    growthFromReturns: round2(Math.max(targetAmount, balanceGrowth) - currentBalance - totalContributions),
  };
};

// --- 5. Investment Time Horizon Calculator (solve for time) -----------------
export const investmentTimeHorizonCalculator: CustomCalculator = (values) => {
  const currentValue = Math.max(0, safeNumber(values.currentValue, 30000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 500));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 7));
  const targetValue = Math.max(0, safeNumber(values.targetValue, 300000));

  if (targetValue <= currentValue) {
    return { yearsNeeded: 0, monthsNeeded: 0, totalContributed: round2(currentValue) };
  }

  const i = annualReturnPercent / 100 / 12;
  let exactMonths: number;
  if (i === 0) {
    exactMonths = monthlyContribution > 0 ? (targetValue - currentValue) / monthlyContribution : Infinity;
  } else {
    const denominator = currentValue * i + monthlyContribution;
    exactMonths = denominator > 0 ? Math.log((targetValue * i + monthlyContribution) / denominator) / Math.log(1 + i) : Infinity;
  }

  // Unreachable (nothing invested and nothing added) — report zeros rather
  // than an infinite horizon; the Assumptions text explains this.
  if (!Number.isFinite(exactMonths)) {
    return { yearsNeeded: 0, monthsNeeded: 0, totalContributed: 0 };
  }

  const monthsNeeded = Math.ceil(exactMonths - 1e-9);
  return {
    yearsNeeded: round2(exactMonths / 12),
    monthsNeeded,
    totalContributed: round2(currentValue + monthlyContribution * monthsNeeded),
  };
};

// --- 6. Investment Future Value Calculator (TVM, any frequency) -------------
export const investmentFutureValueCalculator: CustomCalculator = (values) => {
  const presentValue = Math.max(0, safeNumber(values.presentValue, 10000));
  const paymentPerPeriod = Math.max(0, safeNumber(values.paymentPerPeriod, 250));
  const annualRatePercent = safeNumber(values.annualRatePercent, 6);
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 12));
  const years = Math.max(0, safeNumber(values.years, 15));
  const paymentTiming = safeNumber(values.paymentTiming, 0); // 0 = end, 1 = beginning

  const i = annualRatePercent / 100 / periodsPerYear;
  const n = Math.round(periodsPerYear * years);
  const fvOfPresentValue = presentValue * Math.pow(1 + i, n);
  let fvOfPayments = paymentPerPeriod * annuityFactor(i, n);
  if (paymentTiming === 1) fvOfPayments *= 1 + i;

  return {
    futureValue: round2(fvOfPresentValue + fvOfPayments),
    fvOfPresentValue: round2(fvOfPresentValue),
    fvOfPayments: round2(fvOfPayments),
    totalPaid: round2(presentValue + paymentPerPeriod * n),
  };
};

// --- 7. Investment Present Value Calculator ---------------------------------
export const investmentPresentValueCalculator: CustomCalculator = (values) => {
  const futureValue = Math.max(0, safeNumber(values.futureValue, 100000));
  const annualPayment = Math.max(0, safeNumber(values.annualPayment, 0));
  const discountRatePercent = safeNumber(values.discountRatePercent, 6);
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  const r = discountRatePercent / 100;
  const pvOfFutureValue = futureValue / Math.pow(1 + r, years);
  const pvOfPayments = r === 0 ? annualPayment * years : annualPayment * ((1 - Math.pow(1 + r, -years)) / r);
  const presentValue = pvOfFutureValue + pvOfPayments;

  return {
    presentValue: round2(presentValue),
    pvOfFutureValue: round2(pvOfFutureValue),
    pvOfPayments: round2(pvOfPayments),
    totalDiscount: round2(futureValue + annualPayment * years - presentValue),
  };
};

// --- 8. Lump Sum vs Dollar-Cost Averaging Calculator ------------------------
// Deterministic: the market is assumed to rise smoothly at the expected
// return. DCA invests an equal tranche at the start of each month; money
// not yet invested earns the cash yield and is added back at the end.
export const lumpSumVsDollarCostAveragingCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 60000));
  const months = Math.min(60, Math.max(1, Math.round(safeNumber(values.months, 12))));
  const expectedReturnPercent = safeNumber(values.expectedReturnPercent, 8);
  const cashYieldPercent = safeNumber(values.cashYieldPercent, 0);

  const monthlyMarket = Math.pow(1 + expectedReturnPercent / 100, 1 / 12) - 1;
  const monthlyCash = Math.pow(1 + cashYieldPercent / 100, 1 / 12) - 1;
  const tranche = amount / months;

  const lumpSumValue = amount * Math.pow(1 + monthlyMarket, months);

  let invested = 0;
  let cash = amount;
  for (let m = 0; m < months; m++) {
    invested += tranche;
    cash -= tranche;
    invested *= 1 + monthlyMarket;
    cash *= 1 + monthlyCash;
  }
  const dcaValue = invested + cash;

  return {
    lumpSumValue: round2(lumpSumValue),
    dcaValue: round2(dcaValue),
    difference: round2(lumpSumValue - dcaValue),
  };
};

// --- 9. Rule of 72 Calculator ------------------------------------------------
export const ruleOf72Calculator: CustomCalculator = (values) => {
  const annualReturnPercent = Math.max(0.01, safeNumber(values.annualReturnPercent, 8));
  const exactYears = Math.log(2) / Math.log(1 + annualReturnPercent / 100);
  const ruleOf72Years = 72 / annualReturnPercent;

  return {
    ruleOf72Years: round2(ruleOf72Years),
    ruleOf70Years: round2(70 / annualReturnPercent),
    ruleOf69Years: round2(69.3 / annualReturnPercent),
    exactYears: round2(exactYears),
    ruleOf72ErrorYears: round2(ruleOf72Years - exactYears),
  };
};

// --- 10. Investment Doubling Time Calculator (with contributions) -----------
export const investmentDoublingTimeCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0.01, safeNumber(values.initialInvestment, 10000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 0));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 7));

  const i = annualReturnPercent / 100 / 12;
  if (i === 0) {
    return {
      doublingYears: 0,
      doublingYearsWithContributions: monthlyContribution > 0 ? round2(initialInvestment / monthlyContribution / 12) : 0,
      triplingYears: 0,
    };
  }

  const logGrowth = Math.log(1 + i);
  const doublingMonths = Math.log(2) / logGrowth;
  const doublingWithContributionsMonths =
    Math.log((2 * initialInvestment * i + monthlyContribution) / (initialInvestment * i + monthlyContribution)) / logGrowth;

  return {
    doublingYears: round2(doublingMonths / 12),
    doublingYearsWithContributions: round2(doublingWithContributionsMonths / 12),
    triplingYears: round2(Math.log(3) / logGrowth / 12),
  };
};

export const investmentPlanningCustomCalculators: Record<string, CustomCalculator> = {
  "compound-investment-calculator": compoundInvestmentCalculator,
  "investment-growth-calculator": investmentGrowthCalculator,
  "investment-goal-calculator": investmentGoalCalculator,
  "investment-contribution-calculator": investmentContributionCalculator,
  "investment-time-horizon-calculator": investmentTimeHorizonCalculator,
  "investment-future-value-calculator": investmentFutureValueCalculator,
  "investment-present-value-calculator": investmentPresentValueCalculator,
  "lump-sum-vs-dollar-cost-averaging-calculator": lumpSumVsDollarCostAveragingCalculator,
  "rule-of-72-calculator": ruleOf72Calculator,
  "investment-doubling-time-calculator": investmentDoublingTimeCalculator,
};
