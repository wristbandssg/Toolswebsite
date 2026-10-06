/**
 * Batch: "Crypto Calculators" expansion (6 Oct 2026), sub-batch 1 of 8 —
 * Crypto Trading (8 tools), filed under Crypto Calculators > Crypto Trading &
 * Profit Calculators.
 *
 * Crypto Calculators (a Finance sub-category that held the 89 currency/forex
 * tools) is now split into 5 sub-categories: Currency Exchange & Forex (the
 * 87 existing currency tools), Crypto Trading & Profit (+ the 2 crypto
 * converters), Crypto Fees, Payments & Loans, Crypto Staking, DeFi & Mining,
 * and Crypto Market, Tax & Security. The user's 116-keyword list: 16 already
 * built (crypto-capital-gains, crypto-to-fiat-converter, dollar-cost-averaging,
 * portfolio-rebalancing, stock-cost-basis incl. tax lot method,
 * stock-average-price, stock-break-even, sharpe-ratio, forex-drawdown,
 * covered-call-options, remittance-fee, gifted-asset- and inherited-asset-
 * capital-gains, ira-growth, loyalty-points-value-estimator) and 40 merged
 * (see each engine header). 60 new tools in 8 sub-batches:
 *  - crypto-trading, crypto-derivatives          -> Crypto Trading & Profit
 *  - crypto-fees, crypto-payments-loans          -> Crypto Fees, Payments & Loans
 *  - crypto-staking-defi, crypto-mining          -> Crypto Staking, DeFi & Mining
 *  - crypto-market, crypto-tax-security          -> Crypto Market, Tax & Security
 * Prices and rates move constantly, so every tool takes the user's figures.
 *
 *  - cryptoProfitAndLoss (incl. Bitcoin, Ethereum, Solana, XRP, BNB, Cardano,
 *    Dogecoin, Litecoin, Polkadot, Avalanche, Polygon, Chainlink profit and
 *    loss, crypto ROI): coins bought after fee, proceeds after fee, ROI,
 *    annualized ROI, break-even sell price. The coin choice is a label only.
 *  - nftProfitAndLoss: sale less marketplace fee and creator royalty, gas.
 *  - cryptoPortfolioValue: up to 5 holdings; largest share; unrealized gain.
 *  - cryptoTakeProfit (incl. profit target price): up to 3 targets (% gain,
 *    % of coins sold); unsold coins valued at entry; average exit price.
 *  - cryptoStopLoss: stop price long/short, loss at stop incl. fees, 2R target.
 *  - cryptoPositionSize: risk amount / stop distance -> position size.
 *  - cryptoMarginTrading (incl. liquidation price, derivatives margin
 *    requirement): isolated margin; liquidation = entry x (1 -/+ 1/leverage
 *    +/- maintenance margin).
 *  - cryptoWhaleImpact: order size vs order-book depth per 1% -> price move,
 *    average slippage and cost.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-crypto-trading-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const pick = (v: number, d: number, n: number) => {
  const r = Math.round(safeNumber(v, d));
  return r >= 1 && r <= n ? r : d;
};
const pct = (v: number, d: number) => Math.min(99.99, pos(v, d)) / 100;

// --- 1. Crypto Profit and Loss Calculator ----------------------------------------------
export const cryptoProfitAndLossCalculator: CustomCalculator = (values) => {
  const investment = pos(values.investment, 1000);
  const buyPrice = pos(values.buyPrice, 60000);
  const sellPrice = pos(values.sellPrice, 75000);
  const buyFee = pct(values.buyFeePercent, 0.5);
  const sellFee = pct(values.sellFeePercent, 0.5);
  const holdingDays = Math.max(1, pos(values.holdingDays, 365));

  const coins = buyPrice > 0 ? (investment * (1 - buyFee)) / buyPrice : 0;
  const proceeds = coins * sellPrice * (1 - sellFee);
  const profit = proceeds - investment;
  const roi = investment > 0 ? profit / investment : 0;
  const annualized = proceeds > 0 && investment > 0 ? (Math.pow(proceeds / investment, 365 / holdingDays) - 1) * 100 : -100;

  return {
    coinsBought: round8(coins),
    saleProceeds: round2(proceeds),
    profitOrLoss: round2(profit),
    roiPercent: round2(roi * 100),
    annualizedRoiPercent: round2(annualized),
    breakEvenSellPrice: round2(buyPrice / ((1 - buyFee) * (1 - sellFee))),
  };
};

// --- 2. NFT Profit and Loss Calculator -------------------------------------------------
export const nftProfitAndLossCalculator: CustomCalculator = (values) => {
  const purchasePrice = pos(values.purchasePrice, 2000);
  const gasToBuy = pos(values.gasToBuy, 20);
  const salePrice = pos(values.salePrice, 3500);
  const marketplaceFee = pct(values.marketplaceFeePercent, 2.5);
  const royalty = pct(values.royaltyPercent, 5);
  const gasToSell = pos(values.gasToSell, 15);

  const fees = salePrice * (marketplaceFee + royalty);
  const net = salePrice - fees - gasToSell;
  const cost = purchasePrice + gasToBuy;
  const profit = net - cost;

  return {
    marketplaceAndRoyaltyFees: round2(fees),
    netProceeds: round2(net),
    totalCost: round2(cost),
    profitOrLoss: round2(profit),
    roiPercent: round2(cost > 0 ? (profit / cost) * 100 : 0),
    breakEvenSalePrice: round2((cost + gasToSell) / Math.max(0.0001, 1 - marketplaceFee - royalty)),
  };
};

// --- 3. Crypto Portfolio Value Calculator ----------------------------------------------
export const cryptoPortfolioValueCalculator: CustomCalculator = (values) => {
  const holdings: [number, number][] = [
    [pos(values.amount1, 0.1), pos(values.price1, 70000)],
    [pos(values.amount2, 2), pos(values.price2, 3500)],
    [pos(values.amount3, 20), pos(values.price3, 150)],
    [pos(values.amount4, 0), pos(values.price4, 0)],
    [pos(values.amount5, 0), pos(values.price5, 0)],
  ];
  const costBasis = pos(values.costBasis, 15000);

  const vals = holdings.map(([a, p]) => a * p);
  const total = vals.reduce((s, v) => s + v, 0);
  const largest = Math.max(...vals);

  return {
    holding1Value: round2(vals[0]),
    holding2Value: round2(vals[1]),
    holding3Value: round2(vals[2]),
    holding4Value: round2(vals[3]),
    holding5Value: round2(vals[4]),
    totalValue: round2(total),
    largestHoldingShare: round2(total > 0 ? (largest / total) * 100 : 0),
    unrealizedGain: round2(total - costBasis),
    unrealizedGainPercent: round2(costBasis > 0 ? ((total - costBasis) / costBasis) * 100 : 0),
  };
};

// --- 4. Crypto Take-Profit Calculator --------------------------------------------------
export const cryptoTakeProfitCalculator: CustomCalculator = (values) => {
  const entryPrice = pos(values.entryPrice, 60000);
  const coins = pos(values.coins, 0.5);
  const fee = pct(values.feePercent, 0.2);
  const targets: [number, number][] = [
    [pos(values.gain1Percent, 25), pos(values.sell1Percent, 30)],
    [pos(values.gain2Percent, 50), pos(values.sell2Percent, 30)],
    [pos(values.gain3Percent, 100), pos(values.sell3Percent, 40)],
  ];

  const totalSell = targets.reduce((s, t) => s + t[1], 0);
  const scale = totalSell > 100 ? 100 / totalSell : 1;
  let proceeds = 0;
  let sold = 0;
  const prices = targets.map(([g]) => entryPrice * (1 + g / 100));
  targets.forEach(([, s], k) => {
    const c = (coins * s * scale) / 100;
    sold += c;
    proceeds += c * prices[k] * (1 - fee);
  });
  const unsold = coins - sold;
  const cost = coins * entryPrice;
  const profit = proceeds + unsold * entryPrice - cost;

  return {
    target1Price: round2(prices[0]),
    target2Price: round2(prices[1]),
    target3Price: round2(prices[2]),
    proceedsFromTargets: round2(proceeds),
    averageExitPrice: round2(sold > 0 ? proceeds / sold : 0),
    totalProfit: round2(profit),
    profitPercent: round2(cost > 0 ? (profit / cost) * 100 : 0),
    coinsLeftUnsold: round8(Math.max(0, unsold)),
  };
};

// --- 5. Crypto Stop-Loss Calculator ----------------------------------------------------
export const cryptoStopLossCalculator: CustomCalculator = (values) => {
  const entryPrice = pos(values.entryPrice, 60000);
  const stopPercent = Math.min(100, pos(values.stopPercent, 8));
  const positionSize = pos(values.positionSize, 5000);
  const direction = pick(values.direction, 1, 2);
  const fee = pct(values.feePercent, 0.1);

  const s = stopPercent / 100;
  const stopPrice = direction === 1 ? entryPrice * (1 - s) : entryPrice * (1 + s);
  const fees = positionSize * fee + positionSize * (1 + (direction === 1 ? -s : s)) * fee;
  const loss = positionSize * s + fees;

  return {
    stopPrice: round2(stopPrice),
    lossAtStop: round2(loss),
    lossPercentOfPosition: round2(positionSize > 0 ? (loss / positionSize) * 100 : 0),
    twoToOneTargetPrice: round2(direction === 1 ? entryPrice * (1 + 2 * s) : entryPrice * (1 - 2 * s)),
  };
};

// --- 6. Crypto Position Size Calculator ------------------------------------------------
export const cryptoPositionSizeCalculator: CustomCalculator = (values) => {
  const accountSize = pos(values.accountSize, 10000);
  const riskPercent = Math.min(100, pos(values.riskPercent, 1));
  const entryPrice = pos(values.entryPrice, 60000);
  const stopPrice = pos(values.stopPrice, 57000);
  const leverage = Math.max(1, pos(values.leverage, 1));

  const risk = (accountSize * riskPercent) / 100;
  const distance = entryPrice > 0 ? Math.abs(entryPrice - stopPrice) / entryPrice : 0;
  const size = distance > 0 ? risk / distance : 0;

  return {
    riskAmount: round2(risk),
    stopDistancePercent: round2(distance * 100),
    positionSizeUsd: round2(size),
    positionSizeCoins: round8(entryPrice > 0 ? size / entryPrice : 0),
    marginNeeded: round2(size / leverage),
    positionAsShareOfAccount: round2(accountSize > 0 ? (size / accountSize) * 100 : 0),
  };
};

// --- 7. Crypto Margin Trading Calculator -----------------------------------------------
export const cryptoMarginTradingCalculator: CustomCalculator = (values) => {
  const margin = pos(values.margin, 1000);
  const leverage = Math.max(1, pos(values.leverage, 10));
  const entryPrice = pos(values.entryPrice, 60000);
  const exitPrice = pos(values.exitPrice, 63000);
  const direction = pick(values.direction, 1, 2);
  const maintenance = pct(values.maintenanceMarginPercent, 0.5);
  const fee = pct(values.feePercent, 0.05);

  const position = margin * leverage;
  const coins = entryPrice > 0 ? position / entryPrice : 0;
  const gross = direction === 1 ? coins * (exitPrice - entryPrice) : coins * (entryPrice - exitPrice);
  const fees = position * fee + coins * exitPrice * fee;
  const pnl = gross - fees;
  const liq = direction === 1 ? entryPrice * (1 - 1 / leverage + maintenance) : entryPrice * (1 + 1 / leverage - maintenance);

  return {
    positionSize: round2(position),
    initialMarginPercent: round2(100 / leverage),
    profitOrLoss: round2(pnl),
    returnOnMarginPercent: round2(margin > 0 ? (pnl / margin) * 100 : 0),
    liquidationPrice: round2(Math.max(0, liq)),
    distanceToLiquidationPercent: round2(entryPrice > 0 ? (Math.abs(entryPrice - Math.max(0, liq)) / entryPrice) * 100 : 0),
  };
};

// --- 8. Crypto Whale Transaction Impact Calculator -------------------------------------
export const cryptoWhaleImpactCalculator: CustomCalculator = (values) => {
  const orderSize = pos(values.orderSize, 500000);
  const depthPerPercent = pos(values.depthPerPercent, 2000000);
  const price = pos(values.price, 60000);
  const direction = pick(values.direction, 1, 2);

  const move = depthPerPercent > 0 ? orderSize / depthPerPercent : 0;
  const avgSlip = move / 2;
  const sign = direction === 1 ? 1 : -1;

  return {
    priceMovePercent: Math.round(move * 1000) / 1000,
    averageSlippagePercent: Math.round(avgSlip * 1000) / 1000,
    slippageCost: round2((orderSize * avgSlip) / 100),
    averageFillPrice: round2(price * (1 + (sign * avgSlip) / 100)),
    priceAfterOrder: round2(price * (1 + (sign * move) / 100)),
  };
};

export const cryptoTradingCustomCalculators: Record<string, CustomCalculator> = {
  "crypto-profit-and-loss-calculator": cryptoProfitAndLossCalculator,
  "nft-profit-and-loss-calculator": nftProfitAndLossCalculator,
  "crypto-portfolio-value-calculator": cryptoPortfolioValueCalculator,
  "crypto-take-profit-calculator": cryptoTakeProfitCalculator,
  "crypto-stop-loss-calculator": cryptoStopLossCalculator,
  "crypto-position-size-calculator": cryptoPositionSizeCalculator,
  "crypto-margin-trading-calculator": cryptoMarginTradingCalculator,
  "crypto-whale-impact-calculator": cryptoWhaleImpactCalculator,
};
