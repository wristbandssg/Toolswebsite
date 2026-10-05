/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 9 of 12 — Spending
 * Analysis (7 tools), filed under Budget Calculators > Money-Saving &
 * Spending Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - spendingLeakFinder: small recurring leaks -> yearly cost and what they
 *    could grow to.
 *  - lifestyleCreep: share of each raise spent -> cumulative extra spending
 *    and its invested value.
 *  - latteFactorSavingsImpact: a small daily habit invested instead.
 *  - opportunityCostOfAPurchase: future value of a purchase if invested;
 *    hours of work it costs.
 *  - costPerUse (incl. capsule wardrobe): price + upkeep - resale per use,
 *    vs a cheaper item replaced more often.
 *  - minimalistLivingBudget: savings from buying less and dropping storage.
 *  - annualVsMonthlySubscriptionSavings: break-even months for an annual
 *    plan.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-spending-analysis-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// Future value of a monthly amount invested for `years` at `returnPercent`.
function fvMonthly(monthly: number, returnPercent: number, years: number): number {
  const g = Math.pow(1 + returnPercent / 100, 1 / 12);
  let v = 0;
  for (let m = 0; m < Math.round(years * 12); m++) v = (v + monthly) * g;
  return v;
}

// --- 1. Spending Leak Finder Calculator ------------------------------------------------
export const spendingLeakFinderCalculator: CustomCalculator = (values) => {
  const leaks = [
    pos(values.bankFees, 15),
    pos(values.unusedSubscriptions, 30),
    pos(values.lateFees, 10),
    pos(values.impulseBuys, 120),
    pos(values.deliveryFees, 40),
    pos(values.other, 25),
  ];
  const returnPercent = safeNumber(values.returnPercent, 7);
  const years = pos(values.years, 10);

  const monthly = leaks.reduce((s, v) => s + v, 0);

  return {
    monthlyLeaks: round2(monthly),
    yearlyLeaks: round2(monthly * 12),
    valueIfInvested: round2(fvMonthly(monthly, returnPercent, years)),
  };
};

// --- 2. Lifestyle Creep Calculator -----------------------------------------------------
export const lifestyleCreepCalculator: CustomCalculator = (values) => {
  const yearlyRaise = pos(values.yearlyRaise, 3000);
  const sharePercentSpent = Math.min(100, pos(values.sharePercentSpent, 70));
  const years = Math.max(0, Math.round(pos(values.years, 10)));
  const returnPercent = safeNumber(values.returnPercent, 7);

  let spent = 0;
  let fvSpent = 0;
  for (let y = 1; y <= years; y++) {
    const extra = (yearlyRaise * y * sharePercentSpent) / 100;
    spent += extra;
    fvSpent = (fvSpent + extra) * (1 + returnPercent / 100);
  }

  return {
    extraSpendingInFinalYear: round2((yearlyRaise * years * sharePercentSpent) / 100),
    totalExtraSpending: round2(spent),
    valueIfSavedInstead: round2(fvSpent),
    savedFromRaisesInFinalYear: round2((yearlyRaise * years * (100 - sharePercentSpent)) / 100),
  };
};

// --- 3. Latte Factor Savings Impact Calculator -----------------------------------------
export const latteFactorSavingsImpactCalculator: CustomCalculator = (values) => {
  const dailyCost = pos(values.dailyCost, 5.5);
  const daysPerWeek = Math.min(7, pos(values.daysPerWeek, 5));
  const years = pos(values.years, 30);
  const returnPercent = safeNumber(values.returnPercent, 7);

  const monthly = (dailyCost * daysPerWeek * 52) / 12;

  return {
    monthlyCost: round2(monthly),
    yearlyCost: round2(monthly * 12),
    totalSpent: round2(monthly * 12 * years),
    valueIfInvested: round2(fvMonthly(monthly, returnPercent, years)),
  };
};

