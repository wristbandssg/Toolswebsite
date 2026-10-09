/**
 * Batch: "Sports Calculators" > Motorsports & Racing Calculators, sub-batch
 * A (Engine, Fuel & Forced Induction, 12 tools). The 55-tool motorsport list
 * is built across 5 sub-batches:
 *   calc-engine-motorsport-engine.ts (12)
 *   calc-engine-motorsport-power-gearing.ts (11)
 *   calc-engine-motorsport-dynamics.ts (11)
 *   calc-engine-motorsport-chassis-fuel.ts (11)
 *   calc-engine-motorsport-moto-series.ts (10)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - compressionRatioCalculator: static CR from chamber, piston, gasket and
 *    deck volumes, plus dynamic CR from intake valve closing.
 *  - engineDisplacementCalculator: bore × stroke × cylinders.
 *  - pistonSpeedCalculator / rodRatioCalculator: bottom-end stress checks.
 *  - camTimingCalculator: duration, lobe centres, LSA and overlap from
 *    valve events.
 *  - carburetorCfmCalculator / injectorSizeCalculator / fuelPumpCalculator:
 *    sizing air and fuel delivery for a power target.
 *  - airFuelRatioCalculator: AFR ↔ lambda for any fuel.
 *  - turboSizeCalculator: compressor airflow and pressure ratio.
 *  - boostToHorsepowerCalculator: power from boost (also the boost
 *    calculator — absolute pressure and pressure ratio).
 *  - superchargerPulleyCalculator: blower speed and boost from pulley sizes.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-motorsport-engine-calculators.ts for the copy.
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
const ATM = 14.7; // psi at sea level
/** Lengths in inches (unit 1) or mm (unit 2) → inches. */
const inch = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 25.4 : v);
const CC_PER_CI = 16.387064;

// --- 1. Compression Ratio ---------------------------------------------------
export const compressionRatioCalculator: CustomCalculator = (values) => {
  const u = values.unit;
  const bore = inch(nonNeg(values.bore, 4.03), u);
  const stroke = inch(nonNeg(values.stroke, 3.48), u);
  const gasketBore = inch(nonNeg(values.gasketBore, 4.1), u);
  const gasketThk = inch(nonNeg(values.gasketThickness, 0.04), u);
  const deck = inch(safeNumber(values.deckClearance, 0.005), u);
  const area = (d: number) => (Math.PI / 4) * d * d;
  const swept = area(bore) * stroke * CC_PER_CI;
  // Dish adds volume (+), a dome removes it (enter domes as negative).
  const clearance = nonNeg(values.chamberCc, 64) + safeNumber(values.pistonCc, 5) + area(gasketBore) * gasketThk * CC_PER_CI + area(bore) * deck * CC_PER_CI;
  const cr = clearance > 0 ? (swept + clearance) / clearance : 0;
  // Dynamic CR: only the stroke left after the intake valve closes counts.
  const rod = inch(nonNeg(values.rodLength, 6.1), u);
  const ivc = Math.min(120, nonNeg(values.ivcAbdc, 60));
  const r = stroke / 2;
  const th = ((180 - ivc) * Math.PI) / 180;
  const fromTdc = r + rod - (r * Math.cos(th) + Math.sqrt(Math.max(0, rod * rod - r * r * Math.sin(th) ** 2)));
  const dynSwept = area(bore) * fromTdc * CC_PER_CI;

  return {
    staticCompressionRatio: round2(cr),
    dynamicCompressionRatio: clearance > 0 ? round2((dynSwept + clearance) / clearance) : 0,
    sweptVolumeCc: round2(swept),
    clearanceVolumeCc: round2(clearance),
    effectiveStroke: round2(whole(u, 1) === 2 ? fromTdc * 25.4 : fromTdc),
  };
};

// --- 2. Engine Displacement -------------------------------------------------
export const engineDisplacementCalculator: CustomCalculator = (values) => {
  const u = values.unit;
  const bore = inch(nonNeg(values.bore, 4), u);
  const stroke = inch(nonNeg(values.stroke, 3.48), u);
  const cyl = Math.max(1, whole(values.cylinders, 8));
  const ci = (Math.PI / 4) * bore * bore * stroke * cyl;

  return { cubicInches: round2(ci), cc: Math.round(ci * CC_PER_CI), liters: round2((ci * CC_PER_CI) / 1000), perCylinderCc: Math.round((ci * CC_PER_CI) / cyl), boreStrokeRatio: stroke > 0 ? round2(bore / stroke) : 0 };
};

