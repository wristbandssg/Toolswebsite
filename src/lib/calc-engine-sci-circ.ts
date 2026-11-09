/**
 * Batch: "Science Calculators" → Electrical & Electronics Engineering (circuits, power, components — 47).
 *
 * Conductor resistance from area and resistivity (Cu 0.017241, Al 0.028264 Ω·mm²/m at 20 °C; α
 * 0.00393 / 0.00403 per °C); AWG diameter d = 0.127·92^((36 − n)/39) mm. PT100: Callendar-Van
 * Dusen (IEC 60751). Arc flash: IEEE 1584-2002 empirical equations (screening estimate only).
 * Voltage unbalance: NEMA MG-1 definition and the exact IEC VUF from line-voltage magnitudes.
 * Linear networks (nodal/mesh) solved by Gaussian elimination; transfer-function poles/zeros by
 * Durand-Kerner (sci-math-core polyRoots). Earth fault loop: Zs = Ze + (R1 + R2)·L·temperature
 * factor; max Zs = 0.95·U₀/Ia (Ia = 5/10/20 × In for type B/C/D MCBs).
 * See prisma/create-sci-circ-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, listOf, matrixOf, sum, polyRoots } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const TAU = 2 * Math.PI;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
/** Engineering notation with SI prefix. */
export const eng = (x: number, unit: string, d = 5) => {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return `0 ${unit}`;
  const P = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]] as [number, string][];
  const a = Math.abs(x), p = P.find(([f]) => a >= f * 0.9999999) ?? P[P.length - 1];
  return `${fmt(x / p[0], d)} ${p[1]}${unit}`;
};

// ---------- conductors ----------
const AWG = ["18", "16", "14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"];
const awgArea = (g: string) => { const n = g.includes("/") ? 1 - Number(g.split("/")[0]) : Number(g), d = 0.127 * 92 ** ((36 - n) / 39); return (Math.PI * d * d) / 4; };
const MM2 = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
export const WIRE_SIZES = [...AWG.map((g) => `${g} AWG (${fmt(awgArea(g), 3)} mm²)`), ...MM2.map((m) => `${m} mm²`)];
const sizeArea = (i: number) => (i < AWG.length ? awgArea(AWG[i]) : MM2[i - AWG.length]);
export const METALS = ["Copper", "Aluminium"];
const RHO = [0.017241, 0.028264], ALPHA = [0.00393, 0.00403];
const rPerM = (metal: number, area: number, T: number) => (RHO[metal] * (1 + ALPHA[metal] * (T - 20))) / area;
export const SYSTEM = ["DC / single-phase (2 wires)", "Three-phase (line-to-line)"];
export const voltageDrop: SciCalculator = (v) => {
  const metal = pick(v.metal, 2), area = sizeArea(pick(v.size, WIRE_SIZES.length)), L = pos(v.len, 30), I = pos(v.I, 20), V = pos(v.V, 230), T = num(v.T, 75), three = pick(v.sys, 2) === 1;
  const r = rPerM(metal, area, T), vd = (three ? Math.sqrt(3) : 2) * L * I * r;
  return { vd: s(vd, 6), pct: s((100 * vd) / V, 5), end: s(V - vd, 6), loss: s((three ? 3 : 2) * I * I * r * L, 6), rkm: s(r * 1000, 6), ok: (100 * vd) / V <= 3 ? "Within 3% (branch circuit guideline)" : (100 * vd) / V <= 5 ? "Within 5% total — marginal" : "Above 5% — use a larger conductor" };
};
export const wireResistance: SciCalculator = (v) => {
  const metal = pick(v.metal, 2), area = pick(v.useSize, 2) === 0 ? sizeArea(pick(v.size, WIRE_SIZES.length)) : pos(v.area, 2.5), T = num(v.T, 20), r = rPerM(metal, area, T);
  if (pick(v.mode, 2) === 1) { const R = pos(v.R, 1); return { R: s(R, 8), L: s(R / r, 8), rkm: s(r * 1000, 8), area: s(area, 6) }; }
  const L = pos(v.len, 100);
  return { R: s(r * L, 8), L: s(L, 8), rkm: s(r * 1000, 8), area: s(area, 6) };
};
export const WR_MODE = ["Resistance from length", "Length from resistance"];
export const SIZE_INPUT = ["Pick a standard size", "Enter area in mm²"];
const AMP_CU75: Record<string, number> = { "14": 20, "12": 25, "10": 35, "8": 50, "6": 65, "4": 85, "3": 100, "2": 115, "1": 130, "1/0": 150, "2/0": 175, "3/0": 200, "4/0": 230 };
export const wiringSize: SciCalculator = (v) => {
  const I = pos(v.I, 30), L = pos(v.len, 40), V = pos(v.V, 240), maxPct = pos(v.max, 3), metal = pick(v.metal, 2), three = pick(v.sys, 2) === 1;
  const k = three ? Math.sqrt(3) : 2;
  for (const g of ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0"]) {
    const amp = AMP_CU75[g] * (metal === 1 ? 0.78 : 1), r = rPerM(metal, awgArea(g), 75), pct = (100 * k * L * I * r) / V;
    if (amp >= I && pct <= maxPct) return { size: `${g} AWG (${fmt(awgArea(g), 4)} mm²)`, amp: s(amp, 4), pct: s(pct, 4), note: `Smallest size meeting ${fmt(maxPct)}% drop and 75 °C ampacity (NEC 310.16 values${metal === 1 ? ", aluminium ≈ 78%" : ""})` };
  }
  throw new InputError("Even 4/0 AWG isn't enough — use parallel conductors or a higher voltage.");
};

