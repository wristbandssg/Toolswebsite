/**
 * Batch: "Crypto Calculators" (currency, forex & crypto list) sub-batch E
 * (Forex Trade Sizing, Pips & Risk, 12 tools). See
 * calc-engine-currency-conversion.ts for the full list of 9 sub-batches.
 *
 * Conventions: 1 standard lot = 100,000 units of the base currency; a pip
 * is 0.0001 (0.01 for JPY pairs). "Quote-to-account rate" converts the
 * pair's quote currency into your account currency (1 when the account is
 * in the quote currency, e.g. a USD account trading EUR/USD).
 *
 * Near-namesakes, and how each is deliberately different (forex-profit-
 * loss-calculator already gives gross P/L from units, entry, exit and
 * direction; forex-position-size-calculator gives units from account risk
 * and stop distance):
 *  - forexCalculator: a position overview — notional, pip value, margin
 *    and what one pip is worth as % of the account.
 *  - forexProfitCalculator: NET profit after the spread and commission.
 *  - forexLossCalculator: a LOSING STREAK at a fixed risk % — balance left,
 *    drawdown and the gain needed to recover.
 *  - forexPipCalculator: pips between two prices and their money value.
 *  - pipValueCalculator: pip value per standard/mini/micro lot for any
 *    account currency (quote, base or a third currency).
 *  - forexLotSizeCalculator: units ↔ standard, mini and micro lots, and the
 *    lots needed for a chosen value per pip.
 *  - forexMarginCalculator: margin required, free margin and margin level.
 *  - forexLeverageCalculator: the leverage you are actually using vs the
 *    broker's maximum.
 *  - forexRiskCalculator: money and % of the account at risk on one trade
 *    you've already sized, and the lots that fit a target risk %.
 *  - forexRiskRewardCalculator: reward:risk ratio, break-even win rate and
 *    expectancy at your win rate.
 *  - forexStopLossCalculator: where the stop must go for a fixed lot size
 *    and risk %.
 *  - forexTakeProfitCalculator: the take-profit price for a chosen
 *    reward:risk ratio.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-currency-forex-trade-calculators.ts for the tool
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

const LOT = 100000;
const MIN_RATE = 0.000001;
const rate = (v: number, d: number) => Math.max(MIN_RATE, safeNumber(v, d));
const pip = (v: number) => (safeNumber(v, 0.0001) === 0.01 ? 0.01 : 0.0001);
const dir = (v: number) => (safeNumber(v, 1) === 2 ? -1 : 1); // 1 = long/buy, 2 = short/sell

// --- 1. Forex Calculator (position overview) -------------------------------
export const forexCalculator: CustomCalculator = (values) => {
  const pairPrice = rate(values.pairPrice, 1.085);
  const lots = Math.max(0, safeNumber(values.lots, 1));
  const pipSize = pip(values.pipSize);
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);
  const leverage = Math.max(1, safeNumber(values.leverage, 30));
  const accountBalance = Math.max(0.01, safeNumber(values.accountBalance, 10000));

  const units = lots * LOT;
  const notional = units * pairPrice * quoteToAccountRate;
  const pipValue = units * pipSize * quoteToAccountRate;

  return {
    pipValue: round2(pipValue),
    positionValue: round2(notional),
    marginRequired: round2(notional / leverage),
    units: round2(units),
    onePipPercentOfAccount: roundTo((pipValue / accountBalance) * 100, 4),
  };
};

// --- 2. Forex Profit (net of spread and commission) ------------------------
export const forexProfitCalculator: CustomCalculator = (values) => {
  const entryPrice = rate(values.entryPrice, 1.085);
  const exitPrice = rate(values.exitPrice, 1.092);
  const direction = dir(values.direction);
  const lots = Math.max(0, safeNumber(values.lots, 1));
  const pipSize = pip(values.pipSize);
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);
  const spreadPips = Math.max(0, safeNumber(values.spreadPips, 1));
  const commissionPerLotRoundTrip = Math.max(0, safeNumber(values.commissionPerLotRoundTrip, 7));

  const pips = ((exitPrice - entryPrice) * direction) / pipSize;
  const pipValue = lots * LOT * pipSize * quoteToAccountRate;
  const gross = pips * pipValue;
  const spread = spreadPips * pipValue;
  const commission = commissionPerLotRoundTrip * lots;
  const net = gross - spread - commission;

  return {
    netProfit: round2(net),
    grossProfit: round2(gross),
    grossPips: round2(pips),
    netPips: pipValue > 0 ? round2(net / pipValue) : 0,
    spreadCost: round2(spread),
    commission: round2(commission),
  };
};

// --- 3. Forex Loss (losing streak) --------------------------------------------
export const forexLossCalculator: CustomCalculator = (values) => {
  const accountBalance = Math.max(0, safeNumber(values.accountBalance, 10000));
  const riskPercent = Math.min(100, Math.max(0, safeNumber(values.riskPercent, 2)));
  const losingTrades = Math.max(0, Math.min(1000, Math.round(safeNumber(values.losingTrades, 5))));

  const left = accountBalance * Math.pow(1 - riskPercent / 100, losingTrades);
  const dd = accountBalance > 0 ? 1 - left / accountBalance : 0;

  return {
    balanceAfterStreak: round2(left),
    totalLoss: round2(accountBalance - left),
    drawdownPercent: round2(dd * 100),
    gainNeededToRecoverPercent: dd < 1 ? round2((1 / (1 - dd) - 1) * 100) : 0,
    firstTradeLoss: round2((accountBalance * riskPercent) / 100),
  };
};

// --- 4. Forex Pip Calculator (pips between prices) -------------------------
export const forexPipCalculator: CustomCalculator = (values) => {
  const price1 = rate(values.price1, 1.085);
  const price2 = rate(values.price2, 1.0923);
  const pipSize = pip(values.pipSize);
  const lots = Math.max(0, safeNumber(values.lots, 1));
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);

  const pips = (price2 - price1) / pipSize;
  const pipValue = lots * LOT * pipSize * quoteToAccountRate;

  return {
    pips: round2(pips),
    moneyValue: round2(pips * pipValue),
    pipValue: round2(pipValue),
  };
};

// --- 5. Pip Value Calculator (any account currency) ------------------------
export const pipValueCalculator: CustomCalculator = (values) => {
  const lots = Math.max(0, safeNumber(values.lots, 1));
  const pipSize = pip(values.pipSize);
  // 1 = account currency is the pair's quote currency (USD on EUR/USD),
  // 2 = it is the base currency (USD on USD/JPY), 3 = a third currency.
  const accountIs = Math.min(3, Math.max(1, Math.round(safeNumber(values.accountIs, 1))));
  const pairPrice = rate(values.pairPrice, 150);
  const quoteToAccountRate = rate(values.quoteToAccountRate, 0.0067);

  const perUnitInQuote = pipSize;
  const toAccount = accountIs === 1 ? 1 : accountIs === 2 ? 1 / pairPrice : quoteToAccountRate;
  const perStandard = LOT * perUnitInQuote * toAccount;

  return {
    pipValueForYourSize: round2(perStandard * lots),
    pipValuePerStandardLot: round2(perStandard),
    pipValuePerMiniLot: roundTo(perStandard / 10, 4),
    pipValuePerMicroLot: roundTo(perStandard / 100, 4),
  };
};

// --- 6. Forex Lot Size (units ↔ lots) ------------------------------------------
export const forexLotSizeCalculator: CustomCalculator = (values) => {
  const units = Math.max(0, safeNumber(values.units, 250000));
  const targetPipValue = Math.max(0, safeNumber(values.targetPipValue, 5));
  const pipValuePerStandardLot = Math.max(0.0001, safeNumber(values.pipValuePerStandardLot, 10));

  return {
    standardLots: roundTo(units / LOT, 4),
    miniLots: roundTo(units / 10000, 4),
    microLots: roundTo(units / 1000, 4),
    lotsForTargetPipValue: roundTo(targetPipValue / pipValuePerStandardLot, 4),
    unitsForTargetPipValue: round2((targetPipValue / pipValuePerStandardLot) * LOT),
  };
};

// --- 7. Forex Margin (required, free, level) ----------------------------------
export const forexMarginCalculator: CustomCalculator = (values) => {
  const lots = Math.max(0, safeNumber(values.lots, 2));
  const pairPrice = rate(values.pairPrice, 1.085);
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);
  const leverage = Math.max(1, safeNumber(values.leverage, 30));
  const accountEquity = Math.max(0, safeNumber(values.accountEquity, 10000));

  const notional = lots * LOT * pairPrice * quoteToAccountRate;
  const margin = notional / leverage;

  return {
    marginRequired: round2(margin),
    positionValue: round2(notional),
    freeMargin: round2(accountEquity - margin),
    marginLevelPercent: margin > 0 ? round2((accountEquity / margin) * 100) : 0,
    marginRequirementPercent: round2(100 / leverage),
  };
};

// --- 8. Forex Leverage (effective vs maximum) ------------------------------
export const forexLeverageCalculator: CustomCalculator = (values) => {
  const accountEquity = Math.max(0.01, safeNumber(values.accountEquity, 10000));
  const positionValue = Math.max(0, safeNumber(values.positionValue, 150000));
  const brokerMaxLeverage = Math.max(1, safeNumber(values.brokerMaxLeverage, 30));

  const margin = positionValue / brokerMaxLeverage;

  return {
    effectiveLeverage: round2(positionValue / accountEquity),
    maxPositionValue: round2(accountEquity * brokerMaxLeverage),
    marginUsed: round2(margin),
    marginUsedPercentOfEquity: round2((margin / accountEquity) * 100),
    movePercentToLoseAccount: positionValue > 0 ? round2((accountEquity / positionValue) * 100) : 0,
  };
};

// --- 9. Forex Risk (one sized trade) -----------------------------------------
export const forexRiskCalculator: CustomCalculator = (values) => {
  const accountBalance = Math.max(0.01, safeNumber(values.accountBalance, 10000));
  const entryPrice = rate(values.entryPrice, 1.085);
  const stopPrice = rate(values.stopPrice, 1.08);
  const lots = Math.max(0, safeNumber(values.lots, 0.5));
  const pipSize = pip(values.pipSize);
  const quoteToAccountRate = rate(values.quoteToAccountRate, 1);
  const targetRiskPercent = Math.max(0, safeNumber(values.targetRiskPercent, 1));

  const stopPips = Math.abs(entryPrice - stopPrice) / pipSize;
  const pipValuePerLot = LOT * pipSize * quoteToAccountRate;
  const risk = stopPips * pipValuePerLot * lots;
  const maxLots = stopPips > 0 ? (accountBalance * targetRiskPercent) / 100 / (stopPips * pipValuePerLot) : 0;

  return {
    moneyAtRisk: round2(risk),
    riskPercentOfAccount: round2((risk / accountBalance) * 100),
    stopDistancePips: round2(stopPips),
    maxLotsForTargetRisk: roundTo(maxLots, 4),
  };
};

// --- 10. Forex Risk-Reward (ratio, break-even win rate, expectancy) -------
export const forexRiskRewardCalculator: CustomCalculator = (values) => {
  const entryPrice = rate(values.entryPrice, 1.085);
  const stopPrice = rate(values.stopPrice, 1.08);
  const targetPrice = rate(values.targetPrice, 1.0975);
  const pipSize = pip(values.pipSize);
  const winRatePercent = Math.min(100, Math.max(0, safeNumber(values.winRatePercent, 45)));

  const risk = Math.abs(entryPrice - stopPrice) / pipSize;
  const reward = Math.abs(targetPrice - entryPrice) / pipSize;
  const ratio = risk > 0 ? reward / risk : 0;
  const w = winRatePercent / 100;

  return {
    rewardToRiskRatio: round2(ratio),
    riskPips: round2(risk),
    rewardPips: round2(reward),
    breakEvenWinRatePercent: ratio > 0 ? round2((1 / (1 + ratio)) * 100) : 0,
    expectancyInR: round2(w * ratio - (1 - w)),
  };
};

// --- 11. Forex Stop Loss (stop for a fixed lot size) -----------------------
export const forexStopLossCalculator: CustomCalculator = (values) => {
  const accountBalance = Math.max(0, safeNumber(values.accountBalance, 10000));
  const riskPercent = Math.min(100, Math.max(0, safeNumber(values.riskPercent, 2)));
  const lots = Math.max(0.0001, safeNumber(values.lots, 0.5));
  const entryPrice = rate(values.entryPrice, 1.085);
  const direction = dir(values.direction);
  const pipSize = pip(values.pipSize);
  const pipValuePerLot = Math.max(0.0001, safeNumber(values.pipValuePerLot, 10));

  const risk = (accountBalance * riskPercent) / 100;
  const pips = risk / (pipValuePerLot * lots);

  return {
    stopLossPrice: roundTo(entryPrice - direction * pips * pipSize, 6),
    stopDistancePips: round2(pips),
    moneyAtRisk: round2(risk),
  };
};

// --- 12. Forex Take Profit (target from reward:risk) ---------------------
export const forexTakeProfitCalculator: CustomCalculator = (values) => {
  const entryPrice = rate(values.entryPrice, 1.085);
  const direction = dir(values.direction);
  const stopPips = Math.max(0, safeNumber(values.stopPips, 40));
  const rewardRiskRatio = Math.max(0, safeNumber(values.rewardRiskRatio, 2));
  const lots = Math.max(0, safeNumber(values.lots, 0.5));
  const pipSize = pip(values.pipSize);
  const pipValuePerLot = Math.max(0, safeNumber(values.pipValuePerLot, 10));

  const tpPips = stopPips * rewardRiskRatio;

  return {
    takeProfitPrice: roundTo(entryPrice + direction * tpPips * pipSize, 6),
    takeProfitPips: round2(tpPips),
    profitAtTarget: round2(tpPips * pipValuePerLot * lots),
    lossAtStop: round2(stopPips * pipValuePerLot * lots),
    stopLossPrice: roundTo(entryPrice - direction * stopPips * pipSize, 6),
  };
};

export const currencyForexTradeCustomCalculators: Record<string, CustomCalculator> = {
  "forex-calculator": forexCalculator,
  "forex-profit-calculator": forexProfitCalculator,
  "forex-loss-calculator": forexLossCalculator,
  "forex-pip-calculator": forexPipCalculator,
  "pip-value-calculator": pipValueCalculator,
  "forex-lot-size-calculator": forexLotSizeCalculator,
  "forex-margin-calculator": forexMarginCalculator,
  "forex-leverage-calculator": forexLeverageCalculator,
  "forex-risk-calculator": forexRiskCalculator,
  "forex-risk-reward-calculator": forexRiskRewardCalculator,
  "forex-stop-loss-calculator": forexStopLossCalculator,
  "forex-take-profit-calculator": forexTakeProfitCalculator,
};
