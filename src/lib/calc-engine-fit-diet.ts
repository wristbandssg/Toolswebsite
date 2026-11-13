/**
 * Batch: Fitness keyword check (13 Nov 2026, Claude outputs/Fitness_Build_Plan.json), diet part —
 * 20 tools in Food & Drink > Diet, Macro & Meal Planning + the Bibibop meal counter in
 * Food & Drink > Restaurant > Mexican, Bowl & Salad.
 *
 * Methods:
 *  - BMR: Mifflin-St Jeor (10·kg + 6.25·cm − 5·age + 5 men / −161 women); Katch-McArdle
 *    (370 + 21.6·lean kg) when body fat is known. Activity factors 1.2 / 1.375 / 1.55 / 1.725 / 1.9.
 *  - Energy per unit of weight: 3,500 kcal per lb (7,700 kcal per kg) — the standard rule; the
 *    deficit and weight-loss tools also re-calculate TDEE as weight falls (weekly steps) so long
 *    plans slow down realistically.
 *  - Body fat estimate when unknown: Deurenberg 1991 (1.2·BMI + 0.23·age − 10.8·male − 5.4).
 *  - Weight Watchers: classic Points (cal/50 + fat/12 − min(fiber,4)/5), PointsPlus (protein/10.9375 +
 *    carbs/9.2105 + fat/3.8889 − fiber/12.5) and SmartPoints (0.0305·cal + 0.275·satfat +
 *    0.12·sugar − 0.098·protein). WW's current (2025) formula is not public.
 *  - PSMF: Lyle McDonald's categories (protein g per lb of lean mass by body-fat category & activity).
 *  - TEF: protein 20–30%, carbs 5–10%, fat 0–3%, alcohol 10–30% of their calories.
 *  - Fiber: 14 g per 1,000 kcal (Dietary Guidelines) and the IOM adequate intakes.
 *  - Bibibop: calories from BIBIBOP's own nutrition sheet (updated 26 Aug 2025).
 *
 * Kept apart from existing tools: tdee-calculator is the general-population TDEE (tdee-for-athletes
 * is built on weekly training hours); calorie-calculator gives intake per goal (IIFYM adds macros);
 * calorie-deficit-calculator works from a chosen deficit, weight-loss-calculator from a goal date;
 * protein-intake-calculator covers maintenance / weight loss / older adults (protein-for-muscle-gain
 * covers muscle gain); keto/PSMF/carb cycling/zigzag/recomp each have their own macro rules.
 */

import { type TrvCalculator as Calc, InputError, txt, pos, pick, r0, r1, r2, nfmt, parseClock, clockText, dayText, dateIn } from "./trv-core";

export const LB = 0.45359237, IN = 2.54;
export const ACT = [1.2, 1.375, 1.55, 1.725, 1.9];
export const ACT_LABELS = ["Sedentary (desk job, little exercise)", "Light (exercise 1–3 days a week)", "Moderate (exercise 3–5 days a week)", "Very active (hard exercise 6–7 days)", "Extra active (physical job + training)"];

/** Body inputs: sex (0 male, 1 female), units (0 US lb/in, 1 metric kg/cm), age, weight, height. */
export function body(v: Record<string, number>) {
  const male = pick(v.sex, 2) === 0, us = pick(v.units, 2) === 0;
  const age = pos(v.age, 35), w = pos(v.weight, us ? 180 : 80), h = pos(v.height, us ? 70 : 178);
  if (age < 13 || age > 100) throw new InputError("These formulas are for ages 13–100.");
  const kg = us ? w * LB : w, cm = us ? h * IN : h;
  if (kg < 25 || kg > 350) throw new InputError("Enter a body weight between 55 and 770 lb (25–350 kg).");
  if (cm < 120 || cm > 230) throw new InputError("Enter a height between 48 and 90 inches (120–230 cm).");
  return { male, us, age, kg, cm, unit: us ? "lb" : "kg", perUnit: us ? 3500 : 7700, toU: (k: number) => (us ? k / LB : k) };
}
export const mifflin = (male: boolean, kg: number, cm: number, age: number) => 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
export const katch = (leanKg: number) => 370 + 21.6 * leanKg;
export const deurenberg = (male: boolean, kg: number, cm: number, age: number) => Math.max(3, 1.2 * (kg / (cm / 100) ** 2) + 0.23 * age - 10.8 * (male ? 1 : 0) - 5.4);
const floorKcal = (male: boolean) => (male ? 1500 : 1200);
const fmtK = (x: number) => nfmt(Math.round(x));

