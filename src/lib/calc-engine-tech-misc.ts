/**
 * Batch: Tech keyword check (15 Nov 2026) — last 13 tools: Arts & Entertainment > Tarot, Astrology &
 * Fun (CS2 trade-up, D&D DPR, Minecraft nether portal, Minecraft XP, MEE6 level, love, Scrabble
 * score), Jobs & Education (typing speed; time card), Finance (financial / TVM calculator), Travel
 * (time zone meeting planner, GPS coordinates distance) and Law & Government (ranked-choice voting).
 *
 * Near-namesakes kept apart on purpose:
 *  - time-card-calculator = clock-in/clock-out times with breaks per day → weekly hours & pay.
 *    hours-worked-calculator (existing) adds up daily totals; time-calculator adds durations.
 *  - financial-calculator = full 5-key TVM solver (N, I/Y, PV, PMT, FV) like a BA II Plus. The
 *    existing future-value / loan calculators each solve one fixed question.
 *  - gps-coordinates-distance-calculator = point-to-point great-circle distance & bearing from
 *    coordinates. flight-distance (existing) is airport-to-airport; drive-time tools are routes.
 *  - typing-speed-calculator = WPM from a test result; words-per-minute speaking is in script-length.
 *
 * Methods / data:
 *  - CS2 trade-up output float = min + avg × (max − min) (classic) or the average of each input's
 *    position within its own float range (normalised, CS2 2024+). Wear: FN < 0.07, MW < 0.15,
 *    FT < 0.38, WW < 0.45, BS.
 *  - D&D 5e: hit chance = (21 − (AC − bonus)) / 20 clamped to 5–95%; crits double dice;
 *    advantage 1 − (1 − p)², disadvantage p².
 *  - Minecraft Java XP: total to level L = L² + 6L (L ≤ 16), 2.5L² − 40.5L + 360 (17–31),
 *    4.5L² − 162.5L + 2220 (32+). Nether ↔ Overworld X and Z ÷ / × 8.
 *  - MEE6: XP to go from level L to L+1 = 5L² + 50L + 100; 15–25 XP per message, once a minute.
 *  - Scrabble English letter values (A1 … Q10, Z10), blank = 0, 50-point bingo.
 *  - Typing: gross WPM = characters ÷ 5 ÷ minutes; net = gross − errors ÷ minutes.
 *  - TVM (BA II Plus sign convention): PV(1+i)^n + PMT(1 + i·k)((1+i)^n − 1)/i + FV = 0,
 *    k = 1 for payments at the beginning of the period.
 *  - Time zones from the IANA database via Intl (daylight saving applied for the chosen date).
 *  - Instant-runoff voting: eliminate the last-place candidate until one has a majority of the
 *    continuing ballots.
 */

import { type TrvCalculator as Calc, InputError, num, pos, pick, txt, r1, r2, nfmt, sig, money, findPlace, gcKm, bearing, compass, midpoint, latLonText, parseClock, dateIn, dayText } from "./trv-core";

// ------------------------------------------------------------------ CS2 trade-up
const wear = (f: number) => (f < 0.07 ? "Factory New" : f < 0.15 ? "Minimal Wear" : f < 0.38 ? "Field-Tested" : f < 0.45 ? "Well-Worn" : "Battle-Scarred");
export const cs2TradeUp: Calc = (v) => {
  const items = txt(v, "floats").split(/[,;\s]+/).filter(Boolean).map((s) => {
    const [f, rng] = s.split("@");
    const x = Number(f);
    let lo = 0, hi = 1;
    if (rng) { const [a, b] = rng.split("-").map(Number); lo = a; hi = b; }
    if (!(x >= 0 && x <= 1) || !(hi > lo)) throw new InputError(`"${s}" must be a float 0–1, optionally with its range like 0.12@0-0.8.`);
    return { x, lo, hi };
  });
  if (items.length !== 10 && items.length !== 5) throw new InputError(`A trade-up needs 10 skins (or 5 for Covert → knife/glove). You entered ${items.length}.`);
  const omin = pos(v.omin, 0), omax = pos(v.omax, 1);
  if (omax <= omin) throw new InputError("The output skin's maximum float must be above its minimum.");
  const norm = pick(v.method, 2) === 0;
  const avg = items.reduce((s, i) => s + (norm ? (i.x - i.lo) / (i.hi - i.lo) : i.x), 0) / items.length;
  const out = omin + avg * (omax - omin);
  const target = num(v.target, 0.07);
  const need = target > omin ? (target - omin) / (omax - omin) : 0;
  return { float: sig(out, 6), wear: wear(out), avg: sig(avg, 6), need: target > omin && target <= omax ? `Average ${norm ? "normalised " : ""}input below ${sig(need, 5)} to get under ${target}` : "—", count: items.length };
};

