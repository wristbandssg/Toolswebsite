/**
 * Batch: "Sports Calculators" — fantasy sports list, sub-batch A
 * (Fantasy Trade + Fantasy Points & Scoring, 12 tools). The 26-tool list is
 * built across 3 sub-batches:
 *   calc-engine-fantasy-trade-scoring.ts (12 tools)
 *   calc-engine-fantasy-draft-playoffs.ts (9 tools)
 *   calc-engine-fantasy-payouts-pools.ts (5 tools)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fantasyFootballTradeCalculator: REDRAFT football — rest-of-season
 *    points per game × weeks left, over a waiver replacement (value over
 *    replacement), up to 3 players a side.
 *  - dynastyTradeCalculator: DYNASTY football — multi-year value with a
 *    position-specific aging curve, a discount for later years, and rookie
 *    draft picks.
 *  - fantasyBasketballTradeCalculator: REDRAFT basketball — fantasy points
 *    per game × each player's OWN games remaining (rest days and injuries
 *    matter more in the NBA than weeks left).
 *  - dynastyBasketballTradeCalculator: DYNASTY basketball — NBA aging curve
 *    (peak ~27, decline after 30) over a multi-season horizon.
 *  - fantasyBaseballTradeCalculator: hitters vs pitchers — points per game
 *    or per start, turned into points per week by role (hitter ~6 games,
 *    starter ~1.1 starts, reliever ~3 outings).
 *  - fantasyHockeyTradeCalculator: skaters vs goalies — separate waiver
 *    replacement levels, because a streamable goalie and a streamable
 *    skater score very differently.
 *
 *  - fantasyFootballPointsCalculator: season-long league scoring (Standard /
 *    Half PPR / PPR, 4- or 6-point passing TDs) by passing/rushing/receiving.
 *  - draftkingsPointsCalculator: DraftKings NFL Classic rules — 0.04/pass yd,
 *    full PPR, yardage bonuses — plus points per $1K of salary (DFS value).
 *  - fantasyBasketballPointsCalculator: ESPN or Yahoo default NBA points.
 *  - fantasyBaseballPointsCalculator: HITTER points on ESPN, Yahoo or
 *    DraftKings scoring.
 *  - mlbPitcherFantasyScoreCalculator: PITCHER points on ESPN, Yahoo,
 *    DraftKings or PrizePicks scoring (outs, quality starts, etc.).
 *  - tennisFantasyScoreCalculator: tennis match scoring on PrizePicks or
 *    DraftKings rules.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-fantasy-trade-scoring-calculators.ts for the tool
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
const pick = (v: number, d: number) => Math.round(safeNumber(v, d));

/** Smaller side's value as a % of the larger side's (100 = perfectly even). */
function fairness(a: number, b: number): number {
  const hi = Math.max(a, b);
  return hi > 0 ? round2((Math.min(a, b) / hi) * 100) : 100;
}

// --- 1. Fantasy Football Trade (redraft) ------------------------------------
export const fantasyFootballTradeCalculator: CustomCalculator = (values) => {
  const weeks = nonNeg(values.weeksRemaining, 10);
  const replacement = nonNeg(values.replacementPpg, 8);
  // Value over replacement: a player only adds what he scores above the
  // waiver player who would otherwise fill the spot. Blank slots (0 PPG)
  // add nothing, which also handles 2-for-1 and 3-for-1 deals.
  const vor = (ppg: number) => Math.max(0, nonNeg(ppg) - replacement) * weeks;
  const give = vor(values.give1) + vor(values.give2) + vor(values.give3);
  const get = vor(values.get1) + vor(values.get2) + vor(values.get3);

  return {
    netPointsGained: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    netPointsPerWeek: weeks > 0 ? round2((get - give) / weeks) : 0,
    tradeFairness: fairness(get, give),
  };
};

// --- 2. Dynasty Trade (football) --------------------------------------------
// Position aging curves: production grows until the peak age, holds through
// the end of the prime, then declines by a fixed share each year.
const NFL_CURVE: Record<number, { peak: number; primeEnd: number; growth: number; decline: number }> = {
  1: { peak: 27, primeEnd: 33, growth: 0.05, decline: 0.08 }, // QB
  2: { peak: 24, primeEnd: 26, growth: 0.06, decline: 0.12 }, // RB
  3: { peak: 25, primeEnd: 28, growth: 0.06, decline: 0.09 }, // WR
  4: { peak: 26, primeEnd: 29, growth: 0.08, decline: 0.1 }, // TE
};

