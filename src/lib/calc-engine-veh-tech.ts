/**
 * Batch: Vehicle keyword check (13 Nov 2026), technical part, 26 tools in existing sub-categories:
 *  Sports > Motorsports (dynamic compression, carb jetting, valve shims, crawl ratio, driveline
 *  angles, power-to-weight, volumetric efficiency, exhaust size, pie cuts, scrub radius, 4-link),
 *  Sports > Cycling (skid patches, UK cycle to work), Sports > Other (prop slip, boat motor size),
 *  Shopping > Vehicle (tire stretch, tongue weight, VIN check digit, engine hours, tire age,
 *  balancing beads, car tire pressure), Business & Industrial > Freight (IFTA, axle weights),
 *  Science > Mechanical & Structural (vertical curve), Arts > Fun (lucky vehicle number).
 *
 * Kept apart from existing tools: dynamic CR uses the intake-closing point (compression-ratio is
 * static only); carb jetting changes the jet for air density (carburetor-cfm sizes the carb);
 * car-tire-pressure corrects cold pressure for temperature/load (bike-tire-pressure is for bikes).
 */

import { type TrvCalculator as VehCalculator, InputError, txt, pos, num, pick, r0, r1, r2, nfmt, money } from "./trv-core";

const RAD = Math.PI / 180;
const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0);

// ---------------------------------------------------- dynamic compression
/** Distance of the piston below TDC (same units as stroke) at crank angle θ° after TDC. */
export const pistonDrop = (stroke: number, rod: number, deg: number) => {
  const r = stroke / 2, t = deg * RAD;
  return r * (1 - Math.cos(t)) + rod - Math.sqrt(rod * rod - (r * Math.sin(t)) ** 2);
};
export const dynamicCompression: VehCalculator = (v) => {
  const bore = pos(v.bore, 4.03), stroke = pos(v.stroke, 3.48), rod = pos(v.rod, 5.7), scr = pos(v.scr, 10), ivc = num(v.ivc, 65), adv = num(v.adv, 0);
  if (scr <= 1) throw new InputError("The static compression ratio must be above 1.");
  if (rod <= stroke / 2) throw new InputError("The rod must be longer than half the stroke.");
  const close = 180 + ivc - adv; // degrees after TDC (intake) at which the intake valve closes; cam advance closes it earlier
  const eff = pistonDrop(stroke, rod, 360 - close); // same position measured on the compression stroke
  const area = (Math.PI / 4) * bore * bore, vc = (area * stroke) / (scr - 1), dcr = (vc + area * eff) / vc;
  const alt = pos(v.alt, 0), atm = 14.696 * (1 - 6.8754e-6 * alt) ** 5.2559, psi = atm * dcr ** 1.2 - atm;
  return { dcr: r2(dcr), eff: r3(eff), pct: r1((eff / stroke) * 100), psi: r0(psi), close: r1(360 - close), verdict: dcr < 7.5 ? "Low — fine on regular fuel, may feel soft" : dcr <= 8.5 ? "Ideal for pump gas (about 7.5–8.5 on 91–93 octane)" : dcr <= 9 ? "High — premium fuel and good cooling needed" : "Very high — risk of detonation on pump gas" };
};

// ------------------------------------------------------- carb jetting
export const airDensityRatio = (ftAlt: number, tempF: number) => {
  const p = (1 - 6.8754e-6 * ftAlt) ** 5.2559, T = (tempF + 459.67) / 518.67;
  return p / T;
};
export const carbJet: VehCalculator = (v) => {
  const jet = pos(v.jet, 72), s0 = airDensityRatio(pos(v.alt0, 0), num(v.t0, 70)), s1 = airDensityRatio(pos(v.alt1, 5000), num(v.t1, 70));
  const ratio = Math.sqrt(s1 / s0), type = pick(v.type, 2);
  const holleyStep = Math.round((ratio - 1) / 0.03), mikuni = jet * ratio;
  const newJet = type === 0 ? jet + holleyStep : Math.round(mikuni / 2.5) * 2.5;
  return { jet: newJet, change: type === 0 ? holleyStep : r1(newJet - jet), flow: r1((ratio - 1) * 100), density: r1((s1 / s0) * 100), how: type === 0 ? `Holley: about 1 jet number per 3% change in fuel flow → ${holleyStep >= 0 ? "+" : ""}${holleyStep}` : `Mikuni/Keihin numbers scale with flow: ${jet} × ${nfmt(ratio, 3)} = ${nfmt(mikuni, 1)}, rounded to the nearest 2.5` };
};

