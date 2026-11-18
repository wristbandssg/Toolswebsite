/**
 * Idea build, batch re2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Real Estate > Land & Construction (7), Mortgage Payment
 * Types (8), Home Buyer Programs (6), Refinance & Equity (4), Property Tax (8), Rent & Tenant (8), Rental Investment (10),
 * Short-Term Rental (5) = 56 tools.
 * Figures: 2026 conforming loan limits (FHFA, 25 Nov 2025) one-unit $832,750, 2-unit $1,066,250, 3-unit $1,288,800, 4-unit $1,601,750,
 * high-cost ceiling 150% ($1,249,125 one-unit); FHA UFMIP 1.75% and annual MIP per ML 2023-05 (0.50%/0.55% for > 15-year loans ≤ $726,200);
 * VA funding fee (from 7 Apr 2023) 2.15%/1.5%/1.25% first use, 3.3% subsequent < 5% down, 0.5% IRRRL; USDA guarantee 1.0% upfront +
 * 0.35% annual; MCC credit capped at $2,000 when the rate is over 20%; Homeowners Protection Act PMI cancellation at 80% / automatic at 78%
 * of original value; RESPA escrow cushion up to 1/6 of annual disbursements; Prop 13 (1% base, assessed value growth ≤ 2%/yr); passive
 * loss $25,000 allowance phased out between $100,000 and $150,000 MAGI; FIRPTA 15% (10% for a residence ≤ $1M, 0% ≤ $300k); vacation home
 * 14-day / 10% rule; 100% bonus depreciation restored for property acquired after 19 Jan 2025 (One Big Beautiful Bill Act); California
 * AB 1482 cap 5% + CPI (max 10%); NYC-style 40×/80× rent income rules. Fees and prices are editable typical defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText, dayParts, dayNum } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const today = () => Math.floor(Date.now() / 86400000);
const pmt = (L: number, r: number, n: number) => (n <= 0 ? 0 : r > 0 ? (L * r) / (1 - (1 + r) ** -n) : L / n);
const bal = (L: number, r: number, n: number, k: number) => (r > 0 ? L * (1 + r) ** k - pmt(L, r, n) * (((1 + r) ** k - 1) / r) : L - (L / n) * k);
const addMonths = (day: number, m: number) => { const d = dayParts(day); const tot = d.m - 1 + Math.round(m), y = d.y + Math.floor(tot / 12), mo = ((tot % 12) + 12) % 12 + 1; return dayNum(y, mo, Math.min(d.d, new Date(Date.UTC(y, mo, 0)).getUTCDate())); };

// ---- Land & construction ----
export const landClear: Calc = (v) => {
  const ac = P(v, "a", 2, "Acres"), d = pick(v.d, 3), rate = Z(v, "r", 0) || [1500, 3500, 6000][d], stumps = Z(v, "s", 0), sp = Z(v, "x", 300), haul = Z(v, "h", 0), grade = Z(v, "g", 0);
  const tot = ac * rate + stumps * sp + haul + grade;
  return { c: `≈ ${$(tot)} to clear ${f(ac)} acres`, d: `${$(rate)}/acre (${["light brush", "moderately wooded", "heavily wooded"][d]})${stumps ? ` · ${f(stumps)} stumps × ${$(sp)}` : ""}${haul ? ` · haul-off ${$(haul)}` : ""}${grade ? ` · grading ${$(grade)}` : ""}`, note: "Rough US ranges — slope, access, burning rules and selling timber change the price · get 2–3 quotes" };
};
export const hookups: Calc = (v) => {
  const it: [string, number][] = [["water tap", Z(v, "w", 3000)], ["sewer tap", Z(v, "s", 4000)], ["well (instead of water)", Z(v, "e", 0)], ["septic (instead of sewer)", Z(v, "p", 0)], ["electric", Z(v, "l", 3500)], ["gas", Z(v, "g", 1500)], ["internet", Z(v, "i", 0)]];
  const run = Z(v, "r", 100), rc = Z(v, "c", 30), tot = it.reduce((s, [, x]) => s + x, 0) + run * rc;
  return { c: `≈ ${$(tot)} for utility connections`, d: `${it.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · ")} · trenching ${f(run)} ft × ${$(rc)}`, note: "Tap and impact fees vary hugely by city — call the utilities · rural lots may need a well ($5k–$15k+) and septic ($5k–$20k+)" };
};
export const lotYield: Calc = (v) => {
  const ac = P(v, "a", 10, "Gross acres"), road = Z(v, "r", 20) / 100, open = Z(v, "o", 10) / 100, minLot = P(v, "m", 7500, "Minimum lot size"), lotV = Z(v, "v", 90000), dev = Z(v, "c", 45000);
  const net = ac * 43560 * (1 - road - open), lots = Math.floor(net / minLot);
  return { y: `≈ ${lots} lots`, a: `${f(net / 43560)} net acres after ${pc(road, 0)} roads/utilities and ${pc(open, 0)} open space · ${f(lots / ac)} lots per gross acre`, note: lotV ? `Finished lot value ${$(lots * lotV)} − development ${$(lots * dev)} = ${$(lots * (lotV - dev))} before land cost` : "Zoning frontage, setbacks and drainage can cut the count further" };
};
export const far: Calc = (v) => {
  const lot = P(v, "l", 10000, "Lot area"), m = pick(v.m, 2), F = Z(v, "f", 2), gfa = Z(v, "g", 15000), st = Math.max(1, num(v.s, 4));
  if (m === 0) return { r: `Maximum floor area ${f(lot * F)} sq ft`, d: `FAR ${f(F)} × ${f(lot)} sq ft lot · e.g. ${f((lot * F) / st)} sq ft per floor over ${f(st)} floors (${pc(F / st, 0)} lot coverage)`, note: "FAR = gross floor area ÷ lot area · height limits, setbacks and parking can stop you reaching the max" };
  return { r: `FAR = ${f(gfa / lot)}`, d: `${f(gfa)} sq ft of floor area on ${f(lot)} sq ft`, note: "Compare with your zoning district's maximum FAR" };
};
export const setback: Calc = (v) => {
  const W = P(v, "w", 60, "Lot width"), D = P(v, "d", 120, "Lot depth"), fr = Z(v, "f", 25), rr = Z(v, "r", 20), sd = Z(v, "s", 5), cov = Z(v, "c", 40) / 100;
  const bw = Math.max(0, W - 2 * sd), bd = Math.max(0, D - fr - rr), env = bw * bd, maxCov = W * D * cov;
  return { e: `Buildable envelope ${f(bw)} × ${f(bd)} ft = ${f(env)} sq ft`, c: cov ? `Lot coverage limit ${pc(cov, 0)} allows ${f(maxCov)} sq ft footprint — ${env > maxCov ? "coverage is the tighter limit" : "setbacks are the tighter limit"}` : `${pc(env / (W * D), 0)} of the lot`, note: `Front ${f(fr)} ft, rear ${f(rr)} ft, each side ${f(sd)} ft · check corner-lot and easement rules` };
};
export const impactFees: Calc = (v) => {
  const sf = P(v, "s", 2200, "House sq ft"), it: [string, number][] = [["schools", Z(v, "a", 6000)], ["roads/transportation", Z(v, "b", 4000)], ["parks", Z(v, "c", 1500)], ["water/sewer capacity", Z(v, "d", 5000)], ["fire/police", Z(v, "e", 800)]], per = Z(v, "p", 0), permit = Z(v, "x", 0);
  const tot = it.reduce((s, [, x]) => s + x, 0) + per * sf + permit;
  return { c: `≈ ${$(tot)} in impact and permit fees`, d: `${it.filter(([, x]) => x).map(([n, x]) => `${n} ${$(x)}`).join(" · ")}${per ? ` · ${$2(per)}/sq ft` : ""}${permit ? ` · building permit ${$(permit)}` : ""}`, note: "Impact fees are set by each county/city — some charge nothing, fast-growing areas can exceed $30,000 per home · get the local fee schedule" };
};
export const specHome: Calc = (v) => {
  const land = Z(v, "l", 80000), sf = P(v, "s", 2200, "Sq ft"), cpsf = P(v, "c", 175, "Build cost per sq ft"), soft = Z(v, "x", 10) / 100, m = Math.max(1, num(v.m, 9)), rate = Z(v, "r", 10) / 100, ltc = Z(v, "t", 80) / 100, sale = P(v, "p", 580000, "Sale price"), sell = Z(v, "k", 7) / 100;
  const hard = sf * cpsf, cost = land + hard * (1 + soft), loan = cost * ltc, interest = loan * 0.6 * rate * (m / 12), tot = cost + interest + sale * sell, pr = sale - tot;
  return { p: `Profit ≈ ${$(pr)} (${pc(pr / sale, 1)} margin)`, d: `Land ${$(land)} + build ${$(hard)} + soft ${$(hard * soft)} + interest ${$(interest)} + selling ${$(sale * sell)} = ${$(tot)}`, note: `Return on cash ${pc(pr / (cost - loan), 0)} · interest assumes ~60% of the loan drawn on average over ${f(m)} months · builders aim for 15–20%+ margins` };
};
// ---- Mortgage payment types ----
export const ioShock: Calc = (v) => {
  const L = P(v, "l", 400000, "Loan"), r = P(v, "r", 6.5, "Rate") / 100, io = Math.max(1, Math.round(num(v.i, 10))), T = Math.max(io + 1, Math.round(num(v.t, 30)));
  const ioP = (L * r) / 12, am = pmt(L, r / 12, (T - io) * 12), full = pmt(L, r / 12, T * 12);
  return { s: `Payment jumps from ${$2(ioP)} to ${$2(am)} after year ${io} (+${$2(am - ioP)}, ${pc(am / ioP - 1, 0)})`, c: `A regular ${T}-year loan would be ${$2(full)} throughout`, note: `Total interest ${$(ioP * io * 12 + am * (T - io) * 12 - L)} vs ${$(full * T * 12 - L)} fully amortising · no equity is built from payments during the interest-only years` };
};
export const armAdjust: Calc = (v) => {
  const L = P(v, "l", 400000, "Loan"), r0 = P(v, "r", 5.75, "Start rate") / 100, fix = Math.max(1, Math.round(num(v.f, 5))), idx = Z(v, "i", 4.3) / 100, mg = Z(v, "m", 2.75) / 100, c1 = Z(v, "a", 2) / 100, cs = Z(v, "b", 1) / 100, cl = Z(v, "c", 5) / 100, T = 30;
  const p0 = pmt(L, r0 / 12, T * 12), fully = idx + mg, r1 = Math.min(fully, r0 + c1, r0 + cl), b = bal(L, r0 / 12, T * 12, fix * 12), p1 = pmt(b, r1 / 12, (T - fix) * 12), worst = Math.min(r0 + cl, 0.5);
  return { p: `First reset (year ${fix + 1}): rate ${pc(r1, 3)} → payment ${$2(p1)} (from ${$2(p0)}, ${p1 >= p0 ? "+" : "−"}${$2(Math.abs(p1 - p0))})`, w: `Worst case at the ${pc(cl, 0)} lifetime cap: ${pc(worst, 2)} → ${$2(pmt(b, worst / 12, (T - fix) * 12))}`, note: `Fully indexed rate = index ${pc(idx, 2)} + margin ${pc(mg, 2)} = ${pc(fully, 3)} · caps ${pc(c1, 0)}/${pc(cs, 0)}/${pc(cl, 0)} (first/subsequent/lifetime) · later resets move by up to ${pc(cs, 0)} a year` };
};
export const buydown21: Calc = (v) => {
  const L = P(v, "l", 400000, "Loan"), r = P(v, "r", 6.75, "Note rate") / 100, t = pick(v.t, 3), steps = [[0.02, 0.01], [0.01], [0.03, 0.02, 0.01]][t], full = pmt(L, r / 12, 360);
  const pays = steps.map((d) => pmt(L, (r - d) / 12, 360)), cost = pays.reduce((s, x) => s + (full - x) * 12, 0);
  return { p: steps.map((d, i) => `Year ${i + 1}: ${pc(r - d, 2)} → ${$2(pays[i])}`).join(" · ") + ` · then ${pc(r, 2)} → ${$2(full)}`, c: `Buydown costs ${$(cost)} (usually paid by the seller or builder into escrow)`, note: `${["2-1", "1-0", "3-2-1"][t]} temporary buydown · you must qualify at the full note rate · unused funds may go to principal if you refinance early` };
};
export const rateIncrease: Calc = (v) => {
  const L = P(v, "l", 400000, "Loan"), r = P(v, "r", 6.5, "Rate") / 100, d = num(v.d, 0.5) / 100, n = Math.round(num(v.n, 30)) * 12, p0 = pmt(L, r / 12, n), p1 = pmt(L, (r + d) / 12, n), maxL = (p0 * (1 - (1 + (r + d) / 12) ** -n)) / ((r + d) / 12);
  return { p: `Payment ${d >= 0 ? "rises" : "falls"} ${$2(Math.abs(p1 - p0))}/month (${$2(p0)} → ${$2(p1)})`, b: `Same payment buys a ${$(maxL)} loan at ${pc(r + d, 2)} (${d >= 0 ? "−" : "+"}${$(Math.abs(L - maxL))} buying power)`, note: `≈ ${$2(Math.abs(p1 - p0) / (Math.abs(d) * 800 || 1))} per 0.125% · ${$(Math.abs(p1 - p0) * n)} over the loan` };
};
export const escrowShort: Calc = (v) => {
  const tx = P(v, "t", 6400, "Annual taxes"), ins = Z(v, "i", 2200), balNow = Z(v, "b", 900), low = Z(v, "l", -200), months = Math.max(1, num(v.m, 12)), cur = Z(v, "c", 650);
  const annual = tx + ins, cushion = annual / 6, need = Math.max(0, cushion - low), base = annual / 12, newEsc = base + need / months;
  return { s: need ? `Shortage ≈ ${$2(need)} → +${$2(need / months)}/month over ${f(months)} months (or pay it in one lump sum)` : "No shortage — your projected low point stays above the cushion", e: `New escrow payment ≈ ${$2(newEsc)} (was ${$2(cur)}): ${$2(base)} for ${$(annual)} of yearly bills + shortage spread`, note: `RESPA cushion up to 2 months (1/6 of ${$(annual)} = ${$2(cushion)}) · lowest projected balance ${$2(low)} · current balance ${$2(balNow)} · higher taxes or insurance cause most shortages` };
};
export const pmiRemoval: Calc = (v) => {
  const ov = P(v, "v", 400000, "Original value"), L = P(v, "l", 380000, "Original loan"), r = P(v, "r", 6.5, "Rate") / 100, n = Math.round(num(v.n, 30)) * 12, start = dateIn(v, "d", today() - 730), extra = Z(v, "x", 0), pmi = Z(v, "p", 150);
  const p = pmt(L, r / 12, n); let b = L, k = 0, k80 = 0, k78 = 0; while (b > 0 && k < n) { b = b * (1 + r / 12) - p - extra; k++; if (!k80 && b <= 0.8 * ov) k80 = k; if (!k78 && b <= 0.78 * ov) { k78 = k; break; } }
  const mid = n / 2, auto = Math.min(k78 || n, mid);
  return { r: k80 ? `Request removal from ${dayText(addMonths(start, k80))} (balance hits 80% of value, month ${k80})` : "Already at or below 80%", a: `Automatic cancellation by ${dayText(addMonths(start, auto))} (78% or mid-term, month ${auto})`, note: `${pmi ? `Removing ${$(pmi)}/month PMI saves ${$(pmi * 12)} a year · ` : ""}a new appraisal showing 20–25% equity can remove it sooner (lender rules) · FHA MIP follows different rules` };
};
export const perDiem: Calc = (v) => {
  const b = P(v, "b", 285000, "Principal balance"), r = P(v, "r", 6.25, "Rate") / 100, basis = [365, 360][pick(v.y, 2)], last = dateIn(v, "l", today() - 10), pay = dateIn(v, "p", today() + 15), fees = Z(v, "f", 150);
  const daily = (b * r) / basis, days = Math.max(0, pay - last), tot = b + daily * days + fees;
  return { q: `Payoff ≈ ${$2(tot)} on ${dayText(pay)}`, d: `Per diem ${$2(daily)} × ${nfmt(days, 0)} days (since ${dayText(last)}) = ${$2(daily * days)} interest + fees ${$2(fees)}`, note: `${basis}-day basis · mortgage interest is paid in arrears, so payoff includes interest to the payoff date · always get the official payoff letter from the servicer` };
};
export const bankStatement: Calc = (v) => {
  const dep = P(v, "d", 22000, "Average monthly deposits"), exp = Math.min(100, Z(v, "e", 50)) / 100, type = pick(v.t, 2), own = Math.min(100, Z(v, "o", 100)) / 100, dti = Z(v, "x", 45) / 100, debts = Z(v, "b", 800), r = Z(v, "r", 8) / 100;
  const inc = type === 0 ? dep * (1 - exp) * own : dep, maxPay = inc * dti - debts, maxL = maxPay > 0 ? (maxPay * 0.8 * (1 - (1 + r / 12) ** -360)) / (r / 12) : 0;
  return { i: `Qualifying income ≈ ${$(inc)}/month (${$(inc * 12)}/yr)`, l: maxPay > 0 ? `Max total housing payment ${$(maxPay)} at ${pc(dti, 0)} DTI → loan ≈ ${$(maxL)} (assuming 80% of it is P&I)` : "Existing debts use up the allowed DTI", note: `${type === 0 ? `Business statements: deposits × (1 − ${pc(exp, 0)} expense factor) × ${pc(own, 0)} ownership` : "Personal statements: deposits counted at 100%"} · non-QM loans usually need 12–24 months of statements and carry higher rates` };
};
// ---- Buyer programs ----
export const usdaFee: Calc = (v) => {
  const L = P(v, "l", 300000, "Base loan"), up = Z(v, "u", 1) / 100, an = Z(v, "a", 0.35) / 100, r = Z(v, "r", 6.25) / 100, fin = pick(v.f, 2) === 0;
  const fee = L * up, tot = fin ? L + fee : L, mo = (tot * an) / 12, pi = pmt(tot, r / 12, 360);
  return { u: `Upfront guarantee fee ${$(fee)} (${pc(up, 2)})${fin ? " — financed into the loan" : " — paid in cash"}`, a: `Annual fee ≈ ${$2(mo)}/month (${pc(an, 2)}) · P&I ${$2(pi)} → ${$2(pi + mo)} before taxes and insurance`, note: `USDA Guaranteed Rural Housing fees: 1.00% upfront, 0.35% annual (on the remaining balance, recalculated yearly) · loan amount ${$(tot)}` };
};
export const vaFee: Calc = (v) => {
  const L = P(v, "l", 400000, "Loan amount"), t = pick(v.t, 3), sub = pick(v.u, 2) === 1, dn = Z(v, "d", 0) / 100, ex = pick(v.x, 2) === 1;
  const rate = ex ? 0 : t === 2 ? 0.005 : t === 1 ? (sub ? 0.033 : 0.0215) : dn >= 0.1 ? 0.0125 : dn >= 0.05 ? 0.015 : sub ? 0.033 : 0.0215;
  return { f: ex ? "Exempt — no funding fee" : `VA funding fee ${$(L * rate)} (${pc(rate, 2)})`, d: `${["Purchase / construction", "Cash-out refinance", "IRRRL (streamline)"][t]} · ${sub ? "subsequent use" : "first use"}${t === 0 ? ` · ${pc(dn, 0)} down` : ""}`, note: "Rates since 7 Apr 2023 · exempt: veterans receiving VA disability compensation, Purple Heart recipients on active duty, and surviving spouses receiving DIC · the fee can be financed" };
};
export const fhaMip: Calc = (v) => {
  const price = P(v, "p", 350000, "Price"), dn = Z(v, "d", 3.5) / 100, term = pick(v.t, 2) === 0 ? 30 : 15, r = Z(v, "r", 6.25) / 100;
  const base = price * (1 - dn), ltv = 1 - dn, big = base > 726200, ann = term > 15 ? (big ? (ltv > 0.95 ? 0.0075 : 0.007) : ltv > 0.95 ? 0.0055 : 0.005) : big ? (ltv > 0.9 ? 0.0065 : ltv > 0.78 ? 0.004 : 0.0015) : ltv > 0.9 ? 0.004 : 0.0015;
  const uf = base * 0.0175, tot = base + uf, mo = (tot * ann) / 12;
  return { u: `Upfront MIP ${$(uf)} (1.75%) → total loan ${$(tot)}`, a: `Annual MIP ${pc(ann, 2)} ≈ ${$2(mo)}/month · P&I ${$2(pmt(tot, r / 12, term * 12))}`, note: `${ltv > 0.9 ? "Paid for the life of the loan (LTV over 90%) — refinance to remove it" : "Paid for 11 years (LTV 90% or less)"} · base loan ${$(base)} (${pc(ltv, 1)} LTV), ${term}-year term · FHA rates from ML 2023-05` };
};
const CLL = [832750, 1066250, 1288800, 1601750];
export const conforming: Calc = (v) => {
  const u = pick(v.u, 4), area = pick(v.a, 3), L = Z(v, "l", 700000), cty = Z(v, "c", 0);
  const lim = cty || (area === 0 ? CLL[u] : CLL[u] * 1.5);
  return { l: `2026 conforming limit ${$(lim)} for ${u + 1} unit${u ? "s" : ""}`, c: L ? (L <= lim ? `Your ${$(L)} loan is conforming` : `Your ${$(L)} loan is a jumbo loan (${$(L - lim)} over)`) : "Enter a loan amount", note: `Baseline ${$(CLL[0])} one-unit; high-cost areas up to 150% (${$(CLL[0] * 1.5)}); Alaska, Hawaii, Guam and USVI baseline ${$(CLL[0] * 1.5)} · county limits vary — enter your county's limit to override` };
};
export const homePossible: Calc = (v) => {
  const inc = P(v, "i", 80000, "Income"), ami = P(v, "a", 105000, "Area median income"), pctL = Z(v, "p", 80) / 100, lim = ami * pctL;
  return { e: inc <= lim ? `Income-eligible: ${$(inc)} ≤ ${$(lim)} (${pc(pctL, 0)} of AMI)` : `Over the income limit by ${$(inc - lim)}`, d: `${pc(inc / ami, 0)} of the ${$(ami)} area median income`, note: "Freddie Mac Home Possible and Fannie Mae HomeReady cap income at 80% of AMI (look up your area's AMI on their eligibility maps) · 3% down, lower PMI · homebuyer education may be required" };
};
export const mcc: Calc = (v) => {
  const L = P(v, "l", 300000, "Loan"), r = P(v, "r", 6.5, "Rate") / 100, cr = Math.min(50, Z(v, "c", 20)) / 100, tax = Z(v, "t", 4000), y = Math.max(1, Math.round(num(v.y, 10)));
  let b = L, tot = 0; const p = pmt(L, r / 12, 360); let first = 0;
  for (let k = 0; k < y; k++) { let int = 0; for (let m = 0; m < 12; m++) { const i = (b * r) / 12; int += i; b = b + i - p; } const c = Math.min(cr > 0.2 ? 2000 : Infinity, int * cr, tax); tot += c; if (!k) first = c; }
  return { c: `≈ ${$(first)} tax credit in year 1 · ${$(tot)} over ${y} years`, d: `${pc(cr, 0)} of mortgage interest${cr > 0.2 ? " (capped at $2,000 a year)" : ""}, limited to your ${$(tax)} tax liability`, note: "MCCs come from state/local housing agencies for first-time buyers under income and price limits · the remaining interest can still be itemised · may trigger recapture if you sell within 9 years" };
};
// ---- Refinance & equity ----
export const rateDrop: Calc = (v) => {
  const b = P(v, "b", 320000, "Balance"), r0 = P(v, "r", 7.25, "Current rate") / 100, r1 = P(v, "n", 6.25, "New rate") / 100, left = Math.max(1, Math.round(num(v.y, 27))) * 12, newT = Math.round(num(v.t, 30)) * 12, cc = Z(v, "c", 6000), stay = Math.max(1, num(v.s, 7));
  const p0 = pmt(b, r0 / 12, left), p1 = pmt(b + 0, r1 / 12, newT), sav = p0 - p1, be = sav > 0 ? cc / sav : Infinity, keep = Math.min(stay * 12, left), net = sav * keep - cc;
  return { w: sav > 0 && be <= stay * 12 ? `Worth it — breaks even in ${f(be)} months` : `Not worth it over ${f(stay)} years`, d: `Payment ${$2(p0)} → ${$2(p1)} (${sav >= 0 ? "−" : "+"}${$2(Math.abs(sav))}) for ${$(cc)} closing costs · net ${net >= 0 ? "+" : "−"}${$(Math.abs(net))} over ${f(stay)} years`, note: `Rate drop ${pc(r0 - r1, 2)} · resetting to ${newT / 12} years lowers the payment but can raise lifetime interest — compare total interest, not just the payment` };
};
export const helocVsCashOut: Calc = (v) => {
  const b = P(v, "b", 250000, "Current balance"), r0 = P(v, "r", 3.5, "Current rate") / 100, left = Math.round(num(v.y, 25)) * 12, need = P(v, "n", 60000, "Cash needed"), hr = P(v, "h", 8.5, "HELOC rate") / 100, cr = P(v, "c", 6.75, "Cash-out rate") / 100, cc = Z(v, "x", 7000), hc = Z(v, "z", 500), yrs = Math.max(1, num(v.s, 10));
  const cur = pmt(b, r0 / 12, left), heloc = pmt(need, hr / 12, 120), co = pmt(b + need + cc, cr / 12, 360), totH = (cur + heloc) * 12 * Math.min(yrs, 10) + (yrs > 10 ? cur * 12 * (yrs - 10) : 0) + hc, totC = co * 12 * yrs;
  return { r: totH <= totC ? `HELOC is cheaper over ${f(yrs)} years by ${$(totC - totH)}` : `Cash-out refi is cheaper over ${f(yrs)} years by ${$(totH - totC)}`, d: `HELOC: keep ${$2(cur)} + ${$2(heloc)} (10-yr payoff at ${pc(hr, 2)}) · cash-out: ${$2(co)} on ${$(b + need + cc)} at ${pc(cr, 2)}`, note: "Keeping a low first-mortgage rate usually favours a HELOC · HELOC rates are variable — test higher rates" };
};
export const hei: Calc = (v) => {
  const val = P(v, "v", 500000, "Home value"), cash = P(v, "c", 50000, "Cash received"), share = Z(v, "s", 15) / 100, adj = Z(v, "a", 0) / 100, g = num(v.g, 4) / 100, y = Math.max(1, num(v.y, 10)), fee = Z(v, "f", 3) / 100;
  const base = val * (1 - adj), fut = val * (1 + g) ** y, owe = Math.max(cash, base * share + (fut - base) * share), eff = (owe / (cash * (1 - fee))) ** (1 / y) - 1;
  return { o: `You'd repay ≈ ${$(owe)} after ${f(y)} years`, r: `Effective cost ≈ ${pc(eff, 1)} a year on ${$(cash * (1 - fee))} received after ${pc(fee, 0)} fees`, note: `Investor takes ${pc(share, 0)} of the value (risk-adjusted start ${$(base)}) · home grows ${pc(g, 1)}/yr to ${$(fut)} · contracts differ — check caps, minimums and the risk adjustment` };
};
export const sam: Calc = (v) => {
  const val = P(v, "v", 450000, "Home value"), L = P(v, "l", 360000, "Loan"), r = P(v, "r", 6.5, "Market rate") / 100, rd = Z(v, "d", 1.5) / 100, sh = Z(v, "s", 30) / 100, g = num(v.g, 4) / 100, y = Math.max(1, num(v.y, 10));
  const p0 = pmt(L, r / 12, 360), p1 = pmt(L, (r - rd) / 12, 360), save = (p0 - p1) * 12 * y, appr = val * ((1 + g) ** y - 1), give = appr * sh;
  return { r: save >= give ? `SAM wins by ${$(save - give)} over ${f(y)} years` : `Regular loan wins by ${$(give - save)} over ${f(y)} years`, d: `Payment saving ${$2(p0 - p1)}/mo (${$(save)} total) vs ${pc(sh, 0)} of ${$(appr)} appreciation = ${$(give)}`, note: "Shared-appreciation mortgages trade a lower rate for part of your home's gain · faster appreciation makes them costlier" };
};
// ---- Property tax ----
export const taxAppeal: Calc = (v) => {
  const av = P(v, "a", 420000, "Assessed value"), mv = P(v, "m", 380000, "Your market value estimate"), ratio = Z(v, "r", 100) / 100, rate = Z(v, "t", 1.8) / 100, fee = Z(v, "f", 0), pctFee = Z(v, "p", 0) / 100, y = Math.max(1, num(v.y, 1));
  const newAv = mv * ratio, cut = Math.max(0, av - newAv), sav = cut * rate * y, net = sav - fee - sav * pctFee;
  return { s: cut ? `Potential saving ${$(cut * rate)} a year` : "No saving — your estimate isn't below the assessment", d: `Assessment ${$(av)} → ${$(newAv)} (−${$(cut)}) at a ${pc(rate, 2)} tax rate · net ${$(net)} over ${f(y)} year${y > 1 ? "s" : ""} after fees`, note: "Win with recent comparable sales or proof of defects · deadlines are short (often 30–60 days after notices) · consultants often charge 25–50% of the first year's savings" };
};
export const seniorFreeze: Calc = (v) => {
  const tax = P(v, "t", 5000, "Current tax"), g = Z(v, "g", 4) / 100, y = Math.max(1, Math.round(num(v.y, 10)));
  let saved = 0, t = tax; for (let k = 1; k <= y; k++) { t *= 1 + g; saved += t - tax; }
  return { s: `Freeze saves ≈ ${$(saved)} over ${y} years`, d: `Without it, the tax would reach ${$(t)} (+${pc(g, 1)}/yr); frozen at ${$(tax)}`, note: "Many states freeze assessments or taxes for seniors (often 65+) under income limits — some are deferrals that must be repaid on sale · check your county assessor" };
};
export const caSupplemental: Calc = (v) => {
  const price = P(v, "p", 900000, "New assessed value"), prior = Z(v, "o", 450000), rate = Z(v, "r", 1.15) / 100, d = dateIn(v, "d", today()), m = dayParts(d).m;
  const left = m >= 7 ? 18 - m : 6 - m, fac = Math.max(0, left) / 12, inc = (price - prior) * rate, first = inc * fac, two = m >= 1 && m <= 5;
  return { s: `Supplemental tax ≈ ${$(first)}${two ? ` + a second bill ≈ ${$(inc)} for next fiscal year` : ""}`, d: `(${$(price)} − ${$(prior)}) × ${pc(rate, 2)} = ${$(inc)} a year × ${f(fac * 12)}/12 left in the July–June fiscal year`, note: "California sends supplemental bills after a purchase or new construction because Prop 13 reassesses at the change of ownership · they're billed to you, not your escrow account — budget for them" };
};
export const prop13: Calc = (v) => {
  const base = P(v, "b", 500000, "Base-year value"), y0 = Math.round(num(v.y, 2015)), y1 = Math.round(num(v.n, 2026)), cpi = Z(v, "c", 2) / 100, rate = Z(v, "r", 1.1) / 100, mkt = Z(v, "m", 0);
  const yrs = Math.max(0, y1 - y0), av = base * (1 + Math.min(0.02, cpi)) ** yrs;
  return { a: `${y1} assessed value ≈ ${$(av)}`, t: `Tax ≈ ${$(av * rate)} at ${pc(rate, 2)} (1% general levy + local bonds)`, note: mkt ? `Paying on ${pc(av / mkt, 0)} of market value · a buyer at ${$(mkt)} would pay ≈ ${$(mkt * rate)}` : `Assessed value grows at most 2% a year (CPI if lower) for ${yrs} years · resets on sale or new construction` };
};
export const costSeg: Calc = (v) => {
  const basis = P(v, "b", 1000000, "Building basis"), short = Z(v, "s", 25) / 100, res = pick(v.t, 2) === 0, bonus = Z(v, "x", 100) / 100, rate = Z(v, "r", 37) / 100, fee = Z(v, "f", 8000);
  const life = res ? 27.5 : 39, std = basis / life, sp = basis * short, rest = basis - sp, yr1 = sp * bonus + (sp * (1 - bonus)) / 7 + rest / life;
  return { d: `Year-1 depreciation ≈ ${$(yr1)} vs ${$(std)} straight-line`, s: `Extra deduction ${$(yr1 - std)} ≈ ${$((yr1 - std) * rate)} tax deferred at ${pc(rate, 0)} (study fee ${$(fee)})`, note: `${pc(short, 0)} reclassified to 5/7/15-year property with ${pc(bonus, 0)} bonus depreciation (100% for property acquired after 19 Jan 2025) · depreciation recapture applies on sale · passive-loss limits may apply` };
};
export const passiveLoss: Calc = (v) => {
  const loss = P(v, "l", 30000, "Rental loss"), magi = P(v, "m", 120000, "MAGI"), act = pick(v.a, 2) === 0, re = pick(v.r, 2) === 1, mfs = pick(v.f, 2) === 1;
  const allow = re ? loss : !act || mfs ? 0 : Math.max(0, 25000 - Math.max(0, magi - 100000) * 0.5), ded = Math.min(loss, allow);
  return { d: `Deductible this year ≈ ${$(ded)}`, c: `${$(loss - ded)} suspended and carried forward (usable against future passive income or when you sell)`, note: re ? "Real estate professionals who materially participate aren't limited" : `$25,000 special allowance for active participation, cut by 50% of MAGI over $100,000 (gone at $150,000)${mfs ? " · married filing separately (living together) gets none" : ""}` };
};
export const firpta: Calc = (v) => {
  const price = P(v, "p", 750000, "Amount realized"), res = pick(v.r, 2) === 0, rate = res && price <= 300000 ? 0 : res && price <= 1000000 ? 0.1 : 0.15;
  return { w: rate ? `FIRPTA withholding ${$(price * rate)} (${pc(rate, 0)})` : "No withholding (residence exemption ≤ $300,000)", d: `Sale price ${$(price)} · ${res ? "buyer will live in the home" : "buyer won't use it as a residence"}`, note: "Buyer withholds from a foreign seller and files Form 8288 within 20 days · the seller can apply for a reduced amount (Form 8288-B) and recovers any excess on their US return" };
};
export const vacationHome: Calc = (v) => {
  const rd = Z(v, "r", 90), pd = Z(v, "p", 20), inc = Z(v, "i", 18000), exp = Z(v, "e", 14000), tot = rd + pd;
  if (rd < 15) return { r: "Rented under 15 days — rental income is tax-free and not reported", a: "Expenses aren't deductible as rental expenses (mortgage interest/taxes may be itemised)", note: "The '14-day rule' (IRC §280A(g))" };
  const resid = pd > Math.max(14, rd * 0.1), share = rd / (tot || 1), allowed = exp * share;
  return { r: resid ? "Treated as a residence (personal use over 14 days or 10% of rental days) — rental loss can't be deducted" : "Treated as a rental property — losses may be deductible (passive rules apply)", a: `${pc(share, 0)} of expenses (${$(allowed)}) go to the rental · net ${$(inc - allowed)}${resid && inc - allowed < 0 ? " → deductions limited to rental income" : ""}`, note: `${f(rd)} rental days, ${f(pd)} personal days · days spent repairing don't count as personal use` };
};
// ---- Rent & tenant ----
export const rentRooms: Calc = (v) => {
  const rent = P(v, "r", 3000, "Total rent"), s = [Z(v, "a", 180), Z(v, "b", 140), Z(v, "c", 120), Z(v, "d", 0)].filter((x) => x > 0), comm = Math.min(90, Z(v, "x", 40)) / 100, bath = Z(v, "p", 0);
  if (!s.length) throw new InputError("Enter at least one room size.");
  const n = s.length, tot = s.reduce((a, b) => a + b, 0), shares = s.map((x) => rent * (comm / n + (1 - comm) * (x / tot)) + (bath && x === Math.max(...s) ? bath : 0) - (bath ? bath / n : 0));
  return { s: shares.map((x, i) => `Room ${i + 1} (${f(s[i])} sq ft): ${$(x)}`).join(" · "), d: `${pc(comm, 0)} of rent split equally for shared space, ${pc(1 - comm, 0)} by bedroom size`, note: bath ? `${$(bath)} premium for the largest room's private bath, offset from the others` : "Adjust for private bathrooms, parking or closets with the premium field" };
};
export const rentCap: Calc = (v) => {
  const rent = P(v, "r", 2400, "Current rent"), law = pick(v.l, 3), cpi = Z(v, "c", 3.2) / 100, custom = Z(v, "x", 5) / 100;
  const cap = law === 0 ? Math.min(0.1, 0.05 + cpi) : law === 1 ? Math.min(0.1, 0.07 + cpi) : custom;
  return { m: `Maximum increase ${pc(cap, 1)} → up to ${$2(rent * (1 + cap))}/month (+${$2(rent * cap)})`, d: `${["California AB 1482: 5% + regional CPI, max 10%", "Oregon: 7% + CPI, max 10% (state publishes the yearly cap)", "Custom local cap"][law]}`, note: "Exemptions apply (e.g. newer buildings, some single-family homes) and many cities have stricter rules · increases usually limited to once per 12 months" };
};
export const leaseBreak: Calc = (v) => {
  const rent = P(v, "r", 2000, "Monthly rent"), left = Z(v, "m", 6), fee = Z(v, "f", 2), relet = Z(v, "x", 2), dep = Z(v, "d", 2000), opt = pick(v.o, 2) === 0;
  const owe = opt ? rent * fee : rent * Math.min(left, relet), net = owe - dep;
  return { c: `Breaking the lease costs ≈ ${$(owe)}`, d: opt ? `Early-termination fee of ${f(fee)} months' rent` : `Rent until re-let: ${f(Math.min(left, relet))} of ${f(left)} months remaining (landlords must usually try to re-rent)`, note: `${net > 0 ? `About ${$(net)} beyond your ${$(dep)} deposit` : `Could be covered by your ${$(dep)} deposit`} · military (SCRA) and domestic-violence protections let some tenants leave without penalty` };
};
export const moveNotice: Calc = (v) => {
  const end = dateIn(v, "d", today() + 60), days = Math.max(0, Math.round(num(v.n, 30))), mo = pick(v.m, 2) === 0;
  const give = end - days;
  return { n: `Give notice by ${dayText(give)}`, l: give < today() ? "That date has passed — check your lease for the earliest move-out you can still get" : `${give - today()} days from today`, note: `${days}-day notice before ${dayText(end)}${mo ? " (month-to-month: notice usually runs to the end of a rental period)" : ""} · send it in writing and keep proof` };
};
export const moveIn: Calc = (v) => {
  const rent = P(v, "r", 1800, "Rent"), first = pick(v.f, 2) === 0 ? rent : 0, last = pick(v.l, 2) === 1 ? rent : 0, dep = Z(v, "d", 1) * rent, app = Z(v, "a", 50) * Math.max(1, num(v.n, 1)), broker = Z(v, "b", 0) / 100 * rent * 12, pet = Z(v, "p", 0), mv = Z(v, "m", 800), ut = Z(v, "u", 150), furn = Z(v, "x", 0);
  const tot = first + last + dep + app + broker + pet + mv + ut + furn;
  return { c: `≈ ${$(tot)} to move in`, d: `First month ${$(first)} · last month ${$(last)} · deposit ${$(dep)} · applications ${$(app)}${broker ? ` · broker fee ${$(broker)}` : ""}${pet ? ` · pet deposit ${$(pet)}` : ""} · movers ${$(mv)} · utility setup ${$(ut)}${furn ? ` · furnishing ${$(furn)}` : ""}`, note: "Some states cap deposits (often 1–2 months) and ban last-month or broker fees for tenants · ask for an itemised move-in cost sheet" };
};
export const aptUtilities: Calc = (v) => {
  const sf = P(v, "s", 850, "Sq ft"), ppl = Math.max(1, num(v.p, 2)), climate = pick(v.c, 3), heat = pick(v.h, 2), e = Z(v, "e", 0.17), net = Z(v, "i", 60), water = pick(v.w, 2) === 0;
  const kwh = sf * [0.8, 1, 1.25][climate] * (heat === 1 ? 1.25 : 1), elec = kwh * e, gas = heat === 0 ? sf * 0.05 * [0.6, 1, 1.5][climate] : 0, wat = water ? 35 * ppl : 0, trash = 20;
  const tot = elec + gas + wat + net + trash;
  return { c: `≈ ${$(tot)} a month`, d: `Electric ${$(elec)} (${f(kwh)} kWh) · ${gas ? `gas ${$(gas)} · ` : ""}${wat ? `water/sewer ${$(wat)} · ` : ""}internet ${$(net)} · trash ${$(trash)}`, note: "Rough estimate — ask the landlord or utility for the unit's 12-month average bill · top-floor and corner units cost more to heat and cool" };
};
export const sublet: Calc = (v) => {
  const rent = P(v, "r", 2000, "Your rent"), sub = P(v, "s", 2200, "Sublet rent"), m = Math.max(1, num(v.m, 3)), fee = Z(v, "f", 0) / 100, vac = Z(v, "v", 0), furn = Z(v, "x", 0);
  const net = (sub * (1 - fee) - rent) * (m - vac) - rent * vac - furn;
  return { n: `${net >= 0 ? "Net gain" : "Net cost"} ≈ ${$(Math.abs(net))} over ${f(m)} months`, d: `${$(sub)} collected${fee ? ` − ${pc(fee, 0)} platform fee` : ""} vs ${$(rent)} rent · ${f(vac)} vacant months${furn ? ` · cleaning/furnishing ${$(furn)}` : ""}`, note: "Get written landlord permission — many leases ban subletting or profit from it · you stay liable for rent and damage" };
};
export const guarantor: Calc = (v) => {
  const rent = P(v, "r", 3200, "Monthly rent"), t = Z(v, "t", 40), g = Z(v, "g", 80), inc = Z(v, "i", 110000);
  const need = rent * t, gNeed = rent * g;
  return { t: `Tenant income needed: ${$(need)} a year (${f(t)}× rent)`, g: inc >= need ? `Your ${$(inc)} qualifies — no guarantor needed` : `Your ${$(inc)} falls short — a guarantor would need ${$(gNeed)} (${f(g)}× rent)`, note: "40× and 80× are common NYC rules (≈ 3× and 6.7× monthly income); elsewhere landlords often want 2.5–3× monthly rent · guarantor companies charge roughly 70–110% of a month's rent" };
};
// ---- Rental investment ----
const ruleTool = (pctRule: number, label: string): Calc => (v) => {
  const price = P(v, "p", 200000, "Price + repairs"), rent = Z(v, "r", 1800), target = price * pctRule;
  return { r: rent >= target ? `Passes the ${label} — ${$(rent)} ≥ ${$(target)}` : `Fails the ${label} — rent should be ${$(target)}/month`, a: `Rent is ${pc(rent / price, 2)} of the price per month · maximum price for this rent ${$(rent / pctRule)}`, note: `${label}: monthly rent ≥ ${pc(pctRule, 0)} of purchase price (+ rehab) — a quick screen, not a full analysis · expenses, taxes and rates vary a lot by market` };
};
export const onePct = ruleTool(0.01, "1% rule");
export const twoPct = ruleTool(0.02, "2% rule");
export const fiftyPct: Calc = (v) => {
  const rent = P(v, "r", 2000, "Monthly rent"), pi = Z(v, "m", 900), oth = Z(v, "o", 0), opx = rent * 0.5, cf = rent + oth - opx - pi;
  return { c: `Estimated cash flow ${$(cf)}/month (${$(cf * 12)}/yr)`, d: `50% of ${$(rent + oth)} income = ${$(opx)} for operating expenses (taxes, insurance, repairs, vacancy, management, capex) − ${$(pi)} mortgage`, note: "The 50% rule excludes the mortgage · newer homes may run 35–45%, older ones 50%+ — track real numbers once you own it" };
};
const multi = (units: number): Calc => (v) => {
  const price = P(v, "p", units === 2 ? 450000 : 750000, "Price"), rent = P(v, "r", units === 2 ? 1700 : 1500, "Rent per unit"), live = pick(v.h, 2) === 1, dn = Z(v, "d", 25) / 100, rate = Z(v, "i", 7) / 100, opx = Z(v, "e", 40) / 100, vac = Z(v, "v", 5) / 100;
  const rented = live ? units - 1 : units, gross = rent * rented * 12, egi = gross * (1 - vac), noi = egi * (1 - opx), loan = price * (1 - dn), ds = pmt(loan, rate / 12, 360) * 12, cf = noi - ds;
  return { c: `Cash flow ${$(cf / 12)}/month (${$(cf)}/yr)${live ? ` — your housing cost is ${$(-cf / 12)}/month` : ""}`, m: `NOI ${$(noi)} · cap rate ${pc(noi / price, 2)} · cash-on-cash ${pc(cf / (price * dn), 1)} · DSCR ${f(noi / ds)}`, note: `${units} units${live ? " (you live in one — house hacking)" : ""}, ${pc(vac, 0)} vacancy, ${pc(opx, 0)} expense ratio, ${pc(dn, 0)} down at ${pc(rate, 2)} · owner-occupied 2–4 units can use FHA (3.5%) or 5% conventional` };
};
export const duplex = multi(2);
export const fourplex = multi(4);
export const capex: Calc = (v) => {
  const items: [string, number, number, number][] = [["roof", Z(v, "a", 12000), Z(v, "b", 25), Z(v, "c", 10)], ["HVAC", Z(v, "d", 8000), Z(v, "e", 15), Z(v, "f", 8)], ["water heater", Z(v, "g", 1500), Z(v, "h", 12), Z(v, "i", 6)], ["flooring", Z(v, "j", 5000), Z(v, "k", 10), Z(v, "l", 5)], ["appliances", Z(v, "m", 3000), Z(v, "n", 12), Z(v, "o", 6)], ["paint", Z(v, "p", 3000), Z(v, "q", 7), Z(v, "r", 3)]];
  const mo = items.reduce((s, [, c, life, age]) => s + c / Math.max(1, life - Math.min(age, life - 1)) / 12, 0), typical = items.reduce((s, [, c, life]) => s + c / life / 12, 0);
  return { r: `Set aside ≈ ${$(mo)}/month for capex`, d: items.map(([n, c, life, age]) => `${n} ${$(c)} in ${f(Math.max(1, life - age))} yrs`).join(" · "), note: `Long-run average ${$(typical)}/month (replacement cost ÷ lifespan) · older components need more now · many investors budget 5–10% of rent` };
};
export const equityBuild: Calc = (v) => {
  const price = P(v, "p", 300000, "Price"), dn = Z(v, "d", 25) / 100, r = Z(v, "r", 7) / 100, g = num(v.g, 3) / 100, y = Math.max(1, Math.round(num(v.y, 10)));
  const L = price * (1 - dn), b = Math.max(0, bal(L, r / 12, 360, y * 12)), val = price * (1 + g) ** y, eq = val - b;
  return { e: `Equity after ${y} years ≈ ${$(eq)}`, d: `Value ${$(val)} − loan ${$(b)} · from down payment ${$(price * dn)} + principal paid ${$(L - b)} + appreciation ${$(val - price)}`, note: `${f(eq / (price * dn))}× your down payment · tenants' rent pays the principal down; appreciation of ${pc(g, 1)}/yr isn't guaranteed` };
};
export const portfolio: Calc = (v) => {
  const rows = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"], ["j", "k", "l"], ["m", "n", "o"]].map(([r, e, m]) => [Z(v, r, 0), Z(v, e, 0), Z(v, m, 0)]).filter(([r]) => r > 0);
  if (!rows.length) throw new InputError("Enter at least one property's rent.");
  const vac = Z(v, "v", 5) / 100, mg = Z(v, "x", 8) / 100, tot = rows.reduce((s, [r, e, m]) => s + r * (1 - vac - mg) - e - m, 0), rent = rows.reduce((s, [r]) => s + r, 0);
  return { c: `Portfolio cash flow ${$(tot)}/month (${$(tot * 12)}/yr)`, d: rows.map(([r, e, m], i) => `#${i + 1}: ${$(r * (1 - vac - mg) - e - m)}`).join(" · "), note: `${rows.length} properties, ${$(rent)} gross rent · ${pc(vac, 0)} vacancy and ${pc(mg, 0)} management taken off · expenses entered per property (taxes, insurance, HOA, repairs) and mortgages` };
};
export const hardMoney: Calc = (v) => {
  const L = P(v, "l", 250000, "Loan"), r = Z(v, "r", 11) / 100, pts = Z(v, "p", 2) / 100, m = Math.max(1, num(v.m, 8)), fees = Z(v, "f", 1500), draws = Z(v, "d", 0), io = pick(v.i, 2) === 0, avg = Z(v, "a", 100) / 100;
  const int = io ? L * avg * r * (m / 12) : L * r * (m / 12), tot = int + L * pts + fees + draws;
  return { c: `Total financing cost ≈ ${$(tot)}`, d: `Interest ${$(int)} (${pc(r, 1)} for ${f(m)} months${avg < 1 ? `, ${pc(avg, 0)} drawn on average` : ""}) · points ${$(L * pts)} · fees ${$(fees + draws)}`, note: `≈ ${pc(tot / L / (m / 12), 1)} annualised · hard-money loans are short-term (6–24 months) and priced on the deal's ARV, not your income` };
};
export const subjectTo: Calc = (v) => {
  const bal0 = P(v, "b", 220000, "Existing loan balance"), piti = P(v, "p", 1650, "Existing PITI"), rent = P(v, "r", 2300, "Rent"), opx = Z(v, "e", 25) / 100, cash = Z(v, "c", 15000), arrears = Z(v, "a", 0), val = Z(v, "v", 300000);
  const cf = rent * (1 - opx) - piti, inv = cash + arrears;
  return { c: `Cash flow ${$(cf)}/month (${$(cf * 12)}/yr)`, r: `Cash in ${$(inv)} · cash-on-cash ${inv ? pc((cf * 12) / inv, 1) : "∞"} · instant equity ${$(val - bal0)}`, note: "Subject-to keeps the seller's loan in place — the due-on-sale clause lets the lender call it · use an attorney, disclosures and insurance; never do this without legal advice" };
};
// ---- Short-term rentals ----
export const vrbo: Calc = (v) => {
  const n = P(v, "n", 4, "Nights"), rate = P(v, "r", 220, "Nightly rate"), cl = Z(v, "c", 150), comm = Z(v, "x", 5) / 100, proc = Z(v, "p", 3) / 100, tax = Z(v, "t", 0) / 100;
  const sub = n * rate + cl, fee = sub * (comm + proc), net = sub - fee;
  return { n: `You keep ${$2(net)} of ${$2(sub)}`, d: `Commission ${$2(sub * comm)} (${pc(comm, 0)}) + payment processing ${$2(sub * proc)} (${pc(proc, 0)})${tax ? ` · lodging tax collected ${$2(sub * tax)}` : ""}`, note: "VRBO pay-per-booking: 5% commission + 3% payment processing on rent and fees · guests also pay a separate service fee · check current terms" };
};
export const coHost: Calc = (v) => {
  const rev = P(v, "r", 6000, "Monthly booking revenue"), pctC = Z(v, "c", 20) / 100, cl = Z(v, "x", 600), basis = pick(v.b, 2), plat = Z(v, "p", 3) / 100;
  const base = basis === 0 ? rev : rev * (1 - plat) - cl, fee = base * pctC, net = rev * (1 - plat) - cl - fee;
  return { f: `Co-host earns ${$(fee)}/month`, n: `Owner keeps ${$(net)} after ${pc(plat, 0)} platform fee, ${$(cl)} cleaning and co-host fee`, note: `${pc(pctC, 0)} of ${basis === 0 ? "gross booking revenue" : "net revenue (after platform fees and cleaning)"} · typical co-host rates are 10–25%; full-service management 20–40%` };
};
export const strBreakEven: Calc = (v) => {
  const fixed = P(v, "f", 3200, "Monthly fixed costs"), adr = P(v, "a", 180, "Average nightly rate"), fee = Z(v, "p", 3) / 100, varN = Z(v, "v", 25), stay = Math.max(1, num(v.s, 3)), cl = Z(v, "c", 90);
  const perNight = adr * (1 - fee) - varN - cl / stay, nights = perNight > 0 ? fixed / perNight : Infinity, occ = nights / 30.4;
  return { o: Number.isFinite(nights) ? `Break-even occupancy ${pc(occ, 0)} (${f(nights)} nights/month)` : "Never breaks even — costs per night exceed the rate", d: `Each night nets ${$2(perNight)} after ${pc(fee, 0)} platform fee, ${$2(varN)} supplies/utilities and cleaning spread over ${f(stay)}-night stays`, note: "Compare with local occupancy data (AirDNA, PriceLabs) · fixed costs: mortgage, insurance, internet, software, HOA" };
};
export const glamping: Calc = (v) => {
  const u = P(v, "u", 4, "Units"), rate = P(v, "r", 160, "Nightly rate"), occ = Math.min(100, Z(v, "o", 55)) / 100, season = Z(v, "d", 240), build = Z(v, "b", 25000), opx = Z(v, "e", 35) / 100, land = Z(v, "l", 0);
  const rev = u * rate * occ * season, prof = rev * (1 - opx), cap = u * build + land;
  return { p: `Operating profit ≈ ${$(prof)} a year`, d: `${u} units × ${$(rate)} × ${pc(occ, 0)} occupancy × ${f(season)} open days = ${$(rev)} revenue − ${pc(opx, 0)} costs`, note: `Payback ≈ ${f(cap / Math.max(1, prof))} years on ${$(cap)} setup (units, decks, bathrooms, utilities${land ? ", land" : ""}) · check zoning and campground permits` };
};
export const midTerm: Calc = (v) => {
  const mr = P(v, "r", 3200, "Furnished monthly rent"), occ = Math.min(12, Z(v, "o", 10)), ut = Z(v, "u", 300), furn = Z(v, "f", 12000), plat = Z(v, "p", 0) / 100, ltr = Z(v, "l", 2200), y = Math.max(1, num(v.y, 5)), cl = Z(v, "c", 200);
  const yr = mr * occ * (1 - plat) - ut * 12 - cl * occ - furn / y, ltrYr = ltr * 12 * 0.96;
  return { i: `Mid-term net ≈ ${$(yr)} a year vs ${$(ltrYr)} unfurnished long-term`, d: `${f(occ)} months booked at ${$(mr)} − utilities ${$(ut * 12)} − turnovers ${$(cl * occ)} − furniture ${$(furn / y)}/yr`, note: `${yr >= ltrYr ? `Mid-term earns ${$(yr - ltrYr)} more` : `Long-term earns ${$(ltrYr - yr)} more`} · 30+ night stays (travel nurses, relocations) often avoid short-term rental rules and taxes — check locally` };
};

// ---- registry (generated)
export const ideaRe2CustomCalculators: Record<string, Calc> = {
  "land-clearing-cost-calculator": landClear,
  "utility-hookup-cost-calculator": hookups,
  "subdivision-lot-yield-calculator": lotYield,
  "floor-area-ratio-calculator": far,
  "building-setback-area-calculator": setback,
  "impact-fees-new-construction-calculator": impactFees,
  "spec-home-profit-calculator": specHome,
  "interest-only-period-payment-shock-calculator": ioShock,
  "arm-payment-adjustment-calculator": armAdjust,
  "temporary-buydown-2-1-calculator": buydown21,
  "mortgage-payment-increase-rate-calculator": rateIncrease,
  "escrow-shortage-calculator": escrowShort,
  "pmi-removal-date-calculator": pmiRemoval,
  "mortgage-payoff-quote-per-diem-calculator": perDiem,
  "bank-statement-loan-calculator": bankStatement,
  "usda-guarantee-fee-calculator": usdaFee,
  "va-funding-fee-calculator": vaFee,
  "fha-mip-calculator": fhaMip,
  "conforming-loan-limit-calculator": conforming,
  "home-possible-eligibility-calculator": homePossible,
  "mortgage-credit-certificate-savings-calculator": mcc,
  "refinance-rate-drop-worth-it-calculator": rateDrop,
  "heloc-vs-cash-out-refinance-calculator": helocVsCashOut,
  "home-equity-investment-agreement-cost-calculator": hei,
  "shared-appreciation-mortgage-calculator": sam,
  "property-tax-appeal-savings-calculator": taxAppeal,
  "senior-property-tax-freeze-calculator": seniorFreeze,
  "supplemental-property-tax-california-calculator": caSupplemental,
  "prop-13-assessed-value-calculator": prop13,
  "cost-segregation-savings-calculator": costSeg,
  "passive-activity-loss-calculator": passiveLoss,
  "firpta-withholding-calculator": firpta,
  "vacation-home-tax-rules-calculator": vacationHome,
  "rent-split-by-room-size-calculator": rentRooms,
  "rent-control-allowable-increase-calculator": rentCap,
  "lease-break-penalty-calculator": leaseBreak,
  "moving-out-notice-date-calculator": moveNotice,
  "apartment-move-in-cost-calculator": moveIn,
  "utilities-cost-apartment-calculator": aptUtilities,
  "sublet-income-calculator": sublet,
  "rent-guarantor-income-requirement-calculator": guarantor,
  "1-percent-rule-rental-calculator": onePct,
  "2-percent-rule-rental-calculator": twoPct,
  "50-percent-rule-rental-expenses-calculator": fiftyPct,
  "duplex-investment-calculator": duplex,
  "fourplex-investment-calculator": fourplex,
  "rental-capex-reserve-calculator": capex,
  "rental-property-equity-build-calculator": equityBuild,
  "rental-portfolio-cash-flow-calculator": portfolio,
  "hard-money-loan-cost-calculator": hardMoney,
  "subject-to-deal-cash-flow-calculator": subjectTo,
  "vrbo-host-fees-calculator": vrbo,
  "airbnb-co-host-commission-calculator": coHost,
  "airbnb-break-even-occupancy-calculator": strBreakEven,
  "glamping-business-profit-calculator": glamping,
  "mid-term-rental-income-calculator": midTerm,
};