// ---------- basic laws ----------
export const OHM_KNOWN = ["Voltage & current", "Voltage & resistance", "Current & resistance", "Power & voltage", "Power & current", "Power & resistance"];
export const ohmsLaw: SciCalculator = (v) => {
  const k = pick(v.known, 6), V0 = num(v.V, 12), I0 = num(v.I, 2), R0 = pos(v.R, 6), P0 = pos(v.P, 24);
  let V: number, I: number, R: number;
  if (k === 0) { V = V0; I = I0; R = V / I; } else if (k === 1) { V = V0; R = R0; I = V / R; } else if (k === 2) { I = I0; R = R0; V = I * R; }
  else if (k === 3) { V = V0; I = P0 / V; R = V / I; } else if (k === 4) { I = I0; V = P0 / I; R = V / I; } else { R = R0; I = Math.sqrt(P0 / R); V = I * R; }
  return { V: s(fin(V)), I: s(fin(I)), R: s(fin(R)), P: s(V * I), summary: `${eng(V, "V")}, ${eng(I, "A")}, ${eng(R, "Ω")}, ${eng(V * I, "W")}` };
};
export const DIV_MODE = ["Output voltage from R1, R2", "R2 for a target output"];
export const voltageDivider: SciCalculator = (v) => {
  const Vin = num(v.vin, 12), R1 = pos(v.r1, 10000), RL = pos(v.rl, 0);
  if (pick(v.mode, 2) === 1) {
    const Vo = num(v.vout, 5), R2 = fin((Vo * R1) / (Vin - Vo));
    return { vout: s(Vo), r2: s(R2, 8), current: s(Vin / (R1 + R2), 6), loaded: "—" };
  }
  const R2 = pos(v.r2, 4700), R2e = RL ? (R2 * RL) / (R2 + RL) : R2;
  return { vout: s((Vin * R2) / (R1 + R2)), r2: s(R2, 8), current: s(Vin / (R1 + R2), 6), loaded: RL ? s((Vin * R2e) / (R1 + R2e)) : "enter load" };
};
export const seriesParallel: SciCalculator = (v) => {
  const r = listOf(v, "r", 1), V = num(v.V, 12);
  if (r.some((x) => x <= 0)) throw new InputError("Resistances must be positive.");
  const Rs = sum(r), Rp = 1 / sum(r.map((x) => 1 / x));
  return { series: s(Rs), parallel: s(Rp), Is: s(V / Rs), Ip: s(V / Rp), Ps: s((V * V) / Rs), Pp: s((V * V) / Rp), branch: r.map((x, i) => `R${i + 1}: ${eng(V / x, "A")} (parallel), ${eng((V * x) / Rs, "V")} (series)`).join("\n") };
};
export const currentDivider: SciCalculator = (v) => {
  const I = num(v.I, 1), r = listOf(v, "r", 2), G = sum(r.map((x) => 1 / x));
  return { branches: r.map((x, i) => `R${i + 1} (${eng(x, "Ω")}): ${eng(I / x / G, "A")}`).join("\n"), Req: s(1 / G), V: s(I / G), first: s(I / r[0] / G) };
};
export const capSeriesParallel: SciCalculator = (v) => {
  const c = listOf(v, "c", 1), V = num(v.V, 0);
  const Cp = sum(c), Cs = 1 / sum(c.map((x) => 1 / x));
  return { parallel: s(Cp), series: s(Cs), pP: eng(Cp * 1e-6, "F"), pS: eng(Cs * 1e-6, "F"), charge: V ? `parallel ${eng(Cp * 1e-6 * V, "C")}, series ${eng(Cs * 1e-6 * V, "C")}` : "enter voltage" };
};
export const resistorPower: SciCalculator = (v) => {
  const r = pos(v.R, 220), k = pick(v.known, 2), x = num(v.x, 5);
  const P = k === 0 ? (x * x) / r : x * x * r;
  const std = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100].find((w) => w >= 2 * P);
  return { P: s(P, 8), mW: s(P * 1000, 8), rating: std ? `${std} W (≥ 2× safety)` : "> 100 W — use a power resistor bank", I: s(k === 0 ? x / r : x, 8) };
};
export const RP_KNOWN = ["Voltage across the resistor", "Current through the resistor"];
const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const nearestE24 = (r: number, up = true) => {
  const dec = 10 ** Math.floor(Math.log10(r)), m = r / dec;
  const pick1 = up ? E24.find((e) => e >= m - 1e-9) ?? 10 : [...E24].reverse().find((e) => e <= m + 1e-9) ?? 1;
  return pick1 * dec;
};
export const droppingResistor: SciCalculator = (v) => {
  const Vs = num(v.vs, 12), Vl = num(v.vl, 5), I = pos(v.I, 0.1);
  if (!(Vs > Vl)) throw new InputError("Supply must be higher than the load voltage.");
  const R = (Vs - Vl) / I, Rstd = nearestE24(R);
  return { R: s(R, 8), std: eng(Rstd, "Ω"), P: s((Vs - Vl) * I, 6), Pstd: s(((Vs - Vl) ** 2) / Rstd, 6), Iact: s((Vs - Vl) / Rstd, 6) };
};
export const resistivity: SciCalculator = (v) => {
  const R = pos(v.R, 0.5), L = pos(v.L, 10), A = pos(v.A, 1) * 1e-6;
  const rho = fin((R * A) / L), mats: [string, number][] = [["silver", 1.59e-8], ["copper", 1.72e-8], ["gold", 2.44e-8], ["aluminium", 2.82e-8], ["tungsten", 5.6e-8], ["iron", 9.7e-8], ["steel", 1.43e-7], ["nichrome", 1.1e-6]];
  const close = mats.reduce((p, q) => (Math.abs(Math.log(q[1] / rho)) < Math.abs(Math.log(p[1] / rho)) ? q : p));
  return { rho: s(rho, 8), sigma: s(1 / rho, 8), G: s(1 / R, 8), iacs: s((100 * 1.7241e-8) / rho, 6), closest: `${close[0]} (${eng(close[1], "Ω·m")})` };
};
export const wheatstone: SciCalculator = (v) => {
  const R1 = pos(v.r1, 1000), R2 = pos(v.r2, 1000), R3 = pos(v.r3, 500), Rx = pos(v.rx, 520), Vs = num(v.vs, 5);
  const bal = (R3 * R2) / R1, Vout = Vs * (Rx / (R3 + Rx) - R2 / (R1 + R2));
  return { balance: s(bal, 8), vout: s(Vout, 8), mv: s(Vout * 1000, 8), state: Math.abs(Vout) < 1e-12 ? "Balanced" : "Unbalanced" };
};

