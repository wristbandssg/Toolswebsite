/**
 * Idea build, batch fin13 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Finance > Middle East / GCC tax & salary = 12 tools.
 * UAE: VAT 5%; corporate tax 0% to AED 375,000, 9% above; Small Business Relief for revenue ≤ AED 3M (tax periods ending by
 *  31 Dec 2026); ILOE unemployment insurance AED 5/month (basic ≤ AED 16,000) or AED 10; GPSSA pension for UAE nationals
 *  (federal: employee 11%, employer 12.5% incl. government share — editable); annual leave 30 days after 1 year, 2 days a month
 *  between 6 and 12 months (Decree-Law 33/2021).
 * Dubai: DLD transfer fee 4% + AED 580 admin (AED 430 land); trustee fee AED 4,000 + 5% VAT (≥ AED 500,000) or AED 2,000 + VAT;
 *  mortgage registration 0.25% + AED 290. RERA rent increase (Decree 43/2013): up to 10% below index 0%, 11–20% → 5%,
 *  21–30% → 10%, 31–40% → 15%, over 40% → 20%.
 * Saudi Arabia: VAT 15%; zakat 2.5% of the zakat base (2.5778% for a Gregorian year).
 * End of service: Qatar ≥ 3 weeks' basic wage per year (after 1 year); Kuwait 15 days' pay for each of the first 5 years, 1 month
 *  after, capped at 18 months, resignation ½ (3–5 yrs) / ⅔ (5–10) / full (10+); Oman 1 month's basic wage per year (Labour Law
 *  53/2023); Bahrain ½ month per year for the first 3 years, 1 month after (basic + social allowance).
 */

