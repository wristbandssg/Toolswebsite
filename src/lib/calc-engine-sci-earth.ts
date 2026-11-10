/**
 * Batch: "Science Calculators" → Earth, Weather & Environment (meteorology, aviation weather,
 * geology & soils, carbon footprints — 41 tools).
 *
 * Humidity: Magnus/Buck saturation vapour pressure. Heat index: NWS Rothfusz regression with the
 * Steadman low-range formula and humidity adjustments. AQI: US EPA breakpoints (2024 PM2.5
 * revision). ISA atmosphere: T = 15 − 6.5 °C/km, P = 101.325(1 − 2.25577 × 10⁻⁵h)^5.25588 kPa.
 * True airspeed via compressible pitot relations. Soil texture: USDA triangle rules. Mean kinetic
 * temperature with ΔH = 83.144 kJ/mol (USP <1079>). Earthquake energy log E = 1.5M + 4.8 (J).
 * Emission factors are typical published averages (EPA, DEFRA, IEA, Poore & Nemecek 2018) and
 * marked as estimates. See prisma/create-sci-earth-calculators.ts.
 */

import { type SciCalculator, InputError, txt, num, pos, pick, fmt, sig, listOf, sum, mean } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const RAD = Math.PI / 180, G0 = 9.80665, RE = 6371000;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check the inputs.");
  return x;
};
const es = (T: number) => 0.61121 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T))); // kPa
const isaP = (hm: number) => 101.325 * (1 - 2.25577e-5 * hm) ** 5.25588;
const FT = 0.3048;

// ---------- humidity & comfort ----------
export const DEW_MODE = ["Dew point from temperature and RH", "Relative humidity from temperature and dew point"];
export const dewPoint: SciCalculator = (v) => {
  const T = num(v.T, 25);
  if (pick(v.mode, 2) === 1) { const Td = num(v.Td, 15), rh = (100 * es(Td)) / es(T); return { Td: s(Td, 5), rh: s(Math.min(100, rh), 5), frost: "—", spread: s(T - Td, 5), comfort: comfort(Td) }; }
  const RH = Math.min(100, Math.max(0.1, pos(v.rh, 60))), g = Math.log((RH / 100) * es(T) / 0.61121), Td = (257.14 * g) / (18.678 - g);
  const fp = Td < 0 ? (272.62 * Math.log((RH / 100) * es(T) / 0.61115)) / (22.46 - Math.log((RH / 100) * es(T) / 0.61115)) : NaN;
  return { Td: s(Td, 5), rh: s(RH, 5), frost: Number.isFinite(fp) ? s(fp, 5) : "above freezing", spread: s(T - Td, 5), comfort: comfort(Td) };
};
const comfort = (Td: number) => (Td < 10 ? "Dry" : Td < 16 ? "Comfortable" : Td < 18 ? "Slightly humid" : Td < 21 ? "Humid" : Td < 24 ? "Very humid, uncomfortable" : "Oppressive");
export const TEMP_UNIT = ["°C", "°F"];
export const heatIndex: SciCalculator = (v) => {
  const f = pick(v.unit, 2) === 1, T = f ? num(v.T, 95) : (num(v.T, 35) * 9) / 5 + 32, R = Math.min(100, pos(v.rh, 50));
  let HI = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094);
  if ((HI + T) / 2 >= 80) {
    HI = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    if (R > 85 && T >= 80 && T <= 87) HI += ((R - 85) / 10) * ((87 - T) / 5);
  }
  const cat = HI < 80 ? "No significant risk" : HI < 90 ? "Caution — fatigue possible" : HI < 103 ? "Extreme caution — heat cramps/exhaustion possible" : HI < 125 ? "Danger — heat exhaustion likely" : "Extreme danger — heat stroke highly likely";
  return { F: s(HI, 5), C: s(((HI - 32) * 5) / 9, 5), cat };
};
export const airDensity: SciCalculator = (v) => {
  const T = num(v.T, 15), alt = num(v.alt, 0), P = pos(v.P, 0) || isaP(alt), RH = Math.min(100, pos(v.rh, 0)) / 100, Tk = T + 273.15;
  const pv = RH * es(T), pd = P - pv, rho = (pd * 1000) / (287.058 * Tk) + (pv * 1000) / (461.495 * Tk);
  const pa = (1 - (P / 101.325) ** 0.190284) * 145366.45, da = (1 - ((rho / 1.225) ** 0.234969)) * 145442.16;
  return { rho: s(rho, 6), lbft3: s(rho * 0.062428, 6), pa: s(pa, 6), da: s(da, 6), ratio: s(100 * (rho / 1.225), 5) };
};
export const AQI_POLL = ["PM2.5 (24-h, µg/m³)", "PM10 (24-h, µg/m³)", "Ozone O₃ (8-h, ppm)", "Carbon monoxide CO (8-h, ppm)", "Sulfur dioxide SO₂ (1-h, ppb)", "Nitrogen dioxide NO₂ (1-h, ppb)"];
const AQI_BP: number[][] = [[0, 9, 35.4, 55.4, 125.4, 225.4, 325.4], [0, 54, 154, 254, 354, 424, 604], [0, 0.054, 0.07, 0.085, 0.105, 0.2, 0.604], [0, 4.4, 9.4, 12.4, 15.4, 30.4, 50.4], [0, 35, 75, 185, 304, 604, 1004], [0, 53, 100, 360, 649, 1249, 2049]];
const AQI_I = [0, 50, 100, 150, 200, 300, 500];
const AQI_CAT = ["Good", "Moderate", "Unhealthy for sensitive groups", "Unhealthy", "Very unhealthy", "Hazardous"];
export const aqi: SciCalculator = (v) => {
  const k = pick(v.poll, 6), c = pos(v.c, 35), bp = AQI_BP[k], step = k === 2 ? 0.001 : k === 3 ? 0.1 : k === 0 ? 0.1 : 1;
  if (c > bp[6]) return { aqi: 500, cat: "Beyond the AQI (hazardous)", advice: "Avoid all outdoor activity" };
  const i = Math.max(1, bp.findIndex((b, j) => j > 0 && c <= b)), lo = i === 1 ? 0 : bp[i - 1] + step, a = AQI_I[i - 1] + (i === 1 ? 0 : 1);
  const I = Math.round(((AQI_I[i] - a) / (bp[i] - lo)) * (c - lo) + a);
  const advice = ["Air quality is satisfactory", "Unusually sensitive people should reduce prolonged exertion", "Sensitive groups should reduce outdoor exertion", "Everyone should reduce prolonged outdoor exertion", "Avoid prolonged outdoor exertion", "Remain indoors; keep activity low"][i - 1];
  return { aqi: Math.max(0, I), cat: AQI_CAT[i - 1], advice };
};
export const cloudBase: SciCalculator = (v) => {
  const f = pick(v.unit, 2) === 1, T = num(v.T, f ? 77 : 25), Td = num(v.Td, f ? 59 : 15), elev = num(v.elev, 0), spread = f ? ((T - Td) * 5) / 9 : T - Td;
  if (spread < 0) throw new InputError("Dew point can't exceed the temperature.");
  const m = spread * 125;
  return { m: s(m, 5), ft: s(m / FT, 5), msl: s(m + elev, 5), mslft: s((m + elev) / FT, 5) };
};

