/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 8 of 9 —
 * Equity Returns, Value Creation & Risk (10 tools). See
 * calc-engine-fin2-investing.ts for the full batch context.
 *
 *  - dividendPayoutRatio (incl. "Retention Ratio"): DPS ÷ EPS (or totals),
 *    retention = 1 − payout, FCF payout.
 *  - dupontAnalysis: 3-step ROE = margin × asset turnover × equity
 *    multiplier and 5-step tax burden × interest burden × EBIT margin.
 *  - economicValueAdded: EVA = NOPAT − WACC × invested capital.
 *  - marketValueAdded: MVA = market value of the firm − capital invested
 *    by investors (book equity + debt). Different from EVA: MVA is the
 *    market's cumulative verdict, EVA one year's economic profit.
 *  - residualIncome: NI − r × book equity, and the residual income model
 *    value BV0 + RI1 ÷ (r − g) per share.
 *  - roic: NOPAT ÷ (debt + equity − cash), the spread over WACC.
 *  - sustainableGrowthRate: ROE × retention; internal growth rate
 *    ROA·b ÷ (1 − ROA·b).
 *  - portfolioBeta: value-weighted beta of up to 8 holdings and the CAPM
 *    expected return.
 *  - unleveredBeta: Hamada βu = βL ÷ (1 + (1 − t)D/E), re-levered at a
 *    target D/E.
 *  - operatingCashFlowRatio: OCF ÷ current liabilities, OCF margin and cash
 *    flow to net income.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-equity-returns-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;
const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const pct = (a: number, b: number) => (b !== 0 ? round2((a / b) * 100) : 0);

// --- 1. Dividend Payout Ratio Calculator -----------------------------------------------
export const dividendPayoutRatioCalculator: CustomCalculator = (values) => {
  const dps = pos(values.dividendsPerShare, 1.2);
  const eps = num(values.eps, 4);
  const fcfps = num(values.freeCashFlowPerShare, 0);
  const payout = eps > 0 ? dps / eps : 0;
  return {
    payoutRatio: round2(payout * 100),
    retentionRatio: round2(eps > 0 ? (1 - payout) * 100 : 0),
    retainedPerShare: round2(eps - dps),
    fcfPayoutRatio: fcfps > 0 ? pct(dps, fcfps) : 0,
  };
};

// --- 2. DuPont Analysis Calculator -----------------------------------------------------
export const dupontAnalysisCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 120000);
  const revenue = pos(values.revenue, 1500000);
  const assets = pos(values.totalAssets, 1000000);
  const equity = num(values.shareholdersEquity, 600000);
  const ebt = num(values.ebt, 160000);
  const ebit = num(values.ebit, 180000);
  const margin = revenue > 0 ? ni / revenue : 0;
  const turnover = assets > 0 ? revenue / assets : 0;
  const multiplier = equity > 0 ? assets / equity : 0;
  return {
    netProfitMargin: round2(margin * 100),
    assetTurnover: round4(turnover),
    equityMultiplier: round4(multiplier),
    roe: round2(margin * turnover * multiplier * 100),
    taxBurden: round4(ebt !== 0 ? ni / ebt : 0),
    interestBurden: round4(ebit !== 0 ? ebt / ebit : 0),
    ebitMargin: pct(ebit, revenue),
  };
};

// --- 3. Economic Value Added Calculator ------------------------------------------------
export const economicValueAddedCalculator: CustomCalculator = (values) => {
  const nopat = num(values.nopat, 900000);
  const capital = pos(values.investedCapital, 7000000);
  const wacc = num(values.wacc, 9) / 100;
  const charge = capital * wacc;
  const roic = capital > 0 ? nopat / capital : 0;
  return {
    capitalCharge: round2(charge),
    eva: round2(nopat - charge),
    roic: round2(roic * 100),
    spread: round2((roic - wacc) * 100),
  };
};

// --- 4. Market Value Added Calculator --------------------------------------------------
export const marketValueAddedCalculator: CustomCalculator = (values) => {
  const shares = pos(values.sharesOutstanding, 50000000);
  const price = pos(values.sharePrice, 40);
  const bookEquity = num(values.bookEquity, 1200000000);
  const debtMarket = pos(values.debtMarketValue, 0);
  const debtBook = pos(values.debtBookValue, 0);
  const marketValue = shares * price + debtMarket;
  const capital = bookEquity + debtBook;
  return {
    marketValueOfFirm: round2(marketValue),
    capitalInvested: round2(capital),
    mva: round2(marketValue - capital),
    marketToBook: round2(bookEquity > 0 ? (shares * price) / bookEquity : 0),
  };
};

