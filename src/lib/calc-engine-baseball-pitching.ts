/**
 * Batch: "Sports Calculators" > Baseball & Softball Calculators, sub-batch
 * B (Pitching, Velocity & Equipment, 11 tools). See
 * calc-engine-baseball-hitting.ts for the full list of 3 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - eraCalculator: earned runs per 9 (or 7/6) innings.
 *  - eraPlusCalculator: ERA relative to league and park (100 = average).
 *  - whipCalculator: walks + hits per inning.
 *  - fipCalculator: fielding independent pitching (HR, BB, HBP, K).
 *  - kPer9Calculator / bbPer9Calculator: strikeouts / walks per 9 innings.
 *  - strikePercentageCalculator: strikes ÷ pitches.
 *  - pitchSpeedCalculator: speed from distance and flight time.
 *  - pitchSpeedEquivalentCalculator: same reaction time at another distance.
 *  - exitVelocityCalculator: batted-ball flight (home run distance) from
 *    exit velocity and launch angle.
 *  - batSizeCalculator: bat length and weight (drop) for a player (also the
 *    bat weight calculator).
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-baseball-pitching-calculators.ts for the copy.
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
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const MPH_FPS = 1.4666667; // ft/s per mph

// 2024 MLB: league ERA and FIP constant (FanGraphs).
const LG_ERA = 4.08;
const FIP_CONSTANT = 3.166;

/** Innings pitched: whole innings plus extra outs (180.1 = 180 + 1 out). */
const innings = (v: Record<string, number>) => nonNeg(v.inningsPitched, 180) + Math.min(2, whole(v.extraOuts, 0)) / 3;

// --- 1. ERA -----------------------------------------------------------------
export const eraCalculator: CustomCalculator = (values) => {
  const ip = innings(values);
  const er = nonNeg(values.earnedRuns, 60);
  const gameInnings = ({ 1: 9, 2: 7, 3: 6 } as Record<number, number>)[whole(values.gameLength, 1)] ?? 9;
  const era = div(er * gameInnings, ip);

  return { era: round2(era), earnedRunsPerInning: r3(div(er, ip)), inningsPitched: round2(ip), vsMlbAverage: round2(era - LG_ERA) };
};

// --- 2. ERA+ ----------------------------------------------------------------
export const eraPlusCalculator: CustomCalculator = (values) => {
  const era = nonNeg(values.era, 3);
  const lg = nonNeg(values.leagueEra, LG_ERA);
  const pf = nonNeg(values.parkFactor, 100) / 100;
  const plus = era > 0 ? (100 * lg * pf) / era : 0;

  return { eraPlus: Math.round(plus), percentBetterThanLeague: Math.round(plus - 100), parkAdjustedLeagueEra: round2(lg * pf) };
};

// --- 3. WHIP ----------------------------------------------------------------
export const whipCalculator: CustomCalculator = (values) => {
  const ip = innings(values);
  const bb = nonNeg(values.walks, 50);
  const h = nonNeg(values.hits, 160);
  const whip = div(bb + h, ip);

  return {
    whip: round2(whip),
    baserunnersAllowed: bb + h,
    baserunnersPer9: round2(whip * 9),
    // 1 excellent (< 1.00), 2 great (< 1.20), 3 average (< 1.35), 4 below average.
    rating: whip < 1 ? 1 : whip < 1.2 ? 2 : whip < 1.35 ? 3 : 4,
  };
};

// --- 4. FIP -----------------------------------------------------------------
export const fipCalculator: CustomCalculator = (values) => {
  const ip = innings(values);
  const hr = nonNeg(values.homeRuns, 20);
  const bb = nonNeg(values.walks, 50);
  const hbp = nonNeg(values.hitByPitch, 5);
  const k = nonNeg(values.strikeouts, 190);
  const c = safeNumber(values.fipConstant, FIP_CONSTANT);
  const core = div(13 * hr + 3 * (bb + hbp) - 2 * k, ip);
  const era = nonNeg(values.era, 3);

  return { fip: round2(core + c), fipWithoutConstant: round2(core), eraMinusFip: round2(era - (core + c)), constantUsed: c };
};

// --- 5. K/9 -----------------------------------------------------------------
export const kPer9Calculator: CustomCalculator = (values) => {
  const ip = innings(values);
  const k = nonNeg(values.strikeouts, 190);
  const bb = nonNeg(values.walks, 50);

  return { strikeoutsPer9: round2(div(k * 9, ip)), strikeoutsPerInning: r3(div(k, ip)), strikeoutToWalkRatio: round2(div(k, bb)) };
};

// --- 6. BB/9 ----------------------------------------------------------------
export const bbPer9Calculator: CustomCalculator = (values) => {
  const ip = innings(values);
  const bb = nonNeg(values.walks, 50);
  const bb9 = div(bb * 9, ip);

  return { walksPer9: round2(bb9), walksPerInning: r3(div(bb, ip)), rating: bb9 < 2 ? 1 : bb9 < 3 ? 2 : bb9 < 4 ? 3 : 4 };
};

// --- 7. Strike Percentage ---------------------------------------------------
export const strikePercentageCalculator: CustomCalculator = (values) => {
  const strikes = nonNeg(values.strikes, 1900);
  const pitches = nonNeg(values.totalPitches, 3000);
  const fps = nonNeg(values.firstPitchStrikes, 0);
  const bf = nonNeg(values.battersFaced, 0);

  return { strikePercentage: round2(div(strikes, pitches) * 100), balls: Math.max(0, pitches - strikes), firstPitchStrikePercentage: round2(div(fps, bf) * 100), strikesToBallsRatio: round2(div(strikes, pitches - strikes)) };
};

