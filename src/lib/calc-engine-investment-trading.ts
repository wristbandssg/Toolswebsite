/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 2 of 9 —
 * Trading (5 tools), filed under Investment Calculators > Stock & Options
 * Calculators. See calc-engine-investment-stocks.ts for the full batch
 * context.
 *
 *  - optionsTrading (incl. warrants): long/short call or put at expiration
 *    — profit, breakeven, max loss, return on premium.
 *  - coveredCall: premium income, return if not called and if called,
 *    annualized, downside breakeven.
 *  - futuresTrading (incl. commodities): profit per point x contract size,
 *    notional, return on margin, leverage.
 *  - marginAccount: loan, interest, margin call price at the maintenance
 *    requirement, return with and without margin.
 *  - shortSelling: profit after borrow fee and dividends owed, return on
 *    the margin posted, price that wipes out the margin.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-trading-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Options Trading Calculator -----------------------------------------------------
export const optionsTradingCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.strategy, 1));
  const strategy = [1, 2, 3, 4].includes(raw) ? raw : 1;
  const strike = Math.max(0, safeNumber(values.strike, 100));
  const premium = Math.max(0, safeNumber(values.premium, 4));
  const contracts = Math.max(0, Math.round(safeNumber(values.contracts, 2)));
  const sharesPerContract = Math.max(1, Math.round(safeNumber(values.sharesPerContract, 100)));
  const priceAtExpiration = Math.max(0, safeNumber(values.priceAtExpiration, 110));

  const isCall = strategy === 1 || strategy === 3;
  const isLong = strategy === 1 || strategy === 2;
  const intrinsic = isCall ? Math.max(0, priceAtExpiration - strike) : Math.max(0, strike - priceAtExpiration);
  const perShare = isLong ? intrinsic - premium : premium - intrinsic;
  const qty = contracts * sharesPerContract;
  const premiumTotal = premium * qty;
  const breakeven = isCall ? strike + premium : strike - premium;
  // max loss: long = premium; short put = strike - premium; short call = unlimited (shown as 0)
  const maxLoss = isLong ? premiumTotal : isCall ? 0 : (strike - premium) * qty;

  return {
    premiumPaidOrReceived: round2(premiumTotal),
    breakevenPrice: round2(breakeven),
    profitOrLoss: round2(perShare * qty),
    returnOnPremium: round2(premiumTotal > 0 ? ((perShare * qty) / premiumTotal) * 100 : 0),
    maxLoss: round2(maxLoss),
  };
};

// --- 2. Covered Call Options Calculator ------------------------------------------------
export const coveredCallCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0, Math.round(safeNumber(values.shares, 100)));
  const stockPrice = Math.max(0.01, safeNumber(values.stockPrice, 50));
  const strike = Math.max(0, safeNumber(values.strike, 55));
  const premium = Math.max(0, safeNumber(values.premium, 1));
  const days = Math.max(1, safeNumber(values.days, 30));

  const income = premium * shares;
  const staticReturn = premium / stockPrice;
  const calledReturn = (premium + strike - stockPrice) / stockPrice;

  return {
    premiumIncome: round2(income),
    returnIfNotCalled: round2(staticReturn * 100),
    returnIfCalled: round2(calledReturn * 100),
    annualizedIfNotCalled: round2(staticReturn * (365 / days) * 100),
    annualizedIfCalled: round2(calledReturn * (365 / days) * 100),
    downsideBreakeven: round2(stockPrice - premium),
  };
};

