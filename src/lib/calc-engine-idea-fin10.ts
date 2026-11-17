/**
 * Idea build, batch fin10 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Finance > Tax (US, 20) + Hong Kong Tax & Salary (8).
 * US 2026 figures from IRS Rev. Proc. 2025-32 (read from the IRS PDF) unless noted:
 *  Brackets — single 12,400/50,400/105,700/201,775/256,225/640,600; MFJ 24,800/100,800/211,400/403,550/512,450/768,700;
 *  HoH 17,700/67,450/105,700/201,750/256,200/640,600. Standard deduction 16,100 / 32,200 / 24,150; aged or blind +1,650 (+2,050 unmarried).
 *  EITC (earned income amount / max / phase-out start / end, other statuses; MFJ start 31,160 or 18,140):
 *   0 kids 8,680/664/10,860/19,540 (MFJ end 26,820); 1 kid 13,020/4,427/23,890/51,593 (58,863); 2 kids 18,290/7,316/23,890/58,629 (65,899);
 *   3+ 18,290/8,231/23,890/62,974 (70,244); investment income limit 12,200.
 *  QBI §199A threshold 201,750 (MFJ 403,500), fully phased in at 276,750 (553,500). Student loan interest phase-out 85,000–100,000 (175,000–205,000).
 *  Gift annual exclusion 19,000; failure-to-file minimum penalty $535 (returns more than 60 days late). FEIE 132,900 (IRS 2026 release).
 *  Saver's credit AGI limits 80,500 MFJ / 60,375 HoH / 40,250 others (IRS 2026 limits release); 50%/20% tiers at 60%/65% of those.
 *  Statutory (not indexed): NIIT 3.8% over 200,000 / 250,000; AOTC & LLC phase-out 80,000–90,000 / 160,000–180,000; medical floor 7.5% of AGI.
 *  OBBBA from 2026: dependent care credit 50% falling 1 pt per $2,000 of AGI over $15,000 to 35%, then 1 pt per $2,000 ($4,000 joint) over
 *  $75,000 ($150,000) to 20%; gambling losses limited to 90%; no tax on tips deduction up to $25,000 (phase-out $100 per $1,000 over
 *  $150,000 / $300,000); non-itemizer charity deduction $1,000 / $2,000; itemized charity 0.5%-of-AGI floor; SALT cap $40,400 (phases down
 *  30% of MAGI over $505,000 to $10,000); lifetime gift/estate exemption $15,000,000. IRS interest rate 7% (Q4 2026).
 * Hong Kong 2025/26: salaries tax bands 50,000 at 2/6/10/14%, then 17%; standard rate 15% on first HK$5M, 16% above; basic allowance
 * 132,000, married 264,000, child 130,000; 100% tax reduction capped at HK$3,000. MPF 5% of relevant income HK$7,100–30,000 a month.
 * Profits tax two-tier 8.25%/16.5% (corporations), 7.5%/15% (unincorporated) on first HK$2M. AVD Scale 2 with HK$100 up to HK$4M
 * (2025 Budget) and 6.5% above HK$100M (from 26 Feb 2026). Domestic rates progressive from 1 Jan 2025: 5% / 8% / 12%.
 * Severance / long service: 2/3 × last month's wages (cap HK$22,500) × years, max HK$390,000.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $0 = (x: number) => money(x, "$", 0);
const H0 = (x: number) => money(x, "HK$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const ph = (x: number, lo: number, hi: number) => (x <= lo ? 1 : x >= hi ? 0 : (hi - x) / (hi - lo));

// ---- US brackets (fs: 0 single, 1 MFJ, 2 HoH) ----
const BR = [[12400, 50400, 105700, 201775, 256225, 640600], [24800, 100800, 211400, 403550, 512450, 768700], [17700, 67450, 105700, 201750, 256200, 640600]];
const RT = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
const SD = [16100, 32200, 24150];
function tax(ti: number, fs: number, idx = 1) { const b = BR[fs].map((x) => x * idx); let t = 0, lo = 0; for (let i = 0; i < 7; i++) { const hi = i < 6 ? b[i] : Infinity; if (ti > lo) t += (Math.min(ti, hi) - lo) * RT[i]; lo = hi; } return t; }
const marg = (ti: number, fs: number) => { const i = BR[fs].findIndex((x) => ti <= x); return RT[i < 0 ? 6 : i]; };
const fs3 = (v: Record<string, number>) => pick(v.fs, 3);
const joint = (v: Record<string, number>) => fs3(v) === 1;

export const niit: Calc = (v) => {
  const magi = p(v, "m", 280000), nii = p(v, "nii", 40000), fs = pick(v.fs, 3), th = [200000, 250000, 125000][fs];
  const base = Math.min(nii, Math.max(0, magi - th)), t = base * 0.038;
  return { t: t > 0 ? `${$0(t)} net investment income tax` : "No NIIT — MAGI is under the threshold", base: `3.8% × the smaller of investment income ${$0(nii)} or MAGI over ${$0(th)} (${$0(Math.max(0, magi - th))}) = ${$0(base)}`, note: "Covers interest, dividends, capital gains, rents and passive income — not wages, IRA/401(k) withdrawals or tax-exempt interest; thresholds aren't indexed" };
};
const Q_DAYS = [365, 304, 212, 90];
export const underpay: Calc = (v) => {
  const cur = p(v, "cur", 30000), prior = p(v, "pr", 24000), agi = p(v, "agi", 120000), wh = p(v, "wh", 15000), est = p(v, "est", 0), rate = p(v, "r", 7) / 100;
  const req = Math.min(0.9 * cur, prior * (agi > 150000 ? 1.1 : 1)), owe = cur - wh - est;
  if (owe < 1000) return { pen: "No penalty — you owe less than $1,000 after withholding and estimates", req: `Safe harbor ${$0(req)}`, tip: "—" };
  let pen = 0; const perQ = req / 4, paidQ = (wh + est) / 4;
  for (let i = 0; i < 4; i++) { const sh = Math.max(0, perQ - paidQ); pen += sh * rate * (Q_DAYS[i] / 365); }
  return { pen: pen > 0 ? `≈ ${$0(pen)} underpayment penalty (Form 2210)` : "No penalty — you met the safe harbor", req: `Safe harbor ${$0(req)} = lower of 90% of 2026 tax (${$0(0.9 * cur)}) or ${agi > 150000 ? "110%" : "100%"} of 2025 tax (${$0(prior * (agi > 150000 ? 1.1 : 1))}) · you paid ${$0(wh + est)}`, tip: `Balance due ${$0(owe)} by April 15, 2027 · raising withholding now counts as paid evenly through the year` };
};
export const stdVsItem: Calc = (v) => {
  const fs = fs3(v), agi = p(v, "agi", 150000), salt = p(v, "salt", 14000), mi = p(v, "mi", 12000), ch = p(v, "ch", 4000), med = p(v, "med", 3000), oth = p(v, "o", 0), a65 = Math.round(p(v, "n65", 0));
  const cap = Math.max(10000, 40400 - Math.max(0, agi - 505000) * 0.3), saltD = Math.min(salt, cap), chD = Math.max(0, ch - 0.005 * agi), medD = Math.max(0, med - 0.075 * agi);
  const item = saltD + mi + chD + medD + oth, sd = SD[fs] + a65 * (fs === 1 ? 1650 : 2050), best = Math.max(item, sd), ti = Math.max(0, agi - best);
  return { best: item > sd ? `Itemize — ${$0(item)} vs ${$0(sd)} standard (${$0(item - sd)} more)` : `Take the standard deduction — ${$0(sd)} vs ${$0(item)} itemized`, item: `SALT ${$0(saltD)} (cap ${$0(cap)}) · mortgage interest ${$0(mi)} · charity ${$0(chD)} after 0.5% floor · medical ${$0(medD)} over 7.5% of AGI${oth ? ` · other ${$0(oth)}` : ""}`, save: `≈ ${$0((best - Math.min(item, sd)) * marg(ti, fs))} tax difference at your ${pc(marg(ti, fs), 0)} bracket${item <= sd && ch > 0 ? ` · non-itemizers can still deduct up to ${fs === 1 ? "$2,000" : "$1,000"} of cash gifts` : ""}` };
};
const EITC = [[8680, 664, 10860, 19540, 18140, 26820], [13020, 4427, 23890, 51593, 31160, 58863], [18290, 7316, 23890, 58629, 31160, 65899], [18290, 8231, 23890, 62974, 31160, 70244]];
export const eitc: Calc = (v) => {
  const k = Math.min(3, Math.round(p(v, "k", 2))), ei = p(v, "ei", 30000), agi = Math.max(ei, p(v, "agi", 30000)), j = joint(v), inv = p(v, "inv", 0), age = p(v, "a", 30);
  if (inv > 12200) return { c: "No EITC — investment income is over $12,200", how: "—", note: "—" };
  if (k === 0 && (age < 25 || age > 64)) return { c: "No EITC — without qualifying children you must be 25–64", how: "—", note: "—" };
  const [ea, mx, s0, e0, sj, ejj] = EITC[k], st = j ? sj : s0, en = j ? ejj : e0;
  const up = Math.min(mx, (ei * mx) / ea), down = agi <= st ? mx : Math.max(0, mx - ((agi - st) * mx) / (en - st)), c = Math.max(0, Math.min(up, down));
  return { c: `${$0(c)} earned income credit (refundable)`, how: `Max ${$0(mx)} for ${k === 3 ? "3+" : k} ${k === 1 ? "child" : "children"} · phases in to ${$0(ea)} of earnings, phases out from ${$0(st)} to ${$0(en)}`, note: "Refunds with EITC are released from mid-February · married filing separately qualifies only under the separated-spouse rules" };
};
export const careCredit: Calc = (v) => {
  const k = Math.min(2, Math.max(1, Math.round(p(v, "k", 2)))), ex = p(v, "ex", 8000), agi = p(v, "agi", 90000), j = joint(v), fsa = p(v, "fsa", 0), tx = p(v, "tx", 99999);
  const lim = Math.max(0, (k === 1 ? 3000 : 6000) - fsa), q = Math.min(ex, lim);
  let rate = Math.max(0.35, 0.5 - Math.ceil(Math.max(0, agi - 15000) / 2000) * 0.01);
  const t2 = j ? 150000 : 75000, step = j ? 4000 : 2000; if (agi > t2) rate = Math.max(0.2, rate - Math.ceil((agi - t2) / step) * 0.01);
  const c = Math.min(q * rate, tx);
  return { c: `${$0(c)} child and dependent care credit`, how: `${pc(rate, 0)} of ${$0(q)} qualifying expenses (limit ${$0(k === 1 ? 3000 : 6000)}${fsa ? ` minus ${$0(fsa)} dependent care FSA` : ""})`, note: "Nonrefundable — limited to your tax · children under 13 or a disabled spouse/dependent; both spouses must work or study" };
};
const eduPh = (agi: number, j: boolean) => ph(agi, j ? 160000 : 80000, j ? 180000 : 90000);
export const aotc: Calc = (v) => {
  const ex = p(v, "ex", 4000), n = Math.max(1, Math.round(p(v, "n", 1))), agi = p(v, "agi", 85000), j = joint(v);
  const per = Math.min(ex, 2000) + 0.25 * Math.max(0, Math.min(ex, 4000) - 2000), f = eduPh(agi, j), c = per * n * f;
  return { c: `${$0(c)} American Opportunity credit${n > 1 ? ` for ${n} students` : ""}`, ref: `Up to ${$0(c * 0.4)} refundable (40%)${f < 1 ? ` · reduced to ${pc(f, 0)} by the ${j ? "$160,000–$180,000" : "$80,000–$90,000"} phase-out` : ""}`, note: "First 4 years of college, at least half-time · 100% of the first $2,000 + 25% of the next $2,000 per student" };
};
export const llc: Calc = (v) => {
  const ex = p(v, "ex", 6000), agi = p(v, "agi", 85000), j = joint(v), f = eduPh(agi, j), c = 0.2 * Math.min(ex, 10000) * f;
  return { c: `${$0(c)} Lifetime Learning credit`, how: `20% of ${$0(Math.min(ex, 10000))} (max $10,000 of expenses per return)${f < 1 ? ` × ${pc(f, 0)} phase-out` : ""}`, note: "Nonrefundable · any year of college, grad school or job-skills courses · you can't claim it and the AOTC for the same student in one year" };
};
export const studentLoanInt: Calc = (v) => {
  const i = p(v, "i", 2500), m = p(v, "m", 90000), j = joint(v), tr = p(v, "tr", 22) / 100;
  const f = ph(m, j ? 175000 : 85000, j ? 205000 : 100000), d = Math.min(i, 2500) * f;
  return { d: `${$0(d)} deduction`, how: `Up to $2,500 of interest${f < 1 ? ` × ${pc(f, 0)} (phase-out ${j ? "$175,000–$205,000" : "$85,000–$100,000"})` : ""}`, save: `≈ ${$0(d * tr)} tax saved at ${pc(tr, 0)} · taken without itemizing · not allowed if married filing separately` };
};
export const homeOffice: Calc = (v) => {
  const sq = p(v, "sq", 200), hs = need(p(v, "hs", 2000), "Enter the home's square footage."), rent = p(v, "rent", 0), mi = p(v, "mi", 9000), tx = p(v, "tx", 4000), ut = p(v, "ut", 3600), ins = p(v, "ins", 1500), rep = p(v, "rep", 800), dep = p(v, "dep", 2500), tr = p(v, "tr", 30) / 100;
  const share = Math.min(1, sq / hs), simp = Math.min(sq, 300) * 5, reg = share * (rent + mi + tx + ut + ins + rep + dep), best = Math.max(simp, reg);
  return { best: `${reg > simp ? "Regular" : "Simplified"} method wins: ${$0(best)} deduction`, both: `Simplified ${$0(simp)} ($5 × ${nfmt(Math.min(sq, 300))} sq ft, max 300) · regular ${$0(reg)} (${pc(share, 1)} of home costs)`, save: `≈ ${$0(best * tr)} saved at ${pc(tr, 0)} (income + self-employment tax) · only for self-employed use that's regular and exclusive; W-2 employees can't deduct it` };
};
export const qbi: Calc = (v) => {
  const q0 = num(v.q, 120000), ti = p(v, "ti", 150000), cg = p(v, "cg", 0), j = joint(v), sstb = pick(v.ss, 2) === 1, w2 = p(v, "w2", 0), ub = p(v, "ub", 0);
  const th = j ? 403500 : 201750, rg = j ? 150000 : 75000, cap = 0.2 * Math.max(0, ti - cg);
  if (q0 <= 0) return { d: "No deduction — QBI is zero or a loss (carried forward)", how: "—", note: "—" };
  const f = Math.min(1, Math.max(0, (ti - th) / rg)), q = sstb ? q0 * (1 - f) : q0, wl = sstb ? Math.max(0.5 * w2, 0.25 * w2 + 0.025 * ub) * (1 - f) : Math.max(0.5 * w2, 0.25 * w2 + 0.025 * ub);
  const tent = 0.2 * q, dq = f === 0 ? tent : Math.max(0, tent - f * Math.max(0, tent - Math.min(tent, wl)));
  const d = Math.max(Math.min(dq, cap), q0 >= 1000 ? Math.min(400, cap) : 0);
  return { d: `${$0(d)} QBI deduction (§199A)`, how: f === 0 ? `20% of ${$0(q0)} QBI, limited to 20% of taxable income less capital gains (${$0(cap)})` : `Taxable income is ${f >= 1 ? "above" : "within"} the ${$0(th)}–${$0(th + rg)} phase-in — ${sstb ? "specified service business limits apply" : "W-2 wage / property limit applies"}`, note: "Minimum $400 deduction if you have at least $1,000 of QBI from an active business (OBBBA, from 2026)" };
};
export const giftTax: Calc = (v) => {
  const g = p(v, "g", 60000), n = Math.max(1, Math.round(p(v, "n", 1))), split = pick(v.sp, 2) === 1, used = p(v, "u", 0);
  const ex = 19000 * (split ? 2 : 1) * n, tg = Math.max(0, g - ex), left = 15000000 * (split ? 2 : 1) - used - tg, tx = left < 0 ? -left * 0.4 : 0;
  return { tg: tg > 0 ? `${$0(tg)} taxable gift — file Form 709` : `No taxable gift — within the ${$0(ex)} annual exclusion`, tax: tx > 0 ? `${$0(tx)} gift tax due (40% above the lifetime exemption)` : "No gift tax due — the taxable gift uses lifetime exemption", left: `Lifetime exemption left ${$0(Math.max(0, left))} (2026: $15,000,000 per person${split ? ", doubled with gift splitting" : ""})` };
};
export const gambling: Calc = (v) => {
  const w = p(v, "w", 10000), l = p(v, "l", 8000), it = pick(v.it, 2) === 1, tr = p(v, "tr", 22) / 100, wh = p(v, "wh", 0);
  const ld = it ? Math.min(0.9 * l, w) : 0, taxable = w - ld, tx = taxable * tr;
  return { tax: `≈ ${$0(tx)} tax on ${$0(taxable)} of net taxable winnings`, loss: it ? `Losses deductible ${$0(ld)} (90% of ${$0(l)}, capped at winnings — new 2026 rule)` : "Losses only count if you itemize — so all winnings are taxed", due: `${wh ? `Withheld ${$0(wh)} · ` : ""}${tx - wh > 0 ? `≈ ${$0(tx - wh)} still owed` : `≈ ${$0(wh - tx)} refund`} · W-2G at $2,000+ on slots/bingo (2026); 24% withholding on most wins over $5,000` };
};
export const tipsTax: Calc = (v) => {
  const t = p(v, "t", 18000), m = p(v, "m", 60000), j = joint(v), tr = p(v, "tr", 12) / 100;
  const red = Math.floor(Math.max(0, m - (j ? 300000 : 150000)) / 1000) * 100, d = Math.max(0, Math.min(t, 25000) - red);
  return { d: `${$0(d)} tips deduction`, save: `≈ ${$0(d * tr)} federal income tax saved at ${pc(tr, 0)}`, fica: `Tips still owe Social Security and Medicare (${$0(t * 0.0765)} employee share) and state tax · 2025–2028, for occupations that customarily receive tips${red ? ` · reduced ${$0(red)} by the income phase-out` : ""}` };
};
export const charity: Calc = (v) => {
  const g = p(v, "g", 5000), agi = p(v, "agi", 120000), it = pick(v.it, 2) === 1, j = joint(v), tr = p(v, "tr", 24) / 100;
  const d = it ? Math.max(0, g - 0.005 * agi) : Math.min(g, j ? 2000 : 1000), rate = it ? Math.min(tr, 0.35) : tr;
  return { save: `≈ ${$0(d * rate)} tax saved on a ${$0(g)} gift`, d: it ? `Deduction ${$0(d)} after the 0.5%-of-AGI floor (${$0(0.005 * agi)})${tr > 0.35 ? " · benefit capped at 35%" : ""}` : `Non-itemizer deduction ${$0(d)} (max ${j ? "$2,000" : "$1,000"} of cash gifts, new for 2026)`, cost: `True cost of the gift ${$0(g - d * rate)} · donating appreciated stock also avoids capital gains tax` };
};
export const medical: Calc = (v) => {
  const e = p(v, "e", 12000), agi = p(v, "agi", 80000), tr = p(v, "tr", 12) / 100;
  const fl = 0.075 * agi, d = Math.max(0, e - fl);
  return { d: d > 0 ? `${$0(d)} deductible medical expenses` : "Nothing deductible — expenses are under the 7.5% floor", fl: `Floor ${$0(fl)} (7.5% of AGI) · you need ${$0(Math.max(0, fl - e))} more to benefit`, save: `≈ ${$0(d * tr)} saved if you itemize · includes insurance premiums paid with after-tax money, long-term care, mileage (21¢/mile)` };
};
export const savers: Calc = (v) => {
  const c = p(v, "c", 2000), agi = p(v, "agi", 45000), fs = fs3(v), tx = p(v, "tx", 99999);
  const [t50, t20, top] = [[24250, 26250, 40250], [48500, 52500, 80500], [36375, 39375, 60375]][fs], r = agi <= t50 ? 0.5 : agi <= t20 ? 0.2 : agi <= top ? 0.1 : 0;
  const base = Math.min(c, fs === 1 ? 4000 : 2000), cr = Math.min(base * r, tx);
  return { c: r ? `${$0(cr)} saver's credit (${pc(r, 0)} rate)` : `No credit — AGI is over ${$0(top)}`, how: `${pc(r, 0)} of ${$0(base)} (up to $2,000 per person) · tiers 50% to ${$0(t50)}, 20% to ${$0(t20)}, 10% to ${$0(top)}`, note: "Nonrefundable · age 18+, not a full-time student or claimed as a dependent · from 2027 it becomes the Saver's Match" };
};
export const feie: Calc = (v) => {
  const fe = p(v, "fe", 150000), hc = p(v, "hc", 30000), days = p(v, "d", 340), tr = p(v, "tr", 24) / 100;
  if (days < 330) return { ex: "Not eligible under the physical presence test — need 330 full days abroad in 12 months", hx: "Bona fide residence test may still qualify", tax: "—" };
  const ex = Math.min(fe, 132900), hx = Math.max(0, Math.min(hc, 39870) - 21264), left = Math.max(0, fe - ex - hx);
  return { ex: `${$0(ex)} excluded (2026 limit $132,900)`, hx: `Housing exclusion ${$0(hx)} (costs above $21,264, capped at $39,870 in most places)`, tax: `${$0(left)} still taxable — US tax ≈ ${$0(left * tr)} (stacked at higher brackets) · self-employment tax still applies` };
};
export const ftc: Calc = (v) => {
  const fi = p(v, "fi", 60000), ti = need(p(v, "ti", 150000), "Enter total taxable income."), ust = p(v, "ust", 25000), ft = p(v, "ft", 18000);
  const lim = (ust * Math.min(fi, ti)) / ti, cr = Math.min(ft, lim);
  return { cr: `${$0(cr)} foreign tax credit`, lim: `Limit ${$0(lim)} = US tax × foreign income ÷ total income (${pc(Math.min(fi, ti) / ti, 0)})`, carry: ft > lim ? `${$0(ft - lim)} excess foreign tax — carry back 1 year or forward 10` : "All foreign tax credited · up to $300 ($600 joint) of passive foreign tax can skip Form 1116" };
};
export const bracketCreep: Calc = (v) => {
  const inc = need(p(v, "i", 80000), "Enter your income."), ra = p(v, "ra", 4) / 100, inf = p(v, "inf", 3) / 100, fs = fs3(v), ix = pick(v.ix, 2) === 0;
  const t0 = tax(Math.max(0, inc - SD[fs]), fs), i1 = inc * (1 + ra), k = ix ? 1 + inf : 1, t1 = tax(Math.max(0, i1 - SD[fs] * k), fs, k);
  const real0 = inc - t0, real1 = (i1 - t1) / (1 + inf);
  return { tax: `Tax ${$0(t0)} → ${$0(t1)} (effective ${pc(t0 / inc)} → ${pc(t1 / i1)})`, real: `After-tax pay in today's dollars ${$0(real0)} → ${$0(real1)} (${real1 >= real0 ? "+" : "−"}${$0(Math.abs(real1 - real0))})`, note: ix ? "Federal brackets are indexed to inflation, so creep only bites when your raise beats inflation — but unindexed items (NIIT, Social Security tax thresholds, $3,000 capital loss) still creep" : "Unindexed scenario: shows how much extra tax inflation alone would add" };
};
export const irsPenalty: Calc = (v) => {
  const owed = need(p(v, "o", 5000), "Enter the unpaid tax."), mf = Math.round(p(v, "mf", 3)), mp = Math.round(p(v, "mp", 3)), rate = p(v, "r", 7) / 100, filed = pick(v.fl, 2) === 0;
  const ftp = owed * 0.005 * Math.min(mp, 50), ftfRaw = filed ? 0 : owed * Math.min(0.05 * mf, 0.25) - owed * 0.005 * Math.min(mf, mp, 5);
  const ftf = filed ? 0 : Math.max(ftfRaw, mf >= 3 ? Math.min(535, owed) : 0), intr = (owed + ftp + ftf) * (Math.pow(1 + rate / 365, mp * 30.4) - 1);
  return { tot: `${$0(owed + ftf + ftp + intr)} total due (${$0(ftf + ftp + intr)} in penalties and interest)`, pen: `Failure to file ${$0(ftf)} (5% a month, max 25%; minimum $535 if over 60 days late) · failure to pay ${$0(ftp)} (0.5% a month, max 25%)`, intr: `Interest ${$0(intr)} at ${pc(rate, 0)} compounded daily · file on time even if you can't pay — the filing penalty is 10× larger` };
};

// ---- Hong Kong ----
const hkProg = (x: number) => { let t = 0, r = x; for (const rt of [0.02, 0.06, 0.1, 0.14]) { const b = Math.min(r, 50000); t += b * rt; r -= b; } return t + Math.max(0, r) * 0.17; };
const hkStd = (x: number) => Math.min(x, 5e6) * 0.15 + Math.max(0, x - 5e6) * 0.16;
const hkSal = (inc: number, ded: number, allow: number) => { const nc = Math.max(0, inc - ded - allow), t = Math.min(hkProg(nc), hkStd(Math.max(0, inc - ded))); return { t, after: Math.max(0, t - Math.min(t, 3000)) }; };
export const hkMpf: Calc = (v) => {
  const ri = p(v, "ri", 25000), se = pick(v.se, 2) === 1;
  const ee = se ? 0 : ri < 7100 ? 0 : Math.min(ri, 30000) * 0.05, er = se ? (ri < 7100 ? 0 : Math.min(ri, 30000) * 0.05) : Math.min(ri, 30000) * 0.05;
  return { ee: se ? `HK$${nfmt(er, 0)} a month mandatory contribution (self-employed)` : `You: ${H0(ee)} a month · employer: ${H0(er)}`, yr: `${H0((ee + er) * 12)} a year into MPF${ri < 7100 ? " · below the HK$7,100 minimum, so you pay nothing (employer still pays 5%)" : ri > 30000 ? " · capped at HK$30,000 relevant income" : ""}`, tax: `Tax-deductible: ${H0(Math.min((se ? er : ee) * 12, 18000))} a year (max HK$18,000) · voluntary TVC adds up to HK$60,000 more` };
};
export const hkStamp: Calc = (v) => {
  const x = need(p(v, "x", 8000000), "Enter the price or value.");
  const B: [number, number, number, number][] = [[4000000, 0, 100, 0], [4323780, 4000000, 100, 0.2], [4500000, 0, 0, 0.015], [4935480, 4500000, 67500, 0.1], [6000000, 0, 0, 0.0225], [6642860, 6000000, 135000, 0.1], [9000000, 0, 0, 0.03], [10080000, 9000000, 270000, 0.1], [20000000, 0, 0, 0.0375], [21739120, 20000000, 750000, 0.1], [100000000, 0, 0, 0.0425]];
  let d = x * 0.065;
  for (const [hi, base, fix, rt] of B) { if (x <= hi) { d = base ? fix + (x - base) * rt : fix ? fix : x * rt; break; } }
  return { d: `${H0(Math.round(d))} ad valorem stamp duty (Scale 2)`, rate: `Effective rate ${pc(d / x, 2)} on ${H0(x)}${x > 1e8 ? " · 6.5% band above HK$100M from 26 Feb 2026 — check IRD for marginal relief" : ""}`, note: "Scale 2 now applies to all residential buyers (BSD, NRSD and SSD were removed in Feb 2024) · paid within 30 days of the agreement" };
};
export const hkProfits: Calc = (v) => {
  const ap = p(v, "ap", 3000000), un = pick(v.t, 2) === 1, red = p(v, "red", 3000);
  const [lo, hi] = un ? [0.075, 0.15] : [0.0825, 0.165], t = Math.min(ap, 2e6) * lo + Math.max(0, ap - 2e6) * hi, after = Math.max(0, t - Math.min(t, red));
  return { t: `${H0(after)} profits tax${red ? ` after the ${H0(Math.min(t, red))} one-off reduction` : ""}`, how: `${pc(lo, 2)} on the first HK$2,000,000 + ${pc(hi, 1)} above (${un ? "unincorporated business" : "corporation"}) · effective ${pc(ap ? after / ap : 0, 2)}`, note: "Only one entity in a connected group can use the two-tier rate · 2025/26 reduction is 100% capped at HK$3,000" };
};
export const hkPa: Calc = (v) => {
  const sal = p(v, "s", 600000), bus = p(v, "b", 0), rent = p(v, "rent", 240000), rates = p(v, "rates", 8000), mi = p(v, "mi", 80000), ded = p(v, "d", 18000), mar = pick(v.m, 2) === 1, k = Math.round(p(v, "k", 0));
  const allow = (mar ? 264000 : 132000) + k * 130000, nav = Math.max(0, rent - rates) * 0.8;
  const sepSal = hkSal(sal, ded, allow).after, sepProp = nav * 0.15, sepBus = Math.min(bus, 2e6) * 0.075 + Math.max(0, bus - 2e6) * 0.15, sep = sepSal + sepProp + sepBus;
  const tot = sal + bus + nav, paDed = ded + Math.min(mi, nav), pa = hkSal(tot, paDed, allow).after;
  return { best: pa < sep ? `Elect personal assessment — saves ${H0(sep - pa)}` : `Stay with separate taxation — personal assessment would cost ${H0(pa - sep)} more`, sep: `Separate: salaries tax ${H0(sepSal)} + property tax ${H0(sepProp)} + profits tax ${H0(sepBus)} = ${H0(sep)}`, pa: `Personal assessment ${H0(pa)} on ${H0(tot)} combined income (rental NAV ${H0(nav)}, mortgage interest on the let property deducted up to its NAV)` };
};
export const hkRates: Calc = (v) => {
  const rv = need(p(v, "rv", 300000), "Enter the rateable value."), gr = pick(v.gr, 2) === 1, con = p(v, "con", 1000);
  const r = Math.min(rv, 550000) * 0.05 + Math.max(0, Math.min(rv, 800000) - 550000) * 0.08 + Math.max(0, rv - 800000) * 0.12, rent = gr ? rv * 0.03 : 0;
  return { r: `${H0(Math.max(0, r - con))} rates a year (${H0(r / 4)} a quarter before concession)`, gr: gr ? `Government rent ${H0(rent)} a year (3% of rateable value)` : "No government rent (not under a Government Leases Ordinance lease)", tot: `Total ${H0(Math.max(0, r - con) + rent)} a year · progressive domestic rates 5% to HK$550,000, 8% to HK$800,000, 12% above (from 2025) · concession entered: ${H0(con)}` };
};
const hkSev = (w: number, yrs: number) => Math.min(390000, (Math.min(w, 22500) * 2) / 3 * yrs);
export const hkSeverance: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter last month's wages."), yrs = p(v, "y", 6.5);
  if (yrs < 2) return { pay: "Not eligible — severance needs at least 24 months' continuous employment", how: "—", note: "—" };
  const s = hkSev(w, yrs);
  return { pay: `${H0(s)} severance payment`, how: `2/3 × ${H0(Math.min(w, 22500))} (wages capped at HK$22,500) × ${nfmt(yrs, 2)} years${s >= 390000 ? " — capped at HK$390,000" : ""}`, note: "For redundancy or lay-off · from 1 May 2025, employer MPF contributions can't offset the part earned after that date" };
};
export const hkLsp: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter last month's wages."), yrs = p(v, "y", 8);
  if (yrs < 5) return { pay: "Not eligible — long service payment needs at least 5 years", how: "—", note: "—" };
  const s = hkSev(w, yrs);
  return { pay: `${H0(s)} long service payment`, how: `2/3 × ${H0(Math.min(w, 22500))} × ${nfmt(yrs, 2)} years${s >= 390000 ? " — capped at HK$390,000" : ""}`, note: "Due on dismissal (not for misconduct or redundancy), death, ill-health or retirement at 65+ · can't get both LSP and severance" };
};
export const hkLeave: Calc = (v) => {
  const yrs = p(v, "y", 4), earn = p(v, "e", 300000), dw = Math.max(1, p(v, "dw", 365)), taken = p(v, "t", 0);
  if (yrs < 1) return { days: "No paid annual leave until 12 months of service", pay: "—", note: "—" };
  const days = yrs < 3 ? 7 : Math.min(14, Math.floor(yrs) + 5), daily = earn / dw;
  const left = Math.max(0, days - taken);
  return { days: `${days} days paid annual leave for this leave year`, pay: `Leave pay ${H0(daily)} a day (12-month average daily wage) — ${H0(daily * left)} for the ${left} days still due`, note: "7 days after 1–2 years, rising 1 day a year to 14 days from year 9 (Employment Ordinance)" };
};

// ---- registry (generated)
export const ideaFin10CustomCalculators: Record<string, Calc> = {
  "net-investment-income-tax-calculator": niit,
  "tax-penalty-underpayment-calculator": underpay,
  "standard-vs-itemized-deduction-calculator": stdVsItem,
  "earned-income-tax-credit-calculator": eitc,
  "child-and-dependent-care-credit-calculator": careCredit,
  "american-opportunity-credit-calculator": aotc,
  "lifetime-learning-credit-calculator": llc,
  "student-loan-interest-deduction-calculator": studentLoanInt,
  "home-office-deduction-calculator": homeOffice,
  "qbi-deduction-199a-calculator": qbi,
  "gift-tax-calculator": giftTax,
  "gambling-winnings-tax-calculator": gambling,
  "tax-on-tips-calculator": tipsTax,
  "charitable-donation-tax-savings-calculator": charity,
  "medical-expense-deduction-calculator": medical,
  "savers-credit-calculator": savers,
  "foreign-earned-income-exclusion-calculator": feie,
  "foreign-tax-credit-calculator": ftc,
  "tax-bracket-creep-inflation-calculator": bracketCreep,
  "irs-penalty-and-interest-calculator": irsPenalty,
  "hong-kong-mpf-contribution-calculator": hkMpf,
  "hong-kong-stamp-duty-property-calculator": hkStamp,
  "hong-kong-profits-tax-calculator": hkProfits,
  "hong-kong-personal-assessment-calculator": hkPa,
  "hong-kong-rates-and-government-rent-calculator": hkRates,
  "hong-kong-severance-payment-calculator": hkSeverance,
  "hong-kong-long-service-payment-calculator": hkLsp,
  "hong-kong-annual-leave-pay-calculator": hkLeave,
};
