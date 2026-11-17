/**
 * Idea build, batch fin9 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Retirement (international, 9) + Savings (7) = 16 tools.
 * Verified figures: Canada 2026 — RRSP limit $33,810 (18% of prior-year earned income); TFSA $7,000 (cumulative $109,000 since 2009);
 * OAS recovery tax 15% above $95,323 net income; OAS +10% from age 75, +0.6% per month deferred (max 60), full at 40 years' residence.
 * UK 2026/27 — full new State Pension £241.30 a week (35 qualifying years, minimum 10); deferral +1% per 9 weeks; tax bands
 * £12,570 / £50,270 / £125,140 (allowance tapered £1 per £2 above £100,000); lump-sum allowance £268,275; ISA allowance £20,000.
 * NS&I Premium Bonds — prize fund rate 3.80% and odds 22,000 to 1 per £1 from the July 2026 draw; £50,000 maximum.
 * Malaysia — EPF 2025 dividend 6.15%; new contributions split 75% Akaun Persaraan / 15% Sejahtera / 10% Fleksibel;
 * Basic Savings RM390,000 at 60 (RIA framework, phased in by 2028); employer 13% (wages ≤ RM5,000) or 12%, employee 11%.
 * India — PPF 7.1% (Oct–Dec 2026), ₹500–₹1.5 lakh a year, 15 years; EPF 8.25% (last declared rate), EPS 8.33% of wages capped at ₹15,000.
 * US — Coverdell ESA $2,000 a year, MAGI phase-out $95,000–$110,000 single / $190,000–$220,000 joint;
 * Trump Accounts (OBBBA): $1,000 federal pilot deposit for US-citizen children born 2025–2028, $5,000 a year combined
 * contributions (employer up to $2,500 within it), contributions from 4 July 2026.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $0 = (x: number) => money(x, "$", 0);
const C0 = (x: number) => money(x, "C$", 0);
const L0 = (x: number) => money(x, "£", 0);
const L2 = (x: number) => money(x, "£", 2);
const R0 = (x: number) => money(x, "RM", 0);
const I0 = (x: number) => `₹${Math.round(x).toLocaleString("en-IN")}`;
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const fv = (b: number, add: number, r: number, y: number) => { let x = b; for (let k = 0; k < y; k++) x = x * (1 + r) + add; return x; };

// ---- Canada ----
export const oas: Calc = (v) => {
  const age = p(v, "a", 67), yrs = Math.min(40, p(v, "y", 40)), inc = p(v, "inc", 70000), dm = Math.min(60, Math.round(p(v, "dm", 0))), mx = need(p(v, "mx", 743.05), "Enter the maximum OAS for this quarter.");
  if (yrs < 10) return { oas: "Not eligible — OAS needs at least 10 years in Canada after age 18", claw: "—", note: "Some countries' social security agreements can count toward the 10 years" };
  const base = mx * (yrs / 40) * (1 + dm * 0.006) * (age >= 75 ? 1.1 : 1), yr = base * 12, claw = Math.min(yr, Math.max(0, inc - 95323) * 0.15);
  return { oas: `${C0((yr - claw) / 12)} a month after recovery tax (${C0(base)} before)`, claw: claw > 0 ? `Clawback ${C0(claw)} a year (15% of net income above $95,323)` : "No clawback — net income is under $95,323", note: `${nfmt(yrs)}/40 years of residence · ${dm ? `+${pc(dm * 0.006)} for deferring ${dm} months` : "no deferral"}${age >= 75 ? " · +10% at 75+" : ""}` };
};
export const rrsp: Calc = (v) => {
  const ei = p(v, "ei", 90000), c = p(v, "c", 12000), b = p(v, "b", 40000), y = Math.max(1, Math.round(p(v, "y", 25))), r = num(v.r, 6) / 100, mt = p(v, "mt", 30) / 100, wt = p(v, "wt", 25) / 100, room = Math.min(0.18 * ei, 33810);
  const end = fv(b, c, r, y);
  return { end: `${C0(end)} RRSP after ${y} years (${C0(end * (1 - wt))} after ${pc(wt, 0)} tax on withdrawal)`, ref: `${C0(c * mt)} tax refund a year at your ${pc(mt, 0)} marginal rate`, room: `${c > room ? `${C0(c)} is over` : `${C0(c)} is within`} this year's new room of ${C0(room)} (18% of earned income, max $33,810 for 2026) — add any unused room from your notice of assessment` };
};
const TFSA: [number, number][] = [[2009, 5000], [2013, 5500], [2015, 10000], [2016, 5500], [2019, 6000], [2023, 6500], [2024, 7000]];
const tfsaYear = (y: number) => { let a = 0; for (const [yr, amt] of TFSA) if (y >= yr) a = amt; return a; };
export const tfsa: Calc = (v) => {
  const ey = Math.max(2009, Math.round(p(v, "ey", 2009))), made = p(v, "md", 30000), wd = p(v, "wd", 0), c = p(v, "c", 7000), b = p(v, "b", 35000), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 6) / 100;
  let room = 0; for (let yr = ey; yr <= 2026; yr++) room += tfsaYear(yr);
  const left = room - made + wd, end = fv(b, c, r, y);
  return { room: `${C0(Math.max(0, left))} contribution room for 2026 (${C0(room)} total since ${ey}${wd ? ` + ${C0(wd)} re-added withdrawals` : ""})`, end: `${C0(end)} tax-free after ${y} years at ${C0(c)} a year`, warn: left < 0 ? `Over-contributed by ${C0(-left)} — 1% a month penalty tax` : "Withdrawals are tax-free and the room comes back next January" };
};

// ---- UK ----
export const ukStatePension: Calc = (v) => {
  const qy = p(v, "qy", 30), fy = p(v, "fy", 5), full = need(p(v, "w", 241.3), "Enter the full weekly rate."), dw = Math.round(p(v, "dw", 0));
  const tot = Math.min(35, qy + fy);
  if (tot < 10) return { wk: "Not eligible — you need at least 10 qualifying National Insurance years", yr: `${nfmt(10 - tot)} more years needed`, note: "Voluntary Class 3 contributions can fill gaps" };
  const wk = full * (tot / 35) * (1 + Math.floor(dw / 9) * 0.01);
  return { wk: `${L2(wk)} a week (${L0(wk * 52)} a year)`, yr: `${nfmt(tot)} of 35 qualifying years${qy + fy > 35 ? " (35 is the maximum)" : ""}${tot < 35 ? ` · each extra year adds ${L2(full / 35)} a week (${L0((full / 35) * 52)} a year)` : ""}`, note: dw ? `Includes +${Math.floor(dw / 9)}% for deferring ${dw} weeks` : "Full rate £241.30 a week from April 2026; contracted-out years before 2016 can lower your starting amount — check your forecast on GOV.UK" };
};
const ukTax = (inc: number) => { const pa = Math.max(0, 12570 - Math.max(0, inc - 100000) / 2), t = Math.max(0, inc - pa); return Math.min(t, 37700) * 0.2 + Math.max(0, Math.min(t, 125140 - pa) - 37700) * 0.4 + Math.max(0, inc - 125140) * 0.45; };
export const ukDrawdown: Calc = (v) => {
  const pot = need(p(v, "pot", 400000), "Enter the pension pot."), tf = pick(v.tf, 2) === 0, w = p(v, "w", 20000), oi = p(v, "oi", 12548), r = num(v.r, 4) / 100;
  const lump = tf ? Math.min(pot * 0.25, 268275) : 0, rest = pot - lump, taxNow = ukTax(oi + w) - ukTax(oi);
  let b = rest, yrs = 0; while (b > 0 && yrs < 100) { b = b * (1 + r) - w; yrs++; }
  return { lump: tf ? `${L0(lump)} tax-free lump sum (25%, max £268,275) · ${L0(rest)} left invested` : `${L0(rest)} invested — tax-free cash taken as 25% of each withdrawal instead (UFPLS)`, net: `${L0(w - taxNow)} a year after ${L0(taxNow)} income tax on a ${L0(w)} drawdown (with ${L0(oi)} other income)`, last: yrs >= 100 ? "Pot lasts indefinitely at this rate" : `Pot lasts about ${yrs} years at ${pc(r)} growth` };
};

// ---- Australia ----
export const superGrowth: Calc = (v) => {
  const s = need(p(v, "s", 90000), "Enter your salary."), sg = p(v, "sg", 12) / 100, ss = p(v, "ss", 0), b = p(v, "b", 60000), a = p(v, "a", 35), ra = Math.max(a + 1, p(v, "ra", 67)), r = num(v.r, 7) / 100, fee = p(v, "fee", 0.8) / 100, wg = p(v, "wg", 3) / 100, inf = p(v, "inf", 2.5) / 100;
  const n = ra - a, cc0 = s * sg + ss; let bal = b, sal = s;
  for (let k = 0; k < n; k++) { const cc = sal * sg + ss; bal = bal * (1 + r - fee) + cc * 0.85; sal *= 1 + wg; }
  return { end: `A$${Math.round(bal).toLocaleString("en-AU")} at ${nfmt(ra)} (A$${Math.round(bal / Math.pow(1 + inf, n)).toLocaleString("en-AU")} in today's dollars)`, cc: `Concessional contributions A$${Math.round(cc0).toLocaleString("en-AU")} this year ${cc0 > 30000 ? "— over the A$30,000 cap (excess taxed at your marginal rate)" : "— within the A$30,000 cap"} · 15% contributions tax`, note: `Super guarantee ${pc(sg, 1)} · fees ${pc(fee, 2)} a year · access from preservation age 60` };
};

// ---- India ----
export const epfIndia: Calc = (v) => {
  const w = need(p(v, "w", 30000), "Enter monthly basic + DA."), b = p(v, "b", 200000), y = Math.max(1, Math.round(p(v, "y", 25))), r = p(v, "r", 8.25) / 100, g = p(v, "g", 5) / 100, ee = p(v, "ee", 12) / 100;
  let bal = b, wage = w, put = 0;
  for (let k = 0; k < y; k++) {
    const eps = 0.0833 * Math.min(wage, 15000), mo = wage * ee + Math.max(0, wage * 0.12 - eps);
    let intr = 0; for (let mth = 0; mth < 12; mth++) { bal += mo; intr += (bal * r) / 12; } bal += intr; put += mo * 12; wage *= 1 + g;
  }
  return { end: `${I0(bal)} EPF corpus after ${y} years`, parts: `Contributions ${I0(put)} · interest ${I0(bal - b - put)}`, note: `Employer pays 12%, of which ${I0(0.0833 * Math.min(w, 15000))} a month (8.33% of wages up to ₹15,000) goes to the EPS pension, not EPF · interest ${pc(r, 2)}` };
};
export const ppf: Calc = (v) => {
  const d = p(v, "d", 150000), r = p(v, "r", 7.1) / 100, y = Math.max(15, Math.round(p(v, "y", 15)));
  if (d > 150000) throw new InputError("PPF deposits are capped at ₹1,50,000 a year.");
  if (d < 500) throw new InputError("The minimum PPF deposit is ₹500 a year.");
  const put = d * y;
  let e2 = 0; for (let k = 0; k < y; k++) e2 = (e2 + d) * (1 + r);
  return { end: `${I0(e2)} maturity value after ${y} years`, parts: `Invested ${I0(put)} · tax-free interest ${I0(e2 - put)}`, note: `Deposit before 5 April each year to earn the full year's interest · extend in 5-year blocks after 15 years` };
};

// ---- Malaysia ----
export const kwsp: Calc = (v) => {
  const a = p(v, "a", 30), ra = Math.max(a + 1, p(v, "ra", 60)), s = need(p(v, "s", 5000), "Enter monthly salary."), bp = p(v, "bp", 40000), bo = p(v, "bo", 15000), d = p(v, "d", 6.15) / 100, g = p(v, "g", 4) / 100;
  let P = bp, O = bo, sal = s; const n = ra - a;
  for (let k = 0; k < n; k++) { const c = sal * (0.11 + (sal <= 5000 ? 0.13 : 0.12)) * 12; P = P * (1 + d) + c * 0.75; O = O * (1 + d) + c * 0.25; sal *= 1 + g; }
  return { tot: `${R0(P + O)} total EPF savings at ${nfmt(ra)}`, ap: `Akaun Persaraan ${R0(P)} — ${P >= 390000 ? "meets" : `${R0(390000 - P)} short of`} the RM390,000 Basic Savings level`, mo: `This year ${R0(s * (0.11 + (s <= 5000 ? 0.13 : 0.12)))} a month goes in (11% you + ${s <= 5000 ? "13%" : "12%"} employer) · Sejahtera + Fleksibel ${R0(O)}` };
};

// ---- Savings ----
export const babyBond: Calc = (v) => {
  const seed = p(v, "sd", 1000), c = p(v, "c", 2000), age = p(v, "a", 0), ta = Math.max(age + 1, p(v, "ta", 18)), r = num(v.r, 7) / 100;
  const cc = Math.min(c, 5000), n = ta - age, end = fv(seed, cc, r, n), put = seed + cc * n;
  return { end: `$${Math.round(end).toLocaleString("en-US")} at age ${nfmt(ta)}`, parts: `Seed ${$0(seed)} + contributions ${$0(cc * n)} · growth ${$0(end - put)}${c > 5000 ? " · contributions capped at $5,000 a year" : ""}`, note: "Trump Accounts: $1,000 federal deposit for US-citizen babies born 2025–2028 (outside the $5,000 cap); family and employer money (employer up to $2,500) shares the $5,000 cap" };
};
export const coverdell: Calc = (v) => {
  const magi = p(v, "m", 120000), j = pick(v.fs, 2) === 1, a = p(v, "a", 5), b = p(v, "b", 0), r = num(v.r, 6) / 100, ta = Math.max(a + 1, p(v, "ta", 18));
  const lo = j ? 190000 : 95000, hi = j ? 220000 : 110000, f = magi <= lo ? 1 : magi >= hi ? 0 : (hi - magi) / (hi - lo), lim = 2000 * f, n = ta - a, end = fv(b, lim, r, n);
  return { lim: `${$0(lim)} yearly contribution allowed${f < 1 ? ` (phased out — MAGI ${$0(magi)})` : ""}`, end: `${$0(end)} by age ${nfmt(ta)} — tax-free for qualified K-12 and college costs`, note: f === 0 ? "Over the limit — a grandparent or the child can contribute instead" : "Contributions end at 18 and the money must be used by 30 (or rolled to a family member's ESA or a 529)" };
};
export const christmasClub: Calc = (v) => {
  const dep = p(v, "d", 25), fq = [52, 26, 12][pick(v.f, 3)], nP = Math.max(1, Math.round(p(v, "n", 45))), apy = p(v, "r", 1) / 100, goal = p(v, "g", 0);
  const rp = Math.pow(1 + apy, 1 / fq) - 1; let b = 0; for (let k = 0; k < nP; k++) b = b * (1 + rp) + dep;
  const need0 = rp > 0 ? (goal * rp) / (Math.pow(1 + rp, nP) - 1) : goal / nP;
  const unit = fq === 52 ? "week" : fq === 26 ? "two weeks" : "month";
  return { end: `${$0(b)} saved for the holidays`, parts: `${$0(dep * nP)} deposited + ${money(b - dep * nP, "$", 2)} interest over ${nP} deposits`, goal: goal > 0 ? `To reach ${$0(goal)}: save ${money(need0, "$", 2)} every ${unit}` : "Enter a goal to see the deposit needed" };
};
export const premiumBonds: Calc = (v) => {
  const h = Math.min(50000, need(p(v, "h", 10000), "Enter your holding.")), odds = need(p(v, "o", 22000), "Enter the odds."), rate = p(v, "r", 3.8) / 100, alt = p(v, "alt", 4) / 100, tr = p(v, "tr", 40) / 100, psa = p(v, "psa", 500);
  const pm = h / odds, p1 = 1 - Math.pow(1 - 1 / odds, h), py = 1 - Math.pow(1 - p1, 12), altNet = h * alt - Math.max(0, h * alt - psa) * tr;
  return { exp: `${pm.toFixed(2)} prizes expected a month (${(pm * 12).toFixed(1)} a year) · ${pc(p1, 0)} chance of at least one each month`, ret: `Prize fund rate ${pc(rate, 2)} = ${L0(h * rate)} a year on average — most prizes are £25–£50, so typical winnings are lower`, cmp: `Tax-free vs a ${pc(alt, 2)} savings account paying ${L0(altNet)} after tax at ${pc(tr, 0)} (over your ${L0(psa)} allowance) · ${py >= 0.995 ? "a prize is almost certain in a year" : `${pc(py, 0)} chance of a prize in a year`}` };
};
export const isa: Calc = (v) => {
  const c = p(v, "c", 20000), b = p(v, "b", 30000), y = Math.max(1, Math.round(p(v, "y", 10))), r = num(v.r, 4.5) / 100, tr = p(v, "tr", 20) / 100, psa = p(v, "psa", 1000), cash = pick(v.k, 2) === 0;
  const cc = Math.min(c, 20000), isaV = fv(b, cc, r, y);
  let t = b; for (let k = 0; k < y; k++) { const i = t * r; t = t + i - Math.max(0, i - psa) * tr + cc; }
  return { end: `${L0(isaV)} in the ISA after ${y} years, tax-free`, cmp: `${L0(isaV - t)} more than a taxable account (${L0(t)}) at a ${pc(tr, 0)} tax rate with a ${L0(psa)} savings allowance`, note: `${c > 20000 ? "Capped at the £20,000 yearly allowance · " : ""}${cash ? "From April 2027 the cash ISA limit falls to £12,000 for under-65s (the rest can go in stocks & shares)" : "Stocks & shares ISAs also shelter dividends and capital gains"}` };
};
export const sukuk: Calc = (v) => {
  const a = need(p(v, "a", 10000), "Enter the amount."), pr = p(v, "pr", 4) / 100, y = p(v, "y", 3), f = [2, 4, 12, 1][pick(v.f, 4)], re = pick(v.re, 2) === 1, zk = pick(v.z, 2) === 1;
  const n = Math.round(y * f), per = (a * pr) / f;
  const end = re ? a * Math.pow(1 + pr / f, n) : a + per * n, prof = end - a;
  return { prof: `${money(prof, "", 2)} total expected profit over ${nfmt(y, 1)} years (${re ? "reinvested" : "paid out"})`, per: `${money(per, "", 2)} per distribution, ${f === 1 ? "yearly" : `${f} times a year`} at ${pc(pr, 2)} expected profit rate`, zk: zk ? `Zakat ≈ ${money(end * 0.025, "", 2)} a year at 2.5% of the ending value (if held a full lunar year above nisab)` : "Profit rates are expected, not guaranteed — returns depend on the underlying assets" };
};
export const cashSweep: Calc = (v) => {
  const c = need(p(v, "c", 25000), "Enter the cash balance."), sw = p(v, "sw", 0.5) / 100, mm = p(v, "mm", 3.8) / 100, tr = p(v, "tr", 24) / 100, y = Math.max(1, p(v, "y", 1));
  const gap = c * (mm - sw);
  return { lost: `${$0(gap)} a year less interest in the sweep (${$0(gap * (1 - tr))} after tax)`, both: `Sweep ${pc(sw, 2)} → ${$0(c * sw)} · money market fund ${pc(mm, 2)} → ${$0(c * mm)}`, tot: `${$0(c * (Math.pow(1 + mm, y) - Math.pow(1 + sw, y)))} over ${nfmt(y, 1)} years — move idle cash into a money market fund or treasury ETF` };
};

// ---- registry (generated)
export const ideaFin9CustomCalculators: Record<string, Calc> = {
  "canada-oas-benefit-calculator": oas,
  "rrsp-growth-calculator": rrsp,
  "tfsa-growth-calculator": tfsa,
  "uk-state-pension-calculator": ukStatePension,
  "uk-pension-pot-drawdown-calculator": ukDrawdown,
  "australia-superannuation-growth-calculator": superGrowth,
  "india-epf-maturity-calculator": epfIndia,
  "india-ppf-maturity-calculator": ppf,
  "malaysia-epf-kwsp-retirement-calculator": kwsp,
  "baby-bond-savings-calculator": babyBond,
  "coverdell-esa-growth-calculator": coverdell,
  "christmas-club-savings-calculator": christmasClub,
  "premium-bonds-odds-uk-calculator": premiumBonds,
  "isa-savings-growth-uk-calculator": isa,
  "sukuk-savings-profit-calculator": sukuk,
  "brokerage-cash-sweep-yield-calculator": cashSweep,
};
