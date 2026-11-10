/**
 * Batch: "Travel Calculators" → Train, Metro & Rail Pass Calculators (15 tools).
 *
 * Japan: route table of common JR trips with reserved-seat ordinary fares (base fare + limited
 * express/shinkansen surcharge, Nozomi where it runs), Green Car ≈ +37%, children half. JR Pass
 * prices since October 2023: 7/14/21 days ¥50,000 / ¥80,000 / ¥100,000 ordinary and ¥70,000 /
 * ¥110,000 / ¥140,000 Green. Distance mode: JR trunk-line taper (≈ ¥16.2/km to 300 km, ¥12.85 to
 * 600 km, ¥7.05 beyond) plus a distance-banded shinkansen surcharge.
 * Metros: each system's published fare structure (distance bands, zones or composite miles), with
 * daily/weekly caps where they exist. UK season tickets: monthly = weekly × 3.84, annual = weekly ×
 * 40 (National Rail rule). All fares are 2026 estimates (rounded) with override inputs where the
 * system changes fares yearly.
 * Near-namesakes: jr-pass-calculator compares a pass with individual tickets for a whole trip;
 * japan-train-fare-calculator prices one journey; tokyo-metro-fare-calculator is subway only.
 * See prisma/create-trv-rail-calculators.ts.
 */

import { type TrvCalculator, InputError, pos, pick, r0, r2, money, nfmt, clamp } from "./trv-core";

// ------------------------------------------------------------- Japan
export const JR_ROUTES: [string, number][] = [
  ["Tokyo ↔ Kyoto (Nozomi)", 14170], ["Tokyo ↔ Shin-Osaka (Nozomi)", 14720], ["Tokyo ↔ Nagoya (Nozomi)", 11300], ["Tokyo ↔ Hiroshima (Nozomi)", 19760],
  ["Tokyo ↔ Hakata/Fukuoka (Nozomi)", 23390], ["Tokyo ↔ Odawara for Hakone", 3920], ["Tokyo ↔ Mishima (Mt Fuji)", 4500], ["Tokyo ↔ Sendai", 11210],
  ["Tokyo ↔ Shin-Aomori", 17670], ["Tokyo ↔ Nagano", 8340], ["Tokyo ↔ Karuizawa", 5820], ["Tokyo ↔ Kanazawa", 14380],
  ["Tokyo ↔ Nikko (via Utsunomiya)", 5150], ["Narita Airport ↔ Tokyo (N'EX)", 3070], ["Kansai Airport ↔ Kyoto (Haruka)", 3640], ["Kyoto ↔ Shin-Osaka (shinkansen)", 1450],
  ["Kyoto ↔ Osaka (JR Special Rapid)", 580], ["Kyoto ↔ Nara (JR Nara Line)", 720], ["Shin-Osaka ↔ Hiroshima", 10620], ["Shin-Osaka ↔ Hakata", 15600],
  ["Kyoto ↔ Hiroshima", 11620], ["Hiroshima ↔ Miyajimaguchi", 420], ["Kyoto ↔ Kanazawa (Thunderbird + shinkansen)", 7790], ["Nagoya ↔ Takayama (Hida)", 6140],
];
export const JR_OPTS = ["— none —", ...JR_ROUTES.map((r) => `${r[0]} — ¥${nfmt(r[1])}`)];
export const PASS = ["7-day Ordinary", "7-day Green", "14-day Ordinary", "14-day Green", "21-day Ordinary", "21-day Green"];
const PASS_Y = [50000, 70000, 80000, 110000, 100000, 140000];
const GREEN = 1.37;

export const jrPass: TrvCalculator = (v) => {
  const pt = pick(v.pass, PASS.length), green = pt % 2 === 1, adults = Math.max(0, Math.round(pos(v.adults, 1))), kids = Math.max(0, Math.round(pos(v.kids, 0)));
  if (adults + kids === 0) throw new InputError("Enter at least one traveller.");
  let one = 0;
  const trips: string[] = [];
  for (let i = 1; i <= 8; i++) { const r = pick(v[`t${i}`], JR_OPTS.length); if (r > 0) { const f = JR_ROUTES[r - 1][1] * (green ? GREEN : 1); one += f; trips.push(JR_ROUTES[r - 1][0].split(" (")[0]); } }
  one += pos(v.other, 0);
  const people = adults + kids * 0.5, tickets = one * people, pass = PASS_Y[pt] * people, save = tickets - pass;
  return { verdict: save > 0 ? `✅ The JR Pass saves ${money(save, "¥", 0)}` : `❌ Buy individual tickets — they're ${money(-save, "¥", 0)} cheaper`, tickets: r0(tickets), pass: r0(pass), save: r0(save), pct: r2(pass > 0 ? (tickets / pass) * 100 : 0), trips: trips.length ? trips.join(" · ") : "Only the 'other fares' amount" };
};

