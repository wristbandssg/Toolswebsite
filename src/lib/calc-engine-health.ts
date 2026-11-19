/**
 * Batch: Health Calculators (15 Nov 2026) — the 226 health keywords from the general keyword check
 * (Claude outputs/General_Keyword_Check.md, section E). The user asked for a category to be made and
 * the tools built, so a new main category "Health Calculators" was created
 * (prisma/setup-health-category.ts) with 2 sub-categories:
 *   - Pregnancy & Fertility: due date, pregnancy week, conception date, ovulation, period,
 *     implantation/DPO, pregnancy weight gain, chance of pregnancy.
 *   - Sleep & Medical: sleep cycles, body surface area, eGFR, GMI / A1c.
 *
 * Sources:
 *  - Due date: Naegele's rule adjusted for cycle length (LMP + 280 d + (cycle − 28)); conception
 *    + 266 d; IVF day-3 transfer + 263 d, day-5 + 261 d (ACOG Committee Opinion 700).
 *  - Fertile window and day-specific conception probability: Wilcox, Weinberg & Baird, NEJM 1995
 *    (days −5…0 relative to ovulation: 10, 16, 14, 27, 31, 33%). Implantation 6–12 DPO, most
 *    8–10 (Wilcox, NEJM 1999).
 *  - Per-cycle chance by age: ASRM patient guidance (≈25% under 30 → ≈5% at 40).
 *  - Weight gain: IOM 2009 ranges by pre-pregnancy BMI (singleton & provisional twin ranges);
 *    extra calories 0 / 340 / 452 kcal by trimester.
 *  - Sleep need by age: AASM (2016) / National Sleep Foundation (2015).
 *  - BSA: Mosteller, DuBois & DuBois, Haycock, Gehan & George, Boyd.
 *  - eGFR: CKD-EPI 2021 creatinine equation (race-free); KDIGO G1–G5 stages.
 *  - GMI: Bergenstal et al., Diabetes Care 2018 (GMI % = 3.31 + 0.02392 × mean glucose mg/dL);
 *    eAG: ADAG study, Nathan et al. 2008 (eAG = 28.7 × A1c − 46.7).
 * Dates arrive as whole days since 1970-01-01 UTC (CalculatorWidget convention).
 */

import { type TrvCalculator as Calc, InputError, num, pick, txt, sig, dayText, dateIn, parseClock } from "./trv-core";

const TODAY = () => Math.floor(Date.now() / 86400000);
const wd = (d: number) => `${Math.floor(d / 7)} weeks ${d % 7} day${d % 7 === 1 ? "" : "s"}`;
const noWd = (s: string) => s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun), /g, "");
const range = (a: number, b: number) => `${dayText(a)} – ${dayText(b)}`;
const cycleOf = (v: Record<string, number>) => { const c = Math.round(num(v.cycle, 28)); if (c < 20 || c > 45) throw new InputError("Use a cycle length between 20 and 45 days."); return c; };
const trimester = (ga: number) => (ga < 14 * 7 ? "First trimester (weeks 1–13)" : ga < 28 * 7 ? "Second trimester (weeks 14–27)" : "Third trimester (weeks 28–40+)");
const monthOf = (w: number) => (w <= 4 ? 1 : w <= 8 ? 2 : w <= 13 ? 3 : w <= 17 ? 4 : w <= 22 ? 5 : w <= 27 ? 6 : w <= 31 ? 7 : w <= 35 ? 8 : 9);
const SIZES: Record<number, string> = { 4: "poppy seed", 5: "sesame seed", 6: "lentil", 7: "blueberry", 8: "raspberry", 9: "cherry", 10: "strawberry", 11: "lime", 12: "plum", 13: "lemon", 14: "peach", 15: "apple", 16: "avocado", 17: "pear", 18: "bell pepper", 19: "mango", 20: "banana", 21: "carrot", 22: "papaya", 23: "grapefruit", 24: "cantaloupe", 25: "cauliflower", 26: "head of lettuce", 27: "cabbage", 28: "eggplant", 29: "butternut squash", 30: "cucumber (large)", 31: "coconut", 32: "squash", 33: "pineapple", 34: "honeydew melon", 35: "honeydew melon", 36: "romaine lettuce", 37: "Swiss chard", 38: "leek", 39: "small watermelon", 40: "small pumpkin" };
function gaInfo(lmp: number, asof: number) {
  const ga = asof - lmp, due = lmp + 280;
  if (ga < 0) throw new InputError("That date is in the future compared with the 'as of' date.");
  const w = Math.floor(ga / 7);
  return {
    ga, due, w,
    weeks: ga > 300 ? `${wd(ga)} — past 42 weeks; check the dates` : wd(ga),
    tri: trimester(ga), month: `Month ${monthOf(Math.max(1, w + (ga % 7 ? 1 : 0)))} of 9`,
    left: due - asof >= 0 ? `${due - asof} days (${wd(due - asof)}) until the due date` : `${asof - due} days past the due date`,
    pct: `${Math.min(100, (ga / 280) * 100).toFixed(0)}% of 40 weeks`,
    size: w >= 4 ? `About the size of a ${SIZES[Math.min(40, w)]}` : "Too early for a size comparison (an embryo starts implanting around week 3–4)",
  };
}

