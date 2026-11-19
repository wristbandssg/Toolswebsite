/**
 * Idea build, batch geo1 (19 Nov 2026 — site to 10,000 tools): shape-specific geometry (2D area/perimeter, 3D volume/surface),
 * coordinate geometry, number tools, and a few physics/chemistry laws not yet live. Pure formulas — no data except standard
 * constants: G·M (IAU/NASA): Earth 3.986004418e14, Moon 4.9048695e12, Mars 4.282837e13, Jupiter 1.26686534e17, Sun
 * 1.32712440018e20 m³/s²; mean radii Earth 6,371 km, Moon 1,737.4 km, Mars 3,389.5 km, Jupiter 69,911 km, Sun 695,700 km;
 * g₀ = 9.80665 m/s²; R = 0.082057366 L·atm/(mol·K). Henry's-law presets (25 °C, Sander compilation): O₂ 1.3e-3, N₂ 6.4e-4,
 * CO₂ 3.4e-2 mol/(L·atm) — editable. Ellipsoid surface uses Knud Thomsen's approximation (≤ 1.06% error).
 * SKIPPED (live): rhombus/annulus/sector/segment area, circle, ellipse, triangle area, regular polygon (kept named polygons as
 * their own pages), volume of cylinder/cone/sphere/pyramid/hemisphere, rectangular prism, frustum/torus/capsule volume,
 * lever, buoyancy, thermal expansion, heat transfer, lift, drag coefficient, braking distance, velocity, centripetal force,
 * ratio, cross-multiplication (proportions), long division, nth root, triangular numbers, square numbers, specific heat,
 * percentage / percentage change.
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";
import { txt, listOf } from "./sci-math-core";
import { formulaMass, parseFormula, elementMass } from "./sci-chem-core";
import { nf } from "./calc-engine-idea-conv1";

const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const N = (x: number) => nf(Number(x.toPrecision(10)));
const PI = Math.PI, rad = (d: number) => (d * PI) / 180, deg = (r: number) => (r * 180) / PI;
const U = (v: Record<string, number>) => ["", "cm", "m", "in", "ft", "mm", "yd"][pick(v.u, 7)];
const u2 = (s: string) => (s ? ` ${s}²` : " sq units"), u3 = (s: string) => (s ? ` ${s}³` : " cubic units"), u1 = (s: string) => (s ? ` ${s}` : "");

// ---- 2D shapes ----
export const square: Calc = (v) => { const s = P(v, "s", 5, "Side"), u = U(v); return { a: `Area ${N(s * s)}${u2(u)}`, p: `Perimeter ${N(4 * s)}${u1(u)} · diagonal ${N(s * Math.SQRT2)}${u1(u)}`, f: "A = s², P = 4s, d = s√2" }; };
export const rectangle: Calc = (v) => { const l = P(v, "l", 8, "Length"), w = P(v, "w", 5, "Width"), u = U(v); return { a: `Area ${N(l * w)}${u2(u)}`, p: `Perimeter ${N(2 * (l + w))}${u1(u)} · diagonal ${N(Math.hypot(l, w))}${u1(u)}`, f: "A = l × w, P = 2(l + w), d = √(l² + w²)" }; };
export const parallelogram: Calc = (v) => { const b = P(v, "b", 10, "Base"), h = P(v, "h", 6, "Height"), s = P(v, "s", 7, "Side"), u = U(v); if (h > s) throw new InputError("The height can't be longer than the slanted side."); const ang = deg(Math.asin(h / s)); return { a: `Area ${N(b * h)}${u2(u)}`, p: `Perimeter ${N(2 * (b + s))}${u1(u)} · angles ${N(ang)}° and ${N(180 - ang)}°`, f: "A = base × height, P = 2(base + side)" }; };
export const trapezoid: Calc = (v) => { const a = P(v, "a", 6, "Top base"), b = P(v, "b", 10, "Bottom base"), h = P(v, "h", 4, "Height"), c = num(v.c, 0), d = num(v.d, 0), u = U(v); return { a: `Area ${N(((a + b) / 2) * h)}${u2(u)}`, p: `Median (midsegment) ${N((a + b) / 2)}${u1(u)}${c > 0 && d > 0 ? ` · perimeter ${N(a + b + c + d)}${u1(u)}` : " · add both legs for the perimeter"}`, f: "A = (a + b) ÷ 2 × h" }; };
export const kite: Calc = (v) => { const p = P(v, "p", 8, "Diagonal 1"), q = P(v, "q", 6, "Diagonal 2"), a = num(v.a, 0), b = num(v.b, 0), u = U(v); return { a: `Area ${N((p * q) / 2)}${u2(u)}`, p: a > 0 && b > 0 ? `Perimeter ${N(2 * (a + b))}${u1(u)}` : "Enter the two side lengths for the perimeter", f: "A = (d₁ × d₂) ÷ 2, P = 2(a + b)" }; };
export const POLY: Record<string, number> = { pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, nonagon: 9, decagon: 10, dodecagon: 12 };
export const polyCalc = (n: number): Calc => (v) => { const s = P(v, "s", 4, "Side length"), u = U(v), ap = s / (2 * Math.tan(PI / n)), R = s / (2 * Math.sin(PI / n)), A = (n * s * ap) / 2; return { a: `Area ${N(A)}${u2(u)}`, p: `Perimeter ${N(n * s)}${u1(u)} · apothem ${N(ap)}${u1(u)} · circumradius ${N(R)}${u1(u)}`, f: `Interior angle ${N(((n - 2) * 180) / n)}° · ${n * (n - 3) / 2} diagonals · A = n·s² ÷ (4·tan(180°/n))` }; };
export const equilateral: Calc = (v) => { const s = P(v, "s", 6, "Side"), u = U(v); return { a: `Area ${N((Math.sqrt(3) / 4) * s * s)}${u2(u)}`, p: `Perimeter ${N(3 * s)}${u1(u)} · height ${N((Math.sqrt(3) / 2) * s)}${u1(u)}`, f: `Inradius ${N(s / (2 * Math.sqrt(3)))}${u1(u)} · circumradius ${N(s / Math.sqrt(3))}${u1(u)} · all angles 60°` }; };
export const isosceles: Calc = (v) => { const a = P(v, "a", 5, "Leg"), b = P(v, "b", 6, "Base"), u = U(v); if (b >= 2 * a) throw new InputError("The base must be shorter than the two legs combined."); const h = Math.sqrt(a * a - (b * b) / 4), apex = deg(2 * Math.asin(b / (2 * a))); return { a: `Area ${N((b * h) / 2)}${u2(u)}`, p: `Height ${N(h)}${u1(u)} · perimeter ${N(2 * a + b)}${u1(u)}`, f: `Angles: apex ${N(apex)}°, base ${N((180 - apex) / 2)}° each` }; };
const tri = (a: number, b: number, c: number) => { if (a + b <= c || a + c <= b || b + c <= a) throw new InputError("Those sides can't form a triangle (each side must be shorter than the other two combined)."); const s = (a + b + c) / 2; return { s, K: Math.sqrt(s * (s - a) * (s - b) * (s - c)) }; };
const ang3 = (a: number, b: number, c: number) => [deg(Math.acos((b * b + c * c - a * a) / (2 * b * c))), deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)))];
export const heron: Calc = (v) => { const a = P(v, "a", 5, "Side a"), b = P(v, "b", 6, "Side b"), c = P(v, "c", 7, "Side c"), u = U(v), { s, K } = tri(a, b, c), [A, B] = ang3(a, b, c); return { a: `Area ${N(K)}${u2(u)}`, p: `Perimeter ${N(2 * s)}${u1(u)} · semi-perimeter ${N(s)}${u1(u)}`, f: `Angles A ${N(A)}°, B ${N(B)}°, C ${N(180 - A - B)}° · K = √(s(s−a)(s−b)(s−c))` }; };
export const circumradius: Calc = (v) => { const a = P(v, "a", 5, "Side a"), b = P(v, "b", 6, "Side b"), c = P(v, "c", 7, "Side c"), u = U(v), { K } = tri(a, b, c), R = (a * b * c) / (4 * K); return { a: `Circumradius R = ${N(R)}${u1(u)}`, p: `Circumcircle area ${N(PI * R * R)}${u2(u)} · diameter ${N(2 * R)}${u1(u)}`, f: "R = abc ÷ (4 × area)" }; };
export const inradius: Calc = (v) => { const a = P(v, "a", 5, "Side a"), b = P(v, "b", 6, "Side b"), c = P(v, "c", 7, "Side c"), u = U(v), { s, K } = tri(a, b, c), r = K / s; return { a: `Inradius r = ${N(r)}${u1(u)}`, p: `Incircle area ${N(PI * r * r)}${u2(u)} · triangle area ${N(K)}${u2(u)}`, f: "r = area ÷ semi-perimeter" }; };
export const semicircle: Calc = (v) => { const r = P(v, "r", 5, "Radius"), u = U(v); return { a: `Area ${N((PI * r * r) / 2)}${u2(u)}`, p: `Perimeter ${N(PI * r + 2 * r)}${u1(u)} (arc ${N(PI * r)} + diameter ${N(2 * r)})`, f: "A = πr² ÷ 2, P = πr + 2r" }; };
export const quarterCircle: Calc = (v) => { const r = P(v, "r", 5, "Radius"), u = U(v); return { a: `Area ${N((PI * r * r) / 4)}${u2(u)}`, p: `Perimeter ${N((PI * r) / 2 + 2 * r)}${u1(u)} (arc ${N((PI * r) / 2)})`, f: "A = πr² ÷ 4, P = πr/2 + 2r" }; };
export const chord: Calc = (v) => { const r = P(v, "r", 10, "Radius"), m = pick(v.m, 2), x = P(v, "x", 60, m === 0 ? "Central angle" : "Distance"), u = U(v); if (m === 0 && x >= 360) throw new InputError("Use an angle under 360°."); if (m === 1 && x >= r) throw new InputError("The distance from the centre must be less than the radius."); const c = m === 0 ? 2 * r * Math.sin(rad(x) / 2) : 2 * Math.sqrt(r * r - x * x), th = m === 0 ? x : deg(2 * Math.asin(c / (2 * r))); return { a: `Chord length ${N(c)}${u1(u)}`, p: `Central angle ${N(th)}° · arc length ${N(r * rad(th))}${u1(u)} · sagitta ${N(r - Math.sqrt(r * r - (c * c) / 4))}${u1(u)}`, f: "c = 2r·sin(θ/2) = 2√(r² − d²)" }; };
export const arcLen: Calc = (v) => { const r = P(v, "r", 10, "Radius"), t = P(v, "t", 45, "Central angle"), u = U(v), th = rad(t); return { a: `Arc length ${N(r * th)}${u1(u)}`, p: `Sector area ${N((r * r * th) / 2)}${u2(u)} · chord ${N(2 * r * Math.sin(th / 2))}${u1(u)}`, f: `s = r × θ (θ in radians: ${N(th)} rad)` }; };
export const polyAngles: Calc = (v) => { const n = Math.round(P(v, "n", 6, "Number of sides")); if (n < 3) throw new InputError("A polygon has at least 3 sides."); return { a: `Interior angle sum ${N((n - 2) * 180)}°`, p: `Each interior angle (regular) ${N(((n - 2) * 180) / n)}° · each exterior angle ${N(360 / n)}°`, f: "Sum = (n − 2) × 180°; exterior angles always add to 360°" }; };
export const polyDiag: Calc = (v) => { const n = Math.round(P(v, "n", 8, "Number of sides")); if (n < 3) throw new InputError("A polygon has at least 3 sides."); return { a: `${N((n * (n - 3)) / 2)} diagonals`, p: `${n - 3} from each vertex · ${n - 2} triangles from one vertex`, f: "Diagonals = n(n − 3) ÷ 2" }; };
export const missingAngle: Calc = (v) => { const a = P(v, "a", 50, "Angle A"), b = P(v, "b", 60, "Angle B"); if (a + b >= 180) throw new InputError("Two angles of a triangle must add up to less than 180°."); const c = 180 - a - b, mx = Math.max(a, b, c); return { a: `Third angle C = ${N(c)}°`, p: `${mx > 90 ? "Obtuse" : Math.abs(mx - 90) < 1e-9 ? "Right" : "Acute"} triangle${a === b || b === c || a === c ? " (isosceles)" : ""}`, f: "A + B + C = 180°" }; };
export const similarTri: Calc = (v) => { const a = P(v, "a", 3, "Side a"), b = P(v, "b", 4, "Side b"), c = P(v, "c", 5, "Side c"), k = pick(v.k, 3), x = P(v, "x", 9, "Matching side"), s = x / [a, b, c][k]; return { a: `Scale factor ${N(s)}`, p: `Other triangle: ${N(a * s)}, ${N(b * s)}, ${N(c * s)}`, f: `Perimeter ratio ${N(s)} · area ratio ${N(s * s)} (= k²)` }; };

// ---- 3D solids ----
export const cube: Calc = (v) => { const a = P(v, "s", 4, "Edge"), u = U(v); return { a: `Volume ${N(a ** 3)}${u3(u)}`, p: `Surface area ${N(6 * a * a)}${u2(u)} · space diagonal ${N(a * Math.sqrt(3))}${u1(u)}`, f: "V = a³, SA = 6a², d = a√3" }; };
export const triPrism: Calc = (v) => { const a = P(v, "a", 3, "Triangle side a"), b = P(v, "b", 4, "Triangle side b"), c = P(v, "c", 5, "Triangle side c"), L = P(v, "l", 10, "Prism length"), u = U(v), { K } = tri(a, b, c); return { a: `Volume ${N(K * L)}${u3(u)}`, p: `Surface area ${N(2 * K + (a + b + c) * L)}${u2(u)} · triangle area ${N(K)}${u2(u)}`, f: "V = base area × length; SA = 2 × base + perimeter × length" }; };
const prismN = (n: number): Calc => (v) => { const s = P(v, "s", 3, "Base side"), h = P(v, "h", 10, "Height"), u = U(v), B = (n * s * s) / (4 * Math.tan(PI / n)); return { a: `Volume ${N(B * h)}${u3(u)}`, p: `Surface area ${N(2 * B + n * s * h)}${u2(u)} · base area ${N(B)}${u2(u)}`, f: `V = base area × h (regular ${n}-sided base)` }; };
export const hexPrism = prismN(6), pentPrism = prismN(5);
export const sqPyramidSA: Calc = (v) => { const a = P(v, "a", 6, "Base side"), h = P(v, "h", 4, "Height"), u = U(v), l = Math.hypot(h, a / 2); return { a: `Total surface area ${N(a * a + 2 * a * l)}${u2(u)}`, p: `Lateral area ${N(2 * a * l)}${u2(u)} · slant height ${N(l)}${u1(u)} · edge ${N(Math.hypot(h, (a * Math.SQRT2) / 2))}${u1(u)}`, f: `Volume ${N((a * a * h) / 3)}${u3(u)} · SA = a² + 2a·l` }; };
export const tetra: Calc = (v) => { const a = P(v, "s", 5, "Edge"), u = U(v); return { a: `Volume ${N(a ** 3 / (6 * Math.SQRT2))}${u3(u)}`, p: `Surface area ${N(Math.sqrt(3) * a * a)}${u2(u)} · height ${N(a * Math.sqrt(2 / 3))}${u1(u)}`, f: "Regular tetrahedron: V = a³ ÷ (6√2), SA = √3·a²" }; };
export const triPyramid: Calc = (v) => { const b = P(v, "b", 6, "Base triangle base"), hb = P(v, "t", 4, "Base triangle height"), H = P(v, "h", 9, "Pyramid height"), u = U(v), B = (b * hb) / 2; return { a: `Volume ${N((B * H) / 3)}${u3(u)}`, p: `Base area ${N(B)}${u2(u)}`, f: "V = ⅓ × base area × height" }; };
export const octa: Calc = (v) => { const a = P(v, "s", 5, "Edge"), u = U(v); return { a: `Volume ${N((Math.SQRT2 / 3) * a ** 3)}${u3(u)}`, p: `Surface area ${N(2 * Math.sqrt(3) * a * a)}${u2(u)}`, f: "Regular octahedron: V = (√2/3)a³, SA = 2√3·a²" }; };
export const dodeca: Calc = (v) => { const a = P(v, "s", 5, "Edge"), u = U(v); return { a: `Volume ${N(((15 + 7 * Math.sqrt(5)) / 4) * a ** 3)}${u3(u)}`, p: `Surface area ${N(3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * a * a)}${u2(u)}`, f: "Regular dodecahedron (12 pentagons): V = (15 + 7√5)/4 · a³" }; };
export const icosa: Calc = (v) => { const a = P(v, "s", 5, "Edge"), u = U(v); return { a: `Volume ${N(((5 * (3 + Math.sqrt(5))) / 12) * a ** 3)}${u3(u)}`, p: `Surface area ${N(5 * Math.sqrt(3) * a * a)}${u2(u)}`, f: "Regular icosahedron (20 triangles): V = 5(3 + √5)/12 · a³" }; };
export const wedge: Calc = (v) => { const a = P(v, "a", 8, "Base length"), b = P(v, "b", 5, "Base width"), c = Math.max(0, num(v.c, 8)), h = P(v, "h", 4, "Height"), u = U(v); return { a: `Volume ${N((b * h * (2 * a + c)) / 6)}${u3(u)}`, p: c === a ? `Same as a triangular prism: ½ × ${N(b)} × ${N(h)} × ${N(a)}` : "Top ridge length differs from the base length", f: "V = b·h·(2a + c) ÷ 6 (rectangular base a × b, top edge c)" }; };
export const parallelepiped: Calc = (v) => { const a = P(v, "a", 4, "Edge a"), b = P(v, "b", 5, "Edge b"), c = P(v, "c", 6, "Edge c"), al = rad(num(v.x, 90)), be = rad(num(v.y, 90)), ga = rad(num(v.z, 90)), k = 1 + 2 * Math.cos(al) * Math.cos(be) * Math.cos(ga) - Math.cos(al) ** 2 - Math.cos(be) ** 2 - Math.cos(ga) ** 2, u = U(v); if (!(k > 0)) throw new InputError("Those angles can't form a solid."); return { a: `Volume ${N(a * b * c * Math.sqrt(k))}${u3(u)}`, p: `Surface area ${N(2 * (a * b * Math.sin(ga) + a * c * Math.sin(be) + b * c * Math.sin(al)))}${u2(u)}`, f: "V = abc·√(1 + 2cosα·cosβ·cosγ − cos²α − cos²β − cos²γ)" }; };
export const hollowCyl: Calc = (v) => { const R = P(v, "R", 5, "Outer radius"), r = Math.max(0, num(v.r, 4)), h = P(v, "h", 10, "Height"), u = U(v); if (r >= R) throw new InputError("The inner radius must be smaller than the outer radius."); const V = PI * (R * R - r * r) * h; return { a: `Material volume ${N(V)}${u3(u)}`, p: `Wall thickness ${N(R - r)}${u1(u)} · hollow (inner) volume ${N(PI * r * r * h)}${u3(u)}`, f: `Surface area ${N(2 * PI * (R + r) * h + 2 * PI * (R * R - r * r))}${u2(u)} · V = π(R² − r²)h` }; };
export const sphShell: Calc = (v) => { const R = P(v, "R", 10, "Outer radius"), r = Math.max(0, num(v.r, 9)), u = U(v); if (r >= R) throw new InputError("The inner radius must be smaller than the outer radius."); return { a: `Shell volume ${N((4 / 3) * PI * (R ** 3 - r ** 3))}${u3(u)}`, p: `Thickness ${N(R - r)}${u1(u)} · outer surface ${N(4 * PI * R * R)}${u2(u)}`, f: "V = 4/3·π(R³ − r³)" }; };
export const coneSA: Calc = (v) => { const r = P(v, "r", 3, "Radius"), h = P(v, "h", 4, "Height"), u = U(v), l = Math.hypot(r, h); return { a: `Total surface area ${N(PI * r * (r + l))}${u2(u)}`, p: `Lateral area ${N(PI * r * l)}${u2(u)} · base ${N(PI * r * r)}${u2(u)} · slant height ${N(l)}${u1(u)}`, f: "SA = πr(r + l), l = √(r² + h²)" }; };
export const cylSA: Calc = (v) => { const r = P(v, "r", 3, "Radius"), h = P(v, "h", 10, "Height"), u = U(v); return { a: `Total surface area ${N(2 * PI * r * (r + h))}${u2(u)}`, p: `Lateral area ${N(2 * PI * r * h)}${u2(u)} · each end ${N(PI * r * r)}${u2(u)}`, f: "SA = 2πr² + 2πrh" }; };
export const sphereSA: Calc = (v) => { const m = pick(v.m, 2), x = P(v, "r", 5, "Size"), r = m === 1 ? x / 2 : x, u = U(v); return { a: `Surface area ${N(4 * PI * r * r)}${u2(u)}`, p: `Radius ${N(r)}${u1(u)} · volume ${N((4 / 3) * PI * r ** 3)}${u3(u)}`, f: "SA = 4πr² = πd²" }; };
export const hemiSA: Calc = (v) => { const r = P(v, "r", 5, "Radius"), u = U(v); return { a: `Total surface area ${N(3 * PI * r * r)}${u2(u)}`, p: `Curved surface ${N(2 * PI * r * r)}${u2(u)} · flat base ${N(PI * r * r)}${u2(u)}`, f: "Total SA = 3πr² (curved 2πr² + base πr²)" }; };
export const frustumSA: Calc = (v) => { const R = P(v, "R", 6, "Bottom radius"), r = Math.max(0, num(v.r, 3)), h = P(v, "h", 4, "Height"), u = U(v), l = Math.hypot(h, R - r); return { a: `Total surface area ${N(PI * (R + r) * l + PI * (R * R + r * r))}${u2(u)}`, p: `Lateral area ${N(PI * (R + r) * l)}${u2(u)} · slant height ${N(l)}${u1(u)}`, f: `Volume ${N((PI * h * (R * R + R * r + r * r)) / 3)}${u3(u)}` }; };
export const ellipsoidSA: Calc = (v) => { const a = P(v, "a", 5, "Semi-axis a"), b = P(v, "b", 4, "Semi-axis b"), c = P(v, "c", 3, "Semi-axis c"), u = U(v), p = 1.6075, S = 4 * PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p); return { a: `Surface area ≈ ${N(S)}${u2(u)}`, p: `Volume ${N((4 / 3) * PI * a * b * c)}${u3(u)}`, f: "Knud Thomsen approximation (p = 1.6075, error ≤ 1.06%); exact for a sphere" }; };

// ---- coordinate geometry ----
const pt = (v: Record<string, number>, a: string, b: string, da: number, db: number) => [num(v[a], da), num(v[b], db)];
const lineText = (m: number, b: number) => { const mx = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${N(m)}x`, bb = Math.abs(b) < 1e-12 ? "" : `${mx ? (b < 0 ? " − " : " + ") : b < 0 ? "−" : ""}${N(Math.abs(b))}`; return `y = ${mx}${bb}` || "y = 0"; };
export const midpoint: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 1, 2), [x2, y2] = pt(v, "x2", "y2", 7, 10); return { a: `Midpoint (${N((x1 + x2) / 2)}, ${N((y1 + y2) / 2)})`, p: `Distance between the points ${N(Math.hypot(x2 - x1, y2 - y1))}`, f: "M = ((x₁ + x₂)/2, (y₁ + y₂)/2)" }; };
export const endpoint: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 1, 2), [mx, my] = pt(v, "mx", "my", 4, 6); return { a: `Other endpoint (${N(2 * mx - x1)}, ${N(2 * my - y1)})`, p: `Segment length ${N(2 * Math.hypot(mx - x1, my - y1))}`, f: "B = 2M − A" }; };
export const perpBisector: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 1, 2), [x2, y2] = pt(v, "x2", "y2", 5, 6); if (x1 === x2 && y1 === y2) throw new InputError("Enter two different points."); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; if (y1 === y2) return { a: `x = ${N(mx)}`, p: `Midpoint (${N(mx)}, ${N(my)}) · the segment is horizontal, so the bisector is vertical`, f: "" }; const m = -(x2 - x1) / (y2 - y1); return { a: lineText(m, my - m * mx), p: `Midpoint (${N(mx)}, ${N(my)}) · slope ${N(m)} (negative reciprocal of ${N((y2 - y1) / (x2 - x1 || Infinity))})`, f: "Passes through the midpoint, perpendicular to the segment" }; };
export const pointSlope: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 2, 3), m = num(v.m, 4), b = y1 - m * x1; return { a: `y − ${N(y1)} = ${N(m)}(x − ${N(x1)})`, p: `Slope-intercept: ${lineText(m, b)}`, f: `Standard form: ${N(m)}x − y = ${N(-b)}` }; };
export const twoPointLine: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 1, 2), [x2, y2] = pt(v, "x2", "y2", 4, 8); if (x1 === x2) { if (y1 === y2) throw new InputError("Enter two different points."); return { a: `x = ${N(x1)} (vertical line)`, p: "Slope is undefined", f: `Standard form: x = ${N(x1)}` }; } const m = (y2 - y1) / (x2 - x1), b = y1 - m * x1; return { a: lineText(m, b), p: `Slope ${N(m)} · y-intercept ${N(b)} · x-intercept ${m === 0 ? "none" : N(-b / m)}`, f: `Point-slope: y − ${N(y1)} = ${N(m)}(x − ${N(x1)}) · standard: ${N(y2 - y1)}x − ${N(x2 - x1)}y = ${N((y2 - y1) * x1 - (x2 - x1) * y1)}` }; };
export const stdToSlope: Calc = (v) => { const A = num(v.a, 2), B = num(v.b, 3), C = num(v.c, 12); if (B === 0) { if (A === 0) throw new InputError("A and B can't both be 0."); return { a: `x = ${N(C / A)} (vertical line)`, p: "Slope undefined", f: "" }; } return { a: lineText(-A / B, C / B), p: `Slope ${N(-A / B)} · y-intercept ${N(C / B)} · x-intercept ${A ? N(C / A) : "none"}`, f: "From Ax + By = C: y = (−A/B)x + C/B" }; };
export const angleLines: Calc = (v) => { const m1 = num(v.m1, 1), m2 = num(v.m2, -0.5); if (1 + m1 * m2 === 0) return { a: "90° — the lines are perpendicular", p: "m₁ × m₂ = −1", f: "" }; const t = deg(Math.atan(Math.abs((m2 - m1) / (1 + m1 * m2)))); return { a: `Acute angle ${N(t)}°`, p: `Obtuse angle ${N(180 - t)}°${m1 === m2 ? " · the lines are parallel" : ""}`, f: "tan θ = |(m₂ − m₁) ÷ (1 + m₁m₂)|" }; };
export const distParallel: Calc = (v) => { const A = num(v.a, 3), B = num(v.b, 4), c1 = num(v.c1, -12), c2 = num(v.c2, 8); if (A === 0 && B === 0) throw new InputError("A and B can't both be 0."); return { a: `Distance ${N(Math.abs(c1 - c2) / Math.hypot(A, B))}`, p: `Lines ${N(A)}x + ${N(B)}y + ${N(c1)} = 0 and ${N(A)}x + ${N(B)}y + ${N(c2)} = 0`, f: "d = |C₁ − C₂| ÷ √(A² + B²)" }; };
export const circle3: Calc = (v) => { const [ax, ay] = pt(v, "x1", "y1", 0, 0), [bx, by] = pt(v, "x2", "y2", 4, 0), [cx, cy] = pt(v, "x3", "y3", 0, 3), d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(d) < 1e-12) throw new InputError("The three points are on one line, so no circle passes through them."); const s = (x: number, y: number) => x * x + y * y, ux = (s(ax, ay) * (by - cy) + s(bx, by) * (cy - ay) + s(cx, cy) * (ay - by)) / d, uy = (s(ax, ay) * (cx - bx) + s(bx, by) * (ax - cx) + s(cx, cy) * (bx - ax)) / d, r = Math.hypot(ax - ux, ay - uy); return { a: `Centre (${N(ux)}, ${N(uy)}), radius ${N(r)}`, p: `(x ${ux < 0 ? "+" : "−"} ${N(Math.abs(ux))})² + (y ${uy < 0 ? "+" : "−"} ${N(Math.abs(uy))})² = ${N(r * r)}`, f: `Circumference ${N(2 * PI * r)} · area ${N(PI * r * r)}` }; };
export const section: Calc = (v) => { const [x1, y1] = pt(v, "x1", "y1", 1, 2), [x2, y2] = pt(v, "x2", "y2", 7, 8), m = P(v, "m", 2, "m"), n = P(v, "n", 1, "n"), ext = pick(v.e, 2) === 1; if (ext && m === n) throw new InputError("External division needs m ≠ n."); const k = ext ? m - n : m + n, s = ext ? -1 : 1; return { a: `Point (${N((m * x2 + s * n * x1) / k)}, ${N((m * y2 + s * n * y1) / k)})`, p: `${ext ? "Externally" : "Internally"} dividing AB in the ratio ${N(m)}:${N(n)}`, f: ext ? "P = ((mx₂ − nx₁)/(m − n), (my₂ − ny₁)/(m − n))" : "P = ((mx₂ + nx₁)/(m + n), (my₂ + ny₁)/(m + n))" }; };
export const collinear: Calc = (v) => { const [ax, ay] = pt(v, "x1", "y1", 1, 2), [bx, by] = pt(v, "x2", "y2", 3, 6), [cx, cy] = pt(v, "x3", "y3", 5, 10), area = Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2; return { a: area < 1e-12 ? "Yes — the points are collinear" : "No — the points are not collinear", p: `Triangle area ${N(area)}`, f: "Collinear when ½|x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| = 0" }; };
const v3 = (v: Record<string, number>, p: string, d: number[]) => [num(v[`${p}x`], d[0]), num(v[`${p}y`], d[1]), num(v[`${p}z`], d[2])];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]), dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
export const plane3: Calc = (v) => { const A = v3(v, "a", [1, 0, 0]), B = v3(v, "b", [0, 1, 0]), C = v3(v, "c", [0, 0, 1]), n = cross(sub(B, A), sub(C, A)); if (n.every((x) => Math.abs(x) < 1e-12)) throw new InputError("The points are collinear, so they don't define a single plane."); const d = dot(n, A); return { a: `${N(n[0])}x + ${N(n[1])}y + ${N(n[2])}z = ${N(d)}`, p: `Normal vector (${n.map(N).join(", ")})`, f: "n = (B − A) × (C − A); plane n·r = n·A" }; };
export const distPlane: Calc = (v) => { const p = v3(v, "p", [1, 2, 3]), a = num(v.a, 2), b = num(v.b, -1), c = num(v.c, 2), d = num(v.d, 4), m = Math.hypot(a, b, c); if (!m) throw new InputError("A, B and C can't all be 0."); const s = (a * p[0] + b * p[1] + c * p[2] + d) / m; return { a: `Distance ${N(Math.abs(s))}`, p: `Foot of the perpendicular (${N(p[0] - (s * a) / m)}, ${N(p[1] - (s * b) / m)}, ${N(p[2] - (s * c) / m)})`, f: "d = |Ax₀ + By₀ + Cz₀ + D| ÷ √(A² + B² + C²)" }; };
export const angleVec: Calc = (v) => { const a = v3(v, "a", [1, 2, 3]), b = v3(v, "b", [4, -1, 2]), la = Math.hypot(...a), lb = Math.hypot(...b); if (!la || !lb) throw new InputError("Vectors can't be zero."); const c = Math.min(1, Math.max(-1, dot(a, b) / (la * lb))); return { a: `Angle ${N(deg(Math.acos(c)))}°`, p: `${N(Math.acos(c))} rad · dot product ${N(dot(a, b))} · |a| ${N(la)}, |b| ${N(lb)}`, f: "cos θ = (a·b) ÷ (|a||b|)" }; };

// ---- number tools ----
const ints = (v: Record<string, number>, k: string, d: string) => { const s = txt(v as never, k) || d, a = s.split(/[\s,;]+/).filter(Boolean).map(Number); if (a.length < 2 || a.some((x) => !Number.isInteger(x) || x === 0 || Math.abs(x) > 1e15)) throw new InputError("Enter at least two non-zero whole numbers."); return a.map(Math.abs); };
const g2 = (a: number, b: number): number => (b ? g2(b, a % b) : a);
export const gcf: Calc = (v) => { const a = ints(v, "x", "12, 18, 24"), g = a.reduce(g2); return { a: `GCF = ${N(g)}`, p: a.map((x) => `${N(x)} = ${N(g)} × ${N(x / g)}`).join(" · "), f: g === 1 ? "The numbers are coprime" : "Euclid's algorithm: gcd(a, b) = gcd(b, a mod b)" }; };
export const lcm: Calc = (v) => { const a = ints(v, "x", "4, 6, 10"), l = a.reduce((x, y) => (x / g2(x, y)) * y); if (!Number.isSafeInteger(l)) throw new InputError("The LCM is too large to show exactly."); return { a: `LCM = ${N(l)}`, p: `GCF = ${N(a.reduce(g2))} · first common multiples: ${[1, 2, 3].map((k) => N(l * k)).join(", ")}`, f: "lcm(a, b) = a × b ÷ gcd(a, b)" }; };
export const modulo: Calc = (v) => { const a = num(v.a, 17), n = num(v.n, 5); if (n === 0) throw new InputError("You can't divide by 0."); const trunc = a % n, floor = a - n * Math.floor(a / n); return { a: `${N(a)} mod ${N(n)} = ${N(floor)}`, p: `Quotient ${N(Math.floor(a / n))} · truncated remainder (JavaScript/C %) ${N(trunc)}`, f: "a mod n = a − n × ⌊a ÷ n⌋" }; };
const isPrime = (n: number) => { if (n < 2) return false; if (n % 2 === 0) return n === 2; if (n % 3 === 0) return n === 3; for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false; return true; };
const smallest = (n: number) => { if (n % 2 === 0) return 2; for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return i; return n; };
export const primeCheck: Calc = (v) => { const n = Math.round(num(v.x, 97)); if (n < 0 || n > 1e15) throw new InputError("Enter a whole number from 0 to 10¹⁵."); const p = isPrime(n); let nx = n + 1; while (!isPrime(nx)) nx++; let pv = n - 1; while (pv >= 2 && !isPrime(pv)) pv--; return { a: p ? `${N(n)} is prime` : `${N(n)} is not prime${n >= 2 ? ` (divisible by ${N(smallest(n))})` : ""}`, p: `Previous prime ${pv >= 2 ? N(pv) : "none"} · next prime ${N(nx)}`, f: "A prime has exactly two divisors: 1 and itself." }; };
export const primesRange: Calc = (v) => { const a = Math.max(0, Math.round(num(v.a, 1))), b = Math.round(num(v.b, 100)); if (b < a || b - a > 1e6) throw new InputError("Use a range up to 1,000,000 wide."); const out: number[] = []; for (let i = a; i <= b; i++) if (isPrime(i)) out.push(i); return { a: `${out.length} primes between ${N(a)} and ${N(b)}`, p: out.slice(0, 200).map(String).join(", ") + (out.length > 200 ? " …" : ""), f: out.length ? `Smallest ${out[0]} · largest ${out[out.length - 1]}` : "No primes in this range" }; };
export const multiples: Calc = (v) => { const n = num(v.n, 7), k = Math.min(1000, Math.max(1, Math.round(num(v.k, 20)))); return { a: `First ${k} multiples of ${N(n)}`, p: Array.from({ length: k }, (_, i) => N(n * (i + 1))).join(", "), f: `${N(n)} × ${k} = ${N(n * k)}` }; };
export const reciprocal: Calc = (v) => { const x = num(v.x, 4); if (x === 0) throw new InputError("0 has no reciprocal."); return { a: `1 ÷ ${N(x)} = ${N(1 / x)}`, p: Number.isInteger(x) ? `As a fraction: 1/${N(x)}` : `Check: ${N(x)} × ${N(1 / x)} = 1`, f: "The reciprocal (multiplicative inverse) of x is 1/x." }; };
export const unitRate: Calc = (v) => { const q = num(v.q, 150), d = P(v, "d", 3, "Units"); return { a: `${N(q / d)} per 1 unit`, p: `${N(q)} ÷ ${N(d)} = ${N(q / d)} · per 10 units: ${N((10 * q) / d)} · per 100: ${N((100 * q) / d)}`, f: "Unit rate = quantity ÷ number of units" }; };
export const avgPct: Calc = (v) => { const p = listOf(v as never, "p"), w = (txt(v as never, "w") || "").split(/[\s,;]+/).filter(Boolean).map(Number); if (w.length && w.length !== p.length) throw new InputError("Give one sample size per percentage (or leave sizes blank)."); const simple = p.reduce((a, b) => a + b, 0) / p.length, ww = w.length ? w : p.map(() => 1), tot = ww.reduce((a, b) => a + b, 0), wavg = p.reduce((s, x, i) => s + x * ww[i], 0) / tot; return { a: `${w.length ? "Weighted" : "Average"} percentage ${N(wavg)}%`, p: `Simple average of the percentages ${N(simple)}%${w.length ? ` · total sample ${N(tot)}` : ""}`, f: w.length ? "Weighted = Σ(pᵢ × nᵢ) ÷ Σnᵢ — use this when groups differ in size" : "Add sample sizes to weight groups of different size" }; };
export const simplifyRoot: Calc = (v) => { const n = Math.round(num(v.x, 72)); if (n < 0 || n > 1e12) throw new InputError("Enter a whole number from 0 to 10¹²."); let out = 1, inn = n; for (let f = 2; f * f <= inn; f++) while (inn % (f * f) === 0) { out *= f; inn /= f * f; } return { a: inn === 1 ? `√${N(n)} = ${N(out)}` : out === 1 ? `√${N(n)} is already simplified` : `√${N(n)} = ${N(out)}√${N(inn)}`, p: `≈ ${N(Math.sqrt(n))}`, f: "Pull out the largest perfect-square factor: √(a²b) = a√b" }; };
export const permutation: Calc = (v) => { const n = Math.round(num(v.n, 10)), r = Math.round(num(v.r, 3)); if (n < 0 || r < 0 || r > n || n > 170) throw new InputError("Use whole numbers with 0 ≤ r ≤ n ≤ 170."); let p = 1; for (let i = n - r + 1; i <= n; i++) p *= i; let c = p; for (let i = 2; i <= r; i++) c /= i; return { a: `P(${n}, ${r}) = ${N(Math.round(p))}`, p: `With repetition allowed: ${N(n ** r)} · combinations C(${n}, ${r}) = ${N(Math.round(c))}`, f: "nPr = n! ÷ (n − r)!" }; };
export const geoMean: Calc = (v) => { const a = listOf(v as never, "x", 2); if (a.some((x) => x <= 0)) throw new InputError("The geometric mean needs positive numbers."); const g = Math.exp(a.reduce((s, x) => s + Math.log(x), 0) / a.length), ar = a.reduce((s, x) => s + x, 0) / a.length, h = a.length / a.reduce((s, x) => s + 1 / x, 0); return { a: `Geometric mean ${N(g)}`, p: `Arithmetic mean ${N(ar)} · harmonic mean ${N(h)} (${a.length} values)`, f: "G = (x₁ × x₂ × … × xₙ)^(1/n); always ≤ the arithmetic mean" }; };
export const rangeStat: Calc = (v) => { const a = [...listOf(v as never, "x", 1)].sort((x, y) => x - y), mn = a[0], mx = a[a.length - 1]; return { a: `Range ${N(mx - mn)}`, p: `Minimum ${N(mn)} · maximum ${N(mx)} · midrange ${N((mn + mx) / 2)} · ${a.length} values`, f: "Range = maximum − minimum (sensitive to outliers — compare with the IQR)" }; };
export const atLeastOne: Calc = (v) => { const p = num(v.p, 5) / 100, n = Math.round(num(v.n, 20)); if (p < 0 || p > 1 || n < 1) throw new InputError("Use a probability from 0–100% and at least 1 trial."); const q = 1 - (1 - p) ** n; return { a: `P(at least one) = ${N(q * 100)}%`, p: `P(none) = ${N((1 - q) * 100)}% · trials for a 50% chance ${p > 0 && p < 1 ? Math.ceil(Math.log(0.5) / Math.log(1 - p)) : "—"} · for 95% ${p > 0 && p < 1 ? Math.ceil(Math.log(0.05) / Math.log(1 - p)) : "—"}`, f: "P = 1 − (1 − p)ⁿ for independent trials" }; };
const lnC = (n: number, k: number) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };
export const cardDraw: Calc = (v) => { const Nn = Math.round(num(v.d, 52)), K = Math.round(num(v.k, 4)), n = Math.round(num(v.n, 5)), x = Math.round(num(v.x, 1)); if (K > Nn || n > Nn || x > n || x < 0) throw new InputError("Check the numbers: hits ≤ cards drawn ≤ deck size, and target cards ≤ deck size."); const pmf = (i: number) => (i > K || n - i > Nn - K ? 0 : Math.exp(lnC(K, i) + lnC(Nn - K, n - i) - lnC(Nn, n))); let ge = 0; for (let i = x; i <= n; i++) ge += pmf(i); return { a: `P(at least ${x}) = ${N(ge * 100)}%`, p: `P(exactly ${x}) = ${N(pmf(x) * 100)}% · P(none) = ${N(pmf(0) * 100)}%`, f: "Hypergeometric: drawing without replacement" }; };

// ---- physics ----
const BODY: [string, number, number][] = [["Earth", 3.986004418e14, 6371], ["Moon", 4.9048695e12, 1737.4], ["Mars", 4.282837e13, 3389.5], ["Jupiter", 1.26686534e17, 69911], ["Sun", 1.32712440018e20, 695700]];
export const orbitalVel: Calc = (v) => { const [nm, mu, R] = BODY[pick(v.b, 5)], h = Math.max(0, num(v.h, 400)), r = (R + h) * 1000, vc = Math.sqrt(mu / r), T = (2 * PI * r) / vc; return { a: `Circular orbital speed ${N(vc / 1000)} km/s (${N((vc * 3.6) / 1.609344)} mph)`, p: `Orbital period ${N(T / 60)} min · escape speed at this height ${N((Math.SQRT2 * vc) / 1000)} km/s`, f: `${nm}: v = √(GM ÷ r), r = ${N(r / 1000)} km from the centre` }; };
export const waveSpeed: Calc = (v) => { const m = pick(v.m, 3), a = P(v, "a", 440, "Value 1"), b = P(v, "b", 0.78, "Value 2"); const r = m === 0 ? `Wave speed ${N(a * b)} m/s` : m === 1 ? `Frequency ${N(a / b)} Hz` : `Wavelength ${N(a / b)} m`; return { a: r, p: m === 0 ? `Period ${N(1 / a)} s` : m === 1 ? `Period ${N(b / a)} s` : `Period ${N(1 / b)} s`, f: "v = f × λ" }; };
export const freqPeriod: Calc = (v) => { const m = pick(v.m, 2), x = P(v, "x", 50, "Value"), y = 1 / x; return { a: m === 0 ? `Period ${N(y)} s (${N(y * 1000)} ms)` : `Frequency ${N(y)} Hz`, p: m === 0 ? `Angular frequency ${N(2 * PI * x)} rad/s · ${N(x * 60)} cycles per minute` : `Angular frequency ${N(2 * PI * y)} rad/s`, f: "f = 1 ÷ T" }; };
const IK = [0.4, 2 / 3, 0.5, 1, 1 / 12, 1 / 3];
export const rotKE: Calc = (v) => { const s = pick(v.s, 7), m = P(v, "m", 2, "Mass"), r = P(v, "r", 0.1, "Radius / length"), w0 = P(v, "w", 300, "Speed"), w = pick(v.u, 2) === 0 ? (w0 * 2 * PI) / 60 : w0, I = s === 6 ? num(v.i, 0.01) : IK[s] * m * r * r; return { a: `Rotational KE ${N(0.5 * I * w * w)} J`, p: `Moment of inertia ${N(I)} kg·m² · ω = ${N(w)} rad/s (${N((w * 60) / (2 * PI))} rpm)`, f: "KE = ½ I ω²" }; };
export const relVel: Calc = (v) => { const a = num(v.a, 60), b = num(v.b, 40), same = pick(v.d, 2) === 0, g = Math.max(0, num(v.g, 10)), rv = same ? Math.abs(a - b) : a + b; return { a: `Relative speed ${N(rv)}`, p: g && rv ? `Time to close a ${N(g)} gap: ${N(g / rv)} (distance ÷ relative speed, same units)` : same && a === b ? "Same speed — the gap never changes" : "", f: same ? "Same direction: v_rel = |v₁ − v₂|" : "Opposite directions: v_rel = v₁ + v₂" }; };
export const gAlt: Calc = (v) => { const [nm, mu, R] = BODY[pick(v.b, 5)], h = Math.max(0, num(v.h, 10)), g0 = mu / (R * 1000) ** 2, g = mu / ((R + h) * 1000) ** 2; return { a: `g = ${N(g)} m/s²`, p: `${N((g / g0) * 100)}% of the surface value (${N(g0)} m/s²) · a 70 kg person would weigh ${N((70 * g) / 9.80665)} kgf`, f: `${nm}: g = GM ÷ (R + h)²` }; };
export const poiseuille: Calc = (v) => { const dP = P(v, "p", 1000, "Pressure drop"), r = P(v, "r", 1, "Radius") / 1000, mu = P(v, "m", 1, "Viscosity") / 1000, L = P(v, "l", 1, "Length"), Q = (PI * dP * r ** 4) / (8 * mu * L), vel = Q / (PI * r * r), Re = (1000 * vel * 2 * r) / mu; return { a: `Flow rate ${N(Q * 1000 * 60)} L/min (${N(Q)} m³/s)`, p: `Mean velocity ${N(vel)} m/s · Reynolds number ≈ ${N(Re)} (water density)${Re > 2300 ? " — likely turbulent, so the law doesn't apply" : ""}`, f: "Q = π·ΔP·r⁴ ÷ (8·μ·L), laminar flow in a round pipe" }; };
export const rcTau: Calc = (v) => { const R = P(v, "r", 10000, "Resistance"), C = P(v, "c", 100, "Capacitance") * 1e-6, t = Math.max(0, num(v.t, 1)), tau = R * C; return { a: `Time constant τ = ${N(tau)} s`, p: `At ${N(t)} s: charging to ${N((1 - Math.exp(-t / tau)) * 100)}% · discharging to ${N(Math.exp(-t / tau) * 100)}%`, f: `Fully charged (≈ 99.3%) after 5τ = ${N(5 * tau)} s · cutoff frequency ${N(1 / (2 * PI * tau))} Hz` }; };
export const wheelAxle: Calc = (v) => { const R = P(v, "R", 30, "Wheel radius"), r = P(v, "r", 5, "Axle radius"), L = Math.max(0, num(v.l, 100)), ma = R / r; return { a: `Mechanical advantage ${N(ma)}`, p: `Effort to lift ${N(L)}: ${N(L / ma)} (ideal, no friction) · the wheel turns ${N(ma)}× further than the axle`, f: "MA = wheel radius ÷ axle radius" }; };
export const cop: Calc = (v) => { const m = pick(v.m, 2), q = P(v, "q", 3.5, "Heat output"), w = P(v, "w", 1, "Power input"), th = num(v.h, 21) + 273.15, tc = num(v.c, 0) + 273.15, c = q / w; if (th <= tc) throw new InputError("The hot side must be warmer than the cold side."); const carnot = m === 0 ? th / (th - tc) : tc / (th - tc); return { a: `COP ${N(c)}`, p: `Carnot (ideal) COP between these temperatures: ${N(carnot)} · this unit reaches ${N((c / carnot) * 100)}% of ideal`, f: m === 0 ? "Heating COP = heat delivered ÷ work in; Carnot = T_hot ÷ (T_hot − T_cold)" : "Cooling COP = heat removed ÷ work in; Carnot = T_cold ÷ (T_hot − T_cold)" }; };

// ---- chemistry ----
const gas = (v: Record<string, number>, names: [string, string], unit: [string, string], d: number[]) => { const s = pick(v.s, 4), x = [num(v.a, d[0]), num(v.b, d[1]), num(v.c, d[2]), num(v.d, d[3])]; return { s, x, names, unit }; };
const gasLaw = (kind: "inv" | "dir", nm: [string, string], un: [string, string], d: number[], conv?: (x: number) => number, back?: (x: number) => number): Calc => (v) => {
  const { s, x } = gas(v, nm, un, d), c = conv ?? ((q: number) => q), bk = back ?? ((q: number) => q), y = x.map((q, i) => (i % 2 === 1 ? c(q) : q));
  if (y.some((q, i) => i !== s && !(q > 0))) throw new InputError("Values must be greater than 0 (temperatures above absolute zero).");
  const [a1, b1, a2, b2] = y; let r: number;
  if (kind === "inv") r = s === 0 ? (a2 * b2) / b1 : s === 1 ? (a2 * b2) / a1 : s === 2 ? (a1 * b1) / b2 : (a1 * b1) / a2;
  else r = s === 0 ? (a2 * b1) / b2 : s === 1 ? (b2 * a1) / a2 : s === 2 ? (a1 * b2) / b1 : (a2 * b1) / a1;
  const lab = [`${nm[0]}₁`, `${nm[1]}₁`, `${nm[0]}₂`, `${nm[1]}₂`][s], out = s % 2 === 1 ? bk(r) : r;
  return { a: `${lab} = ${N(out)} ${s % 2 === 1 ? un[1] : un[0]}`, p: kind === "inv" ? `${nm[0]}·${nm[1]} stays constant` : `${nm[0]}/${nm[1]} stays constant`, f: kind === "inv" ? `${nm[0]}₁${nm[1]}₁ = ${nm[0]}₂${nm[1]}₂` : `${nm[0]}₁/${nm[1]}₁ = ${nm[0]}₂/${nm[1]}₂` };
};
export const boyle = gasLaw("inv", ["P", "V"], ["(pressure units)", "(volume units)"], [1, 10, 2, 5]);
export const gayLussac = gasLaw("dir", ["P", "T"], ["(pressure units)", "°C"], [1, 25, 1.2, 84.735], (c) => c + 273.15, (k) => k - 273.15);
export const avogadro = gasLaw("dir", ["V", "n"], ["(volume units)", "mol"], [22.4, 1, 44.8, 2]);
const HK = [1.3e-3, 6.4e-4, 3.4e-2];
export const henry: Calc = (v) => { const g = pick(v.g, 4), k = g === 3 ? P(v, "k", 1e-3, "Henry's constant") : HK[g], p = P(v, "p", 0.21, "Partial pressure"), c = k * p, mw = [32, 28.014, 44.01, 0][g]; return { a: `Dissolved concentration ${N(c)} mol/L`, p: mw ? `≈ ${N(c * mw * 1000)} mg/L` : `kH = ${N(k)} mol/(L·atm)`, f: "C = kH × P (ideal dilute solution, 25 °C presets)" }; };
export const osmotic: Calc = (v) => { const i = P(v, "i", 2, "van 't Hoff factor"), M = P(v, "m", 0.15, "Molarity"), T = num(v.t, 25) + 273.15, p = i * M * 0.082057366 * T; return { a: `Osmotic pressure ${N(p)} atm`, p: `${N(p * 101.325)} kPa · ${N(p * 760)} mmHg`, f: "π = i·M·R·T (R = 0.082057 L·atm/(mol·K))" }; };
export const massPct: Calc = (v) => { const f = txt(v as never, "f") || "C6H12O6", mm = formulaMass(f), c = parseFormula(f); const rows = [...c.counts.entries()].map(([s, n]) => `${s} ${N((n * elementMass(s) * 100) / mm)}% (${n} × ${N(elementMass(s))})`); return { a: `Molar mass ${N(mm)} g/mol`, p: rows.join(" · "), f: "Mass % = (atoms × atomic mass ÷ molar mass) × 100" }; };
export const atomEcon: Calc = (v) => { const p = P(v, "p", 46.07, "Desired product molar mass"), r = listOf(v as never, "r"), tot = r.reduce((a, b) => a + b, 0); if (!(tot > 0)) throw new InputError("Enter the reactant molar masses (× their coefficients)."); return { a: `Atom economy ${N((p / tot) * 100)}%`, p: `Desired ${N(p)} g/mol of ${N(tot)} g/mol total reactants · waste ${N(tot - p)} g/mol`, f: "Atom economy = M(desired product) ÷ Σ M(reactants) × 100 (multiply each by its coefficient)" }; };
export const pctIon: Calc = (v) => { const m = pick(v.m, 2), C = P(v, "c", 0.1, "Concentration"), ka = m === 0 ? P(v, "k", 1.8e-5, "Ka") : 0, h = m === 1 ? 10 ** -num(v.ph, 2.87) : (-ka + Math.sqrt(ka * ka + 4 * ka * C)) / 2; return { a: `Percent ionization ${N((h / C) * 100)}%`, p: `[H⁺] = ${N(h)} M · pH ${N(-Math.log10(h))}${m === 1 ? ` · Ka ≈ ${N((h * h) / (C - h))}` : ""}`, f: "% = [H⁺]eq ÷ [HA]₀ × 100 (weak monoprotic acid; Ka solved exactly)" }; };
export const polyCalcs: Record<string, Calc> = Object.fromEntries(Object.entries(POLY).map(([nm, n]) => [`${nm}-area-calculator`, polyCalc(n)]));

// ---- registry (generated)
export const ideaGeo1CustomCalculators: Record<string, Calc> = {
  ...polyCalcs,
  "square-area-calculator": square,
  "rectangle-area-calculator": rectangle,
  "parallelogram-area-calculator": parallelogram,
  "trapezoid-area-calculator": trapezoid,
  "kite-area-calculator": kite,
  "equilateral-triangle-calculator": equilateral,
  "isosceles-triangle-calculator": isosceles,
  "herons-formula-calculator": heron,
  "circumradius-calculator": circumradius,
  "inradius-calculator": inradius,
  "semicircle-area-calculator": semicircle,
  "quarter-circle-area-calculator": quarterCircle,
  "chord-length-calculator": chord,
  "arc-length-of-a-circle-calculator": arcLen,
  "polygon-interior-angles-calculator": polyAngles,
  "polygon-diagonals-calculator": polyDiag,
  "triangle-missing-angle-calculator": missingAngle,
  "similar-triangles-calculator": similarTri,
  "cube-volume-calculator": cube,
  "triangular-prism-volume-calculator": triPrism,
  "hexagonal-prism-volume-calculator": hexPrism,
  "pentagonal-prism-volume-calculator": pentPrism,
  "square-pyramid-surface-area-calculator": sqPyramidSA,
  "tetrahedron-volume-calculator": tetra,
  "triangular-pyramid-volume-calculator": triPyramid,
  "octahedron-volume-calculator": octa,
  "dodecahedron-volume-calculator": dodeca,
  "icosahedron-volume-calculator": icosa,
  "wedge-volume-calculator": wedge,
  "parallelepiped-volume-calculator": parallelepiped,
  "hollow-cylinder-volume-calculator": hollowCyl,
  "spherical-shell-volume-calculator": sphShell,
  "cone-surface-area-calculator": coneSA,
  "cylinder-surface-area-calculator": cylSA,
  "sphere-surface-area-calculator": sphereSA,
  "hemisphere-surface-area-calculator": hemiSA,
  "frustum-surface-area-calculator": frustumSA,
  "ellipsoid-surface-area-calculator": ellipsoidSA,
  "midpoint-calculator": midpoint,
  "endpoint-calculator": endpoint,
  "perpendicular-bisector-calculator": perpBisector,
  "point-slope-form-calculator": pointSlope,
  "line-equation-from-two-points-calculator": twoPointLine,
  "standard-form-to-slope-intercept-calculator": stdToSlope,
  "angle-between-two-lines-calculator": angleLines,
  "distance-between-parallel-lines-calculator": distParallel,
  "circle-through-three-points-calculator": circle3,
  "section-formula-calculator": section,
  "collinear-points-calculator": collinear,
  "plane-equation-from-three-points-calculator": plane3,
  "distance-from-point-to-plane-calculator": distPlane,
  "angle-between-vectors-calculator": angleVec,
  "gcf-calculator": gcf,
  "lcm-calculator": lcm,
  "modulo-calculator": modulo,
  "prime-number-checker-calculator": primeCheck,
  "prime-numbers-in-range-calculator": primesRange,
  "multiples-of-a-number-calculator": multiples,
  "reciprocal-calculator": reciprocal,
  "unit-rate-calculator": unitRate,
  "average-percentage-calculator": avgPct,
  "simplify-square-root-calculator": simplifyRoot,
  "permutation-calculator": permutation,
  "geometric-mean-calculator": geoMean,
  "range-calculator": rangeStat,
  "probability-of-at-least-one-calculator": atLeastOne,
  "card-draw-probability-calculator": cardDraw,
  "orbital-velocity-calculator": orbitalVel,
  "wave-speed-calculator": waveSpeed,
  "frequency-to-period-calculator": freqPeriod,
  "rotational-kinetic-energy-calculator": rotKE,
  "relative-velocity-calculator": relVel,
  "gravity-at-altitude-calculator": gAlt,
  "poiseuille-flow-calculator": poiseuille,
  "rc-time-constant-calculator": rcTau,
  "wheel-and-axle-calculator": wheelAxle,
  "coefficient-of-performance-calculator": cop,
  "boyles-law-calculator": boyle,
  "gay-lussacs-law-calculator": gayLussac,
  "avogadros-law-calculator": avogadro,
  "henrys-law-calculator": henry,
  "osmotic-pressure-calculator": osmotic,
  "mass-percent-composition-calculator": massPct,
  "atom-economy-calculator": atomEcon,
  "percent-ionization-calculator": pctIon,

};
