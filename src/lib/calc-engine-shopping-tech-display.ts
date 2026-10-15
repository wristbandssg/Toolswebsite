/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — screens,
 * TVs and projectors (7 tools):
 *
 *  - monitorPpi: pixel density, dot pitch and the distance where pixels
 *    blur together (about 3,438 ÷ PPI inches).
 *  - screenDimensions: width, height and area from the diagonal and aspect.
 *  - tvSize: TV size for a viewing distance using SMPTE (30°) and THX (40°)
 *    viewing angles, adjusted for resolution.
 *  - tvMountingHeight: centre, bottom and top heights from eye level and
 *    room use (living room, bedroom, above a fireplace).
 *  - projectorThrowDistance: distance range for an image size from the
 *    projector's throw ratio range.
 *  - projectorScreenSize: the largest comfortable screen limited by seating
 *    distance, wall width and ceiling height.
 *  - projectorBrightness: lumens for a screen size, gain and room light.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-display-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));
const idx = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(safeNumber(v))));

/** Aspect ratios [w, h]: 16:9, 16:10, 21:9, 32:9, 4:3, 3:2, 2.35:1. */
const ASPECTS: [number, number][] = [[16, 9], [16, 10], [21, 9], [32, 9], [4, 3], [3, 2], [2.35, 1]];

function dims(diag: number, aspect: number) {
  const [w, h] = ASPECTS[idx(aspect, ASPECTS.length - 1)];
  const k = diag / Math.hypot(w, h);
  return { width: w * k, height: h * k };
}

export const monitorPpi: CustomCalculator = (v) => {
  const px = Math.hypot(nonNeg(v.widthPx), nonNeg(v.heightPx));
  const diag = nonNeg(v.diagonal);
  const ppi = diag > 0 ? px / diag : 0;
  const ratio = nonNeg(v.heightPx) > 0 ? nonNeg(v.widthPx) / nonNeg(v.heightPx) : 0;
  const h = ratio > 0 ? diag / Math.hypot(ratio, 1) : 0;
  return {
    ppi: round2(ppi),
    dotPitchMm: ppi > 0 ? round2((25.4 / ppi) * 1000) / 1000 : 0,
    retinaDistanceIn: ppi > 0 ? round2(3438 / ppi) : 0,
    screenWidthIn: round2(h * ratio),
    screenHeightIn: round2(h),
    totalMegapixels: round2((nonNeg(v.widthPx) * nonNeg(v.heightPx)) / 1e6),
  };
};

export const screenDimensions: CustomCalculator = (v) => {
  const { width, height } = dims(nonNeg(v.diagonal), v.aspect);
  return {
    widthIn: round2(width),
    heightIn: round2(height),
    areaSqIn: round2(width * height),
    widthCm: round2(width * 2.54),
    heightCm: round2(height * 2.54),
  };
};

const TV_SIZES = [32, 43, 50, 55, 65, 75, 85, 98, 100, 115];

export const tvSize: CustomCalculator = (v) => {
  const distIn = nonNeg(v.distanceFt) * 12;
  const res = idx(v.resolution, 2); // 1080p, 4K, 8K
  const smpte = distIn / 1.63;
  const thx = distIn / 1.2;
  // 1080p looks soft when too big for the distance; cap it near SMPTE.
  const ideal = res === 0 ? smpte : (smpte + thx) / 2;
  const nearest = TV_SIZES.reduce((a, b) => (Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a));
  return {
    recommendedTvSize: nearest,
    idealDiagonal: round2(ideal),
    minimumComfortable: round2(smpte),
    maximumImmersive: round2(res === 0 ? smpte * 1.1 : thx),
  };
};

export const tvMountingHeight: CustomCalculator = (v) => {
  const { height } = dims(nonNeg(v.tvSize), 0);
  const eye = nonNeg(v.eyeHeight) || 42;
  const room = idx(v.room, 2); // living, bedroom (lying), fireplace
  const center = room === 0 ? eye : room === 1 ? eye + 8 : Math.max(eye, nonNeg(v.mantelHeight) + height / 2 + 4);
  return {
    centerHeight: round2(center),
    bottomEdgeHeight: round2(center - height / 2),
    topEdgeHeight: round2(center + height / 2),
    tvHeightIn: round2(height),
    tiltDegrees: room === 2 ? Math.round(Math.atan((center - eye) / (nonNeg(v.distanceFt) * 12 || 120)) * (180 / Math.PI)) : 0,
  };
};

export const projectorThrowDistance: CustomCalculator = (v) => {
  const { width, height } = dims(nonNeg(v.screenDiagonal), v.aspect);
  const minRatio = nonNeg(v.throwMin);
  const maxRatio = nonNeg(v.throwMax) || minRatio;
  return {
    minDistanceFt: round2((width * minRatio) / 12),
    maxDistanceFt: round2((width * maxRatio) / 12),
    imageWidthIn: round2(width),
    imageHeightIn: round2(height),
    distanceFromScreenCenterFt: round2((width * (minRatio + maxRatio)) / 2 / 12),
  };
};

export const projectorScreenSize: CustomCalculator = (v) => {
  const [aw, ah] = ASPECTS[idx(v.aspect, ASPECTS.length - 1)];
  const diagPerWidth = Math.hypot(aw, ah) / aw;
  const byDistance = (nonNeg(v.viewingDistanceFt) * 12) / 1.2; // THX 40°
  const byWall = (nonNeg(v.wallWidthFt) * 12 - 24) * diagPerWidth;
  const byHeight = (nonNeg(v.ceilingHeightFt) * 12 - 24 - 24) * (Math.hypot(aw, ah) / ah); // 24 in off floor, 24 in margin
  const diag = Math.max(0, Math.min(byDistance, byWall, byHeight));
  const { width, height } = dims(diag, v.aspect);
  return {
    screenDiagonal: Math.round(diag),
    screenWidthIn: round2(width),
    screenHeightIn: round2(height),
    limitedBy: diag === byDistance ? 1 : diag === byWall ? 2 : 3,
  };
};

const TARGET_FL = [16, 30, 50]; // dark room, dim, some ambient light

export const projectorBrightness: CustomCalculator = (v) => {
  const { width, height } = dims(nonNeg(v.screenDiagonal), v.aspect);
  const areaSqFt = (width * height) / 144;
  const gain = nonNeg(v.screenGain) || 1;
  const fl = TARGET_FL[idx(v.roomLight, 2)];
  const lumens = (fl * areaSqFt) / gain;
  return {
    lumensNeeded: Math.round(lumens),
    withLampAgingLumens: Math.round(lumens * 1.3),
    screenAreaSqFt: round2(areaSqFt),
    targetFootLamberts: fl,
  };
};

export const shoppingTechDisplayCustomCalculators: Record<string, CustomCalculator> = {
  "monitor-ppi-calculator": monitorPpi,
  "screen-dimensions-calculator": screenDimensions,
  "tv-size-calculator": tvSize,
  "tv-mounting-height-calculator": tvMountingHeight,
  "projector-throw-distance-calculator": projectorThrowDistance,
  "projector-screen-size-calculator": projectorScreenSize,
  "projector-brightness-calculator": projectorBrightness,
};
