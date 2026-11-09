/**
 * Shared, sandboxed maths helpers for the Science Calculators engines (calc-engine-sci-*.ts).
 *
 * Users type expressions ("sin(30) + 2^3", "x^2 - 4x + 3") and number lists into "text" inputs.
 * Everything typed is parsed with mathjs and checked against a whitelist BEFORE it is evaluated:
 * only numbers, the variables a tool allows, arithmetic operators and a fixed list of functions
 * are accepted — no assignments, matrices, units, strings or function definitions — so a user
 * expression can't run code or build huge objects on the server.
 *
 * This is a utility module, not a batch file: every sci batch keeps its own formulas and only
 * borrows parsing / numeric-method helpers from here.
 */

import { create, all, type MathNode } from "mathjs";
import { readText, CalculationError } from "./calc-engine-types";

export type Vals = Record<string, number>;
export type Out = Record<string, number | string>;
export type SciCalculator = (values: Vals) => number | Out;

const math = create(all, { number: "number", precision: 64 });

/** Bad user input — shown to the user as the error message (422), like CalculationError. */
export class InputError extends CalculationError {}

// ---------------------------------------------------------------- numbers & text
export const num = (x: number | undefined, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
export const pos = (x: number | undefined, d = 0) => Math.max(0, num(x, d));
export const pick = (x: number | undefined, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(x))));
export const rnd = (x: number, dp = 6) => {
  if (!Number.isFinite(x)) return 0;
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
/** Rounds to `sig` significant figures (keeps tiny and huge numbers readable). */
export const sig = (x: number, s = 8) => (Number.isFinite(x) && x !== 0 ? Number(x.toPrecision(s)) : Number.isFinite(x) ? 0 : 0);
/** Number → short text (used inside text results). */
export const fmt = (x: number, s = 8): string => {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "undefined";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e12 || a < 1e-6) return x.toExponential(Math.max(0, s - 1)).replace(/\.?0+e/, "e");
  return String(Number(x.toPrecision(s)));
};
export const txt = (v: Vals, key: string) => readText(v, key).trim();
/** Encodes a string the way the widget sends a "text" input (used for examples and tests). */
export const T = (key: string, s: string): Vals => {
  const o: Vals = { [key]: s.length };
  for (let i = 0; i < s.length; i++) o[`${key}__${i}`] = s.charCodeAt(i);
  return o;
};

/** "1, 2; 3 4" → [1, 2, 3, 4]. Throws on anything that isn't a number. */
export function numList(s: string, min = 1): number[] {
  const parts = s.split(/[\s,;]+/).filter(Boolean);
  const out = parts.map((p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) throw new InputError(`"${p}" is not a number — separate values with commas or spaces.`);
    return n;
  });
  if (out.length < min) throw new InputError(`Enter at least ${min} number${min > 1 ? "s" : ""}.`);
  return out;
}
/** Reads a number list from a text input. */
export const listOf = (v: Vals, key: string, min = 1) => numList(txt(v, key), min);

/** "1 2 3; 4 5 6" (rows split by ";" or new lines, entries by spaces/commas) → number[][] (rectangular). */
export function matrixOf(s: string, square = false): number[][] {
  const rows = s.split(/[;\n|]+/).map((r) => r.trim()).filter(Boolean).map((r) => numList(r));
  if (!rows.length) throw new InputError("Enter a matrix — rows separated by semicolons, e.g. 1 2; 3 4.");
  const c = rows[0].length;
  if (rows.some((r) => r.length !== c)) throw new InputError("Every row needs the same number of entries.");
  if (square && rows.length !== c) throw new InputError("This needs a square matrix (same number of rows and columns).");
  if (rows.length > 10 || c > 10) throw new InputError("Matrices up to 10 × 10 are supported.");
  return rows;
}
export const matText = (m: number[][], s = 6) => {
  const cells = m.map((r) => r.map((x) => fmt(Math.abs(x) < 1e-12 ? 0 : x, s)));
  const w = Math.max(...cells.flat().map((c) => c.length));
  return cells.map((r) => "[ " + r.map((c) => c.padStart(w)).join("  ") + " ]").join("\n");
};
export const vecText = (v: number[], s = 6) => "(" + v.map((x) => fmt(Math.abs(x) < 1e-12 ? 0 : x, s)).join(", ") + ")";

