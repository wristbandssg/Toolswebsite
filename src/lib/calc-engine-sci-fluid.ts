/**
 * Batch: "Science Calculators" → Mechanical & Structural Engineering (fluid mechanics, heat transfer,
 * steam & psychrometrics — 28 tools).
 *
 * Saturation pressure/temperature of water: IAPWS-IF97 region 4 equations (exact); saturated-steam
 * enthalpies and specific volume interpolated from standard steam tables. Water density: Kell
 * (1975); water viscosity: Vogel-type 2.414 × 10⁻⁵·10^(247.8/(T − 140)); air viscosity:
 * Sutherland. Psychrometrics with the Magnus/Buck vapour-pressure formula and the exact
 * psychrometric equation solved for wet bulb. Compressible flow: isentropic and normal-shock
 * relations. Open channels: Manning. Vacuum conductance: molecular (12.1d³/L) and viscous
 * (182d⁴P̄/L) air formulas. Gas diffusivity: Fuller-Schettler-Giddings. See
 * prisma/create-sci-fluid-calculators.ts.
 */

import { type SciCalculator, InputError, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const G0 = 9.80665, KB = 1.380649e-23, SIGMA = 5.670374419e-8;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const PA = (x: number) => `${fmt(x / 1000, 6)} kPa = ${fmt(x / 1e5, 6)} bar = ${fmt(x / 6894.757, 6)} psi`;

// ---------- statics & basic flow ----------
export const FLUIDS = ["Fresh water (1,000)", "Seawater (1,025)", "Oil (850)", "Mercury (13,534)", "Gasoline (740)", "Custom density"];
const RHO = [1000, 1025, 850, 13534, 740];
export const hydrostatic: SciCalculator = (v) => {
  const k = pick(v.fluid, FLUIDS.length), rho = k < 5 ? RHO[k] : pos(v.rho, 1000), h = pos(v.h, 10), Patm = pos(v.patm, 101.325) * 1000, A = pos(v.A, 0);
  const Pg = rho * G0 * h;
  return { gauge: s(Pg / 1000, 8), abs: s((Pg + Patm) / 1000, 8), detail: PA(Pg), force: A ? s((Pg * A) / 1000, 8) : "enter area", head: s(Pg / (1000 * G0), 6) };
};
export const RE_FLUID = ["Water at 20 °C", "Air at 20 °C, 1 atm", "Custom (density & viscosity)"];
export const reynolds: SciCalculator = (v) => {
  const k = pick(v.fluid, 3), V = pos(v.V, 1), L = pos(v.L, 0.05);
  const nu = k === 0 ? 1.004e-6 : k === 1 ? 1.516e-5 : pos(v.mu, 0.001) / pos(v.rho, 1000);
  const Re = (V * L) / nu;
  return { Re: s(fin(Re), 8), regime: Re < 2300 ? "Laminar (pipe flow)" : Re < 4000 ? "Transitional" : "Turbulent", nu: s(nu, 6), entry: Re < 2300 ? s(0.05 * Re * L, 6) : s(4.4 * Re ** (1 / 6) * L, 6) };
};
export const yPlus: SciCalculator = (v) => {
  const U = pos(v.U, 10), L = pos(v.L, 1), rho = pos(v.rho, 1.225), mu = pos(v.mu, 1.81e-5), yp = pos(v.yp, 1), gr = pos(v.gr, 1.2);
  const Re = (rho * U * L) / mu, Cf = 0.026 / Re ** (1 / 7), tw = 0.5 * Cf * rho * U * U, us = Math.sqrt(tw / rho), y = (yp * mu) / (rho * us);
  const delta = (0.37 * L) / Re ** 0.2, n = gr > 1 ? Math.ceil(Math.log(1 + (delta * (gr - 1)) / y) / Math.log(gr)) : Math.ceil(delta / y);
  return { y: s(y, 6), ymm: s(y * 1000, 6), Re: s(Re, 6), us: s(us, 6), layers: n, delta: s(delta * 1000, 6) };
};
export const buoyancy: SciCalculator = (v) => {
  const k = pick(v.fluid, FLUIDS.length), rho = k < 5 ? RHO[k] : pos(v.rho, 1000), V = pos(v.V, 0.01), m = pos(v.m, 5);
  const Fb = rho * V * G0, W = m * G0, rhoObj = m / V;
  return { Fb: s(Fb, 8), W: s(W, 8), apparent: s(W - Fb, 8), floats: rhoObj < rho ? `Floats — ${fmt((100 * rhoObj) / rho, 5)}% submerged` : rhoObj > rho ? "Sinks" : "Neutrally buoyant", density: s(rhoObj, 6) };
};
export const BERN_MODE = ["Downstream pressure P₂", "Dynamic pressure from speed", "Venturi / orifice flow from ΔP"];
export const bernoulli: SciCalculator = (v) => {
  const m = pick(v.mode, 3), rho = pos(v.rho, 1000);
  if (m === 1) { const V = pos(v.v1, 10), q = 0.5 * rho * V * V; return { result: s(q / 1000, 8), unit: "kPa dynamic pressure", extra: PA(q) }; }
  if (m === 2) {
    const dp = pos(v.dp, 20) * 1000, A1 = (Math.PI * pos(v.d1, 100) ** 2) / 4e6, A2 = (Math.PI * pos(v.d2, 50) ** 2) / 4e6, Cd = pos(v.cd, 0.98);
    if (A2 >= A1) throw new InputError("Throat must be smaller than the inlet.");
    const Q = Cd * A2 * Math.sqrt((2 * dp) / (rho * (1 - (A2 / A1) ** 2)));
    return { result: s(Q * 60000, 8), unit: "L/min flow", extra: `${fmt(Q * 3600, 6)} m³/h; throat velocity ${fmt(Q / A2, 6)} m/s` };
  }
  const P1 = num(v.p1, 200) * 1000, v1 = pos(v.v1, 2), h1 = num(v.h1, 0), h2 = num(v.h2, 5), A1 = pos(v.d1, 100) ** 2, A2 = pos(v.d2, 50) ** 2, v2 = (v1 * A1) / A2;
  const P2 = P1 + 0.5 * rho * (v1 * v1 - v2 * v2) + rho * G0 * (h1 - h2);
  return { result: s(P2 / 1000, 8), unit: "kPa at point 2", extra: `v₂ = ${fmt(v2, 6)} m/s (continuity)` };
};
export const MF_MODE = ["Density × area × velocity", "Gas: actual volumetric flow to mass and standard flow"];
export const massFlow: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const Q = pos(v.Q, 100), P = pos(v.P, 500), T = num(v.T, 25) + 273.15, M = pos(v.M, 28.97);
    const Mm = M || 28.97, rho = (P * 1000 * Mm) / (8314.462618 * T), mdot = (rho * Q) / 3600, Nm3 = (Q * P * 273.15) / (101.325 * T), scfm = (Q * P * 288.71) / (101.325 * T) * 0.588578;
    return { kgs: s(mdot, 8), kgh: s(mdot * 3600, 8), std: `${fmt(Nm3, 6)} Nm³/h (0 °C, 1 atm); ${fmt(scfm, 6)} SCFM (60 °F)`, rho: s(rho, 6) };
  }
  const rho = pos(v.rho, 1000), d = pos(v.d, 50) / 1000, V = pos(v.V, 2), A = (Math.PI * d * d) / 4, mdot = rho * A * V;
  return { kgs: s(mdot, 8), kgh: s(mdot * 3600, 8), std: `${fmt(A * V * 60000, 6)} L/min volumetric`, rho: s(rho, 6) };
};
export const residence: SciCalculator = (v) => {
  const V = pos(v.V, 1000), Q = pos(v.Q, 50), unit = pick(v.unit, 4), Qm3h = [Q * 0.06, Q, Q / 24, Q * 0.2271247][unit];
  const t = (V / 1000) / Qm3h;
  return { h: s(t, 8), min: s(t * 60, 8), s: s(t * 3600, 8), turnovers: s(24 / t, 6) };
};
export const FLOW_UNITS = ["L/min", "m³/h", "m³/day", "US gpm"];
export const nitrogen: SciCalculator = (v) => {
  const P1g = num(v.p1, 100), T1 = num(v.t1, 20) + 273.15, T2 = num(v.t2, 50) + 273.15, Patm = (pos(v.patm, 1.01325) || 1.01325) * (1 - 2.25577e-5 * num(v.alt, 0)) ** 5.25588;
  const P1a = P1g + Patm, P2a = (P1a * T2) / T1;
  return { p2g: s(P2a - Patm, 8), p2a: s(P2a, 8), p1a: s(P1a, 8), patm: s(Patm, 6), psi: s((P2a - Patm) * 14.5038, 6) };
};
export const froude: SciCalculator = (v) => {
  const V = pos(v.V, 2), y = pos(v.y, 0.5), Fr = V / Math.sqrt(G0 * y);
  return { Fr: s(Fr, 8), regime: Fr < 0.99 ? "Subcritical (tranquil)" : Fr > 1.01 ? "Supercritical (rapid)" : "Critical", c: s(Math.sqrt(G0 * y), 6), hull: s(1.34 * Math.sqrt(y / 0.3048), 5) };
};

