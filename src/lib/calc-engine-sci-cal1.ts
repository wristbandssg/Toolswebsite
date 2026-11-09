/**
 * Batch: "Science Calculators" → Math Calculators (calculus, part 1 — 30 tools).
 *
 * Symbolic derivatives come from mathjs (derivative + simplify). Everything else is numeric:
 * limits by evaluating closer and closer to the point and checking agreement; definite integrals
 * by adaptive Simpson (1-D) and 16-point Gauss-Legendre per dimension (double / triple);
 * antiderivatives term by term for polynomial, exponential, sin/cos and 1/x terms; Laplace
 * transforms from the standard table (and ∫₀^∞ e^(−st) f(t) dt numerically for any f); inverse
 * Laplace from the table or by the Gaver-Stehfest algorithm (N = 14) for any F(s); Taylor
 * coefficients from repeated symbolic derivatives; partial fractions by solving for the unknown
 * numerators at sample points; Euler / RK4 for ODEs; Lagrange multipliers by Newton's method on
 * ∇f = λ∇g, g = c from several starting points. See prisma/create-sci-cal1-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, compileFn, integrate, numDeriv, roots, derivText, derivTextVars, polyCoeffs, polyText, polyRoots, listOf, parseSafe } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const tidy = (e: string) => e.replace(/ \^ /g, "^").replace(/\s*\*\s*/g, "·");
const sd = (expr: string, v = "x", order = 1) => {
  try {
    return tidy(derivText(expr, v, order));
  } catch {
    return "—";
  }
};

// ---------- Derivative ----------
export const derivative: SciCalculator = (v) => {
  const e = txt(v, "fx"), n = Math.min(3, Math.max(1, Math.round(pos(v.order, 1)))), x0 = num(v.x0, 1);
  const f = compileFn(e);
  let val: number;
  try {
    val = compileFn(derivText(e, "x", n))(x0);
  } catch {
    val = numDeriv(f, x0, n);
  }
  return { derivative: sd(e, "x", n), valueAt: s(val, 12), fAt: s(f(x0), 12), note: n === 1 ? "Rules used as needed: power, product, quotient and chain rules." : `${n === 2 ? "Second" : "Third"} derivative.` };
};

// ---------- Limit ----------
export const LIMIT_DIR = ["Two-sided", "From the left (x → a⁻)", "From the right (x → a⁺)", "x → +∞", "x → −∞"];
function limitOf(f: (x: number) => number, a: number, dir: number): { value: number | null; left?: number; right?: number; note: string } {
  const safe = (x: number) => {
    try {
      const y = f(x);
      return Number.isFinite(y) ? y : y === Infinity ? 1e300 : y === -Infinity ? -1e300 : NaN;
    } catch {
      return NaN;
    }
  };
  const seq = (g: (k: number) => number) => [3, 4, 5, 6, 7, 8].map((k) => safe(g(k)));
  const settle = (ys: number[]) => {
    const fin = ys.filter(Number.isFinite);
    if (fin.length < 3) return null;
    const last = fin[fin.length - 1], prev = fin[fin.length - 2];
    if (Math.abs(last) > 1e12 && Math.abs(last) > Math.abs(prev)) return last > 0 ? Infinity : -Infinity;
    if (Math.abs(last - prev) <= 1e-5 * Math.max(1, Math.abs(last))) return Math.abs(last - Math.round(last)) < 1e-6 ? Math.round(last) : last;
    return null;
  };
  if (dir === 3) return { value: settle(seq((k) => 10 ** k)), note: "Evaluated at x = 10³ … 10⁸." };
  if (dir === 4) return { value: settle(seq((k) => -(10 ** k))), note: "Evaluated at x = −10³ … −10⁸." };
  const scale = Math.max(1, Math.abs(a));
  const L = settle(seq((k) => a - scale * 10 ** -k)), Rr = settle(seq((k) => a + scale * 10 ** -k));
  if (dir === 1) return { value: L, note: "Approached from the left." };
  if (dir === 2) return { value: Rr, note: "Approached from the right." };
  if (L !== null && Rr !== null && (L === Rr || Math.abs(L - Rr) <= 1e-5 * Math.max(1, Math.abs(L)))) return { value: L, left: L, right: Rr, note: "Left and right limits agree." };
  return { value: null, left: L ?? NaN, right: Rr ?? NaN, note: "The one-sided limits differ or don't settle, so the two-sided limit does not exist." };
}
const limText = (x: number | null) => (x === null ? "does not exist" : x === Infinity ? "∞" : x === -Infinity ? "−∞" : fmt(x, 10));
export const limit: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), dir = pick(v.dir, 5);
  const r = limitOf(f, a, dir);
  let direct = "";
  try {
    const y = f(a);
    direct = Number.isFinite(y) ? fmt(y, 10) : "undefined (∞ or 0/0)";
  } catch {
    direct = "undefined";
  }
  return { limit: limText(r.value), left: r.left === undefined ? "—" : limText(Number.isNaN(r.left) ? null : r.left), right: r.right === undefined ? "—" : limText(Number.isNaN(r.right) ? null : r.right), direct: dir >= 3 ? "—" : direct, note: r.note };
};

