/**
 * Idea build, batch conv2 (18 Nov 2026 — site to 10,000 tools): more exact-definition converters, built on the conv1 factory.
 * New units: kgf/cm² = 98,066.5 Pa, cmH₂O = 98.0665 Pa; KiB = 1,024 bytes; Indian land units cent (decimal) = 1/100 acre and
 * guntha = 1/40 acre; CSS px = 1/96 in, point = 1/72 in, pica = 12 pt; standard gravity g = 9.80665 m/s²; poise = 0.1 Pa·s,
 * stokes = 10⁻⁴ m²/s; tesla = 10⁴ gauss; mAh = 3.6 C; paper basis weights (500 sheets): bond 17×22 in, text 25×38 in, cover 20×26 in,
 * index 25½×30½ in; fabric weight oz/yd² = 28.349523125 g ÷ 0.83612736 m²; US butter stick = 4 oz = 8 tbsp = ½ cup.
 * Also combined-unit converters (feet + inches, stone + pounds, pounds + ounces, inch fractions, hours + minutes), number-base and
 * text-code converters, and fraction/decimal/percent converters. All exact arithmetic — no estimated data.
 * SKIPPED (live tools already do it): AWG wire gauge, Roman numerals, decimal degrees ↔ DMS, repeating decimals, octal converter
 * (kept the specific base pairs), gas mark (oven-temperature-conversion-fan-calculator).
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";
import { txt } from "./sci-math-core";
import { DIMS, U, buildConvs, nf, type Dim } from "./calc-engine-idea-conv1";

const add = (base: Dim, note: string, rows: string[]): Dim => ({ note, u: { ...base.u, ...U(rows) } });
const lbGsm = (a: number, b: number) => 453.59237 / (500 * a * b * 0.00064516);
const D2: Record<string, Dim> = {
  energy: DIMS.energy,
  pres: add(DIMS.pres, `${DIMS.pres.note} 1 kgf/cm² (technical atmosphere) = 98,066.5 Pa; 1 cmH₂O = 98.0665 Pa.`, ["kgcm2|kilogram-force per square centimeter|kg/cm²|kg/cm²|98066.5|kg-cm2|kg/cm²", "cmh2o|centimeter of water|cmH₂O|cmH₂O|98.0665|cmh2o|cmH2O"]),
  data: add(DIMS.data, DIMS.data.note, ["kib|kibibyte|kibibytes|KiB|1024"]),
  area: add(DIMS.area, `${DIMS.area.note} Indian land units: 1 cent (decimal) = 1/100 acre = 435.6 ft²; 1 guntha = 1/40 acre = 1,089 ft².`, ["cent|cent (decimal)|cents|cent|40.468564224", "guntha|guntha|guntha|guntha|101.17141056|guntha|Guntha"]),
  vol: DIMS.vol,
  type: { note: "CSS reference units: 1 in = 96 px = 72 pt = 6 picas = 2.54 cm. Print output at another resolution (DPI) maps pixels differently.", u: U(["px|pixel (CSS)|pixels|px|0.010416666666666666", "pt|point|points|pt|0.013888888888888888", "pica|pica|picas|pc|0.16666666666666666", "mm|millimeter|millimeters|mm|0.03937007874015748", "cm|centimeter|centimeters|cm|0.3937007874015748", "in|inch|inches|in|1"]) },
  accel: { note: "Standard gravity g₀ = 9.80665 m/s² exactly; 1 ft/s² = 0.3048 m/s²; 1 Gal = 1 cm/s².", u: U(["g|g-force (standard gravity)|g-force|g|9.80665|g-force|G-Force", "ms2|meter per second squared|meters per second squared|m/s²|1|m-s2|m/s²", "fts2|foot per second squared|feet per second squared|ft/s²|0.3048|ft-s2|ft/s²"]) },
  visc: { note: "Dynamic viscosity: 1 Pa·s = 10 poise = 1,000 centipoise (cP); 1 cP = 1 mPa·s (water at 20 °C ≈ 1 cP).", u: U(["pas|pascal-second|pascal-seconds|Pa·s|1|pascal-seconds|Pascal-Seconds", "cp|centipoise|centipoise|cP|0.001|centipoise|Centipoise", "poise|poise|poise|P|0.1|poise|Poise"]) },
  kvisc: { note: "Kinematic viscosity: 1 stokes (St) = 10⁻⁴ m²/s; 1 centistokes (cSt) = 1 mm²/s = 10⁻⁶ m²/s.", u: U(["cst|centistokes|centistokes|cSt|1e-6|centistokes|Centistokes", "m2s|square meter per second|square meters per second|m²/s|1|m2-per-second|m²/s", "st|stokes|stokes|St|1e-4|stokes|Stokes"]) },
  mag: { note: "Magnetic flux density: 1 tesla (T) = 10,000 gauss (G); 1 microtesla (µT) = 10 milligauss (mG).", u: U(["t|tesla|tesla|T|1|tesla|Tesla", "mt|millitesla|millitesla|mT|0.001|millitesla|Millitesla", "ut|microtesla|microtesla|µT|1e-6|microtesla|Microtesla", "gs|gauss|gauss|G|1e-4|gauss|Gauss", "mg|milligauss|milligauss|mG|1e-7|milligauss|Milligauss"]) },
  charge: { note: "1 ampere-hour (Ah) = 3,600 coulombs; 1 mAh = 3.6 C. Battery energy (Wh) also needs the voltage.", u: U(["c|coulomb|coulombs|C|1", "mah|milliamp-hour|milliamp-hours|mAh|3.6|mah|mAh", "ah|amp-hour|amp-hours|Ah|3600"]) },
  mflow: { note: "1 lb = 0.45359237 kg exactly.", u: U(["kgh|kilogram per hour|kilograms per hour|kg/h|1|kg-per-hour|kg/h", "lbh|pound per hour|pounds per hour|lb/h|0.45359237|lb-per-hour|lb/h"]) },
  vflow: { note: "US gallon = 3.785411784 L; imperial gallon = 4.54609 L.", u: U(["gph|US gallon per hour|gallons per hour|gal/h|3.785411784|gph|GPH", "lph|liter per hour|liters per hour|L/h|1|liters-per-hour|L/h"]) },
  fabric: { note: "1 oz/yd² = 28.349523125 g ÷ 0.83612736 m² = 33.906 g/m² (gsm), from the exact ounce and yard definitions.", u: U(["gsm|gram per square meter|gsm|g/m²|1|gsm|GSM", "ozyd|ounce per square yard|oz/yd²|oz/yd²|33.90574726|oz-per-sq-yard|oz/yd²"]) },
  paper: { note: "Paper basis weight is the weight of 500 sheets at the grade's basis size: bond 17×22 in, text 25×38 in, cover 20×26 in, index 25½×30½ in. gsm is weight per square meter of one sheet.", u: U([
    "gsm|gram per square meter|gsm|gsm|1|gsm|GSM", `bond|lb bond|lb bond|lb bond|${lbGsm(17, 22)}|bond-paper-lb|Bond Paper (lb)`, `text|lb text|lb text|lb text|${lbGsm(25, 38)}|text-paper-lb|Text Paper (lb)`,
    `cover|lb cover|lb cover|lb cover|${lbGsm(20, 26)}|cover-stock-lb|Cover Stock (lb)`, `index|lb index|lb index|lb index|${lbGsm(25.5, 30.5)}|index-paper-lb|Index Paper (lb)`]) },
  butter: { note: "US butter sticks are 4 oz (113.4 g) by weight and marked as 8 tablespoons (½ cup). Tablespoons here are butter-by-the-wrapper, 1/8 stick.", u: U(["stick|stick of butter|sticks of butter|stick|113.3980925|sticks-of-butter|Sticks of Butter", "g|gram|grams|g|1", "tbsp|tablespoon of butter|tablespoons of butter|tbsp|14.1747615625|tablespoons-of-butter|Tablespoons of Butter", "oz|ounce|ounces|oz|28.349523125"]) },
};
export const PAIRS2: [string, string, string][] = [
  ["physics-calculators", "energy", "j-kwh kwh-j"],
  ["physics-calculators", "pres", "psi-kgcm2 kgcm2-psi bar-kgcm2 kgcm2-bar kgcm2-kpa kpa-kgcm2 cmh2o-mmhg mmhg-cmh2o cmh2o-kpa kpa-cmh2o"],
  ["computer-network-it-calculators", "data", "byte-mb mb-byte kb-gb gb-kb mb-tb tb-mb kib-kb kb-kib"],
  ["math-calculators", "area", "cent-ft2 ft2-cent cent-ac ac-cent guntha-ft2 ft2-guntha ac-guntha guntha-ac cent-m2 guntha-m2"],
  ["math-calculators", "vol", "gal-floz floz-gal qt-floz pt-floz pt-ml in3-ft3 ft3-in3 ipt-pt pt-ipt"],
  ["computer-network-it-calculators", "type", "pt-px px-pt px-mm mm-px px-in in-px pt-mm mm-pt pica-pt pt-pica px-cm cm-px"],
  ["physics-calculators", "accel", "g-ms2 ms2-g fts2-ms2 ms2-fts2 g-fts2 fts2-g"],
  ["physics-calculators", "visc", "cp-pas pas-cp poise-cp cp-poise"],
  ["physics-calculators", "kvisc", "cst-m2s m2s-cst"],
  ["physics-calculators", "mag", "t-gs gs-t mt-gs gs-mt ut-mg mg-ut"],
  ["electrical-electronics-engineering-calculators", "charge", "mah-c c-mah ah-c c-ah"],
  ["physics-calculators", "mflow", "kgh-lbh lbh-kgh"],
  ["car-ownership-fuel-ev-cost-calculators", "vflow", "gph-lph lph-gph"],
  ["manufacturing-metals-engineering-calculators", "fabric", "gsm-ozyd ozyd-gsm"],
  ["books-reading-writing-calculators", "paper", "bond-gsm gsm-bond text-gsm gsm-text cover-gsm gsm-cover bond-text text-bond"],
  ["baking-recipe-calculators", "butter", "stick-g g-stick stick-tbsp stick-oz"],
];
export const CONVS2 = buildConvs(PAIRS2, D2);
export const conv2Calcs: Record<string, Calc> = Object.fromEntries(CONVS2.map((c) => [c.slug, c.fn]));

// ---- combined-unit converters ----
const r2 = (x: number, d = 2) => nf(Math.round(x * 10 ** d) / 10 ** d);
const pos = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x >= 0)) throw new InputError(`${n} can't be negative.`); return x; };
const ftin = (inches: number, dp = 1) => { let ft = Math.floor(inches / 12), i = Math.round((inches - ft * 12) * 10 ** dp) / 10 ** dp; if (i >= 12) { ft++; i -= 12; } return `${ft} ft ${nf(i)} in`; };
export const cmToFtIn: Calc = (v) => { const cm = pos(v, "x", 170, "Height"), inch = cm / 2.54; return { r: `${nf(cm)} cm = ${ftin(inch)}`, a: `${ftin(inch, 0).replace(" ft ", "′ ").replace(" in", "″")} rounded · ${r2(inch)} inches total · ${r2(cm / 30.48, 3)} ft`, t: [150, 160, 165, 170, 175, 180, 185, 190].map((c) => `${c} cm = ${ftin(c / 2.54, 0)}`).join(" · ") }; };
export const mToFtIn: Calc = (v) => { const m = pos(v, "x", 1.8, "Length"), inch = m / 0.0254; return { r: `${nf(m)} m = ${ftin(inch)}`, a: `${r2(m / 0.3048, 3)} ft · ${r2(inch)} in`, t: [1, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 3].map((c) => `${c} m = ${ftin(c / 0.0254)}`).join(" · ") }; };
export const ftInToCm: Calc = (v) => { const ft = pos(v, "f", 5, "Feet"), i = pos(v, "i", 10, "Inches"), inch = ft * 12 + i; return { r: `${nf(ft)} ft ${nf(i)} in = ${r2(inch * 2.54, 1)} cm`, a: `${r2(inch * 0.0254, 3)} m · ${nf(inch)} inches total`, t: [[5, 0], [5, 4], [5, 6], [5, 8], [5, 10], [6, 0], [6, 2]].map(([a, b]) => `${a}′${b}″ = ${r2((a * 12 + b) * 2.54, 1)} cm`).join(" · ") }; };
export const decFtToFtIn: Calc = (v) => { const f = pos(v, "x", 12.75, "Feet"), inch = f * 12, ft = Math.floor(f), rem = inch - ft * 12; return { r: `${nf(f)} ft = ${ft} ft ${nf(Math.round(rem * 100) / 100)} in`, a: `≈ ${ft}′ ${fracIn(rem, 16)}″ (to the nearest 1/16 in)`, t: `${nf(f)} × 12 = ${r2(inch, 3)} in` }; };
export const ftInToDecFt: Calc = (v) => { const ft = pos(v, "f", 12, "Feet"), i = pos(v, "i", 9, "Inches"), fr = pos(v, "n", 0, "Fraction"), inch = i + fr / 16; return { r: `${nf(ft)} ft ${nf(inch)} in = ${r2(ft + inch / 12, 4)} ft`, a: `${r2((ft * 12 + inch) * 0.0254, 4)} m · ${nf(ft * 12 + inch)} in total`, t: [1, 2, 3, 4, 6, 8, 9, 10, 11].map((k) => `${k} in = ${r2(k / 12, 4)} ft`).join(" · ") }; };
const stLb = (kg: number) => { const lb = kg / 0.45359237; let st = Math.floor(lb / 14), r = Math.round((lb - st * 14) * 10) / 10; if (r >= 14) { st++; r -= 14; } return `${st} st ${nf(r)} lb`; };
export const kgToStLb: Calc = (v) => { const kg = pos(v, "x", 75, "Weight"); return { r: `${nf(kg)} kg = ${stLb(kg)}`, a: `${r2(kg / 0.45359237, 1)} lb in total · ${r2(kg / 6.35029318, 2)} stone`, t: [50, 60, 70, 80, 90, 100, 110].map((k) => `${k} kg = ${stLb(k)}`).join(" · ") }; };
export const stLbToKg: Calc = (v) => { const st = pos(v, "s", 11, "Stone"), lb = pos(v, "l", 7, "Pounds"), tot = st * 14 + lb; return { r: `${nf(st)} st ${nf(lb)} lb = ${r2(tot * 0.45359237, 1)} kg`, a: `${nf(tot)} lb in total`, t: [8, 9, 10, 11, 12, 13, 14, 15, 16].map((k) => `${k} st = ${r2(k * 6.35029318, 1)} kg`).join(" · ") }; };
const lbOz = (g: number) => { const oz = g / 28.349523125; let lb = Math.floor(oz / 16), r = Math.round((oz - lb * 16) * 10) / 10; if (r >= 16) { lb++; r -= 16; } return `${lb} lb ${nf(r)} oz`; };
export const gToLbOz: Calc = (v) => { const g = pos(v, "x", 3400, "Weight"); return { r: `${nf(g)} g = ${lbOz(g)}`, a: `${r2(g / 453.59237, 3)} lb · ${r2(g / 28.349523125, 1)} oz in total · ${r2(g / 1000, 3)} kg`, t: [2500, 2800, 3000, 3200, 3400, 3600, 4000, 4500].map((k) => `${nf(k)} g = ${lbOz(k)}`).join(" · ") }; };
export const kgToLbOz: Calc = (v) => { const kg = pos(v, "x", 5.5, "Weight"); return { r: `${nf(kg)} kg = ${lbOz(kg * 1000)}`, a: `${r2(kg / 0.45359237, 3)} lb in total`, t: [1, 2, 3, 4, 5, 10, 20, 25].map((k) => `${k} kg = ${lbOz(k * 1000)}`).join(" · ") }; };
export const lbOzToKg: Calc = (v) => { const lb = pos(v, "l", 7, "Pounds"), oz = pos(v, "o", 8, "Ounces"), g = lb * 453.59237 + oz * 28.349523125; return { r: `${nf(lb)} lb ${nf(oz)} oz = ${r2(g / 1000, 3)} kg`, a: `${r2(g, 0)} grams · ${nf(lb + oz / 16)} lb in total`, t: [5, 6, 7, 8, 9, 10].map((k) => `${k} lb = ${r2(k * 453.59237, 0)} g`).join(" · ") }; };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const fracIn = (inch: number, den: number) => { const w = Math.floor(inch), n = Math.round((inch - w) * den); if (n === 0) return `${w}`; if (n === den) return `${w + 1}`; const g = gcd(n, den); return `${w ? `${w} ` : ""}${n / g}/${den / g}`; };
const DEN = [8, 16, 32, 64];
export const mmToFrac: Calc = (v) => { const mm = pos(v, "x", 6.35, "Length"), den = DEN[pick(v.d, 4)], inch = mm / 25.4, approx = Math.round(inch * den) / den; return { r: `${nf(mm)} mm ≈ ${fracIn(inch, den)}″`, a: `Exact ${r2(inch, 4)} in · nearest 1/${den} in is ${r2(approx * 25.4, 3)} mm (error ${r2((approx * 25.4 - mm), 3)} mm)`, t: [3, 5, 6, 8, 10, 12, 13, 16, 19, 25].map((k) => `${k} mm ≈ ${fracIn(k / 25.4, den)}″`).join(" · ") }; };
const parseFrac = (s: string) => { const m = s.trim().replace(/["″]|in(ches)?$/i, "").trim().match(/^(\d+(?:\.\d+)?)?(?:[\s-]+)?(?:(\d+)\s*\/\s*(\d+))?$/); if (!m || (!m[1] && !m[2])) throw new InputError("Enter inches like 1 3/8, 3/4 or 2.5."); if (m[3] && Number(m[3]) === 0) throw new InputError("The fraction's bottom number can't be 0."); return (m[1] ? Number(m[1]) : 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0); };
export const fracToMm: Calc = (v) => { const s = txt(v as never, "x") || "1 3/8", inch = parseFrac(s); return { r: `${s}″ = ${r2(inch * 25.4, 3)} mm`, a: `${r2(inch, 5)} in decimal · ${r2(inch * 2.54, 4)} cm`, t: ["1/16", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "1"].map((f) => `${f}″ = ${r2(parseFrac(f) * 25.4, 2)} mm`).join(" · ") }; };
export const decInToFrac: Calc = (v) => { const x = pos(v, "x", 2.6875, "Inches"), den = DEN[pick(v.d, 4)], ap = Math.round(x * den) / den; return { r: `${nf(x)} in ≈ ${fracIn(x, den)}″`, a: `Nearest 1/${den} in = ${nf(ap)} in (off by ${r2(Math.abs(ap - x), 5)} in)`, t: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((k) => `${k} = ${fracIn(k, 8)}`).join(" · ") }; };
const hm = (h: number) => { let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H++; M = 0; } return `${H} h ${M} min`; };
export const decHrToHm: Calc = (v) => { const h = pos(v, "x", 7.75, "Hours"); return { r: `${nf(h)} hours = ${hm(h)}`, a: `${nf(Math.round(h * 60 * 100) / 100)} minutes in total`, t: [0.1, 0.25, 0.5, 0.75, 1.2, 1.5, 2.25, 8.5].map((k) => `${k} h = ${hm(k)}`).join(" · ") }; };
export const hmToDecHr: Calc = (v) => { const h = pos(v, "h", 7, "Hours"), m = pos(v, "m", 45, "Minutes"); return { r: `${nf(h)} h ${nf(m)} min = ${r2(h + m / 60, 4)} hours`, a: `${nf(h * 60 + m)} minutes in total`, t: [5, 6, 10, 15, 20, 30, 40, 45, 50].map((k) => `${k} min = ${r2(k / 60, 4)} h`).join(" · ") }; };
const hms = (s: number) => { const t = Math.round(s), H = Math.floor(t / 3600), M = Math.floor((t % 3600) / 60), S = t % 60; return `${H}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")}`; };
export const secToHms: Calc = (v) => { const s = pos(v, "x", 5000, "Seconds"), d = Math.floor(s / 86400); return { r: `${nf(s)} seconds = ${hms(s)} (h:mm:ss)`, a: `${d ? `${d} day${d > 1 ? "s" : ""} ${hms(s - d * 86400)} · ` : ""}${r2(s / 60, 3)} minutes · ${r2(s / 3600, 4)} hours`, t: [60, 90, 600, 1000, 3600, 5400, 10000, 86400].map((k) => `${nf(k)} s = ${hms(k)}`).join(" · ") }; };
export const minToHm: Calc = (v) => { const m = pos(v, "x", 135, "Minutes"); return { r: `${nf(m)} minutes = ${hm(m / 60)}`, a: `${r2(m / 60, 4)} hours · ${nf(m * 60)} seconds`, t: [45, 75, 90, 100, 120, 150, 180, 240, 480].map((k) => `${k} min = ${hm(k / 60)}`).join(" · ") }; };
export const hmsToSec: Calc = (v) => { const h = pos(v, "h", 1, "Hours"), m = pos(v, "m", 23, "Minutes"), s = pos(v, "s", 20, "Seconds"), tot = h * 3600 + m * 60 + s; return { r: `${nf(h)}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} = ${nf(tot)} seconds`, a: `${r2(tot / 60, 3)} minutes · ${r2(tot / 3600, 4)} hours`, t: "1 h = 3,600 s · 1 min = 60 s · 1 day = 86,400 s" }; };

// ---- number bases & text codes ----
const DIG = "0123456789abcdefghijklmnopqrstuvwxyz";
const parseBase = (s0: string, b: number): bigint => {
  const s = s0.trim().toLowerCase().replace(/^0[xbo]/, "").replace(/[\s_,]/g, "");
  if (!s) throw new InputError("Enter a number.");
  const neg = s.startsWith("-"), body = neg ? s.slice(1) : s; let r = BigInt(0); const B = BigInt(b);
  for (const ch of body) { const d = DIG.indexOf(ch); if (d < 0 || d >= b) throw new InputError(`"${ch}" isn't a valid base-${b} digit.`); r = r * B + BigInt(d); }
  return neg ? -r : r;
};
const NAMES: Record<number, [string, string]> = { 2: ["binary", "Binary"], 8: ["octal", "Octal"], 10: ["decimal", "Decimal"], 16: ["hex", "Hex"] };
const group = (s: string, n: number) => s.replace(new RegExp(`\\B(?=(\\w{${n}})+(?!\\w))`, "g"), " ");
export const makeBase = (a: number, b: number): Calc => (v) => {
  const s = txt(v as never, "x") || (a === 2 ? "101101" : a === 16 ? "ff" : a === 8 ? "755" : "255"), n = parseBase(s, a), neg = n < BigInt(0), abs = neg ? -n : n;
  const out = (neg ? "-" : "") + abs.toString(b), outU = b === 16 ? out.toUpperCase() : out;
  const others = [2, 8, 10, 16].filter((x) => x !== a && x !== b).map((x) => `${NAMES[x][1]} ${(neg ? "-" : "") + (x === 16 ? abs.toString(16).toUpperCase() : abs.toString(x))}`).join(" · ");
  return { r: `${s.trim()} (base ${a}) = ${b === 2 ? group(outU, 4) : b === 10 ? Number(abs) < 1e15 ? (neg ? -1 : 1) * Number(abs) + "" : outU : outU} (base ${b})`, a: `Also: ${others} · ${abs.toString(2).length} bits`, t: `${NAMES[a][1]} digits are worth powers of ${a}; ${NAMES[b][0]} digits powers of ${b}.${a === 2 && b === 16 ? " Each hex digit = 4 binary digits." : a === 2 && b === 8 ? " Each octal digit = 3 binary digits." : ""}` };
};
export const BASES: [number, number][] = [[2, 10], [10, 2], [16, 10], [10, 16], [8, 10], [10, 8], [2, 16], [16, 2], [2, 8], [8, 2], [16, 8], [8, 16]];
export const baseCalcs: Record<string, Calc> = Object.fromEntries(BASES.map(([a, b]) => [`${NAMES[a][0]}-to-${NAMES[b][0]}-converter`, makeBase(a, b)]));
export const baseName = (n: number) => NAMES[n];
const enc = new TextEncoder(), dec = new TextDecoder("utf-8", { fatal: true });
const bytesOut = (s: string) => Array.from(enc.encode(s));
const bytesIn = (s: string, b: number) => { const parts = s.trim().split(/[\s,]+/).filter(Boolean); if (!parts.length) throw new InputError("Enter codes separated by spaces."); const arr = parts.map((p) => { const x = parseInt(p.replace(/^0x/i, ""), b); if (!Number.isFinite(x) || x < 0 || x > 255) throw new InputError(`"${p}" isn't a valid byte.`); return x; }); try { return dec.decode(new Uint8Array(arr)); } catch { throw new InputError("Those bytes aren't valid UTF-8 text."); } };
const hexSplit = (s: string) => { const c = s.replace(/^0x/i, "").replace(/\s+/g, ""); if (c.length % 2 || /[^0-9a-f]/i.test(c)) return s; return c.match(/../g)!.join(" "); };
export const textToBin: Calc = (v) => { const s = txt(v as never, "x") || "Hi", b = bytesOut(s); return { r: b.map((x) => x.toString(2).padStart(8, "0")).join(" "), a: `${s.length} characters · ${b.length} bytes (UTF-8) · ${b.length * 8} bits`, t: "Each character is stored as one or more 8-bit bytes (UTF-8; plain ASCII letters are one byte)." }; };
export const binToText: Calc = (v) => { const s = txt(v as never, "x") || "01001000 01101001", c = s.replace(/[^01]/g, ""); const t = s.trim().includes(" ") ? bytesIn(s, 2) : c.length % 8 ? (() => { throw new InputError("Binary text must be in groups of 8 bits."); })() : bytesIn(c.match(/.{8}/g)!.join(" "), 2); return { r: t, a: `${t.length} characters`, t: "Reads 8-bit groups as UTF-8 bytes." }; };
export const textToHex: Calc = (v) => { const s = txt(v as never, "x") || "Hello", b = bytesOut(s); return { r: b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" "), a: `${b.length} bytes (UTF-8)`, t: "Each byte is shown as two hexadecimal digits (00–FF)." }; };
export const hexToText: Calc = (v) => { const s = txt(v as never, "x") || "48 65 6C 6C 6F", t = bytesIn(hexSplit(s), 16); return { r: t, a: `${t.length} characters`, t: "Reads pairs of hex digits as UTF-8 bytes." }; };
export const textToAscii: Calc = (v) => { const s = txt(v as never, "x") || "ABC", cps = Array.from(s).map((c) => c.codePointAt(0) as number); return { r: cps.join(" "), a: cps.some((c) => c > 127) ? "Some characters are outside ASCII (0–127); their Unicode code points are shown" : "All characters are standard ASCII (0–127)", t: "A = 65, a = 97, 0 = 48, space = 32." }; };
export const asciiToText: Calc = (v) => { const s = txt(v as never, "x") || "72 101 108 108 111", parts = s.trim().split(/[\s,]+/).filter(Boolean).map(Number); if (!parts.length || parts.some((x) => !Number.isInteger(x) || x < 0 || x > 0x10ffff)) throw new InputError("Enter whole-number codes (0–1,114,111) separated by spaces."); const t = String.fromCodePoint(...parts); return { r: t, a: `${parts.length} characters`, t: "Codes 0–127 are ASCII; higher numbers are Unicode code points." }; };

// ---- fractions, decimals, percents ----
const toFrac = (x: number, maxDen = 10000) => { const sgn = x < 0 ? -1 : 1; let a = Math.abs(x), h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = a; for (let i = 0; i < 40; i++) { const ai = Math.floor(b), h2 = ai * h1 + h0, k2 = ai * k1 + k0; if (k2 > maxDen) break; h0 = h1; h1 = h2; k0 = k1; k1 = k2; if (Math.abs(a - h1 / k1) < 1e-12) break; b = 1 / (b - ai); if (!Number.isFinite(b)) break; } a = h1; return [sgn * a, k1] as [number, number]; };
const mixed = (n: number, d: number) => { const s = n < 0 ? "-" : "", N = Math.abs(n), w = Math.floor(N / d), r = N % d; return d === 1 ? `${n}` : w ? `${s}${w} ${r}/${d}` : `${s}${r}/${d}`; };
const parseF = (s0: string) => { const s = s0.trim(); const m = s.match(/^(-)?\s*(\d+)?(?:\s+|^|(?<=-))?(?:(\d+)\s*\/\s*(\d+))?$/); if (m && (m[3] || m[2])) { if (m[4] && Number(m[4]) === 0) throw new InputError("The denominator can't be 0."); const v = (m[2] ? Number(m[2]) : 0) + (m[3] ? Number(m[3]) / Number(m[4]) : 0); return m[1] ? -v : v; } const x = Number(s); if (!Number.isFinite(x)) throw new InputError("Enter a fraction like 3/8 or 1 1/2."); return x; };
export const decToFrac: Calc = (v) => { const x = num(v.x, 0.375), [n, d] = toFrac(x); return { r: `${nf(x)} = ${n}/${d}${Math.abs(n) > d && d > 1 ? ` = ${mixed(n, d)}` : ""}`, a: Math.abs(n / d - x) > 1e-9 ? `Closest fraction with denominator ≤ 10,000 (error ${nf(Math.abs(n / d - x))})` : "Exact, in lowest terms", t: "0.5 = 1/2 · 0.25 = 1/4 · 0.125 = 1/8 · 0.2 = 1/5 · 0.75 = 3/4 · 0.333… = 1/3" }; };
export const fracToDec: Calc = (v) => { const s = txt(v as never, "x") || "3/8", x = parseF(s); return { r: `${s} = ${nf(x)}`, a: `${nf(x * 100)}% · ${Number.isInteger(x * 1e6) ? "terminating decimal" : "repeating or long decimal (rounded)"}`, t: "Divide the numerator by the denominator: 3/8 = 3 ÷ 8 = 0.375." }; };
export const pctToFrac: Calc = (v) => { const p = num(v.x, 62.5), [n, d] = toFrac(p / 100); return { r: `${nf(p)}% = ${n}/${d}`, a: `= ${nf(p / 100)} as a decimal${Math.abs(n) > d ? ` = ${mixed(n, d)}` : ""}`, t: "Write the percent over 100 and simplify: 62.5% = 62.5/100 = 5/8." }; };
export const fracToPct: Calc = (v) => { const s = txt(v as never, "x") || "5/8", x = parseF(s); return { r: `${s} = ${nf(x * 100)}%`, a: `= ${nf(x)} as a decimal`, t: "Divide, then multiply by 100: 5/8 = 0.625 = 62.5%." }; };
export const decToPct: Calc = (v) => { const x = num(v.x, 0.125); return { r: `${nf(x)} = ${nf(x * 100)}%`, a: `As a fraction: ${toFrac(x).join("/")}`, t: "Multiply by 100 (move the decimal point two places right)." }; };
export const pctToDec: Calc = (v) => { const p = num(v.x, 12.5); return { r: `${nf(p)}% = ${nf(p / 100)}`, a: `As a fraction: ${toFrac(p / 100).join("/")}`, t: "Divide by 100 (move the decimal point two places left)." }; };
export const mixedToImproper: Calc = (v) => { const w = Math.trunc(num(v.w, 2)), n = Math.trunc(num(v.n, 3)), d = Math.trunc(num(v.d, 4)); if (d <= 0 || n < 0) throw new InputError("Use a positive denominator and a non-negative numerator."); const N = Math.abs(w) * d + n, g = gcd(N, d), sg = w < 0 ? "-" : ""; return { r: `${w} ${n}/${d} = ${sg}${N}/${d}${g > 1 ? ` = ${sg}${N / g}/${d / g}` : ""}`, a: `= ${nf((w < 0 ? -1 : 1) * (N / d))} as a decimal`, t: "Multiply the whole number by the denominator and add the numerator: 2 3/4 = (2 × 4 + 3)/4 = 11/4." }; };
export const improperToMixed: Calc = (v) => { const n = Math.trunc(num(v.n, 11)), d = Math.trunc(num(v.d, 4)); if (d === 0) throw new InputError("The denominator can't be 0."); const g = gcd(Math.abs(n), Math.abs(d)), N = n / g, D = d / g, sg = N * D < 0 ? -1 : 1; return { r: `${n}/${d} = ${mixed(sg * Math.abs(N), Math.abs(D))}`, a: `= ${nf(n / d)} as a decimal${g > 1 ? ` · simplified by ${g}` : ""}`, t: "Divide: the quotient is the whole number, the remainder goes over the denominator." }; };

// ---- registry (generated)
export const ideaConv2CustomCalculators: Record<string, Calc> = {
  ...conv2Calcs,
  ...baseCalcs,
  "cm-to-feet-and-inches-converter": cmToFtIn,
  "meters-to-feet-and-inches-converter": mToFtIn,
  "feet-and-inches-to-cm-converter": ftInToCm,
  "decimal-feet-to-feet-and-inches-converter": decFtToFtIn,
  "feet-and-inches-to-decimal-feet-converter": ftInToDecFt,
  "kg-to-stone-and-pounds-converter": kgToStLb,
  "stone-and-pounds-to-kg-converter": stLbToKg,
  "grams-to-pounds-and-ounces-converter": gToLbOz,
  "kg-to-pounds-and-ounces-converter": kgToLbOz,
  "pounds-and-ounces-to-kg-converter": lbOzToKg,
  "mm-to-inch-fraction-converter": mmToFrac,
  "inch-fraction-to-mm-converter": fracToMm,
  "decimal-inches-to-fraction-converter": decInToFrac,
  "decimal-hours-to-hours-and-minutes-converter": decHrToHm,
  "hours-and-minutes-to-decimal-hours-converter": hmToDecHr,
  "seconds-to-hours-minutes-seconds-converter": secToHms,
  "minutes-to-hours-and-minutes-converter": minToHm,
  "hours-minutes-seconds-to-seconds-converter": hmsToSec,
  "text-to-binary-converter": textToBin,
  "binary-to-text-converter": binToText,
  "text-to-hex-converter": textToHex,
  "hex-to-text-converter": hexToText,
  "text-to-ascii-code-converter": textToAscii,
  "ascii-code-to-text-converter": asciiToText,
  "decimal-to-fraction-converter": decToFrac,
  "fraction-to-decimal-converter": fracToDec,
  "percent-to-fraction-converter": pctToFrac,
  "fraction-to-percent-converter": fracToPct,
  "decimal-to-percent-converter": decToPct,
  "percent-to-decimal-converter": pctToDec,
  "mixed-number-to-improper-fraction-converter": mixedToImproper,
  "improper-fraction-to-mixed-number-converter": improperToMixed,
};
