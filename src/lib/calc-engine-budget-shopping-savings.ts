/**
 * Batch: "Budget Calculators" (5 Oct 2026), sub-batch 10 of 12 — Shopping
 * Savings (8 tools), filed under Budget Calculators > Money-Saving &
 * Spending Calculators. See calc-engine-budget-methods.ts for the full batch
 * context.
 *
 *  - buyInBulkSavingsEstimate: unit prices, yearly savings after a
 *    warehouse membership and waste.
 *  - couponAndDiscountSavingsTracker (incl. seasonal sale timing): coupons,
 *    cash back and waiting for sales -> yearly savings and per hour spent.
 *  - loyaltyPointsValueEstimator: cash vs transfer/redemption value.
 *  - creditCardRewardsOptimization: flat-rate card vs category card net of
 *    annual fee.
 *  - groceryDeliveryVsInStoreCost: fees, markup and tip vs driving, time and
 *    impulse buys.
 *  - mealPrepVsTakeoutCostSavings: per-meal saving and per hour of prep.
 *  - diyVsProfessionalServiceCostSavings: materials, tools and your time vs
 *    a quote.
 *  - recurringBillNegotiationSavings: expected savings from negotiating
 *    bills.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-budget-shopping-savings-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));

// --- 1. Buy-in-Bulk Savings Estimate Calculator ----------------------------------------
export const buyInBulkSavingsEstimateCalculator: CustomCalculator = (values) => {
  const bulkPrice = pos(values.bulkPrice, 24);
  const bulkUnits = Math.max(1, pos(values.bulkUnits, 48));
  const regularPrice = pos(values.regularPrice, 4.5);
  const regularUnits = Math.max(1, pos(values.regularUnits, 6));
  const bulkBuysPerYear = pos(values.bulkBuysPerYear, 12);
  const wastePercent = Math.min(100, pos(values.wastePercent, 5));
  const membership = pos(values.membership, 65);

  const bulkUnit = bulkPrice / bulkUnits;
  const regularUnit = regularPrice / regularUnits;
  const usedUnits = bulkUnits * bulkBuysPerYear * (1 - wastePercent / 100);
  const yearly = usedUnits * regularUnit - bulkPrice * bulkBuysPerYear;

  return {
    bulkUnitPrice: round2(bulkUnit),
    regularUnitPrice: round2(regularUnit),
    savingsPerUnitPercent: round2(regularUnit > 0 ? ((regularUnit - bulkUnit) / regularUnit) * 100 : 0),
    yearlySavingsBeforeMembership: round2(yearly),
    netYearlySavings: round2(yearly - membership),
  };
};

// --- 2. Coupon and Discount Savings Tracker Calculator ---------------------------------
export const couponAndDiscountSavingsTrackerCalculator: CustomCalculator = (values) => {
  const weeklySpend = pos(values.weeklySpend, 200);
  const couponPercent = pos(values.couponPercent, 8);
  const cashBackPercent = pos(values.cashBackPercent, 2);
  const bigPurchasesYearly = pos(values.bigPurchasesYearly, 1500);
  const saleTimingPercent = pos(values.saleTimingPercent, 20);
  const hoursPerWeek = pos(values.hoursPerWeek, 1);

  const yearlySpend = weeklySpend * 52;
  const coupons = (yearlySpend * couponPercent) / 100;
  const cashBack = ((yearlySpend - coupons) * cashBackPercent) / 100;
  const sales = (bigPurchasesYearly * saleTimingPercent) / 100;
  const total = coupons + cashBack + sales;
  const hours = hoursPerWeek * 52;

  return {
    couponSavings: round2(coupons),
    cashBackEarned: round2(cashBack),
    saleTimingSavings: round2(sales),
    totalYearlySavings: round2(total),
    savingsPerHour: round2(hours > 0 ? total / hours : 0),
  };
};

// --- 3. Loyalty Points Value Estimator Calculator --------------------------------------
export const loyaltyPointsValueEstimatorCalculator: CustomCalculator = (values) => {
  const points = pos(values.points, 50000);
  const cashCentsPerPoint = pos(values.cashCentsPerPoint, 1);
  const bestCentsPerPoint = pos(values.bestCentsPerPoint, 1.5);
  const yearlyPointsEarned = pos(values.yearlyPointsEarned, 30000);

  return {
    cashValue: round2((points * cashCentsPerPoint) / 100),
    bestRedemptionValue: round2((points * bestCentsPerPoint) / 100),
    extraFromBestRedemption: round2((points * (bestCentsPerPoint - cashCentsPerPoint)) / 100),
    yearlyEarningsValue: round2((yearlyPointsEarned * bestCentsPerPoint) / 100),
  };
};

// --- 4. Credit Card Rewards Optimization Calculator ------------------------------------
export const creditCardRewardsOptimizationCalculator: CustomCalculator = (values) => {
  const groceries = pos(values.groceries, 600);
  const dining = pos(values.dining, 300);
  const gas = pos(values.gas, 200);
  const other = pos(values.other, 1500);
  const flatRatePercent = pos(values.flatRatePercent, 2);
  const flatFee = pos(values.flatFee, 0);
  const groceryRatePercent = pos(values.groceryRatePercent, 4);
  const diningRatePercent = pos(values.diningRatePercent, 4);
  const gasRatePercent = pos(values.gasRatePercent, 3);
  const otherRatePercent = pos(values.otherRatePercent, 1);
  const categoryFee = pos(values.categoryFee, 95);

  const total = groceries + dining + gas + other;
  const flat = (total * 12 * flatRatePercent) / 100 - flatFee;
  const category =
    ((groceries * groceryRatePercent + dining * diningRatePercent + gas * gasRatePercent + other * otherRatePercent) * 12) / 100 -
    categoryFee;

  return {
    yearlySpending: round2(total * 12),
    flatCardNetRewards: round2(flat),
    categoryCardNetRewards: round2(category),
    categoryCardAdvantage: round2(category - flat),
    comboNetRewards: round2(
      ((groceries * Math.max(groceryRatePercent, flatRatePercent) +
        dining * Math.max(diningRatePercent, flatRatePercent) +
        gas * Math.max(gasRatePercent, flatRatePercent) +
        other * Math.max(otherRatePercent, flatRatePercent)) *
        12) /
        100 -
        categoryFee -
        flatFee
    ),
  };
};

// --- 5. Grocery Delivery vs In-Store Cost Calculator -----------------------------------
export const groceryDeliveryVsInStoreCostCalculator: CustomCalculator = (values) => {
  const weeklyGroceries = pos(values.weeklyGroceries, 200);
  const ordersPerWeek = pos(values.ordersPerWeek, 1);
  const deliveryFee = pos(values.deliveryFee, 6);
  const serviceFeePercent = pos(values.serviceFeePercent, 5);
  const markupPercent = pos(values.markupPercent, 8);
  const tip = pos(values.tip, 8);
  const membershipYearly = pos(values.membershipYearly, 0);
  const milesRoundTrip = pos(values.milesRoundTrip, 6);
  const costPerMile = pos(values.costPerMile, 0.7);
  const impulsePercent = pos(values.impulsePercent, 10);
  const minutesPerTrip = pos(values.minutesPerTrip, 60);
  const hourlyValue = pos(values.hourlyValue, 20);

  const deliveryExtra = 52 * (ordersPerWeek * (deliveryFee + tip) + (weeklyGroceries * (serviceFeePercent + markupPercent)) / 100) + membershipYearly;
  const inStoreExtra = 52 * ordersPerWeek * milesRoundTrip * costPerMile + (52 * weeklyGroceries * impulsePercent) / 100;
  const timeValue = (52 * ordersPerWeek * minutesPerTrip * hourlyValue) / 60;

  return {
    deliveryExtraCostPerYear: round2(deliveryExtra),
    inStoreExtraCostPerYear: round2(inStoreExtra),
    deliveryCostsMoreBy: round2(deliveryExtra - inStoreExtra),
    valueOfTimeSaved: round2(timeValue),
    netCostOfDeliveryAfterTime: round2(deliveryExtra - inStoreExtra - timeValue),
  };
};

// --- 6. Meal Prep vs Takeout Cost Savings Calculator -----------------------------------
export const mealPrepVsTakeoutCostSavingsCalculator: CustomCalculator = (values) => {
  const mealsPerWeek = pos(values.mealsPerWeek, 10);
  const takeoutPerMeal = pos(values.takeoutPerMeal, 15);
  const prepPerMeal = pos(values.prepPerMeal, 4.5);
  const prepHoursPerWeek = pos(values.prepHoursPerWeek, 3);

  const weekly = mealsPerWeek * (takeoutPerMeal - prepPerMeal);

  return {
    weeklySavings: round2(weekly),
    monthlySavings: round2((weekly * 52) / 12),
    yearlySavings: round2(weekly * 52),
    savingsPerHourOfPrep: round2(prepHoursPerWeek > 0 ? weekly / prepHoursPerWeek : 0),
  };
};

// --- 7. DIY vs Professional Service Cost Savings Calculator ----------------------------
export const diyVsProfessionalServiceCostSavingsCalculator: CustomCalculator = (values) => {
  const proQuote = pos(values.proQuote, 2000);
  const materials = pos(values.materials, 700);
  const tools = pos(values.tools, 250);
  const hours = pos(values.hours, 20);
  const hourlyValue = pos(values.hourlyValue, 30);
  const reworkRiskPercent = Math.min(100, pos(values.reworkRiskPercent, 10));

  const diyCash = (materials + tools) * (1 + reworkRiskPercent / 100);
  const diyWithTime = diyCash + hours * hourlyValue;

  return {
    diyCashCost: round2(diyCash),
    cashSavings: round2(proQuote - diyCash),
    diyCostIncludingTime: round2(diyWithTime),
    savingsIncludingTime: round2(proQuote - diyWithTime),
    effectiveHourlyPay: round2(hours > 0 ? (proQuote - diyCash) / hours : 0),
  };
};

// --- 8. Recurring Bill Negotiation Savings Calculator ----------------------------------
export const recurringBillNegotiationSavingsCalculator: CustomCalculator = (values) => {
  const bills = [pos(values.internet, 80), pos(values.phone, 100), pos(values.insurance, 180), pos(values.tv, 90), pos(values.other, 50)];
  const reductionPercent = pos(values.reductionPercent, 15);
  const successPercent = Math.min(100, pos(values.successPercent, 60));

  const monthly = bills.reduce((s, v) => s + v, 0);
  const ifAll = (monthly * reductionPercent) / 100;
  const expected = (ifAll * successPercent) / 100;

  return {
    monthlyBills: round2(monthly),
    monthlySavingsIfAllSucceed: round2(ifAll),
    expectedMonthlySavings: round2(expected),
    expectedYearlySavings: round2(expected * 12),
  };
};

export const budgetShoppingSavingsCustomCalculators: Record<string, CustomCalculator> = {
  "buy-in-bulk-savings-estimate-calculator": buyInBulkSavingsEstimateCalculator,
  "coupon-and-discount-savings-tracker-calculator": couponAndDiscountSavingsTrackerCalculator,
  "loyalty-points-value-estimator-calculator": loyaltyPointsValueEstimatorCalculator,
  "credit-card-rewards-optimization-calculator": creditCardRewardsOptimizationCalculator,
  "grocery-delivery-vs-in-store-cost-calculator": groceryDeliveryVsInStoreCostCalculator,
  "meal-prep-vs-takeout-cost-savings-calculator": mealPrepVsTakeoutCostSavingsCalculator,
  "diy-vs-professional-service-cost-savings-calculator": diyVsProfessionalServiceCostSavingsCalculator,
  "recurring-bill-negotiation-savings-calculator": recurringBillNegotiationSavingsCalculator,
};