// ---------- Integral (definite + term-by-term antiderivative) ----------
type Node = ReturnType<typeof parseSafe>;
function antiderivative(expr: string): string | null {
  try {
    const c = polyCoeffs(expr);
    return polyText([0, ...c.map((a, i) => a / (i + 1))]);
  } catch {
    /* not a polynomial */
  }
  const node = parseSafe(expr, ["x"]);
  const terms: { sign: number; node: Node }[] = [];
  const collect = (n: Node, sign: number) => {
    const op = n as unknown as { type: string; op?: string; args?: Node[]; content?: Node; fn?: string };
    if (op.type === "ParenthesisNode" && op.content) return collect(op.content, sign);
    if (op.type === "OperatorNode" && op.op === "+" && op.args?.length === 2) {
      collect(op.args[0], sign);
      collect(op.args[1], sign);
    } else if (op.type === "OperatorNode" && op.op === "-" && op.args?.length === 2) {
      collect(op.args[0], sign);
      collect(op.args[1], -sign);
    } else if (op.type === "OperatorNode" && op.op === "-" && op.args?.length === 1) collect(op.args[0], -sign);
    else terms.push({ sign, node: n });
  };
  collect(node, 1);
  const out: string[] = [];
  for (const { sign, node: t } of terms) {
    const str = t.toString({ implicit: "show" });
    // coefficient * core
    let coef = 1, core = str;
    const m = str.match(/^([0-9.]+)\s*\*?\s*(.+)$/);
    if (m && !/^[0-9.]+$/.test(str)) {
      coef = Number(m[1]);
      core = m[2].trim();
    }
    const k = sign * coef;
    const cs = (x: number) => (Math.abs(x - 1) < 1e-12 ? "" : Math.abs(x + 1) < 1e-12 ? "-" : fmt(x, 8) + "·");
    let r: string | null = null;
    let mm: RegExpMatchArray | null;
    if (/^[0-9.]+$/.test(str)) r = `${fmt(sign * Number(str), 8)}x`;
    else if ((mm = str.match(/^([0-9.]+)\s*\/\s*x$/))) r = `${cs(sign * Number(mm[1]))}ln|x|`;
    else if ((mm = core.match(/^(sin|cos|exp)\(\s*(?:([0-9.]+)\s*\*?\s*)?x\s*\)$/))) {
      const a = mm[2] ? Number(mm[2]) : 1;
      r = mm[1] === "sin" ? `${cs(-k / a)}cos(${a === 1 ? "" : fmt(a)}x)` : mm[1] === "cos" ? `${cs(k / a)}sin(${a === 1 ? "" : fmt(a)}x)` : `${cs(k / a)}e^(${a === 1 ? "" : fmt(a)}x)`;
    } else if ((mm = core.match(/^e\s*\^\s*\(?\s*(?:([0-9.]+)\s*\*?\s*)?x\s*\)?$/))) {
      const a = mm[1] ? Number(mm[1]) : 1;
      r = `${cs(k / a)}e^(${a === 1 ? "" : fmt(a)}x)`;
    } else if (/^1\s*\/\s*x$/.test(core) || core === "x ^ -1") r = `${cs(k)}ln|x|`;
    else if ((mm = core.match(/^x\s*\^\s*\(?(-?[0-9.]+)\)?$/))) {
      const p = Number(mm[1]);
      r = p === -1 ? `${cs(k)}ln|x|` : `${cs(k / (p + 1))}x^${fmt(p + 1)}`;
    } else if (core === "x") r = `${cs(k / 2)}x^2`;
    else if ((mm = core.match(/^sqrt\(x\)$/))) r = `${cs((2 * k) / 3)}x^1.5`;
    else return null;
    out.push(r);
  }
  return out.join(" + ").replace(/\+ -/g, "- ") || null;
}
export const integral: SciCalculator = (v) => {
  const e = txt(v, "fx"), a = num(v.a, 0), b = num(v.b, 2);
  const f = compileFn(e);
  const val = integrate(f, a, b);
  const F = antiderivative(e);
  return { definite: s(val, 12), antiderivative: F ? `${tidy(F)} + C` : "no elementary form found by this tool — the definite value is still exact to ~10 digits", average: b !== a ? s(val / (b - a), 10) : "—" };
};

// ---------- Multiple integrals (Gauss-Legendre 16) ----------
const GL_X = [0.0950125098376374, 0.2816035507792589, 0.4580167776572274, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499];
const GL_W = [0.1894506104550685, 0.1826034150449236, 0.1691565193950025, 0.1495959888165767, 0.1246289712555339, 0.0951585116824928, 0.0622535239386479, 0.0271524594117541];
const gl = (f: (x: number) => number, a: number, b: number) => {
  const m = (a + b) / 2, h = (b - a) / 2;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += GL_W[i] * (f(m + h * GL_X[i]) + f(m - h * GL_X[i]));
  return sum * h;
};
const glComposite = (f: (x: number) => number, a: number, b: number, panels = 4) => {
  let t = 0;
  for (let i = 0; i < panels; i++) t += gl(f, a + ((b - a) * i) / panels, a + ((b - a) * (i + 1)) / panels);
  return t;
};
export const doubleIntegral: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]);
  const a = num(v.a, 0), b = num(v.b, 1);
  const g1 = compileFn(txt(v, "ylo") || "0", ["x"]), g2 = compileFn(txt(v, "yhi") || "1", ["x"]);
  const val = glComposite((x) => glComposite((y) => f(x, y), g1(x), g2(x), 3), a, b, 3);
  const area = glComposite((x) => g2(x) - g1(x), a, b, 3);
  return { value: s(val, 10), region: s(area, 10), average: area ? s(val / area, 10) : "—" };
};
export const tripleIntegral: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxyz"), ["x", "y", "z"]);
  const x0 = num(v.x0, 0), x1 = num(v.x1, 1);
  const y0 = compileFn(txt(v, "y0") || "0", ["x"]), y1 = compileFn(txt(v, "y1") || "1", ["x"]);
  const z0 = compileFn(txt(v, "z0") || "0", ["x", "y"]), z1 = compileFn(txt(v, "z1") || "1", ["x", "y"]);
  const val = gl((x) => gl((y) => gl((z) => f(x, y, z), z0(x, y), z1(x, y)), y0(x), y1(x)), x0, x1);
  const vol = gl((x) => gl((y) => z1(x, y) - z0(x, y), y0(x), y1(x)), x0, x1);
  return { value: s(val, 10), volume: s(vol, 10) };
};

