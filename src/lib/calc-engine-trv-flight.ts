/**
 * Batch: "Travel Calculators" → Flight, Baggage & Airfare (flight half, 14 tools).
 *
 * Distances: great-circle between airports (built-in IATA list in trv-core.ts). Flight time =
 * distance ÷ (cruise true airspeed + wind component) + 30 min for taxi, climb and descent — the
 * usual block-time rule of thumb. Charter pricing = flight hours (with the operator daily minimum)
 * × typical 2026 US hourly rates by jet class, plus 7.5% US federal excise tax and fees. UK261:
 * £220 / £350 / £520 by distance band (≤1,500 km, 1,500–3,500 km, >3,500 km), halved when a
 * re-routed arrival is within 2 / 3 / 4 h. US refunds: DOT rule in force since Oct 2024 —
 * "significant change" = 3 h domestic / 6 h international; no cash delay compensation in US law.
 * US ticket taxes: 7.5% excise on the base fare, flight-segment fee, September 11 security fee
 * ($5.60 per one-way, max $11.20 round trip), PFC up to $4.50 per airport (max 2 per one-way),
 * international arrival/departure tax. Every rate is an editable input.
 * Near-namesakes kept distinct: flight-time (airline block time) vs private-jet-flight-time (by
 * jet class, fuel stops by range) vs flight-arrival-time (clock time across time zones);
 * private-jet-charter-cost (whole-trip price) vs private-jet-fuel-cost (fuel only).
 * See prisma/create-trv-flight-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, txt, num, pos, pick, findPlace, placeList, gcKm, bearing, compass, midpoint, latLonText, parseClock, clockText, durText, r0, r1, r2, KM_PER_MI, NM_PER_KM, money, nfmt, clamp } from "./trv-core";

const nmOf = (km: number) => km * NM_PER_KM;
/** Distance in km from either two places (how = 0) or an entered distance in `du` units. */
function tripKm(v: Vals, defKm: number) {
  if (pick(v.how, 2) === 0) {
    const a = findPlace(txt(v, "from"), "airport"), b = findPlace(txt(v, "to"), "airport");
    return { km: gcKm(a, b), label: `${a.name} → ${b.name}` };
  }
  const du = pick(v.du, 3), d = pos(v.dist, defKm);
  return { km: du === 0 ? d * KM_PER_MI : du === 1 ? d : d * 1.852, label: "entered distance" };
}
export const DU = ["Miles", "Kilometres", "Nautical miles"];

export const AIRCRAFT = ["Narrow-body jet (737 / A320)", "Wide-body jet (787 / A350 / 777)", "Superjumbo (A380 / 747)", "Regional jet (E175 / CRJ)", "Turboprop (ATR 72 / Q400)", "Private light jet", "Private midsize jet", "Private heavy jet", "Small piston plane (Cessna 172)", "Custom speed"];
const AC_KT = [453, 488, 490, 430, 275, 400, 450, 480, 122, 0];

// 1. flight-time-calculator
export const flightTime: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 3451), ac = pick(v.ac, AIRCRAFT.length), tas = ac === AIRCRAFT.length - 1 ? pos(v.kt, 450) : AC_KT[ac];
  const gs = tas + num(v.wind, 0);
  if (gs <= 20) throw new InputError("Ground speed must be above 20 knots — check the wind.");
  const air = (nmOf(km) / gs) * 60, block = air + pos(v.taxi, 30);
  return { block: durText(block), air: durText(air), mi: r0(km / KM_PER_MI), km: r0(km), gs: r0(gs), route: label };
};

// 2. flight-distance-calculator
export const flightDistance: TrvCalculator = (v) => {
  const pts = placeList(txt(v, "route"), 2, 8, "airport");
  let km = 0;
  const legs: string[] = [];
  for (let i = 1; i < pts.length; i++) { const d = gcKm(pts[i - 1], pts[i]); km += d; legs.push(`${pts[i - 1].code ?? pts[i - 1].name} → ${pts[i].code ?? pts[i].name}: ${nfmt(r0(d / KM_PER_MI))} mi`); }
  const direct = gcKm(pts[0], pts[pts.length - 1]), br = bearing(pts[0], pts[1]);
  return { mi: r0(km / KM_PER_MI), km: r0(km), nm: r0(nmOf(km)), legs: legs.join(" · "), direct: r0(direct / KM_PER_MI), dir: `${Math.round(br)}° (${compass(br)}) initial heading`, mid: latLonText(midpoint([pts[0], pts[pts.length - 1]])) };
};

