/**
 * Batch: "Business Finance Calculators" sub-batch E (Costs, 7 tools). Part of
 * the Business Finance build-out — see calc-engine-business-profit.ts for
 * the full list of 11 sub-batches. Filed under Finance Calculators >
 * Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - costOfGoodsSoldCalculator: COGS from the inventory formula (beginning
 *    inventory + purchases − ending inventory), and the gross margin.
 *  - operatingExpenseCalculator: itemized operating expenses and the
 *    operating expense ratio.
 *  - businessExpenseCalculator: the TRUE monthly cost of running a business
 *    — monthly bills, yearly bills spread monthly, and one-off purchases
 *    spread over their useful life.
 *  - fixedCostCalculator: splits mixed costs into fixed and variable parts
 *    using the high-low method.
 *  - variableCostCalculator: variable cost per unit from materials, labor,
 *    shipping and a sales commission %.
 *  - totalCostCalculator: total cost and average cost per unit at two
 *    volumes — showing economies of scale.
 *  - costPerUnitCalculator: a production batch's cost per GOOD unit after
 *    setup costs and scrap.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-costs-calculators.ts for the tool content/copy
 * this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Cost of Goods Sold (inventory method) -------------------------------
export const costOfGoodsSoldCalculator: CustomCalculator = (values) => {
  const beginningInventory = Math.max(0, safeNumber(values.beginningInventory, 40000));
  const purchases = Math.max(0, safeNumber(values.purchases, 150000));
  const directLaborAndFreight = Math.max(0, safeNumber(values.directLaborAndFreight, 20000));
  const endingInventory = Math.max(0, safeNumber(values.endingInventory, 35000));
  const revenue = Math.max(0, safeNumber(values.revenue, 300000));

  const cogs = beginningInventory + purchases + directLaborAndFreight - endingInventory;

  return {
    costOfGoodsSold: round2(cogs),
    grossProfit: round2(revenue - cogs),
    grossMarginPercent: revenue > 0 ? round2(((revenue - cogs) / revenue) * 100) : 0,
    goodsAvailableForSale: round2(beginningInventory + purchases + directLaborAndFreight),
  };
};

// --- 2. Operating Expense Calculator (itemized) ---------------------------
export const operatingExpenseCalculator: CustomCalculator = (values) => {
  const rent = Math.max(0, safeNumber(values.rent, 36000));
  const salaries = Math.max(0, safeNumber(values.salaries, 180000));
  const marketing = Math.max(0, safeNumber(values.marketing, 24000));
  const utilitiesAndSoftware = Math.max(0, safeNumber(values.utilitiesAndSoftware, 12000));
  const insuranceAndProfessional = Math.max(0, safeNumber(values.insuranceAndProfessional, 15000));
  const otherExpenses = Math.max(0, safeNumber(values.otherExpenses, 8000));
  const revenue = Math.max(0, safeNumber(values.revenue, 600000));

  const total = rent + salaries + marketing + utilitiesAndSoftware + insuranceAndProfessional + otherExpenses;

  return {
    totalOperatingExpenses: round2(total),
    operatingExpenseRatioPercent: revenue > 0 ? round2((total / revenue) * 100) : 0,
    monthlyOperatingExpenses: round2(total / 12),
    salariesSharePercent: total > 0 ? round2((salaries / total) * 100) : 0,
  };
};

// --- 3. Business Expense Calculator (true monthly cost) -------------------
export const businessExpenseCalculator: CustomCalculator = (values) => {
  const monthlyExpenses = Math.max(0, safeNumber(values.monthlyExpenses, 4200));
  const yearlyExpenses = Math.max(0, safeNumber(values.yearlyExpenses, 6000));
  const oneOffPurchases = Math.max(0, safeNumber(values.oneOffPurchases, 18000));
  const usefulLifeYears = Math.max(1, safeNumber(values.usefulLifeYears, 3));

  const spreadYearly = yearlyExpenses / 12;
  const spreadOneOff = oneOffPurchases / (usefulLifeYears * 12);
  const trueMonthly = monthlyExpenses + spreadYearly + spreadOneOff;

  return {
    trueMonthlyCost: round2(trueMonthly),
    trueAnnualCost: round2(trueMonthly * 12),
    yearlyBillsPerMonth: round2(spreadYearly),
    oneOffPurchasesPerMonth: round2(spreadOneOff),
  };
};

// --- 4. Fixed Cost Calculator (high-low method) ---------------------------
export const fixedCostCalculator: CustomCalculator = (values) => {
  const highActivityUnits = Math.max(0, safeNumber(values.highActivityUnits, 12000));
  const highActivityTotalCost = Math.max(0, safeNumber(values.highActivityTotalCost, 98000));
  const lowActivityUnits = Math.max(0, safeNumber(values.lowActivityUnits, 7000));
  const lowActivityTotalCost = Math.max(0, safeNumber(values.lowActivityTotalCost, 73000));

  const unitDiff = highActivityUnits - lowActivityUnits;
  const variablePerUnit = unitDiff !== 0 ? (highActivityTotalCost - lowActivityTotalCost) / unitDiff : 0;
  const fixed = highActivityTotalCost - variablePerUnit * highActivityUnits;

  return {
    fixedCost: round2(fixed),
    variableCostPerUnit: round2(variablePerUnit),
    fixedShareAtHighActivityPercent: highActivityTotalCost > 0 ? round2((fixed / highActivityTotalCost) * 100) : 0,
  };
};

// --- 5. Variable Cost Calculator ----------------------------------------------
export const variableCostCalculator: CustomCalculator = (values) => {
  const materialsPerUnit = Math.max(0, safeNumber(values.materialsPerUnit, 9));
  const directLaborPerUnit = Math.max(0, safeNumber(values.directLaborPerUnit, 6));
  const shippingPerUnit = Math.max(0, safeNumber(values.shippingPerUnit, 3));
  const salesCommissionPercent = Math.min(100, Math.max(0, safeNumber(values.salesCommissionPercent, 5)));
  const pricePerUnit = Math.max(0, safeNumber(values.pricePerUnit, 40));
  const units = Math.max(0, safeNumber(values.units, 3000));

  const perUnit = materialsPerUnit + directLaborPerUnit + shippingPerUnit + (pricePerUnit * salesCommissionPercent) / 100;

  return {
    variableCostPerUnit: round2(perUnit),
    totalVariableCost: round2(perUnit * units),
    variableCostRatioPercent: pricePerUnit > 0 ? round2((perUnit / pricePerUnit) * 100) : 0,
    contributionPerUnit: round2(pricePerUnit - perUnit),
  };
};

// --- 6. Total Cost Calculator (two volumes) -----------------------------------
export const totalCostCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 50000));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 12));
  const units = Math.max(1, safeNumber(values.units, 4000));
  const compareUnits = Math.max(1, safeNumber(values.compareUnits, 8000));

  const total = fixedCosts + variableCostPerUnit * units;
  const totalCompare = fixedCosts + variableCostPerUnit * compareUnits;

  return {
    totalCost: round2(total),
    averageCostPerUnit: round2(total / units),
    totalCostAtComparisonVolume: round2(totalCompare),
    averageCostPerUnitAtComparisonVolume: round2(totalCompare / compareUnits),
  };
};

// --- 7. Cost Per Unit Calculator (batch with setup and scrap) -------------
export const costPerUnitCalculator: CustomCalculator = (values) => {
  const materialsCost = Math.max(0, safeNumber(values.materialsCost, 6000));
  const laborCost = Math.max(0, safeNumber(values.laborCost, 4000));
  const overheadCost = Math.max(0, safeNumber(values.overheadCost, 2000));
  const setupCost = Math.max(0, safeNumber(values.setupCost, 500));
  const unitsProduced = Math.max(1, safeNumber(values.unitsProduced, 1000));
  const scrapPercent = Math.min(99, Math.max(0, safeNumber(values.scrapPercent, 4)));

  const total = materialsCost + laborCost + overheadCost + setupCost;
  const good = Math.max(1, Math.floor(unitsProduced * (1 - scrapPercent / 100)));

  return {
    costPerGoodUnit: round2(total / good),
    costPerUnitBeforeScrap: round2(total / unitsProduced),
    goodUnits: good,
    totalBatchCost: round2(total),
  };
};

export const businessCostsCustomCalculators: Record<string, CustomCalculator> = {
  "cost-of-goods-sold-calculator": costOfGoodsSoldCalculator,
  "operating-expense-calculator": operatingExpenseCalculator,
  "business-expense-calculator": businessExpenseCalculator,
  "fixed-cost-calculator": fixedCostCalculator,
  "variable-cost-calculator": variableCostCalculator,
  "total-cost-calculator": totalCostCalculator,
  "cost-per-unit-calculator": costPerUnitCalculator,
};
