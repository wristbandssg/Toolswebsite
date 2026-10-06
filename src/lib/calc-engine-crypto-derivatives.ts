/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 2 of 8 —
 * Derivatives & Trading Strategies (8 tools), filed under Crypto Calculators >
 * Crypto Trading & Profit Calculators. See calc-engine-crypto-trading.ts for
 * the full batch context.
 *
 *  - perpetualFundingRate (incl. funding rate arbitrage): position x rate x
 *    intervals; annualized rate; delta-neutral (long spot, short perp) net
 *    profit and APR on capital (spot + perp margin).
 *  - cryptoBasisTrade: futures premium over spot, annualized, net of fees,
 *    vs a cash yield.
 *  - cryptoOptionsPremium: Black-Scholes price for a call or put with
 *    implied volatility; break-even at expiry and delta.
 *  - cryptoGridTrading: arithmetic grid step, profit per grid after fees,
 *    projected profit from completed round trips (price-move loss excluded).
 *  - cryptoCopyTrading: leader's return less copy slippage, profit share on
 *    gains; annualized.
 *  - cryptoArbitrageProfit: buy on one exchange, sell on another, after
 *    fees and transfer cost; break-even spread.
 *  - cryptoTriangularArbitrage: USDT -> BTC -> ETH -> USDT with fees;
 *    implied cross rate vs quoted.
 *  - cryptoMakerTakerFee (incl. limit vs market order cost): maker fee for
 *    limit orders vs taker fee + slippage for market orders.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-derivatives-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};
const pct = (v: number, d: number) => Math.min(99.99, pos(v, d)) / 100;

// Standard normal CDF (Abramowitz-Stegun 26.2.17).
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

// --- 1. Perpetual Futures Funding Rate Calculator --------------------------------------
export const perpetualFundingRateCalculator: CustomCalculator = (values) => {
  const positionSize = pos(values.positionSize, 10000);
  const fundingRatePercent = safeNumber(values.fundingRatePercent, 0.01);
  const intervalsPerDay = Math.max(1, pos(values.intervalsPerDay, 3));
  const days = pos(values.days, 30);
  const side = pick(values.side, 1, 2);
  const tradingFeesPercent = pos(values.tradingFeesPercent, 0.4);
  const perpLeverage = Math.max(1, pos(values.perpLeverage, 3));

  const perInterval = (positionSize * fundingRatePercent) / 100;
  const total = perInterval * intervalsPerDay * days;
  const youGet = side === 1 ? -total : total;
  // Delta-neutral: long spot + short perp collects positive funding.
  const arbNet = total - (positionSize * tradingFeesPercent) / 100;
  const capital = positionSize * (1 + 1 / perpLeverage);

  return {
    fundingPerInterval: round2(perInterval),
    fundingReceivedOrPaid: round2(youGet),
    annualizedFundingRate: round2(fundingRatePercent * intervalsPerDay * 365),
    arbitrageNetProfit: round2(arbNet),
    arbitrageAprOnCapital: round2(capital > 0 && days > 0 ? (arbNet / capital) * (365 / days) * 100 : 0),
  };
};

// --- 2. Crypto Futures Basis Trade Calculator ------------------------------------------
export const cryptoBasisTradeCalculator: CustomCalculator = (values) => {
  const spotPrice = pos(values.spotPrice, 60000);
  const futuresPrice = pos(values.futuresPrice, 61500);
  const daysToExpiry = Math.max(1, pos(values.daysToExpiry, 90));
  const positionSize = pos(values.positionSize, 100000);
  const feesPercent = pos(values.feesPercent, 0.2);
  const cashYieldPercent = pos(values.cashYieldPercent, 4.5);

  const basis = spotPrice > 0 ? (futuresPrice - spotPrice) / spotPrice : 0;
  const profit = positionSize * basis - (positionSize * feesPercent) / 100;
  const netAnnual = positionSize > 0 ? (profit / positionSize) * (365 / daysToExpiry) * 100 : 0;

  return {
    basisPercent: round2(basis * 100),
    annualizedBasisPercent: round2(basis * (365 / daysToExpiry) * 100),
    profitAtExpiry: round2(profit),
    netAnnualizedReturn: round2(netAnnual),
    excessOverCashYield: round2(netAnnual - cashYieldPercent),
  };
};

