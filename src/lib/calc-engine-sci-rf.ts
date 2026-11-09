/**
 * Batch: "Science Calculators" → Electrical & Electronics Engineering (RF, antennas, PCB & comms — 41).
 *
 * Trace width: IPC-2221 I = k·ΔT^0.44·A^0.725 (k 0.048 external, 0.024 internal; A in mil²).
 * Microstrip: Hammerstad-Jensen with Wheeler thickness correction; stripline and embedded
 * microstrip: IPC-2141; coplanar waveguide: conformal mapping with complete elliptic integrals
 * K(k) = π/(2·AGM(1, √(1 − k²))). Path loss: FSPL = 20 log d(km) + 20 log f(MHz) + 32.44 dB.
 * Thermal noise −174 dBm/Hz at 290 K. BER via the Gaussian Q-function. Erlang B by the stable
 * recursion B(n) = A·B(n−1)/(n + A·B(n−1)). Butterworth/Chebyshev ladders from the standard g-values.
 * Clearance: IPC-2221B Table 6-1. See prisma/create-sci-rf-calculators.ts.
 */

import { type SciCalculator, InputError, num, pos, pick, fmt, sig, listOf, normCdf } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const C0 = 299792458, TAU = 2 * Math.PI, MU0 = 1.25663706212e-6, KB = 1.380649e-23;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const lambda = (fMHz: number) => C0 / (fMHz * 1e6);
const db = (x: number) => 10 * Math.log10(x);
const Q = (x: number) => 1 - normCdf(x);
const agm = (a: number, b: number) => { for (let i = 0; i < 60 && Math.abs(a - b) > 1e-15 * a; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)]; return a; };
const ellK = (k: number) => Math.PI / (2 * agm(1, Math.sqrt(1 - k * k)));
const Kratio = (k: number) => ellK(k) / ellK(Math.sqrt(1 - k * k)); // K(k)/K(k')
const delay = (eeff: number) => (Math.sqrt(eeff) / C0) * 0.0254 * 1e12; // ps per inch

