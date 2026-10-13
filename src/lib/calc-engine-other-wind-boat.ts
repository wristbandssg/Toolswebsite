/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-wind-boat (kitesurf, wing foil, boating, fishing & tides, 7 tools).
 * See calc-engine-other-football.ts for the full list of other-* batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - kiteSizeCalculator vs wingSizeCalculator: kitesurf kite vs handheld
 *    foil wing for the rider weight and wind.
 *  - boatSpeedCalculator vs boatFuelCalculator: how fast vs how much fuel.
 *  - jetSkiValueCalculator: used PWC value.
 *  - fishingLineCalculator: reel capacity for a different line.
 *  - tideCalculator: tide height at a time between low and high water.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-wind-boat-calculators.ts for the copy.
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
const kgOf = (v: number, unit: number) => (whole(unit, 1) === 2 ? v : v * 0.45359237);
/** Wind: unit 1 = knots, 2 = mph, 3 = km/h -> knots. */
const knots = (v: number, unit: number) => (whole(unit, 1) === 2 ? v / 1.15078 : whole(unit, 1) === 3 ? v / 1.852 : v);

// --- 1. Kite size (kitesurfing) ---------------------------------------------------
export const kiteSizeCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 175), values.weightUnit);
  const kn = Math.max(5, knots(nonNeg(values.windSpeed, 18), values.windUnit));
  const board = whole(values.board, 1); // 1 twin-tip, 2 big / light-wind board, 3 foil
  const factor = board === 3 ? 1.2 : 2.2;
  const size = (kg / kn) * factor * (board === 2 ? 0.85 : 1);

  return { kiteSizeM2: round2(size), nearestStandardSize: clamp(Math.round(size), 3, 21), windKnots: round2(kn), twinTipLengthCm: Math.round(clamp(128 + (kg - 60) * 0.4 + (kn < 15 ? 6 : 0), 128, 165)) };
};

// --- 2. Wing size (wing foiling) ----------------------------------------------------
export const wingSizeCalculator: CustomCalculator = (values) => {
  const kg = kgOf(nonNeg(values.weight, 175), values.weightUnit);
  const kn = Math.max(5, knots(nonNeg(values.windSpeed, 18), values.windUnit));
  const skill = whole(values.skill, 2);
  const size = (kg / kn) * (skill === 1 ? 1.15 : skill === 3 ? 0.9 : 1);
  const boardL = kg + (skill === 1 ? 40 : skill === 2 ? 20 : 0);

  return { wingSizeM2: round2(size), nearestStandardSize: clamp(Math.round(size * 2) / 2, 2, 8), boardVolumeLitres: Math.round(boardL), windKnots: round2(kn) };
};

// --- 3. Boat speed (hull speed or Crouch planing formula) -------------------------------
const CROUCH: Record<number, number> = { 1: 150, 2: 190, 3: 210, 4: 130 };

export const boatSpeedCalculator: CustomCalculator = (values) => {
  if (whole(values.method, 1) === 1) {
    const kn = 1.34 * Math.sqrt(nonNeg(values.waterlineLength, 30));
    return { speedKnots: round2(kn), speedMph: round2(kn * 1.15078), speedKmh: round2(kn * 1.852) };
  }
  const lbPerHp = div(nonNeg(values.boatWeight, 3000), nonNeg(values.horsepower, 150));
  const mph = div(CROUCH[whole(values.hullType, 1)] ?? 150, Math.sqrt(lbPerHp));
  return { speedKnots: round2(mph / 1.15078), speedMph: round2(mph), speedKmh: round2(mph * 1.609344) };
};

// --- 4. Boat fuel ---------------------------------------------------------------------------
export const boatFuelCalculator: CustomCalculator = (values) => {
  const diesel = whole(values.engine, 1) === 2;
  const hp = nonNeg(values.horsepower, 150);
  const gph = (hp * (diesel ? 0.055 : 0.1) * clamp(nonNeg(values.throttlePct, 60), 5, 100)) / 100;
  const speed = Math.max(0.5, nonNeg(values.cruiseSpeed, 25));
  const trip = nonNeg(values.tripDistance, 40);
  const tripGal = div(trip, speed) * gph;
  const tank = nonNeg(values.tankGallons, 50);

  return {
    gallonsPerHour: round2(gph),
    tripGallons: round2(tripGal),
    carryWithReserve: round2(tripGal * 1.5),
    tripCost: round2(tripGal * nonNeg(values.fuelPrice, 4.5)),
    rangeOnTankMiles: round2(div(tank, gph) * speed * (2 / 3)),
    milesPerGallon: round2(div(speed, gph)),
  };
};