// ---------- wind & aviation ----------
export const crosswind: SciCalculator = (v) => {
  const ws = pos(v.ws, 15), wd = num(v.wd, 300), rwy = num(v.rwy, 270), g = pos(v.gust, 0), ang = ((wd - rwy) * RAD);
  const xw = ws * Math.sin(ang), hw = ws * Math.cos(ang);
  return { xw: s(Math.abs(xw), 5), side: xw > 0.0001 ? "from the right" : xw < -0.0001 ? "from the left" : "none", hw: s(Math.abs(hw), 5), type: hw >= 0 ? "Headwind" : "Tailwind", gust: g ? s(Math.abs(g * Math.sin(ang)), 5) : "—", angle: s(((wd - rwy + 540) % 360) - 180, 5) };
};
export const trueAirspeed: SciCalculator = (v) => {
  const cas = pos(v.cas, 120) * 0.514444, h = num(v.pa, 8000) * FT, oat = num(v.oat, 0) + 273.15, P0 = 101325, a0 = 340.294;
  const qc = P0 * ((1 + 0.2 * (cas / a0) ** 2) ** 3.5 - 1), P = isaP(h) * 1000, M = Math.sqrt(5 * ((qc / P + 1) ** (2 / 7) - 1)), a = Math.sqrt(1.4 * 287.053 * oat), tas = M * a;
  const isaT = 288.15 - 0.0065 * h, da = h / FT + 118.8 * (oat - isaT);
  return { tas: s(tas / 0.514444, 6), kmh: s(tas * 3.6, 6), mach: s(M, 5), da: s(da, 5), rule: s((cas / 0.514444) * (1 + 0.02 * (h / FT / 1000)), 5) };
};
export const windCorrection: SciCalculator = (v) => {
  const tas = pos(v.tas, 120), crs = num(v.crs, 90), wd = num(v.wd, 30), ws = pos(v.ws, 20), dist = pos(v.dist, 0), d = (wd - crs) * RAD;
  const x = (ws * Math.sin(d)) / tas;
  if (Math.abs(x) > 1) throw new InputError("Crosswind exceeds true airspeed — the course can't be flown.");
  const wca = Math.asin(x), gs = tas * Math.cos(wca) - ws * Math.cos(d);
  return { wca: s(wca / RAD, 5), hdg: s(((crs + wca / RAD) % 360 + 360) % 360, 5), gs: s(gs, 6), time: dist ? s((dist / gs) * 60, 5) : "enter distance", head: s(ws * Math.cos(d), 5) };
};
export const takeoff: SciCalculator = (v) => {
  const base = pos(v.base, 1000), pa = num(v.pa, 2000), oat = num(v.oat, 25), W = pos(v.W, 2300), W0 = pos(v.W0, 2550), hw = num(v.hw, 5), vlof = pos(v.vlof, 55), surf = pick(v.surf, 4), slope = num(v.slope, 0);
  const isaT = 15 - 1.98 * (pa / 1000), da = pa + 118.8 * (oat - isaT), fDa = 1 + 0.12 * Math.max(0, da) / 1000, fW = (W / W0) ** 2, fWind = Math.max(0.3, (1 - hw / vlof) ** 2), fS = [1, 1.15, 1.3, 1.25][surf], fSl = 1 + 0.1 * slope;
  const d = base * fDa * fW * fWind * fS * fSl;
  return { d: s(d, 5), m: s(d * FT, 5), da: s(da, 5), factor: s(d / base, 4), safe: s(d * 1.5, 5) };
};
export const SURFACES = ["Paved, dry", "Dry short grass (+15%)", "Wet grass (+30%)", "Soft / long grass (+25%)"];
export const stallSpeed: SciCalculator = (v) => {
  const vs = pos(v.vs, 50), Wmax = pos(v.wmax, 2550), W = pos(v.w, 2200), bank = Math.min(89, num(v.bank, 30)), nlim = pos(v.n, 3.8);
  const n = 1 / Math.cos(bank * RAD), vsw = vs * Math.sqrt(W / Wmax);
  return { vsw: s(vsw, 5), turn: s(vsw * Math.sqrt(n), 5), n: s(n, 5), va: s(vs * Math.sqrt(nlim), 5), vaw: s(vs * Math.sqrt(nlim) * Math.sqrt(W / Wmax), 5) };
};
export const TURN_MODE = ["Aircraft (speed and bank angle)", "Road vehicle (wheelbase and steering angle)"];
export const turnRadius: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) {
    const L = pos(v.wb, 2.7), a = num(v.steer, 35) * RAD, R = L / Math.sin(a), track = pos(v.track, 1.6);
    return { R: s(R, 6), ft: s(R / FT, 6), rate: s(2 * (R + track / 2), 6), bank: "—", note: "Turning circle (kerb-to-kerb) ≈ 2 × (R + half track)" };
  }
  const V = pos(v.tas, 100) * 0.514444, phi = num(v.bank, 30) * RAD, R = (V * V) / (G0 * Math.tan(phi));
  return { R: s(R, 6), ft: s(R / FT, 6), rate: s((V / R) / RAD, 5), bank: s(Math.atan(((3 * RAD) * V) / G0) / RAD, 5), note: `Rate in °/s; standard rate (3°/s) needs the bank shown` };
};
export const BEAUFORT = [[0.5, "Calm"], [1.5, "Light air"], [3.3, "Light breeze"], [5.5, "Gentle breeze"], [7.9, "Moderate breeze"], [10.7, "Fresh breeze"], [13.8, "Strong breeze"], [17.1, "Near gale"], [20.7, "Gale"], [24.4, "Strong gale"], [28.4, "Storm"], [32.6, "Violent storm"], [Infinity, "Hurricane force"]] as [number, string][];
export const WIND_UNITS = ["m/s", "km/h", "mph", "knots", "ft/s"];
const WF = [1, 1 / 3.6, 0.44704, 0.514444, 0.3048];
export const windSpeed: SciCalculator = (v) => {
  const ms = pos(v.x, 10) * WF[pick(v.unit, 5)], h1 = pos(v.h1, 10), h2 = pos(v.h2, 80), alpha = pos(v.alpha, 0.143), bf = BEAUFORT.findIndex(([lim]) => ms < lim);
  return { ms: s(ms, 6), kmh: s(ms * 3.6, 6), mph: s(ms / 0.44704, 6), kt: s(ms / 0.514444, 6), bf: `Force ${bf} — ${BEAUFORT[bf][1]}`, h2: s(ms * (h2 / h1) ** alpha, 6) };
};
export const wingCube: SciCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1, Woz = metric ? pos(v.w, 1.5) * 35.27396 : pos(v.w, 48), Aft = metric ? pos(v.a, 30) / 9.290304 : pos(v.a, 3.2);
  const wcl = Woz / Aft ** 1.5, wl = Woz / Aft;
  const cls = wcl < 4 ? "Glider / slow flyer" : wcl < 7 ? "Trainer / park flyer" : wcl < 10 ? "Sport" : wcl < 13 ? "Aerobatic / fast sport" : "Scale / warbird (fast)";
  return { wcl: s(wcl, 5), wl: s(wl, 5), cls, metric: s(wcl * 0.03, 5) };
};
export const WCL_UNIT = ["Imperial (oz, ft²)", "Metric (kg, dm²)"];
export const trueAltitude: SciCalculator = (v) => {
  const ia = num(v.ia, 8000), elev = num(v.elev, 1000), oat = num(v.oat, -10) + 273.15, isaT = 288.15 - 0.0019812 * ia;
  const ta = elev + (ia - elev) * (oat / isaT);
  return { ta: s(ta, 6), corr: s(ta - ia, 5), m: s(ta * FT, 6), isa: s(isaT - 273.15, 4) };
};
export const horizon: SciCalculator = (v) => {
  const h1 = pos(v.h1, 1.7), h2 = pos(v.h2, 0), k = pick(v.kind, 2) === 0 ? 1 : 1 / (1 - 0.13), Re = RE * k;
  const d = (h: number) => Math.sqrt(2 * Re * h + h * h);
  return { km: s((d(h1) + d(h2)) / 1000, 6), mi: s((d(h1) + d(h2)) / 1609.344, 6), nmi: s((d(h1) + d(h2)) / 1852, 6), one: s(d(h1) / 1000, 6) };
};
export const HOR_KIND = ["Geometric (no refraction)", "With standard optical refraction"];
export const earthCurvature: SciCalculator = (v) => {
  const dkm = pos(v.d, 10), h = pos(v.h, 1.7), k = pick(v.refr, 2) === 0 ? 0.13 : 0, Re = RE / (1 - k), d = dkm * 1000;
  const dh = Math.sqrt(2 * Re * h + h * h), hidden = d > dh ? Math.sqrt((d - dh) ** 2 + Re * Re) - Re : 0, drop = (d * d) / (2 * Re);
  return { hidden: s(hidden, 6), drop: s(drop, 6), horizon: s(dh / 1000, 6), ft: s(hidden / FT, 6) };
};
export const REFR = ["Standard refraction (k = 0.13)", "No refraction"];
export const lightning: SciCalculator = (v) => {
  const t = pos(v.t, 6), T = num(v.T, 20), c = 331.3 * Math.sqrt(1 + T / 273.15), d = c * t;
  return { km: s(d / 1000, 5), mi: s(d / 1609.344, 5), c: s(c, 5), safe: t <= 30 ? "Within 30 s (≈ 10 km): seek shelter now — the 30-30 rule" : "Storm is farther than ~10 km — stay alert" };
};

