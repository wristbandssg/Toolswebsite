/**
 * Batch: "Sports Calculators" > Cycling Calculators, sub-batch B (Gearing,
 * Wheels, Tires & Bike, 12 tools). See calc-engine-cycling-fit.ts for the
 * full list of 4 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bikeGearRatioCalculator: ratio, gear inches, development and gain
 *    ratio, plus the chainring for a target gear (also BMX gear and
 *    chainring calculators).
 *  - bicycleGearSpeedCalculator: speed at a cadence and the cadence for a
 *    speed (also the bike cadence calculator).
 *  - bikeChainLengthCalculator: chain links from chainstay and gears.
 *  - spokeLengthCalculator: spoke length for a wheel build.
 *  - bicycleTireSizeCalculator: ETRTO size → diameter and circumference.
 *  - bikeTirePressureCalculator: front/rear pressure from load and width.
 *  - tireWidthCalculator: tire ↔ inner rim width match (also rim width).
 *  - tireVolumeCalculator: air volume of a tire and a comparison size.
 *  - tireClearanceCalculator: widest tire a frame gap allows.
 *  - tubelessSealantCalculator: sealant per tire.
 *  - bikeWeightCalculator: system weight and climbing time saved.
 *  - bikeValueCalculator: used bike resale value.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-cycling-equipment-calculators.ts for the copy.
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
const G = 9.81;

// Wheel/tire circumference (mm) by common size.
const CIRC: Record<number, number> = { 1: 2096, 2: 2105, 3: 2136, 4: 2155, 5: 2200, 6: 2068, 7: 2180, 8: 2300, 9: 1515, 10: 1272 };
/** Circumference in mm: a custom value (if > 0) or the chosen size. */
const circumference = (v: Record<string, number>) => nonNeg(v.customCircumferenceMm, 0) || CIRC[whole(v.wheelSize, 2)] || 2105;

// --- 1. Bike Gear Ratio (and BMX gear, chainring) ---------------------------
export const bikeGearRatioCalculator: CustomCalculator = (values) => {
  const ring = Math.max(1, nonNeg(values.chainring, 50));
  const cog = Math.max(1, nonNeg(values.cog, 17));
  const circ = circumference(values);
  const crank = Math.max(1, nonNeg(values.crankLengthMm, 172.5));
  const ratio = ring / cog;
  const diaIn = circ / Math.PI / 25.4;
  const target = nonNeg(values.targetGearInches, 0);

  return {
    gearRatio: round2(ratio),
    gearInches: round2(ratio * diaIn),
    developmentM: round2((ratio * circ) / 1000),
    gainRatio: round2((ratio * (circ / Math.PI / 2)) / crank),
    chainringForTarget: target > 0 ? Math.round((target * cog) / diaIn) : 0,
  };
};

// --- 2. Bicycle Gear Speed (and cadence) ------------------------------------
export const bicycleGearSpeedCalculator: CustomCalculator = (values) => {
  const dev = (nonNeg(values.chainring, 50) / Math.max(1, nonNeg(values.cog, 17))) * (circumference(values) / 1000); // m per crank turn
  const cadence = nonNeg(values.cadence, 90);
  const kmh = (dev * cadence * 60) / 1000;
  const target = nonNeg(values.targetSpeedKmh, 40);

  return { speedKmh: round2(kmh), speedMph: round2(kmh / 1.609344), cadenceForTargetSpeed: dev > 0 ? round2((target * 1000) / 60 / dev) : 0, developmentM: round2(dev) };
};

// --- 3. Bike Chain Length ---------------------------------------------------
export const bikeChainLengthCalculator: CustomCalculator = (values) => {
  const cs = nonNeg(values.chainstayMm, 410) / 25.4;
  const ring = nonNeg(values.largestChainring, 50);
  const cog = nonNeg(values.largestCog, 32);
  // Classic formula: L (in) = 2C + (F + R) ÷ 4 + 1.
  const inches = 2 * cs + (ring + cog) / 4 + 1;
  // Half-inch pitch, rounded up to whole inches (an even link count).
  const links = Math.ceil(inches) * 2;

  return { chainLinks: links, chainLengthIn: round2(links / 2), exactLengthIn: round2(inches) };
};

