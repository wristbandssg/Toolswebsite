/**
 * Batch: "Science Calculators" → Math Calculators (linear algebra & matrices — 37 tools).
 *
 * Matrices are typed as text: rows separated by ";" (or new lines), entries by spaces or commas,
 * up to 10 × 10. Determinants by LU with partial pivoting; inverses by Gauss-Jordan; eigenvalues
 * with mathjs eigs (real symmetric and general real matrices) and eigenvectors from the null space
 * of A − λI; characteristic polynomial by the Faddeev-LeVerrier algorithm; RREF by Gauss-Jordan
 * elimination; SVD singular values from the eigenvalues of AᵀA; Cholesky by the standard
 * algorithm; e^A with mathjs expm; Markov steady states by power iteration.
 * See prisma/create-sci-lin-calculators.ts for the copy.
 */

import { create, all } from "mathjs";
import { type SciCalculator, type Vals, InputError, txt, num, pick, fmt, sig, matrixOf, matText, vecText, numList, rref, M } from "./sci-math-core";

const mj = create(all);
const s = (x: number, n = 10) => sig(x, n);
const mat = (v: Vals, k: string, square = false) => matrixOf(txt(v, k), square);
const vec = (v: Vals, k: string) => numList(txt(v, k));
const dims = (a: number[][]) => `${a.length} × ${a[0].length}`;
const I = (n: number): number[][] => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const add = (a: number[][], b: number[][], k = 1) => a.map((r, i) => r.map((x, j) => x + k * b[i][j]));
const scale = (a: number[][], k: number) => a.map((r) => r.map((x) => k * x));
const mul = (a: number[][], b: number[][]) => {
  if (a[0].length !== b.length) throw new InputError(`Can't multiply ${dims(a)} by ${dims(b)} — the inner sizes must match.`);
  return a.map((r) => b[0].map((_, j) => r.reduce((acc, x, k) => acc + x * b[k][j], 0)));
};
const T = (a: number[][]) => a[0].map((_, j) => a.map((r) => r[j]));
function det(a: number[][]): number {
  if (a.length !== a[0].length) throw new InputError("The determinant needs a square matrix.");
  const t = a.map((r) => r.slice()), n = t.length;
  let d = 1;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(t[k][i]) > Math.abs(t[p][i])) p = k;
    if (Math.abs(t[p][i]) < 1e-14) return 0;
    if (p !== i) {
      [t[p], t[i]] = [t[i], t[p]];
      d = -d;
    }
    d *= t[i][i];
    for (let k = i + 1; k < n; k++) {
      const f = t[k][i] / t[i][i];
      for (let j = i; j < n; j++) t[k][j] -= f * t[i][j];
    }
  }
  return Math.abs(d - Math.round(d)) < 1e-9 * Math.max(1, Math.abs(d)) ? Math.round(d) : d;
}
function inv(a: number[][]): number[][] {
  const n = a.length;
  if (n !== a[0].length) throw new InputError("Only square matrices have an inverse.");
  if (Math.abs(det(a)) < 1e-12) throw new InputError("The matrix is singular (determinant 0), so it has no inverse.");
  const r = rref(a.map((row, i) => [...row, ...I(n)[i]])).m;
  return r.map((row) => row.slice(n));
}
const cof = (a: number[][]) => a.map((r, i) => r.map((_, j) => (((i + j) % 2 ? -1 : 1) * (a.length === 1 ? 1 : det(a.filter((_, k) => k !== i).map((rr) => rr.filter((_, l) => l !== j)))))));
const powM = (a: number[][], k: number) => {
  if (a.length !== a[0].length) throw new InputError("Powers need a square matrix.");
  let base = k < 0 ? inv(a) : a, e = Math.abs(Math.round(k));
  let res = I(a.length);
  while (e > 0) {
    if (e & 1) res = mul(res, base);
    base = mul(base, base);
    e >>= 1;
  }
  return res;
};
const nullBasis = (a: number[][]) => {
  const { m, pivots } = rref(a);
  const n = a[0].length, free = [...Array(n).keys()].filter((j) => !pivots.includes(j));
  return free.map((f) => {
    const vv = new Array(n).fill(0);
    vv[f] = 1;
    pivots.forEach((p, i) => (vv[p] = -m[i][f]));
    return vv;
  });
};
const norm = (u: number[]) => Math.hypot(...u);
const dot = (u: number[], w: number[]) => {
  if (u.length !== w.length) throw new InputError("The vectors need the same number of components.");
  return u.reduce((acc, x, i) => acc + x * w[i], 0);
};
const cross = (u: number[], w: number[]) => {
  const [a, b, c] = [...u, 0, 0, 0].slice(0, 3), [d, e, f] = [...w, 0, 0, 0].slice(0, 3);
  return [b * f - c * e, c * d - a * f, a * e - b * d];
};
function eig(a: number[][]): { vals: { re: number; im: number }[]; vecs: (number[] | null)[] } {
  if (a.length !== a[0].length) throw new InputError("Eigenvalues need a square matrix.");
  let values: { re: number; im: number }[];
  try {
    const r = mj.eigs(a) as unknown as { values: unknown };
    const arr = (Array.isArray(r.values) ? r.values : (r.values as { toArray: () => unknown[] }).toArray()) as unknown[];
    values = arr.map((x) => (typeof x === "number" ? { re: x, im: 0 } : { re: (x as { re: number }).re, im: (x as { im: number }).im }));
  } catch {
    throw new InputError("Couldn't compute the eigenvalues of that matrix.");
  }
  values = values.map((x) => ({ re: Math.abs(x.re) < 1e-10 ? 0 : x.re, im: Math.abs(x.im) < 1e-10 ? 0 : x.im })).sort((p, q) => q.re - p.re || q.im - p.im);
  const vecs = values.map(({ re, im }) => {
    if (im !== 0) return null;
    const shifted = a.map((r, i) => r.map((x, j) => x - (i === j ? re : 0)));
    const t = shifted.map((r) => r.map((x) => (Math.abs(x) < 1e-9 ? 0 : x)));
    const nb = nullBasisTol(t);
    if (!nb.length) return null;
    const vv = nb[0], big = vv.reduce((p, q) => (Math.abs(q) > Math.abs(p) ? q : p), 0) || 1;
    return vv.map((x) => x / big);
  });
  return { vals: values, vecs };
}
function nullBasisTol(a: number[][]): number[][] {
  const m = a.map((r) => r.slice()), rows = m.length, cols = m[0].length;
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    for (let k = r + 1; k < rows; k++) if (Math.abs(m[k][c]) > Math.abs(m[p][c])) p = k;
    if (Math.abs(m[p][c]) < 1e-7) continue;
    [m[p], m[r]] = [m[r], m[p]];
    const lv = m[r][c];
    m[r] = m[r].map((x) => x / lv);
    for (let k = 0; k < rows; k++) if (k !== r) {
      const f = m[k][c];
      m[k] = m[k].map((x, j) => x - f * m[r][j]);
    }
    pivots.push(c);
    r++;
  }
  const free = [...Array(cols).keys()].filter((j) => !pivots.includes(j));
  return free.map((f) => {
    const vv = new Array(cols).fill(0);
    vv[f] = 1;
    pivots.forEach((p, i) => (vv[p] = -m[i][f]));
    return vv;
  });
}
const evText = (e: { re: number; im: number }) => (e.im === 0 ? fmt(e.re, 8) : `${fmt(e.re, 6)} ${e.im < 0 ? "−" : "+"} ${fmt(Math.abs(e.im), 6)}i`);
function charPoly(a: number[][]): number[] {
  const n = a.length;
  let Mk = I(n).map((r) => r.map(() => 0));
  const c = [1];
  for (let k = 1; k <= n; k++) {
    Mk = add(mul(a, Mk), scale(I(n), c[k - 1]));
    const AM = mul(a, Mk);
    c.push(-AM.reduce((acc, r, i) => acc + r[i], 0) / k);
  }
  return c; // λⁿ + c1 λⁿ⁻¹ + … + cn
}
const cpText = (c: number[]) => {
  const n = c.length - 1;
  return c.map((k, i) => {
    const p = n - i;
    if (Math.abs(k) < 1e-12) return "";
    const coef = p > 0 && Math.abs(Math.abs(k) - 1) < 1e-12 ? "" : fmt(Math.abs(k), 8);
    return `${k < 0 ? "− " : i ? "+ " : ""}${coef}${p > 0 ? (p > 1 ? `λ^${p}` : "λ") : ""}`;
  }).filter(Boolean).join(" ");
};

