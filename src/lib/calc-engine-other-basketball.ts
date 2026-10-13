/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-basketball (15 tools). See calc-engine-other-football.ts for the
 * full list of other-* sub-batches.
 *
 * Merged: wingspan -> ape index (estimates wingspan when not measured);
 * basketball playing time -> playing time (other-league).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fieldGoalPercentageCalculator: FG%, 2P% and 3P% from makes and tries.
 *  - effectiveFieldGoalPercentageCalculator: eFG% (3s worth 1.5).
 *  - trueShootingPercentageCalculator: TS% including free throws.
 *  - freeThrowPercentageCalculator: FT% and makes needed for a target.
 *  - pointsPerGameCalculator: PPG and the points needed to reach a target
 *    average; per36Calculator: per-minute rates scaled to 36 (or 48).
 *  - gameScoreCalculator: Hollinger single-game score;
 *    playerEfficiencyRatingCalculator: league-adjusted PER (avg 15).
 *  - apeIndexCalculator vs standingReachCalculator: arm-span ratio vs how
 *    high you reach and what you need to touch the rim / dunk.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-basketball-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const whole = (v: number, d = 0) => Math.max(0, Math.round(safeNumber(v, d)));
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Length: unit 1 = inches, 2 = cm -> inches. */
const inches = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 2.54 : v);

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

// --- 1. Ape index (incl. wingspan estimate) ------------------------------------
export const apeIndexCalculator: CustomCalculator = (values) => {
  const h = inches(nonNeg(values.height, 75), values.unit);
  const measured = inches(nonNeg(values.wingspan, 0), values.unit);
  const w = measured > 0 ? measured : h * 1.0;
  const toUnit = whole(values.unit, 1) === 2 ? 2.54 : 1;

  return {
    apeIndex: round2((w - h) * toUnit),
    ratio: Math.round(div(w, h) * 1000) / 1000,
    wingspan: round2(w * toUnit),
    nbaTypicalWingspan: round2(h * 1.06 * toUnit),
  };
};

// --- 2. Standing reach ---------------------------------------------------------------
const RIM_IN = 120;

export const standingReachCalculator: CustomCalculator = (values) => {
  const h = inches(nonNeg(values.height, 75), values.unit);
  const w = inches(nonNeg(values.wingspan, 0), values.unit);
  const reach = w > 0 ? 1.3 * h + 0.6 * (w - h) : 1.32 * h;
  const toUnit = whole(values.unit, 1) === 2 ? 2.54 : 1;

  return {
    standingReach: round2(reach * toUnit),
    standingReachFeet: round2(reach / 12),
    jumpToTouchRim: round2(Math.max(0, RIM_IN - reach) * toUnit),
    jumpToDunk: round2(Math.max(0, RIM_IN + 6 - reach) * toUnit),
  };
};

// --- 3. True shooting % -------------------------------------------------------------------
export const trueShootingPercentageCalculator: CustomCalculator = (values) => {
  const fga = nonNeg(values.fga, 18);
  const fta = nonNeg(values.fta, 6);
  const tsa = fga + 0.44 * fta;

  return { trueShootingPct: round2(div(nonNeg(values.points, 25), 2 * tsa) * 100), trueShootingAttempts: round2(tsa), pointsPerShot: round2(div(nonNeg(values.points, 25), tsa)) };
};

// --- 4. Effective FG % ----------------------------------------------------------------------
export const effectiveFieldGoalPercentageCalculator: CustomCalculator = (values) => {
  const fgm = nonNeg(values.fgm, 9);
  const fga = nonNeg(values.fga, 18);
  const threes = nonNeg(values.threesMade, 3);

  return { effectiveFgPct: round2(div(fgm + 0.5 * threes, fga) * 100), fieldGoalPct: round2(div(fgm, fga) * 100), boostFromThrees: round2(div(0.5 * threes, fga) * 100) };
};

// --- 5. Field goal % -------------------------------------------------------------------------
export const fieldGoalPercentageCalculator: CustomCalculator = (values) => {
  const fgm = nonNeg(values.fgm, 9);
  const fga = nonNeg(values.fga, 18);
  const tpm = nonNeg(values.threesMade, 3);
  const tpa = nonNeg(values.threesAttempted, 8);

  return { fieldGoalPct: round2(div(fgm, fga) * 100), twoPointPct: round2(div(fgm - tpm, fga - tpa) * 100), threePointPct: round2(div(tpm, tpa) * 100), misses: Math.max(0, fga - fgm) };
};

// --- 6. Free throw % ----------------------------------------------------------------------------
export const freeThrowPercentageCalculator: CustomCalculator = (values) => {
  const ftm = nonNeg(values.ftm, 40);
  const fta = nonNeg(values.fta, 50);
  const target = clamp(nonNeg(values.targetPct, 85), 0, 99.9) / 100;
  // Consecutive makes needed: (ftm + x) / (fta + x) >= target.
  const streak = div(ftm, fta) >= target ? 0 : Math.ceil((target * fta - ftm) / (1 - target) - 1e-9);

  return { freeThrowPct: round2(div(ftm, fta) * 100), misses: Math.max(0, fta - ftm), straightMakesForTarget: streak };
};

