/**
 * Batch: big generic keyword check (16 Nov 2026) — ten Science > Math tools (angle relationships,
 * interval notation, scale factor, rectangle diagonal, DMS, triangle centers, golden ratio,
 * Fibonacci, day of the year, leap year) and two Statistics & Probability tools (pie chart,
 * sensitivity & specificity).
 *
 * Near-namesakes kept apart on purpose:
 *  - interval-notation = inequalities ↔ interval notation with union/intersection. interval
 *    (existing) is the MUSIC interval calculator.
 *  - triangle-centers = orthocenter, circumcenter, incenter and centroid from 3 vertices.
 *    centroid (existing) is the centroid of an area/shape; triangle (existing) solves sides/angles.
 *  - golden-ratio = split a length by φ. golden-ratio-physique (existing) is a fitness tool.
 *  - fibonacci = nth term (exact BigInt). fibonacci-retracement / fibonacci-betting (existing) are
 *    trading and betting tools.
 *  - day-of-the-year / leap-year: date-calculator (existing) does spans between dates.
 *  - sensitivity-specificity = 2×2 diagnostic-test table metrics; f1-score (existing) is ML only.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig, dayText, dateIn, dayParts, dayNum } from "./trv-core";

const today = () => Math.floor(Date.now() / 86400000);
const show = (x: number, s = 6) => (Number.isFinite(x) ? nfmt(sig(x, s), 8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const DEG = Math.PI / 180;
const deg = (x: number) => `${show(x, 6)}°`;

// ------------------------------------------------------------------ angle relationships
export const angleRelationships: Calc = (v) => {
  const a = num(v.angle, 35), b = num(v.angle2, 0), n = Math.round(num(v.sides, 0));
  if (!(a > 0) || a >= 360) throw new InputError("Enter an angle between 0° and 360°.");
  const type = a < 90 ? "Acute" : a === 90 ? "Right" : a < 180 ? "Obtuse" : a === 180 ? "Straight" : "Reflex";
  let tri = "Enter a second angle to solve a triangle";
  if (b > 0) tri = a + b >= 180 ? "The two angles add to 180° or more — not a triangle" : `Third angle ${deg(180 - a - b)}; exterior angle at the third vertex ${deg(a + b)} (= sum of the two remote interior angles)`;
  let poly = "Enter a number of sides (3+) for polygon angles";
  if (n >= 3) poly = `Regular ${n}-gon: each interior angle ${deg(((n - 2) * 180) / n)}, exterior ${deg(360 / n)}, interior sum ${deg((n - 2) * 180)}`;
  return {
    complement: a < 90 ? deg(90 - a) : "None (angle is 90° or more)",
    supplement: a < 180 ? deg(180 - a) : "None (angle is 180° or more)",
    vertical: `${deg(a)} (vertical angles are equal)`,
    conjugate: deg(360 - a),
    type,
    radians: `${show(a * DEG, 6)} rad`,
    triangle: tri,
    polygon: poly,
  };
};

// ------------------------------------------------------------------ interval notation
type Iv = { lo: number; hi: number; loC: boolean; hiC: boolean };
const NUM = String.raw`[-−]?\s*(?:\d+(?:\.\d+)?|\.\d+)(?:\s*\/\s*\d+)?`;
const pnum = (s: string) => { const t = s.replace(/\s|−/g, (c) => (c === "−" ? "-" : "")); if (t.includes("/")) { const [p, q] = t.split("/"); return Number(p) / Number(q); } return Number(t); };
const pinf = (s: string) => { const t = s.trim().toLowerCase().replace("−", "-"); if (/^-\s*(∞|inf|infinity)$/.test(t)) return -Infinity; if (/^\+?\s*(∞|inf|infinity)$/.test(t)) return Infinity; return pnum(t); };
function parsePiece(p: string): Iv {
  const s = p.trim().replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/=</g, "<=").replace(/=>/g, ">=");
  let m = s.match(/^([[(])\s*([^,]+?)\s*,\s*([^,]+?)\s*([\])])$/);
  if (m) { const lo = pinf(m[2]), hi = pinf(m[3]); if (!Number.isFinite(lo) && lo !== -Infinity || (!Number.isFinite(hi) && hi !== Infinity) || Number.isNaN(lo) || Number.isNaN(hi)) throw new InputError(`Can't read "${p}".`); return { lo, hi, loC: m[1] === "[" && Number.isFinite(lo), hiC: m[4] === "]" && Number.isFinite(hi) }; }
  m = s.match(new RegExp(`^(${NUM})\\s*(<=|<|>=|>)\\s*[a-z]\\s*(<=|<|>=|>)\\s*(${NUM})$`, "i"));
  if (m) {
    const a = pnum(m[1]), b = pnum(m[4]), o1 = m[2], o2 = m[3];
    if (o1[0] === "<" && o2[0] === "<") return { lo: a, hi: b, loC: o1 === "<=", hiC: o2 === "<=" };
    if (o1[0] === ">" && o2[0] === ">") return { lo: b, hi: a, loC: o2 === ">=", hiC: o1 === ">=" };
    throw new InputError(`"${p}": both signs must point the same way (e.g. −2 < x ≤ 5).`);
  }
  m = s.match(new RegExp(`^[a-z]\\s*(<=|<|>=|>|=)\\s*(${NUM})$`, "i"));
  if (m) { const a = pnum(m[2]), o = m[1]; return o === "=" ? { lo: a, hi: a, loC: true, hiC: true } : o[0] === "<" ? { lo: -Infinity, hi: a, loC: false, hiC: o === "<=" } : { lo: a, hi: Infinity, loC: o === ">=", hiC: false }; }
  m = s.match(new RegExp(`^(${NUM})\\s*(<=|<|>=|>)\\s*[a-z]$`, "i"));
  if (m) { const a = pnum(m[1]), o = m[2]; return o[0] === "<" ? { lo: a, hi: Infinity, loC: o === "<=", hiC: false } : { lo: -Infinity, hi: a, loC: false, hiC: o === ">=" }; }
  throw new InputError(`Can't read "${p}". Try x > 3, -2 <= x < 5, (1, 4] or x < 0 or x >= 2.`);
}
function parseSet(raw: string): { set: Iv[]; and: boolean } {
  const s = raw.trim();
  if (!s) throw new InputError("Enter an inequality or interval.");
  const and = /\band\b|∩/i.test(s);
  const parts = s.split(/\s+or\s+|\s*∪\s*|\s+U\s+|\s+and\s+|\s*∩\s*/i).filter(Boolean).map(parsePiece);
  for (const p of parts) if (p.lo > p.hi || (p.lo === p.hi && !(p.loC && p.hiC))) throw new InputError("An interval is empty — check the order of the numbers.");
  return { set: and ? parts.reduce<Iv[]>((acc, p) => inter(acc, [p]), [{ lo: -Infinity, hi: Infinity, loC: false, hiC: false }]) : union(parts), and };
}
function union(a: Iv[]): Iv[] {
  const s = [...a].sort((x, y) => x.lo - y.lo || (x.loC ? -1 : 1)), out: Iv[] = [];
  for (const p of s) {
    const l = out[out.length - 1];
    if (l && (p.lo < l.hi || (p.lo === l.hi && (p.loC || l.hiC)))) { if (p.hi > l.hi) { l.hi = p.hi; l.hiC = p.hiC; } else if (p.hi === l.hi) l.hiC = l.hiC || p.hiC; }
    else out.push({ ...p });
  }
  return out;
}
function inter(a: Iv[], b: Iv[]): Iv[] {
  const out: Iv[] = [];
  for (const x of a) for (const y of b) {
    const lo = Math.max(x.lo, y.lo), hi = Math.min(x.hi, y.hi);
    const loC = lo === x.lo && lo === y.lo ? x.loC && y.loC : lo === x.lo ? x.loC : y.loC;
    const hiC = hi === x.hi && hi === y.hi ? x.hiC && y.hiC : hi === x.hi ? x.hiC : y.hiC;
    if (lo < hi || (lo === hi && loC && hiC)) out.push({ lo, hi, loC, hiC });
  }
  return union(out);
}
const nt = (x: number) => (x === Infinity ? "∞" : x === -Infinity ? "−∞" : show(x, 8).replace(/^-/, "−"));
const ivText = (s: Iv[]) => (s.length ? s.map((p) => (p.lo === p.hi ? `{${nt(p.lo)}}` : `${p.loC ? "[" : "("}${nt(p.lo)}, ${nt(p.hi)}${p.hiC ? "]" : ")"}`)).join(" ∪ ") : "∅ (empty set)");
const ineqOne = (p: Iv) => {
  if (p.lo === p.hi) return `x = ${nt(p.lo)}`;
  if (p.lo === -Infinity && p.hi === Infinity) return "all real numbers";
  if (p.lo === -Infinity) return `x ${p.hiC ? "≤" : "<"} ${nt(p.hi)}`;
  if (p.hi === Infinity) return `x ${p.loC ? "≥" : ">"} ${nt(p.lo)}`;
  return `${nt(p.lo)} ${p.loC ? "≤" : "<"} x ${p.hiC ? "≤" : "<"} ${nt(p.hi)}`;
};
export const intervalNotation: Calc = (v) => {
  const A = parseSet(txt(v, "a")), b = txt(v, "b"), B = b ? parseSet(b) : null;
  const graph = (s: Iv[]) => s.map((p) => `${p.lo === -Infinity ? "arrow left" : `${p.loC ? "closed ●" : "open ○"} at ${nt(p.lo)}`} to ${p.hi === Infinity ? "arrow right" : `${p.hiC ? "closed ●" : "open ○"} at ${nt(p.hi)}`}`).join("; ") || "nothing to shade";
  return {
    interval: ivText(A.set),
    inequality: A.set.map(ineqOne).join(" or ") || "no solution",
    setBuilder: A.set.length ? `{x | ${A.set.map(ineqOne).join(" or ")}}` : "∅",
    graph: graph(A.set),
    union: B ? ivText(union([...A.set, ...B.set])) : "Enter a second set to combine",
    intersection: B ? ivText(inter(A.set, B.set)) : "—",
  };
};
export const scaleFactor: Calc = (v) => {
  const m = pick(v.mode, 4), a = num(v.a, 4), b = num(v.b, 10), n = num(v.n, 50), k = num(v.k, 2.5);
  if (m === 0) {
    if (!(a > 0) || !(b > 0)) throw new InputError("Enter the original and new lengths.");
    const f = b / a;
    return { result: `Scale factor ${show(f)}`, detail: `${f > 1 ? "Enlargement" : f < 1 ? "Reduction" : "Same size"}: new = original × ${show(f)}`, area: `Areas × ${show(f * f)}`, volume: `Volumes × ${show(f ** 3)}`, ratio: `${show(a)} : ${show(b)} = 1 : ${show(f)}` };
  }
  if (m === 3) {
    if (!(k > 0) || !(a > 0)) throw new InputError("Enter a length and a scale factor above zero.");
    return { result: `${show(a * k)} (length)`, detail: `${show(a)} × ${show(k)} = ${show(a * k)}`, area: `An area of ${show(a)} square units becomes ${show(a * k * k)} (× k²)`, volume: `A volume of ${show(a)} cubic units becomes ${show(a * k ** 3)} (× k³)`, ratio: `1 : ${show(k)}` };
  }
  if (!(n > 0) || !(a > 0)) throw new InputError("Enter the scale (1 : N) and a length.");
  const r = m === 1 ? a * n : a / n;
  return { result: `${show(r)} ${m === 1 ? "(real size, same unit)" : "(on the drawing, same unit)"}`, detail: m === 1 ? `${show(a)} × ${show(n)} = ${show(r)}` : `${show(a)} ÷ ${show(n)} = ${show(r)}`, area: `Areas scale by ${show(n * n)}`, volume: `Volumes scale by ${show(n ** 3)}`, ratio: `1 : ${show(n)} (scale factor ${m === 1 ? show(n) : show(1 / n)})` };
};

