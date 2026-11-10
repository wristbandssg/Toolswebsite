/**
 * Batch: "Travel Calculators" → Toll Calculators (22 tools).
 *
 * Toll operators publish interchange-to-interchange tables that are far too large to embed, so
 * each tool uses one of three honest models with the operator's 2026 average rates as editable
 * defaults (and says to confirm exact tolls with the operator's own calculator):
 *  - Distance-based roads (turnpikes, tollways, French/Italian autoroutes, 407 ETR): toll =
 *    distance × average rate for the payment method × vehicle-class multiplier (+ fixed charges).
 *  - Barrier/plaza roads and crossings (Garden State Parkway, Atlantic City Expressway,
 *    Maryland facilities, New Hampshire plazas): toll = Σ plazas × per-plaza rate.
 *  - Europe: per-km toll countries plus vignette countries (cheapest vignette covering the trip).
 * E-ZPass and I-66 tools compare transponder vs plate rates and dynamic express-lane prices.
 * Near-namesakes: e-zpass-toll-calculator compares payment methods for any E-ZPass road;
 * europe-toll-calculator combines countries; france/italy tools are single-country.
 * See prisma/create-trv-toll-calculators.ts.
 */

import { type TrvCalculator, type Vals, InputError, pos, pick, r2, money, nfmt } from "./trv-core";

export const CLASSES: [string, number][] = [["Car / SUV / pickup (2 axles)", 1], ["Car + 1-axle trailer (3 axles)", 1.5], ["Car + 2-axle trailer (4 axles)", 2], ["2-axle truck (dual rear tyres) / RV", 2.2], ["3-axle truck", 3], ["4-axle truck", 4], ["5-axle tractor-trailer", 5.5], ["Motorcycle", 0.5]];
export interface MileRoad { cur: string; sym: string; unit: "mi" | "km"; methods: [string, number][]; classes?: [string, number][]; fixed?: number; full: number }

/** Distance × rate × class, one way / round trip / monthly, and the saving with the cheapest method. */
export function mileToll(p: MileRoad, v: Vals) {
  const cls = (p.classes ?? CLASSES)[pick(v.cls, (p.classes ?? CLASSES).length)], m = p.methods[pick(v.method, p.methods.length)];
  const d = pos(v.dist, p.full / 3), rate = pos(v.rate, 0) || m[1], fixed = p.fixed ?? 0;
  const one = d * rate * cls[1] + fixed, best = Math.min(...p.methods.map((x) => x[1])), bestOne = d * best * cls[1] + fixed;
  const trips = Math.max(0, Math.round(pos(v.trips, 0))), rt = pick(v.rt, 2) === 1 ? 2 : 1;
  return { one: r2(one * rt), each: r2(one), month: r2(one * rt * trips), save: r2((one - bestOne) * rt * Math.max(1, trips)), rate: `${money(rate * cls[1], p.sym, 3)} per ${p.unit} (${m[0]}, ${cls[0]}) × ${nfmt(d, 1)} ${p.unit}` };
}

