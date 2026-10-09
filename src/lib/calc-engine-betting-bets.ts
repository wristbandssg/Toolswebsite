/**
 * Batch: "Sports Calculators" > Sports Betting & Racing Calculators,
 * sub-batch B (Bet Types & Payouts, 10 tools). See
 * calc-engine-betting-odds.ts for the full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - parlayCalculator: one combined bet on 2–8 legs that must all win (also
 *    accumulator, double, treble, same game parlay and bet builder).
 *  - systemBetCalculator: full-cover and round-robin bets — Trixie, Patent,
 *    Yankee, Lucky 15, Canadian, Lucky 31, Heinz, Lucky 63, Super Heinz,
 *    Goliath, round robin — every combination settled from your results.
 *  - teaserCalculator: teaser payout, break-even per leg and EV.
 *  - reverseBetCalculator: if-bet reverse outcomes for two bets.
 *  - eachWayBetCalculator: win + place parts of an each-way single or
 *    double (also place odds).
 *  - martingaleCalculator / fibonacciBettingCalculator: staking systems
 *    after a losing run — stake, total risk, bankroll limit.
 *  - propBetCalculator: over/under prop probability and EV from your
 *    projection (also player props).
 *  - sportsBettingTaxCalculator: US federal and state tax on winnings,
 *    with the 2026 90% loss-deduction limit.
 *  - footballSquaresPayoutCalculator: squares pool payouts and your odds.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-betting-bets-calculators.ts for the copy.
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
/** 1 American, 2 decimal. */
const dec = (format: number, v: number) => (whole(format, 1) === 2 ? (v > 1 ? v : 0) : fromAmerican(v));

/** Standard normal CDF. */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// --- 1. Parlay --------------------------------------------------------------
export const parlayCalculator: CustomCalculator = (values) => {
  const stake = nonNeg(values.stake, 10);
  const defaults = [-110, -110, 150, 0, 0, 0, 0, 0];
  let d = 1;
  let legs = 0;
  for (let i = 1; i <= 8; i++) {
    const raw = safeNumber(values[`leg${i}`], defaults[i - 1]);
    const x = raw === 0 ? 0 : dec(values.oddsFormat, raw);
    if (x > 1) {
      d *= x;
      legs++;
    }
  }
  if (!legs) d = 1;

  return {
    totalPayout: round2(stake * d),
    profit: round2(stake * (d - 1)),
    parlayDecimalOdds: round2(d),
    parlayAmericanOdds: toAmerican(d),
    impliedProbability: d > 1 ? round2(100 / d) : 0,
    legs,
  };
};

// --- 2. System Bet ----------------------------------------------------------
// Bet type → [selections, combination sizes included]
const SYSTEMS: Record<number, [number, number[]]> = {
  1: [3, [2, 3]], // Trixie: 4 bets
  2: [3, [1, 2, 3]], // Patent: 7
  3: [4, [2, 3, 4]], // Yankee: 11
  4: [4, [1, 2, 3, 4]], // Lucky 15: 15
  5: [5, [2, 3, 4, 5]], // Canadian / Super Yankee: 26
  6: [5, [1, 2, 3, 4, 5]], // Lucky 31: 31
  7: [6, [2, 3, 4, 5, 6]], // Heinz: 57
  8: [6, [1, 2, 3, 4, 5, 6]], // Lucky 63: 63
  9: [7, [2, 3, 4, 5, 6, 7]], // Super Heinz: 120
  10: [8, [2, 3, 4, 5, 6, 7, 8]], // Goliath: 247
};

function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push(acc.slice());
    for (let i = start; i < n; i++) pick(i + 1, [...acc, i]);
  };
  pick(0, []);
  return out;
}

export const systemBetCalculator: CustomCalculator = (values) => {
  const type = whole(values.betType, 3);
  let n: number;
  let sizes: number[];
  if (type === 11) {
    // Round robin: every parlay of size k from n selections.
    n = Math.min(8, Math.max(3, whole(values.selections, 4)));
    sizes = [Math.min(n, Math.max(2, whole(values.parlaySize, 2)))];
  } else [n, sizes] = SYSTEMS[type] ?? SYSTEMS[3];
  const unit = nonNeg(values.unitStake, 1);
  const odds = Array.from({ length: n }, (_, i) => Math.max(1, nonNeg(values[`odds${i + 1}`], 2.5)));
  const won = Array.from({ length: n }, (_, i) => whole(values[`won${i + 1}`], i < 3 ? 1 : 0) === 1);
  let bets = 0;
  let returns = 0;
  let maxReturn = 0;
  for (const k of sizes)
    for (const combo of combinations(n, k)) {
      bets++;
      const price = combo.reduce((p, i) => p * odds[i], 1);
      maxReturn += unit * price;
      if (combo.every((i) => won[i])) returns += unit * price;
    }
  const stake = bets * unit;

  return {
    totalReturn: round2(returns),
    numberOfBets: bets,
    totalStake: round2(stake),
    profit: round2(returns - stake),
    maxReturnIfAllWin: round2(maxReturn),
    winnersEntered: won.filter(Boolean).length,
  };
};

