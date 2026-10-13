/**
 * Batch: "Sports Calculators" > Golf Calculators, sub-batch C (Equipment &
 * Fitting, 10 tools). See calc-engine-golf-handicap.ts for the full list of
 * 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - golfClubLengthCalculator: full-swing club lengths from height and
 *    wrist-to-floor.
 *  - putterLengthCalculator: putter length from height, posture and putter
 *    style (conventional, arm-lock, long).
 *  - lieAngleCalculator: iron lie adjustment from height / wrist-to-floor
 *    and the miss it causes, or putter lie from length and posture (also
 *    the putter lie angle calculator).
 *  - golfSwingWeightCalculator: swing weight from weight and balance point,
 *    plus head weight to reach a target.
 *  - golfShaftFlexWeightCalculator: shaft flex and weight from swing speed.
 *  - golfGripSizeCalculator: grip size from hand and finger length.
 *  - driverLoftCalculator: driver loft, launch and spin from speed and
 *    attack angle.
 *  - golfBallFittingCalculator: ball compression, cover and cost per round.
 *  - golfClubTradeInValueCalculator: resale and trade-in value of used clubs.
 *  - golfSimulatorProjectorCalculator: throw distance, image size, lumens.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-golf-equipment-calculators.ts for the copy.
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
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const toHalf = (v: number) => Math.round(v * 2) / 2;
const toQuarter = (v: number) => Math.round(v * 4) / 4;
/** Length: unit 1 = inches, 2 = cm -> inches. */
const inches = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 2.54 : v);

// --- 1. Golf Club Length ----------------------------------------------------------
/** Height-based adjustment (inches) to standard men's length. */
function heightAdjust(h: number): number {
  if (h < 60) return -1.5;
  if (h < 63) return -1;
  if (h < 66) return -0.5;
  if (h < 69.5) return 0;
  if (h < 72) return 0.5;
  if (h < 75) return 1;
  if (h < 78) return 1.5;
  return 2;
}

export const golfClubLengthCalculator: CustomCalculator = (values) => {
  const h = inches(nonNeg(values.height, 69), values.unit);
  const wtf = inches(nonNeg(values.wristToFloor, 34), values.unit);
  const wtfAdj = wtf > 0 ? clamp((wtf - 0.49 * h) * 0.25, -1, 1) : 0;
  const adj = clamp(toQuarter(heightAdjust(h) + wtfAdj), -2, 2.5);
  const base = whole(values.standard, 1) === 2 ? -1 : 0; // women's standard is 1" shorter

  return {
    adjustmentInches: adj,
    sevenIronLength: round2(37 + base + adj),
    driverLength: round2(45.5 + base + adj),
    fiveIronLength: round2(38 + base + adj),
    pitchingWedgeLength: round2(35.75 + base + adj),
  };
};

// --- 2. Putter Length -----------------------------------------------------------------
export const putterLengthCalculator: CustomCalculator = (values) => {
  const h = inches(nonNeg(values.height, 69), values.unit);
  const style = whole(values.style, 1); // 1 conventional, 2 arm-lock, 3 long / broomstick
  const posture = whole(values.posture, 2); // 1 upright, 2 standard, 3 bent over
  const conventional = clamp(Math.round(34 + (h - 69) / 3 + (posture === 1 ? 1 : posture === 3 ? -1 : 0)), 31, 37);
  const length = style === 2 ? conventional + 7 : style === 3 ? Math.round(h * 0.7) : conventional;

  return { putterLength: length, putterLengthCm: round2(length * 2.54), conventionalLength: conventional };
};

// --- 3. Lie Angle (irons and putters) ----------------------------------------------------
export const lieAngleCalculator: CustomCalculator = (values) => {
  if (whole(values.clubType, 1) === 2) {
    const len = inches(nonNeg(values.putterLength, 34), values.unit);
    const posture = whole(values.posture, 2);
    const lie = clamp(70 + (len - 34) + (posture === 1 ? 2 : posture === 3 ? -2 : 0), 64, 80);
    return { recommendedLie: round2(lie), adjustmentDegrees: round2(lie - 70), offlineYards: 0 };
  }
  const h = inches(nonNeg(values.height, 69), values.unit);
  const wtf = inches(nonNeg(values.wristToFloor, 34), values.unit);
  const adj = clamp(toHalf(0.3 * (h - 69) + (wtf > 0 ? 0.5 * (wtf - 0.49 * h) : 0)), -4, 4);
  const loft = (num(values.loft, 34) * Math.PI) / 180;
  const shot = nonNeg(values.shotDistance, 150);
  // Off-line distance if you played standard lie and needed the adjustment.
  const offline = shot * Math.sin(loft) * Math.tan((Math.abs(adj) * Math.PI) / 180);

  return { recommendedLie: round2(62.5 + adj), adjustmentDegrees: adj, offlineYards: round2(offline) };
};

