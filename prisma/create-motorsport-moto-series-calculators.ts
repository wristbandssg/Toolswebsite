// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the motorsports sub-batch E (Series Points, Motorcycles & Karts). See
// src/lib/calc-engine-motorsport-engine.ts for the full list
// of 5 sub-batches (55 tools under Sports Calculators > Motorsports &
// Racing Calculators), and src/lib/calc-engine-motorsport-moto-series.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-motorsport-moto-series-calculators.ts
// or
//   npm run db:create-motorsport-moto-series-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Motorsports & Racing Calculators", slug: "motorsports-racing-calculators" };

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

const DISCLAIMER =
  "Estimates for planning and education only. Motorsport is dangerous: confirm figures against your manufacturer's specifications, a qualified mechanic or engine builder, and your series' official rules, and always use proper safety equipment.";

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

const TOOLS: ToolDef[] = [
  {
    slug: "f1-points-calculator",
    title: "F1 Points Calculator",
    description: "Calculate Formula 1 championship points for a Grand Prix and sprint finish under the 2025 rules — and whether a title is still mathematically possible.",
    metaTitle: "F1 Points Calculator — Race & Sprint Points",
    metaDescription: "Free F1 points calculator. Get Grand Prix and sprint points by position (2025 rules) and check if the title is still possible.",
    calcInputs: [numberField("racePosition", "Grand Prix Finish (0 = DNF / Didn't Score)", { default: 1, max: 22 }), numberField("sprintPosition", "Sprint Finish (0 = No Sprint)", { default: 0, max: 22, required: false }), numberField("gapToLeader", "Points Behind the Leader", { default: 40, max: 1000 }), numberField("racesRemaining", "Grands Prix Remaining", { default: 4, max: 30 }), numberField("sprintsRemaining", "Sprints Remaining", { default: 1, max: 10 })],
    calcResult: { label: "Weekend Points", format: "number" },
    calcResults: [num("weekendPoints", "Points This Weekend", true), num("racePoints", "Grand Prix Points"), num("sprintPoints", "Sprint Points"), num("maxPointsRemaining", "Maximum Points Still Available"), num("titleStillPossible", "Title Still Possible (1 Yes, 0 No)"), num("racesNeededToCloseGap", "Wins Needed (Leader 2nd Each Time)")],
    instructions: "Enter the Grand Prix and sprint finishing positions, then the points gap to the championship leader and the races and sprints left.",
    examples: "Example: a Grand Prix win scores 25 points. With 4 Grands Prix and 1 sprint left, 108 points are still available, so a 40-point gap can still be closed — it would take 6 wins with the leader second each time.",
    assumptions: "2025 F1 points: 25-18-15-12-10-8-6-4-2-1 for the top 10 in a Grand Prix and 8-7-6-5-4-3-2-1 for the top 8 in a sprint. There's no fastest-lap point from 2025. Ties are broken by number of wins. " + DISCLAIMER,
    faq: [
      { question: "Is there a fastest-lap point in F1?", answer: "Not since 2025 — the bonus point for fastest lap (introduced in 2019) was dropped." },
      { question: "How many points for a sprint win?", answer: "8 points, down to 1 point for 8th." },
    ],
  },
  {
    slug: "nascar-points-calculator",
    title: "NASCAR Points Calculator",
    description: "Calculate NASCAR Cup Series points for a race from your finishing position and stage results — plus playoff points.",
    metaTitle: "NASCAR Points Calculator — Race & Stage Points",
    metaDescription: "Free NASCAR points calculator. Get Cup Series race points, stage points and playoff points from finishing and stage positions.",
    calcInputs: [numberField("finishPosition", "Finishing Position", { default: 5, min: 1, max: 40 }), numberField("stage1Position", "Stage 1 Finish (0 = Outside Top 10)", { default: 3, max: 40 }), numberField("stage2Position", "Stage 2 Finish (0 = Outside Top 10)", { default: 2, max: 40 }), numberField("stage3Position", "Stage 3 Finish (0 = No 3rd Stage)", { default: 0, max: 40, required: false })],
    calcResult: { label: "Total Points", format: "number" },
    calcResults: [num("totalPoints", "Total Race Points", true), num("finishPoints", "Finishing Points"), num("stagePoints", "Stage Points"), num("playoffPoints", "Playoff Points Earned"), num("maxPossible", "Maximum Possible This Race")],
    instructions: "Enter where you finished the race and each stage. Most Cup races have two stages before the final one; the Coca-Cola 600 has three.",
    examples: "Example: finishing 5th (32 points) after placing 3rd in Stage 1 (8) and 2nd in Stage 2 (9) earns 49 points.",
    assumptions: "Cup Series: winner 40, 2nd 35 then one fewer per place to 36th (1), 37th–40th 1 point; top 10 in each stage score 10 down to 1. Playoff points: 5 per race win, 1 per stage win. Penalties not included. " + DISCLAIMER,
    faq: [
      { question: "How many points does a NASCAR win get?", answer: "40 points plus any stage points — up to 60 for sweeping both stages and the race." },
      { question: "What are playoff points?", answer: "Bonus points (5 per win, 1 per stage win) that carry into each playoff round reset." },
    ],
  },
  {
    slug: "motorcycle-sprocket-calculator",
    title: "Motorcycle Sprocket Calculator",
    description: "Compare motorcycle sprocket combinations — final drive ratio, percentage change and top speed at redline (also a motorcycle gear ratio calculator).",
    metaTitle: "Motorcycle Sprocket Calculator — Gearing & Speed",
    metaDescription: "Free motorcycle sprocket and gear ratio calculator. Compare front/rear sprocket changes, ratio % and top speed.",
    calcInputs: [
      numberField("frontOld", "Current Front Sprocket (Teeth)", { default: 15, min: 1, max: 60 }),
      numberField("rearOld", "Current Rear Sprocket (Teeth)", { default: 45, min: 1, max: 100 }),
      numberField("frontNew", "New Front Sprocket (Teeth)", { default: 14, min: 1, max: 60 }),
      numberField("rearNew", "New Rear Sprocket (Teeth)", { default: 45, min: 1, max: 100 }),
      numberField("primaryRatio", "Primary Reduction", { default: 1.6, min: 0.1, max: 5, step: 0.001 }),
      numberField("topGearRatio", "Top Gear Ratio", { default: 1, min: 0.1, max: 5, step: 0.001 }),
      numberField("redline", "Redline RPM", { default: 11000, max: 25000, step: 100 }),
      numberField("tireDiameter", "Rear Tire Diameter (in)", { default: 25, min: 1, max: 40, step: 0.1 }),
    ],
    calcResult: { label: "New Ratio", format: "number" },
    calcResults: [num("newRatio", "New Final Drive Ratio", true), num("oldRatio", "Current Ratio"), pct("ratioChangePercent", "Ratio Change (+ = Shorter / Quicker)"), num("topSpeedOldMph", "Theoretical Top Speed Before (mph)"), num("topSpeedNewMph", "Theoretical Top Speed After (mph)"), num("equivalentRearTeethChange", "Equivalent Rear Teeth Change")],
    instructions: "Enter your current and new sprocket sizes. For top speed, add the primary reduction, top gear ratio, redline and tire diameter from your service manual.",
    examples: "Example: going from 15/45 to 14/45 changes the ratio from 3.00 to 3.21 — 7.1% shorter for quicker acceleration, the same as adding about 3 rear teeth.",
    assumptions: "Ratio = rear ÷ front. Top speed is theoretical (at redline in top gear) — drag usually limits it first. One tooth at the front ≈ three at the rear. " + DISCLAIMER,
    faq: [
      { question: "Does going down a tooth in front add acceleration?", answer: "Yes — a smaller front or larger rear sprocket shortens gearing for quicker acceleration and lower top speed." },
      { question: "Will I need a new chain?", answer: "Bigger changes alter the chain length — check with the Motorcycle Chain Length Calculator and your axle adjustment range." },
    ],
  },
  {
    slug: "motorcycle-chain-length-calculator",
    title: "Motorcycle Chain Length Calculator",
    description: "Work out how many chain links you need for your sprockets, chain size and axle-to-countershaft distance.",
    metaTitle: "Motorcycle Chain Length Calculator — Links Needed",
    metaDescription: "Free motorcycle chain length calculator. Get the number of links from sprocket teeth, chain pitch and centre distance.",
    calcInputs: [numberField("frontTeeth", "Front Sprocket Teeth", { default: 15, min: 1, max: 60 }), numberField("rearTeeth", "Rear Sprocket Teeth", { default: 45, min: 1, max: 100 }), dropdown("chainSize", "Chain Size", [["420 / 428 (1/2 in pitch)", 1], ["520 / 525 / 530 (5/8 in pitch)", 2], ["630 (3/4 in pitch)", 3]], 2), numberField("centerDistanceIn", "Countershaft to Rear Axle Distance", { default: 22, min: 1, max: 1000, step: 0.05 }), dropdown("unit", "Distance Unit", [["Inches", 1], ["Millimetres", 2]], 1)],
    calcResult: { label: "Links Needed", format: "number" },
    calcResults: [num("linksNeeded", "Links Needed (Even)", true), num("exactLinks", "Exact Calculated Links"), num("chainLengthIn", "Chain Length (in)"), num("pitchIn", "Chain Pitch (in)", false, 3)],
    instructions: "Enter both sprocket sizes, the chain size and the distance from the countershaft centre to the rear axle centre with the axle mid-way in its adjustment.",
    examples: "Example: 15/45 sprockets with a 520 chain and 22 in centres need about 101.1 links — round up to 102.",
    assumptions: "Standard chain-length formula: 2C ÷ p + (T1 + T2) ÷ 2 + p (T2 − T1)² ÷ (4π² C), rounded up to an even number (chains use whole inner/outer link pairs). Always check slack before riding. " + DISCLAIMER,
    faq: [
      { question: "Why must chain links be even?", answer: "A chain alternates inner and outer links, so a standard riveted chain needs an even count (odd counts need an offset link)." },
      { question: "What do 520 and 530 mean?", answer: "The first digit is the pitch in eighths of an inch (5 = 5/8 in); the last two describe roller width." },
    ],
  },
  {
    slug: "motorcycle-suspension-calculator",
    title: "Motorcycle Suspension Calculator",
    description: "Set motorcycle rear sag: calculate race (rider) sag and static (free) sag, compare to the target and get the preload change — and whether the spring rate is right (also a sag calculator).",
    metaTitle: "Motorcycle Suspension Sag Calculator",
    metaDescription: "Free motorcycle sag calculator. Get race sag, static sag, preload adjustment and a spring rate check for MX, street or track.",
    calcInputs: [
      dropdown("bikeType", "Bike Type", [["Motocross / enduro (33% target)", 1], ["Street (30%)", 2], ["Track / sport (25%)", 3]], 1),
      numberField("wheelTravelMm", "Rear Wheel Travel (mm)", { default: 310, min: 1, max: 400 }),
      numberField("unloadedMm", "Measurement, Wheel Off Ground (mm)", { default: 600, max: 1500 }),
      numberField("bikeOnlyMm", "Measurement, Bike on Wheels, No Rider (mm)", { default: 570, max: 1500 }),
      numberField("withRiderMm", "Measurement, Rider Aboard in Gear (mm)", { default: 495, max: 1500 }),
      numberField("linkageRatio", "Linkage Ratio (Wheel ÷ Shock Travel)", { default: 3, min: 0.5, max: 5, step: 0.1 }),
    ],
    calcResult: { label: "Race Sag", format: "number" },
    calcResults: [num("raceSagMm", "Race (Rider) Sag (mm)", true), num("staticSagMm", "Static (Free) Sag (mm)"), num("targetRaceSagMm", "Target Race Sag (mm)"), num("preloadChangeAtShockMm", "Preload Change at Shock (mm, + Add)"), num("springVerdict", "Spring (1 Too Soft, 2 OK, 3 Too Stiff)")],
    instructions: "Measure from the rear axle to a fixed point on the rear fender three times: with the wheel off the ground, with the bike on its wheels, and with you aboard in riding gear. Enter the bike's rear wheel travel.",
    examples: "Example: 600 / 570 / 495 mm measurements on a motocross bike with 310 mm of travel give 105 mm race sag and 30 mm static sag. The target is about 102 mm, so add roughly 0.9 mm of preload — the spring rate is about right.",
    assumptions: "Race sag = unloaded − rider aboard; static sag = unloaded − bike only. Targets: about 33% of travel off-road, 30% street, 25% track. With race sag set, static sag of about 25–40 mm off-road suggests the right spring (less = too soft, more = too stiff). " + DISCLAIMER,
    faq: [
      { question: "Why measure static sag too?", answer: "It checks the spring rate — if you need lots of preload to get race sag right, the bike will have little static sag, which means the spring is too soft." },
      { question: "How much sag for a street bike?", answer: "Typically 30–35 mm front and 25–35 mm rear race sag, or about 30% of travel." },
    ],
  },
  {
    slug: "motorcycle-seat-height-calculator",
    title: "Motorcycle Seat Height Calculator",
    description: "Check whether you can reach the ground on a motorcycle from your inseam, the seat height and seat width.",
    metaTitle: "Motorcycle Seat Height Calculator — Inseam Fit",
    metaDescription: "Free motorcycle seat height calculator. Check ground reach from inseam, seat height and seat width.",
    calcInputs: [dropdown("unit", "Unit", [["Inches", 1], ["Centimetres", 2]], 1), numberField("inseam", "Your Inseam (Crotch to Floor, in Boots)", { default: 31, max: 120, step: 0.1 }), numberField("seatHeight", "Bike Seat Height", { default: 32, max: 120, step: 0.1 }), dropdown("seatWidth", "Seat Width at the Front", [["Narrow (dirt bike / cruiser)", 1], ["Average", 2], ["Wide (adventure / touring)", 3]], 2)],
    calcResult: { label: "Fit", format: "number" },
    calcResults: [num("fit", "Fit (1 Flat Feet, 2 Balls of Feet, 3 Tiptoes / One Foot, 4 Too Tall)", true), num("marginToGround", "Margin to Ground (+ Spare, − Short)"), num("maxSeatForFlatFeet", "Max Seat Height for Flat Feet"), num("lowerByToFlatFoot", "Lower By for Flat Feet")],
    instructions: "Measure your inseam in riding boots, then enter the bike's listed seat height and how wide the seat is where it meets your legs.",
    examples: "Example: a 31 in inseam on a 32 in seat of average width leaves you about 2.5 in short of flat feet — tiptoes or one foot down.",
    assumptions: "Effective reach = seat height + a width allowance (0.5 / 1.5 / 2.5 in for narrow / average / wide). Suspension sag lowers the bike under you by 1 in or more, so real reach is usually a bit better. Lowering links and seats are options. " + DISCLAIMER,
    faq: [
      { question: "Do I need flat feet to ride safely?", answer: "No — many riders manage with the balls of both feet or one foot down, but flat feet make slow manoeuvres easier for beginners." },
      { question: "Why does seat width matter?", answer: "A wide seat spreads your legs apart, effectively raising the seat height you need to reach over." },
    ],
  },
  {
    slug: "dirt-bike-size-calculator",
    title: "Dirt Bike Size Calculator",
    description: "Find the right dirt bike engine size and seat height for a rider's height and experience — kids to adults.",
    metaTitle: "Dirt Bike Size Calculator — CC by Height",
    metaDescription: "Free dirt bike size calculator. Get recommended engine size (cc) and seat height by rider height and experience.",
    calcInputs: [dropdown("unit", "Unit", [["Inches", 1], ["Centimetres", 2]], 1), numberField("heightIn", "Rider Height", { default: 66, max: 250, step: 0.5 }), dropdown("experience", "Experience", [["Beginner", 1], ["Intermediate", 2], ["Experienced", 3]], 1)],
    calcResult: { label: "Recommended Size", format: "number" },
    calcResults: [num("recommendedCc", "Recommended Engine Size (cc)", true), num("ccRangeLow", "Size Range — Low (cc)"), num("ccRangeHigh", "Size Range — High (cc)"), num("seatHeightLowIn", "Seat Height Range — Low (in)"), num("seatHeightHighIn", "Seat Height Range — High (in)")],
    instructions: "Enter the rider's height and riding experience.",
    examples: "Example: a 5 ft 6 in (66 in) beginner suits about a 125 cc bike (125–250 cc range as skills grow) with a 33–37 in seat height.",
    assumptions: "General guide bands by height: under 4 ft 3 in 50 cc; to 4 ft 11 in 65–110 cc; to 5 ft 3 in 85–150 cc; to 5 ft 8 in 125–250 cc; taller 250–450 cc. Four-strokes are smoother for beginners than two-strokes of the same size. Try the bike in person. " + DISCLAIMER,
    faq: [
      { question: "Is a 250 too big for a beginner?", answer: "A 250 four-stroke trail bike can suit an adult beginner; a 250 two-stroke or race 250F is much more aggressive." },
      { question: "What size dirt bike for a 10-year-old?", answer: "Often a 65–110 cc bike, depending on height and experience." },
    ],
  },
  {
    slug: "go-kart-gear-ratio-calculator",
    title: "Go Kart Gear Ratio Calculator",
    description: "Calculate go-kart gear ratio and top speed from the clutch/driver sprocket, axle sprocket, engine RPM and tire size (also a go kart speed calculator).",
    metaTitle: "Go Kart Gear Ratio Calculator — Top Speed",
    metaDescription: "Free go kart gear ratio calculator. Get gear ratio, top speed (mph, km/h) and axle RPM from sprockets, RPM and tire size.",
    calcInputs: [numberField("driverTeeth", "Clutch / Driver Sprocket Teeth", { default: 12, min: 1, max: 40 }), numberField("axleTeeth", "Axle Sprocket Teeth", { default: 60, min: 1, max: 120 }), numberField("maxRpm", "Engine Max RPM", { default: 3600, max: 20000, step: 100 }), numberField("tireDiameter", "Rear Tire Diameter (in)", { default: 11, min: 1, max: 30, step: 0.1 })],
    calcResult: { label: "Top Speed", format: "number" },
    calcResults: [num("topSpeedMph", "Top Speed (mph)", true), num("gearRatio", "Gear Ratio"), num("topSpeedKmh", "Top Speed (km/h)"), num("axleRpm", "Axle RPM at Max")],
    instructions: "Enter the clutch and axle sprocket teeth, the engine's maximum RPM and rear tire diameter.",
    examples: "Example: a 12-tooth clutch and 60-tooth axle sprocket (5:1) on a governed 3,600 RPM engine with 11 in tires tops out around 23.6 mph.",
    assumptions: "Speed = (RPM ÷ ratio) × tire circumference. Theoretical — drag, rider weight and engine power often stop the kart short. Removing a governor raises RPM; check the engine and clutch are rated for it. " + DISCLAIMER,
    faq: [
      { question: "What gear ratio for a go kart?", answer: "About 5:1 to 6:1 for a typical 6.5 hp yard kart — higher numbers accelerate harder, lower ones go faster on long straights." },
      { question: "How do I go faster?", answer: "Larger tires, a bigger clutch sprocket or a smaller axle sprocket — as long as the engine can still pull the taller gearing." },
    ],
  },
  {
    slug: "jackshaft-gear-ratio-calculator",
    title: "Jackshaft Gear Ratio Calculator",
    description: "Calculate the overall gear ratio and top speed for a go-kart or minibike with a jackshaft (two-stage reduction).",
    metaTitle: "Jackshaft Gear Ratio Calculator — 2-Stage Drive",
    metaDescription: "Free jackshaft gear ratio calculator. Get total ratio and top speed for a two-stage go kart or minibike drive.",
    calcInputs: [numberField("engineTeeth", "Engine / Clutch Sprocket Teeth", { default: 10, min: 1, max: 40 }), numberField("jackshaftInTeeth", "Jackshaft Input Sprocket Teeth", { default: 20, min: 1, max: 100 }), numberField("jackshaftOutTeeth", "Jackshaft Output Sprocket Teeth", { default: 12, min: 1, max: 60 }), numberField("axleTeeth", "Axle Sprocket Teeth", { default: 60, min: 1, max: 120 }), numberField("maxRpm", "Engine Max RPM", { default: 4000, max: 20000, step: 100 }), numberField("tireDiameter", "Rear Tire Diameter (in)", { default: 13, min: 1, max: 30, step: 0.1 })],
    calcResult: { label: "Total Ratio", format: "number" },
    calcResults: [num("totalRatio", "Total Gear Ratio", true), num("firstStageRatio", "First Stage Ratio"), num("secondStageRatio", "Second Stage Ratio"), num("topSpeedMph", "Top Speed (mph)"), num("topSpeedKmh", "Top Speed (km/h)")],
    instructions: "Enter the teeth on all four sprockets — engine, jackshaft input, jackshaft output and axle — plus engine max RPM and tire diameter.",
    examples: "Example: 10→20 then 12→60 gives a 10:1 total reduction. At 4,000 RPM with 13 in tires, top speed is about 15.5 mph — good torque for off-road or a heavy rider.",
    assumptions: "Total ratio = (jackshaft in ÷ engine) × (axle ÷ jackshaft out). Speed = (RPM ÷ ratio) × tire circumference. " + DISCLAIMER,
    faq: [
      { question: "Why use a jackshaft?", answer: "To get a big reduction (often 8–12:1) without a huge axle sprocket — and to fit a torque converter or brake on the shaft." },
      { question: "What ratio for a minibike?", answer: "Roughly 6:1–8:1 for flat ground and 8:1–12:1 for hills, heavier riders or off-road." },
    ],
  },
  {
    slug: "rc-car-gear-ratio-calculator",
    title: "RC Car Gear Ratio Calculator",
    description: "Calculate an RC car's final drive ratio and estimated top speed from pinion, spur, internal ratio, motor KV, battery voltage and tire size.",
    metaTitle: "RC Car Gear Ratio Calculator — FDR & Top Speed",
    metaDescription: "Free RC car gear ratio calculator. Get final drive ratio (FDR) and top speed from pinion, spur, KV, voltage and tire size.",
    calcInputs: [numberField("pinion", "Pinion Teeth", { default: 18, min: 1, max: 80 }), numberField("spur", "Spur Teeth", { default: 87, min: 1, max: 200 }), numberField("internalRatio", "Internal / Transmission Ratio", { default: 2.6, min: 0.1, max: 20, step: 0.01 }), numberField("motorKv", "Motor KV", { default: 3500, max: 20000, step: 50 }), numberField("batteryVolts", "Battery Voltage (2S = 7.4 V)", { default: 7.4, max: 60, step: 0.1 }), numberField("tireDiameterMm", "Tire Diameter (mm)", { default: 110, min: 0.1, max: 300 })],
    calcResult: { label: "Top Speed", format: "number" },
    calcResults: [num("topSpeedMph", "Estimated Top Speed (mph)", true), num("finalDriveRatio", "Final Drive Ratio (FDR)"), num("topSpeedKmh", "Estimated Top Speed (km/h)"), num("motorRpm", "No-Load Motor RPM")],
    instructions: "Enter the pinion and spur teeth, the car's internal ratio (from the manual), motor KV, battery voltage and tire diameter.",
    examples: "Example: an 18T pinion and 87T spur with a 2.6 internal ratio is a 12.57 FDR. With a 3,500 KV motor on 2S (7.4 V) and 110 mm tires, expect about 22.6 mph.",
    assumptions: "FDR = spur ÷ pinion × internal ratio. Speed assumes 85% of no-load RPM (KV × volts) under load. Watch motor temperature after gearing up — over 160 °F (70 °C) usually means gear down. " + DISCLAIMER,
    faq: [
      { question: "Does a bigger pinion make the car faster?", answer: "Yes — a larger pinion lowers the FDR for more top speed, but adds heat and reduces acceleration." },
      { question: "How do I check if gearing is too tall?", answer: "Run 3–5 minutes and touch-test or temp-gun the motor; if it's too hot to hold, gear down." },
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