// ---------- General matrix calculator ----------
export const MATRIX_OPS = ["A + B", "A − B", "A × B", "det(A)", "Inverse A⁻¹", "Transpose Aᵀ", "Aᵏ", "k × A", "Trace of A", "Rank of A"];
export const matrixCalc: SciCalculator = (v) => {
  const op = pick(v.op, 10), A = mat(v, "A"), k = num(v.k, 2);
  const needB = () => mat(v, "B");
  let res: number[][] | null = null, val: number | null = null;
  switch (op) {
    case 0:
    case 1: {
      const B = needB();
      if (dims(A) !== dims(B)) throw new InputError("A and B must be the same size to add or subtract.");
      res = add(A, B, op === 0 ? 1 : -1);
      break;
    }
    case 2:
      res = mul(A, needB());
      break;
    case 3:
      val = det(A);
      break;
    case 4:
      res = inv(A);
      break;
    case 5:
      res = T(A);
      break;
    case 6:
      res = powM(A, k);
      break;
    case 7:
      res = scale(A, k);
      break;
    case 8:
      if (A.length !== A[0].length) throw new InputError("The trace needs a square matrix.");
      val = A.reduce((acc, r, i) => acc + r[i], 0);
      break;
    default:
      val = rref(A).rank;
  }
  return { result: res ? matText(res) : fmt(val as number, 12), size: res ? dims(res) : "scalar", inputSize: dims(A) };
};
export const multiply: SciCalculator = (v) => {
  const A = mat(v, "A"), B = mat(v, "B"), C = mul(A, B);
  return { result: matText(C), size: dims(C), check: `(${dims(A)}) × (${dims(B)}) → ${dims(C)}` };
};
export const addSub: SciCalculator = (v) => {
  const A = mat(v, "A"), B = mat(v, "B"), c = num(v.c, 1), d = num(v.d, 1);
  if (dims(A) !== dims(B)) throw new InputError("A and B must be the same size.");
  return { result: matText(add(scale(A, c), B, d)), size: dims(A), formula: `${fmt(c)}A ${d < 0 ? "−" : "+"} ${fmt(Math.abs(d))}B` };
};
export const rrefCalc: SciCalculator = (v) => {
  const A = mat(v, "A");
  const r = rref(A);
  return { rref: matText(r.m), rank: r.rank, pivots: r.pivots.map((p) => `column ${p + 1}`).join(", ") || "none" };
};
export const determinant: SciCalculator = (v) => {
  const A = mat(v, "A", true);
  const d = det(A);
  let steps = "";
  if (A.length === 2) steps = `ad − bc = (${fmt(A[0][0])})(${fmt(A[1][1])}) − (${fmt(A[0][1])})(${fmt(A[1][0])}) = ${fmt(d, 12)}`;
  else if (A.length === 3) steps = A[0].map((x, j) => `${j % 2 ? "−" : "+"} ${fmt(x)}·det(minor ${j + 1}) = ${fmt(x * det(A.slice(1).map((r) => r.filter((_, l) => l !== j))), 8)}`).join("\n") + `\nsum = ${fmt(d, 12)}`;
  else steps = "LU decomposition with partial pivoting: det = ± product of the pivots.";
  return { determinant: s(d, 12), steps, invertible: Math.abs(d) > 1e-12 ? 0 : 1 };
};
export const INVERTIBLE = ["Invertible (det ≠ 0)", "Singular — no inverse (det = 0)"];
export const inverse: SciCalculator = (v) => {
  const A = mat(v, "A", true), Ai = inv(A);
  const check = mul(A, Ai);
  return { inverse: matText(Ai), determinant: s(det(A), 12), check: Math.max(...check.flatMap((r, i) => r.map((x, j) => Math.abs(x - (i === j ? 1 : 0))))) < 1e-9 ? "A × A⁻¹ = I ✓" : "rounding error — matrix is ill-conditioned" };
};
export const transpose: SciCalculator = (v) => {
  const A = mat(v, "A"), At = T(A);
  const sym = A.length === A[0].length && A.every((r, i) => r.every((x, j) => Math.abs(x - A[j][i]) < 1e-12));
  return { transpose: matText(At), size: dims(At), symmetric: sym ? 0 : 1 };
};
export const SYMMETRIC = ["Symmetric (A = Aᵀ)", "Not symmetric"];
export const matrixPower: SciCalculator = (v) => {
  const A = mat(v, "A", true), k = Math.round(num(v.k, 3));
  return { result: matText(powM(A, k)), power: k };
};
export const matrixExp: SciCalculator = (v) => {
  const A = mat(v, "A", true), t = num(v.t, 1);
  const E = M.expm(scale(A, t));
  return { result: matText(E), trace: s(E.reduce((acc, r, i) => acc + r[i], 0), 10), det: s(Math.exp(t * A.reduce((acc, r, i) => acc + r[i], 0)), 10) };
};
export const adjoint: SciCalculator = (v) => {
  const A = mat(v, "A", true), C = cof(A);
  return { adjoint: matText(T(C)), cofactor: matText(C), determinant: s(det(A), 12) };
};
export const rankCalc: SciCalculator = (v) => {
  const A = mat(v, "A"), r = rref(A).rank;
  return { rank: r, nullity: A[0].length - r, full: r === Math.min(A.length, A[0].length) ? 0 : 1 };
};
export const FULL_RANK = ["Full rank", "Rank deficient"];
export const nullSpace: SciCalculator = (v) => {
  const A = mat(v, "A"), nb = nullBasis(A);
  return { basis: nb.length ? nb.map((b) => vecText(b)).join("\n") : "{0} — only the zero vector", nullity: nb.length, rank: A[0].length - nb.length };
};
export const columnSpace: SciCalculator = (v) => {
  const A = mat(v, "A"), { pivots } = rref(A);
  return { basis: pivots.map((p) => vecText(A.map((r) => r[p]))).join("\n") || "{0}", dimension: pivots.length, columns: pivots.map((p) => p + 1).join(", ") || "none" };
};
export const triangular: SciCalculator = (v) => {
  const A = mat(v, "A");
  const t = A.map((r) => r.slice()), rows = t.length, cols = t[0].length;
  const ops: string[] = [];
  let r = 0, swaps = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && Math.abs(t[p][c]) < 1e-12) p++;
    if (p === rows) continue;
    if (p !== r) {
      [t[p], t[r]] = [t[r], t[p]];
      ops.push(`R${r + 1} ↔ R${p + 1}`);
      swaps++;
    }
    for (let k = r + 1; k < rows; k++) {
      const f = t[k][c] / t[r][c];
      if (Math.abs(f) < 1e-14) continue;
      t[k] = t[k].map((x, j) => x - f * t[r][j]);
      ops.push(`R${k + 1} → R${k + 1} − ${fmt(f, 6)}·R${r + 1}`);
    }
    r++;
  }
  const square = rows === cols;
  return { upper: matText(t.map((rr) => rr.map((x) => (Math.abs(x) < 1e-12 ? 0 : x)))), operations: ops.join("\n") || "already upper triangular", determinant: square ? s((swaps % 2 ? -1 : 1) * t.reduce((acc, rr, i) => acc * rr[i], 1), 12) : "—" };
};