// ---------------------------------------------------------------- safe expressions
const FUNCS = new Set([
  "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "sqrt", "cbrt", "nthRoot", "exp", "log", "ln", "log10", "log2", "abs", "floor", "ceil", "round", "sign", "factorial", "gamma",
  "pow", "mod", "min", "max", "hypot", "sech", "csch", "coth",
]);
const CONSTS = new Set(["pi", "e", "PI", "E", "tau", "phi"]);

/** Normalises everyday notation (×, ÷, π, √, ², unicode minus, "ln") before parsing. */
export function normalise(expr: string): string {
  return expr
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/π/g, "pi")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*([0-9.]+|[a-z])/gi, "sqrt($1)")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\*\*/g, "^");
}

/** Parses and whitelists an expression. `vars` = variable names the tool allows (e.g. ["x"]). */
export function parseSafe(expr: string, vars: string[] = []): MathNode {
  let src = normalise(expr).trim();
  if (!src) throw new InputError("Enter an expression.");
  // "3x(x + 2)" means 3·x·(x + 2), not a call of a function named x.
  for (const v of vars) src = src.replace(new RegExp(`(?<![A-Za-z_])${v}\\s*\\(`, "g"), `${v}*(`);
  if (src.length > 300) throw new InputError("That expression is too long (300 characters max).");
  let node: MathNode;
  try {
    node = math.parse(src);
  } catch {
    throw new InputError(`Couldn't read "${expr}" — check the brackets and operators.`);
  }
  const allowed = new Set(vars);
  node.traverse((n: MathNode, path: string, parent: MathNode | null) => {
    switch (n.type) {
      case "ConstantNode":
      case "OperatorNode":
      case "ParenthesisNode":
        return;
      case "FunctionNode": {
        const name = (n as unknown as { fn: { name?: string } }).fn?.name ?? "";
        if (!FUNCS.has(name)) throw new InputError(`"${name}" isn't a supported function.`);
        return;
      }
      case "SymbolNode": {
        const name = (n as unknown as { name: string }).name;
        if (parent && parent.type === "FunctionNode" && path === "fn") return;
        if (CONSTS.has(name) || allowed.has(name)) return;
        throw new InputError(vars.length ? `Unknown name "${name}" — use ${vars.join(", ")} as the variable${vars.length > 1 ? "s" : ""}.` : `Unknown name "${name}".`);
      }
      default:
        throw new InputError("Only numbers, variables, operators and maths functions are allowed.");
    }
  });
  return node;
}

const d2r = (x: number) => (x * Math.PI) / 180;
const r2d = (x: number) => (x * 180) / Math.PI;
/** Scope of helper functions: ln, log10-style log (log(x) = base 10, log(x, b) = base b), degree trig. */
function scope(deg: boolean): Record<string, unknown> {
  const t = (f: (x: number) => number) => (deg ? (x: number) => f(d2r(x)) : f);
  const it = (f: (x: number) => number) => (deg ? (x: number) => r2d(f(x)) : f);
  const sc: Record<string, unknown> = {
    ln: Math.log,
    log: (x: number, b?: number) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)),
    phi: (1 + Math.sqrt(5)) / 2,
    tau: 2 * Math.PI,
  };
  if (deg) {
    Object.assign(sc, {
      sin: t(Math.sin), cos: t(Math.cos), tan: t(Math.tan),
      sec: t((x) => 1 / Math.cos(x)), csc: t((x) => 1 / Math.sin(x)), cot: t((x) => 1 / Math.tan(x)),
      asin: it(Math.asin), acos: it(Math.acos), atan: it(Math.atan),
      atan2: (y: number, x: number) => r2d(Math.atan2(y, x)),
    });
  }
  return sc;
}
/** Compiles an expression in the variables `vars`; returns f(...values). */
export function compileFn(expr: string, vars: string[] = ["x"], deg = false): (...args: number[]) => number {
  const node = parseSafe(expr, vars);
  const code = node.compile();
  const base = scope(deg);
  return (...args: number[]) => {
    const s: Record<string, unknown> = { ...base };
    vars.forEach((k, i) => (s[k] = args[i]));
    let r: unknown;
    try {
      r = code.evaluate(s);
    } catch (e) {
      throw new InputError(e instanceof Error ? e.message : "Couldn't evaluate that expression.");
    }
    if (typeof r === "number") return r;
    if (typeof r === "boolean") return r ? 1 : 0;
    const n = Number(r);
    if (Number.isFinite(n)) return n;
    throw new InputError("That expression doesn't give a real number.");
  };
}
/** Evaluates a constant expression. */
export const evalExpr = (expr: string, deg = false) => compileFn(expr, [], deg)();

