/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-archery (13 tools). See calc-engine-other-football.ts for the full
 * list of other-* sub-batches.
 *
 * Merged: crossbow kinetic energy -> archery kinetic energy.
 *
 * Near-namesakes, and how each is deliberately different:
 *  - archeryCalculator: arrow speed from the bow's IBO rating and your
 *    setup (with KE, momentum, GPP).
 *  - kineticEnergyCalculatorArchery: KE and game-size category from a
 *    known speed; arrowMomentumCalculator: momentum (penetration).
 *  - arrowWeightCalculator: total arrow weight from components and GPP;
 *    focCalculatorArchery: front-of-centre balance.
 *  - arrowLengthCalculator / archeryDrawLengthCalculator: arrow cut length
 *    vs the archer's draw length.
 *  - bowDrawWeightCalculator: recommended weight for the archer;
 *    recurveBowDrawWeightCalculator: actual weight at your draw length.
 *  - arrowDropCalculator vs archerySightTapeCalculator: drop at a range vs
 *    a full set of sight marks from two known marks.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-archery-calculators.ts for the copy.
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

const ke = (grains: number, fps: number) => (grains * fps * fps) / 450240;
const momentum = (grains: number, fps: number) => (grains * fps) / 225400;
/** Easton KE guide: 1 small game < 25, 2 medium (deer) 25–41, 3 large (elk) 42–65, 4 toughest > 65. */
const keClass = (e: number) => (e < 25 ? 1 : e < 42 ? 2 : e <= 65 ? 3 : 4);
const G_FT = 32.174;

// --- 1. Arrow weight (components) -------------------------------------------------------
export const arrowWeightCalculator: CustomCalculator = (values) => {
  const total =
    nonNeg(values.gpi, 9) * nonNeg(values.shaftLength, 28) + nonNeg(values.point, 100) + nonNeg(values.insert, 16) + nonNeg(values.nock, 10) +
    nonNeg(values.vaneWeight, 6) * whole(values.vanes, 3) + nonNeg(values.wrap, 0);
  const gpp = div(total, nonNeg(values.drawWeight, 60));

  return { totalGrains: round2(total), grainsPerPound: round2(gpp), totalGrams: round2(total * 0.0647989), category: gpp < 5 ? 1 : gpp < 6 ? 2 : gpp < 8 ? 3 : 4 };
};

// --- 2. Archery calculator (arrow speed from IBO) -------------------------------------------
export const archeryCalculator: CustomCalculator = (values) => {
  const dw = nonNeg(values.drawWeight, 70);
  const arrow = nonNeg(values.arrowWeight, 400);
  const v = Math.max(50, nonNeg(values.iboSpeed, 340) - 10 * (30 - nonNeg(values.drawLength, 29)) - 2 * Math.max(0, 70 - dw) - (arrow - 350) / 3 - nonNeg(values.stringWeight, 10) / 3);

  return { arrowSpeedFps: Math.round(v), kineticEnergy: round2(ke(arrow, v)), momentum: Math.round(momentum(arrow, v) * 1000) / 1000, grainsPerPound: round2(div(arrow, dw)) };
};

// --- 3. Kinetic energy (bows & crossbows) --------------------------------------------------------
export const kineticEnergyCalculatorArchery: CustomCalculator = (values) => {
  const gr = nonNeg(values.arrowWeight, 425);
  const fps = nonNeg(values.speed, 280);
  const e = ke(gr, fps);

  return { kineticEnergy: round2(e), joules: round2(e * 1.35582), gameClass: keClass(e), momentum: Math.round(momentum(gr, fps) * 1000) / 1000 };
};

// --- 4. Arrow length ----------------------------------------------------------------------------
export const arrowLengthCalculator: CustomCalculator = (values) => {
  const dl = nonNeg(values.drawLength, 28);
  const type = whole(values.bowType, 1); // 1 compound (drop-away), 2 recurve / longbow, 3 compound with fixed broadhead past riser
  const add = type === 1 ? 1 : type === 2 ? 1.5 : 2;

  return { recommendedArrowLength: round2(dl + add), minimumArrowLength: round2(dl + (type === 2 ? 1 : 0.5)), cm: round2((dl + add) * 2.54) };
};

