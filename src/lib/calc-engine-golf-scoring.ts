/**
 * Batch: "Sports Calculators" > Golf Calculators, sub-batch B (Scoring,
 * Games & Rounds, 10 tools). See calc-engine-golf-handicap.ts for the full
 * list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - golfScoreCalculator: gross, to par, net (also the golf net score
 *    calculator) and round stats (fairways, greens, putts).
 *  - adjustedGrossScoreCalculator: caps blow-up holes at net double bogey
 *    (also the net double bogey calculator) for handicap posting.
 *  - stablefordScoringCalculator: points from net hole results (standard
 *    or modified Stableford).
 *  - skinsCalculator: money per skin from the pot.
 *  - golfTournamentPayoutCalculator: purse split across paid places.
 *  - strokesGainedCalculator: one shot vs an approximate PGA Tour baseline.
 *  - holeInOneOddsCalculator: chance of an ace per round / year / period.
 *  - golfPaceOfPlayCalculator: round length and finish time.
 *  - golfCaloriesBurnedCalculator: MET-based calories for golf types.
 *  - discGolfRatingCalculator: PDGA-style round rating from SSA or from two
 *    rated scores.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-golf-scoring-calculators.ts for the copy.
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
/** Body weight: unit 1 = kg, 2 = lb -> kg. */
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);

// --- 1. Golf Score (gross, net, stats) -------------------------------------------
export const golfScoreCalculator: CustomCalculator = (values) => {
  const nine = whole(values.holes, 18) === 9;
  const holes = nine ? 9 : 18;
  const gross = nonNeg(values.frontNine, 45) + (nine ? 0 : nonNeg(values.backNine, 45));
  const par = num(values.par, nine ? 36 : 72);
  const ch = num(values.courseHandicap, 0);
  const net = gross - ch;
  const fairwayHoles = Math.max(1, whole(values.fairwayHoles, nine ? 7 : 14));

  return {
    grossScore: gross,
    grossToPar: gross - par,
    netScore: net,
    netToPar: net - par,
    averagePerHole: round2(gross / holes),
    fairwaysHitPct: round2(Math.min(100, (nonNeg(values.fairwaysHit, 0) / fairwayHoles) * 100)),
    greensInRegulationPct: round2(Math.min(100, (nonNeg(values.greensHit, 0) / holes) * 100)),
    puttsPerHole: round2(nonNeg(values.putts, 0) / holes),
  };
};

// --- 2. Adjusted Gross Score / Net Double Bogey --------------------------------------
/** Handicap strokes received on a hole of stroke index si (negative for plus handicaps). */
function strokesOnHole(ch: number, si: number): number {
  if (ch >= 0) return Math.floor(ch / 18) + (si <= ch % 18 ? 1 : 0);
  const give = Math.min(18, -ch);
  return si > 18 - give ? -1 : 0;
}

export const adjustedGrossScoreCalculator: CustomCalculator = (values) => {
  const gross = nonNeg(values.grossScore, 95);
  const ch = Math.round(num(values.courseHandicap, 20));
  const noIndex = whole(values.hasHandicap, 1) === 2;
  const out: Record<string, number> = {};
  let removed = 0;

  for (let i = 1; i <= 6; i++) {
    const score = nonNeg(values[`hole${i}Score`], 0);
    const par = Math.min(6, Math.max(3, whole(values[`hole${i}Par`], 4)));
    const si = Math.min(18, Math.max(1, whole(values[`hole${i}StrokeIndex`], 1)));
    const max = noIndex ? par + 5 : par + 2 + strokesOnHole(ch, si);
    out[`hole${i}MaxScore`] = score > 0 ? max : 0;
    if (score > max) removed += score - max;
  }

  return { adjustedGrossScore: gross - removed, strokesRemoved: removed, ...out };
};

// --- 3. Stableford ---------------------------------------------------------------------
// Points for [albatross, eagle, birdie, par, bogey, double bogey or worse].
const STABLEFORD_POINTS: Record<number, number[]> = { 1: [5, 4, 3, 2, 1, 0], 2: [8, 5, 2, 0, -1, -3] };

