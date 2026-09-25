import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";

// Always reflect the latest published tools for this category.
export const dynamic = "force-dynamic";

// A distinct visual identity from the Blog category page: a light hero
// section with a gradient-accented headline (rather than a colored banner),
// followed by EITHER a grid of tool cards OR a grid of sub-category cards —
// never both. Categories now nest to arbitrary depth (Finance Calculators
// -> Tax Calculators -> Pakistan Tax & Salary Calculators -> a tool), and
// tools are meant to be filed at the leaf level only, so a category with
// children browses to them; a category with none shows its tools.

async function loadCategory(slug: string) {
  const category = await prisma.toolCategory.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!category) return null;

  const children = await prisma.toolCategory.findMany({
    where: { parentId: category.id },
    orderBy: { name: "asc" },
  });

  // Walk up the parent chain for the breadcrumb — categories can nest to
  // any depth, so this can't assume just one level like a single `parent`
  // include would.
  const ancestors: { name: string; slug: string }[] = [];
  let cursorId = category.parentId;
  let hops = 0;
  while (cursorId && hops < 10) {
    const ancestor: { name: string; slug: string; parentId: string | null } | null =
      await prisma.toolCategory.findUnique({
        where: { id: cursorId },
        select: { name: true, slug: true, parentId: true },
      });
    if (!ancestor) break;
    ancestors.unshift({ name: ancestor.name, slug: ancestor.slug });
    cursorId = ancestor.parentId;
    hops++;
  }

  if (children.length > 0) {
    // A category with sub-categories browses to them, not to tools — so
    // for each child, work out how many published tools sit anywhere in
    // ITS subtree (including further-nested grandchildren) for a
    // meaningful count on the card.
    const childrenWithCounts = await Promise.all(
      children.map(async (child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        toolCount: await countPublishedToolsInSubtree(child.id),
      }))
    );
    return { category, ancestors, children: childrenWithCounts, tools: null as null };
  }

  const tools = await prisma.tool.findMany({
    where: { status: "published", categoryId: category.id },
    orderBy: { title: "asc" },
  });
  return { category, ancestors, children: null as null, tools };
}

/** Recursively sums published tools directly filed under `categoryId` and
 * under every category nested beneath it. The category tree here is small
 * (a few dozen rows at most), so the extra round trips per level are cheap. */
async function countPublishedToolsInSubtree(categoryId: string): Promise<number> {
  const [ownCount, childIds] = await Promise.all([
    prisma.tool.count({ where: { status: "published", categoryId } }),
    prisma.toolCategory.findMany({ where: { parentId: categoryId }, select: { id: true } }),
  ]);
  const childCounts = await Promise.all(childIds.map((c) => countPublishedToolsInSubtree(c.id)));
  return ownCount + childCounts.reduce((sum, n) => sum + n, 0);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) return {};
  return buildSeoMetadata({
    seoMeta: data.category.seoMeta,
    fallbackTitle: `${data.category.name} Calculators`,
    fallbackDescription:
      data.category.heroDescription ||
      data.category.heroSubheading ||
      (data.children
        ? `Browse every calculator under ${data.category.name}, organized by topic.`
        : `Every ${data.category.name} calculator on this site, in one place.`),
    path: `/tools/category/${data.category.slug}`,
  });
}

export default async function ToolCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) notFound();
  const { category, ancestors, children, tools } = data;

  // Fallback copy for a category the admin hasn't filled the hero fields in
  // for yet — the page still reads well, and Edit → save on
  // /admin/tools/categories replaces these with the admin's own wording.
  const heroSubheading =
    category.heroSubheading ||
    (children
      ? `Browse ${category.name.toLowerCase()} by topic — pick a category below to see its calculators.`
      : `Free, fast, and accurate ${category.name.toLowerCase()} tools — no signup required.`);
  const heroDescription =
    category.heroDescription ||
    (children
      ? `${category.name} is organized into ${children.length} sub-categor${
          children.length === 1 ? "y" : "ies"
        } below — open one to see its calculators.`
      : `Browse ${(tools ?? []).length} ${category.name.toLowerCase()} calculator${
          (tools ?? []).length === 1 ? "" : "s"
        } below. Each one runs instantly in your browser and gives you a clear, step-by-step breakdown of the result.`);

  return (
    <div>
      {/* Hero — headline, subheading, descriptive paragraph, all editable
          from /admin/tools/categories (see ToolCategoriesManager). */}
      <div className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-gray-400">
            Tools
            {ancestors.map((a) => (
              <span key={a.slug}>
                {" "}
                / <Link href={`/tools/category/${a.slug}`} className="hover:underline">
                  {a.name}
                </Link>
              </span>
            ))}{" "}
            / {category.name}
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">
            {heroSubheading}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {heroDescription}
          </p>
        </div>
      </div>

      {children ? (
        /* Sub-category grid — this category is a hub (Finance Calculators,
           Tax Calculators, ...), not a place tools are filed directly, so
           it browses down into its children instead of listing tools. */
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/tools/category/${child.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
                    {child.name}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {child.toolCount} calculator{child.toolCount === 1 ? "" : "s"}
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

          {children.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-gray-400 dark:border-gray-800">
              Nothing here yet.
            </p>
          ) : null}
        </div>
      ) : (
        /* Tool card grid — deliberately small and icon-free: 4 across on a
           wide screen rather than 3, tight padding, and each card's own
           resting height (with whatever empty space that leaves) is left
           alone — the "Use Calculator →" bar lives in an absolutely
           positioned overlay that slides up from the bottom edge on hover,
           so it never adds height or pushes anything at rest. */
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(tools ?? []).map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                {tool.isPopular ? (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Popular
                  </span>
                ) : null}
                <h2
                  className={`text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 ${
                    tool.isPopular ? "pr-16" : ""
                  }`}
                >
                  {tool.title}
                </h2>
                {tool.description ? (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
                    {tool.description}
                  </p>
                ) : null}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-indigo-600 py-2 text-xs font-semibold text-white transition-transform duration-200 group-hover:translate-y-0 dark:bg-indigo-500"
                >
                  Use Calculator →
                </span>
              </Link>
            ))}
          </div>

          {(tools ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-gray-400 dark:border-gray-800">
              No calculators in this category yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
