// One-time (but safe to re-run) batch setup script: creates 10 military body composition,
// fitness and promotion-timing calculators (Law & Government Calculators > Military & Veterans
// Calculators). Formulas and standards live in src/lib/calc-engine-law-mil-fit.ts; the
// examples below are computed from that engine so they always match the calculator.
// Merged keywords (covered here, no separate page): Army Waist-to-Height, Army Body MASS,
// AR 600-9, DA Form 5500 → army-body-fat; Army H&W / HTWT, New Height and Weight, Military
// Height and Weight / Military Weight → army-height-weight; USMC Tape / Taping, Body Fat
// Calculator USMC → usmc-body-fat; Military Body Fat / Military Fat, Coast Guard Body Fat →
// military-body-fat; Air Force / USAF Waist-to-Height (and Weight-to-Height) Ratio, Air Force
// Body Composition → air-force-body-composition; BMI Calculator Military / Air Force / Naval /
// USMC / Marine Corps BMI → military-bmi; Navy SEAL Calculator / SEAL Fitness Test →
// navy-seal-pst; Senior Airman, A1C to SRA (incl. 6-year enlistment), SRA Promotion / Rank,
// When Do I Put on SRA, Below the Zone, Air Force Promotion Eligibility → btz; RSCA → navy-rsca.
//
// HOW TO RUN (after prisma/setup-law-government-category.ts --apply)
//   npx tsx prisma/create-law-mil-fit-calculators.ts
// or
//   npm run db:create-law-mil-fit-calculators

