/**
 * Idea build, batch tax2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Germany (2), Netherlands (1), Nigeria (1) = 4 tools.
 * Verified 2026 figures: Germany §32a EStG 2026 — 0 to €12,348; (914.51·y + 1,400)·y to €17,799; (173.10·z + 2,397)·z + 1,034.87 to
 * €69,878; 0.42·x − 11,135.63 to €277,825; 0.45·x − 19,470.38 above (splitting = 2 × tax on half). Solidarity surcharge 5.5%, Freigrenze
 * €20,350 income tax (€40,700 joint), Milderungszone max 11.9% of the excess. Social insurance 2026: RV 9.3% + AV 1.3% to €8,450/month,
 * KV 7.3% + half the Zusatzbeitrag (editable, default 2.9%) and PV 1.8% (+0.6% childless) to €5,812.50/month. Netherlands 2026 box 1:
 * 35.75% to €38,883, 37.56% to €78,426, 49.5% above; algemene heffingskorting max €3,115 less 6.398% above €29,736; arbeidskorting max
 * €5,685 at €45,592, less 6.51% above (zero at €132,920). Nigeria Tax Act 2025 (from 1 Jan 2026): 0% on first ₦800,000, 15% to ₦3m,
 * 18% to ₦12m, 21% to ₦25m, 23% to ₦50m, 25% above; rent relief 20% of rent up to ₦500,000; pension, NHF and NHIS deductible.
 * Payroll estimates — Lohnsteuer here uses simplified Vorsorgepauschale/allowances, not the official PAP algorithm.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";

const eur = (x: number) => money(x, "€", 0), ngn = (x: number) => money(x, "₦", 0);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const prog = (x: number, bands: [number, number][]) => { let t = 0, prev = 0; for (const [lim, r] of bands) { if (x <= prev) break; t += (Math.min(x, lim) - prev) * r; prev = lim; } return t; };

const est = (x0: number) => {
  const x = Math.floor(Math.max(0, x0));
  if (x <= 12348) return 0;
  if (x <= 17799) { const y = (x - 12348) / 10000; return Math.floor((914.51 * y + 1400) * y); }
  if (x <= 69878) { const z = (x - 17799) / 10000; return Math.floor((173.1 * z + 2397) * z + 1034.87); }
  if (x <= 277825) return Math.floor(0.42 * x - 11135.63);
  return Math.floor(0.45 * x - 19470.38);
};
const estS = (zve: number, joint: boolean) => (joint ? 2 * est(zve / 2) : est(zve));
const soli = (tax: number, joint: boolean) => { const fg = joint ? 40700 : 20350; return tax <= fg ? 0 : Math.min(tax * 0.055, (tax - fg) * 0.119); };

export const deSoli: Calc = (v) => {
  const mode = pick(v.m, 2), joint = pick(v.s, 2) === 1, inp = P(v, "x", 60000, mode === 0 ? "Taxable income" : "Income tax");
  const tax = mode === 0 ? estS(inp, joint) : inp, s = soli(tax, joint), fg = joint ? 40700 : 20350;
  return { s: `Solidarity surcharge ${money(s, "€", 2)} a year`, d: `${mode === 0 ? `Income tax on ${eur(inp)} taxable income: ${eur(tax)}` : `Income tax ${eur(tax)}`} · Freigrenze ${eur(fg)} · ${s === 0 ? "below the threshold — no Soli" : s < tax * 0.055 ? "in the Milderungszone (11.9% of the excess)" : "full 5.5%"}`, note: "2026: Soli applies only if income tax exceeds €20,350 (single) / €40,700 (joint) · on capital income (Abgeltungsteuer) and for companies it still applies in full · child allowances lower the Soli base" };
};
export const deBruttoNetto: Calc = (v) => {
  const g = P(v, "g", 4500, "Gross monthly salary"), cls = pick(v.c, 3), zus = Z(v, "z", 2.9) / 100, childless = pick(v.k, 2) === 1, kirche = pick(v.r, 3);
  const rvB = Math.min(g, 8450), kvB = Math.min(g, 5812.5), rv = rvB * 0.093, av = rvB * 0.013, kv = kvB * (0.073 + zus / 2), pv = kvB * (childless ? 0.024 : 0.018);
  const joint = cls === 2, yr = g * 12, vp = (rv + kv + pv) * 12, zve = Math.max(0, yr - 1230 - 36 - vp - (cls === 1 ? 4260 : 0));
  const lst = estS(zve, joint), sz = soli(lst, joint), kst = kirche === 0 ? 0 : lst * (kirche === 1 ? 0.08 : 0.09), taxM = (lst + sz + kst) / 12, socM = rv + av + kv + pv, net = g - taxM - socM;
  return { n: `Netto ≈ ${money(net, "€", 2)} a month (${eur(net * 12)} a year)`, d: `Lohnsteuer ${money(lst / 12, "€", 2)} · Soli ${money(sz / 12, "€", 2)}${kst ? ` · Kirchensteuer ${money(kst / 12, "€", 2)}` : ""} · RV ${money(rv, "€", 2)} · AV ${money(av, "€", 2)} · KV ${money(kv, "€", 2)} · PV ${money(pv, "€", 2)}`, note: `Steuerklasse ${["I / IV", "II (single parent)", "III (splitting)"][cls]} · 2026 tariff and contribution ceilings · simplified Vorsorgepauschale — your payslip uses the official PAP algorithm and may differ by a few euros · Saxony has a higher employee PV share` };
};
const NL: [number, number][] = [[38883, 0.3575], [78426, 0.3756], [Infinity, 0.495]];
export const nlNet: Calc = (v) => {
  const g = P(v, "g", 50000, "Annual gross salary"), pen = Z(v, "p", 0) / 100, akIn = Z(v, "a", 0), hol = pick(v.h, 2) === 0;
  const gross = hol ? g * 1.08 : g, taxable = gross * (1 - pen), tax = prog(taxable, NL);
  const ahk = Math.max(0, 3115 - Math.max(0, taxable - 29736) * 0.06398), autoAk = taxable >= 45592 ? Math.max(0, 5685 - (taxable - 45592) * 0.0651) : taxable >= 25000 ? 5685 : 0;
  const ak = akIn || autoAk, net = gross - gross * pen - Math.max(0, tax - ahk - ak);
  return { n: `Netto ≈ ${eur(net)} a year (${eur(net / 12)} a month${hol ? ", incl. 8% holiday pay spread out" : ""})`, d: `Box 1 tax ${eur(tax)} − algemene heffingskorting ${eur(ahk)} − arbeidskorting ${eur(ak)}${pen ? ` · pension ${eur(gross * pen)}` : ""}`, note: `2026: 35.75% to €38,883, 37.56% to €78,426, 49.5% above (below AOW age) · ${!akIn && taxable < 45592 ? (taxable >= 25000 ? "arbeidskorting is slightly below the €5,685 maximum at this income — enter your exact figure for precision · " : "enter your arbeidskorting for incomes under €25,000 (shown as €0) · ") : ""}30% ruling, zorgtoeslag and other credits not included` };
};
const NG: [number, number][] = [[800000, 0], [3000000, 0.15], [12000000, 0.18], [25000000, 0.21], [50000000, 0.23], [Infinity, 0.25]];
export const ngPaye: Calc = (v) => {
  const g = P(v, "g", 6000000, "Annual gross income"), penB = Z(v, "b", 0) || g, pen = penB * (Z(v, "p", 8) / 100), nhf = Z(v, "n", 0), nhis = Z(v, "h", 0), rent = Z(v, "r", 0);
  const rr = Math.min(500000, rent * 0.2), taxable = Math.max(0, g - pen - nhf - nhis - rr), tax = prog(taxable, NG), net = g - pen - nhf - nhis - tax;
  return { t: `PAYE ≈ ${ngn(tax)} a year (${ngn(tax / 12)} a month) · effective ${pc(tax / g)}`, n: `Take-home ≈ ${ngn(net)} a year (${ngn(net / 12)} a month)`, note: `Taxable ${ngn(taxable)} = gross − pension ${ngn(pen)}${nhf ? ` − NHF ${ngn(nhf)}` : ""}${nhis ? ` − NHIS ${ngn(nhis)}` : ""} − rent relief ${ngn(rr)} · Nigeria Tax Act 2025 bands from 1 Jan 2026: first ₦800,000 at 0%, then 15/18/21/23/25% · rent relief replaces the old CRA` };
};

// ---- registry (generated)
export const ideaTax2CustomCalculators: Record<string, Calc> = {
  "germany-net-salary-brutto-netto-calculator": deBruttoNetto,
  "germany-solidarity-surcharge-calculator": deSoli,
  "netherlands-net-salary-calculator": nlNet,
  "nigeria-paye-tax-calculator": ngPaye,
};