// ---------- Laplace transforms ----------
export const LAPLACE_FORMS = ["1 (unit step)", "tⁿ", "e^(at)", "sin(bt)", "cos(bt)", "e^(at)·sin(bt)", "e^(at)·cos(bt)", "tⁿ·e^(at)", "sinh(bt)", "cosh(bt)", "Custom f(t) (numeric)"];
const fact = (n: number) => {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
};
export const laplace: SciCalculator = (v) => {
  const form = pick(v.form, 11), a = num(v.a, 2), b = num(v.b, 3), n = Math.max(0, Math.round(pos(v.n, 2))), sv = num(v.s, 5);
  const A = fmt(a), B = fmt(b);
  const table: [string, (S: number) => number, string][] = [
    ["1/s", (S) => 1 / S, "s > 0"],
    [`${fact(n)}/s^${n + 1}`, (S) => fact(n) / S ** (n + 1), "s > 0"],
    [`1/(s − ${A})`, (S) => 1 / (S - a), `s > ${A}`],
    [`${B}/(s² + ${fmt(b * b)})`, (S) => b / (S * S + b * b), "s > 0"],
    [`s/(s² + ${fmt(b * b)})`, (S) => S / (S * S + b * b), "s > 0"],
    [`${B}/((s − ${A})² + ${fmt(b * b)})`, (S) => b / ((S - a) ** 2 + b * b), `s > ${A}`],
    [`(s − ${A})/((s − ${A})² + ${fmt(b * b)})`, (S) => (S - a) / ((S - a) ** 2 + b * b), `s > ${A}`],
    [`${fact(n)}/(s − ${A})^${n + 1}`, (S) => fact(n) / (S - a) ** (n + 1), `s > ${A}`],
    [`${B}/(s² − ${fmt(b * b)})`, (S) => b / (S * S - b * b), `s > |${B}|`],
    [`s/(s² − ${fmt(b * b)})`, (S) => S / (S * S - b * b), `s > |${B}|`],
  ];
  if (form === 10) {
    const f = compileFn(txt(v, "ft") || "t", ["t"]);
    const T = Math.max(60 / Math.max(sv, 0.05), 50);
    const val = glComposite((t) => Math.exp(-sv * t) * f(t), 0, T, 200);
    return { transform: "numeric only", valueAt: s(val, 10), roc: "the integral must converge for this s" };
  }
  const [F, fn, roc] = table[form];
  return { transform: `F(s) = ${F}`, valueAt: s(fn(sv), 12), roc };
};
export const INV_LAPLACE_FORMS = ["1/s", "1/sⁿ", "1/(s − a)", "1/(s − a)ⁿ", "b/(s² + b²)", "s/(s² + b²)", "1/((s − a)(s − b))", "1/(s(s + a))", "Custom F(s) (numeric, Stehfest)"];
export const inverseLaplace: SciCalculator = (v) => {
  const form = pick(v.form, 9), a = num(v.a, 2), b = num(v.b, 3), n = Math.max(1, Math.round(pos(v.n, 2))), t = pos(v.t, 1);
  const A = fmt(a), B = fmt(b);
  const table: [string, (T: number) => number][] = [
    ["f(t) = 1", () => 1],
    [`f(t) = t^${n - 1}/${fact(n - 1)}`, (T) => T ** (n - 1) / fact(n - 1)],
    [`f(t) = e^(${A}t)`, (T) => Math.exp(a * T)],
    [`f(t) = t^${n - 1}·e^(${A}t)/${fact(n - 1)}`, (T) => (T ** (n - 1) * Math.exp(a * T)) / fact(n - 1)],
    [`f(t) = sin(${B}t)`, (T) => Math.sin(b * T)],
    [`f(t) = cos(${B}t)`, (T) => Math.cos(b * T)],
    [a === b ? `f(t) = t·e^(${A}t)` : `f(t) = (e^(${A}t) − e^(${B}t))/(${fmt(a - b)})`, (T) => (a === b ? T * Math.exp(a * T) : (Math.exp(a * T) - Math.exp(b * T)) / (a - b))],
    [`f(t) = (1 − e^(−${A}t))/${A}`, (T) => (1 - Math.exp(-a * T)) / a],
  ];
  if (form === 8) {
    const F = compileFn(txt(v, "fs") || "1/(s+1)", ["s"]);
    const N = 14, ln2 = Math.LN2;
    let sum = 0;
    for (let k = 1; k <= N; k++) {
      let vk = 0;
      for (let j = Math.floor((k + 1) / 2); j <= Math.min(k, N / 2); j++) vk += (j ** (N / 2) * fact(2 * j)) / (fact(N / 2 - j) * fact(j) * fact(j - 1) * fact(k - j) * fact(2 * j - k));
      vk *= (-1) ** (k + N / 2);
      sum += vk * F((k * ln2) / t);
    }
    return { inverse: "numeric (Gaver-Stehfest)", valueAt: s((ln2 / t) * sum, 8), note: "Accurate for smooth, non-oscillating f(t); oscillating functions need the table forms." };
  }
  const [txtF, fn] = table[form];
  return { inverse: txtF, valueAt: s(fn(t), 12), note: "From the standard Laplace transform table." };
};

