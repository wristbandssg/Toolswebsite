/**
 * Batch: "Science Calculators" → Physics (electricity & magnetism, heat, relativity, quantum — 17).
 *
 * Exact SI constants: c, h, e, k_B; μ₀ = 1.25663706212 × 10⁻⁶ N/A², ε₀ from μ₀c², k = 1/(4πε₀),
 * mₑ = 9.1093837015 × 10⁻³¹ kg, R∞ = 10,973,731.568 m⁻¹ (CODATA 2018). Relativity uses
 * γ = 1/√(1 − β²); electron speed from an accelerating voltage is relativistic. Magnet pull force
 * is a field-energy estimate (F ≈ B²A/μ₀ with a steel-mirror surface field), good to roughly ±30%.
 * See prisma/create-sci-mod-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, num, pos, pick, fmt, sig } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
export const C = 299792458, H = 6.62607015e-34, QE = 1.602176634e-19, KB = 1.380649e-23, ME = 9.1093837015e-31, MU0 = 1.25663706212e-6, RINF = 10973731.568160, R_GAS = 8.314462618;
export const EPS0 = 1 / (MU0 * C * C), KC = 1 / (4 * Math.PI * EPS0);
const RAD = Math.PI / 180;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const beta = (v: Vals, key = "v") => {
  const b = num(v[key], 50) / 100;
  if (!(Math.abs(b) < 1)) throw new InputError("Speed must be less than 100% of the speed of light.");
  return b;
};

export const timeDilation: SciCalculator = (v) => {
  const b = beta(v), g = 1 / Math.sqrt(1 - b * b), t0 = pos(v.t0, 1), L0 = pos(v.L0, 1);
  return { t: s(g * t0), gamma: s(g, 12), L: s(L0 / g), speed: s(b * C), diff: s(g * t0 - t0) };
};
export const COUL_SOLVE = ["Force F", "Charge q₁", "Distance r"];
export const coulomb: SciCalculator = (v) => {
  const k = pick(v.solve, 3), q2 = num(v.q2, 2e-6), F = num(v.F, 0), q1 = num(v.q1, 1e-6), r = pos(v.r, 0.05);
  const x = fin(k === 0 ? (KC * q1 * q2) / (r * r) : k === 1 ? (F * r * r) / (KC * q2) : Math.sqrt(Math.abs((KC * q1 * q2) / F)));
  const Fv = k === 0 ? x : F, q1v = k === 1 ? x : q1;
  return { result: s(x), type: q1v * q2 > 0 ? "Repulsive (like charges)" : q1v * q2 < 0 ? "Attractive (opposite charges)" : "No force", magnitude: s(Math.abs(Fv)), k: s(KC, 10) };
};
export const EMC_SOLVE = ["Energy from mass", "Mass from energy"];
export const emc2: SciCalculator = (v) => {
  const toE = pick(v.solve, 2) === 0, m = toE ? pos(v.m, 0.001) : pos(v.E, 9e13) / (C * C), E = m * C * C;
  return { E: s(E), m: s(m), kwh: s(E / 3.6e6), mev: s(E / QE / 1e6), tnt: s(E / 4.184e9, 8) };
};
export const magneticFlux: SciCalculator = (v) => {
  const B = num(v.B, 0.5), A = pos(v.A, 0.01), th = num(v.angle, 0) * RAD, N = Math.max(1, Math.round(pos(v.N, 1)));
  const phi = B * A * Math.cos(th);
  return { phi: s(phi), maxwell: s(phi * 1e8), linkage: s(N * phi), density: s(B, 10) };
};
export const PHOTON_MODE = ["Wavelength (nm)", "Frequency (Hz)", "Energy (eV)"];
export const photonEnergy: SciCalculator = (v) => {
  const m = pick(v.mode, 3), x = pos(v.x, 500);
  if (!x) throw new InputError("Enter a positive value.");
  const f = m === 0 ? C / (x * 1e-9) : m === 1 ? x : (x * QE) / H, E = H * f, lam = C / f;
  const band = lam < 1e-11 ? "gamma ray" : lam < 1e-8 ? "X-ray" : lam < 380e-9 ? "ultraviolet" : lam <= 750e-9 ? "visible" : lam < 1e-3 ? "infrared" : lam < 1 ? "microwave" : "radio";
  return { eV: s(E / QE), J: s(E), nm: s(lam * 1e9), f: s(f), p: s(H / lam), band, perMole: s((E * 6.02214076e23) / 1000, 8) };
};
export const relativisticKE: SciCalculator = (v) => {
  const m = pos(v.m, ME), b = beta(v), g = 1 / Math.sqrt(1 - b * b), E0 = m * C * C, K = (g - 1) * E0, Kc = 0.5 * m * (b * C) ** 2;
  return { K: s(K), eV: s(K / QE), classical: s(Kc), ratio: s(K / Kc, 10), total: s(g * E0), p: s(g * m * b * C), gamma: s(g, 12) };
};
export const MAG_MODE = ["Force on a moving charge (qvB sin θ)", "Force on a current-carrying wire (BIL sin θ)", "Field of a long straight wire", "Field inside a solenoid"];
export const magneticForce: SciCalculator = (v) => {
  const m = pick(v.mode, 4), th = num(v.angle, 90) * RAD, B = num(v.B, 0.5), I = num(v.I, 10);
  if (m === 0) {
    const q = num(v.q, QE), vel = num(v.v, 1e6), F = q * vel * B * Math.sin(th), mass = pos(v.mass, ME);
    return { result: s(F), unit: "N (force)", extra: B && mass ? `cyclotron radius r = mv/(|q|B) = ${fmt((mass * Math.abs(vel)) / Math.abs(q * B), 8)} m` : "—" };
  }
  if (m === 1) return { result: s(B * I * pos(v.L, 0.2) * Math.sin(th)), unit: "N (force)", extra: `per metre: ${fmt(B * I * Math.sin(th), 8)} N/m` };
  if (m === 2) {
    const r = pos(v.r, 0.01);
    return { result: s(fin((MU0 * I) / (2 * Math.PI * r))), unit: "T (field)", extra: `${fmt(((MU0 * I) / (2 * Math.PI * r)) * 1e4, 8)} gauss` };
  }
  const N = pos(v.N, 500), L = pos(v.L, 0.2), Bs = fin((MU0 * N * I) / L);
  return { result: s(Bs), unit: "T (field)", extra: `${fmt(Bs * 1e4, 8)} gauss; n = ${fmt(N / L)} turns/m` };
};
export const COOL_MODE = ["Temperature after time t", "Time to reach a temperature", "Find k from one measurement"];
export const newtonCooling: SciCalculator = (v) => {
  const m = pick(v.mode, 3), T0 = num(v.T0, 90), Ta = num(v.Ta, 20);
  let k = pos(v.k, 0.05);
  if (m === 2) {
    const t1 = pos(v.t1, 10), T1 = num(v.T1, 60);
    k = fin(-Math.log((T1 - Ta) / (T0 - Ta)) / t1);
  }
  if (m === 1) {
    const Tt = num(v.Tt, 40);
    const t = fin(-Math.log((Tt - Ta) / (T0 - Ta)) / k);
    if (t < 0) throw new InputError("That temperature is not reached while cooling toward the ambient temperature.");
    return { result: s(t, 8), k: s(k, 8), half: s(Math.LN2 / k, 8), label: "time (same units as 1/k)" };
  }
  const t = pos(v.t, 30);
  return { result: s(Ta + (T0 - Ta) * Math.exp(-k * t), 8), k: s(k, 8), half: s(Math.LN2 / k, 8), label: "temperature" };
};
export const EFIELD_MODE = ["Point charge: E = kq/r²", "Parallel plates: E = V/d"];
export const electricField: SciCalculator = (v) => {
  const E = pick(v.mode, 2) === 0 ? fin((KC * num(v.q, 1e-9)) / pos(v.r, 0.1) ** 2) : fin(num(v.V, 100) / pos(v.d, 0.01));
  const qt = num(v.qt, QE);
  return { E: s(E), force: s(E * qt), kvcm: s(E / 1e5, 8), accel: s((E * QE) / ME, 8) };
};
export const rydberg: SciCalculator = (v) => {
  const n1 = Math.max(1, Math.round(pos(v.n1, 2))), n2 = Math.round(pos(v.n2, 3)), Z = Math.max(1, Math.round(pos(v.Z, 1)));
  if (n2 <= n1) throw new InputError("The upper level n₂ must be greater than n₁.");
  const inv = RINF * Z * Z * (1 / (n1 * n1) - 1 / (n2 * n2)), lam = 1 / inv;
  const series = ["Lyman (UV)", "Balmer (visible)", "Paschen (IR)", "Brackett (IR)", "Pfund (IR)", "Humphreys (IR)"][n1 - 1] ?? "far infrared";
  return { nm: s(lam * 1e9), eV: s((H * C * inv) / QE), f: s(C * inv), inv: s(inv), series };
};
export const THERMO_MODE = ["First law: ΔU = Q − W", "Isothermal ideal gas", "Isobaric ideal gas", "Adiabatic ideal gas"];
export const thermodynamics: SciCalculator = (v) => {
  const m = pick(v.mode, 4);
  if (m === 0) {
    const Q = num(v.Q, 500), W = num(v.W, 200);
    return { W: s(W), Q: s(Q), dU: s(Q - W), T2: "—", note: "Q = heat added to the system, W = work done BY the system." };
  }
  const n = pos(v.n, 1), T1 = pos(v.T1, 300), V1 = pos(v.V1, 0.01), V2 = pos(v.V2, 0.02), g = pos(v.gamma, 1.4), Cv = R_GAS / (g - 1);
  if (!V1 || !V2 || !T1) throw new InputError("Volumes and temperature must be positive.");
  if (m === 1) {
    const W = n * R_GAS * T1 * Math.log(V2 / V1);
    return { W: s(W), Q: s(W), dU: 0, T2: s(T1), note: `P₁ = ${fmt((n * R_GAS * T1) / V1, 8)} Pa, P₂ = ${fmt((n * R_GAS * T1) / V2, 8)} Pa` };
  }
  if (m === 2) {
    const P = (n * R_GAS * T1) / V1, T2 = (T1 * V2) / V1, W = P * (V2 - V1), dU = n * Cv * (T2 - T1);
    return { W: s(W), Q: s(dU + W), dU: s(dU), T2: s(T2), note: `P = ${fmt(P, 8)} Pa constant` };
  }
  const T2 = T1 * (V1 / V2) ** (g - 1), dU = n * Cv * (T2 - T1);
  return { W: s(-dU), Q: 0, dU: s(dU), T2: s(T2), note: `PV^γ constant; P₂ = ${fmt((n * R_GAS * T2) / V2, 8)} Pa` };
};
export const DEB_MODE = ["Mass and velocity", "Electron accelerated through a voltage", "Particle with kinetic energy (eV)"];
export const deBroglie: SciCalculator = (v) => {
  const m = pick(v.mode, 3), mass = pos(v.m, ME);
  let p: number;
  if (m === 0) p = mass * num(v.v, 1e6);
  else {
    const K = (m === 1 ? pos(v.V, 100) : pos(v.K, 100)) * QE, M = m === 1 ? ME : mass;
    p = Math.sqrt(K * K + 2 * K * M * C * C) / C;
  }
  const lam = fin(H / Math.abs(p));
  return { lambda: s(lam), nm: s(lam * 1e9), pm: s(lam * 1e12), p: s(p) };
};
export const electronSpeed: SciCalculator = (v) => {
  const V = pos(v.V, 100), K = V * QE, g = 1 + K / (ME * C * C), b = Math.sqrt(1 - 1 / (g * g));
  const T = pos(v.T, 293.15), P = pos(v.P, 101325), d = pos(v.d, 370) * 1e-12;
  const mfp = (KB * T) / (Math.SQRT2 * Math.PI * d * d * P);
  return { speed: s(b * C), pct: s(100 * b, 10), classical: s(Math.sqrt((2 * K) / ME)), mfp: s(mfp), mfpNm: s(mfp * 1e9, 8), gamma: s(g, 12) };
};
export const GRADES = ["N35 (Br 1.17 T)", "N42 (Br 1.29 T)", "N45 (Br 1.33 T)", "N52 (Br 1.43 T)", "Ferrite / ceramic (Br 0.39 T)", "Samarium cobalt (Br 1.05 T)", "Alnico 5 (Br 1.25 T)"];
const BR = [1.17, 1.29, 1.33, 1.43, 0.39, 1.05, 1.25];
export const magnetPull: SciCalculator = (v) => {
  const Br = BR[pick(v.grade, BR.length)], D = pos(v.D, 10) / 1000, L = pos(v.L, 5) / 1000, gap = pos(v.gap, 0) / 1000;
  if (!D || !L) throw new InputError("Diameter and thickness must be positive.");
  const R = D / 2, A = Math.PI * R * R;
  const Bz = (len: number, z: number) => (Br / 2) * ((len + z) / Math.sqrt(R * R + (len + z) ** 2) - z / Math.sqrt(R * R + z * z));
  const Bm = Bz(2 * L, 2 * gap), F = (Bm * Bm * A) / MU0;
  return { kg: s(F / 9.80665, 6), N: s(F, 6), lb: s(F / 4.4482216, 6), surface: s(Bz(L, 0) * 1e4, 6), atGap: s(Bz(L, gap) * 1e4, 6) };
};
export const particleBox: SciCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.n, 1))), L = pos(v.L, 1) * 1e-9, m = pos(v.m, ME);
  if (!L) throw new InputError("Box length must be positive.");
  const En = (k: number) => (k * k * H * H) / (8 * m * L * L);
  const dE = En(n + 1) - En(n);
  return { J: s(En(n)), eV: s(En(n) / QE), next: s(dE / QE), lambda: s(((H * C) / dE) * 1e9), ground: s(En(1) / QE) };
};
export const POT_MODE = ["Point charge: V = kq/r", "Uniform field: V = E·d", "Cell EMF: ε = V + Ir"];
export const electricPotential: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 2) {
    const Vt = num(v.Vt, 1.4), I = num(v.I, 0.5), r = pos(v.rint, 0.2);
    return { V: s(Vt + I * r), U: s((Vt + I * r) * num(v.q, 1)), note: `lost volts Ir = ${fmt(I * r, 8)} V; terminal voltage ${fmt(Vt)} V` };
  }
  const V = m === 0 ? fin((KC * num(v.Q, 1e-9)) / pos(v.r, 0.1)) : num(v.E, 1000) * num(v.d, 0.05);
  return { V: s(V), U: s(V * num(v.q, 1)), note: "U = qV is the potential energy of charge q" };
};
export const FARADAY_MODE = ["Changing flux: ε = −NΔΦ/Δt", "Moving rod: ε = BLv", "Rotating coil (generator peak): ε = NBAω"];
export const faraday: SciCalculator = (v) => {
  const m = pick(v.mode, 3), N = Math.max(1, Math.round(pos(v.N, 100))), R = pos(v.R, 0);
  let e: number;
  if (m === 0) e = fin((-N * (num(v.phi2, 0.002) - num(v.phi1, 0))) / pos(v.t, 0.1));
  else if (m === 1) e = num(v.B, 0.5) * num(v.L, 0.2) * num(v.v, 3);
  else e = N * num(v.B, 0.5) * pos(v.A, 0.01) * ((2 * Math.PI * pos(v.rpm, 3000)) / 60);
  return { emf: s(e), current: R ? s(e / R) : "enter resistance", rms: m === 2 ? s(e / Math.SQRT2) : "—" };
};

export const sciModCustomCalculators: Record<string, SciCalculator> = {
  "time-dilation-calculator": timeDilation,
  "coulombs-law-calculator": coulomb,
  "mass-energy-equivalence-calculator": emc2,
  "magnetic-flux-calculator": magneticFlux,
  "photon-energy-calculator": photonEnergy,
  "relativistic-kinetic-energy-calculator": relativisticKE,
  "magnetic-force-calculator": magneticForce,
  "newtons-law-of-cooling-calculator": newtonCooling,
  "electric-field-calculator": electricField,
  "rydberg-equation-calculator": rydberg,
  "thermodynamics-calculator": thermodynamics,
  "de-broglie-wavelength-calculator": deBroglie,
  "electron-speed-calculator": electronSpeed,
  "magnet-pull-force-calculator": magnetPull,
  "quantum-calculator": particleBox,
  "electric-potential-calculator": electricPotential,
  "faradays-law-calculator": faraday,
};
