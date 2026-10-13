// One-time (but safe to re-run) batch setup script: creates the 8 tools of
// the other-sports sub-batch "Surf, SUP, Kayak & Boards". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-boards.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-boards-calculators.ts
// or
//   npm run db:create-other-boards-calculators

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


const WT = (def = 170) => [numberField("weight", "Body Weight", { default: def, min: 20, max: 400 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];
const HT = (key = "height", unitKey = "heightUnit", def = 70) => [numberField(key, "Height", { default: def, min: 30, max: 230, step: 0.5 }), dropdown(unitKey, "Height Unit", [["inches", 1], ["cm", 2]], 1)];
const WATER = " Always check conditions, wear a leash or PFD as required and know your limits.";

const TOOLS: ToolDef[] = [
  {
    slug: "surfboard-volume-calculator",
    title: "Surfboard Volume Calculator",
    description: "Find the right surfboard volume in litres for your weight, ability, fitness and waves — using the guild factor.",
    metaTitle: "Surfboard Volume Calculator — Litres for Your Weight",
    metaDescription: "Free surfboard volume calculator. Get ideal board volume in litres from weight, surfing ability, fitness and wave type.",
    calcInputs: [...WT(), dropdown("skill", "Ability", [["Beginner", 1], ["Novice", 2], ["Intermediate", 3], ["Advanced", 4], ["Pro / expert", 5]], 3), dropdown("fitness", "Fitness", [["Below average / older", 1], ["Average", 2], ["Very fit", 3]], 2), dropdown("waves", "Waves", [["Small / mushy", 1], ["Average", 2], ["Powerful / hollow", 3]], 2)],
    calcResult: { label: "Volume", format: "number" },
    calcResults: [num("volumeLitres", "Recommended Volume (L)", true), num("volumeLow", "Range — From (L)"), num("volumeHigh", "Range — To (L)"), num("weightKg", "Your Weight (kg)")],
    instructions: "Enter your weight (in your wetsuit) and be honest about ability and fitness.",
    examples: "Example: a 170 lb (77 kg) intermediate surfer in average waves suits about 32–37 L — around 35 L.",
    assumptions: "Volume = weight (kg) × guild factor: beginner 0.8–1.0, novice 0.55–0.65, intermediate 0.42–0.48, advanced 0.38–0.41, pro 0.35–0.37; +10% for lower fitness or small waves, −5% for very fit surfers or powerful waves. Board shape matters as much as litres." + WATER + " " + DISCLAIMER,
    faq: [
      { question: "Is more volume easier?", answer: "Yes — more float means easier paddling and catching waves, at the cost of manoeuvrability." },
      { question: "Does a wetsuit change the volume I need?", answer: "Slightly — add a litre or two for thick winter suits." },
    ],
  },
  {
    slug: "surfboard-size-calculator",
    title: "Surfboard Size Calculator",
    description: "Find the right surfboard length and width for your height, weight and ability — longboard, funboard or shortboard.",
    metaTitle: "Surfboard Size Calculator — What Size Surfboard?",
    metaDescription: "Free surfboard size calculator. Get board length and width for your height, weight and level, from foamie to shortboard.",
    calcInputs: [...WT(), ...HT(), dropdown("skill", "Ability", [["Beginner (soft-top / longboard)", 1], ["Intermediate (funboard / mid-length)", 2], ["Advanced (shortboard)", 3]], 2)],
    calcResult: { label: "Board Length", format: "number" },
    calcResults: [num("lengthInches", "Length (in)", true), num("lengthFeet", "Length — Feet"), num("lengthExtraInches", "Length — Inches"), num("widthInches", "Width (in)")],
    instructions: "Enter your height, weight and ability. Pair the result with the Surfboard Volume Calculator.",
    examples: "Example: a 170 lb intermediate → about 7'2\" × 21¼\" (funboard / mid-length).",
    assumptions: "Beginners: 8'0\"–9'6\" by weight (+6\" per 40 lb), ~22½\" wide. Intermediates: 6'10\"–7'10\", ~21¼\". Advanced shortboards: height + 2–6\" by weight, 19–20½\" wide. Typical shop guidance — wave type and board style change it. " + DISCLAIMER,
    faq: [
      { question: "What size surfboard should a beginner get?", answer: "A soft-top 8–9 ft long — stable and easy to paddle." },
      { question: "When can I move to a shortboard?", answer: "Once you can paddle into green waves, pop up quickly and turn on the face." },
    ],
  },
  {
    slug: "paddle-board-size-calculator",
    title: "Paddle Board Size Calculator",
    description: "Find the right stand-up paddle board (SUP) length, width and volume for your weight, skill and paddling style.",
    metaTitle: "Paddle Board Size Calculator — SUP Size",
    metaDescription: "Free paddle board size calculator. Get SUP length, width and volume for your weight, gear, skill and use.",
    calcInputs: [...WT(180), numberField("gear", "Gear, Kids or Dog Carried (same unit)", { default: 0, max: 200, required: false }), dropdown("use", "Use", [["All-round / recreation", 1], ["Touring", 2], ["Racing", 3], ["Surfing", 4], ["Yoga / fishing", 5]], 1), dropdown("skill", "Skill", [["Beginner", 1], ["Intermediate", 2], ["Advanced", 3]], 1)],
    calcResult: { label: "Board Length", format: "number" },
    calcResults: [num("lengthInches", "Length (in)", true), num("lengthFeet", "Length — Feet"), num("lengthExtraInches", "Length — Inches"), num("widthInches", "Width (in)"), num("volumeLitres", "Volume (L)")],
    instructions: "Enter your weight plus anything you'll carry, how you'll use the board and your skill.",
    examples: "Example: a 180 lb beginner wanting an all-round board → 10'6\" × 32\" with about 163 L.",
    assumptions: "Volume ≈ total weight (kg) × 2.0 (beginner), 1.6 (intermediate) or 1.3 (advanced), +15% for yoga/fishing, −20% for surf SUPs. Lengths: all-round 10'6\", touring 12'6\", race 14', surf 9' (+6\" for riders over 100 kg). Check the board's weight capacity." + WATER + " " + DISCLAIMER,
    faq: [
      { question: "Is a wider SUP more stable?", answer: "Yes — 32–34\" boards are very stable; narrower boards are faster." },
      { question: "Inflatable or hard board?", answer: "Inflatables are easier to store and transport; hard boards glide better." },
    ],
  },
  {
    slug: "sup-paddle-length-calculator",
    title: "SUP Paddle Length Calculator",
    description: "Find the right stand-up paddle length for your height and paddling style.",
    metaTitle: "SUP Paddle Length Calculator — By Height",
    metaDescription: "Free SUP paddle length calculator. Get the right paddle length from your height for flatwater, surf or touring.",
    calcInputs: [...HT("height", "unit"), dropdown("use", "Paddling", [["Flatwater / all-round", 1], ["SUP surfing", 2], ["Touring / racing", 3]], 1)],
    calcResult: { label: "Paddle Length", format: "number" },
    calcResults: [num("paddleLengthInches", "Paddle Length (in)", true), num("paddleLengthCm", "Paddle Length (cm)"), num("rangeLowInches", "Range — From (in)"), num("rangeHighInches", "Range — To (in)")],
    instructions: "Enter your height and how you'll mostly paddle.",
    examples: "Example: 5'10\" (70\") for all-round paddling → about 79\" (201 cm).",
    assumptions: "Paddle ≈ height + 8–10\" for flatwater, + 6–8\" for surfing, + 10–12\" for touring and racing. Adjustable paddles let you fine-tune: with the blade in the water your top hand should be just above head height. " + DISCLAIMER,
    faq: [
      { question: "What happens if my SUP paddle is too long?", answer: "Your shoulders work harder and the stroke gets awkward." },
      { question: "Which way should the blade angle face?", answer: "Forward, away from you — it gives a cleaner, more efficient stroke." },
    ],
  },
  {
    slug: "kayak-paddle-length-calculator",
    title: "Kayak Paddle Length Calculator",
    description: "Find the right kayak paddle length from your boat's width, your height and paddling style.",
    metaTitle: "Kayak Paddle Length Calculator — Paddle Size",
    metaDescription: "Free kayak paddle length calculator. Get paddle length in cm from kayak width, paddler height and paddling angle.",
    calcInputs: [numberField("boatWidth", "Kayak Width", { default: 26, min: 15, max: 100 }), numberField("height", "Your Height", { default: 70, min: 40, max: 230 }), dropdown("unit", "Unit", [["inches", 1], ["cm", 2]], 1), dropdown("style", "Paddling Style", [["Low angle (relaxed touring)", 1], ["High angle (fast / aggressive)", 2]], 1)],
    calcResult: { label: "Paddle Length", format: "number" },
    calcResults: [num("paddleLengthCm", "Paddle Length (cm)", true), num("paddleLengthInches", "Paddle Length (in)")],
    instructions: "Measure the widest point of your kayak and enter your height and style.",
    examples: "Example: a 26\" wide kayak and a 5'10\" paddler → a 220 cm paddle for low-angle paddling (about 210 cm high-angle).",
    assumptions: "Werner-style sizing chart by boat width (< 23\", 23–28\", 28–32\", > 32\") and paddler height (< 5'5\", 5'5\"–5'11\", 6'+); high-angle paddlers go about 10 cm shorter. Sit-on-top and fishing kayaks with high seats need the longer end. " + DISCLAIMER,
    faq: [
      { question: "Does boat width matter more than height?", answer: "Usually — a wide boat needs a longer paddle to reach the water." },
      { question: "What is high-angle paddling?", answer: "A more vertical, powerful stroke used for speed — it suits shorter paddles." },
    ],
  },
  {
    slug: "kayak-distance-calculator",
    title: "Kayak Distance Calculator",
    description: "Estimate how far you can kayak in a given time — or how long a trip will take — by kayak type, effort and current.",
    metaTitle: "Kayak Distance Calculator — Miles & Trip Time",
    metaDescription: "Free kayak distance calculator. Estimate kayaking distance and trip time from kayak type, effort, current and breaks.",
    calcInputs: [dropdown("kayakType", "Kayak", [["Recreational", 1], ["Sit-on-top / fishing", 2], ["Day touring", 3], ["Sea kayak", 4], ["Racing / surfski", 5]], 3), dropdown("effort", "Effort", [["Relaxed", 1], ["Steady", 2], ["Hard", 3]], 2), numberField("current", "Current / Wind Help (+) or Hindrance (−) (mph)", { default: 0, min: -5, max: 5, step: 0.1, required: false }), numberField("hours", "Hours on the Water", { default: 3, min: 0.25, max: 24, step: 0.25 }), percentField("breakPct", "Time Spent Resting", { default: 10, max: 90 }), numberField("tripDistance", "Trip Distance to Time (miles)", { default: 10, max: 200 })],
    calcResult: { label: "Distance", format: "number" },
    calcResults: [num("distanceMiles", "Distance (miles)", true), num("distanceKm", "Distance (km)"), num("speedMph", "Paddling Speed (mph)"), num("hoursForTrip", "Hours for the Trip Distance")],
    instructions: "Choose your kayak and effort, add any current or wind, and enter the time you'll be out.",
    examples: "Example: a day-touring kayak at a steady effort (3.5 mph) for 3 hours with 10% rest covers about 9.5 miles; a 10-mile trip takes about 3.2 hours.",
    assumptions: "Typical cruising speeds: recreational 3 mph, sit-on-top 2.5, day touring 3.5, sea kayak 4, racing 4.5 — × 0.8 relaxed / 1.2 hard. Current and wind are added directly. Plan conservatively — conditions change quickly." + WATER + " " + DISCLAIMER,
    faq: [
      { question: "How far can a beginner kayak in a day?", answer: "About 5–10 miles in calm water." },
      { question: "How fast is a kayak?", answer: "Most people cruise at 2–4 mph (3–6 km/h)." },
    ],
  },
  {
    slug: "bodyboard-size-calculator",
    title: "Bodyboard Size Calculator",
    description: "Find the right bodyboard length for your height and weight.",
    metaTitle: "Bodyboard Size Calculator — What Size Bodyboard?",
    metaDescription: "Free bodyboard size calculator. Get the right bodyboard length in inches and cm from your height and weight.",
    calcInputs: [...HT("height", "unit", 69), ...WT(160)],
    calcResult: { label: "Board Length", format: "number" },
    calcResults: [num("boardLengthInches", "Bodyboard Length (in)", true), num("boardLengthCm", "Bodyboard Length (cm)")],
    instructions: "Enter your height and weight.",
    examples: "Example: 5'9\", 160 lb → a 42\" bodyboard.",
    assumptions: "Typical chart: about 39\" at 5'0\" plus 1\" per 3\" of height (5'6\" ≈ 41\", 6'0\" ≈ 43\"); +1\" if over 200 lb, −1\" if under 110 lb. Standing next to it, the nose should reach between your belly button and chest. " + DISCLAIMER,
    faq: [
      { question: "Is a bigger bodyboard easier?", answer: "A little more float helps, but too big is hard to control." },
      { question: "What core is best?", answer: "PE cores suit cold water, PP cores suit warm water and are stiffer." },
    ],
  },
  {
    slug: "wakeboard-size-calculator",
    title: "Wakeboard Size Calculator",
    description: "Find the right wakeboard length in centimetres for your weight and riding style.",
    metaTitle: "Wakeboard Size Calculator — Board Length by Weight",
    metaDescription: "Free wakeboard size calculator. Get the right wakeboard length in cm from rider weight and style.",
    calcInputs: [...WT(), dropdown("style", "Riding", [["Beginner / cruising", 1], ["All-round", 2], ["Advanced / park & tricks", 3]], 2)],
    calcResult: { label: "Board Length", format: "number" },
    calcResults: [num("boardLengthCm", "Wakeboard Length (cm)", true), num("rangeLowCm", "Range — From (cm)"), num("rangeHighCm", "Range — To (cm)")],
    instructions: "Enter your weight and riding style.",
    examples: "Example: a 170 lb all-round rider → about 136 cm (134–138).",
    assumptions: "Common chart: under 100 lb 125–130 cm, 100–150 lb 130–134, 150–200 lb 134–138, 200–250 lb 138–144, 250+ lb 144+. Beginners go about 2 cm longer for stability; trick riders 2 cm shorter. " + DISCLAIMER,
    faq: [
      { question: "Should a beginner get a longer wakeboard?", answer: "Yes — longer boards are more stable and easier to start on." },
      { question: "Are cable-park boards different?", answer: "Yes — they're tougher with smaller fins; size them the same way." },
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