// ------------------------------------------------------------------ D&D damage per round
function dice(s: string) {
  const t = s.replace(/\s+/g, "").toLowerCase();
  if (!t) return { avg: 0, dice: 0 };
  let avg = 0, dv = 0;
  for (const part of t.match(/[+-]?[^+-]+/g) ?? []) {
    const m = part.match(/^([+-]?)(\d*)d(\d+)$/);
    if (m) { const n = Number(m[2] || 1), sd = Number(m[3]); const a = (n * (sd + 1)) / 2; dv += m[1] === "-" ? -a : a; avg += m[1] === "-" ? -a : a; }
    else if (/^[+-]?\d+$/.test(part)) avg += Number(part);
    else throw new InputError(`"${s}" isn't dice notation — use 1d8+4 or 2d6+3.`);
  }
  return { avg, dice: dv };
}
export const dndDpr: Calc = (v) => {
  const bonus = num(v.bonus, 7), ac = num(v.ac, 15), n = Math.max(1, Math.round(pos(v.attacks, 2))), critMin = Math.min(20, Math.max(2, Math.round(num(v.crit, 20))));
  const dmg = dice(txt(v, "damage")), rider = dice(txt(v, "rider"));
  let p = Math.min(0.95, Math.max(0.05, (21 - (ac - bonus)) / 20));
  let c = (21 - critMin) / 20;
  p = Math.max(p, c);
  const a = pick(v.adv, 3);
  if (a === 1) { p = 1 - (1 - p) ** 2; c = 1 - (1 - c) ** 2; } else if (a === 2) { p = p * p; c = c * c; }
  const per = (p - c) * dmg.avg + c * (dmg.avg + dmg.dice);
  const anyHit = 1 - (1 - p) ** n, anyCrit = 1 - (1 - c) ** n;
  const riderExp = rider.avg ? anyHit * rider.avg + anyCrit * rider.dice : 0;
  const dpr = per * n + riderExp;
  const hp = pos(v.hp, 0);
  return { dpr: r2(dpr), hit: r1(p * 100), crit: r1(c * 100), perHit: r2(dmg.avg), perAttack: r2(per), rider: rider.avg ? `${r2(riderExp)} expected from the once-per-turn extra (${r1(anyHit * 100)}% chance to land)` : "—", rounds: hp > 0 && dpr > 0 ? `${r1(hp / dpr)} rounds to defeat ${hp} HP` : "—" };
};
export const netherPortal: Calc = (v) => {
  const toNether = pick(v.mode, 2) === 0, x = num(v.x, 800), y = num(v.y, 64), z = num(v.z, -1200);
  const f = toNether ? 1 / 8 : 8;
  const nx = x * f, nz = z * f;
  const ny = toNether ? Math.min(120, Math.max(5, Math.round(y))) : Math.round(y);
  return { coords: `X ${Math.floor(nx)}, Y ${ny}, Z ${Math.floor(nz)}`, exact: `X ${sig(nx, 8)}, Z ${sig(nz, 8)}`, dim: toNether ? "Nether" : "Overworld", travel: toNether ? `${nfmt(Math.round(Math.hypot(x, z) / 8))} blocks in the Nether instead of ${nfmt(Math.round(Math.hypot(x, z)))} in the Overworld (from 0, 0)` : `${nfmt(Math.round(Math.hypot(nx, nz)))} Overworld blocks from 0, 0`, note: "Build the linked portal within 16 Overworld / 2 Nether blocks of these coordinates. The Y level can differ." };
};

