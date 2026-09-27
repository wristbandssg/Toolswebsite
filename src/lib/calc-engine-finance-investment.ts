/**
 * Batch: "Investment Calculators" (7 tools). Part of the
 * Finance_Calculators_Topical_SEO_Master.xlsx build-out (see
 * calc-engine-finance-credit-debt.ts for the full batch list/context).
 * Filed under "Investment Calculators" — Compound Interest and Simple
 * Interest stay here rather than the site's separate empty "Interest
 * Calculators" shell, per the source file's own Cluster grouping
 * (confirmed with the user rather than split across categories).
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-finance-investment-calculators.ts for the tool
 * content/copy this math is wired to.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- 1. Investment Calculator (lump sum + regular monthly contributions) ----
export const investmentCalculator: CustomCalculator = (values) => {
  const initialInvestment = Math.max(0, safeNumber(values.initialInvestment));
  const monthlyContribution = Math.max(0, safeNumber(values.monthlyContribution));
  const annualReturnPercent = safeNumber(values.annualReturnPercent, 7);
  const yearsToGrow = Math.max(0, safeNumber(values.yearsToGrow, 20));

  const monthlyRate = annualReturnPercent / 100 / 12;
  const numMonths = yearsToGrow * 12;

  let futureValue: number;
  if (monthlyRate === 0) {
    futureValue = initialInvestment + monthlyContribution * numMonths;
  } else {
    futureValue =
      initialInvestment * Math.pow(1 + monthlyRate, numMonths) +
      monthlyContribution * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate);
  }

  const totalContributions = initialInvestment + monthlyContribution * numMonths;
  const totalGrowth = futureValue - totalContributions;

  return {
    futureValue: round2(futureValue),
    totalContributions: round2(totalContributions),
    totalGrowth: round2(totalGrowth),
  };
};

// --- 2. Compound Interest Calculator (lump sum, configurable compounding) ---
export const compoundInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal));
  const annualRatePercent = safeNumber(values.annualRatePercent, 6);
  const compoundingFrequency = Math.max(1, safeNumber(values.compoundingFrequency, 12));
  const years = Math.max(0, safeNumber(values.years, 10));

  const futureValue = principal * Math.pow(1 + annualRatePercent / 100 / compoundingFrequency, compoundingFrequency * years);
  const totalInterest = futureValue - principal;

  return {
    futureValue: round2(futureValue),
    totalInterest: round2(totalInterest),
  };
};

// --- 3. Simple Interest Calculator -------------------------------------------
export const simpleInterestCalculator: CustomCalculator = (values) => {
  const principal = Math.max(0, safeNumber(values.principal));
  const annualRatePercent = safeNumber(values.annualRatePercent, 5);
  const years = Math.max(0, safeNumber(values.years, 3));

  const interest = principal * (annualRatePercent / 100) * years;
  const totalAmount = principal + interest;

  return {
    interest: round2(interest),
    totalAmount: round2(totalAmount),
  };
};

// --- 4. CAGR Calculator --------------------------------------------------------
export const cagrCalculator: CustomCalculator = (values) => {
  const beginningValue = Math.max(0.01, safeNumber(values.beginningValue));
  const endingValue = Math.max(0, safeNumber(values.endingValue));
  const years = Math.max(0.01, safeNumber(values.years, 5));

  const cagrPercent = (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;

  return round2(cagrPercent);
};

// --- 5. Dividend Calculator ----------------------------------------------------
export const dividendCalculator: CustomCalculator = (values) => {
  const sharePrice = Math.max(0.01, safeNumber(values.sharePrice));
  const numberOfShares = Math.max(0, safeNumber(values.numberOfShares));
  const annualDividendPerShare = Math.max(0, safeNumber(values.annualDividendPerShare));

  const totalAnnualDividend = numberOfShares * annualDividendPerShare;
  const dividendYieldPercent = (annualDividendPerShare / sharePrice) * 100;
  const totalInvestmentValue = sharePrice * numberOfShares;

  return {
    totalAnnualDividend: round2(totalAnnualDividend),
    dividendYieldPercent: round2(dividendYieldPercent),
    totalInvestmentValue: round2(totalInvestmentValue),
  };
};

// --- 6. Stock Profit Calculator -------------------------------------------------
export const stockProfitCalculator: CustomCalculator = (values) => {
  const numberOfShares = Math.max(0, safeNumber(values.numberOfShares));
  const buyPrice = Math.max(0, safeNumber(values.buyPrice));
  const sellPrice = Math.max(0, safeNumber(values.sellPrice));
  const commissionPerTrade = Math.max(0, safeNumber(values.commissionPerTrade));

  const totalCost = numberOfShares * buyPrice + commissionPerTrade;
  const totalProceeds = numberOfShares * sellPrice - commissionPerTrade;
  const profit = totalProceeds - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    totalCost: round2(totalCost),
    totalProceeds: round2(totalProceeds),
    profit: round2(profit),
    profitPercent: round2(profitPercent),
  };
};

// --- 7. Dollar Cost Averaging Calculator ----------------------------------------
// Simplified DCA model: price is assumed to move in a straight line from a
// starting price to an ending price across the number of periods entered
// (a reasonable approximation for illustrating the DCA mechanism — see the
// tool's Assumptions text for the disclosed simplification).
export const dollarCostAveragingCalculator: CustomCalculator = (values) => {
  const investmentPerPeriod = Math.max(0, safeNumber(values.investmentPerPeriod));
  const numberOfPeriods = Math.max(2, Math.round(safeNumber(values.numberOfPeriods, 12)));
  const startingPrice = Math.max(0.01, safeNumber(values.startingPrice));
  const endingPrice = Math.max(0.01, safeNumber(values.endingPrice));

  let totalInvested = 0;
  let totalShares = 0;
  for (let i = 0; i < numberOfPeriods; i++) {
    const price = startingPrice + ((endingPrice - startingPrice) * i) / (numberOfPeriods - 1);
    totalInvested += investmentPerPeriod;
    totalShares += investmentPerPeriod / price;
  }

  const averageCostPerShare = totalShares > 0 ? totalInvested / totalShares : 0;
  const currentValue = totalShares * endingPrice;
  const totalReturnPercent = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested: round2(totalInvested),
    totalShares: Math.round(totalShares * 10000) / 10000,
    averageCostPerShare: round2(averageCostPerShare),
    currentValue: round2(currentValue),
    totalReturnPercent: round2(totalReturnPercent),
  };
};

export const financeInvestmentCustomCalculators: Record<string, CustomCalculator> = {
  "investment-calculator": investmentCalculator,
  "compound-interest-calculator": compoundInterestCalculator,
  "simple-interest-calculator": simpleInterestCalculator,
  "cagr-calculator": cagrCalculator,
  "dividend-calculator": dividendCalculator,
  "stock-profit-calculator": stockProfitCalculator,
  "dollar-cost-averaging-calculator": dollarCostAveragingCalculator,
};
