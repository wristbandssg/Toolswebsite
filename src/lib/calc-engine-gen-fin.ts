/**
 * Batch: General keyword check (15 Nov 2026) — 6 tools in mixed categories:
 *  - sp500-return (Finance > Investment Returns & Planning): S&P 500 total returns 1928–2025 from
 *    Damodaran, NYU Stern "Historical Returns on Stocks, Bonds and Bills" (histretSP, Jan 2026
 *    update), dividends reinvested; inflation from the site's US CPI-U table.
 *  - roth-401k (Retirement): Roth vs traditional 401(k), 2026 limits $24,500 + $8,000 catch-up
 *    (50+) / $11,250 (60–63).
 *  - married-filing-jointly-vs-separately (Tax & Paycheck): 2026 brackets and standard deductions
 *    (MFS brackets = half of MFJ), Child Tax Credit $2,200 per child with the $400k / $200k
 *    phase-out ($50 per $1,000).
 *  - estate-tax (Tax & Paycheck): IRC §2001(c) rate table, 2026 basic exclusion $15,000,000
 *    (One Big Beautiful Bill Act), DSUE portability; state inheritance tax for PA, NJ, MD, NE and a
 *    custom state estate tax.
 *  - bmi-child-teen (Sports Performance): CDC 2000 BMI-for-age LMS (src/lib/cdc-bmi-lms.ts).
 *  - bid-bond-cost (Construction Materials & Estimating): bid bond penal sum + typical
 *    performance & payment bond premium schedule.
 */

import { type TrvCalculator as Calc, InputError, num, pick, sig } from "./trv-core";
import { CPI, CPI_START } from "./calc-engine-fin-depreciation-tax";
import { CDC_BMI_LMS } from "./cdc-bmi-lms";

