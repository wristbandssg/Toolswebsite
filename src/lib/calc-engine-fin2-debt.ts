/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 9 of 9 —
 * Debt, Bonds & Credit Risk (9 tools). See calc-engine-fin2-investing.ts
 * for the full batch context.
 *
 * The three leverage ratios are deliberately separate (each is its own
 * standard ratio and keyword): debt-to-asset = total liabilities (or debt)
 * ÷ total assets; debt-to-capital = debt ÷ (debt + equity); debt-to-equity
 * = liabilities (or debt) ÷ equity.
 *
 *  - altmanZScore: original Z (public manufacturers; zones 2.99 / 1.81),
 *    Z' (private firms, book equity; 2.9 / 1.23) and Z'' (non-
 *    manufacturers; 2.6 / 1.1).
 *  - bondPrice: PV of coupons + face at the YTM, with m payments a year;
 *    premium/discount, current yield. The existing bond-yield-to-maturity-
 *    calculator goes the other way (price -> yield).
 *  - creditSpread: bond yield − benchmark yield in % and bps, with the
 *    implied yearly default probability ≈ spread ÷ (1 − recovery).
 *  - defensiveIntervalRatio: (cash + securities + receivables) ÷ daily
 *    cash operating expenses.
 *  - effectiveDuration: (P− − P+) ÷ (2·P0·Δy), effective convexity
 *    (P− + P+ − 2P0) ÷ (P0·Δy²), and the estimated price change. The
 *    existing interest-rate-sensitivity-calculator covers Macaulay/modified
 *    duration from cash flows.
 *  - lgd: loss given default = 1 − net recovery ÷ EAD (collateral after
 *    haircut + other recoveries − costs); expected loss = PD × LGD × EAD.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-debt-calculators.ts for the copy.
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

// --- 1. Altman Z-Score Calculator ------------------------------------------------------
export const altmanZScoreCalculator: CustomCalculator = (values) => {
  const model = num(values.model, 1);
  const ta = pos(values.totalAssets, 10000000);
  const tl = pos(values.totalLiabilities, 6000000);
  const a = ta > 0 ? num(values.workingCapital, 1500000) / ta : 0;
  const b = ta > 0 ? num(values.retainedEarnings, 2500000) / ta : 0;
  const c = ta > 0 ? num(values.ebit, 1000000) / ta : 0;
  const d = tl > 0 ? num(values.equityValue, 8000000) / tl : 0;
  const e = ta > 0 ? pos(values.sales, 12000000) / ta : 0;
  let z: number;
  let safe: number;
  let distress: number;
  if (model === 2) {
    z = 0.717 * a + 0.847 * b + 3.107 * c + 0.42 * d + 0.998 * e;
    safe = 2.9;
    distress = 1.23;
  } else if (model === 3) {
    z = 6.56 * a + 3.26 * b + 6.72 * c + 1.05 * d;
    safe = 2.6;
    distress = 1.1;
  } else {
    z = 1.2 * a + 1.4 * b + 3.3 * c + 0.6 * d + 1.0 * e;
    safe = 2.99;
    distress = 1.81;
  }
  return {
    zScore: round2(z),
    // 1 safe, 2 grey, 3 distress
    zone: z > safe ? 1 : z >= distress ? 2 : 3,
    safeAbove: safe,
    distressBelow: distress,
  };
};

// --- 2. Bond Price Calculator ----------------------------------------------------------
export const bondPriceCalculator: CustomCalculator = (values) => {
  const face = pos(values.faceValue, 1000);
  const cr = pos(values.couponRate, 5) / 100;
  const y = num(values.yieldToMaturity, 6) / 100;
  const years = pos(values.yearsToMaturity, 10);
  const m = Math.max(1, num(values.paymentsPerYear, 2));
  const n = Math.round(years * m);
  const c = (face * cr) / m;
  const i = y / m;
  let price = 0;
  for (let k = 1; k <= n; k++) price += c / Math.pow(1 + i, k);
  price += face / Math.pow(1 + i, n);
  return {
    bondPrice: round2(price),
    pricePctOfPar: round2(face > 0 ? (price / face) * 100 : 0),
    couponPayment: round2(c),
    annualCoupon: round2(face * cr),
    currentYield: round2(price > 0 ? ((face * cr) / price) * 100 : 0),
    // 1 premium, 2 par, 3 discount
    pricedAt: Math.abs(price - face) < 0.005 ? 2 : price > face ? 1 : 3,
  };
};

// --- 3. Credit Spread Calculator -------------------------------------------------------
export const creditSpreadCalculator: CustomCalculator = (values) => {
  const by = num(values.bondYield, 6.2);
  const ty = num(values.benchmarkYield, 4.3);
  const rec = clamp(pos(values.recoveryRate, 40), 0, 99) / 100;
  const spread = by - ty;
  return {
    creditSpread: round2(spread),
    spreadBasisPoints: Math.round(spread * 100),
    impliedDefaultProbability: round2(Math.max(0, spread) / (1 - rec)),
  };
};

