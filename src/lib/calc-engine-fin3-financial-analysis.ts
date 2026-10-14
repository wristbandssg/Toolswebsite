/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 8 of 10
 * — Cash Flow & Balance-Sheet Analysis (8 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 * FCFE and FCFF are deliberately separate: FCFE (incl. the "Levered Free
 * Cash Flow" keyword) is cash left for shareholders after debt flows;
 * FCFF (incl. "Unlevered Free Cash Flow") is cash for all capital
 * providers before debt. The existing free-cash-flow-calculator is the
 * simple OCF − capex version.
 *
 *  - cashFlowToDebt: OCF ÷ total debt (and FCF ÷ debt), years to repay.
 *  - financialLeverage: equity multiplier, D/E, debt ÷ EBITDA and degree
 *    of financial leverage EBIT ÷ (EBIT − interest).
 *  - fixedAssetTurnover: revenue ÷ average net PP&E.
 *  - fcfe: NI + D&A − capex − ΔNWC + net borrowing.
 *  - fcff: EBIT(1 − t) + D&A − capex − ΔNWC.
 *  - netOperatingAssets: (total assets − cash & investments) − (total
 *    liabilities − debt).
 *  - netOperatingWorkingCapital: (current assets − excess cash) −
 *    (current liabilities − short-term debt).
 *  - workingCapitalTurnover: revenue ÷ average working capital.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-financial-analysis-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const pos = (v: number, d: number) => Math.max(0, safeNumber(v, d));
const num = (v: number, d: number) => safeNumber(v, d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. Cash Flow to Debt Ratio Calculator ---------------------------------------------
export const cashFlowToDebtCalculator: CustomCalculator = (values) => {
  const ocf = num(values.operatingCashFlow, 600000);
  const debt = pos(values.totalDebt, 2400000);
  const capex = pos(values.capitalExpenditures, 0);
  return {
    cashFlowToDebt: round2(debt > 0 ? ocf / debt : 0),
    cashFlowToDebtPct: round2(debt > 0 ? (ocf / debt) * 100 : 0),
    freeCashFlowToDebt: round2(debt > 0 && capex > 0 ? (ocf - capex) / debt : 0),
    yearsToRepay: round2(ocf > 0 ? debt / ocf : 0),
  };
};

// --- 2. Financial Leverage Ratio Calculator --------------------------------------------
export const financialLeverageCalculator: CustomCalculator = (values) => {
  const assets = pos(values.totalAssets, 5000000);
  const equity = num(values.shareholdersEquity, 2000000);
  const debt = pos(values.totalDebt, 2200000);
  const ebitda = num(values.ebitda, 900000);
  const ebit = num(values.ebit, 700000);
  const interest = pos(values.interestExpense, 150000);
  return {
    equityMultiplier: round2(equity > 0 ? assets / equity : 0),
    debtToEquity: round2(equity > 0 ? debt / equity : 0),
    debtToEbitda: round2(ebitda > 0 ? debt / ebitda : 0),
    degreeOfFinancialLeverage: round2(ebit - interest !== 0 ? ebit / (ebit - interest) : 0),
    debtToAssets: round2(assets > 0 ? (debt / assets) * 100 : 0),
  };
};

// --- 3. Fixed Asset Turnover Ratio Calculator ------------------------------------------
export const fixedAssetTurnoverCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 9000000);
  const begin = pos(values.netPpeBeginning, 2800000);
  const end = pos(values.netPpeEnd, 3200000);
  const avg = end > 0 && begin > 0 ? (begin + end) / 2 : Math.max(begin, end);
  return {
    averageNetFixedAssets: round2(avg),
    fixedAssetTurnover: round2(avg > 0 ? revenue / avg : 0),
    ppePctOfRevenue: round2(revenue > 0 ? (avg / revenue) * 100 : 0),
  };
};

// --- 4. FCFE Calculator ----------------------------------------------------------------
export const fcfeCalculator: CustomCalculator = (values) => {
  const ni = num(values.netIncome, 800000);
  const da = pos(values.depreciationAmortization, 300000);
  const capex = pos(values.capitalExpenditures, 400000);
  const dnwc = num(values.changeInWorkingCapital, 50000);
  const borrowing = num(values.netBorrowing, 100000);
  const shares = pos(values.sharesOutstanding, 1000000);
  const fcfe = ni + da - capex - dnwc + borrowing;
  return {
    fcfe: round2(fcfe),
    fcfePerShare: round2(shares > 0 ? fcfe / shares : 0),
    fcfeBeforeBorrowing: round2(fcfe - borrowing),
  };
};

// --- 5. FCFF Calculator ----------------------------------------------------------------
export const fcffCalculator: CustomCalculator = (values) => {
  const ebit = num(values.ebit, 1200000);
  const t = clamp(pos(values.taxRate, 25), 0, 100) / 100;
  const da = pos(values.depreciationAmortization, 300000);
  const capex = pos(values.capitalExpenditures, 400000);
  const dnwc = num(values.changeInWorkingCapital, 50000);
  const revenue = pos(values.revenue, 0);
  const nopat = ebit * (1 - t);
  const fcff = nopat + da - capex - dnwc;
  return {
    nopat: round2(nopat),
    fcff: round2(fcff),
    reinvestment: round2(capex - da + dnwc),
    fcffMargin: round2(revenue > 0 ? (fcff / revenue) * 100 : 0),
  };
};

// --- 6. Net Operating Assets Calculator ------------------------------------------------
export const netOperatingAssetsCalculator: CustomCalculator = (values) => {
  const ta = pos(values.totalAssets, 10000000);
  const cash = pos(values.cashAndInvestments, 1500000);
  const tl = pos(values.totalLiabilities, 6000000);
  const debt = pos(values.totalDebt, 3500000);
  const opAssets = ta - cash;
  const opLiab = tl - debt;
  return {
    operatingAssets: round2(opAssets),
    operatingLiabilities: round2(opLiab),
    netOperatingAssets: round2(opAssets - opLiab),
  };
};

// --- 7. Net Operating Working Capital Calculator ---------------------------------------
export const netOperatingWorkingCapitalCalculator: CustomCalculator = (values) => {
  const ca = pos(values.currentAssets, 2500000);
  const cash = pos(values.excessCash, 400000);
  const cl = pos(values.currentLiabilities, 1600000);
  const std = pos(values.shortTermDebt, 500000);
  const revenue = pos(values.revenue, 0);
  const nowc = ca - cash - (cl - std);
  return {
    operatingCurrentAssets: round2(ca - cash),
    operatingCurrentLiabilities: round2(cl - std),
    netOperatingWorkingCapital: round2(nowc),
    nowcPctOfRevenue: round2(revenue > 0 ? (nowc / revenue) * 100 : 0),
  };
};

// --- 8. Working Capital Turnover Ratio Calculator --------------------------------------
export const workingCapitalTurnoverCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 6000000);
  const begin = num(values.workingCapitalBeginning, 900000);
  const end = num(values.workingCapitalEnd, 1100000);
  const avg = (begin + end) / 2;
  const turnover = avg > 0 ? revenue / avg : 0;
  return {
    averageWorkingCapital: round2(avg),
    workingCapitalTurnover: round2(turnover),
    daysOfWorkingCapital: round2(turnover > 0 ? 365 / turnover : 0),
  };
};

export const fin3FinancialAnalysisCustomCalculators: Record<string, CustomCalculator> = {
  "cash-flow-to-debt-ratio-calculator": cashFlowToDebtCalculator,
  "financial-leverage-ratio-calculator": financialLeverageCalculator,
  "fixed-asset-turnover-ratio-calculator": fixedAssetTurnoverCalculator,
  "fcfe-calculator": fcfeCalculator,
  "fcff-calculator": fcffCalculator,
  "net-operating-assets-calculator": netOperatingAssetsCalculator,
  "net-operating-working-capital-calculator": netOperatingWorkingCapitalCalculator,
  "working-capital-turnover-ratio-calculator": workingCapitalTurnoverCalculator,
};
