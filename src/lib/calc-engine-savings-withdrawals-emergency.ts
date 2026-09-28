/**
 * Batch: "Savings Calculators" sub-batch D (Withdrawals, Inflation &
 * Emergency Funds, 11 tools). Part of the Savings Calculators build-out —
 * see calc-engine-savings-core.ts for the full list of 6 sub-batches. Filed
 * under Finance Calculators > Savings Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - savingsWithdrawalCalculator: the most you can withdraw each month so
 *    the savings last exactly N years.
 *  - savingsDrawdownCalculator: how long savings last when a monthly
 *    withdrawal RISES with inflation every year. (compound-interest-with-
 *    withdrawals-calculator under Interest uses a flat withdrawal.)
 *  - savingsWithWithdrawalsCalculator: an account you're still paying into
 *    that you also dip into once a year — what those withdrawals cost you
 *    in lost interest.
 *  - savingsInflationCalculator: what inflation does to the buying power of
 *    idle cash vs the same cash in a savings account.
 *  - inflationAdjustedSavingsCalculator: a goal priced in today's money,
 *    inflated to the future, and the monthly saving it really needs.
 *  - realSavingsGrowthCalculator: a balance after BOTH tax on interest and
 *    inflation, in today's money. (inflation-adjusted-return-calculator
 *    under Investment converts rates only.)
 *  - emergencyFundGoalCalculator: the target built from itemized essential
 *    expenses × months. (emergency-fund-calculator takes one total.)
 *  - emergencyFundMonthsCalculator: how many months the fund you have now
 *    would last, counting any income you'd still get.
 *  - emergencyFundContributionCalculator: the monthly amount to finish the
 *    fund by a deadline, and what share of take-home pay that is.
 *  - rainyDayFundCalculator: a smaller fund for expected, irregular costs
 *    (car and home repairs, medical bills), sized from those costs.
 *  - sinkingFundCalculator: saving for a known, often RECURRING expense —
 *    catch-up amount until it's due, then the ongoing amount after.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-withdrawals-emergency-calculators.ts for the
 * tool content/copy this math is wired to.
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

// Longest simulation any tool here runs: 100 years of months.
const MAX_MONTHS = 1200;

// --- 1. Savings Withdrawal Calculator (max monthly withdrawal) -------------
export const savingsWithdrawalCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 100000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, safeNumber(values.years, 10));

  const i = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);
  // Level withdrawal that takes the balance to exactly zero after n months.
  const withdrawal = n <= 0 ? 0 : i === 0 ? balance / n : (balance * i) / (1 - Math.pow(1 + i, -n));
  const totalWithdrawn = withdrawal * n;

  return {
    monthlyWithdrawal: round2(withdrawal),
    totalWithdrawn: round2(totalWithdrawn),
    interestEarnedAlongTheWay: round2(totalWithdrawn - balance),
  };
};

// --- 2. Savings Drawdown Calculator (inflation-rising withdrawals) ---------
export const savingsDrawdownCalculator: CustomCalculator = (values) => {
  const balance = Math.max(0, safeNumber(values.balance, 150000));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const monthlyWithdrawal = Math.max(0, safeNumber(values.monthlyWithdrawal, 1200));
  const annualIncreasePercent = Math.max(0, safeNumber(values.annualIncreasePercent, 3));

  const i = annualRatePercent / 100 / 12;
  let running = balance;
  let withdrawal = monthlyWithdrawal;
  let totalWithdrawn = 0;
  let monthsLasted = 0;
  let balanceAfter10Years = 0;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    if (m > 1 && (m - 1) % 12 === 0) withdrawal *= 1 + annualIncreasePercent / 100;
    running *= 1 + i;
    const taken = Math.min(withdrawal, running);
    running -= taken;
    totalWithdrawn += taken;
    if (m === 120) balanceAfter10Years = running;
    if (running <= 0.005) {
      monthsLasted = m;
      break;
    }
  }

  return {
    // 0 means the money outlasts the 100-year horizon.
    monthsLasted,
    yearsLasted: round2(monthsLasted / 12),
    totalWithdrawn: round2(totalWithdrawn),
    balanceAfter10Years: round2(balanceAfter10Years),
  };
};

// --- 3. Savings with Withdrawals (still saving, yearly withdrawal) ---------
export const savingsWithWithdrawalsCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 10000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 400));
  const annualWithdrawal = Math.max(0, safeNumber(values.annualWithdrawal, 2500));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));
  const years = Math.max(0, Math.round(safeNumber(values.years, 10)));

  const i = annualRatePercent / 100 / 12;
  let withW = startingBalance;
  let without = startingBalance;
  let withdrawn = 0;
  for (let m = 1; m <= years * 12; m++) {
    withW = withW * (1 + i) + monthlyDeposit;
    without = without * (1 + i) + monthlyDeposit;
    if (m % 12 === 0) {
      const taken = Math.min(annualWithdrawal, withW);
      withW -= taken;
      withdrawn += taken;
    }
  }

  return {
    endingBalance: round2(withW),
    endingBalanceWithoutWithdrawals: round2(without),
    totalWithdrawn: round2(withdrawn),
    interestLostToWithdrawals: round2(without - withW - withdrawn),
  };
};

// --- 4. Savings Inflation Calculator (idle cash vs a savings account) ------
export const savingsInflationCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const savingsApyPercent = Math.max(0, safeNumber(values.savingsApyPercent, 4));
  const years = Math.max(0, safeNumber(values.years, 10));

  const deflator = Math.pow(1 + inflationPercent / 100, years);
  const idleBuyingPower = amount / deflator;
  const savingsBalance = amount * Math.pow(1 + savingsApyPercent / 100, years);
  const savingsBuyingPower = savingsBalance / deflator;

  return {
    idleCashBuyingPower: round2(idleBuyingPower),
    buyingPowerLostIfIdle: round2(amount - idleBuyingPower),
    savingsBalance: round2(savingsBalance),
    savingsBuyingPower: round2(savingsBuyingPower),
    realReturnPercent: round2(((1 + savingsApyPercent / 100) / (1 + inflationPercent / 100) - 1) * 100),
  };
};

// --- 5. Inflation-Adjusted Savings Calculator (goal in today's money) ------
export const inflationAdjustedSavingsCalculator: CustomCalculator = (values) => {
  const goalTodaysMoney = Math.max(0, safeNumber(values.goalTodaysMoney, 30000));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const years = Math.max(0, safeNumber(values.years, 8));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 5000));

  const i = annualRatePercent / 100 / 12;
  const n = Math.round(years * 12);
  const futureGoal = goalTodaysMoney * Math.pow(1 + inflationPercent / 100, years);
  const currentGrown = currentSavings * Math.pow(1 + i, n);
  const factor = fvAnnuity(1, i, n);
  const needed = (goal: number) => (factor > 0 ? Math.max(0, (goal - currentGrown) / factor) : 0);

  const monthlyInflationAdjusted = needed(futureGoal);
  const monthlyIgnoringInflation = needed(goalTodaysMoney);

  return {
    futureGoal: round2(futureGoal),
    monthlySavingNeeded: round2(monthlyInflationAdjusted),
    monthlyIfInflationIgnored: round2(monthlyIgnoringInflation),
    extraPerMonthForInflation: round2(monthlyInflationAdjusted - monthlyIgnoringInflation),
  };
};

// --- 6. Real Savings Growth Calculator (after tax and inflation) -----------
export const realSavingsGrowthCalculator: CustomCalculator = (values) => {
  const startingBalance = Math.max(0, safeNumber(values.startingBalance, 10000));
  const monthlyDeposit = Math.max(0, safeNumber(values.monthlyDeposit, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4.5));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 22)));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const years = Math.max(0, safeNumber(values.years, 10));

  // Tax taken from each month's interest as it's earned.
  const i = (annualRatePercent / 100 / 12) * (1 - taxRatePercent / 100);
  const n = Math.round(years * 12);
  const nominal = startingBalance * Math.pow(1 + i, n) + fvAnnuity(monthlyDeposit, i, n);
  const real = nominal / Math.pow(1 + inflationPercent / 100, years);
  const afterTaxAnnual = Math.pow(1 + i, 12) - 1;

  return {
    nominalBalanceAfterTax: round2(nominal),
    realBalanceTodaysMoney: round2(real),
    totalDeposited: round2(startingBalance + monthlyDeposit * n),
    realAfterTaxRatePercent: round2(((1 + afterTaxAnnual) / (1 + inflationPercent / 100) - 1) * 100),
  };
};

// --- 7. Emergency Fund Goal Calculator (itemized essentials) ---------------
export const emergencyFundGoalCalculator: CustomCalculator = (values) => {
  const housing = Math.max(0, safeNumber(values.housing, 1500));
  const utilities = Math.max(0, safeNumber(values.utilities, 250));
  const food = Math.max(0, safeNumber(values.food, 600));
  const transportation = Math.max(0, safeNumber(values.transportation, 350));
  const insurance = Math.max(0, safeNumber(values.insurance, 300));
  const minimumDebtPayments = Math.max(0, safeNumber(values.minimumDebtPayments, 200));
  const otherEssentials = Math.max(0, safeNumber(values.otherEssentials, 200));
  const monthsOfCover = Math.max(1, safeNumber(values.monthsOfCover, 6));

  const monthly = housing + utilities + food + transportation + insurance + minimumDebtPayments + otherEssentials;

  return {
    emergencyFundTarget: round2(monthly * monthsOfCover),
    monthlyEssentials: round2(monthly),
    threeMonthMinimum: round2(monthly * 3),
    housingSharePercent: monthly > 0 ? round2((housing / monthly) * 100) : 0,
  };
};

// --- 8. Emergency Fund Months Calculator (how long it would last) ---------
export const emergencyFundMonthsCalculator: CustomCalculator = (values) => {
  const fundBalance = Math.max(0, safeNumber(values.fundBalance, 12000));
  const monthlyEssentials = Math.max(0, safeNumber(values.monthlyEssentials, 3200));
  const monthlyIncomeDuringGap = Math.max(0, safeNumber(values.monthlyIncomeDuringGap, 800));

  const gap = monthlyEssentials - monthlyIncomeDuringGap;
  const months = gap > 0 ? fundBalance / gap : 0;

  return {
    // 0 means income covers essentials, so the fund isn't being drawn down.
    monthsCovered: round2(months),
    daysCovered: Math.floor(months * 30.4375),
    monthlyShortfall: round2(Math.max(0, gap)),
    monthsIfNoIncome: monthlyEssentials > 0 ? round2(fundBalance / monthlyEssentials) : 0,
  };
};

// --- 9. Emergency Fund Contribution Calculator (by a deadline) -------------
export const emergencyFundContributionCalculator: CustomCalculator = (values) => {
  const target = Math.max(0, safeNumber(values.target, 15000));
  const currentFund = Math.max(0, safeNumber(values.currentFund, 3000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 18)));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const monthlyTakeHome = Math.max(0, safeNumber(values.monthlyTakeHome, 4200));

  const i = Math.pow(1 + apyPercent / 100, 1 / 12) - 1;
  const grown = currentFund * Math.pow(1 + i, months);
  const contribution = Math.max(0, (target - grown) / fvAnnuity(1, i, months));
  // With contributions the fund lands exactly on target; without any
  // (already on track) it's whatever the current fund grows to.
  const finalBalance = contribution > 0 ? target : grown;

  return {
    monthlyContribution: round2(contribution),
    weeklyEquivalent: round2((contribution * 12) / 52),
    shareOfTakeHomePercent: monthlyTakeHome > 0 ? round2((contribution / monthlyTakeHome) * 100) : 0,
    interestEarned: round2(finalBalance - currentFund - contribution * months),
  };
};

// --- 10. Rainy Day Fund Calculator (irregular expected costs) -------------
export const rainyDayFundCalculator: CustomCalculator = (values) => {
  const carRepairs = Math.max(0, safeNumber(values.carRepairs, 800));
  const homeRepairs = Math.max(0, safeNumber(values.homeRepairs, 600));
  const medicalDental = Math.max(0, safeNumber(values.medicalDental, 500));
  const otherIrregular = Math.max(0, safeNumber(values.otherIrregular, 400));
  const bufferPercent = Math.max(0, safeNumber(values.bufferPercent, 20));
  const alreadySaved = Math.max(0, safeNumber(values.alreadySaved, 300));
  const monthsToBuild = Math.max(1, Math.round(safeNumber(values.monthsToBuild, 6)));

  const annualCosts = carRepairs + homeRepairs + medicalDental + otherIrregular;
  const target = annualCosts * (1 + bufferPercent / 100);
  const monthly = Math.max(0, target - alreadySaved) / monthsToBuild;

  return {
    rainyDayFundTarget: round2(target),
    expectedIrregularCostsPerYear: round2(annualCosts),
    monthlySetAside: round2(monthly),
    weeklySetAside: round2((monthly * 12) / 52),
  };
};

// --- 11. Sinking Fund Calculator (known, recurring expense) ----------------
export const sinkingFundCalculator: CustomCalculator = (values) => {
  const expenseAmount = Math.max(0, safeNumber(values.expenseAmount, 1200));
  const monthsUntilDue = Math.max(1, Math.round(safeNumber(values.monthsUntilDue, 8)));
  const alreadySaved = Math.max(0, safeNumber(values.alreadySaved, 200));
  const recursEveryMonths = Math.max(0, Math.round(safeNumber(values.recursEveryMonths, 12)));

  const catchUp = Math.max(0, expenseAmount - alreadySaved) / monthsUntilDue;
  const ongoing = recursEveryMonths > 0 ? expenseAmount / recursEveryMonths : 0;

  return {
    monthlyUntilDue: round2(catchUp),
    ongoingMonthlyAfter: round2(ongoing),
    weeklyUntilDue: round2((catchUp * 12) / 52),
    stillToSave: round2(Math.max(0, expenseAmount - alreadySaved)),
  };
};

export const savingsWithdrawalsEmergencyCustomCalculators: Record<string, CustomCalculator> = {
  "savings-withdrawal-calculator": savingsWithdrawalCalculator,
  "savings-drawdown-calculator": savingsDrawdownCalculator,
  "savings-with-withdrawals-calculator": savingsWithWithdrawalsCalculator,
  "savings-inflation-calculator": savingsInflationCalculator,
  "inflation-adjusted-savings-calculator": inflationAdjustedSavingsCalculator,
  "real-savings-growth-calculator": realSavingsGrowthCalculator,
  "emergency-fund-goal-calculator": emergencyFundGoalCalculator,
  "emergency-fund-months-calculator": emergencyFundMonthsCalculator,
  "emergency-fund-contribution-calculator": emergencyFundContributionCalculator,
  "rainy-day-fund-calculator": rainyDayFundCalculator,
  "sinking-fund-calculator": sinkingFundCalculator,
};
