/**
 * Batch: "Travel Calculators" → Distance, Route & Travel Time (12 tools).
 *
 * Places come from the built-in table in trv-core.ts (cities, IATA airports, ports or typed
 * coordinates). Straight-line distance is the haversine great-circle distance (Earth radius
 * 6,371.0088 km). There is no live routing service, so road distance = straight line × a road
 * factor (default 1.20 — typical detour ratio for intercity roads; 1.3–1.4 in mountains or along
 * coasts) and sea distance = great circle × a sea-routing factor (default 1.15). Every factor is an
 * input the user can change. Near-namesakes, kept distinct on purpose:
 *  - distance-calculator: one A→B distance (straight line + estimated road) and drive time.
 *  - round-trip-mileage-calculator: A→B→A mileage for N trips with a cost/reimbursement rate.
 *  - multi-stop-route-calculator: legs of a list of stops, optional nearest-neighbour reordering.
 *  - travel-time-calculator: time from a distance you already know, by mode, with breaks.
 *  - eta-calculator: clock time of arrival from a departure time.
 *  - departure-time-calculator: works backwards from the time you must arrive.
 *  - when-to-leave-for-airport-calculator: backwards from the flight's departure time using the
 *    airport arrival rule (domestic 2 h / international 3 h) plus parking/security.
 *  - sea-distance-calculator: port-to-port nautical miles; voyage-time-calculator: time and fuel
 *    for a voyage at a speed in knots.
 * See prisma/create-trv-dist-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, txt, num, pos, pick, findPlace, placeList, gcKm, bearing, compass, midpoint, nearestPlace, latLonText, parseClock, clockText, durText, dayText, dateIn, dayParts, dayNum, r1, r2, r0, KM_PER_MI, NM_PER_KM, money, nfmt, clamp } from "./trv-core";

export const UNIT = ["Miles", "Kilometres"];
export const MODE = ["Car (highway)", "Car (mixed city/highway)", "Car (city)", "Bus / coach", "Bicycle", "Electric scooter", "Walking", "Train (intercity)", "Custom speed"];
const MODE_KMH = [100, 75, 35, 70, 16, 18, 5, 110, 0];

const leg = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => gcKm(a, b);
const toUnit = (km: number, u: number) => (u === 0 ? km / KM_PER_MI : km);
const uName = (u: number) => (u === 0 ? "mi" : "km");
/** Speed input in the chosen unit → km/h. */
const kmh = (v: Vals, u: number, def: number) => { const s = pos(v.speed, def); if (s <= 0) throw new InputError("Enter an average speed above zero."); return u === 0 ? s * KM_PER_MI : s; };
/** Driving time incl. a break of `brk` minutes every `every` hours of driving. */
const withBreaks = (driveMin: number, every: number, brk: number) => driveMin + (every > 0 ? Math.max(0, Math.ceil(driveMin / (every * 60)) - 1) * brk : 0);

// 1. distance-calculator
export const distance: TrvCalculator = (v) => {
  const a = findPlace(txt(v, "from")), b = findPlace(txt(v, "to")), u = pick(v.unit, 2);
  const f = clamp(num(v.factor, 1.2), 1, 3), km = leg(a, b), road = km * f, spd = kmh(v, u, u === 0 ? 60 : 95);
  const mins = (road / spd) * 60, br = bearing(a, b);
  return {
    road: r1(toUnit(road, u)), straight: r1(toUnit(km, u)), other: `${nfmt(r1(toUnit(road, 1 - u)), 1)} ${uName(1 - u)} by road · ${nfmt(r1(toUnit(km, 1 - u)), 1)} ${uName(1 - u)} straight`,
    time: durText(mins), dir: `${Math.round(br)}° (${compass(br)})`, route: `${a.name} → ${b.name}`,
  };
};

// 2. travel-time-calculator
export const travelTime: TrvCalculator = (v) => {
  const u = pick(v.unit, 2), d = pos(v.dist, 300), m = pick(v.mode, MODE.length);
  const spd = m === MODE.length - 1 ? kmh(v, u, 60) : MODE_KMH[m], dKm = u === 0 ? d * KM_PER_MI : d;
  if (spd <= 0) throw new InputError("Enter a speed above zero.");
  const traffic = 1 + pos(v.traffic, 0) / 100, move = (dKm / spd) * 60 * traffic, total = withBreaks(move, pos(v.every, 2), pos(v.brk, 15)) + pos(v.stops, 0);
  return { total: durText(total), moving: durText(move), breaks: durText(total - move), avg: r1(toUnit(spd / traffic, u)), hours: r2(total / 60) };
};

// 3. sea-distance-calculator
export const seaDistance: TrvCalculator = (v) => {
  const a = findPlace(txt(v, "from"), "port"), b = findPlace(txt(v, "to"), "port"), f = clamp(num(v.factor, 1.15), 1, 3);
  const km = leg(a, b), sea = km * f, nm = sea * NM_PER_KM, kn = pos(v.kn, 14);
  return { nm: r0(nm), km: r0(sea), mi: r0(sea / KM_PER_MI), gc: r0(km * NM_PER_KM), days: kn > 0 ? r2(nm / kn / 24) : 0, route: `${a.name} → ${b.name}` };
};

