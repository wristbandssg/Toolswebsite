/**
 * Batch: "Sports Calculators" > Cycling Calculators, sub-batch C (Power &
 * Training, 9 tools). See calc-engine-cycling-fit.ts for the full list of
 * 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - ftpCalculator: FTP from a 20-min, 8-min, ramp or 60-min test.
 *  - powerZoneCalculator: Coggan power zones from FTP.
 *  - wattsPerKiloCalculator: W/kg and the rider level it suggests.
 *  - criticalPowerCalculator: CP and W′ from two maximal efforts (also the
 *    W prime calculator).
 *  - peakPowerCalculator: estimated power-duration profile from FTP.
 *  - trainingStressScoreCalculator: TSS, IF and VI (also the intensity
 *    factor calculator).
 *  - cyclingVo2MaxCalculator: VO2 max from maximal aerobic power.
 *  - cdaCalculator: aerodynamic drag area from a steady ride.
 *  - idealCyclingWeightCalculator: weight for a W/kg target, with a
 *    healthy-weight floor.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-cycling-power-calculators.ts for the copy.
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
/** Body weight: unit 1 = kg, 2 = lb → kg. */
const kg = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * 0.45359237 : v);

// --- 1. FTP -----------------------------------------------------------------
const FTP_FACTOR: Record<number, number> = { 1: 0.95, 2: 0.9, 3: 0.75, 4: 1 };

export const ftpCalculator: CustomCalculator = (values) => {
  const p = nonNeg(values.testPower, 280);
  const ftp = p * (FTP_FACTOR[whole(values.testType, 1)] ?? 0.95);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);

  return { ftpWatts: Math.round(ftp), wattsPerKg: round2(div(ftp, w)), sweetSpotLow: Math.round(ftp * 0.88), sweetSpotHigh: Math.round(ftp * 0.94) };
};

// --- 2. Power Zones (Coggan) ------------------------------------------------
export const powerZoneCalculator: CustomCalculator = (values) => {
  const ftp = nonNeg(values.ftp, 250);
  const z = (p: number) => Math.round(ftp * p);

  return { z1RecoveryMax: z(0.55), z2EnduranceMax: z(0.75), z3TempoMax: z(0.9), z4ThresholdMax: z(1.05), z5Vo2MaxMax: z(1.2), z6AnaerobicMax: z(1.5), sweetSpotLow: z(0.88), sweetSpotHigh: z(0.94) };
};

// --- 3. Watts per Kilo ------------------------------------------------------
// FTP W/kg level thresholds (men); women ≈ 85%. 1 untrained … 7 world class.
const WKG_LEVELS = [2.5, 3.0, 3.5, 4.0, 4.6, 5.1];

export const wattsPerKiloCalculator: CustomCalculator = (values) => {
  const p = nonNeg(values.power, 250);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const wkg = div(p, w);
  const scale = whole(values.gender, 1) === 2 ? 0.85 : 1;
  const level = WKG_LEVELS.filter((t) => wkg >= t * scale).length + 1;

  return { wattsPerKg: round2(wkg), riderLevel: level, wattsFor4Wkg: Math.round(4 * w), weightFor4WkgKg: round2(p / 4) };
};

// --- 4. Critical Power and W′ -----------------------------------------------
export const criticalPowerCalculator: CustomCalculator = (values) => {
  const p1 = nonNeg(values.shortPower, 400);
  const t1 = nonNeg(values.shortMinutes, 3) * 60;
  const p2 = nonNeg(values.longPower, 300);
  const t2 = nonNeg(values.longMinutes, 12) * 60;
  // Two-parameter model: work = CP × t + W′.
  const cp = t2 !== t1 ? (p2 * t2 - p1 * t1) / (t2 - t1) : 0;
  const wPrime = Math.max(0, (p1 - cp) * t1);
  const target = nonNeg(values.targetPower, 350);

  return { criticalPowerWatts: round2(cp), wPrimeKj: round2(wPrime / 1000), timeToExhaustionSeconds: target > cp ? Math.round(wPrime / (target - cp)) : 0, cpAsFtpEstimate: Math.round(cp * 0.95) };
};

// --- 5. Peak Power (power profile) ------------------------------------------
// Typical multiples of FTP by rider type: [5 s, 1 min, 5 min, 20 min].
const PROFILE: Record<number, number[]> = { 1: [3.6, 1.9, 1.2, 1.05], 2: [4.3, 2.2, 1.22, 1.05], 3: [3.2, 1.75, 1.18, 1.05] };

