/**
 * Batch: Vehicle keyword check (13 Nov 2026), Finance part, 20 tools spread over the existing
 * Finance sub-categories (Auto & Vehicle Loan, Car Buying & Selling, Car Ownership/Fuel/EV,
 * Auto & Vehicle Insurance, Car Maintenance/Repair).
 *
 * Kept apart from the existing auto-loan-calculator on purpose:
 *  - car-loan-credit-score: the APR comes from a credit-score band (typical 2025–26 averages);
 *    the plain auto loan tool needs the rate typed in.
 *  - car-loan-apr: solves for the rate from a known payment and adds the fees (true APR).
 *  - car-loan-eligibility: the lender's ceiling from income and debts (DTI / FOIR), not the
 *    personal budget that car-affordability gives.
 *  - pcp-car-finance: UK PCP with a balloon (GMFV) at the end.
 *  - negative-equity-car: rolls the unpaid part of a trade-in loan into the new loan.
 *  - 20-4-10-rule-car: the 20% down / 4 years / 10% of income rule.
 * Country tools (Ireland VRT, UK VED, India IDV, NSW CTP, Malaysia motor) use the published
 * rate tables as of 2025–26 with override inputs.
 */

import { type TrvCalculator as VehCalculator, InputError, pos, pick, r0, r1, r2, money, nfmt } from "./trv-core";

export type { VehCalculator };