const usd = (x: number, dp = 0) => `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const pc = (x: number, dp = 2) => `${(x * 100).toFixed(dp)}%`;

// ------------------------------------------------------------------ S&P 500 historical return
export const SP_START = 1928;
// Annual total return (price + dividends), %, 1928–2025.
export const SP_RET = [
  43.81, -8.3, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, -35.34, 29.28, -1.1, -10.67, -12.77, 19.17, 25.06, 19.03, 35.82, -8.43, 5.2,
  5.7, 18.3, 30.81, 23.68, 18.15, -1.21, 52.56, 32.6, 7.44, -10.46, 43.72, 12.06, 0.34, 26.64, -8.81, 22.61, 16.42, 12.4, -9.97, 23.8,
  10.81, -8.24, 3.56, 14.22, 18.76, -14.31, -25.9, 37.0, 23.83, -6.98, 6.51, 18.52, 31.74, -4.7, 20.42, 22.34, 6.15, 31.24, 18.49, 5.81,
  16.54, 31.48, -3.06, 30.23, 7.49, 9.97, 1.33, 37.2, 22.68, 33.1, 28.34, 20.89, -9.03, -11.85, -21.97, 28.36, 10.74, 4.83, 15.61, 5.48,
  -36.55, 25.94, 14.82, 2.1, 15.89, 32.15, 13.52, 1.38, 11.77, 21.61, -4.23, 31.21, 18.02, 28.47, -18.04, 26.06, 24.88, 17.78,
];
export const SP_END = SP_START + SP_RET.length - 1;
const cpiOf = (y: number) => CPI[Math.min(Math.max(y, CPI_START), CPI_START + CPI.length - 1) - CPI_START];
export const sp500Return: Calc = (v) => {
  const y0 = Math.round(num(v.start, 2000)), y1 = Math.round(num(v.end, SP_END));
  if (y0 < SP_START || y1 > SP_END || y0 > y1) throw new InputError(`Pick years from ${SP_START} to ${SP_END}, with the start year no later than the end year.`);
  const P0 = num(v.amount, 10000), add = num(v.annual, 0);
  if (P0 < 0 || add < 0) throw new InputError("Amounts can't be negative.");
  if (P0 === 0 && add === 0) throw new InputError("Enter a starting amount or a yearly contribution.");
  let bal = P0, growth = 1, best = -Infinity, worst = Infinity, by = 0, wy = 0, down = 0;
  for (let y = y0; y <= y1; y++) {
    const r = SP_RET[y - SP_START] / 100;
    if (y > y0 || P0 === 0) bal += add; // contributions at the start of each later year (or every year if no lump sum)
    bal *= 1 + r; growth *= 1 + r;
    if (r > best) { best = r; by = y; }
    if (r < worst) { worst = r; wy = y; }
    if (r < 0) down++;
  }
  const yrs = y1 - y0 + 1, contrib = P0 + add * (P0 === 0 ? yrs : yrs - 1);
  const cagr = growth ** (1 / yrs) - 1;
  // CPI from December of the year before the start to December of the end year, approximated with annual averages.
  const infl = cpiOf(y1) / cpiOf(y0 - 1);
  const realCagr = (growth / infl) ** (1 / yrs) - 1;
  return {
    value: usd(bal), raw: Math.round(bal), contributed: usd(contrib), gain: `${usd(bal - contrib)} (${pc((bal - contrib) / contrib, 1)} on money put in)`,
    cagr: pc(cagr), real: `${pc(realCagr)} a year after inflation; ${usd(bal / infl)} in ${y0} dollars`,
    lump: `$1 invested at the start of ${y0} grew to $${growth.toFixed(2)} by the end of ${y1} (${yrs} year${yrs > 1 ? "s" : ""})`,
    extremes: `Best year ${by} (${pc(best, 1)}), worst ${wy} (${pc(worst, 1)}), ${down} down year${down === 1 ? "" : "s"}`,
  };
};
export const roth401k: Calc = (v) => {
  const c = num(v.contrib, 10000), yrs = Math.round(num(v.years, 30)), r = num(v.ret, 7) / 100, tNow = num(v.tnow, 22) / 100, tRet = num(v.tret, 15) / 100;
  const match = num(v.match, 0), age = Math.round(num(v.age, 35)), side = pick(v.side, 2) === 0, drag = num(v.drag, 15) / 100;
  if (yrs < 1 || yrs > 60) throw new InputError("Use 1 to 60 years.");
  if (c < 0 || match < 0) throw new InputError("Contributions can't be negative.");
  const fv = (amt: number, rate: number) => (rate === 0 ? amt * yrs : amt * (((1 + rate) ** yrs - 1) / rate) * (1 + rate));
  const roth = fv(c, r), matchFv = fv(match, r);
  const trad = fv(c, r) + matchFv, tradAfter = trad * (1 - tRet), rothAfter = roth + matchFv * (1 - tRet);
  const sideVal = side ? fv(c * tNow, r * (1 - drag)) : 0;
  const tradTotal = tradAfter + sideVal;
  const limit = age >= 60 && age <= 63 ? 24500 + 11250 : age >= 50 ? 32500 : 24500;
  const winner = rothAfter > tradTotal * 1.0005 ? "Roth 401(k)" : tradTotal > rothAfter * 1.0005 ? "Traditional 401(k)" : "About equal";
  // Break-even retirement tax rate t*: roth·(1 − t) + match·(1 − t) + side = roth + match·(1 − t)  →  t* = side ÷ roth.
  const beTxt = side && roth > 0 ? `${pc(Math.min(1, sideVal / roth), 1)} — traditional wins below this retirement tax rate` : "n/a — with equal contributions the Roth uses more take-home pay; turn on the side account for a fair comparison";
  return {
    winner, roth: usd(rothAfter), trad: usd(tradTotal), diff: winner === "About equal" ? "No meaningful difference" : `${usd(Math.abs(rothAfter - tradTotal))} more with the ${winner}`,
    detail: `Traditional: ${usd(trad)} before tax → ${usd(tradAfter)} after ${pc(tRet, 0)} tax${side ? ` + ${usd(sideVal)} side account` : ""}. Roth: ${usd(roth)} tax-free${match ? ` + match ${usd(matchFv * (1 - tRet))} after tax` : ""}.`,
    breakeven: beTxt,
    limit: c > limit ? `⚠ ${usd(c)} is over your 2026 limit of ${usd(limit)}` : `Within your 2026 employee limit of ${usd(limit)}${age >= 50 ? " (includes catch-up)" : ""}`,
  };
};

// ------------------------------------------------------------------ married filing jointly vs separately (2026)
const B_SINGLE = [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]] as const;
const B_MFJ = [[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]] as const;
const B_MFS = B_MFJ.map(([u, r]) => [u === Infinity ? Infinity : u / 2, r] as const);
const taxOn = (ti: number, br: readonly (readonly [number, number])[]) => { let t = 0, lo = 0; for (const [up, r] of br) { if (ti <= lo) break; t += (Math.min(ti, up) - lo) * r; lo = up; } return t; };
const ctc = (kids: number, agi: number, thr: number) => Math.max(0, kids * 2200 - Math.ceil(Math.max(0, agi - thr) / 1000) * 50);
export const mfjVsMfs: Calc = (v) => {
  const ia = num(v.ia, 90000), ib = num(v.ib, 40000), da = num(v.da, 0), db = num(v.db, 0), kids = Math.round(num(v.kids, 1)), who = pick(v.who, 2);
  if (ia < 0 || ib < 0 || da < 0 || db < 0 || kids < 0) throw new InputError("Use amounts of 0 or more.");
  const jointDed = Math.max(32200, da + db);
  const jTI = Math.max(0, ia + ib - jointDed), jTax0 = taxOn(jTI, B_MFJ), jC = Math.min(jTax0, ctc(kids, ia + ib, 400000)), jTax = jTax0 - jC;
  // Filing separately: if either spouse itemizes, both must itemize.
  const itemize = da > 16100 || db > 16100;
  const dA = itemize ? da : 16100, dB = itemize ? db : 16100;
  const aTI = Math.max(0, ia - dA), bTI = Math.max(0, ib - dB);
  const aT0 = taxOn(aTI, B_MFS), bT0 = taxOn(bTI, B_MFS);
  const aC = who === 0 ? Math.min(aT0, ctc(kids, ia, 200000)) : 0, bC = who === 1 ? Math.min(bT0, ctc(kids, ib, 200000)) : 0;
  const sTax = aT0 - aC + bT0 - bC, diff = sTax - jTax;
  const better = Math.abs(diff) < 1 ? "Same tax either way" : diff > 0 ? "Married filing jointly" : "Married filing separately";
  const tot = ia + ib;
  return {
    better, saving: Math.abs(diff) < 1 ? "$0" : `${usd(Math.abs(diff))} less federal tax`, mfj: `${usd(jTax)} (taxable ${usd(jTI)}, effective ${tot ? pc(jTax / tot, 1) : "0%"})`,
    mfs: `${usd(sTax)} total — A ${usd(aT0 - aC)}, B ${usd(bT0 - bC)}${itemize ? " (both itemize)" : ""}`,
    credit: `Child Tax Credit used: joint ${usd(jC)}, separate ${usd(aC + bC)}`,
    single: `If you weren't married: ${usd(taxOn(Math.max(0, ia - Math.max(16100, da)), B_SINGLE) + taxOn(Math.max(0, ib - Math.max(16100, db)), B_SINGLE))} total as two single filers (no credits)`,
  };
};

