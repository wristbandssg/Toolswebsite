/**
 * Batch: "Science Calculators" → Math Calculators (calculus & differential equations, part 2 — 30 tools).
 *
 * Numeric methods throughout (adaptive Simpson integration, central differences, RK4): Riemann
 * sums, volumes of revolution (disk/washer π∫(R² − r²), shell 2π∫x·h), arc length ∫√(1 + f′²),
 * improper integrals by the substitution x = a + t/(1 − t), heat-equation PDE by Fourier sine
 * series, second-order constant-coefficient ODEs by the characteristic equation, boundary-value
 * problems by the shooting method (RK4 + secant), contour integrals ∮ f(z) dz over a circle with
 * complex arithmetic, z-transforms from the standard table and the inverse by power-series long
 * division. Symbolic partial derivatives come from mathjs. See prisma/create-sci-cal2-calculators.ts.
 */

import { create, all } from "mathjs";
import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, compileFn, integrate, numDeriv, roots, minimize, derivText, derivTextVars, parseSafe, listOf } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const tidy = (e: string) => e.replace(/ \^ /g, "^").replace(/\s*\*\s*/g, "·");
const mj = create(all);

// ---------- Vectors / multivariable ----------
export const unitTangent: SciCalculator = (v) => {
  const X = compileFn(txt(v, "xt"), ["t"]), Y = compileFn(txt(v, "yt"), ["t"]), zs = txt(v, "zt");
  const Z = zs ? compileFn(zs, ["t"]) : () => 0;
  const t0 = num(v.t0, 1);
  const d = [numDeriv(X, t0), numDeriv(Y, t0), numDeriv(Z, t0)];
  const sp = Math.hypot(...d);
  if (!sp) throw new InputError("r′(t) = 0 here, so the tangent direction is undefined.");
  const T = d.map((c) => c / sp);
  return { T: `(${T.map((c) => fmt(c, 8)).join(", ")})`, speed: s(sp, 12), velocity: `(${d.map((c) => fmt(c, 8)).join(", ")})`, position: `(${fmt(X(t0), 8)}, ${fmt(Y(t0), 8)}, ${fmt(Z(t0), 8)})` };
};
export const divCurl: SciCalculator = (v) => {
  const V = ["x", "y", "z"];
  const P = txt(v, "P"), Q = txt(v, "Q"), Rr = txt(v, "R") || "0";
  const pt = [num(v.x, 1), num(v.y, 2), num(v.z, 3)];
  const D = (e: string, w: string) => compileFn(derivTextVars(e, V, w), V)(...pt);
  const div = D(P, "x") + D(Q, "y") + D(Rr, "z");
  const curl = [D(Rr, "y") - D(Q, "z"), D(P, "z") - D(Rr, "x"), D(Q, "x") - D(P, "y")];
  const lap = ["x", "y", "z"].reduce((acc, w) => acc + compileFn(derivTextVars(derivTextVars(P, V, w), V, w), V)(...pt), 0);
  return { divergence: s(div, 12), curl: `(${curl.map((c) => fmt(c, 10)).join(", ")})`, divText: tidy(mj.simplify(`(${derivTextVars(P, V, "x")}) + (${derivTextVars(Q, V, "y")}) + (${derivTextVars(Rr, V, "z")})`).toString()), laplacian: s(lap, 12) };
};
export const PD_VARS = ["x", "y", "z"];
export const partialDerivative: SciCalculator = (v) => {
  const V = ["x", "y", "z"];
  const e = txt(v, "f"), w1 = PD_VARS[pick(v.v1, 3)], second = pick(v.order, 3);
  const w2 = PD_VARS[pick(v.v2, 3)];
  const pt = [num(v.x, 1), num(v.y, 2), num(v.z, 0)];
  let d = derivTextVars(e, V, w1), label = `∂f/∂${w1}`;
  if (second === 1) {
    d = derivTextVars(d, V, w1);
    label = `∂²f/∂${w1}²`;
  } else if (second === 2) {
    d = derivTextVars(d, V, w2);
    label = `∂²f/∂${w2}∂${w1}`;
  }
  return { derivative: `${label} = ${tidy(d)}`, valueAt: s(compileFn(d, V)(...pt), 12), gradient: `∇f = (${V.map((w) => fmt(compileFn(derivTextVars(e, V, w), V)(...pt), 8)).join(", ")})` };
};
export const PD_ORDER = ["First partial", "Second partial (same variable)", "Mixed second partial"];
export const hessian: SciCalculator = (v) => {
  const e = txt(v, "f"), useZ = /(?<![A-Za-z_])z(?![A-Za-z_])/.test(e);
  const V = useZ ? ["x", "y", "z"] : ["x", "y"];
  const pt = [num(v.x, 1), num(v.y, 1), num(v.z, 0)].slice(0, V.length);
  const H = V.map((a) => V.map((b) => compileFn(derivTextVars(derivTextVars(e, V, a), V, b), V)(...pt)));
  const det = V.length === 2 ? H[0][0] * H[1][1] - H[0][1] * H[1][0] : H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) - H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) + H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);
  const grad = V.map((a) => compileFn(derivTextVars(e, V, a), V)(...pt));
  let cls = 4;
  if (Math.hypot(...grad) < 1e-6) {
    if (V.length === 2) cls = det > 0 ? (H[0][0] > 0 ? 0 : 1) : det < 0 ? 2 : 3;
    else {
      const d1 = H[0][0], d2 = H[0][0] * H[1][1] - H[0][1] * H[1][0];
      cls = d1 > 0 && d2 > 0 && det > 0 ? 0 : d1 < 0 && d2 > 0 && det < 0 ? 1 : det !== 0 ? 2 : 3;
    }
  }
  return { matrix: H.map((r) => "[ " + r.map((x) => fmt(x, 8)).join("  ") + " ]").join("\n"), determinant: s(det, 12), classification: cls, gradient: `(${grad.map((g) => fmt(g, 8)).join(", ")})` };
};
export const HESS_CLASS = ["Local minimum (H positive definite)", "Local maximum (H negative definite)", "Saddle point", "Test inconclusive (det H = 0)", "Not a critical point (∇f ≠ 0) — H shows the local curvature"];

