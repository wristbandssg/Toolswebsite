// One-time (but safe to re-run) batch setup script: creates the 12 remaining tools from the fitness
// keyword check (13 Nov 2026 — Claude outputs/Fitness_Build_Plan.json): Sports > Cycling /
// Running / Other Sports and Shopping > Clothing / Lifestyle. Formulas live in
// src/lib/calc-engine-fit-misc.ts; examples are computed from the engine. All tools are Published.
//
// HOW TO RUN
//   npx tsx prisma/create-fit-misc-calculators.ts        (FIT_DRY=1 → check only, no database)
// or
//   npm run db:create-fit-misc-calculators

import * as E from "../src/lib/calc-engine-fit-misc";
import { mk, num, money, pct, dd, upsertTools, type ToolDef } from "./trv-tool-kit";
import { money as money$, nfmt } from "../src/lib/trv-core";

const C = E.fitMiscCustomCalculators;
const usd = (x: unknown) => money$(Number(x), "$", 0);
const n = (x: unknown, dp = 0) => nfmt(Number(x), dp);
const COST = "Typical US prices as of 2026 — real quotes vary a lot by city, clinic and provider experience. Enter your own quote to replace the default.";

const CYCLE: ToolDef[] = [mk({
  slug: "tss-calculator", title: "TSS Calculator (Training Stress Score)",
  meta: "TSS Calculator — Training Stress Score & Intensity Factor",
  desc: "Calculate Training Stress Score (TSS) and Intensity Factor (IF) for a ride from duration, normalized power and FTP — with the work done in kJ and how long recovery takes.",
  inputs: [num("minutes", "Ride Duration (minutes)", 90, 1, 1440, 1), num("np", "Normalized Power (W)", 200, 1, 2000, 1), num("ftp", "Your FTP (W)", 250, 50, 600, 1), num("avgPower", "Average Power (W, Optional, for kJ)", 0, 0, 2000, 1)],
  results: [["tss", "Training Stress Score (TSS)", "n", 0], ["if", "Intensity Factor (IF)", "n", 2], ["kj", "Work Done (kJ ≈ kcal burned)", "n", 0], ["recovery", "Recovery", "t"], ["perHour", "TSS per Hour at This Intensity", "n", 0]],
  fn: C["tss-calculator"], ex: { minutes: 90, np: 200, ftp: 250, avgPower: 0 },
  exText: (o) => `Example: a 90-minute ride at 200 W normalized power with a 250 W FTP → IF ${o.if} and ${o.tss} TSS.`,
  how: "TSS measures how hard a workout was relative to your fitness: one hour flat-out at FTP is 100 TSS. Intensity Factor is normalized power ÷ FTP. Use the normalized power from your head unit or training app.\n\nWeekly TSS (often 300–700 for trained amateurs) is the basis of fitness (CTL) and fatigue (ATL) charts.",
  assume: "TSS = hours × IF² × 100. Work in kJ uses average power if entered, otherwise NP. Cycling kJ ≈ kcal burned because human efficiency (~24%) roughly cancels the 4.184 kJ-per-kcal conversion. Recovery bands from TrainingPeaks.",
  faq: [["What is a good TSS for a ride?", "Under 150 is an easy-to-moderate day; 150–300 a solid training day; over 300 a big day that needs recovery."], ["How is TSS calculated?", "TSS = duration in hours × IF² × 100, where IF = normalized power ÷ FTP."]],
})];