// ------------------------------------------------------------ calorie calculator
export const GOALS: [string, number][] = [["Maintain weight", 0], ["Lose 0.5 lb (0.25 kg) a week", -250], ["Lose 1 lb (0.5 kg) a week", -500], ["Lose 1.5 lb (0.7 kg) a week", -750], ["Lose 2 lb (0.9 kg) a week", -1000], ["Gain 0.5 lb (0.25 kg) a week", 250], ["Gain 1 lb (0.5 kg) a week", 500]];
export const calorieCalc: Calc = (v) => {
  const b = body(v), bmr = mifflin(b.male, b.kg, b.cm, b.age), tdee = bmr * ACT[pick(v.activity, 5)];
  const adj = GOALS[pick(v.goal, GOALS.length)][1], raw = tdee + adj, min = floorKcal(b.male), cal = adj < 0 ? Math.max(raw, min) : raw;
  const week = ((cal - tdee) * 7) / b.perUnit;
  return { calories: r0(cal), maintenance: r0(tdee), bmr: r0(bmr), change: r2(week), note: adj < 0 && raw < min ? `Capped at ${fmtK(min)} kcal — eating less than this is not advised without medical supervision, so the weekly loss is slower than chosen.` : adj === 0 ? "Eat about this much to keep your weight steady." : adj < 0 ? `A ${fmtK(-adj)} kcal daily deficit below maintenance.` : `A ${fmtK(adj)} kcal daily surplus — pair it with strength training so more of the gain is muscle.`, lose: r0(Math.max(tdee - 500, min)), gain: r0(tdee + 500) };
};

// ------------------------------------------------------------------- TDEE
export const tdeeCalc: Calc = (v) => {
  const b = body(v), bf = pos(v.bodyFat, 0);
  if (bf >= 70) throw new InputError("Body fat must be under 70%.");
  const bmr = bf > 0 ? katch(b.kg * (1 - bf / 100)) : mifflin(b.male, b.kg, b.cm, b.age), a = pick(v.activity, 5), tdee = bmr * ACT[a];
  return { tdee: r0(tdee), bmr: r0(bmr), formula: bf > 0 ? "Katch-McArdle (uses your lean mass)" : "Mifflin-St Jeor", sedentary: r0(bmr * 1.2), light: r0(bmr * 1.375), moderate: r0(bmr * 1.55), very: r0(bmr * 1.725), extra: r0(bmr * 1.9), cut: r0(Math.max(tdee - 500, floorKcal(b.male))), bulk: r0(tdee + 300) };
};

/** Weekly simulation: fixed daily intake, TDEE recomputed from the current weight each week. */
export function simulate(b: ReturnType<typeof body>, act: number, intake: number, goalKg: number, maxWeeks = 520) {
  let kg = b.kg, weeks = 0;
  const losing = goalKg < kg;
  while (weeks < maxWeeks && (losing ? kg > goalKg : kg < goalKg)) {
    const tdee = mifflin(b.male, kg, b.cm, b.age) * act, change = ((intake - tdee) * 7) / 7700;
    if (losing ? change > -0.005 : change < 0.005) return { weeks: Infinity, kg };
    const next = kg + change;
    if (losing ? next <= goalKg : next >= goalKg) { weeks += (goalKg - kg) / change; kg = goalKg; break; }
    kg = next; weeks++;
  }
  return { weeks, kg };
}