/** Symbolic derivative (as text) with mathjs, for display. */
export function derivText(expr: string, v = "x", order = 1): string {
  let node = parseSafe(expr, [v]);
  for (let i = 0; i < order; i++) node = math.derivative(node, v);
  return math.simplify(node).toString({ implicit: "hide", parenthesis: "auto" });
}
export function simplifyText(expr: string, vars: string[] = ["x"]): string {
  return math.simplify(parseSafe(expr, vars)).toString({ parenthesis: "auto" });
}
/** Polynomial in x → coefficients [a0, a1, …] (throws if it isn't a polynomial). */
export function polyCoeffs(expr: string, v = "x"): number[] {
  const node = parseSafe(expr, [v]);
  let res: { coefficients: number[]; variables: string[] };
  try {
    res = math.rationalize(node, {}, true) as unknown as { coefficients: number[]; variables: string[] };
  } catch {
    throw new InputError("That isn't a polynomial — use only +, −, ×, whole-number powers of " + v + " and numbers.");
  }
  if (res.variables.length > 1) throw new InputError(`Use only the variable ${v}.`);
  const c = (res.coefficients ?? []).map(Number);
  return c.length ? c : [Number(node.evaluate({ [v]: 0 }))];
}
/** Coefficients [a0, a1, …] → readable polynomial text. */
export function polyText(c: number[], v = "x"): string {
  const terms: string[] = [];
  for (let i = c.length - 1; i >= 0; i--) {
    const a = c[i];
    if (Math.abs(a) < 1e-12) continue;
    const mag = Math.abs(a);
    const coef = i > 0 && Math.abs(mag - 1) < 1e-12 ? "" : fmt(mag);
    const pow = i === 0 ? "" : i === 1 ? v : `${v}^${i}`;
    terms.push(`${a < 0 ? "-" : "+"} ${coef}${pow}`);
  }
  if (!terms.length) return "0";
  const s = terms.join(" ");
  return s.startsWith("+ ") ? s.slice(2) : "-" + s.slice(2);
}

