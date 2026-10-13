/**
 * Batch: "Sports Calculators" > Golf Calculators, sub-batch A (Handicaps,
 * 9 tools). The golf list is built in 4 sub-batches (39 tools):
 *  - golf-handicap (this file): handicap index, course / playing handicap and
 *    every team-format allowance.
 *  - golf-scoring: scores, AGS / net double bogey, Stableford, skins, strokes
 *    gained, payouts, odds, pace, calories, disc golf rating.
 *  - golf-equipment: club / putter length, lie angle, swing weight, shaft,
 *    grip, driver loft, ball fitting, trade-in, simulator projector.
 *  - golf-distance: club distance, gapping, swing speed, ball speed,
 *    smash factor, altitude, wind, trajectory, rule of 12, cart speed.
 *
 * Merged from the 43-keyword list: Ball Speed to Swing Speed -> golf swing
 * speed; Net Double Bogey -> adjusted gross score; Putter Lie Angle -> lie
 * angle; Golf Net Score -> golf score.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - golfHandicapCalculator: WHS Handicap Index from up to 20 rounds.
 *  - courseHandicapCalculator: Index -> strokes on one set of tees (100%).
 *  - playingHandicapCalculator: course handicap x the format allowance
 *    (individual formats and four-ball).
 *  - matchPlayHandicapCalculator: singles match — strokes the higher
 *    handicap receives, off the low player.
 *  - bestBallHandicapCalculator: four players, four-ball 85% / 90%, strokes
 *    off the low ball.
 *  - scrambleHandicapCalculator: one team number from 2/3/4 players
 *    (USGA weighted percentages or % of combined).
 *  - shambleHandicapCalculator: each player's own reduced handicap
 *    (75–85%) since everyone plays their own ball after the drive.
 *  - alternateShotGreensomesHandicapCalculator: one team number for a pair
 *    (foursomes 50% combined, greensomes / Chapman 60/40).
 *  - golfLeagueHandicapCalculator: simple league method — average of recent
 *    scores over par x 80/90%, no slope or rating needed.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-golf-handicap-calculators.ts for the copy.
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
const round1 = (n: number) => Math.round(n * 10) / 10;
const slopeOf = (v: number) => Math.min(155, Math.max(55, num(v, 113)));

/** WHS Course Handicap, unrounded: Index x Slope/113 + (Course Rating - Par). */
function courseHandicapRaw(index: number, slope: number, rating: number, par: number): number {
  return index * (slopeOf(slope) / 113) + (rating - par);
}

// --- 1. Golf Handicap (WHS Handicap Index) --------------------------------------
// Number of rounds -> [differentials counted, adjustment] (WHS Rule 5.2).
const WHS_TABLE: Record<number, [number, number]> = {
  3: [1, -2], 4: [1, -1], 5: [1, 0], 6: [2, -1], 7: [2, 0], 8: [2, 0], 9: [3, 0], 10: [3, 0], 11: [3, 0],
  12: [4, 0], 13: [4, 0], 14: [4, 0], 15: [5, 0], 16: [5, 0], 17: [6, 0], 18: [6, 0], 19: [7, 0], 20: [8, 0],
};

export const golfHandicapCalculator: CustomCalculator = (values) => {
  const mode = whole(values.entryMode, 1); // 1 = scores, 2 = differentials
  const rating = num(values.courseRating, 72);
  const slope = slopeOf(values.slopeRating);
  const pcc = num(values.pcc, 0);

  const diffs: number[] = [];
  for (let i = 1; i <= 20; i++) {
    const v = num(values[`round${i}`], 0);
    if (v === 0) continue;
    diffs.push(round1(mode === 2 ? v : (113 / slope) * (v - rating - pcc)));
  }
  const n = Math.min(20, diffs.length);
  const rule = WHS_TABLE[n];
  if (!rule) return { handicapIndex: 0, roundsEntered: n, differentialsUsed: 0, lowestDifferential: n ? Math.min(...diffs) : 0, averageOfUsed: 0 };

  const used = [...diffs].sort((a, b) => a - b).slice(0, rule[0]);
  const avg = used.reduce((s, d) => s + d, 0) / used.length;
  const index = Math.min(54, round1(avg + rule[1]));

  return { handicapIndex: index, roundsEntered: n, differentialsUsed: rule[0], lowestDifferential: used[0], averageOfUsed: round2(avg) };
};