// ---------- Integration applications ----------
export const RIEMANN = ["Left endpoints", "Right endpoints", "Midpoints", "Trapezoidal"];
export const riemann: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), b = num(v.b, 2), n = Math.max(1, Math.min(100000, Math.round(pos(v.n, 4)))), m = pick(v.method, 4);
  const h = (b - a) / n;
  let S = 0;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = m === 0 ? a + i * h : m === 1 ? a + (i + 1) * h : a + (i + 0.5) * h;
    const val = m === 3 ? (f(a + i * h) + f(a + (i + 1) * h)) / 2 : f(x);
    S += val;
    if (i < 10) parts.push(fmt(val, 6));
  }
  const exact = integrate(f, a, b);
  return { sum: s(S * h, 12), exact: s(exact, 12), error: s(S * h - exact, 6), terms: `Δx = ${fmt(h, 8)}; heights: ${parts.join(", ")}${n > 10 ? ", …" : ""}` };
};
export const REV_METHOD = ["Disk / washer about the x-axis", "Shell method about the y-axis", "Disk / washer about the y-axis (x = f(y))"];
export const volumeRevolution: SciCalculator = (v) => {
  const f = compileFn(txt(v, "f")), gs = txt(v, "g"), g = gs ? compileFn(gs) : () => 0;
  const a = num(v.a, 0), b = num(v.b, 2), m = pick(v.method, 3);
  const V = m === 1 ? 2 * Math.PI * integrate((x) => Math.abs(x) * Math.abs(f(x) - g(x)), a, b) : Math.PI * integrate((x) => Math.abs(f(x) ** 2 - g(x) ** 2), a, b);
  return { volume: s(V, 12), formula: m === 1 ? "V = 2π ∫ x·[f(x) − g(x)] dx" : "V = π ∫ [R(x)² − r(x)²] dx", inPi: s(V / Math.PI, 10) };
};
export const ftc: SciCalculator = (v) => {
  const ft = compileFn(txt(v, "ft"), ["t"]), ug = txt(v, "upper"), a = num(v.a, 0), x0 = num(v.x0, 2);
  const g = compileFn(ug), gp = numDeriv(g, x0);
  const F = (x: number) => integrate((t) => ft(t), a, g(x));
  return { derivative: s(ft(g(x0)) * gp, 12), rule: `d/dx ∫ₐ^(g(x)) f(t) dt = f(g(x))·g′(x) = ${fmt(ft(g(x0)), 8)} × ${fmt(gp, 8)}`, integralValue: s(F(x0), 12) };
};
export const areaUnder: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), b = num(v.b, 3.14159265);
  const net = integrate(f, a, b), total = integrate((x) => Math.abs(f(x)), a, b);
  return { total: s(total, 12), net: s(net, 12), average: s(net / (b - a), 10), crossings: roots(f, a, b, 4000).filter((x) => x > a && x < b).map((x) => fmt(x, 8)).join(", ") || "none" };
};
export const ARC_MODE = ["y = f(x)", "Parametric x(t), y(t)"];
export const arcLength: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = num(v.a, 0), b = num(v.b, 1);
  if (m === 0) {
    const f = compileFn(txt(v, "fx"));
    return { length: s(integrate((x) => Math.sqrt(1 + numDeriv(f, x) ** 2), a, b), 12), chord: s(Math.hypot(b - a, f(b) - f(a)), 10), formula: "L = ∫ √(1 + (dy/dx)²) dx" };
  }
  const X = compileFn(txt(v, "fx") || "cos(t)", ["t"]), Y = compileFn(txt(v, "yt") || "sin(t)", ["t"]);
  return { length: s(integrate((t) => Math.hypot(numDeriv(X, t), numDeriv(Y, t)), a, b), 12), chord: s(Math.hypot(X(b) - X(a), Y(b) - Y(a)), 10), formula: "L = ∫ √((dx/dt)² + (dy/dt)²) dt" };
};
export const improper: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 1), toInf = pick(v.upperInf, 2) === 0, b = num(v.b, 0);
  let val: number;
  if (toInf) val = integrate((t) => (t >= 1 ? 0 : f(a + t / (1 - t)) / (1 - t) ** 2), 0, 1 - 1e-12);
  else {
    // possible singularity at an endpoint: integrate on [a + ε, b − ε] with shrinking ε
    const e1 = integrate(f, a + 1e-9 * Math.max(1, Math.abs(a)), b - 1e-9 * Math.max(1, Math.abs(b)));
    val = e1;
  }
  const conv = Number.isFinite(val) && Math.abs(val) < 1e12;
  return { value: conv ? s(val, 10) : "diverges", converges: conv ? 0 : 1 };
};
export const CONVERGES = ["Converges", "Diverges"];
export const INF_UPPER = ["Upper limit is ∞", "Finite upper limit b (singularity at an endpoint)"];

