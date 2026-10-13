// One-time (but safe to re-run) batch setup script: creates the 9 tools of
// the other-sports sub-batch "Horse Care & Breeding". See
// src/lib/calc-engine-other-football.ts for the full list
// of 17 sub-batches (all under Sports Calculators > Other Sports
// Calculators), and src/lib/calc-engine-other-horse-care.ts for the math and
// how near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-other-horse-care-calculators.ts
// or
//   npm run db:create-other-horse-care-calculators

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 1000000, step: opts.step ?? 1 };
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
const cur = (key: string, label: string, highlight = false) => ({ key, label, format: "currency", ...(highlight ? { highlight: true } : {}) });

const MONTHS: [string, number][] = [["January", 1], ["February", 2], ["March", 3], ["April", 4], ["May", 5], ["June", 6], ["July", 7], ["August", 8], ["September", 9], ["October", 10], ["November", 11], ["December", 12]];
const DATE = (label: string, m: number, d: number) => [dropdown("month", `${label} — Month`, MONTHS, m), numberField("day", `${label} — Day`, { default: d, min: 1, max: 31 })];
const HORSE_WT = (def = 1100) => [numberField("weight", "Horse Weight", { default: def, min: 50, max: 3000 }), dropdown("weightUnit", "Weight Unit", [["lb", 1], ["kg", 2]], 1)];
const STATUS: [string, number][] = [["Idle — easy keeper", 1], ["Idle / maintenance", 2], ["Light work (1–3 h/week)", 3], ["Moderate work (3–5 h/week)", 4], ["Heavy work (4–5 h/week, intense)", 5], ["Very heavy (racing / endurance)", 6], ["Late pregnancy (9–11 months)", 7], ["Lactating mare (early)", 8]];
const EXT: [string, number][] = [["EE (no red)", 1], ["Ee (carries red)", 2], ["ee (chestnut)", 3]];
const AG: [string, number][] = [["AA", 1], ["Aa", 2], ["aa", 3]];
const COPIES: [string, number][] = [["None", 1], ["One copy", 2], ["Two copies", 3]];