// --- 5. Arrow momentum ---------------------------------------------------------------------------
export const arrowMomentumCalculator: CustomCalculator = (values) => {
  const gr = nonNeg(values.arrowWeight, 425);
  const fps = nonNeg(values.speed, 280);
  const p = momentum(gr, fps);

  return { momentum: Math.round(p * 1000) / 1000, gameClass: p < 0.3 ? 1 : p < 0.4 ? 2 : p < 0.5 ? 3 : 4, kineticEnergy: round2(ke(gr, fps)), momentumNs: round2(p * 4.44822) };
};

// --- 6. FOC (front of centre) ---------------------------------------------------------------------
export const focCalculatorArchery: CustomCalculator = (values) => {
  const len = Math.max(1, nonNeg(values.arrowLength, 29));
  const bp = nonNeg(values.balancePoint, 17.5);
  const foc = ((bp - len / 2) / len) * 100;

  return { focPct: round2(foc), category: foc < 7 ? 1 : foc < 15 ? 2 : foc < 19 ? 3 : 4, balanceAheadOfCentreIn: round2(bp - len / 2) };
};

// --- 7. Sight tape (marks from two known marks) ------------------------------------------------------
const DIST = [20, 30, 40, 50, 60, 70, 80];

export const archerySightTapeCalculator: CustomCalculator = (values) => {
  const metres = whole(values.unit, 1) === 2;
  const toFt = metres ? 3.28084 : 3;
  const v = Math.max(50, nonNeg(values.arrowSpeed, 280));
  // Average speed falls about 1.5% per 10 yd, so gaps between marks widen with distance.
  const angle = (d: number) => {
    const vAvg = v * (1 - 0.00075 * d * (toFt / 3));
    return Math.atan((G_FT * d * toFt) / (2 * vAvg * vAvg));
  };
  const d1 = nonNeg(values.knownDistance1, 20);
  const d2 = nonNeg(values.knownDistance2, 50);
  const m1 = num(values.knownMark1, 10);
  const m2 = num(values.knownMark2, 40);
  const k = div(m2 - m1, angle(d2) - angle(d1));
  const out: Record<string, number> = {};
  for (const d of DIST) out[`mark${d}`] = round2(m1 + k * (angle(d) - angle(d1)));
  return out;
};

// --- 8. Bow draw weight (recommended) ----------------------------------------------------------------
// [low, high] for compound bows by archer group & body weight band.
function compoundRange(group: number, lb: number): [number, number] {
  if (group === 3) return lb < 100 ? [10, 15] : [15, 25]; // children
  if (group === 2) return lb < 130 ? [25, 35] : lb < 160 ? [30, 45] : [45, 55]; // women
  return lb < 150 ? [40, 55] : lb < 180 ? [45, 65] : [60, 70]; // men
}

export const bowDrawWeightCalculator: CustomCalculator = (values) => {
  const lb = nonNeg(values.bodyWeight, 170) * (whole(values.unit, 1) === 2 ? 2.20462 : 1);
  const [lo, hi] = compoundRange(whole(values.group, 1), lb);
  const recurve = whole(values.bowType, 1) === 2;
  const f = recurve ? 0.6 : 1;
  const beginner = whole(values.experience, 1) === 1 ? 0.85 : 1;

  return { drawWeightLow: Math.round(lo * f * beginner), drawWeightHigh: Math.round(hi * f * beginner), deerLegalMinimumTypical: 40 };
};

// --- 9. Arrow drop ------------------------------------------------------------------------------------
export const arrowDropCalculator: CustomCalculator = (values) => {
  const v0 = Math.max(50, nonNeg(values.speed, 280));
  const loss = clamp(nonNeg(values.speedLossPer10Yd, 1.5), 0, 10) / 100;
  const flight = (yd: number) => {
    const vAvg = v0 * (1 - (loss * yd) / 20);
    const t = div(yd * 3, vAvg);
    return { t, dropIn: 0.5 * G_FT * t * t * 12 };
  };
  const target = nonNeg(values.distance, 40);
  const zero = nonNeg(values.zeroDistance, 20);
  const a = flight(target);
  const z = flight(zero);
  const relative = a.dropIn - (z.dropIn * target) / Math.max(1, zero);

  return { dropFromBoreIn: round2(a.dropIn), dropFromPinIn: round2(relative), timeOfFlight: Math.round(a.t * 1000) / 1000, speedAtTargetFps: Math.round(v0 * (1 - (loss * target) / 10)) };
};

