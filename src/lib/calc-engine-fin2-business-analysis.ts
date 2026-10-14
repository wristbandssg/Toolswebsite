/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 5 of 9 —
 * Business Analysis & Valuation (10 tools). See
 * calc-engine-fin2-investing.ts for the full batch context.
 *
 *  - additionalFundsNeeded: AFN = (A* ÷ S0)·ΔS − (L* ÷ S0)·ΔS − M·S1·b.
 *  - evm: earned value management — PV, EV, CV, SV, CPI, SPI, EAC
 *    (BAC ÷ CPI), ETC, VAC and TCPI.
 *  - emv: expected monetary value Σ p × impact over up to 5 outcomes
 *    (risks negative, opportunities positive). Different from the existing
 *    expected-value-calculator (a bet's EV from odds).
 *  - hhi: Σ share² for up to 10 firms, CR4, merger ΔHHI = 2·s1·s2 and the
 *    2023 US Merger Guidelines bands (> 1,800 highly concentrated; a
 *    merger raising it by > 100 into that band is presumed to harm
 *    competition).
 *  - lernerIndex: (P − MC) ÷ P, implied elasticity −1 ÷ L, and the
 *    profit-maximising price MC × E ÷ (1 + E) from an elasticity.
 *  - operatingAssetTurnover: revenue ÷ average operating assets (total
 *    assets less cash above needs and investments).
 *  - prePostMoneyValuation: post = pre + investment, ownership, price per
 *    share and new shares, with an optional option pool created in the
 *    pre-money (which lowers the effective pre-money).
 *  - pvgo: P − E1 ÷ r, the share of the price that is growth.
 *  - expectedUtility: CRRA utility u(w) = w^(1−γ) ÷ (1−γ) (log at γ = 1)
 *    over up to 4 outcomes; certainty equivalent and risk premium.
 *  - nopat: EBIT × (1 − t), cross-checked from net income + after-tax
 *    interest.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-business-analysis-calculators.ts for the copy.
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

// --- 1. Additional Funds Needed Calculator ---------------------------------------------
export const additionalFundsNeededCalculator: CustomCalculator = (values) => {
  const s0 = pos(values.currentSales, 5000000);
  const g = num(values.salesGrowth, 20) / 100;
  const assets = pos(values.salesLinkedAssets, 3000000);
  const liabs = pos(values.spontaneousLiabilities, 500000);
  const margin = num(values.profitMargin, 6) / 100;
  const payout = clamp(pos(values.payoutRatio, 40), 0, 100) / 100;
  const ds = s0 * g;
  const s1 = s0 + ds;
  const assetInc = s0 > 0 ? (assets / s0) * ds : 0;
  const liabInc = s0 > 0 ? (liabs / s0) * ds : 0;
  const retained = margin * s1 * (1 - payout);
  return {
    salesIncrease: round2(ds),
    projectedSales: round2(s1),
    requiredAssetIncrease: round2(assetInc),
    spontaneousLiabilityIncrease: round2(liabInc),
    addedRetainedEarnings: round2(retained),
    additionalFundsNeeded: round2(assetInc - liabInc - retained),
  };
};

// --- 2. EVM Calculator -----------------------------------------------------------------
export const evmCalculator: CustomCalculator = (values) => {
  const bac = pos(values.budgetAtCompletion, 500000);
  const plannedPct = clamp(pos(values.plannedPercent, 50), 0, 100) / 100;
  const actualPct = clamp(pos(values.actualPercent, 40), 0, 100) / 100;
  const ac = pos(values.actualCost, 220000);
  const pv = bac * plannedPct;
  const ev = bac * actualPct;
  const cpi = ac > 0 ? ev / ac : 0;
  const spi = pv > 0 ? ev / pv : 0;
  const eac = cpi > 0 ? bac / cpi : 0;
  return {
    plannedValue: round2(pv),
    earnedValue: round2(ev),
    costVariance: round2(ev - ac),
    scheduleVariance: round2(ev - pv),
    cpi: round4(cpi),
    spi: round4(spi),
    estimateAtCompletion: round2(eac),
    estimateToComplete: round2(eac - ac),
    varianceAtCompletion: round2(bac - eac),
    tcpi: round4(bac - ac !== 0 ? (bac - ev) / (bac - ac) : 0),
  };
};

// --- 3. EMV Calculator -----------------------------------------------------------------
export const emvCalculator: CustomCalculator = (values) => {
  let emv = 0;
  let probs = 0;
  let best = -Infinity;
  let worst = Infinity;
  let count = 0;
  for (let k = 1; k <= 5; k++) {
    const p = clamp(pos(values[`probability${k}`], 0), 0, 100) / 100;
    const v = num(values[`impact${k}`], 0);
    if (p === 0) continue;
    count++;
    emv += p * v;
    probs += p;
    best = Math.max(best, v);
    worst = Math.min(worst, v);
  }
  return {
    expectedMonetaryValue: round2(emv),
    totalProbability: round2(probs * 100),
    bestOutcome: round2(count ? best : 0),
    worstOutcome: round2(count ? worst : 0),
    outcomesCounted: count,
  };
};

// --- 4. HHI Calculator -----------------------------------------------------------------
export const hhiCalculator: CustomCalculator = (values) => {
  const shares: number[] = [];
  for (let k = 1; k <= 10; k++) {
    const s = clamp(pos(values[`share${k}`], 0), 0, 100);
    if (s > 0) shares.push(s);
  }
  const hhi = shares.reduce((a, s) => a + s * s, 0);
  const merge = num(values.mergeFirms1And2, 2) === 1;
  const delta = merge && shares.length >= 2 ? 2 * (pos(values.share1, 0) * pos(values.share2, 0)) : 0;
  const post = hhi + delta;
  const cr4 = [...shares].sort((a, b) => b - a).slice(0, 4).reduce((a, b) => a + b, 0);
  const band = (h: number) => (h > 1800 ? 3 : h >= 1000 ? 2 : 1);
  return {
    hhi: round2(hhi),
    // 1 unconcentrated (< 1,000), 2 moderately (1,000–1,800), 3 highly (> 1,800)
    concentration: band(hhi),
    cr4: round2(cr4),
    mergerDeltaHhi: round2(delta),
    postMergerHhi: round2(post),
    presumedAnticompetitive: merge && post > 1800 && delta > 100 ? 1 : 0,
    totalShareEntered: round2(shares.reduce((a, b) => a + b, 0)),
  };
};

// --- 5. Lerner Index Calculator --------------------------------------------------------
export const lernerIndexCalculator: CustomCalculator = (values) => {
  const p = pos(values.price, 50);
  const mc = pos(values.marginalCost, 30);
  const e = num(values.elasticity, 0);
  const l = p > 0 ? (p - mc) / p : 0;
  return {
    lernerIndex: round4(l),
    markupOverCost: round2(mc > 0 ? (p / mc - 1) * 100 : 0),
    impliedElasticity: round4(l > 0 ? -1 / l : 0),
    optimalPriceFromElasticity: round2(e < -1 ? (mc * e) / (1 + e) : 0),
  };
};

// --- 6. Operating Asset Turnover Calculator --------------------------------------------
export const operatingAssetTurnoverCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.revenue, 12000000);
  const total = pos(values.totalAssets, 9000000);
  const nonOp = Math.min(total, pos(values.nonOperatingAssets, 1500000));
  const prior = pos(values.priorOperatingAssets, 0);
  const op = total - nonOp;
  const avg = prior > 0 ? (op + prior) / 2 : op;
  return {
    operatingAssets: round2(op),
    averageOperatingAssets: round2(avg),
    operatingAssetTurnover: round2(avg > 0 ? revenue / avg : 0),
    totalAssetTurnover: round2(total > 0 ? revenue / total : 0),
    daysToTurnAssets: round2(revenue > 0 ? (avg / revenue) * 365 : 0),
  };
};

