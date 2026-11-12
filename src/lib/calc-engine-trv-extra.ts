/**
 * Batch: "Travel Calculators" → keyword batch 2 (12 Nov 2026), 16 tools spread over the existing
 * sub-categories. Reuses the batch-1 models wherever one fits:
 *  - Taxi meters (Seattle, Vancouver, Washington DC) use meter() from calc-engine-trv-taxi;
 *    Aruba has no meters (fixed zone fares in US dollars), so it gets a zone-fare model.
 *  - Grab Thailand: base + per km + per minute + booking fee, × surge, minimum fare (THB).
 *  - Airline miles (Korean Air SKYPASS, Alaska Atmos Rewards, Royal Jordanian Royal Club) use
 *    distEarn() from calc-engine-trv-miles (miles flown × fare-class % × tier bonus).
 *  - Korean Air and Brussels Airlines baggage use pieceFee() from calc-engine-trv-bag.
 *  - Turkish Airlines pet fee: a flat fee per pet per direction by route zone and cabin/hold.
 *  - Buy miles: cost of buying miles with a bonus offer vs the value of the award.
 *  - Closest airport: great-circle distance to every airport in the built-in trv-core table.
 *  - Seoul subway: T-money distance fare and the tourist Climate Card.
 *  - South Korea trip and cruise cost: daily cost tables and line-item budgets.
 * All fares and fees are rounded 2026 estimates with override inputs, like batch 1.
 * See prisma/create-trv-extra-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, txt, pos, pick, r0, r1, r2, money, nfmt, findPlace, gcKm, airportList, KM_PER_MI } from "./trv-core";
import { meter, type Tariff } from "./calc-engine-trv-taxi";
import { distEarn, type DistPreset } from "./calc-engine-trv-miles";
import { pieceFee, type PiecePreset } from "./calc-engine-trv-bag";

// ------------------------------------------------------------------ taxis
const NONE: [string, null, number] = ["No airport", null, 0];
export const SEATTLE: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 2.6, incl: 0, tiers: [[Infinity, 2.7]], wait: 0.5, times: [["Standard meter", 1, 0]], airports: [NONE, ["SEA airport ↔ Downtown Seattle (flat, approx.)", 40, 0], ["SEA airport pickup (metered)", null, 0]] };
export const VANCOUVER: Tariff = { cur: "CAD", sym: "C$", unit: "km", flag: 3.95, incl: 0, tiers: [[Infinity, 2.18]], wait: 0.63, times: [["Standard meter", 1, 0]], airports: [NONE, ["YVR → Downtown Vancouver (zone rate, approx.)", 40, 0], ["YVR → Richmond (zone rate, approx.)", 25, 0]], booking: 0 };
export const WASHINGTON_DC: Tariff = { cur: "USD", sym: "$", unit: "mi", flag: 3.5, incl: 0, tiers: [[Infinity, 2.16]], wait: 0.58, times: [["Standard meter", 1, 0], ["Snow emergency (+25%)", 1.25, 0]], airports: [NONE, ["Reagan National (DCA) pickup fee", null, 3], ["Dulles (IAD) — Washington Flyer meter", null, 3]], extra: ["Extra passenger", 1], booking: 2 };

/** Aruba: fixed fares by destination zone from the airport or the cruise terminal (US dollars). */
export const ARUBA_ROUTES: [string, number][] = [
  ["Airport → Oranjestad downtown / cruise terminal", 25], ["Airport → Eagle Beach low-rise hotels", 30], ["Airport → Palm Beach high-rise hotels", 35],
  ["Airport → Noord / Malmok / Arashi", 40], ["Airport → Savaneta / San Nicolas / Baby Beach", 40], ["Cruise terminal → Eagle Beach", 15],
  ["Cruise terminal → Palm Beach", 20], ["Palm Beach → Oranjestad", 20], ["Palm Beach → Eagle Beach", 12],
];
export const aruba: TrvCalculator = (v) => {
  const r = ARUBA_ROUTES[pick(v.route, ARUBA_ROUTES.length)], base = pos(v.override, 0) || r[1];
  const night = pick(v.night, 2) === 1 ? 5 : 0, sun = pick(v.sun, 2) === 1 ? 5 : 0, pax = Math.max(1, Math.round(pos(v.pax, 2)));
  const extraPax = Math.max(0, pax - 4) * 3, wait = pos(v.wait, 0) * 0.5, tipPct = pos(v.tip, 10) / 100;
  const fare = base + night + sun + extraPax + wait, tip = fare * tipPct, total = fare + tip;
  return { total: r2(total), fare: r2(base), extras: r2(night + sun + extraPax + wait), tip: r2(tip), per: r2(total / pax), how: `${r[0]}: ${money(base)} fixed fare (up to 4 people)${night ? " + $5 night" : ""}${sun ? " + $5 Sunday/holiday" : ""}${extraPax ? ` + ${money(extraPax)} for extra passengers` : ""}${wait ? ` + ${money(wait)} waiting` : ""}` };
};

