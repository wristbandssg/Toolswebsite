/**
 * Batch: "Science Calculators" → Statistics & Probability (regression & correlation — 15 tools).
 *
 * Ordinary least squares through the normal equations (XᵀX)β = Xᵀy solved by Gaussian elimination
 * with partial pivoting; linearised fits for exponential (ln y), power (ln x, ln y) and
 * logarithmic (ln x) models; logistic regression by Newton-Raphson (IRLS) on the log-likelihood.
 * Inference uses Student's t from sci-math-core. See prisma/create-sci-reg-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pick, fmt, sig, listOf, matrixOf, mean, sum, tCdf, fCdf } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const g = (x: number) => fmt(x, 6);

const xy = (v: Vals, min = 2) => {
  const x = listOf(v, "x", min), y = listOf(v, "y", min);
  if (x.length !== y.length) throw new InputError(`x has ${x.length} values but y has ${y.length} — they must match.`);
  return { x, y, n: x.length };
};
const stats = (x: number[], y: number[]) => {
  const mx = mean(x), my = mean(y);
  const sxx = sum(x.map((a) => (a - mx) ** 2)), syy = sum(y.map((b) => (b - my) ** 2)), sxy = sum(x.map((a, i) => (a - mx) * (y[i] - my)));
  return { mx, my, sxx, syy, sxy };
};

/** Solve A·β = b (square) by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = A.length, m = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12 * Math.max(1, Math.abs(m[c][c]))) throw new InputError("The data can't determine all coefficients (too few distinct x values or collinear predictors).");
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function transposeInv(A: number[][]) {
  const n = A.length, cols = A.map((_, j) => solve(A, A.map((__, i) => (i === j ? 1 : 0))));
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => cols[j][i]));
}

/** OLS with design matrix rows X (already including a 1 column when wanted). */
export function ols(X: number[][], y: number[]) {
  const p = X[0].length, n = y.length;
  if (n <= p - 1) throw new InputError(`Need more than ${p - 1} data points for ${p} coefficients.`);
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (__, j) => sum(X.map((r) => r[i] * r[j]))));
  const Xty = Array.from({ length: p }, (_, i) => sum(X.map((r, k) => r[i] * y[k])));
  const beta = solve(XtX, Xty);
  const fit = X.map((r) => sum(r.map((x, j) => x * beta[j])));
  const my = mean(y), sse = sum(y.map((yy, i) => (yy - fit[i]) ** 2)), sst = sum(y.map((yy) => (yy - my) ** 2));
  const r2 = sst ? 1 - sse / sst : 1, dfe = n - p;
  const mse = dfe > 0 ? sse / dfe : NaN;
  const inv = transposeInv(XtX);
  const se = beta.map((_, j) => Math.sqrt(Math.max(0, mse * inv[j][j])));
  return { beta, fit, sse, sst, r2, adj: dfe > 0 ? 1 - ((1 - r2) * (n - 1)) / dfe : NaN, se, dfe, mse };
}

const pT2 = (t: number, df: number) => (df > 0 && Number.isFinite(t) ? 2 * (1 - tCdf(Math.abs(t), df)) : NaN);
const sgn = (c: number, first = false) => (first ? fmt(c, 6) : c < 0 ? ` − ${fmt(-c, 6)}` : ` + ${fmt(c, 6)}`);
const at = (v: Vals) => (txt(v, "x0") ? listOf(v, "x0", 1) : []);

