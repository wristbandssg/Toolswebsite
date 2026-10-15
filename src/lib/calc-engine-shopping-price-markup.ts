/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — markup
 * and pricing methods (8 tools). markup-calculator, margin-vs-markup,
 * cost-plus-pricing and product-pricing already exist for the general case;
 * these cover specific trades and methods:
 *
 *  - laborMarkup: wage + labor burden + overhead, adjusted for billable
 *    hours, to a bill rate with a target margin.
 *  - partsMarkup: a repair-shop parts matrix (higher markup on cheap parts)
 *    or a custom markup.
 *  - contractorMarkup (also material markup): job costs with separate
 *    material, labor and subcontractor markups, overhead and profit.
 *  - staffingMarkup: agency bill rate from pay rate, burden and markup.
 *  - wholesalePrice: wholesale price from cost and margin, and the retail
 *    price at the retailer's multiplier (keystone = 2×).
 *  - pricingStrategy: cost-plus vs competitor-based vs target-margin prices
 *    side by side, with break-even volume.
 *  - valueBasedPricing: economic value to the customer from the next best
 *    alternative plus/minus differentiators, and the price at a value share.
 *  - dropshippingProfit: profit per order after supplier, shipping, platform,
 *    payment and ad costs and refunds, and break-even ROAS.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-markup-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const pct = (v: number) => nonNeg(v) / 100;
/** Price that gives margin m on cost c (m < 1). */
const priceForMargin = (c: number, m: number) => (m < 1 ? c / (1 - m) : 0);

export const laborMarkup: CustomCalculator = (v) => {
  const wage = nonNeg(v.hourlyWage);
  const burdened = wage * (1 + pct(v.burdenPercent));
  const billable = Math.max(0.01, pct(v.billablePercent) || 1);
  const cost = (burdened + nonNeg(v.overheadPerHour)) / billable;
  const rate = priceForMargin(cost, Math.min(0.95, pct(v.profitMargin)));
  return {
    billRate: round2(rate),
    burdenedWage: round2(burdened),
    breakEvenRate: round2(cost),
    markupOnWage: wage > 0 ? round2(((rate - wage) / wage) * 100) : 0,
    profitPerBilledHour: round2(rate - cost),
  };
};

/** [part cost up to $, multiplier] */
const PARTS_MATRIX: [number, number][] = [
  [10, 2.5],
  [50, 2],
  [100, 1.75],
  [250, 1.6],
  [500, 1.45],
  [Infinity, 1.35],
];

export const partsMarkup: CustomCalculator = (v) => {
  const cost = nonNeg(v.partCost);
  const qty = Math.max(1, Math.round(safeNumber(v.quantity, 1)));
  const custom = nonNeg(v.customMarkup);
  const mult = custom > 0 ? 1 + custom / 100 : PARTS_MATRIX.find(([upTo]) => cost <= upTo)![1];
  const price = cost * mult;
  return {
    priceEach: round2(price),
    totalPrice: round2(price * qty),
    markupPercent: round2((mult - 1) * 100),
    grossMargin: price > 0 ? round2(((price - cost) / price) * 100) : 0,
    grossProfit: round2((price - cost) * qty),
  };
};

export const contractorMarkup: CustomCalculator = (v) => {
  const materials = nonNeg(v.materials) * (1 + pct(v.materialMarkup));
  const labor = nonNeg(v.labor) * (1 + pct(v.laborMarkup));
  const subs = nonNeg(v.subcontractors) * (1 + pct(v.subMarkup));
  const equipment = nonNeg(v.equipment);
  const direct = nonNeg(v.materials) + nonNeg(v.labor) + nonNeg(v.subcontractors) + equipment;
  const marked = materials + labor + subs + equipment;
  const overhead = direct * pct(v.overheadPercent);
  const beforeProfit = marked + overhead;
  const bid = beforeProfit * (1 + pct(v.profitPercent));
  const profit = bid - direct - overhead;
  return {
    bidPrice: round2(bid),
    directCosts: round2(direct),
    overhead: round2(overhead),
    grossProfit: round2(profit),
    overallMarkup: direct > 0 ? round2(((bid - direct) / direct) * 100) : 0,
    profitMargin: bid > 0 ? round2((profit / bid) * 100) : 0,
  };
};

