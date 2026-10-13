// One-time (but safe to re-run) batch setup script: creates the 10 tools of
// the golf sub-batch C (Equipment & Fitting). See
// src/lib/calc-engine-golf-handicap.ts for the full list
// of 4 sub-batches (39 tools under Sports Calculators > Golf
// Calculators), and src/lib/calc-engine-golf-equipment.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-golf-equipment-calculators.ts
// or
//   npm run db:create-golf-equipment-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const UNIT = () => dropdown("unit", "Measurement Unit", [["inches", 1], ["cm", 2]], 1);
const HEIGHT = () => numberField("height", "Height", { default: 69, min: 40, max: 230, step: 0.5 });
const WTF = () => numberField("wristToFloor", "Wrist-to-Floor (standing, arms relaxed)", { default: 34, max: 120, step: 0.25, required: false });
const SPEED = (def = 95) => numberField("swingSpeed", "Driver Swing Speed (mph)", { default: def, min: 40, max: 150 });

const TOOLS: ToolDef[] = [
  {
    slug: "golf-club-length-calculator",
    title: "Golf Club Length Calculator",
    description: "Find the right golf club length for your height and wrist-to-floor measurement — driver, irons and wedges vs standard.",
    metaTitle: "Golf Club Length Calculator — By Height",
    metaDescription: "Free golf club length calculator. Get driver, 5-iron, 7-iron and wedge lengths from your height and wrist-to-floor measurement.",
    calcInputs: [UNIT(), HEIGHT(), WTF(), dropdown("standard", "Standard Lengths", [["Men's standard", 1], ["Women's standard (1\" shorter)", 2]], 1)],
    calcResult: { label: "7-Iron Length", format: "number" },
    calcResults: [num("adjustmentInches", "Adjustment vs Standard (in)", false, 2), num("sevenIronLength", "7-Iron Length (in)", true, 2), num("driverLength", "Driver Length (in)", false, 2), num("fiveIronLength", "5-Iron Length (in)", false, 2), num("pitchingWedgeLength", "Pitching Wedge Length (in)", false, 2)],
    instructions: "Measure your height in shoes and, standing straight with arms hanging, the distance from the crease of your wrist to the floor. Enter both in the same unit.",
    examples: "Example: 6'2\" (74\") with a 37\" wrist-to-floor → +1\" for height and +0.25\" for arm length → about +1.25\": a 38.25\" 7-iron and a 46.75\" driver.",
    assumptions: "Standard men's steel lengths: driver 45.5\", 5-iron 38\", 7-iron 37\", PW 35.75\"; women's about 1\" shorter. Height bands from common fitting charts (±0.5\" per 3\" of height), refined by ±0.25\" per inch of wrist-to-floor vs the typical 49% of height. Many players prefer a driver shorter than 45.5\" for control. A dynamic fitting is best. " + DISCLAIMER,
    faq: [
      { question: "Should tall golfers use longer clubs?", answer: "Usually, but wrist-to-floor matters more than height — a tall player with long arms may need standard length." },
      { question: "What happens if clubs are too long?", answer: "You stand too upright, the toe rises at impact and shots tend to go left (for right-handers) with heavy contact." },
    ],
  },
  {
    slug: "putter-length-calculator",
    title: "Putter Length Calculator",
    description: "Find your ideal putter length from your height and posture — conventional, arm-lock or long (broomstick) putters.",
    metaTitle: "Putter Length Calculator — What Size Putter?",
    metaDescription: "Free putter length calculator. Get the right putter length for your height and posture, including arm-lock and long putters.",
    calcInputs: [UNIT(), HEIGHT(), dropdown("posture", "Putting Posture", [["Upright", 1], ["Standard", 2], ["Bent over / crouched", 3]], 2), dropdown("style", "Putter Style", [["Conventional", 1], ["Arm-lock", 2], ["Long / broomstick", 3]], 1)],
    calcResult: { label: "Putter Length", format: "number" },
    calcResults: [num("putterLength", "Putter Length (in)", true), num("putterLengthCm", "Putter Length (cm)"), num("conventionalLength", "Conventional Length (in)")],
    instructions: "Enter your height and how you like to stand over the ball, then choose the putter style.",
    examples: "Example: 5'9\" (69\") with a standard posture → a 34\" conventional putter; an arm-lock putter would be about 41\".",
    assumptions: "Conventional length ≈ 34\" at 5'9\", ±1\" per 3\" of height, ±1\" for upright / bent posture, kept within 31–37\". Arm-lock ≈ conventional + 7\". Long putters ≈ 70% of height (anchoring the club is banned under Rule 10.1b). Your eyes should sit over or just inside the ball. " + DISCLAIMER,
    faq: [
      { question: "What is the most common putter length?", answer: "34 or 35 inches — but many golfers are better with a shorter putter than they buy off the rack." },
      { question: "Can a putter be cut down?", answer: "Yes, but each inch removed lowers swing weight; a fitter can add head weight to keep the feel." },
    ],
  },
  {
    slug: "lie-angle-calculator",
    title: "Lie Angle Calculator",
    description: "Find your iron lie angle adjustment from height and wrist-to-floor, and how far a wrong lie sends shots offline — or your putter lie angle.",
    metaTitle: "Lie Angle Calculator — Irons & Putter Lie",
    metaDescription: "Free lie angle calculator. Get the upright/flat adjustment for your irons, the yards a wrong lie costs, and your putter lie angle.",
    calcInputs: [dropdown("clubType", "Club", [["Irons", 1], ["Putter", 2]], 1), UNIT(), HEIGHT(), WTF(), numberField("loft", "Iron Loft (°)", { default: 34, min: 15, max: 64 }), numberField("shotDistance", "Shot Distance (yd)", { default: 150, max: 260 }), numberField("putterLength", "Putter Length (putter only)", { default: 34, min: 28, max: 52, step: 0.5 }), dropdown("posture", "Putting Posture (putter only)", [["Upright, hands high", 1], ["Standard", 2], ["Bent over, hands low", 3]], 2)],
    calcResult: { label: "Recommended Lie", format: "number" },
    calcResults: [num("recommendedLie", "Recommended Lie Angle (°)", true), num("adjustmentDegrees", "Adjustment (+ upright / − flat)"), num("offlineYards", "Offline if Played at Standard (yd)")],
    instructions: "For irons, enter your height and wrist-to-floor, plus a club's loft and carry to see the miss a wrong lie causes. For a putter, choose Putter and enter its length and your posture.",
    examples: "Example: 6'3\" (75\") with a 37\" wrist-to-floor → about +2° upright (a 64.5° 7-iron). Played at standard, a 34° iron hit 150 yards would finish about 2.9 yards offline.",
    assumptions: "Static estimate: +0.3° per inch of height over 5'9\" and +0.5° per inch of wrist-to-floor above 49% of height, rounded to 0.5° (standard 7-iron lie 62.5°). Offline ≈ distance × sin(loft) × tan(lie error). Putter: 70° at 34\", +1° per extra inch, ±2° for posture, max 80° (Rules of Golf). A lie board / dynamic fitting is more reliable. " + DISCLAIMER,
    faq: [
      { question: "What happens if my lie angle is too upright?", answer: "The heel digs in and the face points left — shots start left for a right-hander. Too flat sends them right." },
      { question: "Does lie matter more for wedges?", answer: "Yes. The more loft, the more a wrong lie turns the face — wedges are the most sensitive clubs." },
    ],
  },
  {
    slug: "golf-swing-weight-calculator",
    title: "Golf Swing Weight Calculator",
    description: "Calculate a golf club's swing weight (D2, C9 …) from its weight and balance point — and how much head weight reaches your target.",
    metaTitle: "Golf Swing Weight Calculator — Lorythmic Scale",
    metaDescription: "Free swing weight calculator. Get a club's swing weight from total weight and balance point, and the grams to add or remove.",
    calcInputs: [numberField("clubWeight", "Total Club Weight (g)", { default: 310, min: 200, max: 600 }), numberField("balancePoint", "Balance Point from Grip End (in)", { default: 34, min: 15, max: 45, step: 0.125 }), numberField("clubLength", "Club Length (in)", { default: 45.5, min: 30, max: 48, step: 0.25 }), numberField("targetPoints", "Target Swing Weight (points, D2 = 32)", { default: 32, min: 0, max: 70, step: 0.5 })],
    calcResult: { label: "Swing Weight Points", format: "number" },
    calcResults: [num("swingWeightPoints", "Swing Weight Points (A0 = 0, D0 = 30)", true), num("letter", "Letter (1 = A … 4 = D … 7 = G)"), num("pointWithinLetter", "Point within the Letter"), num("momentInchOunces", "Moment about 14\" (in-oz)"), num("headGramsToTarget", "Head Weight to Add (+) or Remove (−) (g)")],
    instructions: "Weigh the whole club, then find the point where it balances on your finger and measure from the end of the grip. Enter its length and the swing weight you want (A0 = 0, each letter = 10 points, so D2 = 32).",
    examples: "Example: a 310 g driver balancing at 34\" has a moment of 218.7 in-oz — about 32.7 points, or D2.7. Reaching D2 means removing about 1.1 g from the head.",
    assumptions: "Lorythmic scale: moment = weight (oz) × (balance point − 14\"); D0 = 214 in-oz and each point = 1.75 in-oz. Head weight change assumes the head's centre of mass sits 0.5\" from the tip. Roughly 2 g at the head = 1 swing-weight point. " + DISCLAIMER,
    faq: [
      { question: "What is a normal swing weight?", answer: "Men's clubs are usually D0–D3, women's C5–C8." },
      { question: "Does a heavier grip change swing weight?", answer: "Yes — about 4–5 g of extra grip weight lowers swing weight by about one point." },
    ],
  },
  {
    slug: "golf-shaft-flex-weight-calculator",
    title: "Golf Shaft Flex & Weight Calculator",
    description: "Find the right golf shaft flex (L, A, R, S, X) and shaft weight for your driver and irons from swing speed or driver carry.",
    metaTitle: "Golf Shaft Flex Calculator — Flex & Weight",
    metaDescription: "Free shaft flex calculator. Get the right flex and driver/iron shaft weight from your swing speed, driver carry and tempo.",
    calcInputs: [dropdown("method", "I Know My", [["Driver swing speed", 1], ["Driver carry distance", 2]], 1), SPEED(), numberField("carry", "Driver Carry (yd)", { default: 220, max: 380 }), dropdown("tempo", "Tempo / Transition", [["Smooth", 1], ["Average", 2], ["Quick / aggressive", 3]], 2)],
    calcResult: { label: "Flex", format: "number" },
    calcResults: [num("flex", "Flex (1 Ladies, 2 Senior/A, 3 Regular, 4 Stiff, 5 X-Stiff)", true), num("swingSpeedMph", "Swing Speed Used (mph)"), num("driverShaftMinGrams", "Driver Shaft — From (g)"), num("driverShaftMaxGrams", "Driver Shaft — To (g)"), num("ironShaftMinGrams", "Iron Shaft — From (g)"), num("ironShaftMaxGrams", "Iron Shaft — To (g)")],
    instructions: "Enter your driver swing speed (from a launch monitor) or your typical driver carry, and how quick your transition from backswing to downswing is.",
    examples: "Example: 95 mph with an average tempo → Stiff flex, a 60–70 g driver shaft and 105–120 g iron shafts. A quick transition at 92 mph also points to Stiff.",
    assumptions: "Driver speed bands: < 75 mph Ladies, 75–84 Senior (A), 85–94 Regular, 95–104 Stiff, 105+ X-Stiff; a quick tempo moves one flex up, a smooth tempo one down. Carry ≈ 2.3 yd per mph. Flex isn't standardised between brands — treat this as a starting point. " + DISCLAIMER,
    faq: [
      { question: "What happens with too stiff a shaft?", answer: "Shots tend to fly low and right (for right-handers) and feel harsh." },
      { question: "Should iron and driver shafts match?", answer: "Usually the same flex, with irons much heavier — steel iron shafts are often 95–130 g." },
    ],
  },
  {
    slug: "golf-grip-size-calculator",
    title: "Golf Grip Size Calculator",
    description: "Find your golf grip size — junior, undersize, standard, midsize or jumbo — from your hand and finger length.",
    metaTitle: "Golf Grip Size Calculator — Hand Size Chart",
    metaDescription: "Free golf grip size calculator. Measure your hand and longest finger to get your grip size and the build-up tape needed.",
    calcInputs: [UNIT(), numberField("handLength", "Hand Length (wrist crease to tip of middle finger)", { default: 7.75, min: 3, max: 30, step: 0.05 }), numberField("fingerLength", "Longest Finger Length", { default: 3, max: 12, step: 0.05, required: false })],
    calcResult: { label: "Grip Size", format: "number" },
    calcResults: [num("gripSize", "Grip Size (1 Junior, 2 Undersize, 3 Standard, 4 Midsize, 5 Jumbo)", true), num("diameterChangeInches", "Diameter vs Standard (in)", false, 3), num("tapeWraps", "Extra Tape Wraps (≈ 1/64\" each)")],
    instructions: "Measure from the crease of your wrist to the tip of your middle finger, and the length of your longest finger, on your glove hand.",
    examples: "Example: a 7.75\" hand with a 3\" finger → Standard. A 9\" hand → Midsize (+1/16\", about 4 extra wraps of tape).",
    assumptions: "Hand length: under 6.5\" Junior, 6.5–7\" Undersize, 7–8.25\" Standard, 8.25–9.25\" Midsize, over 9.25\" Jumbo; a finger under 2.75\" moves one size down, over 3.5\" one size up (after Golf Pride's sizing chart). Midsize ≈ +1/16\", Jumbo ≈ +1/8\", Undersize ≈ −1/64\". " + DISCLAIMER,
    faq: [
      { question: "What happens if my grips are too small?", answer: "Your hands can get too active and the face tends to close — shots go left for right-handers." },
      { question: "Do bigger grips help arthritis?", answer: "Many golfers with arthritis find midsize or jumbo grips more comfortable because they need less grip pressure." },
    ],
  },
  {
    slug: "driver-loft-calculator",
    title: "Driver Loft Calculator",
    description: "Find the best driver loft for your swing speed and angle of attack — plus your target launch angle and spin rate.",
    metaTitle: "Driver Loft Calculator — Best Loft for Your Speed",
    metaDescription: "Free driver loft calculator. Get the right driver loft, launch angle and spin for your swing speed and attack angle.",
    calcInputs: [SPEED(), numberField("attackAngle", "Angle of Attack (°, + up / − down)", { default: 0, min: -8, max: 8, step: 0.5 }), dropdown("ballFlight", "Current Ball Flight", [["Too low", 1], ["About right", 2], ["Too high", 3]], 2)],
    calcResult: { label: "Recommended Loft", format: "number" },
    calcResults: [num("recommendedLoft", "Recommended Driver Loft (°)", true), num("loftRangeLow", "Loft Range — From (°)"), num("loftRangeHigh", "Loft Range — To (°)"), num("targetLaunchAngle", "Target Launch Angle (°)"), num("targetSpinRpm", "Target Spin (rpm)")],
    instructions: "Enter your driver swing speed and angle of attack (from a launch monitor; level is 0). Tell us if your drives currently fly too low or too high.",
    examples: "Example: 95 mph with a level attack → a 10.5° driver, launching about 13.5° with about 2,590 rpm. At 80 mph the loft rises to 12°.",
    assumptions: "Loft ≈ 10.5° at 95 mph, +1° per 10 mph slower, −0.5° per degree of upward attack, ±1° for a low / high flight, rounded to 0.5° (7–16°). Launch and spin targets approximate Trackman optimisation charts. Adjustable hosels change loft by about ±1.5°. " + DISCLAIMER,
    faq: [
      { question: "Do slower swingers need more loft?", answer: "Yes — more loft gives the launch and carry that slower speeds can't produce on their own." },
      { question: "Will a lower loft go further?", answer: "Only if your launch and spin are too high now. For most amateurs, more loft adds carry." },
    ],
  },
  {
    slug: "golf-ball-fitting-calculator",
    title: "Golf Ball Fitting Calculator",
    description: "Find the right golf ball for your game — compression, cover (ionomer or urethane) and construction — plus what lost balls cost you.",
    metaTitle: "Golf Ball Fitting Calculator — Which Ball?",
    metaDescription: "Free golf ball fitting calculator. Match compression, cover and construction to your swing speed and see your ball cost per round.",
    calcInputs: [SPEED(90), numberField("handicap", "Handicap", { default: 18, max: 54 }), dropdown("priority", "What Matters Most", [["Distance & value", 1], ["Soft feel", 2], ["All-round", 3], ["Greenside spin & control", 4]], 3), currencyField("pricePerDozen", "Price per Dozen", { default: 45 }), numberField("ballsLostPerRound", "Balls Lost per Round", { default: 3, max: 20, step: 0.5 }), numberField("roundsPerYear", "Rounds per Year", { default: 30, max: 365 })],
    calcResult: { label: "Compression Target", format: "number" },
    calcResults: [num("compressionTarget", "Compression Target", true), num("cover", "Cover (1 Ionomer / Surlyn, 2 Urethane)"), num("pieces", "Construction (pieces)"), cur("ballCostPerRound", "Ball Cost per Round"), cur("ballCostPerYear", "Ball Cost per Year")],
    instructions: "Enter your driver swing speed, handicap and what you value most, plus what you pay for balls and how many you lose.",
    examples: "Example: 90 mph, 18 handicap, all-round → about 78 compression, ionomer 2-piece. 3 balls lost per round at $45 a dozen costs $11.25 a round — $337.50 a year.",
    assumptions: "Compression target ≈ 1.2 × swing speed − 30 (40–110), lower for a soft-feel priority. Urethane covers (3–5 pieces) give more wedge spin and suit lower handicaps; ionomer covers are cheaper and more durable. A ball fitting on the course (start with your wedge shots) beats any chart. " + DISCLAIMER,
    faq: [
      { question: "Does a slow swing need a low-compression ball?", answer: "It helps feel and can add a little launch, but spin and cover matter more to scoring." },
      { question: "Is a tour ball worth it for a high handicapper?", answer: "Only if you don't lose many — urethane balls help around the greens, but lost balls get expensive." },
    ],
  },
  {
    slug: "golf-club-trade-in-value-calculator",
    title: "Golf Club Trade-In Value Calculator",
    description: "Estimate what your used golf clubs are worth — private sale, store trade-in credit and cash offer — by age, type and condition.",
    metaTitle: "Golf Club Trade-In Value Calculator — Used Clubs",
    metaDescription: "Free golf club trade-in value calculator. Estimate resale, trade-in credit and cash value of used drivers, irons, wedges and putters.",
    calcInputs: [currencyField("originalPrice", "Original Price (new)", { default: 550 }), numberField("ageYears", "Age (years since release)", { default: 2, max: 30, step: 0.5 }), dropdown("clubType", "Club Type", [["Driver", 1], ["Fairway wood / hybrid", 2], ["Iron set", 3], ["Wedge", 4], ["Putter", 5], ["Full set", 6]], 1), dropdown("condition", "Condition", [["Mint / like new", 1], ["Above average", 2], ["Average", 3], ["Below average", 4]], 2)],
    calcResult: { label: "Trade-In Credit", format: "currency" },
    calcResults: [cur("privateSaleValue", "Private Sale Value"), cur("tradeInCredit", "Store Trade-In Credit", true), cur("cashOffer", "Cash Offer (typical)"), pct("percentOfOriginal", "Private Sale as % of New")],
    instructions: "Enter what the club cost new, how many years since it came out, its type and condition.",
    examples: "Example: a $550 driver, 2 years old, above-average condition → about $211 private sale, $127 trade-in credit and $95 cash.",
    assumptions: "Resale ≈ 70% of new after year 0, 55% after 1 year, 45% after 2, 37% after 3, 30% after 4, 25% after 5, then −15% a year; × type (drivers / woods 0.95, irons 1.05, wedges 0.9, putters 1.1) × condition (1.0 / 0.9 / 0.78 / 0.6). Trade-in credit ≈ 60% and cash ≈ 45% of private resale. Popular models and new-release cycles move values a lot — check current listings. " + DISCLAIMER,
    faq: [
      { question: "When is the best time to trade in clubs?", answer: "Just before a new model launches — values drop sharply once the replacement is out." },
      { question: "Why are trade-in offers low?", answer: "The store has to clean, list, store and resell the club with a margin." },
    ],
  },
  {
    slug: "golf-simulator-projector-calculator",
    title: "Golf Simulator Projector Calculator",
    description: "Work out projector throw distance, image size and brightness for a golf simulator screen and room.",
    metaTitle: "Golf Simulator Projector Calculator — Throw Distance",
    metaDescription: "Free golf simulator projector calculator. Get throw distance, image size and lumens for your screen, aspect ratio and throw ratio.",
    calcInputs: [numberField("screenWidth", "Screen Width (ft)", { default: 10, min: 3, max: 30, step: 0.5 }), numberField("screenHeight", "Screen Height (ft)", { default: 8, min: 3, max: 20, step: 0.5 }), dropdown("aspect", "Projector Aspect Ratio", [["16:9", 1], ["4:3", 2], ["16:10", 3]], 3), numberField("throwRatio", "Throw Ratio (e.g. 0.5 short throw)", { default: 0.5, min: 0.1, max: 3, step: 0.01 }), numberField("roomDepth", "Room Depth — Screen to Back Wall (ft)", { default: 16, max: 50, step: 0.5 }), dropdown("ambientLight", "Room Light", [["Dark", 1], ["Some light", 2], ["Bright / garage door open", 3]], 2)],
    calcResult: { label: "Throw Distance", format: "number" },
    calcResults: [num("throwDistanceFt", "Throw Distance — Lens to Screen (ft)", true), num("imageWidthFt", "Image Width (ft)"), num("imageHeightFt", "Image Height (ft)"), num("imageAreaSqFt", "Image Area (sq ft)"), num("recommendedLumens", "Recommended Brightness (lumens)"), num("roomDepthRemainingFt", "Room Left Behind the Projector (ft)")],
    instructions: "Enter your impact screen size, the projector's aspect ratio and throw ratio (from its spec sheet) and your room depth.",
    examples: "Example: a 10 × 8 ft screen with a 16:10 projector fills 10 × 6.25 ft. At a 0.5 throw ratio the lens sits 5 ft from the screen; a room with some light needs about 2,800 lumens.",
    assumptions: "Image width = smaller of screen width and screen height × aspect; throw distance = image width × throw ratio. Brightness ≈ 30 / 45 / 60 lumens per sq ft for dark / some / bright light. Mount short-throw projectors above or just behind the hitter to avoid shadows; check the lens offset in the manual. " + DISCLAIMER,
    faq: [
      { question: "What throw ratio is best for a golf simulator?", answer: "Short-throw (about 0.4–0.8) so the projector can sit above the hitting area without casting your shadow." },
      { question: "Is 4:3 or 16:9 better?", answer: "4:3 fills taller screens better; 16:9 / 16:10 suit wide screens and most sim software." },
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
