/**
 * Idea build, batch law1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Legal > Divorce & Probate (4), Child Support (5),
 * Court, Criminal & Legal Fees (20) = 29 tools.
 * Figures: federal estate-tax exclusion $15,000,000 per person for 2026 (One Big Beautiful Bill Act); 2026 HHS poverty guideline $15,960
 * for 1 person + $5,680 each extra (48 states/DC; Federal Register 2026-00755), Legal Services Corporation limit 125% of it; federal good-
 * conduct time 54 days per year of sentence imposed (18 U.S.C. 3624(b), First Step Act); federal juror fee $50/day (28 U.S.C. 1871, up to
 * $10 more after 10 trial days); FRAP 4 appeal deadlines (civil 30 days, 60 if the US is a party; criminal 14 days); US copyright terms
 * (17 U.S.C. 302–304: life + 70, work for hire 95/120 years, pre-1978 published works 95 years — works published in 1930 entered the
 * public domain on 1 Jan 2026); USPTO maintenance (Section 8 between years 5–6, Sections 8 & 9 every 10 years, 6-month grace).
 * State-specific figures (support tables, parole percentages, point periods, fines) are editable inputs, not built-in.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText, dayParts, dayNum } from "./trv-core";
import { txt } from "./sci-math-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const $0 = (x: number) => money(x, "$", 0);
const $2 = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const today = () => Math.floor(Date.now() / 86400000);
const addMonths = (day: number, m: number) => { const d = dayParts(day); const tot = d.m - 1 + Math.round(m), y = d.y + Math.floor(tot / 12), mo = ((tot % 12) + 12) % 12 + 1; const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return dayNum(y, mo, Math.min(d.d, last)); };
const addYears = (day: number, y: number) => addMonths(day, y * 12);
const left = (day: number) => { const d = day - today(); return d > 0 ? `${nfmt(d, 0)} days from today` : d === 0 ? "today" : `${nfmt(-d, 0)} days ago`; };
const list = (s: string) => s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
const fpl = (n: number) => 15960 + 5680 * (Math.max(1, Math.round(n)) - 1);

// ---- Divorce & probate ----
export const estateValue: Calc = (v) => {
  const a = ["h", "i", "r", "l", "c", "pp", "b", "o"].map((k, i) => p(v, k, [450000, 200000, 300000, 250000, 25000, 30000, 0, 10000][i]));
  const d = ["mo", "dt", "f"].map((k, i) => p(v, k, [180000, 15000, 12000][i])), adm = p(v, "a", 3) / 100;
  const gross = a.reduce((x, y) => x + y, 0), debts = d.reduce((x, y) => x + y, 0), admin = gross * adm, net = gross - debts - admin;
  const nonProbate = a[2] + a[3];
  return { n: `${$0(net)} net estate`, g: `Gross ${$0(gross)} − debts ${$0(debts)} − estimated admin costs ${$0(admin)}`, p: `About ${$0(nonProbate)} (retirement + life insurance with named beneficiaries) passes outside probate · ${gross > 15e6 ? "above" : "below"} the $15 million 2026 federal estate-tax exclusion` };
};
export const trustDistribution: Calc = (v) => {
  const val = need(p(v, "v", 800000), "Enter trust value."), exp = p(v, "e", 20000), tax = p(v, "t", 0);
  const ben = list(txt(v, "b") || "Child A 50, Child B 30, Charity 20").map((s) => { const m = s.match(/^(.*?)[\s:=]+([\d.]+)%?$/); return m ? { n: m[1].trim(), s: Number(m[2]) } : null; }).filter((x): x is { n: string; s: number } => !!x && x.s > 0);
  if (!ben.length) throw new InputError("List beneficiaries like: Anna 50, Ben 50");
  const tot = ben.reduce((a, b) => a + b.s, 0), net = val - exp - tax;
  return { d: ben.map((b) => `${b.n}: ${$0((net * b.s) / tot)} (${pc(b.s / tot, 1)})`).join(" · "), n: `${$0(net)} to distribute after ${$0(exp)} expenses and ${$0(tax)} taxes`, note: tot !== 100 ? `Shares add to ${nfmt(tot, 1)} — scaled to 100%` : "Follow the trust document; the trustee may hold back a reserve for final taxes" };
};
export const siblingSplit: Calc = (v) => {
  const est = need(p(v, "e", 600000), "Enter estate value."), exp = p(v, "x", 25000), n = Math.max(1, Math.round(p(v, "n", 3)));
  const adv = list(txt(v, "a") || "0, 20000, 0").map((x) => Math.max(0, Number(x.replace(/[$,]/g, "")) || 0));
  while (adv.length < n) adv.push(0);
  const net = est - exp, eq = pick(v.m, 2) === 0, pool = net + (eq ? adv.slice(0, n).reduce((a, b) => a + b, 0) : 0), each = pool / n;
  return { s: eq ? adv.slice(0, n).map((a, i) => `Sibling ${i + 1}: ${$0(Math.max(0, each - a))}`).join(" · ") : `${$0(each)} each`, how: eq ? `(Net ${$0(net)} + lifetime gifts ${$0(pool - net)}) ÷ ${n} = ${$0(each)} each, less what each already received` : `Net ${$0(net)} ÷ ${n} siblings`, note: "Lifetime gifts only count against a share if the will or state 'advancement' law says so" };
};
export const prenup: Calc = (v) => {
  const s = need(p(v, "s", 300000), "Enter premarital assets."), r = p(v, "r", 6) / 100, y = Math.max(1, Math.round(p(v, "y", 15))), c = p(v, "c", 20000);
  let sep = s, mar = 0; for (let k = 0; k < y; k++) { sep *= 1 + r; mar = mar * (1 + r) + c; }
  return { p: `${$0(sep)} separate property after ${y} years (premarital assets + passive growth)`, m: `${$0(mar)} built from marital contributions — typically split; ${$0(mar / 2)} each at 50/50`, note: "A prenup can keep separate assets and their growth separate; mixing (commingling) them can turn them marital" };
};
// ---- Child support ----
export const sharedCustody: Calc = (v) => {
  const a = need(p(v, "a", 6000), "Enter parent A monthly income."), b = p(v, "b", 4000), bo = need(p(v, "o", 1500), "Enter the basic obligation from your state table."), on = Math.min(365, p(v, "n", 146)), mult = p(v, "m", 1.5);
  const sa = a / (a + b), tA = on / 365, tB = 1 - tA, adj = bo * mult, aOwes = adj * sa * tB, bOwes = adj * (1 - sa) * tA, net = aOwes - bOwes;
  return { s: `${net >= 0 ? "Parent A pays Parent B" : "Parent B pays Parent A"} ≈ ${$0(Math.abs(net))} a month`, how: `Shared obligation ${$0(bo)} × ${nfmt(mult, 2)} = ${$0(adj)} · A's income share ${pc(sa, 0)} · A has ${pc(tA, 0)} of overnights`, note: "Cross-credit (income-shares) method used by many states — the basic obligation, multiplier and shared-time threshold come from your state's guidelines" };
};
export const imputedIncome: Calc = (v) => {
  const mw = p(v, "w", 7.25), h = p(v, "h", 40), prior = p(v, "p", 52000), pctP = p(v, "x", 0) / 100, act = p(v, "a", 0);
  const mwInc = mw * h * 52, pri = prior * pctP, imp = Math.max(mwInc, pri, act);
  return { i: `${$0(imp)} a year imputed (${$0(imp / 12)} a month)`, how: `Highest of: minimum-wage full time ${$0(mwInc)}, ${pc(pctP, 0)} of prior earnings ${$0(pri)}, actual income ${$0(act)}`, note: "Courts impute income when a parent is voluntarily unemployed or underemployed; they look at work history, skills and local jobs" };
};
const split = (label: string): Calc => (v) => {
  const c = need(p(v, "c", 1200), "Enter the cost."), a = p(v, "a", 6000), b = p(v, "b", 4000), cr = p(v, "t", 0) / 100;
  if (!(a + b > 0)) throw new InputError("Enter both parents' incomes.");
  const net = c * (1 - cr), sa = a / (a + b);
  return { a: `Parent A pays ${$0(net * sa)} (${pc(sa, 0)})`, b: `Parent B pays ${$0(net * (1 - sa))} (${pc(1 - sa, 0)})`, note: `${label}${cr ? ` · ${pc(cr, 0)} credit/aid taken off first: ${$0(c * cr)}` : ""}` };
};
export const childCareSplit = split("Child care costs are usually split in proportion to income, on top of basic support");
export const medicalSplit = split("Uninsured medical costs and premiums for the child are commonly split by income share");
export const collegeSplit = split("College contributions depend on your state and agreement — take off scholarships and the child's share first");
// ---- Court, criminal & legal fees ----
export const contingency: Calc = (v) => {
  const s = need(p(v, "s", 100000), "Enter the settlement."), f = p(v, "f", 33.33) / 100, tr = pick(v.t, 2) === 1, f2 = p(v, "f2", 40) / 100, c = p(v, "c", 5000), med = p(v, "m", 20000), before = pick(v.b, 2) === 0;
  const rate = tr ? f2 : f, fee = before ? s * rate : (s - c) * rate, net = s - fee - c - med;
  return { n: `${$0(net)} to you`, how: `${$0(s)} − fee ${$0(fee)} (${pc(rate, 1)} ${before ? "of gross" : "after costs"}) − costs ${$0(c)} − medical liens ${$0(med)}`, note: "Typical contingency fees are 33⅓% pre-trial and 40% if the case goes to trial; liens can often be negotiated down" };
};
export const hourlyLegal: Calc = (v) => {
  const r = need(p(v, "r", 350), "Enter hourly rate."), h = p(v, "h", 25), pr = p(v, "pr", 125), ph = p(v, "ph", 10), cost = p(v, "c", 1500), ret = p(v, "re", 5000);
  const tot = r * h + pr * ph + cost;
  return { t: `${$0(tot)} estimated total`, how: `Attorney ${nfmt(h, 1)} h × ${$0(r)} + paralegal ${nfmt(ph, 1)} h × ${$0(pr)} + costs ${$0(cost)}`, note: `Retainer ${$0(ret)} covers ${pc(Math.min(1, ret / tot), 0)} — billing is usually in 6-minute (0.1 h) increments` };
};
export const goodTime: Calc = (v) => {
  const st = dateIn(v, "d", today()), mo = need(p(v, "m", 60), "Enter the sentence in months."), jc = p(v, "j", 0), etc = p(v, "e", 0);
  const yrs = mo / 12, gct = mo > 12 ? Math.floor(54 * yrs) : 0, full = addMonths(st, mo), rel = full - gct - jc - etc;
  return { r: `Projected release ${dayText(rel)} (${left(rel)})`, how: `Full term ends ${dayText(full)} − ${nfmt(gct, 0)} days good-conduct time${jc ? ` − ${nfmt(jc, 0)} jail credit` : ""}${etc ? ` − ${nfmt(etc, 0)} First Step Act credits` : ""}`, note: mo > 12 ? `Federal: 54 days per year of sentence imposed → about ${pc((mo * 30.44 - gct) / (mo * 30.44), 0)} of the sentence served; BOP's own calculation controls` : "No federal good-conduct time on sentences of a year or less" };
};
export const parole: Calc = (v) => {
  const st = dateIn(v, "d", today()), mo = need(p(v, "m", 120), "Enter the sentence in months."), pc0 = p(v, "p", 33) / 100, jc = p(v, "j", 0);
  const elig = addMonths(st, mo * pc0) - jc, max = addMonths(st, mo) - jc;
  return { e: `Parole eligibility ${dayText(elig)} (${left(elig)})`, m: `Maximum release ${dayText(max)}`, note: `${pc(pc0, 0)} of ${nfmt(mo, 0)} months — the share required varies by state and offence; eligibility doesn't guarantee release` };
};
export const probationEnd: Calc = (v) => {
  const st = dateIn(v, "d", today()), mo = need(p(v, "m", 24), "Enter the probation term in months."), cr = p(v, "c", 0), ext = p(v, "x", 0);
  const end = addMonths(st, mo + ext) - cr;
  return { e: `Probation ends ${dayText(end)}`, r: left(end), note: `${nfmt(mo, 0)} months${ext ? ` + ${nfmt(ext, 0)} months extension` : ""}${cr ? ` − ${nfmt(cr, 0)} days credit` : ""} · early termination may be possible after half the term in some courts` };
};
const payoff = (bal: number, pay: number, apr: number) => { if (apr <= 0) return Math.ceil(bal / pay); const r = apr / 12; if (pay <= bal * r) return Infinity; return Math.ceil(-Math.log(1 - (bal * r) / pay) / Math.log(1 + r)); };
export const restitution: Calc = (v) => {
  const a = need(p(v, "a", 8000), "Enter restitution owed."), pay = need(p(v, "p", 150), "Enter monthly payment."), apr = p(v, "i", 0) / 100, fee = p(v, "f", 0);
  const n = payoff(a, Math.max(0.01, pay - fee), apr);
  if (!Number.isFinite(n)) throw new InputError("The payment doesn't cover the monthly interest.");
  return { m: `${n} months (${nfmt(n / 12, 1)} years)`, t: `About ${$0(pay * n)} paid in total`, note: `Paid off around ${dayText(addMonths(today(), n))} · federal restitution can accrue interest on amounts over $2,500 unless waived` };
};
export const duiCost: Calc = (v) => {
  const it = ["f", "c", "b", "a", "t", "cl", "l"].map((k, i) => p(v, k, [1500, 500, 500, 5000, 300, 600, 250][i]));
  const ins = p(v, "i", 1600), iy = p(v, "y", 3), ilm = p(v, "im", 12), ilc = p(v, "ic", 100), lw = p(v, "w", 1000);
  const tot = it.reduce((a, b) => a + b, 0) + ins * iy + ilm * ilc + lw;
  return { t: `${$0(tot)} total DUI cost`, parts: `Fine ${$0(it[0])} · court costs ${$0(it[1])} · bail ${$0(it[2])} · lawyer ${$0(it[3])} · towing/impound ${$0(it[4])} · classes ${$0(it[5])} · license reinstatement ${$0(it[6])} · insurance +${$0(ins)}/yr × ${nfmt(iy, 0)} · interlock ${$0(ilm * ilc)} · lost wages ${$0(lw)}`, note: "Insurance increases usually last 3–5 years and are often the biggest cost" };
};
export const pointsExpire: Calc = (v) => {
  const d = dateIn(v, "d", today() - 200), y = p(v, "y", 3), pts = p(v, "n", 3), tot = p(v, "t", 6), lim = p(v, "l", 12);
  const ex = addMonths(d, y * 12);
  return { e: `Points drop off ${dayText(ex)} (${left(ex)})`, s: `${nfmt(tot, 0)} points now; ${nfmt(Math.max(0, tot - pts), 0)} after these ${nfmt(pts, 0)} expire`, note: `${tot >= lim ? "At or over" : `${nfmt(lim - tot, 0)} points below`} the ${nfmt(lim, 0)}-point suspension level · the record period can be longer than the points period` };
};
export const prejudgment: Calc = (v) => {
  const a = need(p(v, "a", 50000), "Enter the principal."), r = p(v, "r", 9) / 100, s = dateIn(v, "s", today() - 730), e = dateIn(v, "e", today()), comp = pick(v.c, 2) === 1;
  if (e <= s) throw new InputError("The end date must be after the start date.");
  const yrs = (e - s) / 365, int = comp ? a * (Math.pow(1 + r, yrs) - 1) : a * r * yrs;
  return { i: `${$2(int)} prejudgment interest`, t: `${$2(a + int)} total · ${nfmt(e - s, 0)} days at ${pc(r, 2)} ${comp ? "compounded yearly" : "simple"}`, note: `${$2((a * r) / 365)} per day · statutory rates and start dates vary by state and claim type` };
};
export const expungement: Calc = (v) => {
  const d = dateIn(v, "d", today() - 1000), y = p(v, "y", 5);
  const el = addMonths(d, y * 12);
  return { e: `Eligible to apply from ${dayText(el)}`, r: el <= today() ? "The waiting period has passed" : `${left(el)}`, note: "Waiting periods usually start when the sentence (incl. probation and fines) is complete; new offences can reset the clock" };
};
export const juryPay: Calc = (v) => {
  const d = need(p(v, "d", 5), "Enter days served."), r = p(v, "r", 50), extra = p(v, "x", 10), mi = p(v, "m", 20), cpm = p(v, "c", 0.725), park = p(v, "p", 0), emp = p(v, "e", 0);
  const pay = r * Math.min(d, 10) + (r + extra) * Math.max(0, d - 10), travel = mi * 2 * d * cpm + park * d;
  return { t: `${$2(pay + travel)} juror pay + mileage`, how: `${nfmt(d, 0)} days: fees ${$2(pay)} + mileage/parking ${$2(travel)}`, note: emp ? `Your employer pays ${$2(emp * d)} of regular wages too` : "Federal jurors get $50/day (up to $10 more after 10 days of trial); state courts set their own rates" };
};
export const processServer: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 2))), f = p(v, "f", 75), rush = pick(v.r, 3), att = p(v, "a", 1), xa = p(v, "x", 15), mi = p(v, "m", 0), cpm = p(v, "c", 1), sk = p(v, "s", 0);
  const per = f * [1, 1.6, 2.5][rush] + Math.max(0, att - 3) * xa + mi * cpm, tot = per * n + sk;
  return { t: `${$0(tot)} for ${n} defendant${n > 1 ? "s" : ""}`, how: `${$0(f)} base${rush ? ` × ${["", "1.6 rush", "2.5 same-day"][rush]}` : ""} + extra attempts + mileage${sk ? ` + skip trace ${$0(sk)}` : ""}`, note: "Routine service is often $50–$150 each; sheriffs can be cheaper but slower" };
};
export const legalAid: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 3))), inc = p(v, "i", 30000), lim = p(v, "l", 125) / 100, fp = fpl(n), cap = fp * lim, ratio = inc / fp;
  return { e: inc <= cap ? `Likely income-eligible (${pc(ratio, 0)} of the poverty line)` : `Over the ${pc(lim, 0)} limit (${pc(ratio, 0)} of the poverty line)`, l: `Limit for ${n}: ${$0(cap)} a year (${$0(cap / 12)} a month) · 2026 poverty guideline ${$0(fp)}`, note: "LSC-funded programs use 125% (up to 200% with exceptions); assets and case type also count · Alaska and Hawaii use higher guidelines" };
};
export const courtPlan: Calc = (v) => {
  const a = need(p(v, "a", 2400), "Enter amount owed."), dn = p(v, "d", 200), m = Math.max(1, Math.round(p(v, "m", 12))), fee = p(v, "f", 25), mf = p(v, "mf", 0);
  const mo = (a - dn) / m + mf;
  return { m: `${$2(mo)} a month for ${m} months`, t: `${$2(dn + mo * m + fee)} total incl. ${$2(fee)} setup fee${mf ? ` and ${$2(mf)}/month fee` : ""}`, note: "If you can't afford it, ask the court about an ability-to-pay hearing, community service or a lower payment" };
};
export const parkingLate: Calc = (v) => {
  const f = need(p(v, "f", 65), "Enter the fine."), dl = p(v, "d", 45), l1 = p(v, "l", 25), dbl = pick(v.x, 2) === 1, col = p(v, "c", 0) / 100;
  const late = dbl ? f : l1, t1 = f + late, t2 = t1 * (1 + col);
  return { t: `${$0(f)} if paid on time (within ${nfmt(dl, 0)} days)`, l: `${$0(t1)} once late (${dbl ? "fine doubles" : `+${$0(l1)} penalty`})`, note: col ? `${$0(t2)} if sent to collections (+${pc(col, 0)})` : "Unpaid tickets can lead to boots, tows or registration holds" };
};
export const redLight: Calc = (v) => {
  const f = need(p(v, "f", 100), "Enter the base fine."), a = p(v, "a", 0), t = p(v, "t", 0), late = p(v, "l", 0), sch = p(v, "s", 0);
  const tot = f + a + t + late;
  return { t: `${$0(tot)} total`, how: `Fine ${$0(f)} + fees ${$0(a)} + assessments ${$0(t)}${late ? ` + late ${$0(late)}` : ""}`, note: sch ? `Traffic school costs ${$0(sch)} on top but can keep points off` : "Camera tickets are often civil (no points) in many states; check the notice for options" };
};
export const tollViolation: Calc = (v) => {
  const n = Math.max(1, Math.round(p(v, "n", 4))), t = p(v, "t", 4.5), a = p(v, "a", 25), es = p(v, "e", 0), cap = p(v, "c", 0);
  const fees = cap > 0 ? Math.min(cap, a * n) : a * n, tot = t * n + fees + es;
  return { t: `${$0(tot)} owed`, how: `${n} tolls × ${$2(t)} = ${$2(t * n)} + admin fees ${$0(fees)}${es ? ` + escalation ${$0(es)}` : ""}`, note: "Paying the invoice quickly often waives fees; getting a transponder avoids pay-by-plate surcharges" };
};
export const appealDeadline: Calc = (v) => {
  const d = dateIn(v, "d", today()), ty = pick(v.t, 4), cust = p(v, "c", 30);
  const days = [30, 60, 14, cust][ty], due = d + days;
  return { d: `Notice of appeal due ${dayText(due)} (${left(due)})`, how: `${nfmt(days, 0)} days after entry of judgment (${["federal civil", "federal civil with the US as a party", "federal criminal (defendant)", "custom rule"][ty]})`, note: "If the last day is a weekend or legal holiday it rolls to the next business day (FRAP 26) · post-trial motions can toll the deadline — confirm with the court rules" };
};
export const copyright: Calc = (v) => {
  const ty = pick(v.t, 3), death = p(v, "d", 1990), pub = p(v, "p", 1950), cr = p(v, "c", 1949), now = dayParts(today()).y;
  const last = ty === 0 ? death + 70 : ty === 1 ? Math.min(pub + 95, cr + 120) : pub + 95, pd = last + 1;
  return { e: `Protected through 31 Dec ${last}; public domain from 1 Jan ${pd}`, s: pd <= now ? "Already in the US public domain" : `${pd - now} more year${pd - now === 1 ? "" : "s"} of protection`, note: `${["Life of author + 70 years", "Work for hire / anonymous: 95 years from publication or 120 from creation, whichever ends first", "Published before 1978: 95 years from publication (if notice and any required renewal were done)"][ty]} · US rules; other countries differ` };
};
export const trademark: Calc = (v) => {
  const r = dateIn(v, "d", today() - 1500), y5 = addYears(r, 5), y6 = addYears(r, 6), y9 = addYears(r, 9), y10 = addYears(r, 10);
  const nx = [y6, y10, addYears(r, 20), addYears(r, 30)].find((x) => x > today()) ?? addYears(r, 40);
  return { s8: `Section 8 declaration: ${dayText(y5)} – ${dayText(y6)} (grace to ${dayText(addMonths(y6, 6))})`, r10: `Section 8 & 9 renewal: ${dayText(y9)} – ${dayText(y10)}, then every 10 years`, n: `Next deadline ${dayText(nx)} (${left(nx)}) · missing it cancels the registration` };
};

// ---- registry (generated)
export const ideaLaw1CustomCalculators: Record<string, Calc> = {
  "estate-value-calculator": estateValue,
  "trust-distribution-calculator": trustDistribution,
  "inheritance-split-siblings-calculator": siblingSplit,
  "prenup-asset-protection-calculator": prenup,
  "child-support-shared-custody-calculator": sharedCustody,
  "child-support-imputed-income-calculator": imputedIncome,
  "attorney-contingency-fee-calculator": contingency,
  "legal-fees-hourly-estimate-calculator": hourlyLegal,
  "sentence-good-time-credit-calculator": goodTime,
  "parole-eligibility-date-calculator": parole,
  "probation-end-date-calculator": probationEnd,
  "restitution-payment-plan-calculator": restitution,
  "dui-total-cost-calculator": duiCost,
  "traffic-points-expiration-calculator": pointsExpire,
  "prejudgment-interest-calculator": prejudgment,
  "expungement-waiting-period-calculator": expungement,
  "jury-duty-pay-calculator": juryPay,
  "process-server-cost-calculator": processServer,
  "legal-aid-eligibility-calculator": legalAid,
  "court-ordered-payment-plan-calculator": courtPlan,
  "parking-ticket-late-penalty-calculator": parkingLate,
  "red-light-camera-fine-calculator": redLight,
  "toll-violation-fine-calculator": tollViolation,
  "appeal-deadline-calculator": appealDeadline,
  "copyright-expiration-calculator": copyright,
  "trademark-renewal-date-calculator": trademark,
  "child-care-cost-split-calculator": childCareSplit,
  "medical-support-split-calculator": medicalSplit,
  "college-expense-split-divorced-parents-calculator": collegeSplit,
};