// ---------------------------------------------------------- valve shims
export const valveShim: VehCalculator = (v) => {
  const meas = pos(v.meas, 0.15), lo = pos(v.lo, 0.2), hi = pos(v.hi, 0.25), cur = pos(v.cur, 2.5), step = pos(v.step, 0.025) || 0.025;
  if (hi < lo) throw new InputError("The upper limit of the clearance spec must be above the lower limit.");
  const target = (lo + hi) / 2, ideal = cur + (meas - target), pickS = Math.round(ideal / step) * step, after = meas - (pickS - cur);
  const ok = meas >= lo - 1e-9 && meas <= hi + 1e-9;
  return { shim: r3(pickS), ideal: r3(ideal), after: r3(after), diff: r3(pickS - cur), status: ok ? "In spec — no shim change needed" : meas < lo ? "Too tight — fit a thinner shim" : "Too loose — fit a thicker shim" };
};

// ---------------------------------------------------------- crawl ratio
export const crawlRatio: VehCalculator = (v) => {
  const first = pos(v.first, 4.17), tc = pos(v.tc, 2.72), axle = pos(v.axle, 4.1), tire = pos(v.tire, 33), rpm = pos(v.rpm, 700), conv = pos(v.conv, 1);
  const cr = first * tc * axle * conv, mph = (rpm * tire * Math.PI) / (cr * 1056);
  return { cr: r1(cr), mph: r2(mph), kmh: r2(mph * 1.609344), torque: r1(cr * 0.85), verdict: cr < 40 ? "Mild — fine for trails, limited for rock crawling" : cr < 60 ? "Good all-round off-road gearing" : cr < 100 ? "Strong rock-crawling gearing" : "Extreme crawler gearing" };
};

// ---------------------------------------------------- driveline angles
export const drivelineAngle: VehCalculator = (v) => {
  const trans = num(v.trans, 3), shaft = num(v.shaft, 5), pinion = num(v.pinion, 3), dc = pick(v.type, 2) === 1;
  const front = Math.abs(shaft - trans), rear = Math.abs(shaft - pinion), cancel = Math.abs(front - rear);
  let verdict: string;
  if (dc) verdict = rear <= 1.5 ? "Double cardan: pinion points at the shaft (rear angle ≤ 1–1.5°) — good" : `Double cardan: point the pinion at the driveshaft — rear angle is ${nfmt(rear, 1)}°`;
  else verdict = front > 3.5 || rear > 3.5 ? "A working angle is over ~3° — expect vibration at speed" : cancel > 1 ? `Working angles differ by ${nfmt(cancel, 1)}° — keep them within 1° to cancel vibration` : "Working angles are equal and small — good";
  return { front: r1(front), rear: r1(rear), cancel: r1(cancel), pinionSet: r1(dc ? shaft : trans), verdict };
};

// --------------------------------------------------------- power to weight
export const powerToWeight: VehCalculator = (v) => {
  const kw = pick(v.pu, 2) === 1 ? pos(v.power, 300) : pos(v.power, 300) * 0.7457, hp = kw / 0.7457;
  const kg = pick(v.wu, 2) === 1 ? pos(v.weight, 1600) : pos(v.weight, 3500) * 0.45359237, lb = kg / 0.45359237;
  if (kg <= 0 || kw <= 0) throw new InputError("Enter the power and the weight.");
  const et = 5.825 * (lb / hp) ** (1 / 3), trap = 234 * (hp / lb) ** (1 / 3);
  return { hpton: r1(hp / (kg / 1000)), lbhp: r2(lb / hp), kghp: r2(kg / hp), wkg: r1((kw * 1000) / kg), et: r2(et), trap: r1(trap) };
};

