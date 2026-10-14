/**
 * Batch: "Finance Calculators expansion 3" (14 Oct 2026), sub-batch 10 of
 * 10 — Macroeconomics: Money, Banking & Policy (9 tools). See
 * calc-engine-fin3-derivatives-tax.ts for the full batch context.
 *
 *  - lcr: Basel III liquidity coverage ratio — HQLA (Level 1 at 100%,
 *    2A at 85%, 2B at 50%; 2B ≤ 15% and all Level 2 ≤ 40% of HQLA) ÷ net
 *    cash outflows over 30 days; ≥ 100% required.
 *  - nsfr: Basel III net stable funding ratio — available stable funding ÷
 *    required stable funding with the standard ASF/RSF factors; ≥ 100%.
 *    Different from lcr: a one-year structural measure, not a 30-day
 *    stress test.
 *  - moneyMultiplier (incl. "Money Supply" and "Reserve Ratio"): 1 ÷ rr, or
 *    (1 + c) ÷ (rr + c) with a currency ratio; money supply = base ×
 *    multiplier; required and excess reserves.
 *  - naturalRateOfUnemployment: (frictional + structural) ÷ labour force,
 *    cyclical unemployment.
 *  - okunsLaw: Δu = −(g − g*) ÷ k, or the output gap −β(u − u*).
 *  - phillipsCurve: expectations-augmented π = πe − β(u − u*) + shock.
 *  - priceElasticityOfSupply: midpoint or simple % change.
 *  - taylorRule: i = r* + π + a(π − π*) + b(output gap).
 *  - velocityOfMoney: V = P·Y ÷ M (MV = PY), or the price level implied.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin3-macro2-calculators.ts for the copy.
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

// --- 1. LCR Calculator -----------------------------------------------------------------
export const lcrCalculator: CustomCalculator = (values) => {
  const l1 = pos(values.level1Assets, 600);
  let l2a = pos(values.level2aAssets, 200) * 0.85;
  let l2b = pos(values.level2bAssets, 100) * 0.5;
  const outflows = pos(values.netCashOutflows, 700);
  // Level 2B ≤ 15% of HQLA → ≤ 15/85 of (L1 + L2A); all Level 2 ≤ 40% → ≤ 2/3 of L1.
  l2b = Math.min(l2b, (15 / 85) * (l1 + l2a));
  const l2cap = (2 / 3) * l1;
  if (l2a + l2b > l2cap) {
    const scale = l2cap / (l2a + l2b);
    l2a *= scale;
    l2b *= scale;
  }
  const hqla = l1 + l2a + l2b;
  const lcr = outflows > 0 ? hqla / outflows : 0;
  return {
    hqla: round2(hqla),
    level2Included: round2(l2a + l2b),
    lcr: round2(lcr * 100),
    meetsMinimum: lcr >= 1 ? 1 : 0,
    surplusOrShortfall: round2(hqla - outflows),
  };
};

// --- 2. NSFR Calculator ----------------------------------------------------------------
export const nsfrCalculator: CustomCalculator = (values) => {
  const asf =
    pos(values.regulatoryCapital, 120) * 1 + pos(values.stableRetailDeposits, 400) * 0.95 + pos(values.lessStableRetailDeposits, 250) * 0.9 +
    pos(values.wholesaleFundingOver1y, 150) * 1 + pos(values.wholesaleFundingNonFinancialUnder1y, 100) * 0.5;
  const rsf =
    pos(values.cashAndReserves, 60) * 0 + pos(values.level1Securities, 150) * 0.05 + pos(values.shortTermLoansToFinancials, 50) * 0.15 +
    pos(values.residentialMortgages, 350) * 0.65 + pos(values.otherLoansOver1y, 300) * 0.85 + pos(values.otherAssets, 80) * 1;
  const nsfr = rsf > 0 ? asf / rsf : 0;
  return {
    availableStableFunding: round2(asf),
    requiredStableFunding: round2(rsf),
    nsfr: round2(nsfr * 100),
    meetsMinimum: nsfr >= 1 ? 1 : 0,
  };
};

// --- 3. Money Multiplier Calculator ----------------------------------------------------
export const moneyMultiplierCalculator: CustomCalculator = (values) => {
  const rr = pos(values.reserveRatio, 10) / 100;
  const c = pos(values.currencyRatio, 0) / 100;
  const base = pos(values.monetaryBase, 1000);
  const deposits = pos(values.deposits, 5000);
  const reserves = pos(values.reservesHeld, 600);
  const simple = rr > 0 ? 1 / rr : 0;
  const mult = rr + c > 0 ? (1 + c) / (rr + c) : 0;
  return {
    simpleMultiplier: round4(simple),
    moneyMultiplier: round4(mult),
    moneySupply: round2(base * mult),
    requiredReserves: round2(deposits * rr),
    excessReserves: round2(reserves - deposits * rr),
    actualReserveRatio: round2(deposits > 0 ? (reserves / deposits) * 100 : 0),
  };
};

// --- 4. Natural Rate of Unemployment Calculator ----------------------------------------
export const naturalRateOfUnemploymentCalculator: CustomCalculator = (values) => {
  const frictional = pos(values.frictionalUnemployed, 3.5);
  const structural = pos(values.structuralUnemployed, 3);
  const actual = pos(values.totalUnemployed, 7.4);
  const lf = pos(values.laborForce, 170);
  const natural = lf > 0 ? ((frictional + structural) / lf) * 100 : 0;
  const rate = lf > 0 ? (actual / lf) * 100 : 0;
  return {
    naturalRate: round2(natural),
    actualRate: round2(rate),
    cyclicalUnemploymentRate: round2(rate - natural),
    cyclicallyUnemployed: round2(Math.max(0, actual - frictional - structural)),
  };
};

// --- 5. Okun's Law Calculator ----------------------------------------------------------
export const okunsLawCalculator: CustomCalculator = (values) => {
  const g = num(values.actualGrowth, 1);
  const gStar = num(values.potentialGrowth, 2);
  const k = pos(values.okunCoefficient, 2);
  const u = num(values.unemploymentRate, 5);
  const uStar = num(values.naturalRate, 4.2);
  return {
    unemploymentChange: round2(k > 0 ? -(g - gStar) / k : 0),
    outputGapFromUnemployment: round2(-k * (u - uStar)),
    lostOutputPct: round2(Math.max(0, k * (u - uStar))),
  };
};

// --- 6. Phillips Curve Calculator ------------------------------------------------------
export const phillipsCurveCalculator: CustomCalculator = (values) => {
  const expected = num(values.expectedInflation, 2.5);
  const beta = pos(values.sensitivity, 0.5);
  const u = num(values.unemploymentRate, 3.8);
  const uStar = num(values.naturalRate, 4.2);
  const shock = num(values.supplyShock, 0);
  const pi = expected - beta * (u - uStar) + shock;
  return {
    predictedInflation: round2(pi),
    unemploymentGap: round2(u - uStar),
    demandPullInflation: round2(-beta * (u - uStar)),
  };
};

// --- 7. Price Elasticity of Supply Calculator ------------------------------------------
export const priceElasticityOfSupplyCalculator: CustomCalculator = (values) => {
  const p1 = pos(values.initialPrice, 20);
  const p2 = pos(values.newPrice, 24);
  const q1 = pos(values.initialQuantity, 500);
  const q2 = pos(values.newQuantity, 580);
  const mid = num(values.method, 1) === 1;
  const dq = (q2 - q1) / (mid ? (q1 + q2) / 2 : q1);
  const dp = (p2 - p1) / (mid ? (p1 + p2) / 2 : p1);
  const e = dp !== 0 && Number.isFinite(dq) ? dq / dp : 0;
  const a = Math.abs(e);
  return {
    pctChangeQuantity: round2(dq * 100),
    pctChangePrice: round2(dp * 100),
    elasticityOfSupply: round4(e),
    // 1 elastic, 2 unit elastic, 3 inelastic, 4 perfectly inelastic
    classification: a === 0 ? 4 : Math.abs(a - 1) < 0.005 ? 2 : a > 1 ? 1 : 3,
  };
};

// --- 8. Taylor Rule Calculator ---------------------------------------------------------
export const taylorRuleCalculator: CustomCalculator = (values) => {
  const rStar = num(values.neutralRealRate, 1);
  const pi = num(values.inflation, 3);
  const target = num(values.inflationTarget, 2);
  const gap = num(values.outputGap, -0.5);
  const a = pos(values.inflationWeight, 0.5);
  const b = pos(values.outputWeight, 0.5);
  const actual = num(values.currentPolicyRate, 0);
  const rate = rStar + pi + a * (pi - target) + b * gap;
  return {
    taylorRate: round2(rate),
    inflationTerm: round2(a * (pi - target)),
    outputTerm: round2(b * gap),
    gapVsActual: round2(actual !== 0 ? actual - rate : 0),
  };
};

// --- 9. Velocity of Money Calculator ---------------------------------------------------
export const velocityOfMoneyCalculator: CustomCalculator = (values) => {
  const gdp = pos(values.nominalGdp, 29200);
  const m = pos(values.moneySupply, 21500);
  const realGdp = pos(values.realGdp, 0);
  const v = m > 0 ? gdp / m : 0;
  return {
    velocity: round4(v),
    priceLevel: round4(realGdp > 0 ? gdp / realGdp : 0),
    daysPerTurnover: round2(v > 0 ? 365 / v : 0),
  };
};

export const fin3Macro2CustomCalculators: Record<string, CustomCalculator> = {
  "lcr-calculator": lcrCalculator,
  "nsfr-calculator": nsfrCalculator,
  "money-multiplier-calculator": moneyMultiplierCalculator,
  "natural-rate-of-unemployment-calculator": naturalRateOfUnemploymentCalculator,
  "okuns-law-calculator": okunsLawCalculator,
  "phillips-curve-calculator": phillipsCurveCalculator,
  "price-elasticity-of-supply-calculator": priceElasticityOfSupplyCalculator,
  "taylor-rule-calculator": taylorRuleCalculator,
  "velocity-of-money-calculator": velocityOfMoneyCalculator,
};
