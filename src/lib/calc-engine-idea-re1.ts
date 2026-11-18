/**
 * Idea build, batch re1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Real Estate > Closing Costs (8), Commercial (13),
 * Home Buying & Affordability (9), Home Value, Equity & Selling (8) = 38 tools.
 * Rules: Florida documentary stamp tax $0.70 per $100 on deeds (Miami-Dade differs), $0.35 per $100 on notes, intangible tax 0.2% of new
 * mortgages; NYC mansion tax tiers 1%–3.9% on residential purchases of $1M+ (1% elsewhere in New York State); maximum seller
 * concessions — conventional 3% (LTV > 90%), 6% (75–90%), 9% (≤ 75%), 2% investment; FHA 6%; VA 4% (concessions beyond normal costs);
 * USDA 6%; IRC §121 home-sale exclusion $250,000 / $500,000 (owned and lived in 2 of the last 5 years, prorated partial exclusion);
 * 2026 federal gift-tax annual exclusion $19,000 per recipient (Rev. Proc. 2025-32). Fees and prices are editable typical defaults.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const today = () => Math.floor(Date.now() / 86400000);
const pmt = (L: number, r: number, n: number) => (r > 0 ? (L * r) / (1 - (1 + r) ** -n) : L / n);

// ---- Closing costs ----
export const escrowFee: Calc = (v) => {
  const price = P(v, "p", 400000, "Price"), base = Z(v, "b", 250), per = Z(v, "r", 2), split = pick(v.s, 3);
  const fee = base + (price / 1000) * per, buyer = split === 0 ? fee / 2 : split === 1 ? fee : 0;
  return { f: `Escrow fee ≈ ${$(fee)}`, s: `Buyer pays ${$(buyer)} · seller pays ${$(fee - buyer)} (${["split 50/50", "buyer pays", "seller pays"][split]})`, note: `${$(base)} base + ${$2(per)} per $1,000 of price · common in CA, WA, AZ and NV; rates vary by escrow company — get a quote` };
};
const prorate = (label: string): Calc => (v) => {
  const amt = P(v, "a", label === "tax" ? 6000 : 300, "Amount"), per = pick(v.p, 3), close = dateIn(v, "d", today() + 30), paid = pick(v.x, 2) === 1, sd = dateIn(v, "s", today() - 200);
  const len = [365, 91.25, 30.4375][per], daily = amt / len, days = Math.max(0, Math.min(len, close - sd)), sellerShare = daily * days;
  return { c: paid ? `Buyer credits seller ${$2(amt - sellerShare)} (seller already paid the full ${["year", "quarter", "month"][per]})` : `Seller credits buyer ${$2(sellerShare)} (bill not yet paid)`, d: `${$2(daily)} a day × ${nfmt(days, 0)} days the seller owned it in this period (${dayText(sd)} → closing ${dayText(close)})`, note: `${label === "tax" ? "Property taxes" : "HOA dues"} prorated on a ${len === 365 ? "365-day year" : "period"} basis · local custom (closing day to buyer or seller, 360 vs 365 days) can shift a few dollars` };
};
export const proTax = prorate("tax");
export const proHoa = prorate("hoa");
export const concessions: Calc = (v) => {
  const price = P(v, "p", 400000, "Price"), dn = Z(v, "d", 5) / 100, t = pick(v.t, 5), occ = pick(v.o, 2), cc = Z(v, "c", 12000);
  const ltv = 1 - dn, cap = t === 0 ? (occ === 1 ? 0.02 : ltv > 0.9 ? 0.03 : ltv > 0.75 ? 0.06 : 0.09) : [0, 0.06, 0.04, 0.06, 0.06][t], max = price * cap;
  return { m: `Max seller concessions ≈ ${$(max)} (${pc(cap, 0)})`, c: cc ? `Your closing costs ${$(cc)}: ${cc <= max ? "fully covered" : `${$(cc - max)} over the limit`}` : "Add your closing costs to check", note: `${["Conventional", "FHA", "VA", "USDA", "Other"][t]}${t === 0 ? ` (${occ === 1 ? "investment" : "primary/second home"}, LTV ${pc(ltv, 0)})` : ""} · concessions can only pay closing costs and prepaids, not the down payment${t === 2 ? " · VA's 4% limit excludes normal closing costs" : ""}` };
};
export const creditVsPoints: Calc = (v) => {
  const L = P(v, "l", 350000, "Loan"), r0 = P(v, "r", 6.75, "Rate") / 100, n = Math.round(num(v.n, 30)) * 12, pts = num(v.p, 1), dr = num(v.d, 0.25) / 100, yrs = Math.max(1, num(v.y, 7));
  const r1 = r0 - pts * dr, p0 = pmt(L, r0 / 12, n), p1 = pmt(L, r1 / 12, n), cost = (L * pts) / 100, sav = p0 - p1, be = sav ? cost / sav : Infinity, net = sav * yrs * 12 - cost;
  return { b: pts > 0 ? `Buying ${f(pts)} point${pts === 1 ? "" : "s"} costs ${$(cost)} and saves ${$2(sav)}/month — break-even ${Number.isFinite(be) ? `${f(be)} months` : "never"}` : `Taking a ${$(-cost)} lender credit raises the payment ${$2(-sav)}/month — it costs more after ${f(-cost / -sav)} months`, n: `Over ${f(yrs)} years you'd ${net >= 0 ? "save" : "lose"} ${$(Math.abs(net))} vs the ${pc(r0, 3)} par rate (${pc(r1, 3)} with ${pts >= 0 ? "points" : "credit"})`, note: "Enter negative points for a lender credit · points make sense if you'll keep the loan past break-even" };
};
export const inspection: Calc = (v) => {
  const s = P(v, "s", 2000, "Square feet"), base = Z(v, "b", 300), per = Z(v, "r", 0.1), add = [Z(v, "a", 0), Z(v, "w", 0), Z(v, "e", 0), Z(v, "m", 0)], age = Z(v, "y", 0);
  const core = base + Math.max(0, s - 1000) * per + (age > 50 ? 75 : 0), tot = core + add.reduce((x, y) => x + y, 0);
  return { c: `≈ ${$(tot)} total`, d: `General inspection ${$(core)}${add[0] ? ` · radon ${$(add[0])}` : ""}${add[1] ? ` · termite/WDO ${$(add[1])}` : ""}${add[2] ? ` · sewer scope ${$(add[2])}` : ""}${add[3] ? ` · mold/other ${$(add[3])}` : ""}`, note: "Typical US general inspections run $300–$500 for an average home; larger and older homes cost more · paid at the inspection, not at closing" };
};
export const flDocStamps: Calc = (v) => {
  const price = P(v, "p", 400000, "Price"), loan = Z(v, "l", 320000), deed = Math.ceil(price / 100) * 0.7, note = Math.ceil(loan / 100) * 0.35, intang = loan * 0.002;
  return { t: `Deed doc stamps ${$2(deed)} (usually seller) · note doc stamps ${$2(note)} + intangible tax ${$2(intang)} (buyer, on the mortgage)`, s: `Total state taxes ${$2(deed + note + intang)}`, note: "Florida: $0.70 per $100 on the deed, $0.35 per $100 on new mortgage notes, 0.2% intangible tax on new mortgages · Miami-Dade deeds use $0.60 (+$0.45 surtax on non-single-family) — use the Miami-Dade tool" };
};
const NYC: [number, number][] = [[25e6, 0.039], [20e6, 0.0375], [15e6, 0.035], [10e6, 0.0325], [5e6, 0.0225], [3e6, 0.015], [2e6, 0.0125], [1e6, 0.01]];
export const mansion: Calc = (v) => {
  const price = P(v, "p", 2500000, "Price"), nyc = pick(v.c, 2) === 0, rate = price < 1e6 ? 0 : nyc ? (NYC.find(([t]) => price >= t) ?? [0, 0])[1] : 0.01;
  return { t: rate ? `Mansion tax ${$(price * rate)} (${pc(rate, 2)})` : "No mansion tax — under $1,000,000", d: `${$(price)} ${nyc ? "in New York City" : "elsewhere in New York State"} · paid by the buyer`, note: nyc ? "NYC tiers on the full price: 1% from $1M, 1.25% $2M, 1.5% $3M, 2.25% $5M, 3.25% $10M, 3.5% $15M, 3.75% $20M, 3.9% $25M+ · applies to 1–3 family homes, condos and co-ops" : "Outside NYC the mansion tax is a flat 1% on residential purchases of $1M or more" };
};
// ---- Commercial ----
export const cam: Calc = (v) => {
  const tot = P(v, "t", 180000, "Total CAM costs"), mg = Z(v, "m", 10) / 100, bsf = P(v, "b", 40000, "Building sq ft"), tsf = P(v, "s", 2500, "Your sq ft"), cap = Z(v, "c", 0);
  const share = tsf / bsf, yr = tot * (1 + mg) * share, psf = yr / tsf, capped = cap ? Math.min(psf, cap) : psf;
  return { c: `Your CAM ≈ ${$(capped * tsf)} a year (${$(capped * tsf / 12)}/month)`, d: `${pc(share, 2)} pro-rata share × ${$(tot)} (+${pc(mg, 0)} admin fee) = ${$2(psf)}/sq ft${cap && psf > cap ? ` — capped at ${$2(cap)}` : ""}`, note: "CAM covers shared areas: landscaping, parking lots, snow removal, security, common utilities · ask for the annual reconciliation and any caps on controllable costs" };
};
export const loadFactor: Calc = (v) => {
  const u = P(v, "u", 4000, "Usable sq ft"), lf = num(v.l, 15), rate = Z(v, "r", 35), mode = pick(v.m, 2), r0 = P(v, "x", 4600, "Rentable sq ft");
  const rsf = mode === 0 ? u * (1 + lf / 100) : r0, LF = rsf / u - 1;
  return { r: `Rentable area ${f(rsf)} sq ft (load factor ${pc(LF, 1)})`, c: rate ? `Rent ${$(rsf * rate)} a year · effective ${$2((rsf * rate) / u)}/usable sq ft vs ${$2(rate)} quoted` : `Add-on factor ${f(rsf / u)}`, note: "Rentable = usable × (1 + load factor) — you pay for a share of lobbies, corridors and restrooms · office load factors are often 10–20% (BOMA)" };
};
export const escalation: Calc = (v) => {
  const r = P(v, "r", 30, "Starting rent"), sf = P(v, "s", 3000, "Square feet"), e = Z(v, "e", 3) / 100, y = Math.max(1, Math.round(num(v.y, 5))), fixed = pick(v.t, 2) === 1, step = Z(v, "x", 1);
  let tot = 0; const rows: string[] = []; for (let k = 0; k < y; k++) { const pr = fixed ? r + step * k : r * (1 + e) ** k; tot += pr * sf; if (k < 10) rows.push(`Y${k + 1} ${$2(pr)}`); }
  return { t: `Total rent over ${y} years ${$(tot)}`, r: `Per sq ft: ${rows.join(" · ")}${y > 10 ? " …" : ""}`, note: `${fixed ? `Fixed step of ${$2(step)}/sq ft a year` : `${pc(e, 1)} annual escalation`} · average ${$2(tot / sf / y)}/sq ft/year` };
};
export const retailPsf: Calc = (v) => {
  const s = P(v, "s", 1500000, "Annual sales"), sf = P(v, "a", 3000, "Selling sq ft"), rent = Z(v, "r", 120000), pctR = Z(v, "p", 6) / 100, bp = Z(v, "b", 0);
  const psf = s / sf, occ = rent / s, over = bp && s > bp ? (s - bp) * pctR : 0;
  return { s: `${$2(psf)} sales per sq ft`, o: `Occupancy cost ${pc(occ, 1)} of sales${over ? ` · percentage rent ${$(over)} on sales over the ${$(bp)} breakpoint` : ""}`, note: "Healthy retail occupancy costs are often 8–15% of sales · use selling area, not total area, for comparisons" };
};
export const selfStorage: Calc = (v) => {
  const units = P(v, "u", 400, "Units"), rent = P(v, "r", 110, "Average rent"), occ = Math.min(100, Z(v, "o", 88)) / 100, opx = Z(v, "x", 38) / 100, price = P(v, "p", 4500000, "Price"), dn = Z(v, "d", 30) / 100, rate = Z(v, "i", 7) / 100;
  const gpr = units * rent * 12, egi = gpr * occ, noi = egi * (1 - opx), loan = price * (1 - dn), ds = pmt(loan, rate / 12, 300) * 12, cf = noi - ds;
  return { n: `NOI ${$(noi)} · cap rate ${pc(noi / price, 2)}`, c: `Cash flow ${$(cf)} a year · cash-on-cash ${pc(cf / (price * dn), 2)} · DSCR ${f(noi / ds)}`, note: `${units} units × ${$(rent)} × ${pc(occ, 0)} occupancy − ${pc(opx, 0)} expenses · 25-year amortisation on ${$(loan)} · storage expense ratios are often 30–40%` };
};
export const mhPark: Calc = (v) => {
  const lots = P(v, "l", 100, "Lots"), rent = P(v, "r", 450, "Lot rent"), occ = Math.min(100, Z(v, "o", 90)) / 100, other = Z(v, "x", 0), opx = Z(v, "e", 35) / 100, cap = P(v, "c", 8, "Cap rate") / 100;
  const egi = lots * rent * 12 * occ + other, noi = egi * (1 - opx), val = noi / cap;
  return { v: `Value ≈ ${$(val)} (${$(val / lots)} per lot)`, n: `NOI ${$(noi)} from ${$(egi)} income at ${pc(occ, 0)} occupancy`, note: `Income approach at a ${pc(cap, 1)} cap rate · park-owned homes, utilities billing and lot-rent upside change value a lot · expense ratios often 30–40%` };
};
export const revpar: Calc = (v) => {
  const rooms = P(v, "r", 120, "Rooms"), adr = P(v, "a", 160, "ADR"), occ = Math.min(100, Z(v, "o", 72)) / 100, days = Math.max(1, num(v.d, 30)), other = Z(v, "x", 0);
  const rp = adr * occ, rev = rp * rooms * days;
  return { r: `RevPAR = ${$2(rp)}`, t: `Room revenue ${$(rev)} over ${f(days)} days (${f(rooms * days * occ)} room-nights sold)${other ? ` · TRevPAR ${$2(rp + other / (rooms * days))}` : ""}`, note: "RevPAR = ADR × occupancy = room revenue ÷ available room-nights · compare with your competitive set (RGI = your RevPAR ÷ comp set)" };
};
export const parkingLot: Calc = (v) => {
  const s = P(v, "s", 200, "Spaces"), d = Z(v, "d", 12), oc = Math.min(100, Z(v, "o", 70)) / 100, days = Z(v, "w", 300), mo = Z(v, "m", 20), mr = Z(v, "r", 150), opx = Z(v, "x", 30) / 100;
  const daily = (s - mo) * oc * d * days, monthly = mo * mr * 12, rev = daily + monthly, noi = rev * (1 - opx);
  return { r: `Revenue ≈ ${$(rev)} a year`, n: `NOI ${$(noi)} after ${pc(opx, 0)} costs (${$(noi / s)} per space)`, note: `${s - mo} transient spaces at ${pc(oc, 0)} × ${$(d)}/day × ${f(days)} days + ${mo} monthly permits at ${$(mr)}` };
};
export const equityMultiple: Calc = (v) => {
  const inv = P(v, "i", 100000, "Equity invested"), dist = Z(v, "d", 45000), sale = Z(v, "s", 150000), y = P(v, "y", 5, "Hold years"), em = (dist + sale) / inv;
  return { e: `Equity multiple = ${f(em)}×`, p: `Total profit ${$(dist + sale - inv)} on ${$(inv)} · ≈ ${pc(em ** (1 / y) - 1, 1)} a year compound (if received at the end)`, note: "EM = total cash returned ÷ equity invested — it ignores timing, so pair it with IRR · 1.8–2.2× over 5–7 years is typical for value-add deals" };
};
export const waterfall: Calc = (v) => {
  const lp = P(v, "l", 900000, "LP equity"), gp = Z(v, "g", 100000), cash = P(v, "c", 1600000, "Total distributable"), pref = Z(v, "p", 8) / 100, y = P(v, "y", 5, "Years"), promo = Z(v, "s", 30) / 100;
  const eq = lp + gp, prefAmt = eq * ((1 + pref) ** y - 1), afterRoc = Math.max(0, cash - eq), toPref = Math.min(afterRoc, prefAmt), rest = afterRoc - toPref;
  const lpTot = Math.min(cash, eq) * (lp / eq) + toPref * (lp / eq) + rest * (1 - promo) * (lp / eq), gpTot = cash - lpTot;
  return { s: `LP receives ${$(lpTot)} (${f(lpTot / lp)}×) · GP receives ${$(gpTot)} (${gp ? f(gpTot / gp) + "×" : "promote only"})`, t: `Tiers: return of capital ${$(Math.min(cash, eq))} → ${pc(pref, 0)} pref ${$(toPref)} → remaining ${$(rest)} split ${pc(1 - promo, 0)}/${pc(promo, 0)} (GP promote)`, note: "Simple American-style waterfall, compounding pref, no catch-up · real operating agreements add catch-ups, IRR hurdles and clawbacks" };
};
export const prefReturn: Calc = (v) => {
  const inv = P(v, "i", 100000, "Investment"), r = Z(v, "r", 8) / 100, y = P(v, "y", 3, "Years"), paid = Z(v, "p", 12000), comp = pick(v.c, 2) === 1;
  const owed = comp ? inv * ((1 + r) ** y - 1) : inv * r * y, acc = Math.max(0, owed - paid);
  return { p: `Preferred return earned ${$(owed)} over ${f(y)} years`, a: `${$(paid)} paid so far → ${$(acc)} accrued and unpaid`, note: `${comp ? "Compounding" : "Simple (non-compounding)"} ${pc(r, 1)} pref · investors get this before the sponsor shares in profits · cumulative prefs carry unpaid amounts forward` };
};
export const syndication: Calc = (v) => {
  const inv = P(v, "i", 50000, "Investment"), coc = Z(v, "c", 6) / 100, y = Math.max(1, Math.round(num(v.y, 5))), mult = P(v, "m", 1.6, "Exit multiple on equity"), fee = Z(v, "f", 0) / 100;
  const cf: number[] = [-inv]; for (let k = 1; k <= y; k++) cf.push(inv * coc * (1 - fee) + (k === y ? inv * mult : 0));
  let lo = -0.9, hi = 1; const npv = (r: number) => cf.reduce((s, c, i) => s + c / (1 + r) ** i, 0); for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (npv(m) > 0) lo = m; else hi = m; }
  const tot = cf.slice(1).reduce((a, b) => a + b, 0);
  return { r: `IRR ≈ ${pc((lo + hi) / 2, 1)} · equity multiple ${f(tot / inv)}×`, c: `${$(inv * coc * (1 - fee))} a year in distributions + ${$(inv * mult)} at exit in year ${y}`, note: "Projected returns aren't guaranteed — check the sponsor's track record, fees (acquisition, asset management, disposition) and debt terms" };
};
export const groundLease: Calc = (v) => {
  const rent = P(v, "r", 120000, "Ground rent"), esc = Z(v, "e", 2) / 100, y = Math.max(1, Math.round(num(v.y, 50))), d = P(v, "d", 6, "Discount rate") / 100, rev = Z(v, "x", 0);
  let pv = 0; for (let k = 1; k <= y; k++) pv += (rent * (1 + esc) ** (k - 1)) / (1 + d) ** k; const rv = rev / (1 + d) ** y;
  return { v: `Leased fee value ≈ ${$(pv + rv)}`, d: `PV of ${y} years of rent ${$(pv)}${rev ? ` + PV of land reversion ${$(rv)}` : ""} · implied cap rate ${pc(rent / (pv + rv), 2)}`, note: `${pc(esc, 1)} rent growth discounted at ${pc(d, 1)} · long ground leases trade like bonds — CPI resets and reversion of improvements matter` };
};
// ---- Home buying & affordability ----
export const priceIncome: Calc = (v) => {
  const price = P(v, "p", 420000, "Home price"), inc = P(v, "i", 95000, "Household income"), r = price / inc;
  return { r: `Price-to-income ratio = ${f(r)}×`, v: r <= 3 ? "Affordable (3× or less)" : r <= 4 ? "Moderately unaffordable (3–4×)" : r <= 5 ? "Seriously unaffordable (4–5×)" : "Severely unaffordable (over 5×)", note: `A 3× ratio would be ${$(inc * 3)} · bands follow the Demographia housing affordability survey · the US median has been around 5×` };
};
export const buyWait: Calc = (v) => {
  const price = P(v, "p", 400000, "Price"), app = num(v.a, 3) / 100, r0 = P(v, "r", 6.5, "Rate now") / 100, r1 = P(v, "f", 6.0, "Future rate") / 100, m = Math.max(1, num(v.m, 12)), dn = Z(v, "d", 20) / 100, rent = Z(v, "x", 2200), n = 360;
  const p1 = price * (1 + app) ** (m / 12), now = pmt(price * (1 - dn), r0 / 12, n), later = pmt(p1 * (1 - dn), r1 / 12, n), extraDown = (p1 - price) * dn;
  return { c: `Buy now: ${$2(now)}/mo · wait ${f(m)} months: ${$2(later)}/mo on a ${$(p1)} price`, d: `Waiting costs ${$(rent * m)} in rent and ${$(extraDown)} more down payment; payment ${later < now ? `drops ${$2(now - later)}` : `rises ${$2(later - now)}`}`, note: `Break-even: waiting pays only if the monthly saving × years kept outweighs the rent and extra down payment · you can refinance later if rates fall` };
};
export const upfront: Calc = (v) => {
  const price = P(v, "p", 400000, "Price"), dn = Z(v, "d", 10) / 100, cc = Z(v, "c", 3) / 100, prep = Z(v, "x", 4000), insp = Z(v, "i", 600), move = Z(v, "m", 2500), res = Z(v, "r", 0), cred = Z(v, "s", 0);
  const tot = price * dn + price * cc + prep + insp + move + res - cred;
  return { t: `Cash needed ≈ ${$(tot)}`, d: `Down ${$(price * dn)} · closing ${$(price * cc)} · prepaids/escrow ${$(prep)} · inspection/appraisal ${$(insp)} · moving ${$(move)}${res ? ` · reserves ${$(res)}` : ""}${cred ? ` − seller credits ${$(cred)}` : ""}`, note: "Closing costs are typically 2–5% of the price · prepaids include initial escrow for taxes and insurance and prepaid interest" };
};
export const condoHouse: Calc = (v) => {
  const [cp, ch, ct, ci, cm] = ["a", "b", "c", "d", "e"].map((k, i) => Z(v, k, [350000, 450, 4000, 600, 1000][i])), [hp, ht, hi, hm] = ["f", "g", "h", "i"].map((k, i) => Z(v, k, [420000, 5000, 1800, 4200][i])), r = Z(v, "r", 6.5) / 100, dn = Z(v, "x", 20) / 100;
  const pc0 = pmt(cp * (1 - dn), r / 12, 360) * 12, ph = pmt(hp * (1 - dn), r / 12, 360) * 12, condo = pc0 + ch * 12 + ct + ci + cm, house = ph + ht + hi + hm;
  return { c: `Condo ${$(condo)}/yr vs house ${$(house)}/yr — ${condo <= house ? `condo saves ${$(house - condo)}` : `house saves ${$(condo - house)}`}`, d: `Condo: mortgage ${$(pc0)}, HOA ${$(ch * 12)}, tax ${$(ct)}, HO-6 insurance ${$(ci)}, upkeep ${$(cm)} · house: mortgage ${$(ph)}, tax ${$(ht)}, insurance ${$(hi)}, upkeep ${$(hm)} (≈1%)`, note: "Check the condo's reserve study and special-assessment history · HOA covers the exterior, so condo maintenance is lower" };
};
export const newVsExisting: Calc = (v) => {
  const np = P(v, "a", 450000, "New build price"), ep = P(v, "b", 400000, "Existing price"), up = Z(v, "c", 25000), wt = Z(v, "d", 15000), rep = Z(v, "e", 30000), y = Math.max(1, num(v.y, 10)), nm = Z(v, "f", 1500), em = Z(v, "g", 4500), ns = Z(v, "h", 600), es = Z(v, "i", 0);
  const nTot = np + up + wt + (nm - ns) * y, eTot = ep + rep + (em - es) * y;
  return { c: `${y}-year cost: new ${$(nTot)} vs existing ${$(eTot)} — ${nTot <= eTot ? `new saves ${$(eTot - nTot)}` : `existing saves ${$(nTot - eTot)}`}`, d: `New: price + upgrades ${$(up)} + landscaping/blinds ${$(wt)} + upkeep ${$(nm)}/yr − energy savings ${$(ns)}/yr · existing: price + repairs/updates ${$(rep)} + upkeep ${$(em)}/yr`, note: "New builds often carry builder warranties and lower energy bills; existing homes come with established neighbourhoods and room to negotiate" };
};
export const commuteTrade: Calc = (v) => {
  const pc0 = P(v, "a", 520000, "Closer home"), pf = P(v, "b", 420000, "Farther home"), mi = Z(v, "m", 25), min = Z(v, "t", 40), days = Z(v, "d", 230), cpm = Z(v, "c", 0.76), hv = Z(v, "h", 25), r = Z(v, "r", 6.5) / 100, dn = Z(v, "x", 20) / 100;
  const save = (pmt(pc0 * (1 - dn), r / 12, 360) - pmt(pf * (1 - dn), r / 12, 360)) * 12, drive = mi * 2 * days * cpm, time = ((min * 2 * days) / 60) * hv;
  return { r: save > drive + time ? `Farther home wins by ${$(save - drive - time)} a year` : `Closer home wins by ${$(drive + time - save)} a year`, d: `Mortgage saving ${$(save)} vs extra driving ${$(drive)} + time ${$(time)} (${f((min * 2 * days) / 60)} h at ${$(hv)}/h)`, note: `Extra ${f(mi)} miles each way at ${$2(cpm)}/mile (IRS 2026 rate from July) · time value is your choice` };
};
export const escalationClause: Calc = (v) => {
  const base = P(v, "b", 400000, "Your offer"), inc = P(v, "i", 2500, "Escalation increment"), cap = P(v, "c", 430000, "Maximum price"), comp = Z(v, "x", 418000), apr = Z(v, "a", 0), dn = Z(v, "d", 20) / 100;
  const price = comp >= base ? Math.min(cap, comp + inc) : base, gap = apr && apr < price ? price - apr : 0;
  return { p: comp > cap ? `You lose — the competing ${$(comp)} beats your ${$(cap)} cap` : `Your price escalates to ${$(price)}`, g: gap ? `Appraisal gap ${$(gap)} — you'd cover it in cash on top of the ${$(price * dn)} down payment` : "No appraisal gap entered", note: `Beat any bona fide offer by ${$(inc)} up to ${$(cap)} · ask for proof of the competing offer and consider an appraisal-gap clause` };
};
export const coBuy: Calc = (v) => {
  const price = P(v, "p", 500000, "Price"), a = Z(v, "a", 60000), b = Z(v, "b", 40000), ia = Z(v, "i", 90000), ib = Z(v, "j", 60000), r = Z(v, "r", 6.5) / 100, mode = pick(v.m, 3), cost = Z(v, "c", 900);
  const dn = a + b, loan = price - dn, mo = pmt(loan, r / 12, 360) + cost, sa = mode === 0 ? 0.5 : mode === 1 ? ia / (ia + ib || 1) : dn ? a / dn : 0.5;
  return { s: `Owner A pays ${$2(mo * sa)}/mo · Owner B pays ${$2(mo * (1 - sa))}/mo`, e: `Equity today: A ${pc((a + loan * sa) / price, 0)} (${$(a)} down) · B ${pc((b + loan * (1 - sa)) / price, 0)} (${$(b)} down)`, note: `Split ${["50/50", "by income", "by down payment"][mode]} on ${$2(mo)}/mo (P&I + ${$(cost)} taxes/insurance) · put it in a co-ownership agreement and title as tenants in common with stated shares` };
};
export const parentGift: Calc = (v) => {
  const g = P(v, "g", 60000, "Gift"), givers = Math.max(1, Math.round(num(v.n, 2))), recips = Math.max(1, Math.round(num(v.r, 2))), excl = 19000 * givers * recips, over = Math.max(0, g - excl);
  return { e: over ? `${$(over)} over the annual exclusion — file Form 709 (no tax due unless lifetime gifts exceed $15M per giver)` : `Within the ${$(excl)} annual exclusion — no gift-tax return needed`, d: `2026 exclusion $19,000 per giver per recipient × ${givers} giver${givers > 1 ? "s" : ""} × ${recips} recipient${recips > 1 ? "s" : ""}`, note: "Lenders want a signed gift letter and the transfer paper trail · gifting to the buyer's spouse too doubles the exclusion · not tax advice" };
};
// ---- Home value, equity & selling ----
export const fsbo: Calc = (v) => {
  const price = P(v, "p", 450000, "Price"), lc = Z(v, "l", 2.75) / 100, bc = Z(v, "b", 2.5) / 100, pay = pick(v.x, 2) === 0, mk = Z(v, "m", 1500), atty = Z(v, "a", 1200), disc = Z(v, "d", 3) / 100;
  const agent = price * (lc + bc), fs = (pay ? price * bc : 0) + mk + atty, fsPrice = price * (1 - disc);
  const sv = agent - fs - (price - fsPrice);
  return { s: sv >= 0 ? `FSBO saves ≈ ${$(sv)}` : `FSBO costs ≈ ${$(-sv)} more than using an agent`, d: `Agent route: ${$(agent)} commission · FSBO: ${pay ? `${$(price * bc)} buyer-agent fee + ` : ""}${$(mk + atty)} marketing & attorney, and ${pc(disc, 0)} lower price (${$(price - fsPrice)})`, note: "Studies often find FSBO homes sell for less — enter the discount you expect · since the 2024 NAR settlement, buyer-agent pay is negotiated separately" };
};
export const flatFee: Calc = (v) => {
  const price = P(v, "p", 450000, "Price"), lc = Z(v, "l", 2.75) / 100, ff = Z(v, "f", 500), bc = Z(v, "b", 2.5) / 100, pay = pick(v.x, 2) === 0;
  const trad = price * (lc + (pay ? bc : 0)), flat = ff + (pay ? price * bc : 0);
  return { s: `Flat-fee MLS saves ≈ ${$(trad - flat)}`, d: `Traditional listing ${$(trad)} vs flat fee ${$(ff)}${pay ? ` + ${$(price * bc)} buyer-agent fee` : ""}`, note: "You get MLS exposure but handle showings, pricing and negotiation yourself · check what the package includes (photos, lockbox, contract help)" };
};
export const ibuyer: Calc = (v) => {
  const offer = P(v, "o", 430000, "iBuyer offer"), fee = Z(v, "f", 5) / 100, rep = Z(v, "r", 6000), mkt = P(v, "m", 450000, "Market sale price"), comm = Z(v, "c", 5.5) / 100, cc = Z(v, "x", 1) / 100, prep = Z(v, "p", 4000), hold = Z(v, "h", 3000);
  const ib = offer * (1 - fee - cc) - rep, trad = mkt * (1 - comm - cc) - prep - hold;
  return { n: `iBuyer nets ${$(ib)} vs traditional ${$(trad)} — ${ib >= trad ? `iBuyer ahead by ${$(ib - trad)}` : `traditional ahead by ${$(trad - ib)}`}`, d: `iBuyer: offer − ${pc(fee, 1)} service fee − repair deduction ${$(rep)} · traditional: ${pc(comm, 1)} commissions, prep ${$(prep)}, holding costs ${$(hold)}`, note: "You pay for speed and certainty · get the final offer after inspection — repair deductions often change it" };
};
export const priceCut: Calc = (v) => {
  const p = P(v, "p", 500000, "List price"), cut = Z(v, "c", 3) / 100, r = Z(v, "r", 6.5) / 100, dn = Z(v, "d", 20) / 100, hold = Z(v, "h", 3500);
  const np = p * (1 - cut), dpm = pmt((p - np) * (1 - dn), r / 12, 360);
  return { n: `New price ${$(np)} (−${$(p - np)})`, b: `Lowers a buyer's payment by ${$2(dpm)}/month · may reach buyers searching under ${$(Math.floor(np / 25000) * 25000 + (np % 25000 === 0 ? 0 : 25000))}`, note: `The cut equals about ${f((p - np) / hold)} months of your ${$(hold)} holding costs · cutting to just under a search band (e.g. $499k) gets more views` };
};
export const domCost: Calc = (v) => {
  const m = Z(v, "m", 3), pi = Z(v, "a", 1900), tx = Z(v, "t", 450), ins = Z(v, "i", 150), ut = Z(v, "u", 250), hoa = Z(v, "h", 0), other = Z(v, "o", 100), price = P(v, "p", 450000, "Price");
  const mo = pi + tx + ins + ut + hoa + other, tot = mo * m;
  return { c: `${$(tot)} to carry the home for ${f(m)} months`, d: `${$(mo)}/month: mortgage ${$(pi)}, tax ${$(tx)}, insurance ${$(ins)}, utilities ${$(ut)}${hoa ? `, HOA ${$(hoa)}` : ""}, upkeep ${$(other)}`, note: `That's ${pc(tot / price, 2)} of the price · a ${$(tot)} price cut now can beat waiting months` };
};
export const sec121: Calc = (v) => {
  const sale = P(v, "s", 750000, "Sale price"), basis = P(v, "b", 300000, "Cost basis"), sc = Z(v, "c", 40000), mfj = pick(v.f, 2) === 1, yrs = Math.min(2, Z(v, "y", 2)), rate = Z(v, "r", 15) / 100;
  const gain = sale - sc - basis, full = mfj ? 500000 : 250000, excl = full * (yrs / 2), tax = Math.max(0, gain - excl);
  return { g: `Gain ${$(gain)} · exclusion ${$(Math.min(Math.max(0, gain), excl))}`, t: tax ? `Taxable gain ${$(tax)} ≈ ${$(tax * rate)} tax at ${pc(rate, 0)}` : "Fully excluded — no federal capital-gains tax", note: `§121: ${$(full)} if you owned and lived there 2 of the last 5 years${yrs < 2 ? ` · prorated to ${f(yrs)} years (needs a work, health or unforeseen-event reason)` : ""} · add improvements to your basis · state tax and 3.8% NIIT may apply` };
};
export const comps: Calc = (v) => {
  const sp = P(v, "p", 410000, "Comp sale price"), sfS = P(v, "s", 2000, "Subject sq ft"), sfC = P(v, "c", 1850, "Comp sq ft"), psf = Z(v, "r", 90), bd = num(v.b, 0), bdv = Z(v, "bv", 10000), ba = num(v.a, 0.5), bav = Z(v, "av", 8000), g = num(v.g, 0), gv = Z(v, "gv", 15000), cond = num(v.x, 0), age = Z(v, "m", 4), mt = Z(v, "t", 0.3) / 100;
  const adj = (sfS - sfC) * psf + bd * bdv + ba * bav + g * gv + cond, time = sp * mt * age, val = sp + adj + time;
  return { v: `Adjusted value ≈ ${$(val)}`, d: `Size ${$((sfS - sfC) * psf)} · bedrooms ${$(bd * bdv)} · baths ${$(ba * bav)} · garage ${$(g * gv)} · condition ${$(cond)} · market time ${$(time)}`, note: `Net adjustment ${pc((adj + time) / sp, 1)} — appraisers prefer comps needing under ~15% net · enter differences as subject minus comp` };
};
export const improveValue: Calc = (v) => {
  const cost = P(v, "c", 30000, "Project cost"), roi = Z(v, "r", 70) / 100, yrs = Z(v, "y", 5), enjoy = Z(v, "e", 0);
  const val = cost * roi;
  return { v: `Adds ≈ ${$(val)} of resale value (${pc(roi, 0)} recouped)`, n: `Net cost ${$(cost - val)}${enjoy ? ` — or ${$(cost - val - enjoy * yrs)} after ${f(yrs)} years of enjoyment worth ${$(enjoy)}/yr` : ""}`, note: "National cost-vs-value surveys put most remodels at 50–90% recouped (garage doors, entry doors and minor kitchen remodels near the top; additions and luxury projects lower) — enter your local figure" };
};

// ---- registry (generated)
export const ideaRe1CustomCalculators: Record<string, Calc> = {
  "escrow-fee-calculator": escrowFee,
  "prorated-property-tax-at-closing-calculator": proTax,
  "prorated-hoa-dues-calculator": proHoa,
  "seller-concessions-max-calculator": concessions,
  "lender-credit-vs-points-calculator": creditVsPoints,
  "home-inspection-cost-calculator": inspection,
  "florida-doc-stamps-calculator": flDocStamps,
  "new-york-mansion-tax-calculator": mansion,
  "cam-charges-calculator": cam,
  "rentable-vs-usable-square-feet-load-factor-calculator": loadFactor,
  "lease-escalation-rent-calculator": escalation,
  "retail-sales-per-square-foot-calculator": retailPsf,
  "self-storage-facility-roi-calculator": selfStorage,
  "mobile-home-park-valuation-calculator": mhPark,
  "hotel-revpar-calculator": revpar,
  "parking-lot-revenue-calculator": parkingLot,
  "equity-multiple-calculator": equityMultiple,
  "real-estate-waterfall-distribution-calculator": waterfall,
  "preferred-return-calculator": prefReturn,
  "syndication-return-calculator": syndication,
  "ground-lease-value-calculator": groundLease,
  "house-price-to-income-ratio-calculator": priceIncome,
  "buy-now-vs-wait-calculator": buyWait,
  "home-buying-total-upfront-cost-calculator": upfront,
  "condo-vs-house-cost-calculator": condoHouse,
  "new-build-vs-existing-home-calculator": newVsExisting,
  "commute-vs-home-price-tradeoff-calculator": commuteTrade,
  "bidding-war-escalation-clause-calculator": escalationClause,
  "co-buying-home-split-calculator": coBuy,
  "parent-help-down-payment-gift-calculator": parentGift,
  "for-sale-by-owner-savings-calculator": fsbo,
  "flat-fee-mls-savings-calculator": flatFee,
  "ibuyer-offer-net-calculator": ibuyer,
  "price-reduction-impact-calculator": priceCut,
  "days-on-market-cost-calculator": domCost,
  "capital-gains-home-sale-exclusion-calculator": sec121,
  "comparable-sales-adjustment-calculator": comps,
  "home-improvement-value-added-calculator": improveValue,
};
