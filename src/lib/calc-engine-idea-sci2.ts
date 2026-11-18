/**
 * Idea build, batch sci2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Science > Computer, Network & IT (15) and
 * Earth, Weather & Environment (14) = 29 tools.
 * Formulas: free-space path loss 20log₁₀(d km) + 20log₁₀(f MHz) + 32.44; TCP throughput ≤ window/RTT and Mathis ≈ (MSS/RTT)·1.22/√p;
 * birthday bound p ≈ 1 − e^(−n²/2N); Base64 4⌈n/3⌉ (+CRLF every 76 for MIME); ISA standard atmosphere (T₀ 288.15 K, L 0.0065 K/m,
 * exponent 5.25588); Hargreaves ET₀ = 0.0023·Ra·(T+17.8)·√(Tmax−Tmin) with FAO-56 extraterrestrial radiation; Saffir–Simpson
 * (1-min sustained, mph 74/96/111/130/157) and Enhanced Fujita (3-s gust, mph 65/86/111/136/166/>200) scales; shallow-water wave speed √(gd);
 * Manning's equation; Weibull plotting position T = (n+1)/m; Darcy's law; USLE A = R·K·LS·C·P; IPCC AR6 GWP-100 (CH₄ fossil 29.8,
 * non-fossil 27.0, N₂O 273) and AR5 (CH₄ 28, N₂O 265). Cloud list prices (AWS us-east-1: S3 Standard $0.023/GB-month for the first 50 TB,
 * internet egress $0.09/GB after the first 100 GB free each month) are editable defaults — check current pricing.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-300 ? 0 : x, 5);
const $ = (x: number) => money(x, "$", 2);
const $4 = (x: number) => money(x, "$", x < 1 ? 4 : 2);
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const bytes = (b: number) => { const u = ["B", "KB", "MB", "GB", "TB", "PB"]; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return `${f(b)} ${u[i]}`; };

// ---- Computer, network & IT ----
export const streamBw: Calc = (v) => {
  const sd = Z(v, "s", 0), hd = Z(v, "h", 2), uhd = Z(v, "u", 1), call = Z(v, "c", 1), oth = Z(v, "o", 10), head = P(v, "x", 25, "Headroom") / 100, rates = [Z(v, "rs", 3), Z(v, "rh", 5), Z(v, "ru", 15), Z(v, "rc", 4)];
  const need = sd * rates[0] + hd * rates[1] + uhd * rates[2] + call * rates[3] + oth, tot = need * (1 + head);
  return { b: `Plan for at least ${f(Math.ceil(tot))} Mbps download`, d: `${f(need)} Mbps in use at once + ${f(head * 100)}% headroom`, note: `Data per hour: HD ≈ ${f((rates[1] * 3600) / 8 / 1000)} GB, 4K ≈ ${f((rates[2] * 3600) / 8 / 1000)} GB · default rates are Netflix's recommended 3 / 5 / 15 Mbps` };
};
export const nasNeeds: Calc = (v) => {
  const ph = Z(v, "p", 20000), pm = Z(v, "a", 4), vh = Z(v, "v", 100), vg = Z(v, "g", 2), docs = Z(v, "d", 50), oth = Z(v, "o", 200), gr = Z(v, "r", 20) / 100, y = Math.max(1, num(v.y, 3)), raid = pick(v.k, 4), drives = Math.max(2, Math.round(num(v.n, 4)));
  const now = (ph * pm) / 1000 + vh * vg + docs + oth, fut = now * (1 + gr) ** y, eff = [drives / drives, (drives - 1) / drives, (drives - 2) / drives, 0.5][raid];
  const raw = fut / eff, per = raw / drives;
  return { n: `Need ≈ ${f(Math.ceil(fut))} GB usable in ${f(y)} years (${f(now)} GB today)`, d: `${drives} drives in ${["no RAID / JBOD", "RAID 5 / SHR", "RAID 6 / SHR-2", "RAID 1 / 10"][raid]}: at least ${f(Math.ceil(per / 1000))} TB each (${f(raw / 1000)} TB raw)`, note: "Leave 20% free space for performance · RAID is not a backup — keep a copy off-site" };
};
export const backupSize: Calc = (v) => {
  const full = P(v, "f", 500, "Full backup size"), ch = Z(v, "c", 2) / 100, comp = Z(v, "z", 30) / 100, fpm = Math.max(1, num(v.m, 4)), days = Math.max(1, num(v.d, 30)), type = pick(v.t, 2);
  const L = Math.max(1, Math.round(30 / fpm)), cycles = Math.ceil(days / L), fulls = cycles, daily = full * ch;
  const parts = type === 0 ? daily * (days - fulls) : cycles * daily * ((L - 1) * L) / 2, raw = fulls * full + Math.max(0, parts), stored = raw * (1 - comp);
  return { s: `≈ ${f(stored)} GB of backup storage`, d: `${fulls} full × ${f(full)} GB + ${type === 0 ? "incrementals" : "differentials"} ${f(Math.max(0, parts))} GB, ${f(comp * 100)}% compression/dedup`, note: `${days}-day retention, a full every ${L} days, ${f(ch * 100)}% daily change · 3-2-1 rule: 3 copies, 2 media, 1 off-site` };
};
export const ec2Cost: Calc = (v) => {
  const n = Math.max(1, num(v.n, 2)), rate = P(v, "r", 0.0832, "Hourly rate"), hrs = Math.min(744, Z(v, "h", 730)), disc = Z(v, "d", 0) / 100, gb = Z(v, "s", 50), sr = Z(v, "g", 0.08), eg = Z(v, "e", 0), er = Z(v, "x", 0.09);
  const comp = n * rate * hrs * (1 - disc), stor = n * gb * sr, egress = Math.max(0, eg - 100) * er, tot = comp + stor + egress;
  return { m: `${$(tot)} a month (${$(tot * 12)} a year)`, d: `Compute ${$(comp)} · EBS ${$(stor)} · data out ${$(egress)}`, note: `${n} instance${n > 1 ? "s" : ""} × ${$4(rate)}/h × ${f(hrs)} h${disc ? ` − ${f(disc * 100)}% Savings Plan/RI` : ""} · default $0.0832/h = t3.large Linux on-demand, gp3 $0.08/GB-month (us-east-1) — check current AWS prices` };
};
export const s3Cost: Calc = (v) => {
  const gb = Z(v, "g", 1000), sr = Z(v, "s", 0.023), put = Z(v, "p", 100), get = Z(v, "q", 1000), pr = Z(v, "a", 0.005), gr = Z(v, "b", 0.0004), eg = Z(v, "e", 200), er = Z(v, "x", 0.09);
  const st = gb * sr, req = put * pr + get * gr, out = Math.max(0, eg - 100) * er, tot = st + req + out;
  return { m: `${$(tot)} a month`, d: `Storage ${$(st)} · requests ${$(req)} · egress ${$(out)}`, note: `S3 Standard us-east-1 defaults: $0.023/GB-month, PUT $0.005 and GET $0.0004 per 1,000, egress $0.09/GB after 100 GB free · Infrequent Access and Glacier are cheaper for cold data` };
};
export const egress: Calc = (v) => {
  const tb = Z(v, "t", 5), r1 = Z(v, "a", 0.09), r2 = Z(v, "b", 0.085), r3 = Z(v, "c", 0.07), free = Z(v, "f", 100);
  let gb = Math.max(0, tb * 1000 - free), cost = 0; const tiers: [number, number][] = [[10000, r1], [40000, r2], [100000, r3], [Infinity, r3 * 0.71]];
  for (const [size, r] of tiers) { const x = Math.min(gb, size); cost += x * r; gb -= x; if (gb <= 0) break; }
  return { c: `${$(cost)} a month for ${f(tb)} TB out`, e: `Effective ${$4(cost / Math.max(1, tb * 1000))}/GB · ${$(cost * 12)} a year`, note: `Tiered: first 10 TB at ${$4(r1)}, next 40 TB ${$4(r2)}, next 100 TB ${$4(r3)} (AWS-style defaults) after ${f(free)} GB free · a CDN or committed-use deal can cut this a lot` };
};
export const tcpWin: Calc = (v) => {
  const w = P(v, "w", 64, "Window") * 1024, rtt = P(v, "r", 50, "RTT") / 1000, link = Z(v, "l", 1000), loss = Z(v, "p", 0) / 100, mss = P(v, "m", 1460, "MSS");
  const thr = (w * 8) / rtt / 1e6, mathis = loss > 0 ? ((mss * 8) / rtt) * (1.22 / Math.sqrt(loss)) / 1e6 : Infinity, eff = Math.min(thr, mathis, link || Infinity), bdp = ((link * 1e6) * rtt) / 8;
  return { t: `Max throughput ≈ ${f(eff)} Mbps`, d: `Window limit ${f(thr)} Mbps${Number.isFinite(mathis) ? ` · loss limit (Mathis) ${f(mathis)} Mbps` : ""}`, note: link ? `Bandwidth-delay product ${bytes(bdp)} — the window must be at least this to fill a ${f(link)} Mbps link (window scaling)` : "Throughput ≤ window ÷ RTT" };
};
export const wifiRange: Calc = (v) => {
  const tx = num(v.t, 20), gt = num(v.a, 3), gr = num(v.b, 0), sens = num(v.s, -75), fq = [2437, 5500, 6500][pick(v.f, 3)], walls = Z(v, "w", 2), wl = Z(v, "l", 5), margin = Z(v, "m", 10);
  const budget = tx + gt + gr - sens - walls * wl - margin, dkm = 10 ** ((budget - 32.44 - 20 * Math.log10(fq)) / 20);
  return { r: `Estimated range ≈ ${f(dkm * 1000)} m (${f(dkm * 3280.84)} ft)`, b: `Link budget ${f(budget)} dB after ${walls} walls × ${f(wl)} dB and ${f(margin)} dB fade margin`, note: `Free-space model at ${["2.4", "5", "6"][pick(v.f, 3)]} GHz — real homes vary a lot · 5/6 GHz is faster but shorter range than 2.4 GHz` };
};
export const gpuHash: Calc = (v) => {
  const n = Math.max(1, num(v.n, 1)), hr = P(v, "h", 100, "Hashrate"), w = P(v, "w", 250, "Power"), price = Z(v, "p", 0.15), rev = Z(v, "r", 0);
  const kwh = (n * w * 24) / 1000, cost = kwh * price;
  return { e: `${f(hr / w)} MH/s per watt · total ${f(n * hr)} MH/s at ${f(n * w)} W`, c: `Electricity ${f(kwh)} kWh/day = ${$(cost)}/day (${$(cost * 30)}/month)`, note: rev ? `Net ${$(rev * n - cost)}/day after power` : "Enter revenue per GPU per day (from a mining pool calculator) to see profit · undervolting often improves efficiency 20–30%" };
};
export const hashCollision: Calc = (v) => {
  const bits = P(v, "b", 64, "Hash bits"), n = P(v, "n", 1e6, "Items"), N = 2 ** bits, p = -Math.expm1(-(n * n) / (2 * N)), half = Math.sqrt(2 * N * Math.LN2);
  return { p: `Collision probability ≈ ${p < 1e-15 ? fmt(p, 3) : f(p * 100) + "%"}`, h: `50% chance after about ${f(half)} items (≈ 2^${f(bits / 2)})`, note: "Birthday bound p ≈ 1 − e^(−n²/2N) · MD5 (128-bit) and SHA-1 are broken for security; use SHA-256" };
};
export const base64: Calc = (v) => {
  const n = P(v, "n", 1000000, "Input size"), mime = pick(v.m, 2) === 1, pad = pick(v.p, 2) === 0;
  const out = pad ? 4 * Math.ceil(n / 3) : Math.ceil((n * 4) / 3), lines = mime ? Math.ceil(out / 76) * 2 : 0, tot = out + lines;
  return { s: `Base64 size = ${bytes(tot)} (${f(tot)} bytes)`, r: `${f((tot / n - 1) * 100)}% larger than ${bytes(n)}`, note: `4 characters per 3 bytes${pad ? " with = padding" : " (no padding, e.g. base64url)"}${mime ? " + CRLF every 76 characters (MIME email)" : ""} · decoding: ${f(Math.floor((tot - lines) * 3 / 4))} bytes` };
};
export const rateLimit: Calc = (v) => {
  const lim = P(v, "l", 1000, "Limit"), win = [1, 60, 3600, 86400][pick(v.w, 4)], calls = P(v, "c", 50000, "Calls needed"), conc = Math.max(1, num(v.k, 1)), burst = Z(v, "b", 0);
  const rps = lim / win, tSec = Math.max(0, (calls - burst) / rps);
  return { r: `${f(rps)} requests per second sustained (${f(rps * 60)} per minute)`, t: `${f(calls)} calls take ≈ ${tSec < 120 ? `${f(tSec)} s` : tSec < 7200 ? `${f(tSec / 60)} min` : `${f(tSec / 3600)} h`}`, note: `Space requests ${f(1000 / rps)} ms apart${conc > 1 ? ` · with ${conc} parallel workers each waits ${f((1000 * conc) / rps)} ms` : ""} · back off exponentially on HTTP 429` };
};
export const dbGrowth: Calc = (v) => {
  const s0 = Z(v, "s", 50), rows = Z(v, "r", 100000), rb = P(v, "b", 500, "Row size"), idx = Z(v, "i", 30) / 100, gr = Z(v, "g", 0) / 100, m = Math.max(1, Math.round(num(v.m, 24)));
  let size = s0, r = rows; for (let k = 0; k < m; k++) { size += (r * 30 * rb * (1 + idx)) / 1e9; r *= 1 + gr; }
  return { s: `≈ ${f(size)} GB after ${m} months`, d: `${f(((rows * 30 * rb * (1 + idx)) / 1e9))} GB added in month 1 (${f(rows)} rows/day × ${f(rb)} B + ${f(idx * 100)}% indexes)`, note: `${gr ? `Row volume grows ${f(gr * 100)}% a month · ` : ""}add space for backups, WAL/logs and bloat (×1.5–2)` };
};
export const techDebt: Calc = (v) => {
  const dev = Math.max(1, num(v.d, 8)), sal = P(v, "s", 150000, "Loaded cost"), pct = Z(v, "p", 25) / 100, fix = Z(v, "f", 400), rate = sal / 1800;
  const yr = dev * sal * pct, fixCost = fix * rate, pay = fixCost / (yr * 0.6 || 1);
  return { c: `≈ ${$(yr)} a year spent working around debt`, f: fix ? `Fixing it: ${f(fix)} h ≈ ${$(fixCost)} — pays back in ${f(pay * 12)} months if it removes 60% of the drag` : `${f(pct * 100)}% of ${dev} developers' time`, note: "Surveys often put tech-debt time at 20–40% of engineering effort · track it like a loan: principal (fix cost) and interest (ongoing drag)" };
};
export const coverage: Calc = (v) => {
  const cov = Z(v, "c", 820), tot = P(v, "t", 1000, "Total lines"), bc = Z(v, "b", 0), bt = Z(v, "x", 0), target = Z(v, "g", 80) / 100;
  const pc = cov / tot, need = Math.max(0, Math.ceil(target * tot - cov));
  return { c: `Line coverage = ${f(pc * 100)}%`, b: bt ? `Branch coverage ${f((bc / bt) * 100)}%` : `${need ? `${need} more lines to reach ${f(target * 100)}%` : `Meets the ${f(target * 100)}% target`}`, note: "Coverage shows what ran, not what was checked — pair it with meaningful assertions and mutation testing" };
};
// ---- Earth, weather & environment ----
export const baroAlt: Calc = (v) => {
  const m = pick(v.m, 2), P0 = P(v, "s", 1013.25, "Sea-level pressure");
  if (m === 0) { const h = num(v.h, 1500), p = P0 * (1 - (0.0065 * h) / 288.15) ** 5.25588; return { r: `Pressure ≈ ${f(p)} hPa at ${f(h)} m`, d: `${f(p / 33.8639)} inHg · ${f((p / P0) * 100)}% of sea level · air temperature (ISA) ${f(15 - 0.0065 * h)} °C`, note: "ISA standard atmosphere, valid to 11 km" }; }
  const p = P(v, "p", 850, "Pressure"), h = (288.15 / 0.0065) * (1 - (p / P0) ** (1 / 5.25588));
  return { r: `Altitude ≈ ${f(h)} m (${f(h * 3.28084)} ft)`, d: `From ${f(p)} hPa with a sea-level reference of ${f(P0)} hPa`, note: "Pressure altitude · weather changes the sea-level pressure, so set it from a local report (QNH)" };
};
export const slp: Calc = (v) => {
  const p = P(v, "p", 950, "Station pressure"), h = num(v.h, 500), T = num(v.t, 15);
  const p0 = p * (1 - (0.0065 * h) / (T + 0.0065 * h + 273.15)) ** -5.257;
  return { s: `Sea-level pressure ≈ ${f(p0)} hPa (${f(p0 / 33.8639)} inHg)`, d: `Station ${f(p)} hPa at ${f(h)} m, ${f(T)} °C`, note: p0 < 1000 ? "Below 1,000 hPa — lower pressure often means unsettled weather" : "Standard sea-level pressure is 1,013.25 hPa" };
};
export const et0: Calc = (v) => {
  const lat = num(v.l, 35) * (Math.PI / 180), J = Math.min(366, Math.max(1, Math.round(num(v.d, 180)))), tx = num(v.a, 32), tn = num(v.b, 18), kc = Z(v, "k", 1);
  if (tx < tn) throw new InputError("Max temperature must be at least the min.");
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365), dec = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39), ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(dec))));
  const Ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.sin(ws)), et = 0.0023 * (Ra * 0.408) * ((tx + tn) / 2 + 17.8) * Math.sqrt(tx - tn);
  return { e: `Reference ET₀ ≈ ${f(et)} mm/day`, c: `Crop ET (Kc ${f(kc)}) ${f(et * kc)} mm/day · ${f(et * kc * 7)} mm/week`, note: `Hargreaves method · extraterrestrial radiation ${f(Ra)} MJ/m²/day · 1 mm over 1 m² = 1 L (≈ 0.62 gal per 10 ft²)` };
};
export const hurricane: Calc = (v) => {
  const w = Z(v, "w", 115), u = pick(v.u, 3), mph = [w, w / 1.60934, w * 1.15078][u];
  const cat = mph >= 157 ? 5 : mph >= 130 ? 4 : mph >= 111 ? 3 : mph >= 96 ? 2 : mph >= 74 ? 1 : 0;
  return { c: cat ? `Category ${cat} hurricane${cat >= 3 ? " (major)" : ""}` : mph >= 39 ? "Tropical storm (39–73 mph)" : "Tropical depression (under 39 mph)", w: `${f(mph)} mph · ${f(mph * 1.60934)} km/h · ${f(mph / 1.15078)} kt (1-minute sustained)`, note: ["", "Some damage to roofs, gutters, trees", "Extensive damage; near-total power loss", "Devastating damage", "Catastrophic damage; long power outages", "Catastrophic; many homes destroyed"][cat] || "Saffir–Simpson scale starts at 74 mph" };
};
export const tornado: Calc = (v) => {
  const w = Z(v, "w", 140), u = pick(v.u, 2), mph = u === 0 ? w : w / 1.60934;
  const ef = mph > 200 ? 5 : mph >= 166 ? 4 : mph >= 136 ? 3 : mph >= 111 ? 2 : mph >= 86 ? 1 : mph >= 65 ? 0 : -1;
  return { c: ef >= 0 ? `EF${ef} tornado` : "Below EF0 (under 65 mph)", w: `${f(mph)} mph (${f(mph * 1.60934)} km/h) estimated 3-second gust`, note: ef >= 0 ? `${["Light damage", "Moderate damage", "Considerable damage", "Severe damage", "Devastating damage", "Incredible damage"][ef]} · ranges: EF0 65–85, EF1 86–110, EF2 111–135, EF3 136–165, EF4 166–200, EF5 > 200 mph` : "The Enhanced Fujita scale is assigned from damage surveys" };
};
export const tsunami: Calc = (v) => {
  const d = P(v, "d", 4000, "Depth"), dist = Z(v, "x", 1000), s = Math.sqrt(9.80665 * d);
  return { s: `Wave speed ≈ ${f(s)} m/s (${f(s * 3.6)} km/h, ${f(s * 2.23694)} mph)`, t: dist ? `Travels ${f(dist)} km in ≈ ${f(dist * 1000 / s / 60)} minutes` : "Add a distance for travel time", note: "Shallow-water wave speed √(gd) — in 4 km deep ocean that's jet-airliner speed; it slows and grows taller near shore" };
};
export const river: Calc = (v) => {
  const m = pick(v.m, 2), w = P(v, "w", 12, "Width"), dep = P(v, "d", 1.5, "Mean depth");
  const A = w * dep;
  if (m === 0) { const vel = P(v, "v", 0.8, "Velocity"), k = Z(v, "k", 0.85), Q = A * vel * (k || 1); return { q: `Discharge ≈ ${f(Q)} m³/s (${f(Q * 35.3147)} ft³/s)`, d: `Area ${f(A)} m² × velocity ${f(vel)} m/s × surface correction ${f(k || 1)}`, note: "Floats measure surface velocity; multiply by ~0.85 for the mean" }; }
  const n = P(v, "n", 0.035, "Manning's n"), S = P(v, "s", 0.001, "Slope"), Pw = w + 2 * dep, R = A / Pw, vel = (1 / n) * R ** (2 / 3) * Math.sqrt(S), Q = A * vel;
  return { q: `Discharge ≈ ${f(Q)} m³/s (${f(Q * 35.3147)} ft³/s)`, d: `Manning velocity ${f(vel)} m/s · hydraulic radius ${f(R)} m (rectangular channel)`, note: "n: clean natural channel 0.030–0.040, weedy 0.05–0.08, concrete 0.013" };
};
export const returnPeriod: Calc = (v) => {
  const n = P(v, "n", 50, "Years of record"), rk = P(v, "r", 2, "Rank"), T0 = Z(v, "t", 0), y = Math.max(1, num(v.y, 30));
  const T = T0 || (n + 1) / rk, pY = 1 / T, pN = 1 - (1 - pY) ** y;
  return { t: `Return period ≈ ${f(T)} years`, p: `${f(pY * 100)}% chance in any year · ${f(pN * 100)}% chance at least once in ${f(y)} years`, note: `${T0 ? "Using your return period" : `Weibull: T = (n + 1)/rank = (${f(n)} + 1)/${f(rk)}`} · a "100-year flood" has a 26% chance in a 30-year mortgage` };
};
export const darcy: Calc = (v) => {
  const K = P(v, "k", 1e-4, "Hydraulic conductivity"), A = P(v, "a", 100, "Area"), dh = Z(v, "h", 2), L = P(v, "l", 100, "Distance"), ne = P(v, "n", 0.25, "Porosity");
  const i = dh / L, Q = K * A * i, q = K * i;
  return { q: `Flow = ${f(Q)} m³/s (${f(Q * 86400)} m³/day)`, v: `Darcy flux ${f(q)} m/s · seepage velocity ${f(q / ne)} m/s (${f((q / ne) * 86400)} m/day)`, note: "Q = KA(Δh/L) · K: gravel 10⁻²–10⁻³, sand 10⁻³–10⁻⁵, silt 10⁻⁵–10⁻⁷, clay < 10⁻⁹ m/s" };
};
export const usle: Calc = (v) => {
  const [R, K, LS, C, Pp] = ["r", "k", "l", "c", "p"].map((k, i) => Z(v, k, [125, 0.3, 1.2, 0.2, 1][i])), A = R * K * LS * C * Pp;
  return { a: `Soil loss ≈ ${f(A)} tons/acre/year (${f(A * 2.2417)} t/ha/yr)`, f: `R ${f(R)} × K ${f(K)} × LS ${f(LS)} × C ${f(C)} × P ${f(Pp)}`, note: A > 5 ? "Above the typical tolerable loss (T ≈ 5 t/ac/yr) — cover crops, contouring or terraces (lower C and P) help" : "Within the typical tolerable soil loss (≈ 5 t/ac/yr)" };
};
export const plastic: Calc = (v) => {
  const items: [string, number, number][] = [["bottles", Z(v, "b", 7), Z(v, "bw", 10)], ["bags", Z(v, "g", 5), Z(v, "gw", 5.5)], ["cups & lids", Z(v, "c", 5), Z(v, "cw", 15)], ["food containers", Z(v, "f", 4), Z(v, "fw", 20)], ["straws & cutlery", Z(v, "s", 5), Z(v, "sw", 3)]];
  const oth = Z(v, "o", 100), wk = items.reduce((a, [, n, w]) => a + n * w, 0) + oth;
  return { y: `≈ ${f((wk * 52) / 1000)} kg of plastic a year (${f(wk)} g a week)`, d: items.map(([n, c, w]) => `${n} ${f((c * w * 52) / 1000)} kg`).join(" · ") + ` · other ${f((oth * 52) / 1000)} kg`, note: "Item weights are typical averages (500 mL PET bottle ≈ 10 g) — edit them · less than 10% of plastic ever made has been recycled" };
};
export const ghg: Calc = (v) => {
  const ch4 = Z(v, "m", 1), n2o = Z(v, "n", 0), co2 = Z(v, "c", 0), src = pick(v.s, 2), ar = pick(v.a, 2), u = [1, 0.001][pick(v.u, 2)];
  const g1 = ar === 0 ? (src === 0 ? 29.8 : 27.0) : 28, g2 = ar === 0 ? 273 : 265, tot = (co2 + ch4 * g1 + n2o * g2) * u;
  return { c: `${f(tot)} t CO₂e`, d: `CH₄ × ${f(g1)} = ${f(ch4 * g1 * u)} · N₂O × ${g2} = ${f(n2o * g2 * u)} · CO₂ ${f(co2 * u)}`, note: `${ar === 0 ? "IPCC AR6" : "IPCC AR5"} 100-year GWP${ar === 0 ? ` (${src === 0 ? "fossil" : "biogenic"} methane)` : ""} · over 20 years methane is ~80× CO₂` };
};
export const mapScale: Calc = (v) => {
  const s = P(v, "s", 25000, "Scale denominator"), dir = pick(v.m, 2);
  if (dir === 0) { const d = P(v, "d", 4, "Map distance"), real = d * s; return { r: `Real distance = ${f(real / 100000)} km (${f(real / 160934.4)} miles)`, d: `${f(d)} cm on a 1:${f(s)} map = ${f(real / 100)} m`, note: `1 cm = ${f(s / 100)} m on this map` }; }
  const real = P(v, "r", 1, "Real distance") * 100000;
  return { r: `Map distance = ${f(real / s)} cm`, d: `${f(real / 100000)} km at 1:${f(s)}`, note: "Large scale (1:10,000) shows more detail than small scale (1:1,000,000)" };
};
export const tzLon: Calc = (v) => {
  const lon = num(v.l, -74), off = Math.round(lon / 15), solar = (lon / 15) * 60;
  if (lon < -180 || lon > 180) throw new InputError("Longitude must be between −180 and 180.");
  return { z: `Nominal time zone UTC${off >= 0 ? "+" : "−"}${Math.abs(off)}`, s: `Local solar time is ${f(Math.abs(solar))} minutes ${solar >= 0 ? "ahead of" : "behind"} UTC (${f(solar - off * 60)} min from the zone's centre)`, note: "Each 15° of longitude = 1 hour · legal time zones follow borders and daylight saving, so check the official zone" };
};

// ---- registry (generated)
export const ideaSci2CustomCalculators: Record<string, Calc> = {
  "bandwidth-required-streaming-calculator": streamBw,
  "nas-storage-needs-calculator": nasNeeds,
  "backup-storage-size-calculator": backupSize,
  "aws-ec2-cost-calculator": ec2Cost,
  "aws-s3-cost-calculator": s3Cost,
  "cloud-egress-cost-calculator": egress,
  "throughput-tcp-window-calculator": tcpWin,
  "wifi-range-calculator": wifiRange,
  "gpu-mining-hashrate-power-calculator": gpuHash,
  "hash-collision-probability-calculator": hashCollision,
  "base64-size-calculator": base64,
  "api-rate-limit-calculator": rateLimit,
  "database-storage-growth-calculator": dbGrowth,
  "technical-debt-cost-calculator": techDebt,
  "code-coverage-percentage-calculator": coverage,
  "barometric-pressure-altitude-calculator": baroAlt,
  "sea-level-pressure-calculator": slp,
  "evapotranspiration-calculator": et0,
  "hurricane-category-wind-calculator": hurricane,
  "tornado-scale-calculator": tornado,
  "tsunami-speed-calculator": tsunami,
  "river-discharge-calculator": river,
  "flood-return-period-calculator": returnPeriod,
  "groundwater-flow-darcy-calculator": darcy,
  "soil-erosion-calculator": usle,
  "plastic-waste-footprint-calculator": plastic,
  "methane-co2-equivalent-calculator": ghg,
  "map-scale-distance-calculator": mapScale,
  "time-zone-from-longitude-calculator": tzLon,
};
