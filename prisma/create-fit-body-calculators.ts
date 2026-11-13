// One-time (but safe to re-run) batch setup script: creates the 17 body-composition and strength
// tools from the fitness keyword check (13 Nov 2026 — Claude outputs/Fitness_Build_Plan.json) in
// Sports > Sports Performance Calculators. Formulas live in src/lib/calc-engine-fit-body.ts;
// examples are computed from the engine. All tools are Published.
//
// HOW TO RUN
//   npx tsx prisma/create-fit-body-calculators.ts        (FIT_DRY=1 → check only, no database)
// or
//   npm run db:create-fit-body-calculators

import * as E from "../src/lib/calc-engine-fit-body";
import { mk, num, dd, upsertTools, type ToolDef } from "./trv-tool-kit";

const C = E.fitBodyCustomCalculators;
const HEALTH = "A screening estimate for adults, not a diagnosis. Talk to a doctor about your health risks, especially if you are pregnant, an older adult or have a medical condition.";
const units = (def = 0) => dd("units", "Units", ["US (lb, inches)", "Metric (kg, cm)"], def);
const sex = (def = 0) => dd("sex", "Sex", ["Male", "Female"], def);

const BODY: ToolDef[] = [
  mk({
    slug: "bmi-calculator", title: "BMI Calculator",
    meta: "BMI Calculator — Body Mass Index & Healthy Weight Range",
    desc: "Calculate your body mass index (BMI) from height and weight, see your WHO category, your healthy weight range and how much to lose or gain to reach it.",
    inputs: [units(), num("weight", "Weight (lb or kg)", 180, 10, 1000, 0.1), num("height", "Height (inches or cm)", 70, 20, 250, 0.1)],
    results: [["bmi", "Your BMI", "n", 1], ["category", "Category", "t"], ["low", "Healthy Weight — From (lb or kg)", "n", 1], ["high", "Healthy Weight — To", "n", 1], ["change", "To Reach the Healthy Range (+ = lose)", "n", 1], ["prime", "BMI Prime (BMI ÷ 25)", "n", 2], ["newBmi", "New BMI (Trefethen)", "n", 1], ["note", "Note for Athletes", "t"]],
    fn: C["bmi-calculator"], ex: { units: 0, weight: 180, height: 70 },
    exText: (o) => `Example: 5'10" and 180 lb → BMI ${o.bmi} (${String(o.category).toLowerCase()}). A healthy weight at that height is ${o.low}–${o.high} lb.`,
    how: "BMI = weight in kg ÷ height in metres squared (or 703 × lb ÷ inches²). The WHO bands are: under 18.5 underweight, 18.5–24.9 healthy, 25–29.9 overweight and 30+ obesity.\n\nBMI is a quick screen for adults. It doesn't measure body fat, so muscular people, older adults and some ethnic groups can be misclassified — Asian populations often use 23 and 27.5 as action points.",
    assume: `WHO adult BMI categories. The 'new BMI' (1.3 × kg ÷ m^2.5, Trefethen, Oxford) corrects for very tall and very short people. Not for children or pregnancy. ${HEALTH}`,
    faq: [["What is a healthy BMI?", "18.5 to 24.9 for adults."], ["Is BMI accurate for athletes?", "Not really — muscle weighs more than fat, so athletes and bodybuilders often show 'overweight'. Waist-to-height ratio or body fat % is better."], ["How do I calculate BMI?", "Divide weight in kg by height in metres squared."]],
  }),
  mk({
    slug: "ideal-weight-calculator", title: "Ideal Weight Calculator",
    meta: "Ideal Weight Calculator — Ideal Body Weight by Height & Frame Size",
    desc: "Find your ideal body weight for your height and sex with the Devine, Robinson, Miller and Hamwi formulas, adjusted for small, medium or large frame (measured from your wrist).",
    inputs: [sex(), units(), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), dd("frame", "Frame Size", ["Small", "Medium", "Large"], 1), num("wrist", "Wrist Circumference (Optional — Sets Frame Size)", 0, 0, 40, 0.1)],
    results: [["ideal", "Ideal Weight (Average, Frame-Adjusted)", "n", 1], ["devine", "Devine (1974)", "n", 1], ["robinson", "Robinson (1983)", "n", 1], ["miller", "Miller (1983)", "n", 1], ["hamwi", "Hamwi (1964)", "n", 1], ["frame", "Frame Size Used", "t"], ["bmiLow", "Healthy BMI Range — From", "n", 1], ["bmiHigh", "Healthy BMI Range — To", "n", 1]],
    fn: C["ideal-weight-calculator"], ex: { sex: 0, units: 0, height: 70, frame: 1, wrist: 0 },
    exText: (o) => `Example: a man 5'10" with a medium frame → an ideal weight of about ${o.ideal} lb (formulas range ${Math.min(Number(o.devine), Number(o.robinson), Number(o.miller), Number(o.hamwi))}–${Math.max(Number(o.devine), Number(o.robinson), Number(o.miller), Number(o.hamwi))} lb).`,
    how: "The classic ideal-body-weight formulas start from a base weight at 5 feet and add a fixed amount per inch above that. They were made for medicine dosing, so they're a reference point, not a target you must hit.\n\nMeasure your wrist just below the bone to set your frame size: height ÷ wrist above 10.4 (men) or 11 (women) is a small frame; below 9.6 (men) or 10.1 (women) is large.",
    assume: `Devine: 50 / 45.5 kg + 2.3 kg per inch over 5 ft. Robinson: 52 + 1.9 / 49 + 1.7. Miller: 56.2 + 1.41 / 53.1 + 1.36. Hamwi: 48 + 2.7 / 45.5 + 2.2 (men / women). Small frame −10%, large +10%. ${HEALTH}`,
    faq: [["What is my ideal weight for my height?", "Enter your height — most adults' formula results fall inside the healthy BMI range of 18.5–24.9."], ["How do I know my body frame size?", "Divide your height by your wrist circumference, or see whether your thumb and middle finger overlap around your wrist."]],
  }),
  mk({
    slug: "waist-to-hip-ratio-calculator", title: "Waist-to-Hip Ratio Calculator",
    meta: "Waist to Hip Ratio Calculator — WHR & Health Risk",
    desc: "Calculate your waist-to-hip ratio (WHR), see your health risk category and whether you're above the WHO cut-off — plus the waist size that brings you under it.",
    inputs: [sex(), num("waist", "Waist (narrowest point, any unit)", 34, 10, 100, 0.1), num("hip", "Hips (widest point, same unit)", 40, 10, 100, 0.1)],
    results: [["ratio", "Waist-to-Hip Ratio", "n", 2], ["risk", "Health Risk", "t"], ["who", "WHO Cut-Off", "t"], ["shape", "Body Shape", "t"], ["target", "Waist Size at the WHO Cut-Off", "n", 1]],
    fn: C["waist-to-hip-ratio-calculator"], ex: { sex: 0, waist: 34, hip: 40 },
    exText: (o) => `Example: a man with a 34" waist and 40" hips has a WHR of ${o.ratio} — ${String(o.risk).toLowerCase()}.`,
    how: "Measure your waist at the narrowest point (or just above the belly button) and your hips at the widest part of your buttocks, then divide waist by hips. Belly fat is linked with heart disease and diabetes more strongly than fat on the hips and thighs.",
    assume: `WHO (2008): ≥0.90 for men and ≥0.85 for women means substantially increased metabolic risk. Low/moderate/high bands: men ≤0.95 / 0.96–1.0 / >1.0, women ≤0.80 / 0.81–0.85 / >0.85. ${HEALTH}`,
    faq: [["What is a healthy waist-to-hip ratio?", "Below 0.90 for men and below 0.85 for women."], ["How do I measure waist-to-hip ratio?", "Divide your waist measurement by your hip measurement, both in the same unit."]],
  }),
  mk({
    slug: "waist-to-height-ratio-calculator", title: "Waist-to-Height Ratio Calculator",
    meta: "Waist to Height Ratio Calculator — Ideal Waist Size",
    desc: "Calculate your waist-to-height ratio (WHtR) and ideal waist size — keep your waist to less than half your height — with your health-risk band.",
    inputs: [num("waist", "Waist (any unit)", 34, 10, 100, 0.1), num("height", "Height (same unit)", 70, 20, 250, 0.1)],
    results: [["ratio", "Waist-to-Height Ratio", "n", 3], ["category", "Category", "t"], ["max", "Maximum Healthy Waist (½ Height)", "n", 1], ["idealLow", "Ideal Waist — From", "n", 1], ["idealHigh", "Ideal Waist — To", "n", 1], ["reduce", "Waist to Lose to Reach 0.5", "n", 1]],
    fn: C["waist-to-height-ratio-calculator"], ex: { waist: 34, height: 70 },
    exText: (o) => `Example: a 34" waist at 5'10" (70") gives a ratio of ${o.ratio} — ${String(o.category).toLowerCase()}. Keep your waist under ${o.max}".`,
    how: "Divide your waist (measured midway between your lowest rib and hip bone) by your height, in the same unit. The simple rule is: keep your waist to less than half your height. Unlike BMI, it works for people of different builds and ethnic groups.",
    assume: `Bands from Ashwell & Gibson: 0.40–0.49 healthy, 0.50–0.59 increased risk, 0.60+ high risk (NICE 2022 uses the same 0.5 and 0.6 cut-offs). ${HEALTH}`,
    faq: [["What is a good waist-to-height ratio?", "Between 0.40 and 0.49 — your waist should be less than half your height."], ["What is my ideal waist size?", "Half your height or less: for 5'10\" (70\") that's under 35 inches."]],
  }),
  mk({
    slug: "body-roundness-index-calculator", title: "Body Roundness Index Calculator",
    meta: "Body Roundness Index (BRI) Calculator",
    desc: "Calculate your Body Roundness Index (BRI) from waist and height — a newer alternative to BMI that reflects belly fat — and see which risk range you fall in.",
    inputs: [units(), num("waist", "Waist (inches or cm)", 34, 10, 100, 0.1), num("height", "Height (inches or cm)", 70, 20, 250, 0.1)],
    results: [["bri", "Body Roundness Index", "n", 2], ["category", "Risk Range", "t"], ["ecc", "Body Eccentricity", "n", 3], ["whtr", "Waist-to-Height Ratio", "n", 3]],
    fn: C["body-roundness-index-calculator"], ex: { units: 0, waist: 34, height: 70 },
    exText: (o) => `Example: a 34" waist at 5'10" → BRI ${o.bri}: ${String(o.category).split(" — ")[0]}.`,
    how: "BRI models your body as an ellipse: the rounder your middle relative to your height, the higher the index. Scores usually run from about 1 (very lean) to 10+ (very round). A 2024 study of 33,000 US adults found the lowest death rates at BRI 3.4–4.5 and higher risk below 3.4 or above 6.9.",
    assume: `BRI = 364.2 − 365.5 × √(1 − (waist ÷ 2π)² ÷ (0.5 × height)²) (Thomas et al., 2013). Risk ranges from Zhang et al., JAMA Network Open 2024. ${HEALTH}`,
    faq: [["What is a healthy body roundness index?", "Roughly 3.4 to 4.5 had the lowest risk in the largest study so far."], ["Is BRI better than BMI?", "It reflects belly fat, which BMI misses, so it may predict health risk better — but it's newer and less widely used."]],
  }),
  mk({
    slug: "skinfold-body-fat-calculator", title: "Skinfold Body Fat Calculator",
    meta: "Skinfold Body Fat Calculator — Jackson-Pollock 3 & 7 Site (Calipers)",
    desc: "Calculate body fat percentage from caliper skinfold measurements with the Jackson-Pollock 3-site or 7-site formulas — with fat mass, lean mass and your category.",
    inputs: [sex(), dd("method", "Method", ["Jackson-Pollock 3-site", "Jackson-Pollock 7-site"], 0), num("age", "Age", 30, 15, 90, 1), units(), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("chest", "Chest (mm)", 12, 0, 80, 0.5), num("abdomen", "Abdomen (mm)", 20, 0, 80, 0.5), num("thigh", "Thigh (mm)", 15, 0, 80, 0.5), num("triceps", "Triceps (mm)", 12, 0, 80, 0.5), num("subscapular", "Subscapular (mm)", 14, 0, 80, 0.5), num("suprailiac", "Suprailiac (mm)", 15, 0, 80, 0.5), num("midaxillary", "Midaxillary (mm)", 12, 0, 80, 0.5)],
    results: [["bf", "Body Fat Percentage", "n", 1], ["category", "Category", "t"], ["density", "Body Density (g/cc)", "n", 3], ["sum", "Sum of Skinfolds Used (mm)", "n", 1], ["sites", "Sites Used", "t"], ["fat", "Fat Mass (lb or kg)", "n", 1], ["lean", "Lean Mass (lb or kg)", "n", 1]],
    fn: C["skinfold-body-fat-calculator"], ex: { sex: 0, method: 0, age: 30, units: 0, weight: 180, chest: 12, abdomen: 20, thigh: 15, triceps: 12, subscapular: 14, suprailiac: 15, midaxillary: 12 },
    exText: (o) => `Example: a 30-year-old man with chest 12, abdomen 20 and thigh 15 mm (3-site) → about ${o.bf}% body fat (${String(o.category).toLowerCase()}).`,
    how: "Pinch a fold of skin and fat on the right side of the body, place the caliper 1 cm away, read it after 2 seconds and take 2–3 readings per site. The 3-site method uses chest, abdomen and thigh for men and triceps, suprailiac and thigh for women; the 7-site method uses all seven sites.\n\nOnly the sites for your method are used — the others can stay as they are.",
    assume: "Jackson & Pollock (1978, 1980) body density equations, Siri (1961) conversion: %BF = 495 ÷ density − 450. Typical error ±3–4% with a trained tester. Categories (ACE): men <6 essential, 6–13 athletes, 14–17 fitness, 18–24 average, 25+ obese; women <14, 14–20, 21–24, 25–31, 32+.",
    faq: [["How accurate are body fat calipers?", "Within about 3–4% when done carefully by the same person each time — best for tracking change."], ["What is the 7-site skinfold test?", "Chest, abdomen, thigh, triceps, subscapular, suprailiac and midaxillary skinfolds, entered into the Jackson-Pollock 7-site formula."]],
  }),
  mk({
    slug: "skeletal-muscle-mass-calculator", title: "Skeletal Muscle Mass Calculator",
    meta: "Muscle Mass Calculator — Skeletal Muscle Mass & Percentage",
    desc: "Estimate your skeletal muscle mass in kg or lb and as a percentage of body weight (Lee equation), with your level and muscle-to-fat ratio.",
    inputs: [sex(), units(), num("age", "Age", 35, 18, 100, 1), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), dd("race", "Ethnicity (Used in the Equation)", ["White, Hispanic or other", "Asian", "Black / African American"], 0), num("bodyFat", "Body Fat % (Optional, for Muscle-to-Fat Ratio)", 0, 0, 69, 0.1)],
    results: [["sm", "Skeletal Muscle Mass (lb or kg)", "n", 1], ["pct", "Muscle Percentage of Body Weight", "n", 1], ["level", "Level (Typical Scale Ranges)", "t"], ["ratio", "Muscle-to-Fat Ratio", "n", 2], ["ratioNote", "Ratio", "t"], ["kg", "Skeletal Muscle Mass (kg)", "n", 1]],
    fn: C["skeletal-muscle-mass-calculator"], ex: { sex: 0, units: 0, age: 35, weight: 180, height: 70, race: 0, bodyFat: 20 },
    exText: (o) => `Example: a 35-year-old man, 5'10" and 180 lb → about ${o.sm} lb of skeletal muscle (${o.pct}% of body weight, ${String(o.level).toLowerCase()}).`,
    how: "Skeletal muscle is the muscle attached to your bones — the tissue you build by lifting. It's part of your lean mass (which also includes organs, bone and water), so it's always smaller than lean body mass.\n\nThe Lee equation estimates it from weight, height, age, sex and ethnicity; a bioimpedance scale or DEXA scan measures it more directly.",
    assume: "Lee et al. (2000, Am J Clin Nutr) anthropometric model: SM (kg) = 0.244 × weight + 7.80 × height (m) + 6.6 × sex (1 = male) − 0.098 × age + ethnicity (−1.2 Asian, +1.4 Black) − 3.3; standard error about 2.8 kg. Levels compare with Janssen et al. (2000) MRI data: men average 38.4% (normal 33.3–43.5%), women 30.6% (normal 25.1–36.1%).",
    faq: [["What is a good muscle mass percentage?", "About 33–43% of body weight for men and 25–36% for women is typical (averages 38% and 31%)."], ["Is muscle mass the same as lean body mass?", "No — lean mass includes organs, bone and water; skeletal muscle is about half of it."]],
  }),
  mk({
    slug: "muscular-potential-calculator", title: "Natural Muscular Potential Calculator",
    meta: "Natural Muscular Potential Calculator — Casey Butt, FFMI & Berkhan",
    desc: "Estimate your maximum natural muscle — lean mass and body weight at a target body fat, plus maximum arm, chest and leg measurements — with the Casey Butt, Berkhan and FFMI-25 methods.",
    inputs: [units(), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), num("wrist", "Wrist (smallest point)", 7, 3, 30, 0.05), num("ankle", "Ankle (smallest point)", 9, 4, 40, 0.05), num("targetBf", "Target Body Fat %", 10, 3, 29, 0.5), num("weight", "Current Weight (Optional)", 0, 0, 800, 0.1), num("bodyFat", "Current Body Fat % (Optional)", 0, 0, 69, 0.1)],
    results: [["maxLbm", "Max Lean Mass — Casey Butt (lb or kg)", "n", 1], ["maxWeight", "Max Body Weight at Target Body Fat", "n", 1], ["ffmi", "Lean Mass at FFMI 25 (Natural Limit)", "n", 1], ["berkhan", "Berkhan Max Stage Weight (~5% Body Fat)", "n", 1], ["measures", "Max Measurements (Casey Butt)", "t"], ["reached", "Potential Reached So Far (%)", "n", 1]],
    fn: C["muscular-potential-calculator"], ex: { units: 0, height: 70, wrist: 7, ankle: 9, targetBf: 10, weight: 175, bodyFat: 15 },
    exText: (o) => `Example: 5'10" with a 7" wrist and 9" ankle → about ${o.maxLbm} lb of lean mass at most, or ${o.maxWeight} lb at 10% body fat; at 175 lb and 15% you'd be at ${o.reached}% of that.`,
    how: "Bone structure sets how much muscle a drug-free lifter can carry. Casey Butt's formulas (from champion natural bodybuilders) use height, wrist and ankle size. The FFMI-25 method uses the observation that natural lifters rarely exceed a normalized fat-free mass index of 25, and Martin Berkhan's rule is height in cm minus 100 = max stage weight in kg.\n\nMost people reach 80–90% of these numbers after 5–10 years of consistent training.",
    assume: "Casey Butt: max LBM (lb) = H^1.5 × (√wrist ÷ 22.667 + √ankle ÷ 17.0104) × (BF% ÷ 224 + 1), inches; measurements at about 6–10% body fat. FFMI normalized = FFMI + 6.1 × (1.8 − height m). These are estimates of an upper limit, not targets.",
    faq: [["How much muscle can I build naturally?", "Most men can add 20–25 kg (45–55 lb) of lean mass over many years; your frame sets the ceiling."], ["What is the natural FFMI limit?", "About 25 — scores above that are rare without performance-enhancing drugs."]],
  }),
  mk({
    slug: "golden-ratio-physique-calculator", title: "Golden Ratio Physique Calculator",
    meta: "Golden Ratio Body Calculator — Shoulder to Waist (Adonis Index)",
    desc: "Calculate your shoulder-to-waist ratio (Adonis index) against the golden ratio 1.618, the shoulder size you need, and the McCallum 'Grecian ideal' measurements from your wrist.",
    inputs: [units(), num("shoulders", "Shoulder Circumference (around the widest point)", 50, 10, 120, 0.1), num("waist", "Waist (at the navel)", 32, 10, 100, 0.1), num("wrist", "Wrist (Optional, for Ideal Measurements)", 7, 0, 30, 0.05)],
    results: [["ratio", "Shoulder-to-Waist Ratio", "n", 2], ["ideal", "Golden-Ratio Shoulders for Your Waist", "n", 1], ["gap", "Shoulders to Add", "n", 1], ["rating", "Rating", "t"], ["waistFor", "Golden-Ratio Waist for Your Shoulders", "n", 1], ["mccallum", "McCallum Ideal Measurements", "t"]],
    fn: C["golden-ratio-physique-calculator"], ex: { units: 0, shoulders: 50, waist: 32, wrist: 7 },
    exText: (o) => `Example: 50" shoulders and a 32" waist → a ratio of ${o.ratio}; golden-ratio shoulders for that waist would be ${o.ideal}".`,
    how: "Measure around your shoulders at the widest point (arms relaxed) and your waist at the navel. Dividing shoulders by waist gives the 'Adonis index' — classical sculptures and many physique coaches aim for about 1.618.\n\nJohn McCallum's Grecian ideal starts from the wrist: chest = 6.5 × wrist, waist 70% of chest, hips 85%, neck 37%, biceps 36%, thigh 53%, calf 34% and forearm 29%.",
    assume: "Aesthetic guidelines only — there's no health standard for these ratios, and genetics (clavicle width, hip structure) limit what training can change.",
    faq: [["What is the golden ratio for a male body?", "Shoulders about 1.618 times the waist circumference."], ["How can I improve my shoulder-to-waist ratio?", "Build side delts and lats and lose belly fat."]],
  }),
  mk({
    slug: "body-fat-goal-calculator", title: "Body Fat Goal Calculator",
    meta: "Body Fat Goal Calculator — Target Weight at a Body Fat %",
    desc: "Find the weight you'd be at a goal body fat percentage if you keep your lean mass — how much fat to lose, how long it takes and the daily deficit needed.",
    inputs: [units(), num("weight", "Current Weight (lb or kg)", 200, 25, 800, 0.1), num("bodyFat", "Current Body Fat %", 28, 3, 69, 0.1), num("goalBf", "Goal Body Fat %", 20, 3, 69, 0.1), num("rate", "Fat Loss per Week (lb or kg)", 1, 0, 5, 0.1)],
    results: [["target", "Goal Weight at That Body Fat", "n", 1], ["lose", "Fat to Lose", "n", 1], ["lean", "Lean Mass (Kept)", "n", 1], ["fatNow", "Fat Mass Now", "n", 1], ["fatGoal", "Fat Mass at Goal", "n", 1], ["weeks", "Weeks at Your Rate", "n", 1], ["deficit", "Daily Deficit for That Rate (kcal)", "n", 0]],
    fn: C["body-fat-goal-calculator"], ex: { units: 0, weight: 200, bodyFat: 28, goalBf: 20, rate: 1 },
    exText: (o) => `Example: 200 lb at 28% body fat → ${o.target} lb at 20% if you keep your ${o.lean} lb of lean mass; that's ${o.lose} lb of fat, about ${o.weeks} weeks at 1 lb a week.`,
    how: "Your lean mass (everything that isn't fat) stays roughly the same if you eat enough protein and lift weights. Goal weight = lean mass ÷ (1 − goal body fat). The difference from today's weight is the fat you need to lose.\n\nTo see abs, men usually need about 10–12% and women 16–19% body fat.",
    assume: "Assumes all weight lost is fat. In practice some lean mass and water change too, so re-measure body fat every few weeks. 3,500 kcal ≈ 1 lb (7,700 kcal ≈ 1 kg).",
    faq: [["How do I calculate my goal weight from body fat?", "Lean mass ÷ (1 − goal body fat as a decimal)."], ["What body fat percentage shows abs?", "Around 10–12% for men and 16–19% for women."]],
  }),
  mk({
    slug: "visceral-fat-calculator", title: "Visceral Fat Calculator",
    meta: "Visceral Fat Calculator — Visceral Adiposity Index & Waist Risk",
    desc: "Estimate visceral (belly) fat risk from your waist size and, with blood test results, the Visceral Adiposity Index (VAI) — with the age-specific cut-off for men and women.",
    inputs: [sex(), num("age", "Age", 45, 18, 100, 1), units(), num("weight", "Weight (lb or kg)", 200, 25, 800, 0.1), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), num("waist", "Waist (inches or cm)", 38, 10, 100, 0.1), dd("labUnit", "Blood Test Units", ["mg/dL (US)", "mmol/L"], 0), num("tg", "Triglycerides (Optional, 0 = Unknown)", 150, 0, 2000, 0.1), num("hdl", "HDL Cholesterol (Optional, 0 = Unknown)", 45, 0, 200, 0.1)],
    results: [["vai", "Visceral Adiposity Index (VAI)", "n", 2], ["status", "VAI Result", "t"], ["waistRisk", "Waist-Size Risk", "t"], ["whtr", "Waist-to-Height Ratio", "n", 2], ["bmi", "BMI", "n", 1]],
    fn: C["visceral-fat-calculator"], ex: { sex: 0, age: 45, units: 0, weight: 200, height: 70, waist: 38, labUnit: 0, tg: 150, hdl: 45 },
    exText: (o) => `Example: a 45-year-old man, 200 lb with a 38" waist, triglycerides 150 and HDL 45 mg/dL → VAI ${o.vai}: ${String(o.status).split(" —")[0].toLowerCase()}.`,
    how: "Visceral fat sits around your organs and drives heart and metabolic risk. Only a scan can measure it, but two signs point to it: a large waist, and a blood-fat pattern of high triglycerides with low HDL. The Visceral Adiposity Index combines both with your BMI.\n\nWithout blood results, use the waist-size risk and waist-to-height ratio.",
    assume: `VAI (Amato et al. 2010): men (WC ÷ (39.68 + 1.88 × BMI)) × (TG ÷ 1.03) × (1.31 ÷ HDL); women (WC ÷ (36.58 + 1.89 × BMI)) × (TG ÷ 0.81) × (1.52 ÷ HDL); TG and HDL in mmol/L. Age cut-offs (Amato 2011): <30 y 2.52, 30–41 2.23, 42–51 1.92, 52–65 1.93, 66+ 2.00. Waist cut-offs: WHO 102/88 cm, IDF 94/80 cm (men/women). ${HEALTH}`,
    faq: [["How can I tell if I have visceral fat?", "A waist over 40 in (men) or 35 in (women), or high triglycerides with low HDL, are strong signs."], ["What is a normal visceral adiposity index?", "Below about 1.9–2.5 depending on age."]],
  }),
  mk({
    slug: "metabolic-age-calculator", title: "Metabolic Age Calculator",
    desc: "Estimate your metabolic age — how your resting metabolism, based on your lean mass, compares with what's expected for your age, sex and size.",
    inputs: [sex(), num("age", "Age", 40, 18, 100, 1), units(), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), num("bodyFat", "Body Fat %", 18, 3, 69, 0.1)],
    results: [["meta", "Metabolic Age", "n", 0], ["diff", "Difference From Your Age (years)", "n", 0], ["verdict", "What It Means", "t"], ["actual", "Your BMR From Lean Mass (kcal)", "n", 0], ["expected", "BMR at Average Body Fat for Your Age (kcal)", "n", 0], ["typical", "Average Body Fat Used for Comparison (%)", "n", 1]],
    fn: C["metabolic-age-calculator"], ex: { sex: 0, age: 40, units: 0, weight: 180, height: 70, bodyFat: 18 },
    exText: (o) => `Example: a 40-year-old man, 5'10", 180 lb at 18% body fat → a metabolic age of about ${o.meta} (${String(o.verdict).split(" —")[0].toLowerCase()}).`,
    how: "Your resting metabolism depends mostly on your lean mass. The calculator works out your BMR from your lean mass (Katch-McArdle) and compares it with the BMR you'd have at the average body fat for your age and sex. Every 5 kcal of difference counts as one year, because that's how much BMR typically falls per year of age (Mifflin-St Jeor).\n\nSmart scales show a similar number using their own (unpublished) formulas, so results can differ.",
    assume: "An indicator for motivation, not a medical measure. More muscle and less fat lower your metabolic age.",
    faq: [["What is metabolic age?", "A comparison of your BMR with the average BMR of people your age — lower means a 'younger' metabolism."], ["How can I lower my metabolic age?", "Build muscle with strength training and reduce body fat."]],
  }),
  mk({
    slug: "fitness-age-calculator", title: "Fitness Age Calculator",
    meta: "Fitness Age Calculator — How Fit Am I for My Age?",
    desc: "Find your fitness age — the age at which your aerobic fitness (VO2 max) is average — from a known VO2 max or an estimate from age, BMI, resting heart rate and activity.",
    inputs: [sex(), num("age", "Age", 45, 18, 100, 1), num("vo2", "Your VO2 Max if Known (0 = Estimate)", 0, 0, 90, 0.1), units(), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("height", "Height (inches or cm)", 70, 48, 250, 0.1), num("rhr", "Resting Heart Rate (bpm)", 65, 30, 120, 1), dd("activity", "Usual Activity", ["Inactive", "Light activity (walking, gardening)", "Moderate exercise 30–60 min a week", "Moderate exercise 1–3 h a week", "Vigorous exercise 3+ h a week"], 2)],
    results: [["fitAge", "Your Fitness Age", "n", 0], ["diff", "Difference From Your Age (years)", "n", 0], ["verdict", "Rating", "t"], ["vo2", "VO2 Max Used (ml/kg/min)", "n", 1], ["source", "VO2 Max Source", "t"]],
    fn: C["fitness-age-calculator"], ex: { sex: 0, age: 45, vo2: 0, units: 0, weight: 180, height: 70, rhr: 65, activity: 2 },
    exText: (o) => `Example: a 45-year-old man, 180 lb at 5'10", resting heart rate 65 and moderately active → estimated VO2 max ${o.vo2} and a fitness age of about ${o.fitAge}.`,
    how: "Aerobic fitness (VO2 max) is one of the strongest predictors of long-term health. The calculator finds the age at which your VO2 max would be exactly average, using the FRIEND registry of thousands of US treadmill tests.\n\nIf you have a VO2 max from a lab test or a sports watch, enter it. Otherwise it's estimated from your age, BMI, resting heart rate and activity level.",
    assume: "Non-exercise VO2 max: Jurca et al. (2005) — METs = 18.07 + 2.77 (male) − 0.10 × age − 0.17 × BMI − 0.03 × resting HR + activity (0 / 0.32 / 1.06 / 1.76 / 3.03), × 3.5. Reference medians: FRIEND registry (Kaminsky et al. 2015), interpolated by decade. Estimates are ±5 ml/kg/min.",
    faq: [["What is fitness age?", "The age at which your VO2 max would be average — if it's lower than your real age, you're fitter than average."], ["How can I lower my fitness age?", "Regular cardio, especially some high-intensity intervals, raises VO2 max at any age."]],
  }),
  mk({
    slug: "calories-burned-heart-rate-calculator", title: "Calories Burned by Heart Rate Calculator",
    desc: "Calculate calories burned during exercise from your average heart rate, age, weight, sex and workout time, using the Keytel heart-rate formula.",
    inputs: [sex(), num("age", "Age", 35, 13, 100, 1), units(), num("weight", "Weight (lb or kg)", 180, 25, 800, 0.1), num("hr", "Average Heart Rate (bpm)", 140, 60, 220, 1), num("minutes", "Workout Time (minutes)", 45, 1, 1000, 1)],
    results: [["total", "Calories Burned", "n", 0], ["perMin", "Calories per Minute", "n", 1], ["perHour", "Calories per Hour", "n", 0], ["note", "Accuracy", "t"]],
    fn: C["calories-burned-heart-rate-calculator"], ex: { sex: 0, age: 35, units: 0, weight: 180, hr: 140, minutes: 45 },
    exText: (o) => `Example: a 35-year-old, 180 lb man averaging 140 bpm for 45 minutes burns about ${o.total} kcal (${o.perMin} per minute).`,
    how: "Heart rate rises with the oxygen your muscles use, so it tracks calorie burn well during steady cardio. Take your average heart rate from a chest strap or watch for the session.\n\nHeart-rate formulas overestimate for very short intervals, in hot weather and with caffeine, and underestimate for very fit people.",
    assume: "Keytel et al. (2005): men kcal/min = (−55.0969 + 0.6309 × HR + 0.1988 × kg + 0.2017 × age) ÷ 4.184; women = (−20.4022 + 0.4472 × HR − 0.1263 × kg + 0.074 × age) ÷ 4.184.",
    faq: [["How do I calculate calories burned from heart rate?", "Use the Keytel formula with your average heart rate, age, weight and minutes."], ["Are watch calorie counts accurate?", "Within about 20–30% for most workouts; chest straps are more accurate than wrist sensors."]],
  }),
  mk({
    slug: "smolov-calculator", title: "Smolov Calculator",
    meta: "Smolov & Smolov Jr. Calculator — Squat & Bench Program Weights",
    desc: "Calculate the weights for Smolov Jr. (3 weeks) or the Smolov base mesocycle from your one-rep max — every day's sets, reps and load, rounded to your plates.",
    inputs: [dd("program", "Program", ["Smolov Jr. (3 weeks, squat or bench)", "Smolov base mesocycle (squat)"], 0), units(), num("oneRm", "Current 1RM (lb or kg)", 300, 20, 2000, 0.5), num("increment", "Weekly Increase for Smolov Jr. (lb or kg)", 10, 0, 50, 0.5)],
    results: [["top", "Heaviest Weight (Final Week, 10×3)", "n", 1], ["w1", "Week 1 (Mon · Wed · Fri · Sat)", "t"], ["w2", "Week 2", "t"], ["w3", "Week 3", "t"], ["after", "After the Program", "t"], ["unit", "Unit", "t"]],
    fn: C["smolov-calculator"], ex: { program: 0, units: 0, oneRm: 300, increment: 10 },
    exText: (o) => `Example: Smolov Jr. with a 300 lb 1RM — week 1 is ${o.w1}; the heaviest day is 10×3 at ${o.top} lb in week 3.`,
    how: "Smolov Jr. runs four sessions a week for three weeks: 6×6 at 70%, 7×5 at 75%, 8×4 at 80% and 10×3 at 85% of your max, adding 5–10 lb (2.5–5 kg) each week — less for bench press. The Smolov base mesocycle (weeks 3–6 of full Smolov) uses 4×9, 5×7, 7×5 and 10×3, adding 20 lb then 30 lb.\n\nBoth are very demanding: run them only with good technique, enough sleep and food, and drop the program if joints start to hurt.",
    assume: "Percentages from Sergey Smolov's published program; weights rounded to 5 lb or 2.5 kg. The base mesocycle's weekly additions are the standard +20 lb / +30 lb (≈ +10 / +15 kg).",
    faq: [["How much can you gain on Smolov Jr.?", "Commonly 5–10% on the lift — often 10–30 lb on the squat."], ["Can I do Smolov Jr. for bench?", "Yes, with smaller weekly increases (about 2.5–5 lb)."]],
  }),
  mk({
    slug: "dumbbell-to-barbell-calculator", title: "Dumbbell to Barbell Bench Calculator",
    meta: "Dumbbell to Barbell Bench Press Converter",
    desc: "Convert dumbbell bench press weight to the barbell equivalent (or barbell to dumbbells), with the estimated barbell and dumbbell one-rep max.",
    inputs: [dd("direction", "Convert", ["Dumbbells → barbell", "Barbell → dumbbells"], 0), num("weight", "Weight (each dumbbell, or the barbell)", 60, 1, 1500, 0.5), num("reps", "Reps Done", 8, 1, 30, 1)],
    results: [["result", "Equivalent Weight", "n", 0], ["bar", "Barbell Weight", "n", 0], ["db", "Each Dumbbell", "n", 0], ["oneRm", "Estimated Barbell 1RM", "n", 0], ["dbRm", "Estimated Dumbbell 1RM (each)", "n", 0], ["how", "Rule Used", "t"]],
    fn: C["dumbbell-to-barbell-calculator"], ex: { direction: 0, weight: 60, reps: 8 },
    exText: (o) => `Example: pressing two 60 lb dumbbells for 8 reps ≈ a ${o.bar} lb barbell bench for 8 (estimated barbell 1RM ${o.oneRm} lb).`,
    how: "Dumbbells need more stabilizing, so most lifters press about 80% of their barbell weight in total across both dumbbells — each dumbbell is about 40% of the bar. The same rule works roughly for incline and shoulder presses.\n\nUse any unit (lb or kg); the result is in the same unit.",
    assume: "Barbell ≈ 2 × dumbbell ÷ 0.8 (individual ratios run 75–90%). 1RM by the Epley formula: weight × (1 + reps ÷ 30).",
    faq: [["Is dumbbell bench harder than barbell?", "Yes — most people handle about 80% of their barbell weight in total with dumbbells."], ["What barbell bench equals 50 lb dumbbells?", "About 125 lb."]],
  }),
  mk({
    slug: "leg-press-to-squat-calculator", title: "Leg Press to Squat Calculator",
    desc: "Estimate your squat from your leg press — allowing for a 45° sled, a vertical or horizontal machine, the sled weight and the body weight a squat also lifts.",
    inputs: [dd("machine", "Machine", ["45° leg press sled", "Vertical leg press", "Horizontal / seated (plate or cable)"], 0), num("weight", "Plates / Stack Weight (lb or kg)", 500, 1, 3000, 1), num("sled", "Sled Weight (if not in the number above)", 0, 0, 300, 1), num("reps", "Reps Done", 8, 1, 30, 1), num("bodyweight", "Your Body Weight (same unit)", 180, 50, 800, 0.5)],
    results: [["squat", "Estimated Back Squat 1RM", "n", 0], ["lpMax", "Leg Press 1RM (incl. sled)", "n", 0], ["ratio", "Leg Press ÷ Squat", "n", 2], ["load", "Effective Load Along the Push", "n", 0]],
    fn: C["leg-press-to-squat-calculator"], ex: { machine: 0, weight: 500, sled: 0, reps: 8, bodyweight: 180 },
    exText: (o) => `Example: 500 lb for 8 reps on a 45° sled at 180 lb body weight → leg press 1RM ${o.lpMax} lb and an estimated squat of about ${o.squat} lb.`,
    how: "On a 45° sled you only push about 71% of the weight (sin 45°), and you don't lift your own body. A squat moves the bar plus most of your body weight and needs balance and core strength. The calculator converts your leg press 1RM to an equivalent squat with those differences.\n\nIt's a rough estimate — machines vary a lot in friction and sled weight.",
    assume: "Effective load = leg press 1RM × sin(angle) (vertical and horizontal = 1). Squat = (effective load − 0.85 × body weight) × 0.9 stability factor. 1RM from the Epley formula.",
    faq: [["How does leg press compare to squat?", "Most people leg press 2–3 times their squat on a 45° sled."], ["How much does a leg press sled weigh?", "Often 75–120 lb (35–55 kg); check the machine's label."]],
  }),
];

export const FIT_BODY: [string, ToolDef[]][] = [["sports-performance-calculators", BODY]];

async function main() {
  const all = FIT_BODY.flatMap(([, t]) => t);
  if (new Set(all.map((t) => t.slug)).size !== all.length) throw new Error("Duplicate slug in batch");
  if (process.env.FIT_DRY) { console.log(`DRY RUN OK: ${all.length} tool definitions`); return; }
  for (const [cat, tools] of FIT_BODY) await upsertTools(cat, tools);
}
main().catch((e) => { console.error(e); process.exit(1); });
