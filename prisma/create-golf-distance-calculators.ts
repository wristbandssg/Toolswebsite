// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the golf sub-batch D (Swing, Distance & Conditions). See
// src/lib/calc-engine-golf-handicap.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Golf
// Calculators), and src/lib/calc-engine-golf-distance.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-golf-distance-calculators.ts
// or
//   npm run db:create-golf-distance-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Golf Calculators", slug: "golf-calculators" };

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
  "Estimates for planning and fun. Handicap figures follow the World Handicap System as published, but your club or committee has the final say; fitting numbers are starting points, so a professional fitting is best. Distances and calories are averages, not guarantees.";

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

const CLUB5: [string, number][] = [["Driver / wood", 1], ["Hybrid", 2], ["Long iron (3–5)", 3], ["Mid iron (6–7)", 4], ["Short iron / PW", 5]];

const TOOLS: ToolDef[] = [
  {
    slug: "golf-club-distance-calculator",
    title: "Golf Club Distance Calculator",
    description: "Estimate how far you hit every club — driver to lob wedge — from your driver swing speed or driver carry.",
    metaTitle: "Golf Club Distance Calculator — Yardage Chart",
    metaDescription: "Free golf club distance calculator. Build a carry yardage chart for every club from your driver swing speed or driver carry.",
    calcInputs: [dropdown("method", "I Know My", [["Driver swing speed", 1], ["Driver carry distance", 2]], 1), numberField("swingSpeed", "Driver Swing Speed (mph)", { default: 93, min: 40, max: 150 }), numberField("driverCarry", "Driver Carry (yd)", { default: 220, max: 380 }), dropdown("outputUnit", "Show Distances In", [["Yards", 1], ["Metres", 2]], 1)],
    calcResult: { label: "7-Iron Carry", format: "number" },
    calcResults: [num("driverCarry", "Driver"), num("threeWoodCarry", "3-Wood"), num("fiveWoodCarry", "5-Wood"), num("hybridCarry", "Hybrid (4H)"), num("fourIronCarry", "4-Iron"), num("fiveIronCarry", "5-Iron"), num("sixIronCarry", "6-Iron"), num("sevenIronCarry", "7-Iron", true), num("eightIronCarry", "8-Iron"), num("nineIronCarry", "9-Iron"), num("pitchingWedgeCarry", "Pitching Wedge"), num("gapWedgeCarry", "Gap Wedge"), num("sandWedgeCarry", "Sand Wedge"), num("lobWedgeCarry", "Lob Wedge")],
    instructions: "Enter your driver swing speed or your typical driver carry. The chart shows carry distance for each club.",
    examples: "Example: a 93 mph driver speed (about the male amateur average) → driver 214 yd, 7-iron 139, PW 111, sand wedge 88.",
    assumptions: "Driver carry ≈ 2.3 yd per mph of club speed for a centred strike; other clubs as a share of driver carry (3W 90%, 5W 85%, 4H 80%, 5i 73%, 7i 65%, 9i 57%, PW 52%, GW 47%, SW 41%, LW 35%), in line with Trackman amateur and Tour averages. Your own lofts and strike quality change the gaps — check on a launch monitor. " + DISCLAIMER,
    faq: [
      { question: "How far should I hit my 7-iron?", answer: "Average male amateurs carry a 7-iron about 140 yards; Tour players about 170–175." },
      { question: "Why do my long irons go the same distance?", answer: "Slower swing speeds can't launch long irons high enough — hybrids usually fix this." },
    ],
  },
  {
    slug: "golf-club-gapping-calculator",
    title: "Golf Club Gapping Calculator",
    description: "Plan your wedge lofts below the pitching wedge — even loft gaps, the yardage each wedge will carry and the gap between them.",
    metaTitle: "Golf Club Gapping Calculator — Wedge Lofts",
    metaDescription: "Free golf club gapping calculator. Space your wedge lofts evenly from your PW and see the carry gaps for each wedge.",
    calcInputs: [numberField("pwLoft", "Pitching Wedge Loft (°)", { default: 45, min: 38, max: 50, step: 0.5 }), numberField("pwCarry", "Pitching Wedge Carry (yd)", { default: 120, min: 40, max: 180 }), numberField("highestLoft", "Highest-Lofted Wedge (°)", { default: 58, min: 48, max: 64 }), numberField("wedges", "Wedges to Add Below the PW", { default: 3, min: 1, max: 4 })],
    calcResult: { label: "Loft Gap", format: "number" },
    calcResults: [num("loftGap", "Loft Gap (°)", true), num("yardsPerWedgeGap", "Yardage Gap per Wedge"), num("wedge1Loft", "Wedge 1 Loft (°)"), num("wedge1Carry", "Wedge 1 Carry (yd)"), num("wedge2Loft", "Wedge 2 Loft (°)"), num("wedge2Carry", "Wedge 2 Carry (yd)"), num("wedge3Loft", "Wedge 3 Loft (°)"), num("wedge3Carry", "Wedge 3 Carry (yd)"), num("wedge4Loft", "Wedge 4 Loft (°)"), num("wedge4Carry", "Wedge 4 Carry (yd)")],
    instructions: "Enter your pitching wedge loft (check the maker's spec — modern PWs are often 43–46°) and full-swing carry, the highest loft you want and how many wedges you'll carry below the PW.",
    examples: "Example: a 45° PW carrying 120 yd, topping out at 58° with 3 wedges → 49°, 54° and 58°, carrying about 109, 96 and 86 yards — roughly 11-yard gaps.",
    assumptions: "Lofts are spaced evenly between the PW and the top wedge and rounded to whole degrees. Carry drops about 2.2% of PW carry per degree of loft (≈ 2.6 yd per degree for a 120-yard PW). Aim for 4–6° and 10–15 yards between wedges. " + DISCLAIMER,
    faq: [
      { question: "How many degrees between wedges?", answer: "Usually 4–6°. Bigger gaps leave awkward in-between yardages." },
      { question: "Do I need a gap wedge?", answer: "If your PW is 44–46° and your sand wedge 54–56°, almost certainly — the jump is too big otherwise." },
    ],
  },
  {
    slug: "golf-swing-speed-calculator",
    title: "Golf Swing Speed Calculator",
    description: "Calculate your golf swing speed from driver carry — or from ball speed and smash factor (also a ball speed to swing speed calculator).",
    metaTitle: "Golf Swing Speed Calculator — From Distance or Ball Speed",
    metaDescription: "Free golf swing speed calculator. Estimate club head speed from driver carry or convert ball speed to swing speed with smash factor.",
    calcInputs: [dropdown("method", "Calculate From", [["Driver carry distance", 1], ["Ball speed", 2]], 1), numberField("driverCarry", "Driver Carry (yd)", { default: 215, max: 380 }), numberField("ballSpeed", "Ball Speed (mph)", { default: 135, max: 220, step: 0.1 }), dropdown("club", "Club (ball speed method)", [["Driver", 1], ["Fairway wood", 2], ["Hybrid / long iron", 3], ["7-iron", 4], ["Wedge", 5]], 1), numberField("smashFactor", "Your Smash Factor (0 = typical for club)", { default: 0, max: 1.6, step: 0.01, required: false })],
    calcResult: { label: "Swing Speed", format: "number" },
    calcResults: [num("swingSpeedMph", "Swing Speed (mph)", true), num("swingSpeedKmh", "Swing Speed (km/h)"), num("swingSpeedMs", "Swing Speed (m/s)"), num("ballSpeedMph", "Ball Speed (mph)"), num("estimatedCarryYards", "Estimated Carry (yd)"), pct("percentOfTourAverage", "Driver Speed vs PGA Tour Average"), num("vsAmateurAverageMph", "vs Male Amateur Average (mph)")],
    instructions: "Use your typical driver carry, or a ball speed from a launch monitor with the club you hit. Leave smash factor at 0 to use the typical value for that club.",
    examples: "Example: a 215-yard driver carry ≈ 93.5 mph — almost exactly the male amateur average. A 135 mph driver ball speed at a 1.45 smash factor = 93.1 mph.",
    assumptions: "Driver carry ≈ 2.3 yd per mph. Swing speed = ball speed ÷ smash factor; typical smash: driver 1.45, fairway 1.42, hybrid 1.38, 7-iron 1.33, wedge 1.23. Averages: male amateur ≈ 93.4 mph, PGA Tour ≈ 115 mph (Trackman). " + DISCLAIMER,
    faq: [
      { question: "What is a good swing speed?", answer: "About 93 mph is average for male amateurs; 100+ mph is strong, and Tour players average around 115 mph." },
      { question: "How do I increase swing speed?", answer: "Speed training (overspeed sticks), strength and mobility work, and better sequencing can add 5–10% over a few months." },
    ],
  },
  {
    slug: "golf-ball-speed-to-distance-calculator",
    title: "Golf Ball Speed to Distance Calculator",
    description: "Convert golf ball speed to carry and total distance for any club — with launch quality and fairway firmness.",
    metaTitle: "Golf Ball Speed to Distance Calculator",
    metaDescription: "Free ball speed to distance calculator. Estimate carry and total yards from ball speed for driver, hybrids and irons.",
    calcInputs: [numberField("ballSpeed", "Ball Speed (mph)", { default: 140, min: 30, max: 220, step: 0.1 }), dropdown("club", "Club", CLUB5, 1), dropdown("launchQuality", "Launch & Spin", [["Optimised", 1], ["Typical", 2], ["Poor (too low / too much spin)", 3]], 2), dropdown("conditions", "Fairways", [["Soft", 1], ["Normal", 2], ["Firm", 3]], 2)],
    calcResult: { label: "Carry", format: "number" },
    calcResults: [num("carryYards", "Carry (yd)", true), num("totalYards", "Total with Roll (yd)"), num("carryMetres", "Carry (m)"), num("rollYards", "Roll (yd)")],
    instructions: "Enter the ball speed from your launch monitor, the club, how good your launch and spin are, and how firm the ground is.",
    examples: "Example: 140 mph driver ball speed with typical launch carries about 227 yards and finishes about 243 on normal fairways.",
    assumptions: "Carry ≈ ball speed × 1.62 (driver), 1.57 (hybrid), 1.52 (long iron), 1.43 (mid iron), 1.33 (short iron) — from Trackman averages — × 1.02 optimised / 0.93 poor launch. Roll: driver 3 / 7 / 12% of carry on soft / normal / firm, other clubs 1 / 2 / 4%. For a full flight model use the Golf Trajectory Calculator. " + DISCLAIMER,
    faq: [
      { question: "How far does 150 mph ball speed go?", answer: "About 240–250 yards carry with a driver and a decent launch." },
      { question: "Why does my ball speed not match my distance?", answer: "Launch angle and spin — too much spin or too low a launch costs a lot of carry." },
    ],
  },
  {
    slug: "smash-factor-calculator",
    title: "Smash Factor Calculator",
    description: "Calculate golf smash factor (ball speed ÷ club speed), compare it with the optimum for your club and see the yards you're leaving out there.",
    metaTitle: "Smash Factor Calculator — Strike Efficiency",
    metaDescription: "Free smash factor calculator. Get ball speed ÷ club speed, efficiency vs optimal for each club, and the carry you're losing.",
    calcInputs: [dropdown("club", "Club", [["Driver", 1], ["3-wood", 2], ["Hybrid", 3], ["5-iron", 4], ["7-iron", 5], ["9-iron", 6], ["Pitching wedge", 7]], 1), numberField("clubSpeed", "Club Speed (mph)", { default: 95, min: 30, max: 150, step: 0.1 }), numberField("ballSpeed", "Ball Speed (mph)", { default: 135, min: 30, max: 220, step: 0.1 })],
    calcResult: { label: "Smash Factor", format: "number" },
    calcResults: [num("smashFactor", "Smash Factor", true), num("optimalSmash", "Optimal for This Club"), pct("efficiencyPct", "Strike Efficiency"), num("ballSpeedLostMph", "Ball Speed Lost (mph)"), num("carryLostYards", "Carry Lost (yd)")],
    instructions: "Enter club speed and ball speed from a launch monitor, and pick the club.",
    examples: "Example: a driver at 95 mph producing 135 mph ball speed → smash 1.42, 95.4% of the 1.49 optimum — about 6.6 mph of ball speed and 11 yards of carry lost.",
    assumptions: "Smash factor = ball speed ÷ club speed. Optimal values (Trackman PGA Tour): driver 1.49, 3-wood 1.48, hybrid 1.46, 5-iron 1.40, 7-iron 1.33, 9-iron 1.28, PW 1.23; the rules cap COR so a driver can't exceed about 1.50. Yards lost use about 1.33–1.62 yd of carry per mph of ball speed by club. " + DISCLAIMER,
    faq: [
      { question: "What is a good smash factor for a driver?", answer: "1.45+ is good; 1.48–1.50 is a near-perfect centred strike." },
      { question: "Why is my iron smash factor lower?", answer: "More loft sends more energy into spin and height, so irons naturally have lower smash factors." },
    ],
  },
  {
    slug: "golf-trajectory-calculator",
    title: "Golf Trajectory Calculator",
    description: "Simulate a golf ball's flight from ball speed, launch angle and spin — carry, apex height, hang time and landing angle, with altitude and temperature.",
    metaTitle: "Golf Trajectory Calculator — Ball Flight Simulator",
    metaDescription: "Free golf trajectory calculator. Get carry, apex, hang time and landing angle from launch monitor ball speed, launch and spin.",
    calcInputs: [numberField("ballSpeed", "Ball Speed (mph)", { default: 140, min: 20, max: 220, step: 0.1 }), numberField("launchAngle", "Launch Angle (°)", { default: 13, min: -10, max: 60, step: 0.1 }), numberField("spinRate", "Backspin (rpm)", { default: 2800, max: 12000, step: 10 }), numberField("temperatureF", "Temperature (°F)", { default: 70, min: 0, max: 120 }), numberField("altitude", "Altitude", { default: 0, max: 15000, required: false }), dropdown("altitudeUnit", "Altitude Unit", [["feet", 1], ["metres", 2]], 1)],
    calcResult: { label: "Carry", format: "number" },
    calcResults: [num("carryYards", "Carry (yd)", true), num("carryMetres", "Carry (m)"), num("apexFeet", "Apex Height (ft)"), num("hangTimeSeconds", "Hang Time (s)"), num("landingAngle", "Landing Angle (°)")],
    instructions: "Enter ball speed, launch angle and spin from a launch monitor, plus the temperature and altitude where you're playing.",
    examples: "Example: 140 mph, 13° launch and 2,800 rpm at sea level and 70°F carries about 227 yards with an apex of about 82 feet and a landing angle near 35°.",
    assumptions: "Point-mass ball-flight model (45.93 g, 42.67 mm ball) with drag Cd = 0.22 + 0.3·S and lift Cl = min(0.35, 1.6·S), where S = spin × radius ÷ speed, and 4%/s spin decay. Calibrated to Trackman PGA Tour driver and 7-iron averages (within about 5%). No wind, no sidespin, and air density from altitude and temperature. " + DISCLAIMER,
    faq: [
      { question: "What launch angle gives the most distance?", answer: "With a driver, about 12–16° with 2,000–2,800 rpm of spin for most swing speeds." },
      { question: "Why does spin matter so much?", answer: "Backspin creates lift that keeps the ball up — too little and it falls out of the sky, too much and it balloons." },
    ],
  },
  {
    slug: "golf-elevation-altitude-calculator",
    title: "Golf Elevation / Altitude Calculator",
    description: "Find the plays-like distance for altitude and uphill or downhill shots — how much farther the ball flies at elevation.",
    metaTitle: "Golf Altitude & Elevation Calculator — Plays-Like Yardage",
    metaDescription: "Free golf altitude calculator. Get the plays-like yardage for high-altitude courses and uphill or downhill shots.",
    calcInputs: [numberField("distance", "Distance to Target (yd)", { default: 150, max: 650 }), numberField("altitude", "Course Altitude", { default: 5280, max: 15000 }), numberField("elevationChange", "Target Above (+) or Below (−) You", { default: 30, min: -500, max: 500 }), dropdown("altitudeUnit", "Height Unit", [["feet", 1], ["metres", 2]], 1)],
    calcResult: { label: "Plays Like", format: "number" },
    calcResults: [num("playsLikeYards", "Plays-Like Distance (yd)", true), num("altitudeEffectYards", "Altitude Effect (yd)"), num("elevationEffectYards", "Uphill / Downhill Effect (yd)"), pct("extraCarryPct", "Extra Carry from Altitude")],
    instructions: "Enter the yardage, the course altitude above sea level, and how far the target is above or below you (negative for downhill).",
    examples: "Example: 150 yards in Denver (5,280 ft), 30 ft uphill. The ball carries 6.3% farther (−8.9 yd) but the slope adds 10 yd → plays like 151 yards.",
    assumptions: "Carry rises about 1.2% per 1,000 ft of altitude (thinner air; Trackman / USGA estimates of 1.1–2%). Uphill: add 1 yard per 3 ft of rise; downhill: subtract about two-thirds of the drop. Temperature, humidity and ball flight also matter. " + DISCLAIMER,
    faq: [
      { question: "How much farther does a golf ball go at altitude?", answer: "Roughly 1–2% per 1,000 feet — about 6–10% in Denver." },
      { question: "Does a downhill shot play as much shorter as uphill plays longer?", answer: "No — the steeper landing on a downhill shot reduces the effect, so most players take off a bit less." },
    ],
  },
  {
    slug: "golf-wind-calculator",
    title: "Golf Wind Calculator",
    description: "Calculate how wind changes your golf shot — plays-like distance for headwind or tailwind and how far to aim off in a crosswind.",
    metaTitle: "Golf Wind Calculator — Plays-Like Distance & Aim",
    metaDescription: "Free golf wind calculator. Get plays-like yardage for headwind, tailwind and crosswind, and how far to aim off.",
    calcInputs: [numberField("distance", "Distance to Target (yd)", { default: 150, max: 650 }), numberField("windSpeed", "Wind Speed", { default: 10, max: 60 }), dropdown("speedUnit", "Wind Unit", [["mph", 1], ["km/h", 2]], 1), numberField("windDirection", "Wind Direction (° — 0 into you, 90 from left, 180 behind)", { default: 0, max: 360, step: 5 }), dropdown("ballFlight", "Your Ball Flight", [["Low", 1], ["Average", 2], ["High", 3]], 2)],
    calcResult: { label: "Plays Like", format: "number" },
    calcResults: [num("playsLikeYards", "Plays-Like Distance (yd)", true), num("adjustmentYards", "Adjustment (yd)"), num("headwindMph", "Headwind (+) / Tailwind (−) (mph)"), num("crosswindMph", "Crosswind (mph, + from left)"), num("aimOffsetYards", "Aim Off Into the Wind (yd)")],
    instructions: "Enter the yardage, wind speed and the direction it's blowing from relative to your target line: 0° straight into your face, 90° from the left, 180° from behind, 270° from the right.",
    examples: "Example: 150 yards into a 10 mph headwind plays 165. With the same wind from 45° it plays about 161, and you aim about 6 yards into the wind.",
    assumptions: "Rule of thumb: +1% per mph of headwind, −0.5% per mph of tailwind; crosswind drift ≈ 0.6 yd per mph per 100 yd; low / high flights feel about 20% less / more wind. Real effects grow with spin and height. " + DISCLAIMER,
    faq: [
      { question: "Why does headwind hurt more than tailwind helps?", answer: "A headwind adds spin-lift and drag, ballooning the shot; a tailwind reduces lift so the ball drops sooner." },
      { question: "How do I hit it lower into the wind?", answer: "Take more club, swing smoother and play the ball slightly back — \"when it's breezy, swing easy\"." },
    ],
  },
  {
    slug: "rule-of-12-golf-calculator",
    title: "Rule of 12 Golf Calculator",
    description: "Pick the right club for a chip with the Rule of 12 — from paces to the green and to the hole, adjusted for green speed and slope.",
    metaTitle: "Rule of 12 Golf Calculator — Chipping Club",
    metaDescription: "Free Rule of 12 chipping calculator. Get the club for any chip from carry and roll paces, green speed and slope.",
    calcInputs: [numberField("toGreen", "Paces from Ball to the Green", { default: 3, max: 30 }), numberField("onGreen", "Paces from Green Edge to the Hole", { default: 12, max: 60 }), dropdown("greenSpeed", "Green Speed", [["Slow", 1], ["Medium", 2], ["Fast", 3]], 2), dropdown("slope", "Slope to the Hole", [["Uphill", 1], ["Flat", 2], ["Downhill", 3]], 2)],
    calcResult: { label: "Club", format: "number" },
    calcResults: [num("clubNumber", "Club (6–9 = iron, 10 = PW, 11 = SW, 12 = LW)", true), num("rollToCarryRatio", "Roll : Carry Ratio"), num("carryPaces", "Carry (paces)"), num("rollPaces", "Roll (paces)")],
    instructions: "Pace off from your ball to the edge of the green and from the edge to the hole. Pick green speed and slope.",
    examples: "Example: 3 paces to the green and 12 to the hole. Land it one pace on (4 paces carry), 11 paces of roll — ratio 2.75 → 12 − 2.75 ≈ 9-iron.",
    assumptions: "Rule of 12: club number + roll-to-carry ratio = 12 (PW = 10, SW = 11, LW = 12), landing one pace onto the green. Uphill or slow greens: one club less loft; downhill or fast greens: one club more. Works best with a putting-style chipping stroke. " + DISCLAIMER,
    faq: [
      { question: "Who invented the Rule of 12?", answer: "It's usually credited to short-game coach Paul Runyan's chipping system." },
      { question: "Does it work with my clubs?", answer: "It's a starting point — practise a few chips with each club and adjust the numbers to your set." },
    ],
  },
  {
    slug: "golf-cart-speed-calculator",
    title: "Golf Cart Speed Calculator",
    description: "Calculate golf cart top speed from motor RPM, rear-end gear ratio and tire size — and how much bigger tires speed it up.",
    metaTitle: "Golf Cart Speed Calculator — Tire Size & Gear Ratio",
    metaDescription: "Free golf cart speed calculator. Get top speed from motor RPM, gear ratio and tire diameter, and the gain from lift-kit tires.",
    calcInputs: [numberField("motorRpm", "Motor RPM (top speed)", { default: 4000, min: 500, max: 10000, step: 50 }), numberField("gearRatio", "Rear Axle Gear Ratio (x:1)", { default: 12.5, min: 3, max: 25, step: 0.01 }), numberField("tireDiameter", "Tire Diameter (in)", { default: 22, min: 10, max: 30, step: 0.5 }), numberField("stockTireDiameter", "Stock Tire Diameter (in)", { default: 18, min: 10, max: 30, step: 0.5 })],
    calcResult: { label: "Top Speed", format: "number" },
    calcResults: [num("topSpeedMph", "Top Speed (mph)", true), num("topSpeedKmh", "Top Speed (km/h)"), pct("changeVsStockPct", "Change vs Stock Tires"), num("speedometerReadsMph", "Speedometer Would Read (mph)")],
    instructions: "Enter the motor's top RPM, the rear-end gear ratio (e.g. 12.5:1 on many Club Car / EZGO carts) and the tire diameter you run and the stock size.",
    examples: "Example: 4,000 rpm with a 12.5:1 gear on 18\" tires = 17.1 mph. Moving to 22\" tires raises it to 20.9 mph (+22%) — a stock speedometer would still read 17.1.",
    assumptions: "mph = RPM × π × tire diameter (in) × 60 ÷ (gear ratio × 63,360). Bigger tires raise top speed but reduce torque, so hill climbing and acceleration suffer and the motor may not reach the same RPM. Street-legal LSVs are limited to 25 mph in the US. " + DISCLAIMER,
    faq: [
      { question: "How fast is a stock golf cart?", answer: "Most stock carts are governed to about 12–15 mph; LSVs go up to 25 mph." },
      { question: "Do bigger tires make a golf cart faster?", answer: "Yes — each inch of diameter adds about 5–6% top speed, at the cost of torque." },
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
