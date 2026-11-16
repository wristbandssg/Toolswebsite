/**
 * Idea build, batch hr3 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > HR, Marketing & Business Operations, part 3 (29 tools).
 * Conversion tests use a two-proportion z-test; SaaS metrics (Rule of 40, burn multiple, quick ratio);
 * small-business unit economics; liquidation preference (1× non-participating / participating).
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const sgn = (x: number) => (x >= 0 ? "+" : "−");
/** Two-sided p-value for a standard normal z (Abramowitz–Stegun 26.2.17). */
const pval = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp((-z * z) / 2);
  const tail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * tail;
};
const ztest = (n1: number, x1: number, n2: number, x2: number) => {
  const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2), se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  const z = se > 0 ? (p2 - p1) / se : 0, pv = pval(z);
  return { p1, p2, pv, sig: pv < 0.05 ? `Significant at 95% (p = ${pv.toFixed(3)})` : `Not significant yet (p = ${pv.toFixed(3)}) — keep testing` };
};

export const lpLift: Calc = (v) => {
  const n1 = need(p(v, "n1", 5000), "Enter control visitors."), x1 = p(v, "x1", 150), n2 = need(p(v, "n2", 5000), "Enter variant visitors."), x2 = p(v, "x2", 195), val = p(v, "v", 80), traffic = p(v, "t", 20000);
  const r = ztest(n1, x1, n2, x2);
  if (!(r.p1 > 0)) throw new InputError("Enter control conversions.");
  return { lift: `${sgn(r.p2 - r.p1)}${pc(Math.abs(r.p2 / r.p1 - 1))} relative lift (${pc(r.p1, 2)} → ${pc(r.p2, 2)})`, sig: r.sig, value: `${$((r.p2 - r.p1) * traffic * val, 0)} extra revenue a month at ${nfmt(traffic)} visitors` };
};
export const trafficRev: Calc = (v) => {
  const vis = p(v, "t", 40000), cr = p(v, "c", 2.5) / 100, aov = p(v, "a", 75);
  const rev = vis * cr * aov;
  return { rev: `${$(rev, 0)} a month`, rpv: `${$(rev / Math.max(vis, 1))} revenue per visitor`, orders: `${nfmt(Math.round(vis * cr))} orders · ${$(rev * 12, 0)} a year` };
};
export const ecomForecast: Calc = (v) => {
  const r0 = need(p(v, "r", 50000), "Enter current monthly revenue."), g = num(v.g, 5) / 100, m = Math.min(120, Math.max(1, Math.round(p(v, "m", 12))));
  let tot = 0, cur = r0; for (let i = 1; i <= m; i++) { cur = r0 * Math.pow(1 + g, i); tot += cur; }
  return { last: `${$(cur, 0)} in month ${m}`, tot: `${$(tot, 0)} total over ${m} months`, mult: `${(cur / r0).toFixed(2)}× today's monthly revenue` };
};
export const repeatRate: Calc = (v) => {
  const cust = need(p(v, "c", 2000), "Enter customers."), rep = p(v, "r", 560), orders = p(v, "o", 3100);
  return { r: `${pc(rep / cust)} repeat purchase rate`, freq: `${(orders / cust).toFixed(2)} orders per customer`, note: rep / cust >= 0.3 ? "Above the ~20–30% ecommerce norm" : "Typical-to-low — try post-purchase emails" };
};
export const loyalty: Calc = (v) => {
  const mem = p(v, "n", 3000), lift = p(v, "l", 120), m = p(v, "m", 40) / 100, rw = p(v, "rw", 5) / 100, spend = p(v, "s", 600), fixed = p(v, "f", 15000);
  const gain = mem * lift * m, cost = mem * spend * rw + fixed;
  if (!(cost > 0)) throw new InputError("Enter program costs.");
  return { roi: `${pc((gain - cost) / cost, 0)} ROI`, gain: `${$(gain, 0)} extra gross profit a year`, cost: `${$(cost, 0)} a year in rewards and running costs` };
};
export const referral: Calc = (v) => {
  const refs = p(v, "r", 400), conv = p(v, "c", 25) / 100, rew = p(v, "w", 50), fixed = p(v, "f", 2000), clv = p(v, "l", 600);
  const cust = refs * conv, cost = cust * rew + fixed;
  if (!(cost > 0)) throw new InputError("Enter program costs.");
  return { roi: `${pc((cust * clv - cost) / cost, 0)} ROI`, cust: `${nfmt(Math.round(cust))} new customers`, cac: `${$(cost / Math.max(cust, 1))} cost per referred customer` };
};
export const surveyRate: Calc = (v) => {
  const sent = need(p(v, "s", 2000), "Enter surveys sent."), bad = p(v, "b", 100), resp = p(v, "r", 380), pop = p(v, "p", 2000);
  const n = resp, fpc = pop > n ? Math.sqrt((pop - n) / (pop - 1)) : 0, moe = n ? 1.96 * Math.sqrt(0.25 / n) * (pop ? fpc : 1) : 0;
  return { r: `${pc(resp / Math.max(sent - bad, 1))} response rate`, moe: `±${pc(moe)} margin of error (95%)`, note: resp / Math.max(sent - bad, 1) < 0.1 ? "Low response — check for non-response bias" : "Good response" };
};
export const awareness: Calc = (v) => {
  const n1 = need(p(v, "n1", 600), "Enter control sample."), a1 = p(v, "a1", 22) / 100, n2 = need(p(v, "n2", 600), "Enter exposed sample."), a2 = p(v, "a2", 29) / 100;
  const r = ztest(n1, n1 * a1, n2, n2 * a2);
  return { lift: `${sgn(a2 - a1)}${((a2 - a1) * 100).toFixed(1)} points of awareness`, rel: a1 ? `${sgn(a2 - a1)}${pc(Math.abs(a2 / a1 - 1))} relative lift` : "—", sig: r.sig };
};
export const restMkt: Calc = (v) => {
  const s = p(v, "s", 1.2e6), pr = p(v, "p", 4) / 100, b = s * pr;
  return { b: `${$(b, 0)} a year (${$(b / 12, 0)} a month)`, split: `Social/digital ${$(b * 0.4, 0)} · loyalty/email ${$(b * 0.2, 0)} · local promos ${$(b * 0.25, 0)} · listings/reviews ${$(b * 0.15, 0)}`, note: "Restaurants commonly spend 3–6% of sales on marketing" };
};
export const startupCosts: Calc = (v) => {
  const one = p(v, "e", 25000) + p(v, "d", 6000) + p(v, "l", 1500) + p(v, "i", 10000) + p(v, "w", 3000), mo = p(v, "f", 8000), runway = p(v, "m", 6), buf = p(v, "b", 10) / 100;
  const tot = (one + mo * runway) * (1 + buf);
  return { tot: `${$(tot, 0)} total startup capital`, one: `${$(one, 0)} one-time costs`, run: `${$(mo * runway, 0)} for ${runway} months of fixed costs + ${pc(buf, 0)} contingency` };
};
export const bizPlan: Calc = (v) => {
  const y1 = need(p(v, "r", 250000), "Enter year 1 revenue."), g = num(v.g, 40) / 100, decay = p(v, "d", 10) / 100, m = p(v, "m", 15) / 100;
  const ys: number[] = [y1]; let gr = g; for (let i = 1; i < 5; i++) { ys.push(ys[i - 1] * (1 + gr)); gr *= 1 - decay; }
  return { y5: `${$(ys[4], 0)} year 5 revenue`, list: ys.map((x, i) => `Y${i + 1} ${$(x, 0)}`).join(" · "), profit: `${$(ys.reduce((a, b) => a + b, 0) * m, 0)} 5-year net profit at ${pc(m, 0)} margin` };
};
export const loanCash: Calc = (v) => {
  const P = need(p(v, "a", 150000), "Enter loan amount."), r = p(v, "r", 9) / 1200, n = Math.max(1, Math.round(p(v, "y", 7) * 12)), cf = p(v, "c", 4500);
  const pay = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n, d = cf / pay;
  return { pay: `${$(pay)} monthly payment`, dscr: `${d.toFixed(2)} debt service coverage ratio`, verdict: d >= 1.25 ? "Meets the 1.25× most lenders require" : d >= 1 ? "Covers the payment but below lender minimum" : "Cash flow does not cover the payment", left: `${$(cf - pay, 0)} cash left each month` };
};
export const vending: Calc = (v) => {
  const mach = p(v, "n", 5), sales = p(v, "s", 12), price = p(v, "p", 1.75), cogs = p(v, "c", 45) / 100, comm = p(v, "cm", 10) / 100, mo = p(v, "f", 40);
  const rev = mach * sales * price * 30.4, prof = rev * (1 - cogs - comm) - mach * mo;
  return { prof: `${$(prof, 0)} profit a month`, rev: `${$(rev, 0)} revenue a month`, per: `${$(prof / Math.max(mach, 1), 0)} per machine · ${$(prof * 12, 0)} a year` };
};
export const carWash: Calc = (v) => {
  const cars = p(v, "c", 120), t = p(v, "t", 14), days = p(v, "d", 28), var0 = p(v, "v", 3), fixed = p(v, "f", 28000);
  const rev = cars * t * days, prof = rev - cars * days * var0 - fixed, be = fixed / Math.max(t - var0, 0.01) / Math.max(days, 1);
  return { prof: `${$(prof, 0)} profit a month`, rev: `${$(rev, 0)} revenue`, be: `${Math.ceil(be)} cars a day to break even` };
};
export const laundromat: Calc = (v) => {
  const w = p(v, "w", 30), turns = p(v, "t", 4), price = p(v, "p", 4), dry = p(v, "d", 2), util = p(v, "u", 1.1), fixed = p(v, "f", 9000);
  const loads = w * turns * 30.4, rev = loads * (price + dry), prof = rev - loads * util - fixed;
  return { prof: `${$(prof, 0)} profit a month`, rev: `${$(rev, 0)} revenue from ${nfmt(Math.round(loads))} loads`, be: `${(fixed / Math.max(price + dry - util, 0.01) / 30.4 / Math.max(w, 1)).toFixed(1)} turns per washer a day to break even` };
};
export const daycare: Calc = (v) => {
  const kids = p(v, "k", 40), tui = p(v, "t", 300), ratio = need(p(v, "r", 8), "Enter children per staff."), wage = p(v, "w", 16), hrs = p(v, "h", 50), rent = p(v, "rn", 6000), sup = p(v, "s", 60);
  const staff = Math.ceil(kids / ratio), rev = kids * tui * 4.33, labor = staff * wage * hrs * 4.33 * 1.12, prof = rev - labor - rent - kids * sup;
  return { prof: `${$(prof, 0)} profit a month`, rev: `${$(rev, 0)} tuition revenue`, staff: `${staff} staff at 1:${ratio} costing ${$(labor, 0)} (incl. 12% payroll costs)` };
};
export const cleaning: Calc = (v) => {
  const sq = p(v, "a", 2000), rate = need(p(v, "r", 450), "Enter square feet per labor hour."), wage = p(v, "w", 18), sup = p(v, "s", 8), oh = p(v, "o", 20) / 100, mg = Math.min(0.9, p(v, "m", 25) / 100);
  const hrs = sq / rate, cost = (hrs * wage * 1.1 + sup) * (1 + oh), price = cost / (1 - mg);
  return { price: `${$(price, 0)} per clean`, hrs: `${hrs.toFixed(1)} labor hours`, unit: `${$(price / Math.max(sq, 1), 3)} per sq ft · ${$(price - cost, 0)} profit` };
};
export const lawn: Calc = (v) => {
  const lawns = p(v, "l", 40), price = p(v, "p", 45), wk = p(v, "w", 30), hrs = p(v, "h", 0.75), wage = p(v, "wg", 18), fuel = p(v, "f", 4), eq = p(v, "e", 6000);
  const jobs = lawns * wk, rev = jobs * price, cost = jobs * (hrs * wage + fuel) + eq, prof = rev - cost;
  return { prof: `${$(prof, 0)} season profit`, rev: `${$(rev, 0)} revenue from ${nfmt(jobs)} cuts`, per: `${$(prof / Math.max(jobs, 1))} profit per cut` };
};
export const delivery: Calc = (v) => {
  const ord = p(v, "o", 150), fee = p(v, "f", 4.99), aov = p(v, "a", 32), com = p(v, "c", 15) / 100, drv = p(v, "d", 6), days = p(v, "n", 30), fixed = p(v, "x", 6000);
  const unit = fee + aov * com - drv, prof = ord * days * unit - fixed;
  return { prof: `${$(prof, 0)} profit a month`, unit: `${$(unit)} contribution per order`, be: unit > 0 ? `${Math.ceil(fixed / unit / Math.max(days, 1))} orders a day to break even` : "Each order loses money" };
};
export const booth: Calc = (v) => {
  const rev = p(v, "r", 2000), split = p(v, "s", 45) / 100, rent = p(v, "b", 250), prod = p(v, "p", 8) / 100, se = p(v, "t", 7.65) / 100;
  const com = rev * split, boothNet = (rev * (1 - prod) - rent) * (1 - se);
  return { com: `${$(com, 0)} a week on commission`, booth: `${$(boothNet, 0)} a week renting a booth (after products and extra self-employment tax)`, verdict: boothNet > com ? `Booth rent pays ${$(boothNet - com, 0)} more a week` : `Commission pays ${$(com - boothNet, 0)} more a week`, be: (1 - prod) * (1 - se) > split ? `Booth rent wins above ${$((rent * (1 - se)) / ((1 - prod) * (1 - se) - split), 0)} weekly sales` : "Commission always pays more at this split" };
};
export const gym: Calc = (v) => {
  const mem = p(v, "m", 600), fee = p(v, "f", 45), extra = p(v, "e", 3000), rent = p(v, "r", 12000), staff = p(v, "s", 14000), other = p(v, "o", 8000);
  const fixed = rent + staff + other, rev = mem * fee + extra, prof = rev - fixed;
  return { prof: `${$(prof, 0)} profit a month`, rev: `${$(rev, 0)} revenue`, be: `${Math.ceil(Math.max(0, fixed - extra) / Math.max(fee, 0.01))} members to break even` };
};
export const payback: Calc = (v) => {
  const cac = need(p(v, "c", 1200), "Enter CAC."), arpa = need(p(v, "a", 100), "Enter monthly revenue per account."), gm = need(p(v, "g", 80) / 100, "Enter gross margin.");
  const m = cac / (arpa * gm);
  return { m: `${m.toFixed(1)} months CAC payback`, verdict: m <= 12 ? "Strong (≤12 months)" : m <= 18 ? "OK for mid-market" : "Long — needs low churn to pay off", gp: `${$(arpa * gm)} gross profit per account per month` };
};
export const rule40: Calc = (v) => {
  const g = num(v.g, 30), m = num(v.m, 5), s = g + m;
  return { s: `${s.toFixed(1)}% (Rule of 40 score)`, verdict: s >= 40 ? "Passes — healthy balance of growth and profit" : `Falls short by ${(40 - s).toFixed(1)} points`, note: "Growth % + profit margin % (EBITDA or free cash flow)" };
};
export const burnMult: Calc = (v) => {
  const burn = p(v, "b", 3e6), arr = need(p(v, "a", 2e6), "Enter net new ARR.");
  const b = burn / arr;
  return { b: `${b.toFixed(2)}× burn multiple`, verdict: b < 1 ? "Amazing" : b < 1.5 ? "Great" : b < 2 ? "Good" : b < 3 ? "Suspect" : "Bad", note: `${$(b, 2)} burned for each $1 of new ARR` };
};
export const quickRatio: Calc = (v) => {
  const nw = p(v, "n", 40000), ex = p(v, "e", 12000), ch = p(v, "c", 10000), ct = p(v, "ct", 3000);
  if (!(ch + ct > 0)) throw new InputError("Enter churned or contracted MRR.");
  const r = (nw + ex) / (ch + ct);
  return { r: `${r.toFixed(2)} SaaS quick ratio`, verdict: r >= 4 ? "Efficient growth (4+)" : r >= 1 ? "Growing, but losses are eating gains" : "Shrinking", net: `${$(nw + ex - ch - ct, 0)} net new MRR` };
};
export const capTable: Calc = (v) => {
  const rows: [string, number][] = [["Founders", p(v, "f", 8e6)], ["Option pool", p(v, "o", 1.5e6)], ["Seed investors", p(v, "s", 2e6)], ["Series A", p(v, "a", 3e6)]];
  const tot = rows.reduce((a, [, s]) => a + s, 0);
  if (!(tot > 0)) throw new InputError("Enter share counts.");
  const pps = p(v, "pps", 0);
  return { tbl: rows.map(([n, s]) => `${n} ${pc(s / tot, 2)}`).join(" · "), tot: `${nfmt(tot)} fully diluted shares`, val: pps ? `${$(tot * pps, 0)} implied valuation at ${$(pps, 4)} a share` : "Enter a share price for valuation" };
};
export const liqPref: Calc = (v) => {
  const exit = p(v, "e", 20e6), inv = p(v, "i", 5e6), mult = p(v, "m", 1), own = Math.min(1, p(v, "o", 25) / 100), part = num(v.pt, 0) === 1;
  const pref = Math.min(exit, inv * mult);
  const pay = part ? pref + own * (exit - pref) : Math.max(pref, own * exit);
  const converts = !part && own * exit > pref;
  return { inv: `${$(pay, 0)} to preferred investors (${pc(pay / Math.max(exit, 1))} of exit)`, com: `${$(exit - pay, 0)} to common holders`, how: part ? "Participating: takes the preference, then shares the rest pro rata" : converts ? "Converts to common — its share beats the preference" : "Takes the preference instead of converting" };
};
export const founderSplit: Calc = (v) => {
  const F = [1, 2, 3].map((i) => ({ t: Math.min(100, p(v, `t${i}`, [100, 100, 50][i - 1])), e: Math.min(10, p(v, `e${i}`, [8, 6, 7][i - 1])), d: Math.min(10, p(v, `d${i}`, [9, 4, 2][i - 1])), c: p(v, `c${i}`, [20000, 0, 10000][i - 1]) }));
  const cash = F.reduce((a, f) => a + f.c, 0);
  const sc = F.map((f) => 0.4 * (f.t / 100) + 0.3 * (f.e / 10) + 0.15 * (f.d / 10) + 0.15 * (cash ? f.c / cash : 0));
  const tot = sc.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) throw new InputError("Enter founder contributions.");
  return { split: sc.map((s, i) => `Founder ${i + 1}: ${pc(s / tot)}`).join(" · "), note: "Weights: time 40%, role/expertise 30%, idea and early work 15%, cash 15%", vest: "Use 4-year vesting with a 1-year cliff for every founder" };
};
export const revShare: Calc = (v) => {
  const rev = p(v, "r", 100000), off = p(v, "o", 20000), s = [p(v, "a", 50), p(v, "b", 30), p(v, "c", 20)];
  const tot = s.reduce((a, b) => a + b, 0);
  if (!(tot > 0)) throw new InputError("Enter partner shares.");
  const pool = Math.max(0, rev - off);
  return { list: s.map((x, i) => `Partner ${"ABC"[i]}: ${$(pool * (x / tot), 0)} (${pc(x / tot)})`).join(" · "), pool: `${$(pool, 0)} to split after ${$(off, 0)} costs`, note: tot !== 100 ? `Shares added to ${tot}% — scaled to 100%` : "Shares add to 100%" };
};

