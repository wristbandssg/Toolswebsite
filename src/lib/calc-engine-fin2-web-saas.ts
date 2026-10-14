/**
 * Batch: "Finance Calculators expansion 2" (14 Oct 2026), sub-batch 2 of 9 —
 * Web, Media & SaaS Metrics (10 tools). See calc-engine-fin2-investing.ts
 * for the full batch context.
 *
 *  - bounceRate: Universal Analytics bounce rate (single-page sessions ÷
 *    sessions) and GA4's (1 − engaged sessions ÷ sessions).
 *  - exitRate: exits ÷ pageviews of a page, beside its bounce rate.
 *    Different from bounceRate: exits count every visit that ended on the
 *    page, bounces only visits that started and ended there.
 *  - conversionRate (incl. the "Online Marketing Conversion" keyword): a
 *    visitor -> lead -> customer funnel, revenue per visitor and the
 *    conversions needed for a target rate.
 *  - websiteAdRevenue (incl. the "Google AdSense" keyword): pageviews ×
 *    page RPM, or pageviews × page CTR × CPC.
 *  - grp: reach % × average frequency; impressions, cost per point, CPM.
 *  - churnRate (incl. "Customer Retention Rate"): lost = start + new − end;
 *    churn = lost ÷ start, retention = (end − new) ÷ start, annualised
 *    churn and average customer lifetime.
 *  - saasMetrics: MRR, ARR, logo and revenue churn, CAC, LTV, LTV:CAC, CAC
 *    payback and net revenue retention in one place.
 *  - softwareContractValue: TCV and ACV with a yearly price escalator and
 *    one-time fees.
 *  - sellThroughRate: units sold ÷ units received, daily rate and days to
 *    sell out the rest.
 *  - gmroi: gross margin ÷ average inventory at cost, with inventory turns.
 *
 * Self-contained: no imports from any other batch.
 *
 * See prisma/create-fin2-web-saas-calculators.ts for the copy.
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
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

// --- 1. Bounce Rate Calculator ---------------------------------------------------------
export const bounceRateCalculator: CustomCalculator = (values) => {
  const sessions = pos(values.sessions, 5000);
  const bounces = Math.min(sessions, pos(values.singlePageSessions, 2100));
  const engaged = Math.min(sessions, pos(values.engagedSessions, 0));
  return {
    bounceRate: round2(pct(bounces, sessions)),
    engagementRate: round2(pct(engaged, sessions)),
    ga4BounceRate: round2(engaged > 0 ? 100 - pct(engaged, sessions) : 0),
    multiPageSessions: sessions - bounces,
  };
};

// --- 2. Exit Rate Calculator -----------------------------------------------------------
export const exitRateCalculator: CustomCalculator = (values) => {
  const pageviews = pos(values.pageviews, 8000);
  const exits = Math.min(pageviews, pos(values.exits, 2400));
  const entrances = pos(values.entrances, 0);
  const bounces = Math.min(entrances, pos(values.bounces, 0));
  return {
    exitRate: round2(pct(exits, pageviews)),
    continuationRate: round2(100 - pct(exits, pageviews)),
    bounceRate: round2(pct(bounces, entrances)),
  };
};

// --- 3. Conversion Rate Calculator -----------------------------------------------------
export const conversionRateCalculator: CustomCalculator = (values) => {
  const visitors = pos(values.visitors, 10000);
  const leads = pos(values.leads, 400);
  const customers = pos(values.customers, 80);
  const revenue = pos(values.revenue, 8000);
  const target = pos(values.targetRate, 1) / 100;
  const needed = Math.ceil(visitors * target - 1e-9);
  return {
    conversionRate: round2(pct(customers, visitors)),
    leadConversionRate: round2(pct(leads, visitors)),
    leadToCustomerRate: round2(pct(customers, leads)),
    revenuePerVisitor: round2(visitors > 0 ? revenue / visitors : 0),
    averageOrderValue: round2(customers > 0 ? revenue / customers : 0),
    conversionsAtTarget: needed,
    revenueAtTarget: round2(customers > 0 ? needed * (revenue / customers) : 0),
  };
};

// --- 4. Website Ad Revenue Calculator --------------------------------------------------
export const websiteAdRevenueCalculator: CustomCalculator = (values) => {
  const pv = pos(values.monthlyPageviews, 100000);
  const mode = num(values.method, 1);
  const monthly = mode === 2 ? pv * (pos(values.pageCtr, 1.5) / 100) * pos(values.cpc, 0.5) : (pv / 1000) * pos(values.pageRpm, 8);
  return {
    dailyRevenue: round2(monthly / 30.4),
    monthlyRevenue: round2(monthly),
    yearlyRevenue: round2(monthly * 12),
    effectiveRpm: round2(pv > 0 ? (monthly / pv) * 1000 : 0),
  };
};

// --- 5. GRP Calculator -----------------------------------------------------------------
export const grpCalculator: CustomCalculator = (values) => {
  const reach = Math.min(100, pos(values.reachPercent, 40));
  const freq = pos(values.frequency, 3);
  const cost = pos(values.campaignCost, 150000);
  const pop = pos(values.targetPopulation, 2000000);
  const grp = reach * freq;
  const impressions = (pop * grp) / 100;
  return {
    grp: round2(grp),
    peopleReached: Math.round((pop * reach) / 100),
    impressions: Math.round(impressions),
    costPerPoint: round2(grp > 0 ? cost / grp : 0),
    cpm: round2(impressions > 0 ? (cost / impressions) * 1000 : 0),
  };
};

// --- 6. Churn Rate Calculator ----------------------------------------------------------
const PERIODS_PER_YEAR: Record<number, number> = { 1: 12, 2: 4, 3: 1 };

export const churnRateCalculator: CustomCalculator = (values) => {
  const start = pos(values.customersStart, 1000);
  const end = pos(values.customersEnd, 1050);
  const added = pos(values.newCustomers, 120);
  const ppy = PERIODS_PER_YEAR[num(values.period, 1)] ?? 12;
  const lost = Math.max(0, start + added - end);
  const churn = start > 0 ? lost / start : 0;
  return {
    customersLost: lost,
    churnRate: round2(churn * 100),
    retentionRate: round2(start > 0 ? ((end - added) / start) * 100 : 0),
    annualChurnRate: round2((1 - Math.pow(1 - Math.min(1, churn), ppy)) * 100),
    averageLifetimePeriods: round2(churn > 0 ? 1 / churn : 0),
    netGrowthRate: round2(start > 0 ? ((end - start) / start) * 100 : 0),
  };
};

// --- 7. SaaS Metrics Calculator --------------------------------------------------------
export const saasMetricsCalculator: CustomCalculator = (values) => {
  const customers = pos(values.customersStart, 500);
  const arpa = pos(values.arpa, 100);
  const added = pos(values.newCustomers, 40);
  const churned = Math.min(customers, pos(values.churnedCustomers, 15));
  const gm = pos(values.grossMargin, 80) / 100;
  const sm = pos(values.salesMarketingSpend, 30000);
  const expansion = pos(values.expansionMrr, 1500);
  const contraction = pos(values.contractionMrr, 500);
  const mrrStart = customers * arpa;
  const churnedMrr = churned * arpa;
  const mrrEnd = mrrStart + added * arpa + expansion - contraction - churnedMrr;
  const churn = customers > 0 ? churned / customers : 0;
  const cac = added > 0 ? sm / added : 0;
  const ltv = churn > 0 ? (arpa * gm) / churn : 0;
  return {
    mrr: round2(mrrEnd),
    arr: round2(mrrEnd * 12),
    customerChurnRate: round2(churn * 100),
    netRevenueRetention: round2(mrrStart > 0 ? ((mrrStart + expansion - contraction - churnedMrr) / mrrStart) * 100 : 0),
    cac: round2(cac),
    ltv: round2(ltv),
    ltvToCac: round2(cac > 0 ? ltv / cac : 0),
    cacPaybackMonths: round2(arpa * gm > 0 ? cac / (arpa * gm) : 0),
  };
};

// --- 8. Software Contract Value Calculator ---------------------------------------------
export const softwareContractValueCalculator: CustomCalculator = (values) => {
  const fee = pos(values.annualFee, 24000);
  const years = Math.max(1, Math.round(pos(values.contractYears, 3)));
  const esc = num(values.annualEscalator, 5) / 100;
  const oneTime = pos(values.oneTimeFees, 5000);
  let recurring = 0;
  let lastYear = fee;
  for (let y = 1; y <= years; y++) {
    lastYear = fee * Math.pow(1 + esc, y - 1);
    recurring += lastYear;
  }
  return {
    totalContractValue: round2(recurring + oneTime),
    recurringValue: round2(recurring),
    annualContractValue: round2(recurring / years),
    firstYearValue: round2(fee + oneTime),
    finalYearFee: round2(lastYear),
    firstYearMrr: round2(fee / 12),
  };
};

// --- 9. Sell-Through Rate Calculator ---------------------------------------------------
export const sellThroughRateCalculator: CustomCalculator = (values) => {
  const received = pos(values.unitsReceived, 500);
  const sold = Math.min(received, pos(values.unitsSold, 320));
  const days = Math.max(1, pos(values.periodDays, 30));
  const daily = sold / days;
  const left = received - sold;
  return {
    sellThroughRate: round2(pct(sold, received)),
    unitsRemaining: left,
    unitsPerDay: round2(daily),
    daysToSellOut: round2(daily > 0 ? left / daily : 0),
    weeklySellThrough: round2(pct(daily * 7, received)),
  };
};

// --- 10. GMROI Calculator --------------------------------------------------------------
export const gmroiCalculator: CustomCalculator = (values) => {
  const sales = pos(values.netSales, 600000);
  const cogs = pos(values.cogs, 360000);
  const begin = pos(values.inventoryStart, 110000);
  const end = pos(values.inventoryEnd, 90000);
  const avgInv = (begin + end) / 2;
  const gm = sales - cogs;
  return {
    grossMargin: round2(gm),
    grossMarginPct: round2(pct(gm, sales)),
    averageInventory: round2(avgInv),
    gmroi: round2(avgInv > 0 ? gm / avgInv : 0),
    inventoryTurnover: round2(avgInv > 0 ? cogs / avgInv : 0),
  };
};

export const fin2WebSaasCustomCalculators: Record<string, CustomCalculator> = {
  "bounce-rate-calculator": bounceRateCalculator,
  "exit-rate-calculator": exitRateCalculator,
  "conversion-rate-calculator": conversionRateCalculator,
  "website-ad-revenue-calculator": websiteAdRevenueCalculator,
  "grp-calculator": grpCalculator,
  "churn-rate-calculator": churnRateCalculator,
  "saas-metrics-calculator": saasMetricsCalculator,
  "software-contract-value-calculator": softwareContractValueCalculator,
  "sell-through-rate-calculator": sellThroughRateCalculator,
  "gmroi-calculator": gmroiCalculator,
};