// -------------------------------------------------- volumetric efficiency
export const volumetricEfficiency: VehCalculator = (v) => {
  const ci = pick(v.du, 2) === 1 ? pos(v.disp, 5.7) * 61.0237 : pos(v.disp, 350), rpm = pos(v.rpm, 5500), cfm = pos(v.cfm, 480);
  if (ci <= 0 || rpm <= 0) throw new InputError("Enter displacement and RPM.");
  const theo = (ci * rpm) / 3456, ve = (cfm / theo) * 100;
  return { ve: r1(ve), theo: r0(theo), cfm: r0(cfm), carb: r0(theo * 0.9), verdict: ve < 80 ? "Typical of a stock street engine" : ve < 95 ? "Good — well-matched cam, heads and intake" : ve <= 105 ? "Excellent naturally aspirated engine" : "Above 100% — forced induction or ram/tuned effects" };
};

// ---------------------------------------------------------- exhaust size
const PIPES = [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 6];
export const exhaustSize: VehCalculator = (v) => {
  const hp = pos(v.hp, 400), outlets = pick(v.dual, 2) === 1 ? 2 : 1, wall = pos(v.wall, 0.065), k = pos(v.k, 45) || 45;
  const total = hp / k, each = total / outlets, id = Math.sqrt((4 * each) / Math.PI), od = id + 2 * wall;
  const pickOd = PIPES.find((p) => p >= od - 0.05) ?? PIPES[PIPES.length - 1];
  return { od: pickOd, id: r2(id), area: r2(each), total: r2(total), mm: r0(pickOd * 25.4), how: `${nfmt(hp)} hp ÷ ${k} hp per sq in = ${nfmt(total, 2)} sq in of pipe area${outlets === 2 ? `, ${nfmt(each, 2)} sq in per side` : ""}` };
};

// ------------------------------------------------------------- pie cuts
export const pieCut: VehCalculator = (v) => {
  const bend = pos(v.bend, 90), n = Math.max(1, Math.round(pos(v.pieces, 6))), od = pos(v.od, 2.5), clr = pos(v.clr, 4);
  if (clr <= od / 2) throw new InputError("The centerline radius must be larger than half the pipe diameter.");
  const seg = bend / n, cut = seg / 2, L = (rad: number) => 2 * Math.PI * rad * (seg / 360);
  return { cut: r2(cut), seg: r2(seg), center: r3(L(clr)), heel: r3(L(clr + od / 2)), throat: r3(L(clr - od / 2)), welds: n - 1, how: `${nfmt(bend)}° bend in ${n} pieces: each piece turns ${nfmt(seg, 2)}°, so each end is cut ${nfmt(cut, 2)}° off square` };
};

// ----------------------------------------------------------- scrub radius
export const scrubRadius: VehCalculator = (v) => {
  const kpi = num(v.kpi, 12), d = num(v.d, 60), rr = pos(v.rr, 330), dOff = num(v.doff, 0);
  const scrub = d - dOff - rr * Math.tan(kpi * RAD);
  return { scrub: r1(scrub), scrubIn: r2(scrub / 25.4), ground: r1(rr * Math.tan(kpi * RAD)), verdict: Math.abs(scrub) < 10 ? "Near zero — light steering, little feedback" : scrub > 0 ? `Positive scrub (contact patch outboard of the steering axis): more kickback and tramlining${scrub > 50 ? ", heavy steering" : ""}` : "Negative scrub: stable under split-grip braking (common on FWD cars)" };
};

// -------------------------------------------------------------- 4-link
const intersect = (a: [number, number], b: [number, number], c: [number, number], d: [number, number]): [number, number] | null => {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
};
export const fourLink: VehCalculator = (v) => {
  // Side view, inches: x forward from the rear axle centerline, y up from the ground.
  const la: [number, number] = [num(v.lax, 0), num(v.lay, 12)], lf: [number, number] = [num(v.lfx, 30), num(v.lfy, 14)];
  const ua: [number, number] = [num(v.uax, 0), num(v.uay, 20)], uf: [number, number] = [num(v.ufx, 24), num(v.ufy, 19)];
  const wb = pos(v.wb, 110), cg = pos(v.cg, 22);
  if (cg <= 0 || wb <= 0) throw new InputError("Enter the wheelbase and CG height.");
  const ic = intersect(la, lf, ua, uf);
  if (!ic || ic[0] <= 0) return { as: r1(ic ? 0 : (((lf[1] - la[1]) / (lf[0] - la[0])) * wb / cg) * 100), icx: 0, icy: 0, line: 0, verdict: "Links are parallel or the instant center is behind the axle — anti-squat comes from the link angle only" };
  const line = (ic[1] / ic[0]) * wb, as = (line / cg) * 100;
  return { as: r1(as), icx: r1(ic[0]), icy: r1(ic[1]), line: r1(line), verdict: as < 80 ? "Below 80%: the rear squats on launch" : as <= 120 ? "80–120%: good balance for most street and drag cars" : "Over 120%: the rear lifts on launch (can unload the tires)" };
};