const shinkSurcharge = (km: number) => (km <= 100 ? 2290 : km <= 200 ? 3060 : km <= 300 ? 4170 : km <= 400 ? 4960 : km <= 500 ? 5490 : km <= 600 ? 5920 : km <= 800 ? 6550 : 7530);
const baseFare = (km: number) => (Math.min(km, 300) * 16.2 + Math.max(0, Math.min(km, 600) - 300) * 12.85 + Math.max(0, km - 600) * 7.05);
export const japanTrain: TrvCalculator = (v) => {
  const mode = pick(v.mode, 2), r = pick(v.route, JR_ROUTES.length), green = pick(v.cls, 2) === 1, adults = Math.round(pos(v.adults, 1)), kids = Math.round(pos(v.kids, 0)), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  let one: number, label: string;
  if (mode === 0) { one = JR_ROUTES[r][1]; label = JR_ROUTES[r][0]; }
  else { const km = pos(v.km, 300), sh = pick(v.exp, 2) === 1; one = Math.round(baseFare(km) / 10) * 10 + (sh ? shinkSurcharge(km) : 0); label = `${nfmt(km)} km ${sh ? "by shinkansen/limited express" : "on local/rapid trains"}`; }
  const fare = one * (green ? GREEN : 1), total = fare * (adults + kids * 0.5) * rt;
  return { total: r0(total), adult: r0(fare), child: r0(fare / 2), pass: total >= 50000 * (adults + kids * 0.5) ? "This trip alone is close to a 7-day JR Pass — check the JR Pass Calculator" : `A 7-day JR Pass costs ${money(50000, "¥", 0)} per adult`, route: `${label}${green ? " · Green Car" : " · Ordinary reserved"}` };
};

const TM_BANDS: [number, number, number][] = [[6, 178, 180], [11, 209, 210], [19, 252, 260], [27, 293, 300], [40, 324, 330]];
export const tokyoMetro: TrvCalculator = (v) => {
  const km = pos(v.km, 8), ic = pick(v.pay, 2) === 0, b = TM_BANDS.find((x) => km <= x[0]) ?? TM_BANDS[TM_BANDS.length - 1], child = pick(v.age, 2) === 1;
  const f = ic ? b[1] : b[2], fare = child ? (ic ? Math.floor(f / 2) : Math.ceil(f / 20) * 10) : f, rides = Math.max(1, Math.round(pos(v.rides, 4))), days = Math.max(1, Math.round(pos(v.days, 1)));
  const payg = fare * rides * days, PASSES: [string, number, number][] = [["Tokyo Metro 24-hour ticket", 600, 1], ["Tokyo Subway Ticket 24 h", 800, 1], ["Tokyo Subway Ticket 48 h", 1200, 2], ["Tokyo Subway Ticket 72 h", 1500, 3]];
  const best = PASSES.map(([n, p, d]) => [n, p * Math.ceil(days / d) * (child ? 0.5 : 1)] as [string, number]).sort((a, b2) => a[1] - b2[1])[0];
  return { fare, payg: r0(payg), best: best[1] < payg ? `${best[0]}: ${money(best[1], "¥", 0)} — saves ${money(payg - best[1], "¥", 0)}` : `Pay as you go (cheapest pass ${money(best[1], "¥", 0)})`, band: `${nfmt(km, 1)} km → up to ${b[0]} km band (${ic ? "IC card" : "paper ticket"})` };
};

