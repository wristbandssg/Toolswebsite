/**
 * Batch: "Sports Calculators" > Cycling Calculators, sub-batch A (Bike
 * Sizing & Fit, 12 tools). The 47-tool cycling list is built across 4
 * sub-batches:
 *   calc-engine-cycling-fit.ts (12)
 *   calc-engine-cycling-equipment.ts (12)
 *   calc-engine-cycling-power.ts (9)
 *   calc-engine-cycling-ride.ts (14)
 *
 * Near-namesakes, and how each is deliberately different:
 *  - bikeFrameSizeCalculator: road/gravel (cm) or MTB (in) frame size and
 *    letter size (also mountain bike and gravel bike size).
 *  - kidsBikeSizeCalculator: wheel size by child height.
 *  - bikeFitCalculator: saddle height, setback, bar drop and reach starting
 *    points (also saddle setback).
 *  - bikeSeatHeightCalculator: saddle height by LeMond and 109% methods.
 *  - bikeSaddleSizeCalculator: saddle width from sit-bone width.
 *  - bikeStemCalculator: reach/stack change between two stems.
 *  - crankLengthCalculator: crank length for road, MTB or BMX.
 *  - mtbHandlebarWidthCalculator / mtbHandlebarHeightCalculator /
 *    mountainBikeReachCalculator: MTB cockpit sizing.
 *  - dropperPostCalculator: longest dropper that fits.
 *  - mtbSpringRateCalculator: coil spring rate and air starting pressure.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-cycling-fit-calculators.ts for the copy.
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
const IN_CM = 2.54;
/** Lengths: unit 1 = cm, 2 = inches → cm. */
const cm = (v: number, unit: number) => (whole(unit, 1) === 2 ? v * IN_CM : v);
const RAD = Math.PI / 180;

// --- 1. Bike Frame Size (road, gravel, MTB) ---------------------------------
export const bikeFrameSizeCalculator: CustomCalculator = (values) => {
  const u = values.unit;
  const h = cm(nonNeg(values.height, 175), u);
  const inseam = cm(nonNeg(values.inseam, 81), u);
  const type = whole(values.bikeType, 1); // 1 road, 2 gravel, 3 hybrid, 4 MTB
  // Seat-tube length as a share of inseam (MTB: inseam cm × 0.226 = inches).
  const factor = ({ 1: 0.665, 2: 0.655, 3: 0.66, 4: 0.574 } as Record<number, number>)[type] ?? 0.665;
  const sizeCm = inseam * factor;
  // Letter size by rider height: XS < 160, S < 170, M < 180, L < 190, XL.
  const letter = h < 160 ? 1 : h < 170 ? 2 : h < 180 ? 3 : h < 190 ? 4 : 5;

  return { frameSizeCm: Math.round(sizeCm), frameSizeIn: round2(sizeCm / IN_CM), letterSize: letter };
};

// --- 2. Kids Bike Size ------------------------------------------------------
// Child height (cm) upper bounds → wheel size (in), typical ages.
const KIDS: [number, number, number, number][] = [[100, 12, 2, 4], [110, 14, 3, 5], [120, 16, 4, 6], [135, 20, 6, 9], [145, 24, 8, 12], [Infinity, 26, 11, 14]];

export const kidsBikeSizeCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 120), values.unit);
  const row = KIDS.find(([max]) => h < max) ?? KIDS[KIDS.length - 1];
  const inseam = cm(nonNeg(values.inseam, 0), values.unit);

  return { wheelSizeIn: row[1], typicalAgeLow: row[2], typicalAgeHigh: row[3], maxSeatHeightCm: inseam > 0 ? Math.round(inseam) : 0 };
};

// --- 3. Bike Fit (and saddle setback) ---------------------------------------
export const bikeFitCalculator: CustomCalculator = (values) => {
  const u = values.unit;
  const h = cm(nonNeg(values.height, 175), u);
  const inseam = cm(nonNeg(values.inseam, 81), u);
  const flex = whole(values.flexibility, 2); // 1 low, 2 average, 3 high
  const torso = Math.max(0, h - inseam);

  return {
    saddleHeightCm: round2(inseam * 0.883),
    saddleSetbackCm: round2(inseam * 0.08),
    handlebarDropCm: ({ 1: 2, 2: 5, 3: 8 } as Record<number, number>)[flex] ?? 5,
    saddleToBarReachCm: round2(torso * 0.55 + (flex === 1 ? -2 : flex === 3 ? 2 : 0)),
  };
};