// --- 4. Opportunity Cost of a Purchase Calculator --------------------------------------
export const opportunityCostOfAPurchaseCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 1500);
  const years = pos(values.years, 20);
  const returnPercent = safeNumber(values.returnPercent, 7);
  const hourlyTakeHome = pos(values.hourlyTakeHome, 25);

  const fv = price * Math.pow(1 + returnPercent / 100, years);

  return {
    futureValueIfInvested: round2(fv),
    opportunityCost: round2(fv - price),
    hoursOfWork: round2(hourlyTakeHome > 0 ? price / hourlyTakeHome : 0),
  };
};

// --- 5. Cost Per Use Calculator --------------------------------------------------------
export const costPerUseCalculator: CustomCalculator = (values) => {
  const price = pos(values.price, 120);
  const usesPerWeek = pos(values.usesPerWeek, 2);
  const yearsOfUse = pos(values.yearsOfUse, 3);
  const upkeepPerYear = pos(values.upkeepPerYear, 0);
  const resaleValue = pos(values.resaleValue, 0);
  const cheaperPrice = pos(values.cheaperPrice, 50);
  const cheaperYears = Math.max(0.1, pos(values.cheaperYears, 1));

  const uses = usesPerWeek * 52 * yearsOfUse;
  const cost = price + upkeepPerYear * yearsOfUse - resaleValue;
  // the cheaper item is replaced as often as needed over the same period
  const cheaperCost = cheaperPrice * Math.ceil(yearsOfUse / cheaperYears);

  return {
    totalUses: round2(uses),
    costPerUse: round2(uses > 0 ? cost / uses : 0),
    cheaperItemCostPerUse: round2(uses > 0 ? cheaperCost / uses : 0),
    savingsWithBetterItem: round2(cheaperCost - cost),
  };
};

// --- 6. Minimalist Living Budget Calculator --------------------------------------------
export const minimalistLivingBudgetCalculator: CustomCalculator = (values) => {
  const monthlyShopping = pos(values.monthlyShopping, 600);
  const reductionPercent = Math.min(100, pos(values.reductionPercent, 50));
  const storageUnit = pos(values.storageUnit, 0);
  const otherSavings = pos(values.otherSavings, 50);
  const years = pos(values.years, 10);
  const returnPercent = safeNumber(values.returnPercent, 7);

  const monthly = (monthlyShopping * reductionPercent) / 100 + storageUnit + otherSavings;

  return {
    monthlySavings: round2(monthly),
    yearlySavings: round2(monthly * 12),
    valueIfInvested: round2(fvMonthly(monthly, returnPercent, years)),
  };
};

// --- 7. Annual vs Monthly Subscription Savings Calculator ------------------------------
export const annualVsMonthlySubscriptionSavingsCalculator: CustomCalculator = (values) => {
  const monthlyPrice = pos(values.monthlyPrice, 14.99);
  const annualPrice = pos(values.annualPrice, 149.99);
  const monthsUsed = Math.min(12, pos(values.monthsUsed, 12));

  const monthlyPlanCost = monthlyPrice * monthsUsed;

  return {
    monthlyPlanYearlyCost: round2(monthlyPrice * 12),
    savingsWithAnnualPlan: round2(monthlyPlanCost - annualPrice),
    savingsPercent: round2(monthlyPrice > 0 ? ((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100 : 0),
    breakEvenMonths: round2(monthlyPrice > 0 ? annualPrice / monthlyPrice : 0),
  };
};

export const budgetSpendingAnalysisCustomCalculators: Record<string, CustomCalculator> = {
  "spending-leak-finder-calculator": spendingLeakFinderCalculator,
  "lifestyle-creep-calculator": lifestyleCreepCalculator,
  "latte-factor-savings-impact-calculator": latteFactorSavingsImpactCalculator,
  "opportunity-cost-of-a-purchase-calculator": opportunityCostOfAPurchaseCalculator,
  "cost-per-use-calculator": costPerUseCalculator,
  "minimalist-living-budget-calculator": minimalistLivingBudgetCalculator,
  "annual-vs-monthly-subscription-savings-calculator": annualVsMonthlySubscriptionSavingsCalculator,
};