// ------------------------------------------------------------------ rectangle diagonal
export const RD_MODES = ["Diagonal from length and width", "Sides from diagonal and aspect ratio"];
export const rectangleDiagonal: Calc = (v) => {
  const m = pick(v.mode, 2);
  let l: number, w: number;
  if (m === 0) { l = num(v.length, 12); w = num(v.width, 5); if (!(l > 0)) throw new InputError("Enter the length."); if (!(w > 0)) w = l; }
  else { const d = num(v.diagonal, 55), rw = num(v.rw, 16), rh = num(v.rh, 9); if (!(d > 0) || !(rw > 0) || !(rh > 0)) throw new InputError("Enter the diagonal and the aspect ratio."); const h = Math.hypot(rw, rh); l = (d * rw) / h; w = (d * rh) / h; }
  const d = Math.hypot(l, w);
  return { diagonal: show(d), sides: `${show(l)} × ${show(w)}${Math.abs(l - w) < 1e-12 ? " (square: diagonal = side × √2)" : ""}`, angle: `${deg(Math.atan(w / l) / DEG)} with the long side`, area: show(l * w), perimeter: show(2 * (l + w)) };
};
const toDms = (x: number) => { const s = x < 0 ? "−" : "", a = Math.abs(x); let d = Math.floor(a), mm = Math.floor((a - d) * 60), ss = (a - d - mm / 60) * 3600; ss = Math.round(ss * 1000) / 1000; if (ss >= 60) { ss -= 60; mm += 1; } if (mm >= 60) { mm -= 60; d += 1; } return `${s}${d}° ${mm}′ ${show(ss, 8)}″`; };
export const dms: Calc = (v) => {
  const m = pick(v.mode, 4);
  const one = (i: string) => { const d = num(v[`d${i}`], 0), mi = num(v[`m${i}`], 0), s = num(v[`s${i}`], 0), neg = d < 0; if (mi < 0 || mi >= 60 || s < 0 || s >= 60) throw new InputError("Minutes and seconds must be between 0 and 59.999."); return (neg ? -1 : 1) * (Math.abs(d) + mi / 60 + s / 3600); };
  let x: number;
  if (m === 0) x = num(v.decimal, 40.7128);
  else if (m === 1) x = one("1");
  else x = one("1") + (m === 2 ? 1 : -1) * one("2");
  return { dms: toDms(x), decimal: `${show(x, 10)}°`, radians: `${show(x * DEG, 8)} rad`, compass: m === 0 ? `As latitude: ${toDms(Math.abs(x))} ${x >= 0 ? "N" : "S"}; as longitude: ${toDms(Math.abs(x))} ${x >= 0 ? "E" : "W"}` : "—" };
};