// ---------- geography & geology ----------
export const SLOPE_MODE = ["From rise and run", "From angle (degrees)", "From percent grade"];
export const slope: SciCalculator = (v) => {
  const m = pick(v.mode, 3), run0 = pos(v.run, 100);
  const r = m === 0 ? num(v.rise, 8) / run0 : m === 1 ? Math.tan(num(v.ang, 4.57) * RAD) : num(v.pct, 8) / 100;
  return { pct: s(100 * r, 6), deg: s(Math.atan(r) / RAD, 6), ratio: r ? `1 : ${fmt(1 / Math.abs(r), 5)}` : "flat", len: s(run0 * Math.sqrt(1 + r * r), 6), rise: s(run0 * r, 6) };
};
export const triangulation: SciCalculator = (v) => {
  const b = pos(v.b, 100), A = num(v.A, 60) * RAD, B = num(v.B, 70) * RAD, Cc = Math.PI - A - B;
  if (Cc <= 0) throw new InputError("The two angles must add up to less than 180°.");
  const da = (b * Math.sin(B)) / Math.sin(Cc), db = (b * Math.sin(A)) / Math.sin(Cc), perp = da * Math.sin(A);
  return { da: s(da, 6), db: s(db, 6), perp: s(perp, 6), C: s(Cc / RAD, 6), xy: `(${fmt(da * Math.cos(A), 6)}, ${fmt(perp, 6)}) from point A` };
};
export const DIP_MODE = ["Apparent dip from true dip", "Plate motion rate from distance and age"];
export const apparentDip: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) { const d = pos(v.dist, 500), age = pos(v.age, 10); const r = (d * 1e5) / (age * 1e6); return { result: s(r, 6), unit: "cm/yr", alt: `${fmt(r * 10, 5)} mm/yr = ${fmt(r / 100, 5)} m/yr` }; }
  const td = num(v.dip, 40) * RAD, b = num(v.beta, 30) * RAD, ad = Math.atan(Math.tan(td) * Math.sin(b));
  return { result: s(ad / RAD, 6), unit: "° apparent dip", alt: `in a section ${fmt(b / RAD)}° from strike (true dip ${fmt(td / RAD)}°)` };
};
export const geoid: SciCalculator = (v) => {
  const k = pick(v.solve, 3), h = num(v.h, 120), H = num(v.H, 150), N = num(v.N, -30);
  const x = k === 0 ? h - N : k === 1 ? H + N : h - H;
  return { result: s(x, 8), H: s(k === 0 ? x : H, 8), h: s(k === 1 ? x : h, 8), N: s(k === 2 ? x : N, 8) };
};
export const GEOID_SOLVE = ["Orthometric height H (MSL) = h − N", "Ellipsoidal height h (GPS) = H + N", "Geoid undulation N = h − H"];
export const quake: SciCalculator = (v) => {
  const m = pick(v.mode, 3);
  if (m === 1) { const a = num(v.m1, 7), b = num(v.m2, 6), d = a - b; return { E: s(10 ** (1.5 * d), 6), tnt: s(10 ** d, 6), mag: s(d, 4), note: "Energy ratio (×) and ground amplitude ratio (×) between the two" }; }
  const M = m === 2 ? Math.log10(pos(v.amp, 10)) + 3 * Math.log10(8 * pos(v.dt, 20)) - 2.92 : num(v.M, 6.5), E = 10 ** (1.5 * M + 4.8);
  return { E: s(E, 6), tnt: s(E / 4.184e9, 6), mag: s(M, 4), note: M < 3 ? "Minor — rarely felt" : M < 5 ? "Light — felt, little damage" : M < 6 ? "Moderate — damage to weak buildings" : M < 7 ? "Strong — destructive in populated areas" : M < 8 ? "Major — serious damage over large areas" : "Great — devastating" };
};
export const QUAKE_MODE = ["Energy from magnitude", "Compare two magnitudes", "Local magnitude from amplitude and S−P time"];
export const geomagDecl: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 0) {
    const d = num(v.decl, -1.5), tb = num(v.bearing, 90), yrs = num(v.years, 0), rate = num(v.rate, 0.1), dd = d + rate * yrs;
    return { mag: s(((tb - dd) % 360 + 360) % 360, 6), tru: s(((tb + dd) % 360 + 360) % 360, 6), decl: s(dd, 5), note: "Magnetic = true − declination (east +)" };
  }
  const lat = num(v.lat, 51.5) * RAD, lon = num(v.lon, -0.13) * RAD, pl = 80.8 * RAD, pL = -72.7 * RAD;
  const decl = Math.atan2(Math.sin(pL - lon) * Math.cos(pl), Math.cos(lat) * Math.sin(pl) - Math.sin(lat) * Math.cos(pl) * Math.cos(pL - lon)) / RAD;
  return { mag: s(decl, 5), tru: "—", decl: s(decl, 5), note: "Dipole estimate only (errors of several degrees) — use the NOAA/BGS World Magnetic Model for navigation" };
};
export const DECL_MODE = ["Convert bearings with a known declination", "Rough estimate from location (dipole model)"];

