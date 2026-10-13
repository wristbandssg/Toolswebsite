/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-swim-dive (swimming & scuba, 12 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Merged: swimming calculator -> swim pace (pace, speed and predicted
 * times).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - swimPaceCalculator: pace per 100 from a swim and predicted times;
 *    swimSplitCalculator: target splits (even or negative) for a race;
 *    criticalSwimSpeedCalculator: threshold pace from a 400/200 test;
 *    swimTimeConversionCalculator: SCY / SCM / LCM course conversion;
 *    swimDistanceCalculator: laps and pool length -> distance.
 *  - swimCalorieCalculator vs waterWalkingCaloriesBurnedCalculator:
 *    swimming strokes vs walking / aerobics in the pool.
 *  - scubaWeightCalculator, sacRateCalculator, nitroxCalculator: lead,
 *    air consumption and enriched-air limits.
 *  - swimsuitSizeCalculator vs wetsuitSizeCalculator: swimwear size vs
 *    wetsuit size and thickness.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-swim-dive-calculators.ts for the copy.
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
/** Weight: unit 1 = lb, 2 = kg -> kg. */
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);
const timeSec = (values: Record<string, number>, mKey = "minutes", sKey = "seconds", dm = 0, ds = 0) => nonNeg(values[mKey], dm) * 60 + nonNeg(values[sKey], ds);

// --- 1. Swim pace (incl. general swimming calculator) ---------------------------------
export const swimPaceCalculator: CustomCalculator = (values) => {
  const dist = Math.max(1, nonNeg(values.distance, 1500));
  const sec = timeSec(values, "minutes", "seconds", 30, 0);
  const per100 = (sec / dist) * 100;
  const target = Math.max(1, nonNeg(values.predictDistance, 400));
  const predicted = sec * Math.pow(target / dist, 1.06);

  return {
    pacePer100Sec: round2(per100),
    pacePer100Min: round2(per100 / 60),
    speedKmh: round2(div(dist / 1000, sec / 3600)),
    predictedTimeMin: round2(predicted / 60),
    predictedTimeSec: round2(predicted),
  };
};

// --- 2. Swim splits -------------------------------------------------------------------------
export const swimSplitCalculator: CustomCalculator = (values) => {
  const dist = Math.max(25, nonNeg(values.distance, 400));
  const total = timeSec(values, "minutes", "seconds", 6, 0);
  const neg = clamp(nonNeg(values.negativeSplitPct, 0), 0, 20) / 100;
  // second half faster by neg × half time
  const halfEven = total / 2;
  const first = halfEven * (1 + neg / 2);
  const second = total - first;
  const split = Math.max(25, nonNeg(values.splitLength, 100));

  return { evenSplitSec: round2((total / dist) * split), firstHalfSec: round2(first), secondHalfSec: round2(second), firstHalfSplitSec: round2((first / (dist / 2)) * split), secondHalfSplitSec: round2((second / (dist / 2)) * split) };
};

// --- 3. Swim time conversion (SCY / SCM / LCM) -----------------------------------------------------
// Factors relative to a short-course-yards time over the same nominal distance.
const COURSE_FACTOR: Record<number, number> = { 1: 1, 2: 1.1, 3: 1.12 };

export const swimTimeConversionCalculator: CustomCalculator = (values) => {
  const sec = timeSec(values, "minutes", "seconds", 1, 0);
  const from = COURSE_FACTOR[whole(values.fromCourse, 1)] ?? 1;
  const scy = sec / from;

  return { scySec: round2(scy), scmSec: round2(scy * COURSE_FACTOR[2]), lcmSec: round2(scy * COURSE_FACTOR[3]), lcmMin: round2((scy * COURSE_FACTOR[3]) / 60) };
};

// --- 4. Critical swim speed -----------------------------------------------------------------------
export const criticalSwimSpeedCalculator: CustomCalculator = (values) => {
  const t400 = timeSec(values, "minutes400", "seconds400", 6, 0);
  const t200 = timeSec(values, "minutes200", "seconds200", 2, 50);
  const cssPer100 = Math.max(0, (t400 - t200) / 2);

  return { cssPer100Sec: round2(cssPer100), cssSpeedMs: round2(div(100, cssPer100)), endurancePer100Sec: round2(cssPer100 + 8), thresholdSetPer100Sec: round2(cssPer100 + 2), speedSetPer100Sec: round2(cssPer100 - 4) };
};

// --- 5. Swim calories -------------------------------------------------------------------------------
const SWIM_MET: Record<number, number> = { 1: 5.8, 2: 8.3, 3: 9.8, 4: 4.8, 5: 9.5, 6: 5.3, 7: 10.3, 8: 13.8, 9: 3.5 };