// ------------------------------------------------------------------ triangle centers
export const triangleCenters: Calc = (v) => {
  const A = [num(v.x1, 0), num(v.y1, 0)], B = [num(v.x2, 6), num(v.y2, 0)], Cc = [num(v.x3, 2), num(v.y3, 4)];
  const D = 2 * (A[0] * (B[1] - Cc[1]) + B[0] * (Cc[1] - A[1]) + Cc[0] * (A[1] - B[1]));
  if (Math.abs(D) < 1e-12) throw new InputError("The three points are on one line — not a triangle.");
  const s2 = (p: number[]) => p[0] ** 2 + p[1] ** 2;
  const O = [(s2(A) * (B[1] - Cc[1]) + s2(B) * (Cc[1] - A[1]) + s2(Cc) * (A[1] - B[1])) / D, (s2(A) * (Cc[0] - B[0]) + s2(B) * (A[0] - Cc[0]) + s2(Cc) * (B[0] - A[0])) / D];
  const G = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3], H = [3 * G[0] - 2 * O[0], 3 * G[1] - 2 * O[1]];
  const a = Math.hypot(B[0] - Cc[0], B[1] - Cc[1]), b = Math.hypot(A[0] - Cc[0], A[1] - Cc[1]), c = Math.hypot(A[0] - B[0], A[1] - B[1]), p = a + b + c;
  const I = [(a * A[0] + b * B[0] + c * Cc[0]) / p, (a * A[1] + b * B[1] + c * Cc[1]) / p], area = Math.abs(D) / 4;
  const pt = (q: number[]) => `(${show(q[0])}, ${show(q[1])})`;
  return { orthocenter: pt(H), circumcenter: pt(O), centroid: pt(G), incenter: pt(I), radii: `Circumradius R = ${show(Math.hypot(A[0] - O[0], A[1] - O[1]))}, inradius r = ${show(area / (p / 2))}`, euler: `O, G and H lie on the Euler line; OH = ${show(Math.hypot(H[0] - O[0], H[1] - O[1]))}`, area: show(area) };
};