// --------------------------------------------------------- calorie deficit
export const calorieDeficit: Calc = (v) => {
  const b = body(v), act = ACT[pick(v.activity, 5)], tdee = mifflin(b.male, b.kg, b.cm, b.age) * act;
  const deficit = pos(v.deficit, 500), goalW = pos(v.goal, 0), goalKg = b.us ? goalW * LB : goalW;
  if (deficit <= 0) throw new InputError("Enter a daily deficit (for example 500 kcal).");
  if (goalKg >= b.kg) throw new InputError("Your goal weight must be below your current weight.");
  const intake = tdee - deficit, min = floorKcal(b.male);
  const sim = simulate(b, act, intake, goalKg), linear = ((b.kg - goalKg) * 7700) / deficit / 7;
  const pctW = ((deficit * 7) / 7700 / b.kg) * 100;
  return { intake: r0(intake), tdee: r0(tdee), weekly: r2(b.toU((deficit * 7) / 7700)), weeks: Number.isFinite(sim.weeks) ? r1(sim.weeks) : 0, linear: r1(linear), pct: r1((deficit / tdee) * 100), status: intake < min ? `Below ${fmtK(min)} kcal — too low to follow safely without medical supervision; choose a smaller deficit.` : pctW > 1 ? "Aggressive — more than 1% of your body weight a week; expect more muscle loss and hunger." : deficit > 1000 ? "Large deficit — keep protein high and check in with a professional." : "Sustainable — about 0.5–1% of body weight a week.", plateau: Number.isFinite(sim.weeks) ? `About ${r1(sim.weeks)} weeks once your shrinking TDEE is counted (${r1(linear)} weeks if it stayed fixed).` : "At this intake your TDEE drops to match before you reach the goal — lower intake slightly later or add activity." };
};

// ------------------------------------------------------------ weight loss by date
export const weightLossByDate: Calc = (v) => {
  const b = body(v), act = ACT[pick(v.activity, 5)], tdee = mifflin(b.male, b.kg, b.cm, b.age) * act;
  const goalW = pos(v.goal, 0), goalKg = b.us ? goalW * LB : goalW, start = dateIn(v, "start", 20000), end = dateIn(v, "end", start + 90), days = end - start;
  if (goalKg >= b.kg) throw new InputError("Your goal weight must be below your current weight.");
  if (days < 7) throw new InputError("The goal date must be at least a week after the start date.");
  // Average TDEE over the plan (weight falls roughly linearly) → intake that hits the goal on the date.
  const avgTdee = mifflin(b.male, (b.kg + goalKg) / 2, b.cm, b.age) * act;
  const needDeficit = ((b.kg - goalKg) * 7700) / days, intake = avgTdee - needDeficit, weekly = (b.kg - goalKg) / (days / 7);
  const min = floorKcal(b.male), pctW = (weekly / b.kg) * 100;
  const safeWeeks = (b.kg - goalKg) / (b.kg * 0.0075);
  return { intake: r0(intake), deficit: r0(needDeficit), weekly: r2(b.toU(weekly)), total: r1(b.toU(b.kg - goalKg)), days, tdee: r0(tdee), status: intake < min || pctW > 1 ? `Too fast — ${r1(pctW)}% of body weight a week. A safer goal date is about ${dayText(start + Math.ceil(safeWeeks * 7))}.` : pctW < 0.25 ? "Gentle pace — very sustainable." : "Realistic — about 0.25–1% of body weight a week.", safeDate: dayText(start + Math.ceil(safeWeeks * 7)), endText: dayText(end) };
};

// -------------------------------------------------------- weight loss percentage
export const weightLossPct: Calc = (v) => {
  const s = pos(v.start, 200), c = pos(v.current, 185), g = pos(v.goal, 0);
  if (s <= 0 || c <= 0) throw new InputError("Enter your starting and current weight.");
  const lost = s - c, pct = (lost / s) * 100;
  const toGoal = g > 0 ? c - g : 0, ofGoal = g > 0 && s !== g ? ((s - c) / (s - g)) * 100 : 0;
  return { pct: r2(pct), lost: r2(lost), status: lost > 0 ? (pct >= 10 ? "10%+ lost — linked with clear health gains (blood pressure, blood sugar)." : pct >= 5 ? "5%+ lost — the level where health benefits start to show." : "Good start — 5% is the first clinical milestone.") : lost < 0 ? `You have gained ${r2(-lost)} (${r2(-pct)}%).` : "No change yet.", toGoal: r2(Math.max(0, toGoal)), ofGoal: r1(ofGoal), bmi5: r1(s * 0.95), bmi10: r1(s * 0.9) };
};