// --- 7. Pre and Post Money Valuation Calculator ----------------------------------------
export const prePostMoneyValuationCalculator: CustomCalculator = (values) => {
  const inv = pos(values.investment, 2000000);
  const pre = pos(values.preMoneyValuation, 8000000);
  const existing = pos(values.existingShares, 10000000);
  const pool = clamp(pos(values.optionPoolPercent, 0), 0, 50) / 100;
  const post = pre + inv;
  const investorPct = post > 0 ? inv / post : 0;
  const totalShares = 1 - investorPct - pool > 0 ? existing / (1 - investorPct - pool) : 0;
  const investorShares = totalShares * investorPct;
  const price = investorShares > 0 ? inv / investorShares : 0;
  return {
    postMoneyValuation: round2(post),
    investorOwnership: round2(investorPct * 100),
    existingHoldersOwnership: round2(totalShares > 0 ? (existing / totalShares) * 100 : 0),
    optionPoolOwnership: round2(pool * 100),
    pricePerShare: Math.round(price * 10000) / 10000,
    newSharesIssued: Math.round(investorShares),
    effectivePreMoney: round2(price * existing),
  };
};

// --- 8. PVGO Calculator ----------------------------------------------------------------
export const pvgoCalculator: CustomCalculator = (values) => {
  const price = pos(values.sharePrice, 60);
  const eps = num(values.nextYearEps, 3);
  const r = num(values.costOfEquity, 9) / 100;
  const noGrowth = r > 0 ? eps / r : 0;
  const pvgo = price - noGrowth;
  return {
    noGrowthValue: round2(noGrowth),
    pvgo: round2(pvgo),
    pvgoShareOfPrice: round2(price > 0 ? (pvgo / price) * 100 : 0),
    earningsYield: round2(price > 0 ? (eps / price) * 100 : 0),
  };
};

