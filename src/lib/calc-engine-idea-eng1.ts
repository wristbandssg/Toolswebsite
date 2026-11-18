/**
 * Idea build, batch eng1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Astronomy & Space (13), Electrical & Electronics
 * (8), Mechanical & Structural (15), Scientific Graphing (1) = 37 tools.
 * Constants: 1 ly = 9.4607304725808e15 m, 1 pc = 3.0856775814913673e16 m, 1 AU = 149,597,870,700 m, c = 299,792,458 m/s,
 * GM⊕ = 3.986004418e14 m³/s², R⊕ = 6,371 km, G = 6.6743e-11; GMST = 280.46061837° + 360.98564736629°·(JD − 2451545) (IAU 1982,
 * Meeus); JD = Unix days + 2440587.5; simplified NPF rule t = (35N + 30p)/f; Roche limit 1.26 (rigid) / 2.44 (fluid) × R(ρM/ρm)^⅓;
 * Hill radius a(1 − e)(m/3M)^⅓; 1 refrigeration ton = 12,000 BTU/h = 3.51685 kW. Design checks: ASME VIII UG-27 thin shells,
 * ACI 318 singly-reinforced rectangular beam (Whitney block, β₁, φ 0.65–0.90), AISC 360 E3 flexural buckling (φc 0.90), AISC J3 bolt
 * shear (A325/F1852 Fnv 54 ksi threads included, 68 ksi excluded, φ 0.75), NDS bending/deflection with user-adjusted Fb′ and E′,
 * infinite-slope factor of safety. These are preliminary checks only — a licensed engineer must design real structures.
 */

import { type TrvCalculator as Calc, InputError, num, pick, dateIn, dayText } from "./trv-core";
import { txt, fmt } from "./sci-math-core";
import { create, all, type Unit } from "mathjs";

const f = (x: number) => fmt(Math.abs(x) < 1e-300 ? 0 : x, 5);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const LY = 9.4607304725808e15, PC = 3.0856775814913673e16, AU = 149597870700, C = 299792458, D = Math.PI / 180;
const today = () => Math.floor(Date.now() / 86400000);
const dur = (s: number) => (s < 120 ? `${f(s)} s` : s < 7200 ? `${f(s / 60)} min` : s < 172800 ? `${f(s / 3600)} h` : s < 3.15576e7 * 2 ? `${f(s / 86400)} days` : `${f(s / 3.15576e7)} years`);

