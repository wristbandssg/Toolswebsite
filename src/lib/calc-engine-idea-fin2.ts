/**
 * Idea build, batch fin2 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Life Events & Travel Budgets (19, itemised budget factory) and Money-Saving (18) = 37 tools.
 * Budget items are fixed, per person, per day, or per person per day; defaults are editable examples.
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const grow = (yearly: number, years: number, r = 0.07) => (r ? yearly * ((Math.pow(1 + r, years) - 1) / r) : yearly * years);

// ---- Itemised event budgets ----
/** [key, label, default, mode]: 0 fixed · 1 per person · 2 per day · 3 per person per day */
export type Item = [string, string, number, 0 | 1 | 2 | 3];
export interface BudgetSpec { people?: [string, number]; days?: [string, number]; items: Item[] }

export const BUDGETS: Record<string, BudgetSpec> = {
  "baby-shower-budget-calculator": { people: ["Guests", 25], items: [["v", "Venue", 0, 0], ["f", "Food and Drinks", 18, 1], ["c", "Cake and Desserts", 80, 0], ["d", "Decorations", 120, 0], ["i", "Invitations", 30, 0], ["g", "Games and Prizes", 50, 0], ["fv", "Favors", 3, 1]] },
  "gender-reveal-party-budget-calculator": { people: ["Guests", 20], items: [["r", "Reveal Item (cake, balloons, cannon)", 80, 0], ["f", "Food and Drinks", 15, 1], ["d", "Decorations", 80, 0], ["p", "Photographer", 0, 0], ["fv", "Favors", 2, 1]] },
  "graduation-party-budget-calculator": { people: ["Guests", 50], items: [["v", "Venue or Tent Rental", 200, 0], ["f", "Food", 14, 1], ["b", "Drinks", 4, 1], ["c", "Cake", 90, 0], ["d", "Decorations and Photo Display", 150, 0], ["i", "Announcements and Postage", 120, 0], ["t", "Tables, Chairs, Plates", 2, 1]] },
  "quinceanera-budget-calculator": { people: ["Guests", 150], items: [["v", "Venue", 3000, 0], ["f", "Catering", 30, 1], ["d", "Dress", 800, 0], ["m", "DJ or Band", 1200, 0], ["p", "Photo and Video", 1500, 0], ["c", "Cake", 500, 0], ["dc", "Decorations and Flowers", 1500, 0], ["ch", "Choreographer and Court", 600, 0], ["r", "Religious Ceremony", 300, 0], ["i", "Invitations", 3, 1]] },
  "bar-mitzvah-budget-calculator": { people: ["Guests", 120], items: [["v", "Venue", 4000, 0], ["f", "Catering", 60, 1], ["m", "DJ or Entertainment", 2500, 0], ["p", "Photo and Video", 2500, 0], ["dc", "Decor and Flowers", 2000, 0], ["t", "Tutor and Synagogue Fees", 1500, 0], ["i", "Invitations", 5, 1], ["c", "Clothing", 500, 0]] },
  "anniversary-trip-budget-calculator": { people: ["Travellers", 2], days: ["Nights", 5], items: [["fl", "Flights", 450, 1], ["h", "Hotel", 220, 2], ["f", "Food", 70, 3], ["a", "Activities and Tours", 400, 0], ["s", "Special Dinner", 250, 0], ["t", "Local Transport", 30, 2]] },
  "christmas-budget-calculator": { people: ["People to Buy Gifts For", 10], items: [["g", "Gifts", 75, 1], ["w", "Wrapping and Cards", 60, 0], ["d", "Tree and Decorations", 150, 0], ["f", "Holiday Food", 300, 0], ["e", "Parties and Events", 100, 0], ["t", "Travel", 300, 0], ["c", "Charity", 100, 0]] },
  "thanksgiving-dinner-budget-calculator": { people: ["Guests", 10], items: [["t", "Turkey (≈1.5 lb per person)", 3, 1], ["s", "Sides", 4, 1], ["d", "Desserts and Pies", 35, 0], ["b", "Drinks", 4, 1], ["x", "Table and Disposables", 25, 0]] },
  "halloween-budget-calculator": { people: ["Family Costumes", 4], items: [["c", "Costumes", 40, 1], ["k", "Candy", 60, 0], ["d", "Decorations", 80, 0], ["p", "Pumpkins and Carving", 30, 0], ["e", "Parties and Events", 50, 0]] },
  "camping-trip-budget-calculator": { people: ["Campers", 4], days: ["Nights", 3], items: [["s", "Campsite Fee", 35, 2], ["g", "Gas", 120, 0], ["f", "Food", 15, 3], ["i", "Ice and Firewood", 15, 2], ["e", "Gear Rental or New Gear", 100, 0], ["a", "Park Entry and Permits", 30, 0]] },
  "spring-break-budget-calculator": { people: ["Travellers", 1], days: ["Nights", 5], items: [["t", "Flight or Gas (each)", 350, 1], ["h", "Lodging Share", 80, 2], ["f", "Food", 45, 3], ["n", "Nightlife and Drinks", 30, 3], ["a", "Activities", 120, 1], ["s", "Souvenirs and Extras", 60, 1]] },
  "gap-year-budget-calculator": { days: ["Months Abroad", 9], items: [["fl", "Flights", 1500, 0], ["l", "Living Costs per Month", 1300, 2], ["i", "Travel Insurance per Month", 60, 2], ["v", "Visas and Vaccinations", 400, 0], ["p", "Programs or Volunteering Fees", 1500, 0], ["g", "Gear and Backpack", 400, 0]] },
  "relocation-budget-new-city-calculator": { items: [["m", "Movers or Truck", 2500, 0], ["d", "Security Deposit", 1800, 0], ["r", "First Month's Rent", 1800, 0], ["a", "Application and Agent Fees", 300, 0], ["t", "Travel to New City", 400, 0], ["u", "Utility Setup and Deposits", 200, 0], ["f", "New Furniture and Supplies", 1000, 0], ["c", "Car Registration and License", 250, 0], ["b", "Buffer Until First Paycheck", 2000, 0]] },
  "divorce-cost-budget-calculator": { items: [["a", "Attorney Retainer and Fees", 7500, 0], ["m", "Mediation", 3000, 0], ["c", "Court Filing Fees", 400, 0], ["v", "Appraisals and Valuations", 800, 0], ["fa", "Financial Advisor or CDFA", 1000, 0], ["h", "New Housing Setup", 3500, 0], ["t", "Therapy or Counseling", 1200, 0]] },
  "new-pet-budget-first-year-calculator": { items: [["a", "Adoption or Purchase", 300, 0], ["v", "Vet Visits and Vaccines", 500, 0], ["s", "Spay/Neuter and Microchip", 350, 0], ["f", "Food", 600, 0], ["s2", "Supplies (bed, crate, toys)", 300, 0], ["i", "Pet Insurance", 450, 0], ["t", "Training or Grooming", 400, 0], ["b", "Boarding or Pet Sitting", 300, 0]] },
  "home-renovation-budget-personal-calculator": { items: [["m", "Materials", 12000, 0], ["l", "Labor", 15000, 0], ["d", "Design and Permits", 2000, 0], ["a", "Appliances and Fixtures", 6000, 0], ["r", "Demolition and Disposal", 1500, 0], ["h", "Temporary Housing or Eating Out", 1000, 0]] },
  "elopement-budget-calculator": { people: ["Guests (incl. couple)", 2], items: [["p", "Photographer", 1500, 0], ["o", "Officiant and License", 400, 0], ["a", "Attire", 800, 0], ["f", "Flowers", 150, 0], ["t", "Travel", 700, 1], ["l", "Lodging", 900, 0], ["d", "Celebration Dinner", 80, 1]] },
  "vow-renewal-budget-calculator": { people: ["Guests", 40], items: [["v", "Venue", 800, 0], ["f", "Food and Drinks", 35, 1], ["o", "Officiant", 300, 0], ["p", "Photographer", 900, 0], ["fl", "Flowers and Decor", 500, 0], ["a", "Attire", 400, 0], ["c", "Cake", 200, 0]] },
  "festival-trip-budget-calculator": { people: ["People", 1], days: ["Days", 3], items: [["t", "Ticket", 350, 1], ["tr", "Travel", 200, 1], ["c", "Camping or Hotel Share", 40, 2], ["f", "Food and Drinks", 50, 3], ["m", "Merch", 60, 1], ["g", "Gear (tent, chair, outfits)", 80, 1]] },
};

