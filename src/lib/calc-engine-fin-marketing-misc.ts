/**
 * Batch: "Finance Calculators — Business, Investment & Economics" (14 Oct
 * 2026), sub-batch 5 of 5 — Marketing Metrics & Everyday Money (10 tools).
 * See calc-engine-fin-valuation.ts for the full batch context.
 *
 * The four ad-metric tools are deliberately different: ROAS is revenue per
 * ad dollar (with break-even ROAS from your margin), CTR is clicks per
 * impression, CPC is cost per click (and the max CPC a target CPA allows),
 * and CPM is cost per 1,000 impressions (solve for CPM, budget or reach).
 *
 *  - roas: revenue ÷ ad spend, ACoS, break-even ROAS = 1 ÷ margin, profit
 *    after ads.
 *  - ctr: clicks ÷ impressions, clicks needed for a target CTR.
 *  - cpc: spend ÷ clicks, CPA, conversion rate, max CPC = target CPA × CVR.
 *  - cpm: solve for CPM, cost or impressions.
 *  - youtubeRevenue: views × monetized-playback share × advertiser CPM ÷
 *    1,000 × the creator's 55% share; effective RPM.
 *  - salesPercentage: share of total sales and growth vs a prior period.
 *  - nps: % promoters (9–10) − % detractors (0–6), promoters needed for a
 *    target score.
 *  - marginOfError: z·√(p(1 − p)/n) with a finite population correction,
 *    and the sample size needed for a target margin.
 *  - moneyCounter: US bills and coins counted in cents (no float drift).
 *  - zakat: 2.5% of net zakatable wealth when it reaches the nisab (85 g of
 *    gold or 595 g of silver at the prices entered).
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin-marketing-misc-calculators.ts for the copy.
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

// --- 1. ROAS Calculator ----------------------------------------------------------------
export const roasCalculator: CustomCalculator = (values) => {
  const revenue = pos(values.adRevenue, 15000);
  const spend = pos(values.adSpend, 3000);
  const margin = pos(values.grossMargin, 40) / 100;
  const roas = spend > 0 ? revenue / spend : 0;
  return {
    roas: round2(roas),
    roasPercent: round2(roas * 100),
    acos: round2(revenue > 0 ? (spend / revenue) * 100 : 0),
    breakEvenRoas: round2(margin > 0 ? 1 / margin : 0),
    profitAfterAdSpend: round2(revenue * margin - spend),
  };
};

// --- 2. CTR Calculator -----------------------------------------------------------------
export const ctrCalculator: CustomCalculator = (values) => {
  const clicks = pos(values.clicks, 250);
  const impressions = pos(values.impressions, 10000);
  const target = pos(values.targetCtr, 3) / 100;
  const needed = Math.ceil(impressions * target - 1e-9);
  return {
    ctr: round2(impressions > 0 ? (clicks / impressions) * 100 : 0),
    clicksAtTargetCtr: needed,
    additionalClicksNeeded: Math.max(0, needed - clicks),
    impressionsPerClick: round2(clicks > 0 ? impressions / clicks : 0),
  };
};

// --- 3. CPC Calculator -----------------------------------------------------------------
export const cpcCalculator: CustomCalculator = (values) => {
  const spend = pos(values.adSpend, 500);
  const clicks = pos(values.clicks, 400);
  const conversions = pos(values.conversions, 20);
  const targetCpa = pos(values.targetCpa, 0);
  const cvr = clicks > 0 ? conversions / clicks : 0;
  return {
    cpc: round2(clicks > 0 ? spend / clicks : 0),
    costPerConversion: round2(conversions > 0 ? spend / conversions : 0),
    conversionRate: round2(cvr * 100),
    maxCpcForTargetCpa: round2(targetCpa * cvr),
  };
};

// --- 4. CPM Calculator -----------------------------------------------------------------
export const cpmCalculator: CustomCalculator = (values) => {
  const solveFor = num(values.solveFor, 1); // 1 CPM, 2 cost, 3 impressions
  let cost = pos(values.cost, 2000);
  let impressions = pos(values.impressions, 250000);
  let cpm = pos(values.cpm, 8);
  if (solveFor === 2) cost = (cpm * impressions) / 1000;
  else if (solveFor === 3) impressions = cpm > 0 ? (cost / cpm) * 1000 : 0;
  else cpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
  return {
    cpm: round2(cpm),
    cost: round2(cost),
    impressions: Math.round(impressions),
    costPerImpression: Math.round((impressions > 0 ? cost / impressions : 0) * 100000) / 100000,
  };
};

// --- 5. YouTube Revenue Calculator -----------------------------------------------------
export const youtubeRevenueCalculator: CustomCalculator = (values) => {
  const daily = pos(values.dailyViews, 10000);
  const monetized = clamp(pos(values.monetizedPercent, 50), 0, 100) / 100;
  const cpm = pos(values.adCpm, 10);
  const share = clamp(pos(values.creatorShare, 55), 0, 100) / 100;
  const rpm = cpm * monetized * share;
  const perDay = (daily / 1000) * rpm;
  return {
    effectiveRpm: round2(rpm),
    dailyEarnings: round2(perDay),
    monthlyEarnings: round2(perDay * 30.4),
    yearlyEarnings: round2(perDay * 365),
    earningsPerMillionViews: round2(rpm * 1000),
  };
};

// --- 6. Sales Percentage Calculator ----------------------------------------------------
export const salesPercentageCalculator: CustomCalculator = (values) => {
  const part = pos(values.partSales, 25000);
  const total = pos(values.totalSales, 120000);
  const prior = pos(values.previousSales, 0);
  return {
    shareOfTotalSales: round2(total > 0 ? (part / total) * 100 : 0),
    restOfSales: round2(Math.max(0, total - part)),
    salesChange: round2(prior > 0 ? part - prior : 0),
    salesGrowth: round2(prior > 0 ? (part / prior - 1) * 100 : 0),
  };
};

// --- 7. NPS Calculator -----------------------------------------------------------------
export const npsCalculator: CustomCalculator = (values) => {
  const p = pos(values.promoters, 120);
  const pa = pos(values.passives, 50);
  const d = pos(values.detractors, 30);
  const t = num(values.targetNps, 50);
  const total = p + pa + d;
  const nps = total > 0 ? ((p - d) / total) * 100 : 0;
  const need = t < 100 && nps < t ? Math.ceil(((t * total) / 100 - p + d) / (1 - t / 100) - 1e-9) : 0;
  return {
    totalResponses: total,
    promoterPct: round2(total > 0 ? (p / total) * 100 : 0),
    passivePct: round2(total > 0 ? (pa / total) * 100 : 0),
    detractorPct: round2(total > 0 ? (d / total) * 100 : 0),
    nps: round2(nps),
    promotersNeededForTarget: Math.max(0, need),
  };
};

// --- 8. Margin of Error Calculator -----------------------------------------------------
const Z: Record<number, number> = { 80: 1.2816, 85: 1.4395, 90: 1.6449, 95: 1.96, 98: 2.3263, 99: 2.5758 };

export const marginOfErrorCalculator: CustomCalculator = (values) => {
  const n = pos(values.sampleSize, 1000);
  const z = Z[num(values.confidenceLevel, 95)] ?? 1.96;
  const p = clamp(pos(values.proportion, 50), 0, 100) / 100;
  const N = pos(values.populationSize, 0);
  const target = pos(values.targetMargin, 3) / 100;
  const fpc = N > 1 && n <= N ? Math.sqrt((N - n) / (N - 1)) : 1;
  const se = n > 0 ? Math.sqrt((p * (1 - p)) / n) * fpc : 0;
  const moe = z * se;
  const n0 = target > 0 ? (z * z * p * (1 - p)) / (target * target) : 0;
  const needed = N > 0 ? n0 / (1 + (n0 - 1) / N) : n0;
  return {
    marginOfError: round2(moe * 100),
    lowerBound: round2((p - moe) * 100),
    upperBound: round2((p + moe) * 100),
    standardError: round2(se * 100),
    sampleSizeForTarget: Math.ceil(needed - 1e-9),
  };
};

// --- 9. Money Counter Calculator -------------------------------------------------------
const BILLS: [string, number][] = [["b100", 10000], ["b50", 5000], ["b20", 2000], ["b10", 1000], ["b5", 500], ["b2", 200], ["b1", 100]];
const COINS: [string, number][] = [["c100", 100], ["c50", 50], ["c25", 25], ["c10", 10], ["c5", 5], ["c1", 1]];

export const moneyCounterCalculator: CustomCalculator = (values) => {
  let billCents = 0;
  let coinCents = 0;
  let billCount = 0;
  let coinCount = 0;
  for (const [k, cents] of BILLS) {
    const c = Math.round(pos(values[k], 0));
    billCents += c * cents;
    billCount += c;
  }
  for (const [k, cents] of COINS) {
    const c = Math.round(pos(values[k], 0));
    coinCents += c * cents;
    coinCount += c;
  }
  return {
    billsTotal: billCents / 100,
    coinsTotal: coinCents / 100,
    grandTotal: (billCents + coinCents) / 100,
    numberOfBills: billCount,
    numberOfCoins: coinCount,
  };
};

// --- 10. Zakat Calculator --------------------------------------------------------------
export const zakatCalculator: CustomCalculator = (values) => {
  const goldPrice = pos(values.goldPricePerGram, 130);
  const silverPrice = pos(values.silverPricePerGram, 1.6);
  const assets =
    pos(values.cash, 20000) + pos(values.goldGrams, 0) * goldPrice + pos(values.silverGrams, 0) * silverPrice +
    pos(values.investments, 15000) + pos(values.businessInventory, 0) + pos(values.receivables, 0) + pos(values.otherAssets, 0);
  const net = Math.max(0, assets - pos(values.liabilities, 3000));
  const nisab = num(values.nisabBasis, 2) === 1 ? 85 * goldPrice : 595 * silverPrice;
  const due = net >= nisab && nisab > 0 ? net * 0.025 : 0;
  return {
    totalZakatableAssets: round2(assets),
    netZakatableWealth: round2(net),
    nisabThreshold: round2(nisab),
    meetsNisab: net >= nisab && nisab > 0 ? 1 : 0,
    zakatDue: round2(due),
  };
};

export const finMarketingMiscCustomCalculators: Record<string, CustomCalculator> = {
  "roas-calculator": roasCalculator,
  "ctr-calculator": ctrCalculator,
  "cpc-calculator": cpcCalculator,
  "cpm-calculator": cpmCalculator,
  "youtube-revenue-calculator": youtubeRevenueCalculator,
  "sales-percentage-calculator": salesPercentageCalculator,
  "nps-calculator": npsCalculator,
  "margin-of-error-calculator": marginOfErrorCalculator,
  "money-counter-calculator": moneyCounterCalculator,
  "zakat-calculator": zakatCalculator,
};
