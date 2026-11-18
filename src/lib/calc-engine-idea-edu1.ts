/**
 * Idea build, batch edu1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Jobs & Education > College Cost & Aid (21), GPA (14), Grades (10) = 45 tools.
 * Federal aid figures: Pell Grant 2026–27 maximum $7,395 (minimum award $740), Pell ≈ max − SAI, scaled by enrollment intensity.
 * Direct Loan limits — dependent undergrad $5,500 / $6,500 / $7,500 (years 1/2/3+; $31,000 total, $23,000 subsidized); independent
 * $9,500 / $10,500 / $12,500 ($57,500 total). From 1 July 2026 (One Big Beautiful Bill Act): graduate $20,500 a year ($100,000 total),
 * professional $50,000 a year ($200,000 total), Grad PLUS closed to new borrowers, Parent PLUS $20,000 a year / $65,000 per student.
 * Grade conversions: CBSE CGPA × 9.5 = %; modified Bavarian formula (German grade) = 1 + 3 × (Nmax − Nd) ÷ (Nmax − Nmin);
 * UK degree class 70 / 60 / 50 / 40; Australian WAM = credit-weighted mean of marks.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const $0 = (x: number) => money(x, "$", 0);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const g2 = (x: number) => x.toFixed(2);
/** Parses "grade credits" pairs from text lines, e.g. "3.7 3" or "A 4". */
const LET: Record<string, number> = { "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, "C-": 1.7, "D+": 1.3, D: 1, "D-": 0.7, F: 0 };
function courses(v: Record<string, number>, key: string) {
  const rows = txt(v, key).split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => { const [g, c] = l.split(/[\s,]+/); const gv = LET[g.toUpperCase()] ?? Number(g); return [gv, Number(c)] as [number, number]; });
  const ok = rows.filter(([g, c]) => Number.isFinite(g) && c > 0);
  if (!ok.length) throw new InputError("Enter courses as 'grade credits' on separate lines, e.g. 'A 3' or '3.7 4'.");
  const cr = ok.reduce((s, [, c]) => s + c, 0), pts = ok.reduce((s, [g, c]) => s + g * c, 0);
  return { cr, pts, gpa: pts / cr, n: ok.length };
}