export const swimCalorieCalculator: CustomCalculator = (values) => {
  const met = SWIM_MET[whole(values.stroke, 2)] ?? 8.3;
  const kg = kgOf(nonNeg(values.weight, 160), values.weightUnit);
  const hours = nonNeg(values.minutes, 30) / 60;
  const kcal = met * kg * hours;

  return { calories: Math.round(kcal), caloriesPerHour: Math.round(met * kg), met };
};

// --- 6. Swim distance (laps) ---------------------------------------------------------------------------
export const swimDistanceCalculator: CustomCalculator = (values) => {
  const poolLen = Math.max(5, nonNeg(values.poolLength, 25));
  const yards = whole(values.poolUnit, 1) === 2;
  const lengths = nonNeg(values.lengths, 64);
  const metres = lengths * poolLen * (yards ? 0.9144 : 1);

  return {
    distanceMetres: round2(metres),
    distanceYards: round2(metres / 0.9144),
    distanceMiles: round2(metres / 1609.344),
    lengthsForAMile: Math.ceil((yards ? 1650 : 1609.344) / poolLen),
    lapsRoundTrip: round2(lengths / 2),
  };
};

// --- 7. Scuba weight -------------------------------------------------------------------------------------
const SUIT_PCT: Record<number, number> = { 1: 0, 2: 5, 3: 8, 4: 10, 5: 12 };

export const scubaWeightCalculator: CustomCalculator = (values) => {
  const lb = nonNeg(values.bodyWeight, 180) * (whole(values.unit, 1) === 2 ? 2.20462 : 1);
  const suit = whole(values.suit, 3);
  let lead = (lb * (SUIT_PCT[suit] ?? 8)) / 100 + (suit === 1 ? 2 : 0);
  if (whole(values.water, 1) === 2) lead -= lb * 0.025; // fresh water is less buoyant
  const tank = whole(values.tank, 1);
  lead += tank === 1 ? 4 : tank === 2 ? -2 : 0; // aluminium 80 turns positive; steel is negative
  lead += whole(values.buoyancy, 2) === 1 ? -2 : whole(values.buoyancy, 2) === 3 ? 2 : 0;
  const out = Math.max(0, lead);

  return { leadLb: Math.round(out), leadKg: round2(out * 0.45359237), pctOfBodyWeight: round2(div(out, lb) * 100) };
};

// --- 8. SAC rate -------------------------------------------------------------------------------------------
export const sacRateCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const used = Math.max(0, nonNeg(values.startPressure, 3000) - nonNeg(values.endPressure, 1000));
  const minutes = Math.max(1, nonNeg(values.minutes, 40));
  const depth = nonNeg(values.averageDepth, 40);
  const ata = metric ? depth / 10 + 1 : depth / 33 + 1;
  const sac = used / minutes / ata;
  // Tank: imperial = cu ft at working pressure (psi); metric = water volume (L), pressure in bar.
  const rmv = metric ? sac * nonNeg(values.tankSize, 12) : sac * div(nonNeg(values.tankSize, 80), nonNeg(values.workingPressure, 3000));
  const planAta = metric ? nonNeg(values.planDepth, 18) / 10 + 1 : nonNeg(values.planDepth, 60) / 33 + 1;
  const gasAvailable = metric ? nonNeg(values.tankSize, 12) * (nonNeg(values.startPressure, 200) - 50) : nonNeg(values.tankSize, 80) * div(nonNeg(values.startPressure, 3000) - 500, nonNeg(values.workingPressure, 3000));

  return { sacRate: round2(sac), rmv: round2(rmv), rmvLitresPerMin: round2(metric ? rmv : rmv * 28.3168), airTimeAtPlanDepthMin: Math.round(div(gasAvailable, rmv * planAta)) };
};

// --- 9. Nitrox (MOD, EAD, best mix) ------------------------------------------------------------------------------
export const nitroxCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const atmDepth = metric ? 10 : 33;
  const fo2 = clamp(nonNeg(values.oxygenPct, 32), 21, 100) / 100;
  const po2 = clamp(nonNeg(values.ppo2Limit, 1.4), 1, 1.6);
  const depth = nonNeg(values.plannedDepth, 100);

  return {
    maxOperatingDepth: round2((po2 / fo2 - 1) * atmDepth),
    contingencyMod: round2((1.6 / fo2 - 1) * atmDepth),
    equivalentAirDepth: round2(Math.max(0, ((depth + atmDepth) * (1 - fo2)) / 0.79 - atmDepth)),
    bestMixPct: round2(Math.min(100, (po2 / (depth / atmDepth + 1)) * 100)),
    ppo2AtPlannedDepth: round2(fo2 * (depth / atmDepth + 1)),
  };
};

