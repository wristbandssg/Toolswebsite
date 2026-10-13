/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-track-field (track & field, 9 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Merged: 800m pace -> 400m pace (lap splits for any track race).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - fourHundredMPaceCalculator: lap / 200 / 100 m splits for a goal time;
 *    hundredMTimeCalculator: predicted 100 m from 40 yd / 60 m / hand time;
 *    windCalculator100m: wind- and altitude-adjusted sprint time.
 *  - heptathlonCalculator vs decCalculator: women's 7-event vs men's
 *    10-event World Athletics combined-events scoring.
 *  - longJumpCalculator vs throwDistanceCalculator: jump distance from run-
 *    up / take-off vs projectile distance for any throw.
 *  - poleCalculator: pole vault pole length and weight rating.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-track-field-calculators.ts for the copy.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const G = 9.81;

// --- 1. 400 m pace (lap splits) ------------------------------------------------------
const RACE_M: Record<number, number> = { 1: 400, 2: 800, 3: 1500, 4: 1609.344, 5: 3000, 6: 5000, 7: 10000 };

export const fourHundredMPaceCalculator: CustomCalculator = (values) => {
  const metres = RACE_M[whole(values.race, 2)] ?? 800;
  const sec = nonNeg(values.minutes, 2) * 60 + nonNeg(values.seconds, 0);
  const perM = div(sec, metres);

  return { lap400Sec: round2(perM * 400), split200Sec: round2(perM * 200), split100Sec: round2(perM * 100), pacePerKmMin: round2((perM * 1000) / 60), pacePerMileMin: round2((perM * 1609.344) / 60), laps: round2(metres / 400) };
};

// --- 2. 100 m time ----------------------------------------------------------------------------
export const hundredMTimeCalculator: CustomCalculator = (values) => {
  const method = whole(values.method, 1);
  const t = nonNeg(values.time, 4.8);
  let fat: number;
  if (method === 1) fat = 2.3 * t + 0.5; // 40-yard dash
  else if (method === 2) fat = 1.6 * t - 0.2; // 60 m
  else if (method === 3) fat = t + 0.24; // hand-timed 100 m
  else fat = t * 1.0936; // 100 yd -> 100 m (distance ratio)

  return { time100m: round2(fat), averageSpeedMs: round2(div(100, fat)), averageSpeedMph: round2(div(100, fat) * 2.236936), estimatedTopSpeedMph: round2(div(100, fat) * 2.236936 * 1.18) };
};

// --- 3. 100 m wind (and altitude) adjustment -----------------------------------------------------
export const windCalculator100m: CustomCalculator = (values) => {
  const t = Math.max(5, nonNeg(values.time, 10.5));
  const w = clamp(num(values.wind, 2), -10, 10);
  const h = nonNeg(values.altitude, 0);
  // Mureika (2001): t0 = tw × [1.03 − 0.03 × exp(−0.000125 h) × (1 − w tw / 100)²]
  const t0 = t * (1.03 - 0.03 * Math.exp(-0.000125 * h) * Math.pow(1 - (w * t) / 100, 2));
  const seaLevel = t * (1.03 - 0.03 * Math.pow(1 - (w * t) / 100, 2));

  return { zeroWindTime: round2(t0), windEffectSec: round2(t0 - t), windOnlyAdjusted: round2(seaLevel), windLegal: w <= 2.0 ? 1 : 0 };
};

// --- Combined events (World Athletics scoring tables) ------------------------------------------------
type Ev = [number, number, number, boolean]; // A, B, C, isTrack
function points([a, b, c, track]: Ev, perf: number): number {
  if (perf <= 0) return 0;
  const x = track ? b - perf : perf - b;
  return x > 0 ? Math.floor(a * Math.pow(x, c)) : 0;
}

// --- 4. Heptathlon (women) ---------------------------------------------------------------------------------
const HEP: Record<string, Ev> = {
  hurdles100: [9.23076, 26.7, 1.835, true], highJump: [1.84523, 75, 1.348, false], shotPut: [56.0211, 1.5, 1.05, false], run200: [4.99087, 42.5, 1.81, true],
  longJump: [0.188807, 210, 1.41, false], javelin: [15.9803, 3.8, 1.04, false], run800: [0.11193, 254, 1.88, true],
};

export const heptathlonCalculator: CustomCalculator = (values) => {
  const p = {
    hurdles100: points(HEP.hurdles100, nonNeg(values.hurdles100, 13.8)),
    highJump: points(HEP.highJump, nonNeg(values.highJump, 1.75) * 100),
    shotPut: points(HEP.shotPut, nonNeg(values.shotPut, 13.5)),
    run200: points(HEP.run200, nonNeg(values.run200, 24.5)),
    longJump: points(HEP.longJump, nonNeg(values.longJump, 6.2) * 100),
    javelin: points(HEP.javelin, nonNeg(values.javelin, 45)),
    run800: points(HEP.run800, nonNeg(values.run800Min, 2) * 60 + nonNeg(values.run800Sec, 15)),
  };
  const day1 = p.hurdles100 + p.highJump + p.shotPut + p.run200;
  const day2 = p.longJump + p.javelin + p.run800;

  return { totalPoints: day1 + day2, day1Points: day1, day2Points: day2, ...p };
};

// --- 5. Decathlon (men) ---------------------------------------------------------------------------------------
const DEC: Record<string, Ev> = {
  run100: [25.4347, 18, 1.81, true], longJump: [0.14354, 220, 1.4, false], shotPut: [51.39, 1.5, 1.05, false], highJump: [0.8465, 75, 1.42, false], run400: [1.53775, 82, 1.81, true],
  hurdles110: [5.74352, 28.5, 1.92, true], discus: [12.91, 4, 1.1, false], poleVault: [0.2797, 100, 1.35, false], javelin: [10.14, 7, 1.08, false], run1500: [0.03768, 480, 1.85, true],
};

export const decCalculator: CustomCalculator = (values) => {
  const p = {
    run100: points(DEC.run100, nonNeg(values.run100, 11)),
    longJump: points(DEC.longJump, nonNeg(values.longJump, 7) * 100),
    shotPut: points(DEC.shotPut, nonNeg(values.shotPut, 14)),
    highJump: points(DEC.highJump, nonNeg(values.highJump, 1.95) * 100),
    run400: points(DEC.run400, nonNeg(values.run400, 50)),
    hurdles110: points(DEC.hurdles110, nonNeg(values.hurdles110, 15)),
    discus: points(DEC.discus, nonNeg(values.discus, 42)),
    poleVault: points(DEC.poleVault, nonNeg(values.poleVault, 4.6) * 100),
    javelin: points(DEC.javelin, nonNeg(values.javelin, 58)),
    run1500: points(DEC.run1500, nonNeg(values.run1500Min, 4) * 60 + nonNeg(values.run1500Sec, 40)),
  };
  const day1 = p.run100 + p.longJump + p.shotPut + p.highJump + p.run400;
  const day2 = p.hurdles110 + p.discus + p.poleVault + p.javelin + p.run1500;

  return { totalPoints: day1 + day2, day1Points: day1, day2Points: day2, ...p };
};

// --- 6. Long jump ----------------------------------------------------------------------------------------------
export const longJumpCalculator: CustomCalculator = (values) => {
  const approach = nonNeg(values.approachSpeed, 9) * (whole(values.speedUnit, 1) === 2 ? 0.44704 : 1);
  const v = whole(values.method, 1) === 2 ? nonNeg(values.takeoffSpeed, 9) * (whole(values.speedUnit, 1) === 2 ? 0.44704 : 1) : approach * 0.96;
  const th = (clamp(nonNeg(values.takeoffAngle, 20), 5, 45) * Math.PI) / 180;
  const h = 0.45; // take-off CoM height minus landing CoM height (m)
  const vx = v * Math.cos(th);
  const vy = v * Math.sin(th);
  const flightT = (vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
  const dist = vx * flightT + 0.4; // + take-off and landing distances

  return { jumpMetres: round2(dist), jumpFeet: round2(dist * 3.28084), flightTimeSec: round2(flightT), takeoffSpeedMs: round2(v) };
};

// --- 7. Throw distance (projectile) ---------------------------------------------------------------------------
export const throwDistanceCalculator: CustomCalculator = (values) => {
  const v = nonNeg(values.speed, 25) * (whole(values.speedUnit, 1) === 2 ? 0.44704 : whole(values.speedUnit, 1) === 3 ? 1 / 3.6 : 1);
  const th = (clamp(num(values.angle, 40), 0, 89) * Math.PI) / 180;
  const h = nonNeg(values.releaseHeight, 2);
  const range = (ang: number) => {
    const vx = v * Math.cos(ang);
    const vy = v * Math.sin(ang);
    return { d: (vx * (vy + Math.sqrt(vy * vy + 2 * G * h))) / G, t: (vy + Math.sqrt(vy * vy + 2 * G * h)) / G };
  };
  const r = range(th);
  const opt = v > 0 ? Math.asin(1 / Math.sqrt(2 + (2 * G * h) / (v * v))) : Math.PI / 4;

  return { distanceMetres: round2(r.d), distanceFeet: round2(r.d * 3.28084), flightTimeSec: round2(r.t), optimalAngle: round2((opt * 180) / Math.PI), maxDistanceMetres: round2(range(opt).d) };
};

// --- 9. Relay ----------------------------------------------------------------------------------------------------
export const relayCalculator: CustomCalculator = (values) => {
  const legs = [1, 2, 3, 4].map((i) => nonNeg(values[`leg${i}`], 0));
  const open = legs.reduce((s, x) => s + x, 0);
  const flying = nonNeg(values.flyingStartGain, whole(values.relay, 1) === 1 ? 0.8 : 0.4);
  const relayTime = Math.max(0, open - flying * legs.slice(1).filter((x) => x > 0).length);

  return { estimatedRelayTime: round2(relayTime), sumOfOpenTimes: round2(open), averageLeg: round2(relayTime / Math.max(1, legs.filter((x) => x > 0).length)), timeSaved: round2(open - relayTime) };
};

// --- 8. Pole vault pole -----------------------------------------------------------------------------------------
export const poleCalculator: CustomCalculator = (values) => {
  const lb = nonNeg(values.bodyWeight, 160) * (whole(values.weightUnit, 1) === 2 ? 2.20462 : 1);
  const gripFt = nonNeg(values.gripFeet, 12) + nonNeg(values.gripInches, 0) / 12;
  const level = whole(values.level, 2);
  const lengthFt = Math.ceil((gripFt + 0.5) * 2) / 2; // grip within ~6" of the top
  const rating = Math.ceil((lb + (level === 1 ? 0 : level === 2 ? 5 : 10)) / 5) * 5;
  const clearance = gripFt + (level === 1 ? 1 : level === 2 ? 1.75 : 2.5);

  return { poleLengthFeet: lengthFt, poleWeightRatingLb: rating, estimatedClearanceFeet: round2(clearance), estimatedClearanceMetres: round2(clearance * 0.3048) };
};

export const otherTrackFieldCustomCalculators: Record<string, CustomCalculator> = {
  "400m-pace-calculator": fourHundredMPaceCalculator,
  "100m-time-calculator": hundredMTimeCalculator,
  "wind-calculator-100m": windCalculator100m,
  "heptathlon-calculator": heptathlonCalculator,
  "dec-calculator": decCalculator,
  "long-jump-calculator": longJumpCalculator,
  "throw-distance-calculator": throwDistanceCalculator,
  "pole-calculator": poleCalculator,
  "relay-calculator": relayCalculator,
};