export const stablefordScoringCalculator: CustomCalculator = (values) => {
  const pts = STABLEFORD_POINTS[whole(values.system, 1)] ?? STABLEFORD_POINTS[1];
  const counts = ["albatrosses", "eagles", "birdies", "pars", "bogeys", "doubles"].map((k) => whole(values[k], 0));
  const holes = counts.reduce((s, c) => s + c, 0);
  const total = counts.reduce((s, c, i) => s + c * pts[i], 0);

  return { totalPoints: total, holesCounted: holes, pointsPerHole: round2(div(total, holes)), versusTarget: whole(values.system, 1) === 1 ? total - 2 * holes : total };
};

// --- 4. Skins ----------------------------------------------------------------------------
export const skinsCalculator: CustomCalculator = (values) => {
  const players = whole(values.players, 4);
  const buyIn = nonNeg(values.buyIn, 20);
  const pot = players * buyIn;
  const mode = whole(values.mode, 1); // 1 = split pot by skins won, 2 = fixed value per skin
  const skinsWon = whole(values.totalSkinsWon, 18);
  const yours = whole(values.yourSkins, 0);
  const value = mode === 2 ? nonNeg(values.skinValue, 5) : div(pot, skinsWon);
  const winnings = yours * value;

  return { valuePerSkin: round2(value), yourWinnings: round2(winnings), yourNet: round2(winnings - (mode === 2 ? 0 : buyIn)), totalPot: round2(pot) };
};

// --- 5. Strokes Gained ----------------------------------------------------------------------
// Approximate PGA Tour baseline (after Mark Broadie, "Every Shot Counts").
// Off the green: yards; columns = tee, fairway, rough, sand, recovery.
const SG_YARDS = [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600];
const SG_TABLE: number[][] = [
  // tee
  [2.92, 2.92, 2.92, 2.92, 2.92, 2.92, 2.99, 2.97, 2.99, 3.05, 3.12, 3.17, 3.25, 3.45, 3.65, 3.71, 3.79, 3.86, 3.92, 3.96, 3.99, 4.02, 4.08, 4.17, 4.28, 4.41, 4.54, 4.65, 4.74, 4.79, 4.82],
  // fairway
  [2.18, 2.40, 2.60, 2.70, 2.75, 2.80, 2.85, 2.91, 2.98, 3.08, 3.19, 3.32, 3.45, 3.58, 3.69, 3.78, 3.84, 3.88, 3.95, 4.03, 4.11, 4.15, 4.20, 4.29, 4.40, 4.53, 4.66, 4.78, 4.86, 4.91, 4.94],
  // rough
  [2.34, 2.59, 2.78, 2.91, 2.96, 3.02, 3.08, 3.15, 3.23, 3.31, 3.42, 3.53, 3.64, 3.74, 3.83, 3.90, 3.95, 4.02, 4.11, 4.21, 4.30, 4.34, 4.39, 4.48, 4.59, 4.72, 4.85, 4.97, 5.05, 5.10, 5.13],
  // sand
  [2.43, 2.53, 2.82, 3.15, 3.24, 3.23, 3.21, 3.22, 3.28, 3.40, 3.55, 3.70, 3.84, 3.93, 4.00, 4.04, 4.12, 4.26, 4.41, 4.55, 4.69, 4.73, 4.78, 4.87, 4.98, 5.11, 5.24, 5.36, 5.44, 5.49, 5.52],
  // recovery
  [3.80, 3.80, 3.80, 3.80, 3.80, 3.80, 3.78, 3.80, 3.81, 3.82, 3.87, 3.92, 3.97, 4.03, 4.10, 4.20, 4.31, 4.44, 4.56, 4.66, 4.75, 4.79, 4.84, 4.93, 5.04, 5.17, 5.30, 5.42, 5.50, 5.55, 5.58],
];
// On the green: feet.
const SG_FEET = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 60, 90];
const SG_PUTT = [1.0, 1.01, 1.04, 1.13, 1.23, 1.34, 1.42, 1.5, 1.56, 1.61, 1.78, 1.87, 1.98, 2.06, 2.14, 2.21, 2.4];