// ---------- RC, RL, LC ----------
export const FILTER_TYPE = ["Low-pass", "High-pass"];
export const rcFilter: SciCalculator = (v) => {
  const R = pos(v.R, 1000), C = pos(v.C, 0.1) * 1e-6, f = pos(v.f, 1000), hp = pick(v.type, 2) === 1;
  const fc = 1 / (TAU * R * C), x = f / fc, mag = hp ? x / Math.sqrt(1 + x * x) : 1 / Math.sqrt(1 + x * x), ph = hp ? 90 - (Math.atan(x) * 180) / Math.PI : (-Math.atan(x) * 180) / Math.PI;
  return { fc: s(fc, 8), tau: s(R * C, 8), gain: s(20 * Math.log10(mag), 6), phase: s(ph, 6), ratio: s(mag, 6) };
};
export const ZMODE = ["Series R-L-C", "Parallel R-L-C"];
export const reactance: SciCalculator = (v) => {
  const R = pos(v.R, 100), L = pos(v.L, 10) * 1e-3, C = pos(v.C, 10) * 1e-6, f = pos(v.f, 50), w = TAU * f;
  const XL = w * L, XC = C ? 1 / (w * C) : Infinity;
  let re: number, im: number;
  if (pick(v.mode, 2) === 0) { re = R; im = XL - (Number.isFinite(XC) ? XC : 0); }
  else {
    const g = R ? 1 / R : 0, b = (C ? w * C : 0) - (L ? 1 / (w * L) : 0), d = g * g + b * b;
    re = g / d; im = -b / d;
  }
  const Z = Math.hypot(re, im), ph = (Math.atan2(im, re) * 180) / Math.PI;
  return { Z: s(Z, 8), phase: s(ph, 6), XL: s(XL, 8), XC: Number.isFinite(XC) ? s(XC, 8) : "∞", rect: `${fmt(re, 6)} ${im < 0 ? "−" : "+"} j${fmt(Math.abs(im), 6)} Ω`, nature: Math.abs(ph) < 0.01 ? "Resistive" : ph > 0 ? "Inductive" : "Capacitive" };
};
export const capReactance: SciCalculator = (v) => {
  const f = pos(v.f, 1000);
  if (pick(v.mode, 2) === 1) { const X = pos(v.X, 159.15); return { X: s(X, 8), C: s((1 / (TAU * f * X)) * 1e6, 8), pretty: eng(1 / (TAU * f * X), "F") }; }
  const C = pos(v.C, 1) * 1e-6, X = 1 / (TAU * f * C);
  return { X: s(fin(X), 8), C: s(C * 1e6, 8), pretty: eng(X, "Ω") };
};
export const XC_MODE = ["Reactance from capacitance", "Capacitance for a reactance"];
export const indReactance: SciCalculator = (v) => {
  const f = pos(v.f, 1000);
  if (pick(v.mode, 2) === 1) { const X = pos(v.X, 62.83); return { X: s(X, 8), L: s((X / (TAU * f)) * 1e3, 8), pretty: eng(X / (TAU * f), "H") }; }
  const L = pos(v.L, 10) * 1e-3, X = TAU * f * L;
  return { X: s(X, 8), L: s(L * 1e3, 8), pretty: eng(X, "Ω") };
};
export const XL_MODE = ["Reactance from inductance", "Inductance for a reactance"];
export const LC_SOLVE = ["Resonant frequency", "Inductance for a frequency", "Capacitance for a frequency"];
export const lcResonance: SciCalculator = (v) => {
  const k = pick(v.solve, 3), L = pos(v.L, 10) * 1e-6, C = pos(v.C, 100) * 1e-12, f = pos(v.f, 5.03e6);
  let LL = L, CC = C, ff = f;
  if (k === 0) ff = 1 / (TAU * Math.sqrt(L * C));
  else if (k === 1) LL = 1 / ((TAU * f) ** 2 * C);
  else CC = 1 / ((TAU * f) ** 2 * L);
  return { f: s(fin(ff), 8), L: s(LL * 1e6, 8), C: s(CC * 1e12, 8), Z0: s(Math.sqrt(LL / CC), 8), pretty: `${eng(ff, "Hz")}, ${eng(LL, "H")}, ${eng(CC, "F")}` };
};
export const rlc: SciCalculator = (v) => {
  const R = pos(v.R, 10), L = pos(v.L, 1) * 1e-3, C = pos(v.C, 1) * 1e-6;
  const w0 = 1 / Math.sqrt(L * C), f0 = w0 / TAU, Q = (1 / R) * Math.sqrt(L / C), zeta = (R / 2) * Math.sqrt(C / L);
  return { f0: s(f0, 8), Q: s(Q, 6), bw: s(f0 / Q, 8), zeta: s(zeta, 6), type: zeta < 1 ? "Underdamped (rings)" : zeta === 1 ? "Critically damped" : "Overdamped", fd: zeta < 1 ? s((w0 * Math.sqrt(1 - zeta * zeta)) / TAU, 8) : "—" };
};
export const RC_MODE = ["Charging", "Discharging"];
export const capCharge: SciCalculator = (v) => {
  const R = pos(v.R, 10000), C = pos(v.C, 100) * 1e-6, Vs = pos(v.Vs, 5), V0 = num(v.V0, 0), tau = R * C, chg = pick(v.mode, 2) === 0, t = pos(v.t, 1), Vt = num(v.Vt, 3.16);
  const Vat = chg ? Vs + (V0 - Vs) * Math.exp(-t / tau) : V0 * Math.exp(-t / tau);
  const tTo = chg ? -tau * Math.log((Vs - Vt) / (Vs - V0)) : -tau * Math.log(Vt / V0);
  return { tau: s(tau, 8), Vat: s(Vat, 8), tTo: Number.isFinite(tTo) && tTo >= 0 ? s(tTo, 8) : "never reached", full: s(5 * tau, 8), Iat: s(((chg ? Vs - Vat : Vat) / R) * 1000, 8) };
};
export const capEnergy: SciCalculator = (v) => {
  const C = pos(v.C, 1000) * 1e-6, V = num(v.V, 12), E = 0.5 * C * V * V;
  return { E: s(E, 8), Q: s(C * V, 8), mWh: s((E / 3600) * 1000, 8), pretty: `${eng(E, "J")}, ${eng(C * V, "C")}` };
};
export const parallelPlate: SciCalculator = (v) => {
  const er = pos(v.er, 1), A = pos(v.A, 100) * 1e-4, d = pos(v.d, 1) * 1e-3, V = num(v.V, 0), C = (8.8541878128e-12 * er * A) / d;
  return { C: s(fin(C) * 1e12, 8), pretty: eng(C, "F"), Q: V ? s(C * V, 8) : "enter voltage", E: V ? s(0.5 * C * V * V, 8) : "—" };
};
export const IND_MODE = ["Single-layer air-core coil (Wheeler)", "Core with AL value", "Toroid with known permeability"];
export const inductance: SciCalculator = (v) => {
  const m = pick(v.mode, 3), N = pos(v.N, 50);
  if (m === 1) { const AL = pos(v.al, 100), L = AL * N * N * 1e-9; return { L: s(L * 1e6, 8), pretty: eng(L, "H"), note: `L = AL·N² (AL in nH/turn²)` }; }
  if (m === 2) {
    const mu = pos(v.mu, 2000), od = pos(v.od, 20) / 1000, id = pos(v.id, 10) / 1000, h = pos(v.h, 5) / 1000;
    const L = (4e-7 * Math.PI * mu * N * N * h * Math.log(od / id)) / TAU;
    return { L: s(L * 1e6, 8), pretty: eng(L, "H"), note: "L = μ₀μᵣN²h·ln(OD/ID)/(2π)" };
  }
  const d = pos(v.d, 20) / 25.4, l = pos(v.l, 30) / 25.4, L = (d * d * N * N) / (18 * d + 40 * l);
  return { L: s(L, 8), pretty: eng(L * 1e-6, "H"), note: "Wheeler: L(µH) = d²N²/(18d + 40l), d and l in inches (accurate to ~1% for l > 0.4d)" };
};

