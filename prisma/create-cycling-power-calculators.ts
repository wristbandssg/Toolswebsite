// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the cycling sub-batch C (Power & Training). See
// src/lib/calc-engine-cycling-fit.ts for the full list
// of 4 sub-batches (47 tools under Sports Calculators > Cycling
// Calculators), and src/lib/calc-engine-cycling-power.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-cycling-power-calculators.ts
// or
//   npm run db:create-cycling-power-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Cycling Calculators", slug: "cycling-calculators" };

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
  "Estimates for planning and training. Bike fit, sizing and equipment numbers are starting points: check manufacturer specifications and torque limits, and consider a professional fit. Exercise and nutrition figures are general guidance, not medical advice.";

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

const WEIGHT = (def = 70) => [numberField("weight", "Body Weight", { default: def, max: 250, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1)];
const FTP = (def = 250) => numberField("ftp", "FTP (W)", { default: def, min: 0, max: 600 });

const TOOLS: ToolDef[] = [
  {
    slug: "ftp-calculator",
    title: "FTP Calculator",
    description: "Calculate your Functional Threshold Power (FTP) from a 20-minute, 8-minute, ramp or 60-minute test — with W/kg and sweet-spot range.",
    metaTitle: "FTP Calculator — Functional Threshold Power",
    metaDescription: "Free FTP calculator for cyclists. Get FTP from a 20-min, 8-min, ramp or 60-min test, plus W/kg and sweet spot.",
    calcInputs: [dropdown("testType", "Test", [["20-minute test (× 0.95)", 1], ["2 × 8-minute test (× 0.90)", 2], ["Ramp test — best 1-min power (× 0.75)", 3], ["60-minute effort (× 1.00)", 4]], 1), numberField("testPower", "Average Power in the Test (W)", { default: 280, max: 1000 }), ...WEIGHT()],
    calcResult: { label: "FTP", format: "number" },
    calcResults: [num("ftpWatts", "FTP (W)", true), num("wattsPerKg", "FTP W/kg"), num("sweetSpotLow", "Sweet Spot — From (W)"), num("sweetSpotHigh", "Sweet Spot — To (W)")],
    instructions: "Choose the test you did and enter the average power for it (for the ramp test, your best 1-minute power), plus your weight.",
    examples: "Example: 280 W for a 20-minute test gives an FTP of 266 W — 3.8 W/kg at 70 kg — with sweet-spot training at 234–250 W.",
    assumptions: "FTP ≈ 95% of 20-min power, 90% of 8-min power, 75% of ramp-test best minute, or 100% of a true 60-minute effort (Coggan / Zwift / TrainerRoad conventions). Pacing and freshness strongly affect results — retest every 6–8 weeks. " + DISCLAIMER,
    faq: [
      { question: "What is a good FTP?", answer: "It depends on weight — compare W/kg: about 2.5–3 W/kg for recreational riders, 4+ for strong amateur racers." },
      { question: "Ramp test or 20-minute test?", answer: "Ramp tests are shorter and easier to pace but can overestimate FTP for riders with strong anaerobic power." },
    ],
  },
  {
    slug: "power-zone-calculator",
    title: "Power Zone Calculator",
    description: "Calculate your 7 Coggan cycling power zones from FTP — recovery to neuromuscular — plus sweet spot.",
    metaTitle: "Power Zone Calculator — Cycling Training Zones",
    metaDescription: "Free cycling power zone calculator. Get the 7 Coggan power training zones and sweet spot in watts from your FTP.",
    calcInputs: [FTP()],
    calcResult: { label: "Threshold Zone Top", format: "number" },
    calcResults: [num("z4ThresholdMax", "Z4 Threshold — Up To (W)", true), num("z1RecoveryMax", "Z1 Active Recovery — Up To (W)"), num("z2EnduranceMax", "Z2 Endurance — Up To (W)"), num("z3TempoMax", "Z3 Tempo — Up To (W)"), num("z5Vo2MaxMax", "Z5 VO2 Max — Up To (W)"), num("z6AnaerobicMax", "Z6 Anaerobic — Up To (W); Z7 Above"), num("sweetSpotLow", "Sweet Spot — From (W)"), num("sweetSpotHigh", "Sweet Spot — To (W)")],
    instructions: "Enter your FTP (use the FTP Calculator if you've done a test). Each zone runs from the previous zone's top.",
    examples: "Example: with a 250 W FTP — Z1 up to 138 W, Z2 to 188 W, Z3 to 225 W, Z4 to 263 W, Z5 to 300 W, Z6 to 375 W; sweet spot 220–235 W.",
    assumptions: "Coggan zones as % of FTP: Z1 < 55%, Z2 56–75%, Z3 76–90%, Z4 91–105%, Z5 106–120%, Z6 121–150%, Z7 > 150% (neuromuscular). Sweet spot 88–94%. " + DISCLAIMER,
    faq: [
      { question: "Which zone burns the most fat?", answer: "Z2 endurance uses the highest share of fat and builds aerobic base — but total calories rise with intensity." },
      { question: "What is sweet spot training?", answer: "Riding at 88–94% of FTP — hard enough to build threshold fitness, easy enough to repeat often." },
    ],
  },
  {
    slug: "watts-per-kilo-calculator",
    title: "Watts per Kilo Calculator",
    description: "Calculate your cycling power-to-weight ratio (W/kg) and see your rider level — plus the power or weight you need for 4 W/kg.",
    metaTitle: "Watts per Kilo Calculator — Power to Weight",
    metaDescription: "Free watts per kilo calculator. Get your W/kg power-to-weight ratio, rider level and what you need for 4 W/kg.",
    calcInputs: [numberField("power", "Power (W, e.g. FTP)", { default: 250, max: 2500 }), ...WEIGHT(), dropdown("gender", "Category", [["Men", 1], ["Women", 2]], 1)],
    calcResult: { label: "W/kg", format: "number" },
    calcResults: [num("wattsPerKg", "Watts per Kilogram", true), num("riderLevel", "Level (1 Untrained … 7 World Class)"), num("wattsFor4Wkg", "Power for 4 W/kg at Your Weight (W)"), num("weightFor4WkgKg", "Weight for 4 W/kg at Your Power (kg)")],
    instructions: "Enter the power (usually FTP) and your body weight.",
    examples: "Example: 250 W at 70 kg is 3.57 W/kg — level 4 (a solid club rider). 4 W/kg needs 280 W at 70 kg, or 62.5 kg at 250 W.",
    assumptions: "W/kg = watts ÷ kg. FTP levels (men): < 2.5 untrained, 2.5–3.0 fair, 3.0–3.5 moderate, 3.5–4.0 good, 4.0–4.6 very good, 4.6–5.1 excellent, 5.1+ world class; women's thresholds about 15% lower (after Coggan's power profile). " + DISCLAIMER,
    faq: [
      { question: "What W/kg do pros have?", answer: "Grand Tour contenders sustain about 6 W/kg or more for 20–40 minutes." },
      { question: "Does W/kg matter on flat roads?", answer: "Less — on the flat, absolute watts and aerodynamics matter more; W/kg rules on climbs." },
    ],
  },
  {
    slug: "critical-power-calculator",
    title: "Critical Power Calculator",
    description: "Calculate Critical Power (CP) and W′ (W prime, anaerobic capacity) from two all-out efforts — and how long you can last above CP (also a W prime calculator).",
    metaTitle: "Critical Power & W′ Calculator",
    metaDescription: "Free critical power calculator. Get CP and W prime (W′) from two maximal efforts and time to exhaustion above CP.",
    calcInputs: [numberField("shortPower", "Short Effort Power (W)", { default: 400, max: 2000 }), numberField("shortMinutes", "Short Effort Duration (min)", { default: 3, min: 1, max: 20, step: 0.5 }), numberField("longPower", "Long Effort Power (W)", { default: 300, max: 2000 }), numberField("longMinutes", "Long Effort Duration (min)", { default: 12, min: 2, max: 60, step: 0.5 }), numberField("targetPower", "Power to Test (W)", { default: 350, max: 2000 })],
    calcResult: { label: "Critical Power", format: "number" },
    calcResults: [num("criticalPowerWatts", "Critical Power (W)", true), num("wPrimeKj", "W′ — Work Above CP (kJ)"), num("timeToExhaustionSeconds", "Time to Exhaustion at Test Power (s)"), num("cpAsFtpEstimate", "FTP Estimate (~95% of CP, W)")],
    instructions: "Do two maximal efforts of different lengths (e.g. 3 and 12 minutes) on separate days or with full recovery, and enter the average power of each.",
    examples: "Example: 400 W for 3 minutes and 300 W for 12 minutes give a CP of about 267 W and a W′ of 24 kJ — enough for about 4 minutes 48 seconds at 350 W.",
    assumptions: "Two-parameter model: work = CP × time + W′. Efforts between 2 and 20 minutes work best. W′ drains above CP and recharges below it. " + DISCLAIMER,
    faq: [
      { question: "Is critical power the same as FTP?", answer: "Close — CP is usually a few percent higher than FTP." },
      { question: "What is a typical W′?", answer: "About 15–25 kJ for most trained cyclists; sprinters can exceed 30 kJ." },
    ],
  },
  {
    slug: "peak-power-calculator",
    title: "Peak Power Calculator",
    description: "Estimate your peak power profile — 5-second, 1-minute, 5-minute and 20-minute power — from FTP and rider type.",
    metaTitle: "Peak Power Calculator — Cycling Power Profile",
    metaDescription: "Free cycling peak power calculator. Estimate 5-second, 1-minute, 5-minute and 20-minute power from FTP and rider type.",
    calcInputs: [FTP(), ...WEIGHT(), dropdown("riderType", "Rider Type", [["All-rounder", 1], ["Sprinter", 2], ["Time trialist / climber", 3]], 1)],
    calcResult: { label: "5-Second Peak", format: "number" },
    calcResults: [num("peak5sWatts", "5-Second Peak Power (W)", true), num("peak1minWatts", "1-Minute Power (W)"), num("peak5minWatts", "5-Minute Power (W)"), num("peak20minWatts", "20-Minute Power (W)"), num("peak5sWkg", "5-Second Peak (W/kg)")],
    instructions: "Enter your FTP, weight and the type of rider you are.",
    examples: "Example: an all-rounder with a 250 W FTP can expect about 900 W for 5 seconds (12.9 W/kg at 70 kg), 475 W for a minute and 300 W for 5 minutes.",
    assumptions: "Typical multiples of FTP — all-rounder: 5 s × 3.6, 1 min × 1.9, 5 min × 1.2, 20 min × 1.05; sprinters higher for short efforts, climbers lower. A power meter's power-duration curve gives your real profile. " + DISCLAIMER,
    faq: [
      { question: "What is a good sprint power?", answer: "Recreational riders 700–1,000 W; strong amateurs 1,200–1,500 W; pro sprinters 1,800–2,000+ W." },
      { question: "Why is 20-minute power higher than FTP?", answer: "FTP is about one hour; most riders hold around 5% more for 20 minutes." },
    ],
  },
  {
    slug: "training-stress-score-calculator",
    title: "Training Stress Score Calculator",
    description: "Calculate Training Stress Score (TSS), Intensity Factor (IF) and Variability Index from ride duration, normalized power and FTP (also an intensity factor calculator).",
    metaTitle: "TSS Calculator — Training Stress Score & IF",
    metaDescription: "Free training stress score calculator. Get TSS, intensity factor and variability index from duration, normalized power and FTP.",
    calcInputs: [numberField("hours", "Ride Duration — Hours", { default: 2, max: 24 }), numberField("minutes", "Ride Duration — Minutes", { default: 0, max: 59 }), numberField("normalizedPower", "Normalized Power (W)", { default: 220, max: 1000 }), numberField("averagePower", "Average Power (W)", { default: 200, max: 1000 }), FTP()],
    calcResult: { label: "TSS", format: "number" },
    calcResults: [num("tss", "Training Stress Score (TSS)", true), num("intensityFactor", "Intensity Factor (IF)"), num("variabilityIndex", "Variability Index (NP ÷ Avg)"), num("workKj", "Work (kJ)"), num("recoveryLevel", "Load (1 Low, 2 Medium, 3 High, 4 Very High)")],
    instructions: "Enter ride duration, normalized and average power (from your head unit or Strava/TrainingPeaks) and your FTP.",
    examples: "Example: 2 hours at 220 W normalized power with a 250 W FTP is an IF of 0.88 and a TSS of 155 — a solid training day that needs a day or two to absorb.",
    assumptions: "IF = NP ÷ FTP; TSS = (seconds × NP × IF) ÷ (FTP × 3,600) × 100 — one hour at FTP = 100 TSS. Load bands: < 150 low (recovered next day), 150–300 medium, 300–450 high, 450+ very high (Coggan). " + DISCLAIMER,
    faq: [
      { question: "What is a good weekly TSS?", answer: "300–500 for recreational riders, 600–900 for serious amateurs, 1,000+ for pros." },
      { question: "What is normalized power?", answer: "An adjusted average that reflects the extra cost of surges — what a steady effort would have cost the body." },
    ],
  },
  {
    slug: "cycling-vo2-max-calculator",
    title: "VO2 Max Calculator Cycling",
    description: "Estimate VO2 max from cycling power — your 5-minute maximal power or your FTP — and body weight.",
    metaTitle: "Cycling VO2 Max Calculator — From Power",
    metaDescription: "Free cycling VO2 max calculator. Estimate VO2 max in ml/kg/min and L/min from 5-minute max power or FTP and weight.",
    calcInputs: [dropdown("powerType", "Power Entered", [["Best 5-minute power (MAP)", 1], ["FTP", 2]], 1), numberField("power", "Power (W)", { default: 320, max: 1000 }), ...WEIGHT()],
    calcResult: { label: "VO2 Max", format: "number" },
    calcResults: [num("vo2Max", "VO2 Max (ml/kg/min)", true), num("vo2MaxLitresPerMin", "VO2 Max (L/min)"), num("maximalAerobicPowerWatts", "Maximal Aerobic Power Used (W)")],
    instructions: "Enter your best 5-minute power (or FTP) and body weight.",
    examples: "Example: 320 W for 5 minutes at 70 kg suggests a VO2 max of about 56 ml/kg/min (3.95 L/min).",
    assumptions: "ACSM cycle equation: VO2 max = 10.8 × watts ÷ kg + 7, using maximal aerobic power ≈ best 5-minute power (or FTP ÷ 0.80). A lab test measures it directly; this estimate is typically within about 10%. See also the general VO2 Max Calculator for running and walking tests. " + DISCLAIMER,
    faq: [
      { question: "What is a good VO2 max for a cyclist?", answer: "About 45–55 for fit amateurs, 60–70 for strong racers and 75–85+ for elite pros." },
      { question: "Can I improve VO2 max?", answer: "Yes — intervals of 3–8 minutes at 106–120% of FTP are the classic way." },
    ],
  },
  {
    slug: "cda-calculator",
    title: "CdA Calculator",
    description: "Estimate your aerodynamic drag area (CdA) from power, speed and weight on a steady ride — and the power you'd need at 40 km/h.",
    metaTitle: "CdA Calculator — Cycling Aerodynamic Drag",
    metaDescription: "Free cycling CdA calculator. Estimate drag area from power, speed, weight and gradient, plus aero watts and power at 40 km/h.",
    calcInputs: [numberField("power", "Average Power (W)", { default: 200, max: 1500 }), numberField("speedKmh", "Average Speed (km/h)", { default: 32, min: 1, max: 80, step: 0.1 }), numberField("totalMassKg", "Rider + Bike Mass (kg)", { default: 80, max: 200, step: 0.5 }), numberField("crr", "Rolling Resistance (Crr)", { default: 0.004, max: 0.03, step: 0.0005 }), numberField("gradientPercent", "Average Gradient (%)", { default: 0, min: -10, max: 10, step: 0.1 }), numberField("airDensity", "Air Density (kg/m³)", { default: 1.225, min: 0.5, max: 1.5, step: 0.001 }), percentField("drivetrainEfficiency", "Drivetrain Efficiency", { default: 97.5, min: 80, max: 100 })],
    calcResult: { label: "CdA", format: "number" },
    calcResults: [num("cda", "CdA (m²)", true, 3), num("aeroWatts", "Power Going to Aero Drag (W)"), num("rollingWatts", "Power Going to Rolling Resistance (W)"), num("powerFor40KmhWatts", "Power Needed for 40 km/h (W)")],
    instructions: "Ride a flat, windless out-and-back at steady power and use the average power and speed (average both directions).",
    examples: "Example: 200 W at 32 km/h with 80 kg total on a flat road gives a CdA of about 0.39 m² — typical riding on the hoods. Holding 40 km/h would take about 371 W.",
    assumptions: "Power × efficiency = ½ ρ CdA v³ + Crr m g v + m g v sin(slope). Wind, drafting and changing speed spoil the estimate — repeat runs and average. Typical CdA: tops 0.40, hoods 0.32–0.38, drops 0.30, TT position 0.20–0.25. " + DISCLAIMER,
    faq: [
      { question: "What is a good CdA?", answer: "Around 0.30 in the drops on a road bike; good TT positions are 0.20–0.23." },
      { question: "How much power does 0.01 CdA save?", answer: "About 8 W at 40 km/h (and about 4 W at 32 km/h)." },
    ],
  },
  {
    slug: "ideal-cycling-weight-calculator",
    title: "Ideal Cycling Weight Calculator",
    description: "Find the weight you'd need for a target watts-per-kilo at your current FTP — or the power you'd need at your current weight — with a healthy-weight check.",
    metaTitle: "Ideal Cycling Weight Calculator — W/kg Target",
    metaDescription: "Free ideal cycling weight calculator. Find the weight or power for a target W/kg and check it against a healthy minimum.",
    calcInputs: [...WEIGHT(75), FTP(), numberField("targetWkg", "Target W/kg", { default: 4, min: 0.5, max: 7, step: 0.1 }), numberField("heightCm", "Height (cm)", { default: 175, max: 230, step: 0.5 })],
    calcResult: { label: "Weight for Target", format: "number" },
    calcResults: [num("weightForTargetKg", "Weight for Target W/kg (kg)", true), num("weightChangeKg", "Change from Current (kg)"), num("powerForTargetAtCurrentWeight", "Power for Target at Current Weight (W)"), num("healthyMinimumKg", "Healthy Minimum (BMI 20, kg)"), num("belowHealthyMinimum", "Target Below Healthy Minimum (1 Yes)")],
    instructions: "Enter your current weight, FTP, target W/kg and height.",
    examples: "Example: at 75 kg with a 250 W FTP, 4.0 W/kg means either 62.5 kg at the same power or 300 W at your current weight. A 175 cm rider's healthy minimum (BMI 20) is about 61 kg.",
    assumptions: "Weight = FTP ÷ target W/kg; power = target × weight. The healthy floor uses BMI 20 — many endurance athletes sit around 20–23. Losing weight too fast usually costs power; gaining power is often the better route. This isn't medical advice — talk to a doctor or sports dietitian before cutting weight. " + DISCLAIMER,
    faq: [
      { question: "Should I lose weight or gain power?", answer: "Usually both a little — but under-fuelling causes injuries, illness and RED-S. Gaining power is safer for most riders." },
      { question: "What is a typical pro cyclist BMI?", answer: "Grand Tour climbers are often 19–20; sprinters and classics riders 21–23." },
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
