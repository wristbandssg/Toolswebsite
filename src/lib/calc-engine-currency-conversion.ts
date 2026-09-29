/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch A
 * (Currency Conversion & Rates, 13 tools). The user's list had 89 tools: 3
 * already built (currency-converter, forex-profit-loss-calculator,
 * forex-position-size-calculator — moved into Crypto Calculators), 86 new
 * across 9 sub-batches, all under Finance Calculators > Crypto Calculators
 * (the user's chosen name for the whole currency/forex/crypto section):
 *   calc-engine-currency-conversion.ts (13)
 *   calc-engine-currency-rate-changes.ts (8)
 *   calc-engine-currency-spreads-fees.ts (10)
 *   calc-engine-currency-travel-consumer.ts (9)
 *   calc-engine-currency-forex-trade.ts (12)
 *   calc-engine-currency-forex-costs-growth.ts (11)
 *   calc-engine-currency-forwards-parity.ts (10)
 *   calc-engine-currency-business-hedging.ts (9)
 *   calc-engine-currency-crypto-metals.ts (4)
 *
 * Rates are never fetched live — every tool takes the rate(s) the user
 * enters, so results match whatever quote they are looking at.
 *
 * Near-namesakes, and how each is deliberately different (currency-converter
 * already converts an amount at one rate and shows the inverse):
 *  - exchangeRateCalculator: works BACKWARD from what you paid and received
 *    to the rate you actually got, and its hidden markup vs mid-market.
 *  - foreignExchangeCalculator: converts either direction (base→quote or
 *    quote→base) from one quoted pair price.
 *  - profitLossCurrencyCalculator: a ROUND TRIP — buy a foreign currency,
 *    later sell it back — with fees both ways.
 *  - currencyConversionCalculator: what you actually receive after a
 *    provider's percentage and fixed fees, and the effective rate.
 *  - liveCurrencyConverter: converts at a live bid/ask quote — what you get
 *    selling vs what it costs buying, and the spread cost.
 *  - historicalCurrencyConverter: one amount at a past rate vs today's.
 *  - historicalExchangeRateCalculator: four yearly rates — average, high,
 *    low and the annualized change.
 *  - crossCurrencyRateCalculator: cross rate from two rates quoted against
 *    the SAME currency (EUR/USD and GBP/USD → EUR/GBP), by division.
 *  - currencyCrossRateCalculator: cross rate by CHAINING two pairs
 *    (EUR/USD × USD/JPY → EUR/JPY), by multiplication.
 *  - inverseExchangeRateCalculator: flips a rate and converts both ways.
 *  - currencyPairCalculator: a pair's pip size, pip value per unit and the
 *    price after a move of N pips.
 *  - multiCurrencyConverter: one amount into four currencies at once.
 *  - baseCurrencyCalculator: balances held in three currencies totalled in
 *    one base currency, with each one's share.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-conversion-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Rates and small amounts keep more places than money does.
function roundTo(n: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

const MIN_RATE = 0.000001;
const rate = (v: number, d: number) => Math.max(MIN_RATE, safeNumber(v, d));

// --- 1. Exchange Rate Calculator (rate you actually got) ----------------
export const exchangeRateCalculator: CustomCalculator = (values) => {
  const amountPaid = Math.max(0.01, safeNumber(values.amountPaid, 1000));
  const amountReceived = Math.max(0, safeNumber(values.amountReceived, 905));
  const midMarketRate = rate(values.midMarketRate, 0.92);

  const effective = amountReceived / amountPaid;

  return {
    effectiveRate: roundTo(effective, 6),
    inverseRate: effective > 0 ? roundTo(1 / effective, 6) : 0,
    markupVsMidMarketPercent: round2(((midMarketRate - effective) / midMarketRate) * 100),
    hiddenCost: round2(amountPaid - amountReceived / midMarketRate),
  };
};

// --- 2. Foreign Exchange Calculator (either direction) --------------------
export const foreignExchangeCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const pairPrice = rate(values.pairPrice, 1.085);
  // 1 = base → quote (multiply), 2 = quote → base (divide).
  const direction = safeNumber(values.direction, 1) === 2 ? 2 : 1;

  const used = direction === 1 ? pairPrice : 1 / pairPrice;

  return {
    convertedAmount: round2(amount * used),
    rateUsed: roundTo(used, 6),
    inverseRate: roundTo(1 / used, 6),
  };
};

// --- 3. Profit/Loss Currency (round trip with fees) ------------------------
export const profitLossCurrencyCalculator: CustomCalculator = (values) => {
  const homeAmount = Math.max(0, safeNumber(values.homeAmount, 5000));
  // Both rates are foreign currency per 1 unit of home currency.
  const buyRate = rate(values.buyRate, 0.92);
  const sellRate = rate(values.sellRate, 0.88);
  const feePercentEachWay = Math.min(100, Math.max(0, safeNumber(values.feePercentEachWay, 1)));

  const keep = 1 - feePercentEachWay / 100;
  const foreign = homeAmount * buyRate * keep;
  const back = (foreign / sellRate) * keep;
  const pl = back - homeAmount;

  return {
    profitOrLoss: round2(pl),
    profitOrLossPercent: homeAmount > 0 ? round2((pl / homeAmount) * 100) : 0,
    foreignCurrencyBought: round2(foreign),
    amountBack: round2(back),
    profitBeforeFees: round2((homeAmount * buyRate) / sellRate - homeAmount),
  };
};

// --- 4. Currency Conversion (after provider fees) --------------------------
export const currencyConversionCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const exchangeRate = rate(values.exchangeRate, 0.92);
  const feePercent = Math.min(100, Math.max(0, safeNumber(values.feePercent, 1.5)));
  const fixedFee = Math.max(0, safeNumber(values.fixedFee, 5));

  const fees = Math.min(amount, fixedFee + (amount * feePercent) / 100);
  const received = (amount - fees) * exchangeRate;

  return {
    amountReceived: round2(received),
    totalFees: round2(fees),
    feesPercentOfAmount: amount > 0 ? round2((fees / amount) * 100) : 0,
    effectiveRate: amount > 0 ? roundTo(received / amount, 6) : 0,
  };
};

