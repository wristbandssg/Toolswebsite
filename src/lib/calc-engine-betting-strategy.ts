/**
 * Batch: "Sports Calculators" > Sports Betting & Racing Calculators,
 * sub-batch C (Strategy, Promos & Models, 9 tools). See
 * calc-engine-betting-odds.ts for the full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - arbitrageBettingCalculator: stakes across 2–3 bookmakers that lock in
 *    a profit whatever happens (a "sure bet").
 *  - dutchingCalculator: stakes across up to 5 selections in one market so
 *    each returns the same.
 *  - hedgeBetCalculator: a new bet against an existing one to lock profit
 *    or cut losses.
 *  - cashOutCalculator: whether a bookmaker's cash-out offer is fair.
 *  - matchedBettingCalculator: back/lay stakes on an exchange for
 *    qualifying bets and free bets (also the lay bet calculator).
 *  - freeBetCalculator: value of a free bet (stake not returned / returned).
 *  - riskFreeBetCalculator: EV of a "second chance" bet refunded as a
 *    free bet.
 *  - profitBoostCalculator: boosted odds and profit (also odds boost).
 *  - poissonBettingCalculator: football score probabilities from expected
 *    goals — 1X2, over/under 2.5, BTTS and correct score (also correct
 *    score calculator).
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-betting-strategy-calculators.ts for the copy.
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
/** 1 American, 2 decimal (def = the format assumed when none is sent). */
const dec = (format: number, v: number, def = 1) => (whole(format, def) === 2 ? (v > 1 ? v : 0) : fromAmerican(v));

// --- 1. Arbitrage -----------------------------------------------------------
export const arbitrageBettingCalculator: CustomCalculator = (values) => {
  const total = nonNeg(values.totalStake, 1000);
  const odds = [dec(values.oddsFormat, safeNumber(values.oddsA, 2.1), 2), dec(values.oddsFormat, safeNumber(values.oddsB, 2.05), 2)];
  const c = safeNumber(values.oddsC, 0);
  if (c !== 0) odds.push(dec(values.oddsFormat, c, 2));
  const valid = odds.filter((d) => d > 1);
  const book = valid.reduce((s, d) => s + 1 / d, 0);
  const stakes = odds.map((d) => (d > 1 && book > 0 ? (total * (1 / d)) / book : 0));
  const ret = book > 0 ? total / book : 0;

  return {
    guaranteedProfit: round2(ret - total),
    profitPercent: total > 0 ? round2(((ret - total) / total) * 100) : 0,
    isArbitrage: book > 0 && book < 1 ? 1 : 0,
    stakeA: round2(stakes[0]),
    stakeB: round2(stakes[1]),
    stakeC: round2(stakes[2] ?? 0),
    marketPercent: round2(book * 100),
  };
};

// --- 2. Dutching ------------------------------------------------------------
export const dutchingCalculator: CustomCalculator = (values) => {
  const total = nonNeg(values.totalStake, 100);
  const defaults = [3, 5, 8, 0, 0];
  const odds = defaults.map((d, i) => {
    const v = safeNumber(values[`odds${i + 1}`], d);
    return v === 0 ? 0 : dec(values.oddsFormat, v, 2);
  });
  const book = odds.reduce((s, d) => s + (d > 1 ? 1 / d : 0), 0);
  const ret = book > 0 ? total / book : 0;
  const st = odds.map((d) => (d > 1 ? ret / d : 0));

  return {
    returnIfAnyWins: round2(ret),
    profitIfAnyWins: round2(ret - total),
    stake1: round2(st[0]),
    stake2: round2(st[1]),
    stake3: round2(st[2]),
    stake4: round2(st[3]),
    stake5: round2(st[4]),
    combinedProbability: round2(book * 100),
    combinedDecimalOdds: book > 0 ? round2(1 / book) : 0,
  };
};

