// One-time (but safe to re-run) batch setup script: creates 6 cleaning cost tools
// from the user's shopping list (Shopping Calculators > Home Improvement Cost & Sizing Calculators).
// See src/lib/calc-engine-shopping-home-cost-cleaning.ts for the math and how near-namesake
// tools are kept distinct.
//
// HOW TO RUN
//   npx tsx prisma/create-shopping-home-cost-cleaning-calculators.ts
// or
//   npm run db:create-shopping-home-cost-cleaning-calculators

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORY = { name: "Shopping Calculators", slug: "shopping-calculators", breadcrumbName: "Shopping" };
const CATEGORY = { name: "Home Improvement Cost & Sizing Calculators", slug: "home-improvement-cost-sizing-calculators" };

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

const REGION_NOTE = "Prices are 2026 US national averages; use the regional factor (for example 120% in high-cost metros or 85% in low-cost areas) and get at least three quotes.";

const TOOLS: ToolDef[] = [
  {
    slug: "house-cleaning-cost-calculator",
    title: "House Cleaning Cost Calculator",
    description: "Estimate house cleaning cost by home size — standard, deep or heavy cleaning — with pets and clutter and extras like ovens and fridges.",
    metaTitle: "House Cleaning Cost Calculator — 2026 Prices",
    metaDescription: "Free house cleaning cost calculator. Estimate house cleaning cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Home Size", { unit: "sq ft", default: 2000, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Standard cleaning", 0], ["Deep cleaning", 1], ["Move-in / heavy cleaning", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Tidy home", 1], ["Pets or kids", 1.15], ["Very cluttered", 1.3]], 1),
      currencyField("fixedCosts", "Extras (Oven, Fridge, Windows)", { default: 60, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the home size and choose the option you want. Then pick the job complexity and include extras (oven, fridge, windows).\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the deep cleaning option (pets or kids) comes to about $460.00 — $0.23 per sq ft including extras — with typical quotes between $391.00 and $552.00.",
    assumptions: "Typical 2026 prices: standard cleans $0.08–$0.12, deep cleans $0.15–$0.25 per sq ft, or $40–$70 an hour per cleaner. Weekly or biweekly service is often 10–20% cheaper per visit than one-off cleans." + " " + REGION_NOTE,
    faq: [
      { question: "How much does house cleaning cost?", answer: "About $150–$250 for a standard clean of a 2,000 sq ft home; deep cleans cost $300–$500." },
      { question: "How much should I tip house cleaners?", answer: "Around 15–20% for one-off cleans, or an extra visit's pay at the holidays for regular service." },
    ],
  },
  {
    slug: "move-out-cleaning-cost-calculator",
    title: "Move Out Cleaning Cost Calculator",
    description: "Estimate move-out cleaning cost by home size and cleaning level — with condition and carpet shampooing — to get your deposit back.",
    metaTitle: "Move Out Cleaning Cost Calculator — 2026 Prices",
    metaDescription: "Free move out cleaning cost calculator. Estimate move out cleaning cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Home Size", { unit: "sq ft", default: 1200, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Basic move-out clean", 0], ["Standard (inside cabinets & appliances)", 1], ["Deep (walls, baseboards, windows)", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Lightly used", 1], ["Average", 1.2], ["Very dirty", 1.5]], 1),
      currencyField("fixedCosts", "Carpet Shampoo", { default: 150, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the home size and choose the option you want. Then pick the job complexity and include carpet shampoo.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,200 sq ft with the standard (inside cabinets & appliances) option (average) comes to about $510.00 — $0.43 per sq ft including extras — with typical quotes between $433.50 and $612.00.",
    assumptions: "Typical 2026 prices: $0.20–$0.40 per sq ft, or $250–$500 for a typical apartment. Landlords look at appliances, bathrooms, baseboards and floors. Compare with the cleaning fee deducted from deposits." + " " + REGION_NOTE,
    faq: [
      { question: "How much does move-out cleaning cost?", answer: "Usually $250–$500 for an apartment and $400–$800 for a house." },
      { question: "Is a move-out clean worth it?", answer: "Usually yes — it costs less than most deposit deductions for cleaning." },
    ],
  },
  {
    slug: "carpet-cleaning-cost-calculator",
    title: "Carpet Cleaning Cost Calculator",
    description: "Estimate professional carpet cleaning cost by area — dry cleaning, hot water extraction or deep pet and stain treatment — with soil level.",
    metaTitle: "Carpet Cleaning Cost Calculator — 2026 Prices",
    metaDescription: "Free carpet cleaning cost calculator. Estimate carpet cleaning cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Carpet Area", { unit: "sq ft", default: 800, max: 10000, step: 1 }),
      dropdown("tier", "Option", [["Dry / encapsulation", 0], ["Hot water extraction (steam)", 1], ["Deep clean with stain & pet treatment", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Light soil", 1], ["Heavy traffic", 1.15], ["Pet urine / heavy stains", 1.3]], 1),
      currencyField("fixedCosts", "Trip Fee / Minimum", { default: 75, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the carpet area and choose the option you want. Then pick the job complexity and include trip fee / minimum.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 800 sq ft with the hot water extraction (steam) option (heavy traffic) comes to about $355.00 — $0.44 per sq ft including extras — with typical quotes between $301.75 and $426.00.",
    assumptions: "Typical 2026 prices: $0.25–$0.50 per sq ft or $40–$75 per room, often with a $100–$150 minimum. Stairs cost $3–$5 per step. Most manufacturers recommend hot water extraction every 12–18 months." + " " + REGION_NOTE,
    faq: [
      { question: "How much does carpet cleaning cost?", answer: "About $25–$75 per room or $0.25–$0.50 per square foot." },
      { question: "How often should carpets be cleaned?", answer: "Every 12–18 months, more often with pets, kids or allergies." },
    ],
  },
  {
    slug: "pressure-washing-cost-calculator",
    title: "Pressure Washing Cost Calculator",
    description: "Estimate pressure washing cost by area — driveways and concrete, house soft washing, or decks and fences with sealing — with height and staining.",
    metaTitle: "Pressure Washing Cost Calculator — 2026 Prices",
    metaDescription: "Free pressure washing cost calculator. Estimate pressure washing cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Area to Wash", { unit: "sq ft", default: 1500, max: 50000, step: 1 }),
      dropdown("tier", "Option", [["Driveway / concrete", 0], ["House siding (soft wash)", 1], ["Deck or fence with sealing", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Ground level", 1], ["Two stories", 1.15], ["Heavy mold / stains", 1.3]], 1),
      currencyField("fixedCosts", "Trip Fee", { default: 75, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the area to wash and choose the option you want. Then pick the job complexity and include trip fee.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 1,500 sq ft with the house siding (soft wash) option (two stories) comes to about $675.00 — $0.45 per sq ft including extras — with typical quotes between $573.75 and $810.00.",
    assumptions: "Typical 2026 prices: $0.15–$0.35 per sq ft for concrete, $0.25–$0.50 for house washing and $0.75–$1.50 with deck sealing. Soft washing uses low pressure and cleaners to avoid damaging siding." + " " + REGION_NOTE,
    faq: [
      { question: "How much does pressure washing cost?", answer: "About $0.15–$0.50 per square foot; a typical driveway costs $150–$300." },
      { question: "Should siding be pressure washed?", answer: "Most siding should be soft washed at low pressure to avoid forcing water behind it." },
    ],
  },
  {
    slug: "window-cleaning-cost-calculator",
    title: "Window Cleaning Cost Calculator",
    description: "Estimate window cleaning cost by the number of windows — exterior only, inside and out, or with screens and tracks — by building height.",
    metaTitle: "Window Cleaning Cost Calculator — 2026 Prices",
    metaDescription: "Free window cleaning cost calculator. Estimate window cleaning cost by window and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Number of Windows", { unit: "windows", default: 20, max: 500, step: 0.5 }),
      dropdown("tier", "Option", [["Exterior only", 0], ["Interior & exterior", 1], ["Inside, outside, screens & tracks", 2]], 1),
      dropdown("complexity", "Job Complexity", [["One story", 1], ["Two stories", 1.25], ["Three+ stories / ladders", 1.5]], 1),
      currencyField("fixedCosts", "Trip Fee", { default: 50, max: 1000000, step: 10, required: false }),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Window (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the number of windows and choose the option you want. Then pick the job complexity and include trip fee.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 20 windows with the interior & exterior option (two stories) comes to about $250.00 — $12.50 per window including extras — with typical quotes between $212.50 and $300.00.",
    assumptions: "Typical 2026 prices: $5–$10 per window outside only, $8–$15 inside and out, more for screens, tracks and upper floors. Many companies charge per pane or have a $150–$200 minimum." + " " + REGION_NOTE,
    faq: [
      { question: "How much does window cleaning cost?", answer: "About $8–$15 per window for inside and outside cleaning, or $200–$400 for a typical home." },
      { question: "How often should windows be cleaned?", answer: "Twice a year for most homes, more often near the coast or busy roads." },
    ],
  },
  {
    slug: "strip-and-wax-cost-calculator",
    title: "Strip and Wax Cost Calculator",
    description: "Estimate floor strip and wax cost for VCT and commercial floors by area — buff and recoat, standard strip and wax, or deep scrub with high-gloss coats.",
    metaTitle: "Strip and Wax Cost Calculator — 2026 Prices",
    metaDescription: "Free strip and wax cost calculator. Estimate strip and wax cost by sq ft and option, with labor, extras and a low-high price range.",
    calcInputs: [
      numberField("quantity", "Floor Area", { unit: "sq ft", default: 2000, max: 100000, step: 1 }),
      dropdown("tier", "Option", [["Buff & recoat", 0], ["Strip & wax (4 coats)", 1], ["Deep scrub, strip & 6 coats high-gloss", 2]], 1),
      dropdown("complexity", "Job Complexity", [["Open floor", 1], ["Furniture to move", 1.1], ["Heavy build-up / damage", 1.25]], 1),
      percentField("regionFactor", "Regional Cost Factor (100 = US Average)", { default: 100, min: 50, max: 200, step: 5 }),
    ],
    calcResult: { label: "Total Cost", format: "currency" },
    calcResults: [
      { key: "totalCost", label: "Estimated Total Cost", format: "currency", highlight: true },
      { key: "materialCost", label: "Materials", format: "currency" },
      { key: "laborCost", label: "Labor", format: "currency" },
      { key: "extrasCost", label: "Removal & Other Costs", format: "currency" },
      { key: "costPerUnit", label: "Cost per Sq ft (All-In)", format: "currency" },
      { key: "lowEstimate", label: "Low Estimate", format: "currency" },
      { key: "highEstimate", label: "High Estimate", format: "currency" },
    ],
    instructions: "Enter the floor area and choose the option you want. Then pick the job complexity.\n\nSet the regional factor for your area — labor costs vary a lot between cities and rural areas.",
    examples: "Example: 2,000 sq ft with the strip & wax (4 coats) option (furniture to move) comes to about $1,000.00 — $0.50 per sq ft including extras — with typical quotes between $850.00 and $1,200.00.",
    assumptions: "Typical 2026 commercial prices: buffing $0.15–$0.25, strip and wax $0.40–$0.70, deep scrub and high-gloss $0.60–$1 per sq ft. Busy floors need stripping and waxing every 6–12 months and buffing more often." + " " + REGION_NOTE,
    faq: [
      { question: "How much does it cost to strip and wax a floor?", answer: "About $0.40–$0.70 per square foot for a standard strip and four coats of finish." },
      { question: "How often should VCT floors be stripped and waxed?", answer: "Every 6–12 months for busy areas, with regular buffing or burnishing in between." },
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