// ------------------------------------------------------------- skid patches
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const skidPatch: VehCalculator = (v) => {
  const ring = Math.round(pos(v.ring, 48)), cog = Math.round(pos(v.cog, 17));
  if (ring < 1 || cog < 1) throw new InputError("Enter the chainring and cog teeth.");
  const g = gcd(ring, cog), single = cog / g, amb = (ring / g) % 2 === 1 ? single * 2 : single;
  return { single, amb, ratio: r2(ring / cog), gi: r1((ring / cog) * 27), verdict: single >= 10 ? "Good — wear spreads over many patches" : single >= 5 ? "OK" : "Few patches — the tire will flat-spot quickly" };
};

// ------------------------------------------------------- UK cycle to work
export const UK_BANDS: [string, number, number][] = [["Basic rate (20% tax, 8% NI)", 20, 8], ["Higher rate (40% tax, 2% NI)", 40, 2], ["Additional rate (45% tax, 2% NI)", 45, 2], ["Scottish intermediate (21% tax, 8% NI)", 21, 8], ["Scottish higher (42% tax, 2% NI)", 42, 2]];
export const cycleToWork: VehCalculator = (v) => {
  const cost = pos(v.cost, 1000), b = UK_BANDS[pick(v.band, UK_BANDS.length)], months = Math.max(1, Math.round(pos(v.months, 12))), fee = pos(v.fee, 3) / 100;
  const saving = cost * ((b[1] + b[2]) / 100), endFee = cost * fee, net = cost - saving + endFee;
  return { saving: r2(saving - endFee), net: r2(net), pct: r1(((cost - net) / cost) * 100), monthly: r2(cost / months), netMonthly: r2((cost - saving) / months), endFee: r2(endFee) };
};

// --------------------------------------------------------- boat prop slip
export const propSlip: VehCalculator = (v) => {
  const pitch = pos(v.pitch, 19), rpm = pos(v.rpm, 5500), gear = pos(v.gear, 1.85), speed = pos(v.speed, 42), target = pos(v.target, 0);
  if (gear <= 0) throw new InputError("Enter the gear ratio (e.g. 1.85 for 1.85:1).");
  const theo = (pitch * rpm) / (gear * 1056), slip = theo > 0 ? ((theo - speed) / theo) * 100 : 0;
  const newPitch = target > 0 ? Math.round(((pitch * rpm) / target) * 2) / 2 : 0;
  return { slip: r1(slip), theo: r1(theo), knots: r1(speed / 1.15078), newPitch, verdict: slip < 5 ? "Very low — check the speed reading" : slip <= 15 ? "Good (10% is typical for a tuned runabout)" : slip <= 25 ? "High — prop may be wrong size or ventilating" : "Very high — likely damaged prop, slipping hub or wrong pitch", how: `${nfmt(pitch)}" × ${nfmt(rpm)} rpm ÷ (${gear} × 1,056) = ${nfmt(theo, 1)} mph with no slip` };
};

// --------------------------------------------------------- boat motor size
export const HULLS: [string, number][] = [["Displacement / heavy cruiser", 120], ["Average runabout / bowrider", 150], ["Pontoon / tritoon", 140], ["Fast bass boat / sport boat", 190], ["Race / step hull", 210]];
export const boatMotor: VehCalculator = (v) => {
  const w = pos(v.weight, 2000) + pos(v.people, 2) * 180 + pos(v.gear, 200), c = HULLS[pick(v.hull, HULLS.length)][1], mph = pos(v.mph, 35);
  const hp = w * (mph / c) ** 2, L = pos(v.len, 18), B = pos(v.beam, 6.5), f = L * B;
  const uscg = f > 52 ? Math.ceil((2 * f - 90) / 5) * 5 : f <= 35 ? 3 : f <= 39 ? 5 : f <= 42 ? 7.5 : f <= 45 ? 10 : 15;
  return { hp: r0(hp), uscg, ok: hp <= uscg ? "Within the USCG capacity estimate" : "More than the USCG estimate — check the boat's capacity plate", speed: r1(c * Math.sqrt(Math.min(hp, uscg) / w)), w: r0(w) };
};