// ---------- Eigen & decompositions ----------
export const eigenvalues: SciCalculator = (v) => {
  const A = mat(v, "A", true);
  const { vals, vecs } = eig(A);
  return { eigenvalues: vals.map(evText).join(",  "), eigenvectors: vals.map((e, i) => `λ = ${evText(e)}: ${vecs[i] ? vecText(vecs[i]!) : e.im ? "(complex)" : "—"}`).join("\n"), characteristic: cpText(charPoly(A)), trace: s(A.reduce((acc, r, i) => acc + r[i], 0), 10) };
};
export const diagonalize: SciCalculator = (v) => {
  const A = mat(v, "A", true);
  const { vals, vecs } = eig(A);
  if (vals.some((e) => e.im !== 0)) return { result: 1, P: "—", D: "—", note: "Complex eigenvalues — not diagonalizable over the real numbers." };
  // collect independent eigenvectors per distinct eigenvalue
  const distinct: number[] = [];
  for (const e of vals) if (!distinct.some((d) => Math.abs(d - e.re) < 1e-7)) distinct.push(e.re);
  const cols: number[][] = [], diag: number[] = [];
  for (const lam of distinct) {
    const nb = nullBasisTol(A.map((r, i) => r.map((x, j) => x - (i === j ? lam : 0))));
    for (const b of nb) {
      cols.push(b);
      diag.push(lam);
    }
  }
  void vecs;
  if (cols.length < A.length) return { result: 1, P: "—", D: "—", note: "Not enough independent eigenvectors (a repeated eigenvalue is defective)." };
  const P = T(cols), D = diag.map((d, i) => diag.map((_, j) => (i === j ? d : 0)));
  return { result: 0, P: matText(P), D: matText(D), note: "A = P D P⁻¹ (columns of P are eigenvectors)." };
};
export const DIAG = ["Diagonalizable", "Not diagonalizable (over ℝ)"];
export const luDecomp: SciCalculator = (v) => {
  const A = mat(v, "A", true);
  const r = M.lup(A);
  const P = r.p.map((pi) => A.map((_, j) => (j === pi ? 1 : 0)));
  return { L: matText(r.L), U: matText(r.U), P: matText(P), det: s(det(A), 12) };
};
export const qrDecomp: SciCalculator = (v) => {
  const A = mat(v, "A");
  const r = M.qr(A);
  return { Q: matText(r.Q), R: matText(r.R), check: "A = Q R, Qᵀ Q = I" };
};
export const cholesky: SciCalculator = (v) => {
  const A = mat(v, "A", true), n = A.length;
  if (!A.every((r, i) => r.every((x, j) => Math.abs(x - A[j][i]) < 1e-10))) throw new InputError("Cholesky needs a symmetric matrix.");
  const L = I(n).map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let sum = A[i][j];
    for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
    if (i === j) {
      if (sum <= 0) throw new InputError("The matrix isn't positive definite, so it has no Cholesky factorisation.");
      L[i][j] = Math.sqrt(sum);
    } else L[i][j] = sum / L[j][j];
  }
  return { L: matText(L), LT: matText(T(L)), det: s(L.reduce((acc, r, i) => acc * r[i] * r[i], 1), 12) };
};
export const svd: SciCalculator = (v) => {
  const A = mat(v, "A");
  const AtA = mul(T(A), A);
  const { vals } = eig(AtA);
  const sv = vals.map((e) => Math.sqrt(Math.max(0, e.re))).sort((p, q) => q - p);
  const r = sv.filter((x) => x > 1e-10).length;
  return { singular: sv.map((x) => fmt(x, 10)).join(", "), rank: r, condition: r === sv.length && sv[sv.length - 1] > 1e-12 ? s(sv[0] / sv[sv.length - 1], 10) : "∞ (singular)", norm2: s(sv[0], 10) };
};
export const matrixNorm: SciCalculator = (v) => {
  const A = mat(v, "A");
  const fro = Math.sqrt(A.flat().reduce((acc, x) => acc + x * x, 0));
  const one = Math.max(...A[0].map((_, j) => A.reduce((acc, r) => acc + Math.abs(r[j]), 0)));
  const infN = Math.max(...A.map((r) => r.reduce((acc, x) => acc + Math.abs(x), 0)));
  const sv = eig(mul(T(A), A)).vals.map((e) => Math.sqrt(Math.max(0, e.re)));
  const two = Math.max(...sv), mn = Math.min(...sv);
  return { frobenius: s(fro, 12), one: s(one, 12), infinity: s(infN, 12), two: s(two, 12), condition: A.length === A[0].length && mn > 1e-12 ? s(two / mn, 10) : "—" };
};
export const linearIndependence: SciCalculator = (v) => {
  const vs = mat(v, "vecs");
  const r = rref(vs).rank;
  const indep = r === vs.length;
  let relation = "none (only the trivial combination gives 0)";
  if (!indep) {
    const nb = nullBasis(T(vs));
    if (nb.length) relation = nb[0].map((c, i) => `${fmt(c, 6)}·v${i + 1}`).join(" + ") + " = 0";
  }
  return { result: indep ? 0 : 1, rank: r, relation };
};
export const INDEPENDENT = ["Linearly independent", "Linearly dependent"];
export const matrixEquation: SciCalculator = (v) => {
  const A = mat(v, "A", true), B = mat(v, "B");
  if (B.length !== A.length) throw new InputError("B needs as many rows as A.");
  const X = mul(inv(A), B);
  return { X: matText(X), size: dims(X), method: "X = A⁻¹B" };
};
export const cramers: SciCalculator = (v) => {
  const m = mat(v, "aug");
  const n = m.length;
  if (m[0].length !== n + 1) throw new InputError("Enter an augmented matrix [A | b] with n rows and n + 1 columns.");
  const A = m.map((r) => r.slice(0, n)), b = m.map((r) => r[n]);
  const D = det(A);
  if (Math.abs(D) < 1e-12) throw new InputError("det(A) = 0 — Cramer's rule needs a unique solution.");
  const names = ["x", "y", "z", "w", "u", "v"];
  const Ds = A[0].map((_, j) => det(A.map((r, i) => r.map((x, k) => (k === j ? b[i] : x)))));
  return { solution: Ds.map((d, j) => `${names[j] ?? "x" + (j + 1)} = ${fmt(d, 10)}/${fmt(D, 10)} = ${fmt(d / D, 10)}`).join("\n"), determinant: s(D, 12), dets: Ds.map((d, j) => `D${j + 1} = ${fmt(d, 10)}`).join(", ") };
};
export const linearTransform: SciCalculator = (v) => {
  const A = mat(v, "A"), x = vec(v, "x");
  if (x.length !== A[0].length) throw new InputError("The vector needs as many components as A has columns.");
  const y = A.map((r) => r.reduce((acc, a, i) => acc + a * x[i], 0));
  const square = A.length === A[0].length;
  return { image: vecText(y), scale: square ? s(det(A), 10) : "—", kernelDim: A[0].length - rref(A).rank, rank: rref(A).rank };
};
export const fundamentalMatrix: SciCalculator = (v) => {
  const A = mat(v, "A", true), t = num(v.t, 1), x0s = txt(v, "x0");
  const Phi = M.expm(scale(A, t));
  const out: Record<string, number | string> = { phi: matText(Phi), method: "Φ(t) = e^(At), the fundamental matrix with Φ(0) = I" };
  if (x0s) {
    const x0 = numList(x0s);
    out.solution = vecText(Phi.map((r) => r.reduce((acc, a, i) => acc + a * (x0[i] ?? 0), 0)));
  } else out.solution = "enter x(0) to get x(t)";
  return out;
};
export const complexMatrix: SciCalculator = (v) => {
  const rows = txt(v, "A").split(/[;\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean));
  if (!rows.length || rows.some((r) => r.length !== rows[0].length)) throw new InputError("Enter a rectangular matrix — rows separated by semicolons.");
  if (rows.length > 6 || rows[0].length > 6) throw new InputError("Up to 6 × 6.");
  const parse = (e: string) => {
    if (!/^[0-9.+\-ie]+$/i.test(e.replace(/\s/g, ""))) throw new InputError(`"${e}" isn't a complex number like 1+2i.`);
    try {
      return mj.complex(e.replace(/(^|[+-])i/g, "$11i"));
    } catch {
      throw new InputError(`"${e}" isn't a complex number like 1+2i.`);
    }
  };
  const A = rows.map((r) => r.map(parse));
  const cx = (z: unknown) => {
    const c = mj.complex(z as never) as unknown as { re: number; im: number };
    return `${fmt(Math.abs(c.re) < 1e-12 ? 0 : c.re, 6)}${Math.abs(c.im) < 1e-12 ? "" : ` ${c.im < 0 ? "−" : "+"} ${fmt(Math.abs(c.im), 6)}i`}`;
  };
  const show = (m: unknown[][]) => m.map((r) => "[ " + r.map(cx).join(",  ") + " ]").join("\n");
  const square = A.length === A[0].length;
  const H = A[0].map((_, j) => A.map((r) => mj.conj(r[j])));
  const out: Record<string, number | string> = { conjugateTranspose: show(H) };
  if (square) {
    out.determinant = cx(mj.det(A as never));
    const tr = A.reduce((acc: unknown, r, i) => mj.add(acc as never, r[i] as never), mj.complex(0, 0));
    out.trace = cx(tr);
    const A2 = mj.multiply(A as never, A as never) as unknown as unknown[][];
    const tr2 = (A2 as unknown[][]).reduce((acc: unknown, r, i) => mj.add(acc as never, (r as unknown[])[i] as never), mj.complex(0, 0));
    out.purity = cx(tr2);
    const herm = A.every((r, i) => r.every((z, j) => mj.equal(z as never, mj.conj(A[j][i] as never) as never)));
    out.hermitian = herm ? 0 : 1;
    try {
      out.inverse = show(mj.inv(A as never) as unknown as unknown[][]);
    } catch {
      out.inverse = "singular — no inverse";
    }
  } else Object.assign(out, { determinant: "—", trace: "—", purity: "—", hermitian: 1, inverse: "—" });
  return out;
};
export const HERMITIAN = ["Hermitian (A = A*)", "Not Hermitian"];

