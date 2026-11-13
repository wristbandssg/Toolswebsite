/**
 * Batch: Fitness keyword check (13 Nov 2026, Claude outputs/Fitness_Build_Plan.json), body &
 * strength part — 17 tools in Sports > Sports Performance Calculators.
 *
 * Methods:
 *  - BMI (WHO bands) + Trefethen "new BMI" 1.3·kg/m^2.5; ideal weight by Devine, Robinson, Miller,
 *    Hamwi with frame size from height ÷ wrist (men >10.4 small, <9.6 large; women >11, <10.1).
 *  - WHR (WHO 2008: ≥0.90 men / ≥0.85 women = substantially increased risk); WHtR (Ashwell: 0.5);
 *    Body Roundness Index (Thomas 2013): 364.2 − 365.5·√(1 − (WC/2π)² / (0.5·H)²).
 *  - Skinfolds: Jackson-Pollock 3- and 7-site body density + Siri (495/BD − 450).
 *  - Skeletal muscle: Lee et al. 2000 anthropometric model
 *    SM = 0.244·kg + 7.80·m + 6.6·male − 0.098·age + race − 3.3 (Asian −1.2, Black +1.4).
 *  - Natural potential: Casey Butt max lean mass H^1.5·(√wrist/22.667 + √ankle/17.0104)·(BF/224 + 1)
 *    (inches → lb) and his max measurements; Berkhan (cm − 100 kg at ~5% BF); FFMI 25 limit.
 *  - Golden ratio: Adonis index shoulders ÷ waist = 1.618; McCallum Grecian ideal from wrist.
 *  - Visceral Adiposity Index (Amato 2010) with Amato 2011 age cut-offs; waist cut-offs (WHO/IDF).
 *  - Metabolic age: your lean-mass BMR (Katch-McArdle) vs the BMR at an average body fat for your
 *    age and sex (men 18% + 0.15/yr after 20, women 26% + 0.15/yr), at Mifflin's 5 kcal per year.
 *  - Fitness age: non-exercise VO2max (Jurca 2005) or your measured VO2max vs FRIEND registry
 *    (Kaminsky 2015) treadmill medians by age and sex.
 *  - Calories from heart rate: Keytel et al. 2005.
 *  - Smolov / Smolov Jr. standard percentage tables; dumbbell → barbell ≈ 2 × DB ÷ 0.8;
 *    leg press → squat from sled-angle physics minus moved body mass.
 *
 * Kept apart from existing tools: body-fat-percentage (Navy/BMI methods) vs skinfold calipers;
 * lean-body-mass vs skeletal muscle (a different, smaller tissue); ffmi vs natural potential
 * (FFMI reports your index, this projects your ceiling); military-bmi is Army screening tables.
 */

import { type TrvCalculator as Calc, InputError, pos, pick, r0, r1, r2, nfmt } from "./trv-core";

const LB = 0.45359237, IN = 2.54;
const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : 0);
const isUS = (v: Record<string, number>) => pick(v.units, 2) === 0;
const len = (v: Record<string, number>, key: string, def: number) => pos(v[key], def) * (isUS(v) ? IN : 1); // → cm
const mass = (v: Record<string, number>, key: string, def: number) => pos(v[key], def) * (isUS(v) ? LB : 1); // → kg
const outW = (v: Record<string, number>, kg: number) => (isUS(v) ? kg / LB : kg);
const need = (x: number, what: string) => { if (!(x > 0)) throw new InputError(`Enter your ${what}.`); return x; };

// --------------------------------------------------------------------- BMI
export const bmiCat = (b: number) => (b < 16 ? "Severely underweight" : b < 18.5 ? "Underweight" : b < 25 ? "Healthy weight" : b < 30 ? "Overweight" : b < 35 ? "Obesity class I" : b < 40 ? "Obesity class II" : "Obesity class III");
export const bmiCalc: Calc = (v) => {
  const kg = need(mass(v, "weight", 180), "weight"), cm = need(len(v, "height", 70), "height"), m = cm / 100, bmi = kg / (m * m);
  const lo = 18.5 * m * m, hi = 24.9 * m * m;
  return { bmi: r1(bmi), category: bmiCat(bmi), low: r1(outW(v, lo)), high: r1(outW(v, hi)), change: r1(outW(v, bmi > 24.9 ? kg - hi : bmi < 18.5 ? kg - lo : 0)), prime: r2(bmi / 25), newBmi: r1((1.3 * kg) / m ** 2.5), note: "BMI can't tell muscle from fat — very muscular athletes often score 'overweight'. Pair it with waist-to-height ratio or body fat." };
};

