// One-time (but safe to re-run) batch setup script: creates 8 women's and kids' clothing size tools
// from the user's shopping list (Shopping Calculators > Clothing, Shoe & Ring Size Calculators).
// See src/lib/calc-engine-shopping-size-dress.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-size-dress-calculators.ts
// or
//   npm run db:create-shopping-size-dress-calculators

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
    slug: "dress-size-calculator",
    title: "Dress Size Calculator",
    description: "Find your women's dress size from bust, waist and hip measurements — US, UK, EU, Italian and Australian sizes and the letter size — for everyday and prom dresses.",
    metaTitle: "Dress Size Calculator — US, UK, EU & IT Sizes",
    metaDescription: "Free dress size calculator. Find your women's dress size from bust, waist and hips in US, UK, EU, Italian and Australian sizes.",
    calcInputs: [
      numberField("bust", "Bust", { default: 36, max: 90, step: 0.25 }),
      numberField("waist", "Waist", { default: 28.5, max: 80, step: 0.25 }),
      numberField("hip", "Hips", { default: 39, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "US Dress Size", format: "number" },
    calcResults: [
      { key: "usSize", label: "US Dress Size", format: "number", highlight: true },
      { key: "ukSize", label: "UK Size", format: "number" },
      { key: "euSize", label: "EU / French Size", format: "number" },
      { key: "itSize", label: "Italian Size", format: "number" },
      { key: "auSize", label: "Australian Size", format: "number" },
      { key: "letterCode", label: "Letter Size (1 XS, 2 S, 3 M, 4 L, 5 XL, 6 XXL, 7 3XL)", format: "number" },
    ],
    instructions: "Measure your bust, natural waist and hips. The size is chosen for your largest measurement; a tailor can take in the rest. For prom and formal dresses, use the same measurements — and check whether the brand runs small.",
    examples: "Example: 36-28.5-39 in measurements fit a US 10 — UK 14, EU 40, Italian 46.",
    assumptions: "US misses chart (bust/waist/hip in): 4 = 34/26/36.5, 6 = 35/27/37.5, 8 = 36/28/38.5, 10 = 37/29/39.5, 12 = 38.5/30.5/41. UK = US + 4; EU = US + 30; IT = US + 36. Vanity sizing means many brands run larger than this. " + FIT_NOTE,
    faq: [
      { question: "How do I find my dress size?", answer: "Measure your bust, waist and hips, find the size for each on the chart and choose the largest — it's easier to take a dress in than let it out." },
      { question: "What is a US 8 in UK and EU sizes?", answer: "About a UK 12 and an EU 38 (Italian 44)." },
    ],
  },
  {
    slug: "wedding-dress-size-calculator",
    title: "Wedding Dress Size Calculator",
    description: "Find your bridal gown size — usually about two sizes larger than your street size — from bust, waist and hips, and how much each area will need taking in.",
    metaTitle: "Wedding Dress Size Calculator — Bridal Size Chart",
    metaDescription: "Free wedding dress size calculator. Find your bridal size from measurements, compared with your street size, and the alterations needed.",
    calcInputs: [
      numberField("bust", "Bust", { default: 35, max: 90, step: 0.25 }),
      numberField("waist", "Waist", { default: 27, max: 80, step: 0.25 }),
      numberField("hip", "Hips", { default: 39, max: 90, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Bridal Size", format: "number" },
    calcResults: [
      { key: "bridalSize", label: "Bridal Size to Order", format: "number", highlight: true },
      { key: "streetSize", label: "Your Street (Ready-to-Wear) Size", format: "number" },
      { key: "takeInBust", label: "Take In at the Bust (in)", format: "number" },
      { key: "takeInWaist", label: "Take In at the Waist (in)", format: "number" },
      { key: "takeInHip", label: "Take In at the Hips (in)", format: "number" },
    ],
    instructions: "Have someone measure you in the bra and shoes you'll wear. Bridal gowns are ordered for your largest measurement, then altered to fit — the take-in figures show roughly how much.",
    examples: "Example: 35-27-39 in measurements are a street size 10, so order about a bridal 12; the waist will need about 2 in taken in.",
    assumptions: "Bridal sizes typically run 1–2 sizes smaller than street sizes, so the bridal size is shown as street size + 2. Always use the designer's own chart and order 6–9 months ahead to leave time for alterations. " + FIT_NOTE,
    faq: [
      { question: "Why is my wedding dress size bigger than normal?", answer: "Bridal designers use older, smaller size charts, so most brides order one or two sizes above their everyday size." },
      { question: "Should I order a wedding dress in a smaller size to lose weight?", answer: "No — order for your current measurements. Taking a dress in is easy; letting it out often isn't possible." },
    ],
  },
  {
    slug: "dress-length-calculator",
    title: "Dress Length Calculator",
    description: "Work out the dress length you need from the shoulder for mini, knee, midi, tea, ankle or floor-length styles from your height — adding heels for long gowns.",
    metaTitle: "Dress Length Calculator — Mini to Floor Length",
    metaDescription: "Free dress length calculator. Find the dress length from shoulder for mini, knee, midi, maxi and floor-length styles from your height and heels.",
    calcInputs: [
      numberField("height", "Your Height (Barefoot)", { default: 65, max: 90, step: 0.5 }),
      dropdown("style", "Length Style", [["Mini (mid-thigh)", 0], ["Above the knee", 1], ["Knee length", 2], ["Midi (mid-calf)", 3], ["Tea length", 4], ["Ankle length", 5], ["Floor length", 6]], 3),
      numberField("heelHeight", "Heel Height (Ankle & Floor Length)", { default: 2, max: 8, step: 0.25, required: false }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Length From Shoulder", format: "number" },
    calcResults: [
      { key: "lengthFromShoulder", label: "Dress Length From Shoulder", format: "number", highlight: true },
      { key: "lengthFromWaist", label: "Length From Waist", format: "number" },
      { key: "lengthCm", label: "Length From Shoulder (cm)", format: "number" },
      { key: "heelAdded", label: "Heel Added", format: "number" },
    ],
    instructions: "Enter your barefoot height and choose the length style. For ankle and floor-length dresses, add the heel height you'll wear. Compare the result with the 'length from shoulder' in a product's size chart.",
    examples: "Example: at 65 in tall, a midi dress should measure about 40.3 in from the high point of the shoulder (102.36 cm).",
    assumptions: "Lengths are typical proportions of height measured from the high point of the shoulder: knee about 54%, midi 62%, tea 68%, floor 81%. Your leg length and where your waist falls change the result, so measure on yourself to confirm.",
    faq: [
      { question: "How do I measure dress length?", answer: "From the high point of the shoulder (where the strap sits, next to the neck) straight down to where you want the hem." },
      { question: "How long should a floor-length dress be?", answer: "Long enough to just skim the floor in the shoes you'll wear — about 81% of your height plus the heel height." },
    ],
  },
  {
    slug: "skirt-size-calculator",
    title: "Skirt Size Calculator",
    description: "Find your skirt size from waist and hips — US, UK and EU — and the right skirt length for mini, knee, midi or maxi styles at your height.",
    metaTitle: "Skirt Size Calculator — Size & Length",
    metaDescription: "Free skirt size calculator. Find your US, UK and EU skirt size from waist and hips, and the skirt length for your height and style.",
    calcInputs: [
      numberField("waist", "Waist (Where the Skirt Sits)", { default: 28, max: 80, step: 0.25 }),
      numberField("hip", "Hips", { default: 39, max: 90, step: 0.25 }),
      numberField("height", "Height", { default: 64, max: 90, step: 0.5 }),
      dropdown("style", "Length", [["Mini", 0], ["Knee length", 1], ["Midi", 2], ["Maxi", 3]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "US Skirt Size", format: "number" },
    calcResults: [
      { key: "usSkirtSize", label: "US Skirt Size", format: "number", highlight: true },
      { key: "ukSize", label: "UK Size", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
      { key: "skirtLength", label: "Skirt Length From Waist", format: "number" },
      { key: "skirtLengthCm", label: "Skirt Length (cm)", format: "number" },
    ],
    instructions: "Measure where the skirt's waistband will sit and around the fullest part of your hips. Enter your height and the length you want.",
    examples: "Example: a 28 in waist and 39 in hips is a US 10 (UK 14); at 64 in tall a knee-length skirt is about 21.12 in long.",
    assumptions: "Size is the larger of the waist and hip sizes on the US misses chart. Lengths from the natural waist are typical shares of height (knee about 33%, midi 42%, maxi 58%). High- and low-rise skirts sit at different points, so adjust. " + FIT_NOTE,
    faq: [
      { question: "How do I know my skirt size?", answer: "Use your waist and hip measurements; fitted skirts are sized mostly by hips, A-line and full skirts by waist." },
      { question: "How long is a knee-length skirt?", answer: "Usually 20–24 inches from the waist, depending on height." },
    ],
  },
  {
    slug: "clothing-size-calculator",
    title: "Clothing Size Calculator",
    description: "Convert clothing sizes between countries — a US women's dress size or a men's jacket size to UK, EU, Italian, Australian, Japanese and letter sizes.",
    metaTitle: "Clothing Size Calculator — International Sizes",
    metaDescription: "Free clothing size calculator. Convert US women's and men's clothing sizes to UK, EU, Italian, Australian, Japanese and letter sizes.",
    calcInputs: [
      dropdown("type", "Size Type", [["US women's dress size", 0], ["US/UK men's jacket (chest) size", 1]], 0),
      numberField("size", "Size", { default: 10, max: 60, step: 1 }),
    ],
    calcResult: { label: "EU Size", format: "number" },
    calcResults: [
      { key: "euSize", label: "EU Size", format: "number", highlight: true },
      { key: "ukSize", label: "UK Size", format: "number" },
      { key: "itSize", label: "Italian Size", format: "number" },
      { key: "auSize", label: "Australian Size", format: "number" },
      { key: "jpSize", label: "Japanese Size", format: "number" },
      { key: "letterCode", label: "Letter Size (1 XS/S, 2 S/M, 3 M/L, 4 L, 5 XL, 6 XXL, 7 3XL)", format: "number" },
    ],
    instructions: "Choose whether you're converting a US women's dress size or a men's jacket size, then enter the size.",
    examples: "Example: a US women's 10 is a UK 14, EU 40, Italian 46 and Japanese 13.",
    assumptions: "Women's: UK/AU = US + 4, EU/FR = US + 30, IT = US + 36, JP ≈ US + 3. Men's jackets: US/UK chest size + 10 = EU/IT. Asian brands often run a size or two smaller. " + FIT_NOTE,
    faq: [
      { question: "What is a US size 10 in Europe?", answer: "About an EU 40 (French 40, Italian 46)." },
      { question: "Are UK sizes bigger than US sizes?", answer: "The numbers are bigger — a UK 12 is about a US 8 — but it's the same garment size." },
    ],
  },
  {
    slug: "kids-clothing-size-calculator",
    title: "Kids Clothing Size Calculator",
    description: "Find the right children's clothing size by height — baby sizes in months, toddler 2T–4T and kids' sizes 5–16 — and the next size up.",
    metaTitle: "Kids Clothing Size Calculator — Baby to 16",
    metaDescription: "Free kids clothing size calculator. Find baby (months), toddler (2T–4T) and kids' (5–16) clothing sizes by height, and the next size.",
    calcInputs: [
      numberField("height", "Child's Height", { default: 45, max: 70, step: 0.5 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Size", format: "number" },
    calcResults: [
      { key: "size", label: "Clothing Size", format: "number", highlight: true },
      { key: "sizeSeries", label: "Size Type (1 = Baby Months, 2 = Toddler T, 3 = Kids)", format: "number" },
      { key: "nextSize", label: "Next Size Up", format: "number" },
      { key: "nextSizeSeries", label: "Next Size Type", format: "number" },
      { key: "heightCm", label: "Height (cm)", format: "number" },
    ],
    instructions: "Measure your child standing straight without shoes. Clothes are sized mainly by height; size up for a growth spurt or longer wear.",
    examples: "Example: a child 45 in tall wears a kids' size 6 (type 3), and the next size up is 7.",
    assumptions: "Typical US charts by height (in): baby 0–3M up to 24, 12–18M up to 32; toddler 2T up to 35, 3T 38, 4T 41; kids 5 up to 44, 6 47, 7 50, 8 52, 10 55, 12 58, 14 61, 16 64. Age labels are only a guide. " + FIT_NOTE,
    faq: [
      { question: "Should I buy kids' clothes by age or height?", answer: "By height — children of the same age vary a lot, and size charts are built on height." },
      { question: "What's the difference between 4T and size 4?", answer: "4T is cut for toddlers with room for a diaper and a rounder tummy; size 4 is slimmer and longer." },
    ],
  },
  {
    slug: "best-jeans-for-body-type-calculator",
    title: "Best Jeans for Body Type Calculator",
    description: "Find the jean style that flatters your shape — straight, bootcut, skinny, wide-leg, mom or curvy fit — plus the best rise and inseam length from your measurements.",
    metaTitle: "Best Jeans for Body Type Calculator — Fit Finder",
    metaDescription: "Free best jeans for body type calculator. Find the most flattering jean fit, rise and length from your waist, hips, thighs and height.",
    calcInputs: [
      numberField("waist", "Waist", { default: 29, max: 80, step: 0.25 }),
      numberField("hip", "Hips", { default: 40, max: 90, step: 0.25 }),
      dropdown("thighs", "Thighs", [["Slim", 0], ["Average", 1], ["Full / athletic", 2]], 1),
      numberField("height", "Height", { default: 64, max: 90, step: 0.5 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Best Fit", format: "number" },
    calcResults: [
      { key: "fitCode", label: "Best Fit (1 Straight, 2 Bootcut, 3 Skinny/Slim, 4 Wide-Leg, 5 Mom/Relaxed, 6 Curvy Fit)", format: "number", highlight: true },
      { key: "riseCode", label: "Rise (1 Low, 2 Mid, 3 High)", format: "number" },
      { key: "lengthCode", label: "Length (1 Petite/Short, 2 Regular, 3 Tall/Long)", format: "number" },
      { key: "hipToWaist", label: "Hips − Waist (in)", format: "number" },
      { key: "suggestedInseam", label: "Suggested Inseam (in)", format: "number" },
    ],
    instructions: "Enter your waist and hip measurements, how full your thighs are and your height. The suggestion balances your proportions — treat it as a starting point and wear what you love.",
    examples: "Example: a 29 in waist and 40 in hips (an 11 in difference) suit fit 6 — curvy-fit jeans that close the waist gap — in rise 3 (high) and length 2.",
    assumptions: "Rules of thumb: a hip-to-waist difference of 10–11 in or more suits curvy-fit cuts; pear shapes balance with bootcut or wide-leg; straighter figures can wear skinny jeans or add shape with mom and relaxed fits. Petite inseams are about 28–29 in, regular 30–32, tall 33–36.",
    faq: [
      { question: "What jeans are best for a pear shape?", answer: "Bootcut, flare and wide-leg jeans balance wider hips, and a high or mid rise defines the waist." },
      { question: "Why do jeans gap at the back of my waist?", answer: "If your hips are much bigger than your waist, regular cuts gap; curvy-fit jeans are cut with a smaller waist for the hip." },
    ],
  },
  {
    slug: "jean-size-calculator",
    title: "Jean Size Calculator",
    description: "Find your jean size — men's waist × length (like 32×32) and women's numeric size — from your waist and inseam measurements.",
    metaTitle: "Jean Size Calculator — Waist & Inseam",
    metaDescription: "Free jean size calculator. Find men's W×L jean sizes and women's numeric jean sizes from your waist and inseam measurements.",
    calcInputs: [
      numberField("waist", "Waist (Where Jeans Sit)", { default: 32.5, max: 80, step: 0.25 }),
      numberField("inseam", "Inseam", { default: 31.5, max: 45, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
      dropdown("gender", "Jeans", [["Men's", 0], ["Women's", 1]], 0),
    ],
    calcResult: { label: "Waist Size", format: "number" },
    calcResults: [
      { key: "waistSize", label: "Waist Size (W)", format: "number", highlight: true },
      { key: "inseamLength", label: "Length (L)", format: "number" },
      { key: "womensNumericSize", label: "Women's Numeric Size", format: "number" },
      { key: "waistCm", label: "Waist (cm)", format: "number" },
    ],
    instructions: "Measure around your waist where you wear your jeans (usually a little below the navel) and your inseam from crotch to ankle. For women, the numeric size is shown too.",
    examples: "Example: a 32.5 in waist and 31.5 in inseam is a men's 33×32; in women's jeans that waist is about a size 14.",
    assumptions: "Men's jeans come in each waist inch up to 34, then even sizes; lengths in even inches (30, 32, 34). Women's jeans often use waist sizes 24–34 that map to numeric sizes 0–16. Stretch denim may let you size down. " + FIT_NOTE,
    faq: [
      { question: "What does 32×32 mean on jeans?", answer: "A 32 inch waist and a 32 inch inseam (leg length)." },
      { question: "What women's size is a 28 waist in jeans?", answer: "Usually around a size 6, though brands vary." },
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