// --- 4. Bike Seat Height ----------------------------------------------------
export const bikeSeatHeightCalculator: CustomCalculator = (values) => {
  const inseam = cm(nonNeg(values.inseam, 81), values.unit);
  const crank = nonNeg(values.crankLengthMm, 172.5) / 10;
  const pedal = inseam * 1.09;

  return { lemondHeightCm: round2(inseam * 0.883), pedalToSaddleCm: round2(pedal), method109FromBbCm: round2(pedal - crank), lemondHeightIn: round2((inseam * 0.883) / IN_CM) };
};

// --- 5. Bike Saddle Size ----------------------------------------------------
const SADDLE_WIDTHS = [130, 135, 143, 145, 150, 155, 168];

export const bikeSaddleSizeCalculator: CustomCalculator = (values) => {
  const sit = nonNeg(values.sitBoneWidthMm, 120);
  const add = ({ 1: 20, 2: 25, 3: 35 } as Record<number, number>)[whole(values.position, 2)] ?? 25;
  const ideal = sit + add;
  const nearest = SADDLE_WIDTHS.reduce((a, b) => (Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a));

  return { idealSaddleWidthMm: ideal, nearestCommonWidthMm: nearest, rangeLowMm: ideal - 5, rangeHighMm: ideal + 5 };
};

// --- 6. Bike Stem -----------------------------------------------------------
/** Stem + spacers → [reach, stack] in mm relative to the top of the head tube. */
function stemXY(len: number, angle: number, spacers: number, hta: number): [number, number] {
  const phi = (angle + (90 - hta)) * RAD; // stem angle from horizontal
  const s = hta * RAD;
  return [len * Math.cos(phi) - spacers * Math.cos(s), len * Math.sin(phi) + spacers * Math.sin(s)];
}

export const bikeStemCalculator: CustomCalculator = (values) => {
  const hta = Math.min(80, Math.max(55, safeNumber(values.headTubeAngle, 73)));
  const [x1, y1] = stemXY(nonNeg(values.currentLength, 100), safeNumber(values.currentAngle, -6), nonNeg(values.currentSpacers, 20), hta);
  const [x2, y2] = stemXY(nonNeg(values.newLength, 110), safeNumber(values.newAngle, -17), nonNeg(values.newSpacers, 20), hta);

  return { reachChangeMm: round2(x2 - x1), stackChangeMm: round2(y2 - y1), newStemReachMm: round2(x2), newStemStackMm: round2(y2) };
};

// --- 7. Crank Length (road, MTB, BMX) ---------------------------------------
const roundCrank = (mm: number) => Math.round(mm / 2.5) * 2.5;

export const crankLengthCalculator: CustomCalculator = (values) => {
  const u = values.unit;
  const inseam = cm(nonNeg(values.inseam, 81), u);
  const h = cm(nonNeg(values.height, 175), u);
  const type = whole(values.discipline, 1); // 1 road, 2 MTB, 3 BMX
  const rule = inseam * 2.16; // 21.6% of inseam, in mm
  let crank: number;
  if (type === 3) crank = h < 130 ? 145 : h < 150 ? 155 : h < 165 ? 165 : h < 175 ? 170 : 175;
  else crank = Math.min(180, Math.max(150, roundCrank(rule) - (type === 2 ? 2.5 : 0)));

  return { crankLengthMm: crank, inseamRuleMm: round2(rule), inseamRuleRoundedMm: roundCrank(rule) };
};

// --- 8. MTB Handlebar Width -------------------------------------------------
export const mtbHandlebarWidthCalculator: CustomCalculator = (values) => {
  const shoulder = cm(nonNeg(values.shoulderWidth, 42), values.unit);
  const adj = ({ 1: -20, 2: 0, 3: 20, 4: 30 } as Record<number, number>)[whole(values.style, 2)] ?? 0;
  const w = Math.min(820, Math.max(660, Math.round((shoulder * 18 + adj) / 10) * 10));

  return { handlebarWidthMm: w, rangeLowMm: w - 20, rangeHighMm: Math.min(820, w + 20), cutPerSideMm: Math.max(0, (nonNeg(values.currentBarMm, 800) - w) / 2) };
};