// ---------- Function behaviour ----------
export const inflection: SciCalculator = (v) => {
  const e = txt(v, "fx"), a = num(v.a, -5), b = num(v.b, 5);
  const f = compileFn(e);
  let f2: (x: number) => number;
  try {
    const d2 = compileFn(derivText(e, "x", 2));
    f2 = (x) => d2(x);
  } catch {
    f2 = (x) => numDeriv(f, x, 2);
  }
  const pts = roots(f2, a, b, 6000).filter((x) => f2(x - 1e-3) * f2(x + 1e-3) < 0);
  const intervals: string[] = [];
  const cuts = [a, ...pts, b];
  for (let i = 0; i < cuts.length - 1; i++) {
    const mid = (cuts[i] + cuts[i + 1]) / 2;
    intervals.push(`(${fmt(cuts[i], 6)}, ${fmt(cuts[i + 1], 6)}): concave ${f2(mid) > 0 ? "up" : "down"}`);
  }
  return { points: pts.length ? pts.map((x) => `(${fmt(x, 8)}, ${fmt(f(x), 8)})`).join(", ") : "none in the interval", concavity: intervals.join("\n"), second: (() => {
    try {
      return tidy(derivText(e, "x", 2));
    } catch {
      return "—";
    }
  })() };
};
export const OPT_GOAL = ["Maximise", "Minimise"];
export const optimization: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 0), b = num(v.b, 10), goal = pick(v.goal, 2);
  const g = goal === 0 ? (x: number) => -f(x) : f;
  const n = 400, h = (b - a) / n;
  let best = a;
  for (let i = 0; i <= n; i++) if (g(a + i * h) < g(best)) best = a + i * h;
  const x = minimize(g, Math.max(a, best - h), Math.min(b, best + h));
  return { x: s(x, 12), value: s(f(x), 12), endpoints: `f(${fmt(a)}) = ${fmt(f(a), 8)}, f(${fmt(b)}) = ${fmt(f(b), 8)}` };
};
export const ivt: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 1), b = num(v.b, 2), N = num(v.N, 0);
  const fa = f(a), fb = f(b);
  const between = (N - fa) * (N - fb) <= 0;
  const cs = between ? roots((x) => f(x) - N, Math.min(a, b), Math.max(a, b), 4000) : [];
  return { guaranteed: between ? 0 : 1, c: cs.length ? cs.map((c) => fmt(c, 10)).join(", ") : "—", values: `f(${fmt(a)}) = ${fmt(fa, 8)}, f(${fmt(b)}) = ${fmt(fb, 8)}` };
};
export const IVT_RESULT = ["Yes — N is between f(a) and f(b), so some c in [a, b] has f(c) = N (if f is continuous)", "Not guaranteed — N isn't between f(a) and f(b)"];
export const lhopital: SciCalculator = (v) => {
  const ns = txt(v, "num"), ds = txt(v, "den"), a = num(v.a, 0);
  const N = compileFn(ns), D = compileFn(ds);
  let r: number | string = "—";
  let applied = 0;
  let curN = ns, curD = ds;
  const near = (F: (x: number) => number) => F(a + 1e-7 * Math.max(1, Math.abs(a)));
  const n0 = N(a), d0 = D(a);
  const indet = (Math.abs(n0) < 1e-12 && Math.abs(d0) < 1e-12) || (!Number.isFinite(n0) && !Number.isFinite(d0));
  if (!indet) r = d0 ? fmt(n0 / d0, 12) : "∞ (not an indeterminate form)";
  else {
    for (applied = 1; applied <= 4; applied++) {
      curN = derivText(curN);
      curD = derivText(curD);
      const nf = compileFn(curN), df = compileFn(curD);
      const nv = nf(a), dv = df(a);
      if (Math.abs(dv) > 1e-12 && Number.isFinite(nv)) {
        r = fmt(nv / dv, 12);
        break;
      }
      if (Math.abs(nv) > 1e-12 && Math.abs(dv) < 1e-12) {
        r = "∞";
        break;
      }
    }
    if (r === "—") r = fmt(near(N) / near(D), 8);
  }
  return { limit: String(r), form: indet ? (Math.abs(n0) < 1e-12 ? "0/0" : "∞/∞") : "not indeterminate", applied: indet ? applied : 0, derivatives: indet ? `f′/g′ = (${tidy(curN)}) / (${tidy(curD)})` : "—" };
};
export const TL_MODE = ["Tangent & normal line to y = f(x)", "Tangent plane to z = f(x, y)"];
export const tangentLine: SciCalculator = (v) => {
  const m = pick(v.mode, 2), x0 = num(v.x0, 1);
  if (m === 0) {
    const f = compileFn(txt(v, "fx")), y0 = f(x0), k = numDeriv(f, x0);
    return { equation: `y = ${fmt(k, 10)}x ${y0 - k * x0 < 0 ? "−" : "+"} ${fmt(Math.abs(y0 - k * x0), 10)}`, slope: s(k, 12), normal: k === 0 ? `x = ${fmt(x0)}` : `y = ${fmt(-1 / k, 10)}x ${y0 + x0 / k < 0 ? "−" : "+"} ${fmt(Math.abs(y0 + x0 / k), 10)}`, point: `(${fmt(x0)}, ${fmt(y0, 10)})` };
  }
  const f = compileFn(txt(v, "fx"), ["x", "y"]), y0 = num(v.y0, 1), z0 = f(x0, y0);
  const h = 1e-6, fx = (f(x0 + h, y0) - f(x0 - h, y0)) / (2 * h), fy = (f(x0, y0 + h) - f(x0, y0 - h)) / (2 * h);
  return { equation: `z = ${fmt(z0, 8)} + ${fmt(fx, 8)}(x − ${fmt(x0)}) + ${fmt(fy, 8)}(y − ${fmt(y0)})`, slope: s(fx, 12), normal: `normal vector (${fmt(fx, 8)}, ${fmt(fy, 8)}, −1)`, point: `(${fmt(x0)}, ${fmt(y0)}, ${fmt(z0, 10)})` };
};
export const secantLine: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), a = num(v.a, 1), b = num(v.b, 3);
  if (a === b) throw new InputError("The two x values must differ.");
  const m = (f(b) - f(a)) / (b - a), c = f(a) - m * a;
  return { equation: `y = ${fmt(m, 10)}x ${c < 0 ? "−" : "+"} ${fmt(Math.abs(c), 10)}`, slope: s(m, 12), points: `(${fmt(a)}, ${fmt(f(a), 8)}) and (${fmt(b)}, ${fmt(f(b), 8)})` };
};
export const limitDefinition: SciCalculator = (v) => {
  const e = txt(v, "fx"), x0 = num(v.x0, 2);
  const f = compileFn(e);
  const rows = [1, 0.1, 0.01, 0.001, 0.0001, 1e-5].map((h) => `h = ${String(h).padEnd(7)}  [f(x+h) − f(x)]/h = ${fmt((f(x0 + h) - f(x0)) / h, 10)}`);
  return { derivative: s(numDeriv(f, x0), 12), table: rows.join("\n"), formula: `f′(x) = lim(h→0) [f(x + h) − f(x)] / h; here f′(x) = ${(() => {
    try {
      return tidy(derivText(e));
    } catch {
      return "—";
    }
  })()}` };
};

