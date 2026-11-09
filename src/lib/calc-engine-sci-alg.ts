/**
 * Batch: "Science Calculators" → Math Calculators (algebra & equations, part 1 — 27 tools).
 *
 * Methods: quadratic formula x = (−b ± √(b² − 4ac)) / 2a; completing the square
 * a(x − h)² + k with h = −b/2a, k = c − b²/4a; polynomial work via mathjs rationalize (coefficients);
 * factoring by GCF + rational root theorem (±p/q) + synthetic division, leaving an irreducible
 * quadratic/cubic factor as-is; complex arithmetic in rectangular and polar form; linear programming
 * by enumerating the corner points of the feasible region (2 variables, ≤/≥ constraints, x, y ≥ 0);
 * Newton's method with a numeric derivative. Expressions use the sandboxed parser in sci-math-core.ts.
 * See prisma/create-sci-alg-calculators.ts for the copy.
 */

import {
  type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, compileFn, roots, polyCoeffs, polyText,
  simplifyText, listOf, matrixOf, numDeriv, polyRoots, complexText,
} from "./sci-math-core";

const eqSolve = (eq: string, v = "x") => {
  const parts = eq.split("=");
  if (parts.length > 2) throw new InputError("Use only one = sign.");
  const L = compileFn(parts[0], [v]), Rr = parts[1] !== undefined ? compileFn(parts[1], [v]) : () => 0;
  return { g: (x: number) => L(x) - Rr(x), L, Rr };
};

// ---------- Algebra calculator ----------
export const algebra: SciCalculator = (v) => {
  const p = txt(v, "problem");
  if (!p) throw new InputError("Type an expression or equation in x.");
  if (p.includes("=")) {
    const { g, L, Rr } = eqSolve(p);
    const rs = roots(g, -1000, 1000, 20000);
    let expanded = "";
    try {
      const [l, r] = p.split("=");
      expanded = `${polyText(polyCoeffs(`(${l}) - (${r})`))} = 0`;
    } catch {
      expanded = "(not a polynomial equation)";
    }
    return { answer: rs.length ? rs.map((r) => `x = ${fmt(r, 10)}`).join(",  ") : "no real solution", standardForm: expanded, check: rs.length ? `${fmt(L(rs[0]), 8)} = ${fmt(Rr(rs[0]), 8)}` : "—" };
  }
  let expanded = "";
  try {
    expanded = polyText(polyCoeffs(p));
  } catch {
    expanded = simplifyText(p).replace(/ \^ /g, "^");
  }
  return { answer: simplifyText(p).replace(/ \^ /g, "^"), standardForm: expanded, check: "Simplified — add an = sign to solve for x." };
};

// ---------- Quadratic formula ----------
export const quadratic: SciCalculator = (v) => {
  const a = num(v.a, 1), b = num(v.b, -3), c = num(v.c, 2);
  if (a === 0) throw new InputError("a can't be 0 in a quadratic.");
  const D = b * b - 4 * a * c;
  const h = -b / (2 * a), k = c - (b * b) / (4 * a);
  let x1: string, x2: string, nature: number;
  if (D > 0) {
    const s = Math.sqrt(D);
    x1 = fmt((-b + s) / (2 * a), 10);
    x2 = fmt((-b - s) / (2 * a), 10);
    nature = 0;
  } else if (D === 0) {
    x1 = x2 = fmt(-b / (2 * a), 10);
    nature = 1;
  } else {
    const im = Math.sqrt(-D) / (2 * Math.abs(a));
    x1 = `${fmt(h, 8)} + ${fmt(im, 8)}i`;
    x2 = `${fmt(h, 8)} − ${fmt(im, 8)}i`;
    nature = 2;
  }
  const steps = `x = (−(${fmt(b)}) ± √(${fmt(b)}² − 4·${fmt(a)}·${fmt(c)})) / (2·${fmt(a)})\n  = (${fmt(-b)} ± √${fmt(D)}) / ${fmt(2 * a)}`;
  return { x1, x2, discriminant: sig(D, 10), nature, vertex: `(${fmt(h, 8)}, ${fmt(k, 8)})`, steps };
};
export const ROOT_NATURE = ["Two distinct real roots (D > 0)", "One repeated real root (D = 0)", "Two complex roots (D < 0)"];

// ---------- Linear interpolation ----------
export const interpolation: SciCalculator = (v) => {
  const x1 = num(v.x1, 1), y1 = num(v.y1, 10), x2 = num(v.x2, 5), y2 = num(v.y2, 30), x = num(v.x, 3);
  if (x1 === x2) throw new InputError("x₁ and x₂ must be different.");
  const m = (y2 - y1) / (x2 - x1), y = y1 + m * (x - x1);
  const inside = (x - x1) * (x - x2) <= 0;
  return { y: sig(y, 12), slope: sig(m, 10), kind: inside ? 0 : 1, formula: `y = ${fmt(y1)} + (${fmt(x)} − ${fmt(x1)}) × (${fmt(y2)} − ${fmt(y1)}) / (${fmt(x2)} − ${fmt(x1)})` };
};
export const INTERP_KIND = ["Interpolation (x is between the two points)", "Extrapolation (x is outside the two points)"];

