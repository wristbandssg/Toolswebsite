/**
 * Batch: "Science Calculators" → Chemistry (solutions, pH & buffers — 25 tools).
 *
 * Molar masses come from a typed formula (sci-chem-core parser) or a number. pH of weak acids and
 * bases solves the exact quadratic x² + Kx − KC = 0. Buffers use Henderson-Hasselbalch; polyprotic
 * citrate uses the average deprotonation number n̄ = Σ i·αᵢ (charge balance, activities ignored).
 * Tris pKa 8.07 at 25 °C with dpKa/dT = −0.028 /°C. Dissolved-oxygen saturation: Benson & Krause
 * (APHA 4500-O) with salinity and barometric-pressure corrections. Serum osmolality
 * 2Na + glucose/18 + BUN/2.8. See prisma/create-sci-sol-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";
import { formulaMass, parseFormula, elementMass } from "./sci-chem-core";

const s = (x: number, n = 10) => sig(x, n);
const R_ATM = 0.082057366; // L·atm/(mol·K)
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
/** Molar mass from the formula text (key) or the numeric fallback (mwKey). */
const mwOf = (v: Vals, key = "formula", mwKey = "mw", def = 58.44) => {
  const f = txt(v, key);
  const m = f ? formulaMass(f) : pos(v[mwKey], def);
  if (!m) throw new InputError("Enter a formula or a molar mass.");
  return m;
};

