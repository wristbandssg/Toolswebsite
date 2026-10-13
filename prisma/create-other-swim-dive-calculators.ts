// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the other-sports sub-batch "Swimming & Scuba". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-swim-dive.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-swim-dive-calculators.ts
// or
//   npm run db:create-other-swim-dive-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Other Sports Calculators", slug: "other-sports-calculators" };

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("");
}

function numberField(
  key: string,
  label: string,
  opts: { unit?: string; required?: boolean; default?: number; min?: number; max?: number; step?: number } = {}
) {
  return {
    key,
    label,
    type: "number",
    unit: opts.unit,
    required: opts.required ?? true,
    default: opts.default ?? 0,
    min: opts.min ?? 0,
    max: opts.max ?? 1000,
    step: opts.step ?? 1,
  };
}

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number } = {}) {
  return { key, label, type: "percentage", unit: "%", required: true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 1 };
}

function dropdown(key: string, label: string, options: [string, number][], def: number) {
  return { key, label, type: "dropdown", required: true, default: def, options: options.map(([l, value]) => ({ label: l, value })) };
}

const DISCLAIMER =
  "Estimates for planning, training and fun. Sizing, ratings and physics models are approximations — check official rules, manufacturer charts and qualified coaches, and treat health figures as general guidance, not medical advice.";

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

const num = (key: string, label: string, highlight = false, decimals?: number) => ({ key, label, format: "number", ...(decimals !== undefined ? { decimals } : {}), ...(highlight ? { highlight: true } : {}) });

const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

const TIME = (m: number, s: number, label = "Time") => [numberField("minutes", `${label} — Minutes`, { default: m, max: 600 }), numberField("seconds", `${label} — Seconds`, { default: s, max: 59.99, step: 0.01 })];
const WT = (def = 160) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 500 }), dropdown("weightUnit", "Unit", [["lb", 1], ["kg", 2]], 1)];
const DIVE = " Dive only within your training and certification, and follow your agency's tables or computer.";

