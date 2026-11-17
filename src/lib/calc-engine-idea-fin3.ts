/**
 * Idea build, batch fin3 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Credit & Debt (15), Crypto Fees, Payments & Loans (4) and Crypto Market, Tax & Security (10) = 29 tools.
 * Bitcoin facts used: 210,000-block halving interval, 50 BTC initial subsidy (3.125 BTC since block 840,000),
 * ~52,560 blocks a year at 10 min, BIP-39 word = 11 bits with entropy = words × 32/3 bits.
 * Transaction vsize per input/output: legacy 148/34, nested SegWit 91/32, native SegWit 68/31, Taproot 57.5/43, +10.5 overhead.
 * Prices, APRs and fees are editable defaults — the tools never pull live market data.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dayText, dateIn } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const TODAY = () => Math.floor(Date.now() / 86400000);
const mo = (n: number) => (n >= 24 ? `${n} months (${(n / 12).toFixed(1)} years)` : `${n} month${n === 1 ? "" : "s"}`);
const pmt = (pv: number, r: number, n: number) => (r === 0 ? pv / n : (pv * r) / (1 - Math.pow(1 + r, -n)));

// ---- Credit & Debt ----
const utilBand = (u: number) => (u < 0.1 ? "Excellent (under 10%)" : u < 0.3 ? "Good (10–29%)" : u < 0.5 ? "Fair — likely hurting your score (30–49%)" : u < 0.75 ? "High — noticeable score drag (50–74%)" : "Very high — major score drag (75%+)");
export const utilScore: Calc = (v) => {
  const b = p(v, "b", 4500), l = need(p(v, "l", 10000), "Enter total credit limits.");
  const u = b / l;
  return { util: `${pc(u)} utilization`, band: utilBand(u), target: `Pay down ${$0(Math.max(0, b - 0.3 * l))} to reach 30% · ${$0(Math.max(0, b - 0.1 * l))} to reach 10%` };
};
export const limitIncrease: Calc = (v) => {
  const b = p(v, "b", 3000), l = need(p(v, "l", 6000), "Enter the card's current limit."), i = p(v, "i", 4000), ob = p(v, "ob", 2000), ol = p(v, "ol", 8000);
  const before = (b + ob) / (l + ol), after = (b + ob) / (l + i + ol), card = b / (l + i);
  return { before: `${pc(before)} overall before → ${pc(after)} after`, card: `This card: ${pc(b / l)} → ${pc(card)}`, band: `${utilBand(after)} — some issuers do a hard pull for increases` };
};

export const btBreakeven: Calc = (v) => {
  const B = need(p(v, "b", 8000), "Enter the balance."), a = p(v, "a", 24) / 1200, f = p(v, "f", 3) / 100, pa = p(v, "pa", 0) / 1200, n = Math.max(1, Math.round(p(v, "n", 15))), P = need(p(v, "m", 400), "Enter your monthly payment.");
  let c = B, ci = 0, t = B * (1 + f), ti = 0;
  for (let k = 0; k < n; k++) {
    const i1 = c * a; ci += i1; c = Math.max(0, c + i1 - P);
    const i2 = t * pa; ti += i2; t = Math.max(0, t + i2 - P);
  }
  const fee = B * f, save = ci - fee - ti, be = a > 0 ? fee / (B * a) : Infinity;
  return { save: save >= 0 ? `Transfer saves ${$0(save)} over ${n} months` : `Transfer costs ${$0(-save)} more — keep the current card`, fee: `Fee ${$0(fee)} vs ${$0(ci)} interest on the current card`, be: Number.isFinite(be) ? `Fee is recovered in about ${Math.ceil(be)} month${Math.ceil(be) === 1 ? "" : "s"}` : "No interest on the current card to save", left: `Left when the promo ends: ${$0(t)} (current card: ${$0(c)})` };
};

export const zeroApr: Calc = (v) => {
  const B = need(p(v, "b", 3000), "Enter the balance."), n = Math.max(1, Math.round(p(v, "n", 12))), P = p(v, "m", 200), a = p(v, "a", 29.99) / 1200, def = pick(v.t, 2) === 1;
  const needP = B / n, left = Math.max(0, B - P * n);
  let back = 0, bal = B;
  for (let k = 0; k < n; k++) { back += bal * a; bal = Math.max(0, bal - P); }
  return { need: `${$(needP)} a month clears it in ${n} months`, gap: left > 0 ? `At ${$(P)}/month, ${$0(left)} is left when the promo ends` : `At ${$(P)}/month you finish in ${Math.ceil(B / Math.max(P, 0.01))} months — on time`, risk: left > 0 ? (def ? `Deferred interest: about ${$0(back)} back-interest would be charged` : `Remaining ${$0(left)} starts accruing at ${(a * 1200).toFixed(2)}% APR`) : "No interest if every payment is on time" };
};

interface Debt { b: number; r: number; m: number }
function simulate(debts: Debt[], extra: number, order: (a: Debt, b: Debt) => number) {
  const ds = debts.map((d) => ({ ...d })).sort(order), budget = ds.reduce((s, d) => s + d.m, 0) + extra;
  let months = 0, interest = 0;
  const done: number[] = [];
  while (ds.some((d) => d.b > 0.005)) {
    if (++months > 1200) throw new InputError("Payments don't cover the interest — raise payments.");
    let left = budget;
    for (const d of ds) if (d.b > 0) { const i = (d.b * d.r) / 1200; interest += i; d.b += i; }
    for (const d of ds) if (d.b > 0) { const x = Math.min(d.m, d.b, left); d.b -= x; left -= x; }
    for (const d of ds) if (d.b > 0 && left > 0) { const x = Math.min(d.b, left); d.b -= x; left -= x; }
    ds.forEach((d, i) => { if (d.b <= 0.005 && done[i] === undefined) done[i] = months; });
  }
  return { months, interest, first: Math.min(...done.filter((x) => x !== undefined)) };
}
const readDebts = (v: Record<string, number>, def: [number, number, number][]) => {
  const out: Debt[] = [];
  def.forEach(([b, r, m], i) => { const d = { b: p(v, `b${i + 1}`, b), r: p(v, `r${i + 1}`, r), m: p(v, `m${i + 1}`, m) }; if (d.b > 0) out.push(d); });
  if (!out.length) throw new InputError("Enter at least one debt balance.");
  return out;
};
export const snowVsAva: Calc = (v) => {
  const ds = readDebts(v, [[2500, 12, 75], [6000, 24, 150], [9000, 7, 200], [0, 0, 0]]), x = p(v, "x", 200);
  const sn = simulate(ds, x, (a, b) => a.b - b.b), av = simulate(ds, x, (a, b) => b.r - a.r), d = sn.interest - av.interest;
  return { win: Math.abs(d) < 1 ? "Both methods cost the same here" : `Avalanche saves ${$0(d)} in interest${sn.months !== av.months ? ` and ${Math.abs(sn.months - av.months)} month(s)` : ""}`, sn: `Snowball: debt-free in ${mo(sn.months)} · ${$0(sn.interest)} interest · first debt gone in month ${sn.first}`, av: `Avalanche: debt-free in ${mo(av.months)} · ${$0(av.interest)} interest · first debt gone in month ${av.first}` };
};

export const lateFee: Calc = (v) => {
  const F = p(v, "f", 32), B = p(v, "b", 5000), pa = p(v, "pa", 29.99), a = p(v, "a", 22), m = p(v, "m", 6), pen = pick(v.l, 2) === 1;
  const extra = pen ? ((B * Math.max(0, pa - a)) / 1200) * m : 0;
  return { tot: `${$0(F + extra)} total cost of the late payment`, fee: `Late fee ${$0(F)}`, apr: pen ? `Penalty APR adds about ${$0(extra)} over ${m} months` : "No penalty APR (usually triggered at 60+ days late)", note: "30+ days late can be reported to credit bureaus and stay 7 years" };
};

export const annualFee: Calc = (v) => {
  const A = p(v, "a", 95), S = p(v, "s", 24000), r1 = p(v, "r1", 3) / 100, r2 = p(v, "r2", 2) / 100, c = p(v, "c", 0), sb = p(v, "sb", 0);
  const net = S * (r1 - r2) + c - A, be = r1 > r2 ? (A - c) / (r1 - r2) : Infinity;
  return { net: net >= 0 ? `Worth it: ${$0(net)} a year ahead of the no-fee card` : `Not worth it: ${$0(-net)} a year behind the no-fee card`, y1: `Year one incl. bonus: ${net + sb >= 0 ? "+" : "−"}${$0(Math.abs(net + sb))}`, be: Number.isFinite(be) ? (be > 0 ? `Break-even spend: ${$0(be)} a year` : "Credits alone cover the fee") : "The fee card must earn more than the no-fee card to break even" };
};

export const pointsValue: Calc = (v) => {
  const P = need(p(v, "p", 60000), "Enter your points."), c = p(v, "c", 900), t = p(v, "t", 50), n = need(p(v, "n", 55000), "Enter points needed for the award."), base = p(v, "bc", 1);
  const cpp = ((c - t) / n) * 100;
  return { cpp: `${cpp.toFixed(2)}¢ per point on this redemption`, worth: `Your ${nfmt(P)} points ≈ ${$0((P * cpp) / 100)} (vs ${$0((P * base) / 100)} as cash back)`, verdict: cpp >= base * 1.25 ? "Good redemption — beats cash back" : cpp >= base ? "OK — about the same as cash back" : "Poor — cash back is worth more" };
};

export const debtSettle: Calc = (v) => {
  const D = need(p(v, "d", 20000), "Enter the enrolled debt."), s = p(v, "s", 50) / 100, f = p(v, "f", 20) / 100, m = Math.max(1, Math.round(p(v, "m", 36))), t = p(v, "t", 22) / 100, ins = pick(v.i, 2) === 1;
  const paid = D * s, fee = D * f, forgiven = D - paid, tax = ins ? 0 : forgiven >= 600 ? forgiven * t : 0, save = D - paid - fee - tax;
  return { save: `${$0(save)} saved vs paying in full`, cost: `Settlements ${$0(paid)} + fees ${$0(fee)} + tax ${$0(tax)} = ${$0(paid + fee + tax)}`, dep: `About ${$0((paid + fee) / m)} a month into the program for ${m} months`, note: ins ? "Insolvent: forgiven debt can be excluded (IRS Form 982)" : "Forgiven $600+ usually gets a 1099-C and is taxable income; settled accounts hurt credit for 7 years" };
};

export const dmp: Calc = (v) => {
  const D = need(p(v, "d", 15000), "Enter the debt."), a = p(v, "a", 24) / 1200, d = p(v, "r", 8) / 1200, n = Math.max(1, Math.round(p(v, "n", 60))), su = p(v, "su", 40), mf = p(v, "mf", 30);
  const pay = pmt(D, d, n), tot = pay * n + su + mf * n, P = pay + mf;
  let bal = D, k = 0, int = 0;
  while (bal > 0.005 && k < 1200) { const i = bal * a; if (P <= i) break; int += i; bal = bal + i - P; k++; }
  return { pay: `${$(P)} a month (${$(pay)} to creditors + ${$(mf)} fee)`, total: `${$0(tot)} total over ${mo(n)} · interest ${$0(pay * n - D)}`, cmp: bal > 0.005 ? `The same payment never clears it at ${(a * 1200).toFixed(1)}% APR` : `Same payment on your own at ${(a * 1200).toFixed(1)}%: ${mo(k)}, ${$0(int)} interest` };
};

export const sol: Calc = (v) => {
  const lp = dateIn(v, "lp", TODAY() - 3 * 365), fd = dateIn(v, "fd", TODAY() - 3 * 365), y = need(p(v, "y", 6), "Enter your state's limit in years.");
  const end = lp + Math.round(y * 365.25), rep = fd + 180 + Math.round(7 * 365.25), now = TODAY();
  return { sol: `${dayText(end)} — ${end > now ? `${nfmt(end - now)} days left` : "likely time-barred now"}`, rep: `Off credit reports by about ${dayText(rep)} (7 years + 180 days from first delinquency)`, note: "A new payment or written acknowledgment can restart the clock in many states — check before paying" };
};

export const medicalDebt: Calc = (v) => {
  const B = need(p(v, "b", 6000), "Enter the bill."), d = p(v, "d", 20) / 100, a = p(v, "a", 0) / 1200, n = Math.max(1, Math.round(p(v, "n", 24)));
  const owe = B * (1 - d), pay = pmt(owe, a, n);
  return { pay: `${$(pay)} a month for ${mo(n)}`, owe: `${$0(owe)} after a ${pc(d, 0)} reduction (saves ${$0(B - owe)})`, int: a > 0 ? `${$0(pay * n - owe)} interest` : "0% — most hospital payment plans charge no interest", note: "Ask for an itemized bill and financial assistance; medical collections under $500 aren't on credit reports" };
};

export const storeCard: Calc = (v) => {
  const P = need(p(v, "p", 1500), "Enter the purchase price."), dsc = p(v, "d", 10) / 100, a = p(v, "a", 30) / 1200, n = Math.max(1, Math.round(p(v, "n", 12)));
  const fin = P * (1 - dsc), pay = pmt(fin, a, n), int = pay * n - fin, net = P * dsc - int;
  return { net: net >= 0 ? `Card saves ${$0(net)} overall` : `Card costs ${$0(-net)} more than paying cash`, pay: `${$(pay)} a month for ${mo(n)}`, parts: `Discount ${$0(P * dsc)} · interest ${$0(int)}`, tip: `Pay ${$0(fin)} in full the first month to keep the whole discount` };
};

export const debtLoad: Calc = (v) => {
  const ks = ["mo", "au", "st", "cc", "pl", "ot"], bal = ks.reduce((s, k) => s + p(v, k, 0), 0), pay = p(v, "pm", 2600), inc = need(p(v, "i", 7500), "Enter gross monthly income.");
  const dti = pay / inc, nm = bal - p(v, "mo", 0);
  return { tot: `${$0(bal)} total debt`, dti: `${pc(dti)} debt-to-income (${dti <= 0.36 ? "healthy" : dti <= 0.43 ? "stretched" : dti <= 0.5 ? "high" : "very high"})`, ratio: `Debt is ${(bal / (inc * 12)).toFixed(2)}× yearly income · non-mortgage ${(nm / (inc * 12)).toFixed(2)}×` };
};

export const jointDebt: Calc = (v) => {
  const J = need(p(v, "j", 30000), "Enter the joint debt."), mp = p(v, "mp", 900), A = p(v, "a", 70000), B = p(v, "b", 45000), meth = pick(v.m, 3), c = Math.min(100, p(v, "c", 50)) / 100;
  if (meth === 1 && A + B <= 0) throw new InputError("Enter both incomes.");
  const s = meth === 0 ? 0.5 : meth === 1 ? A / (A + B) : c;
  return { a: `Spouse A: ${$0(J * s)} (${pc(s, 0)}) · ${$(mp * s)}/month`, b: `Spouse B: ${$0(J * (1 - s))} (${pc(1 - s, 0)}) · ${$(mp * (1 - s))}/month`, note: "A divorce decree doesn't bind creditors — both remain liable on joint accounts until refinanced or paid off" };
};

// ---- Crypto fees, payments & loans ----
const VB: [number, number][] = [[68, 31], [57.5, 43], [148, 34], [91, 32]];
export const btcFee: Calc = (v) => {
  const ni = Math.max(1, Math.round(p(v, "ni", 1))), no = Math.max(1, Math.round(p(v, "no", 2))), t = pick(v.t, 4), rate = p(v, "r", 10), px = p(v, "px", 100000);
  const [ip, op] = VB[t], vb = Math.ceil((t === 2 ? 10 : 10.5) + ip * ni + op * no), sats = Math.ceil(vb * rate);
  return { fee: `${nfmt(sats)} sats ≈ ${$(sats * px / 1e8)}`, size: `${nfmt(vb)} vbytes at ${rate} sat/vB`, tip: t >= 2 ? "Native SegWit or Taproot addresses would cut the size" : "Consolidate small UTXOs when fees are low" };
};
export const exchFee: Calc = (v) => {
  const A = need(p(v, "a", 5000), "Enter the trade amount.");
  const cost = (f: number, s: number, w: number) => A * (f + s / 2) / 100 + w;
  const ca = cost(p(v, "fa", 0.6), p(v, "sa", 0.5), p(v, "wa", 5)), cb = cost(p(v, "fb", 0.1), p(v, "sb", 0.2), p(v, "wb", 15));
  return { win: ca === cb ? "Both cost the same" : `Exchange ${ca < cb ? "A" : "B"} is cheaper by ${$(Math.abs(ca - cb))}`, a: `Exchange A: ${$(ca)} (${pc(ca / A, 2)})`, b: `Exchange B: ${$(cb)} (${pc(cb / A, 2)})` };
};
export const loanLiq: Calc = (v) => {
  const q = need(p(v, "q", 1), "Enter collateral amount."), px = need(p(v, "px", 100000), "Enter the coin price."), L = need(p(v, "l", 40000), "Enter the loan."), mc = p(v, "mc", 70) / 100, liq = need(p(v, "lq", 80) / 100, "Enter liquidation LTV.");
  const ltv = L / (q * px), lp = L / (q * liq), mp = mc > 0 ? L / (q * mc) : 0;
  if (ltv >= liq) return { liq: "Already past the liquidation LTV", ltv: `Current LTV ${pc(ltv)}`, mc: "—", drop: "Add collateral or repay now" };
  return { liq: `${$(lp)} liquidation price`, ltv: `Current LTV ${pc(ltv)} on ${$0(q * px)} collateral`, mc: mp ? `Margin call at ${$(mp)} (${pc(mc, 0)} LTV)` : "No margin-call level set", drop: `Price can fall ${pc(1 - lp / px)} before liquidation` };
};
export const lnFee: Calc = (v) => {
  const A = need(p(v, "a", 100000), "Enter the amount in sats."), h = Math.max(1, Math.round(p(v, "h", 3))), b = p(v, "b", 1000), r = p(v, "r", 100), oc = p(v, "oc", 1500), px = p(v, "px", 100000);
  const hop = b / 1000 + (A * r) / 1e6, tot = hop * h;
  return { fee: `${nfmt(tot, tot < 10 ? 2 : 0)} sats ≈ ${$(tot * px / 1e8, 4)}`, pct: `${pc(tot / A, 3)} of the payment (${nfmt(hop, 2)} sats per hop × ${h})`, cmp: `On-chain fee you entered: ${nfmt(oc)} sats — Lightning is ${oc > tot ? `${nfmt(oc / Math.max(tot, 0.001), 0)}× cheaper` : "not cheaper here"}` };
};

// ---- Crypto market, tax & security ----
export const costBasis: Calc = (v) => {
  const lots: { q: number; px: number }[] = [];
  [[0.5, 30000], [0.3, 60000], [0.2, 95000], [0, 0]].forEach(([q, px], i) => { const l = { q: p(v, `q${i + 1}`, q), px: p(v, `p${i + 1}`, px) }; if (l.q > 0) lots.push(l); });
  const held = lots.reduce((s, l) => s + l.q, 0), S = need(p(v, "s", 0.6), "Enter the amount sold."), sp = p(v, "sp", 100000);
  if (S > held + 1e-12) throw new InputError("You can't sell more than the lots add up to.");
  const basis = (order: typeof lots) => { let left = S, c = 0; for (const l of order) { const x = Math.min(left, l.q); c += x * l.px; left -= x; if (left <= 0) break; } return c; };
  const proceeds = S * sp, f = basis(lots), l = basis([...lots].reverse()), hi = basis([...lots].sort((a, b) => b.px - a.px));
  const g = (c: number) => `${$0(proceeds - c)} gain (basis ${$0(c)})`;
  return { fifo: `FIFO: ${g(f)}`, lifo: `LIFO: ${g(l)}`, hifo: `HIFO: ${g(hi)} — lowest tax`, note: `Proceeds ${$0(proceeds)} · IRS default is FIFO unless you specifically identify lots; from 2025 basis is tracked per wallet/account` };
};
export const stakeTax: Calc = (v) => {
  const r = need(p(v, "r", 1.2), "Enter coins received."), pr = p(v, "pr", 3000), t = p(v, "t", 24) / 100, sp = p(v, "sp", 3600), lt = pick(v.h, 2) === 1, ltr = p(v, "lt", 15) / 100;
  const inc = r * pr, g = r * (sp - pr), gt = g > 0 ? g * (lt ? ltr : t) : g * t;
  return { inc: `${$0(inc)} ordinary income when received → ${$0(inc * t)} tax`, sale: `Selling later: ${g >= 0 ? "gain" : "loss"} ${$0(Math.abs(g))} → ${g >= 0 ? "" : "saves "}${$0(Math.abs(gt))} ${lt ? "long-term" : "short-term"}`, tot: `${$0(inc * t + gt)} total tax · basis = value when received` };
};
export const fdv: Calc = (v) => {
  const px = need(p(v, "p", 2), "Enter the token price."), c = need(p(v, "c", 400e6), "Enter circulating supply."), m = Math.max(c, p(v, "m", 1e9));
  return { fdv: `${$0(px * m)} fully diluted valuation`, mc: `${$0(px * c)} market cap (circulating)`, ratio: `FDV is ${(m / c).toFixed(2)}× market cap · ${pc(1 - c / m)} of supply not yet circulating` };
};
export const tokenPrice: Calc = (v) => {
  const mc = need(p(v, "m", 10e9), "Enter target market cap."), s = need(p(v, "s", 1e9), "Enter circulating supply."), cur = p(v, "p", 2);
  const px = mc / s;
  return { px: `${$(px, px < 1 ? 6 : 2)} per token`, x: cur > 0 ? `${(px / cur).toFixed(2)}× the current price (${px >= cur ? "+" : ""}${pc(px / cur - 1)})` : "Enter the current price to see the multiple", note: "Market cap = price × supply — a bigger cap needs that much more money flowing in" };
};
const subsidy = (h: number) => 50 / Math.pow(2, Math.floor(h / 210000));
const supplyAt = (h: number) => { let s = 0; for (let e = 0; e * 210000 < h; e++) s += Math.min(210000, h - e * 210000) * (50 / Math.pow(2, e)); return s; };
export const halving: Calc = (v) => {
  const h = Math.round(need(p(v, "h", 975000), "Enter the current block height.")), bt = need(p(v, "bt", 10), "Enter average block time.");
  const next = (Math.floor(h / 210000) + 1) * 210000, left = next - h, days = (left * bt) / 1440;
  return { date: `${dayText(TODAY() + Math.round(days))} (estimated)`, left: `${nfmt(left)} blocks ≈ ${nfmt(days, 0)} days`, sub: `Reward ${subsidy(h)} BTC now → ${subsidy(next)} BTC after block ${nfmt(next)}` };
};
export const s2f: Calc = (v) => {
  const h = Math.round(need(p(v, "h", 975000), "Enter the block height.")), s = supplyAt(h), flow = subsidy(h) * 52560, sf = s / flow;
  const model = (Math.exp(14.6) * Math.pow(sf, 3.3)) / s;
  return { sf: `Stock-to-flow ratio ${sf.toFixed(1)}`, supply: `${nfmt(s, 0)} BTC mined · ${nfmt(flow, 0)} BTC new per year (${pc(flow / s, 2)} inflation)`, model: `S2F model price ≈ ${$0(model)} — a widely criticised model, not a forecast` };
};
export const rebalance: Calc = (v) => {
  const def: [string, number, number][] = [["BTC", 6000, 50], ["ETH", 3000, 30], ["SOL", 800, 10], ["Stablecoins", 200, 10]];
  const a = def.map(([n], i) => ({ n, val: p(v, `v${i + 1}`, def[i][1]), t: p(v, `t${i + 1}`, def[i][2]) / 100 }));
  const tot = need(a.reduce((s, x) => s + x.val, 0), "Enter holdings."), tw = a.reduce((s, x) => s + x.t, 0);
  if (Math.abs(tw - 1) > 0.001) throw new InputError(`Targets add up to ${(tw * 100).toFixed(1)}% — make them total 100%.`);
  const tr = a.map((x, i) => ({ i: i + 1, d: x.t * tot - x.val }));
  return { trades: tr.map((x) => `Asset ${x.i}: ${x.d >= 0 ? "buy" : "sell"} ${$0(Math.abs(x.d))}`).join(" · "), now: `Now: ${a.map((x, i) => `Asset ${i + 1} ${pc(x.val / tot, 0)}`).join(" · ")}`, turn: `Total portfolio ${$0(tot)} · ${$0(tr.reduce((s, x) => s + Math.max(0, x.d), 0))} to move` };
};
const WORDS = [12, 15, 18, 21, 24];
export const seedEntropy: Calc = (v) => {
  const w = WORDS[pick(v.w, 5)], g = need(p(v, "g", 1e12), "Enter guesses per second.");
  const bits = (w * 32) / 3, chk = w * 11 - bits, log10yrs = bits * Math.log10(2) - Math.log10(g) - Math.log10(31557600) - Math.log10(2);
  return { bits: `${bits} bits of entropy (+ ${chk}-bit checksum)`, combos: `2^${bits} ≈ 10^${(bits * Math.log10(2)).toFixed(0)} possible phrases`, time: `Average brute-force time ≈ 10^${log10yrs.toFixed(0)} years at ${g.toExponential(0)} guesses/s`, note: "Only true if words came from a secure random generator — never a phrase you chose" };
};
export const dominance: Calc = (v) => {
  const c = need(p(v, "c", 2e12), "Enter the coin's market cap."), t = need(p(v, "t", 3.4e12), "Enter total crypto market cap."), s = p(v, "s", 0);
  if (c + s > t) throw new InputError("Coin market caps can't exceed the total.");
  return { dom: `${pc(c / t)} dominance`, rest: `Rest of market ${$0(t - c - s)} (${pc((t - c - s) / t)})`, two: s > 0 ? `Second coin ${pc(s / t)} · top two ${pc((c + s) / t)}` : "Add a second coin to compare" };
};
export const nftRoyalty: Calc = (v) => {
  const V = p(v, "v", 50000), r = p(v, "r", 5) / 100, e = p(v, "e", 40) / 100, n = p(v, "n", 120);
  const m = V * r * e;
  return { yr: `${$0(m * 12)} a year (${$0(m)} a month)`, per: n > 0 ? `${$((V / n) * r)} per royalty-paying sale (avg sale ${$(V / n)})` : "Enter sales per month", note: `Only ${pc(e, 0)} of volume pays royalties — many marketplaces make them optional` };
};

// ---- registry (generated)
export const ideaFin3CustomCalculators: Record<string, Calc> = {
  "credit-score-impact-of-utilization-calculator": utilScore,
  "credit-limit-increase-effect-calculator": limitIncrease,
  "balance-transfer-fee-breakeven-calculator": btBreakeven,
  "0-apr-payoff-plan-calculator": zeroApr,
  "debt-snowball-vs-avalanche-comparison-calculator": snowVsAva,
  "credit-card-late-fee-calculator": lateFee,
  "credit-card-annual-fee-worth-it-calculator": annualFee,
  "credit-card-points-value-calculator": pointsValue,
  "debt-settlement-savings-calculator": debtSettle,
  "debt-management-plan-payment-calculator": dmp,
  "debt-collection-statute-of-limitations-calculator": sol,
  "medical-debt-payment-plan-calculator": medicalDebt,
  "store-card-financing-cost-calculator": storeCard,
  "total-debt-load-calculator": debtLoad,
  "joint-debt-split-divorce-calculator": jointDebt,
  "bitcoin-transaction-fee-calculator": btcFee,
  "crypto-exchange-fee-comparison-calculator": exchFee,
  "crypto-loan-liquidation-price-calculator": loanLiq,
  "lightning-network-fee-calculator": lnFee,
  "crypto-cost-basis-fifo-lifo-calculator": costBasis,
  "staking-rewards-tax-calculator": stakeTax,
  "fully-diluted-valuation-calculator": fdv,
  "token-price-at-market-cap-calculator": tokenPrice,
  "bitcoin-halving-countdown-calculator": halving,
  "bitcoin-stock-to-flow-calculator": s2f,
  "crypto-rebalancing-calculator": rebalance,
  "seed-phrase-entropy-calculator": seedEntropy,
  "crypto-dominance-calculator": dominance,
  "nft-royalty-earnings-calculator": nftRoyalty,
};