// --- 4. Swing Weight ------------------------------------------------------------------------
// Lorythmic scale: 14" fulcrum, 1 point = 1.75 in-oz, D0 = 214 in-oz (A0 = 161.5).
const GRAMS_PER_OZ = 28.349523125;

export const golfSwingWeightCalculator: CustomCalculator = (values) => {
  const oz = nonNeg(values.clubWeight, 330) / GRAMS_PER_OZ;
  const balance = nonNeg(values.balancePoint, 36);
  const moment = oz * (balance - 14);
  const points = (moment - 161.5) / 1.75;
  const target = num(values.targetPoints, 32);
  const headArm = Math.max(1, nonNeg(values.clubLength, 45.5) - 14 - 0.5);
  const gramsToTarget = (((target - points) * 1.75) / headArm) * GRAMS_PER_OZ;

  return {
    swingWeightPoints: round2(points),
    letter: clamp(Math.floor(points / 10) + 1, 1, 7),
    pointWithinLetter: round2(points - Math.floor(points / 10) * 10),
    momentInchOunces: round2(moment),
    headGramsToTarget: round2(gramsToTarget),
  };
};

// --- 5. Shaft Flex & Weight ---------------------------------------------------------------------
/** Driver swing speed (mph) -> flex 1 L, 2 A/Senior, 3 R, 4 S, 5 X. */
function flexFor(speed: number): number {
  if (speed < 75) return 1;
  if (speed < 85) return 2;
  if (speed < 95) return 3;
  if (speed < 105) return 4;
  return 5;
}
const DRIVER_SHAFT_G: Record<number, [number, number]> = { 1: [40, 50], 2: [45, 55], 3: [55, 65], 4: [60, 70], 5: [70, 80] };
const IRON_SHAFT_G: Record<number, [number, number]> = { 1: [50, 65], 2: [60, 80], 3: [85, 105], 4: [105, 120], 5: [120, 130] };

export const golfShaftFlexWeightCalculator: CustomCalculator = (values) => {
  const speed = whole(values.method, 1) === 2 ? nonNeg(values.carry, 220) / 2.3 : nonNeg(values.swingSpeed, 95);
  const tempo = whole(values.tempo, 2);
  const flex = clamp(flexFor(speed) + (tempo === 3 ? 1 : tempo === 1 ? -1 : 0), 1, 5);

  return {
    flex,
    swingSpeedMph: round2(speed),
    driverShaftMinGrams: DRIVER_SHAFT_G[flex][0],
    driverShaftMaxGrams: DRIVER_SHAFT_G[flex][1],
    ironShaftMinGrams: IRON_SHAFT_G[flex][0],
    ironShaftMaxGrams: IRON_SHAFT_G[flex][1],
  };
};

// --- 6. Grip Size ------------------------------------------------------------------------------------
// 1 Junior, 2 Undersize, 3 Standard, 4 Midsize, 5 Jumbo; diameter change vs standard (in).
const GRIP_DIAMETER_CHANGE: Record<number, number> = { 1: -0.0625, 2: -0.015625, 3: 0, 4: 0.0625, 5: 0.125 };

export const golfGripSizeCalculator: CustomCalculator = (values) => {
  const hand = inches(nonNeg(values.handLength, 7.75), values.unit);
  const finger = inches(nonNeg(values.fingerLength, 3), values.unit);
  let size = hand < 6.5 ? 1 : hand < 7 ? 2 : hand < 8.25 ? 3 : hand < 9.25 ? 4 : 5;
  if (finger > 0 && finger < 2.75 && size > 1) size -= 1;
  else if (finger > 3.5 && size < 5) size += 1;
  const change = GRIP_DIAMETER_CHANGE[size];

  return { gripSize: size, diameterChangeInches: round2(change * 1000) / 1000, tapeWraps: Math.max(0, Math.round(change / 0.015625)) };
};

// --- 7. Driver Loft ---------------------------------------------------------------------------------------
export const driverLoftCalculator: CustomCalculator = (values) => {
  const speed = nonNeg(values.swingSpeed, 95);
  const aoa = num(values.attackAngle, 0);
  const flight = whole(values.ballFlight, 2); // 1 too low, 2 good, 3 too high
  const loft = clamp(toHalf(10.5 + (95 - speed) * 0.1 - 0.5 * aoa + (flight === 1 ? 1 : flight === 3 ? -1 : 0)), 7, 16);

  return {
    recommendedLoft: loft,
    loftRangeLow: loft - 0.5,
    loftRangeHigh: loft + 0.5,
    targetLaunchAngle: round2(clamp(22 - 0.09 * speed + 0.5 * aoa, 8, 20)),
    targetSpinRpm: Math.round(clamp(4300 - 18 * speed, 1800, 3500) / 10) * 10,
  };
};