// --- 5. Live Currency Converter (bid/ask quote) ---------------------------
export const liveCurrencyConverter: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const bid = rate(values.bid, 1.0848);
  const ask = Math.max(bid, safeNumber(values.ask, 1.0852));

  return {
    midMarketValue: round2((amount * (bid + ask)) / 2),
    youGetSelling: round2(amount * bid),
    itCostsBuying: round2(amount * ask),
    spreadCost: round2(amount * (ask - bid)),
    midRate: roundTo((bid + ask) / 2, 6),
  };
};

// --- 6. Historical Currency Converter (then vs now) -----------------------
export const historicalCurrencyConverter: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const pastRate = rate(values.pastRate, 1.12);
  const currentRate = rate(values.currentRate, 1.085);

  const then = amount * pastRate;
  const now = amount * currentRate;

  return {
    valueNow: round2(now),
    valueThen: round2(then),
    change: round2(now - then),
    changePercent: round2((currentRate / pastRate - 1) * 100),
  };
};

// --- 7. Historical Exchange Rate (average, high, low, trend) --------------
export const historicalExchangeRateCalculator: CustomCalculator = (values) => {
  const rates = [
    rate(values.rateYear1, 1.18),
    rate(values.rateYear2, 1.05),
    rate(values.rateYear3, 1.08),
    rate(values.rateYear4, 1.085),
  ];

  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const total = rates[3] / rates[0] - 1;

  return {
    averageRate: roundTo(avg, 6),
    highestRate: roundTo(Math.max(...rates), 6),
    lowestRate: roundTo(Math.min(...rates), 6),
    totalChangePercent: round2(total * 100),
    // Three yearly steps from the first rate to the last.
    annualizedChangePercent: round2((Math.pow(1 + total, 1 / 3) - 1) * 100),
  };
};

// --- 8. Cross Currency Rate (both quoted vs one currency) -----------------
export const crossCurrencyRateCalculator: CustomCalculator = (values) => {
  // Value of 1 unit of each currency in the common currency (e.g. USD).
  const currencyAInCommon = rate(values.currencyAInCommon, 1.085);
  const currencyBInCommon = rate(values.currencyBInCommon, 1.27);
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  const cross = currencyAInCommon / currencyBInCommon;

  return {
    crossRateAtoB: roundTo(cross, 6),
    crossRateBtoA: roundTo(1 / cross, 6),
    amountInCurrencyB: round2(amount * cross),
  };
};