// 3. flight-cost-calculator
export const CABIN = ["Economy", "Premium economy", "Business", "First"];
const CABIN_X = [1, 1.8, 4, 6.5];
export const BOOK = ["3+ months ahead", "1–3 months ahead", "2–4 weeks ahead", "Under 2 weeks", "Last minute (under 3 days)"];
const BOOK_X = [0.9, 1, 1.15, 1.4, 1.8];
export const flightCost: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 1000), mi = km / KM_PER_MI, cab = pick(v.cabin, 4), bk = pick(v.book, 5), rt = pick(v.rt, 2) === 1 ? 2 : 1, pax = Math.max(1, Math.round(pos(v.pax, 1)));
  const perMi = pos(v.permi, 0.14), base = pos(v.base, 50), peak = 1 + pos(v.peak, 0) / 100;
  const fareOne = (base + mi * perMi) * CABIN_X[cab] * BOOK_X[bk] * peak, fare = fareOne * rt, taxes = pos(v.tax, 40) * rt, bags = pos(v.bags, 0) * rt;
  const per = fare + taxes + bags;
  return { total: r2(per * pax), per: r2(per), fare: r2(fare), taxes: r2(taxes + bags), cpm: r2(per / (mi * rt)), route: `${label} · ${nfmt(r0(mi))} mi ${rt === 2 ? "each way" : "one way"}` };
};

// 4. jet-lag-calculator
export const jetLag: TrvCalculator = (v) => {
  const zones = clamp(Math.round(pos(v.zones, 6)), 0, 12), east = pick(v.dir, 2) === 0, pre = clamp(Math.round(pos(v.pre, 3)), 0, 7), age = pick(v.age, 2);
  const rate = east ? 1 : 1.5, shifted = Math.min(zones, pre), rec = Math.max(0, Math.ceil(((zones - shifted) / rate) * (age === 1 ? 1.2 : 1)));
  const bed = parseClock(txt(v, "bed") || "23:00", "Usual bedtime"), plan: string[] = [];
  for (let d = pre; d >= 1; d--) { const step = Math.min(zones, pre - d + 1); plan.push(`Day −${d}: bed ${clockText(bed + (east ? -60 : 60) * step)}`); }
  return {
    rec: rec === 0 ? "Little or no jet lag expected" : `About ${rec} day${rec > 1 ? "s" : ""} to adjust`,
    sev: zones <= 2 ? "Mild" : zones <= 5 ? "Moderate" : "Strong",
    plan: plan.length ? plan.join(" · ") : "No pre-trip shift chosen",
    light: east ? "Get bright morning light at the destination and avoid bright light in the late evening for the first days." : "Get bright light in the late afternoon/evening at the destination and avoid early-morning light.",
    tip: east ? "Flying east is harder: your body clock has to run ahead. Consider a small melatonin dose at the new bedtime (ask a doctor)." : "Flying west is easier: staying up a little later comes naturally.",
  };
};

// 5. us-flight-delay-refund-calculator
export const REFUND_EVENT = ["Flight cancelled", "Departure or arrival changed (delay)", "Downgraded to a lower cabin", "Extra connection added / airport changed"];
export const usRefund: TrvCalculator = (v) => {
  const ev = pick(v.event, 4), intl = pick(v.intl, 2) === 1, hrs = pos(v.hrs, 3.5), took = pick(v.took, 2) === 1, price = pos(v.price, 450), unused = pos(v.unused, 100) / 100;
  const sig = ev === 0 || ev === 2 || ev === 3 || hrs >= (intl ? 6 : 3);
  const elig = sig && !took;
  const lower = ev === 2 ? pos(v.diff, 0) : 0, fare = elig ? price * unused : lower, extras = elig ? pos(v.extras, 0) : 0;
  const bagLate = pos(v.bagh, 0) > (intl ? (pos(v.long, 0) ? 30 : 15) : 12), bag = bagLate ? pos(v.bagfee, 0) : 0;
  return {
    refund: r2(fare + extras + bag),
    status: elig ? "✅ Cash refund owed — the airline must refund automatically within 7 business days (card) or 20 days (other)" : took ? "You accepted the rebooking or travel credit, so no cash refund is due for the ticket" : ev === 1 ? `Not a 'significant change' yet — needs ${intl ? 6 : 3}+ hours (${intl ? "international" : "domestic"})` : "Not eligible",
    fare: r2(fare), extras: r2(extras), bag: r2(bag),
    note: "US law has no fixed cash compensation for delays; many airlines promise meal vouchers for 3+ hour controllable delays (see the DOT Airline Customer Service Dashboard). EU/UK departures may also qualify for EU261/UK261 compensation.",
  };
};