export const PA: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 360, methods: [["E-ZPass", 0.135], ["Toll By Plate", 0.27]] };
export const NJTP: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 117, methods: [["E-ZPass off-peak", 0.16], ["E-ZPass peak", 0.175], ["Toll by mail", 0.215]] };
export const NYT: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 496, methods: [["NY E-ZPass", 0.047], ["Non-NY E-ZPass", 0.071], ["Tolls by Mail", 0.094]] };
export const OHIO: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 241, methods: [["E-ZPass", 0.07], ["Cash / credit", 0.105]] };
export const MASS: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 138, methods: [["MA E-ZPass", 0.055], ["Out-of-state E-ZPass", 0.055], ["Pay By Plate MA", 0.085]] };
export const ILL: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 120, methods: [["I-PASS / E-ZPass", 0.06], ["Pay By Plate (within 14 days)", 0.12]] };
export const IND: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 156, methods: [["E-ZPass", 0.074], ["Cash / video", 0.12]] };
export const FLA: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 309, methods: [["SunPass / E-PASS / E-ZPass", 0.095], ["Toll-By-Plate", 0.13]] };
export const TEX: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 30, methods: [["Dallas–Fort Worth NTTA TollTag", 0.22], ["Dallas–Fort Worth NTTA ZipCash", 0.33], ["Houston HCTRA EZ TAG", 0.16], ["Houston HCTRA pay by mail", 0.24], ["Austin / statewide TxTag", 0.25], ["Austin / statewide pay by mail", 0.33]] };
export const KAN: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 236, methods: [["K-TAG / compatible tag", 0.065], ["Cashless plate billing", 0.13]] };
export const OKL: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 88, methods: [["PikePass", 0.055], ["PlatePay", 0.11]] };
export const MAINE: MileRoad = { cur: "USD", sym: "$", unit: "mi", full: 109, methods: [["E-ZPass", 0.075], ["Cash / plate", 0.12]] };
export const FR_CLASSES: [string, number][] = [["Class 1 — car (under 2 m tall)", 1], ["Class 2 — van, car + trailer, motorhome 2–3 m", 1.5], ["Class 3 — truck / coach, 2 axles over 3 m", 2.25], ["Class 4 — truck / coach, 3+ axles", 3.05], ["Class 5 — motorcycle", 0.6]];
export const FRANCE: MileRoad = { cur: "EUR", sym: "€", unit: "km", full: 775, classes: FR_CLASSES, methods: [["Card / cash at the barrier", 0.095], ["Télépéage badge (Bip&Go, Ulys)", 0.095]] };
export const IT_CLASSES: [string, number][] = [["Class A — car / motorcycle", 1], ["Class B — 2 axles over 1.3 m (van, SUV with high front)", 1.03], ["Class 3 — 3 axles (car + trailer)", 1.35], ["Class 4 — 4 axles", 2.0], ["Class 5 — 5+ axles", 2.4]];
export const ITALY: MileRoad = { cur: "EUR", sym: "€", unit: "km", full: 760, classes: IT_CLASSES, methods: [["Card / cash", 0.085], ["Telepass / UnipolMove", 0.085]] };

// 407 ETR: distance-based with time-of-day rates + trip toll charge + video charge
export const E407_TIME = ["Weekend / off-peak", "Weekday mid-day", "Weekday peak (6–10 am, 3–7 pm)"];
export const etr407: TrvCalculator = (v) => {
  const km = pos(v.dist, 30), t = pick(v.time, 3), rate = pos(v.rate, 0) || [0.38, 0.48, 0.62][t], cls = pick(v.cls, 3), mult = [1, 2, 3][cls], tag = pick(v.tag, 2) === 1;
  const trip = 1.0 * mult, cam = tag ? 0 : 4.95, toll = km * rate * mult, one = toll + trip + cam, rt = pick(v.rt, 2) === 1 ? 2 : 1, trips = Math.round(pos(v.trips, 0));
  return { one: r2(one * rt), each: r2(one), month: r2(one * rt * trips), save: r2(cam * rt * Math.max(1, trips)), rate: `${money(rate * mult, "C$", 3)}/km × ${nfmt(km, 1)} km + trip toll charge ${money(trip, "C$")}${cam ? ` + camera charge ${money(cam, "C$")}` : ""}` };
};