// ---------- Series sums ----------
export const infiniteSum: SciCalculator = (v) => {
  const f = compileFn(txt(v, "an"), ["n"]), start = Math.round(num(v.start, 1));
  let S = 0, prev = 0;
  const N = 200000;
  let alt = true;
  for (let n = start; n < start + N; n++) {
    const t = f(n);
    if (!Number.isFinite(t)) throw new InputError(`Term n = ${n} is undefined.`);
    if (n > start && Math.sign(t) === Math.sign(prev) && t !== 0) alt = false;
    prev = t;
    S += t;
  }
  const last = Math.abs(f(start + N));
  // for an alternating series, averaging two consecutive partial sums is much closer to the limit
  const est = alt ? S + f(start + N) / 2 : S;
  const converging = alt ? last < 1e-3 : last * N < 1e-3 * Math.max(1, Math.abs(S));
  return { sum: converging ? s(est, 12) : "doesn't appear to converge", partial: s(S, 12), lastTerm: s(last, 6), type: alt ? 0 : 1 };
};
export const SUM_TYPE = ["Alternating series", "Positive / same-sign terms"];

// ---------- ODEs ----------
const rk4 = (f: (x: number, y: number) => number, x0: number, y0: number, x1: number, n: number) => {
  let x = x0, y = y0;
  const h = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
  }
  return y;
};
export const ivp: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]), x0 = num(v.x0, 0), y0 = num(v.y0, 1), x1 = num(v.x1, 1);
  const y1 = rk4(f, x0, y0, x1, 2000), y2 = rk4(f, x0, y0, x1, 4000);
  return { y: s(y2, 12), errorEstimate: s(Math.abs(y2 - y1) / 15, 4), slopeAtStart: s(f(x0, y0), 10) };
};
export const separable: SciCalculator = (v) => {
  const gx = compileFn(txt(v, "gx")), hy = compileFn(txt(v, "hy"), ["y"]), x0 = num(v.x0, 0), y0 = num(v.y0, 1), x1 = num(v.x1, 1);
  const y = rk4((x, yy) => gx(x) * hy(yy), x0, y0, x1, 4000);
  return { y: s(y, 12), separated: `∫ dy / (${txt(v, "hy")}) = ∫ (${txt(v, "gx")}) dx + C`, check: `dy/dx at start = ${fmt(gx(x0) * hy(y0), 8)}` };
};
export const linearDE: SciCalculator = (v) => {
  const P = compileFn(txt(v, "P")), Q = compileFn(txt(v, "Q")), x0 = num(v.x0, 0), y0 = num(v.y0, 1), x1 = num(v.x1, 1);
  const y = rk4((x, yy) => Q(x) - P(x) * yy, x0, y0, x1, 4000);
  const mu1 = Math.exp(integrate(P, x0, x1));
  return { y: s(y, 12), mu: `μ(x) = e^(∫P dx); from x₀ to x: μ = ${fmt(mu1, 10)}`, solution: "y = (1/μ)[∫ μ·Q dx + C]" };
};
export const exactDE: SciCalculator = (v) => {
  const V = ["x", "y"];
  const Ms = txt(v, "M"), Ns = txt(v, "N");
  const x0 = num(v.x0, 1), y0 = num(v.y0, 1), x1 = num(v.x1, 2);
  const My = derivTextVars(Ms, V, "y"), Nx = derivTextVars(Ns, V, "x");
  const pts = [[0.3, 0.7], [1.1, -0.4], [2.2, 1.9]];
  const exact = pts.every(([a, b]) => Math.abs(compileFn(My, V)(a, b) - compileFn(Nx, V)(a, b)) < 1e-8);
  const M = compileFn(Ms, V), N = compileFn(Ns, V);
  const y = rk4((x, yy) => -M(x, yy) / N(x, yy), x0, y0, x1, 4000);
  // homogeneity of M: M(tx, ty) = t^k M(x, y)
  const k = Math.log(Math.abs(M(2 * 1.3, 2 * 0.8) / M(1.3, 0.8))) / Math.LN2;
  const homo = Number.isFinite(k) && [[0.7, 1.9], [2.1, 0.4]].every(([a, b]) => Math.abs(M(3 * a, 3 * b) - 3 ** k * M(a, b)) < 1e-8 * Math.max(1, Math.abs(M(3 * a, 3 * b))) && Math.abs(N(3 * a, 3 * b) - 3 ** k * N(a, b)) < 1e-8 * Math.max(1, Math.abs(N(3 * a, 3 * b))));
  return { exact: exact ? 0 : 1, test: `∂M/∂y = ${tidy(My)},  ∂N/∂x = ${tidy(Nx)}`, homogeneous: homo ? `homogeneous of degree ${fmt(k, 4)} — substitute y = vx` : "not homogeneous", y: s(y, 12) };
};
export const EXACT = ["Exact (∂M/∂y = ∂N/∂x)", "Not exact — look for an integrating factor"];
export const secondOrderODE: SciCalculator = (v) => {
  const a = num(v.a, 1), b = num(v.b, 3), c = num(v.c, 2), F = num(v.F, 0), y0 = num(v.y0, 1), yp0 = num(v.yp0, 0), t = num(v.t, 1);
  if (a === 0) throw new InputError("a can't be 0 (that's a first-order equation).");
  const D = b * b - 4 * a * c, yp = c ? F / c : 0;
  const u0 = y0 - yp, up0 = yp0;
  let general: string, val: number, roots_: string;
  if (D > 0) {
    const r1 = (-b + Math.sqrt(D)) / (2 * a), r2 = (-b - Math.sqrt(D)) / (2 * a);
    const C2 = (up0 - r1 * u0) / (r2 - r1), C1 = u0 - C2;
    roots_ = `r₁ = ${fmt(r1, 8)}, r₂ = ${fmt(r2, 8)} (real, distinct)`;
    general = `y = ${fmt(C1, 8)}e^(${fmt(r1, 6)}t) + ${fmt(C2, 8)}e^(${fmt(r2, 6)}t)${yp ? ` + ${fmt(yp, 8)}` : ""}`;
    val = C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t) + yp;
  } else if (D === 0) {
    const r = -b / (2 * a), C1 = u0, C2 = up0 - r * u0;
    roots_ = `r = ${fmt(r, 8)} (repeated)`;
    general = `y = (${fmt(C1, 8)} + ${fmt(C2, 8)}t)e^(${fmt(r, 6)}t)${yp ? ` + ${fmt(yp, 8)}` : ""}`;
    val = (C1 + C2 * t) * Math.exp(r * t) + yp;
  } else {
    const al = -b / (2 * a), be = Math.sqrt(-D) / (2 * a), C1 = u0, C2 = (up0 - al * u0) / be;
    roots_ = `r = ${fmt(al, 8)} ± ${fmt(be, 8)}i (complex)`;
    general = `y = e^(${fmt(al, 6)}t)[${fmt(C1, 8)}cos(${fmt(be, 6)}t) + ${fmt(C2, 8)}sin(${fmt(be, 6)}t)]${yp ? ` + ${fmt(yp, 8)}` : ""}`;
    val = Math.exp(al * t) * (C1 * Math.cos(be * t) + C2 * Math.sin(be * t)) + yp;
  }
  return { solution: general, valueAt: s(val, 12), characteristic: `${fmt(a)}r² + ${fmt(b)}r + ${fmt(c)} = 0 → ${roots_}`, damping: D > 0 ? 0 : D === 0 ? 1 : 2 };
};
export const DAMPING = ["Overdamped (two real roots)", "Critically damped (repeated root)", "Underdamped / oscillating (complex roots)"];
export const slopeField: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]);
  const x0 = num(v.x0, -3), x1 = num(v.x1, 3), y0 = num(v.y0, -3), y1 = num(v.y1, 3);
  const cols = 13, rows = 9;
  const lines: string[] = [];
  for (let j = rows - 1; j >= 0; j--) {
    const y = y0 + ((y1 - y0) * j) / (rows - 1);
    let row = `${fmt(y, 3).padStart(6)} | `;
    for (let i = 0; i < cols; i++) {
      const x = x0 + ((x1 - x0) * i) / (cols - 1);
      let m: number;
      try {
        m = f(x, y);
      } catch {
        m = NaN;
      }
      const ang = Math.atan(m) * (180 / Math.PI);
      row += !Number.isFinite(m) ? "| " : ang > 67.5 || ang < -67.5 ? "| " : ang > 22.5 ? "/ " : ang < -22.5 ? "\\ " : "— ";
    }
    lines.push(row);
  }
  return { field: lines.join("\n"), at: `slope at (0, 0) = ${(() => {
    try {
      return fmt(f(0, 0), 8);
    } catch {
      return "undefined";
    }
  })()}`, legend: "— flat, / rising, \\ falling, | steep" };
};
export const rungeKutta: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fxy"), ["x", "y"]);
  let x = num(v.x0, 0), y = num(v.y0, 1);
  const h = num(v.h, 0.1), n = Math.min(10000, Math.max(1, Math.round(pos(v.n, 10))));
  const rows = [`x = ${fmt(x, 6).padStart(8)}  y = ${fmt(y, 12)}`];
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
    if (i < 40) rows.push(`x = ${fmt(x, 6).padStart(8)}  y = ${fmt(y, 12)}`);
  }
  return { y: s(y, 14), x: s(x, 10), table: rows.join("\n") };
};
export const bvp: SciCalculator = (v) => {
  const f = compileFn(txt(v, "f"), ["x", "y", "yp"]);
  const a = num(v.a, 0), b = num(v.b, 1), ya = num(v.ya, 0), yb = num(v.yb, 1), xq = num(v.x, 0.5);
  const shoot = (s0: number, upto = b) => {
    let x = a, y = ya, p = s0;
    const n = 2000, h = (upto - a) / n;
    for (let i = 0; i < n; i++) {
      const F = (X: number, Y: number, P: number) => [P, f(X, Y, P)];
      const k1 = F(x, y, p), k2 = F(x + h / 2, y + (h / 2) * k1[0], p + (h / 2) * k1[1]), k3 = F(x + h / 2, y + (h / 2) * k2[0], p + (h / 2) * k2[1]), k4 = F(x + h, y + h * k3[0], p + h * k3[1]);
      y += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      p += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      x += h;
    }
    return y;
  };
  let s0 = 0, s1 = 1, g0 = shoot(s0) - yb, g1 = shoot(s1) - yb;
  for (let i = 0; i < 60 && Math.abs(g1) > 1e-11; i++) {
    const s2 = s1 - (g1 * (s1 - s0)) / (g1 - g0);
    s0 = s1;
    g0 = g1;
    s1 = s2;
    g1 = shoot(s1) - yb;
  }
  if (!Number.isFinite(s1)) throw new InputError("The shooting method didn't converge.");
  return { yAt: s(xq === a ? ya : shoot(s1, xq), 12), slope: s(s1, 12), check: `y(${fmt(b)}) = ${fmt(shoot(s1), 10)} (target ${fmt(yb)})` };
};
export const heatPDE: SciCalculator = (v) => {
  const f = compileFn(txt(v, "fx")), L = pos(v.L, 1) || 1, al = pos(v.alpha, 0.1), x = num(v.x, 0.5), t = pos(v.t, 0.1);
  let u = 0;
  const coeffs: string[] = [];
  for (let n = 1; n <= 50; n++) {
    const bn = (2 / L) * integrate((s_) => f(s_) * Math.sin((n * Math.PI * s_) / L), 0, L);
    u += bn * Math.sin((n * Math.PI * x) / L) * Math.exp(-al * ((n * Math.PI) / L) ** 2 * t);
    if (n <= 4) coeffs.push(`b${n} = ${fmt(Math.abs(bn) < 1e-10 ? 0 : bn, 8)}`);
  }
  return { u: s(u, 10), initial: s(f(x), 10), coefficients: coeffs.join(", "), formula: "u(x, t) = Σ bₙ sin(nπx/L) e^(−α(nπ/L)²t), bₙ = (2/L)∫₀ᴸ f(x) sin(nπx/L) dx" };
};

