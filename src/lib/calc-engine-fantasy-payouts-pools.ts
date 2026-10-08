/**
 * Batch: "Sports Calculators" — fantasy sports list, sub-batch C
 * (Fantasy Payouts + Bracket & Survivor Pools, 5 tools). See
 * calc-engine-fantasy-trade-scoring.ts for the full list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - prizepicksPayoutCalculator: PrizePicks Power Play (all picks must
 *    hit) or Flex Play (partial payouts) — payout, expected value and the
 *    break-even hit rate per pick.
 *  - underdogFantasyPayoutCalculator: Underdog Pick'em Standard or
 *    Insured entries, with Underdog's per-pick multipliers (boosts and
 *    discounts) folded in.
 *  - fantasyFootballPayoutCalculator: a season-long LEAGUE prize pool —
 *    buy-ins split between places and weekly high-score prizes.
 *
 *  - bracketOddsCalculator: chance of a perfect bracket from games and
 *    pick accuracy, over one or many brackets.
 *  - survivorPoolCalculator: chance of outlasting a survivor (last man
 *    standing) pool and the expected share of the pot.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-fantasy-payouts-pools-calculators.ts for the tool
 * content/copy this math is wired to.
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
const prob = (v: number, d: number) => Math.min(1, nonNeg(v, d) / 100);

/** P(exactly k of n independent picks hit) for k = 0..n. */
function hitsPmf(n: number, p: number): number[] {
  const out = new Array(n + 1).fill(0);
  out[0] = 1;
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k >= 1; k--) out[k] = out[k] * (1 - p) + out[k - 1] * p;
    out[0] *= 1 - p;
  }
  return out;
}

type PayTable = Record<number, Record<number, number>>; // picks → hits → multiplier

/** Payout, EV and break-even for a pick'em entry. */
function pickem(entry: number, picks: number, p: number, table: Record<number, number>, boost: number) {
  const pmf = hitsPmf(picks, p);
  const multOf = (hits: number) => (table[hits] ?? 0) * (hits === picks ? boost : 1);
  const ev = pmf.reduce((s, q, k) => s + q * multOf(k), 0) * entry;
  // Break-even per-pick hit rate: bisection on EV = entry.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const m = hitsPmf(picks, mid).reduce((s, q, k) => s + q * multOf(k), 0);
    if (m < 1) lo = mid;
    else hi = mid;
  }
  return { maxPayout: entry * multOf(picks), ev, breakEven: hi, pmf };
}

// --- 1. PrizePicks Payout ---------------------------------------------------
// Typical multipliers (they change — the custom multiplier field overrides
// the all-correct payout).
const PP_POWER: PayTable = { 2: { 2: 3 }, 3: { 3: 5 }, 4: { 4: 10 }, 5: { 5: 20 }, 6: { 6: 37.5 } };
const PP_FLEX: PayTable = {
  3: { 3: 2.25, 2: 1.25 },
  4: { 4: 5, 3: 1.5 },
  5: { 5: 10, 4: 2, 3: 0.4 },
  6: { 6: 25, 5: 2, 4: 0.4 },
};

export const prizepicksPayoutCalculator: CustomCalculator = (values) => {
  const entry = nonNeg(values.entryFee, 10);
  const flex = whole(values.playType, 1) === 2;
  const picks = Math.min(6, Math.max(flex ? 3 : 2, whole(values.picks, 3)));
  const table = { ...(flex ? PP_FLEX : PP_POWER)[picks] };
  const custom = nonNeg(values.customMultiplier, 0);
  if (custom > 0) table[picks] = custom;
  const r = pickem(entry, picks, prob(values.pickWinChance, 55), table, 1);

  return {
    maxPayout: round2(r.maxPayout),
    maxProfit: round2(r.maxPayout - entry),
    expectedValue: round2(r.ev),
    expectedProfit: round2(r.ev - entry),
    breakEvenHitRate: round2(r.breakEven * 100),
    chanceAllCorrect: round2(r.pmf[picks] * 100),
  };
};

// --- 2. Underdog Fantasy Payout ---------------------------------------------
const UD_STANDARD: PayTable = { 2: { 2: 3 }, 3: { 3: 6 }, 4: { 4: 10 }, 5: { 5: 20 }, 6: { 6: 35 } };
const UD_INSURED: PayTable = {
  3: { 3: 3, 2: 1 },
  4: { 4: 6, 3: 1.5 },
  5: { 5: 10, 4: 2.5 },
  6: { 6: 25, 5: 2.6, 4: 0.25 },
};

