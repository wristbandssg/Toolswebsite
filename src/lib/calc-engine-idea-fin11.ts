/**
 * Idea build, batch fin11 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Malaysia (9), Pakistan (3), Philippines (8), South Africa (10), Australia (5) tax & salary = 35 tools.
 * Malaysia: resident rates YA2025 (0/1/3/6/11/19/25/26/28/30% at 5k/20k/35k/50k/70k/100k/400k/600k/2M); RM400 rebate ≤ RM35,000;
 *  individual relief RM9,000; EPF 11% + 13% (≤RM5,000) / 12%; SOCSO 0.5% + 1.75% and EIS 0.2% + 0.2% on wages up to RM6,000
 *  (contribution tables round by wage band); service tax 8% (6% F&B), sales tax 5% / 10%; RPGT individuals 30/20/15/0% (citizens),
 *  30% / 10% from year 6 (foreigners); MOT stamp duty 1/2/3/4% bands, foreigners 8% on residential from 1 Jan 2026.
 * Pakistan: sales tax 18%; EOBI employer 5% + employee 1% of the minimum wage (editable).
 * Philippines 2026: SSS 15% of MSC ₱5,000–₱35,000 (5% EE / 10% ER, EC ₱10/₱30); PhilHealth 5% of basic pay ₱10,000–₱100,000, split
 *  50/50; Pag-IBIG 2% each on fund salary up to ₱10,000 (1% EE at ₱1,500 or less); 13th month tax-exempt up to ₱90,000; VAT 12%;
 *  night differential 10% (10pm–6am); separation pay 1 month or ½ month per year; retirement pay 22.5 days per year (RA 7641).
 * South Africa 2026/27 (SARS Budget 2026 tax guide): brackets 245,100/383,100/530,200/695,800/887,000/1,878,600 at 18–45%; rebates
 *  R17,820 / R9,765 / R3,249; medical credits R376 / R376 / R254 a month; UIF 1% + 1% up to R17,712 a month; VAT 15%;
 *  CGT inclusion 40%, annual exclusion R50,000, primary residence R3m; retirement deduction 27.5% capped R430,000; transfer duty 0% to
 *  R1,210,000 then 3/6/8/11/13% (unchanged). BCEA: severance 1 week per completed year; 21 consecutive days' leave a cycle.
 * Australia 2026-27: 0% to $18,200, 15% to $45,000, 30% to $135,000, 37% to $190,000, 45% above, Medicare levy 2%;
 *  concessional cap $32,500; Division 293 above $250,000; NES redundancy table (Fair Work Act s 119).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const RM = (x: number, dp = 2) => money(x, "RM", dp);
const PKR = (x: number) => `Rs ${Math.round(x).toLocaleString("en-PK")}`;
const PHP = (x: number, dp = 2) => money(x, "₱", dp);
const ZAR = (x: number, dp = 0) => money(x, "R", dp);
const AUD = (x: number, dp = 0) => money(x, "A$", dp);
const prog = (x: number, bands: [number, number][]) => { let t = 0, lo = 0; for (const [hi, r] of bands) { if (x > lo) t += (Math.min(x, hi) - lo) * r; lo = hi; } return t; };
const vatSplit = (amt: number, rate: number, incl: boolean) => (incl ? { net: amt / (1 + rate), tax: amt - amt / (1 + rate), gross: amt } : { net: amt, tax: amt * rate, gross: amt * (1 + rate) });

// ---- Malaysia ----
const MY: [number, number][] = [[5000, 0], [20000, 0.01], [35000, 0.03], [50000, 0.06], [70000, 0.11], [100000, 0.19], [400000, 0.25], [600000, 0.26], [2000000, 0.28], [Infinity, 0.3]];
const myTax = (ci: number, zakat = 0) => Math.max(0, prog(ci, MY) - (ci <= 35000 ? 400 : 0) - zakat);
const epfRate = (w: number, age: number) => (age >= 60 ? { ee: 0, er: 0.04 } : { ee: 0.11, er: w <= 5000 ? 0.13 : 0.12 });
export const myPcb: Calc = (v) => {
  const w = need(p(v, "w", 6000), "Enter monthly salary."), b = p(v, "b", 0), mar = pick(v.m, 2) === 1, sw = pick(v.sw, 2) === 1, k = Math.round(p(v, "k", 0)), oth = p(v, "o", 0), z = p(v, "z", 0), age = p(v, "a", 35);
  const yr = w * 12 + b, epf = Math.min(yr * epfRate(w, age).ee, 4000), rel = 9000 + (mar && !sw ? 4000 : 0) + k * 2000 + epf + oth + Math.min(Math.min(w, 6000) * 0.007 * 12, 350);
  const ci = Math.max(0, yr - rel), t = myTax(ci, z * 12);
  return { pcb: `≈ ${RM(t / 12)} PCB a month`, yr: `Annual tax ≈ ${RM(t, 0)} on chargeable income ${RM(ci, 0)} (${pc(yr ? t / yr : 0)} effective)`, rel: `Reliefs used ${RM(rel, 0)}: individual RM9,000${mar && !sw ? " + spouse RM4,000" : ""}${k ? ` + children ${RM(k * 2000, 0)}` : ""} + EPF ${RM(epf, 0)} + SOCSO/EIS${oth ? ` + other ${RM(oth, 0)}` : ""} · LHDN's MTD formula may differ slightly` };
};
export const myEpf: Calc = (v) => {
  const w = need(p(v, "w", 5000), "Enter monthly wages."), age = p(v, "a", 35), fw = pick(v.fw, 2) === 1, vol = p(v, "vol", 0) / 100;
  const r = fw ? { ee: 0.02, er: 0.02 } : epfRate(w, age), ee = w * (r.ee + vol), er = w * r.er, tot = ee + er;
  return { m: `You ${RM(ee)} (${pc(r.ee + vol, 0)}) + employer ${RM(er)} (${pc(r.er, 0)}) = ${RM(tot)} a month`, split: fw ? "Foreign worker rate (2% + 2%, from October 2025)" : `Akaun Persaraan ${RM(tot * 0.75)} · Sejahtera ${RM(tot * 0.15)} · Fleksibel ${RM(tot * 0.1)}`, yr: `${RM(tot * 12, 0)} a year · employee part is tax-deductible up to RM4,000 · official EPF Third Schedule rounds by wage band` };
};
export const mySocso: Calc = (v) => {
  const w = need(p(v, "w", 4000), "Enter monthly wages."), cat = pick(v.c, 2), cap = Math.min(w, 6000);
  const ee = cat === 0 ? cap * 0.005 : 0, er = cat === 0 ? cap * 0.0175 : cap * 0.0125;
  return { m: `Employer ${RM(er)} + you ${RM(ee)} = ${RM(er + ee)} a month`, cat: cat === 0 ? "Category 1 (under 60): Employment Injury + Invalidity schemes" : "Category 2 (60 and over): Employment Injury only, employer pays", note: `${w > 6000 ? "Wages above RM6,000 are capped · " : ""}Amounts are approximate — PERKESO's contribution table uses RM100 wage bands` };
};
export const myEis: Calc = (v) => {
  const w = need(p(v, "w", 4000), "Enter monthly wages."), age = p(v, "a", 35), cap = Math.min(w, 6000);
  if (age >= 60) return { m: "Not required — EIS doesn't apply to employees 60 and over", yr: "—", note: "—" };
  return { m: `${RM(cap * 0.002)} from you + ${RM(cap * 0.002)} from employer a month`, yr: `${RM(cap * 0.004 * 12)} a year total`, note: `EIS 0.2% each on wages up to RM6,000 · pays job-loss benefits for up to 6 months${w > 6000 ? " · capped at RM6,000" : ""}` };
};
export const myRelief: Calc = (v) => {
  const inc = p(v, "inc", 90000), caps: [string, string, number][] = [["epf", "EPF", 4000], ["li", "Life insurance / takaful", 3000], ["med", "Education & medical insurance", 4000], ["life", "Lifestyle", 2500], ["sp", "Sports", 1000], ["mx", "Medical expenses (self, spouse, child)", 10000], ["par", "Parents' medical / care", 8000], ["sspn", "SSPN savings", 8000], ["prs", "PRS / deferred annuity", 3000], ["ed", "Education fees (self)", 7000]];
  let tot = 9000; const used: string[] = [];
  for (const [k, l, c] of caps) { const x = Math.min(p(v, k, 0), c); if (x > 0) { tot += x; used.push(`${l} ${RM(x, 0)}`); } }
  const sp = pick(v.s, 2) === 1 ? 4000 : 0, kids = Math.round(p(v, "k", 0)) * 2000; tot += sp + kids;
  const t0 = myTax(Math.max(0, inc - 9000)), t1 = myTax(Math.max(0, inc - tot));
  return { tot: `${RM(tot, 0)} total reliefs`, save: `Tax ${RM(t1, 0)} vs ${RM(t0, 0)} with the individual relief only — saves ${RM(t0 - t1, 0)}`, used: `Individual RM9,000${sp ? " · spouse RM4,000" : ""}${kids ? ` · children ${RM(kids, 0)}` : ""}${used.length ? " · " + used.join(" · ") : ""} (each capped at its YA2025 limit)` };
};
export const mySst: Calc = (v) => {
  const a = need(p(v, "a", 100), "Enter the amount."), r = [0.08, 0.06, 0.05, 0.1][pick(v.t, 4)], inc = pick(v.inc, 2) === 1, s = vatSplit(a, r, inc);
  return { tax: `${RM(s.tax)} SST at ${pc(r, 0)}`, tot: `${RM(s.net)} before tax → ${RM(s.gross)} with tax`, note: "Service tax 8% (6% for F&B, telecoms, parking, logistics and some rentals); sales tax 5% or 10% on goods; some essentials are exempt" };
};
export const myRpgt: Calc = (v) => {
  const sp = p(v, "sp", 800000), pp = p(v, "pp", 500000), cst = p(v, "c", 30000), y = p(v, "y", 4), cit = pick(v.ct, 2) === 0;
  const gain = sp - pp - cst;
  if (gain <= 0) return { t: "No RPGT — there's no gain", rate: "—", net: "—" };
  const r = cit ? (y <= 3 ? 0.3 : y <= 4 ? 0.2 : y <= 5 ? 0.15 : 0) : y <= 5 ? 0.3 : 0.1, ex = cit ? Math.max(10000, gain * 0.1) : 0, tg = Math.max(0, gain - ex), t = tg * r;
  return { t: `${RM(t, 0)} RPGT`, rate: `${pc(r, 0)} for disposal in year ${Math.ceil(y)} on ${RM(tg, 0)} chargeable gain${ex ? ` (after ${RM(ex, 0)} exemption)` : ""}`, net: `Net gain ${RM(gain - t, 0)} · buyer withholds 3% of the price (7% for foreigners) — file CKHT within 60 days · citizens get one lifetime home exemption` };
};
export const myStamp: Calc = (v) => {
  const x = need(p(v, "x", 600000), "Enter the price or market value."), f = pick(v.f, 2) === 1, ft = pick(v.ft, 2) === 1, ln = p(v, "ln", 540000);
  let mot = f ? x * 0.08 : prog(x, [[100000, 0.01], [500000, 0.02], [1000000, 0.03], [Infinity, 0.04]]), loan = ln * 0.005;
  if (ft && !f && x <= 500000) { mot = 0; loan = 0; }
  return { mot: `${RM(mot, 0)} stamp duty on the transfer (MOT)`, loan: `${RM(loan, 0)} on the loan agreement (0.5%) · total ${RM(mot + loan, 0)}`, note: ft && !f && x <= 500000 ? "First-home exemption: 100% off for homes up to RM500,000 (citizens, to end-2027)" : f ? "Foreign buyers pay a flat 8% on residential property from 1 Jan 2026" : "1% first RM100,000 · 2% to RM500,000 · 3% to RM1M · 4% above" };
};
export const myZakat: Calc = (v) => {
  const inc = p(v, "inc", 72000), g = p(v, "g", 500), meth = pick(v.m, 2), hk = p(v, "hk", 30000), epf = p(v, "epf", 7920);
  const nisab = 85 * g, base = meth === 0 ? inc : Math.max(0, inc - hk - epf), z = base >= nisab ? base * 0.025 : 0;
  return { z: z ? `${RM(z)} zakat pendapatan a year (${RM(z / 12)} a month)` : `No zakat due — ${RM(base, 0)} is under the nisab of ${RM(nisab, 0)}`, nisab: `Nisab = 85 g of gold × ${RM(g, 0)}/g = ${RM(nisab, 0)} · method: ${meth === 0 ? "gross income (without deductions)" : "net income after had kifayah and EPF"}`, tax: `Zakat paid to an approved state council is a 100% tax rebate — cuts your income tax by ${RM(z, 0)} (up to your tax)` };
};

// ---- Pakistan ----
export const pkGst: Calc = (v) => {
  const a = need(p(v, "a", 10000), "Enter the amount."), r = p(v, "r", 18) / 100, inc = pick(v.inc, 2) === 1, s = vatSplit(a, r, inc);
  return { tax: `${PKR(s.tax)} sales tax at ${pc(r, 0)}`, tot: `${PKR(s.net)} excluding tax → ${PKR(s.gross)} including tax`, note: "Standard federal sales tax on goods is 18%; provinces charge their own sales tax on services (commonly 15–16%) — enter the rate that applies" };
};
export const pkGratuity: Calc = (v) => {
  const s = need(p(v, "s", 120000), "Enter last drawn monthly basic salary."), y = p(v, "y", 7.5), d = p(v, "d", 30), round = pick(v.r, 2) === 0;
  const yrs = round ? Math.floor(y) + (y - Math.floor(y) >= 0.5 ? 1 : 0) : y, g = (s / 30) * d * yrs;
  return { g: `${PKR(g)} gratuity`, how: `${PKR(s)} ÷ 30 × ${nfmt(d)} days × ${nfmt(yrs, 2)} years${round ? " (part year of 6+ months counts as a full year)" : ""}`, note: "Standing Orders: 30 days' wages per completed year for permanent workmen where no provident fund exists · check your contract or company scheme" };
};
export const pkEobi: Calc = (v) => {
  const mw = need(p(v, "mw", 40000), "Enter the minimum wage."), n = Math.max(1, Math.round(p(v, "n", 1)));
  const er = mw * 0.05, ee = mw * 0.01;
  return { m: `${PKR(er)} employer + ${PKR(ee)} employee = ${PKR(er + ee)} a month per worker`, tot: `${PKR((er + ee) * n)} a month for ${n} worker${n > 1 ? "s" : ""} · ${PKR((er + ee) * n * 12)} a year`, note: "EOBI is calculated on the notified minimum wage, not actual pay — enter the current federal/provincial figure" };
};

// ---- Philippines ----
export const phSss: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter monthly compensation."), se = pick(v.t, 2) === 1;
  const msc = Math.min(35000, Math.max(5000, Math.round(w / 500) * 500)), ee = msc * 0.05, er = msc * 0.1, ec = msc < 15000 ? 10 : 30;
  return { m: se ? `${PHP(msc * 0.15)} a month (self-employed pays the full 15%)` : `You ${PHP(ee)} + employer ${PHP(er + ec)} (incl. ${PHP(ec)} EC) = ${PHP(ee + er + ec)}`, msc: `Monthly salary credit ${PHP(msc, 0)} (₱5,000–₱35,000)${msc > 20000 ? ` · ${PHP((msc - 20000) * 0.15)} goes to the WISP provident fund` : ""}`, note: "2025–2026 rate 15% (5% employee / 10% employer)" };
};
export const phPhilhealth: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter monthly basic salary."), base = Math.min(100000, Math.max(10000, w)), prem = base * 0.05;
  return { m: `${PHP(prem)} monthly premium — ${PHP(prem / 2)} you + ${PHP(prem / 2)} employer`, base: `5% of ${PHP(base, 0)} (floor ₱10,000, ceiling ₱100,000)`, yr: `${PHP(prem * 12)} a year · self-employed and voluntary members pay the full 5%` };
};
export const phPagibig: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter monthly compensation."), fs = Math.min(w, 10000), ee = fs * (w <= 1500 ? 0.01 : 0.02), er = fs * 0.02, extra = p(v, "x", 0);
  return { m: `You ${PHP(ee + extra)} + employer ${PHP(er)} = ${PHP(ee + er + extra)} a month`, base: `2% of fund salary ${PHP(fs, 0)} (capped at ₱10,000)${extra ? ` + ${PHP(extra)} voluntary` : ""}`, yr: `${PHP((ee + er + extra) * 12)} a year into your Pag-IBIG savings · MP2 voluntary savings earn separate dividends` };
};
export const ph13th: Calc = (v) => {
  const b = need(p(v, "b", 20000), "Enter monthly basic salary."), m = Math.min(12, p(v, "m", 12)), ub = p(v, "u", 0), oth = p(v, "o", 0);
  const pay = (b * m - ub) / 12, exempt = Math.max(0, 90000 - oth), tx = Math.max(0, pay - exempt);
  return { pay: `${PHP(pay)} 13th month pay`, how: `Basic salary earned in the year ${PHP(b * m - ub, 0)} ÷ 12${ub ? " (after unpaid absences)" : ""}`, tax: tx > 0 ? `${PHP(tx)} is taxable — 13th month + other bonuses above ₱90,000` : "Fully tax-exempt (13th month + other benefits up to ₱90,000) · due on or before 24 December" };
};
export const phVat: Calc = (v) => {
  const a = need(p(v, "a", 1120), "Enter the amount."), inc = pick(v.inc, 2) === 1, s = vatSplit(a, 0.12, inc);
  return { tax: `${PHP(s.tax)} VAT (12%)`, tot: `${PHP(s.net)} VAT-exclusive → ${PHP(s.gross)} VAT-inclusive`, note: "Seniors and PWDs are VAT-exempt plus 20% off on qualifying purchases · businesses under ₱3M sales can choose 3% percentage tax instead" };
};
export const phNight: Calc = (v) => {
  const d = need(p(v, "d", 645), "Enter your daily rate."), h = p(v, "h", 8), nh = Math.min(h, p(v, "nh", 6)), days = p(v, "n", 22), ot = p(v, "ot", 0), hol = pick(v.hd, 3);
  const hr = d / 8, mult = [1, 1.3, 2][hol], nd = hr * mult * 0.1 * nh, otnd = hr * mult * 1.25 * 0.1 * ot;
  return { nd: `${PHP(nd + otnd)} night differential per night`, how: `10% × ${PHP(hr * mult)} hourly rate × ${nfmt(nh, 1)} hours between 10pm and 6am${ot ? ` + overtime night hours at 125%` : ""}${hol ? ` (${["", "special day 130%", "regular holiday 200%"][hol]})` : ""}`, mo: `${PHP((nd + otnd) * days)} a month over ${nfmt(days)} nights · Labor Code Art. 86` };
};
export const phSeparation: Calc = (v) => {
  const s = need(p(v, "s", 25000), "Enter monthly salary."), y = p(v, "y", 6.6), c = pick(v.c, 2);
  const yrs = Math.floor(y) + (y - Math.floor(y) >= 0.5 ? 1 : 0), pay = c === 0 ? Math.max(s, s * yrs) : Math.max(s, (s / 2) * yrs);
  return { pay: `${PHP(pay)} separation pay`, how: `${c === 0 ? "1 month" : "½ month"} × ${nfmt(yrs)} years (6+ months counts as a year), minimum 1 month`, note: c === 0 ? "Redundancy or labor-saving devices (Labor Code Art. 298)" : "Retrenchment, closure not due to losses, or disease (Art. 298–299)" };
};
export const phRetirement: Calc = (v) => {
  const d = need(p(v, "d", 900), "Enter your daily rate."), y = p(v, "y", 20.4), age = p(v, "a", 60), cola = p(v, "cola", 0);
  if (age < 60 || y < 5) return { pay: "Not eligible under RA 7641 — needs age 60–65 and at least 5 years of service", how: "—", note: "Check your company plan, which may be more generous" };
  const yrs = Math.floor(y) + (y - Math.floor(y) >= 0.5 ? 1 : 0), pay = 22.5 * (d + cola) * yrs;
  return { pay: `${PHP(pay)} retirement pay`, how: `22.5 days × ${PHP(d + cola)} × ${nfmt(yrs)} years (15 days + 1/12 of 13th month + 5 days service incentive leave)`, note: "Tax-exempt if you're 50+, served 10+ years under a BIR-approved plan, or under RA 7641 · underground miners can retire at 50" };
};

// ---- South Africa ----
const ZA: [number, number][] = [[245100, 0.18], [383100, 0.26], [530200, 0.31], [695800, 0.36], [887000, 0.39], [1878600, 0.41], [Infinity, 0.45]];
const zaTax = (ti: number, age: number) => Math.max(0, prog(ti, ZA) - 17820 - (age >= 65 ? 9765 : 0) - (age >= 75 ? 3249 : 0));
const zaMarg = (ti: number) => ZA.find(([hi]) => ti <= hi)![1];
export const zaUif: Calc = (v) => {
  const w = need(p(v, "w", 25000), "Enter monthly remuneration."), b = Math.min(w, 17712);
  return { m: `${ZAR(b * 0.01, 2)} you + ${ZAR(b * 0.01, 2)} employer = ${ZAR(b * 0.02, 2)} a month`, cap: w > 17712 ? "Capped at R17,712 a month (max R177.12 each)" : "1% each of remuneration", note: "Benefits: unemployment, illness, maternity, parental and adoption · domestic workers included" };
};
export const zaVat: Calc = (v) => {
  const a = need(p(v, "a", 1150), "Enter the amount."), inc = pick(v.inc, 2) === 1, s = vatSplit(a, 0.15, inc);
  return { tax: `${ZAR(s.tax, 2)} VAT (15%)`, tot: `${ZAR(s.net, 2)} excl. VAT → ${ZAR(s.gross, 2)} incl. VAT`, note: "Basic foods (brown bread, maize meal, rice, eggs, milk, etc.) are zero-rated · businesses must register above R1 million turnover" };
};
export const zaTransfer: Calc = (v) => {
  const x = need(p(v, "x", 2500000), "Enter the purchase price."), d = prog(x, [[1210000, 0], [1663800, 0.03], [2329300, 0.06], [2994800, 0.08], [13310000, 0.11], [Infinity, 0.13]]);
  return { d: `${ZAR(d)} transfer duty`, rate: `Effective ${pc(d / x, 2)} on ${ZAR(x)}`, note: "No transfer duty up to R1,210,000 · not payable when VAT applies (new home from a VAT-registered developer) · add conveyancing and bond registration fees" };
};
export const zaCgt: Calc = (v) => {
  const g = num(v.g, 300000), oi = p(v, "oi", 450000), age = p(v, "a", 40), pr = pick(v.pr, 2) === 1;
  const ex = pr ? 3000000 : 0, net = Math.max(0, g - ex - 50000), inc = net * 0.4, t = zaTax(oi + inc, age) - zaTax(oi, age);
  return { t: `${ZAR(t)} capital gains tax`, how: `${ZAR(g)} gain − ${pr ? "R3m primary residence exclusion − " : ""}R50,000 annual exclusion = ${ZAR(net)} × 40% inclusion = ${ZAR(inc)} taxed at your marginal rate`, eff: `Effective ${pc(g > 0 ? t / g : 0, 1)} of the gain (max 18% for individuals)` };
};
export const zaRa: Calc = (v) => {
  const r = p(v, "r", 600000), c = p(v, "c", 120000), age = p(v, "a", 40), cap = Math.min(0.275 * r, 430000), d = Math.min(c, cap);
  const t0 = zaTax(r, age), t1 = zaTax(r - d, age);
  return { save: `${ZAR(t0 - t1)} tax saved a year`, d: `${ZAR(d)} deductible (27.5% of income, max R430,000 from 2026/27)${c > cap ? ` · ${ZAR(c - cap)} carries forward` : ""}`, net: `Net cost of contributing ${ZAR(c - (t0 - t1))} · marginal rate ${pc(zaMarg(r), 0)}` };
};
export const zaProvisional: Calc = (v) => {
  const ti = p(v, "ti", 650000), age = p(v, "a", 45), md = Math.round(p(v, "md", 1)), paye = p(v, "paye", 60000), per = pick(v.pd, 2);
  const mtc = (md >= 1 ? 376 : 0) + (md >= 2 ? 376 : 0) + Math.max(0, md - 2) * 254, liab = Math.max(0, zaTax(ti, age) - mtc * 12), due = per === 0 ? Math.max(0, liab / 2 - paye / 2) : Math.max(0, liab - paye);
  return { due: `${ZAR(due)} ${per === 0 ? "first payment (end of August)" : "second payment (end of February)"}`, liab: `Estimated 2026/27 tax ${ZAR(liab)} after medical credits ${ZAR(mtc * 12)} · PAYE ${ZAR(paye)}`, note: "Second payment estimates under R1m must be within 90% of actual taxable income (or the basic amount) to avoid the 20% underestimation penalty" };
};
export const zaBond: Calc = (v) => {
  const pr = need(p(v, "pr", 1500000), "Enter the purchase price."), dep = p(v, "dep", 150000), r = p(v, "r", 10.5) / 1200, y = Math.max(1, p(v, "y", 20)), inc = p(v, "inc", 0);
  const L = pr - dep, n = y * 12, pmt = r === 0 ? L / n : (L * r) / (1 - Math.pow(1 + r, -n));
  return { pmt: `${ZAR(pmt, 2)} a month`, tot: `Loan ${ZAR(L)} · total repaid ${ZAR(pmt * n)} · interest ${ZAR(pmt * n - L)}`, aff: inc > 0 ? `${pc(pmt / inc, 0)} of gross income — banks usually cap repayments near 30%` : `Banks typically want gross income of about ${ZAR(pmt / 0.3)} a month` };
};
export const zaSeverance: Calc = (v) => {
  const w = need(p(v, "w", 6000), "Enter weekly remuneration."), y = Math.floor(p(v, "y", 8));
  return { pay: `${ZAR(w * y)} minimum severance pay`, how: `1 week × ${y} completed years (BCEA section 41)`, note: "Due on dismissal for operational requirements (retrenchment) · first R550,000 of severance benefits is taxed at retirement lump-sum rates" };
};
export const zaLeave: Calc = (v) => {
  const m = need(p(v, "m", 20000), "Enter monthly salary."), dw = Math.max(1, Math.min(7, p(v, "dw", 5))), acc = p(v, "acc", 15), tk = p(v, "t", 5);
  const daily = (m * 12) / 52 / dw, owed = Math.max(0, acc - tk);
  return { pay: `${ZAR(owed * daily, 2)} leave pay for ${nfmt(owed, 1)} unused days`, daily: `Daily rate ${ZAR(daily, 2)} (monthly × 12 ÷ 52 ÷ ${nfmt(dw)} days a week)`, note: `Annual leave: 21 consecutive days per cycle = ${nfmt(dw === 5 ? 15 : dw === 6 ? 18 : dw * 3, 0)} working days (or 1 day per 17 worked) · unused leave must be paid out when employment ends` };
};
export const zaMedical: Calc = (v) => {
  const md = Math.max(1, Math.round(p(v, "md", 2))), cont = p(v, "c", 60000), oop = p(v, "oop", 15000), ti = p(v, "ti", 500000), age = p(v, "a", 45), dis = pick(v.d, 2) === 1;
  const mtc = (376 + (md >= 2 ? 376 : 0) + Math.max(0, md - 2) * 254) * 12;
  const excess = Math.max(0, cont - 4 * mtc);
  const amtc = age >= 65 || dis ? 0.333 * (excess + oop) : 0.25 * Math.max(0, excess + oop - 0.075 * ti);
  return { mtc: `${ZAR(mtc)} medical scheme fees tax credit a year (${ZAR(mtc / 12)} a month)`, amtc: `${ZAR(amtc)} additional medical expenses tax credit`, tot: `Total ${ZAR(mtc + amtc)} off your tax · ${age >= 65 || dis ? "65+/disability: 33.3% of excess contributions + out-of-pocket" : "under 65: 25% of the amount above 7.5% of taxable income"}` };
};

// ---- Australia ----
const AU: [number, number][] = [[18200, 0], [45000, 0.15], [135000, 0.3], [190000, 0.37], [Infinity, 0.45]];
const lito = (x: number) => (x <= 37500 ? 700 : x <= 45000 ? 700 - (x - 37500) * 0.05 : x <= 66667 ? Math.max(0, 325 - (x - 45000) * 0.015) : 0);
const auTax = (x: number) => Math.max(0, prog(x, AU) - lito(x)) + (x > 27222 ? x * 0.02 : 0);
const auMarg = (x: number) => AU.find(([hi]) => x <= hi)![1];
export const auNegGear: Calc = (v) => {
  const s = need(p(v, "s", 110000), "Enter your taxable salary."), rent = p(v, "r", 28600), int = p(v, "i", 36000), ex = p(v, "e", 9000), dep = p(v, "d", 6000);
  const loss = rent - int - ex - dep, t0 = auTax(s), t1 = auTax(Math.max(0, s + loss));
  return { res: loss < 0 ? `${AUD(-loss)} rental loss — tax refund ≈ ${AUD(t0 - t1)}` : `${AUD(loss)} rental profit — extra tax ≈ ${AUD(t1 - t0)}`, cash: `After-tax cost of holding ${AUD(Math.max(0, -(rent - int - ex) - (t0 - t1)))} a year (depreciation is a non-cash deduction)`, note: `Marginal rate ${pc(auMarg(s), 0)} + 2% Medicare · losses offset salary; you still need capital growth to come out ahead` };
};
export const auSalSac: Calc = (v) => {
  const s = need(p(v, "s", 100000), "Enter your salary."), ss = p(v, "ss", 10000), sg = p(v, "sg", 12) / 100, carry = p(v, "cf", 0);
  const cc = s * sg + ss, cap = 32500 + carry, t0 = auTax(s), t1 = auTax(s - ss), saved = t0 - t1 - ss * 0.15;
  return { save: `${AUD(saved)} saved a year vs taking it as pay`, pay: `Take-home falls ${AUD(ss - (t0 - t1))} but super gains ${AUD(ss * 0.85)} after 15% contributions tax`, cap: `Concessional contributions ${AUD(cc)} vs the ${AUD(cap)} cap (2026-27: $32,500${carry ? " + unused carry-forward" : ""})${cc > cap ? " — over the cap, excess taxed at your marginal rate" : ""}` };
};
const LSL: Record<number, [string, number, number, number]> = { 0: ["NSW", 10, 8.6667, 5], 1: ["VIC", 7, 6.0667, 7], 2: ["QLD", 10, 8.6667, 7], 3: ["WA", 10, 8.6667, 7], 4: ["SA", 10, 13, 7], 5: ["TAS", 10, 8.6667, 7], 6: ["ACT", 7, 6.0667, 5], 7: ["NT", 10, 13, 7] };
export const auLsl: Calc = (v) => {
  const st = pick(v.st, 8), y = p(v, "y", 10), wk = need(p(v, "w", 1800), "Enter your ordinary weekly pay."), [nm, full, wks, pr] = LSL[st];
  const rate = wks / full, ent = y >= full ? y * rate : y >= pr ? y * rate : 0;
  return { ent: ent > 0 ? `${nfmt(ent, 2)} weeks long service leave (${nfmt(ent * 5, 1)} working days)` : `Not yet — ${nm} gives pro-rata leave from ${pr} years (full entitlement at ${full})`, pay: `${AUD(ent * wk)} at ${AUD(wk)} a week`, note: `${nm}: ${nfmt(wks, 2)} weeks after ${full} years${y < full && y >= pr ? " · pro-rata usually only on certain terminations — check your state Act" : ""}` };
};
const RED: [number, number][] = [[1, 0], [2, 4], [3, 6], [4, 7], [5, 8], [6, 10], [7, 11], [8, 13], [9, 14], [10, 16], [Infinity, 12]];
export const auRedundancy: Calc = (v) => {
  const y = p(v, "y", 6), wk = need(p(v, "w", 1700), "Enter base weekly pay."), small = pick(v.sm, 2) === 1, wksD = p(v, "nd", 0);
  if (small) return { pay: "No NES redundancy pay — small business employer (fewer than 15 employees)", how: "—", tax: "—" };
  const w = RED.find(([hi]) => y < hi)![1], pay = w * wk;
  return { pay: `${AUD(pay)} redundancy pay (${w} weeks)`, how: `${w} weeks × ${AUD(wk)} for ${nfmt(y, 1)} years of service (Fair Work Act s 119)${wksD ? " + notice period" : ""}`, tax: "Genuine redundancy: a tax-free base amount plus an amount per completed year (indexed each July — see the ATO) applies; the rest is taxed as an employment termination payment" };
};
export const auDiv293: Calc = (v) => {
  const ti = p(v, "ti", 240000), cc = p(v, "cc", 32500), rfb = p(v, "rfb", 0), nil = p(v, "nil", 0);
  const inc = ti + rfb + nil + cc, over = Math.max(0, inc - 250000), base = Math.min(cc, over), t = base * 0.15;
  return { t: t > 0 ? `${AUD(t)} Division 293 tax` : "No Division 293 tax — income for Div 293 is $250,000 or less", how: `Div 293 income ${AUD(inc)} (taxable income + concessional contributions${rfb + nil ? " + fringe benefits + investment losses" : ""}) · 15% × ${AUD(base)}`, note: "Effectively taxes concessional contributions at 30% instead of 15% · you can pay the ATO notice from super via a release authority" };
};

// ---- registry (generated)
export const ideaFin11CustomCalculators: Record<string, Calc> = {
  "malaysia-pcb-monthly-tax-deduction-calculator": myPcb,
  "malaysia-epf-contribution-calculator": myEpf,
  "malaysia-socso-contribution-calculator": mySocso,
  "malaysia-eis-contribution-calculator": myEis,
  "malaysia-tax-relief-calculator": myRelief,
  "malaysia-sst-calculator": mySst,
  "malaysia-real-property-gains-tax-calculator": myRpgt,
  "malaysia-stamp-duty-property-calculator": myStamp,
  "malaysia-zakat-pendapatan-calculator": myZakat,
  "pakistan-sales-tax-gst-calculator": pkGst,
  "pakistan-gratuity-calculator": pkGratuity,
  "pakistan-eobi-contribution-calculator": pkEobi,
  "philippines-sss-contribution-calculator": phSss,
  "philippines-philhealth-contribution-calculator": phPhilhealth,
  "philippines-pag-ibig-contribution-calculator": phPagibig,
  "philippines-13th-month-pay-calculator": ph13th,
  "philippines-vat-calculator": phVat,
  "philippines-night-differential-calculator": phNight,
  "philippines-separation-pay-calculator": phSeparation,
  "philippines-retirement-pay-calculator": phRetirement,
  "south-africa-uif-contribution-calculator": zaUif,
  "south-africa-vat-calculator": zaVat,
  "south-africa-transfer-duty-calculator": zaTransfer,
  "south-africa-capital-gains-tax-calculator": zaCgt,
  "south-africa-retirement-annuity-tax-saving-calculator": zaRa,
  "south-africa-provisional-tax-calculator": zaProvisional,
  "south-africa-bond-repayment-calculator": zaBond,
  "south-africa-severance-pay-calculator": zaSeverance,
  "south-africa-leave-pay-calculator": zaLeave,
  "south-africa-medical-tax-credit-calculator": zaMedical,
  "australia-negative-gearing-calculator": auNegGear,
  "australia-salary-sacrifice-super-calculator": auSalSac,
  "australia-long-service-leave-calculator": auLsl,
  "australia-redundancy-pay-calculator": auRedundancy,
  "australia-division-293-tax-calculator": auDiv293,
};
