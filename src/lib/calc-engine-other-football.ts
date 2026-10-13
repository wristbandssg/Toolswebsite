/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-football (American football, 14 tools). The "other sports" list
 * is built in 17 sub-batches (all prefixed other-): football, basketball,
 * horse-care, horse-costs, league, team-stats, target-games, shooting,
 * archery, swim-dive, boards, wind-boat, gym-cardio, rowing-home-gym,
 * track-field, racket, combat-climb-skate.
 *
 * Merged: QBR -> quarterback rating (NFL passer rating);
 * 60 yard dash to 40 yard dash -> 40 yard dash.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - quarterbackRatingCalculator: NFL / NCAA-style 0–158.3 passer rating.
 *  - collegePasserRatingCalculator: NCAA passing efficiency formula.
 *  - completionPercentageCalculator: completion % and completions needed
 *    to reach a target.
 *  - nflPlayoffCalculator: chance of reaching a win total from the
 *    current record (binomial).
 *  - collegeFootballPlayoffCalculator: 12-team CFP path by seed.
 *  - nflTiebreakerCalculator: two-team NFL tiebreak steps.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-football-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const num = (v: number, d = 0) => safeNumber(v, d);
const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** P(at least k successes in n trials with probability p). */
function atLeast(k: number, n: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let total = 0;
  let c = 1;
  for (let i = 0; i <= n; i++) {
    if (i > 0) c = (c * (n - i + 1)) / i;
    if (i >= k) total += c * Math.pow(p, i) * Math.pow(1 - p, n - i);
  }
  return Math.min(1, total);
}

// --- 1. Quarterback (NFL passer) rating ---------------------------------------
export const quarterbackRatingCalculator: CustomCalculator = (values) => {
  const att = nonNeg(values.attempts, 30);
  const c = (x: number) => clamp(x, 0, 2.375);
  const a = c((div(nonNeg(values.completions, 20), att) - 0.3) * 5);
  const b = c((div(nonNeg(values.yards, 250), att) - 3) * 0.25);
  const t = c(div(nonNeg(values.touchdowns, 2), att) * 20);
  const i = c(2.375 - div(nonNeg(values.interceptions, 1), att) * 25);

  return {
    passerRating: att > 0 ? round2(((a + b + t + i) / 6) * 100) : 0,
    completionPct: round2(div(nonNeg(values.completions, 20), att) * 100),
    yardsPerAttempt: round2(div(nonNeg(values.yards, 250), att)),
    touchdownPct: round2(div(nonNeg(values.touchdowns, 2), att) * 100),
    interceptionPct: round2(div(nonNeg(values.interceptions, 1), att) * 100),
  };
};

// --- 2. College passer rating (NCAA efficiency) --------------------------------------
export const collegePasserRatingCalculator: CustomCalculator = (values) => {
  const att = nonNeg(values.attempts, 30);
  const raw = 8.4 * num(values.yards, 250) + 330 * nonNeg(values.touchdowns, 2) + 100 * nonNeg(values.completions, 20) - 200 * nonNeg(values.interceptions, 1);

  return { collegeRating: round2(div(raw, att)), completionPct: round2(div(nonNeg(values.completions, 20), att) * 100), yardsPerAttempt: round2(div(num(values.yards, 250), att)) };
};

// --- 3. Completion percentage ------------------------------------------------------------
export const completionPercentageCalculator: CustomCalculator = (values) => {
  const cmp = nonNeg(values.completions, 20);
  const att = nonNeg(values.attempts, 30);
  const target = clamp(nonNeg(values.targetPct, 70), 0, 100) / 100;
  const next = nonNeg(values.nextAttempts, 0);
  const need = Math.max(0, Math.ceil(target * (att + next) - cmp - 1e-9));

  return { completionPct: round2(div(cmp, att) * 100), incompletions: Math.max(0, att - cmp), completionsNeeded: need, possible: need <= next ? 1 : 0 };
};

// --- 4. EPA (expected points added) ---------------------------------------------------------
// First-and-10 expected points by yards to the opponent's goal (Carter & Machol bins).
const EP_YL = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
const EP_VAL = [6.041, 4.572, 3.681, 3.167, 2.392, 1.538, 0.923, 0.236, -0.637, -1.245];