// ---------- PCB ----------
const OZ_MIL = 1.378;
export const LAYER = ["External (outer) layer", "Internal layer"];
export const traceWidth: SciCalculator = (v) => {
  const I = pos(v.I, 2), dT = pos(v.dT, 10), oz = pos(v.oz, 1), k = pick(v.layer, 2) === 0 ? 0.048 : 0.024, L = pos(v.L, 50);
  const A = (I / (k * dT ** 0.44)) ** (1 / 0.725), t = oz * OZ_MIL, w = A / t, wmm = w * 0.0254, tmm = t * 0.0254;
  const R = (1.72e-8 * (1 + 0.00393 * (25 + dT - 20)) * (L / 1000)) / (wmm * tmm * 1e-6);
  return { mil: s(w, 6), mm: s(wmm, 6), area: s(A, 6), R: s(R, 6), vd: s(I * R, 6), P: s(I * I * R, 6) };
};
const msZ = (w: number, h: number, t: number, er: number) => {
  const we = t > 0 ? w + (t / Math.PI) * (1 + Math.log((2 * h) / t)) : w, u = we / h;
  const ee = (er + 1) / 2 + ((er - 1) / 2) * (1 / Math.sqrt(1 + 12 / u) + (u < 1 ? 0.04 * (1 - u) ** 2 : 0));
  const Z = u <= 1 ? (60 / Math.sqrt(ee)) * Math.log(8 / u + u / 4) : (120 * Math.PI) / (Math.sqrt(ee) * (u + 1.393 + 0.667 * Math.log(u + 1.444)));
  return { Z, ee };
};
const solveW = (target: number, f: (w: number) => number) => {
  let lo = 1e-4, hi = 1e3;
  for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (f(m) > target) lo = m; else hi = m; }
  return Math.sqrt(lo * hi);
};
export const MS_MODE = ["Impedance from trace width", "Trace width for a target impedance"];
export const microstrip: SciCalculator = (v) => {
  const h = pos(v.h, 1.6), t = pos(v.t, 0.035), er = pos(v.er, 4.4);
  const w = pick(v.mode, 2) === 1 ? solveW(pos(v.Z, 50), (x) => msZ(x, h, t, er).Z) : pos(v.w, 3);
  const r = msZ(w, h, t, er);
  return { Z: s(r.Z, 6), w: s(w, 6), ee: s(r.ee, 6), delay: s(delay(r.ee), 6), wl: s((C0 / Math.sqrt(r.ee) / (pos(v.f, 1000) * 1e6)) * 1000, 6) };
};
const stripZ = (w: number, b: number, t: number, er: number) => (60 / Math.sqrt(er)) * Math.log((4 * b) / (0.67 * Math.PI * (0.8 * w + t)));
export const stripline: SciCalculator = (v) => {
  const b = pos(v.b, 0.5), t = pos(v.t, 0.035), er = pos(v.er, 4.4);
  const w = pick(v.mode, 2) === 1 ? solveW(pos(v.Z, 50), (x) => stripZ(x, b, t, er)) : pos(v.w, 0.15);
  const Z = stripZ(w, b, t, er), k = 1 / Math.cosh((Math.PI * w) / (2 * b)), Zc = ((30 * Math.PI) / Math.sqrt(er)) * Kratio(k);
  return { Z: s(Z, 6), w: s(w, 6), cohn: s(Zc, 6), delay: s(delay(er), 6), note: w / b > 0.35 ? "IPC-2141 formula is less accurate for w/b > 0.35 — compare with Cohn's value" : "Within IPC-2141 range" };
};
export const STRUCT = ["Surface microstrip", "Embedded (covered) microstrip", "Symmetric stripline"];
export const traceImpedance: SciCalculator = (v) => {
  const k = pick(v.struct, 3), w = pos(v.w, 0.3), h = pos(v.h, 0.2), t = pos(v.t, 0.035), er = pos(v.er, 4.3), cover = pos(v.cover, 0.1);
  let Z: number, ee: number;
  if (k === 0) ({ Z, ee } = msZ(w, h, t, er));
  else if (k === 1) { const b = h + t + cover; ee = er * (1 - Math.exp((-1.55 * b) / h)); Z = (60 / Math.sqrt(ee)) * Math.log((5.98 * h) / (0.8 * w + t)); }
  else { ee = er; Z = stripZ(w, h, t, er); }
  return { Z: s(fin(Z), 6), ee: s(ee, 6), delay: s(delay(ee), 6), note: k === 2 ? "h = total dielectric thickness between the two planes" : "h = dielectric height from trace to the reference plane" };
};
export const DIFF_STRUCT = ["Edge-coupled microstrip", "Edge-coupled stripline"];
export const differentialZ: SciCalculator = (v) => {
  const k = pick(v.struct, 2), w = pos(v.w, 0.15), sp = pos(v.s, 0.15), h = pos(v.h, 0.1), t = pos(v.t, 0.035), er = pos(v.er, 4.3);
  const Z0 = k === 0 ? msZ(w, h, t, er).Z : stripZ(w, h, t, er), Zd = k === 0 ? 2 * Z0 * (1 - 0.48 * Math.exp((-0.96 * sp) / h)) : 2 * Z0 * (1 - 0.374 * Math.exp((-2.9 * sp) / h));
  return { Zd: s(Zd, 6), Z0: s(Z0, 6), odd: s(Zd / 2, 6), coupling: s(100 * (1 - Zd / (2 * Z0)), 5) };
};
export const coplanar: SciCalculator = (v) => {
  const w = pos(v.w, 1), sp = pos(v.s, 0.2), h = pos(v.h, 1.6), er = pos(v.er, 4.4), grounded = pick(v.gnd, 2) === 0;
  const k = w / (w + 2 * sp), Kk = Kratio(k);
  let ee: number, Z: number;
  if (grounded) {
    const k3 = Math.tanh((Math.PI * w) / (4 * h)) / Math.tanh((Math.PI * (w + 2 * sp)) / (4 * h)), K3 = Kratio(k3);
    ee = (1 + er * K3 / Kk) / (1 + K3 / Kk);
    Z = (60 * Math.PI) / Math.sqrt(ee) / (Kk + K3);
  } else {
    const k1 = Math.sinh((Math.PI * w) / (4 * h)) / Math.sinh((Math.PI * (w + 2 * sp)) / (4 * h));
    ee = 1 + ((er - 1) / 2) * (Kratio(k1) / Kk);
    Z = ((30 * Math.PI) / Math.sqrt(ee)) * (1 / Kk);
  }
  return { Z: s(Z, 6), ee: s(ee, 6), delay: s(delay(ee), 6), k: s(k, 6) };
};
export const CPW_GND = ["Grounded CPW (CPWG, ground plane below)", "CPW without bottom ground"];
export const VIA_MODE = ["Trace resistance", "Via resistance, current & inductance"];
export const traceResistance: SciCalculator = (v) => {
  const T = num(v.T, 25), rho = 1.72e-8 * (1 + 0.00393 * (T - 20));
  if (pick(v.mode, 2) === 1) {
    const d = pos(v.d, 0.3) / 1000, pl = pos(v.plate, 0.025) / 1000, h = pos(v.h, 1.6) / 1000;
    const A = Math.PI * ((d / 2 + pl) ** 2 - (d / 2) ** 2), R = (rho * h) / A, Amil = A / (0.0254e-3) ** 2;
    const Imax = 0.048 * 10 ** 0.44 * Amil ** 0.725, dIn = d / 0.0254, hIn = h / 0.0254, L = 5.08 * hIn * (Math.log((4 * hIn) / dIn) + 1);
    return { R: s(R * 1000, 6), I: s(Imax, 5), L: s(L, 5), A: s(A * 1e6, 6) };
  }
  const w = pos(v.w, 0.25) / 1000, t = pos(v.oz, 1) * 34.8e-6, L = pos(v.L, 100) / 1000, R = (rho * L) / (w * t), I = pos(v.I, 0.5);
  return { R: s(R * 1000, 6), I: s(I * R * 1000, 6), L: s(I * I * R * 1000, 6), A: s(w * t * 1e6, 6) };
};
const CLR: Record<string, number[]> = { B1: [0.05, 0.05, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.25, 0.0025], B2: [0.1, 0.1, 0.6, 0.6, 0.6, 1.25, 1.25, 1.25, 2.5, 0.005], B3: [0.1, 0.1, 0.6, 1.5, 3.2, 3.2, 6.4, 12.5, 12.5, 0.025], B4: [0.05, 0.05, 0.13, 0.13, 0.4, 0.4, 0.4, 0.4, 0.8, 0.00305], A5: [0.13, 0.13, 0.13, 0.13, 0.4, 0.4, 0.8, 0.8, 0.8, 0.00305] };
export const CLR_COND = ["B1 — internal conductors", "B2 — external, uncoated, sea level to 3,050 m", "B3 — external, uncoated, above 3,050 m", "B4 — external, permanent polymer coating", "A5 — external, conformal coating over assembly"];
const CLR_KEYS = ["B1", "B2", "B3", "B4", "A5"], CLR_V = [15, 30, 50, 100, 150, 170, 250, 300, 500];
export const pcbClearance: SciCalculator = (v) => {
  const V = pos(v.V, 240), key = CLR_KEYS[pick(v.cond, 5)], row = CLR[key];
  const i = CLR_V.findIndex((x) => V <= x), mm = i >= 0 ? row[i] : row[8] + row[9] * (V - 500);
  return { mm: s(mm, 5), mil: s(mm / 0.0254, 5), band: i >= 0 ? `${i ? CLR_V[i - 1] + 1 : 0}–${CLR_V[i]} V row` : `> 500 V: ${row[8]} mm + ${row[9]} mm/V`, note: "IPC-2221B Table 6-1 electrical clearance. Safety-agency creepage (IEC 62368-1 / 60664-1) is often larger." };
};
export const pcbWeight: SciCalculator = (v) => {
  const L = pos(v.L, 100) / 10, W = pos(v.W, 80) / 10, th = pos(v.th, 1.6) / 10, layers = Math.max(1, Math.round(pos(v.layers, 2))), oz = pos(v.oz, 1), cov = pos(v.cov, 50) / 100, qty = Math.max(1, Math.round(pos(v.qty, 1)));
  const area = L * W, sub = area * th * 1.85, cu = area * layers * oz * 34.8e-4 * 8.96 * cov, mask = area * 2 * 0.0025 * 1.4, g = sub + cu + mask;
  return { g: s(g, 6), total: s(g * qty, 6), oz: s((g * qty) / 28.3495, 6), parts: `substrate ${fmt(sub, 5)} g, copper ${fmt(cu, 5)} g, mask ${fmt(mask, 4)} g` };
};