// ---- College cost & financial aid ----
export const pell: Calc = (v) => {
  const sai = num(v.s, 2000), en = [1, 0.75, 0.5, 0.25][pick(v.e, 4)], max = 7395;
  const full = sai <= 0 ? max : max - sai >= 740 ? max - sai : 0, award = full * en;
  return { a: award > 0 ? `${$0(award)} estimated Pell Grant for 2026–27` : "Probably not Pell-eligible (SAI too high)", how: `Full-time award ${$0(full)} (max $7,395 − SAI ${$0(Math.max(0, sai))}) × ${pc(en, 0)} enrollment`, note: "Your FAFSA Submission Summary shows your actual SAI and Pell eligibility · lifetime limit 12 full-time semesters (600%)" };
};
export const coa: Calc = (v) => {
  const k = ["t", "f", "h", "fo", "b", "tr", "pe"].map((x, i) => p(v, x, [11000, 1500, 7500, 4500, 1200, 1500, 2500][i])), aid = p(v, "a", 6000);
  const tot = k.reduce((a, b) => a + b, 0);
  return { c: `${$0(tot)} cost of attendance a year`, net: `Net price ${$0(tot - aid)} after ${$0(aid)} of grants and scholarships`, parts: `Tuition ${$0(k[0])} · fees ${$0(k[1])} · housing ${$0(k[2])} · food ${$0(k[3])} · books ${$0(k[4])} · transport ${$0(k[5])} · personal ${$0(k[6])}` };
};
export const studentBudget: Calc = (v) => {
  const inc = p(v, "i", 1400), items = ["r", "f", "t", "ph", "b", "e", "o"].map((x, i) => p(v, x, [700, 350, 80, 50, 40, 100, 80][i])), out = items.reduce((a, b) => a + b, 0);
  return { left: `${money(inc - out)} ${inc >= out ? "left over" : "short"} each month`, out: `Spending ${money(out)}: rent ${$0(items[0])}, food ${$0(items[1])}, transport ${$0(items[2])}, phone ${$0(items[3])}, books ${$0(items[4])}, fun ${$0(items[5])}, other ${$0(items[6])}`, note: `${pc(items[0] / Math.max(inc, 1), 0)} of income on rent · keep a small emergency fund and use student discounts` };
};
export const scholarshipTotal: Calc = (v) => {
  const a = p(v, "a", 5000), y = Math.max(1, p(v, "y", 4)), r = p(v, "r", 0) / 100, one = p(v, "o", 1500), gpa = pick(v.g, 2) === 1;
  const multi = a * y * (gpa ? 0.9 : 1);
  return { t: `${$0(multi + one)} total scholarship value`, how: `${$0(a)} a year × ${nfmt(y, 0)} years${gpa ? " × 90% chance of keeping it (GPA/credit rules)" : ""} + ${$0(one)} one-time awards`, note: r > 0 ? `Worth ≈ ${$0((multi + one) / (1 + r))} in today's money` : "Check renewal rules (GPA, full-time credits) and whether the school reduces other aid" };
};
export const workStudy: Calc = (v) => {
  const rate = need(p(v, "r", 13), "Enter hourly wage."), h = p(v, "h", 12), w = p(v, "w", 30), award = p(v, "a", 3500);
  const earn = rate * h * w;
  return { e: `${$0(Math.min(earn, award))} expected earnings (${$0(earn)} if you work every week)`, how: `${money(rate)}/h × ${nfmt(h, 0)} h/week × ${nfmt(w, 0)} weeks · award cap ${$0(award)}`, note: earn > award ? `You'd hit your award after ${nfmt(award / (rate * h), 0)} weeks — cut hours or ask about more` : "Work-study is paid as wages through the year (not a lump sum) and doesn't count as income on the next FAFSA" };
};
export const inOut: Calc = (v) => {
  const i = p(v, "i", 11000), o = p(v, "o", 30000), ia = p(v, "ia", 3000), oa = p(v, "oa", 8000), y = p(v, "y", 4);
  const d = (o - oa - (i - ia)) * y;
  return { d: `Out-of-state costs ${$0(Math.abs(d))} ${d >= 0 ? "more" : "less"} over ${nfmt(y, 0)} years`, yr: `In-state net ${$0(i - ia)} a year vs out-of-state net ${$0(o - oa)}`, note: "Look at regional reciprocity programs (WUE, Midwest Student Exchange, Academic Common Market) for reduced out-of-state tuition" };
};
export const ccTransfer: Calc = (v) => {
  const cc = p(v, "c", 4000), u = p(v, "u", 11000), y = p(v, "y", 2), lost = p(v, "l", 5) / 100;
  const save = (u - cc) * y - u * 4 * lost;
  return { s: `≈ ${$0(save)} saved with ${nfmt(y, 0)} years at community college`, how: `${$0(u - cc)} a year cheaper × ${nfmt(y, 0)} years − ${pc(lost, 0)} risk of extra time for non-transferring credits`, note: "Use a transfer agreement (2+2 / guaranteed admission) so credits count toward your major" };
};
export const dorm: Calc = (v) => {
  const d = p(v, "d", 12000), m = p(v, "m", 9), rent = p(v, "r", 800), ut = p(v, "u", 120), food = p(v, "f", 350), tr = p(v, "t", 60), lease = p(v, "l", 12);
  const off = (rent + ut) * lease + (food + tr) * m;
  return { c: `Off-campus ${$0(off)} vs dorm + meal plan ${$0(d)} a year`, d: `${off < d ? "Off-campus saves" : "Dorm saves"} ${$0(Math.abs(d - off))}`, note: `Off-campus assumes a ${nfmt(lease, 0)}-month lease, ${nfmt(m, 0)} months of food and transport · sublet the summer to save more` };
};
export const mealPlan: Calc = (v) => {
  const c = need(p(v, "c", 2600), "Enter plan cost per semester."), meals = p(v, "m", 14), w = p(v, "w", 15), alt = p(v, "a", 9), used = p(v, "u", 80) / 100;
  const per = c / (meals * w * used);
  return { per: `${money(per)} per meal you actually eat`, cmp: per <= alt ? `Worth it — cheaper than ${money(alt)} eating out` : `Costs ${money(per - alt)} more per meal than eating elsewhere at ${money(alt)}`, note: `${nfmt(meals, 0)} meals a week × ${nfmt(w, 0)} weeks × ${pc(used, 0)} used · pick a smaller plan if you skip breakfast` };
};
export const textbooks: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 5))), nw = p(v, "p", 120), mix = [1, 0.55, 0.4, 0.3][pick(v.m, 4)], sell = p(v, "s", 0) / 100;
  const cost = n * nw * mix * (1 - sell);
  return { c: `≈ ${$0(cost)} for the semester`, how: `${n} courses × ${$0(nw)} new price × ${pc(mix, 0)} (${["new", "used", "rental", "digital"][pick(v.m, 4)]})${sell ? ` − ${pc(sell, 0)} resale` : ""}`, note: "Check the library reserve, open textbooks (OER) and older editions first" };
};
export const gradWorth: Calc = (v) => {
  const cost = p(v, "c", 60000), y = p(v, "y", 2), sal0 = p(v, "s0", 55000), sal1 = p(v, "s1", 75000), yrs = p(v, "w", 30), r = p(v, "r", 5) / 100, tax = p(v, "t", 25) / 100;
  const lost = sal0 * y * (1 - tax), gain = (sal1 - sal0) * (1 - tax);
  let npv = -(cost + lost); for (let k = 1; k <= yrs; k++) npv += gain / Math.pow(1 + r, k + y);
  const be = gain > 0 ? (cost + lost) / gain : Infinity;
  return { npv: `Net value ${npv >= 0 ? "+" : "−"}${$0(Math.abs(npv))} (today's money, ${pc(r, 0)} discount)`, be: Number.isFinite(be) ? `Breaks even about ${nfmt(be, 1)} years after graduating` : "Never breaks even at these salaries", note: `Cost ${$0(cost)} + lost after-tax earnings ${$0(lost)} vs ${$0(gain)} more a year after tax` };
};
const roiCalc = (v: Record<string, number>, cost: number, months: number, s0: number, s1: number) => {
  const lost = (s0 / 12) * months, gain = s1 - s0, pb = gain > 0 ? (cost + lost) / (gain / 12) : Infinity;
  return { roi: `${pc((gain * 5 - cost - lost) / Math.max(cost + lost, 1), 0)} 5-year return`, pb: Number.isFinite(pb) ? `Pays back in about ${nfmt(pb, 0)} months after finishing` : "No salary gain — doesn't pay back", note: `Cost ${$0(cost)} + ${$0(lost)} lost income over ${nfmt(months, 0)} months vs +${$0(gain)} a year` };
};
export const bootcamp: Calc = (v) => roiCalc(v, p(v, "c", 14000), p(v, "m", 4), p(v, "s0", 40000), p(v, "s1", 70000));
export const mba: Calc = (v) => roiCalc(v, p(v, "c", 120000), p(v, "m", 24), p(v, "s0", 85000), p(v, "s1", 140000));
export const tradeVsCollege: Calc = (v) => {
  const tc = p(v, "tc", 15000), ty = p(v, "ty", 1.5), ts = p(v, "ts", 55000), cc = p(v, "cc", 100000), cy = p(v, "cy", 4), cs = p(v, "cs", 65000), h = p(v, "h", 20);
  const earn = (cost: number, y: number, s: number) => -cost + s * Math.max(0, h - y);
  const T = earn(tc, ty, ts), C = earn(cc, cy, cs);
  return { r: `${T >= C ? "Trade school" : "College"} comes out ${$0(Math.abs(T - C))} ahead over ${nfmt(h, 0)} years`, t: `Trade: ${$0(tc)} cost, earning from year ${nfmt(ty, 1)} → net ${$0(T)}`, c: `College: ${$0(cc)} cost, earning from year ${nfmt(cy, 0)} → net ${$0(C)} · ignores raises, debt interest and taxes` };
};
const UG_DEP = [5500, 6500, 7500], UG_IND = [9500, 10500, 12500];
export const loanLimit: Calc = (v) => {
  const t = pick(v.t, 5), yr = Math.min(3, Math.max(1, Math.round(p(v, "y", 1)))), sub = [3500, 4500, 5500][yr - 1];
  if (t <= 1) { const lim = (t === 0 ? UG_DEP : UG_IND)[yr - 1]; return { a: `${$0(lim)} a year in Direct Loans (up to ${$0(sub)} subsidized)`, tot: `Aggregate limit ${t === 0 ? "$31,000 (≤ $23,000 subsidized)" : "$57,500 (≤ $23,000 subsidized)"}`, note: t === 0 ? "If your parents are denied a Parent PLUS loan, you can borrow the independent-student amount" : "Independent students (and dependents whose parents can't get PLUS) get the higher limit" }; }
  if (t === 2) return { a: "$20,500 a year (unsubsidized) for graduate students", tot: "Aggregate $100,000 for graduate study (from 1 July 2026)", note: "Grad PLUS loans closed to new borrowers from 1 July 2026 — compare private loans carefully" };
  if (t === 3) return { a: "$50,000 a year for professional students (medicine, law, etc.)", tot: "Aggregate $200,000 for professional study (from 1 July 2026)", note: "Lifetime cap across all federal student loans: $257,500 (excluding Parent PLUS)" };
  return { a: "Parent PLUS: up to $20,000 a year per student", tot: "Aggregate $65,000 per dependent student (from 1 July 2026)", note: "Borrowers already in a program before 1 July 2026 may keep older limits for a transition period — check studentaid.gov" };
};
export const accrual: Calc = (v) => {
  const b = need(p(v, "b", 5500), "Enter the loan amount."), r = p(v, "r", 6.39) / 100, m = p(v, "m", 48), cap = pick(v.c, 2) === 1;
  const daily = (b * r) / 365, int = daily * (m / 12) * 365;
  return { i: `${$0(int)} interest accrues over ${nfmt(m, 0)} months (${money(daily)} a day)`, bal: `${cap ? `Balance at repayment ≈ ${$0(b + int)} if unpaid interest is capitalised` : `Balance stays ${$0(b)} if you pay the interest as it accrues`}`, note: "Subsidised loans don't accrue interest while you're in school · 6.39% was the 2025–26 undergraduate rate — check the current rate on studentaid.gov" };
};
export const displacement: Calc = (v) => {
  const s = need(p(v, "s", 3000), "Enter the outside scholarship."), need0 = p(v, "n", 4000), grant = p(v, "g", 8000), loan = p(v, "l", 5500), pol = pick(v.p, 3);
  const gap = Math.max(0, need0), red = Math.max(0, s - gap), fromLoan = pol === 0 ? Math.min(red, loan) : pol === 1 ? 0 : Math.min(red, loan) / 2;
  const fromGrant = red - fromLoan;
  return { r: red > 0 ? `${$0(red)} of other aid may be reduced` : "No reduction — the scholarship fits within your unmet need", how: `Unmet need ${$0(gap)} · loans reduced ${$0(fromLoan)} · school grants reduced ${$0(Math.max(0, Math.min(fromGrant, grant)))}`, note: "Federal rules cap total aid at cost of attendance · ask the aid office how they treat outside awards (loans first is best for you)" };
};
export const tuitionPlan: Calc = (v) => {
  const b = need(p(v, "b", 9000), "Enter the balance to pay."), n = Math.max(1, Math.round(p(v, "n", 5))), fee = p(v, "f", 50), lf = p(v, "lf", 0);
  return { pm: `${money((b + fee) / n)} a month for ${n} months`, tot: `Total ${$0(b + fee)} including a ${$0(fee)} enrolment fee — ${pc(fee / b, 2)} effective cost`, note: lf ? `Late payments may cost ${$0(lf)} each` : "Interest-free payment plans are usually cheaper than loans for a short gap" };
};
export const nursing: Calc = (v) => {
  const p0 = pick(v.p, 4), tu = p(v, "t", [6000, 25000, 20000, 40000][pick(v.p, 4)]), y = p(v, "y", [1, 2, 4, 1.5][pick(v.p, 4)]), extra = p(v, "x", 3000), sal = p(v, "s", [55000, 75000, 85000, 90000][p0]);
  const tot = tu * y + extra;
  return { c: `≈ ${$0(tot)} total for ${["LPN / LVN", "ADN (associate)", "BSN (bachelor's)", "Accelerated BSN"][p0]}`, how: `${$0(tu)} a year × ${nfmt(y, 1)} years + ${$0(extra)} for uniforms, NCLEX, licensing and clinical costs`, note: `Typical starting pay ≈ ${$0(sal)} · cost ≈ ${nfmt(tot / sal, 1)}× first-year salary · ask about hospital tuition reimbursement` };
};
export const phd: Calc = (v) => {
  const s = need(p(v, "s", 32000), "Enter yearly stipend."), tax = p(v, "t", 12) / 100, r = p(v, "r", 1100), oth = p(v, "o", 900), fees = p(v, "f", 800);
  const net = (s * (1 - tax) - fees) / 12, left = net - r - oth;
  return { n: `${money(net)} a month after tax and fees`, left: `${money(left)} ${left >= 0 ? "left" : "short"} after rent ${$0(r)} and other costs ${$0(oth)}`, note: `Rent is ${pc(r / Math.max(net, 1), 0)} of take-home (aim for under 30–35%) · stipends are usually taxable but often have no withholding — set money aside` };
};