// Plaza-based roads
export interface PlazaRoad { cur: string; sym: string; plazas: [string, number, number][] }
export function plazaToll(p: PlazaRoad, v: Vals) {
  const tag = pick(v.method, 2) === 0, cls = CLASSES[pick(v.cls, CLASSES.length)][1], lines: string[] = [];
  let one = 0;
  p.plazas.forEach(([name, ez, plate], i) => { const n = Math.round(pos(v[`p${i}`], 0)); if (n > 0) { const c = n * (tag ? ez : plate) * cls; one += c; lines.push(`${n} × ${name} ${money((tag ? ez : plate) * cls, p.sym)}`); } });
  const ezOne = p.plazas.reduce((s, [, ez], i) => s + Math.round(pos(v[`p${i}`], 0)) * ez * cls, 0), rt = pick(v.rt, 2) === 1 ? 2 : 1, trips = Math.round(pos(v.trips, 0));
  return { one: r2(one * rt), each: r2(one), month: r2(one * rt * trips), save: r2((one - ezOne) * rt * Math.max(1, trips)), rate: lines.length ? lines.join(" · ") : "No toll plazas entered" };
}
export const GSP: PlazaRoad = { cur: "USD", sym: "$", plazas: [["Mainline barrier plaza", 2.1, 2.5], ["Ramp plaza", 1.05, 1.25]] };
export const ACE: PlazaRoad = { cur: "USD", sym: "$", plazas: [["Egg Harbor mainline plaza", 4.25, 5.25], ["Pleasantville mainline plaza", 1.1, 1.4], ["Ramp toll", 0.75, 0.95]] };
export const MD: PlazaRoad = { cur: "USD", sym: "$", plazas: [["Bay Bridge (eastbound)", 2.5, 6.0], ["I-95 JFK Memorial Highway (northbound)", 8.0, 12.0], ["Fort McHenry Tunnel", 4.0, 6.0], ["Baltimore Harbor Tunnel", 4.0, 6.0], ["Key Bridge replacement / Hatem Bridge", 8.0, 12.0], ["Nice/Middleton Bridge (southbound)", 6.0, 9.0], ["ICC / MD 200 (per mile, peak)", 0.25, 0.38]] };
export const NH: PlazaRoad = { cur: "USD", sym: "$", plazas: [["Hampton mainline (I-95)", 1.4, 2.0], ["Hooksett mainline (I-93)", 0.7, 1.0], ["Bedford mainline (Everett Turnpike)", 0.7, 1.0], ["Merrimack ramps", 0.35, 0.5], ["Dover / Rochester (Spaulding Turnpike)", 0.53, 0.75]] };

// Europe: per-km countries + vignettes
export const EU_COUNTRIES = ["— none —", "France (toll/km)", "Italy (toll/km)", "Spain (toll/km)", "Portugal (toll/km)", "Croatia (toll/km)", "Greece (toll/km)", "Poland (toll/km)", "Norway (AutoPASS/km)", "Austria (vignette)", "Switzerland (vignette)", "Czechia (vignette)", "Slovakia (vignette)", "Slovenia (vignette)", "Hungary (vignette)", "Romania (vignette)", "Bulgaria (vignette)", "Germany (no car tolls)", "Belgium / Netherlands / Luxembourg (no car tolls)"];
const PER_KM = [0, 0.095, 0.085, 0.1, 0.1, 0.08, 0.07, 0.05, 0.1];
const VIG: Record<number, [number, number, number]> = { 9: [12.8, 32, 103.8], 10: [42, 42, 42], 11: [12, 19, 97], 12: [12, 17, 90], 13: [16, 32, 117.5], 14: [16, 26, 140], 15: [8, 14, 32], 16: [8, 15, 50] };
export const europeToll: TrvCalculator = (v) => {
  const days = Math.max(1, Math.round(pos(v.days, 7))), mult = [1, 1.5, 0.6][pick(v.veh, 3)], parts: string[] = [];
  let toll = 0, vig = 0;
  for (let i = 1; i <= 4; i++) {
    const c = pick(v[`c${i}`], EU_COUNTRIES.length), km = pos(v[`k${i}`], 0);
    if (c === 0) continue;
    if (c <= 8) { const t = km * PER_KM[c] * mult; toll += t; parts.push(`${EU_COUNTRIES[c].split(" (")[0]}: ${money(t, "€")} (${nfmt(km)} km)`); }
    else if (VIG[c]) { const pr = VIG[c], cost = (days <= 10 ? pr[0] : days <= 31 ? pr[1] : pr[2]) * (pick(v.veh, 3) === 2 ? 0.4 : 1); vig += cost; parts.push(`${EU_COUNTRIES[c].split(" (")[0]}: vignette ${money(cost, "€")} (${c === 10 ? "annual only" : days <= 10 ? "10-day" : days <= 31 ? "1-month" : "annual"})`); }
    else parts.push(`${EU_COUNTRIES[c].split(" (")[0]}: no motorway toll for cars`);
  }
  const extra = pos(v.extra, 0), total = toll + vig + extra;
  if (!parts.length) throw new InputError("Choose at least one country and enter the motorway km driven there.");
  return { total: r2(total), toll: r2(toll), vig: r2(vig), extra: r2(extra), detail: parts.join(" · ") };
};