// 6. uk261-flight-delay-compensation-calculator
export const UK_EVENT = ["Delayed on arrival", "Cancelled (told under 14 days before)", "Denied boarding (overbooked)"];
export const UK_CAUSE = ["Airline's fault (technical, crew, scheduling)", "Extraordinary (weather, ATC, security, strike by non-airline staff)"];
export const uk261: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 1200), ev = pick(v.event, 3), cause = pick(v.cause, 2), hrs = pos(v.hrs, 3.5), pax = Math.max(1, Math.round(pos(v.pax, 1)));
  const band = km <= 1500 ? 0 : km <= 3500 ? 1 : 2, AMT = [220, 350, 520], LIM = [2, 3, 4];
  let per = AMT[band], why = "";
  if (cause === 1 && ev !== 2) { per = 0; why = "Extraordinary circumstances — no compensation (you still get care and a refund or re-routing)"; }
  else if (ev === 0 && hrs < 3) { per = 0; why = "Arrival delay under 3 hours — no compensation"; }
  else if (ev === 1 && pick(v.rer, 2) === 1 && pos(v.late, 0) <= LIM[band]) { per /= 2; why = `Re-routed and arrived within ${LIM[band]} h of the original time — compensation halved`; }
  else why = `Eligible: ${["up to 1,500 km", "1,500–3,500 km", "over 3,500 km"][band]} band`;
  return { total: per * pax, per, status: why, dist: `${nfmt(r0(km))} km (${label})`, care: hrs >= [2, 3, 4][band] ? "Right to care: meals, drinks and hotel if overnight" : "Care starts after 2 h (short), 3 h (medium) or 4 h (long) delays" };
};

// 7. flight-tax-calculator
export const TAX_MODE = ["US domestic ticket", "US international ticket", "UK departure (Air Passenger Duty)"];
export const APD_BAND = ["Domestic UK", "Band A (up to 2,000 miles)", "Band B (2,001–5,500 miles)", "Band C (over 5,500 miles)"];
const APD_R = [7, 15, 94, 102], APD_S = [15, 32, 258, 280];
export const flightTax: TrvCalculator = (v) => {
  const mode = pick(v.mode, 3), base = pos(v.base, 300), seg = Math.round(pos(v.segs, 2)), rt = pick(v.rt, 2) === 1, pax = Math.max(1, Math.round(pos(v.pax, 1)));
  if (mode === 2) {
    const band = pick(v.band, 4), prem = pick(v.cabin, 2) === 1, apd = pos(v.apdo, 0) || (prem ? APD_S : APD_R)[band];
    const tot = apd + pos(v.other, 0);
    return { total: r2(tot * pax), excise: 0, seg: 0, sec: 0, pfc: 0, other: r2(tot), all: r2((base + tot) * pax), note: `APD ${money(apd, "£")} per passenger (${prem ? "premium cabins" : "economy"}, 2025/26 rates) — charged once per departure from the UK` };
  }
  const excise = mode === 0 ? base * pos(v.exc, 7.5) / 100 : 0, segFee = mode === 0 ? seg * pos(v.segfee, 5.3) : 0;
  const sec = Math.min(rt ? 11.2 : 5.6, (rt ? 2 : 1) * 5.6), pfc = Math.min(seg, rt ? 4 : 2) * pos(v.pfc, 4.5), intl = mode === 1 ? (rt ? 2 : 1) * pos(v.intlt, 22.9) : 0, other = pos(v.other, 0) + intl;
  const tot = excise + segFee + sec + pfc + other;
  return { total: r2(tot * pax), excise: r2(excise), seg: r2(segFee), sec: r2(sec), pfc: r2(pfc), other: r2(other), all: r2((base + tot) * pax), note: `Taxes add ${r1((tot / Math.max(1, base)) * 100)}% on top of the base fare` };
};

