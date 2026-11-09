/**
 * Batch: "Science Calculators" → Astronomy & Space (20 tools).
 *
 * Sun position, sunrise/sunset, twilight and shadows: NOAA General Solar Position equations
 * (fractional-year series for declination and equation of time; refraction-corrected horizon at
 * −0.833°). Moon phase from the mean synodic month 29.530588853 d referenced to the new moon of
 * 2000-01-06 18:14 UT (accurate to about ±0.5 day). Satellite sun outage: topocentric declination
 * and hour angle of a geostationary satellite compared with the Sun. Eclipses: NASA catalogue
 * dates 2026–2030. Orbits: Kepler's third law, vis-viva and Hohmann transfers. Black holes:
 * Schwarzschild radius and Hawking temperature. Impact craters: Collins, Melosh & Marcus (2005).
 * See prisma/create-sci-astro-calculators.ts.
 */

import { type SciCalculator, type Vals, InputError, txt, num, pos, pick, fmt, sig } from "./sci-math-core";

const s = (x: number, n = 10) => sig(x, n);
const RAD = Math.PI / 180, G = 6.6743e-11, C = 299792458, AU = 1.495978707e11, LY = 9.4607304725808e15, PC = 3.0856775814913673e16, MSUN = 1.98847e30, RSUN = 6.957e8, LSUN = 3.828e26, SB = 5.670374419e-8;
const fin = (x: number) => {
  if (!Number.isFinite(x)) throw new InputError("That combination has no finite answer — check the inputs.");
  return x;
};

