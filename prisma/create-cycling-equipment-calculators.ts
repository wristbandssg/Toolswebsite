// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the cycling sub-batch B (Gearing, Wheels, Tires & Bike). See
// src/lib/calc-engine-cycling-fit.ts for the full list
// of 4 sub-batches (47 tools under Sports Calculators > Cycling
// Calculators), and src/lib/calc-engine-cycling-equipment.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-cycling-equipment-calculators.ts
// or
//   npm run db:create-cycling-equipment-calculators

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
const pct = (key: string, label: string, highlight = false) => ({ key, label, format: "percentage", ...(highlight ? { highlight: true } : {}) });

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
}
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });
const WHEEL = [
  dropdown("wheelSize", "Wheel / Tire Size", [["700×23c (2096 mm)", 1], ["700×25c (2105 mm)", 2], ["700×28c (2136 mm)", 3], ["700×32c (2155 mm)", 4], ["700×40c gravel (2200 mm)", 5], ["26×2.1 MTB (2068 mm)", 6], ["27.5×2.3 MTB (2180 mm)", 7], ["29×2.3 MTB (2300 mm)", 8], ["20×1.75 BMX (1515 mm)", 9], ["16×1.75 kids (1272 mm)", 10]], 2),
  numberField("customCircumferenceMm", "Custom Wheel Circumference (mm, 0 = Use Size)", { default: 0, max: 3000, required: false }),
];
const RING = numberField("chainring", "Chainring Teeth", { default: 50, min: 1, max: 80 });
const COG = numberField("cog", "Rear Cog Teeth", { default: 17, min: 1, max: 60 });
const BSD = dropdown("beadSeatMm", "Wheel Size (Bead Seat Diameter)", [["700c / 29er (622 mm)", 622], ["650b / 27.5 (584 mm)", 584], ["650c (571 mm)", 571], ["26 in (559 mm)", 559], ["24 in (507 mm)", 507], ["20 in BMX (406 mm)", 406], ["16 in (305 mm)", 305], ["12 in (203 mm)", 203]], 622);
const BIKE_TYPE = dropdown("bikeType", "Bike Type", [["Road", 1], ["Gravel / all-road", 2], ["Mountain bike", 3]], 1);