// --- 2. Course Handicap -----------------------------------------------------------
export const courseHandicapCalculator: CustomCalculator = (values) => {
  const nine = whole(values.holes, 18) === 9;
  const index = num(values.handicapIndex, 15) / (nine ? 2 : 1);
  const par = num(values.par, nine ? 36 : 72);
  const raw = courseHandicapRaw(index, values.slopeRating, num(values.courseRating, nine ? 36 : 72), par);
  const ch = Math.round(raw);
  const holes = nine ? 9 : 18;
  const abs = Math.abs(ch);

  return {
    courseHandicap: ch,
    unrounded: round2(raw),
    netPar: par + ch,
    strokesOnEveryHole: ch >= 0 ? Math.floor(abs / holes) : 0,
    extraStrokeHoles: ch >= 0 ? abs % holes : 0,
    strokesGivenBack: ch < 0 ? abs : 0,
  };
};

// --- 3. Playing Handicap --------------------------------------------------------------
// WHS Appendix C recommended allowances.
const PLAYING_ALLOWANCE: Record<number, number> = { 1: 95, 2: 100, 3: 95, 4: 95, 5: 85, 6: 90 };

export const playingHandicapCalculator: CustomCalculator = (values) => {
  const raw = courseHandicapRaw(num(values.handicapIndex, 15), values.slopeRating, num(values.courseRating, 72), num(values.par, 72));
  const fmt = whole(values.format, 1);
  const pct = fmt === 7 ? nonNeg(values.customAllowance, 100) : PLAYING_ALLOWANCE[fmt] ?? 95;

  return { playingHandicap: Math.round(raw * pct / 100), courseHandicap: Math.round(raw), allowancePct: pct, strokesFromAllowance: Math.round(raw) - Math.round(raw * pct / 100) };
};

// --- 4. Match Play Handicap -----------------------------------------------------------------
export const matchPlayHandicapCalculator: CustomCalculator = (values) => {
  const rating = num(values.courseRating, 72);
  const par = num(values.par, 72);
  const pct = nonNeg(values.allowance, 100);
  const a = Math.round(courseHandicapRaw(num(values.playerAIndex, 8), values.slopeRating, rating, par) * pct / 100);
  const b = Math.round(courseHandicapRaw(num(values.playerBIndex, 18), values.slopeRating, rating, par) * pct / 100);
  const diff = Math.abs(a - b);

  return {
    strokesReceived: diff,
    receivingPlayer: a === b ? 0 : a > b ? 1 : 2,
    playerAPlayingHandicap: a,
    playerBPlayingHandicap: b,
    holesWithTwoStrokes: Math.max(0, diff - 18),
  };
};

// --- 5. Best Ball (Four-Ball) Handicap -----------------------------------------------------------
export const bestBallHandicapCalculator: CustomCalculator = (values) => {
  const pct = whole(values.format, 1) === 2 ? 90 : 85;
  const rating = num(values.courseRating, 72);
  const par = num(values.par, 72);
  const ph = [1, 2, 3, 4].map((i) => Math.round(courseHandicapRaw(num(values[`player${i}Index`], 10), values.slopeRating, rating, par) * pct / 100));
  const low = Math.min(...ph);

  return {
    allowancePct: pct,
    player1Handicap: ph[0], player2Handicap: ph[1], player3Handicap: ph[2], player4Handicap: ph[3],
    player1StrokesOffLow: ph[0] - low, player2StrokesOffLow: ph[1] - low, player3StrokesOffLow: ph[2] - low, player4StrokesOffLow: ph[3] - low,
  };
};

// --- 6. Scramble Handicap -----------------------------------------------------------------------
// USGA (WHS Appendix C): 4-person 25/20/15/10, 3-person 30/20/10, 2-person 35/15, low to high.
const SCRAMBLE_PCT: Record<number, number[]> = { 2: [35, 15], 3: [30, 20, 10], 4: [25, 20, 15, 10] };

export const scrambleHandicapCalculator: CustomCalculator = (values) => {
  const size = Math.min(4, Math.max(2, whole(values.teamSize, 4)));
  const chs = [1, 2, 3, 4].slice(0, size).map((i) => num(values[`player${i}Handicap`], 0)).sort((a, b) => a - b);
  const combined = chs.reduce((s, c) => s + c, 0);
  const raw = whole(values.method, 1) === 2
    ? combined * nonNeg(values.combinedPct, 10) / 100
    : chs.reduce((s, c, i) => s + c * SCRAMBLE_PCT[size][i] / 100, 0);

  return { teamHandicap: Math.round(raw), unrounded: round2(raw), combinedHandicaps: combined, lowestHandicap: chs[0] };
};