// ------------------------------------------------------------------ golden ratio
export const PHI = (1 + Math.sqrt(5)) / 2;
export const goldenRatio: Calc = (v) => {
  const m = pick(v.mode, 3), x = num(v.length, 100);
  if (!(x > 0)) throw new InputError("Enter a length above zero.");
  const long = m === 0 ? x / PHI : m === 1 ? x : x * PHI, short = long / PHI, whole = long + short;
  return { long: show(long), short: show(short), whole: show(whole), rectangle: `Golden rectangle: ${show(long)} × ${show(short)} (or ${show(whole)} × ${show(long)})`, phi: `φ = ${PHI.toFixed(10)}; 1/φ = ${(1 / PHI).toFixed(10)}` };
};

// ------------------------------------------------------------------ Fibonacci
export const fibonacci: Calc = (v) => {
  const n = Math.round(num(v.n, 20)), chk = Math.round(num(v.check, 0));
  if (n < 0 || n > 2000) throw new InputError("n must be between 0 and 2,000.");
  let a = BigInt(0), b = BigInt(1); const first: string[] = [];
  for (let i = 0; i < n; i++) { if (i < 15) first.push(String(a)); [a, b] = [b, a + b]; }
  const fn = String(a), sum = String(b + a - BigInt(1));
  let isFib = "Enter a number to check";
  if (chk > 0) { const t = (x: number) => { const r = Math.round(Math.sqrt(x)); return r * r === x; }; isFib = chk > 1e15 ? "Number too large to check here" : t(5 * chk * chk + 4) || t(5 * chk * chk - 4) ? `${nfmt(chk)} is a Fibonacci number` : `${nfmt(chk)} is not a Fibonacci number`; }
  return { fn: fn.length > 60 ? `${fn.slice(0, 30)}…${fn.slice(-10)} (${fn.length} digits)` : fn, digits: `${fn.length} digit${fn.length === 1 ? "" : "s"}`, sequence: `${first.join(", ")}${n > 15 ? ", …" : ""}`, sum: `Sum of F(0)…F(${n}) = F(${n + 2}) − 1 = ${sum.length > 40 ? `${sum.length} digits` : sum}`, ratio: n > 1 ? `F(n)/F(n−1) → φ ≈ 1.6180339887` : "—", check: isFib };
};
export const dayOfYear: Calc = (v) => {
  let d: number;
  if (pick(v.mode, 2) === 1) { const y = Math.round(num(v.year, 2026)), n = Math.round(num(v.day, 100)); const len = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; if (n < 1 || n > len) throw new InputError(`Day number must be 1–${len} in ${y}.`); d = dayNum(y, 1, 1) + n - 1; }
  else d = dateIn(v, "date", today());
  const p = dayParts(d), start = dayNum(p.y, 1, 1), len = dayNum(p.y + 1, 1, 1) - start, n = d - start + 1;
  const dow = (((d % 7) + 7 + 3) % 7) + 1, thu = d - dow + 4, wy = dayParts(thu).y, wk = Math.floor((thu - dayNum(wy, 1, 1)) / 7) + 1;
  return { day: `Day ${n} of ${len}`, date: dayText(d), left: `${len - n} days left in ${p.y}`, week: `ISO week ${wk}${wy !== p.y ? ` of ${wy}` : ""}`, quarter: `Q${Math.ceil(p.m / 3)}`, pct: `${show((n / len) * 100, 4)}% of the year` };
};