// --- 8. Golf Ball Fitting --------------------------------------------------------------------------------------
export const golfBallFittingCalculator: CustomCalculator = (values) => {
  const speed = nonNeg(values.swingSpeed, 90);
  const priority = whole(values.priority, 3); // 1 distance/value, 2 soft feel, 3 balanced, 4 greenside spin
  const hcp = nonNeg(values.handicap, 18);
  const compression = clamp(Math.round(1.2 * speed - 30), 40, 110);
  const urethane = priority === 4 || (priority === 3 && hcp <= 15) ? 2 : 1;
  const pieces = urethane === 2 ? (speed >= 105 ? 4 : 3) : priority === 2 ? 2 : speed >= 95 ? 3 : 2;
  const perRound = nonNeg(values.ballsLostPerRound, 3) * (nonNeg(values.pricePerDozen, 45) / 12);

  return {
    compressionTarget: priority === 2 ? Math.max(40, compression - 15) : compression,
    cover: urethane,
    pieces,
    ballCostPerRound: round2(perRound),
    ballCostPerYear: round2(perRound * whole(values.roundsPerYear, 30)),
  };
};

// --- 9. Golf Club Trade-In Value ---------------------------------------------------------------------------------
const RESALE_BY_AGE = [0.7, 0.55, 0.45, 0.37, 0.3, 0.25];
const CLUB_FACTOR: Record<number, number> = { 1: 0.95, 2: 0.95, 3: 1.05, 4: 0.9, 5: 1.1, 6: 1 };
const CONDITION: Record<number, number> = { 1: 1, 2: 0.9, 3: 0.78, 4: 0.6 };

export const golfClubTradeInValueCalculator: CustomCalculator = (values) => {
  const price = nonNeg(values.originalPrice, 550);
  const age = nonNeg(values.ageYears, 2);
  const i = Math.floor(age);
  const ageFactor = Math.max(0.05, i < RESALE_BY_AGE.length - 1
    ? RESALE_BY_AGE[i] + (RESALE_BY_AGE[i + 1] - RESALE_BY_AGE[i]) * (age - i)
    : RESALE_BY_AGE[RESALE_BY_AGE.length - 1] * Math.pow(0.85, age - (RESALE_BY_AGE.length - 1)));
  const resale = price * ageFactor * (CLUB_FACTOR[whole(values.clubType, 1)] ?? 1) * (CONDITION[whole(values.condition, 2)] ?? 0.9);

  return { privateSaleValue: round2(resale), tradeInCredit: round2(resale * 0.6), cashOffer: round2(resale * 0.45), percentOfOriginal: round2((resale / Math.max(1, price)) * 100) };
};

// --- 10. Golf Simulator Projector -----------------------------------------------------------------------------------
const ASPECT: Record<number, number> = { 1: 16 / 9, 2: 4 / 3, 3: 16 / 10 };
const LUMENS_PER_SQFT: Record<number, number> = { 1: 30, 2: 45, 3: 60 };

export const golfSimulatorProjectorCalculator: CustomCalculator = (values) => {
  const sw = nonNeg(values.screenWidth, 10);
  const sh = nonNeg(values.screenHeight, 8);
  const aspect = ASPECT[whole(values.aspect, 3)] ?? 16 / 10;
  const imageWidth = Math.min(sw, sh * aspect);
  const imageHeight = imageWidth / aspect;
  const throwRatio = nonNeg(values.throwRatio, 0.5);
  const throwFt = imageWidth * throwRatio;
  const area = imageWidth * imageHeight;

  return {
    throwDistanceFt: round2(throwFt),
    imageWidthFt: round2(imageWidth),
    imageHeightFt: round2(imageHeight),
    imageAreaSqFt: round2(area),
    recommendedLumens: Math.round((area * (LUMENS_PER_SQFT[whole(values.ambientLight, 2)] ?? 45)) / 100) * 100,
    roomDepthRemainingFt: round2(nonNeg(values.roomDepth, 16) - throwFt),
  };
};

export const golfEquipmentCustomCalculators: Record<string, CustomCalculator> = {
  "golf-club-length-calculator": golfClubLengthCalculator,
  "putter-length-calculator": putterLengthCalculator,
  "lie-angle-calculator": lieAngleCalculator,
  "golf-swing-weight-calculator": golfSwingWeightCalculator,
  "golf-shaft-flex-weight-calculator": golfShaftFlexWeightCalculator,
  "golf-grip-size-calculator": golfGripSizeCalculator,
  "driver-loft-calculator": driverLoftCalculator,
  "golf-ball-fitting-calculator": golfBallFittingCalculator,
  "golf-club-trade-in-value-calculator": golfClubTradeInValueCalculator,
  "golf-simulator-projector-calculator": golfSimulatorProjectorCalculator,
};