// 8. flight-arrival-time-calculator
export const flightArrival: TrvCalculator = (v) => {
  const dep = parseClock(txt(v, "dep"), "Departure time"), m = (txt(v, "dur") || "7:30").match(/^(\d{1,2})(?::|h\s*)?(\d{1,2})?\s*m?$/i);
  if (!m) throw new InputError("Flight duration: enter hours and minutes like 7:30.");
  const dur = Number(m[1]) * 60 + Number(m[2] ?? 0), o = num(v.otz, -5), d = num(v.dtz, 0), arrLocal = dep + dur + (d - o) * 60;
  return { arr: clockText(arrLocal), dur: durText(dur), diff: `${d - o >= 0 ? "+" : ""}${d - o} h time difference`, utc: `Departs ${clockText(dep - o * 60)} UTC · arrives ${clockText(dep + dur - o * 60)} UTC`, home: `${clockText(dep + dur)} back home when you land` };
};

// 9. layover-calculator
export const CONN = ["Domestic → domestic", "Domestic → international", "International → domestic (customs & re-check bags)", "International → international (transit)"];
const MCT = [45, 60, 90, 75];
export const layover: TrvCalculator = (v) => {
  const a = parseClock(txt(v, "arr"), "Arrival time"), d0 = parseClock(txt(v, "dep"), "Next departure time"), day = Math.round(pos(v.days, 0));
  let lay = d0 + day * 1440 - a;
  if (lay < 0 && day === 0) lay += 1440;
  const mct = MCT[pick(v.type, 4)] + (pick(v.term, 2) === 1 ? 20 : 0) + (pick(v.sep, 2) === 1 ? 60 : 0), spare = lay - mct;
  const risk = spare < 0 ? "⛔ Below the minimum connection time — very likely to miss it" : spare < 30 ? "⚠️ Tight — little room for a late arrival" : spare < 120 ? "✅ Comfortable" : lay >= 360 ? "🧳 Long — enough time to leave the airport if visa rules allow" : "✅ Plenty of time";
  return { lay: durText(lay), risk, mct: durText(mct), spare: spare >= 0 ? durText(spare) : `${durText(-spare)} short`, out: lay >= 360 ? `About ${durText(lay - 180)} free outside the airport (allowing 3 h for travel and security)` : "Stay airside" };
};

// 10. aircraft-range-calculator
export const FUEL_U = ["US gallons", "Litres", "Pounds (lb)", "Kilograms"];
const toGal = (x: number, u: number) => (u === 0 ? x : u === 1 ? x / 3.78541 : u === 2 ? x / 6.7 : (x * 2.20462) / 6.7);
export const aircraftRange: TrvCalculator = (v) => {
  const u = pick(v.fu, 4), fuel = toGal(pos(v.fuel, 50), u), burn = toGal(pos(v.burn, 9), u), kt = pos(v.kt, 120), resv = pos(v.res, 45), wind = num(v.wind, 0);
  if (burn <= 0 || kt <= 0) throw new InputError("Fuel burn and speed must be above zero.");
  const end = fuel / burn, usable = Math.max(0, end - resv / 60), gs = kt + wind, nm = usable * gs;
  return { nm: r0(nm), mi: r0((nm * 1.852) / KM_PER_MI), km: r0(nm * 1.852), end: durText(end * 60), usable: durText(usable * 60), gs: r0(gs) };
};

// 11. private-jet-charter-cost-calculator
export const JET = ["Turboprop (King Air, PC-12)", "Very light jet (Phenom 100, Citation M2)", "Light jet (Phenom 300, CJ3)", "Midsize jet (Citation XLS, Learjet 60)", "Super-midsize (Challenger 350, Citation Longitude)", "Heavy jet (Gulfstream G450, Falcon 2000)", "Ultra-long-range (G650, Global 7500)"];
export const JET_RATE = [2200, 3500, 4600, 5900, 7600, 9800, 13500], JET_KT = [280, 360, 410, 430, 460, 470, 490], JET_RANGE = [1200, 1100, 1900, 2000, 3200, 4000, 7000], JET_GPH = [75, 100, 160, 220, 270, 420, 500];
export const jetCharter: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 800), c = pick(v.jet, JET.length), rate = pos(v.rate, 0) || JET_RATE[c], rt = pick(v.rt, 2) === 1, pax = Math.max(1, Math.round(pos(v.pax, 4)));
  const legHrs = nmOf(km) / JET_KT[c] + 0.3 + Math.max(0, Math.ceil(nmOf(km) / JET_RANGE[c]) - 1) * 0.75, legs = rt ? 2 : 1;
  const pos0 = (pos(v.posit, rt ? 0 : 50) / 100) * legHrs, minDay = pos(v.min, 1.5);
  const hrs = Math.max(legHrs * legs + pos0, minDay), flight = hrs * rate, fet = pick(v.us, 2) === 1 ? flight * 0.075 : 0;
  const fees = pos(v.fees, 1200) * legs + pos(v.night, 0) * pos(v.nightfee, 1500) + pax * legs * 5.3;
  const total = flight + fet + fees;
  return { total: r2(total), per: r2(total / pax), hrs: r2(hrs), flight: r2(flight), fet: r2(fet), fees: r2(fees), route: `${label} · ${nfmt(r0(km / KM_PER_MI))} mi each way` };
};

