/**
 * Batch: "Sports Calculators" > Baseball & Softball Calculators, sub-batch
 * C (Fielding, Value & Standings, 7 tools). See
 * calc-engine-baseball-hitting.ts for the full list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fieldingPercentageCalculator: (PO + A) ÷ chances.
 *  - warCalculator: position-player WAR from run components.
 *  - runDifferentialCalculator: runs scored − allowed, Pythagorean record.
 *  - runExpectancyCalculator: RE24 base-out run expectancy and play value.
 *  - baseballWinProbabilityCalculator: in-game win chance from score,
 *    inning and outs.
 *  - gamesBehindCalculator: standings gap to the leader.
 *  - magicNumberCalculator: wins + opponent losses to clinch.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-baseball-team-calculators.ts for the copy.
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
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

// --- 1. Fielding Percentage -------------------------------------------------
export const fieldingPercentageCalculator: CustomCalculator = (values) => {
  const po = nonNeg(values.putouts, 250);
  const a = nonNeg(values.assists, 350);
  const e = nonNeg(values.errors, 10);
  const chances = po + a + e;

  return { fieldingPercentage: Math.round(div(po + a, chances) * 1000) / 1000, totalChances: chances, errorRate: round2(div(e, chances) * 100) };
};

// --- 2. WAR (position player) -----------------------------------------------
// FanGraphs positional adjustment, runs per 162 games.
const POS_ADJ: Record<number, number> = { 1: 12.5, 2: -12.5, 3: 2.5, 4: 2.5, 5: 7.5, 6: -7.5, 7: 2.5, 8: -7.5, 9: -17.5 };

export const warCalculator: CustomCalculator = (values) => {
  const batting = safeNumber(values.battingRuns, 25);
  const running = safeNumber(values.baserunningRuns, 2);
  const fielding = safeNumber(values.fieldingRuns, 5);
  const games = nonNeg(values.games, 150);
  const pa = nonNeg(values.plateAppearances, 600);
  const rpw = Math.max(1, nonNeg(values.runsPerWin, 9.6));
  const positional = ((POS_ADJ[whole(values.position, 7)] ?? 2.5) * games) / 162;
  // Replacement level: about 20 runs per 600 plate appearances.
  const replacement = (20 * pa) / 600;
  const runs = batting + running + fielding + positional + replacement;

  return { war: round2(runs / rpw), runsAboveReplacement: round2(runs), positionalAdjustment: round2(positional), replacementRuns: round2(replacement) };
};

// --- 3. Run Differential (and Pythagorean record) ---------------------------
export const runDifferentialCalculator: CustomCalculator = (values) => {
  const rs = nonNeg(values.runsScored, 750);
  const ra = nonNeg(values.runsAllowed, 650);
  const g = nonNeg(values.gamesPlayed, 162);
  const wins = nonNeg(values.actualWins, 92);
  const exp = Math.max(0.1, nonNeg(values.exponent, 1.83));
  const pct = rs + ra > 0 ? rs ** exp / (rs ** exp + ra ** exp) : 0;

  return { runDifferential: rs - ra, pythagoreanWinPct: Math.round(pct * 1000) / 1000, expectedWins: round2(pct * g), winsAboveExpected: round2(wins - pct * g), runDifferentialPerGame: round2(div(rs - ra, g)) };
};

// --- 4. Run Expectancy (RE24) -----------------------------------------------
// 2010–2015 MLB run expectancy by base state (rows) and outs (0, 1, 2).
const RE: number[][] = [
  [0.481, 0.254, 0.098], // empty
  [0.859, 0.509, 0.224], // 1st
  [1.1, 0.664, 0.319], // 2nd
  [1.357, 0.95, 0.353], // 3rd
  [1.437, 0.884, 0.429], // 1st & 2nd
  [1.784, 1.13, 0.478], // 1st & 3rd
  [1.964, 1.376, 0.58], // 2nd & 3rd
  [2.292, 1.541, 0.752], // loaded
];
const re = (bases: number, outs: number) => (outs >= 3 ? 0 : (RE[Math.min(7, Math.max(0, bases - 1))] ?? RE[0])[Math.min(2, outs)]);

export const runExpectancyCalculator: CustomCalculator = (values) => {
  const before = re(whole(values.basesBefore, 2), whole(values.outsBefore, 0));
  const after = re(whole(values.basesAfter, 3), whole(values.outsAfter, 1));
  const scored = nonNeg(values.runsScored, 0);

  return { runExpectancyBefore: before, runExpectancyAfter: after, playValueRe24: Math.round((after - before + scored) * 1000) / 1000 };
};

// --- 5. Baseball Win Probability --------------------------------------------
// Runs scored in a half-inning: P(0), P(1) … P(5+), MLB-typical.
const HALF = [0.73, 0.15, 0.07, 0.03, 0.012, 0.008];

/** Distribution of runs over `full` complete half-innings plus a partial one with `outs` already recorded. */
function runsDist(full: number, partialOuts: number | null): number[] {
  let d = [1];
  const add = (p: number[]) => {
    const out = new Array(Math.min(60, d.length + p.length - 1)).fill(0);
    d.forEach((a, i) => p.forEach((b, j) => {
      if (i + j < out.length) out[i + j] += a * b;
    }));
    d = out;
  };
  for (let i = 0; i < full; i++) add(HALF);
  if (partialOuts !== null && partialOuts < 3) {
    const share = (3 - partialOuts) / 3;
    add([1 - (1 - HALF[0]) * share, ...HALF.slice(1).map((p) => p * share)]);
  }
  return d;
}