// --- 7. Shamble Handicap ---------------------------------------------------------------------------
const SHAMBLE_PCT: Record<number, number> = { 1: 80, 2: 75, 3: 85 };

export const shambleHandicapCalculator: CustomCalculator = (values) => {
  const size = Math.min(4, Math.max(2, whole(values.teamSize, 4)));
  const pct = whole(values.allowance, 1) === 4 ? nonNeg(values.customAllowance, 80) : SHAMBLE_PCT[whole(values.allowance, 1)] ?? 80;
  const ph = [1, 2, 3, 4].map((i) => (i <= size ? Math.round(num(values[`player${i}Handicap`], 0) * pct / 100) : 0));
  const counted = Math.min(size, Math.max(1, whole(values.ballsCounted, 2)));
  const lowest = ph.slice(0, size).sort((a, b) => a - b).slice(0, counted).reduce((s, p) => s + p, 0);

  return { allowancePct: pct, player1Handicap: ph[0], player2Handicap: ph[1], player3Handicap: ph[2], player4Handicap: ph[3], strokesOnCountedBalls: lowest };
};

// --- 8. Alternate Shot (Foursomes) & Greensomes Handicap ------------------------------------------------
export const alternateShotGreensomesHandicapCalculator: CustomCalculator = (values) => {
  const fmt = whole(values.format, 1); // 1 foursomes, 2 greensomes, 3 Chapman / Pinehurst
  const team = (x: number, y: number) => {
    const lo = Math.min(x, y);
    const hi = Math.max(x, y);
    return fmt === 1 ? (x + y) * 0.5 : lo * 0.6 + hi * 0.4;
  };
  const ours = team(num(values.player1Handicap, 10), num(values.player2Handicap, 20));
  const theirs = team(num(values.opponent1Handicap, 0), num(values.opponent2Handicap, 0));
  const t = Math.round(ours);
  const o = Math.round(theirs);
  const hasOpp = num(values.opponent1Handicap, 0) !== 0 || num(values.opponent2Handicap, 0) !== 0;

  return { teamHandicap: t, unrounded: round2(ours), opponentTeamHandicap: hasOpp ? o : 0, matchStrokes: hasOpp ? Math.abs(t - o) : 0 };
};

// --- 9. Golf League Handicap ---------------------------------------------------------------------------
export const golfLeagueHandicapCalculator: CustomCalculator = (values) => {
  const par = num(values.par, 36);
  const scores: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const s = nonNeg(values[`score${i}`], 0);
    if (s > 0) scores.push(s); // score1 = most recent
  }
  if (!scores.length) return { leagueHandicap: 0, scoresUsed: 0, averageScore: 0, averageOverPar: 0 };

  const method = whole(values.method, 1);
  let pool = scores;
  if (method === 2) pool = [...scores.slice(0, 5)].sort((a, b) => a - b).slice(0, 3);
  else if (method === 3) pool = [...scores.slice(0, 8)].sort((a, b) => a - b).slice(0, 4);
  else if (method === 4) pool = [...scores].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(scores.length / 2)));

  const avg = pool.reduce((s, x) => s + x, 0) / pool.length;
  const over = avg - par;
  const pct = nonNeg(values.percentage, 80);

  return { leagueHandicap: Math.max(0, Math.round(over * pct / 100)), scoresUsed: pool.length, averageScore: round2(avg), averageOverPar: round2(over) };
};

export const golfHandicapCustomCalculators: Record<string, CustomCalculator> = {
  "golf-handicap-calculator": golfHandicapCalculator,
  "course-handicap-calculator": courseHandicapCalculator,
  "playing-handicap-calculator": playingHandicapCalculator,
  "match-play-handicap-calculator": matchPlayHandicapCalculator,
  "best-ball-handicap-calculator": bestBallHandicapCalculator,
  "scramble-handicap-calculator": scrambleHandicapCalculator,
  "shamble-handicap-calculator": shambleHandicapCalculator,
  "alternate-shot-greensomes-handicap-calculator": alternateShotGreensomesHandicapCalculator,
  "golf-league-handicap-calculator": golfLeagueHandicapCalculator,
};
