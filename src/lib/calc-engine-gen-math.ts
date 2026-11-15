/**
 * Batch: General keyword check (15 Nov 2026, Claude outputs/General_Keyword_Check.md) — 13 basic
 * school-maths tools for Science > Math: area, volume, surface area, triangle solver, long division,
 * rounding, square root, cube/nth root, ratio, arithmetic sequence, distance formula, Roman numerals
 * and military time.
 *
 * Near-namesakes kept apart on purpose:
 *  - area-calculator = 2D shapes in any unit. square-footage (existing) = rooms/floors for building
 *    jobs; circle, triangle-area, sector-area, regular-polygon (existing) = one shape each.
 *  - volume / surface-area = common solids in one place; volume-of-cylinder/-sphere/-cone/-pyramid,
 *    rectangular-prism and hemisphere-volume (existing) stay as single-shape pages.
 *  - triangle-calculator solves any triangle (SSS, SAS, ASA, AAS, SSA). right-triangle,
 *    law-of-sines, law-of-cosines and 30-60-90 / 45-45-90 (existing) are special cases.
 *  - rounding-calculator = place-value rounding. significant-figures (existing) = sig figs only.
 *  - square-root = √x with simplified radical; nth-root = ∛x and ⁿ√x.
 *  - distance-formula = coordinate geometry. distance-calculator (existing) = driving distance.
 *  - military-time = 12h ↔ 24h. time-calculator (existing) = h:mm arithmetic.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig, parseClock } from "./trv-core";

const show = (x: number, s = 10) => {
  if (!Number.isFinite(x)) return "—";
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return nfmt(x);
  if (Math.abs(x) >= 1e15 || (Math.abs(x) < 1e-6 && x !== 0)) return x.toExponential(Math.min(s, 10) - 1).replace(/\.?0+e/, "e");
  return nfmt(Number(x.toPrecision(s)), 10).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};
const P = (x: number, label: string) => { if (!(x > 0)) throw new InputError(`${label} must be greater than 0.`); return x; };
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ units (length → metres)
export const LEN_UNITS = ["Inches (in)", "Feet (ft)", "Yards (yd)", "Miles (mi)", "Millimetres (mm)", "Centimetres (cm)", "Metres (m)", "Kilometres (km)"];
const LEN_M = [0.0254, 0.3048, 0.9144, 1609.344, 0.001, 0.01, 1, 1000];
const LEN_AB = ["in", "ft", "yd", "mi", "mm", "cm", "m", "km"];

// ------------------------------------------------------------------ area
export const AREA_SHAPES = ["Rectangle (a × b)", "Square (side a)", "Triangle (base a, height b)", "Circle (radius a)", "Trapezoid (bases a & c, height b)", "Parallelogram (base a, height b)", "Ellipse / oval (semi-axes a & b)", "Rhombus / kite (diagonals a & b)", "Sector (radius a, angle c°)", "Regular polygon (side a, c sides)"];
export const area: Calc = (v) => {
  const sh = pick(v.shape, AREA_SHAPES.length), u = pick(v.unit, LEN_UNITS.length);
  const a = P(num(v.a, 0), "Dimension a"), b = num(v.b, 0), c = num(v.c, 0);
  const needB = [0, 2, 4, 5, 6, 7].includes(sh), needC = [4, 8, 9].includes(sh);
  if (needB && !(b > 0)) throw new InputError("This shape needs dimension b greater than 0.");
  if (needC && !(c > 0)) throw new InputError("This shape needs value c greater than 0.");
  let A: number, per: number | null, formula: string;
  switch (sh) {
    case 0: A = a * b; per = 2 * (a + b); formula = "A = a × b"; break;
    case 1: A = a * a; per = 4 * a; formula = "A = a²"; break;
    case 2: A = (a * b) / 2; per = null; formula = "A = ½ × base × height"; break;
    case 3: A = Math.PI * a * a; per = 2 * Math.PI * a; formula = "A = πr²  (circumference 2πr)"; break;
    case 4: A = ((a + c) / 2) * b; per = null; formula = "A = ½ × (a + c) × h"; break;
    case 5: A = a * b; per = null; formula = "A = base × height"; break;
    case 6: A = Math.PI * a * b; per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); formula = "A = π × a × b  (perimeter by Ramanujan's approximation)"; break;
    case 7: A = (a * b) / 2; per = 2 * Math.sqrt((a / 2) ** 2 + (b / 2) ** 2) * 2; formula = "A = ½ × d₁ × d₂  (perimeter shown for a rhombus)"; break;
    case 8: if (c > 360) throw new InputError("A sector angle can't exceed 360°."); A = Math.PI * a * a * (c / 360); per = 2 * a + 2 * Math.PI * a * (c / 360); formula = "A = (θ/360) × πr²"; break;
    default: { const n = Math.round(c); if (n < 3) throw new InputError("A polygon needs at least 3 sides."); A = (n * a * a) / (4 * Math.tan(Math.PI / n)); per = n * a; formula = `A = n·s² ÷ (4·tan(180°/n)), n = ${n}`; }
  }
  const m2 = A * LEN_M[u] ** 2;
  const ab = LEN_AB[u];
  return {
    area: `${show(A)} ${ab}²`, raw: sig(A, 10), perimeter: per === null ? "Needs all side lengths" : `${show(per)} ${ab}`,
    sqft: show(m2 / 0.09290304), sqm: show(m2), acres: show(m2 / 4046.8564224, 6), formula,
  };
};

// ------------------------------------------------------------------ volume
export const VOL_SHAPES = ["Cube (side a)", "Rectangular box (a × b × c)", "Cylinder (radius a, height b)", "Sphere (radius a)", "Cone (radius a, height b)", "Square pyramid (base side a, height b)", "Triangular prism (base a, triangle height b, length c)", "Hemisphere (radius a)", "Capsule (radius a, cylinder length b)", "Ellipsoid (semi-axes a, b, c)"];
const volOf = (sh: number, a: number, b: number, c: number): [number, string] => {
  switch (sh) {
    case 0: return [a ** 3, "V = a³"];
    case 1: return [a * b * c, "V = a × b × c"];
    case 2: return [Math.PI * a * a * b, "V = πr²h"];
    case 3: return [(4 / 3) * Math.PI * a ** 3, "V = 4/3 πr³"];
    case 4: return [(Math.PI * a * a * b) / 3, "V = ⅓ πr²h"];
    case 5: return [(a * a * b) / 3, "V = ⅓ × a² × h"];
    case 6: return [0.5 * a * b * c, "V = ½ × base × height × length"];
    case 7: return [(2 / 3) * Math.PI * a ** 3, "V = 2/3 πr³"];
    case 8: return [Math.PI * a * a * b + (4 / 3) * Math.PI * a ** 3, "V = πr²L + 4/3 πr³"];
    default: return [(4 / 3) * Math.PI * a * b * c, "V = 4/3 π a b c"];
  }
};
const needs = (sh: number) => ({ b: [1, 2, 4, 5, 6, 8, 9].includes(sh), c: [1, 6, 9].includes(sh) });
export const volume: Calc = (v) => {
  const sh = pick(v.shape, VOL_SHAPES.length), u = pick(v.unit, LEN_UNITS.length);
  const a = P(num(v.a, 0), "Dimension a"), b = num(v.b, 0), c = num(v.c, 0);
  const nd = needs(sh);
  if (nd.b && !(b > 0)) throw new InputError("This shape needs dimension b greater than 0.");
  if (nd.c && !(c > 0)) throw new InputError("This shape needs dimension c greater than 0.");
  const [V, formula] = volOf(sh, a, b, c);
  const m3 = V * LEN_M[u] ** 3;
  return { volume: `${show(V)} ${LEN_AB[u]}³`, raw: sig(V, 10), liters: show(m3 * 1000), gallons: show(m3 / 0.003785411784), cuft: show(m3 / 0.028316846592), cuyd: show(m3 / 0.764554857984), formula };
};

// ------------------------------------------------------------------ surface area
export const SA_SHAPES = ["Cube (side a)", "Rectangular box (a × b × c)", "Cylinder (radius a, height b)", "Sphere (radius a)", "Cone (radius a, height b)", "Square pyramid (base side a, height b)", "Right triangular prism (legs a & b, length c)", "Hemisphere, closed (radius a)"];
export const surfaceArea: Calc = (v) => {
  const sh = pick(v.shape, SA_SHAPES.length), u = pick(v.unit, LEN_UNITS.length);
  const a = P(num(v.a, 0), "Dimension a"), b = num(v.b, 0), c = num(v.c, 0);
  if ([1, 2, 4, 5, 6].includes(sh) && !(b > 0)) throw new InputError("This shape needs dimension b greater than 0.");
  if ([1, 6].includes(sh) && !(c > 0)) throw new InputError("This shape needs dimension c greater than 0.");
  let total: number, lateral: number, base: number, formula: string;
  switch (sh) {
    case 0: total = 6 * a * a; lateral = 4 * a * a; base = a * a; formula = "SA = 6a²"; break;
    case 1: total = 2 * (a * b + b * c + a * c); lateral = 2 * c * (a + b); base = a * b; formula = "SA = 2(ab + bc + ac)  (lateral uses c as the height)"; break;
    case 2: lateral = 2 * Math.PI * a * b; base = Math.PI * a * a; total = lateral + 2 * base; formula = "SA = 2πr² + 2πrh"; break;
    case 3: total = 4 * Math.PI * a * a; lateral = total; base = 0; formula = "SA = 4πr²"; break;
    case 4: { const l = Math.hypot(a, b); lateral = Math.PI * a * l; base = Math.PI * a * a; total = lateral + base; formula = `SA = πr² + πr·l, slant l = √(r² + h²) = ${show(l, 6)}`; break; }
    case 5: { const l = Math.hypot(a / 2, b); lateral = 2 * a * l; base = a * a; total = lateral + base; formula = `SA = a² + 2a·l, slant l = √((a/2)² + h²) = ${show(l, 6)}`; break; }
    case 6: { const h = Math.hypot(a, b); base = (a * b) / 2; lateral = (a + b + h) * c; total = lateral + 2 * base; formula = `SA = ab + (a + b + hyp) × c, hyp = ${show(h, 6)}`; break; }
    default: lateral = 2 * Math.PI * a * a; base = Math.PI * a * a; total = 3 * Math.PI * a * a; formula = "SA = 2πr² (dome) + πr² (flat base) = 3πr²";
  }
  const [vol] = volOf(sh, a, b, c); // SA_SHAPES 0–7 use the same index as VOL_SHAPES 0–7
  const ab = LEN_AB[u];
  return { total: `${show(total)} ${ab}²`, raw: sig(total, 10), lateral: `${show(lateral)} ${ab}²`, base: sh === 3 ? "— (no base)" : `${show(base)} ${ab}²`, volume: `${show(vol)} ${ab}³`, ratio: show(total / vol, 6), formula };
};

// ------------------------------------------------------------------ triangle solver
export const TRI_MODES = ["SSS — three sides (a, b, c)", "SAS — sides a, b and included angle C", "ASA — angles A, B and side c between them", "AAS — angles A, B and side a", "SSA — sides a, b and angle A (ambiguous case)"];
type Tri = { a: number; b: number; c: number; A: number; B: number; C: number };
function describe(t: Tri) {
  const s = (t.a + t.b + t.c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - t.a) * (s - t.b) * (s - t.c)));
  const eq = (x: number, y: number) => Math.abs(x - y) < 1e-9 * Math.max(x, y);
  const side = eq(t.a, t.b) && eq(t.b, t.c) ? "Equilateral" : eq(t.a, t.b) || eq(t.b, t.c) || eq(t.a, t.c) ? "Isosceles" : "Scalene";
  const mx = Math.max(t.A, t.B, t.C);
  const ang = Math.abs(mx - 90) < 1e-7 ? "right" : mx > 90 ? "obtuse" : "acute";
  return { area, per: 2 * s, kind: `${side}, ${ang}`, ha: (2 * area) / t.a, hb: (2 * area) / t.b, hc: (2 * area) / t.c, R: t.a / (2 * Math.sin(t.A * DEG)), r: area / s };
}
export const triangle: Calc = (v) => {
  const m = pick(v.mode, TRI_MODES.length);
  const a = num(v.a, 0), b = num(v.b, 0), c = num(v.c, 0), A = num(v.A, 0), B = num(v.B, 0), C = num(v.C, 0);
  const pos = (x: number, n: string) => P(x, n);
  const angOk = (x: number, n: string) => { if (!(x > 0 && x < 180)) throw new InputError(`Angle ${n} must be between 0° and 180°.`); return x; };
  let t: Tri, alt = "Only one triangle fits these values";
  const lawC = (x: number, y: number, ang: number) => Math.sqrt(x * x + y * y - 2 * x * y * Math.cos(ang * DEG));
  const angFrom = (opp: number, x: number, y: number) => Math.acos(Math.min(1, Math.max(-1, (x * x + y * y - opp * opp) / (2 * x * y)))) / DEG;
  if (m === 0) {
    pos(a, "Side a"); pos(b, "Side b"); pos(c, "Side c");
    if (a + b <= c || a + c <= b || b + c <= a) throw new InputError("These sides can't make a triangle: each pair must add up to more than the third side.");
    const AA = angFrom(a, b, c), BB = angFrom(b, a, c);
    t = { a, b, c, A: AA, B: BB, C: 180 - AA - BB };
  } else if (m === 1) {
    pos(a, "Side a"); pos(b, "Side b"); angOk(C, "C");
    const cc = lawC(a, b, C), AA = angFrom(a, b, cc);
    t = { a, b, c: cc, A: AA, B: 180 - AA - C, C };
  } else if (m === 2 || m === 3) {
    angOk(A, "A"); angOk(B, "B");
    if (A + B >= 180) throw new InputError("Angles A and B must add up to less than 180°.");
    const CC = 180 - A - B, k = m === 2 ? pos(c, "Side c") / Math.sin(CC * DEG) : pos(a, "Side a") / Math.sin(A * DEG);
    t = { a: k * Math.sin(A * DEG), b: k * Math.sin(B * DEG), c: k * Math.sin(CC * DEG), A, B, C: CC };
  } else {
    pos(a, "Side a"); pos(b, "Side b"); angOk(A, "A");
    const sB = (b * Math.sin(A * DEG)) / a;
    if (sB > 1 + 1e-12) throw new InputError(`No triangle fits: side a is too short to reach (it must be at least b·sin A = ${show(b * Math.sin(A * DEG), 6)}).`);
    const B1 = Math.asin(Math.min(1, sB)) / DEG, B2 = 180 - B1;
    t = { a, b, c: 0, A, B: B1, C: 180 - A - B1 }; t.c = (a * Math.sin(t.C * DEG)) / Math.sin(A * DEG);
    if (A + B2 < 180 - 1e-9 && Math.abs(B2 - B1) > 1e-9) { const C2 = 180 - A - B2, c2 = (a * Math.sin(C2 * DEG)) / Math.sin(A * DEG); alt = `Second triangle also fits: B = ${show(B2, 6)}°, C = ${show(C2, 6)}°, c = ${show(c2, 6)}`; }
  }
  if (!(t.C > 0) || !(t.B > 0)) throw new InputError("These values don't make a valid triangle.");
  const d = describe(t);
  return {
    sides: `a = ${show(t.a, 8)}, b = ${show(t.b, 8)}, c = ${show(t.c, 8)}`, angles: `A = ${show(t.A, 8)}°, B = ${show(t.B, 8)}°, C = ${show(t.C, 8)}°`,
    area: sig(d.area, 10), perimeter: sig(d.per, 10), kind: d.kind, heights: `hₐ = ${show(d.ha, 6)}, h_b = ${show(d.hb, 6)}, h_c = ${show(d.hc, 6)}`,
    circles: `Circumradius R = ${show(d.R, 6)}, inradius r = ${show(d.r, 6)}`, alt,
  };
};

// ------------------------------------------------------------------ long division
function parseDec(s: string, label: string): { int: bigint; scale: number; neg: boolean } {
  const t = s.trim().replace(/,/g, "");
  const m = t.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);
  if (!m || (m[2] === "" && !m[3])) throw new InputError(`${label} must be a number like 7452 or 12.75.`);
  const frac = m[3] ?? "";
  return { int: BigInt((m[2] || "0") + frac), scale: frac.length, neg: m[1] === "-" };
}
export const longDivision: Calc = (v) => {
  const A = parseDec(txt(v, "dividend"), "The dividend"), B = parseDec(txt(v, "divisor"), "The divisor");
  if (B.int === BigInt(0)) throw new InputError("You can't divide by zero.");
  const dp = Math.min(30, Math.max(0, Math.round(num(v.dp, 6))));
  // Shift both to whole numbers (moving the decimal point the same number of places).
  const sc = Math.max(A.scale, B.scale);
  const a = A.int * BigInt(10) ** BigInt(sc - A.scale), b = B.int * BigInt(10) ** BigInt(sc - B.scale);
  const neg = A.neg !== B.neg && a !== BigInt(0);
  const q = a / b, r = a % b;
  // Decimal digits.
  let rem = r, digits = "";
  const seen = new Map<string, number>();
  let repeatAt = -1;
  for (let i = 0; i < dp && rem !== BigInt(0); i++) {
    const key = rem.toString();
    if (repeatAt < 0 && seen.has(key)) repeatAt = seen.get(key)!;
    if (!seen.has(key)) seen.set(key, i);
    rem *= BigInt(10); digits += (rem / b).toString(); rem %= b;
  }
  const exact = rem === BigInt(0);
  // Steps for the whole-number part.
  const ds = a.toString();
  const steps: string[] = [];
  let cur = BigInt(0), started = false;
  for (let i = 0; i < ds.length; i++) {
    cur = cur * BigInt(10) + BigInt(ds[i]);
    const qd = cur / b;
    if (qd > BigInt(0) || started) {
      started = true;
      if (steps.length < 25) steps.push(`Bring down ${ds[i]} → ${cur}: ${b} goes in ${qd} time${qd === BigInt(1) ? "" : "s"} (${qd} × ${b} = ${qd * b}), remainder ${cur - qd * b}`);
      cur -= qd * b;
    }
  }
  if (!steps.length) steps.push(`${b} is larger than ${a}, so the whole-number answer is 0, remainder ${a}.`);
  if (steps.length === 25 && ds.length > 25) steps.push("… (remaining steps follow the same pattern)");
  const sign = neg ? "−" : "";
  const dec = `${sign}${q.toString()}${digits ? "." + digits : ""}${exact ? "" : "…"}`;
  const shifted = sc > 0 ? `Both numbers were multiplied by ${"1" + "0".repeat(sc)} to remove the decimal point: ${a} ÷ ${b}.` : "";
  return {
    quotient: `${sign}${q.toString()}`, remainder: r.toString(), decimal: dec,
    mixed: r === BigInt(0) ? `${sign}${q}` : `${sign}${q === BigInt(0) ? "" : q + " "}${r}/${b}`.replace(/\s+\//, "/"),
    repeat: exact ? "Terminates (exact)" : repeatAt >= 0 ? `Repeats from decimal place ${repeatAt + 1}` : `Rounded to ${dp} decimal places`,
    steps: [shifted, ...steps].filter(Boolean).join("\n"),
  };
};

// ------------------------------------------------------------------ rounding
export const ROUND_TO = ["Nearest whole number", "Nearest tenth (0.1)", "Nearest hundredth (0.01)", "Nearest thousandth (0.001)", "Nearest ten", "Nearest hundred", "Nearest thousand", "Nearest ten thousand", "Nearest million", "N decimal places", "N significant figures"];
export const ROUND_METHOD = ["Half up (standard: 5 rounds up)", "Half even (banker's rounding)", "Always up (ceiling)", "Always down (floor)", "Truncate (toward zero)"];
const PLACE = [0, 1, 2, 3, -1, -2, -3, -4, -6];
function roundAt(x: number, places: number, method: number) {
  const f = (y: number) => Number(`${y}e${places}`), g = (y: number) => Number(`${y}e${-places}`);
  const s = Number.isFinite(f(x)) ? f(x) : x * 10 ** places;
  let r: number;
  const fl = Math.floor(s), diff = s - fl;
  switch (method) {
    case 0: r = Math.sign(s) * Math.floor(Math.abs(s) + 0.5 + 1e-9); break; // half away from zero
    case 1: r = Math.abs(diff - 0.5) < 1e-9 ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(s); break;
    case 2: r = Math.ceil(s - 1e-12); break;
    case 3: r = Math.floor(s + 1e-12); break;
    default: r = Math.trunc(s + (s >= 0 ? 1e-12 : -1e-12));
  }
  const out = Number.isFinite(g(r)) ? g(r) : r / 10 ** places;
  return out;
}
export const rounding: Calc = (v) => {
  const raw = txt(v, "x").replace(/,/g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(raw)) throw new InputError("Enter a number such as 3.14159 or 48,275.");
  const x = Number(raw), to = pick(v.to, ROUND_TO.length), method = pick(v.method, ROUND_METHOD.length);
  const n = Math.max(0, Math.min(15, Math.round(num(v.n, 2))));
  let places: number, label: string;
  if (to <= 8) { places = PLACE[to]; label = `the ${ROUND_TO[to].toLowerCase()}`; }
  else if (to === 9) { places = n; label = `${n} decimal place${n === 1 ? "" : "s"}`; }
  else { const sf = Math.max(1, n); places = x === 0 ? 0 : sf - 1 - Math.floor(Math.log10(Math.abs(x))); label = `${sf} significant figure${sf === 1 ? "" : "s"}`; }
  const r = roundAt(x, places, method);
  const dpShow = Math.max(0, places);
  const txtR = r.toLocaleString("en-US", { minimumFractionDigits: dpShow, maximumFractionDigits: dpShow });
  const step = 10 ** -places;
  const lower = roundAt(x, places, 3), upper = lower === x ? x : lower + step;
  return {
    result: txtR, raw: r, rule: `${raw} rounded to ${label} (${ROUND_METHOD[method].split(" (")[0].toLowerCase()})`,
    neighbours: `Between ${Number(lower.toFixed(Math.max(0, places)))} and ${Number(upper.toFixed(Math.max(0, places)))}`,
    error: show(Math.abs(r - x), 8), sci: r === 0 ? "0" : r.toExponential(Math.max(0, Math.min(14, (to === 10 ? Math.max(1, n) : 6) - 1))).replace(to === 10 ? /$^/ : /\.?0+e/, "e"),
  };
};

// ------------------------------------------------------------------ square root & nth root
function simplifyRadical(n: number, k: number): [number, number] {
  let out = 1, inside = n;
  for (let f = 2; f ** k <= inside && f < 1e6; f++) while (inside % f ** k === 0) { inside /= f ** k; out *= f; }
  return [out, inside];
}
const radText = (o: number, i: number, k: number) => { const sym = k === 2 ? "√" : k === 3 ? "∛" : `${k}√`; return i === 1 ? `${o}` : o === 1 ? `${sym}${i}` : `${o}${sym}${i}`; };
export const squareRoot: Calc = (v) => {
  const x = num(v.x, 72);
  const r = Math.sqrt(Math.abs(x));
  const isInt = Number.isInteger(x) && Math.abs(x) <= 1e12;
  const [o, i] = isInt ? simplifyRadical(Math.abs(x), 2) : [0, 0];
  const perfect = isInt && i === 1;
  const lo = Math.floor(r), hi = Math.ceil(r);
  return {
    root: x < 0 ? `${show(r, 12)}i` : show(r, 12), raw: x < 0 ? 0 : sig(r, 14),
    radical: !isInt ? "Simplest form needs a whole number" : x < 0 ? (i === 1 ? `${o}i` : `${radText(o, i, 2)}·i`) : radText(o, i, 2),
    perfect: perfect ? `Yes — ${show(Math.abs(x))} = ${o}²` : "No",
    between: lo === hi ? `${lo}² = ${lo * lo}` : `${lo}² = ${nfmt(lo * lo)} and ${hi}² = ${nfmt(hi * hi)}`,
    both: x < 0 ? `±${show(r, 10)}i` : `±${show(r, 10)}`, check: x < 0 ? "Negative input → imaginary root (i = √−1)" : `${show(r, 10)}² = ${show(r * r, 10)}`,
  };
};
export const nthRoot: Calc = (v) => {
  const x = num(v.x, 27), n = num(v.n, 3);
  if (!(n !== 0)) throw new InputError("The root index can't be 0.");
  const isOddInt = Number.isInteger(n) && Math.abs(n) % 2 === 1;
  if (x < 0 && !isOddInt) throw new InputError("A negative number only has a real root when the index is an odd whole number (for example the cube root).");
  const r = x < 0 ? -(Math.abs(x) ** (1 / n)) : x ** (1 / n);
  const k = Math.round(n);
  const isInt = Number.isInteger(x) && Math.abs(x) <= 1e15 && Number.isInteger(n) && n >= 2;
  const [o, i] = isInt ? simplifyRadical(Math.abs(x), k) : [0, 0];
  return {
    root: show(r, 12), raw: sig(r, 14), radical: isInt ? `${x < 0 ? "−" : ""}${radText(o, i, k)}` : "—",
    perfect: isInt && i === 1 ? `Yes — ${show(x)} = ${x < 0 ? "(−" + o + ")" : o}^${k}` : "No", power: `${show(x)}^(1/${show(n)})`, check: `${show(r, 10)}^${show(n)} = ${show(r ** n, 10)}`,
  };
};

// ------------------------------------------------------------------ ratio
export const RATIO_MODES = ["Simplify a ratio (A:B or A:B:C)", "Solve a proportion A:B = C:x", "Split a total in a ratio", "Scale a ratio by a factor"];
function ratioParts(s: string) {
  const parts = s.split(/\s*[:/]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean).map(Number);
  if (parts.length < 2 || parts.some((p) => !Number.isFinite(p) || p < 0)) throw new InputError('Write the ratio like 12:18 or 2:3:5.');
  return parts;
}
export const ratio: Calc = (v) => {
  const m = pick(v.mode, RATIO_MODES.length), parts = ratioParts(txt(v, "ratio"));
  const dec = Math.max(...parts.map((p) => (String(p).split(".")[1] ?? "").length));
  const ints = parts.map((p) => Math.round(p * 10 ** dec));
  const g = ints.reduce((a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; });
  const simp = ints.map((p) => p / (g || 1));
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum === 0) throw new InputError("A ratio can't be all zeros.");
  const pctTxt = parts.map((p) => `${show((p / sum) * 100, 6)}%`).join(" : ");
  let result: string, detail: string;
  const c = num(v.c, 0);
  if (m === 0) { result = simp.join(" : "); detail = `Divide every part by ${show(g / 10 ** dec)}`; }
  else if (m === 1) {
    if (parts.length !== 2) throw new InputError("A proportion needs a two-part ratio A:B.");
    if (parts[0] === 0) throw new InputError("A can't be 0 in A:B = C:x.");
    const x = (parts[1] * c) / parts[0]; result = `x = ${show(x)}`; detail = `${show(parts[0])}:${show(parts[1])} = ${show(c)}:${show(x)}  (x = B × C ÷ A, cross-multiplying)`;
  } else if (m === 2) { const shares = parts.map((p) => (p / sum) * c); result = shares.map((s) => show(s, 10)).join(" : "); detail = `Total ${show(c)} ÷ ${show(sum)} parts = ${show(c / sum, 10)} per part`; }
  else { result = parts.map((p) => show(p * c)).join(" : "); detail = `Each part × ${show(c)}`; }
  return { result, simplest: simp.join(" : "), unit: parts.length === 2 && parts[1] !== 0 ? `${show(parts[0] / parts[1], 8)} : 1` : "—", percent: pctTxt, fraction: parts.length === 2 ? `First part = ${simp[0]}/${simp[0] + simp[1]} of the total` : `Parts out of ${simp.reduce((a, b) => a + b, 0)}`, detail };
};

// ------------------------------------------------------------------ arithmetic sequence
export const SEQ_MODES = ["From the first term a₁ and difference d", "From two known terms"];
export const arithmeticSequence: Calc = (v) => {
  const m = pick(v.mode, 2), n = Math.round(num(v.n, 10));
  if (n < 1 || n > 1e9) throw new InputError("n must be a whole number of at least 1.");
  let a1: number, d: number;
  if (m === 0) { a1 = num(v.a1, 3); d = num(v.d, 4); }
  else {
    const p = Math.round(num(v.p, 3)), q = Math.round(num(v.q, 8)), ap = num(v.ap, 11), aq = num(v.aq, 31);
    if (p === q || p < 1 || q < 1) throw new InputError("Use two different term positions (both at least 1).");
    d = (aq - ap) / (q - p); a1 = ap - (p - 1) * d;
  }
  const an = a1 + (n - 1) * d, sum = (n / 2) * (a1 + an);
  const list = Array.from({ length: Math.min(n, 12) }, (_, i) => show(a1 + i * d, 10)).join(", ") + (n > 12 ? ", …" : "");
  const dS = d < 0 ? `− ${show(-d, 10)}` : `+ ${show(d, 10)}`;
  return { an: sig(an, 12), sum: sig(sum, 12), formula: `aₙ = ${show(a1, 10)} ${dS}(n − 1)  =  ${show(d, 10)}n ${a1 - d < 0 ? "−" : "+"} ${show(Math.abs(a1 - d), 10)}`, recursive: `aₙ = aₙ₋₁ ${dS}, a₁ = ${show(a1, 10)}`, terms: list, a1d: `a₁ = ${show(a1, 10)}, d = ${show(d, 10)}` };
};

// ------------------------------------------------------------------ distance formula
export const DIM = ["2D (x, y)", "3D (x, y, z)"];
export const distanceFormula: Calc = (v) => {
  const three = pick(v.dim, 2) === 1;
  const x1 = num(v.x1, 0), y1 = num(v.y1, 0), x2 = num(v.x2, 0), y2 = num(v.y2, 0), z1 = three ? num(v.z1, 0) : 0, z2 = three ? num(v.z2, 0) : 0;
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
  const [o, i] = Number.isInteger(d2) && d2 <= 1e12 ? simplifyRadical(d2, 2) : [0, 0];
  const mid = three ? `(${show((x1 + x2) / 2)}, ${show((y1 + y2) / 2)}, ${show((z1 + z2) / 2)})` : `(${show((x1 + x2) / 2)}, ${show((y1 + y2) / 2)})`;
  return {
    distance: sig(d, 12), exact: o ? radText(o, i, 2) : "—",
    working: three ? `√((${show(dx)})² + (${show(dy)})² + (${show(dz)})²) = √${show(d2)}` : `√((${show(dx)})² + (${show(dy)})²) = √${show(d2)}`,
    midpoint: mid, slope: three ? "— (3D)" : dx === 0 ? "Undefined (vertical line)" : show(dy / dx, 10), deltas: three ? `Δx = ${show(dx)}, Δy = ${show(dy)}, Δz = ${show(dz)}` : `Δx = ${show(dx)}, Δy = ${show(dy)}`,
  };
};

// ------------------------------------------------------------------ roman numerals
const RN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const toRoman = (n: number) => { let s = ""; for (const [k, r] of RN) while (n >= k) { s += r; n -= k; } return s; };
const OVER = "̅";
export const ROMAN_MODES = ["Number → Roman numerals", "Roman numerals → number"];
export const romanNumeral: Calc = (v) => {
  const m = pick(v.mode, 2), raw = txt(v, "x").trim();
  let n: number, roman: string;
  if (m === 0) {
    n = Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(n) || n < 1 || n > 3999999) throw new InputError("Enter a whole number from 1 to 3,999,999.");
    const th = Math.floor(n / 1000), rest = n % 1000;
    roman = n < 4000 ? toRoman(n) : [...toRoman(th)].map((ch) => ch + OVER).join("") + toRoman(rest);
  } else {
    const s = raw.toUpperCase().replace(/\s+/g, "");
    if (!/^[MDCLXVI]+$/.test(s)) throw new InputError("Use only the letters M, D, C, L, X, V and I.");
    const val: Record<string, number> = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
    n = 0;
    for (let i = 0; i < s.length; i++) { const c = val[s[i]], nx = val[s[i + 1]] ?? 0; n += c < nx ? -c : c; }
    roman = toRoman(n);
    if (roman !== s) throw new InputError(`"${s}" isn't written in standard form — ${n} is written ${roman}.`);
  }
  const parts = String(n).split("").reverse().map((dg, i) => Number(dg) * 10 ** i).filter(Boolean).reverse();
  return { result: m === 0 ? roman : nfmt(n), number: n, roman, breakdown: n < 4000 ? parts.map((p) => `${p} = ${toRoman(p)}`).join(", ") : "Values over 3,999 use a bar (vinculum): a barred letter means × 1,000", year: n >= 1 && n <= 3999 ? `${toRoman(n)} (as used for years, e.g. on films and buildings)` : "—" };
};

// ------------------------------------------------------------------ military time
export const MIL_MODES = ["12-hour → military (24-hour) time", "Military → 12-hour time", "Hours between two military times"];
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
const say = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
const spoken = (min: number) => { const h = Math.floor(min / 60), m = min % 60; const hs = h === 0 ? "zero" : h < 10 ? `zero ${ONES[h]}` : say(h); return `${hs} ${m === 0 ? "hundred" : m < 10 ? `zero ${ONES[m]}` : say(m)} hours`; };
const mil = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}${String(min % 60).padStart(2, "0")}`;
const twelve = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
function readMil(s: string, label: string) {
  const t = s.trim().replace(/\s*(hours|hrs|h)$/i, "");
  if (/^\d{3,4}$/.test(t)) { const v = t.padStart(4, "0"), h = Number(v.slice(0, 2)), m = Number(v.slice(2)); if (h > 24 || m > 59 || (h === 24 && m > 0)) throw new InputError(`${label}: "${s}" isn't a valid military time.`); return (h % 24) * 60 + m; }
  return parseClock(t, label);
}
export const militaryTime: Calc = (v) => {
  const m = pick(v.mode, 3);
  const a = readMil(txt(v, "t1"), "Time");
  if (m < 2) return { result: m === 0 ? `${mil(a)} hours` : twelve(a), military: mil(a), colon: `${mil(a).slice(0, 2)}:${mil(a).slice(2)}`, twelve: twelve(a), spoken: spoken(a), duration: "—" };
  const b = readMil(txt(v, "t2"), "End time");
  let d = b - a; const over = d < 0; if (over) d += 1440;
  return { result: `${Math.floor(d / 60)} h ${d % 60} min`, military: `${mil(a)} → ${mil(b)}`, colon: `${mil(a).slice(0, 2)}:${mil(a).slice(2)} → ${mil(b).slice(0, 2)}:${mil(b).slice(2)}`, twelve: `${twelve(a)} → ${twelve(b)}`, spoken: spoken(a), duration: `${sig(d / 60, 6)} decimal hours${over ? " (crosses midnight)" : ""}` };
};

export const genMathCustomCalculators: Record<string, Calc> = {
  "area-calculator": area,
  "volume-calculator": volume,
  "surface-area-calculator": surfaceArea,
  "triangle-calculator": triangle,
  "long-division-calculator": longDivision,
  "rounding-calculator": rounding,
  "square-root-calculator": squareRoot,
  "nth-root-calculator": nthRoot,
  "ratio-calculator": ratio,
  "arithmetic-sequence-calculator": arithmeticSequence,
  "distance-formula-calculator": distanceFormula,
  "roman-numeral-calculator": romanNumeral,
  "military-time-calculator": militaryTime,
};