// ---------- properties ----------
const waterRho = (T: number) => (999.83952 + 16.945176 * T - 7.9870401e-3 * T ** 2 - 46.170461e-6 * T ** 3 + 105.56302e-9 * T ** 4 - 280.54253e-12 * T ** 5) / (1 + 16.87985e-3 * T);
const waterMu = (T: number) => 2.414e-5 * 10 ** (247.8 / (T + 273.15 - 140));
export const PROP_FLUID = ["Water (liquid, 0–150 °C)", "Dry air (ideal gas)"];
export const fluidProps: SciCalculator = (v) => {
  const T = num(v.T, 20);
  if (pick(v.fluid, 2) === 1) {
    const Tk = T + 273.15, P = pos(v.P, 101.325) * 1000, rho = P / (287.05 * Tk), mu = (1.458e-6 * Tk ** 1.5) / (Tk + 110.4);
    return { rho: s(rho, 6), mu: s(mu, 6), nu: s(mu / rho, 6), cp: s(1005, 4), k: s(0.0241 * (Tk / 273.15) ** 0.81, 5), Pr: s((mu * 1005) / (0.0241 * (Tk / 273.15) ** 0.81), 5) };
  }
  if (T < 0 || T > 150) throw new InputError("Water correlations here cover 0–150 °C.");
  const rho = waterRho(T), mu = waterMu(T), cp = 4217.4 - 3.720283 * T + 0.1412855 * T * T - 2.654387e-3 * T ** 3 + 2.093236e-5 * T ** 4, k = 0.5706 + 0.001756 * T - 6.46e-6 * T * T;
  return { rho: s(rho, 7), mu: s(mu, 6), nu: s(mu / rho, 6), cp: s(cp, 5), k: s(k, 5), Pr: s((mu * cp) / k, 5) };
};
export const VISC_MODE = ["Dynamic ↔ kinematic conversion", "Blend two liquids (Refutas)"];
export const viscosity: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const n1 = pos(v.nu1, 100), n2 = pos(v.nu2, 10), x = Math.min(1, pos(v.x1, 50) / 100), vbn = (n: number) => 14.534 * Math.log(Math.log(n + 0.8)) + 10.975;
    const b = x * vbn(n1) + (1 - x) * vbn(n2), nu = Math.exp(Math.exp((b - 10.975) / 14.534)) - 0.8;
    return { cP: "—", cSt: s(nu, 6), pas: "—", ssu: s(nu * 4.632, 5), note: `Blend VBN ${fmt(b, 5)} (by mass fraction)` };
  }
  const rho = pos(v.rho, 1000), unit = pick(v.unit, 3), x = pos(v.x, 1);
  const cP = unit === 0 ? x : unit === 1 ? x * 1000 : x * (rho / 1000), cSt = cP / (rho / 1000);
  return { cP: s(cP, 8), cSt: s(cSt, 8), pas: s(cP / 1000, 8), ssu: cSt > 20 ? s(cSt * 4.632, 5) : "below the SSU range", note: "1 cP = 1 mPa·s; cSt = cP ÷ (density in g/cm³)" };
};
export const VISC_UNITS = ["Centipoise (cP, mPa·s)", "Pascal-second (Pa·s)", "Centistokes (cSt)"];
const STEAM: [number, number, number, number][] = [[0.01, 0, 2500.9, 205.99], [10, 42, 2519.2, 106.3], [20, 83.9, 2537.4, 57.76], [30, 125.7, 2555.6, 32.88], [40, 167.5, 2573.5, 19.52], [50, 209.3, 2591.3, 12.03], [60, 251.2, 2608.8, 7.667], [70, 293, 2626.1, 5.04], [80, 334.9, 2643, 3.405], [90, 376.9, 2659.5, 2.359], [100, 419.2, 2675.6, 1.672], [120, 503.8, 2706, 0.8915], [140, 589.2, 2733.5, 0.5085], [160, 675.5, 2757.4, 0.3068], [180, 763.1, 2777.2, 0.1938], [200, 852.3, 2792, 0.1272], [220, 943.6, 2801.1, 0.08609], [240, 1037.6, 2803, 0.0597], [260, 1135, 2796.6, 0.0422], [280, 1236.7, 2779.9, 0.03017], [300, 1344.8, 2749.6, 0.02167], [320, 1462.2, 2700.6, 0.01549], [340, 1594.5, 2622, 0.0108], [360, 1761.7, 2481.5, 0.006947], [373.95, 2084.3, 2084.3, 0.003106]];
const N4 = [0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.1202082470247e5, -0.32325550322333e7, 0.1491510861353e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];
export const psat = (Tc: number) => { const T = Tc + 273.15, th = T + N4[8] / (T - N4[9]), A = th * th + N4[0] * th + N4[1], B = N4[2] * th * th + N4[3] * th + N4[4], C = N4[5] * th * th + N4[6] * th + N4[7]; return ((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C))) ** 4; };
const tsat = (Pmpa: number) => { const b = Pmpa ** 0.25, E = b * b + N4[2] * b + N4[5], F = N4[0] * b * b + N4[3] * b + N4[6], Gg = N4[1] * b * b + N4[4] * b + N4[7], D = (2 * Gg) / (-F - Math.sqrt(F * F - 4 * E * Gg)); return (N4[9] + D - Math.sqrt((N4[9] + D) ** 2 - 4 * (N4[8] + N4[9] * D))) / 2 - 273.15; };
export const STEAM_MODE = ["By temperature", "By absolute pressure"];
export const steamTable: SciCalculator = (v) => {
  let T: number, P: number;
  if (pick(v.mode, 2) === 0) { T = num(v.T, 100); if (T < 0.01 || T > 373.946) throw new InputError("Saturation exists from 0.01 to 373.946 °C."); P = psat(T); }
  else { P = pos(v.P, 1) ; if (P < 611.657e-6 || P > 22.064) throw new InputError("Saturation pressure range is 0.000612–22.064 MPa."); T = tsat(P); }
  const i = Math.max(0, STEAM.findIndex((r, k) => k < STEAM.length - 1 && T <= STEAM[k + 1][0])), a = STEAM[i], b = STEAM[Math.min(STEAM.length - 1, i + 1)], f = b[0] === a[0] ? 0 : (T - a[0]) / (b[0] - a[0]);
  const hf = a[1] + f * (b[1] - a[1]), hg = a[2] + f * (b[2] - a[2]), vg = Math.exp(Math.log(a[3]) + f * (Math.log(b[3]) - Math.log(a[3])));
  const x = Math.min(1, pos(v.x, 1));
  return { T: s(T, 7), P: s(P * 1000, 7), bar: s(P * 10, 7), hf: s(hf, 6), hg: s(hg, 6), hfg: s(hg - hf, 6), vg: s(vg, 6), hx: s(hf + x * (hg - hf), 6), rho: s(1 / vg, 6) };
};
const pws = (T: number) => 0.61121 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T))); // kPa, Buck
export const psychro: SciCalculator = (v) => {
  const T = num(v.T, 30), RH = Math.min(100, pos(v.rh, 50)) / 100, P = pos(v.P, 101.325), Tg = num(v.tg, 0);
  const pw = RH * pws(T), W = (0.621945 * pw) / (P - pw), h = 1.006 * T + W * (2501 + 1.86 * T);
  const g = Math.log(pw / 0.61121), Td = (257.14 * g) / (18.678 - g);
  let lo = Td, hi = T;
  for (let i = 0; i < 80; i++) { const tw = (lo + hi) / 2, ws = (0.621945 * pws(tw)) / (P - pws(tw)), Wc = ((2501 - 2.326 * tw) * ws - 1.006 * (T - tw)) / (2501 + 1.86 * T - 4.186 * tw); if (Wc > W) hi = tw; else lo = tw; }
  const Tw = (lo + hi) / 2, vol = (0.287042 * (T + 273.15) * (1 + 1.607858 * W)) / P;
  return { Tw: s(Tw, 5), Td: s(Td, 5), W: s(W * 1000, 6), h: s(h, 6), vol: s(vol, 6), wbgt: Tg ? s(0.7 * Tw + 0.2 * Tg + 0.1 * T, 5) : s(0.7 * Tw + 0.3 * T, 5) };
};