function interp(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let i = 1;
  while (xs[i] < x) i++;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

/** Expected strokes to hole out. lie: 1 tee, 2 fairway, 3 rough, 4 sand, 5 recovery, 6 green, 7 holed. */
function expectedStrokes(lie: number, distance: number): number {
  if (lie === 7) return 0;
  if (lie === 6) return interp(SG_FEET, SG_PUTT, Math.max(1, distance));
  return interp(SG_YARDS, SG_TABLE[Math.min(5, Math.max(1, lie)) - 1], distance);
}

export const strokesGainedCalculator: CustomCalculator = (values) => {
  const start = expectedStrokes(whole(values.startLie, 1), nonNeg(values.startDistance, 400));
  const end = expectedStrokes(whole(values.endLie, 2), nonNeg(values.endDistance, 140));
  const sg = start - end - 1;

  return { strokesGained: round2(sg), expectedBefore: round2(start), expectedAfter: round2(end) };
};

// --- 6. Tournament Payout ------------------------------------------------------------------------
const PGA_TOUR_PCT = [18, 10.9, 6.9, 4.9, 4.1, 3.625, 3.375, 3.125, 2.925, 2.725];

export const golfTournamentPayoutCalculator: CustomCalculator = (values) => {
  const gross = whole(values.entrants, 40) * nonNeg(values.entryFee, 50);
  const pool = Math.max(0, gross * (1 - nonNeg(values.deductionPct, 0) / 100) + nonNeg(values.addedMoney, 0));
  const n = Math.min(10, Math.max(1, whole(values.placesPaid, 5)));
  const style = whole(values.structure, 1);
  const weights = Array.from({ length: n }, (_, i) =>
    style === 1 ? PGA_TOUR_PCT[i] : style === 2 ? n - i : style === 3 ? Math.pow(0.5, i) : 1
  );
  const total = weights.reduce((s, w) => s + w, 0);
  const pay = weights.map((w) => round2((pool * w) / total));
  const at = (i: number) => (i < n ? pay[i] : 0);

  return { prizePool: round2(pool), first: at(0), second: at(1), third: at(2), fourth: at(3), fifth: at(4), lastPaidPlace: pay[n - 1] };
};

// --- 7. Hole in One Odds ----------------------------------------------------------------------------
// Commonly quoted odds per par-3 tee shot (National Hole-in-One Registry / Golf Digest).
const ACE_ODDS: Record<number, number> = { 1: 12500, 2: 5000, 3: 3500, 4: 2500 };

export const holeInOneOddsCalculator: CustomCalculator = (values) => {
  const odds = whole(values.golfer, 1) === 5 ? Math.max(1, nonNeg(values.customOdds, 12500)) : ACE_ODDS[whole(values.golfer, 1)] ?? 12500;
  const p = 1 / odds;
  const perRound = 1 - Math.pow(1 - p, whole(values.par3sPerRound, 4));
  const perYear = 1 - Math.pow(1 - perRound, whole(values.roundsPerYear, 30));
  const years = nonNeg(values.years, 10);
  const overPeriod = 1 - Math.pow(1 - perYear, years);
  const yearsToFifty = perYear > 0 ? Math.log(0.5) / Math.log(1 - perYear) : 0;

  return {
    chanceOverPeriodPct: round2(overPeriod * 100),
    chancePerRoundPct: round2(perRound * 100 * 100) / 100,
    oneInRounds: Math.round(div(1, perRound)),
    chancePerYearPct: round2(perYear * 100),
    yearsForFiftyPctChance: round2(yearsToFifty),
  };
};

// --- 8. Pace of Play ----------------------------------------------------------------------------------
// Minutes per hole for a 4-ball (par 3 / 4 / 5); smaller groups move faster.
const GROUP_FACTOR: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 0.92, 4: 1 };