const RUN: ToolDef[] = [mk({
  slug: "maximal-aerobic-speed-calculator", title: "Maximal Aerobic Speed (MAS) Calculator",
  meta: "MAS Calculator — Maximal Aerobic Speed & Interval Distances",
  desc: "Calculate your maximal aerobic speed (MAS) from a 5-minute test, 6-minute run or 1,500–2,000 m time trial — with VO2 max and the distances to run for 15/15 MAS intervals.",
  inputs: [dd("test", "Test", E.MAS_TESTS, 3), num("distance", "Distance Covered (m) — 5/6-Min Tests & Custom", 1400, 100, 5000, 1), num("minutes", "Time — Minutes (Time Trials & Custom)", 8, 0, 15, 1), num("seconds", "Time — Seconds", 0, 0, 59.9, 0.1)],
  results: [["kmh", "Maximal Aerobic Speed (km/h)", "n", 2], ["ms", "MAS (m/s)", "n", 2], ["pace", "MAS Pace", "t"], ["vo2", "Estimated VO2 Max (ml/kg/min)", "n", 1], ["i100", "15 s Rep at 100% MAS (m)", "n", 0], ["i110", "15 s Rep at 110% MAS (m)", "n", 0], ["i120", "15 s Rep at 120% MAS (m)", "n", 0], ["t400", "400 m at MAS", "t"]],
  fn: C["maximal-aerobic-speed-calculator"], ex: { test: 3, distance: 1400, minutes: 8, seconds: 0 },
  exText: (o) => `Example: a 2 km time trial in 8:00 → MAS ${o.kmh} km/h (${o.pace}); 15/15 intervals at 110% mean running ${o.i110} m in each 15 seconds.`,
  how: "MAS is the slowest speed at which you reach your VO2 max — roughly the pace you can hold for 5–7 minutes all-out. Run one of the tests on a track, then use your MAS to set interval distances: for 15 seconds on / 15 seconds off, run 100–120% of MAS.\n\nCoaches in football, rugby and AFL use MAS to individualize conditioning for each player.",
  assume: "MAS = test distance ÷ time (an approximation — a 2 km time trial slightly underestimates it for slower runners). VO2 max ≈ 3.5 × MAS in km/h (Léger & Mercier).",
  faq: [["What is a good maximal aerobic speed?", "Around 15–17 km/h for trained team-sport athletes; elite endurance runners exceed 20 km/h."], ["How do you test MAS?", "Run as far as you can in 5–6 minutes, or as fast as you can over 1,500–2,000 m, and divide distance by time."]],
})];

