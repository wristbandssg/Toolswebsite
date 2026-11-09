/**
 * Batch: "Science Calculators" → Chemistry (moles, reactions, atoms & electrochemistry — 27 tools).
 *
 * Built on sci-chem-core: formula parser + standard atomic weights, exact equation balancing,
 * electron configurations. Avogadro N_A = 6.02214076 × 10²³, F = 96,485.33212 C/mol,
 * R = 8.314462618 J/(mol·K). Lewis/VSEPR handles simple ABₙ molecules (one central atom).
 * Oxidation numbers follow the standard priority rules (F, group 1/2, H, O, halogens) and solve
 * the last unknown from the overall charge. ICE tables solve Q(x) = K by bisection on the
 * physically allowed range. See prisma/create-sci-mol-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";
import { formulaMass, parseFormula, molarMassOf, elementMass, balanceEquation, findElement, electronConfig } from "./sci-chem-core";

const s = (x: number, n = 10) => sig(x, n);
export const NA = 6.02214076e23, FARADAY = 96485.33212, R = 8.314462618;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const mwOf = (v: Vals, key = "formula", mwKey = "mw", def = 18.015) => {
  const f = txt(v, key);
  const m = f ? formulaMass(f) : pos(v[mwKey], def);
  if (!m) throw new InputError("Enter a formula or a molar mass.");
  return m;
};
/** Main-group number (1–18) for an atomic number. */
export const groupOf = (z: number): number => {
  const rows = [[1, 2], [3, 10], [11, 18], [19, 36], [37, 54], [55, 86], [87, 118]];
  const r = rows.findIndex(([a, b]) => z >= a && z <= b), i = z - rows[r][0];
  if (r === 0) return z === 1 ? 1 : 18;
  if (r <= 2) return i < 2 ? i + 1 : i + 11;
  if (r <= 4) return i + 1;
  return i < 2 ? i + 1 : i < 17 ? 3 : i - 13;
};
const valenceE = (z: number) => {
  const g = groupOf(z);
  return g <= 2 ? g : g >= 13 ? g - 10 : g;
};

