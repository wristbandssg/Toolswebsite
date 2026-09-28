/**
 * Batch: "Business Finance Calculators" sub-batch K (Growth & Variance, 6
 * tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different (cagr-calculator
 * under Investment covers an investment's value):
 *  - businessGrowthRateCalculator: growth of three business metrics at once
 *    — revenue, customers and profit.
 *  - cagrBusinessGrowthCalculator: compound annual growth of revenue over
 *    several years and a projection on that trend.
 *  - budgetVarianceCalculator: budget vs actual for revenue AND expenses,
 *    each marked favorable or unfavorable.
 *  - costVarianceCalculator: standard-costing price and quantity (usage)
 *    variances.
 *  - revenueVarianceCalculator: sales price and sales volume variances.
 *  - profitVarianceCalculator: profit vs budget, split into the part caused
 *    by revenue and the part caused by costs.
 *
 * Sign convention for variances: positive = favorable (more revenue or less
 * cost than planned), negative = unfavorable.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-growth-variance-calculators.ts for the tool
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

// --- 1. Business Growth Rate Calculator (three metrics) --------------------
export const businessGrowthRateCalculator: CustomCalculator = (values) => {
  const previousRevenue = Math.max(0, safeNumber(values.previousRevenue, 800000));
  const currentRevenue = Math.max(0, safeNumber(values.currentRevenue, 920000));
  const previousCustomers = Math.max(0, safeNumber(values.previousCustomers, 1200));
  const currentCustomers = Math.max(0, safeNumber(values.currentCustomers, 1320));
  const previousProfit = safeNumber(values.previousProfit, 90000);
  const currentProfit = safeNumber(values.currentProfit, 117000);

  return {
    revenueGrowthPercent: growth(previousRevenue, currentRevenue),
    customerGrowthPercent: growth(previousCustomers, currentCustomers),
    profitGrowthPercent: growth(previousProfit, currentProfit),
    revenuePerCustomerGrowthPercent:
      previousCustomers > 0 && currentCustomers > 0 ? growth(previousRevenue / previousCustomers, currentRevenue / currentCustomers) : 0,
  };
};

// --- 2. CAGR Business Growth Calculator --------------------------------------
export const cagrBusinessGrowthCalculator: CustomCalculator = (values) => {
  const startingRevenue = Math.max(0.01, safeNumber(values.startingRevenue, 500000));
  const endingRevenue = Math.max(0, safeNumber(values.endingRevenue, 1100000));
  const years = Math.max(0.5, safeNumber(values.years, 5));
  const yearsToProject = Math.max(0, safeNumber(values.yearsToProject, 3));

  const cagr = Math.pow(endingRevenue / startingRevenue, 1 / years) - 1;

  return {
    cagrPercent: round2(cagr * 100),
    totalGrowthPercent: round2((endingRevenue / startingRevenue - 1) * 100),
    projectedRevenue: round2(endingRevenue * Math.pow(1 + cagr, yearsToProject)),
    // Years to double at this rate.
    yearsToDouble: cagr > 0 ? round2(Math.log(2) / Math.log(1 + cagr)) : 0,
  };
};

// --- 3. Budget Variance Calculator ---------------------------------------------
export const budgetVarianceCalculator: CustomCalculator = (values) => {
  const budgetedRevenue = Math.max(0, safeNumber(values.budgetedRevenue, 500000));
  const actualRevenue = Math.max(0, safeNumber(values.actualRevenue, 470000));
  const budgetedExpenses = Math.max(0, safeNumber(values.budgetedExpenses, 400000));
  const actualExpenses = Math.max(0, safeNumber(values.actualExpenses, 385000));

  const revVar = actualRevenue - budgetedRevenue;
  const expVar = budgetedExpenses - actualExpenses;

  return {
    netVariance: round2(revVar + expVar),
    revenueVariance: round2(revVar),
    revenueVariancePercent: growth(budgetedRevenue, actualRevenue),
    expenseVariance: round2(expVar),
    expenseVariancePercent: budgetedExpenses > 0 ? round2((expVar / budgetedExpenses) * 100) : 0,
  };
};

// --- 4. Cost Variance Calculator (price and quantity) ----------------------
export const costVarianceCalculator: CustomCalculator = (values) => {
  const standardPrice = Math.max(0, safeNumber(values.standardPrice, 5));
  const actualPrice = Math.max(0, safeNumber(values.actualPrice, 5.4));
  const standardQuantity = Math.max(0, safeNumber(values.standardQuantity, 10000));
  const actualQuantity = Math.max(0, safeNumber(values.actualQuantity, 9500));

  const priceVar = (standardPrice - actualPrice) * actualQuantity;
  const qtyVar = (standardQuantity - actualQuantity) * standardPrice;

  return {
    totalCostVariance: round2(priceVar + qtyVar),
    priceVariance: round2(priceVar),
    quantityVariance: round2(qtyVar),
    actualTotalCost: round2(actualPrice * actualQuantity),
    standardTotalCost: round2(standardPrice * standardQuantity),
  };
};

// --- 5. Revenue Variance Calculator (price and volume) ---------------------
export const revenueVarianceCalculator: CustomCalculator = (values) => {
  const budgetedPrice = Math.max(0, safeNumber(values.budgetedPrice, 50));
  const actualPrice = Math.max(0, safeNumber(values.actualPrice, 47));
  const budgetedUnits = Math.max(0, safeNumber(values.budgetedUnits, 8000));
  const actualUnits = Math.max(0, safeNumber(values.actualUnits, 8800));

  const priceVar = (actualPrice - budgetedPrice) * actualUnits;
  const volumeVar = (actualUnits - budgetedUnits) * budgetedPrice;

  return {
    totalRevenueVariance: round2(priceVar + volumeVar),
    salesPriceVariance: round2(priceVar),
    salesVolumeVariance: round2(volumeVar),
    actualRevenue: round2(actualPrice * actualUnits),
    budgetedRevenue: round2(budgetedPrice * budgetedUnits),
  };
};

// --- 6. Profit Variance Calculator (revenue vs cost effect) ---------------
export const profitVarianceCalculator: CustomCalculator = (values) => {
  const budgetedRevenue = Math.max(0, safeNumber(values.budgetedRevenue, 750000));
  const actualRevenue = Math.max(0, safeNumber(values.actualRevenue, 780000));
  const budgetedCosts = Math.max(0, safeNumber(values.budgetedCosts, 630000));
  const actualCosts = Math.max(0, safeNumber(values.actualCosts, 672000));

  const budgetProfit = budgetedRevenue - budgetedCosts;
  const actualProfit = actualRevenue - actualCosts;

  return {
    profitVariance: round2(actualProfit - budgetProfit),
    profitVariancePercent: growth(budgetProfit, actualProfit),
    fromRevenue: round2(actualRevenue - budgetedRevenue),
    fromCosts: round2(budgetedCosts - actualCosts),
    actualProfit: round2(actualProfit),
  };
};

export const businessGrowthVarianceCustomCalculators: Record<string, CustomCalculator> = {
  "business-growth-rate-calculator": businessGrowthRateCalculator,
  "cagr-business-growth-calculator": cagrBusinessGrowthCalculator,
  "budget-variance-calculator": budgetVarianceCalculator,
  "cost-variance-calculator": costVarianceCalculator,
  "revenue-variance-calculator": revenueVarianceCalculator,
  "profit-variance-calculator": profitVarianceCalculator,
};