export const peakPowerCalculator: CustomCalculator = (values) => {
  const ftp = nonNeg(values.ftp, 250);
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const [s5, m1, m5, m20] = PROFILE[whole(values.riderType, 1)] ?? PROFILE[1];

  return { peak5sWatts: Math.round(ftp * s5), peak1minWatts: Math.round(ftp * m1), peak5minWatts: Math.round(ftp * m5), peak20minWatts: Math.round(ftp * m20), peak5sWkg: round2(div(ftp * s5, w)) };
};

// --- 6. Training Stress Score (and intensity factor) ------------------------
export const trainingStressScoreCalculator: CustomCalculator = (values) => {
  const sec = nonNeg(values.hours, 2) * 3600 + nonNeg(values.minutes, 0) * 60;
  const np = nonNeg(values.normalizedPower, 220);
  const ftp = nonNeg(values.ftp, 250);
  const avg = nonNeg(values.averagePower, 200);
  const IF = div(np, ftp);
  const tss = div(sec * np * IF, ftp * 3600) * 100;

  return { tss: Math.round(tss), intensityFactor: round2(IF), variabilityIndex: round2(div(np, avg)), workKj: Math.round((avg * sec) / 1000), recoveryLevel: tss < 150 ? 1 : tss < 300 ? 2 : tss < 450 ? 3 : 4 };
};

// --- 7. Cycling VO2 Max -----------------------------------------------------
export const cyclingVo2MaxCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 70), values.weightUnit);
  const p = nonNeg(values.power, 320);
  // Power from a 5-min max effort, or FTP ÷ 0.8 when FTP is entered.
  const map = whole(values.powerType, 1) === 2 ? p / 0.8 : p;
  const vo2 = w > 0 ? (10.8 * map) / w + 7 : 0;

  return { vo2Max: round2(vo2), vo2MaxLitresPerMin: round2((vo2 * w) / 1000), maximalAerobicPowerWatts: Math.round(map) };
};

// --- 8. CdA -----------------------------------------------------------------
export const cdaCalculator: CustomCalculator = (values) => {
  const p = nonNeg(values.power, 200);
  const v = nonNeg(values.speedKmh, 32) / 3.6;
  const m = nonNeg(values.totalMassKg, 80);
  const crr = nonNeg(values.crr, 0.004);
  const grade = safeNumber(values.gradientPercent, 0) / 100;
  const rho = Math.max(0.5, nonNeg(values.airDensity, 1.225));
  const eff = Math.min(1, nonNeg(values.drivetrainEfficiency, 97.5) / 100);
  const th = Math.atan(grade);
  const rolling = crr * m * 9.81 * Math.cos(th) * v;
  const gravity = m * 9.81 * Math.sin(th) * v;
  const aero = p * eff - rolling - gravity;
  const cda = v > 0 ? aero / (0.5 * rho * v ** 3) : 0;
  const v40 = 40 / 3.6;

  return { cda: Math.round(cda * 1000) / 1000, aeroWatts: round2(aero), rollingWatts: round2(rolling), powerFor40KmhWatts: Math.round((0.5 * rho * Math.max(0, cda) * v40 ** 3 + crr * m * 9.81 * v40) / eff) };
};

// --- 9. Ideal Cycling Weight ------------------------------------------------
export const idealCyclingWeightCalculator: CustomCalculator = (values) => {
  const w = kg(nonNeg(values.weight, 75), values.weightUnit);
  const ftp = nonNeg(values.ftp, 250);
  const target = Math.max(0.5, nonNeg(values.targetWkg, 4));
  const hM = nonNeg(values.heightCm, 175) / 100;
  const needed = ftp / target;
  const floor = 20 * hM * hM; // BMI 20

  return { weightForTargetKg: round2(needed), weightChangeKg: round2(needed - w), powerForTargetAtCurrentWeight: Math.round(target * w), healthyMinimumKg: round2(floor), belowHealthyMinimum: needed < floor ? 1 : 0 };
};

export const cyclingPowerCustomCalculators: Record<string, CustomCalculator> = {
  "ftp-calculator": ftpCalculator,
  "power-zone-calculator": powerZoneCalculator,
  "watts-per-kilo-calculator": wattsPerKiloCalculator,
  "critical-power-calculator": criticalPowerCalculator,
  "peak-power-calculator": peakPowerCalculator,
  "training-stress-score-calculator": trainingStressScoreCalculator,
  "cycling-vo2-max-calculator": cyclingVo2MaxCalculator,
  "cda-calculator": cdaCalculator,
  "ideal-cycling-weight-calculator": idealCyclingWeightCalculator,
};