// ------------------------------------------------------------------ due date
export const DUE_METHODS = ["First day of last period (LMP)", "Conception date", "IVF transfer — 3-day embryo", "IVF transfer — 5-day blastocyst", "Ultrasound dating (scan date + age at scan)"];
export const dueDate: Calc = (v) => {
  const m = pick(v.method, DUE_METHODS.length), d = dateIn(v, "date", TODAY() - 60), asof = dateIn(v, "asof", TODAY());
  let lmp: number;
  if (m === 0) lmp = d + (cycleOf(v) - 28);
  else if (m === 1) lmp = d - 14;
  else if (m === 2) lmp = d - 17;
  else if (m === 3) lmp = d - 19;
  else { const w = Math.round(num(v.usw, 8)), dd = Math.round(num(v.usd, 0)); if (w < 4 || w > 42 || dd < 0 || dd > 6) throw new InputError("Enter the age at the scan as 4–42 weeks plus 0–6 days."); lmp = d - (w * 7 + dd); }
  const due = lmp + 280;
  const g = asof >= lmp ? gaInfo(lmp, asof) : null;
  return {
    due: dayText(due), weekday: dayText(due).split(",")[0], ga: g ? g.weeks : "Not pregnant yet on the 'as of' date",
    tri: g ? g.tri : "—", left: g ? g.left : "—", conception: `${dayText(lmp + 14)} (likely window ${range(lmp + 9, lmp + 15)})`,
    milestones: [`End of 1st trimester: ${dayText(lmp + 13 * 7 + 6)}`, `Anatomy scan (18–22 wk): ${range(lmp + 126, lmp + 154)}`, `Viability (24 wk): ${dayText(lmp + 168)}`, `Full term (39 wk): ${dayText(lmp + 273)}`, `42 weeks: ${dayText(lmp + 294)}`].join("\n"),
    range: `Most babies arrive between ${range(due - 14, due + 7)} (only about 4% on the due date itself)`,
  };
};
export const pregnancyWeek: Calc = (v) => {
  const m = pick(v.from, 2), d = dateIn(v, "date", TODAY() + 150), asof = dateIn(v, "asof", TODAY());
  const lmp = m === 0 ? d - 280 : d + (cycleOf(v) - 28);
  const g = gaInfo(lmp, asof);
  const next = lmp + (g.w + 1) * 7;
  return { weeks: g.weeks, month: g.month, tri: g.tri, size: g.size, due: dayText(g.due), left: g.left, next: `Week ${g.w + 1} starts ${dayText(next)}`, pct: g.pct };
};
export const conceptionDate: Calc = (v) => {
  const m = pick(v.from, 3), d = dateIn(v, "date", TODAY() + 150);
  const c = m === 1 ? d + cycleOf(v) - 14 : d - 266;
  const sex = pick(v.docheck, 2) === 1 ? dateIn(v, "check", c) : 0;
  let check = "—";
  if (sex) { const diff = sex - c; check = diff >= -5 && diff <= 1 ? `${dayText(sex)} is inside the likely window (${diff === 0 ? "on" : `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ${diff < 0 ? "before" : "after"}`} the estimated ovulation day)` : `${dayText(sex)} is ${Math.abs(diff)} days ${diff < 0 ? "before" : "after"} the estimated conception — ${Math.abs(diff) <= 10 ? "unlikely but not impossible, because cycles vary" : "very unlikely"}`; }
  return {
    conception: dayText(c), window: `Sex that led to pregnancy most likely happened ${range(c - 5, c + 1)}`, weekday: dayText(c).split(",")[0],
    lmp: dayText(c - 14), due: dayText(c + 266), check,
    accuracy: m === 2 ? "From a birth date the estimate is ±2 weeks (babies arrive 37–42 weeks); a dating ultrasound is more exact" : "Typical accuracy ±3–5 days; early ultrasound dating is the most exact",
  };
};