import { type TrvCalculator as Calc, InputError, num, pick, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const cur = (code: string, dp = 0) => (x: number) => `${code} ${x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const AED = cur("AED"), AED2 = cur("AED", 2), SAR2 = cur("SAR", 2), SAR = cur("SAR"), QAR = cur("QAR"), KWD = cur("KWD", 3), OMR = cur("OMR", 3), BHD = cur("BHD", 3);
const vat = (a: number, r: number, inc: boolean) => (inc ? { net: a / (1 + r), tax: a - a / (1 + r), gross: a } : { net: a, tax: a * r, gross: a * (1 + r) });
const yrs = (v: Record<string, number>, k: string, d: number) => p(v, k, d);

export const uaeVat: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter the amount."), s = vat(a, 0.05, pick(v.inc, 2) === 1);
  return { tax: `${AED2(s.tax)} VAT (5%)`, tot: `${AED2(s.net)} excl. VAT → ${AED2(s.gross)} incl. VAT`, note: "Registration is mandatory above AED 375,000 of taxable supplies (voluntary from AED 187,500) · some education, healthcare and exports are zero-rated" };
};
export const uaeCt: Calc = (v) => {
  const ti = p(v, "ti", 1200000), rev = p(v, "rev", 5000000), sbr = pick(v.sbr, 2) === 1, fz = pick(v.fz, 2) === 1;
  if (fz) return { t: "0% on qualifying income for a Qualifying Free Zone Person (9% on non-qualifying income)", how: "Must meet substance, audit and de minimis conditions", note: "—" };
  if (sbr && rev <= 3000000) return { t: "AED 0 — Small Business Relief elected", how: `Revenue ${AED(rev)} is within AED 3,000,000`, note: "Available for tax periods ending on or before 31 December 2026; you must still register and file" };
  const t = Math.max(0, ti - 375000) * 0.09;
  return { t: `${AED(t)} corporate tax`, how: `0% on the first AED 375,000 + 9% on ${AED(Math.max(0, ti - 375000))} · effective ${pc(ti ? t / ti : 0, 2)}`, note: `${sbr && rev > 3000000 ? "Not eligible for Small Business Relief (revenue over AED 3M) · " : ""}Large multinationals (€750M+ revenue) pay a 15% domestic minimum top-up tax` };
};
export const uaeNet: Calc = (v) => {
  const b = need(p(v, "b", 12000), "Enter basic salary."), al = p(v, "al", 8000), nat = pick(v.n, 2) === 1, pe = p(v, "pe", 11) / 100, oth = p(v, "o", 0);
  const gross = b + al, pen = nat ? (b + al) * pe : 0, iloe = (b <= 16000 ? 5 : 10), net = gross - pen - iloe - oth;
  return { net: `${AED(net)} take-home a month (${AED(net * 12)} a year)`, ded: `${nat ? `Pension (GPSSA) ${AED(pen)} · ` : ""}ILOE unemployment insurance ${AED(iloe)}${oth ? ` · other ${AED(oth)}` : ""} · no personal income tax`, note: nat ? "Pension rate and salary base differ for Abu Dhabi nationals and other GCC nationals — enter your rate" : "Expats pay no pension in the UAE; end-of-service gratuity is paid on leaving" };
};
export const uaeLeave: Calc = (v) => {
  const b = need(p(v, "b", 10000), "Enter basic monthly salary."), tot = p(v, "tot", 15000), m = p(v, "m", 18), taken = p(v, "t", 0), enc = pick(v.e, 2) === 1;
  const ent = m < 6 ? 0 : m < 12 ? Math.floor(m) * 2 : 30, left = Math.max(0, ent - taken), day = (enc ? b : tot) / 30;
  return { ent: m < 6 ? "No paid annual leave yet — earned after 6 months" : `${nfmt(ent)} days annual leave for this year`, pay: `${AED(day * left)} for ${nfmt(left)} days (${AED2(day)} a day on ${enc ? "basic salary" : "full salary"})`, note: enc ? "Unused leave paid out on leaving is based on basic salary (Decree-Law 33/2021, Article 29)" : "Leave salary while on holiday is paid on full wage (basic + allowances) before the leave starts" };
};
export const dldFee: Calc = (v) => {
  const x = need(p(v, "x", 2000000), "Enter the purchase price."), land = pick(v.l, 2) === 1, ln = p(v, "ln", 1500000), ag = p(v, "ag", 2) / 100;
  const dld = x * 0.04, admin = land ? 430 : 580, tr = (x >= 500000 ? 4000 : 2000) * 1.05, mort = ln > 0 ? ln * 0.0025 + 290 : 0, agent = x * ag * 1.05, tot = dld + admin + tr + mort + agent;
  return { tot: `${AED(tot)} total buying costs (${pc(tot / x, 2)} of price)`, parts: `DLD transfer 4% ${AED(dld)} · admin ${AED(admin)} · trustee office ${AED(tr)} incl. VAT${mort ? ` · mortgage registration ${AED(mort)}` : ""}${agent ? ` · agent ${AED(agent)} incl. VAT` : ""}`, note: "Off-plan purchases pay the 4% to the Oqood register instead · check current fees with the Dubai Land Department" };
};
export const dubaiRent: Calc = (v) => {
  const c = need(p(v, "c", 90000), "Enter your current annual rent."), idx = need(p(v, "i", 110000), "Enter the RERA index average rent.");
  const gap = 1 - c / idx, r = gap <= 0.1 ? 0 : gap <= 0.2 ? 0.05 : gap <= 0.3 ? 0.1 : gap <= 0.4 ? 0.15 : 0.2;
  return { r: r ? `Up to ${pc(r, 0)} increase allowed — new rent up to ${AED(c * (1 + r))}` : "No increase allowed", gap: `Your rent is ${pc(Math.max(gap, 0), 1)} ${gap >= 0 ? "below" : "above"} the index average of ${AED(idx)}`, note: "Landlords must give 90 days' written notice before renewal · check the official DLD Rental Index for your area" };
};
export const ksaVat: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter the amount."), s = vat(a, 0.15, pick(v.inc, 2) === 1);
  return { tax: `${SAR2(s.tax)} VAT (15%)`, tot: `${SAR2(s.net)} excl. VAT → ${SAR2(s.gross)} incl. VAT`, note: "Mandatory registration above SAR 375,000 of annual taxable supplies · e-invoicing (Fatoora) applies" };
};
export const ksaZakat: Calc = (v) => {
  const eq = p(v, "eq", 5000000), ll = p(v, "ll", 2000000), np = num(v.np, 900000), fa = p(v, "fa", 4500000), inv = p(v, "inv", 500000), greg = pick(v.g, 2) === 0;
  const base0 = eq + ll + Math.max(0, np) - fa - inv, base = Math.max(base0, Math.max(0, np)), rate = greg ? 0.025 * (365 / 354) : 0.025, z = base * rate;
  return { z: `${SAR(z)} zakat`, base: `Zakat base ${SAR(base)} (equity + long-term liabilities + net profit − fixed assets − long-term investments; not less than adjusted net profit)`, rate: `Rate ${pc(rate, 4)} (${greg ? "Gregorian year" : "Hijri year"}) · simplified — ZATCA's rules have many specific additions and deductions` };
};
const qGrat = (b: number, y: number) => (y < 1 ? 0 : (b * 12 / 52) * 3 * y);
export const qatarEos: Calc = (v) => {
  const b = need(p(v, "b", 8000), "Enter basic monthly salary."), y = yrs(v, "y", 6), wk = p(v, "wk", 3);
  if (y < 1) return { g: "Not eligible — gratuity starts after 1 year of service", how: "—", note: "—" };
  const g = (b * 12 / 52) * wk * y;
  return { g: `${QAR(g)} end-of-service gratuity`, how: `${nfmt(wk, 1)} weeks × ${QAR(b * 12 / 52)} weekly basic × ${nfmt(y, 2)} years`, note: `Labour Law Article 54: at least 3 weeks' basic wage per year (${QAR(qGrat(b, y))} minimum) · contracts can give more · Qataris are covered by the pension fund instead` };
};
export const kuwaitInd: Calc = (v) => {
  const w = need(p(v, "w", 600), "Enter monthly remuneration."), y = yrs(v, "y", 8), res = pick(v.r, 2) === 1;
  const raw = Math.min(5, y) * (w / 2) + Math.max(0, y - 5) * w, capped = Math.min(raw, w * 18);
  const f = !res ? 1 : y < 3 ? 0 : y < 5 ? 0.5 : y < 10 ? 2 / 3 : 1, g = capped * f;
  return { g: `${KWD(g)} indemnity`, how: `15 days × first ${nfmt(Math.min(5, y), 2)} years + 1 month × ${nfmt(Math.max(0, y - 5), 2)} years = ${KWD(raw)}${raw > capped ? ` (capped at 18 months = ${KWD(capped)})` : ""}`, note: res ? `Resignation: ${f === 0 ? "no indemnity under 3 years" : `${pc(f, 0)} of the full amount`}` : "Full indemnity on termination by the employer (Law 6/2010, Article 51)" };
};
export const omanGrat: Calc = (v) => {
  const b = need(p(v, "b", 700), "Enter basic monthly salary."), y = yrs(v, "y", 6);
  const g = b * y;
  return { g: `${OMR(g)} end-of-service gratuity`, how: `1 month's basic wage × ${nfmt(y, 2)} years (Labour Law 53/2023)`, note: "For non-Omanis; Omanis are covered by the Social Protection Fund · a savings-fund system for expatriates is planned from 2027" };
};
export const bahrainGrat: Calc = (v) => {
  const b = need(p(v, "b", 600), "Enter monthly basic + social allowance."), y = yrs(v, "y", 6);
  const g = Math.min(3, y) * (b / 2) + Math.max(0, y - 3) * b;
  return { g: `${BHD(g)} end-of-service benefit`, how: `½ month × first ${nfmt(Math.min(3, y), 2)} years + 1 month × ${nfmt(Math.max(0, y - 3), 2)} years`, note: "Expat gratuity is now paid by the Social Insurance Organization from employer contributions · paid in full on resignation or termination" };
};

// ---- registry (generated)
export const ideaFin13CustomCalculators: Record<string, Calc> = {
  "uae-vat-calculator": uaeVat,
  "uae-corporate-tax-calculator": uaeCt,
  "uae-net-salary-calculator": uaeNet,
  "uae-annual-leave-salary-calculator": uaeLeave,
  "dubai-property-registration-fee-calculator": dldFee,
  "dubai-rent-increase-index-calculator": dubaiRent,
  "saudi-vat-calculator": ksaVat,
  "saudi-zakat-calculator": ksaZakat,
  "qatar-end-of-service-gratuity-calculator": qatarEos,
  "kuwait-indemnity-calculator": kuwaitInd,
  "oman-gratuity-calculator": omanGrat,
  "bahrain-gratuity-calculator": bahrainGrat,
};
