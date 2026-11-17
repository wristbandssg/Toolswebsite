/**
 * Idea build, batch fin5 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Insurance: Auto (9), Business & Specialty (5), Health (11), Home & Property (4), Life (5) = 34 tools.
 * 2026 figures (checked 17 Nov 2026):
 *  - HSA (IRS Rev. Proc. 2025-19): $4,400 self-only / $8,750 family, $1,000 catch-up at 55+; HDHP min deductible $1,700 / $3,400.
 *  - Health FSA (Rev. Proc. 2025-32): $3,400 salary reduction limit, $680 carryover.
 *  - Medicare Part B: $202.90/month standard, $283 deductible. IRMAA on 2024 MAGI — single 109k/137k/171k/205k/500k,
 *    joint 218k/274k/342k/410k/750k, Part B totals 202.90/284.10/405.80/527.50/649.20/689.90 (1.4/2.0/2.6/3.2/3.4 × standard),
 *    Part D add-ons 0/14.50/37.50/60.40/83.30/91.00; married-separately: >109k → 649.20, ≥391k → 689.90.
 *  - Part D: deductible cap $615, out-of-pocket cap $2,100.
 * Insurance prices (surcharges, rates per $1,000, bond rates) are editable defaults — quotes vary by insurer and state.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
/** Patient cost share for spend E under deductible D, coinsurance c (0–1), out-of-pocket max O. */
const share = (E: number, D: number, c: number, O: number) => Math.min(O > 0 ? O : Infinity, E <= D ? E : D + (E - D) * c);

// ---- Auto ----
export const fullVsLiab: Calc = (v) => {
  const V = p(v, "v", 6000), F = p(v, "f", 1900), L = p(v, "l", 800), D = p(v, "d", 1000), pr = p(v, "p", 8) / 100;
  const extra = F - L, exp = pr * Math.max(0, V - D);
  return { verdict: extra > exp ? `Liability-only looks better — full coverage costs ${$0(extra - exp)} more than its expected payout` : `Keep full coverage — expected payout beats the extra ${$0(extra)}`, cost: `Full coverage costs ${$0(extra)} more a year (${pc(V ? extra / V : 0)} of the car's value)`, rule: `10% rule: drop collision/comprehensive when extra premium > ${$0(V * 0.1)} a year or you could replace the car from savings` };
};
export const surcharge: Calc = (v) => {
  const P = need(p(v, "p", 1800), "Enter your current premium."), s = p(v, "s", 40) / 100, y = Math.max(1, Math.round(p(v, "y", 3))), f = p(v, "f", 0), fg = pick(v.g, 2) === 1;
  const yr = fg ? 0 : P * s;
  return { tot: `${$0(yr * y + f * y)} extra over ${y} years`, yr: fg ? "Accident forgiveness: no surcharge on this first incident" : `New premium ≈ ${$0(P + yr)} a year (+${$0(yr)})`, tip: f > 0 ? `Includes ${$0(f)} a year in filing fees` : "Shop around — surcharges vary a lot between insurers" };
};
const COM_V = [1, 1.2, 1.8, 4], COM_D = [1, 1.25, 1.6], COM_L = [0.9, 1, 1.25];
export const commercialAuto: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 3))), b = p(v, "b", 2000), t = COM_V[pick(v.t, 4)], d = COM_D[pick(v.d, 3)], l = COM_L[pick(v.l, 3)];
  const per = b * t * d * l;
  return { tot: `${$0(per * n)} a year (≈ ${$0((per * n) / 12)}/month)`, per: `${$0(per)} per vehicle`, note: "Rough estimate — radius, cargo, garaging ZIP and claims history drive real quotes" };
};
const UM = [25000, 50000, 100000, 250000, 500000];
export const umNeed: Calc = (v) => {
  const h = p(v, "h", 5000), i = p(v, "i", 4500), m = p(v, "m", 6), ex = p(v, "x", 25000), lia = p(v, "l", 100000);
  const needAmt = h + i * m + ex, pick1 = UM.find((x) => x >= needAmt) ?? UM[UM.length - 1];
  return { need: `${$0(needAmt)} of injury costs to cover`, lim: `Suggested UM/UIM bodily injury: ${$0(pick1)} per person${pick1 > lia ? " (most states cap UM at your liability limit — raise both)" : ""}`, note: "About 1 in 7 US drivers is uninsured — UM also covers hit-and-run in most states" };
};
export const totalLoss: Calc = (v) => {
  const a = need(p(v, "a", 18000), "Enter the actual cash value."), t = p(v, "t", 6) / 100, r = p(v, "r", 150), d = p(v, "d", 500), l = p(v, "l", 15000), inc = pick(v.i, 2) === 1;
  const pay = a + (inc ? a * t + r : 0) - d, net = pay - l;
  return { pay: `${$0(pay)} insurance settlement`, net: net >= 0 ? `${$0(net)} to you after the ${$0(l)} loan payoff` : `${$0(-net)} still owed on the loan — gap insurance would cover this`, note: inc ? "Includes sales tax and title fees (required in many states)" : "Ask whether your state requires tax and fees to be paid" };
};
export const rentalReimb: Calc = (v) => {
  const c = p(v, "c", 40), m = p(v, "m", 30), r = p(v, "r", 55), d = p(v, "d", 12), pr = p(v, "p", 25);
  const paid = Math.min(c, r) * Math.min(d, m), oop = r * d - paid;
  return { save: `Coverage pays ${$0(paid)} on a ${d}-day repair`, oop: `You'd still pay ${$0(oop)} (vs ${$0(r * d)} with no coverage)`, be: `Worth it if you claim once every ${pr > 0 ? (paid / pr).toFixed(0) : "∞"} years or less (${$0(pr)}/year)` };
};