// --------------------------------------------------------------- protein intake
export const PROTEIN_GOALS: [string, number, number][] = [["Minimum for a sedentary adult (RDA)", 0.8, 0.8], ["Active adult / general fitness", 1.1, 1.4], ["Weight loss (keep muscle)", 1.2, 1.6], ["Weight loss with strength training", 1.6, 2.2], ["Age 50+ / menopause", 1.0, 1.2], ["Taking a GLP-1 (Wegovy, Zepbound…)", 1.2, 1.5]];
export const proteinIntake: Calc = (v) => {
  const us = pick(v.units, 2) === 0, w = pos(v.weight, us ? 180 : 80), g = pos(v.goalWeight, 0);
  const kg = (g > 0 ? g : w) * (us ? LB : 1), [, lo, hi] = PROTEIN_GOALS[pick(v.goal, PROTEIN_GOALS.length)], meals = Math.max(1, Math.round(pos(v.meals, 3)));
  if (kg < 25) throw new InputError("Enter a body weight of at least 55 lb (25 kg).");
  const mid = (kg * (lo + hi)) / 2;
  return { mid: r0(mid), low: r0(kg * lo), high: r0(kg * hi), perMeal: r0(mid / meals), kcal: r0(mid * 4), perLb: r2(((lo + hi) / 2) * LB), basis: g > 0 ? "Goal weight (recommended when you have a lot to lose)" : "Current weight" };
};

// --------------------------------------------------------------------- keto
export const ketoCalc: Calc = (v) => {
  const b = body(v), bfIn = pos(v.bodyFat, 0), bf = bfIn > 0 ? bfIn : deurenberg(b.male, b.kg, b.cm, b.age), lean = b.kg * (1 - bf / 100);
  const bmr = bfIn > 0 ? katch(lean) : mifflin(b.male, b.kg, b.cm, b.age), tdee = bmr * ACT[pick(v.activity, 5)];
  const adj = [0, -0.1, -0.2, -0.25, 0.1][pick(v.goal, 5)], cal = Math.max(tdee * (1 + adj), floorKcal(b.male));
  const carbs = pos(v.carbs, 25), p = lean * pos(v.proteinPerLean, 1.6), fatKcal = cal - carbs * 4 - p * 4;
  if (fatKcal <= 0) throw new InputError("Protein and carbs already use up your calories — lower them.");
  const fat = fatKcal / 9;
  return { calories: r0(cal), fat: r0(fat), protein: r0(p), carbs: r0(carbs), fatPct: r0((fatKcal / cal) * 100), proteinPct: r0((p * 4 * 100) / cal), carbPct: r0((carbs * 4 * 100) / cal), tdee: r0(tdee), bf: r1(bf), lean: r1(b.toU(lean)) };
};

// -------------------------------------------------------- intermittent fasting
export const IF_PROTOCOLS: [string, number][] = [["16:8 (fast 16 h, eat 8 h)", 16], ["14:10", 14], ["12:12", 12], ["18:6", 18], ["20:4 (Warrior)", 20], ["OMAD 23:1 (one meal a day)", 23], ["36-hour fast", 36], ["Custom", 0]];
export const intermittentFasting: Calc = (v) => {
  const p = pick(v.protocol, IF_PROTOCOLS.length), fast = p === IF_PROTOCOLS.length - 1 ? pos(v.customHours, 16) : IF_PROTOCOLS[p][1];
  if (fast < 1 || fast > 120) throw new InputError("Fasting hours must be 1–120.");
  const last = parseClock(txt(v, "lastMeal") || "20:00", "Last meal time"), open = last + fast * 60, eat = Math.max(0, 24 - fast);
  return { opens: clockText(open), closes: fast >= 24 ? "—" : clockText(open + eat * 60), fast: r1(fast), eat: r1(eat), ketosis: fast >= 12 ? `Mild ketosis usually starts after about 12 h — reached at ${clockText(last + 720)}.` : "Under 12 h — mostly a break from late snacking.", weekly: r1(fast >= 24 ? fast : fast * 7) };
};