export const MOLARITY_MODE = ["Molarity from mass and volume", "Mass needed for a molarity", "Volume for a mass and molarity"];
export const molarity: SciCalculator = (v) => {
  const mw = mwOf(v), m = pick(v.mode, 3), g = pos(v.mass, 5.844), mL = pos(v.vol, 100), M = pos(v.M, 1);
  const mol = m === 0 ? g / mw : m === 1 ? (M * mL) / 1000 : g / mw;
  const res = fin(m === 0 ? mol / (mL / 1000) : m === 1 ? mol * mw : (mol / M) * 1000);
  return { result: s(res), unit: ["mol/L (M)", "grams", "mL"][m], mw: s(mw, 8), mmol: s(mol * 1000, 8), mM: m === 0 ? s(res * 1000, 8) : "—" };
};
export const DIL_SOLVE = ["Final volume V₂", "Stock volume V₁", "Final concentration C₂", "Stock concentration C₁"];
export const dilution: SciCalculator = (v) => {
  const k = pick(v.solve, 4), C1 = pos(v.c1, 10), V1 = pos(v.v1, 10), C2 = pos(v.c2, 1), V2 = pos(v.v2, 100);
  const x = fin(k === 0 ? (C1 * V1) / C2 : k === 1 ? (C2 * V2) / C1 : k === 2 ? (C1 * V1) / V2 : (C2 * V2) / V1);
  const vv1 = k === 1 ? x : V1, vv2 = k === 0 ? x : V2;
  return { result: s(x), solvent: s(vv2 - vv1), factor: s((k === 3 ? x : C1) / (k === 2 ? x : C2), 8), note: vv2 < vv1 ? "Final volume is smaller than the stock volume — check the inputs." : "Add the solvent to the stock to reach the final volume." };
};
export const concentration: SciCalculator = (v) => {
  const g = pos(v.mass, 10), mw = mwOf(v), mL = pos(v.vol, 250), rho = pos(v.density, 1.0);
  if (!mL) throw new InputError("Solution volume must be positive.");
  const L = mL / 1000, mol = g / mw, solnG = rho * mL, solventKg = (solnG - g) / 1000;
  return { M: s(mol / L), wv: s((100 * g) / mL, 8), ww: s((100 * g) / solnG, 8), mgml: s((g * 1000) / mL, 8), ppm: s((g * 1e6) / solnG, 8), molal: solventKg > 0 ? s(mol / solventKg, 8) : "—" };
};
export const PH_MODE = ["From [H⁺] (mol/L)", "From [OH⁻]", "From pOH", "Strong acid concentration", "Strong base concentration", "Weak acid (Ka and concentration)", "Weak base (Kb and concentration)"];
export const ph: SciCalculator = (v) => {
  const m = pick(v.mode, 7), x = pos(v.x, 0.01), n = Math.max(1, pos(v.n, 1)), K = pos(v.K, 1.8e-5), Kw = 1e-14;
  let H: number;
  if (m === 0) H = x;
  else if (m === 1) H = Kw / x;
  else if (m === 2) H = Kw / 10 ** -num(v.x, 4);
  else if (m === 3) { const c = x * n; H = (c + Math.sqrt(c * c + 4 * Kw)) / 2; }
  else if (m === 4) { const c = x * n; H = Kw / ((c + Math.sqrt(c * c + 4 * Kw)) / 2); }
  else if (m === 5) H = (-K + Math.sqrt(K * K + 4 * K * x)) / 2;
  else H = Kw / ((-K + Math.sqrt(K * K + 4 * K * x)) / 2);
  if (!(H > 0)) throw new InputError("Enter a positive concentration.");
  const p = -Math.log10(H);
  return { pH: s(p, 8), pOH: s(14 - p, 8), H: s(H, 8), OH: s(Kw / H, 8), nature: p < 6.995 ? "Acidic" : p > 7.005 ? "Basic (alkaline)" : "Neutral", ionised: m >= 5 ? s((100 * (m === 5 ? H : Kw / H)) / x, 6) : "—" };
};
export const PPM_MODE = ["Convert a ppm value", "From solute and solution mass"];
export const ppm: SciCalculator = (v) => {
  const p = pick(v.mode, 2) === 0 ? pos(v.ppm, 250) : (pos(v.solute, 25) / 1000 / (pos(v.solution, 100) * 1000)) * 1e6;
  const mw = pos(v.mw, 0);
  return { ppm: s(p), ppb: s(p * 1000), pct: s(p / 1e4, 8), mgl: s(p, 10), molar: mw ? s(p / 1000 / mw, 8) : "enter molar mass" };
};
export const TITR_MODE = ["Find analyte concentration", "Find titrant volume needed"];
export const titration: SciCalculator = (v) => {
  const Ct = pos(v.ct, 0.1), Vt = pos(v.vt, 25), Va = pos(v.va, 20), Ca = pos(v.ca, 0.1), ra = pos(v.ra, 1), rt = pos(v.rt, 1);
  if (pick(v.mode, 2) === 0) {
    const molT = (Ct * Vt) / 1000, molA = (molT * ra) / rt;
    return { result: s(fin(molA / (Va / 1000))), unit: "mol/L analyte", molT: s(molT * 1000, 8), molA: s(molA * 1000, 8) };
  }
  const molA = (Ca * Va) / 1000, molT = (molA * rt) / ra;
  return { result: s(fin((molT / Ct) * 1000)), unit: "mL titrant", molT: s(molT * 1000, 8), molA: s(molA * 1000, 8) };
};
export const molality: SciCalculator = (v) => {
  const g = pos(v.mass, 10), mw = mwOf(v), kg = pos(v.solvent, 500) / 1000, i = pos(v.i, 1), Kf = pos(v.kf, 1.86), Kb = pos(v.kb, 0.512);
  if (!kg) throw new InputError("Solvent mass must be positive.");
  const mol = g / mw, m = mol / kg;
  return { m: s(m), mol: s(mol, 8), dTf: s(i * Kf * m, 8), dTb: s(i * Kb * m, 8), mw: s(mw, 8) };
};
export const HH_MODE = ["pH from concentrations", "Ratio for a target pH", "Buffer recipe (total concentration and volume)"];
export const henderson: SciCalculator = (v) => {
  const m = pick(v.mode, 3), pKa = num(v.pKa, 4.76);
  if (m === 0) {
    const A = pos(v.A, 0.1), HA = pos(v.HA, 0.1);
    if (!A || !HA) throw new InputError("Both concentrations must be positive.");
    return { pH: s(pKa + Math.log10(A / HA), 8), ratio: s(A / HA, 8), base: s(A), acid: s(HA), note: Math.abs(Math.log10(A / HA)) > 1 ? "Outside pKa ± 1 — weak buffering." : "Within pKa ± 1 — good buffer." };
  }
  const pH = num(v.target, 5), r = 10 ** (pH - pKa);
  const C = pos(v.C, 0.1), L = pos(v.vol, 1000) / 1000, nb = (C * L * r) / (1 + r), na = (C * L) / (1 + r);
  return { pH: s(pH, 8), ratio: s(r, 8), base: s(m === 2 ? nb * 1000 : r / (1 + r), 8), acid: s(m === 2 ? na * 1000 : 1 / (1 + r), 8), note: m === 2 ? "Base and acid shown in mmol." : "Base and acid shown as mole fractions." };
};
export const SG_MODE = ["From density", "From API gravity", "From mass and volume"];
export const specificGravity: SciCalculator = (v) => {
  const m = pick(v.mode, 3), ref = pos(v.ref, 0.99904);
  const SG = fin(m === 0 ? pos(v.density, 0.85) / ref : m === 1 ? 141.5 / (num(v.api, 35) + 131.5) : pos(v.mass, 850) / pos(v.vol, 1000) / ref);
  return { SG: s(SG, 8), density: s(SG * ref, 8), api: s(141.5 / SG - 131.5, 8), baume: s(SG >= 1 ? 145 - 145 / SG : 140 / SG - 130, 8), lbgal: s(SG * ref * 8.34540445, 8) };
};
export const OSM_MODE = ["Serum osmolality (Na, glucose, BUN)", "Solution osmolarity and osmotic pressure"];
export const osmolarity: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const na = pos(v.na, 140), glu = pos(v.glu, 90), bun = pos(v.bun, 14), eth = pos(v.eth, 0), meas = pos(v.meas, 0);
    const calc = 2 * na + glu / 18 + bun / 2.8 + eth / 3.7;
    return { osm: s(calc, 8), gap: meas ? s(meas - calc, 6) : "enter measured osmolality", pi: s((calc / 1000) * R_ATM * 310.15, 8), note: "Normal 275–295 mOsm/kg; gap above 10 suggests unmeasured osmoles." };
  }
  const M = pos(v.M, 0.15), i = pos(v.i, 2), T = num(v.T, 25) + 273.15;
  return { osm: s(M * i * 1000, 8), gap: "—", pi: s(i * M * R_ATM * T, 8), note: `π = iMRT = ${fmt(i * M * R_ATM * T * 101.325, 6)} kPa` };
};
const henderFrac = (pH: number, pKa: number) => 1 / (1 + 10 ** (pKa - pH));
export const PHOS_SALT = ["Sodium (NaH₂PO₄ + Na₂HPO₄, anhydrous)", "Sodium hydrates (NaH₂PO₄·H₂O + Na₂HPO₄·7H₂O)", "Potassium (KH₂PO₄ + K₂HPO₄)"];
const PHOS = [["NaH2PO4", "Na2HPO4"], ["NaH2PO4·H2O", "Na2HPO4·7H2O"], ["KH2PO4", "K2HPO4"]];
export const phosphateBuffer: SciCalculator = (v) => {
  const pH = num(v.pH, 7.4), C = pos(v.C, 0.1), L = pos(v.vol, 1000) / 1000, k = pick(v.salt, 3), pKa2 = num(v.pKa, 7.21);
  if (pH < 5.8 || pH > 8.0) throw new InputError("Phosphate buffers work from about pH 5.8 to 8.0 (pKa₂ 7.21).");
  const fb = henderFrac(pH, pKa2), mol = C * L, [ac, ba] = PHOS[k];
  return { mono: s(mol * (1 - fb) * formulaMass(ac), 8), di: s(mol * fb * formulaMass(ba), 8), ratio: s(fb / (1 - fb), 8), forms: `${ac} (monobasic) + ${ba} (dibasic)`, mmol: `${fmt(mol * (1 - fb) * 1000, 6)} mmol + ${fmt(mol * fb * 1000, 6)} mmol` };
};
export const PCT_MODE = ["Mass percent of a solution", "Percent composition of a compound", "Percent dilution (C₁% to C₂%)"];
export const percentDilution: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 1) {
    const c = parseFormula(txt(v, "formula") || "H2O"), M = sum(Array.from(c.counts.entries()).map(([el, n]) => n * elementMass(el)));
    return { result: s(M, 8), detail: Array.from(c.counts.entries()).map(([el, n]) => `${el}: ${fmt((100 * n * elementMass(el)) / M, 6)}%`).join("\n"), note: "Result = molar mass (g/mol)" };
  }
  if (m === 2) {
    const c1 = pos(v.c1, 70), c2 = pos(v.c2, 10), V2 = pos(v.v2, 100);
    if (c2 > c1) throw new InputError("You can't dilute to a higher percentage.");
    const V1 = fin((c2 * V2) / c1);
    return { result: s(V1, 8), detail: `Mix ${fmt(V1, 6)} of the ${fmt(c1)}% stock with ${fmt(V2 - V1, 6)} of water to make ${fmt(V2)} at ${fmt(c2)}%.`, note: "Result = volume of stock" };
  }
  const a = pos(v.solute, 15), b = pos(v.solvent, 85);
  return { result: s((100 * a) / (a + b), 8), detail: `${fmt(a)} g solute in ${fmt(a + b)} g of solution`, note: "Result = mass percent (% w/w)" };
};
export const NORM_MODE = ["From molarity and equivalents", "From mass, equivalent weight and volume"];
export const normality: SciCalculator = (v) => {
  const n = pos(v.n, 2);
  if (pick(v.mode, 2) === 0) {
    const M = pos(v.M, 0.5);
    return { N: s(M * n), M: s(M), eqw: pos(v.mw, 0) && n ? s(pos(v.mw, 0) / n, 8) : "enter molar mass" };
  }
  const g = pos(v.mass, 4.9), eqw = pos(v.eqw, 49.04), L = pos(v.vol, 1000) / 1000, N = fin(g / eqw / L);
  return { N: s(N), M: n ? s(N / n) : "—", eqw: s(eqw, 8) };
};
export const HLB_MODE = ["Blend two emulsifiers to a target HLB", "HLB of a blend", "Griffin HLB from molecular masses"];
export const hlb: SciCalculator = (v) => {
  const m = pick(v.mode, 3), A = num(v.hlbA, 15), B = num(v.hlbB, 4.3), total = pos(v.total, 10);
  if (m === 2) {
    const Mh = pos(v.mh, 440), M = pos(v.mtot, 600);
    return { result: s((20 * Mh) / M, 6), pctA: "—", pctB: "—", gA: "—", gB: "—" };
  }
  if (m === 1) {
    const wa = pos(v.wa, 60), wb = pos(v.wb, 40);
    return { result: s((wa * A + wb * B) / (wa + wb), 6), pctA: s((100 * wa) / (wa + wb), 6), pctB: s((100 * wb) / (wa + wb), 6), gA: s((total * wa) / (wa + wb), 6), gB: s((total * wb) / (wa + wb), 6) };
  }
  const t = num(v.target, 10);
  if (A === B) throw new InputError("The two emulsifiers need different HLB values.");
  const fa = (t - B) / (A - B);
  if (fa < 0 || fa > 1) throw new InputError("The target HLB must lie between the two emulsifiers' HLB values.");
  return { result: s(t, 6), pctA: s(100 * fa, 6), pctB: s(100 * (1 - fa), 6), gA: s(total * fa, 6), gB: s(total * (1 - fa), 6) };
};
export const STOCKS = ["Hydrogen peroxide 35% (1.13 g/mL)", "Hydrogen peroxide 30% (1.11 g/mL)", "Hydrogen peroxide 12% (1.04 g/mL)", "Hydrochloric acid 37% (1.18 g/mL)", "Sulfuric acid 98% (1.84 g/mL)", "Nitric acid 70% (1.41 g/mL)", "Acetic acid glacial 99.7% (1.05 g/mL)", "Phosphoric acid 85% (1.69 g/mL)", "Custom (enter below)"];
const STOCK_DATA: [number, number, string][] = [[35, 1.13, "H2O2"], [30, 1.11, "H2O2"], [12, 1.04, "H2O2"], [37, 1.18, "HCl"], [98, 1.84, "H2SO4"], [70, 1.41, "HNO3"], [99.7, 1.05, "CH3COOH"], [85, 1.69, "H3PO4"]];
export const acidDilution: SciCalculator = (v) => {
  const k = pick(v.stock, STOCKS.length), [pct, rho, f] = k < STOCK_DATA.length ? STOCK_DATA[k] : [pos(v.pct, 50), pos(v.rho, 1.2), ""];
  const target = pos(v.target, 3), V = pos(v.vol, 1000), rho2 = pos(v.rho2, 1.0);
  if (!(target < pct)) throw new InputError("The target strength must be lower than the stock strength.");
  const massFinal = V * rho2, massStock = (massFinal * target) / pct, volStock = massStock / rho;
  return { stock: s(volStock, 8), water: s(massFinal - massStock, 8), stockMass: s(massStock, 8), M: f ? s((pct * rho * 10) / formulaMass(f), 6) : "—", note: "Always add acid to water, never water to acid." };
};
export const HARD_MODE = ["From calcium and magnesium (mg/L)", "Convert a hardness value"];
export const HARD_UNITS = ["mg/L (ppm) as CaCO₃", "grains per gallon (gpg)", "German degrees °dH", "French degrees °fH", "mmol/L"];
const HARD_F = [1, 17.1185, 17.848, 10, 100.0869];
export const waterHardness: SciCalculator = (v) => {
  const ppm = pick(v.mode, 2) === 0 ? 2.497 * pos(v.ca, 40) + 4.118 * pos(v.mg, 10) : pos(v.value, 10) * HARD_F[pick(v.unit, 5)];
  const cls = ppm < 61 ? 0 : ppm < 121 ? 1 : ppm < 181 ? 2 : 3;
  return { ppm: s(ppm, 8), gpg: s(ppm / HARD_F[1], 8), dH: s(ppm / HARD_F[2], 8), fH: s(ppm / 10, 8), mmol: s(ppm / HARD_F[4], 8), cls };
};
export const HARD_CLASS = ["Soft (0–60 mg/L)", "Moderately hard (61–120 mg/L)", "Hard (121–180 mg/L)", "Very hard (> 180 mg/L)"];
export const RATIO_MEANING = ["1 part concentrate + X parts water", "1 part in X parts total"];
export const dilutionRatio: SciCalculator = (v) => {
  const X = pos(v.x, 10), total = pos(v.total, 1000), parts = pick(v.meaning, 2) === 0 ? 1 + X : X;
  if (parts < 1) throw new InputError("X must be at least 1.");
  const c = total / parts;
  return { concentrate: s(c, 8), water: s(total - c, 8), pct: s((100 * c) / total, 8), factor: s(parts, 8) };
};
export const PKA_MODE = ["Convert Ka ↔ pKa (and Kb, pKb)", "Ka from pH of a weak acid solution", "Kp from Kc (gas equilibrium)"];
export const pka: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 1) {
    const pH = num(v.pH, 2.87), C = pos(v.C, 0.1), H = 10 ** -pH;
    if (H >= C) throw new InputError("[H⁺] must be smaller than the acid concentration for a weak acid.");
    const Ka = (H * H) / (C - H);
    return { Ka: s(Ka, 8), pKa: s(-Math.log10(Ka), 8), Kb: s(1e-14 / Ka, 8), pKb: s(14 + Math.log10(Ka), 8) };
  }
  if (m === 2) {
    const Kc = pos(v.Kc, 0.5), T = num(v.T, 25) + 273.15, dn = num(v.dn, -2), Kp = Kc * (R_ATM * T) ** dn;
    return { Ka: s(Kp, 8), pKa: s(-Math.log10(Kp), 8), Kb: s(Kc, 8), pKb: s(dn, 4) };
  }
  const usePka = pick(v.input, 2) === 1, Ka = usePka ? 10 ** -num(v.pKaIn, 4.76) : pos(v.Ka, 1.8e-5);
  return { Ka: s(Ka, 8), pKa: s(-Math.log10(Ka), 8), Kb: s(1e-14 / Ka, 8), pKb: s(14 + Math.log10(Ka), 8) };
};
export const PKA_INPUT = ["I have Ka", "I have pKa"];
export const SOL_MODE = ["Molar solubility from Ksp", "Ksp from molar solubility"];
export const solubility: SciCalculator = (v) => {
  const x = Math.max(1, Math.round(pos(v.x, 1))), y = Math.max(1, Math.round(pos(v.y, 2))), mw = mwOf(v, "formula", "mw", 78.07), f = x ** x * y ** y;
  if (pick(v.mode, 2) === 0) {
    const Ksp = pos(v.ksp, 3.9e-11), sol = (Ksp / f) ** (1 / (x + y));
    return { s: s(sol, 8), gl: s(sol * mw, 8), ksp: s(Ksp, 8), ions: `[cation] = ${fmt(x * sol, 6)} M, [anion] = ${fmt(y * sol, 6)} M` };
  }
  const sol = pos(v.s, 2.1e-4);
  return { s: s(sol, 8), gl: s(sol * mw, 8), ksp: s(f * sol ** (x + y), 8), ions: `[cation] = ${fmt(x * sol, 6)} M, [anion] = ${fmt(y * sol, 6)} M` };
};
export const trisBuffer: SciCalculator = (v) => {
  const pH = num(v.pH, 8), T = num(v.T, 25), C = pos(v.C, 0.05), L = pos(v.vol, 1000) / 1000, hcl = pos(v.hcl, 1);
  const pKa = 8.07 - 0.028 * (T - 25), mol = C * L, fProt = 1 / (1 + 10 ** (pH - pKa));
  if (pH < pKa - 1.2 || pH > pKa + 1.2) throw new InputError(`Tris buffers best between pH ${fmt(pKa - 1, 3)} and ${fmt(pKa + 1, 3)} at ${fmt(T)} °C.`);
  return { base: s(mol * 121.14, 8), hcl: s(((mol * fProt) / hcl) * 1000, 8), pKa: s(pKa, 6), mix: `${fmt(mol * (1 - fProt) * 121.14, 6)} g Tris base + ${fmt(mol * fProt * 157.6, 6)} g Tris-HCl`, protonated: s(100 * fProt, 6) };
};
type Sys = { name: string; pKa: number[]; acid: [string, number]; salt: [string, number] };
const SYSTEMS: Sys[] = [
  { name: "Acetate (pKa 4.76)", pKa: [4.76], acid: ["acetic acid", 60.052], salt: ["sodium acetate trihydrate", 136.08] },
  { name: "Citrate (pKa 3.13, 4.76, 6.40)", pKa: [3.13, 4.76, 6.4], acid: ["citric acid monohydrate", 210.14], salt: ["trisodium citrate dihydrate", 294.1] },
  { name: "Histidine (pKa 6.04)", pKa: [6.04], acid: ["L-histidine HCl monohydrate", 209.63], salt: ["L-histidine", 155.15] },
  { name: "MES (pKa 6.15)", pKa: [6.15], acid: ["MES free acid", 195.24], salt: ["MES sodium salt", 217.22] },
  { name: "HEPES (pKa 7.48)", pKa: [7.48], acid: ["HEPES free acid", 238.3], salt: ["HEPES sodium salt", 260.29] },
  { name: "Carbonate-bicarbonate (pKa 10.33)", pKa: [10.33], acid: ["sodium bicarbonate", 84.007], salt: ["sodium carbonate", 105.99] },
];
export const BUFFER_SYSTEMS = SYSTEMS.map((x) => x.name);
export const citrateBuffer: SciCalculator = (v) => {
  const sys = SYSTEMS[pick(v.system, SYSTEMS.length)], pH = num(v.pH, 5), C = pos(v.C, 0.1), L = pos(v.vol, 1000) / 1000;
  const n = sys.pKa.length, hs = sys.pKa.map((_, i) => 10 ** ((i + 1) * pH - sum(sys.pKa.slice(0, i + 1))));
  const terms = [1, ...hs], tot = sum(terms), nbar = sum(terms.map((t, i) => (i * t) / tot)), f = nbar / n;
  const lo = sys.pKa[0] - 1, hi = sys.pKa[n - 1] + 1;
  const mol = C * L;
  return { acid: s(mol * (1 - f) * sys.acid[1], 8), salt: s(mol * f * sys.salt[1], 8), frac: s(100 * f, 6), forms: `${sys.acid[0]} (${sys.acid[1]} g/mol) + ${sys.salt[0]} (${sys.salt[1]} g/mol)`, range: pH < lo || pH > hi ? `Outside the useful range ${fmt(lo, 3)}–${fmt(hi, 3)}` : `Within the useful range ${fmt(lo, 3)}–${fmt(hi, 3)}` };
};
export const MF_MODE = ["Moles of each component", "Masses with formulas"];
export const moleFraction: SciCalculator = (v) => {
  let mol: number[], names: string[];
  if (pick(v.mode, 2) === 0) {
    mol = listOf(v, "moles", 2);
    names = mol.map((_, i) => `component ${i + 1}`);
  } else {
    const f = txt(v, "formulas").split(/[,;\s]+/).filter(Boolean), g = listOf(v, "masses", 2);
    if (f.length !== g.length) throw new InputError("Enter one mass per formula.");
    mol = g.map((x, i) => x / formulaMass(f[i]));
    names = f;
  }
  const T = sum(mol);
  if (!T) throw new InputError("Total moles can't be zero.");
  return { fractions: mol.map((m, i) => `${names[i]}: χ = ${fmt(m / T, 6)} (${fmt(m, 6)} mol)`).join("\n"), total: s(T, 8), first: s(mol[0] / T, 8) };
};
export const TDS_MODE = ["TDS from conductivity (EC)", "Conductivity from TDS"];
export const tds: SciCalculator = (v) => {
  const k = pos(v.k, 0.64);
  const ec = pick(v.mode, 2) === 0 ? pos(v.ec, 1000) : pos(v.tds, 640) / k;
  return { tds: s(ec * k, 8), ec: s(ec, 8), ms: s(ec / 1000, 8), ppm500: s(ec * 0.5, 8), ppm700: s(ec * 0.7, 8), cf: s(ec / 100, 6) };
};
export const ionicStrength: SciCalculator = (v) => {
  const c = listOf(v, "c", 1), z = listOf(v, "z", 1);
  if (c.length !== z.length) throw new InputError("Enter one charge per concentration.");
  const I = 0.5 * sum(c.map((ci, i) => ci * z[i] * z[i])), r = Math.sqrt(I);
  const davies = (zz: number) => 10 ** (-0.509 * zz * zz * (r / (1 + r) - 0.3 * I));
  return { I: s(I, 8), g1: s(davies(1), 6), g2: s(davies(2), 6), g3: s(davies(3), 6), dh: s(10 ** (-0.509 * r), 6) };
};
export const dissolvedOxygen: SciCalculator = (v) => {
  const t = num(v.T, 20), S = pos(v.S, 0), P = pos(v.P, 760) / 760, meas = pos(v.meas, 0);
  if (t < 0 || t > 50) throw new InputError("Valid for 0–50 °C.");
  const T = t + 273.15;
  const lnC = -139.34411 + 1.575701e5 / T - 6.642308e7 / T ** 2 + 1.2438e10 / T ** 3 - 8.621949e11 / T ** 4 - S * (0.017674 - 10.754 / T + 2140.7 / T ** 2);
  const C0 = Math.exp(lnC), Pwv = Math.exp(11.8571 - 3840.7 / T - 216961 / T ** 2), th = 0.000975 - 1.426e-5 * t + 6.436e-8 * t * t;
  const C = (C0 * P * ((1 - Pwv / P) * (1 - th * P))) / ((1 - Pwv) * (1 - th));
  return { sat: s(C, 6), pct: meas ? s((100 * meas) / C, 6) : "enter measured DO", sea: s(C0, 6), umol: s((C / 31.998) * 1000, 6) };
};

export const sciSolCustomCalculators: Record<string, SciCalculator> = {
  "molarity-calculator": molarity,
  "dilution-calculator": dilution,
  "concentration-calculator": concentration,
  "ph-calculator": ph,
  "ppm-calculator": ppm,
  "titration-calculator": titration,
  "molality-calculator": molality,
  "henderson-hasselbalch-calculator": henderson,
  "specific-gravity-calculator": specificGravity,
  "osmolarity-calculator": osmolarity,
  "phosphate-buffer-calculator": phosphateBuffer,
  "percent-dilution-calculator": percentDilution,
  "normality-calculator": normality,
  "hlb-calculator": hlb,
  "acid-dilution-calculator": acidDilution,
  "water-hardness-calculator": waterHardness,
  "dilution-ratio-calculator": dilutionRatio,
  "pka-calculator": pka,
  "solubility-calculator": solubility,
  "tris-buffer-calculator": trisBuffer,
  "citrate-buffer-calculator": citrateBuffer,
  "mole-fraction-calculator": moleFraction,
  "tds-conductivity-calculator": tds,
  "ionic-strength-calculator": ionicStrength,
  "dissolved-oxygen-calculator": dissolvedOxygen,
};