// ---------- antennas ----------
export const dipole: SciCalculator = (v) => {
  const f = pos(v.f, 14.2), vf = pos(v.vf, 0.95), lam = lambda(f), L = 0.5 * lam * vf;
  return { m: s(L, 6), ft: s(L / 0.3048, 6), leg: s(L / 2, 6), legFt: s(L / 2 / 0.3048, 6), rule: s(468 / f, 6), lam: s(lam, 6) };
};
export const ANT_FRAC = ["Quarter-wave (λ/4)", "Half-wave (λ/2)", "5/8-wave", "Full wave (λ)", "3/4-wave"];
const FRAC = [0.25, 0.5, 0.625, 1, 0.75];
export const antennaLength: SciCalculator = (v) => {
  const f = pos(v.f, 146), vf = pos(v.vf, 0.95), lam = lambda(f), L = FRAC[pick(v.frac, 5)] * lam * vf;
  return { m: s(L, 6), cm: s(L * 100, 6), inch: s(L / 0.0254, 6), ft: s(L / 0.3048, 6), lam: s(lam, 6) };
};
export const patch: SciCalculator = (v) => {
  const f = pos(v.f, 2400) * 1e6, er = pos(v.er, 4.4), h = pos(v.h, 1.6) / 1000;
  const W = (C0 / (2 * f)) * Math.sqrt(2 / (er + 1)), ee = (er + 1) / 2 + ((er - 1) / 2) / Math.sqrt(1 + (12 * h) / W);
  const dL = (0.412 * h * (ee + 0.3) * (W / h + 0.264)) / ((ee - 0.258) * (W / h + 0.8)), L = C0 / (2 * f * Math.sqrt(ee)) - 2 * dL;
  const Redge = 90 * (er * er / (er - 1)) * (L / W) ** 2, y0 = (L / Math.PI) * Math.acos(Math.sqrt(Math.min(1, 50 / Redge)));
  return { W: s(W * 1000, 6), L: s(L * 1000, 6), ee: s(ee, 6), Redge: s(Redge, 5), inset: s(y0 * 1000, 5) };
};
export const helical: SciCalculator = (v) => {
  const f = pos(v.f, 2400), N = Math.max(1, Math.round(pos(v.N, 10))), lam = lambda(f), C = lam, S = 0.25 * lam, D = C / Math.PI;
  const G = 10.8 + 10 * Math.log10((C / lam) ** 2 * N * (S / lam)), hp = (52 * lam ** 1.5) / (C * Math.sqrt(N * S));
  return { D: s(D * 1000, 6), S: s(S * 1000, 6), len: s(N * S * 1000, 6), G: s(G, 5), hpbw: s(hp, 5), Z: s(140 * (C / lam), 5), gp: s(0.8 * lam * 1000, 5) };
};
export const jpole: SciCalculator = (v) => {
  const f = pos(v.f, 146), vf = pos(v.vf, 0.95), lam = lambda(f) * vf;
  return { long: s(0.75 * lam * 100, 6), short: s(0.25 * lam * 100, 6), radiator: s(0.5 * lam * 100, 6), feed: s(0.04 * lam * 100, 5), spacing: s(0.015 * lambda(f) * 100, 5) };
};
export const APERTURE = ["Parabolic dish", "Pyramidal horn (aperture a × b)"];
export const hornAntenna: SciCalculator = (v) => {
  const lam = lambda(pos(v.f, 10000)), eff = pos(v.eff, 55) / 100;
  if (pick(v.mode, 2) === 0) {
    const D = pos(v.D, 0.6), G = eff * (Math.PI * D / lam) ** 2;
    return { G: s(db(G), 6), lin: s(G, 6), bw: s((70 * lam) / D, 5), ff: s((2 * D * D) / lam, 6) };
  }
  const a = pos(v.a, 0.1), b = pos(v.b, 0.08), G = (4 * Math.PI * a * b * (pos(v.eff, 51) / 100)) / (lam * lam);
  return { G: s(db(G), 6), lin: s(G, 6), bw: s((51 * lam) / b, 5), ff: s((2 * Math.max(a, b) ** 2) / lam, 6) };
};
export const yagi: SciCalculator = (v) => {
  const f = pos(v.f, 144.5), N = Math.min(20, Math.max(2, Math.round(pos(v.N, 5)))), lam = lambda(f), dia = pos(v.dia, 6) / 1000;
  const corr = 1 - 0.0085 * Math.log10((dia / lam) * 1000 + 1) * 10;
  const rows = [`Reflector: ${fmt(0.495 * lam * corr * 100, 5)} cm at 0`, `Driven element: ${fmt(0.473 * lam * corr * 100, 5)} cm at ${fmt(0.2 * lam * 100, 4)} cm`];
  let pos0 = 0.2;
  for (let i = 1; i <= N - 2; i++) { pos0 += i === 1 ? 0.075 : 0.25; rows.push(`Director ${i}: ${fmt((0.44 - 0.004 * (i - 1)) * lam * corr * 100, 5)} cm at ${fmt(pos0 * lam * 100, 4)} cm`); }
  const G = 10 * Math.log10(5.4 * pos0 + 4.25) + 2.15;
  return { table: rows.join("\n"), boom: s(pos0 * lam * 100, 5), G: s(G, 4), lam: s(lam * 100, 6) };
};
export const magLoop: SciCalculator = (v) => {
  const f = pos(v.f, 14.2) * 1e6, D = pos(v.D, 1), a = pos(v.cd, 22) / 2000, P = pos(v.P, 100), lam = C0 / f, r = D / 2, A = Math.PI * r * r, Cf = Math.PI * D;
  const Rr = 31171 * (A * A) / lam ** 4, Rs = Math.sqrt((Math.PI * f * MU0) / 5.8e7), Rl = (Cf * Rs) / (TAU * a), eta = Rr / (Rr + Rl);
  const L = MU0 * r * (Math.log((8 * r) / a) - 2), XL = TAU * f * L, Cap = 1 / (TAU * f * XL), Qf = XL / (2 * (Rr + Rl));
  return { eff: s(100 * eta, 5), effDb: s(db(eta), 5), Cap: s(Cap * 1e12, 6), L: s(L * 1e6, 6), bw: s(f / Qf / 1000, 5), Vcap: s(Math.sqrt(P * XL * Qf), 5), size: s(Cf / lam, 4) };
};