function nflAgeFactor(age: number, pos: number): number {
  const c = NFL_CURVE[pos] ?? NFL_CURVE[3];
  if (age < c.peak) return Math.pow(1 + c.growth, -(c.peak - age));
  if (age <= c.primeEnd) return 1;
  return Math.pow(1 - c.decline, age - c.primeEnd);
}

function dynastyNflValue(ppg: number, age: number, pos: number, years: number, discount: number): number {
  if (!(ppg > 0)) return 0;
  const nowFactor = nflAgeFactor(age, pos);
  let total = 0;
  for (let y = 0; y < years; y++) {
    // Today's PPG is scaled along the curve from today's age.
    total += ppg * 17 * (nflAgeFactor(age + y, pos) / nowFactor) * Math.pow(1 - discount, y);
  }
  return total;
}

export const dynastyTradeCalculator: CustomCalculator = (values) => {
  const years = Math.min(10, Math.max(1, pick(values.horizonYears, 4)));
  const discount = Math.min(0.5, nonNeg(values.discountRate, 10) / 100);
  // A 1st-round rookie pick is valued as a 21-year-old WR expected to
  // average 11 PPG at his peak, at a 60% hit rate.
  const pickValue = 0.6 * dynastyNflValue(11 * nflAgeFactor(21, 3), 21, 3, years, discount);
  const side = (prefix: string) =>
    dynastyNflValue(nonNeg(values[`${prefix}1Ppg`]), safeNumber(values[`${prefix}1Age`], 25), pick(values[`${prefix}1Pos`], 3), years, discount) +
    dynastyNflValue(nonNeg(values[`${prefix}2Ppg`]), safeNumber(values[`${prefix}2Age`], 25), pick(values[`${prefix}2Pos`], 3), years, discount) +
    nonNeg(values[`${prefix}Picks`]) * pickValue;
  const give = side("give");
  const get = side("get");

  return {
    netDynastyValue: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    firstRoundPickValue: round2(pickValue),
    tradeFairness: fairness(get, give),
  };
};

// --- 3. Fantasy Basketball Trade (redraft) ----------------------------------
export const fantasyBasketballTradeCalculator: CustomCalculator = (values) => {
  const replacement = nonNeg(values.replacementFppg, 22);
  const vor = (fppg: number, games: number) => Math.max(0, nonNeg(fppg) - replacement) * nonNeg(games);
  const give = vor(values.give1Fppg, values.give1Games) + vor(values.give2Fppg, values.give2Games);
  const get = vor(values.get1Fppg, values.get1Games) + vor(values.get2Fppg, values.get2Games);
  const rawGive = nonNeg(values.give1Fppg) * nonNeg(values.give1Games) + nonNeg(values.give2Fppg) * nonNeg(values.give2Games);
  const rawGet = nonNeg(values.get1Fppg) * nonNeg(values.get1Games) + nonNeg(values.get2Fppg) * nonNeg(values.get2Games);

  return {
    netValueGained: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    rawPointsReceived: round2(rawGet),
    rawPointsGiven: round2(rawGive),
    tradeFairness: fairness(get, give),
  };
};

// --- 4. Dynasty Basketball Trade --------------------------------------------
function nbaAgeFactor(age: number): number {
  if (age < 26) return Math.pow(1.06, -(26 - age));
  if (age <= 30) return 1;
  return Math.pow(0.92, age - 30);
}

function dynastyNbaValue(fppg: number, age: number, games: number, years: number, discount: number): number {
  if (!(fppg > 0)) return 0;
  const now = nbaAgeFactor(age);
  let total = 0;
  for (let y = 0; y < years; y++) total += fppg * games * (nbaAgeFactor(age + y) / now) * Math.pow(1 - discount, y);
  return total;
}

