/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 7 of 9 —
 * Equity Valuation Multiples (10 tools). See calc-engine-fin2-investing.ts
 * for the full batch context.
 *
 * The price multiples are deliberately separate tools because each has its
 * own search intent and inputs: P/B (book equity), P/CF (operating cash
 * flow, plus P/FCF), P/S (revenue), EV/EBITDA and EV/Sales (enterprise
 * value), PEG (P/E ÷ growth). The existing price-to-earnings-ratio-
 * calculator covers P/E.
 *
 *  - dividendDiscountModel: Gordon D0(1 + g) ÷ (r − g) or two-stage (high
 *    growth for n years, then stable growth), vs the share price.
 *  - grahamNumber: √(22.5 × EPS × BVPS) and Graham's revised formula
 *    V = EPS × (8.5 + 2g) × 4.4 ÷ Y.
 *  - marginOfSafety: investing (intrinsic value vs price, buy price for a
 *    target margin) or accounting ((sales − break-even) ÷ sales).
 *  - yearOverYearGrowth (incl. "Week Over Week" and "EPS Growth"):
 *    (current − previous) ÷ |previous|, annualised by period type.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-equity-valuation-calculators.ts for the copy.
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
const ratio = (a: number, b: number) => (b > 0 ? round2(a / b) : 0);

// --- 1. Dividend Discount Model Calculator ---------------------------------------------
export const dividendDiscountModelCalculator: CustomCalculator = (values) => {
  const d0 = pos(values.currentDividend, 2);
  const r = num(values.requiredReturn, 9) / 100;
  const g2 = num(values.stableGrowth, 4) / 100;
  const twoStage = num(values.model, 1) === 2;
  const g1 = num(values.highGrowth, 10) / 100;
  const n = Math.max(0, Math.round(pos(values.highGrowthYears, 5)));
  const price = pos(values.sharePrice, 0);
  let value = 0;
  let pvDivs = 0;
  let pvTerminal = 0;
  if (r > g2) {
    if (twoStage) {
      let d = d0;
      for (let t = 1; t <= n; t++) {
        d *= 1 + g1;
        pvDivs += d / Math.pow(1 + r, t);
      }
      pvTerminal = (d * (1 + g2)) / (r - g2) / Math.pow(1 + r, n);
    } else pvTerminal = (d0 * (1 + g2)) / (r - g2);
    value = pvDivs + pvTerminal;
  }
  return {
    nextDividend: round2(d0 * (1 + (twoStage && n > 0 ? g1 : g2))),
    pvOfHighGrowthDividends: round2(pvDivs),
    pvOfTerminalValue: round2(pvTerminal),
    intrinsicValue: round2(value),
    upsidePct: round2(price > 0 && value > 0 ? (value / price - 1) * 100 : 0),
    valid: r > g2 ? 1 : 0,
  };
};

// --- 2. Graham Number Calculator -------------------------------------------------------
export const grahamNumberCalculator: CustomCalculator = (values) => {
  const eps = num(values.eps, 5);
  const bvps = num(values.bookValuePerShare, 30);
  const price = pos(values.sharePrice, 0);
  const g = num(values.growthRate, 0);
  const y = pos(values.aaaYield, 5);
  const gn = eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : 0;
  const formula = y > 0 && eps > 0 ? (eps * (8.5 + 2 * g) * 4.4) / y : 0;
  return {
    grahamNumber: round2(gn),
    marginOfSafetyVsGraham: round2(gn > 0 && price > 0 ? (1 - price / gn) * 100 : 0),
    grahamFormulaValue: round2(g > 0 ? formula : 0),
  };
};

// --- 3. Margin of Safety Calculator ----------------------------------------------------
export const marginOfSafetyCalculator: CustomCalculator = (values) => {
  const mode = num(values.mode, 1);
  if (mode === 2) {
    const sales = pos(values.actualSales, 500000);
    const be = pos(values.breakEvenSales, 350000);
    const price = pos(values.sellingPricePerUnit, 0);
    return {
      marginOfSafety: round2(sales > 0 ? ((sales - be) / sales) * 100 : 0),
      marginOfSafetyAmount: round2(sales - be),
      marginOfSafetyUnits: round2(price > 0 ? (sales - be) / price : 0),
      buyPriceForTarget: 0,
    };
  }
  const iv = pos(values.intrinsicValue, 120);
  const price = pos(values.marketPrice, 90);
  const target = pos(values.targetMargin, 30) / 100;
  return {
    marginOfSafety: round2(iv > 0 ? ((iv - price) / iv) * 100 : 0),
    marginOfSafetyAmount: round2(iv - price),
    marginOfSafetyUnits: 0,
    buyPriceForTarget: round2(iv * (1 - target)),
  };
};

// --- 4. PEG Ratio Calculator -----------------------------------------------------------
export const pegRatioCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 50);
  const eps = num(values.eps, 2.5);
  const g = num(values.epsGrowth, 15);
  const dy = pos(values.dividendYield, 0);
  const pe = eps > 0 ? price / eps : 0;
  return {
    peRatio: round2(pe),
    pegRatio: round2(g > 0 ? pe / g : 0),
    dividendAdjustedPeg: round2(g + dy > 0 ? pe / (g + dy) : 0),
  };
};

