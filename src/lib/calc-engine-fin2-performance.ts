/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 6 of 9 —
 * Investment Performance, Risk & Time Value (10 tools). See
 * calc-engine-fin2-investing.ts for the full batch context.
 *
 * The risk-adjusted ratios are deliberately different: the existing
 * sharpe-ratio-calculator divides excess return by total volatility;
 * Sortino uses only downside deviation, Treynor uses beta, the information
 * ratio measures return over a benchmark per unit of tracking error, and
 * Jensen's alpha is the return above what CAPM predicts.
 *
 *  - discountRate: the rate that grows PV into FV over n years at m
 *    compounding periods a year, its effective annual rate and the
 *    discount factor 1 ÷ (1 + r)^n.
 *  - hedgeRatio (incl. "Optimal Hedge Ratio"): hedged ÷ total exposure;
 *    minimum-variance h* = ρ·σs ÷ σf, contracts = h* × exposure ÷
 *    (futures price × multiplier), hedge effectiveness ρ².
 *  - informationRatio, jensensAlpha, sortinoRatio, treynorRatio.
 *  - valueAtRisk: parametric (normal) VaR = V(zσ√(t/252) − μt/252) and
 *    expected shortfall σ√(t/252)·φ(z) ÷ (1 − c) − μt/252.
 *  - perpetuity: C ÷ (r − g), × (1 + r) when payments start today.
 *  - pvifa: (1 − (1 + r)^−n) ÷ r (× (1 + r) for an annuity due), FVIFA
 *    and the PV of a payment stream.
 *  - ttm: trailing twelve months from 4 quarters, or last fiscal year +
 *    this YTD − last year's YTD; TTM P/E with a share price.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-performance-calculators.ts for the copy.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- 1. Discount Rate Calculator -------------------------------------------------------
export const discountRateCalculator: CustomCalculator = (values) => {
  const pv = pos(values.presentValue, 10000);
  const fv = pos(values.futureValue, 15000);
  const years = pos(values.years, 5);
  const m = Math.max(1, num(values.compoundingPerYear, 1));
  const periodic = pv > 0 && fv > 0 && years > 0 ? Math.pow(fv / pv, 1 / (years * m)) - 1 : 0;
  const nominal = periodic * m;
  const ear = Math.pow(1 + periodic, m) - 1;
  return {
    discountRate: round4(nominal * 100),
    effectiveAnnualRate: round4(ear * 100),
    discountFactor: round4(pv > 0 && fv > 0 ? pv / fv : 0),
    oneYearDiscountFactor: round4(1 / (1 + ear)),
  };
};

// --- 2. Hedge Ratio Calculator ---------------------------------------------------------
export const hedgeRatioCalculator: CustomCalculator = (values) => {
  const exposure = pos(values.exposureValue, 1000000);
  const hedged = pos(values.hedgedValue, 600000);
  const rho = clamp(num(values.correlation, 0.9), -1, 1);
  const ss = pos(values.spotVolatility, 20);
  const sf = pos(values.futuresVolatility, 22);
  const fp = pos(values.futuresPrice, 5000);
  const mult = pos(values.contractMultiplier, 50);
  const hStar = sf > 0 ? (rho * ss) / sf : 0;
  const contracts = fp * mult > 0 ? (hStar * exposure) / (fp * mult) : 0;
  return {
    hedgeRatio: round2(exposure > 0 ? (hedged / exposure) * 100 : 0),
    unhedgedExposure: round2(Math.max(0, exposure - hedged)),
    optimalHedgeRatio: round4(hStar),
    optimalContracts: Math.round(contracts),
    hedgeEffectiveness: round2(rho * rho * 100),
  };
};

// --- 3. Information Ratio Calculator ---------------------------------------------------
export const informationRatioCalculator: CustomCalculator = (values) => {
  const rp = num(values.portfolioReturn, 11);
  const rb = num(values.benchmarkReturn, 9);
  const te = pos(values.trackingError, 4);
  return {
    activeReturn: round2(rp - rb),
    informationRatio: round4(te > 0 ? (rp - rb) / te : 0),
  };
};

// --- 4. Jensen's Alpha Calculator ------------------------------------------------------
export const jensensAlphaCalculator: CustomCalculator = (values) => {
  const rp = num(values.portfolioReturn, 12);
  const rf = num(values.riskFreeRate, 4);
  const beta = num(values.beta, 1.1);
  const rm = num(values.marketReturn, 10);
  const expected = rf + beta * (rm - rf);
  return {
    capmExpectedReturn: round2(expected),
    jensensAlpha: round2(rp - expected),
    marketRiskPremium: round2(rm - rf),
  };
};

// --- 5. Sortino Ratio Calculator -------------------------------------------------------
export const sortinoRatioCalculator: CustomCalculator = (values) => {
  const rp = num(values.portfolioReturn, 10);
  const target = num(values.targetReturn, 4);
  const dd = pos(values.downsideDeviation, 8);
  const sd = pos(values.standardDeviation, 0);
  return {
    excessReturn: round2(rp - target),
    sortinoRatio: round4(dd > 0 ? (rp - target) / dd : 0),
    sharpeRatioForComparison: round4(sd > 0 ? (rp - target) / sd : 0),
  };
};

