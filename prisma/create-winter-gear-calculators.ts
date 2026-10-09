// One-time (but safe to re-run) batch setup script: creates the 13 tools of
// the winter sports sub-batch A (Ski, Snowboard & Snowshoe Sizing). See
// src/lib/calc-engine-winter-gear.ts for the full list
// of 2 sub-batches (22 tools under Sports Calculators > Winter Sports
// Calculators), and src/lib/calc-engine-winter-gear.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-winter-gear-calculators.ts
// or
//   npm run db:create-winter-gear-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PARENT_SLUG = "sports-calculators";
const CATEGORY = { name: "Winter Sports Calculators", slug: "winter-sports-calculators" };

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
  "Estimates for planning and education only. Gear sizes vary by brand, so try equipment on and have bindings set and tested by a certified technician. Snow, ice and cold-weather conditions change quickly: follow official forecasts, local authorities and avalanche centres, and never rely on a calculator alone for safety decisions.";

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

const UNITS: [string, number][] = [["Metric (cm, kg)", 1], ["Imperial (in, lb)", 2]];
const HEIGHT = numberField("height", "Height", { default: 175, max: 250, step: 0.5 });
const WEIGHT = (def: number) => numberField("weight", "Weight", { default: def, max: 500, step: 0.5 });
const FOOT = [numberField("footLength", "Foot Length (Heel to Longest Toe)", { default: 26.7, min: 10, max: 40, step: 0.1 }), dropdown("unit", "Unit", [["Centimetres", 1], ["Inches", 2]], 1)];
const GENDER: [string, number][] = [["Men's", 1], ["Women's", 2]];

