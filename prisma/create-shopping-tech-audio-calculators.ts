// One-time (but safe to re-run) batch setup script: creates 8 audio and electronics tools
// from the user's shopping list (Shopping Calculators > Electronics, Energy & Tech Calculators).
// See src/lib/calc-engine-shopping-tech-audio.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-tech-audio-calculators.ts
// or
//   npm run db:create-shopping-tech-audio-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Electronics, Energy & Tech Calculators", slug: "electronics-energy-tech-calculators" };

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

const TOOLS: ToolDef[] = [
  {
    slug: "decibel-calculator",
    title: "Decibel Calculator",
    description: "Work with sound levels in decibels — combine several equal sources, find the level at a different distance, and see the safe listening time before hearing damage.",
    metaTitle: "Decibel Calculator — dB, Distance & Safe Time",
    metaDescription: "Free decibel calculator. Combine sound sources, find dB at a new distance and the safe exposure time for any noise level.",
    calcInputs: [
      numberField("level", "Sound Level of One Source", { unit: "dB", default: 95, min: -20, max: 200, step: 0.5 }),
      numberField("sources", "Number of Equal Sources", { default: 2, min: 1, max: 1000 }),
      numberField("distance1", "Distance Where Measured", { unit: "m", default: 1, max: 10000, step: 0.1 }),
      numberField("distance2", "New Distance", { unit: "m", default: 4, max: 10000, step: 0.1 }),
    ],
    calcResult: { label: "Level at New Distance", format: "number" },
    calcResults: [
      { key: "levelAtNewDistance", label: "Level at the New Distance (dB)", format: "number", highlight: true },
      { key: "combinedLevel", label: "Combined Level of All Sources (dB)", format: "number" },
      { key: "safeExposureHours", label: "Safe Exposure Time (Hours, NIOSH)", format: "number" },
      { key: "safeExposureMinutes", label: "Safe Exposure Time (Minutes)", format: "number" },
      { key: "loudnessVsOriginal", label: "Perceived Loudness vs One Source (×)", format: "number" },
    ],
    instructions: "Enter the level of one sound source and how many identical sources there are, the distance it was measured at and a new distance — for example your seat at a concert or the edge of a job site.",
    examples: "Example: two 95 dB sources measured at 1 m combine to 98.01 dB; 4 m away that falls to 85.97 dB, safe for about 384 minutes a day.",
    assumptions: "Equal sources add 10 × log₁₀(n) dB (two sources +3 dB). Outdoors, sound falls about 6 dB per doubling of distance; rooms reflect sound, so the drop is smaller indoors. Safe time uses NIOSH: 85 dB for 8 hours, halved for every 3 dB more. A +10 dB change sounds about twice as loud.",
    faq: [
      { question: "How loud is too loud?", answer: "Prolonged exposure above 85 dB can damage hearing; at 100 dB, NIOSH limits exposure to about 15 minutes a day." },
      { question: "Do two 80 dB sounds make 160 dB?", answer: "No — decibels are logarithmic, so two equal 80 dB sources make about 83 dB." },
    ],
  },
  {
    slug: "speaker-wattage-calculator",
    title: "Speaker Wattage Calculator",
    description: "Find how many amplifier watts your speakers need to reach a target loudness at your listening distance — from speaker sensitivity, number of speakers and headroom.",
    metaTitle: "Speaker Wattage Calculator — Amp Watts Needed",
    metaDescription: "Free speaker wattage calculator. Find the amplifier power needed to reach a target dB at your seat from speaker sensitivity and distance.",
    calcInputs: [
      numberField("targetDb", "Target Loudness at the Seat", { unit: "dB", default: 85, max: 130, step: 1 }),
      numberField("sensitivity", "Speaker Sensitivity (1 W / 1 m)", { unit: "dB", default: 87, max: 110, step: 0.5 }),
      numberField("distanceM", "Listening Distance", { unit: "m", default: 3, max: 100, step: 0.1 }),
      numberField("headroomDb", "Headroom for Peaks", { unit: "dB", default: 15, max: 30, step: 1 }),
      numberField("speakers", "Speakers Playing", { default: 2, min: 1, max: 20 }),
    ],
    calcResult: { label: "Watts per Speaker", format: "number" },
    calcResults: [
      { key: "wattsPerSpeaker", label: "Amp Power per Speaker for Peaks (W)", format: "number", highlight: true },
      { key: "rmsWattsRecommended", label: "Recommended Amp Rating per Channel (W)", format: "number" },
      { key: "splAt1WAndDistance", label: "Loudness at 1 W per Speaker at Your Seat (dB)", format: "number" },
      { key: "distanceLossDb", label: "Loss From Distance (dB)", format: "number" },
    ],
    instructions: "Enter how loud you want it at your seat, the speakers' sensitivity (from the spec sheet), the listening distance, headroom for musical and movie peaks, and how many speakers play together.",
    examples: "Example: 87 dB-sensitive speakers 3 m away need about 89.79 W each to hit 85 dB with 15 dB of peak headroom — choose an amp of about 113 W per channel.",
    assumptions: "Required dB above 1 W = target + 20·log₁₀(distance) + headroom − sensitivity − 10·log₁₀(speakers). Rooms usually add a few dB of reinforcement, so real needs can be lower. Every +3 dB needs double the power.",
    faq: [
      { question: "How many watts do my speakers need?", answer: "For typical 87 dB speakers in a living room, 50–150 W per channel gives clean peaks at movie volume." },
      { question: "Does a higher speaker sensitivity matter?", answer: "Yes — each 3 dB more sensitivity halves the amplifier power needed for the same loudness." },
    ],
  },
  {
    slug: "speaker-impedance-calculator",
    title: "Speaker Impedance Calculator",
    description: "Find the total impedance (ohms) when wiring speakers in series, parallel or series-parallel, and whether your amplifier can safely drive the load.",
    metaTitle: "Speaker Impedance Calculator — Series & Parallel",
    metaDescription: "Free speaker impedance calculator. Find the total ohms for speakers wired in series, parallel or series-parallel and check your amp's minimum load.",
    calcInputs: [
      numberField("speakers", "Number of Speakers", { default: 2, min: 1, max: 32 }),
      numberField("ohms", "Impedance of Each Speaker", { unit: "Ω", default: 8, max: 32, step: 1 }),
      dropdown("wiring", "Wiring", [["Series", 0], ["Parallel", 1], ["Series-parallel (pairs in series, pairs in parallel)", 2]], 1),
      numberField("ampMinOhms", "Amp's Minimum Rated Load", { unit: "Ω", default: 4, max: 16, step: 1 }),
    ],
    calcResult: { label: "Total Impedance", format: "number" },
    calcResults: [
      { key: "totalImpedance", label: "Total Impedance (Ω)", format: "number", highlight: true },
      { key: "safeForAmp", label: "Safe for Your Amp? (1 = Yes)", format: "number" },
      { key: "relativePowerVs8Ohm", label: "Power Draw vs an 8 Ω Load (×)", format: "number" },
      { key: "currentPerAmpWatt", label: "Current per Watt (A)", format: "number" },
    ],
    instructions: "Enter how many identical speakers you're wiring, each one's impedance and the wiring method, plus the lowest impedance your amplifier is rated for (on its back panel or manual).",
    examples: "Example: two 8 Ω speakers in parallel present 4 Ω — safe code 1 for an amp rated down to 4 Ω.",
    assumptions: "Series adds impedances; parallel divides (n identical speakers = Z ÷ n); series-parallel with pairs = 2Z ÷ number of pairs. Lower impedance draws more current and heat from the amplifier. Assumes identical speakers.",
    faq: [
      { question: "What happens if I wire two 8 ohm speakers in parallel?", answer: "The load drops to 4 ohms — fine for most amps rated at 4 ohms, but too low for some 8-ohm-only receivers." },
      { question: "Series or parallel speaker wiring?", answer: "Parallel keeps more power and is common for multiple speakers; series raises impedance, which is safer for amps but quieter." },
    ],
  },
  {
    slug: "headphone-impedance-calculator",
    title: "Headphone Impedance Calculator",
    description: "Check whether a phone, laptop or DAC can drive your headphones — power delivered, maximum loudness and damping factor — from headphone impedance and sensitivity and the source's output.",
    metaTitle: "Headphone Impedance Calculator — Do I Need an Amp?",
    metaDescription: "Free headphone impedance calculator. Find the power and max loudness your source delivers to your headphones and whether you need an amp.",
    calcInputs: [
      numberField("impedance", "Headphone Impedance", { unit: "Ω", default: 250, max: 1000, step: 1 }),
      numberField("sensitivity", "Headphone Sensitivity", { unit: "dB/mW", default: 96, max: 130, step: 0.5 }),
      numberField("outputVrms", "Source Maximum Output Voltage", { unit: "V rms", default: 1, max: 30, step: 0.05 }),
      numberField("outputImpedance", "Source Output Impedance", { unit: "Ω", default: 1, max: 200, step: 0.1, required: false }),
    ],
    calcResult: { label: "Max Loudness", format: "number" },
    calcResults: [
      { key: "maxSpl", label: "Maximum Loudness (dB SPL)", format: "number", highlight: true },
      { key: "powerMw", label: "Power Delivered (mW)", format: "number" },
      { key: "needsAmp", label: "Headphone Amp Recommended? (1 = Yes)", format: "number" },
      { key: "dampingFactor", label: "Damping Factor (8+ Is Good)", format: "number" },
      { key: "voltageNeededFor110Db", label: "Voltage Needed for 110 dB Peaks (V rms)", format: "number" },
    ],
    instructions: "Enter your headphones' impedance and sensitivity (if given in dB/V, subtract 10·log₁₀(1000 ÷ impedance) to convert) and the source's maximum output voltage and output impedance from its specs or a review.",
    examples: "Example: 250 Ω headphones at 96 dB/mW on a source with 1 V output get 3.97 mW and reach only 101.99 dB — amp code 1, so a headphone amplifier will help.",
    assumptions: "Power = V² ÷ Z (adjusted for the source's output impedance); SPL = sensitivity + 10·log₁₀(mW). About 110 dB of peak capability gives comfortable headroom. Phones typically output about 0.5–1 V rms; desktop amps 2–10 V+.",
    faq: [
      { question: "Do high-impedance headphones need an amp?", answer: "Often — 250–600 Ω headphones need more voltage than phones and laptops provide to reach comfortable volume with headroom." },
      { question: "What is damping factor?", answer: "Headphone impedance divided by the source's output impedance; above about 8 keeps bass tight and frequency response accurate." },
    ],
  },
  {
    slug: "audio-delay-calculator",
    title: "Audio Delay Calculator",
    description: "Calculate the delay in milliseconds to time-align speakers or a subwoofer — or delay towers at a venue — from the difference in distance to the listener.",
    metaTitle: "Audio Delay Calculator — Speaker Time Alignment",
    metaDescription: "Free audio delay calculator. Find the delay in milliseconds to time-align speakers, subwoofers and delay towers from distance and temperature.",
    calcInputs: [
      numberField("farDistanceFt", "Distance to the Farther Speaker", { unit: "ft", default: 14, max: 5000, step: 0.1 }),
      numberField("nearDistanceFt", "Distance to the Nearer Speaker", { unit: "ft", default: 9, max: 5000, step: 0.1 }),
      numberField("tempF", "Air Temperature", { unit: "°F", default: 68, min: -20, max: 120, step: 1 }),
    ],
    calcResult: { label: "Delay", format: "number" },
    calcResults: [
      { key: "delayMs", label: "Delay for the Nearer Speaker (ms)", format: "number", highlight: true },
      { key: "pathDifferenceFt", label: "Path Difference (ft)", format: "number" },
      { key: "samplesAt48k", label: "Delay in Samples at 48 kHz", format: "number" },
      { key: "speedOfSoundFtS", label: "Speed of Sound (ft/s)", format: "number" },
    ],
    instructions: "Measure from the listening position to each speaker (or from the main stage and a delay tower). Delay the nearer speaker by the result so both arrive at the same time.",
    examples: "Example: speakers 14 ft and 9 ft from the seat differ by 5 ft, so delay the nearer one by about 4.44 ms (213 samples at 48 kHz).",
    assumptions: "Speed of sound ≈ 1,086 + 1.1 × (°F − 32) ft/s — about 1,125 ft/s at 68°F, or roughly 1 ms per foot. Receivers' automatic room correction does this for you; venues often add 5–15 ms extra so the main stage is heard first (Haas effect).",
    faq: [
      { question: "How do I calculate speaker delay?", answer: "Divide the distance difference in feet by the speed of sound (about 1,125 ft/s) and multiply by 1,000 for milliseconds — about 1 ms per foot." },
      { question: "Why delay the closer speaker?", answer: "Sound from the closer speaker arrives first; delaying it lines up both arrivals for a clearer image and stronger bass." },
    ],
  },
  {
    slug: "subwoofer-box-calculator",
    title: "Subwoofer Box Calculator",
    description: "Design a sealed or ported subwoofer enclosure from the driver's Thiele/Small parameters (Fs, Qts, Vas) — box volume, low-frequency cutoff (F3), tuning frequency and cube size.",
    metaTitle: "Subwoofer Box Calculator — Sealed & Ported",
    metaDescription: "Free subwoofer box calculator. Find sealed or ported box volume, F3 and port tuning from your driver's Fs, Qts and Vas.",
    calcInputs: [
      numberField("fs", "Driver Resonance (Fs)", { unit: "Hz", default: 28, max: 200, step: 0.5 }),
      numberField("qts", "Total Q (Qts)", { default: 0.42, min: 0.1, max: 2, step: 0.01 }),
      numberField("vasLiters", "Equivalent Volume (Vas)", { unit: "L", default: 70, max: 2000, step: 1 }),
      dropdown("boxType", "Box Type", [["Sealed", 0], ["Ported (bass reflex)", 1]], 0),
      numberField("targetQtc", "Sealed Box Target Qtc", { default: 0.707, min: 0.5, max: 1.5, step: 0.01, required: false }),
    ],
    calcResult: { label: "Box Volume", format: "number" },
    calcResults: [
      { key: "boxLiters", label: "Net Internal Volume (L)", format: "number", highlight: true },
      { key: "boxCubicFeet", label: "Net Internal Volume (cu ft)", format: "number" },
      { key: "f3Hz", label: "Low-Frequency Cutoff F3 (Hz)", format: "number" },
      { key: "tuningHz", label: "Port Tuning / System Resonance (Hz)", format: "number" },
      { key: "cubeSideIn", label: "Cube Internal Side (in)", format: "number" },
    ],
    instructions: "Find the driver's Fs, Qts and Vas in its datasheet and choose sealed or ported. For sealed boxes, Qtc 0.707 gives the flattest response; 0.8–1.0 more punch in a smaller box. Add volume for the driver, port and bracing.",
    examples: "Example: a driver with Fs 28 Hz, Qts 0.42 and Vas 70 L needs about 38.18 L (1.35 cu ft) sealed for a 0.707 Qtc, reaching down to about 47.14 Hz.",
    assumptions: "Sealed: Vb = Vas ÷ ((Qtc ÷ Qts)² − 1), Fc = Fs × Qtc ÷ Qts. Ported uses the classic alignment approximations Vb = 15·Vas·Qts^2.87 and Fb = 0.42·Fs·Qts^−0.9. Drivers with Qts above about 0.5 suit sealed boxes; below 0.4 suit ported. Verify with modelling software (WinISD, etc.).",
    faq: [
      { question: "Sealed or ported subwoofer box?", answer: "Sealed boxes are smaller with tight, accurate bass; ported boxes play louder and deeper for the same power but are larger." },
      { question: "What is Qts?", answer: "A driver's total Q factor, which shows how well damped it is and which enclosure suits it." },
    ],
  },
  {
    slug: "led-resistor-calculator",
    title: "LED Resistor Calculator",
    description: "Find the series resistor value for one or more LEDs from the supply voltage, LED forward voltage and current — with resistor power and the nearest standard value.",
    metaTitle: "LED Resistor Calculator — Series Resistor Value",
    metaDescription: "Free LED resistor calculator. Find the resistor for LEDs from supply voltage, forward voltage and current, with power and nearest E12 value.",
    calcInputs: [
      numberField("supplyVolts", "Supply Voltage", { unit: "V", default: 5, max: 100, step: 0.1 }),
      numberField("forwardVolts", "LED Forward Voltage", { unit: "V", default: 2, max: 10, step: 0.05 }),
      numberField("currentMa", "LED Current", { unit: "mA", default: 20, max: 1000, step: 1 }),
      numberField("ledsInSeries", "LEDs in Series", { default: 1, min: 1, max: 20 }),
    ],
    calcResult: { label: "Resistor", format: "number" },
    calcResults: [
      { key: "nearestStandardOhms", label: "Nearest Standard Resistor (Ω)", format: "number", highlight: true },
      { key: "resistorOhms", label: "Exact Resistance (Ω)", format: "number" },
      { key: "resistorPowerW", label: "Resistor Power (W)", format: "number", decimals: 3 },
      { key: "actualCurrentMa", label: "Current With Standard Resistor (mA)", format: "number" },
      { key: "voltageTooLow", label: "Supply Too Low for These LEDs? (1 = Yes)", format: "number" },
    ],
    instructions: "Enter the supply voltage, the LED's forward voltage (red about 2 V, blue and white about 3 V) and current (often 20 mA for standard LEDs), and how many LEDs are in series.",
    examples: "Example: one red LED (2 V, 20 mA) on 5 V needs 150 Ω — use a 150 Ω resistor rated at least 0.06 W (a common 1/4 W resistor is fine).",
    assumptions: "R = (supply − LEDs × forward voltage) ÷ current; rounded up to the next E12 value so the current stays at or below the target. Pick a resistor rated at least twice the calculated power. High-power LEDs should use a constant-current driver instead.",
    faq: [
      { question: "What resistor do I need for an LED on 5V?", answer: "About 150 Ω for a red LED (2 V at 20 mA) and about 100 Ω for blue or white (3 V)." },
      { question: "Why does an LED need a resistor?", answer: "LEDs draw as much current as they can; the resistor limits current so the LED doesn't burn out." },
    ],
  },
  {
    slug: "smd-resistor-code-calculator",
    title: "SMD Resistor Code Calculator",
    description: "Decode the resistance of a surface-mount (SMD) resistor from its 3-digit or 4-digit marking — such as 103 or 1002 — in ohms, kilohms and megohms.",
    metaTitle: "SMD Resistor Code Calculator — 3 & 4 Digit Codes",
    metaDescription: "Free SMD resistor code calculator. Decode 3-digit and 4-digit SMD resistor markings like 103 or 4702 into ohms, kΩ and MΩ.",
    calcInputs: [
      numberField("code", "Marking (Digits Only)", { default: 472, max: 9999 }),
      dropdown("digits", "Code Type", [["3-digit (5% tolerance)", 0], ["4-digit (1% tolerance)", 1]], 0),
    ],
    calcResult: { label: "Resistance", format: "number" },
    calcResults: [
      { key: "resistanceOhms", label: "Resistance (Ω)", format: "number", highlight: true },
      { key: "resistanceKohms", label: "Resistance (kΩ)", format: "number" },
      { key: "resistanceMohms", label: "Resistance (MΩ)", format: "number" },
      { key: "tolerancePercent", label: "Typical Tolerance (%)", format: "number" },
    ],
    instructions: "Enter the digits printed on the resistor and choose 3- or 4-digit code. For markings with an R (like 4R7 = 4.7 Ω), the R is the decimal point; EIA-96 codes (two digits and a letter) use a separate lookup table.",
    examples: "Example: a resistor marked 472 is 47 × 10² = 4,700 Ω, or 4.7 kΩ.",
    assumptions: "3-digit codes: first two digits are significant, the third is the power of ten. 4-digit codes: first three digits significant, the fourth the multiplier. A marking of 000 or 0 is a zero-ohm jumper.",
    faq: [
      { question: "What does 103 mean on an SMD resistor?", answer: "10 × 10³ = 10,000 Ω, or 10 kΩ." },
      { question: "What does 1002 mean on a resistor?", answer: "100 × 10² = 10,000 Ω (10 kΩ) — a 4-digit code usually used on 1% resistors." },
    ],
  },
];

async function ensureCategory() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategory();

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