// --- 7. Points per game -------------------------------------------------------------------------
export const pointsPerGameCalculator: CustomCalculator = (values) => {
  const pts = nonNeg(values.points, 450);
  const games = whole(values.games, 20);
  const target = nonNeg(values.targetPpg, 25);
  const next = whole(values.nextGames, 5);
  const needed = target * (games + next) - pts;

  return { pointsPerGame: round2(div(pts, games)), pointsNeededTotal: round2(Math.max(0, needed)), pointsNeededPerGame: round2(Math.max(0, div(needed, next))) };
};

// --- 8. Game score (Hollinger) ---------------------------------------------------------------------
export const gameScoreCalculator: CustomCalculator = (values) => {
  const v = (k: string, d = 0) => nonNeg(values[k], d);
  const gs = v("pts", 25) + 0.4 * v("fgm", 9) - 0.7 * v("fga", 18) - 0.4 * (v("fta", 6) - v("ftm", 5)) + 0.7 * v("orb", 2) + 0.3 * v("drb", 6) + v("stl", 1) + 0.7 * v("ast", 5) + 0.7 * v("blk", 1) - 0.4 * v("pf", 2) - v("tov", 3);

  return { gameScore: round2(gs), rating: gs >= 40 ? 5 : gs >= 30 ? 4 : gs >= 20 ? 3 : gs >= 10 ? 2 : 1 };
};

// --- 9. PER (league-adjusted, average 15) -------------------------------------------------------------
// Typical NBA per-team-game league averages used for constants.
const LG = { tp: 13.5, ast: 26.5, fg: 42, ft: 17, tov: 13.8, fga: 89, fta: 21.7, trb: 43.5, orb: 10.7, stl: 8, blk: 5, pf: 18.5, pts: 114 };
const FACTOR = 2 / 3 - (0.5 * (LG.ast / LG.fg)) / (2 * (LG.fg / LG.ft));
const VOP = LG.pts / (LG.fga - LG.orb + LG.tov + 0.44 * LG.fta);
const DRBP = (LG.trb - LG.orb) / LG.trb;

function uper(mp: number, s: { tp: number; ast: number; fg: number; ft: number; tov: number; fga: number; fta: number; trb: number; orb: number; stl: number; blk: number; pf: number }, astRatio: number): number {
  if (mp <= 0) return 0;
  return (
    (1 / mp) *
    (s.tp + (2 / 3) * s.ast + (2 - FACTOR * astRatio) * s.fg + s.ft * 0.5 * (1 + (1 - astRatio) + (2 / 3) * astRatio) - VOP * s.tov - VOP * DRBP * (s.fga - s.fg) - VOP * 0.44 * (0.44 + 0.56 * DRBP) * (s.fta - s.ft) + VOP * (1 - DRBP) * (s.trb - s.orb) + VOP * DRBP * s.orb + VOP * s.stl + VOP * DRBP * s.blk - s.pf * (LG.ft / LG.pf - 0.44 * (LG.fta / LG.pf) * VOP))
  );
}
const LG_AST_RATIO = LG.ast / LG.fg;
const LG_UPER = uper(240, LG, LG_AST_RATIO);

export const playerEfficiencyRatingCalculator: CustomCalculator = (values) => {
  const v = (k: string, d = 0) => nonNeg(values[k], d);
  const u = uper(v("minutes", 34), { tp: v("threesMade", 2), ast: v("ast", 5), fg: v("fgm", 9), ft: v("ftm", 5), tov: v("tov", 3), fga: v("fga", 18), fta: v("fta", 6), trb: v("trb", 8), orb: v("orb", 2), stl: v("stl", 1), blk: v("blk", 1), pf: v("pf", 2) }, LG_AST_RATIO);

  return { per: round2((u * 15) / LG_UPER), unadjustedPer: Math.round(u * 10000) / 10000 };
};

// --- 10. NBA luxury tax ----------------------------------------------------------------------------------
export const nbaLuxuryTaxCalculator: CustomCalculator = (values) => {
  const payroll = nonNeg(values.payroll, 200);
  const line = nonNeg(values.taxLine, 187.895);
  const repeater = whole(values.repeater, 1) === 2;
  const over = Math.max(0, payroll - line);
  const base = repeater ? [2.5, 2.75, 3.5, 4.25] : [1.5, 1.75, 2.5, 3.25];
  let tax = 0;
  let left = over;
  for (let i = 0; left > 0; i++) {
    const rate = i < 4 ? base[i] : base[3] + 0.5 * (i - 3);
    const chunk = Math.min(5, left);
    tax += chunk * rate;
    left -= chunk;
  }

  return {
    taxBill: round2(tax),
    amountOverTax: round2(over),
    totalCost: round2(payroll + tax),
    overFirstApron: payroll > nonNeg(values.firstApron, 195.945) ? 1 : 0,
    overSecondApron: payroll > nonNeg(values.secondApron, 207.824) ? 1 : 0,
  };
};

