/**
 * Batch: "Sports Calculators" > Motorsports & Racing Calculators, sub-batch
 * B (Power, Gearing, Wheels & Performance, 11 tools). See
 * calc-engine-motorsport-engine.ts for the full list of 5 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - torqueToHorsepowerCalculator: torque ↔ horsepower at an RPM.
 *  - wheelHorsepowerCalculator: crank ↔ wheel horsepower by drivetrain loss.
 *  - engineRpmCalculator: RPM at a road speed from gearing and tyre (also
 *    RPM at speed), and speed at redline.
 *  - torqueConverterCalculator: converter slip at cruise.
 *  - finalDriveRatioCalculator: the rear-end gear for a target speed at an
 *    RPM (also drag racing gear ratio).
 *  - tireDiameterCalculator: metric tyre size → diameter and revs per mile,
 *    compared with a second size.
 *  - speedometerCalculator: speedometer error after a tyre size change.
 *  - wheelOffsetCalculator: poke and inner clearance when changing wheels.
 *  - topSpeedCalculator: drag- and gearing-limited top speed.
 *  - zeroToSixtyCalculator: 0–60 mph estimate from power, weight and drive.
 *  - quarterMileCalculator: ET and trap speed ↔ horsepower.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-motorsport-power-gearing-calculators.ts for the copy.
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
const MPH_RPM = 336.13; // mph × ratio × 336 ÷ tyre diameter (in) = RPM
const HP_W = 745.7;
const LB_KG = 0.45359237;

/** Metric tyre (e.g. 245/40R18) → diameter in inches. */
const tireDia = (width: number, aspect: number, rim: number) => (2 * width * (aspect / 100)) / 25.4 + rim;

// --- 1. Torque to Horsepower ------------------------------------------------
export const torqueToHorsepowerCalculator: CustomCalculator = (values) => {
  const rpm = Math.max(1, nonNeg(values.rpm, 5252));
  const mode = whole(values.mode, 1); // 1 torque → hp, 2 hp → torque
  const torque = mode === 1 ? nonNeg(values.torqueLbFt, 400) : (nonNeg(values.horsepower, 400) * 5252) / rpm;
  const hp = (torque * rpm) / 5252;

  return { horsepower: round2(hp), torqueLbFt: round2(torque), kilowatts: round2((hp * HP_W) / 1000), torqueNm: round2(torque * 1.35582), metricHorsepowerPs: round2(hp * 1.01387) };
};

// --- 2. Wheel Horsepower ----------------------------------------------------
const LOSS: Record<number, number> = { 1: 12, 2: 15, 3: 18, 4: 22 };

export const wheelHorsepowerCalculator: CustomCalculator = (values) => {
  const loss = (nonNeg(values.customLossPercent, 0) || LOSS[whole(values.drivetrain, 2)] || 15) / 100;
  const fromCrank = whole(values.mode, 1) === 1;
  const crank = fromCrank ? nonNeg(values.horsepower, 400) : nonNeg(values.horsepower, 340) / (1 - loss);
  const wheel = crank * (1 - loss);

  return { wheelHorsepower: round2(wheel), crankHorsepower: round2(crank), drivetrainLoss: round2(crank - wheel), lossPercentUsed: round2(loss * 100) };
};

// --- 3. Engine RPM (and RPM at speed) ---------------------------------------
export const engineRpmCalculator: CustomCalculator = (values) => {
  const mph = nonNeg(values.speed, 70) * (whole(values.speedUnit, 1) === 2 ? 0.621371 : 1);
  const gear = nonNeg(values.gearRatio, 0.7);
  const fd = nonNeg(values.finalDrive, 3.73);
  const dia = Math.max(1, nonNeg(values.tireDiameter, 27));
  const slip = Math.min(20, nonNeg(values.slipPercent, 0)) / 100;
  const rpm = ((mph * gear * fd * MPH_RPM) / dia) * (1 + slip);
  const redline = nonNeg(values.redline, 6500);
  const atRed = gear * fd > 0 ? (redline * dia) / (gear * fd * MPH_RPM) : 0;

  return { engineRpm: Math.round(rpm), speedAtRedlineMph: round2(atRed), speedAtRedlineKmh: round2(atRed * 1.609344), overallRatio: round2(gear * fd), mphPer1000Rpm: rpm > 0 ? round2((mph / rpm) * 1000) : 0 };
};

