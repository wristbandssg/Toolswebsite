/**
 * Idea build, batch fin6 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Interest Rates (5), Alternative Investments (7), Bonds & Fixed Income (10), Funds & ETFs (10) = 32 tools.
 * Bond maths: price = Σ C/(1+y/f)^t + F/(1+y/f)^n; yields solved by bisection. Macaulay duration = Σ t·PV(CF) ÷ price (in years);
 * modified = Macaulay ÷ (1 + y/f); convexity = Σ t(t+1)·PV(CF) ÷ (price·(1+y/f)²·f²).
 * T-bill yields: bank discount = (F−P)/F × 360/d; money market = (F−P)/P × 360/d; effective annual = (F/P)^(365/d) − 1.
 * SEC 30-day yield = 2 × [((a − b)/(c·d) + 1)^6 − 1].
 * Leveraged ETF decay ≈ (1+R)^L × e^(−(L²−L)σ²T/2) − 1 (continuous-rebalancing approximation).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 2) => `${(x * 100).toFixed(dp)}%`;
const sg = (x: number, dp = 2) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(dp)}%`;
const bp = (x: number) => `${Math.round(x * 10000)} bp`;

function solve(f: (r: number) => number, lo = -0.99, hi = 10): number {
  let a = lo, b = hi, fa = f(a);
  if (fa * f(b) > 0) return NaN;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } }
  return (a + b) / 2;
}
const irr = (cfs: number[]) => solve((r) => cfs.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0));
const cagr = (end: number, start: number, y: number) => (start > 0 && end > 0 && y > 0 ? Math.pow(end / start, 1 / y) - 1 : NaN);
const fvSeries = (start: number, add: number, r: number, y: number) => { let b = start; for (let k = 0; k < y; k++) b = b * (1 + r) + add; return b; };

// ---- Interest rates ----
export const curveSpread: Calc = (v) => {
  const l = num(v.l, 4.4) / 100, s = num(v.s, 3.9) / 100, s2 = p(v, "s2", 0) / 100;
  const sp = l - s;
  return { sp: `${bp(sp)} spread (${pc(sp)})`, shape: sp < 0 ? "Inverted — historically a recession warning" : sp < 0.0025 ? "Flat" : "Normal (upward sloping)", alt: s2 > 0 ? `vs 3-month: ${bp(l - s2)}` : "Add the 3-month yield for the 10y–3m spread" };
};
export const varRate: Calc = (v) => {
  const B = need(p(v, "b", 250000), "Enter the balance."), n = Math.max(1, Math.round(p(v, "n", 300))), r0 = p(v, "r0", 6.5) / 1200, r1 = p(v, "r1", 7.5) / 1200;
  const pm = (r: number) => (r === 0 ? B / n : (B * r) / (1 - Math.pow(1 + r, -n))), a = pm(r0), b = pm(r1);
  return { pay: `${$(b)} a month (was ${$(a)})`, chg: `${b >= a ? "+" : "−"}${$(Math.abs(b - a))} a month · ${b >= a ? "+" : "−"}${$0(Math.abs(b - a) * 12)} a year`, life: `${b >= a ? "+" : "−"}${$0(Math.abs(b - a) * n)} over the remaining ${n} months if the rate stays` };
};
export const fedImpact: Calc = (v) => {
  const d = num(v.d, -25) / 10000, cc = p(v, "cc", 6000), he = p(v, "he", 40000), vl = p(v, "vl", 0), sv = p(v, "sv", 20000), pt = p(v, "pt", 60) / 100;
  const debt = (cc + he + vl) * d, save = sv * d * pt, net = save - debt;
  return { net: `${net >= 0 ? "+" : "−"}${$0(Math.abs(net))} a year net effect on you`, debt: `Variable debt interest ${debt >= 0 ? "+" : "−"}${$0(Math.abs(debt))} a year (cards, HELOC, variable loans)`, save: `Savings interest ${save >= 0 ? "+" : "−"}${$0(Math.abs(save))} a year (${pc(pt, 0)} pass-through)` };
};
const tbill = (v: Record<string, number>) => {
  const F = need(p(v, "f", 10000), "Enter face value."), P = need(p(v, "p", 9880), "Enter the price."), d = need(p(v, "d", 182), "Enter days to maturity.");
  if (P >= F) throw new InputError("Price must be below face value for a discount instrument.");
  const hpy = (F - P) / P;
  return { F, P, d, hpy, bdy: ((F - P) / F) * (360 / d), mmy: hpy * (360 / d), eay: Math.pow(1 + hpy, 365 / d) - 1, bey: hpy * (365 / d) };
};
export const bdy: Calc = (v) => { const t = tbill(v); return { bdy: `${pc(t.bdy, 3)} bank discount yield`, mmy: `Money market yield ${pc(t.mmy, 3)} · bond-equivalent ${pc(t.bey, 3)}`, eay: `Effective annual yield ${pc(t.eay, 3)} · discount ${$(t.F - t.P)}` }; };
export const mmy: Calc = (v) => { const t = tbill(v); return { mmy: `${pc(t.mmy, 3)} money market yield (360-day)`, hpy: `Holding period yield ${pc(t.hpy, 3)} over ${t.d} days`, eay: `Effective annual ${pc(t.eay, 3)} · bank discount ${pc(t.bdy, 3)}` }; };

// ---- Alternative investments ----
const flip = (cost: number, sale: number, fee: number, y: number, label: string) => {
  const net = sale * (1 - fee) - cost, g = cagr(sale * (1 - fee), cost, y);
  return { net: `${net >= 0 ? "Profit" : "Loss"} ${$0(Math.abs(net))} on ${label}`, roi: `ROI ${sg(cost ? net / cost : 0, 1)}${Number.isFinite(g) ? ` · ${sg(g, 1)} a year over ${y} years` : ""}` };
};
export const tradingCard: Calc = (v) => {
  const b = p(v, "b", 200), g = p(v, "g", 40), s = p(v, "s", 15), sale = p(v, "sp", 450), f = p(v, "f", 13.25) / 100, y = p(v, "y", 2);
  const cost = b + g + s, r = flip(cost, sale, f, y, "the card");
  return { ...r, cost: `All-in cost ${$0(cost)} · break-even sale price ${$0(cost / (1 - f))}` };
};
export const peIrr: Calc = (v) => {
  const def = [-1000000, -500000, -300000, 200000, 600000, 900000, 1200000, 0];
  const cf = def.map((d, i) => num(v[`c${i}`], d));
  while (cf.length > 1 && cf[cf.length - 1] === 0) cf.pop();
  const paid = -cf.filter((x) => x < 0).reduce((a, b) => a + b, 0), dist = cf.filter((x) => x > 0).reduce((a, b) => a + b, 0), r = irr(cf);
  if (!paid) throw new InputError("Enter capital calls as negative numbers.");
  return { irr: Number.isFinite(r) ? `${pc(r, 1)} IRR` : "IRR undefined for these cash flows", mult: `${(dist / paid).toFixed(2)}× net multiple (DPI)`, cash: `${$0(paid)} paid in · ${$0(dist)} distributed · ${$0(dist - paid)} profit` };
};
export const vcMultiple: Calc = (v) => {
  const inv = need(p(v, "i", 250000), "Enter amount invested."), d = p(v, "d", 100000), nav = p(v, "n", 600000), y = need(p(v, "y", 6), "Enter years held.");
  const tvpi = (d + nav) / inv, g = cagr(d + nav, inv, y);
  return { tvpi: `${tvpi.toFixed(2)}× TVPI (MOIC)`, parts: `DPI ${(d / inv).toFixed(2)}× realized · RVPI ${(nav / inv).toFixed(2)}× unrealized`, irr: Number.isFinite(g) ? `≈ ${pc(g, 1)} a year (assumes one entry and exit)` : "—" };
};
export const crowdRe: Calc = (v) => {
  const inv = need(p(v, "i", 10000), "Enter amount invested."), cy = p(v, "cy", 5) / 100, ap = num(v.ap, 3) / 100, y = Math.max(1, Math.round(p(v, "y", 5))), pref = p(v, "pr", 8) / 100, pro = p(v, "pm", 20) / 100, fee = p(v, "f", 1) / 100;
  const dist = inv * (cy - fee) * y, exit = inv * Math.pow(1 + ap, y), profit = dist + exit - inv, prefAmt = inv * pref * y, promo = Math.max(0, profit - prefAmt) * pro, net = profit - promo;
  const cf = [-inv, ...Array.from({ length: y }, (_, k) => inv * (cy - fee) + (k === y - 1 ? exit - promo : 0))];
  const r = irr(cf);
  return { net: `${$0(net)} net profit (${sg(net / inv, 1)})`, irr: Number.isFinite(r) ? `≈ ${pc(r, 1)} IRR` : "—", parts: `Distributions ${$0(dist)} · exit value ${$0(exit)} · sponsor promote ${$0(promo)}`, note: "Illiquid — you usually can't sell early" };
};
export const hedgeFee: Calc = (v) => {
  const A = need(p(v, "a", 1000000), "Enter amount invested."), g = num(v.g, 10) / 100, mf = p(v, "mf", 2) / 100, pf = p(v, "pf", 20) / 100, h = p(v, "h", 0) / 100, y = Math.max(1, Math.round(p(v, "y", 10)));
  let b = A, hwm = A, fees = 0, gross = A;
  for (let k = 0; k < y; k++) {
    gross *= 1 + g; const start = b; b *= 1 + g; const m = b * mf; b -= m; fees += m;
    const hurdle = Math.max(hwm, start * (1 + h)), perf = b > hurdle ? (b - hurdle) * pf : 0; b -= perf; fees += perf; hwm = Math.max(hwm, b);
  }
  return { net: `${$0(b)} after fees vs ${$0(gross)} gross`, fees: `${$0(fees)} total fees (${pc(fees / Math.max(gross - A, 1), 0)} of gross profit)`, ret: `Net ${pc(cagr(b, A, y), 2)} a year vs ${pc(g)} gross` };
};
export const whisky: Calc = (v) => {
  const c = need(p(v, "c", 6000), "Enter cask price."), st = p(v, "st", 120), y = Math.max(1, p(v, "y", 8)), gr = num(v.g, 8) / 100, an = p(v, "an", 2) / 100, f = p(v, "f", 10) / 100;
  const val = c * Math.pow(1 + gr, y) * Math.pow(1 - an, y), cost = c + st * y, net = val * (1 - f) - cost;
  return { net: `${net >= 0 ? "Profit" : "Loss"} ${$0(Math.abs(net))} after ${y} years`, val: `Estimated sale value ${$0(val)} (after ${pc(1 - Math.pow(1 - an, y), 0)} angels' share loss)`, roi: `${sg(net / cost, 1)} on ${$0(cost)} invested incl. storage`, note: "Cask values are speculative and illiquid; beware unregulated cask schemes" };
};
export const domainInv: Calc = (v) => {
  const b = p(v, "b", 500), r = p(v, "r", 12), y = p(v, "y", 3), sp = p(v, "sp", 3000), f = p(v, "f", 15) / 100;
  const cost = b + r * y, rr = flip(cost, sp, f, y, "the domain");
  return { ...rr, cost: `All-in cost ${$0(cost)} · ${$0(sp * f)} marketplace commission` };
};

// ---- Bonds ----
interface Bond { F: number; c: number; f: number; n: number; red: number }
const bondPV = (b: Bond, y: number) => { const r = y / b.f, cpn = (b.F * b.c) / b.f; let s = 0; for (let t = 1; t <= b.n; t++) s += cpn / Math.pow(1 + r, t); return s + b.red / Math.pow(1 + r, b.n); };
const bondY = (b: Bond, price: number) => solve((y) => bondPV(b, y) - price, -0.5, 2);
const FREQ = [2, 1, 4, 12];
const readBond = (v: Record<string, number>, yrsKey = "y", redKey?: string): Bond => {
  const F = need(p(v, "f", 1000), "Enter face value."), c = p(v, "c", 5) / 100, f = FREQ[pick(v.q, 4)], yrs = need(p(v, yrsKey, 10), "Enter years.");
  return { F, c, f, n: Math.max(1, Math.round(yrs * f)), red: redKey ? p(v, redKey, F) : F };
};
export const ytc: Calc = (v) => {
  const pr = need(p(v, "p", 1040), "Enter the price."), call = readBond(v, "yc", "cp"), mat = readBond(v, "y"), yc = bondY(call, pr), ym = bondY(mat, pr);
  return { ytc: `${pc(yc, 3)} yield to call`, ytm: `${pc(ym, 3)} yield to maturity`, worst: `Yield to worst: ${pc(Math.min(yc, ym), 3)} (${yc < ym ? "call" : "maturity"})` };
};
export const ytw: Calc = (v) => {
  const pr = need(p(v, "p", 1040), "Enter the price."), call = readBond(v, "yc", "cp"), mat = readBond(v, "y"), yc = bondY(call, pr), ym = bondY(mat, pr);
  const w = Math.min(yc, ym);
  return { ytw: `${pc(w, 3)} yield to worst`, which: `Worst case: ${yc < ym ? "bond is called" : "held to maturity"}`, both: `YTC ${pc(yc, 3)} · YTM ${pc(ym, 3)} · current yield ${pc((call.F * call.c) / pr, 3)}` };
};
export const cleanDirty: Calc = (v) => {
  const F = need(p(v, "f", 1000), "Enter face value."), c = p(v, "c", 5) / 100, f = FREQ[pick(v.q, 4)], ds = p(v, "ds", 60), dp = need(p(v, "dp", 182), "Enter days in the coupon period."), cl = need(p(v, "cl", 98.5), "Enter the clean price.");
  const ai = ((F * c) / f) * Math.min(1, ds / dp), clean = (cl / 100) * F;
  return { dirty: `${$(clean + ai)} dirty (invoice) price`, ai: `${$(ai)} accrued interest (${ds}/${dp} of a ${$((F * c) / f)} coupon)`, pct: `Clean ${cl.toFixed(3)} · dirty ${(((clean + ai) / F) * 100).toFixed(3)} per 100` };
};
const durations = (b: Bond, y: number) => {
  const r = y / b.f, cpn = (b.F * b.c) / b.f; let pv = 0, w = 0, cx = 0;
  for (let t = 1; t <= b.n; t++) { const cf = cpn + (t === b.n ? b.red : 0), d = cf / Math.pow(1 + r, t); pv += d; w += t * d; cx += t * (t + 1) * d; }
  const mac = w / pv / b.f, mod = mac / (1 + r), conv = cx / (pv * Math.pow(1 + r, 2) * b.f * b.f);
  return { pv, mac, mod, conv };
};
const bondYtm = (v: Record<string, number>) => num(v.ytm, 5.5) / 100;
export const macaulay: Calc = (v) => { const b = readBond(v), d = durations(b, bondYtm(v)); return { mac: `${d.mac.toFixed(3)} years Macaulay duration`, mod: `Modified duration ${d.mod.toFixed(3)}`, price: `Price ${$(d.pv)} (${((d.pv / b.F) * 100).toFixed(3)} per 100)` }; };
export const modDur: Calc = (v) => {
  const b = readBond(v), y = bondYtm(v), d = durations(b, y), dy = num(v.dy, 100) / 10000;
  return { mod: `${d.mod.toFixed(3)} modified duration`, chg: `A ${Math.round(dy * 10000)} bp rise ≈ ${sg(-d.mod * dy)} price change (${$(-d.mod * dy * d.pv)})`, dv01: `DV01 ${$(d.mod * d.pv * 0.0001, 4)} per bond · price ${$(d.pv)}` };
};
export const convexity: Calc = (v) => {
  const b = readBond(v), y = bondYtm(v), d = durations(b, y), dy = num(v.dy, 100) / 10000;
  const est = -d.mod * dy + 0.5 * d.conv * dy * dy, act = bondPV(b, y + dy) / d.pv - 1;
  return { conv: `Convexity ${d.conv.toFixed(2)}`, est: `Duration + convexity estimate for ${Math.round(dy * 10000)} bp: ${sg(est, 3)}`, act: `Actual repriced change: ${sg(act, 3)} (duration alone: ${sg(-d.mod * dy, 3)})` };
};
export const muniTey: Calc = (v) => {
  const y = p(v, "y", 3.5) / 100, fed = p(v, "fd", 32) / 100, st = p(v, "st", 5) / 100, ins = pick(v.i, 2) === 1, niit = pick(v.n, 2) === 1 ? 0.038 : 0;
  const t = ins ? fed + niit + st : fed + niit, tey = y / (1 - Math.min(0.95, t)), taxable = p(v, "tb", 4.6) / 100;
  return { tey: `${pc(tey)} tax-equivalent yield`, rate: `Combined tax rate used ${pc(t, 1)}${ins ? " (in-state muni, state tax exempt)" : " (out-of-state: state tax applies to both)"}`, cmp: taxable > 0 ? `${tey > taxable ? "Muni wins" : "Taxable bond wins"} vs ${pc(taxable)} taxable` : "Enter a taxable yield to compare" };
};
export const bondLadder: Calc = (v) => {
  const A = need(p(v, "a", 100000), "Enter amount."), n = Math.max(1, Math.round(p(v, "n", 5))), gap = Math.max(0.25, p(v, "g", 1)), ys = p(v, "ys", 3.9) / 100, yl = p(v, "yl", 4.4) / 100;
  const per = A / n, ys2 = Array.from({ length: n }, (_, i) => (n === 1 ? ys : ys + ((yl - ys) * i) / (n - 1))), avg = ys2.reduce((s, x) => s + x, 0) / n;
  return { per: `${$0(per)} in each of ${n} rungs (${gap}–${nfmt(gap * n, 1)} years)`, inc: `${$0(A * avg)} a year interest · average yield ${pc(avg)}`, list: ys2.map((y, i) => `${nfmt(gap * (i + 1), 1)}y ${pc(y)}`).join(" · ") };
};
export const corpSpread: Calc = (v) => {
  const c = p(v, "c", 5.6) / 100, t = p(v, "t", 4.4) / 100, rr = Math.min(0.99, p(v, "r", 40) / 100);
  const s = c - t;
  return { sp: `${bp(s)} credit spread`, pd: s > 0 ? `Implied default probability ≈ ${pc(s / (1 - rr))} a year (at ${pc(rr, 0)} recovery)` : "No positive spread", read: s < 0.01 ? "Investment-grade-like spread" : s < 0.04 ? "BBB / BB territory" : "High-yield / distressed territory" };
};
export const secYield: Calc = (v) => {
  const a = p(v, "a", 410000), b = p(v, "b", 45000), c = need(p(v, "c", 9500000), "Enter average shares."), d = need(p(v, "d", 10.2), "Enter max offering price.");
  const y = 2 * (Math.pow((a - b) / (c * d) + 1, 6) - 1);
  return { y: `${pc(y)} SEC 30-day yield`, inc: `Net investment income per share ${$((a - b) / c, 4)} for the month`, note: "Standard formula from SEC Form N-1A; compare it with distribution yield, which can include return of capital" };
};

// ---- Funds & ETFs ----
export const frontLoad: Calc = (v) => {
  const A = need(p(v, "a", 25000), "Enter amount."), l = p(v, "l", 5.75) / 100, r = num(v.r, 7) / 100, y = Math.max(1, Math.round(p(v, "y", 20))), e1 = p(v, "e1", 0.85) / 100, e2 = p(v, "e2", 0.1) / 100;
  const a = fvSeries(A * (1 - l), 0, r - e1, y), b = fvSeries(A, 0, r - e2, y);
  return { cost: `The load costs ${$0(A * l)} upfront`, end: `Loaded fund ${$0(a)} vs no-load ${$0(b)} after ${y} years`, gap: `Difference ${$0(b - a)} (${pc((b - a) / b, 1)} of the no-load result)` };
};
export const indexActive: Calc = (v) => {
  const A = need(p(v, "a", 50000), "Enter amount."), add = p(v, "ad", 6000), r = num(v.r, 7) / 100, y = Math.max(1, Math.round(p(v, "y", 25))), ie = p(v, "ie", 0.05) / 100, ae = p(v, "ae", 0.75) / 100, al = num(v.al, 0) / 100, td = p(v, "td", 0.5) / 100;
  const i = fvSeries(A, add, r - ie, y), a = fvSeries(A, add, r - ae + al - td, y);
  return { win: `${i >= a ? "Index fund" : "Active fund"} ends ${$0(Math.abs(i - a))} ahead`, i: `Index: ${$0(i)}`, a: `Active: ${$0(a)} (needs ${pc(ae - ie + td)} a year of alpha just to match)` };
};
export const trackingErr: Calc = (v) => {
  const f: number[] = [], ix: number[] = [];
  [[1.2, 1.25], [-0.8, -0.75], [2.1, 2.2], [0.4, 0.38], [-1.5, -1.42], [1.0, 1.05]].forEach(([a, b], i) => { const x = num(v[`f${i + 1}`], a), y = num(v[`i${i + 1}`], b); if (Number.isFinite(x) && Number.isFinite(y)) { f.push(x / 100); ix.push(y / 100); } });
  if (f.length < 2) throw new InputError("Enter at least two periods.");
  const d = f.map((x, i) => x - ix[i]), mean = d.reduce((a, b) => a + b, 0) / d.length, sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / (d.length - 1)), per = Math.max(1, p(v, "pp", 12));
  return { te: `${pc(sd * Math.sqrt(per), 3)} annualized tracking error`, per: `${pc(sd, 3)} per period over ${d.length} periods`, diff: `Average tracking difference ${sg(mean, 3)} per period` };
};
export const divEtf: Calc = (v) => {
  const A = need(p(v, "a", 100000), "Enter amount."), dy = p(v, "dy", 3.5) / 100, g = num(v.g, 5) / 100, pg = num(v.pg, 3) / 100, y = Math.max(1, Math.round(p(v, "y", 10))), re = pick(v.re, 2) === 1, t = p(v, "t", 15) / 100;
  let sh = A, div = 0, inc = 0;
  for (let k = 0; k < y; k++) { const d = sh * dy * Math.pow((1 + g) / (1 + pg), k) * (1 - t); div += d; inc = d; sh = sh * (1 + pg) + (re ? d : 0); }
  return { now: `${$0(A * dy * (1 - t))} a year after tax now (${$0((A * dy * (1 - t)) / 12)}/month)`, later: `${$0(inc)} a year in year ${y}`, tot: `${$0(div)} total dividends · ${re ? "reinvested" : "taken as cash"} · value ${$0(sh)}` };
};
export const threeFund: Calc = (v) => {
  const T = need(p(v, "t", 100000), "Enter portfolio size."), us = p(v, "us", 50), it = p(v, "it", 30), bd = p(v, "bd", 20);
  if (Math.abs(us + it + bd - 100) > 0.01) throw new InputError("Allocations must add to 100%.");
  const e = (us * p(v, "e1", 0.03) + it * p(v, "e2", 0.05) + bd * p(v, "e3", 0.03)) / 100;
  return { amt: `US stocks ${$0((T * us) / 100)} · international ${$0((T * it) / 100)} · bonds ${$0((T * bd) / 100)}`, er: `Blended expense ratio ${e.toFixed(3)}% = ${$(T * e / 100)} a year`, mix: `${us + it}% stocks / ${bd}% bonds` };
};
export const overlap: Calc = (v) => {
  let o = 0, n = 0;
  [[7, 21], [6, 19], [5, 14], [3, 9], [2, 6], [0, 0]].forEach(([a, b], i) => { const x = p(v, `a${i + 1}`, a), y = p(v, `b${i + 1}`, b); if (x > 0 && y > 0) { o += Math.min(x, y); n++; } });
  return { ov: `${o.toFixed(1)}% overlap by weight`, n: `${n} shared holding${n === 1 ? "" : "s"} entered`, read: o >= 50 ? "High overlap — the funds largely duplicate each other" : o >= 20 ? "Moderate overlap" : "Low overlap — good diversification between them" };
};
export const levDecay: Calc = (v) => {
  const L = need(p(v, "l", 3), "Enter leverage."), R = num(v.r, 0) / 100, s = p(v, "s", 1.5) / 100, d = Math.max(1, Math.round(p(v, "d", 252)));
  const lr = Math.pow(1 + R, L) * Math.exp((-(L * L - L) * s * s * d) / 2) - 1, naive = L * R;
  return { lr: `${sg(lr, 1)} expected ${L}× fund return`, naive: `vs ${sg(naive, 1)} if it simply multiplied the ${sg(R, 1)} index move`, drag: `Volatility decay ≈ ${pc(1 - Math.exp((-(L * L - L) * s * s * d) / 2), 1)} over ${d} trading days` };
};
export const capDist: Calc = (v) => {
  const V = need(p(v, "v", 50000), "Enter position value."), dp = p(v, "d", 6) / 100, st = p(v, "st", 20) / 100, lt = p(v, "lt", 15) / 100, it = p(v, "it", 24) / 100;
  const dist = V * dp, tax = dist * (1 - st) * lt + dist * st * it;
  return { tax: `${$0(tax)} tax on a ${$0(dist)} distribution`, split: `Long-term ${$0(dist * (1 - st))} · short-term ${$0(dist * st)} (taxed as income)`, note: "NAV drops by the distribution — avoid buying just before the record date in a taxable account" };
};
export const roboFee: Calc = (v) => {
  const B = p(v, "b", 50000), add = p(v, "ad", 6000), r = num(v.r, 7) / 100, y = Math.max(1, Math.round(p(v, "y", 30))), rf = p(v, "rf", 0.25) / 100, re = p(v, "re", 0.1) / 100, de = p(v, "de", 0.04) / 100;
  const a = fvSeries(B, add, r - rf - re, y), b = fvSeries(B, add, r - de, y);
  return { cost: `Robo-advisor costs ${$0(b - a)} over ${y} years`, a: `Robo: ${$0(a)} (${pc(rf + re)} all-in)`, b: `DIY index funds: ${$0(b)} (${pc(de)})` };
};
export const advisorFee: Calc = (v) => {
  const B = need(p(v, "b", 500000), "Enter portfolio value."), add = p(v, "ad", 0), r = num(v.r, 7) / 100, y = Math.max(1, Math.round(p(v, "y", 20))), f = p(v, "f", 1) / 100;
  const a = fvSeries(B, add, r - f, y), b = fvSeries(B, add, r, y);
  return { cost: `${$0(b - a)} lost to a ${pc(f)} fee over ${y} years`, a: `With advisor: ${$0(a)} · without: ${$0(b)}`, share: `The fee consumes ${pc((b - a) / b, 1)} of your ending wealth · ${$0(B * f)} in year one` };
};

// ---- registry (generated)
export const ideaFin6CustomCalculators: Record<string, Calc> = {
  "yield-curve-spread-calculator": curveSpread,
  "variable-rate-payment-change-calculator": varRate,
  "federal-funds-rate-impact-calculator": fedImpact,
  "money-market-yield-calculator": mmy,
  "bank-discount-yield-calculator": bdy,
  "trading-card-investment-calculator": tradingCard,
  "private-equity-irr-calculator": peIrr,
  "venture-capital-return-multiple-calculator": vcMultiple,
  "crowdfunding-real-estate-return-calculator": crowdRe,
  "hedge-fund-fee-2-and-20-calculator": hedgeFee,
  "whisky-cask-investment-calculator": whisky,
  "domain-name-investment-calculator": domainInv,
  "yield-to-call-calculator": ytc,
  "yield-to-worst-calculator": ytw,
  "clean-vs-dirty-price-calculator": cleanDirty,
  "macaulay-duration-calculator": macaulay,
  "modified-duration-calculator": modDur,
  "bond-convexity-calculator": convexity,
  "municipal-bond-tax-equivalent-yield-calculator": muniTey,
  "bond-ladder-calculator": bondLadder,
  "corporate-bond-spread-calculator": corpSpread,
  "bond-fund-yield-sec-calculator": secYield,
  "front-load-fund-cost-calculator": frontLoad,
  "index-fund-vs-active-fund-calculator": indexActive,
  "fund-tracking-error-calculator": trackingErr,
  "dividend-etf-income-calculator": divEtf,
  "three-fund-portfolio-calculator": threeFund,
  "fund-overlap-calculator": overlap,
  "leveraged-etf-decay-calculator": levDecay,
  "fund-capital-gains-distribution-calculator": capDist,
  "robo-advisor-fee-cost-calculator": roboFee,
  "financial-advisor-fee-impact-calculator": advisorFee,
};