const OTHER: ToolDef[] = [
  mk({
    slug: "rowing-split-calculator", title: "Rowing Split Calculator (Concept2 Pace)",
    meta: "Rowing Split Calculator — 500m Split, 2k Time & Watts (Concept2)",
    desc: "Convert a rowing 500 m split to finish time, a finish time to split, or watts to split — for any distance on a Concept2 erg — with watts, calories per hour and 2k/5k times.",
    inputs: [dd("mode", "Calculate", E.ROW_MODES, 0), num("distance", "Distance (m)", 2000, 100, 100000, 1), num("splitMin", "Split — Minutes per 500 m", 2, 0, 10, 1), num("splitSec", "Split — Seconds", 0, 0, 59.9, 0.1), num("timeMin", "Finish Time — Minutes", 8, 0, 600, 1), num("timeSec", "Finish Time — Seconds", 0, 0, 59.9, 0.1), num("watts", "Watts", 200, 1, 2000, 1)],
    results: [["split", "500 m Split", "t"], ["time", "Finish Time", "t"], ["watts", "Watts", "n", 0], ["calHr", "Calories per Hour (Concept2)", "n", 0], ["kmh", "Boat Speed (km/h)", "n", 2], ["t2k", "2,000 m Time at This Split", "t"], ["t5k", "5,000 m Time at This Split", "t"]],
    fn: C["rowing-split-calculator"], ex: { mode: 0, distance: 2000, splitMin: 2, splitSec: 0, timeMin: 8, timeSec: 0, watts: 200 },
    exText: (o) => `Example: a 2:00 split over 2,000 m → finish time ${o.time}, ${o.watts} watts and about ${n(o.calHr)} kcal per hour on the monitor.`,
    how: "The split is the time to row 500 m at your current pace. Finish time = split × distance ÷ 500. Concept2 monitors convert pace to watts with watts = 2.80 ÷ pace³ (pace in seconds per metre), so halving your split takes eight times the power.\n\nPick what you know (split, finish time or watts) and the calculator fills in the rest.",
    assume: "Concept2 formulas: watts = 2.80 ÷ (s/m)³; calories per hour = 4 × watts × 0.8604 + 300 (the monitor's figure, which assumes a 175 lb rower).",
    faq: [["What is a good 500m split on a rower?", "Around 2:00–2:10 is solid for a fit adult; competitive men's 2k pace is about 1:30–1:40."], ["How do I convert watts to split?", "Split (s per 500 m) = 500 × (2.80 ÷ watts)^(1/3)."]],
  }),
  mk({
    slug: "stair-climbing-calorie-calculator", title: "StairMaster Calorie Calculator",
    meta: "StairMaster & Stair Climbing Calories Burned Calculator",
    desc: "Calculate calories burned on a StairMaster, stair stepper or climbing stairs — from your weight, time and intensity, with any backpack or weighted vest — plus floors climbed.",
    inputs: [dd("units", "Units", ["US (lb)", "Metric (kg)"], 0), num("weight", "Body Weight", 180, 40, 800, 0.1), num("load", "Extra Load — Vest or Backpack (Optional)", 0, 0, 200, 0.5), dd("intensity", "Activity", E.STAIR.map(([l, m]) => `${l} (${m} METs)`), 2), num("minutes", "Minutes", 30, 1, 600, 1), num("stepsPerMin", "Steps per Minute (Optional, for Floors)", 0, 0, 200, 1)],
    results: [["total", "Calories Burned", "n", 0], ["perMin", "Calories per Minute", "n", 1], ["net", "Calories Above Resting", "n", 0], ["met", "METs Used", "n", 1], ["floors", "Floors Climbed (16 Steps Each)", "n", 0], ["perHour", "Calories per Hour", "n", 0]],
    fn: C["stair-climbing-calorie-calculator"], ex: { units: 0, weight: 180, load: 0, intensity: 2, minutes: 30, stepsPerMin: 60 },
    exText: (o) => `Example: a 180 lb person on a StairMaster for 30 minutes burns about ${o.total} kcal and climbs about ${o.floors} floors at 60 steps a minute.`,
    how: "Calories = METs × 3.5 × body weight (kg) × minutes ÷ 200. Stair climbing is one of the highest-MET everyday activities: a StairMaster at a steady pace is about 9 METs — similar to running at 5.5 mph.\n\nHolding the handrails reduces the real burn by up to 20–25%, so the machine's own number is often too high.",
    assume: "METs from the 2011 Compendium of Physical Activities (stairs slow 4.0, fast 8.8; stair-treadmill ergometer 9.0; running up stairs 15.0). Extra load is added to body weight. A floor ≈ 16 steps.",
    faq: [["How many calories does 30 minutes on the StairMaster burn?", "About 300–450 kcal for most adults, depending on weight and pace."], ["Is the StairMaster good for weight loss?", "Yes — it burns more calories per minute than walking and is easy on the joints."]],
  }),
];