function firstDownEp(yl: number): number {
  const x = clamp(yl, 1, 99);
  if (x <= EP_YL[0]) return EP_VAL[0] + (EP_YL[0] - x) * 0.15;
  for (let i = 1; i < EP_YL.length; i++) {
    if (x <= EP_YL[i]) return EP_VAL[i - 1] + ((x - EP_YL[i - 1]) / 10) * (EP_VAL[i] - EP_VAL[i - 1]);
  }
  return EP_VAL[EP_VAL.length - 1] - (x - 95) * 0.06;
}

/** Approximate EP for any down & distance. */
function expectedPoints(down: number, toGo: number, yl: number): number {
  const d = clamp(whole(down, 1), 1, 4);
  const g = Math.max(1, toGo);
  const penalty = d === 1 ? 0.04 * (g - 10) : d === 2 ? 0.45 + 0.05 * (g - 7) : d === 3 ? 1 + 0.09 * (g - 5) : 1.6 + 0.1 * (g - 3);
  return Math.max(-2.5, firstDownEp(yl) - penalty);
}

export const epaCalculator: CustomCalculator = (values) => {
  const before = expectedPoints(values.down, nonNeg(values.toGo, 10), nonNeg(values.yardline, 75));
  const yl = nonNeg(values.endYardline, 70);
  const outcome = whole(values.outcome, 1);
  const after =
    outcome === 2 ? 6.95 : outcome === 3 ? 3 : outcome === 4 ? -firstDownEp(100 - yl) : outcome === 5 ? -2 : expectedPoints(values.endDown, nonNeg(values.endToGo, 10), yl);

  return { epa: round2(after - before), epBefore: round2(before), epAfter: round2(after) };
};

// --- 5. Field goal (distance & make chance) ---------------------------------------------------
const FG_SHIFT: Record<number, number> = { 1: 0, 2: -0.8, 3: -1.8 };

export const fieldGoalCalculator: CustomCalculator = (values) => {
  const dist = nonNeg(values.lineOfScrimmage, 30) + 17;
  const logit = 7.16 - 0.1227 * dist + (FG_SHIFT[whole(values.level, 1)] ?? 0);
  const p = 1 / (1 + Math.exp(-logit));

  return { kickDistance: dist, makeProbabilityPct: round2(p * 100), expectedPoints: round2(3 * p) };
};

// --- 6. Football win probability ------------------------------------------------------------------
export const footballWinProbabilityCalculator: CustomCalculator = (values) => {
  const lead = num(values.lead, 7) + (whole(values.possession, 2) === 1 ? 2 : 0);
  const minutes = clamp(nonNeg(values.minutesLeft, 10), 0, 60);
  const spread = num(values.pregameSpread, 0); // + = your team favoured by this many points
  let wp: number;
  if (minutes <= 0) wp = lead > 0 ? 1 : lead < 0 ? 0 : 0.5;
  else wp = phi((lead + spread * (minutes / 60)) / (13.45 * Math.sqrt(minutes / 60)));

  return { winProbabilityPct: round2(wp * 100), opponentPct: round2((1 - wp) * 100) };
};

// --- 7. 40 yard dash (incl. 60 yard -> 40 conversion) ---------------------------------------------
export const fortyYardDashCalculator: CustomCalculator = (values) => {
  const method = whole(values.method, 1);
  let t = nonNeg(values.time, 4.6);
  if (method === 2) t = nonNeg(values.time, 6.7) * 0.7; // 60-yard time -> 40
  const electronic = whole(values.timing, 1) === 2 ? t + 0.24 : t;
  const mph = div(40 * 0.9144, electronic) * 2.236936;

  return {
    fortyTime: round2(electronic),
    averageMph: round2(mph),
    averageKmh: round2(mph * 1.609344),
    estimatedTopSpeedMph: round2(mph * 1.18),
    yardsPerSecond: round2(div(40, electronic)),
  };
};

// --- 8. RAS (Relative Athletic Score) estimate -------------------------------------------------------
// [mean, sd, lowerIsBetter] per metric, per position group (1 skill, 2 big skill, 3 linemen).
const RAS_METRICS = ["forty", "vertical", "broad", "threeCone", "shuttle", "bench", "weight"] as const;
const RAS_NORMS: Record<number, Record<string, [number, number, boolean]>> = {
  1: { forty: [4.5, 0.1, true], vertical: [36, 3, false], broad: [122, 5, false], threeCone: [6.95, 0.2, true], shuttle: [4.2, 0.15, true], bench: [15, 4, false], weight: [200, 15, false] },
  2: { forty: [4.7, 0.12, true], vertical: [34, 3, false], broad: [118, 5, false], threeCone: [7.1, 0.2, true], shuttle: [4.3, 0.15, true], bench: [20, 4, false], weight: [240, 12, false] },
  3: { forty: [5.1, 0.15, true], vertical: [29, 3, false], broad: [105, 6, false], threeCone: [7.65, 0.25, true], shuttle: [4.65, 0.17, true], bench: [26, 5, false], weight: [300, 15, false] },
};

