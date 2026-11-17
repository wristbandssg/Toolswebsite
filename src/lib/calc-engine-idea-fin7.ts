/**
 * Idea build, batch fin7 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Investment Returns & Planning (11), Stocks & Options (19) = 30 tools.
 * Options: Black-Scholes-Merton with continuous dividend yield q. d1 = [ln(S/K) + (r − q + σ²/2)T] ÷ σ√T, d2 = d1 − σ√T.
 * Strategy tools analyse the piecewise-linear expiry payoff at every strike (max profit/loss, breakevens, P/L at a price).
 * 2026 US figures (IRS Rev. Proc. 2025-32 / SSA): AMT exemption $90,100 single, $140,200 MFJ; phase-out from $500,000 / $1,000,000
 * at 50% (OBBBA); 26% → 28% at $244,500 of AMTI after exemption. Brackets single 12,400/50,400/105,700/201,775/256,225/640,600,
 * MFJ 24,800/100,800/211,400/403,550/512,450/768,700; standard deduction $16,100 / $32,200. Social Security wage base $184,500.
 * Supplemental withholding 22% (37% above $1M). Kiddie tax: first $1,350 of unearned income tax-free, next $1,350 at the child's
 * rate, above $2,700 at the parent's rate. Gift-tax annual exclusion $19,000 per donor per child.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt, dateIn, dayText } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 2) => `${(x * 100).toFixed(dp)}%`;
const sg = (x: number, dp = 2) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(dp)}%`;
const pm = (x: number, dp = 0) => `${x >= 0 ? "+" : "−"}${money(Math.abs(x), "$", dp)}`;

function solve(f: (r: number) => number, lo: number, hi: number): number {
  let a = lo, b = hi, fa = f(a);
  if (fa * f(b) > 0) return NaN;
  for (let i = 0; i < 200; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } }
  return (a + b) / 2;
}
/** Parses a list of numbers typed with commas, spaces or new lines. */
function series(v: Record<string, number>, key: string, min: number, label = "prices"): number[] {
  const xs = txt(v, key).split(/[\s,;]+/).map((s) => s.replace(/[$]/g, "")).filter(Boolean).map(Number);
  if (xs.some((x) => !Number.isFinite(x) || x <= 0)) throw new InputError(`Enter positive ${label} separated by commas or spaces.`);
  if (xs.length < min) throw new InputError(`Enter at least ${min} ${label}.`);
  return xs;
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[], sample = true) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - (sample ? 1 : 0))); };

