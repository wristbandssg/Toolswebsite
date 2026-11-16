// One-time (but safe to re-run) batch setup script: 11 Health tools from the big generic keyword
// check (16 Nov 2026 — Claude outputs/Big_Generic_Keyword_Check.md). Sleep & Medical: LDL
// cholesterol, mean arterial pressure, blood pressure, ANC, cardiac output, HOMA-IR, QTc, contact
// lens vertex. Pregnancy & Fertility: baby growth percentile, corrected age, breast milk intake.
// Formulas: src/lib/calc-engine-big-med2.ts (WHO LMS data: src/lib/who-growth-lms.ts). All Published.
//
// HOW TO RUN
//   npm run db:create-big-med2-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-big-med2";
import { mk, num, dd, date, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.bigMed2CustomCalculators;
const NOW = 20772; // 15 Nov 2026
const MED = "This calculator is for information only and isn't a diagnosis or medical advice — talk to your doctor about your results.";

const MEDICAL: ToolDef[] = [
  mk({
    slug: "ldl-cholesterol-calculator", title: "LDL Cholesterol Calculator (Friedewald, Sampson & Cholesterol Ratios)",
    meta: "LDL Cholesterol Calculator — LDL, Non-HDL & TC/HDL Ratio",
    desc: "Calculate LDL cholesterol from total cholesterol, HDL and triglycerides with the Friedewald and NIH (Sampson) equations, plus non-HDL cholesterol and the total/HDL, triglyceride/HDL and LDL/HDL ratios, in mg/dL or mmol/L.",
    inputs: [dd("unit", "Units", E.CH_UNITS, 0), num("tc", "Total Cholesterol", 200, 0, 2000, 0.1), num("hdl", "HDL Cholesterol", 50, 0, 500, 0.1), num("tg", "Triglycerides", 150, 0, 5000, 0.1)],
    results: [["ldl", "LDL Cholesterol", "t"], ["category", "LDL Category", "t"], ["friedewald", "Friedewald LDL", "t"], ["sampson", "Sampson (NIH) LDL", "t"], ["nonhdl", "Non-HDL Cholesterol", "t"], ["tchdl", "Total / HDL Ratio", "t"], ["tghdl", "Triglyceride / HDL Ratio", "t"], ["ldlhdl", "LDL / HDL Ratio", "t"]],
    fn: C["ldl-cholesterol-calculator"], ex: { unit: 0, tc: 200, hdl: 50, tg: 150 },
    exText: (o) => `Example: total cholesterol 200, HDL 50 and triglycerides 150 mg/dL give an LDL of ${o.ldl} — ${o.category}. The total/HDL ratio is ${o.tchdl}.`,
    how: "Friedewald: LDL = total cholesterol − HDL − triglycerides ÷ 5 (in mg/dL; ÷ 2.2 in mmol/L). It isn't valid when triglycerides are above 400 mg/dL, so the NIH Sampson equation (2020) is used instead.\n\nNon-HDL cholesterol = total − HDL. The total/HDL ratio is best below 3.5 and should be under 5.",
    assume: `NCEP ATP III LDL categories. 1 mmol/L cholesterol = 38.67 mg/dL; triglycerides 88.57 mg/dL. ${MED}`,
    faq: [["How is LDL calculated?", "LDL = TC − HDL − TG/5. 200 − 50 − 30 = 120 mg/dL."], ["What is a good cholesterol ratio?", "Total/HDL below 3.5 is ideal, below 5 is acceptable."], ["What is a normal LDL?", "Below 100 mg/dL (2.6 mmol/L) is optimal."], ["Why is triglyceride/HDL ratio useful?", "A ratio above about 3–4 (mg/dL) is linked to insulin resistance and small dense LDL."]],
  }),
  mk({
    slug: "mean-arterial-pressure-calculator", title: "Mean Arterial Pressure Calculator (MAP Blood Pressure)",
    meta: "MAP Calculator — Mean Arterial Pressure from Blood Pressure",
    desc: "Calculate mean arterial pressure (MAP) from systolic and diastolic blood pressure, with the pulse pressure and whether MAP is in the normal 70–100 mmHg range.",
    inputs: [num("sbp", "Systolic (top number, mmHg)", 120, 0, 300, 1), num("dbp", "Diastolic (bottom number, mmHg)", 80, 0, 200, 1)],
    results: [["map", "Mean Arterial Pressure", "t"], ["band", "Range", "t"], ["pp", "Pulse Pressure", "t"], ["alt", "Alternative Formula", "t"], ["working", "Working", "t"]],
    fn: C["mean-arterial-pressure-calculator"], ex: { sbp: 120, dbp: 80 },
    exText: (o) => `Example: a blood pressure of 120/80 has a mean arterial pressure of ${o.map} — ${o.band}.`,
    how: "MAP = diastolic + (systolic − diastolic) ÷ 3, because the heart spends about two-thirds of each beat relaxing. Pulse pressure = systolic − diastolic.\n\nA MAP of at least 60–65 mmHg is needed to keep blood flowing to the organs; 70–100 is typical.",
    assume: `The 1/3 formula assumes a normal heart rate. ${MED}`,
    faq: [["What is a normal MAP?", "70–100 mmHg."], ["What MAP is too low?", "Below about 65 mmHg may not perfuse the organs."], ["What is MAP for 120/80?", "80 + 40/3 = 93 mmHg."]],
  }),
  mk({
    slug: "blood-pressure-calculator", title: "Blood Pressure Calculator (Category & Average of Readings)",
    meta: "Blood Pressure Calculator — Is My Blood Pressure Normal?",
    desc: "Check a blood pressure reading or the average of up to three readings against the AHA categories (normal, elevated, stage 1, stage 2, crisis), with mean arterial pressure and pulse pressure.",
    inputs: [num("s1", "Reading 1 — Systolic", 128, 0, 300, 1), num("d1", "Reading 1 — Diastolic", 82, 0, 200, 1), num("s2", "Reading 2 — Systolic (optional)", 124, 0, 300, 1), num("d2", "Reading 2 — Diastolic (optional)", 80, 0, 200, 1), num("s3", "Reading 3 — Systolic (optional)", 0, 0, 300, 1), num("d3", "Reading 3 — Diastolic (optional)", 0, 0, 200, 1), num("age", "Age", 45, 1, 120, 1)],
    results: [["avg", "Average Blood Pressure", "t"], ["category", "Category", "t"], ["readings", "Readings", "t"], ["map", "Mean Arterial Pressure", "t"], ["pp", "Pulse Pressure", "t"], ["age", "Age Note", "t"]],
    fn: C["blood-pressure-calculator"], ex: { s1: 128, d1: 82, s2: 124, d2: 80, s3: 0, d3: 0, age: 45 },
    exText: (o) => `Example: readings of 128/82 and 124/80 average ${o.avg} — ${o.category}.`,
    how: "Normal: below 120 and below 80. Elevated: 120–129 and below 80. Stage 1: 130–139 or 80–89. Stage 2: 140 or higher, or 90 or higher. Above 180/120 is a hypertensive crisis.\n\nIf the two numbers fall in different categories, the higher category applies. Doctors diagnose high blood pressure from the average of several readings on different days.",
    assume: `AHA/ACC 2017 adult categories. Children under 13 are classified by percentiles. ${MED}`,
    faq: [["Is 130/80 high blood pressure?", "Yes — stage 1 hypertension in the AHA categories."], ["What is normal blood pressure by age?", "Below 120/80 is normal for all adults; blood pressure tends to rise with age."], ["How many readings should I average?", "Take 2–3 readings a minute apart, morning and evening, for several days."]],
  }),
  mk({
    slug: "absolute-neutrophil-count-calculator", title: "Absolute Neutrophil Count Calculator (ANC & Eosinophil Count)",
    meta: "ANC Calculator — Absolute Neutrophil Count & Neutropenia",
    desc: "Calculate the absolute neutrophil count (ANC) from the white blood cell count and the percent of segmented neutrophils and bands, with the neutropenia grade, plus the absolute eosinophil count.",
    inputs: [num("wbc", "White Blood Cells (×10³/µL)", 6, 0, 500, 0.01), num("segs", "Segmented Neutrophils (%)", 55, 0, 100, 0.1), num("bands", "Bands (%) — 0 if not reported", 3, 0, 100, 0.1), num("eos", "Eosinophils (%)", 2, 0, 100, 0.1)],
    results: [["anc", "Absolute Neutrophil Count", "t"], ["grade", "Grade", "t"], ["aec", "Absolute Eosinophil Count", "t"], ["working", "Working", "t"]],
    fn: C["absolute-neutrophil-count-calculator"], ex: { wbc: 6, segs: 55, bands: 3, eos: 2 },
    exText: (o) => `Example: WBC 6.0 with 55% segs and 3% bands gives an ANC of ${o.anc} — ${o.grade}.`,
    how: "ANC = WBC × 1,000 × (% segmented neutrophils + % bands) ÷ 100. If your report gives an absolute neutrophil number already, that is the ANC.\n\nNeutropenia grades: mild 1,000–1,499, moderate 500–999, severe below 500 cells/µL. Absolute eosinophils = WBC × 1,000 × % eosinophils ÷ 100.",
    assume: `Normal ranges differ slightly between labs and are lower in some healthy people of African descent (benign ethnic neutropenia). ${MED}`,
    faq: [["How do you calculate ANC?", "WBC (in thousands) × 1,000 × (segs% + bands%) / 100. 4.5 × 1000 × 60% = 2,700."], ["What ANC is dangerous?", "Below 500 cells/µL carries a high infection risk."], ["Do I include bands?", "Yes — bands are immature neutrophils and are counted."]],
  }),
  mk({
    slug: "cardiac-output-calculator", title: "Cardiac Output Calculator (CO & Cardiac Index, Fick)",
    meta: "Cardiac Output Calculator — CO, Cardiac Index & Fick",
    desc: "Calculate cardiac output from heart rate × stroke volume or by the Fick principle (oxygen uptake, haemoglobin and arterial/venous saturations), plus cardiac index and body surface area.",
    inputs: [dd("mode", "Method", E.CO_MODES, 0), num("hr", "Heart Rate (bpm)", 70, 0, 300, 1), num("sv", "Stroke Volume (mL)", 70, 0, 300, 1), num("vo2", "VO₂ (mL/min, 0 = estimate)", 0, 0, 5000, 1), num("hb", "Haemoglobin (g/dL)", 14, 0, 25, 0.1), num("sao2", "Arterial O₂ Saturation (%)", 98, 0, 100, 0.1), num("svo2", "Mixed Venous O₂ Saturation (%)", 70, 0, 100, 0.1), num("height", "Height (cm)", 175, 50, 250, 0.1), num("weight", "Weight (kg)", 75, 2, 400, 0.1)],
    results: [["co", "Cardiac Output", "t"], ["ci", "Cardiac Index", "t"], ["band", "Range", "t"], ["bsa", "Body Surface Area", "t"], ["working", "Working", "t"]],
    fn: C["cardiac-output-calculator"], ex: { mode: 0, hr: 70, sv: 70, vo2: 0, hb: 14, sao2: 98, svo2: 70, height: 175, weight: 75 },
    exText: (o) => `Example: a heart rate of 70 and a stroke volume of 70 mL give a cardiac output of ${o.co} and a cardiac index of ${o.ci}.`,
    how: "Cardiac output = heart rate × stroke volume. Cardiac index = cardiac output ÷ body surface area (Mosteller: √(height cm × weight kg ÷ 3600)).\n\nFick: CO = VO₂ ÷ [(SaO₂ − SvO₂) × Hb × 1.34 × 10]. If you don't know VO₂, 125 mL/min per m² of body surface area is a common estimate.",
    assume: `Normal resting CO 4–8 L/min and CI 2.5–4 L/min/m². ${MED}`,
    faq: [["What is the cardiac output formula?", "CO = HR × SV. 75 bpm × 80 mL = 6 L/min."], ["What is a normal cardiac index?", "2.5–4.0 L/min/m²."], ["What is the Fick principle?", "Oxygen uptake equals blood flow times the arterial–venous oxygen difference."]],
  }),
  mk({
    slug: "homa-ir-calculator", title: "HOMA-IR Calculator (Insulin Resistance)",
    meta: "HOMA-IR Calculator — Insulin Resistance from Fasting Insulin",
    desc: "Calculate HOMA-IR insulin resistance from fasting glucose and fasting insulin, plus HOMA-%B beta-cell function and the QUICKI index, with glucose in mg/dL or mmol/L.",
    inputs: [dd("unit", "Glucose Units", E.HOMA_UNITS, 0), num("glucose", "Fasting Glucose", 95, 0, 1000, 0.1), num("insulin", "Fasting Insulin (µU/mL)", 10, 0, 500, 0.1)],
    results: [["ir", "HOMA-IR", "t"], ["band", "Interpretation", "t"], ["beta", "HOMA-%B", "t"], ["quicki", "QUICKI", "t"], ["working", "Working", "t"]],
    fn: C["homa-ir-calculator"], ex: { unit: 0, glucose: 95, insulin: 10 },
    exText: (o) => `Example: fasting glucose 95 mg/dL and insulin 10 µU/mL give a HOMA-IR of ${o.ir} — ${o.band}.`,
    how: "HOMA-IR = fasting glucose (mg/dL) × fasting insulin (µU/mL) ÷ 405, or glucose (mmol/L) × insulin ÷ 22.5.\n\nHOMA-%B = 20 × insulin ÷ (glucose mmol/L − 3.5). QUICKI = 1 ÷ (log insulin + log glucose mg/dL).",
    assume: `Cut-offs vary by population and lab; values above about 2–2.9 are commonly read as insulin resistance. ${MED}`,
    faq: [["What is a normal HOMA-IR?", "Roughly 0.5–1.9; above about 2.9 suggests significant insulin resistance."], ["Do I need to fast?", "Yes — both values must be fasting (8+ hours)."], ["What is 1 µU/mL in pmol/L?", "About 6 pmol/L."]],
  }),
  mk({
    slug: "qtc-calculator", title: "QTc Calculator (Bazett, Fridericia, Framingham & Hodges)",
    meta: "QTc Calculator — Corrected QT Interval (Bazett, QTcF)",
    desc: "Correct the QT interval for heart rate with the Bazett, Fridericia (QTcF), Framingham and Hodges formulas, from heart rate or the RR interval, and check whether the QTc is normal, short or prolonged.",
    inputs: [num("qt", "QT Interval (ms)", 400, 0, 1000, 1), dd("rateMode", "I Know the", E.QT_RATE, 0), num("rate", "Heart Rate (bpm) or RR (ms)", 75, 0, 3000, 1), dd("sex", "Sex", E.QT_SEX, 0)],
    results: [["fridericia", "QTc — Fridericia", "t"], ["bazett", "QTc — Bazett", "t"], ["framingham", "QTc — Framingham", "t"], ["hodges", "QTc — Hodges", "t"], ["band", "Interpretation", "t"], ["rr", "Rate", "t"]],
    fn: C["qtc-calculator"], ex: { qt: 400, rateMode: 0, rate: 75, sex: 0 },
    exText: (o) => `Example: a QT of 400 ms at 75 bpm corrects to ${o.fridericia} (Fridericia) or ${o.bazett} (Bazett) — ${o.band}.`,
    how: "RR = 60 ÷ heart rate (seconds). Bazett: QTc = QT ÷ √RR. Fridericia: QT ÷ ∛RR. Framingham: QT + 154 × (1 − RR). Hodges: QT + 1.75 × (HR − 60).\n\nBazett over-corrects at fast heart rates, so Fridericia is often preferred. QTc above 450 ms (men) or 460 ms (women) is prolonged; above 500 ms is high risk.",
    assume: `For heart rates in sinus rhythm. ${MED}`,
    faq: [["What is a normal QTc?", "Up to 450 ms in men and 460 ms in women."], ["Which QTc formula is best?", "Fridericia or Framingham are more accurate than Bazett at high heart rates."], ["What QTc is dangerous?", "Above 500 ms greatly raises the risk of torsades de pointes."]],
  }),
  mk({
    slug: "contact-lens-vertex-calculator", title: "Contact Lens Vertex Calculator (Glasses to Contacts Rx)",
    meta: "Vertex Distance Calculator — Glasses to Contact Lens Power",
    desc: "Convert a glasses prescription to contact lens power at the eye with the vertex distance formula, for sphere and toric (cylinder) prescriptions, rounded to the nearest 0.25 D.",
    inputs: [num("sphere", "Sphere (SPH, D)", -5, -30, 30, 0.25), num("cyl", "Cylinder (CYL, D; 0 if none)", 0, -10, 10, 0.25), num("axis", "Axis (°)", 180, 0, 180, 1), num("vertex", "Vertex Distance (mm)", 12, 0, 25, 0.5)],
    results: [["rx", "Contact Lens Power", "t"], ["exact", "Exact", "t"], ["needed", "Does Vertex Matter?", "t"], ["meridians", "Meridians", "t"], ["note", "Note", "t"]],
    fn: C["contact-lens-vertex-calculator"], ex: { sphere: -5, cyl: 0, axis: 180, vertex: 12 },
    exText: (o) => `Example: a −5.00 D glasses prescription at 12 mm is about ${o.rx} in a contact lens.`,
    how: "Contact power Fc = F ÷ (1 − d × F), where F is the glasses power in dioptres and d the vertex distance in metres (12 mm = 0.012). Myopes need less minus in contacts; hyperopes need more plus.\n\nFor astigmatism, each meridian (sphere, and sphere + cylinder) is converted separately and the cylinder is their difference.",
    assume: "A contact lens prescription also needs base curve, diameter and a fitting by an eye-care professional.",
    faq: [["When does vertex distance matter?", "At ±4.00 D or more."], ["What is −6.00 in contacts?", "About −5.50 D at 12 mm."], ["What vertex distance should I use?", "12 mm is standard if it isn't on your prescription."]],
  }),
];

const BABY: ToolDef[] = [
  mk({
    slug: "baby-growth-percentile-calculator", title: "Baby Growth Percentile Calculator (WHO Weight, Length & Head)",
    meta: "Baby Growth Chart Percentile Calculator (WHO, 0–5 Years)",
    desc: "Find your baby's or toddler's percentile for weight, length/height and head circumference on the WHO growth charts from birth to 5 years, with z-scores and the median for their age and sex.",
    inputs: [dd("sex", "Sex", E.GR_SEX, 0), num("months", "Age (months, e.g. 6.5)", 6, 0, 60, 0.1), dd("units", "Units", E.GR_UNITS, 0), num("weight", "Weight (0 = skip)", 7.9, 0, 100, 0.01), num("length", "Length / Height (0 = skip)", 67.6, 0, 200, 0.1), num("head", "Head Circumference (0 = skip)", 43.3, 0, 80, 0.1)],
    results: [["weight", "Weight-for-Age", "t"], ["length", "Length/Height-for-Age", "t"], ["head", "Head Circumference-for-Age", "t"], ["flag", "Summary", "t"], ["age", "Age", "t"]],
    fn: C["baby-growth-percentile-calculator"], ex: { sex: 0, months: 6, units: 0, weight: 7.9, length: 67.6, head: 43.3 },
    exText: (o) => `Example: a 6-month-old boy weighing 7.9 kg is on the ${String(o.weight).replace(/ \(.*/, "")} for weight.`,
    how: "Each measurement is compared with the WHO Child Growth Standards using the LMS method: z = ((X ÷ M)^L − 1) ÷ (L × S), and the percentile is the share of healthy children below that z-score. The 50th percentile is the median.\n\nWHO charts are recommended from birth to 2 years (CDC) and are used to 5 years in many countries. Use corrected age for babies born early.",
    assume: `WHO 2006 standards, interpolated between whole months. Length to 24 months, standing height after. ${MED}`,
    faq: [["What percentile is normal?", "Anywhere from the 3rd to the 97th percentile can be normal; steady growth along a curve matters most."], ["What does the 50th percentile mean?", "Half of children that age and sex are smaller and half are bigger."], ["WHO or CDC charts?", "CDC recommends WHO charts from 0–2 years and CDC charts from 2–20 years."]],
  }),
  mk({
    slug: "corrected-age-calculator", title: "Corrected Age Calculator (Adjusted Age for Premature Babies)",
    meta: "Corrected Age Calculator — Preemie Adjusted Age",
    desc: "Work out a premature baby's corrected (adjusted) age from the birth date and gestational age at birth, plus chronological age, how early they were born, the original due date and postmenstrual age.",
    inputs: [date("birth", "Date of Birth", "today-120"), num("gaWeeks", "Gestational Age at Birth — Weeks", 32, 22, 42, 1), num("gaDays", "… and Days", 0, 0, 6, 1), date("asof", "As of", "today")],
    results: [["corrected", "Corrected Age", "t"], ["chrono", "Chronological Age", "t"], ["early", "Born Early By", "t"], ["due", "Original Due Date", "t"], ["pma", "Postmenstrual Age", "t"], ["note", "Note", "t"]],
    fn: C["corrected-age-calculator"], ex: { birth: NOW - 120, gaWeeks: 32, gaDays: 0, asof: NOW },
    exText: (o) => `Example: a baby born at 32 weeks, 120 days ago, is ${o.chrono} old but has a corrected age of ${o.corrected}.`,
    how: "Corrected age = chronological age − the weeks born before 40 weeks. A baby born at 32 weeks is 8 weeks early, so at 4 months old their corrected age is about 2 months.\n\nUse corrected age for growth charts, feeding and milestones until about age 2. Postmenstrual age = gestational age at birth + chronological age.",
    assume: `A full-term pregnancy is taken as 40 weeks 0 days. ${MED}`,
    faq: [["How do I calculate corrected age?", "Subtract the weeks born early from the baby's age. Born at 30 weeks (10 weeks early), 6 months old → about 3.5 months corrected."], ["Until what age do you correct?", "Usually until 2 years."], ["Should a baby born at 38 weeks use corrected age?", "No — babies born at 37 weeks or later are full term."]],
  }),
  mk({
    slug: "breast-milk-intake-calculator", title: "Breast Milk Calculator (How Much Expressed Milk to Feed Baby)",
    meta: "How Much Breast Milk or Formula Should My Baby Drink?",
    desc: "Estimate how much expressed breast milk or formula a baby needs per day and per feed from their weight and the number of feeds, using the 2.5 oz per pound rule (capped at 32 oz).",
    inputs: [num("weight", "Baby's Weight", 10, 0, 50, 0.1), dd("unit", "Weight Unit", E.BM_UNITS, 0), num("feeds", "Feeds per Day", 8, 1, 16, 1), dd("type", "Milk", E.BM_TYPES, 0)],
    results: [["perFeed", "Per Feed", "t"], ["daily", "Per Day", "t"], ["rule", "Rule", "t"], ["type", "Note", "t"], ["weight", "Weight", "t"]],
    fn: C["breast-milk-intake-calculator"], ex: { weight: 10, unit: 0, feeds: 8, type: 0 },
    exText: (o) => `Example: a 10 lb baby fed 8 times a day needs about ${o.daily}, or ${o.perFeed}.`,
    how: "Babies need about 2.5 oz of milk per pound of body weight a day (about 150 mL/kg), up to about 32 oz. Divide by the number of feeds to get the bottle size.\n\nIn the first days the stomach is tiny (about 1–2 oz per feed by day 3–4). Always follow your baby's hunger and fullness cues.",
    assume: `For healthy full-term babies; premature babies need a plan from their care team. ${MED}`,
    faq: [["How much milk does a 1-month-old need?", "About 3–4 oz per feed, 8 times a day."], ["How many ounces should a 12 lb baby eat?", "About 30 oz a day."], ["Do breastfed babies drink more as they grow?", "Intake usually levels off at 25–35 oz a day between 1 and 6 months."]],
  }),
];

async function main() {
  const all = [...MEDICAL, ...BABY];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); for (const t of all) console.log(`  ${t.slug}: ${t.examples}`); return; }
  await upsertTools("sleep-medical-calculators", MEDICAL);
  await upsertTools("pregnancy-fertility-calculators", BABY);
}
main().catch((e) => { console.error(e); process.exit(1); });
