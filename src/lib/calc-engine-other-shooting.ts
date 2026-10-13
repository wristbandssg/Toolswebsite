/**
 * Batch: "Sports Calculators" > Other Sports Calculators, sub-batch
 * other-shooting (firearms, airguns & airsoft, 12 tools). See
 * calc-engine-other-football.ts for the full list of other-* sub-batches.
 *
 * Merged: shotgun recoil -> rifle recoil (firearm type dropdown).
 *
 * Near-namesakes, and how each is deliberately different:
 *  - muzzleEnergyCalculator: firearm energy, momentum and Taylor KO;
 *    pelletEnergyCalculator: airgun FPE vs legal limits;
 *    airsoftCalculator: joules and fps across BB weights vs field limits.
 *  - muzzleVelocityCalculator: velocity from barrel-length change or from
 *    energy.
 *  - bulletDropCalculator: drop, velocity, energy and time of flight at a
 *    range; windageCalculator: wind drift only; ballisticCoefficient
 *    Calculator: BC from two chronograph readings or sectional density.
 *  - bdcCalculator: ranges matched to reticle holdover marks;
 *    pointBlankRangeCalculator: best zero for a vital-zone size;
 *    zeroingCalculator: clicks to move the group onto the aim point.
 *
 * Self-contained: no imports from any other batch.
 * See prisma/create-other-shooting-calculators.ts for the copy.
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

/** Kinetic energy in ft-lb from grains and fps. */
const ftLb = (grains: number, fps: number) => (grains * fps * fps) / 450240;
const J_PER_FTLB = 1.35582;
/** Inches that 1 MOA subtends per yard. */
const MOA_IN_PER_YD = 1.047 / 100;
const MIL_IN_PER_YD = 3.6 / 100;

// --- Point-mass G1 trajectory -------------------------------------------------------
const G1: [number, number][] = [
  [0, 0.2629], [0.1, 0.2487], [0.2, 0.2344], [0.3, 0.2214], [0.4, 0.2104], [0.5, 0.2032], [0.6, 0.2034], [0.7, 0.2165], [0.75, 0.2313], [0.8, 0.2546],
  [0.85, 0.2901], [0.9, 0.3415], [0.95, 0.4084], [1, 0.4805], [1.05, 0.5427], [1.1, 0.5883], [1.15, 0.6191], [1.2, 0.6393], [1.25, 0.6518], [1.3, 0.6589],
  [1.35, 0.6621], [1.4, 0.6625], [1.5, 0.6573], [1.6, 0.6474], [1.7, 0.6347], [1.8, 0.621], [1.9, 0.6072], [2, 0.5934], [2.2, 0.5685], [2.4, 0.5481],
  [2.6, 0.5325], [2.8, 0.5211], [3, 0.5133], [3.5, 0.504], [4, 0.5006], [5, 0.4988],
];
function g1Cd(mach: number): number {
  if (mach <= 0) return G1[0][1];
  for (let i = 1; i < G1.length; i++) {
    if (mach <= G1[i][0]) return G1[i - 1][1] + ((mach - G1[i - 1][0]) / (G1[i][0] - G1[i - 1][0])) * (G1[i][1] - G1[i - 1][1]);
  }
  return G1[G1.length - 1][1];
}

interface Shot { mv: number; bc: number; sightIn: number; zeroYd: number; altFt: number; tempF: number }
interface Point { yd: number; dropIn: number; fps: number; tof: number }

/** Fly the bullet at bore angle `angle` (rad) and record points at the requested yards. */
function fly(s: Shot, angle: number, ranges: number[]): Point[] {
  const ft = 0.3048;
  const altM = s.altFt * ft;
  const tK = (num(s.tempF, 59) - 32) / 1.8 + 273.15;
  const rho = 1.225 * Math.pow(1 - 2.25577e-5 * altM, 5.25588) * (288.15 / tK);
  const sound = 20.0468 * Math.sqrt(tK);
  const sd = Math.max(0.01, s.bc) * 703.07;
  let x = 0;
  let y = -s.sightIn * 0.0254;
  let vx = s.mv * ft * Math.cos(angle);
  let vy = s.mv * ft * Math.sin(angle);
  let t = 0;
  const dt = 0.0005;
  const out: Point[] = [];
  const sorted = [...ranges].sort((a, b) => a - b);
  let k = 0;
  while (k < sorted.length && t < 15) {
    const target = sorted[k] * 0.9144;
    if (x >= target) {
      out.push({ yd: sorted[k], dropIn: y / 0.0254, fps: Math.hypot(vx, vy) / ft, tof: t });
      k++;
      continue;
    }
    const v = Math.hypot(vx, vy);
    const a = (rho * v * g1Cd(v / sound) * Math.PI) / (8 * sd);
    vx -= a * vx * dt;
    vy -= (a * vy + 9.80665) * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }
  return out;
}

