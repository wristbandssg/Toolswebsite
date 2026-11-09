/**
 * Batch: "Science Calculators" → Math Calculators (geometry & trigonometry — 40 tools).
 *
 * Standard formulas: Heron's formula; law of sines (with the SSA ambiguous case) and cosines;
 * special right triangles 1 : √3 : 2 and 1 : 1 : √2; cone slant s = √(r² + h²); frustum
 * V = πh(R² + Rr + r²)/3; ellipse perimeter by Ramanujan's second approximation; ellipsoid surface
 * by Knud Thomsen's formula (p = 1.6075, error < 1.1%); regular polygon A = n s² / (4 tan(π/n));
 * polar area ½∫r² dθ; π digits by Machin's formula with BigInt; sphere packing counts use packing
 * fractions (simple cubic 0.5236, random loose 0.60, random close 0.64, FCC/HCP 0.7405).
 * See prisma/create-sci-geo-calculators.ts for the copy.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig, compileFn, integrate } from "./sci-math-core";

export const ANGLE_UNITS = ["Degrees", "Radians"];
const toRad = (v: Vals, a: number) => (pick(v.unit, 2) === 0 ? (a * Math.PI) / 180 : a);
const D = (r: number) => (r * 180) / Math.PI;
const R = (d: number) => (d * Math.PI) / 180;
const need = (cond: boolean, msg: string) => {
  if (!cond) throw new InputError(msg);
};
const s = (x: number, n = 10) => sig(x, n);

// ---------- Trig functions ----------
export const sohcahtoa: SciCalculator = (v) => {
  const t = toRad(v, num(v.angle, 30)), h = pos(v.hyp, 10);
  const sn = Math.sin(t), cs = Math.cos(t), tn = Math.tan(t);
  const clean = (x: number) => (Math.abs(x) < 1e-14 ? 0 : x);
  return { sin: s(clean(sn), 12), cos: s(clean(cs), 12), tan: Math.abs(cs) < 1e-14 ? "undefined" : s(clean(tn), 12), csc: Math.abs(sn) < 1e-14 ? "undefined" : s(1 / sn, 10), sec: Math.abs(cs) < 1e-14 ? "undefined" : s(1 / cs, 10), cot: Math.abs(sn) < 1e-14 ? "undefined" : s(cs / sn, 10), legs: `opposite = ${fmt(h * sn, 8)}, adjacent = ${fmt(h * cs, 8)} (for hypotenuse ${fmt(h)})` };
};

// ---------- 3D solids ----------
export const cylinder: SciCalculator = (v) => {
  const r = pos(v.r, 3), h = pos(v.h, 10);
  const V = Math.PI * r * r * h;
  return { volume: s(V, 12), lateral: s(2 * Math.PI * r * h), total: s(2 * Math.PI * r * (r + h)), base: s(Math.PI * r * r), liters: s(V / 1000, 8), gallons: s(V / 231, 8) };
};
export const sphere: SciCalculator = (v) => {
  const mode = pick(v.mode, 3);
  let r = pos(v.r, 5);
  if (mode === 1) r = Math.cbrt((3 * pos(v.r, 5)) / (4 * Math.PI));
  if (mode === 2) r = Math.sqrt(pos(v.r, 5) / (4 * Math.PI));
  return { volume: s((4 / 3) * Math.PI * r ** 3, 12), surface: s(4 * Math.PI * r * r, 12), radius: s(r, 10), diameter: s(2 * r, 10), circumference: s(2 * Math.PI * r, 10) };
};
export const SPHERE_MODE = ["I know the radius", "I know the volume", "I know the surface area"];
export const hemisphere: SciCalculator = (v) => {
  const r = pos(v.r, 5);
  return { volume: s((2 / 3) * Math.PI * r ** 3, 12), curved: s(2 * Math.PI * r * r), total: s(3 * Math.PI * r * r), base: s(Math.PI * r * r) };
};
export const CONE_MODE = ["Cone from radius & height", "Height from volume & radius", "Frustum (truncated cone)"];
export const cone: SciCalculator = (v) => {
  const m = pick(v.mode, 3), r = pos(v.r, 3);
  let h = pos(v.h, 4);
  if (m === 1) h = (3 * pos(v.vol, 37.7)) / (Math.PI * r * r);
  if (m === 2) {
    const r2 = pos(v.r2, 1), sl = Math.hypot(h, r - r2);
    return { volume: s((Math.PI * h * (r * r + r * r2 + r2 * r2)) / 3, 12), height: s(h), slant: s(sl), lateral: s(Math.PI * (r + r2) * sl), total: s(Math.PI * (r + r2) * sl + Math.PI * (r * r + r2 * r2)) };
  }
  const sl = Math.hypot(r, h);
  return { volume: s((Math.PI * r * r * h) / 3, 12), height: s(h), slant: s(sl), lateral: s(Math.PI * r * sl), total: s(Math.PI * r * (r + sl)) };
};
export const rectPrism: SciCalculator = (v) => {
  const l = pos(v.l, 5), w = pos(v.w, 4), h = pos(v.h, 3);
  return { volume: s(l * w * h, 12), surface: s(2 * (l * w + l * h + w * h), 12), diagonal: s(Math.sqrt(l * l + w * w + h * h)), lateral: s(2 * h * (l + w)) };
};
export const pyramid: SciCalculator = (v) => {
  const l = pos(v.l, 6), w = pos(v.w, 6), h = pos(v.h, 4);
  const sl1 = Math.hypot(h, w / 2), sl2 = Math.hypot(h, l / 2);
  const lateral = l * sl1 + w * sl2;
  return { volume: s((l * w * h) / 3, 12), surface: s(lateral + l * w), lateral: s(lateral), slant: `${fmt(sl1, 8)} (over the length side), ${fmt(sl2, 8)} (over the width side)`, edge: s(Math.sqrt(h * h + (l / 2) ** 2 + (w / 2) ** 2)) };
};
export const ellipsoid: SciCalculator = (v) => {
  const a = pos(v.a, 3), b = pos(v.b, 2), c = pos(v.c, 1), p = 1.6075;
  const S = 4 * Math.PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p);
  return { volume: s((4 / 3) * Math.PI * a * b * c, 12), surface: s(S, 8), type: a === b && b === c ? 0 : a === b || b === c || a === c ? 1 : 2 };
};
export const ELLIPSOID_TYPE = ["Sphere", "Spheroid (two equal axes)", "Scalene ellipsoid"];
export const PACKINGS = ["Random close packing (≈ 0.64)", "Random loose packing (≈ 0.60)", "Ordered FCC / HCP (0.7405)", "Simple cubic (0.5236)"];
const PACK = [0.64, 0.6, 0.74048, 0.5236];
export const spherePacking: SciCalculator = (v) => {
  const Dc = pos(v.cd, 100), H = pos(v.ch, 200), d = pos(v.sd, 10), f = PACK[pick(v.pack, 4)];
  need(d > 0 && d < Dc, "The spheres must be smaller than the container diameter.");
  const vc = Math.PI * (Dc / 2) ** 2 * H, vs = (Math.PI / 6) * d ** 3;
  // wall effect: effective diameter/height reduced by about half a sphere
  const eff = Math.PI * ((Dc - d / 2) / 2) ** 2 * Math.max(0, H - d / 2);
  return { count: Math.floor((f * eff) / vs), ideal: Math.floor((f * vc) / vs), ratio: s(Dc / d, 8), fraction: f, emptyVolume: s(vc - Math.floor((f * eff) / vs) * vs, 8) };
};

// ---------- Circles ----------
export const CIRCLE_KNOWN = ["Radius", "Diameter", "Circumference", "Area"];
export const circle: SciCalculator = (v) => {
  const k = pick(v.known, 4), x = pos(v.value, 5);
  const r = [x, x / 2, x / (2 * Math.PI), Math.sqrt(x / Math.PI)][k];
  return { radius: s(r, 12), diameter: s(2 * r, 12), circumference: s(2 * Math.PI * r, 12), area: s(Math.PI * r * r, 12), semicircleArea: s((Math.PI * r * r) / 2, 10) };
};
export const sector: SciCalculator = (v) => {
  const r = pos(v.r, 10), t = toRad(v, pos(v.angle, 60));
  const chord = 2 * r * Math.sin(t / 2);
  return { area: s(0.5 * r * r * t, 12), arc: s(r * t, 12), chord: s(chord), segment: s(0.5 * r * r * (t - Math.sin(t))), perimeter: s(2 * r + r * t) };
};
export const circleEquation: SciCalculator = (v) => {
  const m = pick(v.mode, 2);
  let h = num(v.h, 2), k = num(v.k, -3), r = pos(v.r, 5);
  if (m === 1) {
    const Dd = num(v.D, -4), Ee = num(v.E, 6), F = num(v.F, -12);
    h = -Dd / 2;
    k = -Ee / 2;
    const rr = h * h + k * k - F;
    need(rr > 0, "Those coefficients don't describe a real circle (r² ≤ 0).");
    r = Math.sqrt(rr);
  }
  const sg = (x: number) => (x < 0 ? `+ ${fmt(-x)}` : `− ${fmt(x)}`);
  return { standard: `(x ${sg(h)})² + (y ${sg(k)})² = ${fmt(r * r, 10)}`, general: `x² + y² ${-2 * h < 0 ? "−" : "+"} ${fmt(Math.abs(2 * h))}x ${-2 * k < 0 ? "−" : "+"} ${fmt(Math.abs(2 * k))}y ${h * h + k * k - r * r < 0 ? "−" : "+"} ${fmt(Math.abs(h * h + k * k - r * r), 10)} = 0`, center: `(${fmt(h)}, ${fmt(k)})`, radius: s(r, 12) };
};
export const CIRCLE_MODE = ["From centre & radius", "From general form x² + y² + Dx + Ey + F = 0"];

// ---------- Pi digits (Machin) ----------
export const piDigits: SciCalculator = (v) => {
  const n = Math.min(2000, Math.max(1, Math.round(pos(v.n, 50))));
  const prec = BigInt(n + 10), scale = BigInt(10) ** prec;
  const arctanInv = (x: bigint) => {
    let sum = BigInt(0), term = scale / x, k = BigInt(1), sign = BigInt(1);
    const x2 = x * x;
    while (term !== BigInt(0)) {
      sum += (sign * term) / k;
      term /= x2;
      k += BigInt(2);
      sign = -sign;
    }
    return sum;
  };
  const pi = BigInt(4) * (BigInt(4) * arctanInv(BigInt(5)) - arctanInv(BigInt(239)));
  const str = pi.toString();
  const digits = `3.${str.slice(1, n + 1)}`;
  const grouped = digits.slice(2).replace(/(\d{10})/g, "$1 ").trim();
  return { pi: digits.length > 40 ? `3.${grouped}` : digits, digits: n, circleNote: `circumference of a 1 m wide circle = ${digits.slice(0, 12)} m` };
};

// ---------- Triangles ----------
export const PYTH_MODE = ["Find hypotenuse c from legs a, b", "Find leg a from leg b and hypotenuse c"];
export const pythagorean: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = pos(v.a, 3), b = pos(v.b, 4), c = pos(v.c, 5);
  if (m === 0) return { result: s(Math.hypot(a, b), 12), working: `c = √(${fmt(a)}² + ${fmt(b)}²) = √${fmt(a * a + b * b, 10)}`, area: s((a * b) / 2), triple: Number.isInteger(Math.hypot(a, b)) && Number.isInteger(a) && Number.isInteger(b) ? 0 : 1 };
  need(c > b, "The hypotenuse must be the longest side.");
  const leg = Math.sqrt(c * c - b * b);
  return { result: s(leg, 12), working: `a = √(${fmt(c)}² − ${fmt(b)}²) = √${fmt(c * c - b * b, 10)}`, area: s((leg * b) / 2), triple: Number.isInteger(leg) && Number.isInteger(b) && Number.isInteger(c) ? 0 : 1 };
};
export const TRIPLE = ["Whole-number Pythagorean triple", "Not a whole-number triple"];
export const SPECIAL_30 = ["Short leg (opposite 30°)", "Long leg (opposite 60°)", "Hypotenuse"];
export const tri306090: SciCalculator = (v) => {
  const k = pick(v.known, 3), x = pos(v.value, 5);
  const a = [x, x / Math.sqrt(3), x / 2][k];
  return { short: s(a, 12), long: s(a * Math.sqrt(3), 12), hyp: s(2 * a, 12), area: s((a * a * Math.sqrt(3)) / 2), perimeter: s(a * (3 + Math.sqrt(3))) };
};
export const SPECIAL_45 = ["Leg", "Hypotenuse"];
export const tri454590: SciCalculator = (v) => {
  const k = pick(v.known, 2), x = pos(v.value, 5);
  const a = k === 0 ? x : x / Math.SQRT2;
  return { leg: s(a, 12), hyp: s(a * Math.SQRT2, 12), area: s((a * a) / 2), perimeter: s(a * (2 + Math.SQRT2)) };
};
export const COS_MODE = ["SAS — find side c from a, b and angle C", "SSS — find all angles from a, b, c"];
export const lawOfCosines: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = pos(v.a, 7), b = pos(v.b, 9);
  if (m === 0) {
    const C = R(pos(v.C, 60)), c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C));
    const A = D(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
    return { result: s(c, 12), angles: `A = ${fmt(A, 8)}°, B = ${fmt(180 - A - D(C), 8)}°, C = ${fmt(D(C), 8)}°`, area: s(0.5 * a * b * Math.sin(C)) };
  }
  const c = pos(v.c, 8);
  need(a + b > c && a + c > b && b + c > a, "Those sides don't form a triangle.");
  const A = D(Math.acos((b * b + c * c - a * a) / (2 * b * c))), B = D(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
  const sp = (a + b + c) / 2;
  return { result: s(180 - A - B, 10), angles: `A = ${fmt(A, 8)}°, B = ${fmt(B, 8)}°, C = ${fmt(180 - A - B, 8)}°`, area: s(Math.sqrt(sp * (sp - a) * (sp - b) * (sp - c))) };
};
export const SINE_MODE = ["AAS / ASA — two angles A, B and side a", "SSA — sides a, b and angle A (ambiguous case)"];
export const lawOfSines: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = pos(v.a, 10), A = pos(v.A, 40);
  if (m === 0) {
    const B = pos(v.B, 60), C = 180 - A - B;
    need(C > 0, "The angles add up to 180° or more.");
    const k = a / Math.sin(R(A));
    return { solutions: 1, triangle1: `b = ${fmt(k * Math.sin(R(B)), 8)}, c = ${fmt(k * Math.sin(R(C)), 8)}, C = ${fmt(C, 8)}°`, triangle2: "—", ratio: s(k, 10) };
  }
  const b = pos(v.b, 12);
  const sinB = (b * Math.sin(R(A))) / a;
  if (sinB > 1 + 1e-12) return { solutions: 0, triangle1: "no triangle (b·sin A > a)", triangle2: "—", ratio: s(a / Math.sin(R(A)), 10) };
  const B1 = D(Math.asin(Math.min(1, sinB))), B2 = 180 - B1;
  const tri = (B: number) => {
    const C = 180 - A - B;
    return `B = ${fmt(B, 8)}°, C = ${fmt(C, 8)}°, c = ${fmt((a * Math.sin(R(C))) / Math.sin(R(A)), 8)}`;
  };
  const two = B2 + A < 180 && Math.abs(B2 - B1) > 1e-9;
  return { solutions: two ? 2 : 1, triangle1: tri(B1), triangle2: two ? tri(B2) : "—", ratio: s(a / Math.sin(R(A)), 10) };
};
export const AREA_MODE = ["Three sides (Heron's formula)", "Base and height", "Two sides and the included angle"];
export const triangleArea: SciCalculator = (v) => {
  const m = pick(v.mode, 3), a = pos(v.a, 5), b = pos(v.b, 6), c = pos(v.c, 7);
  if (m === 0) {
    need(a + b > c && a + c > b && b + c > a, "Those sides don't form a triangle.");
    const sp = (a + b + c) / 2, A = Math.sqrt(sp * (sp - a) * (sp - b) * (sp - c));
    return { area: s(A, 12), perimeter: s(a + b + c), working: `s = ${fmt(sp)}; A = √(s(s−a)(s−b)(s−c)) = ${fmt(A, 10)}` };
  }
  if (m === 1) return { area: s((a * b) / 2, 12), perimeter: "—", working: `A = ½ × ${fmt(a)} × ${fmt(b)}` };
  const C = R(c);
  return { area: s(0.5 * a * b * Math.sin(C), 12), perimeter: s(a + b + Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C))), working: `A = ½ab·sin C = ½ × ${fmt(a)} × ${fmt(b)} × sin ${fmt(c)}°` };
};
export const RIGHT_MODE = ["Two legs a, b", "Leg a and hypotenuse c", "Leg a and angle A (opposite)", "Hypotenuse c and angle A"];
export const rightTriangle: SciCalculator = (v) => {
  const m = pick(v.mode, 4), x = pos(v.x, 3), y = pos(v.y, 4);
  let a = 0, b = 0, c = 0;
  if (m === 0) [a, b, c] = [x, y, Math.hypot(x, y)];
  else if (m === 1) {
    need(y > x, "The hypotenuse must be longer than the leg.");
    [a, c] = [x, y];
    b = Math.sqrt(c * c - a * a);
  } else if (m === 2) {
    need(y > 0 && y < 90, "The angle must be between 0° and 90°.");
    a = x;
    c = a / Math.sin(R(y));
    b = a / Math.tan(R(y));
  } else {
    need(y > 0 && y < 90, "The angle must be between 0° and 90°.");
    c = x;
    a = c * Math.sin(R(y));
    b = c * Math.cos(R(y));
  }
  const A = D(Math.atan2(a, b));
  return { sides: `a = ${fmt(a, 10)}, b = ${fmt(b, 10)}, c = ${fmt(c, 10)}`, angles: `A = ${fmt(A, 8)}°, B = ${fmt(90 - A, 8)}°, C = 90°`, area: s((a * b) / 2, 12), perimeter: s(a + b + c), altitude: s((a * b) / c) };
};
export const centroid: SciCalculator = (v) => {
  const xs = [num(v.x1, 0), num(v.x2, 6), num(v.x3, 3)], ys = [num(v.y1, 0), num(v.y2, 0), num(v.y3, 9)];
  const area = 0.5 * Math.abs(xs[0] * (ys[1] - ys[2]) + xs[1] * (ys[2] - ys[0]) + xs[2] * (ys[0] - ys[1]));
  return { centroid: `(${fmt((xs[0] + xs[1] + xs[2]) / 3, 10)}, ${fmt((ys[0] + ys[1] + ys[2]) / 3, 10)})`, area: s(area, 12) };
};
export const TRI_TEST = ["Do three sides make a triangle?", "Third angle and exterior angle"];
export const triangleInequality: SciCalculator = (v) => {
  const m = pick(v.mode, 2), a = pos(v.a, 3), b = pos(v.b, 4), c = pos(v.c, 8);
  if (m === 0) {
    const ok = a + b > c && a + c > b && b + c > a;
    const sorted = [a, b, c].sort((p, q) => p - q);
    const kind = !ok ? "—" : Math.abs(sorted[0] ** 2 + sorted[1] ** 2 - sorted[2] ** 2) < 1e-9 ? "right" : sorted[0] ** 2 + sorted[1] ** 2 > sorted[2] ** 2 ? "acute" : "obtuse";
    return { valid: ok ? 0 : 1, result: "—", detail: `${fmt(a)} + ${fmt(b)} ${a + b > c ? ">" : "≤"} ${fmt(c)}; third side must be between ${fmt(Math.abs(a - b))} and ${fmt(a + b)}`, kind };
  }
  const C = 180 - a - b;
  need(C > 0, "The two angles add up to 180° or more.");
  return { result: s(C, 10), valid: "—", detail: `exterior angle at C = ${fmt(a + b)}° (equals the two remote interior angles)`, kind: C === 90 || a === 90 || b === 90 ? "right" : Math.max(a, b, C) > 90 ? "obtuse" : "acute" };
};
export const TRI_OK = ["Yes — a valid triangle", "No — fails the triangle inequality"];

// ---------- Angles ----------
export const unitCircle: SciCalculator = (v) => {
  const a = num(v.angle, 765), rad = pick(v.unit, 2) === 1;
  const full = rad ? 2 * Math.PI : 360;
  const p = ((a % full) + full) % full;
  const pd = rad ? D(p) : p;
  const quad = pd === 0 || pd === 90 || pd === 180 || pd === 270 ? "on an axis" : pd < 90 ? "I" : pd < 180 ? "II" : pd < 270 ? "III" : "IV";
  const ref = pd <= 90 ? pd : pd <= 180 ? 180 - pd : pd <= 270 ? pd - 180 : 360 - pd;
  return { positive: s(p, 12), negative: s(p - full, 12), reference: s(rad ? R(ref) : ref, 12), quadrant: quad, point: `(cos, sin) = (${fmt(Math.cos(R(pd)), 8)}, ${fmt(Math.sin(R(pd)), 8)})` };
};
export const trigIdentities: SciCalculator = (v) => {
  const t = R(num(v.angle, 30)), p = R(num(v.angle2, 45));
  const f = (x: number) => fmt(Math.abs(x) < 1e-14 ? 0 : x, 10);
  return {
    double: `sin 2θ = ${f(Math.sin(2 * t))}, cos 2θ = ${f(Math.cos(2 * t))}, tan 2θ = ${f(Math.tan(2 * t))}`,
    half: `sin(θ/2) = ${f(Math.sin(t / 2))}, cos(θ/2) = ${f(Math.cos(t / 2))}, tan(θ/2) = ${f(Math.tan(t / 2))}`,
    sum: `sin(θ+φ) = ${f(Math.sin(t + p))}, cos(θ+φ) = ${f(Math.cos(t + p))}, tan(θ+φ) = ${f(Math.tan(t + p))}`,
    difference: `sin(θ−φ) = ${f(Math.sin(t - p))}, cos(θ−φ) = ${f(Math.cos(t - p))}`,
    pythagorean: s(Math.sin(t) ** 2 + Math.cos(t) ** 2, 12),
  };
};
export const TRIG_FN = ["sin", "cos", "tan"];
export const trigEquation: SciCalculator = (v) => {
  const fnI = pick(v.fn, 3), a = num(v.a, 2), b = num(v.b, 1) || 1, c = num(v.c, 0), d = num(v.d, 1);
  need(a !== 0, "a can't be 0.");
  const k = (d - c) / a;
  if (fnI < 2 && Math.abs(k) > 1) return { solutions: "no solution (sin and cos are between −1 and 1)", general: "—" };
  const base = fnI === 0 ? D(Math.asin(k)) : fnI === 1 ? D(Math.acos(k)) : D(Math.atan(k));
  const seeds = fnI === 0 ? [base, 180 - base] : fnI === 1 ? [base, -base] : [base];
  const per = fnI === 2 ? 180 : 360;
  const sols = new Set<string>();
  for (const sd of seeds) for (let n = -4 * Math.ceil(Math.abs(b)); n <= 4 * Math.ceil(Math.abs(b)); n++) {
    const x = (sd + n * per) / b;
    if (x >= -1e-9 && x < 360 - 1e-9) sols.add(fmt(Math.abs(x) < 1e-9 ? 0 : x, 8));
  }
  const list = [...sols].map(Number).sort((p, q) => p - q);
  const gen = fnI === 0 ? `x = (${fmt(base, 8)}° + 360°n)/${fmt(b)} or (${fmt(180 - base, 8)}° + 360°n)/${fmt(b)}` : fnI === 1 ? `x = (±${fmt(base, 8)}° + 360°n)/${fmt(b)}` : `x = (${fmt(base, 8)}° + 180°n)/${fmt(b)}`;
  return { solutions: list.map((x) => `${fmt(x, 8)}°`).join(", ") || "none in 0°–360°", general: gen };
};
export const inverseTrig: SciCalculator = (v) => {
  const x = num(v.x, 0.5);
  const ok = Math.abs(x) <= 1;
  const out = (f: number) => `${fmt(D(f), 10)}° = ${fmt(f, 10)} rad`;
  return { asin: ok ? out(Math.asin(x)) : "undefined (|x| > 1)", acos: ok ? out(Math.acos(x)) : "undefined (|x| > 1)", atan: out(Math.atan(x)), acot: out(Math.PI / 2 - Math.atan(x)), asec: Math.abs(x) >= 1 ? out(Math.acos(1 / x)) : "undefined (|x| < 1)", acsc: Math.abs(x) >= 1 ? out(Math.asin(1 / x)) : "undefined (|x| < 1)" };
};
export const ELEV_MODE = ["Angle from height & horizontal distance", "Height from angle & distance", "Distance from angle & height"];
export const angleDepression: SciCalculator = (v) => {
  const m = pick(v.mode, 3), h = pos(v.h, 50), dist = pos(v.d, 120), ang = pos(v.angle, 25);
  if (m === 0) return { result: s(D(Math.atan2(h, dist)), 10), lineOfSight: s(Math.hypot(h, dist)), note: "Angle of depression from the top = angle of elevation from the bottom (alternate angles)." };
  if (m === 1) return { result: s(dist * Math.tan(R(ang)), 10), lineOfSight: s(dist / Math.cos(R(ang))), note: "height = distance × tan(angle)" };
  return { result: s(h / Math.tan(R(ang)), 10), lineOfSight: s(h / Math.sin(R(ang))), note: "distance = height ÷ tan(angle)" };
};
export const hyperbolic: SciCalculator = (v) => {
  const x = num(v.x, 1);
  return { sinh: s(Math.sinh(x), 12), cosh: s(Math.cosh(x), 12), tanh: s(Math.tanh(x), 12), sech: s(1 / Math.cosh(x), 12), csch: x === 0 ? "undefined" : s(1 / Math.sinh(x), 12), coth: x === 0 ? "undefined" : s(1 / Math.tanh(x), 12), inverse: `asinh = ${fmt(Math.asinh(x), 10)}, acosh = ${x >= 1 ? fmt(Math.acosh(x), 10) : "undefined"}, atanh = ${Math.abs(x) < 1 ? fmt(Math.atanh(x), 10) : "undefined"}` };
};

// ---------- Coordinates & conics ----------
export const POLAR_DIR = ["Rectangular (x, y) → polar (r, θ)", "Polar (r, θ) → rectangular (x, y)"];
export const polarRect: SciCalculator = (v) => {
  const m = pick(v.mode, 2), p = num(v.p, 3), q = num(v.q, 4);
  if (m === 0) {
    const r = Math.hypot(p, q), t = Math.atan2(q, p);
    return { result: `r = ${fmt(r, 10)}, θ = ${fmt(D(t), 10)}° (${fmt(t, 10)} rad)`, complex: `${fmt(p)} ${q < 0 ? "−" : "+"} ${fmt(Math.abs(q))}i = ${fmt(r, 8)}∠${fmt(D(t), 8)}° = ${fmt(r, 8)}e^(${fmt(t, 6)}i)`, r: s(r, 12) };
  }
  const t = R(q);
  return { result: `x = ${fmt(p * Math.cos(t), 10)}, y = ${fmt(p * Math.sin(t), 10)}`, complex: `${fmt(p)}∠${fmt(q)}° = ${fmt(p * Math.cos(t), 8)} ${p * Math.sin(t) < 0 ? "−" : "+"} ${fmt(Math.abs(p * Math.sin(t)), 8)}i`, r: s(p, 12) };
};
export const polarGraph: SciCalculator = (v) => {
  const f = compileFn(txt(v, "rt"), ["t"]);
  const t0 = R(num(v.t0, 0)), t1 = R(num(v.t1, 360));
  const area = 0.5 * integrate((t) => f(t) ** 2, t0, t1);
  let maxR = -Infinity, maxT = 0;
  for (let i = 0; i <= 720; i++) {
    const t = t0 + ((t1 - t0) * i) / 720, r = Math.abs(f(t));
    if (r > maxR) [maxR, maxT] = [r, t];
  }
  const table = [0, 30, 45, 60, 90, 120, 180, 270].map((d) => {
    const r = f(R(d));
    return `θ = ${String(d).padStart(3)}°  r = ${fmt(r, 6).padStart(10)}  (x, y) = (${fmt(r * Math.cos(R(d)), 5)}, ${fmt(r * Math.sin(R(d)), 5)})`;
  }).join("\n");
  return { area: s(area, 10), maxR: s(maxR, 10), at: s(D(maxT), 8), table };
};
export const parabola: SciCalculator = (v) => {
  const a = num(v.a, 1), b = num(v.b, -4), c = num(v.c, 3);
  need(a !== 0, "a can't be 0.");
  const h = -b / (2 * a), k = c - (b * b) / (4 * a), p = 1 / (4 * a), Dd = b * b - 4 * a * c;
  return { vertex: `(${fmt(h, 10)}, ${fmt(k, 10)})`, focus: `(${fmt(h, 10)}, ${fmt(k + p, 10)})`, directrix: `y = ${fmt(k - p, 10)}`, axis: `x = ${fmt(h, 10)}`, roots: Dd < 0 ? "none (real)" : Dd === 0 ? fmt(h, 10) : `${fmt((-b - Math.sqrt(Dd)) / (2 * a), 10)}, ${fmt((-b + Math.sqrt(Dd)) / (2 * a), 10)}`, latusRectum: s(Math.abs(1 / a), 10) };
};
export const ellipse: SciCalculator = (v) => {
  let a = pos(v.a, 5), b = pos(v.b, 3);
  if (b > a) [a, b] = [b, a];
  const c = Math.sqrt(a * a - b * b), h = ((a - b) / (a + b)) ** 2;
  const P = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  return { area: s(Math.PI * a * b, 12), perimeter: s(P, 10), eccentricity: s(c / a, 10), foci: `±${fmt(c, 10)} from the centre along the major axis`, latusRectum: s((2 * b * b) / a, 10) };
};
export const HYP_ORIENT = ["Horizontal: (x−h)²/a² − (y−k)²/b² = 1", "Vertical: (y−k)²/a² − (x−h)²/b² = 1"];
export const hyperbola: SciCalculator = (v) => {
  const a = pos(v.a, 3), b = pos(v.b, 4), h = num(v.h, 0), k = num(v.k, 0), o = pick(v.orient, 2);
  const c = Math.hypot(a, b);
  const pts = (d: number) => (o === 0 ? `(${fmt(h - d)}, ${fmt(k)}) and (${fmt(h + d)}, ${fmt(k)})` : `(${fmt(h)}, ${fmt(k - d)}) and (${fmt(h)}, ${fmt(k + d)})`);
  const m = o === 0 ? b / a : a / b;
  return { vertices: pts(a), foci: pts(c), asymptotes: `y − ${fmt(k)} = ±${fmt(m, 8)}(x − ${fmt(h)})`, eccentricity: s(c / a, 10), c: s(c, 10) };
};
export const CONIC_TYPE = ["Ellipse", "Circle", "Parabola", "Hyperbola", "Degenerate / not a conic"];
export const conic: SciCalculator = (v) => {
  const A = num(v.A, 4), B = num(v.B, 0), C = num(v.C, 9), Dd = num(v.D, -16), Ee = num(v.E, 18);
  const disc = B * B - 4 * A * C;
  let type: number;
  if (A === 0 && B === 0 && C === 0) type = 4;
  else if (disc < 0) type = A === C && B === 0 ? 1 : 0;
  else if (disc === 0) type = 2;
  else type = 3;
  let center = "—";
  if (B === 0 && type !== 2 && A !== 0 && C !== 0) center = `(${fmt(-Dd / (2 * A), 10)}, ${fmt(-Ee / (2 * C), 10)})`;
  return { type, discriminant: s(disc, 10), center, rotation: B === 0 ? "none (B = 0)" : `${fmt(D(0.5 * Math.atan2(B, A - C)), 8)}°` };
};
export const bilinear: SciCalculator = (v) => {
  const x1 = num(v.x1, 0), x2 = num(v.x2, 1), y1 = num(v.y1, 0), y2 = num(v.y2, 1);
  const q11 = num(v.q11, 10), q21 = num(v.q21, 20), q12 = num(v.q12, 30), q22 = num(v.q22, 40), x = num(v.x, 0.5), y = num(v.y, 0.5);
  need(x1 !== x2 && y1 !== y2, "x₁ ≠ x₂ and y₁ ≠ y₂.");
  const fx1 = ((x2 - x) / (x2 - x1)) * q11 + ((x - x1) / (x2 - x1)) * q21, fx2 = ((x2 - x) / (x2 - x1)) * q12 + ((x - x1) / (x2 - x1)) * q22;
  return { value: s(((y2 - y) / (y2 - y1)) * fx1 + ((y - y1) / (y2 - y1)) * fx2, 12), along: `f(x, y₁) = ${fmt(fx1, 10)}, f(x, y₂) = ${fmt(fx2, 10)}` };
};

// ---------- Polygons, lines, spirals, composite ----------
export const regularPolygon: SciCalculator = (v) => {
  const n = Math.max(3, Math.round(pos(v.n, 6))), sd = pos(v.side, 4);
  const ap = sd / (2 * Math.tan(Math.PI / n));
  return { area: s((n * sd * ap) / 2, 12), perimeter: s(n * sd), interior: s(((n - 2) * 180) / n, 10), apothem: s(ap, 10), circumradius: s(sd / (2 * Math.sin(Math.PI / n)), 10), diagonals: (n * (n - 3)) / 2 };
};
export const segmentAddition: SciCalculator = (v) => {
  const a1 = num(v.a1, 2), b1 = num(v.b1, 3), a2 = num(v.a2, 1), b2 = num(v.b2, 5), a3 = num(v.a3, 4), b3 = num(v.b3, 2);
  const k = a1 + a2 - a3;
  need(k !== 0, "The x terms cancel — no unique solution.");
  const x = (b3 - b1 - b2) / k;
  return { x: s(x, 12), lengths: `AB = ${fmt(a1 * x + b1, 10)}, BC = ${fmt(a2 * x + b2, 10)}, AC = ${fmt(a3 * x + b3, 10)}` };
};
export const spiralLength: SciCalculator = (v) => {
  const d = pos(v.inner, 76), Dd = pos(v.outer, 300), t = pos(v.thick, 0.1);
  need(Dd > d && t > 0, "Outer diameter must exceed inner, and thickness must be positive.");
  const turns = (Dd - d) / (2 * t);
  const L = (Math.PI * (Dd * Dd - d * d)) / (4 * t);
  return { length: s(L, 10), turns: s(turns, 8), lengthM: s(L / 1000, 8), formula: "L = π(D² − d²) / (4t)" };
};
export const trigGraph: SciCalculator = (v) => {
  const fnI = pick(v.fn, 3), A = num(v.A, 3), B = num(v.B, 2) || 1, C = num(v.C, 0), Dd = num(v.D, 1);
  const f = [Math.sin, Math.cos, Math.tan][fnI];
  const per = (fnI === 2 ? Math.PI : 2 * Math.PI) / Math.abs(B);
  const table = [0, 0.25, 0.5, 0.75, 1].map((k) => {
    const x = C / B + k * per;
    return `x = ${fmt(x, 6).padStart(9)}  y = ${fmt(A * f(B * x - C) + Dd, 6)}`;
  }).join("\n");
  return { amplitude: fnI === 2 ? "none (tan)" : s(Math.abs(A), 10), period: s(per, 10), periodDeg: s(D(per), 10), phase: s(C / B, 10), range: fnI === 2 ? "all real numbers" : `[${fmt(Dd - Math.abs(A))}, ${fmt(Dd + Math.abs(A))}]`, table };
};
export const SHAPES = ["None", "Rectangle (w × h)", "Triangle (base × height)", "Circle (radius)", "Semicircle (radius)", "Trapezoid (a, b, height)"];
const shapeArea = (t: number, p: number, q: number, r: number) => [0, p * q, (p * q) / 2, Math.PI * p * p, (Math.PI * p * p) / 2, ((p + q) / 2) * r][t];
export const compositeArea: SciCalculator = (v) => {
  let total = 0;
  const parts: string[] = [];
  for (const i of [1, 2, 3]) {
    const t = pick(v[`t${i}`], 6), sign = pick(v[`s${i}`], 2) === 0 ? 1 : -1;
    const A = shapeArea(t, pos(v[`p${i}`]), pos(v[`q${i}`]), pos(v[`r${i}`]));
    if (!t) continue;
    total += sign * A;
    parts.push(`${sign > 0 ? "+" : "−"} ${SHAPES[t].split(" (")[0].toLowerCase()} ${fmt(A, 8)}`);
  }
  return { area: s(total, 12), breakdown: parts.join("  ") || "add a shape" };
};
export const ADD_SUB = ["Add", "Subtract (cut-out)"];

export const sciGeoCustomCalculators: Record<string, SciCalculator> = {
  "sohcahtoa-calculator": sohcahtoa,
  "volume-of-cylinder-calculator": cylinder,
  "circle-calculator": circle,
  "pi-calculator": piDigits,
  "parabola-calculator": parabola,
  "pythagorean-theorem-calculator": pythagorean,
  "volume-of-sphere-calculator": sphere,
  "30-60-90-triangle-calculator": tri306090,
  "45-45-90-triangle-calculator": tri454590,
  "volume-of-cone-calculator": cone,
  "law-of-cosines-calculator": lawOfCosines,
  "centroid-calculator": centroid,
  "unit-circle-calculator": unitCircle,
  "trig-identities-calculator": trigIdentities,
  "right-triangle-calculator": rightTriangle,
  "equation-of-a-circle-calculator": circleEquation,
  "polar-graphing-calculator": polarGraph,
  "hyperbolic-functions-calculator": hyperbolic,
  "sphere-packing-calculator": spherePacking,
  "hemisphere-volume-calculator": hemisphere,
  "law-of-sines-calculator": lawOfSines,
  "rectangular-prism-calculator": rectPrism,
  "triangle-area-calculator": triangleArea,
  "volume-of-pyramid-calculator": pyramid,
  "ellipsoid-volume-calculator": ellipsoid,
  "polar-rectangular-calculator": polarRect,
  "trig-equation-solver": trigEquation,
  "segment-addition-calculator": segmentAddition,
  "ellipse-calculator": ellipse,
  "sector-area-calculator": sector,
  "triangle-inequality-calculator": triangleInequality,
  "regular-polygon-calculator": regularPolygon,
  "hyperbola-calculator": hyperbola,
  "inverse-trig-calculator": inverseTrig,
  "angle-of-depression-calculator": angleDepression,
  "bilinear-interpolation-calculator": bilinear,
  "conic-sections-calculator": conic,
  "spiral-length-calculator": spiralLength,
  "trig-graph-calculator": trigGraph,
  "composite-area-calculator": compositeArea,
};