// ---- GPA ----
export const cumGpa: Calc = (v) => {
  const g0 = p(v, "g", 3.2), c0 = p(v, "c", 60), s = courses(v, "s"), gpa = (g0 * c0 + s.pts) / (c0 + s.cr);
  return { g: `New cumulative GPA ${g2(gpa)}`, sem: `Semester GPA ${g2(s.gpa)} over ${nfmt(s.cr, 0)} credits (${s.n} courses)`, note: `${gpa >= g0 ? "Up" : "Down"} ${g2(Math.abs(gpa - g0))} from ${g2(g0)} with ${nfmt(c0 + s.cr, 0)} total credits` };
};
export const gpaTarget: Calc = (v) => {
  const g0 = p(v, "g", 3.0), c0 = need(p(v, "c", 60), "Enter credits completed."), t = need(p(v, "t", 3.3), "Enter target GPA."), cr = need(p(v, "r", 30), "Enter remaining credits.");
  const req = (t * (c0 + cr) - g0 * c0) / cr;
  return { r: req > 4 ? `Not reachable — you'd need ${g2(req)} in ${nfmt(cr, 0)} credits` : req <= 0 ? "Already guaranteed — any passing grades keep you above target" : `You need a ${g2(req)} average over your next ${nfmt(cr, 0)} credits`, how: `(${g2(t)} × ${nfmt(c0 + cr, 0)} − ${g2(g0)} × ${nfmt(c0, 0)}) ÷ ${nfmt(cr, 0)}`, note: "4.0 scale · some schools exclude repeated or transfer courses" };
};
export const raiseGpa: Calc = (v) => {
  const g0 = p(v, "g", 2.8), c0 = need(p(v, "c", 45), "Enter credits completed."), t = need(p(v, "t", 3.0), "Enter target GPA."), a = need(p(v, "a", 3.7), "Enter the GPA you expect to earn.");
  if (a <= t) return { c: "Not reachable — your expected grades must be above the target", how: "—", note: "—" };
  const cr = Math.max(0, (c0 * (t - g0)) / (a - t));
  return { c: cr === 0 ? "You're already at or above the target" : `About ${nfmt(Math.ceil(cr), 0)} more credits at ${g2(a)} to reach ${g2(t)}`, how: `credits = ${nfmt(c0, 0)} × (${g2(t)} − ${g2(g0)}) ÷ (${g2(a)} − ${g2(t)})`, note: `≈ ${nfmt(Math.ceil(cr / 15), 0)} semester${Math.ceil(cr / 15) === 1 ? "" : "s"} at 15 credits · retaking failed courses can raise GPA faster at many schools` };
};
export const majorGpa: Calc = (v) => { const s = courses(v, "s"); return { g: `Major GPA ${g2(s.gpa)}`, how: `${nfmt(s.pts, 1)} quality points ÷ ${nfmt(s.cr, 0)} credits in ${s.n} major courses`, note: "Most schools count only courses in your major's department plus listed requirements — check your catalogue" }; };
export const transferGpa: Calc = (v) => {
  const a = p(v, "a", 3.4), ac = p(v, "ac", 30), b = p(v, "b", 3.1), bc = p(v, "bc", 45), w = pick(v.w, 2) === 1;
  const all = (a * ac + b * bc) / Math.max(ac + bc, 1);
  return { g: w ? `Combined GPA ${g2(all)} (all coursework)` : `New school GPA ${g2(b)} — transfer grades usually don't count`, all: `All coursework ${g2(all)} over ${nfmt(ac + bc, 0)} credits (used by med/law school applications)`, note: "Most colleges accept transfer credit but start your GPA fresh; AMCAS, LSAC and some honours programs combine everything" };
};
export const gpa10: Calc = (v) => {
  const g = p(v, "g", 3.5), from = pick(v.f, 2);
  const out = from === 0 ? (g / 4) * 10 : (g / 10) * 4;
  return { g: from === 0 ? `${nfmt(out, 2)} on a 10-point scale` : `${g2(out)} on a 4.0 scale`, how: from === 0 ? `${g2(g)} ÷ 4 × 10` : `${nfmt(g, 2)} ÷ 10 × 4`, note: "Simple linear conversion — WES and universities may use their own grade-by-grade tables" };
};
export const cgpaIndia: Calc = (v) => {
  const c = need(p(v, "c", 8.2), "Enter CGPA."), mult = p(v, "m", 9.5), sub = p(v, "s", 0);
  return { pc: `${nfmt(c * mult - sub, 2)}%`, how: `${nfmt(c, 2)} × ${nfmt(mult, 2)}${sub ? ` − ${nfmt(sub, 2)}` : ""}`, note: "CBSE uses CGPA × 9.5 · many universities use their own formula (e.g. VTU (CGPA − 0.75) × 10, Mumbai CGPA × 7.1 + 11) — check your transcript" };
};
export const ukClass: Calc = (v) => {
  const y2 = p(v, "y2", 62), y3 = p(v, "y3", 68), w2 = p(v, "w2", 33) / 100, w3 = 1 - w2;
  const avg = y2 * w2 + y3 * w3, cls = avg >= 70 ? "First-class honours (1st)" : avg >= 60 ? "Upper second-class (2:1)" : avg >= 50 ? "Lower second-class (2:2)" : avg >= 40 ? "Third-class (3rd)" : "Below honours (pass/fail)";
  return { c: cls, avg: `Weighted average ${nfmt(avg, 1)}% (year 2 ${pc(w2, 0)}, final year ${pc(w3, 0)})`, note: Math.abs(avg - Math.round(avg / 10) * 10) < 2 ? "You're within 2% of a boundary — many universities apply rules that can round you up" : "Common boundaries 70 / 60 / 50 / 40% · weightings vary by university" };
};
export const germanGpa: Calc = (v) => {
  const nmax = need(p(v, "x", 4), "Enter the best possible grade."), nmin = p(v, "m", 1), nd = p(v, "d", 3.5);
  const g = 1 + (3 * (nmax - nd)) / (nmax - nmin);
  return { g: `German grade ${nfmt(Math.min(5, Math.max(1, g)), 1)}`, how: `Modified Bavarian formula: 1 + 3 × (${nfmt(nmax, 2)} − ${nfmt(nd, 2)}) ÷ (${nfmt(nmax, 2)} − ${nfmt(nmin, 2)})`, note: "1.0 is best, 4.0 is the minimum pass · Nmin is the lowest passing grade in your system (1.0 on a US 4.0 scale)" };
};
export const wam: Calc = (v) => {
  const rows = txt(v, "s").split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => l.split(/[\s,]+/).map(Number)).filter(([m, c]) => m >= 0 && c > 0);
  if (!rows.length) throw new InputError("Enter units as 'mark credit points' on separate lines.");
  const cr = rows.reduce((s, [, c]) => s + c, 0), w = rows.reduce((s, [m, c]) => s + m * c, 0) / cr;
  const band = w >= 85 ? "High Distinction" : w >= 75 ? "Distinction" : w >= 65 ? "Credit" : w >= 50 ? "Pass" : "Fail";
  return { w: `WAM ${nfmt(w, 2)}`, b: `${band} average over ${rows.length} units (${nfmt(cr, 0)} credit points)`, note: "Credit-point weighted mean · some universities weight later-year units more (e.g. 1:2:3) — check your faculty rules" };
};
export const latin: Calc = (v) => {
  const g = p(v, "g", 3.75), c = p(v, "c", 3.5), m = p(v, "m", 3.7), s = p(v, "s", 3.9);
  const r = g >= s ? "Summa cum laude" : g >= m ? "Magna cum laude" : g >= c ? "Cum laude" : "No Latin honors";
  return { r, how: `GPA ${g2(g)} vs cutoffs cum laude ${g2(c)} · magna ${g2(m)} · summa ${g2(s)}`, note: g < c ? `${g2(c - g)} below cum laude` : "Cutoffs vary by school — some use class percentiles instead of fixed GPAs" };
};
export const deansList: Calc = (v) => { const s = courses(v, "s"), cut = p(v, "c", 3.5), minCr = p(v, "m", 12); const ok = s.gpa >= cut && s.cr >= minCr; return { r: ok ? "Dean's list ✓" : "Not this semester", how: `Semester GPA ${g2(s.gpa)} (need ${g2(cut)}) on ${nfmt(s.cr, 0)} credits (need ${nfmt(minCr, 0)})`, note: "Most schools require full-time letter-graded credits — pass/fail courses often don't count" }; };
export const passFail: Calc = (v) => {
  const g0 = p(v, "g", 3.3), c0 = p(v, "c", 60), cr = need(p(v, "r", 3), "Enter course credits."), exp = p(v, "e", 2.3);
  const withG = (g0 * c0 + exp * cr) / (c0 + cr);
  return { r: `Taking it pass/fail keeps your GPA at ${g2(g0)}; a ${g2(exp)} would make it ${g2(withG)}`, d: `${withG < g0 ? "Pass/fail protects" : "A letter grade would raise"} your GPA by ${g2(Math.abs(g0 - withG))}`, note: "A 'Pass' earns credit with no GPA effect, but 'Fail' may count as an F at some schools · med/grad schools may count P as a C" };
};
export const repeatedCourse: Calc = (v) => {
  const g0 = p(v, "g", 2.9), c0 = need(p(v, "c", 60), "Enter total credits."), cr = need(p(v, "r", 3), "Enter course credits."), old = p(v, "o", 0), nw = p(v, "n", 3.7), rep = pick(v.p, 2) === 0;
  const pts = g0 * c0, newG = rep ? (pts - old * cr + nw * cr) / c0 : (pts + nw * cr) / (c0 + cr);
  return { g: `New GPA ${g2(newG)} (${newG >= g0 ? "+" : "−"}${g2(Math.abs(newG - g0))})`, how: rep ? "Grade replacement: the new grade replaces the old one" : "Grade averaging: both attempts count", note: "Policies vary — many schools replace only F or D grades; AMCAS and LSAC count every attempt" };
};

