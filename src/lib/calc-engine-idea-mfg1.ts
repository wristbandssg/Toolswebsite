/**
 * Idea build, batch mfg1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > Manufacturing, Metals & Engineering (36 tools).
 * Machining (RPM = 12·SFM/(πD)), ISO 286 fits from the standard tolerance formulas, AWS fillet weld capacity,
 * sheet-metal bend allowance BA = θ(R + K·T), Faraday's law plating, OEE/DPMO/MTBF quality metrics.
 */

import { type TrvCalculator as Calc, InputError, num, nfmt, money } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const f = (x: number, dp = 3) => x.toFixed(dp);
const idx = (v: Record<string, number>, k: string, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(v[k], 0))));

export const spindleRpm: Calc = (v) => {
  const sfm = need(p(v, "s", 300), "Enter cutting speed."), d = need(p(v, "d", 0.5), "Enter tool diameter.");
  const rpm = (12 * sfm) / (Math.PI * d);
  return { rpm: `${nfmt(Math.round(rpm))} RPM`, metric: `${f(sfm * 0.3048, 1)} m/min on a ${f(d * 25.4, 2)} mm tool`, note: "Start lower for long tools or unstable setups" };
};
export const feedRate: Calc = (v) => {
  const rpm = need(p(v, "r", 2300), "Enter RPM."), z = need(p(v, "z", 3), "Enter flutes."), cl = p(v, "c", 0.002);
  const ipm = rpm * z * cl;
  return { ipm: `${f(ipm, 1)} in/min feed rate`, mm: `${nfmt(Math.round(ipm * 25.4))} mm/min`, per: `${f(cl * z, 4)} in per revolution` };
};
export const mrr: Calc = (v) => {
  const ae = p(v, "w", 0.25), ap = p(v, "d", 0.5), ipm = p(v, "f", 20), kp = p(v, "k", 0.3), eff = Math.max(0.1, p(v, "e", 80) / 100);
  const q = ae * ap * ipm;
  return { q: `${f(q, 3)} in³/min (${f(q * 16.387, 1)} cm³/min)`, hp: `${f((q * kp) / eff, 2)} hp at the motor (${f(((q * kp) / eff) * 0.7457, 2)} kW)`, note: "Unit power: aluminum ≈ 0.3, mild steel ≈ 1.0, stainless ≈ 1.4 hp per in³/min" };
};
export const drillPoint: Calc = (v) => {
  const d = need(p(v, "d", 0.5), "Enter drill diameter."), a = Math.min(179, Math.max(1, p(v, "a", 118)));
  const L = d / 2 / Math.tan(rad(a / 2));
  return { L: `${f(L, 4)} point length`, add: `Add ${f(L, 4)} to the full-diameter depth for a blind hole`, mm: `${f(L * 25.4, 2)} mm` };
};
export const threadPd: Calc = (v) => {
  const D = need(p(v, "d", 10), "Enter major diameter."), P = need(p(v, "p", 1.5), "Enter pitch.");
  return { pd: `${f(D - 0.649519 * P, 3)} mm basic pitch diameter`, minor: `${f(D - 1.226869 * P, 3)} mm external minor (root) · ${f(D - 1.082532 * P, 3)} mm internal minor`, tap: `${f(D - P, 2)} mm tap drill (≈75% thread)`, h: `${f(0.866025 * P, 3)} mm fundamental triangle height` };
};
export const boltPreload: Calc = (v) => {
  const T = need(p(v, "t", 50), "Enter torque."), d = need(p(v, "d", 10), "Enter bolt diameter."), P = p(v, "p", 1.5), K = need(p(v, "k", 0.2), "Enter nut factor."), proof = p(v, "pr", 600);
  const F = T / (K * d / 1000), As = (Math.PI / 4) * Math.pow(d - 0.9382 * P, 2), s = F / As;
  return { F: `${f(F / 1000, 2)} kN clamp force (${nfmt(Math.round(F * 0.2248))} lbf)`, s: `${nfmt(Math.round(s))} MPa bolt stress on ${f(As, 1)} mm² stress area`, pct: proof ? `${pc(s / proof, 0)} of proof strength (${proof} MPa)` : "—" };
};
const RANGES = [1, 3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
const FITS: [string, string, number, number][] = [["H7/g6", "g", 7, 6], ["H7/h6", "h", 7, 6], ["H7/k6", "k", 7, 6], ["H7/n6", "n", 7, 6], ["H8/f7", "f", 8, 7]];
export const isoFit: Calc = (v) => {
  const D = need(p(v, "d", 25), "Enter nominal size."), fit = FITS[idx(v, "fit", FITS.length)];
  if (D > 500) throw new InputError("Sizes up to 500 mm.");
  let i0 = 0; while (i0 < RANGES.length - 2 && D > RANGES[i0 + 1]) i0++;
  const Dm = Math.sqrt(RANGES[i0] * RANGES[i0 + 1]), i = 0.45 * Math.cbrt(Dm) + 0.001 * Dm, mult: Record<number, number> = { 6: 10, 7: 16, 8: 25 };
  const IT = (g: number) => Math.round(mult[g] * i), th = IT(fit[2]), ts = IT(fit[3]);
  let es = 0, ei = 0;
  if (fit[1] === "g") { es = -Math.round(2.5 * Math.pow(Dm, 0.34)); ei = es - ts; }
  else if (fit[1] === "f") { es = -Math.round(5.5 * Math.pow(Dm, 0.41)); ei = es - ts; }
  else if (fit[1] === "h") { es = 0; ei = -ts; }
  else if (fit[1] === "k") { ei = D <= 3 ? 0 : Math.round(0.6 * Math.cbrt(Dm)); es = ei + ts; }
  else { ei = Math.round(5 * Math.pow(Dm, 0.34)); es = ei + ts; }
  const cmax = th - ei, cmin = 0 - es, mm = (u: number) => f(D + u / 1000, 3);
  const kind = cmin >= 0 ? "Clearance fit" : cmax <= 0 ? "Interference fit" : "Transition fit";
  return { hole: `Hole ${mm(0)} – ${mm(th)} mm (0 / +${th} µm)`, shaft: `Shaft ${mm(ei)} – ${mm(es)} mm (${ei >= 0 ? "+" : ""}${ei} / ${es >= 0 ? "+" : ""}${es} µm)`, fit: `${kind}: ${cmin} to ${cmax} µm (negative = interference)`, it: `IT${fit[2]} = ${th} µm · IT${fit[3]} = ${ts} µm for ${RANGES[i0]}–${RANGES[i0 + 1]} mm` };
};
export const filletWeld: Calc = (v) => {
  const w = need(p(v, "w", 0.25), "Enter leg size."), L = need(p(v, "l", 6), "Enter weld length."), fe = p(v, "e", 70);
  const throat = 0.707 * w, rn = 0.6 * fe * throat * L;
  return { asd: `${f(rn / 2, 1)} kips allowable (ASD, Ω = 2.0)`, lrfd: `${f(rn * 0.75, 1)} kips design strength (LRFD, φ = 0.75)`, per: `${f((rn / 2) / L, 2)} kips per inch · ${f(throat, 3)} in throat` };
};
export const weldWire: Calc = (v) => {
  const w = need(p(v, "w", 0.25), "Enter leg size."), L = p(v, "l", 100), eff = Math.max(0.1, p(v, "e", 92) / 100), rf = p(v, "r", 10) / 100;
  const dep = (w * w / 2) * (1 + rf) * L * 12 * 0.2836;
  return { wire: `${f(dep / eff, 2)} lb of wire`, dep: `${f(dep, 2)} lb deposited (${f(dep * 0.4536, 2)} kg)`, per: `${f(dep / eff / Math.max(L, 1), 3)} lb per foot of weld` };
};
export const shieldGas: Calc = (v) => {
  const cfh = p(v, "f", 30), hrs = p(v, "h", 3), days = p(v, "d", 20), cyl = need(p(v, "c", 300), "Enter cylinder capacity."), cost = p(v, "k", 60);
  const use = cfh * hrs * days;
  return { use: `${nfmt(Math.round(use))} ft³ of gas`, cyl: `${f(use / cyl, 1)} cylinders`, cost: `${$((use / cyl) * cost, 0)} in refills · ${f(cfh * 0.4719, 1)} L/min flow` };
};
export const extrusion: Calc = (v) => {
  const a = need(p(v, "a", 500), "Enter cross-section area."), L = p(v, "l", 6), rho = p(v, "r", 2.7), n = p(v, "n", 10);
  const kgm = a * rho / 1000;
  return { kg: `${f(kgm * L * n, 2)} kg total`, kgm: `${f(kgm, 3)} kg/m (${f(kgm * 0.672, 3)} lb/ft)`, each: `${f(kgm * L, 2)} kg per ${L} m length` };
};
const DENS = [7.85, 8.0, 2.7, 8.5, 8.96, 4.43, 1.41];
export const barWeight: Calc = (v) => {
  const shape = idx(v, "sh", 4), d = need(p(v, "d", 25), "Enter size."), w = p(v, "w", 50), L = p(v, "l", 1000), rho = DENS[idx(v, "m", DENS.length)], q = Math.max(1, p(v, "q", 1));
  const area = shape === 0 ? (Math.PI / 4) * d * d : shape === 1 ? d * d : shape === 2 ? 0.866025 * d * d : d * w;
  const kg = (area * L * rho) / 1e6;
  return { kg: `${f(kg * q, 3)} kg (${f(kg * q * 2.2046, 2)} lb)`, each: `${f(kg, 3)} kg each`, perm: `${f((area * rho) / 1000, 3)} kg per metre · ${f(area, 1)} mm² section` };
};
export const plasma: Calc = (v) => {
  const L = p(v, "l", 400), s = need(p(v, "s", 60), "Enter cut speed from your cut chart."), pierce = p(v, "n", 20), pt = p(v, "pt", 1), rate = p(v, "r", 90);
  const min = L / s + (pierce * pt) / 60;
  return { min: `${f(min, 1)} min cutting time`, cost: `${$((min / 60) * rate)} at ${$(rate, 0)}/hr (power, gas, consumables, labour)`, split: `${f(L / s, 1)} min moving + ${f((pierce * pt) / 60, 1)} min piercing` };
};
export const clampTon: Calc = (v) => {
  const a = need(p(v, "a", 20), "Enter projected area."), c = Math.max(1, p(v, "c", 4)), k = p(v, "k", 2.5), sf = p(v, "sf", 10) / 100;
  const t = a * c * k * (1 + sf);
  return { t: `${nfmt(Math.ceil(t))} US tons clamp force`, metric: `${f(t * 0.9072, 0)} metric tonnes (${f(t * 8.896, 0)} kN)`, note: "Factor 2–3 tons/in² for easy-flow resins (PP, PE), 3–5 for PC, nylon and thin walls" };
};
export const cycleTime: Calc = (v) => {
  const s = need(p(v, "s", 2), "Enter wall thickness."), a = need(p(v, "a", 0.1), "Enter thermal diffusivity."), tm = p(v, "tm", 230), tw = p(v, "tw", 40), te = p(v, "te", 90), inj = p(v, "i", 2), op = p(v, "o", 4), cav = Math.max(1, p(v, "c", 4));
  if (!(te > tw && tm > te)) throw new InputError("Need melt > ejection > mold temperature.");
  const cool = (s * s) / (Math.PI * Math.PI * a) * Math.log((8 / (Math.PI * Math.PI)) * ((tm - tw) / (te - tw)));
  const cyc = inj + Math.max(0, cool) + op;
  return { cyc: `${f(cyc, 1)} s cycle`, cool: `${f(cool, 1)} s cooling (usually the largest part)`, out: `${nfmt(Math.floor((3600 / cyc) * cav))} parts per hour with ${cav} cavities` };
};
export const plasticCost: Calc = (v) => {
  const g = p(v, "g", 25), resin = p(v, "r", 2.5), scrap = p(v, "s", 5) / 100, cyc = need(p(v, "t", 30), "Enter cycle time."), cav = Math.max(1, p(v, "c", 4)), rate = p(v, "m", 60), mold = p(v, "mo", 30000), vol = Math.max(1, p(v, "v", 100000));
  const mat = (g / 1000) * resin * (1 + scrap), mach = (rate / 3600) * cyc / cav, tool = mold / vol;
  return { cost: `${$(mat + mach + tool, 4)} per part`, parts: `Material ${$(mat, 4)} · machine ${$(mach, 4)} · tooling ${$(tool, 4)}`, run: `${$((mat + mach + tool) * vol, 0)} for ${nfmt(vol)} parts` };
};
const FIL = [1.24, 1.04, 1.27, 1.21, 1.2];
export const filament: Calc = (v) => {
  const g = need(p(v, "g", 1000), "Enter weight."), d = need(p(v, "d", 1.75), "Enter diameter."), rho = FIL[idx(v, "m", FIL.length)];
  const len = g / rho / ((Math.PI / 4) * Math.pow(d / 10, 2)) / 100;
  return { len: `${f(len, 1)} m of filament`, ft: `${nfmt(Math.round(len * 3.2808))} ft`, per: `${f(len / g, 3)} m per gram` };
};
export const oee: Calc = (v) => {
  const plan = need(p(v, "p", 480), "Enter planned time."), down = p(v, "d", 45), ict = p(v, "c", 1), tot = p(v, "t", 380), good = p(v, "g", 360);
  const run = plan - down, A = run / plan, P = Math.min(1, (ict * tot) / Math.max(run, 0.001)), Q = tot ? good / tot : 0, O = A * P * Q;
  return { oee: `${pc(O)} OEE`, parts: `Availability ${pc(A)} × Performance ${pc(P)} × Quality ${pc(Q)}`, bench: O >= 0.85 ? "World class (85%+)" : O >= 0.6 ? "Typical (60–85%)" : "Low — big improvement room" };
};
export const capacity: Calc = (v) => {
  const m = p(v, "m", 4), h = p(v, "h", 8), s = p(v, "s", 2), d = p(v, "d", 22), ct = need(p(v, "c", 45), "Enter cycle time."), e = p(v, "e", 85) / 100;
  const units = (m * h * s * d * 3600 * e) / ct;
  return { u: `${nfmt(Math.floor(units))} units a month`, day: `${nfmt(Math.floor(units / Math.max(d, 1)))} a day`, hr: `${nfmt(Math.floor((3600 * e * m) / ct))} an hour across ${m} machines` };
};
export const scrap: Calc = (v) => {
  const tot = need(p(v, "t", 12000), "Enter units produced."), sc = p(v, "s", 420), c = p(v, "c", 3.5);
  return { r: `${pc(sc / tot, 2)} scrap rate`, cost: `${$(sc * c, 0)} cost of scrap`, good: `${nfmt(tot - sc)} good units (${pc(1 - sc / tot, 2)} yield)` };
};
export const fpy: Calc = (v) => {
  const n = need(p(v, "n", 1000), "Enter units started."), pass = p(v, "p", 920), y2 = Math.min(100, p(v, "y2", 97)) / 100, y3 = Math.min(100, p(v, "y3", 99)) / 100;
  const y1 = pass / n;
  return { fpy: `${pc(y1)} first pass yield`, rty: `${pc(y1 * y2 * y3)} rolled throughput yield over 3 steps`, rework: `${nfmt(n - pass)} units needed rework or scrap at step 1` };
};
const invN = (q: number) => {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (q < 0.02425) { const t = Math.sqrt(-2 * Math.log(q)); return (((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
  if (q > 0.97575) { const t = Math.sqrt(-2 * Math.log(1 - q)); return -(((((c[0] * t + c[1]) * t + c[2]) * t + c[3]) * t + c[4]) * t + c[5]) / ((((d[0] * t + d[1]) * t + d[2]) * t + d[3]) * t + 1); }
  const r = q - 0.5, s = r * r; return ((((((a[0] * s + a[1]) * s + a[2]) * s + a[3]) * s + a[4]) * s + a[5]) * r) / (((((b[0] * s + b[1]) * s + b[2]) * s + b[3]) * s + b[4]) * s + 1);
};
export const dpmo: Calc = (v) => {
  const def = p(v, "d", 35), u = need(p(v, "u", 5000), "Enter units."), o = need(p(v, "o", 8), "Enter opportunities per unit.");
  const D = (def / (u * o)) * 1e6, yld = 1 - D / 1e6;
  const sig = yld >= 1 ? Infinity : yld <= 0 ? 0 : invN(yld) + 1.5;
  return { dpmo: `${nfmt(Math.round(D))} DPMO`, sig: Number.isFinite(sig) ? `${f(sig, 2)} sigma level (with 1.5σ shift)` : "No defects — above 6σ", yld: `${pc(yld, 3)} yield per opportunity` };
};
export const mtbf: Calc = (v) => {
  const hrs = need(p(v, "h", 8760), "Enter operating hours."), fails = need(p(v, "f", 4), "Enter failures."), rep = p(v, "r", 6), t = p(v, "t", 720);
  const m = hrs / fails, mttr = rep / fails;
  return { m: `${nfmt(Math.round(m))} hours MTBF`, avail: `${pc(m / (m + mttr), 2)} availability (MTTR ${f(mttr, 1)} h)`, rel: `${pc(Math.exp(-t / m))} chance of running ${nfmt(t)} h without failure` };
};
export const machineRate: Calc = (v) => {
  const price = p(v, "p", 250000), salv = p(v, "s", 25000), life = need(p(v, "l", 10), "Enter life."), hrs = need(p(v, "h", 3500), "Enter hours per year."), int = p(v, "i", 6) / 100, mnt = p(v, "m", 8000), kw = p(v, "k", 15), el = p(v, "e", 0.14), space = p(v, "sp", 6000), op = p(v, "o", 28);
  const dep = (price - salv) / life, intC = ((price + salv) / 2) * int, fixed = (dep + intC + mnt + space) / hrs, power = kw * 0.7 * el;
  return { rate: `${$(fixed + power + op)} per machine hour with operator`, mach: `${$(fixed + power)} without operator`, parts: `Depreciation ${$(dep / hrs)} · interest ${$(intC / hrs)} · maintenance ${$(mnt / hrs)} · space ${$(space / hrs)} · power ${$(power)}` };
};
export const bom: Calc = (v) => {
  const lines = [1, 2, 3, 4, 5].map((i) => p(v, `q${i}`, [2, 4, 1, 8, 1][i - 1]) * p(v, `c${i}`, [3.2, 0.45, 12, 0.08, 1.5][i - 1]));
  const mat = lines.reduce((a, b) => a + b, 0), lab = p(v, "l", 6), oh = p(v, "o", 25) / 100, qty = Math.max(1, p(v, "b", 500));
  const unit = (mat + lab) * (1 + oh);
  return { unit: `${$(unit)} cost per unit`, split: `Materials ${$(mat)} · labour ${$(lab)} · overhead ${$((mat + lab) * oh)}`, batch: `${$(unit * qty, 0)} for a batch of ${nfmt(qty)}` };
};
export const gearRatio: Calc = (v) => {
  const z1 = need(p(v, "a", 20), "Enter driver teeth."), z2 = need(p(v, "b", 60), "Enter driven teeth."), rpm = p(v, "r", 1750), tq = p(v, "t", 10), e = p(v, "e", 97) / 100;
  const r = z2 / z1;
  return { r: `${f(r, 3)} : 1 ratio`, rpm: `${f(rpm / r, 1)} RPM output`, tq: `${f(tq * r * e, 2)} output torque (same units) at ${pc(e, 0)} efficiency`, dir: "Output turns the opposite way (external gears)" };
};
export const beltLength: Calc = (v) => {
  const D = need(p(v, "D", 200), "Enter large pulley."), d = need(p(v, "d", 100), "Enter small pulley."), C = need(p(v, "c", 500), "Enter centre distance.");
  const Dl = Math.max(D, d), ds = Math.min(D, d);
  if (2 * C <= Dl - ds) throw new InputError("Centre distance too short.");
  const L = 2 * C + (Math.PI * (Dl + ds)) / 2 + ((Dl - ds) ** 2) / (4 * C), wrap = 180 - 2 * deg(Math.asin((Dl - ds) / (2 * C)));
  return { L: `${f(L, 1)} belt pitch length (same units)`, ratio: `${f(Dl / ds, 2)} : 1 speed ratio`, wrap: `${f(wrap, 1)}° wrap on the small pulley${wrap < 120 ? " — low, may slip" : ""}` };
};
export const bendAllow: Calc = (v) => {
  const T = need(p(v, "t", 2), "Enter thickness."), R = p(v, "r", 2), A = Math.min(180, p(v, "a", 90)), K = p(v, "k", 0.33);
  const BA = rad(A) * (R + K * T), OSSB = Math.tan(rad(A / 2)) * (R + T), BD = 2 * OSSB - BA;
  return { ba: `${f(BA, 3)} bend allowance`, bd: `${f(BD, 3)} bend deduction`, ossb: `${f(OSSB, 3)} outside setback` };
};
export const kFactor: Calc = (v) => {
  const flat = need(p(v, "f", 96.4), "Enter flat length."), a = p(v, "a", 50), b = p(v, "b", 50), T = need(p(v, "t", 2), "Enter thickness."), R = p(v, "r", 2), A = need(Math.min(180, p(v, "an", 90)), "Enter bend angle.");
  const BD = a + b - flat, OSSB = Math.tan(rad(A / 2)) * (R + T), BA = 2 * OSSB - BD, K = (BA / rad(A) - R) / T;
  return { k: `${f(K, 3)} K-factor`, ba: `${f(BA, 3)} bend allowance · ${f(BD, 3)} bend deduction`, note: K < 0 || K > 0.5 ? "Outside 0–0.5 — check measurements" : "Typical range is 0.3–0.5" };
};
export const countersink: Calc = (v) => {
  const D = need(p(v, "d", 0.5), "Enter countersink diameter."), dp = p(v, "p", 0), a = Math.min(179, Math.max(1, p(v, "a", 82)));
  if (dp >= D) throw new InputError("Hole diameter must be smaller than the countersink diameter.");
  const h = (D - dp) / 2 / Math.tan(rad(a / 2)), tip = D / 2 / Math.tan(rad(a / 2));
  return { h: `${f(h, 4)} depth from the surface`, tip: `${f(tip, 4)} plunge depth measured from the tool tip`, mm: `${f(h * 25.4, 2)} mm` };
};
export const taper: Calc = (v) => {
  const D = p(v, "D", 1.0), d = p(v, "d", 0.75), L = need(p(v, "l", 3), "Enter taper length.");
  const half = deg(Math.atan(Math.abs(D - d) / (2 * L)));
  return { inc: `${f(half * 2, 4)}° included angle`, half: `${f(half, 4)}° per side (set compound to this)`, tpf: `${f((Math.abs(D - d) / L) * 12, 4)} in per foot taper · 1 : ${f(L / Math.max(Math.abs(D - d), 1e-9), 2)}` };
};
export const knurl: Calc = (v) => {
  const D = need(p(v, "d", 1), "Enter target diameter."), tpi = need(p(v, "t", 30), "Enter knurl pitch (TPI).");
  const pitch = 1 / tpi, N = Math.round((Math.PI * D) / pitch), Dn = (N * pitch) / Math.PI;
  return { d: `${f(Dn, 4)} in blank diameter`, n: `${N} teeth around the circumference`, chg: `${Dn >= D ? "+" : ""}${f(Dn - D, 4)} in from your target — tracks cleanly without double-tracking` };
};
const HRC = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 68], HV = [238, 266, 302, 345, 392, 446, 513, 595, 697, 832, 940], HB = [226, 253, 286, 327, 371, 421, 481, 0, 0, 0, 0];
export const hardness: Calc = (v) => {
  const h = num(v.h, 45);
  if (h < 20 || h > 68) throw new InputError("Enter HRC between 20 and 68.");
  let i = 0; while (i < HRC.length - 2 && h > HRC[i + 1]) i++;
  const t = (h - HRC[i]) / (HRC[i + 1] - HRC[i]), hv = HV[i] + t * (HV[i + 1] - HV[i]);
  const hb = h <= 50 ? HB[i] + t * (HB[i + 1] - HB[i]) : 0;
  return { hv: `≈ ${Math.round(hv)} HV (Vickers)`, hb: hb ? `≈ ${Math.round(hb)} HB (Brinell)` : "Above Brinell range (> ~50 HRC)", uts: hb ? `≈ ${nfmt(Math.round(hb * 3.45))} MPa tensile strength (≈ 3.45 × HB)` : `≈ ${nfmt(Math.round(hv * 3.2))} MPa tensile (rough, from HV)` };
};
const METALS: [string, number, number, number, number][] = [["Aluminium", 0.9, 660, 397, 1.18], ["Copper", 0.385, 1085, 205, 0.5], ["Cast iron / steel", 0.7, 1538, 247, 0.82], ["Brass", 0.38, 930, 168, 0.47], ["Zinc", 0.39, 420, 112, 0.51]];
export const furnace: Calc = (v) => {
  const m = need(p(v, "m", 100), "Enter mass."), mt = METALS[idx(v, "mt", METALS.length)], t0 = num(v.t0, 20), sup = p(v, "s", 100), eff = Math.max(0.01, p(v, "e", 50) / 100), price = p(v, "c", 0.15);
  const kj = m * (mt[1] * (mt[2] - t0) + mt[3] + mt[4] * sup), kwh = kj / 3600;
  return { kwh: `${f(kwh / eff, 1)} kWh at the furnace`, th: `${f(kwh, 1)} kWh theoretical (${f((kwh / m) * 1000, 0)} kWh per tonne)`, cost: `${$((kwh / eff) * price)} energy cost`, note: `${mt[0]} melts at ${mt[2]} °C` };
};
export const powder: Calc = (v) => {
  const sg = need(p(v, "g", 1.5), "Enter specific gravity."), mils = need(p(v, "m", 2.5), "Enter film thickness."), te = Math.max(0.05, p(v, "t", 60) / 100), area = p(v, "a", 500);
  const th = 192.3 / (sg * mils), real = th * te;
  return { cov: `${f(real, 1)} ft² per lb actual`, th: `${f(th, 1)} ft² per lb theoretical`, lbs: `${f(area / real, 1)} lb needed for ${nfmt(area)} ft²` };
};
const PLATE: [string, number, number, number][] = [["Nickel", 58.69, 2, 8.908], ["Copper (acid)", 63.55, 2, 8.96], ["Zinc", 65.38, 2, 7.14], ["Hard chromium", 52.0, 6, 7.19], ["Tin", 118.71, 2, 7.31], ["Silver", 107.87, 1, 10.49], ["Gold", 196.97, 1, 19.3]];
export const plating: Calc = (v) => {
  const mt = PLATE[idx(v, "mt", PLATE.length)], J = need(p(v, "j", 3), "Enter current density."), t = p(v, "t", 30), eff = Math.max(0.01, p(v, "e", 95) / 100), tgt = p(v, "g", 10), area = p(v, "a", 2);
  const rate = ((J / 100) * 60 * mt[1] * eff) / (mt[2] * 96485 * mt[3]) * 1e4;
  return { th: `${f(rate * t, 2)} µm after ${t} min`, rate: `${f(rate, 3)} µm per minute`, time: tgt ? `${f(tgt / rate, 1)} min for ${tgt} µm` : "—", amps: `${f(J * area, 1)} A for ${area} dm²` };
};

// ---- registry (generated)
export const ideaMfg1CustomCalculators: Record<string, Calc> = {
  "cnc-spindle-speed-rpm-calculator": spindleRpm,
  "cutting-feed-rate-calculator": feedRate,
  "material-removal-rate-calculator": mrr,
  "drill-point-length-calculator": drillPoint,
  "thread-pitch-diameter-calculator": threadPd,
  "bolt-preload-clamp-force-calculator": boltPreload,
  "shaft-tolerance-iso-fit-calculator": isoFit,
  "weld-size-fillet-strength-calculator": filletWeld,
  "welding-wire-consumption-calculator": weldWire,
  "shielding-gas-flow-calculator": shieldGas,
  "aluminum-extrusion-weight-calculator": extrusion,
  "bar-stock-weight-calculator": barWeight,
  "plasma-cutting-speed-calculator": plasma,
  "injection-molding-clamp-tonnage-calculator": clampTon,
  "injection-molding-cycle-time-calculator": cycleTime,
  "plastic-part-cost-calculator": plasticCost,
  "3d-print-filament-length-calculator": filament,
  "overall-equipment-effectiveness-oee-calculator": oee,
  "production-capacity-calculator": capacity,
  "scrap-rate-calculator": scrap,
  "first-pass-yield-calculator": fpy,
  "defects-per-million-opportunities-calculator": dpmo,
  "mean-time-between-failures-calculator": mtbf,
  "machine-hour-rate-calculator": machineRate,
  "bill-of-materials-cost-calculator": bom,
  "gear-ratio-speed-torque-calculator": gearRatio,
  "belt-length-pulley-calculator": beltLength,
  "sheet-metal-bend-allowance-calculator": bendAllow,
  "k-factor-sheet-metal-calculator": kFactor,
  "countersink-depth-calculator": countersink,
  "taper-angle-calculator": taper,
  "knurling-diameter-calculator": knurl,
  "heat-treatment-hardness-conversion-calculator": hardness,
  "metal-melting-furnace-energy-calculator": furnace,
  "powder-coating-coverage-calculator": powder,
  "electroplating-thickness-time-calculator": plating,
};