// ---------- Equation solver (choose the variable) ----------
export const VARIABLES = ["x", "y", "t", "n", "a", "z"];
export const equationSolver: SciCalculator = (v) => {
  const eq = txt(v, "eq"), name = VARIABLES[pick(v.var, VARIABLES.length)];
  const lo = num(v.lo, -1000), hi = num(v.hi, 1000);
  const { g, L } = eqSolve(eq, name);
  const rs = roots(g, Math.min(lo, hi), Math.max(lo, hi), 20000);
  if (!rs.length) throw new InputError(`No real solution for ${name} in that range.`);
  return { solutions: rs.slice(0, 12).map((r) => `${name} = ${fmt(r, 10)}`).join(",  "), count: rs.length, first: sig(rs[0], 12), check: `left side at ${name} = ${fmt(rs[0], 6)}: ${fmt(L(rs[0]), 8)}` };
};

// ---------- Polynomial arithmetic ----------
const addP = (p: number[], q: number[]) => Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] ?? 0) + (q[i] ?? 0));
const mulP = (p: number[], q: number[]) => {
  const r = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (r[i + j] += a * b)));
  return r;
};
const trimP = (p: number[]) => {
  const r = p.slice();
  while (r.length > 1 && Math.abs(r[r.length - 1]) < 1e-12) r.pop();
  return r;
};
const divP = (n: number[], d: number[]) => {
  const N = trimP(n), D = trimP(d);
  if (D.length === 1 && D[0] === 0) throw new InputError("Can't divide by the zero polynomial.");
  const q = new Array(Math.max(1, N.length - D.length + 1)).fill(0), r = N.slice();
  for (let i = N.length - D.length; i >= 0; i--) {
    const c = r[i + D.length - 1] / D[D.length - 1];
    q[i] = c;
    for (let j = 0; j < D.length; j++) r[i + j] -= c * D[j];
  }
  return { q: trimP(q), r: trimP(r.slice(0, Math.max(1, D.length - 1))) };
};
const evalP = (p: number[], x: number) => p.reduceRight((acc, c) => acc * x + c, 0);
export const POLY_OPS = ["Add P + Q", "Subtract P − Q", "Multiply P × Q", "Divide P ÷ Q"];
export const polynomial: SciCalculator = (v) => {
  const P = polyCoeffs(txt(v, "p")), Q = polyCoeffs(txt(v, "q")), op = pick(v.op, 4), x0 = num(v.x0, 2);
  let res: number[], rem: number[] | null = null;
  if (op === 0) res = addP(P, Q);
  else if (op === 1) res = addP(P, Q.map((c) => -c));
  else if (op === 2) res = mulP(P, Q);
  else {
    const d = divP(P, Q);
    res = d.q;
    rem = d.r;
  }
  res = trimP(res);
  return { result: polyText(res), remainder: rem ? polyText(rem) : "—", degree: res.length - 1, valueAt: sig(evalP(res, x0), 10), pText: polyText(P), qText: polyText(Q) };
};

// ---------- Inverse function (numeric) ----------
export const inverseFunction: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"), ["x"]);
  const y = num(v.y, 7), lo = num(v.lo, -1000), hi = num(v.hi, 1000);
  const rs = roots((x) => f(x) - y, Math.min(lo, hi), Math.max(lo, hi), 20000);
  if (!rs.length) throw new InputError("No x gives that y in the search range — the value may be outside f's range.");
  const one = rs.length === 1;
  return { x: sig(rs[0], 12), all: rs.slice(0, 10).map((r) => fmt(r, 10)).join(", "), oneToOne: one ? 0 : 1, check: `f(${fmt(rs[0], 8)}) = ${fmt(f(rs[0]), 8)}` };
};
export const ONE_TO_ONE = ["One x for this y (inverse value is unique)", "Several x values — f isn't one-to-one here; restrict the domain"];

// ---------- Complex numbers ----------
export const CX_OPS = ["Add z₁ + z₂", "Subtract z₁ − z₂", "Multiply z₁ × z₂", "Divide z₁ ÷ z₂", "z₁ to a power n", "Square roots of z₁"];
export const complexCalc: SciCalculator = (v) => {
  const a = num(v.a, 3), b = num(v.b, 4), c = num(v.c, 1), d = num(v.d, -2), op = pick(v.op, 6), n = num(v.n, 2);
  let re = 0, im = 0, extra = "";
  if (op === 0) [re, im] = [a + c, b + d];
  else if (op === 1) [re, im] = [a - c, b - d];
  else if (op === 2) [re, im] = [a * c - b * d, a * d + b * c];
  else if (op === 3) {
    const den = c * c + d * d;
    if (!den) throw new InputError("Can't divide by 0.");
    [re, im] = [(a * c + b * d) / den, (b * c - a * d) / den];
  } else {
    const r = Math.hypot(a, b), th = Math.atan2(b, a);
    if (op === 4) [re, im] = [r ** n * Math.cos(n * th), r ** n * Math.sin(n * th)];
    else {
      const s = Math.sqrt(r);
      [re, im] = [s * Math.cos(th / 2), s * Math.sin(th / 2)];
      extra = `and ${complexText([-re, -im].map((x) => sig(x, 10)) as [number, number])}`;
    }
  }
  re = sig(re, 12);
  im = sig(im, 12);
  const mod = Math.hypot(re, im), arg = (Math.atan2(im, re) * 180) / Math.PI;
  return { result: complexText([re, im]) + (extra ? `  ${extra}` : ""), real: re, imaginary: im, modulus: sig(mod, 10), argument: sig(arg, 10), polar: `${fmt(mod, 8)}(cos ${fmt(arg, 6)}° + i sin ${fmt(arg, 6)}°)`, conjugate: complexText([re, -im]) };
};

