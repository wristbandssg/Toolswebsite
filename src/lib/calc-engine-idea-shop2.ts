/**
 * Idea build, batch shop2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Shopping > Pricing, Markup & Seller Fees (10),
 * Sales Tax, VAT & Import (9), Shipping & Moving (5), Vehicle Resale & Collectibles (2) = 26 tools.
 * Fees (US, editable): eBay final value fee 13.6% of the total sale for most categories (up to $7,500, 2.35% above) + $0.30 per order
 * ($0.40 over $10); Amazon referral fees 15% most categories (min $0.30), 8% consumer electronics/PCs, clothing 5%/10%/17% by price
 * band, jewelry 20% to $250 then 5%; Venmo business 1.9% + $0.10 (personal goods & services 2.99%); Reverb 5% selling + 3.19% + $0.49
 * processing; Gumroad 10% + $0.50 per sale. VAT rates 2026: Germany 19/7, France 20/10/5.5/2.1, Ireland 23/13.5/9/0, Netherlands 21/9/0,
 * Spain 21/10/4, Italy 22/10/5/4, Mexico IVA 16 (8 border region, 0), Japan consumption tax 10 (8 food & newspapers).
 * Moving rules of thumb: ~1,000 lb per furnished room; boxes by home size (studio ~30, 1-bed ~45, 2-bed ~70, 3-bed ~100, 4-bed ~130).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));

// ---- Pricing, markup & seller fees ----
export const keystone: Calc = (v) => {
  const c = P(v, "c", 25, "Cost"), m = pick(v.m, 3), plus = Z(v, "p", 5), price = m === 0 ? c * 2 : m === 1 ? c * 2 + plus : c * 2.5;
  return { p: `Retail price ${$2(price)}`, m: `Markup ${pc(price / c - 1, 0)} · gross margin ${pc(1 - c / price, 0)} · profit ${$2(price - c)} per unit`, note: `${["Keystone: double the wholesale cost (100% markup, 50% margin)", `Keystone plus: double the cost + ${$2(plus)}`, "Triple keystone-lite: 2.5× cost"][m]} · common in apparel, gifts and jewellery; check what competitors charge` };
};
export const charm: Calc = (v) => {
  const p0 = P(v, "p", 50, "Target price"), style = pick(v.s, 3), thr = p0 >= 100 ? 10 : 1;
  const charmP = style === 0 ? (p0 % 1 === 0 ? p0 - 0.01 : Math.floor(p0) + 0.99) : style === 1 ? Math.ceil(p0) - 0.05 : Math.max(0, Math.ceil(p0 / thr) * thr - (thr === 10 ? 1 : 0.01));
  return { p: `Try ${$2(charmP)}`, d: `${["Charm price ending in .99", "Price ending in .95", "Just under the next round number"][style]} · reads as ${$(Math.floor(charmP))}-something instead of ${$(p0)}`, note: "Charm prices (.99) signal value; round prices ($50) signal quality and work for luxury and gifts · A/B test where you can" };
};
export const priceImpact: Calc = (v) => {
  const pr = P(v, "p", 40, "Price"), c = Z(v, "c", 24), q = P(v, "q", 1000, "Units sold"), ch = num(v.x, 10) / 100, e = num(v.e, -1.2);
  const np = pr * (1 + ch), nq = Math.max(0, q * (1 + e * ch)), prof0 = (pr - c) * q, prof1 = (np - c) * nq, be = ch / ((pr - c) / pr + ch);
  return { r: `Profit ${prof1 >= prof0 ? "rises" : "falls"} ${$(Math.abs(prof1 - prof0))} (${$(prof0)} → ${$(prof1)})`, d: `Price ${$2(np)} · units ${f(nq)} (${pc(nq / q - 1, 1)}) · revenue ${$(pr * q)} → ${$(np * nq)}`, note: `Break-even: you can lose up to ${pc(be, 1)} of unit sales from a ${pc(ch, 0)} price rise before profit falls · elasticity ${f(e)} (−1 = sales drop 1% per 1% price rise)` };
};
export const ebayFee: Calc = (v) => {
  const s = P(v, "s", 60, "Sale price"), sh = Z(v, "h", 8), tax = Z(v, "t", 7) / 100, rate = Z(v, "r", 13.6) / 100, prom = Z(v, "a", 0) / 100, cost = Z(v, "c", 0), ship = Z(v, "x", 8);
  const total = (s + sh) * (1 + tax), fvf = Math.min(total, 7500) * rate + Math.max(0, total - 7500) * 0.0235, per = total > 10 ? 0.4 : 0.3, promo = s * prom, fees = fvf + per + promo, net = s + sh - fees - ship - cost;
  return { f: `eBay fees ${$2(fees)} (${pc(fees / (s + sh), 1)} of item + shipping)`, n: `You net ${$2(net)} after ${$2(ship)} postage${cost ? ` and ${$2(cost)} item cost` : ""}`, note: `Final value fee ${pc(rate, 2)} of the total incl. shipping and sales tax (${$2(total)}) + ${$2(per)} per order${prom ? ` + promoted listing ${pc(prom, 1)}` : ""} · rates vary by category; check eBay's fee page` };
};
export const amazonRef: Calc = (v) => {
  const p0 = P(v, "p", 25, "Item price"), cat = pick(v.c, 5), fba = Z(v, "f", 0), cost = Z(v, "x", 0);
  let ref: number;
  if (cat === 0) ref = p0 * 0.15; else if (cat === 1) ref = p0 * 0.08; else if (cat === 2) ref = p0 * (p0 <= 15 ? 0.05 : p0 <= 20 ? 0.1 : 0.17); else if (cat === 3) ref = Math.min(p0, 250) * 0.2 + Math.max(0, p0 - 250) * 0.05; else ref = p0 * 0.15 + 1.8;
  ref = Math.max(ref, cat === 4 ? 0 : 0.3);
  return { f: `Referral fee ${$2(ref)} (${pc(ref / p0, 1)})`, n: `You keep ${$2(p0 - ref - fba - cost)}${fba ? ` after ${$2(fba)} FBA fee` : ""}${cost ? ` and ${$2(cost)} product cost` : ""}`, note: `${["Most categories 15%", "Consumer electronics / PCs 8%", "Clothing: 5% to $15, 10% $15–$20, 17% over $20", "Jewelry: 20% up to $250, 5% above", "Books/media: 15% + $1.80 closing fee"][cat]} · $0.30 minimum per item · check Seller Central for your category` };
};
export const venmo: Calc = (v) => {
  const a = P(v, "a", 100, "Payment"), t = pick(v.t, 2), inst = pick(v.i, 2) === 1;
  const fee = t === 0 ? a * 0.019 + 0.1 : a * 0.0299, out = inst ? Math.min(25, Math.max(0.25, (a - fee) * 0.0175)) : 0;
  return { f: `Fee ${$2(fee)} → you receive ${$2(a - fee)}`, i: inst ? `Instant transfer costs ${$2(out)} more (1.75%, $0.25–$25) → ${$2(a - fee - out)} in your bank` : "Standard bank transfer is free (1–3 business days)", note: `${t === 0 ? "Venmo business profile: 1.9% + $0.10 per payment" : "Personal account goods & services: 2.99%"} · friends-and-family payments are free but have no purchase protection` };
};
export const reverb: Calc = (v) => {
  const s = P(v, "s", 500, "Sale price"), sh = Z(v, "h", 30), sell = Z(v, "r", 5) / 100, proc = Z(v, "p", 3.19) / 100, fix = Z(v, "x", 0.49), lab = Z(v, "l", 30), bump = Z(v, "b", 0) / 100;
  const sf = (s + sh) * sell, pf = (s + sh) * proc + fix, bf = s * bump, net = s + sh - sf - pf - bf - lab;
  return { f: `Reverb fees ${$2(sf + pf + bf)}`, n: `You net ${$2(net)} after ${$2(lab)} shipping label`, note: `Selling fee ${pc(sell, 1)} (max $500) + payment processing ${pc(proc, 2)} + ${$2(fix)}${bump ? ` + Bump ${pc(bump, 1)}` : ""} · US rates; local pickup avoids the shipping label` };
};
export const gumroad: Calc = (v) => {
  const p0 = P(v, "p", 29, "Price"), n = Math.max(1, num(v.n, 100)), disc = pick(v.d, 2) === 1, tax = Z(v, "t", 0) / 100;
  const fee = disc ? p0 * 0.3 : p0 * 0.1 + 0.5, net = p0 - fee;
  return { f: `Fee ${$2(fee)} per sale → you keep ${$2(net)} (${pc(net / p0, 1)})`, t: `${f(n)} sales: ${$(net * n)} net from ${$(p0 * n)}`, note: `${disc ? "Sales through Gumroad Discover: 30% flat" : "Direct sales: 10% + $0.50"} (includes payment processing) · Gumroad collects and remits sales tax/VAT where required${tax ? ` (${pc(tax, 0)} on top for buyers)` : ""}` };
};
export const consignment: Calc = (v) => {
  const s = P(v, "s", 200, "Sale price"), split = Math.min(100, Z(v, "c", 60)) / 100, fee = Z(v, "f", 0), mark = Z(v, "m", 0) / 100, wk = Z(v, "w", 0);
  const sold = s * (1 - mark), you = sold * split - fee;
  return { y: `You get ${$2(you)} (${pc(split, 0)} share)`, s: `Store keeps ${$2(sold - you)}${mark ? ` · sold at ${pc(mark, 0)} markdown (${$2(sold)})` : ""}${fee ? ` · minus ${$2(fee)} fees` : ""}`, note: `Common splits: 40–60% to you for clothing, 60–80% for furniture and high-value items${wk ? ` · after ${f(wk)} days unsold items are often marked down or donated` : ""} · read the contract before you drop off` };
};
export const craftPrice: Calc = (v) => {
  const mat = Z(v, "m", 8), hrs = Z(v, "h", 1.5), rate = Z(v, "r", 20), oh = Z(v, "o", 10) / 100, fees = Z(v, "f", 10) / 100;
  const base = (mat + hrs * rate) * (1 + oh), wholesale = base * 2, retail = wholesale * 2, net = retail * (1 - fees) - base;
  return { p: `Retail ${$2(retail)} · wholesale ${$2(wholesale)}`, c: `Cost ${$2(base)} (materials ${$2(mat)} + ${f(hrs)} h × ${$2(rate)} + ${pc(oh, 0)} overhead)`, note: `Selling direct at retail earns ${$2(net)} profit after ${pc(fees, 0)} marketplace/payment fees · formula: (materials + labour) × 2 = wholesale, × 2 = retail — adjust to what your market pays` };
};
// ---- Sales tax, VAT & import ----
const vat = (country: string, rates: [string, number][], cur: string, sym: string, word = "VAT"): Calc => (v) => {
  const a = P(v, "a", 100, "Amount"), r = rates[pick(v.r, rates.length)], mode = pick(v.m, 2), rate = r[1];
  const net = mode === 0 ? a : a / (1 + rate), gross = mode === 0 ? a * (1 + rate) : a, tax = gross - net;
  return { t: `${word} ${money(tax, sym, 2)} at ${pc(rate, Math.round(rate * 1000) % 10 ? 1 : 0)}`, a: `Net ${money(net, sym, 2)} · gross ${money(gross, sym, 2)} (${cur})`, note: `${country} ${word} rates: ${rates.map(([n, x]) => `${n} ${pc(x, Math.round(x * 1000) % 10 ? 1 : 0)}`).join(" · ")} · ${mode === 0 ? "added to a net price" : "removed from a gross price"} — check which rate applies to your goods or service` };
};
export const deVat = vat("Germany", [["standard", 0.19], ["reduced (food, books, restaurant food from 2026, transport)", 0.07], ["zero (solar panels)", 0]], "EUR", "€", "MwSt");
export const frVat = vat("France", [["standard", 0.2], ["intermediate (restaurants, transport, renovation)", 0.1], ["reduced (food, energy, books)", 0.055], ["super-reduced (medicines, press)", 0.021]], "EUR", "€", "TVA");
export const ieVat = vat("Ireland", [["standard", 0.23], ["reduced (energy, construction, services)", 0.135], ["second reduced (newspapers, sports facilities)", 0.09], ["zero (most food, children's clothes)", 0]], "EUR", "€");
export const nlVat = vat("Netherlands", [["standard", 0.21], ["reduced (food, books, medicines)", 0.09], ["zero (exports)", 0]], "EUR", "€", "BTW");
export const esVat = vat("Spain", [["standard", 0.21], ["reduced (hospitality, transport)", 0.1], ["super-reduced (bread, milk, books, medicines)", 0.04]], "EUR", "€", "IVA");
export const itVat = vat("Italy", [["standard", 0.22], ["reduced (restaurants, some food, energy)", 0.1], ["reduced (some social services, herbs)", 0.05], ["super-reduced (basic food, books, newspapers)", 0.04]], "EUR", "€", "IVA");
export const mxVat = vat("Mexico", [["general", 0.16], ["northern/southern border region", 0.08], ["zero (most food, medicines)", 0]], "MXN", "$", "IVA");
export const jpVat = vat("Japan", [["standard", 0.1], ["reduced (food & non-alcoholic drinks for takeaway, newspapers)", 0.08]], "JPY", "¥", "consumption tax");
export const taxHoliday: Calc = (v) => {
  const items: [string, number, number][] = [["clothing & shoes", Z(v, "a", 300), Z(v, "b", 100)], ["school supplies", Z(v, "c", 80), Z(v, "d", 50)], ["computers", Z(v, "e", 900), Z(v, "f", 1500)], ["other eligible items", Z(v, "g", 0), Z(v, "h", 0)]], rate = Z(v, "r", 7) / 100;
  const elig = items.reduce((s, [, x]) => s + x, 0), tot = elig;
  return { s: `Save ≈ ${$2(elig * rate)} in sales tax`, d: `${$(elig)} of eligible purchases × ${pc(rate, 2)} · ${items.filter(([, x]) => x).map(([n, x, c]) => `${n} ${$(x)}${c ? ` (per-item cap ${$(c)})` : ""}`).join(" · ")}`, note: `Only items under each per-item price cap qualify — enter the spend on qualifying items · total shopping ${$(tot)} · dates and caps vary by state (often early August)` };
};
// ---- Shipping & moving ----
const HOME: [string, number, number][] = [["Studio", 30, 1], ["1 bedroom", 45, 2], ["2 bedrooms", 70, 3], ["3 bedrooms", 100, 5], ["4 bedrooms", 130, 7], ["5+ bedrooms", 160, 9]];
export const boxes: Calc = (v) => {
  const h = HOME[pick(v.h, HOME.length)], pack = pick(v.p, 3), base = h[1] * [0.8, 1, 1.3][pack];
  const sm = Math.round(base * 0.35), md = Math.round(base * 0.4), lg = Math.round(base * 0.2), wd = Math.max(1, Math.round(base * 0.05));
  return { b: `≈ ${sm + md + lg + wd} boxes`, m: `${sm} small (books, kitchen heavy) · ${md} medium · ${lg} large (bedding, light) · ${wd} wardrobe`, note: `${h[0]}, ${["minimalist", "average", "lots of stuff"][pack]} household · add packing tape (1 roll per 15–20 boxes), paper and markers · free boxes from stores and Buy Nothing groups` };
};
export const moversHourly: Calc = (v) => {
  const m = Math.max(1, num(v.m, 3)), rate = P(v, "r", 55, "Rate per mover per hour"), hrs = P(v, "h", 6, "Hours"), truck = Z(v, "t", 100), travel = Z(v, "x", 1), mn = Z(v, "n", 2), tip = Z(v, "p", 0) / 100, mat = Z(v, "a", 0);
  const billed = Math.max(mn, hrs + travel), labor = m * rate * billed, tot = (labor + truck + mat) * (1 + tip);
  return { c: `≈ ${$(tot)} total`, d: `${f(m)} movers × ${$(rate)}/h × ${f(billed)} billed hours = ${$(labor)} + truck/fuel ${$(truck)}${mat ? ` + materials ${$(mat)}` : ""}${tip ? ` + ${pc(tip, 0)} tip` : ""}`, note: `Includes ${f(travel)} h travel time (many movers bill it) and a ${f(mn)} h minimum · rough time: 1-bed 3–5 h, 2-bed 5–7 h, 3-bed 7–10 h with 3 movers` };
};
export const piano: Calc = (v) => {
  const t = pick(v.t, 4), base = [250, 400, 600, 1000][t], mi = Z(v, "m", 10), stairs = Z(v, "s", 0), per = Z(v, "x", 75), long = mi > 50 ? (mi - 50) * 1.5 : 0, tune = pick(v.u, 2) === 0 ? 150 : 0;
  const tot = base + stairs * per + long + tune;
  return { c: `≈ ${$(tot)}`, d: `${["Spinet/console", "Upright", "Baby grand", "Grand / concert grand"][t]} base ${$(base)} + ${f(stairs)} flights × ${$(per)}${long ? ` + long-distance ${$(long)}` : ""}${tune ? ` + tuning after the move ${$(tune)}` : ""}`, note: "Rough US local prices — use a specialist piano mover with proper insurance · let the piano settle 2–3 weeks before tuning" };
};
export const moveWeight: Calc = (v) => {
  const rooms = P(v, "r", 5, "Furnished rooms"), lbs = Z(v, "l", 1000), extra = Z(v, "x", 0), garage = pick(v.g, 2) === 0 ? 1000 : 0, rate = Z(v, "p", 0);
  const w = rooms * lbs + garage + extra, cuft = w / 7;
  return { w: `≈ ${f(Math.round(w / 100) * 100)} lb (${f(w * 0.4536)} kg)`, v: `≈ ${f(cuft)} cubic feet · ${cuft <= 450 ? "10–12 ft" : cuft <= 800 ? "15–16 ft" : cuft <= 1100 ? "20 ft" : "26 ft"} truck`, note: `${f(rooms)} rooms × ${f(lbs)} lb${garage ? " + garage 1,000 lb" : ""}${extra ? ` + ${f(extra)} lb extras` : ""} · rule of thumb ~1,000 lb per furnished room, ~7 lb per cubic foot${rate ? ` · at ${$2(rate)}/lb ≈ ${$(w * rate)}` : ""}` };
};
export const packTime: Calc = (v) => {
  const b = P(v, "b", 70, "Boxes"), ppl = Math.max(1, num(v.p, 2)), per = P(v, "r", 4, "Boxes per hour per person"), hpd = Z(v, "h", 3), fragile = Z(v, "f", 15) / 100;
  const hrs = (b * (1 + fragile)) / (per * ppl), days = hpd ? hrs / hpd : 0;
  return { t: `≈ ${f(hrs)} hours of packing (${f(hrs * ppl)} person-hours)`, d: days ? `${f(Math.ceil(days))} days at ${f(hpd)} h a day — start ${f(Math.ceil(days) + 2)} days before moving day` : `${f(ppl)} people at ${f(per)} boxes/hour`, note: `+${pc(fragile, 0)} for fragile kitchen and décor items · pack rarely-used rooms first and leave an essentials box for day one` };
};
// ---- Collectibles ----
export const grading: Calc = (v) => {
  const raw = P(v, "r", 60, "Raw card value"), g10 = Z(v, "a", 300), g9 = Z(v, "b", 120), g8 = Z(v, "c", 70), p10 = Math.min(100, Z(v, "x", 20)) / 100, p9 = Math.min(100, Z(v, "y", 50)) / 100, fee = Z(v, "f", 25), ship = Z(v, "s", 10), sell = Z(v, "p", 13) / 100;
  const p8 = Math.max(0, 1 - p10 - p9), ev = (p10 * g10 + p9 * g9 + p8 * g8) * (1 - sell) - fee - ship, rawNet = raw * (1 - sell);
  return { r: ev > rawNet ? `Grade it — expected net ${$2(ev)} vs ${$2(rawNet)} raw` : `Sell raw — grading expected net ${$2(ev)} vs ${$2(rawNet)}`, d: `Chances: 10 ${pc(p10, 0)} · 9 ${pc(p9, 0)} · 8 or lower ${pc(p8, 0)} · fees ${$2(fee + ship)} · ${pc(sell, 0)} selling fees`, note: "Look at recent sold prices for each grade and be honest about centring, corners and surface · grading tiers and turnaround times change — check current fees" };
};
export const collectGrowth: Calc = (v) => {
  const buy = P(v, "b", 500, "Purchase price"), now = P(v, "n", 1200, "Current value"), y = P(v, "y", 6, "Years held"), fees = Z(v, "f", 15) / 100, store = Z(v, "s", 0), inf = Z(v, "i", 3) / 100;
  const cagr = (now / buy) ** (1 / y) - 1, net = now * (1 - fees) - store * y, ncagr = net > 0 ? (net / buy) ** (1 / y) - 1 : -1;
  return { g: `${pc(cagr, 1)} a year appreciation (${f(now / buy)}× in ${f(y)} years)`, n: `After ${pc(fees, 0)} selling fees${store ? ` and ${$(store)}/yr storage/insurance` : ""}: ${pc(ncagr, 1)} a year (${$(net)} net)`, note: `Real return after ${pc(inf, 1)} inflation ≈ ${pc((1 + ncagr) / (1 + inf) - 1, 1)} a year · collectibles are illiquid and US long-term gains on them can be taxed at up to 28%` };
};

// ---- registry (generated)
export const ideaShop2CustomCalculators: Record<string, Calc> = {
  "keystone-pricing-calculator": keystone,
  "psychological-pricing-calculator": charm,
  "price-increase-impact-on-sales-calculator": priceImpact,
  "ebay-fees-calculator": ebayFee,
  "amazon-referral-fee-calculator": amazonRef,
  "venmo-business-fee-calculator": venmo,
  "reverb-fees-calculator": reverb,
  "gumroad-fees-calculator": gumroad,
  "consignment-split-calculator": consignment,
  "craft-pricing-formula-calculator": craftPrice,
  "sales-tax-holiday-savings-calculator": taxHoliday,
  "moving-boxes-needed-calculator": boxes,
  "movers-hourly-cost-calculator": moversHourly,
  "piano-moving-cost-calculator": piano,
  "moving-weight-estimate-calculator": moveWeight,
  "packing-time-estimate-calculator": packTime,
  "card-grading-worth-it-psa-calculator": grading,
  "collectible-appreciation-rate-calculator": collectGrowth,
  "germany-vat-calculator": deVat,
  "france-vat-calculator": frVat,
  "ireland-vat-calculator": ieVat,
  "netherlands-vat-calculator": nlVat,
  "spain-iva-calculator": esVat,
  "italy-iva-calculator": itVat,
  "mexico-iva-calculator": mxVat,
  "japan-consumption-tax-calculator": jpVat,
};