// ------------------------------------------------------------------ estate & inheritance tax (2026)
const EST_TABLE: [number, number, number][] = [[0, 0, 0.18], [10000, 1800, 0.2], [20000, 3800, 0.22], [40000, 8200, 0.24], [60000, 13000, 0.26], [80000, 18200, 0.28], [100000, 23800, 0.3], [150000, 38800, 0.32], [250000, 70800, 0.34], [500000, 155800, 0.37], [750000, 248300, 0.39], [1000000, 345800, 0.4]];
const tentative = (x: number) => { let row = EST_TABLE[0]; for (const r of EST_TABLE) if (x > r[0]) row = r; return row[1] + (x - row[0]) * row[2]; };
export const EXCLUSION_2026 = 15000000;
export const EST_STATES = ["No state tax / not listed", "Pennsylvania (inheritance tax)", "New Jersey (inheritance tax)", "Maryland (inheritance tax)", "Nebraska (inheritance tax)", "Other state estate tax (enter exemption & rate)"];
export const HEIRS = ["Spouse", "Child, grandchild or other lineal descendant", "Parent", "Brother or sister", "Niece, nephew, aunt or uncle", "Unrelated person / friend", "Charity"];
function inheritance(state: number, heir: number, amt: number): [number, string] {
  if (amt <= 0 || heir === 6 || heir === 0) return [0, heir === 6 ? "Charities are exempt" : heir === 0 ? "Spouses are exempt" : "No amount"];
  if (state === 1) { const r = heir <= 2 ? 0.045 : heir === 3 ? 0.12 : 0.15; return [amt * r, `PA: ${pc(r, 1)} for this heir`]; }
  if (state === 2) {
    if (heir <= 2) return [0, "NJ Class A heir: exempt"];
    if (heir === 3) { const b: [number, number][] = [[25000, 0], [1100000, 0.11], [1400000, 0.13], [1700000, 0.14], [Infinity, 0.16]]; let t = 0, lo = 0; for (const [u, r] of b) { if (amt <= lo) break; t += (Math.min(amt, u) - lo) * r; lo = u; } return [t, "NJ Class C (sibling): first $25,000 exempt, then 11–16%"]; }
    return [amt <= 700000 ? amt * 0.15 : 105000 + (amt - 700000) * 0.16, "NJ Class D: 15% up to $700,000, 16% above"];
  }
  if (state === 3) return heir <= 3 ? [0, "MD: spouse, lineal heirs, parents and siblings are exempt"] : [amt * 0.1, "MD: 10% for other heirs"];
  if (state === 4) {
    if (heir <= 3) return [Math.max(0, amt - 100000) * 0.01, "NE immediate relative: 1% above $100,000"];
    if (heir === 4) return [Math.max(0, amt - 40000) * 0.11, "NE remote relative: 11% above $40,000"];
    return [Math.max(0, amt - 25000) * 0.15, "NE other heir: 15% above $25,000"];
  }
  return [0, "No inheritance tax for this state option"];
}
export const estateTax: Calc = (v) => {
  const gross = num(v.gross, 20000000), debts = num(v.debts, 500000), charity = num(v.charity, 0), marital = num(v.marital, 0), gifts = num(v.gifts, 0), dsue = num(v.dsue, 0);
  if ([gross, debts, charity, marital, gifts, dsue].some((x) => x < 0)) throw new InputError("Use amounts of 0 or more.");
  if (dsue > EXCLUSION_2026) throw new InputError(`Ported DSUE can't exceed ${usd(EXCLUSION_2026)} (the deceased spouse's exclusion).`);
  const taxable = Math.max(0, gross - debts - charity - marital);
  const base = taxable + gifts, excl = EXCLUSION_2026 + dsue;
  const fed = Math.max(0, tentative(base) - tentative(excl));
  const state = pick(v.state, EST_STATES.length), heir = pick(v.heir, HEIRS.length), share = num(v.share, 0);
  let stTax = 0, stNote: string;
  if (state === 5) { const ex = num(v.sex, 2000000), rate = num(v.srate, 16) / 100; stTax = Math.max(0, taxable - ex) * rate; stNote = `State estate tax: ${pc(rate, 1)} of the taxable estate above ${usd(ex)} (flat approximation)`; }
  else [stTax, stNote] = inheritance(state, heir, share);
  const net = Math.max(0, gross - debts - fed - stTax);
  return {
    federal: usd(fed), raw: Math.round(fed), taxable: usd(taxable), exclusion: `${usd(excl)}${dsue ? ` (incl. ${usd(dsue)} DSUE from a late spouse)` : ""}`,
    over: base > excl ? `${usd(base - excl)} above the exclusion, taxed at up to 40%` : `Under the exclusion by ${usd(excl - base)} — no federal estate tax`,
    state: `${usd(stTax)} — ${stNote}`, net: usd(net), rate: gross > 0 ? pc((fed + stTax) / gross, 1) : "0%",
  };
};