// ------------------------------------------------------- fasting weight loss
export const fastingWeightLoss: Calc = (v) => {
  const b = body(v), days = pos(v.days, 3), eaten = pos(v.eaten, 0), act = [1.2, 1.375][pick(v.activity, 2)];
  if (days <= 0 || days > 60) throw new InputError("Enter 1–60 fasting days.");
  const tdee = mifflin(b.male, b.kg, b.cm, b.age) * act * 0.95; // ~5% metabolic slowdown in a fast
  const fatKg = (Math.max(0, tdee - eaten) * days) / 7700, waterKg = Math.min(days / 3, 1) * (eaten < 800 ? 0.02 : 0.01) * b.kg, total = fatKg + waterKg;
  return { total: r1(b.toU(total)), fat: r1(b.toU(fatKg)), water: r1(b.toU(waterKg)), perDay: r2(b.toU(total / days)), deficit: r0(Math.max(0, tdee - eaten)), end: r1(b.toU(b.kg - total)), warning: days > 3 && eaten < 500 ? "Fasts over 72 hours carry real risks (electrolytes, refeeding syndrome) — do them only with medical supervision." : "Drink water and keep electrolytes up; stop if you feel faint or unwell." };
};

// --------------------------------------------------------- Weight Watchers points
export const wwPoints: Calc = (v) => {
  const cal = pos(v.calories, 250), fat = pos(v.fat, 10), sat = pos(v.satFat, 3), sugar = pos(v.sugar, 5), protein = pos(v.protein, 12), carbs = pos(v.carbs, 25), fiber = pos(v.fiber, 3), serv = pos(v.servings, 1);
  const classic = Math.max(0, cal / 50 + fat / 12 - Math.min(fiber, 4) / 5) * serv;
  const plus = Math.max(0, protein / 10.9375 + carbs / 9.2105 + fat / 3.8889 - fiber / 12.5) * serv;
  const smart = Math.max(0, 0.0305 * cal + 0.275 * sat + 0.12 * sugar - 0.098 * protein) * serv;
  return { smart: r0(smart), plus: r0(plus), classic: r0(classic), smartExact: r1(smart), plusExact: r1(plus), classicExact: r1(classic) };
};

// ------------------------------------------------------------------ carb cycling
const goalCal = (v: Record<string, number>) => {
  const b = body(v), tdee = mifflin(b.male, b.kg, b.cm, b.age) * ACT[pick(v.activity, 5)];
  return { b, tdee, target: tdee * [0.8, 0.9, 1, 1.1][pick(v.goal, 4)] };
};
export const carbCycling: Calc = (v) => {
  const { b, tdee, target } = goalCal(v), nh = Math.round(pos(v.highDays, 3));
  if (nh < 1 || nh > 6) throw new InputError("High-carb days must be 1–6 a week.");
  const nl = 7 - nh, hi = target * 1.15, lo = (7 * target - nh * hi) / nl, p = b.kg * pos(v.proteinPerKg, 2);
  const hiFat = (hi * 0.2) / 9, hiCarb = (hi - p * 4 - hiFat * 9) / 4, loCarb = b.kg * 1, loFat = (lo - p * 4 - loCarb * 4) / 9;
  if (hiCarb <= 0 || loFat <= 0) throw new InputError("Your calories are too low for this split — lower protein or choose a smaller deficit.");
  return { hiCal: r0(hi), loCal: r0(lo), protein: r0(p), hiCarb: r0(hiCarb), hiFat: r0(hiFat), loCarb: r0(loCarb), loFat: r0(loFat), weekly: r0(7 * target), tdee: r0(tdee) };
};

// ------------------------------------------------------------------ carb intake
export const CARB_GOALS: [string, number][] = [["Weight loss (moderate carb, 40%)", 0], ["Low-carb weight loss (under 130 g)", 1], ["General health (45–65% of calories)", 2], ["Build muscle (4–7 g per kg)", 3], ["Endurance training (6–10 g per kg)", 4]];
export const carbIntake: Calc = (v) => {
  const b = body(v), tdee = mifflin(b.male, b.kg, b.cm, b.age) * ACT[pick(v.activity, 5)], g = pick(v.goal, 5), meals = Math.max(1, Math.round(pos(v.meals, 3)));
  const min = floorKcal(b.male);
  const plans: [number, number, number, number][] = [ // calories, mid, low, high (g)
    [Math.max(tdee - 500, min), 0, 0, 0], [Math.max(tdee - 500, min), 0, 50, 130], [tdee, 0, 0, 0], [tdee + 300, b.kg * 5, b.kg * 4, b.kg * 7], [tdee, b.kg * 7, b.kg * 6, b.kg * 10]];
  const cal = plans[g][0];
  let [, mid, lo, hi] = plans[g];
  if (g === 0) { mid = (cal * 0.4) / 4; lo = (cal * 0.35) / 4; hi = (cal * 0.45) / 4; }
  if (g === 1) mid = Math.min(130, Math.max(50, (cal * 0.2) / 4));
  if (g === 2) { mid = (cal * 0.55) / 4; lo = (cal * 0.45) / 4; hi = (cal * 0.65) / 4; }
  return { carbs: r0(mid), low: r0(lo), high: r0(hi), perMeal: r0(mid / meals), calories: r0(cal), pct: r0(((mid * 4) / cal) * 100) };
};