// --- 5. Price to Book Ratio Calculator -------------------------------------------------
export const priceToBookCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 45);
  const equity = num(values.totalEquity, 900000000);
  const pref = pos(values.preferredEquity, 0);
  const intang = pos(values.intangibles, 0);
  const shares = pos(values.sharesOutstanding, 30000000);
  const bvps = shares > 0 ? (equity - pref) / shares : 0;
  const tbvps = shares > 0 ? (equity - pref - intang) / shares : 0;
  return {
    bookValuePerShare: round2(bvps),
    priceToBook: ratio(price, bvps),
    tangibleBookPerShare: round2(tbvps),
    priceToTangibleBook: ratio(price, tbvps),
  };
};

// --- 6. Price to Cash Flow Ratio Calculator --------------------------------------------
export const priceToCashFlowCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 40);
  const ocf = num(values.operatingCashFlow, 250000000);
  const capex = pos(values.capitalExpenditures, 0);
  const shares = pos(values.sharesOutstanding, 50000000);
  const cfps = shares > 0 ? ocf / shares : 0;
  const fcfps = shares > 0 ? (ocf - capex) / shares : 0;
  return {
    cashFlowPerShare: round2(cfps),
    priceToCashFlow: ratio(price, cfps),
    freeCashFlowPerShare: round2(fcfps),
    priceToFreeCashFlow: capex > 0 ? ratio(price, fcfps) : 0,
  };
};

// --- 7. Price to Sales Ratio Calculator ------------------------------------------------
export const priceToSalesCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 30);
  const shares = pos(values.sharesOutstanding, 100000000);
  const revenue = pos(values.revenue, 1500000000);
  const cap = price * shares;
  return {
    marketCap: round2(cap),
    salesPerShare: round2(shares > 0 ? revenue / shares : 0),
    priceToSales: ratio(cap, revenue),
  };
};

// --- 8. EBITDA Multiple Calculator -----------------------------------------------------
function enterpriseValue(values: Record<string, number>): number {
  return pos(values.marketCap, 2000000000) + pos(values.totalDebt, 600000000) + pos(values.preferredAndMinority, 0) - pos(values.cash, 200000000);
}

export const ebitdaMultipleCalculator: CustomCalculator = (values) => {
  const ev = enterpriseValue(values);
  const ebitda = num(values.ebitda, 300000000);
  const target = pos(values.targetMultiple, 0);
  const netDebt = ev - pos(values.marketCap, 2000000000);
  return {
    enterpriseValue: round2(ev),
    evToEbitda: ratio(ev, ebitda),
    impliedEnterpriseValue: round2(target * ebitda),
    impliedEquityValue: round2(target > 0 ? target * ebitda - netDebt : 0),
  };
};

// --- 9. EV to Sales Calculator ---------------------------------------------------------
export const evToSalesCalculator: CustomCalculator = (values) => {
  const ev = enterpriseValue(values);
  const revenue = pos(values.revenue, 1200000000);
  const target = pos(values.targetMultiple, 0);
  const netDebt = ev - pos(values.marketCap, 2000000000);
  return {
    enterpriseValue: round2(ev),
    evToSales: ratio(ev, revenue),
    priceToSales: ratio(pos(values.marketCap, 2000000000), revenue),
    impliedEquityValue: round2(target > 0 ? target * revenue - netDebt : 0),
  };
};

// --- 10. Year Over Year Growth Calculator ----------------------------------------------
const PERIODS: Record<number, number> = { 1: 1, 2: 4, 3: 12, 4: 52, 5: 365 };

export const yearOverYearGrowthCalculator: CustomCalculator = (values) => {
  const current = num(values.currentValue, 125000);
  const previous = num(values.previousValue, 100000);
  const ppy = PERIODS[num(values.periodType, 1)] ?? 1;
  const g = previous !== 0 ? (current - previous) / Math.abs(previous) : 0;
  return {
    change: round2(current - previous),
    growthRate: round2(g * 100),
    annualizedGrowth: round2(g > -1 ? (Math.pow(1 + g, ppy) - 1) * 100 : -100),
  };
};

export const fin2EquityValuationCustomCalculators: Record<string, CustomCalculator> = {
  "dividend-discount-model-calculator": dividendDiscountModelCalculator,
  "graham-number-calculator": grahamNumberCalculator,
  "margin-of-safety-calculator": marginOfSafetyCalculator,
  "peg-ratio-calculator": pegRatioCalculator,
  "price-to-book-ratio-calculator": priceToBookCalculator,
  "price-to-cash-flow-ratio-calculator": priceToCashFlowCalculator,
  "price-to-sales-ratio-calculator": priceToSalesCalculator,
  "ebitda-multiple-calculator": ebitdaMultipleCalculator,
  "ev-to-sales-calculator": evToSalesCalculator,
  "year-over-year-growth-calculator": yearOverYearGrowthCalculator,
};
