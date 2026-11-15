/**
 * Batch: Tech keyword check (15 Nov 2026) — 8 IT business & project tools for Business & Industrial >
 * HR, Marketing & Business Operations Calculators.
 *
 * Near-namesakes kept apart on purpose:
 *  - ai-automation-roi-calculator = AI agents/chatbots replacing manual task time.
 *    test-automation-roi-calculator = automated vs manual software testing over releases.
 *    The existing rpa-roi-calculator (software bots) and saas-tco-calculator are not rebuilt.
 *  - msp-pricing-calculator = what a managed-service provider charges and earns. The existing
 *    it-support-cost-calculator is the customer-side budget.
 *  - data-breach-cost-calculator = cost and annualised loss of a breach; downtime-cost (existing)
 *    is outage cost only.
 *  - pert-estimate-calculator (three-point time estimates), wsjf-calculator (backlog priority) and
 *    sprint-velocity-calculator (Scrum forecasting) are separate planning methods.
 *
 * Methods / defaults:
 *  - App build hours by complexity (simple 400, medium 900, complex 1,800) × platform factor
 *    (one native 1.0, both native 1.8, cross-platform 1.3, web 0.9), + 40 h per extra feature, +
 *    design, + QA 20% and project management 10%.
 *  - Breach cost default $165 per record (IBM Cost of a Data Breach range); ALE = cost × annual
 *    probability.
 *  - PERT: E = (O + 4M + P)/6, σ = (P − O)/6, project σ = √Σσ², normal approximation.
 *  - WSJF = (business value + time criticality + risk reduction/opportunity) ÷ job size (SAFe).
 */

import { type TrvCalculator as Calc, InputError, pos, pick, txt, r1, r2, nfmt, money, sig } from "./trv-core";
import { normCdf, normInv } from "./sci-math-core";

const usd = (x: number) => money(x, "$", 0);

// ------------------------------------------------------------------ app development cost
export const APP_PLATFORMS: [string, number][] = [["iOS or Android only (native)", 1], ["iOS + Android (two native apps)", 1.8], ["Cross-platform (Flutter / React Native)", 1.3], ["Web app (responsive)", 0.9]];
export const APP_COMPLEXITY: [string, number][] = [["Simple (few screens, no backend)", 400], ["Medium (accounts, API, payments)", 900], ["Complex (real-time, marketplace, AI)", 1800]];
export const APP_DESIGN: [string, number][] = [["Template / basic UI", 60], ["Custom UI/UX", 160], ["Premium (animations, branding)", 300]];
export const APP_RATES: [string, number][] = [["South Asia (~$25/h)", 25], ["Eastern Europe (~$45/h)", 45], ["Latin America (~$50/h)", 50], ["Western Europe (~$85/h)", 85], ["US / UK / Australia (~$120/h)", 120], ["Custom rate (below)", 0]];
export const appCost: Calc = (v) => {
  const ri = pick(v.region, APP_RATES.length);
  const rate = ri === APP_RATES.length - 1 ? pos(v.rate, 60) : APP_RATES[ri][1];
  if (rate <= 0) throw new InputError("Enter an hourly rate.");
  const base = APP_COMPLEXITY[pick(v.complexity, 3)][1] * APP_PLATFORMS[pick(v.platform, 4)][1];
  const feats = Math.round(pos(v.features, 0)) * 40, design = APP_DESIGN[pick(v.design, 3)][1];
  const dev = base + feats + design;
  const hours = dev * 1.3;
  const cost = hours * rate;
  const team = Math.max(1, Math.round(pos(v.team, 3)));
  return { cost: Math.round(cost), range: `${usd(cost * 0.8)} – ${usd(cost * 1.3)}`, hours: nfmt(Math.round(hours)), weeks: r1(hours / (team * 35)), maint: `${usd(cost * 0.15)} – ${usd(cost * 0.2)} per year`, split: `Build ${nfmt(Math.round(base + feats))} h, design ${design} h, QA ${nfmt(Math.round(dev * 0.2))} h, PM ${nfmt(Math.round(dev * 0.1))} h` };
};