// ------------------------------------------------------------------ leap year
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const leapYear: Calc = (v) => {
  const y = Math.round(num(v.year, 2026)), from = Math.round(num(v.from, 2000)), to = Math.round(num(v.to, 2050));
  if (to < from) throw new InputError("The end year must be after the start year.");
  if (to - from > 10000) throw new InputError("Keep the range under 10,000 years.");
  let nx = y + 1; while (!isLeap(nx)) nx++;
  let pv = y - 1; while (!isLeap(pv)) pv--;
  const list: number[] = []; for (let i = from; i <= to; i++) if (isLeap(i)) list.push(i);
  const why = y % 400 === 0 ? "divisible by 400" : y % 100 === 0 ? "divisible by 100 but not 400" : y % 4 === 0 ? "divisible by 4 and not by 100" : "not divisible by 4";
  return { answer: `${y} ${isLeap(y) ? "is" : "is not"} a leap year`, why: `Because it is ${why}`, days: `${isLeap(y) ? 366 : 365} days`, next: `Next leap year: ${nx}; previous: ${pv}`, feb29: isLeap(y) ? `29 February ${y} is a ${dayText(dayNum(y, 2, 29)).split(",")[0]}` : "No 29 February this year", range: `${list.length} leap years from ${from} to ${to}${list.length ? `: ${list.slice(0, 30).join(", ")}${list.length > 30 ? ", …" : ""}` : ""}` };
};

