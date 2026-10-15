/**
 * Batch: "Shopping Calculators" → Electronics, Energy & Tech — photography
 * (7 tools). Shared sensor table (width × height in mm) for full frame,
 * APS-C (Nikon/Sony/Fuji and Canon), Micro Four Thirds, 1-inch and phone
 * sensors; the circle of confusion is the sensor diagonal ÷ 1,500.
 *
 *  - fieldOfView (also lens focal length): horizontal, vertical and
 *    diagonal angle of view and the frame width at a distance.
 *  - depthOfField: near and far limits of sharpness and total DoF.
 *  - hyperfocalDistance: focus distance that keeps infinity sharp.
 *  - cropFactor (also camera sensor size): crop factor and full-frame
 *    equivalent focal length and aperture.
 *  - photographyExposure: exposure value and equivalent shutter speed at a
 *    new aperture and ISO.
 *  - timelapse: shots, interval and clip length from event and video time.
 *  - megapixelPrintSize (also poster size): largest print at a target DPI.
 *
 * Self-contained: no imports from any other batch, per this project's
 * established per-batch convention.
 *
 * See prisma/create-shopping-tech-photo-calculators.ts for the copy.
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

const SENSORS: [number, number][] = [
  [36, 24], // full frame
  [23.5, 15.6], // APS-C (Nikon, Sony, Fujifilm)
  [22.3, 14.9], // APS-C (Canon)
  [17.3, 13], // Micro Four Thirds
  [13.2, 8.8], // 1-inch
  [9.8, 7.3], // large phone sensor (1/1.3")
];
const FF_DIAG = Math.hypot(36, 24);

function sensor(v: Record<string, number>) {
  const [w, h] = SENSORS[idx(v.sensor, SENSORS.length - 1)];
  const diag = Math.hypot(w, h);
  return { w, h, diag, coc: diag / 1500 };
}

const deg = (r: number) => (r * 180) / Math.PI;
const aov = (size: number, f: number) => (f > 0 ? deg(2 * Math.atan(size / (2 * f))) : 0);

export const fieldOfView: CustomCalculator = (v) => {
  const f = nonNeg(v.focalLength);
  const { w, h, diag } = sensor(v);
  const dist = nonNeg(v.distanceM);
  return {
    horizontalFov: round2(aov(w, f)),
    verticalFov: round2(aov(h, f)),
    diagonalFov: round2(aov(diag, f)),
    frameWidthM: f > 0 ? round2((w * dist) / f) : 0,
    frameHeightM: f > 0 ? round2((h * dist) / f) : 0,
  };
};

function dof(f: number, n: number, s: number, coc: number) {
  const H = (f * f) / (n * coc) + f; // mm
  const sMm = s * 1000;
  const near = (sMm * (H - f)) / (H + sMm - 2 * f);
  const far = sMm < H ? (sMm * (H - f)) / (H - sMm) : Infinity;
  return { H, near, far };
}

export const depthOfField: CustomCalculator = (v) => {
  const { coc } = sensor(v);
  const f = nonNeg(v.focalLength);
  const n = nonNeg(v.aperture) || 2.8;
  const s = nonNeg(v.distanceM);
  if (f <= 0 || s <= 0) return { totalDofM: 0, nearLimitM: 0, farLimitM: 0, inFrontM: 0, behindM: 0, farIsInfinity: 0 };
  const { near, far } = dof(f, n, s, coc);
  const inf = !Number.isFinite(far);
  return {
    totalDofM: inf ? 9999 : round2((far - near) / 1000),
    nearLimitM: round2(near / 1000),
    farLimitM: inf ? 9999 : round2(far / 1000),
    inFrontM: round2((s * 1000 - near) / 1000),
    behindM: inf ? 9999 : round2((far - s * 1000) / 1000),
    farIsInfinity: inf ? 1 : 0,
  };
};

export const hyperfocalDistance: CustomCalculator = (v) => {
  const { coc } = sensor(v);
  const f = nonNeg(v.focalLength);
  const n = nonNeg(v.aperture) || 8;
  const H = f > 0 ? (f * f) / (n * coc) + f : 0;
  return {
    hyperfocalM: round2(H / 1000),
    nearestSharpM: round2(H / 2000),
    hyperfocalFt: round2((H / 1000) * 3.281),
    circleOfConfusionMm: round2(coc * 1000) / 1000,
  };
};

export const cropFactor: CustomCalculator = (v) => {
  const { w, h, diag } = sensor(v);
  const crop = FF_DIAG / diag;
  return {
    cropFactor: round2(crop),
    equivalentFocalLength: round2(nonNeg(v.focalLength) * crop),
    equivalentAperture: round2(nonNeg(v.aperture) * crop),
    sensorWidthMm: w,
    sensorHeightMm: h,
    sensorAreaVsFullFrame: round2(((w * h) / (36 * 24)) * 100),
  };
};

export const photographyExposure: CustomCalculator = (v) => {
  const n1 = nonNeg(v.aperture) || 1;
  const t1 = nonNeg(v.shutterSeconds) || 1;
  const iso1 = nonNeg(v.iso) || 100;
  const ev100 = Math.log2((n1 * n1) / t1) - Math.log2(iso1 / 100);
  const n2 = nonNeg(v.newAperture) || n1;
  const iso2 = nonNeg(v.newIso) || iso1;
  // Same exposure: N²/t ÷ (ISO/100) constant.
  const t2 = (n2 * n2) / Math.pow(2, ev100 + Math.log2(iso2 / 100));
  return {
    exposureValue: round2(ev100),
    newShutterSeconds: round2(t2 * 100000) / 100000,
    newShutterFraction: t2 > 0 && t2 < 1 ? Math.round(1 / t2) : 0,
    stopsChange: round2(Math.log2(t2 / t1)),
  };
};

export const timelapse: CustomCalculator = (v) => {
  const eventSec = nonNeg(v.eventMinutes) * 60;
  const clipSec = nonNeg(v.clipSeconds);
  const fps = nonNeg(v.fps) || 30;
  const frames = Math.round(clipSec * fps);
  const interval = frames > 0 ? eventSec / frames : 0;
  return {
    intervalSeconds: round2(interval),
    totalShots: frames,
    storageGb: round2((frames * nonNeg(v.mbPerShot)) / 1000),
    speedUp: clipSec > 0 ? round2(eventSec / clipSec) : 0,
  };
};

export const megapixelPrintSize: CustomCalculator = (v) => {
  const mp = nonNeg(v.megapixels) * 1e6;
  const [ar, br] = [[3, 2], [4, 3], [16, 9], [1, 1]][idx(v.aspect, 3)];
  const wPx = Math.sqrt((mp * ar) / br);
  const hPx = mp / (wPx || 1);
  const dpi = nonNeg(v.dpi) || 300;
  return {
    printWidthIn: round2(wPx / dpi),
    printHeightIn: round2(hPx / dpi),
    widthPx: Math.round(wPx),
    heightPx: Math.round(hPx),
    posterWidthAt150Dpi: round2(wPx / 150),
    posterHeightAt150Dpi: round2(hPx / 150),
  };
};

export const shoppingTechPhotoCustomCalculators: Record<string, CustomCalculator> = {
  "field-of-view-calculator": fieldOfView,
  "depth-of-field-calculator": depthOfField,
  "hyperfocal-distance-calculator": hyperfocalDistance,
  "crop-factor-calculator": cropFactor,
  "photography-exposure-calculator": photographyExposure,
  "timelapse-calculator": timelapse,
  "megapixel-print-size-calculator": megapixelPrintSize,
};