// --- 9. Expected Utility Calculator ----------------------------------------------------
export const expectedUtilityCalculator: CustomCalculator = (values) => {
  const g = pos(values.riskAversion, 1);
  const u = (w: number) => (Math.abs(g - 1) < 1e-9 ? Math.log(w) : Math.pow(w, 1 - g) / (1 - g));
  const uInv = (x: number) => (Math.abs(g - 1) < 1e-9 ? Math.exp(x) : Math.pow(x * (1 - g), 1 / (1 - g)));
  let ev = 0;
  let eu = 0;
  let probs = 0;
  for (let k = 1; k <= 4; k++) {
    const p = clamp(pos(values[`probability${k}`], 0), 0, 100) / 100;
    const w = Math.max(0.01, pos(values[`outcome${k}`], 0));
    if (p === 0) continue;
    probs += p;
    ev += p * w;
    eu += p * u(w);
  }
  if (probs > 0) {
    ev /= probs;
    eu /= probs;
  }
  const ce = probs > 0 ? uInv(eu) : 0;
  return {
    expectedValue: round2(ev),
    expectedUtility: round4(eu),
    certaintyEquivalent: round2(ce),
    riskPremium: round2(ev - ce),
    totalProbability: round2(probs * 100),
  };
};

// --- 10. NOPAT Calculator --------------------------------------------------------------
export const nopatCalculator: CustomCalculator = (values) => {
  const ebit = num(values.ebit, 1500000);
  const t = clamp(pos(values.taxRate, 25), 0, 100) / 100;
  const ni = num(values.netIncome, 0);
  const interest = pos(values.interestExpense, 0);
  const revenue = pos(values.revenue, 0);
  const nopat = ebit * (1 - t);
  return {
    taxOnEbit: round2(ebit * t),
    nopat: round2(nopat),
    nopatFromNetIncome: round2(ni !== 0 ? ni + interest * (1 - t) : 0),
    nopatMargin: round2(revenue > 0 ? (nopat / revenue) * 100 : 0),
  };
};

export const fin2BusinessAnalysisCustomCalculators: Record<string, CustomCalculator> = {
  "additional-funds-needed-calculator": additionalFundsNeededCalculator,
  "evm-calculator": evmCalculator,
  "emv-calculator": emvCalculator,
  "hhi-calculator": hhiCalculator,
  "lerner-index-calculator": lernerIndexCalculator,
  "operating-asset-turnover-calculator": operatingAssetTurnoverCalculator,
  "pre-and-post-money-valuation-calculator": prePostMoneyValuationCalculator,
  "pvgo-calculator": pvgoCalculator,
  "expected-utility-calculator": expectedUtilityCalculator,
  "nopat-calculator": nopatCalculator,
};