// ---- Grades ----
export const pointsNeeded: Calc = (v) => {
  const e = p(v, "e", 450), tot = need(p(v, "t", 500), "Enter points possible so far."), rem = p(v, "r", 100), tgt = p(v, "g", 90) / 100;
  const req = tgt * (tot + rem) - e;
  return { r: req > rem ? `Not reachable — you'd need ${nfmt(req, 1)} of the ${nfmt(rem, 0)} remaining points` : req <= 0 ? "Already guaranteed" : `You need ${nfmt(req, 1)} of the remaining ${nfmt(rem, 0)} points (${pc(req / rem, 0)})`, cur: `Current ${pc(e / tot)} (${nfmt(e, 0)}/${nfmt(tot, 0)})`, note: `Target ${pc(tgt, 0)} of ${nfmt(tot + rem, 0)} total points` };
};
const LTP: [string, number, number][] = [["A+", 97, 100], ["A", 93, 96], ["A−", 90, 92], ["B+", 87, 89], ["B", 83, 86], ["B−", 80, 82], ["C+", 77, 79], ["C", 73, 76], ["C−", 70, 72], ["D+", 67, 69], ["D", 63, 66], ["D−", 60, 62], ["F", 0, 59]];
export const letterPct: Calc = (v) => {
  const x = LTP[pick(v.l, LTP.length)];
  return { r: `${x[0]} = ${x[1]}–${x[2]}%`, gpa: `GPA points: ${["4.0", "4.0", "3.7", "3.3", "3.0", "2.7", "2.3", "2.0", "1.7", "1.3", "1.0", "0.7", "0.0"][pick(v.l, LTP.length)]}`, note: "Most common US scale — your syllabus may use 90/80/70/60 without plus/minus or a 10-point scale" };
};
export const sbg: Calc = (v) => {
  const sc = [1, 2, 3, 4].map((i) => p(v, `s${i}`, [3, 2, 4, 3][i - 1])).filter((x) => x > 0), mode = pick(v.m, 3);
  if (!sc.length) throw new InputError("Enter at least one score.");
  const mean = sc.reduce((a, b) => a + b, 0) / sc.length, recent = sc[sc.length - 1], decay = sc.reduce((a, b) => a * 0.35 + b * 0.65);
  const r = [mean, recent, decay][mode];
  return { r: `Standard score ${nfmt(r, 2)} of 4`, l: r >= 3.5 ? "Exceeds standard" : r >= 2.5 ? "Meets standard (proficient)" : r >= 1.5 ? "Approaching standard" : "Beginning", note: `${["Mean", "Most recent", "Decaying average (65% newest)"][mode]} of ${sc.length} evidence scores · decaying average rewards growth over time` };
};
export const extraCredit: Calc = (v) => {
  const e = p(v, "e", 410), t = need(p(v, "t", 500), "Enter points possible."), x = p(v, "x", 10);
  return { r: `${pc(e / t)} → ${pc((e + x) / t)} with ${nfmt(x, 1)} extra-credit points`, d: `+${nfmt((x / t) * 100, 2)} percentage points`, note: "Extra credit added to points earned without raising points possible · weighted categories may give it less effect" };
};
export const dropLowest: Calc = (v) => {
  const xs = txt(v, "s").split(/[\s,;]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0), d = Math.round(p(v, "d", 1));
  if (xs.length <= d) throw new InputError("Enter more scores than you're dropping.");
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length, kept = [...xs].sort((a, b) => b - a).slice(0, xs.length - d);
  return { r: `${nfmt(avg(kept), 2)} average after dropping ${d} lowest`, b: `${nfmt(avg(xs), 2)} with all ${xs.length} scores (+${nfmt(avg(kept) - avg(xs), 2)})`, note: `Dropped: ${[...xs].sort((a, b) => a - b).slice(0, d).join(", ")} · assumes equal-weight scores` };
};
export const participation: Calc = (v) => {
  const a = p(v, "a", 26), t = need(p(v, "t", 30), "Enter class sessions."), q = p(v, "q", 3) / 4, w = p(v, "w", 10) / 100, rest = p(v, "r", 85) / 100;
  const part = (a / t) * 0.5 + q * 0.5, fin = rest * (1 - w) + part * w;
  return { p: `Participation grade ${pc(part, 0)}`, f: `Course grade ${pc(fin)} with participation worth ${pc(w, 0)}`, note: "Half attendance, half contribution quality (rated out of 4) — teachers use many rubrics; adjust to your syllabus" };
};
export const homeworkAvg: Calc = (v) => {
  const xs = txt(v, "s").split(/[\s,;]+/).map(Number).filter((x) => Number.isFinite(x) && x >= 0), out = p(v, "o", 10), miss = Math.round(p(v, "m", 0));
  if (!xs.length && !miss) throw new InputError("Enter homework scores.");
  const all = [...xs, ...Array(miss).fill(0)], avg = all.reduce((a, b) => a + b, 0) / all.length;
  return { a: `${nfmt(avg, 2)} / ${nfmt(out, 0)} average (${pc(avg / out)})`, n: `${all.length} assignments${miss ? ` including ${miss} missing as zero` : ""}`, note: miss ? `Without the zeros: ${pc(xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1) / out)}` : "Each missing zero pulls the average down sharply — turn work in late if allowed" };
};
export const labReport: Calc = (v) => {
  const parts = [["i", "Introduction", 10], ["m", "Methods", 15], ["r", "Results", 25], ["d", "Discussion", 30], ["c", "Conclusion & references", 20]] as [string, string, number][];
  let got = 0, max = 0; const txt0: string[] = [];
  for (const [k, l, w] of parts) { const s = Math.min(4, p(v, k, 3)); got += (s / 4) * w; max += w; txt0.push(`${l} ${nfmt(s, 1)}/4`); }
  return { g: `${pc(got / max, 0)} lab report grade`, parts: txt0.join(" · "), note: "Weights: intro 10, methods 15, results 25, discussion 30, conclusion/references 20 — edit to match your rubric" };
};
export const attendance: Calc = (v) => {
  const a = p(v, "a", 168), t = need(p(v, "t", 180), "Enter total days."), tgt = p(v, "g", 90) / 100;
  const r = a / t, missed = t - a, chronic = r < 0.9;
  return { r: `${pc(r)} attendance (${nfmt(missed, 0)} days missed)`, s: chronic ? `Below 90% — counts as chronic absence (≈ ${nfmt(missed, 0)} of ${nfmt(t, 0)} days)` : "Good attendance", note: `To finish at ${pc(tgt, 0)} you can miss at most ${nfmt(Math.max(0, Math.floor(t * (1 - tgt))), 0)} days in total` };
};
export const missingWork: Calc = (v) => {
  const e = p(v, "e", 430), t = need(p(v, "t", 500), "Enter points possible including the missing work."), m = p(v, "m", 50), late = p(v, "l", 20) / 100;
  const now = e / t, ifDone = (e + m * (1 - late) * 0.85) / t;
  return { r: `${pc(now)} with the work missing (zero)`, d: `≈ ${pc(ifDone)} if you hand it in late at ${pc(1 - late, 0)} credit and score 85%`, note: `The missing ${nfmt(m, 0)} points cost you ${nfmt((m / t) * 100, 1)} percentage points` };
};