// ---------------------------------------------------------------- numeric methods
/** Adaptive Simpson integration. */
export function integrate(f: (x: number) => number, a: number, b: number, eps = 1e-9): number {
  if (a === b) return 0;
  const simpson = (l: number, r: number, fl: number, fm: number, fr: number) => ((r - l) / 6) * (fl + 4 * fm + fr);
  let calls = 0;
  const rec = (l: number, r: number, fl: number, fm: number, fr: number, whole: number, e: number, depth: number): number => {
    const m = (l + r) / 2, lm = (l + m) / 2, rm = (m + r) / 2;
    const flm = f(lm), frm = f(rm);
    calls += 2;
    const left = simpson(l, m, fl, flm, fm), right = simpson(m, r, fm, frm, fr);
    if (depth <= 0 || calls > 200000 || Math.abs(left + right - whole) <= 15 * e) return left + right + (left + right - whole) / 15;
    return rec(l, m, fl, flm, fm, left, e / 2, depth - 1) + rec(m, r, fm, frm, fr, right, e / 2, depth - 1);
  };
  const fa = f(a), fb = f(b), fm = f((a + b) / 2);
  const v = rec(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), eps, 40);
  if (!Number.isFinite(v)) throw new InputError("The integral doesn't converge on that interval.");
  return v;
}
/** Central-difference derivative of order 1–3. */
export function numDeriv(f: (x: number) => number, x: number, order = 1): number {
  const h = order === 1 ? 1e-5 * Math.max(1, Math.abs(x)) : 1e-3 * Math.max(1, Math.abs(x));
  if (order === 1) return (f(x + h) - f(x - h)) / (2 * h);
  if (order === 2) return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
  return (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) / (2 * h ** 3);
}
/** Real roots of f in [a, b] by sign-change scanning + bisection (plus touching roots). */
export function roots(f: (x: number) => number, a = -100, b = 100, n = 4000): number[] {
  const out: number[] = [];
  const g = (x: number) => {
    try {
      const y = f(x);
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
  const step = (b - a) / n;
  let x0 = a, y0 = g(x0);
  const push = (r: number) => {
    if (!out.some((o) => Math.abs(o - r) < 1e-6 * Math.max(1, Math.abs(r)))) out.push(r);
  };
  for (let i = 1; i <= n; i++) {
    const x1 = a + i * step, y1 = g(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) push(x0);
      else if (y0 * y1 < 0) {
        let l = x0, r = x1, fl = y0;
        for (let k = 0; k < 100; k++) {
          const m = (l + r) / 2, fm = g(m);
          if (!Number.isFinite(fm)) break;
          if (fl * fm <= 0) r = m;
          else {
            l = m;
            fl = fm;
          }
        }
        const rr = (l + r) / 2;
        if (Math.abs(g(rr)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) push(rr);
      }
    }
    x0 = x1;
    y0 = y1;
    if (out.length > 20) break;
  }
  if (Number.isFinite(y0) && y0 === 0) push(x0);
  return out.sort((p, q) => p - q).map((r) => (Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r));
}
/** Golden-section minimum of f on [a, b]. */
export function minimize(f: (x: number) => number, a: number, b: number): number {
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let i = 0; i < 200; i++) {
    if (f(c) < f(d)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  return (a + b) / 2;
}
/** Roots of a real polynomial (coefficients a0..an) — Durand-Kerner, returns [re, im] pairs. */
export function polyRoots(c: number[]): [number, number][] {
  let k = c.length - 1;
  while (k > 0 && Math.abs(c[k]) < 1e-14) k--;
  if (k < 1) return [];
  const a = c.slice(0, k + 1).map((x) => x / c[k]);
  const n = k;
  let z: [number, number][] = Array.from({ length: n }, (_, i) => {
    const ang = (2 * Math.PI * i) / n + 0.4;
    return [Math.cos(ang) * 1.2, Math.sin(ang) * 1.2];
  });
  const evalP = ([re, im]: [number, number]): [number, number] => {
    let pr = 1, pi = 0;
    for (let i = n - 1; i >= 0; i--) {
      const nr = pr * re - pi * im + a[i], ni = pr * im + pi * re;
      pr = nr;
      pi = ni;
    }
    return [pr, pi];
  };
  for (let it = 0; it < 500; it++) {
    let delta = 0;
    z = z.map((zi, i) => {
      const [pr, pi] = evalP(zi);
      let dr = 1, di = 0;
      z.forEach((zj, j) => {
        if (j === i) return;
        const ar = zi[0] - zj[0], ai = zi[1] - zj[1];
        const nr = dr * ar - di * ai, ni = dr * ai + di * ar;
        dr = nr;
        di = ni;
      });
      const den = dr * dr + di * di || 1e-30;
      const qr = (pr * dr + pi * di) / den, qi = (pi * dr - pr * di) / den;
      delta = Math.max(delta, Math.hypot(qr, qi));
      return [zi[0] - qr, zi[1] - qi] as [number, number];
    });
    if (delta < 1e-14) break;
  }
  return z
    .map(([re, im]) => [Math.abs(re) < 1e-10 ? 0 : re, Math.abs(im) < 1e-8 ? 0 : im] as [number, number])
    .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}
export const complexText = ([re, im]: [number, number]) =>
  im === 0 ? fmt(re) : re === 0 ? `${fmt(im)}i` : `${fmt(re)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im))}i`;

// ---------------------------------------------------------------- matrices (thin mathjs wrappers)
export const M = {
  det: (a: number[][]) => Number(math.det(a)),
  inv: (a: number[][]) => math.inv(a) as unknown as number[][],
  mul: (a: number[][], b: number[][]) => math.multiply(a, b) as unknown as number[][],
  transpose: (a: number[][]) => math.transpose(a) as unknown as number[][],
  eigs: (a: number[][]) => math.eigs(a),
  lup: (a: number[][]) => math.lup(a) as unknown as { L: number[][]; U: number[][]; p: number[] },
  qr: (a: number[][]) => math.qr(a) as unknown as { Q: number[][]; R: number[][] },
  lusolve: (a: number[][], b: number[]) => (math.lusolve(a, b) as unknown as number[][]).map((r) => r[0]),
  expm: (a: number[][]) => (math.expm(math.matrix(a)) as unknown as { toArray: () => number[][] }).toArray(),
  pow: (a: number[][], k: number) => math.pow(a, k) as unknown as number[][],
};

/** Reduced row echelon form; returns the matrix, rank and pivot columns. */
export function rref(a: number[][]): { m: number[][]; rank: number; pivots: number[] } {
  const m = a.map((r) => r.slice());
  const rows = m.length, cols = m[0].length;
  let lead = 0;
  const pivots: number[] = [];
  for (let r = 0; r < rows && lead < cols; r++) {
    let i = r;
    while (Math.abs(m[i][lead]) < 1e-10) {
      i++;
      if (i === rows) {
        i = r;
        lead++;
        if (lead === cols) return { m: clean(m), rank: pivots.length, pivots };
      }
    }
    [m[i], m[r]] = [m[r], m[i]];
    const lv = m[r][lead];
    m[r] = m[r].map((x) => x / lv);
    for (let k = 0; k < rows; k++) {
      if (k === r) continue;
      const f = m[k][lead];
      m[k] = m[k].map((x, j) => x - f * m[r][j]);
    }
    pivots.push(lead);
    lead++;
  }
  return { m: clean(m), rank: pivots.length, pivots };
}
const clean = (m: number[][]) => m.map((r) => r.map((x) => (Math.abs(x) < 1e-10 ? 0 : x)));

// ---------------------------------------------------------------- statistics helpers
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
export const mean = (a: number[]) => sum(a) / a.length;
export const variance = (a: number[], sample = true) => {
  const m = mean(a);
  return sum(a.map((x) => (x - m) ** 2)) / (a.length - (sample ? 1 : 0));
};
export const sorted = (a: number[]) => a.slice().sort((p, q) => p - q);
/** Quantile with linear interpolation (Excel QUARTILE.INC / R type 7). */
export const quantile = (a: number[], q: number) => {
  const s = sorted(a), h = (s.length - 1) * q, lo = Math.floor(h);
  return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]) - s[lo]);
};
export const median = (a: number[]) => quantile(a, 0.5);