// --- 4. Torque Converter ----------------------------------------------------
export const torqueConverterCalculator: CustomCalculator = (values) => {
  const engine = Math.max(1, nonNeg(values.engineRpm, 2050));
  const mph = nonNeg(values.speedMph, 60);
  const shaft = (mph * nonNeg(values.gearRatio, 0.7) * nonNeg(values.finalDrive, 3.73) * MPH_RPM) / Math.max(1, nonNeg(values.tireDiameter, 27));
  const slip = (engine - shaft) / engine;

  return {
    slipPercent: round2(slip * 100),
    inputShaftRpm: Math.round(shaft),
    rpmLost: Math.round(engine - shaft),
    // 1 locked/tight (<3%), 2 normal (3–8%), 3 loose (8–15%), 4 very loose.
    slipRating: slip < 0.03 ? 1 : slip < 0.08 ? 2 : slip < 0.15 ? 3 : 4,
  };
};

// --- 5. Final Drive Ratio (and drag racing gear) ----------------------------
export const finalDriveRatioCalculator: CustomCalculator = (values) => {
  const mph = Math.max(1, nonNeg(values.targetSpeedMph, 120));
  const rpm = nonNeg(values.rpmAtTarget, 6500);
  const dia = Math.max(1, nonNeg(values.tireDiameter, 28));
  const top = Math.max(0.1, nonNeg(values.topGearRatio, 1));
  const conv = Math.min(20, nonNeg(values.slipPercent, 3)) / 100;
  const ideal = (rpm * dia) / (mph * MPH_RPM * top * (1 + conv));
  const current = nonNeg(values.currentRatio, 3.73);

  return {
    idealFinalDrive: round2(ideal),
    currentRpmAtTarget: Math.round(((mph * top * current * MPH_RPM) / dia) * (1 + conv)),
    currentSpeedAtRpm: round2((rpm * dia) / (top * current * MPH_RPM * (1 + conv))),
    nearestCommonRatio: [2.73, 3.08, 3.23, 3.42, 3.55, 3.73, 3.9, 4.1, 4.3, 4.56, 4.88, 5.13, 5.38, 5.57].reduce((a, b) => (Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a)),
  };
};

// --- 6. Tire Diameter -------------------------------------------------------
export const tireDiameterCalculator: CustomCalculator = (values) => {
  const d1 = tireDia(nonNeg(values.width1, 245), nonNeg(values.aspect1, 40), nonNeg(values.rim1, 18));
  const d2 = tireDia(nonNeg(values.width2, 255), nonNeg(values.aspect2, 40), nonNeg(values.rim2, 18));
  const side = (nonNeg(values.width1, 245) * nonNeg(values.aspect1, 40)) / 100;

  return {
    diameterInches: round2(d1),
    diameterMm: Math.round(d1 * 25.4),
    sidewallMm: round2(side),
    circumferenceInches: round2(d1 * Math.PI),
    revsPerMile: Math.round(63360 / (d1 * Math.PI)),
    secondTireDiameter: round2(d2),
    differencePercent: d1 > 0 ? round2(((d2 - d1) / d1) * 100) : 0,
  };
};

// --- 7. Speedometer ---------------------------------------------------------
export const speedometerCalculator: CustomCalculator = (values) => {
  const oldD = tireDia(nonNeg(values.oldWidth, 225), nonNeg(values.oldAspect, 45), nonNeg(values.oldRim, 17));
  const newD = tireDia(nonNeg(values.newWidth, 245), nonNeg(values.newAspect, 45), nonNeg(values.newRim, 17));
  const shown = nonNeg(values.indicatedSpeed, 60);
  const actual = oldD > 0 ? shown * (newD / oldD) : 0;

  return { actualSpeed: round2(actual), errorPercent: oldD > 0 ? round2((newD / oldD - 1) * 100) : 0, oldDiameter: round2(oldD), newDiameter: round2(newD), odometerMilesPer100: round2(oldD > 0 ? (100 * newD) / oldD : 0) };
};

// --- 8. Wheel Offset --------------------------------------------------------
export const wheelOffsetCalculator: CustomCalculator = (values) => {
  const w1 = nonNeg(values.oldWidth, 8) * 25.4;
  const o1 = safeNumber(values.oldOffset, 45);
  const w2 = nonNeg(values.newWidth, 9) * 25.4;
  const o2 = safeNumber(values.newOffset, 35);
  // Positive = moves out toward the fender / in toward the suspension.
  const poke = (w2 - w1) / 2 - (o2 - o1);
  const inner = (w2 - w1) / 2 + (o2 - o1);
  // Backspacing ≈ half the overall width (rim + ~1 in of flanges) + offset.
  const back = (w: number, o: number) => (w / 25.4 + 1) / 2 + o / 25.4;

  return { outerPokeChangeMm: round2(poke), innerClearanceChangeMm: round2(inner), oldBackspacingIn: round2(back(w1, o1)), newBackspacingIn: round2(back(w2, o2)) };
};