// ------------------------------------------------------------- ideal weight
export const idealWeight: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, cm = need(len(v, "height", 70), "height"), inches = cm / IN, over = inches - 60, wrist = len(v, "wrist", 0);
  let frame = pick(v.frame, 3);
  if (wrist > 0) { const r = cm / wrist; frame = male ? (r > 10.4 ? 0 : r >= 9.6 ? 1 : 2) : r > 11 ? 0 : r >= 10.1 ? 1 : 2; }
  const devine = (male ? 50 : 45.5) + 2.3 * over, robinson = (male ? 52 : 49) + (male ? 1.9 : 1.7) * over, miller = (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over, hamwi = (male ? 48 : 45.5) + (male ? 2.7 : 2.2) * over;
  const f = [0.9, 1, 1.1][frame], avg = ((devine + robinson + miller + hamwi) / 4) * f, m = cm / 100;
  return { ideal: r1(outW(v, avg)), devine: r1(outW(v, devine)), robinson: r1(outW(v, robinson)), miller: r1(outW(v, miller)), hamwi: r1(outW(v, hamwi)), frame: ["Small frame (−10%)", "Medium frame", "Large frame (+10%)"][frame], bmiLow: r1(outW(v, 18.5 * m * m)), bmiHigh: r1(outW(v, 24.9 * m * m)) };
};

// --------------------------------------------------------------- waist ratios
export const whr: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, w = need(pos(v.waist, 34), "waist"), h = need(pos(v.hip, 40), "hip measurement"), r = w / h;
  const cat = male ? (r <= 0.95 ? "Low risk" : r <= 1 ? "Moderate risk" : "High risk") : r <= 0.8 ? "Low risk" : r <= 0.85 ? "Moderate risk" : "High risk";
  return { ratio: r2(r), risk: cat, who: r >= (male ? 0.9 : 0.85) ? `At or above the WHO cut-off (${male ? "0.90" : "0.85"}) — substantially increased risk` : `Below the WHO cut-off (${male ? "0.90" : "0.85"})`, shape: r >= (male ? 0.9 : 0.85) ? "Apple (more weight around the middle)" : "Pear (more weight on hips and thighs)", target: r1(h * (male ? 0.9 : 0.85)) };
};
export const whtr: Calc = (v) => {
  const w = need(pos(v.waist, 34), "waist"), h = need(pos(v.height, 70), "height"), r = w / h;
  return { ratio: r3(r), category: r < 0.4 ? "Below 0.4 — may be underweight" : r < 0.5 ? "Healthy (0.40–0.49)" : r < 0.6 ? "Increased risk (0.50–0.59)" : "High risk (0.60+)", max: r1(h * 0.5), idealLow: r1(h * 0.4), idealHigh: r1(h * 0.49), reduce: r1(Math.max(0, w - h * 0.5)) };
};
export const briCalc: Calc = (v) => {
  const wc = need(len(v, "waist", 34), "waist"), h = need(len(v, "height", 70), "height"), a = wc / (2 * Math.PI), b = 0.5 * h;
  if (a >= b) throw new InputError("Waist looks too large for this height — check the units.");
  const ecc = Math.sqrt(1 - (a * a) / (b * b)), bri = 364.2 - 365.5 * ecc;
  return { bri: r2(bri), category: bri < 3.41 ? "Below 3.41 — in the study, linked with slightly higher risk (often very lean people)" : bri < 4.45 ? "3.41–4.45 — lowest-risk range" : bri < 5.46 ? "4.45–5.46 — slightly raised risk" : bri < 6.91 ? "5.46–6.91 — raised risk" : "6.91 or more — highest-risk group", ecc: r3(ecc), whtr: r3(wc / h) };
};