// ---------- Sigma notation ----------
export const sigma: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fn"), ["n"]);
  const a = Math.round(num(v.start, 1)), b = Math.round(num(v.end, 10));
  if (b < a) throw new InputError("The end value must be at least the start value.");
  if (b - a > 1e6) throw new InputError("Up to 1,000,000 terms.");
  let s = 0;
  const first: string[] = [];
  for (let k = a; k <= b; k++) {
    const t = f(k);
    s += t;
    if (first.length < 6) first.push(fmt(t, 8));
  }
  return { sum: sig(s, 12), terms: b - a + 1, mean: sig(s / (b - a + 1), 10), expansion: first.join(" + ") + (b - a + 1 > 6 ? " + …" : "") };
};

// ---------- Exponential growth / decay ----------
export const GROWTH_MODES = ["Growth (rate % per period)", "Decay (rate % per period)", "Continuous growth (e^rt)", "Continuous decay (e^−rt)"];
export const exponentialGrowth: SciCalculator = (v) => {
  const p0 = num(v.p0, 1000), r = pos(v.rate, 5) / 100, t = num(v.t, 10), m = pick(v.mode, 4);
  const factor = m === 0 ? (1 + r) ** t : m === 1 ? (1 - r) ** t : m === 2 ? Math.exp(r * t) : Math.exp(-r * t);
  const growth = m === 0 || m === 2;
  const double = m === 0 ? Math.log(2) / Math.log(1 + r) : m === 2 ? Math.log(2) / r : m === 1 ? Math.log(0.5) / Math.log(1 - r) : Math.log(2) / r;
  return { final: sig(p0 * factor, 12), change: sig(p0 * factor - p0, 10), factor: sig(factor, 10), doubling: r > 0 ? sig(double, 8) : 0, doublingLabel: growth ? 0 : 1, formula: m < 2 ? `P = ${fmt(p0)} × (1 ${growth ? "+" : "−"} ${fmt(r)})^${fmt(t)}` : `P = ${fmt(p0)} × e^(${growth ? "" : "−"}${fmt(r)}·${fmt(t)})` };
};
export const DOUBLING_LABEL = ["Doubling time", "Half-life"];

// ---------- Synthetic division ----------
export const syntheticDivision: SciCalculator = (v) => {
  const co = listOf(v, "coeffs", 2), c = num(v.c, 2);
  const out = [co[0]];
  for (let i = 1; i < co.length; i++) out.push(co[i] + out[i - 1] * c);
  const rem = out.pop()!;
  const q = out.slice().reverse();
  const row2 = ["  "].concat(co.slice(1).map((_, i) => fmt(out[i] * c)));
  return { quotient: polyText(q), remainder: sig(rem, 12), isFactor: Math.abs(rem) < 1e-9 ? 0 : 1, table: `${fmt(c)} | ${co.map((x) => fmt(x)).join("   ")}\n    ${row2.join("   ")}\n    ${out.map((x) => fmt(x)).join("   ")}   | ${fmt(rem)}` };
};
export const FACTOR_LABEL = ["Yes — (x − c) is a factor (remainder 0)", "No — remainder isn't 0"];

// ---------- Completing the square & vertex form ----------
const vtx = (a: number, b: number, c: number) => {
  if (a === 0) throw new InputError("a can't be 0.");
  return { h: -b / (2 * a), k: c - (b * b) / (4 * a) };
};
const vForm = (a: number, h: number, k: number) => `${a === 1 ? "" : a === -1 ? "−" : fmt(a, 8)}(x ${h < 0 ? "+" : "−"} ${fmt(Math.abs(h), 8)})² ${k < 0 ? "−" : "+"} ${fmt(Math.abs(k), 8)}`;
export const completeSquare: SciCalculator = (v) => {
  const a = num(v.a, 1), b = num(v.b, 6), c = num(v.c, 5);
  const { h, k } = vtx(a, b, c);
  const rhs = -k / a;
  const sol = rhs >= 0 ? `x = ${fmt(h + Math.sqrt(rhs), 10)},  x = ${fmt(h - Math.sqrt(rhs), 10)}` : `x = ${fmt(h, 8)} ± ${fmt(Math.sqrt(-rhs), 8)}i`;
  const steps = `${fmt(a)}x² + ${fmt(b)}x + ${fmt(c)}\n= ${fmt(a)}(x² + ${fmt(b / a)}x) + ${fmt(c)}\n= ${fmt(a)}(x² + ${fmt(b / a)}x + ${fmt((b / (2 * a)) ** 2)}) + ${fmt(c)} − ${fmt(a * (b / (2 * a)) ** 2)}\n= ${vForm(a, h, k)}`;
  return { vertexForm: vForm(a, h, k), solutions: sol, h: sig(h, 10), k: sig(k, 10), steps };
};
export const vertexForm: SciCalculator = (v) => {
  const a = num(v.a, 2), b = num(v.b, -8), c = num(v.c, 3);
  const { h, k } = vtx(a, b, c);
  const p = 1 / (4 * a);
  return { vertex: `(${fmt(h, 10)}, ${fmt(k, 10)})`, vertexForm: vForm(a, h, k), axis: `x = ${fmt(h, 10)}`, opens: a > 0 ? 0 : 1, focus: `(${fmt(h, 8)}, ${fmt(k + p, 8)})`, yIntercept: sig(c, 10) };
};
export const OPENS = ["Upward (minimum at the vertex)", "Downward (maximum at the vertex)"];