const CLOTH: ToolDef[] = [mk({
  slug: "body-shape-calculator", title: "Body Shape Calculator",
  meta: "Body Shape Calculator — Hourglass, Pear, Apple, Rectangle (Women & Men)",
  desc: "Find your body shape from bust (or chest), waist and hip measurements — hourglass, pear, inverted triangle, rectangle, spoon and more for women; V-shape, trapezoid or oval for men — with what to wear.",
  inputs: [dd("sex", "Calculate For", ["Men", "Women"], 1), dd("units", "Units", ["Inches", "Centimetres"], 0), num("bust", "Bust / Chest (fullest part)", 36, 10, 200, 0.1), num("waist", "Waist (narrowest part)", 28, 10, 200, 0.1), num("hips", "Hips (widest part)", 38, 10, 200, 0.1), num("highHip", "High Hip (Optional, Women — about 4\" below waist)", 0, 0, 200, 0.1)],
  results: [["shape", "Your Body Shape", "t"], ["tips", "What It Means & What to Wear", "t"], ["whr", "Waist-to-Hip Ratio", "n", 2], ["bustWaist", "Bust/Chest Minus Waist", "n", 1], ["hipWaist", "Hips Minus Waist", "n", 1]],
  fn: C["body-shape-calculator"], ex: { sex: 1, units: 0, bust: 36, waist: 28, hips: 38, highHip: 0 },
  exText: (o) => `Example: a woman with a 36" bust, 28" waist and 38" hips → ${o.shape}.`,
  how: "Measure snugly but not tight: bust or chest at the fullest point, waist at the narrowest point and hips at the widest part of your seat. For women, adding the high hip (about 4\" below the waist) lets the calculator tell spoon and bottom-hourglass shapes apart.\n\nThe women's shapes use the FFIT for Apparel rules from clothing research; the men's shapes compare chest, waist and hips.",
  assume: "FFIT rules (inches): hourglass if bust and hips differ by ≤1\" (hips − bust < 3.6\") and bust − waist ≥ 9\" or hips − waist ≥ 10\"; triangle if hips − bust ≥ 3.6\" and hips − waist < 9\"; inverted triangle if bust − hips ≥ 3.6\" and bust − waist < 9\"; rectangle if all differences are small. Men: chest ÷ waist ≥ 1.25 V-shape, 1.1–1.25 trapezoid.",
  faq: [["How do I know my body shape?", "Compare your bust, waist and hips — an hourglass has balanced bust and hips with a waist at least 9\" smaller."], ["What is the most common female body shape?", "In US sizing studies the rectangle (straight) shape is the most common."]],
})];