export const rasScoreCalculator: CustomCalculator = (values) => {
  const norms = RAS_NORMS[whole(values.group, 1)] ?? RAS_NORMS[1];
  const scores: number[] = [];
  for (const m of RAS_METRICS) {
    const x = nonNeg(values[m], 0);
    if (x <= 0) continue;
    const [mean, sd, lower] = norms[m];
    scores.push(10 * phi(lower ? (mean - x) / sd : (x - mean) / sd));
  }
  const ras = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;

  return { rasScore: round2(ras), metricsUsed: scores.length, bestMetricScore: scores.length ? round2(Math.max(...scores)) : 0 };
};

// --- 9. Football position finder ------------------------------------------------------------------------
// Typical NFL profiles: height (in), weight (lb), 40 time (s). Codes in the order listed.
const POSITIONS: [number, number, number][] = [
  [75, 220, 4.85], [70.5, 215, 4.5], [72.5, 200, 4.48], [76.5, 250, 4.72], [77, 315, 5.25],
  [75.5, 290, 4.95], [74, 240, 4.68], [71.5, 192, 4.45], [72, 205, 4.52], [73, 205, 4.9],
];

export const footballPositionCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.height, 72) * (whole(values.unit, 1) === 2 ? 1 / 2.54 : 1);
  const w = nonNeg(values.weight, 200) * (whole(values.unit, 1) === 2 ? 2.20462 : 1);
  const f = nonNeg(values.forty, 4.7);
  const d = POSITIONS.map(([ph, pw, pf]) => Math.hypot((h - ph) / 2, (w - pw) / 20, f > 0 ? (f - pf) / 0.12 : 0));
  const order = d.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);

  return { bestPosition: order[0][1] + 1, secondPosition: order[1][1] + 1, matchScore: round2(Math.max(0, 100 - order[0][0] * 20)) };
};

// --- 10. NFL playoff odds ---------------------------------------------------------------------------------
export const nflPlayoffCalculator: CustomCalculator = (values) => {
  const wins = nonNeg(values.wins, 6) + nonNeg(values.ties, 0) * 0.5;
  const left = whole(values.gamesLeft, 8);
  const p = clamp(nonNeg(values.winPct, 55), 0, 100) / 100;
  const target = nonNeg(values.winsNeeded, 10);
  const need = Math.max(0, Math.ceil(target - wins - 1e-9));

  return { playoffChancePct: round2(atLeast(need, left, p) * 100), winsNeededRemaining: need, projectedWins: round2(wins + left * p), maxWins: round2(wins + left) };
};

// --- 11. College Football Playoff (12-team) ------------------------------------------------------------------
export const collegeFootballPlayoffCalculator: CustomCalculator = (values) => {
  const seed = clamp(whole(values.seed, 6), 1, 12);
  const p = clamp(nonNeg(values.winPct, 60), 0, 100) / 100;
  const bye = seed <= 4 ? 1 : 0;
  const games = bye ? 3 : 4;

  return {
    firstRoundBye: bye,
    firstRoundOpponentSeed: bye ? 0 : 17 - seed,
    hostsFirstRound: seed >= 5 && seed <= 8 ? 1 : 0,
    gamesToWinTitle: games,
    reachTitleGamePct: round2(Math.pow(p, games - 1) * 100),
    winTitlePct: round2(Math.pow(p, games) * 100),
  };
};

// --- 12. NFL salary cap ---------------------------------------------------------------------------------------
export const nflSalaryCapCalculator: CustomCalculator = (values) => {
  const cap = nonNeg(values.salaryCap, 279.2) + nonNeg(values.carryover, 0);
  const years = clamp(whole(values.contractYears, 4), 1, 5);
  const proration = nonNeg(values.signingBonus, 20) / years;
  const remaining = clamp(whole(values.yearsRemaining, 3), 1, years);
  const capHit = nonNeg(values.baseSalary, 10) + proration + nonNeg(values.otherBonuses, 0);
  const dead = proration * remaining;

  return {
    playerCapHit: round2(capHit),
    teamCapSpace: round2(cap - nonNeg(values.committed, 240) - capHit),
    deadMoneyIfReleased: round2(dead),
    capSavingsIfReleased: round2(capHit - dead),
  };
};