// ---------- Linear equation ax + b = cx + d ----------
export const linearEquation: SciCalculator = (v) => {
  const a = num(v.a, 3), b = num(v.b, 5), c = num(v.c, 1), d = num(v.d, 11);
  const coef = a - c, rhs = d - b;
  if (coef === 0) return { x: rhs === 0 ? "every x (identity)" : "no solution", steps: `${fmt(a)}x − ${fmt(c)}x = ${fmt(d)} − ${fmt(b)}  →  0 = ${fmt(rhs)}`, check: "—" };
  const x = rhs / coef;
  return { x: fmt(x, 12), steps: `${fmt(a)}x + ${fmt(b)} = ${fmt(c)}x + ${fmt(d)}\n${fmt(coef)}x = ${fmt(rhs)}\nx = ${fmt(rhs)} / ${fmt(coef)} = ${fmt(x, 12)}`, check: `${fmt(a * x + b, 10)} = ${fmt(c * x + d, 10)}` };
};

// ---------- Slope & line equations ----------
export const slope: SciCalculator = (v) => {
  const x1 = num(v.x1, 1), y1 = num(v.y1, 2), x2 = num(v.x2, 4), y2 = num(v.y2, 8);
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy), mid = `(${fmt((x1 + x2) / 2)}, ${fmt((y1 + y2) / 2)})`;
  if (dx === 0) return { slope: "undefined (vertical line)", slopeIntercept: `x = ${fmt(x1)}`, pointSlope: `x = ${fmt(x1)}`, standard: `x = ${fmt(x1)}`, yIntercept: "none", distance: sig(dist, 10), midpoint: mid, angle: 90 };
  const m = dy / dx, b = y1 - m * x1;
  const g = (p: number, q: number): number => (q ? g(q, p % q) : Math.abs(p));
  const isInt = [dy, dx, b * dx].every((z) => Math.abs(z - Math.round(z)) < 1e-9);
  let std: string;
  if (isInt) {
    let A = -Math.round(dy), B = Math.round(dx), C = Math.round(b * dx);
    const k = g(g(A, B), C) || 1;
    [A, B, C] = [A / k, B / k, C / k];
    if (A < 0 || (A === 0 && B < 0)) [A, B, C] = [-A, -B, -C];
    std = `${fmt(A)}x ${B < 0 ? "−" : "+"} ${fmt(Math.abs(B))}y = ${fmt(C)}`;
  } else std = `${fmt(-m, 8)}x + y = ${fmt(b, 8)}`;
  return { slope: fmt(m, 10), slopeIntercept: `y = ${fmt(m, 8)}x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b), 8)}`, pointSlope: `y − ${fmt(y1)} = ${fmt(m, 8)}(x − ${fmt(x1)})`, standard: std, yIntercept: fmt(b, 10), distance: sig(dist, 10), midpoint: mid, angle: sig((Math.atan(m) * 180) / Math.PI, 8) };
};

// ---------- Simplify / expand ----------
export const simplify: SciCalculator = (v) => {
  const e = txt(v, "expr");
  const s = simplifyText(e).replace(/ \^ /g, "^");
  let ex = "";
  try {
    ex = polyText(polyCoeffs(e));
  } catch {
    ex = "(not a polynomial)";
  }
  const f = compileFn(e, ["x"]);
  return { simplified: s, expanded: ex, check: `at x = 2: original = ${fmt(f(2), 8)}, simplified = ${fmt(compileFn(s, ["x"])(2), 8)}` };
};
export const expand: SciCalculator = (v) => {
  const c = polyCoeffs(txt(v, "expr"));
  return { expanded: polyText(c), degree: c.length - 1, terms: c.filter((x) => Math.abs(x) > 1e-12).length, coefficients: c.slice().reverse().map((x) => fmt(x)).join(", ") };
};

// ---------- Word problems (common templates) ----------
export const WORD_TYPES = ["Distance = rate × time (find time)", "Two workers together (find combined time)", "Mixture (find final concentration %)", "Consecutive integers (given their sum)", "Percent of a number (a% of b)", "Simple interest (I = Prt)"];
export const wordProblem: SciCalculator = (v) => {
  const t = pick(v.type, 6), a = num(v.a, 60), b = num(v.b, 150), c = num(v.c, 3);
  switch (t) {
    case 0: {
      if (!a) throw new InputError("Speed can't be 0.");
      return { answer: sig(b / a, 10), working: `time = distance ÷ rate = ${fmt(b)} ÷ ${fmt(a)} = ${fmt(b / a, 8)}` };
    }
    case 1: {
      const r = 1 / a + 1 / b;
      return { answer: sig(1 / r, 10), working: `1/T = 1/${fmt(a)} + 1/${fmt(b)} → T = ${fmt(1 / r, 8)}` };
    }
    case 2: {
      const conc = (a * b + c * num(v.d, 20)) / (a + c);
      return { answer: sig(conc, 10), working: `(${fmt(a)} × ${fmt(b)}% + ${fmt(c)} × ${fmt(num(v.d, 20))}%) ÷ (${fmt(a)} + ${fmt(c)}) = ${fmt(conc, 8)}%` };
    }
    case 3: {
      const n = Math.max(1, Math.round(c));
      const first = (a - (n * (n - 1)) / 2) / n;
      if (!Number.isInteger(first)) return { answer: "no integer solution", working: `n·x + n(n−1)/2 = ${fmt(a)} gives x = ${fmt(first, 6)}` };
      return { answer: Array.from({ length: n }, (_, i) => first + i).join(", "), working: `${n}x + ${(n * (n - 1)) / 2} = ${fmt(a)} → x = ${first}` };
    }
    case 4:
      return { answer: sig((a / 100) * b, 12), working: `${fmt(a)}% × ${fmt(b)} = ${fmt((a / 100) * b, 10)}` };
    default:
      return { answer: sig(b * (a / 100) * c, 12), working: `I = P·r·t = ${fmt(b)} × ${fmt(a / 100)} × ${fmt(c)} = ${fmt(b * (a / 100) * c, 10)}` };
  }
};