// 4. halfway-point-calculator
export const halfway: TrvCalculator = (v) => {
  const pts = placeList(txt(v, "places"), 2, 10), mid = midpoint(pts), near = nearestPlace(mid), u = pick(v.unit, 2);
  const far = Math.max(...pts.map((p) => gcKm(p, mid)));
  return {
    mid: latLonText(mid), near: `${near.place.name} (about ${nfmt(r0(toUnit(near.km, u)))} ${uName(u)} from the midpoint)`,
    each: pts.map((p) => `${p.name}: ${nfmt(r1(toUnit(gcKm(p, mid), u)), 1)} ${uName(u)}`).join(" · "), far: r1(toUnit(far, u)),
    map: `${mid.lat.toFixed(5)}, ${mid.lon.toFixed(5)}`,
  };
};

// 5. eta-calculator
export const eta: TrvCalculator = (v) => {
  const dep = parseClock(txt(v, "dep"), "Departure time"), u = pick(v.unit, 2), d = pos(v.dist, 250), spd = pos(v.speed, 60);
  if (spd <= 0) throw new InputError("Enter an average speed above zero.");
  const move = (d / spd) * 60, stops = pos(v.stops, 0), tz = num(v.tz, 0) * 60, arr = dep + move + stops + tz;
  return { eta: clockText(arr), dur: durText(move + stops), move: durText(move), local: tz ? `Arrival shown in destination time (${num(v.tz, 0) > 0 ? "+" : ""}${num(v.tz, 0)} h)` : "Same time zone", unit: `${nfmt(d, 1)} ${uName(u)} at ${spd} ${u === 0 ? "mph" : "km/h"}` };
};

// 6. multi-stop-route-calculator
export const multiStop: TrvCalculator = (v) => {
  let pts = placeList(txt(v, "stops"), 2, 12);
  const u = pick(v.unit, 2), f = clamp(num(v.factor, 1.2), 1, 3), opt = pick(v.opt, 2) === 1, ret = pick(v.ret, 2) === 1;
  if (opt && pts.length > 3) {
    const start = pts[0], end = ret ? null : pts[pts.length - 1], mid = pts.slice(1, end ? -1 : undefined), order = [start];
    while (mid.length) { const last = order[order.length - 1]; let bi = 0; mid.forEach((p, i) => { if (gcKm(last, p) < gcKm(last, mid[bi])) bi = i; }); order.push(mid.splice(bi, 1)[0]); }
    if (end) order.push(end);
    pts = order;
  }
  const route = ret ? [...pts, pts[0]] : pts, legs: string[] = [];
  let tot = 0;
  for (let i = 1; i < route.length; i++) { const d = gcKm(route[i - 1], route[i]) * f; tot += d; legs.push(`${route[i - 1].name.split(",")[0]} → ${route[i].name.split(",")[0]}: ${nfmt(r1(toUnit(d, u)), 1)} ${uName(u)}`); }
  const spd = kmh(v, u, u === 0 ? 55 : 90);
  return { total: r1(toUnit(tot, u)), time: durText((tot / spd) * 60 + pos(v.dwell, 0) * (route.length - 2)), legs: legs.join(" · "), order: route.map((p) => p.name.split(",")[0]).join(" → "), n: route.length - 1 };
};

// 7. departure-time-calculator
export const departure: TrvCalculator = (v) => {
  const arr = parseClock(txt(v, "arr"), "Arrive-by time"), u = pick(v.unit, 2), d = pos(v.dist, 30), spd = pos(v.speed, 35);
  if (spd <= 0) throw new InputError("Enter an average speed above zero.");
  const RUSH = [0, 25, 50, 80], traffic = RUSH[pick(v.rush, 4)] + pos(v.extra, 0), move = (d / spd) * 60 * (1 + traffic / 100), buf = pos(v.buffer, 10);
  const leave = arr - move - buf;
  return { leave: clockText(leave), travel: durText(move), buffer: durText(buf), latest: clockText(arr - move), note: `${nfmt(d, 1)} ${uName(u)} at ${spd} ${u === 0 ? "mph" : "km/h"} + ${traffic}% traffic` };
};

// 8. passport-validity-calculator
export const PP_RULE = ["6 months beyond arrival (most of Asia, Middle East, Africa)", "3 months beyond departure (Schengen Area)", "6 months beyond departure", "Valid for the whole stay (US, Canada, UK, Japan, Australia*)", "1 month beyond departure"];
export const passport: TrvCalculator = (v) => {
  const today = dateIn(v, "today", 20400), exp = dateIn(v, "exp", 21000), arr = dateIn(v, "arr", 20450), dep = Math.max(arr, dateIn(v, "dep", 20460)), rule = pick(v.rule, PP_RULE.length);
  const addM = (day: number, m: number) => { const p = dayParts(day); const t = dayNum(p.y, p.m + m, 1), last = dayParts(dayNum(p.y, p.m + m + 1, 0)).d; return t + Math.min(p.d, last) - 1; };
  const need = [addM(arr, 6), addM(dep, 3), addM(dep, 6), dep, addM(dep, 1)][rule], ok = exp >= need;
  return {
    status: ok ? "✅ Valid for this trip under the chosen rule" : "❌ Not valid enough — renew before you travel",
    need: dayText(need), spare: ok ? `${exp - need} days to spare` : `${need - exp} days short`,
    left: `${exp - today} days (${r1((exp - today) / 30.44)} months) left on the passport`, renew: dayText(addM(exp, -9)),
    note: rule === 1 ? "Schengen also requires the passport to have been issued within the last 10 years." : "Many countries also need 1–2 blank visa pages.",
  };
};