// --- 8. Pitch Speed ---------------------------------------------------------
export const pitchSpeedCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const dist = nonNeg(values.distance, 55) * (metric ? 3.28084 : 1); // ft
  const t = nonNeg(values.timeSeconds, 0.42);
  const fps = div(dist, t);

  return { speedMph: round2(fps / MPH_FPS), speedKmh: round2((fps / MPH_FPS) * 1.609344), feetPerSecond: round2(fps), metresPerSecond: round2(fps * 0.3048) };
};

// --- 9. Pitch Speed Equivalent ----------------------------------------------
export const pitchSpeedEquivalentCalculator: CustomCalculator = (values) => {
  const speed = nonNeg(values.speedMph, 70);
  const from = Math.max(1, nonNeg(values.distanceFt, 46));
  const to = Math.max(1, nonNeg(values.compareDistanceFt, 60.5));
  // Same reaction time: speed scales with distance.
  const eq = (speed * to) / from;

  return { equivalentSpeedMph: round2(eq), reactionTimeSeconds: r3(div(from, speed * MPH_FPS)), equivalentSpeedKmh: round2(eq * 1.609344) };
};

// --- 10. Exit Velocity / Home Run Distance ----------------------------------
/** Simple batted-ball flight with drag and backspin lift. Returns [distance ft, hang time s, apex ft]. */
function flight(evMph: number, laDeg: number, rho: number): [number, number, number] {
  const m = 0.145;
  const area = Math.PI * 0.0366 ** 2;
  const cd = 0.35;
  const cl = 0.19;
  const dt = 0.002;
  let x = 0;
  let y = 0.9; // contact height (m)
  let vx = evMph * 0.44704 * Math.cos((laDeg * Math.PI) / 180);
  let vy = evMph * 0.44704 * Math.sin((laDeg * Math.PI) / 180);
  let t = 0;
  let apex = y;
  while (y > 0 && t < 15) {
    const v = Math.hypot(vx, vy);
    const k = (0.5 * rho * area * v) / m;
    // Drag opposes velocity; lift is perpendicular (backspin).
    const ax = -k * (cd * vx + cl * vy);
    const ay = -9.81 + k * (cl * vx - cd * vy);
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    apex = Math.max(apex, y);
  }
  return [x * 3.28084, t, apex * 3.28084];
}

export const exitVelocityCalculator: CustomCalculator = (values) => {
  const ev = nonNeg(values.exitVelocityMph, 103);
  const la = Math.max(-10, Math.min(80, safeNumber(values.launchAngle, 28)));
  const elev = safeNumber(values.elevationFt, 0);
  const tF = safeNumber(values.temperatureF, 70);
  // Air density from elevation and temperature (sea level 59 °F = 1.225 kg/m³).
  const rho = 1.225 * Math.exp(-(elev * 0.3048) / 8434) * (288.15 / (((tF - 32) * 5) / 9 + 273.15));
  const [dist, hang, apex] = flight(ev, la, rho);
  // Exit velocity needed for a 400 ft drive at this angle and air.
  let lo = 40;
  let hi = 140;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (flight(mid, la, rho)[0] < 400) lo = mid;
    else hi = mid;
  }

  return { distanceFt: Math.round(dist), distanceM: Math.round(dist * 0.3048), hangTimeSeconds: round2(hang), apexFt: Math.round(apex), evFor400Ft: round2(hi), barrel: ev >= 98 && la >= 26 - (ev - 98) && la <= 30 + (ev - 98) * 1.2 ? 1 : 0 };
};

// --- 11. Bat Size (and bat weight) ------------------------------------------
// Height (in) bands → bat length (in).
const BAT_LEN: [number, number][] = [[36, 26], [40, 27], [44, 28], [48, 29], [52, 29], [56, 30], [60, 31], [64, 32], [68, 32], [72, 33], [Infinity, 34]];
// League / bat type → length-to-weight drop.
const DROP: Record<number, number> = { 1: -12, 2: -10, 3: -8, 4: -5, 5: -3, 6: -10, 7: -9 };

export const batSizeCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.heightIn, 60);
  const w = nonNeg(values.weightLb, 100);
  let len = BAT_LEN.find(([max]) => h <= max)?.[1] ?? 34;
  // Light players drop an inch; big players add one.
  if (w < 60) len -= 1;
  else if (w > 180) len += 1;
  len = Math.max(24, Math.min(34, len));
  const drop = DROP[whole(values.league, 3)] ?? -8;

  return { batLengthIn: len, dropUsed: drop, batWeightOz: len + drop, lengthCm: Math.round(len * 2.54) };
};

export const baseballPitchingCustomCalculators: Record<string, CustomCalculator> = {
  "era-calculator": eraCalculator,
  "era-plus-calculator": eraPlusCalculator,
  "whip-calculator": whipCalculator,
  "fip-calculator": fipCalculator,
  "k-9-calculator": kPer9Calculator,
  "bb-9-calculator": bbPer9Calculator,
  "strike-percentage-calculator": strikePercentageCalculator,
  "pitch-speed-calculator": pitchSpeedCalculator,
  "pitch-speed-equivalent-calculator": pitchSpeedEquivalentCalculator,
  "exit-velocity-calculator": exitVelocityCalculator,
  "bat-size-calculator": batSizeCalculator,
};
