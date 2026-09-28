/**
 * Batch: "Real Estate Calculators" sub-batch B (Rental Yields & Ratios, 11
 * tools). Part of the Real Estate build-out — see calc-engine-realestate-
 * rental-income.ts for the full list of 11 sub-batches. Filed under Finance
 * Calculators > Real Estate Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - rentalYieldCalculator: yield on what you PAID vs yield on what the
 *    property is WORTH today.
 *  - grossRentalYieldCalculator: gross yield and the most you could pay for
 *    a target gross yield.
 *  - netRentalYieldCalculator: yield after expenses on the total purchase
 *    cost (price + buying costs).
 *  - rentIncreaseCalculator: a rent rise by % or to a new amount, checked
 *    against a legal/lease cap and inflation.
 *  - rentalAffordabilityCalculator: the most a TENANT can pay (30% rule and
 *    a debt-aware 40% rule).
 *  - rentToIncomeRatioCalculator: a LANDLORD's screen — rent ÷ income and
 *    the "3× rent" income test.
 *  - rentToValueRatioCalculator: monthly rent ÷ current/after-repair value,
 *    and the rent needed for the 1% rule.
 *  - rentToPriceRatioCalculator: monthly rent ÷ all-in purchase cost, and
 *    the most to pay for a target ratio.
 *  - priceToRentRatioCalculator: price ÷ YEARLY rent — the buy-vs-rent
 *    market signal.
 *  - grossRentMultiplierCalculator: GRM, and a value from a market GRM.
 *  - rentalPropertyPaybackPeriodCalculator: years for rising cash flow to
 *    repay the cash invested.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-realestate-rental-ratios-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Rental Yield Calculator (on cost vs on value) --------------------
export const rentalYieldCalculator: CustomCalculator = (values) => {
  const annualRent = Math.max(0, safeNumber(values.annualRent, 21600));
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 6000));
  const purchasePrice = Math.max(0.01, safeNumber(values.purchasePrice, 250000));
  const currentValue = Math.max(0.01, safeNumber(values.currentValue, 320000));

  const net = annualRent - annualExpenses;

  return {
    netYieldOnCostPercent: pct(net, purchasePrice),
    netYieldOnCurrentValuePercent: pct(net, currentValue),
    grossYieldOnCostPercent: pct(annualRent, purchasePrice),
    grossYieldOnCurrentValuePercent: pct(annualRent, currentValue),
  };
};

// --- 2. Gross Rental Yield (+ max price for a target) ---------------------
export const grossRentalYieldCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 1800));
  const propertyPrice = Math.max(0.01, safeNumber(values.propertyPrice, 280000));
  const targetYieldPercent = Math.max(0.01, safeNumber(values.targetYieldPercent, 8));

  const annual = monthlyRent * 12;

  return {
    grossRentalYieldPercent: pct(annual, propertyPrice),
    annualRent: round2(annual),
    maxPriceForTargetYield: round2(annual / (targetYieldPercent / 100)),
    rentNeededForTargetYield: round2((propertyPrice * targetYieldPercent) / 100 / 12),
  };
};

// --- 3. Net Rental Yield (on total purchase cost) --------------------------
export const netRentalYieldCalculator: CustomCalculator = (values) => {
  const annualRent = Math.max(0, safeNumber(values.annualRent, 24000));
  const vacancyPercent = Math.min(100, Math.max(0, safeNumber(values.vacancyPercent, 5)));
  const annualExpenses = Math.max(0, safeNumber(values.annualExpenses, 7500));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 280000));
  const buyingCosts = Math.max(0, safeNumber(values.buyingCosts, 12000));

  const cost = Math.max(0.01, purchasePrice + buyingCosts);
  const net = annualRent * (1 - vacancyPercent / 100) - annualExpenses;

  return {
    netRentalYieldPercent: pct(net, cost),
    netAnnualIncome: round2(net),
    totalPurchaseCost: round2(cost),
    grossYieldPercent: pct(annualRent, cost),
  };
};

// --- 4. Rent Increase Calculator (vs cap and inflation) -------------------
export const rentIncreaseCalculator: CustomCalculator = (values) => {
  const currentRent = Math.max(0.01, safeNumber(values.currentRent, 1650));
  const increasePercent = safeNumber(values.increasePercent, 5);
  const legalCapPercent = Math.max(0, safeNumber(values.legalCapPercent, 7));
  const inflationPercent = safeNumber(values.inflationPercent, 3);

  const newRent = currentRent * (1 + increasePercent / 100);

  return {
    newMonthlyRent: round2(newRent),
    increasePerMonth: round2(newRent - currentRent),
    increasePerYear: round2((newRent - currentRent) * 12),
    // Negative = over the cap by this many points.
    roomUnderCapPercent: round2(legalCapPercent - increasePercent),
    realIncreaseAfterInflationPercent: round2(((1 + increasePercent / 100) / (1 + inflationPercent / 100) - 1) * 100),
  };
};

// --- 5. Rental Affordability (tenant) ---------------------------------------
export const rentalAffordabilityCalculator: CustomCalculator = (values) => {
  const grossMonthlyIncome = Math.max(0, safeNumber(values.grossMonthlyIncome, 5500));
  const monthlyDebtPayments = Math.max(0, safeNumber(values.monthlyDebtPayments, 450));
  const rentSharePercent = Math.max(0, safeNumber(values.rentSharePercent, 30));
  const utilitiesEstimate = Math.max(0, safeNumber(values.utilitiesEstimate, 150));

  const byRule = (grossMonthlyIncome * rentSharePercent) / 100;
  // Debt-aware: rent + debts within 40% of gross income.
  const byDebt = Math.max(0, grossMonthlyIncome * 0.4 - monthlyDebtPayments);
  // Utilities come out of the budget, so the rent itself must be lower.
  const rent = Math.max(0, Math.min(byRule, byDebt) - utilitiesEstimate);

  return {
    maxAffordableRent: round2(rent),
    rentByPercentRule: round2(byRule),
    rentWithDebtsConsidered: round2(byDebt),
    annualIncomeNeededFor3xRule: round2(rent * 3 * 12),
  };
};

// --- 6. Rent-to-Income Ratio (landlord screen) ----------------------------
export const rentToIncomeRatioCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 1800));
  const applicantMonthlyIncome = Math.max(0.01, safeNumber(values.applicantMonthlyIncome, 5000));
  const requiredMultiple = Math.max(0.1, safeNumber(values.requiredMultiple, 3));

  return {
    rentToIncomeRatioPercent: pct(monthlyRent, applicantMonthlyIncome),
    incomeMultipleOfRent: round2(applicantMonthlyIncome / Math.max(0.01, monthlyRent)),
    monthlyIncomeRequired: round2(monthlyRent * requiredMultiple),
    incomeShortfallOrSurplus: round2(applicantMonthlyIncome - monthlyRent * requiredMultiple),
  };
};

// --- 7. Rent-to-Value Ratio (1% rule on value) -----------------------------
export const rentToValueRatioCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 2100));
  const propertyValue = Math.max(0.01, safeNumber(values.propertyValue, 240000));
  const targetRatioPercent = Math.max(0, safeNumber(values.targetRatioPercent, 1));

  return {
    rentToValueRatioPercent: round2((monthlyRent / propertyValue) * 100),
    rentNeededForTarget: round2((propertyValue * targetRatioPercent) / 100),
    rentGapToTarget: round2((propertyValue * targetRatioPercent) / 100 - monthlyRent),
  };
};

// --- 8. Rent-to-Price Ratio (all-in cost, max price) -----------------------
export const rentToPriceRatioCalculator: CustomCalculator = (values) => {
  const monthlyRent = Math.max(0, safeNumber(values.monthlyRent, 1500));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 130000));
  const repairCosts = Math.max(0, safeNumber(values.repairCosts, 20000));
  const targetRatioPercent = Math.max(0.01, safeNumber(values.targetRatioPercent, 1));

  const allIn = Math.max(0.01, purchasePrice + repairCosts);

  return {
    rentToPriceRatioPercent: round2((monthlyRent / allIn) * 100),
    allInCost: round2(allIn),
    maxAllInCostForTarget: round2(monthlyRent / (targetRatioPercent / 100)),
    maxPurchasePriceForTarget: round2(Math.max(0, monthlyRent / (targetRatioPercent / 100) - repairCosts)),
  };
};

// --- 9. Price-to-Rent Ratio (buy vs rent signal) ----------------------------
export const priceToRentRatioCalculator: CustomCalculator = (values) => {
  const homePrice = Math.max(0, safeNumber(values.homePrice, 420000));
  const monthlyRent = Math.max(0.01, safeNumber(values.monthlyRent, 2100));

  const ratio = homePrice / (monthlyRent * 12);

  return {
    priceToRentRatio: round2(ratio),
    annualRent: round2(monthlyRent * 12),
    // Rule of thumb: ≤15 favors buying, 16–20 is in between, ≥21 favors renting.
    priceAtRatioOf15: round2(monthlyRent * 12 * 15),
    monthlyRentAtRatioOf20: round2(homePrice / 20 / 12),
  };
};

// --- 10. Gross Rent Multiplier (GRM) -----------------------------------------
export const grossRentMultiplierCalculator: CustomCalculator = (values) => {
  const propertyPrice = Math.max(0, safeNumber(values.propertyPrice, 600000));
  const grossAnnualRent = Math.max(0.01, safeNumber(values.grossAnnualRent, 72000));
  const marketGrm = Math.max(0, safeNumber(values.marketGrm, 9));

  return {
    grossRentMultiplier: round2(propertyPrice / grossAnnualRent),
    valueAtMarketGrm: round2(grossAnnualRent * marketGrm),
    priceAboveOrBelowMarketValue: round2(propertyPrice - grossAnnualRent * marketGrm),
    grossYieldPercent: pct(grossAnnualRent, propertyPrice),
  };
};

// --- 11. Rental Property Payback Period (rising cash flow) ----------------
export const rentalPropertyPaybackPeriodCalculator: CustomCalculator = (values) => {
  const cashInvested = Math.max(0, safeNumber(values.cashInvested, 75000));
  const firstYearCashFlow = safeNumber(values.firstYearCashFlow, 6000);
  const cashFlowGrowthPercent = safeNumber(values.cashFlowGrowthPercent, 3);

  let cum = 0;
  let years = 0;
  if (firstYearCashFlow > 0) {
    for (let y = 1; y <= 100; y++) {
      const cf = firstYearCashFlow * Math.pow(1 + cashFlowGrowthPercent / 100, y - 1);
      if (cum + cf >= cashInvested) {
        years = y - 1 + (cashInvested - cum) / cf;
        break;
      }
      cum += cf;
    }
  }

  return {
    // 0 = never (negative cash flow, or longer than 100 years).
    paybackYears: round2(years),
    paybackIfCashFlowFlat: firstYearCashFlow > 0 ? round2(cashInvested / firstYearCashFlow) : 0,
    firstYearCashOnCashPercent: pct(firstYearCashFlow, cashInvested),
  };
};

export const realestateRentalRatiosCustomCalculators: Record<string, CustomCalculator> = {
  "rental-yield-calculator": rentalYieldCalculator,
  "gross-rental-yield-calculator": grossRentalYieldCalculator,
  "net-rental-yield-calculator": netRentalYieldCalculator,
  "rent-increase-calculator": rentIncreaseCalculator,
  "rental-affordability-calculator": rentalAffordabilityCalculator,
  "rent-to-income-ratio-calculator": rentToIncomeRatioCalculator,
  "rent-to-value-ratio-calculator": rentToValueRatioCalculator,
  "rent-to-price-ratio-calculator": rentToPriceRatioCalculator,
  "price-to-rent-ratio-calculator": priceToRentRatioCalculator,
  "gross-rent-multiplier-calculator": grossRentMultiplierCalculator,
  "rental-property-payback-period-calculator": rentalPropertyPaybackPeriodCalculator,
};
