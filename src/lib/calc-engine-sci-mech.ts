/**
 * Batch: "Science Calculators" → Physics (classical mechanics — 29 tools).
 *
 * SI units throughout (kg, m, s, N, J, W); g₀ = 9.80665 m/s², G = 6.6743 × 10⁻¹¹ N·m²/kg² (CODATA
 * 2018). "Solve for" tools rearrange one relation for the chosen variable; SUVAT fills unknowns by
 * repeatedly applying the five constant-acceleration equations. Projectiles ignore air resistance;
 * terminal velocity uses quadratic drag (v(t) = v_t·tanh(gt/v_t)). Collisions use the coefficient
 * of restitution e (1 elastic, 0 perfectly inelastic). See prisma/create-sci-mech-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
export const G0 = 9.80665;
export const G_CONST = 6.6743e-11;
const RAD = Math.PI / 180;
const fin = (x: number, what = "That combination") => {
  if (!Number.isFinite(x)) throw new InputError(`${what} has no real answer — check for zero or negative values.`);
  return x;
};
/** Solve one relation for the variable chosen in v.solve; returns the value and a labelled line. */
const solveFor = (v: Vals, keys: string[], names: string[], units: string[], fns: ((a: Record<string, number>) => number)[]) => {
  const k = pick(v.solve, keys.length), a: Record<string, number> = {};
  keys.forEach((key) => (a[key] = num(v[key])));
  const x = fin(fns[k](a));
  a[keys[k]] = x;
  return { x, k, a, solved: `${names[k]} = ${fmt(x, 8)}${units[k] ? " " + units[k] : ""}` };
};

// ---------- Energy, force, momentum ----------
export const KE_SOLVE = ["Kinetic energy KE", "Mass m", "Velocity v"];
export const kineticEnergy: SciCalculator = (v) => {
  const r = solveFor(v, ["ke", "m", "v"], ["KE", "m", "v"], ["J", "kg", "m/s"], [(a) => 0.5 * a.m * a.v ** 2, (a) => (2 * a.ke) / a.v ** 2, (a) => Math.sqrt((2 * a.ke) / a.m)]);
  return { result: s(r.x), solved: r.solved, kj: s(r.a.ke / 1000), momentum: s(r.a.m * r.a.v), kmh: s(r.a.v * 3.6) };
};
export const ACC_MODE = ["Change in velocity: (v − u)/t", "Force and mass: F/m", "Distance and time from rest: 2s/t²"];
export const acceleration: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const a = fin(m === 0 ? (num(v.v1, 25) - num(v.u, 0)) / num(v.t, 5) : m === 1 ? num(v.F, 1000) / num(v.m, 1000) : (2 * num(v.d, 100)) / num(v.t, 5) ** 2);
  return { a: s(a), g: s(a / G0, 8), kmhs: s(a * 3.6, 8), zeroTo100: a > 0 ? s(100 / 3.6 / a, 6) : "—" };
};
export const VEL_MODE = ["Distance ÷ time", "u + a·t", "√(u² + 2as)", "Average (u + v)/2"];
export const velocity: SciCalculator = (v) => {
  const m = pick(v.mode, 4), u = num(v.u, 0), a = num(v.a, 2), t = num(v.t, 10), d = num(v.d, 100), v2 = num(v.v2, 20);
  const x = fin(m === 0 ? d / t : m === 1 ? u + a * t : m === 2 ? Math.sqrt(u * u + 2 * a * d) : (u + v2) / 2);
  return { v: s(x), kmh: s(x * 3.6), mph: s(x / 0.44704), fts: s(x / 0.3048), mach: s(x / 343, 6) };
};
export const F_SOLVE = ["Force F", "Mass m", "Acceleration a"];
export const newtonSecond: SciCalculator = (v) => {
  const r = solveFor(v, ["F", "m", "a"], ["F", "m", "a"], ["N", "kg", "m/s²"], [(a) => a.m * a.a, (a) => a.F / a.a, (a) => a.F / a.m]);
  return { result: s(r.x), solved: r.solved, kn: s(r.a.F / 1000), lbf: s(r.a.F / 4.4482216152605), weight: s(r.a.m * G0), kgf: s(r.a.F / G0) };
};
export const netForce: SciCalculator = (v) => {
  const F = [1, 2, 3, 4].map((i) => [num(v[`f${i}`]), num(v[`a${i}`]) * RAD]);
  const fx = sum(F.map(([f, a]) => f * Math.cos(a))), fy = sum(F.map(([f, a]) => f * Math.sin(a)));
  const R = Math.hypot(fx, fy), m = pos(v.m, 0);
  return { net: s(R), angle: s(((Math.atan2(fy, fx) / RAD) + 360) % 360, 8), fx: s(fx), fy: s(fy), accel: m ? s(R / m) : "enter mass", equilibrant: `${fmt(R, 8)} N at ${fmt(((Math.atan2(fy, fx) / RAD) + 540) % 360, 6)}°` };
};
export const P_SOLVE = ["Momentum p", "Mass m", "Velocity v"];
export const momentum: SciCalculator = (v) => {
  const r = solveFor(v, ["p", "m", "v"], ["p", "m", "v"], ["kg·m/s", "kg", "m/s"], [(a) => a.m * a.v, (a) => a.p / a.v, (a) => a.p / a.m]);
  const v2 = num(v.v2, 0);
  return { result: s(r.x), solved: r.solved, ke: s((r.a.p * r.a.p) / (2 * r.a.m)), change: s(r.a.m * (v2 - r.a.v)) };
};