const TOOLS: ToolDef[] = [
  {
    slug: "horse-color-calculator",
    title: "Horse Color Calculator",
    description: "Predict foal coat colour odds from the sire's and dam's genes — chestnut, bay, black, palomino, buckskin, cremello and grey (also a stallion colour calculator).",
    metaTitle: "Horse Color Calculator — Foal Coat Color Odds",
    metaDescription: "Free horse color calculator. Predict foal colour odds from stallion and mare genetics: extension, agouti, cream and grey.",
    calcInputs: [dropdown("sireExtension", "Sire Extension (red / black)", EXT, 2), dropdown("sireAgouti", "Sire Agouti", AG, 2), dropdown("sireCream", "Sire Cream", COPIES, 2), dropdown("sireGrey", "Sire Grey", COPIES, 1), dropdown("damExtension", "Dam Extension", EXT, 2), dropdown("damAgouti", "Dam Agouti", AG, 3), dropdown("damCream", "Dam Cream", COPIES, 1), dropdown("damGrey", "Dam Grey", COPIES, 1)],
    calcResult: { label: "Bay", format: "percentage" },
    calcResults: [pct("chestnutPct", "Chestnut"), pct("bayPct", "Bay", true), pct("blackPct", "Black"), pct("palominoPct", "Palomino"), pct("buckskinPct", "Buckskin"), pct("smokyBlackPct", "Smoky Black"), pct("doubleDilutePct", "Cremello / Perlino / Smoky Cream"), pct("greyPct", "Will Turn Grey")],
    instructions: "Enter each parent's colour genotype from a DNA test (or what you know from their colour and offspring). Chestnuts are ee; a horse with one cream gene is palomino, buckskin or smoky black.",
    examples: "Example: a buckskin stallion (Ee Aa, one cream) × a black mare (Ee aa): 12.5% chestnut, 18.75% bay, 18.75% black, 12.5% palomino, 18.75% buckskin and 18.75% smoky black.",
    assumptions: "Mendelian inheritance of Extension (E/e), Agouti (A/a), Cream (Cr) and Grey (G). Base colour: ee = chestnut; E with A = bay; E with aa = black. One cream dilutes to palomino / buckskin / smoky black; two give cremello / perlino / smoky cream. Grey is dominant. Dun, champagne, silver, roan and white patterns aren't included. " + DISCLAIMER,
    faq: [
      { question: "Can two chestnuts have a bay foal?", answer: "No — two chestnuts (ee × ee) always produce chestnut-based foals." },
      { question: "Why do grey foals look a different colour at birth?", answer: "Grey lightens the coat over the first years — a grey is born bay, black or chestnut." },
    ],
  },
  {
    slug: "horse-gestation-calculator",
    title: "Horse Gestation Calculator",
    description: "Calculate a mare's foaling due date from the breeding date — with the normal early-to-late window and the first pregnancy check.",
    metaTitle: "Horse Gestation Calculator — Foaling Due Date",
    metaDescription: "Free horse gestation calculator. Get the foaling due date from the breeding date (about 340 days) plus the early and late range.",
    calcInputs: [...DATE("Last Breeding / Ovulation Date", 4, 15), numberField("gestationDays", "Average Gestation (days)", { default: 340, min: 300, max: 400 })],
    calcResult: { label: "Due Date", format: "number" },
    calcResults: [num("dueMonth", "Due — Month", true), num("dueDay", "Due — Day", true), num("earliestMonth", "Earliest Normal (320 d) — Month"), num("earliestDay", "Earliest Normal — Day"), num("latestMonth", "Late (370 d) — Month"), num("latestDay", "Late — Day"), num("ultrasoundMonth", "First Ultrasound (day 15) — Month"), num("ultrasoundDay", "First Ultrasound — Day")],
    instructions: "Enter the last breeding or ovulation date. If the mare has foaled late before, raise the average gestation.",
    examples: "Example: bred April 15 → due around March 21 next year; normal foaling runs from about March 1 to April 20. Book the first ultrasound around April 30.",
    assumptions: "Average gestation 340 days; 320–370 days is normal (foals before 320 days are premature). Mares bred early in the year often carry longer. Dates ignore leap years. Work with your vet on pregnancy checks at 14–16 days, ~28 days (heartbeat) and 45–60 days. " + DISCLAIMER,
    faq: [
      { question: "How long are horses pregnant?", answer: "About 11 months — 340 days on average." },
      { question: "Can a mare carry twins?", answer: "Rarely to term — vets check early so one embryo can be reduced." },
    ],
  },
  {
    slug: "horse-heat-cycle-calculator",
    title: "Horse Heat Cycle Calculator",
    description: "Predict a mare's next heat, likely ovulation and best breeding days from the start of her current heat.",
    metaTitle: "Horse Heat Cycle Calculator — Mare Estrus & Ovulation",
    metaDescription: "Free mare heat cycle calculator. Predict the next heat, ovulation day and breeding window from her 21-day estrous cycle.",
    calcInputs: [...DATE("Heat Started", 5, 1), numberField("cycleLength", "Cycle Length (days)", { default: 21, min: 18, max: 26 }), numberField("heatLength", "Heat Length (days)", { default: 6, min: 3, max: 10 })],
    calcResult: { label: "Next Heat", format: "number" },
    calcResults: [num("nextHeatMonth", "Next Heat — Month", true), num("nextHeatDay", "Next Heat — Day", true), num("ovulationMonth", "Likely Ovulation — Month"), num("ovulationDay", "Likely Ovulation — Day"), num("breedFromMonth", "Start Breeding — Month"), num("breedFromDay", "Start Breeding — Day"), num("heatEndsMonth", "Heat Ends — Month"), num("heatEndsDay", "Heat Ends — Day")],
    instructions: "Enter the first day she showed heat. Adjust cycle and heat length if you know her pattern.",
    examples: "Example: heat started May 1 with a 6-day heat → ovulation about May 6 (breed from May 4, every other day until she goes out), next heat about May 22.",
    assumptions: "Mares are seasonal (spring–summer) with ~21-day cycles: 5–7 days in heat, ovulating 24–48 hours before heat ends. Breed every 48 hours from day 2–3 of heat or as guided by vet ultrasound. Early-spring transitional heats are irregular. " + DISCLAIMER,
    faq: [
      { question: "How often do mares come into heat?", answer: "About every 21 days during the breeding season." },
      { question: "When is the foal heat?", answer: "About 7–10 days after foaling." },
    ],
  },
  {
    slug: "horse-years-to-human-years-calculator",
    title: "Horse Years to Human Years Calculator",
    description: "Convert a horse's age to human years and see its life stage — foal, young horse, adult, senior or geriatric.",
    metaTitle: "Horse Years to Human Years Calculator — Horse Age",
    metaDescription: "Free horse age calculator. Convert horse years to human years and find your horse's life stage.",
    calcInputs: [numberField("horseAge", "Horse Age (years)", { default: 15, max: 50, step: 0.5 })],
    calcResult: { label: "Human Years", format: "number" },
    calcResults: [num("humanYears", "Equivalent Human Age", true), num("lifeStage", "Stage (1 Foal, 2 Young, 3 Adult, 4 Senior 15+, 5 Geriatric 20+)")],
    instructions: "Enter your horse's age in years.",
    examples: "Example: a 15-year-old horse is roughly 49 in human years — entering its senior years.",
    assumptions: "Common equine age chart: 1 year ≈ 6.5, 2 ≈ 13, 3 ≈ 18, 4 ≈ 20.5, 5 ≈ 24, then about 2.5 human years per horse year. Horses commonly live 25–30 years. Seniors (15+) may need dental and diet changes. " + DISCLAIMER,
    faq: [
      { question: "How old is a 20-year-old horse in human years?", answer: "About 61." },
      { question: "How long do horses live?", answer: "Usually 25–30 years; ponies often live longer." },
    ],
  },
  {
    slug: "horse-weight-calculator",
    title: "Horse Weight Calculator",
    description: "Estimate your horse's weight from heart girth and body length — for dewormer and medicine doses and feeding.",
    metaTitle: "Horse Weight Calculator — Heart Girth Formula",
    metaDescription: "Free horse weight calculator. Estimate weight from heart girth and body length (girth² × length ÷ 330) in lb or kg.",
    calcInputs: [dropdown("unit", "Tape Unit", [["inches", 1], ["cm", 2]], 1), numberField("heartGirth", "Heart Girth", { default: 72, min: 20, max: 250, step: 0.5 }), numberField("bodyLength", "Body Length (point of shoulder to point of buttock)", { default: 66, min: 20, max: 250, step: 0.5 }), dropdown("age", "Horse Type", [["Adult horse", 1], ["Yearling / pony", 2], ["Weanling", 3]], 1)],
    calcResult: { label: "Weight", format: "number" },
    calcResults: [num("weightLb", "Weight (lb)", true), num("weightKg", "Weight (kg)"), num("dewormerDoseLb", "Dewormer Dial Setting (rounded up, lb)")],
    instructions: "Measure the heart girth around the barrel just behind the elbow and withers (after the horse breathes out), and the body length from point of shoulder to point of buttock.",
    examples: "Example: a 72\" girth and 66\" body length → 72² × 66 ÷ 330 ≈ 1,037 lb (470 kg). Dose dewormer for 1,050 lb.",
    assumptions: "Weight (lb) = girth² × length ÷ 330 (adults), ÷ 301 for yearlings / ponies, ÷ 280 for weanlings — typically within about 3–5% of scale weight. Very fit, pregnant or obese horses vary more. Always round dewormer doses up. " + DISCLAIMER,
    faq: [
      { question: "How accurate is a weight tape?", answer: "Within about 5% for most horses — good enough for dosing, but a livestock scale is best." },
      { question: "What does an average horse weigh?", answer: "About 900–1,200 lb (410–545 kg) for riding horses." },
    ],
  },
  {
    slug: "horse-height-calculator",
    title: "Horse Height Calculator",
    description: "Convert horse height between hands, inches and centimetres, and predict a young horse's mature height.",
    metaTitle: "Horse Height Calculator — Hands & Mature Height",
    metaDescription: "Free horse height calculator. Convert hands to inches and cm, check pony or horse, and predict mature height from age.",
    calcInputs: [dropdown("unit", "Height Entered In", [["inches", 1], ["cm", 2], ["hands (e.g. 15.2)", 3]], 3), numberField("height", "Height at the Withers", { default: 15.2, min: 1, max: 250, step: 0.1 }), numberField("ageMonths", "Age (months; 48+ = mature)", { default: 48, max: 600 })],
    calcResult: { label: "Hands", format: "number" },
    calcResults: [num("hands", "Height (hands)", true), num("inches", "Height (inches)"), num("centimetres", "Height (cm)"), num("predictedMatureHands", "Predicted Mature Height (hands)"), num("isPony", "Pony (14.2 hh or under; 1 = yes)")],
    instructions: "Measure from the ground to the highest point of the withers. Enter the age to predict mature height for a youngster.",
    examples: "Example: 15.2 hh = 62\" (157.5 cm). A yearling at 14.2 hh (58\") is about 90% grown, so it should mature near 16.0 hh.",
    assumptions: "1 hand = 4 inches; 15.2 hh means 15 hands 2 inches. Share of mature height (typical light breeds): birth 62%, 6 months 83%, 12 months 90%, 18 months 94%, 24 months 96%, 36 months 99%. Breeds and individuals vary. " + DISCLAIMER,
    faq: [
      { question: "How many inches is 16 hands?", answer: "64 inches (162.6 cm)." },
      { question: "What height is a pony?", answer: "14.2 hands (58\") and under in most competitions." },
    ],
  },
  {
    slug: "horse-calorie-calculator",
    title: "Horse Calorie Calculator",
    description: "Calculate a horse's daily energy needs (Mcal of digestible energy) by weight and workload, pregnancy or lactation — and the hay that supplies it.",
    metaTitle: "Horse Calorie Calculator — Daily Energy (Mcal DE)",
    metaDescription: "Free horse calorie calculator. Get daily digestible energy in Mcal by weight and work level, plus the hay needed to meet it.",
    calcInputs: [...HORSE_WT(), dropdown("status", "Work / Status", STATUS, 4), numberField("hayEnergy", "Hay Energy (Mcal per kg, as fed)", { default: 2, min: 1, max: 3, step: 0.05 })],
    calcResult: { label: "Mcal per Day", format: "number" },
    calcResults: [num("mcalPerDay", "Digestible Energy (Mcal/day)", true), num("hayKgToMeetNeed", "Hay to Meet It (kg/day)"), num("hayLbToMeetNeed", "Hay to Meet It (lb/day)"), pct("hayPctBodyWeight", "Hay as % of Body Weight")],
    instructions: "Enter the horse's weight (use the Horse Weight Calculator), its workload or breeding status and your hay's energy (about 2.0 Mcal/kg for average grass hay).",
    examples: "Example: an 1,100 lb horse in moderate work needs about 23.3 Mcal a day — about 25.6 lb of average hay if hay alone supplied it.",
    assumptions: "NRC (2007) maintenance ≈ 33.3 kcal DE per kg of body weight per day, × 0.91 easy keeper, 1.2 light, 1.4 moderate, 1.6 heavy, 1.9 very heavy work, about 1.3 late pregnancy and 1.7 early lactation. Hay energy varies widely — test your hay. " + DISCLAIMER,
    faq: [
      { question: "What is a Mcal?", answer: "A megacalorie — 1,000 kcal. Horse rations are measured in Mcal of digestible energy." },
      { question: "Can a horse eat only hay?", answer: "Many idle or lightly worked horses can, with a vitamin/mineral balancer." },
    ],
  },
  {
    slug: "horse-feed-calculator",
    title: "Horse Feed Calculator",
    description: "Build a daily horse ration — how much hay and how much grain or concentrate to feed for the horse's weight and workload.",
    metaTitle: "Horse Feed Calculator — Hay & Grain Ration",
    metaDescription: "Free horse feed calculator. Work out daily hay and concentrate amounts by weight, workload and feed energy.",
    calcInputs: [...HORSE_WT(), dropdown("status", "Work / Status", STATUS, 4), percentField("hayPct", "Hay Fed (% of body weight)", { default: 2, min: 1, max: 3, step: 0.1 }), numberField("hayEnergy", "Hay Energy (Mcal/kg)", { default: 2, min: 1, max: 3, step: 0.05 }), numberField("grainEnergy", "Concentrate Energy (Mcal/kg)", { default: 3.2, min: 2, max: 4.5, step: 0.05 })],
    calcResult: { label: "Hay per Day", format: "number" },
    calcResults: [num("hayLbPerDay", "Hay (lb/day)", true), num("concentrateLbPerDay", "Concentrate (lb/day)"), num("hayKgPerDay", "Hay (kg/day)"), num("concentrateKgPerDay", "Concentrate (kg/day)"), pct("totalIntakePctBw", "Total Intake (% of body weight)"), num("energyNeedMcal", "Energy Need (Mcal/day)")],
    instructions: "Enter the horse's weight and work, how much hay you feed as a share of body weight and the energy of your hay and feed (on the bag or a hay test).",
    examples: "Example: an 1,100 lb horse in moderate work fed 2% of body weight in hay (22 lb) needs about 2.3 lb of a 3.2 Mcal/kg concentrate to meet 23.3 Mcal.",
    assumptions: "Energy need as in the Horse Calorie Calculator; hay supplies hay kg × Mcal/kg; concentrate covers any shortfall. Feed at least 1.5% of body weight as forage, split concentrate into meals of no more than about 0.5% of body weight, and change feeds gradually. " + DISCLAIMER,
    faq: [
      { question: "How much should a horse eat a day?", answer: "About 2–2.5% of body weight in total feed, mostly forage — 22–27 lb for an 1,100 lb horse." },
      { question: "How much grain is too much?", answer: "More than about 5 lb in one meal raises colic and laminitis risk for an average horse." },
    ],
  },
  {
    slug: "horse-forage-calculator",
    title: "Horse Forage Calculator",
    description: "Work out how much hay you need for a season — pounds per day, bales, tons and cost — with pasture and waste.",
    metaTitle: "Horse Forage Calculator — Hay Bales for Winter",
    metaDescription: "Free horse forage calculator. Calculate hay per day, bales and tons needed for the winter, with pasture and waste.",
    calcInputs: [...HORSE_WT(), numberField("horses", "Number of Horses", { default: 2, min: 1, max: 200 }), percentField("foragePct", "Forage Eaten (% of body weight)", { default: 2, min: 1, max: 3, step: 0.1 }), percentField("pasturePct", "Share of Diet from Pasture", { default: 0 }), percentField("wastePct", "Hay Wasted", { default: 10, max: 60 }), numberField("days", "Days to Cover", { default: 180, min: 1, max: 366 }), numberField("baleWeight", "Bale Weight (lb)", { default: 50, min: 20, max: 2000 }), currencyField("balePrice", "Price per Bale", { default: 12 })],
    calcResult: { label: "Bales Needed", format: "number" },
    calcResults: [num("balesNeeded", "Bales Needed", true), num("totalHayTons", "Total Hay (tons)"), num("hayLbPerDayPerHorse", "Hay Fed per Horse (lb/day)"), num("balesPerMonth", "Bales per Month"), cur("totalCost", "Total Hay Cost")],
    instructions: "Enter the horses' weight and number, how much of their diet pasture provides, typical waste, the days to cover and your bale size and price.",
    examples: "Example: two 1,100 lb horses on hay alone for 180 days at 2% of body weight with 10% waste need about 24.4 lb each a day — 176 fifty-pound bales (4.4 tons), about $2,112 at $12 a bale.",
    assumptions: "Hay fed = body weight × forage % × (1 − pasture share) ÷ (1 − waste). Typical waste: 5–10% from slow feeders or racks, 20–35% from round bales fed on the ground. Buy 10–20% extra for a hard winter. " + DISCLAIMER,
    faq: [
      { question: "How many bales of hay does a horse need for winter?", answer: "Roughly 80–100 small square bales for a 6-month winter without pasture." },
      { question: "How much hay is in a round bale?", answer: "Usually 800–1,200 lb — about 15–25 small square bales." },
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
