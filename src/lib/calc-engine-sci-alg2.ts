/**
 * Batch: "Science Calculators" → Math Calculators (algebra & functions, part 2 — 23 tools).
 *
 * Methods: polynomial roots by Durand-Kerner (all complex roots); radicals simplified by pulling
 * out the largest perfect power; logarithm laws log(xᵖyᵠ/zʳ) = p log x + q log y − r log z;
 * bounds = value ± half the rounding unit; Jacobi / Gauss-Seidel iteration; bisection and secant
 * root finding; Lagrange interpolating polynomial; finite-difference tests for linear / quadratic /
 * exponential tables; function parity tested numerically at sample points; partial-quotients
 * division with place-value chunks. Expressions use the sandboxed parser in sci-math-core.ts.
 * See prisma/create-sci-alg2-calculators.ts for the copy.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, compileFn, polyCoeffs, polyText, simplifyText, listOf, matrixOf, polyRoots, complexText } from "./sci-math-core";

// ---------- Exponent rules ----------
export const EXP_RULES = ["Product: aᵐ · aⁿ = aᵐ⁺ⁿ", "Quotient: aᵐ ÷ aⁿ = aᵐ⁻ⁿ", "Power of a power: (aᵐ)ⁿ = aᵐⁿ", "Negative exponent: a⁻ⁿ = 1/aⁿ", "Fractional: a^(m/n) = ⁿ√(aᵐ)", "Zero exponent: a⁰ = 1"];
export const exponentRules: SciCalculator = (v) => {
  const a = num(v.a, 2), m = num(v.m, 3), n = num(v.n, 4), r = pick(v.rule, 6);
  const [exp, text] = [
    [m + n, `${fmt(a)}^${fmt(m)} · ${fmt(a)}^${fmt(n)} = ${fmt(a)}^${fmt(m + n)}`],
    [m - n, `${fmt(a)}^${fmt(m)} ÷ ${fmt(a)}^${fmt(n)} = ${fmt(a)}^${fmt(m - n)}`],
    [m * n, `(${fmt(a)}^${fmt(m)})^${fmt(n)} = ${fmt(a)}^${fmt(m * n)}`],
    [-n, `${fmt(a)}^−${fmt(n)} = 1 / ${fmt(a)}^${fmt(n)}`],
    [m / n, `${fmt(a)}^(${fmt(m)}/${fmt(n)}) = ${fmt(n)}th root of ${fmt(a)}^${fmt(m)}`],
    [0, `${fmt(a)}^0 = 1`],
  ][r] as [number, string];
  const val = a ** exp;
  if (!Number.isFinite(val) && !Number.isNaN(val)) return { value: "too large", exponent: sig(exp, 10), rule: text };
  if (Number.isNaN(val)) throw new InputError("A negative base needs a whole-number exponent.");
  return { value: sig(val, 12), exponent: sig(exp, 10), rule: text };
};

// ---------- Domain & range (numeric) ----------
export const domainRange: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"));
  const lo = num(v.lo, -100), hi = num(v.hi, 100);
  const n = 20000, step = (hi - lo) / n;
  const ys: number[] = [];
  const gaps: [number, number][] = [];
  let gapStart: number | null = null;
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    let y: number;
    try {
      y = f(x);
    } catch {
      y = NaN;
    }
    if (Number.isFinite(y)) {
      ys.push(y);
      if (gapStart !== null) {
        gaps.push([gapStart, x]);
        gapStart = null;
      }
    } else if (gapStart === null) gapStart = x;
  }
  if (gapStart !== null) gaps.push([gapStart, hi]);
  if (!ys.length) throw new InputError("The function isn't defined anywhere in that window.");
  const desc = gaps.length
    ? gaps.slice(0, 8).map(([a, b]) => (Math.abs(b - a) <= 2 * step ? `x ≈ ${fmt((a + b) / 2, 5)}` : `about ${fmt(a, 5)} to ${fmt(b, 5)}`)).join("; ")
    : "none — defined for every x in the window";
  const mn = Math.min(...ys), mx = Math.max(...ys);
  return { undefinedAt: desc, rangeMin: sig(mn, 10), rangeMax: sig(mx, 10), range: `[${fmt(mn, 6)}, ${fmt(mx, 6)}] within the window${mx > 1e6 || mn < -1e6 ? " (grows without bound near an asymptote)" : ""}` };
};

// ---------- Radicals ----------
export const RAD_OPS = ["Simplify ⁿ√a", "Rationalise a / √b", "Add c₁√a + c₂√b"];
const simpRad = (a: number, n: number): [number, number] => {
  let out = 1, inside = Math.round(a);
  for (let k = 2; k ** n <= inside; k++) while (inside % k ** n === 0) {
    out *= k;
    inside /= k ** n;
  }
  return [out, inside];
};
export const radical: SciCalculator = (v) => {
  const op = pick(v.op, 3), a = num(v.a, 72), b = num(v.b, 2), n = Math.max(2, Math.round(pos(v.n, 2))), c1 = num(v.c1, 1), c2 = num(v.c2, 1);
  const rt = n === 2 ? "√" : `${n}√`;
  if (op === 0) {
    if (a < 0 && n % 2 === 0) throw new InputError("Even roots of negative numbers aren't real.");
    const [o, i] = simpRad(Math.abs(a), n);
    const s = a < 0 ? -1 : 1;
    return { result: i === 1 ? fmt(s * o) : `${o * s === 1 ? "" : o * s === -1 ? "−" : fmt(o * s)}${rt}${i}`, decimal: sig(Math.sign(a) * Math.abs(a) ** (1 / n), 12), working: `${rt}${fmt(a)} = ${rt}(${o}^${n} × ${i}) = ${o * s}${rt}${i}` };
  }
  if (op === 1) {
    const [o, i] = simpRad(b, 2);
    // a/(o√i) = a√i/(o·i)
    const num_ = a, den = o * i;
    const g = (p: number, q: number): number => (q ? g(q, p % q) : Math.abs(p));
    const k = Number.isInteger(num_) ? g(num_, den) : 1;
    return { result: `${fmt(num_ / k) === "1" ? "" : fmt(num_ / k)}√${i}${den / k === 1 ? "" : ` / ${fmt(den / k)}`}`, decimal: sig(a / Math.sqrt(b), 12), working: `${fmt(a)}/√${fmt(b)} × √${fmt(b)}/√${fmt(b)} = ${fmt(a)}√${fmt(b)}/${fmt(b)}` };
  }
  const [o1, i1] = simpRad(a, 2), [o2, i2] = simpRad(b, 2);
  const val = c1 * Math.sqrt(a) + c2 * Math.sqrt(b);
  if (i1 === i2) return { result: `${fmt(c1 * o1 + c2 * o2)}√${i1}`, decimal: sig(val, 12), working: `${fmt(c1)}√${fmt(a)} + ${fmt(c2)}√${fmt(b)} = ${fmt(c1 * o1)}√${i1} + ${fmt(c2 * o2)}√${i2} — like radicals, add coefficients` };
  return { result: `${fmt(c1 * o1)}√${i1} + ${fmt(c2 * o2)}√${i2}`, decimal: sig(val, 12), working: "Unlike radicals — they can't be combined into one term." };
};

// ---------- Polynomial roots (all, complex) ----------
export const polynomialRoots: SciCalculator = (v) => {
  const c = polyCoeffs(txt(v, "p"));
  const rs = polyRoots(c);
  if (!rs.length) throw new InputError("Enter a polynomial of degree 1 or more.");
  const real = rs.filter(([, im]) => im === 0);
  return { roots: rs.map((r) => complexText([sig(r[0], 10), sig(r[1], 10)])).join(",  "), realCount: real.length, complexCount: rs.length - real.length, degree: c.length - 1, standard: polyText(c) };
};

// ---------- Piecewise function ----------
export const piecewise: SciCalculator = (v) => {
  const f1 = compileFn(txt(v, "f1")), f2 = compileFn(txt(v, "f2")), f3s = txt(v, "f3");
  const f3 = f3s ? compileFn(f3s) : f2;
  const b1 = num(v.b1, 0), b2 = num(v.b2, 3), x = num(v.x, 1);
  const pickF = (t: number) => (t < b1 ? f1 : t < b2 || !f3s ? f2 : f3);
  const piece = (t: number) => (t < b1 ? 1 : t < b2 || !f3s ? 2 : 3);
  const L1 = f1(b1), R1 = f2(b1), L2 = f2(b2), R2 = f3(b2);
  return {
    value: sig(pickF(x)(x), 12), piece: piece(x),
    continuity: `at x = ${fmt(b1)}: left ${fmt(L1, 6)}, right ${fmt(R1, 6)} — ${Math.abs(L1 - R1) < 1e-9 ? "continuous" : "jump"}${f3s ? `; at x = ${fmt(b2)}: left ${fmt(L2, 6)}, right ${fmt(R2, 6)} — ${Math.abs(L2 - R2) < 1e-9 ? "continuous" : "jump"}` : ""}`,
    table: [-2, -1, 0, 1, 2, 3, 4, 5].map((k) => {
      const t = b1 + k * ((b2 - b1) / 3 || 1);
      return `x = ${fmt(t, 5).padStart(7)}  y = ${fmt(pickF(t)(t), 6)}  (piece ${piece(t)})`;
    }).join("\n"),
  };
};

// ---------- Logarithm properties ----------
export const LOG_MODE = ["Expand log_b(xᵖ · yᵠ / zʳ)", "Condense p·log x + q·log y − r·log z"];
export const logProperties: SciCalculator = (v) => {
  const b = num(v.base, 10), x = pos(v.x, 8), y = pos(v.y, 5), z = pos(v.z, 2), p = num(v.p, 2), q = num(v.q, 1), r = num(v.r, 3);
  if (!(b > 0) || b === 1 || !(x > 0) || !(y > 0) || !(z > 0)) throw new InputError("Base must be positive and not 1, and x, y, z must be positive.");
  const L = (t: number) => Math.log(t) / Math.log(b);
  const bt = b === 10 ? "log" : b === Math.E ? "ln" : `log_${fmt(b)}`;
  const value = p * L(x) + q * L(y) - r * L(z);
  return { value: sig(value, 12), expanded: `${fmt(p)}·${bt}(${fmt(x)}) + ${fmt(q)}·${bt}(${fmt(y)}) − ${fmt(r)}·${bt}(${fmt(z)})`, condensed: `${bt}( ${fmt(x)}^${fmt(p)} · ${fmt(y)}^${fmt(q)} / ${fmt(z)}^${fmt(r)} )`, check: `argument = ${fmt((x ** p * y ** q) / z ** r, 10)}` };
};

// ---------- Upper & lower bounds ----------
export const ROUND_UNITS = ["Nearest 1,000", "Nearest 100", "Nearest 10", "Nearest 1", "1 decimal place", "2 decimal places", "3 decimal places", "1 significant figure", "2 significant figures", "3 significant figures"];
export const bounds: SciCalculator = (v) => {
  const x = num(v.x, 7.4), u = pick(v.unit, 10);
  let half: number;
  if (u <= 6) half = 0.5 * [1000, 100, 10, 1, 0.1, 0.01, 0.001][u];
  else {
    const s = u - 6, e = Math.floor(Math.log10(Math.abs(x) || 1));
    half = 0.5 * 10 ** (e - s + 1);
  }
  return { lower: sig(x - half, 12), upper: sig(x + half, 12), interval: `${fmt(x - half, 10)} ≤ x < ${fmt(x + half, 10)}`, maxError: sig(half, 10) };
};

// ---------- Absolute value equation |ax + b| = c ----------
export const absEquation: SciCalculator = (v) => {
  const a = num(v.a, 2), b = num(v.b, -3), c = num(v.c, 7);
  if (a === 0) throw new InputError("a can't be 0.");
  if (c < 0) return { solutions: "no solution (an absolute value can't be negative)", x1: 0, x2: 0 };
  const x1 = (c - b) / a, x2 = (-c - b) / a;
  return { solutions: c === 0 ? `x = ${fmt(x1, 10)}` : `x = ${fmt(Math.max(x1, x2), 10)} or x = ${fmt(Math.min(x1, x2), 10)}`, x1: sig(Math.max(x1, x2), 12), x2: sig(Math.min(x1, x2), 12) };
};

// ---------- Even / odd function ----------
export const PARITY = ["Even — f(−x) = f(x), symmetric about the y-axis", "Odd — f(−x) = −f(x), symmetric about the origin", "Neither even nor odd", "Both (f(x) = 0)"];
export const evenOdd: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"));
  const xs = [0.37, 0.9, 1.3, 2.1, 3.7, 5.2, 8.9];
  let even = true, odd = true, zero = true;
  for (const x of xs) {
    const a = f(x), b = f(-x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const tol = 1e-9 * Math.max(1, Math.abs(a));
    if (Math.abs(a - b) > tol) even = false;
    if (Math.abs(a + b) > tol) odd = false;
    if (Math.abs(a) > tol) zero = false;
  }
  const t = zero ? 3 : even ? 0 : odd ? 1 : 2;
  return { parity: t, sample: `f(2) = ${fmt(f(2), 8)}, f(−2) = ${fmt(f(-2), 8)}` };
};

// ---------- Percentage change ----------
export const percentChange: SciCalculator = (v) => {
  const a = num(v.old, 80), b = num(v.new, 100);
  if (a === 0) throw new InputError("The original value can't be 0.");
  const ch = ((b - a) / Math.abs(a)) * 100;
  return { change: sig(ch, 10), difference: sig(b - a, 12), multiplier: sig(b / a, 10), direction: ch >= 0 ? 0 : 1, formula: `(${fmt(b)} − ${fmt(a)}) ÷ |${fmt(a)}| × 100 = ${fmt(ch, 8)}%` };
};
export const DIRECTION = ["Increase", "Decrease"];

// ---------- Jacobi / Gauss-Seidel ----------
export const ITER_METHOD = ["Gauss-Seidel", "Jacobi"];
export const gaussSeidel: SciCalculator = (v) => {
  const m = matrixOf(txt(v, "aug"));
  const n = m.length;
  if (m[0].length !== n + 1) throw new InputError("Enter an augmented matrix [A | b].");
  const method = pick(v.method, 2), maxIt = Math.min(500, Math.max(1, Math.round(pos(v.iter, 50)))), tol = pos(v.tol, 1e-8) || 1e-8;
  const dd_ = m.every((r, i) => Math.abs(r[i]) >= r.slice(0, n).reduce((s, x, j) => s + (j === i ? 0 : Math.abs(x)), 0));
  if (m.some((r, i) => r[i] === 0)) throw new InputError("A diagonal entry is 0 — reorder the equations.");
  let x = new Array(n).fill(0);
  const rows: string[] = [];
  let it = 0, err = Infinity;
  for (; it < maxIt && err > tol; it++) {
    const nx = x.slice();
    for (let i = 0; i < n; i++) {
      let s = m[i][n];
      for (let j = 0; j < n; j++) if (j !== i) s -= m[i][j] * (method === 0 ? nx[j] : x[j]);
      nx[i] = s / m[i][i];
    }
    err = Math.max(...nx.map((xi, i) => Math.abs(xi - x[i])));
    x = nx;
    if (it < 15) rows.push(`${String(it + 1).padStart(2)}: ${x.map((xi) => fmt(xi, 8)).join(", ")}`);
  }
  if (!x.every(Number.isFinite)) throw new InputError("The iteration diverged — make the matrix diagonally dominant.");
  return { solution: x.map((xi, i) => `x${i + 1} = ${fmt(xi, 10)}`).join(",  "), iterations: it, converged: err <= tol ? 0 : 1, dominant: dd_ ? 0 : 1, table: rows.join("\n") };
};
export const CONVERGED = ["Converged", "Not converged within the iteration limit"];
export const DOMINANT = ["Yes — diagonally dominant (convergence guaranteed)", "No — may not converge"];

// ---------- Bisection & secant ----------
export const bisection: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"));
  let a = num(v.a, 1), b = num(v.b, 2);
  const tol = pos(v.tol, 1e-8) || 1e-8;
  let fa = f(a), fb = f(b);
  if (fa * fb > 0) throw new InputError("f(a) and f(b) must have opposite signs.");
  const rows: string[] = [];
  let i = 0, m = a;
  for (; i < 200 && (b - a) / 2 > tol; i++) {
    m = (a + b) / 2;
    const fm = f(m);
    if (i < 20) rows.push(`${String(i + 1).padStart(2)}: [${fmt(a, 8)}, ${fmt(b, 8)}]  mid = ${fmt(m, 10)}  f = ${fmt(fm, 5)}`);
    if (fm === 0) break;
    if (fa * fm < 0) {
      b = m;
      fb = fm;
    } else {
      a = m;
      fa = fm;
    }
  }
  m = (a + b) / 2;
  void fb;
  return { root: sig(m, 12), iterations: i, error: sig((b - a) / 2, 6), table: rows.join("\n") };
};
export const secant: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx"));
  let x0 = num(v.x0, 1), x1 = num(v.x1, 2);
  const tol = pos(v.tol, 1e-10) || 1e-10;
  const rows: string[] = [];
  let i = 0;
  for (; i < 100; i++) {
    const f0 = f(x0), f1 = f(x1);
    if (f1 === f0) break;
    const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
    if (i < 20) rows.push(`${String(i + 1).padStart(2)}: x = ${fmt(x2, 12)}  f = ${fmt(f(x2), 5)}`);
    x0 = x1;
    x1 = x2;
    if (Math.abs(x1 - x0) < tol) {
      i++;
      break;
    }
  }
  if (!Number.isFinite(x1)) throw new InputError("The method diverged — try starting values closer to the root.");
  return { root: sig(x1, 12), iterations: i, fRoot: sig(f(x1), 6), table: rows.join("\n") };
};

// ---------- Function transformations ----------
export const PARENTS = ["x²", "x³", "|x|", "√x", "1/x", "sin x", "eˣ", "ln x"];
const PARENT_EXPR = ["x^2", "x^3", "abs(x)", "sqrt(x)", "1/x", "sin(x)", "exp(x)", "ln(x)"];
export const transformation: SciCalculator = (v) => {
  const p = pick(v.parent, 8), a = num(v.a, 2), b = num(v.b, 1) || 1, h = num(v.h, 3), k = num(v.k, -1), x = num(v.x, 4);
  const inner = `${b === 1 ? "" : fmt(b) + "·"}(x ${h < 0 ? "+" : "−"} ${fmt(Math.abs(h))})`;
  const g = compileFn(`${a}*(${PARENT_EXPR[p].replace(/(?<![A-Za-z_])x(?![A-Za-z_])/g, `(${b}*(x-(${h})))`)}) + (${k})`);
  const desc: string[] = [];
  if (a < 0) desc.push("reflect over the x-axis");
  if (Math.abs(a) !== 1) desc.push(`vertical ${Math.abs(a) > 1 ? "stretch" : "compression"} by ${fmt(Math.abs(a))}`);
  if (b < 0) desc.push("reflect over the y-axis");
  if (Math.abs(b) !== 1) desc.push(`horizontal ${Math.abs(b) > 1 ? "compression" : "stretch"} by 1/${fmt(Math.abs(b))}`);
  if (h) desc.push(`shift ${h > 0 ? "right" : "left"} ${fmt(Math.abs(h))}`);
  if (k) desc.push(`shift ${k > 0 ? "up" : "down"} ${fmt(Math.abs(k))}`);
  return { equation: `g(x) = ${fmt(a)}·f(${inner}) ${k < 0 ? "−" : "+"} ${fmt(Math.abs(k))}, f(x) = ${PARENTS[p]}`, steps: desc.join("; ") || "no change", valueAt: sig(g(x), 12), keyPoint: `parent point (0, f(0)) moves to (${fmt(h)}, ${fmt(a * (Number.isFinite(compileFn(PARENT_EXPR[p])(0)) ? compileFn(PARENT_EXPR[p])(0) : NaN) + k)})` };
};

// ---------- Log & exponential equations ----------
export const logEquation: SciCalculator = (v) => {
  const b = num(v.base, 2), a = num(v.a, 3), c = num(v.c, -1), d = num(v.d, 3);
  if (!(b > 0) || b === 1 || a === 0) throw new InputError("Base must be positive and not 1; a can't be 0.");
  const x = (b ** d - c) / a;
  return { x: sig(x, 12), working: `log_${fmt(b)}(${fmt(a)}x ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))}) = ${fmt(d)}  →  ${fmt(a)}x ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c))} = ${fmt(b)}^${fmt(d)} = ${fmt(b ** d)}  →  x = ${fmt(x, 10)}`, valid: a * x + c > 0 ? 0 : 1 };
};
export const VALID = ["Valid — the log's argument is positive", "Extraneous — the argument isn't positive"];
export const expEquation: SciCalculator = (v) => {
  const a = num(v.a, 5), b = num(v.base, 2), c = num(v.c, 1), d = num(v.d, 80), k = num(v.k, 0);
  const rhs = (d - k) / a;
  if (!(rhs > 0) || !(b > 0) || b === 1 || c === 0) throw new InputError("Need (d − k)/a > 0, a positive base ≠ 1 and c ≠ 0.");
  const x = Math.log(rhs) / (c * Math.log(b));
  return { x: sig(x, 12), working: `${fmt(a)}·${fmt(b)}^(${fmt(c)}x) ${k < 0 ? "−" : "+"} ${fmt(Math.abs(k))} = ${fmt(d)} → ${fmt(b)}^(${fmt(c)}x) = ${fmt(rhs, 10)} → x = ln(${fmt(rhs, 8)}) / (${fmt(c)}·ln ${fmt(b)}) = ${fmt(x, 10)}` };
};

// ---------- Factored ↔ standard form (quadratics) ----------
export const FACTOR_DIR = ["Factored → standard", "Standard → factored"];
export const factoredForm: SciCalculator = (v) => {
  const dir = pick(v.dir, 2), a = num(v.a, 2);
  if (dir === 0) {
    const r1 = num(v.r1, 1), r2 = num(v.r2, -3);
    const B = -a * (r1 + r2), C = a * r1 * r2;
    return { result: polyText([C, B, a]), roots: `${fmt(r1)}, ${fmt(r2)}`, vertex: `(${fmt((r1 + r2) / 2)}, ${fmt(-a * ((r1 - r2) / 2) ** 2)})` };
  }
  const b = num(v.b, 4), c = num(v.c, -6);
  if (a === 0) throw new InputError("a can't be 0.");
  const D = b * b - 4 * a * c;
  if (D < 0) return { result: "doesn't factor over the reals (negative discriminant)", roots: "complex", vertex: `(${fmt(-b / (2 * a))}, ${fmt(c - (b * b) / (4 * a))})` };
  const r1 = (-b + Math.sqrt(D)) / (2 * a), r2 = (-b - Math.sqrt(D)) / (2 * a);
  const term = (r: number) => (r === 0 ? "x" : `(x ${r > 0 ? "−" : "+"} ${fmt(Math.abs(r), 8)})`);
  return { result: `${a === 1 ? "" : fmt(a)}${term(r1)}${term(r2)}`, roots: `${fmt(r1, 10)}, ${fmt(r2, 10)}`, vertex: `(${fmt(-b / (2 * a))}, ${fmt(c - (b * b) / (4 * a))})` };
};

// ---------- Parallel / perpendicular ----------
export const LINE_REL = ["Parallel", "Perpendicular", "Neither", "Same line (coincident)"];
export const parallelPerpendicular: SciCalculator = (v) => {
  const a1 = num(v.a1, 2), b1 = num(v.b1, -1), c1 = num(v.c1, 3), a2 = num(v.a2, 1), b2 = num(v.b2, 2), c2 = num(v.c2, 4);
  const det = a1 * b2 - a2 * b1;
  const slope = (a: number, b: number) => (b === 0 ? "undefined" : fmt(-a / b, 8));
  let rel = 2;
  if (Math.abs(det) < 1e-12) rel = Math.abs(a1 * c2 - a2 * c1) < 1e-12 && Math.abs(b1 * c2 - b2 * c1) < 1e-12 ? 3 : 0;
  else if (Math.abs(a1 * a2 + b1 * b2) < 1e-12) rel = 1;
  const inter = Math.abs(det) < 1e-12 ? "none" : `(${fmt((c1 * b2 - c2 * b1) / det, 10)}, ${fmt((a1 * c2 - a2 * c1) / det, 10)})`;
  return { relation: rel, slopes: `m₁ = ${slope(a1, b1)}, m₂ = ${slope(a2, b2)}`, intersection: inter };
};

// ---------- Table → equation ----------
export const TABLE_MODEL = ["Linear (constant first differences)", "Quadratic (constant second differences)", "Exponential (constant ratio)", "No simple pattern found"];
export const functionTable: SciCalculator = (v) => {
  const xs = listOf(v, "xs", 3), ys = listOf(v, "ys", 3);
  if (xs.length !== ys.length) throw new InputError("Enter the same number of x and y values.");
  const n = xs.length;
  const eq = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  const evenX = xs.every((x, i) => i === 0 || eq(x - xs[i - 1], xs[1] - xs[0]));
  const m = (ys[1] - ys[0]) / (xs[1] - xs[0]);
  if (xs.every((x, i) => eq(ys[i], ys[0] + m * (x - xs[0])))) return { model: 0, equation: `y = ${fmt(m, 10)}x ${ys[0] - m * xs[0] < 0 ? "−" : "+"} ${fmt(Math.abs(ys[0] - m * xs[0]), 10)}`, next: evenX ? sig(ys[n - 1] + (ys[1] - ys[0]), 10) : "—" };
  // quadratic through first 3 points, check rest
  const [x0, x1, x2] = xs, [y0, y1, y2] = ys;
  const den = (x0 - x1) * (x0 - x2) * (x1 - x2);
  const A = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / den;
  const B = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / den;
  const C = (x1 * x2 * (x1 - x2) * y0 + x2 * x0 * (x2 - x0) * y1 + x0 * x1 * (x0 - x1) * y2) / den;
  if (n >= 4 ? xs.every((x, i) => eq(ys[i], A * x * x + B * x + C)) : true) return { model: 1, equation: `y = ${polyText([C, B, A].map((c) => sig(c, 10)))}`, next: evenX ? sig(A * (xs[n - 1] + xs[1] - xs[0]) ** 2 + B * (xs[n - 1] + xs[1] - xs[0]) + C, 10) : "—" };
  if (ys.every((y) => y > 0) && evenX) {
    const r = ys[1] / ys[0];
    if (ys.every((y, i) => i === 0 || eq(y / ys[i - 1], r))) {
      const bb = r ** (1 / (xs[1] - xs[0])), aa = ys[0] / bb ** xs[0];
      return { model: 2, equation: `y = ${fmt(aa, 10)} · ${fmt(bb, 10)}^x`, next: sig(ys[n - 1] * r, 10) };
    }
  }
  return { model: 3, equation: "try the Lagrange Interpolation or Regression calculators", next: "—" };
};

// ---------- Sequences ----------
export const SEQ = ["Geometric (×r)", "Arithmetic (+d)"];
export const sequence: SciCalculator = (v) => {
  const t = pick(v.type, 2), a1 = num(v.a1, 3), r = num(v.r, 2), n = Math.max(1, Math.round(pos(v.n, 10)));
  if (t === 1) {
    const an = a1 + (n - 1) * r;
    return { nth: sig(an, 12), sum: sig((n * (a1 + an)) / 2, 12), formula: `aₙ = ${fmt(a1)} + (n − 1)·${fmt(r)}`, first: Array.from({ length: Math.min(n, 8) }, (_, i) => fmt(a1 + i * r)).join(", "), infinite: "diverges (arithmetic)" };
  }
  const an = a1 * r ** (n - 1);
  const sum = r === 1 ? a1 * n : (a1 * (1 - r ** n)) / (1 - r);
  return { nth: sig(an, 12), sum: sig(sum, 12), formula: `aₙ = ${fmt(a1)} · ${fmt(r)}^(n − 1)`, first: Array.from({ length: Math.min(n, 8) }, (_, i) => fmt(a1 * r ** i, 8)).join(", "), infinite: Math.abs(r) < 1 ? fmt(a1 / (1 - r), 10) : "diverges (|r| ≥ 1)" };
};

// ---------- Parametric: eliminate the parameter ----------
export const parametric: SciCalculator = (v) => {
  const a = num(v.a, 2), b = num(v.b, 1), ys = txt(v, "yt");
  if (a === 0) throw new InputError("x(t) must depend on t (a ≠ 0).");
  const tExpr = `((x - (${b})) / (${a}))`;
  const yx = ys.replace(/(?<![A-Za-z_])t(?![A-Za-z_])/g, tExpr);
  let simp: string;
  try {
    simp = polyText(polyCoeffs(yx).map((c) => sig(c, 10)));
  } catch {
    simp = simplifyText(yx).replace(/ \^ /g, "^");
  }
  const f = compileFn(ys, ["t"]);
  return { equation: `y = ${simp}`, tInTermsOfX: `t = (x − ${fmt(b)}) / ${fmt(a)}`, sample: `t = 1 → (x, y) = (${fmt(a + b)}, ${fmt(f(1), 8)})` };
};

// ---------- Lagrange interpolation ----------
export const lagrange: SciCalculator = (v) => {
  const xs = listOf(v, "xs", 2), ys = listOf(v, "ys", 2), x = num(v.x, 2.5);
  if (xs.length !== ys.length) throw new InputError("Enter the same number of x and y values.");
  if (new Set(xs).size !== xs.length) throw new InputError("x values must all be different.");
  if (xs.length > 12) throw new InputError("Up to 12 points.");
  let poly = [0];
  const mul = (p: number[], q: number[]) => {
    const r = new Array(p.length + q.length - 1).fill(0);
    p.forEach((a, i) => q.forEach((b, j) => (r[i + j] += a * b)));
    return r;
  };
  xs.forEach((xi, i) => {
    let basis = [1], den = 1;
    xs.forEach((xj, j) => {
      if (j === i) return;
      basis = mul(basis, [-xj, 1]);
      den *= xi - xj;
    });
    poly = Array.from({ length: Math.max(poly.length, basis.length) }, (_, k) => (poly[k] ?? 0) + ((basis[k] ?? 0) * ys[i]) / den);
  });
  const val = poly.reduceRight((acc, c) => acc * x + c, 0);
  return { value: sig(val, 12), polynomial: polyText(poly.map((c) => sig(c, 10))), degree: xs.length - 1 };
};

// ---------- Partial quotients division ----------
export const partialQuotients: SciCalculator = (v) => {
  let n = Math.round(pos(v.dividend, 1764));
  const d = Math.round(pos(v.divisor, 12));
  if (!d) throw new InputError("The divisor can't be 0.");
  const steps: string[] = [];
  let q = 0;
  while (n >= d) {
    let chunk = 1;
    while (d * chunk * 10 <= n) chunk *= 10;
    const k = Math.floor(n / (d * chunk)) * chunk;
    steps.push(`${n} − ${d} × ${k} = ${n - d * k}   (partial quotient ${k})`);
    n -= d * k;
    q += k;
  }
  return { quotient: q, remainder: n, steps: steps.join("\n") || "dividend is smaller than divisor", check: `${d} × ${q} + ${n} = ${d * q + n}` };
};

export const sciAlg2CustomCalculators: Record<string, SciCalculator> = {
  "exponent-rules-calculator": exponentRules,
  "domain-and-range-calculator": domainRange,
  "radical-equation-calculator": radical,
  "polynomial-roots-calculator": polynomialRoots,
  "piecewise-function-calculator": piecewise,
  "log-properties-calculator": logProperties,
  "upper-lower-bounds-calculator": bounds,
  "absolute-value-equation-calculator": absEquation,
  "even-odd-function-calculator": evenOdd,
  "percentage-change-calculator": percentChange,
  "gauss-seidel-calculator": gaussSeidel,
  "bisection-method-calculator": bisection,
  "function-transformation-calculator": transformation,
  "logarithmic-equation-calculator": logEquation,
  "exponential-equation-calculator": expEquation,
  "factored-form-calculator": factoredForm,
  "parallel-perpendicular-calculator": parallelPerpendicular,
  "function-table-calculator": functionTable,
  "geometric-sequence-calculator": sequence,
  "secant-method-calculator": secant,
  "parametric-equation-calculator": parametric,
  "lagrange-interpolation-calculator": lagrange,
  "partial-quotients-calculator": partialQuotients,
};

