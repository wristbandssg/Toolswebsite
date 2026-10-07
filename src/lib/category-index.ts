import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { buildCategoryIndex, type CategoryIndex } from "@/lib/category-tree";

export { buildCategoryIndex, type CategoryIndex, type CategoryNode } from "@/lib/category-tree";

// Loads the calculator category tree (a few dozen rows) for building public
// URLs and breadcrumbs.

export async function loadCategoryIndex(): Promise<CategoryIndex> {
  const rows = await prisma.toolCategory.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: "asc" },
  });
  return buildCategoryIndex(rows);
}

/** Per-request cached copy — use this from pages and components. */
export const getCategoryIndex = cache(loadCategoryIndex);