// ---- Business & specialty ----
export const productLiab: Calc = (v) => {
  const R = need(p(v, "r", 500000), "Enter annual sales."), rate = p(v, "k", 0.4), mn = p(v, "mn", 750), lm = pick(v.l, 2) === 1 ? 1.4 : 1;
  const prem = Math.max(mn, (R / 1000) * rate * lm);
  return { prem: `${$0(prem)} a year`, rate: `${$((prem / R) * 1000)} per $1,000 of sales${prem === mn ? " (minimum premium applies)" : ""}`, note: "Rates run from cents per $1,000 for low-risk goods to several dollars for children's, food or supplement products" };
};
export const contractor: Calc = (v) => {
  const rev = p(v, "rv", 400000), gl = p(v, "gl", 5), pay = p(v, "py", 120000), wc = p(v, "wc", 6), veh = p(v, "n", 2), va = p(v, "va", 2200), tl = p(v, "tl", 15000), im = p(v, "im", 1.5);
  const g = (rev / 1000) * gl, w = (pay / 100) * wc, a = veh * va, t = (tl * im) / 100, tot = g + w + a + t;
  return { tot: `${$0(tot)} a year (≈ ${$0(tot / 12)}/month)`, parts: `GL ${$0(g)} · workers' comp ${$0(w)} · auto ${$0(a)} · tools ${$0(t)}`, pct: rev ? `${pc(tot / rev, 1)} of revenue` : "—" };
};
const SURETY = [0.01, 0.02, 0.04, 0.08];
export const surety: Calc = (v) => {
  const B = need(p(v, "b", 50000), "Enter the bond amount."), r = SURETY[pick(v.c, 4)], y = Math.max(1, p(v, "y", 1)), mn = p(v, "mn", 100);
  const prem = Math.max(mn, B * r) * y;
  return { prem: `${$0(prem)} for ${y} year${y === 1 ? "" : "s"}`, rate: `${pc(r, 1)} of the bond amount a year`, note: "You must repay the surety for any claim it pays — it's credit, not insurance for you" };
};
export const eventIns: Calc = (v) => {
  const C = p(v, "c", 30000), cr = p(v, "cr", 1.5) / 100, L = p(v, "l", 175), lq = pick(v.q, 2) === 1 ? p(v, "lq", 100) : 0;
  const can = C * cr, tot = can + L + lq;
  return { tot: `${$0(tot)} total`, parts: `Cancellation ${$0(can)} · liability ${$0(L)}${lq ? ` · liquor ${$0(lq)}` : ""}`, pct: C ? `${pc(tot / C, 1)} of the event budget` : "—" };
};
const DRONE_L = [0, 300, 500, 800];
export const drone: Calc = (v) => {
  const V = p(v, "v", 3000), h = p(v, "h", 8) / 100, pl = p(v, "pl", 1000), l = DRONE_L[pick(v.l, 4)];
  const hull = (V + pl) * h, tot = hull + l;
  return { tot: `${$0(tot)} a year`, parts: `Hull (damage) ${$0(hull)} · liability ${$0(l)}`, note: "Commercial (Part 107) flying usually needs liability; many clients ask for $1M" };
};

