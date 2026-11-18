/**
 * Idea build, batch phys1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Physics = 42 tools.
 * SI constants (CODATA 2018 exact/recommended): h = 6.62607015e-34 J·s, c = 299,792,458 m/s, e = 1.602176634e-19 C,
 * mₑ = 9.1093837015e-31 kg, k_B = 1.380649e-23 J/K, σ = 5.670374419e-8 W/m²K⁴, Wien b = 2.897771955e-3 m·K, μ₀ = 1.25663706212e-6 N/A²,
 * g = 9.80665 m/s², 1 u = 931.49410242 MeV/c², m(¹H atom) = 1.00782503207 u, mₙ = 1.00866491595 u, Bohr radius 5.29177210903e-11 m,
 * Rydberg energy 13.605693 eV, Compton wavelength of the electron 2.42631023867e-12 m, ħ = h/2π.
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";
import { txt, fmt, compileFn, numDeriv } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-300 ? 0 : x, 5);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const h = 6.62607015e-34, c = 299792458, e = 1.602176634e-19, me = 9.1093837015e-31, kB = 1.380649e-23, sig = 5.670374419e-8, mu0 = 1.25663706212e-6, g0 = 9.80665, D = Math.PI / 180, hbar = h / (2 * Math.PI);

// ---- Mechanics ----
export const incline: Calc = (v) => {
  const m = P(v, "m", 10, "Mass"), a = num(v.a, 30) * D, mu = Z(v, "u", 0.2), g = P(v, "g", g0, "g");
  const W = m * g, N = W * Math.cos(a), par = W * Math.sin(a), fr = mu * N, net = par - fr, acc = net > 0 ? net / m : 0;
  return { a: net > 0 ? `Slides down at ${f(acc)} m/s²` : `Stays put — friction (up to ${f(fr)} N) holds it`, f: `Weight ${f(W)} N · normal ${f(N)} N · down-slope ${f(par)} N · friction ${f(fr)} N`, note: `Push needed to move it up at constant speed: ${f(par + fr)} N · it starts sliding on its own above ${f(Math.atan(mu) / D)}°` };
};
export const ropeTension: Calc = (v) => {
  const m = P(v, "m", 20, "Mass"), a = num(v.a, 0), t = pick(v.t, 3), th = num(v.th, 30) * D, g = g0;
  if (t === 0) { const T = m * (g + a); return { t: `Tension = ${f(T)} N`, how: `T = m(g + a) = ${f(m)} × (${f(g)} + ${f(a)})`, note: a > 0 ? "Accelerating up increases tension" : a < 0 ? "Accelerating down reduces tension" : "At rest or constant speed T = mg" }; }
  if (t === 1) { const T = (m * g) / (2 * Math.sin(th)); return { t: `Tension in each rope = ${f(T)} N`, how: `Two ropes at ${f(th / D)}° above horizontal: T = mg ÷ (2 sin θ)`, note: "Shallower angles need much more tension — at 5° it's about 5.7× the weight" }; }
  const m2 = P(v, "m2", 15, "Second mass"), acc = (m * g) / (m + m2), T = m2 * acc;
  return { t: `Tension = ${f(T)} N`, how: `Hanging mass ${f(m)} kg pulls table mass ${f(m2)} kg (frictionless): a = ${f(acc)} m/s²`, note: "T = m₁m₂g ÷ (m₁ + m₂)" };
};
export const springPE: Calc = (v) => {
  const k = P(v, "k", 200, "Spring constant"), x = num(v.x, 0.15), m = Z(v, "m", 0.5), U = 0.5 * k * x * x;
  return { u: `Elastic potential energy = ${f(U)} J`, f: `Force at that stretch ${f(k * Math.abs(x))} N`, note: m > 0 ? `Released, a ${f(m)} kg mass would leave at ${f(Math.sqrt((2 * U) / m))} m/s (no losses)` : "U = ½kx²" };
};
export const shm: Calc = (v) => {
  const A = P(v, "a", 0.1, "Amplitude"), m = P(v, "m", 0.5, "Mass"), k = P(v, "k", 50, "Spring constant"), t = Z(v, "t", 0.3), w = Math.sqrt(k / m);
  const x = A * Math.cos(w * t), vel = -A * w * Math.sin(w * t), acc = -w * w * x;
  return { p: `Period ${f((2 * Math.PI) / w)} s · frequency ${f(w / (2 * Math.PI))} Hz · ω = ${f(w)} rad/s`, s: `At t = ${f(t)} s: x = ${f(x)} m, v = ${f(vel)} m/s, a = ${f(acc)} m/s²`, note: `Max speed ${f(A * w)} m/s · max acceleration ${f(A * w * w)} m/s² · energy ${f(0.5 * k * A * A)} J (x = A cos ωt)` };
};
export const hooke: Calc = (v) => {
  const s = pick(v.s, 3), F = num(v.f, 50), x = num(v.x, 0.1), k = num(v.k, 500);
  if (s === 0) { if (!x) throw new InputError("Extension can't be 0."); return { r: `k = ${f(F / x)} N/m`, w: `= ${f(F / x / 1000)} N/mm · ${f((F / x) * 0.0057101)} lbf/in`, note: "Hooke's law F = kx holds up to the elastic limit" }; }
  if (s === 1) return { r: `F = ${f(k * x)} N`, w: `${f((k * x) / g0)} kg-force`, note: "F = kx" };
  if (!k) throw new InputError("k can't be 0.");
  return { r: `x = ${f(F / k)} m (${f((F / k) * 1000)} mm)`, w: `Energy stored ${f((0.5 * F * F) / k)} J`, note: "x = F/k" };
};
export const pressure: Calc = (v) => {
  const F = Z(v, "f", 500), A = P(v, "a", 0.05, "Area"), p = F / A;
  return { p: `Pressure = ${f(p)} Pa`, u: `${f(p / 1000)} kPa · ${f(p / 101325)} atm · ${f(p / 6894.757)} psi · ${f(p / 100000)} bar`, note: "p = F/A — the same force on a smaller area gives more pressure" };
};
export const continuity: Calc = (v) => {
  const d1 = P(v, "a", 0.1, "Diameter 1"), v1 = Z(v, "v", 2), d2 = P(v, "b", 0.05, "Diameter 2"), A1 = (Math.PI * d1 * d1) / 4, A2 = (Math.PI * d2 * d2) / 4, Q = A1 * v1, v2 = Q / A2;
  return { v: `Velocity in section 2 = ${f(v2)} m/s`, q: `Flow rate Q = ${f(Q)} m³/s (${f(Q * 1000)} L/s · ${f(Q * 15850.3)} US gal/min)`, note: `A₁v₁ = A₂v₂ for an incompressible fluid · area ratio ${f(A1 / A2)}` };
};
export const instVel: Calc = (v) => {
  const ex = txt(v, "x") || "4.9*t^2 + 2*t", t = num(v.t, 3), fn = compileFn(ex, ["t"]);
  return { v: `v(${f(t)}) = ${f(numDeriv((x) => fn(x), t))} m/s`, a: `a(${f(t)}) = ${f(numDeriv((x) => fn(x), t, 2))} m/s² · position ${f(fn(t))} m`, note: `Instantaneous velocity is the derivative of x(t) = ${ex} · average from 0 to ${f(t)}: ${t ? f((fn(t) - fn(0)) / t) : "—"} m/s` };
};
export const banked: Calc = (v) => {
  const r = P(v, "r", 100, "Radius"), a = num(v.a, 15) * D, mu = Z(v, "u", 0), s = Math.sin(a), co = Math.cos(a);
  const vd = Math.sqrt(r * g0 * Math.tan(a)), den = co - mu * s, vmax = den > 0 ? Math.sqrt((r * g0 * (s + mu * co)) / den) : Infinity, vmin2 = (r * g0 * (s - mu * co)) / (co + mu * s);
  return { v: `Design speed (no friction needed) = ${f(vd)} m/s (${f(vd * 3.6)} km/h, ${f(vd * 2.23694)} mph)`, r: mu ? `With μ = ${f(mu)}: ${vmin2 > 0 ? f(Math.sqrt(vmin2)) : "0"} to ${Number.isFinite(vmax) ? f(vmax) : "∞"} m/s` : "Enter a friction coefficient for the safe speed range", note: "v = √(rg tan θ) on a frictionless banked curve" };
};
export const atwood: Calc = (v) => {
  const m1 = P(v, "a", 5, "Mass 1"), m2 = P(v, "b", 3, "Mass 2"), acc = ((m1 - m2) * g0) / (m1 + m2), T = (2 * m1 * m2 * g0) / (m1 + m2);
  return { a: `Acceleration = ${f(Math.abs(acc))} m/s² (${acc >= 0 ? "mass 1 falls" : "mass 2 falls"})`, t: `Tension = ${f(T)} N`, note: `Ideal pulley and string · after 1 s each mass moves ${f(Math.abs(acc) / 2)} m` };
};
export const efficiency: Calc = (v) => {
  const o = Z(v, "o", 750), i = P(v, "i", 1000, "Input"), e0 = o / i;
  return { e: `Efficiency = ${f(e0 * 100)}%`, l: `Losses ${f(i - o)} (${f((1 - e0) * 100)}%)`, note: e0 > 1 ? "Over 100% isn't possible — check the inputs" : "η = useful output ÷ total input (energy or power)" };
};
// ---- Fluids & surfaces ----
export const stokes: Calc = (v) => {
  const r = P(v, "r", 0.00005, "Radius"), mu = P(v, "u", 1.0e-3, "Viscosity"), rp = P(v, "p", 2500, "Particle density"), rf = Z(v, "d", 1000), vel = Z(v, "v", 0);
  const vt = (2 * r * r * (rp - rf) * g0) / (9 * mu), Re = (rf * Math.abs(vt) * 2 * r) / mu;
  return { v: `Settling velocity = ${f(vt)} m/s`, f: vel ? `Drag at ${f(vel)} m/s: ${f(6 * Math.PI * mu * r * vel)} N` : `Drag at terminal speed ${f(6 * Math.PI * mu * r * Math.abs(vt))} N`, note: `Reynolds number ${f(Re)} — Stokes' law is valid for Re < 1${Re > 1 ? " (not valid here)" : ""} · F = 6πμrv` };
};
export const surfTension: Calc = (v) => {
  const F = P(v, "f", 0.0073, "Force"), L = P(v, "l", 0.05, "Length"), two = pick(v.t, 2) === 0, g = F / ((two ? 2 : 1) * L);
  return { g: `Surface tension γ = ${f(g)} N/m (${f(g * 1000)} mN/m)`, c: `Water at 20 °C ≈ 72.8 mN/m · ethanol ≈ 22.3 · mercury ≈ 486`, note: two ? "Wire frame / ring: the film has two surfaces, so γ = F/(2L)" : "Single surface: γ = F/L" };
};
export const capillary: Calc = (v) => {
  const gm = P(v, "g", 0.0728, "Surface tension"), th = num(v.a, 0) * D, rho = P(v, "d", 1000, "Density"), r = P(v, "r", 0.0005, "Tube radius");
  const hh = (2 * gm * Math.cos(th)) / (rho * g0 * r);
  return { h: `Capillary ${hh >= 0 ? "rise" : "depression"} = ${f(Math.abs(hh) * 1000)} mm`, how: `h = 2γ cos θ ÷ (ρgr) with r = ${f(r * 1000)} mm`, note: "Water on clean glass θ ≈ 0°; mercury θ ≈ 140° (it falls) · narrower tubes give higher rise" };
};
// ---- Waves, sound & optics ----
export const soundLevel: Calc = (v) => {
  const m = pick(v.m, 2), I0 = 1e-12;
  if (m === 0) { const I = P(v, "i", 1e-5, "Intensity"); const L = 10 * Math.log10(I / I0); return { l: `Sound level = ${f(L)} dB`, r: `I = ${f(I)} W/m² (I₀ = 10⁻¹² W/m²)`, note: L > 85 ? "Above 85 dB long exposure risks hearing damage" : "Normal conversation is about 60 dB" }; }
  const L = num(v.l, 70), I = I0 * 10 ** (L / 10);
  return { l: `Intensity = ${f(I)} W/m²`, r: `${f(L)} dB · every +10 dB is 10× the intensity (sounds about twice as loud)`, note: "β = 10 log₁₀(I/I₀)" };
};
export const standing: Calc = (v) => {
  const L = P(v, "l", 0.65, "Length"), s = P(v, "v", 343, "Wave speed"), t = pick(v.t, 2), n = Math.max(1, Math.round(num(v.n, 1)));
  const fn = t === 0 ? (k: number) => (k * s) / (2 * L) : (k: number) => ((2 * k - 1) * s) / (4 * L), list = Array.from({ length: 5 }, (_, i) => f(fn(i + 1)));
  return { f: `Harmonic ${n}: ${f(fn(n))} Hz (λ = ${f(s / fn(n))} m)`, l: `First five: ${list.join(", ")} Hz`, note: t === 0 ? "Both ends fixed (string) or both open (pipe): fₙ = nv/2L, all harmonics" : "One end closed: odd harmonics only, fₙ = (2n − 1)v/4L" };
};
export const beat: Calc = (v) => {
  const a = P(v, "a", 440, "Frequency 1"), b = P(v, "b", 444, "Frequency 2"), fb = Math.abs(a - b);
  return { b: `Beat frequency = ${f(fb)} Hz (${f(fb)} beats per second)`, p: `Beat period ${fb ? f(1 / fb) : "∞"} s · perceived tone ${f((a + b) / 2)} Hz`, note: `Tune until the beats slow and stop · ${f(1200 * Math.log2(Math.max(a, b) / Math.min(a, b)))} cents apart` };
};
export const resTube: Calc = (v) => {
  const fq = P(v, "f", 512, "Frequency"), L1 = P(v, "a", 0.163, "First resonance length"), L2 = Z(v, "b", 0.498), dia = Z(v, "d", 0.03);
  const sp = L2 > L1 ? 2 * fq * (L2 - L1) : 4 * fq * (L1 + 0.3 * dia), endc = L2 > L1 ? (L2 - L1) / 2 - L1 : 0.3 * dia;
  return { v: `Speed of sound ≈ ${f(sp)} m/s`, t: `≈ ${f(((sp / 331.3) ** 2 - 1) * 273.15)} °C air temperature`, note: L2 > L1 ? `From two resonances: v = 2f(L₂ − L₁) · end correction ${f(endc * 100)} cm` : `From one resonance with end correction 0.3d: v = 4f(L + 0.3d)` };
};
export const critAngle: Calc = (v) => {
  const n1 = P(v, "a", 1.5, "n₁ (denser medium)"), n2 = P(v, "b", 1.0, "n₂");
  if (n2 >= n1) return { c: "No total internal reflection", r: "Light must travel from the higher to the lower index", note: "Swap the media" };
  const th = Math.asin(n2 / n1) / D;
  return { c: `Critical angle = ${f(th)}°`, r: `Above ${f(th)}° all light reflects back into the denser medium`, note: "sin θc = n₂/n₁ · glass–air ≈ 41.8°, water–air ≈ 48.8°, diamond–air ≈ 24.4°" };
};
export const mirror: Calc = (v) => {
  const fo = num(v.f, 10), d0 = num(v.d, 30), con = pick(v.t, 2) === 1, F = con ? -Math.abs(fo) : Math.abs(fo);
  if (!d0 || d0 === F) throw new InputError("Object distance can't be 0 or equal the focal length.");
  const di = 1 / (1 / F - 1 / d0), m = -di / d0;
  return { i: `Image distance = ${f(di)} cm (${di > 0 ? "real, in front of the mirror" : "virtual, behind the mirror"})`, m: `Magnification ${f(m)} — ${m < 0 ? "inverted" : "upright"}, ${Math.abs(m) > 1 ? "enlarged" : Math.abs(m) < 1 ? "reduced" : "same size"}`, note: `${con ? "Convex" : "Concave"} mirror, f = ${f(F)} · 1/f = 1/dₒ + 1/dᵢ, radius of curvature ${f(2 * F)}` };
};
export const lensMag: Calc = (v) => {
  const fo = num(v.f, 5), d0 = num(v.d, 15), div = pick(v.t, 2) === 1, F = div ? -Math.abs(fo) : Math.abs(fo), ho = Z(v, "h", 2);
  if (!d0 || d0 === F) throw new InputError("Object distance can't be 0 or equal the focal length.");
  const di = 1 / (1 / F - 1 / d0), m = -di / d0;
  return { m: `Magnification = ${f(m)} (${m < 0 ? "inverted" : "upright"}, ${Math.abs(m) > 1 ? "enlarged" : "reduced"})`, i: `Image at ${f(di)} cm (${di > 0 ? "real, other side" : "virtual, same side"})${ho ? ` · image height ${f(m * ho)} cm` : ""}`, note: `${div ? "Diverging" : "Converging"} lens · m = −dᵢ/dₒ · power ${f(100 / F)} dioptres` };
};
export const doubleSlit: Calc = (v) => {
  const lam = P(v, "l", 550, "Wavelength") * 1e-9, d = P(v, "d", 0.25, "Slit separation") * 1e-3, L = P(v, "s", 1.5, "Screen distance"), m = Math.round(num(v.m, 1));
  const y = (m * lam * L) / d, s = Math.sin(Math.abs(m) * lam / d);
  return { y: `Bright fringe ${m}: ${f(y * 1000)} mm from the centre`, s: `Fringe spacing Δy = λL/d = ${f(((lam * L) / d) * 1000)} mm`, note: s <= 1 ? `Angle ${f(Math.asin(s) / D)}° · dark fringes sit halfway between · max order ${Math.floor(d / lam)}` : "That order doesn't exist (sin θ > 1)" };
};
export const malus: Calc = (v) => {
  const I0 = P(v, "i", 100, "Incident intensity"), th = num(v.a, 30) * D, un = pick(v.u, 2) === 0, n = Math.max(1, Math.round(num(v.n, 1)));
  const start = un ? I0 / 2 : I0, I = start * Math.cos(th) ** (2 * n);
  return { i: `Transmitted intensity = ${f(I)} (${f((I / I0) * 100)}% of the original)`, how: `${un ? "Unpolarised light loses half at the first polariser, then " : ""}I = I₀ cos²θ${n > 1 ? ` through ${n} filters each ${f(th / D)}° apart` : ""}`, note: "Malus's law · crossed polarisers (90°) block all light" };
};
export const brewster: Calc = (v) => {
  const n1 = P(v, "a", 1.0, "n₁"), n2 = P(v, "b", 1.5, "n₂"), th = Math.atan(n2 / n1) / D;
  return { b: `Brewster's angle = ${f(th)}°`, r: `Refracted ray at ${f(90 - th)}° — reflected light is fully s-polarised`, note: "tan θB = n₂/n₁ · air–water ≈ 53.1°, air–glass ≈ 56.3° · polarised sunglasses cut this glare" };
};
export const lensmaker: Calc = (v) => {
  const n = P(v, "n", 1.5, "Refractive index"), r1 = num(v.a, 20), r2 = num(v.b, -20), t = Z(v, "t", 0), inf = (x: number) => (x === 0 ? 0 : 1 / x);
  const pw = (n - 1) * (inf(r1) - inf(r2) + (t && r1 && r2 ? ((n - 1) * t) / (n * r1 * r2) : 0));
  if (!pw) throw new InputError("Those surfaces give no focusing power.");
  return { f: `Focal length = ${f(1 / pw)} cm`, p: `Power ${f(100 * pw)} dioptres (${pw > 0 ? "converging" : "diverging"})`, note: `1/f = (n − 1)[1/R₁ − 1/R₂${t ? " + (n − 1)d/(nR₁R₂)" : ""}] · use R = 0 for a flat surface · sign: R > 0 if the centre is on the outgoing side` };
};
// ---- Thermal & radiation ----
export const latent: Calc = (v) => {
  const m = P(v, "m", 2, "Mass"), t = pick(v.t, 3), L = t === 0 ? 334000 : t === 1 ? 2257000 : P(v, "l", 334000, "Latent heat"), Q = m * L;
  return { q: `Energy = ${f(Q / 1000)} kJ`, e: `${f(Q / 3.6e6)} kWh · ${f(Q / 4184)} kcal`, note: `${["Melting ice", "Boiling water", "Custom substance"][t]}: L = ${f(L / 1000)} kJ/kg · Q = mL happens at constant temperature` };
};
export const stefan: Calc = (v) => {
  const T = P(v, "t", 5778, "Temperature"), A = P(v, "a", 1, "Area"), em = Math.min(1, Z(v, "e", 1)), Te = Z(v, "s", 0);
  const Pw = em * sig * A * (T ** 4 - Te ** 4);
  return { p: `Radiated power = ${f(Pw)} W`, i: `${f(em * sig * T ** 4)} W/m² from the surface`, note: `P = εσA(T⁴ − T_surr⁴) · the Sun's surface (5,778 K) gives ≈ 6.3 × 10⁷ W/m²${Te ? ` · net of ${f(Te)} K surroundings` : ""}` };
};
export const wien: Calc = (v) => {
  const m = pick(v.m, 2);
  if (m === 0) { const T = P(v, "t", 5778, "Temperature"), l = 2.897771955e-3 / T; return { l: `Peak wavelength = ${f(l * 1e9)} nm`, b: l * 1e9 < 380 ? "Ultraviolet" : l * 1e9 <= 750 ? "Visible light" : l * 1e6 < 1000 ? "Infrared" : "Microwave / radio", note: "λmax = b/T, b = 2.898 × 10⁻³ m·K · the Sun peaks near 500 nm (green)" }; }
  const l = P(v, "l", 10000, "Wavelength") * 1e-9, T = 2.897771955e-3 / l;
  return { l: `Temperature = ${f(T)} K (${f(T - 273.15)} °C)`, b: `A blackbody peaking at ${f(l * 1e9)} nm`, note: "T = b/λmax · humans (~310 K) peak around 9,300 nm" };
};
export const carnot: Calc = (v) => {
  const Th = P(v, "h", 500, "Hot temperature") + (pick(v.u, 2) === 0 ? 273.15 : 0), Tc = P(v, "c", 25, "Cold temperature") + (pick(v.u, 2) === 0 ? 273.15 : 0), Qh = Z(v, "q", 1000);
  if (Tc >= Th) throw new InputError("The hot reservoir must be hotter than the cold one.");
  const eta = 1 - Tc / Th;
  return { e: `Carnot efficiency = ${f(eta * 100)}%`, w: Qh ? `From ${f(Qh)} J of heat: at most ${f(Qh * eta)} J of work, ${f(Qh * (1 - eta))} J rejected` : `COP as a refrigerator ${f(Tc / (Th - Tc))} · as a heat pump ${f(Th / (Th - Tc))}`, note: `η = 1 − Tc/Th (${f(Th)} K and ${f(Tc)} K) — the maximum for any heat engine` };
};
export const doseDist: Calc = (v) => {
  const d1 = P(v, "a", 1, "Distance 1"), r1 = P(v, "r", 100, "Dose rate at distance 1"), d2 = P(v, "b", 3, "Distance 2"), t = Z(v, "t", 0), r2 = r1 * (d1 / d2) ** 2;
  return { r: `Dose rate at ${f(d2)}: ${f(r2)} (same units)`, t: t ? `Dose over ${f(t)} h: ${f(r2 * t)}` : `${f(r1 / r2)}× lower than at ${f(d1)}`, note: "Inverse-square law for a point source: doubling distance quarters the dose · time, distance and shielding are the three protections" };
};
// ---- Electromagnetism ----
export const wireField: Calc = (v) => {
  const I = P(v, "i", 10, "Current"), r = P(v, "r", 0.05, "Distance"), t = pick(v.t, 3), N = Math.max(1, num(v.n, 100)), L = P(v, "l", 0.2, "Length");
  const B = t === 0 ? (mu0 * I) / (2 * Math.PI * r) : t === 1 ? (mu0 * N * I) / (2 * r) : (mu0 * N * I) / L;
  return { b: `B = ${f(B)} T (${f(B * 1e4)} gauss · ${f(B * 1e6)} μT)`, how: ["Long straight wire: B = μ₀I/(2πr)", `Centre of a ${f(N)}-turn loop of radius r: B = μ₀NI/(2r)`, `Inside a solenoid (${f(N)} turns over ${f(L)} m): B = μ₀NI/L`][t], note: "Earth's field is about 25–65 μT for comparison · right-hand rule gives the direction" };
};
export const solenoid: Calc = (v) => {
  const N = P(v, "n", 500, "Turns"), d = P(v, "d", 0.02, "Diameter"), L = P(v, "l", 0.1, "Length"), mr = P(v, "u", 1, "Relative permeability"), I = Z(v, "i", 0);
  const A = (Math.PI * d * d) / 4, Lh = (mu0 * mr * N * N * A) / L;
  return { l: `Inductance = ${f(Lh * 1e3)} mH (${f(Lh * 1e6)} μH)`, e: I ? `Energy stored at ${f(I)} A: ${f(0.5 * Lh * I * I)} J · field ${f((mu0 * mr * N * I) / L)} T` : `Turns per metre ${f(N / L)}`, note: "L = μ₀μᵣN²A/l — accurate for long, thin solenoids (length ≫ diameter)" };
};
export const cyclotron: Calc = (v) => {
  const B = P(v, "b", 1.5, "Magnetic field"), q = P(v, "q", 1, "Charge (e)") * e, m = P(v, "m", 1.67262192e-27, "Mass"), r = Z(v, "r", 0.5);
  const w = (q * B) / m, vmax = (q * B * r) / m, KE = 0.5 * m * vmax * vmax;
  return { f: `Cyclotron frequency = ${f(w / (2 * Math.PI) / 1e6)} MHz (ω = ${f(w)} rad/s)`, k: r ? `At radius ${f(r)} m: v = ${f(vmax)} m/s, KE = ${f(KE / e / 1e6)} MeV` : "Add a radius for the exit energy", note: `f = qB/(2πm), independent of speed (non-relativistic)${vmax > 0.1 * c ? " · above 0.1c relativity matters" : ""}` };
};
export const hall: Calc = (v) => {
  const I = P(v, "i", 2, "Current"), B = P(v, "b", 0.5, "Field"), n = P(v, "n", 8.5e28, "Carrier density"), t = P(v, "t", 0.0001, "Thickness"), VH = (I * B) / (n * e * t);
  return { v: `Hall voltage = ${f(VH * 1e6)} μV`, r: `Hall coefficient R_H = ${f(1 / (n * e))} m³/C`, note: "V_H = IB/(nqt) · copper n ≈ 8.5 × 10²⁸ m⁻³ gives tiny voltages; semiconductors give much larger ones" };
};
// ---- Modern physics ----
export const photoelectric: Calc = (v) => {
  const lam = P(v, "l", 250, "Wavelength") * 1e-9, W = P(v, "w", 4.28, "Work function"), E = (h * c) / lam / e, K = E - W;
  return { k: K > 0 ? `Max kinetic energy = ${f(K)} eV` : "No electrons emitted — photon energy is below the work function", e: `Photon energy ${f(E)} eV · threshold wavelength ${f(((h * c) / (W * e)) * 1e9)} nm`, note: K > 0 ? `Stopping voltage ${f(K)} V · max electron speed ${f(Math.sqrt((2 * K * e) / me))} m/s · KE = hf − φ` : "Use shorter wavelength (higher frequency) light" };
};
export const lengthCon: Calc = (v) => {
  const L0 = P(v, "l", 100, "Proper length"), b = num(v.v, 0.8);
  if (!(b >= 0 && b < 1)) throw new InputError("Speed must be a fraction of c from 0 to just under 1.");
  const gm = 1 / Math.sqrt(1 - b * b);
  return { l: `Contracted length = ${f(L0 / gm)}`, g: `Lorentz factor γ = ${f(gm)} at ${f(b * 100)}% of c (${f(b * c / 1000)} km/s)`, note: "L = L₀/γ — only along the direction of motion; clocks also run slow by γ" };
};
export const activity: Calc = (v) => {
  const t12 = P(v, "t", 5730, "Half-life"), unit = [1, 86400, 3.15576e7][pick(v.u, 3)], m = Z(v, "m", 1), M = P(v, "a", 14, "Molar mass"), Nin = Z(v, "n", 0);
  const lam = Math.log(2) / (t12 * unit), N = Nin || (m / M) * 6.02214076e23, A = lam * N;
  return { a: `Activity = ${f(A)} Bq (${f(A / 3.7e10)} Ci)`, l: `Decay constant λ = ${f(lam)} s⁻¹ · ${f(N)} nuclei`, note: `A = λN · specific activity ${f(A / (m || 1))} Bq/g · half-life in ${["seconds", "days", "years"][pick(v.u, 3)]}` };
};
export const binding: Calc = (v) => {
  const Zp = Math.round(P(v, "z", 26, "Protons")), A = Math.round(P(v, "a", 56, "Mass number")), M = P(v, "m", 55.934936, "Atomic mass");
  if (A < Zp) throw new InputError("Mass number must be at least the proton number.");
  const dm = Zp * 1.00782503207 + (A - Zp) * 1.00866491595 - M, BE = dm * 931.49410242;
  return { b: `Binding energy = ${f(BE)} MeV`, n: `${f(BE / A)} MeV per nucleon · mass defect ${f(dm)} u`, note: "Iron-56 and nickel-62 are near the peak (~8.8 MeV/nucleon) · uses atomic masses (electrons cancel)" };
};
export const relMomentum: Calc = (v) => {
  const m = P(v, "m", 9.1093837015e-31, "Rest mass"), b = num(v.v, 0.9);
  if (!(b >= 0 && b < 1)) throw new InputError("Speed must be a fraction of c below 1.");
  const gm = 1 / Math.sqrt(1 - b * b), p = gm * m * b * c, E = gm * m * c * c;
  return { p: `Momentum = ${f(p)} kg·m/s`, e: `γ = ${f(gm)} · total energy ${f(E)} J (${f(E / e / 1e6)} MeV) · kinetic ${f((gm - 1) * m * c * c / e / 1e6)} MeV`, note: `Classical mv would give ${f(m * b * c)} — ${f(gm)}× too small · p = γmv` };
};
export const compton: Calc = (v) => {
  const l0 = P(v, "l", 0.0711, "Incident wavelength") * 1e-9, th = num(v.a, 90) * D, lc = 2.42631023867e-12, dl = lc * (1 - Math.cos(th)), l1 = l0 + dl;
  const E0 = (h * c) / l0, E1 = (h * c) / l1;
  return { l: `Scattered wavelength = ${f(l1 * 1e9)} nm (Δλ = ${f(dl * 1e12)} pm)`, e: `Photon energy ${f(E0 / e / 1000)} keV → ${f(E1 / e / 1000)} keV · electron gets ${f((E0 - E1) / e / 1000)} keV`, note: "Δλ = (h/mₑc)(1 − cos θ) · largest at 180° (4.85 pm)" };
};
export const bohr: Calc = (v) => {
  const n = Math.max(1, Math.round(num(v.n, 2))), Zn = Math.max(1, Math.round(num(v.z, 1))), E = (-13.605693 * Zn * Zn) / (n * n), r = (5.29177210903e-11 * n * n) / Zn;
  return { e: `Eₙ = ${f(E)} eV for n = ${n}`, r: `Orbit radius ${f(r * 1e9)} nm · speed ${f((2.18769126e6 * Zn) / n)} m/s`, note: `Ionisation from this level needs ${f(-E)} eV · Eₙ = −13.6 Z²/n² eV (hydrogen-like ions, Z = ${Zn})` };
};
export const heisenberg: Calc = (v) => {
  const m = pick(v.m, 2), mass = P(v, "k", 9.1093837015e-31, "Mass");
  if (m === 0) { const dx = P(v, "x", 1e-10, "Δx"), dp = hbar / (2 * dx); return { r: `Minimum Δp = ${f(dp)} kg·m/s`, v: `Δv ≥ ${f(dp / mass)} m/s for that mass`, note: "Δx·Δp ≥ ħ/2 — confining an electron to an atom (0.1 nm) gives Δv ~ 6 × 10⁵ m/s" }; }
  const dt = P(v, "t", 1e-8, "Δt"), dE = hbar / (2 * dt);
  return { r: `Minimum ΔE = ${f(dE)} J (${f(dE / e)} eV)`, v: `Natural linewidth ≈ ${f(dE / h)} Hz`, note: "ΔE·Δt ≥ ħ/2 — short-lived states have broad energy lines" };
};

// ---- registry (generated)
export const ideaPhys1CustomCalculators: Record<string, Calc> = {
  "inclined-plane-calculator": incline,
  "tension-in-rope-calculator": ropeTension,
  "potential-energy-spring-calculator": springPE,
  "simple-harmonic-motion-calculator": shm,
  "spring-constant-hookes-law-calculator": hooke,
  "pressure-physics-calculator": pressure,
  "flow-rate-continuity-calculator": continuity,
  "instantaneous-velocity-calculator": instVel,
  "banked-curve-speed-calculator": banked,
  "atwood-machine-calculator": atwood,
  "efficiency-physics-calculator": efficiency,
  "viscosity-stokes-law-calculator": stokes,
  "surface-tension-calculator": surfTension,
  "capillary-rise-calculator": capillary,
  "sound-intensity-level-calculator": soundLevel,
  "standing-wave-harmonics-calculator": standing,
  "beat-frequency-calculator": beat,
  "resonance-tube-calculator": resTube,
  "critical-angle-total-internal-reflection-calculator": critAngle,
  "mirror-equation-calculator": mirror,
  "magnification-lens-calculator": lensMag,
  "double-slit-interference-calculator": doubleSlit,
  "polarization-malus-law-calculator": malus,
  "brewster-angle-calculator": brewster,
  "focal-length-lensmaker-calculator": lensmaker,
  "latent-heat-calculator": latent,
  "stefan-boltzmann-radiation-calculator": stefan,
  "wiens-displacement-calculator": wien,
  "carnot-efficiency-calculator": carnot,
  "radiation-dose-distance-calculator": doseDist,
  "magnetic-field-of-wire-calculator": wireField,
  "inductance-solenoid-calculator": solenoid,
  "cyclotron-frequency-calculator": cyclotron,
  "hall-effect-calculator": hall,
  "photoelectric-effect-calculator": photoelectric,
  "length-contraction-calculator": lengthCon,
  "radioactive-decay-activity-calculator": activity,
  "nuclear-binding-energy-calculator": binding,
  "relativistic-momentum-calculator": relMomentum,
  "compton-scattering-calculator": compton,
  "bohr-model-energy-levels-calculator": bohr,
  "heisenberg-uncertainty-calculator": heisenberg,
};
