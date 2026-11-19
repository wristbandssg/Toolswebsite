/**
 * Idea build, batch law2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Legal > Employment & Wage Law (12), Government Benefits (3),
 * Government Fees & Public Finance (9), Immigration & Visa (4), Military & Veterans (5), Personal Injury (2), Unemployment, Workers' Comp &
 * Leave (7) = 42 tools.
 * Figures: FLSA — $7.25 minimum, overtime ½ × regular rate (29 CFR 778), fluctuating workweek (29 CFR 778.114), back-pay look-back 2 years
 * (3 if willful) plus equal liquidated damages; child labor for ages 14–15 (29 CFR 570.35: 3 h school day, 18 h school week, 8 h non-school
 * day, 40 h non-school week, 7 a.m.–7 p.m., 9 p.m. 1 June–Labor Day); WARN Act (100+ employees, 60 days' notice, back pay up to 60 days);
 * CCPA support garnishment 50%/60% (+5% if 12+ weeks in arrears); NY minimum wage 2026 $17.00 NYC/LI/Westchester, $16.00 rest of state
 * (spread-of-hours: 1 extra hour at minimum wage when the day spans 10+ h); California reporting-time pay (½ the scheduled shift, 2–4 h);
 * 2026 HHS poverty guideline $15,960 + $5,680 per person (Lifeline 135%); UK Child Benefit 2026/27 £27.05 eldest / £17.90 others, HICBC
 * 1% per £200 over £60,000; US substantial presence test (current + ⅓ prior + ⅙ two years ago ≥ 183, ≥ 31 this year); STEM OPT 24 months,
 * file up to 90 days before the OPT EAD ends; UK ILR — no more than 180 days outside the UK in any 12 months; Australian citizenship —
 * 4 years' lawful residence incl. 12 months as PR, ≤ 12 months away in 4 years and ≤ 90 days in the last year; BRS TSP 1% automatic +
 * up to 4% matching (5% total); CZTE officer cap = E-9 basic pay ($11,166.90/month in 2026) + HFP/IDP; military leave 2.5 days/month,
 * 60-day carry-over; 2026 BAS $476.95 enlisted / $328.48 officer; 2024–2028 Electoral College (538 votes, 2020 census apportionment); Huntington–Hill apportionment.
 * State-specific benefit rates, caps and multipliers are editable inputs.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText, dayParts, dayNum } from "./trv-core";
import { txt } from "./sci-math-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const $0 = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const today = () => Math.floor(Date.now() / 86400000);
const addMonths = (day: number, m: number) => { const d = dayParts(day); const tot = d.m - 1 + Math.round(m), y = d.y + Math.floor(tot / 12), mo = ((tot % 12) + 12) % 12 + 1; const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return dayNum(y, mo, Math.min(d.d, last)); };
const left = (day: number) => { const d = day - today(); return d > 0 ? `${nfmt(d, 0)} days from today` : d === 0 ? "today" : `${nfmt(-d, 0)} days ago`; };
const fpl = (n: number) => 15960 + 5680 * (Math.max(1, Math.round(n)) - 1);

// ---- Employment & wage law ----
export const backPay: Calc = (v) => {
  const r = need(p(v, "r", 20), "Enter the hourly rate."), oh = p(v, "h", 8), wk = p(v, "w", 104), st = pick(v.s, 2) === 1, wil = pick(v.l, 2) === 1, liq = pick(v.q, 2) === 0;
  const cap = wil ? 156 : 104, w = Math.min(wk, cap), due = oh * r * (st ? 1.5 : 0.5) * w, tot = due * (liq ? 2 : 1);
  return { b: `${$0(due)} unpaid overtime`, t: `${$0(tot)} with${liq ? "" : "out"} equal liquidated damages`, note: `${nfmt(w, 0)} weeks (${wil ? "3-year willful" : "2-year"} FLSA look-back) × ${nfmt(oh, 1)} OT h × ${$2(r * (st ? 1.5 : 0.5))}${wk > cap ? ` — ${nfmt(wk - cap, 0)} older weeks are time-barred` : ""} · state law may allow longer` };
};
export const ptoAccrual: Calc = (v) => {
  const d = p(v, "d", 15), hpd = p(v, "h", 8), per = [52, 26, 24, 12][pick(v.f, 4)], cap = p(v, "c", 0), used = p(v, "u", 0), worked = p(v, "w", 26);
  const perP = (d * hpd) / per, bal = Math.min(cap > 0 ? cap : Infinity, perP * worked - used);
  return { a: `${nfmt(perP, 2)} hours accrued each pay period`, b: `${nfmt(bal, 1)} hours available after ${nfmt(worked, 0)} periods (${nfmt(bal / hpd, 1)} days)`, note: `${nfmt(d, 0)} days a year = ${nfmt(d * hpd, 0)} h over ${per} pay periods${cap ? ` · capped at ${nfmt(cap, 0)} h` : ""} · ${nfmt((d * hpd) / 2080, 4)} h per hour worked` };
};
export const fww: Calc = (v) => {
  const s = need(p(v, "s", 1000), "Enter the weekly salary."), h = need(p(v, "h", 50), "Enter hours worked.");
  const rr = s / h, ot = Math.max(0, h - 40), prem = 0.5 * rr * ot;
  return { p: `${$2(s + prem)} for the week`, how: `Regular rate ${$2(rr)} (salary ÷ ${nfmt(h, 1)} h) · OT premium ½ × ${$2(rr)} × ${nfmt(ot, 1)} h = ${$2(prem)}`, note: "Fluctuating workweek needs a fixed salary for all hours, a clear agreement and a regular rate at or above minimum wage · some states (e.g. California) don't allow it" };
};
export const regularRate: Calc = (v) => {
  const r = need(p(v, "r", 18), "Enter the hourly rate."), h = need(p(v, "h", 45), "Enter hours worked."), b = p(v, "b", 100), sd = p(v, "d", 0), ex = p(v, "x", 0);
  const straight = r * h + sd, rr = (straight + b) / h, ot = Math.max(0, h - 40), prem = 0.5 * rr * ot;
  return { rr: `Regular rate ${$2(rr)}/h (vs ${$2(r)} base)`, p: `${$2(straight + b + prem + ex)} total pay incl. ${$2(prem)} overtime premium on ${nfmt(ot, 1)} h`, note: "Non-discretionary bonuses, commissions and shift differentials must go into the regular rate; gifts, discretionary bonuses and expense reimbursements don't" };
};
export const childLabor: Calc = (v) => {
  const sd = p(v, "a", 3), sw = p(v, "b", 15), nd = p(v, "c", 8), nw = p(v, "d", 0), late = p(v, "e", 19), summer = pick(v.s, 2) === 1;
  const iss: string[] = [];
  if (sd > 3) iss.push(`school-day shift ${nfmt(sd, 1)} h > 3 h`); if (sw > 18) iss.push(`school week ${nfmt(sw, 1)} h > 18 h`);
  if (nd > 8) iss.push(`non-school day ${nfmt(nd, 1)} h > 8 h`); if (nw > 40) iss.push(`non-school week ${nfmt(nw, 1)} h > 40 h`);
  const endLim = summer ? 21 : 19; if (late > endLim) iss.push(`ending at ${nfmt(late, 1)}:00 is after ${endLim === 21 ? "9" : "7"} p.m.`);
  return { r: iss.length ? `Not allowed: ${iss.join("; ")}` : "Within federal limits for 14–15-year-olds", lim: `School day 3 h · school week 18 h · non-school day 8 h · non-school week 40 h · 7 a.m.–${summer ? "9" : "7"} p.m.`, note: "16–17-year-olds have no federal hour limits (hazardous jobs still banned) · state limits can be stricter" };
};
export const warn: Calc = (v) => {
  const e = p(v, "e", 250), aff = p(v, "a", 60), site = p(v, "s", 150), close = pick(v.t, 2) === 0, d = dateIn(v, "d", today() + 90), pay = p(v, "p", 1200), given = p(v, "g", 0);
  const cov = e >= 100, trig = close ? aff >= 50 : aff >= 500 || (aff >= 50 && aff >= site / 3), notice = d - 60, short = Math.max(0, 60 - given);
  return { c: !cov ? "Not covered — WARN applies to employers with 100+ full-time employees" : trig ? `WARN notice required by ${dayText(notice)} (${left(notice)})` : "Below the WARN layoff thresholds (state mini-WARN laws may still apply)", d: `${close ? "Plant closing: 50+ job losses at one site" : "Mass layoff: 500+, or 50–499 if at least 33% of the site"}`, b: cov && trig && short ? `Short notice of ${short} days could cost up to ${$0((pay / 7) * short)} back pay per worker (weekly pay ÷ 7 × days short)` : "60 calendar days' notice to workers, the state and local government" };
};
export const nonCompete: Calc = (v) => {
  const d = dateIn(v, "d", today()), m = p(v, "m", 12), mi = p(v, "r", 50);
  const end = addMonths(d, m);
  return { e: `Restriction ends ${dayText(end)} (${left(end)})`, s: `${nfmt(m, 0)} months from your last day · ${nfmt(mi, 0)}-mile radius`, note: "Enforceability varies: California, Minnesota, North Dakota and Oklahoma largely ban non-competes; elsewhere courts look for reasonable time, area and scope" };
};
export const spreadNY: Calc = (v) => {
  const st = p(v, "s", 8), en = p(v, "e", 20), r = p(v, "r", 17), mw = p(v, "m", 17), days = p(v, "d", 5);
  const span = en >= st ? en - st : en + 24 - st, owed = span > 10 ? mw * days : 0;
  return { s: span > 10 ? `Spread of ${nfmt(span, 1)} h — 1 extra hour (${$2(mw)}) owed per day` : `Spread of ${nfmt(span, 1)} h — no spread-of-hours pay`, w: `${$2(owed)} extra a week for ${nfmt(days, 0)} such days`, note: `NY minimum wage 2026: $17.00 (NYC, Long Island, Westchester), $16.00 elsewhere · workers paid well above minimum (${$2(r)}/h) may already be covered in non-hospitality industries` };
};
export const reportingTime: Calc = (v) => {
  const sch = need(p(v, "s", 8), "Enter scheduled hours."), wk = p(v, "w", 1.5), r = p(v, "r", 18);
  const half = sch / 2, owe = wk >= half ? 0 : Math.min(4, Math.max(2, half)) - wk;
  return { p: owe > 0 ? `${nfmt(owe, 2)} h reporting-time pay (${$2(owe * r)})` : "No reporting-time pay — you worked at least half the shift", t: `${$2((wk + Math.max(0, owe)) * r)} total for the day`, note: "California: if you report and work less than half the scheduled shift, you're paid for half the shift (at least 2 h, at most 4 h) · other states (NY, NJ, CT, MA…) have their own rules" };
};
export const uniformLimit: Calc = (v) => {
  const r = need(p(v, "r", 8), "Enter the hourly rate."), h = p(v, "h", 40), mw = p(v, "m", 7.25), d = p(v, "d", 60);
  const max = Math.max(0, (r - mw) * Math.min(h, 40));
  return { m: `Up to ${$2(max)} can be deducted this week`, s: d > max ? `Your ${$2(d)} deduction cuts pay below minimum wage by ${$2(d - max)} — spread it over ${Math.ceil(d / Math.max(0.01, max))} weeks` : `The ${$2(d)} deduction is allowed`, note: "FLSA: uniform, tool and shortage deductions can't take pay below minimum wage or cut overtime · some states ban them outright" };
};
export const noticePay: Calc = (v) => {
  const s = need(p(v, "s", 65000), "Enter the annual salary."), w = p(v, "w", 4), ben = p(v, "b", 0);
  const wk = s / 52;
  return { p: `${$0(wk * w + ben)} pay in lieu of notice`, how: `${nfmt(w, 1)} weeks × ${$0(wk)} weekly pay${ben ? ` + ${$0(ben)} benefits` : ""}`, note: "Pay in lieu is taxed as wages · in the US it's contractual; many other countries set a statutory minimum notice" };
};
export const supportGarnish: Calc = (v) => {
  const g = need(p(v, "g", 1000), "Enter weekly gross pay."), tx = p(v, "t", 200), oth = pick(v.o, 2) === 0, arr = pick(v.a, 2) === 1;
  const disp = Math.max(0, g - tx), lim = (oth ? 0.5 : 0.6) + (arr ? 0.05 : 0);
  return { m: `Up to ${$2(disp * lim)} a week (${pc(lim, 0)} of disposable pay)`, d: `Disposable earnings ${$2(disp)} = gross − required taxes/deductions`, note: `CCPA: ${oth ? "50% when supporting another spouse or child" : "60% when not supporting another family"}${arr ? " + 5% for arrears over 12 weeks" : ""} · states can set lower limits` };
};
// ---- Government benefits ----
export const ukChildBenefit: Calc = (v) => {
  const n = Math.round(p(v, "n", 2)), inc = p(v, "i", 55000);
  if (n < 1) throw new InputError("Enter at least one child.");
  const wk = 27.05 + 17.9 * (n - 1), yr = wk * 52, chg = Math.min(1, Math.max(0, Math.floor((inc - 60000) / 200) * 0.01)), net = yr * (1 - chg);
  return { b: `£${nfmt(wk, 2)} a week (£${nfmt(yr, 0)} a year)`, c: chg > 0 ? `High Income Child Benefit Charge ${pc(chg, 0)} = £${nfmt(yr * chg, 0)} → you keep £${nfmt(net, 0)}` : "No High Income Child Benefit Charge", note: "2026/27 rates: £27.05 eldest, £17.90 each other child · charge 1% per £200 of adjusted net income over £60,000, full at £80,000" };
};
export const medicareAge: Calc = (v) => {
  const b = dateIn(v, "d", dayNum(1962, 6, 15)), d = dayParts(b);
  const t65 = dayNum(d.y + 65, d.m, d.d), start = d.d === 1 ? addMonths(dayNum(d.y + 65, d.m, 1), -1) : dayNum(d.y + 65, d.m, 1);
  const iepS = addMonths(dayNum(d.y + 65, d.m, 1), -3), iepE = addMonths(dayNum(d.y + 65, d.m, 1), 4) - 1;
  return { a: `You turn 65 on ${dayText(t65)} — Medicare can start ${dayText(start)}`, i: `Initial enrollment: ${dayText(iepS)} – ${dayText(iepE)} (7 months)`, note: `${left(t65)} · sign up in the 3 months before your birthday month to avoid a gap · Part A is premium-free with 40 quarters of work` };
};
export const lifeline: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 2))), inc = p(v, "i", 25000), prog = pick(v.p, 2) === 1, lim = fpl(n) * 1.35;
  return { e: prog ? "Eligible through a qualifying program (SNAP, Medicaid, SSI, federal housing aid, VA pension)" : inc <= lim ? "Income-eligible for Lifeline" : "Income is over the Lifeline limit", l: `135% of the 2026 poverty guideline for ${n}: ${$0(lim)} a year`, note: "Lifeline gives up to $9.25/month off phone or internet ($34.25 on Tribal lands) · one benefit per household · Alaska and Hawaii limits are higher" };
};
// ---- Government fees & public finance ----
export const parkPass: Calc = (v) => {
  const pass = p(v, "p", 80), vis = p(v, "n", 4), fee = p(v, "f", 35), park = p(v, "k", 0);
  const pay = vis * fee + park;
  return { r: pay > pass ? `The pass saves ${$0(pay - pass)}` : `Pay per visit — the pass costs ${$0(pass - pay)} more`, b: `Break-even at ${nfmt(Math.ceil(pass / Math.max(1, fee)), 0)} paid visits (${nfmt(vis, 0)} planned × ${$0(fee)})`, note: "America the Beautiful annual pass is $80 for US residents; seniors, military, 4th graders and access-pass holders have cheaper or free passes" };
};
export const tollPass: Calc = (v) => {
  const t = p(v, "t", 40), cash = p(v, "c", 6), dis = p(v, "d", 30) / 100, fee = p(v, "f", 0), dev = p(v, "x", 0);
  const sav = t * cash * dis * 12, cost = fee * 12 + dev;
  return { s: `${$0(sav - cost)} a year saved with a transponder`, how: `${nfmt(t, 0)} tolls/month × ${$2(cash)} × ${pc(dis, 0)} discount = ${$0(sav)} − ${$0(cost)} fees`, note: "Pay-by-plate rates are often 30–100% higher than transponder rates" };
};
export const muniDebt: Calc = (v) => {
  const P = need(p(v, "p", 10000000), "Enter the bond amount."), r = p(v, "r", 4) / 100, n = Math.max(1, Math.round(p(v, "n", 20))), rev = p(v, "v", 0);
  const pay = r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
  return { d: `${$0(pay)} level annual debt service`, t: `${$0(pay * n)} over ${n} years (${$0(pay * n - P)} interest)`, note: rev ? `Debt service coverage ${nfmt(rev / pay, 2)}× (revenue ${$0(rev)}) — revenue bonds often need 1.25×+` : "Level debt service; serial bonds with level principal pay more interest early" };
};
export const levyRate: Calc = (v) => {
  const l = need(p(v, "l", 25000000), "Enter the levy."), tv = need(p(v, "t", 2500000000), "Enter the total taxable value."), h = p(v, "h", 300000);
  const rate = l / tv;
  return { r: `${nfmt(rate * 1000, 3)} mills ($${nfmt(rate * 1000, 3)} per $1,000)`, t: `Tax on a ${$0(h)} taxable value: ${$0(h * rate)}`, note: `Rate = levy ÷ taxable value = ${pc(rate, 3)} · if values rise and the levy stays flat, the rate falls` };
};
export const millage: Calc = (v) => {
  const mv = need(p(v, "v", 350000), "Enter the property value."), ar = p(v, "a", 100) / 100, ex = p(v, "e", 0), m = p(v, "m", 20);
  const taxable = Math.max(0, mv * ar - ex), tax = (taxable * m) / 1000;
  return { t: `${$0(tax)} a year (${$0(tax / 12)} a month)`, how: `${$0(mv)} × ${pc(ar, 0)} assessment − ${$0(ex)} exemptions = ${$0(taxable)} × ${nfmt(m, 3)} mills ÷ 1,000`, note: `Effective rate ${pc(tax / mv, 2)} of market value · 1 mill = $1 per $1,000` };
};
export const perCapita: Calc = (v) => {
  const s = need(p(v, "s", 500000000), "Enter total spending."), pop = need(p(v, "p", 250000), "Enter population."), h = p(v, "h", 2.5);
  return { c: `${$2(s / pop)} per person`, h: `${$0((s / pop) * h)} per household of ${nfmt(h, 1)}`, note: "Use the same year for spending and population; compare places with similar services (some counties run schools, others don't)" };
};
const EV: Record<string, number> = { AL: 9, AK: 3, AZ: 11, AR: 6, CA: 54, CO: 10, CT: 7, DE: 3, DC: 3, FL: 30, GA: 16, HI: 4, ID: 4, IL: 19, IN: 11, IA: 6, KS: 6, KY: 8, LA: 8, ME: 4, MD: 10, MA: 11, MI: 15, MN: 10, MS: 6, MO: 10, MT: 4, NE: 5, NV: 6, NH: 4, NJ: 14, NM: 5, NY: 28, NC: 16, ND: 3, OH: 17, OK: 7, OR: 8, PA: 19, RI: 4, SC: 9, SD: 3, TN: 11, TX: 40, UT: 6, VT: 3, VA: 13, WA: 12, WV: 4, WI: 10, WY: 3 };
export const electoral: Calc = (v) => {
  const codes = (txt(v, "s") || "CA, NY, IL, PA, MI, WI").toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const bad = codes.filter((c) => !(c in EV)), ok = [...new Set(codes.filter((c) => c in EV))], tot = ok.reduce((a, c) => a + EV[c], 0);
  return { t: `${tot} electoral votes${tot >= 270 ? " — wins (270 needed)" : ` — ${270 - tot} short of 270`}`, s: ok.map((c) => `${c} ${EV[c]}`).join(" · ") || "No states recognised", note: `${bad.length ? `Unrecognised: ${bad.join(", ")} · ` : ""}2024–2028 allocation (538 total) · Maine and Nebraska can split votes by district` };
};
export const turnout: Calc = (v) => {
  const b = need(p(v, "b", 65000), "Enter ballots cast."), el = need(p(v, "e", 100000), "Enter the eligible population."), rg = p(v, "r", 85000);
  return { t: `${pc(b / el)} turnout of eligible voters`, r: rg ? `${pc(b / rg)} of registered voters (${pc(rg / el, 0)} registered)` : "Add registered voters to see registered turnout", note: "Voting-eligible population (citizens 18+, minus ineligible felons where applicable) gives a fairer rate than voting-age population" };
};
export const apportion: Calc = (v) => {
  const seats = Math.max(1, Math.round(p(v, "n", 10)));
  const rows = (txt(v, "p") || "North 520000, South 310000, East 120000, West 50000").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => { const m = s.match(/^(.*?)[\s:=]+([\d.,]+)$/); return m ? { n: m[1].trim(), p: Number(m[2].replace(/,/g, "")) } : null; }).filter((x): x is { n: string; p: number } => !!x && x.p > 0);
  if (!rows.length) throw new InputError("List areas like: North 520000, South 310000");
  if (seats < rows.length) throw new InputError("Huntington–Hill gives every area at least one seat — use at least as many seats as areas.");
  const s = rows.map(() => 1); for (let k = rows.length; k < seats; k++) { let bi = 0, bv = -1; rows.forEach((r, i) => { const pv = r.p / Math.sqrt(s[i] * (s[i] + 1)); if (pv > bv) { bv = pv; bi = i; } }); s[bi]++; }
  const tot = rows.reduce((a, r) => a + r.p, 0);
  return { s: rows.map((r, i) => `${r.n}: ${s[i]}`).join(" · "), q: rows.map((r) => `${r.n} quota ${nfmt((r.p / tot) * seats, 2)}`).join(" · "), note: "Huntington–Hill (method of equal proportions), used for the US House: each area gets 1 seat, then seats go to the highest P ÷ √(n(n+1))" };
};
// ---- Immigration ----
export const stemOpt: Calc = (v) => {
  const e = dateIn(v, "d", today() + 120), u = p(v, "u", 30);
  const open = e - 90, newEnd = addMonths(e, 24);
  return { w: `File Form I-765 between ${dayText(open)} and ${dayText(e)}`, n: `STEM OPT would run to about ${dayText(newEnd)} (24 months after ${dayText(e)})`, note: `Unemployment allowance rises from 90 to 150 days in total — you have about ${nfmt(Math.max(0, 150 - u), 0)} days left · employer must be in E-Verify and sign Form I-983 · timely filing extends work authorisation up to 180 days` };
};
const parseTrips = (s: string) => s.split(/[;\n]+/).map((l) => l.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*(?:to|-|–|—)\s*(\d{4})-(\d{1,2})-(\d{1,2})/)).filter((m): m is RegExpMatchArray => !!m).map((m) => { const a = dayNum(+m[1], +m[2], +m[3]), b = dayNum(+m[4], +m[5], +m[6]); return [Math.min(a, b), Math.max(a, b)] as [number, number]; });
export const ilrAbsence: Calc = (v) => {
  const trips = parseTrips(txt(v, "t") || "2024-03-01 to 2024-03-20; 2024-12-15 to 2025-01-10; 2025-07-01 to 2025-08-15"), lim = p(v, "l", 180), wholeDays = pick(v.w, 2) === 0;
  if (!trips.length) throw new InputError("Enter trips like 2025-07-01 to 2025-08-15, separated by semicolons.");
  const away = new Set<number>(); for (const [a, b] of trips) for (let d = wholeDays ? a + 1 : a; d <= (wholeDays ? b - 1 : b); d++) away.add(d);
  const days = [...away].sort((a, b) => a - b); let worst = 0, wEnd = 0;
  for (const d of days) { const c = days.filter((x) => x > d - 365 && x <= d).length; if (c > worst) { worst = c; wEnd = d; } }
  return { r: worst > lim ? `Over the limit — ${worst} days away in one 12-month period` : `OK — at most ${worst} days away in any 12 months`, w: worst ? `Worst 12 months end ${dayText(wEnd)} · ${days.length} days abroad in total across ${trips.length} trips` : "No full days abroad", note: `Limit ${nfmt(lim, 0)} days in any rolling 12 months (Home Office counts whole days only — travel days don't count)` };
};
export const auCitizen: Calc = (v) => {
  const arr = dateIn(v, "a", today() - 1500), pr = dateIn(v, "p", today() - 500), ab4 = p(v, "x", 200), ab1 = p(v, "y", 60), ap = dateIn(v, "d", today());
  const r4 = addMonths(arr, 48) + Math.max(0, ab4 - 365), r1 = addMonths(pr, 12) + Math.max(0, ab1 - 90), el = Math.max(r4, r1);
  const ok = ap >= el && ab4 <= 365 && ab1 <= 90;
  return { e: ok ? `Meets the residence requirement on ${dayText(ap)}` : `Estimated earliest date ${dayText(el)} (${left(el)})`, c: `4 years' lawful residence (from ${dayText(arr)}) · 12 months as PR (from ${dayText(pr)}) · ${nfmt(ab4, 0)}/365 days away in 4 years · ${nfmt(ab1, 0)}/90 days away in the last year`, note: "Rough estimate — the Home Affairs residence calculator counts your actual travel dates" };
};
export const substantialPresence: Calc = (v) => {
  const c = p(v, "c", 150), y1 = p(v, "a", 120), y2 = p(v, "b", 90);
  const tot = c + y1 / 3 + y2 / 6, pass = c >= 31 && tot >= 183;
  return { r: pass ? `US tax resident — ${nfmt(tot, 1)} weighted days (≥ 183)` : `Not resident under the test — ${nfmt(tot, 1)} weighted days`, how: `${nfmt(c, 0)} + ${nfmt(y1, 0)} ÷ 3 + ${nfmt(y2, 0)} ÷ 6${c < 31 ? " · fewer than 31 days this year" : ""}`, note: pass ? "You may still be non-resident under the closer-connection exception (under 183 days this year) or a tax treaty" : `${nfmt(Math.max(0, Math.ceil(183 - y1 / 3 - y2 / 6) - c), 0)} more days this year would make you resident · students, teachers and diplomats may be exempt` };
};
// ---- Military ----
export const tspMatch: Calc = (v) => {
  const b = need(p(v, "b", 4000), "Enter monthly basic pay."), c = p(v, "c", 5) / 100, yrs = p(v, "y", 3);
  const auto = 0.01, match = yrs >= 2 ? Math.min(c, 0.03) + Math.max(0, Math.min(c, 0.05) - 0.03) * 0.5 : 0;
  return { m: `${$0(b * (auto + match))} a month from the government (${pc(auto + match, 1)})`, y: `${$0(b * 12 * (auto + match))} a year + your ${$0(b * 12 * c)} = ${$0(b * 12 * (auto + match + c))}`, note: yrs >= 2 ? (c < 0.05 ? `Contribute 5% to get the full 4% match — you're leaving ${$0(b * 12 * (0.04 - match))} a year on the table` : "You're getting the full 5% (1% automatic + 4% match)") : "1% automatic starts after 60 days; matching starts after 2 years of service" };
};
export const czte: Calc = (v) => {
  const off = pick(v.r, 2) === 1, pay = need(p(v, "p", 9000), "Enter monthly taxable pay in the zone."), m = p(v, "m", 6), cap = p(v, "c", 11166.9), idp = p(v, "i", 225), tax = p(v, "t", 22) / 100;
  const ex = off ? Math.min(pay, cap + idp) : pay;
  return { e: `${$0(ex * m)} excluded from tax over ${nfmt(m, 0)} months`, s: `≈ ${$0(ex * m * tax)} federal income tax saved at ${pc(tax, 0)}`, note: off ? `Officers: capped at E-9 basic pay (${$2(cap)}/month in 2026) + HFP/IDP (${$2(idp)}) = ${$2(cap + idp)} · check the DFAS table` : "Enlisted and warrant officers: all qualifying pay is excluded · any day in the zone counts for the whole month" };
};
export const milLeave: Calc = (v) => {
  const bal = p(v, "b", 40), m = p(v, "m", 9), use = p(v, "u", 20), cap = p(v, "c", 60);
  const end = bal + 2.5 * m - use, lose = Math.max(0, end - cap);
  return { b: `${nfmt(end, 1)} days at fiscal year end (30 Sep)`, l: lose ? `You'd lose ${nfmt(lose, 1)} days over the ${nfmt(cap, 0)}-day carry-over — take or sell them` : "No leave lost", note: `Accrual 2.5 days per month (30 a year) · ${nfmt(m, 0)} months left × 2.5 = ${nfmt(2.5 * m, 1)} days · special leave accrual may allow more after deployments` };
};
export const ets: Calc = (v) => {
  const d = dateIn(v, "d", today() - 700), y = p(v, "y", 4), ext = p(v, "x", 0), tl = p(v, "t", 0);
  const e = addMonths(d, y * 12 + ext) - 1;
  return { e: `ETS ${dayText(e)} (${left(e)})`, t: tl ? `With ${nfmt(tl, 0)} days terminal leave, your last duty day is about ${dayText(e - tl)}` : `${nfmt(y, 0)}-year contract${ext ? ` + ${nfmt(ext, 0)} months extension` : ""}`, note: "Your official ETS is on your enlistment contract and LES; time lost (AWOL, confinement) pushes it back" };
};
export const milCiv: Calc = (v) => {
  const b = need(p(v, "b", 4500), "Enter monthly basic pay."), bah = p(v, "h", 2200), bas = p(v, "s", 476.95), sp = p(v, "x", 0), tax = p(v, "t", 22) / 100, hc = p(v, "c", 7000);
  const rmc = (b + bah + bas + sp) * 12, adv = ((bah + bas) * 12 * tax) / (1 - tax), eq = rmc + adv + hc;
  return { e: `≈ ${$0(eq)} civilian salary equivalent`, how: `Regular military compensation ${$0(rmc)} + tax advantage on BAH/BAS ${$0(adv)} + health care value ${$0(hc)}`, note: "Add the value of the pension, TSP match and GI Bill for a fuller picture · BAH depends on ZIP code, grade and dependents" };
};
// ---- Personal injury ----
export const futureMedical: Calc = (v) => {
  const c = need(p(v, "c", 12000), "Enter annual medical cost."), y = Math.max(1, Math.round(p(v, "y", 25))), g = p(v, "g", 4) / 100, d = p(v, "d", 4.5) / 100;
  let nom = 0, pv = 0; for (let k = 1; k <= y; k++) { const x = c * Math.pow(1 + g, k - 1); nom += x; pv += x / Math.pow(1 + d, k); }
  return { pv: `${$0(pv)} present value of future medical costs`, n: `${$0(nom)} total over ${y} years at ${pc(g, 1)} medical inflation`, note: `Discounted at ${pc(d, 1)} · life-care planners and economists prepare these for court; use the life expectancy from mortality tables` };
};
export const compNeg: Calc = (v) => {
  const dmg = need(p(v, "d", 100000), "Enter total damages."), f = p(v, "f", 30) / 100, rule = pick(v.r, 4);
  const barred = rule === 1 ? f >= 0.5 : rule === 2 ? f > 0.5 : rule === 3 ? f > 0 : false, rec = barred ? 0 : dmg * (1 - f);
  return { r: barred ? "No recovery — barred under this rule" : `${$0(rec)} recoverable`, how: `${$0(dmg)} × (1 − ${pc(f, 0)} your fault)`, note: ["Pure comparative fault: you recover minus your share, even at 99%", "Modified 50% bar: nothing if you're 50% or more at fault", "Modified 51% bar: nothing if you're more than 50% at fault", "Contributory negligence (AL, MD, NC, VA, DC): any fault bars recovery"][rule] };
};
// ---- Unemployment, workers' comp & leave ----
export const ttd: Calc = (v) => {
  const aww = need(p(v, "a", 900), "Enter average weekly wage."), r = p(v, "r", 66.67) / 100, mx = p(v, "m", 1200), mn = p(v, "n", 0), w = p(v, "w", 12), wait = p(v, "x", 7);
  const wk = Math.min(mx > 0 ? mx : Infinity, Math.max(mn, aww * r)), paidW = Math.max(0, w - wait / 7);
  return { w: `${$2(wk)} a week`, t: `${$0(wk * paidW)} for ${nfmt(w, 1)} weeks off (first ${nfmt(wait, 0)} days unpaid unless you're out long enough)`, note: `${pc(r, 1)} of ${$2(aww)}${mx && aww * r > mx ? ` capped at ${$2(mx)}` : ""} · workers' comp benefits are tax-free · the state sets the rate, cap and waiting period` };
};
export const ppd: Calc = (v) => {
  const aww = need(p(v, "a", 900), "Enter average weekly wage."), rt = p(v, "i", 10) / 100, wks = p(v, "w", 500), r = p(v, "r", 66.67) / 100, mx = p(v, "m", 1000);
  const rate = Math.min(mx > 0 ? mx : Infinity, aww * r), weeks = wks * rt;
  return { p: `${$0(rate * weeks)} permanent partial disability award`, how: `${pc(rt, 0)} impairment × ${nfmt(wks, 0)} weeks = ${nfmt(weeks, 1)} weeks × ${$2(rate)}`, note: "Scheduled losses (arm, leg, hand…) use the state's weeks for that body part; whole-body ratings often use 300–500 weeks" };
};
export const std: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter annual salary."), r = p(v, "r", 60) / 100, mx = p(v, "m", 1500), el = p(v, "e", 7), w = p(v, "w", 12), tx = pick(v.t, 2) === 0;
  const wk = Math.min(mx > 0 ? mx : Infinity, (s / 52) * r), paid = Math.max(0, w - el / 7);
  return { w: `${$2(wk)} a week`, t: `${$0(wk * paid)} over ${nfmt(paid, 1)} paid weeks (after a ${nfmt(el, 0)}-day elimination period)`, note: tx ? "Employer-paid premiums → benefits are taxable income" : "You paid premiums after tax → benefits are tax-free" };
};
export const ltd: Calc = (v) => {
  const s = need(p(v, "s", 72000), "Enter annual salary."), r = p(v, "r", 60) / 100, mx = p(v, "m", 10000), off = p(v, "o", 1800), tx = p(v, "t", 15) / 100, y = p(v, "y", 5), emp = pick(v.e, 2) === 0;
  const gross = Math.min(mx, (s / 12) * r), net = Math.max(0, gross - off), after = emp ? net * (1 - tx) : net;
  return { m: `${$0(net)} a month from the insurer (${$0(gross)} before offsets)`, n: `≈ ${$0(after)} after tax · ${pc((after + off) / (s / 12), 0)} of your old gross pay incl. SSDI`, note: `${$0(net * 12 * y)} over ${nfmt(y, 0)} years · most plans offset Social Security disability and pay after a 90–180-day elimination period` };
};
const leave = (who: string): Calc => (v) => {
  const s = need(p(v, "s", 60000), "Enter annual salary."), pto = p(v, "p", 2), sw = p(v, "d", who === "m" ? 6 : 0), sr = p(v, "r", 60) / 100, pf = p(v, "f", 0), pr = p(v, "q", 0), un = p(v, "u", who === "m" ? 4 : 2);
  const wk = s / 52, pay = pto * wk + sw * wk * sr + pf * wk * pr, tot = pto + sw + pf + un;
  return { t: `${$0(pay)} over ${nfmt(tot, 0)} weeks of leave`, l: `vs ${$0(wk * tot)} normal pay — ${$0(wk * tot - pay)} less (${pc(pay / (wk * tot), 0)} replaced)`, note: `PTO ${nfmt(pto, 0)} wk at 100%${sw ? ` · disability ${nfmt(sw, 0)} wk at ${pc(sr, 0)}` : ""}${pf ? ` · paid family leave ${nfmt(pf, 0)} wk at ${pc(pr, 0)}` : ""} · ${nfmt(un, 0)} wk unpaid · FMLA protects up to 12 weeks` };
};
export const maternityPay = leave("m");
export const paternityPay = leave("p");
export const furlough: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter annual salary."), d = p(v, "d", 10), tx = p(v, "t", 25) / 100, ui = p(v, "u", 0);
  const lost = (s / 260) * d;
  return { l: `${$0(lost)} gross pay lost (${$0(lost * (1 - tx))} after tax)`, n: ui ? `Partial unemployment of ${$0(ui)} brings the net loss to ${$0(Math.max(0, lost * (1 - tx) - ui))}` : `${pc(d / 260, 1)} of your yearly pay`, note: `${nfmt(d, 0)} unpaid days at ${$0(s / 260)} a day · many states pay partial unemployment for furlough weeks` };
};

// ---- registry (generated)
export const ideaLaw2CustomCalculators: Record<string, Calc> = {
  "unpaid-overtime-back-pay-calculator": backPay,
  "pto-accrual-calculator": ptoAccrual,
  "fluctuating-workweek-overtime-calculator": fww,
  "regular-rate-of-pay-calculator": regularRate,
  "child-labor-hours-limit-calculator": childLabor,
  "warn-act-notice-calculator": warn,
  "non-compete-duration-calculator": nonCompete,
  "spread-of-hours-pay-new-york-calculator": spreadNY,
  "reporting-time-pay-calculator": reportingTime,
  "uniform-deduction-limit-calculator": uniformLimit,
  "notice-pay-in-lieu-calculator": noticePay,
  "garnishment-child-support-limit-calculator": supportGarnish,
  "uk-child-benefit-calculator": ukChildBenefit,
  "medicare-eligibility-age-calculator": medicareAge,
  "lifeline-phone-eligibility-calculator": lifeline,
  "park-pass-value-calculator": parkPass,
  "toll-pass-savings-calculator": tollPass,
  "municipal-bond-debt-service-calculator": muniDebt,
  "property-tax-levy-rate-calculator": levyRate,
  "millage-rate-calculator": millage,
  "per-capita-spending-calculator": perCapita,
  "electoral-vote-count-calculator": electoral,
  "voter-turnout-calculator": turnout,
  "apportionment-seats-calculator": apportion,
  "stem-opt-extension-date-calculator": stemOpt,
  "uk-ilr-absence-days-calculator": ilrAbsence,
  "australia-citizenship-residence-calculator": auCitizen,
  "tax-residency-days-calculator": substantialPresence,
  "tsp-military-match-calculator": tspMatch,
  "combat-zone-tax-exclusion-calculator": czte,
  "military-leave-days-calculator": milLeave,
  "ets-date-calculator": ets,
  "military-to-civilian-salary-calculator": milCiv,
  "future-medical-costs-calculator": futureMedical,
  "comparative-negligence-reduction-calculator": compNeg,
  "temporary-total-disability-calculator": ttd,
  "permanent-partial-disability-calculator": ppd,
  "short-term-disability-benefit-calculator": std,
  "long-term-disability-benefit-calculator": ltd,
  "maternity-leave-pay-calculator": maternityPay,
  "paternity-leave-pay-calculator": paternityPay,
  "furlough-pay-impact-calculator": furlough,
};