// ---------- Linear regression & correlation ----------
export const linearRegression: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 3);
  const { mx, my, sxx, syy, sxy } = stats(x, y);
  if (!sxx) throw new InputError("All x values are the same — the slope is undefined.");
  const b = sxy / sxx, a = my - b * mx, r = syy ? sxy / Math.sqrt(sxx * syy) : 1;
  const sse = sum(y.map((yy, i) => (yy - a - b * x[i]) ** 2)), se = Math.sqrt(sse / (n - 2)), seb = se / Math.sqrt(sxx), sea = se * Math.sqrt(1 / n + (mx * mx) / sxx);
  const x0 = at(v);
  return { equation: `ŷ = ${sgn(b, true)}x${sgn(a)}`, slope: s(b), intercept: s(a), r: s(r, 8), r2: s(r * r, 8), seEstimate: s(se, 8), slopeTest: `SE(b) = ${g(seb)}, t = ${g(b / seb)}, p = ${g(pT2(b / seb, n - 2))}`, interceptSE: s(sea, 8), predictions: x0.length ? x0.map((q) => `x = ${fmt(q)} → ŷ = ${fmt(a + b * q, 8)}`).join("\n") : "enter x values to predict" };
};
export const correlation: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 3);
  const { sxx, syy, sxy } = stats(x, y);
  if (!sxx || !syy) throw new InputError("One variable has no variation — correlation is undefined.");
  const r = sxy / Math.sqrt(sxx * syy), t = r * Math.sqrt((n - 2) / (1 - r * r)), ar = Math.abs(r);
  const z = Math.atanh(Math.max(-0.999999999, Math.min(0.999999999, r))), sez = 1 / Math.sqrt(n - 3);
  return { r: s(r, 10), r2: s(r * r, 10), strength: ar < 0.1 ? 0 : ar < 0.3 ? 1 : ar < 0.5 ? 2 : ar < 0.7 ? 3 : ar < 0.9 ? 4 : 5, direction: r > 0 ? "positive" : r < 0 ? "negative" : "none", t: Number.isFinite(t) ? s(t, 8) : "∞", p: ar === 1 ? 0 : s(pT2(t, n - 2), 8), ci: n > 3 ? `${g(Math.tanh(z - 1.959964 * sez))} to ${g(Math.tanh(z + 1.959964 * sez))}` : "needs n > 3" };
};
export const STRENGTH = ["Negligible", "Weak", "Moderate", "Moderately strong", "Strong", "Very strong"];
export const covariance: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 2);
  const { mx, my, sxx, syy, sxy } = stats(x, y);
  return { sample: s(sxy / (n - 1)), population: s(sxy / n), r: sxx && syy ? s(sxy / Math.sqrt(sxx * syy), 8) : "undefined", means: `x̄ = ${fmt(mx, 8)}, ȳ = ${fmt(my, 8)}`, sxy: s(sxy) };
};
export const sxxSxy: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 2);
  const { mx, my, sxx, syy, sxy } = stats(x, y);
  return { sxx: s(sxx), syy: s(syy), sxy: s(sxy), sums: `n = ${n}, Σx = ${fmt(sum(x))}, Σy = ${fmt(sum(y))}, Σx² = ${fmt(sum(x.map((a) => a * a)))}, Σy² = ${fmt(sum(y.map((b) => b * b)))}, Σxy = ${fmt(sum(x.map((a, i) => a * y[i])))}`, means: `x̄ = ${fmt(mx, 8)}, ȳ = ${fmt(my, 8)}`, slope: sxx ? s(sxy / sxx) : "undefined" };
};
const rank = (a: number[]) => {
  const idx = a.map((x, i) => [x, i] as [number, number]).sort((p, q) => p[0] - q[0]), r = new Array(a.length).fill(0);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j + 2) / 2;
    i = j + 1;
  }
  return r;
};
export const spearman: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 3);
  const rx = rank(x), ry = rank(y), { sxx, syy, sxy } = stats(rx, ry);
  if (!sxx || !syy) throw new InputError("One variable has all-equal values.");
  const rho = sxy / Math.sqrt(sxx * syy), t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  return { rho: s(rho, 10), p: Math.abs(rho) === 1 ? 0 : s(pT2(t, n - 2), 8), d2: s(sum(rx.map((r, i) => (r - ry[i]) ** 2)), 8), ranks: `x ranks: ${rx.map((r) => fmt(r)).join(" ")}\ny ranks: ${ry.map((r) => fmt(r)).join(" ")}` };
};