// ---- registry (generated)
export const ideaEdu1CustomCalculators: Record<string, Calc> = {
  "pell-grant-estimate-calculator": pell,
  "cost-of-attendance-calculator": coa,
  "student-budget-monthly-college-calculator": studentBudget,
  "scholarship-value-total-calculator": scholarshipTotal,
  "work-study-earnings-calculator": workStudy,
  "in-state-vs-out-of-state-tuition-calculator": inOut,
  "community-college-transfer-savings-calculator": ccTransfer,
  "dorm-vs-off-campus-cost-calculator": dorm,
  "meal-plan-worth-it-calculator": mealPlan,
  "textbook-cost-per-semester-calculator": textbooks,
  "graduate-degree-worth-it-calculator": gradWorth,
  "coding-bootcamp-roi-calculator": bootcamp,
  "trade-school-vs-college-calculator": tradeVsCollege,
  "student-loan-borrowing-limit-calculator": loanLimit,
  "federal-student-loan-interest-accrual-calculator": accrual,
  "scholarship-displacement-calculator": displacement,
  "tuition-payment-plan-calculator": tuitionPlan,
  "mba-roi-calculator": mba,
  "nursing-school-cost-calculator": nursing,
  "phd-stipend-living-cost-calculator": phd,
  "cumulative-gpa-after-semester-calculator": cumGpa,
  "gpa-needed-to-reach-target-calculator": gpaTarget,
  "raise-gpa-credits-needed-calculator": raiseGpa,
  "major-gpa-calculator": majorGpa,
  "transfer-gpa-calculator": transferGpa,
  "gpa-10-point-scale-calculator": gpa10,
  "cgpa-to-percentage-india-calculator": cgpaIndia,
  "uk-degree-classification-calculator": ukClass,
  "german-grade-to-gpa-calculator": germanGpa,
  "australian-wam-calculator": wam,
  "latin-honors-gpa-calculator": latin,
  "deans-list-gpa-calculator": deansList,
  "pass-fail-gpa-impact-calculator": passFail,
  "repeated-course-gpa-calculator": repeatedCourse,
  "points-needed-for-grade-calculator": pointsNeeded,
  "letter-grade-to-percentage-calculator": letterPct,
  "standards-based-grade-calculator": sbg,
  "extra-credit-impact-calculator": extraCredit,
  "dropped-lowest-score-grade-calculator": dropLowest,
  "participation-grade-calculator": participation,
  "homework-average-calculator": homeworkAvg,
  "lab-report-grade-calculator": labReport,
  "attendance-percentage-calculator": attendance,
  "missing-assignment-impact-calculator": missingWork,
};