// ---- Astronomy & space ----
const UNITS: [string, number][] = [["light-years", LY], ["parsecs", PC], ["AU", AU], ["km", 1000], ["miles", 1609.344]];
const distConv = (unit: number, name: string): Calc => (v) => {
  const x = P(v, "x", 1, "Distance"), [un, k] = UNITS[pick(v.u, 5)], m = x * k;
  return { r: `${f(x)} ${un} = ${f(m / unit)} ${name}`, o: `${f(m / 1000)} km · ${f(m / LY)} ly · ${f(m / PC)} pc · ${f(m / AU)} AU · ${f(m / 1609.344)} miles`, note: `Light takes ${dur(m / C)} to cross it` };
};
export const lightYear = distConv(LY, "light-years");
export const parsec = distConv(PC, "parsecs");
export const auDist = distConv(AU, "AU");
export const roche: Calc = (v) => {
  const R = P(v, "r", 6371, "Primary radius"), rM = P(v, "a", 5514, "Primary density"), rm = P(v, "b", 3344, "Satellite density"), k = Math.cbrt(rM / rm);
  return { f: `Fluid Roche limit ≈ ${f(2.44 * R * k)} km`, r: `Rigid body ≈ ${f(1.26 * R * k)} km (${f(1.26 * k)}–${f(2.44 * k)} primary radii)`, note: "Inside this distance tides pull a satellite apart — why planetary rings sit close to their planets · defaults: Earth and the Moon (Moon orbits at ~384,400 km)" };
};
export const hill: Calc = (v) => {
  const a = P(v, "a", 1, "Orbit (AU)") * AU, e = Math.min(0.99, Z(v, "e", 0.0167)), m = P(v, "m", 5.972e24, "Body mass"), M = P(v, "s", 1.989e30, "Central mass");
  const r = a * (1 - e) * Math.cbrt(m / (3 * M));
  return { h: `Hill sphere radius ≈ ${f(r / 1000)} km (${f(r / AU)} AU)`, s: `Stable moons orbit within about ⅓–½ of it: ≈ ${f(r / 3000)}–${f(r / 2000)} km`, note: "r ≈ a(1 − e)(m/3M)^⅓ · Earth's is about 1.5 million km — the Moon (384,400 km) is well inside" };
};
export const appMag: Calc = (v) => {
  const m1 = num(v.a, 1.0), m2 = num(v.b, 3.5), ratio = 10 ** (0.4 * (m2 - m1)), comb = -2.5 * Math.log10(10 ** (-0.4 * m1) + 10 ** (-0.4 * m2));
  return { r: `Object 1 is ${f(ratio)}× ${ratio >= 1 ? "brighter" : "fainter"} than object 2`, c: `Combined magnitude of both ≈ ${f(comb)}`, note: "Each magnitude step = 2.512× in brightness; 5 magnitudes = 100× · lower numbers are brighter (Sirius −1.46, naked-eye limit ~6)" };
};
export const absMag: Calc = (v) => {
  const m = num(v.m, 0.03), d = P(v, "d", 7.68, "Distance"), u = pick(v.u, 2), pc = u === 0 ? d : d / 3.26156, A = Z(v, "x", 0), M = m - 5 * Math.log10(pc / 10) - A;
  return { a: `Absolute magnitude M = ${f(M)}`, l: `Luminosity ≈ ${f(10 ** (0.4 * (4.83 - M)))} × the Sun (V band)`, note: `M = m − 5 log₁₀(d/10 pc)${A ? " − extinction" : ""} · distance ${f(pc)} pc · defaults: Vega (m 0.03, 7.68 pc) · the Sun's M is 4.83` };
};
export const distMod: Calc = (v) => {
  const m = num(v.m, 10.5), M = num(v.a, 4.83), A = Z(v, "x", 0), mu = m - M - A, pc = 10 ** ((mu + 5) / 5);
  return { d: `Distance ≈ ${f(pc)} pc (${f(pc * 3.26156)} light-years)`, m: `Distance modulus μ = m − M = ${f(m - M)}${A ? ` (${f(mu)} after extinction)` : ""}`, note: "d = 10^((m − M + 5)/5) parsecs · standard candles: Cepheids, RR Lyrae, Type Ia supernovae (M ≈ −19.3)" };
};
export const hubble: Calc = (v) => {
  const z = Z(v, "z", 0.05), vel = Z(v, "v", 0), H0 = P(v, "h", 70, "Hubble constant"), vv = vel || C / 1000 * z, d = vv / H0;
  return { d: `Distance ≈ ${f(d)} Mpc (${f(d * 3.26156)} million light-years)`, v: `Recession velocity ${f(vv)} km/s${z ? ` (z = ${f(z)}, v ≈ cz)` : ""}`, note: `d = v/H₀ with H₀ = ${f(H0)} km/s/Mpc (Planck ≈ 67.4, SH0ES ≈ 73) · good for z < ~0.1; larger redshifts need a cosmological model` };
};
export const npf: Calc = (v) => {
  const N = P(v, "n", 2.8, "Aperture"), p = P(v, "p", 4.3, "Pixel pitch"), fl = P(v, "f", 20, "Focal length"), crop = P(v, "c", 1, "Crop factor"), dec = Math.min(89, Math.abs(num(v.d, 0)));
  const t = (35 * N + 30 * p) / fl / Math.cos(dec * D), r500 = 500 / (fl * crop);
  return { t: `NPF rule: up to ${f(t)} s without star trails`, r: `500 rule: ${f(r500)} s (300 rule for high-res sensors: ${f(300 / (fl * crop))} s)`, note: `Simplified NPF (35N + 30p)/f${dec ? ` ÷ cos(declination ${f(dec)}°)` : ""} · pixel pitch ≈ sensor width (mm) ÷ pixels across × 1000 µm` };
};
const jdOf = (day: number, hrs: number) => day + 2440587.5 + hrs / 24;
export const sidereal: Calc = (v) => {
  const d = dateIn(v, "d", today()), h = num(v.h, 21), lon = num(v.l, -0.1278), jd = jdOf(d, h), g = ((280.46061837 + 360.98564736629 * (jd - 2451545)) % 360 + 360) % 360, l = ((g + lon) % 360 + 360) % 360;
  const hms = (deg: number) => { const t = deg / 15, hh = Math.floor(t), mm = Math.floor((t - hh) * 60), ss = ((t - hh) * 60 - mm) * 60; return `${hh}h ${String(mm).padStart(2, "0")}m ${ss.toFixed(1)}s`; };
  return { l: `Local sidereal time ${hms(l)}`, g: `Greenwich mean sidereal time ${hms(g)} at ${f(h)}:00 UT on ${dayText(d)}`, note: `Stars with right ascension ≈ ${hms(l)} are on your meridian now · longitude ${f(lon)}° (east +)` };
};
export const julian: Calc = (v) => {
  const d = dateIn(v, "d", today()), h = num(v.h, 12), jd = jdOf(d, h);
  return { j: `Julian Date ${jd.toFixed(5)}`, m: `Modified JD ${(jd - 2400000.5).toFixed(5)} · J2000 day ${f(jd - 2451545)}`, note: `${dayText(d)} at ${f(h)}:00 UT · JD starts at noon UT; JD 2451545.0 = 1 Jan 2000 12:00 TT` };
};
export const orbitSpeed: Calc = (v) => {
  const h = P(v, "h", 420, "Altitude") * 1000, R = 6371000, r = R + h, vv = Math.sqrt(3.986004418e14 / r), T = (2 * Math.PI * r) / vv;
  return { v: `Orbital speed ≈ ${f(vv / 1000)} km/s (${f(vv * 3.6)} km/h, ${f(vv * 2.23694)} mph)`, p: `Period ${f(T / 60)} min → ${f(86400 / T)} orbits a day`, note: "Circular orbit v = √(GM/r) · the ISS (~420 km) circles Earth about every 93 minutes" };
};
// ---- Electrical & electronics ----
export const rlTau: Calc = (v) => {
  const L = P(v, "l", 0.1, "Inductance"), R = P(v, "r", 100, "Resistance"), V = Z(v, "v", 12), t = Z(v, "t", 0.001), tau = L / R, I = (V / R) * (1 - Math.exp(-t / tau));
  return { t: `τ = L/R = ${f(tau * 1000)} ms`, i: `At t = ${f(t * 1000)} ms the current is ${f(I * 1000)} mA (${f((I / (V / R || 1)) * 100)}% of the ${f((V / R) * 1000)} mA final)`, note: `Reaches 63% at 1τ, 99% at 5τ (${f(5 * tau * 1000)} ms) · I = (V/R)(1 − e^(−t/τ))` };
};
export const mosfet: Calc = (v) => {
  const I = Z(v, "i", 10), Rds = P(v, "r", 0.01, "Rds(on)"), k = P(v, "k", 1.5, "Hot Rds factor"), V = Z(v, "v", 24), tr = Z(v, "t", 50) * 1e-9, fs = Z(v, "f", 100000), duty = Math.min(1, Z(v, "d", 100) / 100), Rth = Z(v, "j", 40), Ta = num(v.a, 25);
  const pc = I * I * Rds * k * duty, ps = 0.5 * V * I * tr * 2 * fs, Pt = pc + ps, Tj = Ta + Pt * Rth;
  return { p: `Total dissipation ≈ ${f(Pt)} W`, b: `Conduction ${f(pc)} W · switching ${f(ps)} W`, note: Rth ? `Junction ≈ ${f(Tj)} °C with RθJA ${f(Rth)} °C/W at ${f(Ta)} °C ambient${Tj > 150 ? " — too hot, add a heatsink" : ""}` : "Add RθJA for junction temperature" };
};
export const zener: Calc = (v) => {
  const vmin = P(v, "a", 11, "Min input"), vmax = P(v, "b", 14, "Max input"), vz = P(v, "z", 5.1, "Zener voltage"), il = Z(v, "l", 20) / 1000, iz = P(v, "i", 5, "Min zener current") / 1000;
  if (vmin <= vz) throw new InputError("The input must stay above the zener voltage.");
  const R = (vmin - vz) / (il + iz), izMax = (vmax - vz) / R, Pz = izMax * vz, Pr = ((vmax - vz) ** 2) / R;
  return { r: `Series resistor ≈ ${f(R)} Ω (use the next lower standard value)`, p: `Zener worst-case (no load) ${f(Pz * 1000)} mW · resistor ${f(Pr * 1000)} mW`, note: "R = (Vin,min − Vz)/(I_load,max + I_z,min) · choose parts rated about 2× the worst-case power" };
};
export const cRate: Calc = (v) => {
  const cap = P(v, "c", 3000, "Capacity"), rate = P(v, "r", 1, "C-rate"), V = Z(v, "v", 3.7), I = (cap / 1000) * rate;
  return { i: `${f(rate)}C = ${f(I)} A (${f(I * 1000)} mA)`, t: `Full charge/discharge in about ${f(60 / rate)} minutes · power ≈ ${f(I * V)} W`, note: "C-rate = current ÷ capacity · most Li-ion cells charge at 0.5–1C; high-drain cells discharge at 10C+ — check the datasheet" };
};
export const solarCell: Calc = (v) => {
  const voc = P(v, "v", 0.68, "Voc"), isc = P(v, "i", 9.5, "Isc"), ff = Z(v, "f", 0.8), A = P(v, "a", 0.0244, "Cell area"), G = P(v, "g", 1000, "Irradiance"), pm = Z(v, "p", 0);
  const Pmax = pm || voc * isc * ff, eta = Pmax / (G * A);
  return { e: `Efficiency = ${f(eta * 100)}%`, p: `Pmax = ${f(Pmax)} W from ${f(G * A)} W of sunlight`, note: "η = Pmax ÷ (irradiance × area) · Pmax = Voc × Isc × FF · standard test conditions: 1,000 W/m², 25 °C · good silicon cells reach 22–26%" };
};
export const kirchhoff: Calc = (v) => {
  const V1 = num(v.a, 12), R1 = P(v, "r", 100, "R1"), R2 = P(v, "s", 220, "R2"), R3 = P(v, "t", 150, "R3"), V2 = num(v.b, 5);
  const Vn = (V1 / R1 + V2 / R3) / (1 / R1 + 1 / R2 + 1 / R3), I1 = (V1 - Vn) / R1, I3 = (V2 - Vn) / R3, I2 = Vn / R2;
  return { v: `Middle node voltage = ${f(Vn)} V`, i: `I₁ = ${f(I1 * 1000)} mA (from V₁) · I₃ = ${f(I3 * 1000)} mA (from V₂) · I₂ = ${f(I2 * 1000)} mA through R₂`, note: `KCL check: I₁ + I₃ = ${f((I1 + I3) * 1000)} mA = I₂ · circuit: V₁–R₁ and V₂–R₃ both feed a node that goes to ground through R₂ · negative current flows backwards` };
};
export const thevenin: Calc = (v) => {
  const V = num(v.v, 12), R1 = P(v, "a", 1000, "R1"), R2 = P(v, "b", 2000, "R2"), R3 = Z(v, "c", 0), RL = Z(v, "l", 1000);
  const Vth = (V * R2) / (R1 + R2), Rth = (R1 * R2) / (R1 + R2) + R3, IL = RL ? Vth / (Rth + RL) : 0;
  return { t: `V_th = ${f(Vth)} V · R_th = ${f(Rth)} Ω`, n: `Norton: I_N = ${f((Vth / Rth) * 1000)} mA in parallel with ${f(Rth)} Ω`, note: RL ? `With a ${f(RL)} Ω load: ${f(IL * 1000)} mA, ${f(IL * RL)} V, ${f(IL * IL * RL * 1000)} mW (max power at R_L = R_th)` : "Source V → R1 → output, R2 across the output, R3 in series with the output" };
};
export const deltaWye: Calc = (v) => {
  const m = pick(v.m, 2), [a, b, c] = ["a", "b", "c"].map((k, i) => P(v, k, [30, 60, 90][i], "Resistor"));
  if (m === 0) { const s = a + b + c; return { r: `R1 = ${f((a * c) / s)} Ω · R2 = ${f((a * b) / s)} Ω · R3 = ${f((b * c) / s)} Ω`, h: `From Δ: Rab ${f(a)}, Rbc ${f(b)}, Rca ${f(c)} Ω`, note: "Y arm at node A = Rab·Rca/ΣΔ, node B = Rab·Rbc/ΣΔ, node C = Rbc·Rca/ΣΔ · equal Δ resistors give Y = Δ/3" }; }
  const s = a * b + b * c + c * a;
  return { r: `Rab = ${f(s / c)} Ω · Rbc = ${f(s / a)} Ω · Rca = ${f(s / b)} Ω`, h: `From Y arms: A ${f(a)}, B ${f(b)}, C ${f(c)} Ω`, note: "Δ resistor = (sum of products of Y pairs) ÷ opposite Y arm · equal Y arms give Δ = 3Y" };
};
// ---- Mechanical & structural ----
export const poisson: Calc = (v) => {
  const ea = num(v.a, 0.001), el = num(v.l, -0.0003), E = Z(v, "e", 200);
  if (!ea) throw new InputError("Axial strain can't be 0.");
  const nu = -el / ea;
  return { p: `Poisson's ratio ν = ${f(nu)}`, g: E ? `Shear modulus G = ${f(E / (2 * (1 + nu)))} GPa · bulk modulus K = ${nu < 0.5 ? f(E / (3 * (1 - 2 * nu))) : "∞"} GPa` : "Add Young's modulus for G and K", note: "ν = −ε_lateral/ε_axial · steel ≈ 0.30, aluminium 0.33, rubber ≈ 0.5, cork ≈ 0" };
};
export const thermStress: Calc = (v) => {
  const E = P(v, "e", 200, "E") * 1e9, a = P(v, "a", 12, "α") * 1e-6, dT = num(v.t, 50), r = Math.min(1, Z(v, "r", 100) / 100), A = Z(v, "x", 0);
  const s = E * a * dT * r;
  return { s: `Thermal stress = ${f(s / 1e6)} MPa (${f(s / 6894757)} ksi) ${dT >= 0 ? "compressive (heated, restrained)" : "tensile (cooled, restrained)"}`, f: A ? `Force on ${f(A)} mm² section: ${f((s * A) / 1e6 / 1000)} kN` : `Free expansion would be ${f(a * dT * 1e6)} µm/m`, note: `σ = E·α·ΔT × ${f(r * 100)}% restraint · steel α ≈ 12, aluminium 23, concrete 10 µm/m·°C` };
};
export const vessel: Calc = (v) => {
  const Pp = P(v, "p", 1.5, "Pressure"), Di = P(v, "d", 1000, "Inside diameter"), S = P(v, "s", 138, "Allowable stress"), Ej = Math.min(1, P(v, "e", 0.85, "Joint efficiency")), ca = Z(v, "c", 3), sph = pick(v.t, 2) === 1, R = Di / 2;
  const t = sph ? (Pp * R) / (2 * S * Ej - 0.2 * Pp) : (Pp * R) / (S * Ej - 0.6 * Pp);
  if (t <= 0) throw new InputError("Pressure is too high for this stress — thin-wall formula doesn't apply.");
  return { t: `Minimum wall ≈ ${f(t + ca)} mm (${f(t)} mm + ${f(ca)} mm corrosion allowance)`, s: `Hoop stress at that wall ≈ ${f((Pp * R) / t / (sph ? 2 : 1))} MPa`, note: `ASME VIII Div. 1 UG-27 ${sph ? "sphere t = PR/(2SE − 0.2P)" : "cylinder t = PR/(SE − 0.6P)"} · default S = 138 MPa (≈ SA-516-70 at ambient) · preliminary only` };
};
export const shaftD: Calc = (v) => {
  const m = pick(v.m, 2), tau = P(v, "s", 40, "Allowable shear"), sf = P(v, "k", 1, "Service factor");
  const T = (m === 0 ? P(v, "t", 500, "Torque") : (P(v, "p", 15, "Power") * 1000) / ((2 * Math.PI * P(v, "n", 1450, "Speed")) / 60)) * sf, d = Math.cbrt((16 * T) / (Math.PI * tau * 1e6)) * 1000;
  return { d: `Minimum solid shaft diameter ≈ ${f(d)} mm`, t: `Design torque ${f(T)} N·m · allowable shear ${f(tau)} MPa`, note: "d = ∛(16T/πτ) — torsion only; add bending, keyways (×1.1–1.25) and fatigue for a real design" };
};
export const leafSpring: Calc = (v) => {
  const W = P(v, "w", 5000, "Load"), L = P(v, "l", 1000, "Span"), n = P(v, "n", 6, "Leaves"), b = P(v, "b", 60, "Width"), t = P(v, "t", 8, "Thickness"), E = P(v, "e", 207, "E") * 1000;
  const s = (3 * W * L) / (2 * n * b * t * t), dl = (3 * W * L ** 3) / (8 * E * n * b * t ** 3);
  return { s: `Bending stress ≈ ${f(s)} MPa`, d: `Deflection ≈ ${f(dl)} mm · rate ${f(W / dl)} N/mm`, note: "Semi-elliptic, centre load: σ = 3WL/(2nbt²), δ = 3WL³/(8Enbt³) · spring steel allowable ≈ 500–700 MPa" };
};
export const blockTackle: Calc = (v) => {
  const W = P(v, "w", 200, "Load"), n = Math.max(1, Math.round(num(v.n, 4))), eff = Math.min(1, P(v, "e", 90, "Sheave efficiency") / 100), lift = Z(v, "l", 2);
  const sheaves = n, effSys = (1 - eff ** n) / (n * (1 - eff) || 1), effort = W / (n * (eff === 1 ? 1 : effSys));
  return { e: `Pull needed ≈ ${f(effort)} kg-force (${f(effort * 9.80665)} N)`, m: `Ideal MA ${n} · actual MA ${f(W / effort)} · ${f(lift * n)} m of rope to lift ${f(lift)} m`, note: `${n} supporting rope segments, ${sheaves} sheaves at ${f(eff * 100)}% each · ideal effort ${f(W / n)} kg` };
};
export const venturi: Calc = (v) => {
  const D1 = P(v, "a", 100, "Inlet diameter") / 1000, D2 = P(v, "b", 50, "Throat diameter") / 1000, dp = P(v, "p", 20, "Pressure difference") * 1000, rho = P(v, "r", 1000, "Density"), Cd = Math.min(1, P(v, "c", 0.98, "Cd"));
  if (D2 >= D1) throw new InputError("The throat must be smaller than the inlet.");
  const beta = D2 / D1, A2 = (Math.PI * D2 * D2) / 4, Q = Cd * A2 * Math.sqrt((2 * dp) / (rho * (1 - beta ** 4)));
  return { q: `Flow ≈ ${f(Q * 1000)} L/s (${f(Q * 3600)} m³/h, ${f(Q * 15850.3)} US gpm)`, v: `Throat velocity ${f(Q / A2)} m/s · β = ${f(beta)}`, note: "Q = Cd·A₂·√(2Δp/(ρ(1 − β⁴))) · machined venturis Cd ≈ 0.98; orifice plates ≈ 0.61" };
};
export const refTons: Calc = (v) => {
  const m = pick(v.m, 3), x = P(v, "x", 5, "Value"), gpm = Z(v, "g", 0), dT = Z(v, "t", 10);
  const kw = m === 0 ? x * 3.51685 : m === 1 ? x : x / 3412.14, btu = kw * 3412.14, tons = btu / 12000;
  return { t: `${f(tons)} refrigeration tons`, o: `${f(kw)} kW · ${f(btu)} BTU/h`, note: gpm && dT ? `Chilled water ${f(gpm)} gpm × ${f(dT)} °F ΔT = ${f((gpm * dT) / 24)} tons` : "1 ton = 12,000 BTU/h = 3.517 kW (heat to melt a ton of ice in 24 h) · add chilled water gpm and ΔT to size from flow" };
};
export const rcBeam: Calc = (v) => {
  const b = P(v, "b", 12, "Width"), d = P(v, "d", 20, "Effective depth"), As = P(v, "a", 3, "Steel area"), fy = P(v, "y", 60000, "fy"), fc = P(v, "c", 4000, "f′c"), Mu = Z(v, "m", 0);
  const a = (As * fy) / (0.85 * fc * b), b1 = Math.max(0.65, Math.min(0.85, 0.85 - (0.05 * (fc - 4000)) / 1000)), c = a / b1, et = (0.003 * (d - c)) / c, phi = et >= 0.005 ? 0.9 : et <= 0.002 ? 0.65 : 0.65 + ((et - 0.002) * 0.25) / 0.003;
  const Mn = (As * fy * (d - a / 2)) / 12000, phiMn = phi * Mn, rhoMin = Math.max((3 * Math.sqrt(fc)) / fy, 200 / fy) * b * d;
  return { m: `φMn ≈ ${f(phiMn)} kip-ft (Mn ${f(Mn)}, φ ${f(phi)})`, c: `a = ${f(a)} in · c = ${f(c)} in · εt = ${f(et)} (${et >= 0.005 ? "tension-controlled" : et >= 0.002 ? "transition" : "compression-controlled"})${As < rhoMin ? ` · below As,min ${f(rhoMin)} in²` : ""}`, note: Mu ? (phiMn >= Mu ? `OK for Mu = ${f(Mu)} kip-ft (${f((Mu / phiMn) * 100)}% used)` : `Not enough for Mu = ${f(Mu)} kip-ft`) : "ACI 318 singly reinforced rectangular section, US units · preliminary check only" };
};
export const steelCol: Calc = (v) => {
  const Ag = P(v, "a", 9.13, "Area"), r = P(v, "r", 2.02, "Radius of gyration"), KL = P(v, "l", 12, "Effective length") * 12, Fy = P(v, "y", 50, "Fy"), E = 29000, Pu = Z(v, "p", 0);
  const sl = KL / r, Fe = (Math.PI ** 2 * E) / sl ** 2, Fcr = sl <= 4.71 * Math.sqrt(E / Fy) ? 0.658 ** (Fy / Fe) * Fy : 0.877 * Fe, phiPn = 0.9 * Fcr * Ag;
  return { p: `φPn ≈ ${f(phiPn)} kips`, s: `KL/r = ${f(sl)}${sl > 200 ? " (over the 200 limit)" : ""} · Fe = ${f(Fe)} ksi · Fcr = ${f(Fcr)} ksi`, note: Pu ? (phiPn >= Pu ? `OK for Pu = ${f(Pu)} kips (${f((Pu / phiPn) * 100)}% used)` : `Overloaded for Pu = ${f(Pu)} kips`) : "AISC 360 E3 flexural buckling (no local buckling) · defaults: W8×31 about its weak axis, A992" };
};
export const timber: Calc = (v) => {
  const w = P(v, "w", 40, "Load"), L = P(v, "l", 12, "Span") , b = P(v, "b", 1.5, "Width"), d = P(v, "d", 9.25, "Depth"), sp = P(v, "s", 16, "Spacing"), Fb = P(v, "f", 900, "Fb′"), E = P(v, "e", 1600000, "E′"), lim = P(v, "x", 360, "Deflection limit");
  const wl = (w * sp) / 12, M = (wl * L * L) / 8 * 12, S = (b * d * d) / 6, I = (b * d ** 3) / 12, fb = M / S, dl = (5 * (wl / 12) * (L * 12) ** 4) / (384 * E * I), dAll = (L * 12) / lim;
  return { b: `Bending ${f(fb)} psi vs ${f(Fb)} allowable — ${fb <= Fb ? `OK (${f((fb / Fb) * 100)}%)` : "too small"}`, d: `Deflection ${f(dl)} in vs L/${f(lim)} = ${f(dAll)} in — ${dl <= dAll ? "OK" : "too springy"}`, note: `${f(b)}×${f(d)} in at ${f(sp)} in centres, ${f(w)} psf over ${f(L)} ft · default Fb′ 900 psi, E′ 1.6 million psi (Douglas fir-larch No. 2 base values — apply NDS adjustment factors) · preliminary only` };
};
export const boltShear: Calc = (v) => {
  const dia = P(v, "d", 0.75, "Diameter"), n = Math.max(1, Math.round(num(v.n, 4))), planes = Math.max(1, Math.round(num(v.p, 1))), thr = pick(v.t, 2), Pu = Z(v, "u", 0), Fnv = Z(v, "f", 0) || (thr === 0 ? 54 : 68);
  const Ab = (Math.PI * dia * dia) / 4, one = 0.75 * Fnv * Ab * planes, tot = one * n;
  return { c: `φRn = ${f(tot)} kips for ${n} bolts (${f(one)} kips each)`, d: `Ab = ${f(Ab)} in² · Fnv = ${f(Fnv)} ksi · ${planes} shear plane${planes > 1 ? "s" : ""}`, note: Pu ? (tot >= Pu ? `OK for ${f(Pu)} kips` : `Not enough for ${f(Pu)} kips`) : "AISC J3: A325/F3125 Grade A325 Fnv = 54 ksi (threads in the shear plane) or 68 ksi (excluded), φ = 0.75 · also check bearing and tear-out" };
};
export const soilBearing: Calc = (v) => {
  const Pk = P(v, "p", 300, "Column load"), B = P(v, "b", 2, "Width"), L = P(v, "l", 2, "Length"), e = Z(v, "e", 0), qa = Z(v, "q", 150), selfW = Z(v, "w", 0);
  const N = Pk + selfW, A = B * L, q = N / A, qmax = q * (1 + (6 * e) / B), qmin = q * (1 - (6 * e) / B);
  return { q: `Bearing pressure = ${f(q)} kPa${e ? ` (max ${f(qmax)}, min ${f(qmin)})` : ""}`, c: qa ? `${(e ? qmax : q) <= qa ? "OK" : "Exceeds"} the ${f(qa)} kPa allowable (${f(((e ? qmax : q) / qa) * 100)}%)` : "Enter the allowable bearing capacity to check", note: e > B / 6 ? "Eccentricity is outside the middle third — part of the footing lifts off" : `q = N/A (1 ± 6e/B) · typical allowable: soft clay 75, stiff clay 150, dense sand 300 kPa — get a geotechnical report` };
};
export const slope: Calc = (v) => {
  const beta = num(v.b, 30) * D, z = P(v, "z", 3, "Depth"), c = Z(v, "c", 5), phi = num(v.f, 32) * D, g = P(v, "g", 19, "Unit weight"), m = Math.min(1, Z(v, "m", 0) / 100);
  if (beta <= 0 || beta >= Math.PI / 2) throw new InputError("Slope angle must be between 0 and 90°.");
  const FS = c / (g * z * Math.sin(beta) * Math.cos(beta)) + ((1 - (m * 9.81) / g) * Math.tan(phi)) / Math.tan(beta);
  return { s: `Factor of safety ≈ ${f(FS)}`, r: FS >= 1.5 ? "Generally stable (FS ≥ 1.5)" : FS >= 1 ? "Marginal (1.0–1.5)" : "Likely to fail (FS < 1)", note: `Infinite-slope model, slip ${f(z)} m deep, water table ${f(m * 100)}% of that depth · c′ ${f(c)} kPa, φ′ ${f(phi / D)}°, γ ${f(g)} kN/m³ · not a substitute for a geotechnical analysis` };
};
export const sling: Calc = (v) => {
  const W = P(v, "w", 2000, "Load"), n = Math.max(1, Math.round(num(v.n, 2))), a = num(v.a, 60), legs = Math.min(n, 3);
  if (a <= 0 || a > 90) throw new InputError("Sling angle from horizontal must be 1–90°.");
  const T = W / legs / Math.sin(a * D);
  return { t: `Tension per leg ≈ ${f(T)} (same units as the load)`, f: `Angle factor ${f(1 / Math.sin(a * D))} · ${legs} leg${legs > 1 ? "s" : ""} assumed to share the load`, note: `${a < 30 ? "Below 30° — not allowed by most rigging standards" : a < 45 ? "Low angle — tension rises fast" : "OK angle"} · for 4-leg slings assume only 3 (often 2) legs carry the load` };
};
// ---- Graphing / unit-aware ----
const M = create(all, {});
const safeEval = M.evaluate.bind(M);
M.import({ import: () => { throw new Error("disabled"); }, createUnit: () => { throw new Error("disabled"); }, evaluate: () => { throw new Error("disabled"); }, parse: () => { throw new Error("disabled"); }, simplify: () => { throw new Error("disabled"); }, derivative: () => { throw new Error("disabled"); } }, { override: true });
export const unitCalc: Calc = (v) => {
  const ex = (txt(v, "e") || "60 mi/h * 2.5 h").slice(0, 300), to = (txt(v, "t") || "km").trim();
  let r: unknown;
  try { r = safeEval(ex); } catch (e) { throw new InputError(`Couldn't evaluate: ${(e as Error).message}`); }
  if (typeof r === "number") return { r: `= ${f(r)}`, c: "Dimensionless result", note: "Add units like m, kg, s, N, J, W, mi, ft, lb, gal, degC" };
  if (!M.isUnit(r)) throw new InputError("That didn't give a number or a quantity with units.");
  const u = r as Unit;
  let conv = "";
  if (to) { try { conv = M.format(u.to(to), { precision: 8 }); } catch { throw new InputError(`Can't convert the result to "${to}" — the units don't match.`); } }
  return { r: `= ${conv || M.format(u, { precision: 8 })}`, c: `SI: ${M.format(u.toSI(), { precision: 8 })}`, note: `Units are tracked through every step (mathjs) · ${ex}` };
};