// ------------------------------------------------------------- London
const TFL: [string, number, number, number, number][] = [
  ["Zone 1 only", 3.0, 2.9, 9.3, 46.7], ["Zones 1–2", 3.7, 3.0, 9.3, 46.7], ["Zones 1–3", 4.1, 3.2, 11.0, 55.1], ["Zones 1–4", 4.9, 3.5, 13.4, 67.4], ["Zones 1–5", 5.9, 3.9, 15.9, 80.1], ["Zones 1–6", 6.5, 4.1, 17.1, 85.6], ["Zone 2 only (not via Zone 1)", 2.1, 2.0, 9.3, 46.7], ["Zones 2–6 (not via Zone 1)", 2.9, 2.0, 11.0, 55.1],
];
export const TFL_ZONES = TFL.map((z) => z[0]);
export const londonTube: TrvCalculator = (v) => {
  const z = TFL[pick(v.zone, TFL.length)], peak = pick(v.peak, 2) === 0, per = Math.max(1, Math.round(pos(v.per, 2))), days = clamp(Math.round(pos(v.days, 5)), 1, 7), weeks = pos(v.weeks, 4.33);
  const fare = peak ? z[1] : z[2], day = Math.min(fare * per, z[3]), week = Math.min(day * days, z[4]), month = week * weeks;
  return { day: r2(day), fare: r2(fare), week: r2(week), month: r2(month), cap: `Daily cap ${money(z[3], "£")} · weekly cap (Mon–Sun) ${money(z[4], "£")}`, tip: z[1] >= 2.5 && fare * per > z[3] ? "You hit the daily cap — extra journeys today are free" : "Use the same contactless card or Oyster for every journey to get capping" };
};

// ------------------------------------------------------------- UK season tickets
export const ukSeason: TrvCalculator = (v) => {
  const wk = pos(v.weekly, 85), ret = pos(v.ret, 24), dpw = clamp(pos(v.dpw, 5), 0, 7), wks = pos(v.wks, 46), flexi = pos(v.flexi, 0);
  const month = wk * 3.84, annual = wk * 40, dayYear = ret * dpw * wks, weekYear = wk * wks, monthYear = month * 12, flexiYear = flexi > 0 ? flexi * Math.ceil((dpw * wks) / 8) : Infinity;
  const opts: [string, number][] = [["Daily returns", dayYear], ["Weekly seasons", weekYear], ["Monthly seasons", monthYear], ["Annual season", annual]];
  if (flexi > 0) opts.push(["Flexi Season (8 days in 28)", flexiYear]);
  const best = [...opts].sort((a, b) => a[1] - b[1])[0];
  return { best: `${best[0]}: ${money(best[1], "£")} a year`, monthly: r2(month), annual: r2(annual), daily: r2(dayYear), weekYear: r2(weekYear), save: r2(dayYear - annual) };
};

// ------------------------------------------------------------- Singapore MRT
export const SG_TYPE = ["Adult (card)", "Senior / PWD concession", "Student concession"];
export const sgMrt: TrvCalculator = (v) => {
  const km = pos(v.km, 12), t = pick(v.type, 3), adult = km <= 3.2 ? 1.19 : Math.min(2.38, 1.19 + (km - 3.2) * 0.0322);
  const fare = t === 0 ? adult : t === 1 ? Math.min(1.15, adult * 0.6) : Math.min(0.97, adult * 0.48), trips = Math.round(pos(v.trips, 44)), pass = [128, 64, 55][t];
  return { fare: r2(fare), month: r2(fare * trips), pass: r2(pass), verdict: fare * trips > pass ? `Monthly concession / travel pass (${money(pass, "S$")}) is cheaper` : "Pay per ride is cheaper", note: `${nfmt(km, 1)} km — fares are by total distance, including bus–MRT transfers within 45 minutes` };
};