// ---------- timers, PWM, sensors ----------
export const TIMER_MODE = ["Astable (oscillator)", "Monostable (one-shot)"];
export const timer555: SciCalculator = (v) => {
  const C = pos(v.C, 10) * 1e-6;
  if (pick(v.mode, 2) === 1) { const R = pos(v.R, 100000), t = 1.1 * R * C; return { f: "—", high: s(t, 8), low: "—", duty: "—", period: s(t, 8) }; }
  const R1 = pos(v.r1, 1000), R2 = pos(v.r2, 10000), th = 0.693 * (R1 + R2) * C, tl = 0.693 * R2 * C;
  return { f: s(1 / (th + tl), 8), high: s(th, 8), low: s(tl, 8), duty: s((100 * th) / (th + tl), 6), period: s(th + tl, 8) };
};
export const dutyCycle: SciCalculator = (v) => {
  const ton = pos(v.ton, 2), period = pick(v.mode, 2) === 0 ? pos(v.T, 10) : 1000 / pos(v.f, 100), Vp = num(v.Vp, 12);
  if (ton > period) throw new InputError("On-time can't exceed the period.");
  const D = ton / period;
  return { duty: s(100 * D, 6), off: s(period - ton, 8), avg: s(D * Vp, 8), rms: s(Math.sqrt(D) * Vp, 8), f: s(1000 / period, 8) };
};
export const DUTY_MODE = ["Period known (ms)", "Frequency known (Hz)"];
export const pt100: SciCalculator = (v) => {
  const R0 = pick(v.type, 2) === 0 ? 100 : 1000, A = 3.9083e-3, B = -5.775e-7, Cc = -4.183e-12;
  const Rt = (T: number) => R0 * (1 + A * T + B * T * T + (T < 0 ? Cc * (T - 100) * T ** 3 : 0));
  if (pick(v.mode, 2) === 0) {
    const R = pos(v.R, 138.51);
    let T = (-A + Math.sqrt(A * A - 4 * B * (1 - R / R0))) / (2 * B);
    if (R < R0) for (let i = 0; i < 50; i++) { const d = (Rt(T + 1e-6) - Rt(T)) / 1e-6; T -= (Rt(T) - R) / d; }
    return { T: s(T, 8), F: s((T * 9) / 5 + 32, 8), R: s(R, 8), alpha: "α = 0.00385 /°C (IEC 60751)" };
  }
  const T = num(v.T, 100);
  return { T: s(T, 8), F: s((T * 9) / 5 + 32, 8), R: s(Rt(T), 8), alpha: "α = 0.00385 /°C (IEC 60751)" };
};
export const PT_TYPE = ["PT100 (100 Ω at 0 °C)", "PT1000 (1,000 Ω at 0 °C)"];
export const PT_MODE = ["Resistance → temperature", "Temperature → resistance"];
export const THERM_MODE = ["Beta equation: temperature → resistance", "Beta equation: resistance → temperature", "Steinhart-Hart: resistance → temperature"];
export const thermistor: SciCalculator = (v) => {
  const m = pick(v.mode, 3), R25 = pos(v.r25, 10000), B = pos(v.beta, 3950), T0 = 298.15;
  if (m === 0) { const T = num(v.T, 50) + 273.15, R = R25 * Math.exp(B * (1 / T - 1 / T0)); return { T: s(T - 273.15, 8), R: s(R, 8), alpha: s((-B / (T * T)) * 100, 6) }; }
  const R = pos(v.R, 3588);
  let invT: number;
  if (m === 1) invT = 1 / T0 + Math.log(R / R25) / B;
  else { const L = Math.log(R); invT = num(v.a, 1.009249522e-3) + num(v.b, 2.378405444e-4) * L + num(v.c, 2.019202697e-7) * L ** 3; }
  const T = 1 / invT;
  return { T: s(T - 273.15, 8), R: s(R, 8), alpha: s((-B / (T * T)) * 100, 6) };
};

