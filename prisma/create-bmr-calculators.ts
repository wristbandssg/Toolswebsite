// One-time (but safe to re-run) setup script: 1 tool from the popular-keyword check
// (16 Nov 2026 — Claude outputs/Popular_Keyword_Check.md).
// Food & Drink > Diet, Macro & Meal Planning: BMR (basal metabolic rate) calculator.
// Formulas: src/lib/calc-engine-bmr.ts. Published.
//
// HOW TO RUN
//   npm run db:create-bmr-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-bmr";
import { mk, dd, num, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bmrCustomCalculators;

const DIET: ToolDef[] = [
  mk({
    slug: "bmr-calculator", title: "BMR Calculator (Basal Metabolic Rate — Mifflin-St Jeor, Harris-Benedict & Katch-McArdle)",
    meta: "BMR Calculator — Basal Metabolic Rate in Calories a Day",
    desc: "Work out your basal metabolic rate (BMR), the calories your body burns at complete rest, from your age, sex, height and weight. Compare the Mifflin-St Jeor, revised Harris-Benedict and Katch-McArdle equations and see your daily calorie needs at every activity level.",
    inputs: [
      dd("units", "Units", E.BMR_UNITS, 0), dd("sex", "Sex", E.BMR_SEX, 0), num("age", "Age", 30, 15, 100, 1, "years"),
      num("weight", "Weight (lb for US, kg for metric)", 176, 1, 800, 0.1),
      num("feet", "Height — feet (US)", 5, 0, 8, 1, "ft"), num("inches", "Height — inches (US)", 11, 0, 11.9, 0.1, "in"),
      num("cm", "Height — cm (metric)", 180, 0, 250, 0.1, "cm"),
      num("bodyFat", "Body Fat % (optional, for Katch-McArdle)", 0, 0, 69, 0.1, "%"),
      dd("formula", "Equation", E.BMR_FORMULAS, 0),
    ],
    results: [["bmr", "Your BMR", "t"], ["formulaUsed", "Based On", "t"], ["perHour", "Per Hour", "t"], ["compare", "All Three Equations", "t"], ["daily", "Daily Calories by Activity (TDEE)", "t"], ["loss", "To Lose Weight", "t"]],
    fn: C["bmr-calculator"], ex: { units: 0, sex: 0, age: 30, weight: 176, feet: 5, inches: 11, cm: 180, bodyFat: 0, formula: 0 },
    exText: (o) => `Example: a 30-year-old man, 5 ft 11 in and 176 lb, has a BMR of ${o.bmr} with Mifflin-St Jeor.`,
    how: "BMR is the energy your body uses just to stay alive at rest — breathing, circulation, keeping warm, brain and organ work. It is usually 60–70% of the calories you burn in a day.\n\nMifflin-St Jeor (1990) is the most accurate for most people: BMR = 10 × weight (kg) + 6.25 × height (cm) − 5 × age + 5 for men, or − 161 for women. The revised Harris-Benedict equation (1984) tends to come out a little higher. Katch-McArdle uses lean body mass instead: BMR = 370 + 21.6 × lean mass (kg), so it suits lean or very muscular people who know their body fat %.\n\nMultiply BMR by an activity factor (1.2 sedentary up to 1.9 extra active) to get your total daily energy expenditure (TDEE). Eating about 500 kcal a day below TDEE loses roughly 0.5 kg (1 lb) a week.",
    assume: "The equations are population averages and can be 10% off for any one person. They are for adults and teens over 15, not for pregnancy or children. Body fat % is only used by Katch-McArdle. This isn't medical advice.",
    faq: [
      ["What is a normal BMR?", "Roughly 1,500–1,900 kcal a day for adult men and 1,200–1,500 for women, depending mostly on size and age."],
      ["Is BMR the same as RMR?", "Almost. Resting metabolic rate (RMR) is measured under looser conditions and runs a few percent higher, so the same equations are used for both."],
      ["Should I eat my BMR to lose weight?", "No — BMR is what you burn lying still. Eat below your TDEE (BMR × activity) instead, and don't go under BMR for long without medical advice."],
      ["Which BMR formula is most accurate?", "Mifflin-St Jeor for most people. Katch-McArdle is better if you know your body fat % and are lean or muscular."],
    ],
  }),
];

async function main() {
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${DIET.length} tool definitions`); for (const t of DIET) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("diet-macro-meal-planning-calculators", DIET);
}
main().catch((e) => { console.error(e); process.exit(1); });
