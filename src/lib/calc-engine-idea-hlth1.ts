/**
 * Idea build, batch hlth1 (18 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md): Health > Pregnancy & Baby (15) + Sleep & Everyday Health (25) = 40 tools.
 * Non-clinical, educational tools only — no medicine dosing. Sources for fixed figures:
 *  - Embryo transfer due date: day-5 blastocyst transfer + 261 days (day-3: + 263) = 266 days from conception.
 *  - CDC breast-milk storage: room temperature up to 4 h; refrigerator up to 4 days; freezer ~6 months best, up to 12 months;
 *    thawed milk 1–2 h at room temperature or 24 h in the fridge. Formula: ~2.5 oz per lb of body weight a day, max ~32 oz.
 *  - AASM sleep per 24 h: 4–12 mo 12–16 h, 1–2 y 11–14 h, 3–5 y 10–13 h, 6–12 y 9–12 h, 13–18 y 8–10 h; adults 7+ h.
 *  - ADA primary tooth eruption chart. Lactation: +330 kcal (0–6 mo) / +400 kcal (7–12 mo) (Dietary Guidelines).
 *  - Folic acid: 400 µg a day before and in early pregnancy (CDC/USPSTF); 600 µg DFE during pregnancy (RDA).
 *  - NIOSH noise REL: 85 dBA for 8 h with a 3 dB exchange rate. Erythemal UV: UV index 1 = 0.025 W/m²; minimal erythemal dose by
 *    Fitzpatrick type ≈ 200/250/350/450/600/1000 J/m². Sunscreen tested at 2 mg/cm² (≈ 1 oz / 30 mL for an adult body).
 *  - Body adiposity index = hip (cm) ÷ height (m)^1.5 − 18; ABSI = waist (m) ÷ (BMI^(2/3) × height (m)^(1/2)).
 *  - Vertex conversion: F_new = F ÷ (1 − d × F) with d in metres. Caffeine half-life ≈ 5 h.
 */

import { type TrvCalculator as Calc, InputError, num, pick, money, nfmt, dateIn, dayText } from "./trv-core";

