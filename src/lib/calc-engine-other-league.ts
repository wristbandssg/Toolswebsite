/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-league (standings, ratings, brackets & judging, 8 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Merged: basketball playing time -> playing time; seeding -> tournament
 * bracket (first-round opponent for any seed).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - winPercentageCalculator: a team's win % and wins needed for a target;
 *    strengthOfScheduleCalculator: how good its opponents were.
 *  - eloRatingCalculator: head-to-head rating update after one game.
 *  - rodeoPayoutCalculator: purse split by place (rodeo / event payouts).
 *  - boxingScorecardCalculator vs figureSkatingCalculator: 10-point-must
 *    round scoring vs ISU TES + PCS segment score.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-league-calculators.ts for the copy.
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

// --- 1. Win percentage ---------------------------------------------------------
export const winPercentageCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.wins, 30);
  const l = nonNeg(values.losses, 20);
  const t = nonNeg(values.ties, 0);
  const mode = whole(values.tieMode, 1); // 1 half a win, 2 as a loss, 3 ignore
  const pct = mode === 3 ? div(w, w + l) : div(w + (mode === 1 ? 0.5 * t : 0), w + l + t);
  const left = whole(values.gamesLeft, 0);
  const target = clamp(nonNeg(values.targetPct, 60), 0, 100) / 100;
  const played = mode === 3 ? w + l : w + l + t;
  const credited = w + (mode === 1 ? 0.5 * t : 0);
  const need = Math.max(0, Math.ceil(target * (played + left) - credited - 1e-9));

  return { winPct: round2(pct * 100), winPctDecimal: Math.round(pct * 1000) / 1000, winsNeeded: need, possible: need <= left ? 1 : 0 };
};

// --- 2. Elo rating ----------------------------------------------------------------
export const eloRatingCalculator: CustomCalculator = (values) => {
  const ra = num(values.ratingA, 1500);
  const rb = num(values.ratingB, 1600);
  const k = nonNeg(values.kFactor, 32);
  const s = whole(values.result, 1) === 1 ? 1 : whole(values.result, 1) === 2 ? 0.5 : 0;
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  const change = k * (s - ea);

  return { expectedScoreA: round2(ea * 100), newRatingA: round2(ra + change), newRatingB: round2(rb - change), changeA: round2(change) };
};

// --- 3. Strength of schedule -----------------------------------------------------------
export const strengthOfScheduleCalculator: CustomCalculator = (values) => {
  const opp: number[] = [];
  for (let i = 1; i <= 12; i++) {
    const v = nonNeg(values[`opp${i}`], 0);
    if (v > 0) opp.push(Math.min(100, v) / 100);
  }
  const owp = opp.length ? opp.reduce((s, x) => s + x, 0) / opp.length : 0;
  const oowp = nonNeg(values.oowp, 0) > 0 ? Math.min(100, nonNeg(values.oowp, 0)) / 100 : owp;
  const sos = (2 * owp + oowp) / 3;

  return { strengthOfSchedule: Math.round(sos * 1000) / 1000, opponentsWinPct: round2(owp * 100), opponentsCounted: opp.length, rating: sos >= 0.55 ? 3 : sos >= 0.45 ? 2 : 1 };
};

// --- 4. Playing time (equal minutes) ------------------------------------------------------
export const playingTimeCalculator: CustomCalculator = (values) => {
  const periods = Math.max(1, nonNeg(values.periods, 4));
  const length = nonNeg(values.periodLength, 8);
  const onField = Math.max(1, whole(values.onField, 5));
  const roster = Math.max(onField, whole(values.roster, 9));
  const gameMin = periods * length;
  const each = (gameMin * onField) / roster;

  return { minutesEach: round2(each), shareOfGamePct: round2(div(each, gameMin) * 100), sittingAtOnce: roster - onField, minutesEachPerPeriod: round2(each / periods), totalPlayerMinutes: round2(gameMin * onField) };
};

// --- 5. Tournament bracket (incl. seeding) ---------------------------------------------------
export const tournamentBracketCalculator: CustomCalculator = (values) => {
  const n = Math.max(2, whole(values.teams, 12));
  const type = whole(values.format, 1); // 1 single, 2 double, 3 round robin
  const rounds = Math.ceil(Math.log2(n));
  const size = Math.pow(2, rounds);
  const seed = clamp(whole(values.seed, 1), 1, n);
  const opp = size + 1 - seed;
  if (type === 3) {
    return { games: (n * (n - 1)) / 2, rounds: n % 2 === 0 ? n - 1 : n, byes: n % 2 === 0 ? 0 : n, seedFirstOpponent: 0, seedHasBye: 0 };
  }
  return {
    games: type === 2 ? 2 * n - 2 : n - 1,
    rounds: type === 2 ? rounds * 2 : rounds,
    byes: size - n,
    seedFirstOpponent: opp > n ? 0 : opp,
    seedHasBye: opp > n ? 1 : 0,
  };
};

