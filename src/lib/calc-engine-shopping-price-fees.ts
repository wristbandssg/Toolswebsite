/**
 * Batch: "Shopping Calculators" → Pricing, Markup & Seller Fee — marketplace
 * and payment fees (11 tools). paypal-fee-calculator already exists.
 *
 * Each marketplace tool uses that platform's own fee structure (2026
 * defaults, editable): Etsy listing + transaction + processing + offsite
 * ads; Depop processing on item + shipping; Shopify plan + card rate +
 * third-party gateway fee; TikTok Shop referral + per-order fee; Walmart
 * category referral fee; Amazon FBA referral (with $0.30 minimum) +
 * fulfillment + storage. Stripe and Square answer "fee on a payment" and
 * "what to charge to receive X". payment-processing-fee compares flat-rate
 * with interchange-plus for a month of sales; convenience fee grosses a
 * payment up to cover the fee; credit-card-surcharge applies the 3% cap.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-price-fees-calculators.ts for the copy.
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

/** Common seller result: fees, payout, profit and margin on the sale price. */
function sellerResult(revenue: number, fees: number, cost: number) {
  const payout = revenue - fees;
  const profit = payout - cost;
  return {
    totalFees: round2(fees),
    payout: round2(payout),
    profit: round2(profit),
    profitMargin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    feePercent: revenue > 0 ? round2((fees / revenue) * 100) : 0,
  };
}

export const etsyFee: CustomCalculator = (v) => {
  const item = nonNeg(v.itemPrice);
  const ship = nonNeg(v.shippingCharged);
  const tax = (item + ship) * pct(v.salesTaxRate);
  const listing = 0.2;
  const transaction = (item + ship) * pct(v.transactionRate);
  const processing = (item + ship + tax) * pct(v.processingRate) + nonNeg(v.processingFixed);
  const offsite = safeNumber(v.offsiteAds) === 1 ? Math.min(100, (item + ship) * pct(v.offsiteRate)) : 0;
  const fees = listing + transaction + processing + offsite;
  const cost = nonNeg(v.itemCost) + nonNeg(v.shippingCost);
  return { ...sellerResult(item + ship, fees, cost), transactionFee: round2(transaction), processingFee: round2(processing) };
};

function cardFee(v: Record<string, number>, rate: number, fixed: number) {
  const amount = nonNeg(v.amount);
  const fee = amount > 0 ? amount * rate + fixed : 0;
  const toReceive = amount > 0 ? (amount + fixed) / (1 - rate) : 0;
  return {
    fee: round2(fee),
    youReceive: round2(amount - fee),
    effectiveRate: amount > 0 ? round2((fee / amount) * 100) : 0,
    chargeToReceiveAmount: round2(toReceive),
  };
}

export const stripeFee: CustomCalculator = (v) => {
  let rate = pct(v.rate);
  if (safeNumber(v.international) === 1) rate += 0.015;
  if (safeNumber(v.currencyConversion) === 1) rate += 0.01;
  return cardFee(v, rate, nonNeg(v.fixedFee));
};

const SQUARE: [number, number][] = [
  [0.026, 0.15], // in person
  [0.029, 0.3], // online
  [0.035, 0.15], // keyed in / card on file
  [0.033, 0.3], // invoices
];

export const squareFee: CustomCalculator = (v) => {
  const [rate, fixed] = SQUARE[Math.min(3, Math.max(0, Math.round(safeNumber(v.paymentType))))];
  const out = cardFee(v, rate, fixed);
  const monthly = nonNeg(v.monthlyVolume);
  const txns = nonNeg(v.monthlyTransactions);
  return { ...out, monthlyFees: round2(monthly * rate + txns * fixed) };
};

export const depopFee: CustomCalculator = (v) => {
  const item = nonNeg(v.itemPrice);
  const ship = nonNeg(v.shippingCharged);
  const processing = (item + ship) * pct(v.processingRate) + nonNeg(v.processingFixed);
  const boost = safeNumber(v.boosted) === 1 ? (item + ship) * 0.08 : 0;
  const selling = item * pct(v.sellingFeeRate);
  const fees = processing + boost + selling;
  return { ...sellerResult(item + ship, fees, nonNeg(v.itemCost) + nonNeg(v.shippingCost)), processingFee: round2(processing) };
};

/** [monthly plan $, card rate, fixed $, third-party gateway extra] */
const SHOPIFY: [number, number, number, number][] = [
  [39, 0.029, 0.3, 0.02], // Basic
  [105, 0.027, 0.3, 0.01], // Shopify (Grow)
  [399, 0.025, 0.3, 0.006], // Advanced
];

export const shopifyFee: CustomCalculator = (v) => {
  const [plan, rate, fixed, extra] = SHOPIFY[Math.min(2, Math.max(0, Math.round(safeNumber(v.plan))))];
  const sales = nonNeg(v.monthlySales);
  const orders = nonNeg(v.monthlyOrders);
  const thirdParty = safeNumber(v.gateway) === 1;
  const processing = thirdParty ? sales * pct(v.gatewayRate) + orders * nonNeg(v.gatewayFixed) + sales * extra : sales * rate + orders * fixed;
  const apps = nonNeg(v.appsAndThemes);
  const total = plan + processing + apps;
  return {
    monthlyFees: round2(total),
    planCost: plan,
    paymentFees: round2(processing),
    feePerOrder: orders > 0 ? round2(total / orders) : 0,
    effectiveRate: sales > 0 ? round2((total / sales) * 100) : 0,
  };
};

