// New sub-categories for the 3,000-idea build (16 Nov 2026 — Claude outputs/New_Tool_Ideas_3000.md).
// Health: Heart & Blood, Body & Wellness. Finance > Tax: four regional tax & salary groups.
// (The clinical Health groups — lab values and medication dosing — are not created: the user's
// standing rule is to skip prescriber-only tools until they confirm.)
//
// HOW TO RUN
//   npx tsx prisma/setup-ideas-categories.ts            (report only)
//   npx tsx prisma/setup-ideas-categories.ts --apply    (make the changes)
// Safe to re-run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

export const IDEA_SUBCATEGORIES: { parent: string; name: string; slug: string }[] = [
  { parent: "health-calculators", name: "Heart & Blood Calculators", slug: "heart-blood-calculators" },
  { parent: "health-calculators", name: "Body & Wellness Calculators", slug: "body-wellness-calculators" },
  { parent: "tax-calculators", name: "Middle East (GCC) Tax & Salary Calculators", slug: "middle-east-gcc-tax-salary-calculators" },
  { parent: "tax-calculators", name: "Europe Tax & Salary Calculators", slug: "europe-tax-salary-calculators" },
  { parent: "tax-calculators", name: "Asia Tax & Salary Calculators", slug: "asia-tax-salary-calculators" },
  { parent: "tax-calculators", name: "Latin America & Africa Tax & Salary Calculators", slug: "latin-america-africa-tax-salary-calculators" },
];

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== REPORT MODE — nothing will be changed ===");
  for (const sub of IDEA_SUBCATEGORIES) {
    const parent = await prisma.toolCategory.findUnique({ where: { slug: sub.parent } });
    if (!parent) throw new Error(`Parent category "${sub.parent}" not found`);
    const found = await prisma.toolCategory.findUnique({ where: { slug: sub.slug } });
    if (found) { console.log(`exists: ${sub.name}`); continue; }
    console.log(`${APPLY ? "" : "Would "}create "${sub.name}" under ${parent.name}`);
    if (APPLY) await prisma.toolCategory.create({ data: { name: sub.name, slug: sub.slug, parentId: parent.id, templateKey: "category-template-1", viewStyle: "grid" } });
  }
  console.log("Done.");
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