// ------------------------------------------------------------ tire stretch
export const tireStretch: VehCalculator = (v) => {
  const sw = pos(v.width, 215), rimIn = pos(v.rim, 8.5), rim = rimIn * 25.4;
  const lo = sw * 0.75, hi = sw * 0.89, ratio = rim / sw, stretch = rim - hi;
  const level = rim <= hi ? (rim < lo ? "Under-rimmed (tire bulges past the rim)" : "Within the approved rim range — no stretch") : stretch <= 12.7 ? "Mild stretch" : stretch <= 25.4 ? "Moderate stretch" : "Aggressive stretch — bead may unseat at low pressure";
  return { level, ratio: r3(ratio), stretch: r1(Math.max(0, stretch)), lo: Math.round((lo / 25.4) * 2) / 2, hi: Math.round((hi / 25.4) * 2) / 2, rimMm: r0(rim) };
};

// ------------------------------------------------------------ tongue weight
export const HITCH: [string, number, number][] = [["Class I", 2000, 200], ["Class II", 3500, 350], ["Class III", 8000, 800], ["Class IV", 10000, 1000], ["Class V", 20000, 2700]];
export const tongueWeight: VehCalculator = (v) => {
  const tw = pos(v.trailer, 5000), fifth = pick(v.type, 2) === 1, meas = pos(v.meas, 0), hitch = HITCH[pick(v.hitch, HITCH.length)];
  const lo = tw * (fifth ? 0.15 : 0.1), hi = tw * (fifth ? 0.25 : 0.15), pct = meas > 0 && tw > 0 ? (meas / tw) * 100 : 0;
  const state = meas <= 0 ? "Enter a measured tongue weight to check your load" : meas < lo ? "Too light — risk of trailer sway; move cargo forward" : meas > hi ? "Too heavy — overloads the rear axle; move cargo back" : "In the safe range";
  return { lo: r0(lo), hi: r0(hi), pct: r1(pct), state, hitch: tw > hitch[1] || hi > hitch[2] ? `${hitch[0]} is rated ${nfmt(hitch[1])} lb / ${nfmt(hitch[2])} lb tongue — too small` : `${hitch[0]} (${nfmt(hitch[1])} lb trailer, ${nfmt(hitch[2])} lb tongue) is enough` };
};

// ----------------------------------------------------------- VIN check digit
const VIN_VAL: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const YEAR = "ABCDEFGHJKLMNPRSTVWXY123456789";
const REGION: [RegExp, string][] = [[/^[1-5]/, "North America (1, 4, 5 USA · 2 Canada · 3 Mexico)"], [/^[6-7]/, "Oceania"], [/^[89]/, "South America"], [/^[A-H]/, "Africa"], [/^[J-R]/, "Asia (J Japan · K Korea · L China · M India/Thailand)"], [/^[S-Z]/, "Europe (S UK · V France/Spain · W Germany · Y Sweden/Finland · Z Italy)"]];
export const vinCheck: VehCalculator = (v) => {
  const vin = txt(v, "vin").toUpperCase().replace(/[\s-]/g, "");
  if (vin.length !== 17) throw new InputError(`A VIN has 17 characters — this one has ${vin.length}.`);
  if (/[IOQ]/.test(vin)) throw new InputError("VINs never contain the letters I, O or Q — check for a 1 or 0.");
  if (!/^[A-Z0-9]+$/.test(vin)) throw new InputError("Use letters and digits only.");
  let sum = 0;
  for (let i = 0; i < 17; i++) { const ch = vin[i]; sum += (/\d/.test(ch) ? Number(ch) : VIN_VAL[ch]) * VIN_W[i]; }
  const rem = sum % 11, digit = rem === 10 ? "X" : String(rem), valid = vin[8] === digit;
  const yi = YEAR.indexOf(vin[9]);
  const years = yi < 0 ? "Unknown" : /\d/.test(vin[6]) ? String(1980 + yi) : String(2010 + yi);
  return { valid: valid ? "Valid — the check digit matches" : `Invalid — position 9 is ${vin[8]}, it should be ${digit}`, digit, sum, year: years, region: (REGION.find(([re]) => re.test(vin)) ?? [null, "Unknown"])[1], wmi: vin.slice(0, 3) };
};

