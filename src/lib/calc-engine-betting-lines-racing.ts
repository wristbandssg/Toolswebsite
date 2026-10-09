/**
 * Batch: "Sports Calculators" > Sports Betting & Racing Calculators,
 * sub-batch D (Lines, Markets & Horse Racing, 11 tools). See
 * calc-engine-betting-odds.ts for the full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - pointSpreadCalculator: chance to cover a spread (or MLB run line /
 *    NHL puck line) from your projected margin, and its EV.
 *  - spreadToMoneylineCalculator: converts a point spread into win
 *    probability and fair moneylines.
 *  - overUnderCalculator: game totals — over/under probability and EV.
 *  - asianHandicapCalculator: settles whole, half and quarter lines.
 *  - drawNoBetCalculator / doubleChanceCalculator: derived football
 *    markets from 1X2 odds.
 *  - horseRacingBetCalculator: exacta, quinella, trifecta, superfecta cost
 *    (straight, box, key).
 *  - pick4Calculator: daily double, pick 3, pick 4, pick 5, pick 6 ticket cost.
 *  - pariMutuelCalculator: tote payout from the pool and takeout, or from
 *    the odds board (also horse racing payout).
 *  - horseRacingPaceCalculator: fractions, splits, speed and beaten-length
 *    times.
 *  - horseRacingHandicappingCalculator: your odds line vs the tote →
 *    fair odds and overlays.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-betting-lines-racing-calculators.ts for the copy.
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

function fromAmerican(a: number): number {
  if (a >= 100) return 1 + a / 100;
  if (a <= -100) return 1 + 100 / Math.abs(a);
  return 0;
}
function toAmerican(d: number): number {
  if (d <= 1) return 0;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// Standard deviation of the final margin and of the game total, by sport:
// 1 NFL, 2 college football, 3 NBA, 4 college basketball, 5 MLB, 6 NHL.
const MARGIN_SD: Record<number, number> = { 1: 13.5, 2: 16, 3: 12, 4: 11, 5: 4.2, 6: 2.4 };
const TOTAL_SD: Record<number, number> = { 1: 13.5, 2: 16, 3: 18, 4: 15, 5: 4.4, 6: 2.3 };

/** P(X > line), P(X < line), P(push) for a normal X; whole lines can push. */
function threeWay(line: number, mean: number, sd: number) {
  const isWhole = Math.abs(line - Math.round(line)) < 1e-9;
  const pOver = 1 - normCdf((line + (isWhole ? 0.5 : 0) - mean) / sd);
  const pUnder = normCdf((line - (isWhole ? 0.5 : 0) - mean) / sd);
  return { pOver, pUnder, pPush: Math.max(0, 1 - pOver - pUnder) };
}
const evOf = (d: number, pWin: number, pPush: number) => (d > 1 ? (d - 1) * pWin - (1 - pWin - pPush) : 0);

// --- 1. Point Spread (and run line) -----------------------------------------
export const pointSpreadCalculator: CustomCalculator = (values) => {
  const spread = safeNumber(values.spread, -6.5);
  const margin = safeNumber(values.projectedMargin, 7.5);
  const sd = nonNeg(values.customSd, 0) || (MARGIN_SD[whole(values.sport, 1)] ?? 13.5);
  const d = fromAmerican(safeNumber(values.odds, -110));
  // Covering means margin + spread > 0, i.e. margin > −spread.
  const t = threeWay(-spread, margin, sd);

  return {
    coverProbability: round2(t.pOver * 100),
    pushProbability: round2(t.pPush * 100),
    evPercent: round2(evOf(d, t.pOver, t.pPush) * 100),
    breakEvenProbability: d > 0 ? round2(100 / d) : 0,
    // Fair price with pushes refunded: (win + lose) ÷ win.
    fairOdds: t.pOver > 0 ? toAmerican((t.pOver + t.pUnder) / t.pOver) : 0,
  };
};

// --- 2. Spread to Moneyline -------------------------------------------------
export const spreadToMoneylineCalculator: CustomCalculator = (values) => {
  const fav = Math.abs(safeNumber(values.spread, 7));
  const sd = MARGIN_SD[whole(values.sport, 1)] ?? 13.5;
  const p = normCdf(fav / sd);
  const vig = Math.min(15, nonNeg(values.vigPercent, 4.5)) / 100;
  // Spread the margin proportionally over both sides.
  const pf = p * (1 + vig);
  const pd = (1 - p) * (1 + vig);

  return {
    favoriteWinProbability: round2(p * 100),
    underdogWinProbability: round2((1 - p) * 100),
    fairFavoriteMoneyline: toAmerican(1 / p),
    fairUnderdogMoneyline: toAmerican(1 / (1 - p)),
    favoriteMoneylineWithVig: pf < 1 ? toAmerican(1 / pf) : 0,
    underdogMoneylineWithVig: pd < 1 ? toAmerican(1 / pd) : 0,
  };
};

