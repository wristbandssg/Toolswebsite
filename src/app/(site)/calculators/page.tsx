import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";
import AdSlot from "@/components/AdSlot";
import { getCategoryIndex } from "@/lib/category-index";

// Always reflect the latest published tools.
export const dynamic = "force-dynamic";

// The "Calculators" hub linked from the header. Same look as a tool category
// page (light hero with a gradient headline, then a grid of category cards),
// but it lists ONLY the main (top-level) categories — sub-categories and
// deeper levels are reached by opening a main category. Replaces the old
// /tools link, which had no page behind it; /tools now redirects here (see
// next.config.ts).

/** Published tools filed under `categoryId` or anywhere beneath it. */
async function countPublishedToolsInSubtree(categoryId: string): Promise<number> {
  const [ownCount, childIds] = await Promise.all([
    prisma.tool.count({ where: { status: "published", categoryId } }),
    prisma.toolCategory.findMany({ where: { parentId: categoryId }, select: { id: true } }),
  ]);
  const childCounts = await Promise.all(childIds.map((c) => countPublishedToolsInSubtree(c.id)));
  return ownCount + childCounts.reduce((sum, n) => sum + n, 0);
}

async function loadMainCategories() {
  // Filter for top-level categories in code, not with `where: { parentId: null }`:
  // on MongoDB that only matches an explicit null, and categories created
  // without a parent (e.g. Finance Calculators) have no parentId field at all.
  const mains = (
    await prisma.toolCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, parentId: true },
    })
  ).filter((c) => !c.parentId);
  // Main categories with no published tools yet are left off, as on the
  // category pages.
  return (
    await Promise.all(mains.map(async (m) => ({ ...m, toolCount: await countPublishedToolsInSubtree(m.id) })))
  ).filter((m) => m.toolCount > 0);
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    fallbackTitle: "Calculators",
    fallbackDescription: "Browse every free online calculator on this site by category — finance, math and more.",
    path: "/calculators/",
  });
}

export default async function CalculatorsPage() {
  const [categories, index] = await Promise.all([loadMainCategories(), getCategoryIndex()]);
  const total = categories.reduce((sum, c) => sum + c.toolCount, 0);

  return (
    <div>
      <div className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Calculators
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">
            Free, fast, and accurate calculators — no signup required.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {total > 0
              ? `${total.toLocaleString("en-US")} calculators in ${categories.length} categor${
                  categories.length === 1 ? "y" : "ies"
                }. Pick a category below to browse its calculators.`
              : "Pick a category below to browse its calculators."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_top" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={index.categoryHref(category.id)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {category.toolCount.toLocaleString("en-US")} calculator{category.toolCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-gray-600"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-gray-400 dark:border-gray-800">
            Nothing here yet.
          </p>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_bottom" />
      </div>
    </div>
  );
}
