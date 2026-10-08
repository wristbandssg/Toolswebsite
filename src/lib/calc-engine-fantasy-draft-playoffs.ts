/**
 * Batch: "Sports Calculators" — fantasy sports list, sub-batch B
 * (Fantasy Draft & Roster + Fantasy Playoff & Standings, 9 tools). See
 * calc-engine-fantasy-trade-scoring.ts for the full list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fantasyAuctionValueCalculator: what ONE player is worth in dollars at
 *    an auction draft (value over replacement share of the league's money).
 *  - fantasyFootballDraftGradeCalculator: grades a WHOLE drafted lineup —
 *    projected weekly points vs the league average → win % and expected wins.
 *  - fantasyKeeperCalculator: whether a player is worth keeping at his
 *    keeper cost round vs where he'd be drafted (ADP).
 *  - faabCalculator: how much free-agent budget to bid on a waiver player.
 *  - startSitCalculator: which of TWO players to start this week, from
 *    projection, floor/ceiling and matchup, for a favourite or an underdog.
 *
 *  - fantasyFootballPlayoffOddsCalculator: chance of reaching the playoffs
 *    from the current record and scoring strength (binomial over the games
 *    left vs the wins usually needed).
 *  - fantasyPlayoffScenarioCalculator: you vs ONE rival for a spot — chance
 *    to finish ahead (incl. head-to-head games and tiebreakers) and the wins
 *    you need to control your own fate.
 *  - fantasyFootballMagicNumberCalculator: the classic magic number to
 *    clinch, and the elimination number — pure arithmetic, no probabilities.
 *  - fantasyFootballLuckCalculator: actual wins vs the wins your points
 *    should have earned (and all-play record) — how lucky the season was.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-fantasy-draft-playoffs-calculators.ts for the tool
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

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** P(X = k) for X ~ Binomial(n, p), for k = 0..n. */
function binomialPmf(n: number, p: number): number[] {
  const out = new Array(n + 1).fill(0);
  out[0] = 1;
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k >= 1; k--) out[k] = out[k] * (1 - p) + out[k - 1] * p;
    out[0] *= 1 - p;
  }
  return out;
}

/** Chance of beating an opponent in one week, both scores ~ N(mean, sd). */
const weeklyWinProb = (you: number, them: number, sd: number) => normCdf((you - them) / (Math.max(1, sd) * Math.SQRT2));

// --- 1. Fantasy Auction Value -----------------------------------------------
export const fantasyAuctionValueCalculator: CustomCalculator = (values) => {
  const teams = Math.max(1, whole(values.teams, 12));
  const budget = nonNeg(values.budget, 200);
  const roster = whole(values.rosterSpots, 16);
  const benchShare = Math.min(50, nonNeg(values.benchSharePercent, 10)) / 100;
  const vor = Math.max(0, nonNeg(values.projectedPoints, 250) - nonNeg(values.replacementPoints, 150));
  const leagueVor = Math.max(1, nonNeg(values.leagueTotalVor, 7500));
  // Every roster spot costs at least $1; the rest of the money (less what
  // managers keep back for the bench) chases value over replacement.
  const pool = Math.max(0, teams * budget * (1 - benchShare) - teams * roster);
  const dollarsPerPoint = pool / leagueVor;
  const value = vor > 0 ? 1 + vor * dollarsPerPoint : 1;

  return {
    auctionValue: round2(value),
    valueOverReplacement: round2(vor),
    dollarsPerVorPoint: round2(dollarsPerPoint),
    percentOfBudget: budget > 0 ? round2((value / budget) * 100) : 0,
  };
};

// --- 2. Fantasy Football Draft Grade ----------------------------------------
export const fantasyFootballDraftGradeCalculator: CustomCalculator = (values) => {
  const keys = ["qb", "rb1", "rb2", "wr1", "wr2", "te", "flex", "k", "dst"];
  const weekly = keys.reduce((s, k) => s + nonNeg(values[k]), 0);
  const avg = nonNeg(values.leagueAverage, 115);
  const sd = nonNeg(values.weeklySd, 25);
  const weeks = whole(values.seasonWeeks, 14);
  const winPct = weeklyWinProb(weekly, avg, sd);
  // Draft score 0–100: the projected win % (50 = an average draft).
  const score = winPct * 100;

  return {
    draftScore: round2(score),
    projectedWeeklyPoints: round2(weekly),
    pointsVsLeagueAverage: round2(weekly - avg),
    expectedWins: round2(winPct * weeks),
    expectedLosses: round2((1 - winPct) * weeks),
  };
};

// --- 3. Fantasy Keeper ------------------------------------------------------
/** Relative value of the nth overall pick (exponential draft value curve). */
const pickValue = (overall: number) => 100 * Math.exp(-0.025 * (Math.max(1, overall) - 1));

