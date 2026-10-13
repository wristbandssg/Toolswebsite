// One-time (but safe to re-run) batch setup script: creates the 13 tools of
// the other-sports sub-batch "Archery". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-archery.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-archery-calculators.ts
// or
//   npm run db:create-other-archery-calculators

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

const ARROW = (wt = 425, v = 280) => [numberField("arrowWeight", "Arrow / Bolt Weight (grains)", { default: wt, min: 50, max: 2000 }), numberField("speed", "Arrow Speed (fps)", { default: v, min: 50, max: 600 })];
const HUNT = " Check your state or country's minimum draw-weight and energy rules for hunting.";

const TOOLS: ToolDef[] = [
  {
    slug: "arrow-weight-calculator",
    title: "Arrow Weight Calculator",
    description: "Calculate total arrow weight from shaft GPI, length and components — plus grains per pound (GPP) for your draw weight.",
    metaTitle: "Arrow Weight Calculator — Total Grains & GPP",
    metaDescription: "Free arrow weight calculator. Add shaft GPI × length, point, insert, nock and vanes for total grains and grains per pound.",
    calcInputs: [numberField("gpi", "Shaft Weight (grains per inch)", { default: 9, min: 2, max: 30, step: 0.1 }), numberField("shaftLength", "Shaft Length (in)", { default: 28, min: 15, max: 36, step: 0.25 }), numberField("point", "Point / Broadhead (gr)", { default: 100, max: 300 }), numberField("insert", "Insert (gr)", { default: 16, max: 100 }), numberField("nock", "Nock (gr)", { default: 10, max: 40 }), numberField("vaneWeight", "Weight per Vane / Feather (gr)", { default: 6, max: 30, step: 0.5 }), numberField("vanes", "Number of Vanes", { default: 3, min: 2, max: 6 }), numberField("wrap", "Wrap (gr)", { default: 0, max: 30, required: false }), numberField("drawWeight", "Bow Draw Weight (lb)", { default: 60, min: 10, max: 120 })],
    calcResult: { label: "Total Weight", format: "number" },
    calcResults: [num("totalGrains", "Total Arrow Weight (grains)", true), num("grainsPerPound", "Grains per Pound (GPP)"), num("totalGrams", "Total Weight (g)"), num("category", "Class (1 Under 5 GPP, 2 Speed 5–6, 3 Hunting 6–8, 4 Heavy 8+)")],
    instructions: "Find the shaft's GPI on the maker's spec sheet and add each component's weight.",
    examples: "Example: a 9 GPI shaft cut to 28\" (252 gr) + 100 gr point + 16 gr insert + 10 gr nock + 3 × 6 gr vanes = 396 gr — 6.6 GPP from a 60 lb bow.",
    assumptions: "Total = GPI × length + point + insert + nock + vanes + wrap. Never shoot below about 5 GPP (most bow warranties require it). 6–8 GPP is a common hunting range; heavier arrows are quieter and penetrate better but drop more. " + DISCLAIMER,
    faq: [
      { question: "What is GPP?", answer: "Grains per pound — arrow weight divided by draw weight." },
      { question: "Is a heavier arrow better for hunting?", answer: "It carries more momentum for penetration, at the cost of a more curved trajectory." },
    ],
  },
  {
    slug: "archery-calculator",
    title: "Archery Calculator",
    description: "Estimate your real arrow speed from the bow's IBO rating, draw length, draw weight and arrow weight — with kinetic energy and momentum.",
    metaTitle: "Archery Calculator — Arrow Speed from IBO",
    metaDescription: "Free archery calculator. Estimate arrow speed from IBO speed, draw length, draw weight and arrow weight, plus KE and momentum.",
    calcInputs: [numberField("iboSpeed", "Bow IBO Speed (fps)", { default: 340, min: 150, max: 400 }), numberField("drawLength", "Your Draw Length (in)", { default: 29, min: 20, max: 34, step: 0.5 }), numberField("drawWeight", "Your Draw Weight (lb)", { default: 70, min: 20, max: 100 }), numberField("arrowWeight", "Arrow Weight (grains)", { default: 400, min: 200, max: 1000 }), numberField("stringWeight", "Extra Weight on String — Peep, Loop (gr)", { default: 10, max: 60, required: false })],
    calcResult: { label: "Arrow Speed", format: "number" },
    calcResults: [num("arrowSpeedFps", "Estimated Arrow Speed (fps)", true), num("kineticEnergy", "Kinetic Energy (ft-lb)"), num("momentum", "Momentum (slug·ft/s)", false, 3), num("grainsPerPound", "Grains per Pound")],
    instructions: "Find the bow's IBO (or ATA) speed in its specs and enter your actual setup.",
    examples: "Example: a 340 fps IBO bow at 29\" and 70 lb with a 400 gr arrow and 10 gr on the string → about 310 fps, 85 ft-lb.",
    assumptions: "IBO = 30\" draw, 70 lb, 350 gr arrow. Rules of thumb: −10 fps per inch of draw under 30\", −2 fps per lb under 70, −1 fps per 3 gr of arrow above 350, −1 fps per 3 gr on the string. Real bows vary — a chronograph is best. " + DISCLAIMER,
    faq: [
      { question: "Why is my bow slower than its IBO rating?", answer: "IBO uses a 30\" draw, 70 lb and a light 350 gr arrow — most hunting setups are slower." },
      { question: "Does draw length really cost 10 fps per inch?", answer: "Roughly — it varies with cam design." },
    ],
  },
  {
    slug: "kinetic-energy-calculator-archery",
    title: "Kinetic Energy Calculator (Archery)",
    description: "Calculate arrow or crossbow bolt kinetic energy (ft-lb and joules) and what size game it suits — also a crossbow kinetic energy calculator.",
    metaTitle: "Archery Kinetic Energy Calculator — Bow & Crossbow KE",
    metaDescription: "Free archery kinetic energy calculator. Get arrow or bolt KE in ft-lb and joules and the game size it's suited for.",
    calcInputs: ARROW(),
    calcResult: { label: "Kinetic Energy", format: "number" },
    calcResults: [num("kineticEnergy", "Kinetic Energy (ft-lb)", true), num("joules", "Kinetic Energy (J)"), num("gameClass", "Suits (1 Small Game, 2 Deer, 3 Elk / Bear, 4 Largest Game)"), num("momentum", "Momentum (slug·ft/s)", false, 3)],
    instructions: "Enter the arrow (or crossbow bolt) weight and its measured speed.",
    examples: "Example: a 425 gr arrow at 280 fps carries 74 ft-lb — enough for the largest game classes.",
    assumptions: "KE = grains × fps² ÷ 450,240. Easton's guide: under 25 ft-lb small game, 25–41 medium game (deer), 42–65 large game (elk, bear), 65+ the toughest game. Crossbows use the same formula — bolts at 400+ fps often exceed 120 ft-lb." + HUNT + " " + DISCLAIMER,
    faq: [
      { question: "How much KE do I need for deer?", answer: "About 40 ft-lb is a common target; 25 is a frequently quoted minimum." },
      { question: "KE or momentum for penetration?", answer: "Momentum is the better predictor; KE is the traditional measure." },
    ],
  },
  {
    slug: "arrow-length-calculator",
    title: "Arrow Length Calculator",
    description: "Find the right arrow length for your draw length and bow type — compound, recurve or longbow.",
    metaTitle: "Arrow Length Calculator — What Length Arrow?",
    metaDescription: "Free arrow length calculator. Get recommended and minimum arrow length from draw length for compound and recurve bows.",
    calcInputs: [numberField("drawLength", "Draw Length (in)", { default: 28, min: 15, max: 34, step: 0.5 }), dropdown("bowType", "Bow / Setup", [["Compound (drop-away rest)", 1], ["Recurve / longbow", 2], ["Compound with fixed broadheads", 3]], 1)],
    calcResult: { label: "Arrow Length", format: "number" },
    calcResults: [num("recommendedArrowLength", "Recommended Arrow Length (in)", true), num("minimumArrowLength", "Minimum Safe Length (in)"), num("cm", "Recommended (cm)")],
    instructions: "Enter your draw length (see the Archery Draw Length Calculator) and setup.",
    examples: "Example: a 28\" draw on a compound with a drop-away rest → a 29\" arrow (minimum 28.5\").",
    assumptions: "Arrow length (nock groove to end of shaft) ≈ draw length + 1\" for compounds, + 1.5\" for recurves and longbows, + 2\" when fixed broadheads must clear the riser. Never let the point come off the back of the rest at full draw. " + DISCLAIMER,
    faq: [
      { question: "Can arrows be too long?", answer: "Extra length adds weight and weakens spine, but is safer than too short." },
      { question: "How are arrows measured?", answer: "Usually from the nock throat to the end of the shaft (not including the point)." },
    ],
  },
  {
    slug: "arrow-momentum-calculator",
    title: "Arrow Momentum Calculator",
    description: "Calculate arrow momentum (slug-ft/s) — the best predictor of penetration — and what game it suits.",
    metaTitle: "Arrow Momentum Calculator — Penetration",
    metaDescription: "Free arrow momentum calculator. Get momentum in slug-ft/s from arrow weight and speed and a game-size guide.",
    calcInputs: ARROW(),
    calcResult: { label: "Momentum", format: "number" },
    calcResults: [num("momentum", "Momentum (slug·ft/s)", true, 3), num("gameClass", "Suits (1 Small, 2 Deer, 3 Elk, 4 Moose / Bison)"), num("kineticEnergy", "Kinetic Energy (ft-lb)"), num("momentumNs", "Momentum (N·s)")],
    instructions: "Enter arrow weight and speed.",
    examples: "Example: 425 gr at 280 fps → 0.528 slug-ft/s, enough for the largest game classes.",
    assumptions: "Momentum = grains × fps ÷ 225,400. Common guide: under 0.30 small game, 0.30–0.39 deer, 0.40–0.49 elk and bear, 0.50+ moose and bison. Broadhead design and arrow flight matter as much as raw numbers." + HUNT + " " + DISCLAIMER,
    faq: [
      { question: "Why does momentum predict penetration?", answer: "It resists slowing down — heavier arrows keep pushing through tissue and bone." },
      { question: "How do I raise momentum?", answer: "A heavier arrow usually raises momentum even though speed drops a little." },
    ],
  },
  {
    slug: "foc-calculator-archery",
    title: "FOC Calculator (Archery)",
    description: "Calculate an arrow's front-of-centre (FOC) percentage from its length and balance point.",
    metaTitle: "FOC Calculator Archery — Front of Centre %",
    metaDescription: "Free archery FOC calculator. Get front-of-centre percentage from arrow length and balance point and see if it's standard or high FOC.",
    calcInputs: [numberField("arrowLength", "Arrow Length — Nock Throat to Shaft End (in)", { default: 29, min: 15, max: 36, step: 0.125 }), numberField("balancePoint", "Balance Point from Nock Throat (in, point installed)", { default: 17.5, min: 5, max: 36, step: 0.125 })],
    calcResult: { label: "FOC", format: "percentage" },
    calcResults: [pct("focPct", "Front of Centre", true), num("category", "Class (1 Low < 7%, 2 Standard 7–15%, 3 High 15–19%, 4 Extreme 19%+)"), num("balanceAheadOfCentreIn", "Balance Point Ahead of Centre (in)")],
    instructions: "With the point or broadhead fitted, balance the arrow on a knife edge and measure from the nock throat to the balance point.",
    examples: "Example: a 29\" arrow balancing 17.5\" from the nock → 3\" ahead of centre = 10.3% FOC.",
    assumptions: "FOC = (balance point − length ÷ 2) ÷ length × 100 (AMO/Easton method). 7–15% is typical for target and hunting arrows; high FOC (15%+) can improve broadhead flight and penetration. " + DISCLAIMER,
    faq: [
      { question: "How do I increase FOC?", answer: "Heavier points, inserts or brass/steel collars, or lighter vanes and nocks." },
      { question: "Is higher FOC always better?", answer: "Not always — very high FOC can make arrows drop more and need weaker spines." },
    ],
  },
  {
    slug: "archery-sight-tape-calculator",
    title: "Archery Sight Tape Calculator",
    description: "Build a sight tape from two known sight marks — predicted pin or slider marks from 20 to 80 yards or metres.",
    metaTitle: "Archery Sight Tape Calculator — Sight Marks",
    metaDescription: "Free archery sight tape calculator. Predict sight marks for 20–80 yards or metres from two known marks and arrow speed.",
    calcInputs: [dropdown("unit", "Distance Unit", [["yards", 1], ["metres", 2]], 1), numberField("arrowSpeed", "Arrow Speed (fps)", { default: 280, min: 100, max: 450 }), numberField("knownDistance1", "Known Distance 1", { default: 20, min: 5, max: 100 }), numberField("knownMark1", "Sight Mark at Distance 1", { default: 10, min: -200, max: 200, step: 0.1 }), numberField("knownDistance2", "Known Distance 2", { default: 50, min: 5, max: 100 }), numberField("knownMark2", "Sight Mark at Distance 2", { default: 40, min: -200, max: 200, step: 0.1 })],
    calcResult: { label: "Sight Marks", format: "number" },
    calcResults: [num("mark20", "Mark at 20", true), num("mark30", "Mark at 30"), num("mark40", "Mark at 40"), num("mark50", "Mark at 50"), num("mark60", "Mark at 60"), num("mark70", "Mark at 70"), num("mark80", "Mark at 80")],
    instructions: "Shoot and record sight marks at two distances far apart (e.g. 20 and 50). Enter them with your arrow speed; marks are in whatever scale your sight uses.",
    examples: "Example: marks of 10 at 20 yd and 40 at 50 yd with a 280 fps arrow → about 19.7 at 30, 29.7 at 40, 50.6 at 60 and 61.6 at 70 yd.",
    assumptions: "Sight offset is proportional to the arrow's drop angle, roughly g × d ÷ (2v²), with average speed falling about 1.5% per 10 yd so gaps widen with distance; the two known marks set the scale and zero. Confirm every mark by shooting. " + DISCLAIMER,
    faq: [
      { question: "Why do sight gaps get bigger at long range?", answer: "The arrow slows and drops faster, so each extra 10 yards needs more movement." },
      { question: "Which distances should I shoot first?", answer: "Two marks far apart (e.g. 20 and 60) give the best prediction in between." },
    ],
  },
  {
    slug: "bow-draw-weight-calculator",
    title: "Bow Draw Weight Calculator",
    description: "Find a suitable bow draw weight for your body weight, age group, bow type and experience.",
    metaTitle: "Bow Draw Weight Calculator — What Draw Weight?",
    metaDescription: "Free bow draw weight calculator. Get a recommended draw weight range for compound or recurve by body weight and experience.",
    calcInputs: [dropdown("group", "Archer", [["Adult man", 1], ["Adult woman", 2], ["Child / youth", 3]], 1), numberField("bodyWeight", "Body Weight", { default: 170, min: 30, max: 400 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), dropdown("bowType", "Bow Type", [["Compound", 1], ["Recurve / longbow", 2]], 1), dropdown("experience", "Experience", [["Beginner", 1], ["Experienced", 2]], 2)],
    calcResult: { label: "Draw Weight Range", format: "number" },
    calcResults: [num("drawWeightLow", "Draw Weight — From (lb)", true), num("drawWeightHigh", "Draw Weight — To (lb)"), num("deerLegalMinimumTypical", "Typical Minimum for Deer Hunting (lb)")],
    instructions: "Choose the archer, body weight, bow type and experience.",
    examples: "Example: a 170 lb experienced man shooting a compound → about 45–65 lb. A beginner recurve archer of the same size → about 23–33 lb.",
    assumptions: "Ranges follow common archery-shop charts (e.g. Easton): men 40–70 lb, women 25–55 lb, children 10–25 lb for compounds. Recurves feel heavier (no let-off), so about 60% of the compound figure; beginners start about 15% lower. You should draw smoothly while seated with your feet off the ground." + HUNT + " " + DISCLAIMER,
    faq: [
      { question: "What draw weight do I need to hunt deer?", answer: "Many states require at least 35–40 lb." },
      { question: "Is too heavy a draw weight bad?", answer: "Yes — it ruins form and can injure shoulders. Start light and build up." },
    ],
  },
  {
    slug: "arrow-drop-calculator",
    title: "Arrow Drop Calculator",
    description: "Calculate arrow drop at any range — from the bore line and relative to a pin sighted at another distance — with time of flight.",
    metaTitle: "Arrow Drop Calculator — Drop & Pin Gaps",
    metaDescription: "Free arrow drop calculator. Estimate arrow drop at a distance, the miss with your 20-yard pin and the arrow's time of flight.",
    calcInputs: [numberField("speed", "Arrow Speed (fps)", { default: 280, min: 100, max: 500 }), numberField("distance", "Target Distance (yd)", { default: 40, min: 5, max: 120 }), numberField("zeroDistance", "Pin Sighted at (yd)", { default: 20, min: 5, max: 100 }), percentField("speedLossPer10Yd", "Speed Lost per 10 yd", { default: 1.5, max: 10, step: 0.1 })],
    calcResult: { label: "Drop vs Pin", format: "number" },
    calcResults: [num("dropFromBoreIn", "Total Drop from Bore Line (in)"), num("dropFromPinIn", "Low vs Your Pin (in)", true), num("timeOfFlight", "Time of Flight (s)"), num("speedAtTargetFps", "Speed at Target (fps)")],
    instructions: "Enter arrow speed, the target distance and the distance your pin is sighted for.",
    examples: "Example: at 280 fps a 40-yard shot with the 20-yard pin hits about 19\" low (total drop from the bore line about 38\"). Time of flight 0.44 s.",
    assumptions: "Drop = ½gt² with time based on average speed (speed lost ~1.5% per 10 yd, typical for hunting arrows). 'Low vs pin' subtracts the drop your sight already compensates for at its zero distance, scaled to range. Real drag depends on arrow and fletching — confirm by shooting. " + DISCLAIMER,
    faq: [
      { question: "Why do arrows drop so much?", answer: "They fly at a tenth of a bullet's speed, so gravity has much longer to act." },
      { question: "How do I reduce drop?", answer: "Faster, lighter arrows — but don't go below about 5 grains per pound." },
    ],
  },
  {
    slug: "archery-draw-length-calculator",
    title: "Archery Draw Length Calculator",
    description: "Find your bow draw length from your arm span (wingspan ÷ 2.5) or height.",
    metaTitle: "Archery Draw Length Calculator — Wingspan ÷ 2.5",
    metaDescription: "Free draw length calculator. Estimate archery draw length from arm span or height in inches or cm.",
    calcInputs: [dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), numberField("wingspan", "Arm Span (fingertip to fingertip)", { default: 70, min: 30, max: 250, step: 0.25 }), numberField("height", "Height", { default: 70, min: 30, max: 250, step: 0.25, required: false })],
    calcResult: { label: "Draw Length", format: "number" },
    calcResults: [num("drawLengthInches", "Draw Length (in)", true), num("nearestHalfInch", "Rounded to ½\""), num("drawLengthCm", "Draw Length (cm)"), num("drawLengthFromHeight", "Height-Based Estimate (in)")],
    instructions: "Stand with arms straight out, palms forward, and measure middle fingertip to fingertip.",
    examples: "Example: a 70\" arm span → 70 ÷ 2.5 = 28\" draw length.",
    assumptions: "Draw length (AMO) ≈ arm span ÷ 2.5; the height method ((height − 15) ÷ 2) is a rougher check. Confirm at an archery shop — anchor point, release type and form change the ideal length by ½–1\". " + DISCLAIMER,
    faq: [
      { question: "What happens if my draw length is too long?", answer: "Your bow arm locks out, the string hits your forearm and accuracy suffers." },
      { question: "Can compound draw length be changed?", answer: "Usually yes — with modules or cam settings." },
    ],
  },
  {
    slug: "bow-string-length-calculator",
    title: "Bow String Length Calculator",
    description: "Calculate the bowstring length and brace height range for a recurve or longbow from its AMO length.",
    metaTitle: "Bow String Length Calculator — Recurve & Longbow",
    metaDescription: "Free bow string length calculator. Get string length and recommended brace height from AMO bow length.",
    calcInputs: [numberField("amoLength", "Bow AMO Length (in)", { default: 68, min: 48, max: 80 }), dropdown("bowType", "Bow Type", [["Recurve", 1], ["Longbow", 2]], 1)],
    calcResult: { label: "String Length", format: "number" },
    calcResults: [num("stringLength", "String Length (in)", true), num("stringLengthCm", "String Length (cm)"), num("braceHeightLow", "Brace Height — From (in)"), num("braceHeightHigh", "Brace Height — To (in)")],
    instructions: "Find the AMO length printed on the limb or riser (e.g. 68\").",
    examples: "Example: a 68\" recurve takes a 64.25\" string (AMO − 3.75\") with a brace height of about 8–9\".",
    assumptions: "Recurve string ≈ AMO − 3.75\" (3–4\" depending on maker); longbow ≈ AMO − 4\". Brace heights are typical ranges for target recurves; fine-tune by twisting the string for quiet, consistent shooting. Compound strings are specified by the bow maker. " + DISCLAIMER,
    faq: [
      { question: "What is AMO length?", answer: "A standard bow length, measured along the back of the limbs from string groove to string groove plus 1.5\"." },
      { question: "How do I adjust brace height?", answer: "Twist the string to shorten it (raising brace height) or untwist to lower it." },
    ],
  },
  {
    slug: "archery-spine-calculator",
    title: "Archery Spine Calculator",
    description: "Estimate the arrow spine (deflection) you need from draw weight, arrow length, point weight and bow type.",
    metaTitle: "Archery Spine Calculator — Arrow Spine Chart",
    metaDescription: "Free arrow spine calculator. Get a recommended static spine (e.g. 400, 340) from draw weight, arrow length and point weight.",
    calcInputs: [dropdown("bowType", "Bow Type", [["Compound (release)", 1], ["Recurve / longbow (fingers)", 2]], 1), numberField("drawWeight", "Draw Weight (lb)", { default: 60, min: 15, max: 100 }), numberField("arrowLength", "Arrow Length (in)", { default: 28, min: 20, max: 34, step: 0.25 }), numberField("pointWeight", "Point Weight (gr)", { default: 100, min: 50, max: 300 })],
    calcResult: { label: "Spine", format: "number" },
    calcResults: [num("recommendedSpine", "Recommended Spine", true), num("adjustedBowWeight", "Adjusted Bow Weight (lb)"), num("weakerOption", "One Size Weaker"), num("stifferOption", "One Size Stiffer")],
    instructions: "Enter your bow's draw weight, the arrow's cut length and the point weight.",
    examples: "Example: a 60 lb compound shooting 28\" arrows with 100 gr points → about a 350 spine (340–350 in most brands).",
    assumptions: "Approximate chart: adjusted weight = draw weight + 2.5 lb per inch over 28\" + 3 lb per 25 gr over 100 gr (+5 for finger release), mapped to spine 700 (≤ 35 lb), 600, 500, 400, 350, 300, 250. Each maker publishes its own chart and cam aggressiveness matters — always check the manufacturer chart and paper-tune. " + DISCLAIMER,
    faq: [
      { question: "What does spine number mean?", answer: "How many thousandths of an inch the shaft bends under a standard weight — lower numbers are stiffer." },
      { question: "What if my arrows are too weak?", answer: "They flex too much, fly erratically and can be dangerous with heavy bows." },
    ],
  },
  {
    slug: "recurve-bow-draw-weight-calculator",
    title: "Recurve Bow Draw Weight Calculator",
    description: "Find a recurve or longbow's actual draw weight at your draw length — limbs are marked at 28\".",
    metaTitle: "Recurve Bow Draw Weight Calculator — Weight at Your Draw",
    metaDescription: "Free recurve draw weight calculator. Convert the marked weight at 28\" to your actual draw weight at your draw length.",
    calcInputs: [numberField("markedWeight", "Marked Weight (lb @ 28\")", { default: 35, min: 10, max: 80 }), numberField("drawLength", "Your Draw Length (in)", { default: 29, min: 20, max: 34, step: 0.25 }), numberField("lbPerInch", "Weight Change per Inch (lb)", { default: 2, min: 1, max: 4, step: 0.1 }), numberField("extraPastClicker", "Extra Inches Pulled Through Clicker", { default: 0, max: 2, step: 0.125, required: false })],
    calcResult: { label: "Actual Draw Weight", format: "number" },
    calcResults: [num("actualDrawWeight", "Actual Draw Weight (lb)", true), num("differenceLb", "Difference from Marked (lb)"), num("atFullDraw", "Including Clicker Pull-Through (lb)")],
    instructions: "Read the marked weight on the limbs (e.g. '35# @ 28\"') and enter your draw length.",
    examples: "Example: 35 lb limbs at a 29\" draw → about 37 lb on the fingers.",
    assumptions: "Recurves gain about 2 lb per inch of draw beyond 28\" (1.5–3 lb depending on limb design and weight) and lose about the same per inch shorter. A bow scale gives the exact figure. " + DISCLAIMER,
    faq: [
      { question: "Why are limbs marked at 28 inches?", answer: "It's the AMO standard measuring point." },
      { question: "What weight should a beginner recurve be?", answer: "About 20–30 lb on the fingers for adults." },
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
