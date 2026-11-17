/**
 * Idea build, batch fin4 (17 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Finance > Crypto Staking, DeFi & Mining (5), Crypto Trading & Profit (8), Currency Exchange & Forex (3), Economics (12) = 28 tools.
 * Mining from difficulty: BTC/day = hashrate × 86,400 × reward ÷ (difficulty × 2^32).
 * Perp liquidation (isolated, linear): long = entry × (1 − 1/lev + mmr), short = entry × (1 + 1/lev − mmr).
 * Forex sessions in UTC — winter: Sydney 22–07, Tokyo 00–09, London 08–17, New York 13–22; northern summer shifts London/NY 1 h earlier
 * and Sydney 1 h later (it is on standard time then).
 * Tax incidence (linear, small tax): buyer share = Es ÷ (Es + |Ed|).
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const $0 = (x: number) => money(x, "$", 0);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const sgn = (x: number, dp = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(dp)}%`;
const cx = (x: number) => (x >= 1 ? nfmt(x, x >= 1000 ? 2 : 4) : x.toPrecision(4));

// ---- Staking & mining ----
const stake = (amt: number, apr: number, fee: number, yrs: number, comp: boolean, per: number) => {
  const net = apr * (1 - fee);
  const end = comp ? amt * Math.pow(1 + net / per, per * yrs) : amt * (1 + net * yrs);
  return { net, end, gain: end - amt };
};
const stakeOut = (coin: string, amt: number, px: number, r: ReturnType<typeof stake>, yrs: number, extra: string) => ({
  rew: `${cx(r.gain)} ${coin} over ${yrs} yr (≈ ${$0(r.gain * px)} at today's price)`,
  yr: `${cx(amt * r.net)} ${coin} a year · ${cx((amt * r.net) / 12)} ${coin} a month (${pc(r.net, 2)} net APR)`,
  end: `${cx(r.end)} ${coin} total · ${extra}`,
});
export const ethStake: Calc = (v) => {
  const a = need(p(v, "a", 32), "Enter ETH staked."), apr = p(v, "r", 3) / 100, f = p(v, "f", 10) / 100, y = need(p(v, "y", 1), "Enter years."), px = p(v, "px", 3500), comp = pick(v.c, 2) === 1;
  const r = stake(a, apr, f, y, comp, 365);
  return stakeOut("ETH", a, px, r, y, a >= 32 ? `${Math.floor(a / 32)} solo validator${a >= 64 ? "s" : ""} possible (32 ETH each)` : "Under 32 ETH — use a pool or liquid staking");
};
export const solStake: Calc = (v) => {
  const a = need(p(v, "a", 100), "Enter SOL staked."), apr = p(v, "r", 7) / 100, f = p(v, "f", 5) / 100, y = need(p(v, "y", 1), "Enter years."), px = p(v, "px", 180);
  const r = stake(a, apr, f, y, true, 182);
  return stakeOut("SOL", a, px, r, y, `about ${cx((a * r.net) / 182)} SOL per ~2-day epoch, auto-compounding`);
};
export const adaStake: Calc = (v) => {
  const a = need(p(v, "a", 10000), "Enter ADA delegated."), apr = p(v, "r", 2.8) / 100, mg = p(v, "f", 2) / 100, y = need(p(v, "y", 1), "Enter years."), px = p(v, "px", 0.7);
  const r = stake(a, apr, mg, y, true, 73);
  return stakeOut("ADA", a, px, r, y, `about ${cx((a * r.net) / 73)} ADA per 5-day epoch · no lock-up`);
};
export const rigPower: Calc = (v) => {
  const w = need(p(v, "w", 3250), "Enter power draw."), e = need(p(v, "e", 93), "Enter PSU efficiency.") / 100, h = Math.min(24, p(v, "h", 24)), c = p(v, "c", 0.12), n = Math.max(1, Math.round(p(v, "n", 1))), cool = p(v, "k", 10) / 100;
  const kwh = ((w / e) * h * n * (1 + cool)) / 1000;
  return { day: `${$(kwh * c)} a day · ${$0(kwh * c * 30.4)} a month`, yr: `${$0(kwh * c * 365)} a year`, kwh: `${nfmt(kwh, 1)} kWh a day (${nfmt((w / e) * n, 0)} W from the wall, + ${pc(cool, 0)} cooling)` };
};
export const difficultyEarn: Calc = (v) => {
  const th = need(p(v, "th", 200), "Enter your hashrate."), d = need(p(v, "d", 150), "Enter network difficulty.") * 1e12, rw = p(v, "rw", 3.125), fee = p(v, "fe", 3) / 100, pf = p(v, "pf", 2) / 100, px = p(v, "px", 100000), ch = num(v.ch, 3) / 100, w = p(v, "w", 3500), c = p(v, "c", 0.08);
  const btc = ((th * 1e12 * 86400 * rw * (1 + fee)) / (d * Math.pow(2, 32))) * (1 - pf), pw = (w / 1000) * 24 * c, after = btc / (1 + ch);
  return { day: `${btc.toFixed(8)} BTC a day ≈ ${$(btc * px)}`, net: `Profit after power: ${$(btc * px - pw)} a day (power ${$(pw)})`, adj: `After a ${sgn(ch)} difficulty change: ${after.toFixed(8)} BTC (${$(after * px - pw)} profit)` };
};

// ---- Trading & profit ----
export const dcaCost: Calc = (v) => {
  let spent = 0, coins = 0;
  [[500, 60000], [500, 75000], [500, 90000], [500, 105000], [0, 0]].forEach(([a, px], i) => { const amt = p(v, `a${i + 1}`, a), pr = p(v, `p${i + 1}`, px); if (amt > 0 && pr > 0) { spent += amt; coins += amt / pr; } });
  if (!coins) throw new InputError("Enter at least one buy amount and price.");
  const f = p(v, "f", 1) / 100, now = p(v, "now", 100000), net = coins * (1 - f), avg = spent / net;
  return { avg: `${$(avg)} average cost per coin (after fees)`, hold: `${cx(net)} coins for ${$0(spent)}`, pnl: now > 0 ? `Worth ${$0(net * now)} now — ${sgn(now / avg - 1)} (${$0(net * now - spent)})` : "Enter the current price to see profit" };
};
export const levLiq: Calc = (v) => {
  const e = need(p(v, "e", 100000), "Enter entry price."), L = need(p(v, "l", 10), "Enter leverage."), mm = p(v, "mm", 0.5) / 100, side = pick(v.s, 2), mg = p(v, "m", 1000);
  if (L < 1) throw new InputError("Leverage must be at least 1×.");
  const liq = side === 0 ? e * (1 - 1 / L + mm) : e * (1 + 1 / L - mm), move = Math.abs(liq / e - 1);
  return { liq: `${$(liq)} liquidation price (${side === 0 ? "long" : "short"})`, move: `A ${pc(move, 2)} move against you liquidates the position`, size: `Position ${$0(mg * L)} on ${$0(mg)} margin` };
};
export const priceTarget: Calc = (v) => {
  const h = need(p(v, "h", 0.25), "Enter your BTC holdings."), g = need(p(v, "g", 1e6), "Enter your target value."), px = need(p(v, "px", 100000), "Enter today's price."), y = need(p(v, "y", 10), "Enter years.");
  const t = g / h, cagr = Math.pow(t / px, 1 / y) - 1;
  return { px: `BTC must reach ${$0(t)} for your ${cx(h)} BTC to be worth ${$0(g)}`, x: `${(t / px).toFixed(2)}× today's price`, cagr: `Needs ${sgn(cagr)} a year for ${y} years` };
};
export const feeBreakeven: Calc = (v) => {
  const b = need(p(v, "b", 100000), "Enter buy price."), fb = p(v, "fb", 0.6) / 100, fs = p(v, "fs", 0.6) / 100, s = p(v, "sp", 0.5) / 100, q = p(v, "q", 0.05);
  if (fs + s / 2 >= 1) throw new InputError("Fees too high.");
  const be = (b * (1 + fb + s / 2)) / (1 - fs - s / 2);
  return { be: `${$(be)} break-even sell price`, up: `Price must rise ${pc(be / b - 1, 2)} to break even`, cost: q > 0 ? `Fees and spread on ${cx(q)} coins ≈ ${$(q * (be - b))}` : "Enter quantity for dollar fees" };
};
export const whatIf: Calc = (v) => {
  const a = need(p(v, "a", 1000), "Enter amount invested."), b = need(p(v, "b", 10000), "Enter the price you'd have bought at."), n = need(p(v, "n", 100000), "Enter today's price."), y = p(v, "y", 6);
  const c = a / b, val = c * n;
  return { val: `${$0(val)} today`, gain: `${sgn(val / a - 1, 0)} (${$0(val - a)}) on ${cx(c)} BTC`, cagr: y > 0 ? `${sgn(Math.pow(val / a, 1 / y) - 1)} a year over ${y} years` : "Enter years held for the yearly rate" };
};
export const satUsd: Calc = (v) => {
  const s = p(v, "s", 100000), px = need(p(v, "px", 100000), "Enter BTC price."), usd = p(v, "u", 0);
  return { usd: `${nfmt(s)} sats = ${$(s * px / 1e8, s * px / 1e8 < 1 ? 4 : 2)}`, btc: `${(s / 1e8).toFixed(8)} BTC · 1 sat = ${$(px / 1e8, 6)}`, rev: usd > 0 ? `${$(usd)} = ${nfmt(Math.round(usd / px * 1e8))} sats` : `$1 = ${nfmt(Math.round(1e8 / px))} sats` };
};
export const gweiEth: Calc = (v) => {
  const g = p(v, "g", 1000000), px = p(v, "px", 3500), gp = p(v, "gp", 5), gl = p(v, "gl", 21000);
  const eth = g / 1e9, tx = (gp * gl) / 1e9;
  return { eth: `${nfmt(g)} gwei = ${eth.toFixed(9).replace(/0+$/, "").replace(/\.$/, "")} ETH ≈ ${$(eth * px)}`, tx: `A ${nfmt(gl)}-gas transfer at ${gp} gwei = ${tx.toFixed(6)} ETH ≈ ${$(tx * px, 4)}`, unit: "1 ETH = 1,000,000,000 gwei = 10^18 wei" };
};
export const pctGain: Calc = (v) => {
  const b = need(p(v, "b", 40000), "Enter buy price."), s = need(p(v, "s", 100000), "Enter current or sell price."), q = p(v, "q", 0.1);
  const g = s / b - 1;
  return { g: `${sgn(g)} ${g >= 0 ? "gain" : "loss"}`, x: `${(s / b).toFixed(2)}× · ${$0(q * (s - b))} on ${cx(q)} coins`, back: g < 0 ? `Needs ${sgn(b / s - 1)} to get back to even` : `Can fall ${pc(1 - b / s)} before you're at a loss` };
};

// ---- Forex ----
export const bigMac: Calc = (v) => {
  const lp = need(p(v, "lp", 600), "Enter local Big Mac price."), up = need(p(v, "up", 5.8), "Enter US price."), fx = need(p(v, "fx", 150), "Enter the market exchange rate.");
  const imp = lp / up, val = imp / fx - 1;
  return { imp: `Implied rate: ${nfmt(imp, 2)} local per USD`, val: `Local currency is ${Math.abs(val * 100).toFixed(1)}% ${val < 0 ? "undervalued" : "overvalued"} vs the dollar`, usd: `Local Big Mac costs ${$(lp / fx)} at market rates` };
};
export const fxCorr: Calc = (v) => {
  const a = need(p(v, "a", 1), "Enter lots on pair 1."), b = p(v, "b", 1), r = Math.max(-1, Math.min(1, num(v.r, 0.85))), same = pick(v.d, 2) === 0;
  const s = same ? 1 : -1, net = Math.sqrt(Math.max(0, a * a + b * b + 2 * s * r * a * b));
  return { net: `Effective exposure ≈ ${net.toFixed(2)} lots of risk`, vs: `vs ${(a + b).toFixed(2)} lots if the two pairs moved in perfect lockstep`, read: (same && r > 0.7) || (!same && r < -0.7) ? "Positions largely double up the same bet" : (!same && r > 0.7) || (same && r < -0.7) ? "Positions largely hedge each other" : "Positions are fairly independent" };
};
const SES: [string, number, number, number][] = [["Sydney", 22, 7, 1], ["Tokyo", 0, 9, 0], ["London", 8, 17, -1], ["New York", 13, 22, -1]];
export const fxSessions: Calc = (v) => {
  const off = num(v.o, 0), summer = pick(v.s, 2) === 1;
  const hh = (x: number) => { const t = (((x + off) % 24) + 24) % 24, h = Math.floor(t), m = Math.round((t - h) * 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };
  const s = SES.map(([n, o, c, d]) => ({ n, o: o + (summer ? d : 0), c: c + (summer ? d : 0) }));
  const lon = s[2], ny = s[3];
  return { list: s.map((x) => `${x.n} ${hh(x.o)}–${hh(x.c)}`).join(" · "), ov: `London–New York overlap ${hh(ny.o)}–${hh(lon.c)} (most liquid) · Tokyo–London ${hh(lon.o)}–${hh(s[1].c)}`, note: `Times shown for UTC${off >= 0 ? "+" : ""}${off}. The week opens with Sydney (Sunday evening New York time) and closes with New York on Friday` };
};

// ---- Economics ----
export const nominalReal: Calc = (v) => {
  const n = need(p(v, "n", 50000), "Enter the nominal amount."), c0 = need(p(v, "c0", 258.8), "Enter CPI for the original year."), c1 = need(p(v, "c1", 322), "Enter CPI for the comparison year.");
  return { real: `${$0(n * (c1 / c0))} in comparison-year dollars`, back: `${$0(n * (c0 / c1))} in original-year dollars`, inf: `Prices changed ${sgn(c1 / c0 - 1)} between the two years` };
};
export const lfpr: Calc = (v) => {
  const e = p(v, "e", 161), u = p(v, "u", 7), pop = need(p(v, "pop", 270), "Enter the working-age population.");
  if (e + u > pop) throw new InputError("Employed + unemployed can't exceed the population.");
  const lf = e + u;
  return { lfpr: `${pc(lf / pop)} labor force participation`, ur: `${pc(lf ? u / lf : 0)} unemployment rate`, epop: `${pc(e / pop)} employment-to-population · ${nfmt(pop - lf, 1)} not in labor force` };
};
export const atc: Calc = (v) => {
  const fc = p(v, "fc", 20000), vc = p(v, "vc", 30000), q = need(p(v, "q", 5000), "Enter quantity."), pr = p(v, "pr", 12);
  const a = (fc + vc) / q;
  return { atc: `${$(a)} average total cost per unit`, parts: `AFC ${$(fc / q)} + AVC ${$(vc / q)}`, margin: pr > 0 ? `At ${$(pr)} price: ${$(pr - a)} profit per unit (${$0((pr - a) * q)} total)` : "Enter a price to see profit" };
};
export const mpc: Calc = (v) => {
  const dc = num(v.dc, 800), dy = num(v.dy, 1000);
  if (!dy) throw new InputError("Enter the change in income.");
  const m = dc / dy;
  if (m >= 1) return { mpc: `MPC ${m.toFixed(3)} · MPS ${(1 - m).toFixed(3)}`, mult: "MPC ≥ 1 — the simple multiplier is undefined", note: "Check the inputs" };
  return { mpc: `MPC ${m.toFixed(3)} · MPS ${(1 - m).toFixed(3)}`, mult: `Spending multiplier 1 ÷ (1 − MPC) = ${(1 / (1 - m)).toFixed(2)}`, note: `Tax multiplier −MPC ÷ (1 − MPC) = ${(-m / (1 - m)).toFixed(2)}` };
};
export const fiscalMult: Calc = (v) => {
  const m = Math.min(0.99, p(v, "m", 0.8)), t = p(v, "t", 25) / 100, im = p(v, "im", 15) / 100, g = num(v.g, 100);
  const k = 1 / (1 - m * (1 - t) + im), kt = -m / (1 - m * (1 - t) + im);
  return { k: `Spending multiplier ${k.toFixed(2)} → ${g >= 0 ? "+" : "−"}${$0(Math.abs(g * k))}B GDP`, tax: `Tax-cut multiplier ${Math.abs(kt).toFixed(2)} → ${$0(Math.abs(g * kt))}B GDP for the same-size tax cut`, simple: `Closed economy, no tax: ${(1 / (1 - m)).toFixed(2)}` };
};
export const tot: Calc = (v) => {
  const x = need(p(v, "x", 112), "Enter export price index."), m = need(p(v, "m", 104), "Enter import price index."), x0 = p(v, "x0", 0), m0 = p(v, "m0", 0);
  const t = (x / m) * 100;
  return { tot: `Terms of trade ${t.toFixed(1)}`, read: t > 100 ? "Exports buy more imports than in the base year (favourable)" : t < 100 ? "Exports buy fewer imports than in the base year (unfavourable)" : "Unchanged from the base year", chg: x0 > 0 && m0 > 0 ? `Change vs earlier period: ${sgn(t / ((x0 / m0) * 100) - 1)}` : "Add earlier indices to see the change" };
};
export const bot: Calc = (v) => {
  const x = p(v, "x", 3100), m = p(v, "m", 3900), g = p(v, "g", 29000);
  const b = x - m;
  return { bal: `${b >= 0 ? "Surplus" : "Deficit"} of ${$0(Math.abs(b))}B`, gdp: g > 0 ? `${pc(Math.abs(b) / g, 2)} of GDP` : "Enter GDP for the share", cov: `Exports cover ${pc(m ? x / m : 0, 0)} of imports` };
};
export const incidence: Calc = (v) => {
  const t = need(p(v, "t", 1), "Enter the tax per unit."), es = need(p(v, "es", 1.5), "Enter supply elasticity."), ed = need(Math.abs(num(v.ed, 0.5)), "Enter demand elasticity.");
  const bs = es / (es + ed);
  return { buy: `Buyers pay ${pc(bs, 0)} (${$(t * bs)} per unit)`, sell: `Sellers bear ${pc(1 - bs, 0)} (${$(t * (1 - bs))} per unit)`, rule: "The more inelastic side bears more of the tax" };
};
export const equil: Calc = (v) => {
  const a = p(v, "a", 100), b = need(p(v, "b", 2), "Enter the demand slope."), c = num(v.c, 10), d = need(p(v, "d", 1), "Enter the supply slope.");
  const P = (a - c) / (b + d), Q = a - b * P;
  if (P < 0 || Q < 0) throw new InputError("These curves don't meet at a positive price and quantity.");
  const cs = 0.5 * Q * (a / b - P), ps = c >= 0 ? (P * (Q + c)) / 2 : 0.5 * Q * (P + c / d);
  return { p: `Equilibrium price ${$(P)}`, q: `Equilibrium quantity ${nfmt(Q, 2)}`, surplus: `Consumer surplus ${$(cs)} · producer surplus ${$(ps)}` };
};
export const cr: Calc = (v) => {
  const s = Array.from({ length: 8 }, (_, i) => p(v, `s${i + 1}`, [28, 22, 15, 10, 6, 4, 3, 2][i])).sort((x, y) => y - x);
  const tot = s.reduce((a, b) => a + b, 0);
  if (tot > 100.0001) throw new InputError("Shares add up to more than 100%.");
  const c4 = s.slice(0, 4).reduce((a, b) => a + b, 0), c8 = tot;
  return { cr4: `CR4 = ${c4.toFixed(1)}%`, cr8: `CR8 = ${c8.toFixed(1)}%`, read: c4 >= 80 ? "Highly concentrated (near monopoly/tight oligopoly)" : c4 >= 50 ? "Concentrated — oligopoly" : c4 >= 40 ? "Moderately concentrated" : "Competitive / low concentration" };
};
export const realWage: Calc = (v) => {
  const w0 = need(p(v, "w0", 50000), "Enter the earlier wage."), w1 = need(p(v, "w1", 56000), "Enter the current wage."), c0 = need(p(v, "c0", 300), "Enter the earlier CPI."), c1 = need(p(v, "c1", 322), "Enter the current CPI.");
  const real = w1 * (c0 / c1), g = real / w0 - 1;
  return { real: `${$0(real)} in earlier-year dollars`, chg: `Real pay ${sgn(g)} (nominal ${sgn(w1 / w0 - 1)}, prices ${sgn(c1 / c0 - 1)})`, keep: `You'd need ${$0(w0 * (c1 / c0))} to keep the same buying power` };
};
export const misery: Calc = (v) => {
  const u = p(v, "u", 4.2), i = num(v.i, 2.9), r = num(v.r, 4.5), g = num(v.g, 2), gt = num(v.gt, 2);
  const m = u + i, barro = Number.isFinite(r) && Number.isFinite(g) ? m + r - (g - gt) : NaN;
  return { m: `Misery index ${m.toFixed(1)}`, parts: `Unemployment ${u}% + inflation ${i}%`, barro: Number.isFinite(barro) ? `Barro misery index ${barro.toFixed(1)} (adds interest rate, subtracts GDP growth above trend)` : "Add interest rate and GDP growth for the Barro version" };
};

// ---- registry (generated)
export const ideaFin4CustomCalculators: Record<string, Calc> = {
  "ethereum-staking-rewards-calculator": ethStake,
  "solana-staking-rewards-calculator": solStake,
  "cardano-staking-rewards-calculator": adaStake,
  "mining-rig-power-cost-calculator": rigPower,
  "mining-difficulty-earnings-calculator": difficultyEarn,
  "crypto-average-cost-dca-calculator": dcaCost,
  "crypto-leverage-liquidation-price-calculator": levLiq,
  "bitcoin-price-prediction-target-calculator": priceTarget,
  "crypto-breakeven-price-after-fees-calculator": feeBreakeven,
  "what-if-i-bought-bitcoin-calculator": whatIf,
  "satoshi-to-usd-calculator": satUsd,
  "gwei-to-eth-calculator": gweiEth,
  "crypto-percentage-gain-calculator": pctGain,
  "big-mac-index-exchange-rate-calculator": bigMac,
  "forex-correlation-calculator": fxCorr,
  "forex-trading-session-times-calculator": fxSessions,
  "nominal-to-real-value-calculator": nominalReal,
  "labor-force-participation-rate-calculator": lfpr,
  "average-total-cost-calculator": atc,
  "marginal-propensity-to-consume-calculator": mpc,
  "fiscal-multiplier-calculator": fiscalMult,
  "terms-of-trade-calculator": tot,
  "balance-of-trade-calculator": bot,
  "tax-incidence-calculator": incidence,
  "market-equilibrium-price-calculator": equil,
  "concentration-ratio-calculator": cr,
  "real-wage-calculator": realWage,
  "misery-index-calculator": misery,
};