// ---------- Markov chains ----------
export const transition: SciCalculator = (v) => {
  const P = mat(v, "P", true), x0s = txt(v, "x0"), n = Math.max(0, Math.round(num(v.n, 3)));
  if (P.some((r) => Math.abs(r.reduce((a, b) => a + b, 0) - 1) > 1e-6 || r.some((x) => x < 0))) throw new InputError("Each row of P must be non-negative and add up to 1.");
  const x0 = x0s ? numList(x0s) : P.map((_, i) => (i === 0 ? 1 : 0));
  if (x0.length !== P.length) throw new InputError("The starting distribution needs one value per state.");
  let x = [x0];
  for (let i = 0; i < n; i++) x = mul(x, P);
  let ss = [P.map(() => 1 / P.length)];
  for (let i = 0; i < 5000; i++) ss = mul(ss, P);
  return { after: vecText(x[0], 8), steady: vecText(ss[0], 8), Pn: matText(powM(P, n)) };
};

// ---------- Vectors ----------
export const dotProduct: SciCalculator = (v) => {
  const u = vec(v, "u"), w = vec(v, "w"), d = dot(u, w), nu = norm(u), nw = norm(w);
  return { dot: s(d, 12), angle: nu && nw ? s((Math.acos(Math.max(-1, Math.min(1, d / (nu * nw)))) * 180) / Math.PI, 10) : "—", projection: nw ? s(d / nw, 10) : "—", orthogonal: Math.abs(d) < 1e-12 ? 0 : 1 };
};
export const ORTHO = ["Orthogonal (dot product 0)", "Not orthogonal"];
export const crossProduct: SciCalculator = (v) => {
  const u = vec(v, "u"), w = vec(v, "w");
  if (u.length > 3 || w.length > 3) throw new InputError("The cross product is defined for 3-D vectors.");
  const c = cross(u, w), m = norm(c);
  return { cross: vecText(c), magnitude: s(m, 12), parallelogram: s(m, 12), triangle: s(m / 2, 12), unit: m ? vecText(c.map((x) => x / m), 8) : "— (parallel vectors)" };
};
export const magnitude: SciCalculator = (v) => {
  const u = vec(v, "u"), m = norm(u);
  return { magnitude: s(m, 12), unit: m ? vecText(u.map((x) => x / m), 8) : "— (zero vector)", squared: s(m * m, 12) };
};
export const VEC_MODE = ["Components (x, y, z)", "Magnitude & direction angle (2-D)"];
export const vectorAddition: SciCalculator = (v) => {
  const mode = pick(v.mode, 2);
  let u: number[], w: number[];
  if (mode === 1) {
    const r = (mg: number, a: number) => [mg * Math.cos((a * Math.PI) / 180), mg * Math.sin((a * Math.PI) / 180)];
    u = r(num(v.m1, 10), num(v.a1, 30));
    w = r(num(v.m2, 8), num(v.a2, 120));
  } else {
    u = vec(v, "u");
    w = vec(v, "w");
  }
  const n = Math.max(u.length, w.length);
  const S = Array.from({ length: n }, (_, i) => (u[i] ?? 0) + (w[i] ?? 0)), Dd = Array.from({ length: n }, (_, i) => (u[i] ?? 0) - (w[i] ?? 0));
  return { sum: vecText(S), magnitude: s(norm(S), 12), direction: n >= 2 ? s((Math.atan2(S[1], S[0]) * 180) / Math.PI, 10) : "—", difference: vecText(Dd) };
};
export const vectorCalc: SciCalculator = (v) => {
  const u = vec(v, "u"), w = vec(v, "w"), d = dot(u, w);
  return { sum: vecText(u.map((x, i) => x + w[i])), difference: vecText(u.map((x, i) => x - w[i])), dot: s(d, 12), cross: u.length <= 3 ? vecText(cross(u, w)) : "— (3-D only)", angle: s((Math.acos(Math.max(-1, Math.min(1, d / (norm(u) * norm(w))))) * 180) / Math.PI, 10), magnitudes: `|u| = ${fmt(norm(u), 10)}, |w| = ${fmt(norm(w), 10)}` };
};
export const projection: SciCalculator = (v) => {
  const u = vec(v, "u"), w = vec(v, "w");
  const k = dot(u, w) / dot(w, w);
  if (!Number.isFinite(k)) throw new InputError("Can't project onto the zero vector.");
  const p = w.map((x) => k * x);
  return { projection: vecText(p), scalar: s(dot(u, w) / norm(w), 12), orthogonal: vecText(u.map((x, i) => x - p[i])), formula: "proj_w u = (u·w / w·w) w" };
};
export const orthogonalVector: SciCalculator = (v) => {
  const u = vec(v, "u"), ws = txt(v, "w");
  if (ws) {
    const w = numList(ws), d = dot(u, w);
    return { orthogonal: Math.abs(d) < 1e-12 ? 0 : 1, vector: u.length <= 3 ? vecText(cross(u, w)) : "—", dot: s(d, 12) };
  }
  const nb = nullBasis([u]);
  return { orthogonal: 1, vector: nb.length ? vecText(nb[0]) : "—", dot: "—" };
};
export const gramSchmidt: SciCalculator = (v) => {
  const vs = mat(v, "vecs");
  const out: number[][] = [];
  for (const x of vs) {
    let w = x.slice();
    for (const q of out) {
      const k = dot(w, q);
      w = w.map((c, i) => c - k * q[i]);
    }
    const n = norm(w);
    if (n > 1e-10) out.push(w.map((c) => c / n));
  }
  return { orthonormal: out.map((q) => vecText(q, 8)).join("\n"), count: out.length, dependent: vs.length - out.length };
};
export const quaternion: SciCalculator = (v) => {
  const a = [num(v.w1, 1), num(v.x1, 2), num(v.y1, 3), num(v.z1, 4)], b = [num(v.w2, 0.5), num(v.x2, -1), num(v.y2, 0), num(v.z2, 2)];
  const op = pick(v.op, 5);
  const qm = (p: number[], q: number[]) => [p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3], p[0] * q[1] + p[1] * q[0] + p[2] * q[3] - p[3] * q[2], p[0] * q[2] - p[1] * q[3] + p[2] * q[0] + p[3] * q[1], p[0] * q[3] + p[1] * q[2] - p[2] * q[1] + p[3] * q[0]];
  const n2 = a.reduce((acc, x) => acc + x * x, 0);
  const conj = [a[0], -a[1], -a[2], -a[3]];
  const r = [qm(a, b), a.map((x, i) => x + b[i]), conj, conj.map((x) => x / n2), qm(qm(a.map((x) => x / Math.sqrt(n2)), [0, b[1], b[2], b[3]]), conj.map((x) => x / Math.sqrt(n2)))][op];
  const qt = (q: number[]) => `${fmt(q[0], 8)} ${q[1] < 0 ? "−" : "+"} ${fmt(Math.abs(q[1]), 8)}i ${q[2] < 0 ? "−" : "+"} ${fmt(Math.abs(q[2]), 8)}j ${q[3] < 0 ? "−" : "+"} ${fmt(Math.abs(q[3]), 8)}k`;
  return { result: op === 4 ? `rotated vector ${vecText(r.slice(1), 8)}` : qt(r), norm: s(Math.sqrt(n2), 12), angle: s((2 * Math.acos(Math.max(-1, Math.min(1, a[0] / Math.sqrt(n2)))) * 180) / Math.PI, 10) };
};
export const QUAT_OPS = ["q₁ × q₂", "q₁ + q₂", "Conjugate q₁*", "Inverse q₁⁻¹", "Rotate vector (x₂, y₂, z₂) by q₁"];