// --- 3. Futures Trading Calculator -----------------------------------------------------
export const futuresTradingCalculator: CustomCalculator = (values) => {
  const raw = Math.round(safeNumber(values.side, 1));
  const long = raw !== 2;
  const contracts = Math.max(0, Math.round(safeNumber(values.contracts, 2)));
  const contractSize = Math.max(0, safeNumber(values.contractSize, 1000));
  const entryPrice = Math.max(0, safeNumber(values.entryPrice, 75));
  const exitPrice = Math.max(0, safeNumber(values.exitPrice, 78));
  const marginPerContract = Math.max(0, safeNumber(values.marginPerContract, 6000));
  const commissionPerContract = Math.max(0, safeNumber(values.commissionPerContract, 5));

  const move = (long ? exitPrice - entryPrice : entryPrice - exitPrice) * contractSize * contracts;
  const commissions = commissionPerContract * contracts * 2;
  const margin = marginPerContract * contracts;
  const notional = entryPrice * contractSize * contracts;

  return {
    notionalValue: round2(notional),
    marginRequired: round2(margin),
    leverage: round2(margin > 0 ? notional / margin : 0),
    profitOrLoss: round2(move - commissions),
    returnOnMargin: round2(margin > 0 ? ((move - commissions) / margin) * 100 : 0),
    valuePerOnePointMove: round2(contractSize * contracts),
  };
};

// --- 4. Margin Account Calculator ------------------------------------------------------
export const marginAccountCalculator: CustomCalculator = (values) => {
  const purchaseAmount = Math.max(0, safeNumber(values.purchaseAmount, 20000));
  const ownCash = Math.max(0, safeNumber(values.ownCash, 10000));
  const buyPrice = Math.max(0.01, safeNumber(values.buyPrice, 50));
  const sellPrice = Math.max(0, safeNumber(values.sellPrice, 60));
  const marginRatePercent = Math.max(0, safeNumber(values.marginRatePercent, 11));
  const months = Math.max(0, safeNumber(values.months, 6));
  const maintenancePercent = Math.min(99, Math.max(0, safeNumber(values.maintenancePercent, 25)));

  const loan = Math.max(0, purchaseAmount - ownCash);
  const shares = purchaseAmount / buyPrice;
  const interest = (loan * marginRatePercent * months) / 100 / 12;
  const profit = shares * sellPrice - purchaseAmount - interest;
  const callPrice = shares > 0 ? loan / (shares * (1 - maintenancePercent / 100)) : 0;
  const equity = Math.min(ownCash, purchaseAmount);

  return {
    marginLoan: round2(loan),
    sharesBought: round2(shares),
    marginInterest: round2(interest),
    marginCallPrice: round2(callPrice),
    profitWithMargin: round2(profit),
    returnWithMargin: round2(equity > 0 ? (profit / equity) * 100 : 0),
    returnWithoutMargin: round2(((sellPrice - buyPrice) / buyPrice) * 100),
  };
};

// --- 5. Short Selling Investment Calculator --------------------------------------------
export const shortSellingCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0, Math.round(safeNumber(values.shares, 100)));
  const shortPrice = Math.max(0, safeNumber(values.shortPrice, 50));
  const coverPrice = Math.max(0, safeNumber(values.coverPrice, 40));
  const borrowFeePercent = Math.max(0, safeNumber(values.borrowFeePercent, 3));
  const days = Math.max(0, safeNumber(values.days, 60));
  const dividendsPerShare = Math.max(0, safeNumber(values.dividendsPerShare, 0.5));
  const marginPercent = Math.max(0, safeNumber(values.marginPercent, 50));

  const proceeds = shares * shortPrice;
  const borrowFee = (proceeds * borrowFeePercent * days) / 100 / 365;
  const dividends = dividendsPerShare * shares;
  const profit = proceeds - shares * coverPrice - borrowFee - dividends;
  const margin = (proceeds * marginPercent) / 100;

  return {
    shortProceeds: round2(proceeds),
    borrowFee: round2(borrowFee),
    dividendsOwed: round2(dividends),
    profitOrLoss: round2(profit),
    returnOnMargin: round2(margin > 0 ? (profit / margin) * 100 : 0),
    priceThatWipesOutMargin: round2(shares > 0 ? shortPrice + margin / shares : 0),
  };
};

export const investmentTradingCustomCalculators: Record<string, CustomCalculator> = {
  "options-trading-calculator": optionsTradingCalculator,
  "covered-call-options-calculator": coveredCallCalculator,
  "futures-trading-calculator": futuresTradingCalculator,
  "margin-account-calculator": marginAccountCalculator,
  "short-selling-investment-calculator": shortSellingCalculator,
};