// ---------- compressible & aero ----------
export const COMP_MODE = ["Isentropic flow ratios", "Normal shock relations"];
export const isentropic: SciCalculator = (v) => {
  const M = pos(v.M, 2), g = pos(v.g, 1.4), k = 1 + ((g - 1) / 2) * M * M;
  if (pick(v.mode, 2) === 1) {
    if (M <= 1) throw new InputError("A normal shock needs supersonic upstream flow (M > 1).");
    const M2 = Math.sqrt((1 + ((g - 1) / 2) * M * M) / (g * M * M - (g - 1) / 2)), p21 = 1 + ((2 * g) / (g + 1)) * (M * M - 1), r21 = ((g + 1) * M * M) / ((g - 1) * M * M + 2), T21 = p21 / r21;
    const p0 = (r21 ** (g / (g - 1))) * ((1 / p21) ** (1 / (g - 1)));
    return { a: s(M2, 8), b: s(p21, 8), c: s(T21, 8), d: s(r21, 8), e: s(p0, 8), note: "a = M₂, b = p₂/p₁, c = T₂/T₁, d = ρ₂/ρ₁, e = p₀₂/p₀₁" };
  }
  const Ar = (1 / M) * ((2 / (g + 1)) * k) ** ((g + 1) / (2 * (g - 1)));
  return { a: s(1 / k, 8), b: s(k ** (-g / (g - 1)), 8), c: s(k ** (-1 / (g - 1)), 8), d: s(Ar, 8), e: s((Math.asin(Math.min(1, 1 / M)) * 180) / Math.PI, 6), note: "a = T/T₀, b = p/p₀, c = ρ/ρ₀, d = A/A*, e = Mach angle (°)" };
};
export const machNumber: SciCalculator = (v) => {
  const T = num(v.T, 15) + 273.15, g = pos(v.g, 1.4), R = pos(v.R, 287.05), unit = pick(v.unit, 4), x = pos(v.V, 300), V = [x, x / 3.6, x * 0.44704, x * 0.514444][unit], a = Math.sqrt(g * R * T), M = V / a;
  return { M: s(M, 6), a: s(a, 6), akmh: s(a * 3.6, 6), regime: M < 0.8 ? "Subsonic" : M < 1.2 ? "Transonic" : M < 5 ? "Supersonic" : "Hypersonic", q: s(0.5 * (101325 / (287.05 * T)) * V * V / 1000, 6) };
};
export const SPEED_UNITS = ["m/s", "km/h", "mph", "knots"];
export const THRUST_MODE = ["Jet / rocket (momentum + pressure thrust)", "Propeller static thrust (momentum theory)", "Thrust-to-weight ratio"];
export const thrust: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 2) { const F = pos(v.F, 1000), W = pos(v.mass, 50) * G0; return { F: s(F, 8), kgf: s(F / G0, 6), twr: s(F / W, 6), note: F / W > 1 ? "Can climb vertically" : "Cannot lift itself vertically" }; }
  if (m === 1) { const D = pos(v.D, 0.3), P = pos(v.P, 500), rho = pos(v.rho, 1.225), F = ((Math.PI / 2) * D * D * rho * P * P) ** (1 / 3); return { F: s(F, 8), kgf: s(F / G0, 6), twr: s(F / P, 6), note: "Ideal (no losses) — real props give ~60–75% of this; twr here = N per W" }; }
  const md = pos(v.md, 50), Ve = pos(v.ve, 2500), V0 = pos(v.v0, 0), Pe = pos(v.pe, 101.325) * 1000, Pa = pos(v.pa, 101.325) * 1000, Ae = pos(v.ae, 0.5);
  const F = md * (Ve - V0) + (Pe - Pa) * Ae;
  return { F: s(F, 8), kgf: s(F / G0, 6), twr: s(F / (md * G0), 6), note: `Effective exhaust velocity ${fmt(F / md, 6)} m/s; Isp ${fmt(F / md / G0, 5)} s` };
};
export const LIFT_SOLVE = ["Lift force", "Lift coefficient CL", "Wing area for a lift", "Speed for a lift (stall speed at CL max)"];
export const lift: SciCalculator = (v) => {
  const k = pick(v.solve, 4), rho = pos(v.rho, 1.225), V = pos(v.V, 30), S = pos(v.S, 16), CL = pos(v.CL, 1.2), L = pos(v.L, 10000);
  const x = fin(k === 0 ? 0.5 * rho * V * V * S * CL : k === 1 ? L / (0.5 * rho * V * V * S) : k === 2 ? L / (0.5 * rho * V * V * CL) : Math.sqrt((2 * L) / (rho * S * CL)));
  return { result: s(x, 8), loading: s((k === 2 ? L / x : k === 0 ? x : L) / (k === 2 ? 1 : S) / G0, 6), kmh: k === 3 ? s(x * 3.6, 6) : "—", q: s(0.5 * rho * V * V, 6) };
};

