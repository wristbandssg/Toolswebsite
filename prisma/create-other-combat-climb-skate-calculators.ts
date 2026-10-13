// One-time (but safe to re-run) batch setup script: creates the 14 tools of
// the other-sports sub-batch "Combat, Climbing, Skating, Hockey & Skydiving". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-combat-climb-skate.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-combat-climb-skate-calculators.ts
// or
//   npm run db:create-other-combat-climb-skate-calculators

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

const WT = (def = 170) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 500 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];

const TOOLS: ToolDef[] = [
  {
    slug: "human-punch-force-calculator",
    title: "Human Punch Force Calculator",
    description: "Estimate punch force (newtons and pounds-force) and energy from body weight, punch speed and punch type.",
    metaTitle: "Human Punch Force Calculator — Newtons & lbf",
    metaDescription: "Free punch force calculator. Estimate impact force in newtons and lbf from weight, punch speed, punch type and contact time.",
    calcInputs: [...WT(175), numberField("punchSpeed", "Fist Speed at Impact", { default: 20, min: 1, max: 60, step: 0.5 }), dropdown("speedUnit", "Speed Unit", [["mph", 1], ["m/s", 2]], 1), dropdown("punchType", "Punch", [["Jab", 1], ["Cross / straight", 2], ["Hook", 3], ["Uppercut", 4]], 2), numberField("contactMs", "Contact Time (ms)", { default: 15, min: 5, max: 50 })],
    calcResult: { label: "Punch Force", format: "number" },
    calcResults: [num("forceNewtons", "Average Impact Force (N)", true), num("forceLbf", "Impact Force (lbf)"), num("effectiveMassKg", "Effective Mass (kg)"), num("energyJoules", "Kinetic Energy (J)")],
    instructions: "Enter your weight, fist speed (from video or a sensor) and the punch.",
    examples: "Example: a 175 lb boxer's cross at 20 mph with 15 ms contact → about 4,700 N (1,060 lbf).",
    assumptions: "Force ≈ effective mass × speed ÷ contact time. Effective mass ≈ 6% of body weight for a jab, 10% for a cross, 11–12% for uppercuts and hooks (body rotation adds mass). Lab studies measure about 2,500–5,000 N for trained boxers. A rough physics estimate, not a measurement. " + DISCLAIMER,
    faq: [
      { question: "How hard can a pro boxer punch?", answer: "Lab tests show heavyweights around 4,000–5,000 N (900–1,100 lbf) peak." },
      { question: "What matters more, weight or speed?", answer: "Speed — and technique that puts body mass behind the fist." },
    ],
  },
  {
    slug: "finger-strength-calculator",
    title: "Finger Strength Calculator",
    description: "Measure climbing finger strength as a percentage of body weight from a max hang — and the bouldering grade it typically supports.",
    metaTitle: "Finger Strength Calculator — Climbing Max Hang",
    metaDescription: "Free climbing finger strength calculator. Turn a 20 mm max hang into % body weight and an estimated V-grade.",
    calcInputs: [numberField("bodyWeight", "Body Weight (kg or lb)", { default: 70, min: 20, max: 200 }), numberField("addedWeight", "Added Weight (same unit; negative if assisted)", { default: 20, min: -100, max: 150, step: 0.5 })],
    calcResult: { label: "Strength", format: "percentage" },
    calcResults: [pct("strengthPctBodyWeight", "Two-Hand Hang as % of Body Weight", true), num("estimatedVGrade", "Typical Bouldering Grade (V)"), pct("perHandPct", "Per Hand"), num("totalLoad", "Total Load (your unit)")],
    instructions: "Hang a 20 mm edge with a half-crimp for 10 seconds with the most weight you can manage, and enter body weight and added weight.",
    examples: "Example: a 70 kg climber hanging +20 kg = 129% of body weight — typical of climbers around V5.",
    assumptions: "Strength % = (body weight + added) ÷ body weight × 100 for a 20 mm, 10-second max hang. Grade estimate ≈ (strength % − 85) ÷ 8, from published climber datasets (e.g. Lattice Training) — technique, power and body type change it a lot. Warm up thoroughly and avoid max hangs if you're new to climbing. " + DISCLAIMER,
    faq: [
      { question: "What is a good max hang?", answer: "Hanging body weight + 25% on 20 mm for 10 s is strong for intermediate climbers." },
      { question: "When should climbers start hangboarding?", answer: "Usually after 1–2 years of regular climbing, when tendons have adapted." },
    ],
  },
  {
    slug: "climbing-shoe-size-calculator",
    title: "Climbing Shoe Size Calculator",
    description: "Find your climbing shoe size from your street shoe size, climbing level and shoe material.",
    metaTitle: "Climbing Shoe Size Calculator — How Tight?",
    metaDescription: "Free climbing shoe size calculator. Convert street shoe size to climbing shoe size by level and leather or synthetic upper.",
    calcInputs: [numberField("streetSize", "Street Shoe Size", { default: 10, min: 3, max: 50, step: 0.5 }), dropdown("sizeSystem", "Size System", [["US men's", 1], ["US women's", 2], ["EU", 3]], 1), dropdown("level", "Climbing Level / Use", [["Beginner / all-day comfort", 1], ["Intermediate", 2], ["Advanced / performance", 3]], 2), dropdown("material", "Upper", [["Synthetic (little stretch)", 1], ["Unlined leather (stretches)", 2]], 1)],
    calcResult: { label: "US Men's Size", format: "number" },
    calcResults: [num("usMensSize", "Climbing Shoe — US Men's", true), num("usWomensSize", "US Women's"), num("euSize", "EU"), num("sizeDown", "Sizes Down from Street Shoe")],
    instructions: "Enter your usual street shoe size and how you climb.",
    examples: "Example: US men's 10 street, intermediate, synthetic → about 9.5 (EU 42.5).",
    assumptions: "Typical downsizing: beginners ¼–½ size, intermediates ½–1, performance 1–1½; unlined leather stretches up to half a size more. Brands fit very differently — always try them on. Toes should touch the end and curl slightly, with no painful pressure. " + DISCLAIMER,
    faq: [
      { question: "Should climbing shoes hurt?", answer: "They should be snug, not painful — especially for beginners." },
      { question: "Why are performance shoes so small?", answer: "A tight, downturned fit puts power through the big toe on small holds." },
    ],
  },
  {
    slug: "rock-climbing-calories-burned-calculator",
    title: "Rock Climbing Calories Burned Calculator",
    description: "Calculate calories burned rock climbing or bouldering — accounting for rest between climbs.",
    metaTitle: "Rock Climbing Calories Burned Calculator",
    metaDescription: "Free rock climbing calorie calculator. Estimate calories for bouldering, top-rope or lead climbing including rest time.",
    calcInputs: [dropdown("style", "Climbing", [["Easy / top-rope", 1], ["Moderate", 2], ["Hard / lead", 3], ["Bouldering", 4], ["Rappelling / abseiling", 5]], 2), ...WT(160), numberField("minutes", "Session Length (min)", { default: 90, min: 1, max: 600 }), percentField("activePct", "Time Actually on the Wall", { default: 50 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Session Calories (kcal)", true), num("climbingCalories", "Calories While Climbing"), num("caloriesPerClimbingHour", "Calories per Hour of Climbing"), num("met", "MET Value")],
    instructions: "Choose the type of climbing, enter weight, session length and how much of it you spent climbing (vs belaying and resting).",
    examples: "Example: a 90-minute moderate session at 160 lb, climbing half the time → about 490 kcal.",
    assumptions: "2011 Compendium: climbing low–moderate difficulty 5.8, moderate–high 7.5, lead 8.0, bouldering ~6.0, rappelling 5.0; rest time at 1.5 METs. " + DISCLAIMER,
    faq: [
      { question: "Is climbing a good workout?", answer: "Yes — it builds grip, back and core strength and burns calories." },
      { question: "Why count rest time?", answer: "In most sessions you climb only 30–60% of the time." },
    ],
  },
  {
    slug: "gi-size-calculator",
    title: "GI Size Calculator",
    description: "Find your Brazilian jiu-jitsu gi size (A0–A6 or women's F1–F5) from height and weight.",
    metaTitle: "BJJ Gi Size Calculator — A0 to A6",
    metaDescription: "Free gi size calculator. Get your BJJ gi size (A0–A6, women's F1–F5) from your height and weight.",
    calcInputs: [dropdown("cut", "Cut", [["Men's / unisex (A sizes)", 1], ["Women's (F sizes)", 2]], 1), dropdown("unit", "Units", [["inches & lb", 1], ["cm & kg", 2]], 1), numberField("height", "Height", { default: 69, min: 40, max: 230 }), numberField("weight", "Weight", { default: 170, min: 40, max: 400 })],
    calcResult: { label: "Gi Size", format: "number" },
    calcResults: [num("giSize", "Gi Size (A0–A6 or F1–F5 number)", true), num("isWomensCut", "Women's Cut (1 = yes)"), num("betweenSizes", "Between Sizes — Check Brand Chart (1 = yes)")],
    instructions: "Enter your height and weight and choose the cut.",
    examples: "Example: 5'9\", 170 lb → A2.",
    assumptions: "Typical brand chart centres: A0 5'1\"/115 lb, A1 5'5\"/135 lb, A2 5'8½\"/162 lb, A3 5'11½\"/192 lb, A4 6'2\"/220 lb, A5 6'4\"/250 lb, A6 6'6\"/280 lb; women F1 5'0\" to F5 6'0\". Pre-shrunk vs cotton gis shrink differently — wash cold and hang dry. " + DISCLAIMER,
    faq: [
      { question: "Should I size up for shrinkage?", answer: "If the gi isn't pre-shrunk, many people size up or follow the brand's advice." },
      { question: "What if I'm tall and light?", answer: "Look for 'L' (long) sizes like A2L." },
    ],
  },
  {
    slug: "bjj-calorie-calculator",
    title: "BJJ Calorie Calculator",
    description: "Calculate calories burned in a Brazilian jiu-jitsu class — drilling and live rolling.",
    metaTitle: "BJJ Calorie Calculator — Calories Burned in Jiu-Jitsu",
    metaDescription: "Free BJJ calorie calculator. Estimate calories burned drilling and rolling in a jiu-jitsu class by weight and intensity.",
    calcInputs: [...WT(), numberField("drillMinutes", "Warm-Up & Drilling (min)", { default: 30, max: 300 }), numberField("rollMinutes", "Live Rolling / Sparring (min)", { default: 30, max: 300 }), dropdown("rollIntensity", "Rolling Intensity", [["Light flow rolling", 1], ["Moderate", 2], ["Hard / competition pace", 3]], 3)],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("drillingCalories", "From Drilling"), num("rollingCalories", "From Rolling"), num("caloriesPerHour", "Calories per Hour")],
    instructions: "Enter your weight and how many minutes you drilled and rolled.",
    examples: "Example: a 170 lb student drilling 30 minutes and rolling hard for 30 → about 600 kcal.",
    assumptions: "2011 Compendium: martial arts moderate (drilling) 5.3 METs; rolling 5.3 light, 7.5 moderate, 10.3 vigorous (judo / jujitsu competition). Individual burn varies with size and pace. " + DISCLAIMER,
    faq: [
      { question: "How many calories does a BJJ class burn?", answer: "Often 500–900 kcal for a 60–90 minute class with hard rolling." },
      { question: "Is BJJ good for weight loss?", answer: "Yes — it's high-effort grappling many people stick with because it's fun." },
    ],
  },
  {
    slug: "weight-cut-calculator",
    title: "Weight Cut Calculator",
    description: "Plan a combat-sports weight cut — how much to lose by diet versus water, weekly targets and the risk level.",
    metaTitle: "Weight Cut Calculator — Diet & Water Cut Plan",
    metaDescription: "Free weight cut calculator. Split a cut between diet and water, see weekly loss needed and the risk for same-day or day-before weigh-ins.",
    calcInputs: [numberField("currentWeight", "Current Weight", { default: 170, min: 40, max: 500, step: 0.1 }), numberField("targetWeight", "Weigh-In Limit", { default: 155, min: 40, max: 500, step: 0.1 }), numberField("weeksOut", "Weeks until Weigh-In", { default: 6, min: 0, max: 52 }), dropdown("weighIn", "Weigh-In", [["Same day (e.g. amateur, wrestling)", 1], ["Day before (e.g. pro MMA, boxing)", 2]], 2)],
    calcResult: { label: "Total Cut", format: "percentage" },
    calcResults: [pct("totalCutPct", "Total Cut (% of body weight)", true), num("waterCut", "Water Cut (final days)"), num("dietLossNeeded", "Diet / Fat Loss Needed"), num("dietLossPerWeek", "Diet Loss per Week"), num("risk", "Risk (1 Low, 2 Moderate, 3 High, 4 Dangerous)")],
    instructions: "Enter your weight, the limit, weeks to go and the weigh-in type (same units throughout).",
    examples: "Example: 170 lb to 155 with a day-before weigh-in and 6 weeks out: an 8.8% cut — about 10.2 lb of water at the end and 4.8 lb by diet (0.8 lb a week). High risk.",
    assumptions: "Water cuts capped at about 3% of body weight for same-day and 6% for day-before weigh-ins; the rest must come from diet at ideally ≤ 1% of body weight per week. Severe dehydration is dangerous and has caused deaths — work with a doctor or sports dietitian, rehydrate fully and never use saunas, diuretics or laxatives unsupervised. " + DISCLAIMER,
    faq: [
      { question: "How much weight can you safely cut?", answer: "Many experts suggest under 5–8% of body weight in total, mostly through diet." },
      { question: "Is it better to fight at a heavier class?", answer: "Often yes — fighters who cut less are fresher on fight night." },
    ],
  },
  {
    slug: "mma-weight-class-calculator",
    title: "MMA Weight Class Calculator",
    description: "Find your MMA weight class from your walk-around weight and how much you're prepared to cut.",
    metaTitle: "MMA Weight Class Calculator — Which Division?",
    metaDescription: "Free MMA weight class calculator. Find your UFC-style division from walking weight and a planned cut percentage.",
    calcInputs: [dropdown("division", "Division", [["Men", 1], ["Women", 2]], 1), numberField("walkingWeight", "Walk-Around Weight", { default: 175, min: 80, max: 400, step: 0.5 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), percentField("cutPct", "Planned Cut (% of body weight)", { default: 8, max: 15, step: 0.5 })],
    calcResult: { label: "Weight Class", format: "number" },
    calcResults: [num("weightClassLimitLb", "Weight Class Limit (lb)", true), num("classCode", "Class (men 1 Fly … 8 Heavy; women 1 Straw … 4 Feather)"), num("cutNeededLb", "Cut Needed (lb)"), pct("cutNeededPct", "Cut Needed (%)")],
    instructions: "Enter your normal walking weight and the most you'd want to cut.",
    examples: "Example: a 175 lb man willing to cut 8% reaches 161 lb — welterweight (170 lb), needing a 5 lb cut.",
    assumptions: "Unified MMA limits: men 125 Fly, 135 Bantam, 145 Feather, 155 Light, 170 Welter, 185 Middle, 205 Light Heavy, 265 Heavy; women 115 Straw, 125 Fly, 135 Bantam, 145 Feather. Non-title fights allow 1 lb over. Smaller cuts are safer and usually perform better. " + DISCLAIMER,
    faq: [
      { question: "How much do UFC fighters cut?", answer: "Often 10–15% of walking weight — many experts consider that unsafe." },
      { question: "What's the heaviest class?", answer: "Heavyweight, up to 265 lb." },
    ],
  },
  {
    slug: "skateboard-size-calculator",
    title: "Skateboard Size Calculator",
    description: "Find the right skateboard deck width and wheel size from your shoe size and skating style.",
    metaTitle: "Skateboard Size Calculator — Deck Width & Wheels",
    metaDescription: "Free skateboard size calculator. Get deck width and wheel size from shoe size for street, park, bowl or cruising.",
    calcInputs: [numberField("shoeSize", "Shoe Size (US men's)", { default: 10, min: 1, max: 16, step: 0.5 }), dropdown("style", "Skating", [["Street / technical", 1], ["All-round / park", 2], ["Transition / bowl / vert", 3], ["Cruising", 4]], 2)],
    calcResult: { label: "Deck Width", format: "number" },
    calcResults: [num("deckWidthInches", "Deck Width (in)", true), num("wheelSizeMm", "Wheel Size (mm)"), num("truckAxleInches", "Match Truck Axle Width (in)")],
    instructions: "Enter your shoe size and how you mostly skate.",
    examples: "Example: a size 10 shoe for all-round skating → an 8.125\" deck with 54 mm wheels.",
    assumptions: "Shoe size → width: ≤ 6 → 7.5\", 7–8 → 7.875\", 9–10 → 8.125\", 11–12 → 8.375\", 13+ → 8.625\"; street −⅛\", bowl +¼\", cruising +⅜\". Wheels: street 50–53 mm, park 53–56, bowl 56–60, cruising 60+. Personal preference matters most. " + DISCLAIMER,
    faq: [
      { question: "What size skateboard for a beginner?", answer: "Around 8.0–8.25\" suits most adults." },
      { question: "Do wider boards flip slower?", answer: "Yes — that's why street skaters often ride narrower decks." },
    ],
  },
  {
    slug: "roller-skating-calories-burned-calculator",
    title: "Roller Skating Calories Burned Calculator",
    description: "Calculate calories burned roller skating or inline skating by intensity, weight and time.",
    metaTitle: "Roller Skating Calories Burned Calculator",
    metaDescription: "Free roller skating calorie calculator. Estimate calories for casual, general, inline or fast skating.",
    calcInputs: [dropdown("style", "Skating", [["Casual / rink", 1], ["General roller skating", 2], ["Inline skating", 3], ["Fast / speed skating", 4]], 2), ...WT(160), numberField("minutes", "Minutes", { default: 45, min: 1, max: 600 })],
    calcResult: { label: "Calories", format: "number" },
    calcResults: [num("calories", "Calories Burned (kcal)", true), num("caloriesPerHour", "Calories per Hour"), num("met", "MET Value")],
    instructions: "Choose the type of skating and enter your weight and time.",
    examples: "Example: 45 minutes of general roller skating at 160 lb burns about 381 kcal.",
    assumptions: "2011 Compendium: roller skating 7.0, inline 7.5, very fast 9.8; casual rink skating estimated at 5.5. " + DISCLAIMER,
    faq: [
      { question: "Is roller skating good exercise?", answer: "Yes — it's cardio that also works legs, glutes and balance." },
      { question: "Inline or quad skates for fitness?", answer: "Inline skates are usually faster for distance; quads are great for rinks and dance." },
    ],
  },
  {
    slug: "hockey-stick-flex-calculator",
    title: "Hockey Stick Flex Calculator",
    description: "Find the right hockey stick flex for your weight and shooting style — and how cutting the stick changes it.",
    metaTitle: "Hockey Stick Flex Calculator — What Flex Should I Use?",
    metaDescription: "Free hockey stick flex calculator. Get recommended flex from body weight and shot style and the effective flex after cutting.",
    calcInputs: [numberField("weight", "Body Weight", { default: 170, min: 40, max: 350 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), dropdown("style", "Shooting Style", [["Quick release / wrist shots", 1], ["Balanced", 2], ["Heavy slap shots / defence", 3]], 2), numberField("inchesCut", "Inches Cut off the Butt End", { default: 2, max: 10, step: 0.5, required: false })],
    calcResult: { label: "Flex", format: "number" },
    calcResults: [num("recommendedFlex", "Recommended Flex", true), num("effectiveFlexAfterCut", "Effective Flex after Cutting"), num("idealFlexRaw", "Raw Target (½ body weight ± style)")],
    instructions: "Enter your weight, how you shoot and how much you'll cut off the stick.",
    examples: "Example: a 170 lb balanced shooter → 85 flex. Cutting 2\" makes it play like about 93.",
    assumptions: "Rule of thumb: flex ≈ half your body weight in lb (−5 for quick release, +10 for heavy slap shots), rounded to common flexes. Each inch cut raises effective flex about 3–5 points; extensions lower it. " + DISCLAIMER,
    faq: [
      { question: "What does the flex number mean?", answer: "The pounds of force needed to bend the shaft one inch." },
      { question: "Is a lower flex better?", answer: "Lower flex loads more easily for quicker shots; higher flex suits strong, heavy shooters." },
    ],
  },
  {
    slug: "hockey-stick-length-calculator",
    title: "Hockey Stick Length Calculator",
    description: "Find the right hockey stick length for your height and position — and the stick size category (youth to senior).",
    metaTitle: "Hockey Stick Length Calculator — By Height",
    metaDescription: "Free hockey stick length calculator. Get ideal stick length in inches and cm by height, position and on or off skates.",
    calcInputs: [numberField("height", "Height (without skates)", { default: 70, min: 30, max: 230 }), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), dropdown("position", "Position", [["Forward", 1], ["Defence", 2]], 1), dropdown("skates", "Measuring For", [["Ice hockey on skates (standard)", 1], ["Street / ball hockey (off skates, slightly longer)", 2]], 1)],
    calcResult: { label: "Stick Length", format: "number" },
    calcResults: [num("stickLengthInches", "Stick Length (in)", true), num("stickLengthCm", "Stick Length (cm)"), num("sizeCategory", "Size (1 Youth, 2 Junior, 3 Intermediate, 4 Senior)")],
    instructions: "Enter your height and position.",
    examples: "Example: a 5'10\" forward → about 57.5\" — an intermediate stick or a cut-down senior.",
    assumptions: "Length ≈ height − 12\" (defence +1\", forwards −½\"), so the stick reaches between chin and nose on skates. Curve, lie and preference matter — many players like shorter sticks for puck handling. " + DISCLAIMER,
    faq: [
      { question: "Should a hockey stick reach my chin or nose?", answer: "Chin on skates (nose off skates) is the classic guide." },
      { question: "Why do defencemen use longer sticks?", answer: "Extra reach helps poke checks and blocking passing lanes." },
    ],
  },
  {
    slug: "wing-loading-calculator",
    title: "Wing Loading Calculator",
    description: "Calculate skydiving canopy wing loading from exit weight and canopy size — and check it against jump-number guidance.",
    metaTitle: "Wing Loading Calculator — Skydiving Canopy",
    metaDescription: "Free skydiving wing loading calculator. Get wing loading from exit weight and canopy size and compare with jump-number guidance.",
    calcInputs: [numberField("bodyWeight", "Body Weight (dressed)", { default: 180, min: 60, max: 400 }), numberField("gearWeight", "Gear Weight (rig, helmet, etc.)", { default: 25, min: 5, max: 60 }), dropdown("unit", "Unit", [["lb", 1], ["kg", 2]], 1), numberField("canopySize", "Canopy Size (sq ft)", { default: 190, min: 50, max: 400 }), numberField("jumps", "Number of Jumps", { default: 150, max: 20000 })],
    calcResult: { label: "Wing Loading", format: "number" },
    calcResults: [num("wingLoading", "Wing Loading (lb/sq ft)", true), num("exitWeightLb", "Exit Weight (lb)"), num("suggestedMaxWingLoading", "Suggested Max for Your Jumps"), num("smallestSuggestedCanopy", "Smallest Suggested Canopy (sq ft)"), num("withinGuidance", "Within Guidance (1 = yes)")],
    instructions: "Enter your dressed body weight, gear weight, canopy size and jump numbers.",
    examples: "Example: 180 lb + 25 lb gear on a 190 sq ft canopy = 1.08 lb/sq ft. With 150 jumps the guidance is about 1.0, suggesting a 210 or larger.",
    assumptions: "Wing loading = exit weight ÷ canopy area. Guidance: about 1.0 up to 200 jumps, then +0.1 per 100 jumps (max 1.8) — similar to common downsizing charts. Follow your national association's rules (e.g. USPA, BPA) and your instructors; canopy skills matter more than jump numbers. " + DISCLAIMER,
    faq: [
      { question: "Why does wing loading matter?", answer: "Higher loading makes the canopy faster and more responsive — and less forgiving." },
      { question: "Should I downsize quickly?", answer: "No — canopy accidents often involve pilots on canopies too small for their skills." },
    ],
  },
  {
    slug: "parachute-size-calculator",
    title: "Parachute Size Calculator",
    description: "Calculate the parachute diameter needed for a safe descent rate — for model rockets, drones, payloads and cargo.",
    metaTitle: "Parachute Size Calculator — Diameter for Descent Rate",
    metaDescription: "Free parachute size calculator. Get canopy diameter and area from mass, target descent rate, shape and altitude.",
    calcInputs: [numberField("mass", "Mass", { default: 1, min: 0.001, max: 10000, step: 0.001 }), dropdown("massUnit", "Mass Unit", [["kg", 1], ["lb", 2], ["grams", 3]], 1), numberField("descentRate", "Target Descent Rate", { default: 5, min: 0.5, max: 30, step: 0.1 }), dropdown("rateUnit", "Rate Unit", [["m/s", 1], ["ft/s", 2]], 1), dropdown("shape", "Canopy Shape", [["Hemispherical / dome (Cd 1.5)", 1], ["Flat circular (Cd 0.75)", 2], ["Cross / cruciform (Cd 0.8)", 3], ["Toroidal / high-drag (Cd 2.2)", 4]], 1), numberField("altitudeM", "Altitude (m)", { default: 0, max: 10000, required: false })],
    calcResult: { label: "Diameter", format: "number" },
    calcResults: [num("diameterM", "Parachute Diameter (m)", true), num("diameterInches", "Diameter (in)"), num("areaM2", "Canopy Area (m²)"), num("areaSqFt", "Canopy Area (sq ft)")],
    instructions: "Enter the descending mass, the landing speed you want and the canopy shape.",
    examples: "Example: a 1 kg rocket descending at 5 m/s under a dome chute needs about a 0.74 m (29\") parachute.",
    assumptions: "Area = 2mg ÷ (ρ × Cd × v²); diameter = √(4A ÷ π). Air density from altitude (standard atmosphere). Typical safe landing rates: model rockets 4–6 m/s, drones 3–5 m/s. Cd values are typical — check your canopy maker's data. " + DISCLAIMER,
    faq: [
      { question: "What descent rate is safe for a model rocket?", answer: "About 4–6 m/s (13–20 ft/s) for most rockets." },
      { question: "Why does altitude matter?", answer: "Thinner air means less drag, so you need a bigger parachute high up." },
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
