/**
 * Idea build, batch math1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Math — algebra, complex numbers, vectors,
 * calculus and number theory = 42 tools. Pure mathematics: standard definitions and exact integer arithmetic (BigInt) where results grow
 * past 2^53. Expressions are parsed with the shared mathjs helpers in sci-math-core.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt } from "./trv-core";
import { txt, fmt, compileFn, polyCoeffs, polyText, integrate, roots } from "./sci-math-core";

const need = (x: number, msg: string) => { if (!Number.isFinite(x)) throw new InputError(msg); return x; };
const int = (v: Record<string, number>, k: string, d: number, lo = 0, hi = 1e9) => { const x = Math.round(num(v[k], d)); if (x < lo || x > hi) throw new InputError(`Enter a whole number from ${nfmt(lo)} to ${nfmt(hi)}.`); return x; };
const f6 = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 6);
const OPS = ["<", "≤", ">", "≥"];
const flip = (o: number) => [2, 3, 0, 1][o];
const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const bgcd = (a: bigint, b: bigint): bigint => { if (a < BigInt(0)) a = -a; if (b < BigInt(0)) b = -b; while (b) [a, b] = [b, a % b]; return a; };
const big = (x: bigint) => { const s = x.toString(); return s.length > 60 ? `${s.slice(0, 30)}…${s.slice(-10)} (${s.length} digits)` : s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
const isPrime = (n: number) => { if (n < 2) return false; if (n % 2 === 0) return n === 2; for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false; return true; };

// ---- Algebra ----
export const absIneq: Calc = (v) => {
  const a = need(num(v.a, 2), "Enter a."), b = num(v.b, -3), c = num(v.c, 5), o = pick(v.o, 4);
  if (a === 0) throw new InputError("a can't be 0.");
  const lo = (-c - b) / a, hi = (c - b) / a, L = Math.min(lo, hi), H = Math.max(lo, hi), strict = o === 0 || o === 2, br = strict ? ["(", ")"] : ["[", "]"];
  const ex = `|${f6(a)}x ${b < 0 ? "−" : "+"} ${f6(Math.abs(b))}| ${OPS[o]} ${f6(c)}`;
  if (c < 0 || (c === 0 && strict)) return { s: o < 2 ? "No solution" : c < 0 ? "All real numbers" : `x ≠ ${f6(-b / a)}`, i: o < 2 ? "∅" : "(−∞, ∞)", note: `${ex}: an absolute value is never negative` };
  return o < 2 ? { s: `${f6(L)} ${OPS[o]} x ${OPS[o]} ${f6(H)}`, i: `${br[0]}${f6(L)}, ${f6(H)}${br[1]}`, note: `${ex} → −${f6(c)} ${OPS[o]} ${f6(a)}x ${b < 0 ? "−" : "+"} ${f6(Math.abs(b))} ${OPS[o]} ${f6(c)}` }
    : { s: `x ${OPS[o === 2 ? 0 : 1]} ${f6(L)} or x ${OPS[o]} ${f6(H)}`, i: `(−∞, ${f6(L)}${br[1]} ∪ ${br[0]}${f6(H)}, ∞)`, note: `${ex} → split into two inequalities` };
};
export const compIneq: Calc = (v) => {
  const lo = num(v.l, -3), a = num(v.a, 2), b = num(v.b, 1), hi = num(v.h, 9), o1 = pick(v.p, 2), o2 = pick(v.q, 2);
  if (a === 0) throw new InputError("The x coefficient can't be 0.");
  let L = (lo - b) / a, H = (hi - b) / a, s1 = o1, s2 = o2;
  if (a < 0) { [L, H] = [H, L]; [s1, s2] = [s2, s1]; }
  if (L > H || (L === H && (s1 === 0 || s2 === 0))) return { s: "No solution", i: "∅", note: "The bounds cross" };
  return { s: `${f6(L)} ${["<", "≤"][s1]} x ${["<", "≤"][s2]} ${f6(H)}`, i: `${s1 ? "[" : "("}${f6(L)}, ${f6(H)}${s2 ? "]" : ")"}`, note: `Subtract ${f6(b)} from all three parts, then divide by ${f6(a)}${a < 0 ? " (flip the signs)" : ""}` };
};
export const quadIneq: Calc = (v) => {
  const a = num(v.a, 1), b = num(v.b, -5), c = num(v.c, 6), o0 = pick(v.o, 4);
  if (a === 0) throw new InputError("a can't be 0 — that's linear.");
  const o = a < 0 ? flip(o0) : o0, A = Math.abs(a), B = a < 0 ? -b : b, C = a < 0 ? -c : c, D = B * B - 4 * A * C, strict = o === 0 || o === 2;
  const eq = `${f6(a)}x² ${b < 0 ? "−" : "+"} ${f6(Math.abs(b))}x ${c < 0 ? "−" : "+"} ${f6(Math.abs(c))} ${OPS[o0]} 0`;
  if (D < 0) return { s: o < 2 ? "No solution" : "All real numbers", i: o < 2 ? "∅" : "(−∞, ∞)", note: `${eq}: no real roots (discriminant ${f6(D)})` };
  const r1 = (-B - Math.sqrt(D)) / (2 * A), r2 = (-B + Math.sqrt(D)) / (2 * A), br = strict ? ["(", ")"] : ["[", "]"];
  if (D === 0 && strict) return { s: o === 0 ? "No solution" : `x ≠ ${f6(r1)}`, i: o === 0 ? "∅" : `(−∞, ${f6(r1)}) ∪ (${f6(r1)}, ∞)`, note: `${eq}: double root at ${f6(r1)}` };
  return o < 2 ? { s: `${f6(r1)} ${OPS[o]} x ${OPS[o]} ${f6(r2)}`, i: `${br[0]}${f6(r1)}, ${f6(r2)}${br[1]}`, note: `${eq}: roots ${f6(r1)} and ${f6(r2)}; the parabola is below 0 between them` }
    : { s: `x ${o === 2 ? "<" : "≤"} ${f6(r1)} or x ${OPS[o]} ${f6(r2)}`, i: `(−∞, ${f6(r1)}${br[1]} ∪ ${br[0]}${f6(r2)}, ∞)`, note: `${eq}: roots ${f6(r1)} and ${f6(r2)}; the parabola is above 0 outside them` };
};
export const sysIneq: Calc = (v) => {
  const rows = (txt(v, "s") || "1 1 <= 10; 2 1 <= 16; 1 0 >= 0; 0 1 >= 0").split(/[;\n]+/).map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(-?[\d.]+)\s+(-?[\d.]+)\s*(<=|>=|<|>|≤|≥)\s*(-?[\d.]+)$/); if (!m) throw new InputError(`Couldn't read "${l}" — write each as: a b <= c (meaning ax + by ≤ c).`); return { a: +m[1], b: +m[2], le: /<|≤/.test(m[3]), c: +m[4] }; });
  if (rows.length < 2) throw new InputError("Enter at least two inequalities.");
  const ok = (x: number, y: number) => rows.every((r) => (r.le ? r.a * x + r.b * y <= r.c + 1e-9 : r.a * x + r.b * y >= r.c - 1e-9));
  const pts: [number, number][] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) { const R = rows[i], S = rows[j], det = R.a * S.b - R.b * S.a; if (Math.abs(det) < 1e-12) continue; const x = (R.c * S.b - R.b * S.c) / det, y = (R.a * S.c - R.c * S.a) / det; if (ok(x, y) && !pts.some((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9)) pts.push([x, y]); }
  const cx = pts.reduce((s, p) => s + p[0], 0) / (pts.length || 1), cy = pts.reduce((s, p) => s + p[1], 0) / (pts.length || 1);
  pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  return { v: pts.length ? pts.map((p) => `(${f6(p[0])}, ${f6(p[1])})`).join(", ") : "No corner points — the region is empty or unbounded without corners", n: `${pts.length} corner point${pts.length === 1 ? "" : "s"} of the feasible region`, note: pts.length ? `Test point (${f6(cx)}, ${f6(cy)}) ${ok(cx, cy) ? "is inside" : "is outside"} the region · in linear programming the optimum is at a corner` : "Check the inequality directions" };
};
export const lin2: Calc = (v) => {
  const [a1, b1, c1, a2, b2, c2] = ["a", "b", "c", "d", "e", "f"].map((k, i) => num(v[k], [2, 1, 7, 1, -1, -1][i]));
  const det = a1 * b2 - a2 * b1, line = (a: number, b: number, c: number) => (b !== 0 ? `y = ${f6(-a / b)}x ${c / b < 0 ? "−" : "+"} ${f6(Math.abs(c / b))}` : `x = ${f6(c / a)}`);
  if (Math.abs(det) < 1e-12) { const same = Math.abs(a1 * c2 - a2 * c1) < 1e-12 && Math.abs(b1 * c2 - b2 * c1) < 1e-12; return { s: same ? "Infinitely many solutions — the same line" : "No solution — parallel lines", l: `${line(a1, b1, c1)} and ${line(a2, b2, c2)}`, note: same ? "Dependent system" : "Inconsistent system: equal slopes, different intercepts" }; }
  const x = (c1 * b2 - b1 * c2) / det, y = (a1 * c2 - c1 * a2) / det;
  return { s: `Lines meet at (${f6(x)}, ${f6(y)})`, l: `${line(a1, b1, c1)} and ${line(a2, b2, c2)}`, note: `Intercepts: line 1 (${b1 ? `0, ${f6(c1 / b1)}` : "none"}), line 2 (${b2 ? `0, ${f6(c2 / b2)}` : "none"}) · one solution (independent)` };
};
export const sumProd: Calc = (v) => {
  const c = polyCoeffs(txt(v, "p") || "2x^2 - 7x + 3"), n = c.length - 1;
  if (n < 2) throw new InputError("Enter a polynomial of degree 2 or more.");
  const an = c[n], s = -c[n - 1] / an, pr = (n % 2 ? -1 : 1) * (c[0] / an), p2 = n >= 2 ? c[n - 2] / an : 0;
  return { s: `Sum of roots = ${f6(s)}`, p: `Product of roots = ${f6(pr)}`, note: `Vieta's formulas for ${polyText(c)}: sum = −a${n - 1}/a${n}, product = (−1)^${n}·a0/a${n}${n > 2 ? ` · sum of pairwise products = ${f6(p2)}` : ""}` };
};
export const asym: Calc = (v) => {
  const N = polyCoeffs(txt(v, "n") || "2x^2 + 1"), D = polyCoeffs(txt(v, "d") || "x^2 - 4"), dn = N.length - 1, dd = D.length - 1;
  if (dd < 1) throw new InputError("The denominator needs an x term.");
  const fn = (c: number[]) => (x: number) => c.reduce((s, a, i) => s + a * x ** i, 0), nf = fn(N), df = fn(D);
  const vr = roots(df, -1000, 1000).filter((r) => Math.abs(nf(r)) > 1e-9);
  const holes = roots(df, -1000, 1000).filter((r) => Math.abs(nf(r)) <= 1e-9);
  let h: string;
  if (dn < dd) h = "Horizontal asymptote y = 0";
  else if (dn === dd) h = `Horizontal asymptote y = ${f6(N[dn] / D[dd])}`;
  else if (dn === dd + 1) { const q1 = N[dn] / D[dd], q0 = (N[dn - 1] - q1 * D[dd - 1]) / D[dd]; h = `Slant asymptote y = ${f6(q1)}x ${q0 < 0 ? "−" : "+"} ${f6(Math.abs(q0))}`; }
  else h = `No horizontal or slant asymptote (degree ${dn} > ${dd} + 1)`;
  return { va: vr.length ? `Vertical asymptote${vr.length > 1 ? "s" : ""}: ${vr.map((r) => `x = ${f6(r)}`).join(", ")}` : "No vertical asymptotes", ha: h, note: holes.length ? `Hole${holes.length > 1 ? "s" : ""} (removable) at x = ${holes.map(f6).join(", ")}` : `f(x) = (${polyText(N)}) / (${polyText(D)})` };
};
export const endBehavior: Calc = (v) => {
  const c = polyCoeffs(txt(v, "p") || "-2x^3 + 4x - 1"), n = c.length - 1, a = c[n];
  const right = a > 0 ? "+∞" : "−∞", left = n % 2 === 0 ? right : a > 0 ? "−∞" : "+∞";
  return { e: `As x → −∞, f(x) → ${left}; as x → +∞, f(x) → ${right}`, l: `Leading term ${f6(a)}x^${n} (degree ${n}, ${n % 2 ? "odd" : "even"}, ${a > 0 ? "positive" : "negative"})`, note: n % 2 ? "Odd degree: the ends go in opposite directions" : "Even degree: both ends go the same way" };
};
export const changeBase: Calc = (v) => {
  const x = num(v.x, 50), b = num(v.b, 3), nb = num(v.n, 10);
  if (x <= 0 || b <= 0 || b === 1 || nb <= 0 || nb === 1) throw new InputError("x and the bases must be positive, and bases can't be 1.");
  const r = Math.log(x) / Math.log(b);
  return { r: `log${b} (${f6(x)}) = ${f6(r)}`, how: `= log${nb}(${f6(x)}) ÷ log${nb}(${f6(b)}) = ${f6(Math.log(x) / Math.log(nb))} ÷ ${f6(Math.log(b) / Math.log(nb))}`, note: `Check: ${f6(b)}^${f6(r)} = ${f6(b ** r)} · ln form: ln ${f6(x)} ÷ ln ${f6(b)}` };
};
export const rationalize: Calc = (v) => {
  const a = num(v.a, 3), b = num(v.b, 2), c = num(v.c, 1), d = num(v.d, 5);
  if (d < 0) throw new InputError("The number under the root must be 0 or more.");
  const den = b * b - c * c * d;
  if (den === 0) throw new InputError("The denominator is zero.");
  const g = gcd(gcd(Math.round(a * b), Math.round(a * c)), Math.round(den)) || 1, ok = [a, b, c, d].every(Number.isInteger) && g > 1;
  const nb = a * b / (ok ? g : 1), nc = -a * c / (ok ? g : 1), dn = den / (ok ? g : 1), sgn = dn < 0 ? -1 : 1;
  return { r: `${f6(a)} / (${f6(b)} + ${f6(c)}√${f6(d)}) = (${f6(sgn * nb)} ${sgn * nc < 0 ? "−" : "+"} ${f6(Math.abs(sgn * nc))}√${f6(d)}) / ${f6(Math.abs(dn))}`, how: `Multiply top and bottom by the conjugate (${f6(b)} − ${f6(c)}√${f6(d)}): denominator ${f6(b)}² − ${f6(c)}²·${f6(d)} = ${f6(den)}`, note: `Decimal value ${f6(a / (b + c * Math.sqrt(d)))}` };
};
export const deMoivre: Calc = (v) => {
  const re = num(v.a, 1), im = num(v.b, 1), n = int(v, "n", 5, -1000, 1000), k = int(v, "k", 3, 1, 24);
  const r = Math.hypot(re, im), t = Math.atan2(im, re);
  if (r === 0) throw new InputError("Enter a non-zero complex number.");
  const R = r ** n, T = t * n, rr = r ** (1 / k), rts = Array.from({ length: k }, (_, j) => { const a = (t + 2 * Math.PI * j) / k; return `${f6(rr * Math.cos(a))} ${Math.sin(a) < 0 ? "−" : "+"} ${f6(Math.abs(rr * Math.sin(a)))}i`; });
  return { p: `(${f6(re)} ${im < 0 ? "−" : "+"} ${f6(Math.abs(im))}i)^${n} = ${f6(R * Math.cos(T))} ${Math.sin(T) < 0 ? "−" : "+"} ${f6(Math.abs(R * Math.sin(T)))}i`, f: `Polar: ${f6(r)}·cis(${f6((t * 180) / Math.PI)}°) → ${f6(R)}·cis(${f6(((T * 180) / Math.PI) % 360)}°)`, rt: `${k} ${k === 2 ? "square" : k === 3 ? "cube" : `${k}th`} roots: ${rts.join(" · ")}` };
};
export const iPow: Calc = (v) => {
  const n = int(v, "n", 27, -1e9, 1e9), m = ((n % 4) + 4) % 4;
  return { r: `i^${n} = ${["1", "i", "−1", "−i"][m]}`, how: `${n} ÷ 4 leaves remainder ${m}, so i^${n} = i^${m}`, note: "Powers of i repeat every 4: i, −1, −i, 1" };
};
// ---- Vectors & coordinates ----
export const triple: Calc = (v) => {
  const [a1, a2, a3, b1, b2, b3, c1, c2, c3] = ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "c3"].map((k, i) => num(v[k], [1, 2, 3, 4, 5, 6, 7, 8, 10][i]));
  const cx = b2 * c3 - b3 * c2, cy = b3 * c1 - b1 * c3, cz = b1 * c2 - b2 * c1, s = a1 * cx + a2 * cy + a3 * cz;
  return { s: `a · (b × c) = ${f6(s)}`, v: `Parallelepiped volume ${f6(Math.abs(s))} · tetrahedron ${f6(Math.abs(s) / 6)}`, note: s === 0 ? "The three vectors are coplanar" : `b × c = (${f6(cx)}, ${f6(cy)}, ${f6(cz)}) · ${s > 0 ? "right" : "left"}-handed order` };
};
export const spherical: Calc = (v) => {
  const dir = pick(v.m, 2), deg = Math.PI / 180;
  if (dir === 0) { const x = num(v.x, 1), y = num(v.y, 1), z = num(v.z, 1), r = Math.hypot(x, y, z); return { o: `ρ = ${f6(r)}, θ = ${f6(Math.atan2(y, x) / deg)}°, φ = ${f6(r ? Math.acos(z / r) / deg : 0)}°`, c: `Cylindrical: r = ${f6(Math.hypot(x, y))}, θ = ${f6(Math.atan2(y, x) / deg)}°, z = ${f6(z)}`, note: "ρ = distance from origin, θ = azimuth in the xy-plane, φ = angle down from the +z axis (physics uses the opposite letters)" }; }
  const r = num(v.r, 2), t = num(v.t, 45) * deg, ph = num(v.p, 60) * deg;
  return { o: `x = ${f6(r * Math.sin(ph) * Math.cos(t))}, y = ${f6(r * Math.sin(ph) * Math.sin(t))}, z = ${f6(r * Math.cos(ph))}`, c: `Cylindrical: r = ${f6(r * Math.sin(ph))}, θ = ${f6(t / deg)}°, z = ${f6(r * Math.cos(ph))}`, note: "x = ρ sin φ cos θ, y = ρ sin φ sin θ, z = ρ cos φ" };
};
// ---- Calculus ----
export const shell: Calc = (v) => {
  const e = txt(v, "f") || "x^2", g = txt(v, "g") || "0", a = num(v.a, 0), b = num(v.b, 2), k = num(v.k, 0), ax = pick(v.x, 2);
  if (b <= a) throw new InputError("b must be greater than a.");
  const f = compileFn(e), h = compileFn(g), V = ax === 0 ? 2 * Math.PI * integrate((x) => Math.abs(x - k) * Math.abs(f(x) - h(x)), a, b) : 2 * Math.PI * integrate((y) => Math.abs(y - k) * Math.abs(f(y) - h(y)), a, b);
  return { v: `Volume ≈ ${f6(V)} (${f6(V / Math.PI)}π)`, how: ax === 0 ? `V = 2π ∫ from ${f6(a)} to ${f6(b)} of |x − ${f6(k)}| · |(${e}) − (${g})| dx — rotating about x = ${f6(k)}` : `V = 2π ∫ from ${f6(a)} to ${f6(b)} of |y − ${f6(k)}| · |(${e}) − (${g})| dy — functions of y, rotating about y = ${f6(k)}`, note: "Shell radius = distance to the axis; shell height = top − bottom curve" };
};
export const trapezoid: Calc = (v) => {
  const e = txt(v, "f") || "sin(x)", a = num(v.a, 0), b = num(v.b, Math.PI), n = int(v, "n", 6, 1, 100000), f = compileFn(e), h = (b - a) / n;
  let s = (f(a) + f(b)) / 2; for (let i = 1; i < n; i++) s += f(a + i * h);
  const T = s * h, ex = integrate(f, a, b);
  return { t: `Trapezoidal estimate ≈ ${f6(T)}`, e: `Accurate integral ≈ ${f6(ex)} · error ${f6(T - ex)} (${ex ? f6(((T - ex) / ex) * 100) : "—"}%)`, note: `n = ${n} trapezoids of width h = ${f6(h)}: T = h[(f(a) + f(b))/2 + Σ f(xᵢ)] · error shrinks about 4× when n doubles` };
};
export const telescope: Calc = (v) => {
  const e = txt(v, "f") || "1/n", N = int(v, "n", 100, 1, 1e7), s0 = int(v, "s", 1, -1e6, 1e6), f = compileFn(e, ["n"]);
  const S = f(s0) - f(N + 1), inf = Math.abs(f(1e9)) < 1e-6 ? 0 : f(1e9), lim = f(s0) - inf;
  return { s: `Sum from n = ${s0} to ${N} of [f(n) − f(n + 1)] = ${f6(S)}`, l: `Infinite sum → ${f6(lim)} (since f(n) → ${f6(inf)})`, note: `With f(n) = ${e}: all middle terms cancel, leaving f(${s0}) − f(${N + 1}) · e.g. 1/(n(n+1)) = 1/n − 1/(n+1)` };
};
// ---- Number theory & sequences ----
const seqBig = (n: number, a: bigint, b: bigint) => { let x = a, y = b; for (let i = 0; i < n; i++) [x, y] = [y, x + y]; return x; };
export const lucas: Calc = (v) => {
  const n = int(v, "n", 10, 0, 5000), L = seqBig(n, BigInt(2), BigInt(1)), first = Array.from({ length: Math.min(n + 1, 15) }, (_, i) => seqBig(i, BigInt(2), BigInt(1)).toString());
  return { l: `L(${n}) = ${big(L)}`, s: `Sequence: ${first.join(", ")}${n >= 15 ? ", …" : ""}`, note: `L(n) = L(n−1) + L(n−2), starting 2, 1 · L(n) = F(n−1) + F(n+1) · ratio → φ ≈ 1.618034` };
};
export const catalan: Calc = (v) => {
  const n = int(v, "n", 10, 0, 2000); let c = BigInt(1); for (let k = 0; k < n; k++) c = (c * BigInt(2) * (BigInt(2) * BigInt(k) + BigInt(1))) / (BigInt(k) + BigInt(2));
  const first: string[] = []; let d = BigInt(1); for (let k = 0; k < Math.min(n + 1, 12); k++) { first.push(d.toString()); d = (d * BigInt(2) * (BigInt(2) * BigInt(k) + BigInt(1))) / (BigInt(k) + BigInt(2)); }
  return { c: `C(${n}) = ${big(c)}`, s: `Sequence: ${first.join(", ")}${n >= 12 ? ", …" : ""}`, note: `C(n) = (BigInt(2))! / ((n + 1)! n!) — counts balanced bracket strings, binary trees with n nodes and ways to triangulate an (n+2)-gon` };
};
export const triangular: Calc = (v) => {
  const n = int(v, "n", 10, 0, 1e8), x = num(v.x, 55), T = (n * (n + 1)) / 2, r = (Math.sqrt(8 * x + 1) - 1) / 2;
  return { t: `T(${n}) = ${nfmt(T)}`, c: Number.isInteger(r) ? `${nfmt(x)} is triangular: T(${r})` : `${nfmt(x)} is not triangular (between T(${Math.floor(r)}) and T(${Math.ceil(r)}))`, note: "T(n) = n(n + 1)/2 = 1 + 2 + … + n · two consecutive triangular numbers add to a square" };
};
export const perfect: Calc = (v) => {
  const n = int(v, "n", 28, 1, 1e12); let s = 1; const d: number[] = [1];
  for (let i = 2; i * i <= n; i++) if (n % i === 0) { s += i; d.push(i); if (i * i !== n) { s += n / i; d.push(n / i); } }
  if (n === 1) s = 0;
  const kind = s === n ? "perfect" : s > n ? "abundant" : "deficient";
  return { r: `${nfmt(n)} is ${kind}`, s: `Sum of proper divisors = ${nfmt(s)}${d.length <= 30 ? ` (${d.sort((a, b) => a - b).join(" + ")})` : ""}`, note: "Perfect numbers: 6, 28, 496, 8,128, 33,550,336 … — every even one is 2^(p−1)(2^p − 1) with 2^p − 1 prime" };
};
export const nthPrime: Calc = (v) => {
  const n = int(v, "n", 100, 1, 2000000), lim = n < 6 ? 15 : Math.ceil(n * (Math.log(n) + Math.log(Math.log(n))) + 10), sv = new Uint8Array(lim + 1); let c = 0, p = 0;
  for (let i = 2; i <= lim; i++) { if (sv[i]) continue; c++; if (c === n) { p = i; break; } for (let j = i * i; j <= lim; j += i) sv[j] = 1; }
  return { p: `The ${nfmt(n)}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]} prime is ${nfmt(p)}`, e: `Estimate n·ln n ≈ ${nfmt(n * Math.log(n), 0)}`, note: "Prime number theorem: the nth prime is about n(ln n + ln ln n)" };
};
export const twinPrimes: Calc = (v) => {
  const a = int(v, "a", 1, 0, 1e8), b = int(v, "b", 200, 0, 1e8);
  if (b - a > 2e6) throw new InputError("Use a range of at most 2,000,000.");
  const out: string[] = []; let cnt = 0; for (let i = Math.max(3, a); i + 2 <= b; i++) if (isPrime(i) && isPrime(i + 2)) { cnt++; if (out.length < 40) out.push(`(${i}, ${i + 2})`); }
  return { t: `${cnt} twin prime pair${cnt === 1 ? "" : "s"} between ${nfmt(a)} and ${nfmt(b)}`, l: out.join(", ") + (cnt > 40 ? ", …" : "") || "None", note: "Twin primes differ by 2; whether there are infinitely many is still unproven" };
};
export const coprime: Calc = (v) => {
  const a = int(v, "a", 35, 1, 1e15), b = int(v, "b", 64, 1, 1e15), g = gcd(a, b);
  return { r: g === 1 ? `${nfmt(a)} and ${nfmt(b)} are coprime` : `Not coprime — they share the factor ${nfmt(g)}`, g: `GCD = ${nfmt(g)} · LCM = ${nfmt((a / g) * b)}`, note: "Coprime (relatively prime) numbers have no common factor except 1; they don't have to be prime themselves" };
};
export const divisors: Calc = (v) => {
  const n = int(v, "n", 360, 1, 1e12), d: number[] = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) { d.push(i); if (i * i !== n) d.push(n / i); }
  d.sort((a, b) => a - b);
  return { d: d.length <= 200 ? d.map((x) => nfmt(x)).join(", ") : `${d.slice(0, 100).join(", ")}, …`, c: `${d.length} divisors · sum ${nfmt(d.reduce((s, x) => s + x, 0))}`, note: `Divisor pairs multiply to ${nfmt(n)}: ${d.slice(0, Math.min(6, Math.ceil(d.length / 2))).map((x) => `${x}×${n / x}`).join(", ")}${d.length > 12 ? ", …" : ""}` };
};
const egcd = (a: number, b: number): [number, number, number] => { if (b === 0) return [a, 1, 0]; const [g, x, y] = egcd(b, a % b); return [g, y, x - Math.floor(a / b) * y]; };
export const dioph: Calc = (v) => {
  const a = int(v, "a", 12, -1e9, 1e9), b = int(v, "b", 18, -1e9, 1e9), c = int(v, "c", 30, -1e12, 1e12);
  if (!a || !b) throw new InputError("a and b can't be 0.");
  const [g0, x0, y0] = egcd(Math.abs(a), Math.abs(b)), g = Math.abs(g0);
  if (c % g) return { s: `No integer solutions — gcd(${a}, ${b}) = ${g} doesn't divide ${c}`, g: "—", note: "ax + by = c has integer solutions only when gcd(a, b) divides c" };
  const X = x0 * Math.sign(a) * (c / g), Y = y0 * Math.sign(b) * (c / g), dx = b / g, dy = a / g;
  return { s: `x = ${X} ${dx < 0 ? "−" : "+"} ${Math.abs(dx)}t, y = ${Y} ${dy > 0 ? "−" : "+"} ${Math.abs(dy)}t (t any integer)`, g: `Particular solution (${X}, ${Y}) · check: ${a}(${X}) + ${b}(${Y}) = ${a * X + b * Y}`, note: `gcd(${a}, ${b}) = ${g}, found with the extended Euclidean algorithm` };
};
const DIG = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const toBase = (n: bigint, b: number) => { if (n === BigInt(0)) return "0"; const neg = n < BigInt(0); let x = neg ? -n : n, s = ""; const B = BigInt(b); while (x > BigInt(0)) { s = DIG[Number(x % B)] + s; x /= B; } return (neg ? "-" : "") + s; };
const fromBase = (s: string, b: number) => { const t = s.trim().toUpperCase().replace(/^-/, ""); if (!t) throw new InputError("Enter a number."); let x = BigInt(0); for (const ch of t) { const d = DIG.indexOf(ch); if (d < 0 || d >= b) throw new InputError(`"${ch}" isn't a valid base-${b} digit.`); x = x * BigInt(b) + BigInt(d); } return s.trim().startsWith("-") ? -x : x; };
export const baseAny: Calc = (v) => {
  const s = txt(v, "s") || "255", f = int(v, "f", 10, 2, 36), t = int(v, "t", 16, 2, 36), x = fromBase(s, f);
  return { r: `${s.toUpperCase()} (base ${f}) = ${toBase(x, t)} (base ${t})`, o: `Decimal ${x.toString()} · binary ${toBase(x, 2)} · hex ${toBase(x, 16)}`, note: "Digits above 9 use letters A–Z (A = 10 … Z = 35)" };
};
export const octal: Calc = (v) => {
  const s = txt(v, "s") || "755", f = [8, 10, 2, 16][pick(v.f, 4)], x = fromBase(s, f);
  return { o: `Octal ${toBase(x, 8)}`, d: `Decimal ${x.toString()} · binary ${toBase(x, 2)} · hex ${toBase(x, 16)}`, note: f === 8 && /^[0-7]{3}$/.test(s) ? `Unix permissions ${s}: ${s.split("").map((c) => ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"][+c]).join(" ")}` : "Each octal digit = 3 binary bits" };
};
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALE = ["", "thousand", "million", "billion", "trillion", "quadrillion"];
const w999 = (n: number) => { const h = Math.floor(n / 100), r = n % 100, p: string[] = []; if (h) p.push(`${ONES[h]} hundred`); if (r) p.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : "")); return p.join(" "); };
const words = (n: bigint): string => { if (n === BigInt(0)) return "zero"; if (n < BigInt(0)) return `minus ${words(-n)}`; const parts: string[] = []; let i = 0; while (n > BigInt(0)) { const c = Number(n % BigInt(1000)); if (c) parts.unshift(`${w999(c)}${SCALE[i] ? ` ${SCALE[i]}` : ""}`); n /= BigInt(1000); i++; } return parts.join(" "); };
export const numWords: Calc = (v) => {
  const s = (txt(v, "s") || "1234567.89").replace(/[,\s]/g, ""), m = s.match(/^(-?\d{1,18})(?:\.(\d{1,2}))?$/);
  if (!m) throw new InputError("Enter a number with up to 18 digits and 2 decimals.");
  const w = words(BigInt(m[1])), cents = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return { w: w[0].toUpperCase() + w.slice(1) + (m[2] ? ` point ${m[2].split("").map((d) => ONES[+d] || "zero").join(" ")}` : ""), c: `Cheque style: ${w[0].toUpperCase() + w.slice(1)} dollars and ${String(cents).padStart(2, "0")}/100`, note: "US short scale (billion = 10⁹) · hyphenate twenty-one to ninety-nine" };
};
// ---- Fractions & integers ----
const frac = (s: string) => { const m = s.trim().match(/^(-?\d+)\s+(\d+)\/(\d+)$|^(-?\d+)\/(\d+)$|^(-?[\d.]+)$/); if (!m) throw new InputError(`Couldn't read "${s}" — use 3/4, 1 1/2 or 0.75.`); if (m[1]) { const w = +m[1]; return (Math.abs(w) + +m[2] / +m[3]) * (w < 0 ? -1 : 1); } if (m[4]) { if (+m[5] === 0) throw new InputError("Denominator can't be 0."); return +m[4] / +m[5]; } return +m[6]; };
export const orderFrac: Calc = (v) => {
  const items = (txt(v, "s") || "3/4, 2/3, 5/8, 7/12, 1 1/4").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean).map((x) => ({ t: x, v: frac(x) }));
  if (items.length < 2) throw new InputError("Enter at least two fractions.");
  const asc = pick(v.o, 2) === 0, s = [...items].sort((a, b) => (asc ? a.v - b.v : b.v - a.v));
  return { o: s.map((x) => x.t).join(asc ? " < " : " > "), d: s.map((x) => `${x.t} = ${f6(x.v)}`).join(" · "), note: "Compare by converting to decimals or to a common denominator" };
};
export const squareNum: Calc = (v) => {
  const x = num(v.n, 17), sq = x * x, r = Math.sqrt(Math.abs(x)), perfect = Number.isInteger(x) && x >= 0 && Number.isInteger(Math.round(r)) && Math.round(r) ** 2 === x;
  return { s: `${f6(x)}² = ${f6(sq)}`, r: `√${f6(x)} = ${x < 0 ? `${f6(r)}i` : f6(r)}${perfect ? ` — ${f6(x)} is a perfect square` : ""}`, note: Number.isInteger(x) ? `Neighbours: ${f6((x - 1) ** 2)}, ${f6(sq)}, ${f6((x + 1) ** 2)} · (n+1)² − n² = BigInt(2) + 1` : "Squares are always 0 or positive" };
};
export const cubeNum: Calc = (v) => {
  const x = num(v.n, 12), c = x ** 3, r = Math.cbrt(x), perfect = Number.isInteger(x) && Math.round(r) ** 3 === x;
  return { c: `${f6(x)}³ = ${f6(c)}`, r: `∛${f6(x)} = ${f6(r)}${perfect ? ` — ${f6(x)} is a perfect cube` : ""}`, note: `A cube with side ${f6(x)} has volume ${f6(c)} and surface area ${f6(6 * x * x)}` };
};
export const dblFact: Calc = (v) => {
  const n = int(v, "n", 9, -1, 3000); let r = BigInt(1); for (let k = n; k > 1; k -= 2) r *= BigInt(k);
  return { r: `${n}!! = ${big(r)}`, how: n > 1 ? `${Array.from({ length: Math.min(8, Math.ceil(n / 2)) }, (_, i) => n - 2 * i).filter((x) => x > 0).join(" × ")}${n > 16 ? " × …" : ""}` : "0!! = (−1)!! = 1 by definition", note: "n!! multiplies every other number down to 1 or 2 — not (n!)!" };
};
const fact = (n: number) => { let r = BigInt(1); for (let k = 2; k <= n; k++) r *= BigInt(k); return r; };
export const multinom: Calc = (v) => {
  const ks = (txt(v, "k") || "3, 2, 2").split(/[,\s;]+/).filter(Boolean).map(Number);
  if (!ks.length || ks.some((k) => !Number.isInteger(k) || k < 0 || k > 2000)) throw new InputError("Enter whole numbers like 3, 2, 2.");
  const n = ks.reduce((a, b) => a + b, 0); if (n > 3000) throw new InputError("Keep the total at 3,000 or less.");
  const r = ks.reduce((acc, k) => acc / fact(k), fact(n));
  return { r: `(${n}; ${ks.join(", ")}) = ${big(r)}`, how: `${n}! ÷ (${ks.map((k) => `${k}!`).join(" · ")})`, note: `Ways to arrange ${n} items with groups of identical items, e.g. letters of a word · coefficient of ${ks.map((k, i) => `x${i + 1}^${k}`).join("")} in (x1 + … + x${ks.length})^${n}` };
};
export const stirling: Calc = (v) => {
  const n = int(v, "n", 6, 0, 300), k = int(v, "k", 3, 0, 300), kind = pick(v.t, 2);
  if (k > n) return { s: "0", t: "k > n", note: "No ways" };
  let row: bigint[] = [BigInt(1)];
  for (let i = 1; i <= n; i++) { const nx: bigint[] = new Array(i + 1).fill(BigInt(0)); for (let j = 1; j <= i; j++) nx[j] = (row[j - 1] ?? BigInt(0)) + (kind === 0 ? BigInt(j) : BigInt(i - 1)) * (row[j] ?? BigInt(0)); row = nx; }
  return { s: `${kind === 0 ? "S" : "c"}(${n}, ${k}) = ${big(row[k] ?? BigInt(0))}`, t: kind === 0 ? `Ways to split ${n} labelled items into ${k} non-empty groups` : `Permutations of ${n} items with exactly ${k} cycles`, note: kind === 0 ? `Second kind: S(n, k) = k·S(n−1, k) + S(n−1, k−1) · Bell number B(${n}) = ${big(row.reduce((a, b) => a + b, BigInt(0)))}` : "Unsigned first kind: c(n, k) = (n−1)·c(n−1, k) + c(n−1, k−1)" };
};
export const derange: Calc = (v) => {
  const n = int(v, "n", 5, 0, 3000); let a = BigInt(1), b = BigInt(0); if (n === 0) b = BigInt(1); else { for (let i = 2; i <= n; i++) [a, b] = [b, BigInt(i - 1) * (a + b)]; if (n === 1) b = BigInt(0); }
  const D = n === 0 ? BigInt(1) : b;
  return { d: `!${n} = ${big(D)}`, p: `Probability nobody gets their own item: ${n ? f6(Number(D) / Number(fact(Math.min(n, 170)))) : "1"} (→ 1/e ≈ 0.367879)`, note: "!n = (n − 1)(!(n−1) + !(n−2)) — the 'secret Santa' or hat-check problem" };
};
export const contFrac: Calc = (v) => {
  const m = pick(v.m, 2);
  if (m === 0) {
    let x = num(v.x, 3.14159265); const terms: number[] = [], x0 = x;
    for (let i = 0; i < 10; i++) { const a = Math.floor(x); terms.push(a); const f = x - a; if (Math.abs(f) < 1e-9) break; x = 1 / f; }
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1; const conv: string[] = [];
    for (const a of terms) { [h1, h0] = [a * h1 + h0, h1]; [k1, k0] = [a * k1 + k0, k1]; if (conv.length < 8) conv.push(`${h1}/${k1}`); }
    return { c: `[${terms[0]}; ${terms.slice(1).join(", ")}]`, v: `Convergents: ${conv.join(", ")}`, note: `${f6(x0)} — each convergent is the best rational approximation for its denominator size` };
  }
  const t = (txt(v, "t") || "1, 2, 2, 2, 2").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (t.some((x) => !Number.isFinite(x))) throw new InputError("Enter terms like 1, 2, 2, 2.");
  let n = 1, d = 0; for (let i = t.length - 1; i >= 0; i--) [n, d] = [t[i] * n + d, n];
  const g = gcd(n, d) || 1;
  return { c: `[${t[0]}; ${t.slice(1).join(", ")}] = ${n / g}/${d / g}`, v: `= ${f6(n / d)}`, note: "Evaluated from the last term back: a0 + 1/(a1 + 1/(a2 + …))" };
};
export const egyptian: Calc = (v) => {
  const d = int(v, "d", 15, 1, 1e6); let n = int(v, "n", 7, 1, 1e6); const w = Math.floor(n / d); n %= d;
  const out: string[] = []; let N = BigInt(n), D = BigInt(d);
  while (N > BigInt(0) && out.length < 30) { const c = (D + N - BigInt(1)) / N; out.push(`1/${c}`); N = N * c - D; D = D * c; const g = bgcd(N, D); if (g > BigInt(1)) { N /= g; D /= g; } }
  return { e: `${w ? `${w} + ` : ""}${out.join(" + ") || "0"}`, n: `${out.length} unit fraction${out.length === 1 ? "" : "s"}`, note: "Greedy (Fibonacci–Sylvester) method: always take the largest unit fraction that fits" };
};
export const collatz: Calc = (v) => {
  let n = int(v, "n", 27, 1, 1e15); const s0 = n, seq: number[] = [n]; let mx = n, steps = 0;
  while (n !== 1 && steps < 10000) { n = n % 2 ? 3 * n + 1 : n / 2; steps++; mx = Math.max(mx, n); if (seq.length < 60) seq.push(n); }
  return { s: `${nfmt(steps)} steps to reach 1`, q: seq.map((x) => nfmt(x)).join(" → ") + (steps >= 60 ? " → …" : ""), note: `Peak value ${nfmt(mx)} · even: n/2, odd: BigInt(3) + 1 — the conjecture that every start reaches 1 is unproven (start ${nfmt(s0)})` };
};
export const palindrome: Calc = (v) => {
  const s = (txt(v, "n") || "12321").replace(/[,\s]/g, ""), b = int(v, "b", 10, 2, 36), x = fromBase(s, 10), r = toBase(x < BigInt(0) ? -x : x, b);
  let n = x < BigInt(0) ? -x : x, st = 0; const rev = (y: bigint) => BigInt(y.toString().split("").reverse().join(""));
  while (n !== rev(n) && st < 100) { n += rev(n); st++; }
  return { r: r === r.split("").reverse().join("") ? `${r} is a palindrome in base ${b}` : `${r} is not a palindrome in base ${b}`, l: st === 0 ? "Already a decimal palindrome" : st < 100 ? `Reverse-and-add reaches the palindrome ${big(n)} in ${st} step${st > 1 ? "s" : ""}` : "No palindrome after 100 reverse-and-add steps (possible Lychrel number, like 196)", note: "A palindromic number reads the same forwards and backwards" };
};
export const armstrong: Calc = (v) => {
  const n = int(v, "n", 153, 0, 1e15), d = String(n).split("").map(Number), k = d.length, s = d.reduce((a, x) => a + x ** k, 0);
  return { r: s === n ? `${nfmt(n)} is an Armstrong (narcissistic) number` : `${nfmt(n)} is not an Armstrong number`, how: `${d.map((x) => `${x}^${k}`).join(" + ")} = ${nfmt(s)}`, note: "3-digit Armstrong numbers: 153, 370, 371, 407" };
};
export const happy: Calc = (v) => {
  let n = int(v, "n", 19, 1, 1e15); const seen = new Set<number>(), seq = [n];
  while (n !== 1 && !seen.has(n)) { seen.add(n); n = String(n).split("").reduce((a, c) => a + (+c) ** 2, 0); seq.push(n); }
  return { r: n === 1 ? `${nfmt(seq[0])} is a happy number` : `${nfmt(seq[0])} is unhappy (it loops)`, s: seq.slice(0, 25).join(" → "), note: "Repeatedly add the squares of the digits: happy numbers reach 1; the rest fall into the cycle 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4" };
};

// ---- registry (generated)
export const ideaMath1CustomCalculators: Record<string, Calc> = {
  "absolute-value-inequality-calculator": absIneq,
  "compound-inequality-calculator": compIneq,
  "quadratic-inequality-calculator": quadIneq,
  "system-of-inequalities-calculator": sysIneq,
  "two-variable-linear-system-graph-calculator": lin2,
  "sum-and-product-of-roots-calculator": sumProd,
  "asymptote-finder-calculator": asym,
  "end-behavior-calculator": endBehavior,
  "logarithm-change-of-base-calculator": changeBase,
  "rationalize-the-denominator-calculator": rationalize,
  "de-moivres-theorem-calculator": deMoivre,
  "imaginary-number-powers-calculator": iPow,
  "scalar-triple-product-calculator": triple,
  "spherical-coordinates-calculator": spherical,
  "shell-method-volume-calculator": shell,
  "trapezoidal-rule-calculator": trapezoid,
  "telescoping-series-calculator": telescope,
  "lucas-number-calculator": lucas,
  "catalan-number-calculator": catalan,
  "triangular-number-calculator": triangular,
  "perfect-number-checker-calculator": perfect,
  "nth-prime-calculator": nthPrime,
  "twin-primes-calculator": twinPrimes,
  "coprime-checker-calculator": coprime,
  "divisors-of-a-number-calculator": divisors,
  "diophantine-equation-calculator": dioph,
  "base-converter-any-base-calculator": baseAny,
  "octal-converter-calculator": octal,
  "number-to-words-calculator": numWords,
  "ordering-fractions-calculator": orderFrac,
  "square-number-calculator": squareNum,
  "cube-number-calculator": cubeNum,
  "double-factorial-calculator": dblFact,
  "multinomial-coefficient-calculator": multinom,
  "stirling-number-calculator": stirling,
  "derangement-calculator": derange,
  "continued-fraction-calculator": contFrac,
  "egyptian-fraction-calculator": egyptian,
  "collatz-sequence-calculator": collatz,
  "palindrome-number-checker-calculator": palindrome,
  "armstrong-number-calculator": armstrong,
  "happy-number-calculator": happy,
};
