/**
 * Batch: "Business Finance Calculators" sub-batch D (Revenue, Recurring
 * Revenue & Sales, 11 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - revenueGrowthCalculator: YEAR-over-year growth across three years and
 *    the average (compound) rate.
 *  - salesGrowthCalculator: MONTH-over-month and same-month-last-year
 *    growth.
 *  - monthlyRevenueCalculator: a month's revenue from customers per day ×
 *    average spend × days open.
 *  - annualRevenueCalculator: a year projected from this month with monthly
 *    growth, vs the simple ×12 run rate.
 *  - recurringRevenueCalculator: a subscription base projected 12 months
 *    ahead with new sign-ups and churn.
 *  - monthlyRecurringRevenueCalculator: MRR movements — new, expansion,
 *    contraction and churned MRR.
 *  - annualRecurringRevenueCalculator: ARR from monthly subscriptions plus
 *    annual contracts, excluding one-time fees.
 *  - averageRevenuePerUserCalculator: ARPU and ARPPU (per paying user).
 *  - revenuePerEmployeeCalculator: revenue and profit per full-time
 *    employee.
 *  - salesRevenueCalculator: gross sales less returns, allowances and
 *    discounts = net sales. (revenueCalculator adds up revenue streams.)
 *  - salesTargetCalculator: deals and leads needed per month (and per rep)
 *    to hit a revenue goal.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-revenue-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const growth = (from: number, to: number) => (from !== 0 ? round2(((to - from) / Math.abs(from)) * 100) : 0);

// --- 1. Revenue Growth Calculator (three years) ----------------------------
export const revenueGrowthCalculator: CustomCalculator = (values) => {
  const year1Revenue = Math.max(0, safeNumber(values.year1Revenue, 400000));
  const year2Revenue = Math.max(0, safeNumber(values.year2Revenue, 460000));
  const year3Revenue = Math.max(0, safeNumber(values.year3Revenue, 552000));

  return {
    averageYearlyGrowthPercent: year1Revenue > 0 ? round2((Math.sqrt(year3Revenue / year1Revenue) - 1) * 100) : 0,
    growthYear1To2Percent: growth(year1Revenue, year2Revenue),
    growthYear2To3Percent: growth(year2Revenue, year3Revenue),
    totalGrowthPercent: growth(year1Revenue, year3Revenue),
  };
};

// --- 2. Monthly Revenue Calculator (customers × spend × days) -------------
export const monthlyRevenueCalculator: CustomCalculator = (values) => {
  const customersPerDay = Math.max(0, safeNumber(values.customersPerDay, 80));
  const averageSpend = Math.max(0, safeNumber(values.averageSpend, 18));
  const daysOpenPerMonth = Math.min(31, Math.max(0, safeNumber(values.daysOpenPerMonth, 26)));

  const monthly = customersPerDay * averageSpend * daysOpenPerMonth;

  return {
    monthlyRevenue: round2(monthly),
    dailyRevenue: round2(customersPerDay * averageSpend),
    customersPerMonth: Math.round(customersPerDay * daysOpenPerMonth),
    annualRunRate: round2(monthly * 12),
  };
};

// --- 3. Annual Revenue Calculator (with monthly growth) -------------------
export const annualRevenueCalculator: CustomCalculator = (values) => {
  const currentMonthlyRevenue = Math.max(0, safeNumber(values.currentMonthlyRevenue, 30000));
  const monthlyGrowthPercent = safeNumber(values.monthlyGrowthPercent, 3);

  const g = 1 + monthlyGrowthPercent / 100;
  let total = 0;
  for (let m = 1; m <= 12; m++) total += currentMonthlyRevenue * Math.pow(g, m);

  return {
    projectedAnnualRevenue: round2(total),
    simpleRunRate: round2(currentMonthlyRevenue * 12),
    extraFromGrowth: round2(total - currentMonthlyRevenue * 12),
    monthlyRevenueInMonth12: round2(currentMonthlyRevenue * Math.pow(g, 12)),
  };
};

// --- 4. Recurring Revenue Calculator (12-month projection) ----------------
export const recurringRevenueCalculator: CustomCalculator = (values) => {
  const currentSubscribers = Math.max(0, safeNumber(values.currentSubscribers, 500));
  const monthlyPrice = Math.max(0, safeNumber(values.monthlyPrice, 29));
  const newSubscribersPerMonth = Math.max(0, safeNumber(values.newSubscribersPerMonth, 60));
  const monthlyChurnPercent = Math.min(100, Math.max(0, safeNumber(values.monthlyChurnPercent, 4)));

  let subs = currentSubscribers;
  let collected = 0;
  for (let m = 1; m <= 12; m++) {
    subs = subs * (1 - monthlyChurnPercent / 100) + newSubscribersPerMonth;
    collected += subs * monthlyPrice;
  }

  return {
    monthlyRecurringRevenueIn12Months: round2(subs * monthlyPrice),
    subscribersIn12Months: Math.round(subs),
    revenueCollectedOver12Months: round2(collected),
    // Subscriber level where new sign-ups exactly replace churn.
    steadyStateSubscribers: monthlyChurnPercent > 0 ? Math.round(newSubscribersPerMonth / (monthlyChurnPercent / 100)) : 0,
  };
};

// --- 5. Monthly Recurring Revenue (MRR movements) --------------------------
export const monthlyRecurringRevenueCalculator: CustomCalculator = (values) => {
  const startingMrr = Math.max(0, safeNumber(values.startingMrr, 50000));
  const newMrr = Math.max(0, safeNumber(values.newMrr, 6000));
  const expansionMrr = Math.max(0, safeNumber(values.expansionMrr, 2500));
  const contractionMrr = Math.max(0, safeNumber(values.contractionMrr, 800));
  const churnedMrr = Math.max(0, safeNumber(values.churnedMrr, 2200));

  const net = newMrr + expansionMrr - contractionMrr - churnedMrr;
  const ending = startingMrr + net;

  return {
    endingMrr: round2(ending),
    netNewMrr: round2(net),
    mrrGrowthPercent: growth(startingMrr, ending),
    netRevenueRetentionPercent: startingMrr > 0 ? round2(((startingMrr + expansionMrr - contractionMrr - churnedMrr) / startingMrr) * 100) : 0,
    annualizedRunRate: round2(ending * 12),
  };
};

// --- 6. Annual Recurring Revenue (ARR) --------------------------------------
export const annualRecurringRevenueCalculator: CustomCalculator = (values) => {
  const monthlySubscriptionRevenue = Math.max(0, safeNumber(values.monthlySubscriptionRevenue, 40000));
  const annualContractsValue = Math.max(0, safeNumber(values.annualContractsValue, 180000));
  const oneTimeFees = Math.max(0, safeNumber(values.oneTimeFees, 25000));
  const targetArr = Math.max(0, safeNumber(values.targetArr, 1000000));

  const arr = monthlySubscriptionRevenue * 12 + annualContractsValue;

  return {
    annualRecurringRevenue: round2(arr),
    fromMonthlySubscriptions: round2(monthlySubscriptionRevenue * 12),
    excludedOneTimeFees: round2(oneTimeFees),
    gapToTargetArr: round2(Math.max(0, targetArr - arr)),
  };
};

// --- 7. Average Revenue Per User (ARPU / ARPPU) ----------------------------
export const averageRevenuePerUserCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue, 120000));
  const totalUsers = Math.max(1, safeNumber(values.totalUsers, 20000));
  const payingUsers = Math.max(1, safeNumber(values.payingUsers, 1500));
  const monthsInPeriod = Math.max(1, safeNumber(values.monthsInPeriod, 1));

  const arpu = revenue / totalUsers / monthsInPeriod;

  return {
    arpuPerMonth: round2(arpu),
    arppuPerMonth: round2(revenue / payingUsers / monthsInPeriod),
    payingUserSharePercent: round2((payingUsers / totalUsers) * 100),
    arpuPerYear: round2(arpu * 12),
  };
};

// --- 8. Revenue Per Employee Calculator --------------------------------------
export const revenuePerEmployeeCalculator: CustomCalculator = (values) => {
  const annualRevenue = Math.max(0, safeNumber(values.annualRevenue, 3600000));
  const fullTimeEmployees = Math.max(0, safeNumber(values.fullTimeEmployees, 22));
  const partTimeEmployees = Math.max(0, safeNumber(values.partTimeEmployees, 6));
  const netProfit = safeNumber(values.netProfit, 360000);

  // Part-timers counted as half a full-time equivalent.
  const fte = fullTimeEmployees + partTimeEmployees * 0.5;

  return {
    revenuePerEmployee: fte > 0 ? round2(annualRevenue / fte) : 0,
    profitPerEmployee: fte > 0 ? round2(netProfit / fte) : 0,
    fullTimeEquivalents: round2(fte),
    monthlyRevenuePerEmployee: fte > 0 ? round2(annualRevenue / fte / 12) : 0,
  };
};

// --- 9. Sales Revenue Calculator (gross → net sales) -----------------------
export const salesRevenueCalculator: CustomCalculator = (values) => {
  const unitsSold = Math.max(0, safeNumber(values.unitsSold, 5000));
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit, 45));
  const returns = Math.max(0, safeNumber(values.returns, 6000));
  const allowances = Math.max(0, safeNumber(values.allowances, 1500));
  const discounts = Math.max(0, safeNumber(values.discounts, 4500));

  const gross = unitsSold * pricePerUnit;
  const net = gross - returns - allowances - discounts;

  return {
    netSales: round2(net),
    grossSales: round2(gross),
    totalDeductions: round2(returns + allowances + discounts),
    deductionsPercentOfGross: gross > 0 ? round2(((returns + allowances + discounts) / gross) * 100) : 0,
  };
};

// --- 10. Sales Growth Calculator (MoM and YoY) --------------------------------
export const salesGrowthCalculator: CustomCalculator = (values) => {
  const thisMonthSales = Math.max(0, safeNumber(values.thisMonthSales, 58000));
  const lastMonthSales = Math.max(0, safeNumber(values.lastMonthSales, 52000));
  const sameMonthLastYearSales = Math.max(0, safeNumber(values.sameMonthLastYearSales, 47000));

  const mom = lastMonthSales > 0 ? thisMonthSales / lastMonthSales - 1 : 0;

  return {
    monthOverMonthPercent: round2(mom * 100),
    yearOverYearPercent: growth(sameMonthLastYearSales, thisMonthSales),
    // If month-over-month growth carried on for a year.
    annualizedMomGrowthPercent: round2((Math.pow(1 + mom, 12) - 1) * 100),
    salesChangeFromLastMonth: round2(thisMonthSales - lastMonthSales),
  };
};

// --- 11. Sales Target Calculator (deals and leads) ------------------------
export const salesTargetCalculator: CustomCalculator = (values) => {
  const annualRevenueGoal = Math.max(0, safeNumber(values.annualRevenueGoal, 1200000));
  const averageDealSize = Math.max(1, safeNumber(values.averageDealSize, 8000));
  const closeRatePercent = Math.min(100, Math.max(0.1, safeNumber(values.closeRatePercent, 20)));
  const salesReps = Math.max(1, Math.round(safeNumber(values.salesReps, 4)));

  const deals = Math.ceil(annualRevenueGoal / averageDealSize);
  const leads = Math.ceil(deals / (closeRatePercent / 100));

  return {
    dealsNeededPerYear: deals,
    dealsPerMonth: round2(deals / 12),
    leadsNeededPerYear: leads,
    leadsPerMonth: round2(leads / 12),
    revenuePerRep: round2(annualRevenueGoal / salesReps),
  };
};

export const businessRevenueCustomCalculators: Record<string, CustomCalculator> = {
  "revenue-growth-calculator": revenueGrowthCalculator,
  "monthly-revenue-calculator": monthlyRevenueCalculator,
  "annual-revenue-calculator": annualRevenueCalculator,
  "recurring-revenue-calculator": recurringRevenueCalculator,
  "monthly-recurring-revenue-calculator": monthlyRecurringRevenueCalculator,
  "annual-recurring-revenue-calculator": annualRecurringRevenueCalculator,
  "average-revenue-per-user-calculator": averageRevenuePerUserCalculator,
  "revenue-per-employee-calculator": revenuePerEmployeeCalculator,
  "sales-revenue-calculator": salesRevenueCalculator,
  "sales-growth-calculator": salesGrowthCalculator,
  "sales-target-calculator": salesTargetCalculator,
};