// --- 3. Hedge ---------------------------------------------------------------
export const hedgeBetCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.originalStake, 100);
  const d1 = dec(values.oddsFormat, safeNumber(values.originalOdds, 400));
  const d2 = dec(values.oddsFormat, safeNumber(values.hedgeOdds, -150));
  const payout = s * d1;
  // Equal-profit hedge: H × d2 = payout.
  const h = d2 > 0 ? payout / d2 : 0;
  // Break-even hedge: get the original stake back if the hedge wins.
  const hBreak = d2 > 1 ? s / (d2 - 1) : 0;

  return {
    hedgeStake: round2(h),
    guaranteedProfit: round2(payout - s - h),
    breakEvenHedgeStake: round2(hBreak),
    profitIfOriginalWinsAfterBreakEvenHedge: round2(payout - s - hBreak),
    originalPayout: round2(payout),
  };
};

// --- 4. Cash Out ------------------------------------------------------------
export const cashOutCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.stake, 50);
  const d0 = dec(values.oddsFormat, safeNumber(values.originalOdds, 500));
  const payout = s * d0;
  // Current chance: from the live price of your selection, less a typical margin.
  const live = dec(values.oddsFormat, safeNumber(values.currentOdds, 150));
  const margin = Math.min(15, nonNeg(values.marginPercent, 5)) / 100;
  const pLive = live > 0 ? Math.min(1, (1 / live) / (1 + margin)) : 0;
  const fair = payout * pLive;
  const offer = nonNeg(values.cashOutOffer, 100);

  return {
    fairCashOutValue: round2(fair),
    offerAsPercentOfFair: fair > 0 ? round2((offer / fair) * 100) : 0,
    potentialPayout: round2(payout),
    currentWinChance: round2(pLive * 100),
    expectedValueIfYouHold: round2(fair - s),
    cashOutProfit: round2(offer - s),
  };
};

// --- 5. Matched Betting (and lay bets) --------------------------------------
export const matchedBettingCalculator: CustomCalculator = (values) => {
  const b = nonNeg(values.backStake, 20);
  const bo = Math.max(1.01, nonNeg(values.backOdds, 3));
  const lo = Math.max(1.01, nonNeg(values.layOdds, 3.1));
  const c = Math.min(0.2, nonNeg(values.commissionPercent, 2) / 100);
  const type = whole(values.betType, 1); // 1 qualifying, 2 free bet SNR, 3 free bet SR
  const numer = type === 2 ? b * (bo - 1) : b * bo;
  const lay = numer / (lo - c);
  const backCost = type === 1 ? b : 0;
  // A stake-returned free bet pays the whole return as profit.
  const ifBackWins = (type === 3 ? b * bo : b * (bo - 1)) - lay * (lo - 1);
  const ifLayWins = lay * (1 - c) - backCost;

  return {
    layStake: round2(lay),
    liability: round2(lay * (lo - 1)),
    profitIfBackWins: round2(ifBackWins),
    profitIfLayWins: round2(ifLayWins),
    // Share of a free bet's face value kept as cash.
    freeBetRetentionPercent: type !== 1 && b > 0 ? round2((Math.min(ifBackWins, ifLayWins) / b) * 100) : 0,
  };
};

// --- 6. Free Bet ------------------------------------------------------------
export const freeBetCalculator: CustomCalculator = (values) => {
  const fb = nonNeg(values.freeBetAmount, 25);
  const d = dec(values.oddsFormat, safeNumber(values.odds, 300));
  const snr = whole(values.stakeReturned, 1) === 1; // 1 not returned (usual), 2 returned
  const ret = snr ? fb * (d - 1) : fb * d;
  // Expected value at the bookmaker's own implied probability (with ~5% margin removed).
  const p = d > 0 ? Math.min(1, 1 / d / 1.05) : 0;

  return {
    returnIfWins: round2(ret),
    profitIfWins: round2(ret),
    expectedValue: round2(ret * p),
    conversionPercent: fb > 0 ? round2(((ret * p) / fb) * 100) : 0,
  };
};