export const dynastyBasketballTradeCalculator: CustomCalculator = (values) => {
  const years = Math.min(10, Math.max(1, pick(values.horizonYears, 4)));
  const discount = Math.min(0.5, nonNeg(values.discountRate, 10) / 100);
  const games = Math.min(82, nonNeg(values.gamesPerSeason, 70));
  const side = (prefix: string) =>
    dynastyNbaValue(nonNeg(values[`${prefix}1Fppg`]), safeNumber(values[`${prefix}1Age`], 25), games, years, discount) +
    dynastyNbaValue(nonNeg(values[`${prefix}2Fppg`]), safeNumber(values[`${prefix}2Age`], 25), games, years, discount);
  const give = side("give");
  const get = side("get");

  return {
    netDynastyValue: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    tradeFairness: fairness(get, give),
  };
};

// --- 5. Fantasy Baseball Trade ----------------------------------------------
// Games (or starts) per week by role: 1 hitter, 2 starting pitcher, 3 reliever.
const MLB_GAMES_PER_WEEK: Record<number, number> = { 1: 6, 2: 1.1, 3: 3 };

export const fantasyBaseballTradeCalculator: CustomCalculator = (values) => {
  const weeks = nonNeg(values.weeksRemaining, 12);
  const replacement = nonNeg(values.replacementPerWeek, 12);
  const perWeek = (pts: number, role: number) => nonNeg(pts) * (MLB_GAMES_PER_WEEK[pick(role, 1)] ?? 6);
  const vor = (pts: number, role: number) => (pts > 0 ? Math.max(0, perWeek(pts, role) - replacement) * weeks : 0);
  const give = vor(values.give1Points, values.give1Role) + vor(values.give2Points, values.give2Role);
  const get = vor(values.get1Points, values.get1Role) + vor(values.get2Points, values.get2Role);

  return {
    netPointsGained: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    netPointsPerWeek: weeks > 0 ? round2((get - give) / weeks) : 0,
    tradeFairness: fairness(get, give),
  };
};

// --- 6. Fantasy Hockey Trade ------------------------------------------------
export const fantasyHockeyTradeCalculator: CustomCalculator = (values) => {
  const skaterRepl = nonNeg(values.skaterReplacement, 1.8);
  const goalieRepl = nonNeg(values.goalieReplacement, 2.5);
  // Position: 1 skater, 2 goalie.
  const vor = (fppg: number, games: number, pos: number) =>
    Math.max(0, nonNeg(fppg) - (pick(pos, 1) === 2 ? goalieRepl : skaterRepl)) * nonNeg(games);
  const give = vor(values.give1Fppg, values.give1Games, values.give1Pos) + vor(values.give2Fppg, values.give2Games, values.give2Pos);
  const get = vor(values.get1Fppg, values.get1Games, values.get1Pos) + vor(values.get2Fppg, values.get2Games, values.get2Pos);

  return {
    netValueGained: round2(get - give),
    valueReceived: round2(get),
    valueGiven: round2(give),
    tradeFairness: fairness(get, give),
  };
};

// --- 7. Fantasy Football Points ---------------------------------------------
export const fantasyFootballPointsCalculator: CustomCalculator = (values) => {
  const ppr = [0, 0.5, 1][pick(values.scoringFormat, 2)] ?? 1;
  const passTd = pick(values.passTdPoints, 4) === 6 ? 6 : 4;
  const passing = nonNeg(values.passYards) * 0.04 + nonNeg(values.passTds) * passTd - nonNeg(values.interceptions) * 2;
  const rushing = nonNeg(values.rushYards) * 0.1 + nonNeg(values.rushTds) * 6;
  const receiving = nonNeg(values.receptions) * ppr + nonNeg(values.recYards) * 0.1 + nonNeg(values.recTds) * 6;
  const other = nonNeg(values.twoPointConversions) * 2 - nonNeg(values.fumblesLost) * 2;

  return {
    totalPoints: round2(passing + rushing + receiving + other),
    passingPoints: round2(passing),
    rushingPoints: round2(rushing),
    receivingPoints: round2(receiving),
    otherPoints: round2(other),
  };
};

