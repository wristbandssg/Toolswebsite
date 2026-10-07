import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";
import AdSlot from "@/components/AdSlot";
import ShowMoreGrid from "@/components/site/ShowMoreGrid";
import { getCategoryPageSettings } from "@/lib/category-page-config";
import { RICH_TEXT_CLASSES } from "@/lib/templates/page/ContentBox";
import { getCategoryIndex } from "@/lib/category-index";
import Breadcrumbs from "@/components/site/Breadcrumbs";

// Public category page, served at /{category}/ (main category) or
// /{category}/{sub}/ (sub-category) — see src/app/(site)/[first].

// A distinct visual identity from the Blog category page: a light hero
// section with a gradient-accented headline (rather than a colored banner),
// followed by a grid of sub-category cards, a grid of the category's own
// tool cards, or both. Categories nest to arbitrary depth (Finance
// Calculators -> Tax Calculators -> Pakistan Tax & Salary Calculators -> a
// tool), and most tools are filed at the leaf level — but "Tax Calculators"
// itself now also holds 30 US-federal tools directly (alongside its 12
// country/state sub-categories), so a category with children can no longer
// assume it has no tools of its own: both sections render, each with its
// own count-aware heading, whenever both exist.

// How many cards a category page shows before its "Show more" button comes
// from the admin (Calculator Categories → Category Page Display; defaults:
// 10 sub-categories, 40 calculators). The button reveals the rest in place
// (ShowMoreGrid) — every card is already in the HTML, so nothing navigates
// away and crawlers still see every link.

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

  // Main category → … → this one, for the breadcrumb and the URLs.
  const index = await getCategoryIndex();
  const chain = index.chainOf(category.id);

  // For each child, work out how many published tools sit anywhere in ITS
  // subtree (including further-nested grandchildren) for a meaningful count
  // on the card. Sub-categories with no published tools yet (created ahead
  // of time so tools can be filed there later) are left off the public
  // page rather than shown as empty "0 calculators" cards; they still
  // appear in /admin/tools/categories.
  const childrenWithCounts = (
    await Promise.all(
      children.map(async (child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        toolCount: await countPublishedToolsInSubtree(child.id),
      }))
    )
  ).filter((child) => child.toolCount > 0);

  // A category's OWN directly-filed tools — fetched regardless of whether
  // it also has children, since a hub category (like "Tax Calculators") can
  // now hold both sub-categories AND its own tools at the same time.
  const tools = await prisma.tool.findMany({
    where: { status: "published", categoryId: category.id },
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, description: true, isPopular: true },
  });
  const toolCount = tools.length;

  return { category, chain, index, children: childrenWithCounts, tools, toolCount };
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

/** "Finance" → "Finance Calculators"; a name that already says "Calculator(s)" is kept as it is. */
export function categoryTitle(name: string) {
  return /calculators?$/i.test(name.trim()) ? name.trim() : `${name.trim()} Calculators`;
}

export async function categoryMetadata(slug: string): Promise<Metadata> {
  const data = await loadCategory(slug);
  if (!data) return {};
  return buildSeoMetadata({
    seoMeta: data.category.seoMeta,
    fallbackTitle: categoryTitle(data.category.name),
    fallbackDescription:
      data.category.heroDescription ||
      data.category.heroSubheading ||
      (data.children.length > 0
        ? `Browse every calculator under ${data.category.name}, organized by topic.`
        : `Every ${data.category.name} calculator on this site, in one place.`),
    path: data.index.categoryHref(data.category.id),
  });
}

