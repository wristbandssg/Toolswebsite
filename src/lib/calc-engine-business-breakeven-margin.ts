/**
 * Batch: "Business Finance Calculators" sub-batch B (Break-Even, Margin &
 * Markup, 8 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different (break-even-
 * calculator already gives break-even units and revenue from fixed costs,
 * price and variable cost; markup-calculator turns cost + markup % into a
 * price):
 *  - breakEvenPointCalculator: break-even in TIME — the month a business
 *    earns back its start-up costs, plus the monthly break-even volume.
 *  - breakEvenRevenueCalculator: break-even sales from fixed costs and a
 *    contribution margin RATIO (no unit data), with margin of safety.
 *  - breakEvenSalesCalculator: break-even for a two-product SALES MIX.
 *  - breakEvenPriceCalculator: the lowest price that covers all costs at an
 *    expected volume, and the price for a target profit margin.
 *  - marginCalculator: the selling price that gives a target margin on a
 *    cost (margin-based, not markup-based, pricing).
 *  - marginPercentageCalculator: margin % from a price and a cost.
 *  - markupPercentageCalculator: markup % from a price and a cost, and the
 *    markup needed for a target margin.
 *  - marginVsMarkupCalculator: converts a margin % to the equivalent markup
 *    % and back.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-breakeven-margin-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Break-Even Point Calculator (months to recover start-up costs) ----
export const breakEvenPointCalculator: CustomCalculator = (values) => {
  const startupCosts = Math.max(0, safeNumber(values.startupCosts, 50000));
  const monthlyFixedCosts = Math.max(0, safeNumber(values.monthlyFixedCosts, 8000));
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit, 60));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 25));
  const unitsPerMonth = Math.max(0, safeNumber(values.unitsPerMonth, 400));

  const cm = pricePerUnit - variableCostPerUnit;
  const monthlyProfit = cm * unitsPerMonth - monthlyFixedCosts;

  return {
    // 0 = never, at this volume.
    monthsToRecoverStartupCosts: monthlyProfit > 0 ? round2(startupCosts / monthlyProfit) : 0,
    monthlyProfit: round2(monthlyProfit),
    monthlyBreakEvenUnits: cm > 0 ? Math.ceil(monthlyFixedCosts / cm) : 0,
    monthlyBreakEvenRevenue: cm > 0 ? round2(Math.ceil(monthlyFixedCosts / cm) * pricePerUnit) : 0,
  };
};

// --- 2. Break-Even Revenue Calculator (from CM ratio) ----------------------
export const breakEvenRevenueCalculator: CustomCalculator = (values) => {
  const annualFixedCosts = Math.max(0, safeNumber(values.annualFixedCosts, 180000));
  const contributionMarginRatioPercent = Math.min(100, Math.max(0, safeNumber(values.contributionMarginRatioPercent, 40)));
  const currentRevenue = Math.max(0, safeNumber(values.currentRevenue, 600000));

  const ratio = contributionMarginRatioPercent / 100;
  const breakEven = ratio > 0 ? annualFixedCosts / ratio : 0;

  return {
    breakEvenRevenue: round2(breakEven),
    monthlyBreakEvenRevenue: round2(breakEven / 12),
    marginOfSafety: round2(currentRevenue - breakEven),
    marginOfSafetyPercent: currentRevenue > 0 ? round2(((currentRevenue - breakEven) / currentRevenue) * 100) : 0,
  };
};

// --- 3. Break-Even Sales Calculator (two-product mix) ----------------------
export const breakEvenSalesCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 90000));
  const productAPrice = Math.max(0, safeNumber(values.productAPrice, 50));
  const productAVariableCost = Math.max(0, safeNumber(values.productAVariableCost, 30));
  const productBPrice = Math.max(0, safeNumber(values.productBPrice, 120));
  const productBVariableCost = Math.max(0, safeNumber(values.productBVariableCost, 60));
  const productASharePercent = Math.min(100, Math.max(0, safeNumber(values.productASharePercent, 75)));

  const a = productASharePercent / 100;
  const weightedCm = a * (productAPrice - productAVariableCost) + (1 - a) * (productBPrice - productBVariableCost);
  const units = weightedCm > 0 ? fixedCosts / weightedCm : 0;
  const unitsA = Math.ceil(units * a);
  const unitsB = Math.ceil(units * (1 - a));

  return {
    breakEvenSales: round2(unitsA * productAPrice + unitsB * productBPrice),
    breakEvenUnitsProductA: unitsA,
    breakEvenUnitsProductB: unitsB,
    weightedContributionPerUnit: round2(weightedCm),
  };
};

// --- 4. Break-Even Price Calculator ---------------------------------------------
export const breakEvenPriceCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 40000));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 18));
  const expectedUnits = Math.max(1, safeNumber(values.expectedUnits, 2500));
  const targetMarginPercent = Math.min(95, Math.max(0, safeNumber(values.targetMarginPercent, 20)));

  const breakEven = variableCostPerUnit + fixedCosts / expectedUnits;

  return {
    breakEvenPrice: round2(breakEven),
    fixedCostPerUnit: round2(fixedCosts / expectedUnits),
    priceForTargetMargin: round2(breakEven / (1 - targetMarginPercent / 100)),
    breakEvenRevenue: round2(breakEven * expectedUnits),
  };
};

// --- 5. Margin Calculator (price for a target margin) ---------------------
export const marginCalculator: CustomCalculator = (values) => {
  const cost = Math.max(0, safeNumber(values.cost, 40));
  const targetMarginPercent = Math.min(99, Math.max(0, safeNumber(values.targetMarginPercent, 35)));

  const price = cost / (1 - targetMarginPercent / 100);

  return {
    sellingPrice: round2(price),
    profitPerSale: round2(price - cost),
    equivalentMarkupPercent: cost > 0 ? round2(((price - cost) / cost) * 100) : 0,
  };
};

// --- 6. Margin Percentage Calculator ---------------------------------------
export const marginPercentageCalculator: CustomCalculator = (values) => {
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice, 75));
  const cost = Math.max(0, safeNumber(values.cost, 45));
  const quantity = Math.max(0, safeNumber(values.quantity, 100));

  const profit = sellingPrice - cost;

  return {
    marginPercent: sellingPrice > 0 ? round2((profit / sellingPrice) * 100) : 0,
    profitPerItem: round2(profit),
    totalProfit: round2(profit * quantity),
    totalRevenue: round2(sellingPrice * quantity),
  };
};

// --- 7. Markup Percentage Calculator ----------------------------------------
export const markupPercentageCalculator: CustomCalculator = (values) => {
  const cost = Math.max(0, safeNumber(values.cost, 30));
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice, 45));
  const targetMarginPercent = Math.min(99, Math.max(0, safeNumber(values.targetMarginPercent, 40)));

  const t = targetMarginPercent / 100;

  return {
    markupPercent: cost > 0 ? round2(((sellingPrice - cost) / cost) * 100) : 0,
    marginPercent: sellingPrice > 0 ? round2(((sellingPrice - cost) / sellingPrice) * 100) : 0,
    markupNeededForTargetMarginPercent: round2((t / (1 - t)) * 100),
    priceAtTargetMargin: round2(cost / (1 - t)),
  };
};

// --- 8. Margin vs Markup Calculator (conversion) ---------------------------
export const marginVsMarkupCalculator: CustomCalculator = (values) => {
  const percent = Math.max(0, safeNumber(values.percent, 25));
  // 1 = the number entered is a margin %, 2 = it's a markup %
  const entered = Math.round(safeNumber(values.entered, 1)) === 2 ? 2 : 1;
  const cost = Math.max(0, safeNumber(values.cost, 100));

  const p = percent / 100;
  const margin = entered === 1 ? Math.min(p, 0.9999) : p / (1 + p);
  const markup = entered === 1 ? margin / (1 - margin) : p;
  const price = cost * (1 + markup);

  return {
    marginPercent: round2(margin * 100),
    markupPercent: round2(markup * 100),
    priceOnThisCost: round2(price),
    profitOnThisCost: round2(price - cost),
  };
};

export const businessBreakevenMarginCustomCalculators: Record<string, CustomCalculator> = {
  "break-even-point-calculator": breakEvenPointCalculator,
  "break-even-revenue-calculator": breakEvenRevenueCalculator,
  "break-even-sales-calculator": breakEvenSalesCalculator,
  "break-even-price-calculator": breakEvenPriceCalculator,
  "margin-calculator": marginCalculator,
  "margin-percentage-calculator": marginPercentageCalculator,
  "markup-percentage-calculator": markupPercentageCalculator,
  "margin-vs-markup-calculator": marginVsMarkupCalculator,
};