// ---------- open channel & piping ----------
export const CHANNEL = ["Rectangular (width b, depth y)", "Trapezoidal (bottom b, depth y, side slope z:1)", "Circular pipe, partly full (diameter D, depth y)"];
export const manning: SciCalculator = (v) => {
  const k = pick(v.shape, 3), b = pos(v.b, 2), y = pos(v.y, 0.5), z = pos(v.z, 1.5), D = pos(v.D, 1), n = pos(v.n, 0.013), S = pos(v.S, 0.001);
  let A: number, P: number, T: number;
  if (k === 0) { A = b * y; P = b + 2 * y; T = b; }
  else if (k === 1) { A = (b + z * y) * y; P = b + 2 * y * Math.sqrt(1 + z * z); T = b + 2 * z * y; }
  else { if (y > D) throw new InputError("Depth can't exceed the pipe diameter."); const th = 2 * Math.acos(1 - (2 * y) / D); A = ((th - Math.sin(th)) * D * D) / 8; P = (th * D) / 2; T = D * Math.sin(th / 2) || 1e-9; }
  const R = A / P, V = (1 / n) * R ** (2 / 3) * Math.sqrt(S), Q = V * A;
  return { Q: s(Q, 8), V: s(V, 6), A: s(A, 6), R: s(R, 6), Fr: s(V / Math.sqrt((G0 * A) / T), 6), lps: s(Q * 1000, 8) };
};
export const PIPE_MODE = ["Thrust force at a bend or dead end", "Sag between supports (water-filled pipe)"];
export const pipeRestraint: SciCalculator = (v) => {
  const P = pos(v.P, 10) * 1e5, D = pos(v.D, 200) / 1000;
  if (pick(v.mode, 2) === 1) {
    const OD = D, t = pos(v.t, 6) / 1000, L = pos(v.L, 6), E = pos(v.E, 200) * 1e9, ID = OD - 2 * t, I = (Math.PI * (OD ** 4 - ID ** 4)) / 64;
    const w = (7850 * (Math.PI / 4) * (OD * OD - ID * ID) + 1000 * (Math.PI / 4) * ID * ID) * G0, d = (5 * w * L ** 4) / (384 * E * I);
    return { F: s(d * 1000, 6), unit: "mm mid-span sag (simply supported)", area: s(w, 6), extra: `Weight ${fmt(w, 6)} N/m; for L/360 keep sag ≤ ${fmt((L * 1000) / 360, 5)} mm` };
  }
  const ang = pos(v.ang, 90), A = (Math.PI * D * D) / 4, F = ang >= 180 ? P * A : 2 * P * A * Math.sin(((ang / 2) * Math.PI) / 180), soil = pos(v.soil, 100) * 1000;
  return { F: s(F / 1000, 6), unit: ang >= 180 ? "kN at a dead end / tee" : `kN resultant at a ${fmt(ang)}° bend`, area: s(((F / soil) * 1.5), 6), extra: "Area = thrust ÷ soil bearing capacity × 1.5 safety (thrust block bearing face, m²)" };
};
export const vacuum: SciCalculator = (v) => {
  const d = pos(v.d, 4), L = pos(v.L, 100), P = pos(v.P, 1e-3), S = pos(v.S, 300);
  const lam = 5e-3 / P, Kn = lam / d, Cm = (12.1 * d ** 3) / L, Cv = (182 * d ** 4 * P) / L, C = Kn > 0.5 ? Cm : Kn < 0.01 ? Cv : Cm + Cv;
  const Se = 1 / (1 / S + 1 / C);
  return { C: s(C, 6), Seff: s(Se, 6), Kn: s(Kn, 5), regime: Kn > 0.5 ? "Molecular flow" : Kn < 0.01 ? "Viscous (laminar) flow" : "Transitional flow (sum used)", loss: s(100 * (1 - Se / S), 5) };
};
export const membraneFlux: SciCalculator = (v) => {
  const Vol = pos(v.V, 10), A = pos(v.A, 0.5), t = pos(v.t, 2), pf = pos(v.pf, 2), pr = pos(v.pr, 1.6), pp = pos(v.pp, 0);
  const J = Vol / (A * t), tmp = (pf + pr) / 2 - pp;
  return { lmh: s(J, 6), gfd: s(J * 0.5886, 6), tmp: s(tmp, 6), perm: tmp ? s(J / tmp, 6) : "—" };
};
export const bufferTank: SciCalculator = (v) => {
  const cap = pos(v.cap, 100), minPct = pos(v.min, 25) / 100, t = pos(v.t, 6), dT = pos(v.dT, 3), sys = pos(v.sys, 500);
  const need = (cap * minPct * t * 60) / (4.186 * dT), tank = Math.max(0, need - sys);
  return { tank: s(tank, 6), need: s(need, 6), gal: s(tank / 3.785411784, 6), rule: s(((cap / 3.51685) * 3 * 3.785411784), 6) };
};
export const evaporation: SciCalculator = (v) => {
  const A = pos(v.A, 50), Tw = num(v.tw, 25), Ta = num(v.ta, 25), RH = Math.min(100, pos(v.rh, 50)) / 100, V = pos(v.v, 0.5);
  const P = 101.325, xs = (0.622 * pws(Tw)) / (P - pws(Tw)), pa = RH * pws(Ta), x = (0.622 * pa) / (P - pa), th = 25 + 19 * V, g = (th * A * Math.max(0, xs - x)) / 3600;
  return { kgh: s(g * 3600, 6), lday: s(g * 86400, 6), heat: s(g * 2450, 6), mmday: s((g * 86400) / A, 6) };
};