// ------------------------------------------------------------- generic distance metros
export const bart: TrvCalculator = (v) => {
  const mi = pos(v.mi, 12), base = 2.4 + Math.max(0, mi - 6) * 0.21 + (pick(v.tb, 2) === 1 ? 1.2 : 0) + (pick(v.sf, 2) === 1 ? 0.3 : 0), ap = [0, 5.0, 6.0][pick(v.ap, 3)];
  const disc = [1, 0.375, 0.375, 0.5][pick(v.who, 4)], one = Math.max(2.4 * disc, (base + ap) * disc), trips = Math.round(pos(v.trips, 0));
  return { one: r2(one), rt: r2(one * 2), month: r2(one * trips), parts: `Base + distance ${money(base)}${ap ? ` + airport ${money(ap)}` : ""}${disc < 1 ? ` × ${disc} discount` : ""}` };
};
export const wmata: TrvCalculator = (v) => {
  const mi = pos(v.mi, 8), t = pick(v.time, 3), peak = Math.min(6.75, 2.25 + Math.max(0, mi - 3) * 0.328), off = Math.min(3.85, 2.25 + Math.max(0, mi - 3) * 0.25), fare = [peak, off, 2.25][t];
  const disc = pick(v.who, 2) === 1 ? 0.5 : 1, one = fare * disc, trips = Math.round(pos(v.trips, 0));
  return { one: r2(one), rt: r2(one * 2), month: r2(one * trips), parts: `${nfmt(mi, 1)} composite miles · ${["peak", "off-peak", "late-night/weekend flat"][t]} fare` };
};
const LIRR_Z: [string, number][] = [["Zone 1 — within NYC (Queens/Brooklyn)", 8.75], ["Zone 3 — Nassau inner (e.g. Valley Stream, Great Neck)", 11.0], ["Zone 4 — Nassau (e.g. Mineola, Hempstead)", 13.0], ["Zone 7 — outer Nassau / western Suffolk (e.g. Hicksville, Huntington)", 15.25], ["Zone 9 — Suffolk (e.g. Babylon, Ronkonkoma)", 17.0], ["Zone 10 — Suffolk (e.g. Patchogue, Stony Brook)", 19.0], ["Zone 12 — eastern Suffolk", 22.0], ["Zone 14 — Montauk / Greenport", 29.75]];
export const LIRR_ZONES = LIRR_Z.map((z) => z[0]);
export const lirr: TrvCalculator = (v) => {
  const z = LIRR_Z[pick(v.zone, LIRR_Z.length)], t = pick(v.time, 3), city = pick(v.zone, LIRR_Z.length) === 0 && t === 2;
  const one = city ? 5 : t === 0 ? z[1] : z[1] * 0.73, disc = pick(v.who, 2) === 1 ? 0.5 : 1, trips = Math.round(pos(v.trips, 40));
  const monthly = z[1] * 20.5, payg = one * disc * trips;
  return { one: r2(one * disc), rt: r2(one * disc * 2), monthly: r2(monthly), month: r2(payg), verdict: payg > monthly ? `A monthly ticket (~${money(monthly)}) is cheaper` : "Buying one-way or ten-trip tickets is cheaper", parts: `${z[0]} to/from Penn Station or Grand Central · ${city ? "CityTicket $5" : ["peak", "off-peak"][Math.min(t, 1)]}` };
};
export const njTransit: TrvCalculator = (v) => {
  const mode = pick(v.mode, 2), trips = Math.round(pos(v.trips, 40)), disc = pick(v.who, 2) === 1 ? 0.5 : 1;
  const one = mode === 0 ? Math.max(5.25, 2.1 + pos(v.mi, 30) * 0.3) : 2.0 + Math.max(0, Math.round(pos(v.zones, 1)) - 1) * 0.65;
  const monthly = one * (mode === 0 ? 29 : 27), weekly = one * (mode === 0 ? 9 : 8.5);
  return { one: r2(one * disc), rt: r2(one * disc * 2), monthly: r2(monthly), weekly: r2(weekly), verdict: one * trips > monthly ? `Monthly pass (~${money(monthly)}) is cheaper for ${trips} trips` : "Pay per trip is cheaper", parts: mode === 0 ? `Rail, about ${nfmt(pos(v.mi, 30))} miles` : `Bus, ${Math.round(pos(v.zones, 1))} zone(s)` };
};
export const caltrain: TrvCalculator = (v) => {
  const zones = clamp(Math.round(pos(v.zones, 2)), 1, 6), disc = pick(v.who, 2) === 1 ? 0.5 : 1, one = (2.4 + (zones - 1) * 2.4) * disc, trips = Math.round(pos(v.trips, 40)), monthly = one * 28;
  return { one: r2(one), day: r2(one * 2), monthly: r2(monthly), month: r2(one * trips), verdict: one * trips > monthly ? "A monthly pass is cheaper" : "Clipper pay-per-ride is cheaper", parts: `${zones} zone(s) travelled` };
};
const OPAL: [number, number][] = [[10, 4.2], [20, 5.22], [35, 6.01], [65, 8.03], [Infinity, 10.33]];
export const sydneyOpal: TrvCalculator = (v) => {
  const km = pos(v.km, 15), peak = pick(v.peak, 2) === 0, ap = pick(v.ap, 2) === 1, conc = pick(v.who, 2) === 1 ? 0.5 : 1, per = Math.max(1, Math.round(pos(v.per, 2))), wkday = pick(v.day, 2) === 0;
  const base = (OPAL.find((b) => km <= b[0]) ?? OPAL[4])[1] * (peak ? 1 : 0.7) * conc, saf = ap ? 17.34 : 0, cap = (wkday ? 19.3 : 9.65) * conc;
  const day = Math.min(base * per, cap) + saf;
  return { one: r2(base + saf), day: r2(day), fare: r2(base), saf: r2(saf), cap: `Daily cap ${money(cap, "A$")} (airport station fee is extra, with its own weekly cap)` };
};
export const dubaiMetro: TrvCalculator = (v) => {
  const z = clamp(Math.round(pos(v.zones, 1)), 1, 7), gold = pick(v.cls, 2) === 1, one = (z === 1 ? 3 : z === 2 ? 5 : 7.5) * (gold ? 2 : 1), trips = Math.round(pos(v.trips, 2));
  const day = one * trips, pass = gold ? 44 : 22;
  return { one: r2(one), day: r2(Math.min(day, pass)), pass: r2(pass), verdict: day > pass ? `Buy a Nol Day Pass (AED ${pass})` : "Pay per trip", parts: `${z} zone(s) · ${gold ? "Gold Class" : "Silver (standard) Class"}` };
};
const NAMMA: [number, number][] = [[2, 10], [4, 20], [6, 30], [8, 40], [10, 50], [15, 60], [20, 70], [25, 80], [Infinity, 90]];
export const namma: TrvCalculator = (v) => {
  const km = pos(v.km, 9), card = pick(v.pay, 2) === 1, f = (NAMMA.find((b) => km <= b[0]) ?? NAMMA[8])[1], fare = card ? f * 0.95 : f, trips = Math.round(pos(v.trips, 44));
  return { fare: r2(fare), rt: r2(fare * 2), month: r2(fare * trips), parts: `${nfmt(km, 1)} km → ₹${f} slab${card ? " − 5% smart card discount" : ""}` };
};
export const transit: TrvCalculator = (v) => {
  const d = pos(v.dist, 10), base = pos(v.base, 2.5), incl = pos(v.incl, 0), rate = pos(v.rate, 0.1), xfer = pos(v.xfer, 0) * Math.round(pos(v.xfers, 0)), cap = pos(v.cap, 0);
  const one = base + Math.max(0, d - incl) * rate + xfer, per = Math.max(1, Math.round(pos(v.per, 2))), days = Math.round(pos(v.days, 20)), dayCost = cap > 0 ? Math.min(cap, one * per) : one * per, month = dayCost * days, pass = pos(v.pass, 0);
  return { one: r2(one), day: r2(dayCost), month: r2(month), verdict: pass > 0 ? (month > pass ? `Monthly pass is cheaper by ${money(month - pass, "")}` : `Pay as you go is cheaper by ${money(pass - month, "")}`) : "Enter a monthly pass price to compare", parts: `${base} base + ${Math.max(0, d - incl).toFixed(1)} × ${rate}${xfer ? ` + ${xfer} transfers` : ""}` };
};

export const trvRailCustomCalculators: Record<string, TrvCalculator> = {
  "jr-pass-calculator": jrPass,
  "japan-train-fare-calculator": japanTrain,
  "tokyo-metro-fare-calculator": tokyoMetro,
  "london-tube-fare-calculator": londonTube,
  "uk-rail-season-ticket-calculator": ukSeason,
  "singapore-mrt-fare-calculator": sgMrt,
  "bart-fare-calculator": bart,
  "wmata-fare-calculator": wmata,
  "lirr-fare-calculator": lirr,
  "nj-transit-fare-calculator": njTransit,
  "caltrain-fare-calculator": caltrain,
  "sydney-opal-fare-calculator": sydneyOpal,
  "dubai-metro-fare-calculator": dubaiMetro,
  "bangalore-metro-fare-calculator": namma,
  "transit-fare-calculator": transit,
};