export interface RideKm { base: number; km: number; min: number; fee: number; minFare: number }
export const GRAB_TH: RideKm = { base: 35, km: 8, min: 2, fee: 10, minFare: 60 };
export const grabThailand: TrvCalculator = (v) => {
  const k = (s: string, d: number) => { const x = v[s]; return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : d; };
  const c: RideKm = { base: k("base", GRAB_TH.base), km: k("rate", GRAB_TH.km), min: k("min", GRAB_TH.min), fee: k("fee", GRAB_TH.fee), minFare: k("minf", GRAB_TH.minFare) };
  const d = pos(v.dist, 10), t = pos(v.mins, 25), surge = Math.max(1, pos(v.surge, 1)), ap = pick(v.ap, 2) === 1 ? 50 : 0, tolls = pos(v.tolls, 0), tipPct = pos(v.tip, 0) / 100;
  const ride = (c.base + d * c.km + t * c.min) * surge, fare = Math.max(c.minFare, ride + c.fee) + ap, tip = fare * tipPct, total = fare + tip + tolls;
  return { total: r0(total), fare: r0(fare), ride: r0(ride), fee: r2(c.fee + ap), tip: r0(tip), perUnit: d > 0 ? r2(total / d) : 0, how: `฿${c.base} base + ฿${c.km}/km × ${nfmt(d, 1)} + ฿${c.min}/min × ${nfmt(t)}${surge > 1 ? ` × ${surge} surge` : ""} + ฿${c.fee} booking fee${ap ? " + ฿50 airport pickup" : ""}${tolls ? ` + ฿${nfmt(tolls)} expressway tolls` : ""}` };
};

// ------------------------------------------------------------------ miles
export const SKYPASS: DistPreset = { unit: "SKYPASS miles", cpp: 1.5, fares: [["Economy discount (lowest classes)", 50], ["Economy standard", 80], ["Economy full fare (Y/B)", 100], ["Prestige (business) discount", 125], ["Prestige full fare", 135], ["First", 165]], tiers: [["Member", 0], ["Morning Calm", 0], ["Morning Calm Premium", 0], ["Million Miler", 0]] };
export const ATMOS: DistPreset = { unit: "Atmos points", cpp: 1.4, min: 500, fares: [["Saver", 30], ["Main", 100], ["Premium Class", 125], ["First Class (discount)", 150], ["First Class (full fare)", 175]], tiers: [["Member", 0], ["Atmos Silver (+25%)", 25], ["Atmos Gold (+50%)", 50], ["Atmos Platinum (+100%)", 100], ["Atmos Titanium (+125%)", 125]] };
export const ROYAL_CLUB: DistPreset = { unit: "Royal Club miles", cpp: 1.0, fares: [["Economy Saver", 25], ["Economy Value", 50], ["Economy Classic", 75], ["Economy Flex", 100], ["Crown (business) Value", 125], ["Crown (business) Flex", 150]], tiers: [["Blue Jewel", 0], ["Silver Jewel (+25%)", 25], ["Gold Plus (+50%)", 50], ["Gold Plus Elite (+100%)", 100]] };

