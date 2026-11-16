/**
 * Idea build, batch biz3 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Freight, Logistics & Warehouse (23) and Shipping, Postage & Ecommerce (16).
 * Container internal volumes: 20 ft ≈ 33.2 m³, 40 ft 67.7 m³, 40 ft HC 76.3 m³. FMCSA HOS: 11 h
 * driving within a 14 h window after 10 h off; 30-min break after 8 h; 60/70 h in 7/8 days.
 * Marketplace fees (editable defaults): Poshmark 20% (≥ $15, else $2.95); Mercari 10% + payment
 * 2.9% + $0.50. Postage and FBA storage rates are editable defaults — check current carrier tables.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const ftlRate: Calc = (v) => {
  const miles = need(p(v, "mi", 800), "Enter loaded miles."), rpm = p(v, "rpm", 2.4), dead = p(v, "dh", 15) / 100, fsc = p(v, "fsc", 0.55), acc = p(v, "acc", 0);
  const line = miles * rpm, total = line + miles * fsc + acc;
  return { total: `${$(total, 0)} total linehaul + fuel`, allIn: `${$(total / miles)} all-in per loaded mile`, real: `${$(total / (miles * (1 + dead)))} per mile including ${(dead * 100).toFixed(0)}% deadhead` };
};
export const CONT = ["20 ft standard (33.2 m³, 28 t)", "40 ft standard (67.7 m³, 26.7 t)", "40 ft high cube (76.3 m³, 26.5 t)", "45 ft high cube (86 m³, 27.6 t)"];
const CV: [number, number][] = [[33.2, 28000], [67.7, 26700], [76.3, 26500], [86, 27600]];
export const containerCbm: Calc = (v) => {
  const c = pick(v.c, 4), l = p(v, "l", 60), w = p(v, "w", 40), h = p(v, "h", 40), qty = p(v, "q", 300), kg = p(v, "kg", 18), util = p(v, "u", 85) / 100;
  const cbm = (l * w * h) / 1e6, [vol, max] = CV[c];
  const fit = Math.floor(Math.min((vol * util) / cbm, max / Math.max(kg, 0.01)));
  return { fit: `${nfmt(fit)} cartons fit`, need: `${Math.ceil(qty / Math.max(fit, 1))} container(s) for ${nfmt(qty)} cartons`, cbm: `${(cbm * qty).toFixed(2)} m³ and ${nfmt(qty * kg)} kg in total (${cbm.toFixed(3)} m³ each)`, limit: fit === Math.floor(max / Math.max(kg, 0.01)) ? "Weight-limited" : "Volume-limited" };
};
export const TRAILER = ["53 ft dry van", "48 ft flatbed", "26 ft box truck", "40 ft container"];
const TR: [number, number, number][] = [[53, 102, 45000], [48, 102, 48000], [26, 96, 10000], [39.5, 92, 58000]];
export const palletsPerTruck: Calc = (v) => {
  const t = pick(v.t, 4), pl = p(v, "pl", 48), pw = p(v, "pw", 40), stack = pick(v.s, 2) ? 2 : 1, wt = p(v, "wt", 1200);
  const [ft, wid, max] = TR[t], len = ft * 12;
  const a = Math.floor(len / pl) * Math.floor(wid / pw), b = Math.floor(len / pw) * Math.floor(wid / pl), floor = Math.max(a, b), total = floor * stack;
  const byWeight = Math.floor(max / Math.max(wt, 1));
  return { pallets: `${Math.min(total, byWeight)} pallets`, floor: `${floor} floor positions${stack === 2 ? " double-stacked" : ""}`, limit: total > byWeight ? `Weight-limited (${nfmt(max)} lb payload)` : `Space-limited (${nfmt(total * wt)} lb)` };
};
export const YESNO = ["No", "Yes"];
export const palletStack: Calc = (v) => {
  const box = need(p(v, "b", 40), "Enter box weight."), bct = need(p(v, "bct", 800), "Enter box compression strength."), tiers = Math.max(1, Math.round(p(v, "t", 6))), sf = p(v, "sf", 5), pallets = Math.max(1, Math.round(p(v, "p", 2)));
  const load = box * (tiers * pallets - 1), safe = bct / sf;
  return { load: `${nfmt(load)} lb on the bottom box`, safe: `${nfmt(safe)} lb safe load (BCT ÷ ${sf} safety factor)`, ok: load <= safe ? "Safe to stack" : `Overloaded — max ${Math.floor(safe / box) + 1} boxes high in total` };
};
export const warehouseSpace: Calc = (v) => {
  const pallets = p(v, "p", 2000), levels = Math.max(1, Math.round(p(v, "lv", 4))), aisle = p(v, "ai", 50) / 100, office = p(v, "of", 10) / 100, dock = p(v, "dk", 10) / 100;
  const storage = (pallets / levels) * 13.3, total = storage / (1 - aisle - office - dock);
  return { ft: `${nfmt(total)} ft² warehouse`, storage: `${nfmt(storage)} ft² of rack footprint (${pallets} pallets, ${levels} levels)`, split: `Aisles ${(aisle * 100).toFixed(0)}% · office ${(office * 100).toFixed(0)}% · docks/staging ${(dock * 100).toFixed(0)}%` };
};
export const pickRate: Calc = (v) => {
  const lines = p(v, "l", 1800), hours = need(p(v, "h", 8), "Enter hours."), pickers = Math.max(1, p(v, "pk", 4)), target = p(v, "t", 2000);
  const rate = lines / (hours * pickers);
  return { rate: `${rate.toFixed(1)} lines per picker-hour`, need: `${Math.ceil(target / (rate * hours))} pickers for ${nfmt(target)} lines in ${hours} h`, bench: rate >= 100 ? "Excellent (pick-to-light / zone)" : rate >= 60 ? "Good" : "Below typical (60–100 lines/h)" };
};
export const laborPerOrder: Calc = (v) => {
  const hrs = p(v, "h", 400), wage = p(v, "w", 22), burden = p(v, "b", 30) / 100, orders = need(p(v, "o", 12000), "Enter orders.");
  const cost = hrs * wage * (1 + burden);
  return { per: `${$(cost / orders)} labour per order`, total: `${$(cost, 0)} labour cost`, uph: `${(orders / Math.max(hrs, 1)).toFixed(1)} orders per labour hour` };
};
export const otd: Calc = (v) => {
  const total = need(p(v, "t", 1250), "Enter total shipments."), late = p(v, "l", 45), target = p(v, "g", 97) / 100;
  const r = (total - late) / total;
  return { rate: `${(r * 100).toFixed(2)}% on time`, gap: r >= target ? `Above the ${(target * 100).toFixed(1)}% target` : `${Math.ceil(total * (1 - target) < late ? late - total * (1 - target) : 0)} fewer late deliveries needed to hit target`, late: `${late} late of ${nfmt(total)}` };
};
export const hos: Calc = (v) => {
  const drove = Math.min(11, p(v, "d", 6)), onduty = Math.min(14, p(v, "o", 8)), week = p(v, "w", 52), cycle = pick(v.c, 2), sinceBreak = p(v, "b", 5);
  const limW = cycle ? 70 : 60, left = Math.max(0, Math.min(11 - drove, 14 - onduty, limW - week));
  return { left: `${left.toFixed(2)} hours of driving left today`, brk: sinceBreak >= 8 ? "30-minute break required now" : `Break due in ${(8 - sinceBreak).toFixed(2)} h of driving`, cycle: `${(limW - week).toFixed(2)} h left in the ${limW}-hour/${cycle ? 8 : 7}-day cycle (34-h restart resets it)` };
};
export const CYCLE = ["60 h / 7 days", "70 h / 8 days"];
export const cpm: Calc = (v) => {
  const miles = need(p(v, "mi", 110000), "Enter yearly miles."), mpg = need(p(v, "mpg", 6.5), "Enter mpg."), fuel = p(v, "f", 3.9), truck = p(v, "tr", 30000), ins = p(v, "in", 14000), maint = p(v, "m", 0.18), tires = p(v, "ti", 0.04), driver = p(v, "dr", 0.6), other = p(v, "ot", 9000);
  const fixed = truck + ins + other, varc = fuel / mpg + maint + tires + driver, total = fixed / miles + varc;
  return { cpm: `${$(total, 3)} per mile`, fixed: `${$(fixed / miles, 3)} fixed + ${$(varc, 3)} variable`, year: `${$(total * miles, 0)} a year` };
};
export const ownerOp: Calc = (v) => {
  const loads = p(v, "l", 18), rev = p(v, "r", 2600), miles = p(v, "mi", 9500), cpm0 = p(v, "c", 1.6), disp = p(v, "d", 8) / 100, fixed = p(v, "fx", 3500);
  const gross = loads * rev, net = gross * (1 - disp) - miles * cpm0 - fixed;
  return { net: `${$(net, 0)} a month take-home before tax`, gross: `${$(gross, 0)} gross`, rpm: `${$(gross / Math.max(miles, 1))} revenue per mile vs ${$(cpm0 + fixed / Math.max(miles, 1))} cost per mile` };
};
export const fuelSurcharge: Calc = (v) => {
  const price = p(v, "p", 3.9), base = p(v, "b", 1.25), mpg = need(p(v, "mpg", 6), "Enter mpg."), miles = p(v, "mi", 800);
  const per = Math.max(0, (price - base) / mpg);
  return { per: `${$(per, 3)} per mile`, total: `${$(per * miles)} for ${miles} miles`, note: `Diesel ${$(price)} vs ${$(base)} base, ${mpg} mpg` };
};
export const detention: Calc = (v) => {
  const arrive = p(v, "w", 4.5), free = p(v, "f", 2), rate = p(v, "r", 75), round = pick(v.rd, 2);
  let billable = Math.max(0, arrive - free); if (round) billable = Math.ceil(billable * 4) / 4;
  return { fee: `${$(billable * rate)} detention`, hours: `${billable.toFixed(2)} billable hours after ${free} free`, note: round ? "Billed in 15-minute increments" : "Billed exact time" };
};
export const demurrage: Calc = (v) => {
  const days = p(v, "d", 9), free = p(v, "f", 4), t1 = p(v, "t1", 150), t2 = p(v, "t2", 250), cont = Math.max(1, p(v, "n", 2)), detDays = p(v, "dd", 3), det = p(v, "dr", 120);
  const over = Math.max(0, days - free), c1 = Math.min(over, 4) * t1, c2 = Math.max(0, over - 4) * t2;
  return { dem: `${$((c1 + c2) * cont, 0)} demurrage`, det: `${$(detDays * det * cont, 0)} detention`, total: `${$((c1 + c2 + detDays * det) * cont, 0)} total for ${cont} container(s)` };
};
export const brokerMargin: Calc = (v) => {
  const shipper = need(p(v, "s", 3000), "Enter shipper rate."), carrier = p(v, "c", 2500), loads = p(v, "l", 100);
  const m = shipper - carrier;
  return { margin: `${$(m)} per load (${((100 * m) / shipper).toFixed(1)}%)`, month: `${$(m * loads, 0)} gross margin for ${loads} loads`, bench: (m / shipper) < 0.1 ? "Thin margin (under 10%)" : (m / shipper) < 0.2 ? "Typical (10–20%)" : "Strong margin" };
};
export const conveyorSpeed: Calc = (v) => {
  const d = need(p(v, "d", 4), "Enter pulley diameter."), rpm = need(p(v, "rpm", 100), "Enter RPM."), spacing = p(v, "sp", 12);
  const fpm = (Math.PI * d * rpm) / 12;
  return { fpm: `${fpm.toFixed(1)} ft/min belt speed`, mps: `${(fpm * 0.00508).toFixed(3)} m/s`, rate: spacing > 0 ? `${nfmt((fpm * 12) / spacing * 60)} items per hour at ${spacing} in spacing` : "—" };
};
export const dockDoors: Calc = (v) => {
  const trucks = p(v, "t", 60), hrs = need(p(v, "h", 10), "Enter operating hours."), turn = p(v, "u", 1.25), peak = p(v, "pk", 1.4);
  const doors = Math.ceil(((trucks / hrs) * turn) * peak);
  return { doors: `${doors} dock doors`, note: `${(trucks / hrs).toFixed(1)} trucks an hour × ${turn} h per truck × ${peak} peak factor`, ft: `${nfmt(doors * 12)} ft of dock face at 12 ft centres` };
};
export const crossDock: Calc = (v) => {
  const inb = p(v, "i", 40), pal = p(v, "p", 22), hrs = need(p(v, "h", 16), "Enter hours."), rate = need(p(v, "r", 30), "Enter pallets per worker-hour.");
  const pallets = inb * pal;
  return { pallets: `${nfmt(pallets)} pallets a day`, workers: `${Math.ceil(pallets / (rate * hrs))} workers on the floor`, per: `${(pallets / hrs).toFixed(0)} pallets an hour` };
};
export const routeStops: Calc = (v) => {
  const hrs = need(p(v, "h", 9), "Enter shift hours."), svc = p(v, "s", 6), drive = p(v, "d", 4), depot = p(v, "dp", 60), brk = p(v, "b", 30);
  const avail = hrs * 60 - depot - brk, stops = Math.floor(avail / (svc + drive));
  return { stops: `${stops} stops per route`, time: `${avail} min available for stops`, note: `${svc} min service + ${drive} min drive between stops` };
};
export const lastMile: Calc = (v) => {
  const driver = p(v, "d", 25), hrs = p(v, "h", 9), stops = need(p(v, "s", 120), "Enter stops."), veh = p(v, "v", 90), pkgs = p(v, "p", 1.3), fail = p(v, "f", 5) / 100;
  const cost = driver * hrs * 1.25 + veh, perPkg = cost / (stops * pkgs * (1 - fail));
  return { pkg: `${$(perPkg)} per package delivered`, stop: `${$(cost / stops)} per stop`, route: `${$(cost, 0)} per route (driver incl. 25% burden + vehicle)` };
};
export const coldChain: Calc = (v) => {
  const miles = p(v, "mi", 900), rpm = p(v, "r", 3.1), reefer = p(v, "rf", 1), hrs = p(v, "h", 20), mon = p(v, "m", 75);
  const fuel = reefer * hrs * 4;
  return { total: `${$(miles * rpm + fuel + mon, 0)}`, reefer: `${$(fuel)} reefer unit fuel (${reefer} gal/h × ${hrs} h)`, perMile: `${$((miles * rpm + fuel + mon) / Math.max(miles, 1))} per mile` };
};
export const abc: Calc = (v) => {
  const vals = [p(v, "a1", 52000), p(v, "a2", 31000), p(v, "a3", 9000), p(v, "a4", 4000), p(v, "a5", 2500), p(v, "a6", 1500), p(v, "a7", 800), p(v, "a8", 200)];
  const sorted = vals.map((x, i) => [x, i + 1] as [number, number]).sort((a, b) => b[0] - a[0]), total = vals.reduce((a, b) => a + b, 0);
  let cum = 0; const cls = sorted.map(([x, i]) => { cum += x; const c = cum / total <= 0.8 ? "A" : cum / total <= 0.95 ? "B" : "C"; return `SKU ${i}: ${c} (${((100 * x) / total).toFixed(1)}%)`; });
  return { abc: cls.join(" · "), rule: "A = top 80% of value, B = next 15%, C = last 5%", total: `${$(total, 0)} annual usage value` };
};
export const cycleCount: Calc = (v) => {
  const counted = need(p(v, "c", 500), "Enter locations counted."), errors = p(v, "e", 12), tol = p(v, "t", 0), value = p(v, "v", 4200);
  const acc = 1 - errors / counted;
  return { acc: `${(acc * 100).toFixed(2)}% location accuracy`, val: `${$(value, 0)} absolute variance value`, bench: acc >= 0.99 ? "World-class (99%+)" : acc >= 0.97 ? "Good" : "Needs improvement", note: tol ? `Using ±${tol} unit tolerance` : "Exact match required" };
};
// ---- shipping & ecommerce
export const fbaStorage: Calc = (v) => {
  const l = p(v, "l", 12), w = p(v, "w", 9), h = p(v, "h", 4), units = p(v, "u", 300), q4 = pick(v.q4, 2), rate = p(v, "r", q4 ? 2.4 : 0.78), days = p(v, "d", 120), aged = p(v, "ag", 0);
  const ft3 = (l * w * h) / 1728, monthly = ft3 * units * rate;
  return { month: `${$(monthly)} a month`, unit: `${$(ft3 * rate, 3)} per unit (${ft3.toFixed(3)} ft³)`, aged: days > 180 && aged ? `+ ${$(ft3 * units * aged)} aged-inventory surcharge` : "No aged-inventory surcharge at this age (check Amazon's thresholds)" };
};
export const Q4 = ["January–September", "October–December (peak)"];
export const poshmark: Calc = (v) => {
  const price = need(p(v, "pr", 45), "Enter the sale price."), cost = p(v, "c", 12);
  const fee = price < 15 ? 2.95 : price * 0.2, net = price - fee;
  return { profit: `${$(net - cost)} profit`, fee: `${$(fee)} Poshmark fee (${price < 15 ? "$2.95 flat under $15" : "20%"})`, net: `${$(net)} earnings before item cost` };
};
export const mercari: Calc = (v) => {
  const price = need(p(v, "pr", 40), "Enter sale price."), ship = p(v, "s", 0), cost = p(v, "c", 10), fee = p(v, "f", 10) / 100, payFee = p(v, "pf", 2.9) / 100, fixed = p(v, "fx", 0.5);
  const fees = price * fee + (price + ship) * payFee + fixed, net = price - fees - ship;
  return { profit: `${$(net - cost)} profit`, fees: `${$(fees)} fees`, net: `${$(net)} payout (seller-paid shipping ${$(ship)})` };
};
export const FLAT = ["Envelope", "Small box", "Medium box", "Large box"];
export const flatRate: Calc = (v) => {
  const b = pick(v.b, 4), prices = [p(v, "p0", 10.85), p(v, "p1", 11.45), p(v, "p2", 20.2), p(v, "p3", 27.4)], wt = p(v, "wt", 6), zone = Math.min(9, Math.max(1, Math.round(p(v, "z", 6)))), byWeight = p(v, "bw", 0);
  const weightEst = byWeight || 8 + wt * (0.6 + zone * 0.35);
  return { flat: `${$(prices[b])} ${FLAT[b]} flat rate`, weight: `${$(weightEst)} estimated weight-based Priority Mail (${wt} lb, zone ${zone})`, best: prices[b] < weightEst ? "Flat rate is cheaper" : "Weight-based is cheaper" };
};
export const packagingCost: Calc = (v) => {
  const box = p(v, "b", 0.85), fill = p(v, "f", 0.2), tape = p(v, "t", 0.08), label = p(v, "l", 0.05), insert = p(v, "i", 0.15), labor = p(v, "lb", 2), wage = p(v, "w", 18), orders = p(v, "o", 1000);
  const per = box + fill + tape + label + insert + (labor / 60) * wage;
  return { per: `${$(per)} per order`, month: `${$(per * orders, 0)} for ${nfmt(orders)} orders`, split: `Materials ${$(per - (labor / 60) * wage)} · packing labour ${$((labor / 60) * wage)}` };
};
export const cartAbandon: Calc = (v) => {
  const carts = need(p(v, "c", 1000), "Enter carts created."), orders = p(v, "o", 300), aov = p(v, "a", 65), recov = p(v, "r", 10) / 100;
  const ab = 1 - orders / carts, lost = (carts - orders) * aov;
  return { rate: `${(ab * 100).toFixed(1)}% abandonment`, lost: `${$(lost, 0)} in abandoned carts`, recover: `${$(lost * recov, 0)} recovered at ${(recov * 100).toFixed(0)}% with abandoned-cart emails` };
};
export const listingPrice: Calc = (v) => {
  const cost = p(v, "c", 12), ship = p(v, "s", 5), fee = p(v, "f", 13) / 100, fixed = p(v, "fx", 0.3), margin = p(v, "m", 30) / 100;
  if (fee + margin >= 1) throw new InputError("Fees plus margin must be under 100%.");
  const price = (cost + ship + fixed) / (1 - fee - margin);
  return { price: `${$(price)} list price`, profit: `${$(price * margin)} profit (${(margin * 100).toFixed(0)}% margin)`, fees: `${$(price * fee + fixed)} marketplace fees` };
};
export const pod: Calc = (v) => {
  const price = p(v, "pr", 28), base = p(v, "b", 12.5), ship = p(v, "s", 4.5), shipChg = p(v, "sc", 4.5), fee = p(v, "f", 6.5) / 100, ads = p(v, "a", 3), units = p(v, "u", 100);
  const unit = price + shipChg - base - ship - (price + shipChg) * fee - ads;
  return { profit: `${$(unit * units, 0)} for ${units} sales`, unit: `${$(unit)} per sale`, margin: `${((100 * unit) / price).toFixed(1)}% margin after ad cost` };
};
export const intlPostage: Calc = (v) => {
  const wt = need(p(v, "wt", 2), "Enter weight."), base = p(v, "b", 18), perLb = p(v, "pl", 6.5), customs = p(v, "cu", 0), ins = p(v, "in", 0);
  return { cost: `${$(base + Math.max(0, wt - 1) * perLb + customs + ins)} estimated`, basis: `${$(base)} first lb + ${$(perLb)} per extra lb`, note: "Editable defaults — check the carrier's current price list for the destination" };
};
const zoneCost = (base: number, perKg: number, sym: string): Calc => (v) => {
  const kg = need(p(v, "kg", 2), "Enter weight."), l = p(v, "l", 30), w = p(v, "w", 20), h = p(v, "h", 15), b = p(v, "b", base), r = p(v, "r", perKg), div = p(v, "dv", 5000);
  const dim = (l * w * h) / div, bill = Math.max(kg, dim);
  return { cost: `${money(b + Math.max(0, bill - 1) * r, sym)} estimated`, bill: `${bill.toFixed(2)} kg billable (${dim > kg ? "dimensional" : "actual"} weight)`, note: "Rates are editable estimates — use the carrier's postage calculator for an exact quote" };
};
export const canadaPost = zoneCost(14, 3.5, "C$");
export const auPost = zoneCost(13, 4, "A$");
export const stampCount: Calc = (v) => {
  const oz = Math.max(1, Math.ceil(p(v, "oz", 3))), first = p(v, "f", 0.78), add = p(v, "a", 0.29), flat = pick(v.t, 2);
  const post = flat ? 1.63 + (oz - 1) * add : first + (oz - 1) * add;
  return { stamps: `${Math.ceil(post / first)} Forever stamps (${$(post)} postage)`, exact: `Or 1 Forever + ${oz - 1} additional-ounce stamp(s)`, note: flat ? "Large envelope (flat) rates apply" : oz > 3.5 ? "Over 3.5 oz letters become flats" : "Standard letter" };
};
export const ENVELOPE = ["Letter", "Large envelope (flat)"];
export const certifiedMail: Calc = (v) => {
  const post = p(v, "p", 0.78), cert = p(v, "c", 5.3), rr = pick(v.rr, 3), rrFees = [0, 4.4, 2.82];
  const total = post + cert + rrFees[rr];
  return { total: `${$(total)} per letter`, split: `Postage ${$(post)} + certified ${$(cert)}${rr ? ` + return receipt ${$(rrFees[rr])}` : ""}`, note: "Editable defaults — USPS updates fees each January and July" };
};
export const RR = ["No return receipt", "Paper return receipt (green card)", "Electronic return receipt"];
export const subBox: Calc = (v) => {
  const subs = p(v, "s", 500), price = p(v, "pr", 35), cogs = p(v, "c", 12), ship = p(v, "sh", 7), pack = p(v, "pk", 2.5), churn = p(v, "ch", 8) / 100, cac = p(v, "ac", 40), fee = p(v, "f", 3) / 100;
  const unit = price * (1 - fee) - cogs - ship - pack, ltv = unit / Math.max(churn, 0.001);
  return { profit: `${$(unit * subs, 0)} a month`, unit: `${$(unit)} per box`, ltv: `${$(ltv, 0)} lifetime value vs ${$(cac, 0)} CAC (${(ltv / Math.max(cac, 1)).toFixed(1)}× )` };
};
export const onlineReorder: Calc = (v) => {
  const daily = p(v, "d", 12), lead = p(v, "l", 21), safety = p(v, "s", 7), stock = p(v, "st", 300), moq = p(v, "m", 200);
  const rop = daily * (lead + safety), days = stock / Math.max(daily, 0.01);
  return { rop: `Reorder at ${nfmt(rop)} units`, status: stock <= rop ? "Reorder now" : `${Math.floor((stock - rop) / Math.max(daily, 0.01))} days until you need to reorder`, qty: `Order ${nfmt(Math.max(moq, daily * 30))} units (30 days or MOQ)`, cover: `${days.toFixed(0)} days of stock left` };
};
export const affiliate: Calc = (v) => {
  const clicks = p(v, "c", 5000), conv = p(v, "cv", 4) / 100, aov = p(v, "a", 60), rate = p(v, "r", 5) / 100;
  const sales = clicks * conv, earn = sales * aov * rate;
  return { earn: `${$(earn)} commission`, sales: `${nfmt(sales, 1)} sales from ${nfmt(clicks)} clicks`, epc: `${$(earn / Math.max(clicks, 1), 3)} earnings per click (EPC)` };
};

// ---- registry (generated)
export const ideaBiz3CustomCalculators: Record<string, Calc> = {
  "ftl-truckload-rate-per-mile-calculator": ftlRate,
  "container-loading-cbm-calculator": containerCbm,
  "pallet-count-per-truck-calculator": palletsPerTruck,
  "pallet-stacking-weight-calculator": palletStack,
  "warehouse-space-square-feet-calculator": warehouseSpace,
  "order-picking-rate-calculator": pickRate,
  "warehouse-labor-cost-per-order-calculator": laborPerOrder,
  "on-time-delivery-rate-calculator": otd,
  "truck-driver-hours-of-service-calculator": hos,
  "trucking-cost-per-mile-calculator": cpm,
  "owner-operator-profit-calculator": ownerOp,
  "fuel-surcharge-calculator": fuelSurcharge,
  "detention-fee-calculator": detention,
  "demurrage-charges-calculator": demurrage,
  "freight-margin-broker-calculator": brokerMargin,
  "conveyor-belt-speed-calculator": conveyorSpeed,
  "dock-door-requirement-calculator": dockDoors,
  "cross-dock-throughput-calculator": crossDock,
  "route-delivery-stops-per-day-calculator": routeStops,
  "last-mile-delivery-cost-calculator": lastMile,
  "cold-chain-refrigerated-cost-calculator": coldChain,
  "abc-inventory-analysis-calculator": abc,
  "cycle-count-accuracy-calculator": cycleCount,
  "amazon-fba-storage-fees-calculator": fbaStorage,
  "poshmark-fees-profit-calculator": poshmark,
  "mercari-fees-profit-calculator": mercari,
  "usps-priority-mail-flat-rate-calculator": flatRate,
  "packaging-cost-per-order-calculator": packagingCost,
  "cart-abandonment-rate-calculator": cartAbandon,
  "product-listing-price-calculator": listingPrice,
  "print-on-demand-profit-calculator": pod,
  "international-postage-rate-calculator": intlPostage,
  "canada-post-shipping-calculator": canadaPost,
  "australia-post-shipping-calculator": auPost,
  "postage-stamp-count-calculator": stampCount,
  "certified-mail-cost-calculator": certifiedMail,
  "subscription-box-profit-calculator": subBox,
  "inventory-reorder-for-online-store-calculator": onlineReorder,
  "affiliate-commission-earnings-calculator": affiliate,
};
