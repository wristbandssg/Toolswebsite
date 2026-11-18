/**
 * Idea build, batch chem1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Chemistry = 22 tools.
 * Constants: R = 8.314462618 J/mol·K (0.082057366 L·atm/mol·K), F = 96,485.33212 C/mol, Nₐ = 6.02214076e23, h, c as CODATA;
 * carbon-14 half-life 5,730 years (Cambridge value; conventional Libby age uses 5,568); Pauling electronegativities (common textbook
 * table); water Kf = 1.86 °C·kg/mol, Kb = 0.512; electron mass 0.000548579909 u. Molar masses come from the shared periodic table
 * (sci-chem-core formulaMass).
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";
import { txt, fmt } from "./sci-math-core";
import { formulaMass } from "./sci-chem-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-300 ? 0 : x, 5);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const R = 8.314462618, RL = 0.082057366, F = 96485.33212, NA = 6.02214076e23;
const mm = (v: Record<string, number>, k: string, d: string) => { const s = txt(v, k) || d; try { return { s, m: formulaMass(s) }; } catch { throw new InputError(`Couldn't read the formula "${s}".`); } };

export const reactionQ: Calc = (v) => {
  const [a, b, cc, d] = ["a", "b", "c", "d"].map((k, i) => Z(v, k, [1, 3, 2, 0][i])), [A, B, C, Dd] = ["A", "B", "C", "D"].map((k, i) => Z(v, k, [0.5, 0.8, 0.2, 1][i])), K = P(v, "k", 0.5, "K");
  const prod = (C || 1) ** cc * (Dd || 1) ** d, reac = (A || 1) ** a * (B || 1) ** b;
  if ((cc && !C) || (d && !Dd)) return { q: "Q = 0 (no products yet)", r: "Q < K — the reaction runs forward to make products", note: "Q = [C]^c[D]^d ÷ [A]^a[B]^b" };
  if ((a && !A) || (b && !B)) return { q: "Q = ∞ (no reactants)", r: "Q > K — the reaction runs in reverse", note: "Q = [C]^c[D]^d ÷ [A]^a[B]^b" };
  const Q = prod / reac;
  return { q: `Q = ${f(Q)}`, r: Math.abs(Q / K - 1) < 1e-6 ? "Q = K — the system is at equilibrium" : Q < K ? `Q < K (${f(K)}) — shifts right, toward products` : `Q > K (${f(K)}) — shifts left, toward reactants`, note: `aA + bB ⇌ cC + dD with a = ${a}, b = ${b}, c = ${cc}, d = ${d} · ΔG = RT ln(Q/K) = ${f((R * 298.15 * Math.log(Q / K)) / 1000)} kJ/mol at 25 °C` };
};
export const electrolysis: Calc = (v) => {
  const I = P(v, "i", 2, "Current"), t = P(v, "t", 3600, "Time"), z = P(v, "z", 2, "Electrons per ion"), { s, m: M } = mm(v, "f", "Cu"), eff = Math.min(100, P(v, "e", 100, "Efficiency")) / 100;
  const q = I * t * eff, mol = q / (F * z), mass = mol * M;
  return { m: `${f(mass)} g of ${s} deposited`, q: `Charge ${f(q)} C = ${f(q / F)} mol of electrons → ${f(mol)} mol ${s}`, note: `m = (Q/F) × (M/z) · M = ${f(M)} g/mol, z = ${z}${eff < 1 ? ` · ${f(eff * 100)}% current efficiency` : ""}` };
};
export const charles: Calc = (v) => {
  const s = pick(v.s, 2), V1 = P(v, "a", 2, "V₁"), T1c = num(v.b, 25), T1 = T1c + 273.15;
  if (T1 <= 0) throw new InputError("Temperature must be above absolute zero.");
  if (s === 0) { const T2 = num(v.c, 100) + 273.15; if (T2 <= 0) throw new InputError("Temperature must be above absolute zero."); return { r: `V₂ = ${f((V1 * T2) / T1)} L`, how: `V₁/T₁ = V₂/T₂ with T₁ = ${f(T1)} K, T₂ = ${f(T2)} K`, note: "Charles's law: at constant pressure, volume ∝ absolute temperature" }; }
  const V2 = P(v, "d", 2.5, "V₂"), T2 = (V2 * T1) / V1;
  return { r: `T₂ = ${f(T2)} K (${f(T2 - 273.15)} °C)`, how: `T₂ = V₂T₁/V₁`, note: "Always use kelvin in gas laws" };
};
export const graham: Calc = (v) => {
  const a = mm(v, "a", "H2"), b = mm(v, "b", "O2"), t1 = Z(v, "t", 0), ratio = Math.sqrt(b.m / a.m);
  return { r: `${a.s} effuses ${f(ratio)}× as fast as ${b.s}`, m: `Molar masses ${f(a.m)} and ${f(b.m)} g/mol${t1 ? ` · if ${b.s} takes ${f(t1)} s, ${a.s} takes ${f(t1 / ratio)} s` : ""}`, note: "Graham's law: rate₁/rate₂ = √(M₂/M₁) — lighter gases escape faster" };
};
export const fpd: Calc = (v) => {
  const sol = mm(v, "f", "NaCl"), g = Z(v, "g", 58.44), kg = P(v, "w", 1, "Solvent mass"), i = P(v, "i", 2, "van 't Hoff factor"), Kf = P(v, "k", 1.86, "Kf"), Kb = P(v, "kb", 0.512, "Kb"), Tf = num(v.t, 0);
  const molal = g / sol.m / kg, dT = i * Kf * molal;
  return { t: `New freezing point = ${f(Tf - dT)} °C (ΔTf = ${f(dT)} °C)`, m: `Molality ${f(molal)} mol/kg · boiling point rises ${f(i * Kb * molal)} °C`, note: `ΔTf = i·Kf·m · ${sol.s} (M = ${f(sol.m)} g/mol), i = ${f(i)} · water Kf = 1.86, Kb = 0.512 °C·kg/mol` };
};
export const raoult: Calc = (v) => {
  const P1 = P(v, "p", 23.8, "Pure vapour pressure"), x = num(v.x, 0.9), two = pick(v.t, 2) === 1, P2 = Z(v, "q", 0);
  if (!(x >= 0 && x <= 1)) throw new InputError("Mole fraction must be 0 to 1.");
  if (!two) return { p: `Solution vapour pressure = ${f(x * P1)}`, d: `Lowered by ${f((1 - x) * P1)} (${f((1 - x) * 100)}%)`, note: "Raoult's law with a non-volatile solute: P = x_solvent × P°" };
  const pa = x * P1, pb = (1 - x) * P2, tot = pa + pb;
  return { p: `Total vapour pressure = ${f(tot)}`, d: `Partial pressures ${f(pa)} and ${f(pb)} · vapour is ${f((pa / tot) * 100)}% component A`, note: "Ideal mixture: P = x_A P°_A + x_B P°_B (same pressure units throughout)" };
};
const EN: Record<string, number> = { H: 2.2, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9, P: 2.19, S: 2.58, Cl: 3.16, K: 0.82, Ca: 1.0, Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55, Fe: 1.83, Co: 1.88, Ni: 1.91, Cu: 1.9, Zn: 1.65, Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96, Kr: 3.0, Rb: 0.82, Sr: 0.95, Y: 1.22, Zr: 1.33, Mo: 2.16, Ag: 1.93, Cd: 1.69, In: 1.78, Sn: 1.96, Sb: 2.05, Te: 2.1, I: 2.66, Xe: 2.6, Cs: 0.79, Ba: 0.89, W: 2.36, Pt: 2.28, Au: 2.54, Hg: 2.0, Tl: 1.62, Pb: 2.33, Bi: 2.02 };
export const enDiff: Calc = (v) => {
  const a = (txt(v, "a") || "Na").trim(), b = (txt(v, "b") || "Cl").trim(), ea = EN[a[0]?.toUpperCase() + a.slice(1).toLowerCase()], eb = EN[b[0]?.toUpperCase() + b.slice(1).toLowerCase()];
  if (ea === undefined || eb === undefined) throw new InputError("Use element symbols from the table (e.g. Na, Cl, C, O). Noble gases other than Kr and Xe have no Pauling value.");
  const d = Math.abs(ea - eb), ion = 1 - Math.exp(-0.25 * d * d);
  return { d: `ΔEN = ${f(d)} (${a}: ${ea}, ${b}: ${eb})`, t: d < 0.4 ? "Nonpolar covalent bond" : d < 1.7 ? "Polar covalent bond" : "Ionic bond", note: `≈ ${f(ion * 100)}% ionic character (Pauling) · ${d >= 0.4 ? `the partial negative end is ${ea > eb ? a : b}` : "electrons shared about equally"} · cut-offs 0.4 and 1.7 are guidelines` };
};
export const c14: Calc = (v) => {
  const pct = num(v.p, 25), hl = P(v, "h", 5730, "Half-life");
  if (!(pct > 0 && pct <= 100)) throw new InputError("Enter the C-14 remaining as 0–100% of a living sample.");
  const age = (-hl / Math.log(2)) * Math.log(pct / 100), libby = -8033 * Math.log(pct / 100);
  return { a: `Age ≈ ${f(Math.round(age))} years`, h: `${f(age / hl)} half-lives · conventional radiocarbon age (Libby 5,568 y) ${f(Math.round(libby))} BP`, note: "t = −(t½/ln 2) ln(N/N₀) · calibration curves (IntCal20) convert radiocarbon years to calendar years · reliable to ~50,000 years" };
};
export const gplMolar: Calc = (v) => {
  const g = Z(v, "g", 58.44), { s, m } = mm(v, "f", "NaCl"), M = g / m;
  return { m: `Molarity = ${f(M)} mol/L`, o: `${f(M * 1000)} mmol/L · ${f(g * 1000)} mg/L (ppm for dilute water solutions)`, note: `M = (g/L) ÷ molar mass · ${s} = ${f(m)} g/mol` };
};
export const wtMolar: Calc = (v) => {
  const w = num(v.w, 37), d = P(v, "d", 1.18, "Density"), { s, m } = mm(v, "f", "HCl");
  if (!(w > 0 && w <= 100)) throw new InputError("Weight percent must be 0–100.");
  const M = (w / 100) * d * 1000 / m, molal = (w / m) / ((100 - w) / 1000);
  return { m: `Molarity = ${f(M)} M`, o: `Molality ${f(molal)} mol/kg · ${f((w / 100) * d * 1000)} g/L solute`, note: `M = (wt% × density × 1000) ÷ molar mass · ${s} ${f(m)} g/mol, density ${f(d)} g/mL · to make 1 L of 1 M use ${f(1000 / M)} mL` };
};
export const solDensity: Calc = (v) => {
  const m = P(v, "m", 26.5, "Mass"), V = P(v, "v", 25, "Volume"), wt = Z(v, "w", 0), d = m / V;
  return { d: `Density = ${f(d)} g/mL (${f(d * 1000)} kg/m³)`, s: `Specific gravity ${f(d / 0.99820)} vs water at 20 °C`, note: wt ? `Solute concentration ${f((wt / 100) * d * 1000)} g/L` : "ρ = m/V · weigh a known volume with a volumetric flask or pycnometer" };
};
export const combustionHeat: Calc = (v) => {
  const mw = P(v, "w", 200, "Water mass"), dT = num(v.t, 24.5), cc = Z(v, "c", 0), ms = P(v, "m", 1.5, "Fuel mass burned"), { s, m: M } = mm(v, "f", "C2H5OH"), cw = 4.184;
  const q = mw * cw * dT + cc * dT, kjg = q / 1000 / ms;
  return { h: `Heat of combustion ≈ ${f(kjg)} kJ/g (${f(kjg * M)} kJ/mol)`, q: `Heat absorbed ${f(q / 1000)} kJ (water ${f((mw * cw * dT) / 1000)} kJ${cc ? ` + calorimeter ${f((cc * dT) / 1000)} kJ` : ""})`, note: `${s}: M = ${f(M)} g/mol · ΔHc = −q/n · simple calorimeters lose heat, so real values are higher (ethanol ≈ 29.7 kJ/g)` };
};
export const kpkc: Calc = (v) => {
  const dir = pick(v.m, 2), K = P(v, "k", 0.5, "K"), dn = num(v.n, -2), T = P(v, "t", 298.15, "Temperature"), RT = RL * T;
  const out = dir === 0 ? K * RT ** dn : K / RT ** dn;
  return { k: dir === 0 ? `Kp = ${f(out)}` : `Kc = ${f(out)}`, how: `${dir === 0 ? "Kp = Kc(RT)^Δn" : "Kc = Kp ÷ (RT)^Δn"} with RT = ${f(RT)}, Δn = ${f(dn)}`, note: "Δn = moles of gaseous products − gaseous reactants · R = 0.08206 L·atm/mol·K (pressures in atm)" };
};
export const leChat: Calc = (v) => {
  const ch = pick(v.c, 7), exo = pick(v.h, 2) === 0, dn = num(v.n, -2);
  const m: [string, string][] = [["Add a reactant", "Shifts right → more products"], ["Remove a reactant", "Shifts left → more reactants"], ["Add a product", "Shifts left → more reactants"], ["Remove a product", "Shifts right → more products"],
    ["Raise temperature", exo ? "Shifts left (exothermic forward) — K decreases" : "Shifts right (endothermic forward) — K increases"], ["Lower temperature", exo ? "Shifts right — K increases" : "Shifts left — K decreases"],
    ["Increase pressure (decrease volume)", dn < 0 ? "Shifts right — toward fewer gas moles" : dn > 0 ? "Shifts left — toward fewer gas moles" : "No shift — equal gas moles on both sides"]];
  return { s: m[ch][1], c: m[ch][0], note: `Only temperature changes K; concentration and pressure changes move Q away from K · catalysts and inert gases at constant volume cause no shift · Δn(gas) = ${f(dn)}` };
};
export const neutral: Calc = (v) => {
  const ca = P(v, "a", 0.1, "Acid concentration"), va = P(v, "b", 25, "Acid volume") / 1000, na = P(v, "c", 1, "Acidic H per formula"), cb = P(v, "d", 0.1, "Base concentration"), vb = Z(v, "e", 20) / 1000, nb = P(v, "f", 1, "OH per formula");
  const H = ca * va * na, OH = cb * vb * nb, V = va + vb, ex = H - OH;
  const pH = Math.abs(ex) < 1e-12 ? 7 : ex > 0 ? -Math.log10(ex / V) : 14 + Math.log10(-ex / V);
  return { p: `pH = ${f(pH)} (strong acid + strong base at 25 °C)`, m: `${f(H * 1000)} mmol H⁺ vs ${f(OH * 1000)} mmol OH⁻ → ${Math.abs(ex) < 1e-12 ? "exactly neutralised" : ex > 0 ? `${f(ex * 1000)} mmol acid left` : `${f(-ex * 1000)} mmol base left`}`, note: `Equivalence at ${f(((H / (cb * nb)) * 1000))} mL of base · total volume ${f(V * 1000)} mL` };
};
export const polyprotic: Calc = (v) => {
  const C = P(v, "c", 0.1, "Concentration"), ka = [num(v.a, 7.5e-3), num(v.b, 6.2e-8), num(v.d, 4.8e-13)].filter((x) => x > 0);
  if (!ka.length) throw new InputError("Enter at least Ka1.");
  const frac = (H: number) => { const t = [1]; for (let i = 0; i < ka.length; i++) t.push(t[i] * ka[i] / H); const s = t.reduce((a, b) => a + b, 0); return t.map((x) => x / s); };
  const bal = (H: number) => { const fr = frac(H); return H - 1e-14 / H - C * fr.reduce((s, x, i) => s + i * x, 0); };
  let lo = 1e-14, hi = 10; for (let i = 0; i < 200; i++) { const mid = Math.sqrt(lo * hi); if (bal(mid) > 0) hi = mid; else lo = mid; }
  const H = Math.sqrt(lo * hi), fr = frac(H);
  return { p: `pH = ${f(-Math.log10(H))}`, s: `Species: ${fr.map((x, i) => `${i === 0 ? "H" + (ka.length > 1 ? ka.length : "") + "A" : i === ka.length ? `A${ka.length > 1 ? ka.length : ""}⁻` : `H${ka.length - i > 1 ? ka.length - i : ""}A${i > 1 ? i : ""}⁻`} ${f(x * 100)}%`).join(" · ")}`, note: `Full charge-balance solution with Ka = ${ka.map(f).join(", ")} · defaults are phosphoric acid (pKa 2.12, 7.21, 12.32)` };
};
export const isoAbund: Calc = (v) => {
  const avg = P(v, "a", 63.546, "Average mass"), m1 = P(v, "b", 62.9296, "Isotope 1 mass"), m2 = P(v, "c", 64.9278, "Isotope 2 mass");
  if (m1 === m2) throw new InputError("Isotope masses must differ.");
  const x = (avg - m2) / (m1 - m2);
  if (x < 0 || x > 1) throw new InputError("The average must lie between the two isotope masses.");
  return { a: `Isotope 1: ${f(x * 100)}% · isotope 2: ${f((1 - x) * 100)}%`, how: `avg = x·m₁ + (1 − x)·m₂ → x = (avg − m₂)/(m₁ − m₂)`, note: "Defaults: copper (⁶³Cu 69.15%, ⁶⁵Cu 30.85%) · for 3+ isotopes you need more data" };
};
export const ppmErr: Calc = (v) => {
  const meas = P(v, "m", 524.2649, "Measured m/z"), th = P(v, "t", 524.2650, "Theoretical m/z"), tol = Z(v, "o", 5), ppm = ((meas - th) / th) * 1e6;
  return { p: `Mass error = ${f(ppm)} ppm`, d: `${f((meas - th) * 1000)} mDa · ${Math.abs(ppm) <= tol ? `within ±${f(tol)} ppm` : `outside ±${f(tol)} ppm`}`, note: `ppm = (measured − theoretical)/theoretical × 10⁶ · ±${f(tol)} ppm at m/z ${f(th)} = ±${f((tol * th) / 1e6 * 1000)} mDa window` };
};
export const cfse: Calc = (v) => {
  const lam = P(v, "l", 500, "Absorbed wavelength"), d = pick(v.d, 11), geo = pick(v.g, 2), spin = pick(v.s, 2), E = (6.62607015e-34 * 299792458) / (lam * 1e-9), kj = (E * NA) / 1000, cm = 1e7 / lam;
  let t2g: number, eg: number;
  if (geo === 0) { if (spin === 0 || d <= 3 || d >= 8) { const hs = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [6, 2], [6, 3], [6, 4]]; [t2g, eg] = hs[d] as [number, number]; } else { const ls = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4]]; [t2g, eg] = ls[d] as [number, number]; } }
  else { const td = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [4, 4], [4, 5], [4, 6]]; [eg, t2g] = td[d] as [number, number]; }
  const cf = geo === 0 ? -0.4 * t2g + 0.6 * eg : -0.6 * eg + 0.4 * t2g;
  return { d: `Δ${geo === 0 ? "o" : "t"} = ${f(kj)} kJ/mol (${f(cm)} cm⁻¹)`, c: `CFSE for d${d}: ${f(cf)} Δ${geo === 0 ? "o" : "t"} = ${f(cf * kj)} kJ/mol (${geo === 0 ? `t2g${t2g} eg${eg}, ${spin === 0 || d <= 3 || d >= 8 ? "high" : "low"} spin` : `e${eg} t2${t2g}`})`, note: `Absorbs ${f(lam)} nm, so it looks like the complementary colour · pairing energy not included · Δt ≈ 4/9 Δo` };
};
export const unitCell: Calc = (v) => {
  const t = pick(v.t, 4), Zc = t === 3 ? P(v, "z", 4, "Formula units per cell") : [1, 2, 4][t], { s, m } = mm(v, "f", "Cu"), a = P(v, "a", 361.5, "Edge length") * 1e-12;
  const rho = (Zc * m) / (NA * a ** 3) / 1e6, aCm = a * 100;
  const r = t === 0 ? (a / 2) * 1e12 : t === 1 ? ((Math.sqrt(3) * a) / 4) * 1e12 : t === 2 ? (a / (2 * Math.SQRT2)) * 1e12 : NaN;
  return { d: `Density = ${f(rho)} g/cm³`, z: `Z = ${f(Zc)} per cell · volume ${f(aCm ** 3)} cm³${Number.isFinite(r) ? ` · atomic radius ≈ ${f(r)} pm` : ""}`, note: `ρ = Z·M/(Nₐ·a³) · ${s} M = ${f(m)} g/mol · ${["simple cubic (Z = 1)", "body-centred cubic (Z = 2)", "face-centred cubic (Z = 4)", "custom Z"][t]} · copper FCC a = 361.5 pm gives ≈ 8.93 g/cm³ (measured 8.96)` };
};
export const hydrate: Calc = (v) => {
  const mh = P(v, "h", 2.5, "Hydrate mass"), ma = P(v, "a", 1.6, "Anhydrous mass"), { s, m } = mm(v, "f", "CuSO4");
  if (ma >= mh) throw new InputError("The anhydrous mass must be less than the hydrate mass.");
  const nw = (mh - ma) / 18.015, ns = ma / m, x = nw / ns;
  return { f: `${s}·${Math.round(x)}H₂O (x = ${f(x)})`, m: `Water lost ${f(mh - ma)} g = ${f(nw)} mol · ${s} ${f(ns)} mol`, note: `${f(((mh - ma) / mh) * 100)}% water by mass · x = mol H₂O ÷ mol anhydrous salt · CuSO₄·5H₂O is the classic blue hydrate` };
};
export const combustion: Calc = (v) => {
  const ms = P(v, "m", 0.255, "Sample mass"), co2 = P(v, "c", 0.561, "CO₂ mass"), h2o = Z(v, "h", 0.306), hasO = pick(v.o, 2) === 0, Mm = Z(v, "w", 0);
  const nC = co2 / 44.009, nH = (2 * h2o) / 18.015, mC = nC * 12.011, mH = nH * 1.008, mO = hasO ? ms - mC - mH : 0, nO = Math.max(0, mO / 15.999);
  if (mO < -0.001) throw new InputError("C and H add up to more than the sample — check the masses.");
  const mn = Math.min(...[nC, nH, nO].filter((x) => x > 1e-9)), r = [nC, nH, nO].map((x) => x / mn);
  let k = 1; for (const t of [1, 2, 3, 4, 5, 6]) if (r.every((x) => x < 1e-9 || Math.abs(x * t - Math.round(x * t)) < 0.1)) { k = t; break; }
  const sub = r.map((x) => Math.round(x * k)), emp = `C${sub[0] === 1 ? "" : sub[0]}H${sub[1] === 1 ? "" : sub[1]}${sub[2] ? `O${sub[2] === 1 ? "" : sub[2]}` : ""}`, em = sub[0] * 12.011 + sub[1] * 1.008 + sub[2] * 15.999, mult = Mm ? Math.round(Mm / em) : 0;
  return { e: `Empirical formula ${emp} (${f(em)} g/mol)`, p: `C ${f((mC / ms) * 100)}% · H ${f((mH / ms) * 100)}%${hasO ? ` · O ${f((mO / ms) * 100)}%` : ""}`, note: mult > 0 ? `Molecular formula ≈ (${emp})${mult} for molar mass ${f(Mm)}` : "Add the molar mass to get the molecular formula · O is found by difference" };
};

// ---- registry (generated)
export const ideaChem1CustomCalculators: Record<string, Calc> = {
  "reaction-quotient-calculator": reactionQ,
  "faraday-electrolysis-mass-calculator": electrolysis,
  "charless-law-calculator": charles,
  "grahams-law-effusion-calculator": graham,
  "freezing-point-depression-calculator": fpd,
  "vapor-pressure-raoults-law-calculator": raoult,
  "electronegativity-difference-calculator": enDiff,
  "radioactive-carbon-dating-calculator": c14,
  "grams-per-liter-to-molarity-calculator": gplMolar,
  "weight-percent-to-molarity-calculator": wtMolar,
  "density-of-solution-calculator": solDensity,
  "heat-of-combustion-calculator": combustionHeat,
  "kp-kc-conversion-calculator": kpkc,
  "le-chatelier-shift-calculator": leChat,
  "acid-base-neutralization-calculator": neutral,
  "polyprotic-acid-ph-calculator": polyprotic,
  "isotope-abundance-calculator": isoAbund,
  "mass-spectrometry-ppm-error-calculator": ppmErr,
  "crystal-field-splitting-calculator": cfse,
  "unit-cell-density-calculator": unitCell,
  "hydrate-formula-calculator": hydrate,
  "combustion-analysis-calculator": combustion,
};