// ---------- Non-linear (linearised) and polynomial fits ----------
const r2Of = (y: number[], f: number[]) => {
  const my = mean(y), sst = sum(y.map((b) => (b - my) ** 2));
  return sst ? 1 - sum(y.map((b, i) => (b - f[i]) ** 2)) / sst : 1;
};
const lin = (x: number[], y: number[]) => {
  const { mx, my, sxx, syy, sxy } = stats(x, y);
  if (!sxx) throw new InputError("Need at least two distinct x values.");
  const b = sxy / sxx;
  return { a: my - b * mx, b, r: syy ? sxy / Math.sqrt(sxx * syy) : 1 };
};
const preds = (v: Vals, f: (q: number) => number) => {
  const x0 = at(v);
  return x0.length ? x0.map((q) => `x = ${fmt(q)} → ŷ = ${fmt(f(q), 8)}`).join("\n") : "enter x values to predict";
};
export const exponentialRegression: SciCalculator = (v) => {
  const { x, y } = xy(v, 2);
  if (y.some((b) => b <= 0)) throw new InputError("Exponential regression needs every y > 0.");
  const { a, b, r } = lin(x, y.map(Math.log)), A = Math.exp(a), f = (q: number) => A * Math.exp(b * q);
  return { equation: `y = ${g(A)}·e^(${g(b)}x)`, baseForm: `y = ${g(A)}·${g(Math.exp(b))}^x`, a: s(A), b: s(b), growth: s(100 * (Math.exp(b) - 1), 8), r2: s(r2Of(y, x.map(f)), 8), r2log: s(r * r, 8), doubling: b ? s(Math.LN2 / Math.abs(b), 8) : "—", predictions: preds(v, f) };
};
export const powerRegression: SciCalculator = (v) => {
  const { x, y } = xy(v, 2);
  if (x.some((a) => a <= 0) || y.some((b) => b <= 0)) throw new InputError("Power regression needs every x > 0 and y > 0.");
  const { a, b, r } = lin(x.map(Math.log), y.map(Math.log)), A = Math.exp(a), f = (q: number) => A * q ** b;
  return { equation: `y = ${g(A)}·x^${g(b)}`, a: s(A), b: s(b), r2: s(r2Of(y, x.map(f)), 8), r2log: s(r * r, 8), predictions: preds(v, f) };
};
export const logarithmicRegression: SciCalculator = (v) => {
  const { x, y } = xy(v, 2);
  if (x.some((a) => a <= 0)) throw new InputError("Logarithmic regression needs every x > 0.");
  const { a, b, r } = lin(x.map(Math.log), y), f = (q: number) => a + b * Math.log(q);
  return { equation: `y = ${g(a)}${sgn(b)}·ln(x)`, a: s(a), b: s(b), r2: s(r * r, 8), predictions: preds(v, f) };
};
const polyFit = (x: number[], y: number[], d: number) => {
  const distinct = new Set(x).size;
  if (distinct <= d) throw new InputError(`A degree-${d} fit needs at least ${d + 1} distinct x values.`);
  return ols(x.map((q) => Array.from({ length: d + 1 }, (_, k) => q ** k)), y);
};
const polyEq = (beta: number[]) => {
  const big = Math.max(...beta.map(Math.abs), 1e-300);
  const terms = beta.map((c, k) => [c, k] as [number, number]).reverse().filter(([c]) => Math.abs(c) > 1e-10 * big);
  if (!terms.length) return "y = 0";
  return "y = " + terms.map(([c, k], i) => {
    const m = Math.abs(c), coef = k && Math.abs(m - 1) < 1e-12 ? "" : fmt(m, 6);
    return `${i ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : ""}${coef}${k ? (k === 1 ? "x" : `x^${k}`) : ""}`;
  }).join("");
};
export const quadraticRegression: SciCalculator = (v) => {
  const { x, y } = xy(v, 3);
  const r = polyFit(x, y, 2), [c, b, a] = r.beta;
  return { equation: polyEq(r.beta), a: s(a), b: s(b), c: s(c), r2: s(r.r2, 8), vertex: a ? `(${g(-b / (2 * a))}, ${g(c - (b * b) / (4 * a))})` : "—", predictions: preds(v, (q) => a * q * q + b * q + c) };
};
export const polynomialRegression: SciCalculator = (v) => {
  const { x, y } = xy(v, 2), d = pick(v.degree, 6) + 1;
  // scale x for conditioning, then convert back
  const r = polyFit(x, y, d);
  return { equation: polyEq(r.beta), coefficients: r.beta.map((c, k) => `a${k} (x^${k}) = ${fmt(c, 10)}`).join("\n"), r2: s(r.r2, 8), adj: Number.isFinite(r.adj) ? s(r.adj, 8) : "—", rmse: s(Math.sqrt(r.sse / x.length), 8), predictions: preds(v, (q) => sum(r.beta.map((c, k) => c * q ** k))) };
};
export const DEGREES = ["1 (linear)", "2 (quadratic)", "3 (cubic)", "4 (quartic)", "5 (quintic)", "6"];