// ---------- dates & solar geometry ----------
const parseDate = (v: Vals, key = "date", def = "2026-06-21") => {
  const t = txt(v, key) || def, m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) throw new InputError("Enter the date as YYYY-MM-DD.");
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new InputError("Invalid date.");
  return { y, mo, d };
};
const parseTime = (v: Vals, key = "time", def = "12:00") => {
  const t = txt(v, key) || def, m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new InputError("Enter the time as HH:MM (24-hour).");
  return Number(m[1]) + Number(m[2]) / 60 + (m[3] ? Number(m[3]) / 3600 : 0);
};
const doyOf = (y: number, mo: number, d: number) => Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
const solarTerms = (doy: number, hourUTC: number, y: number) => {
  const daysInYear = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365, g = ((2 * Math.PI) / daysInYear) * (doy - 1 + (hourUTC - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  return { eqt, decl };
};
export function sunPositionAt(y: number, mo: number, d: number, localHour: number, tz: number, lat: number, lon: number) {
  const doy = doyOf(y, mo, d), utc = localHour - tz, { eqt, decl } = solarTerms(doy, utc, y);
  const tst = localHour * 60 + eqt + 4 * lon - 60 * tz, ha = tst / 4 - 180, phi = lat * RAD, h = ha * RAD;
  const cz = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h), zen = Math.acos(Math.max(-1, Math.min(1, cz)));
  let elev = 90 - zen / RAD;
  if (elev > -0.575) { const te = Math.tan(elev * RAD); elev += (elev > 5 ? 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5 : 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)))) / 3600; }
  const az = (Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180 + 360) % 360;
  return { elev, az, decl: decl / RAD, eqt, tst, ha };
}
const hm = (minutes: number) => {
  if (!Number.isFinite(minutes)) return "—";
  const m = ((minutes % 1440) + 1440) % 1440, hh = Math.floor(m / 60), mm = Math.round(m - hh * 60);
  return `${String(mm === 60 ? hh + 1 : hh).padStart(2, "0")}:${String(mm === 60 ? 0 : mm).padStart(2, "0")}`;
};
/** Local clock minutes for the sun reaching elevation h0 (morning, evening) and solar noon. */
export function sunEvents(y: number, mo: number, d: number, tz: number, lat: number, lon: number, h0: number) {
  const doy = doyOf(y, mo, d);
  let noon = 720 - 4 * lon - solarTerms(doy, 12 - tz, y).eqt + 60 * tz;
  noon = 720 - 4 * lon - solarTerms(doy, noon / 60 - tz, y).eqt + 60 * tz;
  const at = (t: number) => {
    for (let i = 0; i < 3; i++) {
      const { decl } = solarTerms(doy, t / 60 - tz, y), phi = lat * RAD, cH = (Math.sin(h0 * RAD) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
      if (cH > 1 || cH < -1) return { ok: false, cH, t: NaN };
      const H = Math.acos(cH) / RAD;
      t = t < noon ? noon - 4 * H : noon + 4 * H;
    }
    return { ok: true, cH: 0, t };
  };
  const r = at(noon - 360), st = at(noon + 360);
  return { noon, rise: r.t, set: st.t, polar: !r.ok ? (r.cH > 1 ? "night" : "day") : "" };
}
const loc = (v: Vals) => ({ lat: Math.max(-90, Math.min(90, num(v.lat, 51.5))), lon: Math.max(-180, Math.min(180, num(v.lon, -0.13))), tz: num(v.tz, 0) });

export const sunPosition: SciCalculator = (v) => {
  const { y, mo, d } = parseDate(v), t = parseTime(v), { lat, lon, tz } = loc(v), p = sunPositionAt(y, mo, d, t, tz, lat, lon);
  return { elev: s(p.elev, 6), az: s(p.az, 6), decl: s(p.decl, 6), eqt: s(p.eqt, 5), tst: hm(p.tst), zen: s(90 - p.elev, 6), state: p.elev > 0 ? "Sun above the horizon" : p.elev > -6 ? "Civil twilight" : p.elev > -12 ? "Nautical twilight" : p.elev > -18 ? "Astronomical twilight" : "Night" };
};
export const sunriseSunset: SciCalculator = (v) => {
  const { y, mo, d } = parseDate(v), { lat, lon, tz } = loc(v), e = sunEvents(y, mo, d, tz, lat, lon, -0.833), civ = sunEvents(y, mo, d, tz, lat, lon, -6), nau = sunEvents(y, mo, d, tz, lat, lon, -12), ast = sunEvents(y, mo, d, tz, lat, lon, -18);
  const len = e.polar ? (e.polar === "day" ? 24 : 0) : (e.set - e.rise) / 60;
  return { rise: e.polar ? (e.polar === "day" ? "Sun doesn't set (polar day)" : "Sun doesn't rise (polar night)") : hm(e.rise), set: e.polar ? "—" : hm(e.set), noon: hm(e.noon), length: `${Math.floor(len)} h ${Math.round((len % 1) * 60)} min`, civil: civ.polar ? "—" : `${hm(civ.rise)} – ${hm(civ.set)}`, nautical: nau.polar ? "—" : `${hm(nau.rise)} – ${hm(nau.set)}`, astro: ast.polar ? "—" : `${hm(ast.rise)} – ${hm(ast.set)}` };
};
export const SHADOW_MODE = ["Sun elevation known", "From date, time and location"];
export const shadowLength: SciCalculator = (v) => {
  const h = pos(v.h, 2);
  let el: number, az: number | string = "—";
  if (pick(v.mode, 2) === 0) el = num(v.elev, 35);
  else { const { y, mo, d } = parseDate(v), t = parseTime(v), { lat, lon, tz } = loc(v), p = sunPositionAt(y, mo, d, t, tz, lat, lon); el = p.elev; az = s((p.az + 180) % 360, 5); }
  if (el <= 0) throw new InputError("The sun is below the horizon — no shadow.");
  const L = h / Math.tan(el * RAD);
  return { L: s(L, 8), ratio: s(L / h, 6), elev: s(el, 6), dir: az };
};
export const plutoTime: SciCalculator = (v) => {
  const { y, mo, d } = parseDate(v), { lat, lon, tz } = loc(v), dist = pos(v.dist, 39.5);
  const lux = 120000 / (dist * dist), h0 = lux > 400 ? -0.833 + Math.log10(400 / lux) * 3 : -0.833 - Math.log10(lux > 0 ? 400 / lux : 1) * 0.6;
  const e = sunEvents(y, mo, d, tz, lat, lon, h0);
  return { evening: e.polar ? "No Pluto time today (polar day/night)" : hm(e.set), morning: e.polar ? "—" : hm(e.rise), lux: s(lux, 5), elev: s(h0, 4) };
};

// ---------- moon & eclipses ----------
const jd = (y: number, mo: number, d: number, h = 0) => Date.UTC(y, mo - 1, d) / 86400000 + 2440587.5 + h / 24;
const SYN = 29.530588853, NEW0 = 2451550.1;
const fromJd = (j: number) => new Date((j - 2440587.5) * 86400000).toISOString().slice(0, 10);
export const moonPhase: SciCalculator = (v) => {
  const { y, mo, d } = parseDate(v, "date", "2026-11-09"), J = jd(y, mo, d, 12), age = (((J - NEW0) % SYN) + SYN) % SYN, ill = (1 - Math.cos((2 * Math.PI * age) / SYN)) / 2;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"], idx = Math.floor(((age / SYN) * 8 + 0.5)) % 8;
  const nextFull = J + ((SYN / 2 - age + SYN) % SYN), nextNew = J + (SYN - age);
  return { phase: names[idx], ill: s(100 * ill, 4), age: s(age, 4), full: fromJd(nextFull), newm: fromJd(nextNew) };
};
const ECLIPSES: [string, string, string][] = [
  ["2026-02-17", "Annular solar", "Antarctica"], ["2026-03-03", "Total lunar", "East Asia, Australia, Pacific, Americas"], ["2026-08-12", "Total solar", "Greenland, Iceland, Spain"], ["2026-08-28", "Partial lunar", "Americas, Europe, Africa"],
  ["2027-02-06", "Annular solar", "South America, Atlantic, Africa"], ["2027-02-20", "Penumbral lunar", "Americas, Europe, Africa, Asia"], ["2027-07-18", "Penumbral lunar", "Asia, Australia, Pacific"], ["2027-08-02", "Total solar", "Spain, North Africa, Egypt, Arabia"], ["2027-08-17", "Penumbral lunar", "Pacific, Americas"],
  ["2028-01-12", "Partial lunar", "Americas, Europe, Africa"], ["2028-01-26", "Annular solar", "Ecuador, Peru, Brazil, Spain, Portugal"], ["2028-07-06", "Partial lunar", "Europe, Africa, Asia, Australia"], ["2028-07-22", "Total solar", "Australia, New Zealand"], ["2028-12-31", "Total lunar", "Europe, Africa, Asia, Australia"],
  ["2029-01-14", "Partial solar", "North America"], ["2029-06-12", "Partial solar", "Arctic, Scandinavia"], ["2029-06-26", "Total lunar", "Americas, Europe, Africa"], ["2029-07-11", "Partial solar", "Southern South America"], ["2029-12-05", "Partial solar", "Southern South America, Antarctica"], ["2029-12-20", "Total lunar", "Americas, Europe, Africa, Asia"],
  ["2030-06-01", "Annular solar", "North Africa, Europe, Russia"], ["2030-06-15", "Partial lunar", "Europe, Africa, Asia, Australia"], ["2030-11-25", "Total solar", "Southern Africa, Australia"], ["2030-12-09", "Penumbral lunar", "Americas, Europe, Africa, Asia"],
];
export const ECL_KIND = ["All eclipses", "Solar eclipses only", "Lunar eclipses only"];
export const eclipses: SciCalculator = (v) => {
  const { y, mo, d } = parseDate(v, "date", "2026-11-09"), from = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, k = pick(v.kind, 3);
  const list = ECLIPSES.filter(([dt, t]) => dt >= from && (k === 0 || (k === 1 ? t.includes("solar") : t.includes("lunar")))).slice(0, 8);
  if (!list.length) return { next: "No catalogued eclipses after this date (list covers 2026–2030)", list: "—", outage: "—" };
  const lat = num(v.lat, 0), lon = num(v.lon, 0), sl = num(v.satlon, 0), bw = pos(v.bw, 0);
  let outage = "enter a satellite longitude and beamwidth for sun outage";
  if (bw) {
    const Re = 6378.137, r = 42164, phi = lat * RAD, la = lon * RAD, ls = sl * RAD;
    const dx = r * Math.cos(ls) - Re * Math.cos(phi) * Math.cos(la), dy = r * Math.sin(ls) - Re * Math.cos(phi) * Math.sin(la), dz = -Re * Math.sin(phi), dec = Math.asin(dz / Math.hypot(dx, dy, dz)) / RAD;
    const half = bw / 2 + 0.27, days: number[] = [];
    for (let dd = 1; dd <= 365; dd++) { const { decl } = solarTerms(dd, 12, y); if (Math.abs(decl / RAD - dec) <= half) days.push(dd); }
    const toDate = (dd: number) => new Date(Date.UTC(y, 0, dd)).toISOString().slice(5, 10);
    const spring = days.filter((x) => x < 183), fall = days.filter((x) => x >= 183);
    const haSat = lon - Math.atan2(dy, dx) / RAD, tstMin = 720 + 4 * ((haSat + 540) % 360 - 180), eqt = solarTerms(spring[0] ?? 80, 12, y).eqt, clock = tstMin - (eqt + 4 * lon - 60 * num(v.tz, 0));
    outage = days.length ? `Satellite declination ${fmt(dec, 4)}°. Outage windows ${y}: spring ${spring.length ? `${toDate(spring[0])} to ${toDate(spring[spring.length - 1])}` : "none"}, autumn ${fall.length ? `${toDate(fall[0])} to ${toDate(fall[fall.length - 1])}` : "none"}; daily peak near ${hm(clock)} local time` : `Satellite declination ${fmt(dec, 4)}° — no outage (outside the Sun's range)`;
  }
  return { next: `${list[0][0]} — ${list[0][1]} (${list[0][2]})`, list: list.map(([dt, t, w]) => `${dt}: ${t} — ${w}`).join("\n"), outage };
};

// ---------- orbits & gravity ----------
const BODIES: [string, number, number, number][] = [["Sun", 1.32712440018e20, 6.957e8, 274], ["Mercury", 2.2032e13, 2.4397e6, 3.7], ["Venus", 3.24859e14, 6.0518e6, 8.87], ["Earth", 3.986004418e14, 6.371e6, 9.807], ["Moon", 4.9048695e12, 1.7374e6, 1.62], ["Mars", 4.282837e13, 3.3895e6, 3.71], ["Jupiter", 1.26686534e17, 6.9911e7, 24.79], ["Saturn", 3.7931187e16, 5.8232e7, 10.44], ["Uranus", 5.793939e15, 2.5362e7, 8.69], ["Neptune", 6.836529e15, 2.4622e7, 11.15], ["Pluto", 8.71e11, 1.1883e6, 0.62]];
export const BODY_NAMES = [...BODIES.map((b) => b[0]), "Custom mass"];
const gmOf = (v: Vals, key = "body", def = 3) => { const k = pick(v[key], BODIES.length + 1); return k === BODIES.length ? { GM: G * pos(v.M, 5.972e24), R: pos(v.R, 6371) * 1000, name: "custom body" } : { GM: BODIES[k][1], R: BODIES[k][2], name: BODIES[k][0] }; };
export const ORB_MODE = ["Period from semi-major axis", "Semi-major axis from period"];
export const orbitalPeriod: SciCalculator = (v) => {
  const { GM, R, name } = gmOf(v), toA = pick(v.mode, 2) === 1;
  const a = toA ? Math.cbrt((GM * (pos(v.T, 1.5) * 3600) ** 2) / (4 * Math.PI ** 2)) : pos(v.a, 6771) * 1000;
  const T = 2 * Math.PI * Math.sqrt(a ** 3 / GM);
  return { T: s(T / 3600, 8), days: s(T / 86400, 8), a: s(a / 1000, 8), alt: s((a - R) / 1000, 8), v: s(Math.sqrt(GM / a) / 1000, 8), note: `Around ${name}` };
};
export const weightPlanets: SciCalculator = (v) => {
  const m = pos(v.m, 70), k = pick(v.body, BODIES.length), g = BODIES[k][3];
  return { here: s(m * (g / 9.807), 6), N: s(m * g, 6), table: BODIES.map(([n, , , gg]) => `${n}: ${fmt(m * (gg / 9.807), 5)} kg-equivalent (${fmt(gg)} m/s²)`).join("\n"), ratio: s(g / 9.807, 5) };
};
export const escapeVelocity: SciCalculator = (v) => {
  const { GM, R, name } = gmOf(v), r = R + pos(v.alt, 0) * 1000, ve = Math.sqrt((2 * GM) / r);
  return { ve: s(ve / 1000, 8), kmh: s(ve * 3.6, 8), orbit: s(Math.sqrt(GM / r) / 1000, 8), g: s(GM / (r * r), 6), note: `From ${name} at ${fmt((r - R) / 1000)} km altitude` };
};
export const hohmann: SciCalculator = (v) => {
  const { GM, R } = gmOf(v), alt = pick(v.ref, 2) === 0, r1 = (pos(v.r1, 400) + (alt ? R / 1000 : 0)) * 1000, r2 = (pos(v.r2, 35786) + (alt ? R / 1000 : 0)) * 1000;
  const at = (r1 + r2) / 2, v1 = Math.sqrt(GM / r1), v2 = Math.sqrt(GM / r2), vp = Math.sqrt(GM * (2 / r1 - 1 / at)), va = Math.sqrt(GM * (2 / r2 - 1 / at));
  const dv1 = Math.abs(vp - v1), dv2 = Math.abs(v2 - va), t = Math.PI * Math.sqrt(at ** 3 / GM);
  return { dv: s((dv1 + dv2) / 1000, 8), dv1: s(dv1 / 1000, 8), dv2: s(dv2 / 1000, 8), t: s(t / 3600, 8), ecc: s(Math.abs(r2 - r1) / (r1 + r2), 6) };
};
export const ORBIT_REF = ["Altitudes above the surface (km)", "Radii from the centre (km)"];
export const ROCKET_MODE = ["Δv from masses and Isp", "Propellant needed for a Δv"];
export const rocketEq: SciCalculator = (v) => {
  const isp = pos(v.isp, 311), ve = isp * 9.80665, m0 = pos(v.m0, 500000), mf = pos(v.mf, 150000);
  if (pick(v.mode, 2) === 1) { const dv = pos(v.dv, 9400), R = Math.exp(dv / ve), mfin = m0 / R; return { dv: s(dv, 8), ratio: s(R, 8), prop: s(m0 - mfin, 8), ve: s(ve, 6), frac: s(100 * (1 - 1 / R), 6) }; }
  if (mf >= m0) throw new InputError("Final mass must be less than initial mass.");
  return { dv: s(ve * Math.log(m0 / mf), 8), ratio: s(m0 / mf, 8), prop: s(m0 - mf, 8), ve: s(ve, 6), frac: s(100 * (1 - mf / m0), 6) };
};

// ---------- stars, black holes, cosmology ----------
export const BH_UNIT = ["Solar masses", "Kilograms", "Earth masses"];
export const schwarzschild: SciCalculator = (v) => {
  const u = pick(v.unit, 3), x = pos(v.m, 10), M = u === 0 ? x * MSUN : u === 1 ? x : x * 5.9722e24, rs = (2 * G * M) / (C * C);
  const hbar = 1.054571817e-34, kB = 1.380649e-23, T = (hbar * C ** 3) / (8 * Math.PI * G * M * kB), life = (5120 * Math.PI * G * G * M ** 3) / (hbar * C ** 4);
  return { rs: s(rs, 8), km: s(rs / 1000, 8), photon: s(1.5 * rs / 1000, 8), isco: s(3 * rs / 1000, 8), T: s(T, 6), life: s(life / 3.15576e7, 6), rho: s(M / ((4 / 3) * Math.PI * rs ** 3), 6) };
};
export const LUM_MODE = ["Luminosity from radius and temperature", "Temperature from peak wavelength (Wien)"];
export const luminosity: SciCalculator = (v) => {
  if (pick(v.mode, 2) === 1) { const lam = pos(v.lam, 502) * 1e-9, T = 2.897771955e-3 / lam; return { L: "—", Lsun: "—", T: s(T, 8), peak: s(lam * 1e9, 8), Mabs: "—" }; }
  const R = pos(v.R, 1) * RSUN, T = pos(v.T, 5772), L = 4 * Math.PI * R * R * SB * T ** 4;
  return { L: s(L, 8), Lsun: s(L / LSUN, 8), T: s(T, 8), peak: s((2.897771955e-3 / T) * 1e9, 8), Mabs: s(4.74 - 2.5 * Math.log10(L / LSUN), 6) };
};
export const telescope: SciCalculator = (v) => {
  const D = pos(v.D, 200), F = pos(v.F, 1000), fe = pos(v.fe, 25), afov = pos(v.afov, 52), sw = pos(v.sw, 23.5), sh = pos(v.sh, 15.6), M = F / fe;
  return { ratio: `f/${fmt(F / D, 4)}`, M: s(M, 6), tfov: s(afov / M, 6), exit: s(D / M, 6), maxM: s(2 * D, 5), lim: s(7.7 + 5 * Math.log10(D / 10), 4), dawes: s(116 / D, 5), cam: `${fmt((3438 * sw) / F, 5)}′ × ${fmt((3438 * sh) / F, 5)}′ (${fmt((206.265 * (sw / 6000)) / (F / 1000) * 1, 4)}″ per 6 µm pixel)` };
};
export const solarScale: SciCalculator = (v) => {
  const sunCm = pos(v.sun, 100), k = sunCm / 1.3927e11; // cm per cm
  const P: [string, number, number][] = [["Mercury", 4879, 0.387], ["Venus", 12104, 0.723], ["Earth", 12742, 1], ["Mars", 6779, 1.524], ["Jupiter", 139820, 5.203], ["Saturn", 116460, 9.537], ["Uranus", 50724, 19.19], ["Neptune", 49244, 30.07]];
  const fd = (cm: number) => (cm >= 100000 ? `${fmt(cm / 100000, 5)} km` : cm >= 100 ? `${fmt(cm / 100, 5)} m` : cm >= 1 ? `${fmt(cm, 4)} cm` : `${fmt(cm * 10, 4)} mm`);
  return { table: P.map(([n, dkm, au]) => `${n}: ${fd(dkm * 1e5 * k)} across, ${fd(au * AU * 100 * k)} from the Sun`).join("\n"), earth: fd(12742e5 * k), neptune: fd(30.07 * AU * 100 * k), star: fd(4.2465 * LY * 100 * k) };
};
export const drake: SciCalculator = (v) => {
  const N = pos(v.R, 1.5) * pos(v.fp, 1) * pos(v.ne, 0.2) * pos(v.fl, 0.1) * pos(v.fi, 0.1) * pos(v.fc, 0.1) * pos(v.L, 10000);
  return { N: s(N, 6), round: N < 1 ? "Less than one — we may be alone in the galaxy" : `About ${fmt(Math.round(N))} communicating civilizations`, dist: N >= 1 ? s(Math.sqrt((Math.PI * 50000 ** 2) / N), 5) : "—" };
};
export const asteroid: SciCalculator = (v) => {
  const L = pos(v.d, 50), rho = pos(v.rho, 3000), vel = pos(v.v, 17) * 1000, th = Math.max(5, Math.min(90, num(v.ang, 45))) * RAD, rt = pos(v.rt, 2500);
  const m = rho * (Math.PI / 6) * L ** 3, E = 0.5 * m * vel * vel, mt = E / 4.184e15;
  const Dtc = 1.161 * (rho / rt) ** (1 / 3) * L ** 0.78 * vel ** 0.44 * 9.80665 ** -0.22 * Math.sin(th) ** (1 / 3), Dfr = Dtc < 3200 ? 1.25 * Dtc : (1.17 * Dtc ** 1.13) / 3200 ** 0.13;
  return { E: s(E, 6), mt: s(mt, 6), mass: s(m, 6), crater: s(Dfr, 6), note: L < 50 ? "Small stony bodies usually break up in the atmosphere (airburst) — crater shown assumes it reaches the ground" : "Crater estimate per Collins et al. (2005)" };
};
export const RS_MODE = ["From observed and emitted wavelengths", "From redshift z", "From recession velocity"];
export const redshift: SciCalculator = (v) => {
  const m = pick(v.mode, 3), H0 = pos(v.H0, 70);
  const z = m === 0 ? pos(v.obs, 700) / pos(v.emit, 656.28) - 1 : m === 1 ? num(v.z, 0.1) : (() => { const b = num(v.vel, 30000) / (C / 1000); if (Math.abs(b) >= 1) throw new InputError("Velocity must be below c."); return Math.sqrt((1 + b) / (1 - b)) - 1; })();
  const zz = (1 + z) ** 2, vrel = ((zz - 1) / (zz + 1)) * (C / 1000);
  return { z: s(z, 8), v: s(vrel, 8), vlin: s(z * (C / 1000), 8), d: s(vrel / H0, 6), dly: s((vrel / H0) * 3.2616, 6) };
};
export const ANG_MODE = ["Angular size from size and distance", "Size from angle and distance", "Distance from size and angle"];
export const angularSize: SciCalculator = (v) => {
  const m = pick(v.mode, 3), D = pos(v.D, 3474.8), d = pos(v.dist, 384400), a = pos(v.ang, 0.5) * RAD;
  if (m === 1) { const sz = 2 * d * Math.tan(a / 2); return { deg: s(a / RAD, 8), arcmin: s((a / RAD) * 60, 8), arcsec: s((a / RAD) * 3600, 8), other: s(sz, 8) }; }
  if (m === 2) { const dist = D / (2 * Math.tan(a / 2)); return { deg: s(a / RAD, 8), arcmin: s((a / RAD) * 60, 8), arcsec: s((a / RAD) * 3600, 8), other: s(fin(dist), 8) }; }
  const ang = 2 * Math.atan(D / (2 * d)) / RAD;
  return { deg: s(ang, 8), arcmin: s(ang * 60, 8), arcsec: s(ang * 3600, 8), other: s(d / D, 8) };
};
export const parallax: SciCalculator = (v) => {
  const p = pos(v.p, 768.5) / (pick(v.unit, 2) === 0 ? 1000 : 1), m = num(v.mag, 0), dpc = 1 / p;
  return { pc: s(dpc, 8), ly: s((dpc * PC) / LY, 8), au: s((dpc * PC) / AU, 8), M: s(m - 5 * Math.log10(dpc / 10), 6), mod: s(5 * Math.log10(dpc / 10), 6) };
};
export const PAR_UNIT = ["Milliarcseconds (mas)", "Arcseconds (″)"];

export const sciAstroCustomCalculators: Record<string, SciCalculator> = {
  "moon-phase-calculator": moonPhase,
  "eclipse-calculator": eclipses,
  "sun-position-calculator": sunPosition,
  "orbital-period-calculator": orbitalPeriod,
  "weight-on-other-planets-calculator": weightPlanets,
  "schwarzschild-radius-calculator": schwarzschild,
  "pluto-time-calculator": plutoTime,
  "shadow-length-calculator": shadowLength,
  "hohmann-transfer-calculator": hohmann,
  "sunrise-sunset-calculator": sunriseSunset,
  "luminosity-calculator": luminosity,
  "telescope-calculator": telescope,
  "rocket-equation-calculator": rocketEq,
  "escape-velocity-calculator": escapeVelocity,
  "solar-system-scale-calculator": solarScale,
  "drake-equation-calculator": drake,
  "asteroid-impact-calculator": asteroid,
  "redshift-calculator": redshift,
  "angular-size-calculator": angularSize,
  "parallax-calculator": parallax,
};
