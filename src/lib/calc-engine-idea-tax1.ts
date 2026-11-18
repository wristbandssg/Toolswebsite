/**
 * Idea build, batch tax1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Europe (6), Asia (3), Latin America & Africa (3)
 * tax/salary = 12 tools. 2026 figures (verified): Germany Minijob limit €603/month (minimum wage €13.90), church tax 8% (Bavaria,
 * Baden-Württemberg) / 9% of income tax; France barème 2026 (revenus 2025) 0/11/30/41/45% at €11,600/29,579/84,577/181,917, quotient-
 * familial cap €1,807 per half-share; Ireland 2026 standard rate band €44,000 (single), credits €2,000 personal + €2,000 employee,
 * USC 0.5% to €12,012, 2% to €28,700, 3% to €70,044, 8% above (exempt ≤ €13,000), PRSI 4.2% rising 0.15 pt from October 2026;
 * Italy IRPEF 2026 23% to €28,000, 33% to €50,000, 43% above (Legge 199/2025), employee INPS 9.19%; Japan resident tax 10% + ¥5,000
 * per capita, employment-income deduction minimum ¥650,000 from 2025 income, resident-tax basic deduction ¥430,000; China IIT annual
 * brackets 3–45% with ¥60,000 standard deduction; Thailand PIT 0–35% with 50% employment expense deduction (max ฿100,000) and ฿60,000
 * personal allowance; Mexico UMA 2026 $117.31 (aguinaldo exempt up to 30 UMA = $3,519.30, minimum 15 days' salary); Brazil INSS 2026
 * 7.5/9/12/14% to R$1,621.00/2,902.84/4,354.27/8,475.55; Kenya PAYE monthly 10/25/30/32.5/35% at KSh 24,000/32,333/500,000/800,000,
 * personal relief KSh 2,400, SHIF 2.75%, Affordable Housing Levy 1.5%, NSSF 6% to KSh 108,000 (Feb 2026). Estimates — local rules,
 * allowances and payroll timing can change the real figure.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const cur = (sym: string, dp = 0) => (x: number) => money(x, sym, dp);
const eur = cur("€"), yen = cur("¥"), yuan = cur("¥"), baht = cur("฿"), mxn = cur("$", 2), brl = cur("R$", 2), ksh = cur("KSh ");
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const prog = (x: number, bands: [number, number][]) => { let t = 0, prev = 0; for (const [lim, r] of bands) { if (x <= prev) break; t += (Math.min(x, lim) - prev) * r; prev = lim; } return t; };

// ---- Europe ----
export const minijob: Calc = (v) => {
  const rate = P(v, "r", 13.9, "Hourly wage"), hrs = Z(v, "h", 40), lim = P(v, "l", 603, "Minijob limit"), opt = pick(v.o, 2) === 1;
  const pay = rate * hrs, maxH = lim / rate, rv = opt ? 0 : pay * 0.036;
  return { e: `${eur(pay)} a month — ${pay <= lim ? "within" : "over"} the ${eur(lim)} Minijob limit`, h: `Up to ${f(Math.floor(maxH * 10) / 10)} hours a month at ${money(rate, "€", 2)}/h (${eur(lim * 12)} a year)`, note: `${opt ? "Opted out of pension contributions" : `Your pension share ≈ 3.6% (${money(rv, "€", 2)})`} · no income tax or other employee social charges (employer pays flat-rate contributions) · 2026 limit €603, 2027 €633 · over the limit it becomes a Midijob` };
};
export const churchTax: Calc = (v) => {
  const lst = P(v, "t", 9000, "Income tax"), st = pick(v.s, 2), mode = pick(v.m, 2), rate = st === 0 ? 0.08 : 0.09;
  const k = lst * rate;
  return { k: `Church tax ≈ ${money(k, "€", 2)} a year (${money(k / 12, "€", 2)} a month)`, d: `${pc(rate, 0)} of ${eur(lst)} income tax · ${st === 0 ? "Bavaria / Baden-Württemberg" : "other federal states"}`, note: `${mode === 1 ? "Enter the income tax after child allowances for an exact base · " : ""}Many states cap church tax at 2.75–4% of taxable income on request (Kappung) · leaving the church (Kirchenaustritt) ends it from the following month` };
};
const FR: [number, number][] = [[11600, 0], [29579, 0.11], [84577, 0.3], [181917, 0.41], [Infinity, 0.45]];
export const frIncomeTax: Calc = (v) => {
  const net = P(v, "r", 45000, "Net taxable salary"), married = pick(v.s, 2) === 1, kids = Math.max(0, Math.round(num(v.c, 0))), ab = pick(v.a, 2) === 0;
  const income = ab ? net * 0.9 : net, base = married ? 2 : 1, extra = Math.min(kids, 2) * 0.5 + Math.max(0, kids - 2), parts = base + extra;
  const taxParts = prog(income / parts, FR) * parts, taxBase = prog(income / base, FR) * base, cap = taxBase - extra * 2 * 1807, tax = Math.max(taxParts, cap);
  return { t: `Impôt ≈ ${eur(tax)} (${pc(tax / net)} of net salary)`, p: `${f(parts)} part${parts === 1 ? "" : "s"} · taxable income ${eur(income)}${ab ? " after the 10% deduction" : ""} · marginal rate ${pc((FR.find(([l]) => income / parts <= l) ?? FR[4])[1], 0)}`, note: `2026 barème (2025 income) · quotient-familial benefit capped at €1,807 per half-share${tax === cap && extra ? " (cap applies)" : ""} · décote, réductions and crédits d'impôt not included · 10% deduction is itself capped for high salaries` };
};
export const frBrutNet: Calc = (v) => {
  const b = P(v, "b", 3000, "Gross monthly salary"), st = pick(v.s, 3), pas = Z(v, "t", 0) / 100, rate = [0.22, 0.25, 0.15][st];
  const net = b * (1 - rate), after = net * (1 - pas);
  return { n: `Net before tax ≈ ${eur(net)} a month (${eur(net * 12)} a year)`, a: `After ${pc(pas, 1)} prélèvement à la source: ${eur(after)} a month`, note: `${["Non-cadre (private sector)", "Cadre", "Public sector"][st]}: employee contributions ≈ ${pc(rate, 0)} of gross — a widely used rule of thumb; your payslip's exact rate varies with mutuelle, prévoyance and pay level` };
};
export const ireland: Calc = (v) => {
  const g = P(v, "g", 55000, "Gross salary"), st = pick(v.s, 3), prsi = Z(v, "p", 4.35) / 100;
  const band = [44000, 53000, 88000][st], cred = st === 0 ? 4000 : st === 1 ? 6000 : 8000, it = Math.max(0, prog(g, [[band, 0.2], [Infinity, 0.4]]) - cred);
  const usc = g <= 13000 ? 0 : prog(g, [[12012, 0.005], [28700, 0.02], [70044, 0.03], [Infinity, 0.08]]), pr = g / 52 > 352 ? g * prsi : 0, net = g - it - usc - pr;
  return { n: `Take-home ≈ ${eur(net)} a year (${eur(net / 12)} a month)`, d: `Income tax ${eur(it)} · USC ${eur(usc)} · PRSI ${eur(pr)} (${pc(prsi, 2)})`, note: `2026: 20% up to ${eur(band)}, 40% above, minus ${eur(cred)} credits (${["single", "married, one income", "married, two incomes (band split)"][st]}) · PRSI 4.2% until Sept 2026, 4.35% from October · pension contributions and other credits not included` };
};
export const italy: Calc = (v) => {
  const g = P(v, "g", 35000, "Gross annual salary (RAL)"), inps = Z(v, "i", 9.19) / 100, reg = Z(v, "r", 1.73) / 100, com = Z(v, "c", 0.8) / 100;
  const soc = g * inps, R = g - soc, gross = prog(R, [[28000, 0.23], [50000, 0.33], [Infinity, 0.43]]);
  const det = R <= 15000 ? 1955 : R <= 28000 ? 1910 + 1190 * ((28000 - R) / 13000) : R <= 50000 ? 1910 * ((50000 - R) / 22000) + (R > 25000 && R <= 35000 ? 65 : 0) : 0, irpef = Math.max(0, gross - det), add = R * (reg + com), net = g - soc - irpef - add;
  return { n: `Netto ≈ ${eur(net)} a year (${eur(net / 13)} × 13 or ${eur(net / 14)} × 14)`, d: `INPS ${eur(soc)} · IRPEF ${eur(irpef)} (gross ${eur(gross)} − detrazioni ${eur(det)}) · regional + municipal surcharges ${eur(add)}`, note: "IRPEF 2026: 23% to €28,000, 33% to €50,000, 43% above · surcharges vary by region and comune (edit them) · excludes the cuneo-fiscale bonus/extra deduction for incomes up to ~€40,000, family deductions and TFR" };
};
// ---- Asia ----
const empDed = (s: number) => (s <= 1900000 ? Math.min(s, 650000) : s <= 3600000 ? s * 0.3 + 80000 : s <= 6600000 ? s * 0.2 + 440000 : s <= 8500000 ? s * 0.1 + 1100000 : 1950000);
export const jpResident: Calc = (v) => {
  const s = P(v, "s", 5000000, "Last year's salary"), soc = Z(v, "i", 0) || s * 0.15, other = Z(v, "o", 0), pc0 = Z(v, "p", 5000);
  const ti = Math.max(0, s - empDed(s) - 430000 - soc - other), tax = Math.floor(ti / 1000) * 1000 * 0.1 + pc0, adj = ti > 0 ? 2500 : 0;
  return { r: `Resident tax ≈ ${yen(Math.max(0, tax - adj))} a year (${yen(Math.max(0, tax - adj) / 12)} a month, June–May)`, d: `Taxable ${yen(ti)} = salary ${yen(s)} − employment deduction ${yen(empDed(s))} − basic ¥430,000 − social insurance ${yen(soc)}${other ? ` − other ${yen(other)}` : ""} · 10% + ${yen(pc0)} per capita`, note: "Based on last year's income, so it starts the June after you begin working · 6% municipal + 4% prefectural · furusato nozei and other deductions reduce it · social insurance defaults to 15% of salary if blank" };
};
const CN: [number, number][] = [[36000, 0.03], [144000, 0.1], [300000, 0.2], [420000, 0.25], [660000, 0.3], [960000, 0.35], [Infinity, 0.45]];
export const chinaIit: Calc = (v) => {
  const m = P(v, "m", 20000, "Monthly salary"), si = Z(v, "s", 10.5) / 100, sp = Z(v, "a", 2000), bonus = Z(v, "b", 0);
  const yr = m * 12, soc = yr * si, ti = Math.max(0, yr - 60000 - soc - sp * 12), tax = prog(ti, CN), net = yr - soc - tax;
  return { t: `Annual IIT ≈ ${yuan(tax)} (${yuan(tax / 12)} a month on average)`, n: `Take-home ≈ ${yuan(net)} a year (${yuan(net / 12)} a month) after ${pc(si, 1)} social insurance & housing fund`, note: `Taxable ${yuan(ti)} = ${yuan(yr)} − ¥60,000 standard − social ${yuan(soc)} − special deductions ${yuan(sp * 12)} · annual brackets 3% to 45%${bonus ? " · one-off bonus taxed separately under its own table if elected" : ""} · contribution rates and caps vary by city` };
};
const TH: [number, number][] = [[150000, 0], [300000, 0.05], [500000, 0.1], [750000, 0.15], [1000000, 0.2], [2000000, 0.25], [5000000, 0.3], [Infinity, 0.35]];
export const thailand: Calc = (v) => {
  const inc = P(v, "i", 600000, "Annual employment income"), sso = Z(v, "s", 9000), allow = Z(v, "a", 0), dep = Z(v, "d", 0);
  const exp = Math.min(100000, inc * 0.5), ti = Math.max(0, inc - exp - 60000 - sso - allow - dep * 30000), tax = prog(ti, TH);
  return { t: `Personal income tax ≈ ${baht(tax)} (${pc(tax / inc)} of income)`, d: `Net taxable ${baht(ti)} = ${baht(inc)} − expenses ${baht(exp)} − personal ฿60,000 − social security ${baht(sso)}${dep ? ` − children ${baht(dep * 30000)}` : ""}${allow ? ` − other allowances ${baht(allow)}` : ""}`, note: "Rates 0% to ฿150,000 then 5–35% · add allowances for spouse, parents, life insurance, RMF/SSF/Thai ESG funds, home loan interest · social security contribution is 5% of wages up to the monthly cap" };
};
// ---- Latin America & Africa ----
export const aguinaldo: Calc = (v) => {
  const d = P(v, "d", 400, "Daily salary"), days = Math.max(15, Z(v, "a", 15)), worked = Math.min(365, P(v, "w", 365, "Days worked")), uma = P(v, "u", 117.31, "UMA"), rate = Z(v, "r", 10.88) / 100;
  const ag = d * days * (worked / 365), ex = 30 * uma, taxable = Math.max(0, ag - ex), isr = taxable * rate;
  return { a: `Aguinaldo ${mxn(ag)}`, t: `Exempt ${mxn(Math.min(ag, ex))} (30 UMA) · taxable ${mxn(taxable)} → ISR ≈ ${mxn(isr)} · you receive ≈ ${mxn(ag - isr)}`, note: `${f(days)} days' salary (legal minimum 15) × ${f(worked)}/365 days worked · pay by 20 December · ISR on the excess uses your marginal rate (edit it) · UMA 2026 $117.31` };
};
const INSS: [number, number][] = [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
export const br13: Calc = (v) => {
  const s = P(v, "s", 4000, "Monthly salary"), m = Math.min(12, Math.max(1, Math.round(num(v.m, 12)))), extra = Z(v, "x", 0), ir = Z(v, "i", 0);
  const g = ((s + extra) * m) / 12, inss = prog(Math.min(g, 8475.55), INSS);
  return { g: `13º salário bruto ${brl(g)}`, p: `1ª parcela (até 30/nov) ${brl(g / 2)} sem descontos · 2ª parcela (até 20/dez) ${brl(g / 2 - inss - ir)} após INSS ${brl(inss)}${ir ? ` e IRRF ${brl(ir)}` : ""}`, note: `${m}/12 avos (15+ days in a month count as a full month) · INSS 2026 progressive 7.5–14% up to the R$ 8,475.55 ceiling · IRRF on the 13th is taxed separately — enter it if your payslip shows one` };
};
const KE: [number, number][] = [[24000, 0.1], [32333, 0.25], [500000, 0.3], [800000, 0.325], [Infinity, 0.35]];
export const kenya: Calc = (v) => {
  const g = P(v, "g", 100000, "Monthly gross pay"), nssfCap = P(v, "n", 108000, "NSSF upper limit"), pen = Z(v, "p", 0);
  const nssf = Math.min(g, nssfCap) * 0.06, shif = Math.max(300, g * 0.0275), ahl = g * 0.015, taxable = Math.max(0, g - nssf - shif - ahl - pen), paye = Math.max(0, prog(taxable, KE) - 2400), net = g - nssf - shif - ahl - pen - paye;
  return { n: `Net pay ≈ ${ksh(net)} a month`, d: `PAYE ${ksh(paye)} · NSSF ${ksh(nssf)} · SHIF ${ksh(shif)} · Housing Levy ${ksh(ahl)}${pen ? ` · pension ${ksh(pen)}` : ""} · taxable pay ${ksh(taxable)}`, note: "2026: PAYE 10% to KSh 24,000, 25% to 32,333, 30% to 500,000, 32.5% to 800,000, 35% above, minus KSh 2,400 personal relief · NSSF 6% to KSh 108,000 (from Feb 2026) · SHIF 2.75% (min KSh 300) and AHL 1.5% deducted before PAYE" };
};

// ---- registry (generated)
export const ideaTax1CustomCalculators: Record<string, Calc> = {
  "germany-minijob-earnings-calculator": minijob,
  "germany-church-tax-calculator": churchTax,
  "france-income-tax-quotient-familial-calculator": frIncomeTax,
  "france-net-salary-brut-net-calculator": frBrutNet,
  "ireland-net-salary-paye-usc-calculator": ireland,
  "italy-net-salary-irpef-calculator": italy,
  "japan-resident-tax-calculator": jpResident,
  "china-individual-income-tax-calculator": chinaIit,
  "thailand-personal-income-tax-calculator": thailand,
  "mexico-aguinaldo-calculator": aguinaldo,
  "brazil-13th-salary-calculator": br13,
  "kenya-paye-tax-calculator": kenya,
};