// ---- Investment returns & planning ----
export const twr: Calc = (v) => {
  const v0 = need(p(v, "v0", 10000), "Enter the starting value.");
  const defs: [number, number][] = [[0, 11000], [5000, 15500], [-2000, 14200], [0, 15000]];
  let start = v0, g = 1, flows = 0, n = 0, end = v0;
  const parts: string[] = [];
  defs.forEach(([fd, ed], i) => {
    const e = p(v, `e${i + 1}`, ed); if (!e) return;
    const f = num(v[`f${i + 1}`], fd), base = start + f;
    if (base <= 0) throw new InputError(`Period ${i + 1}: the value after the cash flow must be above zero.`);
    const r = e / base - 1; g *= 1 + r; flows += f; n++; end = e; start = e; parts.push(`P${i + 1} ${sg(r, 1)}`);
  });
  if (!n) throw new InputError("Enter at least one period end value.");
  const y = p(v, "y", 1), tw = g - 1, gain = end - v0 - flows;
  return { twr: `${sg(tw)} time-weighted return${y > 0 ? ` · ${sg(Math.pow(g, 1 / y) - 1)} a year over ${nfmt(y, 1)} years` : ""}`, per: parts.join(" · "), gain: `Dollar gain ${pm(gain)} on a ${$0(v0)} start with ${pm(flows)} net deposits (end value ${$0(end)})` };
};
export const mwr: Calc = (v) => {
  const v0 = need(p(v, "v0", 10000), "Enter the starting value."), n = Math.min(6, Math.max(1, Math.round(p(v, "n", 5)))), E = p(v, "e", 22000);
  const cf = [-v0];
  for (let t = 1; t < n; t++) cf.push(-num(v[`c${t}`], 2000));
  cf[n] = (cf[n] ?? 0) + E;
  const npv = (r: number) => cf.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0), r = solve(npv, -0.99, 10);
  const dep = -cf.slice(0, n).reduce((a, b) => a + b, 0);
  return { mwr: Number.isFinite(r) ? `${sg(r)} a year money-weighted return (IRR)` : "No single IRR for these cash flows", tot: `Total put in ${$0(dep)} · ending value ${$0(E)} · gain ${pm(E - dep)}`, note: "MWR reflects your deposit timing; use the time-weighted return to judge the investments themselves." };
};
export const afterTax: Calc = (v) => {
  const r = num(v.r, 8) / 100, oi = p(v, "oi", 1) / 100, qd = p(v, "qd", 1.5) / 100, rg = p(v, "rg", 1) / 100, to = p(v, "to", 24) / 100, tl = p(v, "tl", 15) / 100, st = p(v, "st", 5) / 100, inf = num(v.inf, 2.5) / 100;
  if (oi + qd + rg > Math.max(r, 0) + 1e-9) throw new InputError("Taxed income plus realized gains can't exceed the total return.");
  const tax = oi * (to + st) + (qd + rg) * (tl + st), at = r - tax, real = (1 + at) / (1 + inf) - 1;
  return { at: `${pc(at)} after-tax return (from ${pc(r)} pre-tax)`, drag: `Tax drag ${pc(tax)} a year · keeps ${pc(r ? at / r : 0, 0)} of the return`, real: `${sg(real)} real after tax and ${pc(inf, 1)} inflation`, note: "Unrealized gains are taxed only when sold — not counted here." };
};
export const rule114: Calc = (v) => {
  const r = need(num(v.r, 8), "Enter a positive return."), a = p(v, "a", 10000), g = Math.log(1 + r / 100);
  const ex3 = Math.log(3) / g, ex2 = Math.log(2) / g, ex4 = Math.log(4) / g;
  return { tri: `${(114 / r).toFixed(1)} years to triple (rule of 114) · exact ${ex3.toFixed(1)} years`, other: `Double in ${(72 / r).toFixed(1)} years (rule of 72; exact ${ex2.toFixed(1)}) · quadruple in ${(144 / r).toFixed(1)} (rule of 144; exact ${ex4.toFixed(1)})`, val: `${$0(a)} → ${$0(a * 3)} in about ${ex3.toFixed(1)} years at ${r}%` };
};
export const maxDrawdown: Calc = (v) => {
  const xs = series(v, "px", 2, "values");
  let peak = xs[0], pi = 0, mdd = 0, a = 0, b = 0;
  xs.forEach((x, i) => { if (x > peak) { peak = x; pi = i; } const dd = x / peak - 1; if (dd < mdd) { mdd = dd; a = pi; b = i; } });
  const rec = mdd < 0 ? xs.findIndex((x, i) => i > b && x >= xs[a]) : -1, hi = Math.max(...xs), cur = xs[xs.length - 1] / hi - 1;
  return { mdd: mdd < 0 ? `${sg(mdd)} maximum drawdown` : "No drawdown — values never fell below a prior peak", path: mdd < 0 ? `Peak ${nfmt(xs[a], 2)} (point ${a + 1}) → trough ${nfmt(xs[b], 2)} (point ${b + 1}) · needs ${sg(xs[a] / xs[b] - 1, 1)} to recover` : "—", rec: mdd < 0 ? (rec > 0 ? `Recovered at point ${rec + 1} (${rec - a} points after the peak)` : "Not yet recovered") + ` · current drawdown ${cur < 0 ? sg(cur, 1) : "0%"}` : `Current drawdown ${cur < 0 ? sg(cur, 1) : "0%"}` };
};
export const capm: Calc = (v) => {
  const rf = num(v.rf, 4.1) / 100, b = num(v.b, 1.2), rm = num(v.rm, 9) / 100, act = num(v.ac, 0) / 100, hasAct = typeof v.ac === "number" && v.ac !== 0;
  const er = rf + b * (rm - rf);
  return { er: `${pc(er)} expected (required) return`, parts: `Risk-free ${pc(rf)} + β ${b.toFixed(2)} × market premium ${pc(rm - rf)} = ${pc(rf)} + ${pc(b * (rm - rf))}`, alpha: hasAct ? `Jensen's alpha ${sg(act - er)} (actual ${pc(act)} vs expected)` : "Enter an actual return to see alpha" };
};
export const millionaire: Calc = (v) => {
  const age = p(v, "age", 30), b0 = p(v, "b", 25000), m0 = p(v, "m", 750), r = num(v.r, 7) / 100, inc = p(v, "inc", 3) / 100, T = need(p(v, "t", 1000000), "Enter a target."), inf = p(v, "inf", 2.5) / 100;
  const mr = Math.pow(1 + r, 1 / 12) - 1;
  let bal = b0, m = m0, k = 0, put = b0;
  while (bal < T && k < 12 * 80) { bal = bal * (1 + mr) + m; put += m; k++; if (k % 12 === 0) m *= 1 + inc; }
  if (bal < T) return { age: "Not reached within 80 years — raise contributions or return", yrs: "—", real: "—" };
  const yrs = k / 12;
  return { age: `Age ${Math.floor(age + yrs)} — ${$0(T)} reached in ${nfmt(yrs, 1)} years`, yrs: `You contribute ${$0(put)} · growth ${$0(bal - put)}`, real: `${$0(T / Math.pow(1 + inf, yrs))} in today's money at ${pc(inf, 1)} inflation` };
};
export const taxDeferred: Calc = (v) => {
  const P = need(p(v, "c", 7000), "Enter a yearly pre-tax amount."), y = Math.max(1, Math.round(p(v, "y", 25))), r = num(v.r, 7) / 100, dy = p(v, "dy", 1.8) / 100, td = p(v, "td", 15) / 100, tl = p(v, "tl", 15) / 100, tn = p(v, "tn", 24) / 100, tr = p(v, "tr", 22) / 100;
  if (dy > r && r > 0) throw new InputError("Dividend yield can't exceed the total return.");
  const a = P * (1 - tn);
  let tax = 0, basis = 0, def = 0, roth = 0;
  for (let k = 0; k < y; k++) { tax += a; basis += a; const d = tax * dy * (1 - td); tax = tax * (1 + r - dy) + d; basis += d; def = (def + P) * (1 + r); roth = (roth + a) * (1 + r); }
  const taxAfter = tax - Math.max(0, tax - basis) * tl, defAfter = def * (1 - tr);
  const best = [["Taxable", taxAfter], ["Tax-deferred (traditional)", defAfter], ["Roth", roth]].sort((x, z) => (z[1] as number) - (x[1] as number))[0];
  return { taxable: `Taxable account ${$0(taxAfter)} after selling (${$0(tax)} before ${pc(tl, 0)} gains tax)`, deferred: `Tax-deferred ${$0(defAfter)} after ${pc(tr, 0)} tax on withdrawal (${$0(def)} pre-tax)`, roth: `Roth ${$0(roth)} tax-free`, best: `${best[0]} comes out ahead — ${$0((best[1] as number) - Math.min(taxAfter, defAfter, roth))} more than the weakest option` };
};
export const brokerage: Calc = (v) => {
  const b0 = p(v, "b", 10000), m = p(v, "m", 500), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 7) / 100, dy = p(v, "dy", 1.5) / 100, td = p(v, "td", 15) / 100, er = p(v, "er", 0.05) / 100, tl = p(v, "tl", 15) / 100;
  let bal = b0, basis = b0, taxPaid = 0;
  for (let k = 0; k < y * 12; k++) {
    const d = (bal * dy) / 12, t = d * td;
    bal = bal * (1 + (r - dy - er) / 12) + d - t + m; basis += m + d - t; taxPaid += t;
  }
  const gain = Math.max(0, bal - basis), after = bal - gain * tl, put = b0 + m * 12 * y;
  return { val: `${$0(bal)} after ${y} years`, sold: `${$0(after)} if sold (${$0(gain * tl)} capital gains tax on ${$0(gain)} gain)`, parts: `You contribute ${$0(put)} · dividend tax paid along the way ${$0(taxPaid)} · fees and taxes included` };
};
export const kidsAccount: Calc = (v) => {
  const a = p(v, "a", 2), ta = p(v, "ta", 18), b0 = p(v, "b", 1000), m = p(v, "m", 100), r = num(v.r, 7) / 100, inf = p(v, "inf", 2.5) / 100;
  const yrs = ta - a; if (!(yrs > 0)) throw new InputError("Target age must be above the child's age.");
  const n = Math.round(yrs * 12), mr = Math.pow(1 + r, 1 / 12) - 1;
  let bal = b0; for (let k = 0; k < n; k++) bal = bal * (1 + mr) + m;
  const put = b0 + m * n, birth = ta; let bb = b0; for (let k = 0; k < Math.round(birth * 12); k++) bb = bb * (1 + mr) + m;
  return { val: `${$0(bal)} at age ${nfmt(ta)}`, parts: `Contributions ${$0(put)} · growth ${$0(bal - put)} · ${$0(bal / Math.pow(1 + inf, yrs))} in today's money`, birth: a > 0 ? `Starting at birth would have reached ${$0(bb)} (+${$0(bb - bal)})` : "Started at birth — the best head start" };
};
export const utma: Calc = (v) => {
  const B = p(v, "b", 40000), y = p(v, "y", 2) / 100, g = p(v, "g", 1.5) / 100, cr = p(v, "cr", 10) / 100, pr = p(v, "pr", 15) / 100, add = p(v, "c", 3000), age = p(v, "a", 8), maj = p(v, "maj", 21), r = num(v.r, 7) / 100;
  const ui = B * (y + g), t1 = Math.min(Math.max(ui - 1350, 0), 1350) * cr, t2 = Math.max(ui - 2700, 0) * pr, yrs = Math.max(0, maj - age);
  let bal = B; for (let k = 0; k < Math.round(yrs); k++) bal = bal * (1 + r) + add;
  return { tax: `${$0(t1 + t2)} kiddie tax this year on ${$0(ui)} of unearned income`, tiers: `First $1,350 tax-free · next $1,350 at ${pc(cr, 0)} (${$0(t1)}) · ${$0(Math.max(ui - 2700, 0))} above $2,700 at the parent's ${pc(pr, 0)} (${$0(t2)})`, grow: yrs > 0 ? `${$0(bal)} when the child takes control at ${nfmt(maj)} (${nfmt(yrs)} years)` : "The child already controls the account", gift: add > 19000 ? `${$0(add)} a year is over the $19,000 per-donor gift exclusion — file Form 709 (no tax due until the lifetime limit)` : `${$0(add)} a year is within the 2026 $19,000 per-donor gift exclusion` };
};

