// One-time (but safe to re-run) batch setup script: creates 9 shoe, boot and sock size tools
// from the user's shopping list (Shopping Calculators > Clothing, Shoe & Ring Size Calculators).
// See src/lib/calc-engine-shopping-size-shoes.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-size-shoes-calculators.ts
// or
//   npm run db:create-shopping-size-shoes-calculators

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
const SHOE_NOTE = "Shoe sizing varies between brands and styles; measure your feet in the afternoon, when they're largest, and check the brand's chart.";

const TOOLS: ToolDef[] = [
  {
    slug: "shoe-size-calculator",
    title: "Shoe Size Calculator",
    description: "Find your shoe size from your foot length — US men's and women's, UK, EU, centimetres and Mondopoint — so you can order shoes from any country.",
    metaTitle: "Shoe Size Calculator — US, UK & EU From Foot Length",
    metaDescription: "Free shoe size calculator. Measure your foot and find your US men's, US women's, UK, EU and Mondopoint shoe sizes.",
    calcInputs: [
      numberField("footLength", "Foot Length (Heel to Longest Toe)", { default: 10.5, max: 20, step: 0.05 }),
      dropdown("unit", "Measured In", UNIT, 0),
    ],
    calcResult: { label: "US Men's Size", format: "number" },
    calcResults: [
      { key: "usMens", label: "US Men's Size", format: "number", highlight: true },
      { key: "usWomens", label: "US Women's Size", format: "number" },
      { key: "ukSize", label: "UK Size (Men's)", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
      { key: "footLengthCm", label: "Foot Length (cm)", format: "number" },
      { key: "mondopoint", label: "Mondopoint (mm)", format: "number" },
    ],
    instructions:
      "Stand on a sheet of paper against a wall, mark the tip of your longest toe and measure from the wall to the mark. Measure both feet and use the longer one.",
    examples: "Example: a 10.5 in (26.7 cm) foot is about a US men's 10, US women's 11.5, UK 9.5 and EU 42.5.",
    assumptions: "Uses the Brannock relationship (US men's ≈ 3 × foot length in inches − 21.5), women's = men's + 1.5, UK men's = US − 0.5, EU = 1.5 × (foot cm + 1.5). Results round to the nearest half size. " + SHOE_NOTE,
    faq: [
      { question: "How do I measure my foot for shoe size?", answer: "Stand with your heel against a wall, mark your longest toe on paper, and measure in inches or centimetres. Measure both feet and use the larger." },
      { question: "What is the difference between US men's and women's sizes?", answer: "Women's sizes run about 1.5 sizes larger for the same foot: a men's 8 is roughly a women's 9.5." },
    ],
  },
  {
    slug: "womens-to-mens-shoe-size-calculator",
    title: "Women's to Men's Shoe Size Calculator",
    description: "Convert women's shoe sizes to men's (or men's to women's) in US sizes, with the UK and EU equivalents — useful for unisex sneakers and boots.",
    metaTitle: "Women's to Men's Shoe Size Calculator — Convert",
    metaDescription: "Free women's to men's shoe size converter. Convert US women's sizes to men's and back, with UK and EU sizes for unisex shoes.",
    calcInputs: [
      dropdown("direction", "Convert", [["Women's → men's", 0], ["Men's → women's", 1]], 0),
      numberField("size", "US Size", { default: 9, min: 1, max: 20, step: 0.5 }),
    ],
    calcResult: { label: "Converted Size", format: "number" },
    calcResults: [
      { key: "convertedSize", label: "Converted US Size", format: "number", highlight: true },
      { key: "usMens", label: "US Men's", format: "number" },
      { key: "usWomens", label: "US Women's", format: "number" },
      { key: "ukMens", label: "UK Men's", format: "number" },
      { key: "ukWomens", label: "UK Women's", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
    ],
    instructions: "Choose the direction and enter the US size you know. Unisex shoes are usually labelled in men's sizes.",
    examples: "Example: a US women's 9 is a men's 7.5 (UK women's 7, EU 39).",
    assumptions: "US women's = US men's + 1.5 (some brands use +1 or +2). UK women's = US women's − 2; UK men's = US men's − 0.5. Men's shoes are also often a little wider than women's of the same length. " + SHOE_NOTE,
    faq: [
      { question: "How do I convert women's shoe size to men's?", answer: "Subtract 1.5 from the US women's size: a women's 9 is about a men's 7.5." },
      { question: "Are unisex shoes in men's or women's sizes?", answer: "Usually men's, though many sneakers list both; check the label or size chart." },
    ],
  },
  {
    slug: "shoe-width-calculator",
    title: "Shoe Width Calculator",
    description: "Find your shoe width — narrow, medium, wide or extra wide (B, D, 2E, 4E for men; AA, B, D, 2E for women) — from your foot length and width at the ball.",
    metaTitle: "Shoe Width Calculator — Narrow, Medium or Wide",
    metaDescription: "Free shoe width calculator. Find your shoe width letter from foot length and width — men's B, D, 2E, 4E and women's AA, B, D, 2E.",
    calcInputs: [
      numberField("footLength", "Foot Length", { default: 10.5, max: 20, step: 0.05 }),
      numberField("footWidth", "Foot Width at the Ball (Widest Point)", { default: 4.1, max: 10, step: 0.05 }),
      dropdown("unit", "Measured In", UNIT, 0),
      dropdown("gender", "Shoe Type", [["Men's", 0], ["Women's", 1]], 0),
    ],
    calcResult: { label: "Width", format: "number" },
    calcResults: [
      { key: "widthCode", label: "Width (Men: 1 B Narrow, 2 D Medium, 3 2E Wide, 4 4E Extra Wide, 5 6E · Women: 1 AA, 2 B, 3 D, 4 2E, 5 4E)", format: "number", highlight: true },
      { key: "mediumWidthForYourSize", label: "Medium Width for Your Length (in)", format: "number" },
      { key: "differenceFromMedium", label: "Your Width vs Medium (in)", format: "number" },
      { key: "widthToLengthRatio", label: "Width as % of Length", format: "number" },
    ],
    instructions: "Measure your foot length, then wrap or trace across the widest part of your foot (the ball, below the toes) while standing. Choose men's or women's shoes.",
    examples: "Example: a 10.5 in long, 4.1 in wide foot in men's shoes is width code 3 — a 2E (wide). Medium for that length is 3.96 in.",
    assumptions: "Medium width rises about 1/16 in per full size; each width letter is about 3/16 in apart. Width also depends on foot volume, so try styles on when you can. " + SHOE_NOTE,
    faq: [
      { question: "What width is a men's D?", answer: "D is the standard (medium) width for men's shoes; 2E is wide and 4E extra wide." },
      { question: "What width is a women's B?", answer: "B is the standard (medium) width for women's shoes; D is wide and AA narrow." },
    ],
  },
  {
    slug: "kids-shoe-size-calculator",
    title: "Kids Shoe Size Calculator",
    description: "Find your child's shoe size from foot length — little kid (C) and big kid (Y) US sizes and EU — with growing room built in.",
    metaTitle: "Kids Shoe Size Calculator — Little & Big Kid",
    metaDescription: "Free kids shoe size calculator. Find children's US shoe sizes (C and Y) and EU sizes from foot length, with growing room.",
    calcInputs: [
      numberField("footLength", "Child's Foot Length", { default: 8.25, max: 12, step: 0.05 }),
      dropdown("unit", "Measured In", UNIT, 0),
      numberField("growingRoom", "Growing Room", { unit: "in", default: 0.5, max: 1, step: 0.125 }),
    ],
    calcResult: { label: "Size to Buy", format: "number" },
    calcResults: [
      { key: "sizeToBuy", label: "Size to Buy", format: "number", highlight: true },
      { key: "sizeSeries", label: "Size Series (1 = Little Kid C, 2 = Big Kid Y)", format: "number" },
      { key: "exactSizeNow", label: "Exact Size Now (No Room)", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
      { key: "footLengthCm", label: "Foot Length (cm)", format: "number" },
    ],
    instructions: "Have your child stand with their heel against a wall and mark their longest toe. Add about half an inch (a thumb's width) of growing room.",
    examples: "Example: an 8.25 in foot with half an inch of room needs size 1.5 in series 2 — a youth (Y) size — or EU 35.5.",
    assumptions: "Kids' US size ≈ 3 × foot length (in) − 11.67; after 13.5C sizes restart at 1Y. Children's feet grow about half a size every few months, so re-measure often. " + SHOE_NOTE,
    faq: [
      { question: "What's the difference between C and Y sizes?", answer: "C (child) sizes run up to 13.5 for little kids; Y (youth) sizes start again at 1 for big kids." },
      { question: "How much room should kids' shoes have?", answer: "About a thumb's width — 1/2 inch (about 1.2 cm) — beyond the longest toe." },
    ],
  },
  {
    slug: "toddler-shoe-size-calculator",
    title: "Toddler Shoe Size Calculator",
    description: "Find baby and toddler shoe sizes (US 0–10C and EU) from your little one's foot length, with growing room and when to measure again.",
    metaTitle: "Toddler & Baby Shoe Size Calculator — 0 to 10C",
    metaDescription: "Free toddler and baby shoe size calculator. Find US 0–10C and EU sizes from foot length, with growing room and re-measure reminders.",
    calcInputs: [
      numberField("footLength", "Foot Length", { default: 5.25, max: 8, step: 0.05 }),
      dropdown("unit", "Measured In", UNIT, 0),
      numberField("ageMonths", "Age", { unit: "months", default: 18, max: 72 }),
      numberField("growingRoom", "Growing Room", { unit: "in", default: 0.5, max: 1, step: 0.125 }),
    ],
    calcResult: { label: "Size to Buy", format: "number" },
    calcResults: [
      { key: "sizeToBuy", label: "US Size to Buy (C)", format: "number", highlight: true },
      { key: "exactSizeNow", label: "Exact Size Now", format: "number" },
      { key: "euSize", label: "EU Size", format: "number" },
      { key: "remeasureInMonths", label: "Measure Again In (Months)", format: "number" },
      { key: "footLengthCm", label: "Foot Length (cm)", format: "number" },
    ],
    instructions: "Measure your child's foot while they stand (or with gentle pressure for a baby) from heel to longest toe. Add about half an inch of growing room.",
    examples: "Example: a 5.25 in foot at 18 months needs about a US 5.5C (EU 24). Measure again in 3 months.",
    assumptions: "Baby and toddler sizes follow 3 × foot length − 11.67. Under 15 months, feet can grow a size every 2 months; toddlers every 3 months; preschoolers every 4. Babies who aren't walking don't need structured shoes. " + SHOE_NOTE,
    faq: [
      { question: "What size shoe does a 1-year-old wear?", answer: "Often around US 4C–5C, but always measure — feet vary a lot at this age." },
      { question: "How often should I check my toddler's shoe size?", answer: "About every 2–3 months, or when shoes leave marks or your child resists wearing them." },
    ],
  },
  {
    slug: "boot-size-calculator",
    title: "Boot Size Calculator",
    description: "Find your boot size from your shoe size for work, hiking, cowboy, winter or rain boots and thick socks — and whether you need a regular or wide calf.",
    metaTitle: "Boot Size Calculator — Size & Calf Width",
    metaDescription: "Free boot size calculator. Convert shoe size to boot size for work, cowboy, hiking and winter boots, and find your calf width fit.",
    calcInputs: [
      numberField("shoeSize", "Your Usual US Shoe Size", { default: 9, min: 1, max: 20, step: 0.5 }),
      dropdown("bootType", "Boot Type", [["Work / hiking boots", 0], ["Rain boots", 1], ["Cowboy / western boots", 2], ["Winter / snow boots", 3], ["Fashion ankle or knee boots", 4]], 2),
      dropdown("thickSocks", "Thick Socks?", [["No", 0], ["Yes", 1]], 0),
      numberField("calf", "Calf Circumference (Widest Point)", { default: 15.5, max: 30, step: 0.25 }),
      dropdown("unit", "Calf Measured In", UNIT, 0),
      dropdown("gender", "Boot Type", [["Men's", 0], ["Women's", 1]], 1),
    ],
    calcResult: { label: "Boot Size", format: "number" },
    calcResults: [
      { key: "bootSize", label: "Boot Size to Try", format: "number", highlight: true },
      { key: "sizeChange", label: "Change From Shoe Size", format: "number" },
      { key: "calfFitCode", label: "Calf Fit (1 Regular, 2 Wide Calf, 3 Extra-Wide Calf)", format: "number" },
      { key: "calfInches", label: "Calf (in)", format: "number" },
    ],
    instructions: "Enter your usual shoe size, the kind of boot and whether you'll wear thick socks. For tall boots, measure around the widest part of your calf.",
    examples: "Example: a women's 9 in cowboy boots usually needs a 8.5 — half a size down because western boots run large. A 15.5 in calf is calf fit 2 (wide calf).",
    assumptions: "Rules of thumb: work, hiking and rain boots in your shoe size; cowboy boots half a size down; winter boots half a size up; add half a size for thick socks. Regular calf shafts fit up to about 15 in (women's) or 16 in (men's). " + SHOE_NOTE,
    faq: [
      { question: "Should boots be a size bigger than shoes?", answer: "Not usually — most boots match your shoe size, but winter boots and boots worn with thick socks often need half a size up." },
      { question: "Do cowboy boots run big?", answer: "Often, yes — many people go half a size down. The heel should slip slightly at first and settle as the boots break in." },
    ],
  },
  {
    slug: "wader-size-calculator",
    title: "Wader Size Calculator",
    description: "Find your fishing wader size from chest and inseam (with short, regular or long lengths) and the right wading boot or bootfoot size from your shoe size.",
    metaTitle: "Wader Size Calculator — Chest, Inseam & Boot Size",
    metaDescription: "Free wader size calculator. Find wader size from chest and inseam, plus wading boot size for stockingfoot or bootfoot waders.",
    calcInputs: [
      numberField("chest", "Chest (Over a Layer)", { default: 44, max: 80, step: 0.5 }),
      numberField("inseam", "Inseam", { default: 31, max: 45, step: 0.5 }),
      dropdown("unit", "Measured In", UNIT, 0),
      numberField("shoeSize", "US Shoe Size", { default: 10, min: 1, max: 20, step: 0.5 }),
      dropdown("waderType", "Wader Type", [["Stockingfoot (separate wading boots)", 0], ["Bootfoot (boots attached)", 1]], 0),
      dropdown("thickSocks", "Thick Socks?", [["No", 0], ["Yes", 1]], 1),
    ],
    calcResult: { label: "Wader Size", format: "number" },
    calcResults: [
      { key: "waderSizeCode", label: "Wader Size (1 S, 2 M, 3 L, 4 XL, 5 XXL, 6 XXXL)", format: "number", highlight: true },
      { key: "lengthCode", label: "Length (1 Short, 2 Regular, 3 Long / King)", format: "number" },
      { key: "wadingBootSize", label: "Wading Boot Size (Stockingfoot)", format: "number" },
      { key: "bootfootSize", label: "Bootfoot Size", format: "number" },
    ],
    instructions: "Measure your chest over the layers you'll wear underneath and your inseam from crotch to floor. Enter your shoe size and wader type — wading boots go over a neoprene sock, so they're usually one size larger.",
    examples: "Example: a 44 in chest and 31 in inseam is wader size 2 (medium) in length 2 (regular); with stockingfoot waders, buy size 11 wading boots.",
    assumptions: "Typical chart by chest (in): S up to 40, M 44, L 48, XL 52, XXL 56. Short and long (king) versions fit inseams about 2 in shorter or longer than regular. Make sure you can squat and lift your knee comfortably. " + SHOE_NOTE,
    faq: [
      { question: "What size wading boots do I need?", answer: "Usually one size larger than your street shoes, to fit over the neoprene stocking foot." },
      { question: "How should waders fit?", answer: "Roomy enough to squat, climb and layer underneath, without so much extra that they bunch at the knees." },
    ],
  },
  {
    slug: "sock-size-calculator",
    title: "Sock Size Calculator",
    description: "Find your sock size from your shoe size — S, M, L or XL and the traditional numbered sock size — for men's and women's socks.",
    metaTitle: "Sock Size Calculator — From Shoe Size",
    metaDescription: "Free sock size calculator. Convert men's or women's shoe size to sock sizes S, M, L, XL and the numbered US sock size.",
    calcInputs: [
      numberField("shoeSize", "US Shoe Size", { default: 10.5, min: 1, max: 20, step: 0.5 }),
      dropdown("gender", "Shoe Size Is", [["Men's", 0], ["Women's", 1]], 0),
    ],
    calcResult: { label: "Sock Size", format: "number" },
    calcResults: [
      { key: "sockLetterCode", label: "Sock Size (1 S, 2 M, 3 L, 4 XL)", format: "number", highlight: true },
      { key: "sockNumberSize", label: "Numbered Sock Size (≈ Foot Length in Inches)", format: "number" },
      { key: "footLengthInches", label: "Foot Length (in)", format: "number" },
      { key: "euSockRange", label: "EU Size", format: "number" },
    ],
    instructions: "Enter your shoe size and whether it's men's or women's.",
    examples: "Example: a men's 10.5 shoe is sock size 3 (large), or numbered sock size 10.5.",
    assumptions: "Men's letter sizes by shoe size: S up to 6, M 6–9, L 9–12, XL 12–15. Women's: S up to 5.5, M 6–8.5, L 9–11.5. Traditional US sock sizes roughly equal foot length in inches (a sock 10–13 fits most men's 6–12 shoes). " + SHOE_NOTE,
    faq: [
      { question: "What size socks do I need for a size 10 shoe?", answer: "Usually a large in men's socks, or sock size 10–13." },
      { question: "Why are sock sizes different from shoe sizes?", answer: "Traditional sock sizes are based on foot length in inches, while shoe sizes use their own scale." },
    ],
  },
  {
    slug: "heel-height-calculator",
    title: "Heel Height Calculator",
    description: "See how a heel height affects comfort — the pitch angle of your foot and how much body weight shifts onto the ball of the foot — for your shoe size.",
    metaTitle: "Heel Height Calculator — Comfort & Foot Angle",
    metaDescription: "Free heel height calculator. Find the foot pitch angle and forefoot pressure of a heel height for your shoe size, and a comfort rating.",
    calcInputs: [
      numberField("heelHeight", "Heel Height", { default: 3, max: 8, step: 0.25 }),
      dropdown("unit", "Measured In", UNIT, 0),
      numberField("shoeSize", "US Women's Shoe Size", { default: 8, min: 4, max: 14, step: 0.5 }),
    ],
    calcResult: { label: "Comfort", format: "number" },
    calcResults: [
      { key: "comfortCode", label: "Comfort (1 All-Day, 2 Moderate, 3 Occasional, 4 Very High)", format: "number", highlight: true },
      { key: "pitchAngle", label: "Foot Pitch Angle (Degrees)", format: "number" },
      { key: "forefootLoadPercent", label: "Body Weight on the Ball of the Foot (Approx. %)", format: "number" },
      { key: "heelHeightCm", label: "Heel Height (cm)", format: "number" },
    ],
    instructions: "Enter the heel height (measured at the back, from the floor to where the heel meets the shoe) and your shoe size. A platform under the toe reduces the effective height — subtract its thickness.",
    examples: "Example: a 3 in heel on a women's size 8 tilts the foot about 32.39 degrees and puts roughly 76% of your weight on the ball of the foot — comfort code 2.",
    assumptions: "Pitch angle uses a heel-to-ball distance of about 60% of foot length. Forefoot load figures are approximate, based on published pressure studies (about 22% at 1 in, 57% at 2 in, 76% at 3 in). Smaller feet feel the same heel as steeper.",
    faq: [
      { question: "What heel height is comfortable for all day?", answer: "Generally 2 inches or less; a block heel or platform makes a higher heel easier to wear." },
      { question: "Why do high heels hurt the ball of the foot?", answer: "Raising the heel shifts body weight forward — at 3 inches roughly three-quarters of the load goes onto the forefoot." },
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