/** Monthly payment on a loan with an optional balloon left at the end. */
export function pmt(principal: number, aprPct: number, n: number, balloon = 0): number {
  if (n <= 0) return 0;
  const r = aprPct / 1200;
  if (r === 0) return (principal - balloon) / n;
  return ((principal - balloon / (1 + r) ** n) * r) / (1 - (1 + r) ** -n);
}
/** Present value of n monthly payments. */
export function pv(payment: number, aprPct: number, n: number): number {
  const r = aprPct / 1200;
  return r === 0 ? payment * n : (payment * (1 - (1 + r) ** -n)) / r;
}
/** APR that makes n payments repay `amount` (bisection). */
export function solveApr(amount: number, payment: number, n: number): number {
  if (payment * n < amount - 1e-9) throw new InputError("The payments don't even repay the amount borrowed — check the payment and term.");
  let lo = 0, hi = 200;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (pv(payment, mid, n) > amount) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const term = (x: number | undefined, d: number) => Math.max(1, Math.round(pos(x, d)));

// ------------------------------------------------------- credit score APR
export const SCORE_BANDS: [string, number, number][] = [
  ["Super prime (781–850)", 5.18, 6.82], ["Prime (661–780)", 6.7, 9.06], ["Near prime (601–660)", 9.83, 13.74],
  ["Subprime (501–600)", 13.22, 18.99], ["Deep subprime (300–500)", 15.81, 21.58],
];
export const creditScoreLoan: VehCalculator = (v) => {
  const band = pick(v.band, SCORE_BANDS.length), used = pick(v.cond, 2) === 1, n = term(v.term, 60);
  const price = pos(v.price, 35000), tax = (price * pos(v.tax, 7)) / 100, loan = Math.max(0, price + tax + pos(v.fees, 0) - pos(v.down, 0) - pos(v.trade, 0));
  const apr = pos(v.apr, 0) || SCORE_BANDS[band][used ? 2 : 1], best = SCORE_BANDS[0][used ? 2 : 1];
  const pay = pmt(loan, apr, n), payBest = pmt(loan, best, n), interest = pay * n - loan;
  return { pay: r2(pay), apr: r2(apr), loan: r2(loan), interest: r2(interest), extra: r2((pay - payBest) * n), best: r2(payBest), how: `${SCORE_BANDS[band][0]}, ${used ? "used" : "new"} car → about ${nfmt(apr, 2)}% APR on ${money(loan)} for ${n} months` };
};

// ------------------------------------------------------------- true APR
export const carLoanApr: VehCalculator = (v) => {
  const amount = pos(v.amount, 30000), n = term(v.term, 60), fees = pos(v.fees, 0), financed = pick(v.financed, 2) === 1;
  let pay = pos(v.pay, 0);
  const note = pos(v.rate, 0);
  if (pay <= 0 && note > 0) pay = pmt(amount + (financed ? fees : 0), note, n);
  if (pay <= 0) throw new InputError("Enter the monthly payment (or the quoted interest rate).");
  const principal = amount + (financed ? fees : 0);
  const rate = solveApr(principal, pay, n), apr = solveApr(amount - (financed ? 0 : fees), pay, n);
  const interest = pay * n - principal;
  return { apr: r2(apr), rate: r2(rate), pay: r2(pay), interest: r2(interest), cost: r2(interest + fees), total: r2(pay * n + (financed ? 0 : fees)), how: `${n} payments of ${money(pay)} on ${money(amount)} you receive${fees ? `, with ${money(fees)} of fees ${financed ? "added to the loan" : "paid up front"}` : ""}` };
};

// -------------------------------------------------------- loan eligibility
export const carLoanEligibility: VehCalculator = (v) => {
  const inc = pos(v.income, 6000), debts = pos(v.debts, 800), dti = pos(v.dti, 45) / 100, pti = pos(v.pti, 15) / 100, apr = pos(v.apr, 7.5), n = term(v.term, 60);
  const byDti = inc * dti - debts, byPti = inc * pti, maxPay = Math.max(0, Math.min(byDti, byPti));
  const loan = pv(maxPay, apr, n), price = (loan + pos(v.down, 0)) / (1 + pos(v.tax, 7) / 100);
  const limit = byDti < byPti ? `debt-to-income (${nfmt(dti * 100)}% of income minus ${money(debts)} of other debts)` : `payment-to-income (${nfmt(pti * 100)}% of income)`;
  return { loan: r0(loan), pay: r2(maxPay), price: r0(price), dtiNow: r1(inc > 0 ? (debts / inc) * 100 : 0), dtiAfter: r1(inc > 0 ? ((debts + maxPay) / inc) * 100 : 0), limit: `Limited by ${limit}` };
};

// ------------------------------------------------------------------- PCP
export const pcpFinance: VehCalculator = (v) => {
  const price = pos(v.price, 30000), dep = pos(v.deposit, 3000) + pos(v.px, 0) + pos(v.contrib, 0), gmfv = pos(v.gmfv, 12000), apr = pos(v.apr, 9.9), n = term(v.term, 48), fee = pos(v.fee, 10);
  const credit = price - dep;
  if (credit <= 0) throw new InputError("The deposit covers the whole price — no finance needed.");
  if (gmfv >= credit) throw new InputError("The optional final payment (GMFV) is larger than the amount borrowed — lower it or the deposit.");
  const pay = pmt(credit, apr, n, gmfv), total = dep + pay * n + gmfv + fee, charge = total - price;
  const miles = pos(v.miles, 10000), excess = pos(v.excess, 0), ppm = pos(v.ppm, 8) / 100;
  return { pay: r2(pay), total: r2(total), charge: r2(charge), credit: r2(credit), handback: r2(dep + pay * n), excess: r2(excess * ppm), how: `${money(credit, "£")} borrowed at ${nfmt(apr, 1)}% APR over ${n} months with a ${money(gmfv, "£")} final payment${miles ? ` · ${nfmt(miles)} miles a year allowed` : ""}` };
};

// ------------------------------------------------------- negative equity
export const negativeEquity: VehCalculator = (v) => {
  const owed = pos(v.owed, 22000), value = pos(v.value, 17000), price = pos(v.price, 35000), down = pos(v.down, 2000), apr = pos(v.apr, 7.5), n = term(v.term, 72), taxPct = pos(v.tax, 7) / 100;
  const eq = value - owed, neg = Math.max(0, -eq), credit = pick(v.taxcredit, 2) === 1 ? value : 0;
  const tax = Math.max(0, price - credit) * taxPct, loan = Math.max(0, price + tax + pos(v.fees, 0) - down - Math.max(0, eq) + neg);
  const clean = Math.max(0, loan - neg), pay = pmt(loan, apr, n), payClean = pmt(clean, apr, n);
  const ltv = price > 0 ? (loan / price) * 100 : 0;
  return { pay: r2(pay), neg: r2(neg), loan: r2(loan), cost: r2((pay - payClean) * n), extra: r2(pay - payClean), ltv: r1(ltv), equity: eq >= 0 ? `Positive equity ${money(eq)} — it lowers the new loan` : `Upside down by ${money(neg)} — rolled into the new loan`, };
};

// ----------------------------------------------------------- 20/4/10 rule
export const rule20410: VehCalculator = (v) => {
  const income = pos(v.income, 80000) / 12, price = pos(v.price, 35000), down = pos(v.down, 7000), apr = pos(v.apr, 7), n = term(v.term, 48), other = pos(v.other, 250);
  const pay = pmt(Math.max(0, price - down), apr, n), share = income > 0 ? ((pay + other) / income) * 100 : 0;
  const budget = Math.max(0, income * 0.1 - other), maxLoan = pv(budget, apr, 48), maxPrice = maxLoan / 0.8;
  const ok = [down >= price * 0.2 - 0.005, n <= 48, share <= 10.0001];
  const passText = ok.every(Boolean) ? "Passes the 20/4/10 rule" : `Fails: ${[ok[0] ? "" : `down payment ${nfmt((down / price) * 100, 1)}% (< 20%)`, ok[1] ? "" : `term ${n} months (> 48)`, ok[2] ? "" : `car costs ${nfmt(share, 1)}% of income (> 10%)`].filter(Boolean).join(", ")}`;
  return { maxPrice: r0(maxPrice), verdict: passText, pay: r2(pay), share: r1(share), minDown: r0(price * 0.2), budget: r2(budget) };
};

// ------------------------------------------------------------ Ireland VRT
export const VRT_BANDS: [number, number][] = [[50, 7], [80, 9], [85, 9.75], [90, 10.5], [95, 11.25], [100, 12], [105, 12.75], [110, 13.5], [115, 14.25], [120, 15], [125, 15.75], [130, 16.5], [135, 17.25], [140, 18], [145, 19], [150, 20], [155, 21.5], [170, 25], [190, 30], [Infinity, 37]];
export const irelandVrt: VehCalculator = (v) => {
  const omsp = pos(v.omsp, 30000), co2 = pos(v.co2, 120), nox = pos(v.nox, 20), diesel = pick(v.fuel, 3) === 1, ev = pick(v.fuel, 3) === 2;
  const rate = pos(v.rate, 0) || VRT_BANDS.find(([up]) => co2 <= up)![1];
  let vrt = Math.max(200, (omsp * rate) / 100);
  if (ev) vrt = Math.max(0, vrt - Math.min(pos(v.relief, 5000), vrt));
  let levy = 0;
  levy = Math.min(nox, 40) * 5 + Math.max(0, Math.min(nox, 80) - 40) * 15 + Math.max(0, nox - 80) * 25;
  levy = Math.min(levy, diesel ? 4850 : 600);
  if (ev) levy = 0;
  const total = vrt + levy;
  return { total: r2(total), vrt: r2(vrt), levy: r2(levy), rate, pct: r1(omsp > 0 ? (total / omsp) * 100 : 0), how: `${nfmt(co2)} g/km WLTP → ${rate}% of the €${nfmt(omsp)} OMSP${ev ? ", less the EV relief" : ""} + NOx levy on ${nfmt(nox)} mg/km` };
};

// ------------------------------------------------------- EV charging time
export const EV_CHARGERS: [string, number, boolean][] = [["Level 1 / 3-pin plug (1.4–2.3 kW)", 1.9, false], ["Level 2 home charger 7 kW", 7.2, false], ["Level 2 11 kW (3-phase)", 11, false], ["Level 2 19 kW", 19.2, false], ["DC fast 50 kW", 50, true], ["DC fast 150 kW", 150, true], ["DC ultra-fast 250 kW+", 250, true], ["Custom (enter kW)", 0, true]];
export const evChargingTime: VehCalculator = (v) => {
  const bat = pos(v.bat, 75), from = Math.min(100, pos(v.from, 20)), to = Math.min(100, pos(v.to, 80)), ch = EV_CHARGERS[pick(v.ch, EV_CHARGERS.length)];
  if (to <= from) throw new InputError("The target charge must be higher than the starting charge.");
  const kw = pos(v.kw, 0) || ch[1];
  if (kw <= 0) throw new InputError("Enter the charger power in kW.");
  const carMax = ch[2] ? pos(v.dcmax, 150) || Infinity : pos(v.acmax, 11) || Infinity, eff = (pos(v.eff, 90) || 90) / 100;
  const p = Math.min(kw, carMax);
  // DC charging slows down past 80%: assume ~40% of peak above 80% and ~80% average below.
  const seg = (a: number, b: number, f: number) => (Math.max(0, b - a) / 100) * bat / (p * f * eff);
  const hours = ch[2] ? seg(from, Math.min(to, 80), 0.8) + seg(Math.max(from, 80), to, 0.4) : seg(from, to, 1);
  const kwh = ((to - from) / 100) * bat, grid = kwh / eff;
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return { time: `${h} h ${m} min`, hours: r2(hours), kwh: r1(kwh), grid: r1(grid), power: r1(p), cost: r2(grid * pos(v.price, 0.17)), how: `${nfmt(kwh, 1)} kWh into the battery at up to ${nfmt(p, 1)} kW${ch[2] ? " (tapers above 80%)" : ""}, ${nfmt(eff * 100)}% efficiency` };
};

// --------------------------------------------------------------- EV range
export const TEMP_F: [string, number][] = [["Below 20°F (−7°C)", 1.4], ["20–40°F (−7 to 4°C)", 1.22], ["40–60°F (4–16°C)", 1.08], ["60–85°F (16–29°C, ideal)", 1], ["85–95°F (29–35°C)", 1.05], ["Above 95°F (35°C+)", 1.15]];
export const SPEED_F: [string, number][] = [["City / stop-and-go", 0.88], ["Mixed driving", 1], ["Highway 65 mph (105 km/h)", 1.12], ["Highway 75 mph (120 km/h)", 1.27], ["Highway 80 mph+ (130 km/h)", 1.38]];
export const evRange: VehCalculator = (v) => {
  const bat = pos(v.bat, 75), soc = Math.min(100, pos(v.soc, 100)) / 100, reserve = Math.min(50, pos(v.reserve, 10)) / 100;
  const eff = pos(v.eff, 28); // kWh per 100 miles
  if (eff <= 0) throw new InputError("Enter the car's efficiency in kWh per 100 miles.");
  const f = TEMP_F[pick(v.temp, TEMP_F.length)][1] * SPEED_F[pick(v.speed, SPEED_F.length)][1] * (1 + pos(v.load, 0) / 100);
  const usable = bat * Math.max(0, soc - reserve), mi = (usable / (eff * f)) * 100, full = (bat / (eff * f)) * 100;
  return { mi: r0(mi), km: r0(mi * 1.609344), full: r0(full), eff: r1(eff * f), mpk: r2(100 / (eff * f)), how: `${nfmt(usable, 1)} kWh usable ÷ ${nfmt(eff * f, 1)} kWh/100 mi (rated ${nfmt(eff, 1)} × ${nfmt(f, 2)} for conditions)` };
};

// ------------------------------------------------------------- fuel range
export const fuelRange: VehCalculator = (v) => {
  const metric = pick(v.unit, 2) === 1, tank = pos(v.tank, metric ? 55 : 14), lvl = Math.min(100, pos(v.level, 25)) / 100;
  const econ = pos(v.econ, metric ? 7.5 : 30), reserve = pos(v.reserve, 0);
  if (econ <= 0) throw new InputError("Enter the fuel economy.");
  const fuel = Math.max(0, tank * lvl - reserve), dist = metric ? (fuel / econ) * 100 : fuel * econ, full = metric ? (tank / econ) * 100 : tank * econ;
  const u = metric ? "km" : "mi";
  return { dist: r0(dist), full: r0(full), fuel: r1(fuel), other: metric ? r0(dist / 1.609344) : r0(dist * 1.609344), how: `${nfmt(fuel, 1)} ${metric ? "L" : "gal"} left ${metric ? `÷ ${econ} L/100 km × 100` : `× ${econ} mpg`} = ${nfmt(r0(dist))} ${u}` };
};

// -------------------------------------------------------- annual mileage
export const annualMileage: VehCalculator = (v) => {
  const a = pos(v.odo1, 12000), b = pos(v.odo2, 20000), d1 = Math.round(v.d1 ?? 0), d2 = Math.round(v.d2 ?? 0);
  const days = d2 - d1;
  if (days <= 0) throw new InputError("The second date must be after the first.");
  if (b < a) throw new InputError("The second odometer reading must be higher than the first.");
  const perYear = ((b - a) / days) * 365.25, allow = pos(v.allow, 12000), years = pos(v.years, 3), fee = pos(v.fee, 0.25);
  const projected = perYear * years, over = Math.max(0, projected - allow * years);
  return { year: r0(perYear), month: r0(perYear / 12), day: r1(perYear / 365.25), projected: r0(projected), over: r0(over), cost: r2(over * fee), verdict: perYear <= allow ? `Under the ${nfmt(allow)}-a-year allowance by ${nfmt(r0(allow - perYear))}` : `Over the ${nfmt(allow)}-a-year allowance by ${nfmt(r0(perYear - allow))}` };
};

// ---------------------------------------------------------- cost per mile
export const costPerMile: VehCalculator = (v) => {
  const miles = pos(v.miles, 12000);
  if (miles <= 0) throw new InputError("Enter the miles you drive a year.");
  const fuel = pos(v.mpg, 28) > 0 ? (miles / pos(v.mpg, 28)) * pos(v.gas, 3.2) : 0;
  const fixed = pos(v.ins, 1800) + pos(v.dep, 3500) + pos(v.interest, 900) + pos(v.reg, 150) + pos(v.park, 0);
  const running = fuel + pos(v.maint, 900) + pos(v.tires, 200);
  const total = fixed + running;
  return { cpm: r2(total / miles), fuelpm: r2(fuel / miles), runpm: r2(running / miles), fixedpm: r2(fixed / miles), year: r2(total), month: r2(total / 12), irs: r2(miles * 0.7) };
};

// ------------------------------------------------------------- UK VED
export const VED_FIRST: [number, number][] = [[0, 10], [50, 110], [75, 130], [90, 270], [100, 350], [110, 390], [130, 440], [150, 540], [170, 1360], [190, 2190], [225, 3300], [255, 4680], [Infinity, 5490]];
export const VED_OLD: [string, number, number][] = [["A", 100, 0], ["B", 110, 20], ["C", 120, 35], ["D", 130, 165], ["E", 140, 195], ["F", 150, 215], ["G", 165, 265], ["H", 175, 315], ["I", 185, 345], ["J", 200, 395], ["K", 225, 430], ["L", 255, 735], ["M", Infinity, 760]];
export const ukCarTax: VehCalculator = (v) => {
  const era = pick(v.era, 3), co2 = pos(v.co2, 130), fuel = pick(v.fuel, 4), list = pos(v.list, 30000), std = pos(v.std, 195), ecs = pos(v.ecs, 425), month = pick(v.pay, 3);
  let first = 0, year2 = 0, band = "";
  if (era === 2) { // before 1 March 2001: engine size
    year2 = pos(v.cc, 1600) <= 1549 ? 220 : 360; band = pos(v.cc, 1600) <= 1549 ? "Engine up to 1,549 cc" : "Engine over 1,549 cc";
    first = year2;
  } else if (era === 1) { // 1 Mar 2001 – 31 Mar 2017: CO2 bands
    const b = VED_OLD.find(([, up]) => co2 <= up)!; year2 = b[2]; first = b[2]; band = `Band ${b[0]}`;
    if (fuel === 2) { year2 = Math.max(0, year2 - 10); first = year2; }
  } else {
    let idx = VED_FIRST.findIndex(([up]) => co2 <= up);
    if (fuel === 1) idx = Math.min(VED_FIRST.length - 1, idx + 1); // diesel not meeting RDE2: next band up
    first = fuel === 3 ? 10 : VED_FIRST[idx][1];
    year2 = std + (list > 40000 ? ecs : 0);
    band = `${nfmt(co2)} g/km${fuel === 1 ? " (diesel, non-RDE2: one band higher)" : ""}${list > 40000 ? " · list price over £40,000: expensive car supplement in years 2–6" : ""}`;
  }
  const factor = [1, 1.05, 1.1][month], annual = year2 * factor;
  return { annual: r2(annual), first: r2(first), year2: r2(year2), six: r2(year2 * 0.55), monthly: r2(annual / 12), band, how: month ? `${month === 1 ? "12 monthly Direct Debits (+5%)" : "6-monthly / monthly instalments (+10%)"} on ${money(year2, "£")}` : `Paid once a year: ${money(year2, "£")}` };
};

// ------------------------------------------------------------------ IDV
export const IDV_DEP: [string, number][] = [["Up to 6 months", 5], ["6 months – 1 year", 15], ["1–2 years", 20], ["2–3 years", 30], ["3–4 years", 40], ["4–5 years", 50], ["5–6 years (agreed value)", 55], ["6–7 years (agreed value)", 60], ["Over 7 years (agreed value)", 65]];
export const OD_RATE: number[][][] = [ // [zone A, zone B][cc band][age band <5, 5–10, >10] (%)
  [[3.127, 3.283, 3.362], [3.283, 3.447, 3.529], [3.44, 3.612, 3.698]],
  [[3.039, 3.191, 3.267], [3.191, 3.351, 3.43], [3.343, 3.51, 3.594]],
];
export const TP_PREMIUM = [2094, 3416, 7897];
export const NCB = [0, 20, 25, 35, 45, 50];
export const idvCalc: VehCalculator = (v) => {
  const price = pos(v.price, 800000), acc = pos(v.acc, 0), age = pick(v.age, IDV_DEP.length), dep = pos(v.dep, 0) || IDV_DEP[age][1];
  const idv = (price + acc) * (1 - dep / 100), cc = pick(v.cc, 3), zone = pick(v.zone, 2), ageBand = age < 6 ? 0 : age < 8 ? 1 : 2;
  const rate = pos(v.rate, 0) || OD_RATE[zone][cc][ageBand], ncb = NCB[pick(v.ncb, NCB.length)];
  const od = ((idv * rate) / 100) * (1 - pos(v.disc, 0) / 100) * (1 - ncb / 100), tp = TP_PREMIUM[cc], pa = pos(v.pa, 375), net = od + tp + pa, gst = net * 0.18;
  return { idv: r0(idv), dep, od: r0(od), tp, total: r0(net + gst), gst: r0(gst), how: `₹${nfmt(price + acc)} − ${dep}% depreciation = IDV ₹${nfmt(r0(idv))}; own damage ${nfmt(rate, 3)}% of IDV − ${ncb}% NCB` };
};

// --------------------------------------------------------- NSW Green Slip
export const CTP_REGION: [string, number][] = [["Sydney metro", 620], ["Newcastle / Central Coast", 520], ["Wollongong / Illawarra", 520], ["Country NSW", 440], ["Outer metro (Blue Mountains, Hawkesbury)", 560]];
export const CTP_AGE: [string, number][] = [["Under 21", 1.55], ["21–24", 1.3], ["25–29", 1.08], ["30–54", 1], ["55+", 0.92]];
export const CTP_VEH: [string, number][] = [["Car / station wagon (private)", 1], ["Ute / van / 4WD (private)", 1.06], ["Rideshare / point-to-point", 2.1], ["Motorcycle (over 726 cc)", 1.35], ["Light business vehicle", 1.25]];
export const ctpGreenSlip: VehCalculator = (v) => {
  const base = pos(v.base, 0) || CTP_REGION[pick(v.region, CTP_REGION.length)][1];
  const f = CTP_AGE[pick(v.age, CTP_AGE.length)][1] * CTP_VEH[pick(v.veh, CTP_VEH.length)][1] * (1 + 0.25 * Math.min(3, Math.round(pos(v.claims, 0))));
  const months = pick(v.term, 3) === 1 ? 6 : pick(v.term, 3) === 2 ? 3 : 12, prem = base * f * (months / 12), gst = prem / 11, refund = pos(v.refund, 0);
  return { prem: r2(prem), annual: r2(base * f), low: r2(prem * 0.88), high: r2(prem * 1.12), gst: r2(gst), net: r2(prem - refund), how: `${money(base)} typical ${months === 12 ? "12-month" : `${months}-month`} base × ${nfmt(f, 2)} for age, vehicle use and claims` };
};

// ---------------------------------------------------- Malaysia car insurance
const MY_CC = ["Up to 1,400 cc", "1,401–1,650 cc", "1,651–2,200 cc", "2,201–3,050 cc", "3,051–4,100 cc", "4,101–4,250 cc", "4,251–4,400 cc", "Over 4,400 cc"];
export const MY_CC_BANDS = MY_CC;
const MY_COMP: number[][] = [[273.8, 305.5, 339.1, 372.6, 404.3, 436.0, 469.6, 501.3], [196.2, 220.0, 243.9, 266.5, 290.4, 314.2, 337.1, 361.0]];
const MY_TP: number[][] = [[120.6, 135.0, 151.2, 167.4, 181.8, 196.2, 212.4, 226.8], [67.2, 75.6, 85.2, 93.6, 101.4, 110.4, 118.2, 126.6]];
export const MY_NCD = [0, 25, 30, 38.33, 45, 55];
export const malaysiaCarInsurance: VehCalculator = (v) => {
  const si = pos(v.si, 60000), cc = pick(v.cc, 8), east = pick(v.region, 2), cover = pick(v.cover, 3), ncd = MY_NCD[pick(v.ncd, MY_NCD.length)];
  let basic: number;
  if (cover === 2) basic = MY_TP[east][cc];
  else {
    basic = MY_COMP[east][cc] + (Math.max(0, si - 1000) / 1000) * (east ? 20.3 : 26);
    if (cover === 1) basic *= 0.75;
  }
  const afterNcd = basic * (1 - ncd / 100) * (1 - pos(v.disc, 0) / 100);
  const ws = pos(v.ws, 0) * 0.15, flood = pick(v.flood, 2) === 1 ? si * 0.0025 : 0, addons = ws + flood + pos(v.other, 0);
  const gross = afterNcd + addons, sst = gross * 0.08, total = gross + sst + 10;
  return { total: r2(total), basic: r2(basic), ncdAmt: r2(basic - afterNcd), addons: r2(addons), sst: r2(sst), how: `${["Comprehensive", "Third party, fire & theft (75%)", "Third party only"][cover]} · ${MY_CC[cc]} · ${east ? "Sabah, Sarawak & Labuan" : "Peninsular"} tariff${cover < 2 ? ` on RM${nfmt(si)} sum insured` : ""} − ${ncd}% NCD + 8% SST + RM10 stamp duty` };
};

// ------------------------------------------------------------------ MPGe
export const mpge: VehCalculator = (v) => {
  const mode = pick(v.mode, 4), x = pos(v.x, 30);
  if (x <= 0) throw new InputError("Enter a positive efficiency figure.");
  const kwh100 = mode === 0 ? x : mode === 1 ? 100 / x : mode === 2 ? 3370.5 / x : x * 1.609344; // mode 3: kWh/100 km → kWh/100 mi
  const mpgeV = 3370.5 / kwh100, mpk = 100 / kwh100, elec = pos(v.elec, 0.17), gas = pos(v.gas, 3.2), mpg = pos(v.mpg, 30);
  const evCpm = (kwh100 / 100) * elec, gasCpm = mpg > 0 ? gas / mpg : 0;
  return { mpge: r1(mpgeV), mpk: r2(mpk), kwh100: r1(kwh100), kwhkm: r1(kwh100 / 1.609344), cpm: Math.round(evCpm * 1000) / 1000, gasCpm: Math.round(gasCpm * 1000) / 1000, breakeven: r2(kwh100 > 0 ? gasCpm / (kwh100 / 100) : 0), how: `${nfmt(kwh100, 1)} kWh/100 mi ↔ ${nfmt(mpgeV, 1)} MPGe (33.705 kWh = 1 gallon of gasoline)` };
};

// ---------------------------------------------------------- repair costs
export const REBUILD: [string, number, number][] = [["4-cylinder", 2200, 14], ["V6", 3000, 18], ["V8", 3600, 20], ["Diesel (light truck)", 5500, 26], ["Motorcycle / small engine", 1200, 10]];
export const REBUILD_LVL: [string, number][] = [["Refresh (gaskets, bearings, rings)", 0.7], ["Full rebuild (machine work, new pistons)", 1], ["Performance build", 1.8]];
export const engineRebuild: VehCalculator = (v) => {
  const e = REBUILD[pick(v.engine, REBUILD.length)], lvl = REBUILD_LVL[pick(v.level, REBUILD_LVL.length)];
  const parts = pos(v.parts, 0) || e[1] * lvl[1], machine = pos(v.machine, 0) || e[1] * 0.35 * lvl[1], hours = pos(v.hours, 0) || e[2], rate = pos(v.rate, 130);
  const rr = pick(v.rr, 2) === 1 ? 0 : 6, labor = (hours + rr) * rate;
  const total = parts + machine + labor + pos(v.extras, 300);
  return { total: r0(total), low: r0(total * 0.85), high: r0(total * 1.2), parts: r0(parts), machine: r0(machine), labor: r0(labor), how: `${e[0]}, ${lvl[0].toLowerCase()}: parts ${money(parts, "$", 0)} + machine shop ${money(machine, "$", 0)} + ${nfmt(hours + rr)} labor hours at ${money(rate, "$", 0)}` };
};
export const CLUTCH: [string, number, number][] = [["Front-wheel drive (transverse)", 5.5, 350], ["Rear-wheel drive", 4, 400], ["All-wheel / 4WD", 8, 500], ["Performance / heavy-duty", 6, 900], ["Motorcycle (wet clutch plates)", 1.5, 150]];
export const clutchCost: VehCalculator = (v) => {
  const c = CLUTCH[pick(v.type, CLUTCH.length)], kit = pos(v.kit, 0) || c[2], hours = pos(v.hours, 0) || c[1], rate = pos(v.rate, 130);
  const fw = [0, 120, 450, 900][pick(v.fw, 4)], extras = pos(v.extras, 80) + (pick(v.slave, 2) === 1 ? 150 : 0);
  const labor = hours * rate, total = kit + fw + labor + extras;
  return { total: r0(total), low: r0(total * 0.85), high: r0(total * 1.2), parts: r0(kit + fw + extras), labor: r0(labor), how: `${c[0]}: clutch kit ${money(kit, "$", 0)}${fw ? ` + flywheel ${money(fw, "$", 0)}` : ""} + ${nfmt(hours, 1)} h × ${money(rate, "$", 0)}` };
};
export const RESTO: [string, number, number][] = [["Driver quality", 700, 0.35], ["Street / show quality", 1500, 0.5], ["Concours (frame-off, original-correct)", 2600, 0.7]];
export const restorationCost: VehCalculator = (v) => {
  const l = RESTO[pick(v.level, RESTO.length)], cond = [0.8, 1, 1.35][pick(v.cond, 3)], hours = (pos(v.hours, 0) || l[1]) * cond, rate = pos(v.rate, 90);
  const labor = hours * rate, parts = pos(v.parts, 0) || labor * l[2], paint = pos(v.paint, 0), total = labor + parts + paint + pos(v.engine, 0);
  const weeks = hours / Math.max(1, pos(v.week, 30));
  return { total: r0(total), labor: r0(labor), parts: r0(parts), hours: r0(hours), months: r1(weeks / 4.33), value: r0(pos(v.after, 0) - total - pos(v.buy, 0)), how: `${l[0]}: ${nfmt(r0(hours))} shop hours × ${money(rate, "$", 0)}${cond !== 1 ? ` (×${cond} for the car's condition)` : ""} + parts` };
};

export const vehFinCustomCalculators: Record<string, VehCalculator> = {
  "car-loan-credit-score-calculator": creditScoreLoan,
  "car-loan-apr-calculator": carLoanApr,
  "car-loan-eligibility-calculator": carLoanEligibility,
  "pcp-car-finance-calculator": pcpFinance,
  "negative-equity-car-calculator": negativeEquity,
  "20-4-10-rule-car-calculator": rule20410,
  "ireland-vrt-calculator": irelandVrt,
  "ev-charging-time-calculator": evChargingTime,
  "ev-range-calculator": evRange,
  "fuel-range-calculator": fuelRange,
  "annual-mileage-calculator": annualMileage,
  "car-cost-per-mile-calculator": costPerMile,
  "uk-car-tax-calculator": ukCarTax,
  "idv-calculator": idvCalc,
  "ctp-green-slip-calculator": ctpGreenSlip,
  "malaysia-car-insurance-calculator": malaysiaCarInsurance,
  "mpge-calculator": mpge,
  "engine-rebuild-cost-calculator": engineRebuild,
  "clutch-replacement-cost-calculator": clutchCost,
  "car-restoration-cost-calculator": restorationCost,
};