// --- 9. MTB Handlebar Height ------------------------------------------------
export const mtbHandlebarHeightCalculator: CustomCalculator = (values) => {
  const saddle = nonNeg(values.saddleHeightFromGroundCm, 100);
  const current = nonNeg(values.currentBarHeightCm, 96);
  // Bar drop below the saddle (cm): XC 6, trail 2, enduro −1 (above), DH −4.
  const drop = ({ 1: 6, 2: 2, 3: -1, 4: -4 } as Record<number, number>)[whole(values.style, 2)] ?? 2;
  const target = saddle - drop;

  return { targetBarHeightCm: round2(target), changeNeededMm: Math.round((target - current) * 10), barDropBelowSaddleCm: drop };
};

// --- 10. Mountain Bike Reach ------------------------------------------------
export const mountainBikeReachCalculator: CustomCalculator = (values) => {
  const h = cm(nonNeg(values.height, 175), values.unit);
  const f = ({ 1: 2.55, 2: 2.65, 3: 2.72 } as Record<number, number>)[whole(values.style, 2)] ?? 2.65;
  const reach = h * f;
  const bike = nonNeg(values.bikeReachMm, 460);

  return { recommendedReachMm: Math.round(reach), rangeLowMm: Math.round(reach - 10), rangeHighMm: Math.round(reach + 10), bikeDifferenceMm: bike > 0 ? Math.round(bike - reach) : 0 };
};

// --- 11. Dropper Post -------------------------------------------------------
const DROPPER_TRAVELS = [100, 125, 150, 170, 180, 200, 210, 240];

export const dropperPostCalculator: CustomCalculator = (values) => {
  const saddle = nonNeg(values.saddleHeightMm, 720); // BB centre to saddle top
  const seatTube = nonNeg(values.seatTubeMm, 430); // BB centre to top of seat tube
  const insertion = nonNeg(values.maxInsertionMm, 280);
  const stack = nonNeg(values.saddleStackMm, 35); // rails to saddle top
  // Fixed height of a dropper above the collar (collar + head), and length below.
  const byHeight = saddle - seatTube - stack - 70;
  const byInsertion = insertion - 100;
  const max = Math.min(byHeight, byInsertion);
  const fits = DROPPER_TRAVELS.filter((t) => t <= max);

  return { maxTravelMm: Math.max(0, Math.round(max)), recommendedTravelMm: fits.length ? fits[fits.length - 1] : 0, limitedBy: byHeight <= byInsertion ? 1 : 2, exposedPostMm: Math.round(saddle - seatTube - stack) };
};

// --- 12. MTB Spring Rate ----------------------------------------------------
export const mtbSpringRateCalculator: CustomCalculator = (values) => {
  const lb = nonNeg(values.riderWeight, 80) * (whole(values.weightUnit, 1) === 2 ? 1 : 2.20462);
  const stroke = Math.max(1, nonNeg(values.shockStrokeMm, 60));
  const travel = nonNeg(values.rearTravelMm, 150);
  const sag = Math.min(50, Math.max(10, nonNeg(values.sagPercent, 30))) / 100;
  const rear = Math.min(100, nonNeg(values.rearBiasPercent, 65)) / 100;
  const leverage = travel / stroke;
  const k = (lb * rear * leverage) / (sag * (stroke / 25.4));

  return { springRateLbIn: Math.round(k), nearestSpringLbIn: Math.round(k / 25) * 25, springRateNmm: round2(k * 0.175127), leverageRatio: round2(leverage), sagMm: round2(stroke * sag), airPressureStartPsi: Math.round(lb) };
};

export const cyclingFitCustomCalculators: Record<string, CustomCalculator> = {
  "bike-frame-size-calculator": bikeFrameSizeCalculator,
  "kids-bike-size-calculator": kidsBikeSizeCalculator,
  "bike-fit-calculator": bikeFitCalculator,
  "bike-seat-height-calculator": bikeSeatHeightCalculator,
  "bike-saddle-size-calculator": bikeSaddleSizeCalculator,
  "bike-stem-calculator": bikeStemCalculator,
  "crank-length-calculator": crankLengthCalculator,
  "mtb-handlebar-width-calculator": mtbHandlebarWidthCalculator,
  "mtb-handlebar-height-calculator": mtbHandlebarHeightCalculator,
  "mountain-bike-reach-calculator": mountainBikeReachCalculator,
  "dropper-post-calculator": dropperPostCalculator,
  "mtb-spring-rate-calculator": mtbSpringRateCalculator,
};
