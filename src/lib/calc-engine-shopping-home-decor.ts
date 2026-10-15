/**
 * Batch: "Shopping Calculators" → Home Improvement Cost & Sizing — wall
 * decor, lighting and window treatments (8 tools):
 *
 *  - mirrorSize: 70–80% of the vanity or console width and how high to hang.
 *  - chandelierSize (also light fixture size): room length + width in feet =
 *    diameter in inches; 2.5–3 in of height per foot of ceiling; over a
 *    table, about the table width minus 12 in, hung 30–36 in above it.
 *  - ceilingFanSize: blade span by room area, downrod by ceiling height and
 *    the airflow (CFM) to look for.
 *  - wallArtSize (also canvas size): two-thirds of the furniture below (or
 *    57% of a bare wall) and the nearest standard canvas.
 *  - galleryWall: frame sizes for an even grid in the space available.
 *  - pictureHangingHeight: where to put the nail so the centre sits at
 *    57 in (or above furniture).
 *  - frameSize (also mat size): frame and mat opening for art plus a mat
 *    border, with the nearest standard frame.
 *  - blindSize: order sizes for inside or outside mount blinds.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-home-decor-calculators.ts for the copy.
 */

export type CustomCalculator = (values: Record<string, number>) => number | Record<string, number>;

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const nonNeg = (v: number, d = 0) => Math.max(0, safeNumber(v, d));

export const mirrorSize: CustomCalculator = (v) => {
  const furn = nonNeg(v.furnitureWidth);
  const bath = safeNumber(v.location) === 0;
  const w = bath ? Math.max(0, furn - 4) : furn * 0.75;
  return {
    idealMirrorWidth: Math.round(w),
    widthRangeLow: Math.round(bath ? furn * 0.7 : furn * 0.67),
    widthRangeHigh: Math.round(bath ? furn : furn * 0.8),
    mirrorBottomHeight: Math.round(nonNeg(v.furnitureHeight) + (bath ? 6 : 8)),
    mirrorCenterHeight: 60,
  };
};

export const chandelierSize: CustomCalculator = (v) => {
  const L = nonNeg(v.roomLength);
  const W = nonNeg(v.roomWidth);
  const ceiling = nonNeg(v.ceilingHeight);
  const overTable = safeNumber(v.overTable) === 1;
  const tableW = nonNeg(v.tableWidth);
  const diameter = overTable ? Math.min(L + W, Math.max(0, tableW - 12)) : L + W;
  const height = ceiling * 2.75;
  const hangAboveTable = 30 + Math.max(0, ceiling - 8) * 3;
  return {
    fixtureDiameter: Math.round(diameter),
    fixtureHeight: Math.round(height),
    hangAboveTable: Math.round(hangAboveTable),
    minClearanceFromFloor: overTable ? 0 : 84,
    chainOrDownrodLength: overTable ? Math.round(Math.max(0, ceiling * 12 - 30 - hangAboveTable - height)) : Math.round(Math.max(0, ceiling * 12 - 84 - height)),
  };
};

export const ceilingFanSize: CustomCalculator = (v) => {
  const area = nonNeg(v.roomLength) * nonNeg(v.roomWidth);
  const ceiling = nonNeg(v.ceilingHeight);
  const fans = area > 400 ? Math.ceil(area / 300) : 1;
  const per = area / fans;
  const span = per <= 75 ? 36 : per <= 144 ? 44 : per <= 225 ? 52 : per <= 400 ? 56 : 60;
  const downrod = ceiling <= 8 ? 0 : ceiling <= 9 ? 6 : ceiling <= 10 ? 12 : ceiling <= 11 ? 18 : ceiling <= 12 ? 24 : 36;
  const cfm = per <= 75 ? 1500 : per <= 144 ? 3000 : per <= 225 ? 4000 : 5000;
  return { bladeSpan: span, downrodLength: downrod, minimumCfm: cfm, fansNeeded: fans, roomSqFt: round2(area) };
};

const CANVASES: [number, number][] = [[11, 14], [16, 20], [18, 24], [24, 30], [24, 36], [30, 40], [36, 48], [40, 60], [48, 72]];

