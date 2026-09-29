/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch B
 * (Exchange Rate Changes, Gains & Performance, 8 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - exchangeRateDifferenceCalculator: two rates side by side (two
 *    providers, two days) — the gap in points/pips, % and on an amount.
 *  - exchangeRatePercentageChangeCalculator: one rate moving from old to new
 *    — how much EACH currency of the pair gained or lost (they differ).
 *  - currencyAppreciationCalculator: PROJECTS a currency rising at a yearly
 *    rate, and what a holding in it is then worth at home.
 *  - currencyDepreciationCalculator: YOUR currency weakening — how much
 *    more a foreign-priced item costs you.
 *  - currencyGainLossCalculator: a foreign-currency balance you hold,
 *    revalued from the rate you bought at to today's.
 *  - foreignExchangeGainLossCalculator: the ACCOUNTING gain or loss on a
 *    foreign-currency invoice between booking and settlement — opposite
 *    signs for a receivable and a payable.
 *  - currencyReturnCalculator: the total return of parking money in a
 *    foreign-currency deposit — interest plus the currency move — vs a home
 *    deposit.
 *  - currencyPerformanceCalculator: three currencies' change against yours
 *    over the same period, side by side.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-rate-changes-calculators.ts for the tool
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

// --- 1. Exchange Rate Difference (two rates compared) ---------------------
export const exchangeRateDifferenceCalculator: CustomCalculator = (values) => {
  const rateA = rate(values.rateA, 1.085);
  const rateB = rate(values.rateB, 1.07);
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const pipSize = safeNumber(values.pipSize, 0.0001) === 0.01 ? 0.01 : 0.0001;

  const diff = rateA - rateB;

  return {
    amountDifference: round2(amount * diff),
    rateDifference: roundTo(diff, 6),
    differenceInPips: round2(diff / pipSize),
    differencePercent: round2((diff / rateA) * 100),
    amountAtRateA: round2(amount * rateA),
    amountAtRateB: round2(amount * rateB),
  };
};

// --- 2. Exchange Rate Percentage Change (both sides of the pair) -----------
export const exchangeRatePercentageChangeCalculator: CustomCalculator = (values) => {
  const oldRate = rate(values.oldRate, 1.05);
  const newRate = rate(values.newRate, 1.085);

  return {
    baseCurrencyChangePercent: round2((newRate / oldRate - 1) * 100),
    quoteCurrencyChangePercent: round2((oldRate / newRate - 1) * 100),
    rateChange: roundTo(newRate - oldRate, 6),
  };
};

// --- 3. Currency Appreciation (projection) ---------------------------------
export const currencyAppreciationCalculator: CustomCalculator = (values) => {
  // Home currency per 1 unit of the foreign currency.
  const currentRate = rate(values.currentRate, 1.085);
  const appreciationPercent = Math.max(-99, safeNumber(values.appreciationPercent, 2));
  const years = Math.max(0, Math.min(100, safeNumber(values.years, 5)));
  const foreignHolding = Math.max(0, safeNumber(values.foreignHolding, 10000));

  const future = currentRate * Math.pow(1 + appreciationPercent / 100, years);

  return {
    projectedRate: roundTo(future, 6),
    totalAppreciationPercent: round2((future / currentRate - 1) * 100),
    holdingValueNow: round2(foreignHolding * currentRate),
    holdingValueThen: round2(foreignHolding * future),
    gainOnHolding: round2(foreignHolding * (future - currentRate)),
  };
};

// --- 4. Currency Depreciation (your currency weakens) ---------------------
export const currencyDepreciationCalculator: CustomCalculator = (values) => {
  // Home currency per 1 unit of the foreign currency, before and after.
  const oldRate = rate(values.oldRate, 80);
  const newRate = rate(values.newRate, 88);
  const foreignPrice = Math.max(0, safeNumber(values.foreignPrice, 500));

  return {
    homeCurrencyDepreciationPercent: round2((1 - oldRate / newRate) * 100),
    foreignCurrencyAppreciationPercent: round2((newRate / oldRate - 1) * 100),
    costBefore: round2(foreignPrice * oldRate),
    costNow: round2(foreignPrice * newRate),
    extraCost: round2(foreignPrice * (newRate - oldRate)),
  };
};

// --- 5. Currency Gain/Loss (revalue a held balance) ------------------------
export const currencyGainLossCalculator: CustomCalculator = (values) => {
  const foreignAmount = Math.max(0, safeNumber(values.foreignAmount, 10000));
  // Home currency per 1 unit of the foreign currency.
  const purchaseRate = rate(values.purchaseRate, 1.05);
  const currentRate = rate(values.currentRate, 1.085);

  const cost = foreignAmount * purchaseRate;
  const value = foreignAmount * currentRate;

  return {
    gainOrLoss: round2(value - cost),
    gainOrLossPercent: round2((currentRate / purchaseRate - 1) * 100),
    costInHomeCurrency: round2(cost),
    valueInHomeCurrency: round2(value),
  };
};

// --- 6. Foreign Exchange Gain/Loss (invoice booking vs settlement) --------
export const foreignExchangeGainLossCalculator: CustomCalculator = (values) => {
  const invoiceAmount = Math.max(0, safeNumber(values.invoiceAmount, 50000));
  // Home currency per 1 unit of the invoice currency.
  const bookingRate = rate(values.bookingRate, 1.1);
  const settlementRate = rate(values.settlementRate, 1.08);
  // 1 = receivable (you are paid), 2 = payable (you pay).
  const invoiceType = safeNumber(values.invoiceType, 1) === 2 ? 2 : 1;

  const booked = invoiceAmount * bookingRate;
  const settled = invoiceAmount * settlementRate;
  const gain = invoiceType === 1 ? settled - booked : booked - settled;

  return {
    exchangeGainOrLoss: round2(gain),
    bookedAmount: round2(booked),
    settledAmount: round2(settled),
    gainOrLossPercent: booked > 0 ? round2((gain / booked) * 100) : 0,
  };
};

// --- 7. Currency Return (foreign deposit vs home deposit) ------------------
export const currencyReturnCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const foreignInterestPercent = safeNumber(values.foreignInterestPercent, 6);
  const homeInterestPercent = safeNumber(values.homeInterestPercent, 4);
  // Home currency per 1 unit of the foreign currency.
  const startRate = rate(values.startRate, 1.3);
  const endRate = rate(values.endRate, 1.28);
  const months = Math.max(0, Math.min(600, safeNumber(values.months, 12)));

  const t = months / 12;
  const foreignGrowth = Math.pow(1 + foreignInterestPercent / 100, t);
  const total = foreignGrowth * (endRate / startRate) - 1;
  const home = Math.pow(1 + homeInterestPercent / 100, t) - 1;

  return {
    totalReturnPercent: round2(total * 100),
    endValue: round2(amount * (1 + total)),
    currencyEffectPercent: round2((endRate / startRate - 1) * 100),
    homeDepositReturnPercent: round2(home * 100),
    advantageVsHomePercent: round2((total - home) * 100),
  };
};