// ---------- R², residuals, multiple & logistic regression ----------
export const coefDetermination: SciCalculator = (v) => {
  const y = listOf(v, "y", 2), f = listOf(v, "yhat", 2), k = Math.max(0, Math.round(num(v.k, 1))), n = y.length;
  if (f.length !== n) throw new InputError("Enter one predicted value per observed value.");
  const my = mean(y), sst = sum(y.map((b) => (b - my) ** 2)), sse = sum(y.map((b, i) => (b - f[i]) ** 2));
  const r2 = sst ? 1 - sse / sst : 1;
  return { r2: s(r2, 10), adj: n - k - 1 > 0 ? s(1 - ((1 - r2) * (n - 1)) / (n - k - 1), 10) : "—", sse: s(sse), sst: s(sst), ssr: s(sst - sse), rmse: s(Math.sqrt(sse / n), 8) };
};
export const residuals: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 3);
  const { a, b } = lin(x, y), f = x.map((q) => a + b * q), e = y.map((q, i) => q - f[i]);
  const sse = sum(e.map((q) => q * q)), se = Math.sqrt(sse / (n - 2));
  const { mx, sxx } = stats(x, y);
  const std = e.map((q, i) => q / (se * Math.sqrt(1 - 1 / n - (x[i] - mx) ** 2 / sxx)));
  return { table: "x | y | ŷ | residual | standardised\n" + x.map((q, i) => `${fmt(q)} | ${fmt(y[i])} | ${fmt(f[i], 6)} | ${fmt(e[i], 6)} | ${fmt(std[i], 4)}`).join("\n"), sse: s(sse), rmse: s(Math.sqrt(sse / n), 8), se: s(se, 8), line: `ŷ = ${sgn(b, true)}x${sgn(a)}`, flagged: std.filter((q) => Math.abs(q) > 2).length ? `${std.filter((q) => Math.abs(q) > 2).length} point(s) with |standardised residual| > 2` : "none beyond ±2" };
};
export const multipleRegression: SciCalculator = (v) => {
  const y = listOf(v, "y", 3);
  const xs = ["x1", "x2", "x3", "x4"].filter((k) => txt(v, k)).map((k) => listOf(v, k, 3));
  if (!xs.length) throw new InputError("Enter at least one predictor x₁.");
  if (xs.some((c) => c.length !== y.length)) throw new InputError("Every predictor needs the same number of values as y.");
  const n = y.length, p = xs.length + 1;
  if (n <= p) throw new InputError(`With ${xs.length} predictors you need more than ${p} observations.`);
  const r = ols(y.map((_, i) => [1, ...xs.map((c) => c[i])]), y);
  const F = ((r.sst - r.sse) / (p - 1)) / r.mse, pF = 1 - fCdf(F, p - 1, r.dfe);
  const eq = "ŷ = " + fmt(r.beta[0], 6) + r.beta.slice(1).map((c, j) => `${c < 0 ? " − " : " + "}${fmt(Math.abs(c), 6)}x${"₁₂₃₄"[j]}`).join("");
  return { equation: eq, coefficients: r.beta.map((c, j) => `${j ? `b${j} (x${j})` : "b0 (intercept)"} = ${fmt(c, 8)}, SE ${fmt(r.se[j], 6)}, t ${fmt(c / r.se[j], 5)}, p ${fmt(pT2(c / r.se[j], r.dfe), 5)}`).join("\n"), r2: s(r.r2, 8), adj: s(r.adj, 8), F: `F(${p - 1}, ${r.dfe}) = ${fmt(F, 6)}, p = ${fmt(pF, 5)}`, se: s(Math.sqrt(r.mse), 8) };
};
export const logisticRegression: SciCalculator = (v) => {
  const { x, y, n } = xy(v, 3);
  if (y.some((b) => b !== 0 && b !== 1)) throw new InputError("y must be 0 or 1 for every observation.");
  if (y.every((b) => b === y[0])) throw new InputError("y needs both 0s and 1s.");
  let b0 = 0, b1 = 0, cov = [[0, 0], [0, 0]], converged = false;
  for (let it = 0; it < 100; it++) {
    const p = x.map((q) => 1 / (1 + Math.exp(-(b0 + b1 * q))));
    const g0 = sum(y.map((yy, i) => yy - p[i])), g1 = sum(y.map((yy, i) => (yy - p[i]) * x[i]));
    const w = p.map((q) => q * (1 - q)), h00 = sum(w), h01 = sum(w.map((q, i) => q * x[i])), h11 = sum(w.map((q, i) => q * x[i] * x[i]));
    const det = h00 * h11 - h01 * h01;
    if (Math.abs(det) < 1e-300) break;
    cov = [[h11 / det, -h01 / det], [-h01 / det, h00 / det]];
    const d0 = cov[0][0] * g0 + cov[0][1] * g1, d1 = cov[1][0] * g0 + cov[1][1] * g1;
    b0 += d0;
    b1 += d1;
    if (Math.abs(d0) + Math.abs(d1) < 1e-10) {
      converged = true;
      break;
    }
    if (Math.abs(b1) > 1e6) break;
  }
  if (!converged || !Number.isFinite(b1)) throw new InputError("The fit didn't converge — the classes may be perfectly separated by x.");
  const ll = sum(x.map((q, i) => { const p = 1 / (1 + Math.exp(-(b0 + b1 * q))); return y[i] ? Math.log(p) : Math.log(1 - p); }));
  const p0 = mean(y), ll0 = n * (p0 * Math.log(p0) + (1 - p0) * Math.log(1 - p0));
  const se1 = Math.sqrt(cov[1][1]), z = b1 / se1;
  return { equation: `p = 1/(1 + e^−(${sgn(b0, true)}${sgn(b1)}x))`, b0: s(b0, 8), b1: s(b1, 8), oddsRatio: s(Math.exp(b1), 8), wald: `SE(b1) = ${g(se1)}, z = ${g(z)}`, mcfadden: s(1 - ll / ll0, 6), logLik: s(ll, 8), predictions: at(v).length ? at(v).map((q) => `x = ${fmt(q)} → p = ${fmt(1 / (1 + Math.exp(-(b0 + b1 * q))), 8)}`).join("\n") : "enter x values to predict", half: b1 ? s(-b0 / b1, 8) : "—" };
};
export const covarianceMatrix: SciCalculator = (v) => {
  const m = matrixOf(txt(v, "data")), n = m.length, k = m[0].length, pop = pick(v.type, 2) === 1;
  if (n < 2) throw new InputError("Need at least 2 observations (rows).");
  const means = Array.from({ length: k }, (_, j) => mean(m.map((r) => r[j])));
  const C = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (__, j) => sum(m.map((r) => (r[i] - means[i]) * (r[j] - means[j]))) / (pop ? n : n - 1)));
  const R = C.map((r, i) => r.map((c, j) => c / Math.sqrt(C[i][i] * C[j][j])));
  const show = (A: number[][]) => A.map((r) => r.map((c) => fmt(c, 6)).join("   ")).join("\n");
  return { cov: show(C), corr: show(R), means: means.map((q, j) => `x${j + 1}: ${fmt(q, 8)}`).join(", "), size: `${k} × ${k} from ${n} observations`, total: s(sum(C.map((r, i) => r[i])), 8) };
};
export const COV_TYPE = ["Sample (n − 1)", "Population (n)"];

export const sciRegCustomCalculators: Record<string, SciCalculator> = {
  "linear-regression-calculator": linearRegression,
  "correlation-coefficient-calculator": correlation,
  "covariance-calculator": covariance,
  "sxx-sxy-calculator": sxxSxy,
  "exponential-regression-calculator": exponentialRegression,
  "quadratic-regression-calculator": quadraticRegression,
  "coefficient-of-determination-calculator": coefDetermination,
  "multiple-linear-regression-calculator": multipleRegression,
  "polynomial-regression-calculator": polynomialRegression,
  "logarithmic-regression-calculator": logarithmicRegression,
  "residual-calculator": residuals,
  "logistic-regression-calculator": logisticRegression,
  "spearman-correlation-calculator": spearman,
  "power-regression-calculator": powerRegression,
  "covariance-matrix-calculator": covarianceMatrix,
};
