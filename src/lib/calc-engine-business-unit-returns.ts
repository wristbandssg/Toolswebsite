/**
 * Batch: "Business Finance Calculators" sub-batch F (Unit Economics &
 * Returns, 9 tools). Part of the Business Finance build-out — see
 * calc-engine-business-profit.ts for the full list of 11 sub-batches.
 * Filed under Finance Calculators > Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different (roi-calculator
 * already gives ROI from an initial and final value):
 *  - unitEconomicsCalculator: one customer's full picture — contribution
 *    per order, lifetime profit, LTV:CAC — for an e-commerce/order business.
 *  - customerAcquisitionCostCalculator: blended vs paid CAC from marketing
 *    and sales spend.
 *  - customerLifetimeValueCalculator: subscription LTV from ARPU, gross
 *    margin and churn.
 *  - ltvToCacRatioCalculator: the ratio and the CAC payback in months.
 *  - paybackPeriodCalculator: an INVESTMENT's simple and discounted payback.
 *  - businessRoiCalculator: a project's ROI from yearly gains or savings
 *    over its life (not a start/end value).
 *  - returnOnAssetsCalculator: net income ÷ AVERAGE total assets.
 *  - returnOnEquityCalculator: ROE with the DuPont breakdown (margin ×
 *    asset turnover × leverage).
 *  - returnOnCapitalEmployedCalculator: EBIT ÷ (total assets − current
 *    liabilities).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-unit-returns-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Unit Economics Calculator (per order and per customer) ------------
export const unitEconomicsCalculator: CustomCalculator = (values) => {
  const averageOrderValue = Math.max(0, safeNumber(values.averageOrderValue, 60));
  const productCostPerOrder = Math.max(0, safeNumber(values.productCostPerOrder, 24));
  const fulfillmentCostPerOrder = Math.max(0, safeNumber(values.fulfillmentCostPerOrder, 8));
  const ordersPerCustomer = Math.max(0, safeNumber(values.ordersPerCustomer, 4));
  const customerAcquisitionCost = Math.max(0, safeNumber(values.customerAcquisitionCost, 45));

  const perOrder = averageOrderValue - productCostPerOrder - fulfillmentCostPerOrder;
  const lifetime = perOrder * ordersPerCustomer;

  return {
    profitPerCustomerAfterCac: round2(lifetime - customerAcquisitionCost),
    contributionPerOrder: round2(perOrder),
    lifetimeContribution: round2(lifetime),
    ltvToCacRatio: customerAcquisitionCost > 0 ? round2(lifetime / customerAcquisitionCost) : 0,
    contributionMarginPercent: averageOrderValue > 0 ? round2((perOrder / averageOrderValue) * 100) : 0,
  };
};

// --- 2. Customer Acquisition Cost (CAC) -------------------------------------
export const customerAcquisitionCostCalculator: CustomCalculator = (values) => {
  const marketingSpend = Math.max(0, safeNumber(values.marketingSpend, 30000));
  const salesSpend = Math.max(0, safeNumber(values.salesSpend, 20000));
  const newCustomers = Math.max(1, safeNumber(values.newCustomers, 400));
  const paidAdSpend = Math.max(0, safeNumber(values.paidAdSpend, 18000));
  const customersFromPaidAds = Math.max(1, safeNumber(values.customersFromPaidAds, 150));

  return {
    blendedCac: round2((marketingSpend + salesSpend) / newCustomers),
    paidCac: round2(paidAdSpend / customersFromPaidAds),
    marketingOnlyCac: round2(marketingSpend / newCustomers),
    totalAcquisitionSpend: round2(marketingSpend + salesSpend),
  };
};

// --- 3. Customer Lifetime Value (LTV) ---------------------------------------
export const customerLifetimeValueCalculator: CustomCalculator = (values) => {
  const monthlyRevenuePerCustomer = Math.max(0, safeNumber(values.monthlyRevenuePerCustomer, 50));
  const grossMarginPercent = Math.min(100, Math.max(0, safeNumber(values.grossMarginPercent, 75)));
  const monthlyChurnPercent = Math.min(100, Math.max(0.01, safeNumber(values.monthlyChurnPercent, 3)));

  const lifetimeMonths = 100 / monthlyChurnPercent;
  const ltv = monthlyRevenuePerCustomer * (grossMarginPercent / 100) * lifetimeMonths;

  return {
    customerLifetimeValue: round2(ltv),
    averageLifetimeMonths: round2(lifetimeMonths),
    lifetimeRevenue: round2(monthlyRevenuePerCustomer * lifetimeMonths),
    monthlyGrossProfitPerCustomer: round2(monthlyRevenuePerCustomer * (grossMarginPercent / 100)),
  };
};

// --- 4. LTV to CAC Ratio Calculator -----------------------------------------------
export const ltvToCacRatioCalculator: CustomCalculator = (values) => {
  const customerLifetimeValue = Math.max(0, safeNumber(values.customerLifetimeValue, 1200));
  const customerAcquisitionCost = Math.max(0.01, safeNumber(values.customerAcquisitionCost, 350));
  const monthlyGrossProfitPerCustomer = Math.max(0, safeNumber(values.monthlyGrossProfitPerCustomer, 37.5));

  return {
    ltvToCacRatio: round2(customerLifetimeValue / customerAcquisitionCost),
    cacPaybackMonths: monthlyGrossProfitPerCustomer > 0 ? round2(customerAcquisitionCost / monthlyGrossProfitPerCustomer) : 0,
    profitPerCustomerAfterCac: round2(customerLifetimeValue - customerAcquisitionCost),
    maxCacForRatioOf3: round2(customerLifetimeValue / 3),
  };
};

// --- 5. Payback Period Calculator (simple and discounted) ------------------
export const paybackPeriodCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 100000));
  const annualCashFlow = Math.max(0, safeNumber(values.annualCashFlow, 28000));
  const discountRatePercent = Math.max(0, safeNumber(values.discountRatePercent, 8));

  const simple = annualCashFlow > 0 ? initialInvestment / annualCashFlow : 0;
  // Discounted payback: years until the present value of the cash flows
  // covers the investment (fraction of the final year interpolated).
  let discounted = 0;
  const r = discountRatePercent / 100;
  if (annualCashFlow > 0) {
    let cum = 0;
    for (let y = 1; y <= 100; y++) {
      const pv = annualCashFlow / Math.pow(1 + r, y);
      if (cum + pv >= initialInvestment) {
        discounted = y - 1 + (initialInvestment - cum) / pv;
        break;
      }
      cum += pv;
    }
  }

  return {
    // 0 = never (or not within 100 years).
    paybackYears: round2(simple),
    discountedPaybackYears: round2(discounted),
    paybackMonths: round2(simple * 12),
  };
};

// --- 6. Business ROI Calculator (project with yearly gains) --------------
export const businessRoiCalculator: CustomCalculator = (values) => {
  const investmentCost = Math.max(0, safeNumber(values.investmentCost, 40000));
  const annualGainOrSavings = Math.max(0, safeNumber(values.annualGainOrSavings, 15000));
  const annualRunningCosts = Math.max(0, safeNumber(values.annualRunningCosts, 2000));
  const years = Math.max(1, safeNumber(values.years, 4));

  const netPerYear = annualGainOrSavings - annualRunningCosts;
  const totalNet = netPerYear * years - investmentCost;

  return {
    roiPercent: investmentCost > 0 ? round2((totalNet / investmentCost) * 100) : 0,
    netGainOverPeriod: round2(totalNet),
    averageAnnualRoiPercent: investmentCost > 0 ? round2((totalNet / investmentCost / years) * 100) : 0,
    paybackYears: netPerYear > 0 ? round2(investmentCost / netPerYear) : 0,
  };
};

// --- 7. Return on Assets (ROA) ----------------------------------------------------
export const returnOnAssetsCalculator: CustomCalculator = (values) => {
  const netIncome = safeNumber(values.netIncome, 120000);
  const assetsStartOfYear = Math.max(0, safeNumber(values.assetsStartOfYear, 1400000));
  const assetsEndOfYear = Math.max(0, safeNumber(values.assetsEndOfYear, 1600000));
  const revenue = Math.max(0, safeNumber(values.revenue, 2000000));

  const avgAssets = (assetsStartOfYear + assetsEndOfYear) / 2;

  return {
    returnOnAssetsPercent: avgAssets > 0 ? round2((netIncome / avgAssets) * 100) : 0,
    averageTotalAssets: round2(avgAssets),
    assetTurnover: avgAssets > 0 ? round2(revenue / avgAssets) : 0,
    netProfitMarginPercent: revenue > 0 ? round2((netIncome / revenue) * 100) : 0,
  };
};

// --- 8. Return on Equity (ROE, DuPont) --------------------------------------------
export const returnOnEquityCalculator: CustomCalculator = (values) => {
  const netIncome = safeNumber(values.netIncome, 150000);
  const revenue = Math.max(0.01, safeNumber(values.revenue, 1500000));
  const totalAssets = Math.max(0.01, safeNumber(values.totalAssets, 1200000));
  const shareholdersEquity = Math.max(0.01, safeNumber(values.shareholdersEquity, 600000));

  const margin = netIncome / revenue;
  const turnover = revenue / totalAssets;
  const leverage = totalAssets / shareholdersEquity;

  return {
    returnOnEquityPercent: round2(margin * turnover * leverage * 100),
    netProfitMarginPercent: round2(margin * 100),
    assetTurnover: round2(turnover),
    equityMultiplier: round2(leverage),
  };
};

// --- 9. Return on Capital Employed (ROCE) --------------------------------------
export const returnOnCapitalEmployedCalculator: CustomCalculator = (values) => {
  const ebit = safeNumber(values.ebit, 250000);
  const totalAssets = Math.max(0, safeNumber(values.totalAssets, 1800000));
  const currentLiabilities = Math.max(0, safeNumber(values.currentLiabilities, 400000));
  const costOfCapitalPercent = Math.max(0, safeNumber(values.costOfCapitalPercent, 10));

  const capital = totalAssets - currentLiabilities;
  const roce = capital > 0 ? (ebit / capital) * 100 : 0;

  return {
    returnOnCapitalEmployedPercent: round2(roce),
    capitalEmployed: round2(capital),
    spreadOverCostOfCapitalPercent: round2(roce - costOfCapitalPercent),
  };
};

export const businessUnitReturnsCustomCalculators: Record<string, CustomCalculator> = {
  "unit-economics-calculator": unitEconomicsCalculator,
  "customer-acquisition-cost-calculator": customerAcquisitionCostCalculator,
  "customer-lifetime-value-calculator": customerLifetimeValueCalculator,
  "ltv-to-cac-ratio-calculator": ltvToCacRatioCalculator,
  "payback-period-calculator": paybackPeriodCalculator,
  "business-roi-calculator": businessRoiCalculator,
  "return-on-assets-calculator": returnOnAssetsCalculator,
  "return-on-equity-calculator": returnOnEquityCalculator,
  "return-on-capital-employed-calculator": returnOnCapitalEmployedCalculator,
};