// ---------- soils ----------
export const soilTexture: SciCalculator = (v) => {
  const sa = pos(v.sand, 40), si = pos(v.silt, 40), cl = pos(v.clay, 20), t = sa + si + cl;
  if (Math.abs(t - 100) > 1) throw new InputError(`Sand + silt + clay must total 100% (now ${fmt(t)}%).`);
  let c: string;
  if (si + 1.5 * cl < 15) c = "Sand";
  else if (si + 2 * cl < 30) c = "Loamy sand";
  else if ((cl >= 7 && cl < 20 && sa > 52) || (cl < 7 && si < 50)) c = "Sandy loam";
  else if (cl >= 7 && cl < 27 && si >= 28 && si < 50 && sa <= 52) c = "Loam";
  else if ((si >= 50 && cl >= 12 && cl < 27) || (si >= 50 && si < 80 && cl < 12)) c = "Silt loam";
  else if (si >= 80 && cl < 12) c = "Silt";
  else if (cl >= 20 && cl < 35 && si < 28 && sa > 45) c = "Sandy clay loam";
  else if (cl >= 27 && cl < 40 && sa > 20 && sa <= 45) c = "Clay loam";
  else if (cl >= 27 && cl < 40 && sa <= 20) c = "Silty clay loam";
  else if (cl >= 35 && sa > 45) c = "Sandy clay";
  else if (cl >= 40 && si >= 40) c = "Silty clay";
  else c = "Clay";
  const drain = /Sand|sand/.test(c) && !/clay/i.test(c) ? "Fast drainage, low water holding" : /Clay|clay/.test(c) ? "Slow drainage, high water holding" : "Moderate drainage — good for most crops";
  return { cls: c, drain, check: `${fmt(sa)}% sand, ${fmt(si)}% silt, ${fmt(cl)}% clay` };
};
export const soilMoisture: SciCalculator = (v) => {
  const wet = pos(v.wet, 150), dry = pos(v.dry, 120), bd = pos(v.bd, 1.4), pd = pos(v.pd, 2.65);
  if (dry >= wet) throw new InputError("Wet mass must exceed dry mass.");
  const g = (wet - dry) / dry, vol = g * bd, por = 1 - bd / pd;
  return { grav: s(100 * g, 6), vol: s(100 * vol, 6), sat: s((100 * vol) / por, 5), por: s(100 * por, 5), wetBasis: s((100 * (wet - dry)) / wet, 6) };
};
export const bulkDensity: SciCalculator = (v) => {
  const m = pos(v.m, 280), V = pos(v.V, 200), mc = pos(v.mc, 0) / 100, pd = pos(v.pd, 2.65), bd = m / (1 + mc) / V;
  return { bd: s(fin(bd), 6), kgm3: s(bd * 1000, 6), por: s(100 * (1 - bd / pd), 5), rating: bd < 1.1 ? "Loose / high organic matter" : bd < 1.6 ? "Typical — roots grow well" : "Compacted — may restrict roots" };
};
export const angleRepose: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) { const r = pos(v.r, 2), a = num(v.ang, 35) * RAD, h = r * Math.tan(a); return { ang: s(a / RAD, 6), h: s(h, 6), V: s((Math.PI * r * r * h) / 3, 6), note: "Conical pile at the angle of repose" }; }
  const h = pos(v.h, 1.4), r = pos(v.r, 2), a = Math.atan(h / r);
  return { ang: s(a / RAD, 6), h: s(h, 6), V: s((Math.PI * r * r * h) / 3, 6), note: a / RAD < 25 ? "Very free-flowing" : a / RAD < 35 ? "Free-flowing" : a / RAD < 45 ? "Fair flow" : "Cohesive / poor flow" };
};
export const REPOSE_MODE = ["Angle from pile height and radius", "Pile height & volume from angle and radius"];
export const percolation: SciCalculator = (v) => {
  const drops = txt(v, "drops") ? listOf(v, "drops", 1) : [pos(v.drop, 0.5)], interval = pos(v.int, 30), metric = pick(v.unit, 2) === 1;
  const last = drops[drops.length - 1] / (metric ? 2.54 : 1);
  if (!last) throw new InputError("The final drop must be above zero.");
  const mpi = interval / last;
  return { mpi: s(mpi, 5), mpcm: s(interval / (last * 2.54), 5), rate: s(60 / mpi, 5), ok: mpi < 1 ? "Too fast — poor treatment (may need sand filter)" : mpi <= 60 ? "Usually acceptable for a conventional septic drain field" : mpi <= 120 ? "Slow — special design (mound) may be needed" : "Too slow for a drain field" };
};
export const PERC_UNIT = ["Inches", "Centimetres"];

