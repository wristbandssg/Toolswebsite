/**
 * Batch: "Savings Calculators" sub-batch E (Saving for Specific Goals, 11
 * tools). Part of the Savings Calculators build-out — see
 * calc-engine-savings-core.ts for the full list of 6 sub-batches. Filed
 * under Finance Calculators > Savings Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - vacationSavingsCalculator: ONE trip, costed from flights, nights of
 *    lodging, daily spending and extras.
 *  - travelSavingsCalculator: an ongoing travel HABIT — several trips a
 *    year turned into a monthly and per-paycheck set-aside.
 *  - homeDownPaymentSavingsCalculator: US-style — down payment % plus
 *    closing costs, with the home price itself rising while you save.
 *    (down-payment-calculator under Real Estate only splits a price.)
 *  - houseDepositSavingsCalculator: UK-style, in pounds — deposit plus
 *    buying costs, with a Lifetime ISA's 25% government bonus.
 *  - carSavingsCalculator: saving up to buy a car outright vs financing it
 *    now — the loan interest that saving avoids.
 *  - weddingSavingsCalculator: a wedding budget built from guest count and
 *    main costs, less family help, split between two partners.
 *  - educationSavingsCalculator: any course or school fees — today's fees
 *    inflated to the start date and the monthly saving needed.
 *  - collegeSavingsGoalCalculator: US college — each year of study
 *    inflated separately, minus expected aid, covering a chosen %.
 *  - retirementSavingsGoalCalculator: the nest egg an income target needs
 *    (via a withdrawal rate) and the monthly saving to get there.
 *    (retirement-calculator projects savings forward instead.)
 *  - shortTermSavingsGoalCalculator: a goal within a few years — the
 *    monthly, weekly and daily amounts needed.
 *  - longTermSavingsGoalCalculator: a goal many years away — inflated to
 *    the future and reached with contributions that rise each year.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-savings-goals-calculators.ts for the tool content/copy
 * this math is wired to.
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

// Monthly rate that compounds to `apyPercent` over a year.
function monthlyFromApy(apyPercent: number): number {
  return Math.pow(1 + apyPercent / 100, 1 / 12) - 1;
}

// Level monthly deposit that grows `current` plus the deposits to `goal`
// after `n` months at monthly rate `i` (0 if `current` alone gets there).
function monthlyNeeded(goal: number, current: number, i: number, n: number): number {
  if (n <= 0) return 0;
  return Math.max(0, (goal - current * Math.pow(1 + i, n)) / fvAnnuity(1, i, n));
}

// Longest wait any "months to reach" result reports: 50 years.
const MAX_MONTHS = 600;

// --- 1. Vacation Savings Calculator (one trip) -----------------------------
export const vacationSavingsCalculator: CustomCalculator = (values) => {
  const flights = Math.max(0, safeNumber(values.flights, 1200));
  const lodgingPerNight = Math.max(0, safeNumber(values.lodgingPerNight, 150));
  const nights = Math.max(0, Math.round(safeNumber(values.nights, 7)));
  const dailySpending = Math.max(0, safeNumber(values.dailySpending, 100));
  const extras = Math.max(0, safeNumber(values.extras, 400));
  const alreadySaved = Math.max(0, safeNumber(values.alreadySaved, 500));
  const monthsUntilTrip = Math.max(1, Math.round(safeNumber(values.monthsUntilTrip, 8)));

  // Spending days = nights + 1 (you spend on the day you leave, too).
  const total = flights + lodgingPerNight * nights + dailySpending * (nights + 1) + extras;
  const stillNeeded = Math.max(0, total - alreadySaved);
  const monthly = stillNeeded / monthsUntilTrip;

  return {
    tripCost: round2(total),
    stillToSave: round2(stillNeeded),
    monthlySaving: round2(monthly),
    weeklySaving: round2((monthly * 12) / 52),
  };
};

// --- 2. Travel Savings Calculator (a yearly travel habit) ------------------
export const travelSavingsCalculator: CustomCalculator = (values) => {
  const tripsPerYear = Math.max(0, safeNumber(values.tripsPerYear, 3));
  const costPerTrip = Math.max(0, safeNumber(values.costPerTrip, 1500));
  const monthlyTakeHome = Math.max(0, safeNumber(values.monthlyTakeHome, 5000));

  const annual = tripsPerYear * costPerTrip;
  const monthly = annual / 12;

  return {
    annualTravelBudget: round2(annual),
    monthlySetAside: round2(monthly),
    perBiweeklyPaycheck: round2(annual / 26),
    shareOfTakeHomePercent: monthlyTakeHome > 0 ? round2((monthly / monthlyTakeHome) * 100) : 0,
  };
};

// --- 3. Home Down Payment Savings Calculator (US, rising prices) -----------
export const homeDownPaymentSavingsCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 350000));
  const downPaymentPercent = Math.max(0, safeNumber(values.downPaymentPercent, 10));
  const closingCostPercent = Math.max(0, safeNumber(values.closingCostPercent, 3));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 10000));
  const monthlySaving = Math.max(0, safeNumber(values.monthlySaving, 1000));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const homePriceGrowthPercent = Math.max(0, safeNumber(values.homePriceGrowthPercent, 3));

  const cashShare = (downPaymentPercent + closingCostPercent) / 100;
  const targetToday = homePrice * cashShare;
  const i = monthlyFromApy(apyPercent);
  const g = Math.pow(1 + homePriceGrowthPercent / 100, 1 / 12);

  let balance = currentSavings;
  let target = targetToday;
  let months = 0;
  if (balance < target) {
    months = MAX_MONTHS;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      balance = balance * (1 + i) + monthlySaving;
      target *= g;
      if (balance >= target) {
        months = m;
        break;
      }
    }
  }

  return {
    cashNeededToday: round2(targetToday),
    // 600 means 50 years or more.
    monthsToReachGoal: months,
    yearsToReachGoal: round2(months / 12),
    cashNeededWhenReady: round2(targetToday * Math.pow(g, months)),
    homePriceWhenReady: round2(homePrice * Math.pow(g, months)),
  };
};

// --- 4. House Deposit Savings Calculator (UK, Lifetime ISA bonus) ----------
// Lifetime ISA rules modeled: up to £4,000 paid in per tax year earns a 25%
// government bonus (max £1,000 a year), usable toward a first home costing
// £450,000 or less. Paid-in amounts above £4,000 a year earn no bonus.
const LISA_ANNUAL_LIMIT = 4000;
const LISA_BONUS_RATE = 0.25;
const LISA_PROPERTY_PRICE_CAP = 450000;

export const houseDepositSavingsCalculator: CustomCalculator = (values) => {
  const propertyPrice = Math.max(0, safeNumber(values.propertyPrice, 250000));
  const depositPercent = Math.max(0, safeNumber(values.depositPercent, 10));
  const buyingCosts = Math.max(0, safeNumber(values.buyingCosts, 4000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 8000));
  const lisaMonthly = Math.max(0, safeNumber(values.lisaMonthly, 333));
  const otherMonthly = Math.max(0, safeNumber(values.otherMonthly, 300));
  const annualRatePercent = Math.max(0, safeNumber(values.annualRatePercent, 4));

  const target = propertyPrice * (depositPercent / 100) + buyingCosts;
  const bonusEligible = propertyPrice <= LISA_PROPERTY_PRICE_CAP;
  const bonusedMonthly = Math.min(lisaMonthly, LISA_ANNUAL_LIMIT / 12);
  const monthlyBonus = bonusEligible ? bonusedMonthly * LISA_BONUS_RATE : 0;
  const i = annualRatePercent / 100 / 12;

  let balance = currentSavings;
  let months = 0;
  let bonusTotal = 0;
  if (balance < target) {
    months = MAX_MONTHS;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      balance = balance * (1 + i) + lisaMonthly + otherMonthly + monthlyBonus;
      bonusTotal += monthlyBonus;
      if (balance >= target) {
        months = m;
        break;
      }
    }
  }

  return {
    depositAndCostsTarget: round2(target),
    // 600 means 50 years or more.
    monthsToReachTarget: months,
    yearsToReachTarget: round2(months / 12),
    lifetimeIsaBonusEarned: round2(bonusTotal),
    lifetimeIsaBonusPerYear: round2(monthlyBonus * 12),
  };
};

// --- 5. Car Savings Calculator (save up vs finance now) --------------------
export const carSavingsCalculator: CustomCalculator = (values) => {
  const carPrice = Math.max(0, safeNumber(values.carPrice, 25000));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 7));
  const tradeInValue = Math.max(0, safeNumber(values.tradeInValue, 4000));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 6000));
  const monthlySaving = Math.max(0, safeNumber(values.monthlySaving, 600));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));
  const loanAprPercent = Math.max(0, safeNumber(values.loanAprPercent, 7.5));
  const loanTermMonths = Math.max(1, Math.round(safeNumber(values.loanTermMonths, 60)));

  const cashNeeded = Math.max(0, carPrice * (1 + salesTaxPercent / 100) - tradeInValue);
  const i = monthlyFromApy(apyPercent);
  let balance = currentSavings;
  let months = 0;
  if (balance < cashNeeded) {
    months = MAX_MONTHS;
    for (let m = 1; m <= MAX_MONTHS; m++) {
      balance = balance * (1 + i) + monthlySaving;
      if (balance >= cashNeeded) {
        months = m;
        break;
      }
    }
  }

  // Financing today: borrow what savings don't cover.
  const loanAmount = Math.max(0, cashNeeded - currentSavings);
  const r = loanAprPercent / 100 / 12;
  const loanPayment = r === 0 ? loanAmount / loanTermMonths : (loanAmount * r) / (1 - Math.pow(1 + r, -loanTermMonths));

  return {
    cashPriceNeeded: round2(cashNeeded),
    // 600 means 50 years or more.
    monthsToSaveUp: months,
    loanPaymentIfFinancedNow: round2(loanPayment),
    interestAvoidedBySaving: round2(loanPayment * loanTermMonths - loanAmount),
  };
};

// --- 6. Wedding Savings Calculator ------------------------------------------
export const weddingSavingsCalculator: CustomCalculator = (values) => {
  const guests = Math.max(0, Math.round(safeNumber(values.guests, 100)));
  const costPerGuest = Math.max(0, safeNumber(values.costPerGuest, 90));
  const venue = Math.max(0, safeNumber(values.venue, 6000));
  const attireAndRings = Math.max(0, safeNumber(values.attireAndRings, 4000));
  const photoAndMusic = Math.max(0, safeNumber(values.photoAndMusic, 4500));
  const otherCosts = Math.max(0, safeNumber(values.otherCosts, 3000));
  const familyContribution = Math.max(0, safeNumber(values.familyContribution, 5000));
  const alreadySaved = Math.max(0, safeNumber(values.alreadySaved, 3000));
  const monthsUntilWedding = Math.max(1, Math.round(safeNumber(values.monthsUntilWedding, 18)));

  const total = guests * costPerGuest + venue + attireAndRings + photoAndMusic + otherCosts;
  const toSave = Math.max(0, total - familyContribution - alreadySaved);
  const monthly = toSave / monthsUntilWedding;

  return {
    totalWeddingBudget: round2(total),
    stillToSave: round2(toSave),
    monthlySaving: round2(monthly),
    monthlyPerPartner: round2(monthly / 2),
  };
};

// --- 7. Education Savings Calculator (fees inflated to start date) ---------
export const educationSavingsCalculator: CustomCalculator = (values) => {
  const totalFeesToday = Math.max(0, safeNumber(values.totalFeesToday, 40000));
  const feeInflationPercent = Math.max(0, safeNumber(values.feeInflationPercent, 5));
  const yearsUntilStart = Math.max(0, safeNumber(values.yearsUntilStart, 8));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 5000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 5));

  const futureCost = totalFeesToday * Math.pow(1 + feeInflationPercent / 100, yearsUntilStart);
  const i = annualReturnPercent / 100 / 12;
  const n = Math.round(yearsUntilStart * 12);
  const grown = currentSavings * Math.pow(1 + i, n);
  const monthly = monthlyNeeded(futureCost, currentSavings, i, n);

  return {
    feesWhenStudyStarts: round2(futureCost),
    currentSavingsGrowTo: round2(grown),
    monthlySavingNeeded: round2(monthly),
    totalYouWillDeposit: round2(monthly * n),
  };
};

// --- 8. College Savings Goal Calculator (US, year-by-year + aid) -----------
export const collegeSavingsGoalCalculator: CustomCalculator = (values) => {
  const annualCostToday = Math.max(0, safeNumber(values.annualCostToday, 28000));
  const yearsUntilCollege = Math.max(0, Math.round(safeNumber(values.yearsUntilCollege, 10)));
  const yearsInCollege = Math.max(1, Math.round(safeNumber(values.yearsInCollege, 4)));
  const collegeInflationPercent = Math.max(0, safeNumber(values.collegeInflationPercent, 5));
  const expectedAidPerYear = Math.max(0, safeNumber(values.expectedAidPerYear, 5000));
  const percentToCover = Math.min(100, Math.max(0, safeNumber(values.percentToCover, 50)));
  const currentBalance = Math.max(0, safeNumber(values.currentBalance, 8000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  // Each year of study is priced at its own future date.
  let totalCost = 0;
  let totalAid = 0;
  for (let k = 0; k < yearsInCollege; k++) {
    const f = Math.pow(1 + collegeInflationPercent / 100, yearsUntilCollege + k);
    totalCost += annualCostToday * f;
    totalAid += expectedAidPerYear * f;
  }
  const netCost = Math.max(0, totalCost - totalAid);
  const target = (netCost * percentToCover) / 100;
  const i = annualReturnPercent / 100 / 12;
  const n = yearsUntilCollege * 12;
  const grown = currentBalance * Math.pow(1 + i, n);

  return {
    projectedTotalCost: round2(totalCost),
    savingsTarget: round2(target),
    currentBalanceGrowsTo: round2(grown),
    monthlySavingNeeded: round2(monthlyNeeded(target, currentBalance, i, n)),
  };
};

// --- 9. Retirement Savings Goal Calculator (nest egg from income) ---------
export const retirementSavingsGoalCalculator: CustomCalculator = (values) => {
  const desiredAnnualIncome = Math.max(0, safeNumber(values.desiredAnnualIncome, 60000));
  const otherAnnualIncome = Math.max(0, safeNumber(values.otherAnnualIncome, 20000));
  const withdrawalRatePercent = Math.max(0.1, safeNumber(values.withdrawalRatePercent, 4));
  const yearsToRetirement = Math.max(0, safeNumber(values.yearsToRetirement, 25));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 50000));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));

  const gapToday = Math.max(0, desiredAnnualIncome - otherAnnualIncome);
  const nestEgg = (gapToday * Math.pow(1 + inflationPercent / 100, yearsToRetirement)) / (withdrawalRatePercent / 100);
  const i = annualReturnPercent / 100 / 12;
  const n = Math.round(yearsToRetirement * 12);

  return {
    nestEggNeeded: round2(nestEgg),
    incomeGapTodaysMoney: round2(gapToday),
    currentSavingsGrowTo: round2(currentSavings * Math.pow(1 + i, n)),
    monthlySavingNeeded: round2(monthlyNeeded(nestEgg, currentSavings, i, n)),
  };
};

// --- 10. Short-Term Savings Goal Calculator ---------------------------------
export const shortTermSavingsGoalCalculator: CustomCalculator = (values) => {
  const goalAmount = Math.max(0, safeNumber(values.goalAmount, 5000));
  const months = Math.max(1, Math.round(safeNumber(values.months, 12)));
  const alreadySaved = Math.max(0, safeNumber(values.alreadySaved, 500));
  const apyPercent = Math.max(0, safeNumber(values.apyPercent, 4));

  const i = monthlyFromApy(apyPercent);
  const monthly = monthlyNeeded(goalAmount, alreadySaved, i, months);
  const finalBalance = monthly > 0 ? goalAmount : alreadySaved * Math.pow(1 + i, months);

  return {
    monthlySaving: round2(monthly),
    weeklySaving: round2((monthly * 12) / 52),
    dailySaving: round2((monthly * 12) / 365),
    interestEarned: round2(finalBalance - alreadySaved - monthly * months),
  };
};

// --- 11. Long-Term Savings Goal Calculator (rising contributions) ---------
export const longTermSavingsGoalCalculator: CustomCalculator = (values) => {
  const goalTodaysMoney = Math.max(0, safeNumber(values.goalTodaysMoney, 100000));
  const years = Math.max(1, Math.round(safeNumber(values.years, 20)));
  const inflationPercent = Math.max(0, safeNumber(values.inflationPercent, 3));
  const annualReturnPercent = Math.max(0, safeNumber(values.annualReturnPercent, 6));
  const currentSavings = Math.max(0, safeNumber(values.currentSavings, 10000));
  const annualIncreasePercent = Math.max(0, safeNumber(values.annualIncreasePercent, 3));

  const futureGoal = goalTodaysMoney * Math.pow(1 + inflationPercent / 100, years);
  const i = annualReturnPercent / 100 / 12;
  const n = years * 12;
  const step = 1 + annualIncreasePercent / 100;

  // The end value is linear in the first-year deposit, so find the value of
  // a $1 starting deposit (rising each year) and scale.
  let unitFv = 0;
  let unitDeposited = 0;
  let d = 1;
  for (let m = 1; m <= n; m++) {
    if (m > 1 && (m - 1) % 12 === 0) d *= step;
    unitFv = unitFv * (1 + i) + d;
    unitDeposited += d;
  }
  const grown = currentSavings * Math.pow(1 + i, n);
  const starting = Math.max(0, (futureGoal - grown) / unitFv);

  return {
    futureGoal: round2(futureGoal),
    startingMonthlySaving: round2(starting),
    finalYearMonthlySaving: round2(starting * Math.pow(step, years - 1)),
    totalYouWillDeposit: round2(starting * unitDeposited),
  };
};

export const savingsGoalsCustomCalculators: Record<string, CustomCalculator> = {
  "vacation-savings-calculator": vacationSavingsCalculator,
  "travel-savings-calculator": travelSavingsCalculator,
  "home-down-payment-savings-calculator": homeDownPaymentSavingsCalculator,
  "house-deposit-savings-calculator": houseDepositSavingsCalculator,
  "car-savings-calculator": carSavingsCalculator,
  "wedding-savings-calculator": weddingSavingsCalculator,
  "education-savings-calculator": educationSavingsCalculator,
  "college-savings-goal-calculator": collegeSavingsGoalCalculator,
  "retirement-savings-goal-calculator": retirementSavingsGoalCalculator,
  "short-term-savings-goal-calculator": shortTermSavingsGoalCalculator,
  "long-term-savings-goal-calculator": longTermSavingsGoalCalculator,
};