const LIFE: ToolDef[] = [
  mk({
    slug: "tattoo-removal-cost-calculator", title: "Tattoo Removal Cost Calculator",
    meta: "Tattoo Removal Cost Calculator — Laser Sessions (Kirby-Desai)",
    desc: "Estimate how many laser tattoo removal sessions you'll need with the Kirby-Desai scale — skin type, location, colors, ink, scarring and layering — and the total cost.",
    inputs: [dd("skin", "Skin Type (Fitzpatrick)", ["I — very fair", "II — fair", "III — medium", "IV — olive", "V — brown", "VI — dark brown/black"], 1), dd("location", "Location", ["Head and neck", "Upper trunk", "Lower trunk", "Upper arm / thigh", "Hands, feet, lower arm or leg"], 3), dd("color", "Colors", ["Black only", "Mostly black, some red", "Black, red and other colors", "Multiple colors (incl. green/blue)"], 0), dd("ink", "Amount of Ink", ["Amateur", "Minimal (thin lines)", "Moderate", "Significant (solid fill)"], 2), dd("scarring", "Scarring", ["None", "Minimal", "Moderate", "Significant"], 0), dd("layering", "Cover-Up / Layering", ["No", "Yes"], 0), dd("size", "Tattoo Size", E.TR_SIZES.map(([l, p]) => `${l} — ~$${p}/session`), 1), money("price", "Your Quoted Price per Session (0 = Typical)", 0)],
    results: [["sessions", "Estimated Sessions (Kirby-Desai)", "n", 1], ["low", "Range — From", "n", 1], ["high", "Range — To", "n", 1], ["cost", "Estimated Total Cost", "c"], ["range", "Cost Range", "t"], ["perSession", "Price per Session", "c"], ["months", "Approx. Months (Sessions 6–8 Weeks Apart)", "n", 0]],
    fn: C["tattoo-removal-cost-calculator"], ex: { skin: 1, location: 3, color: 0, ink: 2, scarring: 0, layering: 0, size: 1, price: 0 },
    exText: (o) => `Example: a medium black tattoo on the upper arm with moderate ink on fair skin → about ${o.sessions} sessions (${o.low}–${o.high}), roughly ${usd(o.cost)}.`,
    how: "The Kirby-Desai scale, used by dermatologists, scores six factors and adds them up to predict the number of laser sessions. Darker skin, tattoos far from the heart (slower circulation), more colors, dense ink, scarring and cover-ups all add sessions.\n\nSessions need 6–8 weeks between them so your immune system can clear the broken-up ink.",
    assume: `Kirby-Desai sessions = skin (1–6) + location (1–5) + color (1–4) + ink (1–4) + scarring (0–5) + layering (0 or 2), ±2.5. Picosecond lasers may need somewhat fewer sessions. ${COST}`,
    faq: [["How many sessions does tattoo removal take?", "Usually 6–12; the Kirby-Desai scale gives a personal estimate."], ["How much does laser tattoo removal cost?", "Typically $200–500 per session in the US, so $1,500–5,000 in total for most tattoos."]],
  }),
  mk({
    slug: "hair-transplant-cost-calculator", title: "Hair Transplant Graft Calculator",
    meta: "Hair Transplant Calculator — Grafts Needed & Cost by Country",
    desc: "Estimate how many hair transplant grafts you need by Norwood stage or bald area, the number of hairs, and the cost in the USA, UK, Turkey, Mexico, India and more.",
    inputs: [dd("method", "Estimate By", ["Norwood stage", "Bald area (cm²)"], 0), dd("stage", "Norwood Stage", E.NORWOOD.map(([l, a, b]) => `${l} (${a.toLocaleString("en-US")}–${b.toLocaleString("en-US")} grafts)`), 3), num("area", "Area to Cover (cm²)", 60, 1, 400, 1), num("density", "Target Density (grafts per cm²)", 45, 20, 70, 1), dd("region", "Where", E.HT_REGIONS.map(([l, p]) => `${l} (~$${p}/graft)`), 0), money("pricePerGraft", "Your Quoted Price per Graft (0 = Typical)", 0)],
    results: [["grafts", "Grafts Needed (Mid Estimate)", "n", 0], ["low", "Range — From", "n", 0], ["high", "Range — To", "n", 0], ["hairs", "Approx. Hairs (2.2 per Graft)", "n", 0], ["cost", "Estimated Cost (USD)", "c"], ["range", "Cost Range", "t"], ["sessions", "Sessions", "t"], ["ppg", "Price per Graft Used", "c"]],
    fn: C["hair-transplant-cost-calculator"], ex: { method: 0, stage: 3, area: 60, density: 45, region: 0, pricePerGraft: 0 },
    exText: (o) => `Example: Norwood 4 in the USA → about ${n(o.grafts)} grafts (${n(o.low)}–${n(o.high)}), roughly ${usd(o.cost)} at ~$6 per graft.`,
    how: "A graft (follicular unit) holds 1–4 hairs, about 2.2 on average. Surgeons plan grafts from the area to cover and the density they aim for — 40–50 grafts per cm² looks full at the hairline. The Norwood scale gives typical totals for each stage of male-pattern baldness.\n\nPrices are usually quoted per graft in the US and UK and as packages in Turkey, Mexico and India.",
    assume: `Graft ranges by Norwood stage are typical clinic planning figures; area method ±15%. Price per graft (USD): USA ~$6, UK ~$4.50, Canada/Australia ~$5, Mexico ~$2.50, Thailand ~$1.80, Turkey ~$0.90, India ~$0.80 — package prices abroad usually exclude travel. Your donor area limits the total possible. ${COST}`,
    faq: [["How many grafts do I need for a hair transplant?", "About 1,000–2,000 for Norwood 3, 2,000–2,800 for Norwood 4 and 3,500+ for Norwood 6."], ["How much does a hair transplant cost?", "About $4–8 per graft in the US; packages in Turkey are often $2,000–4,000 in total."]],
  }),
  mk({
    slug: "hair-growth-calculator", title: "Hair Growth Calculator",
    meta: "Hair Growth Calculator — How Long to Grow Your Hair",
    desc: "Find how long it takes to grow your hair to a target length — at about half an inch (1.25 cm) a month — allowing for regular trims.",
    inputs: [num("current", "Current Length", 2, 0, 60, 0.1), num("target", "Target Length (same unit)", 8, 0.1, 80, 0.1), num("rate", "Growth per Month (same unit)", 0.5, 0.05, 2, 0.05), num("trimWeeks", "Trim Every (weeks, 0 = no trims)", 12, 0, 52, 1), num("trimAmount", "Amount Trimmed Each Time", 0.25, 0, 5, 0.05)],
    results: [["months", "Months to Reach Your Length", "n", 1], ["weeks", "Weeks", "n", 0], ["years", "Years", "n", 1], ["net", "Net Growth per Month", "n", 2], ["year", "Length After 1 Year", "n", 1]],
    fn: C["hair-growth-calculator"], ex: { current: 2, target: 8, rate: 0.5, trimWeeks: 12, trimAmount: 0.25 },
    exText: (o) => `Example: from 2" to 8" growing 0.5" a month with a ¼" trim every 12 weeks → about ${o.months} months.`,
    how: "Scalp hair grows about 0.5 inch (1.25 cm) a month on average — roughly 6 inches (15 cm) a year — though it ranges from about 0.3 to 0.7 inch. Regular trims remove some of that growth, so they lengthen the time to your goal.\n\nUse any unit (inches or cm) as long as all the lengths match.",
    assume: "Constant growth rate. Hair grows a little slower with age, and each hair has a maximum length set by its growth phase (often 2–7 years), which limits very long goals.",
    faq: [["How fast does hair grow?", "About half an inch (1.25 cm) a month, or 6 inches a year."], ["How long does it take to grow hair 10 inches?", "About 20 months without trims."]],
  }),
  mk({
    slug: "laser-hair-removal-cost-calculator", title: "Laser Hair Removal Cost Calculator",
    desc: "Estimate the cost of laser hair removal by body area — the full course of sessions, package discounts, yearly maintenance and the 5-year total.",
    inputs: [dd("area", "Body Area", E.LASER_AREAS.map(([l, p]) => `${l} — ~$${p}/session`), 3), money("price", "Your Quoted Price per Session (0 = Typical)", 0), num("sessions", "Sessions in the Course", 7, 1, 20, 1), pct("discount", "Package Discount (%)", 0, 60), num("maintenance", "Maintenance Sessions per Year", 1, 0, 6, 1)],
    results: [["total", "Cost of the Course", "c"], ["perSession", "Price per Session (after discount)", "c"], ["yearly", "Maintenance per Year", "c"], ["five", "5-Year Total", "c"], ["sessions", "Sessions", "n", 0], ["saved", "Saved by the Package", "c"]],
    fn: C["laser-hair-removal-cost-calculator"], ex: { area: 3, price: 0, sessions: 7, discount: 0, maintenance: 1 },
    exText: (o) => `Example: underarms, 7 sessions at about $150 → ${usd(o.total)} for the course, ${usd(o.five)} over 5 years with one touch-up a year.`,
    how: "Lasers only destroy hairs in their active growth phase, so most people need 6–8 sessions 4–6 weeks apart (more on the face and for hormonal hair), then an occasional touch-up. Clinics usually price per area per session and offer package discounts.\n\nLaser works best on dark hair; very light, red or grey hair responds poorly.",
    assume: `Typical per-session prices by area (US). The ASPS lists an average physician fee of about $400 per session across all areas. ${COST}`,
    faq: [["How much does laser hair removal cost?", "From about $75 a session for a small area like the upper lip to $400+ for legs or back."], ["How many sessions of laser hair removal do I need?", "Usually 6–8, plus a touch-up once or twice a year."]],
  }),
  mk({
    slug: "cosmetic-surgery-cost-calculator", title: "Plastic Surgery Cost Calculator",
    meta: "Plastic Surgery Cost Calculator — Surgeon, Anesthesia & Facility Fees",
    desc: "Estimate the full cost of cosmetic surgery — breast augmentation, tummy tuck, facelift, rhinoplasty or liposuction — including the surgeon, anesthesia, facility and extras, with a monthly financing figure.",
    inputs: [dd("procedure", "Procedure", E.SURGERY.map(([l, f]) => (f ? `${l} — surgeon avg $${f.toLocaleString("en-US")}` : l)), 0), money("fee", "Your Surgeon's Fee (0 = National Average)", 0), dd("region", "Area (Average Fee Only)", ["National average", "High-cost city (NYC, LA, Miami)", "Lower-cost area"], 0), num("hours", "Operating Time (hours, 0 = Typical)", 0, 0, 12, 0.5), money("anesthesiaRate", "Anesthesia per Hour", 600), money("facilityRate", "Operating Room / Facility per Hour", 900), money("extras", "Extras (Garments, Meds, Tests)", 400)],
    results: [["total", "Estimated Total Cost", "c"], ["fee", "Surgeon's Fee", "c"], ["anesthesia", "Anesthesia", "c"], ["facility", "Facility / Operating Room", "c"], ["extras", "Extras", "c"], ["monthly", "Monthly Payment (36 mo at 10% APR)", "c"]],
    fn: C["cosmetic-surgery-cost-calculator"], ex: { procedure: 0, fee: 0, region: 0, hours: 0, anesthesiaRate: 600, facilityRate: 900, extras: 400 },
    exText: (o) => `Example: breast augmentation at the national average surgeon fee → about ${usd(o.total)} all-in (${usd(o.fee)} surgeon + ${usd(o.anesthesia)} anesthesia + ${usd(o.facility)} facility + extras).`,
    how: "The figure surgeons and the ASPS quote is only the surgeon's fee. On top you pay the anesthesiologist and the surgical facility, both usually charged by operating time, plus post-op garments, medicines and tests. Implants (about $1,000–2,000 a pair) are often included in breast quotes — check.\n\nCosmetic surgery is rarely covered by insurance.",
    assume: `Surgeon fees: ASPS 2023 national averages. Typical operating times: breast augmentation 2 h, tummy tuck 3 h, facelift 4 h, rhinoplasty 2.5 h, chin/neck liposuction 1 h. High-cost cities ≈ +25%, lower-cost areas ≈ −15%. ${COST}`,
    faq: [["How much does a tummy tuck cost?", "The average surgeon's fee was $8,174 in 2023; with anesthesia and facility fees the total is often $11,000–14,000."], ["Why is the total higher than the average price I saw?", "Published averages are the surgeon's fee only — anesthesia, facility and extras add 30–60%."]],
  }),
  mk({
    slug: "breast-implant-size-calculator", title: "Breast Implant Size Calculator",
    meta: "Breast Implant Size Calculator — CC per Cup Size",
    desc: "Estimate the breast implant volume in cc to go from your current cup size to the one you want, based on your band size.",
    inputs: [num("band", "Band Size (inches)", 34, 28, 48, 2), dd("current", "Current Cup", E.CUPS, 1), dd("desired", "Desired Cup", E.CUPS, 3)],
    results: [["cc", "Estimated Implant Size (cc)", "n", 0], ["low", "Range — From (cc)", "n", 0], ["high", "Range — To (cc)", "n", 0], ["perCup", "cc per Cup at Your Band Size", "n", 0], ["cups", "Cup Sizes Up", "n", 0], ["note", "Important", "t"]],
    fn: C["breast-implant-size-calculator"], ex: { band: 34, current: 1, desired: 3 },
    exText: (o) => `Example: a 34A wanting a C → about ${o.cc} cc (${o.low}–${o.high} cc), at roughly ${o.perCup} cc per cup.`,
    how: "One cup size is roughly 150–200 cc of volume, and more on a larger band because each cup step is bigger on a wider chest. The calculator multiplies the cup increase by the cc per cup for your band.\n\nBra cup sizes vary between brands, so surgeons rely on your chest measurements, tissue and the implant's base width and profile instead.",
    assume: "cc per cup ≈ 150 + 12.5 × (band − 32): 32 → 150 cc, 34 → 175, 36 → 200, 38 → 225. Rounded to 25 cc. A rough guide only — not a surgical plan.",
    faq: [["How many cc is one cup size?", "About 150–200 cc for most band sizes."], ["What size implant goes from an A to a C cup?", "Roughly 300–400 cc on a 34 band."]],
  }),
  mk({
    slug: "sunscreen-calculator", title: "Sunscreen Calculator",
    meta: "Sunscreen & SPF Calculator — How Much Sunscreen and How Long It Lasts",
    desc: "Work out how much sunscreen to apply (2 mg/cm²), how many reapplications and bottles you need for a day outdoors, and how long SPF protects your skin type at today's UV index.",
    inputs: [dd("units", "Units", ["US (inches, lb)", "Metric (cm, kg)"], 0), num("height", "Height", 66, 20, 250, 0.1), num("weight", "Weight", 150, 10, 800, 0.1), dd("area", "Skin Exposed", E.AREAS.map(([l]) => l), 2), num("hours", "Hours Outdoors", 4, 0.5, 16, 0.5), num("spf", "SPF", 30, 2, 100, 1), num("uvi", "UV Index", 7, 1, 15, 1), dd("skin", "Skin Type", ["I — always burns, never tans", "II — burns easily, tans slowly", "III — sometimes burns, tans gradually", "IV — rarely burns, tans well", "V — very rarely burns", "VI — almost never burns"], 1), num("bottle", "Bottle Size (mL; 177 = 6 oz)", 177, 10, 1000, 1)],
    results: [["ml", "Sunscreen per Application (mL)", "n", 1], ["tsp", "Per Application (teaspoons)", "n", 1], ["oz", "Per Application (fl oz)", "n", 2], ["apps", "Applications (Every 2 Hours)", "n", 0], ["total", "Total for the Day (mL)", "n", 0], ["bottles", "Bottles Needed", "n", 2], ["burn", "Minutes to Burn Without Sunscreen", "n", 0], ["protected", "Minutes Protected at Full Dose (Theory)", "n", 0], ["realistic", "Minutes Protected at a Typical Half Dose", "n", 0], ["bsa", "Body Surface Area (m²)", "n", 2]],
    fn: C["sunscreen-calculator"], ex: { units: 0, height: 66, weight: 150, area: 2, hours: 4, spf: 30, uvi: 7, skin: 1, bottle: 177 },
    exText: (o) => `Example: a 5'6", 150 lb adult in a swimsuit for 4 hours needs about ${o.ml} mL (${o.oz} oz) per application and ${o.apps} applications — ${o.bottles} of a 6 oz bottle.`,
    how: "SPF ratings are tested at 2 mg of sunscreen per cm² of skin — about a shot glass (1 oz) for an adult's whole body. Most people use half that, which gives far less protection than the label. Reapply every 2 hours and after swimming or sweating.\n\nThe burn times show how quickly your skin type reddens at the UV index you enter; SPF multiplies that in theory, but never stay out longer just because the math allows it.",
    assume: "Body surface area by the Mosteller formula; exposed share by the rule of nines. Minimal erythema dose (SED) by skin type: I 2, II 2.5, III 3.5, IV 4.5, V 6, VI 10; 1 UV index unit ≈ 0.9 SED per hour. A half dose gives roughly √SPF protection. Protection times are capped at 10 hours. Not a substitute for shade, clothing and avoiding midday sun.",
    faq: [["How much sunscreen should I use?", "About 1 oz (30 mL, a shot glass) for the whole body and ½ teaspoon for the face and neck."], ["How long does SPF 30 last?", "Reapply every 2 hours regardless of SPF, and after swimming or sweating."]],
  }),
];

export const FIT_MISC: [string, ToolDef[]][] = [
  ["cycling-calculators", CYCLE],
  ["running-calculators", RUN],
  ["other-sports-calculators", OTHER],
  ["clothing-shoe-ring-size-calculators", CLOTH],
  ["lifestyle-party-wedding-calculators", LIFE],
];

async function main() {
  const all = FIT_MISC.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.FIT_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of FIT_MISC) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
