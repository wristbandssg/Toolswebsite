/**
 * Batch: "Science Calculators" → Mechanical & Structural Engineering (strength of materials, beams,
 * columns, tolerances & quality — 29 tools).
 *
 * Section properties for common shapes (composite I and T sections by parallel-axis theorem).
 * Beam deflection from standard closed-form cases (Euler-Bernoulli). Euler/Johnson column
 * buckling with effective-length factors 0.5/0.699/1/2. ISO 286 tolerance grades from the
 * standard tolerance unit i = 0.45∛D + 0.001D (µm) and the fundamental-deviation formulas
 * (results may differ from the printed tables by about 1 µm due to rounding). Hardness conversion
 * interpolates approximate ASTM E140 values for steel. 2-D trusses solved by the direct stiffness
 * method. Catenary sag solved for the parameter a by bisection. See
 * prisma/create-sci-struct-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, mean, variance, sum, normCdf } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};

// ---------- section properties ----------
export const SHAPES = ["Rectangle (b × h)", "Solid circle (d)", "Hollow circle (D, d)", "Hollow rectangle (B × H, wall t)", "I-beam (flange b × tf, depth h, web tw)", "T-section (flange b × tf, depth h, web tw)", "Triangle (b × h)"];
export function section(v: Vals) {
  const k = pick(v.shape, SHAPES.length), b = pos(v.b, 100), h = pos(v.h, 200), d = pos(v.d, 50), t = pos(v.t, 10), tf = pos(v.tf, 12), tw = pos(v.tw, 8);
  let A: number, Ix: number, Iy: number, cy: number, Zx: number, depth: number, width: number;
  if (k === 0) { A = b * h; Ix = (b * h ** 3) / 12; Iy = (h * b ** 3) / 12; cy = h / 2; Zx = (b * h * h) / 4; depth = h; width = b; }
  else if (k === 1) { A = (Math.PI * d * d) / 4; Ix = Iy = (Math.PI * d ** 4) / 64; cy = d / 2; Zx = d ** 3 / 6; depth = width = d; }
  else if (k === 2) {
    const D = pos(v.D, 60); if (d >= D) throw new InputError("Inner diameter must be smaller than outer.");
    A = (Math.PI * (D * D - d * d)) / 4; Ix = Iy = (Math.PI * (D ** 4 - d ** 4)) / 64; cy = D / 2; Zx = (D ** 3 - d ** 3) / 6; depth = width = D;
  } else if (k === 3) {
    if (2 * t >= Math.min(b, h)) throw new InputError("Wall too thick for the outer size.");
    const bi = b - 2 * t, hi = h - 2 * t; A = b * h - bi * hi; Ix = (b * h ** 3 - bi * hi ** 3) / 12; Iy = (h * b ** 3 - hi * bi ** 3) / 12; cy = h / 2; Zx = (b * h * h - bi * hi * hi) / 4; depth = h; width = b;
  } else if (k === 4) {
    const hw = h - 2 * tf; if (hw <= 0) throw new InputError("Flanges are thicker than the depth.");
    A = 2 * b * tf + hw * tw; Ix = (b * h ** 3 - (b - tw) * hw ** 3) / 12; Iy = (2 * tf * b ** 3 + hw * tw ** 3) / 12; cy = h / 2; Zx = b * tf * (h - tf) + (tw * hw * hw) / 4; depth = h; width = b;
  } else if (k === 5) {
    const hw = h - tf; if (hw <= 0) throw new InputError("Flange is thicker than the depth.");
    const A1 = b * tf, A2 = hw * tw; A = A1 + A2;
    const yb = (A1 * (h - tf / 2) + A2 * (hw / 2)) / A;
    Ix = (b * tf ** 3) / 12 + A1 * (h - tf / 2 - yb) ** 2 + (tw * hw ** 3) / 12 + A2 * (hw / 2 - yb) ** 2; Iy = (tf * b ** 3 + hw * tw ** 3) / 12; cy = Math.max(yb, h - yb);
    const yp = A / 2 <= A2 ? A / 2 / tw : hw + (A / 2 - A2) / b;
    Zx = yp <= hw ? (tw * yp * yp) / 2 + (tw * (hw - yp) ** 2) / 2 + A1 * (h - tf / 2 - yp) : 0;
    depth = h; width = b;
  } else { A = (b * h) / 2; Ix = (b * h ** 3) / 36; Iy = (h * b ** 3) / 48; cy = (2 * h) / 3; Zx = 0.0976 * b * h * h; depth = h; width = b; }
  return { A, Ix, Iy, cy, Sx: Ix / cy, Sy: Iy / (width / 2), Zx, rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A), depth };
}
export const momentOfInertia: SciCalculator = (v) => {
  const r = section(v);
  return { Ix: s(r.Ix, 8), Iy: s(r.Iy, 8), A: s(r.A, 8), cy: s(r.cy, 8), rx: s(r.rx, 6), ry: s(r.ry, 6), cm4: s(r.Ix / 1e4, 8) };
};
export const sectionModulus: SciCalculator = (v) => {
  const r = section(v);
  return { Sx: s(r.Sx, 8), Sy: s(r.Sy, 8), Zx: r.Zx ? s(r.Zx, 8) : "—", shape: r.Zx ? s(r.Zx / r.Sx, 5) : "—", Ix: s(r.Ix, 8), A: s(r.A, 8), cm3: s(r.Sx / 1000, 8) };
};

// ---------- materials ----------
const MAT: [string, number, number, number, number][] = [ // name, E GPa, α µm/m·K, yield MPa, density kg/m³
  ["Structural steel (S275 / A36)", 200, 12, 250, 7850], ["Stainless steel 304", 193, 17.3, 215, 8000], ["Aluminium 6061-T6", 69, 23.6, 276, 2700], ["Copper", 117, 16.6, 70, 8960], ["Brass", 100, 19, 200, 8500], ["Titanium Ti-6Al-4V", 114, 8.6, 880, 4430],
  ["Cast iron (grey)", 110, 10.8, 200, 7200], ["Concrete", 30, 10, 30, 2400], ["Glass", 70, 9, 50, 2500], ["Douglas fir (along grain)", 13, 3.5, 50, 530], ["PVC", 3, 52, 50, 1400], ["Carbon fibre CFRP (UD)", 135, 0.5, 1500, 1600],
];
export const MATERIALS = MAT.map((m) => m[0]);
export const EXP_MODE = ["Linear expansion", "Volumetric expansion", "Thermal stress if fully restrained"];
export const thermalExpansion: SciCalculator = (v) => {
  const k = pick(v.mat, MAT.length + 1), custom = k === MAT.length, a = (custom ? pos(v.alpha, 12) : MAT[k][2]) * 1e-6, E = (custom ? pos(v.E, 200) : MAT[k][1]) * 1e9, L = pos(v.L, 1000), dT = num(v.T2, 80) - num(v.T1, 20), m = pick(v.mode, 3);
  if (m === 1) { const dV = 3 * a * L * dT; return { result: s(dV, 8), final: s(L + dV, 10), strain: s(3 * a * dT * 1e6, 6), stress: "—" }; }
  const dL = a * L * dT;
  return { result: m === 2 ? s((E * a * dT) / 1e6, 8) : s(dL, 8), final: s(L + dL, 10), strain: s(a * dT * 1e6, 6), stress: s((E * a * dT) / 1e6, 8) };
};
export const youngsModulus: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) { const sg = pos(v.stress, 250), e = pos(v.strain, 0.00125); return { E: s(sg / e / 1000, 8), stress: s(sg, 8), strain: s(e, 8), ksi: s((sg / e) * 0.1450377, 6) }; }
  const F = pos(v.F, 10000), A = pos(v.A, 50), L = pos(v.L, 100), dL = pos(v.dL, 0.1), sg = F / A, e = dL / L;
  return { E: s(fin(sg / e) / 1000, 8), stress: s(sg, 8), strain: s(e, 8), ksi: s((sg / e) * 0.1450377, 6) };
};
export const YM_MODE = ["From a tensile test (force, area, extension)", "From stress and strain"];
export const SS_MODE = ["Stress from force and area", "Strain from extension", "Stress from strain (Hooke's law)", "Shear stress from force and area"];
export const stressStrain: SciCalculator = (v) => {
  const m = pick(v.mode, 4), F = pos(v.F, 10000), A = pos(v.A, 50), L = pos(v.L, 1000), dL = pos(v.dL, 0.5), E = pos(v.E, 200) * 1000, e = pos(v.e, 0.001);
  if (m === 0) return { result: s(F / A, 8), unit: "MPa (N/mm²)", alt: `${fmt((F / A) * 145.0377, 6)} psi; strain at E = ${fmt(F / A / E, 6)}` };
  if (m === 1) return { result: s(dL / L, 8), unit: "strain (mm/mm)", alt: `${fmt((dL / L) * 1e6, 6)} µε, ${fmt((100 * dL) / L, 5)}%; stress at E = ${fmt((E * dL) / L, 6)} MPa` };
  if (m === 2) return { result: s(E * e, 8), unit: "MPa", alt: `σ = E·ε with E = ${fmt(E / 1000)} GPa` };
  return { result: s(F / A, 8), unit: "MPa shear", alt: "τ = F/A (single shear)" };
};
export const strengthWeight: SciCalculator = (v) => {
  const k1 = pick(v.m1, MAT.length + 1), k2 = pick(v.m2, MAT.length + 1);
  const get = (k: number, sKey: string, dKey: string): [number, number, string] => (k === MAT.length ? [pos(v[sKey], 500), pos(v[dKey], 2000), "Custom"] : [MAT[k][3], MAT[k][4], MAT[k][0]]);
  const [s1, d1, n1] = get(k1, "s1", "d1"), [s2, d2, n2] = get(k2, "s2", "d2"), sp1 = (s1 * 1e6) / d1 / 1000, sp2 = (s2 * 1e6) / d2 / 1000;
  return { sp1: s(sp1, 6), sp2: s(sp2, 6), len1: s((s1 * 1e6) / (d1 * 9.80665) / 1000, 6), ratio: s(sp1 / sp2, 6), better: sp1 > sp2 ? `${n1} is ${fmt(sp1 / sp2, 4)}× stronger per kg` : `${n2} is ${fmt(sp2 / sp1, 4)}× stronger per kg` };
};
export const carbonEquivalent: SciCalculator = (v) => {
  const C = pos(v.C, 0.2), Mn = pos(v.Mn, 1.2), Cr = pos(v.Cr, 0.1), Mo = pos(v.Mo, 0.05), V = pos(v.V, 0.01), Ni = pos(v.Ni, 0.1), Cu = pos(v.Cu, 0.1), Si = pos(v.Si, 0.3), B = pos(v.B, 0);
  const ce = C + Mn / 6 + (Cr + Mo + V) / 5 + (Ni + Cu) / 15, pcm = C + Si / 30 + (Mn + Cu + Cr) / 20 + Ni / 60 + Mo / 15 + V / 10 + 5 * B;
  return { ce: s(ce, 5), pcm: s(pcm, 5), rating: ce <= 0.35 ? "Excellent weldability" : ce <= 0.45 ? "Good — preheat may be needed for thick sections" : ce <= 0.6 ? "Fair — preheat (~100–200 °C) recommended" : "Poor — high preheat and low-hydrogen practice required", preheat: ce <= 0.45 ? "none / up to 100 °C" : ce <= 0.6 ? "100–200 °C" : "200–350 °C" };
};
export const pren: SciCalculator = (v) => {
  const Cr = pos(v.Cr, 17), Mo = pos(v.Mo, 2.1), N = pos(v.N, 0.05), W = pos(v.W, 0), p = Cr + 3.3 * (Mo + 0.5 * W) + 16 * N;
  return { pren: s(p, 5), rating: p < 20 ? "Low — indoor / mild environments (e.g. 304)" : p < 32 ? "Moderate — e.g. 316, coastal atmospheres" : p < 40 ? "High — duplex 2205, chloride service" : "Very high — super-duplex / 6Mo, seawater", typical: "304 ≈ 19, 316 ≈ 24, 2205 ≈ 35, 2507 ≈ 42" };
};
const HV_TAB: [number, number | null, number | null, number | null][] = [[100, 95, null, 56], [120, 114, null, 67], [140, 133, null, 75], [160, 152, null, 82], [180, 171, null, 87], [200, 190, null, 92], [220, 209, null, 96], [240, 228, 20.3, 99.5], [260, 247, 24, null], [280, 266, 27.1, null], [300, 285, 29.8, null], [320, 304, 32.2, null], [340, 323, 34.4, null], [360, 342, 36.6, null], [380, 361, 38.8, null], [400, 380, 40.8, null], [420, 399, 42.7, null], [440, 418, 44.5, null], [460, 437, 46.1, null], [480, 456, 47.7, null], [500, 475, 49.1, null], [550, 523, 52.3, null], [600, 570, 55.2, null], [650, 618, 57.8, null], [700, 665, 60.1, null], [750, null, 62.2, null], [800, null, 64, null], [850, null, 65.5, null], [900, null, 67, null], [940, null, 68, null]];
export const HARD_SCALES = ["Vickers HV", "Brinell HB", "Rockwell C (HRC)", "Rockwell B (HRB)"];
const interp = (x: number, xs: number[], ys: number[]) => {
  for (let i = 0; i < xs.length - 1; i++) if ((x - xs[i]) * (x - xs[i + 1]) <= 0) return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / (xs[i + 1] - xs[i]);
  return NaN;
};
export const hardness: SciCalculator = (v) => {
  const sc = pick(v.scale, 4), x = pos(v.x, 45), col = sc === 0 ? 0 : sc;
  const rows = HV_TAB.filter((r) => r[col] !== null), HV = sc === 0 ? x : interp(x, rows.map((r) => r[col] as number), rows.map((r) => r[0]));
  if (!Number.isFinite(HV) || HV < 100 || HV > 940) throw new InputError("Value outside the conversion range (about HV 100–940).");
  const get = (c: number) => { const rr = HV_TAB.filter((r) => r[c] !== null); const y = interp(HV, rr.map((r) => r[0]), rr.map((r) => r[c] as number)); return Number.isFinite(y) ? s(y, 4) : "—"; };
  return { HV: s(HV, 4), HB: get(1), HRC: get(2), HRB: get(3), uts: s(3.3 * HV, 4) };
};

// ---------- beams, stresses ----------
export const BEAM_CASES = ["Simply supported, point load at centre", "Simply supported, uniform load", "Simply supported, point load at distance a", "Cantilever, point load at free end", "Cantilever, uniform load", "Fixed both ends, uniform load", "Fixed both ends, point load at centre"];
export const beamDeflection: SciCalculator = (v) => {
  const k = pick(v.case, 7), L = pos(v.L, 4000), P = pos(v.P, 10) * 1000, w = pos(v.w, 5), E = pos(v.E, 200) * 1000, I = pos(v.I, 8356) * 1e4, a = Math.min(L, pos(v.a, 1000)), c = pos(v.c, 0);
  if (!E || !I || !L) throw new InputError("Span, E and I must be positive.");
  let d: number, M: number, R: string, th: number;
  if (k === 0) { d = (P * L ** 3) / (48 * E * I); M = (P * L) / 4; R = `${fmt(P / 2000, 6)} kN each`; th = (P * L * L) / (16 * E * I); }
  else if (k === 1) { d = (5 * w * L ** 4) / (384 * E * I); M = (w * L * L) / 8; R = `${fmt((w * L) / 2000, 6)} kN each`; th = (w * L ** 3) / (24 * E * I); }
  else if (k === 2) { const b = L - a, xm = Math.sqrt((L * L - b * b) / 3); d = a >= b ? (P * b * (L * L - b * b) ** 1.5) / (9 * Math.sqrt(3) * E * I * L) : (P * a * (L * L - a * a) ** 1.5) / (9 * Math.sqrt(3) * E * I * L); M = (P * a * b) / L; R = `R₁ = ${fmt((P * b) / L / 1000, 6)} kN, R₂ = ${fmt((P * a) / L / 1000, 6)} kN (max deflection near x = ${fmt(xm, 5)} mm)`; th = (P * a * b * (L + b)) / (6 * E * I * L); }
  else if (k === 3) { d = (P * L ** 3) / (3 * E * I); M = P * L; R = `${fmt(P / 1000, 6)} kN, moment ${fmt((P * L) / 1e6, 6)} kN·m at the wall`; th = (P * L * L) / (2 * E * I); }
  else if (k === 4) { d = (w * L ** 4) / (8 * E * I); M = (w * L * L) / 2; R = `${fmt((w * L) / 1000, 6)} kN at the wall`; th = (w * L ** 3) / (6 * E * I); }
  else if (k === 5) { d = (w * L ** 4) / (384 * E * I); M = (w * L * L) / 12; R = `${fmt((w * L) / 2000, 6)} kN each; midspan moment ${fmt((w * L * L) / 24 / 1e6, 6)} kN·m`; th = 0; }
  else { d = (P * L ** 3) / (192 * E * I); M = (P * L) / 8; R = `${fmt(P / 2000, 6)} kN each`; th = 0; }
  return { d: s(d, 6), M: s(M / 1e6, 6), R, slope: s((th * 180) / Math.PI, 6), ratio: `L/${fmt(L / d, 4)}`, stress: c ? s((M * c) / I, 6) : "enter c for stress" };
};
export const BS_MODE = ["From moment, I and distance c", "From moment and section modulus S"];
export const bendingStress: SciCalculator = (v) => {
  const M = num(v.M, 20) * 1e6, sg = pick(v.mode, 2) === 0 ? (M * pos(v.c, 100)) / (pos(v.I, 8356) * 1e4) : M / (pos(v.S, 836) * 1e3), fy = pos(v.fy, 250);
  return { stress: s(fin(sg), 8), ksi: s(sg * 0.1450377, 6), util: s((100 * Math.abs(sg)) / fy, 5), ok: Math.abs(sg) <= fy ? "Below yield" : "Exceeds yield" };
};
export const SHEAR_MODE = ["Average shear τ = V/A", "Max beam shear, rectangular section (1.5 V/A)", "Max beam shear, solid circle (4/3 V/A)", "Fluid shear rate (velocity ÷ gap)", "Fluid shear rate in a pipe (8V/D)"];
export const shearStress: SciCalculator = (v) => {
  const m = pick(v.mode, 5), V = pos(v.V, 10) * 1000, A = pos(v.A, 1000);
  if (m === 3) { const r = pos(v.vel, 1) / (pos(v.gap, 1) / 1000); return { result: s(r, 8), unit: "1/s shear rate", tau: pos(v.mu, 0) ? s(pos(v.mu, 0) * r, 8) : "enter viscosity for stress" }; }
  if (m === 4) { const r = (8 * pos(v.vel, 1)) / (pos(v.gap, 50) / 1000); return { result: s(r, 8), unit: "1/s wall shear rate", tau: pos(v.mu, 0) ? s(pos(v.mu, 0) * r, 8) : "enter viscosity for stress" }; }
  const f = m === 0 ? 1 : m === 1 ? 1.5 : 4 / 3;
  return { result: s((f * V) / A, 8), unit: "MPa", tau: s(((f * V) / A) * 145.0377, 6) };
};
export const mohr: SciCalculator = (v) => {
  const sx = num(v.sx, 80), sy = num(v.sy, -40), t = num(v.txy, 30), th = (num(v.th, 30) * Math.PI) / 180;
  const c = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, t), tp = (0.5 * Math.atan2(2 * t, sx - sy) * 180) / Math.PI;
  const sxp = c + ((sx - sy) / 2) * Math.cos(2 * th) + t * Math.sin(2 * th), syp = c - ((sx - sy) / 2) * Math.cos(2 * th) - t * Math.sin(2 * th), txp = -((sx - sy) / 2) * Math.sin(2 * th) + t * Math.cos(2 * th);
  return { s1: s(c + R, 8), s2: s(c - R, 8), tmax: s(R, 8), angle: s(tp, 6), center: s(c, 8), rotated: `σx′ = ${fmt(sxp, 6)}, σy′ = ${fmt(syp, 6)}, τx′y′ = ${fmt(txp, 6)}` };
};
export const principalStress: SciCalculator = (v) => {
  const sx = num(v.sx, 80), sy = num(v.sy, -40), sz = num(v.sz, 0), t = num(v.txy, 30), kt = pos(v.kt, 1) || 1, fy = pos(v.fy, 250);
  const c = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, t), p = [c + R, c - R, sz].map((x) => x * kt).sort((a, b) => b - a);
  const vm = Math.sqrt(((p[0] - p[1]) ** 2 + (p[1] - p[2]) ** 2 + (p[2] - p[0]) ** 2) / 2), tr = p[0] - p[2];
  return { vm: s(vm, 8), s1: s(p[0], 8), s2: s(p[1], 8), s3: s(p[2], 8), tresca: s(tr, 8), fos: s(fy / vm, 5) };
};
export const torsion: SciCalculator = (v) => {
  const T = num(v.T, 500) * 1000, d = pos(v.d, 40), di = pos(v.di, 0), L = pos(v.L, 1000), G = pos(v.G, 79.3) * 1000, allow = pos(v.allow, 0), rpm = pos(v.rpm, 0);
  if (di >= d) throw new InputError("Inner diameter must be smaller than the outer diameter.");
  const J = (Math.PI * (d ** 4 - di ** 4)) / 32, tau = (T * d) / (2 * J), th = (T * L) / (G * J);
  const dreq = allow ? ((16 * Math.abs(T)) / (Math.PI * allow)) ** (1 / 3) : NaN;
  return { tau: s(tau, 8), twist: s((th * 180) / Math.PI, 6), J: s(J, 8), power: rpm ? s(((T / 1000) * rpm * 2 * Math.PI) / 60 / 1000, 6) : "enter rpm", dreq: Number.isFinite(dreq) ? s(dreq, 6) : "enter allowable stress" };
};
export const HOOP_MODE = ["Thin-wall stresses from pressure", "Required wall thickness (Barlow)", "Thick-wall (Lamé) stresses"];
export const hoopStress: SciCalculator = (v) => {
  const m = pick(v.mode, 3), P = pos(v.P, 2), D = pos(v.D, 500), t = pos(v.t, 10), S = pos(v.S, 138), E = pos(v.E, 1) || 1, ca = pos(v.ca, 0);
  if (m === 1) { const tr = (P * D) / (2 * S * E) + ca; return { hoop: s(S, 6), axial: s(S / 2, 6), t: s(tr, 6), note: `Barlow t = PD/(2SE) + corrosion allowance; ASME VIII t = PR/(SE − 0.6P) = ${fmt((P * D) / 2 / (S * E - 0.6 * P) + ca, 6)} mm` }; }
  if (m === 2) {
    const ri = D / 2, ro = ri + t, hoop = (P * ri * ri * (ro * ro + ri * ri)) / (ri * ri * (ro * ro - ri * ri)), ax = (P * ri * ri) / (ro * ro - ri * ri);
    return { hoop: s(hoop, 6), axial: s(ax, 6), t: s(t, 6), note: `Lamé: inner-surface hoop stress; radial stress = −${fmt(P)} MPa` };
  }
  return { hoop: s((P * D) / (2 * t), 6), axial: s((P * D) / (4 * t), 6), t: s(t, 6), note: D / t < 20 ? "D/t < 20 — use the thick-wall (Lamé) option" : "Thin-wall valid (D/t ≥ 20)" };
};
export const END_COND = ["Both ends pinned (K = 1)", "Both ends fixed (K = 0.5)", "One fixed, one pinned (K = 0.699)", "One fixed, one free (K = 2)"];
const KEFF = [1, 0.5, 0.699, 2];
export const buckling: SciCalculator = (v) => {
  const E = pos(v.E, 200) * 1000, I = pos(v.I, 1000) * 1e4, A = pos(v.A, 5000), L = pos(v.L, 3000), K = KEFF[pick(v.end, 4)], fy = pos(v.fy, 250), sf = pos(v.sf, 2) || 1;
  const Le = K * L, r = Math.sqrt(I / A), sl = Le / r, Pe = (Math.PI ** 2 * E * I) / (Le * Le), Cc = Math.sqrt((2 * Math.PI ** 2 * E) / fy);
  const scr = sl >= Cc ? Pe / A : fy - ((fy * fy) / (4 * Math.PI ** 2 * E)) * sl * sl, Pcr = Math.min(scr * A, fy * A);
  return { Pcr: s(Pcr / 1000, 6), Pe: s(Pe / 1000, 6), allow: s(Pcr / 1000 / sf, 6), slender: s(sl, 6), mode: sl >= Cc ? `Euler (long column, KL/r ≥ ${fmt(Cc, 4)})` : "Johnson (intermediate column — yielding governs)" };
};
export const TRUSS_SUP = ["Pin at the first support node, roller (vertical) at the second"];
export const truss: SciCalculator = (v) => {
  const nodes = txt(v, "nodes").split(";").map((p) => p.trim().split(/[\s,]+/).map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
  const mem = txt(v, "members").split(/[\s,;]+/).filter(Boolean).map((p) => p.split("-").map((x) => Number(x) - 1));
  const n = nodes.length, pin = Math.round(pos(v.pin, 1)) - 1, rol = Math.round(pos(v.roller, 3)) - 1;
  if (n < 2 || mem.some((m) => m.length !== 2 || m.some((i) => !(i >= 0 && i < n)))) throw new InputError("Check nodes (x y; x y; …) and members (1-2 2-3 …).");
  const F = new Array(2 * n).fill(0);
  for (const part of txt(v, "loads").split(";").filter((p) => p.trim())) {
    const m = part.split(":"), node = Number(m[0]) - 1, [fx, fy] = (m[1] ?? "").trim().split(/[\s,]+/).map(Number);
    if (!(node >= 0 && node < n) || !Number.isFinite(fx) || !Number.isFinite(fy)) throw new InputError("Loads look like 2: 0 -10 (node: Fx Fy).");
    F[2 * node] += fx; F[2 * node + 1] += fy;
  }
  const K = Array.from({ length: 2 * n }, () => new Array(2 * n).fill(0));
  const geo = mem.map(([i, j]) => { const dx = nodes[j][0] - nodes[i][0], dy = nodes[j][1] - nodes[i][1], L = Math.hypot(dx, dy); if (!L) throw new InputError("A member has zero length."); return { i, j, c: dx / L, s0: dy / L, L }; });
  for (const { i, j, c, s0, L } of geo) {
    const k = [c * c, c * s0, s0 * s0].map((x) => x / L), blk = [[k[0], k[1]], [k[1], k[2]]], idx = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1];
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) K[idx[a]][idx[b]] += blk[a % 2][b % 2] * ((a < 2) === (b < 2) ? 1 : -1);
  }
  const fixed = new Set([2 * pin, 2 * pin + 1, 2 * rol + 1]), free = Array.from({ length: 2 * n }, (_, i) => i).filter((i) => !fixed.has(i));
  const A = free.map((r) => free.map((c) => K[r][c])), b = free.map((r) => F[r]), m2 = A.map((r, i) => [...r, b[i]]), nn = free.length;
  for (let c = 0; c < nn; c++) {
    let p = c;
    for (let r = c + 1; r < nn; r++) if (Math.abs(m2[r][c]) > Math.abs(m2[p][c])) p = r;
    if (Math.abs(m2[p][c]) < 1e-10) throw new InputError("The truss is unstable (a mechanism) — add members or check the supports.");
    [m2[c], m2[p]] = [m2[p], m2[c]];
    for (let r = 0; r < nn; r++) if (r !== c) { const f = m2[r][c] / m2[c][c]; for (let k = c; k <= nn; k++) m2[r][k] -= f * m2[c][k]; }
  }
  const u = new Array(2 * n).fill(0);
  free.forEach((g, i) => (u[g] = m2[i][nn] / m2[i][i]));
  const forces = geo.map(({ i, j, c, s0, L }) => ((u[2 * j] - u[2 * i]) * c + (u[2 * j + 1] - u[2 * i + 1]) * s0) / L);
  const Rv = Array.from(fixed).map((d) => sum(K[d].map((kk, c) => kk * u[c])) - F[d]);
  return { forces: forces.map((f, k) => `member ${mem[k][0] + 1}-${mem[k][1] + 1}: ${fmt(Math.abs(f) < 1e-9 ? 0 : f, 6)} (${f > 1e-9 ? "tension" : f < -1e-9 ? "compression" : "zero-force"})`).join("\n"), reactions: `pin node ${pin + 1}: Rx = ${fmt(Rv[0], 6)}, Ry = ${fmt(Rv[1], 6)}; roller node ${rol + 1}: Ry = ${fmt(Rv[2], 6)}`, maxT: s(Math.max(0, ...forces), 6), maxC: s(Math.min(0, ...forces), 6) };
};
export const weldStrength: SciCalculator = (v) => {
  const leg = pos(v.leg, 6), L = pos(v.L, 100), Fexx = pos(v.fexx, 482), P = pos(v.P, 0), n = Math.max(1, Math.round(pos(v.n, 1)));
  const throat = 0.707 * leg, cap = (0.75 * 0.6 * Fexx * throat * L * n) / 1000;
  return { cap: s(cap, 6), throat: s(throat, 5), perMm: s((0.75 * 0.6 * Fexx * throat) / 1000, 6), Lreq: P ? s((P * 1000) / (0.75 * 0.6 * Fexx * throat * n), 6) : "enter load", util: P ? s((100 * P) / cap, 5) : "—" };
};
export const TUBE_MODE = ["Rectangular/square tube: safe load on a span", "Dead load of a slab or member"];
export const deadLoad: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const t = pos(v.th, 150) / 1000, rho = pos(v.rho, 2400), A = pos(v.area, 20), extra = pos(v.sdl, 1);
    const kpa = (rho * 9.80665 * t) / 1000 + extra;
    return { load: s(kpa, 6), total: s(kpa * A, 6), mass: s(rho * t * A, 6), note: `self-weight ${fmt((rho * 9.80665 * t) / 1000, 5)} kPa + superimposed ${fmt(extra)} kPa` };
  }
  const b = pos(v.b, 50), h = pos(v.h, 50), t = pos(v.t, 3), L = pos(v.L, 1500), fy = pos(v.fy, 250), sf = pos(v.sf, 1.67) || 1;
  const sec = section({ shape: 3, b, h, t } as Vals), M = (fy / sf) * sec.Sx, Pmid = (4 * M) / L, wU = (8 * M) / (L * L);
  return { load: s(Pmid / 1000, 6), total: s((wU * L) / 1000, 6), mass: s((sec.A * L * 7850) / 1e9, 6), note: `Bending only (S = ${fmt(sec.Sx, 6)} mm³); check deflection and local buckling` };
};
export const TRIB_POS = ["Interior column", "Edge column", "Corner column", "Interior beam (spacing × span)"];
export const tributary: SciCalculator = (v) => {
  const k = pick(v.pos, 4), x = pos(v.x, 6), y = pos(v.y, 5), DL = pos(v.dl, 4), LL = pos(v.ll, 2.5);
  const A = k === 0 ? x * y : k === 1 ? (x * y) / 2 : k === 2 ? (x * y) / 4 : x * y;
  return { A: s(A, 6), service: s(A * (DL + LL), 6), factored: s(A * (1.2 * DL + 1.6 * LL), 6), perM: k === 3 ? s(x * (1.2 * DL + 1.6 * LL), 6) : "—" };
};
export const MMI_SHAPES = ["Solid cylinder / disc about its axis", "Hollow cylinder about its axis", "Thin ring / hoop", "Solid sphere", "Thin rod about its centre", "Thin rod about one end", "Rectangular plate about its centre (⊥ axis)"];
export const massMoment: SciCalculator = (v) => {
  const k = pick(v.shape, 7), m = pos(v.m, 10), r = pos(v.r, 0.2), ri = pos(v.ri, 0.1), L = pos(v.L, 1), a = pos(v.a, 0.5), b = pos(v.b, 0.3), d = pos(v.dist, 0);
  const I = [0.5 * m * r * r, 0.5 * m * (r * r + ri * ri), m * r * r, 0.4 * m * r * r, (m * L * L) / 12, (m * L * L) / 3, (m * (a * a + b * b)) / 12][k];
  return { I: s(I, 8), parallel: s(I + m * d * d, 8), k: s(Math.sqrt(I / m), 6), ke: pos(v.rpm, 0) ? s(0.5 * I * ((pos(v.rpm, 0) * 2 * Math.PI) / 60) ** 2, 6) : "enter rpm" };
};
export const REL_MODE = ["Convert FIT ↔ MTBF", "Reliability over a mission time", "Redundant (parallel) system of identical units"];
export const reliability: SciCalculator = (v) => {
  const m = pick(v.mode, 3), fit = pos(v.fit, 500), mtbf = pos(v.mtbf, 0), t = pos(v.t, 8760), n = Math.max(1, Math.round(pos(v.n, 2)));
  const lam = mtbf ? 1 / mtbf : fit / 1e9, R = Math.exp(-lam * t);
  const Rsys = m === 2 ? 1 - (1 - R) ** n : R;
  return { mtbf: s(1 / lam, 8), fit: s(lam * 1e9, 8), R: s(100 * Rsys, 8), F: s(100 * (1 - Rsys), 8), years: s(1 / lam / 8760, 6) };
};
export const FOS_MODE = ["Factor of safety from strength and stress", "Allowable stress or load from a factor of safety"];
export const factorOfSafety: SciCalculator = (v) => {
  const S = pos(v.S, 250), x = pos(v.x, 100);
  if (pick(v.mode, 2) === 1) return { fos: s(x, 6), allow: s(S / x, 8), margin: s(x - 1, 6), ok: x >= 1.5 ? "Typical for well-known loads" : "Low — only for very well-characterised loads" };
  const f = S / x;
  return { fos: s(f, 6), allow: s(S / 1.5, 8), margin: s(f - 1, 6), ok: f >= 2 ? "Comfortable" : f >= 1.5 ? "Adequate for known loads" : f >= 1 ? "Marginal" : "FAILS — applied exceeds strength" };
};
export const linearity: SciCalculator = (v) => {
  const x = listOf(v, "ref", 3), y = listOf(v, "meas", 3);
  if (x.length !== y.length) throw new InputError("Enter one reading per reference value.");
  const mx = mean(x), my = mean(y), m = sum(x.map((a, i) => (a - mx) * (y[i] - my))) / sum(x.map((a) => (a - mx) ** 2)), b = my - m * mx;
  const dev = y.map((q, i) => q - (m * x[i] + b)), md = Math.max(...dev.map(Math.abs)), fs = Math.max(...y) - Math.min(...y), sst = sum(y.map((q) => (q - my) ** 2));
  const term = y.map((q, i) => q - (x[i] * (y[y.length - 1] - y[0])) / (x[x.length - 1] - x[0]) - (y[0] - (x[0] * (y[y.length - 1] - y[0])) / (x[x.length - 1] - x[0])));
  return { lin: s((100 * md) / fs, 6), maxdev: s(md, 6), line: `y = ${fmt(m, 6)}x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b), 6)}`, r2: s(1 - sum(dev.map((d) => d * d)) / sst, 8), terminal: s((100 * Math.max(...term.map(Math.abs))) / fs, 6) };
};
export const CAT_MODE = ["From sag", "From cable length"];
export const catenary: SciCalculator = (v) => {
  const L = pos(v.L, 100), w = pos(v.w, 10), mode = pick(v.mode, 2), target = mode === 0 ? pos(v.sag, 5) : pos(v.len, 101);
  if (mode === 1 && target <= L) throw new InputError("Cable length must exceed the span.");
  const f = (a: number) => (mode === 0 ? a * (Math.cosh(L / (2 * a)) - 1) : 2 * a * Math.sinh(L / (2 * a)));
  let lo = 1e-6 * L, hi = 1e6 * L;
  for (let i = 0; i < 300; i++) { const mid = Math.sqrt(lo * hi); if (f(mid) > target) lo = mid; else hi = mid; }
  const a = Math.sqrt(lo * hi), H = w * a, sag = a * (Math.cosh(L / (2 * a)) - 1), len = 2 * a * Math.sinh(L / (2 * a));
  return { H: s(H, 6), Tmax: s(H + w * sag, 6), sag: s(sag, 6), len: s(len, 8), a: s(a, 6), angle: s((Math.atan(Math.sinh(L / (2 * a))) * 180) / Math.PI, 5) };
};
export const CPK_MODE = ["Summary statistics (mean and SD)", "Raw data"];
export const cpk: SciCalculator = (v) => {
  let mu: number, sd: number;
  if (pick(v.mode, 2) === 1) { const d = listOf(v, "data", 2); mu = mean(d); sd = Math.sqrt(variance(d)); }
  else { mu = num(v.mean, 10.02); sd = pos(v.sd, 0.015); }
  const usl = num(v.usl, 10.05), lsl = num(v.lsl, 9.95);
  if (!(usl > lsl)) throw new InputError("USL must be greater than LSL.");
  if (!sd) throw new InputError("Standard deviation must be positive.");
  const cpu = (usl - mu) / (3 * sd), cpl = (mu - lsl) / (3 * sd), ck = Math.min(cpu, cpl), ppm = 1e6 * (1 - normCdf((usl - mu) / sd) + normCdf((lsl - mu) / sd));
  return { cpk: s(ck, 6), cp: s((usl - lsl) / (6 * sd), 6), cpu: s(cpu, 6), cpl: s(cpl, 6), ppm: s(ppm, 6), sigma: s(3 * ck + 1.5, 5), rating: ck >= 1.67 ? "Excellent (≥ 1.67)" : ck >= 1.33 ? "Capable (≥ 1.33)" : ck >= 1 ? "Marginal (1.0–1.33)" : "Not capable (< 1.0)" };
};

// ---------- tolerances & GD&T ----------
const STEPS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
const Dmean = (size: number) => { const i = STEPS.findIndex((x) => size <= x); if (i < 0) throw new InputError("Sizes up to 500 mm."); const lo = i ? STEPS[i - 1] : 1; return Math.sqrt(lo * STEPS[i]); };
const IT = (grade: number, D: number) => { const i = 0.45 * Math.cbrt(D) + 0.001 * D, f = { 5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100, 12: 160 }[grade] ?? 16; return Math.round(f * i); };
export const HOLES = ["H", "G", "F"];
export const SHAFTS = ["d", "e", "f", "g", "h", "js", "k", "m", "n", "p", "r", "s"];
export const GRADES = ["5", "6", "7", "8", "9", "10", "11"];
export const isoTolerance: SciCalculator = (v) => {
  const size = pos(v.size, 25), D = Dmean(size), hole = HOLES[pick(v.hole, 3)], hg = Number(GRADES[pick(v.hg, 7)]), shaft = SHAFTS[pick(v.shaft, 12)], sg = Number(GRADES[pick(v.sg, 7)]);
  const ITh = IT(hg, D), ITs = IT(sg, D);
  const EI = hole === "H" ? 0 : hole === "G" ? Math.round(2.5 * D ** 0.34) : Math.round(5.5 * D ** 0.41), ES = EI + ITh;
  let es: number, ei: number;
  const upper: Record<string, number> = { d: -16 * D ** 0.44, e: -11 * D ** 0.41, f: -5.5 * D ** 0.41, g: -2.5 * D ** 0.34, h: 0 };
  if (shaft in upper) { es = Math.round(upper[shaft]); ei = es - ITs; }
  else if (shaft === "js") { es = Math.round(ITs / 2); ei = -es; }
  else {
    const p = IT(7, D) + Math.min(5, Math.round(0.4 * Math.sqrt(D))), sDev = size <= 50 ? IT(8, D) + 2 : IT(7, D) + 0.4 * D;
    const lower: Record<string, number> = { k: sg >= 4 && sg <= 7 ? 0.6 * Math.cbrt(D) : 0, m: IT(7, D) - IT(6, D), n: 5 * D ** 0.34, p, r: Math.sqrt(p * sDev), s: sDev };
    ei = Math.round(lower[shaft]); es = ei + ITs;
  }
  const maxClr = ES - ei, minClr = EI - es, type = minClr >= 0 ? "Clearance fit" : maxClr <= 0 ? "Interference fit" : "Transition fit";
  const mm = (x: number) => fmt(size + x / 1000, 7);
  return { fit: `${fmt(size)} ${hole}${hg}/${shaft}${sg}: ${type}`, hole: `${mm(EI)} – ${mm(ES)} mm (${EI >= 0 ? "+" : ""}${EI}/${ES >= 0 ? "+" : ""}${ES} µm)`, shaft: `${mm(ei)} – ${mm(es)} mm (${es >= 0 ? "+" : ""}${es}/${ei >= 0 ? "+" : ""}${ei} µm)`, max: s(maxClr, 6), min: s(minClr, 6) };
};
export const FEATURE = ["Hole (internal feature)", "Pin / shaft (external feature)"];
export const truePosition: SciCalculator = (v) => {
  const dx = num(v.dx, 0.03), dy = num(v.dy, 0.04), tol = pos(v.tol, 0.1), hole = pick(v.feat, 2) === 0, mmc = pos(v.mmc, 0), act = pos(v.act, 0);
  const tp = 2 * Math.hypot(dx, dy), bonus = mmc && act ? Math.max(0, hole ? act - mmc : mmc - act) : 0, allowed = tol + bonus;
  return { tp: s(tp, 6), allowed: s(allowed, 6), bonus: s(bonus, 6), result: tp <= allowed ? "PASS" : "FAIL", used: s((100 * tp) / allowed, 5) };
};

export const sciStructCustomCalculators: Record<string, SciCalculator> = {
  "moment-of-inertia-calculator": momentOfInertia,
  "thermal-expansion-calculator": thermalExpansion,
  "true-position-calculator": truePosition,
  "iso-tolerance-calculator": isoTolerance,
  "hardness-conversion-calculator": hardness,
  "beam-deflection-calculator": beamDeflection,
  "section-modulus-calculator": sectionModulus,
  "youngs-modulus-calculator": youngsModulus,
  "mohrs-circle-calculator": mohr,
  "truss-calculator": truss,
  "carbon-equivalent-calculator": carbonEquivalent,
  "bending-stress-calculator": bendingStress,
  "pren-calculator": pren,
  "hoop-stress-calculator": hoopStress,
  "column-buckling-calculator": buckling,
  "cpk-calculator": cpk,
  "dead-load-calculator": deadLoad,
  "shear-stress-calculator": shearStress,
  "weld-strength-calculator": weldStrength,
  "tributary-area-calculator": tributary,
  "strength-to-weight-ratio-calculator": strengthWeight,
  "mass-moment-of-inertia-calculator": massMoment,
  "principal-stress-calculator": principalStress,
  "reliability-calculator": reliability,
  "factor-of-safety-calculator": factorOfSafety,
  "stress-strain-calculator": stressStrain,
  "torsion-calculator": torsion,
  "linearity-calculator": linearity,
  "catenary-calculator": catenary,
};