// --- 10. Draw length ------------------------------------------------------------------------------------
export const archeryDrawLengthCalculator: CustomCalculator = (values) => {
  const cm = whole(values.unit, 1) === 2;
  const wingspan = nonNeg(values.wingspan, 70) / (cm ? 2.54 : 1);
  const height = nonNeg(values.height, 70) / (cm ? 2.54 : 1);
  const fromSpan = wingspan / 2.5;

  return { drawLengthInches: round2(fromSpan), drawLengthFromHeight: round2((height - 15) / 2), drawLengthCm: round2(fromSpan * 2.54), nearestHalfInch: Math.round(fromSpan * 2) / 2 };
};

// --- 11. Bow string length -----------------------------------------------------------------------------------
const BRACE: Record<number, [number, number]> = { 62: [7, 8], 64: [7.25, 8.25], 66: [7.5, 8.5], 68: [8, 9], 70: [8.25, 9.25], 72: [8.5, 9.5] };

export const bowStringLengthCalculator: CustomCalculator = (values) => {
  const amo = nonNeg(values.amoLength, 68);
  const longbow = whole(values.bowType, 1) === 2;
  const near = Math.min(72, Math.max(62, Math.round(amo / 2) * 2));
  const [lo, hi] = BRACE[near] ?? [8, 9];

  return { stringLength: round2(amo - (longbow ? 4 : 3.75)), braceHeightLow: longbow ? 6.5 : lo, braceHeightHigh: longbow ? 7.5 : hi, stringLengthCm: round2((amo - (longbow ? 4 : 3.75)) * 2.54) };
};

// --- 12. Arrow spine (approximate static spine) --------------------------------------------------------------
const SPINE: [number, number][] = [[35, 700], [42, 600], [50, 500], [58, 400], [67, 350], [77, 300], [Infinity, 250]];

export const archerySpineCalculator: CustomCalculator = (values) => {
  const recurve = whole(values.bowType, 1) === 2;
  const adjusted = nonNeg(values.drawWeight, 60) + 2.5 * (nonNeg(values.arrowLength, 28) - 28) + ((nonNeg(values.pointWeight, 100) - 100) / 25) * 3 + (recurve ? 5 : 0);
  const spine = SPINE.find(([w]) => adjusted <= w)?.[1] ?? 250;

  return { recommendedSpine: spine, adjustedBowWeight: round2(adjusted), weakerOption: spine + (spine >= 600 ? 100 : 50), stifferOption: Math.max(200, spine - (spine > 600 ? 100 : 50)) };
};

// --- 13. Recurve draw weight at your draw length ----------------------------------------------------------------
export const recurveBowDrawWeightCalculator: CustomCalculator = (values) => {
  const marked = nonNeg(values.markedWeight, 35);
  const dl = nonNeg(values.drawLength, 29);
  const perInch = nonNeg(values.lbPerInch, 2);
  const actual = marked + (dl - 28) * perInch;

  return { actualDrawWeight: round2(actual), differenceLb: round2(actual - marked), atFullDraw: round2(actual + nonNeg(values.extraPastClicker, 0) * perInch) };
};

export const otherArcheryCustomCalculators: Record<string, CustomCalculator> = {
  "arrow-weight-calculator": arrowWeightCalculator,
  "archery-calculator": archeryCalculator,
  "kinetic-energy-calculator-archery": kineticEnergyCalculatorArchery,
  "arrow-length-calculator": arrowLengthCalculator,
  "arrow-momentum-calculator": arrowMomentumCalculator,
  "foc-calculator-archery": focCalculatorArchery,
  "archery-sight-tape-calculator": archerySightTapeCalculator,
  "bow-draw-weight-calculator": bowDrawWeightCalculator,
  "arrow-drop-calculator": arrowDropCalculator,
  "archery-draw-length-calculator": archeryDrawLengthCalculator,
  "bow-string-length-calculator": bowStringLengthCalculator,
  "archery-spine-calculator": archerySpineCalculator,
  "recurve-bow-draw-weight-calculator": recurveBowDrawWeightCalculator,
};