export const baseballWinProbabilityCalculator: CustomCalculator = (values) => {
  const sched = Math.max(1, whole(values.scheduledInnings, 9));
  const inning = Math.min(sched, Math.max(1, whole(values.inning, 7)));
  const top = whole(values.half, 1) !== 2;
  const outs = Math.min(2, whole(values.outs, 0));
  const lead = nonNeg(values.homeScore, 3) - nonNeg(values.awayScore, 2);
  let home: number;
  if (!top && inning >= sched && lead > 0) home = 1;
  else {
    const awayD = top ? runsDist(sched - inning, outs) : runsDist(sched - inning, null);
    const homeD = top ? runsDist(sched - inning + 1, null) : runsDist(sched - inning, outs);
    let win = 0;
    let tie = 0;
    awayD.forEach((pa, a) => homeD.forEach((ph, h) => {
      const d = lead + h - a;
      if (d > 0) win += pa * ph;
      else if (d === 0) tie += pa * ph;
    }));
    // Extra innings: the home team wins about 52%.
    home = win + tie * 0.52;
  }

  return { homeWinProbability: round2(home * 100), awayWinProbability: round2((1 - home) * 100), scoreDifference: lead };
};

// --- 6. Games Behind --------------------------------------------------------
export const gamesBehindCalculator: CustomCalculator = (values) => {
  const lw = nonNeg(values.leaderWins, 90);
  const ll = nonNeg(values.leaderLosses, 60);
  const tw = nonNeg(values.teamWins, 85);
  const tl = nonNeg(values.teamLosses, 65);

  return { gamesBehind: ((lw - tw) + (tl - ll)) / 2, leaderWinPct: Math.round(div(lw, lw + ll) * 1000) / 1000, teamWinPct: Math.round(div(tw, tw + tl) * 1000) / 1000 };
};

// --- 7. Magic Number --------------------------------------------------------
export const magicNumberCalculator: CustomCalculator = (values) => {
  const g = Math.max(1, whole(values.seasonGames, 162));
  const lw = nonNeg(values.leaderWins, 90);
  const ll = nonNeg(values.leaderLosses, 60);
  const tl = nonNeg(values.chaserLosses, 65);
  const magic = Math.max(0, g + 1 - lw - tl);

  return { magicNumber: magic, leaderGamesRemaining: Math.max(0, g - lw - ll), clinched: magic === 0 ? 1 : 0, chaserMaxWins: Math.max(0, g - tl) };
};

export const baseballTeamCustomCalculators: Record<string, CustomCalculator> = {
  "fielding-percentage-calculator": fieldingPercentageCalculator,
  "war-calculator": warCalculator,
  "run-differential-calculator": runDifferentialCalculator,
  "run-expectancy-calculator": runExpectancyCalculator,
  "baseball-win-probability-calculator": baseballWinProbabilityCalculator,
  "games-behind-calculator": gamesBehindCalculator,
  "magic-number-calculator": magicNumberCalculator,
};
