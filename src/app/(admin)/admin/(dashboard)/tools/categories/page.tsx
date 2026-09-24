import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ToolCategoriesManager from "@/components/admin/ToolCategoriesManager";

export default async function ToolCategoriesPage() {
  const categories = await prisma.toolCategory.findMany({
    orderBy: { name: "asc" },
    include: { seoMeta: true, tools: { select: { status: true } } },
  });

  const totalTools = categories.reduce((sum, c) => sum + c.tools.length, 0);
  const emptyCount = categories.filter((c) => c.tools.length === 0).length;
  const missingSeoCount = categories.filter((c) => !c.seoMeta?.metaTitle).length;

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/tools" className="hover:underline">
          Tools
        </Link>{" "}
        / Categories
      </p>
      <h1 className="mt-1 text-2xl font-bold">Tool Categories</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Add, edit, or remove the categories Tools can be filed under. Each one gets its own public
        listing page — Edit a row to set the hero headline&apos;s subheading and description shown
        above the tool card grid, or open SEO to set its meta title, description, and indexing.
      </p>

      {/* Two columns on wide screens — the category list on the left, and a
          stats + tips sidebar on the right — matching the Blog Categories
          manager's layout. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <ToolCategoriesManager
            initial={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              parentId: c.parentId,
              heroSubheading: c.heroSubheading ?? "",
              heroDescription: c.heroDescription ?? "",
              toolCount: c.tools.length,
              publishedCount: c.tools.filter((t) => t.status === "published").length,
              seo: {
                metaTitle: c.seoMeta?.metaTitle ?? "",
                metaDescription: c.seoMeta?.metaDescription ?? "",
                canonicalUrl: c.seoMeta?.canonicalUrl ?? "",
                robotsIndex: c.seoMeta?.robotsIndex ?? true,
                schemaType: c.seoMeta?.schemaType ?? "",
              },
            }))}
          />
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold">Overview</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Categories</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {categories.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Tools Filed</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{totalTools}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Empty Categories</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{emptyCount}</dd>
              </div>
            </dl>
            {missingSeoCount > 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {missingSeoCount} categor{missingSeoCount === 1 ? "y is" : "ies are"} missing a
                meta title — open &quot;SEO&quot; on a row to add one.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold">How This Works</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-500">
              <li>
                Every category gets the same public page design: a hero section, then a grid of
                that category&apos;s tools.
              </li>
              <li>
                Open &quot;Edit&quot; on a row to set the hero subheading and description — leave
                them blank and the page fills in sensible copy on its own.
              </li>
              <li>
                Open &quot;SEO&quot; on a row to set its meta title, description, canonical URL,
                and indexing — right here, no separate page.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