// ---------- power systems ----------
export const powerFactor: SciCalculator = (v) => {
  const P = pos(v.P, 50), pf = Math.min(1, pos(v.pf, 0.75)), tgt = Math.min(1, pos(v.target, 0.95)), V = pos(v.V, 400), f = pos(v.f, 50), three = pick(v.sys, 2) === 1;
  const S = P / pf, Q = Math.sqrt(S * S - P * P), Q2 = P * Math.tan(Math.acos(tgt)), Qc = Math.max(0, Q - Q2);
  const C = (Qc * 1000) / (TAU * f * V * V * (three ? 3 : 1));
  const I = (S * 1000) / (three ? Math.sqrt(3) * V : V);
  return { kvar: s(Q, 8), kva: s(S, 8), angle: s((Math.acos(pf) * 180) / Math.PI, 6), Qc: s(Qc, 8), uf: s(C * 1e6, 8), I: s(I, 8), I2: s((P * 1000) / tgt / (three ? Math.sqrt(3) * V : V), 8) };
};
export const motor: SciCalculator = (v) => {
  const unit = pick(v.unit, 2), P = unit === 0 ? pos(v.P, 10) * 0.7457 : pos(v.P, 7.5), V = pos(v.V, 400), eff = pos(v.eff, 90) / 100, pf = pos(v.pf, 0.85), three = pick(v.sys, 2) === 1, rpm = pos(v.rpm, 1450);
  const I = (P * 1000) / ((three ? Math.sqrt(3) : 1) * V * eff * pf);
  return { I: s(I, 6), kw: s(P, 6), hp: s(P / 0.7457, 6), torque: s((P * 1000) / ((rpm * TAU) / 60), 6), input: s(P / eff, 6), start: s(6.5 * I, 5) };
};
export const POWER_UNIT = ["Horsepower (hp)", "Kilowatts (kW)"];
export const transformer: SciCalculator = (v) => {
  const kva = pos(v.kva, 100), Vp = pos(v.vp, 11000), Vs = pos(v.vs, 415), three = pick(v.sys, 2) === 1, Np = pos(v.np, 1000), mult = pos(v.inrush, 10);
  const k = three ? Math.sqrt(3) : 1, Ip = (kva * 1000) / (k * Vp), Is = (kva * 1000) / (k * Vs);
  return { ratio: s(Vp / Vs, 8), Ns: s((Np * Vs) / Vp, 6), Ip: s(Ip, 6), Is: s(Is, 6), inrush: s(mult * Ip, 6), tpv: s(Np / Vp, 6) };
};
export const busbar: SciCalculator = (v) => {
  const I = pos(v.I, 630), metal = pick(v.metal, 2), J = pos(v.J, metal === 0 ? 1.6 : 1.0), t = pos(v.t, 10), L = pos(v.L, 1);
  const A = I / J, w = A / t, r = RHO[metal] * (1 + ALPHA[metal] * 70) / A;
  const stdW = [12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 160, 200].find((x) => x >= w);
  return { A: s(A, 6), w: s(w, 6), std: stdW ? `${stdW} × ${fmt(t)} mm` : "use multiple bars", loss: s(I * I * r * L, 6), rmicro: s(r * 1e6, 6) };
};
export const efli: SciCalculator = (v) => {
  const U0 = pos(v.u0, 230), Ze = pos(v.ze, 0.35), L = pos(v.len, 25), r12 = pos(v.r12, 19.51), tf = pos(v.tf, 1.2), type = pick(v.type, 3), In = pos(v.In, 32);
  const Zs = Ze + (r12 * L * tf) / 1000, Ia = [5, 10, 20][type] * In, Zmax = (0.95 * U0) / Ia;
  return { Zs: s(Zs, 6), Ipf: s(U0 / Zs, 6), Zmax: s(Zmax, 6), result: Zs <= Zmax ? "PASS — device disconnects in time" : "FAIL — Zs too high for this device", r1r2: s((r12 * L) / 1000, 6) };
};
export const MCB_TYPES = ["Type B (5 × In)", "Type C (10 × In)", "Type D (20 × In)"];
export const ARC_EQUIP = ["Switchgear (LV)", "Panelboard / MCC (LV)", "Cable / open air (LV)", "Switchgear (MV 5 kV)", "Switchgear (MV 15 kV)"];
const ARC_G = [32, 25, 13, 102, 153], ARC_X = [1.473, 1.641, 2, 0.973, 0.973], ARC_D = [610, 455, 455, 910, 910];
export const arcFlash: SciCalculator = (v) => {
  const k = pick(v.equip, 5), Ibf = pos(v.ibf, 20), Vk = pos(v.V, 0.48), t = pos(v.t, 0.1), box = pick(v.encl, 2) === 0, grounded = pick(v.gnd, 2) === 0, D = pos(v.D, ARC_D[k]), G = ARC_G[k], x = ARC_X[k];
  if (Vk > 15) throw new InputError("The IEEE 1584-2002 model covers up to 15 kV.");
  const lgI = Math.log10(Ibf), lgIa = Vk < 1 ? (box ? -0.097 : -0.153) + 0.662 * lgI + 0.0966 * Vk + 0.000526 * G + 0.5588 * Vk * lgI - 0.00304 * G * lgI : 0.00402 + 0.983 * lgI;
  const Ia = 10 ** lgIa, lgEn = (box ? -0.555 : -0.792) + (grounded ? -0.113 : 0) + 1.081 * lgIa + 0.0011 * G, En = 10 ** lgEn, Cf = Vk <= 1 ? 1.5 : 1;
  const E = 4.184 * Cf * En * (t / 0.2) * (610 ** x / D ** x), cal = E / 4.184, DB = (4.184 * Cf * En * (t / 0.2) * (610 ** x / 5)) ** (1 / x);
  const cat = cal < 1.2 ? "Below 1.2 cal/cm² (no arc-rated PPE threshold)" : cal <= 4 ? "PPE Category 1 (4 cal/cm²)" : cal <= 8 ? "PPE Category 2 (8 cal/cm²)" : cal <= 25 ? "PPE Category 3 (25 cal/cm²)" : cal <= 40 ? "PPE Category 4 (40 cal/cm²)" : "Above 40 cal/cm² — DANGER, de-energise";
  return { cal: s(cal, 5), J: s(E, 5), Ia: s(Ia, 5), boundary: s(DB, 5), ppe: cat };
};
export const ENCL = ["In a box / enclosure", "Open air"];
export const GND = ["Solidly grounded", "Ungrounded / high-resistance grounded"];
export const rms: SciCalculator = (v) => {
  const w = pick(v.wave, 4), k = pick(v.known, 4), x = pos(v.x, 230);
  if (w === 4) return { peak: "—", pp: "—", rms: s(Math.sqrt(pos(v.psd, 0.04) * pos(v.bw, 1980)), 8), avg: "—", crest: "GRMS = √(PSD × bandwidth)" };
  const RMS = [1 / Math.SQRT2, 1, 1 / Math.sqrt(3), 1 / Math.sqrt(3)][w], AVG = [2 / Math.PI, 1, 0.5, 0.5][w];
  const peak = k === 0 ? x : k === 1 ? x / 2 : k === 2 ? x / RMS : x / AVG;
  return { peak: s(peak, 8), pp: s(2 * peak, 8), rms: s(peak * RMS, 8), avg: s(peak * AVG, 8), crest: `crest factor ${fmt(1 / RMS, 5)}, form factor ${fmt(RMS / AVG, 5)}` };
};
export const WAVES = ["Sine", "Square", "Triangle", "Sawtooth", "Random vibration (GRMS from flat PSD)"];
export const RMS_KNOWN = ["Peak", "Peak-to-peak", "RMS", "Average (rectified)"];
type Cx = [number, number];
const cadd = (a: Cx, b: Cx): Cx => [a[0] + b[0], a[1] + b[1]];
const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const pol = (m: number, deg: number): Cx => [m * Math.cos((deg * Math.PI) / 180), m * Math.sin((deg * Math.PI) / 180)];
const polStr = (c: Cx) => (Math.hypot(c[0], c[1]) < 1e-9 ? "0" : `${fmt(Math.hypot(c[0], c[1]), 6)} ∠ ${fmt(Math.abs(c[1]) < 1e-12 && c[0] > 0 ? 0 : (Math.atan2(c[1], c[0]) * 180) / Math.PI, 5)}°`);
export const symComponents: SciCalculator = (v) => {
  const Va = pol(pos(v.ma, 1), num(v.aa, 0)), Vb = pol(pos(v.mb, 1), num(v.ab, -120)), Vc = pol(pos(v.mc, 1), num(v.ac, 120)), a = pol(1, 120), a2 = pol(1, 240);
  const third = (c: Cx): Cx => [c[0] / 3, c[1] / 3];
  const V0 = third(cadd(cadd(Va, Vb), Vc)), V1 = third(cadd(cadd(Va, cmul(a, Vb)), cmul(a2, Vc))), V2 = third(cadd(cadd(Va, cmul(a2, Vb)), cmul(a, Vc)));
  const m1 = Math.hypot(...V1);
  const z = (x: number) => (x < 1e-9 ? 0 : s(x, 6));
  return { V0: polStr(V0), V1: polStr(V1), V2: polStr(V2), unb: m1 ? z((100 * Math.hypot(...V2)) / m1) : "—", zero: m1 ? z((100 * Math.hypot(...V0)) / m1) : "—" };
};
export const voltageImbalance: SciCalculator = (v) => {
  const V = [pos(v.v1, 400), pos(v.v2, 410), pos(v.v3, 395)], avg = sum(V) / 3, dev = Math.max(...V.map((x) => Math.abs(x - avg))), nema = (100 * dev) / avg;
  const b = sum(V.map((x) => x ** 4)) / sum(V.map((x) => x * x)) ** 2, r = Math.sqrt(Math.max(0, 3 - 6 * b)), vuf = 100 * Math.sqrt((1 - r) / (1 + r));
  const derate = nema <= 1 ? 1 : nema <= 2 ? 1 - 0.025 * (nema - 1) : nema <= 3 ? 0.975 - 0.075 * (nema - 2) : nema <= 4 ? 0.9 - 0.07 * (nema - 3) : nema <= 5 ? 0.83 - 0.08 * (nema - 4) : 0.75;
  return { nema: s(nema, 6), vuf: s(vuf, 6), avg: s(avg, 6), derate: s(derate, 4), ok: nema > 5 ? "Above 5% — don't run motors" : nema > 1 ? "Derate motors (NEMA MG-1)" : "Acceptable" };
};

