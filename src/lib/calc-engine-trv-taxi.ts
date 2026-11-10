/**
 * Batch: "Travel Calculators" → Taxi & Rideshare Fare Calculators (29 tools).
 *
 * Metered taxis: fare = flag fall (includes the first `incl` km/mi) + distance charge (tiered by
 * total distance where the city's tariff steps up, e.g. Hong Kong, Bangkok, London tariff 4) +
 * waiting/slow-traffic time, × time-of-day multiplier, + fixed surcharges (night, rush hour,
 * airport, luggage, booking), subject to a minimum fare; airport flat fares replace the meter.
 * Tariffs are the regulator's published 2025–26 rates, rounded, and each tool lets the user
 * override the flag and per-distance rate. Rideshare (Uber, Lyft, Grab, generic): base + per
 * mile/km + per minute + booking fee, × surge, minimum fare — all editable because prices vary by
 * city and hour. Driver earnings: gross fares − platform fee − vehicle costs per mile.
 * Near-namesakes: taxi-fare-calculator is the fully editable generic meter; each city tool carries
 * its own tariff; uber-vs-lyft compares two editable rate cards for the same trip.
 * See prisma/create-trv-taxi-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, pos, pick, r2, money, nfmt } from "./trv-core";

export interface Tariff {
  cur: string; sym: string; unit: "km" | "mi"; flag: number; incl: number; tiers: [number, number][]; wait: number; min?: number;
  times: [string, number, number][]; airports: [string, number | null, number][]; extra?: [string, number]; booking?: number;
}

export function meter(t: Tariff, v: Vals) {
  const d = pos(v.dist, 5), w = pos(v.wait, 0), time = t.times[pick(v.time, t.times.length)], ap = t.airports[pick(v.ap, t.airports.length)];
  const flag = pos(v.flag, 0) || t.flag, over = pos(v.rate, 0), tip = pos(v.tip, 0) / 100, book = pick(v.book, 2) === 1 ? t.booking ?? 0 : 0;
  let dist = 0, prev = t.incl;
  for (const [upTo, rate] of t.tiers) { if (d <= prev) break; const seg = Math.min(d, upTo) - prev; if (seg > 0) dist += seg * (over || rate); prev = Math.max(prev, upTo); }
  let fare = (flag + dist + w * t.wait) * time[1];
  const meterOnly = fare;
  if (ap[1] !== null) fare = ap[1];
  const extras = time[2] + ap[2] + (t.extra ? Math.round(pos(v.bags, 0)) * t.extra[1] : 0) + book + pos(v.tolls, 0);
  fare = Math.max(t.min ?? 0, fare);
  const total = (fare + extras) * (1 + tip), pax = Math.max(1, Math.round(pos(v.pax, 1)));
  return { total: r2(total), fare: r2(fare), extras: r2(extras), tip: r2((fare + extras) * tip), per: r2(total / pax), perUnit: d > 0 ? r2(total / d) : 0, how: ap[1] !== null ? `${ap[0]}${/flat/i.test(ap[0]) ? "" : " flat fare"}${extras ? ` + ${money(extras, t.sym)} extras` : ""}` : `Flag ${money(flag, t.sym)} (incl. ${t.incl} ${t.unit}) + ${money(dist, t.sym)} distance + ${money(w * t.wait, t.sym)} waiting${time[1] !== 1 ? ` × ${time[1]} (${time[0]})` : ""}${meterOnly < (t.min ?? 0) ? " — minimum fare applies" : ""}` };
}

const NONE: [string, null, number] = ["No airport", null, 0];
export const NYC: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 3, incl: 0, tiers: [[Infinity, 3.5]], wait: 0.7, times: [["Standard (6 am–4 pm, weekends)", 1, 1.5], ["Weekday rush hour (4–8 pm)", 1, 4], ["Overnight (8 pm–6 am)", 1, 2.5]], airports: [NONE, ["JFK ↔ Manhattan flat fare", 70, 1.75], ["LaGuardia (airport fee)", null, 1.75], ["Newark (NJ surcharge)", null, 20]], extra: ["Congestion surcharge (south of 96th St)", 3.25], booking: 0 };
export const LONDON: Tariff = { cur: "GBP", sym: "£", unit: "mi", flag: 3.8, incl: 0, tiers: [[6, 3.7], [Infinity, 4.8]], wait: 0.6, times: [["Tariff 1 — weekday daytime", 1, 0], ["Tariff 2 — evenings & weekend daytime", 1.15, 0], ["Tariff 3 — nights (10 pm–5 am) & holidays", 1.35, 0]], airports: [NONE, ["Heathrow rank pickup", null, 3.6]], booking: 2 };
export const DUBAI: Tariff = { cur: "AED", sym: "AED ", unit: "km", flag: 5, incl: 0, tiers: [[Infinity, 2.2]], wait: 0.5, min: 12, times: [["Street hail (daytime)", 1, 0], ["Street hail (10 pm–6 am)", 1, 0.5], ["Booked via app / phone", 1, 7]], airports: [NONE, ["Dubai Airport pickup (AED 25 flag)", null, 20]] };
export const ABU_DHABI: Tariff = { cur: "AED", sym: "AED ", unit: "km", flag: 5, incl: 0, tiers: [[Infinity, 1.82]], wait: 0.5, min: 12, times: [["Daytime (6 am–10 pm)", 1, 0], ["Night (10 pm–6 am)", 1, 0.5], ["Booked (call/app)", 1, 4]], airports: [NONE, ["Abu Dhabi Airport pickup (AED 25 flag)", null, 20]] };
export const HONG_KONG: Tariff = { cur: "HKD", sym: "HK$", unit: "km", flag: 29, incl: 2, tiers: [[9, 10.5], [Infinity, 7]], wait: 2.1, times: [["Urban (red) taxi", 1, 0], ["New Territories (green) taxi", 0.86, 0], ["Lantau (blue) taxi", 0.84, 0]], airports: [NONE, ["Airport → Central (+ Tsing Ma toll)", null, 15]], extra: ["Luggage in the boot", 6] };
export const SINGAPORE: Tariff = { cur: "SGD", sym: "S$", unit: "km", flag: 4.4, incl: 1, tiers: [[10, 0.65], [Infinity, 0.743]], wait: 0.35, times: [["Off-peak", 1, 0], ["Peak (weekday 6–9:30 am, 6 pm–midnight) +25%", 1.25, 0], ["Late night (midnight–6 am) +50%", 1.5, 0]], airports: [NONE, ["Changi Airport (S$6 surcharge)", null, 6], ["Changi Fri–Sun 5 pm–midnight (S$8)", null, 8]], extra: ["City area / ERP surcharge", 3], booking: 3.3 };
export const PARIS: Tariff = { cur: "EUR", sym: "€", unit: "km", flag: 4.48, incl: 0, tiers: [[Infinity, 1.31]], wait: 0.69, min: 8, times: [["Rate A — weekdays 10 am–5 pm", 1, 0], ["Rate B — evenings, Saturdays", 1.24, 0], ["Rate C — Sunday nights 0–7 am", 1.4, 0]], airports: [NONE, ["CDG ↔ right bank (flat)", 56, 0], ["CDG ↔ left bank (flat)", 65, 0], ["Orly ↔ left bank (flat)", 36, 0], ["Orly ↔ right bank (flat)", 44, 0]], booking: 4 };
export const ROME: Tariff = { cur: "EUR", sym: "€", unit: "km", flag: 3.5, incl: 0, tiers: [[11, 1.14], [Infinity, 1.35]], wait: 0.45, times: [["Weekdays 6 am–10 pm (€3.50 start)", 1, 0], ["Sundays & holidays (€5.00 start)", 1, 1.5], ["Night 10 pm–6 am (€7.50 start)", 1, 4]], airports: [NONE, ["Fiumicino ↔ city centre (flat)", 55, 0], ["Ciampino ↔ city centre (flat)", 40, 0]], extra: ["Extra bag", 1] };
export const BARCELONA: Tariff = { cur: "EUR", sym: "€", unit: "km", flag: 2.6, incl: 0, tiers: [[Infinity, 1.21]], wait: 0.41, min: 8.85, times: [["T1 — weekdays 8 am–8 pm", 1, 0], ["T2 — nights, weekends & holidays", 1.2, 0]], airports: [NONE, ["Airport / port supplement", null, 4.5]] };
export const DUBLIN: Tariff = { cur: "EUR", sym: "€", unit: "km", flag: 4.4, incl: 0.5, tiers: [[15, 1.32], [Infinity, 1.81]], wait: 0.55, times: [["Standard (8 am–8 pm)", 1, 0], ["Premium (8 pm–8 am, Sundays, holidays)", 1.12, 0]], airports: [NONE], booking: 2 };
export const ISTANBUL: Tariff = { cur: "TRY", sym: "₺", unit: "km", flag: 60, incl: 0, tiers: [[Infinity, 40]], wait: 8, min: 200, times: [["Yellow taxi", 1, 0], ["Turquoise taxi (+15%)", 1.15, 0], ["Black (premium) taxi (+70%)", 1.7, 0]], airports: [NONE, ["Bridge / tunnel tolls (approx.)", null, 60]] };
export const BANGKOK: Tariff = { cur: "THB", sym: "฿", unit: "km", flag: 35, incl: 1, tiers: [[10, 6.5], [20, 7], [40, 8], [60, 8.5], [80, 9], [Infinity, 10.5]], wait: 3, times: [["Metered taxi", 1, 0]], airports: [NONE, ["From Suvarnabhumi / Don Mueang (฿50 surcharge)", null, 50]], booking: 20 };
export const TAIPEI: Tariff = { cur: "TWD", sym: "NT$", unit: "km", flag: 85, incl: 1.25, tiers: [[Infinity, 25]], wait: 5, times: [["Daytime", 1, 0], ["Night 11 pm–6 am (+NT$20)", 1, 20], ["Lunar New Year (+NT$30)", 1, 30]], airports: [NONE], extra: ["Luggage in the boot", 10] };
export const MUMBAI: Tariff = { cur: "INR", sym: "₹", unit: "km", flag: 31, incl: 1.5, tiers: [[Infinity, 20.66]], wait: 1, times: [["Black-and-yellow taxi (day)", 1, 0], ["Night (midnight–5 am) +25%", 1.25, 0], ["AC cool cab (+~55%)", 1.55, 0]], airports: [NONE], extra: ["Luggage piece", 10] };
export const MELBOURNE: Tariff = { cur: "AUD", sym: "A$", unit: "km", flag: 4.8, incl: 0, tiers: [[Infinity, 1.95]], wait: 0.6, times: [["Day (9 am–5 pm)", 1, 0], ["Overnight (5 pm–9 am) +20%", 1.2, 0], ["Peak Fri/Sat night (+25%)", 1.25, 0]], airports: [NONE, ["Melbourne Airport rank fee", null, 4.3]], booking: 2 };
export const SYDNEY: Tariff = { cur: "AUD", sym: "A$", unit: "km", flag: 3.6, incl: 0, tiers: [[Infinity, 2.29]], wait: 0.97, times: [["Day tariff", 1, 0], ["Night / peak (10 pm–6 am Fri, Sat, holidays) +20%", 1.2, 2.5]], airports: [NONE, ["Sydney Airport access fee", null, 5.5]], booking: 2.7 };
export const TORONTO: Tariff = { cur: "CAD", sym: "C$", unit: "km", flag: 4.44, incl: 0.143, tiers: [[Infinity, 1.75]], wait: 0.48, times: [["Toronto meter rate", 1, 0]], airports: [NONE, ["Pearson Airport pickup (zone fare varies)", null, 5]] };
export const CHICAGO: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 3.25, incl: 0, tiers: [[Infinity, 2.25]], wait: 0.33, times: [["Standard", 1, 0]], airports: [NONE, ["O'Hare / Midway departure tax", null, 4]], extra: ["Extra passenger (age 12–64)", 1] };
export const LAS_VEGAS: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 4.5, incl: 0, tiers: [[Infinity, 3]], wait: 0.6, times: [["Standard", 1, 0], ["Paying by card (+$3)", 1, 3]], airports: [NONE, ["Harry Reid Airport pickup fee", null, 2]] };
export const LOS_ANGELES: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 3.1, incl: 0.111, tiers: [[Infinity, 2.7]], wait: 0.49, times: [["Standard", 1, 0]], airports: [NONE, ["LAX ↔ Downtown LA flat fare", 46.5, 4], ["LAX pickup (metered)", null, 4]] };
export const BOSTON: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 2.6, incl: 0.143, tiers: [[Infinity, 2.8]], wait: 0.47, times: [["Standard", 1, 0]], airports: [NONE, ["Logan Airport pickup fee", null, 2.75], ["Logan + tunnel toll", null, 8.25]] };
export const JAPAN: Tariff[] = [
  { cur: "JPY", sym: "¥", unit: "km", flag: 500, incl: 1.096, tiers: [[Infinity, 392]], wait: 63, times: [["Daytime", 1, 0], ["Late night 10 pm–5 am (+20%)", 1.2, 0]], airports: [NONE, ["Haneda ↔ central Tokyo flat fare (approx.)", 7500, 0], ["Narita ↔ central Tokyo flat fare (approx.)", 21000, 0]] },
  { cur: "JPY", sym: "¥", unit: "km", flag: 600, incl: 1.3, tiers: [[Infinity, 385]], wait: 63, times: [["Daytime", 1, 0], ["Late night 10 pm–5 am (+20%)", 1.2, 0]], airports: [NONE] },
  { cur: "JPY", sym: "¥", unit: "km", flag: 500, incl: 1, tiers: [[Infinity, 430]], wait: 63, times: [["Daytime", 1, 0], ["Late night 10 pm–5 am (+20%)", 1.2, 0]], airports: [NONE] },
  { cur: "JPY", sym: "¥", unit: "km", flag: 700, incl: 1.3, tiers: [[Infinity, 360]], wait: 60, times: [["Daytime", 1, 0], ["Late night 10 pm–5 am (+20%)", 1.2, 0]], airports: [NONE] },
];
export const JAPAN_CITY = ["Tokyo (23 wards, Musashino, Mitaka)", "Osaka", "Kyoto", "Other cities (Sapporo, Fukuoka, Nagoya…)"];
export const japanTaxi: TrvCalculator = (v) => {
  const t = JAPAN[pick(v.city, JAPAN.length)], app = pos(v.app, 0), r = meter({ ...t, airports: JAPAN[0].airports, booking: 0 }, { ...v, ap: pick(v.city, 4) === 0 ? v.ap : 0 });
  const total = r2(r.total + app);
  return { ...r, total, extras: r2(r.extras + app), per: r2(total / Math.max(1, Math.round(pos(v.pax, 1)))) };
};

// Generic meter (fully editable)
export const genericTaxi: TrvCalculator = (v) => {
  const t: Tariff = { cur: "USD", sym: "", unit: "km", flag: pos(v.flag, 3.5), incl: pos(v.incl, 0), tiers: [[Infinity, pos(v.rate, 2)]], wait: pos(v.wpm, 0.5), min: pos(v.minf, 0), times: [["Standard", 1, 0], ["Night / weekend surcharge", 1 + pos(v.night, 20) / 100, 0]], airports: [NONE, ["Airport / booking surcharge", null, pos(v.airfee, 5)]] };
  return meter(t, { ...v, flag: 0, rate: 0 });
};

// Rideshare
export interface RideCard { base: number; mile: number; min: number; fee: number; minFare: number }
export function ride(c: RideCard, v: Vals, pre = "") {
  const k = (s: string) => { const x = v[pre + s]; return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : -1; };
  const card: RideCard = { base: k("base") >= 0 ? k("base") : c.base, mile: k("mile") >= 0 ? k("mile") : c.mile, min: k("min") >= 0 ? k("min") : c.min, fee: k("fee") >= 0 ? k("fee") : c.fee, minFare: k("minf") >= 0 ? k("minf") : c.minFare };
  const d = pos(v.dist, 8), t = pos(v.mins, 20), surge = Math.max(1, pos(v.surge, 1)), tip = pos(v.tip, 0) / 100;
  const tf = (card.base + d * card.mile + t * card.min) * surge, fare = Math.max(card.minFare, tf + card.fee), total = fare * (1 + tip) + pos(v.tolls, 0);
  return { total: r2(total), fare: r2(fare), ride: r2(tf), fee: r2(card.fee), tip: r2(fare * tip), perUnit: d > 0 ? r2(total / d) : 0, how: `${money(card.base)} base + ${money(card.mile)}/mi × ${nfmt(d, 1)} + ${money(card.min)}/min × ${nfmt(t)}${surge > 1 ? ` × ${surge} surge` : ""} + ${money(card.fee)} fee` };
}
export const UBER: RideCard = { base: 1.25, mile: 1.15, min: 0.3, fee: 2.75, minFare: 7.5 };
export const LYFT: RideCard = { base: 1.4, mile: 1.1, min: 0.32, fee: 2.7, minFare: 7.5 };
export const GRAB: RideCard = { base: 2, mile: 0.9, min: 0.3, fee: 1, minFare: 5 };
export const uber: TrvCalculator = (v) => ride(UBER, v);
export const lyft: TrvCalculator = (v) => ride(LYFT, v);
export const grab: TrvCalculator = (v) => ride(GRAB, v);
export const uberVsLyft: TrvCalculator = (v) => {
  const u = ride(UBER, v, "u"), l = ride(LYFT, v, "l"), diff = u.total - l.total;
  return { cheaper: Math.abs(diff) < 0.01 ? "Same price" : diff > 0 ? `Lyft is cheaper by ${money(diff)}` : `Uber is cheaper by ${money(-diff)}`, uber: u.total, lyft: l.total, diff: r2(Math.abs(diff)), detail: `Uber: ${u.how} · Lyft: ${l.how}` };
};
export const uberDriver: TrvCalculator = (v) => {
  const gross = pos(v.gross, 1200), feePct = pos(v.fee, 25) / 100, tips = pos(v.tips, 120), bonus = pos(v.bonus, 0), miles = pos(v.miles, 600), hrs = pos(v.hrs, 35);
  const fuel = (miles / Math.max(1, pos(v.mpg, 30))) * pos(v.gas, 3.4), wear = miles * pos(v.cpm, 0.12), other = pos(v.other, 0);
  if (hrs <= 0) throw new InputError("Enter the hours you drove.");
  const payout = gross * (1 - feePct) + tips + bonus, net = payout - fuel - wear - other;
  return { hour: r2(net / hrs), net: r2(net), payout: r2(payout), costs: r2(fuel + wear + other), mile: miles > 0 ? r2(net / miles) : 0, irs: r2(miles * 0.7), tax: `Taxable profit using the 70¢/mile standard deduction: ${money(payout - miles * 0.7)}` };
};
export const uberVsCar: TrvCalculator = (v) => {
  const rides = pos(v.rides, 40), fare = pos(v.fare, 18), rideM = rides * fare + pos(v.other, 0);
  const car = pos(v.pay, 450) + pos(v.ins, 160) + pos(v.fuel, 150) + pos(v.park, 50) + pos(v.maint, 80) + pos(v.dep, 200) + pos(v.reg, 15);
  const diff = car - rideM;
  return { verdict: diff > 0 ? `Rideshare is cheaper by ${money(diff)} a month` : `Owning a car is cheaper by ${money(-diff)} a month`, ride: r2(rideM), car: r2(car), year: r2(Math.abs(diff) * 12), breakeven: fare > 0 ? r2(car / fare) : 0 };
};

const M = (t: Tariff): TrvCalculator => (v) => meter(t, v);

export const trvTaxiCustomCalculators: Record<string, TrvCalculator> = {
  "taxi-fare-calculator": genericTaxi,
  "nyc-taxi-fare-calculator": M(NYC),
  "london-taxi-fare-calculator": M(LONDON),
  "japan-taxi-fare-calculator": japanTaxi,
  "dubai-taxi-fare-calculator": M(DUBAI),
  "abu-dhabi-taxi-fare-calculator": M(ABU_DHABI),
  "hong-kong-taxi-fare-calculator": M(HONG_KONG),
  "singapore-taxi-fare-calculator": M(SINGAPORE),
  "paris-taxi-fare-calculator": M(PARIS),
  "rome-taxi-fare-calculator": M(ROME),
  "barcelona-taxi-fare-calculator": M(BARCELONA),
  "dublin-taxi-fare-calculator": M(DUBLIN),
  "istanbul-taxi-fare-calculator": M(ISTANBUL),
  "bangkok-taxi-fare-calculator": M(BANGKOK),
  "taipei-taxi-fare-calculator": M(TAIPEI),
  "mumbai-taxi-fare-calculator": M(MUMBAI),
  "melbourne-taxi-fare-calculator": M(MELBOURNE),
  "sydney-taxi-fare-calculator": M(SYDNEY),
  "toronto-taxi-fare-calculator": M(TORONTO),
  "chicago-taxi-fare-calculator": M(CHICAGO),
  "las-vegas-taxi-fare-calculator": M(LAS_VEGAS),
  "los-angeles-taxi-fare-calculator": M(LOS_ANGELES),
  "boston-taxi-fare-calculator": M(BOSTON),
  "uber-fare-calculator": uber,
  "lyft-fare-calculator": lyft,
  "grab-fare-calculator-malaysia": grab,
  "uber-vs-lyft-price-calculator": uberVsLyft,
  "uber-driver-earnings-calculator": uberDriver,
  "uber-vs-owning-a-car-calculator": uberVsCar,
};