// ---------- Factoring ----------
const gcdI = (a: number, b: number): number => (b ? gcdI(b, a % b) : Math.abs(a));
function intCoeffs(c: number[]): { ints: number[]; scale: number } {
  let scale = 1;
  for (let k = 0; k < 6 && c.some((x) => Math.abs(x * scale - Math.round(x * scale)) > 1e-9); k++) scale *= 10;
  return { ints: c.map((x) => Math.round(x * scale)), scale };
}
const divisors = (n: number) => {
  n = Math.abs(n);
  const d: number[] = [];
  for (let i = 1; i <= Math.min(n, 1e5); i++) if (n % i === 0) d.push(i);
  return d;
};
function rationalCandidates(c: number[]): number[] {
  const p = divisors(c[0] || 0), q = divisors(c[c.length - 1]);
  const set = new Set<number>();
  for (const a of p) for (const b of q) {
    set.add(a / b);
    set.add(-a / b);
  }
  return [...set].sort((x, y) => x - y);
}
const frac = (x: number) => {
  for (let d = 1; d <= 1000; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return d === 1 ? `${Math.round(x)}` : `${Math.round(x * d)}/${d}`;
  return fmt(x);
};
function factorPoly(cIn: number[]): { text: string; rational: number[] } {
  const { ints, scale } = intCoeffs(trimP(cIn));
  let c = ints;
  let g = c.reduce((acc, x) => gcdI(acc, x), 0) || 1;
  if (c[c.length - 1] < 0) g = -g;
  c = c.map((x) => x / g);
  const parts: string[] = [];
  let lowZero = 0;
  while (c.length > 1 && c[0] === 0) {
    c = c.slice(1);
    lowZero++;
  }
  const found: number[] = [];
  let changed = true;
  while (changed && c.length > 2) {
    changed = false;
    if (c[0] === 0) break;
    for (const r of rationalCandidates(c)) {
      if (Math.abs(evalP(c, r)) < 1e-9) {
        // divide by (q x − p) where r = p/q
        let qd = 1;
        while (Math.abs(r * qd - Math.round(r * qd)) > 1e-9) qd++;
        const pn = Math.round(r * qd);
        const { q, r: rem } = divP(c, [-pn, qd]);
        if (Math.abs(rem[0] ?? 0) > 1e-7) continue;
        c = q.map((x) => Math.round(x * 1e9) / 1e9);
        found.push(r);
        parts.push(qd === 1 ? `(x ${pn < 0 ? "+" : "−"} ${Math.abs(pn)})` : `(${qd}x ${pn < 0 ? "+" : "−"} ${Math.abs(pn)})`);
        changed = true;
        break;
      }
    }
  }
  if (c.length === 2) {
    const r = -c[0] / c[1];
    found.push(r);
    const k = c[1];
    parts.push(Number.isInteger(k) && k !== 1 ? `(${fmt(k)}x ${c[0] < 0 ? "−" : "+"} ${fmt(Math.abs(c[0]))})` : `(x ${r > 0 ? "−" : "+"} ${frac(Math.abs(r))})`);
    if (Number.isInteger(k) && k !== 1) {
      /* leading constant absorbed in factor */
    }
  } else if (c.length > 2) parts.push(`(${polyText(c)})`);
  else if (c.length === 1 && c[0] !== 1) g *= c[0];
  const xs = lowZero ? (lowZero === 1 ? "x" : `x^${lowZero}`) : "";
  // collapse repeated factors
  const counts = new Map<string, number>();
  for (const p of parts) counts.set(p, (counts.get(p) ?? 0) + 1);
  const body = [...counts].map(([p, n]) => (n > 1 ? `${p}^${n}` : p)).join("");
  const lead = g / scale;
  const leadTxt = lead === 1 ? "" : lead === -1 ? "−" : fmt(lead);
  return { text: (leadTxt + xs + body) || "1", rational: lowZero ? [0, ...found] : found };
}
export const factoring: SciCalculator = (v) => {
  const e = txt(v, "expr");
  if (/^\s*-?\d+\s*$/.test(e)) {
    let n = Math.abs(Math.round(Number(e)));
    const f: string[] = [];
    for (let p = 2; p * p <= n; p++) while (n % p === 0) {
      f.push(String(p));
      n /= p;
    }
    if (n > 1) f.push(String(n));
    return { factored: f.join(" × ") || e, rationalRoots: "—", check: `prime factorisation of ${e}` };
  }
  const c = polyCoeffs(e);
  const r = factorPoly(c);
  return { factored: r.text, rationalRoots: r.rational.length ? [...new Set(r.rational.map(frac))].join(", ") : "none", check: `expanded: ${polyText(c)}` };
};

// ---------- Rational expressions ----------
export const rationalExpression: SciCalculator = (v) => {
  const N = polyCoeffs(txt(v, "num")), D = polyCoeffs(txt(v, "den")), x0 = num(v.x0, 3);
  const nr = polyRoots(N).filter(([, im]) => im === 0).map(([re]) => re), dr = polyRoots(D).filter(([, im]) => im === 0).map(([re]) => re);
  const common = dr.filter((r) => nr.some((s) => Math.abs(s - r) < 1e-7));
  let n = N, d = D;
  for (const r of common) {
    n = divP(n, [-r, 1]).q;
    d = divP(d, [-r, 1]).q;
  }
  const val = evalP(D, x0) === 0 ? "undefined" : sig(evalP(N, x0) / evalP(D, x0), 10);
  return { simplified: `(${polyText(n.map((x) => sig(x, 10)))}) / (${polyText(d.map((x) => sig(x, 10)))})`, excluded: dr.length ? [...new Set(dr.map((r) => fmt(r, 8)))].join(", ") : "none (real)", holes: common.length ? common.map((r) => fmt(r, 8)).join(", ") : "none", valueAt: val, zeros: nr.filter((r) => !common.some((c) => Math.abs(c - r) < 1e-7)).map((r) => fmt(r, 8)).join(", ") || "none" };
};

// ---------- Binomial expansion ----------
export const binomialExpansion: SciCalculator = (v) => {
  const a = num(v.a, 1), b = num(v.b, 2), n = Math.round(pos(v.n, 4)), k = Math.round(pos(v.k, 2));
  if (n > 60) throw new InputError("Use n up to 60.");
  const row: number[] = [1];
  for (let i = 1; i <= n; i++) row.push((row[i - 1] * (n - i + 1)) / i);
  const coeffs = row.map((c, i) => c * a ** (n - i) * b ** i); // coefficient of x^(n-i)
  const poly = coeffs.slice().reverse();
  const kk = Math.min(k, n);
  return { expansion: polyText(poly), pascal: row.join("  "), kthTerm: `T${kk + 1} = C(${n},${kk}) (${fmt(a)}x)^${n - kk} (${fmt(b)})^${kk} = ${fmt(coeffs[kk])}x^${n - kk}`, sumCoeffs: sig((a + b) ** n, 12) };
};

// ---------- Linear programming (2 variables) ----------
export const LP_GOAL = ["Maximize", "Minimize"];
export const LP_SIGN = ["≤", "≥"];
export const linearProgramming: SciCalculator = (v) => {
  const goal = pick(v.goal, 2), cx = num(v.cx, 3), cy = num(v.cy, 5);
  const cons: [number, number, number, number][] = [1, 2, 3].map((i) => [num(v[`a${i}`]), num(v[`b${i}`]), num(v[`r${i}`]), pick(v[`s${i}`], 2)]).filter(([a, b]) => a !== 0 || b !== 0) as [number, number, number, number][];
  const lines: [number, number, number][] = cons.map(([a, b, r]) => [a, b, r]);
  lines.push([1, 0, 0], [0, 1, 0]);
  const pts: [number, number][] = [];
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const [a1, b1, c1] = lines[i], [a2, b2, c2] = lines[j];
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-12) continue;
    pts.push([(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]);
  }
  const feasible = pts.filter(([x, y]) => x >= -1e-9 && y >= -1e-9 && cons.every(([a, b, r, s]) => (s === 0 ? a * x + b * y <= r + 1e-9 : a * x + b * y >= r - 1e-9)));
  if (!feasible.length) throw new InputError("No feasible region — the constraints can't all be met.");
  const z = (p: [number, number]) => cx * p[0] + cy * p[1];
  const best = feasible.reduce((p, q) => ((goal === 0 ? z(q) > z(p) : z(q) < z(p)) ? q : p));
  return { optimum: sig(z(best), 12), x: sig(best[0], 10), y: sig(best[1], 10), corners: feasible.map((p) => `(${fmt(p[0], 6)}, ${fmt(p[1], 6)}) → z = ${fmt(z(p), 8)}`).join("\n"), note: "If the region is unbounded in the optimising direction, there may be no finite optimum — check the corners." };
};