/** Price per mile in US cents (typical non-sale price, incl. fees) and typical redemption value. */
export const BUY_PROGRAMS: [string, number, number][] = [
  ["American AAdvantage", 3.76, 1.6], ["United MileagePlus", 3.5, 1.3], ["Delta SkyMiles", 3.5, 1.2], ["Alaska Atmos Rewards", 2.75, 1.4],
  ["British Airways Avios", 2.6, 1.4], ["Air Canada Aeroplan", 3.0, 1.5], ["Other / custom", 3.0, 1.3],
];
export const buyMiles: TrvCalculator = (v) => {
  const p = BUY_PROGRAMS[pick(v.prog, BUY_PROGRAMS.length)], cpm = pos(v.price, 0) || p[1], bonus = pos(v.bonus, 0) / 100, val = pos(v.value, 0) || p[2];
  let buy = Math.round(pos(v.miles, 0));
  const award = Math.round(pos(v.award, 0)), bal = Math.round(pos(v.bal, 0));
  if (buy <= 0 && award > 0) buy = Math.ceil(Math.max(0, award - bal) / (1 + bonus) / 1000) * 1000;
  if (buy <= 0) throw new InputError("Enter how many miles to buy, or the award price and your balance.");
  const cap = Math.round(pos(v.cap, 0));
  if (cap > 0 && buy > cap) buy = cap;
  const got = buy * (1 + bonus), cost = (buy * cpm) / 100, eff = (cost / got) * 100, worth = (got * val) / 100;
  const verdict = eff < val ? `Worth it — you pay ${nfmt(eff, 2)}¢ a mile and redeem at about ${nfmt(val, 2)}¢` : `Not worth it — ${nfmt(eff, 2)}¢ a mile costs more than the ${nfmt(val, 2)}¢ you'd typically get back`;
  return { cost: r2(cost), got: r0(got), eff: r2(eff), worth: r2(worth), verdict, how: `${nfmt(buy)} miles × ${nfmt(cpm, 2)}¢${bonus ? ` with a ${nfmt(bonus * 100)}% bonus = ${nfmt(r0(got))} miles` : ""}${award > 0 ? ` · award ${nfmt(award)} − balance ${nfmt(bal)}` : ""}` };
};

// ---------------------------------------------------------------- baggage
const KE_OW: [number, number][] = [[23, 100], [32, 200]];
export const KOREAN_AIR: PiecePreset = { cur: "USD", sym: "$", unit: "kg", zones: [
  { name: "Korea – Japan / China / NE Asia (economy)", free: 1, fees: [70, 100, 200], ow: [[23, 50], [32, 100]], oversize: 100 },
  { name: "Korea – SE Asia / Central Asia (economy)", free: 1, fees: [100, 150, 200], ow: [[23, 70], [32, 150]], oversize: 150 },
  { name: "Korea – Europe / Middle East / Oceania (economy)", free: 1, fees: [150, 200, 250], ow: KE_OW, oversize: 200 },
  { name: "Korea – Americas (economy)", free: 2, fees: [200, 200, 250], ow: KE_OW, oversize: 200 },
  { name: "Korea domestic (economy, 20 kg free)", free: 1, fees: [30, 30, 30], ow: [[20, 20], [32, 40]], oversize: 30 },
] };
export const BRUSSELS: PiecePreset = { cur: "EUR", sym: "€", unit: "kg", zones: [
  { name: "Within Europe (Economy Classic / Flex)", free: 1, fees: [60, 70, 150], online: 15, ow: [[23, 80]], oversize: 150 },
  { name: "Within Europe (Economy Light, hand baggage only)", free: 0, fees: [60, 70, 150], online: 15, ow: [[23, 80]], oversize: 150 },
  { name: "Africa (Economy)", free: 2, fees: [100, 150, 200], online: 20, ow: [[23, 100]], oversize: 200 },
  { name: "North America / Asia (Economy)", free: 1, fees: [150, 150, 250], online: 25, ow: [[23, 150]], oversize: 250 },
] };

