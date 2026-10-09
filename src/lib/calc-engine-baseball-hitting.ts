/**
 * Batch: "Sports Calculators" > Baseball & Softball Calculators, sub-batch
 * A (Hitting Stats, 13 tools). The 31-tool baseball list is built across 3
 * sub-batches:
 *   calc-engine-baseball-hitting.ts (13)
 *   calc-engine-baseball-pitching.ts (11)
 *   calc-engine-baseball-team.ts (7)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - battingAverageCalculator: H ÷ AB.
 *  - onBasePercentageCalculator: times on base ÷ plate appearances (OBP).
 *  - sluggingPercentageCalculator: total bases ÷ AB, plus ISO.
 *  - opsCalculator: OBP + SLG from a full stat line.
 *  - opsPlusCalculator: OPS relative to league and park (100 = average).
 *  - totalBasesCalculator: 1B + 2×2B + 3×3B + 4×HR.
 *  - babipCalculator: average on balls in play.
 *  - wobaCalculator: weighted on-base average with linear weights.
 *  - wrcPlusCalculator: wOBA → runs above average, scaled to 100.
 *  - runsCreatedCalculator: Bill James basic and technical runs created.
 *  - expectedBattingAverageCalculator: xBA from quality-of-contact mix.
 *  - strikeoutRateCalculator / walkRateCalculator: K% and BB% per PA.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-baseball-hitting-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

// 2024 MLB league averages (Baseball-Reference / FanGraphs).
const LG = { avg: 0.243, obp: 0.312, slg: 0.399, kPct: 22.6, bbPct: 8.2 };

/** A standard batting line from the inputs (defaults: a strong season). */
function line(v: Record<string, number>) {
  const ab = nonNeg(v.atBats, 500);
  const h = nonNeg(v.hits, 150);
  const d = nonNeg(v.doubles, 30);
  const t = nonNeg(v.triples, 3);
  const hr = nonNeg(v.homeRuns, 25);
  const bb = nonNeg(v.walks, 60);
  const hbp = nonNeg(v.hitByPitch, 5);
  const sf = nonNeg(v.sacFlies, 5);
  const singles = Math.max(0, h - d - t - hr);
  const tb = singles + 2 * d + 3 * t + 4 * hr;
  return { ab, h, d, t, hr, bb, hbp, sf, singles, tb, obp: div(h + bb + hbp, ab + bb + hbp + sf), slg: div(tb, ab), avg: div(h, ab) };
}

// --- 1. Batting Average -----------------------------------------------------
export const battingAverageCalculator: CustomCalculator = (values) => {
  const ab = nonNeg(values.atBats, 500);
  const h = nonNeg(values.hits, 150);
  const target = nonNeg(values.targetAverage, 0.3);

  return { battingAverage: r3(div(h, ab)), hitsNeededForTarget: Math.max(0, Math.ceil(target * ab - h - 1e-9)), outsMade: Math.max(0, ab - h), vsLeagueAverage: r3(div(h, ab) - LG.avg) };
};

// --- 2. On-Base Percentage --------------------------------------------------
export const onBasePercentageCalculator: CustomCalculator = (values) => {
  const l = line(values);

  return { onBasePercentage: r3(l.obp), timesOnBase: l.h + l.bb + l.hbp, plateAppearancesUsed: l.ab + l.bb + l.hbp + l.sf, vsLeagueAverage: r3(l.obp - LG.obp) };
};

// --- 3. Slugging Percentage -------------------------------------------------
export const sluggingPercentageCalculator: CustomCalculator = (values) => {
  const l = line(values);

  return { sluggingPercentage: r3(l.slg), totalBases: l.tb, isolatedPower: r3(l.slg - l.avg), battingAverage: r3(l.avg), singles: l.singles };
};

// --- 4. OPS -----------------------------------------------------------------
export const opsCalculator: CustomCalculator = (values) => {
  const l = line(values);
  const ops = l.obp + l.slg;

  return {
    ops: r3(ops),
    onBasePercentage: r3(l.obp),
    sluggingPercentage: r3(l.slg),
    battingAverage: r3(l.avg),
    // 1 excellent (≥ .900), 2 very good (≥ .800), 3 average (≥ .700), 4 below average.
    rating: ops >= 0.9 ? 1 : ops >= 0.8 ? 2 : ops >= 0.7 ? 3 : 4,
  };
};

