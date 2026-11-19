/**
 * Batch: Mixed keyword check (16 Nov 2026, Claude outputs/Mixed_Keyword_Check.md). Six converters:
 * height (Science > Math), feet & inches (Math), torque units (Mechanical & Structural), gallons to
 * pounds (Physics), cubic yards to tons (House & Garden > Gravel, Soil & Landscaping) and lumens to
 * watts (House & Garden > HVAC, Plumbing & Electrical).
 *
 * Near-namesakes kept apart on purpose:
 *  - height-converter = one person's height in ft + in ↔ cm, plus where it sits against average
 *    adult heights. unit-converter (existing) converts a single number between single units.
 *  - feet-and-inches = tape-measure arithmetic (add, subtract, multiply, divide ft-in lengths, to the
 *    nearest 1/16 in). height-converter doesn't do arithmetic.
 *  - torque-conversion = torque units only (N·m, ft-lb, in-lb…). torque-calculator (existing)
 *    computes torque from force × lever arm, power or bolt preload.
 *  - gallons-to-pounds = liquid volume ↔ weight by density. cooking-calculator (existing) is
 *    kitchen cups/grams by ingredient; mass-calculator (existing) is general physics.
 *  - cubic-yards-to-tons = a volume you already know ↔ tons. gravel/sand/topsoil calculators
 *    (existing) start from length × width × depth. Densities match calc-engine-biz-landscape.ts.
 *  - lumens-to-watts = one bulb's brightness ↔ power by bulb type. lumens-calculator (existing) =
 *    how many lumens a room needs.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig } from "./trv-core";

const show = (x: number, s = 6) => (Number.isFinite(x) ? nfmt(sig(x, s), 6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
/** CDC NHANES 2015–2018 average height of US adults 20+: men 175.3 cm, women 161.3 cm. */
const AVG_MEN = 175.3, AVG_WOMEN = 161.3;
function ftIn(totalIn: number, denom = 4) {
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * denom) / denom;
  if (inch >= 12) { ft += 1; inch -= 12; }
  return { ft, inch, text: `${ft}′ ${show(inch, 4)}″` };
}
export const heightConverter: Calc = (v) => {
  const m = pick(v.mode, 3);
  let cm: number;
  if (m === 0) {
    const ft = num(v.feet, 5), inch = num(v.inches, 9);
    if (ft < 0 || inch < 0) throw new InputError("Feet and inches can't be negative.");
    cm = (ft * 12 + inch) * 2.54;
  } else if (m === 1) cm = num(v.cm, 175);
  else cm = num(v.totalIn, 69) * 2.54;
  if (!(cm > 0)) throw new InputError("Enter a height above zero.");
  if (cm > 300) throw new InputError("That's taller than any person on record (272 cm). Check the units.");
  const totalIn = cm / 2.54, fi = ftIn(totalIn);
  const vs = (avg: number, who: string) => { const d = cm - avg; return `${Math.abs(d) < 0.5 ? "about the same as" : `${show(Math.abs(d), 3)} cm (${show(Math.abs(d) / 2.54, 2)} in) ${d > 0 ? "taller than" : "shorter than"}`} the average US ${who} (${show(avg, 4)} cm, ${ftIn(avg / 2.54).text})`; };
  return {
    result: m === 1 ? fi.text : `${show(cm, 4)} cm`,
    cm: Math.round(cm * 10) / 10,
    feetInches: fi.text,
    inches: `${show(totalIn, 4)} in`,
    meters: `${show(cm / 100, 4)} m`,
    feetDecimal: `${show(totalIn / 12, 4)} ft`,
    vsMen: vs(AVG_MEN, "man"),
    vsWomen: vs(AVG_WOMEN, "woman"),
  };
};
const DENOMS = [16, 8, 4, 2, 1];
/** "7", "7.5", "7 1/2", "1/2" → number. */
function mixed(s: string): number {
  const t = s.trim();
  let m = t.match(/^(-?\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (m) { const w = Number(m[1]); return w + Math.sign(w || 1) * (Number(m[2]) / Number(m[3])); }
  m = t.match(/^(-?\d+)\/(\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t);
  return NaN;
}
/** Parses 5' 7 1/2", 5ft 7in, 5-7, 67in, 67", 5.5ft, 2m, 170cm or a plain number (feet) → inches. */
export function parseFtIn(raw: string, label: string): number {
  let s = raw.toLowerCase().replace(/[′’‘`]/g, "'").replace(/[″“”]/g, '"').replace(/''/g, '"').replace(/,/g, "").trim();
  if (!s) throw new InputError(`${label}: enter a length like 5' 7 1/2".`);
  let sign = 1;
  if (s.startsWith("-")) { sign = -1; s = s.slice(1).trim(); }
  const metric = s.match(/^(\d*\.?\d+)\s*(mm|cm|m)$/);
  if (metric) return sign * (Number(metric[1]) * ({ mm: 0.1, cm: 1, m: 100 } as Record<string, number>)[metric[2]]) / 2.54;
  const N = String.raw`(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)`;
  const fm = s.match(new RegExp(`${N}\\s*(?:'|ft\\.?|feet|foot)`));
  const im = s.match(new RegExp(`${N}\\s*(?:"|in\\.?|inch|inches)(?![a-z])`));
  let total: number;
  if (fm || im) {
    total = (fm ? mixed(fm[1]) * 12 : 0) + (im ? mixed(im[1]) : 0);
    if (fm && !im) { const rest = s.slice((fm.index ?? 0) + fm[0].length).replace(/^[\s-]+/, ""); if (rest) { const r = mixed(rest); if (Number.isFinite(r)) total += r; } }
  } else {
    const dash = s.match(/^(\d+)\s*-\s*(.+)$/);
    if (dash && Number.isFinite(mixed(dash[2]))) total = Number(dash[1]) * 12 + mixed(dash[2]);
    else total = mixed(s) * 12;
  }
  if (!Number.isFinite(total)) throw new InputError(`${label}: "${raw}" isn't a length. Try 5' 7 1/2", 5ft 7in, 67in or 5.5.`);
  return sign * total;
}
function ftInText(inches: number, denom: number) {
  const neg = inches < 0, a = Math.abs(inches);
  let ft = Math.floor(a / 12), rem = Math.round((a - ft * 12) * denom) / denom;
  if (rem >= 12) { ft += 1; rem -= 12; }
  const whole = Math.floor(rem), frac = Math.round((rem - whole) * denom);
  let fs = "";
  if (frac) { let n = frac, d = denom; while (n % 2 === 0 && d > 1) { n /= 2; d /= 2; } fs = `${n}/${d}`; }
  const inPart = whole || !fs ? `${whole}${fs ? ` ${fs}` : ""}` : fs;
  return `${neg ? "−" : ""}${ft}′ ${inPart}″`;
}
export const feetAndInches: Calc = (v) => {
  const op = pick(v.op, 5), denom = DENOMS[pick(v.round, 5)];
  const a = parseFtIn(txt(v, "a") || "5' 7 1/2\"", "Length A");
  let r: number, how: string;
  if (op === 4) { r = a; how = "A converted"; }
  else if (op <= 1) {
    const b = parseFtIn(txt(v, "b") || "3' 8 3/4\"", "Length B");
    r = op === 0 ? a + b : a - b;
    how = `${ftInText(a, 16)} ${op === 0 ? "+" : "−"} ${ftInText(b, 16)}`;
  } else {
    const n = Number((txt(v, "b") || "2").replace(/[^\d.\-/ ]/g, "").trim()) || mixed(txt(v, "b"));
    if (!Number.isFinite(n)) throw new InputError("B: for multiply or divide, enter a plain number like 3 or 2.5.");
    if (op === 3 && n === 0) throw new InputError("You can't divide by zero.");
    r = op === 2 ? a * n : a / n;
    how = `${ftInText(a, 16)} ${op === 2 ? "×" : "÷"} ${show(n)}`;
  }
  return {
    result: ftInText(r, denom),
    inches: `${show(r, 6)} in`,
    feet: `${show(r / 12, 6)} ft`,
    yards: `${show(r / 36, 6)} yd`,
    metric: `${show(r * 2.54, 6)} cm (${show(r * 0.0254, 5)} m)`,
    working: `${how} = ${ftInText(r, denom)}`,
  };
};

// ------------------------------------------------------------------ torque conversion
/** N·m per unit (exact from 1 lbf = 4.4482216152605 N, 1 ft = 0.3048 m, 1 kgf = 9.80665 N). */
export const TORQUE_UNITS: [string, number][] = [
  ["Newton-metre (N·m)", 1],
  ["Foot-pound (ft-lb, lbf·ft)", 1.3558179483314004],
  ["Inch-pound (in-lb, lbf·in)", 0.1129848290276167],
  ["Inch-ounce (in-oz)", 0.00706155181422604],
  ["Kilogram-force metre (kgf·m)", 9.80665],
  ["Kilogram-force centimetre (kgf·cm)", 0.0980665],
  ["Newton-centimetre (N·cm)", 0.01],
  ["Kilonewton-metre (kN·m)", 1000],
  ["Decanewton-metre (daN·m)", 10],
];
const shortU = (l: string) => (l.match(/\(([^,)]+)/)?.[1] ?? l);
export const torqueConversion: Calc = (v) => {
  const x = num(v.x, 100), f = TORQUE_UNITS[pick(v.from, TORQUE_UNITS.length)], t = TORQUE_UNITS[pick(v.to, TORQUE_UNITS.length)];
  const nm = x * f[1], out = nm / t[1];
  return {
    result: `${show(x)} ${shortU(f[0])} = ${show(out)} ${shortU(t[0])}`,
    value: sig(out, 10),
    factor: `1 ${shortU(f[0])} = ${show(f[1] / t[1], 8)} ${shortU(t[0])}`,
    all: TORQUE_UNITS.map(([l, k]) => `${show(nm / k)} ${shortU(l)}`).join(" · "),
  };
};
/** Volume units in litres. */
export const VOL_UNITS: [string, number][] = [["US gallons", 3.785411784], ["UK (imperial) gallons", 4.54609], ["Litres", 1], ["US quarts", 0.946352946], ["US pints", 0.473176473], ["US cups", 0.2365882365], ["US fluid ounces", 0.0295735295625], ["Cubic feet", 28.316846592], ["Cubic metres", 1000], ["Millilitres", 0.001]];
export const WT_UNITS = ["Pounds (lb)", "Kilograms (kg)", "Ounces (oz)", "US short tons"];
const WT_KG = [0.45359237, 1, 0.028349523125, 907.18474];
/** Typical densities (kg/L) near room temperature; fuels at 60 °F. */
export const LIQUIDS: [string, number][] = [
  ["Water (fresh, ~68 °F)", 0.9982],
  ["Water (39 °F, maximum density)", 1.0],
  ["Seawater", 1.025],
  ["Whole milk", 1.03],
  ["Gasoline", 0.745],
  ["Diesel", 0.85],
  ["Jet fuel / kerosene", 0.8],
  ["Ethanol", 0.789],
  ["Vegetable / cooking oil", 0.92],
  ["Motor oil", 0.87],
  ["Honey", 1.42],
  ["Antifreeze (50/50 with water)", 1.07],
  ["Liquid propane", 0.508],
  ["Custom density (enter below)", 0],
];
export const gallonsToPounds: Calc = (v) => {
  const m = pick(v.mode, 2), vu = VOL_UNITS[pick(v.vunit, VOL_UNITS.length)], wi = pick(v.wunit, WT_UNITS.length);
  const li = pick(v.liquid, LIQUIDS.length);
  const rho = li === LIQUIDS.length - 1 ? num(v.density, 1) : LIQUIDS[li][1];
  if (!(rho > 0)) throw new InputError("Enter a density above 0 kg/L (water is about 1).");
  const amt = num(v.amount, 1);
  if (amt < 0) throw new InputError("The amount can't be negative.");
  let litres: number, kg: number;
  if (m === 0) { litres = amt * vu[1]; kg = litres * rho; }
  else { kg = amt * WT_KG[wi]; litres = kg / rho; }
  const lbPerGal = rho * 3.785411784 / 0.45359237;
  const name = LIQUIDS[li][0].split(" (")[0].toLowerCase();
  return {
    result: m === 0 ? `${show(kg / WT_KG[wi])} ${WT_UNITS[wi].split(" (")[0].toLowerCase()}` : `${show(litres / vu[1])} ${vu[0].toLowerCase()}`,
    pounds: `${show(kg / 0.45359237)} lb`,
    kilograms: `${show(kg)} kg`,
    gallons: `${show(litres / 3.785411784)} US gal (${show(litres)} L)`,
    perGallon: `${show(lbPerGal, 4)} lb per US gallon of ${name} (${show(rho, 4)} kg/L)`,
    raw: sig(m === 0 ? kg / WT_KG[wi] : litres / vu[1], 10),
  };
};
/** Loose bulk density, US short tons per cubic yard (same chart as calc-engine-biz-landscape.ts). */
export const BULK: [string, number][] = [
  ["Pea gravel", 1.35], ["#57 crushed stone (3/4 in)", 1.4], ["#3 / #4 crushed stone (1–2 in)", 1.45], ["River rock", 1.35], ["Crushed concrete", 1.2], ["Decomposed granite", 1.3], ["Road base / Class 5 (loose)", 1.4], ["Dry sand", 1.35], ["Wet sand", 1.7], ["Topsoil", 1.1], ["Fill dirt", 1.2], ["Clay", 1.4], ["Asphalt millings", 1.3], ["Hot-mix asphalt (compacted)", 1.96], ["Concrete (cured)", 2.0], ["Lava rock", 0.5], ["Mulch", 0.4], ["Custom (enter tons per yd³)", 0],
];
export const cubicYardsToTons: Calc = (v) => {
  const m = pick(v.mode, 2), bi = pick(v.material, BULK.length);
  const d = bi === BULK.length - 1 ? num(v.custom, 1.4) : BULK[bi][1];
  if (!(d > 0)) throw new InputError("Enter a density above 0 tons per cubic yard.");
  const amt = num(v.amount, 10);
  if (amt < 0) throw new InputError("The amount can't be negative.");
  const yd3 = m === 0 ? amt : amt / d, tons = m === 0 ? amt * d : amt;
  const truck = num(v.truck, 15);
  return {
    result: m === 0 ? `${show(tons, 4)} tons` : `${show(yd3, 4)} cubic yards`,
    tons: `${show(tons, 4)} US tons (${nfmt(Math.round(tons * 2000))} lb)`,
    tonnes: `${show(tons * 0.90718474, 4)} metric tonnes`,
    yards: `${show(yd3, 4)} yd³ (${show(yd3 * 27, 4)} ft³, ${show(yd3 * 0.764554857984, 4)} m³)`,
    density: `${show(d, 3)} tons per yd³ (${nfmt(Math.round(d * 2000 / 27))} lb per ft³)`,
    trucks: truck > 0 ? `${Math.ceil(tons / truck)} load${Math.ceil(tons / truck) === 1 ? "" : "s"} at ${show(truck)} tons each` : "—",
    raw: sig(m === 0 ? tons : yd3, 10),
  };
};
/** Typical luminous efficacy (lm/W) of household bulbs (DOE / ENERGY STAR equivalence charts). */
export const BULBS: [string, number][] = [["LED", 90], ["CFL", 60], ["Halogen", 18], ["Incandescent", 14], ["Fluorescent tube (T8)", 85], ["Custom (enter lm/W)", 0]];
/** ENERGY STAR lumens ↔ incandescent watts: 450 = 40 W, 800 = 60 W, 1100 = 75 W, 1600 = 100 W, 2600 = 150 W. */
const EQ: [number, number][] = [[0, 0], [450, 40], [800, 60], [1100, 75], [1600, 100], [2600, 150]];
const incEq = (lm: number) => {
  for (let i = 1; i < EQ.length; i++) if (lm <= EQ[i][0]) { const [a, wa] = EQ[i - 1], [b, wb] = EQ[i]; return wa + ((lm - a) * (wb - wa)) / (b - a); }
  const [a, wa] = EQ[EQ.length - 2], [b, wb] = EQ[EQ.length - 1];
  return wb + ((lm - b) * (wb - wa)) / (b - a);
};
export const lumensToWatts: Calc = (v) => {
  const m = pick(v.mode, 2), bi = pick(v.bulb, BULBS.length);
  const eff = bi === BULBS.length - 1 ? num(v.eff, 90) : BULBS[bi][1];
  if (!(eff > 0)) throw new InputError("Enter an efficacy above 0 lumens per watt.");
  const x = num(v.x, 800);
  if (x < 0) throw new InputError("The value can't be negative.");
  const lm = m === 0 ? x : x * eff, w = m === 0 ? x / eff : x;
  const hours = num(v.hours, 3), price = num(v.price, 0.17);
  const kwh = (w * hours * 365) / 1000;
  const others = BULBS.slice(0, 4).map(([n, e]) => `${n} ${show(lm / e, 3)} W`).join(" · ");
  return {
    result: m === 0 ? `${show(w, 3)} W` : `${nfmt(Math.round(lm))} lumens`,
    lumens: `${nfmt(Math.round(lm))} lm`,
    watts: `${show(w, 3)} W (${BULBS[bi][0].split(" (")[0]}, ${show(eff, 3)} lm/W)`,
    incandescent: `≈ ${Math.round(incEq(lm))} W incandescent equivalent`,
    others,
    yearly: `${show(kwh, 3)} kWh a year ≈ $${(kwh * price).toFixed(2)} at ${hours} h/day`,
  };
};

export const mixConvCustomCalculators: Record<string, Calc> = {
  "height-converter-calculator": heightConverter,
  "feet-and-inches-calculator": feetAndInches,
  "torque-conversion-calculator": torqueConversion,
  "gallons-to-pounds-calculator": gallonsToPounds,
  "cubic-yards-to-tons-calculator": cubicYardsToTons,
  "lumens-to-watts-calculator": lumensToWatts,
};
