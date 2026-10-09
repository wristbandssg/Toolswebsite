/**
 * Batch: "Sports Calculators" > Motorsports & Racing Calculators, sub-batch
 * E (Series Points, Motorcycles, Karts & RC, 10 tools). See
 * calc-engine-motorsport-engine.ts for the full list of 5 sub-batches.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - f1PointsCalculator: Grand Prix + sprint points (2025 rules) and whether
 *    the title is still mathematically possible.
 *  - nascarPointsCalculator: NASCAR Cup race + stage points and playoff
 *    points.
 *  - motorcycleSprocketCalculator: sprocket/gear ratio change → RPM and top
 *    speed (also motorcycle and dirt bike gear ratio).
 *  - motorcycleChainLengthCalculator: chain links for a sprocket pair.
 *  - motorcycleSuspensionCalculator: race and static sag → preload and
 *    spring verdict (also motocross spring rate).
 *  - motorcycleSeatHeightCalculator: can you flat-foot this seat height?
 *  - dirtBikeSizeCalculator: bike size by rider height and experience.
 *  - goKartGearRatioCalculator: kart ratio and top speed (also go kart speed).
 *  - jackshaftGearRatioCalculator: two-stage (jackshaft) drive ratio and speed.
 *  - rcCarGearRatioCalculator: RC final drive ratio and top speed.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-motorsport-moto-series-calculators.ts for the copy.
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
/** Speed (mph) from wheel RPM and tyre diameter in inches. */
const mphFrom = (wheelRpm: number, diaIn: number) => (wheelRpm * Math.PI * diaIn * 60) / 63360;

// --- 1. F1 Points (2025 rules) ----------------------------------------------
const F1_RACE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const F1_SPRINT = [8, 7, 6, 5, 4, 3, 2, 1];

export const f1PointsCalculator: CustomCalculator = (values) => {
  const race = whole(values.racePosition, 1);
  const sprint = whole(values.sprintPosition, 0);
  const racePts = race >= 1 && race <= 10 ? F1_RACE[race - 1] : 0;
  const sprintPts = sprint >= 1 && sprint <= 8 ? F1_SPRINT[sprint - 1] : 0;
  const gap = nonNeg(values.gapToLeader, 40);
  const left = whole(values.racesRemaining, 4);
  const sprintsLeft = whole(values.sprintsRemaining, 1);
  const maxLeft = left * 25 + sprintsLeft * 8;

  return {
    weekendPoints: racePts + sprintPts,
    racePoints: racePts,
    sprintPoints: sprintPts,
    maxPointsRemaining: maxLeft,
    titleStillPossible: maxLeft >= gap ? 1 : 0,
    racesNeededToCloseGap: gap > 0 ? Math.ceil(gap / 7) : 0, // winning while the leader is 2nd closes 7 points a race
  };
};

// --- 2. NASCAR Points (Cup Series) ------------------------------------------
function nascarFinish(pos: number): number {
  if (pos < 1) return 0;
  if (pos === 1) return 40;
  if (pos <= 36) return 37 - pos; // 2nd 35, 3rd 34 … 36th 1
  return 1; // 37th–40th
}
const stagePts = (pos: number) => (pos >= 1 && pos <= 10 ? 11 - pos : 0);

export const nascarPointsCalculator: CustomCalculator = (values) => {
  const fin = whole(values.finishPosition, 5);
  const s1 = whole(values.stage1Position, 3);
  const s2 = whole(values.stage2Position, 2);
  const s3 = whole(values.stage3Position, 0);
  const race = nascarFinish(fin);
  const stages = stagePts(s1) + stagePts(s2) + stagePts(s3);
  const playoff = (fin === 1 ? 5 : 0) + [s1, s2, s3].filter((p) => p === 1).length;

  return { totalPoints: race + stages, finishPoints: race, stagePoints: stages, playoffPoints: playoff, maxPossible: 40 + 10 * (s3 > 0 ? 3 : 2) };
};