// --- 3. Piston Speed --------------------------------------------------------
export const pistonSpeedCalculator: CustomCalculator = (values) => {
  const stroke = inch(nonNeg(values.stroke, 3.48), values.unit);
  const rpm = nonNeg(values.rpm, 6500);
  const fpm = (2 * stroke * rpm) / 12;

  return {
    meanPistonSpeedFpm: Math.round(fpm),
    meanPistonSpeedMs: round2(fpm * 0.00508),
    // 1 street (<3,500 fpm), 2 performance (<4,500), 3 race (<5,500), 4 extreme.
    stressLevel: fpm < 3500 ? 1 : fpm < 4500 ? 2 : fpm < 5500 ? 3 : 4,
    rpmAt4500Fpm: stroke > 0 ? Math.round((4500 * 12) / (2 * stroke)) : 0,
  };
};

// --- 4. Rod Ratio -----------------------------------------------------------
export const rodRatioCalculator: CustomCalculator = (values) => {
  const rod = inch(nonNeg(values.rodLength, 5.7), values.unit);
  const stroke = Math.max(0.01, inch(nonNeg(values.stroke, 3.48), values.unit));
  const ratio = rod / stroke;
  const angle = (Math.asin(Math.min(1, stroke / 2 / Math.max(rod, 0.01))) * 180) / Math.PI;

  return { rodRatio: round2(ratio), maxRodAngleDegrees: round2(angle), rodLengthForRatio175: round2(stroke * 1.75) };
};

// --- 5. Cam Timing ----------------------------------------------------------
export const camTimingCalculator: CustomCalculator = (values) => {
  const io = safeNumber(values.intakeOpenBtdc, 26);
  const ic = safeNumber(values.intakeCloseAbdc, 62);
  const eo = safeNumber(values.exhaustOpenBbdc, 70);
  const ec = safeNumber(values.exhaustCloseAtdc, 26);
  const icl = (ic - io + 180) / 2;
  const ecl = (eo - ec + 180) / 2;

  return {
    intakeDuration: round2(io + ic + 180),
    exhaustDuration: round2(eo + ec + 180),
    intakeCenterlineAtdc: round2(icl),
    exhaustCenterlineBtdc: round2(ecl),
    lobeSeparationAngle: round2((icl + ecl) / 2),
    overlapDegrees: round2(io + ec),
  };
};

// --- 6. Carburetor CFM ------------------------------------------------------
export const carburetorCfmCalculator: CustomCalculator = (values) => {
  const ci = nonNeg(values.cubicInches, 350);
  const rpm = nonNeg(values.maxRpm, 6000);
  const ve = Math.min(130, nonNeg(values.volumetricEfficiency, 85)) / 100;
  const cfm = ((ci * rpm) / 3456) * ve;

  return { requiredCfm: Math.round(cfm), cfmAt100Ve: Math.round((ci * rpm) / 3456), nearestCommonSize: [390, 450, 500, 600, 650, 700, 750, 800, 850, 950, 1050].find((s) => s >= cfm) ?? 1050 };
};

// --- 7. Injector Size -------------------------------------------------------
// Brake-specific fuel consumption (lb/hp/hr) by setup.
const BSFC: Record<number, number> = { 1: 0.5, 2: 0.6, 3: 0.65, 4: 0.7, 5: 0.8 };
const E85_FACTOR = 1.4;

export const injectorSizeCalculator: CustomCalculator = (values) => {
  const hp = nonNeg(values.horsepower, 500);
  const bsfc = (BSFC[whole(values.setup, 2)] ?? 0.6) * (whole(values.fuel, 1) === 2 ? E85_FACTOR : 1);
  const n = Math.max(1, whole(values.injectors, 8));
  const dc = Math.min(100, nonNeg(values.dutyCycle, 80)) / 100;
  const lbhr = (hp * bsfc) / (n * dc);

  return { injectorLbHr: round2(lbhr), injectorCcMin: Math.round(lbhr * 10.5), totalFuelLbHr: round2(hp * bsfc), bsfcUsed: round2(bsfc) };
};

// --- 8. Fuel Pump -----------------------------------------------------------
export const fuelPumpCalculator: CustomCalculator = (values) => {
  const hp = nonNeg(values.horsepower, 500);
  const e85 = whole(values.fuel, 1) === 2;
  const bsfc = (BSFC[whole(values.setup, 2)] ?? 0.6) * (e85 ? E85_FACTOR : 1);
  const lbhr = hp * bsfc;
  const lbPerGal = e85 ? 6.57 : 6.07;
  const margin = 1 + Math.min(100, nonNeg(values.safetyMarginPercent, 20)) / 100;
  const gph = (lbhr / lbPerGal) * margin;

  return { requiredLph: Math.round(gph * 3.78541), requiredGph: round2(gph), fuelFlowLbHr: round2(lbhr), lbHrWithMargin: round2(lbhr * margin) };
};

// --- 9. Air Fuel Ratio ------------------------------------------------------
const STOICH: Record<number, number> = { 1: 14.7, 2: 14.1, 3: 9.765, 4: 9.0, 5: 6.4, 6: 14.5 };

