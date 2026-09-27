/**
 * Batch: "Investment Calculators" sub-batch A (Returns & Required Return,
 * 11 tools). Part of the Investment Calculators tool-list build-out — 48
 * tools in the source list, 6 skipped as exact-slug duplicates of tools
 * that already exist (investment-calculator, cagr-calculator,
 * dollar-cost-averaging-calculator, stock-profit-calculator and
 * dividend-calculator in calc-engine-finance-investment.ts, plus
 * roi-calculator in calc-engine-finance-business.ts), 42 built across 4
 * sub-batches:
 *  - calc-engine-investment-returns.ts (this file)
 *  - calc-engine-investment-planning.ts
 *  - calc-engine-investment-stocks-dividends.ts
 *  - calc-engine-investment-portfolio-fees.ts
 *
 * Deliberate differentiation across the "return" cluster (the highest
 * near-duplicate risk in this list):
 *  - investmentReturnCalculator: dollars in / dollars out + income, over
 *    whole years — net gain, simple %, annualized %. Unlike the existing
 *    business ROI tool it counts income received and annualizes.
 *  - stockReturnCalculator: share-based (shares x prices), separate buy/sell
 *    commissions, dividends per share, and a holding period in DAYS.
 *  - portfolioReturnCalculator: corrects for money added/withdrawn during
 *    the period (Modified Dietz, flows assumed mid-period).
 *  - annualizedReturnCalculator: years + months + days holding period, so
 *    it handles odd/partial periods the existing whole-years CAGR tool
 *    can't.
 *  - holdingPeriodReturnCalculator: LINKS several sub-period returns into
 *    one cumulative return (product of (1 + r)).
 *  - totalReturnCalculator: splits the result into price return vs income
 *    return.
 *  - averageAnnualReturnCalculator: arithmetic vs geometric average of a
 *    series of yearly returns, and the "volatility drag" gap between them.
 *  - expectedReturnCalculator: probability-weighted scenarios (forward
 *    looking), with the spread of outcomes.
 *  - requiredRateOfReturnCalculator: CAPM and dividend-discount methods.
 *  - riskAdjustedReturnCalculator: M-squared, Sortino and Treynor (the
 *    separate Sharpe Ratio tool in the portfolio-fees batch covers Sharpe
 *    and its annualization on its own).
 *  - breakEvenInvestmentReturnCalculator: the nominal return needed just to
 *    stand still after fees, tax and inflation.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-investment-returns-calculators.ts for the tool
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

// Annualizes a growth multiple (ending / beginning) over `years`. A total
// loss (multiple <= 0) annualizes to -100%.
function annualize(multiple: number, years: number): number {
  if (years <= 0) return 0;
  if (multiple <= 0) return -100;
  return (Math.pow(multiple, 1 / years) - 1) * 100;
}

// --- 1. Investment Return Calculator ----------------------------------------
export const investmentReturnCalculator: CustomCalculator = (values) => {
  const amountInvested = Math.max(0.01, safeNumber(values.amountInvested, 10000));
  const finalValue = Math.max(0, safeNumber(values.finalValue, 14500));
  const incomeReceived = Math.max(0, safeNumber(values.incomeReceived, 0));
  const yearsHeld = Math.max(0, safeNumber(values.yearsHeld, 4));

  const netGain = finalValue + incomeReceived - amountInvested;
  const totalReturnPercent = (netGain / amountInvested) * 100;
  const annualizedReturnPercent = annualize((finalValue + incomeReceived) / amountInvested, yearsHeld);

  return {
    netGain: round2(netGain),
    totalReturnPercent: round2(totalReturnPercent),
    annualizedReturnPercent: round2(annualizedReturnPercent),
  };
};

// --- 2. Stock Return Calculator (share-based, days held) --------------------
export const stockReturnCalculator: CustomCalculator = (values) => {
  const shares = Math.max(0, safeNumber(values.shares, 100));
  const buyPrice = Math.max(0, safeNumber(values.buyPrice, 50));
  const sellPrice = Math.max(0, safeNumber(values.sellPrice, 62));
  const dividendsPerShare = Math.max(0, safeNumber(values.dividendsPerShare, 0));
  const buyCommission = Math.max(0, safeNumber(values.buyCommission, 0));
  const sellCommission = Math.max(0, safeNumber(values.sellCommission, 0));
  const daysHeld = Math.max(1, safeNumber(values.daysHeld, 365));

  const totalCost = shares * buyPrice + buyCommission;
  const netProceeds = shares * sellPrice - sellCommission;
  const dividendIncome = shares * dividendsPerShare;
  const totalReturn = netProceeds + dividendIncome - totalCost;
  const totalReturnFraction = totalCost > 0 ? totalReturn / totalCost : 0;
  const annualizedReturnPercent = totalCost > 0 ? annualize(1 + totalReturnFraction, daysHeld / 365) : 0;

  return {
    totalCost: round2(totalCost),
    dividendIncome: round2(dividendIncome),
    totalReturn: round2(totalReturn),
    totalReturnPercent: round2(totalReturnFraction * 100),
    annualizedReturnPercent: round2(annualizedReturnPercent),
  };
};

// --- 3. Portfolio Return Calculator (Modified Dietz, mid-period flows) ------
export const portfolioReturnCalculator: CustomCalculator = (values) => {
  const startingValue = Math.max(0, safeNumber(values.startingValue, 50000));
  const contributions = Math.max(0, safeNumber(values.contributions, 0));
  const withdrawals = Math.max(0, safeNumber(values.withdrawals, 0));
  const endingValue = Math.max(0, safeNumber(values.endingValue, 55000));

  const netFlow = contributions - withdrawals;
  const investmentGain = endingValue - startingValue - netFlow;
  const averageCapital = startingValue + 0.5 * netFlow;
  const portfolioReturnPercent = averageCapital > 0 ? (investmentGain / averageCapital) * 100 : 0;
  const unadjustedChangePercent = startingValue > 0 ? ((endingValue - startingValue) / startingValue) * 100 : 0;

  return {
    investmentGain: round2(investmentGain),
    portfolioReturnPercent: round2(portfolioReturnPercent),
    unadjustedChangePercent: round2(unadjustedChangePercent),
  };
};

// --- 4. Annualized Return Calculator (years + months + days) ----------------
export const annualizedReturnCalculator: CustomCalculator = (values) => {
  const beginningValue = Math.max(0.01, safeNumber(values.beginningValue, 10000));
  const endingValue = Math.max(0, safeNumber(values.endingValue, 11800));
  const years = Math.max(0, safeNumber(values.years, 1));
  const months = Math.max(0, safeNumber(values.months, 0));
  const days = Math.max(0, safeNumber(values.days, 0));

  const holdingPeriodYears = years + months / 12 + days / 365;
  const multiple = endingValue / beginningValue;

  return {
    annualizedReturnPercent: round2(annualize(multiple, holdingPeriodYears)),
    totalReturnPercent: round2((multiple - 1) * 100),
    holdingPeriodYears: round4(holdingPeriodYears),
  };
};

// --- 5. Holding Period Return Calculator (linked sub-period returns) --------
export const holdingPeriodReturnCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment, 10000));
  const numberOfPeriods = Math.min(5, Math.max(1, Math.round(safeNumber(values.numberOfPeriods, 4))));
  const periodReturns = [
    safeNumber(values.period1ReturnPercent, 0),
    safeNumber(values.period2ReturnPercent, 0),
    safeNumber(values.period3ReturnPercent, 0),
    safeNumber(values.period4ReturnPercent, 0),
    safeNumber(values.period5ReturnPercent, 0),
  ].slice(0, numberOfPeriods);

  const growthMultiple = periodReturns.reduce((product, r) => product * (1 + Math.max(-100, r) / 100), 1);
  const holdingPeriodReturnPercent = (growthMultiple - 1) * 100;
  const geometricAveragePerPeriodPercent = growthMultiple > 0 ? (Math.pow(growthMultiple, 1 / numberOfPeriods) - 1) * 100 : -100;

  return {
    holdingPeriodReturnPercent: round2(holdingPeriodReturnPercent),
    endingValue: round2(initialInvestment * growthMultiple),
    geometricAveragePerPeriodPercent: round2(geometricAveragePerPeriodPercent),
  };
};

// --- 6. Total Return Calculator (price return + income return) --------------
export const totalReturnCalculator: CustomCalculator = (values) => {
  const beginningValue = Math.max(0.01, safeNumber(values.beginningValue, 20000));
  const endingValue = Math.max(0, safeNumber(values.endingValue, 22400));
  const incomeReceived = Math.max(0, safeNumber(values.incomeReceived, 0));

  const priceChange = endingValue - beginningValue;
  const totalReturn = priceChange + incomeReceived;

  return {
    totalReturn: round2(totalReturn),
    totalReturnPercent: round2((totalReturn / beginningValue) * 100),
    priceReturnPercent: round2((priceChange / beginningValue) * 100),
    incomeReturnPercent: round2((incomeReceived / beginningValue) * 100),
  };
};

// --- 7. Average Annual Return Calculator (arithmetic vs geometric) ----------
export const averageAnnualReturnCalculator: CustomCalculator = (values) => {
  const startingAmount = Math.max(0, safeNumber(values.startingAmount, 10000));
  const yearsIncluded = Math.min(5, Math.max(2, Math.round(safeNumber(values.yearsIncluded, 5))));
  const yearlyReturns = [
    safeNumber(values.year1ReturnPercent, 0),
    safeNumber(values.year2ReturnPercent, 0),
    safeNumber(values.year3ReturnPercent, 0),
    safeNumber(values.year4ReturnPercent, 0),
    safeNumber(values.year5ReturnPercent, 0),
  ]
    .slice(0, yearsIncluded)
    .map((r) => Math.max(-100, r));

  const arithmeticAveragePercent = yearlyReturns.reduce((sum, r) => sum + r, 0) / yearsIncluded;
  const growthMultiple = yearlyReturns.reduce((product, r) => product * (1 + r / 100), 1);
  const geometricAveragePercent = annualize(growthMultiple, yearsIncluded);

  return {
    arithmeticAveragePercent: round2(arithmeticAveragePercent),
    geometricAveragePercent: round2(geometricAveragePercent),
    volatilityDragPercent: round2(arithmeticAveragePercent - geometricAveragePercent),
    endingValue: round2(startingAmount * growthMultiple),
  };
};

// --- 8. Expected Return Calculator (probability-weighted scenarios) ---------
export const expectedReturnCalculator: CustomCalculator = (values) => {
  const probabilities = [
    Math.max(0, safeNumber(values.scenario1Probability, 0)),
    Math.max(0, safeNumber(values.scenario2Probability, 0)),
    Math.max(0, safeNumber(values.scenario3Probability, 0)),
  ];
  const returns = [
    safeNumber(values.scenario1ReturnPercent, 0),
    safeNumber(values.scenario2ReturnPercent, 0),
    safeNumber(values.scenario3ReturnPercent, 0),
  ];

  const probabilityTotal = probabilities[0] + probabilities[1] + probabilities[2];
  if (probabilityTotal <= 0) {
    return { expectedReturnPercent: 0, standardDeviationPercent: 0, probabilityTotalPercent: 0 };
  }

  // Probabilities are normalized to their own total, so an entry that
  // doesn't add to exactly 100% still produces a sensible weighted result.
  const weights = probabilities.map((p) => p / probabilityTotal);
  const expected = weights.reduce((sum, w, k) => sum + w * returns[k], 0);
  const variance = weights.reduce((sum, w, k) => sum + w * Math.pow(returns[k] - expected, 2), 0);

  return {
    expectedReturnPercent: round2(expected),
    standardDeviationPercent: round2(Math.sqrt(variance)),
    probabilityTotalPercent: round2(probabilityTotal),
  };
};

// --- 9. Required Rate of Return Calculator (CAPM + dividend discount) -------
export const requiredRateOfReturnCalculator: CustomCalculator = (values) => {
  const riskFreeRate = safeNumber(values.riskFreeRate, 4.5);
  const beta = safeNumber(values.beta, 1);
  const expectedMarketReturn = safeNumber(values.expectedMarketReturn, 10);
  const nextYearDividend = Math.max(0, safeNumber(values.nextYearDividend, 0));
  const currentPrice = Math.max(0, safeNumber(values.currentPrice, 0));
  const dividendGrowthRate = safeNumber(values.dividendGrowthRate, 0);

  const marketRiskPremium = expectedMarketReturn - riskFreeRate;
  const capm = riskFreeRate + beta * marketRiskPremium;
  const ddm = currentPrice > 0 ? (nextYearDividend / currentPrice) * 100 + dividendGrowthRate : 0;

  return {
    capmRequiredReturnPercent: round2(capm),
    marketRiskPremiumPercent: round2(marketRiskPremium),
    ddmRequiredReturnPercent: round2(ddm),
  };
};

// --- 10. Risk-Adjusted Return Calculator (M-squared, Sortino, Treynor) ------
export const riskAdjustedReturnCalculator: CustomCalculator = (values) => {
  const portfolioReturn = safeNumber(values.portfolioReturn, 12);
  const riskFreeRate = safeNumber(values.riskFreeRate, 4);
  const standardDeviation = Math.max(0.01, safeNumber(values.standardDeviation, 15));
  const downsideDeviation = Math.max(0.01, safeNumber(values.downsideDeviation, 9));
  const beta = safeNumber(values.beta, 1);
  const benchmarkStandardDeviation = Math.max(0, safeNumber(values.benchmarkStandardDeviation, 12));

  const excessReturn = portfolioReturn - riskFreeRate;
  const sharpe = excessReturn / standardDeviation;
  const m2 = riskFreeRate + sharpe * benchmarkStandardDeviation;

  return {
    m2ReturnPercent: round2(m2),
    sharpeRatio: round4(sharpe),
    sortinoRatio: round4(excessReturn / downsideDeviation),
    treynorRatio: beta !== 0 ? round4(excessReturn / beta) : 0,
  };
};

// --- 11. Break-Even Investment Return Calculator ----------------------------
// Solves (r - fee) x (1 - tax) = inflation for r: the nominal return whose
// after-fee, after-tax result exactly matches inflation (a 0% real return).
export const breakEvenInvestmentReturnCalculator: CustomCalculator = (values) => {
  const inflationRate = safeNumber(values.inflationRate, 3);
  const taxRate = Math.min(99, Math.max(0, safeNumber(values.taxRate, 0)));
  const annualFee = Math.max(0, safeNumber(values.annualFee, 0));
  const expectedReturn = safeNumber(values.expectedReturn, 6);

  const taxKeep = 1 - taxRate / 100;
  const inflationAfterTaxComponent = inflationRate / taxKeep;
  const breakEvenReturn = inflationAfterTaxComponent + annualFee;

  const afterTaxReturnAtExpected = ((expectedReturn - annualFee) / 100) * taxKeep;
  const realReturnAtExpected = ((1 + afterTaxReturnAtExpected) / (1 + inflationRate / 100) - 1) * 100;

  return {
    breakEvenReturnPercent: round2(breakEvenReturn),
    inflationAfterTaxComponentPercent: round2(inflationAfterTaxComponent),
    realReturnAtExpectedPercent: round2(realReturnAtExpected),
  };
};

export const investmentReturnsCustomCalculators: Record<string, CustomCalculator> = {
  "investment-return-calculator": investmentReturnCalculator,
  "stock-return-calculator": stockReturnCalculator,
  "portfolio-return-calculator": portfolioReturnCalculator,
  "annualized-return-calculator": annualizedReturnCalculator,
  "holding-period-return-calculator": holdingPeriodReturnCalculator,
  "total-return-calculator": totalReturnCalculator,
  "average-annual-return-calculator": averageAnnualReturnCalculator,
  "expected-return-calculator": expectedReturnCalculator,
  "required-rate-of-return-calculator": requiredRateOfReturnCalculator,
  "risk-adjusted-return-calculator": riskAdjustedReturnCalculator,
  "break-even-investment-return-calculator": breakEvenInvestmentReturnCalculator,
};
