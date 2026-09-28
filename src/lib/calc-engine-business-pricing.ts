/**
 * Batch: "Business Finance Calculators" sub-batch C (Pricing, 7 tools). Part
 * of the Business Finance build-out — see calc-engine-business-profit.ts for
 * the full list of 11 sub-batches. Filed under Finance Calculators >
 * Business Finance Calculators.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - sellingPriceCalculator: price for a target margin AFTER payment/
 *    marketplace fees, plus the price with sales tax/VAT added.
 *  - costPriceCalculator: works BACKWARDS from a selling price to the most
 *    you can pay for an item (by margin or by markup).
 *  - pricingCalculator: what a price change does to units, revenue and
 *    profit, using price elasticity of demand.
 *  - productPricingCalculator: a physical product's price built up from
 *    materials, labor, packaging, shipping, overhead and marketplace fees.
 *  - servicePricingCalculator: a service job's price from hours, labor
 *    cost, materials, overhead and margin.
 *  - costPlusPricingCalculator: FULL-cost (absorption) pricing — fixed
 *    costs spread over volume plus variable cost, then a markup. (markup-
 *    calculator marks up a single cost figure.)
 *  - averageOrderValueCalculator: AOV and what raising it does to revenue.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-business-pricing-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Selling Price Calculator (fees + tax) -------------------------------
export const sellingPriceCalculator: CustomCalculator = (values) => {
  const cost = Math.max(0, safeNumber(values.cost, 20));
  const targetMarginPercent = Math.min(90, Math.max(0, safeNumber(values.targetMarginPercent, 40)));
  const feePercent = Math.min(50, Math.max(0, safeNumber(values.feePercent, 3)));
  const salesTaxPercent = Math.max(0, safeNumber(values.salesTaxPercent, 8));

  // Price P so that P − fees − cost = margin × P  →  P = cost ÷ (1 − margin − fee).
  const denom = 1 - targetMarginPercent / 100 - feePercent / 100;
  const price = denom > 0 ? cost / denom : 0;

  return {
    sellingPrice: round2(price),
    priceIncludingSalesTax: round2(price * (1 + salesTaxPercent / 100)),
    feesPerSale: round2((price * feePercent) / 100),
    profitPerSale: round2(price - cost - (price * feePercent) / 100),
  };
};

// --- 2. Cost Price Calculator (max you can pay) ---------------------------
export const costPriceCalculator: CustomCalculator = (values) => {
  const sellingPrice = Math.max(0, safeNumber(values.sellingPrice, 60));
  const percent = Math.max(0, safeNumber(values.percent, 40));
  // 1 = percent is a margin, 2 = percent is a markup
  const basis = Math.round(safeNumber(values.basis, 1)) === 2 ? 2 : 1;

  const cost = basis === 1 ? sellingPrice * (1 - Math.min(percent, 100) / 100) : sellingPrice / (1 + percent / 100);

  return {
    costPrice: round2(cost),
    profitPerSale: round2(sellingPrice - cost),
    marginPercent: sellingPrice > 0 ? round2(((sellingPrice - cost) / sellingPrice) * 100) : 0,
    markupPercent: cost > 0 ? round2(((sellingPrice - cost) / cost) * 100) : 0,
  };
};

// --- 3. Pricing Calculator (price elasticity) ------------------------------
export const pricingCalculator: CustomCalculator = (values) => {
  const currentPrice = Math.max(0.01, safeNumber(values.currentPrice, 50));
  const currentUnits = Math.max(0, safeNumber(values.currentUnits, 1000));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 30));
  const priceChangePercent = Math.max(-90, safeNumber(values.priceChangePercent, 10));
  const elasticity = Math.max(0, safeNumber(values.elasticity, 1.5));

  // Constant-elasticity demand: units change by (new/old price)^(−elasticity).
  const newPrice = currentPrice * (1 + priceChangePercent / 100);
  const newUnits = currentUnits * Math.pow(newPrice / currentPrice, -elasticity);
  const oldProfit = (currentPrice - variableCostPerUnit) * currentUnits;
  const newProfit = (newPrice - variableCostPerUnit) * newUnits;

  return {
    profitChange: round2(newProfit - oldProfit),
    newPrice: round2(newPrice),
    newUnits: Math.round(newUnits),
    revenueChange: round2(newPrice * newUnits - currentPrice * currentUnits),
    newContributionProfit: round2(newProfit),
  };
};

// --- 4. Product Pricing Calculator (cost build-up) -------------------------
export const productPricingCalculator: CustomCalculator = (values) => {
  const materials = Math.max(0, safeNumber(values.materials, 8));
  const labor = Math.max(0, safeNumber(values.labor, 6));
  const packaging = Math.max(0, safeNumber(values.packaging, 1.5));
  const shipping = Math.max(0, safeNumber(values.shipping, 4.5));
  const overheadPercent = Math.max(0, safeNumber(values.overheadPercent, 15));
  const marketplaceFeePercent = Math.min(50, Math.max(0, safeNumber(values.marketplaceFeePercent, 15)));
  const targetMarginPercent = Math.min(80, Math.max(0, safeNumber(values.targetMarginPercent, 30)));

  const direct = materials + labor + packaging + shipping;
  const fullCost = direct * (1 + overheadPercent / 100);
  const denom = 1 - targetMarginPercent / 100 - marketplaceFeePercent / 100;
  const price = denom > 0 ? fullCost / denom : 0;

  return {
    recommendedPrice: round2(price),
    fullCostPerUnit: round2(fullCost),
    directCostPerUnit: round2(direct),
    marketplaceFeePerUnit: round2((price * marketplaceFeePercent) / 100),
    profitPerUnit: round2(price - fullCost - (price * marketplaceFeePercent) / 100),
  };
};

// --- 5. Service Pricing Calculator (per job) -----------------------------
export const servicePricingCalculator: CustomCalculator = (values) => {
  const hoursPerJob = Math.max(0, safeNumber(values.hoursPerJob, 6));
  const laborCostPerHour = Math.max(0, safeNumber(values.laborCostPerHour, 35));
  const materialsPerJob = Math.max(0, safeNumber(values.materialsPerJob, 120));
  const overheadPercent = Math.max(0, safeNumber(values.overheadPercent, 25));
  const targetMarginPercent = Math.min(90, Math.max(0, safeNumber(values.targetMarginPercent, 30)));

  const cost = (hoursPerJob * laborCostPerHour + materialsPerJob) * (1 + overheadPercent / 100);
  const price = cost / (1 - targetMarginPercent / 100);

  return {
    jobPrice: round2(price),
    jobCost: round2(cost),
    profitPerJob: round2(price - cost),
    effectiveHourlyRate: hoursPerJob > 0 ? round2(price / hoursPerJob) : 0,
  };
};

// --- 6. Cost Plus Pricing Calculator (full absorption cost) ---------------
export const costPlusPricingCalculator: CustomCalculator = (values) => {
  const fixedCosts = Math.max(0, safeNumber(values.fixedCosts, 60000));
  const expectedUnits = Math.max(1, safeNumber(values.expectedUnits, 5000));
  const variableCostPerUnit = Math.max(0, safeNumber(values.variableCostPerUnit, 14));
  const markupPercent = Math.max(0, safeNumber(values.markupPercent, 30));

  const fullCost = variableCostPerUnit + fixedCosts / expectedUnits;
  const price = fullCost * (1 + markupPercent / 100);

  return {
    costPlusPrice: round2(price),
    fullCostPerUnit: round2(fullCost),
    profitPerUnit: round2(price - fullCost),
    totalProfitAtExpectedVolume: round2((price - fullCost) * expectedUnits),
  };
};

// --- 7. Average Order Value Calculator ---------------------------------------
export const averageOrderValueCalculator: CustomCalculator = (values) => {
  const totalRevenue = Math.max(0, safeNumber(values.totalRevenue, 84000));
  const numberOfOrders = Math.max(1, safeNumber(values.numberOfOrders, 1400));
  const aovIncreasePercent = Math.max(0, safeNumber(values.aovIncreasePercent, 10));

  const aov = totalRevenue / numberOfOrders;
  const newAov = aov * (1 + aovIncreasePercent / 100);

  return {
    averageOrderValue: round2(aov),
    aovAfterIncrease: round2(newAov),
    extraRevenueFromIncrease: round2((newAov - aov) * numberOfOrders),
    ordersNeededForSameRevenueAtNewAov: newAov > 0 ? Math.ceil(totalRevenue / newAov) : 0,
  };
};

export const businessPricingCustomCalculators: Record<string, CustomCalculator> = {
  "selling-price-calculator": sellingPriceCalculator,
  "cost-price-calculator": costPriceCalculator,
  "pricing-calculator": pricingCalculator,
  "product-pricing-calculator": productPricingCalculator,
  "service-pricing-calculator": servicePricingCalculator,
  "cost-plus-pricing-calculator": costPlusPricingCalculator,
  "average-order-value-calculator": averageOrderValueCalculator,
};
