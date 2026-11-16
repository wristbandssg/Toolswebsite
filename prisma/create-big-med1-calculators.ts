// One-time (but safe to re-run) batch setup script: 9 Health > Sleep & Medical tools from the big
// generic keyword check (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md): drug dosage,
// prescription refill, medication schedule, IV drip rate, insulin dose, adjusted body weight,
// blood sugar converter, pack-years and blood donation eligibility.
// Formulas: src/lib/calc-engine-big-med1.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-big-med1-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-med1";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigMed1CustomCalculators;
const NOW = 20772; // 15 Nov 2026
const MED = "This calculator is for information and double-checking only. It isn't medical advice — always follow the dose on the label or from your doctor, pharmacist or nurse.";

const TOOLS: ToolDef[] = [
  mk({
    slug: "drug-dosage-calculator", title: "Drug Dosage Calculator (mg/kg Dose & mg to mL)",
    meta: "Drug Dosage Calculator — mg/kg Dose and mg to mL",
    desc: "Work out a medicine dose from body weight in mg/kg, or convert a dose in mg to mL (and mL to mg) from the liquid strength, such as 250 mg/5 mL. Shows the dose per time, the daily total, teaspoons and a maximum-dose cap.",
    inputs: [dd("mode", "Calculate", E.DD_MODES, 0), num("weight", "Body Weight", 20, 0, 500, 0.1), dd("wunit", "Weight Unit", E.DD_WUNITS, 0), num("mgkg", "Dose (mg/kg)", 15, 0, 1000, 0.1), dd("basis", "The mg/kg Dose Is", E.DD_BASIS, 0), dd("freq", "How Often", E.DD_FREQ, 2), num("doseMg", "Dose in mg (fixed-dose mode)", 500, 0, 100000, 0.1), num("doseMl", "Volume in mL (mL → mg mode)", 5, 0, 1000, 0.1), num("concMg", "Liquid Strength — mg", 250, 0, 100000, 0.1), num("concMl", "… per mL", 5, 0, 1000, 0.1), num("maxDose", "Maximum Single Dose in mg (0 = none)", 0, 0, 100000, 1)],
    results: [["dose", "Dose per Time", "t"], ["volume", "Volume per Time", "t"], ["tsp", "In Teaspoons", "t"], ["daily", "Per Day", "t"], ["strength", "Strength", "t"], ["weight", "Weight Used", "t"], ["cap", "Maximum Dose Check", "t"], ["working", "Working", "t"]],
    fn: C["drug-dosage-calculator"], ex: { mode: 0, weight: 20, wunit: 0, mgkg: 15, basis: 0, freq: 2, doseMg: 500, doseMl: 5, concMg: 250, concMl: 5, maxDose: 0 },
    exText: (o) => `Example: 15 mg/kg for a 20 kg child is ${o.dose} per dose. With a 250 mg/5 mL liquid that's ${o.volume}, and 3 doses a day is ${o.daily}.`,
    how: "Weight-based dose (mg) = dose in mg/kg × weight in kg. If the prescription gives a daily mg/kg dose, divide it by the number of doses per day.\n\nTo turn mg into mL, divide by the strength in mg per mL. 250 mg/5 mL is 50 mg/mL, so a 300 mg dose is 6 mL. To turn mL into mg, multiply instead.\n\nEnter a maximum single dose to cap the result, because adult maximums apply to heavier children.",
    assume: `1 lb = 0.4536 kg and 1 teaspoon = 4.93 mL (use an oral syringe or the spoon that came with the medicine). ${MED}`,
    faq: [["How do I calculate mg/kg?", "Multiply the dose in mg/kg by the weight in kg. 10 mg/kg for a 15 kg child = 150 mg."], ["How do I convert mg to mL?", "Divide the mg by the concentration in mg/mL. With 125 mg/5 mL (25 mg/mL), 200 mg = 8 mL."], ["What does 250 mg/5 mL mean?", "Every 5 mL of the liquid contains 250 mg of the medicine (50 mg per mL)."], ["Is mg the same as mL?", "No. mg is weight of medicine and mL is liquid volume; you need the strength to convert."]],
  }),
  mk({
    slug: "prescription-refill-calculator", title: "Prescription Refill Calculator (Days' Supply & Refill Date)",
    meta: "Prescription Refill Calculator — Days Supply & Refill Date",
    desc: "Find the days' supply of a prescription, the date it runs out and the earliest date your insurance will let you refill it (75–90% rule), plus how long all your refills will last.",
    inputs: [num("qty", "Quantity Dispensed (tablets, mL, puffs…)", 30, 0, 100000, 1), num("perDose", "Amount per Dose", 1, 0, 1000, 0.25), num("doses", "Doses per Day", 1, 0, 24, 0.5), date("fill", "Date Filled", "today"), dd("rule", "Refill Allowed When", E.RX_RULES, 0), num("refills", "Refills Remaining", 0, 0, 99, 1)],
    results: [["supply", "Days' Supply", "t"], ["runout", "Runs Out", "t"], ["refill", "Earliest Refill Date", "t"], ["daily", "Used per Day", "t"], ["leftover", "Left Over", "t"], ["total", "With All Refills", "t"]],
    fn: C["prescription-refill-calculator"], ex: { qty: 30, perDose: 1, doses: 1, fill: NOW, rule: 0, refills: 2 },
    exText: (o) => `Example: 30 tablets taken once a day, filled on 15 November 2026, last ${o.supply}. The supply runs out on ${o.runout}, and the earliest refill is ${o.refill}.`,
    how: "Days' supply = quantity ÷ (amount per dose × doses per day). 90 tablets taken 2 at a time, twice a day, last 22 days.\n\nMost insurers allow a refill once about 75% of the supply has been used (day 23 of a 30-day fill). Controlled medicines are often stricter (80–90%). Pick your plan's rule to see the earliest date.",
    assume: `Fractions of a day are not counted; refill rules vary by insurer, pharmacy and state. ${MED}`,
    faq: [["How early can I refill a 30-day prescription?", "Usually after 23 days (75%). Some plans allow 21–25 days."], ["How do I calculate days' supply?", "Divide the quantity by the amount used per day: 60 tablets at 2 a day = 30 days."], ["How early can I refill a 90-day supply?", "At 75% that's after 68 days."]],
  }),
  mk({
    slug: "medication-schedule-calculator", title: "Medication Schedule Calculator (Every 8 Hours & 3 Times a Day Times)",
    meta: "Medication Time Calculator — Every 6, 8 or 12 Hours",
    desc: "Get the clock times for each dose of a medicine taken every 4, 6, 8 or 12 hours, or 2, 3 or 4 times a day spread across your waking hours, starting from your first dose.",
    inputs: [dd("plan", "How Often", E.MS_PLANS, 2), tx("first", "First Dose Time (e.g. 07:00 or 7 am)", "07:00"), tx("bed", "Bedtime (for 'times a day' plans)", "22:00"), num("days", "Number of Days", 7, 1, 30, 1)],
    results: [["times", "Dose Times", "t"], ["count", "Doses", "t"], ["pattern", "Pattern", "t"], ["next", "Next Day", "t"]],
    fn: C["medication-schedule-calculator"], ex: { plan: 2, ...T("first", "07:00"), ...T("bed", "22:00"), days: 7 },
    exText: (o) => `Example: a medicine taken every 8 hours, starting at 07:00, is due at ${o.times}.`,
    how: "\"Every 8 hours\" means evenly around the clock (3 doses in 24 hours), so one dose may fall at night. \"3 times a day\" usually means with your waking day: the doses are spread evenly between your first dose and bedtime.\n\nIf you're unsure which your prescription means, ask the pharmacist. Some antibiotics need true 8-hour spacing.",
    assume: `Times use the 24-hour clock and are rounded to 15 minutes for 'times a day' plans. ${MED}`,
    faq: [["Is 3 times a day the same as every 8 hours?", "Not always. Every 8 hours is strict around the clock; 3 times a day is usually morning, midday/afternoon and bedtime."], ["What times are every 6 hours?", "From 6 am: 6 am, 12 pm, 6 pm and 12 am."], ["What if I miss a dose?", "Follow the leaflet or ask a pharmacist. Don't double up unless told to."]],
  }),
  mk({
    slug: "iv-drip-rate-calculator", title: "IV Drip Rate Calculator (Drops per Minute & mL/hr)",
    meta: "IV Drip Rate Calculator — gtt/min and mL/hr",
    desc: "Calculate an IV infusion's drip rate in drops per minute (gtt/min) from the volume, time and tubing drop factor (10, 15, 20 or 60 gtt/mL), plus the flow rate in mL/hr and seconds per drop.",
    inputs: [num("volume", "Volume to Infuse (mL)", 1000, 0, 10000, 1), num("hours", "Time — Hours", 8, 0, 72, 1), num("minutes", "Time — Minutes", 0, 0, 59, 1), dd("factor", "Drop Factor", E.IV_FACTORS, 2)],
    results: [["gtt", "Drip Rate", "t"], ["mlhr", "Flow Rate", "t"], ["sec", "Drop Timing", "t"], ["drops", "Total Drops", "t"], ["working", "Working", "t"]],
    fn: C["iv-drip-rate-calculator"], ex: { volume: 1000, hours: 8, minutes: 0, factor: 2 },
    exText: (o) => `Example: 1,000 mL over 8 hours with 20 gtt/mL tubing runs at ${o.gtt} (${o.mlhr}).`,
    how: "Drops per minute = volume (mL) × drop factor (gtt/mL) ÷ time (minutes). Flow rate = volume ÷ hours.\n\nMacro-drip sets deliver 10, 15 or 20 drops per mL; micro-drip sets deliver 60, so gtt/min equals mL/hr. Count the drops for 15 seconds and multiply by 4 to check the rate.",
    assume: `Gravity infusion with whole drops. Check against your facility's protocol and the pump settings. ${MED}`,
    faq: [["What is the drip rate formula?", "gtt/min = (mL × gtt/mL) ÷ minutes. 500 mL over 4 h with 15 gtt/mL = 31 gtt/min."], ["What is a drop factor?", "The number of drops in 1 mL for that tubing, printed on the package."], ["How do I convert mL/hr to gtt/min?", "gtt/min = mL/hr × drop factor ÷ 60."]],
  }),
  mk({
    slug: "insulin-dose-calculator", title: "Insulin Dose Calculator (Carb Ratio + Correction Factor)",
    meta: "Insulin Dose Calculator — Carb Ratio & Correction Dose",
    desc: "Estimate a mealtime insulin bolus from the carbs you'll eat and your insulin-to-carb ratio, plus a correction dose from your blood sugar, target and sensitivity factor, minus insulin on board. Can estimate ratios from your total daily dose (500 and 1800 rules).",
    inputs: [num("carbs", "Carbs in the Meal (g)", 60, 0, 500, 1), num("icr", "Insulin-to-Carb Ratio (g per unit)", 10, 0, 200, 0.5), num("bg", "Current Blood Sugar", 180, 0, 1000, 1), num("target", "Target Blood Sugar", 120, 0, 1000, 1), num("isf", "Correction Factor (drop per unit)", 50, 0, 500, 1), dd("unit", "Blood Sugar Unit", E.INS_UNITS, 0), num("iob", "Insulin on Board (units)", 0, 0, 100, 0.1), num("tdd", "Total Daily Dose to Estimate Ratios (0 = use mine)", 0, 0, 500, 1)],
    results: [["total", "Estimated Bolus", "t"], ["meal", "Meal Dose", "t"], ["correction", "Correction Dose", "t"], ["iob", "Insulin on Board", "t"], ["ratios", "Ratios Used", "t"], ["warning", "Note", "t"]],
    fn: C["insulin-dose-calculator"], ex: { carbs: 60, icr: 10, bg: 180, target: 120, isf: 50, unit: 0, iob: 0, tdd: 0 },
    exText: (o) => `Example: 60 g of carbs at 1 unit per 10 g, with blood sugar 180 mg/dL, target 120 and a correction factor of 50, needs about ${o.total}.`,
    how: "Meal dose = carbs ÷ insulin-to-carb ratio. Correction dose = (current − target blood sugar) ÷ correction factor. Total = meal + correction − insulin still active from an earlier bolus.\n\nIf you don't know your ratios, the 500 rule (500 ÷ total daily dose) estimates the carb ratio and the 1800 rule (1800 ÷ TDD, or 100 ÷ TDD in mmol/L) estimates the correction factor.",
    assume: `Rounded to the nearest half unit. Activity, illness and alcohol change insulin needs. ${MED}`,
    faq: [["How do I calculate an insulin bolus?", "Carbs ÷ carb ratio + (BG − target) ÷ correction factor. 45 g ÷ 15 + (200 − 100) ÷ 50 = 3 + 2 = 5 units."], ["What is the 500 rule?", "500 ÷ total daily insulin dose = grams of carbs covered by 1 unit."], ["What is the 1800 rule?", "1800 ÷ total daily dose = how many mg/dL 1 unit lowers blood sugar."]],
  }),
  mk({
    slug: "adjusted-body-weight-calculator", title: "Adjusted Body Weight Calculator (AdjBW for Dosing)",
    meta: "Adjusted Body Weight Calculator — AdjBW, IBW & % IBW",
    desc: "Calculate adjusted body weight (AdjBW = IBW + 0.4 × (actual − IBW)), ideal body weight by the Devine formula and percent of ideal weight, with which weight to use for drug dosing.",
    inputs: [dd("sex", "Sex", E.ABW_SEX, 0), num("height", "Height", 175, 0, 300, 0.1), dd("hunit", "Height Unit", E.ABW_HUNITS, 0), num("weight", "Actual Weight", 110, 0, 700, 0.1), dd("wunit", "Weight Unit", E.ABW_WUNITS, 0), num("factor", "Correction Factor", 0.4, 0.2, 0.6, 0.05)],
    results: [["abw", "Adjusted Body Weight", "t"], ["ibw", "Ideal Body Weight", "t"], ["pct", "Actual vs Ideal", "t"], ["use", "Weight to Use", "t"], ["bmi", "BMI", "t"], ["working", "Working", "t"]],
    fn: C["adjusted-body-weight-calculator"], ex: { sex: 0, height: 175, hunit: 0, weight: 110, wunit: 0, factor: 0.4 },
    exText: (o) => `Example: a 175 cm man weighing 110 kg has an ideal body weight of ${String(o.ibw).replace(/ — .*/, "")} and an adjusted body weight of ${o.abw}.`,
    how: "Ideal body weight (Devine): men 50 kg + 2.3 kg per inch over 5 feet; women 45.5 kg + 2.3 kg per inch.\n\nAdjusted body weight = IBW + 0.4 × (actual weight − IBW). It's used for dosing some drugs (aminoglycosides, some chemotherapy) and for nutrition needs when someone weighs more than about 120% of ideal.",
    assume: `The Devine formula is meant for adults about 5 ft (152 cm) and taller. ${MED}`,
    faq: [["What is the adjusted body weight formula?", "AdjBW = IBW + 0.4 × (actual − IBW)."], ["When do you use adjusted body weight?", "Usually when actual weight is more than 120% (some use 130%) of ideal body weight."], ["What is IBW for a 5'10\" man?", "50 + 2.3 × 10 = 73 kg."]],
  }),
  mk({
    slug: "blood-sugar-converter-calculator", title: "Blood Sugar Converter (mmol/L to mg/dL)",
    meta: "Blood Sugar Converter — mmol/L to mg/dL and Back",
    desc: "Convert a blood glucose reading between mmol/L and mg/dL (× 18) and see whether it's in the low, normal, prediabetes or diabetes range for fasting, after-meal or random tests.",
    inputs: [dd("dir", "Convert", E.BS_DIR, 0), num("value", "Blood Sugar Reading", 5.5, 0, 2000, 0.1), dd("when", "When Was It Taken", E.BS_WHEN, 0)],
    results: [["result", "Converted", "t"], ["both", "Both Units", "t"], ["band", "Range", "t"], ["factor", "Conversion", "t"]],
    fn: C["blood-sugar-converter-calculator"], ex: { dir: 0, value: 5.5, when: 0 },
    exText: (o) => `Example: a fasting reading of 5.5 mmol/L is ${o.result} — ${o.band}.`,
    how: "mg/dL = mmol/L × 18.016, and mmol/L = mg/dL ÷ 18.016. The UK, Canada and Australia use mmol/L; the US uses mg/dL.\n\nRanges: fasting 70–99 mg/dL (3.9–5.5 mmol/L) is normal, 100–125 is the prediabetes range and 126 or more (on two tests) is the diabetes range. Two hours after eating, under 140 mg/dL (7.8 mmol/L) is normal.",
    assume: `American Diabetes Association thresholds. One reading doesn't diagnose diabetes. ${MED}`,
    faq: [["What is 7 mmol/L in mg/dL?", "About 126 mg/dL."], ["What is 100 mg/dL in mmol/L?", "About 5.6 mmol/L."], ["Why multiply by 18?", "Glucose's molar mass is 180 g/mol, so 1 mmol/L = 180 mg/L = 18 mg/dL."]],
  }),
  mk({
    slug: "pack-year-calculator", title: "Pack Year Calculator (Smoking Pack-Years & Lung Screening)",
    meta: "Pack Year Calculator — Smoking History & CT Screening",
    desc: "Calculate smoking pack-years from packs or cigarettes per day and years smoked, the total cigarettes and whether you meet the USPSTF lung cancer screening criteria (age 50–80, 20+ pack-years).",
    inputs: [dd("unit", "I Smoke(d)", E.PY_UNITS, 0), num("amount", "Amount per Day", 1, 0, 200, 0.25), num("perPack", "Cigarettes per Pack", 20, 1, 50, 1), num("years", "Years Smoked", 20, 0, 90, 0.5), num("age", "Your Age", 55, 10, 110, 1), dd("status", "Status", E.PY_STATUS, 0), num("quit", "Years Since Quitting (former smokers)", 0, 0, 80, 1)],
    results: [["py", "Pack-Years", "t"], ["cigs", "Total Cigarettes", "t"], ["ppd", "Per Day", "t"], ["screening", "Lung Cancer Screening", "t"], ["working", "Working", "t"]],
    fn: C["pack-year-calculator"], ex: { unit: 1, amount: 15, perPack: 20, years: 30, age: 58, status: 0, quit: 0 },
    exText: (o) => `Example: 15 cigarettes a day for 30 years is ${o.py}. ${o.screening}.`,
    how: "Pack-years = packs smoked per day × years smoked. One pack is 20 cigarettes, so 10 cigarettes a day for 20 years is 10 pack-years.\n\nThe US Preventive Services Task Force (2021) recommends a yearly low-dose CT scan for adults aged 50–80 with 20 or more pack-years who smoke now or quit within the past 15 years.",
    assume: `Use your average amount if it changed over time; add separate periods together. ${MED}`,
    faq: [["How do I calculate pack-years?", "Packs per day × years smoked. 1.5 packs a day for 20 years = 30 pack-years."], ["How many cigarettes are in a pack?", "20 in the US and most countries."], ["Who should get lung cancer screening?", "Adults 50–80 with a 20 pack-year history who smoke or quit within 15 years (USPSTF)."]],
  }),
  mk({
    slug: "blood-donation-eligibility-calculator", title: "Blood Donation Calculator (When Can I Donate Blood Again?)",
    meta: "When Can I Donate Blood Again? Donation Interval Calculator",
    desc: "Find the next date you can donate whole blood, Power Red, platelets or plasma from your last donation date, using the American Red Cross and FDA minimum intervals.",
    inputs: [dd("type", "Donation Type", E.BD_TYPES, 0), date("last", "Last Donation Date", "today-30"), date("asof", "As of", "today")],
    results: [["next", "Next Eligible Date", "t"], ["wait", "Wait", "t"], ["interval", "Interval", "t"], ["max", "Maximum per Year", "t"], ["note", "Note", "t"]],
    fn: C["blood-donation-eligibility-calculator"], ex: { type: 0, last: NOW - 30, asof: NOW },
    exText: (o) => `Example: after giving whole blood on 16 October 2026 you can donate again on ${o.next} (${o.wait} on 15 November).`,
    how: "Whole blood: every 56 days (8 weeks). Power Red: every 112 days. Platelets: every 7 days, up to 24 times a year. Plasma: every 28 days with the Red Cross, or twice in 7 days at paid plasma centres.\n\nYou must also feel well and meet the age, weight and haemoglobin rules on the day.",
    assume: "American Red Cross and FDA minimum intervals. Blood services in other countries use their own rules.",
    faq: [["How often can I donate blood?", "Every 56 days for whole blood in the US."], ["How often can I donate plasma?", "Every 28 days with the Red Cross; paid plasma centres allow twice a week."], ["How long after platelets can I give whole blood?", "Usually 7 days."]],
  }),
];

async function main() {
  if (new Set(TOOLS.map((t) => t.slug)).size !== TOOLS.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${TOOLS.length} tool definitions`); for (const t of TOOLS) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("sleep-medical-calculators", TOOLS);
}
main().catch((e) => { console.error(e); process.exit(1); });