const TOOLS: ToolDef[] = [
  {
    slug: "bike-gear-ratio-calculator",
    title: "Bike Gear Ratio Calculator",
    description: "Calculate bike gear ratio, gear inches, metres of development and gain ratio from chainring, cog and wheel size — plus the chainring for a target gear (also a BMX gear and chainring calculator).",
    metaTitle: "Bike Gear Ratio Calculator — Gear Inches & Development",
    metaDescription: "Free bike gear ratio calculator. Get gear ratio, gear inches, development and gain ratio for road, MTB or BMX, and the chainring for a target gear.",
    calcInputs: [RING, COG, ...WHEEL, numberField("crankLengthMm", "Crank Length (mm)", { default: 172.5, min: 100, max: 200, step: 2.5 }), numberField("targetGearInches", "Target Gear Inches (Optional, e.g. BMX 55)", { default: 0, max: 150, step: 0.5, required: false })],
    calcResult: { label: "Gear Ratio", format: "number" },
    calcResults: [num("gearRatio", "Gear Ratio", true), num("gearInches", "Gear Inches"), num("developmentM", "Development (m per Crank Turn)"), num("gainRatio", "Gain Ratio"), num("chainringForTarget", "Chainring for Target Gear Inches")],
    instructions: "Enter chainring and cog teeth and choose the wheel size (or type your measured rollout circumference). For BMX, enter a target gear inches to find the chainring.",
    examples: "Example: 50×17 on 700×25c is a 2.94 ratio — 77.6 gear inches and 6.19 m per pedal turn. A BMX rider wanting 55 gear inches with a 16T cog on 20×1.75 tires (about 19 in actual diameter) needs about a 46T chainring.",
    assumptions: "Ratio = chainring ÷ cog; gear inches = ratio × wheel diameter (in); development = ratio × circumference; gain ratio (Sheldon Brown) = ratio × wheel radius ÷ crank length. Circumferences are typical rollout values. " + DISCLAIMER,
    faq: [
      { question: "What is a common BMX gear ratio?", answer: "Around 55 gear inches — e.g. 44/16 or 25/9 on nominal 20 in wheels; racers often run 57–60." },
      { question: "Gear inches or development?", answer: "Same idea in different units — gear inches is the equivalent penny-farthing wheel diameter, development the metres travelled per pedal turn." },
    ],
  },
  {
    slug: "bicycle-gear-speed-calculator",
    title: "Bicycle Gear Speed Calculator",
    description: "Calculate cycling speed from gear and cadence — or the cadence you need for a target speed (also a bike cadence calculator).",
    metaTitle: "Bicycle Gear Speed Calculator — Speed & Cadence",
    metaDescription: "Free bicycle gear speed calculator. Get speed in km/h and mph from chainring, cog, wheel and cadence, or the cadence for a target speed.",
    calcInputs: [RING, COG, ...WHEEL, numberField("cadence", "Cadence (rpm)", { default: 90, max: 200 }), numberField("targetSpeedKmh", "Target Speed (km/h)", { default: 40, max: 100, step: 0.5 })],
    calcResult: { label: "Speed", format: "number" },
    calcResults: [num("speedKmh", "Speed (km/h)", true), num("speedMph", "Speed (mph)"), num("cadenceForTargetSpeed", "Cadence for Target Speed (rpm)"), num("developmentM", "Development (m per Crank Turn)")],
    instructions: "Enter the gear, wheel size and your cadence — and a target speed to see the cadence it needs in that gear.",
    examples: "Example: 50×17 on 700×25c at 90 rpm is 33.4 km/h (20.8 mph). Holding 40 km/h in that gear needs about 108 rpm.",
    assumptions: "Speed = cadence × development × 60. Assumes no slip and a typical tire rollout. Most riders are efficient at 80–95 rpm. " + DISCLAIMER,
    faq: [
      { question: "What is a good cycling cadence?", answer: "80–95 rpm suits most road riders; climbing is often 70–85 rpm." },
      { question: "Why does my computer show a slightly different speed?", answer: "Real tire circumference varies with pressure, load and tread — measure your rollout for best accuracy." },
    ],
  },
  {
    slug: "bike-chain-length-calculator",
    title: "Bike Chain Length Calculator",
    description: "Calculate how many links your bike chain needs from chainstay length and the largest chainring and cog.",
    metaTitle: "Bike Chain Length Calculator — Number of Links",
    metaDescription: "Free bike chain length calculator. Get the number of links from chainstay length, largest chainring and largest cog.",
    calcInputs: [numberField("chainstayMm", "Chainstay Length (mm, BB Centre to Rear Axle)", { default: 410, min: 300, max: 600 }), numberField("largestChainring", "Largest Chainring (Teeth)", { default: 50, min: 10, max: 80 }), numberField("largestCog", "Largest Cog (Teeth)", { default: 32, min: 10, max: 60 })],
    calcResult: { label: "Chain Links", format: "number" },
    calcResults: [num("chainLinks", "Chain Links (Even)", true), num("chainLengthIn", "Chain Length (in)"), num("exactLengthIn", "Exact Calculated Length (in)")],
    instructions: "Measure the chainstay from the centre of the bottom bracket to the centre of the rear axle, then enter the largest chainring and cog.",
    examples: "Example: a 410 mm chainstay with a 50T big ring and 32T cassette needs a 108-link chain.",
    assumptions: "Length (in) = 2 × chainstay (in) + (chainring + cog) ÷ 4 + 1, rounded up to whole inches (an even link count). Check it on the bike: big ring + big cog without stretching the derailleur, and follow the derailleur maker's rule (e.g. SRAM's chain gauge for 12-speed and full-suspension bikes). " + DISCLAIMER,
    faq: [
      { question: "What if I have a full-suspension bike?", answer: "Size the chain with the shock deflated and the suspension compressed to where the chainstay is longest." },
      { question: "Why must chains have an even number of links?", answer: "Chains alternate inner and outer links, so a standard joining link needs an even count." },
    ],
  },
  {
    slug: "spoke-length-calculator",
    title: "Spoke Length Calculator",
    description: "Calculate spoke length for a wheel build from rim ERD, hub flange diameter and offset, spoke count and crossing pattern (also a wheel build calculator).",
    metaTitle: "Spoke Length Calculator — Wheel Building",
    metaDescription: "Free spoke length calculator for wheel building. Get spoke length from ERD, flange diameter, flange offset, spoke count and crosses.",
    calcInputs: [numberField("erdMm", "Rim ERD (Effective Rim Diameter, mm)", { default: 601, min: 100, max: 700, step: 0.5 }), numberField("flangeDiameterMm", "Hub Flange Diameter (Hole Circle, mm)", { default: 45, min: 10, max: 120, step: 0.5 }), numberField("flangeOffsetMm", "Flange to Hub Centre (mm, This Side)", { default: 35, max: 80, step: 0.1 }), numberField("spokeCount", "Spoke Count (Whole Wheel)", { default: 28, min: 4, max: 48, step: 2 }), dropdown("crosses", "Lacing Pattern", [["Radial (0-cross)", 0], ["1-cross", 1], ["2-cross", 2], ["3-cross", 3], ["4-cross", 4]], 2), numberField("spokeHoleMm", "Hub Spoke Hole Diameter (mm)", { default: 2.6, max: 5, step: 0.1 })],
    calcResult: { label: "Spoke Length", format: "number" },
    calcResults: [num("spokeLengthMm", "Calculated Spoke Length (mm)", true), num("orderLengthMm", "Order Length (Rounded Down to 2 mm)"), num("spokesPerSide", "Spokes per Side")],
    instructions: "Enter the rim ERD and the hub's flange diameter and centre-to-flange distance for the side you're calculating (drive and non-drive sides differ), then the spoke count and lacing.",
    examples: "Example: a 601 mm ERD rim on a 45 mm flange, 35 mm offset, 28 spokes laced 2-cross needs about 287.8 mm spokes — order 286 mm.",
    assumptions: "Standard formula: L = √(offset² + R² + r² − 2Rr cos(720° × crosses ÷ spokes)) − hole ÷ 2, with R = ERD ÷ 2 and r = flange diameter ÷ 2. Calculate each side separately; check maker ERD by measuring. Spoke stretch and nipple type can shift the ideal length by ~1 mm. " + DISCLAIMER,
    faq: [
      { question: "What is ERD?", answer: "Effective Rim Diameter — the diameter where the spoke ends sit inside the nipples." },
      { question: "How many crosses should I use?", answer: "3-cross for most 32-spoke wheels, 2-cross for 24–28 spokes, radial only for front wheels or non-disc rims that allow it." },
    ],
  },
  {
    slug: "bicycle-tire-size-calculator",
    title: "Bicycle Tire Size Calculator",
    description: "Convert a bicycle tire size (ETRTO width and bead seat diameter) into outer diameter, circumference and inches.",
    metaTitle: "Bicycle Tire Size Calculator — ETRTO to Diameter",
    metaDescription: "Free bicycle tire size calculator. Convert ETRTO sizes like 25-622 into outer diameter, circumference and inches.",
    calcInputs: [numberField("tireWidthMm", "Tire Width (mm, e.g. 25 in 25-622)", { default: 25, min: 10, max: 130 }), BSD],
    calcResult: { label: "Outer Diameter", format: "number" },
    calcResults: [num("outerDiameterMm", "Outer Diameter (mm)", true), num("outerDiameterIn", "Outer Diameter (in)"), num("circumferenceMm", "Circumference (mm)"), num("widthInches", "Width (in)")],
    instructions: "Read the ETRTO size on the tire sidewall (e.g. 25-622 means 25 mm wide on a 622 mm bead seat) and enter it.",
    examples: "Example: a 25-622 tire (700×25c) is about 672 mm tall with a 2,111 mm circumference.",
    assumptions: "Outer diameter ≈ bead seat diameter + 2 × width (tire height is about equal to width). Measured rollout varies a little by brand, rim width and pressure. 622 mm = 700c and 29er; 584 = 650b/27.5; 559 = 26 in. " + DISCLAIMER,
    faq: [
      { question: "Are 700c and 29er the same?", answer: "Yes — both use a 622 mm bead seat; 29er just refers to wide MTB tires." },
      { question: "What does 700×25c mean?", answer: "An old French size: about 700 mm outer diameter and 25 mm wide. The ETRTO equivalent is 25-622." },
    ],
  },
  {
    slug: "bike-tire-pressure-calculator",
    title: "Bike Tire Pressure Calculator",
    description: "Find the right front and rear bike tire pressure from rider and bike weight, tire width, surface and tubeless setup — for road, gravel and mountain bikes.",
    metaTitle: "Bike Tire Pressure Calculator — Road, Gravel & MTB",
    metaDescription: "Free bike tire pressure calculator. Get front and rear psi and bar from rider weight, tire width, surface and tubeless setup.",
    calcInputs: [numberField("riderWeight", "Rider Weight (with Kit)", { default: 72, max: 200, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("bikeWeightKg", "Bike Weight (kg)", { default: 8, max: 40, step: 0.1 }), numberField("tireWidthMm", "Tire Width (mm, Measured)", { default: 28, min: 18, max: 130 }), percentField("frontLoadPercent", "Weight on Front Wheel", { default: 45, min: 30, max: 60 }), dropdown("surface", "Surface", [["Smooth tarmac", 1], ["Rough / chip seal", 2], ["Gravel / dirt", 3]], 1), dropdown("tubeless", "Setup", [["Inner tubes", 0], ["Tubeless", 1]], 0)],
    calcResult: { label: "Rear Pressure", format: "number" },
    calcResults: [num("rearPsi", "Rear Pressure (psi)", true), num("frontPsi", "Front Pressure (psi)"), num("rearBar", "Rear Pressure (bar)"), num("frontBar", "Front Pressure (bar)"), num("systemWeightKg", "Rider + Bike (kg)")],
    instructions: "Enter rider weight with kit, bike weight, the measured tire width, front/rear weight split, surface and whether you run tubeless.",
    examples: "Example: a 72 kg rider on an 8 kg road bike with 28 mm tires on smooth roads starts at about 75 psi rear and 61 psi front (5.2 / 4.2 bar).",
    assumptions: "Pressure rises with wheel load and falls with tire width (fitted to typical 15%-tire-drop recommendations), −8% for rough roads, −15% for gravel, −5% tubeless. Never exceed the tire or rim maximum (hookless rims: usually 72.5 psi / 5 bar) — check the sidewall. Fine-tune for comfort and grip. " + DISCLAIMER,
    faq: [
      { question: "Why lower front than rear?", answer: "The rear wheel carries more weight — usually 55–60% — so it needs more pressure." },
      { question: "Are wider tires faster at lower pressure?", answer: "Often yes — on real roads, wider tires at lower pressure roll as fast or faster and are more comfortable." },
    ],
  },
  {
    slug: "tire-width-calculator",
    title: "Tire Width Calculator",
    description: "Match bike tire width to inner rim width — the ideal tire range for your rim, or the ideal rim for your tire (also a rim width calculator).",
    metaTitle: "Tire Width Calculator — Tire & Rim Width Match",
    metaDescription: "Free bike tire width calculator. Find the ideal tire width for your inner rim width, or the ideal rim width for your tire.",
    calcInputs: [numberField("innerRimWidthMm", "Inner Rim Width (mm)", { default: 21, min: 10, max: 100, step: 0.5 }), numberField("tireWidthMm", "Tire Width (mm)", { default: 28, min: 10, max: 130 }), BIKE_TYPE],
    calcResult: { label: "Ideal Tire Width", format: "number" },
    calcResults: [num("idealTireMm", "Ideal Tire Width for Your Rim (mm)", true), num("minTireMm", "Narrowest Suggested Tire (mm)"), num("maxTireMm", "Widest Suggested Tire (mm)"), num("idealRimForTireMm", "Ideal Inner Rim for Your Tire (mm)"), num("tireToRimRatio", "Your Tire ÷ Rim Ratio")],
    instructions: "Enter your rim's internal width (not external) and your tire width, and choose the bike type.",
    examples: "Example: a 21 mm internal road rim suits tires around 28 mm (about 23–37 mm). A 28 mm tire's ideal rim is about 21 mm internal.",
    assumptions: "Ideal tire ≈ inner rim × 1.35 (road), 1.65 (gravel) or 2.0 (MTB), with a range of −20% to +30%. Always check the ETRTO table and the rim maker's approved tire sizes — especially for hookless rims, which have minimum tire widths. " + DISCLAIMER,
    faq: [
      { question: "Does rim width change tire width?", answer: "Yes — a tire measures about 0.4 mm wider for each extra mm of rim width." },
      { question: "Can I put a 25 mm tire on a 25 mm rim?", answer: "Many hookless rims require 28 mm or wider — follow the rim maker's minimum." },
    ],
  },
  {
    slug: "tire-volume-calculator",
    title: "Tire Volume Calculator",
    description: "Estimate the air volume of a bike tire from width and wheel size — and how much more air a wider tire holds.",
    metaTitle: "Tire Volume Calculator — Bike Tire Air Volume",
    metaDescription: "Free bike tire volume calculator. Estimate air volume in litres and cubic inches and compare two tire widths.",
    calcInputs: [numberField("tireWidthMm", "Tire Width (mm)", { default: 28, min: 10, max: 130 }), BSD, numberField("compareWidthMm", "Compare Width (mm)", { default: 32, min: 10, max: 130 })],
    calcResult: { label: "Volume", format: "number" },
    calcResults: [num("volumeLitres", "Air Volume (L)", true), num("volumeCubicInches", "Air Volume (in³)"), num("compareVolumeLitres", "Compare Tire Volume (L)"), pct("volumeChangePercent", "Volume Change")],
    instructions: "Enter the tire width and wheel size, plus a second width to compare.",
    examples: "Example: a 28 mm road tire holds about 0.94 L of air; a 32 mm tire about 1.24 L — 31% more, which lets you run lower pressure for the same support.",
    assumptions: "Treats the tire as a ring (torus) with a near-circular cross-section, about 75% of which is air (the rim fills the rest). An estimate — actual volume depends on rim width and casing shape. " + DISCLAIMER,
    faq: [
      { question: "Why does tire volume matter?", answer: "More volume supports the same load at lower pressure — more comfort, grip and puncture resistance." },
      { question: "How much CO₂ do I need?", answer: "A 16 g cartridge fills a 700×25–28 road tire to about 80–100 psi; larger tires need 20–25 g." },
    ],
  },
  {
    slug: "tire-clearance-calculator",
    title: "Tire Clearance Calculator",
    description: "Find the widest tire your frame or fork fits from the narrowest gap, the safety clearance and your rim width.",
    metaTitle: "Tire Clearance Calculator — Max Tire Width",
    metaDescription: "Free bike tire clearance calculator. Find the widest tire your frame or fork fits from the gap, safety clearance and rim width.",
    calcInputs: [numberField("frameGapMm", "Narrowest Gap at Tire (mm)", { default: 40, max: 150, step: 0.5 }), numberField("sideClearanceMm", "Safety Clearance per Side (mm)", { default: 6, max: 20, step: 0.5 }), numberField("innerRimWidthMm", "Inner Rim Width (mm)", { default: 21, min: 10, max: 100, step: 0.5 })],
    calcResult: { label: "Max Tire Width", format: "number" },
    calcResults: [num("maxActualTireMm", "Max Actual Tire Width (mm)", true), num("maxLabelledTireMm", "Max Labelled Tire Size (mm)"), num("clearancePerSideMm", "Clearance per Side (mm)")],
    instructions: "Measure the narrowest gap where the tire passes — usually between the chainstays, seatstays or fork blades — and choose your safety margin.",
    examples: "Example: a 40 mm gap with 6 mm per side leaves room for a 28 mm-wide tire — a labelled 27 mm on a 21 mm internal rim.",
    assumptions: "Max tire = gap − 2 × clearance. ISO 4210 calls for about 6 mm clearance; allow more for mud. Labelled size is lower on wide rims because tires measure about 0.4 mm wider per mm of rim beyond 19 mm. Check height (crown and brake bridge) too. " + DISCLAIMER,
    faq: [
      { question: "How much tire clearance is enough?", answer: "About 4–6 mm per side for dry roads, more for mud, gravel and frame flex." },
      { question: "Will a 32 mm tire fit my road bike?", answer: "Measure — many modern endurance bikes take 32–35 mm; older race frames often max out at 25–28 mm." },
    ],
  },
  {
    slug: "tubeless-sealant-calculator",
    title: "Tubeless Sealant Calculator",
    description: "Find how much tubeless sealant to put in each tire from width and wheel size — and how often to top it up.",
    metaTitle: "Tubeless Sealant Calculator — How Much Sealant",
    metaDescription: "Free tubeless sealant calculator. Get sealant amount in ml and oz per tire for road, gravel and MTB, plus a top-up schedule.",
    calcInputs: [numberField("tireWidthMm", "Tire Width (mm)", { default: 40, min: 20, max: 130 }), BSD, dropdown("conditions", "Riding Conditions", [["Normal", 1], ["Thorns / puncture-prone (+25%)", 2]], 1), dropdown("climate", "Climate", [["Hot and dry", 1], ["Temperate", 2], ["Cool and humid", 3]], 2)],
    calcResult: { label: "Sealant per Tire", format: "number" },
    calcResults: [num("sealantPerTireMl", "Sealant per Tire (ml)", true), num("sealantPerTireOz", "Sealant per Tire (fl oz)"), num("sealantBothTiresMl", "Both Tires (ml)"), num("topUpMonths", "Top Up Every (Months)")],
    instructions: "Enter tire width and wheel size and choose your conditions and climate.",
    examples: "Example: a 40 mm 700c gravel tire needs about 58 ml (2 oz) of sealant — about 117 ml for the pair, topped up roughly every 4 months.",
    assumptions: "Sealant ≈ 0.0022 × width × (bead seat + width) ml, which gives about 40 ml for 28 mm road, 60 ml for 40 mm gravel and 90 ml for a 29×2.4 MTB tire. Sealant dries faster in heat — check it every month or two. Follow the sealant maker's guidance. " + DISCLAIMER,
    faq: [
      { question: "How much sealant for a road tire?", answer: "About 30–45 ml per tire for 25–32 mm road tires." },
      { question: "How do I know when to add sealant?", answer: "Shake the wheel and listen for sloshing — or remove the valve core and check with a dipstick." },
    ],
  },
  {
    slug: "bike-weight-calculator",
    title: "Bike Weight Calculator",
    description: "See your total bike + rider system weight and how much time a lighter bike or body would save on a climb.",
    metaTitle: "Bike Weight Calculator — Does Weight Matter?",
    metaDescription: "Free bike weight calculator. See system weight and how much time saving 1 kg saves on a climb at your power.",
    calcInputs: [numberField("bikeWeightKg", "Bike Weight (kg)", { default: 9, max: 40, step: 0.1 }), numberField("riderWeightKg", "Rider Weight (kg)", { default: 75, max: 200, step: 0.5 }), numberField("gearWeightKg", "Bottles, Kit & Gear (kg)", { default: 1, max: 20, step: 0.1 }), numberField("weightSavingKg", "Weight Saving to Test (kg)", { default: 1, max: 20, step: 0.1 }), numberField("climbKm", "Climb Length (km)", { default: 10, max: 100, step: 0.1 }), numberField("gradientPercent", "Average Gradient (%)", { default: 7, max: 25, step: 0.1 }), numberField("powerWatts", "Your Climbing Power (W)", { default: 250, max: 1000 })],
    calcResult: { label: "Seconds Saved", format: "number" },
    calcResults: [num("secondsSaved", "Seconds Saved on the Climb", true), num("systemWeightKg", "System Weight (kg)"), num("bikeShareOfSystemPercent", "Bike Share of System Weight (%)"), num("climbTimeMinutes", "Climb Time Now (min)"), num("newClimbTimeMinutes", "Climb Time Lighter (min)")],
    instructions: "Enter bike, rider and gear weight, the saving you're considering, and a climb with the power you'd ride it at.",
    examples: "Example: 85 kg total at 250 W up a 10 km, 7% climb takes about 45 minutes — 1 kg less saves about 27 seconds.",
    assumptions: "Solves climbing speed from power with gravity, rolling resistance (Crr 0.005) and air drag (CdA 0.4) at 97.5% drivetrain efficiency. Weight matters most on steep climbs; on flat roads aerodynamics dominate. " + DISCLAIMER,
    faq: [
      { question: "Is losing body weight the same as bike weight?", answer: "For climbing physics, yes — a kilo is a kilo, but body weight loss can cost power if overdone." },
      { question: "How much time does 1 kg save?", answer: "Roughly 1% of climbing time on a steep climb for an 80–85 kg system." },
    ],
  },
  {
    slug: "bike-value-calculator",
    title: "Bike Value Calculator",
    description: "Estimate the resale value of a used bike from its original price, age, type and condition — road, mountain, e-bike or kids/BMX.",
    metaTitle: "Bike Value Calculator — Used Bike Resale Value",
    metaDescription: "Free used bike value calculator. Estimate resale value from purchase price, age, bike type and condition.",
    calcInputs: [currencyField("purchasePrice", "Original Purchase Price", { default: 2000, max: 50000 }), numberField("ageYears", "Age (Years)", { default: 3, max: 30, step: 0.5 }), dropdown("bikeType", "Bike Type", [["Road / gravel", 1], ["Mountain bike", 2], ["E-bike", 3], ["Kids / BMX", 4]], 1), dropdown("condition", "Condition", [["Excellent", 1], ["Good", 2], ["Fair", 3], ["Poor", 4]], 2), currencyField("upgradesValue", "Upgrades Added (Value)", { default: 0, max: 20000, required: false })],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [cur("estimatedValue", "Estimated Resale Value", true), cur("quickSalePrice", "Quick-Sale Price"), pct("valueRetainedPercent", "Value Retained")],
    instructions: "Enter what the bike cost new, its age, type, condition and the value of any upgrades.",
    examples: "Example: a $2,000 road bike that's 3 years old in good condition is worth about $964 — around 48% of its price.",
    assumptions: "Depreciation: road 30% in year 1 then 10%/yr; MTB 35% then 12%; e-bikes 35% then 15% (battery wear); kids/BMX 40% then 10%. Condition multiplier 100% / 85% / 65% / 45%; upgrades add half their value; floor 10% of price. Brand, size and demand move real prices — check local listings. " + DISCLAIMER,
    faq: [
      { question: "Why do e-bikes lose value fast?", answer: "Battery wear and fast-moving motor and battery tech make older e-bikes less desirable." },
      { question: "How can I get more for my bike?", answer: "Clean it, fix small issues, include receipts and service history, and price in line with local listings." },
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