// ------------------------------------------------------------------ MSP pricing
export const mspPricing: Calc = (v) => {
  const users = pos(v.users, 50), devices = pos(v.devices, 60), servers = pos(v.servers, 3);
  const pu = pos(v.perUser, 125), ps = pos(v.perServer, 200);
  const rev = users * pu + servers * ps;
  const tools = (devices + servers) * pos(v.tools, 12);
  const labour = users * pos(v.hoursPerUser, 0.6) * pos(v.labour, 45);
  const cost = tools + labour;
  const margin = rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  const target = Math.min(90, pos(v.target, 50)) / 100;
  const needRev = cost / (1 - target);
  return { revenue: r2(rev), annual: r2(rev * 12), cost: r2(cost), margin: r1(margin), profit: r2(rev - cost), perUser: money(users > 0 ? (needRev - servers * ps) / users : 0, "$", 2), check: margin >= target * 100 ? "Meets your target margin" : "Below your target margin — raise prices or cut cost" };
};

// ------------------------------------------------------------------ AI agent / automation ROI
export const aiRoi: Calc = (v) => {
  const tasks = pos(v.tasks, 2000), mins = pos(v.minutes, 6), rate = pos(v.rate, 30), auto = Math.min(100, pos(v.auto, 60)) / 100;
  const per = pos(v.perTask, 0.05), fee = pos(v.fee, 300), setup = pos(v.setup, 5000);
  const hours = (tasks * auto * mins) / 60;
  const saved = hours * rate;
  const run = tasks * auto * per + fee;
  const net = saved - run;
  const yr = net * 12 - setup;
  const yearCost = setup + run * 12;
  return { net: r2(net), yearly: r2(yr), roi: yearCost > 0 ? r1((yr / yearCost) * 100) : 0, payback: net > 0 ? `${r1(setup / net)} months` : "Never at these numbers", hours: r1(hours), fte: r2(hours / 160), run: r2(run) };
};

// ------------------------------------------------------------------ test automation ROI
export const testRoi: Calc = (v) => {
  const tests = pos(v.tests, 300), mins = pos(v.minutes, 10), runs = pos(v.runs, 3), rel = pos(v.releases, 24), rate = pos(v.rate, 50);
  const build = pos(v.buildHours, 2), maint = pos(v.maint, 20) / 100, infra = pos(v.infra, 5);
  const manualYear = ((tests * mins) / 60) * runs * rel * rate;
  const buildCost = tests * build * rate;
  const autoYear = buildCost * maint + runs * rel * infra;
  const y1 = manualYear - (buildCost + autoYear), y3 = 3 * manualYear - (buildCost + 3 * autoYear);
  const perRel = (((tests * mins) / 60) * runs * rate) - (autoYear / Math.max(1, rel));
  return { y1: r2(y1), y3: r2(y3), manual: r2(manualYear), build: r2(buildCost), autoYear: r2(autoYear), breakeven: perRel > 0 ? `${Math.ceil(buildCost / perRel)} releases (${r1(buildCost / perRel / Math.max(1, rel) * 12)} months)` : "Never — manual testing is cheaper here", roi3: buildCost + 3 * autoYear > 0 ? r1((y3 / (buildCost + 3 * autoYear)) * 100) : 0 };
};

// ------------------------------------------------------------------ data breach cost
export const breachCost: Calc = (v) => {
  const rec = pos(v.records, 10000), per = pos(v.perRecord, 165), hours = pos(v.downtime, 24), rph = pos(v.revenueHour, 2000), fines = pos(v.fines, 0), other = pos(v.other, 0), prob = Math.min(100, pos(v.prob, 10)) / 100;
  const data = rec * per, down = hours * rph;
  const total = data + down + fines + other;
  return { total: Math.round(total), ale: Math.round(total * prob), data: Math.round(data), down: Math.round(down), perRecord: money(rec > 0 ? total / rec : 0, "$", 2), budget: `Spending up to ${usd(total * prob)} a year on controls that prevent this is worth it` };
};

