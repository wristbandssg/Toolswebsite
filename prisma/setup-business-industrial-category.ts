// Business & Industrial Calculators (4 Nov 2026, user request: "Business Industrial Calculator" is
// the only main category for the 561-keyword list, at most 10 sub-categories). Keyword check:
// Claude outputs/Business_Industrial_Keyword_Check.md (316 new tools, 9 flat sub-categories).
//   1. Creates the main category and its 9 sub-categories.
//   2. Moves existing B2B tools whose main intent belongs here (their owning create-*.ts scripts
//      read BIZ_IND_MOVES too, so re-running them keeps the tools in place).
//
// HOW TO RUN
//   npx tsx prisma/setup-business-industrial-category.ts            (report only)
//   npx tsx prisma/setup-business-industrial-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const BIZ_IND_MAIN = { name: "Business & Industrial Calculators", slug: "business-industrial-calculators", breadcrumbName: "Business & Industrial" };

export const BIZ_IND_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Concrete & Masonry Calculators", slug: "concrete-masonry-calculators" },
  { name: "Landscaping, Aggregate & Paving Calculators", slug: "landscaping-aggregate-paving-calculators" },
  { name: "Construction Materials & Estimating Calculators", slug: "construction-materials-estimating-calculators" },
  { name: "Shipping, Postage & Ecommerce Calculators", slug: "shipping-postage-ecommerce-calculators" },
  { name: "Freight, Logistics & Warehouse Calculators", slug: "freight-logistics-warehouse-calculators" },
  { name: "Energy, Solar & Electrical Calculators", slug: "energy-solar-electrical-calculators" },
  { name: "Manufacturing, Metals & Engineering Calculators", slug: "manufacturing-metals-engineering-calculators" },
  { name: "HR, Marketing & Business Operations Calculators", slug: "hr-marketing-business-operations-calculators" },
  { name: "Agriculture & Livestock Calculators", slug: "agriculture-livestock-calculators" },
];

/** Existing tools that move in: slug → sub-category slug. Owning scripts import this map. */
export const BIZ_IND_MOVES: Record<string, string> = {
  "freight-class-calculator": "freight-logistics-warehouse-calculators",
  "freight-shipping-cost-calculator": "freight-logistics-warehouse-calculators",
  "pallet-shipping-cost-calculator": "freight-logistics-warehouse-calculators",
  "air-freight-cost-calculator": "freight-logistics-warehouse-calculators",
  "container-shipping-cost-calculator": "freight-logistics-warehouse-calculators",
  "container-load-calculator": "freight-logistics-warehouse-calculators",
  "cbm-calculator": "freight-logistics-warehouse-calculators",
  "heavy-equipment-shipping-cost-calculator": "freight-logistics-warehouse-calculators",
  "scrap-metal-value-calculator": "manufacturing-metals-engineering-calculators",
  "labor-cost-calculator": "hr-marketing-business-operations-calculators",
  "employee-cost-calculator": "hr-marketing-business-operations-calculators",
  "fte-calculator": "hr-marketing-business-operations-calculators",
  "turnover-rate-calculator": "hr-marketing-business-operations-calculators",
  "bradford-factor-calculator": "hr-marketing-business-operations-calculators",
  "absence-percentage-calculator": "hr-marketing-business-operations-calculators",
};

/** For owning create-*.ts scripts: the moved-to category id for a slug, if it has been moved. */
export async function bizIndMovedCategoryId(client: PrismaClient, slug: string): Promise<string | undefined> {
  const target = BIZ_IND_MOVES[slug];
  if (!target) return undefined;
  const cat = await client.toolCategory.findUnique({ where: { slug: target }, select: { id: true } });
  return cat?.id;
}

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: BIZ_IND_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${BIZ_IND_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...BIZ_IND_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  const subIds = new Map<string, string>();
  for (const sub of BIZ_IND_SUBCATEGORIES) {
    let found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Business & Industrial as "${sub.name}"`);
      if (APPLY) found = await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
    if (found) subIds.set(sub.slug, found.id);
  }
  for (const [slug, subSlug] of Object.entries(BIZ_IND_MOVES)) {
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

// Only run when executed directly (owning create-*.ts scripts import BIZ_IND_MOVES from here).
if (process.argv[1]?.replace(/\\/g, "/").endsWith("setup-business-industrial-category.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