// ------------------------------------------------------------------ skinfolds
export const bfCat = (male: boolean, bf: number) => { const c = male ? [6, 14, 18, 25] : [14, 21, 25, 32]; return bf < c[0] ? "Essential fat" : bf < c[1] ? "Athletes" : bf < c[2] ? "Fitness" : bf < c[3] ? "Average" : "Obese"; };
export const skinfold: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, seven = pick(v.method, 2) === 1, age = pos(v.age, 30), kg = mass(v, "weight", 180);
  const s = (k: string) => pos(v[k], 0);
  const sites = seven ? ["chest", "abdomen", "thigh", "triceps", "subscapular", "suprailiac", "midaxillary"] : male ? ["chest", "abdomen", "thigh"] : ["triceps", "suprailiac", "thigh"];
  const sum = sites.reduce((a, k) => a + s(k), 0);
  if (sites.some((k) => s(k) <= 0)) throw new InputError(`Enter all ${sites.length} skinfolds for this method: ${sites.join(", ")}.`);
  const bd = seven ? (male ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age)
    : male ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
  const bf = 495 / bd - 450;
  return { bf: r1(bf), category: bfCat(male, bf), density: r3(bd), sum: r1(sum), sites: sites.join(", "), fat: r1(outW(v, (kg * bf) / 100)), lean: r1(outW(v, kg * (1 - bf / 100))) };
};

// ----------------------------------------------------------- skeletal muscle
export const skeletalMuscle: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, kg = need(mass(v, "weight", 180), "weight"), m = need(len(v, "height", 70), "height") / 100, age = pos(v.age, 35), race = [0, -1.2, 1.4][pick(v.race, 3)], bf = pos(v.bodyFat, 0);
  const sm = 0.244 * kg + 7.8 * m + 6.6 * (male ? 1 : 0) - 0.098 * age + race - 3.3, pct = (sm / kg) * 100;
  const band = male ? [33.3, 43.5, 48.6] : [25.1, 36.1, 41.6]; // Janssen 2000 mean ± 1 and 2 SD
  return { sm: r1(outW(v, sm)), pct: r1(pct), level: pct < band[0] ? "Low" : pct < band[1] ? "Normal" : pct < band[2] ? "High" : "Very high", ratio: bf > 0 ? r2(sm / ((kg * bf) / 100)) : 0, ratioNote: bf > 0 ? "kg of skeletal muscle per kg of fat" : "Enter body fat % to see your muscle-to-fat ratio", kg: r1(sm) };
};

// ------------------------------------------------------- natural muscular potential
export const muscularPotential: Calc = (v) => {
  const hIn = need(pos(v.height, 70), "height") * (isUS(v) ? 1 : 1 / IN), wr = need(pos(v.wrist, 7), "wrist") * (isUS(v) ? 1 : 1 / IN), an = need(pos(v.ankle, 9), "ankle") * (isUS(v) ? 1 : 1 / IN), bf = pos(v.targetBf, 10);
  if (bf <= 2 || bf >= 30) throw new InputError("Target body fat must be 3–29%.");
  const lbmLb = hIn ** 1.5 * (Math.sqrt(wr) / 22.667 + Math.sqrt(an) / 17.0104) * (bf / 224 + 1), maxLb = lbmLb / (1 - bf / 100);
  const hm = (hIn * IN) / 100, ffmiLbm = (25 - 6.1 * (1.8 - hm)) * hm * hm, berkhan = hIn * IN - 100;
  const cur = mass(v, "weight", 0), curBf = pos(v.bodyFat, 0), curLbm = cur > 0 && curBf > 0 ? cur * (1 - curBf / 100) : 0;
  const L = (x: number) => (isUS(v) ? `${nfmt(x, 1)}"` : `${nfmt(x * IN, 1)} cm`);
  return {
    maxLbm: r1(isUS(v) ? lbmLb : lbmLb * LB), maxWeight: r1(isUS(v) ? maxLb : maxLb * LB), ffmi: r1(outW(v, ffmiLbm)), berkhan: r1(outW(v, berkhan)),
    measures: `Chest ${L(1.6817 * wr + 1.3759 * an + 0.3314 * hIn)} · Arms ${L(1.2033 * wr + 0.1236 * hIn)} · Forearms ${L(0.9025 * wr + 0.1054 * hIn)} · Neck ${L(1.1424 * wr + 0.1236 * hIn)} · Thighs ${L(1.3868 * an + 0.1805 * hIn)} · Calves ${L(0.9298 * an + 0.121 * hIn)}`,
    reached: curLbm > 0 ? r1((curLbm / (lbmLb * LB)) * 100) : 0,
  };
};