export const wallArtSize: CustomCalculator = (v) => {
  const furn = nonNeg(v.furnitureWidth);
  const wallW = nonNeg(v.wallWidth) * 12;
  const target = furn > 0 ? furn * (2 / 3) : wallW * 0.57;
  const landscape = safeNumber(v.orientation) === 0;
  // Pick the largest standard canvas whose long side (landscape) or short side (portrait) fits the target width.
  let code = 0;
  CANVASES.forEach(([s, l], i) => {
    if ((landscape ? l : s) <= target * 1.05) code = i + 1;
  });
  const [s, l] = code > 0 ? CANVASES[code - 1] : [0, 0];
  return {
    idealArtWidth: Math.round(target),
    standardCanvasCode: code,
    canvasWidth: landscape ? l : s,
    canvasHeight: landscape ? s : l,
    maxArtWidth: Math.round(furn > 0 ? furn * 0.75 : wallW * 0.75),
  };
};

export const galleryWall: CustomCalculator = (v) => {
  const W = nonNeg(v.areaWidth);
  const H = nonNeg(v.areaHeight);
  const rows = Math.max(1, Math.round(nonNeg(v.rows) || 1));
  const cols = Math.max(1, Math.round(nonNeg(v.columns) || 1));
  const gap = nonNeg(v.spacing);
  const fw = (W - gap * (cols - 1)) / cols;
  const fh = (H - gap * (rows - 1)) / rows;
  return {
    frameWidth: round2(Math.max(0, fw)),
    frameHeight: round2(Math.max(0, fh)),
    framesNeeded: rows * cols,
    centerHeight: 57,
    topEdgeHeight: round2(57 + H / 2),
  };
};

export const pictureHangingHeight: CustomCalculator = (v) => {
  const h = nonNeg(v.frameHeight);
  const drop = nonNeg(v.hookDrop);
  const aboveFurniture = safeNumber(v.aboveFurniture) === 1;
  const center = aboveFurniture ? nonNeg(v.furnitureTop) + 9 + h / 2 : nonNeg(v.centerHeight) || 57;
  const top = center + h / 2;
  return {
    nailHeight: round2(top - drop),
    centerHeight: round2(center),
    topOfFrame: round2(top),
    bottomOfFrame: round2(center - h / 2),
  };
};

const FRAMES: [number, number][] = [[5, 7], [8, 10], [11, 14], [12, 16], [16, 20], [18, 24], [20, 24], [24, 36], [30, 40]];

export const frameSize: CustomCalculator = (v) => {
  const aw = nonNeg(v.artWidth);
  const ah = nonNeg(v.artHeight);
  const mat = nonNeg(v.matBorder);
  const bottomExtra = safeNumber(v.weightedBottom) === 1 ? 0.5 : 0;
  const fw = aw + 2 * mat;
  const fh = ah + 2 * mat + bottomExtra;
  const short = Math.min(fw, fh);
  const long = Math.max(fw, fh);
  const i = FRAMES.findIndex(([s, l]) => s >= short && l >= long);
  return {
    frameWidth: round2(fw),
    frameHeight: round2(fh),
    matOpeningWidth: round2(Math.max(0, aw - 0.25)),
    matOpeningHeight: round2(Math.max(0, ah - 0.25)),
    standardFrameCode: i < 0 ? 0 : i + 1,
  };
};

export const blindSize: CustomCalculator = (v) => {
  const widths = [v.widthTop, v.widthMiddle, v.widthBottom].map((x) => nonNeg(x)).filter((x) => x > 0);
  const heights = [v.heightLeft, v.heightCenter, v.heightRight].map((x) => nonNeg(x)).filter((x) => x > 0);
  const inside = safeNumber(v.mount) === 0;
  const w = widths.length ? (inside ? Math.min(...widths) : Math.max(...widths)) : 0;
  const h = heights.length ? Math.max(...heights) : 0;
  const overlap = nonNeg(v.overlap) || 3;
  return {
    orderWidth: round2(inside ? w : w + 2 * overlap),
    orderHeight: round2(inside ? h : h + 2 * overlap),
    minDepthForInsideMount: 2,
    measuredWidth: round2(w),
    measuredHeight: round2(h),
  };
};

export const shoppingHomeDecorCustomCalculators: Record<string, CustomCalculator> = {
  "mirror-size-calculator": mirrorSize,
  "chandelier-size-calculator": chandelierSize,
  "ceiling-fan-size-calculator": ceilingFanSize,
  "wall-art-size-calculator": wallArtSize,
  "gallery-wall-calculator": galleryWall,
  "picture-hanging-height-calculator": pictureHangingHeight,
  "frame-size-calculator": frameSize,
  "blind-size-calculator": blindSize,
};
