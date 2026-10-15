// One-time (but safe to re-run) batch setup script: creates 9 gemstone, pearl and birthstone tools
// from the user's shopping list (Shopping Calculators > Gold, Silver & Jewelry Calculators).
// See src/lib/calc-engine-shopping-gold-gems.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-gold-gems-calculators.ts
// or
//   npm run db:create-shopping-gold-gems-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Gold, Silver & Jewelry Calculators", slug: "gold-silver-jewelry-calculators" };

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

function currencyField(key: string, label: string, opts: { default?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "currency", required: opts.required ?? true, default: opts.default ?? 0, min: 0, max: opts.max ?? 100000, step: opts.step ?? 1 };
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

const QUALITIES: [string, number][] = [["Commercial (included, lighter colour)", 0], ["Good (typical jewelry quality)", 1], ["Fine (vivid colour, eye-clean)", 2], ["Top gem (exceptional, rare)", 3]];
const GEM_NOTE = "Coloured gemstone prices vary enormously with colour, clarity, cut, treatment and origin. These are rough 2026 retail estimates — a lab report (GIA, AGL, SSEF, Gübelin) and comparable listings give the real value.";

const TOOLS: ToolDef[] = [
  {
    slug: "gemstone-mm-to-carat-calculator",
    title: "Gemstone MM to Carat Calculator",
    description: "Estimate the carat weight of a coloured gemstone from its length, width and depth in millimetres, its shape and its specific gravity — ruby, sapphire, emerald, topaz and more.",
    metaTitle: "Gemstone MM to Carat Calculator — Any Gem",
    metaDescription: "Free gemstone mm to carat calculator. Estimate carat weight from millimetre measurements, shape and specific gravity for 16 gemstones.",
    calcInputs: [
      dropdown("gem", "Gemstone", [["Ruby", 0], ["Sapphire", 1], ["Emerald", 2], ["Tanzanite", 3], ["Aquamarine", 4], ["Morganite", 5], ["Topaz", 6], ["Amethyst", 7], ["Citrine", 8], ["Garnet", 9], ["Peridot", 10], ["Tourmaline", 11], ["Spinel", 12], ["Alexandrite", 13], ["Opal", 14], ["Diamond", 16]], 2),
      dropdown("shape", "Shape", [["Round", 0], ["Oval", 1], ["Emerald / octagon", 2], ["Cushion", 3], ["Pear", 4], ["Marquise", 5], ["Square / princess", 6]], 2),
      numberField("lengthMm", "Length (or Diameter)", { unit: "mm", default: 8, max: 100, step: 0.1 }),
      numberField("widthMm", "Width", { unit: "mm", default: 6, max: 100, step: 0.1, required: false }),
      numberField("depthMm", "Depth", { unit: "mm", default: 4.2, max: 100, step: 0.1 }),
    ],
    calcResult: { label: "Carat Weight", format: "number" },
    calcResults: [
      { key: "carats", label: "Estimated Carat Weight", format: "number", highlight: true },
      { key: "grams", label: "Grams", format: "number", decimals: 3 },
      { key: "specificGravity", label: "Specific Gravity Used", format: "number" },
      { key: "diamondEquivalentCarats", label: "A Diamond This Size Would Weigh (ct)", format: "number" },
    ],
    instructions:
      "Choose the gemstone and shape, then measure length, width and depth in millimetres with a gauge (for a round stone only the diameter and depth are needed).",
    examples: "Example: an 8 × 6 mm emerald-cut emerald 4.2 mm deep weighs about 1.37 ct; a diamond of the same size would weigh 1.77 ct because diamond is denser.",
    assumptions: "Carats = length × width × depth × shape factor × specific gravity (round 0.0018, oval 0.0020, emerald cut 0.0025, cushion 0.0022, pear 0.00175, marquise 0.0016, square 0.0023). Real stones vary with girdle thickness and belly, so expect ±10%.",
    faq: [
      { question: "Why do gemstones of the same size weigh different amounts?", answer: "Each gem has its own density (specific gravity). A ruby is about 50% heavier than an emerald of the same size." },
      { question: "How do I measure a mounted gemstone?", answer: "Measure length and width with a millimetre gauge; estimate depth or use a jeweler's depth gauge — the result is less exact when the stone is set." },
    ],
  },
  {
    slug: "gemstone-price-calculator",
    title: "Gemstone Price Calculator",
    description: "Estimate the price of 16 popular gemstones — from ruby, sapphire and emerald to tanzanite, aquamarine, topaz and amethyst — by carat weight, quality and treatment.",
    metaTitle: "Gemstone Price Calculator — Price per Carat",
    metaDescription: "Free gemstone price calculator. Estimate price per carat and total price for ruby, sapphire, emerald, tanzanite, aquamarine and more by size and quality.",
    calcInputs: [
      dropdown("gem", "Gemstone", [["Ruby", 0], ["Blue sapphire", 1], ["Emerald", 2], ["Tanzanite", 3], ["Aquamarine", 4], ["Morganite", 5], ["Blue topaz", 6], ["Amethyst", 7], ["Citrine", 8], ["Garnet", 9], ["Peridot", 10], ["Tourmaline", 11], ["Spinel", 12], ["Alexandrite", 13], ["Opal", 14], ["Pink sapphire", 15]], 3),
      numberField("carat", "Carat Weight", { unit: "ct", default: 3, max: 100, step: 0.05 }),
      dropdown("quality", "Quality", QUALITIES, 1),
      dropdown("untreated", "Treatment", [["Typical treatment (heated, oiled, etc.)", 0], ["Certified untreated (+50%)", 1]], 0),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
      { key: "hardness", label: "Hardness (Mohs)", format: "number" },
    ],
    instructions:
      "Choose the gemstone, enter its carat weight, pick the quality that best describes its colour and clarity, and say whether it's certified untreated.",
    examples: "Example: a 3 ct good-quality tanzanite is estimated at $1,668.47 ($556.16 per carat), typically between $1,001.08 and $2,669.55.",
    assumptions: "Price per carat = base price for a 1 ct good-quality stone × carat^size factor × quality tier (0.35× commercial to 6× top gem). Rare gems (ruby, sapphire, emerald, alexandrite) climb steeply with size; common gems (topaz, amethyst, citrine) barely do. " + GEM_NOTE,
    faq: [
      { question: "What makes a gemstone valuable?", answer: "Mostly colour — its hue, saturation and tone — then clarity, cut, size, treatment and sometimes origin." },
      { question: "Are most gemstones treated?", answer: "Yes — heating sapphires and rubies, oiling emeralds and irradiating blue topaz are common and accepted, but untreated stones command a premium." },
    ],
  },
  {
    slug: "ruby-price-calculator",
    title: "Ruby Price Calculator",
    description: "Estimate a ruby's price from its carat weight, colour (from pigeon blood to pinkish), quality, treatment (unheated, heated or glass-filled) and origin.",
    metaTitle: "Ruby Price Calculator — Price per Carat",
    metaDescription: "Free ruby price calculator. Estimate ruby prices by carat, colour, quality, treatment and origin — Burma, Mozambique, Thailand and more.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 1.5, max: 50, step: 0.05 }),
      dropdown("color", "Colour", [["Pigeon blood red", 0], ["Vivid red", 1], ["Medium red", 2], ["Pinkish / purplish red", 3]], 2),
      dropdown("quality", "Clarity & Cut Quality", QUALITIES, 1),
      dropdown("treatment", "Treatment", [["Unheated (certified)", 0], ["Heated", 1], ["Glass-filled / composite", 2]], 1),
      dropdown("origin", "Origin", [["Burma (Myanmar)", 0], ["Mozambique", 1], ["Madagascar / other", 2], ["Thailand / Cambodia", 3]], 1),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Enter the carat weight and choose the colour, quality, treatment and origin from the lab report. Glass-filled rubies are composites and worth a small fraction of a real ruby.",
    examples: "Example: a 1.5 ct medium-red heated Mozambique ruby of good quality is estimated at $3,443.65 ($2,295.76 per carat).",
    assumptions: "Unheated stones are about twice the price of heated ones; Burmese origin and 'pigeon blood' colour carry big premiums. Glass-filled (lead-glass) rubies are priced at a few percent of real rubies. Fine rubies over 3 ct are extremely rare and can exceed $10,000 per carat. " + GEM_NOTE,
    faq: [
      { question: "How much is a 1 carat ruby worth?", answer: "From under $100 for glass-filled or commercial stones to several thousand dollars for fine heated rubies, and far more for unheated Burmese stones." },
      { question: "What is a pigeon blood ruby?", answer: "A trade term for the most prized ruby colour: a pure, vivid red with strong fluorescence, typically from Myanmar." },
    ],
  },
  {
    slug: "sapphire-price-calculator",
    title: "Sapphire Price Calculator",
    description: "Estimate a sapphire's price from its carat weight, colour (blue, padparadscha, pink, yellow or white), quality, heat treatment and origin.",
    metaTitle: "Sapphire Price Calculator — Blue & Fancy Colours",
    metaDescription: "Free sapphire price calculator. Estimate sapphire prices by carat, colour, quality, heat treatment and origin — Kashmir, Ceylon, Madagascar.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 2, max: 50, step: 0.05 }),
      dropdown("color", "Colour", [["Blue", 0], ["Padparadscha (pink-orange)", 1], ["Pink", 2], ["Yellow", 3], ["White / colourless", 4]], 0),
      dropdown("quality", "Quality", QUALITIES, 1),
      dropdown("unheated", "Heat Treatment", [["Heated (most sapphires)", 0], ["Unheated (certified)", 1]], 0),
      dropdown("origin", "Origin", [["Kashmir", 0], ["Sri Lanka (Ceylon)", 1], ["Madagascar / Montana / other", 2], ["Australia / Thailand", 3]], 1),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Enter the carat weight and choose the colour, quality, whether it's certified unheated and its origin.",
    examples: "Example: a 2 ct good-quality heated blue Ceylon sapphire is estimated at $3,676.96 ($1,838.48 per carat).",
    assumptions: "Blue is the reference colour; padparadscha carries a large premium, pink sits a little below blue, and yellow and white are far cheaper. Unheated stones add about 60%; Kashmir origin multiplies prices several times. " + GEM_NOTE,
    faq: [
      { question: "How much is a 2 carat sapphire worth?", answer: "A good heated blue sapphire often costs $1,000–$3,000 per carat; fine unheated stones and rare colours cost much more." },
      { question: "Is a heated sapphire less valuable?", answer: "Heating is standard and accepted, but certified unheated sapphires command a premium of roughly 50–100%." },
    ],
  },
  {
    slug: "emerald-price-calculator",
    title: "Emerald Price Calculator",
    description: "Estimate an emerald's price from its carat weight, quality, clarity enhancement (none to significant oil) and origin — Colombia, Zambia, Brazil or Afghanistan.",
    metaTitle: "Emerald Price Calculator — Price per Carat",
    metaDescription: "Free emerald price calculator. Estimate emerald prices by carat, quality, oil enhancement and origin, including Colombian and Zambian emeralds.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 1.2, max: 50, step: 0.05 }),
      dropdown("quality", "Colour & Clarity Quality", QUALITIES, 1),
      dropdown("enhancement", "Clarity Enhancement", [["None (certified)", 0], ["Insignificant", 1], ["Minor", 2], ["Moderate", 3], ["Significant", 4]], 2),
      dropdown("origin", "Origin", [["Colombia", 0], ["Zambia", 1], ["Brazil", 2], ["Afghanistan (Panjshir)", 3]], 0),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Enter the carat weight, the quality and the clarity enhancement grade on the lab report (most emeralds are oiled), and the origin.",
    examples: "Example: a 1.2 ct good-quality Colombian emerald with minor oil is estimated at $2,208.42 ($1,840.35 per carat).",
    assumptions: "Almost all emeralds contain inclusions and are oiled; stones with no or insignificant enhancement are worth far more. Colombian emeralds carry a premium for their colour. Emeralds are brittle — avoid ultrasonic cleaners. " + GEM_NOTE,
    faq: [
      { question: "How much is a 1 carat emerald worth?", answer: "Commonly a few hundred to a few thousand dollars, depending on colour, clarity, enhancement and origin." },
      { question: "Why are emeralds oiled?", answer: "Oil or resin fills tiny fractures and makes inclusions less visible. It's standard practice, but less enhancement means more value." },
    ],
  },
  {
    slug: "topaz-price-calculator",
    title: "Topaz Price Calculator",
    description: "Estimate topaz prices by carat and type — London, Swiss and sky blue, white, mystic or rare imperial topaz — and quality.",
    metaTitle: "Topaz Price Calculator — Blue & Imperial Topaz",
    metaDescription: "Free topaz price calculator. Estimate prices for London blue, Swiss blue, white, mystic and imperial topaz by carat and quality.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 5, max: 200, step: 0.1 }),
      dropdown("type", "Type", [["London blue", 0], ["Swiss blue", 1], ["Sky blue", 2], ["White / colourless", 3], ["Mystic (coated)", 4], ["Imperial (natural orange-pink)", 5]], 0),
      dropdown("quality", "Quality", QUALITIES, 1),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Price", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Enter the carat weight and choose the type and quality. Blue topaz is almost always irradiated and heated colourless topaz, which keeps it affordable even in large sizes.",
    examples: "Example: a 5 ct good-quality London blue topaz is estimated at $176.19 ($35.24 per carat).",
    assumptions: "Treated blue, white and mystic topaz cost tens of dollars per carat and barely rise with size; natural imperial topaz from Brazil is rare and priced like a precious gem. Mystic topaz has a surface coating that can wear. " + GEM_NOTE,
    faq: [
      { question: "How much is blue topaz worth?", answer: "Usually $10–$50 per carat, so even large blue topaz stones are affordable." },
      { question: "What is imperial topaz?", answer: "Natural golden-orange to pinkish topaz, mainly from Ouro Preto, Brazil — far rarer and more valuable than treated blue topaz." },
    ],
  },
  {
    slug: "opal-value-calculator",
    title: "Opal Value Calculator",
    description: "Estimate an opal's value from its carat weight, type (black, boulder, crystal, Ethiopian, white or fire opal), brightness of play of colour and pattern.",
    metaTitle: "Opal Value Calculator — Black, Boulder & Ethiopian",
    metaDescription: "Free opal value calculator. Estimate opal value by carat, type, brightness and pattern — black, boulder, crystal, Ethiopian, white and fire opal.",
    calcInputs: [
      numberField("carat", "Carat Weight", { unit: "ct", default: 4, max: 500, step: 0.1 }),
      dropdown("type", "Opal Type", [["Black opal (Lightning Ridge)", 0], ["Boulder opal", 1], ["Crystal opal", 2], ["Ethiopian (Welo) opal", 3], ["White / light opal", 4], ["Mexican fire opal", 5]], 3),
      dropdown("brightness", "Play-of-Colour Brightness", [["B1 — brilliant", 0], ["B2 — very bright", 1], ["B3 — bright", 2], ["B4 — subdued", 3], ["B5 — dull", 4]], 2),
      dropdown("pattern", "Pattern", [["Common (pinfire, flash)", 0], ["Rare (harlequin, broad flash, rolling flash)", 1]], 0),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Estimated Value", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Enter the carat weight, choose the opal type and how bright its play of colour is from the face-up view, and whether its pattern is rare.",
    examples: "Example: a 4 ct bright (B3) Ethiopian opal with a common pattern is estimated at $360.00 ($90.00 per carat).",
    assumptions: "Black opals with brilliant red play of colour are the most valuable, sometimes thousands of dollars per carat; Ethiopian and white opals are far cheaper. Doublets and triplets (thin opal on a backing) are worth a fraction of solid opals. " + GEM_NOTE,
    faq: [
      { question: "What type of opal is most valuable?", answer: "Black opal from Lightning Ridge, Australia, especially with bright red flashes in a rare pattern like harlequin." },
      { question: "Are Ethiopian opals valuable?", answer: "They can be beautiful and bright but sell for much less per carat than Australian black or boulder opal." },
    ],
  },
  {
    slug: "pearl-value-calculator",
    title: "Pearl Value Calculator",
    description: "Estimate the value of a pearl or a pearl strand from the type (freshwater, Akoya, Tahitian or South Sea), size in millimetres, grade and strand length.",
    metaTitle: "Pearl Value Calculator — Strands & Single Pearls",
    metaDescription: "Free pearl value calculator. Estimate the value of freshwater, Akoya, Tahitian and South Sea pearls and strands by size, grade and length.",
    calcInputs: [
      dropdown("type", "Pearl Type", [["Freshwater", 0], ["Akoya", 1], ["Tahitian", 2], ["South Sea", 3]], 1),
      numberField("sizeMm", "Pearl Size", { unit: "mm", default: 7.5, min: 3, max: 18, step: 0.5 }),
      dropdown("grade", "Grade", [["A — fair lustre, some blemishes", 0], ["AA+ — good lustre", 1], ["AAA — excellent lustre, clean", 2]], 1),
      dropdown("form", "Form", [["Loose pearls or earrings", 0], ["Strand / necklace", 1]], 1),
      numberField("count", "Number of Pearls (Loose)", { default: 2, min: 1, max: 1000, required: false }),
      numberField("lengthIn", "Strand Length", { unit: "in", default: 18, max: 60, required: false }),
      currencyField("claspCost", "Clasp (Strands)", { default: 60, max: 5000, step: 5, required: false }),
    ],
    calcResult: { label: "Estimated Value", format: "currency" },
    calcResults: [
      { key: "estimatedValue", label: "Estimated Value", format: "currency", highlight: true },
      { key: "pricePerPearl", label: "Price per Pearl", format: "currency" },
      { key: "pearlCount", label: "Number of Pearls", format: "number" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
    ],
    instructions:
      "Choose the pearl type, size and grade, then whether you're valuing loose pearls (enter the count) or a strand (enter its length). The strand count is worked out from the length and pearl size.",
    examples: "Example: an 18 in strand of 7.5 mm AA+ Akoya pearls has about 61 pearls at $46.48 each; with the clasp it's worth about $2,895.02 at retail.",
    assumptions: "Prices rise steeply with size (about 25–35% per extra millimetre) and with lustre and surface quality. Natural (wild) pearls and antique strands are a separate, far more valuable market. Imitation pearls feel smooth when rubbed on your teeth; real pearls feel slightly gritty.",
    faq: [
      { question: "How much is a pearl necklace worth?", answer: "Freshwater strands often sell for $100–$500, Akoya $500–$3,000, and Tahitian or South Sea strands from $2,000 into five figures." },
      { question: "How can I tell if pearls are real?", answer: "Rub them gently against your teeth: real pearls feel gritty, imitations feel smooth. Drill holes and slight size differences are also good signs." },
    ],
  },
  {
    slug: "birthstone-calculator",
    title: "Birthstone Calculator",
    description: "Find the birthstone for any month — garnet, amethyst, aquamarine, diamond, emerald, alexandrite, ruby, peridot, sapphire, opal, topaz or tanzanite — and its typical price for a chosen size.",
    metaTitle: "Birthstone Calculator — Stone by Month & Price",
    metaDescription: "Free birthstone calculator. Find the birthstone for each month and what it typically costs by carat and quality, with its hardness.",
    calcInputs: [
      dropdown("month", "Birth Month", [["January — Garnet", 0], ["February — Amethyst", 1], ["March — Aquamarine", 2], ["April — Diamond", 3], ["May — Emerald", 4], ["June — Alexandrite (or Pearl)", 5], ["July — Ruby", 6], ["August — Peridot", 7], ["September — Sapphire", 8], ["October — Opal (or Tourmaline)", 9], ["November — Topaz (or Citrine)", 10], ["December — Tanzanite (or Turquoise, Zircon)", 11]], 8),
      numberField("carat", "Stone Size", { unit: "ct", default: 1, max: 20, step: 0.05 }),
      dropdown("quality", "Quality", QUALITIES, 1),
    ],
    calcResult: { label: "Estimated Price", format: "currency" },
    calcResults: [
      { key: "estimatedPrice", label: "Typical Price for This Stone", format: "currency", highlight: true },
      { key: "pricePerCarat", label: "Price per Carat", format: "currency" },
      { key: "lowEstimate", label: "Low End", format: "currency" },
      { key: "highEstimate", label: "High End", format: "currency" },
      { key: "hardness", label: "Hardness (Mohs, 10 = Hardest)", format: "number" },
    ],
    instructions:
      "Choose the birth month — the month's birthstone is shown in the list — then the size and quality you'd like. Hardness tells you how well it suits everyday rings (7 or more is best).",
    examples: "Example: September's birthstone is sapphire. A 1 ct good-quality blue sapphire typically costs about $1,000.00, and at hardness 9 it's excellent for an everyday ring.",
    assumptions: "Uses the modern US birthstone list (American Gem Trade Association / Jewelers of America), with common alternatives in brackets. Prices are rough estimates for natural stones; lab-created rubies, sapphires and emeralds cost far less. " + GEM_NOTE,
    faq: [
      { question: "What is my birthstone?", answer: "January garnet, February amethyst, March aquamarine, April diamond, May emerald, June alexandrite or pearl, July ruby, August peridot, September sapphire, October opal or tourmaline, November topaz or citrine, December tanzanite, turquoise or zircon." },
      { question: "Which birthstones are best for everyday rings?", answer: "Harder stones — diamond, sapphire, ruby, alexandrite, topaz — resist scratches best. Opal, pearl and tanzanite need more care." },
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