// --- 4. Debt to Asset Ratio Calculator -------------------------------------------------
export const debtToAssetRatioCalculator: CustomCalculator = (values) => {
  const liabilities = pos(values.totalLiabilities, 450000);
  const debt = pos(values.totalDebt, 0);
  const assets = pos(values.totalAssets, 1000000);
  return {
    debtToAssetRatio: round2(assets > 0 ? (liabilities / assets) * 100 : 0),
    debtOnlyToAssets: round2(assets > 0 && debt > 0 ? (debt / assets) * 100 : 0),
    equityRatio: round2(assets > 0 ? ((assets - liabilities) / assets) * 100 : 0),
    equity: round2(assets - liabilities),
  };
};

// --- 5. Debt-to-Capital Ratio Calculator -----------------------------------------------
export const debtToCapitalRatioCalculator: CustomCalculator = (values) => {
  const debt = pos(values.shortTermDebt, 100000) + pos(values.longTermDebt, 500000);
  const equity = num(values.shareholdersEquity, 900000);
  const capital = debt + equity;
  return {
    totalDebt: round2(debt),
    totalCapital: round2(capital),
    debtToCapital: round2(capital > 0 ? (debt / capital) * 100 : 0),
    debtToEquity: round2(equity > 0 ? debt / equity : 0),
  };
};

// --- 6. Debt to Equity Calculator ------------------------------------------------------
export const debtToEquityCalculator: CustomCalculator = (values) => {
  const st = pos(values.shortTermDebt, 100000);
  const lt = pos(values.longTermDebt, 500000);
  const other = pos(values.otherLiabilities, 200000);
  const equity = num(values.shareholdersEquity, 900000);
  const d = (x: number) => (equity > 0 ? round2(x / equity) : 0);
  return {
    totalLiabilitiesToEquity: d(st + lt + other),
    debtToEquity: d(st + lt),
    longTermDebtToEquity: d(lt),
  };
};

// --- 7. Defensive Interval Ratio Calculator --------------------------------------------
export const defensiveIntervalRatioCalculator: CustomCalculator = (values) => {
  const liquid = pos(values.cash, 150000) + pos(values.marketableSecurities, 50000) + pos(values.receivables, 100000);
  const opex = pos(values.annualOperatingExpenses, 1460000);
  const nonCash = pos(values.nonCashExpenses, 0);
  const daily = Math.max(0, opex - nonCash) / 365;
  return {
    defensiveAssets: round2(liquid),
    dailyCashExpenses: round2(daily),
    defensiveIntervalDays: round2(daily > 0 ? liquid / daily : 0),
  };
};

// --- 8. Effective Duration Calculator --------------------------------------------------
export const effectiveDurationCalculator: CustomCalculator = (values) => {
  const p0 = pos(values.initialPrice, 1000);
  const pDown = pos(values.priceIfYieldsFall, 1045);
  const pUp = pos(values.priceIfYieldsRise, 958);
  const dy = pos(values.yieldShiftBps, 50) / 10000;
  const shock = num(values.rateChangeBps, 100) / 10000;
  const dur = p0 > 0 && dy > 0 ? (pDown - pUp) / (2 * p0 * dy) : 0;
  const conv = p0 > 0 && dy > 0 ? (pDown + pUp - 2 * p0) / (p0 * dy * dy) : 0;
  const change = -dur * shock + 0.5 * conv * shock * shock;
  return {
    effectiveDuration: round4(dur),
    effectiveConvexity: round2(conv),
    estimatedPriceChangePct: round2(change * 100),
    estimatedNewPrice: round2(p0 * (1 + change)),
  };
};

// --- 9. LGD Calculator -----------------------------------------------------------------
export const lgdCalculator: CustomCalculator = (values) => {
  const ead = pos(values.exposureAtDefault, 500000);
  const collateral = pos(values.collateralValue, 300000) * (1 - clamp(pos(values.haircut, 25), 0, 100) / 100);
  const recovery = Math.max(0, collateral + pos(values.otherRecoveries, 20000) - pos(values.recoveryCosts, 15000));
  const loss = Math.max(0, ead - recovery);
  const lgd = ead > 0 ? loss / ead : 0;
  const pd = clamp(pos(values.probabilityOfDefault, 2), 0, 100) / 100;
  return {
    netRecovery: round2(Math.min(recovery, ead)),
    recoveryRate: round2(ead > 0 ? (Math.min(recovery, ead) / ead) * 100 : 0),
    lossGivenDefault: round2(loss),
    lgdPercent: round2(lgd * 100),
    expectedLoss: round2(pd * lgd * ead),
  };
};

export const fin2DebtCustomCalculators: Record<string, CustomCalculator> = {
  "altman-z-score-calculator": altmanZScoreCalculator,
  "bond-price-calculator": bondPriceCalculator,
  "credit-spread-calculator": creditSpreadCalculator,
  "debt-to-asset-ratio-calculator": debtToAssetRatioCalculator,
  "debt-to-capital-ratio-calculator": debtToCapitalRatioCalculator,
  "debt-to-equity-calculator": debtToEquityCalculator,
  "defensive-interval-ratio-calculator": defensiveIntervalRatioCalculator,
  "effective-duration-calculator": effectiveDurationCalculator,
  "lgd-calculator": lgdCalculator,
};
