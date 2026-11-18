/**
 * Idea build, batch bio1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Biology & Lab = 20 tools.
 * Methods: Livak 2^−ΔΔCt and Pfaffl efficiency-corrected ratio; semi-log ladder regression for gel bands; enzyme units (1 U = 1 µmol/min,
 * Beer–Lambert); Michaelis–Menten via Hanes–Woolf regression; Lincoln–Petersen and Chapman estimators; Luria–Delbrück p₀ method;
 * standard genetic code (NCBI table 1); hemocytometer count × dilution × 10⁴; Laemmli SDS-PAGE recipes (30% acrylamide/bis, 1.5 M Tris
 * pH 8.8 resolving, 1.0 M Tris pH 6.8 stacking); E. coli OD600 1.0 ≈ 8 × 10⁸ cells/mL (strain- and instrument-dependent, editable);
 * Lindeman ~10% trophic transfer (editable).
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";
import { txt, fmt, mean } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-300 ? 0 : x, 5);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const nums = (s: string) => s.split(/[\s,;]+/).filter(Boolean).map((x) => { const n = Number(x); if (!Number.isFinite(n)) throw new InputError(`"${x}" is not a number.`); return n; });
const linreg = (x: number[], y: number[]) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } const b = sxy / sxx; return { b, a: my - b * mx, r2: (sxy * sxy) / (sxx * syy) }; };

export const ddct: Calc = (v) => {
  const [tt, tr, ct, cr] = ["a", "b", "c", "d"].map((k, i) => num(v[k], [24.5, 18.2, 27.1, 18.4][i])), eT = num(v.e, 2), eR = num(v.f, 2);
  const dT = tt - tr, dC = ct - cr, dd = dT - dC, fold = 2 ** -dd, pf = eT ** (ct - tt) / eR ** (cr - tr);
  return { f: `Fold change = ${f(fold)} (${fold >= 1 ? "up" : "down"}-regulated, log₂FC ${f(-dd)})`, d: `ΔCt treated ${f(dT)} · ΔCt control ${f(dC)} · ΔΔCt ${f(dd)}`, note: eT !== 2 || eR !== 2 ? `Pfaffl efficiency-corrected ratio ${f(pf)} (E target ${f(eT)}, E reference ${f(eR)})` : "Livak 2^−ΔΔCt assumes ~100% efficiency (E = 2) for both genes · use biological replicates" };
};
export const gelBand: Calc = (v) => {
  const sizes = nums(txt(v, "s") || "10000, 5000, 3000, 2000, 1500, 1000, 500"), dist = nums(txt(v, "d") || "1.2, 2.0, 2.6, 3.1, 3.5, 4.1, 5.2"), u = P(v, "u", 3.8, "Unknown distance");
  if (sizes.length !== dist.length || sizes.length < 3) throw new InputError("Enter at least 3 ladder sizes and the same number of distances.");
  const { a, b, r2 } = linreg(dist, sizes.map(Math.log10)), bp = 10 ** (a + b * u);
  return { s: `Estimated size ≈ ${f(Math.round(bp))} bp`, r: `log₁₀(bp) = ${f(a)} ${b < 0 ? "−" : "+"} ${f(Math.abs(b))} × distance · R² = ${f(r2)}`, note: u < Math.min(...dist) || u > Math.max(...dist) ? "Outside the ladder range — extrapolation is unreliable" : "Semi-log standard curve · use ladder bands near your band for the best accuracy" };
};
export const enzymeUnits: Calc = (v) => {
  const dA = P(v, "a", 0.12, "ΔA per minute"), eps = P(v, "e", 6.22, "ε"), l = P(v, "l", 1, "Path length"), Vt = P(v, "t", 1, "Total volume"), Ve = P(v, "v", 0.05, "Enzyme volume"), dil = P(v, "x", 1, "Dilution"), prot = Z(v, "p", 0.5);
  const uml = ((dA * Vt) / (eps * l * Ve)) * dil;
  return { a: `Activity = ${f(uml)} U/mL`, s: prot ? `Specific activity ${f(uml / prot)} U/mg protein` : "Add protein concentration for specific activity", note: `U/mL = (ΔA/min × V_total) ÷ (ε × l × V_enzyme) × dilution · ε in mM⁻¹cm⁻¹ (NADH at 340 nm = 6.22) · 1 U = 1 µmol/min` };
};
export const michaelis: Calc = (v) => {
  const S = nums(txt(v, "s") || "0.5, 1, 2, 4, 8, 16"), V = nums(txt(v, "v") || "1.8, 3.0, 4.5, 6.0, 7.2, 8.0"), s0 = Z(v, "x", 5);
  if (S.length !== V.length || S.length < 3 || S.some((x) => x <= 0) || V.some((x) => x <= 0)) throw new InputError("Enter 3+ positive [S] values and the same number of rates.");
  const { a, b, r2 } = linreg(S, S.map((s, i) => s / V[i])), Vmax = 1 / b, Km = a * Vmax;
  return { k: `Km = ${f(Km)} · Vmax = ${f(Vmax)}`, r: s0 ? `Predicted rate at [S] = ${f(s0)}: ${f((Vmax * s0) / (Km + s0))} (${f((s0 / (Km + s0)) * 100)}% of Vmax)` : "Add an [S] to predict the rate", note: `Hanes–Woolf fit ([S]/v vs [S]), R² = ${f(r2)} · Km is the [S] giving half Vmax · same units as your inputs` };
};
export const markRecap: Calc = (v) => {
  const M = P(v, "m", 50, "Marked"), C = P(v, "c", 40, "Second catch"), R = Z(v, "r", 8);
  if (R > C || R > M) throw new InputError("Recaptured can't exceed the marked or second-catch numbers.");
  const ch = ((M + 1) * (C + 1)) / (R + 1) - 1, vr = ((M + 1) * (C + 1) * (M - R) * (C - R)) / ((R + 1) ** 2 * (R + 2)), se = Math.sqrt(vr);
  return { n: R ? `Lincoln–Petersen N = ${f(Math.round((M * C) / R))}` : "No recaptures — the population is too big to estimate (Chapman still works)", c: `Chapman estimate ${f(Math.round(ch))} (95% CI ≈ ${f(Math.max(M + C - R, Math.round(ch - 1.96 * se)))}–${f(Math.round(ch + 1.96 * se))})`, note: "N = MC/R · assumes a closed population, marks aren't lost and marked animals mix and are caught as easily as others · Chapman is less biased when R is small (< 7)" };
};
const CODE = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG", B = "TCAG";
const AA3: Record<string, string> = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile", L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", "*": "Stop" };
export const codon: Calc = (v) => {
  const seq = (txt(v, "s") || "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG").toUpperCase().replace(/U/g, "T").replace(/[^ACGT]/g, ""), fr = pick(v.f, 3);
  if (seq.length < 3) throw new InputError("Enter at least one codon (3 bases).");
  let prot = ""; for (let i = fr; i + 3 <= seq.length; i += 3) { const c = seq.slice(i, i + 3); prot += CODE[B.indexOf(c[0]) * 16 + B.indexOf(c[1]) * 4 + B.indexOf(c[2])]; }
  const start = prot.indexOf("M"), orf = start >= 0 ? prot.slice(start).split("*")[0] : "";
  return { p: `Protein (frame ${fr + 1}): ${prot}`, t: prot.length <= 40 ? prot.split("").map((a) => AA3[a]).join("-") : `${prot.length} codons translated`, note: orf ? `First ORF from Met: ${orf} (${orf.length} aa${prot.slice(start).includes("*") ? ", ends at stop" : ", no stop"})` : "No start codon (ATG) in this frame · * = stop codon (TAA, TAG, TGA)" };
};
export const revComp: Calc = (v) => {
  const raw = (txt(v, "s") || "ATGCGTACGTTAGC").toUpperCase().replace(/\s/g, ""), rna = raw.includes("U"), map: Record<string, string> = { A: rna ? "U" : "T", T: "A", U: "A", G: "C", C: "G", N: "N", R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K", B: "V", V: "B", D: "H", H: "D" };
  if ([...raw].some((c) => !(c in map))) throw new InputError("Use DNA/RNA letters (A, C, G, T/U and IUPAC codes).");
  const comp = [...raw].map((c) => map[c]).join(""), rc = comp.split("").reverse().join(""), gc = [...raw].filter((c) => c === "G" || c === "C").length;
  return { r: `Reverse complement: 5′-${rc}-3′`, c: `Complement: 3′-${comp}-5′ · reverse: ${raw.split("").reverse().join("")}`, note: `${raw.length} bases · GC content ${f((gc / raw.length) * 100)}%${rna ? " · RNA (U)" : ""}` };
};
export const mutRate: Calc = (v) => {
  const p0 = num(v.p, 0.4), Nt = P(v, "n", 1e8, "Cells per culture"), mf = Z(v, "m", 0), tot = Z(v, "t", 0);
  if (!(p0 > 0 && p0 < 1)) throw new InputError("Fraction of cultures with no mutants must be between 0 and 1.");
  const m = -Math.log(p0), mu = m / Nt;
  return { u: `Mutation rate ≈ ${f(mu)} per cell per division`, m: `m = −ln(p₀) = ${f(m)} mutations per culture`, note: mf && tot ? `Mutant frequency ${f(mf / tot)} (not the same as rate — jackpots inflate it)` : "Luria–Delbrück p₀ method: works best when 10–70% of parallel cultures have no mutants" };
};
export const antibiotic: Calc = (v) => {
  const fin = P(v, "f", 100, "Working concentration"), stock = P(v, "s", 100, "Stock concentration") * 1000, vol = P(v, "v", 500, "Culture volume");
  const ul = (fin * vol) / stock * 1000;
  return { a: `Add ${f(ul)} µL of stock to ${f(vol)} mL`, x: `Stock is ${f(stock / fin)}× (stock ${f(stock / 1000)} mg/mL, working ${f(fin)} µg/mL)`, note: "Common working concentrations: ampicillin 100, kanamycin 50, chloramphenicol 25–34, tetracycline 10–15 µg/mL — follow your protocol" };
};
export const plasmidCN: Calc = (v) => {
  const ctG = num(v.a, 22.5), ctP = num(v.b, 16.3), e = P(v, "e", 2, "Efficiency"), gc = P(v, "g", 1, "Genomic copies per cell");
  const cn = e ** (ctG - ctP) * gc;
  return { c: `≈ ${f(cn)} plasmid copies per cell`, d: `ΔCt (genome − plasmid) = ${f(ctG - ctP)} · amplification factor ${f(e)}`, note: "Single-copy chromosomal gene vs plasmid gene in the same DNA · pUC-type ~500–700, pBR322 ~15–20 copies per cell in E. coli" };
};
export const westernLoad: Calc = (v) => {
  const c = P(v, "c", 2.5, "Protein concentration"), ug = P(v, "u", 30, "Protein to load"), tot = P(v, "t", 20, "Final volume"), x = P(v, "x", 4, "Sample buffer strength");
  const vs = ug / c, vb = tot / x, vw = tot - vs - vb;
  if (vw < 0) throw new InputError(`Too dilute — you need ${f(vs)} µL of sample; raise the final volume or load less protein.`);
  return { s: `Sample ${f(vs)} µL + ${f(x)}× buffer ${f(vb)} µL + water ${f(vw)} µL`, t: `= ${f(tot)} µL with ${f(ug)} µg protein`, note: "Heat 5 min at 95 °C (or 70 °C for membrane proteins) · load the same µg in every lane and check with a loading control" };
};
export const sdsPage: Calc = (v) => {
  const p = P(v, "p", 10, "Resolving gel %"), V = P(v, "v", 10, "Resolving volume"), sv = P(v, "s", 5, "Stacking volume");
  if (p > 20 || p < 4) throw new InputError("Use a resolving gel from 4% to 20%.");
  const ac = (p / 30) * V, tr = 0.25 * V, sds = 0.01 * V, aps = 0.01 * V, tm = 0.0004 * V, w = V - ac - tr - sds - aps - tm;
  const sac = (0.83 / 5) * sv, str = (0.63 / 5) * sv, ss = 0.01 * sv, saps = 0.01 * sv, stm = 0.001 * sv, sw = sv - sac - str - ss - saps - stm;
  return { r: `Resolving ${f(p)}% (${f(V)} mL): water ${f(w)} · 30% acrylamide/bis ${f(ac)} · 1.5 M Tris pH 8.8 ${f(tr)} · 10% SDS ${f(sds)} · 10% APS ${f(aps)} · TEMED ${f(tm * 1000)} µL`, s: `Stacking 5% (${f(sv)} mL): water ${f(sw)} · acrylamide ${f(sac)} · 1.0 M Tris pH 6.8 ${f(str)} · SDS ${f(ss)} · APS ${f(saps)} · TEMED ${f(stm * 1000)} µL`, note: `Separates roughly ${p <= 8 ? "40–250" : p <= 10 ? "20–150" : p <= 12 ? "15–100" : "10–70"} kDa · add APS and TEMED last · one mini gel ≈ 5 mL resolving + 2 mL stacking` };
};
export const agarose: Calc = (v) => {
  const pc = P(v, "p", 1, "Gel %"), V = P(v, "v", 50, "Volume"), dye = pick(v.d, 2) === 0;
  const g = (pc / 100) * V, range = pc < 0.8 ? "1–20 kb" : pc < 1.2 ? "0.5–10 kb" : pc < 1.8 ? "0.2–3 kb" : pc < 2.5 ? "0.1–2 kb" : "50–1,000 bp";
  return { g: `Dissolve ${f(g)} g agarose in ${f(V)} mL 1× TAE or TBE`, r: `Resolves about ${range}`, note: dye ? `Stain: ${f(V / 10)} µL of a 10,000× gel stain (e.g. SYBR Safe)` : "% = g per 100 mL · microwave until clear, cool to ~55 °C before adding stain and pouring" };
};
export const viability: Calc = (v) => {
  const live = Z(v, "l", 180), dead = Z(v, "d", 20), sq = P(v, "s", 4, "Squares counted"), dil = P(v, "x", 2, "Dilution factor"), vol = Z(v, "v", 10);
  if (live + dead <= 0) throw new InputError("Enter cell counts.");
  const vb = live / (live + dead), conc = (live / sq) * dil * 1e4;
  return { v: `Viability = ${f(vb * 100)}%`, c: `Live cells ≈ ${f(conc)} cells/mL (${f((conc * vol))} total in ${f(vol)} mL)`, note: `Hemocytometer: cells per large square × dilution × 10⁴ · trypan blue 1:1 = dilution 2 · total cells ${f(((live + dead) / sq) * dil * 1e4)}/mL` };
};
export const odCells: Calc = (v) => {
  const od = P(v, "o", 0.5, "OD600"), k = P(v, "k", 8e8, "Cells per mL at OD 1"), dil = P(v, "x", 1, "Dilution"), want = Z(v, "w", 0), vol = Z(v, "v", 0);
  const c = od * dil * k;
  return { c: `≈ ${f(c)} cells/mL`, n: want && vol ? `For ${f(want)} cells/mL in ${f(vol)} mL, take ${f((want * vol) / c * 1000)} µL of culture` : `${od * dil > 0.8 ? "Above OD ~0.8 the reading stops being linear — dilute and re-read" : "Within the linear range"}`, note: "E. coli: OD600 1.0 ≈ 8 × 10⁸ cells/mL; yeast ≈ 1–3 × 10⁷ — calibrate with plate counts for your strain and spectrophotometer" };
};
export const photosyn: Calc = (v) => {
  const vol = Z(v, "v", 1.2), t = P(v, "t", 10, "Time"), m = Z(v, "m", 2.5), bub = Z(v, "b", 0), dist = Z(v, "d", 0);
  const rate = bub ? bub / t : vol / t;
  return { r: `Rate = ${f(rate)} ${bub ? "bubbles" : "mL O₂"} per minute`, p: m ? `${f(rate / m)} per gram of plant per minute · ${f(rate * 60)} per hour` : `${f(rate * 60)} per hour`, note: dist ? `Light intensity ∝ 1/d² — at ${f(dist)} cm, relative intensity ${f(10000 / (dist * dist))} (vs 1 at 100 cm)` : "Keep temperature and CO₂ constant when you vary light · gas syringe volumes are more reliable than bubble counts" };
};
export const respir: Calc = (v) => {
  const d = Z(v, "d", 25), r = P(v, "r", 0.5, "Tube radius"), t = P(v, "t", 10, "Time"), m = P(v, "m", 2, "Organism mass"), T = num(v.c, 20);
  const vol = Math.PI * r * r * d;
  return { r: `O₂ uptake = ${f(vol / t)} mm³/min`, p: `${f(vol / t / m)} mm³ per gram per minute (${f((vol / t / m) * 60 / 1000)} cm³/g/h)`, note: `Fluid moved ${f(d)} mm in a ${f(r * 2)} mm bore: volume = πr²d = ${f(vol)} mm³ · KOH/soda lime absorbs CO₂ · at ${f(T)} °C` };
};
export const daphnia: Calc = (v) => {
  const b = Z(v, "b", 60), s = P(v, "s", 15, "Counting time"), base = Z(v, "r", 0);
  const bpm = (b / s) * 60;
  return { h: `Heart rate = ${f(bpm)} beats per minute`, c: base ? `${f(((bpm - base) / base) * 100)}% change from the baseline ${f(base)} bpm` : "Add a baseline rate to see the % change", note: "Count for 15–20 s and repeat 3 times · Daphnia are ectotherms: rate rises with temperature and with stimulants like caffeine" };
};
export const pyramid: Calc = (v) => {
  const e0 = P(v, "e", 10000, "Producer energy"), eff = P(v, "p", 10, "Transfer efficiency") / 100, n = Math.max(2, Math.min(8, Math.round(num(v.n, 4)))), names = ["Producers", "Primary consumers", "Secondary consumers", "Tertiary consumers", "Quaternary consumers", "Level 6", "Level 7", "Level 8"];
  const lv = Array.from({ length: n }, (_, i) => e0 * eff ** i);
  return { l: lv.map((x, i) => `${names[i]}: ${f(x)}`).join(" · "), t: `Top level keeps ${f((lv[n - 1] / e0) * 100)}% of the producer energy`, note: `~${f(eff * 100)}% passes up each level (Lindeman's 10% rule of thumb; real efficiencies are 5–20%) — the rest is lost as heat, waste and respiration` };
};
export const quadrat: Calc = (v) => {
  const counts = nums(txt(v, "c") || "3, 0, 5, 2, 4, 1, 0, 6, 3, 2"), a = P(v, "a", 1, "Quadrat area"), A = Z(v, "t", 500);
  const tot = counts.reduce((s, x) => s + x, 0), dens = tot / (counts.length * a), freq = counts.filter((x) => x > 0).length / counts.length, mn = mean(counts), vr = counts.reduce((s, x) => s + (x - mn) ** 2, 0) / (counts.length - 1);
  return { d: `Density = ${f(dens)} per m²`, p: A ? `Estimated population ${f(Math.round(dens * A))} in ${f(A)} m² · frequency ${f(freq * 100)}%` : `Frequency ${f(freq * 100)}% of quadrats`, note: `Variance/mean ratio ${f(vr / mn)} — ${vr / mn > 1.5 ? "clumped" : vr / mn < 0.7 ? "uniform" : "random"} distribution · place quadrats randomly` };
};

// ---- registry (generated)
export const ideaBio1CustomCalculators: Record<string, Calc> = {
  "qpcr-delta-delta-ct-calculator": ddct,
  "gel-electrophoresis-band-size-calculator": gelBand,
  "enzyme-activity-units-calculator": enzymeUnits,
  "michaelis-menten-km-vmax-calculator": michaelis,
  "mark-recapture-population-calculator": markRecap,
  "codon-to-amino-acid-calculator": codon,
  "dna-reverse-complement-calculator": revComp,
  "mutation-rate-calculator": mutRate,
  "antibiotic-stock-concentration-calculator": antibiotic,
  "plasmid-copy-number-calculator": plasmidCN,
  "western-blot-loading-volume-calculator": westernLoad,
  "sds-page-gel-recipe-calculator": sdsPage,
  "agarose-gel-percentage-calculator": agarose,
  "cell-viability-percentage-calculator": viability,
  "optical-density-cell-count-calculator": odCells,
  "photosynthesis-rate-calculator": photosyn,
  "respiration-rate-biology-calculator": respir,
  "heart-rate-daphnia-calculator": daphnia,
  "biomass-pyramid-energy-transfer-calculator": pyramid,
  "quadrat-sampling-density-calculator": quadrat,
};