// --- 3. Motorcycle Sprocket (gear ratio) ------------------------------------
export const motorcycleSprocketCalculator: CustomCalculator = (values) => {
  const f1 = Math.max(1, whole(values.frontOld, 15));
  const r1 = Math.max(1, whole(values.rearOld, 45));
  const f2 = Math.max(1, whole(values.frontNew, 14));
  const r2 = Math.max(1, whole(values.rearNew, 45));
  const old = r1 / f1;
  const neu = r2 / f2;
  const primary = Math.max(0.1, nonNeg(values.primaryRatio, 1.6));
  const top = Math.max(0.1, nonNeg(values.topGearRatio, 1));
  const redline = nonNeg(values.redline, 11000);
  const dia = Math.max(1, nonNeg(values.tireDiameter, 25));
  const speed = (ratio: number) => mphFrom(redline / (primary * top * ratio), dia);

  return {
    newRatio: round2(neu),
    oldRatio: round2(old),
    ratioChangePercent: round2((neu / old - 1) * 100),
    topSpeedOldMph: round2(speed(old)),
    topSpeedNewMph: round2(speed(neu)),
    // Rule of thumb: 1 front tooth ≈ 3 rear teeth.
    equivalentRearTeethChange: round2(neu * f1 - r1),
  };
};

// --- 4. Motorcycle Chain Length ---------------------------------------------
const PITCH: Record<number, number> = { 1: 0.5, 2: 0.625, 3: 0.75 }; // 420/428, 520/525/530, 630

export const motorcycleChainLengthCalculator: CustomCalculator = (values) => {
  const t1 = Math.max(1, whole(values.frontTeeth, 15));
  const t2 = Math.max(1, whole(values.rearTeeth, 45));
  const p = PITCH[whole(values.chainSize, 2)] ?? 0.625;
  const c = Math.max(1, nonNeg(values.centerDistanceIn, 22) * (whole(values.unit, 1) === 2 ? 1 / 25.4 : 1));
  const links = (2 * c) / p + (t1 + t2) / 2 + (p * (t2 - t1) ** 2) / (4 * Math.PI ** 2 * c);
  const even = Math.ceil(links / 2) * 2;

  return { linksNeeded: even, exactLinks: round2(links), chainLengthIn: round2(even * p), pitchIn: p };
};

// --- 5. Motorcycle Suspension (sag and spring) ------------------------------
// Target race sag as % of rear wheel travel: motocross/enduro 33%, street 30%, track 25%.
const SAG_TARGET: Record<number, number> = { 1: 0.33, 2: 0.3, 3: 0.25 };

export const motorcycleSuspensionCalculator: CustomCalculator = (values) => {
  const travel = Math.max(1, nonNeg(values.wheelTravelMm, 310));
  const free = nonNeg(values.unloadedMm, 600); // top-out measurement (wheel off the ground)
  const bike = nonNeg(values.bikeOnlyMm, 570); // on its wheels, no rider
  const rider = nonNeg(values.withRiderMm, 495); // rider in gear, standing position
  const target = (SAG_TARGET[whole(values.bikeType, 1)] ?? 0.33) * travel;
  const race = free - rider;
  const statik = free - bike;
  const lr = Math.max(0.5, nonNeg(values.linkageRatio, 3));
  // Spring verdict at correct race sag: free (static) sag 25–40 mm off-road.
  const verdict = statik < 25 ? 1 : statik > 40 ? 3 : 2; // 1 too soft, 2 OK, 3 too stiff

  return {
    raceSagMm: round2(race),
    staticSagMm: round2(statik),
    targetRaceSagMm: round2(target),
    preloadChangeAtShockMm: round2((race - target) / lr), // + = add preload
    springVerdict: verdict,
  };
};

// --- 6. Motorcycle Seat Height ----------------------------------------------
export const motorcycleSeatHeightCalculator: CustomCalculator = (values) => {
  const toIn = whole(values.unit, 1) === 2 ? 1 / 2.54 : 1;
  const inseam = nonNeg(values.inseam, 31) * toIn;
  const seat = nonNeg(values.seatHeight, 32) * toIn;
  const width = ({ 1: 0.5, 2: 1.5, 3: 2.5 } as Record<number, number>)[whole(values.seatWidth, 2)] ?? 1.5;
  // A wide seat spreads the legs, costing inseam reach.
  const effective = seat + width;
  const margin = inseam - effective;
  const out = (x: number) => round2(x / toIn);

  return {
    marginToGround: out(margin),
    // 1 both feet flat, 2 balls of both feet, 3 tiptoes / one foot, 4 too tall.
    fit: margin >= 0 ? 1 : margin >= -1.5 ? 2 : margin >= -3 ? 3 : 4,
    maxSeatForFlatFeet: out(inseam - width),
    lowerByToFlatFoot: out(Math.max(0, -margin)),
  };
};

