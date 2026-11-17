/**
 * Idea build, batch car1 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Car Buying & Selling (14) and Car Lease, Rental & Transport (13) = 27 tools.
 * Loans use the standard amortised payment; money factor × 2400 = APR; one-pay lease
 * OP = (C − R + (C + R)·MF·n) ÷ (1 + MF·n), since rent is charged on the cap cost net of the payment.
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const pmt = (P: number, apr: number, n: number) => { const r = apr / 1200; return r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n; };
const pv = (pay: number, apr: number, n: number) => { const r = apr / 1200; return r ? (pay * (1 - Math.pow(1 + r, -n))) / r : pay * n; };

// ---- Buying & selling ----
export const invoice: Calc = (v) => {
  const msrp = need(p(v, "m", 42000), "Enter MSRP."), inv = need(p(v, "i", 39500), "Enter invoice price."), hb = p(v, "h", 2) / 100, inc = p(v, "c", 500);
  const cost = inv - msrp * hb - inc;
  return { cost: `${$0(cost)} estimated true dealer cost`, room: `${$0(msrp - inv)} between MSRP and invoice (${pc((msrp - inv) / msrp, 1)})`, offer: `Fair offer: ${$0(inv - inc)} – ${$0(inv * 1.02)}`, hb: `${$0(msrp * hb)} holdback + ${$0(inc)} dealer incentives` };
};
export const dealerFees: Calc = (v) => {
  const price = need(p(v, "p", 35000), "Enter vehicle price."), doc = p(v, "d", 499), dest = p(v, "ds", 1395), tr = p(v, "t", 350), tax = p(v, "x", 7) / 100, add = p(v, "a", 0), trade = p(v, "tr", 0);
  const taxable = Math.max(0, price + doc + add - trade), otd = price + doc + dest + tr + add + taxable * tax - trade;
  return { otd: `${$0(otd)} out-the-door price`, fees: `${$0(doc + dest + tr + add)} in fees (${pc((doc + dest + tr + add) / price, 1)} of price)`, tax: `${$0(taxable * tax)} sales tax${trade ? ` after a ${$0(trade)} trade-in credit` : ""}` };
};
export const rebateApr: Calc = (v) => {
  const price = need(p(v, "p", 35000), "Enter price."), down = p(v, "d", 5000), reb = p(v, "r", 3000), std = p(v, "s", 7), promo = p(v, "a", 1.9), n = Math.max(1, Math.round(p(v, "n", 60)));
  const A = pmt(price - down - reb, std, n), B = pmt(price - down, promo, n);
  return { a: `Rebate + ${std}% loan: ${$(A)} a month (${$0(A * n)} total)`, b: `${promo}% APR, no rebate: ${$(B)} a month (${$0(B * n)} total)`, win: A < B ? `Take the rebate — saves ${$0((B - A) * n)}` : `Take the low APR — saves ${$0((A - B) * n)}` };
};
export const tradeEquity: Calc = (v) => {
  const val = p(v, "v", 14000), owe = p(v, "o", 17500), tax = p(v, "t", 7) / 100, rate = p(v, "r", 7), n = Math.max(1, Math.round(p(v, "n", 60)));
  const eq = val - owe;
  return { eq: `${eq >= 0 ? "" : "−"}${$0(Math.abs(eq))} ${eq >= 0 ? "positive" : "negative"} equity`, tax: `${$0(val * tax)} sales-tax saving where trade-ins reduce the taxable price`, roll: eq < 0 ? `Rolling it in adds ${$(pmt(-eq, rate, n))} a month and ${$0(pmt(-eq, rate, n) * n + eq)} interest` : `${$0(eq)} can go toward the down payment` };
};
export const cpo: Calc = (v) => {
  const prem = p(v, "c", 25000) - p(v, "u", 23200), yrs = p(v, "y", 2), rep = p(v, "r", 700), chance = p(v, "k", 60) / 100;
  const val = yrs * rep * chance;
  return { prem: `${$0(prem)} CPO premium`, val: `${$0(val)} expected repair value of the extra coverage`, verdict: val >= prem ? "CPO premium looks worth it" : `Premium exceeds expected value by ${$0(prem - val)} — negotiate or self-insure` };
};
export const warranty: Calc = (v) => {
  const cost = p(v, "c", 2500), yrs = p(v, "y", 3), rep = p(v, "r", 900), visits = p(v, "n", 1.5), ded = p(v, "d", 100);
  const covered = rep * yrs - visits * yrs * ded;
  return { ev: `${$0(covered - cost)} expected ${covered >= cost ? "gain" : "loss"} from the warranty`, covered: `${$0(covered)} expected covered repairs after deductibles`, note: "Warranties are priced to profit the seller on average — they pay off mainly on unreliable models" };
};
export const budgetSalary: Calc = (v) => {
  const inc = need(p(v, "i", 75000), "Enter gross income."), ins = p(v, "s", 150), rate = p(v, "r", 7), cap = p(v, "c", 10) / 100;
  const pay = Math.max(0, (inc / 12) * cap - ins), loan = pv(pay, rate, 48), price = loan / 0.8;
  return { price: `${$0(price)} maximum car price (20/4/10 rule)`, pay: `${$(pay)} a month loan payment over 4 years`, down: `${$0(price * 0.2)} down payment (20%)` };
};
export const priceIncome: Calc = (v) => {
  const pr = p(v, "p", 35000), inc = need(p(v, "i", 75000), "Enter annual income.");
  const r = pr / inc;
  return { r: `${pc(r)} of annual income`, verdict: r <= 0.35 ? "Comfortable — within 35% of income" : r <= 0.5 ? "Stretch — common but above the conservative guideline" : "High — over half your annual income", max: `${$0(inc * 0.35)} price at 35% of income` };
};
export const titleFee: Calc = (v) => {
  const price = p(v, "p", 12000), tax = p(v, "x", 6.25) / 100, title = p(v, "t", 75), reg = p(v, "r", 120), plate = p(v, "pl", 25), insp = p(v, "i", 0);
  const tot = price * tax + title + reg + plate + insp;
  return { tot: `${$0(tot)} to title and register`, tax: `${$0(price * tax)} sales or use tax`, fees: `${$0(title + reg + plate + insp)} title, registration and plate fees` };
};
export const ppi: Calc = (v) => {
  const cost = p(v, "c", 175), ch = p(v, "k", 25) / 100, rep = p(v, "r", 1500), neg = p(v, "n", 50) / 100;
  const ev = ch * rep * neg;
  return { ev: `${$0(ev - cost)} expected net value`, val: `${$0(ev)} expected savings (problem found × repair × share recovered or avoided)`, note: "A pre-purchase inspection also gives negotiating leverage and peace of mind" };
};
export const privateTrade: Calc = (v) => {
  const priv = p(v, "p", 18000), trade = p(v, "t", 15500), tax = p(v, "x", 7) / 100, cost = p(v, "c", 250), hrs = p(v, "h", 10), val = p(v, "w", 25);
  const tradeNet = trade * (1 + tax), privNet = priv - cost - hrs * val;
  return { diff: privNet > tradeNet ? `Private sale nets ${$0(privNet - tradeNet)} more` : `Trade-in nets ${$0(tradeNet - privNet)} more`, priv: `${$0(privNet)} private sale after costs and your time`, trade: `${$0(tradeNet)} trade-in value incl. ${$0(trade * tax)} sales-tax credit` };
};
export const evCredit: Calc = (v) => {
  const price = need(p(v, "p", 42000), "Enter vehicle price."), fed = p(v, "f", 0), st = p(v, "s", 2000), ut = p(v, "u", 500), ch = p(v, "c", 1200), chc = p(v, "cc", 0);
  const net = price - fed - st - ut + ch - chc;
  return { net: `${$0(net)} effective price`, inc: `${$0(fed + st + ut + chc)} in incentives`, note: "The US federal clean vehicle credit ended for vehicles acquired after 30 Sep 2025 — check state, utility and charger programs" };
};
export const hybrid: Calc = (v) => {
  const prem = p(v, "p", 3000), mh = need(p(v, "h", 48), "Enter hybrid mpg."), mg = need(p(v, "g", 32), "Enter gas mpg."), mi = p(v, "m", 12000), gas = p(v, "c", 3.3);
  const sav = mi * gas * (1 / mg - 1 / mh);
  return { be: sav > 0 ? `${(prem / sav).toFixed(1)} years to break even` : "Never breaks even", sav: `${$0(sav)} fuel saved a year`, gal: `${nfmt(Math.round(mi / mg - mi / mh))} gallons saved a year` };
};
const tco = (v: Record<string, number>, s: string, d: number[], yrs: number, mi: number, gas: number) => {
  const [price, mpg, ins, mnt, res] = ["p", "m", "i", "x", "r"].map((k, i) => p(v, k + s, d[i]));
  return price - price * (res / 100) + yrs * (ins + mnt + (mi / Math.max(mpg, 1)) * gas);
};
export const truckSuv: Calc = (v) => {
  const yrs = Math.max(1, p(v, "y", 5)), mi = p(v, "mi", 12000), gas = p(v, "g", 3.3);
  const a = tco(v, "a", [48000, 20, 1800, 900, 55], yrs, mi, gas), b = tco(v, "b", [42000, 26, 1600, 800, 50], yrs, mi, gas);
  return { a: `Truck ${$0(a)} over ${yrs} years (${$0(a / yrs)} a year)`, b: `SUV ${$0(b)} over ${yrs} years (${$0(b / yrs)} a year)`, win: a < b ? `Truck is ${$0(b - a)} cheaper` : `SUV is ${$0(a - b)} cheaper` };
};

// ---- Lease, rental & transport ----
export const residual: Calc = (v) => {
  const msrp = need(p(v, "m", 40000), "Enter MSRP."), r = p(v, "r", 58) / 100, cap = p(v, "c", 38000), n = Math.max(1, p(v, "n", 36));
  const R = msrp * r;
  return { R: `${$0(R)} residual value`, dep: `${$0(cap - R)} depreciation you pay over the lease`, mo: `${$(Math.max(0, cap - R) / n)} a month depreciation (before rent and tax)` };
};
export const moneyFactor: Calc = (v) => {
  const mf = p(v, "m", 0.0025), apr = p(v, "a", 0);
  return { apr: `${(mf * 2400).toFixed(2)}% APR equivalent`, mf: apr ? `${(apr / 2400).toFixed(5)} money factor for ${apr}% APR` : `${mf.toFixed(5)} money factor`, note: "APR ≈ money factor × 2,400" };
};
export const onePay: Calc = (v) => {
  const C = need(p(v, "c", 38000), "Enter capitalized cost."), R = p(v, "r", 22000), mf = p(v, "m", 0.0025), mfo = p(v, "o", 0.0021), n = Math.max(1, Math.round(p(v, "n", 36))), tax = p(v, "t", 7) / 100;
  const monthly = ((C - R) / n + (C + R) * mf) * (1 + tax), op = ((C - R + (C + R) * mfo * n) / (1 + mfo * n)) * (1 + tax);
  return { op: `${$0(op)} one-pay lease`, mo: `${$0(monthly * n)} paid monthly (${$(monthly)} × ${n})`, save: `${$0(monthly * n - op)} saved by paying upfront` };
};
export const leaseTransfer: Calc = (v) => {
  const fee = p(v, "f", 595), inc = p(v, "i", 1000), cr = p(v, "c", 50), mon = p(v, "m", 450), left = p(v, "l", 18), term = p(v, "t", 4000);
  const transfer = fee + inc + cr, termCost = term;
  return { cost: `${$0(transfer)} to transfer the lease`, avoid: `${$0(mon * left)} of remaining payments passed on`, vs: transfer < termCost ? `${$0(termCost - transfer)} cheaper than the early termination quote` : `Termination is ${$0(transfer - termCost)} cheaper` };
};
export const earlyTerm: Calc = (v) => {
  const mon = p(v, "m", 450), left = p(v, "l", 14), res = p(v, "r", 22000), mkt = p(v, "v", 24000), fee = p(v, "f", 395), depPart = p(v, "d", 70) / 100;
  const payoff = res + mon * left * depPart, cost = Math.max(0, payoff - mkt) + fee;
  return { cost: `${$0(cost)} estimated cost to end early`, payoff: `${$0(payoff)} approximate payoff`, eq: mkt > payoff ? `${$0(mkt - payoff)} lease equity — a buyout or sale may cost nothing` : `${$0(payoff - mkt)} under water` };
};
export const disposition: Calc = (v) => {
  const fee = p(v, "f", 395), ex = p(v, "e", 3000), rate = p(v, "r", 0.25), wear = p(v, "w", 300), buy = p(v, "b", 0);
  const turn = fee + ex * rate + wear;
  return { turn: `${$0(turn)} turn-in costs`, parts: `Disposition ${$0(fee)} · excess miles ${$0(ex * rate)} · wear ${$0(wear)}`, note: buy ? `${$0(buy)} buyout instead — compare with the car's market value` : "Many brands waive the disposition fee if you lease again" };
};
export const turo: Calc = (v) => {
  const rate = p(v, "r", 70), days = p(v, "d", 15), cut = p(v, "c", 25) / 100, clean = p(v, "cl", 15), trips = p(v, "t", 5), mi = p(v, "mi", 120), dpm = p(v, "dp", 0.18), fixed = p(v, "f", 150);
  const gross = rate * days, net = gross * (1 - cut) - clean * trips - mi * days * dpm - fixed;
  return { net: `${$0(net)} a month profit`, gross: `${$0(gross)} gross bookings · ${$0(gross * cut)} platform share`, util: `${pc(days / 30)} utilisation · ${$(net / Math.max(days, 1))} per booked day` };
};
export const shareOwn: Calc = (v) => {
  const own = p(v, "o", 9500), hr = p(v, "h", 14), hrs = p(v, "n", 20), mi = p(v, "m", 0.4), miles = p(v, "mi", 150), mem = p(v, "f", 10), other = p(v, "x", 80);
  const share = (hr * hrs + mi * miles + mem + other) * 12;
  return { share: `${$0(share)} a year car sharing (plus transit and rides)`, own: `${$0(own)} a year owning`, win: share < own ? `Car sharing saves ${$0(own - share)}` : `Owning is ${$0(share - own)} cheaper at this usage` };
};
export const transitPass: Calc = (v) => {
  const pass = need(p(v, "p", 90), "Enter pass price."), fare = need(p(v, "f", 2.75), "Enter fare."), rides = p(v, "r", 40);
  const be = Math.ceil(pass / fare);
  return { be: `${be} rides a month to break even`, win: rides >= be ? `Pass saves ${$(rides * fare - pass)} a month` : `Pay per ride — saves ${$(pass - rides * fare)}`, per: `${$(pass / Math.max(rides, 1))} per ride with the pass` };
};
export const scooter: Calc = (v) => {
  const unlock = p(v, "u", 1), pm = p(v, "m", 0.39), min = p(v, "t", 12), rides = p(v, "r", 8), own = p(v, "o", 600);
  const per = unlock + pm * min, mo = per * rides * 4.33;
  return { per: `${$(per)} per ride`, mo: `${$0(mo)} a month (${$0(mo * 12)} a year)`, be: mo > 0 ? `Buying a ${$0(own)} scooter pays back in ${(own / mo).toFixed(1)} months` : "—" };
};
export const movingTruck: Calc = (v) => {
  const base = p(v, "b", 40), days = Math.max(1, p(v, "d", 1)), mi = p(v, "m", 80), rate = p(v, "r", 1.29), mpg = need(p(v, "g", 10), "Enter mpg."), gas = p(v, "c", 3.6), ins = p(v, "i", 25), eq = p(v, "e", 30), tax = p(v, "x", 8) / 100;
  const pre = base * days + mi * rate + ins * days + eq, tot = pre * (1 + tax) + (mi / mpg) * gas;
  return { tot: `${$0(tot)} total`, parts: `Rental ${$0(base * days)} · mileage ${$0(mi * rate)} · fuel ${$0((mi / mpg) * gas)} · cover and equipment ${$0(ins * days + eq)}`, note: "Trucks get about 8–12 mpg — return with the same fuel level to avoid refuel charges" };
};
export const van: Calc = (v) => {
  const rate = p(v, "r", 95), days = Math.max(1, p(v, "d", 3)), mi = p(v, "m", 600), allow = p(v, "a", 150), over = p(v, "o", 0.35), mpg = need(p(v, "g", 18), "Enter mpg."), gas = p(v, "c", 3.4), ins = p(v, "i", 30), tax = p(v, "x", 12) / 100;
  const extra = Math.max(0, mi - allow * days) * over, tot = (rate * days + extra + ins * days) * (1 + tax) + (mi / mpg) * gas;
  return { tot: `${$0(tot)} total`, per: `${$0(tot / days)} a day`, extra: extra ? `${$0(extra)} for ${nfmt(Math.round(mi - allow * days))} miles over the allowance` : "Within the mileage allowance" };
};
export const commute: Calc = (v) => {
  const mi = p(v, "m", 15), d = p(v, "d", 5), wk = p(v, "w", 48), mpg = need(p(v, "g", 28), "Enter mpg."), gas = p(v, "c", 3.3), toll = p(v, "t", 0), park = p(v, "k", 0), wear = p(v, "r", 0.12), min = p(v, "mn", 25), val = p(v, "h", 20);
  const days = d * wk, miles = mi * 2 * days, cost = miles * (gas / mpg + wear) + (toll + park) * days, hrs = (min * 2 * days) / 60;
  return { cost: `${$0(cost)} a year commuting`, mo: `${$0(cost / 12)} a month · ${$(cost / days)} a day`, time: `${nfmt(Math.round(hrs))} hours a year (${$0(hrs * val)} of time at ${$(val)}/hr)` };
};

// ---- registry (generated)
export const ideaCar1CustomCalculators: Record<string, Calc> = {
  "car-dealer-invoice-price-calculator": invoice,
  "car-dealer-fees-calculator": dealerFees,
  "car-rebate-vs-low-apr-calculator": rebateApr,
  "car-trade-in-equity-calculator": tradeEquity,
  "certified-pre-owned-premium-worth-calculator": cpo,
  "car-extended-warranty-worth-calculator": warranty,
  "car-buying-budget-by-salary-calculator": budgetSalary,
  "car-price-to-income-ratio-calculator": priceIncome,
  "car-title-transfer-fee-calculator": titleFee,
  "car-inspection-before-buying-cost-calculator": ppi,
  "car-sell-private-vs-trade-in-calculator": privateTrade,
  "electric-car-tax-credit-calculator": evCredit,
  "hybrid-vs-gas-car-breakeven-calculator": hybrid,
  "truck-vs-suv-cost-calculator": truckSuv,
  "lease-residual-value-calculator": residual,
  "lease-money-factor-to-apr-calculator": moneyFactor,
  "one-pay-lease-calculator": onePay,
  "lease-transfer-cost-calculator": leaseTransfer,
  "lease-early-termination-fee-calculator": earlyTerm,
  "lease-disposition-fee-calculator": disposition,
  "turo-host-profit-calculator": turo,
  "car-sharing-vs-owning-calculator": shareOwn,
  "monthly-transit-pass-vs-per-ride-calculator": transitPass,
  "scooter-rental-cost-calculator": scooter,
  "moving-truck-rental-cost-calculator": movingTruck,
  "van-rental-cost-calculator": van,
  "commuting-cost-annual-calculator": commute,
};