export const molarMass: SciCalculator = (v) => {
  const f = txt(v, "formula") || "H2O", c = parseFormula(f), M = molarMassOf(c);
  const rows = Array.from(c.counts.entries()).map(([el, n]) => `${el} × ${fmt(n)}: ${fmt(n * elementMass(el), 8)} g/mol (${fmt((100 * n * elementMass(el)) / M, 6)}%)`);
  return { M: s(M, 10), composition: rows.join("\n"), atoms: s(sum(Array.from(c.counts.values())), 8), kgmol: s(M / 1000, 10), mass1: s(M / NA, 8) };
};
export const balance: SciCalculator = (v) => {
  const b = balanceEquation(txt(v, "eq") || "H2 + O2 = H2O"), all = [...b.reactants, ...b.products];
  const check = b.elements.map((el) => {
    let L = 0, Rr = 0;
    all.forEach((sp, i) => { const n = (parseFormula(sp).counts.get(el) ?? 0) * b.coeffs[i]; if (i < b.reactants.length) L += n; else Rr += n; });
    return `${el}: ${fmt(L)} = ${fmt(Rr)}`;
  });
  return { balanced: b.text, coefficients: b.coeffs.join(" : "), check: check.join(", "), type: b.reactants.length === 1 && b.products.length > 1 ? "Decomposition" : b.reactants.length > 1 && b.products.length === 1 ? "Synthesis (combination)" : b.reactants.some((r) => r === "O2") && b.products.some((p) => p === "CO2") ? "Combustion" : "Other / exchange" };
};
export const GM_MODE = ["Grams → moles", "Moles → grams", "Particles → moles"];
export const gramsToMoles: SciCalculator = (v) => {
  const mw = mwOf(v), m = pick(v.mode, 3), x = pos(v.x, 36.03);
  const mol = m === 0 ? x / mw : m === 1 ? x : x / NA;
  return { moles: s(mol), grams: s(mol * mw), particles: s(mol * NA), mw: s(mw, 8), mmol: s(mol * 1000) };
};
export const YIELD_MODE = ["Percent yield from actual and theoretical", "Actual yield from percent yield"];
export const percentYield: SciCalculator = (v) => {
  const th = pos(v.theo, 10);
  if (!th) throw new InputError("Theoretical yield must be positive.");
  if (pick(v.mode, 2) === 0) {
    const a = pos(v.actual, 8.5);
    return { result: s((100 * a) / th, 8), loss: s(th - a), note: a > th ? "Above 100% — product is probably wet or impure." : "Percent yield = actual ÷ theoretical × 100." };
  }
  const p = pos(v.pct, 85);
  return { result: s((th * p) / 100, 8), loss: s(th - (th * p) / 100), note: "Result = actual yield (same unit as theoretical)." };
};
const speciesTable = (eqText: string) => {
  const b = balanceEquation(eqText), all = [...b.reactants, ...b.products];
  return { b, all, mw: all.map(formulaMass) };
};
const findIdx = (all: string[], name: string) => {
  const i = all.findIndex((x) => x.replace(/\s/g, "") === name.replace(/\s/g, ""));
  if (i < 0) throw new InputError(`"${name}" isn't in the equation. Use exactly the formula as written there.`);
  return i;
};
export const stoichiometry: SciCalculator = (v) => {
  const { b, all, mw } = speciesTable(txt(v, "eq") || "C3H8 + O2 = CO2 + H2O"), gi = findIdx(all, txt(v, "given") || all[0]);
  const molG = pick(v.unit, 2) === 0 ? pos(v.amount, 44) / mw[gi] : pos(v.amount, 1), per = molG / b.coeffs[gi];
  return { balanced: b.text, table: all.map((sp, i) => `${sp}: ${fmt(per * b.coeffs[i], 8)} mol = ${fmt(per * b.coeffs[i] * mw[i], 8)} g`).join("\n"), extent: s(per, 8), givenMol: s(molG, 8) };
};
export const AMOUNT_UNIT = ["grams", "moles"];
export const pne: SciCalculator = (v) => {
  const e = findElement(txt(v, "element") || "C"), A = Math.round(pos(v.A, 0)) || Math.round(e.mass), q = Math.round(num(v.charge, 0));
  if (A < e.z) throw new InputError(`Mass number must be at least the atomic number (${e.z}).`);
  return { protons: e.z, neutrons: A - e.z, electrons: e.z - q, name: `${e.name} (${e.sym}), isotope ${e.sym}-${A}${q ? `, ion charge ${q > 0 ? "+" : ""}${q}` : ""}`, mass: s(e.mass, 8), config: electronConfig(e.z).short };
};
export const empiricalFormula: SciCalculator = (v) => {
  const els = txt(v, "elements").split(/[,;\s]+/).filter(Boolean).map((x) => findElement(x).sym), amt = listOf(v, "amounts", 1);
  if (els.length !== amt.length) throw new InputError("Enter one amount per element.");
  const mol = amt.map((a, i) => a / elementMass(els[i])), mn = Math.min(...mol.filter((x) => x > 0));
  const ratio = mol.map((x) => x / mn);
  let mult = 1;
  for (let k = 1; k <= 12; k++) if (ratio.every((r) => Math.abs(r * k - Math.round(r * k)) < 0.08 * k ** 0.5)) { mult = k; break; }
  const sub = ratio.map((r) => Math.round(r * mult));
  const emp = els.map((el, i) => `${el}${sub[i] === 1 ? "" : sub[i]}`).join(""), em = formulaMass(emp), M = pos(v.M, 0);
  const n = M ? Math.max(1, Math.round(M / em)) : 1;
  return { empirical: emp, empMass: s(em, 8), molecular: M ? els.map((el, i) => `${el}${sub[i] * n === 1 ? "" : sub[i] * n}`).join("") : "enter molar mass", ratios: ratio.map((r, i) => `${els[i]}: ${fmt(r, 5)}`).join(", ") };
};
export const electronConfiguration: SciCalculator = (v) => {
  const e = findElement(txt(v, "element") || "Fe"), c = electronConfig(e.z), z = e.z;
  const period = z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7;
  const last = c.orbitals[c.orbitals.length - 1][0];
  const block = (z >= 57 && z <= 71) || (z >= 89 && z <= 103) ? "f" : groupOf(z) <= 2 || z === 2 ? "s" : groupOf(z) >= 13 ? "p" : "d";
  return { short: c.short, full: c.full, valence: c.valence, unpaired: c.unpaired, info: `${e.name}, Z = ${z}, period ${period}, ${block}-block, group ${groupOf(z)}; last subshell filled ${last}`, magnetic: c.unpaired ? "Paramagnetic" : "Diamagnetic" };
};
export const AAM_MODE = ["Average from isotopes", "Abundances of two isotopes from the average"];
export const averageAtomicMass: SciCalculator = (v) => {
  const m = listOf(v, "masses", 1);
  if (pick(v.mode, 2) === 1) {
    if (m.length !== 2) throw new InputError("Enter exactly two isotope masses.");
    const avg = pos(v.avg, 63.546), f = (avg - m[1]) / (m[0] - m[1]);
    if (f < 0 || f > 1) throw new InputError("The average must lie between the two isotope masses.");
    return { avg: s(avg, 10), detail: `Isotope 1: ${fmt(100 * f, 8)}%, isotope 2: ${fmt(100 * (1 - f), 8)}%`, total: 100 };
  }
  const a = listOf(v, "abund", 1);
  if (a.length !== m.length) throw new InputError("Enter one abundance per isotope.");
  const T = sum(a);
  return { avg: s(sum(m.map((x, i) => (x * a[i]) / T)), 10), detail: T !== 100 ? `Abundances summed to ${fmt(T)} — normalised to 100%.` : "Abundances sum to 100%.", total: s(T, 8) };
};
export const limitingReactant: SciCalculator = (v) => {
  const { b, all, mw } = speciesTable(txt(v, "eq") || "N2 + H2 = NH3"), g = listOf(v, "masses", 1);
  if (g.length !== b.reactants.length) throw new InputError(`Enter one mass for each of the ${b.reactants.length} reactants, in order.`);
  const ext = g.map((x, i) => x / mw[i] / b.coeffs[i]), lim = ext.indexOf(Math.min(...ext)), e = ext[lim];
  return { limiting: `${all[lim]} is the limiting reactant`, balanced: b.text, products: b.products.map((p, j) => { const i = b.reactants.length + j; return `${p}: ${fmt(e * b.coeffs[i] * mw[i], 8)} g (${fmt(e * b.coeffs[i], 6)} mol)`; }).join("\n"), excess: b.reactants.map((r, i) => (i === lim ? `${r}: 0 g left` : `${r}: ${fmt(g[i] - e * b.coeffs[i] * mw[i], 8)} g left`)).join("\n") };
};
export const theoreticalYield: SciCalculator = (v) => {
  const { b, all, mw } = speciesTable(txt(v, "eq") || "CaCO3 = CaO + CO2"), ri = findIdx(all, txt(v, "reactant") || all[0]), pi = findIdx(all, txt(v, "product") || all[all.length - 1]);
  const e = pos(v.mass, 100) / mw[ri] / b.coeffs[ri], y = e * b.coeffs[pi] * mw[pi], act = pos(v.actual, 0);
  return { yield: s(y, 10), moles: s(e * b.coeffs[pi], 8), pct: act ? s((100 * act) / y, 8) : "enter actual yield", balanced: b.text };
};
export const HL_MODE = ["Amount remaining after time", "Time to decay to an amount", "Half-life from a measurement"];
export const halfLife: SciCalculator = (v) => {
  const m = pick(v.mode, 3), N0 = pos(v.N0, 100);
  let t12 = pos(v.half, 5730), t = pos(v.t, 1000), N = pos(v.N, 50);
  if (m === 2) t12 = fin((t * Math.LN2) / Math.log(N0 / N));
  if (m === 1) t = fin((t12 * Math.log(N0 / N)) / Math.LN2);
  if (m === 0) N = N0 * 0.5 ** (t / t12);
  const lam = Math.LN2 / t12;
  return { result: s(m === 0 ? N : m === 1 ? t : t12), N: s(N), fraction: s((100 * N) / N0, 8), lambda: s(lam), tau: s(1 / lam), halves: s(t / t12, 8) };
};
export const NERNST_MODE = ["Electrochemical cell: E = E° − (RT/nF) ln Q", "Ion equilibrium (membrane) potential", "Goldman-Hodgkin-Katz (K⁺, Na⁺, Cl⁻)"];
export const nernst: SciCalculator = (v) => {
  const m = pick(v.mode, 3), T = num(v.T, 37) + 273.15, RTF = (R * T) / FARADAY;
  if (m === 0) {
    const E0 = num(v.E0, 1.1), n = Math.max(1, pos(v.n, 2)), Q = pos(v.Q, 0.01);
    const E = E0 - (RTF / n) * Math.log(Q);
    return { E: s(E, 8), mv: s(E * 1000, 8), note: `ΔG = −nFE = ${fmt((-n * FARADAY * E) / 1000, 6)} kJ/mol` };
  }
  if (m === 1) {
    const z = num(v.z, 1), co = pos(v.cout, 5), ci = pos(v.cin, 140);
    if (!z) throw new InputError("Ion charge can't be zero.");
    const E = (RTF / z) * Math.log(co / ci);
    return { E: s(E, 8), mv: s(E * 1000, 8), note: `${fmt(RTF * 1000, 6)} mV per e-fold at ${fmt(T - 273.15)} °C` };
  }
  const pK = pos(v.pK, 1), pNa = pos(v.pNa, 0.04), pCl = pos(v.pCl, 0.45), Ko = pos(v.Ko, 5), Ki = pos(v.Ki, 140), Nao = pos(v.Nao, 145), Nai = pos(v.Nai, 15), Clo = pos(v.Clo, 110), Cli = pos(v.Cli, 10);
  const E = RTF * Math.log((pK * Ko + pNa * Nao + pCl * Cli) / (pK * Ki + pNa * Nai + pCl * Clo));
  return { E: s(E, 8), mv: s(E * 1000, 8), note: "Resting membrane potential (inside relative to outside)" };
};
export const MM_MODE = ["Moles → particles", "Particles → moles", "Grams → particles"];
export const molesToMolecules: SciCalculator = (v) => {
  const m = pick(v.mode, 3), x = pos(v.x, 2), f = txt(v, "formula");
  const mol = m === 0 ? x : m === 1 ? x / NA : x / mwOf(v);
  const atomsPer = f ? sum(Array.from(parseFormula(f).counts.values())) : pos(v.atoms, 1);
  return { particles: s(mol * NA), moles: s(mol), atoms: s(mol * NA * atomsPer), grams: f || pos(v.mw, 0) ? s(mol * mwOf(v)) : "enter formula" };
};
const GEOM: Record<string, [string, string]> = {
  "2,0": ["Linear", "180°"], "3,0": ["Trigonal planar", "120°"], "2,1": ["Bent", "< 120° (~117°)"], "4,0": ["Tetrahedral", "109.5°"], "3,1": ["Trigonal pyramidal", "~107°"], "2,2": ["Bent", "~104.5°"],
  "5,0": ["Trigonal bipyramidal", "90°, 120°"], "4,1": ["Seesaw", "< 90°, < 120°"], "3,2": ["T-shaped", "< 90°"], "2,3": ["Linear", "180°"], "6,0": ["Octahedral", "90°"], "5,1": ["Square pyramidal", "< 90°"], "4,2": ["Square planar", "90°"],
  "1,0": ["Linear (diatomic)", "—"], "1,1": ["Linear", "—"], "1,2": ["Linear", "—"], "1,3": ["Linear", "—"],
};
export const lewis: SciCalculator = (v) => {
  const c = parseFormula(txt(v, "formula") || "CO2"), q = c.charge || Math.round(num(v.charge, 0));
  const entries = Array.from(c.counts.entries());
  const total = sum(entries.map(([el, n]) => valenceE(findElement(el).z) * n)) - q;
  const nonH = entries.filter(([el]) => el !== "H");
  const centralEl = (nonH.find(([, n]) => n === 1) ?? nonH[0] ?? entries[0])[0];
  const terminals = entries.flatMap(([el, n]) => Array(el === centralEl ? n - 1 : n).fill(el)) as string[];
  const B = terminals.length;
  let left = total - 2 * B;
  let termLone = 0;
  for (const t of terminals) if (t !== "H") { const need = Math.min(6, Math.max(0, left)); termLone += need; left -= need; }
  let centralLone = Math.max(0, left), multiple = 0;
  const cz = findElement(centralEl).z, expand = cz > 10;
  let centralE = 2 * B + centralLone;
  while (centralE < 8 && termLone >= 2 && !["B", "Be", "Al"].includes(centralEl) && multiple < 2 * B) {
    termLone -= 2;
    multiple++;
    centralE += 2;
  }
  if (!expand && centralE > 8 && centralLone) centralLone = Math.max(0, centralLone - (centralE - 8));
  const lp = Math.floor(centralLone / 2), g = GEOM[`${B},${lp}`] ?? ["—", "—"];
  return { total, central: centralEl, bonds: `${B} bonding domain(s), ${multiple} extra bond pair(s) (double/triple bonds)`, lonePairs: lp, geometry: g[0], angle: g[1], steric: B + lp, octet: centralE < 8 ?"Central atom has an incomplete octet" : centralE > 8 ? "Expanded octet" : "Octet satisfied" };
};
export const formalCharge: SciCalculator = (v) => {
  const el = txt(v, "element"), V = el ? valenceE(findElement(el).z) : pos(v.V, 6), N = pos(v.N, 4), B = pos(v.B, 4);
  const fc = V - N - B / 2;
  return { fc: s(fc, 6), V, detail: `FC = ${fmt(V)} − ${fmt(N)} − ${fmt(B)}/2` };
};
const EN: Record<string, number> = { F: 3.98, O: 3.44, Cl: 3.16, N: 3.04, Br: 2.96, I: 2.66, S: 2.58, C: 2.55, Se: 2.55, H: 2.2, P: 2.19, As: 2.18, B: 2.04, Si: 1.9 };
const COMMON_NEG: Record<string, number> = { N: -3, P: -3, As: -3, C: -4, Si: -4, S: -2, Se: -2, Te: -2, Cl: -1, Br: -1, I: -1, O: -2, H: -1, B: -3 };
export const oxidationNumber: SciCalculator = (v) => {
  const c = parseFormula(txt(v, "formula") || "KMnO4"), q = c.charge || Math.round(num(v.charge, 0));
  const ox = new Map<string, number>(), ent = Array.from(c.counts.entries());
  if (ent.length === 1) ox.set(ent[0][0], q / ent[0][1]);
  else {
    const has = (el: string) => c.counts.has(el), metalsOnly = ent.every(([el]) => el === "H" || groupOf(findElement(el).z) <= 2);
    if (has("F")) ox.set("F", -1);
    for (const [el] of ent) { const g = groupOf(findElement(el).z); if (el !== "H" && g === 1) ox.set(el, 1); else if (g === 2 && el !== "He") ox.set(el, 2); }
    if (has("Al")) ox.set("Al", 3);
    if (has("H")) ox.set("H", metalsOnly ? -1 : 1);
    if (has("O") && !has("F")) ox.set("O", -2);
    const unknown = () => ent.filter(([el]) => !ox.has(el));
    while (unknown().length > 1) {
      const u = unknown().sort((a, b) => (EN[b[0]] ?? 1.5) - (EN[a[0]] ?? 1.5))[0][0];
      ox.set(u, COMMON_NEG[u] ?? -1);
    }
    const u = unknown();
    if (u.length === 1) {
      const known = sum(ent.filter(([el]) => ox.has(el)).map(([el, n]) => (ox.get(el) ?? 0) * n));
      ox.set(u[0][0], (q - known) / u[0][1]);
    }
  }
  let total = sum(ent.map(([el, n]) => (ox.get(el) ?? 0) * n));
  // Peroxides/superoxides (H2O2, Na2O2, KO2): the fixed −2 for O doesn't balance — solve O instead.
  if (Math.abs(total - q) > 1e-9 && c.counts.has("O") && ent.length > 1) {
    const others = sum(ent.filter(([el]) => el !== "O").map(([el, n]) => (ox.get(el) ?? 0) * n));
    ox.set("O", (q - others) / c.counts.get("O")!);
    total = q;
  }
  return { states: ent.map(([el]) => `${el}: ${(ox.get(el) ?? 0) > 0 ? "+" : ""}${fmt(ox.get(el) ?? 0, 4)}`).join(", "), check: `Sum = ${fmt(total, 6)} (charge ${q})`, note: ent.some(([el]) => !Number.isInteger(ox.get(el) ?? 0)) ? "Fractional value = average over atoms of that element." : "Assigned with standard rules." };
};
export const ARR_MODE = ["Rate constant k from A, Ea and T", "Activation energy from two rate constants", "k at a new temperature"];
export const arrhenius: SciCalculator = (v) => {
  const m = pick(v.mode, 3), T1 = num(v.T1, 25) + 273.15, T2 = num(v.T2, 35) + 273.15, Ea = pos(v.Ea, 50) * 1000;
  if (m === 0) {
    const A = pos(v.A, 1e13), k = A * Math.exp(-Ea / (R * T1));
    return { result: s(k), detail: `k = A·e^(−Ea/RT) at ${fmt(T1, 6)} K`, ratio: s(Math.exp((-Ea / R) * (1 / T2 - 1 / T1)), 8) };
  }
  if (m === 1) {
    const k1 = pos(v.k1, 0.01), k2 = pos(v.k2, 0.02), E = fin((R * Math.log(k2 / k1)) / (1 / T1 - 1 / T2));
    return { result: s(E / 1000, 8), detail: `Ea in kJ/mol; pre-factor A = ${fmt(k1 / Math.exp(-E / (R * T1)), 6)}`, ratio: s(k2 / k1, 8) };
  }
  const k1 = pos(v.k1, 0.01), k2 = k1 * Math.exp((-Ea / R) * (1 / T2 - 1 / T1));
  return { result: s(k2), detail: `k at ${fmt(T2, 6)} K`, ratio: s(k2 / k1, 8) };
};
export const equilibriumConstant: SciCalculator = (v) => {
  const co = [pos(v.a, 1), pos(v.b, 1), pos(v.c, 2), pos(v.d, 0)], init = [pos(v.A0, 1), pos(v.B0, 1), pos(v.C0, 0), pos(v.D0, 0)];
  if (pick(v.mode, 2) === 1) {
    const eq = [pos(v.A0, 1), pos(v.B0, 1), pos(v.C0, 0.5), pos(v.D0, 0)];
    const K = ((co[2] ? eq[2] ** co[2] : 1) * (co[3] ? eq[3] ** co[3] : 1)) / ((co[0] ? eq[0] ** co[0] : 1) * (co[1] ? eq[1] ** co[1] : 1));
    return { K: s(fin(K), 8), conc: "—", x: "—", direction: "Kc from equilibrium concentrations" };
  }
  const K = pos(v.K, 50);
  const Q = (x: number) => { const c = init.map((c0, i) => c0 + (i < 2 ? -1 : 1) * co[i] * x); return ((co[2] ? c[2] ** co[2] : 1) * (co[3] ? c[3] ** co[3] : 1)) / ((co[0] ? c[0] ** co[0] : 1) * (co[1] ? c[1] ** co[1] : 1)); };
  const lo = -Math.min(...[2, 3].filter((i) => co[i]).map((i) => init[i] / co[i]), Infinity), hi = Math.min(...[0, 1].filter((i) => co[i]).map((i) => init[i] / co[i]), Infinity);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new InputError("Use at least one reactant and one product coefficient.");
  let a = lo + 1e-15 * Math.max(1, Math.abs(lo)), b = hi - 1e-15 * Math.max(1, hi);
  const f = (x: number) => Math.log(Q(x)) - Math.log(K);
  for (let i = 0; i < 300; i++) { const mid = (a + b) / 2; if (f(mid) > 0 || !Number.isFinite(f(mid)) && mid > 0) b = mid; else a = mid; }
  const x = (a + b) / 2, c = init.map((c0, i) => c0 + (i < 2 ? -1 : 1) * co[i] * x);
  return { K: s(K, 8), conc: ["A", "B", "C", "D"].map((n, i) => (co[i] ? `[${n}] = ${fmt(c[i], 8)} M` : "")).filter(Boolean).join(", "), x: s(x, 10), direction: x >= 0 ? "Shifts toward products" : "Shifts toward reactants" };
};
export const ICE_MODE = ["Equilibrium concentrations from K (ICE table)", "K from equilibrium concentrations"];
export const BEER_SOLVE = ["Absorbance A", "Molar absorptivity ε", "Concentration c"];
export const beerLambert: SciCalculator = (v) => {
  const k = pick(v.solve, 3), l = pos(v.l, 1), T = pos(v.T, 0);
  const A = T ? -Math.log10(T / 100) : num(v.A, 0.5), e = pos(v.e, 6220), c = pos(v.c, 1e-4);
  const x = fin(k === 0 ? e * l * c : k === 1 ? A / (l * c) : A / (e * l));
  const AA = k === 0 ? x : A;
  return { result: s(x), A: s(AA, 8), transmittance: s(100 * 10 ** -AA, 8), absorbed: s(100 - 100 * 10 ** -AA, 8) };
};
export const DENS_SOLVE = ["Density ρ", "Mass m", "Volume V"];
export const density: SciCalculator = (v) => {
  const k = pick(v.solve, 3), rho = pos(v.rho, 1), m = pos(v.m, 100), V = pos(v.V, 100);
  const x = fin(k === 0 ? m / V : k === 1 ? rho * V : m / rho), r = k === 0 ? x : rho;
  return { result: s(x), kgm3: s(r * 1000, 8), lbft3: s(r * 62.42796, 8), sg: s(r / 0.99997, 8) };
};
export const RATE_MODE = ["Rate from rate law", "Reaction order from initial rates", "Integrated rate law (concentration after time)"];
export const ORDER = ["Zero order", "First order", "Second order"];
export const rateLaw: SciCalculator = (v) => {
  const m = pick(v.mode, 3), k = pos(v.k, 0.1);
  if (m === 0) {
    const A = pos(v.A, 0.5), B = pos(v.B, 0.2), ma = num(v.m, 1), nb = num(v.n, 1);
    return { result: s(k * A ** ma * B ** nb), detail: `rate = ${fmt(k)}·[A]^${fmt(ma)}·[B]^${fmt(nb)}; overall order ${fmt(ma + nb)}`, half: "—" };
  }
  if (m === 1) {
    const A1 = pos(v.A, 0.1), A2 = pos(v.A2, 0.2), r1 = pos(v.r1, 0.002), r2 = pos(v.r2, 0.008), ord = fin(Math.log(r2 / r1) / Math.log(A2 / A1));
    return { result: s(ord, 6), detail: `order in A ≈ ${Math.round(ord)}; k = ${fmt(r1 / A1 ** Math.round(ord), 6)}`, half: "—" };
  }
  const o = pick(v.order, 3), A0 = pos(v.A0, 1), t = pos(v.t, 10);
  const At = o === 0 ? Math.max(0, A0 - k * t) : o === 1 ? A0 * Math.exp(-k * t) : 1 / (1 / A0 + k * t);
  const half = o === 0 ? A0 / (2 * k) : o === 1 ? Math.LN2 / k : 1 / (k * A0);
  return { result: s(At), detail: `[A]t after ${fmt(t)} time units (${ORDER[o].toLowerCase()})`, half: s(half, 8) };
};
const MO_DIATOMIC = (ve: number, mixing: boolean) => {
  const order = mixing ? [["σ2s", 2, 1], ["σ*2s", 2, -1], ["π2p", 4, 1], ["σ2p", 2, 1], ["π*2p", 4, -1], ["σ*2p", 2, -1]] : [["σ2s", 2, 1], ["σ*2s", 2, -1], ["σ2p", 2, 1], ["π2p", 4, 1], ["π*2p", 4, -1], ["σ*2p", 2, -1]];
  let left = ve, b = 0, a = 0, unp = 0;
  const conf: string[] = [];
  for (const [name, cap, sign] of order as [string, number, number][]) {
    const k = Math.min(cap, left);
    if (!k) break;
    left -= k;
    conf.push(`(${name})${k}`);
    if (sign > 0) b += k; else a += k;
    unp += cap === 4 ? (k <= 2 ? k : 4 - k) : k === 1 ? 1 : 0;
  }
  return { b, a, unp, conf: conf.join(" ") };
};
export const BO_MODE = ["Diatomic molecule or ion (MO theory)", "From electron counts"];
export const bondOrder: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const b = pos(v.b, 10), a = pos(v.a, 4);
    return { order: s((b - a) / 2, 6), detail: `(${fmt(b)} − ${fmt(a)})/2`, magnetic: "—", config: "—" };
  }
  const c = parseFormula(txt(v, "formula") || "O2"), atoms = Array.from(c.counts.entries()).flatMap(([el, n]) => Array(n).fill(el)) as string[];
  if (atoms.length !== 2) throw new InputError("Enter a diatomic species such as O2, N2^+, CO or NO^-.");
  const zs = atoms.map((a) => findElement(a).z);
  if (zs.some((z) => z > 10)) throw new InputError("MO diagram covers H through Ne.");
  if (zs.every((z) => z <= 2)) {
    const e = zs[0] + zs[1] - c.charge, b = Math.min(2, e), a = Math.max(0, e - 2);
    return { order: s((b - a) / 2, 6), detail: `σ1s ${b}, σ*1s ${a}`, magnetic: (b === 1 || a === 1) ? "Paramagnetic" : "Diamagnetic", config: `(σ1s)${b}${a ? ` (σ*1s)${a}` : ""}` };
  }
  const ve = zs.map((z) => valenceE(z)).reduce((p, q) => p + q, 0) - c.charge, mo = MO_DIATOMIC(ve, ve <= 14);
  return { order: s((mo.b - mo.a) / 2, 6), detail: `bonding ${mo.b}, antibonding ${mo.a} valence electrons`, magnetic: mo.unp ? `Paramagnetic (${mo.unp} unpaired)` : "Diamagnetic", config: mo.conf };
};
export const unsaturation: SciCalculator = (v) => {
  const c = parseFormula(txt(v, "formula") || "C6H6"), g = (el: string) => c.counts.get(el) ?? 0;
  const X = g("F") + g("Cl") + g("Br") + g("I"), C = g("C") + g("Si"), N = g("N") + g("P"), H = g("H") + g("Li") + g("Na") + g("K");
  const d = (2 * C + 2 + N - H - X) / 2;
  return { dou: s(d, 6), detail: `DoU = (2C + 2 + N − H − X)/2 = (2·${C} + 2 + ${N} − ${H} − ${X})/2`, meaning: d < 0 || !Number.isInteger(d) ? "Check the formula — DoU should be a whole number ≥ 0." : `${fmt(d)} ring(s) and/or π bond(s)` };
};
const gcdI = (a: number, b: number): number => (b ? gcdI(b, a % b) : Math.abs(a));
export const MILLER_MODE = ["Miller indices from intercepts", "d-spacing for (hkl) in a cubic lattice"];
export const miller: SciCalculator = (v) => {
  const a = pos(v.a, 0.3615);
  let h: number, k: number, l: number;
  if (pick(v.mode, 2) === 0) {
    const ints = txt(v, "intercepts").split(/[,;\s]+/).filter(Boolean);
    if (ints.length !== 3) throw new InputError("Enter three intercepts, using inf (or ∞) for parallel axes.");
    const rec = ints.map((x) => (/^(inf|∞|infinity)$/i.test(x) ? 0 : 1 / Number(x)));
    if (rec.some((x) => !Number.isFinite(x))) throw new InputError("Intercepts must be numbers or inf.");
    let m = 1;
    for (let q = 1; q <= 60; q++) if (rec.every((r) => Math.abs(r * q - Math.round(r * q)) < 1e-6)) { m = q; break; }
    let ix = rec.map((r) => Math.round(r * m));
    const g = ix.reduce((p, q) => gcdI(p, q), 0) || 1;
    ix = ix.map((x) => x / g);
    [h, k, l] = ix;
  } else [h, k, l] = [Math.round(num(v.h, 1)), Math.round(num(v.k, 1)), Math.round(num(v.l, 1))];
  const sq = h * h + k * k + l * l;
  const bar = (x: number) => (x < 0 ? `${-x}̄` : String(x));
  return { hkl: `(${bar(h)} ${bar(k)} ${bar(l)})`, d: sq ? s(a / Math.sqrt(sq), 8) : "—", sum: sq, bragg: sq ? s((2 * Math.asin(Math.min(1, 0.15406 / (2 * (a / Math.sqrt(sq))))) * 180) / Math.PI, 8) : "—" };
};
const HALF: [string, number, number][] = [["F₂/F⁻", 2.87, 2], ["Au³⁺/Au", 1.5, 3], ["Cl₂/Cl⁻", 1.36, 2], ["O₂/H₂O (acid)", 1.23, 4], ["Br₂/Br⁻", 1.07, 2], ["Ag⁺/Ag", 0.8, 1], ["Fe³⁺/Fe²⁺", 0.77, 1], ["I₂/I⁻", 0.54, 2], ["Cu²⁺/Cu", 0.34, 2], ["H⁺/H₂", 0, 2], ["Pb²⁺/Pb", -0.13, 2], ["Sn²⁺/Sn", -0.14, 2], ["Ni²⁺/Ni", -0.25, 2], ["Fe²⁺/Fe", -0.44, 2], ["Zn²⁺/Zn", -0.76, 2], ["Al³⁺/Al", -1.66, 3], ["Mg²⁺/Mg", -2.37, 2], ["Na⁺/Na", -2.71, 1], ["Li⁺/Li", -3.04, 1]];
export const HALF_CELLS = HALF.map(([n, e]) => `${n} (E° = ${e >= 0 ? "+" : ""}${e.toFixed(2)} V)`);
export const cellPotential: SciCalculator = (v) => {
  const c = HALF[pick(v.cathode, HALF.length)], a = HALF[pick(v.anode, HALF.length)], T = num(v.T, 25) + 273.15, Q = pos(v.Q, 1);
  const n = pos(v.n, 0) || (c[2] * a[2]) / gcdI(c[2], a[2]), E0 = c[1] - a[1], E = E0 - ((R * T) / (n * FARADAY)) * Math.log(Q || 1);
  return { E0: s(E0, 6), E: s(E, 8), dG: s((-n * FARADAY * E0) / 1000, 8), K: s(Math.exp((n * FARADAY * E0) / (R * T)), 6), spont: E > 0 ? "Spontaneous (galvanic)" : "Non-spontaneous (needs electrolysis)", n };
};
const METALS: [string, number, number, number][] = [["Copper (Cu²⁺)", 63.546, 2, 8.96], ["Nickel (Ni²⁺)", 58.693, 2, 8.908], ["Zinc (Zn²⁺)", 65.38, 2, 7.14], ["Chromium (Cr⁶⁺, hard chrome)", 51.996, 6, 7.19], ["Silver (Ag⁺)", 107.87, 1, 10.49], ["Gold (Au⁺, cyanide bath)", 196.97, 1, 19.32], ["Tin (Sn²⁺)", 118.71, 2, 7.27], ["Cadmium (Cd²⁺)", 112.41, 2, 8.65]];
export const PLATING_METALS = METALS.map((m) => m[0]);
export const electroplating: SciCalculator = (v) => {
  const [, M, n, rho] = METALS[pick(v.metal, METALS.length)], I = pos(v.I, 2), t = pos(v.t, 30) * 60, A = pos(v.area, 50), eff = pos(v.eff, 95) / 100;
  const Q = I * t, mass = (Q * eff * M) / (n * FARADAY);
  return { mass: s(mass, 8), thickness: A ? s((mass / (rho * A)) * 1e4, 8) : "enter area", charge: s(Q, 8), density: A ? s((I / A) * 100, 6) : "—", rate: A ? s((mass / (rho * A)) * 1e4 / (t / 3600), 6) : "—" };
};