export const sciLinCustomCalculators: Record<string, SciCalculator> = {
  "matrix-calculator": matrixCalc,
  "matrix-multiplication-calculator": multiply,
  "rref-calculator": rrefCalc,
  "eigenvalue-calculator": eigenvalues,
  "matrix-determinant-calculator": determinant,
  "matrix-inverse-calculator": inverse,
  "dot-product-calculator": dotProduct,
  "gram-schmidt-calculator": gramSchmidt,
  "diagonalize-matrix-calculator": diagonalize,
  "lu-decomposition-calculator": luDecomp,
  "orthogonal-projection-calculator": projection,
  "vector-magnitude-calculator": magnitude,
  "cramers-rule-calculator": cramers,
  "svd-calculator": svd,
  "vector-addition-calculator": vectorAddition,
  "null-space-calculator": nullSpace,
  "matrix-rank-calculator": rankCalc,
  "matrix-power-calculator": matrixPower,
  "matrix-transpose-calculator": transpose,
  "matrix-exponential-calculator": matrixExp,
  "adjoint-matrix-calculator": adjoint,
  "vector-calculator": vectorCalc,
  "complex-matrix-calculator": complexMatrix,
  "qr-decomposition-calculator": qrDecomp,
  "linear-independence-calculator": linearIndependence,
  "matrix-equation-calculator": matrixEquation,
  "matrix-addition-subtraction-calculator": addSub,
  "linear-transformation-calculator": linearTransform,
  "column-space-calculator": columnSpace,
  "cross-product-calculator": crossProduct,
  "cholesky-decomposition-calculator": cholesky,
  "fundamental-matrix-calculator": fundamentalMatrix,
  "quaternion-calculator": quaternion,
  "transition-matrix-calculator": transition,
  "orthogonal-vector-calculator": orthogonalVector,
  "triangular-matrix-calculator": triangular,
  "matrix-norm-calculator": matrixNorm,
};
