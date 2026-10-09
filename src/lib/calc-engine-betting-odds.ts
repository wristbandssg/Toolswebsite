/**
 * Batch: "Sports Calculators" > Sports Betting & Racing Calculators,
 * sub-batch A (Odds, Value & Bankroll, 9 tools). The 39-tool betting list is
 * built across 4 sub-batches:
 *   calc-engine-betting-odds.ts (9)
 *   calc-engine-betting-bets.ts (10)
 *   calc-engine-betting-strategy.ts (9)
 *   calc-engine-betting-lines-racing.ts (11)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bettingOddsCalculator: stake + odds (American, decimal or fractional)
 *    → payout and profit (also American/moneyline/decimal/fractional odds,
 *    bet return and MMA odds calculators).
 *  - oddsConverterCalculator: one price in every format — American,
 *    decimal, fractional, Hong Kong, Indonesian, Malay — and implied %.
 *  - impliedProbabilityCalculator: odds → implied probability and the
 *    break-even win rate (also the break even calculator).
 *  - noVigCalculator: removes the bookmaker margin from a 2- or 3-way
 *    market → fair probabilities and fair odds.
 *  - expectedValueCalculator: EV of a single bet or a parlay from your own
 *    win probabilities (also the parlay EV calculator).
 *  - kellyCriterionCalculator: optimal stake size from edge and bankroll.
 *  - bettingUnitBankrollCalculator: unit size and bet limits from bankroll.
 *  - bettingRoiCalculator: ROI, yield and win rate vs break-even on a record.
 *  - closingLineValueCalculator: how your price beat (or missed) the close.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-betting-odds-calculators.ts for the copy.
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

/** American odds → decimal (e.g. −110 → 1.909, +150 → 2.5). */
function fromAmerican(a: number): number {
  if (a >= 100) return 1 + a / 100;
  if (a <= -100) return 1 + 100 / Math.abs(a);
  return 0;
}
/** Decimal → American (rounded to whole numbers). */
function toAmerican(d: number): number {
  if (d <= 1) return 0;
  return d >= 2 ? Math.round((d - 1) * 100) : Math.round(-100 / (d - 1));
}
/** Odds in the chosen format → decimal. 1 American, 2 decimal, 3 fractional (num/den). */
function decimalOf(format: number, value: number, num = 0, den = 1): number {
  const f = whole(format, 1);
  if (f === 2) return value > 1 ? value : 0;
  if (f === 3) return den > 0 ? 1 + num / den : 0;
  return fromAmerican(value);
}
const oddsKey = (values: Record<string, number>, key: string, defAmerican: number) =>
  decimalOf(values.oddsFormat, safeNumber(values[key], defAmerican), nonNeg(values[`${key}Num`], 0), nonNeg(values[`${key}Den`], 1));

// --- 1. Betting Odds (payout) -----------------------------------------------
export const bettingOddsCalculator: CustomCalculator = (values) => {
  const dec = decimalOf(values.oddsFormat, safeNumber(values.odds, -110), nonNeg(values.fracNum, 5), nonNeg(values.fracDen, 2));
  const stake = nonNeg(values.stake, 100);

  return {
    totalPayout: round2(stake * dec),
    profit: round2(stake * (dec - 1)),
    impliedProbability: dec > 0 ? round2(100 / dec) : 0,
    decimalOdds: round2(dec),
    americanOdds: toAmerican(dec),
    fractionalToOne: round2(dec - 1),
  };
};

// --- 2. Odds Converter ------------------------------------------------------
export const oddsConverterCalculator: CustomCalculator = (values) => {
  const dec = decimalOf(values.oddsFormat, safeNumber(values.odds, 150), nonNeg(values.fracNum, 3), nonNeg(values.fracDen, 2));
  const hk = dec - 1;

  return {
    decimalOdds: Math.round(dec * 1000) / 1000,
    americanOdds: toAmerican(dec),
    fractionalToOne: round2(hk),
    impliedProbability: dec > 0 ? round2(100 / dec) : 0,
    hongKongOdds: round2(hk),
    // Indonesian = American ÷ 100; Malay = HK below 1, −1/HK above.
    indonesianOdds: round2(toAmerican(dec) / 100),
    malayOdds: hk <= 0 ? 0 : round2(hk <= 1 ? hk : -1 / hk),
  };
};

// --- 3. Implied Probability -------------------------------------------------
export const impliedProbabilityCalculator: CustomCalculator = (values) => {
  const dec = oddsKey(values, "odds", -110);
  const p = dec > 0 ? 1 / dec : 0;

  return {
    impliedProbability: round2(p * 100),
    breakEvenWinRate: round2(p * 100),
    winsNeededPer100Bets: round2(p * 100),
    decimalOdds: round2(dec),
    profitPer100Staked: round2((dec - 1) * 100),
  };
};

// --- 4. No-Vig (Fair Odds) --------------------------------------------------
export const noVigCalculator: CustomCalculator = (values) => {
  const a = oddsKey(values, "oddsA", -110);
  const b = oddsKey(values, "oddsB", -110);
  const c = safeNumber(values.oddsC, 0) !== 0 ? oddsKey(values, "oddsC", 0) : 0;
  const imps = [a, b, c].map((d) => (d > 0 ? 1 / d : 0));
  const book = imps.reduce((s, x) => s + x, 0);
  const fair = imps.map((x) => (book > 0 ? x / book : 0));

  return {
    vigPercent: round2((book - 1) * 100),
    fairProbabilityA: round2(fair[0] * 100),
    fairProbabilityB: round2(fair[1] * 100),
    fairProbabilityC: round2(fair[2] * 100),
    fairDecimalA: fair[0] > 0 ? round2(1 / fair[0]) : 0,
    fairDecimalB: fair[1] > 0 ? round2(1 / fair[1]) : 0,
    fairAmericanA: fair[0] > 0 ? toAmerican(1 / fair[0]) : 0,
    fairAmericanB: fair[1] > 0 ? toAmerican(1 / fair[1]) : 0,
  };
};