// ---------- heat transfer ----------
export const HT_MODE = ["Conduction through a wall", "Convection", "Radiation between surfaces", "Composite wall (layers in series)"];
export const heatTransfer: SciCalculator = (v) => {
  const m = pick(v.mode, 4), A = pos(v.A, 10), dT = num(v.dT, 20);
  if (m === 1) { const h = pos(v.h, 10), q = h * A * dT; return { q: s(q, 8), R: s(1 / (h * A), 8), U: s(h, 6), flux: s(q / A, 6) }; }
  if (m === 2) { const e = pos(v.e, 0.9), T1 = num(v.t1, 100) + 273.15, T2 = num(v.t2, 20) + 273.15, q = e * SIGMA * A * (T1 ** 4 - T2 ** 4); return { q: s(q, 8), R: s((T1 - T2) / q, 8), U: s(q / (A * (T1 - T2)), 6), flux: s(q / A, 6) }; }
  if (m === 3) {
    const L = listOf(v, "layers", 1).map((x) => x / 1000), k = listOf(v, "ks", 1);
    if (L.length !== k.length) throw new InputError("Enter one conductivity per layer thickness.");
    const Rt = sum(L.map((x, i) => x / k[i])) + 1 / pos(v.hi, 8) + 1 / pos(v.ho, 25), U = 1 / Rt;
    return { q: s(U * A * dT, 8), R: s(Rt, 8), U: s(U, 6), flux: s(U * dT, 6) };
  }
  const k = pos(v.k, 0.04), L = pos(v.L, 100) / 1000, q = (k * A * dT) / L;
  return { q: s(q, 8), R: s(L / (k * A), 8), U: s(k / L, 6), flux: s(q / A, 6) };
};
export const HX_FLOW = ["Counter-flow", "Parallel-flow"];
export const HX_MODE = ["Area needed for a duty", "Duty from area"];
export const heatExchanger: SciCalculator = (v) => {
  const Thi = num(v.thi, 90), Tho = num(v.tho, 60), Tci = num(v.tci, 20), Tco = num(v.tco, 40), counter = pick(v.flow, 2) === 0, U = pos(v.U, 500);
  const d1 = counter ? Thi - Tco : Thi - Tci, d2 = counter ? Tho - Tci : Tho - Tco;
  if (d1 <= 0 || d2 <= 0) throw new InputError("Temperatures cross — impossible for this arrangement.");
  const lmtd = Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2), mh = pos(v.mh, 0), cph = pos(v.cph, 4.18);
  const Q = mh ? mh * cph * (Thi - Tho) : pos(v.Q, 100);
  if (pick(v.mode, 2) === 1) { const A = pos(v.A, 5), q = (U * A * lmtd) / 1000; return { lmtd: s(lmtd, 6), A: s(A, 6), Q: s(q, 6), mc: s(q / (4.18 * (Tco - Tci)), 6) }; }
  return { lmtd: s(lmtd, 6), A: s((Q * 1000) / (U * lmtd), 6), Q: s(Q, 6), mc: s(Q / (4.18 * (Tco - Tci)), 6) };
};
export const heatSink: SciCalculator = (v) => {
  const P = pos(v.P, 20), Ta = num(v.ta, 40), Tj = num(v.tj, 125), Rjc = pos(v.rjc, 1.5), Rcs = pos(v.rcs, 0.5), Rsa = pos(v.rsa, 0);
  const need = (Tj - Ta) / P - Rjc - Rcs;
  return { rsa: s(need, 6), tj: Rsa ? s(Ta + P * (Rjc + Rcs + Rsa), 6) : "enter a heat sink Rsa", tc: Rsa ? s(Ta + P * (Rcs + Rsa), 6) : "—", ok: need <= 0 ? "Not possible — reduce power or Rjc/Rcs" : `Choose a heat sink ≤ ${fmt(need, 4)} °C/W` };
};
export const DIFF_MODE = ["Particle in liquid (Stokes-Einstein)", "Gas pair (Fuller equation)", "Diffusion distance or time"];
const FULLER: [string, number, number][] = [["Air", 28.97, 19.7], ["H₂", 2.016, 6.12], ["He", 4.003, 2.67], ["N₂", 28.01, 18.5], ["O₂", 32, 16.3], ["CO₂", 44.01, 26.7], ["H₂O", 18.02, 13.1], ["NH₃", 17.03, 20.7], ["CH₄", 16.04, 25.14], ["Ar", 39.95, 16.2]];
export const GAS_SPECIES = FULLER.map((f) => f[0]);
export const diffusion: SciCalculator = (v) => {
  const m = pick(v.mode, 3), T = num(v.T, 25) + 273.15;
  if (m === 2) { const D = pos(v.D, 1e-9), t = pos(v.t, 3600), x = Math.sqrt(2 * D * t); return { D: s(D, 6), x: s(x * 1000, 6), t: s(((pos(v.x, 1) / 1000) ** 2) / (2 * D), 6), unit: "x in mm after time t; t in s to reach distance x" }; }
  if (m === 1) {
    const [, Ma, Va] = FULLER[pick(v.a, FULLER.length)], [, Mb, Vb] = FULLER[pick(v.b, FULLER.length)], P = pos(v.P, 1);
    const D = (1e-3 * T ** 1.75 * Math.sqrt(1 / Ma + 1 / Mb)) / (P * (Va ** (1 / 3) + Vb ** (1 / 3)) ** 2);
    return { D: s(D * 1e-4, 6), x: s(D, 6), t: s(Math.sqrt(2 * D * 1e-4 * 1) * 1000, 6), unit: "D in m²/s (and cm²/s); 1-second diffusion distance in mm" };
  }
  const eta = pos(v.eta, 0.00089), r = pos(v.r, 5) * 1e-9, D = (KB * T) / (6 * Math.PI * eta * r);
  return { D: s(D, 6), x: s(D * 1e4, 6), t: s(Math.sqrt(2 * D * 1) * 1e6, 6), unit: "D in m²/s (and cm²/s); 1-second diffusion distance in µm" };
};
export const HR_MODE = ["Heat rate from efficiency", "Heat rate from fuel use and output"];
export const heatRate: SciCalculator = (v) => {
  let eff: number;
  if (pick(v.mode, 2) === 1) { const fuel = pos(v.fuel, 1000), hv = pos(v.hv, 50), kw = pos(v.kw, 5000); eff = (kw * 3600) / (fuel * hv * 1000); }
  else eff = pos(v.eff, 40) / 100;
  if (!(eff > 0)) throw new InputError("Efficiency must be positive.");
  return { btu: s(3412.14 / eff, 6), kj: s(3600 / eff, 6), eff: s(100 * eff, 5), mmbtu: s(3.41214 / eff, 6) };
};