// 12. private-jet-flight-time-calculator
export const jetTime: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 2000), c = pick(v.jet, JET.length), nm = nmOf(km), gs = JET_KT[c] + num(v.wind, 0);
  if (gs <= 50) throw new InputError("Ground speed is too low — check the headwind.");
  const stops = Math.max(0, Math.ceil(nm / (JET_RANGE[c] * (1 + num(v.wind, 0) / JET_KT[c]))) - 1), t = (nm / gs) * 60 + 18 + stops * 45;
  return { time: durText(t), air: durText((nm / gs) * 60), stops, range: `${nfmt(JET_RANGE[c])} nm typical range, ${JET_KT[c]} kt cruise`, route: `${label} · ${nfmt(r0(nm))} nm` };
};

// 13. private-jet-fuel-cost-calculator
export const jetFuel: TrvCalculator = (v) => {
  const c = pick(v.jet, JET.length + 1), gph = c === JET.length ? pos(v.gph, 200) : JET_GPH[c], hrs = pos(v.hrs, 2.5), price = pos(v.price, 6.5), taxi = pos(v.taxi, 20) / 60;
  const gal = gph * (hrs + taxi), res = gph * 0.75;
  return { cost: r2(gal * price), gal: r0(gal), lb: r0(gal * 6.7), l: r0(gal * 3.78541), res: r0(res), perh: r2(gph * price) };
};

// 14. helicopter-charter-cost-calculator
export const HELI = ["Robinson R44 (3 pax)", "Robinson R66 (4 pax)", "Bell 206 JetRanger (4 pax)", "Airbus H125 / AS350 (5–6 pax)", "Bell 407 (6 pax)", "Leonardo AW109 (6–7 pax, twin)", "Sikorsky S-76 (8 pax, twin)"];
const HELI_RATE = [750, 1100, 1600, 2400, 2800, 4500, 6500], HELI_KT = [110, 120, 110, 130, 133, 150, 155];
export const heliCharter: TrvCalculator = (v) => {
  const { km, label } = tripKm(v, 60), h = pick(v.heli, HELI.length), rate = pos(v.rate, 0) || HELI_RATE[h], rt = pick(v.rt, 2) === 1;
  const legH = nmOf(km) / HELI_KT[h] + 0.15, hrs = Math.max(legH * (rt ? 2 : 1) + (rt ? 0 : legH * pos(v.ferry, 100) / 100), pos(v.min, 1));
  const wait = pos(v.wait, 0) * rate * pos(v.waitpct, 25) / 100, total = hrs * rate + wait + pos(v.fees, 250);
  return { total: r2(total), time: durText(legH * 60), hrs: r2(hrs), wait: r2(wait), route: `${label} · ${nfmt(r0(km / KM_PER_MI))} mi` };
};

export const trvFlightCustomCalculators: Record<string, TrvCalculator> = {
  "flight-time-calculator": flightTime,
  "flight-distance-calculator": flightDistance,
  "flight-cost-calculator": flightCost,
  "jet-lag-calculator": jetLag,
  "us-flight-delay-refund-calculator": usRefund,
  "uk261-flight-delay-compensation-calculator": uk261,
  "flight-tax-calculator": flightTax,
  "flight-arrival-time-calculator": flightArrival,
  "layover-calculator": layover,
  "aircraft-range-calculator": aircraftRange,
  "private-jet-charter-cost-calculator": jetCharter,
  "private-jet-flight-time-calculator": jetTime,
  "private-jet-fuel-cost-calculator": jetFuel,
  "helicopter-charter-cost-calculator": heliCharter,
};