// ------------------------------------------------------------------ Minecraft XP
export const xpTotal = (L: number) => (L <= 16 ? L * L + 6 * L : L <= 31 ? 2.5 * L * L - 40.5 * L + 360 : 4.5 * L * L - 162.5 * L + 2220);
const xpNext = (L: number) => (L <= 15 ? 2 * L + 7 : L <= 30 ? 5 * L - 38 : 9 * L - 158);
export const minecraftXp: Calc = (v) => {
  if (pick(v.mode, 2) === 1) {
    const pts = pos(v.points, 1395);
    let L = 0;
    while (xpTotal(L + 1) <= pts && L < 10000) L++;
    const into = pts - xpTotal(L);
    return { xp: Math.round(pts), level: L, progress: `${Math.round(into)} / ${xpNext(L)} XP into level ${L} (${r1((into / xpNext(L)) * 100)}%)`, bottles: Math.ceil(pts / 7), next: xpNext(L) };
  }
  const a = Math.round(pos(v.from, 0)), b = Math.round(pos(v.to, 30));
  if (b < a) throw new InputError("The target level must be at least the current level.");
  const xp = xpTotal(b) - xpTotal(a);
  return { xp: Math.round(xp), level: b, progress: `Level ${a} → ${b}`, bottles: Math.ceil(xp / 7), next: xpNext(b) };
};

// ------------------------------------------------------------------ MEE6 level
export const mee6: Calc = (v) => {
  const cur = Math.max(0, Math.round(pos(v.level, 5))), xpIn = pos(v.xp, 0), target = Math.round(pos(v.target, 20));
  if (target <= cur) throw new InputError("The target level must be higher than your current level.");
  let need = -xpIn, total = 0;
  for (let l = 0; l < target; l++) { const step = 5 * l * l + 50 * l + 100; total += step; if (l >= cur) need += step; }
  const msgs = Math.ceil(need / 20);
  return { need: nfmt(Math.round(need)), msgs: nfmt(msgs), range: `${nfmt(Math.ceil(need / 25))} – ${nfmt(Math.ceil(need / 15))} messages`, time: `at least ${msgs >= 60 ? `${r1(msgs / 60)} hours` : `${msgs} minutes`} of chatting (XP counts once a minute)`, total: nfmt(total), nextStep: nfmt(5 * cur * cur + 50 * cur + 100) };
};

// ------------------------------------------------------------------ love calculator (fun)
export const love: Calc = (v) => {
  const a = txt(v, "a").toLowerCase().replace(/[^a-z]/g, ""), b = txt(v, "b").toLowerCase().replace(/[^a-z]/g, "");
  if (!a || !b) throw new InputError("Enter both names.");
  const [p, q] = [a, b].sort();
  let h = 7;
  for (const ch of `${p}♥${q}`) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const pct = 35 + (h % 66);
  const shared = [...new Set(a)].filter((c) => b.includes(c)).length;
  const msg = pct >= 90 ? "A match made in heaven!" : pct >= 75 ? "Great chemistry — go for it." : pct >= 60 ? "Good potential with some effort." : pct >= 45 ? "Could be friends first." : "Opposites attract… sometimes.";
  return { pct, msg, shared: `${shared} letter${shared === 1 ? "" : "s"} in common`, note: "Just for fun — love can't really be calculated!" };
};

// ------------------------------------------------------------------ Scrabble score
const LETTERS: Record<string, number> = { A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1, D: 2, G: 2, B: 3, C: 3, M: 3, P: 3, F: 4, H: 4, V: 4, W: 4, Y: 4, K: 5, J: 8, X: 8, Q: 10, Z: 10 };
export const scrabble: Calc = (v) => {
  const raw = txt(v, "word").trim();
  if (!/^[A-Za-z?]+$/.test(raw)) throw new InputError("Type a single word using letters only (use ? for a blank tile).");
  const mults = new Map<number, number>();
  for (const part of txt(v, "squares").split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*[:=]?\s*(DL|TL)$/i);
    if (!m) throw new InputError(`"${part}" must look like 2:DL or 5:TL (letter position and square).`);
    mults.set(Number(m[1]) - 1, m[2].toUpperCase() === "DL" ? 2 : 3);
  }
  let base = 0, sum = 0;
  const parts = [...raw].map((ch, i) => {
    const val = ch === "?" || (ch === ch.toLowerCase() && pick(v.lower, 2) === 1) ? 0 : LETTERS[ch.toUpperCase()];
    const m = mults.get(i) ?? 1;
    base += val; sum += val * m;
    return `${ch.toUpperCase()}${val}${m > 1 ? `×${m}` : ""}`;
  });
  const wm = [1, 2, 3, 4, 9][pick(v.wordMult, 5)];
  const bingo = raw.length >= 7 && pick(v.bingo, 2) === 1 ? 50 : 0;
  return { score: sum * wm + bingo, base, letters: parts.join(" + "), wm: `×${wm}`, bingo: bingo ? "+50 bingo (all 7 tiles)" : "—", length: raw.length };
};
export const typingSpeed: Calc = (v) => {
  const mins = pos(v.seconds, 60) / 60;
  if (mins <= 0) throw new InputError("Enter the test time in seconds.");
  const chars = pick(v.mode, 2) === 0 ? pos(v.count, 250) : pos(v.count, 50) * 5;
  const err = pos(v.errors, 3);
  const gross = chars / 5 / mins;
  const net = Math.max(0, gross - err / mins);
  const acc = chars > 0 ? Math.max(0, ((chars - err) / chars) * 100) : 0;
  const level = net >= 80 ? "Professional / very fast" : net >= 60 ? "Fast" : net >= 40 ? "Average (most adults)" : net >= 25 ? "Below average" : "Beginner";
  return { net: r1(net), gross: r1(gross), acc: r1(acc), cpm: Math.round(chars / mins), kph: nfmt(Math.round((chars / mins) * 60)), level };
};

