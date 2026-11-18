/**
 * Idea build, batch sal1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Jobs & Education > Salary & Income = 40 tools.
 * Figures: IRS business mileage rate 72.5¢/mile (Jan–Jun 2026), raised to 76¢/mile from 1 July 2026 (Announcement 2026-11) — used as the
 * default vehicle-cost input; FLSA tipped cash wage $2.13 with tip credit up to the $7.25 federal minimum; US Social Security 6.2% to
 * $184,500 and Medicare 1.45% (employer FICA 7.65%; self-employed 15.3%); "housing wage" = rent × 12 ÷ 30% ÷ 2,080 hours.
 * Platform fees are editable typical defaults (Fiverr 20%, Upwork ~10%, Rover 20%, Airbnb Experiences 20%; TaskRabbit charges clients).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const $0 = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;

export const colaRaise: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter your salary."), inf = p(v, "i", 3) / 100, r = p(v, "r", 2.5) / 100, y = Math.max(1, p(v, "y", 1));
  const needS = s * Math.pow(1 + inf, y), got = s * Math.pow(1 + r, y), real = got / Math.pow(1 + inf, y) - s;
  return { n: `${pc(Math.pow(1 + inf, y) - 1)} raise needed to keep up — ${$0(needS)}`, r: `Your ${pc(r)} ${y > 1 ? "raises give" : "raise gives"} ${$0(got)} — ${real >= 0 ? "a real gain" : "a real pay cut"} of ${$0(Math.abs(real))} in today's money`, note: `${nfmt(y, 0)} year${y > 1 ? "s" : ""} at ${pc(inf)} inflation · use your local CPI if prices rose faster where you live` };
};
const comp = (v: Record<string, number>, k: string, d: number[]) => { const [b, bo, eq, r401, hi, pto, oth] = ["b", "bo", "eq", "r", "h", "pt", "o"].map((x, i) => p(v, `${k}${x}`, d[i])); return { b, total: b + bo + eq + b * (r401 / 100) + hi + pto + oth }; };
export const offerCompare: Calc = (v) => {
  const A = comp(v, "a", [90000, 5000, 0, 4, 6000, 3000, 0]), B = comp(v, "b", [95000, 0, 10000, 3, 4000, 2000, 0]), ca = p(v, "ac", 2000), cb = p(v, "bc", 4000);
  const na = A.total - ca, nb = B.total - cb;
  return { w: `${na >= nb ? "Offer A" : "Offer B"} is worth ${$0(Math.abs(na - nb))} more a year`, a: `Offer A ${$0(A.total)} total − ${$0(ca)} commute/costs = ${$0(na)}`, b: `Offer B ${$0(B.total)} total − ${$0(cb)} commute/costs = ${$0(nb)} · weigh growth, stability and hours too` };
};
export const totalComp: Calc = (v) => {
  const b = need(p(v, "b", 85000), "Enter base salary."), bo = p(v, "bo", 6000), eq = p(v, "eq", 8000), m = p(v, "m", 4) / 100, hi = p(v, "h", 7000), oth = p(v, "o", 1500), fica = pick(v.f, 2) === 0;
  const er401 = b * m, ficaEr = fica ? Math.min(b + bo, 184500) * 0.062 + (b + bo) * 0.0145 : 0, tot = b + bo + eq + er401 + hi + oth + ficaEr;
  return { t: `${$0(tot)} total compensation`, parts: `Base ${$0(b)} · bonus ${$0(bo)} · equity ${$0(eq)} · 401(k) match ${$0(er401)} · health ${$0(hi)} · other ${$0(oth)}${fica ? ` · employer FICA ${$0(ficaEr)}` : ""}`, note: `Benefits add ${pc((tot - b) / b, 0)} on top of base pay` };
};
export const benefitsValue: Calc = (v) => {
  const b = need(p(v, "b", 70000), "Enter base salary."), items = ["h", "d", "r", "l", "pt", "o"].map((k, i) => p(v, k, [7000, 500, 2800, 400, 0, 1000][i])), ptoD = p(v, "pd", 15);
  const pto = (b / 260) * ptoD, tot = items.reduce((a, c) => a + c, 0) + pto;
  return { t: `${$0(tot)} a year in benefits (${pc(tot / b, 0)} of salary)`, parts: `Health ${$0(items[0])} · dental/vision ${$0(items[1])} · retirement match ${$0(items[2])} · life/disability ${$0(items[3])} · paid time off ${$0(pto)} (${nfmt(ptoD, 0)} days) · other ${$0(items[5])}`, note: `Equivalent to a ${$0(b + tot)} salary with no benefits · US benefits average about 30% of total compensation` };
};
export const commuteVsSalary: Calc = (v) => {
  const s = need(p(v, "s", 65000), "Enter salary."), mi = p(v, "m", 20), d = p(v, "d", 230), cpm = p(v, "c", 0.76), park = p(v, "pk", 0), mins = p(v, "t", 35);
  const cost = mi * 2 * d * cpm + park * d, hrs = (mins * 2 * d) / 60, hourly = s / 2080, eff = (s - cost) / (2080 + hrs);
  return { c: `${$0(cost)} a year commuting (${pc(cost / s, 1)} of salary)`, t: `${nfmt(hrs, 0)} hours a year in transit`, eff: `Effective hourly pay ${$2(eff)} vs ${$2(hourly)} on paper · cost per mile ${$2(cpm)} (IRS rate 76¢ from July 2026)` };
};
export const w2v1099: Calc = (v) => {
  const w = need(p(v, "w", 80000), "Enter W-2 salary."), ben = p(v, "b", 12000), r = p(v, "r", 55), h = p(v, "h", 1800), exp = p(v, "e", 3000);
  const gross = r * h, se = (gross - exp) * 0.9235 * 0.153 * 0.5, c1099 = gross - exp - se - 0, eqW2 = w + ben;
  const be = (eqW2 + exp + 0) / (h * (1 - 0.0707));
  return { r: `1099: ${$0(gross - exp)} after expenses vs W-2: ${$0(eqW2)} salary + benefits`, d: `After the extra employer-half SE tax (${$0(se)}), 1099 ≈ ${$0(c1099)} — ${c1099 >= eqW2 ? "better" : "worse"} by ${$0(Math.abs(c1099 - eqW2))}`, be: `Break-even contract rate ≈ ${$2(be)}/h for ${nfmt(h, 0)} billable hours · contractors also lose paid leave and unemployment insurance` };
};
// ---- Gig platforms ----
const gig = (fee: number, note: string): Calc => (v) => {
  const g = need(p(v, "g", 900), "Enter weekly gross earnings."), tips = p(v, "t", 0), h = need(p(v, "h", 25), "Enter hours worked."), mi = p(v, "m", 0), cpm = p(v, "c", 0.76), fe = p(v, "f", fee * 100) / 100, oth = p(v, "o", 0);
  const net = (g + tips) * (1 - fe) - mi * cpm - oth, wk = net / h;
  return { h: `${$2(wk)} per hour after costs`, w: `${$0(net)} a week net (${$0(net * 52)} a year): ${$0(g + tips)} gross${fe ? ` − ${pc(fe, 0)} platform fee` : ""}${mi ? ` − ${nfmt(mi, 0)} mi × ${$2(cpm)}` : ""}${oth ? ` − ${$0(oth)} other` : ""}`, note: `${note} · before income tax and 15.3% self-employment tax` };
};
export const doordash = gig(0, "DoorDash pays base + promotions + 100% of tips — enter all in gross · vehicle cost uses the IRS 76¢/mile rate (gas, wear, depreciation)");
export const instacart = gig(0, "Instacart shoppers keep 100% of tips; batch pay + tips are your gross");
export const amazonFlex = gig(0, "Amazon Flex pays per block (often $18–$25/h quoted) — subtract your miles");
export const lyft = gig(0, "Enter your weekly Lyft earnings after Lyft's take (plus tips)");
export const uberEats = gig(0, "Uber Eats pays trip fares + tips — enter all as gross");
export const grubhub = gig(0, "Grubhub pays per order + mileage + tips");
export const shipt = gig(0, "Shipt shoppers keep 100% of tips");
export const taskrabbit = gig(0, "TaskRabbit charges clients the service fee — Taskers keep their rate (a one-off registration fee may apply)");
export const fiverr = gig(0.2, "Fiverr takes 20% of each order (sellers keep 80%) · add withdrawal fees in 'other'");
export const upwork = gig(0.1, "Upwork's freelancer fee is variable (about 0–15%; enter yours)");
export const rover = gig(0.2, "Rover keeps a 20% service fee from sitters (some older accounts 15%)");
export const airbnbExp = gig(0.2, "Airbnb Experiences charges hosts about 20% · include supplies and transport in 'other'");
export const petSitRate: Calc = (v) => {
  const s = pick(v.s, 4), base = [25, 40, 75, 20][s], pets = Math.max(1, Math.round(p(v, "n", 1))), hol = pick(v.h, 2) === 1, loc = p(v, "l", 100) / 100;
  const rate = base * loc * (1 + (pets - 1) * 0.4) * (hol ? 1.25 : 1);
  return { r: `Charge about ${$0(rate)} ${["per 30-min drop-in", "per walk/visit (60 min)", "per overnight stay", "per 30-min walk"][s]}`, how: `Base ${$0(base)} × location ${pc(loc, 0)} × ${pets} pet${pets > 1 ? "s (+40% each extra)" : ""}${hol ? " × 1.25 holiday" : ""}`, note: "Typical US starting points — check local competitors on Rover/Wag and add for medication, puppies or long distances" };
};
export const travelNurse: Calc = (v) => {
  const t = need(p(v, "t", 28), "Enter taxable hourly rate."), h = p(v, "h", 36), hs = p(v, "hs", 1400), m = p(v, "m", 500), wk = p(v, "w", 13), tax = p(v, "x", 22) / 100;
  const taxable = t * h, stip = hs + m, gross = taxable + stip, net = taxable * (1 - tax - 0.0765) + stip;
  return { w: `${$0(gross)} a week gross (${$2(gross / h)} blended hourly)`, n: `≈ ${$0(net)} a week take-home — stipends ${$0(stip)} are tax-free if you keep a tax home`, c: `${$0(gross * wk)} for a ${nfmt(wk, 0)}-week contract · compare offers on the taxable rate, not just the weekly total` };
};
export const tipWage: Calc = (v) => {
  const base = p(v, "b", 2.13), h = need(p(v, "h", 30), "Enter hours a week."), tips = p(v, "t", 450), out = p(v, "o", 5) / 100, mw = p(v, "m", 7.25);
  const tk = tips * (1 - out), hr = base + tk / h, top = Math.max(0, mw - hr);
  return { h: `${$2(hr)} per hour with tips`, w: `${$0(base * h + tk)} a week (${$0((base * h + tk) * 52)} a year) after ${pc(out, 0)} tip-out`, note: top > 0 ? `Below the ${$2(mw)} minimum — your employer must make up ${$2(top)}/h` : `Federal tipped cash wage $2.13 with tip credit to $7.25; many states require more · tips may qualify for the new tips deduction (2025–2028)` };
};
export const housingWage: Calc = (v) => {
  const r = need(p(v, "r", 1600), "Enter monthly rent."), pct0 = p(v, "p", 30) / 100, h = p(v, "h", 40);
  const yr = (r * 12) / pct0, hourly = yr / (h * 52);
  return { h: `${$2(hourly)} an hour needed`, y: `${$0(yr)} a year so rent is ${pc(pct0, 0)} of gross income`, note: `At ${nfmt(h, 0)} h a week · at the $7.25 federal minimum you'd need ${nfmt(hourly / 7.25 * h, 0)} hours a week` };
};
export const sideHustle: Calc = (v) => {
  const g = need(p(v, "g", 1000), "Enter monthly income goal."), r = need(p(v, "r", 25), "Enter hourly earnings."), tax = p(v, "t", 25) / 100, c = p(v, "c", 10) / 100;
  const hrsM = g / (r * (1 - tax) * (1 - c));
  return { h: `${nfmt(hrsM / 4.33, 1)} hours a week (${nfmt(hrsM, 0)} a month)`, how: `${$0(g)} after tax ÷ (${$2(r)} × ${pc(1 - c, 0)} after costs × ${pc(1 - tax, 0)} after tax)`, note: "Set aside tax on side income — US self-employment tax is 15.3% on top of income tax" };
};
export const careerGap: Calc = (v) => {
  const cur = need(p(v, "c", 70000), "Enter current salary."), nw = p(v, "n", 55000), g1 = p(v, "g1", 3) / 100, g2 = p(v, "g2", 7) / 100, train = p(v, "t", 5000), y = Math.max(1, Math.round(p(v, "y", 10)));
  let a = cur, b = nw, cum = -train, be = 0;
  for (let k = 1; k <= y; k++) { cum += b - a; if (!be && b > a) be = k; a *= 1 + g1; b *= 1 + g2; }
  return { gap: `${$0(cur - nw)} first-year income drop (+ ${$0(train)} training)`, cum: `Over ${y} years you'd be ${cum >= 0 ? "ahead" : "behind"} by ${$0(Math.abs(cum))}`, be: be ? `New career pay overtakes the old in year ${be}` : `Doesn't catch up within ${y} years at these growth rates` };
};
export const unpaidLeave: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter annual salary."), wk = p(v, "w", 4), ben = p(v, "b", 600), tax = p(v, "t", 25) / 100;
  const lost = (s / 52) * wk, net = lost * (1 - tax);
  return { l: `${$0(lost)} of gross pay lost (${$0(net)} after tax)`, b: `${$0(ben * (wk / 4.33))} of benefit premiums you may have to pay while on unpaid leave`, note: `${nfmt(wk, 0)} weeks · FMLA protects your job and health insurance for up to 12 weeks; some states pay family leave benefits` };
};
export const fourDay: Calc = (v) => {
  const s = need(p(v, "s", 60000), "Enter annual salary."), h5 = p(v, "h5", 40), h4 = p(v, "h4", 32), cut = p(v, "c", 0) / 100;
  const r5 = s / (h5 * 52), s4 = s * (1 - cut), r4 = s4 / (h4 * 52);
  return { r: `${$2(r4)}/h on a 4-day week vs ${$2(r5)}/h now (${pc(r4 / r5 - 1, 0)})`, p: `${$0(s4)} a year for ${nfmt(h4, 0)} h a week${cut ? ` (${pc(cut, 0)} pay cut)` : " (same pay)"}`, note: "A 4×10 schedule keeps hours the same; a true 32-hour week raises your hourly value" };
};
export const perMinute: Calc = (v) => {
  const s = need(p(v, "s", 75000), "Enter annual salary."), h = p(v, "h", 40), w = p(v, "w", 52);
  const hr = s / (h * w);
  return { m: `${$2(hr / 60)} per working minute (${money(hr / 3600, "$", 4)} per second)`, h: `${$2(hr)} an hour · ${$0(s / w / 5)} a working day`, note: `${$2(s / 525600)} per minute of the whole year, awake or not` };
};
export const million: Calc = (v) => {
  const s = need(p(v, "s", 75000), "Enter annual take-home or salary."), save = p(v, "r", 15) / 100, ret = p(v, "i", 7) / 100;
  const earnY = 1e6 / s; let bal = 0, y = 0; while (bal < 1e6 && y < 100) { bal = bal * (1 + ret) + s * save; y++; }
  return { e: `${nfmt(earnY, 1)} years to earn $1 million in total pay`, s: y < 100 ? `${y} years to save $1 million investing ${pc(save, 0)} of pay at ${pc(ret, 0)}` : "Not reached in 100 years at this savings rate", note: `That's ${$0(s / 2080)} an hour at 2,080 h a year` };
};
export const lifestyleIncome: Calc = (v) => {
  const items = ["h", "c", "f", "hc", "e", "t", "s"].map((k, i) => p(v, k, [2000, 600, 800, 400, 500, 300, 800][i])), tax = p(v, "x", 25) / 100;
  const mo = items.reduce((a, b) => a + b, 0), gross = (mo * 12) / (1 - tax);
  return { g: `${$0(gross)} a year gross needed (${$2(gross / 2080)}/h)`, m: `${$0(mo)} a month: housing ${$0(items[0])}, car ${$0(items[1])}, food ${$0(items[2])}, healthcare ${$0(items[3])}, fun ${$0(items[4])}, travel ${$0(items[5])}, savings ${$0(items[6])}`, note: `Assumes ${pc(tax, 0)} total tax · housing is ${pc(items[0] / mo, 0)} of spending` };
};
export const salaryHistory: Calc = (v) => {
  const s0 = need(p(v, "a", 45000), "Enter starting salary."), s1 = need(p(v, "b", 78000), "Enter current salary."), y = need(p(v, "y", 10), "Enter years."), inf = p(v, "i", 2.8) / 100;
  const cagr = Math.pow(s1 / s0, 1 / y) - 1, real = (1 + cagr) / (1 + inf) - 1;
  return { g: `${pc(cagr)} a year nominal salary growth`, r: `${pc(real)} a year after inflation (${pc(inf)})`, note: `Total ${pc(s1 / s0 - 1, 0)} rise · in today's money your starting pay was ${$0(s0 * Math.pow(1 + inf, y))}` };
};
export const promotion: Calc = (v) => {
  const s = need(p(v, "s", 80000), "Enter current salary."), r = p(v, "r", 12) / 100, g = p(v, "g", 3) / 100, y = Math.max(1, Math.round(p(v, "y", 10))), ret = p(v, "i", 5) / 100;
  let a = s, b = s * (1 + r), diff = 0, k401 = 0;
  for (let k = 0; k < y; k++) { diff += b - a; k401 = (k401 + (b - a) * 0.1) * (1 + ret); a *= 1 + g; b *= 1 + g; }
  return { v: `${$0(diff)} more pay over ${y} years from a ${pc(r, 0)} promotion`, f: `First year +${$0(s * r)} · compounding raises keep the gap growing`, note: `Saving 10% of the extra at ${pc(ret, 0)} grows to ${$0(k401)}` };
};
export const signingClawback: Calc = (v) => {
  const b = need(p(v, "b", 20000), "Enter signing bonus."), mo = need(p(v, "m", 24), "Enter clawback period (months)."), st = p(v, "s", 9), tax = p(v, "t", 35) / 100, pro = pick(v.p, 2) === 0;
  const owe = st >= mo ? 0 : pro ? b * (1 - st / mo) : b;
  return { o: owe ? `You'd repay ${$0(owe)} if you leave after ${nfmt(st, 0)} months` : "Nothing to repay — the clawback period has ended", net: `You received about ${$0(b * (1 - tax))} after tax; repaying gross ${$0(owe)} can exceed that (the tax claim-back is complicated)`, note: pro ? "Pro-rated clawback" : "All-or-nothing clawback — check your offer letter" };
};
export const stockComp: Calc = (v) => {
  const sh = need(p(v, "s", 2000), "Enter shares granted."), pr = need(p(v, "p", 50), "Enter current share price."), y = Math.max(1, p(v, "y", 4)), g = num(v.g, 8) / 100, tax = p(v, "t", 35) / 100;
  let tot = 0; for (let k = 1; k <= y; k++) tot += (sh / y) * pr * Math.pow(1 + g, k);
  return { v: `${$0(sh * pr)} grant value today · ${$0((sh * pr) / y)} a year vesting`, f: `≈ ${$0(tot)} vested over ${nfmt(y, 0)} years at ${pc(g, 0)} annual price growth (${$0(tot * (1 - tax))} after ${pc(tax, 0)} tax)`, note: "RSUs are taxed as wages at vest · options are worth only the spread above the strike — see the NSO/ISO tools" };
};
export const startupEquity: Calc = (v) => {
  const sh = need(p(v, "s", 20000), "Enter options granted."), tot = need(p(v, "t", 10000000), "Enter fully diluted shares."), val = need(p(v, "v", 50000000), "Enter latest valuation."), strike = p(v, "k", 0.5), exit = p(v, "e", 300000000), dil = p(v, "d", 30) / 100;
  const own = sh / tot, pps = val / tot, exitOwn = own * (1 - dil), payout = exitOwn * exit - sh * strike;
  return { o: `You own ${pc(own, 3)} of the company`, v: `Paper value today ${$0(own * val - sh * strike)} (${$2(pps)} per share vs ${$2(strike)} strike)`, e: `At a ${$0(exit)} exit after ${pc(dil, 0)} dilution: ≈ ${$0(Math.max(0, payout))} before tax and liquidation preferences · most startups don't exit` };
};
export const surveySites: Calc = (v) => {
  const r = p(v, "r", 1), m = need(p(v, "m", 15), "Enter minutes per survey."), dq = p(v, "d", 30) / 100, dqm = p(v, "q", 3);
  const per = (r * (1 - dq)) / ((m * (1 - dq) + dqm * dq) / 60);
  return { h: `${$2(per)} per hour`, how: `${$2(r)} per completed survey, ${nfmt(m, 0)} min each, ${pc(dq, 0)} screened out after ~${nfmt(dqm, 0)} min`, note: "Most survey sites pay well under minimum wage — treat it as pocket money, and avoid any that charge to join" };
};
export const mysteryShop: Calc = (v) => {
  const fee = p(v, "f", 15), reimb = p(v, "r", 10), spend = p(v, "s", 10), mi = p(v, "m", 10), mins = need(p(v, "t", 75), "Enter total minutes incl. report.");
  const net = fee + reimb - spend - mi * 0.76;
  return { h: `${$2(net / (mins / 60))} per hour`, n: `${$2(net)} net per shop (fee ${$2(fee)} + reimbursement ${$2(reimb)} − purchase ${$2(spend)} − ${nfmt(mi, 0)} mi)`, note: "Include report-writing time · legitimate mystery shopping companies never ask you to pay or cash cheques" };
};
export const plasma: Calc = (v) => {
  const per = p(v, "p", 50), first = p(v, "f", 100), n = Math.min(8, Math.round(p(v, "n", 8))), mins = p(v, "t", 90), mi = p(v, "m", 10);
  const monthly = (per * n) + first, net = monthly - mi * 2 * n * 0.76, hrs = (n * mins) / 60;
  return { m: `≈ ${$0(net)} a month (${$0(monthly)} paid − travel)`, h: `${$2(net / hrs)} per hour over ${nfmt(hrs, 1)} hours`, note: "FDA rules allow up to 2 donations in 7 days · new-donor promotions boost the first month · check eligibility and stay hydrated" };
};
export const stylist: Calc = (v) => {
  const c = need(p(v, "c", 30), "Enter clients per week."), t = p(v, "t", 65), tips = p(v, "tp", 18) / 100, mode = pick(v.m, 2), split = p(v, "s", 45) / 100, rent = p(v, "r", 250), prod = p(v, "pr", 8) / 100, w = p(v, "w", 48);
  const svc = c * t * w, inc = mode === 0 ? svc * split : svc * (1 - prod) - rent * w, total = inc + svc * tips;
  return { y: `${$0(total)} a year (${$0(total / w)} a week)`, how: mode === 0 ? `Commission ${pc(split, 0)} of ${$0(svc)} services + tips` : `Booth rent: ${$0(svc)} services − ${pc(prod, 0)} products − ${$0(rent * w)} rent + tips`, note: "Booth renters pay their own self-employment tax and supplies but set their own prices" };
};
export const reAgent: Calc = (v) => {
  const n = p(v, "n", 12), pr = need(p(v, "p", 400000), "Enter average sale price."), c = p(v, "c", 2.5) / 100, split = p(v, "s", 70) / 100, cap = p(v, "cp", 0), fees = p(v, "f", 6000);
  const gci = n * pr * c, brokerTake = cap > 0 ? Math.min(gci * (1 - split), cap) : gci * (1 - split), net = gci - brokerTake - fees;
  return { n: `${$0(net)} a year before tax`, g: `Gross commission ${$0(gci)} (${nfmt(n, 0)} sides × ${$0(pr)} × ${pc(c, 2)}) − broker ${$0(brokerTake)}${cap ? " (capped)" : ""} − fees ${$0(fees)}`, note: "Commissions are negotiable (especially after the 2024 NAR settlement) · agents are usually self-employed" };
};
export const insAgent: Calc = (v) => {
  const nb = p(v, "n", 300000), nc = p(v, "nc", 10) / 100, bk = p(v, "b", 1500000), rc = p(v, "rc", 2) / 100, bonus = p(v, "bo", 5000);
  const inc = nb * nc + bk * rc + bonus;
  return { y: `${$0(inc)} a year in commissions`, how: `New premium ${$0(nb)} × ${pc(nc, 0)} + renewals on ${$0(bk)} × ${pc(rc, 0)} + bonuses ${$0(bonus)}`, note: "P&C new commissions are often 10–15%, renewals 2–10%; life insurance first-year commissions can be 40–100% of premium" };
};

// ---- registry (generated)
export const ideaSal1CustomCalculators: Record<string, Calc> = {
  "cost-of-living-raise-needed-calculator": colaRaise,
  "job-offer-comparison-calculator": offerCompare,
  "total-compensation-calculator": totalComp,
  "employee-benefits-value-calculator": benefitsValue,
  "commute-cost-vs-salary-calculator": commuteVsSalary,
  "1099-vs-w2-comparison-calculator": w2v1099,
  "pet-sitting-rate-calculator": petSitRate,
  "travel-nurse-pay-calculator": travelNurse,
  "tip-income-hourly-wage-calculator": tipWage,
  "hourly-wage-needed-for-rent-calculator": housingWage,
  "side-hustle-income-goal-calculator": sideHustle,
  "career-change-income-gap-calculator": careerGap,
  "unpaid-leave-pay-impact-calculator": unpaidLeave,
  "four-day-week-hourly-rate-calculator": fourDay,
  "salary-per-minute-calculator": perMinute,
  "how-long-to-earn-a-million-calculator": million,
  "income-needed-for-lifestyle-calculator": lifestyleIncome,
  "salary-history-growth-calculator": salaryHistory,
  "promotion-raise-value-calculator": promotion,
  "signing-bonus-clawback-calculator": signingClawback,
  "stock-compensation-value-calculator": stockComp,
  "equity-offer-startup-value-calculator": startupEquity,
  "survey-site-hourly-earnings-calculator": surveySites,
  "mystery-shopper-earnings-calculator": mysteryShop,
  "plasma-donation-earnings-calculator": plasma,
  "hairstylist-income-calculator": stylist,
  "real-estate-agent-income-calculator": reAgent,
  "insurance-agent-commission-calculator": insAgent,
  "doordash-earnings-per-hour-calculator": doordash,
  "instacart-earnings-calculator": instacart,
  "amazon-flex-earnings-calculator": amazonFlex,
  "lyft-driver-earnings-calculator": lyft,
  "uber-eats-earnings-calculator": uberEats,
  "grubhub-driver-earnings-calculator": grubhub,
  "shipt-shopper-earnings-calculator": shipt,
  "taskrabbit-earnings-calculator": taskrabbit,
  "fiverr-earnings-after-fees-calculator": fiverr,
  "upwork-earnings-after-fees-calculator": upwork,
  "rover-pet-sitter-earnings-calculator": rover,
  "airbnb-experience-host-earnings-calculator": airbnbExp,
};
