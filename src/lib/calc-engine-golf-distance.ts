/**
 * Batch: "Sports Calculators" > Golf Calculators, sub-batch D (Swing,
 * Distance & Conditions, 10 tools). See calc-engine-golf-handicap.ts for the
 * full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - golfClubDistanceCalculator: carry for every club from driver speed or
 *    driver carry.
 *  - golfClubGappingCalculator: wedge lofts evenly spaced below the PW, with
 *    the yardage gaps they give.
 *  - golfSwingSpeedCalculator: club speed from driver carry or from ball
 *    speed and smash factor (also the ball speed to swing speed calculator).
 *  - golfBallSpeedToDistanceCalculator: carry and total from ball speed by
 *    club and launch quality.
 *  - smashFactorCalculator: ball speed / club speed vs the optimum, and the
 *    yards it costs.
 *  - golfTrajectoryCalculator: full ball-flight simulation (drag + lift)
 *    from launch monitor numbers: carry, apex, hang time, landing angle.
 *  - golfElevationAltitudeCalculator: plays-like distance for altitude and
 *    uphill / downhill shots.
 *  - golfWindCalculator: plays-like distance and aim for any wind direction.
 *  - ruleOf12GolfCalculator: chipping club from the carry : roll ratio.
 *  - golfCartSpeedCalculator: cart speed from motor rpm, gear and tires.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-golf-distance-calculators.ts for the copy.
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
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Driver carry (yd) per mph of club speed for an average strike. */
const CARRY_PER_MPH = 2.3;

// --- 1. Golf Club Distance -------------------------------------------------------
// Carry as a share of driver carry (Trackman amateur / Tour averages).
const CLUB_RATIO: [string, number][] = [
  ["driverCarry", 1], ["threeWoodCarry", 0.9], ["fiveWoodCarry", 0.85], ["hybridCarry", 0.8], ["fourIronCarry", 0.77],
  ["fiveIronCarry", 0.73], ["sixIronCarry", 0.69], ["sevenIronCarry", 0.65], ["eightIronCarry", 0.61], ["nineIronCarry", 0.57],
  ["pitchingWedgeCarry", 0.52], ["gapWedgeCarry", 0.47], ["sandWedgeCarry", 0.41], ["lobWedgeCarry", 0.35],
];

export const golfClubDistanceCalculator: CustomCalculator = (values) => {
  const driver = whole(values.method, 1) === 2 ? nonNeg(values.driverCarry, 220) : nonNeg(values.swingSpeed, 93) * CARRY_PER_MPH;
  const metres = whole(values.outputUnit, 1) === 2;
  const out: Record<string, number> = {};
  for (const [key, r] of CLUB_RATIO) out[key] = Math.round(driver * r * (metres ? 0.9144 : 1));
  return out;
};

// --- 2. Golf Club Gapping (wedges) -------------------------------------------------------
export const golfClubGappingCalculator: CustomCalculator = (values) => {
  const pwLoft = nonNeg(values.pwLoft, 45);
  const pwCarry = nonNeg(values.pwCarry, 120);
  const top = Math.max(pwLoft + 2, nonNeg(values.highestLoft, 58));
  const n = clamp(whole(values.wedges, 3), 1, 4);
  const gap = (top - pwLoft) / n;
  const ydPerDeg = pwCarry * 0.022;
  const out: Record<string, number> = { loftGap: round2(gap), yardsPerWedgeGap: round2(gap * ydPerDeg) };
  for (let i = 1; i <= 4; i++) {
    const loft = i <= n ? Math.round(pwLoft + gap * i) : 0;
    out[`wedge${i}Loft`] = loft;
    out[`wedge${i}Carry`] = i <= n ? Math.round(pwCarry - (loft - pwLoft) * ydPerDeg) : 0;
  }
  return out;
};