// ---------- Series ----------
export const radiusConvergence: SciCalculator = (v) => {
  const c = compileFn(txt(v, "cn") || "1/n", ["n"]), a = num(v.a, 0);
  const ratios: number[] = [];
  for (const n of [50, 100, 200, 400, 800]) {
    const r = Math.abs(c(n) / c(n + 1));
    if (Number.isFinite(r)) ratios.push(r);
  }
  const roots_: number[] = [];
  for (const n of [50, 100, 200, 400]) {
    const r = Math.abs(c(n)) ** (-1 / n);
    if (Number.isFinite(r)) roots_.push(r);
  }
  let R = ratios.length ? ratios[ratios.length - 1] : roots_[roots_.length - 1];
  const growing = ratios.length >= 2 && ratios[ratios.length - 1] > ratios[0] * 1.5;
  if (growing || R > 1e9) R = Infinity;
  if (!Number.isFinite(R) && R !== Infinity) throw new InputError("Couldn't estimate the radius — check cₙ.");
  const nice = Math.abs(R - Math.round(R)) < 1e-3 ? Math.round(R) : R;
  return { radius: R === Infinity ? "∞ (converges for every x)" : fmt(nice, 8), interval: R === Infinity ? "(−∞, ∞)" : `(${fmt(a - nice, 8)}, ${fmt(a + nice, 8)}) — test the endpoints separately`, method: "Ratio test: R = lim |cₙ / cₙ₊₁|" };
};
export const taylor: SciCalculator = (v) => {
  const e = txt(v, "fx"), a = num(v.a, 0), n = Math.min(10, Math.max(1, Math.round(pos(v.n, 5)))), x = num(v.x, 0.5);
  const coeffs: number[] = [];
  let cur = e;
  for (let k = 0; k <= n; k++) {
    let val: number;
    try {
      val = compileFn(cur)(a);
    } catch {
      val = NaN;
    }
    coeffs.push(val / fact(k));
    if (k < n) cur = derivText(cur, "x", 1);
  }
  const shifted = a === 0 ? "x" : `(x ${a < 0 ? "+" : "−"} ${fmt(Math.abs(a))})`;
  const terms = coeffs.map((c, k) => (Math.abs(c) < 1e-14 ? "" : k === 0 ? fmt(c, 8) : `${fmt(c, 8)}·${shifted}${k > 1 ? `^${k}` : ""}`)).filter(Boolean);
  const approx = coeffs.reduce((acc, c, k) => acc + c * (x - a) ** k, 0);
  const actual = compileFn(e)(x);
  return { series: terms.join(" + ").replace(/\+ -/g, "− ") || "0", approx: s(approx, 12), actual: s(actual, 12), error: s(Math.abs(actual - approx), 6), kind: a === 0 ? 0 : 1 };
};
export const SERIES_KIND = ["Maclaurin series (centred at 0)", "Taylor series"];
export const VERDICT = ["Converges", "Diverges", "Inconclusive — check with another test"];
export const seriesConvergence: SciCalculator = (v) => {
  const f = compileFn(txt(v, "an"), ["n"]), start = Math.round(num(v.start, 1));
  const term = (n: number) => f(n);
  let S = 0;
  const partial: Record<number, number> = {};
  const marks = [10, 100, 1000, 10000, 100000];
  for (let n = start; n < start + 100000; n++) {
    S += term(n);
    const k = n - start + 1;
    if (marks.includes(k)) partial[k] = S;
  }
  const big = Math.abs(term(1e6)), big2 = Math.abs(term(2e6));
  const ratio = Math.abs(term(10001) / term(10000));
  const root = Math.abs(term(10000)) ** (1 / 10000);
  let verdict = 2;
  let reason = "";
  if (big > 1e-3 && big2 > 1e-3 * 0.5) {
    verdict = 1;
    reason = "nth-term test: the terms don't go to 0.";
  } else if (ratio < 0.999) {
    verdict = 0;
    reason = `ratio test: |aₙ₊₁/aₙ| → ${fmt(ratio, 6)} < 1.`;
  } else if (root < 0.999) {
    verdict = 0;
    reason = `root test: |aₙ|^(1/n) → ${fmt(root, 6)} < 1.`;
  } else {
    // p-series-like check: aₙ ~ C/n^p
    const p = -Math.log(Math.abs(term(20000) / term(10000))) / Math.log(2);
    const alternating = Math.sign(term(10000)) !== Math.sign(term(10001));
    if (alternating) {
      verdict = 0;
      reason = "alternating series test: terms alternate in sign and decrease to 0.";
    } else if (Number.isFinite(p)) {
      const inc1 = (partial[100000] ?? 0) - (partial[10000] ?? 0), inc0 = (partial[10000] ?? 0) - (partial[1000] ?? 0);
      verdict = p > 1.05 ? 0 : p < 0.95 ? 1 : inc0 && inc1 / inc0 > 0.8 ? 1 : 2;
      reason = `comparison with a p-series: aₙ behaves like 1/n^${fmt(p, 4)}${Math.abs(p - 1) <= 0.05 ? (verdict === 1 ? " — like the harmonic series, the partial sums keep growing" : " (p ≈ 1 — borderline)") : ""}.`;
    }
  }
  return { verdict, reason, partialSums: marks.map((m) => `S(${m}) = ${fmt(partial[m] ?? NaN, 10)}`).join("\n"), estimate: verdict === 0 ? s(partial[100000], 10) : "—" };
};