// ---------- Direct / inverse variation ----------
export const VARIATION = ["Direct (y = kx)", "Inverse (y = k / x)", "Joint (y = kxz)", "Square (y = kx²)"];
export const directVariation: SciCalculator = (v) => {
  const t = pick(v.type, 4), x1 = num(v.x1, 4), y1 = num(v.y1, 12), x2 = num(v.x2, 10), z1 = num(v.z1, 1) || 1, z2 = num(v.z2, 1) || 1;
  const k = t === 0 ? y1 / x1 : t === 1 ? y1 * x1 : t === 2 ? y1 / (x1 * z1) : y1 / (x1 * x1);
  const y2 = t === 0 ? k * x2 : t === 1 ? k / x2 : t === 2 ? k * x2 * z2 : k * x2 * x2;
  return { y2: sig(y2, 12), k: sig(k, 12), equation: ["y = kx", "y = k/x", "y = kxz", "y = kx²"][t].replace("k", fmt(k, 8)) };
};

// ---------- Root-finding methods ----------
export const newtonsMethod: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"), ["x"]);
  let x = num(v.x0, 1);
  const n = Math.min(100, Math.max(1, Math.round(pos(v.iter, 10)))), tol = pos(v.tol, 1e-10) || 1e-10;
  const rows: string[] = [];
  let i = 0;
  for (; i < n; i++) {
    const fx = f(x), d = numDeriv(f, x);
    if (!Number.isFinite(d) || d === 0) throw new InputError(`The derivative is 0 at x = ${fmt(x)} — try another starting value.`);
    const nx = x - fx / d;
    rows.push(`${String(i + 1).padStart(2)}: x = ${fmt(nx, 12)}   f(x) = ${fmt(f(nx), 6)}`);
    if (Math.abs(nx - x) < tol) {
      x = nx;
      i++;
      break;
    }
    x = nx;
  }
  return { root: sig(x, 14), iterations: i, fRoot: sig(f(x), 8), table: rows.join("\n") };
};
export const nsolve: SciCalculator = (v) => {
  const { g } = eqSolve(txt(v, "eq"));
  let x = num(v.x0, 1);
  for (let i = 0; i < 200; i++) {
    const d = numDeriv(g, x);
    if (!Number.isFinite(d) || d === 0) break;
    const nx = x - g(x) / d;
    if (!Number.isFinite(nx)) break;
    if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) {
      x = nx;
      break;
    }
    x = nx;
  }
  if (!(Math.abs(g(x)) < 1e-8)) {
    const rs = roots(g, -1000, 1000, 20000);
    if (!rs.length) throw new InputError("No real solution found.");
    x = rs.reduce((p, q) => (Math.abs(q - num(v.x0, 1)) < Math.abs(p - num(v.x0, 1)) ? q : p));
  }
  return { x: sig(x, 14), residual: sig(g(x), 6), note: "Solution nearest the starting guess (Newton's method, with a bracketing fallback)." };
};