// --- 8. DraftKings Points (NFL Classic) -------------------------------------
export const draftkingsPointsCalculator: CustomCalculator = (values) => {
  const passYds = nonNeg(values.passYards);
  const rushYds = nonNeg(values.rushYards);
  const recYds = nonNeg(values.recYards);
  const passing = passYds * 0.04 + nonNeg(values.passTds) * 4 - nonNeg(values.interceptions);
  const rushing = rushYds * 0.1 + nonNeg(values.rushTds) * 6;
  const receiving = nonNeg(values.receptions) + recYds * 0.1 + nonNeg(values.recTds) * 6;
  const bonuses = (passYds >= 300 ? 3 : 0) + (rushYds >= 100 ? 3 : 0) + (recYds >= 100 ? 3 : 0);
  const other = nonNeg(values.returnTds) * 6 + nonNeg(values.twoPointConversions) * 2 - nonNeg(values.fumblesLost);
  const total = passing + rushing + receiving + bonuses + other;
  const salary = nonNeg(values.salary, 0);

  return {
    totalPoints: round2(total),
    pointsPer1kSalary: salary > 0 ? round2(total / (salary / 1000)) : 0,
    passingPoints: round2(passing),
    rushingPoints: round2(rushing),
    receivingPoints: round2(receiving),
    bonusPoints: round2(bonuses),
    otherPoints: round2(other),
  };
};

// --- 9. Fantasy Basketball Points (ESPN / Yahoo) ----------------------------
export const fantasyBasketballPointsCalculator: CustomCalculator = (values) => {
  const platform = pick(values.platform, 1); // 1 ESPN, 2 Yahoo
  const pts = nonNeg(values.points);
  const reb = nonNeg(values.rebounds);
  const ast = nonNeg(values.assists);
  const stl = nonNeg(values.steals);
  const blk = nonNeg(values.blocks);
  const tov = nonNeg(values.turnovers);
  let total: number;
  let shooting = 0;
  if (platform === 2) {
    total = pts + reb * 1.2 + ast * 1.5 + stl * 3 + blk * 3 - tov;
  } else {
    // ESPN default points league: shooting efficiency counts.
    shooting = nonNeg(values.threesMade) + nonNeg(values.fgMade) * 2 - nonNeg(values.fgAttempted) + nonNeg(values.ftMade) - nonNeg(values.ftAttempted);
    total = pts + reb + ast * 2 + stl * 4 + blk * 4 - tov * 2 + shooting;
  }
  const defense = platform === 2 ? stl * 3 + blk * 3 : stl * 4 + blk * 4;

  return {
    totalPoints: round2(total),
    scoringPoints: round2(pts),
    shootingEfficiencyPoints: round2(shooting),
    stocksPoints: round2(defense),
  };
};

// --- 10. Fantasy Baseball Points (hitters) ----------------------------------
export const fantasyBaseballPointsCalculator: CustomCalculator = (values) => {
  const platform = pick(values.platform, 1); // 1 ESPN, 2 Yahoo, 3 DraftKings
  const singles = nonNeg(values.singles);
  const doubles = nonNeg(values.doubles);
  const triples = nonNeg(values.triples);
  const hr = nonNeg(values.homeRuns);
  const r = nonNeg(values.runs);
  const rbi = nonNeg(values.rbi);
  const bb = nonNeg(values.walks);
  const hbp = nonNeg(values.hitByPitch);
  const sb = nonNeg(values.stolenBases);
  const k = nonNeg(values.strikeouts);
  const totalBases = singles + doubles * 2 + triples * 3 + hr * 4;
  let hitting: number;
  let other: number;
  if (platform === 2) {
    hitting = singles * 2.6 + doubles * 5.2 + triples * 7.8 + hr * 10.4;
    other = r * 1.9 + rbi * 1.9 + bb * 2.6 + hbp * 2.6 + sb * 4.2;
  } else if (platform === 3) {
    hitting = singles * 3 + doubles * 5 + triples * 8 + hr * 10;
    other = r * 2 + rbi * 2 + bb * 2 + hbp * 2 + sb * 5;
  } else {
    hitting = totalBases;
    other = r + rbi + bb + sb - k;
  }

  return {
    totalPoints: round2(hitting + other),
    hittingPoints: round2(hitting),
    otherPoints: round2(other),
    totalBases: round2(totalBases),
  };
};