// ---------- Partial fractions ----------
export const partialFractions: SciCalculator = (v) => {
  const N = polyCoeffs(txt(v, "num")), Dn = polyCoeffs(txt(v, "den"));
  const degD = Dn.length - 1;
  if (degD < 1) throw new InputError("The denominator must have degree 1 or more.");
  // polynomial part if improper
  let Nr = N.slice(), quotient = "";
  if (N.length - 1 >= degD) {
    const q = new Array(N.length - degD).fill(0);
    for (let i = N.length - 1 - degD; i >= 0; i--) {
      const c = Nr[i + degD] / Dn[degD];
      q[i] = c;
      for (let j = 0; j <= degD; j++) Nr[i + j] -= c * Dn[j];
    }
    Nr = Nr.slice(0, degD);
    quotient = polyText(q.map((c) => sig(c, 10)));
  }
  // group roots
  const rs = polyRoots(Dn);
  const groups: { re: number; im: number; mult: number }[] = [];
  for (const [re, im] of rs) {
    if (im < 0) continue;
    const g = groups.find((gg) => Math.abs(gg.re - re) < 1e-5 && Math.abs(gg.im - im) < 1e-5);
    if (g) g.mult++;
    else groups.push({ re, im, mult: 1 });
  }
  type Basis = { label: (c: number[]) => string; ev: (x: number) => number[] };
  const basis: Basis[] = [];
  for (const g of groups) for (let k = 1; k <= g.mult; k++) {
    if (g.im === 0) basis.push({ label: ([A]) => `${fmt(A, 8)}/${g.re === 0 ? "x" : `(x ${g.re < 0 ? "+" : "−"} ${fmt(Math.abs(g.re), 8)})`}${k > 1 ? `^${k}` : ""}`, ev: (x) => [1 / (x - g.re) ** k] });
    else {
      const p = -2 * g.re, q = g.re * g.re + g.im * g.im;
      const quad = `x²${Math.abs(p) < 1e-12 ? "" : ` ${p < 0 ? "−" : "+"} ${fmt(Math.abs(p), 8)}x`} + ${fmt(q, 8)}`;
      basis.push({ label: ([B, C]) => `(${fmt(B, 8)}x ${C < 0 ? "−" : "+"} ${fmt(Math.abs(C), 8)})/(${quad})${k > 1 ? `^${k}` : ""}`, ev: (x) => [x / (x * x + p * x + q) ** k, 1 / (x * x + p * x + q) ** k] });
    }
  }
  const unknowns = basis.reduce((n, b) => n + b.ev(0.123).length, 0);
  const pts = Array.from({ length: unknowns }, (_, i) => 0.37 + 1.13 * i + 0.011 * i * i);
  const evalP = (c: number[], x: number) => c.reduceRight((acc, a) => acc * x + a, 0);
  const A = pts.map((x) => basis.flatMap((b) => b.ev(x)));
  const rhs = pts.map((x) => evalP(Nr, x) / evalP(Dn, x));
  // Gaussian elimination
  const n = unknowns, M = A.map((r, i) => [...r, rhs[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[p], M[i]] = [M[i], M[p]];
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const sol = M.map((r, i) => r[n] / r[i]).map((c) => (Math.abs(c - Math.round(c)) < 1e-7 ? Math.round(c) : c));
  let idx = 0;
  const parts = basis.map((b) => {
    const k = b.ev(0.5).length;
    const cs = sol.slice(idx, idx + k);
    idx += k;
    return b.label(cs);
  });
  return { decomposition: [quotient, ...parts].filter(Boolean).join(" + ").replace(/\+ -/g, "− "), polynomialPart: quotient || "none (proper fraction)", denominatorRoots: groups.map((g) => (g.im === 0 ? fmt(g.re, 8) : `${fmt(g.re, 6)} ± ${fmt(g.im, 6)}i`) + (g.mult > 1 ? ` (×${g.mult})` : "")).join(", ") };
};

// ---------- Implicit & logarithmic differentiation ----------
export const implicitDiff: SciCalculator = (v) => {
  const raw = txt(v, "eq");
  const [l, r] = raw.includes("=") ? raw.split("=", 2) : [raw, "0"];
  const F = `(${l}) - (${r})`;
  const Fx = derivTextVars(F, ["x", "y"], "x"), Fy = derivTextVars(F, ["x", "y"], "y");
  const fx = compileFn(Fx, ["x", "y"]), fy = compileFn(Fy, ["x", "y"]);
  const x0 = num(v.x0, 3), y0 = num(v.y0, 4);
  const slope = -fx(x0, y0) / fy(x0, y0);
  return { dydx: `dy/dx = −(${tidy(Fx)}) / (${tidy(Fy)})`, slope: Number.isFinite(slope) ? s(slope, 12) : "undefined (vertical tangent)", tangent: Number.isFinite(slope) ? `y − ${fmt(y0)} = ${fmt(slope, 8)}(x − ${fmt(x0)})` : `x = ${fmt(x0)}`, onCurve: s(compileFn(F, ["x", "y"])(x0, y0), 6) };
};
export const logDiff: SciCalculator = (v) => {
  const e = txt(v, "fx"), x0 = num(v.x0, 2);
  const f = compileFn(e);
  const d = compileFn(derivText(e, "x"));
  return { derivative: sd(e), valueAt: s(d(x0), 12), method: `ln y = ln(${e}) → (1/y)·y′ = d/dx[ln(${e})] → y′ = y · d/dx[ln y]`, fAt: s(f(x0), 12) };
};

// ---------- ODE: Euler, RK4 ----------
export const EULER_METHOD = ["Euler", "Improved Euler (Heun)"];
const odeStep = (f: (x: number, y: number) => number, x: number, y: number, h: number, m: number) => {
  if (m === 0) return y + h * f(x, y);
  if (m === 1) {
    const k1 = f(x, y), k2 = f(x + h, y + h * k1);
    return y + (h / 2) * (k1 + k2);
  }
  const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
  return y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
};
export const eulerMethod: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]), m = pick(v.method, 2);
  let x = num(v.x0, 0), y = num(v.y0, 1);
  const h = num(v.h, 0.1), n = Math.min(10000, Math.max(1, Math.round(pos(v.n, 10))));
  const rows = [`x = ${fmt(x, 6).padStart(8)}  y = ${fmt(y, 10)}`];
  for (let i = 0; i < n; i++) {
    y = odeStep(f, x, y, h, m);
    x += h;
    if (i < 40) rows.push(`x = ${fmt(x, 6).padStart(8)}  y = ${fmt(y, 10)}`);
  }
  return { y: s(y, 12), x: s(x, 10), table: rows.join("\n") };
};
export const diffEq: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]);
  const x0 = num(v.x0, 0), y0 = num(v.y0, 1), x1 = num(v.x1, 2);
  const n = 2000, h = (x1 - x0) / n;
  let x = x0, y = y0;
  const rows: string[] = [];
  for (let i = 0; i <= n; i++) {
    if (i % 200 === 0) rows.push(`x = ${fmt(x, 6).padStart(8)}  y = ${fmt(y, 10)}`);
    if (i === n) break;
    y = odeStep(f, x, y, h, 2);
    x += h;
  }
  return { y: s(y, 12), table: rows.join("\n"), method: "4th-order Runge-Kutta, 2,000 steps" };
};