// ---------- Fourier / z-transform ----------
export const inverseDft: SciCalculator = (v) => {
  const re = listOf(v, "re", 1), imS = txt(v, "im"), im = imS ? listOf(v, "im", 1) : re.map(() => 0);
  const N = re.length;
  if (im.length !== N) throw new InputError("Enter the same number of real and imaginary parts.");
  const out: string[] = [];
  for (let n = 0; n < N; n++) {
    let r = 0, i = 0;
    for (let k = 0; k < N; k++) {
      const a = (2 * Math.PI * k * n) / N;
      r += re[k] * Math.cos(a) - im[k] * Math.sin(a);
      i += re[k] * Math.sin(a) + im[k] * Math.cos(a);
    }
    r /= N;
    i /= N;
    out.push(Math.abs(i) < 1e-10 ? fmt(Math.abs(r) < 1e-12 ? 0 : r, 8) : `${fmt(r, 6)} ${i < 0 ? "−" : "+"} ${fmt(Math.abs(i), 6)}i`);
  }
  return { signal: out.join(", "), length: N };
};
export const Z_FORMS = ["Unit impulse δ[n]", "Unit step u[n]", "aⁿ u[n]", "n·aⁿ u[n]", "cos(ωn) u[n]", "sin(ωn) u[n]", "Inverse: X(z) = N(z⁻¹)/D(z⁻¹) by long division"];
export const zTransform: SciCalculator = (v) => {
  const form = pick(v.form, 7), a = num(v.a, 0.5), w = num(v.w, 1), z = num(v.z, 2);
  if (form === 6) {
    const N = listOf(v, "num", 1), D = listOf(v, "den", 1);
    if (!D[0]) throw new InputError("The first denominator coefficient can't be 0.");
    const x: number[] = [];
    const r = N.concat(new Array(20).fill(0));
    for (let n = 0; n < 16; n++) {
      const c = r[n] / D[0];
      x.push(c);
      for (let k = 0; k < D.length; k++) r[n + k] -= c * D[k];
    }
    return { transform: `x[n] = ${x.map((c) => fmt(Math.abs(c) < 1e-12 ? 0 : c, 8)).join(", ")}, …`, valueAt: "—", roc: "causal sequence (long division in z⁻¹)" };
  }
  const A = fmt(a), W = fmt(w);
  const table: [string, (Z: number) => number, string][] = [
    ["X(z) = 1", () => 1, "all z"],
    ["X(z) = z / (z − 1)", (Z) => Z / (Z - 1), "|z| > 1"],
    [`X(z) = z / (z − ${A})`, (Z) => Z / (Z - a), `|z| > |${A}|`],
    [`X(z) = ${A}z / (z − ${A})²`, (Z) => (a * Z) / (Z - a) ** 2, `|z| > |${A}|`],
    [`X(z) = z(z − cos ${W}) / (z² − 2z·cos ${W} + 1)`, (Z) => (Z * (Z - Math.cos(w))) / (Z * Z - 2 * Z * Math.cos(w) + 1), "|z| > 1"],
    [`X(z) = z·sin ${W} / (z² − 2z·cos ${W} + 1)`, (Z) => (Z * Math.sin(w)) / (Z * Z - 2 * Z * Math.cos(w) + 1), "|z| > 1"],
  ];
  const [t, fn, roc] = table[form];
  return { transform: t, valueAt: s(fn(z), 12), roc };
};

