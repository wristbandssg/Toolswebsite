/**
 * Batch: "Business Finance Calculators" sub-batch I (Inventory, Receivables &
 * Payables, 9 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Each tool answers a different working-capital question:
 *  - inventoryTurnoverCalculator: how many times inventory sells through in
 *    a year (COGS ÷ average inventory).
 *  - inventoryDaysCalculator: days of stock on hand, and cash freed by
 *    cutting it to a target.
 *  - economicOrderQuantityCalculator: the order size that minimizes ordering
 *    + holding cost (EOQ).
 *  - reorderPointCalculator: when to reorder — lead-time demand plus safety
 *    stock at a chosen service level.
 *  - inventoryCarryingCostCalculator: the yearly cost of holding stock
 *    (capital, storage, insurance, shrinkage).
 *  - accountsReceivableTurnoverCalculator: how fast customers pay (turnover
 *    and average collection days).
 *  - accountsPayableTurnoverCalculator: how fast you pay suppliers.
 *  - daysSalesOutstandingCalculator: DSO for a period, vs your payment
 *    terms, and the cash tied up.
 *  - daysPayableOutstandingCalculator: DPO for a period, and the cash gained
 *    by paying on your full terms.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-inventory-receivables-calculators.ts for the
 * tool content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Inventory Turnover Calculator -------------------------------------------
export const inventoryTurnoverCalculator: CustomCalculator = (values) => {
  const costOfGoodsSold = Math.max(0, safeNumber(values.costOfGoodsSold, 600000));
  const beginningInventory = Math.max(0, safeNumber(values.beginningInventory, 110000));
  const endingInventory = Math.max(0, safeNumber(values.endingInventory, 90000));

  const avg = (beginningInventory + endingInventory) / 2;
  const turns = avg > 0 ? costOfGoodsSold / avg : 0;

  return {
    inventoryTurnover: round2(turns),
    averageInventory: round2(avg),
    daysToSellInventory: turns > 0 ? round2(365 / turns) : 0,
  };
};

// --- 2. Inventory Days Calculator (days on hand + cash freed) ------------
export const inventoryDaysCalculator: CustomCalculator = (values) => {
  const inventoryValue = Math.max(0, safeNumber(values.inventoryValue, 120000));
  const annualCostOfGoodsSold = Math.max(0.01, safeNumber(values.annualCostOfGoodsSold, 730000));
  const targetDays = Math.max(0, safeNumber(values.targetDays, 45));

  const daily = annualCostOfGoodsSold / 365;
  const days = inventoryValue / daily;

  return {
    daysOfInventoryOnHand: round2(days),
    inventoryAtTargetDays: round2(targetDays * daily),
    cashFreedAtTarget: round2(Math.max(0, inventoryValue - targetDays * daily)),
    dailyCostOfGoodsSold: round2(daily),
  };
};

// --- 3. Economic Order Quantity (EOQ) --------------------------------------
export const economicOrderQuantityCalculator: CustomCalculator = (values) => {
  const annualDemandUnits = Math.max(0, safeNumber(values.annualDemandUnits, 12000));
  const costPerOrder = Math.max(0, safeNumber(values.costPerOrder, 75));
  const holdingCostPerUnitPerYear = Math.max(0.0001, safeNumber(values.holdingCostPerUnitPerYear, 2));

  const eoq = Math.sqrt((2 * annualDemandUnits * costPerOrder) / holdingCostPerUnitPerYear);
  const orders = eoq > 0 ? annualDemandUnits / eoq : 0;

  return {
    economicOrderQuantity: Math.round(eoq),
    ordersPerYear: round2(orders),
    annualOrderingCost: round2(orders * costPerOrder),
    annualHoldingCost: round2((eoq / 2) * holdingCostPerUnitPerYear),
    daysBetweenOrders: orders > 0 ? round2(365 / orders) : 0,
  };
};

// --- 4. Reorder Point Calculator (with safety stock) -----------------------
export const reorderPointCalculator: CustomCalculator = (values) => {
  const averageDailyDemand = Math.max(0, safeNumber(values.averageDailyDemand, 40));
  const leadTimeDays = Math.max(0, safeNumber(values.leadTimeDays, 10));
  const dailyDemandStdDev = Math.max(0, safeNumber(values.dailyDemandStdDev, 8));
  // z-score for the service level chosen (e.g. 1.65 ≈ 95%).
  const serviceLevelZ = Math.max(0, safeNumber(values.serviceLevelZ, 1.65));

  const safety = serviceLevelZ * dailyDemandStdDev * Math.sqrt(leadTimeDays);
  const leadDemand = averageDailyDemand * leadTimeDays;

  return {
    reorderPoint: Math.ceil(leadDemand + safety),
    safetyStock: Math.ceil(safety),
    demandDuringLeadTime: round2(leadDemand),
  };
};

// --- 5. Inventory Carrying Cost Calculator ----------------------------------
export const inventoryCarryingCostCalculator: CustomCalculator = (values) => {
  const averageInventoryValue = Math.max(0, safeNumber(values.averageInventoryValue, 200000));
  const costOfCapitalPercent = Math.max(0, safeNumber(values.costOfCapitalPercent, 8));
  const storagePercent = Math.max(0, safeNumber(values.storagePercent, 6));
  const insuranceAndTaxesPercent = Math.max(0, safeNumber(values.insuranceAndTaxesPercent, 2));
  const shrinkageObsolescencePercent = Math.max(0, safeNumber(values.shrinkageObsolescencePercent, 5));

  const rate = costOfCapitalPercent + storagePercent + insuranceAndTaxesPercent + shrinkageObsolescencePercent;
  const cost = (averageInventoryValue * rate) / 100;

  return {
    annualCarryingCost: round2(cost),
    carryingCostRatePercent: round2(rate),
    monthlyCarryingCost: round2(cost / 12),
    costOfCapitalPortion: round2((averageInventoryValue * costOfCapitalPercent) / 100),
  };
};

// --- 6. Accounts Receivable Turnover Calculator -----------------------------
export const accountsReceivableTurnoverCalculator: CustomCalculator = (values) => {
  const netCreditSales = Math.max(0, safeNumber(values.netCreditSales, 1200000));
  const beginningReceivables = Math.max(0, safeNumber(values.beginningReceivables, 140000));
  const endingReceivables = Math.max(0, safeNumber(values.endingReceivables, 160000));

  const avg = (beginningReceivables + endingReceivables) / 2;
  const turns = avg > 0 ? netCreditSales / avg : 0;

  return {
    receivablesTurnover: round2(turns),
    averageCollectionDays: turns > 0 ? round2(365 / turns) : 0,
    averageReceivables: round2(avg),
  };
};

// --- 7. Accounts Payable Turnover Calculator --------------------------------
export const accountsPayableTurnoverCalculator: CustomCalculator = (values) => {
  const supplierPurchases = Math.max(0, safeNumber(values.supplierPurchases, 800000));
  const beginningPayables = Math.max(0, safeNumber(values.beginningPayables, 90000));
  const endingPayables = Math.max(0, safeNumber(values.endingPayables, 70000));

  const avg = (beginningPayables + endingPayables) / 2;
  const turns = avg > 0 ? supplierPurchases / avg : 0;

  return {
    payablesTurnover: round2(turns),
    averageDaysToPaySuppliers: turns > 0 ? round2(365 / turns) : 0,
    averagePayables: round2(avg),
  };
};

// --- 8. Days Sales Outstanding (DSO) ---------------------------------------
export const daysSalesOutstandingCalculator: CustomCalculator = (values) => {
  const accountsReceivable = Math.max(0, safeNumber(values.accountsReceivable, 95000));
  const creditSalesInPeriod = Math.max(0.01, safeNumber(values.creditSalesInPeriod, 250000));
  const daysInPeriod = Math.max(1, safeNumber(values.daysInPeriod, 90));
  const paymentTermsDays = Math.max(0, safeNumber(values.paymentTermsDays, 30));

  const daily = creditSalesInPeriod / daysInPeriod;
  const dso = accountsReceivable / daily;

  return {
    daysSalesOutstanding: round2(dso),
    daysBeyondTerms: round2(dso - paymentTermsDays),
    receivablesIfPaidOnTerms: round2(daily * paymentTermsDays),
    cashTiedUpBeyondTerms: round2(Math.max(0, accountsReceivable - daily * paymentTermsDays)),
  };
};

// --- 9. Days Payable Outstanding (DPO) --------------------------------------
export const daysPayableOutstandingCalculator: CustomCalculator = (values) => {
  const accountsPayable = Math.max(0, safeNumber(values.accountsPayable, 60000));
  const costOfGoodsSoldInPeriod = Math.max(0.01, safeNumber(values.costOfGoodsSoldInPeriod, 180000));
  const daysInPeriod = Math.max(1, safeNumber(values.daysInPeriod, 90));
  const supplierTermsDays = Math.max(0, safeNumber(values.supplierTermsDays, 45));

  const daily = costOfGoodsSoldInPeriod / daysInPeriod;
  const dpo = accountsPayable / daily;

  return {
    daysPayableOutstanding: round2(dpo),
    daysLeftOnTerms: round2(supplierTermsDays - dpo),
    cashGainedByPayingOnFullTerms: round2(Math.max(0, daily * supplierTermsDays - accountsPayable)),
  };
};

export const businessInventoryReceivablesCustomCalculators: Record<string, CustomCalculator> = {
  "inventory-turnover-calculator": inventoryTurnoverCalculator,
  "inventory-days-calculator": inventoryDaysCalculator,
  "economic-order-quantity-calculator": economicOrderQuantityCalculator,
  "reorder-point-calculator": reorderPointCalculator,
  "inventory-carrying-cost-calculator": inventoryCarryingCostCalculator,
  "accounts-receivable-turnover-calculator": accountsReceivableTurnoverCalculator,
  "accounts-payable-turnover-calculator": accountsPayableTurnoverCalculator,
  "days-sales-outstanding-calculator": daysSalesOutstandingCalculator,
  "days-payable-outstanding-calculator": daysPayableOutstandingCalculator,
};
