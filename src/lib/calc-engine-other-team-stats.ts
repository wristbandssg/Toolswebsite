/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-team-stats (cricket, soccer, volleyball, hockey stats, 7 tools).
 * See calc-engine-other-football.ts for the full list of other-* batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - cricketRunRateCalculator: current and required run rate in a chase.
 *  - cricketNetRunRateCalculator: tournament NRR (for minus against).
 *  - dlsScoreCalculator: revised target after overs are lost to rain.
 *  - hockeySavePercentageCalculator vs gaaCalculatorHockey: share of shots
 *    stopped vs goals allowed per 60 minutes.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-team-stats-calculators.ts for the copy.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Cricket overs notation (47.3 = 47 overs + 3 balls) -> decimal overs. */
function overs(v: number): number {
  const o = nonNeg(v, 0);
  const full = Math.floor(o + 1e-9);
  const balls = Math.min(5, Math.round((o - full) * 10));
  return full + balls / 6;
}

// --- 1. Volleyball hitting percentage ------------------------------------------
export const hittingPercentageCalculator: CustomCalculator = (values) => {
  const k = nonNeg(values.kills, 15);
  const e = nonNeg(values.errors, 5);
  const ta = nonNeg(values.attempts, 40);

  return { hittingPct: Math.round(div(k - e, ta) * 1000) / 1000, killPct: round2(div(k, ta) * 100), errorPct: round2(div(e, ta) * 100) };
};

// --- 2. DLS (rain-reduced target) -------------------------------------------------
// Resource % remaining with u overs left and w wickets lost (Duckworth–Lewis form,
// fitted to the Standard Edition table: 25 overs/0 wkts ≈ 68.7%).
const F_W = [100, 93.4, 85.1, 74.9, 62.7, 49, 34.9, 22, 11.9, 4.7, 0];
const B = 0.03144;
function resource(u: number, w: number): number {
  const f = F_W[clamp(whole(w, 0), 0, 10)];
  if (f <= 0 || u <= 0) return 0;
  const b = (B * 100) / f;
  return (f * (1 - Math.exp(-b * u))) / (1 - Math.exp(-b * 50));
}
const G50 = 245;

export const dlsScoreCalculator: CustomCalculator = (values) => {
  const score = nonNeg(values.team1Score, 250);
  const r1 = resource(overs(values.team1Overs || 50), 0);
  const o2 = overs(values.team2Overs || 50);
  const left = overs(values.oversLeftAtStop);
  const lost = Math.min(left, overs(values.oversLost));
  const w = whole(values.wicketsAtStop, 0);
  const r2 = resource(o2, 0) - (lost > 0 ? resource(left, w) - resource(left - lost, w) : 0);
  const par = r2 < r1 ? (score * r2) / r1 : score + (G50 * (r2 - r1)) / 100;

  return { revisedTarget: Math.floor(par) + 1, parScore: round2(par), team1Resources: round2(r1), team2Resources: round2(r2) };
};

// --- 3. Net run rate ---------------------------------------------------------------------
export const cricketNetRunRateCalculator: CustomCalculator = (values) => {
  const quota = overs(values.oversPerInnings || 20);
  const faced = whole(values.allOutBatting, 1) === 2 ? quota : overs(values.oversFaced);
  const bowled = whole(values.allOutBowling, 1) === 2 ? quota : overs(values.oversBowled);
  const forRate = div(nonNeg(values.runsScored, 1450), faced);
  const againstRate = div(nonNeg(values.runsConceded, 1400), bowled);

  return { netRunRate: Math.round((forRate - againstRate) * 1000) / 1000, runRateFor: round2(forRate), runRateAgainst: round2(againstRate) };
};

// --- 4. Run rate (current & required) ---------------------------------------------------------
export const cricketRunRateCalculator: CustomCalculator = (values) => {
  const runs = nonNeg(values.runs, 120);
  const done = overs(values.oversBowled);
  const total = overs(values.totalOvers || 50);
  const remaining = Math.max(0, total - done);
  const target = nonNeg(values.target, 0);
  const needed = target > 0 ? Math.max(0, target - runs) : 0;
  const crr = div(runs, done);

  return {
    currentRunRate: round2(crr),
    requiredRunRate: target > 0 ? round2(div(needed, remaining)) : 0,
    runsNeeded: needed,
    ballsLeft: Math.round(remaining * 6),
    projectedScore: Math.round(runs + crr * remaining),
  };
};

// --- 5. xG (expected goals) -----------------------------------------------------------------------
export const xgCalculator: CustomCalculator = (values) => {
  const x = Math.max(0.5, nonNeg(values.distanceFromGoalLine, 11));
  const y = Math.abs(safeNumber(values.distanceFromCentre, 0));
  const half = 7.32 / 2;
  const angle = Math.atan2(7.32 * x, x * x + y * y - half * half);
  const dist = Math.hypot(x, y);
  const type = whole(values.shotType, 1); // 1 foot, 2 header, 3 penalty
  const logit = -1 + 1.6 * angle - 0.11 * dist + (type === 2 ? -0.9 : 0) + (whole(values.bigChance, 1) === 2 ? 1 : 0);
  const xg = type === 3 ? 0.76 : 1 / (1 + Math.exp(-logit));
  const shots = Math.max(1, whole(values.shots, 1));

  return {
    xgPerShot: Math.round(xg * 1000) / 1000,
    totalXg: round2(xg * shots),
    chanceOfAtLeastOneGoalPct: round2((1 - Math.pow(1 - xg, shots)) * 100),
    shotAngleDegrees: round2((angle * 180) / Math.PI),
    shotDistanceM: round2(dist),
  };
};

// --- 6. Hockey save percentage ------------------------------------------------------------------------
export const hockeySavePercentageCalculator: CustomCalculator = (values) => {
  const shots = nonNeg(values.shotsAgainst, 30);
  const goals = nonNeg(values.goalsAgainst, 3);
  const sv = div(shots - goals, shots);

  return { savePct: Math.round(sv * 1000) / 1000, saves: Math.max(0, shots - goals), goalsSavedVsAverage: round2((sv - nonNeg(values.leagueAverage, 0.9)) * shots) };
};

// --- 7. GAA (goals against average) ------------------------------------------------------------------------
export const gaaCalculatorHockey: CustomCalculator = (values) => {
  const goals = nonNeg(values.goalsAgainst, 30);
  const minutes = nonNeg(values.minutes, 600);
  const length = nonNeg(values.gameLength, 60);

  return { gaa: round2(div(goals * length, minutes)), gamesPlayed: round2(div(minutes, length)), goalsPerPeriod: round2(div(goals * 20, minutes)) };
};

export const otherTeamStatsCustomCalculators: Record<string, CustomCalculator> = {
  "hitting-percentage-calculator": hittingPercentageCalculator,
  "dls-score-calculator": dlsScoreCalculator,
  "cricket-net-run-rate-calculator": cricketNetRunRateCalculator,
  "cricket-run-rate-calculator": cricketRunRateCalculator,
  "xg-calculator": xgCalculator,
  "hockey-save-percentage-calculator": hockeySavePercentageCalculator,
  "gaa-calculator-hockey": gaaCalculatorHockey,
};