// ---------- networks & control ----------
const solveLinear = (A: number[][], b: number[]) => {
  const n = A.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) throw new InputError("The matrix is singular — check for a floating node or a missing reference.");
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
};
export const NODAL_MODE = ["Nodal analysis (G·V = I)", "Mesh analysis (R·I = V)"];
export const nodal: SciCalculator = (v) => {
  const A = matrixOf(txt(v, "matrix")), b = listOf(v, "rhs", 1);
  if (A.length !== A[0].length || b.length !== A.length) throw new InputError("Enter a square matrix and one right-hand value per row.");
  const x = solveLinear(A, b), mesh = pick(v.mode, 2) === 1;
  return { solution: x.map((q, i) => `${mesh ? "I" : "V"}${i + 1} = ${fmt(q, 8)} ${mesh ? "A" : "V"}`).join("\n"), first: s(x[0], 10), check: `residual ${fmt(Math.max(...A.map((r, i) => Math.abs(sum(r.map((c, j) => c * x[j])) - b[i]))), 3)}` };
};
export const transferFunction: SciCalculator = (v) => {
  const nm = listOf(v, "num", 1), dn = listOf(v, "den", 1), w = pos(v.w, 1);
  const zeros = nm.length > 1 ? polyRoots([...nm].reverse()) : [], poles = polyRoots([...dn].reverse());
  const evalAt = (c: number[], s0: Cx): Cx => c.reduce<Cx>((acc, k) => cadd(cmul(acc, s0), [k, 0]), [0, 0]);
  const N = evalAt(nm, [0, w]), D = evalAt(dn, [0, w]), dd2 = D[0] ** 2 + D[1] ** 2, H: Cx = [(N[0] * D[0] + N[1] * D[1]) / dd2, (N[1] * D[0] - N[0] * D[1]) / dd2];
  const show = (r: [number, number][]) => (r.length ? r.map(([re, im]) => (Math.abs(im) < 1e-9 ? fmt(re, 6) : `${fmt(re, 6)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im), 6)}j`)).join(", ") : "none");
  const stable = poles.every((p) => p[0] < -1e-12);
  return { poles: show(poles), zeros: show(zeros), dc: dn[dn.length - 1] ? s(nm[nm.length - 1] / dn[dn.length - 1], 8) : "∞ (pole at origin)", mag: s(20 * Math.log10(Math.hypot(...H)), 6), phase: s((Math.atan2(H[1], H[0]) * 180) / Math.PI, 6), stable: stable ? "Stable (all poles in the left half-plane)" : "Not stable — pole(s) on or right of the jω axis" };
};
export const differentialAmp: SciCalculator = (v) => {
  const R1 = pos(v.r1, 10000), R2 = pos(v.r2, 100000), R3 = pos(v.r3, 10000), R4 = pos(v.r4, 100000), V1 = num(v.v1, 1), V2 = num(v.v2, 1.1);
  const Vout = (R4 / (R3 + R4)) * (1 + R2 / R1) * V2 - (R2 / R1) * V1;
  const Ad = 0.5 * ((R4 / (R3 + R4)) * (1 + R2 / R1) + R2 / R1), Acm = (R4 / (R3 + R4)) * (1 + R2 / R1) - R2 / R1;
  return { vout: s(Vout, 8), Ad: s(Ad, 8), Acm: s(Acm, 6), cmrr: Math.abs(Acm) < 1e-12 ? "∞ (perfectly matched)" : s(20 * Math.log10(Math.abs(Ad / Acm)), 6) };
};
export const COMP_MODE = ["Inverting Schmitt trigger", "Non-inverting Schmitt trigger"];
export const comparator: SciCalculator = (v) => {
  const Vcc = pos(v.vcc, 5), Vref = num(v.vref, 2.5), R1 = pos(v.r1, 10000), R2 = pos(v.r2, 100000);
  let hi: number, lo: number;
  if (pick(v.mode, 2) === 0) { lo = (Vref * R2) / (R1 + R2); hi = lo + (Vcc * R1) / (R1 + R2); }
  else { hi = Vref * (1 + R1 / R2); lo = hi - (Vcc * R1) / R2; }
  return { hi: s(hi, 8), lo: s(lo, 8), hyst: s(hi - lo, 8), center: s((hi + lo) / 2, 8) };
};
export const TR_MODE = ["Voltage-divider bias (common emitter)", "Saturated switch (base resistor)"];
export const transistor: SciCalculator = (v) => {
  const beta = pos(v.beta, 100), Vbe = pos(v.vbe, 0.7);
  if (pick(v.mode, 2) === 1) {
    const Vin = pos(v.vin, 5), Ic = pos(v.ic, 0.1), forced = pos(v.forced, 10), Rb = (Vin - Vbe) / (Ic / forced);
    return { Ic: s(Ic * 1000, 6), Vce: "≈ 0.2 (saturated)", region: `Rb ≤ ${eng(Rb, "Ω")} (forced β = ${fmt(forced)})`, Ib: s((Ic / forced) * 1000, 6), Rb: s(nearestE24(Rb, false), 6) };
  }
  const Vcc = pos(v.vcc, 12), R1 = pos(v.r1, 47000), R2 = pos(v.r2, 10000), Rc = pos(v.rc, 2200), Re = pos(v.re, 470);
  const Vth = (Vcc * R2) / (R1 + R2), Rth = (R1 * R2) / (R1 + R2), Ib = Math.max(0, (Vth - Vbe) / (Rth + (beta + 1) * Re));
  let Ic = beta * Ib, Vce = Vcc - Ic * Rc - (Ic + Ib) * Re, region = Ib === 0 ? "Cut-off" : "Active";
  if (Vce < 0.2) { Ic = (Vcc - 0.2) / (Rc + Re); Vce = 0.2; region = "Saturation"; }
  return { Ic: s(Ic * 1000, 6), Vce: s(Vce, 6), region, Ib: s(Ib * 1e6, 6), Rb: s(Vcc - Ic * Rc, 6) };
};
export const DIODE_MODE = ["Current from voltage (Shockley)", "Voltage from current", "Series resistor circuit"];
export const diode: SciCalculator = (v) => {
  const Is = pos(v.is, 1e-12), n = pos(v.n, 1), T = num(v.T, 25) + 273.15, Vt = (1.380649e-23 * T) / 1.602176634e-19, m = pick(v.mode, 3);
  if (m === 0) { const Vd = num(v.vd, 0.6), I = Is * (Math.exp(Vd / (n * Vt)) - 1); return { I: s(I, 8), Vd: s(Vd, 8), P: s(I * Vd, 8), Vt: s(Vt * 1000, 6) }; }
  if (m === 1) { const I = pos(v.id, 0.01), Vd = n * Vt * Math.log(I / Is + 1); return { I: s(I, 8), Vd: s(Vd, 8), P: s(I * Vd, 8), Vt: s(Vt * 1000, 6) }; }
  const Vs = pos(v.vs, 5), R = pos(v.R, 330);
  let Vd = 0.6;
  for (let i = 0; i < 100; i++) { const I = (Vs - Vd) / R; if (I <= 0) { Vd = Vs; break; } const nv = n * Vt * Math.log(I / Is + 1); if (Math.abs(nv - Vd) < 1e-12) break; Vd = nv; }
  const I = Math.max(0, (Vs - Vd) / R);
  return { I: s(I, 8), Vd: s(Vd, 8), P: s(I * Vd, 8), Vt: s(Vt * 1000, 6) };
};
export const tl431: SciCalculator = (v) => {
  const Vref = pos(v.vref, 2.495), R2 = pos(v.r2, 10000), Iref = pos(v.iref, 2) * 1e-6, Vin = pos(v.vin, 12), Il = pos(v.il, 0.01);
  let R1: number, Vout: number;
  if (pick(v.mode, 2) === 1) { Vout = pos(v.vout, 5); R1 = (Vout - Vref) / (Vref / R2 + Iref); }
  else { R1 = pos(v.r1, 10000); Vout = Vref * (1 + R1 / R2) + Iref * R1; }
  if (Vout > 36) throw new InputError("TL431 cathode voltage is limited to 36 V.");
  const Rk = (Vin - Vout) / (Il + 0.001);
  return { vout: s(Vout, 8), r1: s(R1, 8), rk: Rk > 0 ? s(Rk, 6) : "input too low", pk: Rk > 0 ? s(((Vin - Vout) ** 2) / Rk, 6) : "—" };
};
export const TL_MODE = ["Output voltage from R1, R2", "R1 for a target output"];
export const buck: SciCalculator = (v) => {
  const Vin = pos(v.vin, 12), Vout = pos(v.vout, 5), Io = pos(v.io, 2), f = pos(v.f, 500) * 1000, rip = pos(v.rip, 30) / 100, dv = pos(v.dv, 20) / 1000, eff = pos(v.eff, 90) / 100;
  if (Vout >= Vin) throw new InputError("A buck converter needs Vout < Vin.");
  const D = Vout / (Vin * eff), dI = rip * Io, L = ((Vin - Vout) * D) / (f * dI), C = dI / (8 * f * dv);
  return { D: s(100 * D, 6), L: s(L * 1e6, 6), C: s(C * 1e6, 6), Ipk: s(Io + dI / 2, 6), Iin: s((Vout * Io) / (Vin * eff), 6) };
};
export const snubber: SciCalculator = (v) => {
  const f1 = pos(v.f1, 50) * 1e6, f2 = pos(v.f2, 30) * 1e6, Ca = pos(v.cadd, 100) * 1e-12, V = pos(v.V, 48), fsw = pos(v.fsw, 100) * 1000;
  if (!(f1 > f2)) throw new InputError("Adding capacitance must lower the ringing frequency (f₂ < f₁).");
  const Cp = Ca / ((f1 / f2) ** 2 - 1), Lp = 1 / ((TAU * f1) ** 2 * Cp), R = Math.sqrt(Lp / Cp), Cs = 4 * Cp;
  return { R: s(R, 6), Cs: s(Cs * 1e12, 6), Cp: s(Cp * 1e12, 6), Lp: s(Lp * 1e9, 6), P: s(Cs * V * V * fsw, 6) };
};
export const mosfetGate: SciCalculator = (v) => {
  const Qg = pos(v.qg, 50) * 1e-9, Vd = pos(v.vd, 12), Ipk = pos(v.ipk, 2), Rint = pos(v.rint, 1), tr = pos(v.tr, 0) * 1e-9, f = pos(v.f, 100) * 1000;
  const Rext = tr ? (Vd * tr) / Qg - Rint : Vd / Ipk - Rint;
  const Rtot = Math.max(0, Rext) + Rint;
  return { Rg: s(Math.max(0, Rext), 6), t: s((Qg * Rtot) / Vd * 1e9, 6), Ig: s(Vd / Rtot, 6), P: s(Qg * Vd * f, 6), std: Rext > 0 ? eng(nearestE24(Rext), "Ω") : "0 Ω (driver-limited)" };
};
export const heatTrace: SciCalculator = (v) => {
  const od = pos(v.od, 60) / 1000, th = pos(v.th, 25) / 1000, k = pos(v.k, 0.04), Tm = num(v.tm, 5), Ta = num(v.ta, -20), L = pos(v.L, 50), sf = pos(v.sf, 1.2), V = pos(v.V, 230);
  const q = (TAU * k * (Tm - Ta)) / Math.log((od + 2 * th) / od), qd = q * sf;
  return { q: s(q, 6), design: s(qd, 6), total: s(qd * L, 6), I: s((qd * L) / V, 6), cable: `Select ≥ ${fmt(Math.ceil(qd), 4)} W/m (e.g. ${[10, 15, 20, 26, 33, 39, 49, 66].find((x) => x >= qd) ?? "multiple runs of"} W/m rated cable)` };
};