// ---- Stocks: valuation & trading ----
export const evEbitda: Calc = (v) => {
  const mc = need(p(v, "mc", 50000), "Enter market cap."), d = p(v, "d", 12000), c = p(v, "c", 4000), mi = p(v, "mi", 0), pf = p(v, "pf", 0), e = num(v.e, 6000), tm = p(v, "tm", 0), sh = p(v, "sh", 0);
  if (!e) throw new InputError("Enter EBITDA.");
  const ev = mc + d + mi + pf - c, mult = ev / e;
  const imp = tm > 0 ? tm * e - d - mi - pf + c : NaN;
  return { m: e > 0 ? `${mult.toFixed(2)}× EV/EBITDA` : "Negative EBITDA — the multiple isn't meaningful", ev: `Enterprise value ${nfmt(ev, 0)} = market cap ${nfmt(mc, 0)} + debt ${nfmt(d, 0)}${mi + pf ? ` + other claims ${nfmt(mi + pf, 0)}` : ""} − cash ${nfmt(c, 0)}`, imp: Number.isFinite(imp) ? `At ${tm}×: implied equity value ${nfmt(imp, 0)}${sh > 0 ? ` · ${$(imp / sh)} a share` : ""} (${sg(imp / mc - 1, 1)})` : "Enter a target multiple for an implied value" };
};
export const shortInterest: Calc = (v) => {
  const s = need(p(v, "s", 12), "Enter shares sold short."), adv = need(p(v, "adv", 4), "Enter average daily volume."), fl = p(v, "fl", 80);
  const dtc = s / adv, pf = fl > 0 ? s / fl : NaN;
  return { dtc: `${dtc.toFixed(1)} days to cover`, flt: Number.isFinite(pf) ? `${pc(pf, 1)} of the float sold short` : "Enter the float for short % of float", read: dtc >= 10 || pf >= 0.2 ? "Very high — crowded short, squeeze risk" : dtc >= 5 || pf >= 0.1 ? "Elevated short interest" : "Normal short interest" };
};
export const positionSize: Calc = (v) => {
  const A = need(p(v, "a", 50000), "Enter account size."), rk = p(v, "rk", 1) / 100, e = need(p(v, "e", 100), "Enter the entry price."), s = p(v, "s", 94), tp = p(v, "tp", 115), mx = p(v, "mx", 25) / 100;
  if (!(s > 0 && s < e)) throw new InputError("For a long trade the stop must be below the entry price.");
  const risk = A * rk, ps = e - s; let sh = Math.floor(risk / ps); let capped = false;
  if (mx > 0 && sh * e > A * mx) { sh = Math.floor((A * mx) / e); capped = true; }
  return { sh: `${nfmt(sh)} shares`, pos: `Position ${$0(sh * e)} (${pc((sh * e) / A, 1)} of account)${capped ? ` — capped at the ${pc(mx, 0)} max position` : ""} · risk ${$0(sh * ps)} if stopped out`, rr: tp > e ? `Reward:risk ${((tp - e) / ps).toFixed(2)} : 1 · ${$0(sh * (tp - e))} at the target` : "Enter a target above entry for reward:risk" };
};
export const trailingStop: Calc = (v) => {
  const e = need(p(v, "e", 50), "Enter entry price."), hi = Math.max(e, p(v, "h", 64)), mode = pick(v.m, 2), tr = p(v, "t", mode === 0 ? 10 : 5), cur = p(v, "c", 60), sh = p(v, "sh", 100);
  const stop = mode === 0 ? hi * (1 - tr / 100) : hi - tr;
  if (stop <= 0) throw new InputError("Trail is too wide for this price.");
  return { stop: `${$(stop)} stop price (${mode === 0 ? `${tr}%` : $(tr)} below the ${$(hi)} high)`, lock: `${stop >= e ? "Locks in" : "Limits loss to"} ${$0(Math.abs(stop - e) * sh)} (${sg(stop / e - 1, 1)} vs entry)`, stat: cur > 0 ? (cur <= stop ? "Triggered — the price is at or below the stop" : `Not triggered — price ${$(cur)} is ${pc(1 - stop / cur, 1)} above the stop`) : "Enter the current price to check" };
};
export const washSale: Calc = (v) => {
  const ns = need(p(v, "n", 100), "Enter shares sold."), cb = p(v, "cb", 60), sp = p(v, "sp", 45), nr = p(v, "nr", 100), rp = p(v, "rp", 47);
  const today = Math.floor(Date.now() / 86400000), sd = dateIn(v, "sd", today - 20), rd = dateIn(v, "rd", today - 5), gap = rd - sd;
  const loss = (cb - sp) * ns;
  if (loss <= 0) return { res: "No wash sale — the sale was not at a loss", dis: "Wash-sale rules only disallow losses", basis: `Gain ${$0(-loss)} is taxable normally` };
  const inWin = Math.abs(gap) <= 30, shw = inWin ? Math.min(ns, nr) : 0, dis = ((cb - sp) * shw);
  return { res: inWin ? `Wash sale — repurchase ${Math.abs(gap)} days ${gap >= 0 ? "after" : "before"} the sale (within 30)` : `No wash sale — ${Math.abs(gap)} days apart (more than 30)`, dis: inWin ? `${$0(dis)} of the ${$0(loss)} loss disallowed (${nfmt(shw)} shares) · ${$0(loss - dis)} deductible now` : `Full ${$0(loss)} loss deductible`, basis: inWin ? `New shares' basis ${$(rp + (cb - sp))} each (${$(rp)} + ${$(cb - sp)} deferred loss) · safe window ${dayText(sd - 30)} – ${dayText(sd + 30)}` : `Window was ${dayText(sd - 30)} – ${dayText(sd + 30)}` };
};
export const marketCap: Calc = (v) => {
  const pr = need(p(v, "p", 150), "Enter the share price."), sh = need(p(v, "sh", 2500), "Enter shares outstanding (millions)."), dil = p(v, "d", 0), tg = p(v, "tg", 0);
  const mc = pr * sh * 1e6, cls = mc >= 2e11 ? "Mega-cap" : mc >= 1e10 ? "Large-cap" : mc >= 2e9 ? "Mid-cap" : mc >= 3e8 ? "Small-cap" : mc >= 5e7 ? "Micro-cap" : "Nano-cap";
  const big = (x: number) => (x >= 1e12 ? `$${(x / 1e12).toFixed(2)} trillion` : x >= 1e9 ? `$${(x / 1e9).toFixed(2)} billion` : `$${(x / 1e6).toFixed(1)} million`);
  return { mc: `${big(mc)} market cap`, cls: `${cls}${dil > 0 ? ` · fully diluted ${big(pr * (sh + dil) * 1e6)}` : ""}`, tg: tg > 0 ? `${$(tg * 1e9 / (sh * 1e6))} a share for a $${nfmt(tg, 1)} billion market cap` : "Enter a target cap (billions) for the matching price" };
};
export const rsi: Calc = (v) => {
  const xs = series(v, "px", 15), n = Math.min(Math.max(2, Math.round(p(v, "n", 14))), xs.length - 1);
  const ch = xs.slice(1).map((x, i) => x - xs[i]);
  let ag = mean(ch.slice(0, n).map((c) => Math.max(c, 0))), al = mean(ch.slice(0, n).map((c) => Math.max(-c, 0)));
  for (let i = n; i < ch.length; i++) { ag = (ag * (n - 1) + Math.max(ch[i], 0)) / n; al = (al * (n - 1) + Math.max(-ch[i], 0)) / n; }
  const val = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  return { rsi: `RSI(${n}) = ${val.toFixed(1)}`, read: val >= 70 ? "Overbought (≥ 70)" : val <= 30 ? "Oversold (≤ 30)" : "Neutral (30–70)", avg: `Average gain ${nfmt(ag, 3)} · average loss ${nfmt(al, 3)} · ${xs.length} prices, Wilder smoothing` };
};
export const bollinger: Calc = (v) => {
  const xs = series(v, "px", 5), n = Math.min(Math.max(2, Math.round(p(v, "n", 20))), xs.length), k = p(v, "k", 2);
  const w = xs.slice(-n), m = mean(w), s = sd(w, false), up = m + k * s, lo = m - k * s, last = xs[xs.length - 1], b = up > lo ? (last - lo) / (up - lo) : 0.5;
  return { bands: `Upper ${nfmt(up, 2)} · middle ${nfmt(m, 2)} · lower ${nfmt(lo, 2)}`, pb: `%B ${b.toFixed(2)} (last ${nfmt(last, 2)}) — ${b > 1 ? "above the upper band" : b < 0 ? "below the lower band" : b > 0.8 ? "near the upper band" : b < 0.2 ? "near the lower band" : "inside the bands"}`, bw: `Bandwidth ${pc((up - lo) / m, 2)} · ${n}-period, ${k}σ` };
};
export const stockVol: Calc = (v) => {
  const xs = series(v, "px", 3), f = [252, 52, 12][pick(v.f, 3)];
  const lr = xs.slice(1).map((x, i) => Math.log(x / xs[i])), s = sd(lr), ann = s * Math.sqrt(f);
  return { ann: `${pc(ann, 1)} annualized volatility`, per: `${pc(s, 2)} per period (${lr.length} returns, ×√${f})`, mv: `1-σ yearly range ≈ ${nfmt(xs[xs.length - 1] * Math.exp(-ann), 2)} – ${nfmt(xs[xs.length - 1] * Math.exp(ann), 2)} · daily ≈ ±${pc(ann / Math.sqrt(252), 2)}` };
};