// --- 5. OPS+ ----------------------------------------------------------------
export const opsPlusCalculator: CustomCalculator = (values) => {
  const obp = nonNeg(values.obp, 0.377);
  const slg = nonNeg(values.slg, 0.522);
  const lgObp = Math.max(0.001, nonNeg(values.leagueObp, LG.obp));
  const lgSlg = Math.max(0.001, nonNeg(values.leagueSlg, LG.slg));
  const pf = Math.max(1, nonNeg(values.parkFactor, 100)) / 100;
  const raw = 100 * (obp / lgObp + slg / lgSlg - 1);

  return { opsPlus: Math.round(raw / pf), opsPlusBeforePark: Math.round(raw), ops: r3(obp + slg), leagueOps: r3(lgObp + lgSlg) };
};

// --- 6. Total Bases ---------------------------------------------------------
export const totalBasesCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.singles, 92);
  const d = nonNeg(values.doubles, 30);
  const t = nonNeg(values.triples, 3);
  const hr = nonNeg(values.homeRuns, 25);
  const ab = nonNeg(values.atBats, 500);
  const tb = s + 2 * d + 3 * t + 4 * hr;

  return { totalBases: tb, hits: s + d + t + hr, extraBaseHits: d + t + hr, sluggingPercentage: r3(div(tb, ab)) };
};

// --- 7. BABIP ---------------------------------------------------------------
export const babipCalculator: CustomCalculator = (values) => {
  const ab = nonNeg(values.atBats, 500);
  const h = nonNeg(values.hits, 150);
  const hr = nonNeg(values.homeRuns, 25);
  const k = nonNeg(values.strikeouts, 110);
  const sf = nonNeg(values.sacFlies, 5);
  const bip = ab - k - hr + sf;
  const babip = div(h - hr, bip);

  return { babip: r3(babip), ballsInPlay: Math.max(0, bip), hitsInPlay: Math.max(0, h - hr), vsLeagueTypical: r3(babip - 0.291) };
};

// --- 8. wOBA ----------------------------------------------------------------
// 2024 FanGraphs linear weights.
const W = { bb: 0.689, hbp: 0.72, b1: 0.882, b2: 1.254, b3: 1.59, hr: 2.05, lg: 0.31, scale: 1.242 };

export const wobaCalculator: CustomCalculator = (values) => {
  const l = line(values);
  const ibb = Math.min(l.bb, nonNeg(values.intentionalWalks, 5));
  const ubb = l.bb - ibb;
  const denom = l.ab + l.bb - ibb + l.sf + l.hbp;
  const woba = div(W.bb * ubb + W.hbp * l.hbp + W.b1 * l.singles + W.b2 * l.d + W.b3 * l.t + W.hr * l.hr, denom);
  const pa = l.ab + l.bb + l.hbp + l.sf;

  return { woba: r3(woba), vsLeagueAverage: r3(woba - W.lg), weightedRunsAboveAverage: round2(((woba - W.lg) / W.scale) * pa), plateAppearances: pa };
};

// --- 9. wRC+ ----------------------------------------------------------------
export const wrcPlusCalculator: CustomCalculator = (values) => {
  const woba = nonNeg(values.woba, 0.38);
  const pa = nonNeg(values.plateAppearances, 600);
  const lgWoba = nonNeg(values.leagueWoba, W.lg);
  const scale = Math.max(0.1, nonNeg(values.wobaScale, W.scale));
  const lgRpa = Math.max(0.001, nonNeg(values.leagueRunsPerPa, 0.117));
  const pf = nonNeg(values.parkFactor, 100) / 100;
  const wraaPa = (woba - lgWoba) / scale;
  // FanGraphs: ((wRAA/PA + lgR/PA) + (lgR/PA − PF × lgR/PA)) ÷ lgR/PA × 100.
  const wrcPlus = ((wraaPa + lgRpa + (lgRpa - pf * lgRpa)) / lgRpa) * 100;

  return { wrcPlus: Math.round(wrcPlus), weightedRunsAboveAverage: round2(wraaPa * pa), weightedRunsCreated: round2((wraaPa + lgRpa) * pa) };
};