// --- 3. Over/Under ----------------------------------------------------------
export const overUnderCalculator: CustomCalculator = (values) => {
  const line = safeNumber(values.line, 47.5);
  const proj = safeNumber(values.projectedTotal, 50);
  const sd = nonNeg(values.customSd, 0) || (TOTAL_SD[whole(values.sport, 1)] ?? 13.5);
  const t = threeWay(line, proj, sd);
  const dO = fromAmerican(safeNumber(values.overOdds, -110));
  const dU = fromAmerican(safeNumber(values.underOdds, -110));

  return {
    overProbability: round2(t.pOver * 100),
    underProbability: round2(t.pUnder * 100),
    pushProbability: round2(t.pPush * 100),
    overEvPercent: round2(evOf(dO, t.pOver, t.pPush) * 100),
    underEvPercent: round2(evOf(dU, t.pUnder, t.pPush) * 100),
  };
};

// --- 4. Asian Handicap ------------------------------------------------------
export const asianHandicapCalculator: CustomCalculator = (values) => {
  const h = Math.round(safeNumber(values.handicap, -0.75) * 4) / 4;
  const d = Math.max(1.01, nonNeg(values.decimalOdds, 1.95));
  const stake = nonNeg(values.stake, 100);
  // Goal difference from your team's view (your goals − opponent's).
  const gd = safeNumber(values.goalDifference, 1);
  // Quarter lines split the stake over the two nearest half/whole lines.
  const isQuarter = Math.abs(h * 2 - Math.round(h * 2)) > 1e-9;
  const lines = isQuarter ? [h - 0.25, h + 0.25] : [h];
  const part = stake / lines.length;
  let ret = 0;
  for (const l of lines) {
    const adj = gd + l;
    ret += adj > 0 ? part * d : Math.abs(adj) < 1e-9 ? part : 0;
  }
  const profit = ret - stake;
  const full = stake * (d - 1);
  const outcome = profit > full * 0.75 ? 1 : profit > 0 ? 0.5 : Math.abs(profit) < 1e-9 ? 0 : profit > -stake * 0.75 ? -0.5 : -1;

  return { totalReturn: round2(ret), profit: round2(profit), result: outcome, stakeOnEachLine: round2(part), splitLines: lines.length };
};

// --- 5. Draw No Bet ---------------------------------------------------------
export const drawNoBetCalculator: CustomCalculator = (values) => {
  const hm = Math.max(1.01, nonNeg(values.homeOdds, 2.1));
  const dr = Math.max(1.01, nonNeg(values.drawOdds, 3.4));
  const aw = Math.max(1.01, nonNeg(values.awayOdds, 3.6));
  // DNB price = win odds × (1 − 1/draw odds).
  const dnbH = hm * (1 - 1 / dr);
  const dnbA = aw * (1 - 1 / dr);
  const stake = nonNeg(values.stake, 100);

  return {
    homeDnbOdds: round2(dnbH),
    awayDnbOdds: round2(dnbA),
    homeDnbProfit: round2(stake * (dnbH - 1)),
    awayDnbProfit: round2(stake * (dnbA - 1)),
    // Equivalent: back home + cover the draw (stake back on a draw).
    drawCoverStake: round2(stake / dr),
  };
};

// --- 6. Double Chance -------------------------------------------------------
export const doubleChanceCalculator: CustomCalculator = (values) => {
  const hm = Math.max(1.01, nonNeg(values.homeOdds, 2.1));
  const dr = Math.max(1.01, nonNeg(values.drawOdds, 3.4));
  const aw = Math.max(1.01, nonNeg(values.awayOdds, 3.6));
  const comb = (a: number, b: number) => 1 / (1 / a + 1 / b);

  return {
    homeOrDrawOdds: round2(comb(hm, dr)),
    drawOrAwayOdds: round2(comb(dr, aw)),
    homeOrAwayOdds: round2(comb(hm, aw)),
    homeOrDrawProbability: round2((1 / hm + 1 / dr) * 100),
    bookMarginPercent: round2((1 / hm + 1 / dr + 1 / aw - 1) * 100),
  };
};

// --- 7. Horse Racing Exotic Bets --------------------------------------------
export const horseRacingBetCalculator: CustomCalculator = (values) => {
  const type = whole(values.betType, 3); // 1 exacta, 2 quinella, 3 trifecta, 4 superfecta
  const structure = whole(values.structure, 2); // 1 straight, 2 box, 3 key
  const n = whole(values.horses, 4);
  const m = whole(values.keyWith, 4);
  const base = nonNeg(values.baseBet, 1);
  const positions = { 1: 2, 2: 2, 3: 3, 4: 4 }[type] ?? 3;
  const perm = (x: number, k: number) => (x < k ? 0 : Array.from({ length: k }, (_, i) => x - i).reduce((a, b) => a * b, 1));
  let combos: number;
  if (structure === 1) combos = 1;
  else if (structure === 2) combos = type === 2 ? perm(n, 2) / 2 : perm(n, positions);
  else combos = type === 2 ? m : perm(m, positions - 1);

  return { combinations: combos, totalCost: round2(combos * base), costPerCombination: base };
};