const TOOLS: ToolDef[] = [
  {
    slug: "swim-pace-calculator",
    title: "Swim Pace Calculator",
    description: "Calculate swim pace per 100 m or yards and speed from any swim — and predict your time for another distance (also a general swimming calculator).",
    metaTitle: "Swim Pace Calculator — Pace per 100 & Predicted Time",
    metaDescription: "Free swim pace calculator. Get pace per 100 m/yd and speed from distance and time, and predict times for other distances.",
    calcInputs: [numberField("distance", "Distance Swum (m or yd)", { default: 1500, min: 25, max: 100000 }), ...TIME(30, 0), numberField("predictDistance", "Predict Time for Distance", { default: 400, min: 25, max: 100000 })],
    calcResult: { label: "Pace per 100", format: "number" },
    calcResults: [num("pacePer100Sec", "Pace per 100 (seconds)", true), num("pacePer100Min", "Pace per 100 (minutes)"), num("speedKmh", "Speed (km/h — m inputs)"), num("predictedTimeMin", "Predicted Time (minutes)"), num("predictedTimeSec", "Predicted Time (seconds)")],
    instructions: "Enter a distance and how long it took, in the same unit as your pool (metres or yards). Add another distance to predict a time.",
    examples: "Example: 1,500 m in 30:00 = 2:00 per 100 m (3 km/h). That predicts a 400 m in about 7:23.",
    assumptions: "Pace = time ÷ distance × 100. Predictions use the Riegel fatigue formula T₂ = T₁ × (D₂ ÷ D₁)^1.06, which works best between similar distances. Pace per 100 yd is about 9% faster than per 100 m. " + DISCLAIMER,
    faq: [
      { question: "What is a good swim pace per 100 m?", answer: "Around 2:00 is solid for adult fitness swimmers; competitive swimmers are under 1:30." },
      { question: "How long does it take to swim a mile?", answer: "Roughly 25–45 minutes for most fitness swimmers." },
    ],
  },
  {
    slug: "swim-split-calculator",
    title: "Swim Split Calculator",
    description: "Plan swim race splits for a goal time — even splits or a negative split with a faster second half.",
    metaTitle: "Swim Split Calculator — Race Splits for Goal Time",
    metaDescription: "Free swim split calculator. Get even or negative splits per 50 or 100 for a target swim time.",
    calcInputs: [numberField("distance", "Race Distance (m or yd)", { default: 400, min: 50, max: 10000 }), ...TIME(6, 0, "Goal Time"), numberField("splitLength", "Split Length", { default: 100, min: 25, max: 1000 }), percentField("negativeSplitPct", "Negative Split (second half faster by)", { default: 2, max: 20, step: 0.5 })],
    calcResult: { label: "Even Split", format: "number" },
    calcResults: [num("evenSplitSec", "Even Split (s)", true), num("firstHalfSec", "First Half (s)"), num("secondHalfSec", "Second Half (s)"), num("firstHalfSplitSec", "First-Half Split (s)"), num("secondHalfSplitSec", "Second-Half Split (s)")],
    instructions: "Enter the race distance, your goal time, the split length (50 or 100) and how much faster you want the second half.",
    examples: "Example: a 6:00 400 → 1:30 per 100 even. With a 2% negative split: 3:01.8 then 2:58.2 (1:30.9 then 1:29.1 per 100).",
    assumptions: "Even split = goal ÷ distance × split length. Negative split: the first half is slower by half the chosen percentage and the second half faster by the same, keeping the total. Remember the first split includes the dive start, so it's naturally quicker. " + DISCLAIMER,
    faq: [
      { question: "Should I negative split?", answer: "For 200s and longer, even or slightly negative splits usually give the best results." },
      { question: "Why is my first 50 so much faster?", answer: "The dive start is worth 1–2 seconds over a push start." },
    ],
  },
  {
    slug: "swim-time-conversion-calculator",
    title: "Swim Time Conversion Calculator",
    description: "Convert swim times between short-course yards (SCY), short-course metres (SCM) and long-course metres (LCM).",
    metaTitle: "Swim Time Conversion Calculator — SCY, SCM, LCM",
    metaDescription: "Free swim time converter. Convert swimming times between yards and metres, short course and long course.",
    calcInputs: [dropdown("fromCourse", "Swum In", [["Short course yards (25 yd)", 1], ["Short course metres (25 m)", 2], ["Long course metres (50 m)", 3]], 1), ...TIME(1, 0)],
    calcResult: { label: "LCM Time", format: "number" },
    calcResults: [num("scySec", "SCY Time (s)"), num("scmSec", "SCM Time (s)"), num("lcmSec", "LCM Time (s)", true), num("lcmMin", "LCM Time (min)")],
    instructions: "Choose the course you swam in and enter the time (e.g. 100 free). The other courses are for the same nominal distance (100 yd ↔ 100 m).",
    examples: "Example: 1:00.00 in 100 yd (SCY) ≈ 1:06.00 SCM ≈ 1:07.20 LCM.",
    assumptions: "Simple factors: SCM ≈ SCY × 1.10 (longer distance), LCM ≈ SCY × 1.12 (longer and fewer turns). Official converters use event- and stroke-specific factors and treat 500/1000/1650 yd as 400/800/1500 m; strong turners gain more in short course. " + DISCLAIMER,
    faq: [
      { question: "Why are long-course times slower?", answer: "Fewer walls means fewer push-offs, which are faster than swimming." },
      { question: "Is 1650 yards the same as 1500 m?", answer: "They're treated as equivalent events — 1650 yd ≈ 1509 m." },
    ],
  },
  {
    slug: "critical-swim-speed-calculator",
    title: "Critical Swim Speed Calculator",
    description: "Calculate your critical swim speed (CSS) — threshold pace per 100 — from a 400 m and 200 m time trial, with training paces.",
    metaTitle: "Critical Swim Speed Calculator — CSS Pace",
    metaDescription: "Free CSS calculator. Get critical swim speed per 100 m from 400 and 200 time trials plus endurance and speed set paces.",
    calcInputs: [numberField("minutes400", "400 Time — Minutes", { default: 6, max: 30 }), numberField("seconds400", "400 Time — Seconds", { default: 0, max: 59.99, step: 0.01 }), numberField("minutes200", "200 Time — Minutes", { default: 2, max: 15 }), numberField("seconds200", "200 Time — Seconds", { default: 50, max: 59.99, step: 0.01 })],
    calcResult: { label: "CSS per 100", format: "number" },
    calcResults: [num("cssPer100Sec", "CSS Pace per 100 (s)", true), num("cssSpeedMs", "CSS Speed (m/s)"), num("endurancePer100Sec", "Endurance Pace (CSS + 8 s)"), num("thresholdSetPer100Sec", "Threshold Sets (CSS + 2 s)"), num("speedSetPer100Sec", "Speed Sets (CSS − 4 s)")],
    instructions: "After a good warm-up, swim a 400 time trial, rest well, then swim a 200 time trial. Enter both times.",
    examples: "Example: 400 in 6:00 and 200 in 2:50 → CSS = (360 − 170) ÷ 2 = 95 s per 100 (1:35).",
    assumptions: "CSS per 100 = (T400 − T200) ÷ 2 — the speed you could hold for about 30 minutes (similar to running threshold). Training paces are common Swim Smooth-style offsets. Retest every 4–6 weeks. " + DISCLAIMER,
    faq: [
      { question: "What is CSS used for?", answer: "Setting interval paces — e.g. 10 × 100 at CSS with short rests." },
      { question: "Does it work in yards?", answer: "Yes — use yard times and the paces are per 100 yd." },
    ],
  },
  {
    slug: "swim-calorie-calculator",
    title: "Swim Calorie Calculator",
    description: "Calculate calories burned swimming by stroke and intensity — freestyle, backstroke, breaststroke, butterfly or treading water.",
    metaTitle: "Swim Calorie Calculator — Calories Burned Swimming",
    metaDescription: "Free swimming calorie calculator. Estimate calories burned by stroke, effort, body weight and time.",
    calcInputs: [dropdown("stroke", "Stroke / Effort", [["Freestyle, easy", 1], ["Freestyle, moderate", 2], ["Freestyle, fast", 3], ["Backstroke, leisurely", 4], ["Backstroke, training", 5], ["Breaststroke, leisurely", 6], ["Breaststroke, training", 7], ["Butterfly", 8], ["Treading water", 9]], 2), ...WT(), numberField("minutes", "Minutes", { default: 30, min: 1, max: 600 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose the stroke and how hard you swam, enter your weight and the minutes actually swimming.",
    examples: "Example: a 160 lb swimmer doing 30 minutes of moderate freestyle burns about 301 kcal.",
    assumptions: "Calories = MET × weight (kg) × hours using 2011 Compendium values (freestyle 5.8 / 8.3 / 9.8, backstroke 4.8 / 9.5, breaststroke 5.3 / 10.3, butterfly 13.8, treading water 3.5). Count only swimming time, not rests at the wall. " + DISCLAIMER,
    faq: [
      { question: "Which stroke burns the most calories?", answer: "Butterfly, followed by fast breaststroke and freestyle." },
      { question: "Is swimming good for weight loss?", answer: "Yes, combined with diet — though some people find it makes them hungrier than land exercise." },
    ],
  },
  {
    slug: "swim-distance-calculator",
    title: "Swim Distance Calculator",
    description: "Convert pool lengths or laps to metres, yards and miles — and how many lengths make a mile.",
    metaTitle: "Swim Distance Calculator — Laps to Miles",
    metaDescription: "Free swim distance calculator. Turn pool lengths into metres, yards and miles and find the lengths needed for a mile.",
    calcInputs: [numberField("poolLength", "Pool Length", { default: 25, min: 5, max: 100 }), dropdown("poolUnit", "Pool Unit", [["metres", 1], ["yards", 2]], 1), numberField("lengths", "Lengths Swum", { default: 64, max: 2000 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMetres", "Distance (m)", true), num("distanceYards", "Distance (yd)"), num("distanceMiles", "Distance (miles)"), num("lengthsForAMile", "Lengths for a Mile"), num("lapsRoundTrip", "Laps (there and back)")],
    instructions: "Enter the pool length and how many lengths (one end to the other) you swam.",
    examples: "Example: 64 lengths of a 25 m pool = 1,600 m (0.99 miles). A swimmer's mile in this pool is 65 lengths.",
    assumptions: "Distance = lengths × pool length. A 'swimmer's mile' is 1,650 yd (66 lengths of 25 yd) or 1,500 m in competition; a true mile is 1,609 m. Some people call one length a lap, others a there-and-back. " + DISCLAIMER,
    faq: [
      { question: "How many laps is a mile?", answer: "About 64–66 lengths of a 25-yard or 25-metre pool." },
      { question: "Is a lap one length or two?", answer: "In competitive swimming one length; many lap counters mean there and back." },
    ],
  },
  {
    slug: "scuba-weight-calculator",
    title: "Scuba Weight Calculator",
    description: "Estimate how much lead you need for scuba diving — by body weight, exposure suit, salt or fresh water and tank.",
    metaTitle: "Scuba Weight Calculator — How Much Lead?",
    metaDescription: "Free scuba weight calculator. Estimate dive weights from body weight, wetsuit or drysuit, water type and tank.",
    calcInputs: [numberField("bodyWeight", "Body Weight", { default: 180, min: 50, max: 400 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), dropdown("suit", "Exposure Protection", [["Swimsuit / skin", 1], ["3 mm wetsuit", 2], ["5 mm wetsuit", 3], ["7 mm wetsuit", 4], ["Drysuit with undergarments", 5]], 3), dropdown("water", "Water", [["Salt water", 1], ["Fresh water", 2]], 1), dropdown("tank", "Tank", [["Aluminium 80", 1], ["Steel", 2], ["Other / neutral", 3]], 1), dropdown("buoyancy", "Body Type", [["Lean / negatively buoyant", 1], ["Average", 2], ["Higher body fat / floaty", 3]], 2)],
    calcResult: { label: "Lead", format: "number" },
    calcResults: [num("leadLb", "Lead Needed (lb)", true), num("leadKg", "Lead Needed (kg)"), pct("pctOfBodyWeight", "Lead as % of Body Weight")],
    instructions: "Enter your weight and the gear you'll dive with.",
    examples: "Example: a 180 lb diver in a 5 mm wetsuit in salt water with an aluminium 80 → about 18 lb of lead.",
    assumptions: "Starting point: suit share of body weight (3 mm 5%, 5 mm 8%, 7 mm 10%, drysuit 12%), −2.5% of body weight for fresh water, +4 lb for an aluminium 80 (it turns buoyant when empty), −2 lb for steel, ±2 lb for body type. Always do a buoyancy check at the surface with a near-empty tank and adjust." + DIVE + " " + DISCLAIMER,
    faq: [
      { question: "How do I do a buoyancy check?", answer: "At the surface with an empty BCD and a normal breath you should float at eye level; exhaling should make you sink." },
      { question: "Why do I need less weight in fresh water?", answer: "Fresh water is less dense, so you float less." },
    ],
  },
  {
    slug: "sac-rate-calculator",
    title: "SAC Rate Calculator",
    description: "Calculate your scuba surface air consumption (SAC) and respiratory minute volume (RMV) — and air time for a planned dive.",
    metaTitle: "SAC Rate Calculator — Scuba Air Consumption",
    metaDescription: "Free SAC rate calculator. Get surface air consumption, RMV and estimated air time at a planned depth for your tank.",
    calcInputs: [dropdown("unit", "Units", [["Imperial (psi, ft, cu ft)", 1], ["Metric (bar, m, litres)", 2]], 1), numberField("startPressure", "Start Pressure (psi or bar)", { default: 3000, max: 5000 }), numberField("endPressure", "End Pressure (psi or bar)", { default: 1000, max: 5000 }), numberField("minutes", "Dive Time (min)", { default: 40, min: 1, max: 600 }), numberField("averageDepth", "Average Depth (ft or m)", { default: 40, max: 400 }), numberField("tankSize", "Tank Size (cu ft or litres water volume)", { default: 80, min: 1, max: 200 }), numberField("workingPressure", "Tank Working Pressure (psi, imperial)", { default: 3000, min: 1000, max: 5000 }), numberField("planDepth", "Planned Depth for Next Dive (ft or m)", { default: 60, max: 400 })],
    calcResult: { label: "SAC Rate", format: "number" },
    calcResults: [num("sacRate", "SAC (psi or bar per minute)", true), num("rmv", "RMV (cu ft or litres per minute)"), num("rmvLitresPerMin", "RMV (litres per minute)"), num("airTimeAtPlanDepthMin", "Air Time at Planned Depth to Reserve (min)")],
    instructions: "From your dive log, enter start and end pressure, time and average depth, plus your tank. Add a planned depth to estimate air time.",
    examples: "Example: 2,000 psi used in 40 minutes at an average 40 ft (2.21 ATA) → SAC 22.6 psi/min, RMV 0.60 cu ft/min (17 L/min). At 60 ft an AL80 lasts about 39 minutes to a 500 psi reserve.",
    assumptions: "SAC = gas used ÷ minutes ÷ ambient pressure (ATA = depth ÷ 33 ft + 1, or ÷ 10 m + 1). RMV converts SAC to volume using the tank's capacity. Air time keeps a 500 psi / 50 bar reserve. Stress, cold and work raise consumption." + DIVE + " " + DISCLAIMER,
    faq: [
      { question: "What is a good SAC rate?", answer: "An RMV of about 0.5 cu ft/min (14 L/min) is typical; experienced, relaxed divers go lower." },
      { question: "SAC or RMV?", answer: "RMV doesn't depend on tank size, so it's better for planning with different tanks." },
    ],
  },
  {
    slug: "nitrox-calculator",
    title: "Nitrox Calculator",
    description: "Calculate nitrox maximum operating depth (MOD), equivalent air depth (EAD) and the best mix for a planned depth.",
    metaTitle: "Nitrox Calculator — MOD, EAD & Best Mix",
    metaDescription: "Free nitrox calculator. Get MOD at 1.4 and 1.6 PO2, equivalent air depth and the best enriched-air mix for your dive.",
    calcInputs: [dropdown("unit", "Depth Unit", [["feet", 1], ["metres", 2]], 1), percentField("oxygenPct", "Oxygen in the Mix (FO2)", { default: 32, min: 21, max: 100 }), numberField("ppo2Limit", "Max PO2 (bar)", { default: 1.4, min: 1, max: 1.6, step: 0.1 }), numberField("plannedDepth", "Planned Depth", { default: 100, max: 400 })],
    calcResult: { label: "MOD", format: "number" },
    calcResults: [num("maxOperatingDepth", "Maximum Operating Depth", true), num("contingencyMod", "Contingency MOD (PO2 1.6)"), num("equivalentAirDepth", "Equivalent Air Depth at Planned Depth"), pct("bestMixPct", "Best Mix for Planned Depth"), num("ppo2AtPlannedDepth", "PO2 at Planned Depth")],
    instructions: "Enter your analysed oxygen percentage, your PO2 limit (1.4 for the working part of the dive) and the planned depth.",
    examples: "Example: EAN32 at PO2 1.4 has an MOD of about 111 ft (132 ft at 1.6). At 100 ft its equivalent air depth is about 81 ft; the best mix for 100 ft is about EAN34.",
    assumptions: "MOD = (PO2 ÷ FO2 − 1) × 33 ft (or 10 m); EAD = (depth + 33) × (1 − FO2) ÷ 0.79 − 33; best mix = PO2 ÷ ambient pressure. Uses sea-water depth conversions. Always analyse your gas and mark the cylinder." + DIVE + " " + DISCLAIMER,
    faq: [
      { question: "Why use nitrox?", answer: "Less nitrogen means longer no-decompression limits at moderate depths." },
      { question: "Is nitrox safer for deep dives?", answer: "No — oxygen toxicity limits how deep you can go; it's for no-stop time, not depth." },
    ],
  },
  {
    slug: "swimsuit-size-calculator",
    title: "Swimsuit Size Calculator",
    description: "Find your swimsuit size from bust and hip (women) or waist (men) — US, UK and EU sizes.",
    metaTitle: "Swimsuit Size Calculator — Women's & Men's",
    metaDescription: "Free swimsuit size calculator. Convert bust, hip and waist measurements to US, UK, EU and letter swimsuit sizes.",
    calcInputs: [dropdown("gender", "Swimsuit For", [["Women", 1], ["Men", 2]], 1), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), numberField("bust", "Bust (women)", { default: 36, min: 20, max: 160, step: 0.5 }), numberField("hip", "Hips (women)", { default: 39, min: 20, max: 170, step: 0.5 }), numberField("waist", "Waist (men)", { default: 32, min: 20, max: 160, step: 0.5 })],
    calcResult: { label: "US Size", format: "number" },
    calcResults: [num("usSize", "US Size (women's dress size / men's waist)", true), num("letterSize", "Letter Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 XXL)"), num("ukSize", "UK Size"), num("euSize", "EU Size")],
    instructions: "Measure around the fullest part of the bust and hips (women) or your natural waist (men).",
    examples: "Example: a 36\" bust and 39\" hips → US 8 (M), UK 12, EU 38.",
    assumptions: "Typical women's chart: US 4 = 34\"/37\", 8 = 36\"/39\", 12 = 38.5\"/41.5\", 16 = 41.5\"/44.5\"; the larger of the bust and hip sizes is used. UK ≈ US + 4, EU ≈ US + 30. Men's trunks follow waist size. Brands differ — check their chart, especially for competition suits, which run small. " + DISCLAIMER,
    faq: [
      { question: "Should a swimsuit be tight?", answer: "Snug but comfortable — swimsuits loosen slightly when wet." },
      { question: "Are racing suits sized differently?", answer: "Yes, they're designed to be very tight; most swimmers size down." },
    ],
  },
  {
    slug: "wetsuit-size-calculator",
    title: "Wetsuit Size Calculator",
    description: "Find your wetsuit size from height and weight and the right thickness for the water temperature.",
    metaTitle: "Wetsuit Size Calculator — Size & Thickness",
    metaDescription: "Free wetsuit size calculator. Get a wetsuit size from height and weight and the thickness for your water temperature.",
    calcInputs: [dropdown("gender", "Wetsuit For", [["Men", 1], ["Women", 2]], 1), dropdown("unit", "Units", [["inches & lb", 1], ["cm & kg", 2]], 1), numberField("height", "Height", { default: 70, min: 40, max: 230 }), numberField("weight", "Weight", { default: 170, min: 30, max: 400 }), numberField("waterTempF", "Water Temperature", { default: 60, min: 25, max: 95 }), dropdown("tempUnit", "Temperature Unit", [["°F", 1], ["°C", 2]], 1)],
    calcResult: { label: "Size", format: "number" },
    calcResults: [num("sizeCode", "Size (Men: 1 S, 2 M, 3 MT, 4 L, 5 LT, 6 XL, 7 XXL · Women: 1 = 4, 2 = 6, 3 = 8, 4 = 10, 5 = 12, 6 = 14)", true), num("thicknessCode", "Thickness (1 Shorty / 2 mm, 2 3/2, 3 4/3, 4 5/4, 5 6/5 + hood, 6 Drysuit)"), num("fitScore", "Fit Confidence (0–100)")],
    instructions: "Enter your height, weight and the usual water temperature.",
    examples: "Example: a 5'10\", 170 lb man → Medium; 60°F water calls for a 4/3 full suit.",
    assumptions: "Size: nearest match on a typical surf-brand chart (e.g. men's M ≈ 5'8\"–5'11\", 150–170 lb). Thickness: > 72°F shorty/2 mm, 64–72 3/2, 58–63 4/3, 52–57 5/4 (boots), 43–51 6/5 with hood; colder needs a drysuit. Chest and waist matter too — always try on. " + DISCLAIMER,
    faq: [
      { question: "How tight should a wetsuit be?", answer: "Snug everywhere with no water pockets, but you can still breathe and raise your arms." },
      { question: "What does 4/3 mean?", answer: "4 mm thick on the body, 3 mm on the arms and legs." },
    ],
  },
  {
    slug: "water-walking-calories-burned-calculator",
    title: "Water Walking Calories Burned Calculator",
    description: "Calculate calories burned walking in a pool, doing water aerobics or deep-water running.",
    metaTitle: "Water Walking Calories Burned Calculator",
    metaDescription: "Free water walking calorie calculator. Estimate calories for pool walking, water aerobics and deep-water running.",
    calcInputs: [dropdown("activity", "Activity", [["Water walking, slow", 1], ["Water walking, moderate", 2], ["Water walking, vigorous / jogging", 3], ["Water aerobics", 4], ["Deep-water running", 5]], 2), ...WT(170), numberField("minutes", "Minutes", { default: 45, min: 1, max: 300 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("landWalkingEquivalent", "Same Time Walking on Land at 3 mph"), num("met", "MET Value")],
    instructions: "Choose the activity and enter your weight and time in the pool.",
    examples: "Example: 45 minutes of moderate water walking at 170 lb burns about 260 kcal — more than the 202 kcal of a 3 mph walk on land.",
    assumptions: "MET values from the 2011 Compendium (water walking 2.5 / 4.5 / 6.8, water aerobics 5.5, deep-water running 9.8). Water depth, speed and arm movement change the burn. Water exercise is gentle on joints. " + DISCLAIMER,
    faq: [
      { question: "Is walking in water better than walking on land?", answer: "Water resistance raises effort while buoyancy reduces joint impact." },
      { question: "How deep should water walking be?", answer: "Waist to chest deep — deeper is harder." },
    ],
  },
];
async function ensureCategory(cat: { name: string; slug: string }) {
  const existing = await prisma.toolCategory.findUnique({ where: { slug: cat.slug } });
  if (existing) return existing;
  const parent = await prisma.toolCategory.findUnique({ where: { slug: PARENT_SLUG } });
  if (!parent) throw new Error(`The "${PARENT_SLUG}" category doesn't exist yet — create it in /admin first.`);
  console.log(`Creating sub-category "${cat.name}" under "${parent.name}".`);
  return prisma.toolCategory.create({
    data: { name: cat.name, slug: cat.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory(CATEGORY);

  let created = 0;
  let updated = 0;

  for (const def of TOOLS) {
    const toolContent = {
      title: def.title,
      description: def.description,
      templateKey: "tool-template-3",
      categoryId: category.id,
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

  console.log(`Done: ${created} tool(s) created, ${updated} tool(s) updated, all filed under "${category.name}".`);
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