// ---------- propagation & links ----------
export const fspl: SciCalculator = (v) => {
  const d = pos(v.d, 1), f = pos(v.f, 2400), L = 20 * Math.log10(d) + 20 * Math.log10(f) + 32.44;
  const Pr = num(v.pt, 20) + num(v.gt, 2) + num(v.gr, 2) - L;
  return { L: s(L, 6), Pr: s(Pr, 6), lam: s(lambda(f), 6), ratio: s(10 ** (L / 10), 6) };
};
export const linkBudget: SciCalculator = (v) => {
  const pt = num(v.pt, 30), gt = num(v.gt, 10), lt = pos(v.lt, 2), d = pos(v.d, 10), f = pos(v.f, 900), gr = num(v.gr, 10), lr = pos(v.lr, 2), other = pos(v.other, 3), sens = num(v.sens, -100);
  const L = 20 * Math.log10(d) + 20 * Math.log10(f) + 32.44, eirp = pt + gt - lt, Pr = eirp - L - other + gr - lr;
  return { Pr: s(Pr, 6), margin: s(Pr - sens, 6), eirp: s(eirp, 6), erp: s(eirp - 2.15, 6), fspl: s(L, 6), ok: Pr - sens >= 10 ? "Good (≥ 10 dB fade margin)" : Pr - sens >= 0 ? "Marginal" : "Link fails" };
};
export const fresnel: SciCalculator = (v) => {
  const D = pos(v.d, 10), d1 = Math.min(D, pos(v.d1, D / 2)), d2 = D - d1, lam = lambda(pos(v.f, 2400)), n = Math.max(1, Math.round(pos(v.n, 1)));
  const r = Math.sqrt((n * lam * d1 * 1000 * d2 * 1000) / (D * 1000)), bulge = (d1 * d2 * 1000) / (2 * (4 / 3) * 6371);
  return { r: s(r, 6), clear60: s(0.6 * r, 6), bulge: s(bulge, 6), total: s(0.6 * r + bulge, 6) };
};
export const lineOfSight: SciCalculator = (v) => {
  const h1 = pos(v.h1, 30), h2 = pos(v.h2, 10), k = pick(v.kind, 2) === 0 ? 4 / 3 : 1, R = 6371;
  const d = (h: number) => Math.sqrt(2 * k * R * (h / 1000));
  return { d: s(d(h1) + d(h2), 6), mi: s((d(h1) + d(h2)) / 1.609344, 6), d1: s(d(h1), 6), d2: s(d(h2), 6) };
};
export const LOS_KIND = ["Radio / radar (k = 4/3)", "Optical / geometric (k = 1)"];
export const vswr: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const G = m === 0 ? (pos(v.x, 1.5) - 1) / (pos(v.x, 1.5) + 1) : m === 1 ? 10 ** (-pos(v.x, 14) / 20) : Math.min(0.999999, pos(v.x, 0.2));
  if (G >= 1) throw new InputError("VSWR must be above 1 (return loss above 0 dB).");
  return { vswr: s((1 + G) / (1 - G), 8), rl: G ? s(-20 * Math.log10(G), 8) : "∞", gamma: s(G, 8), ml: s(-db(1 - G * G), 8), refl: s(100 * G * G, 8) };
};
export const VSWR_MODE = ["VSWR", "Return loss (dB)", "Reflection coefficient |Γ|"];
export const COAX = ["RG-174", "RG-58", "RG-8X", "RG-213 / RG-8", "RG-6", "LMR-195", "LMR-240", "LMR-400", "LMR-600", "1/2″ Heliax LDF4-50A"];
const COAX_DB = [8.9, 4.9, 3.7, 2.2, 2.0, 3.6, 3.0, 1.5, 0.96, 0.83]; // dB per 100 ft at 100 MHz
export const coaxLoss: SciCalculator = (v) => {
  const k = pick(v.cable, COAX.length), f = pos(v.f, 146), L = pos(v.len, 30), Pin = pos(v.pin, 100);
  const per100ft = COAX_DB[k] * Math.sqrt(f / 100), loss = per100ft * (L / 30.48), out = Pin * 10 ** (-loss / 10);
  return { loss: s(loss, 5), out: s(out, 6), pct: s((100 * out) / Pin, 5), per100: s(per100ft / 30.48 * 100, 5) };
};
export const TL_MODE = ["Coaxial line (D, d)", "Twin-lead / parallel wire (D spacing, d diameter)", "Antenna far-field distance"];
export const transmissionLine: SciCalculator = (v) => {
  const m = pick(v.mode, 3), er = pos(v.er, 2.25), D = pos(v.D, 7.25), d = pos(v.dd, 2.17), f = pos(v.f, 100);
  if (m === 2) { const A = pos(v.A, 1), lam = lambda(f); return { Z: "—", vf: "—", C: "—", L: "—", el: s(Math.max((2 * A * A) / lam, 3 * lam), 6) }; }
  const Z = m === 0 ? (60 / Math.sqrt(er)) * Math.log(D / d) : (120 / Math.sqrt(er)) * Math.acosh(D / d), vf = 1 / Math.sqrt(er);
  const Cpm = Math.sqrt(er) / (C0 * Z), Lpm = (Z * Math.sqrt(er)) / C0;
  return { Z: s(fin(Z), 6), vf: s(vf, 6), C: s(Cpm * 1e12, 6), L: s(Lpm * 1e9, 6), el: s((lambda(f) * vf) / 4, 6) };
};
export const skinDepth: SciCalculator = (v) => {
  const mats: [number, number][] = [[1.68e-8, 1], [1.59e-8, 1], [2.44e-8, 1], [2.65e-8, 1], [1.0e-7, 100], [6.9e-7, 1]];
  const [rho, mu] = mats[pick(v.mat, mats.length)], f = pos(v.f, 1e6), dwire = pos(v.d, 1) / 1000;
  const d = Math.sqrt(rho / (Math.PI * f * MU0 * mu)), ratio = dwire > 2 * d ? dwire / (4 * d) + 0.25 : 1;
  return { mm: s(d * 1000, 6), um: s(d * 1e6, 6), ratio: s(ratio, 6), Rs: s(rho / d, 6) };
};
export const SKIN_MATS = ["Copper", "Silver", "Gold", "Aluminium", "Steel (μr ≈ 100)", "Stainless steel (non-magnetic)"];

