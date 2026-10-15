/**
 * Batch: "Shopping Calculators" → Vehicle, Resale & Collectibles — salvage,
 * classics and resale math (6 tools):
 *
 *  - scrapCarValue: curb weight × scrap price per ton, plus catalytic
 *    converter and parts, minus towing.
 *  - totaledCarValue: insurance payout (ACV + tax/fees − deductible), loan
 *    gap, owner-retained (buyback) payout and the total-loss threshold.
 *  - classicCarValue: price-guide value adjusted by condition class,
 *    originality and documentation, with future value and auction net.
 *  - scrapMetalValue: weight × typical (or your yard's) price per pound.
 *  - garageSalePricing: sticker price from retail, category and condition,
 *    rounded to garage-sale friendly amounts.
 *  - resaleProfit: flipping profit, ROI, margin, hourly profit, break-even.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-veh-auto-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const mult = (v: number) => (safeNumber(v) > 0 ? safeNumber(v) : 1);

export const scrapCarValue: CustomCalculator = (v) => {
  const lb = nonNeg(v.curbWeightLb);
  const metal = (lb / 2000) * nonNeg(v.pricePerTon);
  const parts = nonNeg(v.catalyticValue) + nonNeg(v.partsValue);
  const gross = metal + parts;
  return {
    netOffer: round2(Math.max(0, gross - nonNeg(v.towingFee))),
    metalValue: round2(metal),
    partsValue: round2(parts),
    weightTons: round2(lb / 2000),
    pricePerLb: round2((nonNeg(v.pricePerTon) / 2000) * 100) / 100,
  };
};

export const totaledCarValue: CustomCalculator = (v) => {
  const acv = nonNeg(v.actualCashValue);
  const repair = nonNeg(v.repairEstimate);
  const threshold = nonNeg(v.thresholdPercent) || 75;
  const total = acv > 0 && repair >= (acv * threshold) / 100 ? 1 : 0;
  const tax = (acv * nonNeg(v.salesTaxRate)) / 100;
  const payout = Math.max(0, acv + tax + nonNeg(v.titleFees) - nonNeg(v.deductible));
  const salvage = (acv * nonNeg(v.salvagePercent)) / 100;
  return {
    insurancePayout: round2(payout),
    afterLoanPayoff: round2(payout - nonNeg(v.loanBalance)),
    keepCarPayout: round2(Math.max(0, payout - salvage)),
    salvageValue: round2(salvage),
    isTotalLoss: total,
    repairPercentOfValue: acv > 0 ? round2((repair / acv) * 100) : 0,
  };
};

export const classicCarValue: CustomCalculator = (v) => {
  const value = nonNeg(v.guideValue) * mult(v.conditionClass) * mult(v.originality) * mult(v.documentation);
  const years = nonNeg(v.years);
  const future = value * Math.pow(1 + safeNumber(v.appreciationRate) / 100, years);
  return {
    estimatedValue: round2(value),
    agreedInsuranceValue: round2(value * 1.1),
    futureValue: round2(future),
    auctionNet: round2(value * (1 - nonNeg(v.auctionFee) / 100)),
    gainOverPeriod: round2(future - value),
  };
};

export const scrapMetalValue: CustomCalculator = (v) => {
  const lb = nonNeg(v.weightLb);
  const price = nonNeg(v.customPrice) > 0 ? nonNeg(v.customPrice) : nonNeg(v.metal);
  return {
    scrapValue: round2(lb * price),
    pricePerLb: round2(price),
    pricePerKg: round2(price * 2.2046),
    pricePerTon: round2(price * 2000),
    weightKg: round2(lb * 0.4536),
  };
};

function friendly(p: number) {
  if (p <= 0) return 0;
  if (p < 1) return Math.max(0.25, Math.round(p * 4) / 4);
  if (p < 10) return Math.round(p * 2) / 2;
  if (p < 50) return Math.round(p);
  return Math.round(p / 5) * 5;
}

export const garageSalePricing: CustomCalculator = (v) => {
  const raw = nonNeg(v.originalPrice) * mult(v.category) * mult(v.condition);
  const sticker = friendly(raw);
  const lowest = friendly(sticker * (1 - nonNeg(v.negotiationRoom) / 100));
  const qty = Math.max(1, Math.round(nonNeg(v.quantity) || 1));
  return {
    stickerPrice: sticker,
    lowestToAccept: lowest,
    percentOfRetail: nonNeg(v.originalPrice) > 0 ? round2((sticker / nonNeg(v.originalPrice)) * 100) : 0,
    totalIfAllSell: round2(sticker * qty),
    totalAtLowest: round2(lowest * qty),
  };
};

export const resaleProfit: CustomCalculator = (v) => {
  const cost = nonNeg(v.buyPrice) + nonNeg(v.prepCost);
  const sale = nonNeg(v.salePrice);
  const rate = (nonNeg(v.platformFee) + nonNeg(v.paymentFee)) / 100;
  const fees = sale > 0 ? sale * rate + nonNeg(v.fixedFee) : 0;
  const profit = sale - fees - nonNeg(v.shippingCost) - cost;
  const hours = nonNeg(v.hours);
  const breakEven = rate < 1 ? (cost + nonNeg(v.shippingCost) + nonNeg(v.fixedFee)) / (1 - rate) : 0;
  return {
    netProfit: round2(profit),
    roiPercent: cost > 0 ? round2((profit / cost) * 100) : 0,
    profitMargin: sale > 0 ? round2((profit / sale) * 100) : 0,
    totalFees: round2(fees),
    profitPerHour: hours > 0 ? round2(profit / hours) : 0,
    breakEvenPrice: round2(breakEven),
  };
};

export const shoppingVehAutoCustomCalculators: Record<string, CustomCalculator> = {
  "scrap-car-value-calculator": scrapCarValue,
  "totaled-car-value-calculator": totaledCarValue,
  "classic-car-value-calculator": classicCarValue,
  "scrap-metal-value-calculator": scrapMetalValue,
  "garage-sale-pricing-calculator": garageSalePricing,
  "resale-profit-calculator": resaleProfit,
};
