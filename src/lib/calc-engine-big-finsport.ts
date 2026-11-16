/**
 * Batch: big generic keyword check (16 Nov 2026) — ten tools: intrinsic value and book value
 * (Finance > Investment > Stock & Options), CAPM, MIRR and profitability index (Investment
 * Returns & Planning), race time predictor (Sports > Running), arrow speed and bowling average
 * (Other Sports), poker odds and roulette (Sports Betting & Racing).
 *
 * Near-namesakes kept apart on purpose:
 *  - intrinsic-value = DCF / Graham fair value per share; book-value = balance-sheet equity per
 *    share and P/B. comic-book-value (existing) is collectibles.
 *  - mirr = modified IRR with finance and reinvestment rates; profitability-index = PV ÷ cost.
 *    npv / roi (existing) give the plain NPV and ROI.
 *  - race-time-predictor = Riegel T2 = T1 × (D2/D1)^1.06 to every standard distance. pace
 *    (existing) converts one time to a pace.
 *  - arrow-speed = real fps from the IBO rating; arrow-momentum (existing) starts from a known speed.
 *  - bowling-average = league average from game scores; bowling-handicap (existing) needs an average.
 *  - poker-odds = Hold'em equity by seeded Monte Carlo + pot/implied odds. betting-odds (existing)
 *    converts sportsbook odds.
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, nfmt, sig } from "./trv-core";

const show = (x: number, s = 6) => (Number.isFinite(x) ? nfmt(sig(x, s), 8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
const usd = (x: number) => `${x < 0 ? "−" : ""}$${Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pc = (x: number, s = 4) => `${show(x * 100, s)}%`;
const list = (raw: string, min: number) => { const a = raw.split(/[\s,;]+/).filter(Boolean).map((p) => { const n = Number(p.replace(/[$,]/g, "")); if (!Number.isFinite(n)) throw new InputError(`"${p}" isn't a number.`); return n; }); if (a.length < min) throw new InputError(`Enter at least ${min} values.`); return a; };

// ------------------------------------------------------------------ intrinsic value
export const IV_METHODS = ["Discounted cash flow (2-stage DCF)", "Graham number √(22.5 × EPS × BVPS)", "Graham formula EPS × (8.5 + 2g) × 4.4 ÷ Y"];
export const intrinsicValue: Calc = (v) => {
  const m = pick(v.method, 3), price = num(v.price, 150);
  let iv: number, working: string;
  if (m === 0) {
    const fcf = num(v.fcf, 1e9), sh = num(v.shares, 1e8), g1 = num(v.g1, 10) / 100, g2 = num(v.g2, 5) / 100, tg = num(v.tg, 2.5) / 100, r = num(v.rate, 9) / 100, debt = num(v.netDebt, 0);
    if (!(sh > 0) || !(r > tg)) throw new InputError("Enter shares outstanding, and a discount rate above the terminal growth rate.");
    let cf = fcf, pv = 0;
    for (let y = 1; y <= 10; y++) { cf *= 1 + (y <= 5 ? g1 : g2); pv += cf / (1 + r) ** y; }
    const tv = (cf * (1 + tg)) / (r - tg), pvTv = tv / (1 + r) ** 10, eq = pv + pvTv - debt;
    iv = eq / sh;
    working = `PV of 10 years' cash flow ${usd(pv)} + PV of terminal value ${usd(pvTv)} − net debt ${usd(debt)} = ${usd(eq)} ÷ ${nfmt(sh)} shares`;
  } else if (m === 1) {
    const eps = num(v.eps, 6), bv = num(v.bvps, 25);
    if (!(eps > 0) || !(bv > 0)) throw new InputError("The Graham number needs positive EPS and book value per share.");
    iv = Math.sqrt(22.5 * eps * bv); working = `√(22.5 × ${show(eps)} × ${show(bv)})`;
  } else {
    const eps = num(v.eps, 6), g = num(v.growth, 8), y = num(v.aaa, 5);
    if (!(y > 0)) throw new InputError("Enter the AAA corporate bond yield.");
    iv = (eps * (8.5 + 2 * g) * 4.4) / y; working = `${show(eps)} × (8.5 + 2 × ${show(g)}) × 4.4 ÷ ${show(y)}`;
  }
  const mos = price > 0 ? 1 - price / iv : NaN;
  return {
    value: `${usd(iv)} per share`,
    mos: price > 0 ? `${pc(mos, 3)} margin of safety at ${usd(price)} (${mos > 0 ? "trading below" : "trading above"} the estimate)` : "Enter the share price to compare",
    verdict: price > 0 ? (mos >= 0.3 ? "Possibly undervalued (30%+ margin of safety)" : mos >= 0 ? "Close to fair value" : "Possibly overvalued") : "—",
    working,
  };
};

// ------------------------------------------------------------------ CAPM
export const capm: Calc = (v) => {
  const rf = num(v.rf, 4.2) / 100, b = num(v.beta, 1.2), rm = num(v.rm, 10) / 100, act = num(v.actual, 0) / 100;
  const er = rf + b * (rm - rf);
  return { er: pc(er), premium: `Market risk premium ${pc(rm - rf)}; stock premium β × ${pc(rm - rf)} = ${pc(b * (rm - rf))}`, alpha: act ? `Jensen's alpha ${pc(act - er)} (actual ${pc(act)} − expected)` : "Enter an actual return to see alpha", beta: b > 1 ? "Beta above 1: moves more than the market" : b < 1 ? "Beta below 1: moves less than the market" : "Moves with the market", formula: `${pc(rf)} + ${show(b)} × (${pc(rm)} − ${pc(rf)}) = ${pc(er)}` };
};

// ------------------------------------------------------------------ MIRR (+ IRR)
function irr(cf: number[]): number {
  const f = (r: number) => cf.reduce((a, c, i) => a + c / (1 + r) ** i, 0);
  let lo = -0.9999, hi = 10, flo = f(lo);
  const fhi = f(hi);
  if (flo * fhi > 0) return NaN;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; } }
  return (lo + hi) / 2;
}
export const mirr: Calc = (v) => {
  const cf = list(txt(v, "flows"), 2), fr = num(v.finance, 8) / 100, rr = num(v.reinvest, 10) / 100, n = cf.length - 1;
  if (!cf.some((c) => c < 0) || !cf.some((c) => c > 0)) throw new InputError("Cash flows need at least one negative (investment) and one positive value.");
  const pvNeg = cf.reduce((a, c, i) => (c < 0 ? a + c / (1 + fr) ** i : a), 0), fvPos = cf.reduce((a, c, i) => (c > 0 ? a + c * (1 + rr) ** (n - i) : a), 0);
  const m = (fvPos / -pvNeg) ** (1 / n) - 1, i = irr(cf), npv = cf.reduce((a, c, k) => a + c / (1 + fr) ** k, 0);
  return { mirr: pc(m), irr: Number.isFinite(i) ? pc(i) : "— (no sign change found)", npv: `${usd(npv)} at the ${pc(fr, 3)} finance rate`, parts: `PV of outflows ${usd(-pvNeg)}; FV of inflows at ${pc(rr, 3)} = ${usd(fvPos)} over ${n} periods`, formula: "MIRR = (FV of inflows ÷ PV of outflows)^(1/n) − 1" };
};

// ------------------------------------------------------------------ profitability index
export const profitabilityIndex: Calc = (v) => {
  const inv = num(v.investment, 100000), r = num(v.rate, 10) / 100, cf = list(txt(v, "flows"), 1);
  if (!(inv > 0)) throw new InputError("Enter the initial investment.");
  const pv = cf.reduce((a, c, i) => a + c / (1 + r) ** (i + 1), 0), pi = pv / inv;
  return { pi: show(pi, 4), decision: pi > 1 ? "Above 1 — accept (creates value)" : pi === 1 ? "Exactly 1 — break-even" : "Below 1 — reject (destroys value)", pv: usd(pv), npv: usd(pv - inv), formula: `PI = ${usd(pv)} ÷ ${usd(inv)}` };
};

// ------------------------------------------------------------------ book value
export const bookValue: Calc = (v) => {
  const a = num(v.assets, 5e9), l = num(v.liabilities, 3e9), pref = num(v.preferred, 0), intg = num(v.intangibles, 4e8), sh = num(v.shares, 1e8), price = num(v.price, 30);
  if (!(sh > 0)) throw new InputError("Enter shares outstanding.");
  const bv = a - l - pref, bvps = bv / sh, tbv = (bv - intg) / sh;
  return { bvps: `${usd(bvps)} per share`, bv: usd(bv), tbv: `${usd(tbv)} per share (excluding ${usd(intg)} goodwill & intangibles)`, pb: price > 0 && bvps > 0 ? `${show(price / bvps, 4)}× (P/B at ${usd(price)})` : "—", note: price > 0 && bvps > 0 ? (price / bvps < 1 ? "Trading below book value" : "Trading above book value") : "—" };
};

// ------------------------------------------------------------------ race time predictor
export const RT_DIST: [string, number][] = [["1 mile", 1.609344], ["5K", 5], ["10K", 10], ["15K", 15], ["10 miles", 16.09344], ["Half marathon", 21.0975], ["Marathon", 42.195]];
export const RT_LABELS = [...RT_DIST.map((d) => d[0]), "Custom (km)"];
const parseT = (s: string) => { const p = s.trim().split(":").map(Number); if (!p.length || p.some((x) => !Number.isFinite(x) || x < 0)) throw new InputError("Enter a time like 25:30 or 1:52:10."); return p.reduce((a, x) => a * 60 + x, 0) * (p.length === 1 ? 60 : 1); };
const fmtT = (s: number) => { const r = Math.round(s), h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), x = r % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
export const raceTimePredictor: Calc = (v) => {
  const i = pick(v.dist, RT_LABELS.length), d1 = i < RT_DIST.length ? RT_DIST[i][1] : num(v.km, 8), t1 = parseT(txt(v, "time") || "25:00"), e = num(v.exp, 1.06), tk = num(v.target, 0);
  if (!(d1 > 0) || !(t1 > 0)) throw new InputError("Enter the race distance and your time.");
  const pred = (d: number) => t1 * (d / d1) ** e;
  const row = ([n, d]: [string, number]) => `${n} ${fmtT(pred(d))} (${fmtT(pred(d) / d)}/km, ${fmtT(pred(d) / (d / 1.609344))}/mi)`;
  return { marathon: fmtT(pred(42.195)), half: fmtT(pred(21.0975)), tenk: fmtT(pred(10)), fivek: fmtT(pred(5)), all: RT_DIST.map(row).join("; "), target: tk > 0 ? row([`${show(tk)} km`, tk]) : "Enter a custom distance to predict", formula: `Riegel: T₂ = T₁ × (D₂ ÷ D₁)^${show(e, 3)}` };
};

// ------------------------------------------------------------------ arrow speed
export const arrowSpeed: Calc = (v) => {
  const ibo = num(v.ibo, 340), dl = num(v.drawLength, 29), dw = num(v.drawWeight, 70), aw = num(v.arrow, 425), acc = Math.max(0, num(v.string, 10));
  if (!(ibo > 0) || !(dl > 0) || !(dw > 0) || !(aw > 0)) throw new InputError("Enter the IBO speed, draw length, draw weight and arrow weight.");
  const fps = ibo - 10 * (30 - dl) - (aw - 5 * dw) / 3 - acc / 3;
  const ke = (aw * fps * fps) / 450800, mom = (aw * fps) / 225400;
  return { fps: `${show(fps, 4)} fps (${show(fps * 0.3048, 4)} m/s)`, ke: `${show(ke, 4)} ft·lb — ${ke >= 65 ? "large/dangerous game" : ke >= 42 ? "elk, black bear" : ke >= 25 ? "deer, antelope" : "small game"}`, momentum: `${show(mom, 3)} slug·ft/s`, gpp: `${show(aw / dw, 3)} grains per pound${aw / dw < 5 ? " — below the 5 gpp minimum (risk of damaging the bow)" : ""}`, formula: `IBO ${show(ibo)} − 10 × (30 − ${show(dl)}) − (${show(aw)} − 5 × ${show(dw)}) ÷ 3 − ${show(acc)} ÷ 3` };
};

// ------------------------------------------------------------------ bowling average
export const bowlingAverage: Calc = (v) => {
  const s = list(txt(v, "scores"), 1), basis = num(v.basis, 220), pct = num(v.pct, 90) / 100;
  if (s.some((x) => x < 0 || x > 300)) throw new InputError("Scores must be between 0 and 300.");
  const tot = s.reduce((a, b) => a + b, 0), avg = tot / s.length, lg = Math.floor(avg), hc = Math.max(0, Math.floor((basis - lg) * pct));
  return { average: `${lg} (exact ${show(avg, 5)})`, games: `${s.length} games, ${nfmt(tot)} total pins`, high: `High ${Math.max(...s)}, low ${Math.min(...s)}`, handicap: `${hc} pins (${Math.round(pct * 100)}% of ${basis} − ${lg})`, series: `Average 3-game series ${nfmt(Math.round(avg * 3))}` };
};

// ------------------------------------------------------------------ poker odds (Texas Hold'em)
const RANKS = "23456789TJQKA", SUITS = "cdhs";
function parseCards(s: string): number[] {
  const t = s.replace(/10/g, "T").replace(/[♠]/g, "s").replace(/[♥]/g, "h").replace(/[♦]/g, "d").replace(/[♣]/g, "c").toUpperCase().replace(/[^2-9TJQKACDHS]/g, "");
  if (t.length % 2) throw new InputError("Write cards as rank + suit, e.g. As Kd 7h (T = 10).");
  const out: number[] = [];
  for (let i = 0; i < t.length; i += 2) { const r = RANKS.indexOf(t[i]), su = SUITS.indexOf(t[i + 1].toLowerCase()); if (r < 0 || su < 0) throw new InputError(`"${t.slice(i, i + 2)}" isn't a card.`); out.push(r * 4 + su); }
  return out;
}
function rank7(c: number[]): number {
  const cnt = new Array(13).fill(0), sc = [0, 0, 0, 0], bySuit: number[][] = [[], [], [], []];
  for (const x of c) { const r = x >> 2, s = x & 3; cnt[r]++; sc[s]++; bySuit[s].push(r); }
  const straightHi = (mask: number) => { for (let h = 12; h >= 4; h--) if (((mask >> (h - 4)) & 31) === 31) return h; return (mask & 0b1000000001111) === 0b1000000001111 ? 3 : -1; };
  const fs = sc.findIndex((n) => n >= 5);
  if (fs >= 0) { let m = 0; for (const r of bySuit[fs]) m |= 1 << r; const sh = straightHi(m); if (sh >= 0) return 8e10 + sh; }
  const groups: [number, number][] = []; for (let r = 12; r >= 0; r--) if (cnt[r]) groups.push([cnt[r], r]);
  groups.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = (ex: number[], n: number) => { const ks: number[] = []; for (let r = 12; r >= 0 && ks.length < n; r--) if (cnt[r] && !ex.includes(r)) ks.push(r); return ks; };
  const enc = (cat: number, ks: number[]) => cat * 1e10 + ks.reduce((a, k, i) => a + k * 15 ** (4 - i), 0);
  if (groups[0][0] === 4) return enc(7, [groups[0][1], ...kick([groups[0][1]], 1)]);
  if (groups[0][0] === 3 && groups[1] && groups[1][0] >= 2) return enc(6, [groups[0][1], groups[1][1]]);
  if (fs >= 0) return enc(5, bySuit[fs].sort((a, b) => b - a).slice(0, 5));
  let mask = 0; for (let r = 0; r < 13; r++) if (cnt[r]) mask |= 1 << r;
  const st = straightHi(mask); if (st >= 0) return enc(4, [st]);
  if (groups[0][0] === 3) return enc(3, [groups[0][1], ...kick([groups[0][1]], 2)]);
  if (groups[0][0] === 2 && groups[1] && groups[1][0] === 2) { const hi = groups[0][1], lo = groups[1][1]; return enc(2, [hi, lo, ...kick([hi, lo], 1)]); }
  if (groups[0][0] === 2) return enc(1, [groups[0][1], ...kick([groups[0][1]], 3)]);
  return enc(0, kick([], 5));
}
const CAT = ["High card", "One pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];
export const pokerOdds: Calc = (v) => {
  const hole = parseCards(txt(v, "hole") || "As Ks"), board = parseCards(txt(v, "board")), opp = Math.round(num(v.opponents, 1)), pot = num(v.pot, 100), call = num(v.call, 20);
  if (hole.length !== 2) throw new InputError("Enter exactly 2 hole cards.");
  if (![0, 3, 4, 5].includes(board.length)) throw new InputError("The board must have 0, 3, 4 or 5 cards.");
  if (opp < 1 || opp > 9) throw new InputError("Opponents must be 1–9.");
  const known = [...hole, ...board]; if (new Set(known).size !== known.length) throw new InputError("A card appears twice.");
  const deck = Array.from({ length: 52 }, (_, i) => i).filter((c) => !known.includes(c));
  let seed = 123456789; const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const N = 6000; let win = 0, tie = 0; const made = new Array(9).fill(0);
  const need = 5 - board.length + 2 * opp;
  for (let it = 0; it < N; it++) {
    for (let i = 0; i < need; i++) { const j = i + Math.floor(rnd() * (deck.length - i)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const b = [...board, ...deck.slice(0, 5 - board.length)];
    const me = rank7([...hole, ...b]); made[Math.floor(me / 1e10)]++;
    let best = -1, n = 0;
    for (let o = 0; o < opp; o++) { const k = 5 - board.length + 2 * o; const r = rank7([deck[k], deck[k + 1], ...b]); if (r > best) { best = r; n = 1; } else if (r === best) n++; }
    if (me > best) win++; else if (me === best) tie += 1 / (n + 1);
  }
  const eq = (win + tie) / N, po = call > 0 ? call / (pot + call) : 0;
  const top = made.map((c, i) => [c, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 4).map(([c, i]) => `${CAT[i]} ${pc(c / N, 3)}`).join(", ");
  return {
    equity: `${pc(eq, 3)} vs ${opp} random hand${opp > 1 ? "s" : ""}`,
    win: `Win ${pc(win / N, 3)}, tie ${pc(tie / N, 3)}`,
    potOdds: call > 0 ? `${pc(po, 3)} — you need at least this much equity to call ${usd(call)} into ${usd(pot)}` : "—",
    decision: call > 0 ? (eq >= po ? "Call is profitable on pot odds" : `Fold on pot odds — or call if you expect to win ${usd(call / eq - pot - call)} more later (implied odds)`) : "—",
    hands: `Your final hand: ${top}`,
    method: `${nfmt(N)} simulated deals (fixed seed, about ±1% accuracy)`,
  };
};

// ------------------------------------------------------------------ roulette
export const RO_WHEELS = ["European (single zero, 37 pockets)", "American (double zero, 38 pockets)"];
export const RO_BETS: [string, number, number][] = [["Straight up (1 number)", 1, 35], ["Split (2)", 2, 17], ["Street (3)", 3, 11], ["Corner (4)", 4, 8], ["Five-number / top line (American)", 5, 6], ["Six line (6)", 6, 5], ["Dozen or column (12)", 12, 2], ["Red/black, odd/even, high/low (18)", 18, 1]];
export const RO_LABELS = RO_BETS.map((b) => b[0]);
export const roulette: Calc = (v) => {
  const am = pick(v.wheel, 2) === 1, [name, k, pay] = RO_BETS[pick(v.bet, RO_BETS.length)], stake = num(v.stake, 10), spins = Math.max(1, Math.round(num(v.spins, 100)));
  if (k === 5 && !am) throw new InputError("The five-number bet only exists on the American wheel.");
  const n = am ? 38 : 37, p = k / n, ev = p * pay - (1 - p), atLeast = 1 - (1 - p) ** spins;
  return { prob: `${pc(p, 4)} (1 in ${show(1 / p, 4)})`, payout: `${pay} to 1 — a ${usd(stake)} win returns ${usd(stake * (pay + 1))}`, edge: `${pc(-ev, 3)} house edge (expected ${usd(ev * stake)} per spin)`, spins: `${nfmt(spins)} spins: expected ${usd(ev * stake * spins)}; ${pc(atLeast, 4)} chance of at least one win`, bet: `${name} on the ${am ? "American" : "European"} wheel` };
};

export const bigFinSportCustomCalculators: Record<string, Calc> = {
  "intrinsic-value-calculator": intrinsicValue,
  "capm-calculator": capm,
  "mirr-calculator": mirr,
  "profitability-index-calculator": profitabilityIndex,
  "book-value-calculator": bookValue,
  "race-time-predictor-calculator": raceTimePredictor,
  "arrow-speed-calculator": arrowSpeed,
  "bowling-average-calculator": bowlingAverage,
  "poker-odds-calculator": pokerOdds,
  "roulette-calculator": roulette,
};