// --- 3. Crypto Options Premium Calculator (Black-Scholes) ------------------------------
export const cryptoOptionsPremiumCalculator: CustomCalculator = (values) => {
  const spot = pos(values.spot, 60000);
  const strike = pos(values.strike, 65000);
  const days = Math.max(0.01, pos(values.days, 30));
  const vol = Math.max(0.0001, pos(values.impliedVolPercent, 55) / 100);
  const rate = safeNumber(values.ratePercent, 4.5) / 100;
  const type = pick(values.type, 1, 2);
  const coins = pos(values.coins, 1);

  const t = days / 365;
  let price = 0;
  let delta = 0;
  if (spot > 0 && strike > 0) {
    const d1 = (Math.log(spot / strike) + (rate + (vol * vol) / 2) * t) / (vol * Math.sqrt(t));
    const d2 = d1 - vol * Math.sqrt(t);
    const disc = Math.exp(-rate * t);
    if (type === 1) {
      price = spot * normCdf(d1) - strike * disc * normCdf(d2);
      delta = normCdf(d1);
    } else {
      price = strike * disc * normCdf(-d2) - spot * normCdf(-d1);
      delta = normCdf(d1) - 1;
    }
  }

  return {
    premiumPerCoin: round2(price),
    totalPremium: round2(price * coins),
    premiumPercentOfSpot: round2(spot > 0 ? (price / spot) * 100 : 0),
    breakEvenAtExpiry: round2(type === 1 ? strike + price : Math.max(0, strike - price)),
    delta: Math.round(delta * 1000) / 1000,
  };
};

// --- 4. Crypto Grid Trading Calculator -------------------------------------------------
export const cryptoGridTradingCalculator: CustomCalculator = (values) => {
  const lowerPrice = pos(values.lowerPrice, 55000);
  const upperPrice = pos(values.upperPrice, 65000);
  const grids = Math.max(1, Math.round(pos(values.grids, 20)));
  const investment = pos(values.investment, 10000);
  const fee = pct(values.feePercent, 0.1);
  const tradesPerDay = pos(values.tradesPerDay, 4);
  const days = pos(values.days, 30);

  const step = Math.max(0, upperPrice - lowerPrice) / grids;
  const mid = (upperPrice + lowerPrice) / 2;
  const perGrid = mid > 0 ? step / mid - 2 * fee : 0;
  const perTrade = (investment / grids) * perGrid;
  const total = perTrade * tradesPerDay * days;

  return {
    gridStep: round2(step),
    profitPerGridPercent: round2(perGrid * 100),
    profitPerRoundTrip: round2(perTrade),
    totalGridProfit: round2(total),
    returnPercent: round2(investment > 0 ? (total / investment) * 100 : 0),
    annualizedReturn: round2(investment > 0 && days > 0 ? (total / investment) * (365 / days) * 100 : 0),
  };
};

// --- 5. Crypto Copy Trading Calculator -------------------------------------------------
export const cryptoCopyTradingCalculator: CustomCalculator = (values) => {
  const investment = pos(values.investment, 5000);
  const leaderReturnPercent = safeNumber(values.leaderReturnPercent, 40);
  const months = Math.max(0.1, pos(values.months, 6));
  const slippagePercent = pos(values.slippagePercent, 2);
  const profitSharePercent = Math.min(100, pos(values.profitSharePercent, 10));
  const platformFeeMonthly = pos(values.platformFeeMonthly, 0);

  const gross = (investment * (leaderReturnPercent - slippagePercent)) / 100;
  const share = gross > 0 ? (gross * profitSharePercent) / 100 : 0;
  const net = gross - share - platformFeeMonthly * months;
  const growth = investment > 0 ? 1 + net / investment : 0;

  return {
    grossProfit: round2(gross),
    profitShareFee: round2(share),
    netProfit: round2(net),
    netReturnPercent: round2(investment > 0 ? (net / investment) * 100 : 0),
    annualizedReturn: round2(growth > 0 ? (Math.pow(growth, 12 / months) - 1) * 100 : -100),
  };
};

