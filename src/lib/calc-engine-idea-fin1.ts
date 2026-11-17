/**
 * Idea build, batch fin1 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Budgeting Methods (17) and Household & Family Expenses (20) = 37 tools.
 * Budget rules (80/20, 70/20/10, 60% solution), savings challenges, household running costs.
 * Grocery family-size adjustment follows the USDA food plan rule (1 person +20%, 2 +10%, 3 +5%, 5–6 −5%, 7+ −10%).
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const sum = (v: Record<string, number>, keys: string[], defs: number[]) => keys.reduce((a, k, i) => a + p(v, k, defs[i]), 0);
const fv = (pmtMonthly: number, years: number, ratePct: number) => {
  const r = ratePct / 1200, n = years * 12;
  return r ? pmtMonthly * ((Math.pow(1 + r, n) - 1) / r) : pmtMonthly * n;
};
const PER_MONTH = [52 / 12, 26 / 12, 2, 1];

// ---- Budgeting methods ----
export const rule8020: Calc = (v) => {
  const inc = need(p(v, "i", 4500), "Enter monthly take-home pay."), sav = p(v, "s", 600);
  return { save: `${$0(inc * 0.2)} a month to savings (20%)`, spend: `${$0(inc * 0.8)} for everything else (80%)`, gap: sav >= inc * 0.2 ? `You save ${pc(sav / inc)} — on target` : `Save ${$0(inc * 0.2 - sav)} more a month to hit 20%` };
};
export const rule702010: Calc = (v) => {
  const inc = need(p(v, "i", 4500), "Enter monthly take-home pay.");
  return { live: `${$0(inc * 0.7)} living expenses (70%)`, save: `${$0(inc * 0.2)} savings and investing (20%)`, debt: `${$0(inc * 0.1)} extra debt payoff or giving (10%)` };
};
export const rule6040: Calc = (v) => {
  const inc = need(p(v, "i", 5000), "Enter monthly gross income."), com = p(v, "c", 3200);
  const t = inc * 0.1;
  return { com: `${$0(inc * 0.6)} for committed expenses (60%)${com ? ` — yours are ${pc(com / inc)}` : ""}`, split: `${$0(t)} each to retirement, long-term savings, short-term savings and fun money`, gap: com > inc * 0.6 ? `Committed costs are ${$0(com - inc * 0.6)} over the 60% line` : "Committed costs fit within 60%" };
};
export const kakeibo: Calc = (v) => {
  const inc = need(p(v, "i", 4000), "Enter monthly income."), fixed = p(v, "f", 1800), goal = p(v, "g", 500);
  const pil = [p(v, "s", 700), p(v, "o", 400), p(v, "c", 150), p(v, "x", 100)], spent = pil.reduce((a, b) => a + b, 0), avail = inc - fixed - goal;
  return { left: `${$0(avail - spent)} ${avail - spent >= 0 ? "left this month" : "overspent"}`, avail: `${$0(avail)} available to spend after fixed costs and the ${$0(goal)} savings goal`, mix: `Survival ${pc(pil[0] / Math.max(spent, 1))} · optional ${pc(pil[1] / Math.max(spent, 1))} · culture ${pc(pil[2] / Math.max(spent, 1))} · extra ${pc(pil[3] / Math.max(spent, 1))}` };
};
export const envelopes: Calc = (v) => {
  const cash = need(p(v, "t", 1200), "Enter cash per month."), names = ["Groceries", "Gas", "Dining out", "Fun", "Misc"], pcts = [p(v, "a", 40), p(v, "b", 20), p(v, "c", 15), p(v, "d", 15), p(v, "e", 10)];
  const tot = pcts.reduce((a, b) => a + b, 0) || 1, pays = Math.max(1, p(v, "n", 2));
  return { list: names.map((n, i) => `${n} ${$0((cash * pcts[i]) / tot)}`).join(" · "), per: names.map((n, i) => `${n} ${$0((cash * pcts[i]) / tot / pays)}`).join(" · ") + ` per paycheck (${pays} a month)`, note: tot !== 100 ? `Percentages add to ${tot}% — scaled to 100%` : "Percentages add to 100%" };
};
export const p2p: Calc = (v) => {
  const pay = need(p(v, "p", 1800), "Enter take-home per paycheck."), freq = PER_MONTH[Math.min(3, Math.round(p(v, "f", 1)))], exp = p(v, "e", 3600), buf = p(v, "b", 1);
  const inc = pay * freq, left = inc - exp;
  return { left: `${$0(left)} a month ${left >= 0 ? "left over" : "short"}`, inc: `${$0(inc)} monthly take-home (${freq.toFixed(2)} paychecks a month)`, buf: left > 0 ? `${Math.ceil((exp * buf) / left)} months to build a ${buf}-month buffer by saving all of it` : "Cut costs or raise income before building a buffer" };
};
export const reverse: Calc = (v) => {
  const inc = need(p(v, "i", 5000), "Enter monthly take-home."), s = p(v, "s", 20) / 100, fixed = p(v, "f", 2500);
  const save = inc * s, rest = inc - save - fixed;
  return { save: `${$0(save)} saved first, on payday`, rest: `${$0(rest)} guilt-free spending after bills`, week: `${$(rest / 4.33, 0)} a week · ${$(rest / 30.4, 0)} a day` };
};
export const setAside: Calc = (v) => {
  const tot = sum(v, ["a", "b", "c", "d", "e"], [1200, 600, 450, 300, 900]), pays = Math.max(1, p(v, "n", 26));
  return { mo: `${$(tot / 12)} a month`, per: `${$(tot / pays)} per paycheck (${pays} a year)`, tot: `${$0(tot)} of irregular bills a year` };
};
export const surplus: Calc = (v) => {
  const inc = p(v, "i", 5200) + p(v, "o", 300), exp = sum(v, ["h", "t", "f", "u", "d", "x"], [1700, 600, 800, 350, 400, 900]);
  const d = inc - exp;
  return { d: `${$0(Math.abs(d))} monthly ${d >= 0 ? "surplus" : "deficit"}`, yr: `${$0(d * 12)} a year`, rate: inc ? `${pc(d / inc, 1)} of income ${d >= 0 ? "unspent" : "overspent"}` : "—" };
};
export const fixedVar: Calc = (v) => {
  const fx = p(v, "f", 2600), va = p(v, "v", 1400), inc = need(p(v, "i", 5000), "Enter monthly income.");
  return { split: `Fixed ${pc(fx / (fx + va || 1))} · variable ${pc(va / (fx + va || 1))} of spending`, inc: `Fixed costs take ${pc(fx / inc)} of income`, note: fx / inc > 0.5 ? "Over half your income is locked in — little room to cut fast" : "Healthy flexibility" };
};
const CATS: [string, string, number, number][] = [["Housing", "h", 1500, 30], ["Transport", "t", 500, 15], ["Food", "f", 700, 12], ["Utilities", "u", 300, 8], ["Insurance", "n", 300, 10], ["Debt", "d", 400, 10], ["Fun", "x", 400, 10]];
export const ratios: Calc = (v) => {
  const inc = need(p(v, "i", 5000), "Enter monthly take-home.");
  const rows = CATS.map(([n, k, d, g]) => ({ n, a: p(v, k, d), g }));
  const over = rows.filter((r) => (r.a / inc) * 100 > r.g);
  return { list: rows.map((r) => `${r.n} ${pc(r.a / inc)}`).join(" · "), flag: over.length ? `Above guideline: ${over.map((r) => `${r.n} (${pc(r.a / inc)} vs ${r.g}%)`).join(", ")}` : "All categories within common guidelines", left: `${$0(inc - rows.reduce((a, r) => a + r.a, 0))} unallocated` };
};
export const latte: Calc = (v) => {
  const c = p(v, "c", 5.5), d = Math.min(7, p(v, "d", 5)), y = p(v, "y", 30), r = num(v.r, 7);
  const mo = (c * d * 52) / 12;
  return { fv: `${$0(fv(mo, y, r))} if invested for ${y} years at ${r}%`, yr: `${$0(c * d * 52)} spent a year`, tot: `${$0(mo * 12 * y)} spent over ${y} years` };
};
export const noSpend: Calc = (v) => {
  const day = p(v, "s", 35), days = p(v, "d", 30), ok = p(v, "k", 80) / 100;
  const saved = day * days * ok;
  return { saved: `${$0(saved)} saved`, inv: `${$0(saved * Math.pow(1.07, 10))} in 10 years at 7%`, note: `${Math.round(days * ok)} of ${days} days without discretionary spending` };
};
export const envelope100: Calc = (v) => {
  const n = Math.round(Math.min(1000, need(p(v, "n", 100), "Enter envelopes."))), m = p(v, "m", 1), per = Math.max(1, p(v, "w", 7));
  const tot = ((n * (n + 1)) / 2) * m;
  return { tot: `${$0(tot)} saved`, time: `${Math.ceil(n / per)} weeks drawing ${per} envelopes a week`, avg: `${$(tot / n)} average per envelope` };
};
export const penny: Calc = (v) => {
  const s = p(v, "s", 0.01), d = Math.min(60, Math.max(1, Math.round(p(v, "d", 30))));
  return { last: `${$(s * Math.pow(2, d - 1))} on day ${d}`, tot: `${$(s * (Math.pow(2, d) - 1))} total`, note: d > 20 ? "Doubling gets out of hand fast — most people stop around day 15–20" : "Still manageable" };
};
export const yearReview: Calc = (v) => {
  const bi = p(v, "bi", 60000), ai = p(v, "ai", 62000), bs = p(v, "bs", 48000), as = p(v, "as", 51500), bsv = p(v, "bv", 12000);
  const asv = ai - as;
  return { inc: `Income ${ai >= bi ? "+" : "−"}${$0(Math.abs(ai - bi))} vs plan`, sp: `Spending ${as >= bs ? "+" : "−"}${$0(Math.abs(as - bs))} vs plan (${pc((as - bs) / Math.max(bs, 1), 1)})`, sav: `Saved ${$0(asv)} (${pc(asv / Math.max(ai, 1), 1)} of income) vs ${$0(bsv)} planned` };
};
export const debtVsSave: Calc = (v) => {
  const extra = need(p(v, "x", 500), "Enter extra money per month."), apr = p(v, "a", 22), sr = p(v, "s", 4), ef = p(v, "e", 500), tgt = p(v, "t", 1000);
  let d = 0.5, why = "Similar rates — split evenly";
  if (ef < tgt) { d = 0; why = `Build a ${$0(tgt)} starter emergency fund first`; } else if (apr > sr + 3) { d = 0.8; why = `Debt at ${apr}% costs more than savings earn (${sr}%)`; } else if (apr < sr) { d = 0.2; why = "Savings earn more than the debt costs"; }
  return { split: `${$0(extra * d)} to debt · ${$0(extra * (1 - d))} to savings`, why, gain: `Each $100 to debt saves ${$(apr)} a year; to savings it earns ${$(sr)}` };
};

// ---- Household & family ----
export const sahp: Calc = (v) => {
  const roles: [string, string, number, number][] = [["Childcare", "c", 40, 16], ["Cooking", "k", 10, 15], ["Cleaning", "l", 8, 17], ["Laundry", "y", 4, 14], ["Driving", "d", 5, 16], ["Household admin", "a", 3, 22]];
  const rows = roles.map(([n, k, h, w]) => ({ n, val: p(v, k, h) * p(v, `${k}w`, w) * 52, h: p(v, k, h) }));
  const tot = rows.reduce((a, r) => a + r.val, 0), hrs = rows.reduce((a, r) => a + r.h, 0);
  return { tot: `${$0(tot)} a year`, hrs: `${hrs} hours a week (${$(tot / 52 / Math.max(hrs, 1))} average hourly value)`, top: rows.sort((a, b) => b.val - a.val).slice(0, 3).map((r) => `${r.n} ${$0(r.val)}`).join(" · ") };
};
export const groceryFamily: Calc = (v) => {
  const ad = p(v, "a", 2), tn = p(v, "t", 0), ch = p(v, "c", 2), yk = p(v, "y", 0), base = p(v, "w", 85);
  const ppl = ad + tn + ch + yk;
  if (!(ppl > 0)) throw new InputError("Enter household members.");
  const raw = base * (ad + tn * 1.05 + ch * 0.75 + yk * 0.55), adj = ppl === 1 ? 1.2 : ppl === 2 ? 1.1 : ppl === 3 ? 1.05 : ppl === 4 ? 1 : ppl <= 6 ? 0.95 : 0.9;
  const wk = raw * adj;
  return { mo: `${$0(wk * 4.33)} a month`, wk: `${$0(wk)} a week · ${$0(wk * 52)} a year`, note: `Family-size adjustment ×${adj} for ${ppl} people` };
};
export const chores: Calc = (v) => {
  const rows = [["Cleaning", p(v, "c", 6), p(v, "cr", 20)], ["Laundry", p(v, "l", 3), p(v, "lr", 18)], ["Yard work", p(v, "y", 2), p(v, "yr", 25)]] as [string, number, number][];
  const tot = rows.reduce((a, [, h, r]) => a + h * r, 0) * 52;
  return { tot: `${$0(tot)} a year if you hired it out`, wk: `${$0(tot / 52)} a week · ${rows.reduce((a, [, h]) => a + h, 0)} hours`, list: rows.map(([n, h, r]) => `${n} ${$0(h * r * 52)}`).join(" · ") };
};
export const singleCouple: Calc = (v) => {
  const house = p(v, "h", 1600), util = p(v, "u", 250), shared = p(v, "s", 120), food = p(v, "f", 400), pers = p(v, "o", 600);
  const single = house + util + shared + food + pers, couple = house * 1.1 + util * 1.3 + shared + 2 * food * 0.9 + 2 * pers;
  return { single: `${$0(single)} a month living alone`, couple: `${$0(couple / 2)} each as a couple (${$0(couple)} together)`, save: `${$0(single - couple / 2)} a month saved each (${pc(1 - couple / 2 / single)})` };
};
export const splitIncome: Calc = (v) => {
  const a = p(v, "a", 6000), b = p(v, "b", 4000), exp = p(v, "e", 3500);
  if (!(a + b > 0)) throw new InputError("Enter incomes.");
  const sa = a / (a + b);
  return { a: `Partner A pays ${$0(exp * sa)} (${pc(sa)})`, b: `Partner B pays ${$0(exp * (1 - sa))} (${pc(1 - sa)})`, left: `Each keeps ${pc(1 - exp / (a + b))} of income — A ${$0(a - exp * sa)}, B ${$0(b - exp * (1 - sa))}` };
};
export const phonePlan: Calc = (v) => {
  const tot = p(v, "t", 160), lines = need(p(v, "l", 4), "Enter lines."), mine = p(v, "m", 1), dev = p(v, "d", 30);
  const per = tot / lines;
  return { per: `${$(per)} per line (plan only)`, mine: `${$(per * mine + dev)} a month for your ${mine} line${mine === 1 ? "" : "s"} incl. ${$(dev)} device payment`, yr: `${$0((per * mine + dev) * 12)} a year` };
};
export const streaming: Calc = (v) => {
  const tot = sum(v, ["a", "b", "c", "d", "e", "f"], [15.49, 17.99, 7.99, 10.99, 13.99, 0]), hrs = p(v, "h", 40);
  return { mo: `${$(tot)} a month`, yr: `${$0(tot * 12)} a year · ${$0(tot * 120)} over 10 years`, hr: hrs ? `${$(tot / hrs)} per hour watched` : "—" };
};
export const mbps: Calc = (v) => {
  const a = p(v, "a", 70) + p(v, "af", 15), sa = need(p(v, "s", 500), "Enter plan speed."), b = p(v, "b", 90) + p(v, "bf", 0), sb = p(v, "sb", 1000);
  const ra = a / sa, rb = sb ? b / sb : 0;
  return { a: `Plan A: ${$(ra, 3)} per Mbps (${$(a)} a month)`, b: sb ? `Plan B: ${$(rb, 3)} per Mbps (${$(b)} a month)` : "—", note: sb ? (rb < ra ? "Plan B is better value per Mbps" : "Plan A is better value per Mbps") + " — most homes need 100–300 Mbps" : "" };
};
export const laundry: Calc = (v) => {
  const gal = p(v, "g", 20), wr = p(v, "w", 12), kwh = p(v, "k", 3), el = p(v, "e", 0.17), det = p(v, "d", 0.25), loads = p(v, "n", 6);
  const c = (gal / 1000) * wr + kwh * el + det;
  return { c: `${$(c)} per load`, yr: `${$0(c * loads * 52)} a year at ${loads} loads a week`, parts: `Water ${$((gal / 1000) * wr)} · energy ${$(kwh * el)} · detergent ${$(det)}` };
};
export const dishes: Calc = (v) => {
  const el = p(v, "e", 0.17), wr = p(v, "w", 12), loads = p(v, "n", 5), dk = p(v, "dk", 1.2), dg = p(v, "dg", 4), hg = p(v, "hg", 20), det = p(v, "d", 0.2), heff = Math.max(0.3, p(v, "h", 90) / 100);
  const heat = (g: number) => (g * 8.34 * 70) / 3412 / heff;
  const dw = dk * el + (dg / 1000) * wr + det, hw = heat(hg * 0.7) * el + (hg / 1000) * wr + 0.05;
  return { dw: `${$(dw)} per dishwasher load`, hw: `${$(hw)} washing the same by hand`, yr: `${dw < hw ? "Dishwasher" : "Hand washing"} saves ${$0(Math.abs(hw - dw) * loads * 52)} a year · ${nfmt(Math.round((hg - dg) * loads * 52))} gallons of water` };
};
export const toiletPaper: Calc = (v) => {
  const ppl = p(v, "p", 4), sh = p(v, "s", 57), per = need(p(v, "r", 250), "Enter sheets per roll."), price = p(v, "c", 0.75);
  const rolls = (ppl * sh * 365) / per;
  return { rolls: `${nfmt(Math.round(rolls))} rolls a year`, cost: `${$0(rolls * price)} a year (${$(rolls * price / 12)} a month)`, wk: `${(rolls / 52).toFixed(1)} rolls a week` };
};
export const activities: Calc = (v) => {
  const kids = Math.max(1, p(v, "k", 2)), fees = p(v, "f", 350) * p(v, "s", 3), eq = p(v, "e", 200), mi = p(v, "m", 600), rate = p(v, "r", 0.3), extra = p(v, "x", 250);
  const per = fees + eq + mi * rate + extra;
  return { tot: `${$0(per * kids)} a year for ${kids} kid${kids === 1 ? "" : "s"}`, per: `${$0(per)} per child`, mo: `${$0((per * kids) / 12)} a month` };
};
export const lunch: Calc = (v) => {
  const kids = p(v, "k", 2), days = p(v, "d", 180), buy = p(v, "b", 3.25), pack = p(v, "p", 2.4);
  return { buy: `${$0(kids * days * buy)} a year buying lunch`, pack: `${$0(kids * days * pack)} a year packing lunch`, diff: `${$0(Math.abs(buy - pack) * kids * days)} ${pack < buy ? "saved by packing" : "saved by buying"}` };
};
export const teenCar: Calc = (v) => {
  const car = p(v, "c", 9000), yrs = Math.max(1, p(v, "y", 4)), ins = p(v, "i", 3200), mi = p(v, "m", 6000), mpg = need(p(v, "g", 28), "Enter mpg."), gas = p(v, "p", 3.3), mnt = p(v, "mt", 800), reg = p(v, "r", 200);
  const yr = car / yrs + ins + (mi / mpg) * gas + mnt + reg;
  return { yr: `${$0(yr)} a year`, mo: `${$0(yr / 12)} a month`, parts: `Car ${$0(car / yrs)} · insurance ${$0(ins)} · gas ${$0((mi / mpg) * gas)} · upkeep ${$0(mnt + reg)}` };
};
export const prom: Calc = (v) => {
  const tot = sum(v, ["t", "a", "s", "h", "f", "r", "ph", "x"], [120, 300, 80, 150, 50, 100, 60, 75]), split = Math.max(1, p(v, "n", 1));
  return { tot: `${$0(tot)} total`, per: split > 1 ? `${$0(tot / split)} each split ${split} ways` : "Not split", note: "Limo or party bus costs drop sharply when split among a group" };
};
export const parentCare: Calc = (v) => {
  const cost = need(p(v, "c", 5000), "Enter monthly care cost."), inc = [p(v, "a", 90000), p(v, "b", 60000), p(v, "s", 40000)], hrs = p(v, "h", 0), rate = p(v, "r", 25);
  const ti = inc.reduce((a, b) => a + b, 0), net = Math.max(0, cost - hrs * 4.33 * rate), n = inc.filter((x) => x > 0).length || 1;
  return { inc: inc.map((x, i) => (x ? `Sibling ${i + 1} ${$0((net * x) / Math.max(ti, 1))}` : "")).filter(Boolean).join(" · ") + " a month (by income)", eq: `${$0(net / n)} each if split equally`, credit: hrs ? `${$0(hrs * 4.33 * rate)} a month credited for ${hrs} hands-on care hours a week` : "Add hands-on care hours to credit the sibling providing care" };
};
export const secondChild: Calc = (v) => {
  const yr = p(v, "a", 17000), first = p(v, "f", 4000), cc = p(v, "c", 12000), ccY = p(v, "cy", 5), econ = p(v, "e", 20) / 100, hand = p(v, "h", 1500);
  const tot = Math.max(0, first - hand) + yr * (1 - econ) * 18 + cc * ccY;
  return { tot: `${$0(tot)} to age 18`, yr: `${$0(yr * (1 - econ))} a year ongoing after ${pc(econ)} economies of scale`, mo: `${$0(tot / 216)} a month on average` };
};
export const twins: Calc = (v) => {
  const di = p(v, "d", 8) * p(v, "dc", 0.25) * 365 * 2, form = p(v, "f", 150) * 12 * 2 * (p(v, "fp", 50) / 100), gear = p(v, "g", 3500), care = p(v, "c", 1200) * p(v, "cm", 6) * 2, med = p(v, "m", 2000);
  const tot = di + form + gear + care + med;
  return { tot: `${$0(tot)} in the first year`, mo: `${$0(tot / 12)} a month`, parts: `Diapers ${$0(di)} · formula ${$0(form)} · gear ${$0(gear)} · childcare ${$0(care)} · medical ${$0(med)}` };
};
export const health: Calc = (v) => {
  const prem = p(v, "p", 550) * 12, ded = p(v, "d", 3000), use = p(v, "u", 60) / 100, visits = p(v, "v", 12) * p(v, "c", 35), rx = p(v, "r", 40) * 12, dv = p(v, "dv", 600), hsa = p(v, "h", 3000), tax = p(v, "t", 22) / 100;
  const oop = ded * use + visits + rx + dv, tot = prem + oop;
  return { tot: `${$0(tot)} a year (${$0(tot / 12)} a month)`, parts: `Premiums ${$0(prem)} · out of pocket ${$0(oop)}`, hsa: hsa ? `HSA contributions save about ${$0(hsa * (tax + 0.0765))} in tax (if through payroll)` : "—" };
};
export const supplies: Calc = (v) => {
  const tot = sum(v, ["a", "b", "c", "d", "e", "f"], [12, 10, 8, 15, 6, 10]), ppl = Math.max(1, p(v, "p", 4));
  return { mo: `${$(tot)} a month`, yr: `${$0(tot * 12)} a year`, per: `${$(tot / ppl)} per person a month` };
};

// ---- registry (generated)
export const ideaFin1CustomCalculators: Record<string, Calc> = {
  "80-20-budget-rule-calculator": rule8020,
  "70-20-10-budget-rule-calculator": rule702010,
  "60-40-budget-rule-calculator": rule6040,
  "kakeibo-budget-calculator": kakeibo,
  "cash-stuffing-envelope-split-calculator": envelopes,
  "paycheck-to-paycheck-budget-calculator": p2p,
  "reverse-budget-savings-first-calculator": reverse,
  "annual-expense-monthly-set-aside-calculator": setAside,
  "budget-surplus-deficit-calculator": surplus,
  "fixed-vs-variable-expense-split-calculator": fixedVar,
  "spending-ratio-by-category-calculator": ratios,
  "latte-factor-calculator": latte,
  "no-spend-challenge-savings-calculator": noSpend,
  "money-saving-challenge-100-envelope-calculator": envelope100,
  "penny-doubling-challenge-calculator": penny,
  "year-end-budget-review-calculator": yearReview,
  "debt-to-savings-allocation-calculator": debtVsSave,
  "stay-at-home-parent-value-calculator": sahp,
  "family-grocery-cost-by-size-calculator": groceryFamily,
  "household-chore-value-calculator": chores,
  "cost-of-living-single-vs-couple-calculator": singleCouple,
  "shared-expense-split-by-income-calculator": splitIncome,
  "family-cell-phone-plan-split-calculator": phonePlan,
  "streaming-services-total-cost-calculator": streaming,
  "internet-cost-per-mbps-calculator": mbps,
  "laundry-cost-per-load-calculator": laundry,
  "dishwasher-vs-hand-washing-cost-calculator": dishes,
  "toilet-paper-usage-cost-calculator": toiletPaper,
  "kids-activity-cost-calculator": activities,
  "school-lunch-cost-calculator": lunch,
  "teen-first-car-cost-calculator": teenCar,
  "prom-cost-calculator": prom,
  "elderly-parent-care-cost-share-calculator": parentCare,
  "cost-of-a-second-child-calculator": secondChild,
  "twins-cost-first-year-calculator": twins,
  "family-health-spending-calculator": health,
  "household-paper-and-cleaning-supplies-cost-calculator": supplies,
};