// ------------------------------------------------------------------ fiber
export const fiberIntake: Calc = (v) => {
  const male = pick(v.sex, 2) === 0, age = pos(v.age, 35), cal = pos(v.calories, 2000), meals = Math.max(1, Math.round(pos(v.meals, 3)));
  const byCal = (cal / 1000) * 14, ai = male ? (age > 50 ? 30 : 38) : age > 50 ? 21 : 25, target = Math.max(byCal, ai);
  return { target: r0(target), byCal: r0(byCal), ai, perMeal: r1(target / meals), lentils: r1(target / 15.6), oats: r1(target / 4) };
};

// --------------------------------------------------------- body recomposition
export const bodyRecomp: Calc = (v) => {
  const b = body(v), bf = pos(v.bodyFat, 25), td = Math.round(pos(v.trainingDays, 4));
  if (bf <= 2 || bf >= 70) throw new InputError("Enter a body fat percentage between 3 and 70.");
  if (td < 2 || td > 7) throw new InputError("Training days must be 2–7 a week.");
  const lean = b.kg * (1 - bf / 100), tdee = katch(lean) * ACT[pick(v.activity, 5)], train = tdee * 1.1, rest = tdee * 0.8;
  const avg = (train * td + rest * (7 - td)) / 7, p = lean * 2.6, fat = b.kg * 0.8;
  const tc = (train - p * 4 - fat * 9) / 4, rc = (rest - p * 4 - fat * 9) / 4;
  if (rc < 0) throw new InputError("Rest-day calories are too low for this protein and fat — check body fat and activity.");
  return { train: r0(train), rest: r0(rest), avg: r0(avg), weekly: r0((avg - tdee) * 7), protein: r0(p), fat: r0(fat), trainCarbs: r0(tc), restCarbs: r0(rc), tdee: r0(tdee), lean: r1(b.toU(lean)), fit: bf > (b.male ? 25 : 32) ? "Higher body fat — recomp works well; a slightly bigger deficit is fine." : bf < (b.male ? 12 : 20) ? "Already lean — a recomp will be slow; a dedicated lean bulk may work better." : "Good recomp candidate, especially if you are new to lifting." };
};

// ------------------------------------------------------------------ reverse diet
export const reverseDiet: Calc = (v) => {
  const cur = pos(v.current, 1500), target = pos(v.target, 2200), step = pos(v.step, 100);
  if (target <= cur) throw new InputError("Target (maintenance) calories must be above what you eat now.");
  if (step < 25) throw new InputError("Increase by at least 25 kcal a week.");
  const weeks = Math.ceil((target - cur) / step), plan: string[] = [];
  for (let w = 1; w <= Math.min(weeks, 12); w++) plan.push(`Wk ${w}: ${fmtK(Math.min(target, cur + step * w))}`);
  return { weeks, plan: plan.join(" · ") + (weeks > 12 ? " …" : ""), carbsPerWeek: r0((step * 0.75) / 4), fatPerWeek: r0((step * 0.25) / 9), total: r0(target - cur) };
};

// --------------------------------------------------------------------- PSMF
export const PSMF_ACT = ["Inactive", "Aerobic exercise", "Weight training"];
export const psmfCalc: Calc = (v) => {
  const us = pick(v.units, 2) === 0, male = pick(v.sex, 2) === 0, w = pos(v.weight, us ? 200 : 90), bf = pos(v.bodyFat, 25), a = pick(v.activity, 3);
  if (bf <= 3 || bf >= 70) throw new InputError("Enter a body fat percentage between 4 and 69.");
  const kg = us ? w * LB : w, leanLb = (kg * (1 - bf / 100)) / LB;
  const cat = male ? (bf <= 15 ? 0 : bf <= 25 ? 1 : 2) : bf <= 24 ? 0 : bf <= 34 ? 1 : 2;
  const perLb = [[1.25, 1.5, 2.0], [0.9, 1.1, 1.25], [0.8, 0.9, 1.0]][cat][a], p = leanLb * perLb, fat = 15, carbs = 25, cal = p * 4 + fat * 9 + carbs * 4;
  const tdee = katch(kg * (1 - bf / 100)) * [1.3, 1.45, 1.45][a];
  return { protein: r0(p), calories: r0(cal), fat, carbs, category: `Category ${cat + 1}`, duration: ["11–12 days, then a 2–3 day refeed", "2–6 weeks, with one 5-hour refeed (or two free meals) a week", "6–12 weeks, with one free meal a week"][cat], weekly: r2(((tdee - cal) * 7) / (us ? 3500 : 7700)), perLb };
};