// --- 11. MLB Pitcher Fantasy Score ------------------------------------------
export const mlbPitcherFantasyScoreCalculator: CustomCalculator = (values) => {
  const platform = pick(values.platform, 4); // 1 ESPN, 2 Yahoo, 3 DraftKings, 4 PrizePicks
  const outs = Math.round(nonNeg(values.inningsFull) * 3 + Math.min(2, nonNeg(values.extraOuts)));
  const ip = outs / 3;
  const k = nonNeg(values.strikeouts);
  const w = nonNeg(values.win);
  const l = nonNeg(values.loss);
  const sv = nonNeg(values.save);
  const er = nonNeg(values.earnedRuns);
  const h = nonNeg(values.hitsAllowed);
  const bb = nonNeg(values.walks);
  const hbp = nonNeg(values.hitBatters);
  // Quality start: 6+ innings and 3 or fewer earned runs.
  const qs = ip >= 6 && er <= 3 ? 1 : 0;
  let total: number;
  if (platform === 1) total = ip * 3 + k - h - er * 2 - bb + w * 2 - l * 2 + sv * 5;
  else if (platform === 2) total = ip * 7.4 + k * 3 + w * 4.3 + sv * 5 - er * 3 - h * 1.3 - bb * 1.3 - hbp * 1.3;
  else if (platform === 3) total = ip * 2.25 + k * 2 + w * 4 - er * 2 - h * 0.6 - bb * 0.6 - hbp * 0.6;
  else total = outs + k * 3 + w * 6 + qs * 4 - er * 3;

  return {
    fantasyScore: round2(total),
    outsRecorded: outs,
    qualityStart: qs,
    strikeoutPoints: round2(k * ([1, 3, 2, 3][platform - 1] ?? 3)),
  };
};

// --- 12. Tennis Fantasy Score -----------------------------------------------
export const tennisFantasyScoreCalculator: CustomCalculator = (values) => {
  const platform = pick(values.platform, 1); // 1 PrizePicks, 2 DraftKings
  const gw = nonNeg(values.gamesWon);
  const gl = nonNeg(values.gamesLost);
  const sw = nonNeg(values.setsWon);
  const sl = nonNeg(values.setsLost);
  const aces = nonNeg(values.aces);
  const df = nonNeg(values.doubleFaults);
  let total: number;
  let bonus = 0;
  if (platform === 2) {
    const won = sw > sl ? 1 : 0;
    const bestOf = pick(values.bestOf, 3) === 5 ? 5 : 3;
    const straightSets = won && sl === 0 ? (bestOf === 5 ? 5 : 6) : 0;
    bonus = nonNeg(values.cleanSets) * 4 + straightSets + (df === 0 ? 2.5 : 0) + (aces >= 10 ? 2 : 0);
    total = 30 + gw * 2.5 - gl * 2 + sw * 6 - sl * 3 + won * 6 + aces * 0.4 - df + nonNeg(values.breaks) * 0.75 + bonus;
  } else {
    total = 10 + gw - gl + sw * 3 - sl * 3 + aces * 0.5 - df * 0.5;
  }

  return {
    fantasyScore: round2(total),
    gamesPoints: round2(platform === 2 ? gw * 2.5 - gl * 2 : gw - gl),
    setsPoints: round2(platform === 2 ? sw * 6 - sl * 3 : sw * 3 - sl * 3),
    bonusPoints: round2(bonus),
  };
};

export const fantasyTradeScoringCustomCalculators: Record<string, CustomCalculator> = {
  "fantasy-football-trade-calculator": fantasyFootballTradeCalculator,
  "dynasty-trade-calculator": dynastyTradeCalculator,
  "fantasy-basketball-trade-calculator": fantasyBasketballTradeCalculator,
  "dynasty-basketball-trade-calculator": dynastyBasketballTradeCalculator,
  "fantasy-baseball-trade-calculator": fantasyBaseballTradeCalculator,
  "fantasy-hockey-trade-calculator": fantasyHockeyTradeCalculator,
  "fantasy-football-points-calculator": fantasyFootballPointsCalculator,
  "draftkings-points-calculator": draftkingsPointsCalculator,
  "fantasy-basketball-points-calculator": fantasyBasketballPointsCalculator,
  "fantasy-baseball-points-calculator": fantasyBaseballPointsCalculator,
  "mlb-pitcher-fantasy-score-calculator": mlbPitcherFantasyScoreCalculator,
  "tennis-fantasy-score-calculator": tennisFantasyScoreCalculator,
};
