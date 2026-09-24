// One-time (but safe to re-run) migration: makes "Finance Calculators" the
// single top-level umbrella category and turns every OTHER existing
// top-level Tool Category into a sub-category underneath it — Australia,
// Canada, Hong Kong, India, Malaysia, New Zealand, Pakistan, Philippines,
// Singapore, South Africa, Tax & Paycheck Calculators, UK, and any other
// top-level category that exists at run time.
//
// WHY THIS EXISTS
// ----------------
// ToolCategory already supports one level of sub-categories (parentId —
// see schema.prisma), and the admin can create a NEW category as a
// sub-category from the start ("+ Sub-Category" in /admin/tools/categories).
// But there was no way to take a category that ALREADY exists as top-level
// and re-file it under another one — the rename endpoint
// (PUT /api/tool-categories/[id]) didn't accept parentId at all. That gap
// is fixed alongside this script (see the same commit's changes to
// src/app/api/tool-categories/[id]/route.ts and
// src/components/admin/ToolCategoriesManager.tsx, which add a "Parent
// Category" dropdown to every row's Edit panel) — this script just does the
// one-time bulk move so the admin doesn't have to click through a dozen
// categories by hand.
//
// WHAT IT DOES
// ------------
//   1. Finds the "Finance Calculators" category (by slug "finance" — the
//      slug prisma/seed.ts originally created it with — falling back to
//      slug "finance-calculators" or a case-insensitive name match, in case
//      it was ever recreated by hand from the admin UI). Creates it fresh
//      (slug "finance-calculators") only if none of those match.
//   2. Finds every OTHER top-level category (parentId is null) and sets its
//      parentId to Finance Calculators' id.
//   3. Skips (with a warning) any category that already has sub-categories
//      of its own — ToolCategory is enforced to one level deep, so a
//      category that already has children can't also become a child.
//
// Safe to run more than once: a category that's already filed under Finance
// Calculators is simply not touched again.
//
// HOW TO RUN
//   npx tsx prisma/reparent-tool-categories-under-finance.ts
// or
//   npm run db:reparent-tool-categories

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FINANCE_NAME = "Finance Calculators";
const FINANCE_SLUGS = ["finance", "finance-calculators"];

async function main() {
  let finance = await prisma.toolCategory.findFirst({
    where: { slug: { in: FINANCE_SLUGS } },
  });

  if (!finance) {
    finance = await prisma.toolCategory.findFirst({
      where: { name: { equals: FINANCE_NAME, mode: "insensitive" } },
    });
  }

  if (!finance) {
    finance = await prisma.toolCategory.create({
      data: {
        name: FINANCE_NAME,
        slug: "finance-calculators",
        templateKey: "category-template-1",
        viewStyle: "grid",
      },
    });
    console.log(`Created the "${FINANCE_NAME}" category (it didn't exist yet).`);
  } else {
    console.log(`Using existing "${finance.name}" category (slug: ${finance.slug}) as the umbrella.`);
  }

  // If Finance Calculators itself somehow already has a parent (shouldn't
  // happen, but the API allows any category to be reparented), promote it
  // back to top-level first — it's meant to be the root here.
  if (finance.parentId) {
    finance = await prisma.toolCategory.update({
      where: { id: finance.id },
      data: { parentId: null },
    });
    console.log(`"${finance.name}" had its own parent — promoted it back to top-level.`);
  }

  const otherTopLevel = await prisma.toolCategory.findMany({
    where: { id: { not: finance.id }, parentId: null },
  });

  let moved = 0;
  let skippedHasChildren = 0;

  for (const cat of otherTopLevel) {
    const childCount = await prisma.toolCategory.count({ where: { parentId: cat.id } });
    if (childCount > 0) {
      skippedHasChildren++;
      console.warn(
        `- skipped "${cat.name}": it already has ${childCount} sub-categor${
          childCount === 1 ? "y" : "ies"
        } of its own, and sub-categories can only be one level deep.`
      );
      continue;
    }
    await prisma.toolCategory.update({
      where: { id: cat.id },
      data: { parentId: finance.id },
    });
    moved++;
    console.log(`- moved "${cat.name}" under "${finance.name}"`);
  }

  console.log(
    `\nDone. Moved ${moved} categor${moved === 1 ? "y" : "ies"} under "${finance.name}", skipped ${skippedHasChildren}.`
  );
  console.log(
    `Open /admin/tools/categories to see the new tree — "${finance.name}" now lists them all as sub-categories, ` +
      "and each one still has its own public page, tools, and SEO exactly as before."
  );
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