const p = (v: Record<string, number>, k: string, d: number) => Math.max(0, num(v[k], d));
const need = (x: number, msg: string) => { if (!(x > 0)) throw new InputError(msg); return x; };
const pc = (x: number, dp = 0) => `${(x * 100).toFixed(dp)}%`;
const today = () => Math.floor(Date.now() / 86400000);
const clk = (h: number) => { const m = Math.round((((h % 24) + 24) % 24) * 60); const hh = Math.floor(m / 60) % 24, mm = m % 60; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`; };
const fC = (c: number) => `${nfmt(c, 1)} °C (${nfmt((c * 9) / 5 + 32, 1)} °F)`;

// ---- Pregnancy & baby ----
export const ivfDue: Calc = (v) => {
  const t = dateIn(v, "d", today() - 30), day3 = pick(v.k, 2) === 1, due = t + (day3 ? 263 : 261), lmp = due - 280, wk = (today() - lmp) / 7;
  return { due: `Due date ${dayText(due)}`, ga: wk > 0 && wk < 43 ? `${Math.floor(wk)} weeks ${Math.floor((wk % 1) * 7)} days pregnant today` : "—", note: `Day-${day3 ? 3 : 5} transfer on ${dayText(t)} · equivalent LMP ${dayText(lmp)} · only about 4–5% of babies arrive on their due date` };
};
const SIZE: [number, string, string, string][] = [[8, "raspberry", "1.6 cm", "1 g"], [10, "kumquat", "3.1 cm", "4 g"], [12, "lime", "5.4 cm", "14 g"], [14, "lemon", "8.7 cm", "43 g"], [16, "avocado", "11.6 cm", "100 g"], [18, "bell pepper", "14.2 cm", "190 g"], [20, "banana", "25.6 cm", "300 g"], [22, "papaya", "27.8 cm", "430 g"], [24, "ear of corn", "30 cm", "600 g"], [26, "lettuce head", "35.6 cm", "760 g"], [28, "eggplant", "37.6 cm", "1.0 kg"], [30, "cabbage", "39.9 cm", "1.3 kg"], [32, "squash", "42.4 cm", "1.7 kg"], [34, "cantaloupe", "45 cm", "2.1 kg"], [36, "honeydew", "47.4 cm", "2.6 kg"], [38, "pumpkin", "49.8 cm", "3.1 kg"], [40, "watermelon", "51.2 cm", "3.5 kg"]];
export const babySize: Calc = (v) => {
  const w = Math.min(42, Math.max(8, Math.round(p(v, "w", 20)))), s = [...SIZE].reverse().find((x) => w >= x[0]) ?? SIZE[0];
  return { size: `About the size of a ${s[1]}`, meas: `Typical length ${s[2]} · weight ${s[3]} (at ${s[0]} weeks${s[0] < 20 ? ", crown to rump" : ", head to heel"})`, note: "Averages only — babies vary; your scan measurements are what matter" };
};
export const kickCount: Calc = (v) => {
  const k = p(v, "k", 10), mins = need(p(v, "m", 45), "Enter minutes counted."), wk = p(v, "w", 30);
  if (wk < 28) return { r: "Kick counting is usually started from 28 weeks", rate: "—", note: "Before then, movements are irregular — tell your midwife if you notice reduced movement" };
  const ok = k >= 10 && mins <= 120;
  return { r: ok ? `${nfmt(k)} movements in ${nfmt(mins)} minutes — that meets the 10-in-2-hours guide` : k >= 10 ? `10 movements took ${nfmt(mins)} minutes — longer than 2 hours` : `${nfmt(k)} movements in ${nfmt(mins)} minutes`, rate: `${nfmt((k / mins) * 60, 1)} movements an hour`, note: ok ? "Learn your baby's normal pattern and count at the same time each day" : "Contact your maternity unit now if movements are reduced or have changed — don't wait until tomorrow" };
};
export const contractions: Calc = (v) => {
  const iv = need(p(v, "i", 5), "Enter minutes between contraction starts."), len = need(p(v, "l", 60), "Enter contraction length (seconds)."), hr = p(v, "h", 1), first = pick(v.f, 2) === 0;
  const meets = iv <= 5 && len >= 60 && hr >= 1;
  return { r: meets ? "5-1-1 pattern reached — call your hospital or midwife" : `Every ${nfmt(iv, 1)} min, lasting ${nfmt(len, 0)} s, for ${nfmt(hr, 1)} h`, rule: first ? "First baby: go in when contractions are 5 minutes apart, last 1 minute, for 1 hour (5-1-1)" : "Not your first baby: labour can be faster — many units advise calling at 7–10 minutes apart", note: "Call straight away for waters breaking, bleeding, reduced movements or severe pain" };
};
export const matLeave: Calc = (v) => {
  const due = dateIn(v, "d", today() + 90), before = p(v, "b", 2), weeks = need(p(v, "w", 12), "Enter total weeks of leave.");
  const start = Math.round(due - before * 7), end = Math.round(start + weeks * 7);
  return { s: `Leave starts ${dayText(start)}`, e: `Returns ${dayText(end)} (${nfmt(weeks, 0)} weeks total)`, note: "If the baby comes early, leave usually starts the day after birth · US FMLA gives up to 12 weeks unpaid job-protected leave; paid leave depends on your state, country and employer" };
};
export const bfCalories: Calc = (v) => {
  const base = need(p(v, "b", 2000), "Enter your usual calorie needs."), m = pick(v.m, 2), ex = pick(v.e, 3);
  const add = (m === 0 ? 330 : 400) * [1, 0.6, 0.3][ex];
  return { k: `${nfmt(base + add, 0)} kcal a day`, add: `+${nfmt(add, 0)} kcal for ${["exclusive", "mostly", "partial"][ex]} breastfeeding (${m === 0 ? "0–6" : "7–12"} months)`, note: "Drink to thirst (about 13 cups of fluid a day) · keep taking an iodine-containing prenatal vitamin if advised" };
};
const STORE: [string, string, string][] = [["Freshly expressed — room temperature (≤ 25 °C / 77 °F)", "Up to 4 hours", "Use within 4 hours"], ["Freshly expressed — refrigerator (4 °C / 40 °F)", "Up to 4 days", "Use within 4 days"], ["Freshly expressed — freezer (−18 °C / 0 °F)", "Best within 6 months, up to 12 months", "Label with date"], ["Thawed — room temperature", "1–2 hours", "Don't refreeze"], ["Thawed — refrigerator", "Up to 24 hours", "Count from when fully thawed"], ["Leftover from a feed", "Within 2 hours of the baby finishing", "Then discard"]];
export const milkStorage: Calc = (v) => {
  const s = STORE[pick(v.s, STORE.length)], made = dateIn(v, "d", today());
  return { t: s[1], how: `${s[0]} · ${s[2]}`, note: `Expressed on ${dayText(made)} · CDC guidance for healthy full-term babies; hospital guidance for premature or sick babies is stricter` };
};
export const formulaAmt: Calc = (v) => {
  const lb = need(p(v, "w", 10), "Enter baby's weight."), kg = pick(v.u, 2) === 1, w = kg ? lb * 2.2046 : lb, age = p(v, "a", 6);
  const oz = Math.min(32, w * 2.5), feeds = age < 4 ? 8 : age < 12 ? 7 : age < 26 ? 6 : 5;
  return { oz: `≈ ${nfmt(oz, 1)} oz (${nfmt(oz * 29.57, 0)} mL) formula a day`, per: `About ${nfmt(oz / feeds, 1)} oz per feed × ${feeds} feeds`, note: "Rule of thumb: 2.5 oz per lb a day, rarely more than 32 oz · follow your baby's hunger cues and your paediatrician's advice; solids reduce formula from about 6 months" };
};
export const feedSched: Calc = (v) => {
  const wk = p(v, "w", 6), bf = pick(v.t, 2) === 0;
  const r = wk < 4 ? (bf ? ["8–12 feeds a day", "every 2–3 hours", "on demand"] : ["2–3 oz per feed", "every 3–4 hours", "about 6–8 feeds"]) : wk < 13 ? (bf ? ["8–10 feeds a day", "every 2–4 hours", "longer stretch at night"] : ["4–5 oz per feed", "every 3–4 hours", "about 6 feeds"]) : wk < 26 ? (bf ? ["6–8 feeds a day", "every 3–4 hours", ""] : ["4–6 oz per feed", "every 4 hours", "about 5–6 feeds"]) : (bf ? ["4–6 feeds a day + solids", "", "solids 2–3 times a day"] : ["6–8 oz per feed", "4–5 feeds a day", "plus solids"]);
  return { s: `${r[0]}${r[1] ? ` · ${r[1]}` : ""}`, more: r[2] || "—", note: `At ${nfmt(wk, 0)} weeks (${bf ? "breastfed" : "formula-fed"}) · signs of enough milk: 6+ wet nappies a day and steady weight gain` };
};
export const newbornLoss: Calc = (v) => {
  const bw = need(p(v, "b", 3400), "Enter birth weight."), cw = need(p(v, "c", 3150), "Enter current weight."), d = p(v, "d", 3);
  const loss = 1 - cw / bw;
  return { l: `${pc(loss, 1)} ${loss >= 0 ? "below" : "above"} birth weight`, read: loss > 0.1 ? "More than 10% — contact your paediatrician or midwife today" : loss > 0.07 ? "7–10% — common in breastfed babies but worth a feeding check" : "Within the normal range (up to about 7%)", note: `Day ${nfmt(d, 0)} · most babies regain birth weight by 10–14 days` };
};
const SLEEP: [number, string, string, string][] = [[3, "14–17 h (newborn)", "4–5+ naps, wake windows 45–60 min", "no set schedule yet"], [12, "12–16 h", "3–4 naps → 2 naps by 9 months, wake windows 1.5–3 h", "bedtime 6:30–8 pm"], [24, "11–14 h", "1–2 naps, wake windows 3–5 h", "bedtime 7–8 pm"], [60, "10–13 h", "0–1 nap", "bedtime 7–8:30 pm"], [144, "9–12 h", "no naps", "bedtime 7:30–9 pm"], [216, "8–10 h", "no naps", "consistent wake time helps"]];
export const babySleep: Calc = (v) => {
  const m = p(v, "m", 8), s = SLEEP.find((x) => m < x[0]) ?? SLEEP[SLEEP.length - 1];
  return { tot: `${s[1]} of sleep per 24 hours`, naps: s[2], bed: `${s[3]} · American Academy of Sleep Medicine guidance for ${nfmt(m, 0)} months` };
};
const TEETH: [string, number, number][] = [["Lower central incisors", 6, 10], ["Upper central incisors", 8, 12], ["Upper lateral incisors", 9, 13], ["Lower lateral incisors", 10, 16], ["Upper first molars", 13, 19], ["Lower first molars", 14, 18], ["Upper canines", 16, 22], ["Lower canines", 17, 23], ["Lower second molars", 23, 31], ["Upper second molars", 25, 33]];
export const teething: Calc = (v) => {
  const m = p(v, "m", 9), next = TEETH.filter((t) => t[1] > m).slice(0, 2), done = TEETH.filter((t) => t[1] <= m).length * 2;
  return { now: next.length ? `Next: ${next.map((t) => `${t[0]} (${t[1]}–${t[2]} months)`).join(" · ")}` : "All 20 baby teeth are usually in by about 33 months", cnt: `By ${nfmt(m, 0)} months, about ${Math.min(20, done)} teeth would usually be through`, note: "ADA eruption chart — anywhere within a few months is normal · start brushing with a rice-grain smear of fluoride toothpaste at the first tooth" };
};
export const bbtOvulation: Calc = (v) => {
  const t = [p(v, "t1", 36.3), p(v, "t2", 36.4), p(v, "t3", 36.3), p(v, "t4", 36.35), p(v, "t5", 36.3), p(v, "t6", 36.4), p(v, "t7", 36.65), p(v, "t8", 36.7), p(v, "t9", 36.7)].filter((x) => x > 30);
  if (t.length < 9) throw new InputError("Enter 9 consecutive morning temperatures (°C).");
  let shift = -1, cover = 0;
  for (let i = 6; shift < 0 && i + 2 < t.length; i++) { const base = Math.max(...t.slice(i - 6, i)); if (t[i] > base && t[i + 1] > base && t[i + 2] >= base + 0.2) { shift = i; cover = base + 0.05; } }
  return { r: shift >= 0 ? `Temperature shift on day ${shift + 1} — ovulation most likely around day ${shift}` : "No clear thermal shift yet", line: shift >= 0 ? `Coverline ${fC(cover)} (just above the highest of the 6 previous days)` : "Look for 3 days above the previous 6, with the third at least 0.2 °C higher", note: "BBT confirms ovulation after it happens — combine with cervical mucus or LH tests to predict fertile days" };
};
export const postPill: Calc = (v) => {
  const stop = dateIn(v, "d", today() - 14), m = pick(v.m, 3), avg = [14, 28, 90][m];
  return { r: `Ovulation could return from about ${dayText(stop + avg)}`, how: `${["Combined pill / mini-pill", "Patch or ring", "Contraceptive injection"][m]} stopped ${dayText(stop)}`, note: m === 2 ? "After the injection, fertility can take 6–12 months (sometimes longer) to return" : "Most people ovulate within 1–3 months after stopping the pill — you can get pregnant in the first cycle, so use other contraception if you don't want to" };
};
export const postpartumPeriod: Calc = (v) => {
  const b = dateIn(v, "d", today() - 30), f = pick(v.f, 3);
  const r = [[42, 84, "Not breastfeeding: usually 6–8 weeks after birth (can be as early as 4)"], [90, 270, "Partly breastfeeding or with formula top-ups: often 3–6 months"], [180, 540, "Exclusive breastfeeding (including nights): often 6+ months, sometimes until weaning"]][f] as [number, number, string];
  return { r: `Likely between ${dayText(b + r[0])} and ${dayText(b + r[1])}`, why: r[2], note: "Ovulation comes before the first period, so you can get pregnant before it returns · first periods may be heavier or irregular" };
};
export const folate: Calc = (v) => {
  const s = pick(v.s, 3);
  return { r: s === 0 ? "400 µg folic acid a day" : s === 1 ? "400 µg folic acid a day (600 µg DFE total from food + supplements)" : "500 µg DFE a day from food and supplements", why: s === 0 ? "Start at least 1 month before trying to conceive — neural tube closes by 4 weeks of pregnancy" : s === 1 ? "Keep taking it through pregnancy; most prenatal vitamins contain 400–800 µg" : "Breastfeeding RDA", note: "Some people (previous neural tube defect, certain medicines, diabetes, high BMI) are advised a higher dose — ask your doctor or midwife" };
};

// ---- Sleep ----
export const sleepEff: Calc = (v) => {
  const bed = need(p(v, "b", 8), "Enter hours in bed."), asl = p(v, "a", 6.8), e = asl / bed;
  return { e: `${pc(e, 1)} sleep efficiency`, read: e >= 0.85 ? "Good (85% or more)" : e >= 0.75 ? "Fair — some time awake in bed" : "Low — spend less time awake in bed (stimulus control)", note: `${nfmt(bed - asl, 2)} h awake in bed · CBT-I uses sleep efficiency to set your time-in-bed window` };
};
export const napLen: Calc = (v) => {
  const start = p(v, "s", 13.5), t = pick(v.t, 3), [m, why] = [[20, "Power nap: alertness without grogginess (stay in light sleep)"], [60, "Includes deep sleep — good for memory, but expect grogginess"], [90, "A full sleep cycle — wake naturally refreshed, but can affect night sleep"]][t] as [number, string];
  return { wake: `Set an alarm for ${clk(start + (m + 10) / 60)}`, how: `${m} minutes + ~10 minutes to fall asleep · ${why}`, note: start >= 16 ? "Napping after about 3–4 pm can make it harder to fall asleep tonight" : "Best nap window is early afternoon (1–3 pm)" };
};
export const shiftSleep: Calc = (v) => {
  const end = p(v, "e", 7), start = p(v, "s", 19), hrs = p(v, "h", 7.5);
  const sleep = end + 1, wake = sleep + hrs, anchor = sleep + 4;
  return { s: `Sleep ${clk(sleep)} – ${clk(wake)} after your shift`, n: `Optional 20–30 minute nap around ${clk(start - 2)} before the next shift`, tips: `Keep at least 4 hours (${clk(sleep)}–${clk(anchor)}) fixed on days off as an anchor · dark glasses on the way home, blackout room, caffeine only in the first half of the shift` };
};
export const caffCutoff: Calc = (v) => {
  const bed = p(v, "b", 23), mg = need(p(v, "mg", 95), "Enter caffeine per drink (mg)."), lim = p(v, "l", 25), hl = p(v, "hl", 5) || 5;
  const hrs = Math.max(0, (hl * Math.log(mg / Math.max(lim, 1))) / Math.log(2));
  return { t: `Last caffeine by ${clk(bed - hrs)}`, how: `${nfmt(mg, 0)} mg falls to ${nfmt(lim, 0)} mg in ${nfmt(hrs, 1)} hours (half-life ${nfmt(hl, 1)} h)`, note: "Sleep researchers commonly suggest stopping caffeine 6–8 hours before bed · pregnancy and some medicines lengthen the half-life" };
};
export const melatonin: Calc = (v) => {
  const bed = p(v, "b", 23), g = pick(v.g, 3);
  const t = g === 0 ? bed - 1 : g === 1 ? bed - 3 : bed - 1;
  return { t: `Take it around ${clk(t)}`, why: ["Trouble falling asleep: 30–60 minutes before bed", "Shifting your body clock earlier (night owl): 3–5 hours before your usual sleep time", "Jet lag (travelling east): around the new local bedtime for a few days"][g], note: "Timing guide only — ask a pharmacist or doctor about dose and whether melatonin suits you (pregnancy, children, other medicines)" };
};
// ---- Body measures ----
export const bai: Calc = (v) => {
  const hip = need(p(v, "h", 100), "Enter hip circumference (cm)."), ht = need(p(v, "ht", 170), "Enter height (cm).") / 100, f = pick(v.s, 2) === 1, x = hip / Math.pow(ht, 1.5) - 18;
  const r = f ? (x < 21 ? "Underweight range" : x < 33 ? "Healthy range" : x < 39 ? "Overweight range" : "Obese range") : x < 8 ? "Underweight range" : x < 21 ? "Healthy range" : x < 26 ? "Overweight range" : "Obese range";
  return { b: `BAI ${nfmt(x, 1)}% body fat`, r: `${r} for ${f ? "women" : "men"} aged 20–39 (Gallagher ranges)`, note: "BAI estimates body fat from hips and height only — less accurate for very lean or very muscular people" };
};
export const absi: Calc = (v) => {
  const w = need(p(v, "w", 90), "Enter waist (cm).") / 100, ht = need(p(v, "ht", 175), "Enter height (cm).") / 100, kg = need(p(v, "kg", 80), "Enter weight (kg)."), bmi = kg / (ht * ht);
  const x = w / (Math.pow(bmi, 2 / 3) * Math.sqrt(ht));
  return { a: `ABSI ${nfmt(x, 4)}`, b: `BMI ${nfmt(bmi, 1)} · waist-to-height ${nfmt(w / ht, 2)} (aim below 0.5)`, note: "A higher ABSI means more weight carried around the waist for your BMI; typical adult values are about 0.07–0.09 · compare with age- and sex-specific z-scores" };
};
export const pulsePressure: Calc = (v) => {
  const s = need(p(v, "s", 120), "Enter systolic pressure."), d = need(p(v, "d", 80), "Enter diastolic pressure."), pp = s - d, map = d + pp / 3;
  return { pp: `${nfmt(pp, 0)} mmHg pulse pressure`, map: `Mean arterial pressure ${nfmt(map, 0)} mmHg`, read: pp > 60 ? "Wide (over 60) — common with ageing and stiff arteries; discuss with your doctor" : pp < 25 ? "Narrow (under 25 mmHg) — recheck and discuss with your doctor" : "Typical (40–60 mmHg)" };
};
export const rhrFit: Calc = (v) => {
  const r = need(p(v, "r", 68), "Enter resting heart rate."), f = pick(v.s, 2) === 1, a = p(v, "a", 40), adj = a < 36 ? 0 : a < 56 ? 1 : 2;
  const cut = (f ? [[61, 66, 70, 74, 79], [62, 67, 71, 76, 81], [62, 67, 72, 77, 81]] : [[56, 62, 66, 71, 76], [58, 63, 67, 72, 77], [58, 63, 68, 73, 78]])[adj];
  const lbl = ["Excellent / athlete", "Good", "Above average", "Average", "Below average", "Poor"], i = cut.findIndex((c) => r < c);
  return { r: lbl[i < 0 ? 5 : i], hr: `${nfmt(r, 0)} bpm resting`, note: "Measure on waking, before getting up · normal adult range is 60–100 bpm; a resting rate that's very high or low with symptoms needs medical advice" };
};
export const hrr: Calc = (v) => {
  const peak = need(p(v, "p", 165), "Enter peak heart rate."), m1 = need(p(v, "m", 140), "Enter heart rate 1 minute later."), d = peak - m1;
  return { d: `${nfmt(d, 0)} bpm heart rate recovery at 1 minute`, read: d < 12 ? "Under 12 bpm — slower than typical; worth discussing with your doctor" : d < 20 ? "Typical (12–20)" : "Good — faster recovery is linked to better fitness", note: "Measure after stopping hard exercise (standing still or cooling down slowly), counting for 1 minute" };
};
const URINE: [string, string][] = [["Clear / transparent", "Well hydrated — you may be drinking more than needed"], ["Pale straw", "Well hydrated"], ["Light yellow", "Normal, hydrated"], ["Yellow", "Normal — drink a glass of water soon"], ["Dark yellow", "Mildly dehydrated — drink water now"], ["Amber / honey", "Dehydrated — drink water now"], ["Brown / cola", "Severely dehydrated or a medical cause — seek medical advice if it doesn't clear with fluids"]];
export const urine: Calc = (v) => {
  const u = URINE[pick(v.c, URINE.length)];
  return { r: u[1], c: u[0], note: "B vitamins, beetroot and some medicines change urine colour · red, pink or brown urine that isn't from food needs medical advice" };
};
export const fever: Calc = (v) => {
  const t = need(p(v, "t", 38.2), "Enter the temperature."), f = pick(v.u, 2) === 1, c = f ? ((t - 32) * 5) / 9 : t, inf = pick(v.a, 3);
  const read = c >= 40 ? "High fever (40 °C / 104 °F or more) — seek medical advice" : c >= 38 ? "Fever (38 °C / 100.4 °F or more)" : c >= 37.5 ? "Slightly raised" : c < 35 ? "Low (hypothermia range) — warm up and seek advice" : "Normal";
  return { c: `${fC(c)}`, r: read, note: inf === 0 ? "Babies under 3 months with 38 °C or more need urgent medical advice" : inf === 1 ? "Children: watch for drowsiness, rash, breathing trouble or dehydration" : "Adults: see a doctor for fever over 3 days, stiff neck, confusion or breathing trouble" };
};
export const medSchedule: Calc = (v) => {
  const n = Math.max(1, Math.min(8, Math.round(p(v, "n", 3)))), w = p(v, "w", 7), s = p(v, "s", 22), round = pick(v.r, 2) === 0;
  const span = round ? 24 : ((s - w + 24) % 24) || 16, gap = round ? 24 / n : n > 1 ? span / (n - 1) : 0;
  const times = Array.from({ length: n }, (_, i) => clk(w + i * gap));
  return { t: times.join(" · "), gap: round ? `Every ${nfmt(gap, 1)} hours around the clock` : `Spread over waking hours (${clk(w)}–${clk(s)}), about ${nfmt(gap, 1)} h apart`, note: "Follow the label or your prescriber's instructions — '3 times a day' doesn't always mean every 8 hours" };
};
export const pillSupply: Calc = (v) => {
  const n = need(p(v, "n", 90), "Enter pills on hand."), per = need(p(v, "p", 2), "Enter pills per day."), refill = p(v, "r", 7), d = n / per, start = dateIn(v, "d", today());
  return { d: `${nfmt(Math.floor(d))} days supply — runs out ${dayText(start + Math.floor(d))}`, re: `Request a refill by ${dayText(start + Math.floor(d) - refill)} (${nfmt(refill, 0)} days ahead)`, note: `${nfmt(per, 1)} a day · many insurers allow refills when about 75–80% of the supply is used` };
};
export const noise: Calc = (v) => {
  const db = need(p(v, "db", 94), "Enter the sound level (dBA)."), t = 8 / Math.pow(2, (db - 85) / 3), h = p(v, "h", 0);
  return { t: t >= 1 ? `${nfmt(t, 1)} hours a day safe exposure` : `${nfmt(t * 60, 0)} minutes a day safe exposure`, dose: h > 0 ? `${nfmt((h / t) * 100, 0)}% of the daily noise dose for ${nfmt(h, 1)} h` : "Every 3 dB more halves the safe time", note: "NIOSH limit: 85 dBA for 8 hours (3 dB exchange) · e.g. a concert (~105 dBA) is safe for under 5 minutes without protection" };
};
export const eyeBreak: Calc = (v) => {
  const h = need(p(v, "h", 8), "Enter screen hours a day."), b = Math.floor((h * 60) / 20);
  return { b: `${nfmt(b)} breaks: every 20 minutes look 20 feet (6 m) away for 20 seconds`, t: `Adds up to ${nfmt((b * 20) / 60, 0)} minutes of eye rest a day`, note: "Also blink fully, keep the screen an arm's length away and slightly below eye level · persistent eye strain or headaches warrant an eye test" };
};
const tr = (x: number) => (x >= 0 ? `+${x.toFixed(2)}` : x.toFixed(2));
export const rxConvert: Calc = (v) => {
  const s = num(v.s, -2), c = num(v.c, -1), a = Math.round(p(v, "a", 90));
  return { rx: `${tr(s + c)} ${tr(-c)} × ${((a + 90 - 1) % 180) + 1}`, orig: `Original ${tr(s)} ${tr(c)} × ${a} (${c < 0 ? "minus" : "plus"}-cylinder form)`, se: `Spherical equivalent ${tr(s + c / 2)} D · same prescription, written the other way (optometrists use minus cyl, ophthalmologists often plus cyl)` };
};
export const vertex: Calc = (v) => {
  const s = num(v.s, -6), c = num(v.c, 0), d = p(v, "d", 12) / 1000, cv = (F: number) => F / (1 - d * F);
  const s2 = cv(s), c2 = cv(s + c) - s2;
  return { cl: `Contact lens power ≈ ${tr(Math.round(s2 * 4) / 4)}${c ? ` ${tr(Math.round(c2 * 4) / 4)} cyl` : ""} D`, how: `Spectacle ${tr(s)}${c ? ` ${tr(c)}` : ""} at ${nfmt(d * 1000, 0)} mm vertex distance → corneal plane`, note: Math.abs(s) < 4 ? "Under ±4.00 D the change is negligible" : "Contact lenses must be fitted and prescribed by an eye-care professional" };
};
const MED = [200, 250, 350, 450, 600, 1000];
export const sunburn: Calc = (v) => {
  const uv = need(p(v, "u", 8), "Enter the UV index."), st = pick(v.t, 6), spf = Math.max(1, p(v, "spf", 1)), t = MED[st] / (uv * 0.025 * 60);
  return { t: `≈ ${nfmt(t, 0)} minutes to start burning unprotected`, spf: spf > 1 ? `With SPF ${nfmt(spf, 0)} applied properly: in theory ≈ ${nfmt((t * spf) / 60, 1)} hours — in practice reapply every 2 hours` : "Wear SPF 30+ when the UV index is 3 or more", note: `Skin type ${["I", "II", "III", "IV", "V", "VI"][st]} · UV index ${nfmt(uv, 0)}${uv >= 8 ? " is very high — seek shade 10 am–4 pm" : ""} · rough estimate; children burn faster` };
};
export const sunscreen: Calc = (v) => {
  const a = pick(v.a, 3), n = Math.max(1, Math.round(p(v, "n", 1))), h = p(v, "h", 6), sw = pick(v.s, 2) === 1;
  const ml = [30, 15, 2.5][a], apps = Math.max(1, Math.ceil(h / (sw ? 1.33 : 2)));
  return { amt: `${nfmt(ml, 1)} mL per application (${["about a shot glass for the whole body", "about a tablespoon for a child", "½ teaspoon for face and neck"][a]})`, tot: `${nfmt(ml * apps * n, 0)} mL for ${apps} applications × ${n} ${n > 1 ? "people" : "person"} (${nfmt((ml * apps * n) / 29.57, 1)} oz)`, note: `Reapply every ${sw ? "40–80 minutes when swimming or sweating" : "2 hours"} · SPF is tested at 2 mg/cm² — most people apply half that` };
};
const INC: [string, number, number, string][] = [["Influenza", 1, 4, "days"], ["COVID-19", 2, 14, "days (often 3–5)"], ["Common cold", 1, 3, "days"], ["Norovirus", 0.5, 2, "days"], ["Strep throat", 2, 5, "days"], ["Chickenpox", 10, 21, "days"], ["Measles", 7, 21, "days (rash ~14)"], ["Mumps", 12, 25, "days"], ["Salmonella", 0.25, 6, "days"], ["Hepatitis A", 15, 50, "days"], ["Mononucleosis (glandular fever)", 28, 42, "days"]];
export const incubation: Calc = (v) => {
  const d = INC[pick(v.d, INC.length)], ex = dateIn(v, "e", today() - 2);
  return { w: `Symptoms most likely ${dayText(ex + Math.floor(d[1]))} – ${dayText(ex + Math.ceil(d[2]))}`, inc: `${d[0]} incubation: ${d[1]}–${d[2]} ${d[3]}`, note: "Typical ranges from public-health references — follow local health advice on testing and isolation, and seek care for severe symptoms" };
};
export const hospital: Calc = (v) => {
  const n = need(p(v, "n", 3), "Enter nights in hospital."), rate = p(v, "r", 3000), ex = p(v, "x", 6000), ded = p(v, "dd", 2000), co = p(v, "co", 20) / 100, oop = p(v, "oop", 6000);
  const bill = n * rate + ex, you = Math.min(oop, Math.min(bill, ded) + Math.max(0, bill - ded) * co);
  return { bill: `${money(bill, "$", 0)} estimated bill`, you: `You pay ≈ ${money(you, "$", 0)} (deductible ${money(Math.min(bill, ded), "$", 0)} + ${pc(co)} coinsurance, capped at ${money(oop, "$", 0)})`, note: "Ask for an itemised bill and a Good Faith Estimate for planned care · in-network rates and prior authorisation make a big difference" };
};
export const billNegotiate: Calc = (v) => {
  const b = need(p(v, "b", 4000), "Enter the bill."), d = p(v, "d", 30) / 100, cash = p(v, "c", 10) / 100, plan = p(v, "m", 12);
  const neg = b * (1 - d), lump = neg * (1 - cash);
  return { s: `Negotiated ≈ ${money(neg, "$", 0)} (save ${money(b - neg, "$", 0)})`, pay: `Pay in full ≈ ${money(lump, "$", 0)} with a ${pc(cash)} prompt-pay discount · or ${money(neg / Math.max(plan, 1), "$", 0)} a month over ${nfmt(plan, 0)} months, interest-free`, note: "Ask for an itemised bill, check for errors and duplicate charges, and ask about financial assistance (charity care) at non-profit hospitals" };
};
export const braces: Calc = (v) => {
  const c = need(p(v, "c", 6000), "Enter treatment cost."), ins = p(v, "i", 1500), dn = p(v, "d", 1000), m = need(p(v, "m", 24), "Enter months."), r = p(v, "r", 0) / 1200, hsa = p(v, "h", 0) / 100;
  const fin = Math.max(0, c - ins - dn), pm = r ? (fin * r) / (1 - Math.pow(1 + r, -m)) : fin / m;
  return { pm: `${money(pm)} a month for ${nfmt(m, 0)} months`, tot: `You pay ${money(c - ins, "$", 0)} after insurance (${money(dn, "$", 0)} down) · total with interest ${money(dn + pm * m, "$", 0)}`, tax: hsa > 0 ? `Paying from an HSA/FSA saves about ${money((c - ins) * hsa, "$", 0)} at ${pc(hsa)} tax` : "Orthodontic insurance usually has a lifetime maximum ($1,000–$3,000)" };
};
export const lasik: Calc = (v) => {
  const l = need(p(v, "l", 4500), "Enter LASIK cost (both eyes)."), g = p(v, "g", 250), cl = p(v, "cl", 400), ex = p(v, "ex", 100), y = p(v, "y", 20);
  const yr = g + cl + ex, be = yr > 0 ? l / yr : Infinity;
  return { be: Number.isFinite(be) ? `LASIK pays for itself in about ${nfmt(be, 1)} years` : "Enter yearly glasses/contacts costs", tot: `Glasses/contacts over ${nfmt(y, 0)} years ≈ ${money(yr * y, "$", 0)} vs LASIK ${money(l, "$", 0)} — ${money(yr * y - l, "$", 0)} difference`, note: "You may still need reading glasses after about 45 (presbyopia) · candidacy and risks need an eye surgeon's assessment" };
};
export const therapy: Calc = (v) => {
  const fee = need(p(v, "f", 150), "Enter the session fee."), n = p(v, "n", 24), ins = pick(v.i, 3), co = p(v, "co", 30), oon = p(v, "o", 60) / 100, ded = p(v, "d", 500);
  const per = ins === 0 ? fee : ins === 1 ? co : fee * (1 - oon), year = ins === 2 ? Math.min(n * fee, ded) + Math.max(0, n * fee - ded) * (1 - oon) : per * n;
  return { s: `${money(per)} per session`, y: `≈ ${money(year, "$", 0)} for ${nfmt(n, 0)} sessions`, note: "Ask about sliding-scale fees, employee assistance programs (often 3–6 free sessions) and superbills for out-of-network reimbursement" };
};
export const grafts: Calc = (v) => {
  const area = need(p(v, "a", 60), "Enter the area to cover (cm²)."), den = p(v, "d", 40), price = p(v, "p", 4);
  const g = area * den;
  return { g: `≈ ${nfmt(g, 0)} grafts`, cost: price > 0 ? `≈ ${money(g * price, "$", 0)} at ${money(price)} per graft` : "Enter a price per graft for cost", note: "Typical planned densities: 30–40 grafts/cm² (natural look), 40–50 for the hairline · each graft holds 1–4 hairs · a surgeon assesses your donor area" };
};

// ---- registry (generated)
export const ideaHlth1CustomCalculators: Record<string, Calc> = {
  "embryo-transfer-due-date-calculator": ivfDue,
  "baby-size-by-week-calculator": babySize,
  "kick-count-calculator": kickCount,
  "contraction-timer-calculator": contractions,
  "maternity-leave-dates-calculator": matLeave,
  "breastfeeding-calories-needed-calculator": bfCalories,
  "breast-milk-storage-time-calculator": milkStorage,
  "baby-formula-amount-by-weight-calculator": formulaAmt,
  "baby-feeding-schedule-calculator": feedSched,
  "newborn-weight-loss-percentage-calculator": newbornLoss,
  "baby-sleep-schedule-by-age-calculator": babySleep,
  "baby-teething-timeline-calculator": teething,
  "basal-body-temperature-ovulation-calculator": bbtOvulation,
  "post-pill-ovulation-calculator": postPill,
  "postpartum-period-return-calculator": postpartumPeriod,
  "prenatal-vitamin-folate-need-calculator": folate,
  "sleep-efficiency-calculator": sleepEff,
  "nap-length-calculator": napLen,
  "shift-work-sleep-schedule-calculator": shiftSleep,
  "caffeine-cutoff-time-for-sleep-calculator": caffCutoff,
  "melatonin-timing-calculator": melatonin,
  "body-adiposity-index-calculator": bai,
  "a-body-shape-index-absi-calculator": absi,
  "pulse-pressure-calculator": pulsePressure,
  "resting-heart-rate-fitness-calculator": rhrFit,
  "heart-rate-recovery-calculator": hrr,
  "hydration-status-urine-color-calculator": urine,
  "fever-celsius-fahrenheit-calculator": fever,
  "medication-schedule-doses-per-day-calculator": medSchedule,
  "pill-count-days-supply-calculator": pillSupply,
  "hearing-loss-noise-exposure-time-calculator": noise,
  "screen-time-eye-break-20-20-20-calculator": eyeBreak,
  "vision-prescription-converter-calculator": rxConvert,
  "contact-lens-vertex-distance-calculator": vertex,
  "sunburn-time-uv-index-calculator": sunburn,
  "spf-sunscreen-amount-calculator": sunscreen,
  "incubation-period-exposure-dates-calculator": incubation,
  "hospital-stay-cost-calculator": hospital,
  "medical-bill-negotiation-savings-calculator": billNegotiate,
  "braces-cost-payment-plan-calculator": braces,
  "lasik-cost-savings-vs-glasses-calculator": lasik,
  "therapy-session-cost-calculator": therapy,
  "hair-loss-graft-count-calculator": grafts,
};