// ---------- Tangent-based ----------
export const linearApprox: SciCalculator = (v) => {
  const e = txt(v, "fx"), a = num(v.a, 4), x = num(v.x, 4.1);
  const f = compileFn(e), d = numDeriv(f, a);
  const L = f(a) + d * (x - a);
  return { approx: s(L, 12), actual: s(f(x), 12), error: s(Math.abs(f(x) - L), 6), linearization: `L(x) = ${fmt(f(a), 10)} + ${fmt(d, 10)}(x − ${fmt(a)})` };
};
export const curvature: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), x0 = num(v.x0, 1);
  const d1 = numDeriv(f, x0), d2 = numDeriv(f, x0, 2);
  const k = Math.abs(d2) / (1 + d1 * d1) ** 1.5;
  return { curvature: s(k, 10), radius: k ? s(1 / k, 10) : "∞ (straight)", center: k ? `(${fmt(x0 - (d1 * (1 + d1 * d1)) / d2, 8)}, ${fmt(f(x0) + (1 + d1 * d1) / d2, 8)})` : "—" };
};
export const instRate: SciCalculator = (v) => {
  const e = txt(v, "fx"), x0 = num(v.x0, 2);
  const f = compileFn(e);
  return { rate: s(numDeriv(f, x0), 12), derivative: sd(e), tangent: `y = ${fmt(numDeriv(f, x0), 8)}(x − ${fmt(x0)}) + ${fmt(f(x0), 8)}` };
};
export const avgRate: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 1), b = num(v.b, 3);
  if (a === b) throw new InputError("a and b must differ.");
  const r = (f(b) - f(a)) / (b - a);
  return { rate: s(r, 12), change: s(f(b) - f(a), 12), secant: `y − ${fmt(f(a), 8)} = ${fmt(r, 8)}(x − ${fmt(a)})`, percent: f(a) ? s(((f(b) - f(a)) / Math.abs(f(a))) * 100, 8) : "—" };
};
export const mvt: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), b = num(v.b, 2);
  if (a >= b) throw new InputError("Need a < b.");
  const slope = (f(b) - f(a)) / (b - a);
  const cs = roots((x) => numDeriv(f, x) - slope, a, b, 4000).filter((c) => c > a && c < b);
  return { c: cs.length ? cs.map((c) => fmt(c, 10)).join(", ") : "none found (is f differentiable on (a, b)?)", slope: s(slope, 12), rolle: Math.abs(f(a) - f(b)) < 1e-12 ? 0 : 1 };
};
export const ROLLE = ["f(a) = f(b): this is Rolle's theorem (f′(c) = 0)", "f(a) ≠ f(b): Mean Value Theorem"];

// ---------- Extrema ----------
export const extrema: SciCalculator = (v) => {
  const e = txt(v, "fx"), a = num(v.a, -3), b = num(v.b, 3);
  const f = compileFn(e);
  let dfun: (x: number) => number;
  try {
    const dd = compileFn(derivText(e, "x"));
    dfun = (x) => dd(x);
  } catch {
    dfun = (x) => numDeriv(f, x);
  }
  const crit = roots(dfun, a, b, 6000);
  const rows = crit.map((c) => {
    const d2 = numDeriv(f, c, 2);
    return `x = ${fmt(c, 8)}: f = ${fmt(f(c), 8)} — ${d2 > 1e-8 ? "local minimum" : d2 < -1e-8 ? "local maximum" : "neither / inconclusive (f″ = 0)"}`;
  });
  const cand = [a, b, ...crit].filter((x) => Number.isFinite(f(x)));
  const mx = cand.reduce((p, q) => (f(q) > f(p) ? q : p)), mn = cand.reduce((p, q) => (f(q) < f(p) ? q : p));
  return { critical: rows.join("\n") || "no critical points in the interval", absMax: `f(${fmt(mx, 8)}) = ${fmt(f(mx), 10)}`, absMin: `f(${fmt(mn, 8)}) = ${fmt(f(mn), 10)}`, derivative: sd(e) };
};

// ---------- Numeric integration rules ----------
export const simpsons: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), b = num(v.b, 2);
  let n = Math.max(2, Math.round(pos(v.n, 10)));
  if (n % 2) n++;
  const h = (b - a) / n;
  let S = f(a) + f(b), T = (f(a) + f(b)) / 2, Mid = 0;
  for (let i = 1; i < n; i++) {
    S += f(a + i * h) * (i % 2 ? 4 : 2);
    T += f(a + i * h);
  }
  for (let i = 0; i < n; i++) Mid += f(a + (i + 0.5) * h);
  const exact = integrate(f, a, b);
  return { simpson: s((S * h) / 3, 12), trapezoid: s(T * h, 12), midpoint: s(Mid * h, 12), accurate: s(exact, 12), error: s(Math.abs((S * h) / 3 - exact), 6), n };
};

// ---------- Jacobian ----------
export const jacobian: SciCalculator = (v) => {
  const vars = ["x", "y", "z"];
  const fs = [txt(v, "f1"), txt(v, "f2"), txt(v, "f3")].filter(Boolean);
  const k = fs.length;
  if (k < 2) throw new InputError("Enter at least two functions.");
  const use = vars.slice(0, k);
  const pt = [num(v.x, 1), num(v.y, 2), num(v.z, 0)].slice(0, k);
  const sym = fs.map((f) => use.map((u) => tidy(derivTextVars(f, use, u))));
  const numM = fs.map((f) => use.map((u) => compileFn(derivTextVars(f, use, u), use)(...pt)));
  const det = k === 2 ? numM[0][0] * numM[1][1] - numM[0][1] * numM[1][0] : numM[0][0] * (numM[1][1] * numM[2][2] - numM[1][2] * numM[2][1]) - numM[0][1] * (numM[1][0] * numM[2][2] - numM[1][2] * numM[2][0]) + numM[0][2] * (numM[1][0] * numM[2][1] - numM[1][1] * numM[2][0]);
  return { determinant: s(det, 12), matrix: sym.map((r) => "[ " + r.join(",  ") + " ]").join("\n"), atPoint: numM.map((r) => "[ " + r.map((x) => fmt(x, 8)).join("  ") + " ]").join("\n") };
};