/** Turkish Airlines pet fees (EUR, per pet, one way): [zone, in-cabin PETC, hold AVIH]. */
export const TK_PET: [string, number, number][] = [
  ["Domestic Turkey", 35, 50], ["Turkey – Europe / Northern Cyprus", 70, 110], ["Turkey – Middle East / North Africa / Central Asia", 80, 130],
  ["Turkey – Far East / Africa", 120, 220], ["Turkey – Americas", 150, 280],
];
export const turkishPet: TrvCalculator = (v) => {
  const z = TK_PET[pick(v.zone, TK_PET.length)], hold = pick(v.where, 2) === 1, kg = pos(v.kg, 6), pets = Math.max(1, Math.round(pos(v.pets, 1))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  if (!hold && kg > 8) throw new InputError("In the cabin the pet and carrier together may weigh up to 8 kg — choose the hold (AVIH) for heavier pets.");
  if (hold && kg > 75) throw new InputError("Pets over 75 kg with their crate travel as cargo, not as checked baggage.");
  const fee = pos(v.override, 0) || (hold ? z[2] : z[1]), one = fee * pets, total = one * rt;
  return { total: r2(total), one: r2(one), fee: r2(fee), rule: `${z[0]} · ${hold ? "in the hold (AVIH), pet + crate" : "in the cabin (PETC), pet + carrier up to 8 kg"} · ${nfmt(kg, 1)} kg`, note: hold ? "Snub-nosed dog and cat breeds are not accepted in the hold. Book by phone at least 48 hours ahead." : "Cats, dogs and small birds only; carrier max 23 × 30 × 40 cm. Book at least 48 hours ahead." };
};

// ------------------------------------------------------- closest airport
export const closestAirport: TrvCalculator = (v) => {
  const p = findPlace(txt(v, "from"), "city"), unit = pick(v.unit, 2), road = pos(v.road, 1.25) || 1.25, speed = pos(v.speed, 50) || 50, n = Math.min(8, Math.max(1, Math.round(pos(v.n, 3))));
  const list = airportList().map((a) => ({ a, km: gcKm(p, a) })).filter((x) => x.km > 0.5 || x.a.name !== p.name).sort((x, y) => x.km - y.km);
  if (!list.length) throw new InputError("No airport found.");
  const conv = (km: number) => (unit === 1 ? km / KM_PER_MI : km), u = unit === 1 ? "mi" : "km";
  const first = list[0], roadD = conv(first.km * road), mins = ((first.km * road) / (unit === 1 ? speed * KM_PER_MI : speed)) * 60;
  return {
    name: first.a.name, dist: r1(conv(first.km)), road: r1(roadD), time: r0(mins),
    list: list.slice(0, n).map((x, i) => `${i + 1}. ${x.a.name} — ${nfmt(r1(conv(x.km)), 1)} ${u} straight line`).join(" · "),
    from: /^-?[0-9]/.test(p.name) ? p.name : `${p.name} (${p.lat.toFixed(3)}, ${p.lon.toFixed(3)})`,
  };
};

// --------------------------------------------------------- Seoul subway
export const SEOUL_RIDER = ["Adult (T-money card)", "Adult (single-journey ticket)", "Youth 13–18 (T-money)", "Child 6–12 (T-money)"];
export const seoulSubway: TrvCalculator = (v) => {
  const km = pos(v.km, 12), r = pick(v.rider, 4), rides = Math.max(1, Math.round(pos(v.rides, 4))), days = Math.max(1, Math.round(pos(v.days, 3)));
  const base = [1550, 1650, 900, 550][r];
  let extra = 0;
  if (km > 10) extra += Math.ceil((Math.min(km, 50) - 10) / 5) * 100;
  if (km > 50) extra += Math.ceil((km - 50) / 8) * 100;
  const fare = r === 3 ? base : r === 2 ? base + Math.round((extra * 0.8) / 10) * 10 : base + extra;
  const payg = fare * rides * days;
  const PASS: [string, number, number][] = [["Climate Card tourist 1 day", 5000, 1], ["Climate Card tourist 2 days", 8000, 2], ["Climate Card tourist 3 days", 10000, 3], ["Climate Card tourist 5 days", 15000, 5], ["Climate Card 30 days (subway + bus)", 62000, 30]];
  const opts = PASS.map(([nm, p, d]) => [nm, p * Math.ceil(days / d)] as [string, number]);
  const best = opts.sort((a, b) => a[1] - b[1])[0];
  return { fare, payg: r0(payg), best: r < 2 && best[1] < payg ? `${best[0]}: ${money(best[1], "₩", 0)} — saves ${money(payg - best[1], "₩", 0)}` : `Pay as you go (cheapest pass ${money(best[1], "₩", 0)})`, band: `${nfmt(km, 1)} km: ₩${nfmt(base)} base covers 10 km${extra ? `, +₩${nfmt(fare - base)} distance charge` : ""}` };
};

// ------------------------------------------------------ trips & cruises
export const koreaTrip: TrvCalculator = (v) => {
  const t = pick(v.tier, 3), days = Math.max(1, Math.round(pos(v.days, 7))), pax = Math.max(1, Math.round(pos(v.pax, 2))), rooms = Math.ceil(pax / 2), fx = pos(v.fx, 1380) || 1380;
  const stay = [70000, 150000, 400000][t] * rooms * Math.max(1, days - 1), food = [35000, 70000, 180000][t] * pax * days, local = [8000, 12000, 30000][t] * pax * days, act = pos(v.act, 25000) * pax * days;
  const railSel = pick(v.rail, 3), rail = railSel === 1 ? 160000 * pax : railSel === 2 ? pos(v.railamt, 120000) * pax : 0, flights = pos(v.flight, 1000) * fx * pax, sim = pos(v.sim, 30000) * pax;
  const total = stay + food + local + act + rail + flights + sim;
  return { total: r0(total), usd: r2(total / fx), per: r0(total / pax), stay: r0(stay), food: r0(food), move: r0(local + rail), act: r0(act + sim), flights: r0(flights) };
};

export const CRUISE_LINES: [string, number][] = [["Carnival", 16], ["Royal Caribbean", 18], ["Norwegian (NCL)", 20], ["MSC", 16], ["Celebrity", 19], ["Princess", 17], ["Disney Cruise Line", 14.5], ["Virgin Voyages (included)", 0], ["Custom", 0]];
export const cruiseCost: TrvCalculator = (v) => {
  const nights = Math.max(1, Math.round(pos(v.nights, 7))), pax = Math.max(1, Math.round(pos(v.pax, 2))), line = CRUISE_LINES[pick(v.line, CRUISE_LINES.length)];
  const fare = pos(v.fare, 900) * pax, port = pos(v.port, 200) * pax, grat = (pos(v.grat, 0) || line[1]) * nights * pax;
  const drinkers = Math.min(pax, Math.round(pos(v.drinkers, 0))), drinks = pos(v.drink, 0) * nights * drinkers * 1.18, wifi = pos(v.wifi, 0) * nights;
  const exc = pos(v.exc, 0) * pax, travel = pos(v.travel, 0) * pax + pos(v.hotel, 0), spa = pos(v.onboard, 0), ins = ((fare + port) * pos(v.ins, 0)) / 100;
  const onboard = grat + drinks + wifi + spa, total = fare + port + onboard + exc + travel + ins;
  return { total: r2(total), per: r2(total / pax), night: r2(total / pax / nights), base: r2(fare + port), onboard: r2(onboard), shore: r2(exc + travel + ins), how: `${line[0]} gratuities ${money(grat / nights / pax)}/person/night${drinks ? ` · drink package incl. 18% service` : ""} · fare + taxes ${money(fare + port)}` };
};

export const trvExtraCustomCalculators: Record<string, TrvCalculator> = {
  "seattle-taxi-fare-calculator": (v: Vals) => meter(SEATTLE, v),
  "vancouver-taxi-fare-calculator": (v: Vals) => meter(VANCOUVER, v),
  "washington-dc-taxi-fare-calculator": (v: Vals) => meter(WASHINGTON_DC, v),
  "aruba-taxi-fare-calculator": aruba,
  "grab-fare-calculator-thailand": grabThailand,
  "korean-air-skypass-miles-calculator": (v: Vals) => distEarn(SKYPASS, v),
  "alaska-airlines-miles-calculator": (v: Vals) => distEarn(ATMOS, v),
  "royal-jordanian-royal-club-miles-calculator": (v: Vals) => distEarn(ROYAL_CLUB, v),
  "buy-miles-calculator": buyMiles,
  "korean-air-baggage-calculator": (v: Vals) => pieceFee(KOREAN_AIR, v),
  "brussels-airlines-baggage-calculator": (v: Vals) => pieceFee(BRUSSELS, v),
  "turkish-airlines-pet-fee-calculator": turkishPet,
  "closest-airport-calculator": closestAirport,
  "seoul-subway-fare-calculator": seoulSubway,
  "south-korea-trip-cost-calculator": koreaTrip,
  "cruise-cost-calculator": cruiseCost,
};