// --- 10. Runs Created -------------------------------------------------------
export const runsCreatedCalculator: CustomCalculator = (values) => {
  const l = line(values);
  const sb = nonNeg(values.stolenBases, 10);
  const cs = nonNeg(values.caughtStealing, 3);
  const sh = nonNeg(values.sacHits, 0);
  const gidp = nonNeg(values.groundedIntoDp, 10);
  const ibb = Math.min(l.bb, nonNeg(values.intentionalWalks, 5));
  const basic = div((l.h + l.bb) * l.tb, l.ab + l.bb);
  // Technical version (Bill James).
  const tech = div((l.h + l.bb + l.hbp - cs - gidp) * (l.tb + 0.26 * (l.bb - ibb + l.hbp) + 0.52 * (sh + l.sf + sb)), l.ab + l.bb + l.hbp + sh + l.sf);
  const outs = l.ab - l.h + cs + sh + l.sf + gidp;

  return { runsCreatedTechnical: round2(tech), runsCreatedBasic: round2(basic), runsCreatedPer27Outs: round2(div(tech, outs) * 27), outsMade: outs };
};

// --- 11. Expected Batting Average (xBA) -------------------------------------
// Approximate MLB batting average by Statcast quality-of-contact category.
const XBA = { barrel: 0.81, solid: 0.491, flare: 0.661, topped: 0.24, under: 0.08, weak: 0.19 };

export const expectedBattingAverageCalculator: CustomCalculator = (values) => {
  const ab = nonNeg(values.atBats, 500);
  const n = {
    barrel: nonNeg(values.barrels, 40),
    solid: nonNeg(values.solidContact, 30),
    flare: nonNeg(values.flaresBurners, 100),
    topped: nonNeg(values.topped, 130),
    under: nonNeg(values.under, 70),
    weak: nonNeg(values.weak, 20),
  };
  const xh = (Object.keys(n) as (keyof typeof n)[]).reduce((s, k) => s + n[k] * XBA[k], 0);
  const bip = Object.values(n).reduce((a, b) => a + b, 0);
  const hits = nonNeg(values.hits, 150);

  return { expectedBattingAverage: r3(div(xh, ab)), expectedHits: round2(xh), actualAverage: r3(div(hits, ab)), luckDifference: r3(div(hits, ab) - div(xh, ab)), battedBalls: bip, barrelRate: round2(div(n.barrel, bip) * 100) };
};

// --- 12. Strikeout Rate -----------------------------------------------------
export const strikeoutRateCalculator: CustomCalculator = (values) => {
  const k = nonNeg(values.strikeouts, 110);
  const pa = nonNeg(values.plateAppearances, 600);
  const rate = div(k, pa) * 100;

  return { strikeoutRate: round2(rate), vsLeagueAverage: round2(rate - LG.kPct), plateAppearancesPerStrikeout: round2(div(pa, k)), kPctDecimal: r4(div(k, pa)) };
};

// --- 13. Walk Rate ----------------------------------------------------------
export const walkRateCalculator: CustomCalculator = (values) => {
  const bb = nonNeg(values.walks, 60);
  const ibb = Math.min(bb, nonNeg(values.intentionalWalks, 0));
  const pa = nonNeg(values.plateAppearances, 600);
  const k = nonNeg(values.strikeouts, 110);
  const rate = div(bb - ibb, pa) * 100;

  return { walkRate: round2(rate), vsLeagueAverage: round2(rate - LG.bbPct), walkToStrikeoutRatio: round2(div(bb - ibb, k)), bbMinusKPercent: round2(rate - div(k, pa) * 100) };
};

export const baseballHittingCustomCalculators: Record<string, CustomCalculator> = {
  "batting-average-calculator": battingAverageCalculator,
  "on-base-percentage-calculator": onBasePercentageCalculator,
  "slugging-percentage-calculator": sluggingPercentageCalculator,
  "ops-calculator": opsCalculator,
  "ops-plus-calculator": opsPlusCalculator,
  "total-bases-calculator": totalBasesCalculator,
  "babip-calculator": babipCalculator,
  "woba-calculator": wobaCalculator,
  "wrc-plus-calculator": wrcPlusCalculator,
  "runs-created-calculator": runsCreatedCalculator,
  "expected-batting-average-calculator": expectedBattingAverageCalculator,
  "strikeout-rate-calculator": strikeoutRateCalculator,
  "walk-rate-calculator": walkRateCalculator,
};
