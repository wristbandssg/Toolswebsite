// One-time (but safe to re-run) batch setup script: creates 7 gold karat tools
// from the user's shopping list (Shopping Calculators > Gold, Silver & Jewelry Calculators).
// See src/lib/calc-engine-shopping-gold-karats.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-gold-karats-calculators.ts
// or
//   npm run db:create-shopping-gold-karats-calculators

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

function percentField(key: string, label: string, opts: { default?: number; min?: number; max?: number; step?: number; required?: boolean } = {}) {
  return { key, label, type: "percentage", unit: "%", required: opts.required ?? true, default: opts.default ?? 0, min: opts.min ?? 0, max: opts.max ?? 100, step: opts.step ?? 0.1 };
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

const SPOT_NOTE = "Gold prices move every day — enter today's spot price per troy ounce from a bullion dealer or financial site for an accurate value.";

const TOOLS: ToolDef[] = [
  {
    slug: "9k-gold-calculator",
    title: "9K Gold Calculator",
    description: "Find what 9K gold (37.5% pure, stamped 375) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "9K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 9K gold calculator. Find the melt value of 9K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 9K Gold", { default: 10, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "9K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "9K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "9K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "9K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 9K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 10 g of 9K gold at a $4,000 spot price contains 3.75 g of pure gold, so its melt value is $482.26 ($48.23 per gram). At an 80% payout, expect an offer around $385.81.",
    assumptions: "9K gold is 37.5% pure and common in UK and Australian jewelry; it's tougher and cheaper than higher karats. Melt value = weight in grams × spot price ÷ 31.1035 × 37.5%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "Is 9K gold real gold?", answer: "Yes — it contains 37.5% pure gold alloyed with other metals. It's legally sold as gold in the UK, Australia and elsewhere, though in the US the minimum for 'gold' is 10K." },
      { question: "How do I know if my gold is 9K?", answer: "Look for a stamp such as \"9K\" or \"375\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "10k-gold-calculator",
    title: "10K Gold Calculator",
    description: "Find what 10K gold (41.7% pure, stamped 417) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "10K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 10K gold calculator. Find the melt value of 10K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 10K Gold", { default: 10, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "10K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "10K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "10K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "10K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 10K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 10 g of 10K gold at a $4,000 spot price contains 4.167 g of pure gold, so its melt value is $535.89 ($53.59 per gram). At an 80% payout, expect an offer around $428.71.",
    assumptions: "10K is the lowest karat sold as gold in the US: 41.7% gold, very durable and common in class rings and budget jewelry. Melt value = weight in grams × spot price ÷ 31.1035 × 41.7%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "How much is 10K gold worth per gram?", answer: "About 41.7% of the spot price per gram of pure gold — divide the spot price per ounce by 31.1, then multiply by 0.417." },
      { question: "How do I know if my gold is 10K?", answer: "Look for a stamp such as \"10K\" or \"417\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "14k-gold-calculator",
    title: "14K Gold Calculator",
    description: "Find what 14K gold (58.5% pure, stamped 585) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "14K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 14K gold calculator. Find the melt value of 14K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 14K Gold", { default: 15, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "14K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "14K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "14K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "14K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 14K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 15 g of 14K gold at a $4,000 spot price contains 8.775 g of pure gold, so its melt value is $1,128.49 ($75.23 per gram). At an 80% payout, expect an offer around $902.79.",
    assumptions: "14K is the most popular gold in US jewelry: 58.5% pure (stamped 585), a good balance of colour, value and durability. Melt value = weight in grams × spot price ÷ 31.1035 × 58.5%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "How much is 14K gold worth?", answer: "Its melt value is 58.5% of the gold spot price per gram, times the weight. Buyers usually pay 70–90% of that." },
      { question: "How do I know if my gold is 14K?", answer: "Look for a stamp such as \"14K\" or \"585\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "18k-gold-calculator",
    title: "18K Gold Calculator",
    description: "Find what 18K gold (75% pure, stamped 750) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "18K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 18K gold calculator. Find the melt value of 18K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 18K Gold", { default: 8, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "18K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "18K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "18K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "18K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 18K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 8 g of 18K gold at a $4,000 spot price contains 6 g of pure gold, so its melt value is $771.62 ($96.45 per gram). At an 80% payout, expect an offer around $617.29.",
    assumptions: "18K is 75% gold (stamped 750), richer in colour and common in fine and European jewelry and luxury watches. Melt value = weight in grams × spot price ÷ 31.1035 × 75%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "What does 750 mean on gold?", answer: "It means 750 parts per thousand are pure gold — 18 karat, or 75% gold." },
      { question: "How do I know if my gold is 18K?", answer: "Look for a stamp such as \"18K\" or \"750\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "22k-gold-calculator",
    title: "22K Gold Calculator",
    description: "Find what 22K gold (91.67% pure, stamped 916) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "22K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 22K gold calculator. Find the melt value of 22K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 22K Gold", { default: 20, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "22K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "22K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "22K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "22K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 22K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 20 g of 22K gold at a $4,000 spot price contains 18.334 g of pure gold, so its melt value is $2,357.81 ($117.89 per gram). At an 80% payout, expect an offer around $1,886.25.",
    assumptions: "22K (916) gold is 91.67% pure and traditional for Indian, Middle Eastern and South Asian jewelry, and for bullion coins like the Krugerrand and Gold Eagle. Melt value = weight in grams × spot price ÷ 31.1035 × 91.67%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "Why is 22K gold called 916?", answer: "Because it's 916 parts per thousand pure gold (22 ÷ 24 = 91.67%)." },
      { question: "How do I know if my gold is 22K?", answer: "Look for a stamp such as \"22K\" or \"916\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "24k-gold-calculator",
    title: "24K Gold Calculator",
    description: "Find what 24K gold (99.9% pure, stamped 999) is worth by weight at today's spot price — melt value, value per gram and per pennyweight, and a likely buyer offer.",
    metaTitle: "24K Gold Calculator — Value per Gram Today",
    metaDescription: "Free 24K gold calculator. Find the melt value of 24K gold jewelry or scrap by grams, pennyweight or ounces at the current gold price.",
    calcInputs: [
      numberField("weight", "Weight of the 24K Gold", { default: 31.1, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "24K Gold Melt Value", format: "currency" },
    calcResults: [
      { key: "meltValue", label: "24K Gold Melt Value", format: "currency", highlight: true },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
      { key: "valuePerGram", label: "24K Value per Gram", format: "currency" },
      { key: "valuePerDwt", label: "24K Value per Pennyweight", format: "currency" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
    ],
    instructions: "Weigh the 24K gold on a kitchen or jewelry scale and enter the weight in grams, pennyweight or troy ounces (remove stones first, or estimate their weight). Enter today's gold spot price per troy ounce.\n\nSet the payout percentage you expect from a buyer to see a realistic offer.",
    examples: "Example: 31.1 g of 24K gold at a $4,000 spot price contains 31.069 g of pure gold, so its melt value is $3,995.55 ($128.47 per gram). At an 80% payout, expect an offer around $3,196.44.",
    assumptions: "24K is pure gold (99.9% or 999.9), used for bullion bars, many coins and some Asian jewelry. It's soft, so it scratches and bends easily. Melt value = weight in grams × spot price ÷ 31.1035 × 99.9%. Jewelry stores and pawn shops typically pay 50–80% of melt; refiners and reputable gold buyers 80–95%. " + SPOT_NOTE,
    faq: [
      { question: "Is 24K gold worth the spot price?", answer: "Close to it: 24K gold's melt value is nearly 100% of spot. Dealers buy bullion just below spot and sell just above." },
      { question: "How do I know if my gold is 24K?", answer: "Look for a stamp such as \"24K\" or \"999\" inside a ring band or on a clasp. Unstamped pieces can be tested with an acid kit or by a jeweler." },
    ],
  },
  {
    slug: "gold-karat-calculator",
    title: "Gold Karat Calculator",
    description: "Convert any gold karat to its purity percentage and fineness (like 14K = 58.3% = 583) and find the item's pure gold content and value at today's spot price.",
    metaTitle: "Gold Karat Calculator — Karat to Purity & Value",
    metaDescription: "Free gold karat calculator. Convert karats to purity % and fineness, and find pure gold content and value of any gold item at the spot price.",
    calcInputs: [
      numberField("karat", "Karat", { unit: "K", default: 14, min: 1, max: 24, step: 0.5 }),
      numberField("weight", "Item Weight", { default: 10, max: 100000, step: 0.01 }),
      dropdown("unit", "Weight Unit", [["Grams", 0], ["Pennyweight (dwt)", 1], ["Troy ounces", 2]], 0),
      currencyField("spotPrice", "Gold Spot Price per Troy Ounce", { default: 4000, max: 100000, step: 1 }),
      percentField("payoutPercent", "Buyer Payout (% of Melt Value)", { default: 80, max: 100, step: 1 }),
    ],
    calcResult: { label: "Purity", format: "percentage" },
    calcResults: [
      { key: "purityPercent", label: "Gold Purity", format: "percentage", highlight: true },
      { key: "fineness", label: "Fineness (Parts per 1,000)", format: "number" },
      { key: "pureGoldGrams", label: "Pure Gold Content (g)", format: "number", decimals: 3 },
      { key: "meltValue", label: "Melt Value", format: "currency" },
      { key: "valuePerGram", label: "Value per Gram", format: "currency" },
      { key: "buyerOffer", label: "Likely Buyer Offer", format: "currency" },
    ],
    instructions: "Enter the karat (from the stamp, or any value like 21K), the item's weight and today's gold spot price. The calculator converts the karat to purity and fineness and values the gold inside.",
    examples: "Example: 14K is 58.33% gold — a fineness of 583. A 10 g 14K chain holds 5.833 g of pure gold, worth $750.18 at a $4,000 spot price.",
    assumptions: "Purity = karat ÷ 24. In practice 14K is often made at 58.5% (stamped 585) rather than the exact 58.3%, and 24K is 99.9%. " + SPOT_NOTE,
    faq: [
      { question: "What does karat mean for gold?", answer: "Karat measures purity in 24ths: 24K is pure gold, 18K is 18/24 (75%) gold, 14K is 14/24 (about 58%)." },
      { question: "How do I convert karats to percent?", answer: "Divide the karat by 24 and multiply by 100. For example, 10K ÷ 24 = 41.7%." },
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