// ---- Health ----
export const hsaVsPpo: Calc = (v) => {
  const E = p(v, "e", 3000), t = p(v, "t", 30) / 100;
  const h = p(v, "hp", 2400) + share(E, p(v, "hd", 3000), p(v, "hc", 20) / 100, p(v, "ho", 6000)) - p(v, "er", 750) - p(v, "hs", 2000) * t;
  const o = p(v, "pp", 4800) + share(E, p(v, "pd", 1000), p(v, "pc", 20) / 100, p(v, "po", 4500));
  return { win: `${h < o ? "HDHP + HSA" : "PPO"} costs ${$0(Math.abs(h - o))} less`, h: `HDHP + HSA: ${$0(h)} net (after employer money and tax savings)`, o: `PPO: ${$0(o)}`, note: "HSA money rolls over forever and can be invested" };
};
export const hsaLimit: Calc = (v) => {
  const fam = pick(v.c, 2) === 1, old = pick(v.a, 2) === 1, mo = Math.min(12, Math.max(0, Math.round(p(v, "m", 12)))), er = p(v, "er", 500), done = p(v, "d", 0);
  const base = (fam ? 8750 : 4400) * (mo / 12) + (old ? 1000 * (mo / 12) : 0), room = Math.max(0, base - er - done);
  return { lim: `${$0(base)} 2026 limit (${fam ? "family" : "self-only"}${old ? " + $1,000 catch-up" : ""}${mo < 12 ? `, ${mo} months` : ""})`, room: `${$0(room)} left for you to contribute`, pp: `${$(room / 26)} per paycheck over 26 biweekly paychecks`, note: "Employer contributions count toward the limit. Deadline: April 15, 2027" };
};
export const fsa: Calc = (v) => {
  const ks = ["dc", "rx", "dn", "vs", "ot"], sum = ks.reduce((s, k) => s + p(v, k, 0), 0), t = p(v, "t", 30) / 100, lim = p(v, "l", 3400);
  const elect = Math.min(sum, lim);
  return { elect: `Elect ${$0(elect)} for 2026`, save: `Tax savings ≈ ${$0(elect * t)}`, note: `${sum > lim ? `${$0(sum - lim)} of expenses exceed the ${$0(lim)} limit. ` : ""}Use it or lose it — plans may carry over up to $680 or offer a grace period` };
};
export const coins: Calc = (v) => {
  const B = need(p(v, "b", 4000), "Enter the allowed amount."), d = p(v, "d", 1000), c = p(v, "c", 20) / 100, o = p(v, "o", 5000);
  const you = share(B, d, c, o);
  return { you: `You pay ${$0(you)}`, ins: `Insurance pays ${$0(B - you)}`, parts: `${$0(Math.min(B, d))} deductible + ${$0(Math.max(0, you - Math.min(B, d)))} coinsurance${o > 0 && you >= o ? " (out-of-pocket max reached)" : ""}` };
};
export const copayVsCoins: Calc = (v) => {
  const n = p(v, "n", 8), c = p(v, "c", 250), cp = p(v, "cp", 35), pa = p(v, "pa", 5400), D = p(v, "d", 2000), cc = p(v, "cc", 20) / 100, pb = p(v, "pb", 4200);
  const a = pa + n * Math.min(cp, c), b = pb + share(n * c, D, cc, 0);
  return { win: `${a < b ? "Copay plan" : "Coinsurance plan"} costs ${$0(Math.abs(a - b))} less a year`, a: `Copay plan: ${$0(a)} (premiums + ${$0(n * Math.min(cp, c))} copays)`, b: `Coinsurance plan: ${$0(b)} (premiums + ${$0(b - pb)} cost share)` };
};
const IR_S = [109000, 137000, 171000, 205000, 500000], IR_J = [218000, 274000, 342000, 410000, 750000];
const IR_B = [202.9, 284.1, 405.8, 527.5, 649.2, 689.9], IR_D = [0, 14.5, 37.5, 60.4, 83.3, 91];
export const irmaa: Calc = (v) => {
  const m = p(v, "m", 150000), st = pick(v.s, 3);
  let tier = 0;
  if (st === 2) tier = m >= 391000 ? 5 : m > 109000 ? 4 : 0;
  else { const br = st === 1 ? IR_J : IR_S; tier = br.filter((x, i) => (i === 4 ? m >= x : m > x)).length; }
  const B = IR_B[tier], D = IR_D[tier], br = st === 1 ? IR_J : IR_S;
  const nxt = st === 2 ? null : tier < 5 ? br[tier] : null;
  return { b: `Part B ${$(B)} a month${tier ? ` (IRMAA +${$(B - 202.9)})` : " (standard)"}`, d: `Part D IRMAA +${$(D)} a month on top of your plan premium`, yr: `${$0((B + D) * 12)} a year per person · ${tier ? `tier ${tier} of 5` : "no IRMAA"}`, nxt: nxt ? `Next tier above ${$0(nxt)} MAGI — ${nxt - m > 0 ? `you are ${$0(nxt - m)} below it` : "any more income moves you up a tier"}` : "Top tier (or married filing separately rules)" };
};
export const partD: Calc = (v) => {
  const pr = p(v, "p", 40), d = Math.min(615, p(v, "d", 615)), c = p(v, "c", 400), co = p(v, "co", 25) / 100;
  const cost = c * 12, oop = Math.min(2100, cost <= d ? cost : d + (cost - d) * co);
  let cum = 0, mth = 0;
  for (let k = 1; k <= 12; k++) { const tot = c * k, o = Math.min(2100, tot <= d ? tot : d + (tot - d) * co); if (o >= 2100 && !mth) mth = k; cum = o; }
  return { tot: `${$0(oop + pr * 12)} a year (drugs ${$0(oop)} + premiums ${$0(pr * 12)})`, cap: mth ? `You hit the $2,100 cap in month ${mth} — $0 for covered drugs after that` : `${$0(2100 - cum)} below the $2,100 cap`, smooth: `Medicare Prescription Payment Plan could spread ${$0(oop)} as about ${$0(oop / 12)}/month` };
};
export const medigapMa: Calc = (v) => {
  const E = p(v, "e", 12000), gp = p(v, "gp", 180), gd = p(v, "gd", 283), mp = p(v, "mp", 0), ms = p(v, "ms", 20) / 100, mo = p(v, "mo", 5000), rx = p(v, "rx", 35);
  const g = gp * 12 + Math.min(E, gd) + rx * 12, a = mp * 12 + Math.min(mo, E * ms);
  return { win: `${g < a ? "Medigap Plan G" : "Medicare Advantage"} costs ${$0(Math.abs(g - a))} less at this level of care`, g: `Medigap + Part D: ${$0(g)} a year`, a: `Advantage: ${$0(a)} a year (worst case ${$0(mp * 12 + mo)})`, note: "Both add the Part B premium. Medigap lets you see any Medicare doctor; Advantage uses networks" };
};
export const rxCost: Calc = (v) => {
  const pr = p(v, "p", 220), f = p(v, "f", 12), mode = pick(v.m, 2), cp = p(v, "cp", 45), cc = p(v, "cc", 30) / 100, dr = p(v, "dr", 0), cash = p(v, "cash", 90);
  let ded = dr, ins = 0;
  for (let k = 0; k < f; k++) { const fromDed = Math.min(ded, pr); ded -= fromDed; ins += fromDed + (pr - fromDed > 0 ? (mode === 0 ? Math.min(cp, pr - fromDed) : (pr - fromDed) * cc) : 0); }
  return { ins: `${$0(ins)} a year with insurance (${$(ins / Math.max(f, 1))} per fill)`, cash: `${$0(cash * f)} a year with a discount card / cash price`, win: cash * f < ins ? `Cash price saves ${$0(ins - cash * f)} — but it won't count toward your deductible` : "Use your insurance" };
};
export const familyPlan: Calc = (v) => {
  const e1 = p(v, "e1", 2500), e2 = p(v, "e2", 4000);
  const fam = p(v, "fp", 14000) + share(e1 + e2, p(v, "fd", 4000), p(v, "fc", 20) / 100, p(v, "fo", 12000));
  const split = p(v, "ip", 3500) + share(e1, p(v, "id", 2000), p(v, "ic", 20) / 100, p(v, "io", 6000)) + p(v, "op", 9000) + share(e2, p(v, "od", 3000), p(v, "oc", 20) / 100, p(v, "oo", 9000));
  return { win: `${fam <= split ? "Family plan" : "Separate plans"} costs ${$0(Math.abs(fam - split))} less`, fam: `Family plan: ${$0(fam)} a year`, split: `You on individual + family on another plan: ${$0(split)}` };
};
export const employerHealth: Calc = (v) => {
  const n = need(p(v, "n", 25), "Enter employees."), e = p(v, "e", 75) / 100, fs = p(v, "fs", 40) / 100, sp = p(v, "sp", 9325), fp = p(v, "fp", 26993), sc = p(v, "sc", 80) / 100, fc = p(v, "fc", 70) / 100;
  const enr = n * e, fam = enr * fs, sgl = enr - fam, cost = sgl * sp * sc + fam * fp * fc;
  return { tot: `${$0(cost)} a year employer cost`, per: `${$0(cost / n)} per employee · ${$0(enr ? cost / enr : 0)} per enrolled worker`, emp: `Workers pay ${$0(sp * (1 - sc))} (single) / ${$0(fp * (1 - fc))} (family) a year` };
};