// ---------- Evaluate expression ----------
export const evaluateExpression: SciCalculator = (v) => {
  const f = compileFn(txt(v, "expr"), ["x", "y", "z"]);
  const x = num(v.x, 2), y = num(v.y, 3), z = num(v.z, 1);
  return { value: sig(f(x, y, z), 12), substituted: txt(v, "expr").replace(/(?<![A-Za-z_])x(?![A-Za-z_])/g, `(${fmt(x)})`).replace(/(?<![A-Za-z_])y(?![A-Za-z_])/g, `(${fmt(y)})`).replace(/(?<![A-Za-z_])z(?![A-Za-z_])/g, `(${fmt(z)})`) };
};

// ---------- Rational zeros theorem ----------
export const rationalZeros: SciCalculator = (v) => {
  const raw = listOf(v, "coeffs", 2); // highest degree first
  const c = raw.slice().reverse();
  if (raw.some((x) => !Number.isInteger(x))) throw new InputError("Use whole-number coefficients (multiply through by a common denominator).");
  let cc = c;
  let shift = 0;
  while (cc.length > 1 && cc[0] === 0) {
    cc = cc.slice(1);
    shift++;
  }
  const cands = rationalCandidates(cc);
  const actual = cands.filter((r) => Math.abs(evalP(cc, r)) < 1e-9);
  if (shift) actual.unshift(0);
  const signs = (arr: number[]) => {
    const s = arr.filter((x) => x !== 0);
    let k = 0;
    for (let i = 1; i < s.length; i++) if (Math.sign(s[i]) !== Math.sign(s[i - 1])) k++;
    return k;
  };
  const pos_ = signs(raw), neg = signs(c.map((x, i) => (i % 2 ? -x : x)).reverse());
  return { actual: actual.length ? actual.map(frac).join(", ") : "none", possible: cands.map(frac).join(", "), count: cands.length, descartes: `positive real zeros: ${pos_}${pos_ > 1 ? ` or ${pos_ - 2 >= 0 ? Array.from({ length: Math.floor(pos_ / 2) }, (_, i) => pos_ - 2 * (i + 1)).join(", ") : ""}` : ""}; negative real zeros: ${neg}${neg > 1 ? ` or ${Array.from({ length: Math.floor(neg / 2) }, (_, i) => neg - 2 * (i + 1)).join(", ")}` : ""}` };
};

// ---------- Systems of linear equations ----------
export const systemOfEquations: SciCalculator = (v) => {
  const m = matrixOf(txt(v, "aug"));
  const n = m.length;
  if (m[0].length !== n + 1) throw new InputError("Enter an augmented matrix: n rows of n coefficients plus the constant (e.g. 2 3 8; 1 -1 1).");
  const a = m.map((r) => r.slice(0, n)), b = m.map((r) => r[n]);
  const det = Number((() => {
    const t = a.map((r) => r.slice());
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
    return d;
  })());
  const names = ["x", "y", "z", "w", "u", "v", "s", "t", "p", "q"];
  if (Math.abs(det) < 1e-12) {
    // check consistency via rank
    const rank = (mm: number[][]) => {
      const t = mm.map((r) => r.slice());
      let r = 0;
      for (let c = 0; c < t[0].length && r < t.length; c++) {
        let p = r;
        while (p < t.length && Math.abs(t[p][c]) < 1e-10) p++;
        if (p === t.length) continue;
        [t[p], t[r]] = [t[r], t[p]];
        for (let k = 0; k < t.length; k++) if (k !== r) {
          const f = t[k][c] / t[r][c];
          for (let j = c; j < t[0].length; j++) t[k][j] -= f * t[r][j];
        }
        r++;
      }
      return r;
    };
    const ra = rank(a), rab = rank(m);
    return { solution: ra < rab ? "No solution (inconsistent system)" : "Infinitely many solutions (dependent system)", determinant: 0, type: ra < rab ? 2 : 1 };
  }
  // Gaussian elimination with partial pivoting
  const t = m.map((r) => r.slice());
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(t[k][i]) > Math.abs(t[p][i])) p = k;
    [t[p], t[i]] = [t[i], t[p]];
    for (let k = i + 1; k < n; k++) {
      const f = t[k][i] / t[i][i];
      for (let j = i; j <= n; j++) t[k][j] -= f * t[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = t[i][n];
    for (let j = i + 1; j < n; j++) s -= t[i][j] * x[j];
    x[i] = s / t[i][i];
  }
  void b;
  return { solution: x.map((xi, i) => `${names[i]} = ${fmt(Math.abs(xi) < 1e-12 ? 0 : xi, 10)}`).join(",  "), determinant: sig(det, 10), type: 0 };
};
export const SYSTEM_TYPE = ["One unique solution", "Infinitely many solutions", "No solution"];