// ------------------------------------------------------------------ time card (weekly)
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
function dayMinutes(raw: string, roundTo: number, label: string) {
  const s = raw.trim().toLowerCase();
  if (!s || s === "off" || s === "-") return 0;
  let lunch = 0;
  const lm = s.match(/(?:\s|^)(?:l|lunch|b|break)\s*(\d+)\s*$/);
  const body = lm ? s.slice(0, lm.index).trim() : s;
  if (lm) lunch = Number(lm[1]);
  let total = 0;
  for (const seg of body.split(/[,;&]+/).map((x) => x.trim()).filter(Boolean)) {
    const [a, b] = seg.split(/\s*(?:-|–|to)\s*/);
    if (!a || !b) throw new InputError(`${label}: write shifts like 9:00-17:30 (add "L30" for a 30-minute unpaid break).`);
    const rd = (m: number) => (roundTo ? Math.round(m / roundTo) * roundTo : m);
    let d = rd(parseClock(b, label)) - rd(parseClock(a, label));
    if (d < 0) d += 1440;
    total += d;
  }
  return Math.max(0, total - lunch);
}
const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
export const timeCard: Calc = (v) => {
  const roundTo = [0, 5, 6, 15][pick(v.rounding, 4)];
  const mins = DAY_KEYS.map((k, i) => dayMinutes(txt(v, k), roundTo, DAYS[i]));
  const total = mins.reduce((a, b) => a + b, 0);
  const daily = pick(v.otRule, 3);
  let reg = total, ot = 0, dt = 0;
  if (daily === 0) { ot = Math.max(0, total - 2400); reg = total - ot; }
  else if (daily === 1) {
    for (const m of mins) { const o = Math.max(0, Math.min(m, 720) - 480), d = Math.max(0, m - 720); ot += o; dt += d; }
    const weeklyExtra = Math.max(0, total - ot - dt - 2400); ot += weeklyExtra; reg = total - ot - dt;
  }
  const rate = pos(v.rate, 20), mult = pos(v.mult, 1.5);
  const pay = (reg / 60) * rate + (ot / 60) * rate * mult + (dt / 60) * rate * 2;
  return { total: hm(total), decimal: r2(total / 60), regular: r2(reg / 60), ot: r2(ot / 60), dt: r2(dt / 60), pay: r2(pay), days: DAYS.map((d, i) => `${d}: ${mins[i] ? `${hm(mins[i])} (${r2(mins[i] / 60)} h)` : "—"}`).join("\n") };
};
function tvmZero(n: number, iy: number, pv: number, pmt: number, fv: number, py: number, bgn: number) {
  const i = iy / 100 / py;
  if (Math.abs(i) < 1e-12) return pv + pmt * n + fv;
  const g = (1 + i) ** n;
  return pv * g + pmt * (1 + i * bgn) * ((g - 1) / i) + fv;
}
export const financial: Calc = (v) => {
  const s = pick(v.solve, 5), py = Math.max(1, Math.round(pos(v.py, 12))), bgn = pick(v.timing, 2);
  let n = num(v.n, 360), iy = num(v.iy, 6), pv = num(v.pv, 200000), pmt = num(v.pmt, 0), fv = num(v.fv, 0);
  const i = iy / 100 / py;
  if (s === 0) { const g = (1 + i) ** n; fv = Math.abs(i) < 1e-12 ? -(pv + pmt * n) : -(pv * g + pmt * (1 + i * bgn) * ((g - 1) / i)); }
  else if (s === 1) { const g = (1 + i) ** n; pv = Math.abs(i) < 1e-12 ? -(fv + pmt * n) : -(fv + pmt * (1 + i * bgn) * ((g - 1) / i)) / g; }
  else if (s === 2) { const g = (1 + i) ** n; if (n <= 0) throw new InputError("N must be above 0 to solve for PMT."); pmt = Math.abs(i) < 1e-12 ? -(pv + fv) / n : -(pv * g + fv) / ((1 + i * bgn) * ((g - 1) / i)); }
  else if (s === 3) {
    if (Math.abs(i) < 1e-12) { if (!pmt) throw new InputError("With 0% interest, PMT can't be 0."); n = -(pv + fv) / pmt; }
    else { const k = pmt * (1 + i * bgn) / i; const x = (k - fv) / (pv + k); if (!(x > 0)) throw new InputError("No solution — check the signs (money paid out is negative, received is positive)."); n = Math.log(x) / Math.log(1 + i); }
  } else {
    let lo = -99 * py, hi = 1000 * py;
    const f = (r: number) => tvmZero(n, r, pv, pmt, fv, py, bgn);
    let flo = f(lo), fhi = f(hi);
    if (flo * fhi > 0) { lo = 1e-9; flo = f(lo); }
    if (flo * fhi > 0) throw new InputError("No interest rate solves this — check the signs: money you pay out is negative, money you receive is positive.");
    for (let k = 0; k < 300; k++) { const m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; } }
    iy = (lo + hi) / 2;
  }
  const solved = [fv, pv, pmt, n, iy][s];
  const totalPmt = pmt * n;
  const interest = totalPmt + pv + fv;
  return { result: s === 3 ? r2(solved) : s === 4 ? `${sig(solved, 8)}%` : money(solved, "$", 2), n: r2(n), iy: sig(iy, 8), pv: r2(pv), pmt: r2(pmt), fv: r2(fv), totals: `Total of payments ${money(Math.abs(totalPmt), "$", 2)}; total interest ${money(Math.abs(interest), "$", 2)}`, years: r2(n / py) };
};