// ---- Home & property ----
export const hurricane: Calc = (v) => {
  const A = need(p(v, "a", 400000), "Enter dwelling coverage."), h = p(v, "h", 2) / 100, dmg = p(v, "d", 30000), aop = p(v, "aop", 1000);
  const ded = A * h, you = Math.min(dmg, ded);
  return { ded: `${$0(ded)} hurricane deductible (${pc(h, 1)} of ${$0(A)})`, pay: `You pay ${$0(you)} · insurer pays ${$0(Math.max(0, dmg - ded))}`, cmp: `vs ${$0(Math.min(dmg, aop))} under your regular ${$0(aop)} deductible` };
};
export const inventory: Calc = (v) => {
  const ks = ["lr", "kt", "bd", "el", "cl", "jw", "ot"], tot = ks.reduce((s, k) => s + p(v, k, 0), 0), C = p(v, "c", 150000), jw = p(v, "jw", 0), jl = p(v, "jl", 1500);
  return { tot: `${$0(tot)} of belongings at replacement cost`, gap: tot > C ? `Under-insured by ${$0(tot - C)} — raise personal property (Coverage C)` : `Covered with ${$0(C - tot)} to spare`, jw: jw > jl ? `Jewelry ${$0(jw)} exceeds a typical ${$0(jl)} theft sublimit — schedule it` : "Check sublimits for jewelry, art and collectibles" };
};
export const claimDep: Calc = (v) => {
  const rc = need(p(v, "rc", 2000), "Enter replacement cost."), a = p(v, "a", 4), L = need(p(v, "l", 10), "Enter useful life."), d = p(v, "d", 500), rcv = pick(v.t, 2) === 1;
  const acv = rc * Math.max(0, 1 - a / L), first = Math.max(0, acv - d), dep = rc - acv;
  return { pay: rcv ? `${$0(Math.max(0, rc - d))} total (replacement cost policy)` : `${$0(first)} (actual cash value policy)`, acv: `ACV ${$0(acv)} = ${$0(rc)} − ${$0(dep)} depreciation (${a}/${L} years)`, note: rcv ? `First check ${$0(first)}; ${$0(dep)} recoverable depreciation paid after you replace the item` : `Depreciation of ${$0(dep)} is never paid back` };
};
export const windMit: Calc = (v) => {
  const W = p(v, "w", 2500), dsc = p(v, "d", 25) / 100, ic = p(v, "ic", 125), up = p(v, "u", 0), up2 = p(v, "u2", 0) / 100;
  const s1 = W * dsc, s2 = W * (1 - dsc) * up2;
  return { save: `${$0(s1)} a year from the inspection credits`, pay: `Inspection pays back in ${s1 > 0 ? Math.ceil((ic / s1) * 12) : "∞"} months`, up: up > 0 ? `Upgrade (${$0(up)}) adds ${$0(s2)} a year → ${s2 > 0 ? (up / s2).toFixed(1) : "∞"}-year payback` : "Add an upgrade cost to test shutters or a new roof" };
};