// ---------- Fourier ----------
export const dft: SciCalculator = (v) => {
  const x = listOf(v, "x", 2);
  const N = x.length;
  if (N > 256) throw new InputError("Up to 256 samples.");
  const rows: string[] = [];
  let peak = 0, peakK = 0;
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      re += x[n] * Math.cos((2 * Math.PI * k * n) / N);
      im -= x[n] * Math.sin((2 * Math.PI * k * n) / N);
    }
    const mag = Math.hypot(re, im);
    if (k > 0 && k <= N / 2 && mag > peak) [peak, peakK] = [mag, k];
    if (k < 32) rows.push(`X[${k}] = ${fmt(Math.abs(re) < 1e-10 ? 0 : re, 6)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im) < 1e-10 ? 0 : Math.abs(im), 6)}i   |X| = ${fmt(mag, 6)}`);
  }
  return { dominant: peakK, magnitude: s(peak, 10), dc: s(x.reduce((a, b) => a + b, 0) / N, 10), spectrum: rows.join("\n") };
};
export const fourierSeries: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), L = pos(v.L, Math.PI) || Math.PI, N = Math.min(20, Math.max(1, Math.round(pos(v.N, 5)))), x0 = num(v.x, 1);
  const a0 = (1 / L) * integrate(f, -L, L);
  let sum = a0 / 2;
  const rows: string[] = [`a₀ = ${fmt(a0, 8)}`];
  for (let n = 1; n <= N; n++) {
    const an = (1 / L) * integrate((x) => f(x) * Math.cos((n * Math.PI * x) / L), -L, L);
    const bn = (1 / L) * integrate((x) => f(x) * Math.sin((n * Math.PI * x) / L), -L, L);
    sum += an * Math.cos((n * Math.PI * x0) / L) + bn * Math.sin((n * Math.PI * x0) / L);
    rows.push(`n = ${n}: aₙ = ${fmt(Math.abs(an) < 1e-10 ? 0 : an, 8)}, bₙ = ${fmt(Math.abs(bn) < 1e-10 ? 0 : bn, 8)}`);
  }
  return { partialSum: s(sum, 10), actual: s(f(x0), 10), coefficients: rows.join("\n") };
};
export const convolution: SciCalculator = (v) => {
  const a = listOf(v, "a", 1), b = listOf(v, "b", 1), circ = pick(v.mode, 2) === 1;
  if (circ) {
    const N = Math.max(a.length, b.length);
    const out = Array.from({ length: N }, (_, n) => {
      let s_ = 0;
      for (let k = 0; k < N; k++) s_ += (a[k] ?? 0) * (b[(n - k + N) % N] ?? 0);
      return s_;
    });
    return { result: out.map((x) => fmt(x, 10)).join(", "), length: N, sum: s(out.reduce((p, q) => p + q, 0), 12) };
  }
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return { result: out.map((x) => fmt(x, 10)).join(", "), length: out.length, sum: s(out.reduce((p, q) => p + q, 0), 12) };
};
export const CONV_MODE = ["Linear convolution", "Circular convolution"];

// ---------- Wronskian ----------
export const wronskian: SciCalculator = (v) => {
  const fs = [txt(v, "f1"), txt(v, "f2"), txt(v, "f3")].filter(Boolean);
  const x0 = num(v.x0, 1);
  if (fs.length < 2) throw new InputError("Enter at least two functions.");
  const rows = fs.map((f) => [0, 1, 2].slice(0, fs.length).map((k) => (k === 0 ? compileFn(f)(x0) : compileFn(derivText(f, "x", k))(x0))));
  const M = rows[0].map((_, c) => rows.map((r) => r[c]));
  const det = fs.length === 2 ? M[0][0] * M[1][1] - M[0][1] * M[1][0] : M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  return { wronskian: s(det, 12), independent: Math.abs(det) > 1e-10 ? 0 : 1, derivatives: fs.map((f) => `${f}: f′ = ${sd(f)}`).join("\n") };
};
export const INDEP = ["W ≠ 0 here — the functions are linearly independent", "W = 0 at this point — test other points (dependent if 0 everywhere)"];

// ---------- Lagrange multipliers ----------
export const lagrangeMultiplier: SciCalculator = (v) => {
  const fS = txt(v, "f"), gS = txt(v, "g"), c = num(v.c, 1);
  const f = compileFn(fS, ["x", "y"]), g = compileFn(gS, ["x", "y"]);
  const pd = (F: (x: number, y: number) => number, x: number, y: number, w: 0 | 1) => {
    const h = 1e-6 * Math.max(1, Math.abs(w ? y : x));
    return w ? (F(x, y + h) - F(x, y - h)) / (2 * h) : (F(x + h, y) - F(x - h, y)) / (2 * h);
  };
  const sols: { x: number; y: number; l: number; fv: number }[] = [];
  const starts = [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0.5], [0.5, 2], [-2, 0.3], [0.3, -2], [3, 3], [0.1, 0.1]];
  for (const [sx, sy] of starts) {
    let x = sx, y = sy, l = 1;
    for (let it = 0; it < 100; it++) {
      const F = (X: number, Y: number, Lm: number) => [pd(f, X, Y, 0) - Lm * pd(g, X, Y, 0), pd(f, X, Y, 1) - Lm * pd(g, X, Y, 1), g(X, Y) - c];
      const F0 = F(x, y, l);
      if (Math.hypot(...F0) < 1e-10) break;
      const h = 1e-6;
      const J = [0, 1, 2].map((j) => {
        const d = [x, y, l];
        d[j] += h;
        const F1 = F(d[0], d[1], d[2]);
        return F1.map((q, i) => (q - F0[i]) / h);
      });
      const Jt = [0, 1, 2].map((i) => [J[0][i], J[1][i], J[2][i]]);
      const det = Jt[0][0] * (Jt[1][1] * Jt[2][2] - Jt[1][2] * Jt[2][1]) - Jt[0][1] * (Jt[1][0] * Jt[2][2] - Jt[1][2] * Jt[2][0]) + Jt[0][2] * (Jt[1][0] * Jt[2][1] - Jt[1][1] * Jt[2][0]);
      if (Math.abs(det) < 1e-14) break;
      const solve = (b: number[]) => {
        const rep = (col: number) => Jt.map((r, i) => r.map((q, j) => (j === col ? b[i] : q)));
        const d3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        return [0, 1, 2].map((col) => d3(rep(col)) / det);
      };
      const dx = solve(F0.map((q) => -q));
      x += dx[0];
      y += dx[1];
      l += dx[2];
      if (!Number.isFinite(x + y + l)) break;
    }
    if (Number.isFinite(x + y) && Math.abs(g(x, y) - c) < 1e-6 && Math.hypot(pd(f, x, y, 0) - l * pd(g, x, y, 0), pd(f, x, y, 1) - l * pd(g, x, y, 1)) < 1e-5 && !sols.some((q) => Math.hypot(q.x - x, q.y - y) < 1e-5)) sols.push({ x, y, l, fv: f(x, y) });
  }
  if (!sols.length) throw new InputError("No constrained critical point found — check the functions.");
  sols.sort((p, q) => q.fv - p.fv);
  return { max: `f(${fmt(sols[0].x, 8)}, ${fmt(sols[0].y, 8)}) = ${fmt(sols[0].fv, 10)}`, min: `f(${fmt(sols[sols.length - 1].x, 8)}, ${fmt(sols[sols.length - 1].y, 8)}) = ${fmt(sols[sols.length - 1].fv, 10)}`, points: sols.map((q) => `(${fmt(q.x, 8)}, ${fmt(q.y, 8)}), λ = ${fmt(q.l, 8)}, f = ${fmt(q.fv, 10)}`).join("\n") };
};

