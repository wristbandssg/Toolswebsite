// One-time (but safe to re-run) batch setup script: creates the 2 new tools of
// the user's boat list (Shopping Calculators > Vehicle, Resale & Collectibles;
// originally a separate "Boat Calculators" sub-category, merged 15 Oct 2026 by
// prisma/merge-shopping-boat-buying-into-vehicle.ts). The other
// two names on the list already exist and were NOT moved:
//   Boat Insurance Calculator        -> boat-insurance-calculator (Auto & Vehicle Insurance)
//   Boat Cost Of Ownership Calculator -> boat-total-cost-of-ownership-calculator (Car Ownership, Fuel & EV Cost)
//
// The empty "Shopping Calculators" main category was deleted on 14 Oct 2026 by
// cleanup-structure-and-duplicates.ts (with a 301 to /calculators/). This
// script re-creates it and removes that redirect so the category URL works.
//
// See src/lib/calc-engine-shopping-boats.ts for the math and how the
// near-namesake tools are deliberately differentiated.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-boats-calculators.ts
// or
//   npm run db:create-shopping-boats-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Vehicle, Resale & Collectibles Calculators", slug: "vehicle-resale-collectibles-calculators" };

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

const BOAT_TYPES: [string, number][] = [
  ["Fishing / bass boat", 0],
  ["Pontoon", 1],
  ["Bowrider / runabout / ski boat", 2],
  ["Center console", 3],
  ["Cabin cruiser / motor yacht", 4],
  ["Sailboat", 5],
  ["Personal watercraft (jet ski)", 6],
];

const RATES_NOTE =
  "Yearly value loss used (first year / years 2–10 / after year 10): fishing & bass 15/7/4%, pontoon 18/8/4%, " +
  "bowrider & ski boat 18/8/4%, center console 12/6/3%, cabin cruiser & yacht 20/8/5%, sailboat 10/5/3%, jet ski 20/10/6%. " +
  "These are typical figures from used-boat price guides; well-known brands and boats in short supply often hold value better.";

const DISCLAIMER =
  "This is an estimate for planning only, not an appraisal. A marine survey and local sale listings for the same make, model and year give the real price.";

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