// --- 6. Crypto Arbitrage Profit Calculator ---------------------------------------------
export const cryptoArbitrageProfitCalculator: CustomCalculator = (values) => {
  const buyPrice = pos(values.buyPrice, 60000);
  const sellPrice = pos(values.sellPrice, 60450);
  const amount = pos(values.amount, 20000);
  const buyFee = pct(values.buyFeePercent, 0.1);
  const sellFee = pct(values.sellFeePercent, 0.1);
  const transferFee = pos(values.transferFee, 15);

  const coins = buyPrice > 0 ? (amount * (1 - buyFee)) / buyPrice : 0;
  const proceeds = coins * sellPrice * (1 - sellFee);
  const profit = proceeds - amount - transferFee;
  const breakEven = (1 / ((1 - buyFee) * (1 - sellFee)) - 1) * 100 + (amount > 0 ? (transferFee / amount) * 100 : 0);

  return {
    priceSpreadPercent: round2(buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0),
    saleProceeds: round2(proceeds),
    netProfit: round2(profit),
    returnPercent: round2(amount > 0 ? (profit / amount) * 100 : 0),
    breakEvenSpreadPercent: Math.round(breakEven * 1000) / 1000,
  };
};

// --- 7. Crypto Triangular Arbitrage Calculator -----------------------------------------
export const cryptoTriangularArbitrageCalculator: CustomCalculator = (values) => {
  const startAmount = pos(values.startAmount, 10000);
  const btcUsdt = pos(values.btcUsdt, 60000);
  const ethBtc = pos(values.ethBtc, 0.0575);
  const ethUsdt = pos(values.ethUsdt, 3475);
  const fee = pct(values.feePercent, 0.1);

  const btc = btcUsdt > 0 ? (startAmount * (1 - fee)) / btcUsdt : 0;
  const eth = ethBtc > 0 ? (btc * (1 - fee)) / ethBtc : 0;
  const end = eth * ethUsdt * (1 - fee);
  const implied = btcUsdt * ethBtc;

  return {
    endingAmount: round2(end),
    profit: round2(end - startAmount),
    profitPercent: round2(startAmount > 0 ? ((end - startAmount) / startAmount) * 100 : 0),
    impliedEthUsdt: round2(implied),
    mispricingPercent: round2(implied > 0 ? (ethUsdt / implied - 1) * 100 : 0),
  };
};

// --- 8. Crypto Maker vs Taker Fee Calculator -------------------------------------------
export const cryptoMakerTakerFeeCalculator: CustomCalculator = (values) => {
  const tradeSize = pos(values.tradeSize, 10000);
  const tradesPerMonth = pos(values.tradesPerMonth, 20);
  const makerFeePercent = pos(values.makerFeePercent, 0.08);
  const takerFeePercent = pos(values.takerFeePercent, 0.1);
  const slippagePercent = pos(values.slippagePercent, 0.05);

  const limit = (tradeSize * makerFeePercent) / 100;
  const market = (tradeSize * (takerFeePercent + slippagePercent)) / 100;

  return {
    limitOrderCostPerTrade: round2(limit),
    marketOrderCostPerTrade: round2(market),
    monthlyLimitCost: round2(limit * tradesPerMonth),
    monthlyMarketCost: round2(market * tradesPerMonth),
    yearlySavingsWithLimitOrders: round2((market - limit) * tradesPerMonth * 12),
  };
};

export const cryptoDerivativesCustomCalculators: Record<string, CustomCalculator> = {
  "perpetual-funding-rate-calculator": perpetualFundingRateCalculator,
  "crypto-basis-trade-calculator": cryptoBasisTradeCalculator,
  "crypto-options-premium-calculator": cryptoOptionsPremiumCalculator,
  "crypto-grid-trading-calculator": cryptoGridTradingCalculator,
  "crypto-copy-trading-calculator": cryptoCopyTradingCalculator,
  "crypto-arbitrage-profit-calculator": cryptoArbitrageProfitCalculator,
  "crypto-triangular-arbitrage-calculator": cryptoTriangularArbitrageCalculator,
  "crypto-maker-taker-fee-calculator": cryptoMakerTakerFeeCalculator,
};