// E-ZPass: transponder vs plate
export const ezpass: TrvCalculator = (v) => {
  const ez = pos(v.ez, 4.5), plate = pos(v.plate, 7.5), trips = Math.max(1, Math.round(pos(v.trips, 40))), fee = pos(v.fee, 1);
  const ezM = ez * trips + fee, plM = plate * trips, save = plM - ezM, disc = pos(v.disc, 0) / 100;
  return { save: r2(save * 12), ezm: r2(ezM * (1 - disc)), plm: r2(plM), month: r2(save), pct: r2((1 - ez / plate) * 100), verdict: save > 0 ? `E-ZPass saves about ${money(save)} a month` : "Paying by plate is cheaper at this usage" };
};

// Virginia I-66 / express lanes (dynamic)
export const i66: TrvCalculator = (v) => {
  const toll = pos(v.toll, 8.5), trips = Math.max(0, Math.round(pos(v.trips, 20))), hov = pick(v.hov, 3), plateFee = pick(v.tag, 2) === 0 ? 0 : pos(v.admin, 1.5);
  const each = hov === 2 ? 0 : toll + plateFee, mins = pos(v.mins, 15), month = each * trips;
  return { each: r2(each), month: r2(month), year: r2(month * 12), perMin: mins > 0 ? r2(each / mins) : 0, note: hov === 2 ? "HOV-3+ with an E-ZPass Flex set to HOV travels free" : `Dynamic toll as posted at the lane entrance${plateFee ? ` + ${money(plateFee)} pay-by-plate fee` : ""}` };
};

const M = (p: MileRoad): TrvCalculator => (v) => mileToll(p, v);
const P = (p: PlazaRoad): TrvCalculator => (v) => plazaToll(p, v);

export const trvTollCustomCalculators: Record<string, TrvCalculator> = {
  "pa-turnpike-toll-calculator": M(PA),
  "nj-turnpike-toll-calculator": M(NJTP),
  "ny-thruway-toll-calculator": M(NYT),
  "ohio-turnpike-toll-calculator": M(OHIO),
  "mass-pike-toll-calculator": M(MASS),
  "illinois-tollway-calculator": M(ILL),
  "indiana-toll-road-calculator": M(IND),
  "florida-toll-calculator": M(FLA),
  "texas-toll-calculator": M(TEX),
  "kansas-turnpike-toll-calculator": M(KAN),
  "oklahoma-toll-calculator": M(OKL),
  "maine-turnpike-toll-calculator": M(MAINE),
  "france-toll-calculator": M(FRANCE),
  "italy-toll-calculator": M(ITALY),
  "407-etr-toll-calculator": etr407,
  "garden-state-parkway-toll-calculator": P(GSP),
  "atlantic-city-expressway-toll-calculator": P(ACE),
  "maryland-toll-calculator": P(MD),
  "new-hampshire-toll-calculator": P(NH),
  "europe-toll-calculator": europeToll,
  "e-zpass-toll-calculator": ezpass,
  "virginia-i-66-toll-calculator": i66,
};