// ------------------------------------------------------------------ ovulation & fertile window
export const ovulation: Calc = (v) => {
  const lmp = dateIn(v, "lmp", TODAY() - 10), c = cycleOf(v), lut = Math.round(num(v.luteal, 14)), n = Math.min(6, Math.max(1, Math.round(num(v.cycles, 3))));
  if (lut < 9 || lut > 18) throw new InputError("The luteal phase is usually 10–16 days; use 9 to 18.");
  const ovs: string[] = [];
  for (let i = 0; i < n; i++) { const s = lmp + i * c, o = s + c - lut; ovs.push(`Cycle ${i + 1}: period ${noWd(dayText(s))} · fertile ${noWd(range(o - 5, o + 1))} · ovulation ${noWd(dayText(o))}`); }
  const o = lmp + c - lut;
  return { ovulation: dayText(o), fertile: range(o - 5, o + 1), peak: `${range(o - 2, o)} (highest chance)`, period: dayText(lmp + c), test: `${dayText(lmp + c)} (the day your period is due) or later`, calendar: ovs.join("\n") };
};

// ------------------------------------------------------------------ period
export const period: Calc = (v) => {
  const last = dateIn(v, "last", TODAY() - 20), c = cycleOf(v), len = Math.round(num(v.len, 5)), asof = dateIn(v, "asof", TODAY());
  if (len < 1 || len > 10) throw new InputError("Period length is usually 2–7 days; use 1 to 10.");
  if (last > asof) throw new InputError("The last period start is after the 'as of' date.");
  const day = asof - last + 1, k = Math.floor((asof - last) / c);
  const nextStart = last + (day > c ? (k + 1) * c : c);
  const late = day > c ? day - c : 0;
  const list = Array.from({ length: 6 }, (_, i) => { const s = last + (i + 1) * c; return `${dayText(s).replace(/^\w+, /, "")} – ${dayText(s + len - 1).replace(/^\w+, /, "")}`; }).join("\n");
  return {
    next: dayText(last + c), until: late ? `Your period is ${late} day${late === 1 ? "" : "s"} late` : `${last + c - asof} days from the 'as of' date`, day: `Cycle day ${day}`,
    late: late ? `${late} day${late === 1 ? "" : "s"} late — a pregnancy test is reliable now; stress, illness and travel can also delay a period` : "Not late",
    pms: late ? "—" : `PMS days: ${range(nextStart - 5, nextStart - 1)}`, ovulation: `Ovulation ≈ ${dayText(nextStart - 14)} (fertile ${range(nextStart - 19, nextStart - 13)})`, list,
  };
};
export const implantation: Calc = (v) => {
  const m = pick(v.from, 2), asof = dateIn(v, "asof", TODAY());
  const ov = m === 0 ? dateIn(v, "ov", TODAY() - 7) : dateIn(v, "lmp", TODAY() - 21) + cycleOf(v) - 14;
  const dpo = asof - ov;
  const stage = dpo < 0 ? "Before ovulation" : dpo < 6 ? "Embryo travelling to the uterus — too early to test" : dpo <= 12 ? "Implantation window — hCG starts to rise after implantation" : dpo < 14 ? "Early tests may detect hCG now" : "Missed-period stage — a home test is reliable";
  return {
    dpo: dpo >= 0 ? `${dpo} DPO` : `${-dpo} days before ovulation`, implant: `${range(ov + 6, ov + 12)} (most often ${range(ov + 8, ov + 10)})`,
    early: `${dayText(ov + 10)} at the earliest with a sensitive (10 mIU/mL) test`, reliable: `${dayText(ov + 14)} or later (about the day your period is due)`,
    stage, ovulation: dayText(ov),
  };
};
export const pregnancyWeightGain: Calc = (v) => {
  const metric = pick(v.units, 2) === 1, twins = pick(v.type, 2) === 1;
  const h = num(v.height, metric ? 165 : 65), w0 = num(v.pre, metric ? 63.5 : 140), wk = Math.round(num(v.week, 20)), cur = num(v.now, 0);
  if (!(h > 0 && w0 > 0)) throw new InputError("Enter your height and pre-pregnancy weight.");
  if (wk < 0 || wk > 42) throw new InputError("Use a pregnancy week from 0 to 42.");
  const hm = metric ? h / 100 : h * 0.0254, kg = metric ? w0 : w0 * 0.45359237, bmi = kg / (hm * hm);
  const cls = bmi < 18.5 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3;
  const S: [number, number, number, number][] = [[28, 40, 1, 1.3], [25, 35, 0.8, 1], [15, 25, 0.5, 0.7], [11, 20, 0.4, 0.6]];
  const TW: ([number, number] | null)[] = [null, [37, 54], [31, 50], [25, 42]];
  const lbf = metric ? 0.45359237 : 1, U = metric ? "kg" : "lb";
  const f = (x: number) => `${(x * lbf).toFixed(1)} ${U}`;
  let lo: number, hi: number, total: string;
  if (twins && !TW[cls]) { total = "No IOM range for underweight women carrying twins — ask your provider"; lo = hi = NaN; }
  else {
    const [tl, th] = twins ? TW[cls]! : [S[cls][0], S[cls][1]];
    total = `${f(tl)} – ${f(th)} total`;
    const r = (tl - 2.75) / 27, rh = (th - 2.75) / 27; // spread the rest evenly over weeks 13–40 (first trimester ≈ 1.1–4.4 lb)
    lo = wk <= 13 ? 1.1 * (wk / 13) : Math.min(tl, 1.1 + (wk - 13) * (twins ? r : S[cls][2]));
    hi = wk <= 13 ? 4.4 * (wk / 13) : Math.min(th, 4.4 + (wk - 13) * (twins ? rh : S[cls][3]));
  }
  const gained = cur > 0 ? (cur - w0) / lbf : NaN;
  const status = !Number.isFinite(gained) || !Number.isFinite(lo) ? "Enter your current weight to compare" : gained < lo - 1e-9 ? `${f(gained)} so far — below the suggested range for week ${wk}` : gained > hi + 1e-9 ? `${f(gained)} so far — above the suggested range for week ${wk}` : `${f(gained)} so far — on track for week ${wk}`;
  const kcal = wk < 14 ? "No extra calories needed yet (first trimester)" : wk < 28 ? "About +340 kcal a day (second trimester)" : "About +450 kcal a day (third trimester)";
  return {
    total, bmi: Number(bmi.toFixed(1)), category: ["Underweight", "Normal weight", "Overweight", "Obese"][cls],
    now: Number.isFinite(lo) ? `${f(lo)} – ${f(hi)} by week ${wk}` : "—", weekly: twins ? "Twins: follow your provider's plan" : `${f(S[cls][2])} – ${f(S[cls][3])} per week after the first trimester`, status, kcal,
  };
};
const WILCOX: Record<number, number> = { [-5]: 0.1, [-4]: 0.16, [-3]: 0.14, [-2]: 0.27, [-1]: 0.31, 0: 0.33 };
const perCycle = (age: number) => (age < 30 ? 0.25 : age < 35 ? 0.2 : age < 38 ? 0.15 : age < 41 ? 0.1 : age < 43 ? 0.05 : 0.02);
export const chanceOfPregnancy: Calc = (v) => {
  const m = pick(v.mode, 2), age = Math.round(num(v.age, 30));
  if (age < 15 || age > 55) throw new InputError("Use an age from 15 to 55.");
  const p = perCycle(age);
  if (m === 1) {
    const n = Math.min(36, Math.max(1, Math.round(num(v.months, 6))));
    const cum = 1 - (1 - p) ** n;
    return { chance: `${(cum * 100).toFixed(0)}%`, raw: sig(cum, 6), detail: `≈${(p * 100).toFixed(0)}% per cycle at age ${age}, over ${n} cycle${n === 1 ? "" : "s"} of well-timed sex`, ovday: "—", fertile: "—", advice: age >= 35 ? "If you're 35+ and not pregnant after 6 months, see a fertility specialist (ASRM)" : "If you're under 35 and not pregnant after 12 months, see a doctor (ASRM)" };
  }
  const lmp = dateIn(v, "lmp", TODAY() - 14), c = cycleOf(v), sex = dateIn(v, "sex", TODAY() - 2);
  const ov = lmp + c - 14, rel = sex - ov;
  const q = WILCOX[rel] ?? 0;
  const ageAdj = Math.min(1, p / 0.2); // the Wilcox cohort was mostly under 35, so only reduce for 35+
  const chance = q * ageAdj;
  return {
    chance: q === 0 ? (rel < -5 ? "Very low (<1%)" : "Very low (<1%) — the egg lives about 12–24 hours") : `${(chance * 100).toFixed(0)}%`, raw: sig(chance, 6),
    detail: rel >= -5 && rel <= 0 ? `Sex ${rel === 0 ? "on" : `${-rel} day${rel === -1 ? "" : "s"} before`} the estimated ovulation day: ${(q * 100).toFixed(0)}% in the Wilcox study${ageAdj < 1 ? `, adjusted ×${ageAdj.toFixed(2)} for age ${age}` : ""}` : `Sex was ${Math.abs(rel)} days ${rel < 0 ? "before" : "after"} the estimated ovulation day — outside the 6-day fertile window`,
    ovday: dayText(ov), fertile: range(ov - 5, ov), advice: `Take a pregnancy test from ${dayText(Math.max(lmp + c, sex + 14))}`,
  };
};
const AGE_NEED: [number, string][] = [[0.33, "14–17 hours (newborn, incl. naps)"], [1, "12–16 hours (infant, incl. naps)"], [3, "11–14 hours (toddler, incl. naps)"], [6, "10–13 hours (preschool, incl. naps)"], [13, "9–12 hours"], [18, "8–10 hours"], [65, "7–9 hours"], [200, "7–8 hours"]];
export const sleep: Calc = (v) => {
  const m = pick(v.mode, 4), lat = Math.max(0, Math.min(90, Math.round(num(v.latency, 15)))), age = num(v.age, 30);
  const need = AGE_NEED.find(([a]) => age < a)![1];
  const fmt12 = (min: number) => { const t = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(t / 60), mm = t % 60; return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  if (m === 3) return { best: need, options: AGE_NEED.map(([, s], i) => `${i === 0 ? "0–3 months" : i === 1 ? "4–12 months" : i === 2 ? "1–2 years" : i === 3 ? "3–5 years" : i === 4 ? "6–12 years" : i === 5 ? "13–17 years" : i === 6 ? "18–64 years" : "65+ years"}: ${s}`).join("\n").replace(/200/, ""), cycles: "—", note: "AASM / National Sleep Foundation recommendations", need, slept: "—" };
  const t = parseClock(txt(v, "time"), "Time");
  if (m === 2) {
    const w = parseClock(txt(v, "wake"), "Wake time");
    let d = w - t; if (d <= 0) d += 1440;
    const asleep = Math.max(0, d - lat), cyc = asleep / 90;
    return { best: `${Math.floor(asleep / 60)} h ${asleep % 60} min of sleep`, options: `In bed ${Math.floor(d / 60)} h ${d % 60} min, minus ${lat} min to fall asleep`, cycles: `${cyc.toFixed(1)} sleep cycles of ~90 min`, note: Math.abs(cyc - Math.round(cyc)) < 0.2 ? "You likely woke near the end of a cycle — easier to wake up" : "You likely woke mid-cycle, which can feel groggy", need, slept: `${(asleep / 60).toFixed(2)} hours` };
  }
  const opts = [6, 5, 4, 3].map((n) => { const x = m === 0 ? t - n * 90 - lat : t + lat + n * 90; return `${fmt12(x)} — ${n} cycles, ${(n * 1.5).toFixed(1)} h of sleep${n === 5 || n === 6 ? " (best)" : ""}`; });
  return { best: m === 0 ? `Go to bed at ${opts[1].split(" — ")[0]} or ${opts[0].split(" — ")[0]}` : `Wake up at ${opts[1].split(" — ")[0]} or ${opts[0].split(" — ")[0]}`, options: opts.join("\n"), cycles: "Each sleep cycle lasts about 90 minutes (light → deep → REM sleep)", note: `Includes ${lat} min to fall asleep`, need, slept: "—" };
};
export const bsa: Calc = (v) => {
  const us = pick(v.units, 2) === 1;
  const h = us ? num(v.height, 70) * 2.54 : num(v.height, 175), w = us ? num(v.weight, 165) * 0.45359237 : num(v.weight, 75);
  if (!(h > 30 && h < 260 && w > 0.5 && w < 400)) throw new InputError("Check the height and weight.");
  const most = Math.sqrt((h * w) / 3600), dub = 0.007184 * w ** 0.425 * h ** 0.725, hay = 0.024265 * w ** 0.5378 * h ** 0.3964, geh = 0.0235 * w ** 0.51456 * h ** 0.42246;
  const g = w * 1000, boyd = 0.0003207 * h ** 0.3 * g ** (0.7285 - 0.0188 * Math.log10(g));
  return { bsa: `${most.toFixed(2)} m²`, raw: Number(most.toFixed(3)), dubois: `${dub.toFixed(2)} m²`, haycock: `${hay.toFixed(2)} m²`, gehan: `${geh.toFixed(2)} m²`, boyd: `${boyd.toFixed(2)} m²`, avg: `${((most + dub + hay + geh + boyd) / 5).toFixed(2)} m² (average of 5 formulas; typical adult ≈ 1.7–1.9 m²)` };
};
const NORM: [number, number][] = [[30, 116], [40, 107], [50, 99], [60, 93], [70, 85], [200, 75]];
export const egfr: Calc = (v) => {
  const female = pick(v.sex, 2) === 0, age = Math.round(num(v.age, 50)), raw = num(v.scr, 1);
  if (age < 18 || age > 110) throw new InputError("CKD-EPI is for adults aged 18 and over.");
  const scr = pick(v.unit, 2) === 1 ? raw / 88.4 : raw;
  if (!(scr > 0.1 && scr < 25)) throw new InputError("Check the creatinine value and unit.");
  const k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302;
  const g = 142 * Math.min(scr / k, 1) ** a * Math.max(scr / k, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
  const stage = g >= 90 ? "G1 — normal or high" : g >= 60 ? "G2 — mildly decreased" : g >= 45 ? "G3a — mildly to moderately decreased" : g >= 30 ? "G3b — moderately to severely decreased" : g >= 15 ? "G4 — severely decreased" : "G5 — kidney failure";
  const typ = NORM.find(([x]) => age < x)![1];
  return { egfr: `${Math.round(g)} mL/min/1.73 m²`, raw: Math.round(g), stage, typical: `About ${typ} is average at age ${age}`, scr: `${scr.toFixed(2)} mg/dL (${(scr * 88.4).toFixed(0)} µmol/L)`, note: g < 60 ? "Below 60 for 3 months or more suggests chronic kidney disease — discuss with your doctor" : "Stages G1–G2 only count as CKD if there are other signs of kidney damage (e.g. protein in the urine)" };
};
export const gmi: Calc = (v) => {
  const m = pick(v.mode, 3), mmol = pick(v.unit, 2) === 1, x = num(v.x, mmol ? 8.3 : 150);
  if (!(x > 0)) throw new InputError("Enter a value above 0.");
  const ifcc = (p: number) => `${Math.round((p - 2.152) / 0.09148)} mmol/mol`;
  const target = (p: number) => (p < 5.7 ? "Normal range (below 5.7%)" : p < 6.5 ? "Prediabetes range (5.7–6.4%)" : p < 7.05 ? "Diabetes, at the ADA target (about 7% or below)" : "Diabetes, above the usual ADA target of 7%");
  if (m === 1) { if (x < 3 || x > 20) throw new InputError("A1c is usually between 4% and 15%."); const mg = 28.7 * x - 46.7; return { result: `${Math.round(mg)} mg/dL (${(mg / 18.016).toFixed(1)} mmol/L)`, pct: `${x.toFixed(1)}%`, ifcc: ifcc(x), target: target(x), mg: Math.round(mg), formula: "eAG (mg/dL) = 28.7 × A1c − 46.7 (ADAG study)" }; }
  const mg = mmol ? x * 18.016 : x;
  if (mg < 40 || mg > 600) throw new InputError("Average glucose is usually between 70 and 400 mg/dL (3.9–22 mmol/L).");
  const p = m === 0 ? 3.31 + 0.02392 * mg : (mg + 46.7) / 28.7;
  return { result: `${p.toFixed(1)}%`, pct: `${p.toFixed(1)}%`, ifcc: ifcc(p), target: target(p), mg: Math.round(mg), formula: m === 0 ? "GMI (%) = 3.31 + 0.02392 × mean glucose (mg/dL), from ≥14 days of CGM data" : "A1c ≈ (mean glucose + 46.7) ÷ 28.7 (ADAG)" };
};

export const healthCustomCalculators: Record<string, Calc> = {
  "due-date-calculator": dueDate,
  "pregnancy-week-calculator": pregnancyWeek,
  "conception-date-calculator": conceptionDate,
  "ovulation-calculator": ovulation,
  "period-calculator": period,
  "implantation-calculator": implantation,
  "pregnancy-weight-gain-calculator": pregnancyWeightGain,
  "chance-of-pregnancy-calculator": chanceOfPregnancy,
  "sleep-calculator": sleep,
  "body-surface-area-calculator": bsa,
  "egfr-calculator": egfr,
  "gmi-calculator": gmi,
};
