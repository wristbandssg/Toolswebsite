// One-time (but safe to re-run) batch setup script: creates the 12 tools of
// the cycling sub-batch A (Bike Sizing & Fit). See
// src/lib/calc-engine-cycling-fit.ts for the full list
// of 4 sub-batches (47 tools under Sports Calculators > Cycling
// Calculators), and src/lib/calc-engine-cycling-fit.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-cycling-fit-calculators.ts
// or
//   npm run db:create-cycling-fit-calculators

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

const LEN_UNIT = dropdown("unit", "Unit", [["Centimetres", 1], ["Inches", 2]], 1);
const HEIGHT = numberField("height", "Rider Height", { default: 175, max: 250, step: 0.5 });
const INSEAM = numberField("inseam", "Inseam (Floor to Crotch, Barefoot)", { default: 81, max: 120, step: 0.5 });
const INSEAM_HOW = "Measure inseam standing barefoot against a wall with a book pressed firmly up between your legs — floor to the top of the spine of the book.";

const TOOLS: ToolDef[] = [
  {
    slug: "bike-frame-size-calculator",
    title: "Bike Frame Size Calculator",
    description: "Find your road, gravel, hybrid or mountain bike frame size from height and inseam — in cm, inches and S/M/L (also a mountain bike size and gravel bike size calculator).",
    metaTitle: "Bike Frame Size Calculator — Road, Gravel & MTB",
    metaDescription: "Free bike frame size calculator. Get road, gravel, hybrid or mountain bike frame size in cm, inches and XS–XL from height and inseam.",
    calcInputs: [LEN_UNIT, HEIGHT, INSEAM, dropdown("bikeType", "Bike Type", [["Road", 1], ["Gravel / cyclocross", 2], ["Hybrid / city", 3], ["Mountain bike", 4]], 1)],
    calcResult: { label: "Frame Size", format: "number" },
    calcResults: [num("frameSizeCm", "Frame Size (cm, Seat Tube)", true), num("frameSizeIn", "Frame Size (in)"), num("letterSize", "Letter Size (1 XS, 2 S, 3 M, 4 L, 5 XL)")],
    instructions: "Enter your height and inseam and choose the bike type. " + INSEAM_HOW,
    examples: "Example: a 175 cm rider with an 81 cm inseam fits about a 54 cm road frame (size M). On a mountain bike that inseam suggests about an 18.3 in frame.",
    assumptions: "Seat-tube size ≈ inseam × 0.665 (road), 0.655 (gravel), 0.66 (hybrid) or 0.574 (MTB — inseam cm × 0.226 = inches). Letter sizes by height: XS < 160 cm, S 160–170, M 170–180, L 180–190, XL 190+. Brands measure differently — compare stack and reach on the geometry chart and test ride. " + DISCLAIMER,
    faq: [
      { question: "What if I'm between two sizes?", answer: "Choose the smaller frame for a more agile, upright fit (adjust with stem and seatpost) or the larger for stability and a stretched-out position." },
      { question: "Are mountain bikes sized differently?", answer: "Yes — MTBs are sized by letter or seat tube in inches, and modern trail bikes are best compared by reach." },
    ],
  },
  {
    slug: "kids-bike-size-calculator",
    title: "Kids Bike Size Calculator",
    description: "Find the right kids bike wheel size — 12, 14, 16, 20, 24 or 26 inch — from your child's height, with typical ages.",
    metaTitle: "Kids Bike Size Calculator — Wheel Size by Height",
    metaDescription: "Free kids bike size calculator. Find the right wheel size (12 to 26 inch) from your child's height, with typical ages.",
    calcInputs: [LEN_UNIT, numberField("height", "Child's Height", { default: 120, max: 200, step: 0.5 }), numberField("inseam", "Child's Inseam (Optional)", { default: 0, max: 100, step: 0.5, required: false })],
    calcResult: { label: "Wheel Size", format: "number" },
    calcResults: [num("wheelSizeIn", "Wheel Size (in)", true), num("typicalAgeLow", "Typical Age — From"), num("typicalAgeHigh", "Typical Age — To"), num("maxSeatHeightCm", "Lowest Seat Height Needed to Touch Down (cm)")],
    instructions: "Enter your child's height. Add their inseam to see the lowest seat height that lets them put both feet down.",
    examples: "Example: a child 120 cm (3 ft 11 in) tall fits a 20 in wheel bike — usually ages 6 to 9.",
    assumptions: "Height bands: under 100 cm 12 in; 100–110 cm 14 in; 110–120 cm 16 in; 120–135 cm 20 in; 135–145 cm 24 in; 145 cm+ 26 in / adult XS. Beginners should be able to touch the ground with both feet; frame weight and stand-over matter as much as wheel size. " + DISCLAIMER,
    faq: [
      { question: "Should I buy a bigger bike for my child to grow into?", answer: "No — a bike that's too big is harder to control and can put kids off riding. Buy for their current size." },
      { question: "What size bike for a 5-year-old?", answer: "Usually a 14 or 16 in wheel, depending on height." },
    ],
  },
  {
    slug: "bike-fit-calculator",
    title: "Bike Fit Calculator",
    description: "Get starting-point bike fit measurements — saddle height, saddle setback, handlebar drop and saddle-to-bar reach — from height, inseam and flexibility (also a saddle setback calculator).",
    metaTitle: "Bike Fit Calculator — Saddle Height, Setback & Reach",
    metaDescription: "Free bike fit calculator. Get saddle height, saddle setback, handlebar drop and reach from your height, inseam and flexibility.",
    calcInputs: [LEN_UNIT, HEIGHT, INSEAM, dropdown("flexibility", "Flexibility", [["Low (can't touch toes)", 1], ["Average", 2], ["High (palms to floor)", 3]], 2)],
    calcResult: { label: "Saddle Height", format: "number" },
    calcResults: [num("saddleHeightCm", "Saddle Height, BB to Saddle Top (cm)", true), num("saddleSetbackCm", "Saddle Setback Behind BB (cm)"), num("handlebarDropCm", "Saddle-to-Bar Drop (cm)"), num("saddleToBarReachCm", "Saddle Tip to Bar Centre Reach (cm)")],
    instructions: "Enter your height and inseam and choose your flexibility. " + INSEAM_HOW,
    examples: "Example: a 175 cm rider with an 81 cm inseam and average flexibility starts at a 71.5 cm saddle height, about 6.5 cm of setback, 5 cm of bar drop and about 52 cm of saddle-to-bar reach.",
    assumptions: "Saddle height = inseam × 0.883 (LeMond); setback ≈ inseam × 0.08 (a plumb line from the knee should fall near the pedal spindle with the crank horizontal); drop 2/5/8 cm by flexibility; reach ≈ 55% of (height − inseam). These are starting points — a professional fit refines them. " + DISCLAIMER,
    faq: [
      { question: "What is saddle setback?", answer: "How far the saddle nose sits behind the bottom bracket — it balances your weight between the saddle and hands." },
      { question: "How do I know my fit is right?", answer: "No numbness or pain, a slight knee bend at the bottom of the stroke, relaxed shoulders and bent elbows on the hoods." },
    ],
  },
  {
    slug: "bike-seat-height-calculator",
    title: "Bike Seat Height Calculator",
    description: "Calculate the right bike saddle height from your inseam using the LeMond (0.883) and 109% methods.",
    metaTitle: "Bike Seat Height Calculator — Saddle Height",
    metaDescription: "Free bike seat height calculator. Get saddle height from your inseam with the LeMond 0.883 and 109% methods.",
    calcInputs: [LEN_UNIT, INSEAM, numberField("crankLengthMm", "Crank Length (mm)", { default: 172.5, min: 100, max: 200, step: 2.5 })],
    calcResult: { label: "Saddle Height", format: "number" },
    calcResults: [num("lemondHeightCm", "LeMond: BB Centre to Saddle Top (cm)", true), num("pedalToSaddleCm", "109%: Pedal Spindle (Bottom) to Saddle Top (cm)"), num("method109FromBbCm", "109% Method from BB Centre (cm)"), num("lemondHeightIn", "LeMond Height (in)")],
    instructions: "Enter your inseam and crank length. Measure saddle height along the seat tube from the centre of the bottom bracket to the top of the saddle. " + INSEAM_HOW,
    examples: "Example: an 81 cm inseam gives a 71.5 cm saddle height (LeMond), or 88.3 cm from the pedal at its lowest point (109% method).",
    assumptions: "LeMond: inseam × 0.883 from BB centre. 109%: inseam × 1.09 from the pedal spindle at the bottom of the stroke. Aim for about 25–35° of knee bend at the bottom; raise or lower in 2–3 mm steps. " + DISCLAIMER,
    faq: [
      { question: "What happens if my saddle is too low?", answer: "Front-of-knee pain and lost power. Too high causes rocking hips and pain behind the knee." },
      { question: "Is there a quick check?", answer: "The heel method: with your heel on the pedal at the bottom, your leg should be just straight." },
    ],
  },
  {
    slug: "bike-saddle-size-calculator",
    title: "Bike Saddle Size Calculator",
    description: "Find the right bike saddle width from your sit-bone width and riding position.",
    metaTitle: "Bike Saddle Size Calculator — Saddle Width",
    metaDescription: "Free bike saddle width calculator. Get the right saddle width in mm from your sit-bone width and riding position.",
    calcInputs: [numberField("sitBoneWidthMm", "Sit-Bone Width (mm, Centre to Centre)", { default: 120, min: 80, max: 200 }), dropdown("position", "Riding Position", [["Aggressive / racing (+20 mm)", 1], ["Sporty / endurance (+25 mm)", 2], ["Upright / city (+35 mm)", 3]], 2)],
    calcResult: { label: "Saddle Width", format: "number" },
    calcResults: [num("idealSaddleWidthMm", "Ideal Saddle Width (mm)", true), num("nearestCommonWidthMm", "Nearest Common Width (mm)"), num("rangeLowMm", "Range — From (mm)"), num("rangeHighMm", "Range — To (mm)")],
    instructions: "Sit on corrugated cardboard (or memory foam) on a hard chair, lift your feet, then measure centre to centre between the two dents.",
    examples: "Example: 120 mm sit bones in a sporty position suit a 145 mm saddle.",
    assumptions: "Saddle width ≈ sit-bone width + 20 mm (racing), +25 mm (sporty) or +35 mm (upright) — the more upright you sit, the more your weight rests on the sit bones. Shape, padding and cut-outs matter too. " + DISCLAIMER,
    faq: [
      { question: "Is a wider saddle more comfortable?", answer: "Only up to a point — too wide causes chafing; too narrow puts pressure on soft tissue." },
      { question: "Do women need wider saddles?", answer: "Women often have wider sit bones, but measure — it varies more between individuals than between sexes." },
    ],
  },
  {
    slug: "bike-stem-calculator",
    title: "Bike Stem Calculator",
    description: "Compare two stems — length, angle and spacers — to see how much your handlebar moves forward (reach) and up or down (stack).",
    metaTitle: "Bike Stem Calculator — Reach & Stack Change",
    metaDescription: "Free bike stem calculator. Compare stem length, angle and spacers to see the change in handlebar reach and stack.",
    calcInputs: [
      numberField("headTubeAngle", "Head Tube Angle (°)", { default: 73, min: 55, max: 80, step: 0.5 }),
      numberField("currentLength", "Current Stem Length (mm)", { default: 100, max: 200 }),
      numberField("currentAngle", "Current Stem Angle (°, − Down)", { default: -6, min: -45, max: 45 }),
      numberField("currentSpacers", "Current Spacers Under Stem (mm)", { default: 20, max: 80 }),
      numberField("newLength", "New Stem Length (mm)", { default: 110, max: 200 }),
      numberField("newAngle", "New Stem Angle (°, − Down)", { default: -17, min: -45, max: 45 }),
      numberField("newSpacers", "New Spacers Under Stem (mm)", { default: 20, max: 80 }),
    ],
    calcResult: { label: "Reach Change", format: "number" },
    calcResults: [num("reachChangeMm", "Reach Change (mm, + Longer)", true), num("stackChangeMm", "Stack Change (mm, + Higher)"), num("newStemReachMm", "New Stem Horizontal Reach (mm)"), num("newStemStackMm", "New Stem Vertical Rise (mm)")],
    instructions: "Enter the head tube angle and the length, angle and spacer stack of both stems. Stems mounted with the rise downward use a negative angle.",
    examples: "Example: on a 73° head tube, swapping a 100 mm −6° stem for a 110 mm −17° stem (same 20 mm spacers) moves the bars about 12 mm forward and 19 mm lower.",
    assumptions: "Stem angle from horizontal = stem angle + (90° − head tube angle); spacers move the stem up and back along the steerer. Bar position also depends on bar reach and drop. Re-torque to the stem maker's spec. " + DISCLAIMER,
    faq: [
      { question: "How much does 10 mm of stem change?", answer: "About 1 cm of reach — noticeable in fit and steering feel." },
      { question: "Should I flip my stem?", answer: "Flipping a −6° stem to +6° raises the bars by about 20 mm on a 100 mm stem — a quick fix for back or neck discomfort." },
    ],
  },
  {
    slug: "crank-length-calculator",
    title: "Crank Length Calculator",
    description: "Find the right crank arm length for road, mountain bike or BMX from your inseam and height (also a BMX crank length calculator).",
    metaTitle: "Crank Length Calculator — Road, MTB & BMX",
    metaDescription: "Free crank length calculator. Get the right crank arm length in mm for road, MTB or BMX from inseam and height.",
    calcInputs: [LEN_UNIT, INSEAM, HEIGHT, dropdown("discipline", "Discipline", [["Road / gravel", 1], ["Mountain bike", 2], ["BMX", 3]], 1)],
    calcResult: { label: "Crank Length", format: "number" },
    calcResults: [num("crankLengthMm", "Recommended Crank Length (mm)", true), num("inseamRuleMm", "21.6% of Inseam (mm)"), num("inseamRuleRoundedMm", "Rounded to 2.5 mm")],
    instructions: "Enter inseam and height and choose the discipline. " + INSEAM_HOW,
    examples: "Example: an 81 cm inseam suggests 175 mm road cranks. A 160 cm BMX rider would use about 165 mm cranks.",
    assumptions: "Road/gravel ≈ 21.6% of inseam, rounded to 2.5 mm (150–180 mm). MTB 2.5 mm shorter for pedal clearance. BMX by rider height (145–175 mm). Shorter cranks are increasingly popular for hip comfort and aero positions. " + DISCLAIMER,
    faq: [
      { question: "Do longer cranks give more power?", answer: "Not meaningfully — studies show little difference; comfort and cadence matter more." },
      { question: "Why do MTB riders choose shorter cranks?", answer: "Fewer pedal strikes on rocks and roots, especially on low bikes." },
    ],
  },
  {
    slug: "mtb-handlebar-width-calculator",
    title: "MTB Handlebar Width Calculator",
    description: "Find the right mountain bike handlebar width from your shoulder width and riding style — and how much to cut from a wide bar.",
    metaTitle: "MTB Handlebar Width Calculator",
    metaDescription: "Free MTB handlebar width calculator. Get the right bar width in mm from shoulder width and riding style, and how much to cut.",
    calcInputs: [LEN_UNIT, numberField("shoulderWidth", "Shoulder Width (Bone to Bone)", { default: 42, max: 70, step: 0.5 }), dropdown("style", "Riding Style", [["Cross-country", 1], ["Trail", 2], ["Enduro", 3], ["Downhill", 4]], 2), numberField("currentBarMm", "Current Bar Width (mm)", { default: 800, max: 820, step: 5 })],
    calcResult: { label: "Bar Width", format: "number" },
    calcResults: [num("handlebarWidthMm", "Recommended Bar Width (mm)", true), num("rangeLowMm", "Range — From (mm)"), num("rangeHighMm", "Range — To (mm)"), num("cutPerSideMm", "Cut per Side from Current Bar (mm)")],
    instructions: "Measure your shoulder width between the bony points (acromion), choose your style and enter your current bar width.",
    examples: "Example: 42 cm shoulders riding trail suit about a 760 mm bar — cut 20 mm per side from an 800 mm bar.",
    assumptions: "Width ≈ shoulder width × 18 (in mm), −20 mm for XC, +20 for enduro, +30 for downhill, limited to 660–820 mm. Trim in 5–10 mm steps and ride between cuts — check grip, brake and shifter space. " + DISCLAIMER,
    faq: [
      { question: "Is a wider MTB bar better?", answer: "Wider bars add leverage and stability, but too wide limits steering and strains shoulders — and catches trees." },
      { question: "How do I cut a carbon bar?", answer: "Use a fine-tooth hacksaw and a cutting guide, wrap with tape and never cut past the maker's minimum width." },
    ],
  },
  {
    slug: "mtb-handlebar-height-calculator",
    title: "MTB Handlebar Height Calculator",
    description: "Find the right mountain bike handlebar height relative to your saddle for XC, trail, enduro or downhill — and how much to raise or lower it.",
    metaTitle: "MTB Handlebar Height Calculator",
    metaDescription: "Free MTB handlebar height calculator. Get target bar height vs saddle by riding style and the spacer or rise change needed.",
    calcInputs: [numberField("saddleHeightFromGroundCm", "Saddle Top Height from Ground (cm)", { default: 100, max: 150, step: 0.5 }), numberField("currentBarHeightCm", "Current Bar Height from Ground (cm)", { default: 96, max: 150, step: 0.5 }), dropdown("style", "Riding Style", [["Cross-country", 1], ["Trail", 2], ["Enduro", 3], ["Downhill", 4]], 2)],
    calcResult: { label: "Target Bar Height", format: "number" },
    calcResults: [num("targetBarHeightCm", "Target Bar Height from Ground (cm)", true), num("changeNeededMm", "Change Needed (mm, + Raise)"), num("barDropBelowSaddleCm", "Bar Below Saddle (cm, − = Above)")],
    instructions: "With the dropper fully up, measure from the ground to the saddle top and to the bar centre at the grips, then choose your style.",
    examples: "Example: with a 100 cm saddle and a 96 cm bar, a trail rider aims for about 98 cm — raise the bar 20 mm with spacers or a higher-rise bar.",
    assumptions: "Bar drop below saddle: XC about 6 cm, trail 2 cm, enduro 1 cm above, downhill 4 cm above. Raise with spacers, a higher-rise bar or stem — each 10 mm of spacer also shortens reach slightly. " + DISCLAIMER,
    faq: [
      { question: "Does bar height affect climbing?", answer: "Lower bars keep the front wheel planted on steep climbs; higher bars feel more confident descending." },
      { question: "Spacers or riser bar?", answer: "Spacers are cheap to test; a riser bar keeps steering length the same but costs more." },
    ],
  },
  {
    slug: "mountain-bike-reach-calculator",
    title: "Mountain Bike Reach Calculator",
    description: "Find the ideal mountain bike frame reach for your height and riding style, and compare it with a bike's geometry.",
    metaTitle: "Mountain Bike Reach Calculator — Frame Reach",
    metaDescription: "Free mountain bike reach calculator. Get the ideal frame reach in mm for your height and riding style and compare a bike.",
    calcInputs: [LEN_UNIT, HEIGHT, dropdown("style", "Riding Style", [["Cross-country", 1], ["Trail", 2], ["Enduro / aggressive", 3]], 2), numberField("bikeReachMm", "Bike's Reach (mm, from Geometry Chart)", { default: 460, max: 600 })],
    calcResult: { label: "Ideal Reach", format: "number" },
    calcResults: [num("recommendedReachMm", "Recommended Reach (mm)", true), num("rangeLowMm", "Range — From (mm)"), num("rangeHighMm", "Range — To (mm)"), num("bikeDifferenceMm", "Bike vs Recommended (mm, + Longer)")],
    instructions: "Enter your height and riding style, plus the reach figure of the bike you're considering.",
    examples: "Example: a 175 cm trail rider suits about 464 mm of reach (454–474 mm); a bike with 460 mm reach is 4 mm short — a good fit.",
    assumptions: "Reach ≈ height (cm) × 2.55 (XC), 2.65 (trail) or 2.72 (enduro), in mm. Stem length (35–50 mm on trail bikes) fine-tunes it. Long arms or a preference for a playful bike shift the target. " + DISCLAIMER,
    faq: [
      { question: "What is reach on a mountain bike?", answer: "The horizontal distance from the bottom bracket to the top of the head tube — the main measure of how long a bike feels standing up." },
      { question: "Longer or shorter reach?", answer: "Longer feels stable at speed; shorter is more agile and easier to manual and jump." },
    ],
  },
  {
    slug: "dropper-post-calculator",
    title: "Dropper Post Calculator",
    description: "Find the longest dropper post travel that fits your frame and saddle height — checking both exposed height and insertion depth.",
    metaTitle: "Dropper Post Calculator — Max Travel That Fits",
    metaDescription: "Free dropper post calculator. Find the maximum dropper travel for your saddle height, seat tube and frame insertion depth.",
    calcInputs: [numberField("saddleHeightMm", "Saddle Height (BB Centre to Saddle Top, mm)", { default: 720, max: 1000 }), numberField("seatTubeMm", "Seat Tube Length (BB Centre to Top of Tube, mm)", { default: 430, max: 700 }), numberField("maxInsertionMm", "Max Insertion Depth of Frame (mm)", { default: 280, max: 600 }), numberField("saddleStackMm", "Saddle Stack (Rails to Saddle Top, mm)", { default: 35, max: 80 })],
    calcResult: { label: "Max Travel", format: "number" },
    calcResults: [num("maxTravelMm", "Maximum Dropper Travel (mm)", true), num("recommendedTravelMm", "Longest Standard Size That Fits (mm)"), num("limitedBy", "Limited By (1 Saddle Height, 2 Insertion)"), num("exposedPostMm", "Seat Collar to Saddle Top (mm)")],
    instructions: "Measure your saddle height and seat tube length, and find the frame's max insertion (drop a dowel down the seat tube or check the maker's spec).",
    examples: "Example: a 720 mm saddle height on a 430 mm seat tube with 280 mm insertion fits about a 180 mm dropper — limited by insertion depth.",
    assumptions: "Height check: exposed post − saddle stack − about 70 mm (dropper collar and head) must be at least the travel. Insertion check: travel + about 100 mm must fit in the frame. Every dropper has different stack and length — confirm with the maker's chart. " + DISCLAIMER,
    faq: [
      { question: "How much dropper travel do I need?", answer: "As much as fits — 170–200 mm suits most trail riders of average height." },
      { question: "What is a dropper's stack height?", answer: "The fixed height from the collar to the saddle rails at full extension — it varies between brands." },
    ],
  },
  {
    slug: "mtb-spring-rate-calculator",
    title: "MTB Spring Rate Calculator",
    description: "Calculate the coil spring rate for your mountain bike rear shock from rider weight, shock stroke, travel and target sag — plus an air shock starting pressure.",
    metaTitle: "MTB Spring Rate Calculator — Coil Shock",
    metaDescription: "Free MTB spring rate calculator. Get the coil spring rate for your rear shock from weight, stroke, travel and sag, plus air pressure.",
    calcInputs: [numberField("riderWeight", "Rider Weight in Riding Gear", { default: 80, max: 200, step: 0.5 }), dropdown("weightUnit", "Weight Unit", [["kg", 1], ["lb", 2]], 1), numberField("shockStrokeMm", "Shock Stroke (mm)", { default: 60, min: 1, max: 100 }), numberField("rearTravelMm", "Rear Wheel Travel (mm)", { default: 150, max: 250 }), percentField("sagPercent", "Target Sag", { default: 30, min: 10, max: 50 }), percentField("rearBiasPercent", "Rider Weight on Rear Wheel", { default: 65, min: 40, max: 80 })],
    calcResult: { label: "Spring Rate", format: "number" },
    calcResults: [num("springRateLbIn", "Spring Rate (lb/in)", true), num("nearestSpringLbIn", "Nearest Spring (25 lb/in Steps)"), num("springRateNmm", "Spring Rate (N/mm)"), num("leverageRatio", "Average Leverage Ratio"), num("sagMm", "Sag at Shock (mm)"), num("airPressureStartPsi", "Air Shock Starting Pressure (psi)")],
    instructions: "Enter your weight with gear, the shock's stroke, the bike's rear travel, your target sag (25–35%) and the share of weight on the rear wheel (about 60–70% seated).",
    examples: "Example: an 80 kg rider on a 150 mm bike with a 60 mm stroke shock at 30% sag needs about a 400 lb/in spring (18 mm sag at the shock).",
    assumptions: "Spring rate = rear load × average leverage ratio ÷ (sag × stroke). Progressive or regressive linkages and preload change the result — use the frame maker's calculator if available, then confirm sag on the bike. Air shocks: start near your weight in lb as psi. " + DISCLAIMER,
    faq: [
      { question: "How much sag should a mountain bike have?", answer: "About 25–30% for trail riding and 30–35% for enduro and downhill." },
      { question: "Can I use preload to fix sag?", answer: "Only a turn or two — more than that means you need a different spring rate." },
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
