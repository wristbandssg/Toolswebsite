/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-target-games (bowling, darts, practical shooting, 8 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bowlingScoreCalculator: frame-by-frame ten-pin scoring;
 *    bowlingHandicapCalculator: handicap pins from average;
 *    bowlingPrizeFundCalculator: tournament prize fund and payouts.
 *  - bowlingBallWeightCalculator vs bowlingBallSpeedCalculator: what ball
 *    to use vs how fast it travels to the pins.
 *  - dartsScoreCalculator: 501 progress and 3-dart average;
 *    dartsCheckoutCalculator: the darts to finish a given score.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-target-games-calculators.ts for the copy.
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

// --- 1. Bowling score (frame by frame) ---------------------------------------------
export const bowlingScoreCalculator: CustomCalculator = (values) => {
  const rolls: number[] = [];
  let strikes = 0;
  let spares = 0;
  for (let f = 1; f <= 10; f++) {
    const a = clamp(whole(values[`frame${f}Ball1`], 0), 0, 10);
    const b = clamp(whole(values[`frame${f}Ball2`], 0), 0, f === 10 && a === 10 ? 10 : 10 - a);
    if (f < 10) {
      if (a === 10) { rolls.push(10); strikes++; } else { rolls.push(a, b); if (a + b === 10) spares++; }
    } else {
      rolls.push(a, b);
      if (a === 10) strikes++;
      if (a === 10 && b === 10) strikes++;
      if (a < 10 && a + b === 10) spares++;
      if (a === 10 || a + b === 10) {
        const c = clamp(whole(values.frame10Ball3, 0), 0, 10);
        rolls.push(c);
        if (c === 10) strikes++;
      }
    }
  }
  let score = 0;
  let i = 0;
  for (let f = 0; f < 10; f++) {
    if (rolls[i] === 10) { score += 10 + (rolls[i + 1] ?? 0) + (rolls[i + 2] ?? 0); i += 1; }
    else if ((rolls[i] ?? 0) + (rolls[i + 1] ?? 0) === 10) { score += 10 + (rolls[i + 2] ?? 0); i += 2; }
    else { score += (rolls[i] ?? 0) + (rolls[i + 1] ?? 0); i += 2; }
  }

  return { totalScore: score, strikes, spares, openFrames: Math.max(0, 10 - strikes - spares) };
};

// --- 2. Bowling handicap --------------------------------------------------------------
export const bowlingHandicapCalculator: CustomCalculator = (values) => {
  const avg = nonNeg(values.average, 160);
  const hcp = Math.max(0, Math.floor((nonNeg(values.basis, 220) - avg) * clamp(nonNeg(values.percentage, 90), 0, 100) / 100));
  const games = Math.max(1, whole(values.games, 3));

  return { handicapPerGame: hcp, seriesHandicap: hcp * games, gameWithHandicap: nonNeg(values.gameScore, 170) + hcp, expectedHandicapSeries: Math.round(avg * games + hcp * games) };
};

// --- 3. Bowling prize fund -------------------------------------------------------------------
export const bowlingPrizeFundCalculator: CustomCalculator = (values) => {
  const entries = Math.max(1, whole(values.entries, 64));
  const fee = nonNeg(values.entryFee, 60);
  const lineage = nonNeg(values.lineagePerGame, 3) * whole(values.games, 6) * entries;
  const fund = Math.max(0, entries * fee - lineage - (entries * fee * clamp(nonNeg(values.expensesPct, 10), 0, 100)) / 100 + nonNeg(values.addedMoney, 0));
  const places = Math.max(1, Math.ceil(entries / Math.max(1, nonNeg(values.ratio, 5))));
  const weightTotal = (places * (places + 1)) / 2;

  return { prizeFund: round2(fund), placesPaid: places, firstPlace: round2((fund * places) / weightTotal), lastPlace: round2(fund / weightTotal), returnPct: round2(div(fund, entries * fee) * 100) };
};

// --- 4. Bowling ball weight ---------------------------------------------------------------------
export const bowlingBallWeightCalculator: CustomCalculator = (values) => {
  const lb = nonNeg(values.bodyWeight, 160) * (whole(values.unit, 1) === 2 ? 2.20462 : 1);
  const age = nonNeg(values.age, 30);
  let rec = Math.floor(lb * 0.1);
  if (age < 12) rec = Math.min(rec, Math.max(6, Math.round(age)));
  rec += whole(values.strength, 2) === 1 ? -1 : whole(values.strength, 2) === 3 ? 1 : 0;
  rec = clamp(rec, 6, 16);

  return { recommendedLb: rec, rangeLowLb: Math.max(6, rec - 1), rangeHighLb: Math.min(16, rec + 1), recommendedKg: round2(rec * 0.45359237) };
};

// --- 5. Bowling ball speed -----------------------------------------------------------------------
const LANE_FT = 60;

export const bowlingBallSpeedCalculator: CustomCalculator = (values) => {
  const t = nonNeg(values.seconds, 2.5);
  const mph = div(LANE_FT, t) * 0.681818;

  return { speedMph: round2(mph), speedKmh: round2(mph * 1.609344), feetPerSecond: round2(div(LANE_FT, t)), category: mph < 14 ? 1 : mph < 16 ? 2 : mph < 19 ? 3 : 4 };
};

// --- 6. Darts score (501) ---------------------------------------------------------------------------
const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);

