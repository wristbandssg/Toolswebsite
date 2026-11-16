/**
 * Idea build, batch hr2 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > HR, Marketing & Business Operations, part 2 (30 tools).
 * Startup financing (pre/post-money, SAFE/note conversion), Erlang C staffing, workforce cost
 * and advertising-media math (CPM, GRP, CPP). US employer payroll tax uses editable 2026 defaults.
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;

export const valuation: Calc = (v) => {
  const pre = need(p(v, "pre", 8e6), "Enter pre-money valuation."), inv = p(v, "i", 2e6), sh = need(p(v, "s", 10e6), "Enter existing shares.");
  const post = pre + inv, pps = pre / sh, newSh = inv / pps;
  return { post: `${$(post, 0)} post-money valuation`, own: `Investors own ${pc(inv / post, 2)} · existing holders ${pc(pre / post, 2)}`, pps: `${$(pps, 4)} per share · ${nfmt(Math.round(newSh))} new shares` };
};
export const dilution: Calc = (v) => {
  const own = p(v, "o", 4e6), tot = need(p(v, "t", 10e6), "Enter total shares."), add = p(v, "n", 2.5e6);
  const before = own / tot, after = own / (tot + add);
  return { after: `${pc(after, 2)} ownership after`, before: `${pc(before, 2)} before`, dil: `${pc(1 - after / before, 1)} dilution (${nfmt(add)} new shares)` };
};
const convert = (amount: number, cap: number, disc: number, price: number, fd: number) => {
  const capPrice = cap / fd, discPrice = price * (1 - disc), cp = Math.min(capPrice, discPrice, price);
  return { cp, sh: amount / cp, which: cp === price ? "round price" : cp === capPrice ? "valuation cap" : "discount" };
};
export const safe: Calc = (v) => {
  const inv = need(p(v, "i", 500000), "Enter SAFE amount."), cap = need(p(v, "c", 6e6), "Enter valuation cap."), d = p(v, "d", 20) / 100;
  const price = need(p(v, "pr", 1.2), "Enter round price per share."), fd = need(p(v, "fd", 8e6), "Enter pre-round shares.");
  const r = convert(inv, cap, d, price, fd);
  return { sh: `${nfmt(Math.round(r.sh))} shares`, cp: `${$(r.cp, 4)} conversion price (${r.which} applies)`, own: `≈ ${pc(r.sh / (fd + r.sh), 2)} of the company before new-money shares`, value: `${$(r.sh * price, 0)} value at the round price` };
};
export const note: Calc = (v) => {
  const pr0 = need(p(v, "i", 250000), "Enter note principal."), rate = p(v, "r", 6) / 100, m = p(v, "m", 18), cap = need(p(v, "c", 5e6), "Enter valuation cap."), d = p(v, "d", 20) / 100;
  const price = need(p(v, "pr", 1.5), "Enter round price per share."), fd = need(p(v, "fd", 6e6), "Enter pre-round shares.");
  const amt = pr0 * (1 + rate * m / 12), r = convert(amt, cap, d, price, fd);
  return { sh: `${nfmt(Math.round(r.sh))} shares`, amt: `${$(amt, 0)} converting (${$(amt - pr0, 0)} accrued interest)`, cp: `${$(r.cp, 4)} conversion price (${r.which} applies)`, own: `≈ ${pc(r.sh / (fd + r.sh), 2)} before new-money shares` };
};
export const franchise: Calc = (v) => {
  const inv = need(p(v, "i", 350000), "Enter total investment."), rev = p(v, "r", 900000), m = p(v, "m", 18) / 100, roy = p(v, "ro", 6) / 100, ad = p(v, "a", 2) / 100;
  const profit = rev * (m - roy - ad);
  return { profit: `${$(profit, 0)} a year after royalties`, roi: `${pc(profit / inv, 1)} annual ROI`, pay: profit > 0 ? `${(inv / profit).toFixed(1)} years payback` : "No payback at these numbers", fees: `${$(rev * (roy + ad), 0)} a year in royalty and ad-fund fees` };
};
export const sde: Calc = (v) => {
  const s = p(v, "n", 120000) + p(v, "o", 70000) + p(v, "i", 8000) + p(v, "da", 15000) + p(v, "x", 5000) + p(v, "pe", 6000);
  return { sde: `${$(s, 0)} seller's discretionary earnings`, val: `${$(s * 2, 0)} – ${$(s * 3, 0)} typical asking range (2–3× SDE)`, note: "Small businesses under ~$5M often sell for 1.5–4× SDE" };
};
export const utilization: Calc = (v) => {
  const bill = p(v, "b", 1400), avail = need(p(v, "a", 1880), "Enter available hours."), rate = p(v, "r", 150), target = p(v, "t", 75) / 100;
  const u = bill / avail;
  return { u: `${pc(u)} billable utilization`, rev: `${$(bill * rate, 0)} billed`, gap: u >= target ? "At or above target" : `${nfmt(Math.round(avail * target - bill))} more hours (${$((avail * target - bill) * rate, 0)}) to hit ${pc(target, 0)}` };
};
export const projectProfit: Calc = (v) => {
  const rev = need(p(v, "r", 60000), "Enter project revenue."), hrs = p(v, "h", 320), cost = p(v, "c", 65), exp = p(v, "e", 4000), oh = p(v, "o", 15) / 100;
  const labor = hrs * cost, total = labor * (1 + oh) + exp, prof = rev - total;
  return { prof: `${$(prof, 0)} profit`, margin: `${pc(prof / rev)} margin`, cost: `${$(labor, 0)} labor + ${$(labor * oh, 0)} overhead + ${$(exp, 0)} expenses`, eff: `${$(rev / Math.max(hrs, 1))} effective revenue per hour` };
};
export const remoteSave: Calc = (v) => {
  const emp = p(v, "e", 50), days = Math.min(5, p(v, "d", 3)), cost = p(v, "c", 11000), stip = p(v, "s", 600);
  const save = emp * cost * (days / 5), net = save - emp * stip;
  return { net: `${$(net, 0)} net savings a year`, gross: `${$(save, 0)} in office space and overhead`, per: `${$(net / Math.max(emp, 1), 0)} per employee` };
};
export const erlang: Calc = (v) => {
  const calls = need(p(v, "c", 120), "Enter calls per hour."), aht = need(p(v, "a", 240), "Enter handle time."), t = p(v, "t", 20), sl = Math.min(0.999, p(v, "sl", 80) / 100), shr = Math.min(0.9, p(v, "sh", 30) / 100);
  const A = (calls * aht) / 3600;
  for (let N = Math.max(1, Math.floor(A) + 1); N < A + 1000; N++) {
    let term = 1, sum = 1; for (let k = 1; k < N; k++) { term *= A / k; sum += term; }
    const top = term * (A / N) * (N / (N - A)), pw = top / (sum + top), s = 1 - pw * Math.exp((-(N - A) * t) / aht);
    if (s >= sl) {
      return { n: `${N} agents on the phones`, sched: `${Math.ceil(N / (1 - shr))} scheduled with ${pc(shr, 0)} shrinkage`, sl: `${pc(s)} answered within ${t}s · ${pc(pw)} wait at all`, occ: `${pc(A / N)} occupancy · ${A.toFixed(1)} Erlangs of traffic` };
    }
  }
  throw new InputError("Traffic too high to solve.");
};
export const aht: Calc = (v) => {
  const calls = need(p(v, "n", 400), "Enter calls handled."), talk = p(v, "t", 1600), hold = p(v, "h", 200), acw = p(v, "a", 400);
  const s = ((talk + hold + acw) / calls) * 60;
  return { aht: `${Math.floor(s / 60)} min ${Math.round(s % 60)} s average handle time`, parts: `Talk ${((talk / calls) * 60).toFixed(0)}s · hold ${((hold / calls) * 60).toFixed(0)}s · wrap-up ${((acw / calls) * 60).toFixed(0)}s`, hrs: `${((talk + hold + acw) / 60).toFixed(1)} agent hours in total` };
};
export const serviceLevel: Calc = (v) => {
  const within = p(v, "w", 680), offered = need(p(v, "o", 900), "Enter calls offered."), ab = p(v, "a", 45);
  return { sl: `${pc(within / offered)} service level`, ab: `${pc(ab / offered)} abandonment rate`, alt: `${pc(within / Math.max(offered - ab, 1))} excluding abandoned calls` };
};
export const mrr: Calc = (v) => {
  const m = p(v, "m", 400) * p(v, "mp", 49), a = (p(v, "a", 120) * p(v, "ap", 470)) / 12, cust = p(v, "m", 400) + p(v, "a", 120);
  const M = m + a;
  return { mrr: `${$(M, 0)} MRR`, arr: `${$(M * 12, 0)} ARR`, arpa: `${$(M / Math.max(cust, 1))} average revenue per account per month`, split: `${$(m, 0)} monthly plans + ${$(a, 0)} annual plans (normalised)` };
};
export const elasticity: Calc = (v) => {
  const p1 = need(p(v, "p1", 20), "Enter old price."), p2 = need(p(v, "p2", 24), "Enter new price."), q1 = need(p(v, "q1", 1000), "Enter old quantity."), q2 = p(v, "q2", 880);
  if (p1 === p2) throw new InputError("Prices must differ.");
  const e = ((q2 - q1) / ((q1 + q2) / 2)) / ((p2 - p1) / ((p1 + p2) / 2)), r1 = p1 * q1, r2 = p2 * q2;
  return { e: `${e.toFixed(2)} price elasticity`, type: Math.abs(e) > 1 ? "Elastic — buyers are price-sensitive" : Math.abs(e) < 1 ? "Inelastic — demand holds up when price changes" : "Unit elastic", rev: `Revenue ${$(r1, 0)} → ${$(r2, 0)} (${r2 >= r1 ? "+" : ""}${pc((r2 - r1) / r1)})` };
};
export const tiers: Calc = (v) => {
  const t = [[p(v, "p1", 19), p(v, "c1", 600)], [p(v, "p2", 49), p(v, "c2", 300)], [p(v, "p3", 149), p(v, "c3", 60)]];
  const r = t.map(([pr, c]) => pr * c), tot = r.reduce((a, b) => a + b, 0), cust = t.reduce((a, [, c]) => a + c, 0);
  if (!(tot > 0)) throw new InputError("Enter tier prices and customers.");
  return { tot: `${$(tot, 0)} monthly revenue (${$(tot * 12, 0)} a year)`, mix: `Basic ${pc(r[0] / tot, 0)} · Pro ${pc(r[1] / tot, 0)} · Premium ${pc(r[2] / tot, 0)} of revenue`, arpu: `${$(tot / Math.max(cust, 1))} average per customer` };
};
export const loaded: Calc = (v) => {
  const w = need(p(v, "w", 25), "Enter hourly wage."), hrs = need(p(v, "h", 2080), "Enter paid hours."), pto = p(v, "pto", 120), tax = p(v, "t", 10) / 100, ben = p(v, "b", 8000), oh = p(v, "o", 5000);
  const total = w * hrs * (1 + tax) + ben + oh, prod = Math.max(1, hrs - pto);
  return { hr: `${$(total / prod)} fully loaded cost per productive hour`, total: `${$(total, 0)} total annual cost`, mult: `${(total / prod / w).toFixed(2)}× the base wage` };
};
export const payrollTax: Calc = (v) => {
  const s = p(v, "s", 70000), base = p(v, "sb", 184500), fb = p(v, "fb", 7000), futa = p(v, "f", 0.6) / 100, sb = p(v, "ub", 12000), sr = p(v, "u", 2.7) / 100;
  const ss = Math.min(s, base) * 0.062, med = s * 0.0145, fu = Math.min(s, fb) * futa, su = Math.min(s, sb) * sr, tot = ss + med + fu + su;
  return { tot: `${$(tot, 0)} employer payroll taxes`, pct: `${pc(tot / Math.max(s, 1), 2)} of salary`, parts: `Social Security ${$(ss, 0)} · Medicare ${$(med, 0)} · FUTA ${$(fu, 0)} · state UI ${$(su, 0)}` };
};
export const contractor: Calc = (v) => {
  const sal = p(v, "s", 80000), ben = p(v, "b", 25) / 100, oh = p(v, "o", 6000), rate = p(v, "r", 60), hrs = p(v, "h", 1800);
  const emp = sal * (1 + 0.0765 + ben) + oh, con = rate * hrs;
  return { emp: `${$(emp, 0)} employee total cost`, con: `${$(con, 0)} contractor cost`, verdict: emp < con ? `Employee is ${$(con - emp, 0)} cheaper` : `Contractor is ${$(emp - con, 0)} cheaper`, be: `${$(emp / Math.max(hrs, 1))} break-even contractor rate` };
};
export const overtime: Calc = (v) => {
  const emp = p(v, "e", 12), ot = p(v, "o", 6), w = p(v, "w", 22), mult = p(v, "m", 1.5), wk = p(v, "k", 52);
  const cost = emp * ot * w * mult * wk, prem = emp * ot * w * (mult - 1) * wk;
  return { cost: `${$(cost, 0)} a year in overtime pay`, prem: `${$(prem, 0)} of that is the premium above straight time`, fte: `${(emp * ot / 40).toFixed(1)} FTE of work done as overtime` };
};
export const shiftCover: Calc = (v) => {
  const hrs = p(v, "h", 16), days = Math.min(7, p(v, "d", 7)), pos = p(v, "p", 3), per = need(p(v, "e", 38), "Enter hours per employee."), shr = Math.min(0.9, p(v, "s", 12) / 100);
  const weekly = hrs * days * pos, fte = weekly / per / (1 - shr);
  return { fte: `${fte.toFixed(1)} employees needed (round up to ${Math.ceil(fte)})`, hrs: `${nfmt(weekly)} coverage hours a week`, note: `Includes ${pc(shr, 0)} for leave, sickness and training` };
};
export const fte: Calc = (v) => {
  const ft = p(v, "f", 10), pt = p(v, "pt", 6), ph = p(v, "ph", 20), std = need(p(v, "s", 40), "Enter standard full-time hours.");
  const tot = ft * std + pt * ph;
  return { fte: `${(tot / std).toFixed(2)} FTE`, hrs: `${nfmt(tot)} hours a week`, head: `${ft + pt} headcount` };
};
export const vacation: Calc = (v) => {
  const e = p(v, "e", 25), d = p(v, "d", 15), pay = p(v, "p", 200), cov = p(v, "c", 50) / 100, m = p(v, "m", 1.5);
  const days = e * d * cov;
  return { cost: `${$(days * pay * m, 0)} a year in coverage costs`, days: `${nfmt(Math.round(days))} days need backfill`, note: `Covered at ${m}× pay (overtime or temps)` };
};
export const productivity: Calc = (v) => {
  const out = p(v, "o", 1.2e6), hrs = need(p(v, "h", 20000), "Enter hours worked."), emp = need(p(v, "e", 12), "Enter employees."), prev = p(v, "pv", 55);
  const ph = out / hrs;
  return { ph: `${$(ph)} output per hour`, pe: `${$(out / emp, 0)} per employee`, chg: prev ? `${ph >= prev ? "+" : ""}${pc((ph - prev) / prev)} vs previous ${$(prev)} per hour` : "—" };
};
export const influencer: Calc = (v) => {
  const cost = need(p(v, "c", 3000), "Enter campaign cost."), reach = p(v, "r", 150000), eng = p(v, "e", 3) / 100, conv = p(v, "cv", 90), aov = p(v, "a", 60), m = p(v, "m", 50) / 100;
  const rev = conv * aov;
  return { roi: `${pc((rev * m - cost) / cost, 0)} ROI on gross profit`, rev: `${$(rev, 0)} revenue · ${(rev / cost).toFixed(2)}× ROAS`, cpe: `${$(cost / Math.max(reach * eng, 1))} per engagement · ${$((cost / Math.max(reach, 1)) * 1000)} CPM` };
};
export const tradeShow: Calc = (v) => {
  const cost = need(p(v, "b", 12000) + p(v, "t", 5000) + p(v, "s", 3000), "Enter costs."), leads = p(v, "l", 150), close = p(v, "c", 10) / 100, deal = p(v, "d", 4000);
  const rev = leads * close * deal;
  return { roi: `${pc((rev - cost) / cost, 0)} ROI`, rev: `${$(rev, 0)} expected revenue from ${Math.round(leads * close)} deals`, cpl: `${$(cost / Math.max(leads, 1))} per lead · ${$(cost, 0)} total cost` };
};
export const directMail: Calc = (v) => {
  const n = p(v, "n", 5000), cpp = p(v, "c", 0.85), resp = p(v, "r", 4) / 100, conv = p(v, "cv", 25) / 100, aov = p(v, "a", 120), m = p(v, "m", 45) / 100;
  const cost = need(n * cpp, "Enter pieces and cost."), orders = n * resp * conv, gp = orders * aov * m;
  return { roi: `${pc((gp - cost) / cost, 0)} ROI`, orders: `${orders.toFixed(0)} orders · ${$(orders * aov, 0)} revenue`, cpa: `${$(cost / Math.max(orders, 1))} per order · ${$(cost, 0)} campaign cost` };
};
export const billboard: Calc = (v) => {
  const rate = p(v, "r", 3000), mo = p(v, "m", 3), prod = p(v, "p", 800), daily = need(p(v, "d", 25000), "Enter daily impressions.");
  const cost = rate * mo + prod, imp = daily * 30.4 * mo;
  return { cost: `${$(cost, 0)} total cost`, cpm: `${$((cost / imp) * 1000)} CPM`, imp: `${nfmt(Math.round(imp))} impressions over ${mo} months` };
};
export const radio: Calc = (v) => {
  const spot = p(v, "c", 150), n = p(v, "n", 20), wk = p(v, "w", 4), aqh = need(p(v, "a", 8000), "Enter average listeners per spot.");
  const cost = spot * n * wk, imp = aqh * n * wk;
  return { cost: `${$(cost, 0)} campaign cost`, cpm: `${$((cost / imp) * 1000)} CPM`, imp: `${nfmt(imp)} gross impressions from ${n * wk} spots` };
};
export const grp: Calc = (v) => {
  const rating = p(v, "r", 4), spots = p(v, "s", 25), cost = p(v, "c", 2500), pop = need(p(v, "p", 1.5e6), "Enter target population.");
  const g = rating * spots, tot = cost * spots, imp = (g / 100) * pop;
  return { grp: `${g.toFixed(0)} GRPs`, cpp: `${$(tot / Math.max(g, 0.01), 0)} cost per rating point`, cpm: `${$((tot / Math.max(imp, 1)) * 1000)} CPM · ${nfmt(Math.round(imp))} impressions`, tot: `${$(tot, 0)} total spend` };
};
export const adsBudget: Calc = (v) => {
  const goal = p(v, "g", 60), cr = need(p(v, "c", 4) / 100, "Enter conversion rate."), cpc0 = p(v, "k", 2.5), aov = p(v, "a", 150);
  const clicks = goal / cr, b = clicks * cpc0;
  return { b: `${$(b, 0)} a month (${$(b / 30.4)} a day)`, clicks: `${nfmt(Math.round(clicks))} clicks needed`, cpa: `${$(cpc0 / cr)} per conversion · ${(goal * aov / Math.max(b, 1)).toFixed(2)}× ROAS` };
};

// ---- registry (generated)
export const ideaHr2CustomCalculators: Record<string, Calc> = {
  "startup-valuation-pre-money-post-money-calculator": valuation,
  "equity-dilution-calculator": dilution,
  "safe-note-conversion-calculator": safe,
  "convertible-note-conversion-calculator": note,
  "franchise-fee-roi-calculator": franchise,
  "seller-discretionary-earnings-calculator": sde,
  "billable-utilization-rate-calculator": utilization,
  "project-profitability-calculator": projectProfit,
  "remote-work-savings-employer-calculator": remoteSave,
  "call-center-staffing-erlang-calculator": erlang,
  "average-handle-time-calculator": aht,
  "service-level-call-center-calculator": serviceLevel,
  "subscription-mrr-arr-calculator": mrr,
  "price-elasticity-of-demand-business-calculator": elasticity,
  "pricing-tier-revenue-calculator": tiers,
  "hourly-employee-cost-fully-loaded-calculator": loaded,
  "payroll-tax-employer-cost-calculator": payrollTax,
  "contractor-vs-employee-cost-calculator": contractor,
  "overtime-cost-business-calculator": overtime,
  "shift-coverage-staffing-calculator": shiftCover,
  "fte-full-time-equivalent-calculator": fte,
  "vacation-coverage-cost-calculator": vacation,
  "employee-productivity-calculator": productivity,
  "influencer-campaign-roi-calculator": influencer,
  "trade-show-roi-calculator": tradeShow,
  "direct-mail-roi-calculator": directMail,
  "billboard-advertising-cost-calculator": billboard,
  "radio-advertising-cost-calculator": radio,
  "tv-advertising-grp-calculator": grp,
  "google-ads-budget-calculator": adsBudget,
};