// ---- Options: Black-Scholes ----
const ncdf = (x: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989422804014327 * Math.exp(-x * x / 2); const pr = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); return x >= 0 ? 1 - pr : pr; };
const npdf = (x: number) => 0.3989422804014327 * Math.exp(-x * x / 2);
function bs(S: number, K: number, T: number, r: number, q: number, s: number, call: boolean) {
  const st = s * Math.sqrt(T), d1 = (Math.log(S / K) + (r - q + s * s / 2) * T) / st, d2 = d1 - st, eq = Math.exp(-q * T), er = Math.exp(-r * T);
  const price = call ? S * eq * ncdf(d1) - K * er * ncdf(d2) : K * er * ncdf(-d2) - S * eq * ncdf(-d1);
  const delta = call ? eq * ncdf(d1) : eq * (ncdf(d1) - 1), gamma = (eq * npdf(d1)) / (S * st), vega = (S * eq * npdf(d1) * Math.sqrt(T)) / 100;
  const th = -(S * eq * npdf(d1) * s) / (2 * Math.sqrt(T)) + (call ? -r * K * er * ncdf(d2) + q * S * eq * ncdf(d1) : r * K * er * ncdf(-d2) - q * S * eq * ncdf(-d1));
  const rho = (call ? K * T * er * ncdf(d2) : -K * T * er * ncdf(-d2)) / 100;
  return { price, delta, gamma, vega, theta: th / 365, rho, d1, d2 };
}
const optIn = (v: Record<string, number>) => {
  const S = need(p(v, "s", 100), "Enter the stock price."), K = need(p(v, "k", 105), "Enter the strike."), T = need(p(v, "d", 30), "Enter days to expiry.") / 365;
  return { S, K, T, r: num(v.r, 4) / 100, q: p(v, "q", 0) / 100, call: pick(v.t, 2) === 0 };
};
export const greeks: Calc = (v) => {
  const o = optIn(v), s = need(p(v, "iv", 30), "Enter volatility.") / 100, g = bs(o.S, o.K, o.T, o.r, o.q, s, o.call);
  return { price: `${$(g.price)} theoretical ${o.call ? "call" : "put"} price (${$0(g.price * 100)} per contract)`, dg: `Delta ${g.delta.toFixed(3)} · gamma ${g.gamma.toFixed(4)}`, tv: `Theta ${$(g.theta)} a day · vega ${$(g.vega)} per 1% IV · rho ${$(g.rho)} per 1% rate`, prob: `≈ ${pc(o.call ? ncdf(g.d2) : ncdf(-g.d2), 0)} risk-neutral chance of finishing in the money` };
};
export const impliedVol: Calc = (v) => {
  const o = optIn(v), mp = need(p(v, "mp", 2.1), "Enter the option's market price.");
  const lb = o.call ? Math.max(0, o.S * Math.exp(-o.q * o.T) - o.K * Math.exp(-o.r * o.T)) : Math.max(0, o.K * Math.exp(-o.r * o.T) - o.S * Math.exp(-o.q * o.T));
  if (mp <= lb + 1e-9) throw new InputError(`Price is at or below intrinsic value (${$(lb)}) — no implied volatility.`);
  const iv = solve((s) => bs(o.S, o.K, o.T, o.r, o.q, s, o.call).price - mp, 0.0001, 10);
  if (!Number.isFinite(iv)) throw new InputError("No volatility up to 1,000% matches that price.");
  const mv = o.S * iv * Math.sqrt(o.T);
  return { iv: `${pc(iv, 1)} implied volatility`, mv: `Expected move ±${$(mv)} (±${pc(mv / o.S, 1)}) by expiry · range ${$(o.S - mv)} – ${$(o.S + mv)}`, day: `≈ ±${pc(iv / Math.sqrt(252), 2)} a day` };
};

