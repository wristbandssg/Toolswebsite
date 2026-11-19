/**
 * Idea build, batch fun1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Tarot, Astrology & Fun — astrology, numerology and birthday fun (36 tools).
 *
 * Planet positions: Paul Schlyter's "How to compute planetary positions" orbital elements (equinox of
 * date, ~1–2′ for the Sun and planets, ~2′ for the Moon with the main perturbation terms) — enough to
 * place a planet in its sign except within minutes of a cusp. Ascendant from GMST (IAU 1982) and
 * obliquity. Sidereal (Vedic) positions use the Lahiri ayanamsa ≈ 23.853° + 0.013972°/yr from 2000.
 * Numerology: Pythagorean letter values, master numbers 11/22/33 kept; Chaldean values for name number.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, findPlace, parseClock, dayText, dayParts, dayNum, dateIn, nfmt } from "./trv-core";

const RAD = Math.PI / 180, DEG = 180 / Math.PI;
const n360 = (x: number) => ((x % 360) + 360) % 360;
const sind = (x: number) => Math.sin(x * RAD), cosd = (x: number) => Math.cos(x * RAD);
export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_TRAIT = ["bold, pioneering", "steady, sensual", "curious, talkative", "nurturing, protective", "warm, expressive", "precise, helpful", "harmonious, fair", "intense, loyal", "adventurous, honest", "ambitious, disciplined", "independent, original", "intuitive, compassionate"];
const signOf = (lon: number) => { const s = Math.floor(n360(lon) / 30); return `${SIGNS[s]} ${(n360(lon) % 30).toFixed(1)}°`; };
export const EX_DAY = dayNum(1995, 6, 15);

type El = [number, number, number, number, number, number, number, number, number, number, number, number];
// N0, N1, i0, i1, w0, w1, a, e0, e1, M0, M1  (+ pad)
const ELEM: Record<string, El> = {
  sun: [0, 0, 0, 0, 282.9404, 4.70935e-5, 1, 0.016709, -1.151e-9, 356.047, 0.9856002585, 0],
  moon: [125.1228, -0.0529538083, 5.1454, 0, 318.0634, 0.1643573223, 60.2666, 0.0549, 0, 115.3654, 13.0649929509, 0],
  mercury: [48.3313, 3.24587e-5, 7.0047, 5e-8, 29.1241, 1.01444e-5, 0.387098, 0.205635, 5.59e-10, 168.6562, 4.0923344368, 0],
  venus: [76.6799, 2.4659e-5, 3.3946, 2.75e-8, 54.891, 1.38374e-5, 0.72333, 0.006773, -1.302e-9, 48.0052, 1.6021302244, 0],
  mars: [49.5574, 2.11081e-5, 1.8497, -1.78e-8, 286.5016, 2.92961e-5, 1.523688, 0.093405, 2.516e-9, 18.6021, 0.5240207766, 0],
  jupiter: [100.4542, 2.76854e-5, 1.303, -1.557e-7, 273.8777, 1.64505e-5, 5.20256, 0.048498, 4.469e-9, 19.895, 0.0830853001, 0],
  saturn: [113.6634, 2.3898e-5, 2.4886, -1.081e-7, 339.3939, 2.97661e-5, 9.55475, 0.055546, -9.499e-9, 316.967, 0.0334442282, 0],
};
function orbit(k: string, d: number) {
  const [N0, N1, i0, i1, w0, w1, a, e0, e1, M0, M1] = ELEM[k];
  const N = N0 + N1 * d, i = i0 + i1 * d, w = w0 + w1 * d, e = e0 + e1 * d, M = n360(M0 + M1 * d);
  let E = M + DEG * e * sind(M) * (1 + e * cosd(M));
  for (let j = 0; j < 8; j++) E = E - (E - DEG * e * sind(E) - M) / (1 - e * cosd(E));
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E), v = Math.atan2(yv, xv) * DEG, r = Math.hypot(xv, yv);
  const x = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i)), y = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i)), z = r * sind(v + w) * sind(i);
  return { x, y, z, M, w, N, lon: n360(Math.atan2(y, x) * DEG) };
}
/** Geocentric ecliptic longitude (degrees, equinox of date). d = days since 2000 Jan 0.0 UT. */
export function geoLon(body: string, d: number): number {
  const s = orbit("sun", d);
  if (body === "sun") return s.lon;
  if (body === "moon") {
    const m = orbit("moon", d), Ms = s.M, Mm = m.M, Ls = n360(Ms + s.w), Lm = n360(Mm + m.w + m.N), D = Lm - Ls, F = Lm - m.N;
    return n360(m.lon - 1.274 * sind(Mm - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms) - 0.059 * sind(2 * Mm - 2 * D) - 0.057 * sind(Mm - 2 * D + Ms) + 0.053 * sind(Mm + 2 * D) + 0.046 * sind(2 * D - Ms) + 0.041 * sind(Mm - Ms) - 0.035 * sind(D) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(Mm - 4 * D));
  }
  const p = orbit(body, d);
  return n360(Math.atan2(p.y + s.y, p.x + s.x) * DEG);
}
const dOf = (day: number, minUT: number) => day + minUT / 1440 + 2440587.5 - 2451543.5;
function birth(v: Record<string, number>, needPlace = false) {
  const day = dateIn(v, "date", EX_DAY), t = txt(v, "time"), tz = num(v.tz, 0);
  const min = t ? parseClock(t, "Birth time") : 720;
  const ut = min - tz * 60;
  const place = needPlace ? findPlace(txt(v, "place") || "London") : null;
  return { day, d: dOf(day, ut), place, timeKnown: !!t };
}
const planetSign = (body: string, label: string): Calc => (v) => {
  const b = birth(v), lon = geoLon(body, b.d), s = Math.floor(lon / 30);
  const lon0 = geoLon(body, b.d - 0.5), lon1 = geoLon(body, b.d + 0.5), cusp = Math.floor(lon0 / 30) !== Math.floor(lon1 / 30);
  return { sign: `${label} in ${SIGNS[s]}`, deg: signOf(lon), trait: `${SIGNS[s]}: ${SIGN_TRAIT[s]}`, note: cusp ? "Near a sign change that day — the exact birth time decides it" : `Born ${dayText(b.day)}` };
};
export const moonSign = planetSign("moon", "Moon");
export const venusSign = planetSign("venus", "Venus");
export const marsSign = planetSign("mars", "Mars");
export const mercurySign = planetSign("mercury", "Mercury");
export const risingSign: Calc = (v) => {
  const b = birth(v, true), pl = b.place!, jd = b.d + 2451543.5;
  if (!b.timeKnown) throw new InputError("The rising sign needs your birth time.");
  const gmst = n360(280.46061837 + 360.98564736629 * (jd - 2451545)), ramc = n360(gmst + pl.lon), eps = 23.4393 - 3.563e-7 * b.d;
  const asc = n360(Math.atan2(cosd(ramc), -(sind(ramc) * cosd(eps) + Math.tan(pl.lat * RAD) * sind(eps))) * DEG);
  const s = Math.floor(asc / 30);
  return { sign: `${SIGNS[s]} rising`, deg: `Ascendant ${signOf(asc)}`, trait: `First impression: ${SIGN_TRAIT[s]}`, note: `${pl.name} (${pl.lat.toFixed(2)}°, ${pl.lon.toFixed(2)}°); the ascendant moves about 1° every 4 minutes` };
};
export const saturnReturn: Calc = (v) => {
  const b = birth(v), natal = geoLon("saturn", b.d);
  const hits: number[] = [];
  let prev = n360(geoLon("saturn", b.d + 9000) - natal);
  for (let k = 9001; k < 33000 && hits.length < 6; k++) {
    const cur = n360(geoLon("saturn", b.d + k) - natal);
    if ((prev > 300 && cur < 60) || (prev < 60 && cur > 300)) hits.push(b.day + k);
    prev = cur;
  }
  const first = hits.filter((x) => x - b.day < 12000), second = hits.filter((x) => x - b.day >= 12000);
  const fmt = (a: number[]) => a.map((x) => dayText(x)).join(", ");
  return { first: first.length ? `${fmt(first)} (age ${((first[0] - b.day) / 365.25).toFixed(1)})` : "—", second: second.length ? `${fmt(second)} (age ${((second[0] - b.day) / 365.25).toFixed(1)})` : "Beyond the search window", natal: `Natal Saturn ${signOf(natal)}`, note: "Several dates mean Saturn crosses the point, goes retrograde and crosses again" };
};
export const PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
export const retrograde: Calc = (v) => {
  const year = Math.round(num(v.year, 2026)), body = PLANETS[pick(v.planet, 5)].toLowerCase();
  if (year < 1900 || year > 2100) throw new InputError("Pick a year between 1900 and 2100.");
  const start = dayNum(year, 1, 1), end = dayNum(year + 1, 1, 1), out: string[] = [];
  let retro = false, from = 0, prev = geoLon(body, dOf(start - 1, 0));
  for (let day = start - 60; day <= end + 60; day++) {
    const cur = geoLon(body, dOf(day, 0)), mv = ((cur - prev + 540) % 360) - 180;
    if (!retro && mv < 0) { retro = true; from = day; }
    if (retro && mv >= 0) { retro = false; if (day >= start && from < end) out.push(`${dayText(from)} → ${dayText(day - 1)} (${SIGNS[Math.floor(geoLon(body, dOf(from, 0)) / 30)]})`); }
    prev = cur;
  }
  return { periods: out.length ? out.join(" · ") : "No retrograde period this year", count: `${out.length} retrograde period${out.length === 1 ? "" : "s"}`, note: "Dates are when apparent motion turns backward and forward (stations), to within 1–2 days" };
};
const mid = (a: number, b: number) => { let m = (a + b) / 2; if (Math.abs(a - b) > 180) m += 180; return n360(m); };
export const compositeMid: Calc = (v) => {
  const d1 = dOf(dateIn(v, "date", EX_DAY), 720), d2 = dOf(dateIn(v, "date2", dayNum(1993, 2, 3)), 720);
  const row = (b: string, l: string) => `${l} ${signOf(mid(geoLon(b, d1), geoLon(b, d2)))}`;
  return { sun: row("sun", "Composite Sun"), moon: row("moon", "Composite Moon"), venus: row("venus", "Composite Venus"), mars: row("mars", "Composite Mars"), note: "Midpoints on the shorter arc; noon birth times assumed (the Moon moves ~13° a day)" };
};
export const NAKSHATRA = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const RASHI = ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"];
export const nakshatra: Calc = (v) => {
  const b = birth(v), y = dayParts(b.day).y, ay = 23.853 + 0.013972 * (y - 2000), sid = n360(geoLon("moon", b.d) - ay);
  const n = Math.floor(sid / (360 / 27)), pada = Math.floor((sid % (360 / 27)) / (360 / 108)) + 1;
  return { nak: `${NAKSHATRA[n]} nakshatra, pada ${pada}`, lord: `Ruled by ${LORDS[n % 9]}`, rashi: `Moon sign (Rashi): ${RASHI[Math.floor(sid / 30)]} ${(sid % 30).toFixed(1)}°`, note: `Lahiri ayanamsa ${ay.toFixed(2)}°${b.timeKnown ? "" : " — noon assumed, the Moon moves ~13° a day"}` };
};
const PERIODS: [string, number][] = [["Mercury", 0.2408467], ["Venus", 0.61519726], ["Mars", 1.8808158], ["Jupiter", 11.862615], ["Saturn", 29.447498], ["Uranus", 84.016846], ["Neptune", 164.79132], ["Pluto", 247.92065]];
export const planetaryAge: Calc = (v) => {
  const day = dateIn(v, "date", EX_DAY), today = dateIn(v, "today", Math.floor(Date.now() / 86400000)), yrs = (today - day) / 365.25636;
  if (yrs <= 0) throw new InputError("Birth date must be before today.");
  return { earth: `${yrs.toFixed(2)} Earth years`, list: PERIODS.map(([n, pr]) => `${n}: ${(yrs / pr).toFixed(2)}`).join(" · "), next: `Next Mars birthday in ${Math.round((1 - ((yrs / 1.8808158) % 1)) * 1.8808158 * 365.25)} days` };
};
export const zodiacByBirthday: Calc = (v) => {
  const b = birth(v), lon = geoLon("sun", b.d), s = Math.floor(lon / 30), cusp = (lon % 30) < 1 || (lon % 30) > 29;
  return { sign: SIGNS[s], deg: `Sun ${signOf(lon)}`, trait: SIGN_TRAIT[s], note: cusp ? "Born on the cusp — the exact time decides your sign" : `Element: ${["Fire", "Earth", "Air", "Water"][s % 4]} · Modality: ${["Cardinal", "Fixed", "Mutable"][s % 3]}` };
};
export const CN_ELEM = ["Metal", "Metal", "Water", "Water", "Wood", "Wood", "Fire", "Fire", "Earth", "Earth"];
const CN_ANIMAL = ["Monkey", "Rooster", "Dog", "Pig", "Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat"];
export const chineseElement: Calc = (v) => {
  const y = Math.round(num(v.year, 1990));
  if (y < 1900 || y > 2100) throw new InputError("Enter a year from 1900 to 2100.");
  const e = CN_ELEM[y % 10], an = CN_ANIMAL[y % 12];
  return { elem: `${e} ${an}`, yin: y % 2 === 0 ? "Yang year" : "Yin year", note: "Chinese years start at Lunar New Year (late Jan–mid Feb) — January/early-February birthdays may belong to the previous year", cycle: `${e} returns every 10 years; ${e} ${an} every 60 years (next ${y + 60})` };
};
// ---- numerology
const PY: Record<string, number> = {}; "abcdefghijklmnopqrstuvwxyz".split("").forEach((c, i) => (PY[c] = (i % 9) + 1));
const CH: Record<string, number> = { a: 1, i: 1, j: 1, q: 1, y: 1, b: 2, k: 2, r: 2, c: 3, g: 3, l: 3, s: 3, d: 4, m: 4, t: 4, e: 5, h: 5, n: 5, x: 5, u: 6, v: 6, w: 6, o: 7, z: 7, f: 8, p: 8 };
const reduce = (n: number, master = true): number => { while (n > 9 && !(master && (n === 11 || n === 22 || n === 33))) n = String(n).split("").reduce((a, c) => a + Number(c), 0); return n; };
const MEAN: Record<number, string> = { 1: "leader, independent", 2: "diplomat, partner", 3: "creative communicator", 4: "builder, organiser", 5: "freedom-seeker, adventurer", 6: "nurturer, responsible", 7: "thinker, seeker", 8: "achiever, powerful", 9: "humanitarian, compassionate", 11: "master intuitive", 22: "master builder", 33: "master teacher" };
const nameOf = (v: Record<string, number>, key = "name") => { const n = txt(v, key).toLowerCase().replace(/[^a-z ]/g, ""); if (!n.trim()) throw new InputError("Enter a name."); return n; };
const lifePath = (day: number) => { const { y, m, d } = dayParts(day); return reduce(reduce(m) + reduce(d) + reduce(y)); };
export const lifePathNum: Calc = (v) => { const day = dateIn(v, "date", EX_DAY), { y, m, d } = dayParts(day), n = lifePath(day); return { n: String(n), mean: MEAN[n], how: `${m} → ${reduce(m)}, ${d} → ${reduce(d)}, ${y} → ${reduce(y)}; total → ${n}` }; };
export const expressionNum: Calc = (v) => { const nm = nameOf(v), s = nm.replace(/ /g, "").split("").reduce((a, c) => a + PY[c], 0), n = reduce(s); return { n: String(n), mean: MEAN[n], how: `Letter total ${s} → ${n} (Pythagorean)` }; };
export const chaldeanName: Calc = (v) => { const nm = nameOf(v), s = nm.replace(/ /g, "").split("").reduce((a, c) => a + (CH[c] ?? 0), 0), n = reduce(s, false); return { n: String(n), compound: `Compound number ${s}`, mean: MEAN[n] }; };
export const personalYear: Calc = (v) => { const { m, d } = dayParts(dateIn(v, "date", EX_DAY)), y = Math.round(num(v.year, 2026)), n = reduce(reduce(m) + reduce(d) + reduce(y), false); const T = ["", "new beginnings", "patience and partnership", "creativity and expression", "hard work and foundations", "change and freedom", "home and responsibility", "reflection and study", "power and money", "completion and letting go"]; return { n: String(n), theme: `Personal Year ${n}: ${T[n]}`, note: `for ${y} (birthday to birthday in some traditions)` }; };
export const personalMonth: Calc = (v) => { const { m, d } = dayParts(dateIn(v, "date", EX_DAY)), y = Math.round(num(v.year, 2026)), mo = Math.min(12, Math.max(1, Math.round(num(v.month, 6)))), py = reduce(reduce(m) + reduce(d) + reduce(y), false), n = reduce(py + mo, false); return { n: String(n), py: `Personal Year ${py}`, mean: MEAN[n] }; };
export const karmicDebt: Calc = (v) => {
  const day = dateIn(v, "date", EX_DAY), { y, m, d } = dayParts(day), nm = txt(v, "name").toLowerCase().replace(/[^a-z]/g, "");
  const totals = [reduce(m, false) + reduce(d, false) + reduce(y, false), d, nm ? nm.split("").reduce((a, c) => a + PY[c], 0) : 0];
  const k = [13, 14, 16, 19].filter((x) => totals.some((t) => { let n = t; while (n > 19) n = String(n).split("").reduce((a, c) => a + Number(c), 0); return n === x; }));
  const KM: Record<number, string> = { 13: "13/4 — laziness → hard work", 14: "14/5 — excess → moderation", 16: "16/7 — ego → humility", 19: "19/1 — selfishness → independence with care" };
  return { debt: k.length ? k.map((x) => KM[x]).join(" · ") : "No karmic debt numbers found", checked: `Birth day ${d}, life-path total ${totals[0]}${nm ? `, name total ${totals[2]}` : ""}` };
};
export const maturityNum: Calc = (v) => { const lp = lifePath(dateIn(v, "date", EX_DAY)), ex = reduce(nameOf(v).replace(/ /g, "").split("").reduce((a, c) => a + PY[c], 0)), n = reduce(lp + ex); return { n: String(n), mean: MEAN[n], how: `Life path ${lp} + expression ${ex}`, note: "Said to grow stronger after age 35–40" }; };
export const birthdayNum: Calc = (v) => { const { d } = dayParts(dateIn(v, "date", EX_DAY)), n = reduce(d); return { n: String(n), mean: MEAN[n], note: `Born on day ${d}` }; };
export const babyName: Calc = (v) => {
  const names = txt(v, "names").split(/,|\n/).map((s) => s.trim().toLowerCase().replace(/[^a-z ]/g, "")).filter(Boolean), target = reduce(Math.round(num(v.target, 0)) || 0);
  if (!names.length) throw new InputError("Enter one or more names separated by commas.");
  const rows = names.map((nm) => { const n = reduce(nm.replace(/ /g, "").split("").reduce((a, c) => a + PY[c], 0)); return [nm, n] as [string, number]; });
  return { list: rows.map(([nm, n]) => `${nm.replace(/\b\w/g, (c) => c.toUpperCase())}: ${n}`).join(" · "), match: target ? `Matching ${target}: ${rows.filter((r) => r[1] === target).map((r) => r[0]).join(", ") || "none"}` : "Enter a target number to filter", mean: rows.map(([, n]) => `${n} = ${MEAN[n]}`).filter((x, i, a) => a.indexOf(x) === i).join(" · ") };
};
export const weddingDate: Calc = (v) => { const day = dateIn(v, "date", dayNum(2026, 9, 12)), n = lifePath(day); const good = [2, 6, 9].includes(n); return { n: String(n), mean: MEAN[n], verdict: good ? "Traditionally favoured for weddings (2, 6, 9)" : "Fine — 2, 6 and 9 are considered the most romantic", day: dayText(day) }; };
export const ANGEL: Record<string, string> = { "111": "new beginnings — your thoughts are manifesting", "222": "balance and trust — things are aligning", "333": "support and encouragement", "444": "protection — you're on the right path", "555": "big change is coming", "666": "rebalance — focus on care and home", "777": "luck and spiritual growth", "888": "abundance and money flow", "999": "endings that make room for something new", "000": "a fresh start, infinite potential", "1111": "alignment — make a wish", "1212": "stay positive and keep going", "1010": "step out of your comfort zone" };
export const angelNumber: Calc = (v) => {
  const s = txt(v, "num").replace(/\D/g, "");
  if (!s) throw new InputError("Enter the number you keep seeing.");
  const m = ANGEL[s] ?? (new Set(s).size === 1 ? ANGEL[s.slice(0, 3)] : undefined);
  const r = reduce(s.split("").reduce((a, c) => a + Number(c), 0));
  return { mean: m ? `${s}: ${m}` : `${s} isn't a classic angel number; its root is ${r}`, root: `Root number ${r} — ${MEAN[r]}`, note: "For fun and reflection" };
};
export const biorhythm: Calc = (v) => {
  const b = dateIn(v, "date", EX_DAY), t = dateIn(v, "today", Math.floor(Date.now() / 86400000)), d = t - b;
  if (d < 0) throw new InputError("The target date must be after the birth date.");
  const c = (p: number) => Math.sin((2 * Math.PI * d) / p) * 100;
  const lab = (x: number) => (Math.abs(x) < 10 ? "critical day" : x > 0 ? "high" : "low");
  return { phys: `Physical ${c(23).toFixed(0)}% (${lab(c(23))})`, emo: `Emotional ${c(28).toFixed(0)}% (${lab(c(28))})`, intel: `Intellectual ${c(33).toFixed(0)}% (${lab(c(33))})`, days: `${nfmt(d)} days old on ${dayText(t)}` };
};
const KUA_DIR = ["", "E, SE, S, N", "NE, W, NW, SW", "S, N, SE, E", "N, S, E, SE", "", "W, SW, NE, NW", "NW, NE, SW, W", "SW, NW, W, NE", "E, SE, N, S"];
export const kuaNumber: Calc = (v) => {
  let y = Math.round(num(v.year, 1990)); const g = pick(v.g, 2), feb = pick(v.early, 2);
  if (feb) y -= 1;
  const s = reduce(String(y).slice(-2).split("").reduce((a, c) => a + Number(c), 0), false);
  let k = g === 0 ? (y >= 2000 ? 9 - s : 10 - s) : (y >= 2000 ? 6 + s : 5 + s);
  k = reduce(k <= 0 ? k + 9 : k, false);
  if (k === 5) k = g === 0 ? 2 : 8;
  return { kua: String(k), group: [1, 3, 4, 9].includes(k) ? "East group" : "West group", dirs: `Best directions: ${KUA_DIR[k]}` };
};
export const ageAnimals: Calc = (v) => {
  const age = Math.max(0, num(v.age, 30));
  const dog = age <= 1 ? age * 15 : age <= 2 ? 15 + (age - 1) * 9 : 24 + (age - 2) * 5;
  return { dog: `Dog years: ${dog.toFixed(1)}`, cat: `Cat years: ${(age <= 2 ? age * 12 : 24 + (age - 2) * 4).toFixed(1)}`, other: `Hamster ${(age * 26).toFixed(0)} · Rabbit ${(age * 8).toFixed(0)} · Horse ${(age / 3).toFixed(1)} · Parrot ${(age / 1.1).toFixed(1)}`, note: "If a human were the animal's age, in that animal's years (just for fun)" };
};
export const friendship: Calc = (v) => {
  const a = nameOf(v, "a").replace(/ /g, ""), b = nameOf(v, "b").replace(/ /g, "");
  let h = 0; for (const c of [a, b].sort().join("&")) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  const score = 40 + (h % 61), la = reduce(a.split("").reduce((s, c) => s + PY[c], 0)), lb = reduce(b.split("").reduce((s, c) => s + PY[c], 0));
  return { score: `${score}% friendship match`, num: `Name numbers ${la} and ${lb}`, note: score > 85 ? "Best friends forever" : score > 65 ? "Great friends" : "Opposites can attract — fun only!" };
};
export const flames: Calc = (v) => {
  const a = nameOf(v, "a").replace(/ /g, "").split(""), b = nameOf(v, "b").replace(/ /g, "").split("");
  for (const c of [...a]) { const j = b.indexOf(c); if (j >= 0) { b.splice(j, 1); a.splice(a.indexOf(c), 1); } }
  const n = a.length + b.length, F = ["Friends", "Lovers", "Affectionate", "Marriage", "Enemies", "Siblings"];
  const list = [...F]; let i = 0;
  if (n === 0) return { result: "Same letters — Friends", count: "0 letters left", note: "Fun game" };
  while (list.length > 1) { i = (i + n - 1) % list.length; list.splice(i, 1); }
  return { result: list[0], count: `${n} letters left after crossing out common letters`, note: "The classic childhood FLAMES game" };
};
export const luckyNumber: Calc = (v) => {
  const day = dateIn(v, "date", EX_DAY), nm = txt(v, "name").toLowerCase().replace(/[^a-z]/g, ""), lp = lifePath(day), ex = nm ? reduce(nm.split("").reduce((a, c) => a + PY[c], 0)) : 0;
  const { d } = dayParts(day), nums = [...new Set([lp, reduce(d, false), ex, reduce(lp + ex, false), (d % 49) + 1].filter((x) => x > 0))];
  return { lucky: nums.join(", "), main: `Main lucky number: ${lp}`, note: "From numerology of your birth date and name — for fun" };
};
const COLORS = ["Red", "Green", "Yellow", "Silver", "Gold", "Navy blue", "Pink", "Purple", "Brown", "Black", "Turquoise", "Sea green"];
export const luckyColor: Calc = (v) => { const b = birth(v), s = Math.floor(geoLon("sun", b.d) / 30), n = lifePath(b.day); const NC = ["", "Red", "Orange", "Yellow", "Green", "Blue", "Indigo", "Violet", "Rose", "Gold", "", "Silver"]; return { color: COLORS[s], sign: `${SIGNS[s]} colour`, num: `Life path ${n} colour: ${NC[n] ?? "Gold"}` }; };
const FLOWERS = ["Carnation & snowdrop", "Violet & primrose", "Daffodil & jonquil", "Daisy & sweet pea", "Lily of the valley & hawthorn", "Rose & honeysuckle", "Larkspur & water lily", "Gladiolus & poppy", "Aster & morning glory", "Marigold & cosmos", "Chrysanthemum", "Narcissus & holly"];
const STONES = ["Garnet", "Amethyst", "Aquamarine", "Diamond", "Emerald", "Pearl / alexandrite", "Ruby", "Peridot", "Sapphire", "Opal / tourmaline", "Topaz / citrine", "Turquoise / tanzanite"];
export const birthFlower: Calc = (v) => { const { m } = dayParts(dateIn(v, "date", EX_DAY)); return { flower: FLOWERS[m - 1], stone: `Birthstone: ${STONES[m - 1]}`, month: new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" }) }; };
const SPIRIT = ["Hawk", "Beaver", "Deer", "Woodpecker", "Salmon", "Brown bear", "Raven", "Snake", "Owl", "Goose", "Otter", "Wolf"];
export const spiritAnimal: Calc = (v) => { const b = birth(v), s = Math.floor(geoLon("sun", b.d) / 30); return { animal: SPIRIT[s], sign: `${SIGNS[s]} season`, note: "Based on the popular Native-American-inspired zodiac wheel — for fun, not a sacred tradition" }; };
const GENS: [number, number, string][] = [[1901, 1927, "Greatest Generation"], [1928, 1945, "Silent Generation"], [1946, 1964, "Baby Boomer"], [1965, 1980, "Generation X"], [1981, 1996, "Millennial (Gen Y)"], [1997, 2012, "Generation Z"], [2013, 2024, "Generation Alpha"], [2025, 2039, "Generation Beta"]];
export const generation: Calc = (v) => { const y = Math.round(num(v.year, 1990)), g = GENS.find(([a, b]) => y >= a && y <= b); if (!g) throw new InputError("Enter a year from 1901 to 2039."); return { gen: g[2], range: `${g[0]}–${g[1]}`, note: y - g[0] < 3 || g[1] - y < 3 ? "A cusp year — you may relate to the neighbouring generation" : "Pew Research ranges" }; };
const lived = (v: Record<string, number>) => { const b = dateIn(v, "date", EX_DAY), t = dateIn(v, "today", Math.floor(Date.now() / 86400000)); if (t < b) throw new InputError("Birth date must be before the target date."); return (t - b) * 86400; };
export const ageSeconds: Calc = (v) => { const s = lived(v); return { s: `${nfmt(s)} seconds`, min: `${nfmt(s / 60)} minutes · ${nfmt(s / 3600)} hours`, next: `You turn ${nfmt(Math.ceil(s / 1e9))} billion seconds old on ${dayText(dateIn(v, "date", EX_DAY) + Math.ceil(s / 1e9) * 1e9 / 86400)}` }; };
export const heartbeats: Calc = (v) => { const s = lived(v), bpm = Math.max(30, num(v.bpm, 72)); return { beats: `${nfmt((s / 60) * bpm)} heartbeats`, day: `${nfmt(bpm * 1440)} a day`, blood: `${nfmt((s / 60) * bpm * 0.07)} litres of blood pumped` }; };
export const breaths: Calc = (v) => { const s = lived(v), r = Math.max(4, num(v.rate, 15)); return { breaths: `${nfmt((s / 60) * r)} breaths`, day: `${nfmt(r * 1440)} a day`, air: `${nfmt((s / 60) * r * 0.5)} litres of air` }; };
export const goldenBirthday: Calc = (v) => { const b = dateIn(v, "date", EX_DAY), { y, d } = dayParts(b); return { when: `Turning ${d} on ${dayText(dayNum(y + d, dayParts(b).m, d))}`, age: `Age ${d}`, note: "A golden birthday is when your age matches your birth day" }; };
const GIFTS = ["Paper", "Cotton", "Leather", "Fruit / flowers", "Wood", "Iron / sugar", "Wool / copper", "Bronze", "Pottery", "Tin / aluminium", "Steel", "Silk / linen", "Lace", "Ivory (modern: gold jewellery)", "Crystal", "Silverware", "Silk", "Porcelain", "Bronze", "China", "Brass"];
export const anniversaryGift: Calc = (v) => { const y = Math.max(1, Math.round(num(v.year, 10))); const big: Record<number, string> = { 25: "Silver", 30: "Pearl", 35: "Coral / jade", 40: "Ruby", 45: "Sapphire", 50: "Gold", 55: "Emerald", 60: "Diamond", 70: "Platinum" }; return { gift: big[y] ?? GIFTS[y - 1] ?? "Gold or diamond (any milestone)", year: `${y}${y % 10 === 1 && y !== 11 ? "st" : y % 10 === 2 && y !== 12 ? "nd" : y % 10 === 3 && y !== 13 ? "rd" : "th"} anniversary`, note: "Traditional list" }; };
const until = (m: number, d: number, label: string): Calc => (v) => { const t = dateIn(v, "today", Math.floor(Date.now() / 86400000)), { y } = dayParts(t); let target = dayNum(y, m, d); if (target < t) target = dayNum(y + 1, m, d); const n = target - t; return { days: n === 0 ? `${label} is today!` : `${n} days until ${label}`, weeks: `${(n / 7).toFixed(1)} weeks · ${nfmt(n * 24)} hours`, date: dayText(target) }; };
export const daysHalloween = until(10, 31, "Halloween");
export const christmasCountdown = until(12, 25, "Christmas");

// ---- registry (generated)
export const ideaFun1CustomCalculators: Record<string, Calc> = {
  "rising-sign-calculator": risingSign,
  "moon-sign-calculator": moonSign,
  "venus-sign-calculator": venusSign,
  "mars-sign-calculator": marsSign,
  "mercury-sign-calculator": mercurySign,
  "saturn-return-calculator": saturnReturn,
  "composite-chart-midpoint-calculator": compositeMid,
  "retrograde-dates-calculator": retrograde,
  "vedic-nakshatra-calculator": nakshatra,
  "planetary-age-calculator": planetaryAge,
  "zodiac-sign-by-birthday-calculator": zodiacByBirthday,
  "chinese-element-by-year-calculator": chineseElement,
  "life-path-number-calculator": lifePathNum,
  "expression-number-numerology-calculator": expressionNum,
  "numerology-name-number-calculator": chaldeanName,
  "personal-year-number-calculator": personalYear,
  "angel-number-meaning-finder-calculator": angelNumber,
  "biorhythm-calculator": biorhythm,
  "kua-number-feng-shui-calculator": kuaNumber,
  "age-in-dog-cat-bird-years-calculator": ageAnimals,
  "friendship-compatibility-calculator": friendship,
  "flames-game-calculator": flames,
  "baby-name-numerology-calculator": babyName,
  "lucky-number-generator-calculator": luckyNumber,
  "wedding-date-numerology-calculator": weddingDate,
  "karmic-debt-number-calculator": karmicDebt,
  "maturity-number-numerology-calculator": maturityNum,
  "birthday-number-numerology-calculator": birthdayNum,
  "personal-month-number-calculator": personalMonth,
  "lucky-color-by-birthday-calculator": luckyColor,
  "birth-flower-finder-calculator": birthFlower,
  "spirit-animal-finder-calculator": spiritAnimal,
  "generation-by-birth-year-calculator": generation,
  "age-in-seconds-calculator": ageSeconds,
  "heartbeats-in-lifetime-calculator": heartbeats,
  "breaths-in-lifetime-calculator": breaths,
  "golden-birthday-calculator": goldenBirthday,
  "wedding-anniversary-gift-by-year-calculator": anniversaryGift,
  "days-until-halloween-calculator": daysHalloween,
  "christmas-countdown-calculator": christmasCountdown,
};