// --- 5. Residual Income Calculator -----------------------------------------------------
export const residualIncomeCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 15000000);
  const bv = pos(values.bookEquity, 100000000);
  const r = num(values.costOfEquity, 10) / 100;
  const g = num(values.residualIncomeGrowth, 2) / 100;
  const shares = pos(values.sharesOutstanding, 10000000);
  const ri = ni - r * bv;
  const value = r > g ? bv + (ri * (1 + g)) / (r - g) : 0;
  return {
    equityCharge: round2(r * bv),
    residualIncome: round2(ri),
    roe: pct(ni, bv),
    intrinsicValue: round2(value),
    valuePerShare: round2(shares > 0 ? value / shares : 0),
  };
};

// --- 6. ROIC Calculator ----------------------------------------------------------------
export const roicCalculator: CustomCalculator = (values) => {
  const ebit = num(values.ebit, 2000000);
  const t = pos(values.taxRate, 25) / 100;
  const debt = pos(values.totalDebt, 4000000);
  const equity = num(values.totalEquity, 8000000);
  const cash = pos(values.cash, 1000000);
  const wacc = num(values.wacc, 0);
  const nopat = ebit * (1 - t);
  const ic = debt + equity - cash;
  const roic = ic > 0 ? (nopat / ic) * 100 : 0;
  return {
    nopat: round2(nopat),
    investedCapital: round2(ic),
    roic: round2(roic),
    spreadOverWacc: round2(wacc > 0 ? roic - wacc : 0),
  };
};

// --- 7. Sustainable Growth Rate Calculator ---------------------------------------------
export const sustainableGrowthRateCalculator: CustomCalculator = (values) => {
  const roe = num(values.roe, 15) / 100;
  const payout = num(values.payoutRatio, 40) / 100;
  const roa = num(values.roa, 0) / 100;
  const b = 1 - payout;
  return {
    retentionRatio: round2(b * 100),
    sustainableGrowthRate: round2(roe * b * 100),
    internalGrowthRate: round2(roa > 0 && roa * b < 1 ? ((roa * b) / (1 - roa * b)) * 100 : 0),
  };
};

// --- 8. Portfolio Beta Calculator ------------------------------------------------------
export const portfolioBetaCalculator: CustomCalculator = (values) => {
  let total = 0;
  let weighted = 0;
  for (let k = 1; k <= 8; k++) {
    const v = pos(values[`value${k}`], 0);
    total += v;
    weighted += v * num(values[`beta${k}`], 0);
  }
  const beta = total > 0 ? weighted / total : 0;
  const rf = num(values.riskFreeRate, 4);
  const rm = num(values.marketReturn, 10);
  return {
    portfolioValue: round2(total),
    portfolioBeta: round4(beta),
    capmExpectedReturn: round2(rf + beta * (rm - rf)),
    marketDropImpact: round2(-beta * 10),
  };
};

// --- 9. Unlevered Beta Calculator ------------------------------------------------------
export const unleveredBetaCalculator: CustomCalculator = (values) => {
  const bl = num(values.leveredBeta, 1.3);
  const debt = pos(values.totalDebt, 400);
  const equity = pos(values.equityValue, 1000);
  const t = pos(values.taxRate, 25) / 100;
  const targetDe = pos(values.targetDebtToEquity, 0) / 100;
  const de = equity > 0 ? debt / equity : 0;
  const bu = bl / (1 + (1 - t) * de);
  return {
    debtToEquity: round2(de * 100),
    unleveredBeta: round4(bu),
    releveredBeta: round4(targetDe > 0 ? bu * (1 + (1 - t) * targetDe) : 0),
  };
};

// --- 10. Operating Cash Flow Ratio Calculator ------------------------------------------
export const operatingCashFlowRatioCalculator: CustomCalculator = (values) => {
  const ocf = num(values.operatingCashFlow, 450000);
  const cl = pos(values.currentLiabilities, 300000);
  const revenue = pos(values.revenue, 0);
  const ni = num(values.netIncome, 0);
  return {
    operatingCashFlowRatio: round2(cl > 0 ? ocf / cl : 0),
    ocfMargin: revenue > 0 ? pct(ocf, revenue) : 0,
    cashFlowToNetIncome: round2(ni > 0 ? ocf / ni : 0),
  };
};

export const fin2EquityReturnsCustomCalculators: Record<string, CustomCalculator> = {
  "dividend-payout-ratio-calculator": dividendPayoutRatioCalculator,
  "dupont-analysis-calculator": dupontAnalysisCalculator,
  "economic-value-added-calculator": economicValueAddedCalculator,
  "market-value-added-calculator": marketValueAddedCalculator,
  "residual-income-calculator": residualIncomeCalculator,
  "roic-calculator": roicCalculator,
  "sustainable-growth-rate-calculator": sustainableGrowthRateCalculator,
  "portfolio-beta-calculator": portfolioBetaCalculator,
  "unlevered-beta-calculator": unleveredBetaCalculator,
  "operating-cash-flow-ratio-calculator": operatingCashFlowRatioCalculator,
};
