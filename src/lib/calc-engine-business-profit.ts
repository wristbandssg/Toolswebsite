/**
 * Batch: "Business Finance Calculators" sub-batch A (Revenue & Profit, 10
 * tools). Part of the Business Finance tool-list build-out — 108 tools in
 * the source list, 17 skipped as exact-slug duplicates (profit-margin,
 * gross-profit, net-profit, break-even, markup, business-loan, cash-flow,
 * operating-margin and contribution-margin calculators in
 * calc-engine-finance-business.ts; business-loan payment/interest/APR/
 * payoff/affordability/EMI, working-capital-loan and equipment-loan
 * calculators in calc-engine-loan-business-student.ts), 91 built across 11
 * sub-batches. All are filed under Finance Calculators > Business Finance
 * Calculators except the 4 business-loan tools (calc-engine-business-
 * loans.ts), which go under Loan Calculators with the other business loans.
 *
 * Near-namesakes, and how each is deliberately different from the existing
 * business tools:
 *  - revenueCalculator: total revenue from several products/services plus
 *    other income. (Sales Revenue nets out returns and discounts.)
 *  - operatingProfitCalculator: operating profit from revenue, COGS and an
 *    itemized operating budget (SG&A, R&D, depreciation). (operating-
 *    margin-calculator reports the margin from one opex figure.)
 *  - grossMarginCalculator: per-PRODUCT gross margin and the price needed for
 *    a target margin. (gross-profit-calculator works on company totals.)
 *  - netProfitMarginCalculator: margin from a known net income, and the
 *    revenue needed for a target profit at that margin.
 *  - contributionMarginRatioCalculator: CM ratio from company TOTALS and
 *    what each extra $1,000 of sales adds to profit. (contribution-margin-
 *    calculator works per unit.)
 *  - profitCalculator: profit before and after tax for a period.
 *  - profitPercentageCalculator: profit or loss as a % of COST (the classic
 *    cost-price/selling-price formula).
 *  - profitGrowthCalculator: change in profit between two periods.
 *  - profitPerUnitCalculator: profit per unit including each unit's share
 *    of fixed costs.
 *  - targetProfitCalculator: units and sales needed for an AFTER-TAX profit
 *    target.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-profit-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pct = (part: number, whole: number) => (whole !== 0 ? round2((part / whole) * 100) : 0);

// --- 1. Revenue Calculator (several streams) -------------------------------
export const revenueCalculator: CustomCalculator = (values) => {
  const product1Price = Math.max(0, safeNumber(values.product1Price, 40));
  const product1Units = Math.max(0, safeNumber(values.product1Units, 1200));
  const product2Price = Math.max(0, safeNumber(values.product2Price, 120));
  const product2Units = Math.max(0, safeNumber(values.product2Units, 300));
  const serviceRevenue = Math.max(0, safeNumber(values.serviceRevenue, 15000));
  const otherIncome = Math.max(0, safeNumber(values.otherIncome, 2000));

  const p1 = product1Price * product1Units;
  const p2 = product2Price * product2Units;
  const total = p1 + p2 + serviceRevenue + otherIncome;

  return {
    totalRevenue: round2(total),
    productRevenue: round2(p1 + p2),
    serviceRevenue: round2(serviceRevenue),
    largestStreamSharePercent: pct(Math.max(p1, p2, serviceRevenue, otherIncome), total),
  };
};

// --- 2. Operating Profit Calculator (itemized) -----------------------------
export const operatingProfitCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue, 500000));
  const costOfGoodsSold = Math.max(0, safeNumber(values.costOfGoodsSold, 220000));
  const sellingGeneralAdmin = Math.max(0, safeNumber(values.sellingGeneralAdmin, 140000));
  const researchDevelopment = Math.max(0, safeNumber(values.researchDevelopment, 30000));
  const depreciationAmortization = Math.max(0, safeNumber(values.depreciationAmortization, 20000));

  const gross = revenue - costOfGoodsSold;
  const opex = sellingGeneralAdmin + researchDevelopment + depreciationAmortization;
  const operating = gross - opex;

  return {
    operatingProfit: round2(operating),
    grossProfit: round2(gross),
    totalOperatingExpenses: round2(opex),
    operatingMarginPercent: pct(operating, revenue),
    ebitda: round2(operating + depreciationAmortization),
  };
};

// --- 3. Gross Margin Calculator (per product + target price) -------------
export const grossMarginCalculator: CustomCalculator = (values) => {
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice, 50));
  const unitCost = Math.max(0, safeNumber(values.unitCost, 30));
  const targetMarginPercent = Math.min(99, Math.max(0, safeNumber(values.targetMarginPercent, 50)));

  return {
    grossMarginPercent: pct(sellingPrice - unitCost, sellingPrice),
    grossProfitPerUnit: round2(sellingPrice - unitCost),
    priceForTargetMargin: round2(unitCost / (1 - targetMarginPercent / 100)),
    markupPercent: pct(sellingPrice - unitCost, unitCost),
  };
};

// --- 4. Net Profit Margin Calculator ------------------------------------------
export const netProfitMarginCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue, 850000));
  const netIncome = safeNumber(values.netIncome, 68000);
  const targetNetIncome = Math.max(0, safeNumber(values.targetNetIncome, 100000));

  const margin = revenue > 0 ? netIncome / revenue : 0;

  return {
    netProfitMarginPercent: round2(margin * 100),
    totalExpenses: round2(revenue - netIncome),
    revenueNeededForTarget: margin > 0 ? round2(targetNetIncome / margin) : 0,
    expensesAsShareOfRevenuePercent: revenue > 0 ? round2((1 - margin) * 100) : 0,
  };
};

// --- 5. Contribution Margin Ratio Calculator (totals) ---------------------
export const contributionMarginRatioCalculator: CustomCalculator = (values) => {
  const totalSales = Math.max(0, safeNumber(values.totalSales, 400000));
  const totalVariableCosts = Math.max(0, safeNumber(values.totalVariableCosts, 240000));
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 110000));

  const cm = totalSales - totalVariableCosts;
  const ratio = totalSales > 0 ? cm / totalSales : 0;

  return {
    contributionMarginRatioPercent: round2(ratio * 100),
    totalContributionMargin: round2(cm),
    profitFromEachExtra1000Sales: round2(ratio * 1000),
    operatingProfit: round2(cm - fixedCosts),
    variableCostRatioPercent: pct(totalVariableCosts, totalSales),
  };
};

// --- 6. Profit Calculator (before and after tax) --------------------------
export const profitCalculator: CustomCalculator = (values) => {
  const revenue = Math.max(0, safeNumber(values.revenue, 250000));
  const totalCosts = Math.max(0, safeNumber(values.totalCosts, 205000));
  const taxRatePercent = Math.min(100, Math.max(0, safeNumber(values.taxRatePercent, 21)));

  const before = revenue - totalCosts;
  const tax = Math.max(0, before) * (taxRatePercent / 100);

  return {
    profitAfterTax: round2(before - tax),
    profitBeforeTax: round2(before),
    tax: round2(tax),
    profitMarginAfterTaxPercent: pct(before - tax, revenue),
  };
};

// --- 7. Profit Percentage Calculator (on cost) ----------------------------
export const profitPercentageCalculator: CustomCalculator = (values) => {
  const costPrice = Math.max(0, safeNumber(values.costPrice, 800));
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice, 1000));

  const profit = sellingPrice - costPrice;

  return {
    // Negative = a loss.
    profitOrLossPercent: pct(profit, costPrice),
    profitOrLoss: round2(profit),
    profitAsShareOfSellingPricePercent: pct(profit, sellingPrice),
  };
};

// --- 8. Profit Growth Calculator ---------------------------------------------
export const profitGrowthCalculator: CustomCalculator = (values) => {
  const previousProfit = safeNumber(values.previousProfit, 80000);
  const currentProfit = safeNumber(values.currentProfit, 96000);
  const previousRevenue = Math.max(0, safeNumber(values.previousRevenue, 600000));
  const currentRevenue = Math.max(0, safeNumber(values.currentRevenue, 660000));

  return {
    profitGrowthPercent: previousProfit !== 0 ? round2(((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100) : 0,
    profitChange: round2(currentProfit - previousProfit),
    revenueGrowthPercent: previousRevenue > 0 ? round2(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0,
    previousMarginPercent: pct(previousProfit, previousRevenue),
    currentMarginPercent: pct(currentProfit, currentRevenue),
  };
};

// --- 9. Profit Per Unit Calculator (with fixed-cost share) ----------------
export const profitPerUnitCalculator: CustomCalculator = (values) => {
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit, 25));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 12));
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 30000));
  const unitsSold = Math.max(1, safeNumber(values.unitsSold, 4000));

  const fixedPerUnit = fixedCosts / unitsSold;
  const profitPerUnit = pricePerUnit - variableCostPerUnit - fixedPerUnit;

  return {
    profitPerUnit: round2(profitPerUnit),
    fixedCostPerUnit: round2(fixedPerUnit),
    contributionPerUnit: round2(pricePerUnit - variableCostPerUnit),
    totalProfit: round2(profitPerUnit * unitsSold),
  };
};

// --- 10. Target Profit Calculator (after-tax target) ----------------------
export const targetProfitCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 120000));
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit, 80));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 50));
  const targetProfitAfterTax = Math.max(0, safeNumber(values.targetProfitAfterTax, 60000));
  const taxRatePercent = Math.min(99, Math.max(0, safeNumber(values.taxRatePercent, 21)));

  const cm = pricePerUnit - variableCostPerUnit;
  const preTax = targetProfitAfterTax / (1 - taxRatePercent / 100);
  const units = cm > 0 ? Math.ceil((fixedCosts + preTax) / cm) : 0;

  return {
    unitsNeeded: units,
    salesNeeded: round2(units * pricePerUnit),
    profitBeforeTaxNeeded: round2(preTax),
    unitsPerMonth: Math.ceil(units / 12),
  };
};

export const businessProfitCustomCalculators: Record<string, CustomCalculator> = {
  "revenue-calculator": revenueCalculator,
  "operating-profit-calculator": operatingProfitCalculator,
  "gross-margin-calculator": grossMarginCalculator,
  "net-profit-margin-calculator": netProfitMarginCalculator,
  "contribution-margin-ratio-calculator": contributionMarginRatioCalculator,
  "profit-calculator": profitCalculator,
  "profit-percentage-calculator": profitPercentageCalculator,
  "profit-growth-calculator": profitGrowthCalculator,
  "profit-per-unit-calculator": profitPerUnitCalculator,
  "target-profit-calculator": targetProfitCalculator,
};