import * as E from "../src/lib/calc-engine-law-mil-fit";

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(key: string, label: string, opts: { unit?: string; default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "number", unit: opts.unit, required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 1000, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

interface ToolDef {
  slug: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  calcInputs: Record<string, unknown>[];
  calcResult: { label: string; unit?: string; format: string; currency?: string; decimals?: number };
  calcResults: Record<string, unknown>[];
  instructions: string;
  examples: string;
  assumptions: string;
  faq: { question: string; answer: string }[];
}

const CAT = "military-veterans-calculators";
const DISCLAIMER = "Estimates only — the official measurement by trained, same-sex personnel (and your service's current regulation or MARADMIN/ALARACT) decides. Not affiliated with the Department of Defense.";

const r = (fn: E.CustomCalculator, v: Record<string, number>) => fn(v) as Record<string, number>;
const SEX: [string, number][] = [["Male", 0], ["Female", 1]];
const inches = (key: string, label: string, def: number, max = 80) => numberField(key, label, { default: def, min: 0, max, step: 0.5, unit: "in" });
const HEIGHT = numberField("heightInches", "Height (inches, in stocking feet)", { default: 70, min: 48, max: 90, step: 0.5, unit: "in" });
const WEIGHT = numberField("weight", "Weight (pounds)", { default: 190, min: 70, max: 400, unit: "lb" });
const AGE = numberField("age", "Age", { default: 25, min: 17, max: 65, unit: "years" });

const exArmy = r(E.armyBodyFat, { sex: 0, age: 25, weight: 190, abdomen: 36, aftScore: 0 });
const exHw = r(E.armyHeightWeight, { sex: 0, heightInches: 70, age: 25, weight: 190 });
const exUsmc = r(E.usmcBodyFat, { sex: 0, age: 25, heightInches: 70, neck: 16, waist: 34, hips: 0 });
const exMil = r(E.militaryBodyFat, { sex: 1, heightInches: 65, weight: 150, neck: 13, waist: 30, hips: 39 });
const exAf = r(E.airForceBodyComposition, { heightInches: 70, waist: 37 });
const exBmi = r(E.militaryBmi, { heightInches: 70, weight: 190 });
const exPst = r(E.sealPst, { swimMinutes: 10, swimSeconds: 15, pushups: 85, situps: 82, pullups: 14, runMinutes: 9, runSeconds: 45 });
const exBtz = r(E.btzSra, { monthsTimeInService: 18, monthsTimeInGradeA1C: 8 });
const exOsb = r(E.overseasServiceBars, { monthsHostileArea: 20 });
const exRsca = r(E.navyRsca, { sumOfTraitAverages: 40.6, numberOfReports: 10, memberTraitAverage: 4.29 });

const TOOLS: ToolDef[] = [
  {
    slug: "army-body-fat-calculator",
    title: "Army Body Fat Calculator (One-Site Tape)",
    description: "Calculate your Army body fat with the AR 600-9 one-site abdominal tape test and check it against the maximum for your age and sex — including the AFT 465+ exemption.",
    metaTitle: "Army Body Fat Calculator — AR 600-9 One-Site Tape Test",
    metaDescription: "Free Army body fat calculator using the one-site tape (weight + abdomen). Compare with AR 600-9 standards by age and see if you pass.",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 0),
      AGE,
      WEIGHT,
      inches("abdomen", "Abdominal Circumference at the Navel (inches)", 36, 70),
      numberField("aftScore", "Army Fitness Test (AFT) Total Score (0 if unknown)", { default: 0, max: 600 }),
    ],
    calcResult: { label: "Body Fat", unit: "%", format: "number" },
    calcResults: [
      { key: "bodyFatPercent", label: "Body Fat (%)", format: "number", highlight: true },
      { key: "maximumAllowed", label: "Maximum Allowed (%)", format: "number" },
      { key: "meetsStandard", label: "Meets the Standard? (1 = yes)", format: "number" },
      { key: "percentOverStandard", label: "Points Over the Standard", format: "number" },
      { key: "fatMassLb", label: "Fat Mass (lb)", format: "number" },
      { key: "exemptByAftScore", label: "Exempt by AFT 465+ (1 = yes)", format: "number" },
    ],
    instructions: "Enter your weight and the abdominal circumference measured at the level of the navel (the average of three measurements, rounded down to the nearest half inch). Add your AFT score if you have one — 465 or more with at least 80 points per event exempts you from the body fat standard.",
    examples: `Example: a 25-year-old man weighing 190 lb with a 36-inch abdomen is about ${exArmy.bodyFatPercent}% body fat — within the ${exArmy.maximumAllowed}% maximum for ages 21–27.`,
    assumptions: `One-site equations (Army Directive 2023-11): men −26.97 − 0.12 × weight + 1.99 × abdomen; women −9.15 − 0.015 × weight + 1.27 × abdomen; result rounded to a whole percent. Maximums (AR 600-9): men 20/22/24/26%, women 30/32/34/36% for ages 17–20, 21–27, 28–39 and 40+. Soldiers who fail the tape can request a supplemental assessment (InBody or DEXA) where available. ${DISCLAIMER}`,
    faq: [
      { question: "What is the Army one-site tape test?", answer: "Since June 2024 the Army estimates body fat from only your weight and one waist measurement at the navel, for both men and women." },
      { question: "Who is exempt from the Army tape test?", answer: "Soldiers who score 465 or more on the AFT with at least 80 points in each event." },
    ],
  },
  {
    slug: "army-height-weight-calculator",
    title: "Army Height and Weight Calculator",
    description: "Check the Army height and weight screening table (AR 600-9) — the maximum weight for your height, age and sex, and whether you'll need to be taped.",
    metaTitle: "Army Height and Weight Calculator — AR 600-9 Screening Table",
    metaDescription: "Free Army height and weight calculator. See the AR 600-9 screening table weight for your height, age and sex, the minimum weight and pounds over.",
    calcInputs: [dropdown("sex", "Sex", SEX, 0), HEIGHT, AGE, WEIGHT],
    calcResult: { label: "Maximum Screening Weight", unit: "lb", format: "number" },
    calcResults: [
      { key: "maximumScreeningWeight", label: "Maximum Screening Weight (lb)", format: "number", highlight: true },
      { key: "minimumWeight", label: "Minimum Weight (lb)", format: "number" },
      { key: "poundsOverScreening", label: "Pounds Over the Screening Weight", format: "number" },
      { key: "withinScreeningWeight", label: "Within the Screening Table? (1 = yes)", format: "number" },
      { key: "personalGoalWeight", label: "Suggested Goal (5% under the max, lb)", format: "number" },
    ],
    instructions: "Enter your height in stocking feet (a fraction of ½ inch or more rounds up), your age and your weight in PT uniform. If you're over the screening weight you'll be taped — use the Army Body Fat Calculator to check that too.",
    examples: `Example: a 25-year-old man who is 70 inches tall can weigh up to ${exHw.maximumScreeningWeight} lb; at 190 lb he's ${exHw.poundsOverScreening} lb over and would be taped.`,
    assumptions: `AR 600-9 Table 3-1 screening weights for 58–80 inches (add 6 lb per inch over 80 for men, 5 lb for women). Being over the screening weight isn't a failure — it means body fat is measured. Soldiers below the minimum weight are referred for a medical evaluation. ${DISCLAIMER}`,
    faq: [
      { question: "What happens if I'm over the Army weight limit?", answer: "You're taped. If your body fat is within the standard for your age, you pass." },
      { question: "Is the Army height and weight chart the same for enlistment?", answer: "Accession standards are set separately (DoDI 6130.03 and AR 40-501) and can differ slightly." },
    ],
  },
  {
    slug: "usmc-body-fat-calculator",
    title: "USMC Body Fat Calculator (Marine Tape Test)",
    description: "Estimate your Marine Corps body fat with the DoD circumference (tape) method — neck and waist for men, neck, waist and hips for women — and compare it with the USMC maximum for your age.",
    metaTitle: "USMC Body Fat Calculator — Marine Corps Tape Test",
    metaDescription: "Free Marine Corps body fat calculator. DoD tape equations and USMC body fat maximums by age (men 18–21%, women 26–29%).",
    calcInputs: [
      dropdown("sex", "Sex", SEX, 0),
      AGE,
      HEIGHT,
      inches("neck", "Neck (inches)", 16, 30),
      inches("waist", "Waist — men at the navel, women at the narrowest point (inches)", 34, 70),
      inches("hips", "Hips — women only (inches)", 0, 70),
    ],
    calcResult: { label: "Body Fat", unit: "%", format: "number" },
    calcResults: [
      { key: "bodyFatPercent", label: "Body Fat (%)", format: "number", highlight: true },
      { key: "maximumAllowed", label: "USMC Maximum (%)", format: "number" },
      { key: "meetsStandard", label: "Meets the Standard? (1 = yes)", format: "number" },
      { key: "percentOverStandard", label: "Points Over the Standard", format: "number" },
      { key: "waistToHeightRatio", label: "Waist-to-Height Ratio", format: "number" },
    ],
    instructions: "Enter your height and tape measurements in inches (each the average of three, neck rounded up and waist/hips rounded down to the nearest half inch). Women add the hip measurement at the widest point of the buttocks.",
    examples: `Example: a 25-year-old male Marine, 70 inches with a 16-inch neck and 34-inch waist, is about ${exUsmc.bodyFatPercent}% body fat — the maximum for ages 17–26 is ${exUsmc.maximumAllowed}%.`,
    assumptions: `DoD equations: men 86.010·log10(waist − neck) − 70.041·log10(height) + 36.76; women 163.205·log10(waist + hip − neck) − 97.684·log10(height) − 78.387. USMC maximums (MCO 6110.3A): men 18/19/20/21%, women 26/27/28/29% for ages 17–26, 27–39, 40–45 and 46+. High PFT/CFT scores can extend the allowance, and the Marine Corps has been moving to waist-to-height screening — check the current MARADMIN. ${DISCLAIMER}`,
    faq: [
      { question: "How does the Marine Corps tape test work?", answer: "Marines over the height/weight screening are taped at the neck and waist (plus hips for women), and body fat is calculated with the DoD equations." },
      { question: "Do high PFT scores help with body fat?", answer: "Yes — Marines with first-class PFT/CFT scores get extra allowance under the body composition program." },
    ],
  },
  {
    slug: "military-body-fat-calculator",
    title: "Military Body Fat Calculator (All Services)",
    description: "Estimate military body fat with both tape methods — the DoD circumference equations used by the Navy, Marine Corps, Air Force and Coast Guard, and the Army's one-site test — plus lean and fat mass.",
    metaTitle: "Military Body Fat Calculator — DoD Tape & Army One-Site",
    metaDescription: "Free military body fat calculator. Compare the DoD circumference method and the Army one-site tape, with fat mass, lean mass and waist-to-height ratio.",
    calcInputs: [dropdown("sex", "Sex", SEX, 1), HEIGHT, WEIGHT, inches("neck", "Neck (inches)", 13, 30), inches("waist", "Waist / Abdomen at the Navel (inches)", 30, 70), inches("hips", "Hips — women only (inches)", 39, 70)],
    calcResult: { label: "DoD Tape Body Fat", unit: "%", format: "number" },
    calcResults: [
      { key: "dodTapeBodyFat", label: "DoD Tape Body Fat (%)", format: "number", highlight: true },
      { key: "armyOneSiteBodyFat", label: "Army One-Site Body Fat (%)", format: "number" },
      { key: "leanMassLb", label: "Lean Mass (lb)", format: "number" },
      { key: "fatMassLb", label: "Fat Mass (lb)", format: "number" },
      { key: "waistToHeightRatio", label: "Waist-to-Height Ratio", format: "number" },
    ],
    instructions: "Enter your height, weight and tape measurements. The DoD method is used by the Navy, Marine Corps, Coast Guard and (when taping) the Air Force; the Army uses the one-site formula from weight and abdomen only.",
    examples: `Example: a woman 65 inches tall, 150 lb, with a 13-inch neck, 30-inch waist and 39-inch hips is about ${exMil.dodTapeBodyFat}% by the DoD tape and ${exMil.armyOneSiteBodyFat}% by the Army one-site method.`,
    assumptions: `DoD circumference equations and the Army one-site equations (Army Directive 2023-11). Each service sets its own maximums by age and sex — compare your result with your service's standard. Tape estimates can differ from DEXA or InBody results by several points. ${DISCLAIMER}`,
    faq: [
      { question: "Why do the two methods give different results?", answer: "They're different regression equations — the DoD method uses neck, waist (and hips) and height; the Army one-site method uses weight and abdomen." },
      { question: "Which method does the Coast Guard use?", answer: "The Coast Guard uses the DoD circumference method when a member is over the screening weight." },
    ],
  },
  {
    slug: "air-force-body-composition-calculator",
    title: "Air Force Waist-to-Height Ratio Calculator",
    description: "Check the Air Force and Space Force body composition standard — your waist-to-height ratio must be below 0.55 — and see the waist size you need to pass.",
    metaTitle: "Air Force Waist-to-Height Ratio Calculator — Body Composition",
    metaDescription: "Free Air Force WHtR calculator. Divide waist by height, check the 0.55 pass line and see your waist limit for the DAF body composition assessment.",
    calcInputs: [HEIGHT, inches("waist", "Waist at the Top of the Hip Bone (inches)", 37, 70)],
    calcResult: { label: "Waist-to-Height Ratio", format: "number" },
    calcResults: [
      { key: "waistToHeightRatio", label: "Waist-to-Height Ratio", format: "number", highlight: true },
      { key: "passes", label: "Passes (below 0.55)? (1 = yes)", format: "number" },
      { key: "waistLimit", label: "Waist Limit — Stay Under (in)", format: "number" },
      { key: "inchesOverLimit", label: "Inches Over the Limit", format: "number" },
      { key: "healthRisk", label: "Risk Level (0 low, 1 moderate, 2 high)", format: "number" },
    ],
    instructions: "Measure your waist at the top of the hip bone (iliac crest) and your height in stocking feet, both in inches.",
    examples: `Example: 70 inches tall with a 37-inch waist gives a ratio of ${exAf.waistToHeightRatio} — ${exAf.passes ? "a pass" : "not a pass"}; to pass, keep the waist under ${exAf.waistLimit} inches.`,
    assumptions: `Department of the Air Force body composition assessment: waist-to-height ratio (waist ÷ height, truncated to two decimals) below 0.55 passes; under 0.50 is low risk. Members who fail may get a body fat assessment or enter the body composition improvement program. ${DISCLAIMER}`,
    faq: [
      { question: "What waist-to-height ratio does the Air Force require?", answer: "Below 0.55 — for example, under 38.5 inches for someone 70 inches tall." },
      { question: "Does the Air Force still tape?", answer: "The waist-to-height ratio replaced the old abdominal circumference test as the screening measure." },
    ],
  },
  {
    slug: "military-bmi-calculator",
    title: "Military BMI Calculator",
    description: "Calculate your BMI with your height in inches and weight in pounds, see your category, and the weights that match BMI 25 and 27.5 — the levels often used in military height-weight screening.",
    metaTitle: "Military BMI Calculator — Air Force, Navy & USMC Screening",
    metaDescription: "Free military BMI calculator. Get your BMI and the weights at BMI 25 and 27.5 used in service height-weight screening tables.",
    calcInputs: [HEIGHT, WEIGHT],
    calcResult: { label: "BMI", format: "number" },
    calcResults: [
      { key: "bmi", label: "BMI", format: "number", highlight: true },
      { key: "category", label: "Category (0 under, 1 normal, 2 overweight, 3 obese)", format: "number" },
      { key: "weightAtBmi25", label: "Weight at BMI 25 (lb)", format: "number" },
      { key: "weightAtBmi27_5", label: "Weight at BMI 27.5 (lb)", format: "number" },
      { key: "poundsOverBmi25", label: "Pounds Over BMI 25", format: "number" },
    ],
    instructions: "Enter your height in inches and weight in pounds. BMI doesn't decide pass or fail on its own — services use height-weight tables, then tape or waist-to-height checks.",
    examples: `Example: 70 inches and 190 lb is a BMI of ${exBmi.bmi}; BMI 25 at that height is ${exBmi.weightAtBmi25} lb and 27.5 is ${exBmi.weightAtBmi27_5} lb.`,
    assumptions: `BMI = 703 × weight (lb) ÷ height (in)². DoD screening tables roughly track BMI 25–27.5 depending on service and age; muscular members often exceed BMI limits and pass the tape. ${DISCLAIMER}`,
    faq: [
      { question: "Does the military use BMI?", answer: "Indirectly — the height-weight screening tables are built from BMI ranges, but members over them are measured for body fat or waist-to-height ratio." },
      { question: "What BMI do I need to join the military?", answer: "Enlistment uses each service's height-weight table; if you're over it you can still qualify on body fat." },
    ],
  },
  {
    slug: "navy-seal-pst-calculator",
    title: "Navy SEAL PST Calculator",
    description: "Score your Navy SEAL Physical Screening Test — 500-yard swim, push-ups, sit-ups, pull-ups and 1.5-mile run — against the minimum and competitive standards.",
    metaTitle: "Navy SEAL PST Calculator — Minimum & Competitive Scores",
    metaDescription: "Free SEAL PST calculator. Compare your swim, push-ups, sit-ups, pull-ups and run with the minimum and competitive BUD/S standards.",
    calcInputs: [
      numberField("swimMinutes", "500-Yard Swim — Minutes", { default: 10, max: 20 }),
      numberField("swimSeconds", "500-Yard Swim — Seconds", { default: 15, max: 59 }),
      numberField("pushups", "Push-ups (2 minutes)", { default: 85, max: 200 }),
      numberField("situps", "Sit-ups (2 minutes)", { default: 82, max: 200 }),
      numberField("pullups", "Pull-ups (no time limit)", { default: 14, max: 60 }),
      numberField("runMinutes", "1.5-Mile Run — Minutes", { default: 9, max: 20 }),
      numberField("runSeconds", "1.5-Mile Run — Seconds", { default: 45, max: 59 }),
    ],
    calcResult: { label: "Events at Competitive Level (of 5)", format: "number" },
    calcResults: [
      { key: "eventsAtCompetitiveLevel", label: "Events at Competitive Level (of 5)", format: "number", highlight: true },
      { key: "passesMinimums", label: "Meets All Minimums? (1 = yes)", format: "number" },
      { key: "eventsBelowMinimum", label: "Events Below Minimum", format: "number" },
      { key: "swimSecondsToCompetitive", label: "Swim Seconds to Cut", format: "number" },
      { key: "runSecondsToCompetitive", label: "Run Seconds to Cut", format: "number" },
    ],
    instructions: "Enter your results from a full practice PST done in order with the standard rest periods (10 minutes after the swim, 2 between calisthenics, 10 before the run).",
    examples: `Example: a 10:15 swim, 85 push-ups, 82 sit-ups, 14 pull-ups and a 9:45 run meet every minimum and reach the competitive level in ${exPst.eventsAtCompetitiveLevel} of 5 events.`,
    assumptions: "Minimums: swim 12:30, 50 push-ups, 50 sit-ups, 10 pull-ups, run 10:30. Competitive levels are the commonly cited scores of successful candidates (swim ≤ 9:30, 80+ push-ups and sit-ups, 15+ pull-ups, run ≤ 9:30); Naval Special Warfare recruiters may use different cut-offs. " + DISCLAIMER,
    faq: [
      { question: "What is a good SEAL PST score?", answer: "Competitive candidates typically swim under 9:30, do 80–100 push-ups and sit-ups, 15–20 pull-ups and run under 9:30." },
      { question: "Is the swim done with sidestroke?", answer: "Yes — combat sidestroke or breaststroke; freestyle isn't allowed." },
    ],
  },
  {
    slug: "btz-calculator",
    title: "BTZ & Senior Airman Promotion Calculator",
    description: "Work out when you'll pin on Senior Airman (SrA) and when you're eligible for Below-the-Zone (BTZ) — 36 months TIS with 20 months TIG, or 28 months TIG, whichever comes first.",
    metaTitle: "BTZ Calculator — Senior Airman Promotion Date (A1C to SrA)",
    metaDescription: "Free Air Force BTZ and SrA calculator. Enter time in service and time in grade as A1C to see months until Senior Airman and BTZ eligibility.",
    calcInputs: [
      numberField("monthsTimeInService", "Time in Service (months)", { default: 18, max: 72, unit: "months" }),
      numberField("monthsTimeInGradeA1C", "Time in Grade as A1C (months)", { default: 8, max: 48, unit: "months" }),
    ],
    calcResult: { label: "Months Until SrA", format: "number" },
    calcResults: [
      { key: "monthsUntilSra", label: "Months Until SrA", format: "number", highlight: true },
      { key: "monthsUntilBtzEligible", label: "Months Until BTZ Pin-On Window", format: "number" },
      { key: "sraTisAtPromotion", label: "TIS at SrA (months)", format: "number" },
      { key: "sraTigAtPromotion", label: "TIG at SrA (months)", format: "number" },
      { key: "alreadyEligible", label: "Already Eligible? (1 = yes)", format: "number" },
    ],
    instructions: "Enter your total active federal military service (TAFMS) and how long you've been an A1C, both in months as of today. Airmen who enlisted for 6 years usually start as A1C, so the 28-months-TIG rule often applies to them.",
    examples: `Example: 18 months TIS and 8 months as an A1C means SrA in ${exBtz.monthsUntilSra} months (at ${exBtz.sraTisAtPromotion} months TIS); if selected for BTZ, ${exBtz.monthsUntilBtzEligible} months.`,
    assumptions: "Air Force / Space Force SrA promotion: the earlier of 36 months TIS with 20 months TIG, or 28 months TIG; BTZ selectees are promoted 6 months earlier (selection is competitive, about 15% of eligibles). Promotion takes effect on the first day of the month, and lost time, demotions or Article 15s change the dates. " + DISCLAIMER,
    faq: [
      { question: "When do I make SrA?", answer: "At 36 months of service with 20 months as an A1C, or 28 months as an A1C — whichever comes first." },
      { question: "How does BTZ work?", answer: "A board selects a limited number of A1Cs to pin on Senior Airman 6 months early." },
    ],
  },
  {
    slug: "army-overseas-service-bar-calculator",
    title: "Army Overseas Service Bar Calculator",
    description: "Find how many Overseas Service Bars you've earned — one for each 6 months of service in a hostile fire pay area — and how long until your next bar.",
    metaTitle: "Army Overseas Service Bar Calculator — OSB per 6 Months",
    metaDescription: "Free Overseas Service Bar calculator. One bar per 6 months in a designated hostile area; enter your total months to see your bars.",
    calcInputs: [numberField("monthsHostileArea", "Total Months in Hostile Fire / Imminent Danger Areas", { default: 20, max: 300, step: 0.5, unit: "months" })],
    calcResult: { label: "Overseas Service Bars", format: "number" },
    calcResults: [
      { key: "overseasServiceBars", label: "Overseas Service Bars", format: "number", highlight: true },
      { key: "monthsToNextBar", label: "Months to the Next Bar", format: "number" },
      { key: "monthsCounted", label: "Months Counted", format: "number" },
    ],
    instructions: "Add up every period you spent in an area authorized hostile fire or imminent danger pay — the periods don't need to be consecutive. Count each month you received HFP/IDP.",
    examples: `Example: 20 months deployed across several tours earns ${exOsb.overseasServiceBars} Overseas Service Bars; ${exOsb.monthsToNextBar} more months earns the next.`,
    assumptions: "AR 670-1: one OSB for each 6-month period of federal service in a designated hostile fire / imminent danger pay area, cumulative across tours (qualifying eras and areas are listed in AR 670-1 and DA Pam 670-1). Months are counted from your HFP/IDP entitlement on your records. " + DISCLAIMER,
    faq: [
      { question: "Where do Overseas Service Bars go?", answer: "On the lower right sleeve of the Army Green Service Uniform and AGSU coat, centered and parallel to the bottom of the sleeve." },
      { question: "Do the months have to be in a row?", answer: "No — all qualifying months add up." },
    ],
  },
  {
    slug: "navy-rsca-calculator",
    title: "Navy RSCA Calculator",
    description: "Calculate a Reporting Senior's Cumulative Average (RSCA) for Navy evaluations and FITREPs, and see how a member's trait average compares and moves the average.",
    metaTitle: "Navy RSCA Calculator — Reporting Senior Cumulative Average",
    metaDescription: "Free RSCA calculator for Navy EVALs and FITREPs. Average the trait averages, compare a member's trait average and see the new RSCA.",
    calcInputs: [
      numberField("sumOfTraitAverages", "Sum of All Trait Averages Signed (this paygrade)", { default: 40.6, max: 5000, step: 0.01 }),
      numberField("numberOfReports", "Number of Reports Signed", { default: 10, min: 1, max: 1000 }),
      numberField("memberTraitAverage", "This Member's Trait Average", { default: 4.29, min: 1, max: 5, step: 0.01 }),
    ],
    calcResult: { label: "RSCA", format: "number" },
    calcResults: [
      { key: "rsca", label: "Current RSCA", format: "number", highlight: true },
      { key: "memberVsRsca", label: "Member vs RSCA (+ above)", format: "number" },
      { key: "aboveRsca", label: "Above RSCA? (1 = yes)", format: "number" },
      { key: "rscaAfterThisReport", label: "RSCA After This Report", format: "number" },
    ],
    instructions: "Add up the trait averages of every report the reporting senior has signed for this paygrade and enter how many there are, then the trait average for the report you're checking.",
    examples: `Example: 10 reports totalling 40.6 give an RSCA of ${exRsca.rsca}. A 4.29 trait average is ${exRsca.memberVsRsca} above it, and lifts the RSCA to ${exRsca.rscaAfterThisReport}.`,
    assumptions: "RSCA = sum of trait averages ÷ number of reports, per BUPERSINST 1610.10 (kept separately for each paygrade). Selection boards compare a member's trait average with the RSCA on each report. " + DISCLAIMER,
    faq: [
      { question: "What is a good trait average compared with the RSCA?", answer: "Above the reporting senior's RSCA is favorable; the further above, the stronger the report reads to a board." },
      { question: "Is RSCA kept for each paygrade?", answer: "Yes — a reporting senior has a separate cumulative average for each paygrade and report type." },
    ],
  },
];

