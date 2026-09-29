/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch C
 * (Spreads, Fees & Money Transfers, 10 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - currencySpreadCalculator: a provider's BUY and SELL rates for a
 *    currency — the spread and what a round trip loses.
 *  - bidAskSpreadCalculator: any bid/ask quote (currency, stock, crypto) —
 *    spread in price and %, and its cost on a quantity.
 *  - exchangeRateSpreadCalculator: ONE provider rate vs the mid-market rate
 *    — the hidden markup and its cost.
 *  - currencyExchangeFeeCalculator: two providers (rate + fee each) — which
 *    delivers more.
 *  - foreignTransactionFeeCalculator: card fees on spending abroad over a
 *    year vs a no-foreign-fee card's annual fee.
 *  - currencyConversionFeeCalculator: every cost of one conversion — rate
 *    markup, percentage fee and fixed fee — in money and %.
 *  - internationalTransferFeeCalculator: a bank wire's sending,
 *    intermediary and receiving fees plus the rate markup.
 *  - moneyTransferExchangeRateCalculator: a transfer service quote — what
 *    the recipient gets and the all-in rate after the fee.
 *  - remittanceCalculator: regular monthly sends home — what family receives
 *    each month and year, and the yearly cost.
 *  - remittanceFeeCalculator: the cost of one send as % of the amount,
 *    against the UN 3% target, and its yearly total.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-spreads-fees-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

const MIN_RATE = 0.000001;
const rate = (v: number, d: number) => Math.max(MIN_RATE, safeNumber(v, d));
const pctClamp = (v: number, d: number) => Math.min(100, Math.max(0, safeNumber(v, d)));

// --- 1. Currency Spread (buy vs sell rate) ----------------------------------
export const currencySpreadCalculator: CustomCalculator = (values) => {
  // Home currency per 1 unit of foreign: what the provider charges you to
  // buy the foreign currency, and what it pays you to sell it back.
  const providerSellsAt = rate(values.providerSellsAt, 1.12);
  const providerBuysAt = Math.min(providerSellsAt, rate(values.providerBuysAt, 1.04));
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  const mid = (providerSellsAt + providerBuysAt) / 2;
  const foreign = amount / providerSellsAt;
  const back = foreign * providerBuysAt;

  return {
    roundTripLoss: round2(amount - back),
    spread: roundTo(providerSellsAt - providerBuysAt, 6),
    spreadPercentOfMid: round2(((providerSellsAt - providerBuysAt) / mid) * 100),
    midRate: roundTo(mid, 6),
    foreignCurrencyBought: round2(foreign),
  };
};

// --- 2. Bid-Ask Spread (any market) -----------------------------------------
export const bidAskSpreadCalculator: CustomCalculator = (values) => {
  const bid = Math.max(0, safeNumber(values.bid, 99.5));
  const ask = Math.max(bid, safeNumber(values.ask, 100.5));
  const quantity = Math.max(0, safeNumber(values.quantity, 100));

  const mid = (bid + ask) / 2;

  return {
    spread: roundTo(ask - bid, 6),
    spreadPercentOfMid: mid > 0 ? round2(((ask - bid) / mid) * 100) : 0,
    roundTripCost: round2((ask - bid) * quantity),
    costPerSide: round2(((ask - bid) / 2) * quantity),
    midPrice: roundTo(mid, 6),
  };
};

// --- 3. Exchange Rate Spread (provider vs mid-market) ----------------------
export const exchangeRateSpreadCalculator: CustomCalculator = (values) => {
  // Foreign currency per 1 unit of home currency.
  const midMarketRate = rate(values.midMarketRate, 0.92);
  const providerRate = rate(values.providerRate, 0.9);
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  return {
    markupPercent: round2(((midMarketRate - providerRate) / midMarketRate) * 100),
    hiddenCost: round2(amount * (1 - providerRate / midMarketRate)),
    receivedAtProviderRate: round2(amount * providerRate),
    receivedAtMidMarket: round2(amount * midMarketRate),
  };
};

// --- 4. Currency Exchange Fee (compare two providers) ----------------------
export const currencyExchangeFeeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const rateA = rate(values.rateA, 0.905);
  const feeA = Math.max(0, safeNumber(values.feeA, 0));
  const rateB = rate(values.rateB, 0.918);
  const feeB = Math.max(0, safeNumber(values.feeB, 8));

  const a = Math.max(0, amount - feeA) * rateA;
  const b = Math.max(0, amount - feeB) * rateB;

  return {
    differenceBMinusA: round2(b - a),
    receivedWithProviderA: round2(a),
    receivedWithProviderB: round2(b),
    effectiveRateA: amount > 0 ? roundTo(a / amount, 6) : 0,
    effectiveRateB: amount > 0 ? roundTo(b / amount, 6) : 0,
  };
};

// --- 5. Foreign Transaction Fee (card spending abroad) ---------------------
export const foreignTransactionFeeCalculator: CustomCalculator = (values) => {
  const monthlyForeignSpend = Math.max(0, safeNumber(values.monthlyForeignSpend, 800));
  const feePercent = pctClamp(values.feePercent, 3);
  const months = Math.max(0, Math.min(600, safeNumber(values.months, 12)));
  const noFeeCardAnnualFee = Math.max(0, safeNumber(values.noFeeCardAnnualFee, 95));

  const monthly = (monthlyForeignSpend * feePercent) / 100;
  const total = monthly * months;

  return {
    totalFees: round2(total),
    feesPerMonth: round2(monthly),
    savingsWithNoFeeCard: round2(total - noFeeCardAnnualFee * (months / 12)),
    breakEvenMonthlySpend: feePercent > 0 ? round2(noFeeCardAnnualFee / 12 / (feePercent / 100)) : 0,
  };
};