// --- 9. Currency Cross Rate (chain two pairs) ------------------------------
export const currencyCrossRateCalculator: CustomCalculator = (values) => {
  const rateAtoB = rate(values.rateAtoB, 1.085);
  const rateBtoC = rate(values.rateBtoC, 150);
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  const cross = rateAtoB * rateBtoC;

  return {
    crossRateAtoC: roundTo(cross, 6),
    crossRateCtoA: roundTo(1 / cross, 8),
    amountInCurrencyC: round2(amount * cross),
  };
};

// --- 10. Inverse Exchange Rate --------------------------------------------
export const inverseExchangeRateCalculator: CustomCalculator = (values) => {
  const exchangeRate = rate(values.exchangeRate, 1.085);
  const amount = Math.max(0, safeNumber(values.amount, 1000));

  return {
    inverseRate: roundTo(1 / exchangeRate, 8),
    baseToQuote: round2(amount * exchangeRate),
    quoteToBase: round2(amount / exchangeRate),
  };
};

// --- 11. Currency Pair (pips and price moves) -----------------------------
export const currencyPairCalculator: CustomCalculator = (values) => {
  const pairPrice = rate(values.pairPrice, 1.085);
  const baseAmount = Math.max(0, safeNumber(values.baseAmount, 10000));
  // 0.0001 for most pairs, 0.01 for JPY pairs.
  const pipSize = safeNumber(values.pipSize, 0.0001) === 0.01 ? 0.01 : 0.0001;
  const pipMove = safeNumber(values.pipMove, 50);

  const newPrice = pairPrice + pipMove * pipSize;

  return {
    quoteAmount: round2(baseAmount * pairPrice),
    inversePairPrice: roundTo(1 / pairPrice, 6),
    pipValueInQuote: roundTo(baseAmount * pipSize, 4),
    priceAfterMove: roundTo(newPrice, 6),
    valueChangeInQuote: round2(baseAmount * pipMove * pipSize),
  };
};

// --- 12. Multi-Currency Converter (one amount, four currencies) ------------
export const multiCurrencyConverter: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 1000));
  const r = [1, 2, 3, 4].map((k) => Math.max(0, safeNumber(values[`rate${k}`], [0.92, 0.79, 150, 88][k - 1])));

  return {
    amountInCurrency1: round2(amount * r[0]),
    amountInCurrency2: round2(amount * r[1]),
    amountInCurrency3: round2(amount * r[2]),
    amountInCurrency4: round2(amount * r[3]),
  };
};

// --- 13. Base Currency (consolidate three balances) ------------------------
export const baseCurrencyCalculator: CustomCalculator = (values) => {
  const holdings = [1, 2, 3].map((k) => {
    const amount = Math.max(0, safeNumber(values[`amount${k}`], [5000, 3000, 200000][k - 1]));
    // Base currency per 1 unit of this currency.
    const r = Math.max(0, safeNumber(values[`rateToBase${k}`], [1.085, 1.27, 0.00667][k - 1]));
    return amount * r;
  });
  const total = holdings.reduce((a, b) => a + b, 0);
  const share = (x: number) => (total > 0 ? round2((x / total) * 100) : 0);

  return {
    totalInBaseCurrency: round2(total),
    holding1InBase: round2(holdings[0]),
    holding2InBase: round2(holdings[1]),
    holding3InBase: round2(holdings[2]),
    holding1SharePercent: share(holdings[0]),
    holding2SharePercent: share(holdings[1]),
    holding3SharePercent: share(holdings[2]),
  };
};

export const currencyConversionCustomCalculators: Record<string, CustomCalculator> = {
  "exchange-rate-calculator": exchangeRateCalculator,
  "foreign-exchange-calculator": foreignExchangeCalculator,
  "profit-loss-currency-calculator": profitLossCurrencyCalculator,
  "currency-conversion-calculator": currencyConversionCalculator,
  "live-currency-converter": liveCurrencyConverter,
  "historical-currency-converter": historicalCurrencyConverter,
  "historical-exchange-rate-calculator": historicalExchangeRateCalculator,
  "cross-currency-rate-calculator": crossCurrencyRateCalculator,
  "currency-cross-rate-calculator": currencyCrossRateCalculator,
  "inverse-exchange-rate-calculator": inverseExchangeRateCalculator,
  "currency-pair-calculator": currencyPairCalculator,
  "multi-currency-converter": multiCurrencyConverter,
  "base-currency-calculator": baseCurrencyCalculator,
};