// ---------- colour code ----------
export const COLORS = ["Black", "Brown", "Red", "Orange", "Yellow", "Green", "Blue", "Violet", "Grey", "White"];
export const MULTS = ["Black ×1", "Brown ×10", "Red ×100", "Orange ×1k", "Yellow ×10k", "Green ×100k", "Blue ×1M", "Violet ×10M", "Gold ×0.1", "Silver ×0.01"];
const MULT_V = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 0.1, 0.01];
export const TOLS = ["Brown ±1%", "Red ±2%", "Green ±0.5%", "Blue ±0.25%", "Violet ±0.1%", "Grey ±0.05%", "Gold ±5%", "Silver ±10%", "None ±20%"];
const TOL_V = [1, 2, 0.5, 0.25, 0.1, 0.05, 5, 10, 20];
export const BANDS = ["4 bands", "5 bands", "6 bands"];
export const TEMPCO = ["Black 250 ppm/K", "Brown 100 ppm/K", "Red 50 ppm/K", "Orange 15 ppm/K", "Yellow 25 ppm/K", "Blue 10 ppm/K", "Violet 5 ppm/K"];
export const colorCode: SciCalculator = (v) => {
  const nb = pick(v.bands, 3), d = [pick(v.b1, 10), pick(v.b2, 10), pick(v.b3, 10)], digits = nb === 0 ? d[0] * 10 + d[1] : d[0] * 100 + d[1] * 10 + d[2];
  const R = digits * MULT_V[pick(v.mult, 10)], tol = TOL_V[pick(v.tol, 9)];
  return { R: s(R, 8), pretty: `${eng(R, "Ω", 4)} ±${fmt(tol)}%`, range: `${eng(R * (1 - tol / 100), "Ω", 5)} – ${eng(R * (1 + tol / 100), "Ω", 5)}`, tempco: nb === 2 ? TEMPCO[pick(v.tc, 7)] : "—" };
};

