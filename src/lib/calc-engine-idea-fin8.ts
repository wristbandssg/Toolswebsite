/**
 * Idea build, batch fin8 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Finance > Retirement (US) = 26 tools.
 * 2026 IRS limits (IR-2025 release / Notice 2025-67): 401(k)/403(b)/457(b)/TSP deferral $24,500; catch-up 50+ $8,000;
 * ages 60–63 $11,250; 415(c) $72,000; 415(b) DB benefit $290,000; IRA $7,500 + $1,100 catch-up; QCD $111,000;
 * Roth IRA phase-out $153,000–$168,000 single, $242,000–$252,000 joint. Catch-ups must be Roth if prior-year FICA wages > $150,000.
 * Social Security: benefits taxable above provisional income $25,000/$34,000 single, $32,000/$44,000 joint (not indexed).
 * Survivor benefit 71.5% at 60 rising to 100% at full retirement age; widow(er) limit = larger of deceased's benefit or 82.5% of PIA.
 * Medicare Part B 2026 standard premium $202.90. Savings benchmarks: Fidelity guideline (1× salary by 30 … 10× by 67).
 * CSRS: 1.5% × high-3 for the first 5 years, 1.75% for the next 5, 2% after, capped at 80%; −2% a year under 55.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;

const fv = (b: number, add: number, r: number, y: number) => { let x = b; for (let k = 0; k < y; k++) x = x * (1 + r) + add; return x; };
const pmt = (pv: number, r: number, n: number, due = false) => { if (n <= 0) return pv; const a = r === 0 ? pv / n : (pv * r) / (1 - Math.pow(1 + r, -n)); return due ? a / (1 + r) : a; };
const LIM = { def: 24500, cu: 8000, cu6063: 11250, c415: 72000, ira: 7500, iraCu: 1100, qcd: 111000, b415: 290000 };
const catchUp = (age: number) => (age >= 60 && age <= 63 ? LIM.cu6063 : age >= 50 ? LIM.cu : 0);
const iraMax = (age: number) => LIM.ira + (age >= 50 ? LIM.iraCu : 0);
const rothPhase = (magi: number, joint: boolean) => { const lo = joint ? 242000 : 153000, hi = joint ? 252000 : 168000; return magi <= lo ? 1 : magi >= hi ? 0 : (hi - magi) / (hi - lo); };

// ---- Benchmarks & contribution limits ----
const FID: [number, number][] = [[30, 1], [35, 2], [40, 3], [45, 4], [50, 6], [55, 7], [60, 8], [67, 10]];
export const benchmark: Calc = (v) => {
  const age = need(p(v, "a", 40), "Enter your age."), sal = need(p(v, "s", 85000), "Enter your salary."), sv = p(v, "sv", 150000);
  let mult = 0;
  if (age <= 30) mult = Math.max(0, (age - 22) / 8);
  else if (age >= 67) mult = 10;
  else { for (let i = 0; i < FID.length - 1; i++) { const [a0, m0] = FID[i], [a1, m1] = FID[i + 1]; if (age >= a0 && age <= a1) mult = m0 + ((m1 - m0) * (age - a0)) / (a1 - a0); } }
  const tgt = mult * sal, have = sv / sal;
  return { tgt: `${$0(tgt)} target at ${nfmt(age)} (${mult.toFixed(1)}× salary)`, you: `You have ${have.toFixed(1)}× salary — ${sv >= tgt ? `ahead by ${$0(sv - tgt)}` : `behind by ${$0(tgt - sv)}`}`, next: `Milestones: 1× by 30 · 3× by 40 · 6× by 50 · 8× by 60 · 10× by 67 (${$0(sal * 10)} for you)` };
};
export const catchUpCalc: Calc = (v) => {
  const age = need(p(v, "a", 52), "Enter your age at year-end."), pl = pick(v.pl, 2), w = p(v, "w", 160000), want = p(v, "c", 40000);
  if (pl === 1) {
    const mx = iraMax(age);
    return { max: `${$0(mx)} IRA limit for 2026${age >= 50 ? ` ($7,500 + $1,100 catch-up)` : ""}`, cu: age >= 50 ? "Catch-up applies from the year you turn 50" : `Catch-up starts in the year you turn 50 (${nfmt(50 - age)} years)`, gap: want > mx ? `${$0(want - mx)} over the limit — the excess is taxed 6% a year until removed` : `${$0(mx - want)} of room left` };
  }
  const cu = catchUp(age), mx = LIM.def + cu;
  return { max: `${$0(mx)} employee limit for 2026 (${$0(LIM.def)}${cu ? ` + ${$0(cu)} ${age >= 60 && age <= 63 ? "age 60–63 super catch-up" : "catch-up"}` : ""})`, cu: cu ? (w > 150000 ? "Your catch-up must go in as Roth (2025 FICA wages over $150,000)" : "Catch-up can be pre-tax or Roth") : age < 50 ? `Catch-up starts in the year you turn 50` : "Age 64+: standard $8,000 catch-up", gap: want > mx ? `${$0(want - mx)} over the limit` : `${$0(mx - want)} of room left · total with employer money capped at ${$0(LIM.c415 + cu)}` };
};

// ---- Social Security ----
export const ssSurvivor: Calc = (v) => {
  const pia = need(p(v, "pia", 2400), "Enter the deceased's full-retirement benefit (PIA)."), act = p(v, "act", 0), age = p(v, "a", 62), fra = Math.max(60, p(v, "fra", 67)), own = p(v, "own", 1100), kids = Math.round(p(v, "k", 0));
  let base = pia; if (act > 0) base = act < pia ? Math.max(act, 0.825 * pia) : act;
  const f = age >= fra ? 1 : age < 60 ? 0.715 : 0.715 + (0.285 * (age - 60)) / (fra - 60), sb = base * f;
  return { sb: `${$0(sb)} a month survivor benefit at ${nfmt(age)} (${pc(f)} of ${$0(base)})`, best: own > sb ? `Your own ${$0(own)} is higher — you'd get your own benefit (you can switch later if the survivor benefit grows)` : `Survivor benefit is higher than your own ${$0(own)} — at full retirement age it would be ${$0(base)}`, kids: kids > 0 ? `Each child under 18 gets ≈ ${$0(pia * 0.75)} (75% of PIA), subject to the family maximum` : "Children under 18 each get 75% of PIA (family maximum applies)" };
};
export const ssTaxable: Calc = (v) => {
  const ss = p(v, "ss", 30000), oi = p(v, "oi", 35000), te = p(v, "te", 0), j = pick(v.fs, 2) === 1, tr = p(v, "tr", 12) / 100;
  const b1 = j ? 32000 : 25000, b2 = j ? 44000 : 34000, pi = oi + te + ss / 2;
  const tx = pi <= b1 ? 0 : pi <= b2 ? Math.min(0.5 * (pi - b1), 0.5 * ss) : Math.min(0.85 * ss, 0.85 * (pi - b2) + Math.min(0.5 * (b2 - b1), 0.5 * ss));
  return { tx: `${$0(tx)} of ${$0(ss)} benefits taxable (${pc(ss ? tx / ss : 0, 0)})`, pi: `Provisional income ${$0(pi)} vs thresholds ${$0(b1)} / ${$0(b2)}`, tax: `≈ ${$0(tx * tr)} federal tax at ${pc(tr, 0)} · age 65+ may also claim the $6,000 senior deduction (2025–2028)` };
};

// ---- Pensions ----
export const pensionSurvivor: Calc = (v) => {
  const sl = p(v, "sl", 3000), j100 = p(v, "j1", 2600), j50 = p(v, "j5", 2800), y = p(v, "y", 20), ys = p(v, "ys", 8);
  const opts: [string, number][] = [["Single life", sl * 12 * y], ["100% joint & survivor", j100 * 12 * (y + ys)], ["50% joint & survivor", j50 * 12 * y + j50 * 0.5 * 12 * ys]];
  const best = [...opts].sort((a, b) => b[1] - a[1])[0];
  return { tot: opts.map(([n, t]) => `${n} ${$0(t)}`).join(" · "), best: `${best[0]} pays the most if you live ${nfmt(y)} years and your spouse ${nfmt(ys)} more`, cost: `Survivor protection costs ${$0((sl - j100) * 12)} a year (100%) or ${$0((sl - j50) * 12)} (50%) while you're alive — compare with a life-insurance quote ("pension max")` };
};
export const csrs: Calc = (v) => {
  const h3 = need(p(v, "h", 95000), "Enter your high-3 average salary."), yrs = p(v, "y", 32), age = p(v, "a", 56), sv = pick(v.sv, 2) === 1;
  const pct = Math.min(0.8, Math.min(yrs, 5) * 0.015 + Math.min(Math.max(yrs - 5, 0), 5) * 0.0175 + Math.max(yrs - 10, 0) * 0.02);
  const red = age < 55 ? (55 - age) * 0.02 : 0, ann = h3 * pct * (1 - red), net = sv ? ann - (0.025 * Math.min(ann, 3600) + 0.1 * Math.max(ann - 3600, 0)) : ann;
  return { ann: `${$0(ann)} a year (${$0(ann / 12)} a month)`, pct: `${pc(pct, 2)} of high-3${pct >= 0.8 ? " (80% cap)" : ""}${red ? ` · −${pc(red, 0)} age reduction` : ""}`, sv: sv ? `≈ ${$0(net)} a year after the full survivor reduction (2.5% of first $3,600 + 10% above)` : "Choose survivor benefit to see the reduced amount" };
};
const pensionCalc = (multDef: number, capDef: number): Calc => (v) => {
  const fas = need(p(v, "s", 70000), "Enter final average salary."), yrs = p(v, "y", 25), m = p(v, "m", multDef) / 100, cap = p(v, "cap", capDef) / 100, age = p(v, "a", 60), nra = p(v, "nra", 60), er = p(v, "er", 5) / 100, cola = p(v, "cola", 2) / 100, life = p(v, "l", 25);
  const base = Math.min(cap > 0 ? cap : Infinity, yrs * m) * fas, red = Math.max(0, nra - age) * er, ann = base * (1 - Math.min(red, 1));
  let tot = 0, a = ann; for (let k = 0; k < life; k++) { tot += a; a *= 1 + cola; }
  return { ann: `${$0(ann)} a year (${$0(ann / 12)} a month)`, rep: `${pc(ann / fas)} of final average salary${red ? ` after −${pc(red, 0)} early reduction` : ""}${cap > 0 && yrs * m >= cap ? " (capped)" : ""}`, life: `≈ ${$0(tot)} over ${nfmt(life)} years with ${pc(cola)} COLA` };
};
export const teacherPension = pensionCalc(2, 0);
export const policePension = pensionCalc(2.5, 80);

// ---- Withdrawal strategies ----
export const bucket: Calc = (v) => {
  const P = need(p(v, "p", 1200000), "Enter the portfolio."), sp = need(p(v, "sp", 60000), "Enter yearly spending from savings."), y1 = p(v, "y1", 2), y2 = p(v, "y2", 5), r1 = num(v.r1, 3.5) / 100, r2 = num(v.r2, 4.5) / 100, r3 = num(v.r3, 7) / 100;
  const b1 = Math.min(P, sp * y1), b2 = Math.min(P - b1, sp * y2), b3 = P - b1 - b2, er = (b1 * r1 + b2 * r2 + b3 * r3) / P;
  return { b: `Cash ${$0(b1)} (${pc(b1 / P, 0)}) · bonds ${$0(b2)} (${pc(b2 / P, 0)}) · stocks ${$0(b3)} (${pc(b3 / P, 0)})`, cover: `Cash and bonds cover ${nfmt(y1 + y2, 1)} years of spending without selling stocks`, er: `Expected return ${pc(er, 2)} · withdrawal rate ${pc(sp / P, 2)}${b3 <= 0 ? " — no growth bucket left; spending is too high" : ""}` };
};
export const guardrails: Calc = (v) => {
  const P = need(p(v, "p", 1000000), "Enter the portfolio value now."), w0 = need(p(v, "w", 52000), "Enter last year's withdrawal."), iwr = need(p(v, "iwr", 5), "Enter the initial withdrawal rate.") / 100, g = p(v, "g", 20) / 100, adj = p(v, "adj", 10) / 100, inf = p(v, "inf", 3) / 100, lr = num(v.lr, 6) / 100;
  const w1 = lr < 0 ? w0 : w0 * (1 + inf), cur = w1 / P;
  let w = w1, act = lr < 0 ? "No inflation raise after a losing year" : `Inflation raise ${pc(inf)}`;
  if (cur > iwr * (1 + g)) { w = w1 * (1 - adj); act += ` · capital-preservation rule: cut ${pc(adj, 0)}`; } else if (cur < iwr * (1 - g)) { w = w1 * (1 + adj); act += ` · prosperity rule: raise ${pc(adj, 0)}`; }
  return { w: `${$0(w)} withdrawal this year (${$0(w / 12)} a month)`, rate: `Rate ${pc(w / P, 2)} · guardrails ${pc(iwr * (1 - g), 2)} – ${pc(iwr * (1 + g), 2)}`, act };
};
export const vpw: Calc = (v) => {
  const P = need(p(v, "p", 800000), "Enter the portfolio."), age = p(v, "a", 65), end = Math.max(age + 1, p(v, "e", 100)), st = p(v, "st", 50) / 100, rs = num(v.rs, 5) / 100, rb = num(v.rb, 1.8) / 100;
  const r = st * rs + (1 - st) * rb, n = end - age, w = pmt(P, r, n, true);
  return { pct: `${pc(w / P, 2)} withdrawal rate at ${nfmt(age)}`, w: `${$0(w)} this year (${$0(w / 12)} a month)`, note: `Spreads the portfolio over ${nfmt(n)} years at a ${pc(r, 2)} real return — recalculate each year with the new balance; spending rises with age and moves with markets` };
};
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const monteCarlo: Calc = (v) => {
  const P = need(p(v, "p", 1000000), "Enter the portfolio."), w = p(v, "w", 40000), y = Math.min(60, Math.max(1, Math.round(p(v, "y", 30)))), mu = num(v.mu, 5) / 100, s = p(v, "s", 12) / 100;
  const R = rng(20261117), N = 5000, ends: number[] = []; let ok = 0;
  for (let i = 0; i < N; i++) {
    let b = P, alive = true;
    for (let k = 0; k < y; k++) { b -= w; if (b <= 0) { alive = false; b = 0; break; } const z = Math.sqrt(-2 * Math.log(R() || 1e-12)) * Math.cos(2 * Math.PI * R()); b *= 1 + mu + s * z; if (b <= 0) { alive = false; b = 0; break; } }
    if (alive) ok++; ends.push(b);
  }
  ends.sort((a, b) => a - b);
  const q = (f: number) => ends[Math.floor(f * (N - 1))];
  return { ok: `${pc(ok / N, 0)} chance of lasting ${nfmt(y)} years`, end: `Median ending balance ${$0(q(0.5))} (today's dollars) · 10th percentile ${$0(q(0.1))} · 90th ${$0(q(0.9))}`, rate: `${pc(w / P, 2)} initial withdrawal, inflation-adjusted · ${nfmt(N)} simulated return paths (${pc(mu)} ± ${pc(s)} real a year)` };
};

// ---- Roth strategies & access rules ----
export const backdoorRoth: Calc = (v) => {
  const c = p(v, "c", 7500), cv = p(v, "cv", c), pre = p(v, "pre", 0), bas = p(v, "bas", 0), tr = p(v, "tr", 32) / 100, magi = p(v, "m", 260000), j = pick(v.fs, 2) === 1, age = p(v, "a", 40);
  const tot = pre + bas + c, conv = cv, tax = tot > 0 ? (conv * pre) / tot : 0, ph = rothPhase(magi, j), mx = iraMax(age);
  return { tax: `${$0(tax)} of the ${$0(conv)} conversion taxable (pro-rata) → ≈ ${$0(tax * tr)} tax`, rule: pre > 0 ? `${pc(pre / tot, 0)} of your IRA money is pre-tax, so most of the conversion is taxed — consider rolling pre-tax IRAs into a 401(k) first` : "Clean backdoor — no pre-tax IRA balances, so the conversion is almost tax-free", elig: ph === 1 ? `You could contribute directly to a Roth (MAGI ${$0(magi)} is under the limit) — no backdoor needed` : ph === 0 ? `MAGI ${$0(magi)} is over the Roth limit — backdoor needed (max ${$0(mx)})` : `Partial direct Roth allowed: ${$0(Math.ceil((mx * ph) / 10) * 10)}` };
};
export const megaBackdoor: Calc = (v) => {
  const def = Math.min(p(v, "d", 24500), LIM.def), er = p(v, "er", 9000), y = p(v, "y", 10), r = num(v.r, 7) / 100, plan = p(v, "pl", 0);
  const room = Math.max(0, LIM.c415 - def - er), use = plan > 0 ? Math.min(plan, room) : room, g = fv(0, use, r, y);
  return { room: `${$0(room)} of after-tax room for 2026 ($72,000 − ${$0(def)} deferrals − ${$0(er)} employer)`, grow: `${$0(use)} a year converted to Roth for ${nfmt(y)} years → ${$0(g)} tax-free`, note: "Your plan must allow after-tax contributions and in-plan Roth conversions or in-service withdrawals; age-50+ catch-ups are on top of the $72,000" };
};
export const ruleOf55: Calc = (v) => {
  const age = p(v, "a", 56), sep = p(v, "sa", 55), ps = pick(v.ps, 2) === 1, w = p(v, "w", 40000), tr = p(v, "tr", 22) / 100;
  const minA = ps ? 50 : 55, ok = sep >= minA && age < 59.5;
  return { ok: age >= 59.5 ? "Over 59½ — no early-withdrawal penalty from any account" : ok ? `Eligible — you left your employer in or after the year you turned ${minA}` : `Not eligible — you must leave the job in or after the year you turn ${minA}`, pen: ok ? `Saves the ${$0(w * 0.1)} 10% penalty on a ${$0(w)} withdrawal` : age < 59.5 ? `A ${$0(w)} withdrawal would cost a ${$0(w * 0.1)} penalty` : "—", net: `≈ ${$0(w * (1 - tr - (ok || age >= 59.5 ? 0 : 0.1)))} after ${pc(tr, 0)} income tax · applies only to that employer's 401(k)/403(b), not IRAs` };
};
export const sepp72t: Calc = (v) => {
  const B = need(p(v, "b", 500000), "Enter the account balance."), le = need(p(v, "le", 31.6), "Enter the life expectancy factor."), r = p(v, "r", 5) / 100, age = p(v, "a", 55);
  const am = pmt(B, r, le), rmd = B / le;
  return { am: `${$0(am)} a year amortization method (${$0(am / 12)} a month)`, rmd: `${$0(rmd)} a year RMD method (recalculated yearly) — lowest payment`, lock: `Payments must continue for ${nfmt(Math.max(5, 59.5 - age), 1)} years (until the later of 5 years or age 59½) — breaking the schedule triggers the 10% penalty retroactively` };
};

// ---- Plan growth ----
const planGrow = (v: Record<string, number>) => {
  const b = p(v, "b", 50000), c = p(v, "c", 15000), er = p(v, "er", 3000), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 7) / 100, age = p(v, "a", 40);
  const end = fv(b, c + er, r, y), put = b + (c + er) * y, mx = LIM.def + catchUp(age);
  return { end, put, mx, c, y };
};
export const plan457: Calc = (v) => {
  const g = planGrow(v), sp = pick(v.sp, 2) === 1, mx = sp ? LIM.def * 2 : g.mx;
  return { end: `${$0(g.end)} after ${g.y} years`, parts: `Contributions ${$0(g.put)} · growth ${$0(g.end - g.put)}`, lim: `${g.c > mx ? `${$0(g.c)} is over` : `${$0(g.c)} is within`} your ${$0(mx)} 2026 limit${sp ? " (special 3-year catch-up)" : ""} · governmental 457(b) withdrawals after leaving the job have no 10% penalty at any age` };
};
export const plan403b: Calc = (v) => {
  const g = planGrow(v), y15 = pick(v.y15, 2) === 1, mx = g.mx + (y15 ? 3000 : 0);
  return { end: `${$0(g.end)} after ${g.y} years`, parts: `Contributions ${$0(g.put)} · growth ${$0(g.end - g.put)}`, lim: `${g.c > mx ? `${$0(g.c)} is over` : `${$0(g.c)} is within`} your ${$0(mx)} 2026 limit${y15 ? " (incl. $3,000 15-year rule, $15,000 lifetime)" : ""}` };
};
export const tsp: Calc = (v) => {
  const s = need(p(v, "s", 80000), "Enter your salary."), c = p(v, "c", 5) / 100, b = p(v, "b", 40000), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 6.5) / 100, raise = p(v, "ra", 2) / 100, fers = pick(v.f, 2) === 0;
  const match = fers ? 0.01 + Math.min(c, 0.03) + Math.max(0, Math.min(c - 0.03, 0.02)) * 0.5 : 0;
  let bal = b, sal = s, put = 0, em = 0;
  for (let k = 0; k < y; k++) { const you = Math.min(sal * c, LIM.def), e = sal * match; bal = bal * (1 + r) + you + e; put += you; em += e; sal *= 1 + raise; }
  return { end: `${$0(bal)} after ${y} years`, m: fers ? `Agency adds ${pc(match, 1)} of pay (1% automatic + match) — ${$0(em)} total${c < 0.05 ? " · contribute 5% to get the full match" : ""}` : "Uniformed services: BRS members get up to 5% too — choose FERS/BRS", parts: `You put in ${$0(put)} · growth ${$0(bal - b - put - em)}` };
};
export const cashBalance: Calc = (v) => {
  const age = p(v, "a", 50), ra = Math.max(age + 1, p(v, "ra", 62)), b = p(v, "b", 0), r = p(v, "r", 5) / 100, af = p(v, "af", 13), tr = p(v, "tr", 37) / 100;
  const tgt = LIM.b415 * af, n = ra - age, need0 = Math.max(0, tgt - b * Math.pow(1 + r, n)), c = r === 0 ? need0 / n : (need0 * r) / (Math.pow(1 + r, n) - 1);
  return { c: `≈ ${$0(c)} a year maximum contribution`, tgt: `Funds the 2026 maximum lump sum ≈ ${$0(tgt)} ($290,000 benefit × ${af} annuity factor) by ${nfmt(ra)}`, tax: `≈ ${$0(c * tr)} a year tax deduction at ${pc(tr, 0)} · actuary sets exact limits; lower with fewer than 10 years of participation` };
};
export const spousalIra: Calc = (v) => {
  const comp = p(v, "c", 90000), a1 = p(v, "a1", 52), a2 = p(v, "a2", 48), own = p(v, "o", 7500), magi = p(v, "m", 200000);
  const m1 = iraMax(a1), m2 = iraMax(a2), cap = Math.min(comp, m1 + m2), sp = Math.min(m2, Math.max(0, comp - Math.min(own, m1))), ph = rothPhase(magi, true);
  return { sp: `${$0(sp)} spousal IRA allowed for the non-working spouse`, tot: `Household total ${$0(cap)} (${$0(m1)} + ${$0(m2)}, limited to earned income ${$0(comp)})`, roth: ph === 1 ? "Both can use Roth IRAs (MAGI under $242,000)" : ph === 0 ? "MAGI over $252,000 — use traditional or the backdoor Roth" : `Roth allowed at ${pc(ph, 0)} of the limit (phase-out $242,000–$252,000)` };
};
export const qcd: Calc = (v) => {
  const age = p(v, "a", 74), g = p(v, "g", 10000), rmd = p(v, "rmd", 25000), tr = p(v, "tr", 22) / 100, item = pick(v.it, 2) === 1;
  if (age < 70.5) return { save: "Not eligible — QCDs start at age 70½", rmd: "—", lim: "2026 limit $111,000 per person" };
  const q = Math.min(g, LIM.qcd);
  return { save: item ? `About the same federal tax as an itemized cash gift — the gain is a lower AGI (≈ ${$0(q)} less)` : `≈ ${$0(q * tr)} tax saved vs a cash gift (standard-deduction filers get no gift deduction)`, rmd: `${$0(Math.min(q, rmd))} of your ${$0(rmd)} RMD satisfied · ${$0(Math.max(0, rmd - q))} still to take`, lim: `${$0(q)} excluded from income (2026 limit $111,000 per person) — also lowers AGI for IRMAA and Social Security tax` };
};

// ---- Costs & life changes ----
export const healthcareCost: Calc = (v) => {
  const n = pick(v.n, 2) + 1, b = p(v, "b", 202.9), d = p(v, "d", 40), mg = p(v, "mg", 160), oop = p(v, "oop", 1800), y = Math.max(1, Math.round(p(v, "y", 25))), inf = p(v, "inf", 5) / 100, ret = num(v.r, 4) / 100;
  const yr0 = ((b + d + mg) * 12 + oop) * n; let tot = 0, pv = 0;
  for (let k = 0; k < y; k++) { const c = yr0 * Math.pow(1 + inf, k); tot += c; pv += c / Math.pow(1 + ret, k); }
  return { yr: `${$0(yr0)} in year one for ${n === 2 ? "a couple" : "one person"}`, tot: `${$0(tot)} total over ${y} years at ${pc(inf, 0)} healthcare inflation`, pv: `${$0(pv)} needed at retirement (invested at ${pc(ret, 0)}) · excludes long-term care` };
};
export const retireAbroad: Calc = (v) => {
  const sp = need(p(v, "sp", 60000), "Enter current yearly spending."), col = p(v, "col", 55) / 100, hi = p(v, "hi", 4000), tr = p(v, "tr", 3000), fx = p(v, "fx", 10) / 100, ss = p(v, "ss", 24000), wr = need(p(v, "wr", 4), "Enter a withdrawal rate.") / 100;
  const abroad = (sp * col + hi + tr) * (1 + fx), gap = Math.max(0, abroad - ss);
  return { cost: `${$0(abroad)} a year abroad (vs ${$0(sp)} at home) — ${$0(sp - abroad)} saved`, egg: `Nest egg needed ${$0(gap / wr)} (vs ${$0(Math.max(0, sp - ss) / wr)} at home) at ${pc(wr, 1)}`, note: `Includes health insurance, trips home and a ${pc(fx, 0)} currency buffer · Medicare doesn't cover care abroad` };
};
export const downsize: Calc = (v) => {
  const sp = need(p(v, "sp", 650000), "Enter the sale price."), ag = p(v, "ag", 5) / 100, cl = p(v, "cl", 1.5) / 100, mo = p(v, "mo", 120000), nh = p(v, "nh", 380000), mv = p(v, "mv", 12000), bs = p(v, "bs", 250000), j = pick(v.fs, 2) === 1, cg = p(v, "cg", 15) / 100, wr = p(v, "wr", 4) / 100;
  const net = sp * (1 - ag - cl), gain = Math.max(0, net - bs), tx = Math.max(0, gain - (j ? 500000 : 250000)) * cg, cash = net - mo - tx - nh - mv;
  return { cash: `${$0(cash)} freed up after buying the new home`, tax: `Gain ${$0(gain)} · ${tx > 0 ? `${$0(tx)} tax on the gain above the ${j ? "$500,000" : "$250,000"} exclusion` : `covered by the ${j ? "$500,000" : "$250,000"} home-sale exclusion`}`, inc: cash > 0 ? `≈ ${$0(cash * wr)} a year of income at ${pc(wr, 0)} — plus lower taxes, insurance and upkeep` : "No cash freed — the new home costs more than the net proceeds" };
};
export const consolidate: Calc = (v) => {
  const B = need(p(v, "b", 300000), "Enter the total balance."), n = Math.max(1, Math.round(p(v, "n", 4))), f0 = p(v, "f0", 0.6) / 100, f1 = p(v, "f1", 0.1) / 100, af = p(v, "af", 50), y = Math.max(1, Math.round(p(v, "y", 20))), r = num(v.r, 6) / 100;
  let a = B, b = B; for (let k = 0; k < y; k++) { a = a * (1 + r - f0) - af * n; b = b * (1 + r - f1) - af; }
  return { save: `${$0(b - a)} more after ${y} years by consolidating`, vals: `${$0(a)} spread across ${n} accounts vs ${$0(b)} in one`, note: "Fewer accounts also simplify RMDs and beneficiaries — use direct trustee-to-trustee rollovers to avoid withholding" };
};

// ---- registry (generated)
export const ideaFin8CustomCalculators: Record<string, Calc> = {
  "retirement-savings-by-age-benchmark-calculator": benchmark,
  "retirement-contribution-catch-up-calculator": catchUpCalc,
  "social-security-survivor-benefit-calculator": ssSurvivor,
  "social-security-taxable-benefits-calculator": ssTaxable,
  "pension-survivor-option-calculator": pensionSurvivor,
  "bucket-strategy-retirement-calculator": bucket,
  "guardrails-withdrawal-strategy-calculator": guardrails,
  "variable-percentage-withdrawal-calculator": vpw,
  "monte-carlo-retirement-success-calculator": monteCarlo,
  "backdoor-roth-calculator": backdoorRoth,
  "mega-backdoor-roth-calculator": megaBackdoor,
  "rule-of-55-withdrawal-calculator": ruleOf55,
  "72t-sepp-payment-calculator": sepp72t,
  "457-plan-growth-calculator": plan457,
  "403b-growth-calculator": plan403b,
  "tsp-growth-calculator": tsp,
  "cash-balance-plan-contribution-calculator": cashBalance,
  "spousal-ira-calculator": spousalIra,
  "qualified-charitable-distribution-calculator": qcd,
  "retirement-healthcare-cost-calculator": healthcareCost,
  "retire-abroad-cost-of-living-calculator": retireAbroad,
  "retirement-home-downsizing-proceeds-calculator": downsize,
  "retirement-account-consolidation-calculator": consolidate,
  "csrs-pension-calculator": csrs,
  "teacher-pension-calculator": teacherPension,
  "police-pension-calculator": policePension,
};