// --- 3. Golf Swing Speed (incl. ball speed -> swing speed) -------------------------------------
// Typical smash factor by club.
const TYPICAL_SMASH: Record<number, number> = { 1: 1.45, 2: 1.42, 3: 1.38, 4: 1.33, 5: 1.23 };
const BALL_TO_CARRY: Record<number, number> = { 1: 1.62, 2: 1.57, 3: 1.52, 4: 1.43, 5: 1.33 };
const AMATEUR_AVG_MPH = 93.4;
const TOUR_AVG_MPH = 115;

export const golfSwingSpeedCalculator: CustomCalculator = (values) => {
  const club = whole(values.club, 1);
  const smash = nonNeg(values.smashFactor, 0) > 0 ? nonNeg(values.smashFactor, 0) : TYPICAL_SMASH[club] ?? 1.45;
  let speed: number;
  let ball: number;
  if (whole(values.method, 1) === 2) {
    ball = nonNeg(values.ballSpeed, 135);
    speed = div(ball, smash);
  } else {
    speed = nonNeg(values.driverCarry, 215) / CARRY_PER_MPH;
    ball = speed * (TYPICAL_SMASH[1]);
  }
  const isDriver = whole(values.method, 1) !== 2 || club === 1;

  return {
    swingSpeedMph: round2(speed),
    swingSpeedKmh: round2(speed * 1.609344),
    swingSpeedMs: round2(speed * 0.44704),
    ballSpeedMph: round2(ball),
    estimatedCarryYards: Math.round(whole(values.method, 1) === 2 ? ball * (BALL_TO_CARRY[club] ?? 1.62) : speed * CARRY_PER_MPH),
    percentOfTourAverage: isDriver ? round2((speed / TOUR_AVG_MPH) * 100) : 0,
    vsAmateurAverageMph: isDriver ? round2(speed - AMATEUR_AVG_MPH) : 0,
  };
};

// --- 4. Golf Ball Speed to Distance ------------------------------------------------------------------
const LAUNCH_QUALITY: Record<number, number> = { 1: 1.02, 2: 1, 3: 0.93 };
// Roll as a share of carry: [driver/wood, other clubs] by fairway firmness.
const ROLL: Record<number, [number, number]> = { 1: [0.03, 0.01], 2: [0.07, 0.02], 3: [0.12, 0.04] };

export const golfBallSpeedToDistanceCalculator: CustomCalculator = (values) => {
  const club = whole(values.club, 1); // 1 driver/wood, 2 hybrid, 3 long iron, 4 mid iron, 5 short iron/PW
  const carry = nonNeg(values.ballSpeed, 140) * (BALL_TO_CARRY[club] ?? 1.62) * (LAUNCH_QUALITY[whole(values.launchQuality, 2)] ?? 1);
  const roll = (ROLL[whole(values.conditions, 2)] ?? ROLL[2])[club === 1 ? 0 : 1];
  const total = carry * (1 + roll);

  return { carryYards: Math.round(carry), totalYards: Math.round(total), carryMetres: Math.round(carry * 0.9144), rollYards: Math.round(total - carry) };
};

// --- 5. Smash Factor ---------------------------------------------------------------------------------------
// Optimal / Tour smash by club, and carry yards per mph of ball speed.
const OPTIMAL_SMASH: Record<number, number> = { 1: 1.49, 2: 1.48, 3: 1.46, 4: 1.4, 5: 1.33, 6: 1.28, 7: 1.23 };
const SMASH_CARRY: Record<number, number> = { 1: 1.62, 2: 1.6, 3: 1.57, 4: 1.47, 5: 1.43, 6: 1.37, 7: 1.33 };