// ------------------------------------------------------ engine hours → miles
export const HOUR_USE: [string, number][] = [["Car / light truck (mixed driving)", 33], ["Police / fleet / delivery (lots of idling)", 25], ["Highway truck", 45], ["Boat (outboard / inboard)", 30], ["Tractor / farm equipment", 15], ["Custom (enter speed)", 0]];
export const engineHours: VehCalculator = (v) => {
  const h = pos(v.hours, 1000), use = HOUR_USE[pick(v.use, HOUR_USE.length)], mph = pos(v.mph, 0) || use[1];
  if (mph <= 0) throw new InputError("Enter an average speed in mph.");
  const miles = h * mph, idle = pos(v.idle, 0);
  return { miles: r0(miles), km: r0(miles * 1.609344), idleMiles: r0(h * (idle / 100) * mph), perYear: pos(v.years, 0) > 0 ? r0(h / pos(v.years, 0)) : 0, how: `${nfmt(h)} hours × ${mph} mph average` };
};

// -------------------------------------------------------------- tire age
export const tireAge: VehCalculator = (v) => {
  const wk = Math.round(pos(v.week, 12)), yy = Math.round(pos(v.year, 21)), today = Math.round(v.today ?? 0);
  if (wk < 1 || wk > 53) throw new InputError("The week is the first two digits of the 4-digit date code (01–53).");
  const year = yy < 100 ? 2000 + yy : yy, made = Date.UTC(year, 0, 1) / 86400000 + (wk - 1) * 7 + 3;
  const age = (today - made) / 365.25;
  if (age < -0.1) throw new InputError("That date code is in the future — check the 4 digits (week then year).");
  const d = new Date(made * 86400000), madeTxt = d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { age: r1(Math.max(0, age)), made: madeTxt, advice: age < 5 ? "Fine on age — check tread and condition" : age < 6 ? "Inspect yearly from 5 years (rubber ageing)" : age < 10 ? "Most carmakers say replace at 6 years regardless of tread" : "Over 10 years — replace now (tire makers' maximum)", left: r1(Math.max(0, 6 - age)), code: `DOT …${String(wk).padStart(2, "0")}${String(yy % 100).padStart(2, "0")}` };
};

// ------------------------------------------------------- balancing beads
const BEADS: [number, number][] = [[25, 1.5], [28, 2], [30, 3], [32, 4], [34, 5], [36, 6], [38, 8], [40, 10], [44, 12], [Infinity, 16]];
export const balanceBeads: VehCalculator = (v) => {
  const type = pick(v.type, 4), d = pos(v.dia, 31);
  let oz: number;
  if (type === 1) oz = d < 20 ? 1 : 2; // motorcycle
  else if (type === 2) oz = pick(v.pos, 3) === 0 ? 8 : pick(v.pos, 3) === 1 ? 6 : 10; // semi steer / drive / trailer
  else oz = BEADS.find(([up]) => d < up)![1];
  const n = Math.max(1, Math.round(pos(v.n, 4)));
  return { oz, g: r0(oz * 28.3495), total: r1(oz * n), totalG: r0(oz * n * 28.3495) };
};

// ------------------------------------------------------- car tire pressure
export const carTirePressure: VehCalculator = (v) => {
  const placard = pos(v.placard, 35), now = num(v.now, 70), drive = num(v.drive, 40), hot = pick(v.hot, 2) === 1, load = pick(v.load, 3), max = pos(v.max, 51);
  let setPsi = placard + (now - drive) / 10;
  const loadAdd = [0, 3, 6][load];
  setPsi += loadAdd;
  if (hot) setPsi += 4;
  setPsi = Math.min(setPsi, max);
  return { set: r1(setPsi), coldAt: r1(placard + loadAdd), change: r1((now - drive) / 10), kpa: r0(setPsi * 6.89476), bar: r2(setPsi * 0.0689476), how: `${placard} psi door-placard pressure${loadAdd ? ` + ${loadAdd} psi for the load` : ""}${now !== drive ? `, corrected ${nfmt(Math.abs(now - drive))}°F (≈1 psi per 10°F) for ${now > drive ? "the colder weather you'll drive in" : "the warmer weather you'll drive in"}` : ""}${hot ? ", +4 psi because the tires are hot" : ""}` };
};