// ---------- Area between curves ----------
export const areaBetween: SciCalculator = (v) => {
  const f = compileFn(txt(v, "f")), g = compileFn(txt(v, "g"));
  let a = num(v.a, 0), b = num(v.b, 0);
  const hits = roots((x) => f(x) - g(x), -100, 100, 20000);
  if (a === b) {
    if (hits.length < 2) throw new InputError("Enter bounds — the curves don't cross twice between −100 and 100.");
    a = hits[0];
    b = hits[hits.length - 1];
  }
  const area = integrate((x) => Math.abs(f(x) - g(x)), a, b);
  return { area: s(area, 12), bounds: `${fmt(a, 10)} to ${fmt(b, 10)}`, intersections: hits.filter((x) => x >= a - 1e-9 && x <= b + 1e-9).map((x) => fmt(x, 8)).join(", ") || "none inside", signed: s(integrate((x) => f(x) - g(x), a, b), 12) };
};

// ---------- Related rates (common templates) ----------
export const RR_TYPES = ["Circle: radius growing → area rate (dA/dt = 2πr·dr/dt)", "Sphere: radius growing → volume rate (dV/dt = 4πr²·dr/dt)", "Ladder sliding: bottom moving out → top's speed", "Cone filling: inflow → water level rate", "Two objects at right angles: distance between them rate"];
export const relatedRates: SciCalculator = (v) => {
  const t = pick(v.type, 5), p = pos(v.p, 5), q = pos(v.q, 2), r = pos(v.r, 10);
  switch (t) {
    case 0:
      return { rate: s(2 * Math.PI * p * q, 10), formula: `dA/dt = 2π(${fmt(p)})(${fmt(q)})` };
    case 1:
      return { rate: s(4 * Math.PI * p * p * q, 10), formula: `dV/dt = 4π(${fmt(p)})²(${fmt(q)})` };
    case 2: {
      if (p >= r) throw new InputError("The bottom distance must be shorter than the ladder.");
      const y = Math.sqrt(r * r - p * p);
      return { rate: s((-p * q) / y, 10), formula: `x·dx/dt + y·dy/dt = 0 → dy/dt = −(${fmt(p)})(${fmt(q)})/${fmt(y, 6)} (negative = sliding down)` };
    }
    case 3: {
      // cone: radius R (=r) at height H (=v.h); water depth p, inflow q
      const H = pos(v.h, 12), k = r / H;
      return { rate: s(q / (Math.PI * k * k * p * p), 10), formula: `V = (π/3)(${fmt(k, 6)}h)²h → dh/dt = dV/dt ÷ (π·${fmt(k, 6)}²·h²)` };
    }
    default: {
      const y = r, dy = pos(v.h, 3), d = Math.hypot(p, y);
      return { rate: s((p * q + y * dy) / d, 10), formula: `D = √(x² + y²) → dD/dt = (x·dx/dt + y·dy/dt)/D, D = ${fmt(d, 8)}` };
    }
  }
};

export const sciCal1CustomCalculators: Record<string, SciCalculator> = {
  "derivative-calculator": derivative,
  "limit-calculator": limit,
  "integral-calculator": integral,
  "laplace-transform-calculator": laplace,
  "triple-integral-calculator": tripleIntegral,
  "double-integral-calculator": doubleIntegral,
  "radius-of-convergence-calculator": radiusConvergence,
  "partial-fraction-decomposition-calculator": partialFractions,
  "taylor-series-calculator": taylor,
  "series-convergence-calculator": seriesConvergence,
  "implicit-differentiation-calculator": implicitDiff,
  "eulers-method-calculator": eulerMethod,
  "differential-equation-calculator": diffEq,
  "linear-approximation-calculator": linearApprox,
  "fourier-transform-calculator": dft,
  "curvature-calculator": curvature,
  "inverse-laplace-transform-calculator": inverseLaplace,
  "wronskian-calculator": wronskian,
  "fourier-series-calculator": fourierSeries,
  "lagrange-multiplier-calculator": lagrangeMultiplier,
  "extrema-calculator": extrema,
  "average-rate-of-change-calculator": avgRate,
  "simpsons-rule-calculator": simpsons,
  "jacobian-calculator": jacobian,
  "convolution-calculator": convolution,
  "instantaneous-rate-of-change-calculator": instRate,
  "mean-value-theorem-calculator": mvt,
  "area-between-curves-calculator": areaBetween,
  "logarithmic-differentiation-calculator": logDiff,
  "related-rates-calculator": relatedRates,
};

