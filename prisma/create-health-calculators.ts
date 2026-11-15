// One-time (but safe to re-run) batch setup script: 12 Health tools (15 Nov 2026) from the general
// keyword check's review list. Run prisma/setup-health-category.ts --apply first (it creates
// Health Calculators > Pregnancy & Fertility / Sleep & Medical).
// Formulas and sources: src/lib/calc-engine-health.ts. All tools are Published.
//
// HOW TO RUN
//   npm run db:create-health-calculators   (TRV_DRY=1 → check only, no database)

import * as E from "../src/lib/calc-engine-health";
import { mk, num, dd, tx, date, T, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.healthCustomCalculators;
// Fixed example dates (days since 1970-01-01): 20772 = 15 Nov 2026.
const NOW = 20772;
const MED = "This calculator gives an estimate for information only. It isn't medical advice — talk to your doctor, midwife or nurse about your own situation.";

const PREG: ToolDef[] = [
  mk({
    slug: "due-date-calculator", title: "Due Date Calculator (Pregnancy Due Date by LMP, Conception or IVF)",
    meta: "Due Date Calculator — When Is My Baby Due?",
    desc: "Find your baby's due date from the first day of your last period, your conception date, an IVF transfer date or an ultrasound, with how far along you are, your trimester and key pregnancy milestones.",
    inputs: [dd("method", "Calculate From", E.DUE_METHODS, 0), date("date", "Date (LMP, conception, transfer or scan)", "today-60"), num("cycle", "Average Cycle Length (days, LMP only)", 28, 20, 45, 1), num("usw", "Age at Scan — Weeks (ultrasound only)", 8, 4, 42, 1), num("usd", "Age at Scan — Days (ultrasound only)", 0, 0, 6, 1), date("asof", "As of", "today")],
    results: [["due", "Due Date", "t"], ["ga", "How Far Along", "t"], ["tri", "Trimester", "t"], ["left", "Time to Go", "t"], ["conception", "Estimated Conception", "t"], ["range", "Likely Delivery Window", "t"], ["milestones", "Milestones", "t"], ["weekday", "Due Date Weekday", "t"]],
    fn: C["due-date-calculator"], ex: { method: 0, date: NOW - 60, cycle: 28, usw: 8, usd: 0, asof: NOW },
    exText: (o) => `Example: if your last period started on 16 September 2026, your due date is ${o.due}. On 15 November 2026 you are ${o.ga} pregnant.`,
    how: "Pregnancy is counted from the first day of your last menstrual period (LMP), about two weeks before conception. The due date is LMP + 280 days (40 weeks), adjusted if your cycle is longer or shorter than 28 days.\n\nFrom a known conception date, add 266 days. For IVF, add 263 days to a 3-day embryo transfer or 261 days to a 5-day blastocyst transfer. An early ultrasound is the most accurate way to date a pregnancy.",
    assume: `Naegele's rule with a cycle-length adjustment; IVF and ultrasound dating per ACOG. Only about 4% of babies are born on their due date. ${MED}`,
    faq: [["How is a due date calculated?", "Add 280 days (40 weeks) to the first day of your last period, or 266 days to the conception date."], ["Can my due date change?", "Yes — your provider may change it after an early ultrasound if it differs by more than about a week."]],
  }),
  mk({
    slug: "pregnancy-week-calculator", title: "Pregnancy Week Calculator (How Far Along Am I?)",
    meta: "How Far Along Am I? Pregnancy Week by Week Calculator",
    desc: "Find out how many weeks and days pregnant you are from your due date or last period, which month and trimester you're in, your baby's size this week and how long until your due date.",
    inputs: [dd("from", "I Know", E.WEEK_FROM, 0), date("date", "Due Date or First Day of Last Period", "today+150"), num("cycle", "Average Cycle Length (days, LMP only)", 28, 20, 45, 1), date("asof", "As of", "today")],
    results: [["weeks", "How Far Along", "t"], ["month", "Pregnancy Month", "t"], ["tri", "Trimester", "t"], ["size", "Baby's Size", "t"], ["due", "Due Date", "t"], ["left", "Time to Go", "t"], ["next", "Next Week Starts", "t"], ["pct", "Progress", "t"]],
    fn: C["pregnancy-week-calculator"], ex: { from: 0, date: NOW + 150, cycle: 28, asof: NOW },
    exText: (o) => `Example: with a due date of 14 April 2027, on 15 November 2026 you are ${o.weeks} pregnant — ${String(o.month).toLowerCase()}, ${String(o.tri).toLowerCase()}. ${o.size}.`,
    how: "Weeks of pregnancy (gestational age) count from the first day of your last period. With a due date, the pregnancy started 280 days earlier.\n\nThe first trimester runs to the end of week 13, the second to the end of week 27 and the third from week 28 to birth. Pregnancy months are approximate (40 weeks ≈ 9 months plus a week).",
    assume: `Baby sizes are typical fruit-and-vegetable comparisons, not measurements. ${MED}`,
    faq: [["How many weeks is 6 months pregnant?", "About 23 to 27 weeks."], ["What week does the second trimester start?", "Week 14."]],
  }),
  mk({
    slug: "conception-date-calculator", title: "Conception Date Calculator (When Did I Get Pregnant?)",
    meta: "Conception Calculator — When Did I Conceive?",
    desc: "Work out when you most likely conceived from your due date, last period or your baby's birth date, the window when sex most likely led to pregnancy, and whether a specific date falls inside it.",
    inputs: [dd("from", "I Know", E.CONC_FROM, 0), date("date", "Due Date, Last Period or Birth Date", "today+150"), num("cycle", "Average Cycle Length (days, LMP only)", 28, 20, 45, 1), dd("docheck", "Check a Specific Date?", E.YES_NO, 0), date("check", "Date of Sex to Check", "today-120")],
    results: [["conception", "Most Likely Conception Date", "t"], ["window", "Likely Window", "t"], ["check", "Your Date", "t"], ["lmp", "Last Period (estimated)", "t"], ["due", "Due Date", "t"], ["accuracy", "Accuracy", "t"], ["weekday", "Weekday", "t"]],
    fn: C["conception-date-calculator"], ex: { from: 0, date: NOW + 150, cycle: 28, docheck: 0, check: NOW - 120 },
    exText: (o) => `Example: a due date of 14 April 2027 means conception most likely happened on ${o.conception}. ${o.window}.`,
    how: "Conception usually happens on or just after ovulation, about 266 days (38 weeks) before the due date, or about 14 days after the first day of the last period in a 28-day cycle.\n\nSperm can survive up to 5 days, so the sex that led to pregnancy could have been up to 5 days before ovulation. That is why the result is a window, not a single day.",
    assume: `Ovulation is assumed 14 days before the next period. It can't prove paternity: when two dates are close together, only a DNA test can tell. ${MED}`,
    faq: [["How accurate is a conception date?", "Usually within a few days; an early ultrasound narrows it further."], ["Can you get pregnant from sex 5 days before ovulation?", "Yes — sperm can live up to 5 days, though the chance is lower than on the day before ovulation."]],
  }),
  mk({
    slug: "ovulation-calculator", title: "Ovulation Calculator (Fertile Window & Best Days to Conceive)",
    meta: "Ovulation Calculator — Fertile Days & Ovulation Date",
    desc: "Estimate your ovulation day, your 6-day fertile window, your most fertile days, your next period and when to take a pregnancy test, with a calendar for the next few cycles.",
    inputs: [date("lmp", "First Day of Your Last Period", "today-10"), num("cycle", "Average Cycle Length (days)", 28, 20, 45, 1), num("luteal", "Luteal Phase (days, usually 14)", 14, 9, 18, 1), num("cycles", "Cycles to Show", 3, 1, 6, 1)],
    results: [["ovulation", "Estimated Ovulation", "t"], ["fertile", "Fertile Window", "t"], ["peak", "Most Fertile Days", "t"], ["period", "Next Period", "t"], ["test", "Pregnancy Test From", "t"], ["calendar", "Upcoming Cycles", "t"]],
    fn: C["ovulation-calculator"], ex: { lmp: NOW - 10, cycle: 28, luteal: 14, cycles: 3 },
    exText: (o) => `Example: with a 28-day cycle and a last period that started on 5 November 2026, ovulation is around ${o.ovulation}, and the fertile window is ${o.fertile}.`,
    how: "Ovulation usually happens about 14 days before your next period (the luteal phase), not always on day 14. In a 32-day cycle it is around day 18.\n\nYou can get pregnant from sex in the 5 days before ovulation and on the day itself. The two days before ovulation are the most fertile. Ovulation tests (LH strips), cervical mucus and basal body temperature can confirm the timing.",
    assume: `Calendar estimates assume regular cycles. Methods claiming to choose a baby's sex by timing (like Shettles) aren't supported by good evidence. ${MED}`,
    faq: [["How many days after my period do I ovulate?", "In a 28-day cycle, about 14 days after your period starts — earlier with shorter cycles, later with longer ones."], ["Can I get pregnant right after my period?", "It's possible with short cycles, because sperm can survive up to 5 days."]],
  }),
  mk({
    slug: "period-calculator", title: "Period Calculator (Next Period Date & Cycle Tracker)",
    meta: "Period Calculator — When Is My Next Period?",
    desc: "Predict your next period and the next 6 periods, see which cycle day you're on, your PMS days and fertile window, and check whether your period is late.",
    inputs: [date("last", "First Day of Your Last Period", "today-20"), num("cycle", "Average Cycle Length (days)", 28, 20, 45, 1), num("len", "Period Length (days)", 5, 1, 10, 1), date("asof", "As of", "today")],
    results: [["next", "Next Period", "t"], ["until", "Days Until", "t"], ["day", "Today", "t"], ["late", "Is It Late?", "t"], ["pms", "PMS Days", "t"], ["ovulation", "Ovulation & Fertile Window", "t"], ["list", "Next 6 Periods", "t"]],
    fn: C["period-calculator"], ex: { last: NOW - 20, cycle: 28, len: 5, asof: NOW },
    exText: (o) => `Example: if your last period started on 26 October 2026 and your cycle is 28 days, your next period is due on ${o.next} — ${o.until}.`,
    how: "Count your cycle from the first day of one period to the first day of the next. The average is 28 days, but anything from 21 to 35 days is normal for adults.\n\nYour next period is your last start date plus your cycle length. A period is considered late when it's more than about 5 days past the expected date; if there's any chance of pregnancy, a home test is reliable from the day it's due.",
    assume: `Predictions assume a regular cycle. For irregular periods, use an average of your last few cycles, and expect the predicted dates to be less exact. ${MED}`,
    faq: [["How do I calculate my next period?", "Add your average cycle length to the first day of your last period."], ["Why is my period late?", "Pregnancy, stress, illness, travel, weight change, breastfeeding, PCOS and some medicines can all delay a period."]],
  }),
  mk({
    slug: "implantation-calculator", title: "Implantation Calculator (DPO & When to Test)",
    meta: "Implantation Calculator — DPO & Earliest Pregnancy Test",
    desc: "Find how many days past ovulation (DPO) you are, when implantation most likely happens, and the earliest and most reliable days to take a pregnancy test.",
    inputs: [dd("from", "Calculate From", E.DPO_FROM, 0), date("ov", "Ovulation Date", "today-7"), date("lmp", "First Day of Last Period", "today-21"), num("cycle", "Average Cycle Length (days)", 28, 20, 45, 1), date("asof", "As of", "today")],
    results: [["dpo", "Days Past Ovulation", "t"], ["implant", "Implantation Window", "t"], ["early", "Earliest Test", "t"], ["reliable", "Reliable Test", "t"], ["stage", "Where You Are", "t"], ["ovulation", "Ovulation Date", "t"]],
    fn: C["implantation-calculator"], ex: { from: 0, ov: NOW - 7, lmp: NOW - 21, cycle: 28, asof: NOW },
    exText: (o) => `Example: if you ovulated on 8 November 2026, on 15 November you are ${o.dpo}. Implantation is most likely ${String(o.implant).split(" (most often ")[1]?.replace(")", "") ?? o.implant}.`,
    how: "After fertilisation the embryo takes several days to reach the uterus. It implants 6 to 12 days after ovulation, most often on days 8–10. Only after implantation does the pregnancy hormone hCG start to rise.\n\nhCG roughly doubles every 2–3 days, so a sensitive home test may turn positive around 10–12 DPO. By 14 DPO (about when your period is due), most tests are reliable.",
    assume: `Implantation timing from Wilcox et al. (NEJM 1999). Implantation bleeding, if it happens, is light spotting around 10–14 DPO. ${MED}`,
    faq: [["What is DPO?", "Days past ovulation — the number of days since you ovulated."], ["Can I test at 8 DPO?", "It's usually too early; most implantations happen at 8–10 DPO, and hCG takes a few days to build up."]],
  }),
  mk({
    slug: "pregnancy-weight-gain-calculator", title: "Pregnancy Weight Gain Calculator (By Week & BMI)",
    meta: "Pregnancy Weight Gain Calculator — Healthy Gain by Week",
    desc: "See how much weight to gain during pregnancy based on your pre-pregnancy BMI (IOM guidelines), the healthy range for your current week, your weekly target and extra calories by trimester, for one baby or twins.",
    inputs: [dd("units", "Units", E.PREG_UNITS, 0), num("height", "Height (in or cm)", 65, 40, 250, 0.1), num("pre", "Weight Before Pregnancy (lb or kg)", 140, 50, 700, 0.1), num("week", "Current Week of Pregnancy", 20, 0, 42, 1), num("now", "Current Weight (optional, 0 = skip)", 150, 0, 700, 0.1), dd("type", "Pregnancy", E.PREG_TYPE, 0)],
    results: [["total", "Recommended Total Gain", "t"], ["now", "Healthy Range at This Week", "t"], ["status", "Your Gain So Far", "t"], ["weekly", "Weekly Gain", "t"], ["kcal", "Extra Calories", "t"], ["bmi", "Pre-Pregnancy BMI", "n", 1], ["category", "BMI Category", "t"]],
    fn: C["pregnancy-weight-gain-calculator"], ex: { units: 0, height: 65, pre: 140, week: 20, now: 150, type: 0 },
    exText: (o) => `Example: at 5 ft 5 in and 140 lb before pregnancy (BMI ${o.bmi}, ${String(o.category).toLowerCase()}), the guideline is ${o.total}. At week 20 the healthy range is ${o.now}, so a 10 lb gain is ${String(o.status).split(" — ")[1]}.`,
    how: "The Institute of Medicine (2009) guidelines depend on your BMI before pregnancy: underweight 28–40 lb, normal weight 25–35 lb, overweight 15–25 lb and obese 11–20 lb for one baby. Twin ranges are higher.\n\nMost gain comes after the first trimester (about 1–4 lb in weeks 1–13). After that, aim for a steady weekly gain. You need no extra calories in the first trimester, about 340 more a day in the second and about 450 more in the third.",
    assume: `IOM 2009 ranges and weekly rates; twin ranges are the IOM's provisional ranges. The week-by-week range is a smooth approximation. ${MED}`,
    faq: [["How much weight should I gain in pregnancy?", "25–35 lb if your BMI was normal before pregnancy; less if overweight, more if underweight."], ["Am I eating for two?", "Not really — only about 340–450 extra calories a day in the second and third trimesters."]],
  }),
  mk({
    slug: "chance-of-pregnancy-calculator", title: "Chance of Pregnancy Calculator (Odds of Getting Pregnant)",
    meta: "Chance of Pregnancy Calculator — Odds by Day & Age",
    desc: "Estimate the chance of getting pregnant from sex on a particular day of your cycle, or over several months of trying, using research on the fertile window and age.",
    inputs: [dd("mode", "Calculate", E.CHANCE_MODES, 0), date("lmp", "First Day of Last Period", "today-14"), num("cycle", "Average Cycle Length (days)", 28, 20, 45, 1), date("sex", "Date You Had Sex", "today-2"), num("age", "Your Age", 30, 15, 55, 1), num("months", "Months of Trying", 6, 1, 36, 1)],
    results: [["chance", "Chance of Pregnancy", "t"], ["detail", "Why", "t"], ["ovday", "Estimated Ovulation", "t"], ["fertile", "Fertile Window", "t"], ["advice", "Next Step", "t"], ["raw", "Chance (decimal)", "n", 4]],
    fn: C["chance-of-pregnancy-calculator"], ex: { mode: 0, lmp: NOW - 14, cycle: 28, sex: NOW - 2, age: 30, months: 6 },
    exText: (o) => `Example: with a 28-day cycle and a last period on 1 November 2026, sex on 13 November (two days before ovulation) has about a ${o.chance} chance of pregnancy for someone under 35.`,
    how: "Pregnancy is only possible from sex in the 6 days ending on ovulation day. In the Wilcox study, the chance per act was about 10% five days before ovulation, rising to about 30% in the last 2–3 days, and nearly zero the day after.\n\nChance per cycle falls with age: roughly 25% under 30, 20% in the early 30s, 15% at 35–37, 10% at 38–40 and 5% or less after 40. Over many months the chances add up.",
    assume: `Day-specific probabilities from Wilcox, Weinberg & Baird (NEJM 1995); age figures are approximate (ASRM). Assumes no birth control and no known fertility problems. It can't tell whether you are pregnant now — only a test can. ${MED}`,
    faq: [["What are the chances of getting pregnant on your period?", "Very low, but possible with short cycles, because sperm can survive up to 5 days."], ["How long does it take to get pregnant?", "About 80–85% of couples under 35 conceive within a year of trying."]],
  }),
];

const SLEEPMED: ToolDef[] = [
  mk({
    slug: "sleep-calculator", title: "Sleep Calculator (Bedtime & Wake-Up Time by Sleep Cycles)",
    meta: "Sleep Calculator — Best Bedtime & Wake-Up Time",
    desc: "Find the best time to go to bed or wake up based on 90-minute sleep cycles, work out how much sleep you got between two times, and see how much sleep you need for your age.",
    inputs: [dd("mode", "Calculate", E.SLEEP_MODES, 0), tx("time", "Time (wake-up time or bedtime)", "6:30 AM"), tx("wake", "Wake Time (for 'how much sleep I got')", "6:30 AM"), num("latency", "Minutes to Fall Asleep", 15, 0, 90, 1), num("age", "Age (years)", 30, 0, 120, 1)],
    results: [["best", "Best Time", "t"], ["options", "Options", "t"], ["cycles", "Sleep Cycles", "t"], ["slept", "Sleep (hours)", "t"], ["need", "Sleep Needed at Your Age", "t"], ["note", "Note", "t"]],
    fn: C["sleep-calculator"], ex: { mode: 0, ...T("time", "6:30 AM"), ...T("wake", "6:30 AM"), latency: 15, age: 30 },
    exText: (o) => `Example: to wake up at 6:30 AM, ${String(o.best).toLowerCase()} — that gives five or six full 90-minute cycles plus 15 minutes to fall asleep.`,
    how: "Sleep runs in cycles of about 90 minutes: light sleep, deep sleep and dream (REM) sleep. Waking at the end of a cycle usually feels easier than waking in the middle of deep sleep.\n\nCount back whole cycles from your wake-up time, then subtract the time it takes you to fall asleep. Most adults need 5 to 6 cycles (7.5–9 hours).",
    assume: `Cycle length varies from about 80 to 110 minutes between people and through the night, so treat the times as a guide. Sleep needs from the AASM and National Sleep Foundation. ${MED}`,
    faq: [["What time should I go to bed to wake up at 6 AM?", "About 8:45 PM or 10:15 PM, allowing 15 minutes to fall asleep."], ["How much sleep do adults need?", "7 to 9 hours a night for ages 18–64."]],
  }),
  mk({
    slug: "body-surface-area-calculator", title: "Body Surface Area Calculator (BSA — Mosteller & DuBois)",
    meta: "BSA Calculator — Body Surface Area (Mosteller, DuBois)",
    desc: "Calculate body surface area (BSA) in m² from height and weight with the Mosteller, DuBois, Haycock, Gehan & George and Boyd formulas, as used for medication doses and cardiac index.",
    inputs: [dd("units", "Units", E.BSA_UNITS, 0), num("height", "Height (cm or in)", 175, 20, 260, 0.1), num("weight", "Weight (kg or lb)", 75, 0.5, 900, 0.1)],
    results: [["bsa", "BSA (Mosteller)", "t"], ["dubois", "DuBois & DuBois", "t"], ["haycock", "Haycock", "t"], ["gehan", "Gehan & George", "t"], ["boyd", "Boyd", "t"], ["avg", "Average", "t"], ["raw", "BSA (number)", "n", 3]],
    fn: C["body-surface-area-calculator"], ex: { units: 0, height: 175, weight: 75 },
    exText: (o) => `Example: at 175 cm and 75 kg, body surface area is ${o.bsa} by Mosteller and ${o.dubois} by DuBois.`,
    how: "Mosteller: BSA = √(height cm × weight kg ÷ 3600), the simplest and most widely used formula. DuBois: 0.007184 × weight^0.425 × height^0.725.\n\nHaycock and Gehan & George were developed with children included. Boyd adjusts the weight exponent for body size.",
    assume: `Formulas give similar results for average adults and differ more at extremes of size. ${MED}`,
    faq: [["What is a normal BSA?", "About 1.9 m² for adult men and 1.6 m² for adult women."], ["Why is BSA used for drug doses?", "Many drugs, especially chemotherapy, scale better with body surface area than with weight alone."]],
  }),
  mk({
    slug: "egfr-calculator", title: "eGFR Calculator (CKD-EPI 2021 Kidney Function)",
    meta: "eGFR Calculator — CKD-EPI 2021 Kidney Function & Stage",
    desc: "Estimate kidney function (eGFR) from serum creatinine, age and sex with the race-free CKD-EPI 2021 equation, with the KDIGO CKD stage and the typical eGFR for your age.",
    inputs: [dd("sex", "Sex", E.EGFR_SEX, 0), num("age", "Age (years)", 50, 18, 110, 1), num("scr", "Serum Creatinine", 0.9, 0.05, 2000, 0.01), dd("unit", "Creatinine Unit", E.SCR_UNITS, 0)],
    results: [["egfr", "eGFR", "t"], ["stage", "CKD Stage", "t"], ["typical", "Typical for Your Age", "t"], ["scr", "Creatinine", "t"], ["note", "What It Means", "t"], ["raw", "eGFR (number)", "n", 0]],
    fn: C["egfr-calculator"], ex: { sex: 0, age: 50, scr: 0.9, unit: 0 },
    exText: (o) => `Example: a 50-year-old woman with a creatinine of 0.9 mg/dL has an eGFR of ${o.egfr} (${o.stage}).`,
    how: "eGFR estimates how much blood the kidneys filter each minute. CKD-EPI 2021: eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1.200 × 0.9938^age × 1.012 if female, with κ = 0.7 (female) or 0.9 (male) and α = −0.241 or −0.302.\n\nStages: G1 ≥ 90, G2 60–89, G3a 45–59, G3b 30–44, G4 15–29, G5 < 15 mL/min/1.73 m². eGFR naturally falls slowly with age.",
    assume: `CKD-EPI 2021 creatinine equation (no race term), for adults with stable kidney function. Less accurate with very high or low muscle mass, in pregnancy or during acute illness. ${MED}`,
    faq: [["What is a normal eGFR?", "90 or above is normal; 60–89 can be normal for older adults if there are no other signs of kidney disease."], ["Does eGFR use race?", "Not any more — the 2021 CKD-EPI equation removed the race coefficient."]],
  }),
  mk({
    slug: "gmi-calculator", title: "GMI Calculator (Glucose Management Indicator & A1c to Average Glucose)",
    meta: "GMI Calculator — CGM Glucose to A1c-Like GMI & eAG",
    desc: "Convert your average CGM glucose to the Glucose Management Indicator (GMI), convert an A1c to estimated average glucose (eAG), or estimate A1c from average glucose, in mg/dL or mmol/L.",
    inputs: [dd("mode", "Calculate", E.GMI_MODES, 0), num("x", "Average Glucose or A1c (%)", 150, 0.1, 1000, 0.1), dd("unit", "Glucose Unit", E.GLU_UNITS, 0)],
    results: [["result", "Result", "t"], ["pct", "GMI / A1c (%)", "t"], ["ifcc", "IFCC Units", "t"], ["target", "What It Means", "t"], ["formula", "Formula", "t"], ["mg", "Average Glucose (mg/dL)", "n", 0]],
    fn: C["gmi-calculator"], ex: { mode: 0, x: 150, unit: 0 },
    exText: (o) => `Example: an average CGM glucose of 150 mg/dL gives a GMI of ${o.result} (${o.ifcc}).`,
    how: "GMI estimates the A1c you'd expect from your continuous glucose monitor (CGM) average over at least 14 days: GMI (%) = 3.31 + 0.02392 × mean glucose in mg/dL.\n\nA lab A1c can differ from GMI because red blood cell lifespan and other factors vary. The ADAG formula converts between A1c and estimated average glucose: eAG (mg/dL) = 28.7 × A1c − 46.7.",
    assume: `GMI from Bergenstal et al. (Diabetes Care 2018); eAG from the ADAG study (Nathan et al. 2008). 1 mmol/L = 18.016 mg/dL. ${MED}`,
    faq: [["What is the difference between GMI and A1c?", "A1c is a blood test; GMI is calculated from CGM data. They are often close, but can differ by 0.5% or more."], ["What average glucose is an A1c of 7%?", "About 154 mg/dL (8.6 mmol/L)."]],
  }),
];

async function main() {
  const all = [...PREG, ...SLEEPMED];
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.TRV_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  await upsertTools("pregnancy-fertility-calculators", PREG);
  await upsertTools("sleep-medical-calculators", SLEEPMED);
}
main().catch((e) => { console.error(e); process.exit(1); });