async function main() {
  const cat = await prisma.toolCategory.findUnique({ where: { slug: CAT } });
  if (!cat) throw new Error(`The "${CAT}" category doesn't exist — run "npx tsx prisma/setup-law-government-category.ts --apply" first.`);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: cat.id,
      calcType: "custom",
      calcFormula: null,
      calcInputs: JSON.stringify(def.calcInputs),
      calcResult: JSON.stringify(def.calcResult),
      calcResults: JSON.stringify(def.calcResults),
      instructions: paragraphsToHtml(def.instructions),
      examples: paragraphsToHtml(def.examples),
      assumptions: paragraphsToHtml(def.assumptions),
      faq: JSON.stringify(def.faq),
    } satisfies Prisma.ToolUncheckedUpdateInput;

    const seoMetaContent = {
      contentType: "tool",
      metaTitle: def.metaTitle,
      metaDescription: def.metaDescription,
      schemaType: "SoftwareApplication",
    };

    const existing = await prisma.tool.findUnique({ where: { slug: def.slug } });
    if (existing) {
      await prisma.tool.update({
        where: { slug: def.slug },
        data: { ...toolContent, seoMeta: { upsert: { create: seoMetaContent, update: seoMetaContent } } },
      });
      updated++;
    } else {
      await prisma.tool.create({
        data: { slug: def.slug, status: "draft", ...toolContent, seoMeta: { create: seoMetaContent } },
      });
      created++;
    }
  }

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated.`);
  console.log("New tools are created with status Draft — review them in /admin/tools and publish when ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