// --- 6. Currency Conversion Fee (all costs of one conversion) --------------
export const currencyConversionFeeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const rateMarkupPercent = pctClamp(values.rateMarkupPercent, 2);
  const feePercent = pctClamp(values.feePercent, 0.5);
  const fixedFee = Math.max(0, safeNumber(values.fixedFee, 3));

  const markup = (amount * rateMarkupPercent) / 100;
  const fees = (amount * feePercent) / 100 + fixedFee;
  const total = markup + fees;

  return {
    totalCost: round2(total),
    totalCostPercent: amount > 0 ? round2((total / amount) * 100) : 0,
    hiddenRateMarkupCost: round2(markup),
    statedFees: round2(fees),
  };
};

// --- 7. International Transfer Fee (bank wire) ------------------------------
export const internationalTransferFeeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 2000));
  const sendingFee = Math.max(0, safeNumber(values.sendingFee, 35));
  const intermediaryFee = Math.max(0, safeNumber(values.intermediaryFee, 15));
  const receivingFee = Math.max(0, safeNumber(values.receivingFee, 10));
  const midMarketRate = rate(values.midMarketRate, 0.92);
  const rateMarkupPercent = pctClamp(values.rateMarkupPercent, 2.5);

  const net = Math.max(0, amount - sendingFee - intermediaryFee - receivingFee);
  const delivered = net * midMarketRate * (1 - rateMarkupPercent / 100);
  const cost = amount - delivered / midMarketRate;

  return {
    recipientGets: round2(delivered),
    totalCost: round2(cost),
    totalCostPercent: amount > 0 ? round2((cost / amount) * 100) : 0,
    flatFees: round2(sendingFee + intermediaryFee + receivingFee),
    rateMarkupCost: round2(net * (rateMarkupPercent / 100)),
  };
};

// --- 8. Money Transfer Exchange Rate (all-in rate) -------------------------
export const moneyTransferExchangeRateCalculator: CustomCalculator = (values) => {
  const amountSent = Math.max(0, safeNumber(values.amountSent, 1000));
  const transferFee = Math.max(0, safeNumber(values.transferFee, 4.99));
  const offeredRate = rate(values.offeredRate, 0.915);
  const midMarketRate = rate(values.midMarketRate, 0.92);

  const received = Math.max(0, amountSent - transferFee) * offeredRate;
  const cost = amountSent - received / midMarketRate;

  return {
    recipientGets: round2(received),
    allInExchangeRate: amountSent > 0 ? roundTo(received / amountSent, 6) : 0,
    totalCostVsMidMarket: round2(cost),
    totalCostPercent: amountSent > 0 ? round2((cost / amountSent) * 100) : 0,
  };
};

// --- 9. Remittance (regular sends home) -------------------------------------
export const remittanceCalculator: CustomCalculator = (values) => {
  const monthlyAmount = Math.max(0, safeNumber(values.monthlyAmount, 500));
  const feePerTransfer = Math.max(0, safeNumber(values.feePerTransfer, 5));
  const midMarketRate = rate(values.midMarketRate, 83);
  const rateMarkupPercent = pctClamp(values.rateMarkupPercent, 1);
  const transfersPerMonth = Math.max(0, safeNumber(values.transfersPerMonth, 1));

  const perTransfer = monthlyAmount / Math.max(1, transfersPerMonth);
  const received = transfersPerMonth > 0
    ? Math.max(0, perTransfer - feePerTransfer) * midMarketRate * (1 - rateMarkupPercent / 100) * transfersPerMonth
    : 0;
  const monthlyCost = transfersPerMonth > 0 ? monthlyAmount - received / midMarketRate : 0;

  return {
    recipientGetsPerMonth: round2(received),
    recipientGetsPerYear: round2(received * 12),
    yearlyCost: round2(monthlyCost * 12),
    costPercent: monthlyAmount > 0 ? round2((monthlyCost / monthlyAmount) * 100) : 0,
  };
};

// --- 10. Remittance Fee (cost vs the 3% target) ------------------------------
// UN Sustainable Development Goal 10.c: remittance costs of 3% or less.
const SDG_TARGET_PERCENT = 3;

export const remittanceFeeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0.01, safeNumber(values.amount, 200));
  const fixedFee = Math.max(0, safeNumber(values.fixedFee, 5));
  const fxMarginPercent = pctClamp(values.fxMarginPercent, 3);
  const sendsPerYear = Math.max(0, safeNumber(values.sendsPerYear, 12));

  const cost = fixedFee + Math.max(0, amount - fixedFee) * (fxMarginPercent / 100);
  const pct = (cost / amount) * 100;

  return {
    totalCostPercent: round2(pct),
    costPerSend: round2(cost),
    pointsAboveUnTarget: round2(pct - SDG_TARGET_PERCENT),
    yearlyCost: round2(cost * sendsPerYear),
    yearlyCostAt3Percent: round2(amount * 0.03 * sendsPerYear),
  };
};

export const currencySpreadsFeesCustomCalculators: Record<string, CustomCalculator> = {
  "currency-spread-calculator": currencySpreadCalculator,
  "bid-ask-spread-calculator": bidAskSpreadCalculator,
  "exchange-rate-spread-calculator": exchangeRateSpreadCalculator,
  "currency-exchange-fee-calculator": currencyExchangeFeeCalculator,
  "foreign-transaction-fee-calculator": foreignTransactionFeeCalculator,
  "currency-conversion-fee-calculator": currencyConversionFeeCalculator,
  "international-transfer-fee-calculator": internationalTransferFeeCalculator,
  "money-transfer-exchange-rate-calculator": moneyTransferExchangeRateCalculator,
  "remittance-calculator": remittanceCalculator,
  "remittance-fee-calculator": remittanceFeeCalculator,
};
