/**
 * Idea build, batch shop1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Shopping > Clothing & Size (4), Discount, Tip & Unit
 * Price (9), Electronics, Energy & Tech (13), Gold, Silver & Jewelry (5), Lifestyle, Party & Wedding (13) = 44 tools.
 * Guides used (editable): US baby clothing size chart by weight/height; men's underwear by waist; helmet sizes by head circumference
 * (S ~51–55 cm, M 55–59, L 59–63); common tipping etiquette by country and service (general norms, local custom varies); USPS rule that
 * carriers may accept gifts worth up to $20 per occasion (no cash); extension-cord gauge by load and length (16 AWG to 13 A at ≤ 50 ft,
 * 14 AWG to 15 A, 12 AWG to 20 A); 1 tola = 11.6638 g (10 g "bhori" option); 1 troy oz = 31.1035 g; Christmas tree height = ceiling − 6 to
 * 12 in, width ≈ 75–80% of height. Electricity prices, device wattages and costs are editable defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const band = (x: number, rows: [number, string][]) => (rows.find(([hi]) => x <= hi) ?? rows[rows.length - 1])[1];

// ---- Clothing & size ----
export const necklace: Calc = (v) => {
  const neck = P(v, "n", 14, "Neck size"), style = pick(v.s, 6), lens = [14, 16, 18, 20, 24, 30], names = ["Collar (14 in)", "Choker (16 in)", "Princess (18 in)", "Matinee (20 in)", "Opera (24 in)", "Rope (30 in+)"];
  const want = lens[style], fit = want - neck;
  return { l: `${names[style]} — buy about ${f(Math.max(want, neck + 2))} in (${f(Math.max(want, neck + 2) * 2.54)} cm)`, f: fit < 2 ? `Your ${f(neck)} in neck needs at least ${f(neck + 2)} in for a choker style` : `Sits about ${f(fit / 2)} in below the base of your neck`, note: "Measure your neck snugly and add 2 in for a comfortable choker · pendants hang lower on longer chains · men's chains usually 20–24 in" };
};
export const babySize: Calc = (v) => {
  const w = P(v, "w", 14, "Weight"), h = Z(v, "h", 25), kg = pick(v.u, 2) === 1, lb = kg ? w * 2.20462 : w, inch = kg ? h / 2.54 : h;
  const rows: [number, number, string][] = [[8, 21.5, "Newborn (NB)"], [12.5, 24, "0–3 months"], [16.5, 26.5, "3–6 months"], [20.5, 28.5, "6–9 months"], [24.5, 30.5, "12 months"], [27.5, 32.5, "18 months"], [30, 34, "24 months / 2T"], [99, 99, "3T or larger"]];
  const byW = rows.findIndex(([a]) => lb <= a), byH = inch ? rows.findIndex(([, b]) => inch <= b) : byW, idx = Math.max(byW, byH);
  return { s: `Size ${rows[idx][2]}`, d: `By weight: ${rows[byW][2]}${inch ? ` · by length: ${rows[byH][2]}` : ""} (${f(lb)} lb${inch ? `, ${f(inch)} in` : ""})`, note: "Typical US chart — brands differ, so size up when between sizes or near the top of a range · babies outgrow newborn fast" };
};
export const underwear: Calc = (v) => {
  const w = P(v, "w", 34, "Waist"), cm = pick(v.u, 2) === 1, inch = cm ? w / 2.54 : w;
  const s = band(inch, [[27, "XS"], [30, "S"], [34, "M"], [38, "L"], [42, "XL"], [46, "XXL"], [99, "3XL"]]);
  return { s: `Size ${s}`, d: `Waist ${f(inch)} in (${f(inch * 2.54)} cm)`, note: "Typical US men's sizing: S 28–30, M 32–34, L 36–38, XL 40–42, XXL 44–46 in · measure at the natural waist; check the brand chart" };
};
export const helmet: Calc = (v) => {
  const c = P(v, "c", 57, "Head circumference"), inch = pick(v.u, 2) === 1, cm = inch ? c * 2.54 : c, t = pick(v.t, 3);
  const rows: [number, string][] = t === 2 ? [[53, "XS"], [55, "S"], [57, "M"], [59, "L"], [61, "XL"], [63, "XXL"], [99, "3XL"]] : [[51, "XS"], [55, "S"], [59, "M"], [63, "L"], [99, "XL"]];
  return { s: `Size ${band(cm, rows)}`, d: `Head ${f(cm)} cm (${f(cm / 2.54)} in) · ${["bike", "ski/snowboard", "motorcycle"][t]} helmet`, note: "Measure 1 in (2.5 cm) above the eyebrows around the widest part · it should be snug with no pressure points and not rock when you shake your head" };
};
// ---- Discounts, tips & unit price ----
export const b2g1: Calc = (v) => {
  const price = P(v, "p", 20, "Item price"), buy = Math.max(1, Math.round(num(v.b, 2))), free = Math.max(1, Math.round(num(v.g, 1))), n = Math.max(1, Math.round(num(v.n, 3))), tax = Z(v, "t", 0) / 100;
  const sets = Math.floor(n / (buy + free)), rem = n % (buy + free), paid = sets * buy + Math.min(rem, buy), cost = paid * price * (1 + tax);
  return { c: `Pay ${$2(cost)} for ${n} items (${paid} paid, ${n - paid} free)`, u: `Effective ${$2(cost / n)} each · ${pc(1 - paid / n)} off`, note: `Buy ${buy} get ${free} free = ${pc(free / (buy + free))} off when you buy in full sets of ${buy + free}${rem && rem < buy + free ? ` · add ${buy + free - rem} more to complete the next set` : ""}` };
};
export const compareTwo: Calc = (v) => {
  const p1 = P(v, "a", 4.99, "Price 1"), q1 = P(v, "b", 16, "Size 1"), p2 = P(v, "c", 7.49, "Price 2"), q2 = P(v, "d", 28, "Size 2"), u1 = p1 / q1, u2 = p2 / q2;
  const better = u1 <= u2 ? 1 : 2, sav = Math.abs(u1 - u2) / Math.max(u1, u2);
  return { b: `Item ${better} is cheaper per unit — ${pc(sav, 1)} less`, u: `Item 1 ${$2(u1)}/unit · item 2 ${$2(u2)}/unit (${$2(u1 * 100)} vs ${$2(u2 * 100)} per 100)`, note: "Use the same unit for both (oz, g, count, sheets) · bigger isn't always cheaper, and only buy bulk you'll use" };
};
export const couponStack: Calc = (v) => {
  const price = P(v, "p", 120, "Price"), pct1 = Z(v, "a", 20) / 100, pct2 = Z(v, "b", 10) / 100, dollars = Z(v, "c", 15), order = pick(v.o, 2), tax = Z(v, "t", 0) / 100, cb = Z(v, "x", 0) / 100;
  const pctFirst = Math.max(0, price * (1 - pct1) * (1 - pct2) - dollars), dollFirst = Math.max(0, (price - dollars) * (1 - pct1) * (1 - pct2)), pay = order === 0 ? pctFirst : dollFirst, fin = pay * (1 + tax) * (1 - cb);
  return { t: `You pay ${$2(fin)} (${pc(1 - fin / (price * (1 + tax)), 1)} off overall)`, c: `Percent coupons first: ${$2(pctFirst)} · dollar coupon first: ${$2(dollFirst)} — ${pctFirst <= dollFirst ? "percent first" : "dollar first"} is cheaper by ${$2(Math.abs(pctFirst - dollFirst))}`, note: "Two percent coupons multiply (20% + 10% = 28% off, not 30%) · stores set the order, and many don't allow stacking" };
};
const TIPS: [string, string, number][] = [["United States", "15–20% at restaurants; 18–20% is standard", 0.18], ["Canada", "15–20% at restaurants", 0.18], ["Mexico", "10–15% (check for 'propina incluida')", 0.12], ["United Kingdom", "10–12.5% if service isn't already added", 0.1], ["Ireland", "10–12.5% for table service", 0.1], ["France", "Service is included (service compris); round up or leave a few euros", 0.05], ["Germany", "Round up or add 5–10% and tell the server the total", 0.08], ["Italy", "Coperto/service often added; round up or €1–2 per person", 0.05], ["Spain", "Round up or 5–10% for good service", 0.07], ["United Arab Emirates", "10–15% if service charge isn't added", 0.12], ["India", "10% if no service charge", 0.1], ["Australia", "Not expected; 10% for great service", 0.05], ["New Zealand", "Not expected", 0], ["Japan", "No tipping — it can be refused", 0], ["China", "Generally not expected", 0], ["Singapore", "10% service charge usually included", 0], ["Brazil", "10% service usually included on the bill", 0], ["Egypt", "10–15% plus small 'baksheesh' for services", 0.12], ["Thailand", "Round up or 20–50 baht", 0.05], ["South Africa", "10–15%", 0.12]];
export const tipCountry: Calc = (v) => {
  const c = pick(v.c, TIPS.length), bill = Z(v, "b", 80), [name, rule, rate] = TIPS[c];
  return { t: rate ? `Typical tip ≈ ${$2(bill * rate)} on a ${$2(bill)} bill (${pc(rate)})` : "No tip expected", r: `${name}: ${rule}`, note: "General etiquette guide — check the bill for a service charge first and follow local custom; tip in local currency where possible" };
};
export const housekeeping: Calc = (v) => {
  const n = Math.max(1, Math.round(num(v.n, 4))), lvl = pick(v.l, 3), ppl = Math.max(1, num(v.p, 2)), mess = pick(v.m, 2) === 1, per = [3, 5, 10][lvl] + (ppl > 2 ? 1 : 0) + (mess ? 2 : 0);
  return { t: `Leave ≈ ${$(per)} a night — ${$(per * n)} for ${n} nights`, d: `${["Budget/mid-range", "Upscale", "Luxury"][lvl]} hotel, ${f(ppl)} guests${mess ? ", extra mess" : ""}`, note: "Tip daily (staff change shifts) and leave it with a note saying 'housekeeping' · common US guidance is $2–$5 a night, $5–$10+ at luxury hotels" };
};
export const weddingTips: Calc = (v) => {
  const rows: [string, number][] = [["planner/coordinator", Z(v, "a", 3000) * 0.1], ["catering staff (servers)", Z(v, "b", 10) * 30], ["bartenders", Z(v, "c", 2) * 75], ["DJ / band", Z(v, "d", 1500) * 0.15], ["photographer", Z(v, "e", 2) * 100], ["hair & makeup", Z(v, "f", 600) * 0.2], ["drivers", Z(v, "g", 2) * 50], ["officiant (donation)", Z(v, "h", 1) * 100], ["delivery/setup crews", Z(v, "i", 4) * 20]];
  const tot = rows.reduce((s, [, x]) => s + x, 0);
  return { t: `Budget ≈ ${$(tot)} for vendor tips`, d: rows.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · "), note: "Common US etiquette: planner 10–20%, servers $20–$50 each, bartenders $50–$100 each, musicians/DJ 10–15%, beauty 15–20%, drivers 15–20% · check contracts for included gratuity first" };
};
export const tourGuide: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), hrs = Z(v, "h", 4), price = Z(v, "c", 0), priv = pick(v.t, 2) === 1, days = Math.max(1, num(v.d, 1));
  const perPerson = hrs <= 4 ? 5 : hrs <= 8 ? 10 : 15, group = priv && price ? price * 0.15 : perPerson * ppl * days;
  return { t: `Tip about ${$(group)}${priv ? "" : ` (${$(perPerson)} per person per day)`}`, d: `${priv ? "Private tour — 15–20% of the price" : `Group tour, ${f(ppl)} people, ${f(hrs)} h`}${days > 1 ? ` over ${f(days)} days` : ""} · tip the driver separately (≈ half the guide's tip)`, note: "US-style guidance — norms vary by country; on multi-day trips $10–$20 per person per day for the guide is common" };
};
export const holidayTips: Calc = (v) => {
  const rows: [string, number][] = [["housekeeper/cleaner (1 visit's pay)", Z(v, "a", 120)], ["nanny/babysitter (1 week's pay)", Z(v, "b", 0)], ["dog walker (1 week's pay)", Z(v, "c", 0)], ["doorman/building staff", Z(v, "d", 0) * 50], ["teacher (gift)", Z(v, "e", 1) * 25], ["mail carrier (gift ≤ $20)", Z(v, "f", 1) * 20], ["trash/recycling crew", Z(v, "g", 2) * 20], ["hair stylist (1 visit)", Z(v, "h", 70)], ["personal trainer (1 session)", Z(v, "i", 0)]];
  const tot = rows.reduce((s, [, x]) => s + x, 0);
  return { t: `Holiday tip budget ≈ ${$(tot)}`, d: rows.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · "), note: "USPS rules let carriers accept gifts up to $20 per occasion (no cash or gift cards usable as cash) · many schools set gift limits for teachers · give what fits your budget" };
};
export const valet: Calc = (v) => {
  const n = Math.max(1, num(v.n, 1)), area = pick(v.a, 3), both = pick(v.b, 2) === 0, per = [2, 3, 5][area], tot = per * n * (both ? 2 : 1);
  return { t: `Tip ${$(per)} ${both ? "at drop-off and pick-up" : "at pick-up"} — ${$(tot)} total`, d: `${["Small town / casual", "City / hotel", "Luxury / high-end event"][area]} · ${f(n)} visit${n > 1 ? "s" : ""}`, note: "US norm is $2–$5 when your car is brought back (more for luxury venues, bad weather or help with luggage) · tip in cash" };
};
// ---- Electronics, energy & tech ----
const devCost = (label: string): Calc => (v) => {
  const w = P(v, "w", label === "tv" ? 100 : 150, "Watts"), h = Z(v, "h", label === "tv" ? 5 : 24), sb = Z(v, "s", label === "tv" ? 0.5 : 0), rate = Z(v, "r", 0.17), duty = label === "fridge" ? Math.min(100, Z(v, "d", 35)) / 100 : 1;
  const kwh = (w * h * duty + sb * (24 - h)) * 365 / 1000;
  return { c: `${$2(kwh * rate)} a year (${$2((kwh * rate) / 12)} a month)`, k: `${f(kwh)} kWh a year${label === "fridge" ? ` (compressor runs ~${pc(duty)} of the time)` : ` · ${f(h)} h a day${sb ? ` + ${f(sb)} W standby` : ""}`}`, note: label === "fridge" ? "Use the yellow EnergyGuide kWh/year label if you have it · fridges over 15 years old can use twice as much as new ENERGY STAR models" : "Check the TV's EnergyGuide label or measure with a plug-in meter · brightness and HDR settings change power draw a lot" };
};
export const tvCost = devCost("tv");
export const fridgeCost = devCost("fridge");
export const phoneCharge: Calc = (v) => {
  const mah = P(v, "c", 4500, "Battery capacity"), V = P(v, "v", 3.85, "Battery voltage"), n = Z(v, "n", 1), eff = Math.min(100, P(v, "e", 80, "Charger efficiency")) / 100, rate = Z(v, "r", 0.17), dev = Math.max(1, num(v.d, 1));
  const kwh = ((mah / 1000) * V * n * 365 * dev) / eff / 1000;
  return { c: `${$2(kwh * rate)} a year to charge ${dev > 1 ? `${dev} phones` : "your phone"}`, k: `${f((mah / 1000) * V)} Wh per full charge → ${f(kwh)} kWh a year at ${f(n)} charge${n === 1 ? "" : "s"} a day`, note: "Phones cost well under $1–$2 a year to charge — a fridge uses more in a day · unplugged chargers draw almost nothing today" };
};
export const batteryHealth: Calc = (v) => {
  const full = P(v, "f", 3700, "Current full-charge capacity"), design = P(v, "d", 4500, "Design capacity"), cyc = Z(v, "c", 500), h = full / design;
  return { h: `Battery health ${pc(h, 1)}`, v: h >= 0.9 ? "Excellent" : h >= 0.8 ? "Good — normal wear" : h >= 0.7 ? "Worn — shorter battery life, consider replacing" : "Poor — replacement recommended", note: `${f(design - full)} mAh lost${cyc ? ` over ${f(cyc)} cycles (${f(((1 - h) / cyc) * 100 * 100)}% per 100 cycles)` : ""} · most phones are designed to keep ~80% after 500–1,000 cycles · heat and 100% charging speed up wear` };
};
export const upgrade: Calc = (v) => {
  const newP = P(v, "n", 999, "New phone price"), trade = Z(v, "t", 250), keep = P(v, "k", 3, "Years you'd keep it"), oldYrs = Z(v, "y", 2), batt = Z(v, "b", 89), repair = Z(v, "r", 0), resale = Z(v, "s", 30) / 100;
  const netNew = newP - trade - newP * resale, perYr = netNew / keep, fixOld = repair + (batt > 0 ? batt : 0), score = (oldYrs >= 4 ? 2 : oldYrs >= 3 ? 1 : 0) + (repair > newP * 0.3 ? 2 : 0);
  return { r: score >= 2 ? "Upgrading makes sense" : "Keep your current phone a bit longer", c: `New phone costs ${$(perYr)} a year (${$(newP)} − ${$(trade)} trade-in − ${pc(resale)} resale after ${f(keep)} years) vs ${$(fixOld)} to refresh the old one`, note: `A battery replacement (~${$(batt)}) often adds 1–2 years · check whether your phone still gets security updates — that's the hard deadline` };
};
export const smartPlug: Calc = (v) => {
  const w = Z(v, "w", 8), hrs = Z(v, "h", 16), n = Math.max(1, num(v.n, 4)), rate = Z(v, "r", 0.17), cost = Z(v, "c", 12), own = Z(v, "p", 0.8);
  const saved = ((w - own) * hrs * 365 * n) / 1000, $s = saved * rate;
  return { s: `Saves ≈ ${$2($s)} a year (${f(saved)} kWh)`, p: $s > 0 ? `Payback in ${f((cost * n) / $s)} years on ${$(cost * n)} of plugs` : "No payback — the plug uses more than it saves", note: `Cutting ${f(w)} W standby for ${f(hrs)} h a day on ${n} devices · smart plugs themselves draw ~0.5–1 W, so they only pay off on real standby loads (TVs, consoles, PCs)` };
};
export const cordGauge: Calc = (v) => {
  const a = P(v, "a", 12, "Load current"), L = P(v, "l", 50, "Cord length"), useW = pick(v.u, 2) === 1, amps = useW ? a / 120 : a;
  const g = L <= 25 ? (amps <= 10 ? 16 : amps <= 13 ? 16 : amps <= 15 ? 14 : 12) : L <= 50 ? (amps <= 10 ? 16 : amps <= 13 ? 14 : amps <= 15 ? 12 : 10) : L <= 100 ? (amps <= 10 ? 14 : amps <= 13 ? 12 : amps <= 15 ? 12 : 10) : 10;
  return { g: `Use at least ${g} AWG`, d: `${f(amps)} A over ${f(L)} ft${useW ? ` (${f(a)} W at 120 V)` : ""}`, note: "Lower AWG = thicker wire · never exceed the cord's rated amps, don't daisy-chain cords, and don't run high-wattage heaters on extension cords · guideline for 120 V cords" };
};
export const surge: Calc = (v) => {
  const d = pick(v.d, 4), val = Z(v, "v", 1500), j = [600, 1000, 2000, 3000][d];
  return { j: `Look for at least ${nfmt(j)} joules`, d: `${["Lamps, chargers, clocks", "TV, router, small electronics", "Computers, game consoles, home theatre", "Workstations, AV racks, expensive gear"][d]}${val ? ` · protecting ~${$(val)} of equipment` : ""}`, note: "Also check UL 1449 listing, clamping voltage (330 V is best) and an indicator light · surge protectors wear out — replace after a big surge or every 3–5 years" };
};
export const inkCost: Calc = (v) => {
  const cart = P(v, "c", 35, "Black cartridge price"), yld = P(v, "y", 300, "Black page yield"), col = Z(v, "a", 40), cy = Z(v, "b", 250), pages = Z(v, "p", 100), colPct = Math.min(100, Z(v, "x", 20)) / 100, paper = Z(v, "z", 0.01);
  const bw = cart / yld, colour = col && cy ? col / cy : 0, perPage = bw + colour * colPct + paper;
  return { c: `≈ ${(perPage * 100).toFixed(1)}¢ per page`, y: `${$2(perPage * pages * 12)} a year at ${f(pages)} pages a month (black ${(bw * 100).toFixed(1)}¢, colour ${(colour * 100).toFixed(1)}¢, paper ${(paper * 100).toFixed(1)}¢)`, note: "Yields use ISO test pages (5% coverage) — photos use far more · high-yield and ink-tank printers often cut costs to under 1¢ a page" };
};
export const mesh: Calc = (v) => {
  const sf = P(v, "s", 3000, "Home size"), fl = Math.max(1, Math.round(num(v.f, 2))), walls = pick(v.w, 3), cov = Z(v, "c", 1600), dev = Z(v, "d", 30);
  const eff = cov * [1, 0.8, 0.6][walls], nodes = Math.max(1, Math.ceil(sf / eff), fl), byDev = Math.ceil(dev / 40);
  return { n: `${Math.max(nodes, byDev)} mesh node${Math.max(nodes, byDev) > 1 ? "s" : ""} (including the main router)`, d: `${f(sf)} sq ft over ${fl} floor${fl > 1 ? "s" : ""} with ${["drywall/open plan", "some brick or plaster", "concrete/stone walls"][walls]} · ~${f(eff)} sq ft per node`, note: "Place nodes no more than two rooms apart and in open spots · wired (Ethernet) backhaul makes a big difference" };
};
export const smartHome: Calc = (v) => {
  const items: [string, number, number][] = [["smart speakers", Z(v, "a", 3), 2.5], ["cameras", Z(v, "b", 2), 4], ["smart plugs", Z(v, "c", 5), 0.8], ["hubs/bridges", Z(v, "d", 1), 3], ["video doorbell", Z(v, "e", 1), 4], ["thermostat", Z(v, "f", 1), 1.5], ["displays/tablets", Z(v, "g", 1), 6]];
  const rate = Z(v, "r", 0.17), w = items.reduce((s, [, n, x]) => s + n * x, 0), kwh = (w * 24 * 365) / 1000;
  return { c: `${$2(kwh * rate)} a year for always-on smart devices`, w: `${f(w)} W continuous → ${f(kwh)} kWh a year`, note: "Typical idle draws: speakers 2–3 W, cameras 3–5 W, plugs < 1 W, displays 5–8 W · edit counts to match your home" };
};
export const ereader: Calc = (v) => {
  const dev = P(v, "d", 130, "E-reader price"), books = P(v, "b", 15, "Books per year"), pb = P(v, "p", 18, "Print book price"), eb = Z(v, "e", 10), sub = Z(v, "s", 0), lib = Math.min(100, Z(v, "l", 0)) / 100, y = Math.max(1, num(v.y, 4));
  const print = books * pb * y, ebook = dev + (books * (1 - lib) * eb + sub * 12) * y;
  return { r: ebook < print ? `E-reader saves ${$(print - ebook)} over ${f(y)} years` : `Print books are ${$(ebook - print)} cheaper over ${f(y)} years`, d: `Print ${$(print)} vs e-reader ${$(ebook)} (${$(dev)} device + e-books${sub ? ` + ${$2(sub)}/month subscription` : ""}${lib ? `, ${pc(lib)} borrowed free from the library` : ""})`, note: `Break-even after about ${f(dev / Math.max(0.01, books * (pb - eb * (1 - lib)) - sub * 12))} years · used print books and library apps (Libby) cut costs either way` };
};
export const consoleCost: Calc = (v) => {
  const c = P(v, "c", 500, "Console price"), y = Math.max(1, num(v.y, 6)), sub = Z(v, "s", 80), games = Z(v, "g", 4), gp = Z(v, "p", 60), acc = Z(v, "a", 150), w = Z(v, "w", 150), h = Z(v, "h", 2), rate = Z(v, "r", 0.17), res = Z(v, "x", 100);
  const power = ((w * h * 365) / 1000) * rate, tot = c + acc + (sub + games * gp + power) * y - res;
  return { t: `≈ ${$(tot)} over ${f(y)} years (${$(tot / y)} a year)`, d: `Console ${$(c)} + accessories ${$(acc)} + online/subscriptions ${$(sub)}/yr + ${f(games)} games × ${$(gp)}/yr + power ${$(power)}/yr − resale ${$(res)}`, note: "Games are usually the biggest cost — buying on sale or using a subscription library changes the total a lot" };
};
// ---- Gold, silver & jewelry ----
export const palladium: Calc = (v) => {
  const w = P(v, "w", 10, "Weight"), u = pick(v.u, 3), pur = Math.min(100, P(v, "p", 95, "Purity")) / 100, spot = P(v, "s", 1000, "Spot price per troy oz"), pay = Math.min(100, Z(v, "b", 80)) / 100;
  const oz = u === 0 ? w / 31.1035 : u === 1 ? w : w / 20, val = oz * pur * spot;
  return { m: `Melt value ≈ ${$2(val)}`, b: `Typical buyer offer ${$2(val * pay)} (${pc(pay)} of melt)`, note: `${f(oz * pur)} troy oz of pure palladium (${pc(pur, 1)} purity, e.g. Pd950) · enter today's spot price — it moves daily` };
};
export const tola: Calc = (v) => {
  const t = P(v, "t", 1, "Tolas"), price = P(v, "p", 130, "Gold price per gram (24K)"), k = Math.min(24, P(v, "k", 22, "Karat")), bh = pick(v.b, 2) === 1, making = Z(v, "m", 0) / 100;
  const g = t * (bh ? 10 : 11.6638), val = g * price * (k / 24);
  return { v: `${f(t)} tola = ${f(g)} g → ${$2(val)} for ${f(k)}K gold`, m: making ? `With ${pc(making)} making charges: ${$2(val * (1 + making))}` : `${f(g / 31.1035)} troy oz`, note: `${bh ? "10 g 'bhori/tola' as used in some markets" : "1 traditional tola = 11.6638 g (180 grains)"} · ${f(k)}K = ${pc(k / 24, 1)} gold · enter local price per gram in your currency` };
};
export const labVsNatural: Calc = (v) => {
  const ct = P(v, "c", 1.5, "Carat"), nat = P(v, "n", 9000, "Natural price per carat"), lab = P(v, "l", 1200, "Lab price per carat"), resN = Z(v, "r", 40) / 100, resL = Z(v, "x", 5) / 100;
  const pn = ct * nat, pl = ct * lab;
  return { c: `Natural ${$(pn)} vs lab-grown ${$(pl)} — lab saves ${$(pn - pl)} (${pc(1 - pl / pn)})`, r: `Estimated resale: natural ${$(pn * resN)} · lab ${$(pl * resL)}`, note: "Lab diamonds are chemically identical but prices keep falling and resale is minimal · compare same cut, colour and clarity grades (IGI/GIA reports)" };
};
export const jewelryResale: Calc = (v) => {
  const g = Z(v, "g", 10), k = Math.min(24, Z(v, "k", 14)), price = Z(v, "p", 130), stone = Z(v, "s", 0), brand = Z(v, "b", 0), ch = pick(v.c, 3);
  const melt = g * price * (k / 24), pay = [0.7, 0.85, 0.95][ch] * melt + stone * [0.2, 0.3, 0.5][ch] + brand;
  return { r: `Expect ≈ ${$(pay)}`, m: `Gold melt value ${$(melt)} (${f(g)} g of ${f(k)}K)${stone ? ` + stones (retail ${$(stone)}) at ${pc([0.2, 0.3, 0.5][ch])}` : ""}${brand ? ` + designer premium ${$(brand)}` : ""}`, note: `${["Pawn shop / cash-for-gold", "Local jeweller / refiner", "Consignment / auction / private sale"][ch]} channel · most jewellery resells for far less than retail — designer pieces (Cartier, Tiffany) hold value better` };
};
export const wireLen: Calc = (v) => {
  const t = pick(v.t, 3), size = P(v, "s", 7, "Finished size"), wraps = Math.max(1, num(v.w, 1)), ends = Z(v, "e", 3), n = Math.max(1, num(v.n, 1));
  const per = size * wraps + ends + (t === 2 ? 2 : 0), tot = per * n;
  return { l: `Cut about ${f(per)} in per piece (${f(per * 2.54)} cm) — ${f(tot)} in for ${f(n)}`, d: `${["Bracelet", "Necklace", "Wire-wrapped ring/pendant"][t]} ${f(size)} in × ${f(wraps)} wrap${wraps > 1 ? "s" : ""} + ${f(ends)} in for crimps/loops`, note: "Bracelets: wrist + ½–1 in for ease · beading wire for stringing, dead-soft wire for wrapping · buy 10–15% extra for mistakes" };
};
// ---- Lifestyle, party & wedding ----
export const seating: Calc = (v) => {
  const g = P(v, "g", 150, "Guests"), size = pick(v.s, 4), per = [8, 10, 12, 6][size], head = Z(v, "h", 10), kids = Z(v, "k", 0), sweet = pick(v.w, 2) === 1;
  const seated = g - (sweet ? 2 : head), tables = Math.ceil((seated + kids) / per);
  return { t: `${tables} guest tables of ${per} + ${sweet ? "a sweetheart table" : `a head table for ${f(head)}`}`, d: `${f(seated + kids)} seats at ${["60-in rounds (8)", "72-in rounds (10)", "72-in rounds (12, tight)", "6-ft rectangles (6)"][size]} · ${tables * per - seated - kids} spare seats`, note: "Room size rule of thumb: ~10–12 sq ft per guest for banquet seating, plus dance floor and buffet space" };
};
export const weddingTimeline: Calc = (v) => {
  const h = num(v.h, 16), m = num(v.m, 0), cer = Z(v, "c", 30), gap = Z(v, "g", 60), din = Z(v, "d", 90), dance = Z(v, "x", 180), hair = Z(v, "a", 3), photos = pick(v.f, 2) === 0;
  const t0 = h * 60 + m, fmtT = (x: number) => { const hh = Math.floor((((x % 1440) + 1440) % 1440) / 60), mm = (((x % 60) + 60) % 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a.m." : "p.m."}`; };
  const steps: [number, string][] = [[t0 - hair * 60 - (photos ? 90 : 30), "hair & makeup start"], ...(photos ? [[t0 - 90, "first look & portraits"] as [number, string]] : []), [t0 - 30, "guests arrive"], [t0, "ceremony"], [t0 + cer, "cocktail hour"], [t0 + cer + gap, "reception & dinner"], [t0 + cer + gap + din, "toasts, cake, dancing"], [t0 + cer + gap + din + dance, "send-off"]];
  return { s: steps.map(([t, n]) => `${fmtT(t)} ${n}`).join(" · "), e: `Event ends ≈ ${fmtT(t0 + cer + gap + din + dance)} · ${f((cer + gap + din + dance) / 60)} hours from ceremony to send-off`, note: "Add 15-minute buffers between big moments · check sunset time for golden-hour photos and vendor hour limits" };
};
export const invitations: Calc = (v) => {
  const g = P(v, "g", 150, "Guests"), cpl = Math.min(100, Z(v, "c", 70)) / 100, extra = Z(v, "x", 10) / 100, cost = Z(v, "p", 4), post = Z(v, "s", 0.78);
  const households = Math.ceil(g * cpl / 2 + g * (1 - cpl)), order = Math.ceil(households * (1 + extra) / 25) * 25;
  return { i: `Order ≈ ${order} invitations (${households} households)`, c: `Printing ${$(order * cost)} + postage ${$(households * post)} = ${$(order * cost + households * post)}`, note: `${pc(cpl)} of guests come as couples (one invite each) · ${pc(extra)} extra for keepsakes, mistakes and late additions · square or heavy invitations need extra postage — weigh one first` };
};
export const bridesmaid: Calc = (v) => {
  const items: [string, number][] = [["dress", Z(v, "a", 180)], ["alterations", Z(v, "b", 60)], ["shoes & accessories", Z(v, "c", 80)], ["hair & makeup", Z(v, "d", 150)], ["bachelorette", Z(v, "e", 400)], ["shower gift + share", Z(v, "f", 60)], ["wedding gift", Z(v, "g", 100)], ["travel & lodging", Z(v, "h", 300)]];
  const tot = items.reduce((s, [, x]) => s + x, 0);
  return { t: `Being a bridesmaid ≈ ${$(tot)}`, d: items.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · "), note: "Surveys often put the total at $1,000–$2,000 · it's fine to talk budget with the couple early and skip what you can't afford" };
};
export const weddingGift: Calc = (v) => {
  const rel = pick(v.r, 4), plus = pick(v.p, 2) === 1, travel = Z(v, "t", 0), base = [75, 100, 150, 250][rel], dest = travel > 300;
  const amt = base * (plus ? 1.6 : 1) * (dest ? 0.7 : 1);
  return { g: `About ${$(Math.round(amt / 25) * 25)}`, d: `${["Coworker / acquaintance", "Friend", "Close friend", "Close family"][rel]}${plus ? " · with a guest" : ""}${dest ? ` · reduced since you're spending ${$(travel)} to attend` : ""}`, note: "Common US guidance: $50–$100 acquaintances, $100–$150 friends, $150–$250+ close friends and family · give what fits your budget — a heartfelt card counts" };
};
export const balloons: Calc = (v) => {
  const g = Z(v, "g", 30), area = Z(v, "a", 500), style = pick(v.s, 3), ceil = pick(v.c, 2) === 0;
  const n = Math.ceil(Math.max(g * [1, 2, 3][style], area / [50, 25, 12][style]) + (ceil ? area / 20 : 0));
  return { b: `About ${n} balloons`, d: `${["Light accents", "Festive", "Full balloon décor"][style]} for ${f(g)} guests in ${f(area)} sq ft${ceil ? " incl. ceiling balloons" : ""}`, note: "11-inch latex balloons hold ~0.5 cu ft of helium and float 8–12 hours (much longer with Hi-Float) · foil balloons float for days" };
};
export const balloonArch: Calc = (v) => {
  const L = P(v, "l", 12, "Arch/garland length (ft)"), dens = pick(v.d, 3), sizes = pick(v.s, 2) === 0;
  const per = [12, 15, 20][dens], n = Math.ceil(L * per);
  return { b: `≈ ${n} balloons for a ${f(L)} ft arch/garland`, m: sizes ? `Mix: ${Math.ceil(n * 0.55)} × 11 in, ${Math.ceil(n * 0.3)} × 5 in, ${Math.ceil(n * 0.15)} × 16–18 in` : `${n} × 11 in`, note: `${["Light", "Standard", "Full/organic"][dens]} density ≈ ${per} balloons per foot · a door-sized arch is ~12–15 ft of garland · air-filled arches last days, helium ones hours` };
};
export const favors: Calc = (v) => {
  const g = P(v, "g", 120, "Guests"), cpl = pick(v.c, 2) === 0, rate = Math.min(100, Z(v, "r", 85)) / 100, extra = Z(v, "x", 5) / 100, cost = Z(v, "p", 3);
  const attend = g * rate, n = Math.ceil((cpl ? attend * 0.6 : attend) * (1 + extra));
  return { f: `Make ≈ ${n} favours`, c: `${$2(n * cost)} at ${$2(cost)} each`, note: `${pc(rate)} expected attendance${cpl ? ", one favour per couple/household for ~40% of guests" : ", one per guest"} + ${pc(extra)} extra · edible favours (cookies, chocolates) get taken most` };
};
export const xmasTree: Calc = (v) => {
  const c = P(v, "c", 8, "Ceiling height (ft)"), stand = Z(v, "s", 6), topper = Z(v, "t", 6), room = Z(v, "w", 0);
  const h = c - (stand + topper) / 12, w = h * 0.78;
  return { h: `Tree up to ${f(Math.floor(h * 2) / 2)} ft tall`, w: `About ${f(w)} ft (${f(w * 12)} in) wide — needs a ${f(w + 1)} ft circle of floor${room ? ` (${room >= w + 1 ? "fits" : "too wide for"} your ${f(room)} ft space)` : ""}`, note: `Ceiling ${f(c)} ft − ${f(stand)} in stand − ${f(topper)} in topper · slim trees are ~60% of height wide · lights: ~100 per foot of height for a full look` };
};
export const giftWrap: Calc = (v) => {
  const L = P(v, "l", 12, "Box length"), W = P(v, "w", 10, "Box width"), H = P(v, "h", 4, "Box height"), n = Math.max(1, num(v.n, 1)), roll = Z(v, "r", 30);
  const len = 2 * (W + H) + 2, wid = L + 2 * H * 0.75 + 1, area = (len * wid) / 144;
  return { p: `Cut ${f(len)} × ${f(wid)} in per box`, a: `${f(area)} sq ft each · ${f(area * n)} sq ft for ${f(n)} box${n > 1 ? "es" : ""}${roll ? ` ≈ ${f((area * n) / roll)} rolls of ${f(roll)} sq ft` : ""}`, note: "Paper must wrap around the box (2 × (width + height)) plus overlap, and cover ¾ of the height at each end · add ribbon: 2 × (L + W) + 2 × (W + H) + 20 in for a bow" };
};
export const secretSanta: Calc = (v) => {
  const n = Math.max(3, Math.round(num(v.n, 10))), lim = P(v, "l", 25, "Spending limit"), ship = Z(v, "s", 0), wrap = Z(v, "w", 3), org = Z(v, "o", 0);
  const each = lim + ship + wrap, tot = each * n + org;
  return { e: `Each person spends ≈ ${$(each)}`, t: `Group total ≈ ${$(tot)} for ${n} people`, note: `Gift limit ${$(lim)}${ship ? ` + shipping ${$(ship)}` : ""} + wrapping ${$(wrap)} · $20–$30 is a common office limit · draw names with an online tool so nobody draws themselves` };
};
export const giftBudget: Calc = (v) => {
  const rows: [string, number, number][] = [["kids", Z(v, "a", 2), Z(v, "b", 40)], ["family", Z(v, "c", 4), Z(v, "d", 30)], ["friends", Z(v, "e", 3), Z(v, "f", 25)], ["coworkers", Z(v, "g", 0), Z(v, "h", 15)]], party = Z(v, "x", 0);
  const tot = rows.reduce((s, [, n, a]) => s + n * a, 0) + party;
  return { t: `≈ ${$(tot)} a year on birthday gifts`, d: rows.filter(([, n]) => n).map(([nm, n, a]) => `${nm} ${f(n)} × ${$(a)}`).join(" · ") + (party ? ` · party gifts ${$(party)}` : ""), note: `That's ${$(tot / 12)} a month — put it in a sinking fund · kids' party gifts are often $20–$30` };
};
export const registry: Calc = (v) => {
  const items: [string, number][] = [["car seat", Z(v, "a", 250)], ["stroller", Z(v, "b", 300)], ["crib & mattress", Z(v, "c", 400)], ["nursery furniture", Z(v, "d", 300)], ["monitor", Z(v, "e", 120)], ["feeding (pump, bottles)", Z(v, "f", 250)], ["clothes & swaddles", Z(v, "g", 200)], ["diapers & wipes (first months)", Z(v, "h", 300)], ["carrier, bath, misc.", Z(v, "i", 250)]], given = Math.min(100, Z(v, "x", 60)) / 100;
  const tot = items.reduce((s, [, x]) => s + x, 0);
  return { t: `Registry total ≈ ${$(tot)}`, d: `Expect gifts to cover ~${pc(given)} (${$(tot * given)}), leaving ${$(tot * (1 - given))} for you · ${items.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · ")}`, note: "Put big items (car seat, stroller) on for group gifting · most registries give a 10–15% completion discount on what's left" };
};

// ---- registry (generated)
export const ideaShop1CustomCalculators: Record<string, Calc> = {
  "necklace-length-calculator": necklace,
  "baby-clothes-size-calculator": babySize,
  "underwear-size-men-calculator": underwear,
  "helmet-size-calculator": helmet,
  "buy-two-get-one-free-price-calculator": b2g1,
  "price-comparison-two-items-calculator": compareTwo,
  "coupon-stacking-calculator": couponStack,
  "tip-by-country-calculator": tipCountry,
  "hotel-housekeeping-tip-calculator": housekeeping,
  "wedding-vendor-tip-calculator": weddingTips,
  "tour-guide-tip-calculator": tourGuide,
  "holiday-tip-guide-calculator": holidayTips,
  "valet-tip-calculator": valet,
  "tv-energy-cost-calculator": tvCost,
  "refrigerator-energy-cost-calculator": fridgeCost,
  "phone-charging-cost-calculator": phoneCharge,
  "phone-battery-health-calculator": batteryHealth,
  "smartphone-upgrade-worth-it-calculator": upgrade,
  "smart-plug-savings-calculator": smartPlug,
  "extension-cord-gauge-calculator": cordGauge,
  "surge-protector-joules-calculator": surge,
  "printer-ink-cost-per-page-calculator": inkCost,
  "home-wifi-mesh-nodes-calculator": mesh,
  "smart-home-device-power-calculator": smartHome,
  "e-reader-vs-books-cost-calculator": ereader,
  "console-lifetime-cost-calculator": consoleCost,
  "palladium-value-calculator": palladium,
  "tola-gold-price-calculator": tola,
  "lab-grown-vs-natural-diamond-calculator": labVsNatural,
  "jewelry-resale-value-calculator": jewelryResale,
  "jewelry-making-wire-length-calculator": wireLen,
  "wedding-seating-tables-calculator": seating,
  "wedding-timeline-calculator": weddingTimeline,
  "wedding-invitation-count-calculator": invitations,
  "bridesmaid-cost-calculator": bridesmaid,
  "wedding-gift-amount-calculator": weddingGift,
  "party-balloon-count-calculator": balloons,
  "balloon-arch-balloons-calculator": balloonArch,
  "party-favor-count-calculator": favors,
  "christmas-tree-size-calculator": xmasTree,
  "gift-wrap-paper-amount-calculator": giftWrap,
  "secret-santa-budget-calculator": secretSanta,
  "birthday-gift-budget-calculator": giftBudget,
  "baby-registry-budget-calculator": registry,
};