export const golfPaceOfPlayCalculator: CustomCalculator = (values) => {
  const p3 = whole(values.par3s, 4);
  const p4 = whole(values.par4s, 10);
  const p5 = whole(values.par5s, 4);
  const holes = p3 + p4 + p5;
  const base = p3 * 10 + p4 * 14 + p5 * 17;
  const factor = (GROUP_FACTOR[Math.min(4, Math.max(1, whole(values.groupSize, 4)))] ?? 1) * (whole(values.transport, 1) === 2 ? 0.95 : 1);
  const minutes = Math.round(base * factor + nonNeg(values.breakMinutes, 0));
  const start = Math.min(23, whole(values.teeHour, 8)) * 60 + Math.min(59, whole(values.teeMinute, 0));
  const finish = (start + minutes) % 1440;

  return {
    roundMinutes: minutes,
    roundHours: round2(minutes / 60),
    minutesPerHole: round2(div(minutes, holes)),
    finishHour: Math.floor(finish / 60),
    finishMinute: finish % 60,
  };
};

// --- 9. Golf Calories Burned ----------------------------------------------------------------------------
// 2011 Compendium of Physical Activities METs.
const GOLF_MET: Record<number, number> = { 1: 4.3, 2: 5.3, 3: 3.5, 4: 4.8, 5: 3.0, 6: 3.0 };

export const golfCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const met = GOLF_MET[whole(values.activity, 1)] ?? 4.3;
  const w = kg(nonNeg(values.weight, 80), values.weightUnit);
  const hours = nonNeg(values.minutes, 240) / 60;
  const kcal = met * w * hours;
  const holes = whole(values.holes, 18);

  return { calories: Math.round(kcal), caloriesPerHour: Math.round(div(kcal, hours)), caloriesPerHole: round2(div(kcal, holes)), met };
};

// --- 10. Disc Golf Rating ------------------------------------------------------------------------------------
/** PDGA-style rating points per throw at a given SSA. */
function pointsPerThrow(ssa: number): number {
  return ssa < 50.3 ? -0.225 * ssa + 18.15 : -0.1875 * ssa + 16.5;
}

export const discGolfRatingCalculator: CustomCalculator = (values) => {
  const score = nonNeg(values.score, 54);
  if (whole(values.method, 1) === 2) {
    const s1 = num(values.refScore1, 50);
    const r1 = num(values.refRating1, 980);
    const s2 = num(values.refScore2, 58);
    const r2 = num(values.refRating2, 900);
    const ppt = s1 !== s2 ? (r1 - r2) / (s2 - s1) : 0;
    const scoreFor1000 = ppt > 0 ? s1 - (1000 - r1) / ppt : 0;
    return { roundRating: Math.round(r1 - (score - s1) * ppt), pointsPerThrow: round2(ppt), scoreFor1000Rating: round2(scoreFor1000) };
  }
  const ssa = Math.max(30, num(values.ssa, 54));
  const ppt = pointsPerThrow(ssa);

  return { roundRating: Math.round(1000 + (ssa - score) * ppt), pointsPerThrow: round2(ppt), scoreFor1000Rating: round2(ssa) };
};

export const golfScoringCustomCalculators: Record<string, CustomCalculator> = {
  "golf-score-calculator": golfScoreCalculator,
  "adjusted-gross-score-calculator": adjustedGrossScoreCalculator,
  "stableford-scoring-calculator": stablefordScoringCalculator,
  "skins-calculator": skinsCalculator,
  "strokes-gained-calculator": strokesGainedCalculator,
  "golf-tournament-payout-calculator": golfTournamentPayoutCalculator,
  "hole-in-one-odds-calculator": holeInOneOddsCalculator,
  "golf-pace-of-play-calculator": golfPaceOfPlayCalculator,
  "golf-calories-burned-calculator": golfCaloriesBurnedCalculator,
  "disc-golf-rating-calculator": discGolfRatingCalculator,
};