// ---------- matching, filters & components ----------
export const lMatch: SciCalculator = (v) => {
  const Rs = pos(v.rs, 50), Rl = pos(v.rl, 200), f = pos(v.f, 100) * 1e6, w = TAU * f;
  if (Rs === Rl) throw new InputError("Source and load are already matched.");
  const hi = Math.max(Rs, Rl), lo = Math.min(Rs, Rl), Qn = Math.sqrt(hi / lo - 1), Xs = Qn * lo, Xp = hi / Qn;
  const side = Rl > Rs ? "load" : "source";
  return { Q: s(Qn, 6), lp: `Low-pass: series L = ${fmt((Xs / w) * 1e9, 5)} nH, shunt C = ${fmt((1 / (w * Xp)) * 1e12, 5)} pF across the ${side}`, hp: `High-pass: series C = ${fmt((1 / (w * Xs)) * 1e12, 5)} pF, shunt L = ${fmt((Xp / w) * 1e9, 5)} nH across the ${side}`, Xs: s(Xs, 6), Xp: s(Xp, 6), bw: s(f / Qn / 1e6, 5) };
};
export const attenuator: SciCalculator = (v) => {
  const A = pos(v.A, 10), Z = pos(v.Z, 50), K = 10 ** (A / 20);
  return { piShunt: s((Z * (K + 1)) / (K - 1), 6), piSeries: s((Z * (K * K - 1)) / (2 * K), 6), tSeries: s((Z * (K - 1)) / (K + 1), 6), tShunt: s((Z * 2 * K) / (K * K - 1), 6), ratio: s(K, 6) };
};
export const biasTee: SciCalculator = (v) => {
  const f = pos(v.f, 10) * 1e6, Z = pos(v.Z, 50), I = pos(v.I, 0.1);
  const L = (10 * Z) / (TAU * f), C = 10 / (TAU * f * Z);
  return { L: s(L * 1e6, 6), C: s(C * 1e9, 6), srf: "Choose an inductor whose self-resonance is above your highest frequency", I: s(I * 1.5, 5) };
};
export const FILTER_KIND = ["Butterworth", "Chebyshev 0.5 dB ripple", "Chebyshev 0.1 dB ripple"];
export const FILTER_PASS = ["Low-pass", "High-pass"];
export const rfFilter: SciCalculator = (v) => {
  const n = Math.min(9, Math.max(1, Math.round(pos(v.n, 5)))), fc = pos(v.fc, 100) * 1e6, Z = pos(v.Z, 50), kind = pick(v.kind, 3), hp = pick(v.pass, 2) === 1, w = TAU * fc;
  let g: number[];
  if (kind === 0) g = Array.from({ length: n }, (_, k) => 2 * Math.sin(((2 * (k + 1) - 1) * Math.PI) / (2 * n)));
  else {
    const rip = kind === 1 ? 0.5 : 0.1, b = Math.log(1 / Math.tanh(rip / 17.37)), y = Math.sinh(b / (2 * n));
    const a = Array.from({ length: n }, (_, k) => Math.sin(((2 * (k + 1) - 1) * Math.PI) / (2 * n))), bb = Array.from({ length: n }, (_, k) => y * y + Math.sin(((k + 1) * Math.PI) / n) ** 2);
    g = [(2 * a[0]) / y];
    for (let k = 1; k < n; k++) g.push((4 * a[k - 1] * a[k]) / (bb[k - 1] * g[k - 1]));
  }
  const rows = g.map((gk, i) => {
    const shunt = i % 2 === 0;
    if (!hp) return shunt ? `C${i + 1} (shunt) = ${fmt((gk / (Z * w)) * 1e12, 5)} pF` : `L${i + 1} (series) = ${fmt(((gk * Z) / w) * 1e9, 5)} nH`;
    return shunt ? `L${i + 1} (shunt) = ${fmt((Z / (gk * w)) * 1e9, 5)} nH` : `C${i + 1} (series) = ${fmt((1 / (gk * Z * w)) * 1e12, 5)} pF`;
  });
  return { table: rows.join("\n"), g: g.map((x) => fmt(x, 5)).join(", "), order: n, note: kind > 0 && n % 2 === 0 ? "Even-order Chebyshev needs unequal terminations — use an odd order for equal source and load." : "Equal source and load impedance" };
};
export const wilkinson: SciCalculator = (v) => {
  const Z = pos(v.Z, 50), f = pos(v.f, 2400), ee = pos(v.ee, 1), N = Math.max(2, Math.round(pos(v.N, 2)));
  return { arm: s(Math.sqrt(N) * Z, 6), R: s(N === 2 ? 2 * Z : Z, 6), len: s((lambda(f) / 4 / Math.sqrt(ee)) * 1000, 6), split: s(-db(N), 5) };
};