// ---- registry (generated)
export const ideaEng1CustomCalculators: Record<string, Calc> = {
  "roche-limit-calculator": roche,
  "hill-sphere-calculator": hill,
  "apparent-magnitude-calculator": appMag,
  "absolute-magnitude-calculator": absMag,
  "distance-modulus-calculator": distMod,
  "hubble-law-distance-calculator": hubble,
  "astrophotography-exposure-npf-calculator": npf,
  "sidereal-time-calculator": sidereal,
  "julian-date-calculator": julian,
  "space-station-speed-calculator": orbitSpeed,
  "rl-time-constant-calculator": rlTau,
  "mosfet-power-dissipation-calculator": mosfet,
  "zener-diode-resistor-calculator": zener,
  "battery-c-rate-calculator": cRate,
  "solar-cell-efficiency-calculator": solarCell,
  "kirchhoffs-law-calculator": kirchhoff,
  "thevenin-equivalent-calculator": thevenin,
  "delta-wye-conversion-calculator": deltaWye,
  "poissons-ratio-calculator": poisson,
  "thermal-stress-calculator": thermStress,
  "pressure-vessel-wall-thickness-calculator": vessel,
  "shaft-diameter-torque-calculator": shaftD,
  "leaf-spring-calculator": leafSpring,
  "pulley-system-mechanical-advantage-calculator": blockTackle,
  "venturi-flow-calculator": venturi,
  "refrigeration-tons-calculator": refTons,
  "concrete-beam-design-calculator": rcBeam,
  "steel-column-capacity-calculator": steelCol,
  "timber-beam-size-calculator": timber,
  "bolt-shear-strength-calculator": boltShear,
  "bearing-pressure-soil-calculator": soilBearing,
  "slope-stability-factor-calculator": slope,
  "lifting-sling-angle-calculator": sling,
  "unit-aware-calculator-calculator": unitCalc,
  "light-year-converter-calculator": lightYear,
  "parsec-converter-calculator": parsec,
  "au-distance-calculator": auDist,
};
