/**
 * Idea build, batch math2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Math — puzzles & discrete maths (9),
 * geometry (19) and elementary maths (3) = 31 tools. Standard formulas only.
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt } from "./trv-core";
import { txt, fmt } from "./sci-math-core";

const f6 = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 6);
const pos = (v: Record<string, number>, k: string, d: number, name: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${name} must be greater than 0.`); return x; };
const int = (v: Record<string, number>, k: string, d: number, lo: number, hi: number) => { const x = Math.round(num(v[k], d)); if (x < lo || x > hi) throw new InputError(`Enter a whole number from ${lo} to ${hi}.`); return x; };
const PI = Math.PI, D = PI / 180;
const items = (s: string) => s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

// ---- Puzzles & discrete ----
export const magicSquare: Calc = (v) => {
  const n = int(v, "n", 3, 3, 12), M: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  if (n % 2) { let i = 0, j = Math.floor(n / 2); for (let k = 1; k <= n * n; k++) { M[i][j] = k; const ni = (i - 1 + n) % n, nj = (j + 1) % n; if (M[ni][nj]) i = (i + 1) % n; else { i = ni; j = nj; } } }
  else if (n % 4 === 0) { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = i * n + j + 1, keep = (i % 4 === j % 4) || ((i % 4) + (j % 4) === 3); M[i][j] = keep ? n * n + 1 - k : k; } }
  else { const h = n / 2, s: number[][] = []; { let i = 0, j = Math.floor(h / 2); for (let a = 0; a < h; a++) s.push(new Array(h).fill(0)); for (let k = 1; k <= h * h; k++) { s[i][j] = k; const ni = (i - 1 + h) % h, nj = (j + 1) % h; if (s[ni][nj]) i = (i + 1) % h; else { i = ni; j = nj; } } }
    const add = [0, 2, 3, 1].map((q) => q * h * h), kk = (n - 2) / 4;
    for (let i = 0; i < h; i++) for (let j = 0; j < h; j++) { M[i][j] = s[i][j] + add[0]; M[i + h][j + h] = s[i][j] + add[3]; M[i][j + h] = s[i][j] + add[1]; M[i + h][j] = s[i][j] + add[2]; }
    for (let i = 0; i < h; i++) { const cols: number[] = []; for (let j = 0; j < kk; j++) cols.push(i === Math.floor(h / 2) ? j + 1 : j); for (let j = n - kk + 1; j < n; j++) cols.push(j); for (const j of cols) [M[i][j], M[i + h][j]] = [M[i + h][j], M[i][j]]; } }
  const mc = (n * (n * n + 1)) / 2;
  return { m: M.map((r) => r.join("  ")).join(" / "), c: `Magic constant ${nfmt(mc)} — every row, column and diagonal adds to it`, note: `${n}×${n} using ${n % 2 ? "the Siamese (de la Loubère) method" : n % 4 === 0 ? "the doubly-even diagonal method" : "the LUX/Strachey method"} · rows separated by /` };
};
export const sudoku: Calc = (v) => {
  const raw = (txt(v, "g") || "530070000600195000098000060800060003400803001700020006060000280000419005000080079").replace(/[^0-9.]/g, "").replace(/\./g, "0");
  if (raw.length !== 81) throw new InputError(`Enter 81 digits (0 or . for blanks) — got ${raw.length}.`);
  const g = raw.split("").map(Number), ok = (i: number, d: number) => { const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3); for (let k = 0; k < 9; k++) if (g[r * 9 + k] === d || g[k * 9 + c] === d || g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) return false; return true; };
  for (let i = 0; i < 81; i++) if (g[i]) { const d = g[i]; g[i] = 0; if (!ok(i, d)) throw new InputError("The puzzle breaks the rules (a repeated digit)."); g[i] = d; }
  let steps = 0; const solve = (): boolean => { let best = -1, bc: number[] = []; for (let i = 0; i < 81; i++) if (!g[i]) { const c: number[] = []; for (let d = 1; d <= 9; d++) if (ok(i, d)) c.push(d); if (best < 0 || c.length < bc.length) { best = i; bc = c; if (!c.length) return false; } } if (best < 0) return true; for (const d of bc) { g[best] = d; steps++; if (steps > 2e6) return false; if (solve()) return true; } g[best] = 0; return false; };
  if (!solve()) throw new InputError("No solution found for this grid.");
  const rows = Array.from({ length: 9 }, (_, r) => g.slice(r * 9, r * 9 + 9).join(""));
  return { s: rows.join(" / "), r: `Solved after ${nfmt(steps)} guesses`, note: `Givens: ${raw.split("").filter((c) => c !== "0").length} · rows separated by /` };
};
export const venn3: Calc = (v) => {
  const [a, b, c, ab, ac, bc, abc, U] = ["a", "b", "c", "ab", "ac", "bc", "abc", "u"].map((k, i) => Math.max(0, num(v[k], [40, 35, 30, 12, 10, 8, 4, 100][i])));
  const onlyAB = ab - abc, onlyAC = ac - abc, onlyBC = bc - abc, oA = a - onlyAB - onlyAC - abc, oB = b - onlyAB - onlyBC - abc, oC = c - onlyAC - onlyBC - abc, uni = a + b + c - ab - ac - bc + abc;
  if ([onlyAB, onlyAC, onlyBC, oA, oB, oC].some((x) => x < 0)) throw new InputError("Those counts are inconsistent — an overlap is bigger than a set.");
  return { u: `|A ∪ B ∪ C| = ${f6(uni)}${U ? ` · outside all three: ${f6(U - uni)}` : ""}`, r: `Only A ${f6(oA)} · only B ${f6(oB)} · only C ${f6(oC)} · A∩B only ${f6(onlyAB)} · A∩C only ${f6(onlyAC)} · B∩C only ${f6(onlyBC)} · all three ${f6(abc)}`, note: "Inclusion–exclusion: |A∪B∪C| = |A| + |B| + |C| − |A∩B| − |A∩C| − |B∩C| + |A∩B∩C|" };
};
export const powerSet: Calc = (v) => {
  const s = [...new Set(items(txt(v, "s") || "a, b, c"))];
  if (s.length > 12) throw new InputError("Use at most 12 elements (4,096 subsets).");
  const subs: string[] = []; for (let m = 0; m < 1 << s.length; m++) subs.push(`{${s.filter((_, i) => m & (1 << i)).join(", ")}}`);
  subs.sort((x, y) => x.length - y.length);
  return { p: subs.length <= 128 ? subs.join(", ") : `${subs.slice(0, 128).join(", ")}, …`, n: `${nfmt(subs.length)} subsets (2^${s.length})`, note: "The power set includes the empty set {} and the set itself" };
};
export const cartesian: Calc = (v) => {
  const A = [...new Set(items(txt(v, "a") || "1, 2, 3"))], B = [...new Set(items(txt(v, "b") || "x, y"))];
  if (A.length * B.length > 2000) throw new InputError("Keep |A| × |B| at 2,000 or less.");
  const pairs = A.flatMap((x) => B.map((y) => `(${x}, ${y})`));
  return { p: pairs.length <= 200 ? pairs.join(", ") : `${pairs.slice(0, 200).join(", ")}, …`, n: `|A × B| = ${A.length} × ${B.length} = ${pairs.length}`, note: "A × B ≠ B × A in general — order inside each pair matters" };
};
const edges = (s: string) => s.split(/[;,\n]+/).map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(\S+)\s*[-–>]+\s*(\S+)\s+(-?[\d.]+)$/) || l.match(/^(\S+)\s+(\S+)\s+(-?[\d.]+)$/); if (!m) throw new InputError(`Couldn't read "${l}" — write edges like A-B 4.`); return { u: m[1], v: m[2], w: Number(m[3]) }; });
export const dijkstra: Calc = (v) => {
  const E = edges(txt(v, "e") || "A-B 4; A-C 2; B-C 1; B-D 5; C-D 8; C-E 10; D-E 2; D-F 6; E-F 3"), dir = pick(v.d, 2) === 1, s = (txt(v, "s") || "A").trim(), t = (txt(v, "t") || "F").trim();
  if (E.some((e) => e.w < 0)) throw new InputError("Dijkstra's algorithm needs non-negative weights.");
  const adj = new Map<string, [string, number][]>(), add = (a: string, b: string, w: number) => { if (!adj.has(a)) adj.set(a, []); adj.get(a)!.push([b, w]); if (!adj.has(b)) adj.set(b, []); };
  for (const e of E) { add(e.u, e.v, e.w); if (!dir) add(e.v, e.u, e.w); }
  if (!adj.has(s) || !adj.has(t)) throw new InputError("Start and end must be nodes in the edge list.");
  const dist = new Map<string, number>([[s, 0]]), prev = new Map<string, string>(), done = new Set<string>();
  while (true) { let u = "", best = Infinity; for (const [k, d] of dist) if (!done.has(k) && d < best) { best = d; u = k; } if (!u) break; done.add(u); for (const [w, c] of adj.get(u) || []) if (best + c < (dist.get(w) ?? Infinity)) { dist.set(w, best + c); prev.set(w, u); } }
  if (!dist.has(t)) return { d: `No path from ${s} to ${t}`, p: "—", note: "The nodes aren't connected" };
  const path = [t]; while (path[0] !== s) path.unshift(prev.get(path[0])!);
  return { d: `Shortest distance ${s} → ${t}: ${f6(dist.get(t)!)}`, p: path.join(" → "), note: `All distances from ${s}: ${[...dist].sort((a, b) => a[1] - b[1]).map(([k, d]) => `${k} ${f6(d)}`).join(", ")}` };
};
export const mst: Calc = (v) => {
  const E = edges(txt(v, "e") || "A-B 4; A-C 2; B-C 1; B-D 5; C-D 8; C-E 10; D-E 2; D-F 6; E-F 3").sort((a, b) => a.w - b.w), par = new Map<string, string>();
  const find = (x: string): string => { if (!par.has(x)) par.set(x, x); const p = par.get(x)!; if (p === x) return x; const r = find(p); par.set(x, r); return r; };
  const used: typeof E = []; for (const e of E) { const a = find(e.u), b = find(e.v); if (a !== b) { par.set(a, b); used.push(e); } }
  const nodes = new Set(E.flatMap((e) => [e.u, e.v])), comps = new Set([...nodes].map(find)).size;
  return { t: `Minimum spanning ${comps > 1 ? "forest" : "tree"} weight ${f6(used.reduce((s, e) => s + e.w, 0))}`, e: used.map((e) => `${e.u}-${e.v} (${f6(e.w)})`).join(", "), note: `Kruskal's algorithm: ${used.length} edges connect ${nodes.size} nodes${comps > 1 ? ` in ${comps} separate components` : ""}` };
};
export const nash: Calc = (v) => {
  const [a11, a12, a21, a22, b11, b12, b21, b22] = ["a", "b", "c", "d", "e", "f", "g", "h"].map((k, i) => num(v[k], [3, 0, 5, 1, 3, 5, 0, 1][i]));
  const A = [[a11, a12], [a21, a22]], B = [[b11, b12], [b21, b22]], pure: string[] = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (A[i][j] >= A[1 - i][j] && B[i][j] >= B[i][1 - j]) pure.push(`(Row ${i + 1}, Col ${j + 1}) → payoffs (${f6(A[i][j])}, ${f6(B[i][j])})`);
  const dq = a11 - a12 - a21 + a22, dp = b11 - b12 - b21 + b22, q = dq ? (a22 - a12) / dq : NaN, p = dp ? (b22 - b21) / dp : NaN;
  const mixed = p > 0 && p < 1 && q > 0 && q < 1 ? `Row plays 1 with p = ${f6(p)}, Column plays 1 with q = ${f6(q)} · expected payoffs (${f6(p * q * a11 + p * (1 - q) * a12 + (1 - p) * q * a21 + (1 - p) * (1 - q) * a22)}, ${f6(p * q * b11 + p * (1 - q) * b12 + (1 - p) * q * b21 + (1 - p) * (1 - q) * b22)})` : "No fully mixed equilibrium";
  return { p: pure.length ? pure.join(" · ") : "No pure-strategy equilibrium", m: mixed, note: "Each player's mix makes the other indifferent · default payoffs are the classic Prisoner's Dilemma (cooperate = 1, defect = 2)" };
};
export const markov: Calc = (v) => {
  const rows = (txt(v, "m") || "0.9 0.1; 0.5 0.5").split(/[;\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).map(Number));
  const n = rows.length;
  if (n < 2 || n > 10 || rows.some((r) => r.length !== n || r.some((x) => !Number.isFinite(x) || x < 0))) throw new InputError("Enter a square matrix of probabilities, rows separated by ; (e.g. 0.9 0.1; 0.5 0.5).");
  if (rows.some((r) => Math.abs(r.reduce((a, b) => a + b, 0) - 1) > 1e-6)) throw new InputError("Each row must add up to 1.");
  let pi = new Array(n).fill(1 / n); for (let it = 0; it < 10000; it++) { const nx = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nx[j] += pi[i] * rows[i][j]; const diff = nx.reduce((s, x, i) => s + Math.abs(x - pi[i]), 0); pi = nx; if (diff < 1e-13) break; }
  const st = (txt(v, "s") || "").trim(), k = int(v, "k", 3, 0, 1000); let d = new Array(n).fill(0); d[Math.min(n - 1, Math.max(0, (Number(st) || 1) - 1))] = 1;
  for (let it = 0; it < k; it++) { const nx = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nx[j] += d[i] * rows[i][j]; d = nx; }
  return { s: `Steady state π = (${pi.map(f6).join(", ")})`, k: `After ${k} steps from state ${Number(st) || 1}: (${d.map(f6).join(", ")})`, note: `Long-run share of time in each state · mean return times ${pi.map((x) => (x > 0 ? f6(1 / x) : "∞")).join(", ")}` };
};
export const pyTriples: Calc = (v) => {
  const L = int(v, "n", 100, 5, 100000), prim = pick(v.p, 2) === 0, out: [number, number, number][] = [];
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  for (let m = 2; m * m < L; m++) for (let n = 1; n < m; n++) { if ((m - n) % 2 === 0 || gcd(m, n) !== 1) continue; const a = m * m - n * n, b = 2 * m * n, c = m * m + n * n; for (let k = 1; k * c <= L; k++) { if (prim && k > 1) break; out.push([Math.min(a, b) * k, Math.max(a, b) * k, c * k]); } }
  out.sort((x, y) => x[2] - y[2] || x[0] - y[0]);
  return { t: out.slice(0, 80).map((x) => `(${x.join(", ")})`).join(" ") + (out.length > 80 ? " …" : ""), n: `${out.length} ${prim ? "primitive " : ""}triples with hypotenuse ≤ ${nfmt(L)}`, note: "Euclid's formula: a = m² − n², b = 2mn, c = m² + n² (m > n, coprime, not both odd)" };
};
// ---- Geometry ----
export const rhombus: Calc = (v) => {
  const m = pick(v.m, 3), a = num(v.a, 60);
  let A: number, side: number, d1: number, d2: number;
  if (m === 0) { d1 = pos(v, "p", 8, "Diagonal 1"); d2 = pos(v, "q", 6, "Diagonal 2"); A = (d1 * d2) / 2; side = Math.hypot(d1, d2) / 2; }
  else if (m === 1) { side = pos(v, "s", 5, "Side"); A = side * side * Math.sin(a * D); d1 = 2 * side * Math.cos((a * D) / 2); d2 = 2 * side * Math.sin((a * D) / 2); }
  else { side = pos(v, "s", 5, "Side"); const h = pos(v, "h", 4, "Height"); A = side * h; const ang = Math.asin(Math.min(1, h / side)); d1 = 2 * side * Math.cos(ang / 2); d2 = 2 * side * Math.sin(ang / 2); }
  return { a: `Area = ${f6(A)}`, d: `Side ${f6(side)} · diagonals ${f6(d1)} and ${f6(d2)} · perimeter ${f6(4 * side)}`, note: "Area = d₁d₂/2 = s² sin θ = base × height · diagonals bisect each other at right angles" };
};
export const annulus: Calc = (v) => {
  const R = pos(v, "r", 10, "Outer radius"), r = num(v.i, 6);
  if (r < 0 || r >= R) throw new InputError("The inner radius must be between 0 and the outer radius.");
  const A = PI * (R * R - r * r);
  return { a: `Area = ${f6(A)} (${f6(R * R - r * r)}π)`, p: `Outer circumference ${f6(2 * PI * R)} · inner ${f6(2 * PI * r)} · width ${f6(R - r)}`, note: `Equals the area of a circle with radius ${f6(Math.sqrt(R * R - r * r))} (half the longest chord touching the inner circle)` };
};
export const segment: Calc = (v) => {
  const r = pos(v, "r", 10, "Radius"), m = pick(v.m, 2); let th: number;
  if (m === 0) th = num(v.a, 90) * D; else { const h = num(v.h, 3); if (h <= 0 || h > 2 * r) throw new InputError("Height must be between 0 and the diameter."); th = 2 * Math.acos((r - h) / r); }
  const A = (r * r * (th - Math.sin(th))) / 2, chord = 2 * r * Math.sin(th / 2), arc = r * th, h = r * (1 - Math.cos(th / 2));
  return { a: `Segment area = ${f6(A)}`, d: `Central angle ${f6(th / D)}° · chord ${f6(chord)} · arc ${f6(arc)} · height ${f6(h)}`, note: `Area = r²(θ − sin θ)/2 · that's ${f6((A / (PI * r * r)) * 100)}% of the circle` };
};
export const inscribed: Calc = (v) => {
  const m = pick(v.m, 2), x = num(v.a, 50);
  if (x <= 0 || x >= 360) throw new InputError("Enter an angle between 0 and 360°.");
  const ins = m === 0 ? x / 2 : x, cen = m === 0 ? x : 2 * x;
  return { i: `Inscribed angle = ${f6(ins)}°`, c: `Central angle (and intercepted arc) = ${f6(cen)}°`, note: "Inscribed angle theorem: an inscribed angle is half the central angle on the same arc · an angle in a semicircle is 90°" };
};
export const tangent: Calc = (v) => {
  const r = pos(v, "r", 5, "Radius"), d = num(v.d, 13);
  if (d <= r) throw new InputError("The point must be outside the circle (distance > radius).");
  const L = Math.sqrt(d * d - r * r), ang = 2 * Math.asin(r / d);
  return { l: `Tangent length = ${f6(L)}`, a: `Angle between the two tangents ${f6(ang / D)}° · angle at the centre ${f6(180 - ang / D)}°`, note: "Tangent ⟂ radius at the point of contact, so L = √(d² − r²) · both tangents from a point are equal" };
};
export const frustum: Calc = (v) => {
  const R = pos(v, "r1", 6, "Bottom radius"), r = Math.max(0, num(v.r2, 3)), h = pos(v, "h", 8, "Height"), s = Math.hypot(h, R - r);
  const V = (PI * h * (R * R + R * r + r * r)) / 3;
  return { v: `Volume = ${f6(V)}`, s: `Slant height ${f6(s)} · lateral area ${f6(PI * (R + r) * s)} · total surface ${f6(PI * (R + r) * s + PI * (R * R + r * r))}`, note: "V = πh(R² + Rr + r²)/3 — a cone with its top cut off" };
};
export const torus: Calc = (v) => {
  const R = pos(v, "R", 10, "Major radius"), r = pos(v, "r", 3, "Minor radius");
  return { v: `Volume = ${f6(2 * PI * PI * R * r * r)}`, s: `Surface area = ${f6(4 * PI * PI * R * r)}`, note: `${r > R ? "Spindle torus (self-intersecting)" : r === R ? "Horn torus" : "Ring torus"} · V = 2π²Rr², A = 4π²Rr · inner radius ${f6(Math.max(0, R - r))}, outer ${f6(R + r)}` };
};
export const capsule: Calc = (v) => {
  const r = pos(v, "r", 2, "Radius"), L = Math.max(0, num(v.l, 6));
  return { v: `Volume = ${f6(PI * r * r * L + (4 / 3) * PI * r ** 3)}`, s: `Surface area = ${f6(2 * PI * r * L + 4 * PI * r * r)} · total length ${f6(L + 2 * r)}`, note: "Cylinder of length L plus a sphere (two hemispheres) of radius r" };
};
export const sphCap: Calc = (v) => {
  const r = pos(v, "r", 10, "Sphere radius"), h = num(v.h, 4);
  if (h <= 0 || h > 2 * r) throw new InputError("Cap height must be between 0 and the diameter.");
  const a = Math.sqrt(h * (2 * r - h)), V = (PI * h * h * (3 * r - h)) / 3;
  return { v: `Cap volume = ${f6(V)}`, s: `Base radius ${f6(a)} · curved surface ${f6(2 * PI * r * h)} · ${f6((V / ((4 / 3) * PI * r ** 3)) * 100)}% of the sphere`, note: "V = πh²(3r − h)/3 · curved area = 2πrh" };
};
export const cuboid: Calc = (v) => {
  const l = pos(v, "l", 4, "Length"), w = pos(v, "w", 3, "Width"), h = pos(v, "h", 12, "Height");
  return { d: `Space diagonal = ${f6(Math.sqrt(l * l + w * w + h * h))}`, f: `Face diagonals: ${f6(Math.hypot(l, w))} (l×w), ${f6(Math.hypot(l, h))} (l×h), ${f6(Math.hypot(w, h))} (w×h)`, note: `Volume ${f6(l * w * h)} · surface area ${f6(2 * (l * w + l * h + w * h))} · d = √(l² + w² + h²)` };
};
export const ptLine: Calc = (v) => {
  const a = num(v.a, 3), b = num(v.b, 4), c = num(v.c, -10), x = num(v.x, 5), y = num(v.y, 6), n = Math.hypot(a, b);
  if (!n) throw new InputError("a and b can't both be 0.");
  const d = (a * x + b * y + c) / n;
  return { d: `Distance = ${f6(Math.abs(d))}`, f: `Foot of perpendicular (${f6(x - (a * d) / n)}, ${f6(y - (b * d) / n)})`, note: `|ax₀ + by₀ + c| / √(a² + b²) for ${f6(a)}x + ${f6(b)}y + ${f6(c)} = 0` };
};
export const lineInt: Calc = (v) => {
  const [x1, y1, x2, y2, x3, y3, x4, y4] = ["a", "b", "c", "d", "e", "f", "g", "h"].map((k, i) => num(v[k], [0, 0, 4, 4, 0, 4, 4, 0][i]));
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-12) return { p: "The lines are parallel (or the same line)", s: "No single intersection", note: "Equal slopes" };
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den, X = x1 + t * (x2 - x1), Y = y1 + t * (y2 - y1);
  const ang = Math.abs(Math.atan2(y2 - y1, x2 - x1) - Math.atan2(y4 - y3, x4 - x3)) / D;
  return { p: `Intersection (${f6(X)}, ${f6(Y)})`, s: t >= 0 && t <= 1 && u >= 0 && u <= 1 ? "The segments cross" : "The lines cross, but outside at least one segment", note: `Angle between lines ${f6(Math.min(ang % 180, 180 - (ang % 180)))}°` };
};
export const shoelace: Calc = (v) => {
  const nums = (txt(v, "p") || "(0,0) (4,0) (4,3) (0,3)").match(/-?\d*\.?\d+(?:e-?\d+)?/gi)?.map(Number) || [];
  if (nums.length < 6 || nums.length % 2) throw new InputError("Enter at least 3 points as x,y pairs.");
  const P: [number, number][] = []; for (let i = 0; i < nums.length; i += 2) P.push([nums[i], nums[i + 1]]);
  let s = 0, per = 0, cx = 0, cy = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], cr = x1 * y2 - x2 * y1; s += cr; per += Math.hypot(x2 - x1, y2 - y1); cx += (x1 + x2) * cr; cy += (y1 + y2) * cr; }
  const A = s / 2;
  return { a: `Area = ${f6(Math.abs(A))}`, p: `Perimeter ${f6(per)} · centroid (${A ? f6(cx / (6 * A)) : "—"}, ${A ? f6(cy / (6 * A)) : "—"})`, note: `${P.length} vertices listed ${A > 0 ? "counter-clockwise" : "clockwise"} · shoelace formula A = ½|Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| (vertices must be in order, no self-crossing)` };
};
export const rotate: Calc = (v) => {
  const x = num(v.x, 3), y = num(v.y, 1), a = num(v.a, 90) * D, cx = num(v.h, 0), cy = num(v.k, 0), dir = pick(v.d, 2) === 1 ? -1 : 1;
  const dx = x - cx, dy = y - cy, c = Math.cos(dir * a), s = Math.sin(dir * a);
  return { p: `(${f6(x)}, ${f6(y)}) → (${f6(cx + dx * c - dy * s)}, ${f6(cy + dx * s + dy * c)})`, how: `Rotate ${f6(a / D)}° ${dir > 0 ? "counter-clockwise" : "clockwise"} about (${f6(cx)}, ${f6(cy)})`, note: "x′ = h + (x − h)cos θ − (y − k)sin θ, y′ = k + (x − h)sin θ + (y − k)cos θ · 90° CCW about the origin: (x, y) → (−y, x)" };
};
export const reflect: Calc = (v) => {
  const x = num(v.x, 3), y = num(v.y, 1), m = pick(v.m, 6), a = num(v.a, 1), b = num(v.b, -1), c = num(v.c, 2);
  const [lx, ly, name] = m === 0 ? [x, -y, "the x-axis"] : m === 1 ? [-x, y, "the y-axis"] : m === 2 ? [y, x, "y = x"] : m === 3 ? [-y, -x, "y = −x"] : m === 4 ? [-x, -y, "the origin"] : (() => { const d = (a * x + b * y + c) / (a * a + b * b); return [x - 2 * a * d, y - 2 * b * d, `${f6(a)}x + ${f6(b)}y + ${f6(c)} = 0`]; })();
  if (m === 5 && !(a || b)) throw new InputError("a and b can't both be 0.");
  return { p: `(${f6(x)}, ${f6(y)}) → (${f6(lx as number)}, ${f6(ly as number)})`, how: `Reflected over ${name}`, note: "Rules: x-axis (x, −y) · y-axis (−x, y) · y = x (y, x) · y = −x (−y, −x) · origin (−x, −y)" };
};
export const dblAngle: Calc = (v) => {
  const t = num(v.a, 30) * D, s = Math.sin(t), c = Math.cos(t);
  return { s: `sin 2θ = 2 sin θ cos θ = ${f6(2 * s * c)}`, c: `cos 2θ = cos²θ − sin²θ = ${f6(c * c - s * s)} · tan 2θ = ${Math.abs(c * c - s * s) < 1e-12 ? "undefined" : f6((2 * Math.tan(t)) / (1 - Math.tan(t) ** 2))}`, note: `θ = ${f6(t / D)}°: sin θ = ${f6(s)}, cos θ = ${f6(c)} · half-angle: sin(θ/2) = ±√((1 − cos θ)/2) = ${f6(Math.sin(t / 2))}` };
};
export const sumDiff: Calc = (v) => {
  const A = num(v.a, 45) * D, B = num(v.b, 30) * D;
  return { s: `sin(A + B) = ${f6(Math.sin(A + B))} · sin(A − B) = ${f6(Math.sin(A - B))}`, c: `cos(A + B) = ${f6(Math.cos(A + B))} · cos(A − B) = ${f6(Math.cos(A - B))} · tan(A + B) = ${Math.abs(Math.cos(A + B)) < 1e-12 ? "undefined" : f6(Math.tan(A + B))}`, note: "sin(A ± B) = sin A cos B ± cos A sin B · cos(A ± B) = cos A cos B ∓ sin A sin B · e.g. 75° = 45° + 30°" };
};
// ---- Elementary ----
export const timesTable: Calc = (v) => {
  const n = num(v.n, 7), to = int(v, "t", 12, 1, 100);
  return { t: Array.from({ length: to }, (_, i) => `${f6(n)} × ${i + 1} = ${f6(n * (i + 1))}`).join(" · "), s: `Sum of the table: ${f6((n * to * (to + 1)) / 2)}`, note: Number.isInteger(n) && n >= 2 && n <= 12 ? ["", "", "Even numbers", "Digits add to 3, 6 or 9", "Double the 2s", "Ends in 0 or 5", "Even multiples of 3", "Learn 7 × 7 = 49, 7 × 8 = 56", "Double the 4s", "Digits add to 9 (up to 9 × 10)", "Add a 0", "Repeat the digit (up to 11 × 9)", "10s plus 2s"][n] : "Each step adds the same amount" };
};
export const numberLine: Calc = (v) => {
  const xs = (txt(v, "s") || "-3, -1.5, 0, 2, 4.5").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (!xs.length || xs.some((x) => !Number.isFinite(x))) throw new InputError("Enter numbers separated by commas.");
  const lo = Math.floor(Math.min(...xs, 0)), hi = Math.ceil(Math.max(...xs, 0)), span = Math.max(1, hi - lo), W = 40, line = new Array(W + 1).fill("—");
  for (const x of xs) line[Math.round(((x - lo) / span) * W)] = "●";
  const sorted = [...xs].sort((a, b) => a - b);
  return { l: `${lo} ${line.join("")} ${hi}`, o: `In order: ${sorted.map(f6).join(" < ")}`, note: `Distance from 0: ${xs.map((x) => `|${f6(x)}| = ${f6(Math.abs(x))}`).join(", ")}` };
};
export const frontEnd: Calc = (v) => {
  const xs = (txt(v, "s") || "4,382 + 2,751 + 619").match(/[+-]?\s*\d[\d,]*\.?\d*/g)?.map((s) => Number(s.replace(/[\s,]/g, ""))) || [];
  if (xs.length < 2) throw new InputError("Enter at least two numbers, e.g. 438 + 271.");
  const fe = (x: number) => { const a = Math.abs(x), p = 10 ** Math.floor(Math.log10(a || 1)); return Math.sign(x) * Math.floor(a / p) * p; };
  const est = xs.reduce((s, x) => s + fe(x), 0), exact = xs.reduce((s, x) => s + x, 0);
  return { e: `Front-end estimate ≈ ${nfmt(est)}`, x: `Exact ${nfmt(exact)} · front-end parts: ${xs.map((x) => nfmt(fe(x))).join(" + ")}`, note: `Adjusted estimate (rounding instead) ≈ ${nfmt(xs.reduce((s, x) => { const a = Math.abs(x), p = 10 ** Math.floor(Math.log10(a || 1)); return s + Math.sign(x) * Math.round(a / p) * p; }, 0))} · front-end keeps only the leading digit of each number` };
};
export const elapsedKids: Calc = (v) => {
  const sh = num(v.a, 9), sm = num(v.b, 45), eh = num(v.c, 11), em = num(v.d, 20), sp = pick(v.p, 2), ep = pick(v.q, 2);
  const s = ((sh % 12) + sp * 12) * 60 + sm, e0 = ((eh % 12) + ep * 12) * 60 + em, e = e0 < s ? e0 + 1440 : e0, d = e - s;
  const toNext = (60 - sm) % 60, rest = d - toNext;
  return { e: `${Math.floor(d / 60)} hour${Math.floor(d / 60) === 1 ? "" : "s"} ${d % 60} minute${d % 60 === 1 ? "" : "s"}`, how: toNext && rest >= 0 ? `Count up: ${sh}:${String(sm).padStart(2, "0")} → ${(sh % 12) + 1}:00 is ${toNext} min, then ${Math.floor(rest / 60)} h ${rest % 60} min more` : `From ${sh}:${String(sm).padStart(2, "0")} ${sp ? "p.m." : "a.m."} to ${eh}:${String(em).padStart(2, "0")} ${ep ? "p.m." : "a.m."}`, note: `That's ${d} minutes in total${e0 < s ? " (past midnight)" : ""}` };
};