// --- 8. Pick 4 (daily double, pick 3/5/6) -----------------------------------
const PICK_LEGS: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };

export const pick4Calculator: CustomCalculator = (values) => {
  const legs = PICK_LEGS[whole(values.betType, 3)] ?? 4;
  const defaults = [2, 3, 1, 4, 1, 1];
  let combos = 1;
  for (let i = 1; i <= legs; i++) combos *= Math.max(1, whole(values[`leg${i}`], defaults[i - 1]));
  const base = nonNeg(values.baseBet, 0.5);

  return { combinations: combos, totalCost: round2(combos * base), legs };
};

// --- 9. Pari-Mutuel ---------------------------------------------------------
export const pariMutuelCalculator: CustomCalculator = (values) => {
  const bet = nonNeg(values.yourBet, 2);
  let perDollarProfit: number;
  if (whole(values.mode, 1) === 2) {
    // From the odds board: odds-to-1.
    perDollarProfit = nonNeg(values.oddsToOne, 5);
  } else {
    const pool = nonNeg(values.winPool, 100000);
    const take = Math.min(40, nonNeg(values.takeoutPercent, 17)) / 100;
    const onHorse = Math.max(1, nonNeg(values.betOnHorse, 15000));
    perDollarProfit = (pool * (1 - take)) / onHorse - 1;
  }
  // Breakage: payouts per $2 are rounded down to the next 10 cents.
  const per2 = Math.max(2.1, Math.floor((2 + 2 * perDollarProfit) * 10) / 10);

  return {
    payoutPer2: round2(per2),
    yourPayout: round2((per2 / 2) * bet),
    yourProfit: round2((per2 / 2) * bet - bet),
    oddsToOne: round2(per2 / 2 - 1),
    impliedProbability: round2((1 / (per2 / 2)) * 100),
  };
};

// --- 10. Horse Racing Pace --------------------------------------------------
export const horseRacingPaceCalculator: CustomCalculator = (values) => {
  const furlongs = Math.max(2, nonNeg(values.furlongs, 6));
  const q = nonNeg(values.quarterTime, 22.4);
  const half = nonNeg(values.halfTime, 45.6);
  const fin = nonNeg(values.finalTime, 70.2);
  const lengths = nonNeg(values.lengthsBehind, 0);
  // One length ≈ 0.2 s (one-fifth of a second).
  const horse = fin + lengths * 0.2;
  const feet = furlongs * 660;

  return {
    yourHorseTime: round2(horse),
    secondQuarter: round2(half - q),
    finalFraction: round2(fin - half),
    secondsPerFurlong: round2(fin / furlongs),
    speedMph: round2(((feet / horse) * 3600) / 5280),
    feetPerSecond: round2(feet / horse),
    earlyPaceShare: fin > 0 ? round2((half / fin) * 100) : 0,
  };
};

// --- 11. Handicapping (odds line and overlays) ------------------------------
export const horseRacingHandicappingCalculator: CustomCalculator = (values) => {
  const out: Record<string, number> = {};
  let total = 0;
  const defaults = [[30, 2.5], [25, 4], [15, 6], [10, 12]];
  for (let i = 1; i <= 4; i++) {
    const p = Math.min(1, nonNeg(values[`prob${i}`], defaults[i - 1][0]) / 100);
    const odds = nonNeg(values[`odds${i}`], defaults[i - 1][1]);
    total += p;
    out[`fairOdds${i}`] = p > 0 ? round2(1 / p - 1) : 0;
    // EV per $1: p × (odds + 1) − 1. Positive = overlay.
    out[`ev${i}`] = p > 0 ? round2((p * (odds + 1) - 1) * 100) : 0;
  }
  return { ...out, totalProbability: round2(total * 100) };
};

export const bettingLinesRacingCustomCalculators: Record<string, CustomCalculator> = {
  "point-spread-calculator": pointSpreadCalculator,
  "spread-to-moneyline-calculator": spreadToMoneylineCalculator,
  "over-under-calculator": overUnderCalculator,
  "asian-handicap-calculator": asianHandicapCalculator,
  "draw-no-bet-calculator": drawNoBetCalculator,
  "double-chance-calculator": doubleChanceCalculator,
  "horse-racing-bet-calculator": horseRacingBetCalculator,
  "pick-4-calculator": pick4Calculator,
  "pari-mutuel-calculator": pariMutuelCalculator,
  "horse-racing-pace-calculator": horseRacingPaceCalculator,
  "horse-racing-handicapping-calculator": horseRacingHandicappingCalculator,
};
