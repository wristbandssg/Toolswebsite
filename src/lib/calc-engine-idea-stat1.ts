/**
 * Idea build, batch stat1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Statistics & Probability = 18 tools.
 * Standard methods: Tukey box-plot fences, grouped-data mean/variance, empirical rule, χ² and F critical values (inverse CDFs),
 * Welch and pooled two-sample intervals, two-way ANOVA (balanced, with replication), exact binomial sign test, Levene/Brown–Forsythe,
 * Kendall's τ-b, Cronbach's α, odds ratio with Woolf CI, diagnostic likelihood ratios, Benjamini–Hochberg FDR, simple exponential
 * smoothing, ratio-to-moving-average seasonal index. Monty Hall uses exact probabilities plus a seeded simulation.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt } from "./trv-core";
import { txt, fmt, listOf, mean, variance, median, quantile, sorted, chi2Inv, chi2Cdf, fInv, fCdf, tInv, normCdf, normInv, choose } from "./sci-math-core";

const f4 = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 5);
const pv = (p: number) => (p < 0.0001 ? "< 0.0001" : f4(p));
const alphaIn = (v: Record<string, number>, k = "a", d = 0.05) => { const a = num(v[k], d); if (!(a > 0 && a < 1)) throw new InputError("Significance level must be between 0 and 1 (e.g. 0.05)."); return a; };
const groups = (s: string) => s.split(/[;\n]+/).map((g) => g.trim()).filter(Boolean).map((g) => g.split(/[\s,]+/).filter(Boolean).map((x) => { const n = Number(x); if (!Number.isFinite(n)) throw new InputError(`"${x}" is not a number.`); return n; }));
const sd = (a: number[]) => Math.sqrt(variance(a));

export const boxPlot: Calc = (v) => {
  const d = sorted(listOf(v, "d", 4)), q1 = quantile(d, 0.25), q3 = quantile(d, 0.75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const inside = d.filter((x) => x >= lo && x <= hi), out = d.filter((x) => x < lo || x > hi);
  return { f: `Min ${f4(d[0])} · Q1 ${f4(q1)} · median ${f4(median(d))} · Q3 ${f4(q3)} · max ${f4(d[d.length - 1])}`, w: `Whiskers ${f4(inside[0])} to ${f4(inside[inside.length - 1])} · fences ${f4(lo)} and ${f4(hi)} · IQR ${f4(iqr)}`, note: out.length ? `Outliers: ${out.map(f4).join(", ")}` : `No outliers · n = ${d.length}, mean ${f4(mean(d))}` };
};
export const groupedMean: Calc = (v) => {
  const rows = (txt(v, "g") || "0-10 5; 10-20 12; 20-30 18; 30-40 10; 40-50 5").split(/[;\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => { const m = r.match(/^(-?[\d.]+)\s*[-–to]+\s*(-?[\d.]+)\s+([\d.]+)$/); if (!m) throw new InputError(`Couldn't read "${r}" — write classes like 10-20 12.`); return { a: +m[1], b: +m[2], f: +m[3] }; });
  const N = rows.reduce((s, r) => s + r.f, 0); if (!N) throw new InputError("Frequencies can't all be 0.");
  const mu = rows.reduce((s, r) => s + ((r.a + r.b) / 2) * r.f, 0) / N, var0 = rows.reduce((s, r) => s + r.f * ((r.a + r.b) / 2 - mu) ** 2, 0) / (N - 1);
  let cum = 0, med = 0; for (const r of rows) { if (cum + r.f >= N / 2) { med = r.a + ((N / 2 - cum) / r.f) * (r.b - r.a); break; } cum += r.f; }
  const mi = rows.reduce((bi, r, i) => (r.f > rows[bi].f ? i : bi), 0), M = rows[mi], f0 = rows[mi - 1]?.f ?? 0, f2 = rows[mi + 1]?.f ?? 0, mode = M.a + ((M.f - f0) / (2 * M.f - f0 - f2 || 1)) * (M.b - M.a);
  return { m: `Estimated mean = ${f4(mu)}`, o: `Median ≈ ${f4(med)} · mode ≈ ${f4(mode)} · SD ≈ ${f4(Math.sqrt(var0))}`, note: `n = ${nfmt(N)} · mean = Σ(midpoint × f) ÷ Σf — an estimate, since the raw values are grouped` };
};
export const empirical: Calc = (v) => {
  const m = num(v.m, 100), s = num(v.s, 15), x = num(v.x, 130);
  if (!(s > 0)) throw new InputError("SD must be positive.");
  const z = (x - m) / s;
  return { r: `68% between ${f4(m - s)} and ${f4(m + s)} · 95% between ${f4(m - 2 * s)} and ${f4(m + 2 * s)} · 99.7% between ${f4(m - 3 * s)} and ${f4(m + 3 * s)}`, z: `${f4(x)} is ${f4(z)} SD from the mean — ${f4(normCdf(z) * 100)}% of values are below it`, note: "68–95–99.7 rule for normal data (exact: 68.27%, 95.45%, 99.73%)" };
};
export const chiCrit: Calc = (v) => {
  const df = num(v.d, 5), a = alphaIn(v), t = pick(v.t, 3);
  if (!(df > 0)) throw new InputError("Degrees of freedom must be positive.");
  const r = chi2Inv(1 - a, df), l = chi2Inv(a, df);
  return { c: t === 0 ? `χ² critical (right tail) = ${f4(r)}` : t === 1 ? `χ² critical (left tail) = ${f4(l)}` : `Two-tailed: ${f4(chi2Inv(a / 2, df))} and ${f4(chi2Inv(1 - a / 2, df))}`, how: `df = ${f4(df)}, α = ${f4(a)} · reject H₀ if your χ² is beyond this`, note: `Check: P(χ² > ${f4(r)}) = ${f4(1 - chi2Cdf(r, df))}` };
};
export const fCrit: Calc = (v) => {
  const d1 = num(v.d, 3), d2 = num(v.e, 20), a = alphaIn(v), two = pick(v.t, 2) === 1;
  if (!(d1 > 0 && d2 > 0)) throw new InputError("Degrees of freedom must be positive.");
  return { c: two ? `Two-tailed: ${f4(fInv(a / 2, d1, d2))} and ${f4(fInv(1 - a / 2, d1, d2))}` : `F critical (right tail) = ${f4(fInv(1 - a, d1, d2))}`, how: `df₁ = ${f4(d1)} (numerator), df₂ = ${f4(d2)} (denominator), α = ${f4(a)}`, note: `Used for ANOVA and variance-ratio tests · check P(F > crit) = ${f4(1 - fCdf(fInv(1 - a, d1, d2), d1, d2))}` };
};
export const montyHall: Calc = (v) => {
  const n = Math.round(num(v.n, 3)), o = Math.round(num(v.o, 1)), trials = Math.min(200000, Math.max(100, Math.round(num(v.t, 10000))));
  if (n < 3 || o < 1 || o > n - 2) throw new InputError("Need at least 3 doors and the host opens between 1 and doors − 2.");
  const stay = 1 / n, sw = ((n - 1) / n) * (1 / (n - 1 - o));
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let ws = 0, wsw = 0; for (let k = 0; k < trials; k++) { const car = Math.floor(rnd() * n), pick0 = Math.floor(rnd() * n); if (car === pick0) ws++; else if (rnd() < 1 / (n - 1 - o)) wsw++; }
  return { p: `Stay wins ${f4(stay * 100)}% · switch wins ${f4(sw * 100)}%`, s: `Simulation of ${nfmt(trials)} games: stay ${f4((ws / trials) * 100)}%, switch ${f4((wsw / trials) * 100)}%`, note: `Switching ${sw > stay ? "is better" : "doesn't help"} — with ${n} doors and ${o} opened, your first pick keeps its 1/${n} chance while the rest moves to the closed doors` };
};
export const ciDiff: Calc = (v) => {
  const m1 = num(v.a, 75), s1 = num(v.b, 10), n1 = num(v.c, 40), m2 = num(v.d, 70), s2 = num(v.e, 12), n2 = num(v.f, 35), cl = num(v.l, 95) / 100, pool = pick(v.p, 2) === 1;
  if (!(n1 > 1 && n2 > 1 && s1 >= 0 && s2 >= 0 && cl > 0 && cl < 1)) throw new InputError("Check the sample sizes (2+), SDs and confidence level.");
  const d = m1 - m2; let se: number, df: number;
  if (pool) { const sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)); se = sp * Math.sqrt(1 / n1 + 1 / n2); df = n1 + n2 - 2; }
  else { const a = (s1 * s1) / n1, b = (s2 * s2) / n2; se = Math.sqrt(a + b); df = (a + b) ** 2 / (a * a / (n1 - 1) + b * b / (n2 - 1)); }
  const t = tInv(1 - (1 - cl) / 2, df), me = t * se;
  return { ci: `${f4(cl * 100)}% CI for μ₁ − μ₂: (${f4(d - me)}, ${f4(d + me)})`, d: `Difference ${f4(d)} ± ${f4(me)} · SE ${f4(se)} · t* = ${f4(t)} (df ${f4(df)})`, note: `${d - me > 0 || d + me < 0 ? "The interval excludes 0 — a significant difference" : "The interval includes 0 — no significant difference"} · ${pool ? "pooled variance" : "Welch (unequal variances)"}` };
};
export const twoWayAnova: Calc = (v) => {
  const A = Math.round(num(v.a, 2)), B = Math.round(num(v.b, 3)), cells = groups(txt(v, "d") || "5 6 7; 8 9 7; 6 5 6; 7 8 9; 10 11 12; 8 9 10");
  if (A < 2 || B < 2) throw new InputError("Each factor needs at least 2 levels.");
  if (cells.length !== A * B) throw new InputError(`Enter ${A * B} cells (factor A levels × factor B levels), separated by ; — row by row.`);
  const r = cells[0].length; if (r < 2 || cells.some((c) => c.length !== r)) throw new InputError("Every cell needs the same number of replicates (2+).");
  const all = cells.flat(), G = mean(all), cm = (i: number, j: number) => mean(cells[i * B + j]);
  const am = Array.from({ length: A }, (_, i) => mean(cells.slice(i * B, i * B + B).flat())), bm = Array.from({ length: B }, (_, j) => mean(Array.from({ length: A }, (_, i) => cells[i * B + j]).flat()));
  const ssA = B * r * am.reduce((s, x) => s + (x - G) ** 2, 0), ssB = A * r * bm.reduce((s, x) => s + (x - G) ** 2, 0);
  let ssAB = 0, ssE = 0; for (let i = 0; i < A; i++) for (let j = 0; j < B; j++) { ssAB += r * (cm(i, j) - am[i] - bm[j] + G) ** 2; for (const x of cells[i * B + j]) ssE += (x - cm(i, j)) ** 2; }
  const dfA = A - 1, dfB = B - 1, dfAB = dfA * dfB, dfE = A * B * (r - 1), msE = ssE / dfE;
  const row = (n: string, ss: number, df: number) => { const F = ss / df / msE; return `${n}: SS ${f4(ss)}, df ${df}, F ${f4(F)}, p ${pv(1 - fCdf(F, df, dfE))}`; };
  return { a: row("Factor A", ssA, dfA), b: row("Factor B", ssB, dfB), i: `${row("A × B interaction", ssAB, dfAB)} · error SS ${f4(ssE)}, df ${dfE}` };
};
export const signTest: Calc = (v) => {
  const d = listOf(v, "d", 2), m0 = num(v.m, 0), dd = d.map((x) => x - m0).filter((x) => x !== 0), n = dd.length, pos = dd.filter((x) => x > 0).length;
  if (!n) throw new InputError("All values equal the hypothesised median.");
  const k = Math.min(pos, n - pos); let p = 0; for (let i = 0; i <= k; i++) p += choose(n, i) * 0.5 ** n; p = Math.min(1, 2 * p);
  return { p: `Two-sided p-value = ${pv(p)}`, c: `${pos} above, ${n - pos} below the median ${f4(m0)} (${d.length - n} ties dropped)`, note: `${p < 0.05 ? "Significant at 5%" : "Not significant at 5%"} · exact binomial test with p = 0.5 — for paired data, enter the differences` };
};
export const levene: Calc = (v) => {
  const g = groups(txt(v, "d") || "12 15 11 14 13; 20 9 25 6 18; 14 16 15 13 17"), bf = pick(v.c, 2) === 0;
  if (g.length < 2 || g.some((x) => x.length < 2)) throw new InputError("Enter 2+ groups of 2+ values, separated by ;");
  const z = g.map((x) => { const c = bf ? median(x) : mean(x); return x.map((y) => Math.abs(y - c)); }), N = g.reduce((s, x) => s + x.length, 0), k = g.length;
  const zm = z.map(mean), Z = mean(z.flat()), num0 = z.reduce((s, x, i) => s + x.length * (zm[i] - Z) ** 2, 0), den = z.reduce((s, x, i) => s + x.reduce((t, y) => t + (y - zm[i]) ** 2, 0), 0);
  const W = ((N - k) / (k - 1)) * (num0 / den), p = 1 - fCdf(W, k - 1, N - k);
  return { w: `W = ${f4(W)}, p = ${pv(p)}`, r: p < 0.05 ? "Variances differ (reject equal variances at 5%)" : "No evidence the variances differ", note: `${bf ? "Brown–Forsythe (median-centred, robust)" : "Levene (mean-centred)"} · df ${k - 1} and ${N - k} · SDs ${g.map((x) => f4(sd(x))).join(", ")}` };
};
export const kendall: Calc = (v) => {
  const x = listOf(v, "x", 3), y = listOf(v, "y", 3);
  if (x.length !== y.length) throw new InputError("x and y need the same number of values.");
  const n = x.length; let c = 0, d = 0, tx = 0, ty = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = Math.sign(x[i] - x[j]), b = Math.sign(y[i] - y[j]); if (a && b) { if (a === b) c++; else d++; } else if (!a && b) tx++; else if (a && !b) ty++; }
  const n0 = (n * (n - 1)) / 2, tau = (c - d) / Math.sqrt((c + d + tx) * (c + d + ty)), z = (3 * (c - d)) / Math.sqrt((n * (n - 1) * (2 * n + 5)) / 2), p = 2 * (1 - normCdf(Math.abs(z)));
  return { t: `Kendall's τ-b = ${f4(tau)}`, p: `z = ${f4(z)}, p ≈ ${pv(p)}`, note: `${c} concordant, ${d} discordant of ${n0} pairs · ${Math.abs(tau) < 0.1 ? "negligible" : Math.abs(tau) < 0.3 ? "weak" : Math.abs(tau) < 0.5 ? "moderate" : "strong"} ${tau >= 0 ? "positive" : "negative"} association` };
};
export const cronbach: Calc = (v) => {
  const rows = groups(txt(v, "d") || "4 5 4 5; 3 4 3 4; 5 5 4 5; 2 3 2 3; 4 4 5 4; 3 3 3 4"), k = rows[0]?.length ?? 0;
  if (rows.length < 3 || k < 2 || rows.some((r) => r.length !== k)) throw new InputError("Enter 3+ respondents (rows separated by ;) with the same 2+ item scores each.");
  const items = Array.from({ length: k }, (_, j) => rows.map((r) => r[j])), sumVar = items.reduce((s, it) => s + variance(it), 0), totVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  const a = (k / (k - 1)) * (1 - sumVar / totVar);
  return { a: `Cronbach's α = ${f4(a)}`, r: a >= 0.9 ? "Excellent internal consistency" : a >= 0.8 ? "Good" : a >= 0.7 ? "Acceptable" : a >= 0.6 ? "Questionable" : a >= 0.5 ? "Poor" : "Unacceptable", note: `${k} items, ${rows.length} respondents · α = k/(k−1) × (1 − Σ item variances ÷ total variance) · very high α (> 0.95) can mean redundant items` };
};
export const oddsRatio: Calc = (v) => {
  const [a, b, c, d] = ["a", "b", "c", "d"].map((k, i) => Math.max(0, num(v[k], [20, 80, 10, 90][i]))), cl = num(v.l, 95) / 100;
  const cc = [a, b, c, d].some((x) => x === 0) ? 0.5 : 0, A = a + cc, B = b + cc, C = c + cc, Dd = d + cc, or = (A * Dd) / (B * C), se = Math.sqrt(1 / A + 1 / B + 1 / C + 1 / Dd), z = normInv(1 - (1 - cl) / 2);
  const rr = (a / (a + b)) / (c / (c + d)), p = 2 * (1 - normCdf(Math.abs(Math.log(or) / se)));
  return { o: `Odds ratio = ${f4(or)}`, ci: `${f4(cl * 100)}% CI (${f4(Math.exp(Math.log(or) - z * se))}, ${f4(Math.exp(Math.log(or) + z * se))}) · p ≈ ${pv(p)}`, note: `Relative risk ${f4(rr)} · exposed odds ${f4(A / B)} vs unexposed ${f4(C / Dd)}${cc ? " · 0.5 added to every cell (zero count)" : ""}` };
};
export const likelihoodRatio: Calc = (v) => {
  const se = num(v.s, 90) / 100, sp = num(v.p, 80) / 100, pre = num(v.r, 20) / 100;
  if (!(se > 0 && se <= 1 && sp > 0 && sp <= 1 && pre > 0 && pre < 1)) throw new InputError("Sensitivity and specificity must be 0–100%, pre-test probability between 0 and 100%.");
  const lp = sp < 1 ? se / (1 - sp) : Infinity, ln = (1 - se) / sp, po = pre / (1 - pre), postP = (po * lp) / (1 + po * lp), postN = (po * ln) / (1 + po * ln);
  return { l: `LR+ = ${f4(lp)} · LR− = ${f4(ln)}`, p: `After a positive result: ${f4(postP * 100)}% · after a negative: ${f4(postN * 100)}% (pre-test ${f4(pre * 100)}%)`, note: `${lp > 10 ? "LR+ > 10: strong evidence to rule in" : lp > 5 ? "LR+ 5–10: moderate" : "LR+ < 5: weak to rule in"} · ${ln < 0.1 ? "LR− < 0.1: strong to rule out" : "LR− ≥ 0.1"} · post-test odds = pre-test odds × LR` };
};
export const fdr: Calc = (v) => {
  const p = listOf(v, "p", 2), q = alphaIn(v, "q", 0.05);
  if (p.some((x) => x < 0 || x > 1)) throw new InputError("p-values must be between 0 and 1.");
  const m = p.length, idx = p.map((x, i) => [x, i] as [number, number]).sort((a, b) => a[0] - b[0]), adj = new Array(m).fill(0);
  let mn = 1; for (let k = m - 1; k >= 0; k--) { mn = Math.min(mn, (idx[k][0] * m) / (k + 1)); adj[idx[k][1]] = mn; }
  const sig = adj.filter((x) => x <= q).length;
  return { s: `${sig} of ${m} tests significant at FDR q = ${f4(q)}`, a: p.map((x, i) => `${f4(x)} → ${f4(adj[i])}${adj[i] <= q ? " ✓" : ""}`).join(" · "), note: `Benjamini–Hochberg adjusted p-values · Bonferroni would keep only p ≤ ${f4(q / m)} (${p.filter((x) => x <= q / m).length} tests)` };
};
export const expSmooth: Calc = (v) => {
  const d = listOf(v, "d", 2), a = num(v.a, 0.3);
  if (!(a > 0 && a <= 1)) throw new InputError("α must be between 0 and 1.");
  const s = [d[0]]; for (let i = 1; i < d.length; i++) s.push(a * d[i - 1] + (1 - a) * s[i - 1]);
  const next = a * d[d.length - 1] + (1 - a) * s[s.length - 1], err = d.slice(1).map((x, i) => x - s[i + 1]), mae = mean(err.map(Math.abs)), rmse = Math.sqrt(mean(err.map((e) => e * e)));
  return { f: `Next-period forecast = ${f4(next)}`, s: `Smoothed: ${s.map(f4).join(", ")}`, note: `α = ${f4(a)} · MAE ${f4(mae)}, RMSE ${f4(rmse)} · higher α reacts faster, lower α smooths more (simple exponential smoothing, no trend)` };
};
export const seasonal: Calc = (v) => {
  const d = listOf(v, "d", 8), L = Math.round(num(v.l, 4));
  if (L < 2 || d.length < 2 * L) throw new InputError("Enter at least two full seasons of data.");
  const ma: (number | null)[] = d.map(() => null), half = Math.floor(L / 2);
  for (let i = half; i < d.length - half; i++) { if (L % 2) ma[i] = mean(d.slice(i - half, i + half + 1)); else { if (i - half < 0 || i + half >= d.length) continue; const a = mean(d.slice(i - half, i + half)), b = mean(d.slice(i - half + 1, i + half + 1)); ma[i] = (a + b) / 2; } }
  const ratios: number[][] = Array.from({ length: L }, () => []); d.forEach((x, i) => { const m = ma[i]; if (m) ratios[i % L].push(x / m); });
  const raw = ratios.map((r) => (r.length ? mean(r) : 1)), k = L / raw.reduce((s, x) => s + x, 0), idx = raw.map((x) => x * k);
  return { i: idx.map((x, i) => `Season ${i + 1}: ${f4(x)}`).join(" · "), d: `Deseasonalised last value ${f4(d[d.length - 1] / idx[(d.length - 1) % L])}`, note: `Ratio-to-centred-moving-average method, normalised to average 1 · index 1.2 = 20% above a typical period` };
};
export const samplePicker: Calc = (v) => {
  const list = (txt(v, "l") || "Alice, Ben, Chen, Dana, Eli, Fatima, Gus, Hana, Ivan, Jo").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean), k = Math.round(num(v.k, 3)), seed0 = Math.round(num(v.s, 0));
  if (k < 1 || k > list.length) throw new InputError(`Pick between 1 and ${list.length}.`);
  let seed = seed0 || Math.floor(Math.random() * 2147483646) + 1; const s0 = seed, rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return { s: a.slice(0, k).join(", "), n: `${k} of ${list.length} picked without replacement`, note: `Fisher–Yates shuffle · seed ${s0} (enter it to repeat the same draw) · each item had a ${f4((k / list.length) * 100)}% chance` };
};

// ---- registry (generated)
export const ideaStat1CustomCalculators: Record<string, Calc> = {
  "box-plot-values-calculator": boxPlot,
  "mean-of-grouped-data-calculator": groupedMean,
  "empirical-rule-68-95-99-7-calculator": empirical,
  "chi-square-critical-value-calculator": chiCrit,
  "f-distribution-critical-value-calculator": fCrit,
  "monty-hall-simulator-calculator": montyHall,
  "confidence-interval-difference-of-means-calculator": ciDiff,
  "two-way-anova-calculator": twoWayAnova,
  "sign-test-calculator": signTest,
  "levenes-test-calculator": levene,
  "kendall-tau-calculator": kendall,
  "cronbachs-alpha-calculator": cronbach,
  "odds-ratio-calculator": oddsRatio,
  "likelihood-ratio-calculator": likelihoodRatio,
  "false-discovery-rate-calculator": fdr,
  "exponential-smoothing-calculator": expSmooth,
  "seasonal-index-calculator": seasonal,
  "random-sample-picker-calculator": samplePicker,
};