// --- 4. Spoke Length (wheel build) ------------------------------------------
export const spokeLengthCalculator: CustomCalculator = (values) => {
  const r1 = nonNeg(values.erdMm, 601) / 2;
  const r2 = nonNeg(values.flangeDiameterMm, 45) / 2;
  const d = nonNeg(values.flangeOffsetMm, 35);
  const n = Math.max(4, whole(values.spokeCount, 28));
  const cross = whole(values.crosses, 2);
  const hole = nonNeg(values.spokeHoleMm, 2.6);
  const angle = ((720 * cross) / n) * (Math.PI / 180);
  const len = Math.sqrt(d * d + r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(angle)) - hole / 2;

  return { spokeLengthMm: round2(len), orderLengthMm: Math.floor(len / 2) * 2, spokesPerSide: n / 2 };
};

// --- 5. Bicycle Tire Size ---------------------------------------------------
export const bicycleTireSizeCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.tireWidthMm, 25);
  const bsd = nonNeg(values.beadSeatMm, 622);
  // The tire's height is roughly equal to its width.
  const dia = bsd + 2 * w;

  return { outerDiameterMm: Math.round(dia), outerDiameterIn: round2(dia / 25.4), circumferenceMm: Math.round(dia * Math.PI), widthInches: round2(w / 25.4) };
};

// --- 6. Bike Tire Pressure --------------------------------------------------
export const bikeTirePressureCalculator: CustomCalculator = (values) => {
  const kg = nonNeg(values.riderWeight, 72) * (whole(values.weightUnit, 1) === 2 ? 0.45359237 : 1) + nonNeg(values.bikeWeightKg, 8);
  const w = Math.max(18, nonNeg(values.tireWidthMm, 28));
  const front = Math.min(60, nonNeg(values.frontLoadPercent, 45)) / 100;
  const surface = ({ 1: 1, 2: 0.92, 3: 0.85 } as Record<number, number>)[whole(values.surface, 1)] ?? 1;
  const tubeless = whole(values.tubeless, 0) === 1 ? 0.95 : 1;
  const lb = kg * 2.20462;
  // Load-based model: psi ≈ 101.3 × wheel load (lb) ÷ width^1.463 (fitted to
  // common 15%-tire-drop recommendations).
  const psi = (load: number) => Math.min(130, (101.3 * load) / w ** 1.463) * surface * tubeless;
  const f = psi(lb * front);
  const r = psi(lb * (1 - front));

  return { frontPsi: round2(f), rearPsi: round2(r), frontBar: round2(f * 0.0689476), rearBar: round2(r * 0.0689476), systemWeightKg: round2(kg) };
};

// --- 7. Tire Width (and rim width) ------------------------------------------
const TIRE_RIM: Record<number, number> = { 1: 1.35, 2: 1.65, 3: 2.0 }; // ideal tire ÷ inner rim

export const tireWidthCalculator: CustomCalculator = (values) => {
  const rim = nonNeg(values.innerRimWidthMm, 21);
  const tire = nonNeg(values.tireWidthMm, 28);
  const k = TIRE_RIM[whole(values.bikeType, 1)] ?? 1.35;
  const ideal = rim * k;

  return { idealTireMm: round2(ideal), minTireMm: round2(ideal * 0.8), maxTireMm: round2(ideal * 1.3), idealRimForTireMm: round2(tire / k), tireToRimRatio: rim > 0 ? round2(tire / rim) : 0 };
};

// --- 8. Tire Volume ---------------------------------------------------------
/** Air volume (litres): torus with ~75% of a circular cross-section (rim fills the rest). */
const vol = (w: number, bsd: number) => (0.75 * Math.PI * (w / 2) ** 2 * Math.PI * (bsd + w)) / 1e6;

export const tireVolumeCalculator: CustomCalculator = (values) => {
  const bsd = nonNeg(values.beadSeatMm, 622);
  const v1 = vol(nonNeg(values.tireWidthMm, 28), bsd);
  const v2 = vol(nonNeg(values.compareWidthMm, 32), bsd);

  return { volumeLitres: round2(v1), volumeCubicInches: Math.round(v1 * 61.0237), compareVolumeLitres: round2(v2), volumeChangePercent: v1 > 0 ? round2((v2 / v1 - 1) * 100) : 0 };
};

// --- 9. Tire Clearance ------------------------------------------------------
export const tireClearanceCalculator: CustomCalculator = (values) => {
  const gap = nonNeg(values.frameGapMm, 40);
  const side = nonNeg(values.sideClearanceMm, 6);
  const rim = nonNeg(values.innerRimWidthMm, 21);
  const actual = Math.max(0, gap - 2 * side);
  // Tires measure about 0.4 mm wider per mm of rim beyond 19 mm internal.
  const nominal = Math.max(0, actual - (rim - 19) * 0.4);

  return { maxActualTireMm: round2(actual), maxLabelledTireMm: round2(nominal), clearancePerSideMm: side };
};