export const sciCircCustomCalculators: Record<string, SciCalculator> = {
  "voltage-drop-calculator": voltageDrop,
  "voltage-divider-calculator": voltageDivider,
  "ohms-law-calculator": ohmsLaw,
  "wire-resistance-calculator": wireResistance,
  "rc-filter-calculator": rcFilter,
  "reactance-calculator": reactance,
  "power-factor-calculator": powerFactor,
  "series-parallel-circuit-calculator": seriesParallel,
  "lc-resonance-calculator": lcResonance,
  "capacitor-charge-time-calculator": capCharge,
  "555-timer-calculator": timer555,
  "parallel-plate-capacitor-calculator": parallelPlate,
  "capacitive-reactance-calculator": capReactance,
  "pt100-calculator": pt100,
  "arc-flash-calculator": arcFlash,
  "inductance-calculator": inductance,
  "capacitor-energy-calculator": capEnergy,
  "earth-fault-loop-impedance-calculator": efli,
  "resistor-color-code-calculator": colorCode,
  "capacitor-series-parallel-calculator": capSeriesParallel,
  "resistor-power-calculator": resistorPower,
  "voltage-drop-resistor-calculator": droppingResistor,
  "inductive-reactance-calculator": indReactance,
  "duty-cycle-calculator": dutyCycle,
  "resistivity-calculator": resistivity,
  "rlc-circuit-calculator": rlc,
  "busbar-calculator": busbar,
  "transformer-turns-ratio-calculator": transformer,
  "transfer-function-calculator": transferFunction,
  "wheatstone-bridge-calculator": wheatstone,
  "rc-snubber-calculator": snubber,
  "heat-trace-calculator": heatTrace,
  "motor-calculator": motor,
  "electrical-wiring-calculator": wiringSize,
  "nodal-analysis-calculator": nodal,
  "rms-voltage-calculator": rms,
  "symmetrical-components-calculator": symComponents,
  "thermistor-calculator": thermistor,
  "current-divider-calculator": currentDivider,
  "buck-converter-calculator": buck,
  "diode-calculator": diode,
  "tl431-calculator": tl431,
  "comparator-hysteresis-calculator": comparator,
  "transistor-calculator": transistor,
  "voltage-imbalance-calculator": voltageImbalance,
  "differential-amplifier-calculator": differentialAmp,
  "mosfet-gate-resistor-calculator": mosfetGate,
};