export const sciFluidCustomCalculators: Record<string, SciCalculator> = {
  "hydrostatic-pressure-calculator": hydrostatic,
  "reynolds-number-calculator": reynolds,
  "y-plus-calculator": yPlus,
  "steam-table-calculator": steamTable,
  "psychrometric-calculator": psychro,
  "viscosity-calculator": viscosity,
  "buoyancy-calculator": buoyancy,
  "fluid-properties-calculator": fluidProps,
  "isentropic-flow-calculator": isentropic,
  "manning-equation-calculator": manning,
  "heat-exchanger-calculator": heatExchanger,
  "heat-transfer-calculator": heatTransfer,
  "mach-number-calculator": machNumber,
  "thrust-calculator": thrust,
  "heat-sink-calculator": heatSink,
  "bernoulli-equation-calculator": bernoulli,
  "evaporation-rate-calculator": evaporation,
  "mass-flow-rate-calculator": massFlow,
  "residence-time-calculator": residence,
  "nitrogen-pressure-calculator": nitrogen,
  "lift-calculator": lift,
  "pipe-deflection-calculator": pipeRestraint,
  "vacuum-conductance-calculator": vacuum,
  "membrane-flux-calculator": membraneFlux,
  "buffer-tank-calculator": bufferTank,
  "froude-number-calculator": froude,
  "diffusion-coefficient-calculator": diffusion,
  "heat-rate-calculator": heatRate,
};
