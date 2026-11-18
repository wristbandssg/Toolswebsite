/**
 * Idea build, batch trip1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Travel > Airline Miles & Hotel Points (11),
 * Distance, Route & Travel Time (5), Flights & Baggage (9), Taxi & Rideshare (2), Trains & Rail Passes (7), Trip Costs (9) = 43 tools.
 * Figures: NYC subway/local bus base fare $3.00 from 4 Jan 2026 with a $35 OMNY 7-day cap (MTA); Deutschlandticket €63/month from
 * 1 Jan 2026; UK Railcards save ⅓ on most fares; common carry-on limits (US majors 22 × 14 × 9 in; Southwest/Frontier 24 × 16 × 10;
 * Ryanair free bag 40 × 20 × 25 cm; easyJet free bag 45 × 36 × 20 cm; British Airways 56 × 45 × 25 cm; Lufthansa/Air Canada
 * 55 × 40 × 23 cm; Emirates 55 × 38 × 20 cm); checked-bag limits 23 kg/50 lb economy, 32 kg/70 lb premium. Points "floor" values are
 * typical cash/portal redemptions — editable, since programs change. Southwest Companion Pass threshold editable (135,000 qualifying
 * points or 100 one-way flights per calendar year). Prices are editable typical defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, dateIn, dayText, dayParts, dayNum } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const today = () => Math.floor(Date.now() / 86400000);
const hm = (h: number) => { const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, "0")} min`; };
const addMonths = (day: number, m: number) => { const d = dayParts(day); const tot = d.m - 1 + Math.round(m), y = d.y + Math.floor(tot / 12), mo = ((tot % 12) + 12) % 12 + 1; return dayNum(y, mo, Math.min(d.d, new Date(Date.UTC(y, mo, 0)).getUTCDate())); };

// ---- Miles & points ----
export const transferValue: Calc = (v) => {
  const pts = P(v, "p", 60000, "Points"), ratio = P(v, "r", 1, "Transfer ratio"), bonus = Z(v, "b", 0) / 100, cash = Z(v, "c", 900), tax = Z(v, "t", 80), need = Z(v, "n", 60000);
  const miles = pts * ratio * (1 + bonus), cpp = need ? ((cash - tax) / need) * 100 : 0, cppPts = need ? ((cash - tax) / (need / (ratio * (1 + bonus)))) * 100 : 0;
  return { m: `${f(Math.round(miles))} airline/hotel points after transfer`, v: need ? `Redemption worth ${f(cppPts)}¢ per bank point (${f(cpp)}¢ per mile) — ${miles >= need ? "you have enough" : `${f(need - miles)} short`}` : "Enter an award cost to value it", note: `${f(ratio)}:1${bonus ? ` + ${pc(bonus, 0)} transfer bonus` : ""} · value = (cash price − taxes/fees) ÷ points · transfers are usually one-way and final — have the award seat confirmed first` };
};
export const statusProgress: Calc = (v) => {
  const have = Z(v, "h", 42000), need = P(v, "n", 75000, "Status threshold"), per = P(v, "e", 5, "Points per dollar"), cc = Z(v, "c", 0), d = dateIn(v, "d", dayNum(dayParts(today()).y, 12, 31));
  const left = Math.max(0, need - have - cc), spend = left / per, days = Math.max(1, d - today());
  return { p: `${pc(Math.min(1, (have + cc) / need), 0)} of the way — ${f(left)} to go`, s: left ? `≈ ${$(spend)} more airline spend (${$((spend / days) * 30)} a month until ${dayText(d)})` : "Status reached", note: `${f(per)} status points per $1 (enter your fare class/earn rate)${cc ? ` · ${f(cc)} from credit card or bonuses included` : ""} · programs change rules yearly — check the qualifying period` };
};
const bank = (name: string, floor: number, xfer: number, note: string): Calc => (v) => {
  const pts = P(v, "p", 80000, "Points"), fl = Z(v, "f", floor), tr = Z(v, "t", xfer);
  return { v: `Worth ≈ ${$(pts * tr / 100)} transferred to partners (${f(tr)}¢) · ${$(pts * fl / 100)} at the floor (${f(fl)}¢)`, b: `${f(pts)} ${name} points`, note: `${note} · good transfer redemptions often beat ${f(tr)}¢; cash-back style redemptions sit at the floor · valuations are estimates — edit both` };
};
export const chase = bank("Chase Ultimate Rewards", 1, 1.8, "Cash back = 1¢; travel portal varies by card (Points Boost); partners include Hyatt, United, Southwest");
export const amex = bank("Amex Membership Rewards", 0.6, 1.8, "Statement credit ~0.6¢, flights via Amex Travel 1¢; partners include Delta, ANA, Air France-KLM, Hilton");
export const capone = bank("Capital One miles", 1, 1.7, "Travel purchase eraser = 1¢; partners include Air Canada Aeroplan, Turkish, Avianca, Wyndham");
export const citi = bank("Citi ThankYou", 1, 1.6, "Cash/travel ~1¢ on premium cards; partners include Turkish, Virgin Atlantic, Choice, AA (Citi Strata Elite)");
export const bilt = bank("Bilt", 1, 1.8, "Travel portal/flat redemptions ~1–1.25¢; partners include Hyatt, United, Alaska, American, Air Canada");
export const companion: Calc = (v) => {
  const have = Z(v, "h", 60000), need = P(v, "n", 135000, "Qualifying points"), fl = Z(v, "f", 30), nf = P(v, "x", 100, "Flight threshold"), spend = Z(v, "s", 2000), rate = P(v, "r", 1, "Card earn");
  const left = Math.max(0, need - have), mo = spend * rate ? left / (spend * rate) : Infinity;
  return { p: `${pc(Math.min(1, have / need), 0)} to Companion Pass by points (${f(left)} to go) · ${f(Math.max(0, nf - fl))} flights to go by flights`, t: Number.isFinite(mo) ? `≈ ${f(Math.ceil(mo))} months of ${$(spend)}/month card spend at ${f(rate)} pt/$` : "Add monthly spend to estimate time", note: "Earn it early in the year and it lasts the rest of that year plus the next · card sign-up bonuses count as qualifying points · confirm the current threshold with Southwest" };
};
export const freeNight: Calc = (v) => {
  const cash = P(v, "c", 320, "Cash rate"), tax = Z(v, "t", 15) / 100, resort = Z(v, "r", 0), pts = Z(v, "p", 30000), fee = Z(v, "a", 0), cert = Z(v, "x", 0);
  const saved = cash * (1 + tax) + resort, cpp = pts ? ((saved - fee) / pts) * 100 : 0;
  return { v: `This night is worth ${$(saved)} (incl. ${pc(tax, 0)} tax${resort ? ` and ${$(resort)} resort fee` : ""})`, c: pts ? `${f(cpp)}¢ per point for ${f(pts)} points` : `Certificate value ${$(saved)}${cert ? ` vs its ${$(cert)} annual fee` : ""}`, note: "Award nights usually waive taxes (resort fees often still apply on Hilton/Marriott awards) · fifth-night-free deals boost value" };
};
export const pointsVsCash: Calc = (v) => {
  const cash = P(v, "c", 450, "Cash price"), pts = P(v, "p", 30000, "Points price"), fees = Z(v, "f", 5.6), val = P(v, "v", 1.4, "Your point value (¢)"), earn = Z(v, "e", 5);
  const cpp = ((cash - fees) / pts) * 100, lost = (cash * earn * val) / 100, eff = ((cash - fees - lost) / pts) * 100;
  return { r: eff >= val ? `Use points — ${f(eff)}¢ per point (after lost earnings) beats your ${f(val)}¢ value` : `Pay cash — ${f(eff)}¢ per point after lost earnings (${f(cpp)}¢ raw) is below your ${f(val)}¢ value`, d: `Cash ${$2(cash)} vs ${f(pts)} points + ${$2(fees)} · paying cash would earn ~${f(cash * earn)} points (worth ${$2(lost)})`, note: "Include the points you'd earn by paying cash · keep a points stash for expensive, last-minute or peak trips" };
};
export const milesExpire: Calc = (v) => {
  const d = dateIn(v, "d", today() - 400), m = Z(v, "m", 24), bal = Z(v, "b", 25000), val = Z(v, "v", 1.3);
  if (!m) return { e: "No expiration — this program's miles don't expire", a: `${f(bal)} miles worth ≈ ${$(bal * val / 100)}`, note: "Delta, United, Southwest, JetBlue and Alaska miles don't expire as long as the account stays open" };
  const ex = addMonths(d, m), left = ex - today();
  return { e: left > 0 ? `Expires ${dayText(ex)} (${f(left)} days)` : `Expired ${dayText(ex)} — call the program about reinstatement`, a: `${f(bal)} miles worth ≈ ${$(bal * val / 100)} at risk`, note: `${f(m)} months after your last activity (${dayText(d)}) · any earning or redeeming — even a small shopping-portal purchase — usually resets the clock` };
};
// ---- Distance & travel time ----
export const driveTime: Calc = (v) => {
  const d = P(v, "d", 450, "Distance"), sp = P(v, "s", 60, "Average speed"), br = Z(v, "b", 2), bl = Z(v, "x", 15), fuel = Z(v, "f", 0), fm = Z(v, "y", 10), meals = Z(v, "m", 1), mm = Z(v, "z", 40), start = num(v.t, 8) * 60;
  const drive = d / sp, stops = (Math.floor(drive / Math.max(0.5, br)) * bl + fuel * fm + meals * mm) / 60, tot = drive + stops, arr = start + tot * 60;
  const ct = (x: number) => { const m = ((Math.round(x) % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`; };
  return { t: `${hm(tot)} total — arrive ≈ ${ct(arr)}${arr >= 1440 ? " (next day)" : ""}`, d: `${hm(drive)} driving at ${f(sp)} average + ${hm(stops)} stops (breaks every ${f(br)} h, ${f(fuel)} fuel, ${f(meals)} meal${meals === 1 ? "" : "s"})`, note: "Average speed including traffic is usually 10–20% below the speed limit · take a 15-minute break every 2 hours" };
};
export const tripStops: Calc = (v) => {
  const d = P(v, "d", 900, "Distance"), range = P(v, "r", 350, "Range per tank"), buf = Math.min(80, Z(v, "b", 20)) / 100, maxDay = P(v, "x", 500, "Max per day"), sp = P(v, "s", 60, "Average speed");
  const leg = range * (1 - buf), fuel = Math.max(0, Math.ceil(d / leg) - 1), days = Math.ceil(d / maxDay), nights = days - 1;
  return { s: `${fuel} fuel stop${fuel === 1 ? "" : "s"} (every ~${f(Math.round(leg))}) · ${nights} overnight stop${nights === 1 ? "" : "s"}`, p: `${days} driving day${days > 1 ? "s" : ""} of about ${f(Math.round(d / days))} (${hm(d / days / sp)} each)`, note: `Refuel with ${pc(buf, 0)} still in the tank · plan overnight stops near the end of each day's leg · same units throughout (miles or km)` };
};
export const walkTime: Calc = (v) => {
  const d = P(v, "d", 3, "Distance"), km = pick(v.u, 2) === 1, sp = pick(v.s, 3), up = Z(v, "g", 0), dist = km ? d : d * 1.60934, kmh = [4, 5, 6.4][sp];
  const t = dist / kmh + up / 600;
  return { t: `≈ ${hm(t)}`, d: `${f(dist)} km at ${f(kmh)} km/h (${["leisurely", "average", "brisk"][sp]})${up ? ` + ${f(up)} m climb (Naismith: +1 h per 600 m)` : ""}`, note: `About ${f(Math.round(dist * 1312))} steps · average adults walk ~5 km/h (3.1 mph) · add time for crossings and crowds` };
};
export const bikeTime: Calc = (v) => {
  const d = P(v, "d", 12, "Distance"), km = pick(v.u, 2) === 1, sp = pick(v.s, 4), up = Z(v, "g", 0), dist = km ? d : d * 1.60934, kmh = [12, 16, 22, 25][sp];
  const t = dist / kmh + up / (sp === 3 ? 900 : 450), stops = Z(v, "n", 0) * 0.5 / 60;
  return { t: `≈ ${hm(t + stops)}`, d: `${f(dist)} km at ${f(kmh)} km/h (${["casual", "commuter", "fit road rider", "e-bike"][sp]})${up ? ` + ${f(up)} m of climbing` : ""}`, note: "City riding with lights is often 12–18 km/h door to door · e-bikes keep their speed on hills" };
};
export const evStops: Calc = (v) => {
  const d = P(v, "d", 600, "Trip distance (km)"), range = P(v, "r", 400, "Full range (km)"), start = Math.min(100, Z(v, "s", 90)) / 100, arr = Math.min(50, Z(v, "a", 10)) / 100, charge = Math.min(100, Z(v, "c", 80)) / 100, kw = P(v, "k", 150, "Charger power"), batt = P(v, "b", 75, "Battery (kWh)"), price = Z(v, "p", 0.45);
  const first = range * (start - arr), per = range * (charge - arr), rest = Math.max(0, d - first), stops = rest > 0 ? Math.ceil(rest / per) : 0, kwh = (stops * (charge - arr) * batt), mins = stops ? ((charge - arr) * batt / (kw * 0.75)) * 60 : 0;
  return { s: `${stops} charging stop${stops === 1 ? "" : "s"}`, t: stops ? `≈ ${f(Math.round(mins))} min per stop (${f(Math.round(arr * 100))}%→${f(Math.round(charge * 100))}%), ${hm((mins * stops) / 60)} charging total · ${f(Math.round(kwh))} kWh ≈ ${$2(kwh * price)}` : "No charging needed on the way", note: `First leg ${f(Math.round(first))} km from ${pc(start, 0)} · later legs ${f(Math.round(per))} km · real range drops 20–30% in cold weather and at highway speeds · average charge speed assumed 75% of the charger's rating` };
};
// ---- Flights & baggage ----
const CARRY: [string, number, number, number][] = [["US majors (AA, Delta, United, Alaska)", 22, 14, 9], ["Southwest", 24, 16, 10], ["Frontier / Spirit (paid carry-on)", 24, 16, 10], ["British Airways", 22, 17.7, 9.8], ["Lufthansa / Air Canada / Swiss", 21.7, 15.7, 9], ["Emirates", 21.7, 15, 7.9], ["Ryanair free under-seat bag", 15.7, 7.9, 9.8], ["easyJet free under-seat bag", 17.7, 14.2, 7.9]];
export const carryOn: Calc = (v) => {
  const a = pick(v.a, CARRY.length), cm = pick(v.u, 2) === 1, dims = [P(v, "l", 22, "Length"), P(v, "w", 14, "Width"), P(v, "h", 9, "Depth")].map((x) => (cm ? x / 2.54 : x)).sort((x, y) => y - x), [name, ...lim] = CARRY[a], L = [...lim].sort((x, y) => y - x);
  const ok = dims.every((x, i) => x <= L[i] + 0.01), over = dims.map((x, i) => Math.max(0, x - L[i]));
  return { r: ok ? `Fits ${name}` : `Too big for ${name} — over by ${over.map((x) => f(Math.round(x * 10) / 10)).join(" × ")} in`, d: `Your bag ${dims.map((x) => f(Math.round(x * 10) / 10)).join(" × ")} in vs limit ${L.map((x) => f(Math.round(x * 10) / 10)).join(" × ")} in (${L.map((x) => f(Math.round(x * 2.54))).join(" × ")} cm)`, note: "Limits include wheels and handles · some airlines also cap weight (e.g. 7–8 kg in Europe/Asia) · basic economy may not include a full-size carry-on" };
};
export const bagWeight: Calc = (v) => {
  const w = P(v, "w", 23, "Bag weight"), lb = pick(v.u, 2) === 1, kg = lb ? w / 2.20462 : w, lim = [23, 32, 7, 10][pick(v.l, 4)];
  return { w: `${f(Math.round(kg * 10) / 10)} kg = ${f(Math.round(kg * 2.20462 * 10) / 10)} lb`, r: kg <= lim ? `Within the ${lim} kg (${f(Math.round(lim * 2.20462))} lb) limit — ${f(Math.round((lim - kg) * 10) / 10)} kg to spare` : `Overweight by ${f(Math.round((kg - lim) * 10) / 10)} kg (${f(Math.round((kg - lim) * 2.20462 * 10) / 10)} lb)`, note: "Economy checked bags are usually 23 kg / 50 lb; premium cabins 32 kg / 70 lb (the safety maximum per bag) · overweight fees often $100–$200 · weigh with a luggage scale" };
};
export const farePerMile: Calc = (v) => {
  const fare = P(v, "f", 350, "Fare"), mi = P(v, "d", 2475, "Distance"), km = pick(v.u, 2) === 1, miles = km ? mi / 1.60934 : mi, rt = pick(v.r, 2) === 1, m = miles * (rt ? 2 : 1);
  const cpm = (fare / m) * 100;
  return { c: `${f(Math.round(cpm * 10) / 10)}¢ per mile (${f(Math.round(((fare / (m * 1.60934)) * 100) * 10) / 10)}¢ per km)`, r: cpm < 8 ? "Great deal" : cpm < 12 ? "Good fare" : cpm < 18 ? "Typical" : "Expensive", note: `${f(Math.round(m))} flown miles${rt ? " (round trip)" : ""} · short flights always cost more per mile — compare similar distances · default ≈ New York–Los Angeles` };
};
export const basicVsMain: Calc = (v) => {
  const be = P(v, "b", 220, "Basic economy fare"), mc = P(v, "m", 290, "Main cabin fare"), bags = Z(v, "c", 1), bf = Z(v, "x", 40), seat = Z(v, "s", 30), ppl = Math.max(1, num(v.p, 2)), change = Math.min(100, Z(v, "h", 20)) / 100;
  const beT = (be + bags * bf + seat) * ppl + change * be * ppl, mcT = mc * ppl;
  return { r: beT <= mcT ? `Basic economy is cheaper by ${$(mcT - beT)}` : `Main cabin is cheaper by ${$(beT - mcT)} once extras are counted`, d: `Basic ${$(be)} + ${f(bags)} carry-on/bag × ${$(bf)} + seat ${$(seat)} (+ ${pc(change, 0)} chance of losing the fare if plans change) vs main ${$(mc)} · ${f(ppl)} travellers`, note: "Basic economy usually means no seat choice, last boarding group and no changes · some US basic fares now include no full-size carry-on" };
};
export const seatFees: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 4)), legs = Math.max(1, num(v.l, 2)), fee = Z(v, "f", 35), xl = Z(v, "x", 0), xlFee = Z(v, "y", 90);
  const tot = (ppl - xl) * legs * fee + xl * legs * xlFee;
  return { t: `${$(tot)} for seat selection`, d: `${f(ppl - xl)} standard seats × ${f(legs)} flights × ${$(fee)}${xl ? ` + ${f(xl)} extra-legroom × ${$(xlFee)}` : ""}`, note: "Many US airlines now seat children 13 and under next to an accompanying adult for free · waiting for free seats at check-in can split groups" };
};
export const budgetAirline: Calc = (v) => {
  const fare = P(v, "f", 59, "Base fare"), co = Z(v, "c", 65), ck = Z(v, "k", 70), seat = Z(v, "s", 25), bp = Z(v, "b", 0), card = Z(v, "x", 0), legs = Math.max(1, num(v.l, 2)), legacy = Z(v, "g", 260);
  const tot = (fare + co + ck + seat + bp + card) * legs;
  return { t: `True cost ${$(tot)} (${legs} flight${legs > 1 ? "s" : ""})`, c: legacy ? `${tot <= legacy ? `Still ${$(legacy - tot)} cheaper` : `${$(tot - legacy)} more`} than the ${$(legacy)} full-service fare` : "Add a full-service fare to compare", note: `Per flight: fare ${$(fare)} + carry-on ${$(co)} + checked bag ${$(ck)} + seat ${$(seat)}${bp ? ` + print/boarding fee ${$(bp)}` : ""}${card ? ` + card fee ${$(card)}` : ""} · bag fees are cheapest when bought at booking` };
};
export const changeFee: Calc = (v) => {
  const orig = P(v, "o", 400, "Original fare"), nw = P(v, "n", 520, "New fare"), fee = Z(v, "f", 0), basic = pick(v.b, 2) === 1, ppl = Math.max(1, num(v.p, 1));
  if (basic) return { c: "Basic economy usually can't be changed — you may lose the fare or get a partial credit", d: `New ticket would cost ${$(nw * ppl)}`, note: "Some airlines allow changes on basic fares for a fee — check the fare rules" };
  const diff = nw - orig, pay = Math.max(0, diff) + fee, credit = Math.max(0, -diff);
  return { c: `Change costs ${$(pay * ppl)}${credit ? ` and leaves ${$(credit * ppl)} in travel credit` : ""}`, d: `Fare difference ${diff >= 0 ? "+" : "−"}${$(Math.abs(diff))}${fee ? ` + change fee ${$(fee)}` : " (no change fee on most US main-cabin fares)"} × ${f(ppl)}`, note: "Major US airlines dropped change fees on domestic main cabin and above in 2020 · same-day changes may cost a flat fee" };
};
export const petFee: Calc = (v) => {
  const t = pick(v.t, 3), fee = Z(v, "f", [125, 250, 0][t]), legs = Math.max(1, num(v.l, 2)), carrier = Z(v, "c", 60), vet = Z(v, "x", 120), cargo = Z(v, "g", 0);
  const tot = fee * legs + carrier + vet + (t === 2 ? cargo : 0);
  return { c: `≈ ${$(tot)} to fly your pet`, d: `${["In cabin", "Checked / excess baggage", "Cargo (shipper)"][t]} ${t === 2 ? `${$(cargo)}` : `${$(fee)} × ${f(legs)} flights`} + carrier ${$(carrier)} + health certificate ${$(vet)}`, note: "US in-cabin pet fees are often $95–$150 each way · in-cabin pets must fit under the seat (usually under ~20 lb with carrier) · international trips need more paperwork" };
};
export const lapInfant: Calc = (v) => {
  const adult = P(v, "a", 900, "Adult fare"), intl = pick(v.i, 2) === 1, pct = Z(v, "p", 10) / 100, tax = Z(v, "t", intl ? 60 : 0), seat = Z(v, "s", 0);
  const lap = intl ? adult * pct + tax : 0;
  return { c: intl ? `Lap infant ≈ ${$(lap)} (${pc(pct, 0)} of adult fare + taxes)` : "Lap infant flies free on US domestic flights", s: seat ? `Buying a seat: ${$(seat)} — ${$(seat - lap)} more, but safer and you can use an FAA-approved car seat` : "Children under 2 may fly on a lap", note: "FAA recommends a seat with an approved car seat · bassinets on long-haul flights are limited — request early" };
};
// ---- Taxi & rideshare ----
export const surge: Calc = (v) => {
  const base = P(v, "b", 18, "Normal fare"), m = P(v, "m", 1.8, "Surge multiplier"), wait = Z(v, "w", 20), drop = Z(v, "d", 1.2), alt = Z(v, "a", 0);
  const s = base * m;
  return { s: `Surge fare ≈ ${$2(s)} (+${$2(s - base)})`, w: `If you wait ~${f(wait)} min and surge drops to ${f(drop)}×: ≈ ${$2(base * drop)} (save ${$2(s - base * drop)})`, note: `${alt ? `Taxi/transit alternative ${$2(alt)} · ` : ""}walking a few blocks out of a surge zone or switching apps often helps · tips aren't multiplied by surge` };
};
export const taxiTip: Calc = (v) => {
  const fare = P(v, "f", 32, "Fare"), pc0 = Z(v, "p", 18) / 100, bags = Z(v, "b", 0), round = pick(v.r, 2) === 0;
  const tip = fare * pc0 + bags, tot = fare + tip, rt = round ? Math.ceil(tot) : tot;
  return { t: `Tip ${$2(tip + (rt - tot))} — total ${$2(rt)}`, d: `${pc(pc0, 0)} of ${$2(fare)}${bags ? ` + ${$2(bags)} for bags` : ""}${round ? " · rounded up" : ""}`, note: "US norm 15–20% for taxis and rideshares · add $1–$2 per bag the driver handles · tipping customs vary abroad" };
};
// ---- Trains & passes ----
const passValue = (name: string): Calc => (v) => {
  const pass = P(v, "p", name === "Eurail" ? 470 : 420, "Pass price"), legs = [1, 2, 3, 4, 5, 6].map((i) => Z(v, `l${i}`, [80, 120, 60, 95, 0, 0][i - 1])), res = Z(v, "r", 0), extra = Z(v, "x", 0);
  const tot = legs.reduce((a, b) => a + b, 0), passTot = pass + res, val = tot + extra;
  return { r: val > passTot ? `Pass saves ${$(val - passTot)}` : `Point-to-point tickets save ${$(passTot - val)}`, d: `Tickets ${$(tot)}${extra ? ` + included extras (museums, boats, local transport) ${$(extra)}` : ""} vs pass ${$(pass)}${res ? ` + seat reservations ${$(res)}` : ""}`, note: name === "Eurail" ? "High-speed and night trains need paid reservations on top of the pass · early-booked saver tickets often beat passes" : "Swiss Travel Pass covers trains, buses, boats and many museums, plus discounts on mountain railways · compare with the Half Fare Card" };
};
export const eurail = passValue("Eurail");
export const swiss = passValue("Swiss");
export const nycSubway: Calc = (v) => {
  const rides = Z(v, "r", 14), fare = P(v, "f", 3, "Fare"), cap = P(v, "c", 35, "7-day cap"), red = pick(v.d, 2) === 1;
  const fr = red ? fare / 2 : fare, cp = red ? cap / 2 : cap, pay = Math.min(rides * fr, cp);
  return { c: `${$2(pay)} for ${f(rides)} rides in 7 days`, d: rides * fr > cp ? `Capped — rides ${f(Math.ceil(cp / fr) + 1)} onward are free (${$2(rides * fr - cp)} saved)` : `${f(Math.ceil(cp / fr) - rides)} more rides to hit the ${$2(cp)} cap`, note: `${red ? "Reduced fare (half price) · " : ""}OMNY 2026: $3.00 base fare with a $35 rolling 7-day cap when you tap the same card or phone · free subway–bus transfers within 2 hours` };
};
export const trainPlane: Calc = (v) => {
  const tr = P(v, "t", 2.75, "Train hours"), ta = Z(v, "a", 0.5), fl = P(v, "f", 1.25, "Flight hours"), ap = Z(v, "x", 1.5), sec = Z(v, "s", 1.5), dw = Z(v, "d", 0.5), wk = pick(v.w, 2) === 0;
  const train = tr + ta + 0.25, plane = fl + ap + sec + dw;
  return { r: train <= plane ? `Train is faster door to door by ${hm(plane - train)}` : `Flying is faster by ${hm(train - plane)}`, d: `Train ${hm(train)} (incl. ${hm(ta)} to the station) vs plane ${hm(plane)} (incl. airport transfers ${hm(ap)}, security/boarding ${hm(sec)}, deplaning/bags ${hm(dw)})`, note: `${wk ? "Train time is usable for work · " : ""}rail usually wins up to ~3–4 hours of train time · flights emit far more CO₂ per passenger` };
};
export const trainCar: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), tk = P(v, "t", 85, "Train ticket per person"), km = P(v, "d", 400, "Distance"), cpm = P(v, "c", 0.76, "Car cost per mile/km"), park = Z(v, "k", 40), toll = Z(v, "l", 15), rt = pick(v.r, 2) === 1;
  const n = rt ? 2 : 1, train = tk * ppl * n, car = (km * cpm + toll) * n + park;
  return { r: train <= car ? `Train is cheaper by ${$(car - train)}` : `Driving is cheaper by ${$(train - car)}`, d: `Train ${$(train)} for ${f(ppl)} vs car ${$(car)} (${f(km * n)} × ${$2(cpm)} + tolls ${$(toll * n)} + parking ${$(park)})`, note: "Use your full per-mile cost (fuel, wear, depreciation — IRS 76¢/mile from July 2026) or just fuel for a car you already own · more passengers favour driving" };
};
export const railcard: Calc = (v) => {
  const spend = Z(v, "s", 400), card = P(v, "c", 35, "Railcard price"), off = Z(v, "d", 33.33) / 100, elig = Math.min(100, Z(v, "e", 90)) / 100;
  const sav = spend * elig * off - card;
  return { s: sav >= 0 ? `Railcard saves ≈ £${f(Math.round(sav))} a year` : `Not worth it — you'd lose £${f(Math.round(-sav))}`, b: `Break-even at £${f(Math.round(card / (off * elig)))} of eligible fares a year (${pc(off, 0)} off)`, note: "Most UK Railcards (16–25, 26–30, Senior, Two Together, Family & Friends) give ⅓ off; morning peak restrictions apply to some · enter the current card price" };
};
export const dTicket: Calc = (v) => {
  const price = P(v, "p", 63, "Ticket price"), trips = Z(v, "t", 40), single = P(v, "s", 3.5, "Average single fare"), emp = Z(v, "e", 0) / 100, monthly = Z(v, "m", 0);
  const pay = price * (1 - emp), alt = monthly || trips * single;
  return { r: pay < alt ? `Deutschlandticket saves €${f(Math.round(alt - pay))} a month` : `Single tickets are €${f(Math.round(pay - alt))} cheaper this month`, b: `Break-even at ${f(Math.ceil(pay / single))} trips a month (€${f(pay)}${emp ? ` after a ${pc(emp, 0)} Jobticket subsidy` : ""})`, note: "€63 a month from 1 Jan 2026 · valid on all local and regional transport across Germany (not ICE/IC/EC) · monthly subscription, cancel by the 10th" };
};
// ---- Trip costs ----
export const universal: Calc = (v) => {
  const a = Z(v, "a", 2), k = Z(v, "k", 2), days = Math.max(1, num(v.d, 3)), ta = Z(v, "t", 140), tk = Z(v, "c", 135), ex = Z(v, "x", 0), hotel = Z(v, "h", 220), nights = Z(v, "n", 3), food = Z(v, "f", 60), travel = Z(v, "r", 1200), park = Z(v, "p", 35), sou = Z(v, "s", 100);
  const tickets = (a * ta + k * tk) * days, ppl = a + k, tot = tickets + ex * ppl + hotel * nights + food * ppl * days + travel + park * days + sou;
  return { t: `≈ ${$(tot)} total (${$(tot / ppl)} per person)`, d: `Tickets ${$(tickets)}${ex ? ` · Express ${$(ex * ppl)}` : ""} · hotel ${$(hotel * nights)} · food ${$(food * ppl * days)} · travel ${$(travel)} · parking ${$(park * days)} · souvenirs ${$(sou)}`, note: "Ticket prices vary by date — multi-day tickets cost less per day · Express passes can double the ticket cost on busy days" };
};
export const parkDays: Calc = (v) => {
  const p = [1, 2, 3, 4, 5].map((i) => Z(v, `d${i}`, [160, 310, 430, 520, 580][i - 1]));
  const rows = p.map((x, i) => [i + 1, x, x / (i + 1)] as const).filter(([, x]) => x > 0), best = rows.reduce((b, r) => (r[2] < b[2] ? r : b));
  return { v: rows.map(([d, x, per]) => `${d} day${d > 1 ? "s" : ""}: ${$(x)} (${$(per)}/day)`).join(" · "), b: `Lowest per-day price: ${best[0]}-day ticket at ${$(best[2])}/day`, note: "Each extra day usually costs far less than the first · only buy days you'll really use" };
};
export const cruiseGrat: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), n = P(v, "n", 7, "Nights"), rate = P(v, "r", 18.5, "Gratuity per person per day"), suite = pick(v.s, 2) === 1 ? Z(v, "x", 2.5) : 0, drinks = Z(v, "d", 0), svc = Z(v, "c", 20) / 100;
  const g = ppl * n * (rate + suite), dsvc = drinks * svc;
  return { t: `Gratuities ≈ ${$2(g)}`, d: `${f(ppl)} × ${f(n)} nights × ${$2(rate + suite)}${suite ? " (suite rate)" : ""}${drinks ? ` · ${pc(svc, 0)} service charge on ${$(drinks)} of drinks/spa = ${$2(dsvc)}` : ""}`, note: "Typical daily gratuities run about $16–$22 per person · many lines let you prepay · extra cash tips for great service are optional" };
};
export const allInc: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), n = P(v, "n", 5, "Nights"), rate = P(v, "r", 550, "Nightly rate (room, all-inclusive)"), fl = Z(v, "f", 500), tr = Z(v, "t", 80), exc = Z(v, "e", 200), tip = Z(v, "x", 10), spa = Z(v, "s", 0), tax = Z(v, "c", 0) / 100;
  const room = rate * n * (1 + tax), tot = room + fl * ppl + tr + exc * ppl + tip * n + spa;
  return { t: `≈ ${$(tot)} total (${$(tot / ppl)} per person)`, d: `Resort ${$(room)} · flights ${$(fl * ppl)} · transfers ${$(tr)} · excursions ${$(exc * ppl)} · tips ${$(tip * n)}${spa ? ` · spa ${$(spa)}` : ""}`, note: "Check if the rate is per room or per person and whether taxes and tips are included · compare with a regular hotel + meals" };
};
export const perPerson: Calc = (v) => {
  const shared = [Z(v, "a", 1800), Z(v, "b", 400), Z(v, "c", 300)], ppl = Math.max(1, num(v.p, 4)), ind = [Z(v, "d", 450), Z(v, "e", 60), Z(v, "f", 100)], days = Math.max(1, num(v.n, 5));
  const sh = shared.reduce((a, b) => a + b, 0), per = sh / ppl + ind[0] + (ind[1] + 0) * days + ind[2];
  return { p: `≈ ${$(per)} per person (${$(per * ppl)} group total)`, d: `Shared lodging/car/activities ${$(sh)} ÷ ${f(ppl)} = ${$(sh / ppl)} + flight ${$(ind[0])} + food ${$(ind[1])}/day × ${f(days)} + extras ${$(ind[2])}`, note: `${$(per / days)} per person per day · collect deposits early and track who paid what with a group-split tool` };
};
export const safari: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), n = P(v, "n", 6, "Nights"), lodge = P(v, "l", 600, "Lodge per person per night"), fees = Z(v, "f", 80), fl = Z(v, "a", 1400), local = Z(v, "x", 450), visa = Z(v, "v", 50), tips = Z(v, "t", 30), ins = Z(v, "i", 150);
  const tot = ppl * (n * (lodge + fees + tips) + fl + local + visa + ins);
  return { t: `≈ ${$(tot)} total (${$(tot / ppl)} per person)`, d: `Per person: lodge ${$(lodge * n)} · park/conservation fees ${$(fees * n)} · guide tips ${$(tips * n)} · international flights ${$(fl)} · bush flights/transfers ${$(local)} · visa ${$(visa)} · insurance ${$(ins)}`, note: "Safari lodges often include meals and game drives · park fees vary widely by country (Tanzania and Rwanda's gorilla permits are among the highest) · shoulder seasons cost less" };
};
export const npTrip: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 4)), days = Math.max(1, num(v.d, 4)), entry = Z(v, "e", 35), pass = pick(v.y, 2) === 1, camp = Z(v, "c", 35), nights = Z(v, "n", 3), lodge = Z(v, "l", 0), gas = Z(v, "g", 250), food = Z(v, "f", 25), gear = Z(v, "x", 0);
  const ent = pass ? 80 : entry, stay = lodge || camp, tot = ent + stay * nights + gas + food * ppl * days + gear;
  return { t: `≈ ${$(tot)} (${$(tot / ppl)} per person)`, d: `Entry ${pass ? "annual pass $80" : `${$(entry)} per vehicle`} · ${lodge ? "lodging" : "camping"} ${$(stay * nights)} · gas ${$(gas)} · food ${$(food * ppl * days)}${gear ? ` · gear ${$(gear)}` : ""}`, note: "Most US parks charge per vehicle for 7 days · the $80 America the Beautiful pass pays off after 3 parks · popular parks need timed-entry or campsite reservations months ahead" };
};
export const groupSplit: Calc = (v) => {
  const paid = [Z(v, "a", 600), Z(v, "b", 250), Z(v, "c", 0), Z(v, "d", 150)], names = ["A", "B", "C", "D"], n = Math.max(2, Math.min(4, Math.round(num(v.n, 4))));
  const p = paid.slice(0, n), tot = p.reduce((s, x) => s + x, 0), share = tot / n, bal = p.map((x) => x - share);
  const debt = bal.map((b, i) => ({ i, b })).filter((x) => x.b < -0.005).sort((a, b) => a.b - b.b), cred = bal.map((b, i) => ({ i, b })).filter((x) => x.b > 0.005).sort((a, b) => b.b - a.b), tr: string[] = [];
  let di = 0, ci = 0; while (di < debt.length && ci < cred.length) { const amt = Math.min(-debt[di].b, cred[ci].b); tr.push(`${names[debt[di].i]} pays ${names[cred[ci].i]} ${$2(amt)}`); debt[di].b += amt; cred[ci].b -= amt; if (debt[di].b > -0.005) di++; if (cred[ci].b < 0.005) ci++; }
  return { s: tr.length ? tr.join(" · ") : "Everyone is even", d: `Total ${$2(tot)} ÷ ${n} = ${$2(share)} each · ${p.map((x, i) => `${names[i]} paid ${$2(x)}`).join(", ")}`, note: "Fewest-payments settle-up · for unequal shares (e.g. someone skipped a dinner) split that expense separately" };
};
export const hajj: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), pkg = P(v, "k", 9500, "Package per person"), fl = Z(v, "f", 0), visa = Z(v, "v", 0), qurb = Z(v, "q", 200), spend = Z(v, "s", 600), ins = Z(v, "i", 80), vacc = Z(v, "x", 100), umrah = pick(v.t, 2) === 1;
  const per = pkg + fl + visa + (umrah ? 0 : qurb) + spend + ins + vacc;
  return { t: `≈ ${$(per * ppl)} for ${f(ppl)} (${$(per)} per person)`, d: `Package ${$(pkg)}${fl ? ` + flights ${$(fl)}` : ""}${visa ? ` + visa ${$(visa)}` : ""}${umrah ? "" : ` + qurbani ${$(qurb)}`} + spending ${$(spend)} + insurance ${$(ins)} + vaccinations ${$(vacc)}`, note: `${umrah ? "Umrah packages are usually far cheaper than Hajj and available most of the year" : "Hajj packages are sold through licensed operators (Nusuk for many countries) and include accommodation, transport in Mina/Arafat and fees"} · check what your package already includes · meningococcal vaccination is required` };
};

// ---- registry (generated)
export const ideaTrip1CustomCalculators: Record<string, Calc> = {
  "credit-card-points-transfer-value-calculator": transferValue,
  "airline-status-qualifying-miles-calculator": statusProgress,
  "southwest-companion-pass-progress-calculator": companion,
  "hotel-free-night-value-calculator": freeNight,
  "points-vs-cash-booking-calculator": pointsVsCash,
  "miles-expiration-calculator": milesExpire,
  "road-trip-driving-time-calculator": driveTime,
  "road-trip-stops-planner-calculator": tripStops,
  "walking-time-between-places-calculator": walkTime,
  "biking-time-between-places-calculator": bikeTime,
  "ev-road-trip-charging-stops-calculator": evStops,
  "carry-on-size-check-calculator": carryOn,
  "baggage-weight-limit-converter-calculator": bagWeight,
  "airfare-price-per-mile-calculator": farePerMile,
  "basic-economy-vs-main-cabin-calculator": basicVsMain,
  "seat-selection-fee-total-calculator": seatFees,
  "budget-airline-true-cost-calculator": budgetAirline,
  "flight-change-fee-calculator": changeFee,
  "pet-travel-airline-fee-calculator": petFee,
  "lap-infant-fare-calculator": lapInfant,
  "surge-pricing-cost-calculator": surge,
  "taxi-tip-calculator": taxiTip,
  "nyc-subway-fare-cap-calculator": nycSubway,
  "train-vs-plane-time-calculator": trainPlane,
  "train-vs-car-cost-calculator": trainCar,
  "uk-railcard-savings-calculator": railcard,
  "german-deutschland-ticket-value-calculator": dTicket,
  "universal-studios-trip-cost-calculator": universal,
  "theme-park-ticket-per-day-value-calculator": parkDays,
  "cruise-gratuities-calculator": cruiseGrat,
  "all-inclusive-resort-cost-calculator": allInc,
  "vacation-cost-per-person-calculator": perPerson,
  "safari-trip-cost-calculator": safari,
  "national-park-trip-cost-calculator": npTrip,
  "travel-group-expense-split-calculator": groupSplit,
  "hajj-umrah-cost-calculator": hajj,
  "chase-ultimate-rewards-value-calculator": chase,
  "amex-membership-rewards-value-calculator": amex,
  "capital-one-miles-value-calculator": capone,
  "citi-thankyou-points-value-calculator": citi,
  "bilt-points-value-calculator": bilt,
  "eurail-pass-value-calculator": eurail,
  "swiss-travel-pass-value-calculator": swiss,
};