// -------------------------------------------------------------------- IFTA
export const ifta: VehCalculator = (v) => {
  const miles = [1, 2, 3, 4].map((i) => pos(v[`m${i}`], 0)), gal = [1, 2, 3, 4].map((i) => pos(v[`g${i}`], 0)), rate = [1, 2, 3, 4].map((i) => pos(v[`r${i}`], 0));
  const totM = miles.reduce((a, b) => a + b, 0) + pos(v.mOther, 0), totG = gal.reduce((a, b) => a + b, 0) + pos(v.gOther, 0);
  if (totM <= 0 || totG <= 0) throw new InputError("Enter the miles driven and gallons bought.");
  const mpg = totM / totG;
  const lines = miles.map((m, i) => { const taxable = m / mpg, net = (taxable - gal[i]) * rate[i]; return { taxable, net }; });
  const due = lines.reduce((a, l) => a + l.net, 0);
  return { due: r2(due), mpg: r2(mpg), j1: r2(lines[0].net), j2: r2(lines[1].net), j3: r2(lines[2].net), j4: r2(lines[3].net), how: lines.map((l, i) => miles[i] ? `J${i + 1}: ${nfmt(miles[i])} mi ÷ ${nfmt(mpg, 2)} = ${nfmt(l.taxable, 1)} gal taxable − ${nfmt(gal[i])} paid → ${money(l.net)}` : "").filter(Boolean).join(" · ") };
};

// -------------------------------------------------------------- axle weight
export const axleWeight: VehCalculator = (v) => {
  const wb = pos(v.wb, 200), f0 = pos(v.front0, 9000), r0w = pos(v.rear0, 7000), load = pos(v.load, 20000), d = pos(v.d, 150);
  if (wb <= 0) throw new InputError("Enter the wheelbase (front axle to rear axle or tandem center).");
  const rearShare = (load * d) / wb, frontShare = load - rearShare;
  const front = f0 + frontShare, rear = r0w + rearShare, tandem = pick(v.rearType, 2) === 1, rLim = tandem ? 34000 : 20000, fLim = pos(v.flim, 12000);
  const L = pos(v.box, 16), tongue = pos(v.tongue, 4), f = pos(v.tpct, 12) / 100;
  const axlePos = (L / 2 + f * tongue) / (1 - f);
  return { front: r0(front), rear: r0(rear), gross: r0(front + rear), frontPct: r1(((front) / (front + rear)) * 100), status: [front > fLim ? `steer axle over ${nfmt(fLim)} lb` : "", rear > rLim ? `${tandem ? "tandem" : "single"} axle over ${nfmt(rLim)} lb` : "", front + rear > 80000 ? "over 80,000 lb gross" : ""].filter(Boolean).join(", ") || "Within federal axle limits", axle: r2(axlePos) };
};

// ----------------------------------------------------------- vertical curve
export const verticalCurve: VehCalculator = (v) => {
  const g1 = num(v.g1, 3), g2 = num(v.g2, -2), L = pos(v.L, 600), pvi = num(v.pvi, 5000), e = num(v.elev, 100), x = num(v.sta, 0);
  if (L <= 0) throw new InputError("Enter the curve length.");
  const A = g2 - g1, pvc = pvi - L / 2, pvt = pvi + L / 2, ePvc = e - (g1 / 100) * (L / 2), ePvt = e + (g2 / 100) * (L / 2);
  const y = (s: number) => ePvc + (g1 / 100) * s + (A / (200 * L)) * s * s;
  const xt = A !== 0 ? (-g1 * L) / A : NaN, hasTurn = Number.isFinite(xt) && xt > 0 && xt < L;
  const at = x >= pvc && x <= pvt ? y(x - pvc) : x < pvc ? ePvc + (g1 / 100) * (x - pvc) : ePvt + (g2 / 100) * (x - pvt);
  return { kind: A < 0 ? "Crest curve" : A > 0 ? "Sag curve" : "No curve (equal grades)", pvc: r2(pvc), pvt: r2(pvt), ePvc: r3(ePvc), ePvt: r3(ePvt), k: A !== 0 ? r1(L / Math.abs(A)) : 0, turnSta: hasTurn ? r2(pvc + xt) : 0, turnElev: hasTurn ? r3(y(xt)) : 0, at: r3(at), e: r3((A * L) / 800) };
};