// ---- Option strategies (expiry payoff) ----
type Leg = { k: number; call: boolean; q: number }; // q > 0 long, < 0 short (per share)
function payoff(legs: Leg[], stockQ: number, stockCost: number, cash: number) {
  const f = (S: number) => legs.reduce((s, l) => s + l.q * Math.max(l.call ? S - l.k : l.k - S, 0), 0) + stockQ * (S - stockCost) + cash;
  const ks = [...new Set(legs.map((l) => l.k))].sort((a, b) => a - b), hi = ks[ks.length - 1] * 3 + 1;
  const pts = [0, ...ks, hi], vals = pts.map(f);
  const upSlope = legs.reduce((s, l) => s + (l.call ? l.q : 0), 0) + stockQ;
  const be: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = vals[i], b = vals[i + 1]; if (a === 0 && i > 0) be.push(pts[i]); else if (a * b < 0) be.push(pts[i] + (pts[i + 1] - pts[i]) * (a / (a - b))); }
  const mx = upSlope > 1e-9 ? Infinity : Math.max(...vals), mn = upSlope < -1e-9 ? -Infinity : Math.min(...vals);
  return { f, mx, mn, be };
}
const lim = (x: number, n: number) => (Number.isFinite(x) ? pm(x * n) : "Unlimited");
const bes = (b: number[]) => (b.length ? b.map((x) => $(x)).join(" and ") : "None");
const stratOut = (r: ReturnType<typeof payoff>, n: number, S: number) => ({ mx: `Max profit ${lim(r.mx, n)} · max loss ${lim(r.mn, n)}`, be: `Breakeven ${bes(r.be)}`, at: S > 0 ? `At ${$(S)} on expiry: ${pm(r.f(S) * n)}` : "Enter an expiry price for P/L" });
const cN = (v: Record<string, number>) => Math.max(1, Math.round(p(v, "n", 1))) * 100;

