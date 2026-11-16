/**
 * Batch: popular-keyword check (16 Nov 2026 — Claude outputs/Popular_Keyword_Check.md).
 * One Food & Drink > Diet, Macro & Meal Planning tool: a general BMR (basal metabolic rate)
 * calculator.
 *
 * Near-namesakes kept apart on purpose:
 *  - bmr-calculator = calories burned at complete rest, compared across three standard equations
 *    (Mifflin-St Jeor, revised Harris-Benedict, Katch-McArdle), with daily needs per activity level.
 *  - tdee-calculator (existing) starts from one activity level and gives total daily calories.
 *  - bmr-for-athletes-calculator (existing) uses athlete-specific lean-mass equations
 *    (Cunningham, De Lorenzo) and training load.
 *  - calorie-calculator (existing) gives calories to lose/gain weight at a goal rate.
 */

import { type TrvCalculator as Calc, InputError, num, pick } from "./trv-core";

export const BMR_UNITS = ["US (lb, ft & in)", "Metric (kg, cm)"];
export const BMR_SEX = ["Male", "Female"];
export const BMR_FORMULAS = ["Mifflin-St Jeor (recommended)", "Revised Harris-Benedict", "Katch-McArdle (needs body fat %)"];

const LEVELS: [string, number][] = [
  ["Sedentary (desk job, little exercise)", 1.2],
  ["Light (exercise 1–3 days a week)", 1.375],
  ["Moderate (exercise 3–5 days a week)", 1.55],
  ["Very active (hard exercise 6–7 days)", 1.725],
  ["Extra active (physical job + training)", 1.9],
];

const kcal = (x: number) => `${Math.round(x).toLocaleString("en-US")} kcal`;

export function bmrEquations(sex: number, age: number, kg: number, cm: number, bodyFat: number) {
  const mifflin = 10 * kg + 6.25 * cm - 5 * age + (sex === 0 ? 5 : -161);
  const harris = sex === 0
    ? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age
    : 447.593 + 9.247 * kg + 3.098 * cm - 4.330 * age;
  const lbm = bodyFat > 0 ? kg * (1 - bodyFat / 100) : NaN;
  const katch = bodyFat > 0 ? 370 + 21.6 * lbm : NaN;
  return { mifflin, harris, katch, lbm };
}

const bmr: Calc = (v) => {
  const units = pick(v.units, 2), sex = pick(v.sex, 2), formula = pick(v.formula, 3);
  const age = num(v.age, 30);
  const w = num(v.weight, units === 0 ? 176 : 80);
  const kg = units === 0 ? w * 0.45359237 : w;
  const cm = units === 0 ? (num(v.feet, 5) * 12 + num(v.inches, 11)) * 2.54 : num(v.cm, 180);
  const bf = num(v.bodyFat, 0);
  if (age < 15 || age > 100) throw new InputError("Age must be between 15 and 100 — the BMR equations were built on adults and teens.");
  if (kg < 25 || kg > 350) throw new InputError("Enter a weight between 55 and 770 lb (25–350 kg).");
  if (cm < 120 || cm > 250) throw new InputError("Enter a height between 4 ft and 8 ft 2 in (120–250 cm).");
  if (bf < 0 || bf >= 70) throw new InputError("Body fat must be between 0 and 70% (leave it at 0 if you don't know it).");
  if (formula === 2 && bf <= 0) throw new InputError("Katch-McArdle needs your body fat %. Enter it, or pick Mifflin-St Jeor.");

  const e = bmrEquations(sex, age, kg, cm, bf);
  const base = formula === 0 ? e.mifflin : formula === 1 ? e.harris : e.katch;
  const name = BMR_FORMULAS[formula].replace(/ \(.*\)$/, "");
  const lbs = (x: number) => (units === 0 ? `${(x / 0.45359237).toFixed(1)} lb` : `${x.toFixed(1)} kg`);

  const compare = [
    `Mifflin-St Jeor: ${kcal(e.mifflin)}`,
    `Revised Harris-Benedict: ${kcal(e.harris)}`,
    Number.isFinite(e.katch) ? `Katch-McArdle: ${kcal(e.katch)} (lean mass ${lbs(e.lbm)})` : "Katch-McArdle: enter body fat % to see it",
  ].join(" · ");

  return {
    bmr: `${kcal(base)} a day`,
    formulaUsed: `${name} for a ${age}-year-old ${sex === 0 ? "man" : "woman"}, ${lbs(kg)}, ${units === 0 ? `${Math.floor(cm / 2.54 / 12)} ft ${Math.round((cm / 2.54) % 12)} in` : `${Math.round(cm)} cm`}`,
    perHour: `${Math.round(base / 24)} kcal an hour · ${(base / 1440).toFixed(2)} kcal a minute`,
    compare,
    daily: LEVELS.map(([l, f]) => `${l}: ${kcal(base * f)}`).join(" · "),
    loss: base * 1.375 - 500 >= base
      ? `Lose about 0.5 kg (1 lb) a week: ${kcal(base * 1.375 - 500)} a day at a light activity level (500 kcal under your TDEE).`
      : `At a light activity level a 500 kcal cut would take you below your BMR, so eat about ${kcal(base)} a day and add activity to widen the gap. Don't eat below your BMR for long without medical advice.`,
  };
};

export const bmrCustomCalculators: Record<string, Calc> = {
  "bmr-calculator": bmr,
};
