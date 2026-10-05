/**
 * Batch: "Investment Calculators" expansion (5 Oct 2026), sub-batch 5 of 9 —
 * Funds & ETFs (6 tools), filed under Investment Calculators > Fund & ETF
 * Calculators (with the existing expense-ratio-calculator). See
 * calc-engine-investment-stocks.ts for the full batch context.
 *
 *  - mutualFund (incl. sector, ESG, infrastructure funds): lump sum +
 *    monthly, front-end load on every purchase, expense ratio drag.
 *  - etfInvestment (incl. index funds): same savings in a low-cost ETF vs
 *    a higher-cost fund.
 *  - targetDateFund: glide path from 90% stocks (25+ years out) down to
 *    50% at the target year; projected balance.
 *  - closedEndFund: discount/premium to NAV, distribution rate on price and
 *    on NAV, gain if the discount narrows.
 *  - fundOfFunds: two layers of fees vs the underlying funds alone.
 *  - leveragedEtf (incl. inverse): expected return with volatility decay,
 *    (1+r)^L x exp(-(L^2-L) sigma^2 T / 2) - 1, less the expense ratio.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-investment-funds-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Future value of a lump sum + monthly investments at a yearly net return.
function grow(initial: number, monthly: number, netPercent: number, years: number, loadPercent = 0): number {
  const g = Math.pow(1 + netPercent / 100, 1 / 12);
  const keep = 1 - loadPercent / 100;
  let v = initial * keep;
  for (let m = 0; m < Math.round(years * 12); m++) v = (v + monthly * keep) * g;
  return v;
}

// --- 1. Mutual Fund Calculator ---------------------------------------------------------
export const mutualFundCalculator: CustomCalculator = (values) => {
  const initial = Math.max(0, safeNumber(values.initial, 10000));
  const monthly = Math.max(0, safeNumber(values.monthly, 500));
  const grossReturnPercent = safeNumber(values.grossReturnPercent, 8);
  const expenseRatioPercent = Math.max(0, safeNumber(values.expenseRatioPercent, 0.75));
  const frontLoadPercent = Math.min(100, Math.max(0, safeNumber(values.frontLoadPercent, 0)));
  const years = Math.max(0, safeNumber(values.years, 20));

  const contributed = initial + monthly * Math.round(years * 12);
  const value = grow(initial, monthly, grossReturnPercent - expenseRatioPercent, years, frontLoadPercent);
  const noCost = grow(initial, monthly, grossReturnPercent, years);

  return {
    totalInvested: round2(contributed),
    loadPaid: round2((contributed * frontLoadPercent) / 100),
    fundValue: round2(value),
    totalGrowth: round2(value - contributed),
    costOfFeesAndLoad: round2(noCost - value),
  };
};

// --- 2. ETF Investment Calculator ------------------------------------------------------
export const etfInvestmentCalculator: CustomCalculator = (values) => {
  const initial = Math.max(0, safeNumber(values.initial, 10000));
  const monthly = Math.max(0, safeNumber(values.monthly, 500));
  const returnPercent = safeNumber(values.returnPercent, 8);
  const etfExpensePercent = Math.max(0, safeNumber(values.etfExpensePercent, 0.05));
  const fundExpensePercent = Math.max(0, safeNumber(values.fundExpensePercent, 0.75));
  const years = Math.max(0, safeNumber(values.years, 20));

  const etf = grow(initial, monthly, returnPercent - etfExpensePercent, years);
  const fund = grow(initial, monthly, returnPercent - fundExpensePercent, years);
  const noCost = grow(initial, monthly, returnPercent, years);

  return {
    totalInvested: round2(initial + monthly * Math.round(years * 12)),
    etfValue: round2(etf),
    higherCostFundValue: round2(fund),
    etfAdvantage: round2(etf - fund),
    etfFeesCost: round2(noCost - etf),
  };
};

// --- 3. Target-Date Fund Calculator ----------------------------------------------------
export const targetDateFundCalculator: CustomCalculator = (values) => {
  const currentAge = Math.max(0, Math.round(safeNumber(values.currentAge, 35)));
  const retirementAge = Math.max(currentAge, Math.round(safeNumber(values.retirementAge, 65)));
  const balance = Math.max(0, safeNumber(values.balance, 50000));
  const monthly = Math.max(0, safeNumber(values.monthly, 600));
  const stockReturnPercent = safeNumber(values.stockReturnPercent, 8);
  const bondReturnPercent = safeNumber(values.bondReturnPercent, 4);
  const expenseRatioPercent = Math.max(0, safeNumber(values.expenseRatioPercent, 0.12));

  const equity = (yearsLeft: number) => Math.min(90, Math.max(50, 50 + 1.6 * yearsLeft));
  const years = retirementAge - currentAge;
  let v = balance;
  for (let y = 0; y < years; y++) {
    const e = equity(years - y) / 100;
    const r = e * stockReturnPercent + (1 - e) * bondReturnPercent - expenseRatioPercent;
    const g = Math.pow(1 + r / 100, 1 / 12);
    for (let m = 0; m < 12; m++) v = (v + monthly) * g;
  }
  const eNow = equity(years);

  return {
    stockShareNow: round2(eNow),
    stockShareAtTarget: round2(equity(0)),
    expectedReturnNow: round2((eNow * stockReturnPercent + (100 - eNow) * bondReturnPercent) / 100 - expenseRatioPercent),
    totalContributions: round2(balance + monthly * 12 * years),
    balanceAtTargetDate: round2(v),
  };
};

// --- 4. Closed-End Fund Investment Calculator -----------------------------------------
export const closedEndFundCalculator: CustomCalculator = (values) => {
  const nav = Math.max(0.01, safeNumber(values.nav, 20));
  const price = Math.max(0.01, safeNumber(values.price, 18));
  const distributionPerShare = Math.max(0, safeNumber(values.distributionPerShare, 1.6));
  const shares = Math.max(0, Math.round(safeNumber(values.shares, 500)));
  const targetDiscountPercent = safeNumber(values.targetDiscountPercent, 5);

  const newPrice = nav * (1 - targetDiscountPercent / 100);

  return {
    premiumOrDiscount: round2(((price - nav) / nav) * 100),
    distributionRateOnPrice: round2((distributionPerShare / price) * 100),
    distributionRateOnNav: round2((distributionPerShare / nav) * 100),
    yearlyIncome: round2(distributionPerShare * shares),
    priceIfDiscountChanges: round2(newPrice),
    gainIfDiscountChanges: round2((newPrice - price) * shares),
  };
};

// --- 5. Fund of Funds Investment Calculator --------------------------------------------
export const fundOfFundsCalculator: CustomCalculator = (values) => {
  const investment = Math.max(0, safeNumber(values.investment, 100000));
  const grossReturnPercent = safeNumber(values.grossReturnPercent, 7);
  const underlyingFeePercent = Math.max(0, safeNumber(values.underlyingFeePercent, 0.6));
  const fofFeePercent = Math.max(0, safeNumber(values.fofFeePercent, 0.5));
  const years = Math.max(0, safeNumber(values.years, 15));

  const both = investment * Math.pow(1 + (grossReturnPercent - underlyingFeePercent - fofFeePercent) / 100, years);
  const single = investment * Math.pow(1 + (grossReturnPercent - underlyingFeePercent) / 100, years);

  return {
    combinedFee: round2(underlyingFeePercent + fofFeePercent),
    valueWithFundOfFunds: round2(both),
    valueWithUnderlyingFundsOnly: round2(single),
    costOfExtraLayer: round2(single - both),
  };
};

// --- 6. Leveraged ETF Investment Calculator (incl. inverse) ----------------------------
export const leveragedEtfCalculator: CustomCalculator = (values) => {
  const rawL = Math.round(safeNumber(values.leverage, 2));
  const L = [3, 2, -1, -2, -3].includes(rawL) ? rawL : 2;
  const investment = Math.max(0, safeNumber(values.investment, 10000));
  const indexReturnPercent = Math.max(-99, safeNumber(values.indexReturnPercent, 10));
  const volatilityPercent = Math.max(0, safeNumber(values.volatilityPercent, 20));
  const years = Math.max(0, safeNumber(values.years, 1));
  const expenseRatioPercent = Math.max(0, safeNumber(values.expenseRatioPercent, 0.95));

  const s = volatilityPercent / 100;
  const expected = Math.pow(1 + indexReturnPercent / 100, L) * Math.exp((-(L * L - L) * s * s * years) / 2) * Math.pow(1 - expenseRatioPercent / 100, years) - 1;
  const naive = (L * indexReturnPercent) / 100;

  return {
    simpleMultipleReturn: round2(naive * 100),
    expectedReturn: round2(expected * 100),
    volatilityDrag: round2((naive - expected) * 100),
    valueAfterPeriod: round2(investment * (1 + expected)),
  };
};

export const investmentFundsCustomCalculators: Record<string, CustomCalculator> = {
  "mutual-fund-calculator": mutualFundCalculator,
  "etf-investment-calculator": etfInvestmentCalculator,
  "target-date-fund-calculator": targetDateFundCalculator,
  "closed-end-fund-investment-calculator": closedEndFundCalculator,
  "fund-of-funds-investment-calculator": fundOfFundsCalculator,
  "leveraged-etf-investment-calculator": leveragedEtfCalculator,
};
