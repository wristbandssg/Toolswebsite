/**
 * Idea build, batch biz1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > Concrete & Masonry (13) and Construction Materials & Estimating (22).
 * Strength gain: ACI 209 f(t) = f28 · t/(4 + 0.85t) (Type I, moist cured). Abrams: lower w/c → higher
 * strength (ACI 211 table: 0.41 → 5,000 psi, 0.48 → 4,000, 0.57 → 3,000 non-air-entrained).
 * Earned value: CPI = EV/AC, SPI = EV/PV, EAC = BAC/CPI.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const MIX = ["2,500 psi (1:3:5)", "3,000 psi (1:2.5:4)", "3,500 psi (1:2:3.5)", "4,000 psi (1:2:3)", "5,000 psi (1:1.5:2.5)"];
const MR: [number, number, number][] = [[1, 3, 5], [1, 2.5, 4], [1, 2, 3.5], [1, 2, 3], [1, 1.5, 2.5]];
export const mixDesign: Calc = (v) => {
  const m = pick(v.m, 5), yd = need(p(v, "yd", 1), "Enter cubic yards."), [c, s, g] = MR[m], parts = c + s + g;
  const dry = 27 * 1.54 * yd, cement = (dry * c) / parts * 94;
  return { cement: `${nfmt(cement / 94, 1)} bags of cement (94 lb)`, sand: `${((dry * s) / parts / 27).toFixed(2)} yd³ sand`, stone: `${((dry * g) / parts / 27).toFixed(2)} yd³ gravel / stone`, ratio: `${c} : ${s} : ${g} cement : sand : stone by volume` };
};
export const rebarSpacing: Calc = (v) => {
  const l = need(p(v, "l", 40), "Enter slab length."), w = need(p(v, "w", 30), "Enter slab width."), sp = need(p(v, "sp", 12), "Enter spacing."), cover = p(v, "cov", 3), bar = need(p(v, "bar", 20), "Enter bar length."), lap = p(v, "lap", 18);
  const nL = Math.floor((w * 12 - 2 * cover) / sp) + 1, nW = Math.floor((l * 12 - 2 * cover) / sp) + 1, run = nL * l + nW * w, laps = Math.max(0, Math.ceil(run / bar) - nL - nW) * (lap / 12);
  return { bars: `${nL} bars lengthwise + ${nW} bars widthwise`, ft: `${nfmt(run + laps)} ft of rebar including laps`, sticks: `${Math.ceil((run + laps) / bar)} sticks of ${bar} ft` };
};
export const strengthGain: Calc = (v) => {
  const f28 = need(p(v, "f28", 4000), "Enter 28-day strength."), t = need(p(v, "t", 7), "Enter age in days."), hot = pick(v.cure, 3);
  const k = [1, 1.25, 0.7][hot], f = f28 * (t * k) / (4 + 0.85 * t * k);
  return { f: `${nfmt(Math.min(f, f28 * 1.2))} psi at ${t} days`, pct: `${Math.min(120, (100 * f) / f28).toFixed(0)}% of 28-day strength`, note: f / f28 >= 0.7 ? "Usually enough to strip forms and take light loads" : "Keep formwork and shoring in place" };
};
export const wcRatio: Calc = (v) => {
  const water = need(p(v, "w", 300), "Enter water."), cement = need(p(v, "c", 600), "Enter cement."), unit = pick(v.u, 2);
  const r = unit === 0 ? water / cement : (water * 8.34) / cement;
  const psi = r <= 0.41 ? 5000 : r <= 0.48 ? 4000 + ((0.48 - r) / 0.07) * 1000 : r <= 0.57 ? 3000 + ((0.57 - r) / 0.09) * 1000 : r <= 0.68 ? 2000 + ((0.68 - r) / 0.11) * 1000 : 1500;
  return { r: `w/c = ${r.toFixed(3)}`, psi: `≈ ${nfmt(psi)} psi expected 28-day strength (ACI 211)`, note: r > 0.5 ? "Above 0.50 — not recommended for exposure to freezing or salts" : "Suitable for durable exterior concrete" };
};
export const truckLoads: Calc = (v) => {
  const yd = need(p(v, "yd", 85), "Enter cubic yards."), truck = need(p(v, "t", 10), "Enter truck size."), waste = p(v, "w", 5) / 100, mins = p(v, "m", 30);
  const tot = yd * (1 + waste), loads = Math.ceil(tot / truck);
  return { loads: `${loads} truck loads`, last: `Last truck: ${(tot - (loads - 1) * truck).toFixed(1)} yd³ (short-load fee may apply)`, time: `${((loads * mins) / 60).toFixed(1)} hours of discharge at ${mins} min per truck` };
};
export const CMU = ["8 in block, fully grouted", "8 in block, cells at 48 in o.c.", "8 in block, cells at 32 in o.c.", "12 in block, fully grouted", "12 in block, cells at 48 in o.c."];
const GROUT = [0.258, 0.083, 0.11, 0.408, 0.13];
export const groutFill: Calc = (v) => {
  const area = need(p(v, "a", 500), "Enter wall area."), t = pick(v.t, 5), waste = p(v, "w", 10) / 100;
  const ft3 = area * GROUT[t] * (1 + waste);
  return { yd: `${(ft3 / 27).toFixed(2)} yd³ of grout`, ft3: `${nfmt(ft3, 1)} ft³`, bags: `${Math.ceil(ft3 / 0.6)} bags of 80 lb premixed grout` };
};
export const precastWeight: Calc = (v) => {
  const l = p(v, "l", 20), h = p(v, "h", 10), t = need(p(v, "t", 8), "Enter thickness."), dens = p(v, "d", 150), open = p(v, "o", 0);
  const ft3 = (l * h - open) * (t / 12), lb = ft3 * dens;
  return { lb: `${nfmt(lb)} lb (${(lb / 2000).toFixed(2)} tons)`, ft3: `${nfmt(ft3, 1)} ft³ of concrete`, rig: `Pick with a crane rated well over ${nfmt(lb * 1.25)} lb (+25% rigging and dynamic factor)` };
};
export const shotcrete: Calc = (v) => {
  const area = need(p(v, "a", 1000), "Enter area."), t = need(p(v, "t", 4), "Enter thickness."), rebound = p(v, "r", 15) / 100, over = p(v, "o", 10) / 100;
  const ft3 = area * (t / 12) * (1 + over) / (1 - rebound);
  return { yd: `${(ft3 / 27).toFixed(2)} yd³ to order`, inPlace: `${((area * t) / 12 / 27).toFixed(2)} yd³ in place`, note: `Includes ${(rebound * 100).toFixed(0)}% rebound and ${(over * 100).toFixed(0)}% over-thickness` };
};
export const pumpCost: Calc = (v) => {
  const yd = p(v, "yd", 60), min = p(v, "min", 4), rate = p(v, "rate", 180), hrs = p(v, "hrs", 4), perYd = p(v, "py", 3), setup = p(v, "s", 150);
  const cost = Math.max(min * rate, hrs * rate) + yd * perYd + setup;
  return { cost: $(cost, 0), per: `${$(cost / Math.max(yd, 1))} per yd³`, note: `${Math.max(min, hrs)} h billed at ${$(rate, 0)} + ${$(perYd)}/yd³ + ${$(setup, 0)} setup` };
};
export const vtTies: Calc = (v) => {
  const area = need(p(v, "a", 800), "Enter wall area."), vs = p(v, "vs", 16), hs = p(v, "hs", 24), open = p(v, "o", 10);
  const perTie = (vs * hs) / 144, ties = Math.ceil(area / perTie) + Math.ceil(open * 4);
  return { ties: `${nfmt(ties)} wall ties`, per: `One tie per ${perTie.toFixed(2)} ft² (code max 2.67 ft²)`, note: perTie > 2.67 ? "Spacing too wide — TMS 402 limits each tie to 2.67 ft²" : `Plus extra ties within 12 in of ${open} openings` };
};
export const UNITS = ["Standard brick", "8×8×16 CMU block", "Stone veneer"];
const RATE = [500, 140, 35];
export const masonryRate: Calc = (v) => {
  const u = pick(v.u, 3), qty = p(v, "q", 5000), masons = Math.max(1, p(v, "m", 2)), rate = p(v, "r", RATE[u]), wage = p(v, "w", 55);
  const days = qty / (rate * masons);
  return { days: `${days.toFixed(1)} days for ${masons} mason(s)`, rate: `${nfmt(rate)} ${["bricks", "blocks", "ft²"][u]} per mason per day`, cost: `${$(days * masons * 8 * wage * 1.6, 0)} labour with tender (≈1.6× mason hours)` };
};
export const retainingBlock: Calc = (v) => {
  const l = need(p(v, "l", 100), "Enter wall length."), h = need(p(v, "h", 6), "Enter wall height."), bh = p(v, "bh", 8), bl = p(v, "bl", 18), grid = p(v, "gr", 2);
  const courses = Math.ceil((h * 12) / bh) + 1, per = Math.ceil((l * 12) / bl);
  return { blocks: `${nfmt(courses * per)} blocks (${courses} courses incl. 1 buried)`, caps: `${Math.ceil((l * 12) / 16)} caps`, grid: h > 4 ? `Geogrid every ${grid} courses, about ${nfmt(Math.floor(courses / grid) * l)} ft of grid (embed 0.6–0.8 × height)` : "Walls under 4 ft often need no geogrid — check the manufacturer" };
};
const SLAB_T = [4, 4, 5, 6, 7, 8];
export const slabThickness: Calc = (v) => {
  const u = pick(v.u, 6), sub = pick(v.s, 3);
  const t = SLAB_T[u] + [0.5, 0, 0][sub] * (u > 2 ? 2 : 1);
  return { t: `${t} in minimum slab thickness`, joint: `Control joints every ${Math.round(t * 2.5)}–${Math.round(t * 3)} ft`, note: sub === 0 ? "Soft subgrade: compact and add 4–6 in of base" : "Good subgrade on compacted granular base" };
};
// ---- construction estimating
export const gcOverhead: Calc = (v) => {
  const direct = p(v, "d", 500000), oh = p(v, "oh", 10) / 100, profit = p(v, "pr", 8) / 100, bond = p(v, "b", 1.5) / 100, ins = p(v, "i", 1) / 100;
  const ohA = direct * oh, sub = direct + ohA, prof = sub * profit, bi = (sub + prof) * (bond + ins), total = sub + prof + bi;
  return { total: `${$(total, 0)} bid price`, oh: `${$(ohA, 0)} overhead · ${$(prof, 0)} profit · ${$(bi, 0)} bond & insurance`, markup: `${(((total / direct) - 1) * 100).toFixed(1)}% total markup on direct cost` };
};
export const SHAPES = ["W8×31", "W10×33", "W12×26", "W14×30", "W16×36", "W18×50", "W21×62", "W24×76"];
const LBFT = [31, 33, 26, 30, 36, 50, 62, 76];
export const steelTonnage: Calc = (v) => {
  const s = pick(v.s, 8), lf = p(v, "lf", 500), conn = p(v, "c", 10) / 100, price = p(v, "pr", 4500);
  const tons = (lf * LBFT[s] * (1 + conn)) / 2000;
  return { tons: `${tons.toFixed(2)} tons`, lb: `${nfmt(lf * LBFT[s])} lb of ${SHAPES[s]} + ${(conn * 100).toFixed(0)}% connections`, cost: `${$(tons * price, 0)} at ${$(price, 0)}/ton erected` };
};
const SWELL = [0.12, 0.25, 0.3, 0.5], SHRINK = [0.05, 0.1, 0.15, -0.3];
export const excavationSwell: Calc = (v) => {
  const l = p(v, "l", 60), w = p(v, "w", 40), d = p(v, "d", 8), s = pick(v.s, 4), truck = need(p(v, "t", 14), "Enter truck capacity.");
  const bank = (l * w * d) / 27, loose = bank * (1 + SWELL[s]);
  return { bank: `${nfmt(bank, 1)} yd³ in place (bank)`, loose: `${nfmt(loose, 1)} yd³ loose to haul`, trucks: `${Math.ceil(loose / truck)} truck loads · ${nfmt(bank * (1 - SHRINK[s]), 1)} yd³ when compacted` };
};
export const trenchBackfill: Calc = (v) => {
  const l = p(v, "l", 300), w = p(v, "w", 2), d = p(v, "d", 4), pipe = p(v, "pd", 8), bed = p(v, "b", 6);
  const trench = (l * w * d) / 27, pipeVol = (l * Math.PI * (pipe / 24) ** 2) / 27, bedding = (l * w * ((bed + pipe + 12) / 12)) / 27;
  return { back: `${nfmt(trench - pipeVol - bedding, 1)} yd³ of backfill`, bed: `${nfmt(bedding, 1)} yd³ of bedding stone (to 12 in over pipe)`, exc: `${nfmt(trench, 1)} yd³ excavated` };
};
export const asphaltTons: Calc = (v) => {
  const area = need(p(v, "a", 10000), "Enter area."), t = need(p(v, "t", 3), "Enter thickness."), dens = p(v, "d", 145), price = p(v, "pr", 110);
  const tons = (area * (t / 12) * dens) / 2000;
  return { tons: `${nfmt(tons, 1)} tons of hot mix`, cost: `${$(tons * price, 0)} material at ${$(price, 0)}/ton`, rule: `${(dens * (t / 12) * 9 / 2000).toFixed(3)} tons per yd² (110 lb per yd² per inch)` };
};
export const baseTons: Calc = (v) => {
  const area = need(p(v, "a", 10000), "Enter area."), t = need(p(v, "t", 6), "Enter compacted depth."), dens = p(v, "d", 2.2), comp = p(v, "c", 20) / 100;
  const yd = (area * (t / 12)) / 27, tons = yd * dens * (1 + comp);
  return { tons: `${nfmt(tons, 1)} tons of aggregate base`, yd: `${nfmt(yd, 1)} yd³ compacted`, note: `${dens} tons per yd³ + ${(comp * 100).toFixed(0)}% for compaction` };
};
export const scaffolding: Calc = (v) => {
  const len = p(v, "l", 100), h = p(v, "h", 30), weeks = need(p(v, "wk", 6), "Enter rental weeks."), rate = p(v, "r", 1.5), erect = p(v, "e", 3);
  const face = len * h;
  return { total: `${$(face * (rate * weeks + erect), 0)} total`, rental: `${$(face * rate * weeks, 0)} rental (${$(rate)}/ft² per week)`, erect: `${$(face * erect, 0)} erect & dismantle · ${nfmt(face)} ft² of face` };
};
export const craneLift: Calc = (v) => {
  const load = need(p(v, "load", 8000), "Enter load weight."), rig = p(v, "rig", 800), block = p(v, "blk", 1200), chart = need(p(v, "chart", 14000), "Enter chart capacity at radius.");
  const gross = load + rig + block, pct = (100 * gross) / chart;
  return { pct: `${pct.toFixed(1)}% of chart capacity`, gross: `${nfmt(gross)} lb gross load (load + rigging + block/hook)`, verdict: pct > 100 ? "OVER capacity — do not lift" : pct > 85 ? "Critical lift (>85%) — lift plan and approvals required" : pct > 75 ? "Approaching limits — plan carefully" : "Within normal limits" };
};
export const changeOrder: Calc = (v) => {
  const labor = p(v, "lab", 4000), mat = p(v, "mat", 3000), equip = p(v, "eq", 800), sub = p(v, "sub", 2000), oh = p(v, "oh", 10) / 100, profit = p(v, "pr", 10) / 100, subMk = p(v, "sm", 5) / 100, bond = p(v, "b", 1) / 100;
  const own = (labor + mat + equip) * (1 + oh) * (1 + profit), subT = sub * (1 + subMk), total = (own + subT) * (1 + bond);
  return { total: `${$(total, 0)} change order`, own: `${$(own, 0)} self-performed incl. OH & P`, sub: `${$(subT, 0)} subcontract incl. ${(subMk * 100).toFixed(0)}% markup` };
};
export const retainage: Calc = (v) => {
  const billed = p(v, "b", 120000), rate = p(v, "r", 10) / 100, prior = p(v, "pr", 30000), half = pick(v.h, 2);
  const r = billed * (half ? rate / 2 : rate);
  return { held: `${$(r, 0)} retainage held`, net: `${$(billed - r - prior, 0)} due this application (after ${$(prior, 0)} previously paid)`, note: half ? "Retainage reduced to half after 50% completion" : `${(rate * 100).toFixed(0)}% withheld until completion` };
};
export const YESNO = ["No", "Yes"];
export const drawSchedule: Calc = (v) => {
  const loan = p(v, "l", 400000), rate = p(v, "r", 9) / 100, months = Math.max(1, Math.round(p(v, "m", 10)));
  const draws: number[] = [], stages = [0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.1];
  let bal = 0, interest = 0;
  for (let i = 0; i < months; i++) { const d = loan * (stages[Math.min(stages.length - 1, Math.floor((i / months) * stages.length))] / Math.ceil(months / stages.length)); bal = Math.min(loan, bal + d); draws.push(bal); interest += (bal * rate) / 12; }
  return { interest: `${$(interest, 0)} interest during construction`, avg: `${$(draws.reduce((a, b) => a + b, 0) / months, 0)} average outstanding balance`, final: `${$(Math.min(loan, bal), 0)} drawn by month ${months}` };
};
export const earnedValue: Calc = (v) => {
  const bac = need(p(v, "bac", 1000000), "Enter budget at completion."), pct = p(v, "pc", 40) / 100, pv = need(p(v, "pv", 450000), "Enter planned value."), ac = need(p(v, "ac", 430000), "Enter actual cost.");
  const ev = bac * pct, cpi = ev / ac, spi = ev / pv;
  return { cpi: `CPI ${cpi.toFixed(2)} · SPI ${spi.toFixed(2)}`, eac: `${$(bac / cpi, 0)} estimate at completion`, var: `Cost variance ${$(ev - ac, 0)} · schedule variance ${$(ev - pv, 0)}`, verdict: `${cpi >= 1 ? "Under" : "Over"} budget, ${spi >= 1 ? "ahead of" : "behind"} schedule` };
};
const WF = [10, 12, 12, 5, 12, 5, 10, 10];
export const wasteFactor: Calc = (v) => {
  const m = pick(v.m, WF.length), qty = need(p(v, "q", 1000), "Enter quantity needed."), extra = p(v, "x", 0);
  const f = WF[m] + extra;
  return { order: `${nfmt(qty * (1 + f / 100), 1)} to order`, waste: `${f}% waste allowance`, note: "Add more for diagonal layouts, complex cuts or inexperienced crews" };
};
export const formwork: Calc = (v) => {
  const type = pick(v.t, 3), l = p(v, "l", 40), w = p(v, "w", 1), h = p(v, "h", 3), n = Math.max(1, p(v, "n", 1));
  const area = type === 0 ? 2 * l * h * n : type === 1 ? 2 * (l + w) * h * n : (2 * h + w) * l * n;
  return { area: `${nfmt(area)} ft² of contact area`, ply: `${Math.ceil((area * 1.1) / 32)} sheets of 4×8 form plywood`, note: ["Wall (both faces)", "Column (4 sides)", "Beam (2 sides + soffit)"][type] };
};
export const ductWeight: Calc = (v) => {
  const w = p(v, "w", 24), h = p(v, "h", 12), l = p(v, "l", 200), gauge = pick(v.g, 5), seams = p(v, "s", 15) / 100;
  const psf = [2.156, 1.656, 1.406, 1.156, 0.906][gauge], area = ((2 * (w + h)) / 12) * l * (1 + seams);
  return { lb: `${nfmt(area * psf)} lb of sheet metal`, area: `${nfmt(area)} ft² of galvanised steel`, note: `${["16", "18", "20", "22", "24"][gauge]} gauge at ${psf} lb/ft² incl. ${(seams * 100).toFixed(0)}% seams` };
};
export const GAUGE = ["16 ga", "18 ga", "20 ga", "22 ga", "24 ga"];
export const paintCommercial: Calc = (v) => {
  const area = need(p(v, "a", 20000), "Enter wall area."), coats = Math.max(1, p(v, "c", 2)), cov = p(v, "cov", 350), loss = p(v, "l", 15) / 100, prod = p(v, "pr", 200), wage = p(v, "w", 45);
  const gal = (area * coats) / cov / (1 - loss), hrs = (area * coats) / prod;
  return { gal: `${nfmt(gal)} gallons`, hours: `${nfmt(hrs)} labour hours (${$(hrs * wage, 0)})`, note: `${cov} ft²/gal, ${(loss * 100).toFixed(0)}% spray/roller loss, ${prod} ft²/h production` };
};
export const fireproofing: Calc = (v) => {
  const w = need(p(v, "w", 31), "Enter beam weight per foot."), d = need(p(v, "d", 30), "Enter heated perimeter."), hr = Math.min(4, Math.max(1, p(v, "hr", 2))), lf = p(v, "lf", 400);
  const wd = w / d, t = Math.max(0.375, (hr * 1.0) / (0.8 * (wd + 0.6)));
  return { t: `${t.toFixed(3)} in of SFRM`, wd: `W/D ratio ${wd.toFixed(3)}`, area: `${nfmt((d / 12) * lf)} ft² to spray for ${lf} lf`, note: "Use the UL-listed design for the final thickness" };
};
export const rValueWall: Calc = (v) => {
  const layers = [p(v, "r1", 0.17), p(v, "r2", 0.44), p(v, "r3", 13), p(v, "r4", 0.56), p(v, "r5", 0.68)], cont = p(v, "ci", 7.5), studF = p(v, "sf", 25) / 100, studR = p(v, "sr", 4.38);
  const cav = layers[2], others = layers[0] + layers[1] + layers[3] + layers[4] + cont;
  const pathC = others + cav, pathS = others + studR, u = (1 - studF) / pathC + studF / pathS;
  return { r: `R-${(1 / u).toFixed(1)} effective assembly`, u: `U-${u.toFixed(3)}`, nominal: `R-${(others + cav).toFixed(1)} nominal (ignoring framing)`, note: `${(studF * 100).toFixed(0)}% framing fraction bridges the cavity insulation` };
};
export const rentVsBuyEquip: Calc = (v) => {
  const price = p(v, "pr", 120000), life = Math.max(1, p(v, "life", 8)), salvage = p(v, "sv", 30000), rate = p(v, "r", 7) / 100, own = p(v, "own", 9000), hrs = need(p(v, "h", 600), "Enter hours used per year."), rent = p(v, "rh", 85);
  const ownYr = (price - salvage) / life + ((price + salvage) / 2) * rate + own, ownHr = ownYr / hrs;
  return { verdict: ownHr < rent ? `Buy — owning costs ${$(ownHr)}/h vs ${$(rent)}/h rental` : `Rent — owning costs ${$(ownHr)}/h vs ${$(rent)}/h rental`, be: `Break-even at ${nfmt(ownYr / rent)} hours a year`, own: `${$(ownYr, 0)} a year to own` };
};
export const dumpLoads: Calc = (v) => {
  const yd = need(p(v, "yd", 300), "Enter cubic yards."), cap = need(p(v, "c", 14), "Enter truck capacity."), swell = p(v, "s", 25) / 100, cycle = p(v, "cy", 40), trucks = Math.max(1, p(v, "t", 3));
  const loads = Math.ceil((yd * (1 + swell)) / cap);
  return { loads: `${loads} loads`, time: `${((loads * cycle) / 60 / trucks).toFixed(1)} hours with ${trucks} trucks`, loose: `${nfmt(yd * (1 + swell), 1)} yd³ loose` };
};
export const prevailingWage: Calc = (v) => {
  const hrs = p(v, "h", 2000), base = p(v, "b", 48), fringe = p(v, "f", 28), burden = p(v, "bu", 18) / 100, ot = p(v, "ot", 10) / 100;
  const st = hrs * (1 - ot), otH = hrs * ot, cost = (st * base + otH * base * 1.5) * (1 + burden) + hrs * fringe;
  return { cost: `${$(cost, 0)} labour cost`, rate: `${$(cost / Math.max(hrs, 1))} loaded hourly rate`, note: `Fringe ${$(fringe)}/h paid on all hours (not marked up for overtime); payroll burden ${(burden * 100).toFixed(0)}% on wages` };
};
export const scheduleDuration: Calc = (v) => {
  const qty = need(p(v, "q", 12000), "Enter quantity."), rate = need(p(v, "r", 800), "Enter production per crew-day."), crews = Math.max(1, p(v, "c", 2)), eff = p(v, "e", 85) / 100, wk = p(v, "wk", 5), weather = p(v, "w", 10) / 100;
  const days = qty / (rate * crews * eff) / (1 - weather);
  return { days: `${Math.ceil(days)} working days`, weeks: `${(days / wk).toFixed(1)} weeks at ${wk} days a week`, note: `${(eff * 100).toFixed(0)}% efficiency and ${(weather * 100).toFixed(0)}% weather allowance` };
};

// ---- registry (generated)
export const ideaBiz1CustomCalculators: Record<string, Calc> = {
  "concrete-mix-design-ratio-calculator": mixDesign,
  "rebar-spacing-calculator": rebarSpacing,
  "concrete-compressive-strength-cure-time-calculator": strengthGain,
  "water-cement-ratio-calculator": wcRatio,
  "commercial-concrete-truck-loads-calculator": truckLoads,
  "grout-fill-cmu-wall-calculator": groutFill,
  "precast-panel-weight-calculator": precastWeight,
  "shotcrete-volume-calculator": shotcrete,
  "concrete-pump-cost-calculator": pumpCost,
  "brick-veneer-tie-spacing-calculator": vtTies,
  "masonry-labor-production-rate-calculator": masonryRate,
  "retaining-wall-block-commercial-calculator": retainingBlock,
  "slab-on-grade-thickness-load-calculator": slabThickness,
  "general-contractor-overhead-calculator": gcOverhead,
  "structural-steel-tonnage-calculator": steelTonnage,
  "excavation-volume-swell-calculator": excavationSwell,
  "trench-backfill-volume-calculator": trenchBackfill,
  "asphalt-tonnage-calculator": asphaltTons,
  "aggregate-base-tonnage-calculator": baseTons,
  "scaffolding-rental-cost-calculator": scaffolding,
  "crane-lift-capacity-calculator": craneLift,
  "change-order-cost-calculator": changeOrder,
  "retainage-calculator": retainage,
  "construction-loan-draw-schedule-calculator": drawSchedule,
  "earned-value-construction-calculator": earnedValue,
  "construction-waste-factor-calculator": wasteFactor,
  "formwork-area-calculator": formwork,
  "sheet-metal-ductwork-weight-calculator": ductWeight,
  "paint-coverage-commercial-calculator": paintCommercial,
  "fireproofing-spray-thickness-calculator": fireproofing,
  "insulation-r-value-commercial-wall-calculator": rValueWall,
  "equipment-rental-vs-buy-calculator": rentVsBuyEquip,
  "dump-truck-loads-calculator": dumpLoads,
  "prevailing-wage-job-cost-calculator": prevailingWage,
  "construction-schedule-duration-calculator": scheduleDuration,
};
