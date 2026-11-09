/**
 * Batch: "Science Calculators" → Chemistry (gas laws & chemical thermodynamics — 12 tools).
 *
 * R = 8.314462618 J/(mol·K) = 0.08314462618 L·bar/(mol·K). Temperatures entered in °C and
 * converted to kelvin. Molar volume at STP: 22.711 L/mol (IUPAC, 0 °C and 100 kPa) and
 * 22.414 L/mol (0 °C, 1 atm). Water boiling point from the Antoine equation (two ranges); other
 * liquids use NIST/Dortmund Antoine constants (mmHg, °C). Barometric pressure with altitude:
 * P = 101.325(1 − 2.25577 × 10⁻⁵h)^5.25588 kPa. van der Waals a, b in L²·bar/mol² and L/mol.
 * See prisma/create-sci-gas-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, listOf, sum } from "./sci-math-core";
import { formulaMass } from "./sci-chem-core";

const s = (x: number, n = 10) => sig(x, n);
export const R = 8.314462618, RLK = 8.314462618; // L·kPa/(mol·K)
const K = (c: number) => {
  const k = c + 273.15;
  if (!(k > 0)) throw new InputError("Temperature must be above absolute zero (−273.15 °C).");
  return k;
};
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};

export const CGL_SOLVE = ["Final pressure P₂", "Final volume V₂", "Final temperature T₂"];
export const combinedGas: SciCalculator = (v) => {
  const k = pick(v.solve, 3), P1 = pos(v.p1, 100), V1 = pos(v.v1, 10), T1 = K(num(v.t1, 25)), P2 = pos(v.p2, 200), V2 = pos(v.v2, 6), T2 = K(num(v.t2, 50));
  const c = (P1 * V1) / T1;
  const x = fin(k === 0 ? (c * T2) / V2 : k === 1 ? (c * T2) / P2 : (P2 * V2) / c);
  const law = Math.abs(T1 - T2) < 1e-9 && k !== 2 ? "Boyle's law (constant T): P₁V₁ = P₂V₂" : k !== 0 && Math.abs(P1 - P2) < 1e-12 ? "Charles's law (constant P): V₁/T₁ = V₂/T₂" : k !== 1 && Math.abs(V1 - V2) < 1e-12 ? "Gay-Lussac's law (constant V): P₁/T₁ = P₂/T₂" : "Combined gas law";
  return { result: s(k === 2 ? x - 273.15 : x), kelvin: k === 2 ? s(x) : "—", law, constant: s(c, 8) };
};
export const ENTH_MODE = ["Hess's law from heats of formation", "From bond energies", "Calorimetry (q = mcΔT per mole)"];
export const enthalpy: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 2) {
    const q = pos(v.mass, 100) * pos(v.c, 4.184) * num(v.dT, 5.5), n = pos(v.n, 0.05);
    return { dH: s(-q / n / 1000, 8), detail: `q (solution) = ${fmt(q, 8)} J; ΔH = −q/n`, kind: -q < 0 ? "Exothermic" : "Endothermic" };
  }
  if (m === 1) {
    const broken = sum(listOf(v, "broken", 1)), formed = sum(listOf(v, "formed", 1)), dH = broken - formed;
    return { dH: s(dH, 8), detail: `Σ broken ${fmt(broken)} − Σ formed ${fmt(formed)}`, kind: dH < 0 ? "Exothermic" : "Endothermic" };
  }
  const hp = listOf(v, "hp", 1), np = listOf(v, "np", 1), hr = listOf(v, "hr", 1), nr = listOf(v, "nr", 1);
  if (hp.length !== np.length || hr.length !== nr.length) throw new InputError("Enter one coefficient per heat of formation.");
  const P = sum(hp.map((h, i) => h * np[i])), Rr = sum(hr.map((h, i) => h * nr[i])), dH = P - Rr;
  return { dH: s(dH, 8), detail: `Σ products ${fmt(P)} − Σ reactants ${fmt(Rr)} kJ`, kind: dH < 0 ? "Exothermic" : "Endothermic" };
};
export const IG_SOLVE = ["Pressure P", "Volume V", "Moles n", "Temperature T"];
export const idealGas: SciCalculator = (v) => {
  const k = pick(v.solve, 4), P = pos(v.P, 101.325), V = pos(v.V, 22.4), n = pos(v.n, 1), Tc = num(v.T, 0), M = txt(v, "formula") ? formulaMass(txt(v, "formula")) : pos(v.mw, 0);
  const T = k === 3 ? 0 : K(Tc);
  const x = fin(k === 0 ? (n * RLK * T) / V : k === 1 ? (n * RLK * T) / P : k === 2 ? (P * V) / (RLK * T) : (P * V) / (n * RLK));
  const vals = { P: k === 0 ? x : P, V: k === 1 ? x : V, n: k === 2 ? x : n, T: k === 3 ? x : T };
  return { result: s(k === 3 ? x - 273.15 : x), kelvin: s(vals.T), mass: M ? s(vals.n * M) : "enter molar mass", density: M ? s((vals.P * M) / (RLK * vals.T), 8) : "—", atm: s(vals.P / 101.325, 8) };
};
export const STP_MODE = ["Moles → volume at STP", "Volume at STP → moles", "Correct a gas volume to STP"];
export const stp: SciCalculator = (v) => {
  const m = pick(v.mode, 3), std = pick(v.std, 2), Vm = std === 0 ? 22.71095 : 22.41397, Pstd = std === 0 ? 100 : 101.325;
  if (m === 0) { const n = pos(v.n, 1); return { result: s(n * Vm), moles: s(n), Vm: s(Vm, 8), note: "litres at STP" }; }
  if (m === 1) { const V = pos(v.V, 44.8); return { result: s(V / Vm), moles: s(V / Vm), Vm: s(Vm, 8), note: "moles" }; }
  const V = pos(v.V, 10), P = pos(v.P, 95), T = K(num(v.T, 25)), Vs = (V * P * 273.15) / (T * Pstd);
  return { result: s(Vs), moles: s(Vs / Vm), Vm: s(Vm, 8), note: "litres at STP" };
};
export const STP_STD = ["IUPAC: 0 °C, 100 kPa (22.711 L/mol)", "Older: 0 °C, 1 atm (22.414 L/mol)"];
export const HEAT_SOLVE = ["Heat q", "Mass m", "Specific heat c", "Temperature change ΔT"];
const MATERIALS: [string, number][] = [["Custom (enter c)", 0], ["Water (liquid) 4.184", 4.184], ["Ice 2.09", 2.09], ["Steam 2.01", 2.01], ["Aluminium 0.897", 0.897], ["Copper 0.385", 0.385], ["Iron / steel 0.449", 0.449], ["Glass 0.84", 0.84], ["Air 1.005", 1.005], ["Ethanol 2.44", 2.44], ["Concrete 0.88", 0.88], ["Lead 0.129", 0.129], ["Gold 0.129", 0.129]];
export const MATERIAL_NAMES = MATERIALS.map((x) => x[0]);
export const specificHeat: SciCalculator = (v) => {
  const k = pick(v.solve, 4), mat = MATERIALS[pick(v.material, MATERIALS.length)][1], c = mat || pos(v.c, 4.184), q = num(v.q, 20920), m = pos(v.m, 100), dT = num(v.dT, 50);
  const x = fin(k === 0 ? m * c * dT : k === 1 ? q / (c * dT) : k === 2 ? q / (m * dT) : q / (m * c));
  const qq = k === 0 ? x : q;
  return { result: s(x), kj: s(qq / 1000, 8), kcal: s(qq / 4184, 8), kwh: s(qq / 3.6e6, 8), cUsed: s(k === 2 ? x : c, 6) };
};
export const partialPressure: SciCalculator = (v) => {
  const n = listOf(v, "moles", 1), P = pos(v.P, 101.325), T = sum(n);
  if (!T) throw new InputError("Total moles can't be zero.");
  const pp = txt(v, "pressures") ? listOf(v, "pressures", 1) : null;
  if (pp) return { table: pp.map((p, i) => `gas ${i + 1}: χ = ${fmt(p / sum(pp), 6)}`).join("\n"), total: s(sum(pp)), first: s(pp[0]) };
  return { table: n.map((x, i) => `gas ${i + 1}: χ = ${fmt(x / T, 6)}, P = ${fmt((P * x) / T, 8)}`).join("\n"), total: s(P), first: s((P * n[0]) / T) };
};
export const ENTROPY_MODE = ["Reversible heat: ΔS = q/T", "Heating or cooling: ΔS = mc ln(T₂/T₁)", "Phase change: ΔS = ΔH/T", "Reaction: ΣS°(products) − ΣS°(reactants)", "Ideal gas expansion: ΔS = nR ln(V₂/V₁)"];
export const entropy: SciCalculator = (v) => {
  const m = pick(v.mode, 5);
  let dS: number;
  if (m === 0) dS = num(v.q, 1000) / K(num(v.T, 25));
  else if (m === 1) dS = pos(v.m, 100) * pos(v.c, 4.184) * Math.log(K(num(v.T2, 80)) / K(num(v.T, 20)));
  else if (m === 2) dS = (num(v.dH, 40.65) * 1000) / K(num(v.T, 100));
  else if (m === 3) {
    const sp = listOf(v, "sp", 1), np = listOf(v, "np", 1), sr = listOf(v, "sr", 1), nr = listOf(v, "nr", 1);
    if (sp.length !== np.length || sr.length !== nr.length) throw new InputError("Enter one coefficient per S° value.");
    dS = sum(sp.map((x, i) => x * np[i])) - sum(sr.map((x, i) => x * nr[i]));
  } else dS = pos(v.n, 1) * R * Math.log(pos(v.V2, 2) / pos(v.V1, 1));
  return { dS: s(fin(dS), 8), kj: s(dS / 1000, 8), sign: dS > 0 ? "Entropy increases (more disorder)" : dS < 0 ? "Entropy decreases" : "No change" };
};
const waterBP = (PkPa: number) => {
  const mm = (PkPa * 760) / 101.325, lp = Math.log10(mm);
  let T = 1730.63 / (8.07131 - lp) - 233.426;
  if (T > 100) T = 1810.94 / (8.14019 - lp) - 244.485;
  return T;
};
export const BP_MODE = ["Water at an altitude", "Water at a pressure", "Any liquid (Clausius-Clapeyron)"];
export const boilingPoint: SciCalculator = (v) => {
  const m = pick(v.mode, 3), alt = num(v.alt, 1500);
  const P = m === 0 ? 101.325 * (1 - 2.25577e-5 * alt) ** 5.25588 : pos(v.P, 101.325);
  if (!(P > 0)) throw new InputError("Pressure must be positive (altitude below about 44 km).");
  let T: number;
  if (m <= 1) T = waterBP(P);
  else {
    const Tb = K(num(v.Tb, 78.37)), dH = pos(v.dH, 38.56) * 1000;
    T = 1 / (1 / Tb - (R * Math.log(P / 101.325)) / dH) - 273.15;
  }
  return { T: s(T, 6), F: s((T * 9) / 5 + 32, 6), P: s(P, 6), drop: s((m <= 1 ? 100 : num(v.Tb, 78.37)) - T, 6) };
};
const GASES: [string, number][] = [["Air (28.965)", 28.965], ["Natural gas / methane CH₄ (16.04)", 16.043], ["Propane C₃H₈ (44.10)", 44.097], ["Butane C₄H₁₀ (58.12)", 58.122], ["Nitrogen N₂ (28.01)", 28.014], ["Oxygen O₂ (32.00)", 31.998], ["Carbon dioxide CO₂ (44.01)", 44.009], ["Hydrogen H₂ (2.016)", 2.016], ["Helium He (4.003)", 4.0026], ["Argon Ar (39.95)", 39.948], ["Steam H₂O (18.02)", 18.015], ["Custom (formula or molar mass)", 0]];
export const GAS_NAMES = GASES.map((g) => g[0]);
export const gasDensity: SciCalculator = (v) => {
  const g = GASES[pick(v.gas, GASES.length)][1], M = g || (txt(v, "formula") ? formulaMass(txt(v, "formula")) : pos(v.mw, 28.965)), T = K(num(v.T, 15)), P = pos(v.P, 101.325), Z = pos(v.Z, 1) || 1;
  const rho = (P * M) / (Z * RLK * T);
  return { rho: s(rho, 8), sg: s(M / 28.965, 8), lbft3: s(rho * 0.0624279606, 8), Vm: s((Z * RLK * T) / P, 8), M: s(M, 8) };
};
const ANTOINE: [string, number, number, number][] = [["Water (1–100 °C)", 8.07131, 1730.63, 233.426], ["Ethanol", 8.20417, 1642.89, 230.3], ["Methanol", 8.08097, 1582.27, 239.7], ["Acetone", 7.11714, 1210.595, 229.664], ["Benzene", 6.90565, 1211.033, 220.79], ["Toluene", 6.95464, 1344.8, 219.482], ["n-Hexane", 6.87601, 1171.17, 224.41], ["Custom Antoine A, B, C", 0, 0, 0]];
export const VP_SUBSTANCES = ANTOINE.map((a) => a[0]);
export const vaporPressure: SciCalculator = (v) => {
  const k = pick(v.sub, ANTOINE.length), t = num(v.T, 25);
  let [, A, B, C] = ANTOINE[k];
  if (k === ANTOINE.length - 1) [A, B, C] = [num(v.A, 8.07131), num(v.B, 1730.63), num(v.C, 233.426)];
  if (k === 0 && t > 100) [A, B, C] = [8.14019, 1810.94, 244.485];
  const mm = 10 ** (A - B / (C + t)), Tb = B / (A - Math.log10(760)) - C, rh = pos(v.pp, 0);
  return { mmHg: s(mm, 8), kPa: s((mm * 101.325) / 760, 8), atm: s(mm / 760, 8), bp: s(Tb, 6), rh: rh ? s((100 * rh) / ((mm * 101.325) / 760), 6) : "enter partial pressure" };
};
export const GIBBS_MODE = ["From ΔH, ΔS and T", "From the equilibrium constant K"];
export const gibbs: SciCalculator = (v) => {
  const T = K(num(v.T, 25));
  if (pick(v.mode, 2) === 1) {
    const Keq = pos(v.K, 1e5), G = (-R * T * Math.log(Keq)) / 1000;
    return { dG: s(G, 8), spont: G < 0 ? "Spontaneous (K > 1)" : G > 0 ? "Non-spontaneous (K < 1)" : "At equilibrium", K: s(Keq, 8), crossover: "—" };
  }
  const H = num(v.dH, -92.2), S = num(v.dS, -198.7), G = H - (T * S) / 1000;
  const cross = S ? (H * 1000) / S - 273.15 : NaN;
  return { dG: s(G, 8), spont: G < 0 ? "Spontaneous" : G > 0 ? "Non-spontaneous" : "At equilibrium", K: s(Math.exp((-G * 1000) / (R * T)), 8), crossover: Number.isFinite(cross) && cross > -273.15 ? `${fmt(cross, 6)} °C (${H < 0 && S < 0 ? "spontaneous below" : H > 0 && S > 0 ? "spontaneous above" : "no change of sign"})` : "none (always or never spontaneous)" };
};
const VDW: [string, number, number][] = [["Helium", 0.0346, 0.0238], ["Hydrogen H₂", 0.2476, 0.02661], ["Nitrogen N₂", 1.37, 0.0387], ["Oxygen O₂", 1.382, 0.03186], ["Argon", 1.355, 0.03201], ["Carbon dioxide CO₂", 3.64, 0.04267], ["Methane CH₄", 2.283, 0.04278], ["Ammonia NH₃", 4.225, 0.0371], ["Water vapour H₂O", 5.536, 0.03049], ["Custom a, b", 0, 0]];
export const VDW_GASES = VDW.map((x) => x[0]);
export const vanDerWaals: SciCalculator = (v) => {
  const k = pick(v.gas, VDW.length), [, a0, b0] = VDW[k], a = k === VDW.length - 1 ? pos(v.a, 1.37) : a0, b = k === VDW.length - 1 ? pos(v.b, 0.0387) : b0;
  const n = pos(v.n, 1), V = pos(v.V, 1), T = K(num(v.T, 25)), Rb = 0.08314462618;
  if (V <= n * b) throw new InputError("Volume must be larger than n·b (the molecules' own volume).");
  const P = (n * Rb * T) / (V - n * b) - (a * n * n) / (V * V), Pid = (n * Rb * T) / V;
  return { P: s(P, 8), ideal: s(Pid, 8), Z: s((P * V) / (n * Rb * T), 8), dev: s((100 * (P - Pid)) / Pid, 6), Tb: s((8 * a) / (27 * Rb * b) - 273.15, 6) };
};

export const sciGasCustomCalculators: Record<string, SciCalculator> = {
  "combined-gas-law-calculator": combinedGas,
  "enthalpy-calculator": enthalpy,
  "ideal-gas-law-calculator": idealGas,
  "stp-calculator": stp,
  "specific-heat-calculator": specificHeat,
  "partial-pressure-calculator": partialPressure,
  "entropy-calculator": entropy,
  "boiling-point-calculator": boilingPoint,
  "gas-density-calculator": gasDensity,
  "vapor-pressure-calculator": vaporPressure,
  "gibbs-free-energy-calculator": gibbs,
  "van-der-waals-calculator": vanDerWaals,
};