export const tiktokShopFee: CustomCalculator = (v) => {
  const price = nonNeg(v.itemPrice);
  const ship = nonNeg(v.shippingCharged);
  const referral = (price + ship) * pct(v.referralRate) + nonNeg(v.perOrderFee);
  const affiliate = price * pct(v.affiliateRate);
  const fees = referral + affiliate;
  return { ...sellerResult(price + ship, fees, nonNeg(v.itemCost) + nonNeg(v.shippingCost)), referralFee: round2(referral), affiliateCommission: round2(affiliate) };
};

export const walmartMarketplaceFee: CustomCalculator = (v) => {
  const price = nonNeg(v.itemPrice);
  const ship = nonNeg(v.shippingCharged);
  const referral = (price + ship) * pct(v.category);
  const wfs = nonNeg(v.wfsFee);
  const fees = referral + wfs;
  return { ...sellerResult(price + ship, fees, nonNeg(v.itemCost) + nonNeg(v.shippingCost)), referralFee: round2(referral) };
};

export const amazonFbaFee: CustomCalculator = (v) => {
  const price = nonNeg(v.itemPrice);
  const referral = price > 0 ? Math.max(0.3, price * pct(v.referralRate)) : 0;
  const fulfillment = nonNeg(v.fulfillmentFee);
  const storage = nonNeg(v.cubicFeet) * nonNeg(v.storageRate) * nonNeg(v.monthsStored);
  const other = nonNeg(v.inboundFee) + nonNeg(v.closingFee);
  const fees = referral + fulfillment + storage + other;
  const cost = nonNeg(v.productCost) + nonNeg(v.shippingToAmazon);
  const out = sellerResult(price, fees, cost);
  return { ...out, referralFee: round2(referral), roi: cost > 0 ? round2((out.profit / cost) * 100) : 0 };
};

export const paymentProcessingFee: CustomCalculator = (v) => {
  const volume = nonNeg(v.monthlyVolume);
  const txns = nonNeg(v.monthlyTransactions);
  const flat = volume * pct(v.flatRate) + txns * nonNeg(v.flatFixed) + nonNeg(v.flatMonthly);
  const icPlus = volume * (pct(v.interchange) + pct(v.markupRate)) + txns * nonNeg(v.markupFixed) + nonNeg(v.icMonthly);
  return {
    flatRateMonthly: round2(flat),
    interchangePlusMonthly: round2(icPlus),
    monthlySavingsWithCheaper: round2(Math.abs(flat - icPlus)),
    cheaperOption: flat <= icPlus ? 1 : 2,
    flatEffectiveRate: volume > 0 ? round2((flat / volume) * 100) : 0,
    interchangeEffectiveRate: volume > 0 ? round2((icPlus / volume) * 100) : 0,
    yearlyFeesCheaper: round2(Math.min(flat, icPlus) * 12),
  };
};

export const convenienceFee: CustomCalculator = (v) => {
  const amount = nonNeg(v.amount);
  const rate = pct(v.processingRate);
  const fixed = nonNeg(v.processingFixed);
  const flat = safeNumber(v.feeType) === 1;
  const gross = flat ? amount + nonNeg(v.flatFee) : rate < 1 ? (amount + fixed) / (1 - rate) : amount;
  const fee = gross - amount;
  const processing = gross * rate + fixed;
  return {
    convenienceFee: round2(fee),
    customerPays: round2(gross),
    processingCost: round2(processing),
    youReceive: round2(gross - processing),
    feeAsPercent: amount > 0 ? round2((fee / amount) * 100) : 0,
  };
};

export const creditCardSurcharge: CustomCalculator = (v) => {
  const sale = nonNeg(v.saleAmount);
  const cost = sale * pct(v.processingRate) + nonNeg(v.processingFixed);
  const allowed = safeNumber(v.cardType) === 0 && safeNumber(v.stateBan) === 0;
  const rate = allowed ? Math.min(pct(v.surchargeRate), Math.min(0.03, sale > 0 ? cost / sale : 0)) : 0;
  const surcharge = sale * rate;
  const fee = (sale + surcharge) * pct(v.processingRate) + nonNeg(v.processingFixed);
  return {
    surcharge: round2(surcharge),
    customerPays: round2(sale + surcharge),
    processingCost: round2(fee),
    youReceive: round2(sale + surcharge - fee),
    surchargeRate: round2(rate * 100),
    feeNotCovered: round2(Math.max(0, fee - surcharge)),
  };
};

export const shoppingPriceFeesCustomCalculators: Record<string, CustomCalculator> = {
  "etsy-fee-calculator": etsyFee,
  "stripe-fee-calculator": stripeFee,
  "square-fee-calculator": squareFee,
  "depop-fee-calculator": depopFee,
  "shopify-fee-calculator": shopifyFee,
  "tiktok-shop-fee-calculator": tiktokShopFee,
  "walmart-marketplace-fee-calculator": walmartMarketplaceFee,
  "amazon-fba-fee-calculator": amazonFbaFee,
  "payment-processing-fee-calculator": paymentProcessingFee,
  "convenience-fee-calculator": convenienceFee,
  "credit-card-surcharge-calculator": creditCardSurcharge,
};