// ---------- signals & systems ----------
export const DBM_UNITS = ["dBm", "Watts", "Milliwatts", "dBW", "Volts RMS (into Z)", "dBµV (into Z)"];
export const dbmWatts: SciCalculator = (v) => {
  const u = pick(v.unit, 6), x = num(v.x, 30), Z = pos(v.Z, 50);
  const W = u === 0 ? 10 ** ((x - 30) / 10) : u === 1 ? x : u === 2 ? x / 1000 : u === 3 ? 10 ** (x / 10) : u === 4 ? (x * x) / Z : (10 ** (x / 20) * 1e-6) ** 2 / Z;
  if (!(W > 0)) throw new InputError("Power must be positive.");
  const Vr = Math.sqrt(W * Z);
  return { dbm: s(db(W) + 30, 8), W: s(W, 8), mW: s(W * 1000, 8), dbw: s(db(W), 8), V: s(Vr, 8), vpp: s(Vr * 2 * Math.SQRT2, 8), dbuv: s(20 * Math.log10(Vr / 1e-6), 8) };
};
export const noiseFloor: SciCalculator = (v) => {
  const B = pos(v.B, 1e6), T = pos(v.T, 290), NF = pos(v.nf, 5), snr = num(v.snr, 10), R = pos(v.R, 1000);
  const kT = db(KB * T * 1000), floor = kT + db(B) + NF;
  return { floor: s(floor, 6), kt: s(kT, 6), sens: s(floor + snr, 6), vn: s(Math.sqrt(4 * KB * T * R * B) * 1e6, 6), density: s(Math.sqrt(4 * KB * T * R) * 1e9, 6) };
};
export const SNR_MODE = ["From signal and noise power (W)", "From signal and noise levels (dBm)", "From RMS voltages", "Ideal ADC from number of bits"];
export const snr: SciCalculator = (v) => {
  const m = pick(v.mode, 4);
  let d: number;
  if (m === 0) d = db(pos(v.ps, 1) / pos(v.pn, 0.001));
  else if (m === 1) d = num(v.ps, -40) - num(v.pn, -90);
  else if (m === 2) d = 20 * Math.log10(pos(v.ps, 1) / pos(v.pn, 0.01));
  else d = 6.02 * pos(v.bits, 12) + 1.76;
  return { db: s(fin(d), 6), ratio: s(10 ** (d / 10), 6), vratio: s(10 ** (d / 20), 6), enob: s((d - 1.76) / 6.02, 5) };
};
export const BER_MOD = ["BPSK / QPSK (Gray)", "16-QAM", "64-QAM", "256-QAM", "Coherent BFSK", "Non-coherent BFSK", "DBPSK"];
export const ber: SciCalculator = (v) => {
  const k = pick(v.mod, 7), g = 10 ** (num(v.eb, 10) / 10);
  const qam = (M: number) => { const b = Math.log2(M); return Math.min(0.5, (4 / b) * (1 - 1 / Math.sqrt(M)) * Q(Math.sqrt((3 * b * g) / (M - 1)))); };
  const p = k === 0 ? Q(Math.sqrt(2 * g)) : k === 1 ? qam(16) : k === 2 ? qam(64) : k === 3 ? qam(256) : k === 4 ? Q(Math.sqrt(g)) : k === 5 ? 0.5 * Math.exp(-g / 2) : 0.5 * Math.exp(-g);
  return { ber: s(p, 6), log: p > 0 ? s(Math.log10(p), 5) : "−∞", per: s(1 - (1 - p) ** (8 * pos(v.bytes, 100)), 6), bits: p > 0 ? s(1 / p, 6) : "∞" };
};
export const phaseJitter: SciCalculator = (v) => {
  const f0 = pos(v.f0, 100) * 1e6, f = listOf(v, "offs", 2), L = listOf(v, "pn", 2);
  if (f.length !== L.length) throw new InputError("Enter one phase-noise value per offset.");
  let A = 0;
  for (let i = 0; i < f.length - 1; i++) {
    const s1 = 10 ** (L[i] / 10), a = (L[i + 1] - L[i]) / (10 * Math.log10(f[i + 1] / f[i]));
    A += Math.abs(a + 1) < 1e-9 ? s1 * f[i] * Math.log(f[i + 1] / f[i]) : ((s1 * f[i]) / (a + 1)) * ((f[i + 1] / f[i]) ** (a + 1) - 1);
  }
  const rad = Math.sqrt(2 * A), jit = rad / (TAU * f0);
  return { fs: s(jit * 1e15, 6), ps: s(jit * 1e12, 6), rad: s(rad, 6), dbc: s(db(A), 6), deg: s((rad * 180) / Math.PI, 6) };
};
export const crystalPpm: SciCalculator = (v) => {
  const f = pos(v.f, 32768), m = pick(v.mode, 2);
  const ppm = m === 0 ? num(v.ppm, 20) : ((num(v.meas, 32768.5) - f) / f) * 1e6;
  return { ppm: s(ppm, 8), hz: s((f * ppm) / 1e6, 8), sday: s(ppm * 0.0864, 6), smonth: s(ppm * 0.0864 * 30.44, 6), range: `${fmt(f * (1 - Math.abs(ppm) / 1e6), 10)} – ${fmt(f * (1 + Math.abs(ppm) / 1e6), 10)} Hz` };
};
export const PPM_MODE = ["Deviation from a ppm tolerance", "ppm from a measured frequency"];
export const ERL_MODE = ["Blocking probability (A and N)", "Channels needed (A and target blocking)", "Traffic carried (N and target blocking)"];
const erlangB = (A: number, N: number) => { let B = 1; for (let n = 1; n <= N; n++) B = (A * B) / (n + A * B); return B; };
export const erlang: SciCalculator = (v) => {
  const m = pick(v.mode, 3), A = pos(v.A, 10), N = Math.max(1, Math.round(pos(v.N, 15))), gos = pos(v.gos, 1) / 100;
  if (m === 0) { const B = erlangB(A, N); return { B: s(100 * B, 6), N, A: s(A, 6), carried: s(A * (1 - B), 6) }; }
  if (m === 1) { let n = 1; while (erlangB(A, n) > gos && n < 1e5) n++; return { B: s(100 * erlangB(A, n), 6), N: n, A: s(A, 6), carried: s(A * (1 - erlangB(A, n)), 6) }; }
  let lo = 0, hi = N * 10;
  for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (erlangB(mid, N) > gos) hi = mid; else lo = mid; }
  return { B: s(100 * gos, 6), N, A: s(lo, 6), carried: s(lo * (1 - gos), 6) };
};
export const nyquist: SciCalculator = (v) => {
  const fs = pos(v.fs, 44100), f = pos(v.f, 30000), bw = pos(v.bw, 20000);
  const n = Math.round(f / fs), alias = Math.abs(f - n * fs);
  return { nyq: s(fs / 2, 8), min: s(2 * bw, 8), alias: s(alias, 8), aliased: f > fs / 2 ? `Yes — ${fmt(f)} Hz appears at ${fmt(alias, 8)} Hz` : "No — below the Nyquist frequency" };
};
export const fiberLoss: SciCalculator = (v) => {
  const L = pos(v.L, 10), att = pos(v.att, 0.35), conn = Math.round(pos(v.conn, 2)), cl = pos(v.cl, 0.5), spl = Math.round(pos(v.spl, 2)), sl = pos(v.sl, 0.1), split = Math.max(1, Math.round(pos(v.split, 1))), pt = num(v.pt, 0), sens = num(v.sens, -28), extra = pos(v.margin, 3);
  const splitLoss = split > 1 ? 10 * Math.log10(split) + 0.5 * Math.log2(split) * 0.3 : 0, total = L * att + conn * cl + spl * sl + splitLoss;
  return { total: s(total, 6), rx: s(pt - total, 6), margin: s(pt - total - sens, 6), splitLoss: s(splitLoss, 5), ok: pt - total - sens >= extra ? "Within budget (with safety margin)" : "Over budget" };
};
export const radar: SciCalculator = (v) => {
  const Pt = pos(v.pt, 1000), G = 10 ** (num(v.g, 30) / 10), lam = lambda(pos(v.f, 10000)), sig0 = pos(v.rcs, 1), Pmin = 10 ** ((num(v.pmin, -100) - 30) / 10), R = pos(v.R, 10) * 1000, L = 10 ** (pos(v.loss, 0) / 10);
  const Rmax = ((Pt * G * G * lam * lam * sig0) / ((4 * Math.PI) ** 3 * Pmin * L)) ** 0.25, Pr = (Pt * G * G * lam * lam * sig0) / ((4 * Math.PI) ** 3 * R ** 4 * L);
  return { Rmax: s(Rmax / 1000, 6), nmi: s(Rmax / 1852, 6), Pr: s(db(Pr) + 30, 6), lam: s(lam * 100, 6) };
};
export const dielectricHeating: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 1) { const c = pos(v.c, 3600), dT = pos(v.dT, 0.5), t = pos(v.t, 30); return { result: s((c * dT) / t, 6), unit: "W/kg (SAR from temperature rise)", note: "SAR = c·ΔT/Δt" }; }
  if (m === 2) { const sg = pos(v.sigma, 0.8), E = pos(v.E, 20), rho = pos(v.rho, 1000); return { result: s((sg * E * E) / rho, 6), unit: "W/kg (SAR from E-field)", note: "SAR = σ|E|²/ρ (E RMS)" }; }
  const f = pos(v.f, 2450) * 1e6, er2 = pos(v.loss, 10), E = pos(v.E, 1000), Vol = pos(v.vol, 1e-4);
  const p = TAU * f * 8.8541878128e-12 * er2 * E * E;
  return { result: s(p * Vol, 6), unit: "W absorbed", note: `Power density ${fmt(p, 6)} W/m³ = 2πfε₀ε″E²` };
};
export const DH_MODE = ["Dielectric heating power", "SAR from temperature rise", "SAR from electric field"];