// ---- Life ----
export const dime: Calc = (v) => {
  const D = p(v, "d", 20000), I = p(v, "i", 75000), Y = p(v, "y", 10), M = p(v, "m", 250000), ed = p(v, "e", 100000), k = p(v, "k", 2), ex = p(v, "x", 50000), sv = p(v, "s", 30000);
  const tot = D + I * Y + M + ed * k, gap = Math.max(0, tot - ex - sv);
  return { need: `${$0(gap)} more coverage needed`, dime: `DIME total ${$0(tot)} = debt ${$0(D)} + income ${$0(I * Y)} + mortgage ${$0(M)} + education ${$0(ed * k)}`, less: `Less existing coverage ${$0(ex)} and savings ${$0(sv)}` };
};
export const finalExp: Calc = (v) => {
  const ks = ["f", "pl", "hs", "md", "db", "ot"], tot = ks.reduce((s, k) => s + p(v, k, 0), 0), sv = p(v, "s", 3000);
  const cov = Math.max(0, tot - sv), round = Math.ceil(cov / 1000) * 1000;
  return { cov: `${$0(round)} of final expense coverage`, tot: `${$0(tot)} total final costs − ${$0(sv)} savings`, note: "Final expense policies usually run $5,000–$50,000 with simplified underwriting" };
};
export const btid: Calc = (v) => {
  const W = p(v, "w", 6000), T = p(v, "t", 600), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 6) / 100, dr = p(v, "dr", 0.5) / 100, cv = p(v, "cv", 140000);
  const net = r - dr, diff = W - T;
  const fv = net === 0 ? diff * y : diff * ((Math.pow(1 + net, y) - 1) / net) * (1 + net);
  return { win: fv > cv ? `Buy term and invest wins by ${$0(fv - cv)}` : `Whole life cash value wins by ${$0(cv - fv)}`, fv: `Investing ${$0(diff)} a year for ${y} years → ${$0(fv)}`, cv: `Whole life projected cash value: ${$0(cv)}`, note: "Only works if you actually invest the difference every year" };
};
export const add: Calc = (v) => {
  const A = need(p(v, "a", 250000), "Enter the benefit amount."), pr = p(v, "p", 180), tl = p(v, "t", 300);
  return { pay: `Accidental death: ${$0(A)} · loss of two limbs/eyes: ${$0(A)} · one limb or eye: ${$0(A / 2)} · thumb and finger: ${$0(A / 4)}`, cost: `${$(pr / (A / 1000))} per $1,000 a year`, cmp: tl > 0 ? `Term life for the same amount (${$0(tl)}/yr) pays for death from any cause — ${tl <= pr * 2 ? "usually better value" : "costs more but covers far more"}` : "Compare with a term life quote" };
};
export const surrender: Calc = (v) => {
  const CV = need(p(v, "cv", 40000), "Enter the cash value."), sc = p(v, "sc", 5) / 100, ln = p(v, "l", 0), basis = p(v, "b", 36000), t = p(v, "t", 22) / 100;
  const charge = CV * sc, net = CV - charge - ln, gain = Math.max(0, CV - charge - basis), tax = gain * t;
  return { net: `${$0(net)} check before tax`, parts: `Cash value ${$0(CV)} − surrender charge ${$0(charge)}${ln ? ` − loan ${$0(ln)}` : ""}`, tax: gain > 0 ? `Taxable gain ${$0(gain)} → about ${$0(tax)} income tax · keep ${$0(net - tax)}` : "No taxable gain (proceeds don't exceed premiums paid)", note: "Consider a 1035 exchange or reduced paid-up policy before surrendering" };
};