// --- 9. Top Speed -----------------------------------------------------------
export const topSpeedCalculator: CustomCalculator = (values) => {
  const hp = nonNeg(values.horsepower, 400);
  const eta = 1 - Math.min(40, nonNeg(values.drivetrainLossPercent, 15)) / 100;
  const cd = nonNeg(values.dragCoefficient, 0.32);
  const area = nonNeg(values.frontalAreaM2, 2.2);
  const kg = nonNeg(values.weightLb, 3500) * LB_KG;
  const crr = nonNeg(values.rollingResistance, 0.012);
  const rho = 1.225;
  const p = hp * HP_W * eta;
  // Solve 0.5 ρ CdA v³ + Crr m g v = P.
  let lo = 0;
  let hi = 200;
  for (let i = 0; i < 80; i++) {
    const v = (lo + hi) / 2;
    if (0.5 * rho * cd * area * v ** 3 + crr * kg * 9.81 * v > p) hi = v;
    else lo = v;
  }
  const dragMph = lo * 2.23694;
  const gear = nonNeg(values.topGearRatio, 0);
  const gearMph = gear > 0 ? (nonNeg(values.redline, 7000) * nonNeg(values.tireDiameter, 27)) / (gear * nonNeg(values.finalDrive, 3.42) * MPH_RPM) : Infinity;
  const top = Math.min(dragMph, gearMph);

  return { topSpeedMph: round2(top), topSpeedKmh: round2(top * 1.609344), dragLimitedMph: round2(dragMph), gearingLimitedMph: Number.isFinite(gearMph) ? round2(gearMph) : 0, limitedByGearing: gearMph < dragMph ? 1 : 0 };
};

// --- 10. 0–60 Time ----------------------------------------------------------
// Share of peak power usable on average during a launch (shifts, traction).
const LAUNCH: Record<number, number> = { 1: 0.45, 2: 0.5, 3: 0.55 };

export const zeroToSixtyCalculator: CustomCalculator = (values) => {
  const hp = Math.max(1, nonNeg(values.horsepower, 300));
  const lb = Math.max(100, nonNeg(values.weightLb, 3500));
  const eff = LAUNCH[whole(values.drivetrain, 2)] ?? 0.5;
  const mu = Math.min(1.6, nonNeg(values.tireGrip, 1));
  const v = 26.8224; // 60 mph in m/s
  const kg = lb * LB_KG;
  const powerTime = (0.5 * kg * v * v) / (hp * HP_W * eff);
  // Traction limit: a 2WD car only puts about half its weight on the driven wheels.
  const driven = whole(values.drivetrain, 2) === 3 ? 1 : 0.55;
  const tractionTime = v / (mu * 9.81 * driven * 1.4);
  const t = Math.max(powerTime, tractionTime) + 0.3;

  return { zeroToSixtySeconds: round2(t), zeroToHundredKmhSeconds: round2(t * 1.04), poundsPerHorsepower: round2(lb / hp), limitedByTraction: tractionTime > powerTime ? 1 : 0 };
};

// --- 11. Quarter Mile (ET & HP) ---------------------------------------------
export const quarterMileCalculator: CustomCalculator = (values) => {
  const lb = Math.max(100, nonNeg(values.weightLb, 3500));
  const hp = Math.max(1, nonNeg(values.horsepower, 400));
  const et = nonNeg(values.etSeconds, 12.5);
  const mph = nonNeg(values.trapMph, 110);

  return {
    estimatedEt: round2(5.825 * Math.cbrt(lb / hp)),
    estimatedTrapMph: round2(234 * Math.cbrt(hp / lb)),
    horsepowerFromEt: et > 0 ? Math.round(lb / Math.pow(et / 5.825, 3)) : 0,
    horsepowerFromTrap: Math.round(lb * Math.pow(mph / 234, 3)),
    eighthMileEt: round2((5.825 * Math.cbrt(lb / hp)) / 1.5832),
  };
};

export const motorsportPowerGearingCustomCalculators: Record<string, CustomCalculator> = {
  "torque-to-horsepower-calculator": torqueToHorsepowerCalculator,
  "wheel-horsepower-calculator": wheelHorsepowerCalculator,
  "engine-rpm-calculator": engineRpmCalculator,
  "torque-converter-calculator": torqueConverterCalculator,
  "final-drive-ratio-calculator": finalDriveRatioCalculator,
  "tire-diameter-calculator": tireDiameterCalculator,
  "speedometer-calculator": speedometerCalculator,
  "wheel-offset-calculator": wheelOffsetCalculator,
  "top-speed-calculator": topSpeedCalculator,
  "0-60-time-calculator": zeroToSixtyCalculator,
  "quarter-mile-calculator": quarterMileCalculator,
};