// 9. driving-radius-calculator
export const radius: TrvCalculator = (v) => {
  const c = findPlace(txt(v, "from")), u = pick(v.unit, 2), mins = pos(v.mins, 60), spd = kmh(v, u, u === 0 ? 50 : 80), f = clamp(num(v.factor, 1.3), 1, 3);
  const roadKm = (spd * mins) / 60, rKm = roadKm / f, area = Math.PI * rKm ** 2;
  const reach = nearestPlace(c).place, within = [] as string[];
  for (const p of placeList(txt(v, "check") || c.name, 1, 12)) within.push(`${p.name.split(",")[0]}: ${gcKm(c, p) <= rKm ? "within reach" : "outside"} (${nfmt(r0(toUnit(gcKm(c, p) * f, u)))} ${uName(u)} by road)`);
  return { r: r1(toUnit(rKm, u)), road: r1(toUnit(roadKm, u)), area: r0(u === 0 ? area / KM_PER_MI ** 2 : area), check: within.join(" · "), centre: `${c.name} (${latLonText(c)}) — nearest listed city: ${reach.name}` };
};

// 10. voyage-time-calculator
export const voyage: TrvCalculator = (v) => {
  const DU = ["Nautical miles", "Kilometres", "Statute miles"], du = pick(v.du, 3), d = pos(v.dist, 1200), nm = du === 0 ? d : du === 1 ? d * NM_PER_KM : d * KM_PER_MI * NM_PER_KM;
  const kn = pos(v.kn, 12), port = pos(v.port, 0);
  if (kn <= 0) throw new InputError("Enter a speed above zero knots.");
  const hrs = nm / kn + port, fuel = (nm / kn) * pos(v.burn, 0);
  return { time: durText(hrs * 60), days: r2(hrs / 24), nm: r1(nm), fuel: r0(fuel), fuelCost: r2(fuel * pos(v.price, 0)), unit: DU[du] };
};

// 11. when-to-leave-for-airport-calculator
export const FL_TYPE = ["Domestic flight", "International flight", "Domestic, bags to check", "International, bags to check"];
export const airportLeave: TrvCalculator = (v) => {
  const dep = parseClock(txt(v, "dep"), "Flight departure time"), t = pick(v.type, 4), ARR = [90, 150, 120, 180], early = ARR[t];
  const drive = pos(v.drive, 45), traffic = pos(v.traffic, 15), park = pos(v.park, 15), pre = pick(v.pre, 2) === 1 ? -20 : 0, extra = pos(v.extra, 0);
  const atAirport = dep - early - pre - extra, leave = atAirport - park - drive * (1 + traffic / 100);
  return { leave: clockText(leave), at: clockText(atAirport), board: clockText(dep - (t % 2 === 1 ? 45 : 30)), total: durText(dep - leave), rule: `${durText(early + pre)} before departure at the terminal${pre ? " (PreCheck / fast-track saves ~20 min)" : ""}` };
};

// 12. round-trip-mileage-calculator
export const roundTrip: TrvCalculator = (v) => {
  const u = pick(v.unit, 2), mode = pick(v.how, 2);
  let one = pos(v.dist, 25), label = "entered distance";
  if (mode === 0) { const a = findPlace(txt(v, "from")), b = findPlace(txt(v, "to")); one = toUnit(gcKm(a, b) * clamp(num(v.factor, 1.2), 1, 3), u); label = `${a.name} ↔ ${b.name} (estimated road)`; }
  const trips = Math.max(1, Math.round(pos(v.trips, 1))), total = (one * 2 + pos(v.side, 0)) * trips, rate = pos(v.rate, 0.7);
  return { total: r1(total), rt: r1(one * 2), one: r1(one), cost: r2(total * rate), desc: `${label}, ${trips} round trip${trips > 1 ? "s" : ""} × ${money(rate, "$", 3)}/${uName(u)}` };
};

export const trvDistCustomCalculators: Record<string, TrvCalculator> = {
  "distance-calculator": distance,
  "travel-time-calculator": travelTime,
  "sea-distance-calculator": seaDistance,
  "halfway-point-calculator": halfway,
  "eta-calculator": eta,
  "multi-stop-route-calculator": multiStop,
  "departure-time-calculator": departure,
  "passport-validity-calculator": passport,
  "driving-radius-calculator": radius,
  "voyage-time-calculator": voyage,
  "when-to-leave-for-airport-calculator": airportLeave,
  "round-trip-mileage-calculator": roundTrip,
};