// --- 3. Teaser --------------------------------------------------------------
export const teaserCalculator: CustomCalculator = (values) => {
  const legs = Math.min(10, Math.max(2, whole(values.legs, 2)));
  const d = fromAmerican(safeNumber(values.teaserOdds, -120));
  const stake = nonNeg(values.stake, 100);
  const p = Math.min(1, nonNeg(values.legWinProb, 72) / 100);
  const all = Math.pow(p, legs);

  return {
    payout: round2(stake * d),
    profit: round2(stake * (d - 1)),
    breakEvenPerLeg: d > 1 ? round2(Math.pow(1 / d, 1 / legs) * 100) : 0,
    chanceAllLegsWin: round2(all * 100),
    expectedValue: round2(stake * (d * all - 1)),
  };
};

// --- 4. Reverse Bet (if-bet reverse) ----------------------------------------
export const reverseBetCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.stake, 100);
  const pa = s * (fromAmerican(safeNumber(values.oddsA, -110)) - 1);
  const pb = s * (fromAmerican(safeNumber(values.oddsB, 150)) - 1);
  // Two if-bets: A→B and B→A, each risking the stake on its first leg.
  return {
    bothWinProfit: round2(2 * (pa + pb)),
    aWinsBLosesProfit: round2(pa - 2 * s),
    bWinsALosesProfit: round2(pb - 2 * s),
    bothLoseProfit: round2(-2 * s),
    totalRisk: round2(2 * s),
  };
};

// --- 5. Each Way ------------------------------------------------------------
// Place terms (fraction of the win odds).
const TERMS: Record<number, number> = { 1: 1 / 4, 2: 1 / 5, 3: 1 / 3 };

export const eachWayBetCalculator: CustomCalculator = (values) => {
  const unit = nonNeg(values.stakePerPart, 5);
  const terms = TERMS[whole(values.placeTerms, 2)] ?? 0.2;
  const double = whole(values.selections, 1) === 2;
  const sel = [1, 2].slice(0, double ? 2 : 1).map((i) => {
    const o = Math.max(1, nonNeg(values[`odds${i}`], i === 1 ? 6 : 4));
    const result = whole(values[`result${i}`], 1); // 1 won, 2 placed, 3 lost
    return { win: o, place: 1 + (o - 1) * terms, wonWin: result === 1, wonPlace: result <= 2 };
  });
  const winPart = sel.every((x) => x.wonWin) ? unit * sel.reduce((p, x) => p * x.win, 1) : 0;
  const placePart = sel.every((x) => x.wonPlace) ? unit * sel.reduce((p, x) => p * x.place, 1) : 0;
  const stake = unit * 2;

  return {
    totalReturn: round2(winPart + placePart),
    profit: round2(winPart + placePart - stake),
    totalStake: round2(stake),
    winPartReturn: round2(winPart),
    placePartReturn: round2(placePart),
    placeOdds1: round2(sel[0].place),
  };
};

// --- 6. Martingale ----------------------------------------------------------
export const martingaleCalculator: CustomCalculator = (values) => {
  const base = Math.max(0.01, nonNeg(values.baseStake, 10));
  const d = Math.max(1.01, nonNeg(values.decimalOdds, 2));
  const streak = whole(values.losingStreak, 5);
  const bankroll = nonNeg(values.bankroll, 1000);
  const p = Math.min(0.99, nonNeg(values.winProb, 48.6) / 100);
  // Stake that recovers all losses plus one base profit: S_n = (L + base(d−1)) / (d−1).
  let lost = 0;
  let stake = base;
  let maxLosses = 0;
  let spent = 0;
  for (let i = 0; i < 60; i++) {
    stake = (lost + base * (d - 1)) / (d - 1);
    if (spent + stake > bankroll) break;
    spent += stake;
    lost += stake;
    maxLosses++;
  }
  let lostN = 0;
  let stakeN = base;
  for (let i = 0; i < streak; i++) {
    stakeN = (lostN + base * (d - 1)) / (d - 1);
    lostN += stakeN;
  }
  const nextStake = (lostN + base * (d - 1)) / (d - 1);

  return {
    nextStake: round2(nextStake),
    totalLostAfterStreak: round2(lostN),
    lossesBankrollCovers: maxLosses,
    chanceOfStreak: round2(Math.pow(1 - p, streak) * 100),
    chanceToBustInARow: round2(Math.pow(1 - p, maxLosses) * 100),
  };
};

// --- 7. Fibonacci -----------------------------------------------------------
export const fibonacciBettingCalculator: CustomCalculator = (values) => {
  const unit = Math.max(0.01, nonNeg(values.unit, 10));
  const losses = whole(values.lossesInARow, 5);
  const bankroll = nonNeg(values.bankroll, 1000);
  const fib = [1, 1];
  while (fib.length < 60) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  const lostSoFar = fib.slice(0, losses).reduce((s, x) => s + x, 0) * unit;
  let covered = 0;
  let spent = 0;
  for (const f of fib) {
    if (spent + f * unit > bankroll) break;
    spent += f * unit;
    covered++;
  }

  return {
    nextStake: round2(fib[Math.min(59, losses)] * unit),
    totalLostSoFar: round2(lostSoFar),
    // After a win you step back two places in the sequence.
    stakeAfterNextWin: round2(fib[Math.max(0, losses - 2)] * unit),
    lossesBankrollCovers: covered,
  };
};