// --- 10. Swimsuit size --------------------------------------------------------------------------------------------
const WOMEN_US = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const WOMEN_BUST = [32, 33, 34, 35, 36, 37, 38.5, 40, 41.5, 43.5, 45.5, 47.5];
const WOMEN_HIP = [35, 36, 37, 38, 39, 40, 41.5, 43, 44.5, 46.5, 48.5, 50.5];

export const swimsuitSizeCalculator: CustomCalculator = (values) => {
  const toIn = whole(values.unit, 1) === 2 ? 1 / 2.54 : 1;
  if (whole(values.gender, 1) === 2) {
    const waist = nonNeg(values.waist, 32) * toIn;
    const letter = waist < 29 ? 1 : waist < 32 ? 2 : waist < 35 ? 3 : waist < 38 ? 4 : waist < 41 ? 5 : 6;
    return { usSize: Math.round(waist), letterSize: letter, ukSize: Math.round(waist), euSize: Math.round(waist) + 14 };
  }
  const bust = nonNeg(values.bust, 36) * toIn;
  const hip = nonNeg(values.hip, 39) * toIn;
  const idx = (arr: number[], v: number) => {
    const i = arr.findIndex((x) => v <= x + 0.5);
    return i < 0 ? arr.length - 1 : i;
  };
  const i = Math.max(idx(WOMEN_BUST, bust), idx(WOMEN_HIP, hip));
  const us = WOMEN_US[i];

  return { usSize: us, letterSize: us <= 2 ? 1 : us <= 6 ? 2 : us <= 10 ? 3 : us <= 14 ? 4 : us <= 18 ? 5 : 6, ukSize: us + 4, euSize: us + 30 };
};

// --- 11. Wetsuit size & thickness ----------------------------------------------------------------------------------
// [height in, weight lb] centres; codes in the order listed in the copy.
const MEN_WS: [number, number][] = [[66.5, 140], [69.5, 160], [72.5, 165], [71, 180], [73.5, 185], [73.5, 200], [74.5, 220]];
const WOMEN_WS: [number, number][] = [[62.5, 108], [64.5, 118], [65.5, 128], [66.5, 138], [67.5, 148], [68.5, 158]];

export const wetsuitSizeCalculator: CustomCalculator = (values) => {
  const metric = whole(values.unit, 1) === 2;
  const h = nonNeg(values.height, 70) / (metric ? 2.54 : 1);
  const w = nonNeg(values.weight, 170) * (metric ? 2.20462 : 1);
  const table = whole(values.gender, 1) === 2 ? WOMEN_WS : MEN_WS;
  let best = 0;
  let bestD = Infinity;
  table.forEach(([th, tw], i) => {
    const d = Math.hypot((h - th) / 2, (w - tw) / 12);
    if (d < bestD) { bestD = d; best = i; }
  });
  const tF = nonNeg(values.waterTempF, 60) * (whole(values.tempUnit, 1) === 2 ? 1.8 : 1) + (whole(values.tempUnit, 1) === 2 ? 32 : 0);
  const thickness = tF > 72 ? 1 : tF >= 64 ? 2 : tF >= 58 ? 3 : tF >= 52 ? 4 : tF >= 43 ? 5 : 6;

  return { sizeCode: best + 1, thicknessCode: thickness, fitScore: round2(Math.max(0, 100 - bestD * 25)) };
};

// --- 12. Water walking calories -----------------------------------------------------------------------------------------
const WATER_MET: Record<number, number> = { 1: 2.5, 2: 4.5, 3: 6.8, 4: 5.5, 5: 9.8 };

export const waterWalkingCaloriesBurnedCalculator: CustomCalculator = (values) => {
  const met = WATER_MET[whole(values.activity, 2)] ?? 4.5;
  const kg = kgOf(nonNeg(values.weight, 170), values.weightUnit);
  const hours = nonNeg(values.minutes, 45) / 60;

  return { calories: Math.round(met * kg * hours), caloriesPerHour: Math.round(met * kg), landWalkingEquivalent: Math.round(3.5 * kg * hours), met };
};

export const otherSwimDiveCustomCalculators: Record<string, CustomCalculator> = {
  "swim-pace-calculator": swimPaceCalculator,
  "swim-split-calculator": swimSplitCalculator,
  "swim-time-conversion-calculator": swimTimeConversionCalculator,
  "critical-swim-speed-calculator": criticalSwimSpeedCalculator,
  "swim-calorie-calculator": swimCalorieCalculator,
  "swim-distance-calculator": swimDistanceCalculator,
  "scuba-weight-calculator": scubaWeightCalculator,
  "sac-rate-calculator": sacRateCalculator,
  "nitrox-calculator": nitroxCalculator,
  "swimsuit-size-calculator": swimsuitSizeCalculator,
  "wetsuit-size-calculator": wetsuitSizeCalculator,
  "water-walking-calories-burned-calculator": waterWalkingCaloriesBurnedCalculator,
};
