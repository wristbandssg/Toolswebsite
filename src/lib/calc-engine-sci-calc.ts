/**
 * Batch: "Science Calculators" → Scientific & Graphing Calculators (12 tools).
 *
 * Expressions are typed into text inputs and evaluated with the sandboxed parser in
 * sci-math-core.ts (whitelisted functions only). log(x) = log base 10, ln(x) = natural log,
 * trig in degrees or radians by dropdown. Numeric methods: scan + bisection for roots,
 * golden-section search for extrema, adaptive Simpson for areas.
 * Significant figures follow the standard counting rules (leading zeros never count, trapped
 * zeros always count, trailing zeros count only with a decimal point; "e"/"×10^" notation counts
 * the mantissa only). See prisma/create-sci-calc-calculators.ts for the copy.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, compileFn, evalExpr, roots, minimize, integrate, numDeriv, derivText, simplifyText } from "./sci-math-core";

export const ANGLE_MODES = ["Degrees", "Radians"];
const isDeg = (v: Vals) => pick(v.angle, 2) === 0;

// ---------- Scientific calculator ----------
export const scientific: SciCalculator = (v) => {
  const expr = txt(v, "expr");
  const x = evalExpr(expr, isDeg(v));
  return { result: sig(x, 12), sci: x === 0 ? "0" : x.toExponential(8).replace(/\.?0+e/, "e"), text: `${expr} = ${fmt(x, 12)}` };
};

// ---------- Function analysis helpers ----------
function analyse(expr: string, lo: number, hi: number, deg: boolean) {
  const f = compileFn(expr, ["x"], deg);
  const safe = (x: number) => {
    try {
      const y = f(x);
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
  const rs = roots(safe, lo, hi, 4000);
  // extrema: sample, then refine around local min/max
  const n = 800, step = (hi - lo) / n;
  const ext: { x: number; y: number; kind: string }[] = [];
  for (let i = 1; i < n; i++) {
    const a = safe(lo + (i - 1) * step), b = safe(lo + i * step), c = safe(lo + (i + 1) * step);
    if (![a, b, c].every(Number.isFinite)) continue;
    if (b < a && b <= c) {
      const xm = minimize(safe, lo + (i - 1) * step, lo + (i + 1) * step);
      ext.push({ x: xm, y: safe(xm), kind: "min" });
    } else if (b > a && b >= c) {
      const xm = minimize((x) => -safe(x), lo + (i - 1) * step, lo + (i + 1) * step);
      ext.push({ x: xm, y: safe(xm), kind: "max" });
    }
  }
  return { f: safe, rs, ext };
}

export const graphing: SciCalculator = (v) => {
  const expr = txt(v, "fx");
  let lo = num(v.xmin, -10), hi = num(v.xmax, 10);
  if (hi <= lo) [lo, hi] = [hi, lo + 1];
  const { f, rs, ext } = analyse(expr, lo, hi, isDeg(v));
  const x0 = num(v.x0, 1);
  const y0 = f(x0), yInt = f(0);
  const ys: number[] = [];
  for (let i = 0; i <= 400; i++) ys.push(f(lo + ((hi - lo) * i) / 400));
  const finite = ys.filter(Number.isFinite);
  const table = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
    const x = lo + ((hi - lo) * i) / 10;
    return `x = ${fmt(x, 5).padStart(8)}   y = ${fmt(f(x), 6)}`;
  }).join("\n");
  return {
    y: Number.isFinite(y0) ? sig(y0, 10) : "undefined",
    yIntercept: Number.isFinite(yInt) ? sig(yInt, 10) : "none",
    zeros: rs.length ? rs.map((r) => fmt(r, 7)).join(",  ") : `none between ${fmt(lo)} and ${fmt(hi)}`,
    extrema: ext.length ? ext.slice(0, 8).map((e) => `${e.kind} at x = ${fmt(e.x, 6)}, y = ${fmt(e.y, 6)}`).join("\n") : "none in this window",
    range: finite.length ? `${fmt(Math.min(...finite), 6)} to ${fmt(Math.max(...finite), 6)}` : "undefined",
    table,
  };
};

// ---------- Math problem solver: equation or expression ----------
export const mathSolver: SciCalculator = (v) => {
  const raw = txt(v, "problem");
  if (!raw) throw new InputError("Type a sum or an equation, e.g. 2x + 3 = 11.");
  const deg = isDeg(v);
  if (!raw.includes("=")) {
    if (!/\bx\b|\dx\b/.test(raw)) {
      const val = evalExpr(raw, deg);
      return { answer: fmt(val, 12), type: "Evaluated the expression", check: `${raw} = ${fmt(val, 12)}` };
    }
    const f = compileFn(raw, ["x"], deg);
    const rs = roots((x) => f(x), -1000, 1000, 20000);
    return {
      answer: rs.length ? rs.map((r) => `x = ${fmt(r, 8)}`).join(",  ") : "no real solution of expression = 0",
      type: "Solved expression = 0 for x",
      check: rs.length ? `f(${fmt(rs[0], 6)}) = ${fmt(f(rs[0]), 4)}` : "",
    };
  }
  const [lhs, rhs] = raw.split("=", 2);
  const L = compileFn(lhs, ["x"], deg), Rr = compileFn(rhs, ["x"], deg);
  const g = (x: number) => L(x) - Rr(x);
  const rs = roots(g, -1000, 1000, 20000);
  if (!rs.length) throw new InputError("No real solution found between −1,000 and 1,000.");
  return {
    answer: rs.slice(0, 10).map((r) => `x = ${fmt(r, 10)}`).join(",  "),
    type: rs.length === 1 ? "One real solution" : `${rs.length} real solutions`,
    check: `left side = ${fmt(L(rs[0]), 8)}, right side = ${fmt(Rr(rs[0]), 8)}`,
  };
};

// ---------- CAS: derivative, integral, simplify, value ----------
export const cas: SciCalculator = (v) => {
  const expr = txt(v, "fx");
  const a = num(v.a, 0), b = num(v.b, 1), x0 = num(v.x0, 1);
  const f = compileFn(expr, ["x"], false);
  let d1 = "", d2 = "";
  try {
    d1 = derivText(expr, "x", 1);
    d2 = derivText(expr, "x", 2);
  } catch {
    d1 = "—";
  }
  let simp = "";
  try {
    simp = simplifyText(expr);
  } catch {
    simp = expr;
  }
  return {
    simplified: simp.replace(/ \^ /g, "^"),
    derivative: d1.replace(/ \^ /g, "^"),
    second: d2.replace(/ \^ /g, "^"),
    valueAt: sig(f(x0), 10),
    slopeAt: sig(numDeriv(f, x0), 8),
    integral: sig(integrate(f, a, b), 10),
  };
};

// ---------- Significant figures ----------
function sigInfo(s: string): { count: number; digits: string } {
  let t = s.trim().replace(/,/g, "").replace(/^[+-]/, "");
  t = t.replace(/\s*(×|x|\*)\s*10\^?\s*[-+]?\d+$/i, "").replace(/e[-+]?\d+$/i, "");
  if (!/^\d*\.?\d*$/.test(t) || !/\d/.test(t)) throw new InputError(`"${s}" isn't a number.`);
  const hasDot = t.includes(".");
  let d = t.replace(".", "").replace(/^0+/, "");
  if (!hasDot) d = d.replace(/0+$/, "");
  if (!d) return { count: hasDot ? Math.max(1, (t.split(".")[1] ?? "").length) : 1, digits: "0" };
  return { count: d.length, digits: d };
}
export const SIG_OPS = ["Count significant figures", "Round to N significant figures", "Add / subtract (decimal-place rule)", "Multiply / divide (sig-fig rule)"];
const roundSig = (x: number, n: number) => (x === 0 ? "0" : Number(x.toPrecision(n)).toPrecision(n).replace(/^(-?\d+)\.$/, "$1"));
export const sigFigs: SciCalculator = (v) => {
  const op = pick(v.op, 4), a = txt(v, "a"), bTxt = txt(v, "b");
  const A = Number(a.replace(/,/g, "").replace(/\s*(×|x|\*)\s*10\^?/i, "e"));
  const ia = sigInfo(a);
  if (op === 0) return { result: ia.count, rounded: a, rule: `${ia.count} significant figure${ia.count === 1 ? "" : "s"} (${ia.digits})` };
  if (op === 1) {
    const n = Math.max(1, Math.min(15, Math.round(pos(v.n, 3))));
    const r = roundSig(A, n);
    return { result: n, rounded: r, rule: `${a} rounded to ${n} s.f. = ${r}` };
  }
  const B = Number(bTxt.replace(/,/g, "").replace(/\s*(×|x|\*)\s*10\^?/i, "e"));
  const ib = sigInfo(bTxt);
  if (!Number.isFinite(A) || !Number.isFinite(B)) throw new InputError("Enter two numbers.");
  if (op === 2) {
    const dp = (s: string) => (s.includes(".") ? s.split(".")[1].replace(/e.*$/i, "").length : 0);
    const places = Math.min(dp(a), dp(bTxt));
    const sum = pick(v.sign, 2) === 0 ? A + B : A - B;
    const r = sum.toFixed(places);
    return { result: sigInfo(r).count, rounded: r, rule: `Round to the fewest decimal places (${places}).` };
  }
  const prod = pick(v.sign, 2) === 0 ? A * B : A / B;
  const n = Math.min(ia.count, ib.count);
  const r = roundSig(prod, n);
  return { result: n, rounded: r, rule: `Keep the fewest significant figures (${n}).` };
};

// ---------- Logs & exponents ----------
export const antilog: SciCalculator = (v) => {
  const x = num(v.x, 2), b = pos(v.base, 10) || 10;
  return { result: sig(b ** x, 12), sci: (b ** x).toExponential(6), check: `log${b === 10 ? "" : "_" + fmt(b)}(${fmt(b ** x, 10)}) = ${fmt(x)}` };
};
const needPos = (x: number) => {
  if (!(x > 0)) throw new InputError("Logarithms need a number greater than 0.");
  return x;
};
export const naturalLog: SciCalculator = (v) => {
  const x = needPos(num(v.x, 10));
  return { ln: sig(Math.log(x), 12), log10: sig(Math.log10(x), 12), exp: sig(Math.exp(num(v.x, 10)), 12) };
};
export const logBase2: SciCalculator = (v) => {
  const x = needPos(num(v.x, 1024));
  const l = Math.log2(x);
  return { log2: sig(l, 12), bits: Math.ceil(l - 1e-12), pow2: Number.isInteger(Math.round(l * 1e9) / 1e9) ? `${fmt(x)} = 2^${fmt(l)}` : `2^${Math.floor(l)} < ${fmt(x)} < 2^${Math.floor(l) + 1}` };
};
export const logCalc: SciCalculator = (v) => {
  const x = needPos(num(v.x, 100)), b = num(v.base, 10);
  if (!(b > 0) || b === 1) throw new InputError("The base must be positive and not 1.");
  return { log: sig(Math.log(x) / Math.log(b), 12), ln: sig(Math.log(x), 12), log10: sig(Math.log10(x), 12), log2: sig(Math.log2(x), 12) };
};
export const exponent: SciCalculator = (v) => {
  const b = num(v.base, 2), n = num(v.exp, 10);
  const r = b ** n;
  if (Number.isNaN(r)) throw new InputError("A negative base needs a whole-number exponent (or an odd root).");
  return { result: Number.isFinite(r) ? sig(r, 12) : "too large", sci: Number.isFinite(r) ? r.toExponential(8) : "∞", square: sig(b * b, 12), cube: sig(b ** 3, 12), root: b >= 0 ? sig(b ** (1 / Math.max(1e-9, Math.abs(n) || 1)), 10) : "—" };
};

// ---------- RPN ----------
export const rpn: SciCalculator = (v) => {
  const tokens = txt(v, "stack").split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new InputError("Enter numbers and operators separated by spaces, e.g. 3 4 + 2 *.");
  const st: number[] = [];
  const bin: Record<string, (a: number, b: number) => number> = { "+": (a, b) => a + b, "-": (a, b) => a - b, "*": (a, b) => a * b, x: (a, b) => a * b, "/": (a, b) => a / b, "^": (a, b) => a ** b, "%": (a, b) => a % b };
  const un: Record<string, (a: number) => number> = { sqrt: Math.sqrt, sin: (a) => Math.sin((a * Math.PI) / 180), cos: (a) => Math.cos((a * Math.PI) / 180), tan: (a) => Math.tan((a * Math.PI) / 180), ln: Math.log, log: Math.log10, chs: (a) => -a, inv: (a) => 1 / a, sq: (a) => a * a };
  const steps: string[] = [];
  for (const t of tokens) {
    const tl = t.toLowerCase();
    if (bin[tl]) {
      if (st.length < 2) throw new InputError(`"${t}" needs two numbers on the stack.`);
      const b = st.pop()!, a = st.pop()!;
      st.push(bin[tl](a, b));
    } else if (un[tl]) {
      if (!st.length) throw new InputError(`"${t}" needs a number on the stack.`);
      st.push(un[tl](st.pop()!));
    } else if (tl === "swap") {
      if (st.length < 2) throw new InputError("swap needs two numbers.");
      const b = st.pop()!, a = st.pop()!;
      st.push(b, a);
    } else if (tl === "dup") {
      if (!st.length) throw new InputError("dup needs a number.");
      st.push(st[st.length - 1]);
    } else if (tl === "pi") st.push(Math.PI);
    else if (tl === "e") st.push(Math.E);
    else {
      const n = Number(t);
      if (!Number.isFinite(n)) throw new InputError(`"${t}" isn't a number or a known operator.`);
      st.push(n);
    }
    steps.push(`${t.padEnd(6)} → [ ${st.map((x) => fmt(x, 8)).join("  ")} ]`);
  }
  return { result: sig(st[st.length - 1], 12), depth: st.length, steps: steps.slice(-20).join("\n") };
};

// ---------- Scientific notation ----------
export const SN_OPS = ["Convert a number", "Multiply two numbers", "Divide two numbers", "Add two numbers", "Subtract two numbers"];
const snText = (x: number, digits = 6) => {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${Number(m.toPrecision(digits))} × 10^${e}`;
};
export const sciNotation: SciCalculator = (v) => {
  const a = num(v.a, 4500000), b = num(v.b, 3e-4);
  const op = pick(v.op, 5);
  const r = [a, a * b, a / b, a + b, a - b][op];
  const e = r === 0 ? 0 : Math.floor(Math.log10(Math.abs(r)));
  return { scientific: snText(r), eNotation: r === 0 ? "0" : r.toExponential(5), engineering: r === 0 ? "0" : `${Number((r / 10 ** (3 * Math.floor(e / 3))).toPrecision(6))} × 10^${3 * Math.floor(e / 3)}`, decimal: fmt(r, 12), magnitude: e };
};

export const sciCalcCustomCalculators: Record<string, SciCalculator> = {
  "scientific-calculator": scientific,
  "graphing-calculator": graphing,
  "math-solver-calculator": mathSolver,
  "cas-calculator": cas,
  "significant-figures-calculator": sigFigs,
  "antilog-calculator": antilog,
  "natural-log-calculator": naturalLog,
  "log-base-2-calculator": logBase2,
  "log-calculator": logCalc,
  "exponent-calculator": exponent,
  "rpn-calculator": rpn,
  "scientific-notation-calculator": sciNotation,
};