export const fantasyKeeperCalculator: CustomCalculator = (values) => {
  const teams = Math.max(1, whole(values.teams, 12));
  const adpRound = Math.max(1, nonNeg(values.adpRound, 3));
  const costRound = Math.max(1, nonNeg(values.keeperCostRound, 8));
  const escalation = nonNeg(values.roundEscalation, 1);
  // Middle of each round, as an overall pick number.
  const overall = (round: number) => (round - 1) * teams + (teams + 1) / 2;
  const playerValue = pickValue(overall(adpRound));
  const costValue = pickValue(overall(costRound));

  return {
    keeperSurplusValue: round2(playerValue - costValue),
    roundsOfValue: round2(costRound - adpRound),
    picksOfValue: round2(overall(costRound) - overall(adpRound)),
    nextYearCostRound: round2(Math.max(1, costRound - escalation)),
    playerPickValue: round2(playerValue),
    costPickValue: round2(costValue),
  };
};

// --- 4. FAAB ----------------------------------------------------------------
// Share of the REMAINING budget by player tier.
const FAAB_TIER: Record<number, number> = { 1: 0.5, 2: 0.25, 3: 0.12, 4: 0.05, 5: 0.02 };

export const faabCalculator: CustomCalculator = (values) => {
  const remaining = nonNeg(values.remainingBudget, 80);
  const weeksLeft = Math.max(1, whole(values.weeksLeft, 8));
  const tierShare = FAAB_TIER[whole(values.playerTier, 2)] ?? 0.25;
  const bidders = Math.max(1, whole(values.likelyBidders, 3));
  // More rival bidders push the price up, to a cap of +50%.
  const competition = Math.min(1.5, 1 + 0.1 * (bidders - 1));
  // Late in the season unspent budget is worthless — spend it.
  const urgency = weeksLeft <= 3 ? 1.5 : 1;
  const bid = Math.min(remaining, Math.max(remaining > 0 ? 1 : 0, Math.round(remaining * tierShare * competition * urgency)));

  return {
    recommendedBid: bid,
    bidPercentOfRemaining: remaining > 0 ? round2((bid / remaining) * 100) : 0,
    budgetLeftAfterBid: round2(remaining - bid),
    budgetPerWeekLeft: round2(remaining / weeksLeft),
  };
};

// --- 5. Start/Sit -----------------------------------------------------------
const MATCHUP: Record<number, number> = { 1: 0.9, 2: 1, 3: 1.1 };

export const startSitCalculator: CustomCalculator = (values) => {
  const player = (p: string) => {
    const proj = nonNeg(values[`${p}Projection`], 12) * (MATCHUP[whole(values[`${p}Matchup`], 2)] ?? 1);
    const floor = nonNeg(values[`${p}Floor`], 6);
    const ceiling = Math.max(floor, nonNeg(values[`${p}Ceiling`], 22));
    // Floor and ceiling read as a 90% range → standard deviation.
    const sd = Math.max(0.5, (ceiling - floor) / 3.29);
    return { proj, sd };
  };
  const a = player("a");
  const b = player("b");
  // Team outlook: 1 favourite (protect the floor), 2 even, 3 underdog (chase the ceiling).
  const z = { 1: -0.84, 2: 0, 3: 0.84 }[whole(values.teamOutlook, 2)] ?? 0;
  const aScore = a.proj + z * a.sd;
  const bScore = b.proj + z * b.sd;
  const probA = normCdf((a.proj - b.proj) / Math.sqrt(a.sd ** 2 + b.sd ** 2));

  return {
    startScoreDifference: round2(aScore - bScore),
    chanceAOutscoresB: round2(probA * 100),
    playerAStartScore: round2(aScore),
    playerBStartScore: round2(bScore),
  };
};

// --- 6. Fantasy Football Playoff Odds ---------------------------------------
export const fantasyFootballPlayoffOddsCalculator: CustomCalculator = (values) => {
  const wins = whole(values.wins, 5);
  const left = whole(values.gamesRemaining, 5);
  const p = weeklyWinProb(nonNeg(values.yourPpg, 120), nonNeg(values.leagueAvgPpg, 115), nonNeg(values.weeklySd, 25));
  const needed = whole(values.winsNeeded, 8);
  const pmf = binomialPmf(left, p);
  const atLeast = (target: number) => pmf.reduce((s, q, k) => s + (wins + k >= target ? q : 0), 0);
  const tiebreak = Math.min(100, nonNeg(values.tiebreakChance, 50)) / 100;
  // Reaching the usual cutoff gets you in; one win short leaves you on the
  // bubble, decided by tiebreakers (usually points for) at the tiebreak chance.
  const oneShort = atLeast(needed - 1) - atLeast(needed);
  const odds = atLeast(needed) + oneShort * tiebreak;

  return {
    playoffOdds: round2(odds * 100),
    weeklyWinProbability: round2(p * 100),
    expectedFinalWins: round2(wins + p * left),
    chanceToReachCutoff: round2(atLeast(needed) * 100),
    chanceOneWinShort: round2(oneShort * 100),
  };
};