// --- 8. Currency Performance (three currencies vs yours) ------------------
export const currencyPerformanceCalculator: CustomCalculator = (values) => {
  const change = (k: number, s: number, e: number) =>
    (rate(values[`endRate${k}`], e) / rate(values[`startRate${k}`], s) - 1) * 100;
  const c1 = change(1, 1.04, 1.085);
  const c2 = change(2, 1.24, 1.27);
  const c3 = change(3, 0.0069, 0.00667);

  return {
    currency1ChangePercent: round2(c1),
    currency2ChangePercent: round2(c2),
    currency3ChangePercent: round2(c3),
    averageChangePercent: round2((c1 + c2 + c3) / 3),
    bestMinusWorstPoints: round2(Math.max(c1, c2, c3) - Math.min(c1, c2, c3)),
  };
};

export const currencyRateChangesCustomCalculators: Record<string, CustomCalculator> = {
  "exchange-rate-difference-calculator": exchangeRateDifferenceCalculator,
  "exchange-rate-percentage-change-calculator": exchangeRatePercentageChangeCalculator,
  "currency-appreciation-calculator": currencyAppreciationCalculator,
  "currency-depreciation-calculator": currencyDepreciationCalculator,
  "currency-gain-loss-calculator": currencyGainLossCalculator,
  "foreign-exchange-gain-loss-calculator": foreignExchangeGainLossCalculator,
  "currency-return-calculator": currencyReturnCalculator,
  "currency-performance-calculator": currencyPerformanceCalculator,
};