// --- 8. Prop Bet ------------------------------------------------------------
export const propBetCalculator: CustomCalculator = (values) => {
  const line = safeNumber(values.line, 24.5);
  const proj = safeNumber(values.projection, 26.5);
  const sd = Math.max(0.1, nonNeg(values.standardDeviation, 6));
  const dOver = fromAmerican(safeNumber(values.overOdds, -115));
  const dUnder = fromAmerican(safeNumber(values.underOdds, -105));
  // Whole-number lines can push; use a ±0.5 continuity band.
  const isWhole = Math.abs(line - Math.round(line)) < 1e-9;
  const pOver = 1 - normCdf((line + (isWhole ? 0.5 : 0) - proj) / sd);
  const pUnder = normCdf((line - (isWhole ? 0.5 : 0) - proj) / sd);
  const pPush = Math.max(0, 1 - pOver - pUnder);
  const ev = (d: number, p: number) => (d > 1 ? (d - 1) * p - (1 - p - pPush) : 0);

  return {
    overProbability: round2(pOver * 100),
    underProbability: round2(pUnder * 100),
    pushProbability: round2(pPush * 100),
    overEvPercent: round2(ev(dOver, pOver) * 100),
    underEvPercent: round2(ev(dUnder, pUnder) * 100),
    fairOverOdds: pOver > 0 ? toAmerican(1 / pOver) : 0,
  };
};

// --- 9. Sports Betting Tax (US) ---------------------------------------------
export const sportsBettingTaxCalculator: CustomCalculator = (values) => {
  const winnings = nonNeg(values.winnings, 10000);
  const losses = nonNeg(values.losses, 4000);
  const itemize = whole(values.itemize, 1) === 1;
  // From tax year 2026, deductible gambling losses are capped at 90% of losses
  // and can't exceed winnings.
  const lossLimit = Math.min(100, nonNeg(values.lossDeductionPercent, 90)) / 100;
  const deductible = itemize ? Math.min(winnings, losses * lossLimit) : 0;
  const taxable = winnings - deductible;
  const fed = (taxable * Math.min(50, nonNeg(values.federalRate, 22))) / 100;
  const state = (taxable * Math.min(20, nonNeg(values.stateRate, 5))) / 100;
  // 24% federal withholding on a single win of $5,000+ that's 300× the wager or more.
  const big = nonNeg(values.largestWin, 6000);
  const wager = nonNeg(values.largestWinWager, 10);
  const withheld = big >= 5000 && wager > 0 && big >= wager * 300 ? big * 0.24 : 0;

  return {
    totalTax: round2(fed + state),
    taxableWinnings: round2(taxable),
    federalTax: round2(fed),
    stateTax: round2(state),
    deductibleLosses: round2(deductible),
    federalWithholding: round2(withheld),
    netAfterTax: round2(winnings - losses - fed - state),
  };
};

// --- 10. Football Squares ---------------------------------------------------
const SPLITS: Record<number, number[]> = { 1: [0.25, 0.25, 0.25, 0.25], 2: [0.2, 0.2, 0.2, 0.4], 3: [0.125, 0.25, 0.125, 0.5], 4: [0, 0.5, 0, 0.5], 5: [0, 0, 0, 1] };

export const footballSquaresPayoutCalculator: CustomCalculator = (values) => {
  const price = nonNeg(values.pricePerSquare, 10);
  const pot = price * 100 * (1 - Math.min(50, nonNeg(values.housePercent, 0)) / 100);
  const s = SPLITS[whole(values.payoutStructure, 1)] ?? SPLITS[1];
  const mine = Math.min(100, whole(values.mySquares, 5));
  const q = mine / 100;
  const paidPeriods = s.filter((x) => x > 0).length;

  return {
    q1Payout: round2(pot * s[0]),
    halftimePayout: round2(pot * s[1]),
    q3Payout: round2(pot * s[2]),
    finalPayout: round2(pot * s[3]),
    totalPot: round2(pot),
    yourCost: round2(mine * price),
    chanceToWinAtLeastOne: round2((1 - Math.pow(1 - q, paidPeriods)) * 100),
    yourExpectedWinnings: round2(pot * q),
  };
};

export const bettingBetsCustomCalculators: Record<string, CustomCalculator> = {
  "parlay-calculator": parlayCalculator,
  "system-bet-calculator": systemBetCalculator,
  "teaser-calculator": teaserCalculator,
  "reverse-bet-calculator": reverseBetCalculator,
  "each-way-bet-calculator": eachWayBetCalculator,
  "martingale-calculator": martingaleCalculator,
  "fibonacci-betting-calculator": fibonacciBettingCalculator,
  "prop-bet-calculator": propBetCalculator,
  "sports-betting-tax-calculator": sportsBettingTaxCalculator,
  "football-squares-payout-calculator": footballSquaresPayoutCalculator,
};