const budgetCalc = (spec: BudgetSpec): Calc => (v) => {
  const ppl = spec.people ? need(p(v, "n", spec.people[1]), "Enter the number of people.") : 1, days = spec.days ? p(v, "days", spec.days[1]) : 1, cont = p(v, "ct", 10) / 100;
  const lines = spec.items.map(([k, l, d, mode]) => { const a = p(v, k, d); return { l, c: mode === 0 ? a : mode === 1 ? a * ppl : mode === 2 ? a * days : a * ppl * days }; });
  const base = lines.reduce((a, b) => a + b.c, 0);
  if (!(base > 0)) throw new InputError("Enter at least one cost.");
  const tot = base * (1 + cont), top = [...lines].sort((a, b) => b.c - a.c).slice(0, 3);
  return { tot: `${$0(tot)} total with ${pc(cont)} contingency`, base: `${$0(base)} before contingency`, per: spec.people ? `${$0(tot / ppl)} per ${spec.people[0].startsWith("Guest") ? "guest" : "person"}` : `${$0(tot / 12)} a month if saved over a year`, top: top.map((t) => `${t.l} ${$0(t.c)} (${pc(t.c / base)})`).join(" · ") };
};
export const budgetCalcs: Record<string, Calc> = Object.fromEntries(Object.entries(BUDGETS).map(([s, spec]) => [s, budgetCalc(spec)]));