export const staffingMarkup: CustomCalculator = (v) => {
  const pay = nonNeg(v.payRate);
  const burden = pay * pct(v.burdenPercent);
  const bill = pay * (1 + pct(v.markupPercent));
  const margin = bill - pay - burden;
  const hours = nonNeg(v.hoursPerWeek);
  return {
    billRate: round2(bill),
    burdenCost: round2(burden),
    grossMarginPerHour: round2(margin),
    grossMarginPercent: bill > 0 ? round2((margin / bill) * 100) : 0,
    weeklyGrossMargin: round2(margin * hours),
    spread: round2(bill - pay),
  };
};

export const wholesalePrice: CustomCalculator = (v) => {
  const cost = nonNeg(v.unitCost);
  const wholesale = priceForMargin(cost, Math.min(0.95, pct(v.wholesaleMargin)));
  const retail = wholesale * nonNeg(v.retailMultiplier, 2);
  return {
    wholesalePrice: round2(wholesale),
    suggestedRetail: round2(retail),
    yourProfitPerUnit: round2(wholesale - cost),
    retailerProfitPerUnit: round2(retail - wholesale),
    retailerMargin: retail > 0 ? round2(((retail - wholesale) / retail) * 100) : 0,
    costShareOfRetail: retail > 0 ? round2((cost / retail) * 100) : 0,
  };
};

export const pricingStrategy: CustomCalculator = (v) => {
  const cost = nonNeg(v.unitCost);
  const costPlus = cost * (1 + pct(v.markupPercent));
  const competitive = nonNeg(v.competitorPrice) * (1 + safeNumber(v.positioning) / 100);
  const target = priceForMargin(cost, Math.min(0.95, pct(v.targetMargin)));
  const fixed = nonNeg(v.fixedCosts);
  const be = (p: number) => (p > cost ? Math.ceil(fixed / (p - cost)) : 0);
  return {
    costPlusPrice: round2(costPlus),
    competitivePrice: round2(competitive),
    targetMarginPrice: round2(target),
    breakEvenUnitsCostPlus: be(costPlus),
    breakEvenUnitsCompetitive: be(competitive),
    breakEvenUnitsTarget: be(target),
    competitiveMargin: competitive > 0 ? round2(((competitive - cost) / competitive) * 100) : 0,
  };
};

export const valueBasedPricing: CustomCalculator = (v) => {
  const alt = nonNeg(v.alternativePrice);
  const evc = Math.max(0, alt + nonNeg(v.positiveValue) - nonNeg(v.negativeValue));
  const share = pct(v.valueShare);
  const cost = nonNeg(v.unitCost);
  // Price sits between the alternative and full value: keep `share` of the extra value.
  const price = alt + (evc - alt) * share;
  return {
    recommendedPrice: round2(price),
    economicValueToCustomer: round2(evc),
    customerSurplus: round2(evc - price),
    profitPerUnit: round2(price - cost),
    margin: price > 0 ? round2(((price - cost) / price) * 100) : 0,
    premiumOverAlternative: alt > 0 ? round2(((price - alt) / alt) * 100) : 0,
  };
};

export const dropshippingProfit: CustomCalculator = (v) => {
  const price = nonNeg(v.sellingPrice);
  const shippingIn = nonNeg(v.shippingCharged);
  const revenue = price + shippingIn;
  const supplier = nonNeg(v.supplierCost) + nonNeg(v.supplierShipping);
  const fees = revenue * (pct(v.platformFee) + pct(v.paymentRate)) + nonNeg(v.paymentFixed);
  const ads = nonNeg(v.adCostPerSale);
  const refunds = revenue * pct(v.refundRate);
  const profit = revenue - supplier - fees - ads - refunds;
  const beforeAds = profit + ads;
  return {
    profitPerOrder: round2(profit),
    profitMargin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    totalCostPerOrder: round2(supplier + fees + ads + refunds),
    breakEvenAdCost: round2(beforeAds),
    breakEvenRoas: beforeAds > 0 ? round2(revenue / beforeAds) : 0,
    monthlyProfit: round2(profit * nonNeg(v.ordersPerMonth)),
  };
};

export const shoppingPriceMarkupCustomCalculators: Record<string, CustomCalculator> = {
  "labor-markup-calculator": laborMarkup,
  "parts-markup-calculator": partsMarkup,
  "contractor-markup-calculator": contractorMarkup,
  "staffing-markup-calculator": staffingMarkup,
  "wholesale-price-calculator": wholesalePrice,
  "pricing-strategy-calculator": pricingStrategy,
  "value-based-pricing-calculator": valueBasedPricing,
  "dropshipping-profit-calculator": dropshippingProfit,
};