export default async function CategoryView({ slug }: { slug: string }) {
  const [data, display] = await Promise.all([loadCategory(slug), getCategoryPageSettings()]);
  if (!data) notFound();
  const { category, chain, index, children, tools, toolCount } = data;
  const hasChildren = children.length > 0;
  const hasTools = toolCount > 0;

  // Fallback copy for a category the admin hasn't filled the hero fields in
  // for yet — the page still reads well, and Edit → save on
  // /admin/tools/categories replaces these with the admin's own wording.
  // A category can have BOTH sub-categories and its own tools (e.g. "Tax
  // Calculators": 12 country sub-categories plus 30 US-federal tools filed
  // directly on it) — the fallback copy says so rather than picking one.
  const heroSubheading =
    category.heroSubheading ||
    (hasChildren && hasTools
      ? `Browse ${category.name.toLowerCase()} by topic, or jump straight to a calculator below.`
      : hasChildren
        ? `Browse ${category.name.toLowerCase()} by topic — pick a category below to see its calculators.`
        : `Free, fast, and accurate ${category.name.toLowerCase()} tools — no signup required.`);
  const heroDescription =
    category.heroDescription ||
    (hasChildren && hasTools
      ? `${category.name} has ${children.length} sub-categor${children.length === 1 ? "y" : "ies"} below, ` +
        `plus ${toolCount} calculator${toolCount === 1 ? "" : "s"} filed directly in ${category.name}.`
      : hasChildren
        ? `${category.name} is organized into ${children.length} sub-categor${
            children.length === 1 ? "y" : "ies"
          } below — open one to see its calculators.`
        : `Browse ${toolCount} ${category.name.toLowerCase()} calculator${
            toolCount === 1 ? "" : "s"
          } below. Each one runs instantly in your browser and gives you a clear, step-by-step breakdown of the result.`);

  return (
    <div>
      {/* Hero — headline, subheading, descriptive paragraph, all editable
          from /admin/tools/categories (see ToolCategoriesManager). */}
      <div className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs
            className="flex justify-center text-sm text-gray-400"
            items={[
              { name: "Home", href: "/" },
              ...chain.map((c) => ({ name: index.crumbName(c.id), href: index.categoryHref(c.id) })),
            ]}
          />
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

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_top" />
      </div>

      {hasChildren ? (
        /* Sub-category grid — this category is (at least partly) a hub,
           browsing down into topic sub-categories. A category can ALSO have
           its own directly-filed tools (see below), so this section gets a
           heading whenever both are present, to make clear it's browsing
           further rather than listing this category's own calculators. */
        <div className="mx-auto max-w-6xl px-4 py-10">
          {hasTools ? (
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Browse by Topic
            </h2>
          ) : null}
          <ShowMoreGrid
            initial={display.subcategoriesShown}
            noun={["category", "categories"]}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {children.map((child) => (
              <Link
                key={child.id}
                href={index.categoryHref(child.id)}
                className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100">
                    {child.name}
                  </h3>
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
          </ShowMoreGrid>
        </div>
      ) : null}

      {hasTools ? (
        /* Tool card grid — deliberately small and icon-free: 4 across on a
           wide screen rather than 3, tight padding, and each card's own
           resting height (with whatever empty space that leaves) is left
           alone — the "Use Calculator →" bar lives in an absolutely
           positioned overlay that slides up from the bottom edge on hover,
           so it never adds height or pushes anything at rest. */
        <div className="mx-auto max-w-6xl px-4 py-10">
          {hasChildren ? (
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
              {category.name} Calculators
            </h2>
          ) : null}
          <ShowMoreGrid
            initial={display.toolsShown}
            noun={["calculator", "calculators"]}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={index.toolHref({ slug: tool.slug, categoryId: category.id })}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
              >
                {tool.isPopular ? (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Popular
                  </span>
                ) : null}
                <h3
                  className={`text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 ${
                    tool.isPopular ? "pr-16" : ""
                  }`}
                >
                  {tool.title}
                </h3>
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
          </ShowMoreGrid>
        </div>
      ) : null}

      {!hasChildren && !hasTools ? (
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-gray-400 dark:border-gray-800">
            Nothing here yet.
          </p>
        </div>
      ) : null}

      {category.content ? (
        /* Long-form article written in the admin (Categories → Content), under the grids. */
        <div className="mx-auto max-w-6xl px-4 pb-10">
          <div
            className={`${RICH_TEXT_CLASSES} rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10 dark:border-gray-800 dark:bg-gray-900`}
            dangerouslySetInnerHTML={{ __html: category.content }}
          />
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-4">
        <AdSlot placement="category_bottom" />
      </div>
    </div>
  );
}
