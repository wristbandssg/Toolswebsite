/**
 * Batch: "Shopping Calculators" → Shipping & Moving Cost — marketplace seller
 * shipping (5 tools):
 *
 *  - amazonFbaShipping: FBA size tier, fulfillment fee, storage and inbound
 *    cost per unit (2026-style fee curve, editable assumptions in copy).
 *  - ebayShipping: discounted eBay label vs retail, and the shipping charge
 *    that covers the label plus eBay's fee on shipping.
 *  - etsyShipping: Etsy label and the shipping price that covers Etsy's
 *    transaction and payment fees (or the price bump for free shipping).
 *  - depopShipping / mercariShipping: label by weight tier, fees and the
 *    seller's net payout depending on who pays shipping.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-ship-sellers-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));
const zoneFactor = (zone: number) => 1 + 0.09 * (Math.min(8, Math.max(1, Math.round(zone || 1))) - 2);

export const amazonFbaShipping: CustomCalculator = (v) => {
  const dims = [nonNeg(v.length), nonNeg(v.width), nonNeg(v.height)].sort((a, b) => b - a);
  const lb = nonNeg(v.weightLb);
  const dimLb = (dims[0] * dims[1] * dims[2]) / 139;
  let tier = 3;
  if (dims[0] <= 15 && dims[1] <= 12 && dims[2] <= 0.75 && lb <= 1) tier = 1;
  else if (dims[0] <= 18 && dims[1] <= 14 && dims[2] <= 8 && Math.max(lb, dimLb) <= 20) tier = 2;
  const shipLb = tier === 1 ? lb : Math.max(lb, dimLb);
  let fee = 0;
  if (lb > 0) {
    if (tier === 1) fee = 3.06 + 0.71 * Math.min(1, shipLb);
    else if (tier === 2) fee = shipLb <= 1 ? 3.68 + shipLb : shipLb <= 3 ? 4.68 + 1.12 * (shipLb - 1) : 6.92 + 0.32 * (shipLb - 3);
    else fee = 9.61 + 0.38 * Math.max(0, shipLb - 1);
  }
  const cuft = (dims[0] * dims[1] * dims[2]) / 1728;
  const peak = idx(v.peakSeason, 1) === 1;
  const rate = tier === 3 ? (peak ? 1.4 : 0.56) : peak ? 2.4 : 0.78;
  const storage = cuft * rate * nonNeg(v.monthsStored);
  const inbound = shipLb * nonNeg(v.inboundPerLb);
  return {
    totalFbaCostPerUnit: round2(fee + storage + inbound),
    fulfillmentFee: round2(fee),
    sizeTier: lb > 0 ? tier : 0,
    shippingWeightLb: round2(shipLb),
    storageFeePerUnit: round2(storage),
    inboundCostPerUnit: round2(inbound),
  };
};

function bill(v: Record<string, number>) {
  const dim = (nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height)) / 166;
  const cubicIn = nonNeg(v.length) * nonNeg(v.width) * nonNeg(v.height);
  // USPS applies DIM weight only to boxes over 1 cubic foot.
  return Math.ceil(Math.max(nonNeg(v.weightLb), cubicIn > 1728 ? dim : 0) - 1e-9);
}

/** Discounted (commercial) USPS-style label prices. */
function uspsLabel(service: number, lb: number, zone: number) {
  if (lb <= 0) return 0;
  if (service === 2) return 4.13 + 0.79 * Math.max(0, lb - 1); // Media Mail, not zoned
  if (service === 1) return (8.5 + 1.4 * Math.max(0, lb - 1)) * zoneFactor(zone); // Priority Mail
  return (5.2 + 0.75 * Math.max(0, lb - 1)) * zoneFactor(zone); // Ground Advantage
}

export const ebayShipping: CustomCalculator = (v) => {
  const lb = bill(v);
  const label = uspsLabel(idx(v.service, 2), lb, nonNeg(v.zone));
  const retail = label * 1.28;
  const fee = nonNeg(v.feeRate) / 100;
  const charge = fee < 1 && label > 0 ? (label + nonNeg(v.packaging)) / (1 - fee) : 0;
  return {
    labelCost: round2(label),
    suggestedShippingCharge: round2(charge),
    retailPostOfficePrice: round2(retail),
    savingsVsRetail: round2(retail - label),
    billableWeightLb: lb,
  };
};

export const etsyShipping: CustomCalculator = (v) => {
  const lb = Math.max(nonNeg(v.weightOz) / 16, 0);
  const s = idx(v.service, 1);
  let label = 0;
  if (lb > 0) {
    label = s === 0 && lb <= 1 ? (4.4 + 0.11 * Math.ceil(nonNeg(v.weightOz))) * zoneFactor(nonNeg(v.zone)) : uspsLabel(s, Math.ceil(lb - 1e-9), nonNeg(v.zone));
  }
  const feeShare = (nonNeg(v.transactionFee) + nonNeg(v.paymentFee)) / 100;
  const cost = label + nonNeg(v.packaging);
  const charge = label > 0 && feeShare < 1 ? cost / (1 - feeShare) : 0;
  return {
    recommendedShippingCharge: round2(charge),
    labelCost: round2(label),
    feesOnShipping: round2(charge - cost),
    freeShippingPriceIncrease: round2(charge),
  };
};

function resale(v: Record<string, number>, label: number) {
  const price = nonNeg(v.salePrice);
  const buyerPays = idx(v.buyerPaysShipping, 1) === 1;
  const fees = price > 0 ? (price * (nonNeg(v.sellingFee) + nonNeg(v.processingRate))) / 100 + nonNeg(v.processingFixed) : 0;
  const shipCost = buyerPays ? 0 : label;
  const payout = price - fees - shipCost;
  return {
    netPayout: round2(payout),
    labelCost: round2(label),
    totalFees: round2(fees),
    profit: round2(payout - nonNeg(v.itemCost)),
    shippingPercentOfSale: price > 0 ? round2((label / price) * 100) : 0,
  };
}

export const depopShipping: CustomCalculator = (v) => resale(v, nonNeg(v.labelTier));
export const mercariShipping: CustomCalculator = (v) => resale(v, nonNeg(v.labelTier));

export const shoppingShipSellersCustomCalculators: Record<string, CustomCalculator> = {
  "amazon-fba-shipping-cost-calculator": amazonFbaShipping,
  "ebay-shipping-cost-calculator": ebayShipping,
  "etsy-shipping-cost-calculator": etsyShipping,
  "depop-shipping-calculator": depopShipping,
  "mercari-shipping-calculator": mercariShipping,
};
