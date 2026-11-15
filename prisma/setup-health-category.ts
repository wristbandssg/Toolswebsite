// Health Calculators (15 Nov 2026). The user said "catagory make kore tool make koro … ata ami bolte
// paretchi na" (make a category and build the tools; I can't decide where), for the 226 pregnancy,
// period, sleep and medical keywords the general keyword check couldn't place
// (Claude outputs/General_Keyword_Check.md, section E). This creates a new main category with 2
// sub-categories. Existing fitness/body tools (BMI, body fat, TDEE…) are NOT moved.
//
// HOW TO RUN
//   npx tsx prisma/setup-health-category.ts            (report only)
//   npx tsx prisma/setup-health-category.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const would = APPLY ? "" : "Would ";

export const HEALTH_MAIN = { name: "Health Calculators", slug: "health-calculators", breadcrumbName: "Health" };
export const HEALTH_SUBCATEGORIES: { name: string; slug: string }[] = [
  { name: "Pregnancy & Fertility Calculators", slug: "pregnancy-fertility-calculators" },
  { name: "Sleep & Medical Calculators", slug: "sleep-medical-calculators" },
];

async function main() {
  console.log(APPLY ? "=== APPLY MODE — changes WILL be made ===" : "=== REPORT MODE — nothing will be changed ===");
  let main = await prisma.toolCategory.findUnique({ where: { slug: HEALTH_MAIN.slug } });
  if (!main) {
    console.log(`${would}create main category "${HEALTH_MAIN.name}"`);
    if (APPLY) main = await prisma.toolCategory.create({ data: { ...HEALTH_MAIN, parentId: null, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  for (const sub of HEALTH_SUBCATEGORIES) {
    const found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (!found) {
      console.log(`${would}create "${sub.name}"`);
      if (APPLY) await prisma.toolCategory.create({ data: { ...sub, parentId: main!.id, templateKey: "category-template-1", viewStyle: "grid" } });
    } else if (!main || found.parentId !== main.id || found.name !== sub.name) {
      console.log(`${would}move "${found.name}" under Health as "${sub.name}"`);
      if (APPLY) await prisma.toolCategory.update({ where: { id: found.id }, data: { name: sub.name, parentId: main!.id } });
    }
  }
  console.log("Done.");
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