/** Bore angle that puts the bullet on the line of sight at the zero range. */
function zeroAngle(s: Shot): number {
  let lo = -0.01;
  let hi = 0.05;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = fly(s, mid, [Math.max(1, s.zeroYd)])[0];
    if (!p || p.dropIn < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function shotFrom(values: Record<string, number>): Shot {
  return {
    mv: clamp(nonNeg(values.muzzleVelocity, 2700), 300, 5000),
    bc: clamp(nonNeg(values.bc, 0.45), 0.05, 1.5),
    sightIn: nonNeg(values.sightHeight, 1.5),
    zeroYd: clamp(nonNeg(values.zeroRange, 100), 10, 1000),
    altFt: nonNeg(values.altitude, 0),
    tempF: num(values.temperatureF, 59),
  };
}

// --- 1. Muzzle energy -------------------------------------------------------------------
export const muzzleEnergyCalculator: CustomCalculator = (values) => {
  const gr = nonNeg(values.bulletWeight, 150);
  const fps = nonNeg(values.velocity, 2800);
  const e = ftLb(gr, fps);

  return { energyFtLb: Math.round(e), energyJoules: Math.round(e * J_PER_FTLB), momentumLbS: round2((gr / 7000) * fps / 32.174), taylorKo: round2((gr * fps * nonNeg(values.diameter, 0.308)) / 7000) };
};

// --- 2. Muzzle velocity -------------------------------------------------------------------
export const muzzleVelocityCalculator: CustomCalculator = (values) => {
  if (whole(values.method, 1) === 2) {
    const v = Math.sqrt(div(nonNeg(values.energy, 2600) * 450240, nonNeg(values.bulletWeight, 150)));
    return { velocityFps: Math.round(v), velocityMs: Math.round(v * 0.3048), changeFps: 0 };
  }
  const change = (nonNeg(values.yourBarrel, 20) - nonNeg(values.testBarrel, 24)) * nonNeg(values.fpsPerInch, 25);
  const v = nonNeg(values.factoryVelocity, 2800) + change;
  return { velocityFps: Math.round(v), velocityMs: Math.round(v * 0.3048), changeFps: Math.round(change) };
};

// --- 3. Pellet energy (airguns) --------------------------------------------------------------
export const pelletEnergyCalculator: CustomCalculator = (values) => {
  const gr = nonNeg(values.pelletWeight, 8.44);
  const fps = nonNeg(values.velocity, 800);
  const e = ftLb(gr, fps);
  const limit = nonNeg(values.legalLimit, 12);

  return { energyFtLb: round2(e), energyJoules: round2(e * J_PER_FTLB), maxFpsAtLimit: Math.round(Math.sqrt(div(limit * 450240, gr))), withinLimit: e <= limit ? 1 : 0 };
};

// --- 4. Airsoft -------------------------------------------------------------------------------------
export const airsoftCalculator: CustomCalculator = (values) => {
  const g = Math.max(0.05, nonNeg(values.bbWeight, 0.2));
  const fps = nonNeg(values.fps, 350);
  const ms = fps * 0.3048;
  const joules = 0.5 * (g / 1000) * ms * ms;
  const other = Math.max(0.05, nonNeg(values.otherBbWeight, 0.28));
  const limit = nonNeg(values.fieldLimitJoules, 1.14);

  return {
    joules: round2(joules),
    fpsWithPoint2g: Math.round(Math.sqrt((2 * joules) / 0.0002) / 0.3048),
    fpsWithOtherBb: Math.round(Math.sqrt((2 * joules) / (other / 1000)) / 0.3048),
    withinFieldLimit: joules <= limit + 1e-9 ? 1 : 0,
  };
};

// --- 5. Rifle & shotgun recoil ------------------------------------------------------------------------
export const rifleRecoilCalculator: CustomCalculator = (values) => {
  const shotgun = whole(values.firearm, 1) === 2;
  const projectileGr = shotgun ? nonNeg(values.payloadOz, 1.125) * 437.5 + 40 : nonNeg(values.bulletWeight, 150);
  const mv = nonNeg(values.velocity, shotgun ? 1200 : 2800);
  const powder = nonNeg(values.powderCharge, shotgun ? 25 : 50);
  const gasV = shotgun ? 1.5 * mv : 4000;
  const gunLb = Math.max(1, nonNeg(values.gunWeight, 8));
  const vr = (projectileGr * mv + powder * gasV) / (7000 * gunLb);
  const energy = (gunLb * vr * vr) / (2 * 32.174);

  return { recoilEnergyFtLb: round2(energy), recoilVelocityFps: round2(vr), recoilImpulseLbS: round2((gunLb * vr) / 32.174), energyJoules: round2(energy * J_PER_FTLB) };
};

// --- 6. Scope height -----------------------------------------------------------------------------------------
export const scopeHeightCalculator: CustomCalculator = (values) => {
  const sight = nonNeg(values.railToBore, 0.65) + nonNeg(values.ringHeight, 0.85);
  const clearance = sight - nonNeg(values.objectiveDiameter, 50) / 25.4 / 2 - nonNeg(values.barrelDiameter, 0.75) / 2 - nonNeg(values.capAllowance, 0.1);

  return { sightHeightIn: round2(sight), sightHeightMm: round2(sight * 25.4), objectiveClearanceIn: round2(clearance), fits: clearance >= 0 ? 1 : 0 };
};

// --- 7. Bullet drop ------------------------------------------------------------------------------------------------
export const bulletDropCalculator: CustomCalculator = (values) => {
  const s = shotFrom(values);
  const range = clamp(nonNeg(values.range, 500), 10, 2500);
  const p = fly(s, zeroAngle(s), [range])[0];
  if (!p) return { dropInches: 0, dropMoa: 0, dropMil: 0, velocityFps: 0, energyFtLb: 0, timeOfFlight: 0 };
  return {
    dropInches: round2(p.dropIn),
    dropMoa: round2(p.dropIn / (MOA_IN_PER_YD * range)),
    dropMil: round2(p.dropIn / (MIL_IN_PER_YD * range)),
    velocityFps: Math.round(p.fps),
    energyFtLb: Math.round(ftLb(nonNeg(values.bulletWeight, 150), p.fps)),
    timeOfFlight: Math.round(p.tof * 1000) / 1000,
  };
};

// --- 8. Ballistic coefficient ------------------------------------------------------------------------------------------
export const ballisticCoefficientCalculator: CustomCalculator = (values) => {
  const gr = nonNeg(values.bulletWeight, 168);
  const d = Math.max(0.1, nonNeg(values.diameter, 0.308));
  const sdens = gr / 7000 / (d * d);
  if (whole(values.method, 1) === 2) {
    const ff = Math.max(0.3, nonNeg(values.formFactor, 1));
    return { ballisticCoefficient: Math.round((sdens / ff) * 1000) / 1000, sectionalDensity: Math.round(sdens * 1000) / 1000 };
  }
  const v1 = nonNeg(values.velocityNear, 2700);
  const v2 = nonNeg(values.velocityFar, 2450);
  const dist = Math.max(10, nonNeg(values.distance, 100));
  let lo = 0.05;
  let hi = 1.5;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = fly({ mv: v1, bc: mid, sightIn: 0, zeroYd: 100, altFt: nonNeg(values.altitude, 0), tempF: num(values.temperatureF, 59) }, 0, [dist])[0];
    if (!p || p.fps < v2) lo = mid; else hi = mid;
  }
  return { ballisticCoefficient: Math.round(((lo + hi) / 2) * 1000) / 1000, sectionalDensity: Math.round(sdens * 1000) / 1000 };
};

// --- 9. BDC reticle ranges ---------------------------------------------------------------------------------------------------
export const bdcCalculator: CustomCalculator = (values) => {
  const s = shotFrom(values);
  const angle = zeroAngle(s);
  const design = nonNeg(values.designMagnification, 0);
  const current = nonNeg(values.magnification, 0);
  const mag = design > 0 && current > 0 ? design / current : 1; // second-focal-plane scaling
  const steps = Array.from({ length: 160 }, (_, i) => 10 * (i + 1));
  const traj = fly(s, angle, steps);
  const out: Record<string, number> = {};
  for (let k = 1; k <= 4; k++) {
    const moa = nonNeg(values[`mark${k}Moa`], 0) * mag;
    let found = 0;
    if (moa > 0) {
      for (let i = 1; i < traj.length; i++) {
        const a0 = -traj[i - 1].dropIn / (MOA_IN_PER_YD * traj[i - 1].yd);
        const a1 = -traj[i].dropIn / (MOA_IN_PER_YD * traj[i].yd);
        if (traj[i].yd > s.zeroYd && a0 < moa && a1 >= moa) {
          found = Math.round(traj[i - 1].yd + ((moa - a0) / (a1 - a0)) * 10);
          break;
        }
      }
    }
    out[`mark${k}Range`] = found;
  }
  return out;
};

// --- 10. Maximum point blank range -------------------------------------------------------------------------------------------
export const pointBlankRangeCalculator: CustomCalculator = (values) => {
  const base = shotFrom(values);
  const r = nonNeg(values.vitalZone, 6) / 2;
  const steps = Array.from({ length: 120 }, (_, i) => 5 * (i + 1));
  let best = { mpbr: 0, zero: 0, near: 0, peakYd: 0 };
  for (let z = 50; z <= 400; z += 5) {
    const s = { ...base, zeroYd: z };
    const traj = fly(s, zeroAngle(s), steps);
    const peak = Math.max(...traj.map((p) => p.dropIn));
    if (peak > r) break;
    const last = traj.find((p) => p.yd > z && p.dropIn < -r);
    const mpbr = last ? last.yd - 5 : 600;
    if (mpbr > best.mpbr) {
      const nearPt = traj.find((p) => p.dropIn >= 0);
      const peakPt = traj.reduce((a, b) => (b.dropIn > a.dropIn ? b : a));
      best = { mpbr, zero: z, near: nearPt ? nearPt.yd : 0, peakYd: peakPt.yd };
    }
  }
  return { maxPointBlankRange: best.mpbr, bestZeroRange: best.zero, nearZero: best.near, peakHeightAt: best.peakYd };
};

// --- 11. Zeroing (clicks to adjust) ------------------------------------------------------------------------------------------
const CLICK: Record<number, [number, boolean]> = { 1: [0.25, true], 2: [0.125, true], 3: [0.5, true], 4: [1, true], 5: [0.1, false], 6: [0.05, false] };

export const zeroingCalculator: CustomCalculator = (values) => {
  const yd = Math.max(1, nonNeg(values.distance, 100)) * (whole(values.distanceUnit, 1) === 2 ? 1.0936133 : 1);
  const [click, isMoa] = CLICK[whole(values.clickValue, 1)] ?? CLICK[1];
  const perUnit = (isMoa ? MOA_IN_PER_YD : MIL_IN_PER_YD) * yd;
  const vert = num(values.verticalOffset, 2);
  const horiz = num(values.horizontalOffset, -1.5);

  return {
    elevationClicks: Math.round(-vert / perUnit / click),
    windageClicks: Math.round(-horiz / perUnit / click),
    elevationAngle: round2(-vert / perUnit),
    windageAngle: round2(-horiz / perUnit),
  };
};

// --- 12. Windage (wind drift) -------------------------------------------------------------------------------------------------
export const windageCalculator: CustomCalculator = (values) => {
  const s = shotFrom(values);
  const range = clamp(nonNeg(values.range, 500), 10, 2500);
  const p = fly(s, zeroAngle(s), [range])[0];
  const crossMph = nonNeg(values.windSpeed, 10) * Math.abs(Math.sin((nonNeg(values.windClock, 3) * Math.PI) / 6));
  const lag = p ? p.tof - (range * 3) / s.mv : 0;
  const drift = crossMph * 17.6 * lag; // mph -> in/s

  return { driftInches: round2(drift), driftMoa: round2(drift / (MOA_IN_PER_YD * range)), driftMil: round2(drift / (MIL_IN_PER_YD * range)), crosswindMph: round2(crossMph), timeOfFlight: p ? Math.round(p.tof * 1000) / 1000 : 0 };
};

export const otherShootingCustomCalculators: Record<string, CustomCalculator> = {
  "muzzle-energy-calculator": muzzleEnergyCalculator,
  "muzzle-velocity-calculator": muzzleVelocityCalculator,
  "pellet-energy-calculator": pelletEnergyCalculator,
  "airsoft-calculator": airsoftCalculator,
  "rifle-recoil-calculator": rifleRecoilCalculator,
  "scope-height-calculator": scopeHeightCalculator,
  "bullet-drop-calculator": bulletDropCalculator,
  "ballistic-coefficient-calculator": ballisticCoefficientCalculator,
  "bdc-calculator": bdcCalculator,
  "point-blank-range-calculator": pointBlankRangeCalculator,
  "zeroing-calculator": zeroingCalculator,
  "windage-calculator": windageCalculator,
};