// ---------- Complex contour integral ----------
export const contourIntegral: SciCalculator = (v) => {
  const src = txt(v, "fz");
  const node = parseSafe(src, ["z"]);
  const code = node.compile();
  const z0r = num(v.z0r, 0), z0i = num(v.z0i, 0), r = pos(v.r, 1) || 1;
  const N = 2000;
  let sr = 0, si = 0;
  for (let k = 0; k < N; k++) {
    const th = (2 * Math.PI * (k + 0.5)) / N;
    const z = mj.complex(z0r + r * Math.cos(th), z0i + r * Math.sin(th));
    let fz: { re: number; im: number };
    try {
      const out = code.evaluate({ z }) as unknown;
      fz = typeof out === "number" ? { re: out, im: 0 } : (out as { re: number; im: number });
    } catch {
      throw new InputError("Couldn't evaluate f(z) on the circle.");
    }
    // dz = i r e^{iθ} dθ
    const dzr = -r * Math.sin(th) * ((2 * Math.PI) / N), dzi = r * Math.cos(th) * ((2 * Math.PI) / N);
    sr += fz.re * dzr - fz.im * dzi;
    si += fz.re * dzi + fz.im * dzr;
  }
  const clean = (x: number) => (Math.abs(x) < 1e-9 ? 0 : x);
  // residue sum = integral / (2πi)
  const resR = clean(si / (2 * Math.PI)), resI = clean(-sr / (2 * Math.PI));
  return { integral: `${fmt(clean(sr), 10)} ${clean(si) < 0 ? "−" : "+"} ${fmt(Math.abs(clean(si)), 10)}i`, residues: `${fmt(resR, 10)} ${resI < 0 ? "−" : "+"} ${fmt(Math.abs(resI), 10)}i`, path: `|z − (${fmt(z0r)} + ${fmt(z0i)}i)| = ${fmt(r)}, counter-clockwise` };
};

