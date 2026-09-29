/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch I
 * (Crypto & Precious Metal Converters, 4 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Prices are entered by the user (crypto and metal prices move by the
 * minute); nothing is fetched live.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - cryptoToFiatConverter: SELLING coins — cash out after the exchange's
 *    trading fee and withdrawal fee, in dollars or another currency.
 *  - fiatToCryptoConverter: BUYING coins — how much crypto your money buys
 *    after the fee and spread, and the effective price you paid.
 *  - goldCurrencyConverter: gold by weight unit (gram, troy ounce, tola,
 *    kilogram) and karat — its value in any currency.
 *  - preciousMetalCurrencyConverter: any metal (silver, platinum...) by
 *    purity — melt value, what a dealer charges above it, and what it pays
 *    back.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-crypto-metals-calculators.ts for the tool
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

// One troy ounce in grams.
const GRAMS_PER_TROY_OUNCE = 31.1034768;
const pctClamp = (v: number, d: number) => Math.min(100, Math.max(0, safeNumber(v, d)));

// --- 1. Crypto to Fiat (sell) -----------------------------------------------
export const cryptoToFiatConverter: CustomCalculator = (values) => {
  const coinAmount = Math.max(0, safeNumber(values.coinAmount, 0.5));
  const coinPriceUsd = Math.max(0, safeNumber(values.coinPriceUsd, 65000));
  const tradingFeePercent = pctClamp(values.tradingFeePercent, 0.5);
  const withdrawalFeeUsd = Math.max(0, safeNumber(values.withdrawalFeeUsd, 5));
  // Units of your local currency per 1 US dollar (1 if you want dollars).
  const usdToLocalRate = Math.max(0, safeNumber(values.usdToLocalRate, 1));

  const gross = coinAmount * coinPriceUsd;
  const fee = (gross * tradingFeePercent) / 100;
  const net = Math.max(0, gross - fee - withdrawalFeeUsd);

  return {
    netCashOutUsd: round2(net),
    netCashOutLocal: round2(net * usdToLocalRate),
    grossValueUsd: round2(gross),
    totalFeesUsd: round2(Math.min(gross, fee + withdrawalFeeUsd)),
  };
};

// --- 2. Fiat to Crypto (buy) --------------------------------------------------
export const fiatToCryptoConverter: CustomCalculator = (values) => {
  const fiatAmount = Math.max(0, safeNumber(values.fiatAmount, 1000));
  const coinPrice = Math.max(0.00000001, safeNumber(values.coinPrice, 65000));
  const feePercent = pctClamp(values.feePercent, 1.5);
  const spreadPercent = pctClamp(values.spreadPercent, 0.5);

  const coins = (fiatAmount * (1 - feePercent / 100)) / (coinPrice * (1 + spreadPercent / 100));

  return {
    coinsReceived: roundTo(coins, 8),
    effectivePricePerCoin: coins > 0 ? round2(fiatAmount / coins) : 0,
    coinsAtMarketPriceNoFees: roundTo(fiatAmount / coinPrice, 8),
    totalCostOfFees: coins > 0 ? round2(fiatAmount - coins * coinPrice) : round2(fiatAmount),
  };
};

// --- 3. Gold Currency Converter (weight unit and karat) ---------------------
export const goldCurrencyConverter: CustomCalculator = (values) => {
  const weight = Math.max(0, safeNumber(values.weight, 10));
  // Grams in one unit of weight: 1 (gram), 31.1034768 (troy ounce),
  // 11.6638 (tola), 1000 (kilogram).
  const gramsPerUnit = Math.max(0, safeNumber(values.gramsPerUnit, 1));
  // Gold content: 99.9 (24K), 91.67 (22K), 75 (18K), 58.33 (14K).
  const purityPercent = pctClamp(values.purityPercent, 99.9);
  const goldPricePerOunceUsd = Math.max(0, safeNumber(values.goldPricePerOunceUsd, 3500));
  const usdToLocalRate = Math.max(0, safeNumber(values.usdToLocalRate, 1));

  const pureGrams = weight * gramsPerUnit * (purityPercent / 100);
  const usd = (pureGrams / GRAMS_PER_TROY_OUNCE) * goldPricePerOunceUsd;

  return {
    valueInLocalCurrency: round2(usd * usdToLocalRate),
    valueInUsd: round2(usd),
    pureGoldGrams: roundTo(pureGrams, 4),
    pricePerGramLocal: round2((goldPricePerOunceUsd / GRAMS_PER_TROY_OUNCE) * usdToLocalRate),
  };
};

// --- 4. Precious Metal Currency Converter (melt, dealer premium) -----------
export const preciousMetalCurrencyConverter: CustomCalculator = (values) => {
  const metalPricePerOunceUsd = Math.max(0, safeNumber(values.metalPricePerOunceUsd, 38));
  const weightGrams = Math.max(0, safeNumber(values.weightGrams, 1000));
  const purityPercent = pctClamp(values.purityPercent, 99.9);
  const dealerPremiumPercent = Math.max(0, safeNumber(values.dealerPremiumPercent, 8));
  const dealerBuybackDiscountPercent = pctClamp(values.dealerBuybackDiscountPercent, 3);
  const usdToLocalRate = Math.max(0, safeNumber(values.usdToLocalRate, 1));

  const melt = ((weightGrams * (purityPercent / 100)) / GRAMS_PER_TROY_OUNCE) * metalPricePerOunceUsd * usdToLocalRate;
  const buy = melt * (1 + dealerPremiumPercent / 100);
  const sell = melt * (1 - dealerBuybackDiscountPercent / 100);

  return {
    meltValue: round2(melt),
    dealerSellingPrice: round2(buy),
    dealerBuybackPrice: round2(sell),
    roundTripCost: round2(buy - sell),
    priceRiseToBreakEvenPercent: sell > 0 ? round2((buy / sell - 1) * 100) : 0,
  };
};

export const currencyCryptoMetalsCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-to-fiat-converter": cryptoToFiatConverter,
  "fiat-to-crypto-converter": fiatToCryptoConverter,
  "gold-currency-converter": goldCurrencyConverter,
  "precious-metal-currency-converter": preciousMetalCurrencyConverter,
};
