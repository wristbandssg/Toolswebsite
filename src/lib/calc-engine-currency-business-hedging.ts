/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch H
 * (Currency Baskets, Hedging & Business FX, 9 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - currencyBasketCalculator: a basket defined by fixed UNITS of five
 *    currencies (like the IMF's SDR) — its value and each one's weight.
 *  - weightedCurrencyBasketCalculator: money split by WEIGHTS across three
 *    currencies — the basket's return and each one's contribution.
 *  - currencyHedgingCalculator: a foreign investment partly hedged — the
 *    currency loss hedged vs unhedged, after the hedge's cost.
 *  - fxHedgeRatioCalculator: the minimum-variance hedge ratio and the
 *    number of futures contracts.
 *  - currencyExposureCalculator: a business's net open position from
 *    receivables, payables and hedges, and a rate shock's impact.
 *  - foreignCurrencyInvoiceCalculator: how much to invoice in a foreign
 *    currency to receive a target amount at home, with a buffer.
 *  - importCostCurrencyCalculator: landed cost of imported goods in your
 *    currency, and what a currency move adds.
 *  - exportRevenueCurrencyCalculator: export sales in your currency with
 *    part hedged at a forward, and a rate move's effect.
 *  - foreignInvestmentCurrencyReturnCalculator: an overseas investment's
 *    return in your currency, hedged vs unhedged.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-business-hedging-calculators.ts for the tool
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

// --- 1. Currency Basket (fixed units, SDR-style) ----------------------------
// Defaults are the IMF SDR basket units set in August 2022.
export const currencyBasketCalculator: CustomCalculator = (values) => {
  const defaults = [
    [0.57813, 1],
    [0.37379, 1.085],
    [1.0993, 0.14],
    [13.452, 0.00667],
    [0.08087, 1.27],
  ];
  const parts = defaults.map(([u, r], i) => {
    const k = i + 1;
    return Math.max(0, safeNumber(values[`units${k}`], u)) * Math.max(0, safeNumber(values[`rate${k}`], r));
  });
  const total = parts.reduce((a, b) => a + b, 0);
  const w = (x: number) => (total > 0 ? round2((x / total) * 100) : 0);

  return {
    basketValue: roundTo(total, 6),
    weight1Percent: w(parts[0]),
    weight2Percent: w(parts[1]),
    weight3Percent: w(parts[2]),
    weight4Percent: w(parts[3]),
    weight5Percent: w(parts[4]),
  };
};

// --- 2. Weighted Currency Basket (return by weights) -------------------------
export const weightedCurrencyBasketCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const legs = [1, 2, 3].map((k) => ({
    w: Math.max(0, safeNumber(values[`weight${k}`], [50, 30, 20][k - 1])),
    s: rate(values[`startRate${k}`], [1.04, 1.24, 0.0069][k - 1]),
    e: rate(values[`endRate${k}`], [1.085, 1.27, 0.00667][k - 1]),
  }));
  const totalW = legs.reduce((a, l) => a + l.w, 0);
  const contrib = legs.map((l) => (totalW > 0 ? (l.w / totalW) * (l.e / l.s - 1) : 0));
  const r = contrib.reduce((a, b) => a + b, 0);

  return {
    endValue: round2(amount * (1 + r)),
    basketReturnPercent: round2(r * 100),
    contribution1Points: round2(contrib[0] * 100),
    contribution2Points: round2(contrib[1] * 100),
    contribution3Points: round2(contrib[2] * 100),
  };
};

// --- 3. Currency Hedging (hedged vs unhedged) ------------------------------
export const currencyHedgingCalculator: CustomCalculator = (values) => {
  const foreignAssetValue = Math.max(0, safeNumber(values.foreignAssetValue, 100000));
  const hedgeRatioPercent = pctClamp(values.hedgeRatioPercent, 50);
  const currencyMovePercent = Math.max(-100, safeNumber(values.currencyMovePercent, -8));
  const annualHedgeCostPercent = Math.max(0, safeNumber(values.annualHedgeCostPercent, 1.5));
  const months = Math.max(0, Math.min(600, safeNumber(values.months, 12)));

  const h = hedgeRatioPercent / 100;
  const unhedged = (foreignAssetValue * currencyMovePercent) / 100;
  const cost = foreignAssetValue * h * (annualHedgeCostPercent / 100) * (months / 12);
  const hedged = unhedged * (1 - h) - cost;

  return {
    currencyResultHedged: round2(hedged),
    currencyResultUnhedged: round2(unhedged),
    hedgeCost: round2(cost),
    differenceFromHedging: round2(hedged - unhedged),
  };
};

// --- 4. FX Hedge Ratio (minimum variance) ----------------------------------
export const fxHedgeRatioCalculator: CustomCalculator = (values) => {
  const correlation = Math.max(-1, Math.min(1, safeNumber(values.correlation, 0.9)));
  const spotVolatilityPercent = Math.max(0, safeNumber(values.spotVolatilityPercent, 10));
  const futuresVolatilityPercent = Math.max(0.0001, safeNumber(values.futuresVolatilityPercent, 11));
  const exposure = Math.max(0, safeNumber(values.exposure, 1000000));
  const contractSize = Math.max(1, safeNumber(values.contractSize, 125000));

  const h = (correlation * spotVolatilityPercent) / futuresVolatilityPercent;
  const contracts = (h * exposure) / contractSize;

  return {
    optimalHedgeRatio: roundTo(h, 4),
    amountToHedge: round2(h * exposure),
    contractsNeeded: round2(contracts),
    contractsRounded: Math.round(contracts),
    varianceReductionPercent: round2(correlation * correlation * 100),
  };
};

// --- 5. Currency Exposure (net open position) ------------------------------
export const currencyExposureCalculator: CustomCalculator = (values) => {
  const receivables = Math.max(0, safeNumber(values.receivables, 800000));
  const payables = Math.max(0, safeNumber(values.payables, 300000));
  const hedgedAmount = Math.max(0, safeNumber(values.hedgedAmount, 250000));
  // Home currency per 1 unit of the foreign currency.
  const exchangeRate = rate(values.exchangeRate, 1.085);
  const shockPercent = Math.max(0, safeNumber(values.shockPercent, 10));

  const net = receivables - payables;
  const open = net >= 0 ? Math.max(0, net - hedgedAmount) : Math.min(0, net + hedgedAmount);

  return {
    impactOfShock: round2((Math.abs(open) * exchangeRate * shockPercent) / 100),
    netExposure: round2(net),
    openExposure: round2(open),
    openExposureInHomeCurrency: round2(open * exchangeRate),
    hedgedSharePercent: net !== 0 ? round2(Math.min(100, (hedgedAmount / Math.abs(net)) * 100)) : 0,
  };
};

// --- 6. Foreign Currency Invoice (invoice for a target) --------------------
export const foreignCurrencyInvoiceCalculator: CustomCalculator = (values) => {
  const targetHomeAmount = Math.max(0, safeNumber(values.targetHomeAmount, 10000));
  // Foreign currency per 1 unit of home currency.
  const exchangeRate = rate(values.exchangeRate, 0.92);
  const bankFeePercent = Math.min(99, Math.max(0, safeNumber(values.bankFeePercent, 1)));
  const bufferPercent = Math.max(0, safeNumber(values.bufferPercent, 3));
  const worstCaseRate = rate(values.worstCaseRate, 0.96);

  const keep = 1 - bankFeePercent / 100;
  const invoice = (targetHomeAmount / keep) * exchangeRate * (1 + bufferPercent / 100);
  const atCurrent = (invoice / exchangeRate) * keep;
  const atWorst = (invoice / worstCaseRate) * keep;

  return {
    amountToInvoice: round2(invoice),
    receivedAtCurrentRate: round2(atCurrent),
    receivedAtWorstRate: round2(atWorst),
    worstCaseVsTarget: round2(atWorst - targetHomeAmount),
  };
};

// --- 7. Import Cost Currency (landed cost) -----------------------------------
export const importCostCurrencyCalculator: CustomCalculator = (values) => {
  const unitPriceForeign = Math.max(0, safeNumber(values.unitPriceForeign, 20));
  const quantity = Math.max(0, safeNumber(values.quantity, 1000));
  // Foreign currency per 1 unit of home currency.
  const exchangeRate = rate(values.exchangeRate, 0.92);
  const shippingHome = Math.max(0, safeNumber(values.shippingHome, 1500));
  const dutyPercent = Math.max(0, safeNumber(values.dutyPercent, 5));
  const paymentFeePercent = Math.max(0, safeNumber(values.paymentFeePercent, 1));
  const currencyMovePercent = Math.max(-99, safeNumber(values.currencyMovePercent, 5));

  const landed = (goodsHome: number) =>
    goodsHome * (1 + paymentFeePercent / 100) + goodsHome * (dutyPercent / 100) + shippingHome;
  const goods = (unitPriceForeign * quantity) / exchangeRate;
  const total = landed(goods);
  // A foreign-currency rise of X% makes the goods cost X% more at home.
  const moved = landed(goods * (1 + currencyMovePercent / 100));

  return {
    totalLandedCost: round2(total),
    landedCostPerUnit: quantity > 0 ? round2(total / quantity) : 0,
    goodsCostInHomeCurrency: round2(goods),
    landedCostAfterCurrencyMove: round2(moved),
    extraCostFromMove: round2(moved - total),
  };
};

// --- 8. Export Revenue Currency (partly hedged) ----------------------------
export const exportRevenueCurrencyCalculator: CustomCalculator = (values) => {
  const salesForeign = Math.max(0, safeNumber(values.salesForeign, 250000));
  // Home currency per 1 unit of the foreign currency.
  const spotRate = rate(values.spotRate, 1.085);
  const hedgedPercent = pctClamp(values.hedgedPercent, 60);
  const forwardRate = rate(values.forwardRate, 1.09);
  const feePercent = Math.min(99, Math.max(0, safeNumber(values.feePercent, 0.5)));
  const rateMovePercent = Math.max(-99, safeNumber(values.rateMovePercent, -5));

  const keep = 1 - feePercent / 100;
  const hedged = salesForeign * (hedgedPercent / 100);
  const open = salesForeign - hedged;
  const revenue = (spot: number) => (hedged * forwardRate + open * spot) * keep;
  const now = revenue(spotRate);
  const moved = revenue(spotRate * (1 + rateMovePercent / 100));

  return {
    homeRevenue: round2(now),
    revenueAfterRateMove: round2(moved),
    changeFromRateMove: round2(moved - now),
    revenueIfFullyUnhedged: round2(salesForeign * spotRate * keep),
    changePerOnePercentMove: round2(open * spotRate * 0.01 * keep),
  };
};

// --- 9. Foreign Investment Currency Return (hedged vs unhedged) ------------
export const foreignInvestmentCurrencyReturnCalculator: CustomCalculator = (values) => {
  const amount = Math.max(0, safeNumber(values.amount, 10000));
  const localReturnPercent = Math.max(-100, safeNumber(values.localReturnPercent, 8));
  const currencyChangePercent = Math.max(-100, safeNumber(values.currencyChangePercent, -4));
  const hedgeCostPercent = Math.max(0, safeNumber(values.hedgeCostPercent, 1.5));

  const local = localReturnPercent / 100;
  const fx = currencyChangePercent / 100;
  const unhedged = (1 + local) * (1 + fx) - 1;
  const hedged = local - hedgeCostPercent / 100;

  return {
    unhedgedReturnPercent: round2(unhedged * 100),
    hedgedReturnPercent: round2(hedged * 100),
    currencyEffectPoints: round2((unhedged - local) * 100),
    unhedgedEndValue: round2(amount * (1 + unhedged)),
    hedgedEndValue: round2(amount * (1 + hedged)),
  };
};

export const currencyBusinessHedgingCustomCalculators: Record<string, CustomCalculator> = {
  "currency-basket-calculator": currencyBasketCalculator,
  "weighted-currency-basket-calculator": weightedCurrencyBasketCalculator,
  "currency-hedging-calculator": currencyHedgingCalculator,
  "fx-hedge-ratio-calculator": fxHedgeRatioCalculator,
  "currency-exposure-calculator": currencyExposureCalculator,
  "foreign-currency-invoice-calculator": foreignCurrencyInvoiceCalculator,
  "import-cost-currency-calculator": importCostCurrencyCalculator,
  "export-revenue-currency-calculator": exportRevenueCurrencyCalculator,
  "foreign-investment-currency-return-calculator": foreignInvestmentCurrencyReturnCalculator,
};