// ---------------------------------------------------------- golden ratio physique
export const goldenRatio: Calc = (v) => {
  const sh = need(pos(v.shoulders, 50), "shoulder circumference"), w = need(pos(v.waist, 32), "waist"), wr = pos(v.wrist, 0), r = sh / w;
  const u = isUS(v) ? '"' : " cm", f = (x: number) => `${nfmt(x, 1)}${u}`;
  const ch = wr * 6.5;
  return { ratio: r2(r), ideal: r1(w * 1.618), gap: r1(Math.max(0, w * 1.618 - sh)), rating: r >= 1.55 && r <= 1.7 ? "At or near the golden ratio (≈1.618)" : r > 1.7 ? "Above the golden ratio — very V-shaped" : r >= 1.4 ? "Athletic — build shoulders or trim waist to approach 1.618" : "Below 1.4 — wider shoulders and a smaller waist raise it", waistFor: r1(sh / 1.618), mccallum: wr > 0 ? `Chest ${f(ch)} · Waist ${f(ch * 0.7)} · Hips ${f(ch * 0.85)} · Neck ${f(ch * 0.37)} · Biceps ${f(ch * 0.36)} · Thigh ${f(ch * 0.53)} · Calf ${f(ch * 0.34)} · Forearm ${f(ch * 0.29)}` : "Enter your wrist to see McCallum's ideal measurements" };
};

// ------------------------------------------------------------- body fat goal
export const bodyFatGoal: Calc = (v) => {
  const kg = need(mass(v, "weight", 200), "weight"), bf = pos(v.bodyFat, 28), goal = pos(v.goalBf, 20), rate = mass(v, "rate", 1);
  if (bf <= 2 || bf >= 70 || goal <= 2 || goal >= 70) throw new InputError("Body fat values must be between 3 and 69%.");
  if (goal >= bf) throw new InputError("Your goal body fat must be lower than your current body fat.");
  const lean = kg * (1 - bf / 100), target = lean / (1 - goal / 100), lose = kg - target;
  return { target: r1(outW(v, target)), lose: r1(outW(v, lose)), lean: r1(outW(v, lean)), fatNow: r1(outW(v, kg - lean)), fatGoal: r1(outW(v, target - lean)), weeks: rate > 0 ? r1(lose / rate) : 0, deficit: r0((rate * 7700) / 7) };
};

// ------------------------------------------------------------------ visceral fat
export const visceralFat: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, age = pos(v.age, 45), kg = need(mass(v, "weight", 200), "weight"), cm = need(len(v, "height", 70), "height"), wc = need(len(v, "waist", 38), "waist");
  const bmi = kg / (cm / 100) ** 2, mg = pick(v.labUnit, 2) === 0;
  const tg = pos(v.tg, 0) / (mg ? 88.57 : 1), hdl = pos(v.hdl, 0) / (mg ? 38.67 : 1);
  const hiW = male ? 102 : 88, idfW = male ? 94 : 80;
  const waistRisk = wc >= hiW ? `High (waist ≥ ${male ? "102 cm / 40 in" : "88 cm / 35 in"})` : wc >= idfW ? `Raised (waist ≥ ${male ? "94 cm / 37 in" : "80 cm / 31.5 in"})` : "Low";
  let vai = 0, status = "Enter triglycerides and HDL from a blood test to calculate the Visceral Adiposity Index.";
  if (tg > 0 && hdl > 0) {
    vai = male ? (wc / (39.68 + 1.88 * bmi)) * (tg / 1.03) * (1.31 / hdl) : (wc / (36.58 + 1.89 * bmi)) * (tg / 0.81) * (1.52 / hdl);
    const cut = age < 30 ? 2.52 : age < 42 ? 2.23 : age < 52 ? 1.92 : age < 66 ? 1.93 : 2.0;
    status = vai > cut ? `Above the cut-off for your age (${cut}) — suggests excess visceral fat / adipose dysfunction` : `Within the normal range for your age (cut-off ${cut})`;
  }
  return { vai: r2(vai), status, waistRisk, whtr: r2(wc / cm), bmi: r1(bmi) };
};