// ------------------------------------------------------------------ BMI for children & teens (CDC BMI-for-age)
const Phi = (z: number) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989422804014327 * Math.exp((-z * z) / 2); const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); return z >= 0 ? 1 - p : p; };
const zOf = (p: number) => { let lo = -8, hi = 8; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; };
function lms(sex: number, ageMo: number) {
  const tab = CDC_BMI_LMS[sex];
  if (ageMo <= tab[0][0]) return tab[0].slice(1);
  for (let i = 1; i < tab.length; i++) if (ageMo <= tab[i][0]) { const [a0, l0, m0, s0] = tab[i - 1], [a1, l1, m1, s1] = tab[i], f = (ageMo - a0) / (a1 - a0); return [l0 + f * (l1 - l0), m0 + f * (m1 - m0), s0 + f * (s1 - s0)]; }
  return tab[tab.length - 1].slice(1);
}
const bmiAt = (L: number, M: number, S: number, p: number) => M * (1 + L * S * zOf(p)) ** (1 / L);
export const SEX = ["Boy", "Girl"];
export const UNITS = ["US (inches & pounds)", "Metric (cm & kg)"];
export const bmiChildTeen: Calc = (v) => {
  const sex = pick(v.sex, 2), metric = pick(v.units, 2) === 1;
  const yrs = Math.floor(num(v.years, 10)), mos = Math.round(num(v.months, 0));
  const ageMo = yrs * 12 + mos + 0.5;
  if (ageMo < 24 || ageMo > 240.5) throw new InputError("This chart covers ages 2 to 20. For adults use the BMI Calculator; under 2, doctors use weight-for-length.");
  const h = num(v.height, metric ? 140 : 55), w = num(v.weight, metric ? 35 : 77);
  if (!(h > 0 && w > 0)) throw new InputError("Enter height and weight.");
  const hm = metric ? h / 100 : h * 0.0254, kg = metric ? w : w * 0.45359237;
  const bmi = kg / (hm * hm);
  if (bmi < 8 || bmi > 80) throw new InputError("Check the height and weight — that BMI is outside the possible range.");
  const [L, M, S] = lms(sex, ageMo);
  const z = L === 0 ? Math.log(bmi / M) / S : ((bmi / M) ** L - 1) / (L * S);
  const pct = Phi(z) * 100, p95 = bmiAt(L, M, S, 0.95);
  const cat = pct < 5 ? "Underweight" : pct < 85 ? "Healthy weight" : pct < 95 ? "Overweight" : bmi >= 1.4 * p95 ? "Severe obesity (class 3, ≥140% of the 95th percentile)" : bmi >= 1.2 * p95 ? "Severe obesity (class 2, ≥120% of the 95th percentile)" : "Obesity";
  const lo = bmiAt(L, M, S, 0.05), hi = bmiAt(L, M, S, 0.85);
  const toW = (b: number) => (metric ? `${(b * hm * hm).toFixed(1)} kg` : `${((b * hm * hm) / 0.45359237).toFixed(1)} lb`);
  return {
    percentile: pct < 0.1 ? "<0.1th" : pct > 99.9 ? ">99.9th" : `${sig(pct, 3)}th`, category: cat, bmi: Number(bmi.toFixed(1)), z: sig(z, 3),
    healthy: `BMI ${lo.toFixed(1)}–${hi.toFixed(1)} is the healthy range at this age (5th–85th percentile)`,
    weights: `Healthy weight at this height: about ${toW(lo)} to ${toW(hi)}`, of95: `${((bmi / p95) * 100).toFixed(0)}% of the 95th percentile (${p95.toFixed(1)})`,
  };
};

