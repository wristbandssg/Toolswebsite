// Science Calculators (9 Nov 2026, user request: "Science calculator" is the only main category for
// the 5,593-keyword list, sent in 5 parts). Keyword check: Claude outputs/Science_Keyword_Check.md
// (756 new tools, 19 existing tools moved in). The user then asked for no child sub-categories —
// just the main category and its 10 sub-categories.
//   1. Creates the main category and its 10 sub-categories.
//   2. Moves 19 existing science / engineering tools in. Their owning create-*.ts scripts read
//      SCI_MOVES too, so re-running them keeps the tools in place.
//
// HOW TO RUN
//   npx tsx prisma/setup-science-category.ts            (report only)
//   npx tsx prisma/setup-science-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const SCI_MAIN = { name: "Science Calculators", slug: "science-calculators", breadcrumbName: "Science" };

export const SCI_CALC = "scientific-graphing-calculators";
export const SCI_MATH = "math-calculators";
export const SCI_STAT = "statistics-probability-calculators";
export const SCI_PHYS = "physics-calculators";
export const SCI_CHEM = "chemistry-calculators";
export const SCI_BIO = "biology-lab-calculators";
export const SCI_EE = "electrical-electronics-engineering-calculators";
export const SCI_ME = "mechanical-structural-engineering-calculators";
export const SCI_ASTRO = "astronomy-space-calculators";
export const SCI_EARTH = "earth-weather-environment-calculators";

export const SCI_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Scientific & Graphing Calculators", slug: SCI_CALC },
  { name: "Math Calculators", slug: SCI_MATH },
  { name: "Statistics & Probability Calculators", slug: SCI_STAT },
  { name: "Physics Calculators", slug: SCI_PHYS },
  { name: "Chemistry Calculators", slug: SCI_CHEM },
  { name: "Biology & Lab Calculators", slug: SCI_BIO },
  { name: "Electrical & Electronics Engineering Calculators", slug: SCI_EE },
  { name: "Mechanical & Structural Engineering Calculators", slug: SCI_ME },
  { name: "Astronomy & Space Calculators", slug: SCI_ASTRO },
  { name: "Earth, Weather & Environment Calculators", slug: SCI_EARTH },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const SCI_MOVES: Record<string, string> = {
  "margin-of-error-calculator": SCI_STAT,
  "kw-calculator": SCI_EE,
  "three-phase-power-calculator": SCI_EE,
  "line-to-line-fault-calculator": SCI_EE,
  "led-resistor-calculator": SCI_EE,
  "smd-resistor-code-calculator": SCI_EE,
  "beam-load-calculator": SCI_ME,
  "pipe-flow-calculator": SCI_ME,
  "pipe-pressure-drop-calculator": SCI_ME,
  "orifice-flow-calculator": SCI_ME,
  "drag-coefficient-calculator": SCI_ME,
  "compression-spring-calculator": SCI_ME,
  "bearing-life-calculator": SCI_ME,
  "o-ring-calculator": SCI_ME,
  "centrifuge-rpm-rcf-calculator": SCI_BIO,
  "g-force-calculator": SCI_PHYS,
  "wind-chill-calculator": SCI_EARTH,
  "density-altitude-calculator": SCI_EARTH,
  "wing-loading-calculator": SCI_EARTH,
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function sciMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = SCI_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: SCI_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${SCI_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...SCI_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of SCI_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  let moved = 0;
  for (const [slug, subSlug] of Object.entries(SCI_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, categoryId: true } });
    if (!tool) {
      console.log(`  (skip) ${slug} not found`);
      continue;
    }
    const target = subIds.get(subSlug);
    if (target && tool.categoryId === target) continue;
    moved++;
    if (APPLY && target) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target } });
  }
  console.log(`${would}move ${moved} tool(s)`);
}

// Only run when executed directly (owning create-*.ts scripts import SCI_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-science-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