// --- 11. Turnover % -----------------------------------------------------------------------------------------
export const turnoverPercentageCalculator: CustomCalculator = (values) => {
  const tov = nonNeg(values.tov, 3);
  const plays = nonNeg(values.fga, 18) + 0.44 * nonNeg(values.fta, 6) + tov;

  return { turnoverPct: round2(div(tov, plays) * 100), playsUsed: round2(plays) };
};

// --- 12. Assist-to-turnover ratio ------------------------------------------------------------------------------
export const assistToTurnoverRatioCalculator: CustomCalculator = (values) => {
  const ast = nonNeg(values.assists, 120);
  const tov = nonNeg(values.turnovers, 50);
  const games = Math.max(1, whole(values.games, 20));

  return { assistToTurnoverRatio: round2(div(ast, tov)), assistsPerGame: round2(ast / games), turnoversPerGame: round2(tov / games), rating: div(ast, tov) >= 3 ? 3 : div(ast, tov) >= 2 ? 2 : 1 };
};

// --- 13. Per 36 minutes ------------------------------------------------------------------------------------------
export const per36Calculator: CustomCalculator = (values) => {
  const mp = nonNeg(values.minutes, 24);
  const base = whole(values.basis, 36) === 48 ? 48 : 36;
  const s = (k: string, d: number) => round2(div(nonNeg(values[k], d), mp) * base);

  return { pointsPer: s("points", 14), reboundsPer: s("rebounds", 6), assistsPer: s("assists", 3), stealsPer: s("steals", 1), blocksPer: s("blocks", 0.5) };
};

// --- 14. RPI (college basketball) -----------------------------------------------------------------------------------
export const rpiCalculator: CustomCalculator = (values) => {
  let wp: number;
  if (whole(values.method, 1) === 2) {
    const w = 0.6 * nonNeg(values.homeWins, 10) + 1.0 * nonNeg(values.neutralWins, 2) + 1.4 * nonNeg(values.roadWins, 6);
    const l = 1.4 * nonNeg(values.homeLosses, 2) + 1.0 * nonNeg(values.neutralLosses, 1) + 0.6 * nonNeg(values.roadLosses, 5);
    wp = div(w, w + l);
  } else wp = clamp(nonNeg(values.winPct, 70), 0, 100) / 100;
  const owp = clamp(nonNeg(values.oppWinPct, 55), 0, 100) / 100;
  const oowp = clamp(nonNeg(values.oppOppWinPct, 52), 0, 100) / 100;

  return { rpi: Math.round((0.25 * wp + 0.5 * owp + 0.25 * oowp) * 10000) / 10000, weightedWinPct: round2(wp * 100), strengthOfSchedule: Math.round((2 / 3 * owp + 1 / 3 * oowp) * 10000) / 10000 };
};

// --- 15. NBA playoff odds ---------------------------------------------------------------------------------------------
export const nbaPlayoffCalculator: CustomCalculator = (values) => {
  const wins = nonNeg(values.wins, 25);
  const losses = nonNeg(values.losses, 20);
  const left = Math.max(0, 82 - whole(wins + losses));
  const p = clamp(nonNeg(values.winPct, 55), 0, 100) / 100;
  const needTop6 = Math.max(0, Math.ceil(nonNeg(values.playoffWins, 45) - wins));
  const needPlayIn = Math.max(0, Math.ceil(nonNeg(values.playInWins, 38) - wins));

  return {
    top6ChancePct: round2(atLeast(needTop6, left, p) * 100),
    playInChancePct: round2(atLeast(needPlayIn, left, p) * 100),
    gamesLeft: left,
    projectedWins: round2(wins + left * p),
    winsNeededTop6: needTop6,
  };
};

export const otherBasketballCustomCalculators: Record<string, CustomCalculator> = {
  "ape-index-calculator": apeIndexCalculator,
  "standing-reach-calculator": standingReachCalculator,
  "true-shooting-percentage-calculator": trueShootingPercentageCalculator,
  "effective-field-goal-percentage-calculator": effectiveFieldGoalPercentageCalculator,
  "field-goal-percentage-calculator": fieldGoalPercentageCalculator,
  "free-throw-percentage-calculator": freeThrowPercentageCalculator,
  "points-per-game-calculator": pointsPerGameCalculator,
  "game-score-calculator": gameScoreCalculator,
  "player-efficiency-rating-calculator": playerEfficiencyRatingCalculator,
  "nba-luxury-tax-calculator": nbaLuxuryTaxCalculator,
  "turnover-percentage-calculator": turnoverPercentageCalculator,
  "assist-to-turnover-ratio-calculator": assistToTurnoverRatioCalculator,
  "per-36-calculator": per36Calculator,
  "rpi-calculator": rpiCalculator,
  "nba-playoff-calculator": nbaPlayoffCalculator,
};