export const cashPut: Calc = (v) => {
  const K = need(p(v, "k", 95), "Enter the strike."), pr = need(p(v, "pr", 1.8), "Enter the premium."), n = cN(v), d = need(p(v, "d", 30), "Enter days to expiry."), fee = p(v, "fee", 1.3), S = p(v, "s", 100);
  const prem = pr * n - fee * (n / 100), col = K * n, ret = prem / col;
  return { ret: `${pc(ret)} return on ${$0(col)} cash secured · ${pc(Math.pow(1 + ret, 365 / d) - 1, 1)} annualized`, prem: `Premium ${$0(prem)} after fees · effective buy price ${$(K - prem / n)} if assigned (${S > 0 ? sg((K - prem / n) / S - 1, 1) + " vs today" : ""})`, risk: `Breakeven ${$(K - prem / n)} · max loss ${$0(col - prem)} if the stock goes to zero` };
};
export const ironCondor: Calc = (v) => {
  const k1 = p(v, "k1", 90), k2 = p(v, "k2", 95), k3 = p(v, "k3", 105), k4 = p(v, "k4", 110), cr = p(v, "cr", 1.6), n = cN(v), S = p(v, "s", 0);
  if (!(k1 < k2 && k2 < k3 && k3 < k4)) throw new InputError("Strikes must rise: long put < short put < short call < long call.");
  const r = payoff([{ k: k1, call: false, q: 1 }, { k: k2, call: false, q: -1 }, { k: k3, call: true, q: -1 }, { k: k4, call: true, q: 1 }], 0, 0, cr);
  const o = stratOut(r, n, S);
  return { ...o, rr: `Profit zone ${$(k2 - cr)} – ${$(k3 + cr)} · return on risk ${pc(r.mx / -r.mn, 1)} (${$0(-r.mn * n)} margin)` };
};
const longShort = (v: Record<string, number>) => (pick(v.side, 2) === 0 ? 1 : -1);
export const straddle: Calc = (v) => {
  const K = need(p(v, "k", 100), "Enter the strike."), c = p(v, "c", 4.2), pu = p(v, "pu", 3.9), n = cN(v), sd0 = longShort(v), S = p(v, "s", 0), sp = p(v, "sp", K);
  const tot = c + pu, r = payoff([{ k: K, call: true, q: sd0 }, { k: K, call: false, q: sd0 }], 0, 0, -sd0 * tot), o = stratOut(r, n, S);
  return { ...o, mv: `Needs a move of ${pc(tot / (sp || K), 1)} from ${$(sp || K)} ${sd0 > 0 ? "to profit" : "to start losing"} · total premium ${$(tot)} (${$0(tot * n)})` };
};
export const strangle: Calc = (v) => {
  const kp = p(v, "kp", 95), kc = p(v, "kc", 105), pu = p(v, "pu", 1.9), c = p(v, "c", 2.1), n = cN(v), sd0 = longShort(v), S = p(v, "s", 0), sp = p(v, "sp", 100);
  if (!(kp < kc)) throw new InputError("The put strike must be below the call strike.");
  const tot = c + pu, r = payoff([{ k: kc, call: true, q: sd0 }, { k: kp, call: false, q: sd0 }], 0, 0, -sd0 * tot), o = stratOut(r, n, S);
  return { ...o, mv: `Breakevens are ${sg((kp - tot) / sp - 1, 1)} / ${sg((kc + tot) / sp - 1, 1)} from ${$(sp)} · total premium ${$(tot)} (${$0(tot * n)})` };
};
export const butterfly: Calc = (v) => {
  const k1 = p(v, "k1", 95), k2 = p(v, "k2", 100), k3 = p(v, "k3", 105), db = p(v, "db", 1.2), n = cN(v), S = p(v, "s", 0), call = pick(v.t, 2) === 0;
  if (!(k1 < k2 && k2 < k3)) throw new InputError("Strikes must rise: lower < middle < upper.");
  const r = payoff([{ k: k1, call, q: 1 }, { k: k2, call, q: -2 }, { k: k3, call, q: 1 }], 0, 0, -db), o = stratOut(r, n, S);
  return { ...o, rr: `Best at ${$(k2)} · reward:risk ${(r.mx / -r.mn).toFixed(1)} : 1${Math.abs(k3 - k2 - (k2 - k1)) > 1e-9 ? " · unequal wings (broken-wing)" : ""}` };
};

