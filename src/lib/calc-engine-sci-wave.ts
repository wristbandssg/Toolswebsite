/**
 * Batch: "Science Calculators" → Physics (waves, sound & optics — 14 tools).
 *
 * c = 299,792,458 m/s, h = 6.62607015 × 10⁻³⁴ J·s, e = 1.602176634 × 10⁻¹⁹ C (exact SI). Speed of
 * sound in air v = 331.3·√(1 + T/273.15). Optics: Snell's law with Fresnel equations, thin lens
 * 1/f = 1/dₒ + 1/dᵢ, grating d·sin θ = mλ, Rayleigh criterion 1.22λ/D, Gaussian beams with M².
 * Large-angle pendulum period from the arithmetic-geometric mean (exact). See
 * prisma/create-sci-wave-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
export const C = 299792458, H = 6.62607015e-34, QE = 1.602176634e-19;
const RAD = Math.PI / 180;
const soundAir = (T: number) => 331.3 * Math.sqrt(1 + T / 273.15);
const band = (lm: number) => (lm < 1e-11 ? "gamma rays" : lm < 1e-8 ? "X-rays" : lm < 380e-9 ? "ultraviolet" : lm <= 750e-9 ? "visible light" : lm < 1e-3 ? "infrared" : lm < 1 ? "microwave" : "radio");

export const WAVE_MEDIUM = ["Light / EM wave in vacuum (c)", "Sound in air at 20 °C (343 m/s)", "Custom wave speed"];
export const WAVE_SOLVE = ["Frequency from wavelength", "Wavelength from frequency"];
export const wavelengthFrequency: SciCalculator = (v) => {
  const med = pick(v.medium, 3), speed = med === 0 ? C : med === 1 ? 343.2 : pos(v.speed, 1500);
  const solveF = pick(v.solve, 2) === 0;
  const lam = solveF ? pos(v.lambda, 500e-9) : speed / pos(v.f, 1e9), f = solveF ? speed / pos(v.lambda, 500e-9) : pos(v.f, 1e9);
  if (!Number.isFinite(lam) || !Number.isFinite(f)) throw new InputError("Enter a positive wavelength or frequency.");
  return { f: s(f), lambda: s(lam), nm: s(lam * 1e9), period: s(1 / f), energy: med === 0 ? s((H * f) / QE, 8) : "—", band: med === 0 ? band(lam) : "—", k: s((2 * Math.PI) / lam) };
};
export const reflection: SciCalculator = (v) => {
  const th = num(v.angle, 30), n1 = pos(v.n1, 1), n2 = pos(v.n2, 1.5);
  const R0 = ((n1 - n2) / (n1 + n2)) ** 2, sin2 = (n1 / n2) * Math.sin(th * RAD);
  let R: number;
  if (Math.abs(sin2) >= 1) R = 1;
  else {
    const ci = Math.cos(th * RAD), ct = Math.sqrt(1 - sin2 * sin2);
    const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2, rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
    R = (rs + rp) / 2;
  }
  return { reflected: s(th, 8), R: s(100 * R, 8), T: s(100 * (1 - R), 8), R0: s(100 * R0, 8), tir: Math.abs(sin2) >= 1 ? "Total internal reflection" : "Partial reflection" };
};
export const LENS_SOLVE = ["Focal length f", "Object distance dₒ", "Image distance dᵢ"];
export const thinLens: SciCalculator = (v) => {
  const k = pick(v.solve, 3), f = num(v.f, 10), d0 = num(v.do, 30), di = num(v.di, 15);
  const r = k === 0 ? [1 / (1 / d0 + 1 / di), d0, di] : k === 1 ? [f, 1 / (1 / f - 1 / di), di] : [f, d0, 1 / (1 / f - 1 / d0)];
  const [F, Do, Di] = r;
  if (!r.every(Number.isFinite)) throw new InputError("No finite answer — the object may be exactly at the focal point (image at infinity).");
  const m = -Di / Do;
  return { result: s(r[k]), f: s(F), do: s(Do), di: s(Di), m: s(m, 8), nature: `${Di > 0 ? "real, inverted" : "virtual, upright"}, ${Math.abs(m) > 1 ? "magnified" : Math.abs(m) < 1 ? "diminished" : "same size"}`, power: s(100 / F, 8) };
};
export const SOUND_MEDIUM = ["Air (temperature below)", "Ideal gas (γ, molar mass)", "Fresh water (1,481 m/s)", "Seawater (1,522 m/s)", "Steel (5,960 m/s)", "Aluminium (6,320 m/s)", "Glass (5,640 m/s)", "Wood, pine (3,300 m/s)", "Helium at 20 °C (1,007 m/s)"];
const FIXED = [0, 0, 1481, 1522, 5960, 6320, 5640, 3300, 1007];
export const speedOfSound: SciCalculator = (v) => {
  const m = pick(v.medium, SOUND_MEDIUM.length), T = num(v.T, 20);
  let c: number;
  if (m === 0) c = soundAir(T);
  else if (m === 1) c = Math.sqrt((pos(v.gamma, 1.4) * 8.314462618 * (T + 273.15)) / (pos(v.M, 28.97) / 1000));
  else c = FIXED[m];
  if (!Number.isFinite(c)) throw new InputError("Temperature is below absolute zero.");
  const f = pos(v.f, 0), d = pos(v.d, 0);
  return { c: s(c, 8), kmh: s(c * 3.6, 8), mph: s(c / 0.44704, 8), fts: s(c / 0.3048, 8), lambda: f ? s(c / f, 8) : "enter frequency", delay: d ? s(d / c, 8) : "enter distance" };
};
export const snell: SciCalculator = (v) => {
  const n1 = pos(v.n1, 1), n2 = pos(v.n2, 1.5), th = num(v.angle, 30) * RAD;
  const sn = (n1 / n2) * Math.sin(th), crit = n1 > n2 ? Math.asin(n2 / n1) / RAD : NaN;
  if (Math.abs(sn) > 1) return { theta2: "total internal reflection", critical: s(crit, 8), brewster: s(Math.atan(n2 / n1) / RAD, 8), Rs: 100, Rp: 100, R: 100 };
  const t2 = Math.asin(sn), ci = Math.cos(th), ct = Math.cos(t2);
  const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2, rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2;
  return { theta2: s(t2 / RAD, 10), critical: Number.isFinite(crit) ? s(crit, 8) : "none (n₁ < n₂)", brewster: s(Math.atan(n2 / n1) / RAD, 8), Rs: s(100 * rs, 8), Rp: s(100 * rp, 8), R: s(50 * (rs + rp), 8) };
};
export const helmholtz: SciCalculator = (v) => {
  const d = pos(v.d, 0.05), L = pos(v.L, 0.1), V = pos(v.V, 10) / 1000, c = soundAir(num(v.T, 20)), endK = pick(v.ends, 2) === 0 ? 1.7 : 1.5;
  if (!d || !V) throw new InputError("Neck diameter and volume must be positive.");
  const r = d / 2, A = Math.PI * r * r, Le = L + endK * r;
  const f = (c / (2 * Math.PI)) * Math.sqrt(A / (V * Le));
  return { f: s(f, 8), Le: s(Le, 8), area: s(A, 8), c: s(c, 6), lambda: s(c / f, 6) };
};
export const ENDS = ["Flanged neck (end correction 1.7r)", "Unflanged neck (1.5r)"];
export const DOPPLER_TYPE = ["Sound (classical)", "Light (relativistic, radial)"];
export const doppler: SciCalculator = (v) => {
  const f0 = pos(v.f, 440);
  if (pick(v.type, 2) === 1) {
    const b = num(v.vs, 1e7) / C;
    if (Math.abs(b) >= 1) throw new InputError("Speed must be below the speed of light.");
    const f = f0 * Math.sqrt((1 + b) / (1 - b));
    return { f: s(f), shift: s(f - f0), ratio: s(f / f0, 10), z: s(f0 / f - 1, 10), note: "Positive speed = approaching (blueshift)." };
  }
  const c = pos(v.c, 343), vo = num(v.vo, 0), vs = num(v.vs, 30);
  if (vs >= c) throw new InputError("The source is at or above the wave speed (sonic boom) — the formula breaks down.");
  const f = (f0 * (c + vo)) / (c - vs);
  return { f: s(f), shift: s(f - f0), ratio: s(f / f0, 10), z: s(f0 / f - 1, 10), note: "Positive speeds = moving toward each other; receding: f = f₀(c − v_o)/(c + v_s)." };
};
export const gaussianBeam: SciCalculator = (v) => {
  const lam = pos(v.lambda, 1064) * 1e-9, D = pos(v.D, 5) * 1e-3, f = pos(v.f, 100) * 1e-3, M2 = Math.max(1, pos(v.M2, 1)), z = num(v.z, 0) * 1e-3;
  if (!D || !f) throw new InputError("Beam diameter and focal length must be positive.");
  const w0 = (2 * lam * f * M2) / (Math.PI * D), zR = (Math.PI * w0 * w0) / (lam * M2), wz = w0 * Math.sqrt(1 + (z / zR) ** 2);
  return { spot: s(2 * w0 * 1e6, 8), zR: s(zR * 1e3, 8), dof: s(2 * zR * 1e3, 8), div: s(((M2 * lam) / (Math.PI * w0)) * 1e3, 8), wz: s(2 * wz * 1e6, 8) };
};
export const thinFilm: SciCalculator = (v) => {
  const n0 = pos(v.n0, 1), n1 = pos(v.n1, 1.38), n2 = pos(v.n2, 1.52), d = pos(v.d, 100) * 1e-9, th = num(v.angle, 0) * RAD, lam = pos(v.lambda, 550) * 1e-9;
  const st = (n0 / n1) * Math.sin(th);
  if (Math.abs(st) >= 1) throw new InputError("Light can't enter the film at that angle.");
  const opd = 2 * n1 * d * Math.sqrt(1 - st * st), flips = (n1 > n0 ? 1 : 0) + (n2 > n1 ? 1 : 0), half = flips % 2 === 1;
  const con: string[] = [], des: string[] = [];
  for (let m = 0; m < 60; m++) {
    const lc = half ? opd / (m + 0.5) : m ? opd / m : Infinity, ld = half ? (m ? opd / m : Infinity) : opd / (m + 0.5);
    if (lc >= 380e-9 && lc <= 780e-9) con.push(`${fmt(lc * 1e9, 5)} nm (m=${m})`);
    if (ld >= 380e-9 && ld <= 780e-9) des.push(`${fmt(ld * 1e9, 5)} nm (m=${m})`);
  }
  const ct = Math.sqrt(1 - st * st), dmin = half ? lam / (2 * n1 * ct) : lam / (4 * n1 * ct);
  return { constructive: con.length ? con.join(", ") : "none in 380–780 nm", destructive: des.length ? des.join(", ") : "none in 380–780 nm", opd: s(opd * 1e9, 8), shifts: `${flips} reflection phase flip(s) → ${half ? "net half-wave shift" : "no net shift"}`, minAR: s(dmin * 1e9, 8) };
};
const agm = (a: number, b: number) => {
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return a;
};
export const PEND_MODE = ["Find period from length", "Find length from period"];
export const pendulum: SciCalculator = (v) => {
  const g = pos(v.g, 9.80665) || 9.80665, th0 = Math.min(179.9, Math.abs(num(v.amp, 10))) * RAD;
  const corr = 1 / agm(1, Math.cos(th0 / 2));
  let L: number, T0: number;
  if (pick(v.mode, 2) === 0) {
    L = pos(v.L, 1);
    T0 = 2 * Math.PI * Math.sqrt(L / g);
  } else {
    T0 = pos(v.T, 2) / corr;
    L = g * (T0 / (2 * Math.PI)) ** 2;
  }
  return { T: s(T0 * corr), T0: s(T0), L: s(L), f: s(1 / (T0 * corr)), vmax: s(Math.sqrt(2 * g * L * (1 - Math.cos(th0)))) };
};
export const spl: SciCalculator = (v) => {
  const L1 = num(v.L1, 90), r1 = pos(v.r1, 1), r2 = pos(v.r2, 10), src = txt(v, "add");
  if (!r1 || !r2) throw new InputError("Distances must be positive.");
  const L2 = L1 - 20 * Math.log10(r2 / r1), p = 20e-6 * 10 ** (L1 / 20);
  const lv = src ? listOf(v, "add", 1) : [];
  return { L2: s(L2, 8), drop: s(L1 - L2, 8), pressure: s(p, 8), total: lv.length ? s(10 * Math.log10(sum(lv.map((x) => 10 ** (x / 10)))), 8) : "enter levels to add", intensity: s(1e-12 * 10 ** (L1 / 10), 8) };
};
export const grating: SciCalculator = (v) => {
  const N = pos(v.lines, 600), lam = pos(v.lambda, 532) * 1e-9, m = Math.round(num(v.m, 1)), D = pos(v.D, 0);
  if (!N) throw new InputError("Lines per mm must be positive.");
  const d = 1e-3 / N, sn = (m * lam) / d;
  const ray = D ? 1.22 * lam / (D * 1e-3) : NaN;
  return { angle: Math.abs(sn) <= 1 ? s(Math.asin(sn) / RAD, 10) : "order not possible", spacing: s(d * 1e6, 8), maxOrder: Math.floor(d / lam), resolution: Number.isFinite(ray) ? `${fmt(ray, 6)} rad = ${fmt((ray / RAD) * 3600, 6)} arcsec` : "enter aperture D", airy: Number.isFinite(ray) ? "Airy disk angular radius = 1.22λ/D" : "—" };
};
export const FLUENCE_MODE = ["Pulse energy known", "Average power and repetition rate"];
export const fluence: SciCalculator = (v) => {
  const E = pick(v.mode, 2) === 0 ? pos(v.E, 10) / 1000 : pos(v.P, 5) / Math.max(1e-12, pos(v.rep, 1000));
  const d = pos(v.d, 1) / 10, tau = pos(v.tau, 10) * 1e-9, Pavg = pick(v.mode, 2) === 0 ? E * pos(v.rep, 10) : pos(v.P, 5);
  if (!d) throw new InputError("Beam diameter must be positive.");
  const A = (Math.PI * d * d) / 4, F = E / A;
  return { fluence: s(F, 8), peakFluence: s(2 * F, 8), energy: s(E * 1000, 8), peakPower: tau ? s(E / tau, 8) : "—", intensity: tau ? s(E / tau / A, 8) : "—", avgDensity: s(Pavg / A, 8) };
};
export const NA_MODE = ["Lens / objective (n and half-angle)", "Optical fibre (core and cladding)"];
export const numericalAperture: SciCalculator = (v) => {
  const lam = pos(v.lambda, 550) * 1e-9, n = pos(v.n, 1);
  let NA: number;
  if (pick(v.mode, 2) === 0) NA = n * Math.sin(Math.min(90, Math.abs(num(v.angle, 30))) * RAD);
  else {
    const c = pos(v.core, 1.48), cl = pos(v.clad, 1.46);
    if (cl >= c) throw new InputError("Core index must be greater than cladding index.");
    NA = Math.sqrt(c * c - cl * cl);
  }
  return { NA: s(NA, 8), accept: NA / n <= 1 ? s(Math.asin(NA / n) / RAD, 8) : "—", res: s((0.61 * lam) / NA * 1e9, 8), dof: s(((lam * n) / (NA * NA)) * 1e6, 8), fnum: s(1 / (2 * NA), 6) };
};

export const sciWaveCustomCalculators: Record<string, SciCalculator> = {
  "wavelength-frequency-calculator": wavelengthFrequency,
  "reflection-calculator": reflection,
  "thin-lens-calculator": thinLens,
  "speed-of-sound-calculator": speedOfSound,
  "snells-law-calculator": snell,
  "helmholtz-resonator-calculator": helmholtz,
  "doppler-effect-calculator": doppler,
  "gaussian-beam-calculator": gaussianBeam,
  "thin-film-calculator": thinFilm,
  "pendulum-calculator": pendulum,
  "sound-pressure-level-calculator": spl,
  "diffraction-grating-calculator": grating,
  "laser-fluence-calculator": fluence,
  "numerical-aperture-calculator": numericalAperture,
};
