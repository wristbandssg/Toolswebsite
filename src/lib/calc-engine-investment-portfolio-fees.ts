/**
 * Batch: "Investment Calculators" sub-batch D (Portfolio Construction,
 * Fees & Inflation, 12 tools). Part of the Investment Calculators tool-list
 * build-out — see calc-engine-investment-returns.ts for the full batch
 * context, the 6 skipped duplicates, and the other 3 sub-batches.
 *
 * Deliberate differentiation across the three near-namesake clusters here:
 *  - Portfolio: portfolioAllocationCalculator (age-rule stock/bond split),
 *    portfolioRebalancingCalculator (buy/sell trades to get back to
 *    target), weightedPortfolioReturnCalculator (PAST returns weighted by
 *    %), portfolioExpectedReturnCalculator (FORWARD expected returns
 *    weighted by the dollar amount in each holding),
 *    portfolioStandardDeviationCalculator (3-asset risk with correlations),
 *    sharpeRatioCalculator (Sharpe only, with per-period -> annual
 *    scaling; M-squared/Sortino/Treynor live in the returns batch's
 *    Risk-Adjusted Return tool).
 *  - Fees: investmentFeeCalculator (one year's all-in dollar cost by fee
 *    type), expenseRatioCalculator (two funds' expense ratios compared on
 *    a lump sum), investmentFeeImpactCalculator (long-term drag of an
 *    all-in fee % on a portfolio with monthly contributions).
 *  - Inflation: inflationAdjustedReturnCalculator (rate -> rate, exact
 *    Fisher vs the "subtract inflation" shortcut), realRateOfReturnCalculator
 *    (rate after fees, then tax, then inflation), nominalVsRealReturnCalculator
 *    (DOLLAR amounts over years, nominal vs purchasing power).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-investment-portfolio-fees-calculators.ts for the tool
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

// --- 1. Portfolio Allocation Calculator (age rule) ---------------------------
export const portfolioAllocationCalculator: CustomCalculator = (values) => {
  const portfolioValue = Math.max(0, safeNumber(values.portfolioValue, 100000));
  const age = Math.max(0, safeNumber(values.age, 35));
  const ruleNumber = safeNumber(values.ruleNumber, 110);
  const cashReservePercent = Math.min(100, Math.max(0, safeNumber(values.cashReservePercent, 0)));

  const cashAmount = portfolioValue * (cashReservePercent / 100);
  const investedAmount = portfolioValue - cashAmount;
  const stockShare = Math.min(100, Math.max(0, ruleNumber - age)) / 100;
  const stockAmount = investedAmount * stockShare;

  return {
    stockAmount: round2(stockAmount),
    bondAmount: round2(investedAmount - stockAmount),
    cashAmount: round2(cashAmount),
    stockPercentOfTotal: portfolioValue > 0 ? round2((stockAmount / portfolioValue) * 100) : 0,
  };
};

// --- 2. Portfolio Rebalancing Calculator (3 assets) --------------------------
// Positive trade = buy that amount, negative = sell. Targets are used as
// entered; targetTotalPercent is reported so a mis-typed set is visible.
export const portfolioRebalancingCalculator: CustomCalculator = (values) => {
  const current = [
    Math.max(0, safeNumber(values.assetACurrent, 0)),
    Math.max(0, safeNumber(values.assetBCurrent, 0)),
    Math.max(0, safeNumber(values.assetCCurrent, 0)),
  ];
  const targets = [
    Math.max(0, safeNumber(values.assetATargetPercent, 0)),
    Math.max(0, safeNumber(values.assetBTargetPercent, 0)),
    Math.max(0, safeNumber(values.assetCTargetPercent, 0)),
  ];
  const newCash = safeNumber(values.newCash, 0);

  const newTotalValue = Math.max(0, current[0] + current[1] + current[2] + newCash);
  const trade = (k: number) => round2((newTotalValue * targets[k]) / 100 - current[k]);

  return {
    tradeAssetA: trade(0),
    tradeAssetB: trade(1),
    tradeAssetC: trade(2),
    newTotalValue: round2(newTotalValue),
    targetTotalPercent: round2(targets[0] + targets[1] + targets[2]),
  };
};

// --- 3. Weighted Portfolio Return Calculator (past returns, % weights) -------
export const weightedPortfolioReturnCalculator: CustomCalculator = (values) => {
  const holdings = [1, 2, 3, 4, 5].map((k) => ({
    weight: Math.max(0, safeNumber(values[`asset${k}WeightPercent`], 0)),
    returnPercent: safeNumber(values[`asset${k}ReturnPercent`], 0),
  }));

  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0);
  const weightedSum = holdings.reduce((sum, h) => sum + h.weight * h.returnPercent, 0);

  return {
    weightedReturnPercent: totalWeight > 0 ? round2(weightedSum / totalWeight) : 0,
    totalWeightPercent: round2(totalWeight),
  };
};

// --- 4. Portfolio Expected Return Calculator ($ holdings, forward) ----------
export const portfolioExpectedReturnCalculator: CustomCalculator = (values) => {
  const holdings = [1, 2, 3, 4].map((k) => ({
    amount: Math.max(0, safeNumber(values[`holding${k}Amount`], 0)),
    expectedReturn: safeNumber(values[`holding${k}ExpectedReturn`], 0),
  }));

  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.amount, 0);
  const expectedAnnualGain = holdings.reduce((sum, h) => sum + (h.amount * h.expectedReturn) / 100, 0);

  return {
    expectedReturnPercent: totalPortfolioValue > 0 ? round2((expectedAnnualGain / totalPortfolioValue) * 100) : 0,
    expectedAnnualGain: round2(expectedAnnualGain),
    totalPortfolioValue: round2(totalPortfolioValue),
    expectedValueNextYear: round2(totalPortfolioValue + expectedAnnualGain),
  };
};

// --- 5. Portfolio Standard Deviation Calculator (3 assets) ------------------
export const portfolioStandardDeviationCalculator: CustomCalculator = (values) => {
  const rawWeights = [
    Math.max(0, safeNumber(values.asset1WeightPercent, 0)),
    Math.max(0, safeNumber(values.asset2WeightPercent, 0)),
    Math.max(0, safeNumber(values.asset3WeightPercent, 0)),
  ];
  const sd = [
    Math.max(0, safeNumber(values.asset1StdDev, 0)),
    Math.max(0, safeNumber(values.asset2StdDev, 0)),
    Math.max(0, safeNumber(values.asset3StdDev, 0)),
  ];
  const clampCorrelation = (c: number) => Math.min(1, Math.max(-1, safeNumber(c, 0)));
  const rho12 = clampCorrelation(values.correlation12);
  const rho13 = clampCorrelation(values.correlation13);
  const rho23 = clampCorrelation(values.correlation23);

  const weightTotal = rawWeights[0] + rawWeights[1] + rawWeights[2];
  if (weightTotal <= 0) {
    return { portfolioStdDevPercent: 0, weightedAverageStdDevPercent: 0, diversificationBenefitPercent: 0 };
  }
  const w = rawWeights.map((x) => x / weightTotal);

  const variance =
    w[0] * w[0] * sd[0] * sd[0] +
    w[1] * w[1] * sd[1] * sd[1] +
    w[2] * w[2] * sd[2] * sd[2] +
    2 * w[0] * w[1] * rho12 * sd[0] * sd[1] +
    2 * w[0] * w[2] * rho13 * sd[0] * sd[2] +
    2 * w[1] * w[2] * rho23 * sd[1] * sd[2];
  const portfolioStdDev = Math.sqrt(Math.max(0, variance));
  const weightedAverageStdDev = w[0] * sd[0] + w[1] * sd[1] + w[2] * sd[2];

  return {
    portfolioStdDevPercent: round2(portfolioStdDev),
    weightedAverageStdDevPercent: round2(weightedAverageStdDev),
    diversificationBenefitPercent: round2(weightedAverageStdDev - portfolioStdDev),
  };
};

// --- 6. Sharpe Ratio Calculator ----------------------------------------------
export const sharpeRatioCalculator: CustomCalculator = (values) => {
  const portfolioReturn = safeNumber(values.portfolioReturn, 10);
  const riskFreeRate = safeNumber(values.riskFreeRate, 4);
  const standardDeviation = Math.max(0.0001, safeNumber(values.standardDeviation, 14));
  const periodsPerYear = Math.max(1, safeNumber(values.periodsPerYear, 1));

  const excessReturn = portfolioReturn - riskFreeRate;
  const sharpe = excessReturn / standardDeviation;

  return {
    annualizedSharpeRatio: round4(sharpe * Math.sqrt(periodsPerYear)),
    sharpeRatio: round4(sharpe),
    excessReturnPercent: round2(excessReturn),
  };
};

// --- 7. Investment Fee Calculator (one year, all fee types) ------------------
export const investmentFeeCalculator: CustomCalculator = (values) => {
  const portfolioValue = Math.max(0, safeNumber(values.portfolioValue, 250000));
  const advisoryFeePercent = Math.max(0, safeNumber(values.advisoryFeePercent, 0));
  const expenseRatioPercent = Math.max(0, safeNumber(values.expenseRatioPercent, 0));
  const tradesPerYear = Math.max(0, safeNumber(values.tradesPerYear, 0));
  const commissionPerTrade = Math.max(0, safeNumber(values.commissionPerTrade, 0));
  const annualAccountFee = Math.max(0, safeNumber(values.annualAccountFee, 0));

  const advisoryFeeAmount = (portfolioValue * advisoryFeePercent) / 100;
  const fundExpenseAmount = (portfolioValue * expenseRatioPercent) / 100;
  const tradingAndAccountFees = tradesPerYear * commissionPerTrade + annualAccountFee;
  const totalAnnualFees = advisoryFeeAmount + fundExpenseAmount + tradingAndAccountFees;

  return {
    totalAnnualFees: round2(totalAnnualFees),
    advisoryFeeAmount: round2(advisoryFeeAmount),
    fundExpenseAmount: round2(fundExpenseAmount),
    tradingAndAccountFees: round2(tradingAndAccountFees),
    allInCostPercent: portfolioValue > 0 ? round2((totalAnnualFees / portfolioValue) * 100) : 0,
  };
};

// --- 8. Expense Ratio Calculator (Fund A vs Fund B) -------------------------
// Each year: the balance earns the return, then the expense ratio is taken
// as a % of the grown balance.
function growWithExpenseRatio(amount: number, returnPercent: number, expenseRatioPercent: number, years: number) {
  let balance = amount;
  let totalFees = 0;
  for (let y = 0; y < years; y++) {
    balance *= 1 + returnPercent / 100;
    const fee = (balance * expenseRatioPercent) / 100;
    totalFees += fee;
    balance -= fee;
  }
  return { balance, totalFees };
}

export const expenseRatioCalculator: CustomCalculator = (values) => {
  const investmentAmount = Math.max(0, safeNumber(values.investmentAmount, 50000));
  const fundAExpenseRatio = Math.max(0, safeNumber(values.fundAExpenseRatio, 0.75));
  const fundBExpenseRatio = Math.max(0, safeNumber(values.fundBExpenseRatio, 0.05));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const years = Math.min(60, Math.max(0, Math.round(safeNumber(values.years, 20))));

  const a = growWithExpenseRatio(investmentAmount, annualReturnPercent, fundAExpenseRatio, years);
  const b = growWithExpenseRatio(investmentAmount, annualReturnPercent, fundBExpenseRatio, years);

  return {
    endingValueA: round2(a.balance),
    endingValueB: round2(b.balance),
    totalFeesA: round2(a.totalFees),
    totalFeesB: round2(b.totalFees),
    difference: round2(b.balance - a.balance),
  };
};

// --- 9. Investment Fee Impact Calculator (long-term drag) --------------------
export const investmentFeeImpactCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 50000));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution, 0));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const annualFeePercent = Math.max(0, safeNumber(values.annualFeePercent, 1));
  const years = Math.min(60, Math.max(0, Math.round(safeNumber(values.years, 30))));

  const monthlyReturn = annualReturnPercent / 100 / 12;
  const monthlyFee = annualFeePercent / 100 / 12;
  let withoutFees = initialInvestment;
  let withFees = initialInvestment;
  for (let m = 0; m < years * 12; m++) {
    withoutFees = withoutFees * (1 + monthlyReturn) + monthlyContribution;
    withFees = withFees * (1 + monthlyReturn) * (1 - monthlyFee) + monthlyContribution;
  }
  const totalCostOfFees = withoutFees - withFees;

  return {
    endingWithoutFees: round2(withoutFees),
    endingWithFees: round2(withFees),
    totalCostOfFees: round2(totalCostOfFees),
    percentOfBalanceLost: withoutFees > 0 ? round2((totalCostOfFees / withoutFees) * 100) : 0,
  };
};

// --- 10. Inflation-Adjusted Return Calculator (Fisher, rate -> rate) --------
export const inflationAdjustedReturnCalculator: CustomCalculator = (values) => {
  const nominalReturn = safeNumber(values.nominalReturn, 8);
  const inflationRate = Math.max(-99, safeNumber(values.inflationRate, 3));

  const realReturn = ((1 + nominalReturn / 100) / (1 + inflationRate / 100) - 1) * 100;
  const approximateRealReturn = nominalReturn - inflationRate;

  return {
    realReturnPercent: round4(realReturn),
    approximateRealReturnPercent: round4(approximateRealReturn),
    approximationErrorPercent: round4(approximateRealReturn - realReturn),
  };
};

// --- 11. Real Rate of Return Calculator (fees -> tax -> inflation) ----------
export const realRateOfReturnCalculator: CustomCalculator = (values) => {
  const nominalReturn = safeNumber(values.nominalReturn, 8);
  const annualFees = Math.max(0, safeNumber(values.annualFees, 0));
  const taxRate = Math.min(100, Math.max(0, safeNumber(values.taxRate, 0)));
  const inflationRate = Math.max(-99, safeNumber(values.inflationRate, 3));

  const afterFeeReturn = nominalReturn - annualFees;
  // Tax only applies to a positive return; a loss isn't taxed here.
  const afterTaxReturn = afterFeeReturn > 0 ? afterFeeReturn * (1 - taxRate / 100) : afterFeeReturn;
  const realAfterTaxReturn = ((1 + afterTaxReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  return {
    realAfterTaxReturnPercent: round2(realAfterTaxReturn),
    afterFeeReturnPercent: round2(afterFeeReturn),
    afterTaxReturnPercent: round2(afterTaxReturn),
    returnLostPercent: round2(nominalReturn - realAfterTaxReturn),
  };
};

// --- 12. Nominal vs Real Return Calculator (dollar amounts) -----------------
export const nominalVsRealReturnCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 10000));
  const nominalReturn = safeNumber(values.nominalReturn, 7);
  const inflationRate = Math.max(-99, safeNumber(values.inflationRate, 3));
  const years = Math.max(0, safeNumber(values.years, 25));

  const nominalEndingValue = initialInvestment * Math.pow(1 + nominalReturn / 100, years);
  const realEndingValue = nominalEndingValue / Math.pow(1 + inflationRate / 100, years);

  return {
    realEndingValue: round2(realEndingValue),
    nominalEndingValue: round2(nominalEndingValue),
    inflationGap: round2(nominalEndingValue - realEndingValue),
    realAnnualReturnPercent: round2(((1 + nominalReturn / 100) / (1 + inflationRate / 100) - 1) * 100),
  };
};

export const investmentPortfolioFeesCustomCalculators: Record<string, CustomCalculator> = {
  "portfolio-allocation-calculator": portfolioAllocationCalculator,
  "portfolio-rebalancing-calculator": portfolioRebalancingCalculator,
  "weighted-portfolio-return-calculator": weightedPortfolioReturnCalculator,
  "portfolio-expected-return-calculator": portfolioExpectedReturnCalculator,
  "portfolio-standard-deviation-calculator": portfolioStandardDeviationCalculator,
  "sharpe-ratio-calculator": sharpeRatioCalculator,
  "investment-fee-calculator": investmentFeeCalculator,
  "expense-ratio-calculator": expenseRatioCalculator,
  "investment-fee-impact-calculator": investmentFeeImpactCalculator,
  "inflation-adjusted-return-calculator": inflationAdjustedReturnCalculator,
  "real-rate-of-return-calculator": realRateOfReturnCalculator,
  "nominal-vs-real-return-calculator": nominalVsRealReturnCalculator,
};
