/**
 * Batch: "Science Calculators" → Biology & Lab (molecular biology: DNA, PCR, proteins, assays — 29).
 *
 * Primer Tm: SantaLucia (1998) unified nearest-neighbour parameters, monovalent-equivalent salt
 * [Na⁺] + 120·√([Mg²⁺] − [dNTP]) (von Ahsen 2001) with the 0.368·(N − 1)·ln[Na⁺] entropy
 * correction; Tm = ΔH/(ΔS + R ln(Cₜ/4)). Oligo MW (IDT): ΣnᵢMᵢ − 61.96. Nucleic acids: dsDNA
 * 617.96 g/mol per bp + 36.04; ssDNA 308.97 per nt + 18.02; ssRNA 320.5 per nt + 159. Proteins:
 * average/monoisotopic residue masses + water; ε₂₈₀ (Pace 1995) = 5,500·W + 1,490·Y + 125·cystine;
 * pI by bisection with EMBOSS pKa values. Dose-response (IC50, ELISA): 4-parameter logistic fitted
 * by grid search on (log EC50, Hill) with the plateaus solved by linear least squares at each
 * point, then pattern-search refinement. TCID50: Reed-Muench and Spearman-Kärber.
 * See prisma/create-sci-dna-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, mean, sum } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const NA = 6.02214076e23;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const seqOf = (v: Vals, key: string, alphabet: RegExp, what: string) => {
  const raw = txt(v, key).toUpperCase().replace(/[\s\d-]+/g, "");
  if (!raw) throw new InputError(`Enter a ${what} sequence.`);
  const bad = raw.replace(alphabet, "");
  if (bad) throw new InputError(`Unexpected letter(s) "${Array.from(new Set(bad)).join("")}" in the ${what} sequence.`);
  return raw;
};
const dnaSeq = (v: Vals, key = "seq") => seqOf(v, key, /[ACGTUN]/g, "DNA/RNA");
const count = (sq: string, ch: string) => sq.split(ch).length - 1;
const COMP: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", U: "A", N: "N" };
const revComp = (sq: string) => sq.split("").reverse().map((c) => COMP[c] ?? "N").join("");

// ---------- primers & oligos ----------
const NN: Record<string, [number, number]> = { AA: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3], CA: [-8.5, -22.7], GT: [-8.4, -22.4], CT: [-7.8, -21.0], GA: [-8.2, -22.2], CG: [-10.6, -27.2], GC: [-9.8, -24.4], GG: [-8.0, -19.9] };
const NN_ALIAS: Record<string, string> = { TT: "AA", TG: "CA", AC: "GT", AG: "CT", TC: "GA", CC: "GG" };
export function tmNN(sq: string, naM: number, mgM: number, dntpM: number, ctM: number) {
  const q = sq.replace(/U/g, "T");
  let H = 0, S = 0;
  for (let i = 0; i < q.length - 1; i++) {
    const d = q.slice(i, i + 2), p = NN[d] ?? NN[NN_ALIAS[d]];
    if (!p) throw new InputError("Tm needs an unambiguous A/C/G/T sequence (no N).");
    H += p[0];
    S += p[1];
  }
  for (const end of [q[0], q[q.length - 1]]) {
    if (end === "G" || end === "C") { H += 0.1; S += -2.8; } else { H += 2.3; S += 4.1; }
  }
  const self = revComp(q) === q;
  if (self) S += -1.4;
  const naEq = naM + 120 * Math.sqrt(Math.max(0, mgM - dntpM)) / 1000 * Math.sqrt(1000);
  S += 0.368 * (q.length - 1) * Math.log(Math.max(1e-6, naEq));
  const ct = self ? ctM : ctM / 4;
  const Tm = (H * 1000) / (S + 1.98720425864083 * Math.log(ct)) - 273.15;
  const dG37 = H - (310.15 * S) / 1000;
  return { Tm, H, S, dG37, naEq };
}
export const meltingTemp: SciCalculator = (v) => {
  const sq = dnaSeq(v);
  if (sq.length < 6) throw new InputError("Enter at least 6 bases.");
  const na = pos(v.na, 50) / 1000, mg = pos(v.mg, 0) / 1000, dntp = pos(v.dntp, 0) / 1000, ct = pos(v.ct, 250) * 1e-9;
  const r = tmNN(sq, na, mg, dntp, ct), gc = count(sq, "G") + count(sq, "C"), at = sq.length - gc;
  const basic = sq.length < 14 ? 2 * at + 4 * gc : 64.9 + (41 * (gc - 16.4)) / sq.length;
  return { tm: s(r.Tm, 5), basic: s(basic, 5), gc: s((100 * gc) / sq.length, 5), length: sq.length, dG: s(r.dG37, 6), anneal: s(r.Tm - 5, 4) };
};
export const OLIGO_TYPE = ["DNA", "RNA"];
export const OLIGO_END = ["5′-OH (synthetic oligo)", "5′-triphosphate (transcript)"];
export const oligoMW: SciCalculator = (v) => {
  const sq = dnaSeq(v), rna = pick(v.type, 2) === 1, n = (c: string) => count(sq, c);
  const end = pick(v.end, 2) === 0 ? -61.96 : 159.0;
  const mw = rna ? n("A") * 329.21 + (n("U") + n("T")) * 306.17 + n("C") * 305.18 + n("G") * 345.21 + end : n("A") * 313.21 + (n("T") + n("U")) * 304.2 + n("C") * 289.18 + n("G") * 329.21 + end;
  const eps = 0.9 * (n("A") * 15400 + n("C") * 7400 + n("G") * 11500 + (n("T") + n("U")) * (rna ? 9900 : 8700));
  const rc = revComp(sq);
  return { mw: s(mw, 8), gc: s((100 * (n("G") + n("C"))) / sq.length, 5), revcomp: rna ? rc.replace(/T/g, "U") : rc, complement: sq.split("").map((c) => (rna && c === "A" ? "U" : COMP[c])).join(""), length: sq.length, eps: s(eps, 6), ugOD: s((mw / eps) * 1000, 6), nmolOD: s(1e6 / eps, 6) };
};
export const primerDilution: SciCalculator = (v) => {
  const nmol = pos(v.nmol, 25), stock = pos(v.stock, 100), work = pos(v.work, 10), wvol = pos(v.wvol, 100);
  if (!stock) throw new InputError("Stock concentration must be positive.");
  return { resuspend: s((nmol / stock) * 1000, 8), stockUl: s((work * wvol) / stock, 8), water: s(wvol - (work * wvol) / stock, 8) };
};
export const ligation: SciCalculator = (v) => {
  const vl = pos(v.vlen, 3000), vng = pos(v.vng, 50), il = pos(v.ilen, 1000), ratio = pos(v.ratio, 3);
  if (!vl) throw new InputError("Vector length must be positive.");
  const ing = (vng * il * ratio) / vl, vpmol = (vng * 1000) / (vl * 650), ipmol = (ing * 1000) / (il * 650);
  return { insertNg: s(ing, 8), vpmol: s(vpmol * 1000, 8), ipmol: s(ipmol * 1000, 8), total: s(vng + ing, 8) };
};
export const gibson: SciCalculator = (v) => {
  const vl = pos(v.vlen, 5000), vng = pos(v.vng, 100), lens = listOf(v, "lens", 1), ratio = pos(v.ratio, 2);
  const vp = vng / (vl * 650) * 1e6;
  const rows = lens.map((L, i) => `fragment ${i + 1} (${fmt(L)} bp): ${fmt((vp * ratio * L * 650) / 1e6, 6)} ng (${fmt(vp * ratio * 1000, 6)} fmol)`);
  const total = vp * (1 + ratio * lens.length);
  return { table: rows.join("\n"), vector: s(vp * 1000, 8), total: s(total * 1000, 8), check: total < 0.02 || total > 0.5 ? "Outside the 0.02–0.5 pmol range recommended for NEBuilder/Gibson" : "Within 0.02–0.5 pmol total" };
};

// ---------- concentrations & copies ----------
export const NA_TYPES = ["Double-stranded DNA", "Single-stranded DNA", "Single-stranded RNA"];
const mwNA = (type: number, len: number) => (type === 0 ? len * 617.96 + 36.04 : type === 1 ? len * 308.97 + 18.02 : len * 320.5 + 159);
export const copyNumber: SciCalculator = (v) => {
  const t = pick(v.type, 3), L = pos(v.len, 5000), ng = pos(v.ng, 10), want = pos(v.want, 0), mw = mwNA(t, L);
  const copies = (ng * 1e-9 * NA) / mw;
  return { copies: s(copies, 8), mw: s(mw, 8), pmol: s((ng / mw) * 1000, 8), ngFor: want ? s((want * mw * 1e9) / NA, 8) : "enter copies wanted" };
};
export const DNA_FACTOR = ["dsDNA (50 ng/µL per A260)", "ssDNA (33)", "RNA (40)", "Oligonucleotide (20)", "Custom factor"];
const FAC = [50, 33, 40, 20];
export const dnaConcentration: SciCalculator = (v) => {
  const k = pick(v.kind, 5), f = k < 4 ? FAC[k] : pos(v.factor, 50), a260 = pos(v.a260, 0.5), dil = pos(v.dil, 1) || 1, a280 = pos(v.a280, 0), a230 = pos(v.a230, 0), L = pos(v.len, 0);
  const c = a260 * f * dil, r1 = a280 ? a260 / a280 : NaN, r2 = a230 ? a260 / a230 : NaN;
  const mw = L ? mwNA(k === 2 ? 2 : k === 0 ? 0 : 1, L) : 0;
  return { conc: s(c, 8), r280: Number.isFinite(r1) ? s(r1, 4) : "enter A280", r230: Number.isFinite(r2) ? s(r2, 4) : "enter A230", purity: Number.isFinite(r1) ? (r1 >= 1.75 && r1 <= 2.1 ? "Pure (DNA ~1.8, RNA ~2.0)" : r1 < 1.75 ? "Possible protein or phenol contamination" : "High ratio — possible RNA in DNA prep") : "—", nM: mw ? s((c / mw) * 1e6, 8) : "enter length for molarity" };
};
export const dnaMW: SciCalculator = (v) => {
  const t = pick(v.type, 3), L = pos(v.len, 1000), mw = mwNA(t, L), ug = pos(v.ug, 1);
  return { mw: s(mw, 8), kda: s(mw / 1000, 8), pmol: s((ug / mw) * 1e6, 8), perUnit: t === 0 ? "617.96 g/mol per bp + 36.04" : t === 1 ? "308.97 g/mol per nt + 18.02" : "320.5 g/mol per nt + 159" };
};

// ---------- proteins & peptides ----------
const AVG: Record<string, number> = { A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388, E: 129.1155, Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594, L: 113.1594, K: 128.1741, M: 131.1926, F: 147.1766, P: 97.1167, S: 87.0782, T: 101.1051, W: 186.2132, Y: 163.176, V: 99.1326, U: 150.0388, O: 237.3018 };
const MONO: Record<string, number> = { A: 71.03711, R: 156.10111, N: 114.04293, D: 115.02694, C: 103.00919, E: 129.04259, Q: 128.05858, G: 57.02146, H: 137.05891, I: 113.08406, L: 113.08406, K: 128.09496, M: 131.04049, F: 147.06841, P: 97.05276, S: 87.03203, T: 101.04768, W: 186.07931, Y: 163.06333, V: 99.06841, U: 150.95364, O: 237.14773 };
const KD: Record<string, number> = { A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2, I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2, U: 2.5, O: -3.9 };
const protSeq = (v: Vals, key = "seq") => seqOf(v, key, /[ACDEFGHIKLMNPQRSTVWYUO]/g, "protein (one-letter code)");
const PKA = { nterm: 8.6, cterm: 3.6, K: 10.8, R: 12.5, H: 6.5, D: 3.9, E: 4.1, C: 8.5, Y: 10.1 };
export const netCharge = (sq: string, pH: number) => {
  const pos1 = (pk: number) => 1 / (1 + 10 ** (pH - pk)), neg1 = (pk: number) => -1 / (1 + 10 ** (pk - pH));
  return pos1(PKA.nterm) + neg1(PKA.cterm) + count(sq, "K") * pos1(PKA.K) + count(sq, "R") * pos1(PKA.R) + count(sq, "H") * pos1(PKA.H) + count(sq, "D") * neg1(PKA.D) + count(sq, "E") * neg1(PKA.E) + count(sq, "C") * neg1(PKA.C) + count(sq, "Y") * neg1(PKA.Y);
};
export const pIof = (sq: string) => {
  let a = 0, b = 14;
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (netCharge(sq, m) > 0) a = m; else b = m; }
  return (a + b) / 2;
};
const protMass = (sq: string) => ({ avg: sum(sq.split("").map((c) => AVG[c])) + 18.01528, mono: sum(sq.split("").map((c) => MONO[c])) + 18.010565 });
export const peptideMW: SciCalculator = (v) => {
  const sq = protSeq(v), m = protMass(sq), pI = pIof(sq), ch = netCharge(sq, 7), gravy = mean(sq.split("").map((c) => KD[c]));
  const sol = Math.abs(ch) >= 2 ? "Charged — try water or buffer first" : gravy > 0.5 ? "Hydrophobic — dissolve in a little DMSO/ACN, then dilute" : ch > 0 ? "Basic — try dilute acetic acid if water fails" : ch < 0 ? "Acidic — try dilute ammonium bicarbonate if water fails" : "Neutral — may need organic solvent";
  return { avg: s(m.avg, 9), mono: s(m.mono, 10), mh: s(m.mono + 1.007276, 10), pI: s(pI, 4), charge: s(ch, 4), gravy: s(gravy, 4), solubility: sol, length: sq.length };
};
export const PROT_MODE = ["From amino-acid sequence", "Estimate from number of residues (110 Da each)"];
export const proteinMW: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) { const n = pos(v.n, 300); return { kda: s((n * 110) / 1000, 6), da: s(n * 110, 8), length: n, comp: "estimate (average residue ≈ 110 Da)" }; }
  const sq = protSeq(v), m = protMass(sq);
  const top = Array.from(new Set(sq.split(""))).map((c) => [c, count(sq, c)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return { kda: s(m.avg / 1000, 8), da: s(m.avg, 9), length: sq.length, comp: top.map(([c, n]) => `${c} ${fmt((100 * n) / sq.length, 3)}%`).join(", ") };
};
export const extinction: SciCalculator = (v) => {
  const sq = protSeq(v), W = count(sq, "W"), Y = count(sq, "Y"), C = count(sq, "C"), mw = protMass(sq).avg;
  const ox = 5500 * W + 1490 * Y + 125 * Math.floor(C / 2), red = 5500 * W + 1490 * Y;
  return { eps: s(ox, 8), reduced: s(red, 8), abs01: s(ox / mw, 6), absRed: s(red / mw, 6), counts: `W ${W}, Y ${Y}, C ${C}`, warn: W + Y === 0 ? "No Trp or Tyr — A280 can't measure this protein; use A205 or a dye assay." : "—" };
};
export const PC_MODE = ["Molar extinction coefficient ε and MW", "Mass extinction coefficient E1% (or A280 of 1 mg/mL)"];
export const proteinConc: SciCalculator = (v) => {
  const A = pos(v.a280, 0.8), l = pos(v.l, 1) || 1, dil = pos(v.dil, 1) || 1;
  if (pick(v.mode, 2) === 1) {
    const e1 = pos(v.e1, 10), mgml = (A * dil * 10) / (e1 * l), mw = pos(v.mw, 66430);
    return { mgml: s(mgml, 8), uM: mw ? s((mgml / mw) * 1e6, 8) : "—", note: "c (mg/mL) = A × 10 / (E1% × l)" };
  }
  const e = pos(v.eps, 43824), mw = pos(v.mw, 66430), M = (A * dil) / (e * l);
  return { mgml: s(fin(M * mw), 8), uM: s(M * 1e6, 8), note: "c = A/(ε·l)" };
};
export const isoelectric: SciCalculator = (v) => {
  const sq = protSeq(v), pH = num(v.pH, 7.4);
  return { pI: s(pIof(sq), 5), at7: s(netCharge(sq, 7), 5), atPH: s(netCharge(sq, pH), 5), counts: `D ${count(sq, "D")}, E ${count(sq, "E")}, K ${count(sq, "K")}, R ${count(sq, "R")}, H ${count(sq, "H")}, C ${count(sq, "C")}, Y ${count(sq, "Y")}` };
};
export const peptideRecon: SciCalculator = (v) => {
  const mg = pos(v.mg, 5), mL = pos(v.ml, 2), dose = pos(v.dose, 250);
  if (!mL) throw new InputError("Water volume must be positive.");
  const conc = (mg * 1000) / mL, vol = dose / conc;
  return { units: s(vol * 100, 6), volume: s(vol, 6), conc: s(conc, 8), doses: s((mg * 1000) / dose, 6), mgml: s(mg / mL, 8) };
};

// ---------- PCR, digestion, cell work ----------
export const pcrMix: SciCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.n, 10))), vol = pos(v.vol, 50), over = pos(v.over, 10) / 100, N = n * (1 + over);
  const buf = vol / pos(v.bufX, 10), dntp = (vol * pos(v.dntpF, 0.2)) / pos(v.dntpS, 10), primer = (vol * pos(v.prF, 0.5)) / pos(v.prS, 10), mg = pos(v.mgF, 0) ? (vol * pos(v.mgF, 0)) / pos(v.mgS, 25) : 0, pol = pos(v.pol, 0.25), tmpl = pos(v.tmpl, 1);
  const water = vol - buf - dntp - 2 * primer - mg - pol - tmpl;
  if (water < 0) throw new InputError("Components exceed the reaction volume — use more concentrated stocks.");
  const rows: [string, number][] = [["Water", water], [`${fmt(pos(v.bufX, 10))}× buffer`, buf], ["dNTPs", dntp], ["Forward primer", primer], ["Reverse primer", primer], ...(mg ? [["MgCl₂", mg] as [string, number]] : []), ["Polymerase", pol], ["Template (add per tube)", tmpl]];
  return { table: rows.map(([k, x]) => `${k}: ${fmt(x, 5)} µL per rxn → ${fmt(x * N, 6)} µL total`).join("\n"), master: s((vol - tmpl) * N, 6), perTube: s(vol - tmpl, 6), N: s(N, 6) };
};
export const digest: SciCalculator = (v) => {
  const ug = pos(v.ug, 1), conc = pos(v.conc, 100), enz = Math.max(1, Math.min(2, Math.round(pos(v.enz, 1)))), upu = pos(v.upu, 10), stock = pos(v.stock, 20), vol = pos(v.vol, 50), gly = pos(v.gly, 50);
  const dnaUl = (ug * 1000) / conc, enzUl = (ug * upu) / stock, buf = vol / 10, water = vol - dnaUl - buf - enz * enzUl, glyc = (enz * enzUl * gly) / vol;
  if (water < 0) throw new InputError("Too much DNA or enzyme for this volume — increase the reaction volume.");
  return { dna: s(dnaUl, 6), enzyme: s(enzUl, 6), buffer: s(buf, 6), water: s(water, 6), glycerol: s(glyc, 4), warn: glyc > 5 ? "Glycerol above 5% — risk of star activity; increase volume" : "OK (glycerol ≤ 5%)" };
};
export const PCR_POLY = ["Taq (1 min per kb)", "Phusion / Q5 (20–30 s per kb)", "KOD / fast enzymes (10 s per kb)", "Long-range (1 min per kb)", "Custom speed"];
const POLY_SPEED = [60, 30, 10, 60];
export const pcrTime: SciCalculator = (v) => {
  const L = pos(v.len, 2000), k = pick(v.poly, 5), spk = k < 4 ? POLY_SPEED[k] : pos(v.speed, 30), cyc = Math.round(pos(v.cycles, 30));
  const ext = Math.max(k === 1 ? 15 : 10, (L / 1000) * spk), cycle = pos(v.den, 30) + pos(v.ann, 30) + ext + 3 * pos(v.ramp, 2);
  const total = pos(v.init, 120) + cyc * cycle + pos(v.final, 300);
  return { ext: s(ext, 6), cycle: s(cycle, 6), total: s(total / 60, 6), hours: `${Math.floor(total / 3600)} h ${fmt(Math.round((total % 3600) / 60))} min` };
};
export const pcrEfficiency: SciCalculator = (v) => {
  let slope: number, r2: number | string = "—";
  if (pick(v.mode, 2) === 0) slope = num(v.slope, -3.32);
  else {
    const q = listOf(v, "q", 3), ct = listOf(v, "ct", 3);
    if (q.length !== ct.length) throw new InputError("Enter one Ct per quantity.");
    const x = q.map((t) => Math.log10(t)), mx = mean(x), my = mean(ct), sxx = sum(x.map((a) => (a - mx) ** 2)), sxy = sum(x.map((a, i) => (a - mx) * (ct[i] - my))), syy = sum(ct.map((b) => (b - my) ** 2));
    slope = sxy / sxx;
    r2 = s((sxy * sxy) / (sxx * syy), 6);
  }
  const E = 10 ** (-1 / slope) - 1;
  return { eff: s(100 * E, 6), amp: s(1 + E, 6), slope: s(slope, 6), r2, ok: E >= 0.9 && E <= 1.1 ? "Acceptable (90–110%)" : "Outside 90–110% — check primers or dilutions" };
};
export const EFF_MODE = ["From standard-curve slope", "From a dilution series (quantities and Ct)"];
export const transformation: SciCalculator = (v) => {
  const col = pos(v.colonies, 150), ng = pos(v.ng, 1), total = pos(v.total, 1000), plated = pos(v.plated, 100), dil = pos(v.dil, 1) || 1;
  if (!ng || !plated) throw new InputError("DNA amount and plated volume must be positive.");
  const ugPlated = (ng / 1000) * (plated / total) / dil, eff = col / ugPlated;
  return { eff: s(eff, 6), log: s(Math.log10(eff), 4), ugPlated: s(ugPlated, 6), grade: eff >= 1e9 ? "Ultra-competent" : eff >= 1e8 ? "High (cloning-grade)" : eff >= 1e6 ? "Routine" : "Low" };
};
export const PLATES = ["96-well", "48-well", "24-well", "12-well", "6-well", "60 mm dish", "100 mm dish", "T-75 flask"];
const PLATE_DNA = [0.1, 0.25, 0.5, 1, 2.5, 5, 14, 20], PLATE_MED = [10, 25, 50, 100, 250, 500, 1500, 2000], PLATE_CELLS = [1e4, 3e4, 5e4, 1e5, 3e5, 8e5, 2.2e6, 3e6];
export const transfection: SciCalculator = (v) => {
  const k = pick(v.plate, PLATES.length), wells = Math.max(1, Math.round(pos(v.wells, 6))), ratio = pos(v.ratio, 3), over = 1 + pos(v.over, 10) / 100;
  const dna = PLATE_DNA[k] * pos(v.scale, 1), reag = dna * ratio, med = PLATE_MED[k];
  return { dna: s(dna * wells * over, 6), reagent: s(reag * wells * over, 6), medium: s(2 * med * wells * over, 6), perWell: `${fmt(dna, 4)} µg DNA + ${fmt(reag, 4)} µL reagent in ${fmt(med)} + ${fmt(med)} µL medium`, cells: s(PLATE_CELLS[k], 4) };
};
export const AB_MODE = ["Dilution ratio (1 : X)", "Stock concentration → target µg/mL"];
export const antibodyDilution: SciCalculator = (v) => {
  const V = pos(v.vol, 10) * 1000;
  if (pick(v.mode, 2) === 0) { const X = pos(v.x, 1000), ab = V / X; return { ab: s(ab, 6), buffer: s(V - ab, 8), final: "—" }; }
  const st = pos(v.stock, 1), tg = pos(v.target, 2), ab = (tg * V) / (st * 1000);
  return { ab: s(ab, 6), buffer: s(V - ab, 8), final: `1 : ${fmt((st * 1000) / tg, 6)}` };
};
export const standardCurve: SciCalculator = (v) => {
  const x = listOf(v, "x", 2), y = listOf(v, "y", 2), origin = pick(v.origin, 2) === 1;
  if (x.length !== y.length) throw new InputError("Enter one signal per standard.");
  const n = x.length, mx = mean(x), my = mean(y);
  let m: number, b: number;
  if (origin) { m = sum(x.map((a, i) => a * y[i])) / sum(x.map((a) => a * a)); b = 0; }
  else { m = sum(x.map((a, i) => (a - mx) * (y[i] - my))) / sum(x.map((a) => (a - mx) ** 2)); b = my - m * mx; }
  const res = y.map((q, i) => q - (m * x[i] + b)), sse = sum(res.map((r) => r * r)), sst = sum(y.map((q) => (q - my) ** 2)), sy = Math.sqrt(sse / Math.max(1, n - 2));
  const unk = txt(v, "unk") ? listOf(v, "unk", 1) : [], dil = pos(v.dil, 1) || 1;
  return { eq: `y = ${fmt(m, 6)}x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b), 6)}`, r2: s(1 - sse / sst, 6), slope: s(m, 8), intercept: s(b, 8), lod: s((3.3 * sy) / m, 6), loq: s((10 * sy) / m, 6), unknowns: unk.length ? unk.map((q) => `${fmt(q)} → ${fmt(((q - b) / m) * dil, 6)}`).join("\n") : "enter unknown signals" };
};
export const ORIGIN = ["Ordinary least squares (with intercept)", "Force through the origin"];
export const pooling: SciCalculator = (v) => {
  const c = listOf(v, "conc", 1), bp = listOf(v, "bp", 1), target = pos(v.target, 4), vol = pos(v.vol, 20);
  if (c.length !== bp.length) throw new InputError("Enter one fragment size per library.");
  const nM = c.map((x, i) => (x * 1e6) / (660 * bp[i])), each = (target * vol) / c.length;
  const ul = nM.map((x) => each / x), water = vol - sum(ul);
  return { table: nM.map((x, i) => `library ${i + 1}: ${fmt(x, 6)} nM → ${fmt(ul[i], 5)} µL`).join("\n"), water: water >= 0 ? s(water, 6) : "libraries too dilute for this volume/target", total: s(sum(ul), 6), perLib: s(each / vol, 6) };
};
export const CM_REL: [string, number, number, number][] = [["Parent / child", 3485, 2376, 3720], ["Full sibling", 2613, 1613, 3488], ["Grandparent, aunt/uncle, half sibling", 1750, 984, 2462], ["Great-grandparent, great-aunt/uncle, half aunt/uncle, first cousin", 887, 396, 1397], ["First cousin once removed, half first cousin", 433, 102, 980], ["Second cousin, first cousin twice removed", 229, 41, 592], ["Second cousin once removed, half second cousin", 122, 14, 353], ["Third cousin", 73, 0, 234], ["Third cousin once removed", 48, 0, 192], ["Fourth cousin", 35, 0, 139], ["Distant (fifth cousin or beyond)", 13, 0, 60]];
export const centimorgan: SciCalculator = (v) => {
  const cM = pos(v.cm, 850), total = pos(v.total, 6800);
  const fits = CM_REL.filter(([, , lo, hi]) => cM >= lo && cM <= hi).map(([n]) => n);
  const best = CM_REL.reduce((p, q) => (Math.abs(Math.log((q[1] + 1) / (cM + 1))) < Math.abs(Math.log((p[1] + 1) / (cM + 1))) ? q : p));
  return { pct: s((100 * cM) / total, 6), likely: best[0], possible: fits.length ? fits.join("\n") : "none — check the value", segments: cM > 3720 ? "Above the parent/child range — possible identical twin or double relationship" : "Ranges from the Shared cM Project (v4)" };
};
export const logFold: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const dd = (num(v.ctT, 24) - num(v.ctTR, 18)) - (num(v.ctC, 26) - num(v.ctCR, 18)), fc = 2 ** -dd;
    return { log2: s(-dd, 8), fc: s(fc, 8), pct: s(100 * (fc - 1), 6), note: `ΔΔCt = ${fmt(dd, 6)}` };
  }
  const a = pos(v.a, 50), b = pos(v.b, 200);
  if (!a || !b) throw new InputError("Values must be positive.");
  return { log2: s(Math.log2(b / a), 8), fc: s(b / a, 8), pct: s((100 * (b - a)) / a, 6), note: b >= a ? `${fmt(b / a, 4)}-fold up` : `${fmt(a / b, 4)}-fold down` };
};
export const LFC_MODE = ["Two values (control and treated)", "qPCR ΔΔCt"];
export const replication: SciCalculator = (v) => {
  const G = pos(v.genome, 4.6e6), speed = pos(v.speed, 1000), ori = Math.max(1, Math.round(pos(v.ori, 1))), frag = pos(v.frag, 1500);
  const t = G / (2 * speed * ori);
  return { min: s(t / 60, 6), h: s(t / 3600, 6), okazaki: s(G / frag, 6), forks: 2 * ori };
};
export const tcid50: SciCalculator = (v) => {
  const inf = listOf(v, "inf", 2), n = Math.max(1, Math.round(pos(v.n, 8))), L0 = num(v.first, -1), d = Math.log10(pos(v.factor, 10)), vol = pos(v.vol, 0.1);
  if (inf.some((x) => x > n)) throw new InputError("Infected wells can't exceed wells per dilution.");
  const k = inf.length, unin = inf.map((x) => n - x);
  const cumInf = inf.map((_, i) => sum(inf.slice(i))), cumUn = unin.map((_, i) => sum(unin.slice(0, i + 1)));
  const pct = cumInf.map((x, i) => (100 * x) / (x + cumUn[i]));
  const ia = pct.findIndex((p, i) => p >= 50 && (i === k - 1 || pct[i + 1] < 50));
  let rm = NaN;
  if (ia >= 0 && ia < k - 1) { const pd = (pct[ia] - 50) / (pct[ia] - pct[ia + 1]); rm = L0 - ia * d - pd * d; }
  const S = sum(inf.map((x) => x / n)), sk = L0 + d / 2 - d * S;
  const titer = (lg: number) => 10 ** -lg / vol;
  return { reed: Number.isFinite(rm) ? s(titer(rm), 6) : "50% end point not bracketed", spearman: s(titer(sk), 6), logReed: Number.isFinite(rm) ? s(rm, 5) : "—", logSK: s(sk, 5), pfu: Number.isFinite(rm) ? s(titer(rm) * 0.69, 6) : s(titer(sk) * 0.69, 6) };
};

// ---------- dose response (4PL) ----------
export function fit4pl(x: number[], y: number[]) {
  if (x.some((t) => t <= 0)) throw new InputError("Concentrations must be positive for a log-scale fit.");
  const lx = x.map(Math.log10), lo = Math.min(...lx) - 1, hi = Math.max(...lx) + 1;
  const evalAt = (lc: number, h: number) => {
    const g = lx.map((t) => 1 / (1 + 10 ** (h * (t - lc))));
    const a11 = sum(g.map((q) => (1 - q) ** 2)), a12 = sum(g.map((q) => (1 - q) * q)), a22 = sum(g.map((q) => q * q)), b1 = sum(y.map((t, i) => t * (1 - g[i]))), b2 = sum(y.map((t, i) => t * g[i]));
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-14) return { sse: Infinity, bottom: 0, top: 0 };
    const bottom = (b1 * a22 - b2 * a12) / det, top = (a11 * b2 - a12 * b1) / det;
    return { sse: sum(y.map((t, i) => (t - (bottom + (top - bottom) * g[i])) ** 2)), bottom, top };
  };
  let best = { lc: 0, h: 1, sse: Infinity };
  for (let i = 0; i <= 80; i++) for (const h of [0.3, 0.5, 0.7, 1, 1.3, 1.6, 2, 2.5, 3, 4, 5]) {
    const lc = lo + ((hi - lo) * i) / 80, r = evalAt(lc, h);
    if (r.sse < best.sse) best = { lc, h, sse: r.sse };
  }
  let step = [(hi - lo) / 80, 0.2];
  for (let it = 0; it < 400 && step[0] > 1e-9; it++) {
    let moved = false;
    for (const [dl, dh] of [[step[0], 0], [-step[0], 0], [0, step[1]], [0, -step[1]]]) {
      const lc = best.lc + dl, h = Math.max(0.05, best.h + dh), r = evalAt(lc, h);
      if (r.sse < best.sse) { best = { lc, h, sse: r.sse }; moved = true; }
    }
    if (!moved) step = [step[0] / 2, step[1] / 2];
  }
  const r = evalAt(best.lc, best.h), my = mean(y), sst = sum(y.map((t) => (t - my) ** 2));
  return { ec50: 10 ** best.lc, hill: best.h, top: r.top, bottom: r.bottom, r2: sst ? 1 - r.sse / sst : 1 };
}
export const ic50: SciCalculator = (v) => {
  const x = listOf(v, "conc", 4), y = listOf(v, "resp", 4);
  if (x.length !== y.length) throw new InputError("Enter one response per concentration.");
  const f = fit4pl(x, y);
  return { ic50: s(f.ec50, 6), pic50: pick(v.unit, 5) === 4 ? "—" : s(-Math.log10(f.ec50 * CONC_SCALE[pick(v.unit, 5)]), 5), hill: s(f.hill * (f.top > f.bottom ? -1 : 1), 5), top: s(f.top, 6), bottom: s(f.bottom, 6), r2: s(f.r2, 5) };
};
export const CONC_UNITS = ["nM", "µM", "mM", "M", "mg/kg (LD50)"];
export const CONC_SCALE = [1e-9, 1e-6, 1e-3, 1, 1];
export const elisa: SciCalculator = (v) => {
  const x = listOf(v, "conc", 4), y = listOf(v, "od", 4), unk = txt(v, "unk") ? listOf(v, "unk", 1) : [], dil = pos(v.dil, 1) || 1;
  if (x.length !== y.length) throw new InputError("Enter one OD per standard.");
  const f = fit4pl(x, y), inv = (od: number) => {
    const g = (od - f.bottom) / (f.top - f.bottom);
    if (!(g > 0 && g < 1)) return NaN;
    return f.ec50 * ((1 - g) / g) ** (1 / f.hill);
  };
  return { results: unk.length ? unk.map((od) => { const c = inv(od); return `OD ${fmt(od)} → ${Number.isFinite(c) ? fmt(c * dil, 6) : "outside the curve"}`; }).join("\n") : "enter sample ODs", ec50: s(f.ec50, 6), r2: s(f.r2, 5), curve: `4PL: low-dose plateau ${fmt(f.top, 5)}, high-dose plateau ${fmt(f.bottom, 5)}, EC50 ${fmt(f.ec50, 5)}, Hill ${fmt(f.hill, 4)}` };
};

export const sciDnaCustomCalculators: Record<string, SciCalculator> = {
  "peptide-reconstitution-calculator": peptideRecon,
  "melting-temperature-calculator": meltingTemp,
  "ligation-calculator": ligation,
  "oligo-molecular-weight-calculator": oligoMW,
  "peptide-molecular-weight-calculator": peptideMW,
  "gibson-assembly-calculator": gibson,
  "protein-concentration-calculator": proteinConc,
  "pcr-master-mix-calculator": pcrMix,
  "restriction-digest-calculator": digest,
  "ic50-calculator": ic50,
  "protein-molecular-weight-calculator": proteinMW,
  "protein-extinction-coefficient-calculator": extinction,
  "primer-dilution-calculator": primerDilution,
  "dna-copy-number-calculator": copyNumber,
  "dna-concentration-calculator": dnaConcentration,
  "dna-molecular-weight-calculator": dnaMW,
  "transfection-calculator": transfection,
  "antibody-dilution-calculator": antibodyDilution,
  "standard-curve-calculator": standardCurve,
  "library-pooling-calculator": pooling,
  "pcr-efficiency-calculator": pcrEfficiency,
  "transformation-efficiency-calculator": transformation,
  "elisa-calculator": elisa,
  "centimorgan-calculator": centimorgan,
  "isoelectric-point-calculator": isoelectric,
  "pcr-extension-time-calculator": pcrTime,
  "log-fold-change-calculator": logFold,
  "dna-replication-calculator": replication,
  "tcid50-calculator": tcid50,
};