export const smashFactorCalculator: CustomCalculator = (values) => {
  const club = whole(values.club, 1);
  const clubSpeed = nonNeg(values.clubSpeed, 95);
  const ball = nonNeg(values.ballSpeed, 135);
  const smash = div(ball, clubSpeed);
  const optimal = OPTIMAL_SMASH[club] ?? 1.49;
  const lost = Math.max(0, optimal * clubSpeed - ball);

  return {
    smashFactor: round2(smash * 100) / 100,
    optimalSmash: optimal,
    efficiencyPct: round2(div(smash, optimal) * 100),
    ballSpeedLostMph: round2(lost),
    carryLostYards: Math.round(lost * (SMASH_CARRY[club] ?? 1.62)),
  };
};

// --- 6. Golf Trajectory (ball-flight simulation) -------------------------------------------------------------
// Point-mass model with drag Cd = 0.22 + 0.3·S and lift Cl = min(0.35, 1.6·S),
// S = spin factor rω/v, spin decay 4%/s. Calibrated to Trackman PGA Tour averages
// (driver 167 mph / 10.9° / 2,686 rpm ≈ 267 yd; 7-iron 120 / 16.3° / 7,097 ≈ 167 yd).
export const golfTrajectoryCalculator: CustomCalculator = (values) => {
  const m = 0.04593;
  const r = 0.02135;
  const area = Math.PI * r * r;
  const altM = nonNeg(values.altitude, 0) * (whole(values.altitudeUnit, 1) === 2 ? 1 : 0.3048);
  const tempC = (num(values.temperatureF, 70) - 32) / 1.8;
  const rho = 1.225 * Math.exp(-altM / 8434) * (288.15 / (273.15 + clamp(tempC, -20, 50)));
  let vx = nonNeg(values.ballSpeed, 140) * 0.44704;
  const la = rad(clamp(num(values.launchAngle, 13), -10, 60));
  let vy = vx * Math.sin(la);
  vx = vx * Math.cos(la);
  let w = (nonNeg(values.spinRate, 2800) * 2 * Math.PI) / 60;
  let x = 0;
  let y = 0;
  let t = 0;
  let apex = 0;
  const dt = 0.005;

  if (vx <= 0) return { carryYards: 0, apexFeet: 0, hangTimeSeconds: 0, landingAngle: 0, carryMetres: 0 };
  while (t < 20) {
    const sp = Math.hypot(vx, vy);
    const s = (r * w) / sp;
    const cd = 0.22 + 0.3 * s;
    const cl = Math.min(0.35, 1.6 * s);
    const k = (0.5 * rho * area * sp) / m;
    const ax = -k * (cd * vx + cl * vy);
    const ay = -9.81 + k * (cl * vx - cd * vy);
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    w *= 1 - 0.04 * dt;
    if (y > apex) apex = y;
    if (y < 0) break;
  }

  return {
    carryYards: Math.round(x / 0.9144),
    apexFeet: Math.round(apex / 0.3048),
    hangTimeSeconds: round2(t),
    landingAngle: round2((Math.atan2(-vy, vx) * 180) / Math.PI),
    carryMetres: Math.round(x),
  };
};

// --- 7. Golf Elevation / Altitude ---------------------------------------------------------------------------------
const ALTITUDE_GAIN_PER_1000FT = 0.012;

export const golfElevationAltitudeCalculator: CustomCalculator = (values) => {
  const d = nonNeg(values.distance, 150);
  const altFt = nonNeg(values.altitude, 0) * (whole(values.altitudeUnit, 1) === 2 ? 3.28084 : 1);
  const gain = ALTITUDE_GAIN_PER_1000FT * (altFt / 1000);
  const altitudeEffect = d / (1 + gain) - d;
  const elevFt = num(values.elevationChange, 0) * (whole(values.altitudeUnit, 1) === 2 ? 3.28084 : 1);
  const elevYd = elevFt / 3;
  const elevationEffect = elevYd >= 0 ? elevYd : elevYd * (2 / 3);
  const playsLike = d + altitudeEffect + elevationEffect;

  return {
    playsLikeYards: Math.round(playsLike),
    altitudeEffectYards: round2(altitudeEffect),
    elevationEffectYards: round2(elevationEffect),
    extraCarryPct: round2(gain * 100),
  };
};