// ---------- SUVAT ----------
export const SUVAT_KNOWN = ["u, a, t", "u, v, t", "u, v, a", "u, s, t", "v, a, t", "u, a, s", "v, s, t", "v, a, s", "s, a, t", "u, v, s"];
type K = "s" | "u" | "v" | "a" | "t";
const RULES: [K, K[], (x: Record<K, number>) => number][] = [
  ["v", ["u", "a", "t"], (x) => x.u + x.a * x.t],
  ["u", ["v", "a", "t"], (x) => x.v - x.a * x.t],
  ["a", ["u", "v", "t"], (x) => (x.v - x.u) / x.t],
  ["t", ["u", "v", "a"], (x) => (x.v - x.u) / x.a],
  ["s", ["u", "v", "t"], (x) => ((x.u + x.v) * x.t) / 2],
  ["s", ["u", "a", "t"], (x) => x.u * x.t + 0.5 * x.a * x.t * x.t],
  ["s", ["v", "a", "t"], (x) => x.v * x.t - 0.5 * x.a * x.t * x.t],
  ["s", ["u", "v", "a"], (x) => (x.v * x.v - x.u * x.u) / (2 * x.a)],
  ["a", ["u", "s", "t"], (x) => (2 * (x.s - x.u * x.t)) / (x.t * x.t)],
  ["u", ["s", "a", "t"], (x) => x.s / x.t - (x.a * x.t) / 2],
  ["u", ["v", "s", "t"], (x) => (2 * x.s) / x.t - x.v],
  ["t", ["u", "v", "s"], (x) => (2 * x.s) / (x.u + x.v)],
  ["v", ["u", "a", "s"], (x) => Math.sqrt(x.u * x.u + 2 * x.a * x.s)],
  ["u", ["v", "a", "s"], (x) => Math.sqrt(x.v * x.v - 2 * x.a * x.s)],
];
export const suvat: SciCalculator = (v) => {
  const known = SUVAT_KNOWN[pick(v.known, SUVAT_KNOWN.length)].split(", ") as K[];
  const x = {} as Record<K, number>, have = new Set<K>(known);
  for (const k of known) x[k] = num(v[k]);
  for (let pass = 0; pass < 6 && have.size < 5; pass++)
    for (const [tgt, need, f] of RULES)
      if (!have.has(tgt) && need.every((n) => have.has(n))) {
        const val = f(x);
        if (Number.isFinite(val)) {
          x[tgt] = val;
          have.add(tgt);
        }
      }
  if (have.size < 5) throw new InputError("These values don't give a unique real solution (for example a = 0 when solving for t, or a negative value under a square root).");
  return { s: s(x.s), u: s(x.u), v: s(x.v), a: s(x.a), t: s(x.t), note: known.includes("s") && (known.includes("a") && !known.includes("t")) ? "Square-root step: the positive root is shown." : "Constant acceleration." };
};