// ---------- temperature & quality ----------
export const TEMP_SCALES = ["Kelvin (K)", "Fahrenheit (°F)", "Celsius (°C)", "Rankine (°R)"];
export const tempConvert: SciCalculator = (v) => {
  const k = pick(v.from, 4), x = num(v.x, 300), K = k === 0 ? x : k === 1 ? ((x - 32) * 5) / 9 + 273.15 : k === 2 ? x + 273.15 : (x * 5) / 9;
  if (K < 0) throw new InputError("Below absolute zero.");
  return { K: s(K, 10), F: s(((K - 273.15) * 9) / 5 + 32, 10), C: s(K - 273.15, 10), R: s((K * 9) / 5, 10) };
};
export const mkt: SciCalculator = (v) => {
  const T = listOf(v, "temps", 1).map((t) => t + 273.15), dH = pos(v.dH, 83.144) * 1000, R = 8.314462618;
  const m = (dH / R) / -Math.log(mean(T.map((t) => Math.exp(-dH / (R * t)))));
  return { mkt: s(m - 273.15, 6), mean: s(mean(T) - 273.15, 6), max: s(Math.max(...T) - 273.15, 5), n: T.length };
};
const pgGrade = (hi: number, lo: number) => { const H = [46, 52, 58, 64, 70, 76, 82].find((g) => g >= hi) ?? 88, L = [10, 16, 22, 28, 34, 40, 46].find((g) => -g <= lo) ?? 52; return `PG ${H}-${L}`; };
export const pavementTemp: SciCalculator = (v) => {
  const Ta = num(v.tmax, 35), lat = num(v.lat, 30), d = pos(v.d, 0.8), tmin = num(v.tmin, -10);
  const T20 = (Ta - 0.00618 * lat * lat + 0.2289 * lat + 42.2) * 0.9545 - 17.78, Td = T20 * (1 - 0.063 * d + 0.007 * d * d - 0.0004 * d ** 3);
  return { T20: s(T20, 5), Td: s(Td, 5), F: s((Td * 9) / 5 + 32, 5), low: s(0.859 * tmin + 1.7, 5), pg: pgGrade(T20, 0.859 * tmin + 1.7) };
};
export const gsd: SciCalculator = (v) => {
  const sw = pos(v.sw, 13.2), f = pos(v.f, 8.8), H = pos(v.H, 100), iw = pos(v.iw, 5472), ih = pos(v.ih, 3648);
  const g = (sw * H * 100) / (f * iw);
  return { gsd: s(g, 6), w: s((g * iw) / 100, 6), h: s((g * ih) / 100, 6), area: s((((g * iw) / 100) * ((g * ih) / 100)) / 10000, 6) };
};
export const eui: SciCalculator = (v) => {
  const el = pos(v.el, 200000), gas = pos(v.gas, 150000), other = pos(v.other, 0), A = pos(v.A, 1500), ft = pick(v.unit, 2) === 1, Am2 = ft ? A * 0.09290304 : A;
  const site = el + gas + other, src = el * 2.8 + gas * 1.05 + other;
  return { kwhm2: s(site / Am2, 6), kbtu: s((site * 3.412) / (Am2 / 0.09290304), 6), source: s(src / Am2, 6), co2: s((el * 0.37 + gas * 0.184) / Am2, 6), cmp: site / Am2 < 100 ? "Low (efficient)" : site / Am2 < 250 ? "Typical for offices/retail" : "High — audit recommended" };
};
export const AREA_UNIT = ["m²", "ft²"];