// ------------------------------------------------------------------ time zone meeting planner
const TZ: Record<string, string> = { "new york": "America/New_York", nyc: "America/New_York", boston: "America/New_York", miami: "America/New_York", toronto: "America/Toronto", chicago: "America/Chicago", dallas: "America/Chicago", houston: "America/Chicago", denver: "America/Denver", phoenix: "America/Phoenix", "los angeles": "America/Los_Angeles", la: "America/Los_Angeles", "san francisco": "America/Los_Angeles", seattle: "America/Los_Angeles", vancouver: "America/Vancouver", anchorage: "America/Anchorage", honolulu: "Pacific/Honolulu", "mexico city": "America/Mexico_City", "sao paulo": "America/Sao_Paulo", "buenos aires": "America/Argentina/Buenos_Aires", bogota: "America/Bogota", lima: "America/Lima", santiago: "America/Santiago", london: "Europe/London", dublin: "Europe/Dublin", lisbon: "Europe/Lisbon", paris: "Europe/Paris", berlin: "Europe/Berlin", madrid: "Europe/Madrid", rome: "Europe/Rome", amsterdam: "Europe/Amsterdam", brussels: "Europe/Brussels", zurich: "Europe/Zurich", stockholm: "Europe/Stockholm", oslo: "Europe/Oslo", warsaw: "Europe/Warsaw", athens: "Europe/Athens", istanbul: "Europe/Istanbul", kyiv: "Europe/Kyiv", moscow: "Europe/Moscow", cairo: "Africa/Cairo", lagos: "Africa/Lagos", nairobi: "Africa/Nairobi", johannesburg: "Africa/Johannesburg", dubai: "Asia/Dubai", riyadh: "Asia/Riyadh", tehran: "Asia/Tehran", karachi: "Asia/Karachi", delhi: "Asia/Kolkata", "new delhi": "Asia/Kolkata", mumbai: "Asia/Kolkata", bangalore: "Asia/Kolkata", kolkata: "Asia/Kolkata", kathmandu: "Asia/Kathmandu", dhaka: "Asia/Dhaka", bangkok: "Asia/Bangkok", jakarta: "Asia/Jakarta", singapore: "Asia/Singapore", "kuala lumpur": "Asia/Kuala_Lumpur", manila: "Asia/Manila", "hong kong": "Asia/Hong_Kong", shanghai: "Asia/Shanghai", beijing: "Asia/Shanghai", taipei: "Asia/Taipei", seoul: "Asia/Seoul", tokyo: "Asia/Tokyo", perth: "Australia/Perth", adelaide: "Australia/Adelaide", brisbane: "Australia/Brisbane", sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", auckland: "Pacific/Auckland", utc: "UTC", gmt: "UTC" };
function offsetMin(zone: string, ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.round((Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")) - ms) / 60000);
}
function zoneOf(name: string) {
  const s = name.trim();
  const m = s.match(/^(?:utc|gmt)\s*([+-−])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) return { label: s.toUpperCase(), fixed: (m[1] === "+" ? 1 : -1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) };
  const z = TZ[s.toLowerCase()] ?? (s.includes("/") ? s : "");
  if (!z) throw new InputError(`"${s}" isn't in the list — use a major city (e.g. London, Dhaka, Sydney), an IANA zone like Europe/Paris or UTC+5:30.`);
  try { new Intl.DateTimeFormat("en-US", { timeZone: z }); } catch { throw new InputError(`"${s}" isn't a valid time zone.`); }
  return { label: s.replace(/\b\w/g, (c) => c.toUpperCase()), zone: z };
}
export const timeZoneMeeting: Calc = (v) => {
  const list = txt(v, "cities").split(/[;,\n]+/).map((x) => x.trim()).filter(Boolean).map(zoneOf);
  if (list.length < 2) throw new InputError("Enter at least two cities, separated by commas.");
  const day = dateIn(v, "date", Math.floor(Date.now() / 86400000));
  const t0 = parseClock(txt(v, "time") || "09:00", "Meeting time");
  const ws = Math.round(pos(v.start, 9) * 60), we = Math.round(pos(v.end, 17) * 60);
  const noonUtc = day * 86400000 + 12 * 3600000;
  const offs = list.map((c) => ("fixed" in c && c.fixed !== undefined ? c.fixed : offsetMin(c.zone!, noonUtc)));
  const utcMin = t0 - offs[0];
  const fmt = (min: number) => { const d = Math.floor(min / 1440), m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}${d ? ` (${d > 0 ? "next day" : "previous day"})` : ""}`; };
  const times = list.map((c, i) => `${c.label}: ${fmt(utcMin + offs[i])} (UTC${offs[i] >= 0 ? "+" : "−"}${Math.floor(Math.abs(offs[i]) / 60)}${Math.abs(offs[i]) % 60 ? `:${String(Math.abs(offs[i]) % 60).padStart(2, "0")}` : ""})`).join("\n");
  const ok: number[] = [];
  for (let u = -offs[0]; u < 1440 - offs[0]; u += 30) if (offs.every((o) => { const l = ((u + o) % 1440 + 1440) % 1440; return l >= ws && l + 30 <= we; })) ok.push(u);
  const windows: string[] = [];
  for (let k = 0; k < ok.length; k++) { let j = k; while (j + 1 < ok.length && ok[j + 1] === ok[j] + 30) j++; windows.push(`${fmt(ok[k] + offs[0])}–${fmt(ok[j] + 30 + offs[0])}`); k = j; }
  return { times, overlap: windows.length ? `${windows.join(", ")} in ${list[0].label} time` : `No time inside ${pos(v.start, 9)}:00–${pos(v.end, 17)}:00 for everyone — widen the hours or split the meeting`, best: ok.length ? fmt(ok[Math.floor(ok.length / 2)] + offs[0]) + ` ${list[0].label} time` : "—", date: dayText(day) };
};

// ------------------------------------------------------------------ GPS coordinates distance
function parsePoint(raw: string) {
  const s = raw.trim();
  const dms = s.match(/^(\d+)[°\s]+(\d+)['′\s]+(\d+(?:\.\d+)?)["″]?\s*([NS])[,\s]+(\d+)[°\s]+(\d+)['′\s]+(\d+(?:\.\d+)?)["″]?\s*([EW])$/i);
  if (dms) {
    const lat = (Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3]) / 3600) * (/s/i.test(dms[4]) ? -1 : 1);
    const lon = (Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7]) / 3600) * (/w/i.test(dms[8]) ? -1 : 1);
    return { name: s, lat, lon };
  }
  return findPlace(s);
}
export const gpsDistance: Calc = (v) => {
  const a = parsePoint(txt(v, "a")), b = parsePoint(txt(v, "b"));
  const km = gcKm(a, b), brg = bearing(a, b), back = (bearing(b, a) + 180) % 360;
  const mid = midpoint([a, b]);
  return { km: r2(km), mi: r2(km / 1.609344), nm: r2(km / 1.852), bearing: `${r1(brg)}° (${compass(brg)})`, final: `${r1(back)}° (${compass(back)})`, mid: latLonText(mid), from: `${a.name} → ${b.name}` };
};

// ------------------------------------------------------------------ ranked-choice voting (IRV)
export const rankedChoice: Calc = (v) => {
  const ballots = txt(v, "ballots").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^(\d+)\s*[:x×]\s*(.+)$/i);
    const count = m ? Number(m[1]) : 1;
    const ranks = (m ? m[2] : s).split(/\s*>\s*/).map((x) => x.trim()).filter(Boolean);
    if (!ranks.length) throw new InputError(`"${s}" must look like 12: A > B > C.`);
    return { count, ranks };
  });
  if (!ballots.length) throw new InputError("Enter ballots like 12: A > B > C; 9: B > C > A.");
  const cands = [...new Set(ballots.flatMap((b) => b.ranks))];
  const alive = new Set(cands);
  const firstRound: Record<string, number> = {};
  const log: string[] = [];
  let winner = "";
  for (let round = 1; round <= cands.length; round++) {
    const tally: Record<string, number> = Object.fromEntries([...alive].map((c) => [c, 0]));
    let exhausted = 0;
    for (const b of ballots) { const top = b.ranks.find((r) => alive.has(r)); if (top) tally[top] += b.count; else exhausted += b.count; }
    if (round === 1) Object.assign(firstRound, tally);
    const cont = Object.values(tally).reduce((a, x) => a + x, 0);
    const sorted = Object.entries(tally).sort((p, q) => q[1] - p[1]);
    log.push(`Round ${round}: ${sorted.map(([c, n]) => `${c} ${n} (${r1((n / cont) * 100)}%)`).join(", ")}${exhausted ? `; exhausted ${exhausted}` : ""}`);
    if (sorted[0][1] * 2 > cont || alive.size === 1) { winner = sorted[0][0]; break; }
    const low = Math.min(...sorted.map(([, n]) => n));
    const lowest = sorted.filter(([, n]) => n === low).map(([c]) => c).sort((p, q) => (firstRound[p] ?? 0) - (firstRound[q] ?? 0) || p.localeCompare(q))[0];
    alive.delete(lowest);
    log.push(`  → ${lowest} eliminated; their ballots move to the next choice`);
  }
  const total = ballots.reduce((a, b) => a + b.count, 0);
  const plural = Object.entries(firstRound).sort((p, q) => q[1] - p[1])[0][0];
  return { winner, rounds: log.join("\n"), ballots: total, candidates: cands.length, plurality: plural === winner ? `Same winner as first-past-the-post (${plural})` : `First-past-the-post would have elected ${plural}` };
};

export const techMiscCustomCalculators: Record<string, Calc> = {
  "cs2-trade-up-calculator": cs2TradeUp,
  "dnd-dpr-calculator": dndDpr,
  "minecraft-nether-portal-calculator": netherPortal,
  "minecraft-xp-calculator": minecraftXp,
  "mee6-level-calculator": mee6,
  "love-calculator": love,
  "scrabble-score-calculator": scrabble,
  "typing-speed-calculator": typingSpeed,
  "time-card-calculator": timeCard,
  "financial-calculator": financial,
  "time-zone-meeting-calculator": timeZoneMeeting,
  "gps-coordinates-distance-calculator": gpsDistance,
  "ranked-choice-voting-calculator": rankedChoice,
};