// ------------------------------------------------------------------ PERT
export const pert: Calc = (v) => {
  const tasks = txt(v, "tasks").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const n = s.split(/[,/\s]+/).map(Number);
    if (n.length !== 3 || n.some((x) => !Number.isFinite(x) || x < 0) || !(n[0] <= n[1] && n[1] <= n[2])) throw new InputError(`Task ${i + 1} ("${s}") must be optimistic, most likely, pessimistic with O ≤ M ≤ P, e.g. 2, 4, 8.`);
    return { e: (n[0] + 4 * n[1] + n[2]) / 6, s: (n[2] - n[0]) / 6 };
  });
  if (!tasks.length) throw new InputError("Enter at least one task as O, M, P.");
  const E = tasks.reduce((a, t) => a + t.e, 0), S = Math.sqrt(tasks.reduce((a, t) => a + t.s * t.s, 0));
  const dl = pos(v.deadline, 0);
  const at = (p: number) => r1(E + normInv(p) * S);
  return { e: r2(E), sd: r2(S), p50: r1(E), p80: at(0.8), p95: at(0.95), prob: dl > 0 ? `${r1((S > 0 ? normCdf((dl - E) / S) : dl >= E ? 1 : 0) * 100)}% chance of finishing within ${dl}` : "—", each: tasks.map((t, i) => `Task ${i + 1}: ${sig(t.e, 4)} ± ${sig(t.s, 3)}`).join("\n") };
};

// ------------------------------------------------------------------ WSJF
export const wsjf: Calc = (v) => {
  const items = txt(v, "items").split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const [name, rest] = s.includes(":") ? s.split(":") : [`Item ${i + 1}`, s];
    const n = rest.split(/[,/\s]+/).filter(Boolean).map(Number);
    if (n.length !== 4 || n.some((x) => !Number.isFinite(x) || x < 0) || n[3] <= 0) throw new InputError(`"${s}" must be name: value, time criticality, risk/opportunity, job size (size above 0).`);
    return { name: name.trim(), cod: n[0] + n[1] + n[2], size: n[3], score: (n[0] + n[1] + n[2]) / n[3] };
  });
  if (!items.length) throw new InputError("Enter at least one item.");
  const ranked = [...items].sort((a, b) => b.score - a.score);
  return { top: `${ranked[0].name} (WSJF ${r2(ranked[0].score)})`, ranking: ranked.map((x, i) => `${i + 1}. ${x.name}: WSJF ${r2(x.score)} (cost of delay ${x.cod} ÷ size ${x.size})`).join("\n"), count: items.length, avg: r2(items.reduce((a, x) => a + x.score, 0) / items.length) };
};

// ------------------------------------------------------------------ sprint velocity
export const sprintVelocity: Calc = (v) => {
  const past = txt(v, "past").split(/[,;\s]+/).filter(Boolean).map(Number);
  if (!past.length || past.some((x) => !Number.isFinite(x) || x < 0)) throw new InputError("Enter completed story points for recent sprints, e.g. 21, 25, 18, 24.");
  const avg = past.reduce((a, x) => a + x, 0) / past.length;
  const sd = past.length > 1 ? Math.sqrt(past.reduce((a, x) => a + (x - avg) ** 2, 0) / (past.length - 1)) : 0;
  const backlog = pos(v.backlog, 200), weeks = pos(v.length, 2), cap = Math.min(150, pos(v.capacity, 100)) / 100;
  if (avg <= 0) throw new InputError("Average velocity is 0 — enter sprints with completed points.");
  const sprints = (x: number) => (x > 0 ? Math.ceil(backlog / x) : Infinity);
  const lo = Math.max(avg - sd, avg * 0.25), hi = avg + sd;
  return { avg: r1(avg), sd: r1(sd), sprints: sprints(avg), weeks: r1(sprints(avg) * weeks), range: `${sprints(hi)} – ${Number.isFinite(sprints(lo)) ? sprints(lo) : "∞"} sprints (${r1(sprints(hi) * weeks)} – ${r1(sprints(lo) * weeks)} weeks)`, next: Math.round(avg * cap), recent: past.length >= 3 ? r1(past.slice(-3).reduce((a, x) => a + x, 0) / 3) : r1(avg) };
};

export const techBizCustomCalculators: Record<string, Calc> = {
  "app-development-cost-calculator": appCost,
  "msp-pricing-calculator": mspPricing,
  "ai-automation-roi-calculator": aiRoi,
  "test-automation-roi-calculator": testRoi,
  "data-breach-cost-calculator": breachCost,
  "pert-estimate-calculator": pert,
  "wsjf-calculator": wsjf,
  "sprint-velocity-calculator": sprintVelocity,
};
