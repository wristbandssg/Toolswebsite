/**
 * Idea build, batch fun2 (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md):
 * Arts & Entertainment > Tarot, Astrology & Fun — video game calculators (27 tools).
 * Pokémon damage: Gen V+ formula ((2L/5+2)·P·A/D/50+2)·modifiers, random 0.85–1.00.
 * Pokémon IV from stat: stat = ⌊(2B+IV+⌊EV/4⌋)·L/100⌋+5 × nature. Pokémon GO CP =
 * ⌊(A·√D·√S·CPM²)/10⌋. Elden Ring rune cost per level: x = ((L+81)−92)·0.02, cost = ⌊(x+0.1)·(L+81)²+1⌋.
 * Minecraft XP: level→points (piecewise, Java). Gacha with hard/soft pity simulated analytically.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt } from "./trv-core";

const $ = (x: number, dp = 2) => money(x, "$", dp);
const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };

export const TYPE_EFF = ["0× (immune)", "¼×", "½×", "1× (neutral)", "2× super effective", "4× double super effective"];
const EFF = [0, 0.25, 0.5, 1, 2, 4];
export const pokemonDamage: Calc = (v) => {
  const L = need(p(v, "lvl", 50), "Enter level."), P = need(p(v, "pow", 90), "Enter move power."), A = need(p(v, "atk", 120), "Enter attack stat."), D = need(p(v, "def", 100), "Enter defense stat."), stab = pick(v.stab, 2) ? 1.5 : 1, eff = EFF[pick(v.eff, 6)], crit = pick(v.crit, 2) ? 1.5 : 1, hp = p(v, "hp", 150);
  const base = Math.floor(Math.floor(Math.floor((2 * L) / 5 + 2) * P * A / D) / 50) + 2, mod = stab * eff * crit;
  const lo = Math.floor(base * 0.85 * mod), hi = Math.floor(base * mod);
  return { range: `${lo}–${hi} damage`, pct: hp ? `${((100 * lo) / hp).toFixed(1)}–${((100 * hi) / hp).toFixed(1)}% of ${hp} HP` : "—", ko: hp ? (lo >= hp ? "Guaranteed one-hit KO" : hi >= hp ? "Possible one-hit KO" : `${Math.ceil(hp / hi)}–${Math.ceil(hp / Math.max(lo, 1))} hits to KO`) : "—" };
};
export const YESNO = ["No", "Yes"];
export const NATURE = ["Neutral", "Boosting (+10%)", "Hindering (−10%)"];
export const pokemonIV: Calc = (v) => {
  const B = need(p(v, "base", 100), "Enter base stat."), L = need(p(v, "lvl", 50), "Enter level."), S = need(p(v, "stat", 120), "Enter the stat shown."), EV = p(v, "ev", 0), nat = [1, 1.1, 0.9][pick(v.nat, 3)];
  const ivs: number[] = [];
  for (let iv = 0; iv <= 31; iv++) if (Math.floor((Math.floor(((2 * B + iv + Math.floor(EV / 4)) * L) / 100) + 5) * nat) === S) ivs.push(iv);
  return { iv: ivs.length ? (ivs.length === 1 ? `IV ${ivs[0]}` : `IV ${ivs[0]}–${ivs[ivs.length - 1]}`) : "No IV matches — check level, EVs or nature", grade: ivs.length ? (ivs[0] === 31 ? "Perfect (31)" : ivs[0] >= 26 ? "Excellent" : ivs[0] >= 16 ? "Good" : "Low") : "—", note: "Non-HP stat formula (Gen III+)" };
};
export const genshinDamage: Calc = (v) => {
  const atk = need(p(v, "atk", 2000), "Enter ATK."), mv = p(v, "mv", 180) / 100, dmg = p(v, "dmg", 46.6) / 100, cr = Math.min(1, p(v, "cr", 60) / 100), cd = p(v, "cd", 120) / 100, lvl = p(v, "lvl", 90), elvl = p(v, "elvl", 90), res = p(v, "res", 10) / 100;
  const defMult = (lvl + 100) / (lvl + 100 + elvl + 100), resMult = 1 - res, nonCrit = atk * mv * (1 + dmg) * defMult * resMult;
  return { avg: `${nfmt(nonCrit * (1 + cr * cd))} average damage`, crit: `${nfmt(nonCrit * (1 + cd))} on crit · ${nfmt(nonCrit)} non-crit`, ratio: `Crit value ${((cr * 2 + cd) * 100).toFixed(0)} · ideal CR:CD ratio is 1:2` };
};
export const gachaPity: Calc = (v) => {
  const base = Math.min(1, p(v, "rate", 0.6) / 100), soft = Math.round(p(v, "soft", 74)), hard = Math.max(soft, Math.round(p(v, "hard", 90))), inc = p(v, "inc", 6) / 100, pulls = Math.round(p(v, "pulls", 50)), cost = p(v, "cost", 160);
  let surv = 1, cum = 0, exp = 0;
  const pr = (k: number) => (k >= hard ? 1 : k >= soft ? Math.min(1, base + (k - soft + 1) * inc) : base);
  for (let k = 1; k <= hard; k++) { const h = surv * pr(k); exp += k * h; if (k <= pulls) cum += h; surv *= 1 - pr(k); }
  return { chance: `${(cum * 100).toFixed(1)}% chance of a 5★ within ${pulls} pulls`, avg: `${exp.toFixed(1)} pulls on average (${nfmt(exp * cost)} premium currency)`, worst: `${hard} pulls guaranteed (${nfmt(hard * cost)})` };
};
export const gachaProb: Calc = (v) => {
  const r = Math.min(1, p(v, "rate", 1) / 100), n = Math.round(p(v, "n", 100)), want = Math.max(1, Math.round(p(v, "want", 1)));
  let pAtLeast = 0, term = Math.pow(1 - r, n);
  let cdf = 0;
  for (let k = 0; k < want; k++) { cdf += term; term = term * ((n - k) / (k + 1)) * (r / (1 - r)); }
  pAtLeast = 1 - cdf;
  return { chance: `${(pAtLeast * 100).toFixed(2)}% to get at least ${want}`, pulls50: `${Math.ceil(Math.log(0.5) / Math.log(1 - r))} pulls for a 50% chance of one`, pulls90: `${Math.ceil(Math.log(0.1) / Math.log(1 - r))} pulls for 90%` };
};
export const perfRating: Calc = (v) => {
  const avg = need(p(v, "avg", 1600), "Enter average opponent rating."), g = need(Math.round(p(v, "games", 7)), "Enter games played."), score = Math.min(g, p(v, "score", 5));
  const pct = score / g;
  const dp = pct >= 1 ? 800 : pct <= 0 ? -800 : -400 * Math.log10(1 / pct - 1);
  return { perf: `${Math.round(avg + dp)} performance rating`, linear: `${Math.round(avg + 400 * (score - (g - score)) / g)} (linear method)`, pct: `${(pct * 100).toFixed(1)}% score` };
};
export const VAL_RANKS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal"];
export const valorantProgress: Calc = (v) => {
  const rr = Math.min(99, p(v, "rr", 40)), win = p(v, "win", 20), loss = p(v, "loss", 15), wr = Math.min(100, p(v, "wr", 52)) / 100, cur = pick(v.rank, VAL_RANKS.length), tier = pick(v.tier, 3), target = pick(v.target, VAL_RANKS.length);
  const curPts = cur * 300 + tier * 100 + rr, tgtPts = target * 300, net = wr * win - (1 - wr) * loss;
  if (tgtPts <= curPts) throw new InputError("Pick a target rank above your current rank.");
  return { games: net > 0 ? `${Math.ceil((tgtPts - curPts) / net)} games` : "Not climbing at this win rate", net: `${net.toFixed(1)} RR per game on average`, need: `${tgtPts - curPts} RR to ${VAL_RANKS[target]} 1` };
};
export const TIER3 = ["1", "2", "3"];
export const lolWinRate: Calc = (v) => {
  const w = p(v, "w", 55), l = p(v, "l", 45), target = Math.min(99.9, p(v, "target", 60)) / 100, g = w + l;
  if (!(g > 0)) throw new InputError("Enter wins and losses.");
  const need = target * g > w ? Math.ceil((target * g - w) / (1 - target)) : 0;
  return { wr: `${((100 * w) / g).toFixed(2)}% win rate`, need: need ? `${need} straight wins to reach ${(target * 100).toFixed(1)}%` : "Already at or above target", games: `${g} games played` };
};
export const vbucks: Calc = (v) => {
  const vb = p(v, "vb", 1000), pack = pick(v.pack, 4);
  const PACKS: [number, number][] = [[1000, 8.99], [2800, 22.99], [5000, 36.99], [13500, 89.99]], [n, price] = PACKS[pack];
  const perVb = price / n;
  return { value: $(vb * perVb), rate: `${$(perVb * 100, 3)} per 100 V-Bucks with the ${nfmt(n)} pack`, best: `Best rate: 13,500 pack at ${$((89.99 / 13500) * 100, 3)} per 100` };
};
export const VB_PACK = ["1,000 for $8.99", "2,800 for $22.99", "5,000 for $36.99", "13,500 for $89.99"];
export const robuxUsd: Calc = (v) => {
  const r = p(v, "robux", 10000), mode = pick(v.mode, 2);
  return mode === 0 ? { value: $(r * 0.0125) + " to buy (≈ $0.0125 each)", devex: $(r * 0.0035) + " if cashed out via DevEx ($0.0035 each)", per: `$1 ≈ ${Math.round(1 / 0.0125)} Robux bought` } : { value: $(r * 0.0035) + " DevEx payout", devex: r < 30000 ? "DevEx needs at least 30,000 earned Robux" : "Meets the 30,000 Robux DevEx minimum", per: `${nfmt(r / 0.0035 / 1000)}k Robux per $1,000` };
};
export const RB_MODE = ["Buying value", "DevEx cash-out"];
export const steamValue: Calc = (v) => {
  const games = p(v, "games", 150), avg = p(v, "avg", 15), disc = p(v, "disc", 60) / 100, played = Math.min(100, p(v, "played", 40)) / 100, hours = p(v, "hours", 1200);
  const full = games * avg, paid = full * (1 - disc);
  return { full: $(full, 0) + " at full price", paid: $(paid, 0) + " estimated actually paid", unplayed: `${Math.round(games * (1 - played))} unplayed games (${$(full * (1 - played), 0)})`, perHour: $(paid / Math.max(hours, 1)) + " per hour played" };
};
export const completionTime: Calc = (v) => {
  const hrs = need(p(v, "hrs", 60), "Enter game length."), per = need(p(v, "per", 1.5), "Enter hours per session."), spw = need(p(v, "spw", 4), "Enter sessions per week."), done = Math.min(100, p(v, "done", 0)) / 100;
  const left = hrs * (1 - done), weeks = left / (per * spw);
  return { weeks: `${weeks.toFixed(1)} weeks`, days: `${Math.ceil(left / per)} sessions`, left: `${left.toFixed(1)} hours left` };
};
export const edpi: Calc = (v) => {
  const dpi = need(p(v, "dpi", 800), "Enter DPI."), sens = need(p(v, "sens", 0.4), "Enter in-game sensitivity."), yaw = pick(v.game, 4);
  const Y = [0.07, 0.022, 0.0066, 0.005555][yaw], cm360 = (360 / (Y * sens * dpi)) * 2.54;
  return { edpi: `${(dpi * sens).toFixed(1)} eDPI`, cm: `${cm360.toFixed(1)} cm per 360°`, feel: cm360 > 40 ? "Low sensitivity (arm aiming)" : cm360 > 25 ? "Medium" : "High sensitivity (wrist aiming)" };
};
export const GAMES = ["Valorant", "CS2 / Apex / Source", "Fortnite", "Overwatch 2"];
export const sensConvert: Calc = (v) => {
  const from = pick(v.from, 4), to = pick(v.to, 4), sens = need(p(v, "sens", 0.4), "Enter sensitivity.");
  const Y = [0.07, 0.022, 0.0066, 0.005555], out = (sens * Y[from]) / Y[to];
  return { sens: `${out.toFixed(3)} in ${GAMES[to]}`, same: `Same 360° distance as ${sens} in ${GAMES[from]}`, note: "Matches hip-fire turn speed (yaw); scoped sensitivity is separate" };
};
export const frameTime: Calc = (v) => {
  const fps = need(p(v, "fps", 144), "Enter frames per second."), hz = p(v, "hz", 144);
  return { ms: `${(1000 / fps).toFixed(2)} ms per frame`, hz: hz ? `${(1000 / hz).toFixed(2)} ms per refresh at ${hz} Hz` : "—", note: fps < hz ? "Below refresh rate — use VRR (G-Sync/FreeSync) to avoid stutter" : "At or above refresh rate" };
};
export const SEASON = ["Spring", "Summer", "Fall"];
export const stardewCrop: Calc = (v) => {
  const seed = p(v, "seed", 80), price = p(v, "price", 250), grow = need(Math.round(p(v, "grow", 13)), "Enter days to grow."), regrow = Math.round(p(v, "regrow", 0)), days = Math.round(p(v, "days", 28)), plants = p(v, "plants", 100), qual = 1 + p(v, "qual", 10) / 100;
  let harvests = 0;
  if (regrow > 0) harvests = days >= grow ? 1 + Math.floor((days - 1 - grow) / regrow) : 0; else harvests = Math.floor((days - 1) / grow);
  const profit = (harvests * price * qual - (regrow > 0 ? seed : seed * harvests)) * plants;
  return { profit: `${nfmt(profit)}g per season`, harvests: `${harvests} harvests in ${days} days`, perDay: `${(profit / plants / days).toFixed(1)}g per plant per day` };
};
export const turnipProfit: Calc = (v) => {
  const buy = need(p(v, "buy", 100), "Enter Sunday buy price."), qty = p(v, "qty", 4000), sell = p(v, "sell", 450);
  return { profit: `${nfmt((sell - buy) * qty)} Bells`, per: `${sell - buy} Bells per turnip`, be: `Break even at ${buy}; ${(sell / buy).toFixed(2)}× your buy price` };
};
export const escapeRoom: Calc = (v) => {
  const limit = need(p(v, "limit", 60), "Enter time limit."), used = p(v, "used", 48), hints = p(v, "hints", 2), pen = p(v, "pen", 2);
  const adj = used + hints * pen;
  return { time: `${adj.toFixed(1)} min adjusted time`, left: adj <= limit ? `Escaped with ${(limit - adj).toFixed(1)} min to spare` : "Didn't escape in time", score: `${Math.max(0, Math.round(1000 * (1 - adj / (limit * 1.5))))} points` };
};
export const wordleAvg: Calc = (v) => {
  const d = [1, 2, 3, 4, 5, 6].map((i) => p(v, `g${i}`, [1, 12, 40, 45, 20, 6][i - 1])), fail = p(v, "fail", 2), wins = d.reduce((a, b) => a + b, 0), played = wins + fail;
  if (!(played > 0)) throw new InputError("Enter your guess distribution.");
  const avg = d.reduce((a, b, i) => a + b * (i + 1), 0) / Math.max(wins, 1);
  return { avg: `${avg.toFixed(2)} guesses per win`, win: `${((100 * wins) / played).toFixed(1)}% win rate`, withFail: `${((d.reduce((a, b, i) => a + b * (i + 1), 0) + fail * 7) / played).toFixed(2)} counting losses as 7` };
};
export const rubikAvg: Calc = (v) => {
  const t = [1, 2, 3, 4, 5].map((i) => num(v[`t${i}`], [12.4, 11.8, 13.1, 10.9, 12.0][i - 1]));
  if (t.some((x) => !(x > 0))) throw new InputError("Enter five solve times in seconds.");
  const s = [...t].sort((a, b) => a - b), ao5 = (s[1] + s[2] + s[3]) / 3;
  return { ao5: `${ao5.toFixed(2)} s average of 5`, best: `${s[0].toFixed(2)} s best single`, mean: `${(t.reduce((a, b) => a + b, 0) / 5).toFixed(2)} s mean (no trimming)` };
};
export const minecraftPortal: Calc = (v) => {
  const mode = pick(v.mode, 2), x = num(v.x, 800), y = num(v.y, 64), z = num(v.z, -240);
  return mode === 0 ? { pos: `Nether: X ${Math.floor(x / 8)}, Y ${Math.round(y)}, Z ${Math.floor(z / 8)}`, note: "Divide X and Z by 8; Y stays the same", tip: "Build the Nether portal within 16 blocks of this to link" } : { pos: `Overworld: X ${Math.round(x * 8)}, Y ${Math.round(y)}, Z ${Math.round(z * 8)}`, note: "Multiply X and Z by 8", tip: "Overworld portals link within 128 blocks" };
};
export const MC_MODE = ["Overworld → Nether", "Nether → Overworld"];
const mcPts = (L: number) => (L <= 16 ? L * L + 6 * L : L <= 31 ? 2.5 * L * L - 40.5 * L + 360 : 4.5 * L * L - 162.5 * L + 2220);
export const minecraftXp: Calc = (v) => {
  const from = Math.round(p(v, "from", 0)), to = Math.round(p(v, "to", 30));
  if (to <= from) throw new InputError("Target level must be above the current level.");
  return { pts: `${nfmt(mcPts(to) - mcPts(from))} XP points from level ${from} to ${to}`, ench: `A level-30 enchant costs 3 levels; at ${to} that's ${nfmt(mcPts(to) - mcPts(to - 3))} points`, total: `${nfmt(mcPts(to))} points total at level ${to}` };
};
export const devex: Calc = (v) => {
  const visits = p(v, "visits", 500000), conv = p(v, "conv", 1.5) / 100, spend = p(v, "spend", 200), premium = p(v, "prem", 300);
  const robux = visits * conv * spend * 0.7 + premium * 10;
  return { cash: $(robux * 0.0035) + " via DevEx", robux: `${nfmt(robux)} Robux earned (70% of item sales)`, note: robux < 30000 ? "Below the 30,000 Robux DevEx minimum" : "Eligible for DevEx (age 13+, verified)" };
};
export const pogoCp: Calc = (v) => {
  const A = p(v, "ba", 198), D = p(v, "bd", 189), S = p(v, "bs", 190), ia = Math.min(15, p(v, "ia", 15)), id = Math.min(15, p(v, "id", 15)), is = Math.min(15, p(v, "is", 15)), lvl = Math.min(51, Math.max(1, p(v, "lvl", 40)));
  const cpm = lvl <= 40 ? 0.0943 + (0.7903 - 0.0943) * Math.pow((lvl - 1) / 39, 0.71) : 0.7903 + (lvl - 40) * 0.005;
  const cp = Math.max(10, Math.floor(((A + ia) * Math.sqrt(D + id) * Math.sqrt(S + is) * cpm * cpm) / 10));
  return { cp: `${nfmt(cp)} CP`, iv: `${(((ia + id + is) / 45) * 100).toFixed(0)}% IV`, hp: `${Math.max(10, Math.floor((S + is) * cpm))} HP` };
};
export const SHINY = ["Wild full odds (1/4096)", "Masuda method (1/683)", "Shiny Charm (1/1365)", "Masuda + Charm (1/512)", "Pokémon GO wild (1/500)", "Pokémon GO Community Day (1/25)"];
const SHR = [4096, 683, 1365, 512, 500, 25];
export const shinyOdds: Calc = (v) => {
  const o = SHR[pick(v.method, SHR.length)], n = Math.round(p(v, "n", 1000)), pr = 1 - Math.pow(1 - 1 / o, n);
  return { chance: `${(pr * 100).toFixed(1)}% chance in ${nfmt(n)} encounters`, odds: `1 in ${o} per encounter`, half: `${nfmt(Math.ceil(Math.log(0.5) / Math.log(1 - 1 / o)))} encounters for 50%` };
};
const erCost = (L: number) => { const x = Math.max(0, ((L + 81) - 92) * 0.02); return Math.floor((x + 0.1) * (L + 81) ** 2 + 1); };
export const eldenRunes: Calc = (v) => {
  const from = Math.max(1, Math.round(p(v, "from", 50))), to = Math.min(713, Math.round(p(v, "to", 100)));
  if (to <= from) throw new InputError("Target level must be higher.");
  let s = 0; for (let L = from + 1; L <= to; L++) s += erCost(L);
  return { runes: `${nfmt(s)} runes from level ${from} to ${to}`, next: `${nfmt(erCost(from + 1))} runes for the next level`, avg: `${nfmt(s / (to - from))} runes per level on average` };
};
export const wowGold: Calc = (v) => {
  const gold = p(v, "gold", 25000), mins = need(p(v, "mins", 90), "Enter minutes farmed."), token = p(v, "token", 250000), tokenUsd = p(v, "tusd", 20);
  const gph = (gold / mins) * 60;
  return { gph: `${nfmt(gph)} gold per hour`, token: `${(token / gph).toFixed(1)} hours of farming per WoW Token`, usd: `${$((gph / token) * tokenUsd)} per hour in token value` };
};
export const speedrunDiff: Calc = (v) => {
  const toS = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
  const a = toS(p(v, "ah", 0), p(v, "am", 45), p(v, "as", 12.3)), b = toS(p(v, "bh", 0), p(v, "bm", 44), p(v, "bs", 58.9)), d = a - b;
  return { diff: `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(3)} s`, pct: `${((100 * d) / b).toFixed(2)}% ${d >= 0 ? "slower" : "faster"} than the record`, note: d <= 0 ? "New record!" : `${(Math.abs(d) / 60).toFixed(2)} min behind` };
};

// ---- registry (generated)
export const ideaFun2CustomCalculators: Record<string, Calc> = {
  "pokemon-damage-calculator": pokemonDamage,
  "pokemon-iv-calculator": pokemonIV,
  "genshin-impact-damage-calculator": genshinDamage,
  "genshin-wish-pity-calculator": gachaPity,
  "gacha-pull-probability-calculator": gachaProb,
  "chess-rating-performance-calculator": perfRating,
  "valorant-rank-progress-calculator": valorantProgress,
  "league-of-legends-win-rate-calculator": lolWinRate,
  "fortnite-v-bucks-value-calculator": vbucks,
  "roblox-robux-to-usd-calculator": robuxUsd,
  "steam-library-value-calculator": steamValue,
  "game-completion-time-calculator": completionTime,
  "mouse-dpi-edpi-sensitivity-calculator": edpi,
  "game-sensitivity-converter-calculator": sensConvert,
  "fps-frame-time-calculator": frameTime,
  "stardew-valley-crop-profit-calculator": stardewCrop,
  "animal-crossing-turnip-price-calculator": turnipProfit,
  "escape-room-time-score-calculator": escapeRoom,
  "wordle-average-score-calculator": wordleAvg,
  "rubiks-cube-average-time-calculator": rubikAvg,
  "minecraft-nether-portal-coordinates-calculator": minecraftPortal,
  "minecraft-enchanting-cost-calculator": minecraftXp,
  "roblox-game-earnings-devex-calculator": devex,
  "pokemon-go-cp-calculator": pogoCp,
  "pokemon-shiny-odds-calculator": shinyOdds,
  "elden-ring-rune-level-calculator": eldenRunes,
  "world-of-warcraft-gold-per-hour-calculator": wowGold,
  "speedrun-time-difference-calculator": speedrunDiff,
};
