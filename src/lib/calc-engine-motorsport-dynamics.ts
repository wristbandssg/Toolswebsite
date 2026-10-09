/**
 * Batch: "Sports Calculators" > Motorsports & Racing Calculators, sub-batch
 * C (Vehicle Dynamics & Aero, 11 tools). See calc-engine-motorsport-engine.ts
 * for the full list of 5 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - eighthToQuarterMileCalculator: converts 1/8-mile ET and MPH to
 *    quarter-mile (and back).
 *  - gForceCalculator: g from acceleration, braking or cornering.
 *  - brakingDistanceCalculator: reaction + braking distance on any surface.
 *  - densityAltitudeCalculator: air density, density altitude and power
 *    loss from weather (also the air density calculator).
 *  - dragCoefficientCalculator: drag force and power from Cd (or Cd from a
 *    measured force).
 *  - downforceCalculator: wing/aero downforce and its drag.
 *  - rollingResistanceCalculator: tyre rolling resistance force and power.
 *  - weightTransferCalculator: load transfer under acceleration, braking
 *    and cornering.
 *  - cornerWeightCalculator: corner scales → distribution and cross weight
 *    (also car weight distribution).
 *  - ballastCalculator: ballast to make minimum weight or a target balance.
 *  - rollCenterCalculator: front-view roll centre of a double-wishbone axle.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-motorsport-dynamics-calculators.ts for the copy.
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
const G = 9.80665;
const MPH = 0.44704; // m/s per mph

// --- 1. 1/8 to 1/4 Mile -----------------------------------------------------
export const eighthToQuarterMileCalculator: CustomCalculator = (values) => {
  const toQuarter = whole(values.direction, 1) === 1;
  const et = nonNeg(values.et, 7.8);
  const mph = nonNeg(values.mph, 90);
  // Common drag-racing conversion factors.
  const etF = 1.5832;
  const mphF = 1.255;

  return {
    convertedEt: round2(toQuarter ? et * etF : et / etF),
    convertedMph: round2(toQuarter ? mph * mphF : mph / mphF),
    etFactor: etF,
    mphFactor: mphF,
  };
};

// --- 2. G-Force -------------------------------------------------------------
export const gForceCalculator: CustomCalculator = (values) => {
  const mode = whole(values.mode, 1); // 1 acceleration/braking, 2 cornering
  const kmh = whole(values.speedUnit, 1) === 2;
  const toMs = (v: number) => v * (kmh ? 1 / 3.6 : MPH);
  let a: number;
  if (mode === 2) {
    const v = toMs(nonNeg(values.speed, 60));
    const r = Math.max(0.1, nonNeg(values.radiusFt, 300) * (whole(values.radiusUnit, 1) === 2 ? 1 : 0.3048));
    a = (v * v) / r;
  } else {
    const dv = toMs(nonNeg(values.speedChange, 60));
    const t = Math.max(0.01, nonNeg(values.timeSeconds, 4));
    a = dv / t;
  }

  return { gForce: round2(a / G), accelerationMs2: round2(a), accelerationFtS2: round2(a / 0.3048) };
};

// --- 3. Braking Distance ----------------------------------------------------
const FRICTION: Record<number, number> = { 1: 0.7, 2: 0.4, 3: 0.2, 4: 0.1, 5: 1.0, 6: 1.4 };

export const brakingDistanceCalculator: CustomCalculator = (values) => {
  const kmh = whole(values.speedUnit, 1) === 2;
  const v = nonNeg(values.speed, 60) * (kmh ? 1 / 3.6 : MPH);
  const mu = nonNeg(values.customFriction, 0) || FRICTION[whole(values.surface, 1)] || 0.7;
  const grade = safeNumber(values.gradePercent, 0) / 100;
  const react = nonNeg(values.reactionSeconds, 1.5);
  const decel = G * (mu + grade);
  const braking = decel > 0 ? (v * v) / (2 * decel) : 0;
  const reaction = v * react;
  const ft = 3.28084;

  return {
    totalStoppingDistanceFt: round2((braking + reaction) * ft),
    brakingDistanceFt: round2(braking * ft),
    reactionDistanceFt: round2(reaction * ft),
    totalStoppingDistanceM: round2(braking + reaction),
    stoppingTimeSeconds: decel > 0 ? round2(react + v / decel) : 0,
    decelerationG: round2(mu + grade),
  };
};

// --- 4. Density Altitude (and air density) ----------------------------------
export const densityAltitudeCalculator: CustomCalculator = (values) => {
  const tF = safeNumber(values.temperatureF, 85);
  const elevation = safeNumber(values.elevationFt, 1000);
  const altimeter = nonNeg(values.altimeterInHg, 29.92);
  const dewF = safeNumber(values.dewPointF, 60);
  const tC = ((tF - 32) * 5) / 9;
  const tdC = ((Math.min(dewF, tF) - 32) * 5) / 9;
  // Pressure altitude, then station pressure (standard atmosphere).
  const pa = elevation + (29.92 - altimeter) * 1000;
  const stationHpa = 1013.25 * Math.pow(1 - 6.8753e-6 * pa, 5.2559);
  // Vapour pressure from dew point (Magnus), hPa.
  const pv = 6.1078 * Math.pow(10, (7.5 * tdC) / (237.3 + tdC));
  const pd = stationHpa - pv;
  const tK = tC + 273.15;
  const rho = (pd * 100) / (287.058 * tK) + (pv * 100) / (461.495 * tK);
  const da = 145442.16 * (1 - Math.pow(rho / 1.225, 0.234969));

  return {
    densityAltitudeFt: Math.round(da),
    airDensityKgM3: Math.round(rho * 10000) / 10000,
    relativeAirDensityPercent: round2((rho / 1.225) * 100),
    // Naturally aspirated power falls about in line with air density.
    powerLossPercent: round2(Math.max(0, (1 - rho / 1.225) * 100)),
    pressureAltitudeFt: Math.round(pa),
    airDensityLbFt3: Math.round(rho * 0.062428 * 100000) / 100000,
  };
};

// --- 5. Drag Coefficient ----------------------------------------------------
export const dragCoefficientCalculator: CustomCalculator = (values) => {
  const rho = nonNeg(values.airDensity, 1.225);
  const area = nonNeg(values.frontalAreaM2, 2.2);
  const v = nonNeg(values.speedMph, 70) * MPH;
  const measured = nonNeg(values.measuredForceN, 0);
  const cd = measured > 0 && area > 0 && v > 0 ? (2 * measured) / (rho * v * v * area) : nonNeg(values.dragCoefficient, 0.3);
  const force = 0.5 * rho * cd * area * v * v;

  return { dragCoefficient: Math.round(cd * 1000) / 1000, dragForceN: round2(force), dragForceLbf: round2(force * 0.224809), powerToOvercomeHp: round2((force * v) / 745.7), cdA: Math.round(cd * area * 1000) / 1000 };
};

// --- 6. Downforce -----------------------------------------------------------
export const downforceCalculator: CustomCalculator = (values) => {
  const rho = nonNeg(values.airDensity, 1.225);
  const cl = nonNeg(values.liftCoefficient, 1.5);
  const area = nonNeg(values.wingAreaM2, 0.6);
  const v = nonNeg(values.speedMph, 100) * MPH;
  const ld = Math.max(0.1, nonNeg(values.liftToDrag, 4));
  const down = 0.5 * rho * cl * area * v * v;
  const drag = down / ld;

  return { downforceN: round2(down), downforceLbs: round2(down * 0.224809), dragN: round2(drag), dragPowerHp: round2((drag * v) / 745.7), downforceAt150MphLbs: round2(0.5 * rho * cl * area * (150 * MPH) ** 2 * 0.224809) };
};

// --- 7. Rolling Resistance --------------------------------------------------
const CRR: Record<number, number> = { 1: 0.008, 2: 0.012, 3: 0.015, 4: 0.03, 5: 0.004 };

export const rollingResistanceCalculator: CustomCalculator = (values) => {
  const crr = nonNeg(values.customCrr, 0) || CRR[whole(values.tireType, 2)] || 0.012;
  const lb = nonNeg(values.weightLb, 3500);
  const v = nonNeg(values.speedMph, 60) * MPH;
  const force = crr * lb * 0.45359237 * G;

  return { rollingResistanceN: round2(force), rollingResistanceLbf: round2(force * 0.224809), powerHp: round2((force * v) / 745.7), crrUsed: crr };
};

// --- 8. Weight Transfer -----------------------------------------------------
export const weightTransferCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.weightLb, 3200);
  const h = nonNeg(values.cgHeightIn, 20);
  const wb = Math.max(1, nonNeg(values.wheelbaseIn, 105));
  const track = Math.max(1, nonNeg(values.trackWidthIn, 62));
  const ax = safeNumber(values.longitudinalG, 1);
  const ay = nonNeg(values.lateralG, 1);
  const lon = (w * ax * h) / wb;
  const lat = (w * ay * h) / track;

  return { longitudinalTransferLb: round2(lon), lateralTransferLb: round2(lat), longitudinalPercent: w > 0 ? round2((lon / w) * 100) : 0, lateralPercent: w > 0 ? round2((lat / w) * 100) : 0, rolloverThresholdG: h > 0 ? round2(track / 2 / h) : 0 };
};

// --- 9. Corner Weight (and weight distribution) -----------------------------
export const cornerWeightCalculator: CustomCalculator = (values) => {
  const lf = nonNeg(values.leftFront, 850);
  const rf = nonNeg(values.rightFront, 820);
  const lr = nonNeg(values.leftRear, 760);
  const rr = nonNeg(values.rightRear, 770);
  const total = lf + rf + lr + rr;
  const pct = (x: number) => (total > 0 ? round2((x / total) * 100) : 0);

  return {
    totalWeight: round2(total),
    frontPercent: pct(lf + rf),
    rearPercent: pct(lr + rr),
    leftPercent: pct(lf + lr),
    rightPercent: pct(rf + rr),
    crossWeightPercent: pct(rf + lr),
    // Wedge: positive = more on RF + LR (oval-track convention).
    wedgeLb: round2(rf + lr - (lf + rr)),
  };
};

// --- 10. Ballast ------------------------------------------------------------
export const ballastCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.currentWeight, 2400);
  const front = (w * Math.min(100, nonNeg(values.currentFrontPercent, 55))) / 100;
  const minW = nonNeg(values.minimumWeight, 2500);
  const wb = Math.max(1, nonNeg(values.wheelbaseIn, 100));
  const x = Math.min(wb, nonNeg(values.ballastPositionIn, 70)); // from the front axle
  const target = Math.min(100, nonNeg(values.targetFrontPercent, 52)) / 100;
  const frontShare = 1 - x / wb;
  // Ballast to reach the target balance at this position.
  const denom = frontShare - target;
  const forBalance = Math.abs(denom) > 1e-6 ? (target * w - front) / denom : 0;
  const toMin = Math.max(0, minW - w);
  const newFront = toMin > 0 ? ((front + toMin * frontShare) / (w + toMin)) * 100 : (front / Math.max(1, w)) * 100;

  return { ballastToMinimumWeight: round2(toMin), frontPercentAfterMinimumBallast: round2(newFront), ballastForTargetBalance: round2(Math.max(0, forBalance)), targetReachable: forBalance >= 0 ? 1 : 0 };
};

// --- 11. Roll Center (double wishbone, front view) --------------------------
export const rollCenterCalculator: CustomCalculator = (values) => {
  // Coordinates in inches: y = lateral distance from the car centreline,
  // z = height above the ground. One side; the car is symmetrical.
  const line = (y1: number, z1: number, y2: number, z2: number) => ({ m: (z2 - z1) / (y2 - y1 || 1e-9), b: z1 - ((z2 - z1) / (y2 - y1 || 1e-9)) * y1 });
  const lower = line(safeNumber(values.lowerInnerY, 12), safeNumber(values.lowerInnerZ, 8), safeNumber(values.lowerOuterY, 28), safeNumber(values.lowerOuterZ, 7));
  const upper = line(safeNumber(values.upperInnerY, 15), safeNumber(values.upperInnerZ, 17), safeNumber(values.upperOuterY, 26), safeNumber(values.upperOuterZ, 18));
  // Instant centre: where the two arm lines cross.
  const parallel = Math.abs(lower.m - upper.m) < 1e-9;
  const icY = parallel ? Infinity : (upper.b - lower.b) / (lower.m - upper.m);
  const icZ = parallel ? Infinity : lower.m * icY + lower.b;
  const cpY = nonNeg(values.trackWidth, 62) / 2;
  // Roll centre: line from the tyre contact patch (cpY, 0) through the IC, at y = 0.
  let rc: number;
  if (!Number.isFinite(icY)) rc = lower.m * -cpY; // parallel arms: line parallel to them
  else rc = (icZ / (icY - cpY)) * (0 - cpY);

  return {
    rollCenterHeightIn: round2(rc),
    instantCenterLateralIn: Number.isFinite(icY) ? round2(icY) : 0,
    instantCenterHeightIn: Number.isFinite(icZ) ? round2(icZ) : 0,
    swingArmLengthIn: Number.isFinite(icY) ? round2(Math.abs(cpY - icY)) : 0,
  };
};

export const motorsportDynamicsCustomCalculators: Record<string, CustomCalculator> = {
  "1-8-to-1-4-mile-calculator": eighthToQuarterMileCalculator,
  "g-force-calculator": gForceCalculator,
  "braking-distance-calculator": brakingDistanceCalculator,
  "density-altitude-calculator": densityAltitudeCalculator,
  "drag-coefficient-calculator": dragCoefficientCalculator,
  "downforce-calculator": downforceCalculator,
  "rolling-resistance-calculator": rollingResistanceCalculator,
  "weight-transfer-calculator": weightTransferCalculator,
  "corner-weight-calculator": cornerWeightCalculator,
  "ballast-calculator": ballastCalculator,
  "roll-center-calculator": rollCenterCalculator,
};