// --- 5. Expected Value (single or parlay) -----------------------------------
export const expectedValueCalculator: CustomCalculator = (values) => {
  const stake = nonNeg(values.stake, 100);
  let dec = 1;
  let p = 1;
  let legs = 0;
  for (let i = 1; i <= 4; i++) {
    const raw = safeNumber(values[`odds${i}`], i === 1 ? 150 : 0);
    if (raw === 0) continue;
    const d = decimalOf(values.oddsFormat, raw);
    if (d <= 1) continue;
    dec *= d;
    p *= Math.min(1, nonNeg(values[`winProb${i}`], i === 1 ? 45 : 50) / 100);
    legs++;
  }
  if (!legs) return { expectedValue: 0, evPercent: 0, winProbability: 0, payoutIfWin: 0, impliedProbability: 0, edge: 0 };
  const ev = stake * (dec * p - 1);

  return {
    expectedValue: round2(ev),
    evPercent: round2((dec * p - 1) * 100),
    winProbability: round2(p * 100),
    payoutIfWin: round2(stake * dec),
    impliedProbability: round2(100 / dec),
    edge: round2((p - 1 / dec) * 100),
  };
};

// --- 6. Kelly Criterion -----------------------------------------------------
export const kellyCriterionCalculator: CustomCalculator = (values) => {
  const dec = oddsKey(values, "odds", 120);
  const p = Math.min(1, nonNeg(values.winProb, 50) / 100);
  const bankroll = nonNeg(values.bankroll, 1000);
  const fraction = ({ 1: 1, 2: 0.5, 3: 0.25 } as Record<number, number>)[whole(values.kellyFraction, 2)] ?? 0.5;
  const b = dec - 1;
  const full = b > 0 ? (b * p - (1 - p)) / b : 0;
  const f = Math.max(0, full) * fraction;

  return {
    recommendedStake: round2(bankroll * f),
    percentOfBankroll: round2(f * 100),
    fullKellyPercent: round2(full * 100),
    edgePercent: round2((p * dec - 1) * 100),
    // Expected log-growth per bet at the chosen stake.
    expectedGrowthPercent: f > 0 ? round2((p * Math.log(1 + b * f) + (1 - p) * Math.log(1 - f)) * 100) : 0,
  };
};

// --- 7. Betting Unit & Bankroll ---------------------------------------------
export const bettingUnitBankrollCalculator: CustomCalculator = (values) => {
  const bankroll = nonNeg(values.bankroll, 1000);
  const unitPct = ({ 1: 1, 2: 2, 3: 3, 4: 5 } as Record<number, number>)[whole(values.riskLevel, 2)] ?? 2;
  const unit = (bankroll * unitPct) / 100;
  const bets = whole(values.betsPerWeek, 10);

  return {
    unitSize: round2(unit),
    unitsInBankroll: Math.round(100 / unitPct),
    maxSingleBet: round2(unit * 3),
    weeklyAmountAtRisk: round2(unit * bets),
    // Losing streak (in units) that halves the bankroll.
    losingStreakToHalve: Math.round(50 / unitPct),
  };
};

// --- 8. Betting ROI ---------------------------------------------------------
export const bettingRoiCalculator: CustomCalculator = (values) => {
  const staked = nonNeg(values.totalStaked, 5000);
  const returned = nonNeg(values.totalReturned, 5300);
  const wins = whole(values.wins, 55);
  const losses = whole(values.losses, 45);
  const dec = fromAmerican(safeNumber(values.averageOdds, -110));
  const profit = returned - staked;
  const n = wins + losses;

  return {
    roiPercent: staked > 0 ? round2((profit / staked) * 100) : 0,
    profit: round2(profit),
    winRate: n > 0 ? round2((wins / n) * 100) : 0,
    breakEvenWinRate: dec > 0 ? round2(100 / dec) : 0,
    averageStake: n > 0 ? round2(staked / n) : 0,
  };
};

// --- 9. Closing Line Value --------------------------------------------------
export const closingLineValueCalculator: CustomCalculator = (values) => {
  const taken = oddsKey(values, "oddsTaken", -105);
  const close = oddsKey(values, "closingOdds", -120);
  const otherRaw = safeNumber(values.closingOtherSide, 0);
  const other = otherRaw !== 0 ? oddsKey(values, "closingOtherSide", 0) : 0;
  // Fair closing probability: de-vig with the other side when given.
  const pClose = close > 0 ? 1 / close : 0;
  const fair = other > 0 ? pClose / (pClose + 1 / other) : pClose;

  return {
    clvPercent: close > 0 ? round2((taken / close - 1) * 100) : 0,
    impliedAtBet: taken > 0 ? round2(100 / taken) : 0,
    impliedAtClose: round2(pClose * 100),
    // EV if the (fair) closing line is the true probability.
    estimatedEvPercent: round2((taken * fair - 1) * 100),
  };
};

export const bettingOddsCustomCalculators: Record<string, CustomCalculator> = {
  "betting-odds-calculator": bettingOddsCalculator,
  "odds-converter-calculator": oddsConverterCalculator,
  "implied-probability-calculator": impliedProbabilityCalculator,
  "no-vig-calculator": noVigCalculator,
  "expected-value-calculator": expectedValueCalculator,
  "kelly-criterion-calculator": kellyCriterionCalculator,
  "betting-unit-bankroll-calculator": bettingUnitBankrollCalculator,
  "betting-roi-calculator": bettingRoiCalculator,
  "closing-line-value-calculator": closingLineValueCalculator,
};