// ------------------------------------------------------------------ pie chart
export const pieChart: Calc = (v) => {
  const vals = txt(v, "values").split(/[\s,;]+/).filter(Boolean).map((p) => { const n = Number(p); if (!Number.isFinite(n) || n < 0) throw new InputError(`"${p}" isn't a positive number.`); return n; });
  if (vals.length < 1) throw new InputError("Enter at least one value.");
  const labels = txt(v, "labels").split(/\s*,\s*/).filter(Boolean), tot = vals.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) throw new InputError("The values must add up to more than zero.");
  let cum = 0;
  const rows = vals.map((x, i) => { const pct = (x / tot) * 100, d = (x / tot) * 360, s = cum; cum += d; return `${labels[i] ?? `Slice ${i + 1}`}: ${show(x)} → ${show(pct, 4)}%, ${show(d, 4)}° (from ${show(s, 4)}° to ${show(cum, 4)}°)`; });
  return { slices: rows.join("; "), total: show(tot), count: `${vals.length} slices`, check: "Percentages add to 100% and angles to 360°" };
};

// ------------------------------------------------------------------ sensitivity & specificity
export const sensitivitySpecificity: Calc = (v) => {
  const tp = num(v.tp, 90), fp = num(v.fp, 30), fn = num(v.fn, 10), tn = num(v.tn, 870), prevIn = num(v.prev, 0);
  if ([tp, fp, fn, tn].some((x) => x < 0)) throw new InputError("Counts can't be negative.");
  const sens = tp / (tp + fn), spec = tn / (tn + fp), n = tp + fp + fn + tn, prev = prevIn > 0 ? prevIn / 100 : (tp + fn) / n;
  const ppv = (sens * prev) / (sens * prev + (1 - spec) * (1 - prev)), npv = (spec * (1 - prev)) / (spec * (1 - prev) + (1 - sens) * prev);
  const p = (x: number) => (Number.isFinite(x) ? `${show(x * 100, 4)}%` : "—");
  return { sensitivity: p(sens), specificity: p(spec), ppv: `${p(ppv)}${prevIn > 0 ? ` at ${show(prevIn)}% prevalence` : ""}`, npv: p(npv), accuracy: p((tp + tn) / n), f1: show((2 * tp) / (2 * tp + fp + fn), 4), lr: `LR+ ${show(sens / (1 - spec), 4)}, LR− ${show((1 - sens) / spec, 4)}`, prevalence: p(prev), youden: show(sens + spec - 1, 4) };
};

export const bigMathCustomCalculators: Record<string, Calc> = {
  "angle-relationships-calculator": angleRelationships,
  "interval-notation-calculator": intervalNotation,
  "scale-factor-calculator": scaleFactor,
  "rectangle-diagonal-calculator": rectangleDiagonal,
  "dms-calculator": dms,
  "triangle-centers-calculator": triangleCenters,
  "golden-ratio-calculator": goldenRatio,
  "fibonacci-calculator": fibonacci,
  "day-of-the-year-calculator": dayOfYear,
  "leap-year-calculator": leapYear,
  "pie-chart-calculator": pieChart,
  "sensitivity-specificity-calculator": sensitivitySpecificity,
};