// ---- Equity compensation tax ----
const BR: Record<number, number[]> = { 0: [12400, 50400, 105700, 201775, 256225, 640600], 1: [24800, 100800, 211400, 403550, 512450, 768700] };
const RT = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
function fedTax(ti: number, fs: number) { const b = BR[fs]; let t = 0, lo = 0; for (let i = 0; i < RT.length; i++) { const hi = i < b.length ? b[i] : Infinity; if (ti > lo) t += (Math.min(ti, hi) - lo) * RT[i]; lo = hi; } return t; }
const margRate = (ti: number, fs: number) => { const b = BR[fs]; const i = b.findIndex((x) => ti <= x); return RT[i < 0 ? 6 : i]; };
function fica(wagesBefore: number, inc: number, fs: number) {
  const ss = Math.max(0, Math.min(wagesBefore + inc, 184500) - Math.min(wagesBefore, 184500)) * 0.062;
  const th = 200000, med = inc * 0.0145 + Math.max(0, wagesBefore + inc - Math.max(th, wagesBefore)) * 0.009;
  void fs; return { ss, med };
}
const suppW = (ytdSupp: number, inc: number) => Math.min(inc, Math.max(0, 1e6 - ytdSupp)) * 0.22 + Math.max(0, ytdSupp + inc - Math.max(1e6, ytdSupp)) * 0.37;