export const underdogFantasyPayoutCalculator: CustomCalculator = (values) => {
  const entry = nonNeg(values.entryFee, 10);
  const insured = whole(values.entryType, 1) === 2;
  const picks = Math.min(6, Math.max(insured ? 3 : 2, whole(values.picks, 3)));
  const table = { ...(insured ? UD_INSURED : UD_STANDARD)[picks] };
  const custom = nonNeg(values.customMultiplier, 0);
  if (custom > 0) table[picks] = custom;
  // Underdog prices some picks above or below 1x; their product scales the
  // all-correct payout.
  const boost = nonNeg(values.pickMultiplierProduct, 1) || 1;
  const r = pickem(entry, picks, prob(values.pickWinChance, 55), table, boost);

  return {
    maxPayout: round2(r.maxPayout),
    maxProfit: round2(r.maxPayout - entry),
    expectedValue: round2(r.ev),
    expectedProfit: round2(r.ev - entry),
    breakEvenHitRate: round2(r.breakEven * 100),
    chanceAllCorrect: round2(r.pmf[picks] * 100),
  };
};

// --- 3. Fantasy Football Payout (league prize pool) -------------------------
const SPLITS: Record<number, number[]> = {
  1: [0.6, 0.3, 0.1, 0],
  2: [0.5, 0.3, 0.2, 0],
  3: [0.5, 0.25, 0.15, 0.1],
  4: [0.7, 0.3, 0, 0],
  5: [1, 0, 0, 0],
};

export const fantasyFootballPayoutCalculator: CustomCalculator = (values) => {
  const teams = whole(values.teams, 12);
  const pot = teams * nonNeg(values.buyIn, 100) - nonNeg(values.leagueFees, 0);
  const weeklyPool = Math.min(Math.max(0, pot), nonNeg(values.weeklyPrize, 0) * whole(values.weeklyPrizeWeeks, 14));
  const pointsChampPool = Math.max(0, pot - weeklyPool) * (Math.min(50, nonNeg(values.pointsChampionPercent, 0)) / 100);
  const placePool = Math.max(0, pot - weeklyPool - pointsChampPool);
  const split = SPLITS[whole(values.payoutStructure, 1)] ?? SPLITS[1];

  return {
    firstPlace: round2(placePool * split[0]),
    secondPlace: round2(placePool * split[1]),
    thirdPlace: round2(placePool * split[2]),
    fourthPlace: round2(placePool * split[3]),
    totalPot: round2(Math.max(0, pot)),
    weeklyPrizePool: round2(weeklyPool),
    pointsChampionPrize: round2(pointsChampPool),
  };
};

// --- 4. Bracket Odds --------------------------------------------------------
export const bracketOddsCalculator: CustomCalculator = (values) => {
  const games = Math.max(1, whole(values.games, 63));
  const p = Math.min(0.999, Math.max(0.01, prob(values.pickAccuracy, 66)));
  const brackets = Math.max(1, whole(values.brackets, 1));
  // log10 of the odds keeps quintillions readable and exact enough.
  const log10Odds = -games * Math.log10(p);
  const oneBracket = Math.pow(p, games);
  // Brackets treated as independent tries (an upper bound — real entries overlap).
  const any = -Math.expm1(brackets * Math.log1p(-oneBracket));

  return {
    oddsOneIn: round2(Math.pow(10, log10Odds)),
    coinFlipOddsOneIn: round2(Math.pow(2, games)),
    chanceAnyPerfect: any * 100,
    expectedCorrectPicks: round2(games * p),
    oddsDigits: round2(log10Odds),
  };
};

// --- 5. Survivor Pool -------------------------------------------------------
export const survivorPoolCalculator: CustomCalculator = (values) => {
  const entries = Math.max(1, whole(values.entriesAlive, 100));
  const weeks = whole(values.weeksRemaining, 10);
  const you = Math.pow(prob(values.yourPickWinChance, 70), weeks);
  const others = Math.pow(prob(values.fieldPickWinChance, 68), weeks);
  const n = entries - 1;
  // If the pot is split among the entries still alive at the end, your
  // expected share when you survive is E[1 / (1 + X)], X ~ Binomial(n, s):
  // (1 - (1 - s)^(n+1)) / ((n + 1) s).
  const share = others > 0 ? (1 - Math.pow(1 - others, n + 1)) / ((n + 1) * others) : 1;
  const pot = nonNeg(values.pot, 1000);

  return {
    survivalChance: round2(you * 100),
    expectedOtherSurvivors: round2(n * others),
    chanceNoOneSurvives: round2(Math.pow(1 - others, n) * (1 - you) * 100),
    expectedWinnings: round2(you * share * pot),
    fairShareOfPot: round2(pot / entries),
  };
};

export const fantasyPayoutsPoolsCustomCalculators: Record<string, CustomCalculator> = {
  "prizepicks-payout-calculator": prizepicksPayoutCalculator,
  "underdog-fantasy-payout-calculator": underdogFantasyPayoutCalculator,
  "fantasy-football-payout-calculator": fantasyFootballPayoutCalculator,
  "bracket-odds-calculator": bracketOddsCalculator,
  "survivor-pool-calculator": survivorPoolCalculator,
};
