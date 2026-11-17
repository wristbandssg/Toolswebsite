/**
 * Idea build, batch fin12 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Canada (2), India (5), New Zealand (3), Singapore (2), UK (8) tax & salary = 20 tools.
 * Canada: FHSA $8,000 a year, $40,000 lifetime, $8,000 carry-forward, 15 years; RESP CESG 20% on $2,500 ($500/yr, $1,000 with catch-up,
 *  $7,200 lifetime), A-CESG +20%/+10% on the first $500, Canada Learning Bond $500 + $100/yr to $2,000.
 * India FY2026-27 (slabs unchanged in Budget 2026): new regime 0/5/10/15/20/25/30% at 4/8/12/16/20/24 lakh, std deduction ₹75,000,
 *  87A rebate to ₹60,000 up to ₹12 lakh (with marginal relief); old regime 0/5/20/30% at 2.5/5/10 lakh, std deduction ₹50,000,
 *  rebate ₹12,500 up to ₹5 lakh; cess 4%. Advance tax 15/45/75/100% by 15 Jun/Sep/Dec/Mar. Leave encashment exemption cap ₹25 lakh.
 * New Zealand: student loan 12% above $24,128 (frozen); bright-line test 2 years for sales from 1 July 2024; tax 10.5/17.5/30/33/39% at
 *  15,600/53,500/78,100/180,000; holidays 4 weeks or 8% pay-as-you-go.
 * Singapore: ABSD (from 27 Apr 2023) citizens 0/20/30%, PRs 5/30/35%, foreigners 60%, entities 65%; BSD 1/2/3/4/5/6%;
 *  SRS cap $15,300 (citizens/PR) / $35,700 (foreigners); resident tax 0–24% (YA2024+).
 * UK 2026/27: personal allowance £12,570 (tapered above £100,000), 20/40/45%; employee NI 8%/2%; employer NI 15% above £5,000;
 *  dividends 10.75% / 35.75% / 39.35% with £500 allowance; corporation tax 19% to £50,000, 25% from £250,000 (marginal relief);
 *  student loan thresholds Plan 1 £26,900, Plan 2 £29,385, Plan 4 £33,795, Plan 5 £25,000 (9%), Postgraduate £21,000 (6%);
 *  child benefit £27.05 / £17.90 a week, HICBC 1% per £200 over £60,000; marriage allowance £1,260; SMP £194.32 a week.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const prog = (x: number, b: [number, number][]) => { let t = 0, lo = 0; for (const [hi, r] of b) { if (x > lo) t += (Math.min(x, hi) - lo) * r; lo = hi; } return t; };
const C0 = (x: number) => money(x, "C$", 0);
const INR = (x: number) => `₹${Math.round(x).toLocaleString("en-IN")}`;
const NZ0 = (x: number) => money(x, "NZ$", 0);
const S0 = (x: number) => money(x, "S$", 0);
const L0 = (x: number) => money(x, "£", 0);
const L2 = (x: number) => money(x, "£", 2);

// ---- Canada ----
export const fhsa: Calc = (v) => {
  const c = p(v, "c", 8000), cf = Math.min(8000, p(v, "cf", 0)), y = Math.min(15, Math.max(1, Math.round(p(v, "y", 5)))), r = num(v.r, 5) / 100, mt = p(v, "mt", 30) / 100, b = p(v, "b", 0);
  let bal = b, put = 0, room = 8000 + cf, life = 40000 - b;
  for (let k = 0; k < y; k++) { const x = Math.min(c, room, life); bal = (bal + x) * (1 + r); put += x; life -= x; room = 8000 + Math.min(8000, room - x); }
  return { end: `${C0(bal)} tax-free for a first home after ${y} years`, ref: `${C0(put)} contributed → ≈ ${C0(put * mt)} in tax refunds at ${pc(mt, 0)}`, rule: `${c > 8000 + cf ? "Capped at $8,000 a year plus up to $8,000 carry-forward · " : ""}$40,000 lifetime limit · unused money can move to your RRSP tax-free (no RRSP room needed)` };
};
export const resp: Calc = (v) => {
  const a = Math.min(17, p(v, "a", 0)), c = p(v, "c", 2500), tier = pick(v.t, 3), r = num(v.r, 5) / 100, b = p(v, "b", 0);
  let bal = b, cesg = 0, clb = 0, put = 0, unused = 0;
  for (let age = Math.floor(a); age <= 17; age++) {
    unused += 500; const g = Math.min(c * 0.2, unused, 1000, 7200 - cesg); unused -= Math.min(g, unused); cesg += g;
    const ag = tier === 0 ? Math.min(c, 500) * 0.2 : tier === 1 ? Math.min(c, 500) * 0.1 : 0;
    const bond = tier === 0 && age <= 15 ? Math.min(age === Math.floor(a) ? 500 : 100, 2000 - clb) : 0; clb += bond;
    bal = (bal + c + g + ag + bond) * (1 + r); put += c; cesg += ag;
  }
  return { end: `${C0(bal)} in the RESP at 18`, gr: `Government grants ${C0(cesg + clb)} (CESG ${C0(cesg)}${clb ? ` + Canada Learning Bond ${C0(clb)}` : ""}) on ${C0(put)} of contributions`, tip: "Contribute $2,500 a year to get the full $500 CESG · unused grant room catches up at $1,000 a year · $50,000 lifetime contribution limit" };
};

// ---- India ----
const NEW: [number, number][] = [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]];
const OLD: [number, number][] = [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]];
const sur = (ti: number, t: number, nr: boolean) => t * (ti > 5e7 ? (nr ? 0.25 : 0.37) : ti > 2e7 ? 0.25 : ti > 1e7 ? 0.15 : ti > 5e6 ? 0.1 : 0);
export function inNew(ti: number) { let t = prog(ti, NEW); if (ti <= 1200000) t = 0; else t = Math.min(t, ti - 1200000); return (t + sur(ti, t, true)) * 1.04; }
export function inOld(ti: number) { let t = prog(ti, OLD); if (ti <= 500000) t = 0; return (t + sur(ti, t, false)) * 1.04; }
export const regime: Calc = (v) => {
  const g = need(p(v, "g", 1500000), "Enter gross salary."), oi = p(v, "oi", 0), c80 = Math.min(p(v, "c80", 150000), 150000), d80 = p(v, "d80", 25000), hra = p(v, "hra", 120000), hl = Math.min(p(v, "hl", 0), 200000), nps = Math.min(p(v, "nps", 50000), 50000), enps = p(v, "enps", 0), od = p(v, "od", 0);
  const tiN = Math.max(0, g + oi - 75000 - enps), tiO = Math.max(0, g + oi - 50000 - c80 - d80 - hra - hl - nps - enps - od), tN = inNew(tiN), tO = inOld(tiO);
  return { best: tN <= tO ? `New regime saves ${INR(tO - tN)}` : `Old regime saves ${INR(tN - tO)}`, n: `New regime: tax ${INR(tN)} on taxable income ${INR(tiN)}`, o: `Old regime: tax ${INR(tO)} on taxable income ${INR(tiO)} (deductions ${INR(g + oi - tiO - 50000)} + ₹50,000 standard)` };
};
export const advanceTax: Calc = (v) => {
  const t = p(v, "t", 300000), tds = p(v, "tds", 120000), paid = p(v, "pd", 0), net = Math.max(0, t - tds);
  if (net < 10000) return { due: "No advance tax needed — tax after TDS is under ₹10,000", sch: "—", int: "—" };
  const cum = [0.15, 0.45, 0.75, 1].map((f) => net * f), dates = ["15 June", "15 September", "15 December", "15 March"];
  return { due: `${INR(net)} advance tax for FY 2026-27`, sch: cum.map((x, i) => `${dates[i]}: ${INR(x - (i ? cum[i - 1] : 0))} (cumulative ${INR(x)})`).join(" · "), int: `${paid > 0 ? `Paid so far ${INR(paid)} · ` : ""}Shortfalls attract 1% a month interest under sections 234B/234C · senior citizens without business income are exempt` };
};
export const leaveEnc: Calc = (v) => {
  const s = need(p(v, "s", 80000), "Enter monthly basic + DA."), d = p(v, "d", 120), gov = pick(v.g, 2) === 1, ev = pick(v.e, 2), avg = p(v, "avg", s);
  const amt = (s / 30) * d;
  const ex = gov && ev === 0 ? amt : ev === 0 ? Math.min(amt, 2500000, avg * 10) : 0;
  return { amt: `${INR(amt)} leave encashment`, ex: ev === 1 ? "Fully taxable — encashment while still in service" : `${INR(ex)} tax-exempt${gov ? " (government employee — fully exempt)" : " (lowest of actual, ₹25 lakh and 10 months' average salary)"}`, tax: `${INR(amt - ex)} taxable as salary · each year of service caps encashable leave at 30 days for the exemption` };
};
export const ctcInHand: Calc = (v) => {
  const ctc = need(p(v, "c", 1200000), "Enter annual CTC."), bp = p(v, "bp", 40) / 100, cap = pick(v.pf, 2) === 1, grat = pick(v.gr, 2) === 0, pt = p(v, "pt", 2500), ins = p(v, "ins", 0);
  const basic = ctc * bp, pfBase = cap ? Math.min(basic, 180000) : basic, erPf = pfBase * 0.12, gr = grat ? basic * 0.0481 : 0, gross = ctc - erPf - gr - ins, eePf = pfBase * 0.12;
  const tax = inNew(Math.max(0, gross - 75000)), net = gross - eePf - pt - tax;
  return { m: `${INR(net / 12)} in-hand a month (${INR(net)} a year)`, ded: `From CTC: employer PF ${INR(erPf)}${gr ? ` · gratuity ${INR(gr)}` : ""}${ins ? ` · insurance ${INR(ins)}` : ""} → gross ${INR(gross)}`, tax: `From gross: your PF ${INR(eePf)} · professional tax ${INR(pt)} · income tax ${INR(tax)} (new regime)` };
};
export const homeLoanTax: Calc = (v) => {
  const i = p(v, "i", 280000), pr = p(v, "pr", 120000), o80 = p(v, "o80", 50000), lo = pick(v.lo, 2) === 1, rate = p(v, "tr", 31.2) / 100, rg = pick(v.rg, 2);
  const intD = lo ? i : Math.min(i, 200000), prD = Math.max(0, Math.min(pr, 150000 - o80));
  if (rg === 0 && !lo) return { d: "No home-loan deduction for a self-occupied home in the new regime", save: "—", tip: "Compare with the old regime: up to ₹2 lakh interest + ₹1.5 lakh principal (80C)" };
  const d = rg === 0 ? intD : intD + prD;
  return { d: `${INR(d)} deduction (interest ${INR(intD)}${rg === 1 ? ` + principal under 80C ${INR(prD)}` : ""})`, save: `≈ ${INR(d * rate)} tax saved at ${pc(rate, 1)} (incl. cess)`, tip: lo ? "Let-out property: full interest deductible, but the house-property loss set off against other income is capped at ₹2 lakh (carry forward the rest 8 years)" : "Self-occupied: interest capped at ₹2 lakh (Section 24(b)); principal shares the ₹1.5 lakh 80C limit" };
};

// ---- New Zealand ----
const NZB: [number, number][] = [[15600, 0.105], [53500, 0.175], [78100, 0.3], [180000, 0.33], [Infinity, 0.39]];
export const nzLoan: Calc = (v) => {
  const inc = p(v, "i", 70000), bal = p(v, "b", 40000), f = [52, 26, 12][pick(v.f, 3)], ab = pick(v.ab, 2) === 1;
  if (ab) return { yr: "Overseas-based borrowers repay a fixed yearly amount set by IRD from the loan balance, and interest applies", per: "—", time: "—" };
  const yr = Math.max(0, inc - 24128) * 0.12;
  return { yr: `${NZ0(yr)} a year (12% of income over $24,128)`, per: `${money(yr / f, "NZ$", 2)} per ${f === 52 ? "week" : f === 26 ? "fortnight" : "month"}`, time: yr > 0 ? `About ${nfmt(Math.ceil(bal / yr))} years to repay ${NZ0(bal)} (interest-free while you live in NZ)` : "Below the threshold — no compulsory repayments" };
};
export const nzHoliday: Calc = (v) => {
  const ge = p(v, "ge", 65000), owp = p(v, "owp", 1250), wk = p(v, "w", 4), cas = pick(v.c, 2) === 1;
  if (cas) return { pay: `${NZ0(ge * 0.08)} holiday pay (8% of gross earnings)`, how: "Pay-as-you-go for casual or fixed-term work under 12 months", note: "Must be shown separately on payslips" };
  const awe = ge / 52, rate = Math.max(owp, awe);
  return { pay: `${NZ0(rate * wk)} for ${nfmt(wk, 1)} weeks of annual holidays`, how: `Greater of ordinary weekly pay ${NZ0(owp)} or average weekly earnings ${NZ0(awe)} (last 12 months ÷ 52) = ${NZ0(rate)} a week`, note: "4 weeks a year after 12 months · leaving before then: 8% of gross earnings" };
};
export const nzBright: Calc = (v) => {
  const g = num(v.g, 120000), y = p(v, "y", 1.5), mh = pick(v.mh, 2) === 1, oi = p(v, "oi", 90000);
  if (mh) return { res: "Exempt — main home exclusion applies", tax: "—", note: "Must be used as your main home for more than 50% of the time owned" };
  if (y >= 2) return { res: "Outside the bright-line test — held 2 years or more", tax: "No bright-line tax (other land rules can still apply, e.g. if bought to resell)", note: "2-year test applies to sales from 1 July 2024" };
  const t = prog(oi + Math.max(0, g), NZB) - prog(oi, NZB);
  return { res: `Taxable — sold within 2 years (${nfmt(y, 2)} years)`, tax: `≈ ${NZ0(t)} tax on a ${NZ0(g)} gain at your marginal rates`, note: g < 0 ? "Losses can only offset other land sale gains" : "Gain = sale price − purchase cost − costs of buying, selling and improvements" };
};

// ---- Singapore ----
const BSD: [number, number][] = [[180000, 0.01], [360000, 0.02], [1000000, 0.03], [1500000, 0.04], [3000000, 0.05], [Infinity, 0.06]];
export const absd: Calc = (v) => {
  const x = need(p(v, "x", 1500000), "Enter the price or value."), b = pick(v.b, 4), n = pick(v.n, 3);
  const r = b === 0 ? [0, 0.2, 0.3][n] : b === 1 ? [0.05, 0.3, 0.35][n] : b === 2 ? 0.6 : 0.65, a = x * r, bs = prog(x, BSD);
  return { absd: `${S0(a)} ABSD (${pc(r, 0)})`, bsd: `${S0(bs)} buyer's stamp duty · total ${S0(a + bs)}`, note: b === 0 && n === 0 ? "No ABSD for a citizen's first residential property" : "Couples buying a replacement home can claim an ABSD remission if the first home is sold within 6 months" };
};
const SG: [number, number][] = [[20000, 0], [30000, 0.02], [40000, 0.035], [80000, 0.07], [120000, 0.115], [160000, 0.15], [200000, 0.18], [240000, 0.19], [280000, 0.195], [320000, 0.2], [500000, 0.22], [1000000, 0.23], [Infinity, 0.24]];
export const srs: Calc = (v) => {
  const ci = need(p(v, "ci", 120000), "Enter chargeable income."), c = p(v, "c", 15300), f = pick(v.f, 2) === 1, cap = f ? 35700 : 15300, x = Math.min(c, cap), save = prog(ci, SG) - prog(Math.max(0, ci - x), SG);
  return { save: `${S0(save)} tax saved this year`, how: `${S0(x)} SRS contribution (cap ${S0(cap)})${c > cap ? ` · ${S0(c - cap)} over the cap` : ""} · marginal rate ${pc(save / Math.max(x, 1), 1)}`, note: "Only 50% of withdrawals from the statutory retirement age are taxable; spread over 10 years to keep tax low · early withdrawals are fully taxed plus a 5% penalty" };
};

// ---- UK ----
const pa = (inc: number) => Math.max(0, 12570 - Math.max(0, inc - 100000) / 2);
const ukTax = (inc: number) => { const a = pa(inc), t = Math.max(0, inc - a); return Math.min(t, 37700) * 0.2 + Math.max(0, Math.min(t, 125140 - a) - 37700) * 0.4 + Math.max(0, inc - 125140) * 0.45; };
const ukNi = (x: number) => Math.max(0, Math.min(x, 50270) - 12570) * 0.08 + Math.max(0, x - 50270) * 0.02;
export const ukLoan: Calc = (v) => {
  const s = need(p(v, "s", 35000), "Enter your income."), pl = pick(v.pl, 5), pg = pick(v.pg, 2) === 1;
  const th = [26900, 29385, 33795, 25000, 0][pl], ug = pl < 4 ? Math.max(0, s - th) * 0.09 : 0, pgr = pg ? Math.max(0, s - 21000) * 0.06 : 0;
  return { yr: `${L0(ug + pgr)} a year (${L2((ug + pgr) / 12)} a month)`, how: `${pl < 4 ? `Plan ${["1", "2", "4", "5"][pl]}: 9% over ${L0(th)} = ${L0(ug)}` : "No undergraduate plan"}${pg ? ` · Postgraduate: 6% over £21,000 = ${L0(pgr)}` : ""}`, note: "Collected through PAYE or Self Assessment · written off after the plan's term (25–40 years) · 2026/27 thresholds" };
};
export const ukSalSac: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter your salary."), ss = p(v, "ss", 5000), er = pick(v.er, 2) === 1;
  const tax = ukTax(s) - ukTax(s - ss), ni = ukNi(s) - ukNi(s - ss), erNi = Math.max(0, Math.min(ss, s - 5000)) * 0.15;
  return { save: `${L0(tax + ni)} saved — tax ${L0(tax)} + NI ${L0(ni)}`, net: `Take-home falls ${L0(ss - tax - ni)} for ${L0(ss + (er ? erNi : 0))} into your pension${er ? ` (incl. employer's ${L0(erNi)} NI saving)` : ""}`, note: `Pay after sacrifice can't fall below the National Minimum Wage · Budget 2025: NI relief on sacrifice above £2,000 a year ends from April 2029${s > 100000 && s - ss < 100000 ? " · this also restores your personal allowance" : ""}` };
};
export const ukMarriage: Calc = (v) => {
  const lo = p(v, "lo", 10000), hi = p(v, "hi", 40000), scot = pick(v.sc, 2) === 1;
  if (lo > 12570) return { save: "Not eligible — the lower earner must have income under £12,570", how: "—", back: "—" };
  if (hi > 50270) return { save: "Not eligible — the higher earner must be a basic-rate taxpayer", how: "—", back: "—" };
  const sv = 1260 * 0.2;
  return { save: `${L0(sv)} a year saved (£1,260 × 20%)`, how: `Lower earner transfers £1,260 of personal allowance to the partner${scot ? " (Scottish taxpayers: starter, basic or intermediate rate)" : ""}`, back: `Backdate up to 4 years — up to ${L0(sv * 5)} including this year · apply on GOV.UK` };
};
export const ukHicbc: Calc = (v) => {
  const ani = p(v, "ani", 70000), k = Math.max(1, Math.round(p(v, "k", 2)));
  const cb = (27.05 + 17.9 * (k - 1)) * 52, pct = Math.min(1, Math.max(0, Math.floor((ani - 60000) / 200) / 100)), ch = cb * pct;
  return { ch: ch > 0 ? `${L0(ch)} High Income Child Benefit Charge (${pc(pct, 0)} of the benefit)` : "No charge — adjusted net income is £60,000 or less", cb: `Child benefit ${L0(cb)} a year for ${k} child${k > 1 ? "ren" : ""} (£27.05 + £17.90 a week each extra) · you keep ${L0(cb - ch)}`, tip: ani > 60000 ? `Pension contributions or Gift Aid that cut income to £60,000 save the charge${ani >= 80000 ? " · above £80,000 the charge equals the benefit — still claim for NI credits" : ""}` : "Paid via Self Assessment or PAYE by the higher earner" };
};
const BAND = [6, 7, 8, 9, 11, 13, 15, 18];
export const ukCouncil: Calc = (v) => {
  const d = need(p(v, "d", 2280), "Enter your council's Band D charge."), b = pick(v.b, 8), disc = [0, 0.25, 1][pick(v.ds, 3)], inst = [10, 12][pick(v.i, 2)];
  const full = (d * BAND[b]) / 9, due = full * (1 - disc);
  return { yr: `${L0(due)} council tax for 2026/27 (Band ${"ABCDEFGH"[b]})`, inst: `${L2(due / inst)} a month over ${inst} instalments`, how: `Band D ${L0(d)} × ${BAND[b]}/9${disc ? ` − ${disc === 1 ? "100% exemption" : "25% single-person discount"}` : ""} · England ratios; Wales has a Band I and Scotland uses different ratios` };
};
export const ukSmp: Calc = (v) => {
  const awe = need(p(v, "awe", 600), "Enter average weekly earnings."), lel = p(v, "lel", 129), enh = p(v, "enh", 0);
  if (awe < lel) return { tot: "Not eligible for SMP — earnings are below the lower earnings limit (check Maternity Allowance)", how: "—", note: "—" };
  const w6 = awe * 0.9, w33 = Math.min(194.32, awe * 0.9), tot = w6 * 6 + w33 * 33;
  return { tot: `${L0(tot)} total SMP over 39 weeks (before tax and NI)`, how: `Weeks 1–6: ${L2(w6)} a week (90% of earnings) · weeks 7–39: ${L2(w33)} a week (lower of £194.32 or 90%)`, note: enh ? `Your employer's enhanced scheme adds about ${L0(enh)}` : "Must have worked for your employer 26 weeks by the 15th week before the due week · SMP is taxable" };
};
const ct = (pft: number) => (pft <= 50000 ? pft * 0.19 : pft >= 250000 ? pft * 0.25 : pft * 0.25 - (3 / 200) * (250000 - pft));
export const ir35: Calc = (v) => {
  const rate = need(p(v, "r", 500), "Enter your day rate."), d = p(v, "d", 220), exp = p(v, "e", 3000), mg = p(v, "mg", 1100), inside = pick(v.i, 2) === 0;
  const rev = rate * d;
  if (inside) {
    const funds = Math.max(0, rev - mg), g = (funds + 750) / 1.155, empCost = funds - g, net = g - ukTax(g) - ukNi(g);
    return { net: `${L0(net)} take-home a year inside IR35 (${L0(net / 12)} a month)`, how: `${L0(rev)} billed − umbrella margin ${L0(mg)} − employer NI and levy ${L0(empCost)} = gross ${L0(g)}`, cmp: `Income tax ${L0(ukTax(g))} · NI ${L0(ukNi(g))} · ${pc(net / rev, 0)} of billings` };
  }
  const sal = 12570, erNi = (sal - 5000) * 0.15, pft = Math.max(0, rev - exp - sal - erNi), corp = ct(pft), div = pft - corp;
  const db = Math.max(0, div - 500), basicLeft = 37700, dt = Math.min(db, basicLeft) * 0.1075 + Math.max(0, Math.min(db, 125140 - 12570 - 500) - basicLeft) * 0.3575 + Math.max(0, db - (125140 - 12570 - 500)) * 0.3935;
  const net = sal + div - dt;
  return { net: `${L0(net)} take-home a year outside IR35 (${L0(net / 12)} a month)`, how: `${L0(rev)} − expenses ${L0(exp)} − salary ${L0(sal)} − employer NI ${L0(erNi)} = profit ${L0(pft)} → corporation tax ${L0(corp)} → dividends ${L0(div)}`, cmp: `Dividend tax ${L0(dt)} (10.75% / 35.75% / 39.35%, £500 allowance) · ${pc(net / rev, 0)} of billings` };
};
export const ukPoa: Calc = (v) => {
  const l = p(v, "l", 6000), pay = p(v, "pay", 0), paye = p(v, "py", 20) / 100, cur = p(v, "c", 7000);
  if (l < 1000 || paye >= 0.8) return { poa: "No payments on account needed", how: l < 1000 ? "Last year's Self Assessment bill was under £1,000" : "80%+ of your tax was collected at source (PAYE)", due: `Pay the whole bill by 31 January` };
  const poa = l / 2, bal = Math.max(0, cur - l);
  return { poa: `${L0(poa)} each on 31 January and 31 July`, how: `50% of last year's ${L0(l)} bill (excluding capital gains tax and student loan)${pay ? ` · paid so far ${L0(pay)}` : ""}`, due: bal > 0 ? `Balancing payment ${L0(bal)} next 31 January + the first payment on account for the following year` : `If this year's bill will be lower (${L0(cur)}), reduce payments with form SA303` };
};

// ---- registry (generated)
export const ideaFin12CustomCalculators: Record<string, Calc> = {
  "canada-fhsa-growth-calculator": fhsa,
  "canada-resp-grant-calculator": resp,
  "india-old-vs-new-tax-regime-calculator": regime,
  "india-advance-tax-calculator": advanceTax,
  "india-leave-encashment-calculator": leaveEnc,
  "india-ctc-to-in-hand-calculator": ctcInHand,
  "india-home-loan-tax-benefit-calculator": homeLoanTax,
  "new-zealand-student-loan-repayment-calculator": nzLoan,
  "new-zealand-holiday-pay-calculator": nzHoliday,
  "new-zealand-bright-line-test-calculator": nzBright,
  "singapore-absd-calculator": absd,
  "singapore-srs-tax-savings-calculator": srs,
  "uk-student-loan-repayment-calculator": ukLoan,
  "uk-salary-sacrifice-pension-calculator": ukSalSac,
  "uk-marriage-allowance-calculator": ukMarriage,
  "uk-child-benefit-charge-calculator": ukHicbc,
  "uk-council-tax-calculator": ukCouncil,
  "uk-maternity-pay-calculator": ukSmp,
  "uk-ir35-contractor-take-home-calculator": ir35,
  "uk-self-assessment-payment-on-account-calculator": ukPoa,
};