// ------------------------------------------------------------- zigzag / calorie cycling
export const ZIG_PATTERNS = ["2 high days (weekend)", "1 high day a week", "Alternate high and low days"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const zigzagDiet: Calc = (v) => {
  const b = body(v), tdee = mifflin(b.male, b.kg, b.cm, b.age) * ACT[pick(v.activity, 5)], def = pos(v.deficit, 500), pat = pick(v.pattern, 3);
  const high = [[5, 6], [5], [0, 2, 4, 6]][pat], weekly = (tdee - def) * 7, nh = high.length, low = (weekly - nh * tdee) / (7 - nh);
  if (low < floorKcal(b.male)) throw new InputError("Low days would fall below a safe minimum — choose a smaller deficit or fewer high days.");
  return { low: r0(low), high: r0(tdee), avg: r0(weekly / 7), weekly: r0(weekly), schedule: DAYS.map((d, i) => `${d} ${fmtK(high.includes(i) ? tdee : low)}`).join(" · "), lossWeek: r2(b.toU((def * 7) / 7700)) };
};

// ---------------------------------------------------------------- net calories
export const netCalories: Calc = (v) => {
  const eaten = pos(v.eaten, 2000), ex = pos(v.exercise, 400), needs = pos(v.needs, 2000), us = pick(v.units, 2) === 0;
  const net = eaten - ex, bal = net - needs;
  return { net: r0(net), balance: r0(bal), status: bal < -50 ? `Deficit of ${fmtK(-bal)} kcal` : bal > 50 ? `Surplus of ${fmtK(bal)} kcal` : "About even (maintenance)", week: r2((bal * 7) / (us ? 3500 : 7700)), month: r2((bal * 30) / (us ? 3500 : 7700)) };
};

// --------------------------------------------------------------------- TEF
export const thermicEffect: Calc = (v) => {
  const p = pos(v.protein, 120), c = pos(v.carbs, 250), f = pos(v.fat, 70), a = pos(v.alcohol, 0);
  const kp = p * 4, kc = c * 4, kf = f * 9, ka = a * 7, total = kp + kc + kf + ka;
  if (total <= 0) throw new InputError("Enter what you ate in grams.");
  const lo = kp * 0.2 + kc * 0.05 + kf * 0 + ka * 0.1, hi = kp * 0.3 + kc * 0.1 + kf * 0.03 + ka * 0.3, mid = (lo + hi) / 2;
  return { tef: r0(mid), low: r0(lo), high: r0(hi), total: r0(total), pct: r1((mid / total) * 100), net: r0(total - mid), fromProtein: r0(kp * 0.25) };
};

// ---------------------------------------------------------------- water intake
export const waterIntake: Calc = (v) => {
  const us = pick(v.units, 2) === 0, male = pick(v.sex, 2) === 0, w = pos(v.weight, us ? 180 : 80), kg = us ? w * LB : w, mins = pos(v.exercise, 30);
  if (kg < 25) throw new InputError("Enter a body weight of at least 55 lb (25 kg).");
  const ml = kg * 33 + (mins / 30) * 350 + (pick(v.climate, 2) === 1 ? 500 : 0) + (pick(v.creatine, 2) === 1 ? 500 : 0);
  const awake = Math.max(8, 24 - pos(v.sleep, 8));
  return { liters: r2(ml / 1000), oz: r0(ml / 29.5735), cups: r1(ml / 236.588), perHour: r0(ml / awake), nasem: male ? "3.7 L a day for men (about 2.9 L from drinks)" : "2.7 L a day for women (about 2.2 L from drinks)", tip: "For weight loss, a 500 mL (16 oz) glass of water before meals helped people eat less in trials." };
};

// ------------------------------------------------------------------ Bibibop
export type MenuItem = [name: string, kcal: number];
export const SLOTS = 8;
export const BIBIBOP: MenuItem[] = [
  ["White Rice base (5 oz)", 180], ["Purple Rice base (5 oz)", 170], ["Lemon Turmeric Rice base (5 oz)", 290], ["Sweet Potato Noodles base (6 oz)", 300], ["Crispy Romaine base (2.5 oz)", 45], ["Citrus Honey Kale base (2.5 oz)", 100],
  ["Chicken (4 oz)", 170], ["Spicy Chicken (4 oz)", 230], ["Korean Crispy Chicken (5 oz)", 160], ["Steak (4 oz)", 230], ["Korean BBQ Beef (4 oz)", 160], ["Miso Glazed Salmon (4 oz)", 250], ["Tofu (4 oz)", 150],
  ["Bean Sprouts (2 oz)", 30], ["Black Beans (2 oz)", 45], ["Curry Chickpeas (1.5 oz)", 45], ["Potatoes (3 oz)", 90], ["Roasted Brussels Sprouts (2 oz)", 40], ["Roasted Sesame Broccoli (2 oz)", 60],
  ["Avocado (1.5 oz)", 80], ["Carrots", 15], ["Cheese", 90], ["Cucumbers", 0], ["Corn", 20], ["Eggs", 40], ["Honey Citrus Kale topping", 10], ["Kimchi topping", 10], ["Pickled Red Onion", 15], ["Pineapple topping (3 oz)", 45],
  ["Yum Yum sauce", 140], ["Teriyaki sauce", 70], ["Gochujang sauce", 70], ["Spicy Sriracha sauce", 25], ["Sesame Ginger sauce", 100], ["Sesame Oil", 70],
  ["Kimchi side (3.5 oz)", 30], ["Miso Soup (6 oz)", 25], ["Pineapple side (3.5 oz)", 60], ["Purple Rice side (6 oz)", 230], ["White Rice side (6 oz)", 270], ["Noodles side (6 oz)", 210],
  ["Chocolate Chip Cookie", 380], ["Snickerdoodle Cookie", 380], ["Coca-Cola Classic", 220], ["Diet Coke / Coke Zero Sugar", 0], ["Sprite", 210], ["Lemonade", 210],
];
export const bibibopCalc: Calc = (v) => {
  let total = 0, items = 0, top = 0;
  for (let i = 1; i <= SLOTS; i++) {
    const q = pos(v[`qty${i}`], 0);
    if (q <= 0) continue;
    const k = BIBIBOP[pick(v[`item${i}`], BIBIBOP.length)][1] * q;
    total += k; items += q; top = Math.max(top, k);
  }
  const daily = pos(v.dailyTarget, 2000) || 2000;
  return { total: r0(total), pct: r2((total / daily) * 100), left: r0(daily - total), walk: r0(total / 4.5), run: r0(total / 11), items: r2(items), top: r0(top) };
};

export const fitDietCustomCalculators: Record<string, Calc> = {
  "calorie-calculator": calorieCalc,
  "tdee-calculator": tdeeCalc,
  "calorie-deficit-calculator": calorieDeficit,
  "weight-loss-calculator": weightLossByDate,
  "weight-loss-percentage-calculator": weightLossPct,
  "protein-intake-calculator": proteinIntake,
  "keto-calculator": ketoCalc,
  "intermittent-fasting-calculator": intermittentFasting,
  "fasting-weight-loss-calculator": fastingWeightLoss,
  "weight-watchers-points-calculator": wwPoints,
  "carb-cycling-calculator": carbCycling,
  "carb-intake-calculator": carbIntake,
  "fiber-intake-calculator": fiberIntake,
  "body-recomposition-calculator": bodyRecomp,
  "reverse-diet-calculator": reverseDiet,
  "psmf-calculator": psmfCalc,
  "zigzag-diet-calculator": zigzagDiet,
  "net-calorie-calculator": netCalories,
  "thermic-effect-of-food-calculator": thermicEffect,
  "water-intake-calculator": waterIntake,
  "bibibop-nutrition-calculator": bibibopCalc,
};