// --- 8. Golf Wind ------------------------------------------------------------------------------------------------
const FLIGHT_FACTOR: Record<number, number> = { 1: 0.8, 2: 1, 3: 1.2 };

export const golfWindCalculator: CustomCalculator = (values) => {
  const d = nonNeg(values.distance, 150);
  const speed = nonNeg(values.windSpeed, 10) * (whole(values.speedUnit, 1) === 2 ? 0.621371 : 1);
  const dir = rad(num(values.windDirection, 0)); // 0 = into your face, 180 = behind you, 90 = from your left
  const f = FLIGHT_FACTOR[whole(values.ballFlight, 2)] ?? 1;
  const head = speed * Math.cos(dir);
  const cross = speed * Math.sin(dir);
  const pct = (head >= 0 ? 0.01 : 0.005) * head * f;
  const playsLike = d * (1 + pct);
  const drift = 0.6 * Math.abs(cross) * (d / 100) * f;

  return {
    playsLikeYards: Math.round(playsLike),
    adjustmentYards: round2(playsLike - d),
    headwindMph: round2(head),
    crosswindMph: round2(cross),
    aimOffsetYards: round2(drift),
  };
};

// --- 9. Rule of 12 (chipping) ----------------------------------------------------------------------------------------
const GREEN_SPEED_ADJ: Record<number, number> = { 1: -1, 2: 0, 3: 1 };
const SLOPE_ADJ: Record<number, number> = { 1: -1, 2: 0, 3: 1 };

export const ruleOf12GolfCalculator: CustomCalculator = (values) => {
  const toGreen = nonNeg(values.toGreen, 3);
  const carry = toGreen + 1; // land one pace onto the green
  const roll = Math.max(0, toGreen + nonNeg(values.onGreen, 12) - carry);
  const ratio = div(roll, carry);
  const adj = (GREEN_SPEED_ADJ[whole(values.greenSpeed, 2)] ?? 0) + (SLOPE_ADJ[whole(values.slope, 2)] ?? 0);
  const club = clamp(Math.round(12 - ratio) + adj, 4, 12);

  return { clubNumber: club, rollToCarryRatio: round2(ratio), carryPaces: carry, rollPaces: round2(roll) };
};

// --- 10. Golf Cart Speed ----------------------------------------------------------------------------------------------
export const golfCartSpeedCalculator: CustomCalculator = (values) => {
  const rpm = nonNeg(values.motorRpm, 4000);
  const gear = Math.max(1, nonNeg(values.gearRatio, 12.5));
  const tire = nonNeg(values.tireDiameter, 18);
  const stock = Math.max(1, nonNeg(values.stockTireDiameter, 18));
  const mph = (rpm * Math.PI * tire * 60) / (gear * 63360);

  return {
    topSpeedMph: round2(mph),
    topSpeedKmh: round2(mph * 1.609344),
    changeVsStockPct: round2((tire / stock - 1) * 100),
    speedometerReadsMph: round2(mph * (stock / Math.max(1, tire))),
  };
};

export const golfDistanceCustomCalculators: Record<string, CustomCalculator> = {
  "golf-club-distance-calculator": golfClubDistanceCalculator,
  "golf-club-gapping-calculator": golfClubGappingCalculator,
  "golf-swing-speed-calculator": golfSwingSpeedCalculator,
  "golf-ball-speed-to-distance-calculator": golfBallSpeedToDistanceCalculator,
  "smash-factor-calculator": smashFactorCalculator,
  "golf-trajectory-calculator": golfTrajectoryCalculator,
  "golf-elevation-altitude-calculator": golfElevationAltitudeCalculator,
  "golf-wind-calculator": golfWindCalculator,
  "rule-of-12-golf-calculator": ruleOf12GolfCalculator,
  "golf-cart-speed-calculator": golfCartSpeedCalculator,
};
