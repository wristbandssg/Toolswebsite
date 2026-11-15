/**
 * Batch: General keyword check (15 Nov 2026) — 6 science/statistics tools: unit converter
 * (Science > Math), speed-distance-time (Physics), average, weighted average and dice probability
 * (Statistics & Probability), relative humidity (Earth, Weather & Environment).
 *
 * Near-namesakes kept apart on purpose:
 *  - unit-converter = many units in one place. kelvin-fahrenheit-converter, currency-converter and
 *    the single-pair converters (existing) stay as they are.
 *  - average-calculator = the plain mean of a list. mean-median-mode and descriptive-statistics
 *    (existing) give fuller statistics; weighted-average = Σwx/Σw for any data, and weighted-grade
 *    (existing) is school-only.
 *  - dice-probability = sums of N dice. coin-flip-probability (existing) = coins.
 *  - relative-humidity = RH ↔ dew point. dew-point and heat-index (existing) stay separate.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig } from "./trv-core";

const show = (x: number, s = 10) => {
  if (!Number.isFinite(x)) return "—";
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return nfmt(x);
  if (Math.abs(x) >= 1e15 || (Math.abs(x) < 1e-6 && x !== 0)) return x.toExponential(Math.min(s, 10) - 1).replace(/\.?0+e/, "e");
  return nfmt(Number(x.toPrecision(s)), 10).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};
function numbers(s: string, label: string, min = 1) {
  const items = s.split(/[\s,;\n\t]+/).map((t) => t.trim()).filter(Boolean);
  const out = items.map((t) => { const n = Number(t); if (!Number.isFinite(n)) throw new InputError(`${label}: "${t}" isn't a number.`); return n; });
  if (out.length < min) throw new InputError(`${label}: enter at least ${min} number${min > 1 ? "s" : ""}, separated by commas or spaces.`);
  return out;
}

// ------------------------------------------------------------------ unit converter
type U = [label: string, toBase: number | ((x: number) => number), fromBase?: (x: number) => number];
const GROUPS: [string, string, U[]][] = [
  ["Length", "m", [["Millimetre (mm)", 0.001], ["Centimetre (cm)", 0.01], ["Metre (m)", 1], ["Kilometre (km)", 1000], ["Inch (in)", 0.0254], ["Foot (ft)", 0.3048], ["Yard (yd)", 0.9144], ["Mile (mi)", 1609.344], ["Nautical mile (nmi)", 1852]]],
  ["Weight / mass", "kg", [["Milligram (mg)", 1e-6], ["Gram (g)", 0.001], ["Kilogram (kg)", 1], ["Metric tonne (t)", 1000], ["Ounce (oz)", 0.028349523125], ["Pound (lb)", 0.45359237], ["Stone (st)", 6.35029318], ["US short ton", 907.18474], ["UK long ton", 1016.0469088]]],
  ["Volume", "L", [["Millilitre (mL)", 0.001], ["Litre (L)", 1], ["Cubic metre (m³)", 1000], ["Teaspoon (US tsp)", 0.00492892159375], ["Tablespoon (US tbsp)", 0.01478676478125], ["Fluid ounce (US fl oz)", 0.0295735295625], ["Cup (US, 8 fl oz)", 0.2365882365], ["Pint (US)", 0.473176473], ["Quart (US)", 0.946352946], ["Gallon (US)", 3.785411784], ["Gallon (UK)", 4.54609], ["Cubic inch (in³)", 0.016387064], ["Cubic foot (ft³)", 28.316846592], ["Cubic yard (yd³)", 764.554857984]]],
  ["Area", "m²", [["Square millimetre (mm²)", 1e-6], ["Square centimetre (cm²)", 1e-4], ["Square metre (m²)", 1], ["Hectare (ha)", 10000], ["Square kilometre (km²)", 1e6], ["Square inch (in²)", 0.00064516], ["Square foot (ft²)", 0.09290304], ["Square yard (yd²)", 0.83612736], ["Acre", 4046.8564224], ["Square mile (mi²)", 2589988.110336]]],
  ["Temperature", "°C", [["Celsius (°C)", (x) => x, (x) => x], ["Fahrenheit (°F)", (x) => ((x - 32) * 5) / 9, (x) => (x * 9) / 5 + 32], ["Kelvin (K)", (x) => x - 273.15, (x) => x + 273.15], ["Rankine (°R)", (x) => ((x - 491.67) * 5) / 9, (x) => ((x + 273.15) * 9) / 5]]],
  ["Speed", "m/s", [["Metres per second (m/s)", 1], ["Kilometres per hour (km/h)", 1 / 3.6], ["Miles per hour (mph)", 0.44704], ["Feet per second (ft/s)", 0.3048], ["Knot (kn)", 1852 / 3600]]],
  ["Time", "s", [["Second", 1], ["Minute", 60], ["Hour", 3600], ["Day", 86400], ["Week", 604800], ["Month (avg, 30.437 d)", 2629746], ["Year (365.25 d)", 31557600]]],
  ["Digital storage", "B", [["Bit", 0.125], ["Byte (B)", 1], ["Kilobyte (kB, 1000 B)", 1e3], ["Megabyte (MB)", 1e6], ["Gigabyte (GB)", 1e9], ["Terabyte (TB)", 1e12], ["Kibibyte (KiB, 1024 B)", 1024], ["Mebibyte (MiB)", 1048576], ["Gibibyte (GiB)", 1073741824]]],
  ["Energy", "J", [["Joule (J)", 1], ["Kilojoule (kJ)", 1000], ["Calorie (cal)", 4.184], ["Kilocalorie (kcal / food Calorie)", 4184], ["Watt-hour (Wh)", 3600], ["Kilowatt-hour (kWh)", 3.6e6], ["BTU", 1055.05585262]]],
  ["Pressure", "Pa", [["Pascal (Pa)", 1], ["Kilopascal (kPa)", 1000], ["Bar", 100000], ["PSI (lb/in²)", 6894.757293168], ["Atmosphere (atm)", 101325], ["mmHg (torr)", 133.322387415], ["inHg", 3386.389]]],
];
export const UNIT_OPTIONS = GROUPS.flatMap(([g, , us]) => us.map((u) => `${g} — ${u[0]}`));
const FLAT = GROUPS.flatMap(([g, base, us], gi) => us.map((u) => ({ g, gi, base, u })));
const toBase = (u: U, x: number) => (typeof u[1] === "number" ? x * u[1] : u[1](x));
const fromBase = (u: U, x: number) => (typeof u[1] === "number" ? x / u[1] : u[2]!(x));
export const unitConverter: Calc = (v) => {
  const x = num(v.x, 1), f = FLAT[pick(v.from, FLAT.length)], t = FLAT[pick(v.to, FLAT.length)];
  if (f.gi !== t.gi) throw new InputError(`You can't convert ${f.g.toLowerCase()} to ${t.g.toLowerCase()} — pick two units from the same group.`);
  if (f.g === "Temperature" && toBase(f.u, x) < -273.15 - 1e-9) throw new InputError("That's below absolute zero (−273.15 °C).");
  const b = toBase(f.u, x), r = fromBase(t.u, b);
  const all = GROUPS[f.gi][2].map((u) => `${show(fromBase(u, b), 8)} ${u[0]}`).join("\n");
  const factor = typeof f.u[1] === "number" && typeof t.u[1] === "number" ? `1 ${f.u[0].split(" (")[0].toLowerCase()} = ${show(f.u[1] / t.u[1], 10)} ${t.u[0].split(" (")[0].toLowerCase()}` : "Temperature scales use offsets, not a single factor";
  return { result: `${show(x, 12)} ${f.u[0]} = ${show(r, 10)} ${t.u[0]}`, value: sig(r, 12), factor, group: f.g, all };
};

// ------------------------------------------------------------------ speed, distance, time
export const SDT_SOLVE = ["Speed (from distance & time)", "Distance (from speed & time)", "Time (from distance & speed)"];
export const SDT_DIST = ["Miles", "Kilometres", "Metres", "Feet", "Nautical miles"];
const DIST_M = [1609.344, 1000, 1, 0.3048, 1852];
export const SDT_SPEED = ["mph", "km/h", "m/s", "ft/s", "knots"];
const SPEED_MS = [0.44704, 1 / 3.6, 1, 0.3048, 1852 / 3600];
function parseHours(s: string) {
  const t = s.trim();
  if (/^\d+(:\d{1,2}){1,2}$/.test(t)) { const p = t.split(":").map(Number); return p.length === 3 ? p[0] + p[1] / 60 + p[2] / 3600 : p[0] + p[1] / 60; }
  if (/[hms]/i.test(t)) {
    const h = t.match(/(\d+(?:\.\d+)?)\s*h/i), m = t.match(/(\d+(?:\.\d+)?)\s*m(?!s)/i), sx = t.match(/(\d+(?:\.\d+)?)\s*s/i);
    if (!h && !m && !sx) throw new InputError(`"${s}" isn't a time.`);
    return (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0) + (sx ? Number(sx[1]) / 3600 : 0);
  }
  const n = Number(t);
  if (!Number.isFinite(n)) throw new InputError(`"${s}" isn't a time — use 1:30:00, 2h 15m or 1.5 (hours).`);
  return n;
}
const hms = (h: number) => { const s = Math.round(h * 3600); return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const paceTxt = (secPer: number) => { const s = Math.round(secPer); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const speedDistanceTime: Calc = (v) => {
  const m = pick(v.solve, 3), du = pick(v.dunit, 5), su = pick(v.sunit, 5);
  let dM: number, hrs: number, ms: number;
  if (m === 0) { dM = num(v.d, 0) * DIST_M[du]; hrs = parseHours(txt(v, "t")); if (!(hrs > 0)) throw new InputError("Time must be more than 0."); ms = dM / (hrs * 3600); }
  else if (m === 1) { ms = num(v.s, 0) * SPEED_MS[su]; hrs = parseHours(txt(v, "t")); dM = ms * hrs * 3600; }
  else { dM = num(v.d, 0) * DIST_M[du]; ms = num(v.s, 0) * SPEED_MS[su]; if (!(ms > 0)) throw new InputError("Speed must be more than 0."); hrs = dM / ms / 3600; }
  if (dM < 0 || ms < 0) throw new InputError("Use positive values.");
  const result = m === 0 ? `${show(ms / SPEED_MS[su], 8)} ${SDT_SPEED[su]}` : m === 1 ? `${show(dM / DIST_M[du], 8)} ${SDT_DIST[du].toLowerCase()}` : `${hms(hrs)} (h:mm:ss)`;
  return {
    result, speed: `${show(ms * 2.2369362921, 6)} mph = ${show(ms * 3.6, 6)} km/h = ${show(ms, 6)} m/s`,
    distance: `${show(dM / 1609.344, 6)} mi = ${show(dM / 1000, 6)} km`, time: `${hms(hrs)} = ${show(hrs, 6)} hours = ${show(hrs * 60, 6)} minutes`,
    pace: ms > 0 ? `${paceTxt(1609.344 / ms)} per mile, ${paceTxt(1000 / ms)} per km` : "—", formula: ["speed = distance ÷ time", "distance = speed × time", "time = distance ÷ speed"][m],
  };
};

// ------------------------------------------------------------------ average
export const average: Calc = (v) => {
  const xs = numbers(txt(v, "list"), "Numbers");
  const n = xs.length, sum = xs.reduce((a, b) => a + b, 0), mean = sum / n;
  const s = [...xs].sort((a, b) => a - b);
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  const cnt = new Map<number, number>(); for (const x of xs) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  const top = Math.max(...cnt.values());
  const modes = top === 1 ? "No mode (every value appears once)" : [...cnt].filter(([, c]) => c === top).map(([x]) => show(x)).join(", ") + ` (appears ${top}×)`;
  const allPos = xs.every((x) => x > 0);
  return {
    mean: sig(mean, 12), sum: sig(sum, 12), count: n, median: sig(median, 12), mode: modes, range: `${show(s[n - 1] - s[0])} (min ${show(s[0])}, max ${show(s[n - 1])})`,
    others: allPos ? `Geometric mean ${show(Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / n), 8)}, harmonic mean ${show(n / xs.reduce((a, x) => a + 1 / x, 0), 8)}` : "Geometric and harmonic means need all values above 0",
    working: `(${xs.slice(0, 8).map((x) => show(x)).join(" + ")}${n > 8 ? " + …" : ""}) ÷ ${n} = ${show(mean, 10)}`,
  };
};

// ------------------------------------------------------------------ weighted average
export const weightedAverage: Calc = (v) => {
  const xs = numbers(txt(v, "values"), "Values"), ws = numbers(txt(v, "weights"), "Weights");
  if (xs.length !== ws.length) throw new InputError(`You entered ${xs.length} values but ${ws.length} weights — they must match one-to-one.`);
  if (ws.some((w) => w < 0)) throw new InputError("Weights can't be negative.");
  const W = ws.reduce((a, b) => a + b, 0);
  if (W === 0) throw new InputError("The weights add up to 0.");
  const wx = xs.reduce((a, x, i) => a + x * ws[i], 0), wa = wx / W, plain = xs.reduce((a, b) => a + b, 0) / xs.length;
  const table = xs.map((x, i) => `${show(x)} × ${show(ws[i])} = ${show(x * ws[i])}  (weight share ${show((ws[i] / W) * 100, 4)}%)`).join("\n");
  return { result: sig(wa, 12), sumW: sig(W, 12), sumWX: sig(wx, 12), plain: sig(plain, 12), diff: `${wa >= plain ? "+" : "−"}${show(Math.abs(wa - plain), 8)} vs the simple average`, table };
};

// ------------------------------------------------------------------ dice probability
export const DICE_CMP = ["Exactly the target", "At least the target", "At most the target", "More than the target", "Less than the target"];
export const diceProbability: Calc = (v) => {
  const n = Math.round(num(v.n, 2)), s = Math.round(num(v.sides, 6)), t = Math.round(num(v.target, 7)), cmp = pick(v.cmp, 5);
  if (n < 1 || n > 100) throw new InputError("Use 1 to 100 dice.");
  if (s < 2 || s > 1000) throw new InputError("A die needs 2 to 1,000 sides.");
  let dist = new Float64Array(s + 1); for (let f = 1; f <= s; f++) dist[f] = 1 / s;
  for (let k = 2; k <= n; k++) {
    const nx = new Float64Array(k * s + 1);
    for (let i = k - 1; i <= (k - 1) * s; i++) if (dist[i]) for (let f = 1; f <= s; f++) nx[i + f] += dist[i] / s;
    dist = nx;
  }
  let p = 0;
  for (let i = n; i <= n * s; i++) if ((cmp === 0 && i === t) || (cmp === 1 && i >= t) || (cmp === 2 && i <= t) || (cmp === 3 && i > t) || (cmp === 4 && i < t)) p += dist[i];
  p = Math.min(1, Math.max(0, p));
  let best = n; for (let i = n; i <= n * s; i++) if (dist[i] > dist[best] + 1e-15) best = i;
  const mean = (n * (s + 1)) / 2, sd = Math.sqrt((n * (s * s - 1)) / 12);
  const total = s ** n;
  return {
    prob: `${show(p * 100, 8)}%`, raw: sig(p, 12), odds: p > 0 ? `1 in ${show(1 / p, 6)}` : "Impossible",
    ways: Number.isFinite(total) && total < 1e15 ? `${nfmt(Math.round(p * total))} of ${nfmt(total)} equally likely outcomes` : "—",
    range: `Possible sums ${n} to ${n * s}; most likely ${best}${n * (s + 1) % 2 === 0 || n === 1 ? "" : ` and ${best + 1}`}`,
    stats: `Mean ${show(mean)}, standard deviation ${show(sd, 6)}`,
  };
};

// ------------------------------------------------------------------ relative humidity (Magnus–Alduchov–Eskridge)
export const RH_MODES = ["Relative humidity from temperature & dew point", "Dew point from temperature & relative humidity"];
export const TEMP_UNITS = ["°F", "°C"];
const A_ = 17.625, B_ = 243.04;
const es = (c: number) => 6.1094 * Math.exp((A_ * c) / (B_ + c)); // saturation vapour pressure, hPa
export const relativeHumidity: Calc = (v) => {
  const m = pick(v.mode, 2), f = pick(v.unit, 2) === 0;
  const toC = (x: number) => (f ? ((x - 32) * 5) / 9 : x), fromC = (c: number) => (f ? (c * 9) / 5 + 32 : c), U = f ? "°F" : "°C";
  const T = toC(num(v.t, 77));
  let Td: number, RH: number;
  if (m === 0) { Td = toC(num(v.td, 60)); if (Td > T + 1e-9) throw new InputError("The dew point can't be higher than the air temperature."); RH = (100 * es(Td)) / es(T); }
  else { RH = num(v.rh, 50); if (!(RH > 0 && RH <= 100)) throw new InputError("Relative humidity must be between 0 and 100%."); const g = Math.log(RH / 100) + (A_ * T) / (B_ + T); Td = (B_ * g) / (A_ - g); }
  const e = es(Td), abs = (216.7 * e) / (T + 273.15);
  const tdF = (Td * 9) / 5 + 32;
  const feel = tdF < 50 ? "Dry, comfortable" : tdF < 60 ? "Comfortable" : tdF < 65 ? "Slightly humid" : tdF < 70 ? "Humid, sticky" : tdF < 75 ? "Very humid, oppressive" : "Extremely humid, miserable";
  return { rh: `${show(RH, 4)}%`, raw: sig(RH, 6), dew: `${show(fromC(Td), 4)} ${U}`, vapor: `${show(e, 5)} hPa (saturation ${show(es(T), 5)} hPa)`, absolute: `${show(abs, 4)} g/m³`, comfort: `${feel} (dew point ${show(tdF, 3)} °F)` };
};

export const genSciCustomCalculators: Record<string, Calc> = {
  "unit-converter-calculator": unitConverter,
  "speed-distance-time-calculator": speedDistanceTime,
  "average-calculator": average,
  "weighted-average-calculator": weightedAverage,
  "dice-probability-calculator": diceProbability,
  "relative-humidity-calculator": relativeHumidity,
};