// ---- registry (generated)
export const ideaHr3CustomCalculators: Record<string, Calc> = {
  "landing-page-conversion-lift-calculator": lpLift,
  "website-traffic-revenue-calculator": trafficRev,
  "ecommerce-revenue-forecast-calculator": ecomForecast,
  "repeat-purchase-rate-calculator": repeatRate,
  "loyalty-program-roi-calculator": loyalty,
  "referral-program-roi-calculator": referral,
  "survey-response-rate-calculator": surveyRate,
  "brand-awareness-lift-calculator": awareness,
  "restaurant-marketing-budget-calculator": restMkt,
  "small-business-startup-costs-calculator": startupCosts,
  "business-plan-revenue-projection-calculator": bizPlan,
  "loan-payment-business-cash-flow-calculator": loanCash,
  "vending-machine-profit-calculator": vending,
  "car-wash-business-profit-calculator": carWash,
  "laundromat-profit-calculator": laundromat,
  "daycare-business-profit-calculator": daycare,
  "cleaning-business-pricing-calculator": cleaning,
  "lawn-care-business-profit-calculator": lawn,
  "food-delivery-business-profit-calculator": delivery,
  "salon-booth-rent-vs-commission-calculator": booth,
  "gym-business-profit-calculator": gym,
  "saas-payback-period-cac-calculator": payback,
  "rule-of-40-saas-calculator": rule40,
  "burn-multiple-calculator": burnMult,
  "quick-ratio-saas-growth-calculator": quickRatio,
  "cap-table-ownership-calculator": capTable,
  "liquidation-preference-payout-calculator": liqPref,
  "founder-equity-split-calculator": founderSplit,
  "revenue-share-split-partners-calculator": revShare,
};
