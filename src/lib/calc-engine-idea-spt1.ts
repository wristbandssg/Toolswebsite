/**
 * Idea build, batch spt1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Sports > Baseball (4), Cycling (5), Fantasy (4),
 * Golf (6), Hiking (9), Motorsports (2) = 30 tools.
 * Rules: Little League Regular Season pitch counts (max 50/75/85/95/105 by age 7–8 … 17–18; rest days 1–20 → 0, 21–35 → 1, 36–50 → 2,
 * 51–65 → 3, 66+ → 4 for ages 14 and under; 15–18: 1–30/31–45/46–60/61–75/76+); Bill James Pythagorean expectation (exponent 1.83);
 * USGA Slope Rating = 5.381 × (bogey rating − course rating) for men, 4.24 for women; stimpmeter slope correction 2·S↑·S↓/(S↑ + S↓);
 * SAE J1349 dyno correction CF = 1.18 × (990/Pd) × √((T + 273)/298) − 0.18; cycling power model P = (Crr·m·g·cosθ + m·g·sinθ + ½ρCdA·v²)·v ÷
 * drivetrain efficiency; gross metabolic efficiency ~24% (1 kJ of work ≈ 1 kcal burned); rope fall factor = fall ÷ rope out; Wilderness
 * Medical Society guidance (above 3,000 m, raise sleeping altitude ≤ 500 m/day with a rest day every 3–4 days). Scoring settings are
 * editable for league formats.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";
import { fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const hm = (h: number) => { const t = Math.round(h * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, "0")} min`; };
const clock = (mins: number) => { const m = ((Math.round(mins) % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`; };

// ---- Baseball & softball ----
export const iso: Calc = (v) => {
  const ab = P(v, "a", 500, "At-bats"), h = Z(v, "h", 140), d = Z(v, "d", 30), t = Z(v, "t", 3), hr = Z(v, "r", 25), s = h - d - t - hr;
  if (s < 0) throw new InputError("Doubles, triples and home runs can't exceed hits.");
  const avg = h / ab, slg = (s + 2 * d + 3 * t + 4 * hr) / ab, iso0 = slg - avg;
  return { i: `ISO = ${iso0.toFixed(3)}`, d: `SLG ${slg.toFixed(3)} − AVG ${avg.toFixed(3)} · ${f(d + t + hr)} extra-base hits`, note: iso0 >= 0.25 ? "Elite raw power (.250+)" : iso0 >= 0.2 ? "Great power (.200+)" : iso0 >= 0.14 ? "Average to above-average power" : "Below-average power (MLB average is about .150–.170)" };
};
export const pythag: Calc = (v) => {
  const rs = P(v, "s", 750, "Runs scored"), ra = P(v, "a", 680, "Runs allowed"), g = Math.max(1, num(v.g, 162)), w = Z(v, "w", 0), e = P(v, "x", 1.83, "Exponent");
  const pct = rs ** e / (rs ** e + ra ** e), xw = pct * g;
  return { p: `Expected win % ${pct.toFixed(3)} → ${f(Math.round(xw))}–${f(Math.round(g - xw))}`, d: w ? `Actual ${f(w)} wins — ${w > xw ? `${f(w - xw)} wins luckier` : `${f(xw - w)} wins unluckier`} than expected` : `Run differential ${rs - ra >= 0 ? "+" : ""}${f(rs - ra)}`, note: `Exponent ${f(e)} (Bill James used 2; 1.83 fits MLB best) · about 10 runs of differential ≈ 1 win · use exponent ~2.37 for the NBA-style 'Pythagorean' with points` };
};
export const pitchCount: Calc = (v) => {
  const age = Math.round(num(v.a, 12)), n = Z(v, "n", 60);
  if (age < 7 || age > 22) throw new InputError("Little League limits cover ages 7–22.");
  const max = age <= 8 ? 50 : age <= 10 ? 75 : age <= 12 ? 85 : age <= 16 ? 95 : age <= 18 ? 105 : 120, young = age <= 14;
  const rest = young ? (n >= 66 ? 4 : n >= 51 ? 3 : n >= 36 ? 2 : n >= 21 ? 1 : 0) : n >= 76 ? 4 : n >= 61 ? 3 : n >= 46 ? 2 : n >= 31 ? 1 : 0;
  return { m: `Daily limit ${max} pitches (age ${age})`, r: `${f(n)} pitches → ${rest} calendar day${rest === 1 ? "" : "s"} of rest${n > max ? " · over the daily limit" : ""}`, note: `Little League Regular Season rules · rest thresholds for ${young ? "ages 14 and under: 21, 36, 51, 66" : "ages 15–18: 31, 46, 61, 76"} pitches · a pitcher who reaches 41+ pitches can't catch the rest of that day` };
};
export const reaction: Calc = (v) => {
  const mph = P(v, "s", 90, "Pitch speed"), d = P(v, "d", 55, "Release to plate (ft)"), tr = Z(v, "r", 0.15), ref = Z(v, "x", 60.5);
  const t = d / (mph * 1.46667), eq = (mph * ref * 0.94) / d;
  return { t: `Ball reaches the plate in ${f(t * 1000)} ms`, d: `About ${f((t - tr - 0.15) * 1000)} ms to decide after ${f(tr * 1000)} ms to see it and ~150 ms to swing`, note: `${f(d)} ft from release · ${d < 50 ? `feels like ~${f(eq)} mph from a big-league mound` : "release is about 5–6 ft in front of the 60.5 ft rubber"} · softball pitchers release ~37 ft away, so 65 mph feels like ~95+ mph` };
};
// ---- Cycling ----
const speedFor = (Pw: number, m: number, grade: number, cda: number, crr: number, rho: number, eff: number) => { const th = Math.atan(grade), g = 9.80665; let lo = 0.1, hi = 30; for (let i = 0; i < 80; i++) { const vv = (lo + hi) / 2, need = ((crr * m * g * Math.cos(th) + m * g * Math.sin(th)) * vv + 0.5 * rho * cda * vv ** 3) / eff; if (need > Pw) hi = vv; else lo = vv; } return (lo + hi) / 2; };
export const climbTime: Calc = (v) => {
  const L = P(v, "l", 8, "Climb length (km)") * 1000, g = num(v.g, 6) / 100, W = P(v, "w", 250, "Power"), rider = P(v, "m", 75, "Rider weight"), bike = Z(v, "b", 8), cda = Z(v, "c", 0.35);
  const spd = speedFor(W, rider + bike, g, cda, 0.004, 1.2, 0.97), t = L / spd, gain = L * Math.sin(Math.atan(g));
  return { t: `Climb time ≈ ${hm(t / 3600)}`, s: `${f(spd * 3.6)} km/h average · VAM ${f((gain / t) * 3600)} m/h · ${f(gain)} m of climbing`, note: `${f(W)} W = ${f(W / rider)} W/kg for a ${f(rider + bike)} kg system · physics model (rolling Crr 0.004, CdA ${f(cda)}, no wind)` };
};
export const calPower: Calc = (v) => {
  const W = P(v, "w", 200, "Average power"), h = P(v, "h", 2, "Ride time (h)"), eff = Math.min(30, P(v, "e", 24, "Efficiency")) / 100;
  const kj = W * h * 3.6, kcal = kj / 4.184 / eff;
  return { c: `≈ ${f(Math.round(kcal))} kcal burned`, k: `${f(kj)} kJ of work at ${f(W)} W for ${hm(h)}`, note: `Human efficiency ~20–25% means kcal burned ≈ kJ of work (1 kJ × 4.184/${f(eff * 100)}% ≈ ${f(1 / 4.184 / eff)} kcal) · power-meter calories are far more accurate than heart-rate estimates` };
};
export const aero: Calc = (v) => {
  const sp = P(v, "s", 35, "Speed (km/h)") / 3.6, cda = P(v, "c", 0.32, "CdA"), rho = P(v, "r", 1.2, "Air density"), wind = num(v.w, 0) / 3.6, m = Z(v, "m", 83), crr = Z(v, "x", 0.004);
  const va = sp + wind, Fd = 0.5 * rho * cda * va * Math.abs(va), Pd = Fd * sp, Pr = crr * m * 9.80665 * sp, tot = (Pd + Pr) / 0.97;
  return { p: `${f(tot)} W needed on the flat`, d: `Aero drag ${f(Fd)} N → ${f(Pd)} W (${pc(Pd / (Pd + Pr), 0)}) · rolling ${f(Pr)} W`, note: `CdA ${f(cda)} m² (hoods ~0.32–0.40, drops ~0.30, TT position ~0.20–0.25) · drag power rises with the cube of speed — 10% faster needs ~33% more power${wind ? ` · ${f(wind * 3.6)} km/h headwind` : ""}` };
};
export const commute: Calc = (v) => {
  const d = P(v, "d", 10, "Distance (km)"), sp = P(v, "s", 20, "Average moving speed (km/h)"), stops = Z(v, "n", 8), per = Z(v, "x", 30), park = Z(v, "p", 5), e = pick(v.e, 2) === 1;
  const s = e ? Math.max(sp, 24) : sp, t = (d / s) * 60 + (stops * per) / 60 + park;
  return { t: `≈ ${f(Math.round(t))} minutes door to door`, d: `${f(d)} km at ${f(s)} km/h moving + ${f(stops)} stops × ${f(per)} s + ${f(park)} min to lock up/change`, note: `${e ? `E-bike (assist to ~25 km/h) · about ${f(d * 2 * 230 * 0.012)} kWh a year of charging` : "Regular bike"} · ride it once at a quiet time to calibrate` };
};
export const century: Calc = (v) => {
  const d = P(v, "d", 160, "Distance (km)"), sp = P(v, "s", 25, "Moving speed (km/h)"), st = Math.max(0, Math.round(num(v.n, 4))), sm = Z(v, "x", 15), start = num(v.t, 7) * 60, w = P(v, "w", 75, "Weight"), carb = Z(v, "c", 60);
  const ride = (d / sp) * 60, tot = ride + st * sm;
  return { f: `Finish ≈ ${clock(start + tot)} (${hm(tot / 60)} total, ${hm(ride / 60)} riding)`, n: `Fuel: ${f(Math.round((carb * ride) / 60))} g carbs (${f(carb)} g/h) · fluids ≈ ${f(Math.round((ride / 60) * 0.6 * 10) / 10)}–${f(Math.round((ride / 60) * 0.8 * 10) / 10)} L · ${f(st)} stops of ${f(sm)} min`, note: `${f(d)} km (100 miles = 161 km) · start ${clock(start)} · ride the first hour easy · ${f(w)} kg rider: aim for 60–90 g carbs per hour on long rides` };
};
// ---- Fantasy ----
const fScore = (rows: [string, string, number][], note: string): Calc => (v) => {
  let tot = 0; const parts: string[] = [];
  for (const [k, label, def] of rows) { const n = num(v[k], 0), pts = num(v[`${k}p`], def); if (n) { tot += n * pts; parts.push(`${label} ${f(n)} × ${f(pts)}`); } }
  return { p: `${f(Math.round(tot * 100) / 100)} fantasy points`, d: parts.join(" · ") || "Enter a stat line", note };
};
export const hockeyPts = fScore([["g", "goals", 3], ["a", "assists", 2], ["s", "shots", 0.5], ["b", "blocks", 0.5], ["h", "hits", 0.25], ["p", "power-play points", 0.5], ["w", "goalie wins", 3], ["v", "saves", 0.2], ["x", "goals against", -1], ["o", "shutouts", 2]], "Default weights are a common points-league setup — edit them to match your league (Yahoo/ESPN/Fantrax differ)");
export const golfPts = fScore([["e", "eagles or better", 8], ["b", "birdies", 3], ["p", "pars", 0.5], ["o", "bogeys", -0.5], ["d", "double bogeys or worse", -1], ["s", "bogey-free rounds", 3], ["t", "birdie streaks (3+)", 3], ["f", "finish-position bonus", 1]], "Typical DFS-style hole scoring · enter the finish bonus points from your site's table · edit weights to match your contest");
export const soccerPts = fScore([["g", "goals", 6], ["a", "assists", 3], ["c", "clean sheets", 4], ["v", "saves", 0.5], ["m", "minutes 60+ (1 = yes)", 2], ["y", "yellow cards", -1], ["r", "red cards", -3], ["o", "own goals", -2], ["k", "penalties missed", -2]], "Defaults follow a typical season-long setup (forward goals); many games score goals by position (defenders more) — edit the weights");
export const dfsSalary: Calc = (v) => {
  const cap = P(v, "c", 50000, "Salary cap"), used = Z(v, "u", 38200), left = Math.max(1, Math.round(num(v.n, 2))), minS = Z(v, "m", 3000);
  const rem = cap - used, avg = rem / left;
  return { r: rem >= 0 ? `${$(rem)} left — ${$(avg)} per remaining spot` : `Over the cap by ${$(-rem)}`, d: `${$(used)} of ${$(cap)} used · ${left} spot${left > 1 ? "s" : ""} to fill${avg < minS ? ` · below the ${$(minS)} minimum price — swap a pricier player` : ""}`, note: "Points per $1,000 (value) helps compare players: projected points ÷ salary × 1,000 · leaving a little salary unused is fine in large tournaments" };
};
// ---- Golf ----
export const compression: Calc = (v) => {
  const s = P(v, "s", 90, "Driver swing speed (mph)"), feel = pick(v.f, 2);
  const c = s < 75 ? "Low compression (≤ 60–70)" : s < 85 ? "Low–mid compression (70–80)" : s < 95 ? "Mid compression (80–90)" : s < 105 ? "Mid–high compression (90–100)" : "High compression (100+)";
  return { c, d: `${f(s)} mph driver speed${feel === 1 ? " · you prefer a firm feel — consider one step firmer" : ""}`, note: "Rough fitting guide — slower swings often get more distance from softer balls; spin around the greens matters more than compression for most golfers · try a few balls on the course" };
};
export const slopeRating: Calc = (v) => {
  const cr = P(v, "c", 71.2, "Course rating"), br = P(v, "b", 96.5, "Bogey rating"), wom = pick(v.g, 2) === 1, par = Z(v, "p", 72), hi = num(v.h, 15);
  const slope = Math.round((wom ? 4.24 : 5.381) * (br - cr)), cs = Math.min(155, Math.max(55, slope)), ch = hi * (cs / 113) + (cr - par);
  return { s: `Slope Rating ${cs}`, h: `Course handicap for a ${f(hi)} index: ${f(Math.round(ch))}`, note: `Slope = ${wom ? "4.24" : "5.381"} × (bogey rating − course rating) · 113 is average difficulty; range 55–155 · course handicap = index × slope/113 + (course rating − par)` };
};
export const tempDist: Calc = (v) => {
  const d = P(v, "d", 250, "Carry at baseline"), t = num(v.t, 50), base = num(v.b, 70), u = pick(v.u, 2) === 1, tf = u ? t * 1.8 + 32 : t, bf = u ? base * 1.8 + 32 : base;
  const nd = d + ((tf - bf) / 10) * (d >= 200 ? 2 : 1.5);
  return { d: `≈ ${f(Math.round(nd))} yards carry`, c: `${nd >= d ? "+" : "−"}${f(Math.abs(Math.round(nd - d)))} yards vs ${f(base)}°${u ? "C" : "F"}`, note: "Rule of thumb: about 2 yards per 10 °F for a driver (1.5 for irons) — cold air is denser and the ball is less lively · keep balls warm in winter" };
};
export const stimp: Calc = (v) => {
  const up = P(v, "u", 9.5, "Uphill roll (ft)"), dn = P(v, "d", 11.5, "Downhill roll (ft)"), sp = (2 * up * dn) / (up + dn);
  return { s: `Green speed (stimp) ≈ ${f(sp)} ft`, r: sp < 8 ? "Slow" : sp < 10 ? "Medium" : sp < 12 ? "Fast" : "Very fast (tournament)", note: `Slope-corrected formula 2·S↑·S↓/(S↑ + S↓) — simple average would be ${f((up + dn) / 2)} ft · roll 3 balls each way and average · difference over ~1 ft means the spot is too sloped` };
};
export const membership: Calc = (v) => {
  const dues = Z(v, "d", 4500), init = Z(v, "i", 0), yrs = Math.max(1, num(v.y, 5)), rounds = P(v, "r", 50, "Rounds per year"), cart = Z(v, "c", 0), fbmin = Z(v, "f", 600), green = Z(v, "g", 75);
  const yearly = dues + init / yrs + cart * rounds + fbmin, per = yearly / rounds;
  return { c: `${$(per)} per round as a member`, b: per <= green ? `Cheaper than ${$(green)} green fees by ${$((green - per) * rounds)} a year` : `Paying green fees saves ${$((per - green) * rounds)} a year`, note: `Break-even at ${f(Math.ceil(yearly / Math.max(1, green - cart)))} rounds · dues ${$(dues)} + initiation ${$(init)} over ${f(yrs)} yrs + F&B minimum ${$(fbmin)}${cart ? ` + carts ${$(cart)}/round` : ""}` };
};
export const nassau: Calc = (v) => {
  const bet = P(v, "b", 5, "Bet per segment"), f9 = num(v.f, 1), b9 = num(v.k, -1), all = num(v.t, 1), press = num(v.p, 0), pv = Z(v, "x", 5);
  const net = bet * (Math.sign(f9) + Math.sign(b9) + Math.sign(all)) + press * pv;
  return { n: net >= 0 ? `You win ${$(net)}` : `You lose ${$(-net)}`, d: `Front ${f9 > 0 ? "won" : f9 < 0 ? "lost" : "halved"} · back ${b9 > 0 ? "won" : b9 < 0 ? "lost" : "halved"} · overall ${all > 0 ? "won" : all < 0 ? "lost" : "halved"} · presses ${f(press)} × ${$(pv)}`, note: "A $5 Nassau is three $5 bets (front 9, back 9, 18) · enter +1 won, −1 lost, 0 halved · presses start new bets when you're 2 down" };
};
// ---- Hiking ----
export const ascent: Calc = (v) => {
  const s = P(v, "s", 2800, "Current sleeping altitude"), t = P(v, "t", 5200, "Target altitude"), ft = pick(v.u, 2) === 1, rate = P(v, "r", 500, "Daily gain");
  const S = ft ? s * 0.3048 : s, T = ft ? t * 0.3048 : t, R = ft ? rate * 0.3048 : rate, above = Math.max(0, T - Math.max(S, 3000)), gainDays = Math.ceil(above / Math.min(500, R)), rest = Math.floor(gainDays / 3);
  return { d: `≈ ${gainDays + rest} days from ${f(Math.round(S))} m to ${f(Math.round(T))} m`, p: `${gainDays} ascent days (≤ ${f(Math.min(500, R))} m sleeping gain) + ${rest} rest days`, note: `${R > 500 ? "Your planned daily gain is over the 500 m guideline — higher risk of altitude sickness · " : ""}WMS guidance above 3,000 m: raise sleeping altitude ≤ 500 m a day and rest every 3–4 days · descend if symptoms worsen — this is not medical advice` };
};
export const turnaround: Calc = (v) => {
  const sunset = num(v.s, 18.5) * 60, back = P(v, "b", 2.5, "Hours to return"), buf = Z(v, "x", 30), now = num(v.n, 13) * 60;
  const turn = sunset - back * 60 - buf, left = turn - now;
  return { t: `Turn around by ${clock(turn)}`, r: left >= 0 ? `${hm(left / 60)} from now (${clock(now)})` : `You're ${hm(-left / 60)} past it — head back now`, note: `Sunset ${clock(sunset)} − ${hm(back)} return − ${f(buf)} min buffer · descending can take 60–80% of the climb time; carry a headlamp anyway` };
};
export const thruBudget: Calc = (v) => {
  const days = P(v, "d", 150, "Trail days"), food = Z(v, "f", 18), town = Z(v, "t", 12), stay = Z(v, "s", 70), nights = Z(v, "n", 20), gear = Z(v, "g", 1500), ship = Z(v, "x", 250), permits = Z(v, "p", 0), trav = Z(v, "r", 600);
  const tot = days * food + Math.ceil(days / 5) * town + nights * stay + gear + ship + permits + trav;
  return { t: `Budget ≈ ${$(tot)}`, d: `Food ${$(days * food)} · town meals ${$(Math.ceil(days / 5) * town)} · lodging ${$(nights * stay)} · gear ${$(gear)} · resupply shipping ${$(ship)} · permits ${$(permits)} · travel ${$(trav)}`, note: `${$(tot / days)} a day on trail · popular estimates for the Appalachian Trail are about $1,000 per month plus gear · town days drain budgets fastest` };
};
export const thruMiles: Calc = (v) => {
  const L = P(v, "l", 2198, "Trail length (miles)"), wk = P(v, "w", 22, "Miles per hiking day"), zero = Math.min(6, Z(v, "z", 1)), start = Z(v, "s", 12), ramp = Z(v, "r", 3);
  const perCal = (wk * (7 - zero)) / 7, days = L / perCal + ramp * 7 * Math.max(0, 1 - (start + wk) / (2 * wk)), avgW = perCal * 7;
  return { d: `≈ ${f(Math.round(days))} days (${f(days / 30.4)} months)`, m: `${f(wk)} miles per hiking day with ${f(zero)} zero day${zero === 1 ? "" : "s"} a week (${f(avgW / 7)} average per calendar day) · ${f(ramp)}-week ramp from ${f(start)} miles`, note: `Default 2,198 miles ≈ Appalachian Trail (PCT ≈ 2,650, CDT ≈ 3,100) · most thru-hikers take 5–7 months · build up mileage to avoid overuse injuries` };
};
export const bagTemp: Calc = (v) => {
  const low = num(v.l, 5), cold = pick(v.c, 2) === 0, pad = Z(v, "r", 3), u = pick(v.u, 2) === 1, L = u ? (low - 32) / 1.8 : low;
  const comfortNeed = L - (cold ? 0 : 3), limitNeed = comfortNeed - 5, padNote = pad < 2 ? "too low for cold ground" : pad < 4 ? "3-season" : "winter-capable";
  const out = (c: number) => (u ? `${f(Math.round(c * 1.8 + 32))} °F` : `${f(Math.round(c))} °C`);
  return { b: `Choose a bag with a comfort rating of ${out(comfortNeed)} or lower`, l: `(about ${out(limitNeed)} limit rating) · pad R-value ${f(pad)} — ${padNote}`, note: `${cold ? "Cold sleepers (and many women) should use the comfort rating" : "Warm sleepers can lean toward the limit rating"} · EN/ISO 23537: limit ≈ comfort − 5 °C · add 1 R-value per ~5 °C colder` };
};
export const stoveFuel: Calc = (v) => {
  const ppl = Math.max(1, num(v.p, 2)), days = P(v, "d", 4, "Days"), L = P(v, "l", 1.5, "Water boiled per person per day (L)"), t = pick(v.t, 3), cold = pick(v.c, 2) === 1;
  const gpl = [10, 8, 30][t] * (cold ? 1.5 : 1), g = ppl * days * L * gpl, can = [110, 230, 450];
  return { f: `≈ ${f(Math.round(g))} g of ${["canister gas (isobutane)", "white gas", "alcohol"][t]}`, c: t === 0 ? `Canisters: ${can.map((c) => `${Math.ceil(g / c)} × ${c} g`).join(" or ")}` : `${f(Math.round(g / (t === 1 ? 0.74 : 0.79)))} mL of fuel`, note: `${f(gpl)} g per litre boiled${cold ? " (cold-weather +50%)" : ""} · use a windscreen and lid · snow melting needs 2–3× more fuel` };
};
export const filterLife: Calc = (v) => {
  const cap = P(v, "c", 4000, "Filter capacity (L)"), ppl = Math.max(1, num(v.p, 2)), Ld = P(v, "l", 4, "Litres per person per day"), murky = pick(v.m, 2) === 1;
  const eff = cap * (murky ? 0.5 : 1), days = eff / (ppl * Ld);
  return { d: `≈ ${f(Math.round(days))} trail days before replacement`, d2: `${f(eff)} L effective capacity for ${f(ppl)} people drinking ${f(Ld)} L/day`, note: `${murky ? "Silty water halves real capacity — pre-filter with a bandana" : "Clear water assumed"} · backflush regularly · never let hollow-fibre filters freeze` };
};
export const fallFactor: Calc = (v) => {
  const fall = P(v, "f", 4, "Fall length"), rope = P(v, "r", 6, "Rope paid out"), w = P(v, "w", 80, "Climber mass (kg)"), ir = P(v, "i", 8.5, "Rope impact force rating (kN)");
  const ff = fall / rope, m0 = 80 * 9.80665, F0 = ir * 1000, EA = ((F0 - m0) ** 2 - m0 ** 2) / (2 * m0 * 1.77), mg = w * 9.80665, Fi = mg + Math.sqrt(mg ** 2 + 2 * mg * ff * EA);
  return { ff: `Fall factor ${f(ff)}`, i: `Estimated peak force on the climber ≈ ${f(Fi / 1000)} kN (rope rated ${f(ir)} kN at FF 1.77 with 80 kg)`, note: ff > 1 ? "Severe fall (factor > 1) — falls directly onto the anchor can approach the maximum of 2" : "Typical lead fall · more rope out absorbs more energy, so the same fall is softer higher up" };
};
export const rappel: Calc = (v) => {
  const h = P(v, "h", 25, "Rappel height (m)"), dbl = pick(v.d, 2) === 0, extra = Z(v, "x", 3), knots = pick(v.k, 2) === 0;
  const need = (dbl ? 2 * h : h) + extra * (dbl ? 2 : 1), rope = [30, 40, 50, 60, 70, 80].find((r) => r >= need) ?? 0;
  return { r: `Need ≥ ${f(need)} m of rope${rope ? ` — a ${rope} m rope works` : " — longer than standard single ropes; use two ropes joined"}`, d: `${dbl ? "Doubled through the anchor (2 × height)" : "Single strand fixed"} + ${f(extra)} m for anchor and stretch`, note: `${knots ? "Always tie stopper knots in both ends" : "Tie stopper knots!"} · a 60 m rope doubled gives a 30 m rappel minus anchor · confirm the ends reach the ground or next anchor` };
};
// ---- Motorsports ----
export const dynoCF: Calc = (v) => {
  const hp = P(v, "h", 400, "Observed hp"), T = num(v.t, 30), Pb = P(v, "p", 29.5, "Barometer (inHg)"), rh = Math.min(100, Z(v, "r", 40)) / 100;
  const pv = 6.1078 * 10 ** ((7.5 * T) / (T + 237.3)) * rh * 0.02953, Pd = (Pb - pv) * 33.8639, cf = 1.18 * (990 / Pd) * Math.sqrt((T + 273) / 298) - 0.18;
  return { c: `SAE J1349 correction factor ${cf.toFixed(4)}`, h: `Corrected ≈ ${f(Math.round(hp * cf))} hp (observed ${f(hp)})`, note: `Dry-air pressure ${f(Pd)} hPa at ${f(T)} °C and ${pc(rh, 0)} humidity · SAE standard day 25 °C, 990 hPa dry air · compare runs only with the same correction standard` };
};
export const lapSpeed: Calc = (v) => {
  const L = P(v, "l", 5.891, "Lap length (km)"), m = Z(v, "m", 1), s = Z(v, "s", 27.5), laps = Math.max(1, num(v.n, 52)), mi = pick(v.u, 2) === 1;
  const t = m * 60 + s; if (!(t > 0)) throw new InputError("Enter a lap time.");
  const spd = (L / t) * 3600;
  return { s: `Average speed ${f(spd)} km/h (${f(spd / 1.60934)} mph)`, r: `${f(laps)} laps ≈ ${hm((t * laps) / 3600)} at this pace · ${f(L * laps)} km`, note: `Lap ${f(m)}:${String(s.toFixed(3)).padStart(6, "0")} on a ${f(L)} km ${mi ? "(" + f(L / 1.60934) + " mi) " : ""}track · default ≈ Silverstone GP circuit length` };
};

// ---- registry (generated)
export const ideaSpt1CustomCalculators: Record<string, Calc> = {
  "isolated-power-calculator": iso,
  "pythagorean-win-expectation-calculator": pythag,
  "pitch-count-limit-youth-calculator": pitchCount,
  "pitching-speed-reaction-time-calculator": reaction,
  "cycling-climb-time-calculator": climbTime,
  "cycling-calories-by-power-calculator": calPower,
  "cycling-aerodynamic-drag-calculator": aero,
  "bike-commute-time-calculator": commute,
  "century-ride-pacing-calculator": century,
  "fantasy-hockey-points-calculator": hockeyPts,
  "fantasy-golf-points-calculator": golfPts,
  "fantasy-soccer-points-calculator": soccerPts,
  "dfs-lineup-salary-calculator": dfsSalary,
  "golf-ball-compression-calculator": compression,
  "golf-slope-rating-calculator": slopeRating,
  "golf-temperature-distance-calculator": tempDist,
  "putting-green-speed-stimp-calculator": stimp,
  "golf-membership-cost-per-round-calculator": membership,
  "golf-nassau-bet-calculator": nassau,
  "altitude-sickness-risk-calculator": ascent,
  "sunset-turnaround-time-calculator": turnaround,
  "thru-hike-budget-calculator": thruBudget,
  "thru-hike-daily-mileage-calculator": thruMiles,
  "sleeping-bag-temperature-rating-calculator": bagTemp,
  "camping-fuel-needs-calculator": stoveFuel,
  "water-filter-capacity-calculator": filterLife,
  "climbing-rope-fall-factor-calculator": fallFactor,
  "rappel-rope-length-calculator": rappel,
  "dyno-correction-factor-calculator": dynoCF,
  "lap-time-average-speed-calculator": lapSpeed,
};