// ------------------------------------------------------------------ metabolic age
export const metabolicAge: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, age = pos(v.age, 40), kg = need(mass(v, "weight", 180), "weight"), cm = need(len(v, "height", 70), "height"), bf = pos(v.bodyFat, 20);
  if (bf <= 2 || bf >= 70) throw new InputError("Enter a body fat percentage between 3 and 69.");
  const typical = (male ? 18 : 26) + 0.15 * Math.max(0, age - 20); // average adult body fat % for age & sex
  const actual = 370 + 21.6 * kg * (1 - bf / 100), expected = 370 + 21.6 * kg * (1 - typical / 100);
  void cm;
  const meta = Math.min(90, Math.max(15, age + (expected - actual) / 5)), d = meta - age;
  return { meta: r0(meta), diff: r0(d), actual: r0(actual), expected: r0(expected), typical: r1(typical), verdict: d <= -3 ? "Younger than your age — more lean mass than average for your size" : d >= 3 ? "Older than your age — building muscle and losing fat lowers it" : "About the same as your age" };
};

// ------------------------------------------------------------------ fitness age
const FRIEND: Record<"m" | "f", number[]> = { m: [48.0, 42.4, 37.8, 32.6, 28.2, 24.4], f: [37.6, 30.9, 27.7, 24.2, 20.9, 18.3] }; // ages 25, 35 … 75
export const ageForVo2 = (male: boolean, vo2: number) => {
  const t = FRIEND[male ? "m" : "f"], ages = [25, 35, 45, 55, 65, 75];
  if (vo2 >= t[0]) return 25 - ((vo2 - t[0]) / (t[0] - t[1])) * 10;
  for (let i = 0; i < 5; i++) if (vo2 >= t[i + 1]) return ages[i] + ((t[i] - vo2) / (t[i] - t[i + 1])) * 10;
  return 75 + ((t[5] - vo2) / (t[4] - t[5])) * 10;
};
export const fitnessAge: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, age = pos(v.age, 45), known = pos(v.vo2, 0);
  let vo2 = known;
  if (!(known > 0)) {
    const kg = need(mass(v, "weight", 180), "weight"), cm = need(len(v, "height", 70), "height"), rhr = pos(v.rhr, 65), bmi = kg / (cm / 100) ** 2;
    const pa = [0, 0.32, 1.06, 1.76, 3.03][pick(v.activity, 5)];
    vo2 = (18.07 + 2.77 * (male ? 1 : 0) - 0.1 * age - 0.17 * bmi - 0.03 * rhr + pa) * 3.5;
  }
  const fa = Math.min(90, Math.max(18, ageForVo2(male, vo2)));
  return { fitAge: r0(fa), diff: r0(fa - age), vo2: r1(vo2), source: known > 0 ? "Your measured VO2 max" : "Estimated from age, BMI, resting heart rate and activity (Jurca 2005)", verdict: fa < age - 2 ? "Fitter than average for your age" : fa > age + 2 ? "Below average for your age — regular cardio lowers it" : "Average for your age" };
};

// ---------------------------------------------------- calories burned by heart rate
export const caloriesByHr: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, age = pos(v.age, 35), kg = need(mass(v, "weight", 180), "weight"), hr = pos(v.hr, 140), min = pos(v.minutes, 45);
  if (hr < 60 || hr > 220) throw new InputError("Average heart rate must be 60–220 bpm.");
  const perMin = Math.max(0, (male ? -55.0969 + 0.6309 * hr + 0.1988 * kg + 0.2017 * age : -20.4022 + 0.4472 * hr - 0.1263 * kg + 0.074 * age) / 4.184);
  return { total: r0(perMin * min), perMin: r1(perMin), perHour: r0(perMin * 60), note: hr < 90 ? "Below about 90 bpm the formula is less reliable." : "Most accurate for steady exercise at 90–150 bpm." };
};