// --- 7. Risk-Free Bet -------------------------------------------------------
export const riskFreeBetCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.stake, 100);
  const d = dec(values.oddsFormat, safeNumber(values.odds, 200));
  const refund = Math.min(s, nonNeg(values.maxRefund, 100));
  const conv = Math.min(100, nonNeg(values.freeBetConversion, 70)) / 100;
  const p = Math.min(1, nonNeg(values.winProb, 0) / 100) || (d > 0 ? 1 / d / 1.05 : 0);
  const ev = p * s * (d - 1) - (1 - p) * s + (1 - p) * refund * conv;

  return {
    expectedValue: round2(ev),
    profitIfWins: round2(s * (d - 1)),
    netIfLoses: round2(-s + refund * conv),
    refundValue: round2(refund * conv),
    winProbabilityUsed: round2(p * 100),
  };
};

// --- 8. Profit Boost (and odds boost) ---------------------------------------
export const profitBoostCalculator: CustomCalculator = (values) => {
  const s = nonNeg(values.stake, 25);
  const d = dec(values.oddsFormat, safeNumber(values.odds, 150));
  const boost = nonNeg(values.boostPercent, 50) / 100;
  const cap = nonNeg(values.maxExtraWinnings, 0);
  const base = s * (d - 1);
  let extra = base * boost;
  if (cap > 0) extra = Math.min(extra, cap);
  const boostedDec = s > 0 ? 1 + (base + extra) / s : d;
  const fairP = Math.min(1, nonNeg(values.fairProb, 0) / 100) || (d > 0 ? 1 / d / 1.045 : 0);

  return {
    boostedProfit: round2(base + extra),
    extraWinnings: round2(extra),
    boostedDecimalOdds: round2(boostedDec),
    boostedAmericanOdds: toAmerican(boostedDec),
    expectedValue: round2(s * (boostedDec * fairP - 1)),
  };
};

// --- 9. Poisson (and correct score) -----------------------------------------
function poisson(lambda: number, k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / f;
}

export const poissonBettingCalculator: CustomCalculator = (values) => {
  const h = Math.max(0.01, nonNeg(values.homeXg, 1.6));
  const a = Math.max(0.01, nonNeg(values.awayXg, 1.1));
  let home = 0;
  let draw = 0;
  let away = 0;
  let over = 0;
  let btts = 0;
  let best = 0;
  let bestH = 0;
  let bestA = 0;
  for (let i = 0; i <= 10; i++)
    for (let j = 0; j <= 10; j++) {
      const p = poisson(h, i) * poisson(a, j);
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
      if (i + j > 2.5) over += p;
      if (i > 0 && j > 0) btts += p;
      if (p > best) {
        best = p;
        bestH = i;
        bestA = j;
      }
    }
  const sh = Math.min(10, whole(values.scoreHome, 1));
  const sa = Math.min(10, whole(values.scoreAway, 1));
  const ps = poisson(h, sh) * poisson(a, sa);

  return {
    homeWinProbability: round2(home * 100),
    drawProbability: round2(draw * 100),
    awayWinProbability: round2(away * 100),
    over25Probability: round2(over * 100),
    bttsProbability: round2(btts * 100),
    correctScoreProbability: round2(ps * 100),
    correctScoreFairOdds: ps > 0 ? round2(1 / ps) : 0,
    mostLikelyHomeGoals: bestH,
    mostLikelyAwayGoals: bestA,
  };
};

export const bettingStrategyCustomCalculators: Record<string, CustomCalculator> = {
  "arbitrage-betting-calculator": arbitrageBettingCalculator,
  "dutching-calculator": dutchingCalculator,
  "hedge-bet-calculator": hedgeBetCalculator,
  "cash-out-calculator": cashOutCalculator,
  "matched-betting-calculator": matchedBettingCalculator,
  "free-bet-calculator": freeBetCalculator,
  "risk-free-bet-calculator": riskFreeBetCalculator,
  "profit-boost-calculator": profitBoostCalculator,
  "poisson-betting-calculator": poissonBettingCalculator,
};
