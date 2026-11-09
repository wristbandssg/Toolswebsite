/**
 * Batch: "Science Calculators" → Biology & Lab (genetics, ecology, cell culture & lab methods — 27).
 *
 * Punnett squares: any number of genes, complete dominance (upper-case allele dominant), all
 * gamete combinations enumerated. Blood type: ABO and RhD parent genotypes weighted by
 * Hardy-Weinberg frequencies (A 0.25, B 0.08, O 0.67; D 0.61, d 0.39). Eye colour: the classic
 * two-gene (HERC2/OCA2 + gey) teaching model. Hair colour: simplified two-gene model (brown/blond
 * + MC1R red). Hardy-Weinberg χ² test with 1 df. Diversity: Simpson D = Σn(n − 1)/(N(N − 1)),
 * Shannon H = −Σp ln p. Hemocytometer: mean count per large square × dilution × 10⁴ cells/mL.
 * Mid-parental height (Tanner): (father + mother ± 13 cm)/2 ± 8.5 cm.
 * See prisma/create-sci-gen-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, listOf, mean, sum, chi2Cdf } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check for zero values.");
  return x;
};
const pct = (x: number) => `${fmt(100 * x, 5)}%`;

// ---------- Mendelian crosses ----------
const genes = (g: string) => {
  const t = g.replace(/\s+/g, "");
  if (!t || t.length % 2 || !/^[A-Za-z]+$/.test(t)) throw new InputError(`"${g}" isn't a genotype — write allele pairs like Aa or AaBb.`);
  const pairs: string[] = [];
  for (let i = 0; i < t.length; i += 2) {
    if (t[i].toLowerCase() !== t[i + 1].toLowerCase()) throw new InputError(`Alleles must pair up by letter (Aa, Bb …) — "${t.slice(i, i + 2)}" doesn't.`);
    pairs.push(t.slice(i, i + 2));
  }
  return pairs;
};
const gametes = (pairs: string[]): string[] => pairs.reduce<string[]>((acc, p) => acc.flatMap((g) => [g + p[0], g + p[1]]), [""]);
const normPair = (a: string, b: string) => (a === a.toUpperCase() ? a + b : b + a);
export function cross(p1: string, p2: string) {
  const g1 = genes(p1), g2 = genes(p2);
  if (g1.length !== g2.length || g1.some((p, i) => p[0].toLowerCase() !== g2[i][0].toLowerCase())) throw new InputError("Both parents need the same genes in the same order (e.g. AaBb × AaBb).");
  if (g1.length > 4) throw new InputError("Up to 4 genes.");
  const a = gametes(g1), b = gametes(g2), geno = new Map<string, number>(), pheno = new Map<string, number>();
  for (const x of a) for (const y of b) {
    const gt = Array.from(x).map((c, i) => normPair(c, y[i])).join("");
    geno.set(gt, (geno.get(gt) ?? 0) + 1);
    const ph = Array.from(x).map((c, i) => (c === c.toUpperCase() || y[i] === y[i].toUpperCase() ? c.toUpperCase() + "_" : c.toLowerCase() + c.toLowerCase())).join(" ");
    pheno.set(ph, (pheno.get(ph) ?? 0) + 1);
  }
  const N = a.length * b.length;
  const gl = Array.from(geno.entries()).sort((p, q) => q[1] - p[1]), pl = Array.from(pheno.entries()).sort((p, q) => q[1] - p[1]);
  const gcd = (m: number, n: number): number => (n ? gcd(n, m % n) : m), g = pl.reduce((t, [, c]) => gcd(t, c), 0);
  return { N, a, b, gl, pl, ratio: pl.map(([, c]) => c / g).join(" : ") };
}
export const punnett: SciCalculator = (v) => {
  const c = cross(txt(v, "p1") || "Aa", txt(v, "p2") || "Aa");
  const grid = c.a.length <= 4 ? ["     " + c.b.join("   "), ...c.a.map((x) => `${x.padEnd(4)} ` + c.b.map((y) => Array.from(x).map((ch, i) => normPair(ch, y[i])).join("")).join("  "))].join("\n") : "(grid omitted — more than 4 gametes per parent)";
  return { genotypes: c.gl.map(([k, n]) => `${k}: ${n}/${c.N} (${pct(n / c.N)})`).join("\n"), phenotypes: c.pl.map(([k, n]) => `${k}: ${pct(n / c.N)}`).join("\n"), ratio: c.ratio, grid, dominant: s(sum(c.pl.filter(([k]) => !/[a-z]{2}/.test(k)).map(([, n]) => n)) / c.N * 100, 6) };
};
export const dihybrid: SciCalculator = (v) => {
  const c = cross(txt(v, "p1") || "AaBb", txt(v, "p2") || "AaBb");
  return { ratio: c.ratio, phenotypes: c.pl.map(([k, n]) => `${k}: ${n}/${c.N} (${pct(n / c.N)})`).join("\n"), genotypes: `${c.gl.length} genotypes: ` + c.gl.map(([k, n]) => `${k} ${n}`).join(", "), combos: c.N };
};

// ---------- human traits ----------
const ABO = { A: 0.25, B: 0.08, O: 0.67 };
const ABO_GENO: Record<string, [string, number][]> = {
  A: [["AA", ABO.A ** 2], ["AO", 2 * ABO.A * ABO.O]], B: [["BB", ABO.B ** 2], ["BO", 2 * ABO.B * ABO.O]], AB: [["AB", 1]], O: [["OO", 1]],
};
const RH_GENO: Record<string, [string, number][]> = { "+": [["DD", 0.61 ** 2], ["Dd", 2 * 0.61 * 0.39]], "-": [["dd", 1]], "?": [["DD", 0.61 ** 2], ["Dd", 2 * 0.61 * 0.39], ["dd", 0.39 ** 2]] };
export const ABO_TYPES = ["A", "B", "AB", "O"];
export const RH_TYPES = ["Rh+ (positive)", "Rh− (negative)", "Unknown"];
const norm = (l: [string, number][]) => { const t = sum(l.map(([, w]) => w)); return l.map(([g, w]) => [g, w / t] as [string, number]); };
export const bloodType: SciCalculator = (v) => {
  const t1 = ABO_TYPES[pick(v.a1, 4)], t2 = ABO_TYPES[pick(v.a2, 4)], r1 = ["+", "-", "?"][pick(v.r1, 3)], r2 = ["+", "-", "?"][pick(v.r2, 3)];
  const abo = new Map<string, number>(), rh = new Map<string, number>();
  for (const [g1, w1] of norm(ABO_GENO[t1])) for (const [g2, w2] of norm(ABO_GENO[t2])) for (const x of g1) for (const y of g2) {
    const al = [x, y].sort().join(""), ph = al === "AB" ? "AB" : al.includes("A") ? "A" : al.includes("B") ? "B" : "O";
    abo.set(ph, (abo.get(ph) ?? 0) + (w1 * w2) / 4);
  }
  for (const [g1, w1] of norm(RH_GENO[r1])) for (const [g2, w2] of norm(RH_GENO[r2])) for (const x of g1) for (const y of g2) {
    const ph = x === "D" || y === "D" ? "+" : "−";
    rh.set(ph, (rh.get(ph) ?? 0) + (w1 * w2) / 4);
  }
  const combos = ABO_TYPES.flatMap((t) => ["+", "−"].map((r) => [`${t}${r}`, (abo.get(t) ?? 0) * (rh.get(r) ?? 0)] as [string, number])).filter(([, p]) => p > 1e-9).sort((a, b) => b[1] - a[1]);
  return { combined: combos.map(([k, p]) => `${k}: ${pct(p)}`).join("\n"), abo: ABO_TYPES.map((t) => `${t}: ${pct(abo.get(t) ?? 0)}`).join(", "), rh: `Rh+: ${pct(rh.get("+") ?? 0)}, Rh−: ${pct(rh.get("−") ?? 0)}`, impossible: ABO_TYPES.filter((t) => !(abo.get(t) ?? 0)).join(", ") || "none" };
};
export const EYE = ["Brown", "Green / hazel", "Blue / grey"];
const EYE_TABLE: Record<string, [number, number, number]> = { "0,0": [75, 18.75, 6.25], "0,1": [50, 37.5, 12.5], "0,2": [50, 0, 50], "1,1": [1, 75, 24], "1,2": [0, 50, 50], "2,2": [0, 1, 99] };
export const eyeColor: SciCalculator = (v) => {
  const a = pick(v.e1, 3), b = pick(v.e2, 3), key = `${Math.min(a, b)},${Math.max(a, b)}`, [br, gr, bl] = EYE_TABLE[key];
  return { brown: br, green: gr, blue: bl, likely: EYE[[br, gr, bl].indexOf(Math.max(br, gr, bl))] };
};
export const HAIR = ["Black / brown", "Blond", "Red"];
export const hairColor: SciCalculator = (v) => {
  const geno = (ph: number): [string, string, number][] => {
    const Bs: [string, number][] = ph === 1 ? [["bb", 1]] : ph === 0 ? [["BB", 0.25], ["Bb", 0.5]] : [["BB", 0.25], ["Bb", 0.5], ["bb", 0.25]];
    const Rs: [string, number][] = ph === 2 ? [["rr", 1]] : [["RR", 0.5625], ["Rr", 0.375]];
    const out: [string, string, number][] = [];
    for (const [bg, bw] of Bs) for (const [rg, rw] of Rs) out.push([bg, rg, bw * rw]);
    const t = sum(out.map((x) => x[2]));
    return out.map(([x, y, w]) => [x, y, w / t]);
  };
  const res = [0, 0, 0];
  for (const [b1, r1, w1] of geno(pick(v.h1, 3))) for (const [b2, r2, w2] of geno(pick(v.h2, 3)))
    for (const x of b1) for (const y of b2) for (const p of r1) for (const q of r2) {
      const w = (w1 * w2) / 16, red = p === "r" && q === "r", dark = x === "B" || y === "B";
      res[red ? 2 : dark ? 0 : 1] += w;
    }
  return { dark: s(100 * res[0], 5), blond: s(100 * res[1], 5), red: s(100 * res[2], 5), likely: HAIR[res.indexOf(Math.max(...res))] };
};
export const heightGenetics: SciCalculator = (v) => {
  const f = pos(v.father, 178), m = pos(v.mother, 165), boy = pick(v.sex, 2) === 0, mid = (f + m + (boy ? 13 : -13)) / 2;
  const ftin = (cm: number) => { const inch = cm / 2.54; return `${Math.floor(inch / 12)} ft ${fmt(inch % 12, 3)} in`; };
  return { cm: s(mid, 6), range: `${fmt(mid - 8.5, 5)}–${fmt(mid + 8.5, 5)} cm`, ft: ftin(mid), rangeFt: `${ftin(mid - 8.5)} – ${ftin(mid + 8.5)}` };
};
export const SEX = ["Boy", "Girl"];

// ---------- population genetics & ecology ----------
export const HW_MODE = ["Genotype counts (AA, Aa, aa)", "Allele frequency p", "Recessive phenotype frequency (q²)"];
export const hardyWeinberg: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  let p: number, chi: number | string = "—", pv: number | string = "—";
  if (m === 0) {
    const AA = pos(v.AA, 360), Aa = pos(v.Aa, 480), aa = pos(v.aa, 160), N = AA + Aa + aa;
    if (!N) throw new InputError("Enter genotype counts.");
    p = (2 * AA + Aa) / (2 * N);
    const e = [p * p * N, 2 * p * (1 - p) * N, (1 - p) ** 2 * N];
    const x2 = [AA, Aa, aa].reduce((t, o, i) => t + (e[i] ? (o - e[i]) ** 2 / e[i] : 0), 0);
    chi = x2 < 1e-12 ? 0 : s(x2, 6);
    pv = s(1 - chi2Cdf(x2, 1), 6);
  } else if (m === 1) p = Math.min(1, pos(v.p, 0.6));
  else p = 1 - Math.sqrt(Math.min(1, pos(v.q2, 0.16)));
  const q = 1 - p;
  return { p: s(p, 8), q: s(q, 8), AA: s(p * p, 8), Aa: s(2 * p * q, 8), aa: s(q * q, 8), chi, pval: pv, eq: typeof pv === "number" ? (pv < 0.05 ? "Deviates from Hardy-Weinberg equilibrium (p < 0.05)" : "Consistent with equilibrium") : "—" };
};
export const POP_MODE = ["Exponential (continuous)", "Discrete (compound) growth", "Logistic (carrying capacity K)", "Growth rate from two counts"];
export const populationGrowth: SciCalculator = (v) => {
  const m = pick(v.mode, 4), N0 = pos(v.N0, 1000), r = num(v.r, 5) / 100, t = pos(v.t, 10), K = pos(v.K, 10000);
  if (m === 3) {
    const Nt = pos(v.Nt, 2000), rr = Math.log(Nt / N0) / t;
    return { Nt: s(Nt), rate: s(100 * rr, 8), doubling: rr > 0 ? s(Math.LN2 / rr, 8) : "—", note: `Discrete equivalent ${fmt(100 * (Math.exp(rr) - 1), 6)}% per period` };
  }
  const Nt = m === 0 ? N0 * Math.exp(r * t) : m === 1 ? N0 * (1 + r) ** t : K / (1 + ((K - N0) / N0) * Math.exp(-r * t));
  const dbl = m === 1 ? Math.log(2) / Math.log(1 + r) : Math.LN2 / r;
  return { Nt: s(fin(Nt), 8), rate: s(100 * r, 8), doubling: r > 0 ? s(dbl, 8) : "—", note: m === 2 ? `dN/dt now = ${fmt(r * Nt * (1 - Nt / K), 6)} per time unit` : `Change ${fmt(Nt - N0, 8)}` };
};
export const CK_MODE = ["Logistic projection with known K", "Estimate K from three equally spaced counts"];
export const carryingCapacity: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const [a, b, c] = [pos(v.n0, 100), pos(v.n1, 400), pos(v.n2, 900)], den = b * b - a * c;
    if (!den) throw new InputError("These counts don't fit a logistic curve.");
    const K = (b * b * (a + c) - 2 * a * b * c) / den;
    if (!(K > 0)) throw new InputError("Counts don't level off — no positive carrying capacity.");
    const r = Math.log((b * (K - a)) / (a * (K - b)));
    return { K: s(K, 8), r: s(r, 8), growth: s(r * c * (1 - c / K), 8), half: s(K / 2, 8) };
  }
  const K = pos(v.K, 1000), N = pos(v.N, 300), r = num(v.r, 0.5);
  return { K: s(K, 8), r: s(r, 8), growth: s(r * N * (1 - N / K), 8), half: s(K / 2, 8) };
};
export const simpson: SciCalculator = (v) => {
  const n = listOf(v, "counts", 2), N = sum(n), S = n.filter((x) => x > 0).length;
  if (N < 2) throw new InputError("Need at least 2 individuals.");
  const D = sum(n.map((x) => x * (x - 1))) / (N * (N - 1));
  return { D: s(D, 8), diversity: s(1 - D, 8), reciprocal: D ? s(1 / D, 8) : "∞", evenness: D ? s(1 / D / S, 8) : "—", S, N };
};
export const shannon: SciCalculator = (v) => {
  const n = listOf(v, "counts", 1).filter((x) => x > 0), N = sum(n), S = n.length;
  const H = -sum(n.map((x) => (x / N) * Math.log(x / N)));
  return { H: s(H, 8), evenness: S > 1 ? s(H / Math.log(S), 8) : "—", effective: s(Math.exp(H), 8), H2: s(H / Math.LN2, 8), S, N };
};
export const waterPotential: SciCalculator = (v) => {
  const i = pos(v.i, 1), C = pos(v.C, 0.3), T = num(v.T, 22) + 273.15, Pp = num(v.Pp, 0);
  const Ps = -i * C * 0.0831 * T;
  return { psi: s(Ps + Pp, 8), psiS: s(Ps, 8), mpa: s((Ps + Pp) / 10, 8), note: "Water moves from higher (less negative) to lower water potential." };
};

// ---------- cell culture & microbiology ----------
export const hemocytometer: SciCalculator = (v) => {
  const c = listOf(v, "counts", 1), dil = pos(v.dil, 2) || 1, dead = pos(v.dead, 0), vol = pos(v.vol, 10);
  const avg = mean(c), cells = avg * dil * 1e4, total = cells * vol, live = sum(c);
  return { conc: s(cells, 6), total: s(total, 6), viability: dead ? s((100 * live) / (live + dead), 5) : "enter dead count", avg: s(avg, 6) };
};
export const SEED_MODE = ["Cells per well", "Cells per cm² (surface density)"];
export const PLATE_AREAS = ["96-well (0.32 cm²)", "48-well (0.95 cm²)", "24-well (1.9 cm²)", "12-well (3.8 cm²)", "6-well (9.6 cm²)", "T-25 (25 cm²)", "T-75 (75 cm²)", "100 mm dish (55 cm²)"];
const AREA = [0.32, 0.95, 1.9, 3.8, 9.6, 25, 75, 55];
export const cellSeeding: SciCalculator = (v) => {
  const conc = pos(v.conc, 1e6), wells = Math.max(1, Math.round(pos(v.wells, 24))), vol = pos(v.vol, 0.5), over = 1 + pos(v.over, 10) / 100;
  const perWell = pick(v.mode, 2) === 0 ? pos(v.cells, 5e4) : pos(v.density, 2e4) * AREA[pick(v.plate, AREA.length)];
  const need = perWell * wells * over, cellVol = need / conc, total = vol * wells * over;
  if (cellVol > total) throw new InputError("Cell suspension is too dilute — concentrate the cells or seed in more volume.");
  return { cellVol: s(cellVol, 6), medium: s(total - cellVol, 6), total: s(total, 6), perWell: s(perWell, 6), dilConc: s(need / total, 6) };
};
export const doublingTime: SciCalculator = (v) => {
  const N0 = pos(v.N0, 1e5), N = pos(v.N, 8e5), t = pos(v.t, 72);
  if (!(N > N0)) throw new InputError("The final count must be larger than the initial count.");
  const n = Math.log2(N / N0);
  return { td: s(t / n, 8), doublings: s(n, 8), rate: s(Math.log(N / N0) / t, 8), perDay: s((n / t) * 24, 6) };
};
export const CFU_MODE = ["Single plate", "Average of several plates"];
export const cfu: SciCalculator = (v) => {
  const cols = pick(v.mode, 2) === 0 ? [pos(v.colonies, 120)] : listOf(v, "list", 1), dil = pos(v.dil, 1e5), vol = pos(v.vol, 0.1);
  const c = mean(cols), x = (c * dil) / vol;
  return { cfu: s(x, 6), log: s(Math.log10(x), 5), mean: s(c, 6), countable: c >= 30 && c <= 300 ? "Countable (30–300)" : "Outside 30–300 — use another dilution" };
};
export const LR_MODE = ["From counts before and after", "From percent reduction", "From log reduction"];
export const logReduction: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  const L = m === 0 ? Math.log10(pos(v.before, 1e6) / Math.max(1e-300, pos(v.after, 10))) : m === 1 ? -Math.log10(1 - Math.min(99.999999999, pos(v.pct, 99.9)) / 100) : pos(v.log, 3);
  return { log: s(fin(L), 6), pct: s(100 * (1 - 10 ** -L), 10), remaining: s(10 ** -L, 6), after: s(pos(v.before, 1e6) * 10 ** -L, 6) };
};
export const serialDilution: SciCalculator = (v) => {
  const C0 = pos(v.c0, 1e6), f = pos(v.factor, 10), n = Math.min(20, Math.max(1, Math.round(pos(v.steps, 6)))), V = pos(v.vol, 1000);
  if (f <= 1) throw new InputError("Dilution factor must be above 1.");
  const transfer = V / f;
  const rows = Array.from({ length: n }, (_, i) => `tube ${i + 1}: ${fmt(C0 / f ** (i + 1), 6)} (1 : ${fmt(f ** (i + 1), 6)})`);
  return { table: rows.join("\n"), transfer: s(transfer, 6), diluent: s(V - transfer, 6), final: s(C0 / f ** n, 6), total: s(f ** n, 6) };
};
export const dmso: SciCalculator = (v) => {
  const stock = pos(v.stock, 10), target = pos(v.target, 10), V = pos(v.vol, 1000), max = pos(v.max, 0.1);
  const sv = (target * V) / (stock * 1000), dm = (100 * sv) / V;
  return { stockUl: s(sv, 6), medium: s(V - sv, 6), dmso: s(dm, 6), advice: dm > max ? `DMSO ${fmt(dm, 4)}% exceeds ${fmt(max)}% — make an intermediate dilution or a more concentrated stock (≥ ${fmt((target * 100) / (max * 1000), 5)} mM).` : "DMSO within limit" };
};
export const SA_MODE = ["Enzyme: units and protein", "Enzyme: from ΔA/min (spectrophotometric assay)", "Radioactivity per mole"];
export const specificActivity: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 2) {
    const bq = pos(v.bq, 3.7e7), mol = pos(v.mmol, 1) / 1000;
    return { result: s(bq / mol, 8), detail: `${fmt(bq / 3.7e10 / (mol * 1000), 6)} Ci/mmol`, units: "Bq/mol" };
  }
  let U = pos(v.units, 50);
  if (m === 1) U = (pos(v.dA, 0.1) * pos(v.vtot, 1)) / (pos(v.eps, 6.22) * pos(v.l, 1)) * 1000 * (pos(v.dil, 1) || 1) / Math.max(1e-12, pos(v.venz, 0.05));
  const mg = pos(v.mg, 2);
  return { result: s(U / mg, 8), detail: m === 1 ? `${fmt(U, 6)} U/mL enzyme (µmol/min per mL)` : `${fmt(U)} U total`, units: "U/mg" };
};
export const ramanShift: SciCalculator = (v) => {
  const l0 = pos(v.l0, 532);
  if (pick(v.mode, 2) === 0) {
    const l = pos(v.l, 563), sh = 1e7 / l0 - 1e7 / l;
    return { shift: s(sh, 8), lambda: s(l, 8), energy: s(sh * 1.23984198e-4 * 1000, 6) };
  }
  const sh = num(v.shift, 1000), l = 1e7 / (1e7 / l0 - sh);
  return { shift: s(sh, 8), lambda: s(fin(l), 8), energy: s(sh * 1.23984198e-4 * 1000, 6) };
};
export const RAMAN_MODE = ["Shift from wavelengths", "Scattered wavelength from shift"];

// ---------- lab instruments & measurements ----------
export const columnVolume: SciCalculator = (v) => {
  const d = pos(v.d, 4.6) / 10, L = pos(v.L, 150) / 10, eps = pos(v.eps, 0.68), F = pos(v.F, 1), d2 = pos(v.d2, 2.1) / 10;
  const Vc = Math.PI * (d / 2) ** 2 * L, Vm = Vc * eps;
  return { Vm: s(Vm, 6), Vc: s(Vc, 6), t0: s(Vm / F, 6), F2: s(F * (d2 / d) ** 2, 6), cv: s(F / Vm, 6) };
};
export const hplcTransfer: SciCalculator = (v) => {
  const d1 = pos(v.d1, 4.6), L1 = pos(v.L1, 150), p1 = pos(v.p1, 5), F1 = pos(v.F1, 1), inj1 = pos(v.inj1, 10), tg1 = pos(v.tg1, 20);
  const d2 = pos(v.d2, 2.1), L2 = pos(v.L2, 50), p2 = pos(v.p2, 1.8);
  const F2 = F1 * (d2 / d1) ** 2 * (p1 / p2), inj2 = inj1 * ((d2 * d2 * L2) / (d1 * d1 * L1)), tg2 = tg1 * (F1 / F2) * ((d2 * d2 * L2) / (d1 * d1 * L1));
  const runs = pos(v.runs, 50), rt = pos(v.rt, 30), B = Math.min(100, pos(v.B, 40)), vol = F2 * rt * runs;
  return { F2: s(F2, 6), inj2: s(inj2, 6), tg2: s(tg2, 6), solvent: `${fmt(vol, 6)} mL total: ${fmt((vol * (100 - B)) / 100, 6)} mL A + ${fmt((vol * B) / 100, 6)} mL B`, saving: s(100 * (1 - (F2 * tg2) / (F1 * tg1)), 5) };
};
export const treeHeight: SciCalculator = (v) => {
  const D = pos(v.D, 20), top = num(v.top, 40) * (Math.PI / 180), base = num(v.base, -5) * (Math.PI / 180), C = pos(v.C, 150);
  const H = D * (Math.tan(top) - Math.tan(base)), dbh = C / Math.PI;
  return { H: s(H, 6), ft: s(H / 0.3048, 6), dbh: s(dbh, 6), basal: s(Math.PI * (dbh / 200) ** 2, 6), dbhIn: s(dbh / 2.54, 6) };
};
export const MAG_MODE = ["Microscope (objective × eyepiece)", "Telescope (focal lengths)", "Image size ÷ actual size"];
export const magnification: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 0) { const M = pos(v.obj, 40) * pos(v.eye, 10), fn = pos(v.fn, 20); return { M: s(M, 8), fov: s((fn / pos(v.obj, 40)) * 1000, 6), extra: `Field of view ${fmt(fn / pos(v.obj, 40), 5)} mm; useful max ≈ 1,000 × NA`, exit: "—" }; }
  if (m === 1) { const M = pos(v.fo, 1000) / pos(v.fe, 25), ap = pos(v.ap, 100); return { M: s(M, 8), fov: s(pos(v.afov, 52) / M, 6), extra: `Max useful ≈ ${fmt(2 * ap)}×; true field shown in degrees`, exit: s(ap / M, 6) }; }
  const M = pos(v.img, 50) / pos(v.act, 0.01);
  return { M: s(M, 8), fov: "—", extra: `Actual size = image ÷ magnification`, exit: "—" };
};
export const saToV: SciCalculator = (v) => {
  const sh = pick(v.shape, 4), a = pos(v.a, 2), b = pos(v.b, 3), c = pos(v.c, 4);
  let SA: number, V: number;
  if (sh === 0) { SA = 6 * a * a; V = a ** 3; }
  else if (sh === 1) { SA = 4 * Math.PI * a * a; V = (4 / 3) * Math.PI * a ** 3; }
  else if (sh === 2) { SA = 2 * Math.PI * a * (a + b); V = Math.PI * a * a * b; }
  else { SA = 2 * (a * b + b * c + a * c); V = a * b * c; }
  return { ratio: s(SA / V, 8), SA: s(SA, 8), V: s(V, 8), simplified: `${fmt(SA / V, 5)} : 1` };
};
export const SHAPES = ["Cube (side a)", "Sphere (radius a)", "Cylinder (radius a, height b)", "Rectangular prism (a × b × c)"];
export const STDADD_MODE = ["Percent recovery (spike recovery)", "Standard addition (unknown from spiked series)"];
export const standardAddition: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const sp = num(v.spiked, 19.2), un = num(v.unspiked, 9.8), add = pos(v.added, 10);
    return { result: s((100 * (sp - un)) / add, 6), detail: `(${fmt(sp)} − ${fmt(un)}) ÷ ${fmt(add)} × 100`, ok: Math.abs((100 * (sp - un)) / add - 100) <= 20 ? "Within 80–120%" : "Outside 80–120%" };
  }
  const x = listOf(v, "series", 2), y = listOf(v, "signal", 2);
  if (x.length !== y.length) throw new InputError("Enter one signal per added concentration.");
  const mx = mean(x), my = mean(y), m = sum(x.map((a, i) => (a - mx) * (y[i] - my))) / sum(x.map((a) => (a - mx) ** 2)), b = my - m * mx;
  return { result: s(b / m, 8), detail: `signal = ${fmt(m, 6)}·added + ${fmt(b, 6)}; unknown = intercept ÷ slope`, ok: "Concentration in the measured solution (multiply by any dilution)" };
};

export const sciGenCustomCalculators: Record<string, SciCalculator> = {
  "punnett-square-calculator": punnett,
  "serial-dilution-calculator": serialDilution,
  "blood-type-calculator": bloodType,
  "population-growth-calculator": populationGrowth,
  "hplc-column-volume-calculator": columnVolume,
  "hardy-weinberg-calculator": hardyWeinberg,
  "eye-color-calculator": eyeColor,
  "hemocytometer-calculator": hemocytometer,
  "water-potential-calculator": waterPotential,
  "dihybrid-cross-calculator": dihybrid,
  "cell-seeding-calculator": cellSeeding,
  "raman-shift-calculator": ramanShift,
  "cell-doubling-time-calculator": doublingTime,
  "simpsons-diversity-index-calculator": simpson,
  "shannon-diversity-index-calculator": shannon,
  "height-genetics-calculator": heightGenetics,
  "log-reduction-calculator": logReduction,
  "hplc-flow-rate-calculator": hplcTransfer,
  "tree-height-calculator": treeHeight,
  "magnification-calculator": magnification,
  "cfu-calculator": cfu,
  "surface-area-to-volume-ratio-calculator": saToV,
  "hair-color-genetics-calculator": hairColor,
  "standard-addition-calculator": standardAddition,
  "carrying-capacity-calculator": carryingCapacity,
  "dmso-dilution-calculator": dmso,
  "specific-activity-calculator": specificActivity,
};