// --- 13. NFL draft trade value (Jimmy Johnson chart) -------------------------------------------------------------
const JJ: [number, number][] = [[1, 3000], [2, 2600], [3, 2200], [4, 1800], [5, 1700], [6, 1600], [7, 1500], [8, 1400], [9, 1350], [10, 1300], [16, 1000], [18, 900], [19, 875], [20, 850], [21, 800], [32, 590], [33, 580], [40, 500], [60, 300], [64, 270], [90, 140], [100, 100], [128, 44], [160, 27], [192, 14], [224, 2]];

function pickValue(pick: number): number {
  const p = Math.round(pick);
  if (p < 1 || p > 262) return 0;
  if (p >= 224) return 2;
  for (let i = 1; i < JJ.length; i++) {
    if (p <= JJ[i][0]) return JJ[i - 1][1] + ((p - JJ[i - 1][0]) / (JJ[i][0] - JJ[i - 1][0])) * (JJ[i][1] - JJ[i - 1][1]);
  }
  return 2;
}

export const nflDraftTradeValueCalculator: CustomCalculator = (values) => {
  const a = [1, 2, 3, 4].reduce((s, i) => s + pickValue(nonNeg(values[`givePick${i}`], 0)), 0);
  const b = [1, 2, 3, 4].reduce((s, i) => s + pickValue(nonNeg(values[`getPick${i}`], 0)), 0);

  return { valueGiven: round2(a), valueReceived: round2(b), difference: round2(b - a), winner: a === b ? 0 : b > a ? 1 : 2, gainPct: round2(div(b - a, a) * 100) };
};

// --- 14. NFL tiebreaker (two teams) ------------------------------------------------------------------------------------
export const nflTiebreakerCalculator: CustomCalculator = (values) => {
  const pct = (w: number, l: number, t = 0) => div(w + 0.5 * t, w + l + t);
  const steps: [number, number][] = [
    [pct(nonNeg(values.h2hWinsA, 1), nonNeg(values.h2hWinsB, 1)), pct(nonNeg(values.h2hWinsB, 1), nonNeg(values.h2hWinsA, 1))],
    [pct(nonNeg(values.divWinsA, 4), nonNeg(values.divLossesA, 2)), pct(nonNeg(values.divWinsB, 3), nonNeg(values.divLossesB, 3))],
    [pct(nonNeg(values.commonWinsA, 0), nonNeg(values.commonLossesA, 0)), pct(nonNeg(values.commonWinsB, 0), nonNeg(values.commonLossesB, 0))],
    [pct(nonNeg(values.confWinsA, 0), nonNeg(values.confLossesA, 0)), pct(nonNeg(values.confWinsB, 0), nonNeg(values.confLossesB, 0))],
    [nonNeg(values.sovA, 0), nonNeg(values.sovB, 0)],
    [nonNeg(values.sosA, 0), nonNeg(values.sosB, 0)],
  ];
  const wildCard = whole(values.tieType, 1) === 2;
  // Wild card ties skip the division step and use conference record before common games.
  const order = wildCard ? [0, 3, 2, 4, 5] : [0, 1, 2, 3, 4, 5];
  for (const s of order) {
    const [a, b] = steps[s];
    if (Math.abs(a - b) > 1e-9) return { winner: a > b ? 1 : 2, decidedAtStep: s + 1 };
  }
  return { winner: 0, decidedAtStep: 0 };
};

export const otherFootballCustomCalculators: Record<string, CustomCalculator> = {
  "quarterback-rating-calculator": quarterbackRatingCalculator,
  "college-passer-rating-calculator": collegePasserRatingCalculator,
  "completion-percentage-calculator": completionPercentageCalculator,
  "epa-calculator": epaCalculator,
  "field-goal-calculator": fieldGoalCalculator,
  "football-win-probability-calculator": footballWinProbabilityCalculator,
  "40-yard-dash-calculator": fortyYardDashCalculator,
  "ras-score-calculator": rasScoreCalculator,
  "football-position-calculator": footballPositionCalculator,
  "nfl-playoff-calculator": nflPlayoffCalculator,
  "college-football-playoff-calculator": collegeFootballPlayoffCalculator,
  "nfl-salary-cap-calculator": nflSalaryCapCalculator,
  "nfl-draft-trade-value-calculator": nflDraftTradeValueCalculator,
  "nfl-tiebreaker-calculator": nflTiebreakerCalculator,
};