// ---- Money-saving ----
export const smoking: Calc = (v) => {
  const packs = p(v, "p", 1), price = p(v, "c", 9), yrs = p(v, "y", 20);
  const yr = packs * price * 365;
  return { yr: `${$0(yr)} saved a year (${$0(yr / 12)} a month)`, inv: `${$0(grow(yr, yrs))} if invested for ${yrs} years at 7%`, cig: `${nfmt(Math.round(packs * 20 * 365))} cigarettes not smoked a year` };
};
export const drinking: Calc = (v) => {
  const d = p(v, "d", 10), price = p(v, "c", 7), cal = p(v, "k", 150), yrs = p(v, "y", 10);
  const yr = d * price * 52;
  return { yr: `${$0(yr)} saved a year`, inv: `${$0(grow(yr, yrs))} invested for ${yrs} years at 7%`, cal: `${nfmt(Math.round(d * cal * 52))} calories a year (≈ ${((d * cal * 52) / 3500).toFixed(1)} lb of body fat equivalent)` };
};
export const cookHome: Calc = (v) => {
  const meals = p(v, "m", 6), out = p(v, "o", 18), home = p(v, "h", 5), ppl = Math.max(1, p(v, "p", 2));
  const wk = meals * ppl * (out - home);
  return { yr: `${$0(wk * 52)} saved a year`, wk: `${$0(wk)} a week`, pct: `Home meals cost ${pc(home / Math.max(out, 0.01))} of eating out` };
};
export const bulk: Calc = (v) => {
  const bp = need(p(v, "bp", 18), "Enter bulk price."), bq = need(p(v, "bq", 48), "Enter bulk quantity."), rp = p(v, "rp", 5), rq = need(p(v, "rq", 8), "Enter regular quantity."), use = p(v, "u", 16), waste = p(v, "w", 0) / 100;
  const ub = bp / (bq * (1 - waste)), ur = rp / rq;
  return { unit: `${$(ub, 3)} vs ${$(ur, 3)} per unit`, yr: `${$0((ur - ub) * use * 12)} ${ub < ur ? "saved" : "lost"} a year at ${use} units a month`, pct: `Bulk is ${pc(Math.abs(1 - ub / Math.max(ur, 1e-9)))} ${ub < ur ? "cheaper" : "more expensive"} per unit${waste ? " after waste" : ""}` };
};
export const generic: Calc = (v) => {
  const sp = p(v, "s", 400), d = p(v, "d", 25) / 100, sh = p(v, "sh", 50) / 100;
  const mo = sp * sh * d;
  return { yr: `${$0(mo * 12)} saved a year`, mo: `${$0(mo)} a month`, note: `Switching ${pc(sh)} of purchases at ${pc(d)} cheaper` };
};
export const coupons: Calc = (v) => {
  const n = p(v, "n", 10), val = p(v, "a", 1.25), min = p(v, "m", 30);
  const yr = n * val * 52;
  return { yr: `${$0(yr)} saved a year`, hr: min ? `${$(yr / ((min / 60) * 52))} per hour of couponing` : "—", wk: `${$(n * val)} a week` };
};
export const cashback: Calc = (v) => {
  const g = p(v, "g", 600) * 12 * p(v, "gr", 3) / 100, f = p(v, "f", 200) * 12 * p(v, "fr", 3) / 100, o = p(v, "o", 1500) * 12 * p(v, "or", 1.5) / 100, fee = p(v, "fee", 0);
  const tot = g + f + o;
  return { net: `${$0(tot - fee)} net rewards a year`, gross: `${$0(tot)} earned (groceries ${$0(g)} · gas ${$0(f)} · other ${$0(o)})`, rate: `${pc((tot - fee) / Math.max((p(v, "g", 600) + p(v, "f", 200) + p(v, "o", 1500)) * 12, 1), 2)} effective return on spending` };
};
export const priceMatch: Calc = (v) => {
  const n = p(v, "n", 12), diff = p(v, "d", 15);
  return { yr: `${$0(n * diff)} saved a year`, per: `${$(diff)} per match`, note: "Most retailers match identical items from named competitors only" };
};
export const shower: Calc = (v) => {
  const og = p(v, "o", 2.5), ng = p(v, "n", 1.8), min = p(v, "m", 8), per = p(v, "s", 7), ppl = p(v, "p", 3), wr = p(v, "w", 12), el = p(v, "e", 0.17), eff = Math.max(0.3, p(v, "h", 90) / 100);
  const gal = (og - ng) * min * per * ppl * 52, kwh = (gal * 0.7 * 8.34 * 65) / 3412 / eff;
  return { yr: `${$0((gal / 1000) * wr + kwh * el)} saved a year`, gal: `${nfmt(Math.round(gal))} gallons of water a year`, energy: `${nfmt(Math.round(kwh))} kWh of water heating (${$0(kwh * el)})` };
};
export const cable: Calc = (v) => {
  const c = p(v, "c", 120), e = p(v, "e", 15), s = p(v, "s", 35), i = p(v, "i", 10);
  const mo = c + e - s - i;
  return { yr: `${$0(mo * 12)} saved a year`, mo: `${$0(mo)} a month`, note: mo <= 0 ? "Your streaming stack costs as much as cable" : "Antenna adds free local channels" };
};
export const phoneDown: Calc = (v) => {
  const cur = p(v, "c", 85), nw = p(v, "n", 35), lines = Math.max(1, p(v, "l", 1)), fee = p(v, "f", 0);
  const mo = (cur - nw) * lines;
  return { yr: `${$0(mo * 12 - fee)} saved in the first year`, mo: `${$0(mo)} a month`, pay: fee && mo > 0 ? `${Math.ceil(fee / mo)} months to recover the ${$0(fee)} switching cost` : "No switching cost" };
};
export const bike: Calc = (v) => {
  const mi = p(v, "m", 5), d = p(v, "d", 3), mpg = need(p(v, "g", 28), "Enter mpg."), gas = p(v, "p", 3.3), park = p(v, "k", 0), wear = p(v, "w", 0.1), bc = p(v, "b", 200);
  const miles = mi * 2 * d * 48, sav = miles * (gas / mpg + wear) + park * d * 48 - bc;
  return { yr: `${$0(sav)} saved a year`, mi: `${nfmt(Math.round(miles))} car miles avoided`, cal: `≈ ${nfmt(Math.round(miles * 45))} calories burned (≈ 45 per mile)` };
};
export const usedNew: Calc = (v) => {
  const np = p(v, "n", 1200), nl = need(p(v, "nl", 8), "Enter new life."), up = p(v, "u", 600), ul = need(p(v, "ul", 5), "Enter used life.");
  const a = np / nl, b = up / ul;
  return { a: `New ${$(a)} per year of use`, b: `Used ${$(b)} per year of use`, verdict: b < a ? `Used saves ${$0((a - b) * ul)} over its life` : `New is better value by ${$(b - a)} a year` };
};
export const refurb: Calc = (v) => {
  const np = p(v, "n", 1000), d = p(v, "d", 20) / 100, life = need(p(v, "l", 4), "Enter years of use."), w = p(v, "w", 0);
  const rp = np * (1 - d) + w;
  return { save: `${$0(np - rp)} saved (${pc((np - rp) / Math.max(np, 1))})`, price: `${$0(rp)} refurbished incl. ${$0(w)} extended warranty`, yr: `${$(rp / life)} vs ${$(np / life)} per year of use` };
};
export const library: Calc = (v) => {
  const b = p(v, "b", 24), price = p(v, "c", 18), fee = p(v, "f", 0);
  return { yr: `${$0(b * price - fee)} saved a year`, ten: `${$0((b * price - fee) * 10)} over 10 years`, per: `${$(price)} per book saved` };
};
export const roundUp: Calc = (v) => {
  const n = p(v, "n", 60), r = p(v, "r", 0.5), m = Math.max(1, p(v, "m", 1)), rate = p(v, "i", 4) / 100;
  const mo = n * r * m;
  return { yr: `${$0(mo * 12)} saved a year`, five: `${$0(grow(mo * 12, 5, rate))} after 5 years at ${pc(rate, 1)}`, mo: `${$(mo)} a month` };
};
export const raise: Calc = (v) => {
  const sal = p(v, "s", 60000), r = p(v, "r", 5) / 100, sp = p(v, "p", 50) / 100, tax = p(v, "t", 25) / 100, yrs = p(v, "y", 10);
  const net = sal * r * (1 - tax), save = net * sp;
  return { save: `${$0(save)} a year saved (${$0(save / 12)} a month)`, spend: `${$0(net - save)} a year for lifestyle`, grow: `${$0(grow(save, yrs))} after ${yrs} years at 7%` };
};
export const blackFriday: Calc = (v) => {
  const list = p(v, "l", 400), sale = p(v, "s", 279), street = p(v, "t", 320), buy = num(v.b, 0) === 0;
  const real = street - sale;
  return { real: buy ? `${$0(real)} real saving (${pc(real / Math.max(street, 1))} off the usual price)` : `${$0(sale)} spent — not a saving if you wouldn't buy it otherwise`, claimed: `${$0(list - sale)} advertised saving (${pc((list - sale) / Math.max(list, 1))} off list)`, gap: `${$0(list - street)} of the "discount" is inflated list price` };
};

// ---- registry (generated)
export const ideaFin2CustomCalculators: Record<string, Calc> = {
  ...budgetCalcs,
  "savings-from-quitting-smoking-calculator": smoking,
  "savings-from-quitting-drinking-calculator": drinking,
  "cooking-at-home-vs-eating-out-calculator": cookHome,
  "bulk-buying-savings-calculator": bulk,
  "generic-vs-brand-savings-calculator": generic,
  "coupon-savings-calculator": coupons,
  "cashback-rewards-value-calculator": cashback,
  "price-match-savings-calculator": priceMatch,
  "water-saving-shower-head-calculator": shower,
  "cancel-cable-savings-calculator": cable,
  "downgrade-phone-plan-savings-calculator": phoneDown,
  "biking-to-work-savings-calculator": bike,
  "buy-used-vs-new-savings-calculator": usedNew,
  "refurbished-electronics-savings-calculator": refurb,
  "library-vs-buying-books-savings-calculator": library,
  "round-up-savings-calculator": roundUp,
  "pay-raise-savings-split-calculator": raise,
  "black-friday-real-savings-calculator": blackFriday,
};