// --- 10. Tubeless Sealant ---------------------------------------------------
export const tubelessSealantCalculator: CustomCalculator = (values) => {
  const w = nonNeg(values.tireWidthMm, 40);
  const bsd = nonNeg(values.beadSeatMm, 622);
  const extra = whole(values.conditions, 1) === 2 ? 1.25 : 1;
  const ml = 0.0022 * w * (bsd + w) * extra;

  return { sealantPerTireMl: Math.round(ml), sealantPerTireOz: round2(ml / 29.5735), sealantBothTiresMl: Math.round(ml * 2), topUpMonths: whole(values.climate, 2) === 1 ? 2 : whole(values.climate, 2) === 3 ? 6 : 4 };
};

// --- 11. Bike Weight (system weight and climbing) ---------------------------
/** Climbing speed (m/s) for a power, mass and gradient. */
function climbSpeed(watts: number, kg: number, grade: number): number {
  const th = Math.atan(grade);
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    const need = (kg * G * (Math.sin(th) + 0.005 * Math.cos(th)) * v + 0.5 * 1.225 * 0.4 * v ** 3) / 0.975;
    if (need > watts) hi = v;
    else lo = v;
  }
  return lo;
}

export const bikeWeightCalculator: CustomCalculator = (values) => {
  const bike = nonNeg(values.bikeWeightKg, 9);
  const rider = nonNeg(values.riderWeightKg, 75);
  const gear = nonNeg(values.gearWeightKg, 1);
  const save = nonNeg(values.weightSavingKg, 1);
  const dist = nonNeg(values.climbKm, 10) * 1000;
  const grade = nonNeg(values.gradientPercent, 7) / 100;
  const w = nonNeg(values.powerWatts, 250);
  const total = bike + rider + gear;
  const t1 = dist / Math.max(0.01, climbSpeed(w, total, grade));
  const t2 = dist / Math.max(0.01, climbSpeed(w, Math.max(1, total - save), grade));

  return { systemWeightKg: round2(total), bikeShareOfSystemPercent: total > 0 ? round2((bike / total) * 100) : 0, climbTimeMinutes: round2(t1 / 60), newClimbTimeMinutes: round2(t2 / 60), secondsSaved: round2(t1 - t2) };
};

// --- 12. Bike Value ---------------------------------------------------------
// [first-year loss, yearly loss after] by bike type.
const DEPR: Record<number, number[]> = { 1: [0.3, 0.1], 2: [0.35, 0.12], 3: [0.35, 0.15], 4: [0.4, 0.1] };
const CONDITION: Record<number, number> = { 1: 1, 2: 0.85, 3: 0.65, 4: 0.45 };

export const bikeValueCalculator: CustomCalculator = (values) => {
  const price = nonNeg(values.purchasePrice, 2000);
  const age = nonNeg(values.ageYears, 3);
  const [first, yearly] = DEPR[whole(values.bikeType, 1)] ?? DEPR[1];
  const cond = CONDITION[whole(values.condition, 2)] ?? 0.85;
  const ageFactor = age <= 0 ? 1 : age < 1 ? 1 - first * age : (1 - first) * (1 - yearly) ** (age - 1);
  const value = Math.max(price * 0.1, price * ageFactor * cond + nonNeg(values.upgradesValue, 0) * 0.5);

  return { estimatedValue: round2(value), quickSalePrice: round2(value * 0.85), valueRetainedPercent: price > 0 ? round2((value / price) * 100) : 0 };
};

export const cyclingEquipmentCustomCalculators: Record<string, CustomCalculator> = {
  "bike-gear-ratio-calculator": bikeGearRatioCalculator,
  "bicycle-gear-speed-calculator": bicycleGearSpeedCalculator,
  "bike-chain-length-calculator": bikeChainLengthCalculator,
  "spoke-length-calculator": spokeLengthCalculator,
  "bicycle-tire-size-calculator": bicycleTireSizeCalculator,
  "bike-tire-pressure-calculator": bikeTirePressureCalculator,
  "tire-width-calculator": tireWidthCalculator,
  "tire-volume-calculator": tireVolumeCalculator,
  "tire-clearance-calculator": tireClearanceCalculator,
  "tubeless-sealant-calculator": tubelessSealantCalculator,
  "bike-weight-calculator": bikeWeightCalculator,
  "bike-value-calculator": bikeValueCalculator,
};
