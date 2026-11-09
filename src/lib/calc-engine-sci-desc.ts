/**
 * Batch: "Science Calculators" → Statistics & Probability (descriptive statistics & error — 32 tools).
 *
 * Data sets are typed as numbers separated by spaces, commas or new lines. Conventions: sample
 * statistics use n − 1; quartiles use linear interpolation (Excel QUARTILE.INC / R type 7);
 * skewness and kurtosis are the adjusted Fisher-Pearson sample formulas (Excel SKEW / KURT);
 * outliers use Tukey's fences Q1 − 1.5·IQR and Q3 + 1.5·IQR; confidence intervals use the
 * t distribution for means (z when σ is known) and the Wald or Wilson interval for proportions;
 * Cohen's kappa = (pₒ − pₑ)/(1 − pₑ); ROC AUC by the trapezoid rule. Text charts (dot plot,
 * histogram, stem-and-leaf, scatter) are drawn with characters. See prisma/create-sci-desc-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, num, pos, pick, fmt, sig, listOf, mean, variance, sorted, quantile, median, sum, tInv, normInv } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const data = (v: Vals, k = "data", min = 1) => listOf(v, k, min);
const sd = (a: number[], sample = true) => Math.sqrt(variance(a, sample));
const modes = (a: number[]) => {
  const c = new Map<number, number>();
  a.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  const mx = Math.max(...c.values());
  if (mx === 1) return "no mode (every value appears once)";
  return [...c].filter(([, n]) => n === mx).map(([x]) => fmt(x)).join(", ") + ` (appears ${mx}×)`;
};

export const descriptive: SciCalculator = (v) => {
  const a = data(v, "data", 2), n = a.length, m = mean(a), s_ = sd(a), srt = sorted(a);
  return { mean: s(m, 12), median: s(median(a), 12), mode: modes(a), sd: s(s_, 10), variance: s(variance(a), 10), range: s(srt[n - 1] - srt[0], 12), summary: `n = ${n}, sum = ${fmt(sum(a), 12)}, min = ${fmt(srt[0])}, Q1 = ${fmt(quantile(a, 0.25), 8)}, Q3 = ${fmt(quantile(a, 0.75), 8)}, max = ${fmt(srt[n - 1])}, population SD = ${fmt(sd(a, false), 8)}` };
};
export const standardDeviation: SciCalculator = (v) => {
  const a = data(v, "data", 2), m = mean(a);
  return { sample: s(sd(a), 12), population: s(sd(a, false), 12), sampleVar: s(variance(a), 12), populationVar: s(variance(a, false), 12), mean: s(m, 12), steps: `mean = ${fmt(m, 10)}; Σ(x − mean)² = ${fmt(sum(a.map((x) => (x - m) ** 2)), 10)}; ÷ (n − 1 = ${a.length - 1}) for the sample, ÷ n = ${a.length} for the population` };
};
export const meanMedianMode: SciCalculator = (v) => {
  const a = data(v), srt = sorted(a);
  return { mean: s(mean(a), 12), median: s(median(a), 12), mode: modes(a), range: s(srt[srt.length - 1] - srt[0], 12), midrange: s((srt[0] + srt[srt.length - 1]) / 2, 12), sortedData: srt.map((x) => fmt(x)).join(", "), count: a.length };
};
export const percentError: SciCalculator = (v) => {
  const meas = num(v.measured, 9.6), act = num(v.actual, 9.81);
  if (!act) throw new InputError("The accepted (true) value can't be 0.");
  const abs = Math.abs(meas - act);
  return { percent: s((abs / Math.abs(act)) * 100, 10), absolute: s(abs, 12), relative: s(abs / Math.abs(act), 10), signed: s(((meas - act) / Math.abs(act)) * 100, 10) };
};
export const coefficientVariation: SciCalculator = (v) => {
  const a = data(v, "data", 2), m = mean(a);
  if (!m) throw new InputError("The mean is 0, so the coefficient of variation is undefined.");
  return { cv: s((sd(a) / Math.abs(m)) * 100, 10), rsd: s((sd(a) / Math.abs(m)) * 100, 10), cvPop: s((sd(a, false) / Math.abs(m)) * 100, 10), mean: s(m, 12), sd: s(sd(a), 12) };
};
export const CI_TYPES = ["Mean (σ unknown — t)", "Mean (σ known — z)", "Proportion (Wald)", "Proportion (Wilson)"];
export const confidenceInterval: SciCalculator = (v) => {
  const t = pick(v.type, 4), conf = pos(v.conf, 95) / 100, n = Math.max(2, Math.round(pos(v.n, 30)));
  if (!(conf > 0 && conf < 1)) throw new InputError("Confidence must be between 0 and 100%.");
  const a = 1 - conf;
  if (t <= 1) {
    const m = num(v.mean, 50), sdv = pos(v.sd, 10);
    const crit = t === 0 ? tInv(1 - a / 2, n - 1) : normInv(1 - a / 2);
    const moe = (crit * sdv) / Math.sqrt(n);
    return { interval: `${fmt(m - moe, 10)} to ${fmt(m + moe, 10)}`, margin: s(moe, 10), critical: s(crit, 8), se: s(sdv / Math.sqrt(n), 10) };
  }
  const p = pos(v.p, 0.5), z = normInv(1 - a / 2);
  if (p > 1) throw new InputError("The sample proportion must be between 0 and 1.");
  if (t === 2) {
    const moe = z * Math.sqrt((p * (1 - p)) / n);
    return { interval: `${fmt(Math.max(0, p - moe), 8)} to ${fmt(Math.min(1, p + moe), 8)}`, margin: s(moe, 8), critical: s(z, 8), se: s(Math.sqrt((p * (1 - p)) / n), 8) };
  }
  const den = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / den, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return { interval: `${fmt(c - h, 8)} to ${fmt(c + h, 8)}`, margin: s(h, 8), critical: s(z, 8), se: s(Math.sqrt((p * (1 - p)) / n), 8) };
};
export const quartiles: SciCalculator = (v) => {
  const a = data(v, "data", 2), srt = sorted(a);
  const q1 = quantile(a, 0.25), q2 = median(a), q3 = quantile(a, 0.75), iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const out = a.filter((x) => x < lo || x > hi);
  return { q1: s(q1, 12), q2: s(q2, 12), q3: s(q3, 12), iqr: s(iqr, 12), fiveNumber: `min ${fmt(srt[0])}, Q1 ${fmt(q1, 8)}, median ${fmt(q2, 8)}, Q3 ${fmt(q3, 8)}, max ${fmt(srt[srt.length - 1])}`, fences: `${fmt(lo, 8)} and ${fmt(hi, 8)}; outliers: ${out.length ? out.map((x) => fmt(x)).join(", ") : "none"}` };
};
export const standardError: SciCalculator = (v) => {
  const mode = pick(v.mode, 2);
  if (mode === 1) {
    const sdv = pos(v.sd, 10), n = Math.max(1, pos(v.n, 25));
    return { se: s(sdv / Math.sqrt(n), 12), mean: "—", n, ci95: `±${fmt((1.96 * sdv) / Math.sqrt(n), 8)} (≈ 95% margin)` };
  }
  const a = data(v, "data", 2), se = sd(a) / Math.sqrt(a.length);
  return { se: s(se, 12), mean: s(mean(a), 12), n: a.length, ci95: `${fmt(mean(a) - tInv(0.975, a.length - 1) * se, 8)} to ${fmt(mean(a) + tInv(0.975, a.length - 1) * se, 8)}` };
};
export const SE_MODE = ["From raw data", "From SD and n"];
export const meanAbsDev: SciCalculator = (v) => {
  const a = data(v), m = mean(a), md = median(a);
  return { mad: s(mean(a.map((x) => Math.abs(x - m))), 12), aboutMedian: s(mean(a.map((x) => Math.abs(x - md))), 12), medianAbsDev: s(median(a.map((x) => Math.abs(x - md))), 12), mean: s(m, 12) };
};
export const outliers: SciCalculator = (v) => {
  const a = data(v, "data", 3), q1 = quantile(a, 0.25), q3 = quantile(a, 0.75), iqr = q3 - q1, m = mean(a), sdv = sd(a);
  const tk = a.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr), ext = a.filter((x) => x < q1 - 3 * iqr || x > q3 + 3 * iqr), zs = a.filter((x) => Math.abs((x - m) / sdv) > 3);
  return { tukey: tk.length ? tk.map((x) => fmt(x)).join(", ") : "none", extreme: ext.length ? ext.map((x) => fmt(x)).join(", ") : "none", zscore: zs.length ? zs.map((x) => fmt(x)).join(", ") : "none", fences: `inner fences ${fmt(q1 - 1.5 * iqr, 8)} / ${fmt(q3 + 1.5 * iqr, 8)}; outer ${fmt(q1 - 3 * iqr, 8)} / ${fmt(q3 + 3 * iqr, 8)}` };
};
export const sumSquares: SciCalculator = (v) => {
  const a = data(v), m = mean(a);
  return { deviations: s(sum(a.map((x) => (x - m) ** 2)), 12), raw: s(sum(a.map((x) => x * x)), 12), sum: s(sum(a), 12), mean: s(m, 12) };
};
export const frequencyDist: SciCalculator = (v) => {
  const a = data(v, "data", 2), k = Math.max(0, Math.round(num(v.classes, 0)));
  const srt = sorted(a), n = a.length;
  const nc = k || Math.ceil(1 + Math.log2(n));
  const lo = srt[0], w = (srt[n - 1] - lo) / nc || 1;
  const width = Number(w.toPrecision(2)) < w ? Number((w * 1.0001).toPrecision(2)) : Number(w.toPrecision(2));
  const rows: string[] = ["Class            Freq  Rel.%   Cum.  Cum.%"];
  let cum = 0;
  for (let i = 0; i < nc; i++) {
    const a0 = lo + i * width, a1 = a0 + width;
    const f = a.filter((x) => x >= a0 && (i === nc - 1 ? x <= a1 + 1e-12 : x < a1)).length;
    cum += f;
    rows.push(`${fmt(a0, 5).padStart(7)} – ${fmt(a1, 5).padEnd(7)} ${String(f).padStart(4)}  ${fmt((100 * f) / n, 4).padStart(5)}  ${String(cum).padStart(4)}  ${fmt((100 * cum) / n, 4).padStart(5)}`);
  }
  return { table: rows.join("\n"), classes: nc, width: s(width, 8), boundaries: `first class boundary ${fmt(lo - 0.5 * (width / 10), 8)} (half a unit below)` };
};
export const UNC_MODE = ["Repeated measurements (standard uncertainty)", "Propagate: sum or difference", "Propagate: product or quotient", "Propagate: power xⁿ"];
export const uncertainty: SciCalculator = (v) => {
  const m = pick(v.mode, 4);
  if (m === 0) {
    const a = data(v, "data", 2), u = sd(a) / Math.sqrt(a.length);
    return { result: `${fmt(mean(a), 8)} ± ${fmt(u, 4)}`, absolute: s(u, 8), percent: s((100 * u) / Math.abs(mean(a)), 6), method: "u = s/√n (Type A)" };
  }
  const x = num(v.x, 10), dx = pos(v.dx, 0.2), y = num(v.y, 4), dy = pos(v.dy, 0.1), p = num(v.p, 2);
  if (m === 1) return { result: `${fmt(x + y, 8)} ± ${fmt(Math.hypot(dx, dy), 4)}`, absolute: s(Math.hypot(dx, dy), 8), percent: s((100 * Math.hypot(dx, dy)) / Math.abs(x + y), 6), method: "δ = √(δx² + δy²) (independent errors)" };
  if (m === 2) {
    const r = x * y, rel = Math.hypot(dx / x, dy / y);
    return { result: `${fmt(r, 8)} ± ${fmt(Math.abs(r) * rel, 4)} (for x·y; x/y has the same relative error)`, absolute: s(Math.abs(r) * rel, 8), percent: s(100 * rel, 6), method: "δ/|q| = √((δx/x)² + (δy/y)²)" };
  }
  const r = x ** p, rel = Math.abs(p) * (dx / Math.abs(x));
  return { result: `${fmt(r, 8)} ± ${fmt(Math.abs(r) * rel, 4)}`, absolute: s(Math.abs(r) * rel, 8), percent: s(100 * rel, 6), method: "δq/|q| = |n|·δx/|x|" };
};
export const sampleProportion: SciCalculator = (v) => {
  const x = pos(v.x, 45), n = Math.max(1, pos(v.n, 120));
  const p = x / n, se = Math.sqrt((p * (1 - p)) / n), z = 1.959964;
  return { phat: s(p, 10), percent: s(100 * p, 8), se: s(se, 8), ci: `${fmt(Math.max(0, p - z * se), 6)} to ${fmt(Math.min(1, p + z * se), 6)} (95%)`, normalOk: n * p >= 10 && n * (1 - p) >= 10 ? 0 : 1 };
};
export const NORMAL_OK = ["Yes — np ≥ 10 and n(1 − p) ≥ 10", "No — use an exact (binomial) method"];
export const rms: SciCalculator = (v) => {
  const a = data(v);
  const r = Math.sqrt(mean(a.map((x) => x * x)));
  return { rms: s(r, 12), mean: s(mean(a), 12), ratio: mean(a.map(Math.abs)) ? s(r / mean(a.map(Math.abs)), 8) : "—" };
};
const bar = (k: number, scale: number) => "█".repeat(Math.round(k * scale));
export const histogram: SciCalculator = (v) => {
  const a = data(v, "data", 2), k = Math.max(0, Math.round(num(v.bins, 0)));
  const srt = sorted(a), n = a.length, nb = k || Math.ceil(Math.sqrt(n));
  const lo = srt[0], w = (srt[n - 1] - lo) / nb || 1;
  const counts = Array.from({ length: nb }, (_, i) => a.filter((x) => x >= lo + i * w && (i === nb - 1 ? x <= lo + (i + 1) * w + 1e-12 : x < lo + (i + 1) * w)).length);
  const mx = Math.max(...counts), sc = 30 / mx;
  return { chart: counts.map((c, i) => `${fmt(lo + i * w, 4).padStart(8)} – ${fmt(lo + (i + 1) * w, 4).padEnd(8)} ${bar(c, sc)} ${c}`).join("\n"), bins: nb, width: s(w, 8), modal: `${fmt(lo + counts.indexOf(mx) * w, 6)} – ${fmt(lo + (counts.indexOf(mx) + 1) * w, 6)}` };
};
export const dotPlot: SciCalculator = (v) => {
  const a = data(v), c = new Map<number, number>();
  a.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  const keys = [...c.keys()].sort((p, q) => p - q);
  return { chart: keys.map((k) => `${fmt(k).padStart(8)} | ${"●".repeat(c.get(k)!)}`).join("\n"), distinct: keys.length, mode: modes(a) };
};
export const stemLeaf: SciCalculator = (v) => {
  const a = data(v), unit = pos(v.unit, 1) || 1;
  const m = new Map<number, number[]>();
  for (const x of sorted(a)) {
    const scaled = Math.round(x / unit);
    const stem = Math.trunc(scaled / 10), leaf = Math.abs(scaled % 10);
    if (!m.has(stem)) m.set(stem, []);
    m.get(stem)!.push(leaf);
  }
  const stems = [...m.keys()];
  const all: string[] = [];
  for (let st = Math.min(...stems); st <= Math.max(...stems); st++) all.push(`${String(st).padStart(4)} | ${(m.get(st) ?? []).join(" ")}`);
  return { plot: all.join("\n"), key: `${stems[0]} | ${(m.get(stems[0]) ?? [0])[0]} = ${fmt((stems[0] * 10 + (m.get(stems[0]) ?? [0])[0]) * unit)}`, n: a.length };
};
export const scatter: SciCalculator = (v) => {
  const x = data(v, "x", 2), y = data(v, "y", 2);
  if (x.length !== y.length) throw new InputError("Enter the same number of x and y values.");
  const W = 40, H = 14;
  const x0 = Math.min(...x), x1 = Math.max(...x), y0 = Math.min(...y), y1 = Math.max(...y);
  const grid = Array.from({ length: H }, () => Array(W).fill(" "));
  x.forEach((xi, i) => {
    const c = Math.round(((xi - x0) / (x1 - x0 || 1)) * (W - 1)), r = H - 1 - Math.round(((y[i] - y0) / (y1 - y0 || 1)) * (H - 1));
    grid[r][c] = "●";
  });
  const mx = mean(x), my = mean(y), sxy = sum(x.map((xi, i) => (xi - mx) * (y[i] - my))), sxx = sum(x.map((xi) => (xi - mx) ** 2)), syy = sum(y.map((yi) => (yi - my) ** 2));
  const r = sxy / Math.sqrt(sxx * syy);
  return { plot: grid.map((row, i) => (i === 0 ? fmt(y1, 4).padStart(7) : i === H - 1 ? fmt(y0, 4).padStart(7) : "       ") + " |" + row.join("")).join("\n") + `\n        ${fmt(x0, 4)}${" ".repeat(Math.max(1, W - fmt(x0, 4).length - fmt(x1, 4).length))}${fmt(x1, 4)}`, r: s(r, 8), trend: `y = ${fmt(sxy / sxx, 8)}x + ${fmt(my - (sxy / sxx) * mx, 8)}` };
};
export const PCT_MODE = ["Percentile of a value", "Value at a percentile"];
export const percentile: SciCalculator = (v) => {
  const a = data(v, "data", 2), m = pick(v.mode, 2), x = num(v.x, 75);
  if (m === 1) {
    if (x < 0 || x > 100) throw new InputError("The percentile must be between 0 and 100.");
    return { result: s(quantile(a, x / 100), 12), rank: "—", deciles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `D${d} = ${fmt(quantile(a, d / 10), 6)}`).join(", ") };
  }
  const below = a.filter((t) => t < x).length, eq = a.filter((t) => t === x).length;
  return { result: s((100 * (below + 0.5 * eq)) / a.length, 8), rank: `${below} values below, ${eq} equal`, deciles: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `D${d} = ${fmt(quantile(a, d / 10), 6)}`).join(", ") };
};
export const f1: SciCalculator = (v) => {
  const tp = pos(v.tp, 80), fp = pos(v.fp, 20), fn = pos(v.fn, 10), tn = pos(v.tn, 90);
  const prec = tp / (tp + fp), rec = tp / (tp + fn), spec = tn / (tn + fp), acc = (tp + tn) / (tp + fp + fn + tn);
  const f = (2 * prec * rec) / (prec + rec);
  const mcc = (tp * tn - fp * fn) / Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  return { f1: s(f, 8), precision: s(prec, 8), recall: s(rec, 8), specificity: s(spec, 8), accuracy: s(acc, 8), mcc: s(mcc, 8) };
};
export const harmonicMean: SciCalculator = (v) => {
  const a = data(v);
  if (a.some((x) => x <= 0)) throw new InputError("The harmonic mean needs positive values.");
  const H = a.length / sum(a.map((x) => 1 / x)), G = Math.exp(mean(a.map(Math.log)));
  return { harmonic: s(H, 12), geometric: s(G, 12), arithmetic: s(mean(a), 12) };
};
export const skewness: SciCalculator = (v) => {
  const a = data(v, "data", 3), n = a.length, m = mean(a), s_ = sd(a);
  const g = (n / ((n - 1) * (n - 2))) * sum(a.map((x) => ((x - m) / s_) ** 3));
  const pear = (3 * (m - median(a))) / s_;
  return { skewness: s(g, 10), pearson: s(pear, 10), shape: Math.abs(g) < 0.5 ? 0 : g > 0 ? 1 : 2 };
};
export const SKEW = ["Roughly symmetric (|skew| < 0.5)", "Right-skewed (long right tail)", "Left-skewed (long left tail)"];
export const kurtosis: SciCalculator = (v) => {
  const a = data(v, "data", 4), n = a.length, m = mean(a), s_ = sd(a);
  const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum(a.map((x) => ((x - m) / s_) ** 4)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return { excess: s(k, 10), kurtosis: s(k + 3, 10), shape: k > 0.5 ? 0 : k < -0.5 ? 1 : 2 };
};
export const KURT = ["Leptokurtic — heavier tails than normal", "Platykurtic — lighter tails than normal", "Mesokurtic — close to normal"];
export const mse: SciCalculator = (v) => {
  const act = data(v, "actual", 1), pred = data(v, "pred", 1);
  if (act.length !== pred.length) throw new InputError("Enter the same number of actual and predicted values.");
  const e = act.map((a, i) => a - pred[i]);
  const m = mean(e.map((x) => x * x));
  return { mse: s(m, 12), rmse: s(Math.sqrt(m), 12), mae: s(mean(e.map(Math.abs)), 12), bias: s(mean(e), 12) };
};
export const mape: SciCalculator = (v) => {
  const act = data(v, "actual", 1), pred = data(v, "pred", 1);
  if (act.length !== pred.length) throw new InputError("Enter the same number of actual and predicted values.");
  if (act.some((a) => a === 0)) throw new InputError("MAPE is undefined when an actual value is 0 — use sMAPE.");
  const m = (100 * mean(act.map((a, i) => Math.abs((a - pred[i]) / a))));
  const sm = 100 * mean(act.map((a, i) => (2 * Math.abs(a - pred[i])) / (Math.abs(a) + Math.abs(pred[i]))));
  return { mape: s(m, 10), smape: s(sm, 10), accuracy: s(100 - m, 10) };
};
export const kappa: SciCalculator = (v) => {
  const a = pos(v.a, 20), b = pos(v.b, 5), c = pos(v.c, 10), d = pos(v.d, 15), n = a + b + c + d;
  if (!n) throw new InputError("Enter the agreement counts.");
  const po = (a + d) / n, pe = ((a + b) * (a + c) + (c + d) * (b + d)) / (n * n);
  const k = (po - pe) / (1 - pe);
  return { kappa: s(k, 8), observed: s(po, 8), expected: s(pe, 8), strength: k < 0 ? 0 : k <= 0.2 ? 1 : k <= 0.4 ? 2 : k <= 0.6 ? 3 : k <= 0.8 ? 4 : 5 };
};
export const KAPPA_LABEL = ["Less than chance", "Slight (0–0.20)", "Fair (0.21–0.40)", "Moderate (0.41–0.60)", "Substantial (0.61–0.80)", "Almost perfect (0.81–1)"];
export const pooledSD: SciCalculator = (v) => {
  const s1 = pos(v.s1, 4), n1 = pos(v.n1, 20), s2 = pos(v.s2, 5), n2 = pos(v.n2, 25);
  const pv = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
  return { pooledSD: s(Math.sqrt(pv), 10), pooledVar: s(pv, 10), df: n1 + n2 - 2 };
};
export const percentDifference: SciCalculator = (v) => {
  const a = num(v.a, 80), b = num(v.b, 100);
  const avg = (Math.abs(a) + Math.abs(b)) / 2;
  if (!avg) throw new InputError("Both values are 0.");
  return { difference: s((100 * Math.abs(a - b)) / avg, 10), change: a ? s((100 * (b - a)) / Math.abs(a), 10) : "—", absolute: s(Math.abs(a - b), 12) };
};
export const trimmedMean: SciCalculator = (v) => {
  const a = sorted(data(v, "data", 3)), p = Math.min(49, pos(v.pct, 10)), k = Math.floor((a.length * p) / 100);
  const t = a.slice(k, a.length - k);
  return { trimmed: s(mean(t), 12), removed: k * 2, mean: s(mean(a), 12), winsorized: s(mean(a.map((x) => Math.min(Math.max(x, a[k]), a[a.length - 1 - k]))), 12) };
};
export const rocAuc: SciCalculator = (v) => {
  const fpr = data(v, "fpr", 2), tpr = data(v, "tpr", 2);
  if (fpr.length !== tpr.length) throw new InputError("Enter matching FPR and TPR lists.");
  const pts = fpr.map((f, i) => [f, tpr[i]]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (pts[0][0] > 0) pts.unshift([0, 0]);
  if (pts[pts.length - 1][0] < 1) pts.push([1, 1]);
  let auc = 0;
  for (let i = 1; i < pts.length; i++) auc += ((pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1])) / 2;
  const youden = pts.reduce((best, p) => (p[1] - p[0] > best[1] - best[0] ? p : best));
  return { auc: s(auc, 8), gini: s(2 * auc - 1, 8), best: `best threshold point: FPR ${fmt(youden[0], 4)}, TPR ${fmt(youden[1], 4)} (Youden J = ${fmt(youden[1] - youden[0], 4)})` };
};
export const bellCurveGrading: SciCalculator = (v) => {
  const a = data(v, "data", 2), m = mean(a), s_ = sd(a), tm = num(v.target, 75), ts = pos(v.tsd, 10);
  const curved = a.map((x) => tm + ((x - m) / s_) * ts);
  const g = (z: number) => (z >= 1.5 ? "A" : z >= 0.5 ? "B" : z >= -0.5 ? "C" : z >= -1.5 ? "D" : "F");
  return { curved: curved.map((x) => fmt(x, 4)).join(", "), grades: a.map((x) => g((x - m) / s_)).join(" "), stats: `original mean ${fmt(m, 6)}, SD ${fmt(s_, 6)} → new mean ${fmt(tm)}, SD ${fmt(ts)}` };
};

export const sciDescCustomCalculators: Record<string, SciCalculator> = {
  "descriptive-statistics-calculator": descriptive,
  "standard-deviation-calculator": standardDeviation,
  "mean-median-mode-calculator": meanMedianMode,
  "percent-error-calculator": percentError,
  "coefficient-of-variation-calculator": coefficientVariation,
  "confidence-interval-calculator": confidenceInterval,
  "quartile-calculator": quartiles,
  "standard-error-calculator": standardError,
  "mean-absolute-deviation-calculator": meanAbsDev,
  "outlier-calculator": outliers,
  "sum-of-squares-calculator": sumSquares,
  "frequency-distribution-calculator": frequencyDist,
  "uncertainty-calculator": uncertainty,
  "sample-proportion-calculator": sampleProportion,
  "root-mean-square-calculator": rms,
  "histogram-calculator": histogram,
  "scatter-plot-calculator": scatter,
  "percentile-calculator": percentile,
  "f1-score-calculator": f1,
  "dot-plot-calculator": dotPlot,
  "harmonic-mean-calculator": harmonicMean,
  "skewness-calculator": skewness,
  "mean-squared-error-calculator": mse,
  "cohens-kappa-calculator": kappa,
  "stem-and-leaf-plot-calculator": stemLeaf,
  "pooled-standard-deviation-calculator": pooledSD,
  "percent-difference-calculator": percentDifference,
  "trimmed-mean-calculator": trimmedMean,
  "kurtosis-calculator": kurtosis,
  "mape-calculator": mape,
  "roc-auc-calculator": rocAuc,
  "bell-curve-grading-calculator": bellCurveGrading,
};