export const airFuelRatioCalculator: CustomCalculator = (values) => {
  const stoich = STOICH[whole(values.fuel, 1)] ?? 14.7;
  const mode = whole(values.inputMode, 1); // 1 lambda, 2 gasoline-scale AFR, 3 actual AFR
  const v = nonNeg(values.value, 0.85);
  const lambda = mode === 1 ? v : mode === 2 ? v / 14.7 : v / stoich;

  return {
    lambda: Math.round(lambda * 1000) / 1000,
    actualAfr: round2(lambda * stoich),
    gasolineScaleAfr: round2(lambda * 14.7),
    stoichiometricAfr: stoich,
    // Negative = rich, positive = lean, vs stoichiometric.
    percentFromStoich: round2((lambda - 1) * 100),
  };
};

// --- 10. Turbo Size ---------------------------------------------------------
export const turboSizeCalculator: CustomCalculator = (values) => {
  const ci = nonNeg(values.cubicInches, 122);
  const rpm = nonNeg(values.rpm, 7000);
  const ve = Math.min(130, nonNeg(values.volumetricEfficiency, 90)) / 100;
  const boost = nonNeg(values.boostPsi, 18);
  const pr = (boost + ATM) / ATM;
  // Intake air temperature after the intercooler (°F) sets density.
  const iat = safeNumber(values.intakeTempF, 110);
  const densityRatio = (60 + 459.67) / (iat + 459.67);
  const cfm = ((ci * rpm) / 3456) * ve * pr * densityRatio;
  const lbmin = cfm * 0.0765;

  return {
    pressureRatio: round2(pr),
    airflowLbMin: round2(lbmin),
    airflowCfm: Math.round(cfm),
    // Rule of thumb: about 10 hp per lb/min of air.
    horsepowerSupported: Math.round(lbmin * 10),
  };
};

// --- 11. Boost to Horsepower (and boost) ------------------------------------
export const boostToHorsepowerCalculator: CustomCalculator = (values) => {
  const na = nonNeg(values.naHorsepower, 300);
  const boost = nonNeg(values.boostPsi, 8);
  // Efficiency: share of the theoretical gain realised (heat, losses).
  const eff = Math.min(100, nonNeg(values.efficiencyPercent, 85)) / 100;
  const pr = (boost + ATM) / ATM;
  const hp = na * (1 + (pr - 1) * eff);
  const target = nonNeg(values.targetHorsepower, 450);
  const boostNeeded = na > 0 ? Math.max(0, ((target / na - 1) / eff) * ATM) : 0;

  return { estimatedHorsepower: Math.round(hp), horsepowerGain: Math.round(hp - na), pressureRatio: round2(pr), absolutePressurePsi: round2(boost + ATM), boostForTargetPsi: round2(boostNeeded) };
};

// --- 12. Supercharger Pulley ------------------------------------------------
export const superchargerPulleyCalculator: CustomCalculator = (values) => {
  const crank = nonNeg(values.crankPulley, 7);
  const oldP = Math.max(0.1, nonNeg(values.currentPulley, 3.4));
  const newP = Math.max(0.1, nonNeg(values.newPulley, 3.1));
  const rpm = nonNeg(values.engineRpm, 6500);
  const stepUp = Math.max(1, nonNeg(values.internalStepUp, 1));
  const boost = nonNeg(values.currentBoost, 10);
  const centrifugal = whole(values.type, 1) === 2;
  const speedRatio = oldP / newP;
  // Positive displacement: boost (absolute) scales with speed; centrifugal: with speed².
  const newAbs = (boost + ATM) * (centrifugal ? speedRatio ** 2 : speedRatio);

  return {
    newBoostPsi: round2(newAbs - ATM),
    driveRatio: round2(crank / newP),
    blowerRpm: Math.round((rpm * crank * stepUp) / newP),
    blowerRpmBefore: Math.round((rpm * crank * stepUp) / oldP),
    speedIncreasePercent: round2((speedRatio - 1) * 100),
  };
};

export const motorsportEngineCustomCalculators: Record<string, CustomCalculator> = {
  "compression-ratio-calculator": compressionRatioCalculator,
  "engine-displacement-calculator": engineDisplacementCalculator,
  "piston-speed-calculator": pistonSpeedCalculator,
  "rod-ratio-calculator": rodRatioCalculator,
  "cam-timing-calculator": camTimingCalculator,
  "carburetor-cfm-calculator": carburetorCfmCalculator,
  "injector-size-calculator": injectorSizeCalculator,
  "fuel-pump-calculator": fuelPumpCalculator,
  "air-fuel-ratio-calculator": airFuelRatioCalculator,
  "turbo-size-calculator": turboSizeCalculator,
  "boost-to-horsepower-calculator": boostToHorsepowerCalculator,
  "supercharger-pulley-calculator": superchargerPulleyCalculator,
};