export const rsuTax: Calc = (v) => {
  const sh = need(p(v, "sh", 200), "Enter shares vesting."), fmv = need(p(v, "p", 150), "Enter the price at vest."), w = p(v, "w", 150000), fs = pick(v.fs, 2), st = p(v, "st", 5) / 100, sw = p(v, "sw", 5) / 100, ys = p(v, "ys", 0);
  const inc = sh * fmv, sd = fs ? 32200 : 16100, ti0 = Math.max(0, w - sd), fedDue = fedTax(ti0 + inc, fs) - fedTax(ti0, fs), wh = suppW(ys, inc), f = fica(w, inc, fs);
  const whTot = wh + inc * sw + f.ss + f.med, owe = fedDue + inc * st + f.ss + f.med, shSold = Math.ceil(whTot / fmv);
  return { inc: `${$0(inc)} ordinary income at vest`, wh: `Withheld ≈ ${$0(whTot)} (federal ${$0(wh)} at the supplemental rate + state ${$0(inc * sw)} + FICA ${$0(f.ss + f.med)}) · ≈ ${nfmt(shSold)} shares sold to cover`, owe: `Actual tax ≈ ${$0(owe)} (federal ${$0(fedDue)}, top rate ${pc(margRate(ti0 + inc, fs), 0)}) · ${owe > whTot ? `shortfall ${$0(owe - whTot)} — set aside or pay estimated tax` : `over-withheld by ${$0(whTot - owe)}`}`, basis: `Cost basis of kept shares ${$(fmv)} each — later gains are capital gains` };
};
export const nsoTax: Calc = (v) => {
  const n = need(p(v, "n", 1000), "Enter options exercised."), k = p(v, "k", 10), fmv = need(p(v, "p", 40), "Enter the current share price."), w = p(v, "w", 150000), fs = pick(v.fs, 2), st = p(v, "st", 5) / 100;
  const spread = Math.max(0, fmv - k) * n, sd = fs ? 32200 : 16100, ti0 = Math.max(0, w - sd), fed = fedTax(ti0 + spread, fs) - fedTax(ti0, fs), f = fica(w, spread, fs), tax = fed + spread * st + f.ss + f.med;
  return { inc: `${$0(spread)} bargain element taxed as wages`, tax: `Tax ≈ ${$0(tax)} (federal ${$0(fed)} · state ${$0(spread * st)} · FICA ${$0(f.ss + f.med)}) — ${pc(spread ? tax / spread : 0, 1)} effective`, cash: `Cash to exercise and hold ${$0(k * n + tax)} (strike ${$0(k * n)} + tax) · withholding at 22% would be ${$0(spread * 0.22)}`, basis: `New basis ${$(fmv)} a share` };
};
export const isoAmt: Calc = (v) => {
  const n = need(p(v, "n", 2000), "Enter options exercised."), k = p(v, "k", 5), fmv = need(p(v, "p", 45), "Enter the fair market value at exercise."), fs = pick(v.fs, 2), ti = p(v, "ti", 160000), adj = p(v, "adj", 10000), sdTaken = pick(num(v.sd, 1), 2) === 1;
  const ex = fs ? 140200 : 90100, ph = fs ? 1000000 : 500000, sdA = sdTaken ? (fs ? 32200 : 16100) : 0;
  const reg = fedTax(ti, fs);
  const amt = (be: number) => { const amti = ti + adj + sdA + be, e = Math.max(0, ex - 0.5 * Math.max(0, amti - ph)), base = Math.max(0, amti - e); const tmt = base <= 244500 ? base * 0.26 : base * 0.28 - 4890; return { amti, e, tmt }; };
  const be = Math.max(0, fmv - k) * n, a = amt(be), due = Math.max(0, a.tmt - reg);
  const free = amt(0).tmt >= reg ? 0 : solve((x) => amt(x).tmt - reg, 0, 1e9);
  return { amt: due > 0 ? `${$0(due)} AMT owed on this exercise` : "No AMT — the tentative minimum tax stays below your regular tax", be: `Bargain element ${$0(be)} · AMTI ${$0(a.amti)} · exemption ${$0(a.e)} · tentative minimum tax ${$0(a.tmt)} vs regular tax ${$0(reg)}`, free: Number.isFinite(free) ? `You could exercise about ${$0(free)} of spread (${nfmt(Math.floor(free / Math.max(fmv - k, 1e-9)))} options) before AMT starts` : "—", credit: due > 0 ? `${$0(due)} becomes an AMT credit you can recover in later years` : "Hold ISO shares 1 year after exercise and 2 after grant for long-term treatment" };
};

// ---- registry (generated)
export const ideaFin7CustomCalculators: Record<string, Calc> = {
  "time-weighted-return-calculator": twr,
  "money-weighted-return-calculator": mwr,
  "after-tax-return-calculator": afterTax,
  "rule-of-114-tripling-calculator": rule114,
  "maximum-drawdown-calculator": maxDrawdown,
  "capital-asset-pricing-model-calculator": capm,
  "millionaire-age-calculator": millionaire,
  "taxable-vs-tax-deferred-growth-calculator": taxDeferred,
  "brokerage-account-growth-calculator": brokerage,
  "kids-investment-account-growth-calculator": kidsAccount,
  "custodial-account-growth-utma-calculator": utma,
  "ev-to-ebitda-calculator": evEbitda,
  "short-interest-ratio-calculator": shortInterest,
  "option-greeks-calculator": greeks,
  "implied-volatility-calculator": impliedVol,
  "cash-secured-put-return-calculator": cashPut,
  "iron-condor-profit-calculator": ironCondor,
  "straddle-breakeven-calculator": straddle,
  "strangle-breakeven-calculator": strangle,
  "butterfly-spread-calculator": butterfly,
  "stock-position-size-calculator": positionSize,
  "trailing-stop-calculator": trailingStop,
  "wash-sale-calculator": washSale,
  "rsu-tax-calculator": rsuTax,
  "iso-amt-exercise-calculator": isoAmt,
  "nso-exercise-tax-calculator": nsoTax,
  "market-cap-from-price-calculator": marketCap,
  "rsi-indicator-calculator": rsi,
  "bollinger-bands-calculator": bollinger,
  "stock-volatility-calculator": stockVol,
};
