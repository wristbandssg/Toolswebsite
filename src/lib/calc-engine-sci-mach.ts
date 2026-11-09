/**
 * Batch: "Science Calculators" → Mechanical & Structural Engineering (machine design: fasteners,
 * gears, springs, power transmission, fabrication & vibration — 32 tools).
 *
 * Bolts: ISO 898-1 proof strengths, tensile stress area A_s = π/4·((d₂ + d₃)/2)², preload 75% of
 * proof load, T = K·F·d. Springs: k = Gd⁴/(8D³Nₐ), Wahl factor. Gears: module geometry,
 * planetary ratios by Willis' equation, worm efficiency tan γ/tan(γ + ρ′). Press fits by Lamé
 * thick-cylinder theory. Hertz contact for spheres and cylinders. Bearing defect frequencies
 * BPFO/BPFI/BSF/FTF. Keys from DIN 6885-1. Box compression by the McKee formula. Shaft critical
 * speed for a uniform simply supported tube. See prisma/create-sci-mach-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const G0 = 9.80665, TAU = 2 * Math.PI, RAD = Math.PI / 180;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};

// ---------- torque, bolts, clamping ----------
export const TORQUE_MODE = ["Force × lever arm", "From power and speed", "Bolt tightening (T = K·F·d)"];
export const torque: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const T = m === 0 ? num(v.F, 100) * num(v.r, 0.3) * Math.sin(num(v.ang, 90) * RAD) : m === 1 ? (pos(v.P, 5) * 1000) / ((pos(v.rpm, 1500) * TAU) / 60) : pos(v.K, 0.2) * pos(v.Fb, 20) * 1000 * (pos(v.d, 12) / 1000);
  return { Nm: s(fin(T), 8), lbft: s(T / 1.3558179483, 8), lbin: s((T / 1.3558179483) * 12, 8), kgfm: s(T / G0, 8) };
};
const BOLTS: [string, number, number][] = [["M3", 3, 0.5], ["M4", 4, 0.7], ["M5", 5, 0.8], ["M6", 6, 1], ["M8", 8, 1.25], ["M10", 10, 1.5], ["M12", 12, 1.75], ["M14", 14, 2], ["M16", 16, 2], ["M20", 20, 2.5], ["M24", 24, 3], ["M30", 30, 3.5], ["M36", 36, 4]];
export const BOLT_SIZES = BOLTS.map((b) => `${b[0]} × ${b[2]}`);
const GRADES: [string, number, number][] = [["4.6", 225, 400], ["5.8", 380, 520], ["8.8", 600, 830], ["10.9", 830, 1040], ["12.9", 970, 1220], ["A2-70 / A4-70 stainless", 450, 700]];
export const BOLT_GRADES = GRADES.map((g) => `Class ${g[0]}`);
export const LUBE = ["Dry, plain steel (K ≈ 0.20)", "Zinc plated (K ≈ 0.18)", "Lubricated / oiled (K ≈ 0.15)", "Anti-seize / moly (K ≈ 0.12)", "Custom K"];
const KF = [0.2, 0.18, 0.15, 0.12];
const stressArea = (d: number, p: number) => (Math.PI / 4) * ((d - 0.6495 * p + (d - 1.2269 * p)) / 2) ** 2;
export const boltTorque: SciCalculator = (v) => {
  const [, d, p] = BOLTS[pick(v.size, BOLTS.length)], [, proof, uts] = GRADES[pick(v.grade, GRADES.length)], k = pick(v.lube, 5), K = k < 4 ? KF[k] : pos(v.K, 0.2), pct = pos(v.pct, 75) / 100, grip = pos(v.grip, 20);
  const As = stressArea(d, p), F = pct * proof * As, T = (K * F * d) / 1000;
  return { T: s(T, 6), F: s(F / 1000, 6), As: s(As, 6), stress: s(F / As, 6), lbft: s(T / 1.3558179483, 6), length: `≥ ${fmt(grip + 0.8 * d + 2 * p, 4)} mm (grip + nut + 2 threads); ultimate ${fmt((uts * As) / 1000, 5)} kN` };
};
export const CLAMP_MODE = ["Clamp force from bolt torque", "Clamp force needed to resist sliding"];
export const clampingForce: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const L = pos(v.load, 5), mu = pos(v.mu, 0.2), n = Math.max(1, Math.round(pos(v.faces, 1))), sf = pos(v.sf, 2);
    const F = (L * sf) / (mu * n);
    return { F: s(F, 8), perBolt: s(F / Math.max(1, Math.round(pos(v.bolts, 4))), 8), lbf: s((F * 1000) / 4.4482216, 6), note: "F = load × safety ÷ (μ × friction interfaces)" };
  }
  const T = pos(v.T, 50), K = pos(v.K, 0.2), d = pos(v.d, 10) / 1000, n = Math.max(1, Math.round(pos(v.bolts, 4))), F = T / (K * d) / 1000;
  return { F: s(F * n, 8), perBolt: s(F, 8), lbf: s((F * n * 1000) / 4.4482216, 6), note: "F = T/(K·d) per bolt" };
};
export const THREAD_MODE = ["Metric ISO (M, pitch in mm)", "Unified UN (inch, TPI)"];
export const thread: SciCalculator = (v) => {
  const metric = pick(v.mode, 2) === 0, d = metric ? pos(v.d, 10) : pos(v.d, 0.5) * 25.4, P = metric ? pos(v.p, 1.5) : 25.4 / pos(v.tpi, 13);
  const d2 = d - 0.6495 * P, d3 = d - 1.2269 * P, d1 = d - 1.0825 * P, As = stressArea(d, P);
  const u = (x: number) => (metric ? `${fmt(x, 6)} mm` : `${fmt(x / 25.4, 6)} in (${fmt(x, 5)} mm)`);
  return { major: u(d), pitchD: u(d2), minor: u(d1), root: u(d3), tap: u(d - P), As: s(As, 6), pitch: metric ? `${fmt(P)} mm` : `${fmt(25.4 / P, 4)} TPI (${fmt(P, 5)} mm)` };
};

// ---------- gears ----------
export const gearModule: SciCalculator = (v) => {
  const m = pos(v.m, 2), z = Math.max(1, Math.round(pos(v.z, 30))), z2 = Math.round(pos(v.z2, 60)), pa = num(v.pa, 20) * RAD, beta = num(v.beta, 0) * RAD;
  const mt = m / Math.cos(beta), d = mt * z, da = d + 2 * m, df = d - 2.5 * m, db = d * Math.cos(Math.atan(Math.tan(pa) / Math.cos(beta)));
  return { d: s(d, 8), da: s(da, 8), df: s(df, 8), db: s(db, 8), pitch: s(Math.PI * m, 8), cd: z2 ? s((mt * (z + z2)) / 2, 8) : "enter mating teeth", ratio: z2 ? s(z2 / z, 6) : "—" };
};
export const gearRatio: SciCalculator = (v) => {
  const stages = txt(v, "stages").split(";").map((st) => st.trim().split(/[\s,:]+/).map(Number)).filter((p) => p.length === 2 && p.every((x) => x > 0));
  if (!stages.length) throw new InputError("Enter stages as driver driven; e.g. 20 60; 15 45.");
  const r = stages.reduce((t, [a, b]) => t * (b / a), 1), rpm = pos(v.rpm, 1500), T = pos(v.T, 10), eff = pos(v.eff, 98) / 100;
  return { ratio: s(r, 8), text: `${fmt(r, 6)} : 1 (${r >= 1 ? "reduction" : "overdrive"})`, rpm: s(rpm / r, 8), T: s(T * r * eff ** stages.length, 8), stages: stages.map(([a, b], i) => `stage ${i + 1}: ${a} → ${b} = ${fmt(b / a, 5)}`).join("\n") };
};
export const PLANET_FIXED = ["Ring fixed (sun in, carrier out)", "Sun fixed (ring in, carrier out)", "Carrier fixed (sun in, ring out)"];
export const planetary: SciCalculator = (v) => {
  const Zs = Math.round(pos(v.zs, 20)), Zr = Math.round(pos(v.zr, 70)), N = Math.max(1, Math.round(pos(v.n, 3))), k = pick(v.fixed, 3);
  const Zp = (Zr - Zs) / 2;
  if (!(Zr > Zs) || !Number.isInteger(Zp)) throw new InputError("Ring − sun teeth must be a positive even number (planet teeth = (Zr − Zs)/2).");
  const ratio = k === 0 ? 1 + Zr / Zs : k === 1 ? 1 + Zs / Zr : -Zr / Zs, rpm = pos(v.rpm, 1500);
  return { ratio: s(ratio, 8), Zp, out: s(rpm / ratio, 8), assembly: Number.isInteger((Zs + Zr) / N) ? `OK — (Zs + Zr)/N = ${(Zs + Zr) / N} is a whole number` : `Planets can't be equally spaced: (Zs + Zr)/N = ${fmt((Zs + Zr) / N, 5)}`, note: k === 2 ? "Negative = output reverses" : "Same direction" };
};
export const wormGear: SciCalculator = (v) => {
  const starts = Math.max(1, Math.round(pos(v.starts, 1))), Zw = Math.round(pos(v.zw, 40)), m = pos(v.m, 3), dw = pos(v.dw, 40), mu = pos(v.mu, 0.05), pa = num(v.pa, 20) * RAD;
  const gamma = Math.atan((starts * m) / dw), rho = Math.atan(mu / Math.cos(pa)), eta = Math.tan(gamma) / Math.tan(gamma + rho);
  return { ratio: s(Zw / starts, 6), eta: s(100 * eta, 5), lead: s(gamma / RAD, 6), cd: s((dw + m * Zw) / 2, 6), lock: gamma < rho ? "Self-locking (back-driving prevented)" : "Can be back-driven", Tout: s(pos(v.T, 10) * (Zw / starts) * eta, 6) };
};
export const spline: SciCalculator = (v) => {
  const m = pos(v.m, 2), z = Math.max(6, Math.round(pos(v.z, 20))), L = pos(v.L, 30), tau = pos(v.tau, 60), share = pos(v.share, 50) / 100;
  const D = m * z, T = (tau * Math.PI * D * D * L * share) / 16 / 1000;
  return { D: s(D, 6), major: s(m * (z + 1), 6), minor: s(m * (z - 1.25), 6), T: s(T, 6), pitch: s(Math.PI * m, 6) };
};

// ---------- springs & gas struts ----------
const GMOD = [79.3, 69, 77.2, 41, 44.8];
export const SPRING_MAT = ["Music wire / spring steel (G 79.3 GPa)", "Stainless 302 (G 69 GPa)", "Chrome silicon (G 77.2 GPa)", "Phosphor bronze (G 41 GPa)", "Beryllium copper (G 44.8 GPa)"];
export const SPRING_MODE = ["Compression / extension spring", "Torsion spring"];
export const springRate: SciCalculator = (v) => {
  const G = GMOD[pick(v.mat, GMOD.length)] * 1000, d = pos(v.d, 2), OD = pos(v.od, 20), Na = pos(v.na, 8), x = num(v.x, 10), D = OD - d, C = D / d;
  if (D <= 0) throw new InputError("Outer diameter must exceed the wire diameter.");
  if (pick(v.mode, 2) === 1) {
    const E = (G * 2 * 1.3) / 1, kRad = (E * d ** 4) / (64 * D * Na), kDeg = kRad * RAD;
    return { k: s(kDeg, 6), load: s(kDeg * x, 6), stress: s((32 * kDeg * x) / (Math.PI * d ** 3), 6), index: s(C, 5), unit: "N·mm per degree (torque = k × angle)" };
  }
  const k = (G * d ** 4) / (8 * D ** 3 * Na), F = k * x, Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
  return { k: s(k, 6), load: s(F, 6), stress: s((Kw * 8 * F * D) / (Math.PI * d ** 3), 6), index: s(C, 5), unit: "N/mm (load in N at the deflection)" };
};
export const gasSpring: SciCalculator = (v) => {
  const W = pos(v.W, 10), dcg = pos(v.dcg, 0.4), r = pos(v.r, 0.15), n = Math.max(1, Math.round(pos(v.n, 2))), sf = 1 + pos(v.sf, 10) / 100;
  if (!r) throw new InputError("Mounting distance must be positive.");
  const F = (W * G0 * dcg * sf) / (n * r);
  return { F: s(F, 6), lb: s(F / 4.4482216, 6), torque: s(W * G0 * dcg, 6), note: `Each strut ≈ ${fmt(Math.ceil(F / 10) * 10)} N rating; lid horizontal is the worst case` };
};

// ---------- machining & fabrication ----------
export const boltCircle: SciCalculator = (v) => {
  const D = pos(v.D, 100), n = Math.min(72, Math.max(2, Math.round(pos(v.n, 6)))), a0 = num(v.a0, 0), cx = num(v.cx, 0), cy = num(v.cy, 0);
  const pts = Array.from({ length: n }, (_, i) => { const a = (a0 + (360 * i) / n) * RAD; return `${i + 1}: X ${fmt(cx + (D / 2) * Math.cos(a), 7)}, Y ${fmt(cy + (D / 2) * Math.sin(a), 7)}`; });
  return { table: pts.join("\n"), chord: s(D * Math.sin(Math.PI / n), 8), angle: s(360 / n, 6) };
};
export const RING_APP = ["Street / naturally aspirated", "Performance / circle track", "Nitrous oxide", "Turbo / supercharged"];
const RING_F: [number, number][] = [[0.0045, 0.005], [0.005, 0.0055], [0.0065, 0.0065], [0.007, 0.0065]];
export const pistonRing: SciCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1, bore = metric ? pos(v.bore, 101.6) / 25.4 : pos(v.bore, 4), [f1, f2] = RING_F[pick(v.app, 4)];
  return { top: s(f1 * bore, 5), second: s(f2 * bore, 5), topMm: s(f1 * bore * 25.4, 5), secondMm: s(f2 * bore * 25.4, 5), oil: "Oil rails: 0.015″ minimum (follow the ring maker's card)" };
};
export const UNITS_IN = ["Inches", "Millimetres"];
export const sineBar: SciCalculator = (v) => {
  const L = pos(v.L, 100);
  if (pick(v.mode, 2) === 1) { const H = pos(v.H, 50); if (H > L) throw new InputError("Height can't exceed the sine bar length."); return { H: s(H, 8), angle: s(Math.asin(H / L) / RAD, 8), dms: dms(Math.asin(H / L) / RAD) }; }
  const a = num(v.angle, 30);
  return { H: s(L * Math.sin(a * RAD), 8), angle: s(a, 8), dms: dms(a) };
};
const dms = (deg: number) => { const d = Math.floor(deg), m = Math.floor((deg - d) * 60), sec = ((deg - d) * 60 - m) * 60; return `${d}° ${m}′ ${fmt(sec, 4)}″`; };
export const SINE_MODE = ["Gauge block height for an angle", "Angle from gauge block height"];
export const BEND_MODE = ["Bend allowance & flat length", "K-factor from a test bend"];
export const sheetBend: SciCalculator = (v) => {
  const T = pos(v.T, 2), R = pos(v.R, 2), A = pos(v.angle, 90), K = pos(v.K, 0.44), a = pos(v.a, 50), b = pos(v.b, 30);
  if (pick(v.mode, 2) === 1) { const BA = pos(v.ba, 4.6); const k = (BA * 180) / (Math.PI * A) - R; return { BA: s(BA, 6), BD: "—", flat: "—", K: s(k / T, 6), OSSB: "—" }; }
  const BA = ((Math.PI * A) / 180) * (R + K * T), OSSB = Math.tan((A * RAD) / 2) * (R + T), BD = 2 * OSSB - BA;
  return { BA: s(BA, 6), BD: s(BD, 6), flat: s(a + b - BD, 6), K: s(K, 6), OSSB: s(OSSB, 6) };
};
export const WELD_PROC = ["SAW (efficiency 1.0)", "GMAW / MIG (0.8)", "FCAW (0.8)", "SMAW / stick (0.8)", "GTAW / TIG (0.6)"];
const WELD_EFF = [1, 0.8, 0.8, 0.8, 0.6];
export const weldHeat: SciCalculator = (v) => {
  const V = pos(v.V, 25), I = pos(v.I, 200), sp = pos(v.speed, 300), eff = WELD_EFF[pick(v.proc, 5)];
  const arc = (V * I * 60) / (1000 * sp);
  return { hi: s(arc * eff, 6), arc: s(arc, 6), kjin: s(arc * eff * 25.4, 6), power: s((V * I) / 1000, 6) };
};
export const ROLL_MODE = ["Metric (0.01 mm thimble)", "Inch (0.001″ thimble)"];
export const micrometer: SciCalculator = (v) => {
  const metric = pick(v.mode, 2) === 0, sleeve = pos(v.sleeve, 12.5), thimble = pos(v.thimble, 23), vern = pos(v.vernier, 0);
  const r = metric ? sleeve + thimble * 0.01 + vern * 0.001 : sleeve + thimble * 0.001 + vern * 0.0001;
  return { reading: s(r, 8), other: metric ? s(r / 25.4, 8) : s(r * 25.4, 8), detail: metric ? `${fmt(sleeve)} + ${fmt(thimble)}×0.01${vern ? ` + ${fmt(vern)}×0.001` : ""} mm` : `${fmt(sleeve)} + ${fmt(thimble)}×0.001${vern ? ` + ${fmt(vern)}×0.0001` : ""} in` };
};
export const FLUTES = ["B flute (≈ 0.125″)", "C flute (≈ 0.160″)", "E flute (≈ 0.0625″)", "BC double wall (≈ 0.250″)", "Custom caliper"];
const CAL = [0.125, 0.16, 0.0625, 0.25];
export const ectBox: SciCalculator = (v) => {
  const ect = pos(v.ect, 32), k = pick(v.flute, 5), cal = k < 4 ? CAL[k] : pos(v.cal, 0.16), L = pos(v.L, 16), W = pos(v.W, 12), sf = pos(v.sf, 4) || 1, wt = pos(v.wt, 20);
  const P = 2 * (L + W), bct = 5.87 * ect * Math.sqrt(cal * P), safe = bct / sf;
  return { bct: s(bct, 6), kg: s(bct * 0.45359237, 6), safe: s(safe, 6), boxes: wt ? Math.max(0, Math.floor(safe / wt)) : "enter box weight", note: "Safety factor covers humidity, time, pallet overhang (typically 3–5)" };
};

// ---------- fits, contact, vibration ----------
export const pressFit: SciCalculator = (v) => {
  const delta = pos(v.delta, 0.03), d = pos(v.d, 50), D = pos(v.D, 100), di = pos(v.di, 0), L = pos(v.L, 40), E = pos(v.E, 200) * 1000, nu = pos(v.nu, 0.3), mu = pos(v.mu, 0.15);
  if (!(D > d) || di >= d) throw new InputError("Check diameters: shaft ID < shaft OD < hub OD.");
  const p = delta / (d * ((1 / E) * ((D * D + d * d) / (D * D - d * d) + nu) + (1 / E) * ((d * d + di * di) / (d * d - di * di) - nu)));
  const F = Math.PI * d * L * p * mu, hoop = (p * (D * D + d * d)) / (D * D - d * d);
  return { p: s(p, 6), F: s(F / 1000, 6), T: s((F * d) / 2 / 1000, 6), hoop: s(hoop, 6), heat: s(delta / (11.5e-6 * d) + 20, 5) };
};
export const HERTZ_GEOM = ["Sphere on sphere / flat", "Cylinder on cylinder / flat (line contact)"];
export const hertz: SciCalculator = (v) => {
  const F = pos(v.F, 1000), R1 = pos(v.r1, 10), R2 = pos(v.r2, 0), E1 = pos(v.e1, 210) * 1000, E2 = pos(v.e2, 210) * 1000, n1 = pos(v.n1, 0.3), n2 = pos(v.n2, 0.3), L = pos(v.L, 10);
  const R = 1 / (1 / R1 + (R2 ? 1 / R2 : 0)), Es = 1 / ((1 - n1 * n1) / E1 + (1 - n2 * n2) / E2);
  if (pick(v.geom, 2) === 0) {
    const a = ((3 * F * R) / (4 * Es)) ** (1 / 3), p0 = (3 * F) / (2 * Math.PI * a * a);
    return { p0: s(p0, 6), a: s(a, 6), tau: s(0.31 * p0, 6), depth: s(0.48 * a, 6), delta: s((a * a) / R, 6) };
  }
  const b = Math.sqrt((4 * F * R) / (Math.PI * L * Es)), p0 = (2 * F) / (Math.PI * b * L);
  return { p0: s(p0, 6), a: s(b, 6), tau: s(0.3 * p0, 6), depth: s(0.786 * b, 6), delta: "—" };
};
export const VIB_QTY = ["Displacement", "Velocity", "Acceleration"];
export const VIB_UNITS = ["Displacement mm, velocity mm/s, acceleration m/s²", "Displacement mil, velocity in/s, acceleration g"];
export const VIB_MEAS = ["Peak", "RMS", "Peak-to-peak"];
export const vibration: SciCalculator = (v) => {
  const q = pick(v.qty, 3), f = pos(v.f, 50), x = pos(v.x, 5), imp = pick(v.units, 2) === 1, meas = pick(v.meas, 3), w = TAU * f;
  const pk = meas === 0 ? x : meas === 1 ? x * Math.SQRT2 : x / 2;
  const toSI = [imp ? 0.0254 : 1, imp ? 25.4 : 1, imp ? G0 : 1][q], val = pk * toSI;
  const d = q === 0 ? val : q === 1 ? val / w : (val * 1000) / (w * w), vel = d * w, acc = (d * w * w) / 1000;
  return { disp: `${fmt(d, 6)} mm pk (${fmt(2 * d, 6)} pk-pk, ${fmt(d / 0.0254, 6)} mil pk)`, vel: `${fmt(vel, 6)} mm/s pk (${fmt(vel / Math.SQRT2, 6)} RMS, ${fmt(vel / 25.4, 6)} in/s pk)`, acc: `${fmt(acc, 6)} m/s² pk (${fmt(acc / G0, 6)} g pk, ${fmt(acc / G0 / Math.SQRT2, 6)} g RMS)`, vrms: s(vel / Math.SQRT2, 6) };
};
export const BEARING_MODE = ["Defect frequencies (BPFO, BPFI, BSF, FTF)"];
export const bearingFreq: SciCalculator = (v) => {
  const n = Math.max(3, Math.round(pos(v.n, 9))), Bd = pos(v.bd, 7.94), Pd = pos(v.pd, 39), ca = num(v.ca, 0) * RAD, rpm = pos(v.rpm, 1800), fr = rpm / 60, r = (Bd / Pd) * Math.cos(ca);
  if (r >= 1) throw new InputError("Ball diameter must be smaller than the pitch diameter.");
  return { bpfo: s((n / 2) * fr * (1 - r), 6), bpfi: s((n / 2) * fr * (1 + r), 6), bsf: s((Pd / (2 * Bd)) * fr * (1 - r * r), 6), ftf: s(0.5 * fr * (1 - r), 6), fr: s(fr, 6) };
};
export const NF_MODE = ["Spring-mass (k and m)", "From static deflection", "Cantilever beam with tip mass"];
export const naturalFrequency: SciCalculator = (v) => {
  const m = pick(v.mode, 3), mass = pos(v.m, 10);
  let k: number;
  if (m === 1) { const dlt = pos(v.delta, 2); return { f: s(15.76 / Math.sqrt(dlt), 6), w: s((TAU * 15.76) / Math.sqrt(dlt), 6), rpm: s((60 * 15.76) / Math.sqrt(dlt), 6), k: "—" }; }
  if (m === 2) k = (3 * pos(v.E, 200) * 1000 * pos(v.I, 1000)) / pos(v.L, 500) ** 3 * 1000;
  else k = pos(v.k, 50000);
  const w = Math.sqrt(k / mass);
  return { f: s(w / TAU, 6), w: s(w, 6), rpm: s((w / TAU) * 60, 6), k: s(k, 6) };
};
export const shaftCritical: SciCalculator = (v) => {
  const OD = pos(v.od, 76.2) / 1000, ID = pos(v.id, 70) / 1000, L = pos(v.L, 1500) / 1000, E = pos(v.E, 200) * 1e9, rho = pos(v.rho, 7850);
  if (ID >= OD) throw new InputError("Inner diameter must be smaller than outer.");
  const I = (Math.PI * (OD ** 4 - ID ** 4)) / 64, A = (Math.PI * (OD * OD - ID * ID)) / 4, w = (Math.PI / L) ** 2 * Math.sqrt((E * I) / (rho * A));
  const rpm = (w / TAU) * 60;
  return { rpm: s(rpm, 6), safe: s(0.75 * rpm, 6), hz: s(w / TAU, 6), mass: s(rho * A * L, 6) };
};

// ---------- power transmission & fluid power ----------
export const lever: SciCalculator = (v) => {
  const ea = pos(v.ea, 2), la = pos(v.la, 0.5), load = pos(v.load, 100), eff = pos(v.eff, 100) / 100, cls = pick(v.cls, 3);
  const ima = ea / la, effort = load / (ima * eff);
  return { effort: s(effort, 8), ima: s(ima, 6), ama: s(ima * eff, 6), cls: ["Class 1 — fulcrum between effort and load (seesaw, crowbar)", "Class 2 — load between fulcrum and effort (wheelbarrow)", "Class 3 — effort between fulcrum and load (tweezers, forearm)"][cls], kg: s(effort / G0, 6) };
};
export const LEVER_CLASS = ["Class 1", "Class 2", "Class 3"];
export const pulley: SciCalculator = (v) => {
  const W = pos(v.W, 100), n = Math.max(1, Math.round(pos(v.n, 4))), e = pos(v.eff, 95) / 100, h = pos(v.h, 2);
  const effIdeal = W / n, effort = (W * (1 - e)) / (1 - e ** n) || effIdeal;
  return { effort: s(e >= 1 ? effIdeal : effort, 8), ideal: s(effIdeal, 8), ma: s(W / (e >= 1 ? effIdeal : effort), 6), rope: s(n * h, 6), kgf: s((e >= 1 ? effIdeal : effort) / G0, 6) };
};
export const HYD_MODE = ["Pump / system power from flow and pressure", "Cylinder force and speed"];
export const hydraulic: SciCalculator = (v) => {
  const Q = pos(v.Q, 40), p = pos(v.p, 150), eff = pos(v.eff, 85) / 100;
  if (pick(v.mode, 2) === 1) {
    const bore = pos(v.bore, 63) / 1000, rod = pos(v.rod, 36) / 1000, A = (Math.PI * bore * bore) / 4, Ar = A - (Math.PI * rod * rod) / 4, P = p * 1e5;
    return { kw: s((p * Q) / 600, 6), hp: "—", shaft: "—", Fext: s((P * A) / 1000, 6), Fret: s((P * Ar) / 1000, 6), vext: s(Q / 60000 / A, 6), vret: s(Q / 60000 / Ar, 6), note: "Cylinder at the given pressure and pump flow" };
  }
  const kw = (p * Q) / 600;
  return { kw: s(kw, 6), hp: s(kw / 0.7457, 6), shaft: s(kw / eff, 6), Fext: "—", Fret: "—", vext: "—", vret: "—", note: `Drive motor ≥ ${fmt(kw / eff, 5)} kW at ${fmt(100 * eff)}% overall efficiency` };
};
export const pneumatic: SciCalculator = (v) => {
  const bore = pos(v.bore, 50), rod = pos(v.rod, 20), stroke = pos(v.stroke, 200), p = pos(v.p, 6), cpm = pos(v.cpm, 10), dbl = pick(v.act, 2) === 0;
  const A = (Math.PI * bore * bore) / 4, Ar = A - (Math.PI * rod * rod) / 4, Fext = p * 0.1 * A, Fret = p * 0.1 * Ar;
  const volCycle = ((A + (dbl ? Ar : 0)) * stroke) / 1e6, free = volCycle * ((p + 1.013) / 1.013) * cpm;
  return { Fext: s(Fext, 6), Fret: s(dbl ? Fret : 0, 6), air: s(free, 6), kw: s(((free / 60) * 0.11 * 1000) / 1000, 6), cost: s((free / 60) * 0.11 * 8 * 250, 6) };
};
export const ACTING = ["Double-acting", "Single-acting (spring return)"];
export const windTurbine: SciCalculator = (v) => {
  const D = pos(v.D, 3), V = pos(v.V, 8), rho = pos(v.rho, 1.225), Cp = Math.min(0.593, pos(v.cp, 0.4)), eta = pos(v.eff, 90) / 100, cf = pos(v.cf, 25) / 100, rpm = pos(v.rpm, 0);
  const A = (Math.PI * D * D) / 4, Pw = 0.5 * rho * A * V ** 3, P = Pw * Cp * eta;
  return { P: s(P, 6), wind: s(Pw, 6), annual: s((P * 8760 * cf) / 1000, 6), betz: s(0.593 * Pw, 6), tsr: rpm ? s(((rpm * TAU) / 60) * (D / 2) / V, 5) : "enter rpm" };
};
export const MIXER_TYPE = ["Helical element (Kenics-type)", "Corrugated plate (SMX/SMV-type)"];
export const staticMixer: SciCalculator = (v) => {
  const D = pos(v.D, 50) / 1000, Q = pos(v.Q, 100) / 60000, mu = pos(v.mu, 0.1), rho = pos(v.rho, 1000), n = Math.max(1, Math.round(pos(v.n, 12))), type = pick(v.type, 2);
  const A = (Math.PI * D * D) / 4, V = Q / A, Re = (rho * V * D) / mu, Lel = (type === 0 ? 1.5 : 1) * D * n;
  const f = Re < 2300 ? 64 / Re : 0.316 / Re ** 0.25, dpe = (f * (Lel / D) * rho * V * V) / 2, K = Re < 2300 ? (type === 0 ? 7 : 40) : type === 0 ? 150 : 500;
  return { Re: s(Re, 6), dp: s((K * dpe) / 1e5, 6), L: s(Lel, 6), V: s(V, 6), rec: Re < 10 ? "Laminar, creeping flow — 12–24 elements" : Re < 2300 ? "Laminar — 6–12 elements" : "Turbulent — 2–6 elements" };
};
export const bmep: SciCalculator = (v) => {
  const T = pos(v.T, 300), Vd = pos(v.vd, 2) / 1000, two = pick(v.stroke, 2) === 1, rpm = pos(v.rpm, 4000), mdot = pos(v.air, 0), rhoA = pos(v.rho, 1.184);
  const b = ((two ? 2 : 4) * Math.PI * T) / Vd;
  const ideal = (Vd * rpm) / (two ? 60 : 120);
  return { bar: s(b / 1e5, 6), psi: s((b / 1e5) * 14.5038, 6), kw: s((T * rpm * TAU) / 60 / 1000, 6), ve: mdot ? s((100 * (mdot / 1000)) / (ideal * rhoA), 5) : "enter air mass flow" };
};
export const STROKE = ["Four-stroke", "Two-stroke"];
const KEYS: [number, number, number, number, number][] = [[8, 2, 2, 1.2, 1.0], [10, 3, 3, 1.8, 1.4], [12, 4, 4, 2.5, 1.8], [17, 5, 5, 3.0, 2.3], [22, 6, 6, 3.5, 2.8], [30, 8, 7, 4.0, 3.3], [38, 10, 8, 5.0, 3.3], [44, 12, 8, 5.0, 3.3], [50, 14, 9, 5.5, 3.8], [58, 16, 10, 6.0, 4.3], [65, 18, 11, 7.0, 4.4], [75, 20, 12, 7.5, 4.9], [85, 22, 14, 9.0, 5.4], [95, 25, 14, 9.0, 5.4], [110, 28, 16, 10, 6.4], [130, 32, 18, 11, 7.4]];
export const keyway: SciCalculator = (v) => {
  const d = pos(v.d, 30), L = pos(v.L, 40), tauA = pos(v.tau, 60), pA = pos(v.p, 100);
  const k = KEYS.find((r) => d <= r[0]);
  if (!k || d < 6) throw new InputError("DIN 6885 table here covers shafts 6–130 mm.");
  const [, b, h, t1, t2] = k, Ts = (tauA * b * L * d) / 2 / 1000, Tb = (pA * (h - t1) * L * d) / 2 / 1000;
  return { key: `${b} × ${h} mm`, t1: s(t1, 4), t2: s(t2, 4), T: s(Math.min(Ts, Tb), 6), gov: Ts < Tb ? "Key shear governs" : "Bearing (crushing) on the hub governs" };
};

export const sciMachCustomCalculators: Record<string, SciCalculator> = {
  "torque-calculator": torque,
  "gas-spring-calculator": gasSpring,
  "spring-calculator": springRate,
  "welding-heat-input-calculator": weldHeat,
  "bolt-circle-calculator": boltCircle,
  "piston-ring-gap-calculator": pistonRing,
  "sine-bar-calculator": sineBar,
  "sheet-metal-bend-calculator": sheetBend,
  "gear-module-calculator": gearModule,
  "thread-calculator": thread,
  "gear-ratio-calculator": gearRatio,
  "lever-calculator": lever,
  "edge-crush-test-calculator": ectBox,
  "press-fit-calculator": pressFit,
  "vibration-calculator": vibration,
  "clamping-force-calculator": clampingForce,
  "hertzian-contact-stress-calculator": hertz,
  "spline-calculator": spline,
  "bmep-calculator": bmep,
  "hydraulic-power-calculator": hydraulic,
  "keyway-calculator": keyway,
  "planetary-gear-calculator": planetary,
  "worm-gear-calculator": wormGear,
  "pulley-calculator": pulley,
  "bearing-load-calculator": bearingFreq,
  "shaft-deflection-calculator": shaftCritical,
  "pneumatic-calculator": pneumatic,
  "wind-turbine-calculator": windTurbine,
  "static-mixer-calculator": staticMixer,
  "bolt-torque-calculator": boltTorque,
  "natural-frequency-calculator": naturalFrequency,
  "micrometer-calculator": micrometer,
};