// ---------------------------------------------------------------------- Smolov
const roundTo = (x: number, s: number) => Math.round(x / s) * s;
export const smolov: Calc = (v) => {
  const oneRm = pos(v.oneRm, 300), jr = pick(v.program, 2) === 0, us = isUS(v), inc = pos(v.increment, us ? 10 : 5), step = us ? 5 : 2.5, u = us ? "lb" : "kg";
  if (!(oneRm > 0)) throw new InputError("Enter your current one-rep max.");
  const days: [number, number, number][] = jr ? [[6, 6, 0.7], [7, 5, 0.75], [8, 4, 0.8], [10, 3, 0.85]] : [[4, 9, 0.7], [5, 7, 0.75], [7, 5, 0.8], [10, 3, 0.85]];
  const adds = jr ? [0, inc, inc * 2] : [0, us ? 20 : 10, us ? 30 : 15];
  const week = (add: number) => days.map(([s, r, p]) => `${s}×${r} @ ${nfmt(roundTo(oneRm * p + add, step), step < 5 ? 1 : 0)}`).join(" · ");
  return { top: roundTo(oneRm * 0.85 + adds[2], step), w1: week(adds[0]), w2: week(adds[1]), w3: week(adds[2]), after: jr ? `Test a new max after a few easy days — typical gains ${nfmt(roundTo(oneRm * 0.05, step), 0)}–${nfmt(roundTo(oneRm * 0.1, step), 0)} ${u}.` : "Week 4 of the base block: rest early in the week, then test your max on Saturday/Sunday.", unit: u };
};

// ------------------------------------------------------- dumbbell ↔ barbell
const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));
export const dumbbellBarbell: Calc = (v) => {
  const dir = pick(v.direction, 2), w = pos(v.weight, 60), reps = Math.max(1, Math.round(pos(v.reps, 8)));
  if (!(w > 0)) throw new InputError("Enter the weight.");
  const bar = dir === 0 ? (w * 2) / 0.8 : w, db = dir === 0 ? w : (w * 0.8) / 2;
  return { result: r0(dir === 0 ? bar : db), bar: r0(bar), db: r0(db), oneRm: r0(epley(bar, reps)), dbRm: r0(epley(db, reps)), how: dir === 0 ? "Barbell ≈ both dumbbells together ÷ 0.8" : "Each dumbbell ≈ barbell × 0.8 ÷ 2" };
};

// ------------------------------------------------------- leg press → squat
export const legPressSquat: Calc = (v) => {
  const lp = pos(v.weight, 500), sled = pos(v.sled, 0), reps = Math.max(1, Math.round(pos(v.reps, 8))), bw = pos(v.bodyweight, 180), type = pick(v.machine, 3);
  const angle = [Math.SQRT1_2, 1, 1][type], lpMax = epley(lp + sled, reps), sq = Math.max(0, (lpMax * angle - 0.85 * bw) * 0.9);
  return { squat: r0(sq), lpMax: r0(lpMax), ratio: sq > 0 ? r2(lpMax / sq) : 0, load: r0(lpMax * angle) };
};

export const fitBodyCustomCalculators: Record<string, Calc> = {
  "bmi-calculator": bmiCalc,
  "ideal-weight-calculator": idealWeight,
  "waist-to-hip-ratio-calculator": whr,
  "waist-to-height-ratio-calculator": whtr,
  "body-roundness-index-calculator": briCalc,
  "skinfold-body-fat-calculator": skinfold,
  "skeletal-muscle-mass-calculator": skeletalMuscle,
  "muscular-potential-calculator": muscularPotential,
  "golden-ratio-physique-calculator": goldenRatio,
  "body-fat-goal-calculator": bodyFatGoal,
  "visceral-fat-calculator": visceralFat,
  "metabolic-age-calculator": metabolicAge,
  "fitness-age-calculator": fitnessAge,
  "calories-burned-heart-rate-calculator": caloriesByHr,
  "smolov-calculator": smolov,
  "dumbbell-to-barbell-calculator": dumbbellBarbell,
  "leg-press-to-squat-calculator": legPressSquat,
};
