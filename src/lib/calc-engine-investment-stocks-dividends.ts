/**
 * Batch: "Investment Calculators" sub-batch C (Stocks, Dividends &
 * Portfolio Growth, 9 tools). Part of the Investment Calculators tool-list
 * build-out — see calc-engine-investment-returns.ts for the full batch
 * context, the 6 skipped duplicates, and the other 3 sub-batches.
 *
 * Deliberate differentiation from existing tools and from each other:
 *  - stockLossCalculator vs the existing stock-profit-calculator: this one
 *    is built around an UNREALIZED loss at today's price and headlines the
 *    % gain needed to get back to even (always larger than the % lost).
 *  - stockAveragePriceCalculator: plain weighted-average price across up to
 *    4 buys, plus the unrealized gain/loss at today's price.
 *  - stockCostBasisCalculator: fee-inclusive per-lot basis and a lot
 *    selection method (FIFO / LIFO / average cost) for a PARTIAL sale —
 *    no tax is calculated, which is what separates it from the Tax
 *    category's capital-gains-cost-basis-calculator.
 *  - stockBreakEvenCalculator: the sell price that covers both commissions
 *    and a % selling fee, plus the sell price for a target profit.
 *  - stockInvestmentCalculator: how many shares a dollar budget buys (whole
 *    or fractional) and what that position is worth at a target price.
 *  - dividendYieldCalculator vs the existing dividend-calculator: built
 *    from a per-payment amount and frequency, and adds yield on cost.
 *  - dividendReinvestmentCalculator: DRIP simulation vs taking dividends as
 *    cash.
 *  - dividendGrowthCalculator: a growing dividend (no reinvestment) — the
 *    income in year N, cumulative income and future yield on cost.
 *  - portfolioGrowthCalculator: three asset classes each growing at its own
 *    rate with no rebalancing, so the allocation drift is visible.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-investment-stocks-dividends-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// --- 1. Stock Loss Calculator ------------------------------------------------
export const stockLossCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0, safeNumber(values.shares, 200));
  const buyPrice = Math.max(0, safeNumber(values.buyPrice, 45));
  const currentPrice = Math.max(0.01, safeNumber(values.currentPrice, 36));
  const buyCommission = Math.max(0, safeNumber(values.buyCommission, 0));
  const sellCommission = Math.max(0, safeNumber(values.sellCommission, 0));

  const totalCost = shares * buyPrice + buyCommission;
  const netProceeds = shares * currentPrice - sellCommission;
  const loss = totalCost - netProceeds;
  // Price needed so that selling (after the sell commission) returns the
  // full original cost, expressed as a % rise from today's price.
  const recoveryPrice = shares > 0 ? (totalCost + sellCommission) / shares : 0;

  return {
    loss: round2(loss),
    lossPercent: totalCost > 0 ? round2((loss / totalCost) * 100) : 0,
    currentValue: round2(shares * currentPrice),
    gainNeededToRecoverPercent: shares > 0 ? round2((recoveryPrice / currentPrice - 1) * 100) : 0,
  };
};

// --- 2. Stock Average Price Calculator ---------------------------------------
export const stockAveragePriceCalculator: CustomCalculator = (values) => {
  const purchases: [number, number][] = [
    [values.purchase1Shares, values.purchase1Price],
    [values.purchase2Shares, values.purchase2Price],
    [values.purchase3Shares, values.purchase3Price],
    [values.purchase4Shares, values.purchase4Price],
  ].map(([s, p]) => [Math.max(0, safeNumber(s, 0)), Math.max(0, safeNumber(p, 0))]);
  const currentPrice = Math.max(0, safeNumber(values.currentPrice, 0));

  const totalShares = purchases.reduce((sum, [s]) => sum + s, 0);
  const totalCost = purchases.reduce((sum, [s, p]) => sum + s * p, 0);
  const averagePrice = totalShares > 0 ? totalCost / totalShares : 0;

  return {
    averagePrice: round2(averagePrice),
    totalShares: round4(totalShares),
    totalCost: round2(totalCost),
    unrealizedGainLoss: currentPrice > 0 ? round2(totalShares * currentPrice - totalCost) : 0,
  };
};

// --- 3. Stock Cost Basis Calculator (FIFO / LIFO / average) -----------------
export const stockCostBasisCalculator: CustomCalculator = (values) => {
  const lots = [
    { shares: values.lot1Shares, price: values.lot1Price, fees: values.lot1Fees },
    { shares: values.lot2Shares, price: values.lot2Price, fees: values.lot2Fees },
    { shares: values.lot3Shares, price: values.lot3Price, fees: values.lot3Fees },
  ]
    .map((lot) => ({
      shares: Math.max(0, safeNumber(lot.shares, 0)),
      cost: Math.max(0, safeNumber(lot.shares, 0)) * Math.max(0, safeNumber(lot.price, 0)) + Math.max(0, safeNumber(lot.fees, 0)),
    }))
    .filter((lot) => lot.shares > 0);

  const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);
  const totalCost = lots.reduce((sum, lot) => sum + lot.cost, 0);
  const sharesSold = Math.min(totalShares, Math.max(0, safeNumber(values.sharesSold, 0)));
  const salePrice = Math.max(0, safeNumber(values.salePrice, 0));
  const saleFees = Math.max(0, safeNumber(values.saleFees, 0));
  const method = safeNumber(values.method, 1); // 1 = FIFO, 2 = LIFO, 3 = average cost

  let costBasisOfSharesSold = 0;
  if (method === 3) {
    costBasisOfSharesSold = totalShares > 0 ? (sharesSold * totalCost) / totalShares : 0;
  } else {
    const ordered = method === 2 ? [...lots].reverse() : lots;
    let remaining = sharesSold;
    for (const lot of ordered) {
      if (remaining <= 0) break;
      const taken = Math.min(remaining, lot.shares);
      costBasisOfSharesSold += (taken / lot.shares) * lot.cost;
      remaining -= taken;
    }
  }

  const netProceeds = sharesSold > 0 ? sharesSold * salePrice - saleFees : 0;

  return {
    costBasisOfSharesSold: round2(costBasisOfSharesSold),
    realizedGainLoss: round2(netProceeds - costBasisOfSharesSold),
    remainingShares: round4(totalShares - sharesSold),
    remainingCostBasis: round2(totalCost - costBasisOfSharesSold),
  };
};

// --- 4. Stock Break-Even Calculator ------------------------------------------
export const stockBreakEvenCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0.0001, safeNumber(values.shares, 100));
  const buyPrice = Math.max(0, safeNumber(values.buyPrice, 25));
  const buyCommission = Math.max(0, safeNumber(values.buyCommission, 0));
  const sellCommission = Math.max(0, safeNumber(values.sellCommission, 0));
  const sellFeePercent = Math.min(50, Math.max(0, safeNumber(values.sellFeePercent, 0)));
  const targetProfitPercent = safeNumber(values.targetProfitPercent, 10);

  const totalCost = shares * buyPrice + buyCommission;
  const keepFraction = 1 - sellFeePercent / 100;
  // Solve shares x P x (1 - fee%) - sellCommission = required proceeds.
  const priceFor = (requiredProceeds: number) => (requiredProceeds + sellCommission) / (shares * keepFraction);
  const breakEvenPrice = priceFor(totalCost);

  return {
    breakEvenPrice: round4(breakEvenPrice),
    priceIncreaseNeededPercent: buyPrice > 0 ? round2((breakEvenPrice / buyPrice - 1) * 100) : 0,
    targetPrice: round4(priceFor(totalCost * (1 + targetProfitPercent / 100))),
  };
};

// --- 5. Stock Investment Calculator ------------------------------------------
export const stockInvestmentCalculator: CustomCalculator = (values) => {
  const investmentAmount = Math.max(0, safeNumber(values.investmentAmount, 5000));
  const sharePrice = Math.max(0.01, safeNumber(values.sharePrice, 137.5));
  const commission = Math.max(0, safeNumber(values.commission, 0));
  const allowFractional = safeNumber(values.allowFractional, 0) === 1;
  const targetPrice = Math.max(0, safeNumber(values.targetPrice, 0));

  const spendable = Math.max(0, investmentAmount - commission);
  const rawShares = spendable / sharePrice;
  const sharesPurchased = allowFractional ? Math.floor(rawShares * 10000) / 10000 : Math.floor(rawShares);
  const totalCost = sharesPurchased > 0 ? sharesPurchased * sharePrice + commission : 0;
  const valueAtTargetPrice = sharesPurchased * targetPrice;

  return {
    sharesPurchased: round4(sharesPurchased),
    totalCost: round2(totalCost),
    leftoverCash: round2(investmentAmount - totalCost),
    valueAtTargetPrice: round2(valueAtTargetPrice),
    profitAtTargetPrice: round2(valueAtTargetPrice - totalCost),
  };
};

// --- 6. Dividend Yield Calculator (current yield + yield on cost) -----------
export const dividendYieldCalculator: CustomCalculator = (values) => {
  const dividendPerPayment = Math.max(0, safeNumber(values.dividendPerPayment, 0.62));
  const paymentsPerYear = Math.max(1, safeNumber(values.paymentsPerYear, 4));
  const currentPrice = Math.max(0, safeNumber(values.currentPrice, 85));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 0));

  const annualDividendPerShare = dividendPerPayment * paymentsPerYear;

  return {
    currentYieldPercent: currentPrice > 0 ? round2((annualDividendPerShare / currentPrice) * 100) : 0,
    yieldOnCostPercent: purchasePrice > 0 ? round2((annualDividendPerShare / purchasePrice) * 100) : 0,
    annualDividendPerShare: round4(annualDividendPerShare),
  };
};

// --- 7. Dividend Reinvestment (DRIP) Calculator ------------------------------
// Each payment period: the price grows by the per-period equivalent of the
// annual price growth, then a dividend of (yield / payments per year) x
// price is paid per share. With DRIP it buys more shares at that price;
// without DRIP it's collected as cash (not reinvested, no interest).
export const dividendReinvestmentCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 10000));
  const sharePrice = Math.max(0.01, safeNumber(values.sharePrice, 50));
  const dividendYieldPercent = Math.max(0, safeNumber(values.dividendYieldPercent, 3.5));
  const paymentsPerYear = Math.max(1, safeNumber(values.paymentsPerYear, 4));
  const annualPriceGrowthPercent = safeNumber(values.annualPriceGrowthPercent, 5);
  const years = Math.min(60, Math.max(0, Math.round(safeNumber(values.years, 20))));

  const periodGrowth = Math.pow(1 + annualPriceGrowthPercent / 100, 1 / paymentsPerYear);
  const periodYield = dividendYieldPercent / 100 / paymentsPerYear;

  let price = sharePrice;
  let dripShares = initialInvestment / sharePrice;
  const cashShares = initialInvestment / sharePrice;
  let cashDividends = 0;

  for (let k = 0; k < paymentsPerYear * years; k++) {
    price *= periodGrowth;
    dripShares += (dripShares * price * periodYield) / price;
    cashDividends += cashShares * price * periodYield;
  }

  const endingValueWithDrip = dripShares * price;
  const endingValueWithoutDrip = cashShares * price + cashDividends;

  return {
    endingValueWithDrip: round2(endingValueWithDrip),
    endingValueWithoutDrip: round2(endingValueWithoutDrip),
    dripAdvantage: round2(endingValueWithDrip - endingValueWithoutDrip),
    endingShares: round4(dripShares),
  };
};

// --- 8. Dividend Growth Calculator -------------------------------------------
export const dividendGrowthCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0, safeNumber(values.shares, 500));
  const currentAnnualDividend = Math.max(0, safeNumber(values.currentAnnualDividend, 2));
  const dividendGrowthPercent = safeNumber(values.dividendGrowthPercent, 6);
  const years = Math.max(1, Math.round(safeNumber(values.years, 10)));
  const purchasePrice = Math.max(0, safeNumber(values.purchasePrice, 0));

  const g = dividendGrowthPercent / 100;
  const dividendInYearN = currentAnnualDividend * Math.pow(1 + g, years);
  // Sum of D(1+g)^t for t = 1..N.
  const cumulativePerShare =
    g === 0 ? currentAnnualDividend * years : (currentAnnualDividend * (1 + g) * (Math.pow(1 + g, years) - 1)) / g;

  return {
    annualIncomeInYearN: round2(shares * dividendInYearN),
    dividendPerShareInYearN: round4(dividendInYearN),
    cumulativeDividendIncome: round2(shares * cumulativePerShare),
    yieldOnCostInYearNPercent: purchasePrice > 0 ? round2((dividendInYearN / purchasePrice) * 100) : 0,
  };
};

// --- 9. Portfolio Growth Calculator (3 asset classes, no rebalancing) -------
export const portfolioGrowthCalculator: CustomCalculator = (values) => {
  const stocksValue = Math.max(0, safeNumber(values.stocksValue, 60000));
  const stocksReturn = safeNumber(values.stocksReturn, 8);
  const bondsValue = Math.max(0, safeNumber(values.bondsValue, 30000));
  const bondsReturn = safeNumber(values.bondsReturn, 4);
  const cashValue = Math.max(0, safeNumber(values.cashValue, 10000));
  const cashReturn = safeNumber(values.cashReturn, 2);
  const years = Math.max(0, safeNumber(values.years, 15));

  const endingStocks = stocksValue * Math.pow(1 + stocksReturn / 100, years);
  const endingBonds = bondsValue * Math.pow(1 + bondsReturn / 100, years);
  const endingCash = cashValue * Math.pow(1 + cashReturn / 100, years);
  const startingTotal = stocksValue + bondsValue + cashValue;
  const endingTotal = endingStocks + endingBonds + endingCash;

  return {
    endingTotal: round2(endingTotal),
    endingStocks: round2(endingStocks),
    endingBonds: round2(endingBonds),
    endingCash: round2(endingCash),
    blendedAnnualReturnPercent:
      startingTotal > 0 && years > 0 ? round2((Math.pow(endingTotal / startingTotal, 1 / years) - 1) * 100) : 0,
    endingStockAllocationPercent: endingTotal > 0 ? round2((endingStocks / endingTotal) * 100) : 0,
  };
};

export const investmentStocksDividendsCustomCalculators: Record<string, CustomCalculator> = {
  "stock-loss-calculator": stockLossCalculator,
  "stock-average-price-calculator": stockAveragePriceCalculator,
  "stock-cost-basis-calculator": stockCostBasisCalculator,
  "stock-break-even-calculator": stockBreakEvenCalculator,
  "stock-investment-calculator": stockInvestmentCalculator,
  "dividend-yield-calculator": dividendYieldCalculator,
  "dividend-reinvestment-calculator": dividendReinvestmentCalculator,
  "dividend-growth-calculator": dividendGrowthCalculator,
  "portfolio-growth-calculator": portfolioGrowthCalculator,
};