export const dartsScoreCalculator: CustomCalculator = (values) => {
  const start = Math.max(1, whole(values.startScore, 501));
  const scored = Math.min(start, nonNeg(values.pointsScored, 300));
  const darts = whole(values.dartsThrown, 15);
  const remaining = start - scored;
  const avg = div(scored, darts) * 3;

  return {
    remaining,
    threeDartAverage: round2(avg),
    estimatedTurnsToFinish: avg > 0 ? Math.ceil(remaining / avg) : 0,
    checkoutPossible: remaining <= 170 && remaining >= 2 && !BOGEY.has(remaining) ? 1 : 0,
  };
};

// --- 7. Darts checkout (double out) ----------------------------------------------------------------------
type Dart = [number, number]; // [segment, multiplier]
const DOUBLE_PREF = [40, 32, 16, 36, 24, 20, 8, 12, 4, 28, 30, 34, 38, 18, 26, 22, 14, 10, 6, 2, 50];
const firstDarts: Dart[] = [
  ...Array.from({ length: 11 }, (_, i): Dart => [20 - i, 3]),
  [25, 1], [50, 1],
  ...Array.from({ length: 20 }, (_, i): Dart => [20 - i, 1]),
  ...Array.from({ length: 9 }, (_, i): Dart => [9 - i, 3]),
];
const dartValue = ([s, m]: Dart) => (s === 50 ? 50 : s * m);
const finishDart = (r: number): Dart | null => (r === 50 ? [50, 2] : r >= 2 && r <= 40 && r % 2 === 0 ? [r / 2, 2] : null);

function twoDart(r: number): Dart[] | null {
  let best: Dart[] | null = null;
  let bestRank = Infinity;
  for (const d of firstDarts) {
    const left = r - dartValue(d);
    const fin = finishDart(left);
    if (!fin) continue;
    const rank = DOUBLE_PREF.indexOf(left);
    if (rank < bestRank) { best = [d, fin]; bestRank = rank; }
  }
  return best;
}

function checkout(r: number): Dart[] | null {
  const one = finishDart(r);
  if (one) return [one];
  const two = twoDart(r);
  if (two) return two;
  for (const d of firstDarts) {
    const rest = twoDart(r - dartValue(d));
    if (rest) return [d, ...rest];
  }
  return null;
}

export const dartsCheckoutCalculator: CustomCalculator = (values) => {
  const r = whole(values.remaining, 100);
  const route = r >= 2 && r <= 170 ? checkout(r) : null;
  const out: Record<string, number> = { dartsNeeded: route ? route.length : 0 };
  for (let i = 0; i < 3; i++) {
    const d = route?.[i];
    out[`dart${i + 1}Number`] = d ? (d[0] === 50 ? 50 : d[0]) : 0;
    out[`dart${i + 1}Multiplier`] = d ? (d[0] === 50 ? 2 : d[1]) : 0;
  }
  return out;
};

// --- 8. USPSA hit factor ------------------------------------------------------------------------------------
export const uspsaHitFactorCalculator: CustomCalculator = (values) => {
  const major = whole(values.powerFactor, 1) === 2;
  const pts =
    5 * nonNeg(values.alphas, 14) + (major ? 4 : 3) * nonNeg(values.charlies, 3) + (major ? 2 : 1) * nonNeg(values.deltas, 1) -
    10 * (nonNeg(values.misses, 0) + nonNeg(values.noShoots, 0) + nonNeg(values.procedurals, 0));
  const points = Math.max(0, pts);
  const hf = div(points, nonNeg(values.time, 12));
  const top = nonNeg(values.topHitFactor, 0);

  return { hitFactor: Math.round(hf * 10000) / 10000, points, stagePoints: top > 0 ? round2((hf / top) * nonNeg(values.stageMax, 80)) : 0, pctOfWinner: top > 0 ? round2((hf / top) * 100) : 0 };
};

export const otherTargetGamesCustomCalculators: Record<string, CustomCalculator> = {
  "bowling-score-calculator": bowlingScoreCalculator,
  "bowling-handicap-calculator": bowlingHandicapCalculator,
  "bowling-prize-fund-calculator": bowlingPrizeFundCalculator,
  "bowling-ball-weight-calculator": bowlingBallWeightCalculator,
  "bowling-ball-speed-calculator": bowlingBallSpeedCalculator,
  "darts-score-calculator": dartsScoreCalculator,
  "darts-checkout-calculator": dartsCheckoutCalculator,
  "uspsa-hit-factor-calculator": uspsaHitFactorCalculator,
};
