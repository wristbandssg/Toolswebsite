/**
 * Idea build, batch spt3 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Sports > Running (13), Sports Betting & Racing (8),
 * Sports Performance (11) = 32 tools.
 * Sources/rules: ACSM running equation (VO₂ = 0.2·v + 0.9·v·grade + 3.5) for treadmill-incline equivalents; Hadley temperature + dew point
 * pace adjustment bands; Boston Marathon qualifying standards for the 2026 race (5 minutes faster than 2025: M18–34 3:00 → 2:55,
 * F18–34 3:25 …, 80+ 4:50/5:20); 10% weekly mileage rule with cutback weeks; NHS-style Couch to 5K (9 weeks, 3 runs/week); runner calorie
 * rule ≈ 0.75 kcal per lb per mile gross (0.63 net); in-race carbs 30–60 g/h (< 2.5 h) up to 60–90 g/h (longer); ISSN pre-exercise
 * carbs 1–4 g/kg 1–4 h before; Lyle McDonald natural muscle-gain model; 2024 Compendium of Physical Activities MET values; kcal/min =
 * MET × 3.5 × kg ÷ 200. Bet structures: Lucky 15 (15 bets), Yankee (11 bets), round robins = C(n, k) combinations.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, dateIn, dayText } from "./trv-core";
import { fmt, choose } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 2);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const today = () => Math.floor(Date.now() / 86400000);
const hms = (s: number) => { const t = Math.round(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
const secs = (v: Record<string, number>, h: string, m: string, s: string, d: [number, number, number]) => Z(v, h, d[0]) * 3600 + Z(v, m, d[1]) * 60 + Z(v, s, d[2]);

// ---- Running ----
export const inclinePace: Calc = (v) => {
  const mph = P(v, "s", 6, "Treadmill speed"), g = num(v.g, 3) / 100, km = pick(v.u, 2) === 1, spd = km ? mph / 1.60934 : mph;
  const flat = spd * (1 + 4.5 * g), paceMi = 3600 / flat;
  return { p: `Flat-road equivalent ≈ ${f(flat)} mph — ${hms(paceMi)} per mile (${hms(paceMi / 1.60934)} per km)`, d: `${f(spd)} mph at ${f(g * 100)}% incline = ${hms(3600 / spd)}/mile on the belt`, note: "ACSM running equation (equal oxygen cost) · many runners set 1% incline to mimic outdoor air resistance · very steep inclines overstate the effort" };
};
const HADLEY: [number, number][] = [[100, 0], [110, 0.0025], [120, 0.0075], [130, 0.015], [140, 0.025], [150, 0.0375], [160, 0.0525], [170, 0.07], [180, 0.09]];
export const heatPace: Calc = (v) => {
  const T = num(v.t, 80), dp = num(v.d, 65), c = pick(v.u, 2) === 1, tf = c ? T * 1.8 + 32 : T, df = c ? dp * 1.8 + 32 : dp, pace = secs(v, "x", "m", "s", [0, 8, 0]), sum = tf + df;
  if (!pace) throw new InputError("Enter your goal pace.");
  const adj = sum > 180 ? 0.12 : (HADLEY.find(([lim]) => sum <= lim) ?? [0, 0.09])[1];
  return { p: `Adjusted pace ≈ ${hms(pace * (1 + adj))} (+${pc(adj)})`, d: `Temperature + dew point = ${f(Math.round(sum))} (°F) · goal ${hms(pace)}`, note: sum > 180 ? "Over 180 — hard running isn't recommended; run easy or move indoors" : "Hadley rule of thumb · humidity matters as much as heat · hydrate and pre-cool on hot days" };
};
export const negSplit: Calc = (v) => {
  const goal = secs(v, "h", "m", "s", [1, 45, 0]), d = P(v, "d", 21.0975, "Race distance (km)"), sp = Z(v, "p", 2) / 100;
  if (!goal) throw new InputError("Enter a goal time.");
  const h2 = goal / (2 + sp), h1 = goal - h2;
  return { s: `First half ${hms(h1)} · second half ${hms(h2)}`, p: `Paces: ${hms(h1 / (d / 2))}/km then ${hms(h2 / (d / 2))}/km (${pc(sp)} faster second half)`, note: `Goal ${hms(goal)} for ${f(d)} km · a 1–3% negative split is how most PBs are run — start controlled` };
};
const BQ: [number, number, string][] = [[34, 175, "18–34"], [39, 180, "35–39"], [44, 185, "40–44"], [49, 195, "45–49"], [54, 200, "50–54"], [59, 210, "55–59"], [64, 230, "60–64"], [69, 245, "65–69"], [74, 260, "70–74"], [79, 275, "75–79"], [200, 290, "80+"]];
export const bqTime: Calc = (v) => {
  const age = Math.round(num(v.a, 38)), w = pick(v.g, 3), row = BQ.find(([a]) => age <= a)!, std = (row[1] + (w === 1 ? 30 : 0)) * 60, t = secs(v, "h", "m", "s", [0, 0, 0]);
  return { q: `Boston qualifying standard: ${hms(std)} (${["men", "women", "non-binary (uses women's standards)"][w]} ${row[2]})`, r: t ? (t <= std ? `Your ${hms(t)} qualifies with ${hms(std - t)} to spare` : `Your ${hms(t)} misses by ${hms(t - std)}`) : "Enter a marathon time to check", note: "Standards for the 2026 race (5 minutes faster than 2025) · age is your age on race day · meeting the standard doesn't guarantee entry — see the cutoff tool" };
};
export const bqBuffer: Calc = (v) => {
  const age = Math.round(num(v.a, 38)), w = pick(v.g, 3), row = BQ.find(([a]) => age <= a)!, std = (row[1] + (w === 1 ? 30 : 0)) * 60, t = secs(v, "h", "m", "s", [3, 0, 0]), cut = Z(v, "c", 6) * 60 + Z(v, "x", 51);
  const buf = std - t;
  return { b: buf >= 0 ? `You're ${hms(buf)} under your standard` : `Over your standard by ${hms(-buf)}`, r: buf >= cut ? `Clears a ${hms(cut)} cutoff — likely accepted` : buf >= 0 ? `Short of a ${hms(cut)} cutoff by ${hms(cut - buf)}` : "Doesn't qualify", note: `Standard ${hms(std)} · default cutoff 6:51 was the 2025 race's · the B.A.A. sets each year's cutoff after registration, so aim for a big buffer` };
};
export const mileageRamp: Calc = (v) => {
  const now = P(v, "n", 20, "Current weekly mileage"), goal = P(v, "g", 40, "Target weekly mileage"), inc = Math.min(20, P(v, "i", 10, "Increase")) / 100, cut = Math.max(0, Math.round(num(v.c, 4)));
  const wk: number[] = []; let m = now, k = 0; while (m < goal && k < 104) { k++; if (cut && k % cut === 0) wk.push(Math.round(m * 0.8)); else { m = Math.min(goal, m * (1 + inc)); wk.push(Math.round(m)); } }
  return { w: `${wk.length} weeks to reach ${f(goal)} miles/week`, p: wk.slice(0, 20).map((x, i) => `W${i + 1} ${x}`).join(" · ") + (wk.length > 20 ? " …" : ""), note: `${pc(inc, 0)} a week${cut ? ` with a ~20% cutback every ${cut}th week` : ""} · the 10% rule is a guide — new runners and injury-prone runners should build slower` };
};
export const shoeMiles: Calc = (v) => {
  const used = Z(v, "u", 180), wk = P(v, "w", 25, "Weekly miles"), life = P(v, "l", 400, "Shoe lifespan"), rot = Math.max(1, Math.round(num(v.r, 1))), cost = Z(v, "c", 140);
  const left = Math.max(0, life - used), weeks = (left / wk) * rot, rep = today() + Math.round(weeks * 7);
  return { r: left ? `${f(left)} miles left — replace around ${dayText(rep)}` : "Time to replace — past the lifespan", c: `${f(Math.round(52 / (life / (wk / rot)) * rot * 10) / 10)} pairs a year at ${f(wk)} miles/week · ${money((cost * wk * 52) / life, "$", 0)} a year in shoes`, note: "Most running shoes last 300–500 miles (racing super-shoes ~200–300) · replace sooner if the midsole feels flat or aches appear" };
};
export const trackLaps: Calc = (v) => {
  const t = secs(v, "h", "m", "s", [0, 22, 30]), d = P(v, "d", 5000, "Race distance (m)"), lane = Math.max(1, Math.round(num(v.l, 1)));
  if (!t) throw new InputError("Enter a goal time.");
  const per400 = (t / d) * 400, laneLen = 400 + (lane - 1) * 7.67;
  return { l: `400 m lap: ${hms(per400)} · 200 m: ${hms(per400 / 2)}`, d: `${f(d / 400)} laps of lane 1 · per km ${hms((t / d) * 1000)} · per mile ${hms((t / d) * 1609.34)}`, note: lane > 1 ? `Lane ${lane} is ~${f(laneLen)} m per lap — run ${hms((t / d) * laneLen)} there` : "Lane 1 is 400 m; each lane out adds about 7.7 m per lap" };
};
export const ultraPace: Calc = (v) => {
  const d = P(v, "d", 50, "Distance (km)"), t = secs(v, "h", "m", "s", [7, 0, 0]), gain = Z(v, "g", 1500), aid = Z(v, "a", 8), am = Z(v, "x", 4);
  if (!t) throw new InputError("Enter a goal time.");
  const moving = t - aid * am * 60, eqKm = d + gain / 100;
  return { p: `Average moving pace ${hms(moving / d)}/km (${hms(moving / eqKm)}/km effort-equivalent)`, d: `${hms(moving)} moving + ${f(aid)} aid stops × ${f(am)} min · ${f(gain)} m climbing ≈ ${f(eqKm)} flat-km effort`, note: "Rule of thumb: each 100 m of climbing ≈ 1 extra flat km · walk the steep climbs early · eat 200–300 kcal per hour" };
};
export const trailAdj: Calc = (v) => {
  const d = P(v, "d", 15, "Distance (km)"), up = Z(v, "u", 600), down = Z(v, "w", 600), road = secs(v, "h", "m", "s", [0, 5, 30]), tech = pick(v.t, 3);
  if (!road) throw new InputError("Enter your road pace per km.");
  const eq = d + up / 100 + down / 400, t = eq * road * [1, 1.1, 1.25][tech];
  return { t: `Expected time ≈ ${hms(t)}`, p: `${hms(t / d)}/km average on the trail (road ${hms(road)}/km)`, note: `Effort ≈ ${f(eq)} flat km (+1 km per 100 m up, +¼ km per 100 m down) × ${["smooth", "moderate", "technical"][tech]} terrain factor · run by effort, not pace` };
};
export const calMile: Calc = (v) => {
  const w = P(v, "w", 160, "Weight"), kg = pick(v.u, 2) === 1, lb = kg ? w * 2.20462 : w, mi = P(v, "d", 5, "Distance"), km = pick(v.k, 2) === 1, miles = km ? mi / 1.60934 : mi;
  return { c: `≈ ${f(Math.round(lb * 0.75 * miles))} kcal (gross)`, n: `Net (above resting) ≈ ${f(Math.round(lb * 0.63 * miles))} kcal · ${f(Math.round(lb * 0.75))} kcal per mile`, note: "Calories per mile depend mostly on body weight, not pace · walking burns roughly half as much net per mile" };
};
export const raceFuel: Calc = (v) => {
  const t = secs(v, "h", "m", "s", [3, 45, 0]) / 3600, gel = P(v, "g", 25, "Carbs per gel"), rate = Z(v, "r", 0), w = Z(v, "w", 70);
  const r = rate || (t < 1 ? 0 : t < 2.5 ? 45 : 75), tot = r * Math.max(0, t - 0.25), gels = Math.ceil(tot / gel);
  return { c: `${f(Math.round(tot))} g carbs during the race (${f(r)} g/h)`, g: `≈ ${gels} gels of ${f(gel)} g — one every ${f(Math.round((t * 60) / Math.max(1, gels + 1)))} min, starting at ~20–30 min`, note: `${t < 1 ? "Under an hour you mostly don't need carbs" : t < 2.5 ? "30–60 g/h for 1–2.5 h efforts" : "60–90 g/h for longer efforts (needs gut training, glucose + fructose)"} · drink to thirst · ${w ? `carb-load ~${f(w * 8)}–${f(w * 10)} g/day for 1–2 days before` : ""}` };
};
const C25K = ["Week 1: 60 s run / 90 s walk × 8", "Week 2: 90 s run / 2 min walk × 6", "Week 3: 90 s run, 90 s walk, 3 min run, 3 min walk × 2", "Week 4: 3 min run, 90 s walk, 5 min run, 2½ min walk × 2", "Week 5: run 5 min ×3 → 8 min ×2 → 20 min continuous", "Week 6: 5–8–5 min runs → 10 min ×2 → 25 min continuous", "Week 7: 25 min continuous ×3", "Week 8: 28 min continuous ×3", "Week 9: 30 min (≈ 5 km) ×3"];
export const c25k: Calc = (v) => {
  const s = dateIn(v, "d", today()), days = pick(v.p, 2) === 0 ? "Mon/Wed/Sat" : "Tue/Thu/Sun", wk = Math.min(9, Math.max(1, Math.floor((today() - s) / 7) + 1));
  return { s: C25K.map((x, i) => `${dayText(s + i * 7).slice(5)} — ${x}`).join(" · "), n: today() >= s ? `You're in ${C25K[wk - 1].split(":")[0]} — ${C25K[wk - 1].split(": ")[1]}` : `Starts ${dayText(s)}`, note: `Three runs a week (${days}), each with a 5-minute brisk warm-up walk · finish ≈ ${dayText(s + 62)} · repeat a week whenever you need to` };
};
// ---- Betting & racing ----
export const rrBet: Calc = (v) => {
  const n = Math.max(2, Math.round(num(v.n, 4))), k = Math.min(n, Math.max(2, Math.round(num(v.k, 2)))), stake = P(v, "s", 10, "Stake per bet"), odds = P(v, "o", 2.0, "Average decimal odds"), w = Math.min(n, Math.round(Z(v, "w", 3)));
  const bets = choose(n, k), win = choose(w, k), ret = win * stake * odds ** k;
  return { b: `${f(bets)} bets × ${$(stake)} = ${$(bets * stake)} total`, r: `If ${w} of ${n} win: ${f(win)} winning ${k}-leg parlays return ≈ ${$(ret)} (profit ${$(ret - bets * stake)})`, note: `Round robin by ${k}s = C(${n}, ${k}) combinations at ~${f(odds)} odds each leg · less risky than one ${n}-leg parlay but costs more` };
};
export const breakEven: Calc = (v) => {
  const o = num(v.o, -110), dec = o > 0 ? 1 + o / 100 : o < 0 ? 1 + 100 / -o : 0;
  if (!(dec > 1)) throw new InputError("Enter American odds like -110 or +150.");
  const be = 1 / dec;
  return { b: `Break-even win rate ${pc(be, 2)}`, d: `${o > 0 ? "+" : ""}${f(o)} = ${f(dec)} decimal · win ${f(Math.round(be * 1000) / 10)} of every 100 bets just to break even`, note: "At standard −110 you need 52.38% · long-run edge = your true win % − break-even %" };
};
const horse = (k: number, name: string): Calc => (v) => {
  const n = Math.round(num(v.n, k + 1)), base = P(v, "b", name === "Superfecta" ? 0.1 : 1, "Base bet");
  if (n < k) throw new InputError(`Box at least ${k} horses.`);
  let combos = 1; for (let i = 0; i < k; i++) combos *= n - i;
  return { c: `${name} box of ${n}: ${f(combos)} combinations × ${$(base)} = ${$(combos * base)}`, d: `Any ${k} of your ${n} horses finishing ${k === 2 ? "1st–2nd" : k === 3 ? "1st–3rd" : "1st–4th"} in any order wins`, note: `Combinations = ${n}${Array.from({ length: k - 1 }, (_, i) => ` × ${n - i - 1}`).join("")} · minimum base bets vary by track (${name === "Superfecta" ? "often $0.10" : "$1 or $0.50"}) · payouts are pari-mutuel` };
};
export const trifecta = horse(3, "Trifecta");
export const exacta = horse(2, "Exacta");
export const superfecta = horse(4, "Superfecta");
export const pick6: Calc = (v) => {
  const legs = [1, 2, 3, 4, 5, 6].map((i) => Math.max(1, Math.round(num(v[`l${i}`], [2, 1, 3, 2, 1, 2][i - 1])))), base = P(v, "b", 0.2, "Base bet"), combos = legs.reduce((a, b) => a * b, 1);
  return { c: `${f(combos)} combinations × ${$(base)} = ${$(combos * base)}`, d: `Horses per leg: ${legs.join(" × ")}`, note: "Pick 6 / Jackpot Pick 6 bases are often $0.20–$2 · singling a strong favourite cuts cost the most" };
};
const multiBet = (name: string, sets: number[]): Calc => (v) => {
  const o = [1, 2, 3, 4].map((i) => P(v, `o${i}`, [2.5, 3.0, 2.0, 4.0][i - 1], `Odds ${i}`)), stake = P(v, "s", 1, "Unit stake"), won = Math.min(4, Math.max(0, Math.round(num(v.w, 4))));
  const win = o.slice(0, won), combos = (arr: number[], k: number): number[][] => (k === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map((c) => [x, ...c])));
  const nb = sets.reduce((s, k) => s + choose(4, k), 0), ret = sets.reduce((s, k) => s + combos(win, k).reduce((a, c) => a + stake * c.reduce((p, x) => p * x, 1), 0), 0);
  return { c: `${nb} bets × ${$(stake)} = ${$(nb * stake)} total stake`, r: `With ${won} winner${won === 1 ? "" : "s"}: return ${$(ret)} (profit ${$(ret - nb * stake)})`, note: `${name}: ${sets.map((k) => `${choose(4, k)} ${["", "singles", "doubles", "trebles", "four-fold"][k]}`).join(", ")} on 4 selections · decimal odds; each-way and bonuses not included` };
};
export const lucky15 = multiBet("Lucky 15", [1, 2, 3, 4]);
export const yankee = multiBet("Yankee", [2, 3, 4]);
// ---- Performance ----
const STD: Record<string, [number[], number[]]> = { bench: [[0.5, 0.75, 1, 1.5, 2], [0.25, 0.5, 0.75, 1, 1.5]], squat: [[0.75, 1.25, 1.5, 2.25, 2.75], [0.5, 0.75, 1.25, 1.5, 2]], deadlift: [[1, 1.5, 2, 2.5, 3], [0.5, 1, 1.25, 1.75, 2.5]] };
const lift = (key: string, name: string): Calc => (v) => {
  const bw = P(v, "b", 180, "Bodyweight"), w = P(v, "w", 185, "Lift weight (1RM)"), sex = pick(v.s, 2), r = w / bw, t = STD[key][sex], lv = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
  let i = 0; while (i < t.length - 1 && r >= t[i + 1]) i++; const lvl = r < t[0] ? "Untrained" : lv[i];
  return { l: `${lvl} — ${f(r)}× bodyweight`, n: i < t.length - 1 ? `Next level (${lv[i + 1]}) at ${f(t[i + 1] * bw)} (${f(t[i + 1])}× bodyweight)` : "Elite level", note: `General ${name} bodyweight-ratio guide for ${sex === 0 ? "men" : "women"}: ${lv.map((x, j) => `${x} ${f(t[j])}×`).join(" · ")} · use a true or estimated 1RM; age and weight class shift these` };
};
export const bench = lift("bench", "bench press");
export const squat = lift("squat", "squat");
export const deadlift = lift("deadlift", "deadlift");
export const mets: Calc = (v) => {
  const met = P(v, "m", 6, "MET value"), kg0 = P(v, "w", 70, "Weight"), lb = pick(v.u, 2) === 1, kg = lb ? kg0 / 2.20462 : kg0, min = P(v, "t", 45, "Minutes");
  const kcal = (met * 3.5 * kg * min) / 200;
  return { c: `≈ ${f(Math.round(kcal))} kcal`, d: `${f(met)} METs × 3.5 × ${f(kg)} kg ÷ 200 × ${f(min)} min · ${f(kcal / min)} kcal/min`, note: "1 MET = resting (≈ 1 kcal/kg/hour) · examples: walking 3.5, cycling moderate 7, running 6 mph 9.8, swimming laps 8 (2024 Compendium)" };
};
export const preWorkout: Calc = (v) => {
  const w = P(v, "w", 70, "Weight (kg)"), t = num(v.t, 17.5) * 60, hrs = Z(v, "h", 1.5), intense = pick(v.i, 2) === 0;
  const ct = (m: number) => { const x = ((Math.round(m) % 1440) + 1440) % 1440, h = Math.floor(x / 60); return `${((h + 11) % 12) + 1}:${String(x % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`; };
  const carbs = Math.round(w * (hrs >= 3 ? 2.5 : hrs >= 2 ? 1.5 : 1));
  return { s: `Meal by ${ct(t - 180)} (3 h before) · snack at ${ct(t - 60)} (1 h) · optional quick carbs at ${ct(t - 20)}`, c: `About ${carbs} g carbs + 15–25 g protein if eating ${f(hrs)} h before (${f(Math.round(carbs / w * 10) / 10)} g/kg)`, note: `${intense ? "Hard session — keep the last meal lower in fat and fibre" : "Easy session — a light snack is plenty"} · ISSN: 1–4 g/kg carbs 1–4 h before; less the closer you get · workout at ${ct(t)}` };
};
export const muscleGain: Calc = (v) => {
  const yrs = Z(v, "y", 0), sex = pick(v.s, 2), lb = pick(v.u, 2) === 0, rates = [24, 11, 5.5, 2.5], i = Math.min(3, Math.floor(yrs)), r = rates[i] * (sex === 1 ? 0.5 : 1);
  const show = (x: number) => (lb ? `${f(x)} lb` : `${f(x * 0.4536)} kg`);
  return { g: `Realistic muscle gain this year ≈ ${show(r)} (${show(r / 12)} a month)`, t: `Over the next 4 years ≈ ${show([0, 1, 2, 3].reduce((s, k) => s + rates[Math.min(3, i + k)] * (sex === 1 ? 0.5 : 1), 0))}`, note: `Year ${i + 1}${i === 3 ? "+" : ""} of proper training · Lyle McDonald's model for natural lifters: yr 1 20–25 lb, yr 2 10–12, yr 3 5–6, then 2–3 lb/yr (about half for women) · needs adequate protein and progressive overload` };
};
const metAct = (name: string, opts: [string, number][]): Calc => (v) => {
  const o = opts[pick(v.k, opts.length)], kg0 = P(v, "w", 70, "Weight"), lb = pick(v.u, 2) === 1, kg = lb ? kg0 / 2.20462 : kg0, min = P(v, "t", 60, "Minutes");
  const kcal = (o[1] * 3.5 * kg * min) / 200;
  return { c: `≈ ${f(Math.round(kcal))} kcal`, d: `${o[0]} (${f(o[1])} METs) for ${f(min)} min at ${f(kg)} kg`, note: `${name} MET values from the 2024 Compendium of Physical Activities · fitness trackers often read higher` };
};
export const yoga = metAct("Yoga", [["Hatha / gentle", 2.5], ["Restorative / yin", 2.0], ["Vinyasa / flow", 4.0], ["Power yoga", 4.0], ["Hot / Bikram", 5.0]]);
export const pilates = metAct("Pilates", [["Mat, beginner", 2.8], ["Mat, general", 3.0], ["Reformer, intermediate", 3.8], ["Advanced / fast", 4.5]]);
export const crossfit = metAct("CrossFit / circuit", [["WOD, moderate", 6.0], ["WOD, vigorous", 8.0], ["Circuit training, general", 4.3], ["Circuit training, vigorous", 8.0]]);
export const boxingCal = metAct("Boxing", [["Punching bag", 5.5], ["Sparring", 7.8], ["Competition / in the ring", 12.8], ["Cardio kickboxing class", 7.3]]);
export const dancing = metAct("Dancing", [["Ballroom, slow", 3.0], ["Ballroom, fast / swing", 5.5], ["General (social, ballet, modern)", 5.0], ["Aerobic / Zumba", 7.3], ["Hip-hop, vigorous", 7.8]]);

// ---- registry (generated)
export const ideaSpt3CustomCalculators: Record<string, Calc> = {
  "treadmill-incline-pace-equivalent-calculator": inclinePace,
  "heat-adjusted-pace-calculator": heatPace,
  "negative-split-pace-calculator": negSplit,
  "marathon-qualifying-time-calculator": bqTime,
  "boston-qualifier-buffer-calculator": bqBuffer,
  "running-weekly-mileage-increase-calculator": mileageRamp,
  "running-shoe-mileage-calculator": shoeMiles,
  "track-lap-time-calculator": trackLaps,
  "ultramarathon-pace-calculator": ultraPace,
  "trail-running-pace-adjustment-calculator": trailAdj,
  "running-calories-per-mile-calculator": calMile,
  "running-carb-fueling-calculator": raceFuel,
  "couch-to-5k-plan-calculator": c25k,
  "round-robin-bet-calculator": rrBet,
  "break-even-win-rate-betting-calculator": breakEven,
  "pick-6-ticket-cost-calculator": pick6,
  "mets-calories-calculator": mets,
  "pre-workout-meal-timing-calculator": preWorkout,
  "muscle-growth-potential-calculator": muscleGain,
  "trifecta-cost-calculator": trifecta,
  "exacta-box-cost-calculator": exacta,
  "superfecta-cost-calculator": superfecta,
  "lucky-15-bet-calculator": lucky15,
  "yankee-bet-calculator": yankee,
  "bench-press-strength-level-calculator": bench,
  "squat-strength-level-calculator": squat,
  "deadlift-strength-level-calculator": deadlift,
  "yoga-calories-calculator": yoga,
  "pilates-calories-calculator": pilates,
  "crossfit-calories-calculator": crossfit,
  "boxing-calories-calculator": boxingCal,
  "dancing-calories-calculator": dancing,
};