// --- 6. Treynor Ratio Calculator -------------------------------------------------------
export const treynorRatioCalculator: CustomCalculator = (values) => {
  const rp = num(values.portfolioReturn, 10);
  const rf = num(values.riskFreeRate, 4);
  const beta = num(values.beta, 1.2);
  const rm = num(values.marketReturn, 0);
  return {
    excessReturn: round2(rp - rf),
    treynorRatio: round4(beta !== 0 ? (rp - rf) / beta : 0),
    marketTreynor: round4(rm !== 0 ? rm - rf : 0),
  };
};

// --- 7. Value at Risk Calculator -------------------------------------------------------
const Z: Record<number, number> = { 90: 1.2816, 95: 1.6449, 97.5: 1.96, 99: 2.3263 };

export const valueAtRiskCalculator: CustomCalculator = (values) => {
  const value = pos(values.portfolioValue, 1000000);
  const mu = num(values.expectedReturn, 7) / 100;
  const sigma = pos(values.volatility, 18) / 100;
  const c = num(values.confidence, 95);
  const z = Z[c] ?? 1.6449;
  const days = pos(values.horizonDays, 1);
  const t = days / 252;
  const sd = sigma * Math.sqrt(t);
  const drift = mu * t;
  const varPct = Math.max(0, z * sd - drift);
  const phi = Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI);
  const esPct = Math.max(0, (sd * phi) / (1 - c / 100) - drift);
  return {
    valueAtRisk: round2(value * varPct),
    valueAtRiskPct: round2(varPct * 100),
    expectedShortfall: round2(value * esPct),
    horizonVolatility: round2(sd * 100),
  };
};

// --- 8. Perpetuity Calculator ----------------------------------------------------------
export const perpetuityCalculator: CustomCalculator = (values) => {
  const c = pos(values.payment, 1000);
  const r = num(values.discountRate, 5) / 100;
  const g = num(values.growthRate, 0) / 100;
  const due = num(values.timing, 1) === 2;
  const valid = r > g;
  const pv = valid ? (c / (r - g)) * (due ? 1 + r : 1) : 0;
  return {
    presentValue: round2(pv),
    valid: valid ? 1 : 0,
    impliedYield: round2(pv > 0 ? (c / pv) * 100 : 0),
  };
};

// --- 9. PVIFA Calculator ---------------------------------------------------------------
export const pvifaCalculator: CustomCalculator = (values) => {
  const r = num(values.rate, 6) / 100;
  const n = pos(values.periods, 10);
  const due = num(values.timing, 1) === 2;
  const pmt = pos(values.payment, 0);
  const g = Math.pow(1 + r, n);
  const pvifa = (r === 0 ? n : (1 - 1 / g) / r) * (due ? 1 + r : 1);
  const fvifa = (r === 0 ? n : (g - 1) / r) * (due ? 1 + r : 1);
  return {
    pvifa: round4(pvifa),
    fvifa: round4(fvifa),
    presentValueOfPayments: round2(pmt * pvifa),
    futureValueOfPayments: round2(pmt * fvifa),
  };
};

// --- 10. TTM Calculator ----------------------------------------------------------------
export const ttmCalculator: CustomCalculator = (values) => {
  const mode = num(values.method, 1);
  let ttm: number;
  let latest = num(values.quarter4, 0);
  if (mode === 2) {
    ttm = num(values.lastFiscalYear, 0) + num(values.currentYtd, 0) - num(values.priorYtd, 0);
    latest = 0;
  } else ttm = num(values.quarter1, 0) + num(values.quarter2, 0) + num(values.quarter3, 0) + num(values.quarter4, 0);
  const shares = pos(values.sharesOutstanding, 0);
  const price = pos(values.sharePrice, 0);
  const eps = shares > 0 ? ttm / shares : 0;
  return {
    ttmValue: round2(ttm),
    averagePerQuarter: round2(ttm / 4),
    runRateFromLatestQuarter: round2(latest * 4),
    ttmPerShare: round2(eps),
    ttmPriceMultiple: round2(eps > 0 && price > 0 ? price / eps : 0),
  };
};

export const fin2PerformanceCustomCalculators: Record<string, CustomCalculator> = {
  "discount-rate-calculator": discountRateCalculator,
  "hedge-ratio-calculator": hedgeRatioCalculator,
  "information-ratio-calculator": informationRatioCalculator,
  "jensens-alpha-calculator": jensensAlphaCalculator,
  "sortino-ratio-calculator": sortinoRatioCalculator,
  "treynor-ratio-calculator": treynorRatioCalculator,
  "value-at-risk-calculator": valueAtRiskCalculator,
  "perpetuity-calculator": perpetuityCalculator,
  "pvifa-calculator": pvifaCalculator,
  "ttm-calculator": ttmCalculator,
};
