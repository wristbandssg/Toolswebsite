/**
 * Batch: "Science Calculators" → Statistics & Probability (hypothesis tests, power & A/B testing — 30 tools).
 *
 * Exact reference distributions from sci-math-core (t, χ², F via incomplete beta/gamma; normal via
 * erf). Tests: one/two-sample and paired t (Welch or pooled), z tests, one-proportion and
 * two-proportion z, chi-square goodness-of-fit and independence (r × c), one-way ANOVA, Mann-
 * Whitney U and Wilcoxon signed-rank (normal approximation with tie and continuity corrections),
 * Kruskal-Wallis H, Friedman χ², Fisher's exact test (2 × 2, two-sided by summing tables at least
 * as extreme), McNemar (continuity corrected), Shapiro-Wilk W (Royston 1992 approximation, n 4–
 * 2000), Grubbs' test, Sobel test, Benjamini-Hochberg FDR and Bonferroni. Sample sizes: Cochran
 * n₀ = z²p(1 − p)/e² with finite-population correction, Slovin n = N/(1 + Ne²), two-proportion
 * A/B sizes, success-run reliability n = ln(1 − C)/ln R. See prisma/create-sci-hyp-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, listOf, matrixOf, mean, variance, sorted, sum, normCdf, normInv, tCdf, tInv, chi2Cdf, chi2Inv, fCdf, fInv, lnChoose } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
export const TAILS = ["Two-tailed (≠)", "Left-tailed (<)", "Right-tailed (>)"];
const pT = (t: number, df: number, tail: number) => (tail === 0 ? 2 * (1 - tCdf(Math.abs(t), df)) : tail === 1 ? tCdf(t, df) : 1 - tCdf(t, df));
const pZ = (z: number, tail: number) => (tail === 0 ? 2 * (1 - normCdf(Math.abs(z))) : tail === 1 ? normCdf(z) : 1 - normCdf(z));
export const DECISION = ["Reject H₀ — statistically significant", "Fail to reject H₀ — not significant"];
const dec = (p: number, a: number) => (p < a ? 0 : 1);
const alphaOf = (v: Vals) => {
  const a = pos(v.alpha, 0.05);
  if (!(a > 0 && a < 1)) throw new InputError("α must be between 0 and 1.");
  return a;
};
const ranks = (a: number[]) => {
  const idx = a.map((x, i) => [x, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length).fill(0);
  let ties = 0;
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    const t = j - i + 1;
    ties += t ** 3 - t;
    i = j + 1;
  }
  return { r, ties };
};

// ---------- p-values & critical values ----------
export const STAT_KINDS = ["z", "t", "χ² (chi-square)", "F"];
export const pValue: SciCalculator = (v) => {
  const k = pick(v.kind, 4), x = num(v.stat, 2.1), df1 = Math.max(1, pos(v.df1, 20)), df2 = Math.max(1, pos(v.df2, 10)), tail = pick(v.tail, 3), a = alphaOf(v);
  let p: number;
  if (k === 0) p = pZ(x, tail);
  else if (k === 1) p = pT(x, df1, tail);
  else if (k === 2) p = 1 - chi2Cdf(x, df1);
  else p = 1 - fCdf(x, df1, df2);
  return { p: s(p, 10), decision: dec(p, a), note: k >= 2 ? "χ² and F tests are right-tailed." : `${TAILS[tail]} test.` };
};
export const criticalValue: SciCalculator = (v) => {
  const k = pick(v.kind, 4), a = alphaOf(v), df1 = Math.max(1, pos(v.df1, 20)), df2 = Math.max(1, pos(v.df2, 10)), tail = pick(v.tail, 3);
  let c: string;
  if (k === 0) c = tail === 0 ? `±${fmt(normInv(1 - a / 2), 8)}` : tail === 1 ? fmt(normInv(a), 8) : fmt(normInv(1 - a), 8);
  else if (k === 1) c = tail === 0 ? `±${fmt(tInv(1 - a / 2, df1), 8)}` : tail === 1 ? fmt(tInv(a, df1), 8) : fmt(tInv(1 - a, df1), 8);
  else if (k === 2) c = tail === 0 ? `${fmt(chi2Inv(a / 2, df1), 8)} and ${fmt(chi2Inv(1 - a / 2, df1), 8)}` : tail === 1 ? fmt(chi2Inv(a, df1), 8) : fmt(chi2Inv(1 - a, df1), 8);
  else c = fmt(fInv(1 - a, df1, df2), 8);
  return { critical: c, region: k === 3 ? "reject H₀ if F is larger" : tail === 0 ? "reject H₀ beyond the critical values" : tail === 1 ? "reject H₀ below" : "reject H₀ above" };
};
export const tCritical: SciCalculator = (v) => {
  const a = alphaOf(v), df = Math.max(1, pos(v.df, 20)), conf = 1 - a;
  return { twoTail: s(tInv(1 - a / 2, df), 10), oneTail: s(tInv(1 - a, df), 10), conf: `${fmt(conf * 100)}% two-sided interval uses ±${fmt(tInv(1 - a / 2, df), 8)}`, zCompare: s(normInv(1 - a / 2), 10) };
};
export const degreesFreedom: SciCalculator = (v) => {
  const t = pick(v.test, 6), n1 = Math.max(1, pos(v.n1, 20)), n2 = Math.max(1, pos(v.n2, 25)), s1 = pos(v.s1, 4), s2 = pos(v.s2, 5), r = Math.max(2, pos(v.r, 3)), c = Math.max(2, pos(v.c, 4));
  let df: number, f: string;
  if (t === 0) [df, f] = [n1 - 1, "n − 1"];
  else if (t === 1) [df, f] = [n1 + n2 - 2, "n₁ + n₂ − 2 (pooled)"];
  else if (t === 2) {
    const a = (s1 * s1) / n1, b = (s2 * s2) / n2;
    df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1));
    f = "Welch-Satterthwaite";
  } else if (t === 3) [df, f] = [(r - 1) * (c - 1), "(rows − 1)(columns − 1)"];
  else if (t === 4) [df, f] = [r - 1, "categories − 1"];
  else [df, f] = [n1 - r, `between = k − 1 = ${r - 1}; within = N − k`];
  return { df: s(df, 8), formula: f };
};
export const DF_TESTS = ["One-sample / paired t", "Two-sample t (pooled)", "Two-sample t (Welch)", "Chi-square independence (r × c)", "Chi-square goodness of fit (k categories)", "One-way ANOVA (N total, k groups)"];

// ---------- t tests ----------
const tOut = (t: number, df: number, tail: number, a: number, diff: number, se: number) => {
  const p = pT(t, df, tail), crit = tInv(1 - a / 2, df);
  return { t: s(t, 10), p: s(p, 10), df: s(df, 8), decision: dec(p, a), ci: `${fmt(diff - crit * se, 8)} to ${fmt(diff + crit * se, 8)}` };
};
export const oneSampleT: SciCalculator = (v) => {
  const a = alphaOf(v), tail = pick(v.tail, 3), mu0 = num(v.mu0, 50), ds = txt(v, "data");
  let m: number, sd: number, n: number;
  if (ds) {
    const d = listOf(v, "data", 2);
    [m, sd, n] = [mean(d), Math.sqrt(variance(d)), d.length];
  } else [m, sd, n] = [num(v.mean, 52), pos(v.sd, 6), Math.max(2, pos(v.n, 25))];
  const se = sd / Math.sqrt(n);
  return { ...tOut((m - mu0) / se, n - 1, tail, a, m - mu0, se), mean: s(m, 10) };
};
export const tTest: SciCalculator = (v) => {
  const a = alphaOf(v), tail = pick(v.tail, 3), x = listOf(v, "x", 2), y = listOf(v, "y", 2), welch = pick(v.var, 2) === 0;
  const m1 = mean(x), m2 = mean(y), v1 = variance(x), v2 = variance(y), n1 = x.length, n2 = y.length;
  let se: number, df: number;
  if (welch) {
    se = Math.sqrt(v1 / n1 + v2 / n2);
    df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  } else {
    const sp = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    se = Math.sqrt(sp * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  }
  return { ...tOut((m1 - m2) / se, df, tail, a, m1 - m2, se), means: `x̄₁ = ${fmt(m1, 8)}, x̄₂ = ${fmt(m2, 8)}` };
};
export const VARIANCE = ["Unequal variances (Welch)", "Equal variances (pooled)"];
export const twoSampleT: SciCalculator = (v) => {
  const a = alphaOf(v), tail = pick(v.tail, 3), welch = pick(v.var, 2) === 0;
  const m1 = num(v.m1, 75), s1 = pos(v.s1, 8), n1 = Math.max(2, pos(v.n1, 30)), m2 = num(v.m2, 70), s2 = pos(v.s2, 10), n2 = Math.max(2, pos(v.n2, 35));
  let se: number, df: number;
  if (welch) {
    se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
    df = ((s1 * s1) / n1 + (s2 * s2) / n2) ** 2 / (((s1 * s1) / n1) ** 2 / (n1 - 1) + ((s2 * s2) / n2) ** 2 / (n2 - 1));
  } else {
    const sp = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
    se = Math.sqrt(sp * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  }
  return { ...tOut((m1 - m2) / se, df, tail, a, m1 - m2, se), difference: s(m1 - m2, 10) };
};
export const pairedT: SciCalculator = (v) => {
  const a = alphaOf(v), tail = pick(v.tail, 3), x = listOf(v, "before", 2), y = listOf(v, "after", 2);
  if (x.length !== y.length) throw new InputError("Paired data needs the same number of before and after values.");
  const d = y.map((yy, i) => yy - x[i]), md = mean(d), se = Math.sqrt(variance(d)) / Math.sqrt(d.length);
  return { ...tOut(md / se, d.length - 1, tail, a, md, se), meanDiff: s(md, 10) };
};

// ---------- z tests ----------
export const Z_TYPES = ["One-sample mean (σ known)", "One proportion", "Two means (σ known)"];
export const zTest: SciCalculator = (v) => {
  const t = pick(v.type, 3), a = alphaOf(v), tail = pick(v.tail, 3);
  let z: number;
  if (t === 0) z = (num(v.xbar, 52) - num(v.mu0, 50)) / (pos(v.sigma, 6) / Math.sqrt(Math.max(1, pos(v.n, 36))));
  else if (t === 1) {
    const p = pos(v.phat, 0.56), p0 = pos(v.p0, 0.5), n = Math.max(1, pos(v.n, 200));
    z = (p - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  } else z = (num(v.xbar, 52) - num(v.mu0, 50)) / Math.sqrt(pos(v.sigma, 6) ** 2 / Math.max(1, pos(v.n, 36)) + pos(v.sigma2, 6) ** 2 / Math.max(1, pos(v.n2, 36)));
  const p = pZ(z, tail);
  return { z: s(z, 10), p: s(p, 10), decision: dec(p, a), critical: tail === 0 ? `±${fmt(normInv(1 - a / 2), 6)}` : fmt(normInv(tail === 1 ? a : 1 - a), 6) };
};
export const twoProportionZ: SciCalculator = (v) => {
  const a = alphaOf(v), tail = pick(v.tail, 3), x1 = pos(v.x1, 45), n1 = Math.max(1, pos(v.n1, 100)), x2 = pos(v.x2, 30), n2 = Math.max(1, pos(v.n2, 100));
  const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
  const z = (p1 - p2) / Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  const p = pZ(z, tail), se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2), zc = normInv(1 - a / 2);
  return { z: s(z, 10), p: s(p, 10), decision: dec(p, a), diff: s(p1 - p2, 8), ci: `${fmt(p1 - p2 - zc * se, 6)} to ${fmt(p1 - p2 + zc * se, 6)}` };
};
export const abSignificance: SciCalculator = (v) => {
  const a = alphaOf(v), va = pos(v.va, 1000), ca = pos(v.ca, 50), vb = pos(v.vb, 1000), cb = pos(v.cb, 65);
  if (!va || !vb) throw new InputError("Visitors must be positive.");
  const p1 = ca / va, p2 = cb / vb, pp = (ca + cb) / (va + vb);
  const z = (p2 - p1) / Math.sqrt(pp * (1 - pp) * (1 / va + 1 / vb));
  const p = 2 * (1 - normCdf(Math.abs(z)));
  // Bayesian probability B > A with Beta(1 + c, 1 + n − c) posteriors (normal approximation)
  const m1 = (ca + 1) / (va + 2), m2 = (cb + 1) / (vb + 2), v1 = (m1 * (1 - m1)) / (va + 3), v2 = (m2 * (1 - m2)) / (vb + 3);
  return { p: s(p, 8), decision: dec(p, a), lift: p1 ? s((100 * (p2 - p1)) / p1, 8) : "—", rates: `A ${fmt(100 * p1, 6)}%, B ${fmt(100 * p2, 6)}%`, confidence: s(100 * (1 - p), 6), bayes: s(100 * normCdf((m2 - m1) / Math.sqrt(v1 + v2)), 6) };
};

// ---------- Chi-square, ANOVA ----------
export const CHI_MODE = ["Test of independence (contingency table)", "Goodness of fit (observed vs expected)"];
export const chiSquare: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = alphaOf(v);
  if (m === 1) {
    const o = listOf(v, "obs", 2), es = txt(v, "exp");
    const tot = sum(o);
    const e = es ? listOf(v, "exp", 2) : o.map(() => tot / o.length);
    if (e.length !== o.length) throw new InputError("Enter one expected count per observed count.");
    const et = sum(e), ee = e.map((x) => (x * tot) / et);
    const x2 = sum(o.map((x, i) => (x - ee[i]) ** 2 / ee[i])), df = o.length - 1, p = 1 - chi2Cdf(x2, df);
    return { chi2: s(x2, 10), p: s(p, 10), df, decision: dec(p, a), expected: ee.map((x) => fmt(x, 6)).join(", "), critical: s(chi2Inv(1 - a, df), 8), cramersV: "—" };
  }
  const t = matrixOf(txt(v, "table"));
  const R = t.map((r) => sum(r)), C = t[0].map((_, j) => sum(t.map((r) => r[j]))), N = sum(R);
  const E = t.map((r, i) => r.map((_, j) => (R[i] * C[j]) / N));
  const x2 = sum(t.flatMap((r, i) => r.map((x, j) => (x - E[i][j]) ** 2 / E[i][j]))), df = (t.length - 1) * (t[0].length - 1);
  const p = 1 - chi2Cdf(x2, df);
  return { chi2: s(x2, 10), p: s(p, 10), df, decision: dec(p, a), expected: E.map((r) => r.map((x) => fmt(x, 5)).join("  ")).join("\n"), critical: s(chi2Inv(1 - a, df), 8), cramersV: s(Math.sqrt(x2 / (N * (Math.min(t.length, t[0].length) - 1))), 6) };
};
export const anova: SciCalculator = (v) => {
  const a = alphaOf(v);
  const groups = [txt(v, "g1"), txt(v, "g2"), txt(v, "g3"), txt(v, "g4")].map((g, i) => (g ? listOf(v, `g${i + 1}`, 2) : null)).filter(Boolean) as number[][];
  if (groups.length < 2) throw new InputError("Enter at least two groups.");
  const all = groups.flat(), N = all.length, k = groups.length, gm = mean(all);
  const ssb = sum(groups.map((g) => g.length * (mean(g) - gm) ** 2)), ssw = sum(groups.map((g) => sum(g.map((x) => (x - mean(g)) ** 2))));
  const dfb = k - 1, dfw = N - k, F = ssb / dfb / (ssw / dfw), p = 1 - fCdf(F, dfb, dfw);
  return { F: s(F, 10), p: s(p, 10), decision: dec(p, a), table: `Source    SS          df    MS\nBetween   ${fmt(ssb, 8).padEnd(11)} ${String(dfb).padEnd(5)} ${fmt(ssb / dfb, 8)}\nWithin    ${fmt(ssw, 8).padEnd(11)} ${String(dfw).padEnd(5)} ${fmt(ssw / dfw, 8)}\nTotal     ${fmt(ssb + ssw, 8).padEnd(11)} ${N - 1}`, etaSquared: s(ssb / (ssb + ssw), 8), means: groups.map((g, i) => `group ${i + 1}: ${fmt(mean(g), 8)}`).join(", ") };
};

// ---------- Non-parametric ----------
export const mannWhitney: SciCalculator = (v) => {
  const a = alphaOf(v), x = listOf(v, "x", 1), y = listOf(v, "y", 1), n1 = x.length, n2 = y.length;
  const { r, ties } = ranks([...x, ...y]);
  const R1 = sum(r.slice(0, n1)), U1 = R1 - (n1 * (n1 + 1)) / 2, U2 = n1 * n2 - U1, U = Math.min(U1, U2);
  const N = n1 + n2, mu = (n1 * n2) / 2, sd = Math.sqrt(((n1 * n2) / 12) * (N + 1 - ties / (N * (N - 1))));
  const z = (Math.abs(U - mu) - 0.5) / sd, p = 2 * (1 - normCdf(z));
  return { U: s(U, 10), z: s(z, 8), p: s(Math.min(1, p), 8), decision: dec(p, a), rankSums: `R₁ = ${fmt(R1)}, R₂ = ${fmt(sum(r.slice(n1)))}` };
};
export const wilcoxon: SciCalculator = (v) => {
  const a = alphaOf(v), x = listOf(v, "before", 2), y = listOf(v, "after", 2);
  if (x.length !== y.length) throw new InputError("Enter the same number of paired values.");
  const d = y.map((yy, i) => yy - x[i]).filter((t) => t !== 0), n = d.length;
  if (n < 2) throw new InputError("Need at least two non-zero differences.");
  const { r, ties } = ranks(d.map(Math.abs));
  const Wp = sum(r.filter((_, i) => d[i] > 0)), Wm = sum(r.filter((_, i) => d[i] < 0)), W = Math.min(Wp, Wm);
  const mu = (n * (n + 1)) / 4, sd = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - ties / 48);
  const z = (Math.abs(W - mu) - 0.5) / sd, p = 2 * (1 - normCdf(z));
  return { W: s(W, 10), z: s(z, 8), p: s(Math.min(1, p), 8), decision: dec(p, a), sums: `W+ = ${fmt(Wp)}, W− = ${fmt(Wm)}, n = ${n} non-zero pairs` };
};
export const kruskal: SciCalculator = (v) => {
  const a = alphaOf(v);
  const groups = [txt(v, "g1"), txt(v, "g2"), txt(v, "g3"), txt(v, "g4")].map((g, i) => (g ? listOf(v, `g${i + 1}`, 1) : null)).filter(Boolean) as number[][];
  if (groups.length < 2) throw new InputError("Enter at least two groups.");
  const all = groups.flat(), N = all.length;
  const { r, ties } = ranks(all);
  let off = 0, H = 0;
  for (const g of groups) {
    const Ri = sum(r.slice(off, off + g.length));
    H += (Ri * Ri) / g.length;
    off += g.length;
  }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  H /= 1 - ties / (N ** 3 - N);
  const df = groups.length - 1, p = 1 - chi2Cdf(H, df);
  return { H: s(H, 10), p: s(p, 10), df, decision: dec(p, a) };
};
export const friedman: SciCalculator = (v) => {
  const a = alphaOf(v), m = matrixOf(txt(v, "table"));
  const n = m.length, k = m[0].length;
  if (k < 2 || n < 2) throw new InputError("Need at least 2 subjects (rows) and 2 treatments (columns).");
  const R = new Array(k).fill(0);
  for (const row of m) ranks(row).r.forEach((x, j) => (R[j] += x));
  const Q = (12 / (n * k * (k + 1))) * sum(R.map((x) => x * x)) - 3 * n * (k + 1);
  const p = 1 - chi2Cdf(Q, k - 1);
  return { Q: s(Q, 10), p: s(p, 10), df: k - 1, decision: dec(p, a), rankSums: R.map((x) => fmt(x)).join(", ") };
};
export const fisherExact: SciCalculator = (v) => {
  const a = Math.round(pos(v.a, 8)), b = Math.round(pos(v.b, 2)), c = Math.round(pos(v.c, 1)), d = Math.round(pos(v.d, 5));
  const r1 = a + b, r2 = c + d, c1 = a + c, N = r1 + r2;
  const pTab = (x: number) => Math.exp(lnChoose(r1, x) + lnChoose(r2, c1 - x) - lnChoose(N, c1));
  const p0 = pTab(a);
  let two = 0, left = 0, right = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) {
    const px = pTab(x);
    if (px <= p0 * (1 + 1e-7)) two += px;
    if (x <= a) left += px;
    if (x >= a) right += px;
  }
  return { p: s(Math.min(1, two), 10), left: s(left, 10), right: s(right, 10), oddsRatio: b * c ? s((a * d) / (b * c), 8) : "∞", decision: dec(two, pos(v.alpha, 0.05)) };
};
export const mcnemar: SciCalculator = (v) => {
  const b = pos(v.b, 15), c = pos(v.c, 5), a = alphaOf(v);
  if (b + c === 0) throw new InputError("Need at least one discordant pair.");
  const x2 = (Math.abs(b - c) - 1) ** 2 / (b + c), p = 1 - chi2Cdf(x2, 1);
  let exact = 0;
  const n = b + c, k = Math.min(b, c);
  for (let i = 0; i <= k; i++) exact += Math.exp(lnChoose(n, i) - n * Math.LN2);
  return { chi2: s(x2, 10), p: s(p, 10), exact: s(Math.min(1, 2 * exact), 10), decision: dec(p, a) };
};
export const shapiroWilk: SciCalculator = (v) => {
  const x = sorted(listOf(v, "data", 4)), n = x.length, a0 = alphaOf(v);
  if (n > 2000) throw new InputError("Up to 2,000 values.");
  const m = x.map((_, i) => normInv((i + 1 - 0.375) / (n + 0.25)));
  const mm = sum(m.map((t) => t * t)), u = 1 / Math.sqrt(n);
  const c = m.map((t) => t / Math.sqrt(mm));
  const an = c[n - 1] + 0.221157 * u - 0.147981 * u ** 2 - 2.07119 * u ** 3 + 4.434685 * u ** 4 - 2.706056 * u ** 5;
  const a = new Array(n).fill(0);
  if (n > 5) {
    const an1 = c[n - 2] + 0.042981 * u - 0.293762 * u ** 2 - 1.752461 * u ** 3 + 5.682633 * u ** 4 - 3.582633 * u ** 5;
    const phi = (mm - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an ** 2 - 2 * an1 ** 2);
    for (let i = 0; i < n; i++) a[i] = m[i] / Math.sqrt(phi);
    a[n - 1] = an;
    a[0] = -an;
    a[n - 2] = an1;
    a[1] = -an1;
  } else {
    const phi = (mm - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2);
    for (let i = 0; i < n; i++) a[i] = m[i] / Math.sqrt(phi);
    a[n - 1] = an;
    a[0] = -an;
  }
  const mx = mean(x), W = sum(a.map((ai, i) => ai * x[i])) ** 2 / sum(x.map((t) => (t - mx) ** 2));
  let p: number;
  if (n <= 11) {
    const g = -2.273 + 0.459 * n, mu = 0.544 - 0.39978 * n + 0.025054 * n * n - 0.0006714 * n ** 3, sg = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n * n - 0.0020322 * n ** 3);
    const w = -Math.log(g - Math.log(1 - W));
    p = 1 - normCdf((w - mu) / sg);
  } else {
    const ln = Math.log(n), mu = 0.0038915 * ln ** 3 - 0.083751 * ln ** 2 - 0.31082 * ln - 1.5861, sg = Math.exp(0.0030302 * ln ** 2 - 0.082676 * ln - 0.4803);
    p = 1 - normCdf((Math.log(1 - W) - mu) / sg);
  }
  return { W: s(W, 8), p: s(p, 8), normal: p < a0 ? 1 : 0, n };
};
export const NORMALITY = ["Consistent with normality (p ≥ α)", "Not normal (p < α)"];
export const grubbs: SciCalculator = (v) => {
  const x = listOf(v, "data", 3), n = x.length, a = alphaOf(v), m = mean(x), sd = Math.sqrt(variance(x));
  const far = x.reduce((p, q) => (Math.abs(q - m) > Math.abs(p - m) ? q : p));
  const G = Math.abs(far - m) / sd;
  const tc = tInv(1 - a / (2 * n), n - 2), Gc = ((n - 1) / Math.sqrt(n)) * Math.sqrt((tc * tc) / (n - 2 + tc * tc));
  // Dixon's Q for the same suspect value
  const srt = sorted(x), q = far === srt[0] ? (srt[1] - srt[0]) / (srt[n - 1] - srt[0]) : (srt[n - 1] - srt[n - 2]) / (srt[n - 1] - srt[0]);
  return { G: s(G, 8), critical: s(Gc, 8), suspect: s(far, 10), outlier: G > Gc ? 0 : 1, dixonQ: s(q, 6) };
};
export const OUTLIER = ["Outlier at this α", "Not an outlier"];
export const sobel: SciCalculator = (v) => {
  const a = num(v.a, 0.5), sa = pos(v.sa, 0.1), b = num(v.b, 0.4), sb = pos(v.sb, 0.12);
  const z = (a * b) / Math.sqrt(b * b * sa * sa + a * a * sb * sb);
  return { z: s(z, 8), p: s(2 * (1 - normCdf(Math.abs(z))), 8), indirect: s(a * b, 8), decision: dec(2 * (1 - normCdf(Math.abs(z))), alphaOf(v)) };
};
export const bonferroni: SciCalculator = (v) => {
  const ps = listOf(v, "p", 1), a = alphaOf(v), m = ps.length;
  const idx = ps.map((p, i) => [p, i] as [number, number]).sort((p, q) => p[0] - q[0]);
  const q = new Array(m).fill(0);
  let prev = 1;
  for (let k = m - 1; k >= 0; k--) {
    const val = Math.min(prev, (idx[k][0] * m) / (k + 1));
    q[idx[k][1]] = val;
    prev = val;
  }
  return { bonferroni: s(a / m, 8), adjusted: ps.map((p) => fmt(Math.min(1, p * m), 6)).join(", "), fdr: q.map((x) => fmt(x, 6)).join(", "), significant: `Bonferroni: ${ps.filter((p) => p < a / m).length} of ${m}; BH-FDR: ${q.filter((x) => x < a).length} of ${m}` };
};
export const statSignificance: SciCalculator = (v) => {
  const a = alphaOf(v), m1 = num(v.m1, 52), s1 = pos(v.s1, 8), n1 = Math.max(2, pos(v.n1, 40)), m2 = num(v.m2, 48), s2 = pos(v.s2, 9), n2 = Math.max(2, pos(v.n2, 40));
  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2), t = (m1 - m2) / se;
  const df = ((s1 * s1) / n1 + (s2 * s2) / n2) ** 2 / (((s1 * s1) / n1) ** 2 / (n1 - 1) + ((s2 * s2) / n2) ** 2 / (n2 - 1));
  const p = pT(t, df, 0);
  const pooled = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  return { p: s(p, 10), decision: dec(p, a), t: s(t, 8), confidence: s(100 * (1 - p), 6), effect: s((m1 - m2) / pooled, 6) };
};

// ---------- Sample size, power, effect size ----------
export const sampleSize: SciCalculator = (v) => {
  const conf = pos(v.conf, 95) / 100, e = pos(v.e, 5) / 100, p = Math.min(1, pos(v.p, 50) / 100), N = pos(v.N, 0);
  const z = normInv(1 - (1 - conf) / 2), n0 = (z * z * p * (1 - p)) / (e * e);
  const n = N ? n0 / (1 + (n0 - 1) / N) : n0;
  return { n: Math.ceil(n), n0: Math.ceil(n0), z: s(z, 6), formula: N ? "Cochran n₀ = z²p(1 − p)/e², then n = n₀/(1 + (n₀ − 1)/N)" : "Cochran n₀ = z²p(1 − p)/e²" };
};
export const slovin: SciCalculator = (v) => {
  const N = Math.max(1, pos(v.N, 1000)), e = pos(v.e, 5) / 100;
  return { n: Math.ceil(N / (1 + N * e * e)), exact: s(N / (1 + N * e * e), 8), note: "Slovin assumes p = 0.5 and ~95% confidence; Cochran's formula is more flexible." };
};
export const abSampleSize: SciCalculator = (v) => {
  const base = pos(v.base, 5) / 100, mde = pos(v.mde, 20) / 100, rel = pick(v.rel, 2) === 0, a = alphaOf(v), power = pos(v.power, 80) / 100, daily = pos(v.daily, 0);
  const p2 = rel ? base * (1 + mde) : base + mde;
  if (!(p2 > 0 && p2 < 1)) throw new InputError("The baseline plus the effect must stay between 0% and 100%.");
  const za = normInv(1 - a / 2), zb = normInv(power), pb = (base + p2) / 2;
  const n = ((za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(base * (1 - base) + p2 * (1 - p2))) ** 2) / (p2 - base) ** 2;
  return { perVariant: Math.ceil(n), total: Math.ceil(n) * 2, target: s(100 * p2, 6), days: daily ? Math.ceil((2 * Math.ceil(n)) / daily) : "enter daily traffic" };
};
export const MDE_TYPE = ["Relative (% of baseline)", "Absolute (percentage points)"];
export const powerAnalysis: SciCalculator = (v) => {
  const mode = pick(v.mode, 2), d = pos(v.d, 0.5), a = alphaOf(v), tail = pick(v.tail, 2);
  const za = normInv(1 - (tail === 0 ? a / 2 : a));
  if (mode === 0) {
    const pw = pos(v.power, 80) / 100;
    if (!(pw > 0 && pw < 1)) throw new InputError("Power must be between 0 and 100%.");
    const zb = normInv(pw);
    // two-sample t: iterate with t quantiles
    let n = 2 * ((za + zb) / d) ** 2;
    for (let i = 0; i < 20; i++) {
      const df = 2 * n - 2;
      n = 2 * ((tInv(1 - (tail === 0 ? a / 2 : a), df) + tInv(pw, df)) / d) ** 2;
    }
    return { result: Math.ceil(n), total: 2 * Math.ceil(n), note: "Per-group n for a two-sample t-test (G*Power-style noncentral approximation)." };
  }
  const n = Math.max(2, pos(v.n, 64));
  const ncp = d * Math.sqrt(n / 2), df = 2 * n - 2, tc = tInv(1 - (tail === 0 ? a / 2 : a), df);
  const pw = 1 - tCdf(tc - ncp, df) + (tail === 0 ? tCdf(-tc - ncp, df) : 0);
  return { result: s(100 * pw, 6), total: 2 * n, note: "Power (%) of a two-sample t-test with n per group." };
};
export const POWER_MODE = ["Find sample size (per group)", "Find power"];
export const TAIL2 = ["Two-tailed", "One-tailed"];
export const effectSize: SciCalculator = (v) => {
  const m1 = num(v.m1, 75), s1 = pos(v.s1, 10), n1 = Math.max(2, pos(v.n1, 30)), m2 = num(v.m2, 70), s2 = pos(v.s2, 12), n2 = Math.max(2, pos(v.n2, 30));
  const sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  const d = (m1 - m2) / sp, g = d * (1 - 3 / (4 * (n1 + n2) - 9));
  const ad = Math.abs(d);
  return { d: s(d, 8), hedgesG: s(g, 8), glass: s((m1 - m2) / s2, 8), size: ad < 0.2 ? 0 : ad < 0.5 ? 1 : ad < 0.8 ? 2 : 3, r: s(d / Math.sqrt(d * d + 4), 8) };
};
export const EFFECT = ["Negligible (< 0.2)", "Small (0.2)", "Medium (0.5)", "Large (0.8+)"];
export const reliabilitySampleSize: SciCalculator = (v) => {
  const R = pos(v.R, 95) / 100, C = pos(v.C, 90) / 100, f = Math.round(pos(v.f, 0));
  if (!(R > 0 && R < 1 && C > 0 && C < 1)) throw new InputError("Reliability and confidence must be between 0 and 100%.");
  if (f === 0) return { n: Math.ceil(Math.log(1 - C) / Math.log(R)), failures: 0, method: "Success-run: n = ln(1 − C)/ln(R)" };
  let n = f + 1;
  const cdf = (nn: number) => {
    let t = 0;
    for (let i = 0; i <= f; i++) t += Math.exp(lnChoose(nn, i) + i * Math.log(1 - R) + (nn - i) * Math.log(R));
    return t;
  };
  while (cdf(n) > 1 - C && n < 1e6) n++;
  return { n, failures: f, method: "Binomial: smallest n with P(≤ f failures | R) ≤ 1 − C" };
};

export const sciHypCustomCalculators: Record<string, SciCalculator> = {
  "p-value-calculator": pValue,
  "chi-square-calculator": chiSquare,
  "t-test-calculator": tTest,
  "t-critical-value-calculator": tCritical,
  "slovins-formula-calculator": slovin,
  "anova-calculator": anova,
  "z-test-calculator": zTest,
  "statistical-significance-calculator": statSignificance,
  "sample-size-calculator": sampleSize,
  "bonferroni-correction-calculator": bonferroni,
  "degrees-of-freedom-calculator": degreesFreedom,
  "critical-value-calculator": criticalValue,
  "power-analysis-calculator": powerAnalysis,
  "paired-t-test-calculator": pairedT,
  "effect-size-calculator": effectSize,
  "fisher-exact-test-calculator": fisherExact,
  "mann-whitney-u-test-calculator": mannWhitney,
  "two-sample-t-test-calculator": twoSampleT,
  "ab-test-significance-calculator": abSignificance,
  "ab-test-sample-size-calculator": abSampleSize,
  "wilcoxon-signed-rank-test-calculator": wilcoxon,
  "shapiro-wilk-test-calculator": shapiroWilk,
  "sobel-test-calculator": sobel,
  "one-sample-t-test-calculator": oneSampleT,
  "kruskal-wallis-test-calculator": kruskal,
  "grubbs-test-calculator": grubbs,
  "reliability-sample-size-calculator": reliabilitySampleSize,
  "friedman-test-calculator": friedman,
  "two-proportion-z-test-calculator": twoProportionZ,
  "mcnemar-test-calculator": mcnemar,
};