// ---------- Gravity, falling, projectiles ----------
export const PE_SOLVE = ["Potential energy PE", "Mass m", "Height h"];
export const gpe: SciCalculator = (v) => {
  const g = pos(v.g, G0) || G0;
  const r = solveFor(v, ["pe", "m", "h"], ["PE", "m", "h"], ["J", "kg", "m"], [(a) => a.m * g * a.h, (a) => a.pe / (g * a.h), (a) => a.pe / (a.m * g)]);
  return { result: s(r.x), solved: r.solved, kj: s(r.a.pe / 1000), impactSpeed: r.a.h >= 0 ? s(Math.sqrt(2 * g * r.a.h)) : "—" };
};
export const FALL_MODE = ["Height known", "Time known"];
export const freeFall: SciCalculator = (v) => {
  const g = pos(v.g, G0) || G0, u = num(v.u, 0);
  let h: number, t: number;
  if (pick(v.mode, 2) === 0) {
    h = pos(v.h, 100);
    t = (-u + Math.sqrt(u * u + 2 * g * h)) / g;
  } else {
    t = pos(v.t, 3);
    h = u * t + 0.5 * g * t * t;
  }
  const vf = u + g * t;
  return { t: s(t), vf: s(vf), kmh: s(vf * 3.6), h: s(h), avg: s(t ? h / t : 0) };
};
export const mass: SciCalculator = (v) => {
  const m = pick(v.mode, 4);
  const x = fin(m === 0 ? num(v.rho, 1000) * num(v.vol, 0.002) : m === 1 ? num(v.F, 50) / num(v.a, 2) : m === 2 ? num(v.W, 686) / (pos(v.g, G0) || G0) : (2 * num(v.ke, 200)) / num(v.vel, 10) ** 2);
  return { kg: s(x), g: s(x * 1000), lb: s(x / 0.45359237), weight: s(x * G0) };
};
export const MASS_MODE = ["Density × volume", "Force ÷ acceleration", "Weight ÷ g", "From kinetic energy and speed"];
export const GF_SOLVE = ["Force F", "Mass m₁", "Distance r"];
export const gravForce: SciCalculator = (v) => {
  const r = solveFor(v, ["F", "m1", "r"], ["F", "m₁", "r"], ["N", "kg", "m"], [(a) => (G_CONST * a.m1 * num(v.m2)) / a.r ** 2, (a) => (a.F * a.r ** 2) / (G_CONST * num(v.m2)), (a) => Math.sqrt((G_CONST * a.m1 * num(v.m2)) / a.F)]);
  return { result: s(r.x), solved: r.solved, g1: s((G_CONST * r.a.m1) / r.a.r ** 2), g2: s((G_CONST * num(v.m2)) / r.a.r ** 2), escape: s(Math.sqrt((2 * G_CONST * r.a.m1) / r.a.r)) };
};
export const projectile: SciCalculator = (v) => {
  const v0 = pos(v.v0, 20), th = num(v.angle, 45) * RAD, h0 = num(v.h0, 0), g = pos(v.g, G0) || G0;
  const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
  const disc = vy * vy + 2 * g * h0;
  if (disc < 0) throw new InputError("The projectile never reaches the ground level.");
  const T = (vy + Math.sqrt(disc)) / g, vyEnd = vy - g * T;
  return { range: s(vx * T), hmax: s(h0 + (vy * vy) / (2 * g) * (vy > 0 ? 1 : 0)), time: s(T), tPeak: s(Math.max(0, vy / g)), impact: s(Math.hypot(vx, vyEnd)), impactAngle: s(Math.atan2(-vyEnd, vx) / RAD, 8), comps: `vx = ${fmt(vx, 8)} m/s, vy = ${fmt(vy, 8)} m/s` };
};
export const centerOfMass: SciCalculator = (v) => {
  const m = listOf(v, "m", 1), x = listOf(v, "x", 1), ys = txt(v, "y"), y = ys ? listOf(v, "y", 1) : null;
  if (x.length !== m.length || (y && y.length !== m.length)) throw new InputError("Enter one position per mass.");
  const M = sum(m);
  if (!M) throw new InputError("Total mass can't be zero.");
  const cx = sum(m.map((mi, i) => mi * x[i])) / M, cy = y ? sum(m.map((mi, i) => mi * y[i])) / M : 0;
  return { cx: s(cx), cy: y ? s(cy) : "—", total: s(M), point: y ? `(${fmt(cx, 8)}, ${fmt(cy, 8)})` : `x = ${fmt(cx, 8)}` };
};
export const terminalVelocity: SciCalculator = (v) => {
  const m = pos(v.m, 80), g = pos(v.g, G0) || G0, rho = pos(v.rho, 1.225), cd = pos(v.cd, 1), A = pos(v.A, 0.7);
  const vt = fin(Math.sqrt((2 * m * g) / (rho * cd * A)));
  return { vt: s(vt), kmh: s(vt * 3.6), mph: s(vt / 0.44704), t95: s((vt / g) * Math.atanh(0.95), 8), d95: s(((vt * vt) / g) * Math.log(Math.cosh(Math.atanh(0.95))), 8) };
};
export const IMP_MODE = ["Force × time", "Mass × change in velocity"];
export const impulse: SciCalculator = (v) => {
  const m = pick(v.mode, 2), t = pos(v.t, 0.1);
  const J = m === 0 ? num(v.F, 500) * t : num(v.m, 0.5) * (num(v.v2, 20) - num(v.v1, 0));
  return { J: s(J), avgForce: t ? s(J / t) : "—", dv: num(v.m, 0.5) ? s(J / num(v.m, 0.5)) : "—" };
};
export const POW_MODE = ["Work ÷ time", "Force × velocity", "Energy per time (kWh, hours)"];
export const powerPhysics: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const P = fin(m === 0 ? num(v.W, 1000) / num(v.t, 10) : m === 1 ? num(v.F, 500) * num(v.vel, 2) : (num(v.kwh, 1) * 3.6e6) / (num(v.h, 1) * 3600));
  return { W: s(P), kW: s(P / 1000), hp: s(P / 745.69987158227), btu: s(P * 3.412141633), jh: s(P * 3600) };
};
export const friction: SciCalculator = (v) => {
  const m = pos(v.m, 10), th = num(v.angle, 0) * RAD, ms = pos(v.mus, 0.5), mk = pos(v.muk, 0.4), g = G0;
  const N = m * g * Math.cos(th), Fs = ms * N, Fk = mk * N, along = m * g * Math.sin(th);
  const ff = pos(v.ff, 0), nn = pos(v.nn, 0);
  return { N: s(N), Fs: s(Fs), Fk: s(Fk), along: s(along), slides: along > Fs ? 0 : 1, accel: along > Fs ? s(g * (Math.sin(th) - mk * Math.cos(th))) : 0, mu: ff && nn ? s(ff / nn, 8) : "enter friction & normal force", critical: s(Math.atan(ms) / RAD, 6) };
};
export const SLIDES = ["Slides (gravity beats static friction)", "Stays put"];
export const IMPACT_MODE = ["Stopping distance", "Stopping time"];
export const impactForce: SciCalculator = (v) => {
  const m = pos(v.m, 80), h = pos(v.h, 0), vel = pos(v.v, 0) || Math.sqrt(2 * G0 * h);
  if (!vel) throw new InputError("Enter an impact speed or a drop height.");
  const mode = pick(v.mode, 2), d = pos(v.d, 0.05), t = pos(v.t, 0.01);
  const F = fin(mode === 0 ? (m * vel * vel) / (2 * d) : (m * vel) / t);
  return { F: s(F), kn: s(F / 1000), gs: s(F / (m * G0), 6), energy: s(0.5 * m * vel * vel), speed: s(vel) };
};
export const CENT_MODE = ["Speed known", "RPM known"];
export const centripetal: SciCalculator = (v) => {
  const m = pos(v.m, 1), r = pos(v.r, 2);
  if (!r) throw new InputError("Radius must be positive.");
  const vel = pick(v.mode, 2) === 0 ? pos(v.v, 10) : (pos(v.rpm, 60) * 2 * Math.PI * r) / 60;
  const a = (vel * vel) / r, w = vel / r;
  return { F: s(m * a), a: s(a), g: s(a / G0, 8), w: s(w), period: w ? s((2 * Math.PI) / w) : "—", v: s(vel) };
};
export const ANG_MODE = ["From RPM", "Angle ÷ time", "Linear speed ÷ radius", "From frequency (Hz)"];
export const angularVelocity: SciCalculator = (v) => {
  const m = pick(v.mode, 4);
  const w = fin(m === 0 ? (num(v.rpm, 3000) * 2 * Math.PI) / 60 : m === 1 ? (num(v.angle, 360) * RAD) / num(v.t, 1) : m === 2 ? num(v.v, 10) / num(v.r, 0.5) : 2 * Math.PI * num(v.f, 50));
  return { w: s(w), rpm: s((w * 60) / (2 * Math.PI)), degs: s(w / RAD), hz: s(w / (2 * Math.PI)), period: w ? s((2 * Math.PI) / Math.abs(w)) : "—" };
};
export const work: SciCalculator = (v) => {
  const F = num(v.F, 100), d = num(v.d, 5), th = num(v.angle, 0) * RAD, W = F * d * Math.cos(th);
  return { W: s(W), kj: s(W / 1000), kwh: s(W / 3.6e6), cal: s(W / 4184), ftlb: s(W / 1.3558179483) };
};
export const normalForce: SciCalculator = (v) => {
  const m = pos(v.m, 10), th = num(v.angle, 0) * RAD, fd = num(v.F, 0), fa = num(v.fangle, 0) * RAD, a = num(v.a, 0);
  const N = m * (G0 + a) * Math.cos(th) + fd * Math.sin(fa);
  return { N: s(N), kgf: s(N / G0), weight: s(m * G0), ratio: s(N / (m * G0), 6), lifts: N < 0 ? "N < 0: the object leaves the surface" : "in contact" };
};
export const reactionTime: SciCalculator = (v) => {
  const kmh = pos(v.speed, 50), t = pos(v.t, 1.5), mu = pos(v.mu, 0.7), drop = pos(v.drop, 0), vel = kmh / 3.6;
  const rd = vel * t, bd = mu ? (vel * vel) / (2 * mu * G0) : NaN;
  return { reaction: s(rd), braking: Number.isFinite(bd) ? s(bd) : "—", total: Number.isFinite(bd) ? s(rd + bd) : "—", ruler: drop ? s(Math.sqrt((2 * drop) / 100 / G0), 6) : "enter ruler drop (cm)", seconds: s(t, 6) };
};
export const mechanicalEnergy: SciCalculator = (v) => {
  const m = pos(v.m, 2), h = num(v.h, 10), vel = num(v.v, 5), h2 = num(v.h2, 0), v2 = num(v.v2, 0);
  const pe = m * G0 * h, ke = 0.5 * m * vel * vel, E1 = pe + ke, E2 = m * G0 * h2 + 0.5 * m * v2 * v2;
  return { total: s(E1), pe: s(pe), ke: s(ke), final: s(E2), loss: s(E1 - E2), efficiency: E1 ? s((100 * E2) / E1, 6) : "—", ideal: s(Math.sqrt(Math.max(0, (2 * (E1 - m * G0 * h2)) / m))) };
};
export const ANGACC_MODE = ["Change in ω ÷ time", "Torque ÷ moment of inertia", "Tangential acceleration ÷ radius"];
export const angularAcceleration: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const al = fin(m === 0 ? (num(v.w2, 20) - num(v.w1, 0)) / num(v.t, 4) : m === 1 ? num(v.tau, 10) / num(v.I, 2) : num(v.at, 3) / num(v.r, 0.5));
  return { alpha: s(al), degs2: s(al / RAD), rpms: s((al * 60) / (2 * Math.PI)) };
};
export const COLL_TYPE = ["Elastic (e = 1)", "Perfectly inelastic (stick together)", "Custom coefficient of restitution e"];
export const collision: SciCalculator = (v) => {
  const m1 = pos(v.m1, 2), u1 = num(v.u1, 3), m2 = pos(v.m2, 1), u2 = num(v.u2, -1), t = pick(v.type, 3);
  const e = t === 0 ? 1 : t === 1 ? 0 : Math.min(1, pos(v.e, 0.5));
  if (!(m1 + m2)) throw new InputError("Masses must be positive.");
  const P = m1 * u1 + m2 * u2, v1 = (P + m2 * e * (u2 - u1)) / (m1 + m2), v2 = (P + m1 * e * (u1 - u2)) / (m1 + m2);
  const k1 = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2, k2r = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, k2 = Math.abs(k1 - k2r) < 1e-9 * Math.max(1, k1) ? k1 : k2r;
  return { v1: s(v1), v2: s(v2), momentum: s(P), keBefore: s(k1), keAfter: s(k2), loss: s(k1 - k2), lossPct: k1 ? s((100 * (k1 - k2)) / k1, 6) : 0 };
};
export const ANGMOM_MODE = ["Rigid body: L = Iω", "Point mass: L = m·v·r"];
export const angularMomentum: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const I = pos(v.I, 2), w = num(v.w, 10);
    return { L: s(I * w), ke: s(0.5 * I * w * w), note: `I = ${fmt(I)} kg·m², ω = ${fmt(w)} rad/s` };
  }
  const m = pos(v.m, 1), vel = num(v.v, 5), r = pos(v.r, 2);
  return { L: s(m * vel * r), ke: s(0.5 * m * vel * vel), note: `equivalent I = mr² = ${fmt(m * r * r, 8)} kg·m²` };
};
export const EPE_SOLVE = ["Elastic energy U", "Spring constant k", "Displacement x"];
export const elasticPE: SciCalculator = (v) => {
  const r = solveFor(v, ["U", "k", "x"], ["U", "k", "x"], ["J", "N/m", "m"], [(a) => 0.5 * a.k * a.x ** 2, (a) => (2 * a.U) / a.x ** 2, (a) => Math.sqrt((2 * a.U) / a.k)]);
  return { result: s(r.x), solved: r.solved, force: s(r.a.k * r.a.x), U: s(r.a.U) };
};
export const EQ_MODE = ["Beam on two end supports (point loads)", "Equilibrant of up to 3 forces"];
export const equilibrium: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const L = pos(v.L, 6), P = listOf(v, "loads", 1), x = listOf(v, "pos", 1), w = pos(v.w, 0);
    if (!L) throw new InputError("Beam length must be positive.");
    if (P.length !== x.length) throw new InputError("Enter one position per load.");
    if (x.some((q) => q < 0 || q > L)) throw new InputError("Load positions must be between 0 and the beam length.");
    const W = sum(P) + w * L, Mb = sum(P.map((p, i) => p * x[i])) + (w * L * L) / 2;
    const RB = Mb / L, RA = W - RB;
    return { RA: s(RA), RB: s(RB), total: s(W), check: `ΣF: ${fmt(RA + RB - W, 6)}, ΣM about A: ${fmt(RB * L - Mb, 6)}` };
  }
  const F = [1, 2, 3].map((i) => [num(v[`f${i}`]), num(v[`a${i}`]) * RAD]);
  const fx = sum(F.map(([f, a]) => f * Math.cos(a))), fy = sum(F.map(([f, a]) => f * Math.sin(a))), R = Math.hypot(fx, fy);
  return { RA: s(R), RB: s(((Math.atan2(-fy, -fx) / RAD) + 360) % 360, 8), total: s(R), check: R < 1e-9 ? "Already in equilibrium" : `Add ${fmt(R, 8)} N at ${fmt(((Math.atan2(-fy, -fx) / RAD) + 360) % 360, 6)}° to balance` };
};