// ---------- carbon footprints ----------
const GRID: [string, number][] = [["World average", 0.48], ["United States", 0.37], ["United Kingdom", 0.21], ["European Union", 0.25], ["Canada", 0.12], ["Australia", 0.62], ["India", 0.71], ["China", 0.58], ["Bangladesh", 0.55], ["Malaysia", 0.58], ["Singapore", 0.41], ["France", 0.06], ["Germany", 0.38], ["Custom factor", 0]];
export const GRIDS = GRID.map((g) => `${g[0]}${g[1] ? ` (${g[1]} kg/kWh)` : ""}`);
const gridF = (v: { [k: string]: number | undefined }) => { const k = pick(v.grid, GRID.length); return k === GRID.length - 1 ? pos(v.gf, 0.4) : GRID[k][1]; };
export const DIETS = ["Meat-heavy", "Average omnivore", "Low meat", "Vegetarian", "Vegan"];
const DIET_T = [3.3, 2.5, 1.9, 1.7, 1.5];
export const carbonFootprint: SciCalculator = (v) => {
  const n = Math.max(1, Math.round(pos(v.people, 2))), el = pos(v.kwh, 4000) * gridF(v), gas = pos(v.gas, 500) * 2.02, car = pos(v.km, 12000) * 0.17, fl = pos(v.fh, 10) * 90, diet = DIET_T[pick(v.diet, 5)] * 1000 * n, goods = pos(v.spend, 3000) * 0.3;
  const total = (el + gas + car + fl + diet + goods) / 1000;
  return { total: s(total, 6), per: s(total / n, 6), parts: `home electricity ${fmt(el / 1000, 4)} t, heating gas ${fmt(gas / 1000, 4)} t, car ${fmt(car / 1000, 4)} t, flights ${fmt(fl / 1000, 4)} t, food ${fmt(diet / 1000, 4)} t, goods ${fmt(goods / 1000, 4)} t`, cmp: `World average ≈ 4.7 t per person; 1.5 °C target ≈ 2.3 t by 2030 — you are ${fmt((total / n / 4.7) * 100, 4)}% of the average` };
};
export const ecoFootprint: SciCalculator = (v) => {
  const food = [1.6, 1.2, 1.0, 0.8, 0.6][pick(v.diet, 5)], home = pos(v.area, 40) * 0.008, energy = pos(v.kwh, 3000) * 0.00025, car = pos(v.km, 10000) * 0.00015, fl = pos(v.fh, 8) * 0.012, goods = [0.3, 0.6, 1.0][pick(v.goods, 3)], gha = 0.5 + food + home + energy + car + fl + goods;
  return { gha: s(gha, 5), earths: s(gha / 1.6, 4), parts: `food ${fmt(food, 3)}, housing ${fmt(home + energy, 3)}, transport ${fmt(car + fl, 3)}, goods ${fmt(goods, 3)}, shared services 0.5 gha`, day: gha > 1.6 ? `Overshoot — if everyone lived like you, resources for the year would run out around day ${Math.round((365 * 1.6) / gha)}` : "Within Earth's biocapacity" };
};
export const GOODS = ["Low consumption", "Average", "High consumption"];
const GAS_GWP: [string, number][] = [["CO₂", 1], ["Methane CH₄ (fossil)", 29.8], ["Methane CH₄ (biogenic)", 27], ["Nitrous oxide N₂O", 273], ["HFC-134a", 1530], ["HFC-32", 771], ["R-410A blend", 2256], ["Sulfur hexafluoride SF₆", 25200], ["Nitrogen trifluoride NF₃", 17400]];
export const GHG_GASES = GAS_GWP.map((g) => g[0]);
export const ghgEquiv: SciCalculator = (v) => {
  const k = pick(v.gas, GAS_GWP.length), kg = pos(v.kg, 1000), t = (kg * GAS_GWP[k][1]) / 1000;
  return { t: s(t, 8), gwp: GAS_GWP[k][1], equiv: `≈ ${fmt(t / 4.6, 4)} cars driven for a year; ${fmt((t * 1000) / 8.887, 5)} US gallons of petrol; ${fmt(t / 0.06, 5)} tree seedlings grown 10 years; ${fmt(t / 5.1, 4)} homes' electricity for a year`, note: "GWP100 values from IPCC AR6" };
};
const FOOD: [string, number][] = [["Beef", 99.5], ["Lamb", 39.7], ["Cheese", 23.9], ["Pork", 12.3], ["Poultry", 9.9], ["Farmed fish", 13.6], ["Eggs", 4.7], ["Milk (L)", 3.2], ["Rice", 4.5], ["Tofu", 3.2], ["Bread / wheat", 1.6], ["Vegetables", 0.5], ["Fruit", 0.9], ["Nuts", 0.4]];
export const FOOD_LIST = FOOD.map((f) => f[0]).join(", ");
export const foodCarbon: SciCalculator = (v) => {
  const q = txt(v, "amounts") ? listOf(v, "amounts", 1) : [];
  if (q.length > FOOD.length) throw new InputError(`Enter up to ${FOOD.length} amounts, in the order listed.`);
  const per = q.map((x, i) => x * FOOD[i][1]), week = sum(per);
  const top = per.map((x, i) => [FOOD[i][0], x] as [string, number]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { year: s((week * 52) / 1000, 6), week: s(week, 6), top: top.map(([n, x]) => `${n}: ${fmt(x * 52, 5)} kg CO₂e/yr`).join("\n") || "enter amounts", tip: top.length && top[0][0] === "Beef" ? "Swapping beef for poultry or beans cuts the biggest item by 80–95%" : "Plant-based foods are usually the lowest-carbon choice" };
};
export const offset: SciCalculator = (v) => {
  const t = pos(v.t, 10), price = pos(v.price, 15), grid = gridF(v), yieldK = pos(v.yield, 1300);
  return { trees: Math.ceil((t * 1000) / 22), cost: s(t * price, 6), ha: s(t / 10, 6), solar: s((t * 1000) / (grid * yieldK), 6) };
};
export const FUELS = ["Petrol / gasoline (2.31 kg/L)", "Diesel (2.68 kg/L)", "LPG (1.51 kg/L)", "Electric (kWh/100 km × grid)"];
const FUEL_K = [2.31, 2.68, 1.51];
export const ECON_UNIT = ["L/100 km (or kWh/100 km)", "US mpg (or mi/kWh)"];
export const EURO = ["Euro 6 petrol (0.06 g/km NOx)", "Euro 6 diesel (0.08)", "Euro 5 diesel (0.18)", "Euro 4 diesel (0.25)", "Pre-2005 (0.5)", "Electric (0)"];
const NOX = [0.06, 0.08, 0.18, 0.25, 0.5, 0];
export const carCarbon: SciCalculator = (v) => {
  const km = pos(v.km, 15000), f = pick(v.fuel, 4), e = pos(v.econ, 7), mpg = pick(v.eunit, 2) === 1;
  const per100 = mpg ? (f === 3 ? 100 / (e * 1.609344) : 235.214583 / e) : e, kg = f === 3 ? (km / 100) * per100 * gridF(v) : (km / 100) * per100 * FUEL_K[f];
  return { kg: s(kg, 6), t: s(kg / 1000, 6), perKm: s((kg * 1000) / km, 6), nox: s((NOX[pick(v.euro, 6)] * km) / 1000, 6), fuel: s((km / 100) * per100, 6) };
};
export const CABIN = ["Economy", "Premium economy (×1.6)", "Business (×2.9)", "First (×4)"];
export const flightCarbon: SciCalculator = (v) => {
  const d = pos(v.km, 5500) * 1.08, pax = Math.max(1, Math.round(pos(v.pax, 1))), rt = pick(v.trip, 2) === 0 ? 2 : 1, cab = [1, 1.6, 2.9, 4][pick(v.cabin, 4)], rf = pick(v.rf, 2) === 0 ? 1.9 : 1;
  const f = d / 1.08 < 500 ? 0.2 : d / 1.08 < 3700 ? 0.15 : 0.14, kg = d * f * cab * rf * pax * rt;
  return { kg: s(kg, 6), t: s(kg / 1000, 6), perPax: s(kg / pax, 6), trees: Math.ceil(kg / 22), note: `${fmt(f)} kg CO₂/passenger-km ${rf > 1 ? "× 1.9 radiative forcing" : "(CO₂ only)"}; 8% route uplift` };
};
export const TRIP = ["Return trip", "One way"];
export const RF_OPT = ["Include non-CO₂ warming (×1.9)", "CO₂ only"];
export const electricityCo2: SciCalculator = (v) => {
  const kwh = pos(v.kwh, 4000), g = gridF(v), kwp = pos(v.kwp, 5), yieldK = pos(v.yield, 1300), co2 = kwh * g, gen = kwp * yieldK, embodied = kwp * 1500;
  return { kg: s(co2, 6), t: s(co2 / 1000, 6), avoided: s(gen * g, 6), payback: g ? s(embodied / (gen * g), 4) : "—", lifecycle: s((embodied / (gen * 25)) * 1000, 4) };
};

export const sciEarthCustomCalculators: Record<string, SciCalculator> = {
  "dew-point-calculator": dewPoint,
  "carbon-footprint-calculator": carbonFootprint,
  "ecological-footprint-calculator": ecoFootprint,
  "heat-index-calculator": heatIndex,
  "crosswind-calculator": crosswind,
  "air-density-calculator": airDensity,
  "earth-curvature-calculator": earthCurvature,
  "air-quality-index-calculator": aqi,
  "magnetic-declination-calculator": geomagDecl,
  "lightning-distance-calculator": lightning,
  "ghg-equivalencies-calculator": ghgEquiv,
  "true-airspeed-calculator": trueAirspeed,
  "wind-correction-angle-calculator": windCorrection,
  "ground-sampling-distance-calculator": gsd,
  "soil-texture-calculator": soilTexture,
  "takeoff-distance-calculator": takeoff,
  "horizon-distance-calculator": horizon,
  "wind-speed-calculator": windSpeed,
  "food-carbon-footprint-calculator": foodCarbon,
  "carbon-offset-calculator": offset,
  "wing-cube-loading-calculator": wingCube,
  "angle-of-repose-calculator": angleRepose,
  "car-carbon-footprint-calculator": carCarbon,
  "flight-carbon-footprint-calculator": flightCarbon,
  "slope-percentage-calculator": slope,
  "electricity-co2-calculator": electricityCo2,
  "soil-moisture-calculator": soilMoisture,
  "earthquake-magnitude-calculator": quake,
  "bulk-density-calculator": bulkDensity,
  "cloud-base-calculator": cloudBase,
  "mean-kinetic-temperature-calculator": mkt,
  "turn-radius-calculator": turnRadius,
  "geoid-height-calculator": geoid,
  "stall-speed-calculator": stallSpeed,
  "triangulation-calculator": triangulation,
  "percolation-test-calculator": percolation,
  "kelvin-fahrenheit-converter": tempConvert,
  "apparent-dip-calculator": apparentDip,
  "true-altitude-calculator": trueAltitude,
  "pavement-temperature-calculator": pavementTemp,
  "energy-use-intensity-calculator": eui,
};