// --------------------------------------------------------- lucky number plate
const CHALDEAN: Record<string, number> = { A: 1, I: 1, J: 1, Q: 1, Y: 1, B: 2, K: 2, R: 2, C: 3, G: 3, L: 3, S: 3, D: 4, M: 4, T: 4, E: 5, H: 5, N: 5, X: 5, U: 6, V: 6, W: 6, O: 7, Z: 7, F: 8, P: 8 };
const reduce = (n: number) => { while (n > 9) n = String(n).split("").reduce((a, c) => a + Number(c), 0); return n; };
export const PLATE_MEANING = ["", "Leadership and new starts — a confident, independent car", "Harmony — good for a family car and careful drivers", "Joy and travel — fun, sociable road trips", "Stability — dependable, low-drama motoring (traditionally cautious)", "Freedom and speed — adventurous, keep it under the limit", "Care and comfort — the classic family number", "Reflection — calm solo drives, a quiet car", "Power and money — a prestige or business vehicle", "Completion — generous, protective energy"];
const FRIENDS: Record<number, number[]> = { 1: [1, 3, 5, 9], 2: [2, 4, 6, 8], 3: [1, 3, 6, 9], 4: [2, 4, 6, 8], 5: [1, 5, 7, 9], 6: [2, 3, 6, 9], 7: [5, 7, 9], 8: [2, 4, 6, 8], 9: [1, 3, 6, 9] };
export const luckyPlate: VehCalculator = (v) => {
  const plate = txt(v, "plate").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!plate) throw new InputError("Enter your number plate.");
  const digits = plate.replace(/\D/g, "").split("").reduce((a, c) => a + Number(c), 0);
  const letters = plate.replace(/[^A-Z]/g, "").split("").reduce((a, c) => a + (CHALDEAN[c] ?? 0), 0);
  const n = reduce(digits + letters) || 9, dn = digits ? reduce(digits) || 9 : 0;
  const day = Math.round(v.dob ?? 0), dt = new Date(day * 86400000);
  const lifePath = reduce(String(dt.getUTCFullYear()) .split("").concat(String(dt.getUTCMonth() + 1).split(""), String(dt.getUTCDate()).split("")).reduce((a, c) => a + Number(c), 0)) || 9;
  const match = FRIENDS[lifePath].includes(n);
  return { n, meaning: PLATE_MEANING[n], digits: dn, lifePath, match: match ? `Lucky match — ${n} suits life path ${lifePath}` : `Neutral — ${n} isn't a traditional friend of ${lifePath} (lucky numbers: ${FRIENDS[lifePath].join(", ")})`, plate };
};

export const vehTechCustomCalculators: Record<string, VehCalculator> = {
  "dynamic-compression-ratio-calculator": dynamicCompression,
  "carburetor-jet-size-calculator": carbJet,
  "valve-shim-calculator": valveShim,
  "crawl-ratio-calculator": crawlRatio,
  "driveline-angle-calculator": drivelineAngle,
  "power-to-weight-ratio-calculator": powerToWeight,
  "volumetric-efficiency-calculator": volumetricEfficiency,
  "exhaust-pipe-size-calculator": exhaustSize,
  "pie-cut-calculator": pieCut,
  "scrub-radius-calculator": scrubRadius,
  "4-link-suspension-calculator": fourLink,
  "skid-patch-calculator": skidPatch,
  "uk-cycle-to-work-scheme-calculator": cycleToWork,
  "boat-propeller-slip-calculator": propSlip,
  "boat-motor-size-calculator": boatMotor,
  "tire-stretch-calculator": tireStretch,
  "tongue-weight-calculator": tongueWeight,
  "vin-check-digit-calculator": vinCheck,
  "engine-hours-to-miles-calculator": engineHours,
  "tire-age-calculator": tireAge,
  "tire-balancing-beads-calculator": balanceBeads,
  "car-tire-pressure-calculator": carTirePressure,
  "ifta-fuel-tax-calculator": ifta,
  "axle-weight-calculator": axleWeight,
  "vertical-curve-calculator": verticalCurve,
  "lucky-vehicle-number-calculator": luckyPlate,
};