export const sciMechCustomCalculators: Record<string, SciCalculator> = {
  "kinetic-energy-calculator": kineticEnergy,
  "acceleration-calculator": acceleration,
  "velocity-calculator": velocity,
  "newtons-second-law-calculator": newtonSecond,
  "net-force-calculator": netForce,
  "momentum-calculator": momentum,
  "suvat-calculator": suvat,
  "gravitational-potential-energy-calculator": gpe,
  "free-fall-calculator": freeFall,
  "mass-calculator": mass,
  "gravitational-force-calculator": gravForce,
  "projectile-motion-calculator": projectile,
  "center-of-mass-calculator": centerOfMass,
  "terminal-velocity-calculator": terminalVelocity,
  "impulse-calculator": impulse,
  "power-calculator-physics": powerPhysics,
  "friction-calculator": friction,
  "impact-force-calculator": impactForce,
  "centripetal-force-calculator": centripetal,
  "angular-velocity-calculator": angularVelocity,
  "work-calculator": work,
  "normal-force-calculator": normalForce,
  "reaction-time-calculator": reactionTime,
  "mechanical-energy-calculator": mechanicalEnergy,
  "angular-acceleration-calculator": angularAcceleration,
  "collision-calculator": collision,
  "angular-momentum-calculator": angularMomentum,
  "elastic-potential-energy-calculator": elasticPE,
  "equilibrium-physics-calculator": equilibrium,
};