const TOOLS: ToolDef[] = [
  {
    slug: "boat-value-calculator",
    title: "Boat Value Calculator",
    description: "Estimate what a used boat is worth today from its new price, age, type, condition and engine hours — with private-sale, trade-in and dealer prices.",
    metaTitle: "Boat Value Calculator — Used Boat Worth",
    metaDescription: "Free boat value calculator. Estimate a used boat's private-sale, trade-in and dealer price from its age, type, condition, engine hours and extras.",
    calcInputs: [
      currencyField("newPrice", "Original Price When New (Boat & Engine)", { default: 60000, max: 10000000, step: 500 }),
      numberField("age", "Boat Age", { unit: "years", default: 5, max: 60 }),
      dropdown("boatType", "Boat Type", BOAT_TYPES, 2),
      dropdown("condition", "Condition", [["Excellent", 0], ["Good", 1], ["Fair", 2], ["Poor", 3]], 1),
      numberField("engineHours", "Engine Hours", { unit: "hours", default: 300, max: 20000, step: 10 }),
      currencyField("upgradesValue", "Added Electronics & Upgrades (What You Paid)", { default: 3000, max: 1000000, step: 100, required: false }),
      currencyField("trailerValue", "Trailer Value (If Included)", { default: 4000, max: 200000, step: 100, required: false }),
    ],
    calcResult: { label: "Private-Sale Value", format: "currency" },
    calcResults: [
      { key: "privatePartyValue", label: "Private-Sale Value", format: "currency", highlight: true },
      { key: "tradeInValue", label: "Trade-In Value (Dealer Pays You)", format: "currency" },
      { key: "dealerRetailValue", label: "Dealer Retail Price", format: "currency" },
      { key: "ageOnlyValue", label: "Value From Age Alone (Before Adjustments)", format: "currency" },
      { key: "percentOfNewPrice", label: "Boat Value as % of New Price", format: "percentage" },
      { key: "normalEngineHours", label: "Normal Engine Hours for This Age", format: "number" },
    ],
    instructions:
      "Enter what the boat and engine cost new (check the original bill of sale or the model's launch price), its age and type, and pick the condition that honestly fits.\n\n" +
      "Add the engine hours from the meter, what was spent on electronics or other upgrades, and the trailer's value if it's part of the sale.",
    examples:
      "Example: a 5-year-old bowrider that cost $60,000 new keeps about 59% of its price from age alone — $35,246.53. In good condition with 300 hours " +
      "(a little above the normal 250), the boat is worth $34,541.60. Add half of $3,000 in upgrades and a $4,000 trailer and the private-sale value is $40,041.60. " +
      "A dealer would offer about $32,033.28 on trade-in and ask about $46,047.84 on the lot.",
    assumptions:
      RATES_NOTE + "\n\n" +
      "Condition changes value by +10% (excellent), 0 (good), −15% (fair) or −35% (poor). Normal use is 50 engine hours a year; value moves 10% for each 100% the hours are above or below normal, " +
      "held between −25% and +10%. Upgrades get back 50% of what was paid. Trade-in is 80% and dealer retail 115% of the private-sale value. " + DISCLAIMER,
    faq: [
      { question: "How do I find the value of my boat?", answer: "Start from the new price, take off yearly depreciation for its type and age, then adjust for condition, engine hours and extras. This calculator does those steps; compare the answer with local listings for the same model." },
      { question: "How many engine hours are too many?", answer: "About 50 hours a year is normal for a recreational boat. A well-kept outboard often runs 1,500–2,000 hours and a diesel inboard 5,000 or more, so hours matter most when they are high for the engine type." },
      { question: "Why is the trade-in value lower?", answer: "A dealer has to clean, store, insure and resell the boat at a profit, so they usually offer about 20% less than a private buyer would pay." },
      { question: "Do upgrades add to a boat's value?", answer: "Some. Buyers rarely pay full price for added electronics or canvas, so only about half of what you spent is counted." },
    ],
  },
  {
    slug: "boat-depreciation-calculator",
    title: "Boat Depreciation Calculator",
    description: "See how much value a boat will lose while you own it — the resale value when you sell, total and yearly depreciation, and the cost per hour on the water.",
    metaTitle: "Boat Depreciation Calculator — Resale Value",
    metaDescription: "Free boat depreciation calculator. Find a new or used boat's resale value after the years you keep it, the yearly loss and depreciation per hour.",
    calcInputs: [
      currencyField("purchasePrice", "Purchase Price", { default: 45000, max: 10000000, step: 500 }),
      numberField("ageAtPurchase", "Boat Age When Bought (0 = New)", { unit: "years", default: 0, max: 60 }),
      numberField("yearsOwned", "Years You Plan to Keep It", { unit: "years", default: 7, min: 1, max: 40 }),
      dropdown("boatType", "Boat Type", BOAT_TYPES, 0),
      numberField("hoursPerYear", "Hours Used per Year", { unit: "hours", default: 60, max: 2000, step: 5, required: false }),
    ],
    calcResult: { label: "Resale Value When You Sell", format: "currency" },
    calcResults: [
      { key: "valueAtSale", label: "Resale Value When You Sell", format: "currency", highlight: true },
      { key: "totalDepreciation", label: "Total Depreciation", format: "currency" },
      { key: "percentLost", label: "Share of Price Lost", format: "percentage" },
      { key: "averageYearlyDepreciation", label: "Average Depreciation per Year", format: "currency" },
      { key: "firstYearDepreciation", label: "Depreciation in Your First Year", format: "currency" },
      { key: "depreciationPerHour", label: "Depreciation per Hour on the Water", format: "currency" },
    ],
    instructions:
      "Enter what you paid (or will pay), how old the boat is now — 0 for a new boat — and how many years you expect to keep it.\n\n" +
      "Pick the boat type and, to see the cost of each outing, the hours you use it a year.",
    examples:
      "Example: a new $45,000 fishing boat kept 7 years loses 15% in year one ($6,750) and 7% a year after that. It is worth about $24,747.37 when sold — " +
      "$20,252.63 or 45% lost, $2,893.23 a year. At 60 hours a year, depreciation costs $48.22 for every hour on the water.\n\n" +
      "Buying used avoids the big first-year drop: a 4-year-old $30,000 pontoon kept 8 years loses only 8% ($2,400) in your first year and is worth about $16,764.50 at the end.",
    assumptions:
      RATES_NOTE + "\n\n" +
      "A used boat follows the same curve from its current age, so its first year with you uses the later, lower rate. " + DISCLAIMER,
    faq: [
      { question: "How fast do boats depreciate?", answer: "Most new boats lose 10–20% in the first year and about 5–10% a year after that, slowing once they are around 10 years old. Sailboats and center consoles usually hold value best; jet skis and cruisers lose it fastest." },
      { question: "Is it better to buy a new or used boat?", answer: "A boat 3–5 years old has already taken the steepest drop, so you lose much less each year. A new boat costs more in depreciation but comes with a warranty and no unknown history." },
      { question: "Can I deduct boat depreciation on my taxes?", answer: "Only if the boat is used for business, such as charters. US business boats are generally 10-year MACRS property; personal boats can't be depreciated for tax." },
      { question: "How can I slow my boat's depreciation?", answer: "Keep service records, store it covered, keep engine hours reasonable and choose a popular brand and model that buyers look for." },
    ],
  },
];

async function ensureCategories() {
  let main = await prisma.toolCategory.findUnique({ where: { slug: MAIN_CATEGORY.slug } });
  if (!main) {
    console.log(`Creating main category "${MAIN_CATEGORY.name}".`);
    main = await prisma.toolCategory.create({
      data: { ...MAIN_CATEGORY, parentId: null, templateKey: "category-template-1", viewStyle: "grid" },
    });
  }
  // The 14 Oct clean-up redirected the deleted category; the URL is live again.
  const gone = await prisma.redirect.deleteMany({ where: { fromPath: { startsWith: `/${MAIN_CATEGORY.slug}` } } });
  if (gone.count) console.log(`Removed ${gone.count} redirect(s) from /${MAIN_CATEGORY.slug}.`);

  const existing = await prisma.toolCategory.findUnique({ where: { slug: CATEGORY.slug } });
  if (existing) return existing;
  console.log(`Creating sub-category "${CATEGORY.name}" under "${main.name}".`);
  return prisma.toolCategory.create({
    data: { name: CATEGORY.name, slug: CATEGORY.slug, parentId: main.id, templateKey: "category-template-1", viewStyle: "grid" },
  });
}

async function main() {
  const category = await ensureCategories();

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