// ---- registry (generated)
export const ideaFin5CustomCalculators: Record<string, Calc> = {
  "car-insurance-after-accident-increase-calculator": surcharge,
  "car-insurance-after-dui-calculator": surcharge,
  "car-insurance-after-speeding-ticket-calculator": surcharge,
  "sr22-insurance-cost-calculator": surcharge,
  "full-coverage-vs-liability-calculator": fullVsLiab,
  "commercial-auto-insurance-cost-calculator": commercialAuto,
  "uninsured-motorist-coverage-need-calculator": umNeed,
  "total-loss-settlement-calculator": totalLoss,
  "rental-car-reimbursement-coverage-calculator": rentalReimb,
  "product-liability-insurance-calculator": productLiab,
  "contractor-insurance-cost-calculator": contractor,
  "surety-bond-cost-calculator": surety,
  "event-insurance-cost-calculator": eventIns,
  "drone-insurance-cost-calculator": drone,
  "hsa-vs-ppo-comparison-calculator": hsaVsPpo,
  "hsa-contribution-limit-calculator": hsaLimit,
  "fsa-contribution-calculator": fsa,
  "coinsurance-cost-calculator": coins,
  "copay-vs-coinsurance-calculator": copayVsCoins,
  "medicare-part-b-premium-irmaa-calculator": irmaa,
  "medicare-part-d-cost-calculator": partD,
  "medigap-vs-medicare-advantage-calculator": medigapMa,
  "prescription-drug-cost-insurance-calculator": rxCost,
  "family-vs-individual-plan-calculator": familyPlan,
  "employer-health-cost-per-employee-calculator": employerHealth,
  "hurricane-deductible-calculator": hurricane,
  "personal-property-inventory-value-calculator": inventory,
  "insurance-claim-depreciation-calculator": claimDep,
  "wind-mitigation-discount-calculator": windMit,
  "life-insurance-need-dime-calculator": dime,
  "final-expense-insurance-calculator": finalExp,
  "buy-term-invest-the-difference-calculator": btid,
  "accidental-death-insurance-calculator": add,
  "life-insurance-cash-surrender-value-calculator": surrender,
};