export const sciRfCustomCalculators: Record<string, SciCalculator> = {
  "pcb-trace-width-calculator": traceWidth,
  "microstrip-impedance-calculator": microstrip,
  "dipole-antenna-calculator": dipole,
  "patch-antenna-calculator": patch,
  "free-space-path-loss-calculator": fspl,
  "skin-depth-calculator": skinDepth,
  "antenna-length-calculator": antennaLength,
  "pcb-trace-impedance-calculator": traceImpedance,
  "rf-line-of-sight-calculator": lineOfSight,
  "vswr-calculator": vswr,
  "link-budget-calculator": linkBudget,
  "fresnel-zone-calculator": fresnel,
  "helical-antenna-calculator": helical,
  "coplanar-waveguide-calculator": coplanar,
  "impedance-matching-calculator": lMatch,
  "coax-cable-loss-calculator": coaxLoss,
  "transmission-line-calculator": transmissionLine,
  "stripline-impedance-calculator": stripline,
  "pcb-trace-resistance-calculator": traceResistance,
  "dielectric-heating-calculator": dielectricHeating,
  "phase-noise-jitter-calculator": phaseJitter,
  "j-pole-antenna-calculator": jpole,
  "rf-attenuator-calculator": attenuator,
  "differential-impedance-calculator": differentialZ,
  "pcb-clearance-calculator": pcbClearance,
  "noise-floor-calculator": noiseFloor,
  "fiber-optic-loss-calculator": fiberLoss,
  "horn-antenna-calculator": hornAntenna,
  "yagi-antenna-calculator": yagi,
  "dbm-to-watts-calculator": dbmWatts,
  "loop-antenna-calculator": magLoop,
  "bit-error-rate-calculator": ber,
  "crystal-ppm-calculator": crystalPpm,
  "snr-calculator": snr,
  "bias-tee-calculator": biasTee,
  "erlang-b-calculator": erlang,
  "rf-filter-calculator": rfFilter,
  "nyquist-calculator": nyquist,
  "pcb-weight-calculator": pcbWeight,
  "wilkinson-power-divider-calculator": wilkinson,
  "radar-range-calculator": radar,
};