// ------------------------------------------------------------------ bid bond cost
export const BOND_TIERS = ["Standard (good credit & financials)", "Preferred (strong, established contractor)", "Higher risk (new business or weaker credit)"];
const PP_SCHEDULE: [number, number][] = [[100000, 0.025], [500000, 0.015], [2500000, 0.01], [5000000, 0.0075], [7500000, 0.007], [Infinity, 0.0065]];
const ppPremium = (c: number) => { let t = 0, lo = 0; for (const [u, r] of PP_SCHEDULE) { if (c <= lo) break; t += (Math.min(c, u) - lo) * r; lo = u; } return t; };
export const bidBond: Calc = (v) => {
  const bid = num(v.bid, 750000), pctReq = num(v.pct, 10) / 100, fee = pick(v.fee, 3), flat = num(v.flat, 250), feePct = num(v.feepct, 1) / 100, tier = pick(v.tier, 3), next = num(v.next, 0);
  if (!(bid > 0)) throw new InputError("Enter your bid amount.");
  if (!(pctReq > 0 && pctReq <= 1)) throw new InputError("The bid bond percentage must be between 0 and 100%.");
  const penal = bid * pctReq;
  const cost = fee === 0 ? 0 : fee === 1 ? flat : penal * feePct;
  const mult = [1, 0.8, 2][tier];
  const pp = ppPremium(bid) * mult;
  const forfeit = next > bid ? Math.min(penal, next - bid) : penal;
  return {
    penal: usd(penal), raw: Math.round(penal), cost: usd(cost, 2), pp: `${usd(pp)} (${pc(pp / bid, 2)} of the contract)`,
    rate: `${usd((pp / bid) * 1000, 2)} per $1,000 of contract`, forfeit: next > bid ? `${usd(forfeit)} (the gap to the next bid, capped at the penal sum)` : `Up to ${usd(forfeit)} (the full penal sum)`,
    total: usd(cost + pp),
  };
};

export const genFinCustomCalculators: Record<string, Calc> = {
  "sp500-return-calculator": sp500Return,
  "roth-401k-calculator": roth401k,
  "married-filing-jointly-vs-separately-calculator": mfjVsMfs,
  "estate-tax-calculator": estateTax,
  "bmi-child-teen-calculator": bmiChildTeen,
  "bid-bond-cost-calculator": bidBond,
};