const TOOLS: ToolDef[] = [
  {
    slug: "ski-length-calculator",
    title: "Ski Length Calculator",
    description: "Find the right alpine ski length for your height, weight, ability and terrain — for adults and kids (also a kids ski size calculator).",
    metaTitle: "Ski Length Calculator — Ski Size Chart for Adults & Kids",
    metaDescription: "Free ski length calculator. Get the right ski size in cm for your height, weight, ability and terrain — adults and kids.",
    calcInputs: [dropdown("units", "Units", UNITS, 1), HEIGHT, WEIGHT(70), dropdown("skier", "Skier", [["Adult", 1], ["Child", 2]], 1), dropdown("ability", "Ability", [["Beginner", 1], ["Intermediate", 2], ["Advanced / expert", 3]], 2), dropdown("terrain", "Terrain / Ski Type", [["All-mountain / groomers", 1], ["Park / twin tip", 2], ["Powder / freeride", 3]], 1)],
    calcResult: { label: "Ski Length", format: "number" },
    calcResults: [num("skiLengthCm", "Recommended Ski Length (cm)", true), num("rangeLowCm", "Range — Shorter (cm)"), num("rangeHighCm", "Range — Longer (cm)"), num("skiLengthIn", "Recommended Length (in)")],
    instructions: "Choose units, enter height and weight, then pick adult or child, ability and the kind of skiing you do most.",
    examples: "Example: a 175 cm, 70 kg intermediate adult skiing groomers suits about a 168 cm ski (163–173 cm).",
    assumptions: "Adults: beginner ≈ height − 15 cm (chin), intermediate ≈ height − 7 cm (nose), advanced ≈ height. Kids: chest to nose depending on ability. Park skis −5 cm, powder +5 cm; ±5 cm for skiers well above or below typical weight. Rocker profiles ski shorter, so many rockered skis are chosen a little longer. " + DISCLAIMER,
    faq: [
      { question: "Should beginners ski shorter skis?", answer: "Yes — shorter skis turn more easily. Most beginners choose skis between chin and nose height." },
      { question: "What size skis for a child?", answer: "Beginners about chest to chin height, more confident kids chin to nose. Don't buy too long to 'grow into' — it makes learning harder." },
    ],
  },
  {
    slug: "cross-country-ski-length-calculator",
    title: "Cross Country Ski Length Calculator",
    description: "Find your cross-country (Nordic) ski length for classic, skate or backcountry touring skis from your height.",
    metaTitle: "Cross Country Ski Length Calculator — Classic & Skate",
    metaDescription: "Free cross country ski length calculator. Get Nordic ski length for classic, skate or touring skis from your height.",
    calcInputs: [dropdown("units", "Units", UNITS, 1), HEIGHT, dropdown("style", "Style", [["Classic", 1], ["Skate", 2], ["Backcountry / touring", 3]], 1)],
    calcResult: { label: "Ski Length", format: "number" },
    calcResults: [num("skiLengthCm", "Recommended Ski Length (cm)", true), num("rangeLowCm", "Range — Shorter (cm)"), num("rangeHighCm", "Range — Longer (cm)"), num("skiLengthIn", "Recommended Length (in)")],
    instructions: "Enter your height and choose the style of cross-country skiing.",
    examples: "Example: a 175 cm skier needs classic skis of about 195 cm (190–200 cm), or skate skis of about 185 cm.",
    assumptions: "Classic ≈ height + 20 cm, skate ≈ height + 10 cm, touring ≈ height + 10 cm. For classic and skate race skis, your weight decides the camber stiffness — check the maker's weight chart and get a paper test in the shop. " + DISCLAIMER,
    faq: [
      { question: "Why are skate skis shorter than classic?", answer: "Shorter skis are easier to manoeuvre in the V-shaped skate stride; classic skis need length for glide and a kick zone." },
      { question: "Does weight matter for cross-country skis?", answer: "Very much — the ski's camber must match your weight so the grip zone presses down only when you kick." },
    ],
  },
  {
    slug: "ski-pole-length-calculator",
    title: "Ski Pole Length Calculator",
    description: "Find the right ski pole length for alpine, cross-country classic, skate or touring from your height.",
    metaTitle: "Ski Pole Length Calculator — Alpine & Nordic Poles",
    metaDescription: "Free ski pole length calculator. Get pole size in cm and inches for alpine, classic, skate or touring skiing.",
    calcInputs: [dropdown("units", "Units", UNITS, 1), HEIGHT, dropdown("discipline", "Discipline", [["Alpine (downhill)", 1], ["Cross-country classic", 2], ["Cross-country skate", 3], ["Backcountry / touring (adjustable)", 4], ["Nordic walking / snowshoeing", 5]], 1)],
    calcResult: { label: "Pole Length", format: "number" },
    calcResults: [num("poleLengthCm", "Pole Length (cm, Nearest 5)", true), num("exactLengthCm", "Exact Calculated Length (cm)"), num("poleLengthIn", "Pole Length (in)")],
    instructions: "Enter your height and choose the discipline.",
    examples: "Example: a 175 cm skier uses about 120 cm (47 in) alpine poles, 145–150 cm classic poles or about 155 cm skate poles.",
    assumptions: "Alpine ≈ 0.68 × height (elbow at about 90° holding the grip with the tip in the snow); classic ≈ 0.84 × height (armpit/shoulder); skate ≈ 0.89 × height (chin to lips); touring ≈ 0.70 × height. Poles are sold in 5 cm steps. " + DISCLAIMER,
    faq: [
      { question: "How do I check alpine pole length?", answer: "Turn the pole upside down and grip it under the basket — your forearm should be about level with the floor." },
      { question: "Should touring poles be adjustable?", answer: "Yes — shorten them for climbing and traversing, lengthen them for the descent." },
    ],
  },
  {
    slug: "ski-boot-size-calculator",
    title: "Ski Boot Size Calculator",
    description: "Convert your foot length into a ski boot mondopoint size and US, UK and EU sizes — for a comfort, performance or race fit.",
    metaTitle: "Ski Boot Size Calculator — Mondopoint Conversion",
    metaDescription: "Free ski boot size calculator. Convert foot length to mondopoint and US men's, women's, UK and EU ski boot sizes.",
    calcInputs: [...FOOT, dropdown("fit", "Fit", [["Comfort / recreational", 1], ["Performance", 2], ["Race (snug)", 3]], 1)],
    calcResult: { label: "Mondopoint", format: "number" },
    calcResults: [num("mondopoint", "Mondopoint Size", true), num("usMens", "US Men's"), num("usWomens", "US Women's"), num("uk", "UK"), num("eu", "EU"), num("shellSizeCm", "Shell Size")],
    instructions: "Stand on paper with your heel against a wall and mark your longest toe. Measure in cm (the bigger foot) and choose the fit you want.",
    examples: "Example: a 26.7 cm foot is a mondopoint 27.0 comfort fit — about US men's 9, women's 10, UK 8 and EU 43. A performance fit would be 26.5.",
    assumptions: "Mondopoint = foot length in cm, in half sizes. Comfort rounds up, performance rounds down, race goes a further half size down. Shells usually come in full-cm sizes (26.0 and 26.5 share a shell). Conversions are approximate and vary by brand. " + DISCLAIMER,
    faq: [
      { question: "Should ski boots feel tight?", answer: "Snug — toes lightly touch the front when standing straight and pull back when you flex forward. They pack out a little over the first days." },
      { question: "What is a shell fit?", answer: "With the liner out and toes touching the front, a 1–1.5 finger gap behind the heel is performance; 2 fingers is comfort." },
    ],
  },
  {
    slug: "ski-boot-flex-calculator",
    title: "Ski Boot Flex Calculator",
    description: "Find the right ski boot flex index for your ability, gender and weight — from soft beginner boots to stiff expert boots.",
    metaTitle: "Ski Boot Flex Calculator — Flex Index Guide",
    metaDescription: "Free ski boot flex calculator. Get the right flex index for men, women and juniors by ability and weight.",
    calcInputs: [dropdown("gender", "Boot", [["Men's", 1], ["Women's", 2], ["Junior", 3]], 1), dropdown("ability", "Ability", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3], ["Expert / racer", 4]], 2), dropdown("units", "Units", UNITS, 1), WEIGHT(80)],
    calcResult: { label: "Flex Index", format: "number" },
    calcResults: [num("flexIndex", "Recommended Flex Index", true), num("flexLow", "Range — Softer"), num("flexHigh", "Range — Stiffer")],
    instructions: "Choose the boot type, your ability and enter your weight.",
    examples: "Example: an 80 kg intermediate man suits about a 90 flex (80–100).",
    assumptions: "Base flex — men 70 / 90 / 110 / 130, women 60 / 80 / 95 / 115, juniors 50 / 60 / 70 / 80 (beginner to expert) — adjusted 5 points per 10 kg from a reference weight (80 / 65 / 40 kg), up to ±20. Flex numbers aren't standardised between brands, and boots stiffen in the cold. " + DISCLAIMER,
    faq: [
      { question: "Is a stiffer boot better?", answer: "Only if you can flex it — a boot that's too stiff pushes you into the back seat and makes skiing harder." },
      { question: "Why do women's boots have lower flex?", answer: "On average women are lighter, so the same performance needs less resistance." },
    ],
  },
  {
    slug: "ski-din-calculator",
    title: "Ski DIN Calculator",
    description: "Estimate your indicative ski binding DIN release setting with the ISO 11088 chart — from weight, height, age, skier type and boot sole length.",
    metaTitle: "Ski DIN Calculator — ISO 11088 Binding Setting",
    metaDescription: "Free ski DIN calculator using the ISO 11088 chart. Estimate your binding release setting from weight, height, age, type and BSL.",
    calcInputs: [
      dropdown("units", "Units", UNITS, 1),
      WEIGHT(75),
      numberField("height", "Height", { default: 178, max: 250, step: 0.5 }),
      numberField("age", "Age", { default: 35, min: 2, max: 100 }),
      dropdown("skierType", "Skier Type", [["Type −1 (extra cautious)", 0], ["Type 1 (cautious, slower)", 1], ["Type 2 (moderate, varied)", 2], ["Type 3 (fast, aggressive)", 3], ["Type 3+ (very aggressive)", 4]], 2),
      numberField("bootSoleLength", "Boot Sole Length (mm, on the Boot Heel)", { default: 305, min: 150, max: 400 }),
    ],
    calcResult: { label: "DIN Setting", format: "number" },
    calcResults: [num("dinSetting", "Indicative DIN Setting", true), num("skierCode", "Skier Code (1 = A … 15 = O)"), num("adjustedCode", "Code After Type & Age"), num("inStandardChart", "Value in Standard Chart (1 Yes, 0 Nearest Used)")],
    instructions: "Enter weight, height, age, your skier type and the boot sole length printed on the side of the boot heel (in mm).",
    examples: "Example: a 75 kg, 178 cm, 35-year-old Type 2 skier with a 305 mm boot sole has an indicative DIN of 6.5.",
    assumptions: "ISO 11088: weight and height each give a skier code, and the code nearer A is used. Type 2 moves one row down, Type 3 two, Type 3+ three (Type −1 one up); skiers aged 9 or under, or 50 and over, move one row up. The boot sole length column gives the value. This is a reference only — a certified ski technician must set and release-test your bindings. " + DISCLAIMER,
    faq: [
      { question: "Can I set my own DIN?", answer: "This gives the reference value, but bindings should be set and torque-tested by a certified technician — a wrong setting can cause injury or pre-release." },
      { question: "Which skier type am I?", answer: "Type 1: cautious, slow, smooth terrain. Type 2: moderate speeds on varied terrain. Type 3: fast and aggressive on steep terrain." },
    ],
  },
  {
    slug: "ski-radius-calculator",
    title: "Ski Radius Calculator",
    description: "Calculate a ski's sidecut turn radius from its tip, waist and tail widths and length — and whether it's a short, medium or long-turn ski.",
    metaTitle: "Ski Radius Calculator — Sidecut Turn Radius",
    metaDescription: "Free ski radius calculator. Get sidecut turn radius in metres from tip, waist and tail widths and ski length.",
    calcInputs: [numberField("tipWidth", "Tip Width (mm)", { default: 125, min: 50, max: 200 }), numberField("waistWidth", "Waist Width (mm)", { default: 85, min: 40, max: 160 }), numberField("tailWidth", "Tail Width (mm)", { default: 110, min: 50, max: 200 }), numberField("skiLengthCm", "Ski Length (cm)", { default: 170, min: 60, max: 220 }), numberField("contactLengthMm", "Running / Contact Length (mm, 0 = Estimate)", { default: 0, max: 2200, required: false })],
    calcResult: { label: "Turn Radius", format: "number" },
    calcResults: [num("turnRadiusM", "Sidecut Radius (m)", true), num("sidecutDepthMm", "Sidecut Depth per Edge (mm)"), num("contactLengthMm", "Contact Length Used (mm)"), num("turnType", "Turn Type (1 Short, 2 Medium, 3 Long)")],
    instructions: "Enter the three widths printed on the ski (e.g. 125-85-110) and its length. If you know the running (contact) length, enter it; otherwise 85% of the length is used.",
    examples: "Example: a 170 cm ski with 125-85-110 mm dimensions has a sidecut radius of about 16 m — a medium-radius all-mountain ski.",
    assumptions: "Treats the sidecut as a circular arc through tip, waist and tail: R = L² ÷ (8d) + d ÷ 2, where d is the sidecut depth per edge. Rocker and multi-radius sidecuts make the maker's figure differ slightly. Under 15 m is short (slalom-style), 15–20 m medium, over 20 m long. " + DISCLAIMER,
    faq: [
      { question: "What turn radius should I choose?", answer: "13–16 m for quick carved turns, 16–20 m for all-mountain, 20 m+ for big, fast turns and powder." },
      { question: "Does a longer ski have a bigger radius?", answer: "Yes — with the same widths, radius grows with the square of the contact length, which is why makers quote radius per length." },
    ],
  },
  {
    slug: "snowboard-size-calculator",
    title: "Snowboard Size Calculator",
    description: "Find the right snowboard length for your height, weight, riding style and ability — for adults, kids and splitboards (also a kids snowboard size and splitboard size calculator).",
    metaTitle: "Snowboard Size Calculator — Board Length Chart",
    metaDescription: "Free snowboard size calculator. Get board length in cm from height, weight, style and ability — adults, kids and splitboards.",
    calcInputs: [dropdown("units", "Units", UNITS, 1), HEIGHT, WEIGHT(70), dropdown("rider", "Rider", [["Adult", 1], ["Child", 2]], 1), dropdown("style", "Riding Style / Board", [["All-mountain", 1], ["Freestyle / park", 2], ["Freeride / powder", 3], ["Splitboard / backcountry", 4]], 1), dropdown("ability", "Ability", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3]], 2)],
    calcResult: { label: "Board Length", format: "number" },
    calcResults: [num("boardLengthCm", "Recommended Board Length (cm)", true), num("rangeLowCm", "Range — Shorter (cm)"), num("rangeHighCm", "Range — Longer (cm)"), num("heightRuleCm", "Height-Only Rule (cm)")],
    instructions: "Enter height and weight, choose adult or child, then your riding style and ability.",
    examples: "Example: a 175 cm, 70 kg intermediate adult riding all-mountain suits about a 154 cm board (151–157 cm). A splitboard for the same rider would be about 158 cm.",
    assumptions: "Adults: average of a height rule (0.88 × height ≈ chin to nose) and a weight rule. Park −3 cm, freeride and splitboards +4 cm, beginners −3 cm, advanced +2 cm. Kids: about 0.82 × height (chest to chin). Weight matters most for flex — check the maker's weight range. " + DISCLAIMER,
    faq: [
      { question: "Should a snowboard come to my chin?", answer: "As a starting point, chin to nose suits most all-mountain riders; go shorter for park and longer for powder." },
      { question: "Why are splitboards longer?", answer: "Extra length gives float in deep backcountry snow and better skinning traction uphill." },
    ],
  },
  {
    slug: "snowboard-boot-size-calculator",
    title: "Snowboard Boot Size Calculator",
    description: "Convert your foot length into a snowboard boot size — mondopoint, US men's and women's, UK and EU.",
    metaTitle: "Snowboard Boot Size Calculator — Size Chart",
    metaDescription: "Free snowboard boot size calculator. Convert foot length to mondopoint and US, UK and EU snowboard boot sizes.",
    calcInputs: [...FOOT, dropdown("gender", "Boot", GENDER, 1)],
    calcResult: { label: "US Size", format: "number" },
    calcResults: [num("recommendedUs", "Recommended US Size", true), num("mondopoint", "Mondopoint (cm)"), num("usMens", "US Men's"), num("usWomens", "US Women's"), num("uk", "UK"), num("eu", "EU")],
    instructions: "Measure your foot from heel to longest toe (standing, bigger foot) and choose men's or women's boots.",
    examples: "Example: a 26.7 cm foot fits a mondopoint 26.5 snowboard boot — US men's 8.5 (women's 9.5), UK 7.5, EU 42.",
    assumptions: "Snowboard boots are fitted snug, so foot length is rounded to the nearest half mondopoint. US men's ≈ mondopoint − 18; women's are one size higher. Sizes vary by brand — always try boots on with your riding socks. " + DISCLAIMER,
    faq: [
      { question: "Are snowboard boots the same size as shoes?", answer: "Usually the same or a half size smaller than your street shoes — they should feel snug and pack out over time." },
      { question: "How should snowboard boots fit?", answer: "Toes lightly touching the front when standing, pulling back when you bend your knees, with no heel lift." },
    ],
  },
  {
    slug: "snowboard-binding-size-calculator",
    title: "Snowboard Binding Size Calculator",
    description: "Find the right snowboard binding size (S, M or L) for your boot size, for men's and women's bindings.",
    metaTitle: "Snowboard Binding Size Calculator — S, M or L",
    metaDescription: "Free snowboard binding size calculator. Find small, medium or large bindings for your men's or women's boot size.",
    calcInputs: [dropdown("gender", "Bindings", GENDER, 1), numberField("bootSize", "Boot Size (US)", { default: 9, min: 3, max: 16, step: 0.5 })],
    calcResult: { label: "Binding Size", format: "number" },
    calcResults: [num("bindingSize", "Binding Size (1 S, 2 M, 3 L)", true), num("nearSizeBoundary", "On a Size Break (1 = Try Both)"), num("mensEquivalent", "Men's Equivalent Boot Size")],
    instructions: "Choose men's or women's bindings and enter your US boot size.",
    examples: "Example: a men's US 9 boot fits a medium binding.",
    assumptions: "Typical ranges — men's: S up to 7.5, M 8–10.5, L 11+; women's: S up to 6.5, M 7–9.5, L 10+. Brands differ by about half a size, and bulky boots may need the larger size. Check the strap and heel cup fit with your boots. " + DISCLAIMER,
    faq: [
      { question: "What if I'm between binding sizes?", answer: "Try both with your boots — the boot should sit centred with the toe strap covering the toe and no heel movement." },
      { question: "Can women use men's bindings?", answer: "Yes — choose by boot size; women's bindings tend to be softer and have a narrower heel cup." },
    ],
  },
  {
    slug: "snowboard-stance-width-calculator",
    title: "Snowboard Stance Width Calculator",
    description: "Find your snowboard stance width from your height and riding style, plus suggested front and back binding angles.",
    metaTitle: "Snowboard Stance Width Calculator — Width & Angles",
    metaDescription: "Free snowboard stance width calculator. Get stance width in cm and inches and binding angles for your riding style.",
    calcInputs: [dropdown("units", "Units", UNITS, 1), HEIGHT, dropdown("style", "Riding Style", [["All-mountain", 1], ["Freestyle / park (duck)", 2], ["Freeride / carving", 3]], 1)],
    calcResult: { label: "Stance Width", format: "number" },
    calcResults: [num("stanceWidthCm", "Stance Width (cm)", true), num("stanceWidthIn", "Stance Width (in)"), num("frontAngle", "Front Binding Angle (°)"), num("backAngle", "Back Binding Angle (°)")],
    instructions: "Enter your height and riding style. Measure stance width centre to centre between the bindings.",
    examples: "Example: a 175 cm all-mountain rider starts at about 52.5 cm (20.7 in) with angles of +15° front and −6° back.",
    assumptions: "Stance ≈ 0.3 × height (about shoulder width), +2 cm for park, −1 cm for carving. Angles: all-mountain +15/−6, freestyle duck +12/−12, freeride/carving +21/+6. Use the board's reference stance as a check and adjust for comfort. " + DISCLAIMER,
    faq: [
      { question: "What is a duck stance?", answer: "Both feet angled outward (e.g. +12/−12) — popular for park riding and riding switch." },
      { question: "Is a wider stance more stable?", answer: "Up to a point — it adds stability and pop, but too wide strains knees and makes turning harder." },
    ],
  },
  {
    slug: "snowboard-waist-width-calculator",
    title: "Snowboard Waist Width Calculator",
    description: "Find the minimum snowboard waist width for your boot size and binding angles — and whether you need a regular, mid-wide or wide board.",
    metaTitle: "Snowboard Waist Width Calculator — Wide Board?",
    metaDescription: "Free snowboard waist width calculator. Find the minimum waist width for your boot size and whether you need a wide board.",
    calcInputs: [dropdown("gender", "Boot", GENDER, 1), numberField("bootSize", "Boot Size (US)", { default: 9, min: 3, max: 16, step: 0.5 }), numberField("frontAngle", "Front Binding Angle (°)", { default: 15, min: -45, max: 45 }), numberField("backAngle", "Back Binding Angle (°)", { default: -6, min: -45, max: 45 })],
    calcResult: { label: "Minimum Waist Width", format: "number" },
    calcResults: [num("minimumWaistMm", "Minimum Waist Width (mm)", true), num("widthCategory", "Board Width (1 Regular, 2 Mid-Wide, 3 Wide)"), num("mensEquivalentSize", "Men's Equivalent Boot Size")],
    instructions: "Enter your boot size and your binding angles.",
    examples: "Example: a men's US 9 boot at +15/−6 needs about a 250 mm waist — a regular-width board.",
    assumptions: "About 250 mm for a men's 9, +5 mm per boot size, a little less with steeper average angles. Under 253 mm regular, 253–259 mid-wide, 260+ wide. Low-profile boots and binding lift reduce toe/heel drag. " + DISCLAIMER,
    faq: [
      { question: "What boot size needs a wide snowboard?", answer: "Generally men's US 11 and up, or 10.5 with low angles." },
      { question: "What happens if the board is too narrow?", answer: "Your toes or heels drag in the snow on hard carves, which can catch and throw you." },
    ],
  },
  {
    slug: "snowshoe-size-calculator",
    title: "Snowshoe Size Calculator",
    description: "Find the right snowshoe size from your body weight plus pack weight and the snow you'll be on.",
    metaTitle: "Snowshoe Size Calculator — Size by Weight",
    metaDescription: "Free snowshoe size calculator. Get snowshoe length in inches from body and pack weight and snow conditions.",
    calcInputs: [dropdown("units", "Units", [["Kilograms", 1], ["Pounds", 2]], 1), WEIGHT(70), numberField("packWeight", "Pack & Gear Weight", { default: 7, max: 200, step: 0.5 }), dropdown("snow", "Snow", [["Packed trails", 1], ["Mixed / variable", 2], ["Deep powder", 3]], 2)],
    calcResult: { label: "Snowshoe Size", format: "number" },
    calcResults: [num("snowshoeLengthIn", "Snowshoe Length (in)", true), num("snowshoeLengthCm", "Snowshoe Length (cm)"), num("totalLoadLb", "Total Load (lb)"), num("totalLoadKg", "Total Load (kg)")],
    instructions: "Enter your weight and the weight of your pack and gear, then the snow you expect most.",
    examples: "Example: a 70 kg hiker with a 7 kg pack (about 170 lb total) on mixed snow needs about 21 in snowshoes.",
    assumptions: "Typical load ranges: 17 in up to 90 lb (kids), 21 in up to 175 lb, 25 in up to 225 lb, 30 in up to 275 lb, 36 in above. One size smaller for packed trails, one larger for deep powder. Maker charts vary — check the stated load range. " + DISCLAIMER,
    faq: [
      { question: "Are bigger snowshoes better?", answer: "Bigger float better in powder but are heavier and clumsier on packed trails and steep terrain." },
      { question: "Should I include my pack weight?", answer: "Yes — snowshoes are sized on total load, including pack, clothing and gear." },
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