// --- 7. Dirt Bike Size ------------------------------------------------------
// Rider height bands (in) → [cc low, cc high, seat low, seat high]
const DIRT: [number, number[]][] = [
  [51, [50, 50, 18, 22]],
  [59, [65, 110, 22, 28]],
  [63, [85, 150, 28, 33]],
  [68, [125, 250, 33, 37]],
  [Infinity, [250, 450, 36, 39]],
];

export const dirtBikeSizeCalculator: CustomCalculator = (values) => {
  const h = nonNeg(values.heightIn, 66) * (whole(values.unit, 1) === 2 ? 1 / 2.54 : 1);
  const exp = whole(values.experience, 1); // 1 beginner, 2 intermediate, 3 experienced
  const row = DIRT.find(([max]) => h < max)?.[1] ?? DIRT[DIRT.length - 1][1];
  const cc = exp === 1 ? row[0] : exp === 2 ? Math.round((row[0] + row[1]) / 2 / 5) * 5 : row[1];

  return { recommendedCc: cc, ccRangeLow: row[0], ccRangeHigh: row[1], seatHeightLowIn: row[2], seatHeightHighIn: row[3] };
};

// --- 8. Go Kart Gear Ratio (and speed) --------------------------------------
export const goKartGearRatioCalculator: CustomCalculator = (values) => {
  const driver = Math.max(1, whole(values.driverTeeth, 12));
  const axle = Math.max(1, whole(values.axleTeeth, 60));
  const rpm = nonNeg(values.maxRpm, 3600);
  const dia = Math.max(1, nonNeg(values.tireDiameter, 11));
  const ratio = axle / driver;
  const mph = mphFrom(rpm / ratio, dia);

  return { gearRatio: round2(ratio), topSpeedMph: round2(mph), topSpeedKmh: round2(mph * 1.609344), axleRpm: Math.round(rpm / ratio) };
};

// --- 9. Jackshaft Gear Ratio ------------------------------------------------
export const jackshaftGearRatioCalculator: CustomCalculator = (values) => {
  const eng = Math.max(1, whole(values.engineTeeth, 10));
  const jIn = Math.max(1, whole(values.jackshaftInTeeth, 20));
  const jOut = Math.max(1, whole(values.jackshaftOutTeeth, 12));
  const axle = Math.max(1, whole(values.axleTeeth, 60));
  const ratio = (jIn / eng) * (axle / jOut);
  const rpm = nonNeg(values.maxRpm, 4000);
  const mph = mphFrom(rpm / ratio, Math.max(1, nonNeg(values.tireDiameter, 13)));

  return { totalRatio: round2(ratio), firstStageRatio: round2(jIn / eng), secondStageRatio: round2(axle / jOut), topSpeedMph: round2(mph), topSpeedKmh: round2(mph * 1.609344) };
};

// --- 10. RC Car Gear Ratio --------------------------------------------------
export const rcCarGearRatioCalculator: CustomCalculator = (values) => {
  const pinion = Math.max(1, whole(values.pinion, 18));
  const spur = Math.max(1, whole(values.spur, 87));
  const internal = Math.max(0.1, nonNeg(values.internalRatio, 2.6));
  const fdr = (spur / pinion) * internal;
  const kv = nonNeg(values.motorKv, 3500);
  const volts = nonNeg(values.batteryVolts, 7.4);
  const dia = Math.max(0.1, nonNeg(values.tireDiameterMm, 110)) / 25.4;
  // About 85% of the no-load motor RPM is reached in practice.
  const mph = mphFrom((kv * volts * 0.85) / fdr, dia);

  return { finalDriveRatio: round2(fdr), topSpeedMph: round2(mph), topSpeedKmh: round2(mph * 1.609344), motorRpm: Math.round(kv * volts) };
};

export const motorsportMotoSeriesCustomCalculators: Record<string, CustomCalculator> = {
  "f1-points-calculator": f1PointsCalculator,
  "nascar-points-calculator": nascarPointsCalculator,
  "motorcycle-sprocket-calculator": motorcycleSprocketCalculator,
  "motorcycle-chain-length-calculator": motorcycleChainLengthCalculator,
  "motorcycle-suspension-calculator": motorcycleSuspensionCalculator,
  "motorcycle-seat-height-calculator": motorcycleSeatHeightCalculator,
  "dirt-bike-size-calculator": dirtBikeSizeCalculator,
  "go-kart-gear-ratio-calculator": goKartGearRatioCalculator,
  "jackshaft-gear-ratio-calculator": jackshaftGearRatioCalculator,
  "rc-car-gear-ratio-calculator": rcCarGearRatioCalculator,
};
