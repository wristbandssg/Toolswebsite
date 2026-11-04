// Pets & Animals Calculators (4 Nov 2026, user request: "Pets & Animals Calculator" is the only main
// category for the 227-keyword list, at most 10 sub-categories; the user then asked to fold the
// 12-tool Breeding and 8-tool Costs groups into larger ones). Keyword check:
// Claude outputs/Pets_Animals_Keyword_Check.md (118 new tools, 5 flat sub-categories).
//   1. Creates the main category and its 5 sub-categories.
//   2. Moves existing horse-care and pet-cost tools whose main intent belongs here (their owning
//      create-*.ts scripts read PETS_MOVES too, so re-running them keeps the tools in place).
//
// HOW TO RUN
//   npx tsx prisma/setup-pets-animals-category.ts            (report only)
//   npx tsx prisma/setup-pets-animals-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const PETS_MAIN = { name: "Pets & Animals Calculators", slug: "pets-animals-calculators", breadcrumbName: "Pets & Animals" };

export const PETS_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Pet Age, Growth & Breeding Calculators", slug: "pet-age-growth-breeding-calculators" },
  { name: "Pet Food, Care & Cost Calculators", slug: "pet-food-care-cost-calculators" },
  { name: "Pet Medication Dosage Calculators", slug: "pet-medication-dosage-calculators" },
  { name: "Vet Clinical & Toxicity Calculators", slug: "vet-clinical-toxicity-calculators" },
  { name: "Aquarium, Reptile & Small Pet Calculators", slug: "aquarium-reptile-small-pet-calculators" },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const PETS_MOVES: Record<string, string> = {
  "horse-gestation-calculator": "pet-age-growth-breeding-calculators",
  "horse-heat-cycle-calculator": "pet-age-growth-breeding-calculators",
  "horse-color-calculator": "pet-age-growth-breeding-calculators",
  "horse-years-to-human-years-calculator": "pet-age-growth-breeding-calculators",
  "horse-weight-calculator": "pet-age-growth-breeding-calculators",
  "horse-height-calculator": "pet-age-growth-breeding-calculators",
  "horse-calorie-calculator": "pet-food-care-cost-calculators",
  "horse-feed-calculator": "pet-food-care-cost-calculators",
  "horse-forage-calculator": "pet-food-care-cost-calculators",
  "pet-ownership-cost-budget-calculator": "pet-food-care-cost-calculators",
  "pet-insurance-calculator": "pet-food-care-cost-calculators",
  "pet-wellness-plan-vs-insurance-calculator": "pet-food-care-cost-calculators",
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function petsMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = PETS_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: PETS_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${PETS_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...PETS_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of PETS_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Pets & Animals as "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  for (const [slug, subSlug] of Object.entries(PETS_MOVES)) {
    const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, title: true, categoryId: true } });
    if (!tool) {
      console.log(`  (skip) ${slug} not found`);
      continue;
    }
    const target = subIds.get(subSlug);
    if (target && tool.categoryId === target) continue;
    console.log(`${would}move "${tool.title}" → ${subSlug}`);
    if (APPLY && target) await prisma.tool.update({ where: { id: tool.id }, data: { categoryId: target } });
  }
}

// Only run when executed directly (owning create-*.ts scripts import PETS_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-pets-animals-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
