// One-time (but safe to re-run) batch setup script: creates 8 suit, shirt, outerwear, trouser and belt size tools
// from the user's shopping list (Shopping Calculators > Clothing, Shoe & Ring Size Calculators).
// See src/lib/calc-engine-shopping-size-menswear.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-size-menswear-calculators.ts
// or
//   npm run db:create-shopping-size-menswear-calculators

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
    slug: "suit-size-calculator",
    title: "Suit Size Calculator",
    description: "Find your suit size — jacket size from chest, short, regular or long from height, and trouser waist and drop — for suits, tuxedos and vests.",
    metaTitle: "Suit Size Calculator — Jacket, Length & Trousers",
    metaDescription: "Free suit size calculator. Find your suit jacket size, short/regular/long length and trouser waist from chest, waist and height. Works for tuxedos.",
    calcInputs: [
      numberField("chest", "Chest", { default: 41, max: 80, step: 0.25 }),
      numberField("waist", "Waist (Where Trousers Sit)", { default: 34, max: 80, step: 0.25 }),
      numberField("height", "Height", { default: 70, max: 90, step: 0.5 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Jacket Size", format: "number" },
    calcResults: [
      { key: "jacketSize", label: "Jacket Size", format: "number", highlight: true },
      { key: "lengthCode", label: "Length (1 Short, 2 Regular, 3 Long, 4 Extra Long)", format: "number" },
      { key: "trouserWaist", label: "Trouser Waist", format: "number" },
      { key: "drop", label: "Drop (Jacket − Trouser Waist)", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
    ],
    instructions: "Measure your chest under your arms, your waist where you wear trousers, and your height. The same sizes work for a tuxedo or a three-piece suit's vest.",
    examples: "Example: a 41 in chest, 34 in waist and 5'10\" height is a 42 regular (length code 2) jacket with 34 in trousers — a drop of 8.",
    assumptions: "Jacket size ≈ chest rounded to an even number. Lengths: short under 5'8\", regular 5'8\"–6'0\", long 6'1\"–6'3\", extra long taller. Off-the-rack suits usually have a 6 in drop; athletic cuts have 7–8. EU = US + 10. " + FIT_NOTE,
    faq: [
      { question: "What does 40R mean in a suit?", answer: "A 40 inch chest jacket in regular length, for someone about 5'8\" to 6'0\"." },
      { question: "What is the drop in a suit?", answer: "The difference between the jacket size and the trouser waist — usually 6 inches on a standard suit." },
    ],
  },
  {
    slug: "shirt-size-calculator",
    title: "Shirt Size Calculator",
    description: "Find your casual shirt and T-shirt size (S to 4XL) from your chest measurement, adjusted for slim, regular or relaxed fit.",
    metaTitle: "Shirt Size Calculator — S to 4XL From Chest",
    metaDescription: "Free shirt size calculator. Find your T-shirt and casual shirt size from your chest measurement for slim, regular or relaxed fits.",
    calcInputs: [
      numberField("chest", "Chest", { default: 42, max: 80, step: 0.25 }),
      dropdown("fit", "Fit You Like", [["Slim", 0], ["Regular", 1], ["Relaxed / oversized", 2]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Shirt Size", format: "number" },
    calcResults: [
      { key: "shirtCode", label: "Shirt Size (1 S, 2 M, 3 L, 4 XL, 5 XXL, 6 3XL, 7 4XL)", format: "number", highlight: true },
      { key: "chestInches", label: "Chest (in)", format: "number" },
      { key: "chestCm", label: "Chest (cm)", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
    ],
    instructions: "Measure around the fullest part of your chest under your arms and choose the fit you prefer. If you're between sizes, size up for comfort.",
    examples: "Example: a 42 in chest in a regular fit is size 3 — a large.",
    assumptions: "Chart (in): S up to 36, M 40, L 44, XL 48, XXL 52, 3XL 56, 4XL 60. Slim fits nudge you up a size near the top of a range; relaxed fits down. " + FIT_NOTE,
    faq: [
      { question: "What size shirt is a 40 inch chest?", answer: "Usually a medium, or a large in slim-fit cuts." },
      { question: "Should T-shirts be bought a size up?", answer: "Only if you like a relaxed look or the shirt is 100% cotton and may shrink." },
    ],
  },
  {
    slug: "dress-shirt-size-calculator",
    title: "Dress Shirt Size Calculator",
    description: "Find your dress shirt size — collar (neck) size to the half inch and sleeve length — from neck and sleeve measurements, with the EU collar size in cm.",
    metaTitle: "Dress Shirt Size Calculator — Neck & Sleeve",
    metaDescription: "Free dress shirt size calculator. Find your collar (neck) size and sleeve length from measurements, plus the EU collar size in centimetres.",
    calcInputs: [
      numberField("neck", "Neck (Around the Base, Where the Collar Sits)", { default: 15.25, max: 25, step: 0.25 }),
      numberField("sleeve", "Sleeve (Centre Back of Neck to Wrist)", { default: 33.5, max: 45, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Collar Size", format: "number" },
    calcResults: [
      { key: "collarSize", label: "Collar (Neck) Size", format: "number", highlight: true },
      { key: "sleeveLength", label: "Sleeve Length", format: "number" },
      { key: "euCollarCm", label: "EU Collar Size (cm)", format: "number" },
      { key: "sleeveRangeLow", label: "Combined Sleeve Size Starts At (e.g. 33/34)", format: "number" },
    ],
    instructions: "Measure around the base of your neck with one finger under the tape. For sleeve, measure from the centre back of your neck, over the shoulder and down to the wrist bone with your arm slightly bent.",
    examples: "Example: a 15.25 in neck and 33.5 in sleeve make a 16 collar (EU 41) with a 34 in sleeve — often sold as 16 33/34.",
    assumptions: "Collar = neck + about 0.5 in for comfort, rounded up to the half inch; sleeve rounds to the inch, and many shirts come in paired sleeves (32/33, 34/35). Slim-fit shirts may need a half size up in the collar. " + FIT_NOTE,
    faq: [
      { question: "How do I measure my neck for a dress shirt?", answer: "Wrap the tape around the base of your neck where a collar sits, with one finger underneath, and round up to the next half inch." },
      { question: "What does 16 34/35 mean?", answer: "A 16 inch collar and a sleeve that fits 34 to 35 inch sleeve lengths." },
    ],
  },
  {
    slug: "jacket-size-calculator",
    title: "Jacket Size Calculator",
    description: "Find your jacket size — letter and numeric, men's or women's — from your chest, with extra room for layering and snug-fitting leather jackets.",
    metaTitle: "Jacket Size Calculator — Incl. Leather Jackets",
    metaDescription: "Free jacket size calculator. Find men's and women's jacket sizes from chest, with layering room for winter and leather jackets.",
    calcInputs: [
      numberField("chest", "Chest / Bust", { default: 40, max: 80, step: 0.25 }),
      dropdown("gender", "Jacket", [["Men's", 0], ["Women's", 1]], 0),
      dropdown("jacketType", "Jacket Type", [["Fabric (denim, bomber, puffer…)", 0], ["Leather", 1]], 1),
      dropdown("layering", "Wear Over a Sweater or Hoodie?", [["No", 0], ["Yes", 1]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Jacket Size", format: "number" },
    calcResults: [
      { key: "letterCode", label: "Letter Size (Men: 1 S … 7 4XL · Women: 1 XXS, 2 XS, 3 S, 4 M, 5 L, 6 XL, 7 XXL)", format: "number", highlight: true },
      { key: "numericSize", label: "Numeric Size (Men's Chest Size / Women's US Size)", format: "number" },
      { key: "effectiveChest", label: "Chest Allowing for Layers (in)", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
    ],
    instructions: "Measure your chest (bust for women) over a thin shirt. Choose the jacket type and whether you'll layer underneath — leather barely stretches, so it needs more room for layers.",
    examples: "Example: a 40 in chest in a men's leather jacket worn over a hoodie is size code 3 (large), numeric 42.",
    assumptions: "Layering adds about 1 in to the chest for fabric jackets and 2 in for leather. Leather jackets should feel snug at first and relax slightly; the shoulders must fit, as they can't be altered. " + FIT_NOTE,
    faq: [
      { question: "Should a leather jacket be a size bigger?", answer: "Only if you'll wear thick layers underneath. Otherwise buy your true size — it should be snug and will loosen slightly." },
      { question: "How should a jacket fit at the shoulders?", answer: "The shoulder seam should sit at the edge of your shoulder bone — that's the hardest part to alter." },
    ],
  },
  {
    slug: "coat-length-calculator",
    title: "Coat Length Calculator",
    description: "Work out the coat length you need from the shoulder for hip-length, mid-thigh, knee-length, mid-calf or full-length coats, based on your height.",
    metaTitle: "Coat Length Calculator — By Height & Style",
    metaDescription: "Free coat length calculator. Find the coat length from shoulder for hip, mid-thigh, knee, mid-calf and ankle-length coats from your height.",
    calcInputs: [
      numberField("height", "Height", { default: 66, max: 90, step: 0.5 }),
      dropdown("style", "Coat Length", [["Hip length", 0], ["Mid-thigh", 1], ["Knee length", 2], ["Mid-calf", 3], ["Full / ankle length", 4]], 2),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Coat Length", format: "number" },
    calcResults: [
      { key: "coatLength", label: "Coat Length From Shoulder", format: "number", highlight: true },
      { key: "coatLengthCm", label: "Coat Length (cm)", format: "number" },
      { key: "heightInches", label: "Height (in)", format: "number" },
    ],
    instructions: "Enter your height and the length you want, then compare the result with the 'length' measurement (back length from the shoulder) in a coat's size chart.",
    examples: "Example: at 66 in tall, a knee-length coat should measure about 34.98 in (88.85 cm) from the shoulder.",
    assumptions: "Lengths are typical proportions of height from the base of the collar or shoulder: hip about 36%, mid-thigh 44%, knee 53%, mid-calf 62%, ankle 76%. Petite and tall ranges adjust coat length for you.",
    faq: [
      { question: "What coat length suits petite people?", answer: "Hip to knee length usually looks best; longer coats can overwhelm a petite frame unless they're cut for petites." },
      { question: "How is coat length measured?", answer: "Usually down the centre back from the base of the collar to the hem." },
    ],
  },
  {
    slug: "pants-size-calculator",
    title: "Pants Size Calculator",
    description: "Find your pants size — women's numeric or men's waist size — with the right length for your height and a shorts inseam suggestion.",
    metaTitle: "Pants Size Calculator — Size, Length & Shorts",
    metaDescription: "Free pants size calculator. Find women's or men's pants size, the right inseam length for your height and a shorts inseam.",
    calcInputs: [
      numberField("waist", "Waist", { default: 29, max: 80, step: 0.25 }),
      numberField("hip", "Hips (Women's)", { default: 40, max: 90, step: 0.25, required: false }),
      numberField("height", "Height", { default: 65, max: 90, step: 0.5 }),
      dropdown("gender", "Pants", [["Men's", 0], ["Women's", 1]], 1),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Pants Size", format: "number" },
    calcResults: [
      { key: "pantsSize", label: "Pants Size (Women's US Size / Men's Waist)", format: "number", highlight: true },
      { key: "inseamLength", label: "Suggested Inseam", format: "number" },
      { key: "lengthCode", label: "Length (1 Short/Petite, 2 Regular, 3 Long/Tall)", format: "number" },
      { key: "shortsInseam", label: "Shorts Inseam (in)", format: "number" },
    ],
    instructions: "Measure your waist where your pants sit and (for women's sizes) your hips. Enter your height for the length. The shorts inseam suggestion lands shorts just above the knee.",
    examples: "Example: a 29 in waist, 40 in hips and 5'5\" height fit women's size 12 with about a 29 in inseam (length code 1); shorts look best around a 5 in inseam.",
    assumptions: "Women's sizes use the US misses waist and hip chart; men's pants are sized by waist in inches. Inseam is estimated at about 45% of height — measure a pair that fits for accuracy. " + FIT_NOTE,
    faq: [
      { question: "How do I know my pants size?", answer: "Men's pants are sold by waist and inseam in inches; women's by numeric size from waist and hip measurements." },
      { question: "What shorts inseam should I wear?", answer: "Shorter people often prefer 5 in, average height 7 in and tall people 9 in, so the hem sits just above the knee." },
    ],
  },
  {
    slug: "inseam-calculator",
    title: "Inseam Calculator",
    description: "Find your inseam — measured or estimated from height — in inches and centimetres, and whether you need short, regular or long pants.",
    metaTitle: "Inseam Calculator — Inseam by Height",
    metaDescription: "Free inseam calculator. Estimate your inseam from height or convert a measured inseam, and find whether you need short, regular or long pants.",
    calcInputs: [
      dropdown("method", "Method", [["Estimate from height", 0], ["I measured my inseam", 1]], 0),
      numberField("height", "Height", { default: 70, max: 90, step: 0.5 }),
      numberField("measured", "Measured Inseam", { default: 32, max: 45, step: 0.25, required: false }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Inseam", format: "number" },
    calcResults: [
      { key: "inseamInches", label: "Inseam (in)", format: "number", highlight: true },
      { key: "inseamCm", label: "Inseam (cm)", format: "number" },
      { key: "lengthCode", label: "Length (1 Short, 2 Regular, 3 Long)", format: "number" },
      { key: "legToHeightPercent", label: "Inseam as % of Height", format: "number" },
    ],
    instructions: "To measure, stand with your back to a wall in socks and measure from the crotch to the floor — or measure the inside leg seam of pants that fit. Otherwise estimate from your height.",
    examples: "Example: at 5'10\" (70 in), the estimated inseam is 31.5 in (80.01 cm) — length code 2, regular.",
    assumptions: "Estimate = 45% of height, the average leg-to-height proportion; individual proportions vary by a few inches. Pants inseams usually run short 28–29, regular 30–32 and long 33–36 inches.",
    faq: [
      { question: "How do I measure my inseam?", answer: "Stand straight and measure from the top of the inner thigh at the crotch to the floor, or measure the inside seam of well-fitting pants." },
      { question: "What is the average inseam for a man 5'10\"?", answer: "About 31–32 inches, though leg length varies." },
    ],
  },
  {
    slug: "belt-size-calculator",
    title: "Belt Size Calculator",
    description: "Find your belt size from your pants waist size (add 2 inches) or by measuring a belt that fits, with the size in centimetres and S–XL.",
    metaTitle: "Belt Size Calculator — From Waist or Belt",
    metaDescription: "Free belt size calculator. Find your belt size from your pants size or a belt that fits, in inches, centimetres and S–XL.",
    calcInputs: [
      dropdown("method", "Method", [["From my pants waist size", 0], ["Measure a belt that fits", 1]], 0),
      numberField("waist", "Pants Waist Size", { default: 34, max: 70, step: 1 }),
      numberField("beltMeasure", "Belt: Buckle Fold to the Hole You Use", { default: 36, max: 80, step: 0.25, required: false }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "Belt Size", format: "number" },
    calcResults: [
      { key: "beltSize", label: "Belt Size (in)", format: "number", highlight: true },
      { key: "beltSizeCm", label: "Belt Size (cm)", format: "number" },
      { key: "letterCode", label: "Letter Size (1 S, 2 M, 3 L, 4 XL, 5 XXL)", format: "number" },
      { key: "totalLength", label: "Total Belt Length (in, Approx.)", format: "number" },
    ],
    instructions: "Enter the waist size on your pants label, or measure a belt you like from where the leather folds at the buckle to the hole you use most.",
    examples: "Example: size 34 pants need about a size 36 belt (91 cm), letter code 2 — a medium.",
    assumptions: "Belt size = pants waist size + 2 in, which puts the buckle on the middle hole. Belt sizes are measured from the buckle fold to the centre hole; the total strap is about 6 in longer. Women's belts may use a different scale.",
    faq: [
      { question: "What size belt for 34 pants?", answer: "A size 36 belt — about 2 inches more than your pants size." },
      { question: "How do I measure a belt?", answer: "Measure from the fold where the buckle attaches to the hole you use most." },
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