/** Log-gamma (Lanczos). */
export function lgamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
export const gammaFn = (x: number): number => (x < 0.5 ? Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x)) : Math.exp(lgamma(x)));
export function erf(x: number): number {
  // Abramowitz-Stegun 7.1.26 is too coarse; use series/continued fraction via the incomplete gamma.
  const s = Math.sign(x), ax = Math.abs(x);
  return s * gammaP(0.5, ax * ax);
}
export const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
export const normPdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
/** Inverse standard normal (Acklam), refined with one Newton step. */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5, r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normCdf(x) - p;
  return x - e / normPdf(x);
}
/** Regularised lower incomplete gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sumv = 1 / a, del = sumv, ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sumv += del;
      if (Math.abs(del) < Math.abs(sumv) * 1e-15) break;
    }
    return sumv * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  return 1 - gammaQcf(a, x);
}
function gammaQcf(a: number, x: number): number {
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
/** Regularised incomplete beta I_x(a, b). */
export function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (xx: number, aa: number, bb: number) => {
    let c = 1, d = 1 - ((aa + bb) * xx) / (aa + 1);
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m;
      let an = (m * (bb - m) * xx) / ((aa - 1 + m2) * (aa + m2));
      d = 1 + an * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;
      an = (-(aa + m) * (aa + bb + m) * xx) / ((aa + m2) * (aa + 1 + m2));
      d = 1 + an * d;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (bt * cf(x, a, b)) / a : 1 - (bt * cf(1 - x, b, a)) / b;
}
/** Student t CDF. */
export const tCdf = (t: number, df: number) => {
  const x = df / (df + t * t);
  const p = 0.5 * betaInc(x, df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
};
export const chi2Cdf = (x: number, k: number) => gammaP(k / 2, x / 2);
export const fCdf = (x: number, d1: number, d2: number) => (x <= 0 ? 0 : betaInc((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2));
/** Generic inverse of a monotone CDF by bisection on [lo, hi]. */
export function invCdf(cdf: (x: number) => number, p: number, lo: number, hi: number): number {
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (cdf(m) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
export const tInv = (p: number, df: number) => invCdf((x) => tCdf(x, df), p, -1e4, 1e4);
export const chi2Inv = (p: number, k: number) => invCdf((x) => chi2Cdf(x, k), p, 0, 1e5);
export const fInv = (p: number, d1: number, d2: number) => invCdf((x) => fCdf(x, d1, d2), p, 0, 1e5);
export const lnChoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
export const choose = (n: number, k: number) => {
  if (k < 0 || k > n) return 0;
  const v = Math.exp(lnChoose(n, k));
  return v < 1e15 ? Math.round(v) : v;
};