// ---------- Cross multiplication / proportions ----------
export const crossMultiply: SciCalculator = (v) => {
  const a = num(v.a, 3), b = num(v.b, 4), c = num(v.c, 9);
  if (a === 0) throw new InputError("a can't be 0.");
  const x = (b * c) / a;
  return { x: sig(x, 12), working: `${fmt(a)}/${fmt(b)} = ${fmt(c)}/x  →  ${fmt(a)}·x = ${fmt(b)}·${fmt(c)}  →  x = ${fmt(x, 10)}`, ratio: sig(a / b, 10) };
};

// ---------- Function composition ----------
const sub = (outer: string, inner: string) => outer.replace(/(?<![A-Za-z_])x(?![A-Za-z_])/g, `(${inner})`);
export const composition: SciCalculator = (v) => {
  const fs = txt(v, "f"), gs = txt(v, "g"), x = num(v.x, 2);
  const f = compileFn(fs), g = compileFn(gs);
  const fog = sub(fs, gs), gof = sub(gs, fs);
  const tidy = (e: string) => {
    try {
      return polyText(polyCoeffs(e));
    } catch {
      return simplifyText(e).replace(/ \^ /g, "^");
    }
  };
  return { fog: sig(f(g(x)), 12), gof: sig(g(f(x)), 12), fogText: tidy(fog), gofText: tidy(gof) };
};

// ---------- Linear & absolute-value inequalities ----------
export const INEQ = ["<", "≤", ">", "≥"];
export const INEQ_TYPES = ["ax + b ? c", "|ax + b| ? c"];
export const inequality: SciCalculator = (v) => {
  const t = pick(v.type, 2), a = num(v.a, 2), b = num(v.b, -3), c = num(v.c, 7), s = pick(v.sign, 4);
  if (a === 0) throw new InputError("a can't be 0.");
  const strict = s === 0 || s === 2;
  const lt = s < 2;
  const L = strict ? "(" : "[", Rb = strict ? ")" : "]";
  if (t === 0) {
    const x = (c - b) / a;
    const flip = a < 0;
    const less = lt !== flip;
    const sym = INEQ[less ? (strict ? 0 : 1) : strict ? 2 : 3];
    return { solution: `x ${sym} ${fmt(x, 10)}`, interval: less ? `(−∞, ${fmt(x, 10)}${Rb}` : `${L}${fmt(x, 10)}, ∞)`, note: flip ? "Dividing by a negative a flips the inequality sign." : "a > 0, so the sign stays the same." };
  }
  if (c < 0 || (c === 0 && strict && lt)) return { solution: lt ? "no solution" : "all real x", interval: lt ? "∅" : "(−∞, ∞)", note: "An absolute value is never negative." };
  const x1 = (-c - b) / a, x2 = (c - b) / a, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  return lt
    ? { solution: `${fmt(lo, 10)} ${strict ? "<" : "≤"} x ${strict ? "<" : "≤"} ${fmt(hi, 10)}`, interval: `${L}${fmt(lo, 10)}, ${fmt(hi, 10)}${Rb}`, note: "|u| < c means −c < u < c." }
    : { solution: `x ${strict ? "<" : "≤"} ${fmt(lo, 10)} or x ${strict ? ">" : "≥"} ${fmt(hi, 10)}`, interval: `(−∞, ${fmt(lo, 10)}${Rb} ∪ ${L}${fmt(hi, 10)}, ∞)`, note: "|u| > c means u < −c or u > c." };
};

export const sciAlgCustomCalculators: Record<string, SciCalculator> = {
  "algebra-calculator": algebra,
  "quadratic-formula-calculator": quadratic,
  "interpolation-calculator": interpolation,
  "equation-solver-calculator": equationSolver,
  "polynomial-calculator": polynomial,
  "inverse-function-calculator": inverseFunction,
  "complex-number-calculator": complexCalc,
  "sigma-notation-calculator": sigma,
  "exponential-growth-calculator": exponentialGrowth,
  "synthetic-division-calculator": syntheticDivision,
  "completing-the-square-calculator": completeSquare,
  "vertex-form-calculator": vertexForm,
  "linear-equation-calculator": linearEquation,
  "slope-calculator": slope,
  "simplify-calculator": simplify,
  "word-problem-calculator": wordProblem,
  "factoring-calculator": factoring,
  "rational-expression-calculator": rationalExpression,
  "binomial-expansion-calculator": binomialExpansion,
  "linear-programming-calculator": linearProgramming,
  "direct-variation-calculator": directVariation,
  "newtons-method-calculator": newtonsMethod,
  "evaluate-expression-calculator": evaluateExpression,
  "rational-zeros-calculator": rationalZeros,
  "nsolve-calculator": nsolve,
  "system-of-equations-calculator": systemOfEquations,
  "cross-multiplication-calculator": crossMultiply,
  "expand-calculator": expand,
  "function-composition-calculator": composition,
  "linear-inequalities-calculator": inequality,
};

export type { Vals };
