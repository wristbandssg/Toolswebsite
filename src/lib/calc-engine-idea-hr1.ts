/**
 * Idea build, batch hr1 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Business & Industrial > HR, Marketing & Business Operations, part 1 (30 tools).
 * NPS = %promoters − %detractors; NRR = (start MRR + expansion − contraction − churn)/start MRR;
 * Sales velocity = opportunities × win rate × deal size ÷ cycle days. TAM/SAM/SOM top-down.
 */

import { type TrvCalculator as Calc, InputError, num, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;

export const timeToHire: Calc = (v) => {
  const days = p(v, "d", 1200), hires = need(p(v, "h", 30), "Enter hires."), open = p(v, "o", 8), salary = p(v, "s", 65000);
  const avg = days / hires, vac = (salary / 260) * avg * open * 0.5;
  return { avg: `${avg.toFixed(1)} days average time to hire`, cost: `${$(vac, 0)} estimated lost productivity across ${open} open roles`, bench: avg <= 30 ? "Faster than the ~44-day average" : avg <= 45 ? "Around average" : "Slower than average" };
};
export const retention: Calc = (v) => {
  const start = need(p(v, "s", 200), "Enter starting headcount."), left = p(v, "l", 24), hired = p(v, "h", 30);
  const r = (start - left) / start, end = start - left + hired;
  return { r: `${pc(r)} retention`, turnover: `${pc(left / ((start + end) / 2))} turnover rate`, end: `${nfmt(end)} employees at period end` };
};
export const absenteeism: Calc = (v) => {
  const lost = p(v, "l", 180), emp = need(p(v, "e", 50), "Enter employees."), days = need(p(v, "d", 250), "Enter work days."), cost = p(v, "c", 280);
  const r = lost / (emp * days);
  return { r: `${pc(r, 2)} absenteeism rate`, perEmp: `${(lost / emp).toFixed(1)} days absent per employee`, cost: `${$(lost * cost, 0)} cost of absence` };
};
export const trainingRoi: Calc = (v) => {
  const benefit = p(v, "b", 120000), cost = need(p(v, "c", 40000), "Enter program cost.");
  return { roi: `${pc((benefit - cost) / cost, 0)} ROI`, net: `${$(benefit - cost, 0)} net benefit`, bcr: `${(benefit / cost).toFixed(2)} benefit-cost ratio` };
};
export const headcount: Calc = (v) => {
  const rev = p(v, "r", 15e6), rpe = need(p(v, "rpe", 200000), "Enter revenue per employee."), cur = p(v, "c", 60), att = p(v, "a", 12) / 100;
  const needed = Math.ceil(rev / rpe), backfill = Math.round(cur * att);
  return { need: `${needed} employees needed`, hire: `${Math.max(0, needed - cur) + backfill} hires (${Math.max(0, needed - cur)} growth + ${backfill} backfill)`, rpe: `${$(rpe, 0)} revenue per employee` };
};
export const spanControl: Calc = (v) => {
  const ics = p(v, "i", 120), mgrs = need(p(v, "m", 15), "Enter managers."), target = p(v, "t", 8);
  const s = ics / mgrs;
  return { s: `${s.toFixed(1)} direct reports per manager`, need: `${Math.ceil(ics / target)} managers at a span of ${target}`, note: s < 5 ? "Narrow span — may mean too many layers" : s > 12 ? "Wide span — managers may be stretched" : "Within the common 5–12 range" };
};
export const compaRatio: Calc = (v) => {
  const sal = need(p(v, "s", 72000), "Enter salary."), mid = need(p(v, "m", 80000), "Enter range midpoint."), min = p(v, "mn", 64000), max = p(v, "mx", 96000);
  const cr = sal / mid, pos = (sal - min) / Math.max(max - min, 1);
  return { cr: `${cr.toFixed(2)} compa-ratio`, pos: `${pc(pos, 0)} range penetration`, note: cr < 0.9 ? "Below midpoint — room for increases" : cr > 1.1 ? "Above midpoint" : "Near midpoint (market rate)" };
};
export const meritBudget: Calc = (v) => {
  const payroll = p(v, "p", 4e6), pctB = p(v, "b", 3.5) / 100, top = p(v, "t", 20) / 100, topInc = p(v, "ti", 6) / 100;
  const budget = payroll * pctB, topCost = payroll * top * topInc, rest = (budget - topCost) / Math.max(payroll * (1 - top), 1);
  return { budget: `${$(budget, 0)} merit budget`, top: `Top ${pc(top, 0)} at ${pc(topInc, 1)} costs ${$(topCost, 0)}`, rest: `Leaves ${pc(rest, 2)} average for everyone else` };
};
export const bonusPool: Calc = (v) => {
  const profit = p(v, "p", 2e6), share = p(v, "s", 10) / 100, emp = need(p(v, "e", 40), "Enter eligible employees."), target = p(v, "t", 100) / 100;
  const pool = profit * share * target;
  return { pool: `${$(pool, 0)} bonus pool`, avg: `${$(pool / emp, 0)} average per employee`, note: `${pc(share, 0)} of profit at ${pc(target, 0)} of target funding` };
};
export const commission: Calc = (v) => {
  const sales = p(v, "s", 180000), quota = need(p(v, "q", 150000), "Enter quota."), base = p(v, "b", 8) / 100, acc = p(v, "a", 12) / 100;
  const atQ = Math.min(sales, quota) * base, over = Math.max(0, sales - quota) * acc;
  return { pay: `${$(atQ + over, 0)} commission`, att: `${pc(sales / quota, 0)} of quota`, split: `${$(atQ, 0)} up to quota + ${$(over, 0)} accelerator` };
};
export const ltvCac: Calc = (v) => {
  const arpu = p(v, "a", 80), gm = p(v, "g", 75) / 100, churn = Math.max(0.0001, p(v, "c", 3) / 100), cac = need(p(v, "cac", 600), "Enter CAC.");
  const ltv = (arpu * gm) / churn, r = ltv / cac;
  return { r: `${r.toFixed(1)} : 1 LTV to CAC`, ltv: `${$(ltv, 0)} customer lifetime value`, verdict: r >= 3 ? "Healthy (3:1 or better)" : r >= 1 ? "Marginal — improve retention or lower CAC" : "Losing money on each customer", payback: `${(cac / (arpu * gm)).toFixed(1)} months to recover CAC` };
};
export const nrr: Calc = (v) => {
  const s = need(p(v, "s", 500000), "Enter starting MRR."), exp = p(v, "e", 60000), con = p(v, "c", 15000), ch = p(v, "ch", 25000);
  const n = (s + exp - con - ch) / s, g = (s - con - ch) / s;
  return { nrr: `${pc(n)} net revenue retention`, grr: `${pc(g)} gross revenue retention`, note: n >= 1.2 ? "Best-in-class (>120%)" : n >= 1 ? "Expansion outweighs churn" : "Revenue base is shrinking" };
};
export const nps: Calc = (v) => {
  const pro = p(v, "p", 180), pas = p(v, "pa", 70), det = p(v, "d", 50), tot = pro + pas + det;
  if (!(tot > 0)) throw new InputError("Enter survey responses.");
  const s = ((pro - det) / tot) * 100;
  return { nps: `NPS ${s.toFixed(0)}`, mix: `${pc(pro / tot, 0)} promoters · ${pc(pas / tot, 0)} passives · ${pc(det / tot, 0)} detractors`, rating: s >= 50 ? "Excellent" : s >= 30 ? "Great" : s >= 0 ? "Good" : "Needs work" };
};
export const csat: Calc = (v) => {
  const sat = p(v, "s", 420), tot = need(p(v, "t", 500), "Enter total responses.");
  return { csat: `${pc(sat / tot)} CSAT`, note: "Satisfied = 4 or 5 on a 5-point scale", bench: sat / tot >= 0.8 ? "Above the ~78% cross-industry average" : "Below typical benchmarks" };
};
export const cpl: Calc = (v) => {
  const spend = p(v, "s", 5000), leads = need(p(v, "l", 250), "Enter leads."), closeR = p(v, "c", 8) / 100, value = p(v, "v", 1500);
  return { cpl: `${$(spend / leads)} per lead`, cpa: `${$(spend / Math.max(leads * closeR, 1))} per customer`, roi: `${pc((leads * closeR * value - spend) / Math.max(spend, 1), 0)} campaign ROI` };
};
export const cpa: Calc = (v) => {
  const spend = p(v, "s", 8000), conv = need(p(v, "c", 160), "Enter conversions."), aov = p(v, "a", 90), margin = p(v, "m", 40) / 100;
  const c = spend / conv;
  return { cpa: `${$(c)} cost per acquisition`, be: `${$(aov * margin)} break-even CPA (order value × margin)`, verdict: c <= aov * margin ? "Profitable on the first order" : "Unprofitable on the first order — relies on repeat purchases" };
};
export const roas: Calc = (v) => {
  const rev = p(v, "r", 24000), spend = need(p(v, "s", 6000), "Enter ad spend."), margin = p(v, "m", 40) / 100;
  const r = rev / spend;
  return { roas: `${r.toFixed(2)}× ROAS (${pc(r, 0)})`, be: `${(1 / Math.max(margin, 0.01)).toFixed(2)}× break-even ROAS at ${pc(margin, 0)} margin`, profit: `${$(rev * margin - spend, 0)} profit after ad spend` };
};
export const cpm: Calc = (v) => {
  const cost = p(v, "c", 1200), imp = need(p(v, "i", 400000), "Enter impressions.");
  return { cpm: `${$((cost / imp) * 1000)} CPM`, per: `${$(cost / imp, 5)} per impression`, reach: `${nfmt(imp)} impressions for ${$(cost, 0)}` };
};
export const cpc: Calc = (v) => {
  const cost = p(v, "c", 1500), clicks = need(p(v, "k", 1000), "Enter clicks."), imp = p(v, "i", 50000), conv = p(v, "cv", 3) / 100;
  return { cpc: `${$(cost / clicks)} CPC`, ctr: imp ? `${pc(clicks / imp, 2)} click-through rate` : "—", cpa: `${$(cost / Math.max(clicks * conv, 1))} per conversion at ${pc(conv, 1)}` };
};
export const openRate: Calc = (v) => {
  const sent = need(p(v, "s", 10000), "Enter emails sent."), bounced = p(v, "b", 200), opens = p(v, "o", 3500), clicks = p(v, "c", 420);
  const delivered = sent - bounced;
  return { open: `${pc(opens / delivered)} open rate`, ctr: `${pc(clicks / delivered, 2)} click rate · ${pc(clicks / Math.max(opens, 1))} click-to-open`, del: `${pc(delivered / sent)} delivered` };
};
export const emailRoi: Calc = (v) => {
  const rev = p(v, "r", 18000), cost = need(p(v, "c", 900), "Enter email costs.");
  return { roi: `${pc((rev - cost) / cost, 0)} ROI`, per: `${$(rev / cost)} earned per $1 spent`, net: `${$(rev - cost, 0)} net` };
};
export const seoValue: Calc = (v) => {
  const traffic = p(v, "t", 25000), cpc0 = p(v, "c", 1.8), conv = p(v, "cv", 2) / 100, aov = p(v, "a", 80);
  return { value: `${$(traffic * cpc0, 0)} a month in equivalent ad spend`, rev: `${$(traffic * conv * aov, 0)} monthly revenue from organic traffic`, year: `${$(traffic * cpc0 * 12, 0)} a year traffic value` };
};
export const mktBudget: Calc = (v) => {
  const rev = p(v, "r", 2e6), pctM = p(v, "p", 8) / 100;
  const b = rev * pctM;
  return { b: `${$(b, 0)} a year (${$(b / 12, 0)} a month)`, split: `Digital ads ${$(b * 0.4, 0)} · content/SEO ${$(b * 0.2, 0)} · events ${$(b * 0.15, 0)} · tools ${$(b * 0.1, 0)} · other ${$(b * 0.15, 0)}`, note: "Small businesses often spend 7–12% of revenue on marketing" };
};
export const tam: Calc = (v) => {
  const pop = p(v, "p", 2e6), price = p(v, "pr", 300), serv = p(v, "s", 30) / 100, share = p(v, "sh", 5) / 100;
  const T = pop * price, S = T * serv, O = S * share;
  return { tam: `TAM ${$(T, 0)}`, sam: `SAM ${$(S, 0)} (${pc(serv, 0)} you can serve)`, som: `SOM ${$(O, 0)} (${pc(share, 1)} realistic share)` };
};
export const quota: Calc = (v) => {
  const ach = p(v, "a", 410000), q = need(p(v, "q", 450000), "Enter quota."), reps = p(v, "r", 10), atQ = p(v, "aq", 6);
  return { att: `${pc(ach / q, 0)} quota attainment`, gap: ach >= q ? `${$(ach - q, 0)} above quota` : `${$(q - ach, 0)} short`, team: reps ? `${pc(atQ / reps, 0)} of reps at quota` : "—" };
};
export const coverage: Calc = (v) => {
  const pipe = p(v, "p", 1.5e6), q = need(p(v, "q", 500000), "Enter quota."), wr = Math.max(0.01, p(v, "w", 25) / 100);
  const c = pipe / q;
  return { c: `${c.toFixed(2)}× pipeline coverage`, need: `${(1 / wr).toFixed(1)}× needed at a ${pc(wr, 0)} win rate (${$(q / wr, 0)})`, verdict: c >= 1 / wr ? "Enough pipeline" : `${$(q / wr - pipe, 0)} more pipeline needed` };
};
export const winRate: Calc = (v) => {
  const won = p(v, "w", 18), lost = p(v, "l", 42), open = p(v, "o", 20);
  const closed = won + lost;
  if (!(closed > 0)) throw new InputError("Enter won and lost deals.");
  return { wr: `${pc(won / closed)} win rate`, exp: `${(open * (won / closed)).toFixed(1)} expected wins from ${open} open deals`, note: `${closed} closed deals` };
};
export const salesVelocity: Calc = (v) => {
  const opp = p(v, "o", 80), wr = p(v, "w", 22) / 100, deal = p(v, "d", 12000), cycle = need(p(v, "c", 45), "Enter sales cycle days.");
  const vel = (opp * wr * deal) / cycle;
  return { vel: `${$(vel, 0)} per day`, month: `${$(vel * 30, 0)} a month`, lever: `+10% on any lever adds ${$(vel * 0.1 * 30, 0)} a month` };
};
export const leadScore: Calc = (v) => {
  const fit = Math.min(10, p(v, "f", 7)), intent = Math.min(10, p(v, "i", 6)), eng = Math.min(10, p(v, "e", 5)), size = Math.min(10, p(v, "s", 8));
  const score = fit * 3 + intent * 3 + eng * 2 + size * 2;
  return { score: `${score} / 100`, grade: score >= 75 ? "Hot — route to sales now" : score >= 50 ? "Warm — nurture and qualify" : "Cold — keep in marketing nurture", note: "Weights: fit 30%, intent 30%, engagement 20%, company size 20%" };
};
export const burnRate: Calc = (v) => {
  const start = p(v, "s", 2e6), end = p(v, "e", 1.64e6), months = need(p(v, "m", 6), "Enter months."), rev = p(v, "r", 40000);
  const net = (start - end) / months;
  return { net: `${$(net, 0)} net burn per month`, gross: `${$(net + rev, 0)} gross burn (spending)`, runway: net > 0 ? `${(end / net).toFixed(1)} months of runway left` : "Not burning cash" };
};
export const runway: Calc = (v) => {
  const cash = p(v, "c", 1.5e6), burn = need(p(v, "b", 120000), "Enter monthly burn."), growth = p(v, "g", 0) / 100;
  let m = 0, c = cash, b = burn; while (c > 0 && m < 600) { c -= b; b *= 1 + growth; m++; }
  return { months: `${growth ? m : (cash / burn).toFixed(1)} months of runway`, date: `Raise by about month ${Math.max(0, (growth ? m : cash / burn) - 6).toFixed(0)} (6 months before cash runs out)`, note: growth ? `Burn growing ${pc(growth, 1)} a month` : "Flat burn" };
};

// ---- registry (generated)
export const ideaHr1CustomCalculators: Record<string, Calc> = {
  "time-to-hire-calculator": timeToHire,
  "employee-retention-rate-calculator": retention,
  "absenteeism-rate-calculator": absenteeism,
  "training-roi-calculator": trainingRoi,
  "headcount-planning-calculator": headcount,
  "span-of-control-calculator": spanControl,
  "compa-ratio-calculator": compaRatio,
  "merit-increase-budget-calculator": meritBudget,
  "bonus-pool-calculator": bonusPool,
  "commission-plan-payout-calculator": commission,
  "customer-lifetime-value-to-cac-ratio-calculator": ltvCac,
  "net-revenue-retention-calculator": nrr,
  "net-promoter-score-calculator": nps,
  "customer-satisfaction-csat-calculator": csat,
  "cost-per-lead-calculator": cpl,
  "cost-per-acquisition-cpa-calculator": cpa,
  "return-on-ad-spend-roas-calculator": roas,
  "cpm-cost-per-thousand-calculator": cpm,
  "cpc-cost-per-click-calculator": cpc,
  "email-open-rate-calculator": openRate,
  "email-marketing-roi-calculator": emailRoi,
  "seo-traffic-value-calculator": seoValue,
  "marketing-budget-calculator": mktBudget,
  "market-size-tam-sam-som-calculator": tam,
  "sales-quota-attainment-calculator": quota,
  "sales-pipeline-coverage-calculator": coverage,
  "win-rate-sales-calculator": winRate,
  "sales-velocity-calculator": salesVelocity,
  "lead-scoring-calculator": leadScore,
  "burn-rate-startup-calculator": burnRate,
  "startup-runway-calculator": runway,
};