// ---- registry (generated)
export const ideaMath2CustomCalculators: Record<string, Calc> = {
  "magic-square-calculator": magicSquare,
  "sudoku-solver-calculator": sudoku,
  "venn-diagram-three-sets-calculator": venn3,
  "power-set-calculator": powerSet,
  "cartesian-product-calculator": cartesian,
  "graph-shortest-path-dijkstra-calculator": dijkstra,
  "minimum-spanning-tree-calculator": mst,
  "game-theory-nash-equilibrium-calculator": nash,
  "markov-chain-steady-state-calculator": markov,
  "pythagorean-triple-generator-calculator": pyTriples,
  "rhombus-area-calculator": rhombus,
  "annulus-area-calculator": annulus,
  "segment-area-circle-calculator": segment,
  "inscribed-angle-calculator": inscribed,
  "tangent-to-circle-calculator": tangent,
  "frustum-volume-calculator": frustum,
  "torus-volume-calculator": torus,
  "capsule-volume-calculator": capsule,
  "spherical-cap-volume-calculator": sphCap,
  "cuboid-diagonal-calculator": cuboid,
  "distance-point-to-line-calculator": ptLine,
  "line-intersection-point-calculator": lineInt,
  "polygon-area-from-coordinates-shoelace-calculator": shoelace,
  "rotation-transformation-calculator": rotate,
  "reflection-transformation-calculator": reflect,
  "double-angle-formula-calculator": dblAngle,
  "sum-and-difference-angle-formula-calculator": sumDiff,
  "times-table-generator-calculator": timesTable,
  "number-line-plot-calculator": numberLine,
  "estimation-front-end-calculator": frontEnd,
  "telling-time-elapsed-kids-calculator": elapsedKids,
};