// --- 6. Rodeo payout ---------------------------------------------------------------------------
const PAYOUT_SPLITS: Record<number, number[]> = {
  1: [100], 2: [60, 40], 3: [50, 30, 20], 4: [40, 30, 20, 10], 5: [33, 27, 20, 13, 7], 6: [29, 24, 19, 14, 9, 5],
};

export const rodeoPayoutCalculator: CustomCalculator = (values) => {
  const fees = whole(values.entries, 40) * nonNeg(values.entryFee, 100);
  const purse = Math.max(0, fees * (1 - clamp(nonNeg(values.deductionPct, 10), 0, 100) / 100) + nonNeg(values.addedMoney, 1000));
  const places = clamp(whole(values.places, 4), 1, 6);
  const split = PAYOUT_SPLITS[places];
  const at = (i: number) => (i < places ? round2((purse * split[i]) / 100) : 0);

  return { purse: round2(purse), first: at(0), second: at(1), third: at(2), fourth: at(3), fifth: at(4), sixth: at(5) };
};

// --- 7. Boxing scorecard (10-point must) ----------------------------------------------------------
// Round codes: 0 not scored, 1 A 10-9, 2 B 10-9, 3 even 10-10, 4 A 10-8, 5 B 10-8, 6 A 10-7, 7 B 10-7.
const ROUND: Record<number, [number, number]> = { 1: [10, 9], 2: [9, 10], 3: [10, 10], 4: [10, 8], 5: [8, 10], 6: [10, 7], 7: [7, 10] };

export const boxingScorecardCalculator: CustomCalculator = (values) => {
  let a = 0;
  let b = 0;
  let rounds = 0;
  for (let i = 1; i <= 12; i++) {
    const r = ROUND[whole(values[`round${i}`], 0)];
    if (!r) continue;
    a += r[0];
    b += r[1];
    rounds++;
  }
  a -= nonNeg(values.deductionsA, 0);
  b -= nonNeg(values.deductionsB, 0);

  return { fighterA: a, fighterB: b, result: a === b ? 0 : a > b ? 1 : 2, margin: Math.abs(a - b), roundsScored: rounds };
};

// --- 8. Figure skating segment score -----------------------------------------------------------------
// PCS factors (ISU, from 2022–23): singles SP men 1.67 / women 1.33, FS men 3.33 / women 2.67; pairs SP 1.33 / FS 2.67; ice dance RD 1.33 / FD 2.00.
const PCS_FACTOR: Record<number, number> = { 1: 1.67, 2: 3.33, 3: 1.33, 4: 2.67, 5: 1.33, 6: 2.67, 7: 1.33, 8: 2 };

export const figureSkatingCalculator: CustomCalculator = (values) => {
  const base = nonNeg(values.baseValue, 45);
  const goe = clamp(num(values.averageGoe, 1), -5, 5);
  const tes = base * (1 + 0.1 * goe);
  const factor = PCS_FACTOR[whole(values.segment, 1)] ?? 1.67;
  const pcsAvg = clamp(nonNeg(values.pcsAverage, 8), 0, 10);
  const pcs = pcsAvg * 3 * factor;
  const total = tes + pcs - nonNeg(values.deductions, 0);

  return { segmentScore: round2(total), technicalScore: round2(tes), componentScore: round2(pcs), goeValue: round2(tes - base) };
};

export const otherLeagueCustomCalculators: Record<string, CustomCalculator> = {
  "win-percentage-calculator": winPercentageCalculator,
  "elo-rating-calculator": eloRatingCalculator,
  "strength-of-schedule-calculator": strengthOfScheduleCalculator,
  "playing-time-calculator": playingTimeCalculator,
  "tournament-bracket-calculator": tournamentBracketCalculator,
  "rodeo-payout-calculator": rodeoPayoutCalculator,
  "boxing-scorecard-calculator": boxingScorecardCalculator,
  "figure-skating-calculator": figureSkatingCalculator,
};
