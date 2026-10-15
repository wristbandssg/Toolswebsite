// One-time (but safe to re-run) batch setup script: creates 11 accessory, jewelry, workwear and diaper size tools
// from the user's shopping list (Shopping Calculators > Clothing, Shoe & Ring Size Calculators).
// See src/lib/calc-engine-shopping-size-accessories.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-size-accessories-calculators.ts
// or
//   npm run db:create-shopping-size-accessories-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Clothing, Shoe & Ring Size Calculators", slug: "clothing-shoe-ring-size-calculators" };

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

const UNIT: [string, number][] = [["Inches", 0], ["Centimetres", 1]];
const FIT_NOTE = "Sizing differs between brands; check each brand's own chart and use this as a starting point.";

const TOOLS: ToolDef[] = [
  {
    slug: "hat-size-calculator",
    title: "Hat Size Calculator",
    description: "Find your hat size from head circumference — fitted US hat size to the eighth, S–XXL, UK size and EU size in centimetres.",
    metaTitle: "Hat Size Calculator — Fitted, Letter & EU Sizes",
    metaDescription: "Free hat size calculator. Find your fitted hat size (like 7 1/4), S–XXL size, UK and EU cm sizes from your head circumference.",
    calcInputs: [
      numberField("head", "Head Circumference (Above Ears & Eyebrows)", { default: 22.75, max: 30, step: 0.125 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Fitted Hat Size", format: "number" },
    calcResults: [
      { key: "fittedHatSize", label: "Fitted Hat Size (US, e.g. 7.25 = 7 1/4)", format: "number", highlight: true },
      { key: "letterCode", label: "Letter Size (1 S, 2 M, 3 L, 4 XL, 5 XXL)", format: "number" },
      { key: "ukSize", label: "UK Size", format: "number" },
      { key: "euSizeCm", label: "EU Size (cm)", format: "number" },
      { key: "headInches", label: "Head (in)", format: "number" },
    ],
    instructions: "Wrap a soft tape around your head about 1/8 in above your ears and eyebrows, where a hat sits. If you're between sizes, size up.",
    examples: "Example: a 22.75 in head is a fitted size 7.25 (7 1/4), letter code 3 — a large — or EU 58.",
    assumptions: "US fitted hat size = head circumference ÷ π, rounded to the nearest 1/8. UK sizes run 1/8 smaller than US. Letter sizes: S up to 21.5 in, M 22.25, L 23, XL 23.75, XXL 24.5. " + FIT_NOTE,
    faq: [
      { question: "How do I measure my hat size?", answer: "Measure around your head just above your ears and eyebrows, then divide by 3.14 for the US fitted size, or use the centimetres as the EU size." },
      { question: "What hat size is 23 inches?", answer: "About 7 3/8 in fitted sizes — a large." },
    ],
  },
  {
    slug: "glove-size-calculator",
    title: "Glove Size Calculator",
    description: "Find your glove size from your hand circumference — numeric glove size and S to XXL — for men's and women's gloves.",
    metaTitle: "Glove Size Calculator — Men's & Women's",
    metaDescription: "Free glove size calculator. Find your numeric glove size and S–XXL size from hand circumference for men's and women's gloves.",
    calcInputs: [
      numberField("hand", "Hand Circumference (Around the Knuckles, No Thumb)", { default: 8.75, max: 15, step: 0.125 }),
      dropdown("gender", "Gloves", [["Men's", 0], ["Women's", 1]], 0),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Glove Size", format: "number" },
    calcResults: [
      { key: "gloveSize", label: "Numeric Glove Size", format: "number", highlight: true },
      { key: "letterCode", label: "Letter Size (Men: 1 S … 5 XXL · Women: 1 XS … 5 XL)", format: "number" },
      { key: "handCm", label: "Hand (cm)", format: "number" },
    ],
    instructions: "Measure around your dominant hand at the widest point, just below the knuckles, leaving out the thumb.",
    examples: "Example: an 8.75 in men's hand is glove size 9, letter code 3 — a large (try a medium if you like a snug fit).",
    assumptions: "Numeric glove size ≈ hand circumference in inches. Men's: S up to 7.25, M 8.25, L 9.25, XL 10.25. Women's: XS up to 6.25, S 7, M 7.75, L 8.25. Work and ski gloves may have their own charts. " + FIT_NOTE,
    faq: [
      { question: "What size glove do I wear?", answer: "Measure around your knuckles in inches — that number is your glove size; 8–9 is typically a men's medium." },
      { question: "Should gloves be tight?", answer: "Snug but not restrictive; leave a little room at the fingertips for warmth in winter gloves." },
    ],
  },
  {
    slug: "tie-length-calculator",
    title: "Tie Length Calculator",
    description: "Find the tie length you need — standard, extra long or short — from your height, neck size and knot, plus a tie width that suits your build.",
    metaTitle: "Tie Length Calculator — Standard or Extra Long",
    metaDescription: "Free tie length calculator. Find whether you need a standard, extra-long or short tie from height, neck size and knot, plus tie width.",
    calcInputs: [
      numberField("height", "Height", { default: 74, max: 90, step: 0.5 }),
      numberField("neck", "Neck Size", { default: 16.5, max: 25, step: 0.25 }),
      dropdown("knot", "Knot", [["Four-in-hand", 0], ["Half Windsor", 1], ["Full Windsor", 2]], 2),
      numberField("chest", "Chest (for Width)", { default: 42, max: 70, step: 0.5, required: false }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Tie Length", format: "number" },
    calcResults: [
      { key: "tieLength", label: "Tie Length Needed (in)", format: "number", highlight: true },
      { key: "tieTypeCode", label: "Tie to Buy (1 Standard 57–59 in, 2 Extra Long 61–63 in, 3 Short / Boys)", format: "number" },
      { key: "tieWidth", label: "Suggested Tie Width (in)", format: "number" },
      { key: "tieLengthCm", label: "Tie Length (cm)", format: "number" },
    ],
    instructions: "Enter your height, neck size and the knot you tie — bigger knots use more length. Add your chest for a width that balances your frame and lapels.",
    examples: "Example: at 6'2\" with a 16.5 in neck and a full Windsor you need about 64.2 in — tie type 2, an extra-long tie — about 3 in wide.",
    assumptions: "A tie should end at the middle of the belt buckle. Length needed ≈ 80% of height, plus about 2 in for a half Windsor or 4 in for a full Windsor, plus extra for necks over 16 in. Standard ties are 57–59 in; extra long 61–63 in.",
    faq: [
      { question: "How long should a tie be?", answer: "Long enough that the tip touches the middle of your belt buckle — most adults need a standard 57–59 in tie." },
      { question: "Who needs an extra-long tie?", answer: "Men over about 6'2\", those with a neck over 17 in, or anyone who ties a full Windsor and finds standard ties too short." },
    ],
  },
  {
    slug: "coverall-size-calculator",
    title: "Coverall Size Calculator",
    description: "Find your coverall or overalls size — chest size with regular, tall or short length — and the letter size, for work coveralls and boiler suits.",
    metaTitle: "Coverall Size Calculator — Chest & Length",
    metaDescription: "Free coverall size calculator. Find work coverall and boiler suit sizes from chest and height, with regular, tall or short length.",
    calcInputs: [
      numberField("chest", "Chest", { default: 43, max: 80, step: 0.5 }),
      numberField("height", "Height", { default: 73, max: 90, step: 0.5 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Coverall Size", format: "number" },
    calcResults: [
      { key: "coverallChestSize", label: "Coverall Chest Size", format: "number", highlight: true },
      { key: "lengthCode", label: "Length (1 Regular, 2 Tall, 3 Short)", format: "number" },
      { key: "letterCode", label: "Letter Size (1 S, 2 M, 3 L, 4 XL, 5 2XL, 6 3XL, 7 4XL)", format: "number" },
      { key: "heightInches", label: "Height (in)", format: "number" },
    ],
    instructions: "Measure your chest over the clothes you'll wear underneath and enter your height. Coveralls need room to bend and reach, so size up if you're between sizes.",
    examples: "Example: a 43 in chest at 6'1\" is a size 44 tall (length code 2), or letter code 3.",
    assumptions: "Coveralls are commonly sized by chest in even inches (38–60) with short (under about 5'6\"), regular and tall (over 6'0\") lengths. Insulated coveralls need extra room. " + FIT_NOTE,
    faq: [
      { question: "How should coveralls fit?", answer: "Loose enough to squat, bend and lift your arms overhead without the crotch or shoulders pulling." },
      { question: "Do I need tall coveralls?", answer: "Usually if you're over about 6 feet or have a long torso." },
    ],
  },
  {
    slug: "glasses-frame-size-calculator",
    title: "Glasses Frame Size Calculator",
    description: "Work out your glasses frame size — lens width, bridge and temple length (like 52-18-140) — from your face width, and whether you need small, medium or large frames.",
    metaTitle: "Glasses Frame Size Calculator — Lens, Bridge, Arm",
    metaDescription: "Free glasses frame size calculator. Find lens width, bridge and temple length from face width, and whether small, medium or large frames fit.",
    calcInputs: [
      numberField("faceWidthMm", "Face Width (Temple to Temple)", { unit: "mm", default: 136, max: 200, step: 1 }),
      dropdown("bridge", "Nose Bridge", [["Narrow", 0], ["Average", 1], ["Wide", 2]], 1),
    ],
    calcResult: { label: "Lens Width", format: "number" },
    calcResults: [
      { key: "lensWidthMm", label: "Lens Width (mm)", format: "number", highlight: true },
      { key: "bridgeMm", label: "Bridge (mm)", format: "number" },
      { key: "templeLengthMm", label: "Temple (Arm) Length (mm)", format: "number" },
      { key: "frameSizeCode", label: "Frame Size (1 Small, 2 Medium, 3 Large)", format: "number" },
      { key: "totalFrameWidthMm", label: "Total Frame Width (mm)", format: "number" },
    ],
    instructions: "Measure straight across your face from temple to temple, in front of your ears, in millimetres — or measure the front of a pair of glasses that fits. Choose your nose bridge width.",
    examples: "Example: a 136 mm face with an average bridge suits frames of about 54-18-140, a size code 2 (medium) frame.",
    assumptions: "The three numbers on glasses arms are lens width, bridge and temple length in mm. Frame front ≈ face width; hinges and end pieces add about 10 mm. Lens shape and how the frame sits on your nose also matter.",
    faq: [
      { question: "What do the numbers on glasses mean?", answer: "For example 52-18-140: 52 mm lens width, 18 mm bridge and 140 mm temple arms." },
      { question: "How do I know my frame size?", answer: "Check the numbers inside the arm of glasses that fit well, or measure your face width and match it to the frame's total width." },
    ],
  },
  {
    slug: "diaper-size-calculator",
    title: "Diaper Size Calculator",
    description: "Find the right diaper size (newborn to size 7) from your baby's weight, when to move up, and how many diapers they'll use per day and month.",
    metaTitle: "Diaper Size Calculator — Size by Weight",
    metaDescription: "Free diaper size calculator. Find your baby's diaper size by weight, when to size up and how many diapers per day and month you'll need.",
    calcInputs: [
      numberField("weight", "Baby's Weight", { default: 17, max: 80, step: 0.5 }),
      dropdown("weightUnit", "Weight In", [["Pounds", 0], ["Kilograms", 1]], 0),
      numberField("ageMonths", "Age", { unit: "months", default: 6, max: 48 }),
    ],
    calcResult: { label: "Diaper Size", format: "number" },
    calcResults: [
      { key: "diaperSize", label: "Diaper Size (0 = Newborn)", format: "number", highlight: true },
      { key: "nextSizeAtLb", label: "Move Up Around (lb)", format: "number" },
      { key: "diapersPerDay", label: "Diapers per Day", format: "number" },
      { key: "diapersPerMonth", label: "Diapers per Month", format: "number" },
      { key: "weightLb", label: "Weight (lb)", format: "number" },
    ],
    instructions: "Enter your baby's weight and age. Weight ranges overlap between sizes — move up when you see leaks, red marks or tabs that barely reach.",
    examples: "Example: a 17 lb, 6-month-old baby wears size 2 and will move up around 18 lb, using about 7 diapers a day — 210 a month.",
    assumptions: "Typical US weight limits: newborn up to 10 lb, size 1 to 14, size 2 to 18, size 3 to 28, size 4 to 37, size 5 to 42, size 6 to 50, size 7 above. Daily use falls from about 10–12 for newborns to 5–6 for toddlers. Brands differ.",
    faq: [
      { question: "When should I move up a diaper size?", answer: "When there are leaks or blowouts, red marks on the legs or waist, or the tabs barely meet — weight ranges are only a guide." },
      { question: "How many diapers does a baby use a day?", answer: "About 10–12 as a newborn, 8–10 at 1–5 months, 6–8 at 6–12 months and 5–7 for toddlers." },
    ],
  },
  {
    slug: "ring-size-calculator",
    title: "Ring Size Calculator",
    description: "Find your ring size from finger circumference or a ring's inner diameter — and convert between US, UK, EU/ISO and Japanese ring sizes.",
    metaTitle: "Ring Size Calculator — US, UK, EU & JP Sizes",
    metaDescription: "Free ring size calculator and converter. Find your ring size from finger circumference or ring diameter in US, UK, EU and Japanese sizes.",
    calcInputs: [
      numberField("measurement", "Measurement", { default: 54, max: 120, step: 0.1 }),
      dropdown("measureType", "What You Measured", [["Finger circumference (mm)", 0], ["Ring inner diameter (mm)", 1], ["Finger circumference (inches)", 2]], 0),
    ],
    calcResult: { label: "US Ring Size", format: "number" },
    calcResults: [
      { key: "usRingSize", label: "US / Canada Ring Size", format: "number", highlight: true },
      { key: "ukLetterCode", label: "UK / Australia Size (Letter Number: 1 A, 2 B … 13 M, 14 N … 26 Z)", format: "number" },
      { key: "euIsoSize", label: "EU / ISO Size (Circumference mm)", format: "number" },
      { key: "japanSize", label: "Japanese Size", format: "number" },
      { key: "innerDiameterMm", label: "Inner Diameter (mm)", format: "number" },
    ],
    instructions: "Wrap a strip of paper around the base of your finger, mark where it overlaps and measure the length in millimetres — or measure the inside diameter of a ring that fits. Measure at the end of the day when fingers are largest.",
    examples: "Example: a 54 mm finger circumference is a US size 6.75, UK letter 14 (about N), EU 54 and Japanese 13.",
    assumptions: "US size = (inner diameter mm − 11.63) ÷ 0.8128, rounded to the quarter size; EU/ISO size is the circumference in mm; UK letters run roughly two letters per US size. Wide bands (over 6 mm) often need a quarter to half size larger. " + FIT_NOTE,
    faq: [
      { question: "How can I measure my ring size at home?", answer: "Wrap paper or string around your finger, mark the overlap, measure it in millimetres and enter it here as circumference." },
      { question: "What is the average ring size?", answer: "Around US 6–7 for women and 9–10 for men." },
    ],
  },
  {
    slug: "chain-length-calculator",
    title: "Chain Length Calculator",
    description: "Find the right necklace or chain length — choker, princess, matinee, opera or rope — from your neck size, rounded to standard chain lengths.",
    metaTitle: "Chain Length Calculator — Necklace Length by Neck",
    metaDescription: "Free chain length calculator. Find the right necklace length for chokers, princess, matinee and opera styles from your neck size.",
    calcInputs: [
      numberField("neck", "Neck Size", { default: 14, max: 25, step: 0.25 }),
      dropdown("style", "Where It Should Sit", [["Choker (high on the neck)", 0], ["Princess / collarbone", 1], ["Just below the collarbone", 2], ["Matinee (above the bust)", 3], ["Opera (at the bust)", 4], ["Rope (below the bust)", 5]], 1),
      dropdown("pendant", "With a Pendant?", [["No", 0], ["Yes (needs a little more length)", 1]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Chain Length", format: "number" },
    calcResults: [
      { key: "chainLength", label: "Standard Chain Length (in)", format: "number", highlight: true },
      { key: "exactLength", label: "Exact Length for Your Neck (in)", format: "number" },
      { key: "chainLengthCm", label: "Chain Length (cm)", format: "number" },
      { key: "neckInches", label: "Neck (in)", format: "number" },
    ],
    instructions: "Measure around the base of your neck, choose where you want the necklace to fall and whether it carries a pendant. The result rounds up to the next standard chain length.",
    examples: "Example: a 14 in neck wanting a princess-length chain with a pendant needs about 19 in, so buy a 20 in chain (51 cm).",
    assumptions: "Standard lengths: 14–16 in choker, 18 in princess, 20 in, 22–24 in matinee, 30–36 in opera, 40 in rope. Men's chains usually start at 20–22 in. Larger necks need longer chains to sit at the same spot.",
    faq: [
      { question: "What is the most popular necklace length?", answer: "18 inches — it sits at the collarbone on most women." },
      { question: "What chain length should a man wear?", answer: "Usually 20–22 inches to sit at the base of the neck or just below, and 24 inches for a pendant." },
    ],
  },
  {
    slug: "bracelet-size-calculator",
    title: "Bracelet Size Calculator",
    description: "Find your bracelet size from your wrist measurement — snug, comfortable or loose fit — in inches, centimetres and S–XL.",
    metaTitle: "Bracelet Size Calculator — Wrist to Bracelet",
    metaDescription: "Free bracelet size calculator. Find your bracelet length from wrist size for a snug, comfortable or loose fit, in inches, cm and S–XL.",
    calcInputs: [
      numberField("wrist", "Wrist (Just Below the Wrist Bone)", { default: 6.25, max: 12, step: 0.125 }),
      dropdown("fit", "Fit", [["Snug", 0], ["Comfortable", 1], ["Loose", 2]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Bracelet Length", format: "number" },
    calcResults: [
      { key: "braceletLength", label: "Bracelet Length (in)", format: "number", highlight: true },
      { key: "braceletLengthCm", label: "Bracelet Length (cm)", format: "number" },
      { key: "letterCode", label: "Letter Size (1 XS, 2 S, 3 M, 4 L, 5 XL)", format: "number" },
      { key: "wristInches", label: "Wrist (in)", format: "number" },
    ],
    instructions: "Measure your wrist just below the wrist bone with a tape or strip of paper, then choose how you like bracelets to fit. Chunky bracelets need a little more length.",
    examples: "Example: a 6.25 in wrist with a comfortable fit needs a 7 in bracelet (17.78 cm) — letter code 2.",
    assumptions: "Bracelet length = wrist + 0.5 in (snug), 0.75 in (comfortable) or 1 in (loose). Charm bracelets and thick links need an extra quarter to half inch. Bangles and cuffs are sized differently.",
    faq: [
      { question: "How long should a bracelet be?", answer: "About 3/4 inch longer than your wrist for a comfortable fit — a 6 in wrist suits a 6.75–7 in bracelet." },
      { question: "What is the average bracelet size?", answer: "7 inches for women and about 8 inches for men." },
    ],
  },
  {
    slug: "bangle-size-calculator",
    title: "Bangle Size Calculator",
    description: "Find your bangle size — inner diameter in mm and inches, Indian bangle size (2.2 to 2.12) and S–XL — from your hand circumference at the knuckles.",
    metaTitle: "Bangle Size Calculator — Indian Size & Diameter",
    metaDescription: "Free bangle size calculator. Find bangle inner diameter, Indian bangle size (2.2–2.12) and S–XL from your hand size at the knuckles.",
    calcInputs: [
      numberField("hand", "Hand Circumference (Thumb Tucked In, Around the Knuckles)", { default: 7.5, max: 14, step: 0.125 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Inner Diameter", format: "number" },
    calcResults: [
      { key: "innerDiameterMm", label: "Bangle Inner Diameter (mm)", format: "number", highlight: true },
      { key: "innerDiameterIn", label: "Inner Diameter (in)", format: "number" },
      { key: "indianSizeCode", label: "Indian Bangle Size (1 = 2.2, 2 = 2.4, 3 = 2.6, 4 = 2.8, 5 = 2.10, 6 = 2.12)", format: "number" },
      { key: "letterCode", label: "Letter Size (1 S, 2 M, 3 L, 4 XL)", format: "number" },
      { key: "innerCircumferenceMm", label: "Inner Circumference (mm)", format: "number" },
    ],
    instructions: "Bring your thumb in toward your little finger as if putting on a bangle, then measure around the widest part of your hand over the knuckles.",
    examples: "Example: a 7.5 in hand needs a bangle with about a 62.16 mm inner diameter — Indian size code 4 (2.8).",
    assumptions: "Inner diameter ≈ hand circumference ÷ π plus a little room. Indian sizes count sixteenths of an inch above 2 in: 2.4 = 2 4/16 in (57 mm), 2.6 = 2 6/16 in (60 mm), 2.8 = 2 8/16 in (64 mm). Rigid bangles must pass over the knuckles; a bangle that fits a slim wrist may not.",
    faq: [
      { question: "What does bangle size 2.6 mean?", answer: "2 and 6/16 inches inner diameter — about 60 mm." },
      { question: "How do I measure for a bangle?", answer: "Tuck your thumb in and measure around the widest part of your hand, since a bangle has to slide over your knuckles." },
    ],
  },
  {
    slug: "watch-size-calculator",
    title: "Watch Size Calculator",
    description: "Find the watch case size that suits your wrist — ideal diameter in mm, a comfortable range, the maximum lug-to-lug width and strap size — for dress, everyday or sport watches.",
    metaTitle: "Watch Size Calculator — Case Size for Your Wrist",
    metaDescription: "Free watch size calculator. Find the ideal watch case diameter, size range, maximum lug-to-lug and strap size for your wrist.",
    calcInputs: [
      numberField("wrist", "Wrist Circumference", { default: 7, max: 12, step: 0.125 }),
      dropdown("style", "Watch Style", [["Dress watch", 0], ["Everyday", 1], ["Sport / dive", 2]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Ideal Case Size", format: "number" },
    calcResults: [
      { key: "idealCaseMm", label: "Ideal Case Diameter (mm)", format: "number", highlight: true },
      { key: "caseRangeLow", label: "Comfortable Range From (mm)", format: "number" },
      { key: "caseRangeHigh", label: "Comfortable Range To (mm)", format: "number" },
      { key: "maxLugToLugMm", label: "Maximum Lug-to-Lug (mm)", format: "number" },
      { key: "strapSizeCode", label: "Strap Size (1 Small, 2 Regular, 3 Large)", format: "number" },
    ],
    instructions: "Measure around your wrist where you wear a watch, and choose the style. Lug-to-lug — the length from one strap end of the case to the other — matters as much as diameter: it shouldn't overhang the top of your wrist.",
    examples: "Example: a 7 in wrist suits an everyday watch of about 40 mm (38–42 mm) with a lug-to-lug no longer than about 55 mm.",
    assumptions: "Rule of thumb: about 36 mm for a 6 in wrist, rising roughly 4 mm per inch; dress watches run smaller and sport watches larger. Maximum lug-to-lug ≈ the flat top width of the wrist (about 31% of its circumference). Case thickness and bezel style change how big a watch looks.",
    faq: [
      { question: "What watch size is best for a 7 inch wrist?", answer: "Usually about 38–42 mm, with a lug-to-lug under about 55 mm." },
      { question: "Why does lug-to-lug matter?", answer: "If the lugs extend past the edges of your wrist, the watch looks and feels too big, whatever its diameter." },
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