// --- 5. Jet ski (PWC) value -----------------------------------------------------------------
const PWC_CONDITION: Record<number, number> = { 1: 1.05, 2: 1, 3: 0.85, 4: 0.65 };

export const jetSkiValueCalculator: CustomCalculator = (values) => {
  const msrp = nonNeg(values.originalPrice, 15000);
  const age = nonNeg(values.ageYears, 4);
  const hours = nonNeg(values.engineHours, 200);
  const ageFactor = age <= 0 ? 1 : 0.82 * Math.pow(0.9, age - 1);
  const expected = Math.max(1, age) * 50;
  const hourFactor = clamp(1 - ((hours - expected) / 100) * 0.04, 0.6, 1.1);
  const value = msrp * ageFactor * hourFactor * (PWC_CONDITION[whole(values.condition, 2)] ?? 1) + nonNeg(values.trailerValue, 0);

  return { privateSaleValue: Math.round(value / 10) * 10, tradeInValue: Math.round((value * 0.8) / 10) * 10, percentOfOriginal: round2(div(value, msrp) * 100) };
};

// --- 6. Fishing line capacity ------------------------------------------------------------------
// Approximate monofilament diameter (mm) by lb test; braid ≈ 45% of the mono diameter.
const MONO_MM: [number, number][] = [[2, 0.15], [4, 0.2], [6, 0.23], [8, 0.26], [10, 0.28], [12, 0.3], [15, 0.33], [20, 0.38], [25, 0.43], [30, 0.48], [40, 0.55], [50, 0.62], [80, 0.8]];
function lineDia(lb: number, type: number): number {
  let d = MONO_MM[MONO_MM.length - 1][1];
  for (let i = 0; i < MONO_MM.length; i++) {
    if (lb <= MONO_MM[i][0]) {
      d = i === 0 ? MONO_MM[0][1] : MONO_MM[i - 1][1] + ((lb - MONO_MM[i - 1][0]) / (MONO_MM[i][0] - MONO_MM[i - 1][0])) * (MONO_MM[i][1] - MONO_MM[i - 1][1]);
      break;
    }
  }
  return type === 2 ? d * 0.45 : type === 3 ? d * 0.95 : d;
}

export const fishingLineCalculator: CustomCalculator = (values) => {
  const rated = nonNeg(values.ratedYards, 200);
  const d1 = lineDia(nonNeg(values.ratedLb, 10), 1);
  const d2 = lineDia(nonNeg(values.newLb, 20), whole(values.newType, 2));
  const capacity = rated * Math.pow(div(d1, d2), 2);
  const topShot = nonNeg(values.topShotYards, 0);

  return {
    newCapacityYards: Math.round(capacity),
    newCapacityMetres: Math.round(capacity * 0.9144),
    newLineDiameterMm: round2(d2),
    backingYardsNeeded: topShot > 0 ? Math.max(0, Math.round((capacity - topShot) * Math.pow(d2 / d1, 2))) : 0,
  };
};

// --- 7. Tide height --------------------------------------------------------------------------------
export const tideCalculator: CustomCalculator = (values) => {
  const tLow = num(values.lowTime, 6);
  let tHigh = num(values.highTime, 12.25);
  if (tHigh <= tLow) tHigh += 24;
  const hLow = num(values.lowHeight, 0.5);
  const hHigh = num(values.highHeight, 4.5);
  let t = num(values.queryTime, 9);
  if (t < tLow) t += 24;
  const dur = tHigh - tLow;
  const frac = clamp((t - tLow) / dur, 0, 1);
  const range = hHigh - hLow;
  const height = hLow + (range * (1 - Math.cos(Math.PI * frac))) / 2;
  const twelfths = [0, 1, 3, 6, 9, 11, 12];
  const pos = frac * 6;
  const i = Math.min(5, Math.floor(pos));
  const twelfthHeight = hLow + (range / 12) * (twelfths[i] + (twelfths[i + 1] - twelfths[i]) * (pos - i));

  return { tideHeight: round2(height), ruleOfTwelfthsHeight: round2(twelfthHeight), tidalRange: round2(Math.abs(range)), riseRatePerHour: round2(((range * Math.PI) / (2 * dur)) * Math.sin(Math.PI * frac)) };
};

export const otherWindBoatCustomCalculators: Record<string, CustomCalculator> = {
  "kite-size-calculator": kiteSizeCalculator,
  "wing-size-calculator": wingSizeCalculator,
  "boat-speed-calculator": boatSpeedCalculator,
  "boat-fuel-calculator": boatFuelCalculator,
  "jet-ski-value-calculator": jetSkiValueCalculator,
  "fishing-line-calculator": fishingLineCalculator,
  "tide-calculator": tideCalculator,
};