export const sciCal2CustomCalculators: Record<string, SciCalculator> = {
  "unit-tangent-vector-calculator": unitTangent,
  "riemann-sum-calculator": riemann,
  "divergence-curl-calculator": divCurl,
  "volume-of-revolution-calculator": volumeRevolution,
  "inflection-point-calculator": inflection,
  "optimization-calculator": optimization,
  "fundamental-theorem-of-calculus-calculator": ftc,
  "initial-value-problem-calculator": ivp,
  "infinite-series-sum-calculator": infiniteSum,
  "partial-derivative-calculator": partialDerivative,
  "area-under-curve-calculator": areaUnder,
  "intermediate-value-theorem-calculator": ivt,
  "arc-length-calculator": arcLength,
  "z-transform-calculator": zTransform,
  "lhopitals-rule-calculator": lhopital,
  "separable-differential-equation-calculator": separable,
  "tangent-line-calculator": tangentLine,
  "hessian-matrix-calculator": hessian,
  "partial-differential-equation-calculator": heatPDE,
  "normal-line-calculator": secantLine,
  "improper-integral-calculator": improper,
  "limit-definition-of-derivative-calculator": limitDefinition,
  "second-order-differential-equation-calculator": secondOrderODE,
  "inverse-fourier-transform-calculator": inverseDft,
  "exact-differential-equation-calculator": exactDE,
  "linear-differential-equation-calculator": linearDE,
  "surface-integral-calculator": contourIntegral,
  "slope-field-calculator": slopeField,
  "runge-kutta-calculator": rungeKutta,
  "boundary-value-problem-calculator": bvp,
};