export const sciMolCustomCalculators: Record<string, SciCalculator> = {
  "molar-mass-calculator": molarMass,
  "balancing-chemical-equations-calculator": balance,
  "grams-to-moles-calculator": gramsToMoles,
  "percent-yield-calculator": percentYield,
  "stoichiometry-calculator": stoichiometry,
  "protons-neutrons-electrons-calculator": pne,
  "empirical-formula-calculator": empiricalFormula,
  "electron-configuration-calculator": electronConfiguration,
  "average-atomic-mass-calculator": averageAtomicMass,
  "limiting-reactant-calculator": limitingReactant,
  "theoretical-yield-calculator": theoreticalYield,
  "half-life-calculator": halfLife,
  "nernst-equation-calculator": nernst,
  "moles-to-molecules-calculator": molesToMolecules,
  "lewis-structure-calculator": lewis,
  "formal-charge-calculator": formalCharge,
  "oxidation-number-calculator": oxidationNumber,
  "arrhenius-equation-calculator": arrhenius,
  "equilibrium-constant-calculator": equilibriumConstant,
  "beer-lambert-law-calculator": beerLambert,
  "density-calculator": density,
  "rate-law-calculator": rateLaw,
  "bond-order-calculator": bondOrder,
  "degree-of-unsaturation-calculator": unsaturation,
  "miller-indices-calculator": miller,
  "cell-potential-calculator": cellPotential,
  "electroplating-calculator": electroplating,
};