// --- 7. Fantasy Playoff Scenario (you vs one rival) -------------------------
export const fantasyPlayoffScenarioCalculator: CustomCalculator = (values) => {
  const yourWins = whole(values.yourWins, 6);
  const rivalWins = whole(values.rivalWins, 7);
  const left = whole(values.gamesRemaining, 4);
  const h2h = Math.min(left, whole(values.headToHeadGames, 1));
  const pYou = Math.min(1, nonNeg(values.yourWinChance, 55) / 100);
  const pRival = Math.min(1, nonNeg(values.rivalWinChance, 50) / 100);
  const tiebreak = Math.min(1, nonNeg(values.tiebreakChance, 50) / 100);
  // Head-to-head: one of you wins each game; your chance in it compares the
  // two win rates (Log5).
  const h2hP = pYou + pRival > 0 && pYou + pRival < 2 ? (pYou * (1 - pRival)) / (pYou * (1 - pRival) + pRival * (1 - pYou)) : 0.5;
  const youOther = binomialPmf(left - h2h, pYou);
  const rivalOther = binomialPmf(left - h2h, pRival);
  const h2hYou = binomialPmf(h2h, h2hP);
  let ahead = 0;
  let tie = 0;
  for (let a = 0; a < youOther.length; a++)
    for (let b = 0; b < rivalOther.length; b++)
      for (let h = 0; h < h2hYou.length; h++) {
        const q = youOther[a] * rivalOther[b] * h2hYou[h];
        const diff = yourWins + a + h - (rivalWins + b + (h2h - h));
        if (diff > 0) ahead += q;
        else if (diff === 0) tie += q;
      }
  // Wins you need if the rival wins every game left (that isn't against you).
  const rivalMax = rivalWins + (left - h2h);
  const winsToControl = Math.max(0, rivalMax - yourWins + (tiebreak >= 1 ? 0 : 1));

  return {
    chanceToFinishAhead: round2((ahead + tie * tiebreak) * 100),
    chanceOfTie: round2(tie * 100),
    winsNeededToControlFate: winsToControl,
    canControlOwnFate: winsToControl <= left ? 1 : 0,
    headToHeadWinChance: round2(h2hP * 100),
  };
};

// --- 8. Fantasy Football Magic Number ---------------------------------------
export const fantasyFootballMagicNumberCalculator: CustomCalculator = (values) => {
  const total = whole(values.totalGames, 14);
  const yourWins = whole(values.yourWins, 9);
  const yourLosses = whole(values.yourLosses, 3);
  const chaserLosses = whole(values.chaserLosses, 5);
  const leaderWins = whole(values.leaderWins, 10);
  const holdTiebreak = whole(values.holdTiebreaker, 0) === 1 ? 1 : 0;
  const magic = Math.max(0, total + 1 - holdTiebreak - yourWins - chaserLosses);
  const elimination = Math.max(0, total + 1 - leaderWins - yourLosses);

  return {
    magicNumber: magic,
    eliminationNumber: elimination,
    gamesRemaining: Math.max(0, total - yourWins - yourLosses),
    clinched: magic === 0 ? 1 : 0,
  };
};

// --- 9. Fantasy Football Luck -----------------------------------------------
export const fantasyFootballLuckCalculator: CustomCalculator = (values) => {
  const wins = nonNeg(values.wins, 6);
  const losses = nonNeg(values.losses, 4);
  const games = Math.max(1, wins + losses);
  const ppg = nonNeg(values.pointsFor, 1250) / games;
  const papg = nonNeg(values.pointsAgainst, 1100) / games;
  const avg = nonNeg(values.leagueAvgPpg, 118);
  const sd = nonNeg(values.weeklySd, 25);
  const expectedWins = weeklyWinProb(ppg, avg, sd) * games;
  const allPlayW = nonNeg(values.allPlayWins);
  const allPlayL = nonNeg(values.allPlayLosses);
  const allPlayExpected = allPlayW + allPlayL > 0 ? (allPlayW / (allPlayW + allPlayL)) * games : expectedWins;

  return {
    luckWins: round2(wins - allPlayExpected),
    expectedWins: round2(allPlayExpected),
    pointsBasedExpectedWins: round2(expectedWins),
    pointsAgainstVsAverage: round2(papg - avg),
    actualWinPercent: round2((wins / games) * 100),
  };
};

export const fantasyDraftPlayoffsCustomCalculators: Record<string, CustomCalculator> = {
  "fantasy-auction-value-calculator": fantasyAuctionValueCalculator,
  "fantasy-football-draft-grade-calculator": fantasyFootballDraftGradeCalculator,
  "fantasy-keeper-calculator": fantasyKeeperCalculator,
  "faab-calculator": faabCalculator,
  "start-sit-calculator": startSitCalculator,
  "fantasy-football-playoff-odds-calculator": fantasyFootballPlayoffOddsCalculator,
  "fantasy-playoff-scenario-calculator": fantasyPlayoffScenarioCalculator,
  "fantasy-football-magic-number-calculator": fantasyFootballMagicNumberCalculator,
  "fantasy-football-luck-calculator": fantasyFootballLuckCalculator,
};
