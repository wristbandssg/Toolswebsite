/**
 * Idea build, batch spt2 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Sports > Other Sports (25) + Winter Sports (4) = 29 tools.
 * Formulas: TS% = PTS ÷ (2 × (FGA + 0.44 FTA)); eFG% = (FGM + 0.5 × 3PM) ÷ FGA; usage rate (Basketball-Reference); NFL passer rating
 * (four components capped 0–2.375); Concept2 watts = 2.80 ÷ (pace per metre)³; hull speed 1.34 × √LWL (ft) knots; SWOLF = time + strokes
 * per length; freefall ≈ 10 s for the first 1,000 ft then ~5.5 s per 1,000 ft at ~120 mph; IBJJF minimum adult belt times (blue 2 yrs,
 * purple 1.5, brown 1); rugby union 5/2/3/3 and league 4/2/1 scoring; pro boxing weight classes (WBC/WBA/IBF/WBO limits); climbing grade
 * equivalences (YDS ↔ French ↔ UIAA, approximate); 1 MOA = 1.047 in at 100 yd, 1 mil = 3.6 in at 100 yd; hockey skates ~1–1.5 sizes below
 * shoe size.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money } from "./trv-core";
import { txt, fmt } from "./sci-math-core";

const f = (x: number) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 4);
const $ = (x: number) => money(x, "$", 0);
const pc = (x: number, dp = 1) => `${(x * 100).toFixed(dp)}%`;
const P = (v: Record<string, number>, k: string, d: number, n: string) => { const x = num(v[k], d); if (!(x > 0)) throw new InputError(`${n} must be greater than 0.`); return x; };
const Z = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// ---- Basketball ----
export const fgPct: Calc = (v) => {
  const fgm = Z(v, "a", 8), fga = P(v, "b", 17, "FG attempts"), tpm = Z(v, "c", 2), tpa = Z(v, "d", 6), ftm = Z(v, "e", 4), fta = Z(v, "f", 5);
  return { f: `FG ${pc(fgm / fga)} · 3P ${tpa ? pc(tpm / tpa) : "—"} · FT ${fta ? pc(ftm / fta) : "—"}`, p: `${f(2 * (fgm - tpm) + 3 * tpm + ftm)} points on ${f(fgm)}/${f(fga)}, ${f(tpm)}/${f(tpa)}, ${f(ftm)}/${f(fta)}`, note: "NBA averages are roughly 47% FG, 36% from three and 78% FT · use true shooting % to compare scorers" };
};
export const tsPct: Calc = (v) => {
  const pts = P(v, "p", 25, "Points"), fga = Z(v, "a", 18), fta = Z(v, "t", 6), ts = pts / (2 * (fga + 0.44 * fta));
  return { t: `True shooting ${pc(ts)}`, r: ts >= 0.62 ? "Elite efficiency" : ts >= 0.58 ? "Very good" : ts >= 0.55 ? "About league average" : "Below average", note: "TS% = PTS ÷ (2 × (FGA + 0.44 × FTA)) — counts threes and free throws · NBA league average is around 57–58%" };
};
export const efg: Calc = (v) => {
  const fgm = Z(v, "a", 8), tpm = Z(v, "c", 3), fga = P(v, "b", 17, "FG attempts"), e = (fgm + 0.5 * tpm) / fga;
  return { e: `Effective FG% ${pc(e)}`, d: `Plain FG% ${pc(fgm / fga)} · threes add ${pc((0.5 * tpm) / fga)}`, note: "eFG% = (FGM + 0.5 × 3PM) ÷ FGA — a made three counts 1.5× · ignores free throws (use TS% for that)" };
};
export const usage: Calc = (v) => {
  const [fga, fta, tov, mp] = ["a", "b", "c", "d"].map((k, i) => Z(v, k, [18, 6, 3, 34][i])), [tfga, tfta, ttov, tmp] = ["e", "f", "g", "h"].map((k, i) => Z(v, k, [88, 22, 13, 240][i]));
  if (!(mp > 0 && tfga + 0.44 * tfta + ttov > 0)) throw new InputError("Enter minutes and team totals.");
  const u = (100 * ((fga + 0.44 * fta + tov) * (tmp / 5))) / (mp * (tfga + 0.44 * tfta + ttov));
  return { u: `Usage rate ${f(Math.round(u * 10) / 10)}%`, r: u >= 30 ? "Primary star usage (30%+)" : u >= 25 ? "High usage" : u >= 18 ? "Average role" : "Low-usage role player", note: "USG% = 100 × ((FGA + 0.44 FTA + TOV) × team minutes/5) ÷ (minutes × team (FGA + 0.44 FTA + TOV)) — share of team plays a player finishes while on the floor" };
};
// ---- Football & others ----
export const passer: Calc = (v) => {
  const c = Z(v, "c", 22), a = P(v, "a", 33, "Attempts"), y = num(v.y, 265), td = Z(v, "t", 2), i = Z(v, "i", 1), cl = (x: number) => Math.max(0, Math.min(2.375, x));
  const A = cl((c / a - 0.3) * 5), B = cl((y / a - 3) * 0.25), C = cl((td / a) * 20), D = cl(2.375 - (i / a) * 25), r = ((A + B + C + D) / 6) * 100;
  return { r: `NFL passer rating ${r.toFixed(1)}`, d: `${f(c)}/${f(a)} (${pc(c / a)}), ${f(y)} yards (${f(y / a)} Y/A), ${f(td)} TD, ${f(i)} INT`, note: "Scale 0–158.3 · 100+ is very good · college football uses a different formula (see the college passer rating tool)" };
};
export const ypc: Calc = (v) => {
  const y = num(v.y, 112), c = P(v, "c", 22, "Carries"), long = Z(v, "l", 0);
  return { y: `${f(y / c)} yards per carry`, x: long ? `Without the ${f(long)}-yard long run: ${f((y - long) / Math.max(1, c - 1))} YPC` : `${f(y)} yards on ${f(c)} carries`, note: "4.0+ YPC is solid for NFL running backs · one long run can inflate the average — check success rate too" };
};
export const plusMinus: Calc = (v) => {
  const gf = Z(v, "f", 18), ga = Z(v, "a", 12), ppg = Z(v, "p", 3), shg = Z(v, "s", 0), gp = Math.max(1, num(v.g, 20)), pm = gf - ga;
  return { p: `Plus/minus ${pm >= 0 ? "+" : ""}${f(pm)}`, d: `${f(pm / gp)} per game over ${f(gp)} games · counted ${f(gf)} for, ${f(ga)} against`, note: `Counts even-strength and shorthanded goals; power-play goals for (${f(ppg)} here) don't count${shg ? ` · ${f(shg)} shorthanded goals included` : ""} · heavily team-dependent — compare with on-ice shot share` };
};
export const possession: Calc = (v) => {
  const a = Z(v, "a", 520), b = Z(v, "b", 380), m = pick(v.m, 2);
  if (!(a + b > 0)) throw new InputError("Enter passes or minutes for both teams.");
  return { p: `Team A ${pc(a / (a + b), 0)} · Team B ${pc(b / (a + b), 0)}`, d: `${m === 0 ? "Based on completed passes" : "Based on time on the ball"}: ${f(a)} vs ${f(b)}`, note: "Opta-style possession is usually pass-based · possession alone doesn't win games — compare shots and xG" };
};
export const leagueTable: Calc = (v) => {
  const w = Z(v, "w", 18), d = Z(v, "d", 8), l = Z(v, "l", 6), wp = Z(v, "p", 3), dp = Z(v, "q", 1), gf = Z(v, "f", 55), ga = Z(v, "a", 30), left = Z(v, "x", 6);
  const pts = w * wp + d * dp, gp = w + d + l;
  return { p: `${f(pts)} points from ${f(gp)} games (${f(pts / Math.max(1, gp))} per game)`, g: `Goal difference ${gf - ga >= 0 ? "+" : ""}${f(gf - ga)} · max possible ${f(pts + left * wp)} with ${f(left)} games left`, note: `${f(wp)} for a win, ${f(dp)} for a draw · tiebreakers vary (goal difference, goals scored, head-to-head)` };
};
export const roundRobin: Calc = (v) => {
  const names = (txt(v, "t") || "Lions, Tigers, Bears, Wolves, Eagles, Hawks").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean), dbl = pick(v.d, 2) === 1;
  if (names.length < 2 || names.length > 30) throw new InputError("Enter 2 to 30 teams.");
  const tm = names.length % 2 ? [...names, "BYE"] : [...names], n = tm.length, rounds: string[] = [];
  for (let r = 0; r < n - 1; r++) { const games: string[] = []; for (let i = 0; i < n / 2; i++) { const a = tm[i], b = tm[n - 1 - i]; if (a !== "BYE" && b !== "BYE") games.push(r % 2 ? `${b} v ${a}` : `${a} v ${b}`); } rounds.push(`R${r + 1}: ${games.join(", ")}`); tm.splice(1, 0, tm.pop()!); }
  const games = (names.length * (names.length - 1)) / 2;
  return { s: rounds.slice(0, 12).join(" · ") + (rounds.length > 12 ? " …" : ""), n: `${rounds.length * (dbl ? 2 : 1)} rounds, ${games * (dbl ? 2 : 1)} games${dbl ? " (home and away)" : ""}`, note: "Circle method — every team plays every other team once; with an odd number of teams one team has a bye each round" };
};
export const tennisGrip: Calc = (v) => {
  const L = P(v, "l", 4.375, "Hand measurement"), cm = pick(v.u, 2) === 1, inch = cm ? L / 2.54 : L;
  const sizes = [[4, "L0 (4 in)"], [4.125, "L1 (4⅛ in)"], [4.25, "L2 (4¼ in)"], [4.375, "L3 (4⅜ in)"], [4.5, "L4 (4½ in)"], [4.625, "L5 (4⅝ in)"]] as const;
  const pickS = sizes.reduce((b, s) => (Math.abs(s[0] - inch) < Math.abs(b[0] - inch) ? s : b));
  return { g: `Grip size ${pickS[1]}`, d: `Measured ${f(inch)} in (${f(inch * 2.54)} cm) from the middle crease of the palm to the tip of the ring finger`, note: "Between sizes, pick the smaller one and add an overgrip (+1/16 in) · too small a grip can strain the elbow" };
};
export const pickleball: Calc = (v) => {
  const style = pick(v.s, 3), elbow = pick(v.e, 2) === 1, str = pick(v.p, 3);
  const w = style === 0 ? "7.3–7.8 oz (midweight)" : style === 1 ? "7.9–8.5 oz (heavier — more power)" : "6.8–7.3 oz (lighter — faster hands)";
  return { w: `Paddle weight ${elbow ? "7.5–8.0 oz (midweight, steadier on the elbow)" : w}`, d: `${["All-court player", "Power baseliner", "Soft game / net player"][style]} · ${["beginner", "intermediate", "advanced"][str]}`, note: "Heavier paddles add power and stability but tire the arm; lighter ones are quicker at the kitchen · try lead tape to fine-tune" };
};
export const moa: Calc = (v) => {
  const off = num(v.o, 3), dist = P(v, "d", 200, "Distance (yd)"), click = P(v, "c", 0.25, "Click value"), unit = pick(v.u, 2);
  const moaV = off / (1.047 * dist / 100), mil = off / (3.6 * dist / 100), clicks = unit === 0 ? moaV / click : mil / click;
  return { c: `Adjust ${f(Math.round(Math.abs(clicks)))} clicks ${off >= 0 ? "toward the impact correction (e.g. up/right)" : "the other way"}`, a: `${f(Math.abs(off))} in at ${f(dist)} yd = ${f(Math.abs(moaV))} MOA = ${f(Math.abs(mil))} mil`, note: `${unit === 0 ? `${f(click)} MOA per click` : `${f(click)} mil per click`} · 1 MOA ≈ 1.047 in at 100 yd, 1 mil ≈ 3.6 in at 100 yd · move the reticle toward where you want the bullet to go` };
};
export const swolf: Calc = (v) => {
  const t = P(v, "t", 30, "Seconds per length"), s = P(v, "s", 18, "Strokes per length"), pool = P(v, "p", 25, "Pool length");
  const sw = t + s, norm = (sw * 25) / pool;
  return { s: `SWOLF ${f(sw)}`, n: `${pool === 25 ? "" : `Normalised to 25 m: ${f(norm)} · `}pace ${mmss((t * 100) / pool)} per 100 m`, note: "SWOLF = time + strokes for one length — lower is more efficient · compare only in the same pool length and stroke" };
};
export const rowWatts: Calc = (v) => {
  const m = Z(v, "m", 2), s = Z(v, "s", 0), mode = pick(v.x, 2);
  if (mode === 0) { const pace = m * 60 + s; if (!(pace > 0)) throw new InputError("Enter a split."); const w = 2.8 / (pace / 500) ** 3; return { w: `${f(Math.round(w))} watts`, d: `${mmss(pace)} per 500 m`, note: "Concept2: watts = 2.80 ÷ (pace per metre)³ — halving the split takes 8× the power" }; }
  const W = P(v, "w", 200, "Watts"), pace = 500 * (2.8 / W) ** (1 / 3);
  return { w: `${mmss(pace)} per 500 m`, d: `${f(W)} W → 2,000 m in ${mmss(pace * 4)}`, note: "Concept2 conversion · calories on the monitor = 4 × watts × 0.8604 + 300 per hour" };
};
const GRADES: [string, string, string][] = [["5.6", "4", "V-"], ["5.7", "4+", "V"], ["5.8", "5a", "V+"], ["5.9", "5b/5c", "VI-"], ["5.10a", "6a", "VI"], ["5.10b", "6a+", "VI+"], ["5.10c", "6b", "VII-"], ["5.10d", "6b+", "VII"], ["5.11a", "6c", "VII+"], ["5.11b", "6c+", "VIII-"], ["5.11c", "7a", "VIII"], ["5.11d", "7a+", "VIII+"], ["5.12a", "7b", "IX-"], ["5.12b", "7b+", "IX-"], ["5.12c", "7c", "IX"], ["5.12d", "7c+", "IX+"], ["5.13a", "8a", "X-"], ["5.13b", "8a+", "X"], ["5.13c", "8b", "X+"], ["5.13d", "8b+", "XI-"], ["5.14a", "8c", "XI"], ["5.14b", "8c+", "XI+"], ["5.14c", "9a", "XI+/XII-"], ["5.14d", "9a+", "XII-"], ["5.15a", "9b", "XII"]];
export const climbGrade: Calc = (v) => {
  const i = pick(v.g, GRADES.length), [y, fr, ui] = GRADES[i];
  return { g: `YDS ${y} = French ${fr} = UIAA ${ui}`, d: i <= 3 ? "Beginner–intermediate" : i <= 11 ? "Intermediate" : i <= 19 ? "Advanced" : "Elite", note: "Sport-route conversions are approximate and vary by area and style · bouldering uses separate scales (V / Font)" };
};
export const hull: Calc = (v) => {
  const L = P(v, "l", 30, "Waterline length"), m = pick(v.u, 2) === 1, ft = m ? L * 3.28084 : L, k = P(v, "k", 1.34, "Speed–length ratio");
  const kt = k * Math.sqrt(ft);
  return { s: `Hull speed ≈ ${f(kt)} knots (${f(kt * 1.15078)} mph, ${f(kt * 1.852)} km/h)`, d: `LWL ${f(ft)} ft (${f(ft / 3.28084)} m) × speed–length ratio ${f(k)}`, note: "Displacement hulls struggle past ~1.34√LWL because they climb their own bow wave · planing hulls and multihulls can go faster" };
};
export const freefall: Calc = (v) => {
  const exit = P(v, "e", 13000, "Exit altitude (ft)"), dep = P(v, "d", 4000, "Deployment altitude (ft)"), pos = pick(v.p, 3), drop = exit - dep;
  if (drop <= 0) throw new InputError("Deployment must be below exit altitude.");
  const rate = [5.5, 4.2, 3.6][pos], t = drop <= 1000 ? drop / 100 : 10 + ((drop - 1000) / 1000) * rate;
  return { t: `≈ ${f(Math.round(t))} seconds of freefall`, d: `${f(drop)} ft of freefall from ${f(exit)} to ${f(dep)} ft`, note: `${["Belly (~120 mph)", "Sit-fly (~150 mph)", "Head-down (~180 mph)"][pos]} · ~10 s for the first 1,000 ft while accelerating · tandem jumps from 13,000–14,000 ft give about 60 s` };
};
export const glide: Calc = (v) => {
  const m = pick(v.m, 2), h = P(v, "h", 1000, "Height"), dist = Z(v, "d", 8500), gr = Z(v, "g", 9);
  if (m === 0) return { g: `Glide ratio ${f(dist / h)}:1`, d: `${f(dist)} m forward per ${f(h)} m of height lost`, note: "Beginner paragliders ≈ 8–9:1, high performance 10–12:1, hang gliders 12–15:1, sailplanes 40–70:1 (still air)" };
  return { g: `Still-air range ≈ ${f(h * gr / 1000)} km`, d: `From ${f(h)} m above landing at ${f(gr)}:1`, note: "Headwind cuts range a lot; tailwind extends it · always keep a safe margin to the landing field" };
};
const CLASSES: [number, string][] = [[105, "Minimumweight (strawweight)"], [108, "Light flyweight"], [112, "Flyweight"], [115, "Super flyweight"], [118, "Bantamweight"], [122, "Super bantamweight"], [126, "Featherweight"], [130, "Super featherweight"], [135, "Lightweight"], [140, "Super lightweight"], [147, "Welterweight"], [154, "Super welterweight"], [160, "Middleweight"], [168, "Super middleweight"], [175, "Light heavyweight"], [200, "Cruiserweight"], [224, "Bridgerweight (WBC/WBA)"], [9999, "Heavyweight"]];
export const boxing: Calc = (v) => {
  const w = P(v, "w", 150, "Weight"), kg = pick(v.u, 2) === 1, lb = kg ? w * 2.20462 : w, c = CLASSES.find(([lim]) => lb <= lim)!;
  return { c: `${c[1]}`, l: c[0] < 9999 ? `Limit ${f(c[0])} lb (${f(c[0] / 2.20462)} kg) · you're ${f(c[0] - lb)} lb under` : `Over 200 lb${lb <= 224 ? "" : " (over 224 lb)"} — no upper limit`, note: "Professional boxing limits (WBC/WBA/IBF/WBO) · amateur (Olympic) and MMA classes differ · weigh-ins are usually the day before" };
};
export const bjj: Calc = (v) => {
  const b = pick(v.b, 4), months = Z(v, "m", 0), age = Math.round(num(v.a, 25)), rules: [string, number, number][] = [["blue", 24, 16], ["purple", 18, 17], ["brown", 12, 18], ["black", 0, 19]];
  if (b === 3) return { n: "Black belt — degrees come every 3 years (first three) under IBJJF rules", t: "Coral belts begin after many decades at black belt", note: "IBJJF graduation system" };
  const [cur, min, minAge] = rules[b], next = rules[b + 1][0], left = Math.max(0, min - months), nextAge = rules[b + 1][2];
  return { n: `Earliest ${next} belt: ${left ? `${f(left)} months from now` : "now eligible on time"}`, t: `IBJJF minimum ${f(min / 12)} years at ${cur} belt · minimum age ${nextAge} for ${next}${age < nextAge ? ` (you're ${age})` : ""}`, note: "Minimum times only — most people take longer; typical white-to-black is 8–12 years · your instructor decides promotions" };
};
export const saves: Calc = (v) => {
  const s = Z(v, "s", 14), ga = Z(v, "g", 8), sv = s / Math.max(1, s + ga), mins = Z(v, "m", 60), len = P(v, "l", 60, "Game length");
  return { s: `Save percentage ${pc(sv)}`, g: `GAA ${f((ga / Math.max(1, mins)) * len)} · ${f(s)} saves on ${f(s + ga)} shots on goal`, note: "Lacrosse save % = saves ÷ shots on goal · 55%+ is strong in college lacrosse · GAA scaled to a full game" };
};
export const strikeRate: Calc = (v) => {
  const r = Z(v, "r", 45), b = P(v, "b", 36, "Balls faced"), outs = Z(v, "d", 10), runs = Z(v, "t", 450);
  return { s: `Strike rate ${f((r / b) * 100)}`, a: `${f(r)} runs off ${f(b)} balls${runs && outs ? ` · career batting average ${f(runs / outs)} (${f(runs)} runs, ${f(outs)} dismissals)` : ""}`, note: "Strike rate = runs ÷ balls × 100 · T20 strike rates above 140 are excellent; Test cricket values patience · average = runs ÷ dismissals" };
};
export const economy: Calc = (v) => {
  const ov = Z(v, "o", 4), bl = Z(v, "b", 0), r = Z(v, "r", 28), w = Z(v, "w", 2), balls = Math.round(ov) * 6 + bl + Math.round((ov % 1) * 10);
  if (!balls) throw new InputError("Enter overs bowled.");
  return { e: `Economy rate ${f((r / balls) * 6)} runs per over`, d: `${f(Math.floor(balls / 6))}.${balls % 6} overs, ${f(r)} runs, ${f(w)} wickets · strike rate ${w ? f(balls / w) : "—"} balls per wicket · average ${w ? f(r / w) : "—"}`, note: "Enter overs like 3.4 (3 overs, 4 balls) · under 7 is good in T20, under 3 in Tests" };
};
export const rugby: Calc = (v) => {
  const code = pick(v.c, 2), t = Z(v, "t", 3), c = Z(v, "k", 2), pen = Z(v, "p", 2), dg = Z(v, "d", 0), pt = Z(v, "x", 0);
  const pts = code === 0 ? t * 5 + c * 2 + pen * 3 + dg * 3 + pt * 7 : t * 4 + c * 2 + pen * 2 + dg;
  return { p: `${f(pts)} points`, d: code === 0 ? `Union: ${f(t)} tries × 5 + ${f(c)} conversions × 2 + ${f(pen)} penalties × 3 + ${f(dg)} drop goals × 3${pt ? ` + ${f(pt)} penalty tries × 7` : ""}` : `League: ${f(t)} tries × 4 + ${f(c)} goals × 2 + ${f(pen)} penalty goals × 2 + ${f(dg)} field goals × 1`, note: code === 0 ? "Bonus points (most leagues): +1 for 4+ tries, +1 for losing by 7 or less" : "Some competitions use 2-point field goals from 40 m+" };
};
// ---- Winter ----
export const skate: Calc = (v) => {
  const s = P(v, "s", 10, "Shoe size"), t = pick(v.t, 3), w = pick(v.w, 2);
  const sz = t === 0 ? s - 1.5 : t === 1 ? s - 0.5 : s;
  return { s: `Skate size ≈ ${f(sz)}`, d: `${["Hockey (Bauer/CCM ≈ 1–1.5 below US shoe)", "Figure (≈ ½ size below)", "Recreational / rental (≈ shoe size)"][t]} · ${["regular", "wide (look for EE / Fit 3)"][w]} foot`, note: "Fit should be snug with toes just brushing the cap · brand fit systems differ — use the brand's chart and try them on" };
};
export const liftPass: Calc = (v) => {
  const pass = P(v, "p", 900, "Season pass"), day = P(v, "d", 179, "Day ticket"), days = Z(v, "n", 8), disc = Z(v, "x", 0) / 100, extra = Z(v, "b", 0);
  const tick = days * day * (1 - disc), be = Math.ceil(pass / (day * (1 - disc)));
  return { r: tick > pass ? `Season pass saves ${$(tick - pass + extra)}` : `Day tickets are cheaper by ${$(pass - tick)}`, b: `Break-even at ${be} ski days · day tickets ${$(tick)} for ${f(days)} days`, note: `${extra ? `Includes ${$(extra)} of pass perks (buddy tickets, discounts) · ` : ""}walk-up prices at big resorts can exceed $250 — buy passes early (spring/fall)` };
};
export const vertical: Calc = (v) => {
  const runs = Z(v, "r", 15), vert = Z(v, "v", 1200), m = pick(v.u, 2) === 1, days = Math.max(1, num(v.d, 1)), tot = runs * vert * days;
  return { v: `${f(tot)} ${m ? "m" : "ft"} of vertical`, d: `${f(runs)} runs × ${f(vert)} ${m ? "m" : "ft"}${days > 1 ? ` × ${f(days)} days` : ""} = ${f(tot / (m ? 8849 : 29032))}× Everest`, note: "A typical resort day is 10,000–25,000 ft · lift wait times limit runs more than legs" };
};
export const curling: Calc = (v) => {
  const a = (txt(v, "a") || "1, 0, 2, 0, 1, 0, 3, 0").split(/[,\s]+/).filter(Boolean).map(Number), b = (txt(v, "b") || "0, 2, 0, 1, 0, 1, 0, 2").split(/[,\s]+/).filter(Boolean).map(Number);
  if (a.some((x) => !Number.isFinite(x)) || b.some((x) => !Number.isFinite(x))) throw new InputError("Enter ends like 1, 0, 2, 0.");
  const ta = a.reduce((s, x) => s + x, 0), tb = b.reduce((s, x) => s + x, 0), ends = Math.max(a.length, b.length);
  return { s: `Team A ${ta} — Team B ${tb}`, r: ta === tb ? "Tied — play an extra end" : `${ta > tb ? "Team A" : "Team B"} leads by ${Math.abs(ta - tb)} after ${ends} ends`, note: "Only one team scores per end (blank ends are 0–0) · the team that doesn't score usually gets the hammer next end" };
};

// ---- registry (generated)
export const ideaSpt2CustomCalculators: Record<string, Calc> = {
  "basketball-shooting-percentage-calculator": fgPct,
  "basketball-true-shooting-percentage-calculator": tsPct,
  "basketball-effective-fg-percentage-calculator": efg,
  "basketball-usage-rate-calculator": usage,
  "football-passer-rating-calculator": passer,
  "football-yards-per-carry-calculator": ypc,
  "hockey-plus-minus-calculator": plusMinus,
  "soccer-possession-percentage-calculator": possession,
  "league-table-points-calculator": leagueTable,
  "round-robin-schedule-calculator": roundRobin,
  "tennis-racket-grip-size-calculator": tennisGrip,
  "pickleball-paddle-weight-calculator": pickleball,
  "rifle-scope-moa-adjustment-calculator": moa,
  "swim-swolf-calculator": swolf,
  "rowing-watts-calculator": rowWatts,
  "climbing-grade-converter-calculator": climbGrade,
  "sailing-hull-speed-calculator": hull,
  "skydiving-freefall-time-calculator": freefall,
  "paragliding-glide-ratio-calculator": glide,
  "boxing-weight-class-calculator": boxing,
  "martial-arts-belt-timeline-calculator": bjj,
  "lacrosse-save-percentage-calculator": saves,
  "cricket-strike-rate-calculator": strikeRate,
  "cricket-bowling-economy-calculator": economy,
  "rugby-points-calculator": rugby,
  "ice-skate-size-calculator": skate,
  "lift-ticket-value-season-pass-calculator": liftPass,
  "ski-vertical-feet-per-day-calculator": vertical,
  "curling-score-calculator": curling,
};
